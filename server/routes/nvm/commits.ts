// server/routes/nvm/commits.ts — commit ledger reads, ghost-commit
// browsing/branching, manifest export, Director's Cut op injection, and the
// converge/commit back-half (the one commit pen every selection path funnels
// through). Split out of the former server/routes/nvm.ts (audit M2.1-adjacent
// route-file split) — see server/routes/nvm/index.ts for the full module map.
import express from 'express';
import { buildEnrichedState } from '../../nvm/state/enrichedState.ts';
import {
  asyncHandler, sessionId, getOrCreateSession,
  gameLimiter,
} from '../../lib/session-store.ts';
import {
  validate, validateParams, GhostBranchBodySchema, InjectOpsBodySchema, ConvergeCommitBodySchema,
  CommitIdParamSchema,
} from '../../lib/validation.ts';

const router = express.Router();
export default router;

// GET /api/nvm/commits — list all StoryCommits for this session
router.get('/api/nvm/commits', gameLimiter, asyncHandler(async (req, res) => {
  const { stage } = getOrCreateSession(sessionId(req));
  res.json({ commits: stage.getCommits() });
}));

// GET /api/nvm/commits/:commitId — single commit
router.get('/api/nvm/commits/:commitId', gameLimiter, validateParams(CommitIdParamSchema), asyncHandler(async (req, res) => {
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
router.post('/api/nvm/ghost-commits/branch', gameLimiter, validate(GhostBranchBodySchema), asyncHandler(async (req, res) => {
  const { stage } = getOrCreateSession(sessionId(req));
  const { ghostId } = req.body as { ghostId: string };
  const ghost = stage.ghostLedgerFind(ghostId);
  if (!ghost) { res.status(404).json({ error: 'ghost not found' }); return; }
  res.json({ ghostId, branchedOps: ghost.ir.ops, sceneIdx: ghost.sceneIdx });
}));

// GET /api/nvm/manifest — build a StoryManifest from the current session
router.get('/api/nvm/manifest', gameLimiter, asyncHandler(async (req, res) => {
  const { stage } = getOrCreateSession(sessionId(req));
  const { manifestFromStage } = await import('../../nvm/repro/manifest.ts');
  const { seedFromString } = await import('../../nvm/repro/seed.ts');
  const sid = sessionId(req);
  const manifest = manifestFromStage(stage, `manifest_${sid}`, seedFromString(sid), sid);
  res.json(manifest);
}));

// POST /api/nvm/inject-ops — Director's Cut: inject custom StoryOps into the canon.
router.post('/api/nvm/inject-ops', gameLimiter, validate(InjectOpsBodySchema), asyncHandler(async (req, res) => {
  const { stage } = getOrCreateSession(sessionId(req));
  const { applyStoryOps } = await import('../../nvm/ops/dispatcher.ts');
  const { stateHash } = await import('../../nvm/state/NarrativeState.ts');
  const { summarizeOps } = await import('../../nvm/state/StoryCommit.ts');
  const { randomUUID } = await import('node:crypto');

  type StoryOpT = import('../../nvm/ops/StoryOp.ts').StoryOp;
  const { ops, sceneIdx: bodySceneIdx, label } = req.body as { ops: StoryOpT[]; sceneIdx?: number; label?: string };

  const state = buildEnrichedState(stage);
  const commits = stage.getCommits().filter(c => !c.reverted);
  const parentId = commits[commits.length - 1]?.commitId ?? null;
  const sceneIdx = typeof bodySceneIdx === 'number' ? bodySceneIdx : state.turn;

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
    label: label ?? 'director_cut',
  });
}));

// POST /api/nvm/converge/commit — the missing back-half of generate→audit→select.
// Before this route existed, convergeScene() computed a winner (and, per-candidate,
// every runner-up's and ghost's scores) purely to pick an argmax that was then
// discarded — nothing ever turned that decision into a StoryCommit. This route is
// where a human (or an automated policy reading `winner`/`candidates[]` off
// /api/nvm/converge) actually exercises the commit pen: the writer, not the
// argmax, decides what becomes canon. It's deliberately generic over WHICH
// candidate — the same `ops` shape POST /api/nvm/ghost-commits/branch already
// returns (`branchedOps`) restores a rejected ghost through this exact route too.
// gameLimiter (not aiLimiter): unlike /api/nvm/converge, this route makes no LLM
// call — it only re-proves and commits already-generated ops, same cost profile
// as /api/nvm/inject-ops.
router.post('/api/nvm/converge/commit', gameLimiter, validate(ConvergeCommitBodySchema), asyncHandler(async (req, res) => {
  const { stage } = getOrCreateSession(sessionId(req));
  const { runTier1, tier1Passes, failedProofs } = await import('../../nvm/proof/kernel.ts');
  const { applyStoryOps } = await import('../../nvm/ops/dispatcher.ts');
  const { stateHash } = await import('../../nvm/state/NarrativeState.ts');
  const { summarizeOps } = await import('../../nvm/state/StoryCommit.ts');
  const { randomUUID } = await import('node:crypto');

  type StoryOpT = import('../../nvm/ops/StoryOp.ts').StoryOp;
  type NarrativeTransitionIRT = import('../../nvm/ir/NarrativeTransitionIR.ts').NarrativeTransitionIR;
  const {
    ops, sceneIdx: bodySceneIdx, activeMechanisms, preconditions, summary,
  } = req.body as {
    ops: StoryOpT[]; sceneIdx?: number; activeMechanisms?: string[]; preconditions?: string[]; summary?: string;
  };

  const state = buildEnrichedState(stage);
  const sceneIdx = typeof bodySceneIdx === 'number' ? bodySceneIdx : state.turn;

  // Re-prove Tier 1 against the CURRENT session state — NOT the state the
  // candidate was scored against inside convergeScene() (or whenever a ghost was
  // rejected). Session state can move between "the loop picked a winner" and "the
  // client clicks commit": other commits may have landed, an OVERRULE may have
  // reverted one, a parallel scene may have consumed a clue this candidate also
  // relied on. A candidate that legitimately passed Tier 1 when it was generated
  // can therefore legitimately fail it here — that's the story timeline racing
  // ahead of the selection, not a malformed request, hence 409 rather than 400.
  // activeMechanisms/preconditions default to [] when the caller omits them, which
  // will (correctly) fail MechanismProof/CausalProof for any non-trivial scene —
  // see the ConvergeCommitBodySchema comment for why a caller should pass the
  // candidate's own IR fields through rather than relying on the default.
  const shellIR: NarrativeTransitionIRT = {
    transitionId: `converge-commit-check-${randomUUID()}`,
    sceneIdx,
    sceneFunction: 'advance_plot',
    activeMechanisms: activeMechanisms ?? [],
    beforeStateHash: stateHash(state),
    ops,
    preconditions: preconditions ?? [],
    postconditions: [],
    provenance: { origin: 'model_generated', createdAt: Date.now() },
  };
  const tier1Results = runTier1(shellIR, state);
  if (!tier1Passes(tier1Results)) {
    res.status(409).json({
      error: 'Tier 1 proofs failed against the current session state — these ops were valid when scored, but the story has moved on since',
      failures: failedProofs(tier1Results).map(r => ({ proof: r.proof, reason: r.reason })),
    });
    return;
  }

  const newState = applyStoryOps(state, ops);
  const commits = stage.getCommits().filter(c => !c.reverted);
  const parentId = commits[commits.length - 1]?.commitId ?? null;
  // StoryCommit (server/nvm/state/StoryCommit.ts) has no dedicated origin/author
  // field — inject-ops's own "marker" (the `label` in its response, defaulting to
  // 'director_cut') is likewise never persisted, just echoed back once. Extending
  // StoryCommit's schema is out of scope for this change, so the distinct
  // 'converge_selected' marker is embedded directly in the commitId itself — the
  // one part of a commit that IS persisted verbatim and always returned by
  // GET /api/nvm/commits — so a converge-selected commit stays identifiable in
  // the ledger without a schema change.
  const commitId = `converge_selected-${randomUUID()}`;
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
    marker: 'converge_selected',
    summary: summary ?? null,
  });
}));
