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

  // Narrative neglect: after scene 4, if a well-established character (≥3 beliefs in state)
  // is absent from all ops in a substantive scene (≥4 ops), they're being forgotten.
  // The story is losing track of a character it invested in building.
  if (ir.sceneIdx > 4 && ir.ops.length >= 4) {
    const scenePresentChars = new Set<string>();
    for (const op of ir.ops) {
      if ('charId' in op) scenePresentChars.add((op as { charId: string }).charId);
      if (op.op === 'SHIFT_RELATIONSHIP') { scenePresentChars.add(op.pair[0]); scenePresentChars.add(op.pair[1]); }
    }
    for (const [charId, beliefs] of Object.entries(state.characterBeliefs)) {
      if (beliefs.length >= 3 && !scenePresentChars.has(charId)) {
        critiques.push({
          criticId: 'character_advocate', severity: 30, targetOpIdx: null,
          objection: `${charId} has ${beliefs.length} established beliefs but appears in no ops — narratively neglected in a ${ir.ops.length}-op scene`,
          suggestedOperator: 'complicate_relationship',
          attentionBid: 35,
        });
        break; // flag at most one neglected character per scene to avoid noise
      }
    }
  }

  // Cognition-emotion alignment: high-confidence belief + shame/distress in same IR
  // without a motivating bridging event = disconnected psychology.
  const SHAME_EMOTIONS = new Set(['shame', 'distress']);
  const charHighConfidenceBeliefOpIdx = new Map<string, number>();
  ir.ops.forEach((op, i) => {
    if (op.op === 'UPDATE_BELIEF' && op.belief.confidence > 0.85) {
      charHighConfidenceBeliefOpIdx.set(op.charId, i);
    }
    if (op.op === 'APPRAISE_EMOTION' && SHAME_EMOTIONS.has(op.emotion.dominant) && op.emotion.intensity > 60) {
      const beliefIdx = charHighConfidenceBeliefOpIdx.get(op.charId);
      if (beliefIdx !== undefined) {
        const hasBridging = ir.ops.slice(beliefIdx + 1, i).some(
          b => b.op === 'SHIFT_RELATIONSHIP' || b.op === 'PAYOFF_SETUP',
        );
        if (!hasBridging) {
          critiques.push({
            criticId: 'character_advocate', severity: 40, targetOpIdx: i,
            objection: `${op.charId} declares high-confidence belief then feels ${op.emotion.dominant}(${op.emotion.intensity}) — cognition and emotion are disconnected; either the shame should motivate doubt, or add a bridging event that earns both`,
            suggestedOperator: 'deepen_wound',
            attentionBid: 45,
          });
        }
      }
    }
  });

  return critiques;
}
