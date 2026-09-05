import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import type { Server } from 'http';
import { initFromEnv } from './server/lib/ai-config.ts';
import { logger } from './server/lib/logger.ts';
import { sessions, PERSIST_SESSIONS, SESSION_DB_DIR } from './server/lib/session-store.ts';
import { backupSessions } from './server/lib/backup.ts';
import { createApp } from './server/app.ts';
import { attachCollabServer } from './server/collab/yjs-server.ts';
import { warmDoctorPool } from './server/nvm/analyze/doctor-pool.ts';
import { setDraining } from './server/lib/readiness.ts';

// A missing AI key is NOT fatal: the deterministic half of the product —
// Script Doctor, live diagnostics, coverage export, What-If exploration,
// Writers' Room critics, interview receipts — runs entirely without one,
// and that keyless analysis surface is the product's front door. Every
// generation path already degrades per-route (getAI() throws are caught,
// aiLimiter routes return honest keyless shapes, /api/ai-config reports
// llmReady:false so both apps show the banner). Exiting here — the app's
// original generation-first behavior — made all of that unreachable.
const AI_PROVIDER = process.env.AI_PROVIDER ?? 'gemini';
if (AI_PROVIDER === 'gemini' && !process.env.GEMINI_API_KEY) {
  logger.warn('startup_keyless', {
    message: 'GEMINI_API_KEY is not set — starting in analysis-only mode. ' +
      'Diagnostics, coverage, and exploration work fully; explicit generation (world-building, ' +
      'simulation turns, rewrites, interview voices) stays disabled until a key is configured.',
  });
}
if (AI_PROVIDER === 'openai-compat' && (!process.env.AI_BASE_URL || !process.env.AI_API_KEY)) {
  logger.warn('startup_keyless', {
    message: 'AI_PROVIDER=openai-compat is missing AI_BASE_URL and/or AI_API_KEY — ' +
      'starting in analysis-only mode; generation stays disabled until both are configured.',
  });
}

initFromEnv();

/**
 * SHUTDOWN_DRAIN_MS (2026-09-04, second follow-up review) — default `0`,
 * today's timing unchanged. Read once, at createShutdownHandler() construction
 * time (i.e. once per process, at boot), not per-signal.
 *
 * WHY THIS EXISTS. setDraining() and server.close() previously ran in the
 * SAME synchronous tick (see createShutdownHandler()'s own doc comment
 * below). That is enough for a caller already holding an open, keep-alive
 * connection to see the 503 on its next request over that connection — but
 * a prober that opens a FRESH connection per poll (a `wget`-style
 * healthcheck, most load balancers) can lose the race entirely: measured
 * directly, a brand-new connection attempted ~6ms after SIGTERM already got
 * ECONNREFUSED, because `server.close()` had already stopped accepting new
 * connections by then. That prober never observes `{ready:false,
 * reason:"draining"}` at all — it just sees the port go away. Documented
 * bluntly rather than smoothed over: with `SHUTDOWN_DRAIN_MS=0` (the
 * default), the draining response is a REAL but NARROW signal — visible to
 * a keep-alive poller sharing an already-open connection, invisible to a
 * new-connection-per-poll prober, which instead just experiences the port
 * closing slightly sooner than it otherwise would have.
 *
 * Setting this to a positive value delays `server.close()` (and the 10s
 * hard-kill timer below, which now counts from when close() actually
 * starts, not from the original signal) by that many ms AFTER setDraining()
 * has already run — during that window the listener is still open and
 * still accepting new connections (this process just answers 503 on
 * /ready for every one of them), so a fresh-connection-per-poll prober
 * that lands inside the window DOES see the 503 before the socket ever
 * refuses it. See README's Deployment section and docker-compose.yml's own
 * SHUTDOWN_DRAIN_MS, which sets it comfortably above the HEALTHCHECK
 * interval specifically so that healthcheck (a fresh `wget` connection each
 * time) gets at least one cycle inside the window.
 */
function shutdownDrainMs(): number {
  const raw = Number(process.env.SHUTDOWN_DRAIN_MS);
  return Number.isFinite(raw) && raw > 0 ? raw : 0;
}

/** Builds the graceful-shutdown function for a given HTTP server: closes the
 *  listener, flushes every open session's SQLite handle (so WAL files land
 *  cleanly), then exits with `exitCode`. Extracted (rather than inlined in
 *  `startServer()`) so the SAME function backs both signal-driven shutdown
 *  (SIGTERM/SIGINT, exit 0 — an orchestrator asked for this) and crash-driven
 *  shutdown (uncaughtException, exit 1 — the process asked for this, because
 *  continuing after an uncaught exception runs on undefined state) instead of
 *  two divergent copies of the same cleanup, and so it's unit-testable
 *  without binding a real port (see tests/routes/hardening.test.ts).
 *
 *  DRAINING (2026-09-04 ops audit follow-up, owner rule): the very first
 *  thing this does — synchronously, before `server.close()` even runs — is
 *  flip GET /ready's draining flag (server/lib/readiness.ts) to true. A
 *  load balancer polling /ready then sees 503 and stops routing NEW traffic
 *  to this instance before the socket itself starts refusing connections
 *  (`server.close()` stops accepting new connections but lets in-flight ones
 *  finish), which is the other half of what a readiness endpoint exists
 *  for: not just "not ready yet" at boot, but "not anymore" at shutdown.
 *  There is no un-draining in production — once a shutdown has begun, /ready
 *  never returns 200 again for the rest of this process's life — so
 *  `setDraining()` here is unconditional and never paired with a reset.
 *
 *  DRAIN WINDOW (second follow-up review, same day): `server.close()` — and
 *  the hard-kill timer that used to run alongside it — now fire after a
 *  `shutdownDrainMs()` delay from setDraining(), not in the same tick. See
 *  that function's own doc comment for why this exists and what it does and
 *  does not fix.
 *
 *  `scheduleClose` is injectable for tests only (mirrors the `warmFn`/
 *  `runJob` override pattern used elsewhere in this codebase — see
 *  doctor-pool.ts) — production always takes the default, a plain
 *  `setTimeout`. Deliberately NOT unref'd: the listening server itself is
 *  an active, ref'd handle for the whole drain window (we haven't called
 *  close() yet), so nothing here can starve the event loop the way
 *  doctor-pool.ts's own unref'd-timer bug did — but ref'd is still the
 *  correct choice on its own merits: this timer backs a guarantee ("close
 *  begins within drainMs of the signal") the same way that one does. */
export function createShutdownHandler(
  server: Server,
  opts: { drainMs?: number; scheduleClose?: (fn: () => void, ms: number) => void } = {},
): (signal: string, exitCode?: number) => void {
  const drainMs = opts.drainMs ?? shutdownDrainMs();
  const scheduleClose = opts.scheduleClose ?? ((fn: () => void, ms: number) => { setTimeout(fn, ms); });

  return (signal: string, exitCode = 0) => {
    setDraining();
    logger.info('server_shutdown', { signal, exitCode, drainMs });

    const beginClose = (): void => {
      server.close(() => {
        // Close all SQLite handles before exiting so WAL files are flushed cleanly.
        for (const { stage } of sessions.values()) {
          try { stage.close(); } catch { /* already closed */ }
        }
        process.exit(exitCode);
      });
      // Hard-kill after 10s (from when close() actually starts, i.e. AFTER
      // the drain window above) if in-flight requests haven't drained. A
      // crash-driven shutdown keeps its own (non-zero) exit code even on
      // the hard-kill path — an orchestrator distinguishing "drained
      // cleanly" from "had to be killed" shouldn't also lose the signal
      // that this exit was crash-triggered.
      setTimeout(() => process.exit(exitCode === 0 ? 1 : exitCode), 10_000).unref();
    };

    if (drainMs > 0) {
      scheduleClose(beginClose, drainMs);
    } else {
      beginClose();
    }
  };
}

/** Registers the two process-level crash safety nets that Node doesn't
 *  provide by default. Without these, an unhandled promise rejection from
 *  anywhere in the process — a session-store setInterval sweep, a collab WS
 *  handler, an AI call's fire-and-forget path — takes down the whole
 *  process, and `docker run` (no orchestrator, no restart policy) never
 *  brings it back.
 *
 *  The two cases are handled asymmetrically, deliberately:
 *   - unhandledRejection: logged and swallowed. A single bad promise
 *     shouldn't kill a server that's otherwise serving fine; the process
 *     stays up.
 *   - uncaughtException: logged, then the SAME graceful-shutdown path used
 *     for SIGTERM runs, with a non-zero exit code. An uncaught exception
 *     means some code ran off the end of its own error handling — the
 *     resulting process state is unverified, so continuing to serve
 *     requests on it is unsafe. Exiting cleanly (sqlite closed, no dangling
 *     WAL) with a non-zero code is correct: a `docker run --restart=always`
 *     or any orchestrator's restart policy brings up a fresh, known-good
 *     process instead of limping along on undefined state. */
export function installCrashHandlers(shutdown: (signal: string, exitCode?: number) => void): void {
  process.on('unhandledRejection', (reason) => {
    logger.error('unhandled_rejection', {
      message: reason instanceof Error ? reason.message : String(reason),
      stack: reason instanceof Error ? reason.stack : undefined,
    });
  });
  process.on('uncaughtException', (err) => {
    logger.error('uncaught_exception', { message: err.message, stack: err.stack });
    shutdown('uncaughtException', 1);
  });
}

/**
 * S1 (docs/PATH_TO_EXCELLENCE.md Phase S): give `npm run backup`'s existing
 * logic (server/lib/backup.ts) a real cadence instead of leaving scheduling
 * entirely to an operator's own cron entry (README's documented fallback,
 * still valid and still the only option before this). Opt-in and OFF by
 * default — keyless-first minimalism: a deployment that never sets
 * `BACKUP_INTERVAL_HOURS` behaves exactly as it always has, no background
 * timer, no `backup/` directory created, no surprise disk writes. No new
 * dependency and no assumed cron binary: a plain in-process `setInterval`,
 * `unref()`'d exactly like every session-store sweep interval
 * (server/lib/session-store.ts) so it can never by itself keep the process
 * alive past a graceful shutdown.
 *
 * Reads the SAME env vars `scripts/backup-sessions.ts` (the manual/cron
 * entrypoint) reads — `BACKUP_DIR`, `BACKUP_RETENTION_DAYS`,
 * `BACKUP_RETENTION_KEEP` — so operators do not need a second, divergent
 * config surface for the two ways of running the identical backup logic.
 * Exported (not just called inline) so it's unit-testable without booting a
 * real HTTP listener — see tests/core/backup-schedule-persist.test.ts and
 * tests/core/backup-schedule-memory.test.ts.
 */
export function startBackupSchedule(): NodeJS.Timeout | undefined {
  const hours = Number(process.env.BACKUP_INTERVAL_HOURS ?? 0);
  if (!Number.isFinite(hours) || hours <= 0) return undefined;
  if (!PERSIST_SESSIONS) {
    logger.warn('backup_schedule_skipped', { reason: 'SESSION_DB_DIR is :memory: — nothing to back up' });
    return undefined;
  }

  const backupRootDir = process.env.BACKUP_DIR ?? path.join(process.cwd(), 'backup');
  const retentionDays = process.env.BACKUP_RETENTION_DAYS ? Number(process.env.BACKUP_RETENTION_DAYS) : undefined;
  const retentionKeep = process.env.BACKUP_RETENTION_KEEP ? Number(process.env.BACKUP_RETENTION_KEEP) : undefined;

  const run = (): void => {
    backupSessions({
      sessionDbDir: SESSION_DB_DIR, backupRootDir, now: Date.now(), retentionDays, retentionKeep,
    }).then((summary) => {
      if (!summary.noop) logger.info('backup_schedule_run', { ...summary });
    }).catch((err) => {
      logger.error('backup_schedule_failed', { error: err instanceof Error ? err.message : String(err) });
    });
  };

  const timer = setInterval(run, hours * 60 * 60 * 1000);
  timer.unref();
  logger.info('backup_schedule_started', { intervalHours: hours, backupRootDir });
  return timer;
}

/**
 * DOCTOR_POOL_PREWARM_BEFORE_LISTEN=1 (2026-09-04 ops audit finding A,
 * follow-up) — off by default. The default boot fires warmDoctorPool()
 * fire-and-forget from the listen callback below, so the port accepts
 * connections a measured ~2.1-2.7s (idle) to up to ~3.9s (under load) before
 * the pool finishes warming; GET /ready exists
 * so an orchestrator can hold traffic back for exactly that window without
 * this process itself booting any slower. Some single-process deployments
 * have no such orchestrator in front of them — a bare `docker run` with no
 * readiness-aware load balancer, or a local `npm start` — and would rather
 * the process take ~2-3s longer to become reachable AT ALL than ever risk
 * serving one slow first request to a caller that never checked /ready. This
 * flag is that trade, made explicit and opt-in: when set, the pre-warm is
 * AWAITED before `app.listen()` is ever called, so the port does not open
 * until the pool is warm.
 *
 * `warmFn` is injectable for tests only (see tests/core/
 * server-prewarm-before-listen.test.ts) — production always takes the
 * default, which is the very same warmDoctorPool() the listen callback below
 * would otherwise call fire-and-forget. Never awaits/calls `warmFn` at all
 * when the flag is unset — the default boot path is byte-identical to
 * before this flag existed.
 *
 * Deliberately PROPAGATES a rejection from `warmFn` rather than swallowing
 * it (see this function's own test asserting that) — production's real
 * `warmDoctorPool()` never throws (its own doc comment states the
 * guarantee), so this is defense for an injected/future `warmFn` that
 * might. Because it can reject, `startServer()`'s call site below wraps the
 * await in a try/catch rather than letting a pre-warm failure take the
 * process down before it ever binds the port — the same "a boot-time perf
 * optimization must never be able to take the process down" guarantee
 * doctor-pool.ts's own header states, made to hold on this path too.
 */
export function prewarmBeforeListenEnabled(): boolean {
  const raw = process.env.DOCTOR_POOL_PREWARM_BEFORE_LISTEN;
  return raw === '1' || raw === 'true';
}

export async function awaitPrewarmBeforeListenIfConfigured(
  warmFn: () => Promise<void> = () => warmDoctorPool(),
): Promise<void> {
  if (!prewarmBeforeListenEnabled()) return;
  await warmFn();
}

async function startServer() {
  if (PERSIST_SESSIONS) {
    fs.mkdirSync(SESSION_DB_DIR, { recursive: true });
    logger.info('session_persistence', { dir: SESSION_DB_DIR });
  }

  const app = await createApp();
  startBackupSchedule();

  const PORT = Number(process.env.PORT ?? 3000);
  if (isNaN(PORT) || PORT < 1 || PORT > 65535) {
    console.error(`FATAL: Invalid PORT value "${process.env.PORT}". Must be 1–65535.`);
    process.exit(1);
  }

  // See awaitPrewarmBeforeListenIfConfigured()'s doc comment above: a no-op
  // unless DOCTOR_POOL_PREWARM_BEFORE_LISTEN is set, in which case the port
  // does not open until this resolves. Wrapped in try/catch, not left to
  // propagate: production's warmDoctorPool() never throws, but
  // awaitPrewarmBeforeListenIfConfigured() deliberately CAN reject (its own
  // doc comment) for an injected/future warmFn, and this is the one boot
  // path where that could otherwise take the whole process down before it
  // ever binds the port — logging and continuing to `listen` below keeps the
  // "a boot-time perf optimization must never be able to take the process
  // down" guarantee (doctor-pool.ts's header) intact on this path too.
  try {
    await awaitPrewarmBeforeListenIfConfigured();
  } catch (err) {
    logger.error('prewarm_before_listen_failed', {
      error: err instanceof Error ? err.message : String(err),
    });
  }
  const prewarmedBeforeListen = prewarmBeforeListenEnabled();

  const server = app.listen(PORT, '0.0.0.0', () => {
    logger.info('server_started', { port: PORT });
    // Fire-and-forget: spawns the Script Doctor worker pool's threads and
    // runs one throwaway analysis through each so the first REAL analysis
    // request doesn't pay the ~460-540ms worker-pool cold start (2026-09-04
    // re-verification). warmDoctorPool() itself is a no-op under
    // NODE_ENV=test / DOCTOR_POOL_PREWARM=0 and never throws or rejects —
    // see its doc comment — so this deliberately isn't awaited and needs no
    // .catch here. Skipped entirely when DOCTOR_POOL_PREWARM_BEFORE_LISTEN
    // already ran (and awaited) the exact same warm-up above, before this
    // callback could ever fire — calling it again here would double-warm.
    if (!prewarmedBeforeListen) void warmDoctorPool();
  });

  // P4: real-time collaboration — Yjs sync over WebSocket on /collab/:room.
  // Shares the HTTP server (and port); only claims the /collab upgrade path so
  // Vite's HMR WebSocket in dev is left untouched.
  attachCollabServer(server);

  // ── Graceful shutdown ────────────────────────────────────────────────────────
  const shutdown = createShutdownHandler(server);
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT',  () => shutdown('SIGINT'));

  // ── Crash safety net ─────────────────────────────────────────────────────────
  // Reuses `shutdown` above rather than duplicating the sqlite-close/exit
  // sequence — see installCrashHandlers()'s doc comment for the design.
  installCrashHandlers(shutdown);
}

// Only auto-start when this file is the process entry point (`node`/`tsx
// server.ts`, which is how both `npm run dev`/`start` and the Dockerfile's
// CMD run it) — not when it's imported, e.g. by hardening.test.ts to unit-test
// createShutdownHandler()/installCrashHandlers() without binding a real port
// or standing up real sessions.
const isEntryPoint = process.argv[1] !== undefined
  && fileURLToPath(import.meta.url) === process.argv[1];
if (isEntryPoint) {
  startServer();
}
