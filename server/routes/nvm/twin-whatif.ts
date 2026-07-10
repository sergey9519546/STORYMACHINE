// server/routes/nvm/twin-whatif.ts — causal twin (SCM + do() intervention),
// the What-If Lab compose endpoint, the Forward Latent Branch Field, backward-
// chaining authorial planning (fixed-points/backchain), and audience red-team.
// Split out of the former server/routes/nvm.ts — see server/routes/nvm/index.ts
// for the full module map.
import express from 'express';
import { buildEnrichedState } from '../../nvm/state/enrichedState.ts';
import {
  asyncHandler, sessionId, getOrCreateSession,
  gameLimiter,
} from '../../lib/session-store.ts';
import {
  validate, RedteamBodySchema, TwinDoBodySchema,
  FixedPointsBodySchema, BackchainBodySchema, WhatIfExploreBodySchema,
} from '../../lib/validation.ts';

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
  const commits = stage.getCommits().filter(c => !c.reverted);
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

// POST /api/nvm/author/fixed-points — backward-chain toward a narrative attractor
router.post('/api/nvm/author/fixed-points', gameLimiter, validate(FixedPointsBodySchema), asyncHandler(async (req, res) => {
  const { stage } = getOrCreateSession(sessionId(req));
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
  const { buildNarrativeState, emptyState } = await import('../../nvm/state/NarrativeState.ts');
  const { applyStoryOps } = await import('../../nvm/ops/dispatcher.ts');

  type StoryCommitT = import('../../nvm/state/StoryCommit.ts').StoryCommit;
  const allCommits = (stage.getCommits() as StoryCommitT[]).filter(c => !c.reverted);

  // Fold commits into state for accurate scoring
  const base = buildNarrativeState(stage);
  let folded = emptyState();
  for (const c of allCommits) folded = applyStoryOps(folded, c.ops);
  const state = { ...base, ...folded, turn: stage.getTurnCount() };

  const field = generateBranchField(state, allCommits, seed);
  res.json(field);
}));
