// BiasAuditProof (Tier 4 — Ethics & Disclosure) — monitors for homogeneous
// emotional response across characters. When ≥3 characters receive the same
// dominant emotion in one scene, every character is reacting identically —
// a signal of stereotyped, undifferentiated characterisation.

import type { NarrativeTransitionIR } from '../../ir/NarrativeTransitionIR.ts';
import type { NarrativeState } from '../../state/NarrativeState.ts';
import type { EmotionType } from '../../../engine/types.ts';
import type { ProofResult } from '../contract.ts';
import { passResult, failResult } from '../contract.ts';

const MIN_EMOTION_OPS = 3;

export function biasAuditProof(
  ir: NarrativeTransitionIR,
  _state: NarrativeState,
): ProofResult {
  const emotionOps = ir.ops.filter(o => o.op === 'APPRAISE_EMOTION');
  if (emotionOps.length < MIN_EMOTION_OPS) {
    return passResult('BiasAuditProof', 'fewer than 3 emotion ops — no homogeneity risk');
  }

  const dominantCounts = new Map<EmotionType, number>();
  for (const op of emotionOps) {
    if (op.op === 'APPRAISE_EMOTION') {
      const d = op.emotion.dominant;
      dominantCounts.set(d, (dominantCounts.get(d) ?? 0) + 1);
    }
  }

  // Flag when ≥75% of characters share the same dominant emotion — the original
  // count === total check required 100% uniformity, silently passing 4-of-5 scenarios.
  const HOMOGENEITY_FRACTION = 0.75;
  for (const [emotion, count] of dominantCounts) {
    if (count >= MIN_EMOTION_OPS && count / emotionOps.length >= HOMOGENEITY_FRACTION) {
      return failResult('BiasAuditProof',
        `${count}/${emotionOps.length} characters share dominant emotion "${emotion}" — potential stereotyping`, [
        {
          proof: 'BiasAuditProof',
          severity: 'info',
          message: `Near-homogeneous emotional response: ${count} of ${emotionOps.length} characters feel "${emotion}". Differentiate emotional reactions to avoid stereotyped characterisation.`,
        },
      ]);
    }
  }

  return passResult('BiasAuditProof', `${dominantCounts.size} distinct emotions across ${emotionOps.length} characters`);
}
