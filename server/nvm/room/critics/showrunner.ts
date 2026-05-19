// Showrunner critic — enforces series-level coherence and scene pacing.
// Objects to scenes that don't advance the central dramatic question,
// or that repeat the same emotional register as the previous scene.

import type { NarrativeTransitionIR } from '../../ir/NarrativeTransitionIR.ts';
import type { NarrativeState } from '../../state/NarrativeState.ts';
import type { Critique } from '../room.ts';

export function showrunnerCritic(ir: NarrativeTransitionIR, state: NarrativeState): Critique[] {
  const critiques: Critique[] = [];

  // Gate 1: scene should have postconditions (else it's a placeholder)
  if (ir.postconditions.length === 0) {
    critiques.push({
      criticId: 'showrunner', severity: 55, targetOpIdx: null,
      objection: 'Scene declares no postconditions — unclear what changed dramatically',
      suggestedOperator: 'raise_stakes',
      attentionBid: 60,
    });
  }

  // Gate 2: if build_tension scene has no RAISE_CLOCK or SHIFT_RELATIONSHIP, query it
  if (ir.sceneFunction === 'build_tension') {
    const hasStakeRaiser = ir.ops.some(op =>
      op.op === 'RAISE_CLOCK' || op.op === 'SHIFT_RELATIONSHIP',
    );
    if (!hasStakeRaiser) {
      critiques.push({
        criticId: 'showrunner', severity: 40, targetOpIdx: null,
        objection: '"build_tension" scene has no clock or relationship shift — tension not mechanically rising',
        suggestedOperator: 'raise_stakes',
        attentionBid: 45,
      });
    }
  }

  // Gate 3: theme argument should advance in set_up_payoff or advance_plot scenes
  const themeScenes: NarrativeTransitionIR['sceneFunction'][] = ['advance_plot', 'set_up_payoff'];
  if (themeScenes.includes(ir.sceneFunction) && state.authorIntent.theme) {
    const hasThemeOp = ir.ops.some(op => op.op === 'ADVANCE_THEME_ARGUMENT');
    if (!hasThemeOp) {
      critiques.push({
        criticId: 'showrunner', severity: 30, targetOpIdx: null,
        objection: `Scene "${ir.sceneFunction}" should advance the theme ("${state.authorIntent.theme}") but has no ADVANCE_THEME_ARGUMENT`,
        suggestedOperator: 'sharpen_theme',
        attentionBid: 35,
      });
    }
  }

  return critiques;
}
