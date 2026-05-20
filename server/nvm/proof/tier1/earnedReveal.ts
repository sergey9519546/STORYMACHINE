// EarnedRevealProof (Tier 1) — a PAYOFF_SETUP op governed by a RevealPlan is
// blocked until every required clue ID has been seeded in narrative state.
// An unearned twist cannot become canon. Deterministic.

import type { NarrativeTransitionIR } from '../../ir/NarrativeTransitionIR.ts';
import type { NarrativeState } from '../../state/NarrativeState.ts';
import type { ProofResult, ProofFinding } from '../contract.ts';
import { passResult, failResult } from '../contract.ts';

export function earnedRevealProof(ir: NarrativeTransitionIR, state: NarrativeState): ProofResult {
  if (!ir.revealPlans || ir.revealPlans.length === 0) return passResult('EarnedRevealProof');

  const seededClueIds = new Set(state.clues.map(c => c.clueId));
  const findings: ProofFinding[] = [];

  for (const plan of ir.revealPlans) {
    // Check whether this IR actually contains the PAYOFF_SETUP for this plan
    const hasPayoff = ir.ops.some(
      op => op.op === 'PAYOFF_SETUP' && op.setupId === plan.payoffSetupId,
    );
    if (!hasPayoff) continue; // plan exists but payoff op not in this IR — skip

    for (const clueId of plan.requiredClueIds) {
      if (!seededClueIds.has(clueId)) {
        findings.push({
          proof: 'EarnedRevealProof', severity: 'block',
          message: `reveal "${plan.revealId}" fires PAYOFF_SETUP "${plan.payoffSetupId}" but required clue "${clueId}" has not been seeded`,
          subjectId: clueId,
        });
      }
    }
  }

  return findings.length
    ? failResult('EarnedRevealProof', 'reveal fires before required clues are committed', findings)
    : passResult('EarnedRevealProof');
}
