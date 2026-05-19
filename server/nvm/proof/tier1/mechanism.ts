// MechanismProof (Tier 1) — a transition must operate at least one mechanism,
// and every named mechanism must resolve to a loaded .mech.json schema.
// Deterministic predicate eval; CLEVER_MOVES §1.

import type { NarrativeTransitionIR } from '../../ir/NarrativeTransitionIR.ts';
import type { NarrativeState } from '../../state/NarrativeState.ts';
import type { ProofResult, ProofFinding } from '../contract.ts';
import { passResult, failResult } from '../contract.ts';
import { loadMechanismsCached } from '../../mechanisms/loader.ts';

export function mechanismProof(ir: NarrativeTransitionIR, _state: NarrativeState): ProofResult {
  const findings: ProofFinding[] = [];

  if (ir.activeMechanisms.length === 0) {
    findings.push({
      proof: 'MechanismProof', severity: 'block',
      message: `scene ${ir.sceneIdx} operates no mechanism`,
      subjectId: ir.transitionId,
    });
  } else {
    const known = loadMechanismsCached();
    for (const id of ir.activeMechanisms) {
      if (!known.has(id)) {
        findings.push({
          proof: 'MechanismProof', severity: 'block',
          message: `unknown mechanism "${id}" — no matching .mech.json`,
          subjectId: id,
        });
      }
    }
  }
  return findings.length
    ? failResult('MechanismProof', 'mechanism missing or unresolved', findings)
    : passResult('MechanismProof');
}
