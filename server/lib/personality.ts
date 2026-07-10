import type { DarkTriad, BigFive, DefenseMechanism, AttachmentStyle, ActionType } from '../engine/types.ts';

// ── Personality action-bias ───────────────────────────────────────────────────
// Pure, deterministic mapping from character psychology to action-type weights.
// Mirrors the memory.ts style — no Stage, no LLM, fully unit-testable.
//
// Weights are multipliers applied to the LLM's goal_score before candidate
// selection in Agent.takeTurn(). Range 0.7–1.3; all traits at 50 → exactly 1.0,
// so neutral/default characters are completely unaffected.

// Re-exported for callers that already import ActionType from this module.
// The canonical definition lives in engine/types.ts (ACTION_TYPES).
export type { ActionType };

// Normalize a trait value (0–100) to a -1 to +1 deviation from neutral.
// Guard against NaN/undefined traits (character sheet missing fields or persisted
// from malformed LLM output): treat as neutral (50), which produces 0 deviation.
const dev = (v: number) => (typeof v === 'number' && isFinite(v) ? (v - 50) / 50 : 0);

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
  // Base of 1.08 gives a slight positive impulse even for neutral characters; cons
  // drives deliberate execution of planned moves; extr/narc penalties kept mild so
  // dominant characters still leave rooms when their goal requires it.
  const RELOCATE = 1.08 + 0.15 * neur + 0.10 * cons - 0.06 * extr - 0.03 * narc;

  // WAIT: introverts and high-neuroticism characters are more likely to pause and observe.
  const WAIT = 1.0 - 0.10 * extr + 0.10 * neur + 0.05 * cons;

  // ── X1 — blueprint action-vocabulary expansion ─────────────────────────────
  // Same deviation-weighted shape as the five above; each new action reuses
  // the trait it most obviously reads on rather than inventing new axes.
  //
  // HIDE: withdrawal (low extraversion, high neuroticism) plus a small
  // Machiavellian nudge — concealment can be a calculated move, not just a
  // fear response. Low narcissism: narcissists want to be seen, not hidden.
  const HIDE = 1.0 - 0.12 * extr + 0.12 * neur - 0.08 * narc + 0.05 * mach;
  // OBSERVE: passive, low-profile inquiry — openness + conscientiousness
  // (methodical watching) with a mild introversion pull, mirroring EXAMINE's
  // shape but softer since it is unfocused rather than targeted scrutiny.
  const OBSERVE = 1.0 + 0.12 * open + 0.08 * cons - 0.06 * extr;
  // LISTEN: information-gathering by staying quiet — openness + a
  // Machiavellian "gather ammunition" incentive, offset by extraversion
  // (extraverts would rather speak than listen).
  const LISTEN = 1.0 + 0.10 * open - 0.08 * extr + 0.08 * mach;
  // SEARCH: methodical investigation — conscientiousness + openness, with a
  // willingness to cross a social line (low agreeableness) since searching a
  // room/person is more invasive than merely watching.
  const SEARCH = 1.0 + 0.12 * cons + 0.08 * open - 0.08 * agre;
  // REVEAL: an honest, other-directed disclosure — agreeableness + a social
  // extraversion pull, actively suppressed by Machiavellian guardedness
  // (strategic characters withhold, they don't volunteer).
  const REVEAL = 1.0 + 0.15 * agre + 0.08 * extr - 0.12 * mach;
  // THREATEN: coercive dominance — psychopathy + Machiavellianism + a
  // narcissistic dominance-display kicker, suppressed by agreeableness.
  const THREATEN = 1.0 + 0.15 * psyc + 0.10 * mach - 0.15 * agre + 0.05 * narc;
  // BETRAY: breaking a commitment for advantage — the strongest Dark-Triad
  // pull of the new set (Machiavellianism + psychopathy), suppressed by both
  // agreeableness (care for others) and conscientiousness (reliability).
  const BETRAY = 1.0 + 0.20 * mach + 0.12 * psyc - 0.18 * agre - 0.06 * cons;
  // PROTECT: the prosocial mirror of THREATEN — agreeableness driven,
  // suppressed by psychopathy/Machiavellianism (cold or self-interested
  // characters don't spend their turn shielding someone else).
  const PROTECT = 1.0 + 0.18 * agre - 0.10 * psyc - 0.06 * mach;
  // FORM_ALLIANCE: a social, agreeable move that can ALSO serve a strategic
  // player — extraversion + agreeableness, plus a small Machiavellian
  // incentive (alliances are useful instruments, not just warmth).
  const FORM_ALLIANCE = 1.0 + 0.12 * extr + 0.12 * agre + 0.05 * mach;
  // FLEE: the cascade's fear-driven exit — a stronger neuroticism pull than
  // RELOCATE (this is specifically the panic response, not a deliberate
  // repositioning) and, unlike RELOCATE, actively suppressed by psychopathy
  // (psychopathic characters are the least likely to panic-flee — they fight
  // or manipulate instead).
  const FLEE = 1.08 + 0.18 * neur - 0.06 * extr - 0.08 * psyc;

  // Clamp each weight to [0.5, 1.6] so LLM signal is nudged, never overridden.
  const clamp = (v: number) => Math.max(0.5, Math.min(1.6, v));
  return {
    SPEAK:         clamp(SPEAK),
    EXAMINE:       clamp(EXAMINE),
    LIE:           clamp(LIE),
    RELOCATE:      clamp(RELOCATE),
    WAIT:          clamp(WAIT),
    HIDE:          clamp(HIDE),
    OBSERVE:       clamp(OBSERVE),
    LISTEN:        clamp(LISTEN),
    SEARCH:        clamp(SEARCH),
    REVEAL:        clamp(REVEAL),
    THREATEN:      clamp(THREATEN),
    BETRAY:        clamp(BETRAY),
    PROTECT:       clamp(PROTECT),
    FORM_ALLIANCE: clamp(FORM_ALLIANCE),
    FLEE:          clamp(FLEE),
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
      return { EXAMINE: 0.6, SEARCH: 0.6 };  // avoid threatening information
    case 'displacement':
    case 'projection':
      return { SPEAK: 1.25, THREATEN: 1.15 }; // confrontational/accusatory
    case 'dissociation':
      return { RELOCATE: 1.3, SPEAK: 0.7, HIDE: 1.2 }; // withdrawal under stress
    case 'intellectualization':
      return { EXAMINE: 1.15, OBSERVE: 1.1 }; // detached inquiry
    case 'rationalization':
      return { SPEAK: 1.1, LIE: 1.1 };  // verbal justification / spin
    default:
      return {};
  }
}

// ── Attachment style action bias ─────────────────────────────────────────────
// Anxious: clings to connection — more SPEAK, less RELOCATE, more WAIT (needs signals).
// Avoidant: withdraws when stressed — more RELOCATE, less SPEAK.
// Anxious-avoidant: provokes then recoils — slight SPEAK + RELOCATE + LIE boost.
// Secure / undefined: neutral — no adjustment.

export function attachmentActionBias(
  style: AttachmentStyle | undefined,
): Partial<Record<ActionType, number>> {
  switch (style) {
    // Anxious clings to connection: seeks reassurance (SPEAK, FORM_ALLIANCE)
    // and resists both fleeing and hiding — leaving the relationship
    // unresolved is worse than staying and being anxious.
    case 'anxious':          return { SPEAK: 1.15, RELOCATE: 0.80, WAIT: 1.10, FORM_ALLIANCE: 1.10, FLEE: 0.75 };
    // Avoidant withdraws under stress — boosted on every exit/concealment
    // lever (RELOCATE, FLEE, HIDE), suppressed on direct engagement (SPEAK).
    case 'avoidant':         return { RELOCATE: 1.20, SPEAK: 0.85, WAIT: 1.10, FLEE: 1.25, HIDE: 1.15 };
    case 'anxious_avoidant': return { SPEAK: 1.05, RELOCATE: 1.10, LIE: 1.10, FLEE: 1.05 };
    default:                 return {};
  }
}

// ── Combined effective score ──────────────────────────────────────────────────
// Multiplies a candidate's goal_score by personality + defense + attachment biases.
// Used by Agent.takeTurn() to replace the bare goal_score comparison.

export function effectiveScore(
  goalScore: number,
  actionType: ActionType,
  dt: DarkTriad,
  bf: BigFive,
  activeDefense: DefenseMechanism | null,
  attachmentStyle?: AttachmentStyle,
): number {
  const pBias = actionBiasWeights(dt, bf)[actionType];
  const dBias = defenseActionBias(activeDefense)[actionType] ?? 1.0;
  const aBias = attachmentActionBias(attachmentStyle)[actionType] ?? 1.0;
  const combined = Math.max(0.5, Math.min(1.6, pBias * dBias * aBias));
  return goalScore * combined;
}
