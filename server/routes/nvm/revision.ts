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
import {
  validate, validateQuery, CompileBodySchema, ReviseBodySchema, ReviseStreamQuerySchema,
} from '../../lib/validation.ts';
import { logger } from '../../lib/logger.ts';
import {
  runWithBudgetContext, withDeadline, aiBudgetEnvNumber, type AiBudgetLimits,
} from '../../lib/ai-budget.ts';
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

// ── AI provider fan-out budget (2026-09-19, revise-deadline lane) ──────────
// server/routes/nvm/converge.ts's CONVERGE_BUDGET is the pattern this mirrors
// (see that file's header for the full coordinator-safety argument). The
// defect this closes: runRevisionPipeline() below makes up to 14 sequential
// provider.generate() calls (one per pass) with NO server-side deadline and
// NO attempt ceiling — a bench run hit a 301s cut that turned out to be
// undici's client-side headersTimeout, not anything the server itself
// enforces; the server never stops on its own. docs/story-generation/
// STORY_BENCH_2026-09-13.md §4c records a LEGITIMATE 405s revision run
// (counterweight), so the default below has to clear that with real
// headroom, not shave it down to "usually enough".
//
// COORDINATOR SAFETY: unlike converge's three routes, neither /api/nvm/revise
// nor /api/nvm/revise-stream goes through withSessionCommand — runRevisionPipeline()
// never writes to Stage/SQLite (it returns a RevisionResult computed purely
// from the compiled screenplay handed to it; nothing here calls
// stage.commit()/appendGhost()/etc.), so there is no SessionCommandCoordinator
// tail that a timed-out-but-still-running operation could race ahead of. The
// non-abandoning runWithBudgetContext()+withDeadline() pair is used anyway,
// matching converge.ts's shape exactly (same response body/code on timeout)
// rather than switching to the abandon-on-timeout withAiBudget() this
// module's own header names as the "reach for by default" primitive for an
// uncoordinated operation — consistency with the sibling route the defect
// report points at is worth more here than the marginal cost of one extra
// background await after a timed-out response.
//
// ATTEMPT-CEILING SEAM (why it is NOT withCountedAttempts() like converge.ts):
// converge.ts counts attempts by wrapping a `generate` FUNCTION REFERENCE the
// route itself constructs and hands into convergeScene() by reference. The
// revision pipeline has no equivalent seam — server/nvm/revision/rewrite-llm.ts
// calls getGenerativeProvider() itself, as a self-registered singleton
// rewriter (see that file's header), so there is no route-constructed
// function to wrap. rewrite-llm.ts is NOT on the scoring path (its own header
// says so, and it is provably unreachable from doctor.ts — the rewriter is
// never consulted inside runDiagnoseOnly()), so it is where the SMALLEST
// change lives: llmRewrite() calls consumeAiAttempt() itself, right before
// its one provider.generate() call, inside the SAME try/catch that already
// treats "no key configured" and "provider threw" as "fall back to the
// unchanged draft for this pass". consumeAiAttempt() is a no-op outside an
// active budget context (server/lib/ai-budget.ts), so this changes nothing
// about llmRewrite() when no budget is running (every existing keyless test).
//
// What this does NOT do: server/nvm/revision/pipeline.ts (scoring path —
// CLAUDE.md, scripts/check-scoring-receipt.mjs: "server/nvm/revision/
// passes/**" is always-scoring and pipeline.ts is in doctor.ts's reachable
// set) is untouched, and its per-pass try/catch (both the sequential loop and
// the diagnose-only fast path) already catches ANY error a pass throws and
// records it as a no-op "Pass skipped due to error" rather than aborting the
// whole pipeline. So once the attempt ceiling is hit, llmRewrite()'s own
// try/catch swallows the AiBudgetExceededError exactly like a missing key —
// remaining passes silently stop reaching the provider (the real, load-
// bearing safety property: total LLM calls per request are bounded) but the
// route still returns a normal 200 RevisionResult rather than a distinct
// budget-exceeded error, because reshaping that per-pass swallow lives in a
// scoring-path file this lane must not touch. The WALL-CLOCK deadline below
// is what gives this route the same "cannot hang forever" guarantee converge
// has; the attempt ceiling is defense-in-depth against runaway cost, not a
// second path to the same shaped error.
const REVISE_BUDGET: AiBudgetLimits = {
  label: 'nvm-revise',
  // 14 passes x up to 2 attempts each (one real call plus one retry/edge
  // case headroom) — see the seam note above for why this is enforced inside
  // rewrite-llm.ts's llmRewrite() rather than via a wrapped generate reference.
  maxAttempts: aiBudgetEnvNumber('AI_BUDGET_REVISE_MAX_ATTEMPTS', 28),
  // 900s: comfortably above the 405s legitimate revision run measured in
  // docs/story-generation/STORY_BENCH_2026-09-13.md §4c, with real headroom
  // rather than shaving the default down to "usually enough".
  timeoutMs: aiBudgetEnvNumber('AI_BUDGET_REVISE_TIMEOUT_MS', 900_000),
};

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
  // validate(ReviseBodySchema) above already rejected a malformed approvedSpans
  // with 400 before this handler runs — it validates but does not replace
  // req.body (see validate()'s own comment in server/lib/validation.ts), so
  // this is still a manual read of the raw body, but the cast is now backed
  // by ApprovedSpanSchema rather than being the caller's word for it.
  const { approvedSpans = [] } = req.body as { approvedSpans?: import('../../nvm/revision/passes/types.ts').ApprovedSpan[] };
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

  // ApprovedSpanSchema (server/lib/validation.ts) already shaped every entry
  // by the time this line runs — this is no longer "trust the pipeline to
  // ignore malformed spans", just a defensive fallback for the case where
  // approvedSpans was omitted entirely (defaulted to [] above).
  const safeSpans = Array.isArray(approvedSpans) ? approvedSpans : [];

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

  // TASK (revise-deadline): coordinator-safe deadline, same shape as
  // converge.ts's routes — see REVISE_BUDGET's comment above for why this
  // route uses that pair even though it has no SessionCommandCoordinator tail
  // of its own.
  // `allCommits` as the 8th argument (2026-09-20, review finding 1): the
  // pipeline re-derives its diagnostics from the draft whenever a pass changes
  // it, and analyzeFountainText()'s structure is analyzeStructure(records, [])
  // — no ledger, so no totalClockPressure. Without the ledger here, one
  // changed byte in pass 1 moved passes 2..14 from the act-3/100%/approaching-
  // climax reading THIS ROUTE just computed on line ~187 down to act 1 / 0% /
  // not approaching. The commits are not a property of the draft, so they stay
  // valid however the text moves. The explicit `false` is
  // forceSequentialForTest, which has to be passed positionally to reach the
  // parameter after it; this route has always taken its default.
  const operation = runWithBudgetContext(
    REVISE_BUDGET,
    () => runRevisionPipeline(compiled, records, structure, safeSpans, undefined, storyCtx, false, allCommits),
  );
  const raced = await withDeadline(operation, REVISE_BUDGET.timeoutMs);
  if (raced.timedOut) {
    res.status(503).json({
      error: 'Revision is taking longer than expected and was stopped to protect the server. Try again, or approve fewer spans.',
      code: 'AI_BUDGET_DEADLINE_EXCEEDED',
    });
    await operation.catch(() => {});
    return;
  }
  // raced.value is the RevisionResult as-is, so `lostApprovedSpans` (indices
  // into the caller's own `approvedSpans`, empty unless a pass edited the
  // locked text out of the draft) and `ambiguousApprovedSpans` (same indexing,
  // empty unless a lock sat on one of several identical copies whose count
  // then changed) reach the client with no reshaping here.
  res.json(raced.value);
}));

// GET /api/nvm/revise-stream — SSE streaming variant of the revision pipeline.
// aiLimiter: SSE variant of /api/nvm/revise — same up-to-14 LLM rewrites per request.
// validateQuery: runs BEFORE headers are flushed, so a malformed sessionId/title
// gets a clean 400 instead of a 200 SSE stream carrying a generic error event —
// see ReviseStreamQuerySchema's and validateQuery's own comments.
router.get('/api/nvm/revise-stream', aiLimiter, validateQuery(ReviseStreamQuerySchema), async (req, res) => {
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

    // TASK (revise-deadline): same coordinator-safe deadline pair as
    // POST /api/nvm/revise above, and the same terminal-error-then-end shape
    // converge-stream uses on a timeout (server/routes/nvm/converge.ts).
    const operation = runWithBudgetContext(
      REVISE_BUDGET,
      // `allCommits` — same ledger-preserving argument as POST /api/nvm/revise
      // above. This route locks no spans (the 4th argument is []), so its
      // result's `lostApprovedSpans` and `ambiguousApprovedSpans` are always
      // empty; the ledger matters here
      // for exactly the same reason it does there.
      () => runRevisionPipeline(compiled, records, structure, [], event => {
        emitSSE(event); // pass_complete event per revision pass
      }, storyCtxStream, false, allCommits),
    );
    const raced = await withDeadline(operation, REVISE_BUDGET.timeoutMs);
    if (raced.timedOut) {
      emitSSE({ type: 'revision_error', error: 'ai_budget_exceeded' });
      // NOT `await`ed, unlike the POST route above and unlike converge.ts's
      // equivalent branches. Those close their response with res.json() FIRST
      // — the client already has its full response by the time they await
      // the abandoned operation, so blocking the handler's own promise on it
      // costs nothing observable. This route's response is a still-open SSE
      // stream: ensureEnded() is what actually closes it, and it only runs
      // once (the outer finally is a no-op the second time). Awaiting
      // `operation` here first would hold res.end() until the underlying
      // provider call itself settles — for a truly hung call (the exact
      // failure this budget exists to bound) that is "never", leaving the
      // client's stream open long after it already received the terminal
      // error event. Ending the stream promptly and letting the abandoned
      // operation settle in the background (still caught, never an unhandled
      // rejection) is what "stopped to protect the server" has to mean for a
      // route whose response IS a long-lived connection.
      operation.catch(() => {});
      ensureEnded();
      return;
    }
    emitSSE({ type: 'revision_complete', result: raced.value });
  } catch (err) {
    // SECURITY (M2/F2): raw error text can leak API keys / internal detail to
    // the browser. Emit a fixed category; log the real detail server-side only.
    logger.error('sse-error', { route: 'nvm-revise', detail: (err as Error).message });
    emitSSE({ type: 'revision_error', error: 'internal_error' });
  } finally {
    ensureEnded();
  }
});
