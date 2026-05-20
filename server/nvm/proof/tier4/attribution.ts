// AttributionProof (Tier 4 — Ethics & Disclosure) — monitors that model-generated
// IRs which declare causal links actually cite existing facts/beliefs/chars.
// An IR with causalLinks but empty `causedBy` arrays claims causation without
// evidence — a form of confabulation that must be disclosed to the writer.

import type { NarrativeTransitionIR } from '../../ir/NarrativeTransitionIR.ts';
import type { NarrativeState } from '../../state/NarrativeState.ts';
import type { ProofResult } from '../contract.ts';
import { passResult, failResult } from '../contract.ts';

export function attributionProof(
  ir: NarrativeTransitionIR,
  _state: NarrativeState,
): ProofResult {
  // Only audit model-generated IRs that declare causal links
  if (ir.provenance.origin === 'user_authored') {
    return passResult('AttributionProof', 'user-authored — attribution not required');
  }
  if (!ir.causalLinks || ir.causalLinks.length === 0) {
    return passResult('AttributionProof', 'no causal links declared — nothing to audit');
  }

  const emptyCauses = ir.causalLinks.filter(cl => cl.causedBy.length === 0);
  if (emptyCauses.length === 0) {
    return passResult('AttributionProof', `all ${ir.causalLinks.length} causal links cite evidence`);
  }

  return failResult('AttributionProof',
    `${emptyCauses.length}/${ir.causalLinks.length} causal link(s) have empty causedBy — undisclosed confabulation`, [
    ...emptyCauses.map(cl => ({
      proof: 'AttributionProof' as const,
      severity: 'info' as const,
      message: `Op[${cl.opIdx}] declares a causal link but cites no supporting fact/belief/char IDs. Add causedBy entries or remove the causalLink declaration.`,
      subjectId: String(cl.opIdx),
    })),
  ]);
}
