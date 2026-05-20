// StoryManifest — the reproducible build artifact for a story run.
// A manifest captures everything needed to replay a story to an identical
// NarrativeState hash: seed + scenario metadata + ordered StoryOp commits.
// `replayManifest` re-applies the manifest's commits against a fresh stage
// and verifies the resulting stateHash matches the manifest's recorded hash.

import type { StoryCommit } from '../state/StoryCommit.ts';
import { applyStoryOps } from '../ops/dispatcher.ts';
import { emptyState, stateHash, buildNarrativeState } from '../state/NarrativeState.ts';
import type { NarrativeState } from '../state/NarrativeState.ts';
import type { Stage } from '../../engine/Stage.ts';
import type { Seed } from './seed.ts';

export interface StoryManifest {
  manifestId: string;
  seed: Seed;
  scenario: string;
  commits: StoryCommit[];
  finalStateHash: string;
  createdAt: number;
}

export interface ReplayResult {
  match: boolean;
  replayedHash: string;
  expectedHash: string;
  state: NarrativeState;
}

export function buildManifest(
  manifestId: string,
  seed: Seed,
  scenario: string,
  commits: StoryCommit[],
): StoryManifest {
  let state = emptyState();
  for (const c of commits) {
    if (!c.reverted) state = applyStoryOps(state, c.ops);
  }
  return {
    manifestId,
    seed,
    scenario,
    commits,
    finalStateHash: stateHash(state),
    createdAt: Date.now(),
  };
}

export function replayManifest(manifest: StoryManifest): ReplayResult {
  let state = emptyState();
  for (const c of manifest.commits) {
    if (!c.reverted) state = applyStoryOps(state, c.ops);
  }
  const replayedHash = stateHash(state);
  return {
    match: replayedHash === manifest.finalStateHash,
    replayedHash,
    expectedHash: manifest.finalStateHash,
    state,
  };
}

// Snapshot a live stage into a manifest. All non-reverted commits are included.
export function manifestFromStage(
  stage: Stage,
  manifestId: string,
  seed: Seed,
  scenario: string,
): StoryManifest {
  const commits = stage.getCommits().filter(c => !c.reverted);
  return buildManifest(manifestId, seed, scenario, commits);
}
