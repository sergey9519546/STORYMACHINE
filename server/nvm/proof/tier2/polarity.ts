// PolarityProof (Tier 2) — a scene with emotion ops should shift at least one
// character's emotional valence. Scenes that only reinforce the valence a character
// already holds are emotionally stagnant: they confirm the existing state instead of
// complicating it. Good drama turns — fear to relief, hope to dread, pride to shame.

import type { NarrativeTransitionIR } from '../../ir/NarrativeTransitionIR.ts';
import type { NarrativeState } from '../../state/NarrativeState.ts';
import type { ProofResult } from '../contract.ts';
import type { StoryOp } from '../../ops/StoryOp.ts';
import { passResult, failResult } from '../contract.ts';

const NEGATIVE = new Set(['fear', 'distress', 'anger', 'shame', 'contempt']);
const POSITIVE  = new Set(['joy', 'trust', 'admiration', 'relief', 'love', 'pride']);

export function polarityProof(ir: NarrativeTransitionIR, state: NarrativeState): ProofResult {
  const emotionOps = ir.ops.filter(op => op.op === 'APPRAISE_EMOTION') as
    Extract<StoryOp, { op: 'APPRAISE_EMOTION' }>[];

  if (emotionOps.length === 0) return passResult('PolarityProof', 'no emotion ops — polarity not applicable');

  let checkedCount = 0;
  for (const op of emotionOps) {
    const current = state.characterEmotions[op.charId];
    if (!current) continue; // new character — no prior polarity to compare
    checkedCount++;

    const currentNeg = NEGATIVE.has(current.dominant);
    const currentPos  = POSITIVE.has(current.dominant);
    const newNeg      = NEGATIVE.has(op.emotion.dominant);
    const newPos      = POSITIVE.has(op.emotion.dominant);

    if ((currentNeg && newPos) || (currentPos && newNeg)) {
      return passResult('PolarityProof', `${op.charId} undergoes a valence reversal (${current.dominant} → ${op.emotion.dominant})`);
    }
  }

  if (checkedCount === 0) {
    return passResult('PolarityProof', 'no existing characters with prior emotion state — polarity not applicable');
  }

  return failResult('PolarityProof',
    'all emotion ops reinforce the existing emotional valence — no polarity shift', [
      {
        proof: 'PolarityProof', severity: 'flag', opIdx: undefined,
        message: `Scene has ${checkedCount} emotion op(s) but none reverse a character's valence. Every APPRAISE_EMOTION reinforces the existing dominant emotion. Add an unexpected reversal — a beat of relief inside dread, or dread inside relief — to make the scene turn.`,
      },
    ]);
}
