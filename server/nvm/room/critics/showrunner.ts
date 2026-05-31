// Showrunner critic — enforces series-level coherence and scene pacing.
// Objects to scenes that don't advance the central dramatic question,
// or that repeat the same emotional register as the previous scene.

import type { NarrativeTransitionIR } from '../../ir/NarrativeTransitionIR.ts';
import type { NarrativeState } from '../../state/NarrativeState.ts';
import type { Critique } from '../room.ts';

export function showrunnerCritic(ir: NarrativeTransitionIR, state: NarrativeState): Critique[] {
  const critiques: Critique[] = [];

  // Gate 1: plot-advancing scenes should have postconditions (else they're placeholders).
  // Exposition and world-building scenes don't require them.
  const requiresPostconditions: NarrativeTransitionIR['sceneFunction'][] = ['advance_plot', 'build_tension', 'set_up_payoff'];
  if (requiresPostconditions.includes(ir.sceneFunction) && ir.postconditions.length === 0) {
    critiques.push({
      criticId: 'showrunner', severity: 55, targetOpIdx: null,
      objection: `"${ir.sceneFunction}" scene declares no postconditions — unclear what changed dramatically`,
      suggestedOperator: 'raise_stakes',
      attentionBid: 60,
    });
  }

  // Gate 1b: set_up_payoff scenes must have an actual SEED_CLUE or PAYOFF_SETUP op —
  // postconditions alone don't prove a clue was planted or paid off.
  if (ir.sceneFunction === 'set_up_payoff') {
    const hasPayoffOp = ir.ops.some(op => op.op === 'SEED_CLUE' || op.op === 'PAYOFF_SETUP');
    if (!hasPayoffOp) {
      critiques.push({
        criticId: 'showrunner', severity: 50, targetOpIdx: null,
        objection: '"set_up_payoff" scene has no SEED_CLUE or PAYOFF_SETUP op — the payoff architecture is asserted but not built',
        suggestedOperator: 'raise_stakes',
        attentionBid: 55,
      });
    }
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
  if (themeScenes.includes(ir.sceneFunction) && state.authorIntent.theme?.trim()) {
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

  // Gate 4: provide_relief scenes shouldn't escalate pressure (contradictory signal).
  // A scene labelled as relief but containing RAISE_CLOCK confuses the emotional register —
  // the audience can't decompress while a countdown is being raised.
  if (ir.sceneFunction === 'provide_relief') {
    const hasEscalation = ir.ops.some(op => op.op === 'RAISE_CLOCK');
    if (hasEscalation) {
      critiques.push({
        criticId: 'showrunner', severity: 45, targetOpIdx: null,
        objection: '"provide_relief" scene contains RAISE_CLOCK — contradicts the relief function; audience cannot decompress under an escalating clock',
        suggestedOperator: 'cut_on_the_nose',
        attentionBid: 50,
      });
    }
  }

  return critiques;
}
