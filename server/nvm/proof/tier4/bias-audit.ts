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
  // ── Emotion homogeneity check ─────────────────────────────────────────────
  const emotionOps = ir.ops.filter(o => o.op === 'APPRAISE_EMOTION');
  if (emotionOps.length >= MIN_EMOTION_OPS) {
    const dominantCounts = new Map<EmotionType, number>();
    for (const op of emotionOps) {
      if (op.op === 'APPRAISE_EMOTION') {
        const d = op.emotion.dominant;
        dominantCounts.set(d, (dominantCounts.get(d) ?? 0) + 1);
      }
    }
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
  }

  // ── Belief uniformity check ────────────────────────────────────────────────
  // ≥3 distinct characters sharing the exact same belief proposition = groupthink.
  // This check runs regardless of emotion op count so pure-dialogue scenes are covered.
  const beliefOps = ir.ops.filter(o => o.op === 'UPDATE_BELIEF');
  if (beliefOps.length >= 3) {
    const propToChars = new Map<string, Set<string>>();
    for (const op of beliefOps) {
      if (op.op !== 'UPDATE_BELIEF') continue;
      const norm = op.belief.proposition.toLowerCase().trim();
      const existing = propToChars.get(norm) ?? new Set<string>();
      existing.add(op.charId);
      propToChars.set(norm, existing);
    }
    for (const [prop, chars] of propToChars) {
      if (chars.size >= 3) {
        return failResult('BiasAuditProof',
          `${chars.size} characters share the identical belief "${prop.slice(0, 60)}" — potential groupthink`, [
          {
            proof: 'BiasAuditProof',
            severity: 'info',
            message: `Belief uniformity: ${chars.size} characters receive the same proposition. Differentiate each character's epistemic update to reflect their individual perspective.`,
          },
        ]);
      }
    }
  }

  const emotionDistinctCount = new Set(emotionOps.map(o => o.op === 'APPRAISE_EMOTION' ? o.emotion.dominant : '')).size;
  return passResult('BiasAuditProof', `${emotionDistinctCount} distinct emotions — no homogeneity risk`);
}
