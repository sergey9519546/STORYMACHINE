// DialogueProof (Tier 2) — structural dialogue health: no monologues, no on-the-nose,
// no unmotivated reversals. Fails when more than 2 dialogue warnings fire.

import type { NarrativeTransitionIR } from '../../ir/NarrativeTransitionIR.ts';
import type { NarrativeState } from '../../state/NarrativeState.ts';
import type { ProofResult, ProofFinding } from '../contract.ts';
import { passResult, failResult } from '../contract.ts';
import { dialogueWarnings } from '../../quality/index.ts';

const MAX_WARNINGS = 2;

export function dialogueProof(
  ir: NarrativeTransitionIR,
  state: NarrativeState,
): ProofResult {
  const warnings = dialogueWarnings(ir, state);
  if (warnings.length <= MAX_WARNINGS) {
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
    `${warnings.length} dialogue violations (max ${MAX_WARNINGS}): ${warnings.map(w => w.rule).join(', ')}`,
    findings,
  );
}
