// ReincorporationProof (Tier 2) — from scene 2 onward, at least one op must
// reference prior story material (existing characters, relationships, clocks,
// clues, or the theme). A scene where every op introduces brand-new identifiers
// is a disconnected island — it feels unmotivated and breaks story continuity.
//
// "Reincorporation" is the screenwriting principle: what you plant must return.
// Applied here at the structural level: every scene after the first two should
// be tethered to the story fabric that precedes it.

import type { NarrativeTransitionIR } from '../../ir/NarrativeTransitionIR.ts';
import type { NarrativeState } from '../../state/NarrativeState.ts';
import type { ProofResult } from '../contract.ts';
import type { StoryOp } from '../../ops/StoryOp.ts';
import { passResult, failResult } from '../contract.ts';
import { relationshipKey } from '../../state/NarrativeState.ts';

export function reincorporationProof(ir: NarrativeTransitionIR, state: NarrativeState): ProofResult {
  // The first two scenes establish new material — reincorporation is not expected there.
  if (ir.sceneIdx < 2) return passResult('ReincorporationProof', 'early scene — establishing new material is expected');

  const existingChars    = new Set([...Object.keys(state.characterBeliefs), ...Object.keys(state.characterEmotions)]);
  const existingRelPairs = new Set(Object.keys(state.relationships));
  const existingClocks   = new Set(Object.keys(state.clocks));
  const existingClues    = new Set(state.clues.map(c => c.clueId));
  const existingFacts    = new Set(state.objectiveReality.map(f => f.factId));

  const reincorporated = ir.ops.some((op: StoryOp) => {
    switch (op.op) {
      case 'UPDATE_BELIEF':           return existingChars.has(op.charId);
      case 'APPRAISE_EMOTION':        return existingChars.has(op.charId);
      case 'SHIFT_RELATIONSHIP':      return existingRelPairs.has(relationshipKey(op.pair[0], op.pair[1]));
      case 'RAISE_CLOCK':             return existingClocks.has(op.clockId);
      case 'PAYOFF_SETUP':            return existingClues.has(op.setupId);
      case 'ADVANCE_THEME_ARGUMENT':  return true; // always references the established theme
      case 'EXPIRE_FACT':             return existingFacts.has(op.factId);
      default:                        return false;
    }
  });

  if (reincorporated) return passResult('ReincorporationProof', 'scene references prior story material');

  return failResult('ReincorporationProof',
    'scene introduces only new elements with no callbacks to prior story material', [
      {
        proof: 'ReincorporationProof', severity: 'flag',
        message: `Scene ${ir.sceneIdx} is a disconnected island — none of its ops reference an established character, relationship, clock, clue, or theme. Add at least one op that builds on prior story material; otherwise this scene cannot be integrated into the story fabric.`,
      },
    ]);
}
