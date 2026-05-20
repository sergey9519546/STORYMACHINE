// Proof Kernel — runs the proof contract against a NarrativeTransitionIR.
// Tier 1: 8 hard-block proofs. Tier 2: 3 quality-gate proofs (flag, don't block).
// Tier 2 failures feed back into the GenerationSpec as additional constraints.

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
import { earnedRevealProof } from './tier1/earnedReveal.ts';
import { necessityProof } from './tier2/necessity.ts';
import { specificityProof } from './tier2/specificity.ts';
import { dialogueProof } from './tier2/dialogue.ts';

// The 8 Tier 1 hard-block proofs (Wave 1: 7 + Wave 3 B1: EarnedRevealProof).
// A transition that fails any of these must not become a StoryCommit.
export function runTier1(ir: NarrativeTransitionIR, state: NarrativeState): ProofResult[] {
  return [
    temporalProof(ir, state),
    causalProof(ir, state),
    intentionalProof(ir, state),
    mechanismProof(ir, state),
    epistemicProof(ir, state),
    continuityProof(ir, state),
    provenanceProof(ir, state),
    earnedRevealProof(ir, state),
  ];
}

export function tier1Passes(results: ProofResult[]): boolean {
  return results.every(r => r.pass);
}

export function failedProofs(results: ProofResult[]): ProofResult[] {
  return results.filter(r => !r.pass);
}

// Tier 2 quality-gate proofs — flag issues but do NOT block commit.
// Their failures are merged into the GenerationSpec as enriched constraints.
export function runTier2(ir: NarrativeTransitionIR, state: NarrativeState): ProofResult[] {
  return [
    necessityProof(ir, state),
    specificityProof(ir, state),
    dialogueProof(ir, state),
  ];
}

// Summarize Tier 2 as a 0–100 score: 100 when all pass; deduct 33 per failure.
export function tier2Score(results: ProofResult[]): number {
  const failures = results.filter(r => !r.pass).length;
  return Math.max(0, 100 - failures * Math.ceil(100 / results.length));
}
