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

  // ── Cliché check A: consecutive ADD_FACT run ≥3 with no character op in between ──
  // A long unbroken run of world-facts without any character reaction is an
  // exposition dump — structurally generic regardless of content.
  const CONSECUTIVE_FACT_THRESHOLD = 3;
  let consecutiveFacts = 0;
  for (const op of ir.ops) {
    if (op.op === 'ADD_FACT' || op.op === 'RECORD_VISUAL_FACT' || op.op === 'EXPIRE_FACT') {
      consecutiveFacts++;
      if (consecutiveFacts >= CONSECUTIVE_FACT_THRESHOLD) {
        return failResult('OriginalityProof',
          `${consecutiveFacts} consecutive world ops with no character response`, [
          {
            proof: 'OriginalityProof',
            severity: 'info',
            message: `${consecutiveFacts} consecutive world-fact ops with no character reaction (UPDATE_BELIEF, APPRAISE_EMOTION, or SHIFT_RELATIONSHIP). Break the exposition dump with a human response.`,
          },
        ]);
      }
    } else if (op.op === 'UPDATE_BELIEF' || op.op === 'APPRAISE_EMOTION' || op.op === 'SHIFT_RELATIONSHIP') {
      consecutiveFacts = 0;
    }
  }

  // ── Cliché check B: same-scene relationship whiplash ──────────────────────────
  // A pair that swings both negative AND positive in the same scene has a dramatic
  // fight-and-make-up arc compressed to a single beat — emotionally unconvincing.
  const relPositive = new Map<string, number>(); // pairKey → positive delta total
  const relNegative = new Map<string, number>(); // pairKey → negative delta total
  for (const op of ir.ops) {
    if (op.op !== 'SHIFT_RELATIONSHIP') continue;
    const key = [...op.pair].sort().join('|');
    const amt = typeof op.delta?.amount === 'number' ? op.delta.amount : 0;
    if (amt > 0) relPositive.set(key, (relPositive.get(key) ?? 0) + amt);
    else if (amt < 0) relNegative.set(key, (relNegative.get(key) ?? 0) + Math.abs(amt));
  }
  const WHIPLASH_THRESHOLD = 0.3;
  for (const [key, posAmt] of relPositive) {
    const negAmt = relNegative.get(key) ?? 0;
    if (posAmt >= WHIPLASH_THRESHOLD && negAmt >= WHIPLASH_THRESHOLD) {
      const [a, b] = key.split('|');
      return failResult('OriginalityProof',
        `${a}↔${b} relationship swings both +${posAmt.toFixed(2)} and -${negAmt.toFixed(2)} in one scene`, [
        {
          proof: 'OriginalityProof',
          severity: 'info',
          message: `"${a}" and "${b}" have a relationship fight-and-make-up within a single scene (±${Math.max(posAmt, negAmt).toFixed(2)}). Spread the arc across multiple scenes for emotional credibility.`,
          subjectId: key,
        },
      ]);
    }
  }

  return passResult('OriginalityProof', `dominance=${dominance.toFixed(2)} — op mix is varied`);
}
