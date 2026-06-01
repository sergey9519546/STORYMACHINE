// Skeptic critic — pokes holes in motivation and plausibility.
// Objects to large belief changes without evidence, high-confidence told-beliefs,
// and relationship shifts that outrun their causal basis.

import type { NarrativeTransitionIR } from '../../ir/NarrativeTransitionIR.ts';
import type { NarrativeState } from '../../state/NarrativeState.ts';
import type { Critique } from '../room.ts';

export function skepticCritic(ir: NarrativeTransitionIR, state: NarrativeState): Critique[] {
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

    // Belief reversal without evidential anchor: character already has established beliefs,
    // but this scene updates them via a told source at high confidence (0.75–0.90)
    // with no ADD_FACT or SHIFT_RELATIONSHIP bridging event before this op.
    // The "> 0.9" check above handles the most egregious case; this catches the mid range.
    if (
      op.op === 'UPDATE_BELIEF' &&
      op.belief.source === 'told' &&
      op.belief.confidence >= 0.75 && op.belief.confidence <= 0.9
    ) {
      const charHasExistingBeliefs = (state.characterBeliefs[op.charId] ?? []).length > 0;
      if (charHasExistingBeliefs) {
        const hasEvidentialAnchor = ir.ops.slice(0, i).some(p =>
          p.op === 'ADD_FACT' ||
          (p.op === 'SHIFT_RELATIONSHIP' && p.pair.includes(op.charId)),
        );
        if (!hasEvidentialAnchor) {
          critiques.push({
            criticId: 'skeptic', severity: 40, targetOpIdx: i,
            objection: `${op.charId} updates a told-belief at confidence ${op.belief.confidence.toFixed(2)} despite having no new factual or relational anchor in this scene — where did this certainty come from?`,
            suggestedOperator: 'inject_irony',
            attentionBid: 45,
          });
        }
      }
    }

    // Large relationship leap without causal link
    if (op.op === 'SHIFT_RELATIONSHIP' && Math.abs(op.delta.amount) > 0.6) {
      const hasLink = (ir.causalLinks ?? []).some(l => l.opIdx === i && l.causedBy.length > 0);
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

  // Duplicate clock escalation: same clockId raised more than once in one IR.
  // One scene can't plausibly tick the same clock twice without any reaction.
  const clockRaises = ir.ops.filter(
    (op): op is Extract<typeof op, { op: 'RAISE_CLOCK' }> => op.op === 'RAISE_CLOCK',
  );
  const clockSeenIds = new Set<string>();
  for (const c of clockRaises) {
    if (clockSeenIds.has(c.clockId)) {
      critiques.push({
        criticId: 'skeptic', severity: 40, targetOpIdx: null,
        objection: `RAISE_CLOCK "${c.clockId}" fires twice in one scene — implausible double-escalation of the same pressure`,
        suggestedOperator: 'raise_stakes',
        attentionBid: 45,
      });
      break; // one warning per scene is enough
    }
    clockSeenIds.add(c.clockId);
  }

  return critiques;
}
