// ── Collaboration room routes ────────────────────────────────────────────────
// POST /api/collab/rooms  — mint a new, unguessable room id (the capability).
// POST /api/collab/token  — mint a short-lived join token for an EXISTING id.
//
// WHAT CHANGED AND WHY (retrospective §4,
// docs/audits/2026-09-02-retrospective/RETROSPECTIVE.md). This file used to
// expose only the token route, and it minted a token for ANY syntactically
// valid room NAME presented by ANY caller. Room names were writer-typed free
// text created client-side (`draft`, a film title), so the "capability" was
// guessable: an attacker asked for a token for the room they wanted, opened
// the WebSocket, and the whole unpublished Y.Doc synced to them. Every piece
// of ceremony around it — the HMAC, the TTL, the room-binding, two test
// files — was sound and none of it mattered, because the attacker was handed
// a legitimate token for someone else's room.
//
// The capability is now a SERVER-minted 128-bit id (server/lib/collab-rooms.ts).
// The writer's typed name never reaches the server; it is a local label in the
// UI, and the share link (which carries the id) is what actually grants
// access — the same "anyone with the link can read and write" shape as the
// session id in docs/AUTH.md. See docs/AUTH.md's "Collaboration rooms"
// section for the full model, including what it does NOT protect.
import express from 'express';
import { validate, CollabRoomCreateBodySchema, CollabTokenBodySchema } from '../lib/validation.ts';
import { issueCollabToken } from '../lib/collab-auth.ts';
import { asyncHandler, gameLimiter, sessionId } from '../lib/session-store.ts';
import {
  createCollabRoom,
  collabRoomExists,
  touchCollabRoom,
  spendRoomCreationBudget,
  spendTokenBudget,
} from '../lib/collab-rooms.ts';

const router = express.Router();
export default router;

// The one deployment-configuration check both routes share: refuse to run
// collaboration in a production-like deployment that hasn't set COLLAB_SECRET.
// Without it, server/lib/collab-auth.ts falls back to a random per-process
// secret — fine for a single-process local/dev server, but silently broken
// (tokens minted by one instance won't verify against another) and easy to
// overlook in a real multi-instance deployment. Failing loudly here (503)
// turns that into an explicit deploy-time configuration error instead of an
// intermittent, hard-to-diagnose collab outage. Applied to room CREATION too,
// not just token minting: a room that can never be joined is worse than a
// refusal at the moment the writer asks for one.
function collabUnconfigured(): boolean {
  return process.env.NODE_ENV === 'production' && !process.env.COLLAB_SECRET;
}
const UNCONFIGURED_MESSAGE =
  'Collaboration is not configured for this deployment (COLLAB_SECRET is unset).';

// Both routes are budgeted PER SESSION on top of gameLimiter's 120/min/IP.
// `sessionId(req)` falls back to the shared 'default' bucket when the caller
// presents no id at all (server/lib/session-store.ts) — accepting that here
// would mean one abusive anonymous caller could exhaust the room-creation
// budget for every other anonymous caller, so a caller with no session id is
// refused instead. This is NOT an access check: session ids are self-minted
// by the client (src/lib/session.ts) and anyone can produce one. It only
// guarantees that the per-session budgets partition callers rather than
// collapsing into one globally-shared bucket.
const NO_SESSION_MESSAGE =
  'A session id is required for collaboration (send an X-Session-Id header or a sessionId body field).';

function callerSession(req: express.Request): string | null {
  const id = sessionId(req);
  return id === 'default' ? null : id;
}

// ── POST /api/collab/rooms ───────────────────────────────────────────────────
// Takes no room input at all — a client-chosen id is exactly the hole this
// route exists to close, so there is no field to supply one. Returns the
// minted id; the client turns it into a share link.
router.post('/api/collab/rooms', gameLimiter, validate(CollabRoomCreateBodySchema), asyncHandler(async (req, res) => {
  if (collabUnconfigured()) {
    res.status(503).json({ error: UNCONFIGURED_MESSAGE });
    return;
  }
  const session = callerSession(req);
  if (session === null) {
    res.status(400).json({ error: NO_SESSION_MESSAGE });
    return;
  }
  if (!spendRoomCreationBudget(session)) {
    res.status(429).json({ error: 'Too many collaboration rooms created; try again in a minute.' });
    return;
  }
  const roomId = createCollabRoom(session);
  if (roomId === null) {
    // Registry ceiling reached and nothing was expirable. Never fall back to
    // a guessable id — refuse.
    res.status(503).json({ error: 'Collaboration is at capacity; try again later.' });
    return;
  }
  res.json({ roomId });
}));

// ── POST /api/collab/token ───────────────────────────────────────────────────
// Mints a WebSocket join token bound to an id that was actually minted.
//
// ONE REFUSAL, TWO CAUSES — and the order matters. The budget is spent BEFORE
// the registry is consulted, and an exhausted budget produces the SAME status
// and body as an unknown id. If it were the other way round — existence
// checked first, or the two refusals distinguishable — then a caller who has
// already burned their budget would still get a free, unlimited "does this id
// exist?" oracle out of the difference between 404 and 429. Spending first
// and answering identically means every existence probe costs budget and
// returns nothing distinguishable. The registry lookup is performed on the
// exhausted path too (result discarded) so the two refusals also do the same
// work; server/lib/collab-rooms.ts hashes the id before lookup so the lookup
// itself is uniform in the id's own bytes.
//
// Cost of the merge: a legitimate collaborator who somehow exhausts 30 token
// mints in a minute is told "no such room" rather than "slow down". A client
// fetches one token per join, so that is a theoretical writer and a real
// attacker.
const REFUSAL = { error: 'No such collaboration room.' };

router.post('/api/collab/token', gameLimiter, validate(CollabTokenBodySchema), asyncHandler(async (req, res) => {
  if (collabUnconfigured()) {
    res.status(503).json({ error: UNCONFIGURED_MESSAGE });
    return;
  }
  const session = callerSession(req);
  if (session === null) {
    res.status(400).json({ error: NO_SESSION_MESSAGE });
    return;
  }
  const { roomId } = req.body as { roomId: string };
  const affordable = spendTokenBudget(session);
  const exists = collabRoomExists(roomId);
  if (!affordable || !exists) {
    res.status(404).json(REFUSAL);
    return;
  }
  touchCollabRoom(roomId);
  res.json(issueCollabToken(roomId));
}));
