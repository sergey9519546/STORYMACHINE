// SpecificityProof (Tier 2) — ops must name concrete subjects, not vague generics.
// Fails when specificityScore < 0.4, prompting the LLM to add concrete detail.

import type { NarrativeTransitionIR } from '../../ir/NarrativeTransitionIR.ts';
import type { NarrativeState } from '../../state/NarrativeState.ts';
import type { ProofResult } from '../contract.ts';
import { passResult, failResult } from '../contract.ts';
import { specificityScore } from '../../quality/index.ts';

const SPECIFICITY_THRESHOLD = 0.4;

export function specificityProof(
  ir: NarrativeTransitionIR,
  _state: NarrativeState,
): ProofResult {
  const score = specificityScore(ir.ops);
  if (score >= SPECIFICITY_THRESHOLD) return passResult('SpecificityProof', `specificity=${score.toFixed(2)}`);
  return failResult('SpecificityProof', `specificity score ${score.toFixed(2)} below threshold ${SPECIFICITY_THRESHOLD}`, [
    {
      proof: 'SpecificityProof',
      severity: 'flag',
      message: `Ops are too vague (specificity=${score.toFixed(2)}). Use concrete fact IDs, named characters, and specific claim IDs — avoid generic "event" or "thing" placeholders.`,
    },
  ]);
}
