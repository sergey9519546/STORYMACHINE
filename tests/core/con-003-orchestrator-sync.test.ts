// CON-003 (RELIABILITY.md, "Director's Cut and Converge bypass the
// Orchestrator cache") — reliability re-verification, Phase S / S2.
//
// The finding: server/routes/nvm/commits.ts's Director's Cut
// (/api/nvm/inject-ops) and Converge-commit (/api/nvm/converge/commit)
// routes, and server/routes/nvm/live.ts's Author-Presence Move Bus
// (/api/nvm/live/move, including its OVERRULE revert), all write directly to
// Stage via stage.appendCommit()/stage.revertCommit() rather than through
// Orchestrator.runTurn()/runRoomSimulation(). Orchestrator caches the
// parent-chain head (_lastCommitId) and a folded NarrativeState in private
// fields, updated ONLY from its own commit paths — so a bypass write left
// that cache stale, and the next /api/turn (or /api/run-room, or
// /api/nvm/live/advance) parented its new commit on the WRONG, superseded
// head, forking or orphaning the canonical chain.
//
// Re-verified 2026-08-21 against current main: STILL PRESENT (confirmed by
// this file's first test, which reproduces it with no fix applied). Fixed by
// Orchestrator.syncFromStage() (server/engine/Orchestrator.ts) — re-derives
// the cached head + folded state from Stage.getLiveCommits() — called from
// all three bypass sites immediately after their Stage write.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Stage } from '../../server/engine/Stage.ts';
import { Orchestrator } from '../../server/engine/Orchestrator.ts';
import { summarizeOps } from '../../server/nvm/state/StoryCommit.ts';
import type { StoryCommit } from '../../server/nvm/state/StoryCommit.ts';

function bypassCommit(commitId: string, parentId: string | null, sceneIdx: number): StoryCommit {
  // Mirrors exactly what /api/nvm/inject-ops, /api/nvm/converge/commit, and
  // /api/nvm/live/move build — an empty-ops commit is enough to exercise the
  // parent-chain caching bug; ops content is irrelevant to CON-003.
  return {
    commitId,
    parentId,
    sceneIdx,
    ops: [],
    deltaSummary: summarizeOps([]),
    reverted: false,
    createdAt: Date.now(),
  };
}

describe('CON-003 — Orchestrator cached head vs. a Stage write that bypasses it', () => {
  it('REPRODUCTION: without syncFromStage(), the cached head does not see a bypass commit', () => {
    const stage = new Stage(':memory:');
    const orch = new Orchestrator(stage); // fresh session, no commits yet
    assert.equal(orch.getCachedHeadId(), null, 'a brand-new Orchestrator has no cached head');

    // A Director's-Cut-shaped write straight to Stage — exactly what
    // /api/nvm/inject-ops does before this fix's orchestrator.syncFromStage() call.
    stage.appendCommit(bypassCommit('bypass-1', null, 0));

    assert.equal(
      stage.getLiveCommits().length, 1,
      'the bypass commit really did land in Stage',
    );
    assert.equal(
      orch.getCachedHeadId(), null,
      'BUG reproduced: Orchestrator\'s cached head is still null (or whatever it was pre-write) — ' +
      'it has no idea a new commit landed. The next runTurn()/runRoomSimulation() would parent its ' +
      'commit on the stale head, orphaning bypass-1 from the chain it should have extended.',
    );
  });

  it('FIX: syncFromStage() re-derives the head from Stage after a bypass write', () => {
    const stage = new Stage(':memory:');
    const orch = new Orchestrator(stage);

    stage.appendCommit(bypassCommit('bypass-1', null, 0));
    orch.syncFromStage();
    assert.equal(orch.getCachedHeadId(), 'bypass-1');

    // A second bypass write (e.g. Converge-commit landing after a Director's Cut).
    stage.appendCommit(bypassCommit('bypass-2', 'bypass-1', 1));
    orch.syncFromStage();
    assert.equal(orch.getCachedHeadId(), 'bypass-2', 'head advances to the newest live commit');
  });

  it('FIX: syncFromStage() drops a reverted commit from the head (OVERRULE)', () => {
    const stage = new Stage(':memory:');
    const orch = new Orchestrator(stage);

    stage.appendCommit(bypassCommit('c1', null, 0));
    stage.appendCommit(bypassCommit('c2', 'c1', 1));
    orch.syncFromStage();
    assert.equal(orch.getCachedHeadId(), 'c2');

    // /api/nvm/live/move's OVERRULE branch: stage.revertCommit() then
    // orchestrator.syncFromStage() (this fix's line).
    stage.revertCommit('c2');
    orch.syncFromStage();
    assert.equal(
      orch.getCachedHeadId(), 'c1',
      'after reverting the tip, the cached head must fall back to the last LIVE commit, not stay on the reverted one',
    );
  });

  it('FIX: syncFromStage() over an empty live-commit set (all reverted) resets to null', () => {
    const stage = new Stage(':memory:');
    const orch = new Orchestrator(stage);

    stage.appendCommit(bypassCommit('c1', null, 0));
    stage.revertCommit('c1');
    orch.syncFromStage();
    assert.equal(orch.getCachedHeadId(), null, 'no live commits left means no parent chain');
  });

  it('Orchestrator constructed AFTER the bypass write sees the correct head from the start', () => {
    // Sanity check that the constructor path (a fresh Orchestrator over an
    // already-populated Stage — e.g. server restart) already agrees with
    // syncFromStage()'s live-commit semantics for the simple non-reverted case.
    const stage = new Stage(':memory:');
    stage.appendCommit(bypassCommit('c1', null, 0));
    const orch = new Orchestrator(stage);
    assert.equal(orch.getCachedHeadId(), 'c1');
  });
});
