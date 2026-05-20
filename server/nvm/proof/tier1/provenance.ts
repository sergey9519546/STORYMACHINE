// ProvenanceProof (Tier 1) — every transition is attributable: it carries a
// valid origin and a creation timestamp. Easy boolean check; CLEVER_MOVES §1.

import type { NarrativeTransitionIR, ProvenanceOrigin } from '../../ir/NarrativeTransitionIR.ts';
import type { NarrativeState } from '../../state/NarrativeState.ts';
import type { ProofResult, ProofFinding } from '../contract.ts';
import { passResult, failResult } from '../contract.ts';

const VALID_ORIGINS: ReadonlySet<ProvenanceOrigin> = new Set<ProvenanceOrigin>([
  'user_authored', 'model_generated', 'model_rewritten', 'model_edited_by_user',
]);

export function provenanceProof(ir: NarrativeTransitionIR, _state: NarrativeState): ProofResult {
  const findings: ProofFinding[] = [];
  if (!VALID_ORIGINS.has(ir.provenance.origin)) {
    findings.push({
      proof: 'ProvenanceProof', severity: 'block',
      message: `transition has invalid provenance origin "${ir.provenance.origin}"`,
      subjectId: ir.transitionId,
    });
  }
  if (!(ir.provenance.createdAt > 0)) {
    findings.push({
      proof: 'ProvenanceProof', severity: 'block',
      message: 'transition has no creation timestamp',
      subjectId: ir.transitionId,
    });
  }
  return findings.length
    ? failResult('ProvenanceProof', 'transition is not attributable', findings)
    : passResult('ProvenanceProof');
}
