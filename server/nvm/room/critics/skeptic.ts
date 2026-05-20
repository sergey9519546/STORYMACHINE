// Skeptic critic — pokes holes in motivation and plausibility.
// Objects to large belief changes without evidence, high-confidence told-beliefs,
// and relationship shifts that outrun their causal basis.

import type { NarrativeTransitionIR } from '../../ir/NarrativeTransitionIR.ts';
import type { NarrativeState } from '../../state/NarrativeState.ts';
import type { Critique } from '../room.ts';

export function skepticCritic(ir: NarrativeTransitionIR, _state: NarrativeState): Critique[] {
  const critiques: Critique[] = [];

  ir.ops.forEach((op, i) => {
    // High-confidence told-belief is suspicious
    if (op.op === 'UPDATE_BELIEF' && op.belief.source === 'told' && op.belief.confidence > 0.9) {
      critiques.push({
        criticId: 'skeptic', severity: 50, targetOpIdx: i,
        objection: `${op.charId} instantly believes a told fact at confidence ${op.belief.confidence} — implausibly credulous`,
        suggestedOperator: 'complicate_relationship',
        attentionBid: 55,
      });
    }

    // Large relationship leap without causal link
    if (op.op === 'SHIFT_RELATIONSHIP' && Math.abs(op.delta.amount) > 0.6) {
      const hasLink = (ir.causalLinks ?? []).some(l => l.opIdx === i);
      if (!hasLink) {
        critiques.push({
          criticId: 'skeptic', severity: 45, targetOpIdx: i,
          objection: `SHIFT_RELATIONSHIP amount=${op.delta.amount.toFixed(2)} is large but no causalLink backs it`,
          suggestedOperator: 'complicate_relationship',
          attentionBid: 40,
        });
      }
    }
  });

  // Too many ops for one scene — crowded, implausible pacing
  if (ir.ops.length > 8) {
    critiques.push({
      criticId: 'skeptic', severity: 35, targetOpIdx: null,
      objection: `Scene has ${ir.ops.length} ops — too crowded for a single narrative beat`,
      suggestedOperator: 'cut_on_the_nose',
      attentionBid: 30,
    });
  }

  return critiques;
}
