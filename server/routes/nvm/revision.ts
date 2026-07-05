// server/routes/nvm/revision.ts — Live Screenplay Memory, the End-Condition
// Detector + Screenplay Compiler, and the 12-pass revision pipeline (sync +
// SSE streaming variants). Split out of the former server/routes/nvm.ts — see
// server/routes/nvm/index.ts for the full module map.
import express from 'express';
import { sanitizeForPrompt } from '../../lib/prompt-utils.ts';
import {
  asyncHandler, sessionId, getOrCreateSession,
  gameLimiter, aiLimiter,
} from '../../lib/session-store.ts';
import { validate, CompileBodySchema, ReviseBodySchema } from '../../lib/validation.ts';

const router = express.Router();
export default router;

// GET /api/nvm/screenplay/memory — Live Screenplay Memory.
router.get('/api/nvm/screenplay/memory', gameLimiter, asyncHandler(async (req, res) => {
  const { stage } = getOrCreateSession(sessionId(req));
  const { buildScreenplayMemory } = await import('../../nvm/screenplay/memory.ts');
  const { analyzeStructure } = await import('../../nvm/screenplay/structure.ts');

  type StoryCommitT = import('../../nvm/state/StoryCommit.ts').StoryCommit;
  const allCommits = (stage.getCommits() as StoryCommitT[]).filter(c => !c.reverted);
  const records = buildScreenplayMemory(allCommits);
  const structure = analyzeStructure(records, allCommits);

  res.json({ records, structure, totalScenes: records.length });
}));

// POST /api/nvm/compile — End-Condition Detector + Screenplay Compiler.
router.post('/api/nvm/compile', gameLimiter, validate(CompileBodySchema), asyncHandler(async (req, res) => {
  const { stage } = getOrCreateSession(sessionId(req));
  const { title = 'UNTITLED' } = req.body as { title?: string };

  const { buildScreenplayMemory } = await import('../../nvm/screenplay/memory.ts');
  const { analyzeStructure } = await import('../../nvm/screenplay/structure.ts');
  const { detectEndCondition } = await import('../../nvm/screenplay/end-condition.ts');
  const { compileScreenplay } = await import('../../nvm/screenplay/compile.ts');
  const { buildNarrativeState, emptyState } = await import('../../nvm/state/NarrativeState.ts');
  const { applyStoryOps } = await import('../../nvm/ops/dispatcher.ts');

  type StoryCommitT = import('../../nvm/state/StoryCommit.ts').StoryCommit;
  const allCommits = (stage.getCommits() as StoryCommitT[]).filter(c => !c.reverted);

  const base = buildNarrativeState(stage);
  let folded = emptyState();
  for (const c of allCommits) folded = applyStoryOps(folded, c.ops);
  const state = { ...base, ...folded, turn: stage.getTurnCount() };

  const records = buildScreenplayMemory(allCommits);
  const structure = analyzeStructure(records, allCommits);
  const endCondition = detectEndCondition(records, structure, allCommits);
  const compiled = compileScreenplay(allCommits, state, records, structure, title);

  res.json({ compiled, endCondition });
}));

// POST /api/nvm/revise — 12-pass revision pipeline.
// aiLimiter: one revise call runs the 14-pass pipeline — up to 14 sequential LLM rewrites.
router.post('/api/nvm/revise', aiLimiter, validate(ReviseBodySchema), asyncHandler(async (req, res) => {
  const { stage } = getOrCreateSession(sessionId(req));
  const { approvedSpans = [], title = 'UNTITLED' } = req.body as { approvedSpans?: unknown[]; title?: string };

  const { buildScreenplayMemory } = await import('../../nvm/screenplay/memory.ts');
  const { analyzeStructure } = await import('../../nvm/screenplay/structure.ts');
  const { compileScreenplay } = await import('../../nvm/screenplay/compile.ts');
  const { runRevisionPipeline } = await import('../../nvm/revision/pipeline.ts');
  const { buildNarrativeState, emptyState } = await import('../../nvm/state/NarrativeState.ts');
  const { applyStoryOps } = await import('../../nvm/ops/dispatcher.ts');

  type StoryCommitT = import('../../nvm/state/StoryCommit.ts').StoryCommit;
  const allCommits = (stage.getCommits() as StoryCommitT[]).filter(c => !c.reverted);

  const base = buildNarrativeState(stage);
  let folded = emptyState();
  for (const c of allCommits) folded = applyStoryOps(folded, c.ops);
  const state = { ...base, ...folded, turn: stage.getTurnCount() };

  const records = buildScreenplayMemory(allCommits);
  const structure = analyzeStructure(records, allCommits);
  const compiled = compileScreenplay(allCommits, state, records, structure, title);

  // approvedSpans validated loosely — we trust the pipeline to ignore malformed spans
  const safeSpans = Array.isArray(approvedSpans) ? approvedSpans as import('../../nvm/revision/passes/types.ts').ApprovedSpan[] : [];

  const illusionCtx = stage.getIllusionState();
  const characterSummary = stage.getAllAgents().slice(0, 6)
    .map(a => {
      const es = a.emotionState;
      const emo = es && es.dominant !== 'neutral' && es.intensity >= 20 ? ` [${es.dominant}]` : '';
      return sanitizeForPrompt(a.name, 60) + emo;
    }).join(', ');
  const storyCtx: import('../../nvm/revision/passes/types.ts').StoryContext = {
    theme: illusionCtx.story_theme ? sanitizeForPrompt(illusionCtx.story_theme, 200) : undefined,
    genre: illusionCtx.story_genre ?? undefined,
    directorStyle: illusionCtx.director_style ?? undefined,
    characters: characterSummary || undefined,
  };

  const revisionResult = await runRevisionPipeline(compiled, records, structure, safeSpans, undefined, storyCtx);
  res.json(revisionResult);
}));

// GET /api/nvm/revise-stream — SSE streaming variant of the revision pipeline.
// aiLimiter: SSE variant of /api/nvm/revise — same up-to-14 LLM rewrites per request.
router.get('/api/nvm/revise-stream', aiLimiter, async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  let disconnected = false;
  let ended = false;
  req.on('close', () => { disconnected = true; });
  req.on('error', () => { disconnected = true; });

  const emitSSE = (data: unknown) => {
    if (!disconnected && !ended) res.write(`data: ${JSON.stringify(data)}\n\n`);
  };
  const ensureEnded = () => {
    if (!ended) { ended = true; res.end(); }
  };

  const rawTitle = req.query?.title;
  const title = typeof rawTitle === 'string' ? sanitizeForPrompt(rawTitle, 256) : 'UNTITLED';
  try {
    const { stage } = getOrCreateSession(sessionId(req));
    const { buildScreenplayMemory } = await import('../../nvm/screenplay/memory.ts');
    const { analyzeStructure } = await import('../../nvm/screenplay/structure.ts');
    const { compileScreenplay } = await import('../../nvm/screenplay/compile.ts');
    const { runRevisionPipeline } = await import('../../nvm/revision/pipeline.ts');
    const { buildNarrativeState, emptyState } = await import('../../nvm/state/NarrativeState.ts');
    const { applyStoryOps } = await import('../../nvm/ops/dispatcher.ts');

    type StoryCommitT = import('../../nvm/state/StoryCommit.ts').StoryCommit;
    const allCommits = (stage.getCommits() as StoryCommitT[]).filter(c => !c.reverted);

    const base = buildNarrativeState(stage);
    let folded = emptyState();
    for (const c of allCommits) folded = applyStoryOps(folded, c.ops);
    const state = { ...base, ...folded, turn: stage.getTurnCount() };

    const records = buildScreenplayMemory(allCommits);
    const structure = analyzeStructure(records, allCommits);
    const compiled = compileScreenplay(allCommits, state, records, structure, title);

    const illusionCtxStream = stage.getIllusionState();
    const characterSummaryStream = stage.getAllAgents().slice(0, 6)
      .map(a => {
        const es = a.emotionState;
        const emo = es && es.dominant !== 'neutral' && es.intensity >= 20 ? ` [${es.dominant}]` : '';
        return sanitizeForPrompt(a.name, 60) + emo;
      }).join(', ');
    const storyCtxStream: import('../../nvm/revision/passes/types.ts').StoryContext = {
      theme: illusionCtxStream.story_theme ? sanitizeForPrompt(illusionCtxStream.story_theme, 200) : undefined,
      genre: illusionCtxStream.story_genre ?? undefined,
      directorStyle: illusionCtxStream.director_style ?? undefined,
      characters: characterSummaryStream || undefined,
    };

    const result = await runRevisionPipeline(compiled, records, structure, [], event => {
      emitSSE(event); // pass_complete event per revision pass
    }, storyCtxStream);
    emitSSE({ type: 'revision_complete', result });
  } catch (err) {
    emitSSE({ type: 'revision_error', error: (err as Error).message });
  } finally {
    ensureEnded();
  }
});
