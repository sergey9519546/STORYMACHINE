// server/routes/nvm/live.ts — the Author-Presence Move Bus, the committed-scene
// feed for LivePlayPanel, the Reactive Turn Cycle, and the on-demand Writers'
// Room critique endpoint. Split out of the former server/routes/nvm.ts — see
// server/routes/nvm/index.ts for the full module map.
import express from 'express';
import { sanitizeForPrompt } from '../../lib/prompt-utils.ts';
import {
  asyncHandler, sessionId, getOrCreateSession,
  gameLimiter,
} from '../../lib/session-store.ts';
import {
  validate, LiveMoveBodySchema, LiveAdvanceBodySchema, RoomCritiqueBodySchema,
} from '../../lib/validation.ts';

const router = express.Router();
export default router;

// POST /api/nvm/room/critique — on-demand Writers' Room (Run 6). Previously
// the 6 critics (server/nvm/room/room.ts, server/nvm/room/critics/*.ts) only
// ever ran INSIDE the convergence loop, judging a same-iteration LLM
// candidate — there was no way to ask "what would the room say about the
// story right now?" without paying for a full converge cycle. The critics are
// pure functions of (ir, state) — confirmed against server/nvm/room/critics/
// showrunner.ts et al.: no randomness, no I/O, no LLM call — so running them
// on demand costs nothing beyond a replay of already-committed ops.
// gameLimiter (deterministic, no LLM).
//
// What IR do we critique when there is no in-flight candidate? Inside the
// loop, runWritersRoom(best, state) is called with `best` = the NOT-YET-
// COMMITTED leading candidate for the current scene and `state` = the state
// as it stood BEFORE that candidate's ops apply (server/nvm/converge/loop.ts
// — `state` is the convergeScene() argument, fixed for the whole scene; it is
// never re-derived per candidate, see loop.ts:260-261). The closest on-demand
// equivalent, using only data that already exists rather than inventing a
// synthetic candidate: treat the most recent commit's ops as if they were
// still "the candidate" under argument, and evaluate the room against the
// state as it stood immediately BEFORE that commit landed (every commit
// except the last one, folded the same way buildEnrichedState() folds all of
// them). That reproduces the loop's exact input shape — a not-yet-final IR
// judged against its own precondition state. A fresh session with no commits
// yet has no candidate to argue over, so the room runs on an empty-ops shell
// IR against the (also empty) live state; critics defensively no-op on
// ir.ops.length === 0 the same way they already no-op on any other IR with no
// matching ops.
router.post('/api/nvm/room/critique', gameLimiter, validate(RoomCritiqueBodySchema), asyncHandler(async (req, res) => {
  const { stage } = getOrCreateSession(sessionId(req));
  const { runWritersRoom } = await import('../../nvm/room/room.ts');
  const { buildNarrativeState, emptyState, stateHash } = await import('../../nvm/state/NarrativeState.ts');
  const { applyStoryOps } = await import('../../nvm/ops/dispatcher.ts');
  type NarrativeTransitionIRT = import('../../nvm/ir/NarrativeTransitionIR.ts').NarrativeTransitionIR;

  const commits = stage.getCommits().filter(c => !c.reverted);
  const lastCommit = commits.length > 0 ? commits[commits.length - 1] : null;
  const priorCommits = lastCommit ? commits.slice(0, -1) : [];

  // Mirrors server/nvm/state/enrichedState.ts's buildEnrichedState() merge
  // policy exactly, but replays only priorCommits — so the room sees the
  // state as it stood right before the candidate-under-critique's own ops
  // applied, not the current session state (which already includes them).
  const live = buildNarrativeState(stage);
  let replayed = emptyState();
  for (const c of priorCommits) replayed = applyStoryOps(replayed, c.ops);
  const priorState = {
    ...replayed,
    characterBeliefs: live.characterBeliefs,
    characterEmotions: live.characterEmotions,
    authorIntent: live.authorIntent,
    audienceState: (replayed.audienceState.suspense > 0 || replayed.audienceState.curiosity > 0)
      ? replayed.audienceState
      : live.audienceState,
    turn: live.turn,
  };

  // StoryCommit (server/nvm/state/StoryCommit.ts) carries no sceneFunction
  // field, so there is nothing authentic to read here — 'advance_plot' is the
  // same placeholder default POST /api/nvm/converge/commit's shellIR already
  // uses when re-proving a bare ops[] with no declared scene function.
  const ir: NarrativeTransitionIRT = {
    transitionId: lastCommit ? `critique-${lastCommit.commitId}` : 'critique-empty-session',
    sceneIdx: lastCommit ? lastCommit.sceneIdx : priorState.turn,
    sceneFunction: 'advance_plot',
    activeMechanisms: [],
    beforeStateHash: stateHash(priorState),
    ops: lastCommit ? lastCommit.ops : [],
    preconditions: [],
    postconditions: [],
    provenance: { origin: 'user_authored', createdAt: lastCommit ? lastCommit.createdAt : 0 },
  };

  const room = runWritersRoom(ir, priorState);
  res.json({
    critiques: room.critiques,
    dominant: room.dominantCritic,
    suggestedOperator: room.suggestedOperator,
    consensus: room.consensus,
  });
}));

// POST /api/nvm/live/move — Author-Presence Move Bus.
router.post('/api/nvm/live/move', gameLimiter, validate(LiveMoveBodySchema), asyncHandler(async (req, res) => {
  const { stage } = getOrCreateSession(sessionId(req));
  const { text, sceneIdx: bodySceneIdx } = req.body as { text: string; sceneIdx?: number };
  if (text.trim().length === 0) {
    res.status(400).json({ error: 'text is required' });
    return;
  }

  const { parseAuthorMove, buildAuthorCommit } = await import('../../nvm/live/move-bus.ts');
  const { buildNarrativeState, emptyState } = await import('../../nvm/state/NarrativeState.ts');
  const { applyStoryOps } = await import('../../nvm/ops/dispatcher.ts');

  type StoryCommitT = import('../../nvm/state/StoryCommit.ts').StoryCommit;
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
  type StoryCommitT = import('../../nvm/state/StoryCommit.ts').StoryCommit;
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
router.post('/api/nvm/live/advance', gameLimiter, validate(LiveAdvanceBodySchema), asyncHandler(async (req, res) => {
  const { stage, orchestrator } = getOrCreateSession(sessionId(req));
  const { beats = 1, locationId } = req.body as { beats?: number; locationId?: string };
  const safeBeats = Math.max(1, Math.min(5, typeof beats === 'number' ? beats : 1));

  const { advanceWorld } = await import('../../nvm/live/loop.ts');
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
