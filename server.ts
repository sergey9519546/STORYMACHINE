import 'dotenv/config';
import fs from 'fs';
import { fileURLToPath } from 'url';
import type { Server } from 'http';
import { initFromEnv } from './server/lib/ai-config.ts';
import { logger } from './server/lib/logger.ts';
import { sessions, PERSIST_SESSIONS, SESSION_DB_DIR } from './server/lib/session-store.ts';
import { createApp } from './server/app.ts';
import { attachCollabServer } from './server/collab/yjs-server.ts';

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
      'Diagnostics, coverage, and exploration work fully; generation (copilot, ' +
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

/** Builds the graceful-shutdown function for a given HTTP server: closes the
 *  listener, flushes every open session's SQLite handle (so WAL files land
 *  cleanly), then exits with `exitCode`. Extracted (rather than inlined in
 *  `startServer()`) so the SAME function backs both signal-driven shutdown
 *  (SIGTERM/SIGINT, exit 0 — an orchestrator asked for this) and crash-driven
 *  shutdown (uncaughtException, exit 1 — the process asked for this, because
 *  continuing after an uncaught exception runs on undefined state) instead of
 *  two divergent copies of the same cleanup, and so it's unit-testable
 *  without binding a real port (see tests/routes/hardening.test.ts). */
export function createShutdownHandler(server: Server): (signal: string, exitCode?: number) => void {
  return (signal: string, exitCode = 0) => {
    logger.info('server_shutdown', { signal, exitCode });
    server.close(() => {
      // Close all SQLite handles before exiting so WAL files are flushed cleanly.
      for (const { stage } of sessions.values()) {
        try { stage.close(); } catch { /* already closed */ }
      }
      process.exit(exitCode);
    });
    // Hard-kill after 10s if in-flight requests haven't drained. A crash-driven
    // shutdown keeps its own (non-zero) exit code even on the hard-kill path —
    // an orchestrator distinguishing "drained cleanly" from "had to be killed"
    // shouldn't also lose the signal that this exit was crash-triggered.
    setTimeout(() => process.exit(exitCode === 0 ? 1 : exitCode), 10_000).unref();
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

async function startServer() {
  if (PERSIST_SESSIONS) {
    fs.mkdirSync(SESSION_DB_DIR, { recursive: true });
    logger.info('session_persistence', { dir: SESSION_DB_DIR });
  }

  const app = await createApp();

  const PORT = Number(process.env.PORT ?? 3000);
  if (isNaN(PORT) || PORT < 1 || PORT > 65535) {
    console.error(`FATAL: Invalid PORT value "${process.env.PORT}". Must be 1–65535.`);
    process.exit(1);
  }
  const server = app.listen(PORT, '0.0.0.0', () => {
    logger.info('server_started', { port: PORT });
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
