// POST /api/collab/token — mint a short-lived token authorizing a WebSocket
// join to a specific /collab/<room> Yjs room. See server/lib/collab-auth.ts
// for the token scheme and server/collab/yjs-server.ts for verification.
import express from 'express';
import { validate, CollabTokenBodySchema } from '../lib/validation.ts';
import { issueCollabToken } from '../lib/collab-auth.ts';
import { asyncHandler, gameLimiter } from '../lib/session-store.ts';

const router = express.Router();
export default router;

// Audit finding S1-a-3 (SHOULD): rooms have no ownership model to check
// against — see CollabTokenBodySchema's doc comment in ../lib/validation.ts
// for why that's an intentional bearer-capability design, not a gap this
// route can close by itself. The one thing this route CAN and does enforce:
// refuse to mint tokens in a production-like deployment that hasn't set
// COLLAB_SECRET. Without it, server/lib/collab-auth.ts falls back to a
// random per-process secret — fine for a single-process local/dev server,
// but silently broken (tokens minted by one instance won't verify against
// another) and easy to overlook in a real multi-instance deployment. Failing
// loudly here (503) turns that into an explicit deploy-time configuration
// error instead of an intermittent, hard-to-diagnose collab outage.
router.post('/api/collab/token', gameLimiter, validate(CollabTokenBodySchema), asyncHandler(async (req, res) => {
  if (process.env.NODE_ENV === 'production' && !process.env.COLLAB_SECRET) {
    res.status(503).json({ error: 'Collaboration is not configured for this deployment (COLLAB_SECRET is unset).' });
    return;
  }
  const { room } = req.body as { room: string };
  res.json(issueCollabToken(room));
}));
