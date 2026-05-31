// buildEnrichedState — enriches a live NarrativeState with historical context.
//
// buildNarrativeState() only populates agent beliefs and emotions from live Stage
// rows. It leaves relationships, clocks, clues, payoffs, object arcs, theme
// argument, and objective reality empty. That gap means every generation call
// starts with an empty world model — the LLM preamble shows no relationship heat,
// no ticking clocks, no planted clues.
//
// This module replays all non-reverted StoryCommits through applyStoryOps to
// reconstruct those accumulative fields, then merges the live-derived beliefs and
// emotions on top. The result is a complete NarrativeState the generation, tension,
// and valuation engines can reason over.

import type { Stage } from '../../engine/Stage.ts';
import type { NarrativeState } from './NarrativeState.ts';
import { buildNarrativeState, emptyState } from './NarrativeState.ts';
import { applyStoryOps } from '../ops/dispatcher.ts';
import type { StoryCommit } from './StoryCommit.ts';

export function buildEnrichedState(stage: Stage): NarrativeState {
  // Live agent beliefs + emotions + author intent + turn count
  const live = buildNarrativeState(stage);

  // Replay all non-reverted commits in insertion order
  const commits = (stage.getCommits() as StoryCommit[]).filter(c => !c.reverted);
  if (commits.length === 0) return live;

  let replayed: NarrativeState = emptyState();
  for (const commit of commits) {
    replayed = applyStoryOps(replayed, commit.ops);
  }

  // Merge: live source of truth wins for per-agent data (beliefs, emotions)
  // because Stage DB is more authoritative than op replay for those fields.
  // Replayed state wins for accumulative world state (everything else).
  return {
    ...replayed,
    // Live-derived fields — prefer Stage rows over op replay
    characterBeliefs: live.characterBeliefs,
    characterEmotions: live.characterEmotions,
    authorIntent: live.authorIntent,
    audienceState: replayed.audienceState.suspense > 0 || replayed.audienceState.curiosity > 0
      ? replayed.audienceState
      : live.audienceState,
    turn: live.turn,
  };
}
