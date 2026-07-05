import express from 'express';
import path from 'path';
import fs from 'fs';
import { rateLimit } from 'express-rate-limit';
import { Stage } from '../engine/Stage.ts';
import { Orchestrator } from '../engine/Orchestrator.ts';
import { logger } from './logger.ts';
import { metrics } from './metrics.ts';

// ── Shared types ──────────────────────────────────────────────────────────────
export interface Session {
  stage: Stage;
  orchestrator: Orchestrator;
  lastAccess: number;
  _turnQueue: Promise<void>;  // serializes concurrent /api/turn calls per session
}

// ── Helpers ───────────────────────────────────────────────────────────────────
export class ValidationError extends Error {
  status = 400;
  constructor(message: string) { super(message); this.name = 'ValidationError'; }
}

export const asyncHandler = (fn: express.RequestHandler): express.RequestHandler =>
  (req, res, next) => {
    try {
      Promise.resolve(fn(req, res, next)).catch(next);
    } catch (e) {
      next(e);
    }
  };

export const requireString = (val: unknown, name: string, maxLen = 20_000): string => {
  if (typeof val !== 'string' || val.trim() === '') throw new Error(`${name} is required`);
  if (val.length > maxLen) throw new Error(`${name} exceeds maximum length`);
  return val.trim();
};

export function safeJsonParse<T>(text: string, fallback: T): T {
  try { return JSON.parse(text); } catch { return fallback; }
}

// ── Rate limiters ─────────────────────────────────────────────────────────────
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

// ── Session constants ─────────────────────────────────────────────────────────
export const SESSION_DB_DIR  = process.env.SESSION_DB_DIR ?? path.join(process.cwd(), 'data', 'sessions');
export const PERSIST_SESSIONS = SESSION_DB_DIR !== ':memory:';
export const MAX_SESSIONS    = Number(process.env.MAX_SESSIONS ?? 100);
export const SESSION_TTL_MS  = 30 * 60 * 1000;

// ── Session store ─────────────────────────────────────────────────────────────
export const sessions     = new Map<string, Session>();
export const runningRooms = new Set<string>();

export function dbPathFor(sessionId: string): string {
  return PERSIST_SESSIONS ? path.join(SESSION_DB_DIR, `${sessionId}.db`) : ':memory:';
}

export function getOrCreateSession(sessionId: string): Session {
  let session = sessions.get(sessionId);
  if (!session) {
    if (sessions.size >= MAX_SESSIONS) {
      // Evict the least-recently-accessed session to stay within the cap.
      let oldestId = '';
      let oldestAccess = Infinity;
      for (const [id, s] of sessions) {
        if (s.lastAccess < oldestAccess) { oldestAccess = s.lastAccess; oldestId = id; }
      }
      if (oldestId) {
        sessions.get(oldestId)?.stage.close();
        sessions.delete(oldestId);
        logger.warn('session_evicted', { evicted: oldestId, cap: MAX_SESSIONS });
      }
    }
    // For a persisted session this opens the existing file; the Orchestrator
    // constructor re-hydrates agents + locations, so the session resumes intact.
    const s = new Stage(dbPathFor(sessionId));
    session = { stage: s, orchestrator: new Orchestrator(s), lastAccess: Date.now(), _turnQueue: Promise.resolve() };
    sessions.set(sessionId, session);
  }
  session.lastAccess = Date.now();
  return session;
}

// Evict a session from memory AND delete its persisted DB file — a true wipe.
export function destroySession(sessionId: string): void {
  const session = sessions.get(sessionId);
  if (session) { session.stage.close(); sessions.delete(sessionId); }
  if (PERSIST_SESSIONS) {
    const base = path.join(SESSION_DB_DIR, `${sessionId}.db`);
    for (const suffix of ['', '-wal', '-shm', '-journal']) {
      try { fs.unlinkSync(base + suffix); } catch { /* file absent — fine */ }
    }
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
    if (typeof raw !== 'string' || !raw.trim()) return 'default';
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

// TTL cleanup: evict idle sessions from memory and release the file handle.
// The DB file remains on disk so the session resumes on next access.
setInterval(() => {
  const now = Date.now();
  for (const [id, s] of sessions) {
    if (now - s.lastAccess > SESSION_TTL_MS) {
      s.stage.close();
      sessions.delete(id);
    }
  }
}, 60_000).unref();

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
}

// Re-export metrics for routes that use it
export { metrics };
