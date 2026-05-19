// Proof Kernel — runs the proof contract against a NarrativeTransitionIR.
// Wave 1 ships Tier 1 (7 deterministic hard-block proofs). Tier 2-4 land in
// later waves and append to runProofs without changing this signature.

import type { NarrativeTransitionIR } from '../ir/NarrativeTransitionIR.ts';
import type { NarrativeState } from '../state/NarrativeState.ts';
import type { ProofResult } from './contract.ts';
import { temporalProof } from './tier1/temporal.ts';
import { causalProof } from './tier1/causal.ts';
import { intentionalProof } from './tier1/intentional.ts';
import { mechanismProof } from './tier1/mechanism.ts';
import { epistemicProof } from './tier1/epistemic.ts';
import { continuityProof } from './tier1/continuity.ts';
import { provenanceProof } from './tier1/provenance.ts';

// The 7 Tier 1 hard-block proofs. A transition that fails any of these must not
// become a StoryCommit.
export function runTier1(ir: NarrativeTransitionIR, state: NarrativeState): ProofResult[] {
  return [
    temporalProof(ir, state),
    causalProof(ir, state),
    intentionalProof(ir, state),
    mechanismProof(ir, state),
    epistemicProof(ir, state),
    continuityProof(ir, state),
    provenanceProof(ir, state),
  ];
}

export function tier1Passes(results: ProofResult[]): boolean {
  return results.every(r => r.pass);
}

export function failedProofs(results: ProofResult[]): ProofResult[] {
  return results.filter(r => !r.pass);
}
