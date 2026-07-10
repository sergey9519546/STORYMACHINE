// Pacing-Editor critic — a picture editor's eye for rhythm. Objects to scenes
// that are too thin to earn the beat they claim, to emotion beats that land
// with zero modulation inside one scene, and to a mechanism:rule signature
// that keeps recurring across the whole story so far — the engine cutting
// the same shape of scene over and over with new names painted on it.

import type { NarrativeTransitionIR } from '../../ir/NarrativeTransitionIR.ts';
import type { NarrativeState } from '../../state/NarrativeState.ts';
import type { Critique } from '../room.ts';

// Scene functions where the audience expects rising or turning material —
// a scene claiming one of these needs enough ops to actually earn it.
const URGENCY_FUNCTIONS: NarrativeTransitionIR['sceneFunction'][] = [
  'advance_plot', 'build_tension', 'set_up_payoff',
];

export function pacingEditorCritic(ir: NarrativeTransitionIR, state: NarrativeState): Critique[] {
  const critiques: Critique[] = [];

  // Gate 1: dead stretch — a plot/tension/payoff scene with ≤1 op has almost
  // no material. A picture editor can't build rhythm out of a single shot.
  if (URGENCY_FUNCTIONS.includes(ir.sceneFunction) && ir.ops.length <= 1) {
    critiques.push({
      criticId: 'pacing_editor', severity: 35, targetOpIdx: null,
      objection: `"${ir.sceneFunction}" scene has only ${ir.ops.length} op(s) — the cut has no pulse here, there's nothing to build a rhythm from`,
      suggestedOperator: 'pacing_compress',
      attentionBid: 40,
    });
  }

  // Gate 2: flat energy — two emotion beats in the same scene land at the
  // identical dominant + intensity. Same size, same shape, back to back.
  const emotionOps = ir.ops
    .map((op, i) => ({ op, i }))
    .filter((x): x is { op: Extract<typeof x.op, { op: 'APPRAISE_EMOTION' }>; i: number } =>
      x.op.op === 'APPRAISE_EMOTION');
  outer:
  for (let a = 0; a < emotionOps.length; a++) {
    for (let b = a + 1; b < emotionOps.length; b++) {
      const eA = emotionOps[a].op.emotion;
      const eB = emotionOps[b].op.emotion;
      if (eA.dominant === eB.dominant && eA.intensity === eB.intensity) {
        critiques.push({
          criticId: 'pacing_editor', severity: 30, targetOpIdx: emotionOps[b].i,
          objection: `Two emotion beats in this scene both land at ${eA.dominant}(${eA.intensity}) — same size, same shape, no modulation between them`,
          suggestedOperator: 'pacing_compress',
          attentionBid: 30,
        });
        break outer;
      }
    }
  }

  // Gate 3: mechanical monotony — this scene's mechanism:rule signature has
  // now fired 4+ times across the story so far (prior scenes via
  // state.firedRules, plus this scene's own TRIGGER_RULE ops). A repeating
  // engine signature is a repeating beat shape.
  const currentRuleKeys = ir.ops
    .filter((op): op is Extract<typeof op, { op: 'TRIGGER_RULE' }> => op.op === 'TRIGGER_RULE')
    .map(op => `${op.mechanismId}:${op.ruleId}`);
  if (currentRuleKeys.length > 0) {
    const counts = new Map<string, number>();
    for (const k of [...state.firedRules, ...currentRuleKeys]) counts.set(k, (counts.get(k) ?? 0) + 1);
    for (const key of currentRuleKeys) {
      const total = counts.get(key) ?? 0;
      if (total >= 4) {
        critiques.push({
          criticId: 'pacing_editor', severity: 30, targetOpIdx: null,
          objection: `"${key}" has now fired ${total} times across the story so far — the engine keeps producing the same beat shape; vary the mechanism mix`,
          suggestedOperator: 'weird_but_valid',
          attentionBid: 35,
        });
        break;
      }
    }
  }

  return critiques;
}
