// ── Agent psychology & strategy helpers ──────────────────────────────────────
// Pure, deterministic functions extracted from Agent.ts (M4 decomposition).
// None of these touch the Stage or perform LLM calls — they map a character's
// static traits + transient emotional state to prompt fragments and strategy
// selections. Keeping them here makes the Agent class a thin coordinator and
// makes the psychology layer independently unit-testable.

import type {
  CharacterSheet,
  DarkTriad,
  BigFive,
  AttachmentStyle,
  DefenseMechanism,
  EmotionState,
  EmotionType,
  Goal,
  GoalStack,
  PersuasionStrategy,
  PersuasionRecord,
} from '../types.ts';

export function describeAttachment(style: AttachmentStyle | undefined): string {
  switch (style) {
    case 'anxious':          return 'You cling to connection; under pressure you over-explain and seek reassurance. You avoid relocating until forced.';
    case 'avoidant':         return 'You suppress discomfort through withdrawal. When tension rises your instinct is to leave the room rather than confront.';
    case 'anxious_avoidant': return 'You simultaneously crave and fear closeness. You may provoke conflict then recoil from its consequences.';
    default:                 return 'You engage with situations directly and can regulate your responses under pressure.';
  }
}

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
