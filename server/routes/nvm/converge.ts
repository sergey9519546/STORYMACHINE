// server/routes/nvm/converge.ts — the G1 convergence loop: single-scene
// converge (sync + SSE streaming variants) and the multi-scene arc compiler.
// Split out of the former server/routes/nvm.ts — see server/routes/nvm/index.ts
// for the full module map.
import express from 'express';
import { buildStoryBibleSummary } from '../../nvm/bible/index.ts';
import { buildEnrichedState } from '../../nvm/state/enrichedState.ts';
import {
  asyncHandler, sessionId, getOrCreateSession,
  aiLimiter,
} from '../../lib/session-store.ts';
import {
  validate, ConvergeBodySchema, ConvergeArcBodySchema,
} from '../../lib/validation.ts';

const router = express.Router();
export default router;

// POST /api/nvm/converge — run the G1 convergence loop on a scene target.
// aiLimiter (not gameLimiter): each converge call fans out to multiple LLM candidate
// generations — the loose 120/min game limit would allow a cost/quota-exhaustion DoS.
router.post('/api/nvm/converge', aiLimiter, validate(ConvergeBodySchema), asyncHandler(async (req, res) => {
  const { stage } = getOrCreateSession(sessionId(req));
  const { convergeScene } = await import('../../nvm/converge/loop.ts');
  const { makeLLMCandidateGenerator } = await import('../../nvm/generate/llm-generator.ts');
  type SceneTargetT = import('../../nvm/generate/proof-spec.ts').SceneTarget;
  const { target, seed: bodySeed } = req.body as { target: SceneTargetT; seed?: number };
  const state = buildEnrichedState(stage);
  const seed = typeof bodySeed === 'number' ? bodySeed : Date.now();
  const generate = makeLLMCandidateGenerator();

  // G13→G1: if corpus has runs, mine the Director Policy and pass it to the budget.
  let directorPolicy: import('../../nvm/selfplay/mine.ts').DirectorPolicy | undefined;
  const corpusRuns = stage.getCorpusRuns(30);
  if (corpusRuns.length > 0) {
    const { mineCorpus } = await import('../../nvm/selfplay/mine.ts');
    const fakeReport = {
      runs: corpusRuns.map(r => ({
        scenarioId: r.scenario_id, seed: 0, proofPassRate: r.proof_pass_rate,
        meanValuation: r.mean_valuation, score: r.score,
        topOperators: [] as import('../../nvm/converge/operators.ts').MutationOperator[],
        scenes: [], effectiveOperators: [], totalIterations: 0,
      })),
      meanScore: corpusRuns.reduce((s, r) => s + r.score, 0) / corpusRuns.length,
      bestRun: { scenarioId: '', seed: 0, proofPassRate: 0, meanValuation: 0, score: 0, topOperators: [], scenes: [], effectiveOperators: [], totalIterations: 0 },
      worstRun: { scenarioId: '', seed: 0, proofPassRate: 0, meanValuation: 0, score: 0, topOperators: [], scenes: [], effectiveOperators: [], totalIterations: 0 },
      operatorFrequency: {} as Record<import('../../nvm/converge/operators.ts').MutationOperator, number>,
    };
    directorPolicy = mineCorpus(fakeReport).policy;
  }

  const rawBudget = req.body?.budget ?? {};
  const bibleSummary = buildStoryBibleSummary(stage);
  const { analyzeArcCompletion } = await import('../../nvm/quality/arc-tracker.ts');
  const allCommitsForArc = stage.getCommits().filter((c: import('../../nvm/state/StoryCommit.ts').StoryCommit) => !c.reverted);
  const arcReport = analyzeArcCompletion(allCommitsForArc.map((c: import('../../nvm/state/StoryCommit.ts').StoryCommit) => ({ sceneIdx: c.sceneIdx, ops: c.ops })));
  const budget = {
    maxIterations: Math.min(Number(rawBudget.maxIterations ?? 4), 10),
    candidatesPerIteration: Math.min(Number(rawBudget.candidatesPerIteration ?? 2), 5),
    directorPolicy,
    bibleSummary: bibleSummary || undefined,
    openPromises: arcReport.openPromises.length > 0 ? arcReport.openPromises : undefined,
  };
  const result = await convergeScene(state, target, generate, budget, seed);

  // Persist any new ghost commits from convergence into Stage ghost ledger.
  // Wave (Deliverable 1): ghost.composite/tension/quality are populated by
  // convergeScene() at ghosting time — threaded through here so a rejected
  // candidate's scores are available wherever GhostCommit is read. (NOTE:
  // Stage.ghostLedgerAppend's SQLite schema — server/engine/Stage.ts, out of
  // scope for this change — has no columns for these three fields yet, so they
  // will round-trip as undefined until that table gets a migration; this call
  // site is forward-compatible with that follow-up.)
  const { appendGhost } = await import('../../nvm/repro/ghost-ledger.ts');
  for (const ghost of result.ghosts) {
    appendGhost(stage, {
      ghostId: ghost.ir.transitionId,
      parentCommitId: null,
      sceneIdx: ghost.ir.sceneIdx,
      ir: ghost.ir,
      reason: ghost.reason,
      rejectedAt: Date.now(),
      composite: ghost.composite,
      tension: ghost.tension,
      quality: ghost.quality,
    });
  }

  res.json({
    converged: result.converged,
    iterations: result.iterations,
    finalValuation: result.finalValuation,
    finalQuality: result.finalQuality,
    finalComposite: result.finalComposite,
    history: result.history,
    ghostCount: result.ghosts.length,
    ir: result.ir,
    // Deliverable 2 — previously the loop's winner and per-candidate scores were
    // computed and discarded; now the caller gets exactly what it needs to make
    // (and commit) a deliberate selection. `candidates[]` carries each entry's
    // own `ir` so the UI can POST /api/nvm/converge/commit for ANY candidate,
    // not just `winner`.
    winner: result.winner,
    candidates: result.candidates,
    roomTranscript: result.roomTranscript,
  });
}));

// GET /api/nvm/converge-stream — SSE streaming variant of G1 convergence.
// aiLimiter: SSE variant of /api/nvm/converge — same LLM fan-out per request.
router.get('/api/nvm/converge-stream', aiLimiter, async (req, res) => {
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
  const ensureEnded = () => { if (!ended) { ended = true; res.end(); } };

  try {
    const { stage } = getOrCreateSession(sessionId(req));
    const { convergeScene } = await import('../../nvm/converge/loop.ts');
    const { makeLLMCandidateGenerator } = await import('../../nvm/generate/llm-generator.ts');
    const { analyzeArcCompletion } = await import('../../nvm/quality/arc-tracker.ts');

    const q = req.query as Record<string, string>;
    const sceneIdx = Math.max(0, parseInt(q['sceneIdx'] ?? '0', 10) || 0);
    const sceneFunction = (q['sceneFunction'] ?? 'build_tension') as import('../../nvm/generate/proof-spec.ts').SceneTarget['sceneFunction'];
    const tensionTarget = Math.max(0, Math.min(200, parseFloat(q['tensionTarget'] ?? '60') || 60));
    const qualityTarget = Math.max(0, Math.min(100, parseFloat(q['qualityTarget'] ?? '60') || 60));
    const maxIterations = Math.min(10, Math.max(1, parseInt(q['maxIterations'] ?? '4', 10) || 4));
    const candidatesPerIteration = Math.min(5, Math.max(1, parseInt(q['candidatesPerIteration'] ?? '2', 10) || 2));

    const state = buildEnrichedState(stage);
    const generate = makeLLMCandidateGenerator();
    const seed = Date.now();

    let directorPolicy: import('../../nvm/selfplay/mine.ts').DirectorPolicy | undefined;
    const corpusRuns = stage.getCorpusRuns(30);
    if (corpusRuns.length > 0) {
      const { mineCorpus } = await import('../../nvm/selfplay/mine.ts');
      const fakeReport = {
        runs: corpusRuns.map((r: { scenario_id: string; proof_pass_rate: number; mean_valuation: number; score: number }) => ({
          scenarioId: r.scenario_id, seed: 0, proofPassRate: r.proof_pass_rate,
          meanValuation: r.mean_valuation, score: r.score,
          topOperators: [] as import('../../nvm/converge/operators.ts').MutationOperator[],
          scenes: [], effectiveOperators: [], totalIterations: 0,
        })),
        meanScore: corpusRuns.reduce((s: number, r: { score: number }) => s + r.score, 0) / corpusRuns.length,
        bestRun: { scenarioId: '', seed: 0, proofPassRate: 0, meanValuation: 0, score: 0, topOperators: [], scenes: [], effectiveOperators: [], totalIterations: 0 },
        worstRun: { scenarioId: '', seed: 0, proofPassRate: 0, meanValuation: 0, score: 0, topOperators: [], scenes: [], effectiveOperators: [], totalIterations: 0 },
        operatorFrequency: {} as Record<import('../../nvm/converge/operators.ts').MutationOperator, number>,
      };
      directorPolicy = mineCorpus(fakeReport).policy;
    }

    const allCommitsForArc = stage.getCommits().filter((c: import('../../nvm/state/StoryCommit.ts').StoryCommit) => !c.reverted);
    const arcReport = analyzeArcCompletion(allCommitsForArc.map((c: import('../../nvm/state/StoryCommit.ts').StoryCommit) => ({ sceneIdx: c.sceneIdx, ops: c.ops })));
    const bibleSummary = buildStoryBibleSummary(stage);

    const target = { sceneIdx, sceneFunction, activeMechanisms: [], tensionTarget, qualityTarget };
    const budget = {
      maxIterations,
      candidatesPerIteration,
      directorPolicy,
      bibleSummary: bibleSummary || undefined,
      openPromises: arcReport.openPromises.length > 0 ? arcReport.openPromises : undefined,
      onStep: (step: import('../../nvm/converge/loop.ts').ConvergeStep) => {
        // Deliverable 2: per-step events already carried candidateId + the three
        // scores; `step.candidateId` is now the SAME deterministic `c<iter>-<idx>`
        // id used by the final summary's `candidates[]`/`winner` below, so a
        // streaming client can correlate a live step with its eventual outcome.
        emitSSE({
          type: 'converge_step',
          step: {
            iteration: step.iteration,
            candidateId: step.candidateId,
            passed: step.passed,
            valuationScore: step.valuationScore,
            qualityScore: step.qualityScore,
            compositeScore: step.compositeScore,
            ghostReason: step.ghostReason,
            writersRoomSummary: step.writersRoomSummary,
            operator: step.operator,
          },
        });
      },
    };

    const result = await convergeScene(state, target, generate, budget, seed);

    // Persist ghosts — see the matching comment in POST /api/nvm/converge above
    // re: Stage.ts's Ghost_Commits table not yet having composite/tension/quality
    // columns (out of scope here; this call site is forward-compatible).
    const { appendGhost } = await import('../../nvm/repro/ghost-ledger.ts');
    for (const ghost of result.ghosts) {
      appendGhost(stage, {
        ghostId: ghost.ir.transitionId,
        parentCommitId: null,
        sceneIdx: ghost.ir.sceneIdx,
        ir: ghost.ir,
        reason: ghost.reason,
        rejectedAt: Date.now(),
        composite: ghost.composite,
        tension: ghost.tension,
        quality: ghost.quality,
      });
    }

    emitSSE({
      type: 'converge_complete',
      result: {
        converged: result.converged,
        iterations: result.iterations,
        finalValuation: result.finalValuation,
        finalQuality: result.finalQuality,
        finalComposite: result.finalComposite,
        ghostCount: result.ghosts.length,
        // Deliverable 2: the final summary is where a streaming client gets the
        // committable payload — same fields as the non-streaming /api/nvm/converge.
        winner: result.winner,
        candidates: result.candidates,
        roomTranscript: result.roomTranscript,
        history: result.history.map(s => ({
          iteration: s.iteration,
          candidateId: s.candidateId,
          passed: s.passed,
          valuationScore: s.valuationScore,
          qualityScore: s.qualityScore,
          compositeScore: s.compositeScore,
          ghostReason: s.ghostReason,
          writersRoomSummary: s.writersRoomSummary,
        })),
      },
    });
  } catch (err) {
    emitSSE({ type: 'converge_error', error: (err as Error).message });
  } finally {
    ensureEnded();
  }
});

// POST /api/nvm/converge-arc — multi-scene arc compiler.
// aiLimiter: arc convergence runs the LLM converge loop for up to 8 scenes per request.
router.post('/api/nvm/converge-arc', aiLimiter, validate(ConvergeArcBodySchema), asyncHandler(async (req, res) => {
  const { stage } = getOrCreateSession(sessionId(req));
  const { convergeScene } = await import('../../nvm/converge/loop.ts');
  const { applyStoryOps } = await import('../../nvm/ops/dispatcher.ts');
  const { makeLLMCandidateGenerator } = await import('../../nvm/generate/llm-generator.ts');
  const { mineCorpus } = await import('../../nvm/selfplay/mine.ts');
  const { appendGhost } = await import('../../nvm/repro/ghost-ledger.ts');

  type SceneTargetT = import('../../nvm/generate/proof-spec.ts').SceneTarget;
  const { scenes: sceneTargets } = req.body as { scenes: SceneTargetT[] };

  // Mine Director Policy from corpus if available
  let directorPolicy: import('../../nvm/selfplay/mine.ts').DirectorPolicy | undefined;
  const corpusRuns = stage.getCorpusRuns(30);
  if (corpusRuns.length > 0) {
    const fakeReport = {
      runs: corpusRuns.map(r => ({
        scenarioId: r.scenario_id, seed: 0, proofPassRate: r.proof_pass_rate,
        meanValuation: r.mean_valuation, score: r.score,
        topOperators: [] as import('../../nvm/converge/operators.ts').MutationOperator[],
        scenes: [], effectiveOperators: [], totalIterations: 0,
      })),
      meanScore: corpusRuns.reduce((s, r) => s + r.score, 0) / corpusRuns.length,
      bestRun: { scenarioId: '', seed: 0, proofPassRate: 0, meanValuation: 0, score: 0, topOperators: [], scenes: [], effectiveOperators: [], totalIterations: 0 },
      worstRun: { scenarioId: '', seed: 0, proofPassRate: 0, meanValuation: 0, score: 0, topOperators: [], scenes: [], effectiveOperators: [], totalIterations: 0 },
      operatorFrequency: {} as Record<import('../../nvm/converge/operators.ts').MutationOperator, number>,
    };
    directorPolicy = mineCorpus(fakeReport).policy;
  }

  const rawBudgetArc = req.body?.budget ?? {};
  const bibleSummaryArc = buildStoryBibleSummary(stage);
  // Wave 77: compute open promises once upfront for the arc run.
  const { analyzeArcCompletion: analyzeArcForBudget } = await import('../../nvm/quality/arc-tracker.ts');
  const arcCommitsForBudget = stage.getCommits().filter((c: import('../../nvm/state/StoryCommit.ts').StoryCommit) => !c.reverted);
  const arcReportForBudget = analyzeArcForBudget(arcCommitsForBudget.map((c: import('../../nvm/state/StoryCommit.ts').StoryCommit) => ({ sceneIdx: c.sceneIdx, ops: c.ops })));
  const baseBudget = {
    maxIterations: Math.min(Number(rawBudgetArc.maxIterations ?? 3), 10),
    candidatesPerIteration: Math.min(Number(rawBudgetArc.candidatesPerIteration ?? 2), 5),
    bibleSummary: bibleSummaryArc || undefined,
    openPromises: arcReportForBudget.openPromises.length > 0 ? arcReportForBudget.openPromises : undefined,
  };
  const budget = { ...baseBudget, directorPolicy };
  const baseSeed = typeof req.body?.seed === 'number' ? req.body.seed : Date.now();
  const generate = makeLLMCandidateGenerator();

  let rollingState = buildEnrichedState(stage);
  const sceneResults = [];
  let totalComposite = 0;
  let convergedCount = 0;

  for (let i = 0; i < sceneTargets.length; i++) {
    const target = sceneTargets[i];
    const result = await convergeScene(rollingState, target, generate, budget, baseSeed + i * 1000);

    // Persist ghosts — same composite/tension/quality threading as
    // POST /api/nvm/converge above (see that route's comment re: Stage.ts's
    // Ghost_Commits schema not yet having columns for these fields).
    for (const ghost of result.ghosts) {
      appendGhost(stage, {
        ghostId: ghost.ir.transitionId,
        parentCommitId: null,
        sceneIdx: ghost.ir.sceneIdx,
        ir: ghost.ir,
        reason: ghost.reason,
        rejectedAt: Date.now(),
        composite: ghost.composite,
        tension: ghost.tension,
        quality: ghost.quality,
      });
    }

    sceneResults.push({
      sceneIdx: target.sceneIdx,
      converged: result.converged,
      iterations: result.iterations,
      finalValuation: result.finalValuation,
      finalQuality: result.finalQuality,
      finalComposite: result.finalComposite,
      tier3Rank: result.history.length > 0
        ? result.history[result.history.length - 1].tier3Rank
        : 0,
      ghostCount: result.ghosts.length,
      opCount: result.ir.ops.length,
      sceneFunction: result.ir.sceneFunction,
    });

    totalComposite += result.finalComposite;
    if (result.converged) convergedCount++;

    // Advance rolling state with the winning IR
    rollingState = applyStoryOps(rollingState, result.ir.ops);
  }

  const meanComposite = sceneTargets.length > 0 ? totalComposite / sceneTargets.length : 0;
  const arcScore = 0.5 * (convergedCount / sceneTargets.length) + 0.5 * (meanComposite / 100);

  res.json({
    scenes: sceneResults,
    totalScenes: sceneTargets.length,
    convergedCount,
    meanComposite: Math.round(meanComposite * 10) / 10,
    arcScore: Math.round(arcScore * 1000) / 1000,
    usedDirectorPolicy: !!directorPolicy,
  });
}));
