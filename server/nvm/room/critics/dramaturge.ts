// Dramaturge critic — structural and formal analysis.
// Objects to scenes that violate the three-act spine, unearned setups,
// orphaned clues, and missing inciting incident in the first three scenes.

import type { NarrativeTransitionIR } from '../../ir/NarrativeTransitionIR.ts';
import type { NarrativeState } from '../../state/NarrativeState.ts';
import type { Critique } from '../room.ts';

export function dramaturgeCritic(ir: NarrativeTransitionIR, state: NarrativeState): Critique[] {
  const critiques: Critique[] = [];

  // First 3 scenes should establish a fact and introduce at least one character.
  // Check both the current IR ops AND prior state to avoid false positives on scene 0.
  if (ir.sceneIdx <= 2) {
    const hasFactOrChar =
      ir.ops.some(op => op.op === 'ADD_FACT') ||
      ir.ops.some(op => op.op === 'UPDATE_BELIEF');
    if (!hasFactOrChar && state.objectiveReality.length === 0 &&
        Object.keys(state.characterBeliefs).length === 0) {
      critiques.push({
        criticId: 'dramaturge', severity: 50, targetOpIdx: null,
        objection: 'Opening scenes should establish at least one fact or character — world feels empty',
        suggestedOperator: 'weird_but_valid',
        attentionBid: 55,
      });
    }
  }

  // Payoff with no prior setup in state is dramatically unearned
  ir.ops.forEach((op, i) => {
    if (op.op === 'PAYOFF_SETUP') {
      const setupInState = state.payoffs.some(p => p.setupId === op.setupId);
      const setupInThisIR = ir.ops.slice(0, i).some(
        prev => prev.op === 'SEED_CLUE' && prev.clueId === op.setupId,
      );
      if (!setupInState && !setupInThisIR) {
        critiques.push({
          criticId: 'dramaturge', severity: 70, targetOpIdx: i,
          objection: `PAYOFF_SETUP "${op.setupId}" fires but no prior SEED_CLUE or state setup exists — structurally hollow`,
          suggestedOperator: 'invert_expectation',
          attentionBid: 75,
        });
      }
    }
  });

  // No clues seeded by scene 4 = mystery engine hasn't started.
  // Check both prior state and current IR ops so the scene seeding the first clue
  // doesn't falsely trigger this warning.
  if (ir.sceneIdx >= 4) {
    const cluesInThisIR = ir.ops.some(op => op.op === 'SEED_CLUE');
    if (state.clues.length === 0 && !cluesInThisIR) {
      critiques.push({
        criticId: 'dramaturge', severity: 40, targetOpIdx: null,
        objection: `Scene ${ir.sceneIdx} and no clues seeded yet — the mystery engine has not started`,
        suggestedOperator: 'weird_but_valid',
        attentionBid: 45,
      });
    }
  }

  return critiques;
}
