import express, { type Request, type Response } from 'express';
import { runSingleCritic, computeRoomConsensus } from '../critics/critics-engine.ts';
import { gameLimiter } from '../lib/session-store.ts';

const router = express.Router();

// Run single critic or full room evaluation
router.post('/api/critics/evaluate', gameLimiter, (req: Request, res: Response) => {
  const { fountain, criticId } = req.body || {};
  if (!fountain || typeof fountain !== 'string') {
    return res.status(400).json({ error: 'Missing fountain script text' });
  }

  if (criticId && typeof criticId === 'string') {
    const single = runSingleCritic(fountain, criticId);
    return res.json({ success: true, result: single });
  }

  // Run full room
  const dialogue = runSingleCritic(fountain, 'dialogue');
  const pacing = runSingleCritic(fountain, 'pacing');
  const brevity = runSingleCritic(fountain, 'brevity');

  const consensus = computeRoomConsensus([dialogue, pacing, brevity]);
  return res.json({ success: true, consensus });
});

// Export Writers' Room notes as plain text / markdown bundle (Item 40)
router.post('/api/critics/export', gameLimiter, (req: Request, res: Response) => {
  const { consensus } = req.body || {};
  if (!consensus) {
    return res.status(400).json({ error: 'Missing consensus data' });
  }

  const markdown = `# Writers' Room Notes Export

**Overall Score**: ${consensus.overallScore}/100
**Critic Agreement Rate**: ${consensus.agreementRate}%

## Summary
${consensus.consensusSummary}

## Category Breakdown
- **Pacing**: ${consensus.categoryScores?.pacing ?? 80}/100
- **Dialogue**: ${consensus.categoryScores?.dialogue ?? 80}/100
- **Brevity**: ${consensus.categoryScores?.brevity ?? 80}/100

## Suggestions & Diffs
${(consensus.critics || []).flatMap((c: any) => c.suggestions || []).map((s: any) => `- **Line ${s.targetLine}**: ${s.rationale}\n  - *Original*: ${s.originalText}\n  - *Proposed*: ${s.proposedText}`).join('\n\n')}
`;

  res.setHeader('Content-Type', 'text/markdown');
  res.setHeader('Content-Disposition', 'attachment; filename="writers-room-notes.md"');
  return res.send(markdown);
});

export default router;
