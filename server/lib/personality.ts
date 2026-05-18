import type { DarkTriad, BigFive, DefenseMechanism } from '../engine/types.ts';

// ── Personality action-bias ───────────────────────────────────────────────────
// Pure, deterministic mapping from character psychology to action-type weights.
// Mirrors the memory.ts style — no Stage, no LLM, fully unit-testable.
//
// Weights are multipliers applied to the LLM's goal_score before candidate
// selection in Agent.takeTurn(). Range 0.7–1.3; all traits at 50 → exactly 1.0,
// so neutral/default characters are completely unaffected.

export type ActionType = 'SPEAK' | 'EXAMINE' | 'LIE' | 'RELOCATE' | 'WAIT';

// Normalize a trait value (0–100) to a -1 to +1 deviation from neutral.
const dev = (v: number) => (v - 50) / 50;

export function actionBiasWeights(
  dt: DarkTriad,
  bf: BigFive,
): Record<ActionType, number> {
  const mach = dev(dt.machiavellianism);  // high → strategic manipulation
  const narc = dev(dt.narcissism);        // high → centre-stage, dominant speech
  const psyc = dev(dt.psychopathy);       // high → risk-taking, cold deception
  const open = dev(bf.openness);          // high → inquiry, examine
  const cons = dev(bf.conscientiousness); // high → deliberate, examine; low → impulsive lie
  const extr = dev(bf.extraversion);      // high → speak out; low → withdraw/relocate
  const agre = dev(bf.agreeableness);     // high → avoid confrontation, avoid lie
  const neur = dev(bf.neuroticism);       // high → anxious, prone to relocate/withdraw

  const SPEAK    = 1.0 + 0.15 * extr  + 0.10 * narc - 0.05 * neur;
  const EXAMINE  = 1.0 + 0.15 * open  + 0.10 * cons - 0.05 * mach;
  const LIE      = 1.0 + 0.20 * mach  + 0.10 * psyc - 0.15 * agre - 0.10 * cons;
  const RELOCATE = 1.0 + 0.15 * neur  - 0.10 * extr - 0.05 * narc;

  // Clamp each weight to [0.5, 1.6] so LLM signal is nudged, never overridden.
  // WAIT: introverts and high-neuroticism characters are more likely to pause and observe.
  const WAIT = 1.0 - 0.10 * extr + 0.10 * neur + 0.05 * cons;
  const clamp = (v: number) => Math.max(0.5, Math.min(1.6, v));
  return {
    SPEAK:    clamp(SPEAK),
    EXAMINE:  clamp(EXAMINE),
    LIE:      clamp(LIE),
    RELOCATE: clamp(RELOCATE),
    WAIT:     clamp(WAIT),
  };
}

// ── Defense mechanism action bias ─────────────────────────────────────────────
// When a defense mechanism is active (emotional intensity ≥ 30), returns
// additional per-action multipliers that stack with actionBiasWeights().
// Returns empty record when no defense is active (null or low intensity).

export function defenseActionBias(
  d: DefenseMechanism | null,
): Partial<Record<ActionType, number>> {
  switch (d) {
    case 'denial':
    case 'repression':
      return { EXAMINE: 0.6 };           // avoid threatening information
    case 'displacement':
    case 'projection':
      return { SPEAK: 1.25 };            // confrontational/accusatory
    case 'dissociation':
      return { RELOCATE: 1.3, SPEAK: 0.7 }; // withdrawal under stress
    case 'intellectualization':
      return { EXAMINE: 1.15 };          // detached inquiry
    case 'rationalization':
      return { SPEAK: 1.1, LIE: 1.1 };  // verbal justification / spin
    default:
      return {};
  }
}

// ── Combined effective score ──────────────────────────────────────────────────
// Multiplies a candidate's goal_score by personality + defense biases.
// Used by Agent.takeTurn() to replace the bare goal_score comparison.

export function effectiveScore(
  goalScore: number,
  actionType: ActionType,
  dt: DarkTriad,
  bf: BigFive,
  activeDefense: DefenseMechanism | null,
): number {
  const pBias = actionBiasWeights(dt, bf)[actionType];
  const dBias = defenseActionBias(activeDefense)[actionType] ?? 1.0;
  const combined = Math.max(0.5, Math.min(1.6, pBias * dBias));
  return goalScore * combined;
}
