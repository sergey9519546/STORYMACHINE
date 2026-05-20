// NecessityProof (Tier 2) — every op must earn its place.
// Fails when necessityScore < 0.5, flagging redundant or padding ops.

import type { NarrativeTransitionIR } from '../../ir/NarrativeTransitionIR.ts';
import type { NarrativeState } from '../../state/NarrativeState.ts';
import type { ProofResult } from '../contract.ts';
import { passResult, failResult } from '../contract.ts';
import { necessityScore } from '../../quality/index.ts';

const NECESSITY_THRESHOLD = 0.5;

export function necessityProof(
  ir: NarrativeTransitionIR,
  _state: NarrativeState,
): ProofResult {
  const score = necessityScore(ir.ops);
  if (score >= NECESSITY_THRESHOLD) return passResult('NecessityProof', `necessity=${score.toFixed(2)}`);
  return failResult('NecessityProof', `necessity score ${score.toFixed(2)} below threshold ${NECESSITY_THRESHOLD}`, [
    {
      proof: 'NecessityProof',
      severity: 'flag',
      message: `Ops appear redundant or padded (necessity=${score.toFixed(2)}). Remove duplicate or undifferentiated ops; every op should shift a belief, emotion, relationship, or fact.`,
    },
  ]);
}
