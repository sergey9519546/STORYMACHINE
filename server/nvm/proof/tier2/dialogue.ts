// DialogueProof (Tier 2) — structural dialogue health: no monologues, no on-the-nose,
// no unmotivated reversals. Threshold scales with scene complexity: 2 for small scenes,
// up to 4 for large ones, so that complex scenes aren't unfairly penalised.

import type { NarrativeTransitionIR } from '../../ir/NarrativeTransitionIR.ts';
import type { NarrativeState } from '../../state/NarrativeState.ts';
import type { ProofResult, ProofFinding } from '../contract.ts';
import { passResult, failResult } from '../contract.ts';
import { dialogueWarnings } from '../../quality/index.ts';

export function dialogueProof(
  ir: NarrativeTransitionIR,
  state: NarrativeState,
): ProofResult {
  // Allow more warnings in larger scenes: floor(ops/5), clamped to [2, 4].
  const maxWarnings = Math.min(4, Math.max(2, Math.floor(ir.ops.length / 5)));
  const warnings = dialogueWarnings(ir, state);
  if (warnings.length <= maxWarnings) {
    return passResult('DialogueProof', `${warnings.length} warning(s) — within limit`);
  }
  const findings: ProofFinding[] = warnings.map(w => ({
    proof: 'DialogueProof' as const,
    severity: 'flag' as const,
    message: w.message,
    subjectId: w.rule,
  }));
  return failResult(
    'DialogueProof',
    `${warnings.length} dialogue violations (max ${maxWarnings}): ${warnings.map(w => w.rule).join(', ')}`,
    findings,
  );
}
