// from-stage.ts — the NarrativeState read-model projected off a live Stage,
// split out of ./NarrativeState.ts (retrospective #5, 2026-09-03).
//
// WHY THE SPLIT. buildNarrativeState() is the one function in the NarrativeState
// module that needs the Stage, and server/engine/Stage.ts is the project's
// better-sqlite3 surface: importing it — even `import type` — pulls
// server/config/v5-flags.ts, server/monitoring/v5-metrics.ts, server/lib/json.ts,
// the kernel event store, the ghost ledger, the reveal plans and the valuation
// futures along with it, because scripts/lib/import-graph.mjs follows type-only
// edges deliberately (a type-only dependency is still part of the compiled
// surface). That made a native database binding part of the reachable set of
// the deterministic doctor, which ARCHITECTURE.md §1 says is pure and keyless.
//
// The type-and-pure-functions half stays in ./NarrativeState.ts, which now has
// no dependency on the engine at all beyond its plain type vocabulary; the
// Stage-bound projection lives here, imported only by callers that already
// hold a Stage (Orchestrator, enrichedState, the repro manifest, the analysis
// route). tests/core/pure-core-boundary.test.ts fails if server/engine/Stage.ts
// ever re-enters doctor.ts's reachable set.

import type { Stage } from '../../engine/Stage.ts';
import { emptyState, type NarrativeState } from './NarrativeState.ts';

// Projects a NarrativeState read-model from the live Stage. Objective facts
// start empty — they accumulate through ADD_FACT StoryOps, not Stage rows.
export function buildNarrativeState(stage: Stage): NarrativeState {
  const state = emptyState();
  state.turn = stage.getTurnCount();
  const illusion = stage.getIllusionState();
  state.authorIntent = { targetStructure: illusion.structure, theme: illusion.story_theme, genre: illusion.story_genre };
  for (const agent of stage.getAllAgents()) {
    if (agent.beliefs?.length) state.characterBeliefs[agent.char_id] = agent.beliefs;
    if (agent.emotionState) state.characterEmotions[agent.char_id] = agent.emotionState;
  }
  return state;
}
