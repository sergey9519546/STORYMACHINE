// Character-Advocate critic — protects psychological consistency.
// Objects to emotion states that contradict established character psychology,
// or belief updates that don't flow from the character's known epistemics.

import type { NarrativeTransitionIR } from '../../ir/NarrativeTransitionIR.ts';
import type { NarrativeState } from '../../state/NarrativeState.ts';
import type { Critique } from '../room.ts';

export function characterAdvocateCritic(ir: NarrativeTransitionIR, state: NarrativeState): Critique[] {
  const critiques: Critique[] = [];

  ir.ops.forEach((op, i) => {
    if (op.op === 'APPRAISE_EMOTION') {
      const prev = state.characterEmotions[op.charId];
      // Sudden full emotional reversal (e.g. pride → shame with no story event between).
      // Suppressed when the same IR contains a causal bridging event (ADD_FACT,
      // SHIFT_RELATIONSHIP, or UPDATE_BELIEF for this character) BEFORE this op —
      // those events explain the change without requiring an extra bridging scene.
      // An emotion reversal is suspicious if:
      // (a) the dominant changes AND the intensity delta is large (> 40) — sudden swing
      // (b) OR the dominant changes while intensity stays high (both > 60) — feels unearned
      // Suppress when the same IR already contains a causal bridging event before this op.
      const intensityDelta = prev ? Math.abs(op.emotion.intensity - prev.intensity) : 0;
      const bothHighIntensity = prev && prev.intensity > 60 && op.emotion.intensity > 60;
      const reversalSuspicious = prev && prev.dominant !== op.emotion.dominant &&
        (intensityDelta > 40 || bothHighIntensity);
      if (reversalSuspicious) {
        const hasBridgingEvent = ir.ops.slice(0, i).some(p =>
          p.op === 'ADD_FACT' ||
          (p.op === 'SHIFT_RELATIONSHIP' && p.pair.includes(op.charId)) ||
          (p.op === 'UPDATE_BELIEF' && p.charId === op.charId),
        );
        if (!hasBridgingEvent) {
          critiques.push({
            criticId: 'character_advocate', severity: 50, targetOpIdx: i,
            objection: `${op.charId} shifts from ${prev!.dominant}(${prev!.intensity}) to ${op.emotion.dominant}(${op.emotion.intensity}) — intensity delta ${intensityDelta} with no bridging beat`,
            suggestedOperator: 'deepen_wound',
            attentionBid: 55,
          });
        }
      }
      // Zero-intensity dominant is incoherent (also caught by lint, but critic flags it too)
      if (op.emotion.intensity === 0) {
        critiques.push({
          criticId: 'character_advocate', severity: 40, targetOpIdx: i,
          objection: `${op.charId} has dominant="${op.emotion.dominant}" but intensity=0 — emotion is empty`,
          suggestedOperator: 'deepen_wound',
          attentionBid: 35,
        });
      }
    }

    // Belief update: witnessed belief with no source_event_id
    if (op.op === 'UPDATE_BELIEF' && op.belief.source === 'witnessed' && !op.belief.source_event_id) {
      critiques.push({
        criticId: 'character_advocate', severity: 35, targetOpIdx: i,
        objection: `${op.charId} acquires a witnessed belief with no source_event_id — who witnessed what?`,
        suggestedOperator: 'inject_irony',
        attentionBid: 30,
      });
    }
  });

  return critiques;
}
