// server/routes/nvm/debug.ts — causal-explanation inspector, per-commit proof
// tiers + repair patches, and canon projection. Split out of the former
// server/routes/nvm.ts — see server/routes/nvm/index.ts for the full module map.
import express from 'express';
import { buildEnrichedState } from '../../nvm/state/enrichedState.ts';
import {
  asyncHandler, sessionId, getOrCreateSession,
  gameLimiter,
} from '../../lib/session-store.ts';
import {
  validate, validateParams, RepairBodySchema, EventIdParamSchema, LocationIdParamSchema,
  CommitIdParamSchema, ProjectTargetParamSchema,
} from '../../lib/validation.ts';

const router = express.Router();
export default router;

// GET /api/debug/explain/:eventId — explain an action as a causal call stack
router.get('/api/debug/explain/:eventId', gameLimiter, validateParams(EventIdParamSchema), asyncHandler(async (req, res) => {
  const { stage } = getOrCreateSession(sessionId(req));
  const { explainAction } = await import('../../nvm/debug/inspector.ts');
  const panel = explainAction(stage, req.params.eventId);
  if (!panel) { res.status(404).json({ error: 'event not found' }); return; }
  res.json(panel);
}));

// GET /api/debug/explain-scene/:locationId — explain all events in a scene
router.get('/api/debug/explain-scene/:locationId', gameLimiter, validateParams(LocationIdParamSchema), asyncHandler(async (req, res) => {
  const { stage } = getOrCreateSession(sessionId(req));
  const { explainScene } = await import('../../nvm/debug/inspector.ts');
  res.json({ panels: explainScene(stage, req.params.locationId) });
}));

// GET /api/nvm/project/:target — project current canon to a format
router.get('/api/nvm/project/:target', gameLimiter, validateParams(ProjectTargetParamSchema), asyncHandler(async (req, res) => {
  const { stage } = getOrCreateSession(sessionId(req));
  const { project } = await import('../../nvm/project/index.ts');
  const target = req.params.target as Parameters<typeof project>[1];
  const commits = stage.getCommits().filter(c => !c.reverted);
  const state = buildEnrichedState(stage);
  const ghosts = stage.ghostLedgerGet();
  const canon = { commits, state, ghosts };
  res.json(project(canon, target));
}));

// GET /api/nvm/proof/:commitId — run all 4 proof tiers on a single commit.
router.get('/api/nvm/proof/:commitId', gameLimiter, validateParams(CommitIdParamSchema), asyncHandler(async (req, res) => {
  const { stage } = getOrCreateSession(sessionId(req));
  const { runTier1, runTier2, tier2Score, runTier3, tier3Rank, runTier4 } = await import('../../nvm/proof/kernel.ts');
  const { repair } = await import('../../nvm/proof/repair.ts');
  const { lint } = await import('../../nvm/proof/lint.ts');
  const { emptyState } = await import('../../nvm/state/NarrativeState.ts');
  const { applyStoryOps } = await import('../../nvm/ops/dispatcher.ts');

  const targetId = req.params.commitId;
  const allCommits = stage.getCommits().filter((c: import('../../nvm/state/StoryCommit.ts').StoryCommit) => !c.reverted);
  const targetIdx = allCommits.findIndex((c: import('../../nvm/state/StoryCommit.ts').StoryCommit) => c.commitId === targetId);
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
  const ir: import('../../nvm/ir/NarrativeTransitionIR.ts').NarrativeTransitionIR = {
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
router.post('/api/nvm/repair', gameLimiter, validate(RepairBodySchema), asyncHandler(async (req, res) => {
  const { stage } = getOrCreateSession(sessionId(req));
  const { runTier1, runTier2, runTier4 } = await import('../../nvm/proof/kernel.ts');
  const { repair } = await import('../../nvm/proof/repair.ts');
  const { lint } = await import('../../nvm/proof/lint.ts');
  const { ir } = req.body as { ir: import('../../nvm/ir/NarrativeTransitionIR.ts').NarrativeTransitionIR };
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
