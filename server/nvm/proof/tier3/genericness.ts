// GenericnessProof (Tier 3) — ranking signal: flags scenes where character-referencing
// ops name characters that don't exist in the known state (anonymous/invented references).
// A scene that mostly invents new characters rather than deepening known ones is generic.
// Also flags ADD_FACT ops whose subject or object use vague placeholder world terms.

import type { NarrativeTransitionIR } from '../../ir/NarrativeTransitionIR.ts';
import type { NarrativeState } from '../../state/NarrativeState.ts';
import type { ProofResult } from '../contract.ts';
import { passResult, failResult } from '../contract.ts';

// Threshold: if >50% of char-referencing ops name unknown characters → generic
const GENERICNESS_THRESHOLD = 0.5;

// World-fact vagueness: subject/object values that indicate the LLM invented a
// placeholder rather than a specific named location, person, or object.
const VAGUE_WORLD_TERMS = new Set([
  'the city', 'somewhere', 'a place', 'the town', 'the building', 'unknown',
  'someone', 'the person', 'a stranger', 'an unknown', 'the thing', 'something',
  'the area', 'the location', 'a location', 'the world', 'everything', 'nothing',
  'some place', 'a building', 'the house', 'a house', 'some building',
]);

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

  // Check vague world facts even when there are no character-referencing ops
  if (charRefSet.size === 0) {
    const vagueFactsOnly = ir.ops.filter(op => {
      if (op.op !== 'ADD_FACT') return false;
      const subj = op.fact.subject.toLowerCase().trim();
      const obj  = op.fact.object.toLowerCase().trim();
      return VAGUE_WORLD_TERMS.has(subj) || VAGUE_WORLD_TERMS.has(obj);
    });
    if (vagueFactsOnly.length > 0) {
      return failResult('GenericnessProof', `vagueFactCount=${vagueFactsOnly.length} — no character ops`, [
        {
          proof: 'GenericnessProof',
          severity: 'info',
          message: `${vagueFactsOnly.length} ADD_FACT op(s) use vague placeholder world terms (e.g. "the city", "someone"). Replace with specific named locations, people, or objects.`,
        },
      ]);
    }
    return passResult('GenericnessProof', 'no character ops to evaluate');
  }

  const charRefs = [...charRefSet];
  const unknownCount = charRefs.filter(c => !known.has(c)).length;
  const unknownFraction = unknownCount / charRefs.length;

  // Secondary check: ADD_FACT with vague placeholder subject or object
  const vagueFacts = ir.ops.filter(op => {
    if (op.op !== 'ADD_FACT') return false;
    const subj = op.fact.subject.toLowerCase().trim();
    const obj  = op.fact.object.toLowerCase().trim();
    return VAGUE_WORLD_TERMS.has(subj) || VAGUE_WORLD_TERMS.has(obj);
  });

  if (unknownFraction <= GENERICNESS_THRESHOLD && vagueFacts.length === 0) {
    return passResult('GenericnessProof', `genericness=${unknownFraction.toFixed(2)} — scene deepens known characters`);
  }

  const findings: import('../contract.ts').ProofFinding[] = [];
  if (unknownFraction > GENERICNESS_THRESHOLD) {
    findings.push({
      proof: 'GenericnessProof',
      severity: 'info',
      message: `Scene introduces too many unnamed characters (${unknownCount}/${charRefs.length}). Prefer ops on characters already in state.`,
    });
  }
  if (vagueFacts.length > 0) {
    findings.push({
      proof: 'GenericnessProof',
      severity: 'info',
      message: `${vagueFacts.length} ADD_FACT op(s) use vague placeholder world terms (e.g. "the city", "someone"). Replace with specific named locations, people, or objects.`,
    });
  }

  return failResult('GenericnessProof',
    `genericness=${unknownFraction.toFixed(2)}, vagueFactCount=${vagueFacts.length}`,
    findings,
  );
}
