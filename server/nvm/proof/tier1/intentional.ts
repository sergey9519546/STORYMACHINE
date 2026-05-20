// IntentionalProof (Tier 1) — every character an op acts on/through must be
// grounded in the narrative (present in state, or introduced by this IR).
// An op referencing an unknown character is a puppet move. Deterministic.

import type { NarrativeTransitionIR } from '../../ir/NarrativeTransitionIR.ts';
import type { NarrativeState } from '../../state/NarrativeState.ts';
import type { StoryOp } from '../../ops/StoryOp.ts';
import type { ProofResult, ProofFinding } from '../contract.ts';
import { passResult, failResult } from '../contract.ts';

function charsReferenced(op: StoryOp): string[] {
  if (op.op === 'UPDATE_BELIEF' || op.op === 'APPRAISE_EMOTION') return [op.charId];
  if (op.op === 'SHIFT_RELATIONSHIP') return [op.pair[0], op.pair[1]];
  return [];
}

export function intentionalProof(ir: NarrativeTransitionIR, state: NarrativeState): ProofResult {
  const known = new Set<string>([
    ...Object.keys(state.characterBeliefs),
    ...Object.keys(state.characterEmotions),
  ]);
  // A character is grounded once it acquires a belief — in state, or via an
  // UPDATE_BELIEF anywhere in this IR. Emotion / relationship ops only reference.
  for (const op of ir.ops) {
    if (op.op === 'UPDATE_BELIEF') known.add(op.charId);
  }

  const findings: ProofFinding[] = [];
  ir.ops.forEach((op, i) => {
    for (const charId of charsReferenced(op)) {
      if (!known.has(charId)) {
        findings.push({
          proof: 'IntentionalProof', severity: 'block',
          message: `op[${i}] ${op.op} references ungrounded character "${charId}"`,
          subjectId: charId,
        });
      }
    }
  });
  return findings.length
    ? failResult('IntentionalProof', 'an op acts on a character not in the narrative', findings)
    : passResult('IntentionalProof');
}
