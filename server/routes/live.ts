import express from 'express';
import { z } from 'zod';
import { logger } from '../lib/logger.ts';
import { aiLimiter } from '../lib/session-store.ts';
import { llmReady } from '../lib/ai-config.ts';
import { parseIntent, proposeStateDelta } from '../nvm/live/intent-parser.ts';

const router = express.Router();

const IntentRequestSchema = z.object({
  userInput: z.string().min(1).max(5000),
});

/**
 * POST /api/live/intent
 * Parses writer intent and returns a state delta proposal.
 */
router.post('/api/live/intent', aiLimiter, async (req, res) => {
  if (!llmReady()) {
    res.status(503).json({ error: 'AI features unavailable in keyless mode (GEMINI_API_KEY unset).' });
    return;
  }

  try {
    const parsedBody = IntentRequestSchema.safeParse(req.body);
    if (!parsedBody.success) {
      res.status(400).json({ error: 'Invalid request body', details: parsedBody.error.format() });
      return;
    }

    const { userInput } = parsedBody.data;

    // Use Intent Parser to classify action risk and effects
    const parsedIntent = await parseIntent(userInput);
    
    // Propose a State Delta Card if required
    const stateDeltaCard = proposeStateDelta(parsedIntent);

    res.json({
      intent: parsedIntent,
      card: stateDeltaCard,
    });
  } catch (error) {
    logger.error('live_intent_route_error', { error: (error as Error).message });
    res.status(503).json({ error: 'AI processing failed' });
  }
});

export default router;
