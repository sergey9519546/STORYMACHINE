// GenericnessProof (Tier 3) — ranking signal: flags scenes where character-referencing
// ops name characters that don't exist in the known state (anonymous/invented references).
// A scene that mostly invents new characters rather than deepening known ones is generic.

import type { NarrativeTransitionIR } from '../../ir/NarrativeTransitionIR.ts';
import type { NarrativeState } from '../../state/NarrativeState.ts';
import type { ProofResult } from '../contract.ts';
import { passResult, failResult } from '../contract.ts';

// Threshold: if >50% of char-referencing ops name unknown characters → generic
const GENERICNESS_THRESHOLD = 0.5;

function knownCharIds(state: NarrativeState): Set<string> {
  return new Set([
    ...Object.keys(state.characterBeliefs),
    ...Object.keys(state.characterEmotions),
    ...Object.keys(state.relationships).flatMap(k => k.split('|')),
  ]);
}

export function genericnessProof(
  ir: NarrativeTransitionIR,
  state: NarrativeState,
): ProofResult {
  const known = knownCharIds(state);
  const charRefs: string[] = [];

  for (const op of ir.ops) {
    if (op.op === 'UPDATE_BELIEF' || op.op === 'APPRAISE_EMOTION') charRefs.push(op.charId);
    else if (op.op === 'SHIFT_RELATIONSHIP') { charRefs.push(op.pair[0]); charRefs.push(op.pair[1]); }
  }

  if (charRefs.length === 0) return passResult('GenericnessProof', 'no character ops to evaluate');

  const unknownCount = charRefs.filter(c => !known.has(c)).length;
  const unknownFraction = unknownCount / charRefs.length;

  if (unknownFraction <= GENERICNESS_THRESHOLD) {
    return passResult('GenericnessProof', `genericness=${unknownFraction.toFixed(2)} — scene deepens known characters`);
  }
  return failResult('GenericnessProof',
    `genericness=${unknownFraction.toFixed(2)} — ${unknownCount}/${charRefs.length} char refs are anonymous`, [
    {
      proof: 'GenericnessProof',
      severity: 'info',
      message: `Scene introduces too many unnamed characters (${unknownCount}/${charRefs.length}). Prefer ops on characters already in state.`,
    },
  ]);
}
