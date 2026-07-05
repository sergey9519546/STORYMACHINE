// CharacterAgencyProof (Tier 2) — when narrative pressure is applied (RAISE_CLOCK),
// at least one character must respond: update a belief, shift a relationship, or
// express an emotion. A scene where the clock ticks but characters remain inert
// breaks the principle of "pressure forces choice". Deterministic.

import type { NarrativeTransitionIR } from '../../ir/NarrativeTransitionIR.ts';
import type { NarrativeState } from '../../state/NarrativeState.ts';
import type { ProofResult } from '../contract.ts';
import { passResult, failResult } from '../contract.ts';

export function characterAgencyProof(ir: NarrativeTransitionIR, _state: NarrativeState): ProofResult {
  // Scene 0 is the establishment scene — clock + inert characters is expected there.
  if (ir.sceneIdx === 0) return passResult('CharacterAgencyProof', 'establishment scene — agency check not applied');

  const clockOps = ir.ops.filter(op => op.op === 'RAISE_CLOCK');
  if (clockOps.length === 0) return passResult('CharacterAgencyProof', 'no clock raised — agency check not triggered');

  const totalClockDelta = clockOps.reduce((s, op) => {
    const a = (op as Extract<typeof op, { op: 'RAISE_CLOCK' }>).amount;
    return s + (isFinite(a) ? a : 0);
  }, 0);

  // Minor clock bumps (≤1) are atmospheric — don't require character response.
  if (totalClockDelta <= 1) return passResult('CharacterAgencyProof', 'clock delta ≤1 — atmospheric pressure, agency not required');

  // At least one character-engagement op must be present.
  const agencyOps = ir.ops.filter(op =>
    op.op === 'UPDATE_BELIEF' ||
    op.op === 'APPRAISE_EMOTION' ||
    op.op === 'SHIFT_RELATIONSHIP' ||
    op.op === 'PAYOFF_SETUP',
  );

  if (agencyOps.length > 0) {
    return passResult('CharacterAgencyProof', `clock +${totalClockDelta} accompanied by ${agencyOps.length} character response op(s)`);
  }

  const clockIds = [...new Set(clockOps.map(op =>
    (op as Extract<typeof op, { op: 'RAISE_CLOCK' }>).clockId
  ))].join(', ');

  return failResult('CharacterAgencyProof',
    'clock raised but no character responded', [
      {
        proof: 'CharacterAgencyProof',
        severity: 'flag',
        message: `Clock(s) [${clockIds}] raised by +${totalClockDelta} but no character updated a belief, shifted a relationship, or expressed an emotion. Pressure without response is dramatically inert. Add at least one UPDATE_BELIEF, APPRAISE_EMOTION, SHIFT_RELATIONSHIP, or PAYOFF_SETUP op to show how the ticking clock forces a character to act or react.`,
      },
    ],
  );
}
