// Studio-Note critic — commercial and audience-engagement viability.
// Objects to scenes with no audience-facing update (UPDATE_READER_STATE),
// scenes that are too intellectually dense, and scenes that drop suspense.

import type { NarrativeTransitionIR } from '../../ir/NarrativeTransitionIR.ts';
import type { NarrativeState } from '../../state/NarrativeState.ts';
import type { Critique } from '../room.ts';

export function studioNoteCritic(ir: NarrativeTransitionIR, state: NarrativeState): Critique[] {
  const critiques: Critique[] = [];

  // No reader state update — audience not engaged
  const hasReaderUpdate = ir.ops.some(op => op.op === 'UPDATE_READER_STATE');
  if (!hasReaderUpdate && ir.sceneIdx > 0) {
    critiques.push({
      criticId: 'studio_note', severity: 35, targetOpIdx: null,
      objection: 'No UPDATE_READER_STATE — scene does not move the audience needle',
      suggestedOperator: 'inject_irony',
      attentionBid: 40,
    });
  }

  // Suspense dropping below 30 is commercially risky
  if (state.audienceState.suspense < 30 && ir.sceneIdx > 2) {
    critiques.push({
      criticId: 'studio_note', severity: 45, targetOpIdx: null,
      objection: `Audience suspense is ${state.audienceState.suspense}/100 — approaching disengagement threshold`,
      suggestedOperator: 'raise_stakes',
      attentionBid: 50,
    });
  }

  // Provide_relief scenes that also have multiple belief updates feel like lectures
  if (ir.sceneFunction === 'provide_relief') {
    const beliefCount = ir.ops.filter(op => op.op === 'UPDATE_BELIEF').length;
    if (beliefCount > 2) {
      critiques.push({
        criticId: 'studio_note', severity: 30, targetOpIdx: null,
        objection: `Relief scene has ${beliefCount} belief updates — too expository, kills the breather`,
        suggestedOperator: 'cut_on_the_nose',
        attentionBid: 25,
      });
    }
  }

  return critiques;
}
