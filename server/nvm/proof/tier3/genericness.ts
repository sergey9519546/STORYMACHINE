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
  const ids = new Set<string>([
    ...Object.keys(state.characterBeliefs),
    ...Object.keys(state.characterEmotions),
  ]);
  for (const k of Object.keys(state.relationships)) {
    // Validate key format (expected: "charA|charB") before splitting
    const parts = k.split('|');
    if (parts.length === 2) { ids.add(parts[0]); ids.add(parts[1]); }
  }
  return ids;
}

export function genericnessProof(
  ir: NarrativeTransitionIR,
  state: NarrativeState,
): ProofResult {
  const known = knownCharIds(state);
  // Use a Set so each distinct character ID is counted once, regardless of how many
  // ops reference them. A SHIFT_RELATIONSHIP between two characters still counts as
  // 2 distinct char refs — but repeated ops on the same character don't inflate the total.
  const charRefSet = new Set<string>();

  for (const op of ir.ops) {
    if (op.op === 'UPDATE_BELIEF' || op.op === 'APPRAISE_EMOTION') charRefSet.add(op.charId);
    else if (op.op === 'SHIFT_RELATIONSHIP') { charRefSet.add(op.pair[0]); charRefSet.add(op.pair[1]); }
  }

  if (charRefSet.size === 0) return passResult('GenericnessProof', 'no character ops to evaluate');

  const charRefs = [...charRefSet];
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
