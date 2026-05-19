// NarrativeTransitionIR — the typed scene-change object that exists BEFORE any
// prose is written (HYBRID_DECISION §1.B). This is the layer the repo's
// BeatTrace lacked: BeatTrace records a beat after the fact, the IR proposes a
// transition the Proof Kernel validates before it can become a StoryCommit.

import type { StoryOp } from '../ops/StoryOp.ts';

export type SceneFunction =
  | 'advance_plot' | 'reveal_character' | 'build_tension'
  | 'provide_relief' | 'set_up_payoff' | 'establish_world';

export type ProvenanceOrigin =
  'user_authored' | 'model_generated' | 'model_rewritten' | 'model_edited_by_user';

export interface NarrativeTransitionIR {
  transitionId: string;
  sceneIdx: number;
  sceneFunction: SceneFunction;
  activeMechanisms: string[];          // mechanism ids — resolved by MechanismProof
  beforeStateHash: string;             // stateHash() of the state this IR applies to
  ops: StoryOp[];                      // the typed scene-change, before prose
  preconditions: string[];
  postconditions: string[];
  provenance: { origin: ProvenanceOrigin; createdAt: number; model?: string };
}
