// server/routes/nvm/twin-whatif.ts — causal twin (SCM + do() intervention),
// the What-If Lab compose endpoint, the Forward Latent Branch Field, backward-
// chaining authorial planning (fixed-points/backchain), and audience red-team.
// Split out of the former server/routes/nvm.ts — see server/routes/nvm/index.ts
// for the full module map.
import express from 'express';
import { buildEnrichedState } from '../../nvm/state/enrichedState.ts';
import {
  asyncHandler, sessionId, getOrCreateSession,
  withSessionCommand, gameLimiter,
} from '../../lib/session-store.ts';
import {
  validate, RedteamBodySchema, TwinDoBodySchema,
  FixedPointsBodySchema, BackchainBodySchema, WhatIfExploreBodySchema,
  WhatIfDoctorBodySchema,
} from '../../lib/validation.ts';
import { requestAbortSignal } from '../../lib/doctor-request.ts';
import { isWholeDraftAnalysisComplete } from '../../lib/analysis-completeness.ts';
import type { ScriptDoctorReport } from '../../nvm/analyze/types.ts';

const router = express.Router();
export default router;

// POST /api/nvm/redteam — red-team a RevealPlan against current audience state
router.post('/api/nvm/redteam', gameLimiter, validate(RedteamBodySchema), asyncHandler(async (req, res) => {
  const { stage } = getOrCreateSession(sessionId(req));
  const { redTeamVerdict } = await import('../../nvm/valuation/audience-redteam.ts');
  const { plan } = req.body as { plan: import('../../nvm/reveal/RevealPlan.ts').RevealPlan };
  const state = buildEnrichedState(stage);
  res.json(redTeamVerdict(plan, state));
}));

// GET /api/nvm/twin/scm — return the current structural causal model as a
// serialisable node list (Map → array) so the UI can render the op DAG.
router.get('/api/nvm/twin/scm', gameLimiter, asyncHandler(async (req, res) => {
  const { stage } = getOrCreateSession(sessionId(req));
  const { buildSCM } = await import('../../nvm/twin/scm.ts');
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
router.post('/api/nvm/twin/do', gameLimiter, validate(TwinDoBodySchema), asyncHandler(async (req, res) => {
  const { stage } = getOrCreateSession(sessionId(req));
  const { buildSCM } = await import('../../nvm/twin/scm.ts');
  const { doIntervention } = await import('../../nvm/twin/counterfactual.ts');
  type StoryOpT = import('../../nvm/ops/StoryOp.ts').StoryOp;
  const { opId, replacement } = req.body as { opId: string; replacement?: StoryOpT | null };
  const scm = buildSCM(stage);
  const intervention = { opId, replacement: replacement ?? null };
  res.json(doIntervention(scm, intervention));
}));

// POST /api/nvm/whatif/explore — What-If Lab compose endpoint (Run 6).
// DETERMINISTIC, KEYLESS: this route makes zero LLM calls. It composes the
// causal twin (buildSCM + doIntervention, same as POST /api/nvm/twin/do
// above) with the Forward Latent Branch Field (server/nvm/branch/field.ts,
// same machinery GET /api/nvm/branch/field uses) to answer "what if I
// changed X?" with a plain-language diff and ranked alternate continuations —
// identical inputs always produce identical output (server/nvm/whatif/
// explore.ts derives its branch-field seed from the intervention itself, not
// from wall-clock time). gameLimiter, not aiLimiter, for the same reason
// /api/nvm/converge/commit uses gameLimiter: no model call, same cost profile
// as any other proof/replay route.
//
// This route deliberately does NOT build a second "adopt" / commit path.
// Once the writer picks a branch from `branches[]`, its `ops` are the exact
// same shape POST /api/nvm/converge/commit already accepts (and re-proves
// against current session state before writing a StoryCommit) — routing the
// adopted branch through that existing endpoint means there is still exactly
// one commit pen and one re-proof gate in the whole system, instead of a
// second bespoke commit path here that could drift out of sync with it.
router.post('/api/nvm/whatif/explore', gameLimiter, validate(WhatIfExploreBodySchema), asyncHandler(async (req, res) => {
  const { stage } = getOrCreateSession(sessionId(req));
  const { buildSCM } = await import('../../nvm/twin/scm.ts');
  const { exploreWhatIf } = await import('../../nvm/whatif/explore.ts');
  type StoryOpT = import('../../nvm/ops/StoryOp.ts').StoryOp;
  const { opId, replacement, branchLimit } = req.body as {
    opId: string; replacement?: StoryOpT | null; branchLimit?: number;
  };

  const state = buildEnrichedState(stage);
  const commits = stage.getLiveCommits();
  const scm = buildSCM(stage);

  const result = exploreWhatIf({
    state,
    commits,
    scm,
    intervention: { opId, replacement: replacement ?? null },
    branchLimit,
  });

  res.json(result);
}));

// ── What-If Lab × Script Doctor (2026-09-04) ────────────────────────────────
// POST /api/nvm/whatif/doctor — the same intervention /explore above answers,
// plus the piece that was missing entirely until now: a branch's HEALTH,
// VERDICT and GRADE.
//
// WHY THIS ROUTE EXISTS RATHER THAN A FIELD ON /explore. Scoring is orders of
// magnitude more expensive than exploring — /explore is a fold over data
// already in memory, whereas this runs the full 14-pass doctor once per
// variant (up to six runs at branchLimit 5). Bolting it onto /explore would
// have made the Lab's existing, cheap "what breaks?" answer pay that cost on
// every click. Two routes, one body shape (WhatIfDoctorBodySchema is
// WhatIfExploreBodySchema plus an optional title), so the client asks the
// second question about the exact intervention it just asked the first about.
//
// DETERMINISTIC AND KEYLESS, like every route in this file: materializeWhatIf
// compiles each branch to Fountain through server/nvm/project/index.ts's
// existing StoryCommit -> Fountain projector (no LLM, no randomUUID, no
// wall-clock read — see materialize.ts's header), and runScriptDoctorOffThread
// is the SAME entry point, worker pool and content-hash LRU that
// POST /api/scriptide/doctor uses, so a repeated explore of one intervention
// re-scores nothing. gameLimiter for the same reason /explore and
// /api/scriptide/doctor both take it: pure CPU, never a model call.
//
// HONESTY. Nothing here re-implements or re-weights the doctor. health/grade
// are withheld exactly where the route layer already withholds them
// (isWholeDraftAnalysisComplete — server/lib/analysis-completeness.ts), so a
// variant the doctor could not analyze whole reports `analysisComplete: false`
// and NO score rather than a plausible-looking number. The two structural
// aggregates ride along only when structuralSignals is present AND `scored`
// (>= 2 scenes); they are descriptive, never part of health.
router.post('/api/nvm/whatif/doctor', gameLimiter, validate(WhatIfDoctorBodySchema), asyncHandler(async (req, res) => {
  const { stage } = getOrCreateSession(sessionId(req));
  const { buildSCM } = await import('../../nvm/twin/scm.ts');
  const { exploreWhatIf } = await import('../../nvm/whatif/explore.ts');
  const { materializeWhatIf } = await import('../../nvm/whatif/materialize.ts');
  const { runScriptDoctorOffThread } = await import('../../nvm/analyze/doctor-pool.ts');
  type StoryOpT = import('../../nvm/ops/StoryOp.ts').StoryOp;
  const { opId, replacement, branchLimit, title } = req.body as {
    opId: string; replacement?: StoryOpT | null; branchLimit?: number; title?: string;
  };

  const state = buildEnrichedState(stage);
  const commits = stage.getLiveCommits();
  const scm = buildSCM(stage);
  const intervention = { opId, replacement: replacement ?? null };

  const explored = exploreWhatIf({ state, commits, scm, intervention, branchLimit });
  const materialized = materializeWhatIf({
    commits, state, scm, intervention, branches: explored.branches, title,
  });

  const signal = requestAbortSignal(res);

  // Presents ONE doctor report the way the client is allowed to read it. Mirrors
  // server/routes/scriptide.ts's publicDoctorReport contract (health/grade are
  // withheld unless the whole draft was analyzed) rather than re-deriving a
  // second, looser notion of "scored".
  function presentReport(report: ScriptDoctorReport) {
    const complete = isWholeDraftAnalysisComplete(report);
    const signals = report.structuralSignals;
    return {
      formatUnrecognized: false,
      analysisComplete: complete,
      sceneCount: report.sceneCount,
      analyzedAt: report.analyzedAt,
      ...(complete ? { health: report.health, grade: report.grade } : {}),
      // `verdict` is already optional on the report and is only meaningful
      // alongside a real score — gated on the same flag for the same reason.
      ...(complete && report.verdict !== undefined ? { verdict: report.verdict } : {}),
      // 2026-09-04 review (REVISE item 5): the same calibration reference-set
      // percentile every other scored-snapshot writer (confirmSnapshot, the
      // undo path) already carries — `report.healthPercentile` is only ever
      // populated for a complete analysis (doctor.ts), so this is gated on
      // the same `complete` flag health/grade/verdict already use, never a
      // second condition that could disagree with them.
      ...(complete && typeof report.healthPercentile === 'number' ? { healthPercentile: report.healthPercentile } : {}),
      ...(signals?.scored ? {
        meanAbsDialogueShareDelta: signals.meanAbsDialogueShareDelta,
        actionSentenceCvOverall: signals.actionSentenceCvOverall,
      } : {}),
    };
  }

  // A projected draft with zero commits is a bare title page — no slugline
  // anywhere. Scoring it is the EXACT trap POST /api/scriptide/doctor's
  // hasSceneHeading short-circuit exists to close: the doctor reads such a
  // document as a fully-analyzed health-0 / verdict PASS report rather than an
  // honestly incomplete one (measured, not assumed — see this route's test
  // "withholds health and grade ... rather than inventing a score"). Same
  // answer as that route gives, reached without running the doctor at all.
  const unscorable = { formatUnrecognized: true, analysisComplete: false, sceneCount: 0 } as const;
  const scoreDraft = async (draft: { fountain: string; sceneCount: number }) =>
    draft.sceneCount === 0
      ? unscorable
      : presentReport(await runScriptDoctorOffThread(draft.fountain, undefined, { signal }));

  // Sequential, not Promise.all: the pool queues anyway, and a serial walk lets
  // an aborted request (client navigated away) stop before paying for variants
  // nobody will read.
  const baseReport = await scoreDraft(materialized.base);
  const baseHealth = 'health' in baseReport ? baseReport.health : undefined;

  const branchById = new Map(explored.branches.map(b => [b.branchId, b]));
  const branches = [];
  for (const variant of materialized.variants) {
    const branch = branchById.get(variant.branchId);
    const scored = await scoreDraft(variant);
    const health = 'health' in scored ? scored.health : undefined;
    branches.push({
      branchId: variant.branchId,
      summary: branch?.summary ?? '',
      scores: branch?.scores ?? null,
      fountain: variant.fountain,
      ...scored,
      // Only a real number minus a real number. Absent whenever either side was
      // not analyzed whole — never a delta against a withheld score.
      ...(health !== undefined && baseHealth !== undefined
        ? { healthDelta: Math.round((health - baseHealth) * 10) / 10 }
        : {}),
    });
  }

  res.json({
    base: { fountain: materialized.base.fountain, ...baseReport },
    intervened: materialized.intervened.fountain,
    consequences: explored.consequences,
    branches,
  });
}));

// POST /api/nvm/author/fixed-points — backward-chain toward a narrative attractor
router.post('/api/nvm/author/fixed-points', gameLimiter, validate(FixedPointsBodySchema), withSessionCommand(async (req, res, session) => {
  const { stage } = session;
  const { planToward } = await import('../../nvm/author/fixed-points.ts');
  type FixedPointT = import('../../nvm/author/fixed-points.ts').FixedPoint;
  const { fixedPoints: fps, currentScene: bodyCurrentScene } = req.body as { fixedPoints: FixedPointT[]; currentScene?: number };
  const state = buildEnrichedState(stage);
  const currentScene = typeof bodyCurrentScene === 'number' ? bodyCurrentScene : state.turn;
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
    type PressureType = import('../../engine/types.ts').DramaticPressureType;
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
router.post('/api/nvm/author/backchain', gameLimiter, validate(BackchainBodySchema), asyncHandler(async (req, res) => {
  const { stage } = getOrCreateSession(sessionId(req));
  const { backchain, scheduleToGoalBiases } = await import('../../nvm/author/backchain.ts');
  type FixedPointT = import('../../nvm/author/fixed-points.ts').FixedPoint;
  const { fixedPoint: fp, currentScene: bodyCurrentScene } = req.body as { fixedPoint: FixedPointT; currentScene?: number };
  const state = buildEnrichedState(stage);
  const currentScene = typeof bodyCurrentScene === 'number' ? bodyCurrentScene : state.turn;
  const result = backchain(fp, state, currentScene);
  const { sanitizeForPrompt } = await import('../../lib/prompt-utils.ts');
  const biases = scheduleToGoalBiases(result, sanitizeForPrompt(fp.description ?? `fixed point @ scene ${fp.atScene}`, 1000));
  res.json({ ...result, biases });
}));

// GET /api/nvm/branch/field — Forward Latent Branch Field.
router.get('/api/nvm/branch/field', gameLimiter, asyncHandler(async (req, res) => {
  const { stage } = getOrCreateSession(sessionId(req));
  const seed = typeof req.query.seed === 'string' ? parseInt(req.query.seed, 10) : undefined;

  const { generateBranchField } = await import('../../nvm/branch/field.ts');
  const { emptyState } = await import('../../nvm/state/NarrativeState.ts');
  const { buildNarrativeState } = await import('../../nvm/state/from-stage.ts');
  const { applyStoryOps } = await import('../../nvm/ops/dispatcher.ts');

  type StoryCommitT = import('../../nvm/state/StoryCommit.ts').StoryCommit;
  const allCommits = stage.getLiveCommits();

  // Fold commits into state for accurate scoring
  const base = buildNarrativeState(stage);
  let folded = emptyState();
  for (const c of allCommits) folded = applyStoryOps(folded, c.ops);
  const state = { ...base, ...folded, turn: stage.getTurnCount() };

  const field = generateBranchField(state, allCommits, seed);
  res.json(field);
}));
