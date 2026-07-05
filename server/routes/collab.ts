// POST /api/collab/token — mint a short-lived token authorizing a WebSocket
// join to a specific /collab/<room> Yjs room. See server/lib/collab-auth.ts
// for the token scheme and server/collab/yjs-server.ts for verification.
import express from 'express';
import { validate, CollabTokenBodySchema } from '../lib/validation.ts';
import { issueCollabToken } from '../lib/collab-auth.ts';
import { asyncHandler, gameLimiter } from '../lib/session-store.ts';

const router = express.Router();
export default router;

router.post('/api/collab/token', gameLimiter, validate(CollabTokenBodySchema), asyncHandler(async (req, res) => {
  const { room } = req.body as { room: string };
  res.json(issueCollabToken(room));
}));
