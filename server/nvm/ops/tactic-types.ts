// 12-Tactic Vocabulary (Wave 11 doc-gap) — the complete set of narrative
// tactics a character can deploy. Tactics annotate UPDATE_BELIEF and
// SHIFT_RELATIONSHIP ops to tell the convergence loop *how* an influence
// operation is being executed — not just that it happened.
//
// These 12 tactics cover the full rhetorical + psychological space:
// rational, emotional, social, deceptive, implicit, and structural moves.

export const TACTIC_TYPES = [
  'direct_assertion',    // state something as plain fact
  'emotional_appeal',    // invoke feelings (fear, hope, guilt)
  'authority_claim',     // invoke status, expertise, or role
  'reciprocity_bid',     // invoke past favors or propose an exchange
  'social_proof',        // "everyone / the group believes X"
  'deflection',          // redirect attention from a dangerous topic
  'partial_reveal',      // show part of the truth to build false trust
  'bait_and_switch',     // set expectation then subvert it
  'guilt_induction',     // make target feel morally responsible
  'alliance_bid',        // offer coalition or shared goal framing
  'implicit_threat',     // suggest consequences without stating them
  'strategic_silence',   // withhold information as leverage
] as const;

export type TacticType = typeof TACTIC_TYPES[number];

/** Annotation attached to a StoryOp to declare the tactic used. */
export interface TacticAnnotation {
  tactic: TacticType;
  /** Character deploying this tactic (may differ from op.charId if indirect). */
  agentId: string;
  /** Intended target character. */
  targetId: string;
  /** Confidence that this tactic succeeds (0–1, set by the convergence loop). */
  expectedEfficacy?: number;
}

// ── Tactic taxonomy helpers ───────────────────────────────────────────────────

/** Tactics that inherently involve deception or concealment. */
export const DECEPTIVE_TACTICS: TacticType[] = [
  'partial_reveal', 'bait_and_switch', 'deflection', 'strategic_silence',
];

/** Tactics that operate on emotion rather than evidence. */
export const EMOTIONAL_TACTICS: TacticType[] = [
  'emotional_appeal', 'guilt_induction', 'implicit_threat',
];

/** Tactics that establish social/relational framing. */
export const SOCIAL_TACTICS: TacticType[] = [
  'reciprocity_bid', 'social_proof', 'alliance_bid',
];

/** Tactics that assert propositional content directly. */
export const RATIONAL_TACTICS: TacticType[] = [
  'direct_assertion', 'authority_claim',
];

export function isDeceptive(t: TacticType): boolean {
  return (DECEPTIVE_TACTICS as TacticType[]).includes(t);
}

export function isEmotional(t: TacticType): boolean {
  return (EMOTIONAL_TACTICS as TacticType[]).includes(t);
}

/** Return how many irony layers a tactic contributes (0–2). */
export function tacticIronyWeight(t: TacticType): number {
  if (isDeceptive(t)) return 2;
  if (isEmotional(t)) return 1;
  return 0;
}
