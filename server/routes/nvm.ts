import express from 'express';
import { sanitizeForPrompt } from '../lib/prompt-utils.ts';
import { buildStoryBibleSummary } from '../nvm/bible/index.ts';
import { buildEnrichedState } from '../nvm/state/enrichedState.ts';
import {
  asyncHandler, requireString, safeJsonParse, sessionId, getOrCreateSession,
  gameLimiter,
} from '../lib/session-store.ts';

const router = express.Router();
export default router;

// GET /api/nvm/commits — list all StoryCommits for this session
router.get('/api/nvm/commits', gameLimiter, asyncHandler(async (req, res) => {
  const { stage } = getOrCreateSession(sessionId(req));
  res.json({ commits: stage.getCommits() });
}));

// GET /api/nvm/commits/:commitId — single commit
router.get('/api/nvm/commits/:commitId', gameLimiter, asyncHandler(async (req, res) => {
  const { stage } = getOrCreateSession(sessionId(req));
  const commit = stage.getCommit(req.params.commitId);
  if (!commit) { res.status(404).json({ error: 'commit not found' }); return; }
  res.json(commit);
}));

// GET /api/nvm/ghost-commits — list ghost (rejected) commits, optional ?sceneIdx=
router.get('/api/nvm/ghost-commits', gameLimiter, asyncHandler(async (req, res) => {
  const { stage } = getOrCreateSession(sessionId(req));
  const sceneIdx = req.query.sceneIdx !== undefined ? Number(req.query.sceneIdx) : undefined;
  res.json({ ghosts: stage.ghostLedgerGet(sceneIdx) });
}));

// POST /api/nvm/ghost-commits/branch — promote a ghost to a What-If candidate
router.post('/api/nvm/ghost-commits/branch', gameLimiter, asyncHandler(async (req, res) => {
  const { stage } = getOrCreateSession(sessionId(req));
  const ghostId = requireString(req.body?.ghostId, 'ghostId', 128);
  const ghost = stage.ghostLedgerFind(ghostId);
  if (!ghost) { res.status(404).json({ error: 'ghost not found' }); return; }
  res.json({ ghostId, branchedOps: ghost.ir.ops, sceneIdx: ghost.sceneIdx });
}));

// GET /api/nvm/manifest — build a StoryManifest from the current session
router.get('/api/nvm/manifest', gameLimiter, asyncHandler(async (req, res) => {
  const { stage } = getOrCreateSession(sessionId(req));
  const { manifestFromStage } = await import('../nvm/repro/manifest.ts');
  const { seedFromString } = await import('../nvm/repro/seed.ts');
  const sid = sessionId(req);
  const manifest = manifestFromStage(stage, `manifest_${sid}`, seedFromString(sid), sid);
  res.json(manifest);
}));

// GET /api/debug/explain/:eventId — explain an action as a causal call stack
router.get('/api/debug/explain/:eventId', gameLimiter, asyncHandler(async (req, res) => {
  const { stage } = getOrCreateSession(sessionId(req));
  const { explainAction } = await import('../nvm/debug/inspector.ts');
  const panel = explainAction(stage, req.params.eventId);
  if (!panel) { res.status(404).json({ error: 'event not found' }); return; }
  res.json(panel);
}));

// GET /api/debug/explain-scene/:locationId — explain all events in a scene
router.get('/api/debug/explain-scene/:locationId', gameLimiter, asyncHandler(async (req, res) => {
  const { stage } = getOrCreateSession(sessionId(req));
  const { explainScene } = await import('../nvm/debug/inspector.ts');
  res.json({ panels: explainScene(stage, req.params.locationId) });
}));

// ── NVM valuation routes (Wave 4) ─────────────────────────────────────────

// GET /api/nvm/tension — derive tension ledger from current session state
router.get('/api/nvm/tension', gameLimiter, asyncHandler(async (req, res) => {
  const { stage } = getOrCreateSession(sessionId(req));
  const { deriveTensionLedger } = await import('../nvm/valuation/futures.ts');
  const state = buildEnrichedState(stage);
  const commits = stage.getCommits().filter(c => !c.reverted);
  const sceneIdx = commits.length > 0 ? commits[commits.length - 1].sceneIdx : 0;
  res.json(deriveTensionLedger(state, sceneIdx));
}));

// GET /api/nvm/two-reader — first-watch vs rewatch scores
router.get('/api/nvm/two-reader', gameLimiter, asyncHandler(async (req, res) => {
  const { stage } = getOrCreateSession(sessionId(req));
  const { deriveTensionLedger } = await import('../nvm/valuation/futures.ts');
  const { twoReaderReport } = await import('../nvm/valuation/two-reader.ts');
  const state = buildEnrichedState(stage);
  const commits = stage.getCommits().filter(c => !c.reverted);
  const sceneIdx = commits.length > 0 ? commits[commits.length - 1].sceneIdx : 0;
  const ledger = deriveTensionLedger(state, sceneIdx);
  res.json(twoReaderReport(state, ledger));
}));

// GET /api/nvm/topology — emotional arc topology vs 6 archetypes
router.get('/api/nvm/topology', gameLimiter, asyncHandler(async (req, res) => {
  const { stage } = getOrCreateSession(sessionId(req));
  const { deriveTensionLedger } = await import('../nvm/valuation/futures.ts');
  const { computeTopology } = await import('../nvm/valuation/topology.ts');
  const state = buildEnrichedState(stage);
  const commits = stage.getCommits().filter(c => !c.reverted);
  const ledgers = commits.map((c, i) => deriveTensionLedger(state, c.sceneIdx ?? i));
  res.json(computeTopology(ledgers));
}));

// POST /api/nvm/redteam — red-team a RevealPlan against current audience state
router.post('/api/nvm/redteam', gameLimiter, asyncHandler(async (req, res) => {
  const { stage } = getOrCreateSession(sessionId(req));
  const { redTeamVerdict } = await import('../nvm/valuation/audience-redteam.ts');
  const plan = req.body?.plan;
  if (!plan || typeof plan.revealId !== 'string') {
    res.status(400).json({ error: 'body.plan must be a RevealPlan' }); return;
  }
  const state = buildEnrichedState(stage);
  res.json(redTeamVerdict(plan, state));
}));

// ── Godmode API routes ─────────────────────────────────────────────────────

// POST /api/nvm/quality — run quality engine on a candidate IR
router.post('/api/nvm/quality', gameLimiter, asyncHandler(async (req, res) => {
  const { stage } = getOrCreateSession(sessionId(req));
  const { runQualityEngine } = await import('../nvm/quality/index.ts');
  const ir = req.body?.ir;
  if (!ir || typeof ir !== 'object' || !Array.isArray(ir.ops)) {
    res.status(400).json({ error: 'body.ir must be a NarrativeTransitionIR' }); return;
  }
  const state = buildEnrichedState(stage);
  res.json(runQualityEngine(ir, state));
}));

// GET /api/nvm/project/:target — project current canon to a format
router.get('/api/nvm/project/:target', gameLimiter, asyncHandler(async (req, res) => {
  const { stage } = getOrCreateSession(sessionId(req));
  const { project } = await import('../nvm/project/index.ts');
  const target = req.params.target as Parameters<typeof project>[1];
  const VALID = ['fountain','novel','stage','comic','interactive','pitch','bible','rewatch','cutting_room'];
  if (!VALID.includes(target)) {
    res.status(400).json({ error: `Unknown projection target "${target}". Valid: ${VALID.join(', ')}` }); return;
  }
  const commits = stage.getCommits().filter(c => !c.reverted);
  const state = buildEnrichedState(stage);
  const ghosts = stage.ghostLedgerGet();
  const canon = { commits, state, ghosts };
  res.json(project(canon, target));
}));

// GET /api/nvm/twin/scm — return the current structural causal model as a
// serialisable node list (Map → array) so the UI can render the op DAG.
router.get('/api/nvm/twin/scm', gameLimiter, asyncHandler(async (req, res) => {
  const { stage } = getOrCreateSession(sessionId(req));
  const { buildSCM } = await import('../nvm/twin/scm.ts');
  const scm = buildSCM(stage);
  const nodes = [...scm.nodes.values()].map(n => ({
    opId: n.opId,
    commitId: n.commitId,
    opIdx: n.opIdx,
    op: n.op,
    parents: n.parents,
    children: n.children,
  }));
  res.json({ nodes, order: scm.order, nodeCount: nodes.length });
}));

// POST /api/nvm/twin/do — Pearl's do() causal intervention
router.post('/api/nvm/twin/do', gameLimiter, asyncHandler(async (req, res) => {
  const { stage } = getOrCreateSession(sessionId(req));
  const { buildSCM } = await import('../nvm/twin/scm.ts');
  const { doIntervention } = await import('../nvm/twin/counterfactual.ts');
  const opId = req.body?.opId;
  if (typeof opId !== 'string' || !opId) {
    res.status(400).json({ error: 'body.opId (string) is required' }); return;
  }
  const scm = buildSCM(stage);
  const intervention = { opId, replacement: req.body?.replacement ?? null };
  res.json(doIntervention(scm, intervention));
}));

// POST /api/nvm/author/fixed-points — backward-chain toward a narrative attractor
router.post('/api/nvm/author/fixed-points', gameLimiter, asyncHandler(async (req, res) => {
  const { stage } = getOrCreateSession(sessionId(req));
  const { planToward } = await import('../nvm/author/fixed-points.ts');
  const fps = req.body?.fixedPoints;
  if (!Array.isArray(fps) || fps.length === 0) {
    res.status(400).json({ error: 'body.fixedPoints must be a non-empty array' }); return;
  }
  const state = buildEnrichedState(stage);
  const currentScene = typeof req.body?.currentScene === 'number' ? req.body.currentScene : state.turn;
  const planResult = planToward(state, fps, currentScene);

  // Convert each GoalBias to DramaticPressure and inject into the Stage.
  let pressuresInjected = 0;
  for (let bi = 0; bi < planResult.biases.length; bi++) {
    const bias = planResult.biases[bi];
    const charIds = new Set<string>();
    for (const op of bias.ops) {
      if (op.op === 'UPDATE_BELIEF' || op.op === 'APPRAISE_EMOTION') charIds.add(op.charId);
      else if (op.op === 'SHIFT_RELATIONSHIP') charIds.add(op.pair[0]);
    }
    if (charIds.size === 0) charIds.add('narrator');

    // Map dominant op kind to a pressure type.
    const firstOp = bias.ops[0];
    type PressureType = import('../engine/types.ts').DramaticPressureType;
    let pressureType: PressureType = 'ESCALATE';
    if (firstOp) {
      if (firstOp.op === 'PAYOFF_SETUP' || firstOp.op === 'ADVANCE_THEME_ARGUMENT') pressureType = 'revelation_due';
      else if (firstOp.op === 'SEED_CLUE') pressureType = 'ESCALATE';
      else if (firstOp.op === 'RAISE_CLOCK') pressureType = 'confrontation_imminent';
    }

    for (const charId of charIds) {
      stage.addDramaticPressure({
        pressure_id: `fp-${bi}-${charId}-${Date.now()}`,
        target_char_id: charId,
        trigger_event_id: `goal-bias-${bi}`,
        pressure_type: pressureType,
        intensity: 70,
        bias_hint: `${bias.rationale} [Fixed point: ${bias.fixedPointDescription}]`,
        expires_at_turn: bias.atScene + 2,
        applied: false,
      });
      pressuresInjected++;
    }
  }

  res.json({ ...planResult, pressuresInjected });
}));

// POST /api/nvm/author/backchain — backward-chain a single FixedPoint to a schedule.
router.post('/api/nvm/author/backchain', gameLimiter, asyncHandler(async (req, res) => {
  const { stage } = getOrCreateSession(sessionId(req));
  const { backchain, scheduleToGoalBiases } = await import('../nvm/author/backchain.ts');
  const fp = req.body?.fixedPoint;
  if (!fp || typeof fp.atScene !== 'number') {
    res.status(400).json({ error: 'body.fixedPoint with atScene (number) is required' }); return;
  }
  const state = buildEnrichedState(stage);
  const currentScene = typeof req.body?.currentScene === 'number' ? req.body.currentScene : state.turn;
  const result = backchain(fp, state, currentScene);
  const { sanitizeForPrompt } = await import('../lib/prompt-utils.ts');
  const biases = scheduleToGoalBiases(result, sanitizeForPrompt(fp.description ?? `fixed point @ scene ${fp.atScene}`, 1000));
  res.json({ ...result, biases });
}));

// GET /api/nvm/momentum — narrative momentum score (5th tension signal)
router.get('/api/nvm/momentum', gameLimiter, asyncHandler(async (req, res) => {
  const { stage } = getOrCreateSession(sessionId(req));
  const { momentumScore } = await import('../nvm/valuation/futures.ts');
  const commits = stage.getCommits().filter(c => !c.reverted);
  res.json({ momentumScore: momentumScore(commits), commitCount: commits.length });
}));

// POST /api/nvm/inject-ops — Director's Cut: inject custom StoryOps into the canon.
router.post('/api/nvm/inject-ops', gameLimiter, asyncHandler(async (req, res) => {
  const { stage } = getOrCreateSession(sessionId(req));
  const { applyStoryOps } = await import('../nvm/ops/dispatcher.ts');
  const { stateHash } = await import('../nvm/state/NarrativeState.ts');
  const { summarizeOps } = await import('../nvm/state/StoryCommit.ts');
  const { randomUUID } = await import('node:crypto');
  const { STORY_OP_KINDS } = await import('../nvm/ops/StoryOp.ts');

  const ops = req.body?.ops;
  if (!Array.isArray(ops) || ops.length === 0) {
    res.status(400).json({ error: 'body.ops must be a non-empty StoryOp array' }); return;
  }
  // Validate each op has a known op kind
  for (const op of ops) {
    if (typeof op?.op !== 'string' || !(op.op in STORY_OP_KINDS)) {
      res.status(400).json({ error: `Unknown op kind: "${op?.op ?? '?'}"` }); return;
    }
  }

  const state = buildEnrichedState(stage);
  const commits = stage.getCommits().filter(c => !c.reverted);
  const parentId = commits[commits.length - 1]?.commitId ?? null;
  const sceneIdx = typeof req.body?.sceneIdx === 'number' ? req.body.sceneIdx : state.turn;

  const newState = applyStoryOps(state, ops);
  const commitId = randomUUID();
  stage.appendCommit({
    commitId,
    parentId,
    sceneIdx,
    ops,
    deltaSummary: summarizeOps(ops),
    reverted: false,
    createdAt: Date.now(),
  });

  res.json({
    commitId,
    sceneIdx,
    ops: ops.length,
    newStateHash: stateHash(newState),
    label: req.body?.label ?? 'director_cut',
  });
}));

// POST /api/nvm/converge — run the G1 convergence loop on a scene target.
router.post('/api/nvm/converge', gameLimiter, asyncHandler(async (req, res) => {
  const { stage } = getOrCreateSession(sessionId(req));
  const { convergeScene } = await import('../nvm/converge/loop.ts');
  const { makeLLMCandidateGenerator } = await import('../nvm/generate/llm-generator.ts');
  const target = req.body?.target;
  if (!target || typeof target !== 'object' || typeof target.sceneIdx !== 'number') {
    res.status(400).json({ error: 'body.target must be a SceneTarget with sceneIdx' }); return;
  }
  const state = buildEnrichedState(stage);
  const seed = typeof req.body?.seed === 'number' ? req.body.seed : Date.now();
  const generate = makeLLMCandidateGenerator();

  // G13→G1: if corpus has runs, mine the Director Policy and pass it to the budget.
  let directorPolicy: import('../nvm/selfplay/mine.ts').DirectorPolicy | undefined;
  const corpusRuns = stage.getCorpusRuns(30);
  if (corpusRuns.length > 0) {
    const { mineCorpus } = await import('../nvm/selfplay/mine.ts');
    const fakeReport = {
      runs: corpusRuns.map(r => ({
        scenarioId: r.scenario_id, seed: 0, proofPassRate: r.proof_pass_rate,
        meanValuation: r.mean_valuation, score: r.score,
        topOperators: [] as import('../nvm/converge/operators.ts').MutationOperator[],
        scenes: [], effectiveOperators: [], totalIterations: 0,
      })),
      meanScore: corpusRuns.reduce((s, r) => s + r.score, 0) / corpusRuns.length,
      bestRun: { scenarioId: '', seed: 0, proofPassRate: 0, meanValuation: 0, score: 0, topOperators: [], scenes: [], effectiveOperators: [], totalIterations: 0 },
      worstRun: { scenarioId: '', seed: 0, proofPassRate: 0, meanValuation: 0, score: 0, topOperators: [], scenes: [], effectiveOperators: [], totalIterations: 0 },
      operatorFrequency: {} as Record<import('../nvm/converge/operators.ts').MutationOperator, number>,
    };
    directorPolicy = mineCorpus(fakeReport).policy;
  }

  const rawBudget = req.body?.budget ?? {};
  const bibleSummary = buildStoryBibleSummary(stage);
  const { analyzeArcCompletion } = await import('../nvm/quality/arc-tracker.ts');
  const allCommitsForArc = stage.getCommits().filter((c: import('../nvm/state/StoryCommit.ts').StoryCommit) => !c.reverted);
  const arcReport = analyzeArcCompletion(allCommitsForArc.map((c: import('../nvm/state/StoryCommit.ts').StoryCommit) => ({ sceneIdx: c.sceneIdx, ops: c.ops })));
  const budget = {
    maxIterations: Math.min(Number(rawBudget.maxIterations ?? 4), 10),
    candidatesPerIteration: Math.min(Number(rawBudget.candidatesPerIteration ?? 2), 5),
    directorPolicy,
    bibleSummary: bibleSummary || undefined,
    openPromises: arcReport.openPromises.length > 0 ? arcReport.openPromises : undefined,
  };
  const result = await convergeScene(state, target, generate, budget, seed);

  // Persist any new ghost commits from convergence into Stage ghost ledger
  const { appendGhost } = await import('../nvm/repro/ghost-ledger.ts');
  for (const ghost of result.ghosts) {
    appendGhost(stage, {
      ghostId: ghost.ir.transitionId,
      parentCommitId: null,
      sceneIdx: ghost.ir.sceneIdx,
      ir: ghost.ir,
      reason: ghost.reason,
      rejectedAt: Date.now(),
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
  });
}));

// GET /api/nvm/converge-stream — SSE streaming variant of G1 convergence.
router.get('/api/nvm/converge-stream', gameLimiter, async (req, res) => {
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
    const { convergeScene } = await import('../nvm/converge/loop.ts');
    const { makeLLMCandidateGenerator } = await import('../nvm/generate/llm-generator.ts');
    const { analyzeArcCompletion } = await import('../nvm/quality/arc-tracker.ts');

    const q = req.query as Record<string, string>;
    const sceneIdx = Math.max(0, parseInt(q['sceneIdx'] ?? '0', 10) || 0);
    const sceneFunction = (q['sceneFunction'] ?? 'build_tension') as import('../nvm/generate/proof-spec.ts').SceneTarget['sceneFunction'];
    const tensionTarget = Math.max(0, Math.min(200, parseFloat(q['tensionTarget'] ?? '60') || 60));
    const qualityTarget = Math.max(0, Math.min(100, parseFloat(q['qualityTarget'] ?? '60') || 60));
    const maxIterations = Math.min(10, Math.max(1, parseInt(q['maxIterations'] ?? '4', 10) || 4));
    const candidatesPerIteration = Math.min(5, Math.max(1, parseInt(q['candidatesPerIteration'] ?? '2', 10) || 2));

    const state = buildEnrichedState(stage);
    const generate = makeLLMCandidateGenerator();
    const seed = Date.now();

    let directorPolicy: import('../nvm/selfplay/mine.ts').DirectorPolicy | undefined;
    const corpusRuns = stage.getCorpusRuns(30);
    if (corpusRuns.length > 0) {
      const { mineCorpus } = await import('../nvm/selfplay/mine.ts');
      const fakeReport = {
        runs: corpusRuns.map((r: { scenario_id: string; proof_pass_rate: number; mean_valuation: number; score: number }) => ({
          scenarioId: r.scenario_id, seed: 0, proofPassRate: r.proof_pass_rate,
          meanValuation: r.mean_valuation, score: r.score,
          topOperators: [] as import('../nvm/converge/operators.ts').MutationOperator[],
          scenes: [], effectiveOperators: [], totalIterations: 0,
        })),
        meanScore: corpusRuns.reduce((s: number, r: { score: number }) => s + r.score, 0) / corpusRuns.length,
        bestRun: { scenarioId: '', seed: 0, proofPassRate: 0, meanValuation: 0, score: 0, topOperators: [], scenes: [], effectiveOperators: [], totalIterations: 0 },
        worstRun: { scenarioId: '', seed: 0, proofPassRate: 0, meanValuation: 0, score: 0, topOperators: [], scenes: [], effectiveOperators: [], totalIterations: 0 },
        operatorFrequency: {} as Record<import('../nvm/converge/operators.ts').MutationOperator, number>,
      };
      directorPolicy = mineCorpus(fakeReport).policy;
    }

    const allCommitsForArc = stage.getCommits().filter((c: import('../nvm/state/StoryCommit.ts').StoryCommit) => !c.reverted);
    const arcReport = analyzeArcCompletion(allCommitsForArc.map((c: import('../nvm/state/StoryCommit.ts').StoryCommit) => ({ sceneIdx: c.sceneIdx, ops: c.ops })));
    const bibleSummary = buildStoryBibleSummary(stage);

    const target = { sceneIdx, sceneFunction, activeMechanisms: [], tensionTarget, qualityTarget };
    const budget = {
      maxIterations,
      candidatesPerIteration,
      directorPolicy,
      bibleSummary: bibleSummary || undefined,
      openPromises: arcReport.openPromises.length > 0 ? arcReport.openPromises : undefined,
      onStep: (step: import('../nvm/converge/loop.ts').ConvergeStep) => {
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
          },
        });
      },
    };

    const result = await convergeScene(state, target, generate, budget, seed);

    // Persist ghosts
    const { appendGhost } = await import('../nvm/repro/ghost-ledger.ts');
    for (const ghost of result.ghosts) {
      appendGhost(stage, {
        ghostId: ghost.ir.transitionId,
        parentCommitId: null,
        sceneIdx: ghost.ir.sceneIdx,
        ir: ghost.ir,
        reason: ghost.reason,
        rejectedAt: Date.now(),
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

// GET /api/nvm/corpus — top corpus runs + Director policy
router.get('/api/nvm/corpus', gameLimiter, asyncHandler(async (req, res) => {
  const { stage } = getOrCreateSession(sessionId(req));
  const { mineCorpus } = await import('../nvm/selfplay/mine.ts');
  const limit = typeof req.query['limit'] === 'string' ? parseInt(req.query['limit'], 10) : 20;
  const runs = stage.getCorpusRuns(isNaN(limit) ? 20 : Math.min(limit, 100));
  if (runs.length === 0) {
    res.json({ playbook: null, runs: [], message: 'No corpus runs yet. POST /api/nvm/selfplay to generate.' });
    return;
  }
  // Build a minimal CorpusReport shape for mineCorpus
  const fakeReport = {
    runs: runs.map(r => ({
      scenarioId: r.scenario_id,
      seed: 0,
      proofPassRate: r.proof_pass_rate,
      meanValuation: r.mean_valuation,
      score: r.score,
      topOperators: [] as import('../nvm/converge/operators.ts').MutationOperator[],
      scenes: [],
      effectiveOperators: [],
      totalIterations: 0,
    })),
    meanScore: runs.reduce((s, r) => s + r.score, 0) / runs.length,
    bestRun: runs[0] ? { scenarioId: runs[0].scenario_id, seed: 0, proofPassRate: runs[0].proof_pass_rate, meanValuation: runs[0].mean_valuation, score: runs[0].score, topOperators: [], scenes: [], effectiveOperators: [], totalIterations: 0 } : { scenarioId: '', seed: 0, proofPassRate: 0, meanValuation: 0, score: 0, topOperators: [], scenes: [], effectiveOperators: [], totalIterations: 0 },
    worstRun: runs[runs.length - 1] ? { scenarioId: runs[runs.length - 1].scenario_id, seed: 0, proofPassRate: runs[runs.length - 1].proof_pass_rate, meanValuation: runs[runs.length - 1].mean_valuation, score: runs[runs.length - 1].score, topOperators: [], scenes: [], effectiveOperators: [], totalIterations: 0 } : { scenarioId: '', seed: 0, proofPassRate: 0, meanValuation: 0, score: 0, topOperators: [], scenes: [], effectiveOperators: [], totalIterations: 0 },
    operatorFrequency: {} as Record<import('../nvm/converge/operators.ts').MutationOperator, number>,
  };
  const playbook = mineCorpus(fakeReport);
  res.json({ playbook, runs, runCount: runs.length });
}));

// POST /api/nvm/selfplay — run N headless sims and persist corpus results.
router.post('/api/nvm/selfplay', gameLimiter, asyncHandler(async (req, res) => {
  const { stage } = getOrCreateSession(sessionId(req));
  const { runSelfPlay } = await import('../nvm/selfplay/corpus.ts');
  const { makeLLMCandidateGenerator } = await import('../nvm/generate/llm-generator.ts');
  const { extractGenome } = await import('../nvm/selfplay/genome.ts');
  const scenarios = req.body?.scenarios;
  if (!Array.isArray(scenarios) || scenarios.length === 0) {
    res.status(400).json({ error: 'body.scenarios must be a non-empty array' }); return;
  }
  if (scenarios.length > 5) {
    res.status(400).json({ error: 'Maximum 5 scenarios per HTTP self-play request' }); return;
  }
  const rawMax = req.body?.maxSimulations;
  const maxSimulations = typeof rawMax === 'number' && rawMax > 0 ? Math.min(rawMax, 50) : undefined;
  const rawMaxScenes = req.body?.maxScenesPerScenario;
  const maxScenesPerScenario = typeof rawMaxScenes === 'number' && rawMaxScenes > 0 ? Math.min(rawMaxScenes, 100) : undefined;
  const generate = makeLLMCandidateGenerator();
  const report = await runSelfPlay(scenarios, generate, maxSimulations, maxScenesPerScenario);

  // Persist each run to Stage corpus
  const state = buildEnrichedState(stage);
  const commits = stage.getCommits();
  const ghosts = stage.ghostLedgerGet();
  for (const run of report.runs) {
    const genome = extractGenome({ commits, state, ghosts }, run.scenarioId);
    stage.appendCorpusRun({
      run_id: `${run.scenarioId}-${run.seed}-${Date.now()}`,
      scenario_id: run.scenarioId,
      score: run.score,
      proof_pass_rate: run.proofPassRate,
      mean_valuation: run.meanValuation,
      ops_count: run.scenes.reduce((s, ir) => s + ir.ops.length, 0),
      genome_json: JSON.stringify(genome),
    });
  }

  res.json({
    runs: report.runs.length,
    meanScore: report.meanScore,
    bestScenario: report.bestRun.scenarioId,
    operatorFrequency: report.operatorFrequency,
  });
}));

// GET /api/nvm/genome/current — extract StoryGenome from the active canon.
router.get('/api/nvm/genome/current', gameLimiter, asyncHandler(async (req, res) => {
  const { stage } = getOrCreateSession(sessionId(req));
  const { extractGenome } = await import('../nvm/selfplay/genome.ts');
  const commits = stage.getCommits();
  const state = buildEnrichedState(stage);
  const ghosts = stage.ghostLedgerGet();
  const genome = extractGenome({ commits, state, ghosts }, 'current');
  res.json(genome);
}));

// POST /api/nvm/genome/diff — diff two corpus run genomes.
router.post('/api/nvm/genome/diff', gameLimiter, asyncHandler(async (req, res) => {
  const { stage } = getOrCreateSession(sessionId(req));
  const { diffGenomes } = await import('../nvm/selfplay/genome.ts');
  const { runIdA, runIdB } = req.body ?? {};
  if (typeof runIdA !== 'string' || typeof runIdB !== 'string') {
    res.status(400).json({ error: 'body.runIdA and body.runIdB (strings) are required' }); return;
  }
  const runs = stage.getCorpusRuns(200);
  const runA = runs.find((r: { run_id: string }) => r.run_id === runIdA);
  const runB = runs.find((r: { run_id: string }) => r.run_id === runIdB);
  if (!runA || !runB) {
    res.status(404).json({ error: `Run(s) not found: ${!runA ? runIdA : ''} ${!runB ? runIdB : ''}`.trim() }); return;
  }
  const genomeA = safeJsonParse(runA.genome_json, null);
  const genomeB = safeJsonParse(runB.genome_json, null);
  if (!genomeA || !genomeB) {
    res.status(422).json({ error: 'One or both genome records contain invalid JSON' }); return;
  }
  const diff = diffGenomes(genomeA, genomeB);
  res.json({ diff, genomeA, genomeB });
}));

// POST /api/nvm/genome/breed — breed two corpus run genomes into a seed genome.
router.post('/api/nvm/genome/breed', gameLimiter, asyncHandler(async (req, res) => {
  const { stage } = getOrCreateSession(sessionId(req));
  const { breedGenomes } = await import('../nvm/selfplay/genome.ts');
  const { runIdA, runIdB, newId } = req.body ?? {};
  if (typeof runIdA !== 'string' || typeof runIdB !== 'string') {
    res.status(400).json({ error: 'body.runIdA and body.runIdB (strings) are required' }); return;
  }
  const runs = stage.getCorpusRuns(200);
  const runA = runs.find((r: { run_id: string }) => r.run_id === runIdA);
  const runB = runs.find((r: { run_id: string }) => r.run_id === runIdB);
  if (!runA || !runB) {
    res.status(404).json({ error: 'Run(s) not found' }); return;
  }
  const genomeA = safeJsonParse(runA.genome_json, null);
  const genomeB = safeJsonParse(runB.genome_json, null);
  if (!genomeA || !genomeB) {
    res.status(422).json({ error: 'One or both genome records contain invalid JSON' }); return;
  }
  const bred = breedGenomes(genomeA, genomeB, typeof newId === 'string' ? newId : `bred-${Date.now()}`);
  res.json(bred);
}));

// GET /api/nvm/proof/:commitId — run all 4 proof tiers on a single commit.
router.get('/api/nvm/proof/:commitId', gameLimiter, asyncHandler(async (req, res) => {
  const { stage } = getOrCreateSession(sessionId(req));
  const { runTier1, runTier2, tier2Score, runTier3, tier3Rank, runTier4 } = await import('../nvm/proof/kernel.ts');
  const { repair } = await import('../nvm/proof/repair.ts');
  const { lint } = await import('../nvm/proof/lint.ts');
  const { emptyState } = await import('../nvm/state/NarrativeState.ts');
  const { applyStoryOps } = await import('../nvm/ops/dispatcher.ts');

  const targetId = req.params.commitId;
  const allCommits = stage.getCommits().filter((c: import('../nvm/state/StoryCommit.ts').StoryCommit) => !c.reverted);
  const targetIdx = allCommits.findIndex((c: import('../nvm/state/StoryCommit.ts').StoryCommit) => c.commitId === targetId);
  if (targetIdx === -1) {
    res.status(404).json({ error: `Commit "${targetId}" not found` }); return;
  }
  const commit = allCommits[targetIdx];

  // Replay state up to (not including) this commit
  let rollingState = emptyState();
  for (let i = 0; i < targetIdx; i++) {
    rollingState = applyStoryOps(rollingState, allCommits[i].ops);
  }

  // Build minimal IR shell from commit
  const ir: import('../nvm/ir/NarrativeTransitionIR.ts').NarrativeTransitionIR = {
    transitionId: commit.commitId,
    sceneIdx: commit.sceneIdx,
    sceneFunction: 'advance_plot',
    activeMechanisms: [],
    beforeStateHash: 'inspector',
    ops: commit.ops,
    preconditions: [],
    postconditions: [],
    provenance: { origin: 'model_generated', createdAt: commit.createdAt },
  };

  const t1 = runTier1(ir, rollingState);
  const t2 = runTier2(ir, rollingState);
  const t3 = runTier3(ir, rollingState);
  const t4 = runTier4(ir, rollingState);
  const allFailures = [...t1, ...t2].filter(r => !r.pass);
  const patches = repair(allFailures, rollingState);
  const lintWarnings = lint(ir, rollingState);

  res.json({
    commitId: commit.commitId,
    sceneIdx: commit.sceneIdx,
    opCount: commit.ops.length,
    tier1: t1.map(r => ({ proof: r.proof, pass: r.pass, reason: r.reason, findings: r.findings })),
    tier1Pass: t1.every(r => r.pass),
    tier2: t2.map(r => ({ proof: r.proof, pass: r.pass, reason: r.reason, findings: r.findings })),
    tier2Score: tier2Score(t2),
    tier3: t3.map(r => ({ proof: r.proof, pass: r.pass, reason: r.reason })),
    tier3Rank: tier3Rank(t3),
    tier4: t4.map(r => ({ proof: r.proof, pass: r.pass, reason: r.reason, findings: r.findings })),
    patches,
    lintWarnings,
    patchCount: patches.length,
  });
}));

// POST /api/nvm/repair — run all proof tiers on an IR, return repair patches.
router.post('/api/nvm/repair', gameLimiter, asyncHandler(async (req, res) => {
  const { stage } = getOrCreateSession(sessionId(req));
  const { runTier1, runTier2, runTier4 } = await import('../nvm/proof/kernel.ts');
  const { repair } = await import('../nvm/proof/repair.ts');
  const { lint } = await import('../nvm/proof/lint.ts');
  const ir = req.body?.ir;
  if (!ir || typeof ir !== 'object' || !Array.isArray(ir.ops)) {
    res.status(400).json({ error: 'body.ir must be a NarrativeTransitionIR with ops[]' }); return;
  }
  const state = buildEnrichedState(stage);
  const t1 = runTier1(ir, state);
  const t2 = runTier2(ir, state);
  const t4 = runTier4(ir, state);
  const allFailures = [...t1, ...t2].filter(r => !r.pass);
  const patches = repair(allFailures, state);
  const lintWarnings = lint(ir, state);
  res.json({
    tier1Pass: t1.every(r => r.pass),
    tier1Failures: t1.filter(r => !r.pass).map(r => ({ proof: r.proof, reason: r.reason })),
    tier2Failures: t2.filter(r => !r.pass).map(r => ({ proof: r.proof, reason: r.reason })),
    tier4Advisories: t4.filter(r => !r.pass).map(r => ({ proof: r.proof, reason: r.reason })),
    patches,
    lintWarnings,
    patchCount: patches.length,
  });
}));

// GET /api/nvm/arc-timeline — per-scene stats for all active commits.
router.get('/api/nvm/arc-timeline', gameLimiter, asyncHandler(async (req, res) => {
  const { stage } = getOrCreateSession(sessionId(req));
  const { runTier1, runTier2, tier2Score } = await import('../nvm/proof/kernel.ts');
  const { emptyState } = await import('../nvm/state/NarrativeState.ts');
  const { applyStoryOps } = await import('../nvm/ops/dispatcher.ts');
  const { deriveTensionLedger } = await import('../nvm/valuation/futures.ts');
  const { runQualityEngine } = await import('../nvm/quality/index.ts');
  const commits = stage.getCommits().filter((c: import('../nvm/state/StoryCommit.ts').StoryCommit) => !c.reverted);
  let rollingState = emptyState();

  const scenes = [];
  for (const commit of commits) {
    // Build a minimal IR shell from the StoryCommit (commits store ops, not full IR)
    const ir: import('../nvm/ir/NarrativeTransitionIR.ts').NarrativeTransitionIR = {
      transitionId: commit.commitId,
      sceneIdx: commit.sceneIdx,
      sceneFunction: 'advance_plot',
      activeMechanisms: [],
      beforeStateHash: 'timeline',
      ops: commit.ops,
      preconditions: [],
      postconditions: [],
      provenance: { origin: 'model_generated', createdAt: commit.createdAt },
    };
    const t1 = runTier1(ir, rollingState);
    const t2 = runTier2(ir, rollingState);
    const ledger = deriveTensionLedger(rollingState, commit.sceneIdx);
    const qualityReport = runQualityEngine(ir, rollingState);
    scenes.push({
      sceneIdx: commit.sceneIdx,
      commitId: commit.commitId,
      sceneFunction: ir.sceneFunction,
      t1Pass: t1.every(r => r.pass),
      t1FailCount: t1.filter(r => !r.pass).length,
      t2Score: tier2Score(t2),
      t2FailCount: t2.filter(r => !r.pass).length,
      qualityScore: qualityReport.score,
      tension: ledger.totalTension,
      opCount: commit.ops.length,
      topOps: commit.ops.slice(0, 3).map((o: import('../nvm/ops/StoryOp.ts').StoryOp) => o.op),
      mechanisms: ir.activeMechanisms,
    });
    rollingState = applyStoryOps(rollingState, commit.ops);
  }

  res.json({ scenes, sceneCount: scenes.length });
}));

// POST /api/nvm/converge-arc — multi-scene arc compiler.
router.post('/api/nvm/converge-arc', gameLimiter, asyncHandler(async (req, res) => {
  const { stage } = getOrCreateSession(sessionId(req));
  const { convergeScene } = await import('../nvm/converge/loop.ts');
  const { applyStoryOps } = await import('../nvm/ops/dispatcher.ts');
  const { makeLLMCandidateGenerator } = await import('../nvm/generate/llm-generator.ts');
  const { mineCorpus } = await import('../nvm/selfplay/mine.ts');
  const { appendGhost } = await import('../nvm/repro/ghost-ledger.ts');

  const sceneTargets = req.body?.scenes;
  if (!Array.isArray(sceneTargets) || sceneTargets.length === 0) {
    res.status(400).json({ error: 'body.scenes must be a non-empty array of SceneTarget' }); return;
  }
  if (sceneTargets.length > 8) {
    res.status(400).json({ error: 'Maximum 8 scenes per arc compilation' }); return;
  }

  // Mine Director Policy from corpus if available
  let directorPolicy: import('../nvm/selfplay/mine.ts').DirectorPolicy | undefined;
  const corpusRuns = stage.getCorpusRuns(30);
  if (corpusRuns.length > 0) {
    const fakeReport = {
      runs: corpusRuns.map(r => ({
        scenarioId: r.scenario_id, seed: 0, proofPassRate: r.proof_pass_rate,
        meanValuation: r.mean_valuation, score: r.score,
        topOperators: [] as import('../nvm/converge/operators.ts').MutationOperator[],
        scenes: [], effectiveOperators: [], totalIterations: 0,
      })),
      meanScore: corpusRuns.reduce((s, r) => s + r.score, 0) / corpusRuns.length,
      bestRun: { scenarioId: '', seed: 0, proofPassRate: 0, meanValuation: 0, score: 0, topOperators: [], scenes: [], effectiveOperators: [], totalIterations: 0 },
      worstRun: { scenarioId: '', seed: 0, proofPassRate: 0, meanValuation: 0, score: 0, topOperators: [], scenes: [], effectiveOperators: [], totalIterations: 0 },
      operatorFrequency: {} as Record<import('../nvm/converge/operators.ts').MutationOperator, number>,
    };
    directorPolicy = mineCorpus(fakeReport).policy;
  }

  const rawBudgetArc = req.body?.budget ?? {};
  const bibleSummaryArc = buildStoryBibleSummary(stage);
  // Wave 77: compute open promises once upfront for the arc run.
  const { analyzeArcCompletion: analyzeArcForBudget } = await import('../nvm/quality/arc-tracker.ts');
  const arcCommitsForBudget = stage.getCommits().filter((c: import('../nvm/state/StoryCommit.ts').StoryCommit) => !c.reverted);
  const arcReportForBudget = analyzeArcForBudget(arcCommitsForBudget.map((c: import('../nvm/state/StoryCommit.ts').StoryCommit) => ({ sceneIdx: c.sceneIdx, ops: c.ops })));
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

    // Persist ghosts
    for (const ghost of result.ghosts) {
      appendGhost(stage, {
        ghostId: ghost.ir.transitionId,
        parentCommitId: null,
        sceneIdx: ghost.ir.sceneIdx,
        ir: ghost.ir,
        reason: ghost.reason,
        rejectedAt: Date.now(),
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

// GET /api/nvm/sidecar — export current session as NVM sidecar JSON
router.get('/api/nvm/sidecar', gameLimiter, asyncHandler(async (req, res) => {
  const { stage } = getOrCreateSession(sessionId(req));
  const { buildSidecar } = await import('../nvm/project/sidecar.ts');
  const commits = stage.getCommits();
  const state = buildEnrichedState(stage);
  const ghosts = stage.ghostLedgerGet();
  const sidecar = buildSidecar({ commits, state, ghosts });
  res.setHeader('Content-Disposition', 'attachment; filename="story.nvm.json"');
  res.json(sidecar);
}));

// GET /api/nvm/quality/scene/:commitId — run quality engine on a committed scene.
router.get('/api/nvm/quality/scene/:commitId', gameLimiter, asyncHandler(async (req, res) => {
  const { stage } = getOrCreateSession(sessionId(req));
  const { runQualityEngine } = await import('../nvm/quality/index.ts');
  const { emptyState } = await import('../nvm/state/NarrativeState.ts');
  const { applyStoryOps } = await import('../nvm/ops/dispatcher.ts');

  const targetId = req.params.commitId;
  const allCommits = stage.getCommits().filter(
    (c: import('../nvm/state/StoryCommit.ts').StoryCommit) => !c.reverted,
  );
  const targetIdx = allCommits.findIndex(
    (c: import('../nvm/state/StoryCommit.ts').StoryCommit) => c.commitId === targetId,
  );
  if (targetIdx === -1) {
    res.status(404).json({ error: `Commit "${targetId}" not found` }); return;
  }
  const commit = allCommits[targetIdx];

  let rollingState = emptyState();
  for (let i = 0; i < targetIdx; i++) {
    rollingState = applyStoryOps(rollingState, allCommits[i].ops);
  }

  const ir: import('../nvm/ir/NarrativeTransitionIR.ts').NarrativeTransitionIR = {
    transitionId: commit.commitId,
    sceneIdx: commit.sceneIdx,
    sceneFunction: 'advance_plot',
    activeMechanisms: [],
    beforeStateHash: 'quality-inspector',
    ops: commit.ops,
    preconditions: [],
    postconditions: [],
    provenance: { origin: 'model_generated', createdAt: commit.createdAt },
  };

  const report = runQualityEngine(ir, rollingState);
  res.json({ commitId: commit.commitId, sceneIdx: commit.sceneIdx, opCount: commit.ops.length, ...report });
}));

// GET /api/nvm/epistemic — current epistemic state
router.get('/api/nvm/epistemic', gameLimiter, asyncHandler(async (req, res) => {
  const { stage } = getOrCreateSession(sessionId(req));
  const state = buildEnrichedState(stage);

  // Flatten all character beliefs into a unified belief map
  const beliefs: Array<{ charId: string; beliefId: string; proposition: string; confidence: number; source: string }> = [];
  for (const [charId, blist] of Object.entries(state.characterBeliefs)) {
    for (const b of blist) {
      beliefs.push({ charId, beliefId: b.id, proposition: b.proposition, confidence: b.confidence, source: b.source });
    }
  }

  // Infer meta-layers
  const metaLayers: Array<{ holderId: string; targetId: string; proposition: string; confidence: number; depth: number; basis: string }> = [];
  for (const { charId, proposition, confidence } of beliefs.filter(b => b.source === 'told')) {
    const sharers = beliefs.filter(b => b.charId !== charId && b.proposition === proposition);
    for (const sharer of sharers) {
      metaLayers.push({
        holderId: charId,
        targetId: sharer.charId,
        proposition,
        confidence: Math.round(confidence * 0.8 * 100) / 100,
        depth: 2,
        basis: 'told-cross-reference',
      });
    }
  }

  // Dramatic irony: propositions where chars hold divergent beliefs (confidence diff > 0.4)
  const ironyPairs: Array<{ charA: string; charB: string; proposition: string; confA: number; confB: number }> = [];
  const propMap = new Map<string, Array<{ charId: string; confidence: number }>>();
  for (const { charId, proposition, confidence } of beliefs) {
    const list = propMap.get(proposition) ?? [];
    list.push({ charId, confidence });
    propMap.set(proposition, list);
  }
  for (const [proposition, holders] of propMap) {
    for (let i = 0; i < holders.length; i++) {
      for (let j = i + 1; j < holders.length; j++) {
        const diff = Math.abs(holders[i].confidence - holders[j].confidence);
        if (diff >= 0.4) {
          ironyPairs.push({
            charA: holders[i].charId,
            charB: holders[j].charId,
            proposition,
            confA: holders[i].confidence,
            confB: holders[j].confidence,
          });
        }
      }
    }
  }

  res.json({
    characters: Object.keys(state.characterBeliefs),
    totalBeliefs: beliefs.length,
    beliefs,
    metaLayers,
    ironyPairs,
    clueCount: state.clues.length,
    payoffCount: state.payoffs.length,
    suspense: state.audienceState.suspense,
  });
}));

// GET /api/nvm/health — unified story health dashboard.
router.get('/api/nvm/health', gameLimiter, asyncHandler(async (req, res) => {
  const { stage } = getOrCreateSession(sessionId(req));
  const { emptyState } = await import('../nvm/state/NarrativeState.ts');
  const { deriveTensionLedger, momentumScore } = await import('../nvm/valuation/futures.ts');
  const { computeTopology } = await import('../nvm/valuation/topology.ts');
  const { analyzeArcCompletion } = await import('../nvm/quality/arc-tracker.ts');
  const { runTier1, runTier2, tier2Score } = await import('../nvm/proof/kernel.ts');
  const { applyStoryOps } = await import('../nvm/ops/dispatcher.ts');

  const state = buildEnrichedState(stage);
  const allCommits = stage.getCommits().filter((c: import('../nvm/state/StoryCommit.ts').StoryCommit) => !c.reverted);
  const commitCount = allCommits.length;
  const sceneIdx = commitCount > 0 ? allCommits[commitCount - 1].sceneIdx : 0;

  // Tension
  const currentLedger = deriveTensionLedger(state, sceneIdx);
  const ledgers = allCommits.map((c: import('../nvm/state/StoryCommit.ts').StoryCommit, i: number) => deriveTensionLedger(state, c.sceneIdx ?? i));
  const tensionHistory = ledgers.map(l => l.totalTension);

  // Topology
  const topology = computeTopology(ledgers);

  // Arc completion
  const arcReport = analyzeArcCompletion(allCommits.map((c: import('../nvm/state/StoryCommit.ts').StoryCommit) => ({ sceneIdx: c.sceneIdx, ops: c.ops })));

  // Epistemic summary
  const totalBeliefs = Object.values(state.characterBeliefs).flat().length;
  const characterCount = Object.keys(state.characterBeliefs).length;

  // Proof pass rate over all committed scenes (using rolling state)
  let t1PassCount = 0;
  let totalQuality = 0;
  let rollingState = emptyState();
  for (const commit of allCommits) {
    const ir: import('../nvm/ir/NarrativeTransitionIR.ts').NarrativeTransitionIR = {
      transitionId: commit.commitId, sceneIdx: commit.sceneIdx, sceneFunction: 'advance_plot',
      activeMechanisms: [], beforeStateHash: 'health', ops: commit.ops,
      preconditions: [], postconditions: [],
      provenance: { origin: 'model_generated', createdAt: commit.createdAt },
    };
    const t1 = runTier1(ir, rollingState);
    const t2 = runTier2(ir, rollingState);
    if (t1.every(r => r.pass)) t1PassCount++;
    totalQuality += tier2Score(t2);
    rollingState = applyStoryOps(rollingState, commit.ops);
  }
  const proofPassRate = commitCount > 0 ? Math.round((t1PassCount / commitCount) * 100) : 100;
  const avgQuality = commitCount > 0 ? Math.round(totalQuality / commitCount) : 0;

  // Momentum (momentumScore expects StoryCommit[], not TensionLedger[])
  const momentum = momentumScore(allCommits);

  res.json({
    commitCount,
    sceneCount: sceneIdx + (commitCount > 0 ? 1 : 0),
    currentTension: currentLedger.totalTension,
    tensionHistory,
    momentum,
    topology: {
      dominantArc: topology.dominantArc,
      coherence: topology.coherence,
      scores: topology.scores.slice(0, 3),
    },
    arcCompletion: {
      openCount: arcReport.openPromises.length,
      overdueCount: arcReport.overdueCount,
      resolvedCount: arcReport.resolvedCount,
      debtScore: arcReport.debtScore,
      mostUrgent: arcReport.openPromises.slice(0, 3).map(p => ({ kind: p.kind, description: p.description, urgency: p.urgency })),
    },
    epistemic: {
      characterCount,
      totalBeliefs,
      suspense: state.audienceState.suspense,
      clueCount: state.clues.length,
      payoffCount: state.payoffs.length,
    },
    proof: {
      passRate: proofPassRate,
      avgQualityScore: avgQuality,
    },
  });
}));

// GET /api/nvm/character-arc — per-character per-scene breakdown.
router.get('/api/nvm/character-arc', gameLimiter, asyncHandler(async (req, res) => {
  const { stage } = getOrCreateSession(sessionId(req));
  const { emptyState, relationshipKey } = await import('../nvm/state/NarrativeState.ts');
  const { applyStoryOps } = await import('../nvm/ops/dispatcher.ts');

  const allCommits = stage.getCommits().filter(
    (c: import('../nvm/state/StoryCommit.ts').StoryCommit) => !c.reverted,
  );

  // Per-character timeline
  const arcs: Record<string, Array<{
    sceneIdx: number;
    beliefCount: number;
    avgConfidence: number;
    dominantEmotion: string;
    emotionIntensity: number;
    netRelationshipScore: number;
    agencyCount: number;    // ops in this scene that reference this char
  }>> = {};

  let rollingState = emptyState();

  for (const commit of allCommits) {
    // Apply this commit's ops to get post-scene state
    const afterState = applyStoryOps(rollingState, commit.ops);

    // Find all chars referenced in this commit's ops
    const charsInScene = new Set<string>();
    for (const op of commit.ops) {
      if ('charId' in op) charsInScene.add((op as { charId: string }).charId);
      if ('pair' in op) {
        const pair = (op as { pair: [string, string] }).pair;
        charsInScene.add(pair[0]);
        charsInScene.add(pair[1]);
      }
    }

    // Also include any char already tracked in prior arcs
    for (const charId of Object.keys(arcs)) charsInScene.add(charId);

    for (const charId of charsInScene) {
      const beliefs = afterState.characterBeliefs[charId] ?? [];
      const emotion = afterState.characterEmotions[charId];
      const avgConf = beliefs.length > 0
        ? Math.round(beliefs.reduce((s, b) => s + b.confidence, 0) / beliefs.length * 100) / 100
        : 0;

      // Net relationship score: sum of all relationship deltas for this char
      let netRel = 0;
      for (const [key, deltas] of Object.entries(afterState.relationships)) {
        if (key.includes(charId)) {
          netRel += deltas.reduce((s, d) => s + d.amount, 0);
        }
      }

      // Agency: ops in this commit that reference this char
      const agencyCount = commit.ops.filter(op => {
        if ('charId' in op && (op as { charId: string }).charId === charId) return true;
        if ('pair' in op) {
          const pair = (op as { pair: [string, string] }).pair;
          return pair[0] === charId || pair[1] === charId;
        }
        return false;
      }).length;

      if (!arcs[charId]) arcs[charId] = [];
      arcs[charId].push({
        sceneIdx: commit.sceneIdx,
        beliefCount: beliefs.length,
        avgConfidence: avgConf,
        dominantEmotion: emotion?.dominant ?? 'none',
        emotionIntensity: emotion?.intensity ?? 0,
        netRelationshipScore: Math.round(netRel * 100) / 100,
        agencyCount,
      });
    }

    rollingState = afterState;
  }

  // Summarize across all scenes: belief trajectory, emotional range, peak agency
  const characters = Object.entries(arcs).map(([charId, scenes]) => ({
    charId,
    scenes,
    totalScenes: scenes.length,
    peakBeliefs: Math.max(...scenes.map(s => s.beliefCount), 0),
    peakIntensity: Math.max(...scenes.map(s => s.emotionIntensity), 0),
    dominantEmotions: [...new Set(scenes.map(s => s.dominantEmotion).filter(e => e !== 'none'))],
    totalAgency: scenes.reduce((s, sc) => s + sc.agencyCount, 0),
  }));

  // Sort by total agency descending (most active characters first)
  characters.sort((a, b) => b.totalAgency - a.totalAgency);
  res.json({ characters, totalScenes: allCommits.length });
}));

// GET /api/nvm/arc-completion — open narrative promise tracker.
router.get('/api/nvm/arc-completion', gameLimiter, asyncHandler(async (req, res) => {
  const { stage } = getOrCreateSession(sessionId(req));
  const { analyzeArcCompletion } = await import('../nvm/quality/arc-tracker.ts');
  const allCommits = stage.getCommits().filter(
    (c: import('../nvm/state/StoryCommit.ts').StoryCommit) => !c.reverted,
  );
  const scenes = allCommits.map(
    (c: import('../nvm/state/StoryCommit.ts').StoryCommit) => ({ sceneIdx: c.sceneIdx, ops: c.ops }),
  );
  res.json(analyzeArcCompletion(scenes));
}));

// GET /api/nvm/regression — narrative regression suite.
router.get('/api/nvm/regression', gameLimiter, asyncHandler(async (req, res) => {
  const { stage } = getOrCreateSession(sessionId(req));
  const { runNarrativeRegression } = await import('../nvm/regression/runner.ts');
  const allCommits = stage.getCommits();
  res.json(runNarrativeRegression(allCommits));
}));

// GET /api/nvm/momentum-dashboard — full narrative momentum dashboard.
router.get('/api/nvm/momentum-dashboard', gameLimiter, asyncHandler(async (req, res) => {
  const { stage } = getOrCreateSession(sessionId(req));
  const { runQualityEngine } = await import('../nvm/quality/index.ts');
  const { runNarrativeRegression } = await import('../nvm/regression/runner.ts');
  const { emptyState, applyStoryOps } = await import('../nvm/ops/dispatcher.ts').then(async d => ({
    ...(await import('../nvm/state/NarrativeState.ts')),
    applyStoryOps: d.applyStoryOps,
  }));
  const { runTier1, tier1Passes } = await import('../nvm/proof/kernel.ts');
  const { deriveTensionLedger } = await import('../nvm/valuation/futures.ts');
  type StoryCommit = import('../nvm/state/StoryCommit.ts').StoryCommit;
  type NarrativeTransitionIR = import('../nvm/ir/NarrativeTransitionIR.ts').NarrativeTransitionIR;

  const allCommits = (stage.getCommits() as StoryCommit[]).filter(c => !c.reverted);
  const points: Array<{
    sceneIdx: number; commitId: string; opCount: number;
    qualityScore: number; qualityWarnings: number;
    regressionScore: number; regressionGrade: string;
    tensionTotal: number; proofPassRate: number;
  }> = [];

  let rollingState = emptyState();
  for (let i = 0; i < allCommits.length; i++) {
    const commit = allCommits[i];
    const ir: NarrativeTransitionIR = {
      transitionId: commit.commitId, sceneIdx: commit.sceneIdx,
      sceneFunction: 'advance_plot', activeMechanisms: [],
      beforeStateHash: 'momentum', ops: commit.ops,
      preconditions: [], postconditions: [],
      provenance: { origin: 'model_generated', createdAt: commit.createdAt },
    };

    const qReport = runQualityEngine(ir, rollingState);
    const tier1Results = runTier1(ir, rollingState);
    const passCount = tier1Results.filter((r: import('../nvm/proof/contract.ts').ProofResult) => r.pass).length;
    const proofPassRate = tier1Results.length === 0 ? 1 : passCount / tier1Results.length;

    // Advance state then measure tension (tension depends on full context)
    rollingState = applyStoryOps(rollingState, commit.ops);
    const ledger = deriveTensionLedger(rollingState, commit.sceneIdx);

    // Regression runs on all commits up to and including this one
    const rReport = runNarrativeRegression(allCommits.slice(0, i + 1));

    points.push({
      sceneIdx: commit.sceneIdx,
      commitId: commit.commitId,
      opCount: commit.ops.length,
      qualityScore: qReport.score,
      qualityWarnings: qReport.warnings.length,
      regressionScore: rReport.score,
      regressionGrade: rReport.grade,
      tensionTotal: Math.round(ledger.totalTension * 100) / 100,
      proofPassRate: Math.round(proofPassRate * 100),
    });
  }

  res.json({ points, totalScenes: allCommits.length });
}));

// GET /api/nvm/voice-dna — Voice DNA Analyzer.
router.get('/api/nvm/voice-dna', gameLimiter, asyncHandler(async (req, res) => {
  const { stage } = getOrCreateSession(sessionId(req));
  type StoryCommit = import('../nvm/state/StoryCommit.ts').StoryCommit;
  const allCommits = (stage.getCommits() as StoryCommit[]).filter(c => !c.reverted);

  // Build per-character word frequency maps from proposition vocabulary
  const charWords = new Map<string, Map<string, number>>(); // charId → word → count
  const charEmotions = new Map<string, Map<string, number>>(); // charId → emotion → count
  let beliefOpCount = 0;

  for (const commit of allCommits) {
    for (const op of commit.ops) {
      if (op.op === 'UPDATE_BELIEF') {
        beliefOpCount++;
        const words = op.belief.proposition.toLowerCase().split(/\W+/).filter((w: string) => w.length > 3);
        const existing = charWords.get(op.charId) ?? new Map<string, number>();
        for (const w of words) existing.set(w, (existing.get(w) ?? 0) + 1);
        charWords.set(op.charId, existing);
      }
      if (op.op === 'APPRAISE_EMOTION') {
        const existing = charEmotions.get(op.charId) ?? new Map<string, number>();
        const dom = op.emotion.dominant ?? 'none';
        existing.set(dom, (existing.get(dom) ?? 0) + 1);
        charEmotions.set(op.charId, existing);
      }
    }
  }

  const characters = [...charWords.keys()];

  // Pairwise Jaccard similarity
  type SimPair = { a: string; b: string; similarity: number; sharedWords: string[] };
  const pairs: SimPair[] = [];
  for (let i = 0; i < characters.length; i++) {
    for (let j = i + 1; j < characters.length; j++) {
      const a = characters[i], b = characters[j];
      const setA = new Set(charWords.get(a)!.keys());
      const setB = new Set(charWords.get(b)!.keys());
      const shared = [...setA].filter(w => setB.has(w));
      const union = new Set([...setA, ...setB]).size;
      const sim = union > 0 ? shared.length / union : 0;
      pairs.push({ a, b, similarity: Math.round(sim * 100) / 100, sharedWords: shared.slice(0, 8) });
    }
  }
  pairs.sort((a, b) => b.similarity - a.similarity);

  // Signature words: words unique to this character (not in any other char's vocab)
  const allOtherWords = (charId: string): Set<string> => {
    const s = new Set<string>();
    for (const [id, words] of charWords) {
      if (id !== charId) for (const w of words.keys()) s.add(w);
    }
    return s;
  };

  type CharFingerprint = {
    charId: string;
    vocabSize: number;
    signatureWords: string[];
    dominantEmotion: string;
    emotionRange: number;
    beliefCount: number;
  };
  const fingerprints: CharFingerprint[] = characters.map(charId => {
    const words = charWords.get(charId)!;
    const others = allOtherWords(charId);
    const sigs = [...words.entries()]
      .filter(([w]) => !others.has(w))
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([w]) => w);
    const emos = charEmotions.get(charId);
    let domEmo = 'none', maxCount = 0;
    if (emos) for (const [e, c] of emos) { if (c > maxCount) { maxCount = c; domEmo = e; } }
    const emoRange = emos ? emos.size : 0;
    const beliefCount = [...words.values()].reduce((s, c) => s + c, 0);
    return { charId, vocabSize: words.size, signatureWords: sigs, dominantEmotion: domEmo, emotionRange: emoRange, beliefCount };
  });
  fingerprints.sort((a, b) => b.vocabSize - a.vocabSize);

  // Global diversity score (avg pairwise Jaccard distance, 0=all same, 100=all distinct)
  const avgSim = pairs.length > 0 ? pairs.reduce((s, p) => s + p.similarity, 0) / pairs.length : 0;
  const diversityScore = Math.round((1 - avgSim) * 100);

  // "Acoustic twins" = pairs with similarity >= 0.35
  const acousticTwins = pairs.filter(p => p.similarity >= 0.35);

  res.json({
    characters,
    fingerprints,
    pairs,
    acousticTwins,
    diversityScore,
    totalBeliefOps: beliefOpCount,
    totalScenes: allCommits.length,
  });
}));

// POST /api/nvm/live/move — Author-Presence Move Bus.
router.post('/api/nvm/live/move', gameLimiter, asyncHandler(async (req, res) => {
  const { stage } = getOrCreateSession(sessionId(req));
  const { text, sceneIdx: bodySceneIdx } = req.body as { text?: string; sceneIdx?: number };
  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    res.status(400).json({ error: 'text is required' });
    return;
  }

  const { parseAuthorMove, buildAuthorCommit } = await import('../nvm/live/move-bus.ts');
  const { buildNarrativeState, emptyState } = await import('../nvm/state/NarrativeState.ts');
  const { applyStoryOps } = await import('../nvm/ops/dispatcher.ts');

  type StoryCommitT = import('../nvm/state/StoryCommit.ts').StoryCommit;
  const allCommits = (stage.getCommits() as StoryCommitT[]).filter(c => !c.reverted);

  // Fold committed ops into state for accurate proof-gate evaluation
  const baseState = buildNarrativeState(stage);
  let foldedState = emptyState();
  for (const c of allCommits) foldedState = applyStoryOps(foldedState, c.ops);
  const beforeState = { ...baseState, ...foldedState, turn: stage.getTurnCount() };

  const rawSceneIdx = typeof bodySceneIdx === 'number' && Number.isFinite(bodySceneIdx) && bodySceneIdx >= 0
    ? Math.floor(bodySceneIdx)
    : null;
  const sceneIdx = rawSceneIdx ?? (allCommits[allCommits.length - 1]?.sceneIdx ?? 0) + 1;

  // C1: strip control characters and cap length before parsing
  const move = parseAuthorMove(sanitizeForPrompt(text.trim(), 2000), beforeState, { sceneIdx });

  // C2: Structural validation of the parsed move before building a StoryCommit.
  const VALID_OP_KINDS = new Set([
    'ADD_FACT', 'EXPIRE_FACT', 'UPDATE_BELIEF', 'APPRAISE_EMOTION',
    'SHIFT_RELATIONSHIP', 'ADVANCE_OBJECT_ARC', 'TRIGGER_RULE', 'SEED_CLUE',
    'PAYOFF_SETUP', 'RAISE_CLOCK', 'ADVANCE_THEME_ARGUMENT', 'UPDATE_READER_STATE',
    'RECORD_VISUAL_FACT', 'RECORD_SONIC_FACT',
  ]);
  if (!Array.isArray(move.ops) || move.ops.some(o => typeof o !== 'object' || o === null || !VALID_OP_KINDS.has((o as { op: string }).op))) {
    res.status(400).json({ error: 'parseAuthorMove produced an invalid ops array', verb: move.intent.verb, ambiguous: true });
    return;
  }

  // OVERRULE: revert last commit and return early
  if (move.intent.verb === 'OVERRULE') {
    const last = allCommits[allCommits.length - 1];
    if (last) {
      stage.revertCommit(last.commitId);
      res.json({ verb: 'OVERRULE', summary: move.summary, commitId: null, reverted: last.commitId, tier1Pass: true, ambiguous: false });
    } else {
      res.json({ verb: 'OVERRULE', summary: 'No commit to revert', commitId: null, reverted: null, tier1Pass: true, ambiguous: true });
    }
    return;
  }

  const parentId = allCommits.length > 0 ? allCommits[allCommits.length - 1].commitId : null;
  const commit = buildAuthorCommit({ move, beforeState, sceneIdx, parentId });

  if (commit) {
    stage.appendCommit(commit);
    res.json({
      verb: move.intent.verb,
      summary: move.summary,
      ops: commit.ops,
      commitId: commit.commitId,
      tier1Pass: true,
      ambiguous: move.ambiguous,
    });
  } else {
    res.json({
      verb: move.intent.verb,
      summary: move.summary,
      ops: move.ops,
      commitId: null,
      tier1Pass: false,
      ambiguous: move.ambiguous,
    });
  }
}));

// GET /api/nvm/live/feed — Committed-scene stream for the LivePlayPanel.
router.get('/api/nvm/live/feed', gameLimiter, asyncHandler(async (req, res) => {
  const { stage } = getOrCreateSession(sessionId(req));
  type StoryCommitT = import('../nvm/state/StoryCommit.ts').StoryCommit;
  const allCommits = (stage.getCommits() as StoryCommitT[]).filter(c => !c.reverted);

  const feed = allCommits.map(c => {
    const beliefCount = c.ops.filter(o => o.op === 'UPDATE_BELIEF').length;
    const factCount   = c.ops.filter(o => o.op === 'ADD_FACT').length;
    const suspenseOps = c.ops.filter(o => o.op === 'UPDATE_READER_STATE');
    const suspenseDelta  = suspenseOps.reduce((s, o) =>
      s + ((o as { op: string; delta: { suspense?: number } }).delta.suspense ?? 0), 0);
    const curiosityDelta = suspenseOps.reduce((s, o) =>
      s + ((o as { op: string; delta: { curiosity?: number } }).delta.curiosity ?? 0), 0);
    const parts: string[] = [];
    if (factCount > 0)   parts.push(`${factCount} fact${factCount !== 1 ? 's' : ''}`);
    if (beliefCount > 0) parts.push(`${beliefCount} belief${beliefCount !== 1 ? 's' : ''}`);
    if (suspenseDelta > 0)  parts.push(`suspense +${suspenseDelta}`);
    if (curiosityDelta > 0) parts.push(`curiosity +${curiosityDelta}`);
    const opSummary = parts.length > 0 ? parts.join(', ') : `${c.ops.length} ops`;

    return {
      commitId:     c.commitId,
      parentId:     c.parentId,
      sceneIdx:     c.sceneIdx,
      createdAt:    c.createdAt,
      ops:          c.ops,
      deltaSummary: c.deltaSummary,
      opSummary,
    };
  });

  res.json({ commits: feed, totalCommits: feed.length });
}));

// POST /api/nvm/live/advance — Reactive Turn Cycle.
router.post('/api/nvm/live/advance', gameLimiter, asyncHandler(async (req, res) => {
  const { stage, orchestrator } = getOrCreateSession(sessionId(req));
  const { beats = 1, locationId } = req.body as { beats?: number; locationId?: string };
  const safeBeats = Math.max(1, Math.min(5, typeof beats === 'number' ? beats : 1));

  const { advanceWorld } = await import('../nvm/live/loop.ts');
  const result = await advanceWorld(stage, orchestrator, safeBeats, locationId);

  // Build feed entries for the new commits so the client can display them
  const feedEntries = result.commits.map(c => {
    const beliefCount = c.ops.filter(o => o.op === 'UPDATE_BELIEF').length;
    const factCount   = c.ops.filter(o => o.op === 'ADD_FACT').length;
    const parts: string[] = [];
    if (factCount > 0)   parts.push(`${factCount} fact${factCount !== 1 ? 's' : ''}`);
    if (beliefCount > 0) parts.push(`${beliefCount} belief${beliefCount !== 1 ? 's' : ''}`);
    return {
      commitId:     c.commitId,
      parentId:     c.parentId,
      sceneIdx:     c.sceneIdx,
      createdAt:    c.createdAt,
      deltaSummary: c.deltaSummary,
      opSummary:    parts.join(', ') || `${c.ops.length} ops`,
    };
  });

  res.json({
    commits: feedEntries,
    turnsRun: result.turnsRun,
    stoppedBecause: result.stoppedBecause,
  });
}));

// GET /api/nvm/branch/field — Forward Latent Branch Field.
router.get('/api/nvm/branch/field', gameLimiter, asyncHandler(async (req, res) => {
  const { stage } = getOrCreateSession(sessionId(req));
  const seed = typeof req.query.seed === 'string' ? parseInt(req.query.seed, 10) : undefined;

  const { generateBranchField } = await import('../nvm/branch/field.ts');
  const { buildNarrativeState, emptyState } = await import('../nvm/state/NarrativeState.ts');
  const { applyStoryOps } = await import('../nvm/ops/dispatcher.ts');

  type StoryCommitT = import('../nvm/state/StoryCommit.ts').StoryCommit;
  const allCommits = (stage.getCommits() as StoryCommitT[]).filter(c => !c.reverted);

  // Fold commits into state for accurate scoring
  const base = buildNarrativeState(stage);
  let folded = emptyState();
  for (const c of allCommits) folded = applyStoryOps(folded, c.ops);
  const state = { ...base, ...folded, turn: stage.getTurnCount() };

  const field = generateBranchField(state, allCommits, seed);
  res.json(field);
}));

// GET /api/nvm/conflicts — Conflict Orchestrator + Intention Registry.
router.get('/api/nvm/conflicts', gameLimiter, asyncHandler(async (req, res) => {
  const { stage } = getOrCreateSession(sessionId(req));
  const { buildIntentionRegistry } = await import('../nvm/drama/intention-registry.ts');
  const { computeConflicts } = await import('../nvm/drama/conflict-orchestrator.ts');
  const { buildNarrativeState, emptyState } = await import('../nvm/state/NarrativeState.ts');
  const { applyStoryOps } = await import('../nvm/ops/dispatcher.ts');

  type StoryCommitT = import('../nvm/state/StoryCommit.ts').StoryCommit;
  const allCommits = (stage.getCommits() as StoryCommitT[]).filter(c => !c.reverted);

  const base = buildNarrativeState(stage);
  let folded = emptyState();
  for (const c of allCommits) folded = applyStoryOps(folded, c.ops);
  const state = { ...base, ...folded, turn: stage.getTurnCount() };

  const registry = buildIntentionRegistry(stage);
  const conflicts = computeConflicts(registry, state);

  res.json({ registry, conflicts });
}));

// GET /api/nvm/screenplay/memory — Live Screenplay Memory.
router.get('/api/nvm/screenplay/memory', gameLimiter, asyncHandler(async (req, res) => {
  const { stage } = getOrCreateSession(sessionId(req));
  const { buildScreenplayMemory } = await import('../nvm/screenplay/memory.ts');
  const { analyzeStructure } = await import('../nvm/screenplay/structure.ts');

  type StoryCommitT = import('../nvm/state/StoryCommit.ts').StoryCommit;
  const allCommits = (stage.getCommits() as StoryCommitT[]).filter(c => !c.reverted);
  const records = buildScreenplayMemory(allCommits);
  const structure = analyzeStructure(records, allCommits);

  res.json({ records, structure, totalScenes: records.length });
}));

// POST /api/nvm/compile — End-Condition Detector + Screenplay Compiler.
router.post('/api/nvm/compile', gameLimiter, asyncHandler(async (req, res) => {
  const { stage } = getOrCreateSession(sessionId(req));
  const { title = 'UNTITLED' } = req.body as { title?: string };

  const { buildScreenplayMemory } = await import('../nvm/screenplay/memory.ts');
  const { analyzeStructure } = await import('../nvm/screenplay/structure.ts');
  const { detectEndCondition } = await import('../nvm/screenplay/end-condition.ts');
  const { compileScreenplay } = await import('../nvm/screenplay/compile.ts');
  const { buildNarrativeState, emptyState } = await import('../nvm/state/NarrativeState.ts');
  const { applyStoryOps } = await import('../nvm/ops/dispatcher.ts');

  type StoryCommitT = import('../nvm/state/StoryCommit.ts').StoryCommit;
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
router.post('/api/nvm/revise', gameLimiter, asyncHandler(async (req, res) => {
  const { stage } = getOrCreateSession(sessionId(req));
  const { approvedSpans = [], title = 'UNTITLED' } = req.body as { approvedSpans?: unknown[]; title?: string };

  const { buildScreenplayMemory } = await import('../nvm/screenplay/memory.ts');
  const { analyzeStructure } = await import('../nvm/screenplay/structure.ts');
  const { compileScreenplay } = await import('../nvm/screenplay/compile.ts');
  const { runRevisionPipeline } = await import('../nvm/revision/pipeline.ts');
  const { buildNarrativeState, emptyState } = await import('../nvm/state/NarrativeState.ts');
  const { applyStoryOps } = await import('../nvm/ops/dispatcher.ts');

  type StoryCommitT = import('../nvm/state/StoryCommit.ts').StoryCommit;
  const allCommits = (stage.getCommits() as StoryCommitT[]).filter(c => !c.reverted);

  const base = buildNarrativeState(stage);
  let folded = emptyState();
  for (const c of allCommits) folded = applyStoryOps(folded, c.ops);
  const state = { ...base, ...folded, turn: stage.getTurnCount() };

  const records = buildScreenplayMemory(allCommits);
  const structure = analyzeStructure(records, allCommits);
  const compiled = compileScreenplay(allCommits, state, records, structure, title);

  // approvedSpans validated loosely — we trust the pipeline to ignore malformed spans
  const safeSpans = Array.isArray(approvedSpans) ? approvedSpans as import('../nvm/revision/passes/types.ts').ApprovedSpan[] : [];

  const illusionCtx = stage.getIllusionState();
  const characterSummary = stage.getAllAgents().slice(0, 6)
    .map(a => {
      const es = a.emotionState;
      const emo = es && es.dominant !== 'neutral' && es.intensity >= 20 ? ` [${es.dominant}]` : '';
      return sanitizeForPrompt(a.name, 60) + emo;
    }).join(', ');
  const storyCtx: import('../nvm/revision/passes/types.ts').StoryContext = {
    theme: illusionCtx.story_theme ? sanitizeForPrompt(illusionCtx.story_theme, 200) : undefined,
    genre: illusionCtx.story_genre ?? undefined,
    directorStyle: illusionCtx.director_style ?? undefined,
    characters: characterSummary || undefined,
  };

  const revisionResult = await runRevisionPipeline(compiled, records, structure, safeSpans, undefined, storyCtx);
  res.json(revisionResult);
}));

// GET /api/nvm/revise-stream — SSE streaming variant of the revision pipeline.
router.get('/api/nvm/revise-stream', gameLimiter, async (req, res) => {
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
    const { buildScreenplayMemory } = await import('../nvm/screenplay/memory.ts');
    const { analyzeStructure } = await import('../nvm/screenplay/structure.ts');
    const { compileScreenplay } = await import('../nvm/screenplay/compile.ts');
    const { runRevisionPipeline } = await import('../nvm/revision/pipeline.ts');
    const { buildNarrativeState, emptyState } = await import('../nvm/state/NarrativeState.ts');
    const { applyStoryOps } = await import('../nvm/ops/dispatcher.ts');

    type StoryCommitT = import('../nvm/state/StoryCommit.ts').StoryCommit;
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
    const storyCtxStream: import('../nvm/revision/passes/types.ts').StoryContext = {
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
