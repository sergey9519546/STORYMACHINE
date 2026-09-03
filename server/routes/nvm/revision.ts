// server/routes/nvm/revision.ts — Live Screenplay Memory, the End-Condition
// Detector + Screenplay Compiler, and the 12-pass revision pipeline (sync +
// SSE streaming variants). Split out of the former server/routes/nvm.ts — see
// server/routes/nvm/index.ts for the full module map.
import express from 'express';
import { sanitizeForPrompt, sanitizeSingleLine } from '../../lib/prompt-utils.ts';
import {
  asyncHandler, sessionId, getOrCreateSession,
  gameLimiter, aiLimiter,
} from '../../lib/session-store.ts';
import { validate, CompileBodySchema, ReviseBodySchema } from '../../lib/validation.ts';
import { logger } from '../../lib/logger.ts';
// Side-effect import (retrospective #5, 2026-09-03): server/nvm/revision/
// rewrite-llm.ts registers the generative prose rewriter with rewrite.ts at
// module load. This file is the ONLY entrypoint that runs revision passes
// outside runDiagnoseOnly(), so it is the one place that has to wire it — the
// doctor, the calibration corpus builder and the worker pool all short-circuit
// before the rewriter is consulted, which is exactly why the LLM half is no
// longer allowed to sit in doctor.ts's import graph. See rewrite-llm.ts's
// header and tests/core/pure-core-boundary.test.ts.
import '../../nvm/revision/rewrite-llm.ts';

const router = express.Router();
export default router;

/** The title every route below hands to compileScreenplay(), which writes it
 *  verbatim as the compiled Fountain's `Title:` title-page key — a
 *  SINGLE-LINE record. Callers supply it (`title` in the body, `?title=` on the
 *  SSE route), so it is untrusted: before this existed, a newline in it forged
 *  extra title-page keys and whole body lines into the compiled screenplay,
 *  which then travels into the LLM rewrite prompt. sanitizeSingleLine() (not
 *  sanitizeForPrompt(), which deliberately preserves LF for prose) is the
 *  guard; 'UNTITLED' matches compileScreenplay()'s own default for a title
 *  that sanitizes down to nothing. */
function compiledTitle(raw: unknown): string {
  if (typeof raw !== 'string') return 'UNTITLED';
  return sanitizeSingleLine(raw, 256) || 'UNTITLED';
}

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
  const title = compiledTitle((req.body as { title?: unknown }).title);

  const { buildScreenplayMemory } = await import('../../nvm/screenplay/memory.ts');
  const { analyzeStructure } = await import('../../nvm/screenplay/structure.ts');
  const { detectEndCondition } = await import('../../nvm/screenplay/end-condition.ts');
  const { compileScreenplay } = await import('../../nvm/screenplay/compile.ts');
  const { emptyState } = await import('../../nvm/state/NarrativeState.ts');
  const { buildNarrativeState } = await import('../../nvm/state/from-stage.ts');
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
  const { approvedSpans = [] } = req.body as { approvedSpans?: unknown[] };
  const title = compiledTitle((req.body as { title?: unknown }).title);

  const { buildScreenplayMemory } = await import('../../nvm/screenplay/memory.ts');
  const { analyzeStructure } = await import('../../nvm/screenplay/structure.ts');
  const { compileScreenplay } = await import('../../nvm/screenplay/compile.ts');
  const { runRevisionPipeline } = await import('../../nvm/revision/pipeline.ts');
  const { emptyState } = await import('../../nvm/state/NarrativeState.ts');
  const { buildNarrativeState } = await import('../../nvm/state/from-stage.ts');
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
    tone: illusionCtx.story_tone ?? undefined,
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

  const title = compiledTitle(req.query?.title);
  try {
    const { stage } = getOrCreateSession(sessionId(req));
    const { buildScreenplayMemory } = await import('../../nvm/screenplay/memory.ts');
    const { analyzeStructure } = await import('../../nvm/screenplay/structure.ts');
    const { compileScreenplay } = await import('../../nvm/screenplay/compile.ts');
    const { runRevisionPipeline } = await import('../../nvm/revision/pipeline.ts');
    const { emptyState } = await import('../../nvm/state/NarrativeState.ts');
    const { buildNarrativeState } = await import('../../nvm/state/from-stage.ts');
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
      tone: illusionCtxStream.story_tone ?? undefined,
      directorStyle: illusionCtxStream.director_style ?? undefined,
      characters: characterSummaryStream || undefined,
    };

    const result = await runRevisionPipeline(compiled, records, structure, [], event => {
      emitSSE(event); // pass_complete event per revision pass
    }, storyCtxStream);
    emitSSE({ type: 'revision_complete', result });
  } catch (err) {
    // SECURITY (M2/F2): raw error text can leak API keys / internal detail to
    // the browser. Emit a fixed category; log the real detail server-side only.
    logger.error('sse-error', { route: 'nvm-revise', detail: (err as Error).message });
    emitSSE({ type: 'revision_error', error: 'internal_error' });
  } finally {
    ensureEnded();
  }
});
