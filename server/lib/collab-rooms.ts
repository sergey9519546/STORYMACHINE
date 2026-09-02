// ── Collaboration room registry (share-link capability model) ────────────────
// The security fix for the finding that POST /api/collab/token would mint a
// join token for ANY room name any caller typed. The HMAC token layer
// (server/lib/collab-auth.ts) was never the hole — it faithfully binds a token
// to a room — the hole was that the room NAMESPACE was writer-chosen free text
// (`draft`, `script`, a film title), so an attacker simply asked for a token
// for the room they wanted and the server minted it. The full unpublished
// Y.Doc then synced to them.
//
// The model now, stated plainly:
//
//   1. A room id is SERVER-minted and unguessable (128 bits of CSPRNG entropy,
//      base64url). The writer's typed label never reaches the server.
//   2. Possession of that id IS the authorization to join — the same
//      bearer-capability shape as a session id (docs/AUTH.md) or a "anyone
//      with the link" share. There are no accounts to check against
//      (NORTH_STAR: multi-user SaaS is a non-goal; P4 is last).
//   3. Token minting for an existing room therefore requires presenting the
//      id. A room that was never created cannot be minted for at all, so
//      guessing a name buys nothing.
//   4. The creating session is recorded — it owns the room for quota purposes
//      and is the only party that can be handed a NEW id — but ownership is
//      deliberately thin: sharing the id shares read+write access, and the UI
//      says so.
//
// Storage is in-memory and process-local, matching the Yjs docs themselves
// (server/collab/yjs-server.ts is explicitly in-memory only). A restart drops
// every room, which is the same blast radius the Y.Doc already had.
import crypto from 'crypto';
import { boundedIntegerEnv } from './runtime-limits.ts';

/** Room ids are 16 random bytes, base64url — 22 chars of [A-Za-z0-9_-], so
 *  they satisfy yjs-server.ts's ROOM_RE and validation.ts's roomIdField
 *  without any extra escaping when they become a URL path segment. */
const ROOM_ID_BYTES = 16;

/** How long a room stays joinable after its last create/join. Rooms are
 *  ephemeral by design; a stale capability should not live forever. */
export const COLLAB_ROOM_TTL_MS = boundedIntegerEnv(
  'COLLAB_ROOM_TTL_MS', 24 * 60 * 60 * 1000, 60_000, 7 * 24 * 60 * 60 * 1000,
);

/** Registry ceiling — bounds memory for a registry that is otherwise driven
 *  entirely by unauthenticated POSTs. Independent of COLLAB_MAX_ROOMS (which
 *  bounds live Y.Docs); this one bounds *joinable ids*, which outlive the
 *  docs. */
export const COLLAB_MAX_TRACKED_ROOMS = boundedIntegerEnv(
  'COLLAB_MAX_TRACKED_ROOMS', 2000, 10, 100_000,
);

/** Per-session budgets. gameLimiter already caps 120 requests/min/IP; these
 *  add the per-session dimension the finding asked for, so one session behind
 *  a shared IP cannot spend the whole IP budget farming rooms/tokens. */
export const COLLAB_ROOMS_PER_SESSION_PER_MIN = boundedIntegerEnv(
  'COLLAB_ROOMS_PER_SESSION_PER_MIN', 10, 1, 1000,
);
export const COLLAB_TOKENS_PER_SESSION_PER_MIN = boundedIntegerEnv(
  'COLLAB_TOKENS_PER_SESSION_PER_MIN', 30, 1, 1000,
);
const BUDGET_WINDOW_MS = 60_000;

interface RoomRecord {
  /** Session that created the room — quota owner, not an access check. */
  creatorSessionId: string;
  createdAt: number;
  /** Last create/join; drives TTL expiry. */
  lastSeenAt: number;
}

// Keyed by sha256(roomId), never by the id itself. Two reasons, both real:
//  - A Map keyed by the raw id would make lookup cost correlate with the
//    id's own bytes (bucket/prefix behavior). Hashing first makes every
//    lookup uniform, so a "does this room exist?" probe leaks nothing about
//    ids it did not already hold.
//  - A heap dump / accidental log of this Map no longer contains live
//    capabilities.
const rooms = new Map<string, RoomRecord>();

const roomBudget = new Map<string, { count: number; windowStart: number }>();
const tokenBudget = new Map<string, { count: number; windowStart: number }>();

function keyFor(roomId: string): string {
  return crypto.createHash('sha256').update(roomId, 'utf8').digest('hex');
}

function pruneExpired(now: number): void {
  for (const [key, rec] of rooms) {
    if (now - rec.lastSeenAt > COLLAB_ROOM_TTL_MS) rooms.delete(key);
  }
}

function spend(
  budgets: Map<string, { count: number; windowStart: number }>,
  sessionId: string,
  max: number,
): boolean {
  const now = Date.now();
  // Opportunistic sweep so a long-lived process doesn't accumulate one entry
  // per session id ever seen.
  if (budgets.size > 10_000) {
    for (const [id, b] of budgets) if (now - b.windowStart > BUDGET_WINDOW_MS) budgets.delete(id);
  }
  const entry = budgets.get(sessionId);
  if (!entry || now - entry.windowStart > BUDGET_WINDOW_MS) {
    budgets.set(sessionId, { count: 1, windowStart: now });
    return true;
  }
  if (entry.count >= max) return false;
  entry.count += 1;
  return true;
}

/** Per-session ceiling on room creation. Returns false when exhausted. */
export function spendRoomCreationBudget(sessionId: string): boolean {
  return spend(roomBudget, sessionId, COLLAB_ROOMS_PER_SESSION_PER_MIN);
}

/** Per-session ceiling on token minting. Returns false when exhausted. */
export function spendTokenBudget(sessionId: string): boolean {
  return spend(tokenBudget, sessionId, COLLAB_TOKENS_PER_SESSION_PER_MIN);
}

/**
 * Mint a new, unguessable room id owned (for quota purposes) by `sessionId`.
 * Returns null when the registry is full and nothing is expirable — the
 * caller surfaces that as a 503, never as a fallback to a guessable name.
 */
export function createCollabRoom(sessionId: string): string | null {
  const now = Date.now();
  pruneExpired(now);
  if (rooms.size >= COLLAB_MAX_TRACKED_ROOMS) return null;
  const roomId = crypto.randomBytes(ROOM_ID_BYTES).toString('base64url');
  rooms.set(keyFor(roomId), { creatorSessionId: sessionId, createdAt: now, lastSeenAt: now });
  return roomId;
}

/**
 * Does this room exist (and is it unexpired)? This is the whole access check:
 * the id is the capability, so knowing it is sufficient, and NOT knowing it is
 * disqualifying. Callers must not vary their response shape or their work
 * between the true and false branches — see server/routes/collab.ts.
 */
export function collabRoomExists(roomId: string): boolean {
  const rec = rooms.get(keyFor(roomId));
  if (!rec) return false;
  if (Date.now() - rec.lastSeenAt > COLLAB_ROOM_TTL_MS) {
    rooms.delete(keyFor(roomId));
    return false;
  }
  return true;
}

/** Extend a room's TTL because someone just used it. No-op for unknown ids. */
export function touchCollabRoom(roomId: string): void {
  const rec = rooms.get(keyFor(roomId));
  if (rec) rec.lastSeenAt = Date.now();
}

/** Creating session id, or null. Exposed for tests and future share policy. */
export function collabRoomCreator(roomId: string): string | null {
  return rooms.get(keyFor(roomId))?.creatorSessionId ?? null;
}

/** Live registry size (tests, diagnostics). */
export function collabRegistrySize(): number {
  pruneExpired(Date.now());
  return rooms.size;
}

/** Test-only: drop every registered room and every rate-limit budget. */
export function resetCollabRoomsForTesting(): void {
  rooms.clear();
  roomBudget.clear();
  tokenBudget.clear();
}
