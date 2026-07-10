// ── Agent psychology & strategy helpers ──────────────────────────────────────
// Pure, deterministic functions extracted from Agent.ts (M4 decomposition).
// None of these touch the Stage or perform LLM calls — they map a character's
// static traits + transient emotional state to prompt fragments and strategy
// selections. Keeping them here makes the Agent class a thin coordinator and
// makes the psychology layer independently unit-testable.

import type {
  ActionType,
  CharacterSheet,
  DarkTriad,
  BigFive,
  AttachmentStyle,
  DefenseMechanism,
  EmotionState,
  EmotionType,
  Goal,
  GoalStack,
  Location,
  PersuasionStrategy,
  PersuasionRecord,
} from '../types.ts';
import type { Stage } from '../Stage.ts';

export function describeAttachment(style: AttachmentStyle | undefined): string {
  switch (style) {
    case 'anxious':          return 'You cling to connection; under pressure you over-explain and seek reassurance. You avoid relocating until forced.';
    case 'avoidant':         return 'You suppress discomfort through withdrawal. When tension rises your instinct is to leave the room rather than confront.';
    case 'anxious_avoidant': return 'You simultaneously crave and fear closeness. You may provoke conflict then recoil from its consequences.';
    default:                 return 'You engage with situations directly and can regulate your responses under pressure.';
  }
}

// NOTE ON SCOPE — this is the DEFENSE-MECHANISM system (how the psyche
// DISTORTS an uncomfortable truth: rationalization, denial, projection...).
// It is deliberately kept SEPARATE from the threat-response CASCADE further
// below (arousal/freeze/flight/fight/fawn/collapse — how the BODY reacts to
// danger). See the cascade section's header comment for the full contrast;
// the two systems compose (a character can be mid-FIGHT while also
// RATIONALIZING their aggression) rather than one replacing the other.
export const DEFENSE_DESCRIPTIONS: Record<DefenseMechanism, string> = {
  rationalization:      'You always have a logical explanation ready, even when you are in the wrong.',
  intellectualization:  'You discuss uncomfortable topics in abstract, detached terms to avoid feeling them.',
  projection:           'You attribute your own motives to others, accusing them of what you yourself are doing.',
  displacement:         'When you cannot attack the real threat, you redirect your anger at a safer target.',
  denial:               'You flatly refuse to acknowledge facts that threaten your self-concept.',
  dissociation:         'Under extreme stress you can become unnervingly calm and detached.',
  repression:           'You genuinely do not consciously register information that is too threatening.',
};

// Select the defense mechanism that fires under current emotional pressure.
// Only returns a value when intensity is high enough to activate — otherwise
// the agent is composed and no defense is in effect.
export function selectActiveDefense(
  mechanisms: DefenseMechanism[] | undefined,
  emotionState: EmotionState | undefined,
): DefenseMechanism | null {
  if (!mechanisms || mechanisms.length === 0) return null;
  const es = emotionState;
  if (!es || es.intensity < 30) return null;

  const preferred: Partial<Record<EmotionType, DefenseMechanism[]>> = {
    shame:    ['denial', 'rationalization', 'repression'],
    anger:    ['projection', 'displacement'],
    fear:     ['dissociation', 'intellectualization', 'repression'],
    distress: ['rationalization', 'intellectualization', 'denial'],
  };
  const candidates = preferred[es.dominant] ?? [];
  return mechanisms.find(m => candidates.includes(m)) ?? mechanisms[0];
}

export function describeActionBias(
  darkTriad: DarkTriad | undefined,
  attachment: AttachmentStyle | undefined,
  suspicion: number,
): string {
  const lines: string[] = [];
  const dt = darkTriad ?? { machiavellianism: 50, narcissism: 50, psychopathy: 50 };

  if (dt.machiavellianism > 70) lines.push('Your high strategic intelligence means LIE is a natural tool when it serves your goal.');
  if (dt.psychopathy > 70)       lines.push('You feel no social cost to deception; LIE carries no hesitation for you.');
  if (dt.narcissism > 70)        lines.push('You rarely back down or admit error; SPEAK is often a performance of dominance.');
  if (dt.machiavellianism < 30)  lines.push('You tend toward direct honesty; deception feels costly to you.');

  if (attachment === 'anxious')  lines.push('Right now your anxiety pulls you toward SPEAK — you need to know what others are thinking.');
  if (attachment === 'avoidant' && suspicion > 40) lines.push('Your tension is rising; RELOCATE is starting to feel appealing.');

  return lines.length > 0 ? lines.join(' ') : 'Choose whichever action best serves your immediate goal.';
}

export function deriveSpeechPattern(bigFive: BigFive | undefined, darkTriad?: DarkTriad, emotionState?: EmotionState): string {
  const cues: string[] = [];

  // Big Five base patterns
  if (bigFive) {
    if (bigFive.openness > 70)           cues.push('Use complex vocabulary and abstract metaphors.');
    if (bigFive.conscientiousness > 70)  cues.push('Speak precisely; complete your thoughts; cite specific facts and timelines.');
    if (bigFive.extraversion > 70)       cues.push('Fill silences; speak at length; assert rather than question.');
    else if (bigFive.extraversion < 30)  cues.push('Speak in short bursts; let silences do work for you.');
    if (bigFive.agreeableness > 70)      cues.push('Hedge statements; ask clarifying questions; avoid direct confrontation.');
    if (bigFive.neuroticism > 70)        cues.push('Speech fragments under stress; emotion bleeds into your word choice.');
  }

  // Dark Triad voice signatures (override / layer on top of Big Five)
  if (darkTriad) {
    if (darkTriad.machiavellianism > 65)
      cues.push('Every sentence has a hidden purpose — probe for information, test reactions, never tip your hand.');
    if (darkTriad.narcissism > 65)
      cues.push('Refer back to yourself often; frame events around your own exceptional qualities or suffering.');
    if (darkTriad.psychopathy > 65)
      cues.push('Speak flatly and without emotional color; treat others\' distress as data, not feeling.');
  }

  // Emotion-inflected micropatterns (only when intensity is significant)
  if (emotionState && emotionState.intensity >= 30) {
    switch (emotionState.dominant) {
      case 'fear':     cues.push('Let sentences trail off — incomplete thoughts, rushed qualifications.'); break;
      case 'anger':    cues.push('Short. Punchy. Monosyllabic. Cut people off.'); break;
      case 'shame':    cues.push('Avoid eye-contact language; keep redirecting to other topics.'); break;
      case 'pride':    cues.push('Slow deliberate cadence — savor each word as if performing.'); break;
      case 'distress': cues.push('Over-explain; repeat yourself; circle back to the same point.'); break;
    }
  }

  return cues.join(' ');
}

export function computeDefenseLevel(neuroticism: number, suspicion: number): string {
  if (neuroticism > 70 && suspicion > 60) return 'breaking_point — your composure is cracking; concealment is becoming visibly costly';
  if (neuroticism > 60 || suspicion > 50) return 'high — you are actively working to maintain your facade';
  if (neuroticism > 40 || suspicion > 30) return 'medium — some unease, but still controlled';
  return 'low — calm and composed';
}

// ── Persuasion strategy selection ────────────────────────────────────────────
// Deterministic: no LLM calls. Maps target Big Five + emotion to a named strategy.

export const PERSUASION_HINT: Record<PersuasionStrategy, (name: string) => string> = {
  logic:       (n) => `use facts, evidence, and logical arguments. ${n} responds to systematic reasoning.`,
  emotion:     (n) => `appeal to feelings, shared vulnerability, or empathy. ${n} is in an emotional state.`,
  authority:   (n) => `invoke your credibility and track record. ${n} trusts you — use it deliberately.`,
  reciprocity: (n) => `appeal to fairness and mutual exchange. ${n} values harmony and what you've done for them.`,
  social_proof:(n) => `reference what others believe or have decided. ${n} responds to social consensus.`,
};

function selectBasePersuasionStrategy(target: CharacterSheet): PersuasionStrategy {
  const bf = target.bigFive;
  const emotion = target.emotionState;
  if (!bf) return 'social_proof';
  if (emotion && (emotion.dominant === 'distress' || emotion.dominant === 'fear') && emotion.intensity > 35) return 'emotion';
  if (bf.openness > 70 || bf.conscientiousness > 70) return 'logic';
  if (bf.agreeableness > 70) return 'reciprocity';
  if (bf.neuroticism > 70) return 'emotion';
  return 'social_proof';
}

export function selectPersuasionStrategy(target: CharacterSheet, history: PersuasionRecord[]): PersuasionStrategy {
  const base = selectBasePersuasionStrategy(target);
  // If a strategy has succeeded ≥ 2 times against this target, prefer it
  const successCounts = new Map<PersuasionStrategy, number>();
  for (const r of history) {
    if (r.success) successCounts.set(r.strategy, (successCounts.get(r.strategy) ?? 0) + 1);
  }
  let best = base;
  let bestCount = 0;
  for (const [s, count] of successCounts) {
    if (count > bestCount) { best = s; bestCount = count; }
  }
  return bestCount >= 2 ? best : base;
}

// ── Goal DAG helper ──────────────────────────────────────────────────────────
// Returns active (unachieved) goals whose declared dependencies are all satisfied,
// sorted by priority (or value) descending. Falls back to all active goals when
// no depends_on fields are set (fully backward compatible).
export function getReadyGoals(gs: GoalStack): Goal[] {
  const active = gs.instrumental.filter(g => !g.achieved);
  const achievedIds = new Set(gs.instrumental.filter(g => g.achieved).map(g => g.id));
  return active
    .filter(g => (g.depends_on ?? []).every(dep => achievedIds.has(dep)))
    .sort((a, b) => (b.priority ?? b.value) - (a.priority ?? a.value));
}

function clampPct(v: number): number {
  const n = typeof v === 'number' && isFinite(v) ? v : 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

// ── Threat-response defense CASCADE (blueprint §15) ──────────────────────────
// IMPORTANT — DISTINCT FROM THE DEFENSE-MECHANISM SYSTEM ABOVE:
//   - DEFENSE MECHANISMS (selectActiveDefense / DEFENSE_DESCRIPTIONS, above)
//     are how the PSYCHE DISTORTS an uncomfortable truth — a slower,
//     cognitive/emotional coping style (rationalization, denial,
//     projection...) that colors what a character SAYS and believes about a
//     threat to their self-concept.
//   - The CASCADE below is the body's fast, pre-cognitive SOMATIC threat
//     response — what the nervous system DOES when danger registers, in the
//     canonical trauma-response order Arousal → Freeze → Flight → Fight →
//     Fawn → Collapse. The two systems are complementary, not exclusive: a
//     character mid-FIGHT can simultaneously be RATIONALIZING their
//     aggression. Callers (decision.ts) compose both; neither replaces the
//     other and this module never merges them into one signal.

export type CascadeState = 'arousal' | 'freeze' | 'flight' | 'fight' | 'fawn' | 'collapse';

export interface DefenseCascadeInputs {
  /** 0–100: how dangerous the situation currently feels (fear/distress-driven). */
  threatLevel: number;
  /** 0–100: how abruptly this threat appeared. A slow-building pressure reads
   *  low; an ambush or a just-sprung accusation reads high. This also folds
   *  in the "uncertainty" half of the blueprint's "sudden threat +
   *  uncertainty" trigger — a threat that just appeared has not yet been
   *  assessed, which is what makes it read as uncertain. */
  suddenness: number;
  /** Is there a viable, currently unblocked physical or social exit? */
  escapeAvailable: boolean;
  /** -100..100: negative = the threatening party holds power over this
   *  character right now; positive = this character holds power over them;
   *  0 = parity or unknown. */
  powerDifferential: number;
  /** Is the threat interpersonal (another agent) rather than purely
   *  situational/environmental? Fawn only makes sense against a social threat. */
  socialThreat: boolean;
  /** Is anger — rather than fear/distress — this character's dominant felt
   *  emotion right now? Anger recruits FIGHT even when an exit exists. */
  angerDominant: boolean;
  /** Consecutive turns spent under significant (>= high-threat) pressure.
   *  Drives the escalation from active resistance (flight/fight/fawn) to
   *  collapse once the organism has exhausted those options. */
  exposureTurns: number;
}

export interface DefenseCascadeResult {
  state: CascadeState;
  intensity: number; // 0–100
  rationale: string;
}

const CASCADE_LOW_THREAT = 30;
const CASCADE_MAX_THREAT = 85;
const CASCADE_SUDDEN = 55;
const CASCADE_POWER_IMBALANCE = 30;   // |powerDifferential| past this counts as "meaningful"
const CASCADE_PROLONGED_TURNS = 4;    // consecutive turns of max threat before collapse
const CASCADE_FREEZE_WINDOW_TURNS = 1; // freeze is the FIRST-instant reflex only

/**
 * Pure, deterministic threat-response cascade. Canonical order per the
 * blueprint: Arousal → Freeze → Flight → Fight → Fawn → Collapse. Evaluated
 * as a fixed-precedence cascade (not a scored competition) because that is
 * how a nervous system actually resolves competing triggers — the most
 * urgent override wins outright rather than being averaged with the rest:
 *
 *   1. sub-threshold        → AROUSAL   (nothing below fires beneath CASCADE_LOW_THREAT)
 *   2. exhausted             → COLLAPSE  (checked early — overrides everything
 *                                        once threat has sat near max, with no
 *                                        escape, for CASCADE_PROLONGED_TURNS+
 *                                        turns: "no options left")
 *   3. reflex                → FREEZE    (sudden onset, still inside the first
 *                                        instant — before flight/fight/fawn
 *                                        can even engage)
 *   4. social power          → FAWN      (interpersonal threat + a real power
 *                                        imbalance recruits appeasement ahead
 *                                        of fight-or-flight, which would be
 *                                        suicidal against a dominant party)
 *   5. escape blocked,
 *      or rage overrides it  → FIGHT     (checked before flight: the
 *                                        blueprint's "escape blocked OR anger
 *                                        dominant" is a single OR condition,
 *                                        so anger can convert an available
 *                                        exit into a stand-and-fight)
 *   6. otherwise             → FLIGHT    (an exit exists and nothing above
 *                                        overrode it)
 *   7. (defensive fallback, unreachable given threatLevel >= CASCADE_LOW_THREAT
 *      and the exhaustive branches above) → AROUSAL.
 */
export function computeDefenseCascadeState(inputs: DefenseCascadeInputs): DefenseCascadeResult {
  const threatLevel = clampPct(inputs.threatLevel);
  const suddenness = clampPct(inputs.suddenness);
  const powerDifferential = Math.max(-100, Math.min(100, Number.isFinite(inputs.powerDifferential) ? inputs.powerDifferential : 0));
  const exposureTurns = Math.max(0, Number.isFinite(inputs.exposureTurns) ? inputs.exposureTurns : 0);
  const { escapeAvailable, socialThreat, angerDominant } = inputs;

  if (threatLevel < CASCADE_LOW_THREAT) {
    return {
      state: 'arousal',
      intensity: clampPct(10 + threatLevel * 0.5),
      rationale: `Threat level ${threatLevel} is below the ${CASCADE_LOW_THREAT} activation threshold — alert baseline, full agency retained.`,
    };
  }

  if (threatLevel >= CASCADE_MAX_THREAT && exposureTurns >= CASCADE_PROLONGED_TURNS && !escapeAvailable) {
    return {
      state: 'collapse',
      intensity: clampPct(threatLevel + exposureTurns * 3),
      rationale: `Threat has sat at/near maximum (${threatLevel}) for ${exposureTurns} consecutive turns with no escape route — every active response has been exhausted; the nervous system shuts down.`,
    };
  }

  if (suddenness >= CASCADE_SUDDEN && exposureTurns <= CASCADE_FREEZE_WINDOW_TURNS) {
    return {
      state: 'freeze',
      intensity: clampPct(threatLevel * 0.6 + suddenness * 0.4),
      rationale: `Threat appeared suddenly (suddenness ${suddenness}) with no time yet to assess options — reflexive freeze precedes any deliberate flight/fight/fawn response.`,
    };
  }

  if (socialThreat && powerDifferential <= -CASCADE_POWER_IMBALANCE) {
    return {
      state: 'fawn',
      intensity: clampPct(threatLevel * 0.7 + Math.abs(powerDifferential) * 0.3),
      rationale: `Threat is interpersonal and the other party holds real power over this character (differential ${powerDifferential}) — appeasement is safer than confrontation or flight.`,
    };
  }

  if (angerDominant || !escapeAvailable) {
    return {
      state: 'fight',
      intensity: clampPct(threatLevel * 0.85 + (angerDominant ? 15 : 0)),
      rationale: !escapeAvailable
        ? `No viable exit at threat level ${threatLevel} — cornered, the response converts to confrontation.`
        : `Anger is the dominant felt emotion at threat level ${threatLevel} — rage overrides an available exit and converts the response to confrontation.`,
    };
  }

  if (escapeAvailable) {
    return {
      state: 'flight',
      intensity: clampPct(threatLevel * 0.8 + 10),
      rationale: `A viable exit exists at threat level ${threatLevel} with no override in effect — the safer response is to leave rather than confront.`,
    };
  }

  // Defensive fallback only — threatLevel >= CASCADE_LOW_THREAT plus the
  // exhaustive angerDominant/escapeAvailable branches above mean this is
  // never actually reached; kept explicit rather than a non-null assertion.
  return {
    state: 'arousal',
    intensity: clampPct(threatLevel),
    rationale: 'No cascade trigger condition matched — defaulting to alert baseline.',
  };
}

export interface CascadeBehaviorProfile {
  dialogueStyle: string;
  choiceSpace: 'full' | 'limited' | 'movement' | 'confrontation' | 'submission' | 'near_zero';
  promptInstruction: string;
}

const CASCADE_BEHAVIOR_PROFILES: Record<CascadeState, CascadeBehaviorProfile> = {
  arousal: {
    dialogueStyle: 'Alert and economical — scanning the room, sentences short but complete.',
    choiceSpace: 'full',
    promptInstruction: 'Heightened vigilance, but full agency: the character can pursue any action the scene supports.',
  },
  freeze: {
    dialogueStyle: 'Stillness. Fragmented, halting thought — sentences trail off mid-clause; words come slowly if at all.',
    choiceSpace: 'limited',
    promptInstruction: 'The character can barely act. Do not generate decisive, confident, or confrontational actions — the strongest available move is small and hesitant (a stammered word, a held breath, an unfinished gesture).',
  },
  flight: {
    dialogueStyle: 'Urgent, clipped, escape-oriented — attention is on the exit, not on the exchange.',
    choiceSpace: 'movement',
    promptInstruction: 'Bias strongly toward leaving or creating distance. Dialogue should be brief and aimed at disengaging, not at winning the exchange.',
  },
  fight: {
    dialogueStyle: 'Aggressive and confrontational — raised volume, accusatory, unwilling to yield ground.',
    choiceSpace: 'confrontation',
    promptInstruction: 'Bias toward directly confronting the perceived threat. The character pushes back rather than de-escalating or withdrawing.',
  },
  fawn: {
    dialogueStyle: 'Appeasing, over-agreeing, apologetic — flatters, defers, and pre-emptively concedes points to avoid friction.',
    choiceSpace: 'submission',
    promptInstruction: "Bias toward placating the more powerful party. Suppress the character's own stated needs; agree, comply, or over-apologize rather than assert or confront.",
  },
  collapse: {
    dialogueStyle: 'Minimal, monosyllabic, dissociated — resigned tone, little affect, as if from a distance.',
    choiceSpace: 'near_zero',
    promptInstruction: 'The character perceives no options. Actions are passive and resigned — do not generate assertive, evasive, or confrontational actions; a shutdown response (silence, a single flat word, no movement) is the strongest available move.',
  },
};

// Per-state behavior profile — consumed by BOTH prompt-based generation
// (decision.ts's buildPrompt injects dialogueStyle/promptInstruction) and
// deterministic fallbacks (a rule-based composer can key off choiceSpace to
// restrict which action types it is willing to compose).
export function cascadeBehaviorProfile(state: CascadeState): CascadeBehaviorProfile {
  return CASCADE_BEHAVIOR_PROFILES[state];
}

// Cascade → ActionType score multipliers. Mirrors lib/personality.ts's
// defenseActionBias()/attachmentActionBias() pattern (this run's file
// ownership is psychology.ts/decision.ts only, so the analogous table lives
// here rather than there). Combined multiplicatively with effectiveScore()'s
// result in decision.ts's selectBestAction, so a FROZEN character's
// candidate actions are penalized before scoring picks the best one — not
// merely narrated as frozen in the prompt while still being free to pick a
// bold confrontational candidate.
// X1 — blueprint action-vocabulary expansion: the five legacy keys above are
// UNCHANGED (byte-stability for every pinned deterministic-sim.test.ts
// fixture depends on it — see deterministic.ts's BASE_SCORE contract comment).
// New keys are additive per state:
//   - FLEE is FLIGHT's signature action (much stronger than RELOCATE there —
//     RELOCATE in 'flight' now reads as the tier-1 PERSONALITY-driven exit
//     (avoidant trait), while FLEE is the tier-6 CASCADE-driven evasive exit;
//     see deterministic.ts's composeDeterministicAction for the split).
//   - THREATEN is FIGHT's signature action (the confrontational escalation).
//   - HIDE is boosted in FREEZE/COLLAPSE (the task's own framing: "a
//     threatened/frozen character biases toward HIDE/WAIT") and in FLIGHT as
//     a secondary evasion option, but suppressed in FIGHT (a fighting
//     character isn't trying to go unseen).
//   - PROTECT/FORM_ALLIANCE/REVEAL are boosted in FAWN (appeasement can take
//     the shape of placating, allying with, or over-disclosing to the more
//     powerful party) and suppressed everywhere threat-response narrows the
//     choice space (freeze/collapse/fight).
//   - OBSERVE/LISTEN/SEARCH (investigation) are suppressed under every
//     non-arousal state — a nervous system mid-threat-response is not in a
//     position to conduct calm, methodical inquiry.
export function cascadeActionBias(state: CascadeState): Partial<Record<ActionType, number>> {
  switch (state) {
    case 'freeze':
      return {
        SPEAK: 0.55, LIE: 0.40, EXAMINE: 0.70, RELOCATE: 0.30, WAIT: 1.50,
        HIDE: 1.30, OBSERVE: 0.55, LISTEN: 0.55, SEARCH: 0.35,
        REVEAL: 0.35, THREATEN: 0.25, BETRAY: 0.20, PROTECT: 0.35,
        FORM_ALLIANCE: 0.30, FLEE: 0.25, // freeze precedes flight — can't flee yet
      };
    case 'flight':
      return {
        RELOCATE: 1.50, SPEAK: 0.70, LIE: 0.60, EXAMINE: 0.60, WAIT: 0.70,
        FLEE: 2.20, // the cascade's own signature action — dominant here
        HIDE: 1.10, OBSERVE: 0.55, LISTEN: 0.55, SEARCH: 0.45,
        REVEAL: 0.50, THREATEN: 0.40, BETRAY: 0.35, PROTECT: 0.50, FORM_ALLIANCE: 0.45,
      };
    case 'fight':
      return {
        SPEAK: 1.20, LIE: 1.15, RELOCATE: 0.50, EXAMINE: 0.60, WAIT: 0.40,
        THREATEN: 1.60, // this cascade's own signature action
        BETRAY: 1.10, HIDE: 0.25, FLEE: 0.30, OBSERVE: 0.50, LISTEN: 0.50,
        SEARCH: 0.55, REVEAL: 0.70, PROTECT: 0.65, FORM_ALLIANCE: 0.55,
      };
    case 'fawn':
      return {
        SPEAK: 1.15, LIE: 0.70, RELOCATE: 0.60, EXAMINE: 0.80, WAIT: 1.00,
        PROTECT: 1.25, FORM_ALLIANCE: 1.20, REVEAL: 1.05, // appeasement-shaped moves
        THREATEN: 0.30, BETRAY: 0.25, HIDE: 0.70, FLEE: 0.55,
        OBSERVE: 0.85, LISTEN: 0.85, SEARCH: 0.60,
      };
    case 'collapse':
      return {
        SPEAK: 0.30, LIE: 0.20, EXAMINE: 0.30, RELOCATE: 0.20, WAIT: 1.60,
        HIDE: 1.20, // just enough will left to go still/unseen — below WAIT's dominance
        FLEE: 0.15, OBSERVE: 0.25, LISTEN: 0.25, SEARCH: 0.15,
        REVEAL: 0.20, THREATEN: 0.15, BETRAY: 0.10, PROTECT: 0.20, FORM_ALLIANCE: 0.15,
      };
    case 'arousal':
    default:
      return {};
  }
}

// ── Deriving cascade inputs from live engine state ───────────────────────────
// Maps signals the engine ALREADY tracks (emotion state, active dramatic
// pressure, spatial adjacency, ToM power_balance, accumulated suspicion) onto
// DefenseCascadeInputs. Kept separate from computeDefenseCascadeState so the
// pure state machine stays trivially unit-testable on hand-built inputs,
// while this function is the one integration seam callers (decision.ts, and
// in future the deterministic fallback) need to invoke.
export function deriveCascadeInputs(
  sheet: CharacterSheet,
  stage: Stage,
  node: Location,
  otherAgents: CharacterSheet[],
): DefenseCascadeInputs {
  const es = sheet.emotionState;
  const threatLevel = Math.max(es?.fear ?? 0, es?.distress ?? 0);
  const angerDominant = es?.dominant === 'anger' && (es?.intensity ?? 0) >= 30;

  const activePressures = stage.getActivePressures(sheet.char_id);
  // Suddenness: a fresh, high-intensity, unresolved pressure targeting this
  // character IS the "just appeared, not yet assessed" signal — the same
  // activePressures list decision.ts's own pressureBlock/overwhelmBlock read.
  const suddenness = activePressures.length > 0
    ? Math.max(...activePressures.map(p => p.intensity))
    : 0;
  const socialThreat = otherAgents.length > 0 && (
    activePressures.some(p => Boolean(p.source_char_id)) || Boolean(es?.anger_target_id)
  );

  const powerSamples = otherAgents
    .map(a => sheet.theoryOfMind?.[a.char_id]?.power_balance)
    .filter((v): v is number => typeof v === 'number');
  // TheoryOfMind.power_balance: 0 = they dominate, 0.5 = equal, 1 = I dominate
  // (types.ts). Re-centered onto -100..100 (negative = dominated) and
  // averaged across everyone present so one skewed relationship among many
  // doesn't singlehandedly flip the cascade.
  const powerDifferential = powerSamples.length > 0
    ? (powerSamples.reduce((s, v) => s + v, 0) / powerSamples.length - 0.5) * 200
    : 0;

  const escapeAvailable = node.adjacent_locations.length > 0;

  // No per-turn "under threat since" counter is persisted on CharacterSheet.
  // suspicion_score is the closest available proxy for accumulated exposure:
  // in this engine it only climbs through repeated accusation/pressure across
  // many turns (agent/deterministic.ts's ACCUSATION_SUSPICION_BUMP is capped
  // per-turn), so a sustained-high value already reflects sustained threat
  // rather than a one-turn spike. Scaled coarsely into a turn-count shape.
  const exposureTurns = Math.round((sheet.suspicion_score ?? 0) / 20);

  return { threatLevel, suddenness, escapeAvailable, powerDifferential, socialThreat, angerDominant, exposureTurns };
}

// ── Trinity (Id / Ego / Superego) decision arbitration (blueprint §19) ───────
// Deterministic scoring of the three Freudian decision agents purely from the
// character sheet's ALREADY-TRACKED state (emotion, stakes, goal DAG,
// personality traits, ToM obligations) — no new engine state required. The
// highest-weighted agent dictates the action's CATEGORY; the runner-up
// "colors" its execution (the blueprint's own phrase) — e.g. an Id-driven
// action colored by Superego still serves the raw drive, but is delivered
// hedged, guilty, or self-justifying rather than purely.

export type TrinityAgent = 'id' | 'ego' | 'superego';

export interface TrinityArbitrationResult {
  idProposal: number;        // 0–100 weight
  egoAssessment: number;     // 0–100 weight
  superegoPressure: number;  // 0–100 weight
  winner: TrinityAgent;      // dictates the action's category
  colorer: TrinityAgent;     // runner-up — colors how the winner's category is executed
  rationale: string;
}

function averageDebt(sheet: CharacterSheet): number {
  const tom = sheet.theoryOfMind ? Object.values(sheet.theoryOfMind) : [];
  const debts = tom.map(t => t.debt).filter((v): v is number => typeof v === 'number');
  return debts.length > 0 ? debts.reduce((s, v) => s + v, 0) / debts.length : 0;
}

function maxActiveSurvivalStake(sheet: CharacterSheet): number {
  const stakes = (sheet.stakes ?? []).filter(s => s.is_active && s.category === 'survival');
  return stakes.length > 0 ? Math.max(...stakes.map(s => s.magnitude)) : 0;
}

/**
 * Deterministic Id/Ego/Superego arbitration. Pure function of the character
 * sheet's current state — same sheet always yields the same winner/colorer,
 * and every optional field is defaulted so a minimal/empty sheet never throws.
 *
 *  - Id:       raw drive intensity (fear/anger/distress — the "fight or
 *              flee/attack" emotions, NOT shame/pride which are self-
 *              conscious and belong to the Superego instead) + how much
 *              survival is actively on the line + a small Dark-Triad
 *              impulsivity kicker (psychopathy/narcissism erode restraint).
 *  - Ego:      goal feasibility (a real, unblocked instrumental plan reads as
 *              more "ego available to work with" than a vague terminal wish)
 *              + conscientiousness (deliberate capacity) + a clear situational
 *              read (low suspicion → the character can reason, rather than
 *              being consumed by watching their own back).
 *  - Superego: shame (the self-conscious moral-violation emotion) +
 *              agreeableness (as the nearest tracked proxy for internalized
 *              terminal values/concern for others) + conscience strength
 *              (inverse of machiavellianism/psychopathy) + relationship
 *              obligation (average ToM debt owed to others present).
 */
export function arbitrateTrinity(sheet: CharacterSheet): TrinityArbitrationResult {
  const dt = sheet.darkTriad ?? { machiavellianism: 50, narcissism: 50, psychopathy: 50 };
  const bf = sheet.bigFive ?? { openness: 50, conscientiousness: 50, extraversion: 50, agreeableness: 50, neuroticism: 50 };
  const es = sheet.emotionState;
  const gs = sheet.goalStack;
  const suspicion = sheet.suspicion_score ?? 0;

  // ── Id: raw drive intensity + survival stakes ──
  const threatDrive = Math.max(es?.fear ?? 0, es?.anger ?? 0, es?.distress ?? 0);
  const survivalStake = maxActiveSurvivalStake(sheet);
  const idImpulsivity = (dt.psychopathy + dt.narcissism) / 2;
  const idProposal = clampPct(0.5 * threatDrive + 0.4 * survivalStake + 0.1 * idImpulsivity);

  // ── Ego: goal feasibility + deliberate capacity ──
  let feasibility = 10; // no explicit plan structure at all — least for Ego to work with
  if (gs) {
    const total = gs.instrumental.length;
    feasibility = total > 0
      ? 15 + 35 * (getReadyGoals(gs).length / total)
      : 20; // terminal objective exists but no instrumental plan yet
  }
  const egoAssessment = clampPct(feasibility + 0.3 * bf.conscientiousness + 0.2 * (100 - suspicion));

  // ── Superego: moral-violation pressure + terminal values + conscience + obligation ──
  const conscienceStrength = 100 - (dt.machiavellianism + dt.psychopathy) / 2;
  const obligation = averageDebt(sheet) * 100;
  const superegoPressure = clampPct(
    0.35 * (es?.shame ?? 0) + 0.25 * bf.agreeableness + 0.2 * conscienceStrength + 0.2 * obligation,
  );

  // Sorted descending; Array.prototype.sort is stable (ES2019+), so ties
  // resolve in the fixed input order id > ego > superego — a documented,
  // deterministic tie-break rather than an accidental one.
  const ranked: Array<[TrinityAgent, number]> = ([
    ['id', idProposal],
    ['ego', egoAssessment],
    ['superego', superegoPressure],
  ] as Array<[TrinityAgent, number]>).sort((a, b) => b[1] - a[1]);

  const [winner] = ranked[0];
  const [colorer] = ranked[1];

  const rationale = `id=${idProposal} ego=${egoAssessment} superego=${superegoPressure} → ${winner.toUpperCase()} dictates the action category, colored by ${colorer.toUpperCase()}.`;

  return { idProposal, egoAssessment, superegoPressure, winner, colorer, rationale };
}

// Winner/colorer → ActionType score multipliers, blended 70/30 (winner
// dictates the category; the runner-up only "colors" execution, per the
// blueprint's own phrasing) — combined multiplicatively with effectiveScore()
// in decision.ts's selectBestAction, mirroring cascadeActionBias() above.
// X1: new-vocabulary entries follow each agent's existing character —
//   - id (raw drive): favors the two most aggressive/impulsive new actions
//     (THREATEN, BETRAY) and the panic exit (FLEE); mildly disfavors the
//     patience HIDE requires.
//   - ego (rational self-interest): favors the calculated information-
//     gathering actions (SEARCH/OBSERVE/LISTEN) and a strategic alliance.
//   - superego (conscience): favors the prosocial/honest moves (PROTECT,
//     REVEAL) and strongly disfavors the two that violate trust (BETRAY,
//     THREATEN).
const TRINITY_ACTION_BIAS: Record<TrinityAgent, Partial<Record<ActionType, number>>> = {
  id:       { LIE: 1.20, SPEAK: 1.10, RELOCATE: 1.10, EXAMINE: 0.85, WAIT: 0.75,
              THREATEN: 1.25, BETRAY: 1.20, FLEE: 1.15, HIDE: 0.90 },
  ego:      { EXAMINE: 1.25, WAIT: 1.10, SPEAK: 1.00, LIE: 0.90, RELOCATE: 0.95,
              SEARCH: 1.20, OBSERVE: 1.15, LISTEN: 1.10, FORM_ALLIANCE: 1.05 },
  superego: { LIE: 0.55, SPEAK: 1.15, EXAMINE: 1.05, WAIT: 1.00, RELOCATE: 0.90,
              PROTECT: 1.30, REVEAL: 1.20, BETRAY: 0.40, THREATEN: 0.60 },
};

export function trinityActionBias(winner: TrinityAgent, colorer: TrinityAgent): Partial<Record<ActionType, number>> {
  const winnerBias = TRINITY_ACTION_BIAS[winner];
  const colorerBias = TRINITY_ACTION_BIAS[colorer];
  const actionTypes = new Set<ActionType>([
    ...(Object.keys(winnerBias) as ActionType[]),
    ...(Object.keys(colorerBias) as ActionType[]),
  ]);
  const blended: Partial<Record<ActionType, number>> = {};
  for (const a of actionTypes) {
    const w = winnerBias[a] ?? 1.0;
    const c = colorerBias[a] ?? 1.0;
    blended[a] = w * 0.7 + c * 0.3;
  }
  return blended;
}

// Plain-language guidance string for the agent prompt: "decide as WINNER
// colored by RUNNER-UP" per the blueprint's arbitration rule.
export function describeTrinityGuidance(result: TrinityArbitrationResult): string {
  const label: Record<TrinityAgent, string> = {
    id: 'raw drive/impulse — pursue what the emotion and stakes demand, with minimal restraint',
    ego: 'rational self-interest — weigh the realistic, goal-feasible move',
    superego: 'internalized conscience — do what your values and obligations to others require, even at a personal cost',
  };
  return `Decide as ${result.winner.toUpperCase()} (${label[result.winner]}), colored by ${result.colorer.toUpperCase()} (${label[result.colorer]}).`;
}
