// IntentionalProof (Tier 1) — every character an op acts on/through must be
// grounded in the narrative (present in state, or introduced by this IR).
// An op referencing an unknown character is a puppet move. Deterministic.

import type { NarrativeTransitionIR } from '../../ir/NarrativeTransitionIR.ts';
import type { NarrativeState } from '../../state/NarrativeState.ts';
import type { StoryOp } from '../../ops/StoryOp.ts';
import type { ProofResult, ProofFinding } from '../contract.ts';
import { passResult, failResult } from '../contract.ts';

/**
 * The character ids an op acts on or through.
 *
 * EXPORTED (2026-09-19, typesafe-cast-alignment lane) so the cast-alignment
 * step in server/nvm/converge/cast-alignment.ts walks ops with THIS definition
 * rather than a second copy of it. Behaviour unchanged.
 */
export function charsReferenced(op: StoryOp): string[] {
  if (op.op === 'UPDATE_BELIEF' || op.op === 'APPRAISE_EMOTION') return [op.charId];
  if (op.op === 'SHIFT_RELATIONSHIP') return [op.pair[0], op.pair[1]];
  return [];
}

/**
 * Every character this IR may legally reference: grounded in state (it holds a
 * belief or an emotion), or grounded BY this IR (an UPDATE_BELIEF anywhere in
 * it — emotion and relationship ops only reference, they do not introduce).
 *
 * EXPORTED (2026-09-19, typesafe-cast-alignment lane) for the same reason as
 * charsReferenced above: the alignment step's notion of "this name is not in the
 * cast" has to be the SAME set this proof blocks on, or the two drift and the
 * alignment starts rewriting names the proof was never going to block (or
 * leaving ones it will). It is a pure extraction — intentionalProof() below
 * calls it and its decision logic is byte-for-byte what it was.
 */
export function knownCharacters(ir: NarrativeTransitionIR, state: NarrativeState): Set<string> {
  const known = new Set<string>([
    ...Object.keys(state.characterBeliefs),
    ...Object.keys(state.characterEmotions),
  ]);
  for (const op of ir.ops) {
    if (op.op === 'UPDATE_BELIEF') known.add(op.charId);
  }
  return known;
}

export function intentionalProof(ir: NarrativeTransitionIR, state: NarrativeState): ProofResult {
  const known = knownCharacters(ir, state);

  const findings: ProofFinding[] = [];
  ir.ops.forEach((op, i) => {
    for (const charId of charsReferenced(op)) {
      if (!known.has(charId)) {
        findings.push({
          proof: 'IntentionalProof', severity: 'block',
          message: `op[${i}] ${op.op} references ungrounded character "${charId}"`,
          subjectId: charId,
          opIdx: i,  // M7: structured field — don't parse from message
        });
      }
    }
  });
  return findings.length
    ? failResult('IntentionalProof', 'an op acts on a character not in the narrative', findings)
    : passResult('IntentionalProof');
}
