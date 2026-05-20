// OriginalityProof (Tier 3) — ranking signal: flags structurally uniform scenes
// where one op kind dominates ≥70% of all ops (monotony). A varied op-kind
// distribution signals richer, more original scene structure.

import type { NarrativeTransitionIR } from '../../ir/NarrativeTransitionIR.ts';
import type { NarrativeState } from '../../state/NarrativeState.ts';
import type { StoryOpKind } from '../../ops/StoryOp.ts';
import type { ProofResult } from '../contract.ts';
import { passResult, failResult } from '../contract.ts';

// If any single op kind ≥ 70% of all ops → monotonous → fail
const DOMINANCE_THRESHOLD = 0.7;

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
  if (dominance < DOMINANCE_THRESHOLD) {
    return passResult('OriginalityProof', `dominance=${dominance.toFixed(2)} — op mix is varied`);
  }
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
