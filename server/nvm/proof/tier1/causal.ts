// CausalProof (Tier 1) — a non-initial transition must be causally grounded.
// Every scene after the first that changes state must declare ≥1 precondition
// (its causal predecessor). Deterministic; CLEVER_MOVES §1.

import type { NarrativeTransitionIR } from '../../ir/NarrativeTransitionIR.ts';
import type { NarrativeState } from '../../state/NarrativeState.ts';
import type { ProofResult } from '../contract.ts';
import { passResult, failResult } from '../contract.ts';

export function causalProof(ir: NarrativeTransitionIR, _state: NarrativeState): ProofResult {
  const isInitial = ir.sceneIdx === 0;
  const changesState = ir.ops.length > 0;
  if (isInitial || !changesState || ir.preconditions.length > 0) {
    return passResult('CausalProof');
  }
  return failResult('CausalProof', 'non-initial transition has no causal predecessor', [{
    proof: 'CausalProof', severity: 'block',
    message: `scene ${ir.sceneIdx} changes state but declares no preconditions`,
    subjectId: ir.transitionId,
  }]);
}
