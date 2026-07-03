// ── Collaboration room tokens ─────────────────────────────────────────────────
// Stateless, short-lived HMAC tokens gating access to a Yjs collab room
// (server/collab/yjs-server.ts). A client must fetch a token via
// POST /api/collab/token (an authenticated-by-session-membership REST call,
// itself behind gameLimiter) before it can open the /collab/<room> WebSocket.
// No token store is needed: verification recomputes the HMAC from the room
// name and embedded expiry, so any process holding COLLAB_SECRET can verify
// a token issued by any other (or the same, restarted) process.
import crypto from 'crypto';
import { logger } from './logger.ts';

// y-websocket bakes `params` (and so this token) into the provider at
// construction time and replays the same value on every auto-reconnect —
// it does not re-fetch a fresh token. A very short TTL would make the socket
// permanently unrecoverable after any real disconnection (laptop sleep, a
// network blip longer than the TTL) until the page is reloaded. 30 minutes
// matches this codebase's existing SESSION_TTL_MS convention (session-store.ts)
// and comfortably covers reconnect windows while still bounding replay.
const TOKEN_TTL_MS = 30 * 60 * 1000;
const CLOCK_SKEW_MS = 30 * 1000;

// Falls back to a per-process random secret so local/dev usage doesn't require
// extra setup. Tokens issued before a restart stop validating after one —
// acceptable given the 5-minute TTL. Set COLLAB_SECRET in any deployment with
// more than one server process (e.g. behind a load balancer), or restarts will
// intermittently reject in-flight token fetches.
const COLLAB_SECRET: string = process.env.COLLAB_SECRET ?? (() => {
  const generated = crypto.randomBytes(32).toString('hex');
  logger.warn('collab_secret_generated', {
    message: 'COLLAB_SECRET not set — generated an ephemeral per-process secret. ' +
      'Set COLLAB_SECRET in any multi-process or restart-prone deployment.',
  });
  return generated;
})();

function sign(room: string, exp: number): string {
  return crypto.createHmac('sha256', COLLAB_SECRET).update(`${room}.${exp}`).digest('hex');
}

export function issueCollabToken(room: string): { token: string; expiresAt: number } {
  const expiresAt = Date.now() + TOKEN_TTL_MS;
  const token = `${expiresAt}.${sign(room, expiresAt)}`;
  return { token, expiresAt };
}

/**
 * Verify a token against the specific room it claims to grant access to.
 * The room is not embedded in the token — it's supplied by the caller (who
 * read it from the WebSocket upgrade path) and folded into the HMAC input, so
 * a token issued for room "a" cannot be replayed against room "b".
 */
export function verifyCollabToken(room: string, token: string | null | undefined): boolean {
  if (!token) return false;
  const dotIdx = token.indexOf('.');
  if (dotIdx === -1) return false;
  const expStr = token.slice(0, dotIdx);
  const sig = token.slice(dotIdx + 1);
  const exp = Number(expStr);
  if (!Number.isFinite(exp)) return false;
  if (Date.now() > exp + CLOCK_SKEW_MS) return false;

  const expected = sign(room, exp);
  const a = Buffer.from(sig, 'utf8');
  const b = Buffer.from(expected, 'utf8');
  // timingSafeEqual throws on length mismatch rather than returning false —
  // guard explicitly so a malformed/truncated signature can't crash the upgrade handler.
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}
