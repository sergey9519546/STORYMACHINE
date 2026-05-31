// OriginalityProof (Tier 3) — ranking signal: flags structurally uniform scenes
// where one op kind dominates ≥70% of all ops (monotony), or where a single
// character/belief subject receives too many ops in one scene (character repetition).
// A varied op-kind distribution signals richer, more original scene structure.

import type { NarrativeTransitionIR } from '../../ir/NarrativeTransitionIR.ts';
import type { NarrativeState } from '../../state/NarrativeState.ts';
import type { StoryOpKind } from '../../ops/StoryOp.ts';
import type { ProofResult, ProofFinding } from '../contract.ts';
import { passResult, failResult } from '../contract.ts';

// If any single op kind ≥ 70% of all ops → monotonous
const DOMINANCE_THRESHOLD = 0.7;
// If any single character receives > 60% of character-targeted ops → character overload
const CHAR_DOMINANCE_THRESHOLD = 0.6;
// Minimum scene size to assess character repetition (small scenes naturally focus)
const MIN_OPS_FOR_CHAR_CHECK = 4;

export function originalityProof(
  ir: NarrativeTransitionIR,
  _state: NarrativeState,
): ProofResult {
  if (ir.ops.length < 3) return passResult('OriginalityProof', 'too few ops to assess originality');

  const freq = new Map<StoryOpKind, number>();
  for (const op of ir.ops) freq.set(op.op, (freq.get(op.op) ?? 0) + 1);

  let dominantKind: StoryOpKind | null = null;
  let dominantCount = 0;
  for (const [kind, count] of freq) {
    if (count > dominantCount) { dominantKind = kind; dominantCount = count; }
  }

  const dominance = dominantCount / ir.ops.length;
  if (dominance >= DOMINANCE_THRESHOLD) {
    return failResult('OriginalityProof',
      `op kind "${dominantKind}" dominates ${dominantCount}/${ir.ops.length} ops (${(dominance * 100).toFixed(0)}%)`, [
      {
        proof: 'OriginalityProof',
        severity: 'info',
        message: `Scene is structurally monotonous: "${dominantKind}" accounts for ${(dominance * 100).toFixed(0)}% of ops. Diversify op kinds.`,
        subjectId: dominantKind ?? undefined,
      },
    ]);
  }

  // Character repetition: if one character receives >60% of character-targeted ops
  // in a scene with ≥4 ops, the scene is a character monologue rather than an ensemble beat.
  if (ir.ops.length >= MIN_OPS_FOR_CHAR_CHECK) {
    const charFreq = new Map<string, number>();
    let charOpCount = 0;
    for (const op of ir.ops) {
      if ('charId' in op && typeof (op as { charId?: string }).charId === 'string') {
        const charId = (op as { charId: string }).charId;
        charFreq.set(charId, (charFreq.get(charId) ?? 0) + 1);
        charOpCount++;
      }
    }
    if (charOpCount > 0) {
      let maxCharCount = 0;
      let maxCharId = '';
      for (const [charId, count] of charFreq) {
        if (count > maxCharCount) { maxCharId = charId; maxCharCount = count; }
      }
      const charDominance = maxCharCount / charOpCount;
      if (charDominance >= CHAR_DOMINANCE_THRESHOLD && charFreq.size > 1) {
        const findings: ProofFinding[] = [{
          proof: 'OriginalityProof',
          severity: 'info',
          message: `Character "${maxCharId}" receives ${maxCharCount}/${charOpCount} character-targeted ops — scene risks becoming a monologue. Give agency to other characters.`,
          subjectId: maxCharId,
        }];
        return failResult('OriginalityProof',
          `character "${maxCharId}" dominates ${(charDominance * 100).toFixed(0)}% of character ops`,
          findings,
        );
      }
    }
  }

  return passResult('OriginalityProof', `dominance=${dominance.toFixed(2)} — op mix is varied`);
}
