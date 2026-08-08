import express from 'express';
import path from 'path';
import fs from 'fs';
import { rateLimit } from 'express-rate-limit';
import { Stage } from '../engine/Stage.ts';
import { Orchestrator } from '../engine/Orchestrator.ts';
import { logger } from './logger.ts';
import { metrics } from './metrics.ts';
import { pruneAllSessionResetBackups } from './backup.ts';

// ── Shared types ──────────────────────────────────────────────────────────────
export interface Session {
  stage: Stage;
  orchestrator: Orchestrator;
  lastAccess: number;
  commands: SessionCommandCoordinator;
  rotating: boolean;
}

/**
 * Rejection-safe FIFO for mutations to one session's canonical SQLite state.
 * Commands for distinct sessions remain independent. A failed command does not
 * poison the tail, so the next admitted command can still run.
 */
export class SessionCommandCoordinator {
  private tail: Promise<void> = Promise.resolve();
  private pending = 0;

  public get isIdle(): boolean {
    return this.pending === 0;
  }

  public run<T>(operation: () => T | PromiseLike<T>): Promise<T> {
    this.pending++;
    const result = this.tail.then(operation, operation);
    this.tail = result.then(() => undefined, () => undefined);
    return result.finally(() => { this.pending--; });
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
export class ValidationError extends Error {
  status = 400;
  constructor(message: string) { super(message); this.name = 'ValidationError'; }
}

/** No idle in-memory session can be safely closed to admit another request. */
export class SessionCapacityError extends Error {
  status = 503;
  constructor(message = 'Server session capacity is temporarily busy. Please retry shortly.') {
    super(message);
    this.name = 'SessionCapacityError';
  }
}

/** Durable rotation could not be completed; callers may safely retry. */
export class SessionRotationError extends SessionCapacityError {
  readonly retryable = true;

  constructor(message = 'Session rotation could not be completed. Please retry.') {
    super(message);
    this.name = 'SessionRotationError';
  }
}

/** A destructive lifecycle action must never close a session mid-command. */
export class SessionBusyError extends Error {
  status = 409;
  constructor(message = 'Session has an active command and cannot be deleted yet.') {
    super(message);
    this.name = 'SessionBusyError';
  }
}

export const asyncHandler = (fn: express.RequestHandler): express.RequestHandler =>
  (req, res, next) => {
    try {
      Promise.resolve(fn(req, res, next)).catch(next);
    } catch (e) {
      next(e);
    }
  };

/**
 * Admit a Stage-mutating HTTP command through the owning session's FIFO. The
 * handler receives the exact session it owns, so backup/reset and every
 * subsequent write observe one deliberate before-or-after boundary.
 *
 * This is intentionally a handler wrapper, not response-finish middleware:
 * async work stays held until the handler's promise has settled, including
 * state writes performed after provider or simulation awaits.
 */
export function withSessionCommand(
  handler: (req: express.Request, res: express.Response, session: Session) => unknown | Promise<unknown>,
): express.RequestHandler {
  return asyncHandler(async (req, res) => {
    const session = getOrCreateSession(sessionId(req));
    try {
      await session.commands.run(() => handler(req, res, session));
    } finally {
      // A long command may have begun before a short idle-TTL expires. Mark
      // the moment it settles as access so a just-finished in-memory session
      // is not immediately evicted (especially important in :memory: mode).
      session.lastAccess = Date.now();
    }
  });
}

export const requireString = (val: unknown, name: string, maxLen = 20_000): string => {
  // ValidationError, not plain Error: app.ts's global error handler only maps
  // ValidationError to a 400 with the message; a plain Error falls through to
  // the generic 500 "Internal Server Error" branch, masking a caller's bad
  // input as a server fault (same bug class as the 413-vs-500 body-size fix).
  if (typeof val !== 'string' || val.trim() === '') throw new ValidationError(`${name} is required`);
  if (val.length > maxLen) throw new ValidationError(`${name} exceeds maximum length`);
  return val.trim();
};

export function safeJsonParse<T>(text: string, fallback: T): T {
  try { return JSON.parse(text); } catch { return fallback; }
}

// ── Rate limiters ─────────────────────────────────────────────────────────────
// All three limiters below use express-rate-limit's default keying: `req.ip`.
// That is the per-CLIENT identity these budgets are meant to partition —
// correct when this process receives connections directly, but WRONG behind
// a reverse proxy/load balancer, where every request's socket address is the
// proxy's own IP and every visitor collapses onto one shared budget. Fixing
// that requires `app.set('trust proxy', ...)` (server/app.ts, opt-in via the
// TRUST_PROXY env var — see that file's comment for why it must be opt-in,
// not automatic) so Express derives `req.ip` from `X-Forwarded-For` instead.
// Deployment requirement, not just a code note: any deployment that puts a
// reverse proxy in front of this server MUST also set TRUST_PROXY (README's
// Deployment section) or these limiters silently rate-limit the whole
// deployment as a single client.
export const gameLimiter = rateLimit({
  windowMs: 60_000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please slow down.' },
});

export const aiLimiter = rateLimit({
  windowMs: 60_000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many AI requests, please slow down.' },
});

// heavyBodyLimiter — for routes that accept a large raw (non-JSON) request
// body, where gameLimiter's normal 120/min ceiling is dangerously generous.
//
// The DoS math this closes: POST /api/scriptide/doctor/pdf accepts up to
// 15mb of raw PDF bytes (server/routes/scriptide.ts's express.raw({limit:
// '15mb'})) and previously sat behind gameLimiter alone — 120 requests/min at
// up to 15mb each is ~1.8GB/min of theoretical ingest a single client could
// force the server to buffer and hand to pdfjs-dist, per client, before a
// single request is rejected. At 10 requests/min the same worst case caps at
// ~150MB/min per client — in line with the route's own comment that real
// screenplay PDFs are low-single-digit megabytes, so legitimate use (a writer
// re-submitting a revised draft a few times a minute) is untouched while a
// scripted flood is throttled an order of magnitude sooner.
//
// Same IP-based keying as gameLimiter (no custom keyGenerator on either), so
// the two limiters partition the same client identity into independent
// budgets — see the route wiring in scriptide.ts for why this REPLACES
// gameLimiter on that route rather than stacking on top of it.
export const heavyBodyLimiter = rateLimit({
  windowMs: 60_000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Large-upload rate limit reached — try again in a minute.' },
});

// ── Session constants ─────────────────────────────────────────────────────────
function boundedIntegerEnv(name: string, fallback: number, min: number, max: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  if (!/^\d+$/.test(raw)) {
    throw new Error(`${name} must be an integer between ${min} and ${max}`);
  }
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value < min || value > max) {
    throw new Error(`${name} must be an integer between ${min} and ${max}`);
  }
  return value;
}

export const SESSION_DB_DIR  = process.env.SESSION_DB_DIR ?? path.join(process.cwd(), 'data', 'sessions');
export const PERSIST_SESSIONS = SESSION_DB_DIR !== ':memory:';
// Recovery artifacts deliberately live outside the live session root so file
// cleanup and normal session discovery cannot mistake a reset backup for a
// loadable project database.
export const SESSION_BACKUP_DIR = process.env.SESSION_BACKUP_DIR
  ?? path.join(process.cwd(), 'data', 'backups', 'session-resets');
// Reset recovery copies can contain the full writer project. Retention is
// intentionally mandatory and bounded rather than inheriting the optional
// periodic-backup policy: automatic UI resets must not create unbounded hidden
// draft copies. Invalid operator settings fail fast instead of silently
// disabling this privacy and disk-use boundary.
export const SESSION_RESET_BACKUP_KEEP = boundedIntegerEnv('SESSION_RESET_BACKUP_KEEP', 5, 1, 100);
export const SESSION_RESET_BACKUP_TTL_HOURS = boundedIntegerEnv('SESSION_RESET_BACKUP_TTL_HOURS', 168, 1, 24 * 365);
export const MAX_SESSIONS    = boundedIntegerEnv('MAX_SESSIONS', 100, 1, 100_000);
// Idle eviction TTL: how long a session may sit untouched in memory before the
// sweep below closes it. Deliberately generous (24h default) — a writer
// pausing over lunch, or a tab left open overnight, must not lose in-memory
// state on the next request; PERSIST mode re-hydrates from disk regardless,
// but non-persist (':memory:', the test/dev default) sessions are gone for
// good once evicted, so erring generous costs only RAM, not correctness.
// Env-tunable per deployment via SESSION_IDLE_TTL_MINUTES (e.g. lower it on a
// memory-constrained box). Run 16 audit: this used to be a hardcoded 30
// minutes with no env override — too aggressive for real usage and not
// operator-tunable; widened + parameterized, no other eviction-mechanism
// change (the cap-based LRU eviction below already existed and already did
// the right thing — close-only, never unlink, in PERSIST mode).
export const SESSION_TTL_MS  = boundedIntegerEnv('SESSION_IDLE_TTL_MINUTES', 1440, 1, 24 * 365 * 60) * 60 * 1000;

// ── Session store ─────────────────────────────────────────────────────────────
export const sessions     = new Map<string, Session>();
export const runningRooms = new Set<string>();
const rotatingSessionIds = new Set<string>();
// Last-resort lifecycle barrier when rollback cannot remove or rename a
// candidate published by this process. Never let that valid database become
// addressable merely because the HTTP request returned a failure.
const quarantinedSessionIds = new Set<string>();
const SQLITE_ARTIFACT_SUFFIXES = ['', '-wal', '-shm', '-journal'] as const;

export function dbPathFor(sessionId: string): string {
  return PERSIST_SESSIONS ? path.join(SESSION_DB_DIR, `${sessionId}.db`) : ':memory:';
}

export function getOrCreateSession(sessionId: string): Session {
  // Rotation reserves both the old and replacement ids before it queues
  // behind earlier commands. This check covers direct read routes as well as
  // withSessionCommand(): neither may obtain a Stage whose handle is about to
  // be closed and replaced by the lifecycle operation.
  if (
    rotatingSessionIds.has(sessionId)
    || hasActiveInMemoryQuarantine(sessionId)
    || hasDurableRotationDeny(sessionId)
  ) {
    throw new SessionBusyError('Session rotation lifecycle is unavailable. Please retry with the authoritative session ID.');
  }
  let session = sessions.get(sessionId);
  if (!session) {
    if (sessions.size >= MAX_SESSIONS) {
      // Evict only an idle least-recently-accessed session. Closing a Stage
      // with a queued/running command would permit a second same-id Stage to
      // reopen while the first command is still mutating SQLite.
      // Close-only, same as sweepIdleSessions() below — the sqlite file (in
      // PERSIST mode) is deliberately left on disk. Whether to *also* delete
      // long-cold PERSIST-mode files (distinct from the existing orphaned-file
      // disk sweep further down, which already reclaims files idle 7+ days)
      // is a data-retention decision, not a capacity-management one — filed
      // in docs/AUTH.md / README's backup section rather than decided here.
      let oldestId = '';
      let oldestAccess = Infinity;
      for (const [id, s] of sessions) {
        if (s.commands.isIdle && s.lastAccess < oldestAccess) {
          oldestAccess = s.lastAccess;
          oldestId = id;
        }
      }
      if (!oldestId) {
        throw new SessionCapacityError();
      }
      sessions.get(oldestId)?.stage.close();
      sessions.delete(oldestId);
      logger.warn('session_evicted', { evicted: oldestId, cap: MAX_SESSIONS });
    }
    // For a persisted session this opens the existing file; the Orchestrator
    // constructor re-hydrates agents + locations, so the session resumes intact.
    const s = new Stage(dbPathFor(sessionId));
    session = {
      stage: s,
      orchestrator: new Orchestrator(s),
      lastAccess: Date.now(),
      commands: new SessionCommandCoordinator(),
      rotating: false,
    };
    sessions.set(sessionId, session);
  }
  session.lastAccess = Date.now();
  return session;
}

// Evict a session from memory AND delete its persisted DB file — a true wipe.
export function destroySession(sessionId: string): void {
  const session = sessions.get(sessionId);
  if (session && !session.commands.isIdle) throw new SessionBusyError();
  if (session) { session.stage.close(); sessions.delete(sessionId); }
  if (PERSIST_SESSIONS) {
    const base = path.join(SESSION_DB_DIR, `${sessionId}.db`);
    for (const suffix of SQLITE_ARTIFACT_SUFFIXES) {
      try { fs.unlinkSync(base + suffix); } catch { /* file absent — fine */ }
    }
  }
}

function sqliteArtifactPaths(base: string): string[] {
  return SQLITE_ARTIFACT_SUFFIXES.map(suffix => base + suffix);
}

/** Directory-entry existence without following a symlink target. */
function directoryEntryExists(file: string): boolean {
  try {
    fs.lstatSync(file);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false;
    throw error;
  }
}

function hasSqliteArtifact(base: string): boolean {
  return sqliteArtifactPaths(base).some(file => directoryEntryExists(file));
}

function hasActiveInMemoryQuarantine(sessionId: string): boolean {
  if (!quarantinedSessionIds.has(sessionId)) return false;
  if (!PERSIST_SESSIONS) return true;

  try {
    if (hasSqliteArtifact(path.join(SESSION_DB_DIR, `${sessionId}.db`))) return true;
  } catch (error) {
    logger.error('session_rotate_memory_quarantine_inspection_failed', { error: (error as Error).message });
    return true;
  }

  // Candidate cleanup can happen while the process remains alive (operator
  // repair or the orphan sweep). Once absence is proven without following
  // symlinks, retire the transient barrier and let the durable marker path
  // below perform its independently fail-closed retirement.
  quarantinedSessionIds.delete(sessionId);
  return false;
}

const DURABLE_ROTATION_DENY_SUFFIX = '.rotation-deny';

/** Return a marker path only for one safe filename segment inside the root. */
function durableRotationDenyPath(sessionId: string): string | undefined {
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(sessionId)) return undefined;
  const root = path.resolve(SESSION_DB_DIR);
  const marker = path.resolve(root, `.${sessionId}${DURABLE_ROTATION_DENY_SUFFIX}`);
  return path.dirname(marker) === root ? marker : undefined;
}

function hasDurableRotationDeny(sessionId: string): boolean {
  if (!PERSIST_SESSIONS) return false;
  const marker = durableRotationDenyPath(sessionId);
  if (!marker) return false;

  try {
    if (!directoryEntryExists(marker)) return false;
  } catch (error) {
    logger.error('session_rotate_deny_inspection_failed', { error: (error as Error).message });
    return true;
  }

  const candidateBase = path.join(SESSION_DB_DIR, `${sessionId}.db`);
  try {
    if (hasSqliteArtifact(candidateBase)) return true;
  } catch (error) {
    logger.error('session_rotate_candidate_inspection_failed', { error: (error as Error).message });
    return true;
  }

  // A deny without any candidate artifacts is stale (for example after the
  // orphan sweep removed a failed database). Retire only the marker directory
  // entry. unlinkSync does not follow a symlink, so an external symlink target
  // is never deleted. Any ambiguous failure remains fail-closed.
  try {
    fs.unlinkSync(marker);
    return directoryEntryExists(marker);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false;
    logger.error('session_rotate_stale_deny_cleanup_failed', { error: (error as Error).message });
    return true;
  }
}

/**
 * Persist the failed replacement-id deny before releasing the HTTP lifecycle.
 * The marker contains no session data or secret; its durable existence is the
 * authority barrier checked before any Stage can open `<sessionId>.db`.
 */
function persistDurableRotationDeny(sessionId: string): void {
  const marker = durableRotationDenyPath(sessionId);
  if (!marker) throw new Error('Cannot persist deny marker for an invalid session ID.');

  let descriptor: number;
  try {
    descriptor = fs.openSync(marker, 'wx', 0o600);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'EEXIST') return;
    throw error;
  }
  try {
    fs.writeSync(descriptor, 'StoryMachine failed session rotation deny marker\n');
    fs.fsyncSync(descriptor);
  } finally {
    fs.closeSync(descriptor);
  }

  // POSIX needs the directory entry synced separately. Some Windows
  // filesystems do not permit opening/fsyncing a directory; the marker file
  // itself has already been fsynced there, so unsupported directory sync is a
  // best-effort enhancement rather than reason to discard the durable deny.
  let directoryDescriptor: number | undefined;
  try {
    directoryDescriptor = fs.openSync(path.dirname(marker), 'r');
    fs.fsyncSync(directoryDescriptor);
  } catch { /* directory fsync is not portable */ }
  finally {
    if (directoryDescriptor !== undefined) fs.closeSync(directoryDescriptor);
  }
}

function removeSqliteArtifacts(base: string): void {
  // Delete the main database last. If sidecar cleanup fails, the authoritative
  // database is still present and can be reopened under the old id.
  for (const suffix of ['-wal', '-shm', '-journal', ''] as const) {
    const file = base + suffix;
    if (fs.existsSync(file)) fs.unlinkSync(file);
  }
}

/**
 * Move rollback debris outside the `<sessionId>.db` namespace. Each rename is
 * same-directory, and the caller verifies the original paths are all absent.
 */
function quarantineSqliteArtifacts(base: string, sessionId: string): void {
  const quarantineBase = path.join(
    SESSION_DB_DIR,
    `.${sessionId}.failed-rotation-${crypto.randomUUID()}.db`,
  );
  for (const suffix of SQLITE_ARTIFACT_SUFFIXES) {
    const source = base + suffix;
    if (fs.existsSync(source)) fs.renameSync(source, quarantineBase + suffix);
  }
}

function chooseReplacementSessionId(requestedNewId?: string): string {
  // Keep the library interface fail-closed even when called outside the HTTP
  // route (whose zod schema enforces the same canonical representation).
  if (requestedNewId !== undefined && !HEADER_SESSION_ID_RE.test(requestedNewId)) {
    throw new ValidationError('newSessionId must match [a-zA-Z0-9_-]{8,64}');
  }

  const isCollision = (candidate: string): boolean => {
    if (
      sessions.has(candidate)
      || rotatingSessionIds.has(candidate)
      || hasActiveInMemoryQuarantine(candidate)
      || hasDurableRotationDeny(candidate)
    ) return true;
    return PERSIST_SESSIONS && hasSqliteArtifact(path.join(SESSION_DB_DIR, `${candidate}.db`));
  };

  if (requestedNewId !== undefined) {
    if (isCollision(requestedNewId)) {
      throw new ValidationError('Requested new session ID is already in use.');
    }
    return requestedNewId;
  }

  let generated: string;
  do generated = crypto.randomUUID().replace(/-/g, ''); while (isCollision(generated));
  return generated;
}

// Safely rotate a bearer session ID to a new unguessable ID (see docs/AUTH.md).
export async function rotateSession(
  oldSessionId: string,
  requestedNewId?: string,
): Promise<{ oldSessionId: string; newSessionId: string }> {
  const newSessionId = chooseReplacementSessionId(requestedNewId);
  const session = getOrCreateSession(oldSessionId);

  // Set the lifecycle barrier before entering the FIFO. Commands already
  // admitted are allowed to settle first; every later old-id/target-id request
  // is rejected by getOrCreateSession() instead of touching a closing Stage.
  rotatingSessionIds.add(oldSessionId);
  rotatingSessionIds.add(newSessionId);
  session.rotating = true;

  try {
    return await session.commands.run(async () => {
      if (!PERSIST_SESSIONS) {
        const draft = session.stage.loadScriptIDEState(oldSessionId);
        if (draft) session.stage.saveScriptIDEState(newSessionId, draft);
        sessions.delete(oldSessionId);
        sessions.set(newSessionId, session);
        logger.info('session_rotated', { oldSessionId, newSessionId, persistent: false });
        return { oldSessionId, newSessionId };
      }

      const oldBase = path.join(SESSION_DB_DIR, `${oldSessionId}.db`);
      const newBase = path.join(SESSION_DB_DIR, `${newSessionId}.db`);
      const temporaryBase = path.join(
        SESSION_DB_DIR,
        `.${newSessionId}.rotate-${crypto.randomUUID()}.tmp`,
      );
      const oldStage = session.stage;
      let oldStageClosed = false;
      let replacementPublished = false;
      let verificationStage: Stage | undefined;
      let replacementStage: Stage | undefined;

      try {
        // Online backup captures committed data still resident in the live WAL
        // without renaming files underneath SQLite's open Windows handles.
        await oldStage.backupTo(temporaryBase);
        oldStage.close();
        oldStageClosed = true;

        // Reopen the backup before publication and migrate the one table keyed
        // by bearer id. Constructing the Orchestrator exercises persisted
        // simulation hydration as part of verification too.
        verificationStage = new Stage(temporaryBase);
        const draft = verificationStage.loadScriptIDEState(oldSessionId);
        if (draft) verificationStage.saveScriptIDEState(newSessionId, draft);
        new Orchestrator(verificationStage);
        verificationStage.close();
        verificationStage = undefined;

        // Keep the early check for a clear diagnostic, but correctness does not
        // depend on it: linkSync below is the atomic no-clobber publication
        // primitive. Unlike POSIX rename, a hard link fails with EEXIST if a
        // target appears between this check and publication. The backup lives
        // in this same directory, so Windows/NTFS and POSIX both link within
        // one filesystem.
        if (hasSqliteArtifact(newBase)) {
          throw new Error('replacement database appeared during rotation');
        }
        fs.linkSync(temporaryBase, newBase);
        replacementPublished = true;
        fs.unlinkSync(temporaryBase);

        // A 200 is allowed only after the published path itself is reopenable.
        replacementStage = new Stage(newBase);
        const replacementOrchestrator = new Orchestrator(replacementStage);
        if (draft && !replacementStage.loadScriptIDEState(newSessionId)) {
          throw new Error('replacement database did not retain ScriptIDE state');
        }

        removeSqliteArtifacts(oldBase);
        if (hasSqliteArtifact(oldBase)) {
          throw new Error('source SQLite artifacts remain after rotation');
        }

        session.stage = replacementStage;
        session.orchestrator = replacementOrchestrator;
        replacementStage = undefined;
        sessions.delete(oldSessionId);
        sessions.set(newSessionId, session);
        logger.info('session_rotated', { oldSessionId, newSessionId, persistent: true });
        return { oldSessionId, newSessionId };
      } catch (error) {
        verificationStage?.close();
        replacementStage?.close();

        // Publication may have succeeded before a later verification/cleanup
        // failure. Restore the durable old path before removing the candidate.
        if (!fs.existsSync(oldBase)) {
          const recoverySource = replacementPublished && fs.existsSync(newBase)
            ? newBase
            : (fs.existsSync(temporaryBase) ? temporaryBase : undefined);
          if (recoverySource) fs.copyFileSync(recoverySource, oldBase);
        }
        // If the target appeared during backup, it belongs to another actor;
        // only remove newBase when this rotation actually published it.
        if (replacementPublished) {
          try {
            removeSqliteArtifacts(newBase);
          } catch (cleanupError) {
            logger.warn('session_rotate_candidate_cleanup_failed', {
              newSessionId,
              error: (cleanupError as Error).message,
            });
          }
          if (hasSqliteArtifact(newBase)) {
            try {
              quarantineSqliteArtifacts(newBase, newSessionId);
            } catch (quarantineError) {
              logger.error('session_rotate_candidate_quarantine_failed', {
                newSessionId,
                error: (quarantineError as Error).message,
              });
            }
          }
          // The failed candidate must be either absent from the addressable
          // namespace or denied durably across restarts (with the in-memory
          // set retaining the same barrier immediately in this process).
          if (hasSqliteArtifact(newBase)) {
            try {
              persistDurableRotationDeny(newSessionId);
            } catch (denyError) {
              logger.error('session_rotate_durable_deny_failed', {
                newSessionId,
                error: (denyError as Error).message,
              });
            }
            quarantinedSessionIds.add(newSessionId);
          }
        }
        try { removeSqliteArtifacts(temporaryBase); } catch { /* temporary file is never loadable by an id */ }

        if (oldStageClosed) {
          try {
            const restoredStage = new Stage(oldBase);
            session.stage = restoredStage;
            session.orchestrator = new Orchestrator(restoredStage);
          } catch (restoreError) {
            sessions.delete(oldSessionId);
            logger.error('session_rotate_restore_failed', {
              oldSessionId,
              error: (restoreError as Error).message,
            });
          }
        }

        logger.warn('session_rotate_failed', {
          oldSessionId,
          newSessionId,
          error: (error as Error).message,
        });
        throw new SessionRotationError();
      }
    });
  } finally {
    session.rotating = false;
    rotatingSessionIds.delete(oldSessionId);
    rotatingSessionIds.delete(newSessionId);
  }
}

// Header-supplied ids come from src/lib/session.ts's crypto.randomUUID()-based
// generator (32 chars after dash-stripping) — 8-64 gives comfortable headroom
// without accepting near-empty values that would collide easily.
const HEADER_SESSION_ID_RE = /^[A-Za-z0-9_-]{8,64}$/;

export function sessionId(req: express.Request): string {
  const raw = req.method === 'GET'
    ? req.query.sessionId
    : req.body?.sessionId;

  // Precedence 1: an explicit sessionId (query for GET, body otherwise) always
  // wins over the header — existing callers/tests (tests/routes/*.test.ts) and
  // power callers (DebuggerPanel, scripted API use) depend on this remaining
  // authoritative even once every browser also sends an X-Session-Id header.
  // Unchanged from prior behavior: a *present but malformed* explicit value is
  // rejected with 400 rather than silently falling back, since silently
  // substituting 'default' here could leak another user's session into an
  // otherwise-explicit request.
  if (raw !== undefined && raw !== null && raw !== '') {
    // A non-string explicit value (e.g. Express parsing a duplicated
    // ?sessionId=a&sessionId=b query into a string[]) is "present but
    // malformed" exactly like a string that fails the regex below, so it
    // gets the same 400 instead of silently falling back to 'default' — see
    // the leak-prevention rationale in the comment above.
    if (typeof raw !== 'string') {
      throw new ValidationError('sessionId must match [a-zA-Z0-9_-]{1,64}');
    }
    if (!raw.trim()) return 'default';
    const cleaned = raw.trim().substring(0, 64);
    if (!/^[a-zA-Z0-9_-]{1,64}$/.test(cleaned)) {
      throw new ValidationError('sessionId must match [a-zA-Z0-9_-]{1,64}');
    }
    return cleaned;
  }

  // Precedence 2: the client-held X-Session-Id header, installed on every
  // same-origin /api/* fetch() by src/main.tsx's wrapper (SSE/EventSource
  // call sites can't set custom headers, so those instead append `?sessionId=`
  // via src/lib/session.ts's withSession(), which is caught by precedence 1
  // above). This is what gives each browser tab its own Stage instead of every
  // visitor sharing the 'default' session.
  //
  // Validity guard is a security boundary, not cosmetics: sessionId flows
  // straight into a filesystem path in PERSIST_SESSIONS mode — see
  // dbPathFor()/destroySession() below, which do
  // `path.join(SESSION_DB_DIR, sessionId + '.db')` with no other sanitization.
  // The header is unauthenticated, attacker-controlled input from any browser
  // (unlike the explicit query/body value, which at least requires a caller
  // deliberately constructing the request), so it gets the stricter
  // treatment: [A-Za-z0-9_-] contains no `/`, `\`, or `.`, so a single path
  // segment built from it can never traverse out of SESSION_DB_DIR or address
  // an absolute path — sufficient on every OS this runs on. Anything that
  // fails the charset (or is missing) falls through to 'default' rather than
  // throwing: a garbage/stale header (e.g. a corrupted localStorage value)
  // must never 500 a request that didn't explicitly opt into strict
  // validation the way a hand-supplied query/body sessionId does.
  const headerRaw = req.headers['x-session-id'];
  const header = Array.isArray(headerRaw) ? headerRaw[0] : headerRaw;
  if (typeof header === 'string' && HEADER_SESSION_ID_RE.test(header)) {
    return header;
  }

  // Precedence 3: no usable id anywhere — fall back to 'default'.
  return 'default';
}

// ── TTL cleanup intervals (side effects — run on module load) ─────────────────

// Evict every session that has been idle (no access) for longer than `ttlMs`,
// as measured from `now`. Closes the Stage (releases the sqlite file handle
// in PERSIST mode) and drops it from the in-memory map — the DB file itself
// is left untouched on disk, so a PERSIST-mode session resumes intact on its
// next request (getOrCreateSession() re-opens + rehydrates). This mirrors the
// cap-based LRU eviction in getOrCreateSession() above: eviction from memory
// is never data loss in PERSIST mode.
//
// Exported (rather than only wired into the setInterval below) so tests can
// drive eviction deterministically — inject a fixed `now` and/or a short
// `ttlMs` instead of waiting on real wall-clock time or the 60s sweep cadence.
// See tests/core/session-eviction.test.ts.
export function sweepIdleSessions(now: number = Date.now(), ttlMs: number = SESSION_TTL_MS): string[] {
  const evicted: string[] = [];
  for (const [id, s] of sessions) {
    if (s.commands.isIdle && now - s.lastAccess > ttlMs) {
      s.stage.close();
      sessions.delete(id);
      evicted.push(id);
    }
  }
  return evicted;
}

// TTL cleanup: evict idle sessions from memory and release the file handle.
// The DB file remains on disk so the session resumes on next access.
setInterval(() => sweepIdleSessions(), 60_000).unref();

// Disk cleanup: remove orphaned session DB files that are older than SESSION_FILE_TTL_MS
// and are not currently loaded in memory. Runs every 6 hours.
const SESSION_FILE_TTL_MS = Number(process.env.SESSION_FILE_TTL_HOURS ?? 168) * 60 * 60 * 1000; // default 7 days
if (PERSIST_SESSIONS) {
  setInterval(() => {
    const now = Date.now();
    let files: string[];
    try { files = fs.readdirSync(SESSION_DB_DIR); } catch { return; }
    for (const file of files) {
      if (!file.endsWith('.db')) continue;
      const sid = file.slice(0, -3);
      if (sessions.has(sid)) continue; // actively loaded — skip
      const filePath = path.join(SESSION_DB_DIR, file);
      try {
        const stat = fs.statSync(filePath);
        if (now - stat.mtimeMs > SESSION_FILE_TTL_MS) {
          for (const suffix of ['-wal', '-shm', '-journal']) {
            try { fs.unlinkSync(filePath + suffix); } catch { /* absent */ }
          }
          fs.unlinkSync(filePath);
          logger.info('session_disk_cleanup', { sid, ageDays: Math.round((now - stat.mtimeMs) / 86_400_000) });
        }
      } catch { /* file already gone */ }
    }
  }, 6 * 60 * 60 * 1000).unref();

  // Reset recovery artifacts contain complete local project snapshots, so
  // enforce their separate retention clock even when the user never resets
  // again. The pruning helper only touches generated names beneath safe
  // session-id directories; a failure is logged for the operator rather than
  // being silently interpreted as successful retention.
  setInterval(() => {
    try {
      const summary = pruneAllSessionResetBackups(SESSION_BACKUP_DIR, {
        keep: SESSION_RESET_BACKUP_KEEP,
        maxAgeMs: SESSION_RESET_BACKUP_TTL_HOURS * 60 * 60 * 1000,
      });
      if (summary.removed.length > 0) {
        logger.info('session_reset_backups_pruned', { removed: summary.removed.length });
      }
    } catch (error) {
      logger.error('session_reset_backup_retention_failed', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }, 6 * 60 * 60 * 1000).unref();
}

// Re-export metrics for routes that use it
export { metrics };
