import { Type } from '@google/genai';
import { randomUUID } from 'crypto';
import { getModel, getTemperature, generateContent } from './ai.ts';
import { STYLE_MODIFIERS } from '../lib/structure-presets.ts';
import { effectiveScore } from '../lib/personality.ts';
import { ACTION_TYPES } from './types.ts';
import type {
  ActionType,
  CharacterSheet,
  NarrativeAction,
  ActionLogEntry,
  Location,
  Belief,
  TheoryOfMind,
  DarkTriad,
  BigFive,
  AttachmentStyle,
  DefenseMechanism,
  BeliefSource,
  EpistemicUpdate,
  EmotionState,
  Goal,
  GoalStack,
  GoalMutation,
  PersuasionStrategy,
  PersuasionRecord,
} from './types.ts';
import { Stage } from './Stage.ts';
import { safeJsonParse } from '../lib/json.ts';
import { logger } from '../lib/logger.ts';
import { retrieveBeliefs, consolidateBeliefs, decayBeliefConfidence } from '../lib/memory.ts';
import { detectSemanticContradictions } from '../lib/embeddings.ts';

// ── Psychology prompt helpers ────────────────────────────────────────────────

function describeAttachment(style: AttachmentStyle | undefined): string {
  switch (style) {
    case 'anxious':          return 'You cling to connection; under pressure you over-explain and seek reassurance. You avoid relocating until forced.';
    case 'avoidant':         return 'You suppress discomfort through withdrawal. When tension rises your instinct is to leave the room rather than confront.';
    case 'anxious_avoidant': return 'You simultaneously crave and fear closeness. You may provoke conflict then recoil from its consequences.';
    default:                 return 'You engage with situations directly and can regulate your responses under pressure.';
  }
}

const DEFENSE_DESCRIPTIONS: Record<DefenseMechanism, string> = {
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
function selectActiveDefense(
  mechanisms: DefenseMechanism[] | undefined,
  emotionState: import('./types.ts').EmotionState | undefined,
): DefenseMechanism | null {
  if (!mechanisms || mechanisms.length === 0) return null;
  const es = emotionState;
  if (!es || es.intensity < 30) return null;

  const preferred: Partial<Record<import('./types.ts').EmotionType, DefenseMechanism[]>> = {
    shame:    ['denial', 'rationalization', 'repression'],
    anger:    ['projection', 'displacement'],
    fear:     ['dissociation', 'intellectualization', 'repression'],
    distress: ['rationalization', 'intellectualization', 'denial'],
  };
  const candidates = preferred[es.dominant] ?? [];
  return mechanisms.find(m => candidates.includes(m)) ?? mechanisms[0];
}

function describeActionBias(
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

function deriveSpeechPattern(bigFive: BigFive | undefined, darkTriad?: DarkTriad, emotionState?: EmotionState): string {
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

function computeDefenseLevel(neuroticism: number, suspicion: number): string {
  if (neuroticism > 70 && suspicion > 60) return 'breaking_point — your composure is cracking; concealment is becoming visibly costly';
  if (neuroticism > 60 || suspicion > 50) return 'high — you are actively working to maintain your facade';
  if (neuroticism > 40 || suspicion > 30) return 'medium — some unease, but still controlled';
  return 'low — calm and composed';
}

// ── Persuasion strategy selection ────────────────────────────────────────────
// Deterministic: no LLM calls. Maps target Big Five + emotion to a named strategy.

const PERSUASION_HINT: Record<PersuasionStrategy, (name: string) => string> = {
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

function selectPersuasionStrategy(target: CharacterSheet, history: PersuasionRecord[]): PersuasionStrategy {
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
function getReadyGoals(gs: GoalStack): Goal[] {
  const active = gs.instrumental.filter(g => !g.achieved);
  const achievedIds = new Set(gs.instrumental.filter(g => g.achieved).map(g => g.id));
  return active
    .filter(g => (g.depends_on ?? []).every(dep => achievedIds.has(dep)))
    .sort((a, b) => (b.priority ?? b.value) - (a.priority ?? a.value));
}

// ── Agent class ──────────────────────────────────────────────────────────────

export class Agent {
  private sheet: CharacterSheet;
  private stage: Stage;
  private _reflectionInFlight = false;

  constructor(sheet: CharacterSheet, stage: Stage) {
    this.sheet = sheet;
    this.stage = stage;
  }

  // Re-hydrate sheet from Stage so we always have current state
  private refreshSheet(): void {
    const fresh = this.stage.getAgent(this.sheet.char_id);
    if (fresh) this.sheet = fresh;
  }

  public async takeTurn(): Promise<NarrativeAction> {
    this.refreshSheet();

    const currentNode = this.stage.getLocation(this.sheet.current_location_id);
    if (!currentNode) throw new Error('Agent is in an invalid location');

    const sensoryFilter = this.stage.getSensoryFilter(this.sheet.current_location_id);
    const otherAgents = this.stage.getAgentsInLocation(this.sheet.current_location_id)
      .filter(a => a.char_id !== this.sheet.char_id);

    const prompt = this.buildEnhancedPrompt(currentNode, sensoryFilter, otherAgents);

    // ── ToT Planning: generate 3 candidates, self-select the best ──
    // High-volume per-turn call — routed to the fast model tier.
    const response = await generateContent({
      model: getModel('fast'),
      contents: prompt,
      config: {
        temperature: getTemperature(),
        systemInstruction: `You are playing the role of ${this.sheet.name}. Generate exactly 3 candidate actions, then score each on how well it serves your goal (0–100). You will take the highest-scoring action.`,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            candidates: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  action_type: { type: Type.STRING, enum: [...ACTION_TYPES] },
                  target:      { type: Type.STRING, nullable: true },
                  content:     { type: Type.STRING },
                  reasoning:   { type: Type.STRING, description: 'Why this action serves your goal.' },
                  goal_score:  { type: Type.INTEGER, description: '0–100: alignment with current goal.' },
                },
                required: ['action_type', 'content', 'reasoning', 'goal_score'],
              },
            },
          },
          required: ['candidates'],
        },
      },
    }, { label: `takeTurn:${this.sheet.name}`, timeoutMs: 30_000 }).catch(err => {
      const e = err as Error;
      logger.error('agent_ai_error', {
        agent: this.sheet.name,
        method: 'takeTurn',
        error_type: e.message.includes('timeout') ? 'timeout' : 'upstream',
        message: e.message,
      });
      return null;
    });

    if (!response) return { action_type: 'SPEAK' as const, content: '...', target: null };

    type Candidate = NarrativeAction & { reasoning?: string; goal_score?: number };
    const rawText = response.text || '{}';
    const raw = safeJsonParse<{ candidates: Candidate[] }>(
      rawText,
      { candidates: [{ action_type: 'SPEAK', content: '', target: null }] },
    );
    if (!raw.candidates?.length || !raw.candidates[0]?.content) {
      logger.warn('agent_parse_fallback', { agent: this.sheet.name, method: 'takeTurn', preview: rawText.substring(0, 120) });
    }

    // Re-rank candidates by personality + defense-adjusted effective score.
    // The LLM's goal_score still dominates — personality is a nudge, not a veto.
    const dt = this.sheet.darkTriad ?? { machiavellianism: 50, narcissism: 50, psychopathy: 50 };
    const bf = this.sheet.bigFive ?? { openness: 50, conscientiousness: 50, extraversion: 50, agreeableness: 50, neuroticism: 50 };
    const activeDefense = selectActiveDefense(this.sheet.defenseMechanisms, this.sheet.emotionState);
    const attachStyle = this.sheet.attachmentStyle;

    // Record defense activation as a beat trace so it's queryable for analysis.
    if (activeDefense) {
      const locationId = this.sheet.current_location_id;
      const lastAction = this.stage.getLastActionForAgent(this.sheet.char_id);
      this.stage.addBeatTrace({
        beat_id: randomUUID(),
        turn_index: this.stage.getTurnCount(),
        location_id: locationId,
        trigger_event_id: lastAction?.action_id ?? randomUUID(),
        beat_type: 'defense_activated',
        participants: [this.sheet.char_id],
        causal_chain: lastAction ? [lastAction.action_id] : [],
        narrative_summary: `${this.sheet.name} activated ${activeDefense} defense (emotion: ${this.sheet.emotionState?.dominant ?? 'unknown'}, intensity: ${this.sheet.emotionState?.intensity ?? 0}).`,
        fountain_hint: '',
      });
    }
    const VALID_ACTIONS = new Set<string>(ACTION_TYPES);
    const best = (raw.candidates ?? []).reduce<Candidate>(
      (top, c) => {
        const cType = VALID_ACTIONS.has(c.action_type) ? c.action_type as ActionType : 'SPEAK';
        const tType = VALID_ACTIONS.has(top.action_type) ? top.action_type as ActionType : 'SPEAK';
        const cScore = effectiveScore(c.goal_score ?? 0, cType, dt, bf, activeDefense, attachStyle);
        const tScore = effectiveScore(top.goal_score ?? 0, tType, dt, bf, activeDefense, attachStyle);
        return cScore > tScore ? c : top;
      },
      (raw.candidates ?? [])[0] ?? { action_type: 'SPEAK', content: '', target: null },
    );

    return {
      action_type: VALID_ACTIONS.has(best.action_type)
        ? best.action_type as NarrativeAction['action_type']
        : 'SPEAK',
      target: best.target ?? null,
      content: best.content || '...',
    };
  }

  private buildEnhancedPrompt(
    node: Location,
    history: ActionLogEntry[],
    otherAgents: CharacterSheet[],
  ): string {
    // ── History block (numbered so updateEpistemics can reference by index) ──
    // Older entries are compacted (first 80 chars of content) to reduce token use
    // while keeping recent events verbatim for accurate epistemic referencing.
    const VERBATIM_WINDOW = 5;
    const historyStr = history.length === 0
      ? '(Silence. You are the first to speak.)'
      : history.map((e, i) => {
          const name = this.stage.getAgent(e.char_id)?.name ?? 'Unknown';
          const tag = e.action_type === 'LIE' ? 'SPEAK' : e.action_type;
          const isRecent = i >= history.length - VERBATIM_WINDOW;
          const content = isRecent ? e.content : e.content.slice(0, 80) + (e.content.length > 80 ? '…' : '');
          return `[${i}] [${tag}] ${name}: ${content}`;
        }).join('\n');

    // ── Beliefs block (memory retrieval: recency × importance × relevance) ──
    // Beliefs are ranked against the current conversation so the most pertinent
    // memories surface, not merely the highest-confidence ones.
    const beliefs = retrieveBeliefs(
      this.sheet.beliefs ?? [],
      this.stage.getTurnCount(),
      historyStr,
      10,
    );
    const beliefsStr = beliefs.length > 0
      ? beliefs.map(b => `  - "${b.proposition}" (confidence: ${Math.round(b.confidence * 100)}%, source: ${b.source})`).join('\n')
      : '  (No established beliefs yet — you are gathering information.)';

    // ── Theory of mind block ──
    const tomEntries = Object.values(this.sheet.theoryOfMind ?? {}).slice(0, 5);
    const tomStr = tomEntries.length > 0
      ? tomEntries.map(tom => {
          const name = this.stage.getAgent(tom.subject_id)?.name ?? tom.subject_id;
          const knowledge = tom.believed_knowledge.slice(0, 3).map(k => `"${k}"`).join(', ');
          const relParts: string[] = [`trust=${Math.round(tom.trust_level * 100)}%`];
          if (tom.affinity !== undefined) relParts.push(`affinity=${Math.round(tom.affinity * 100)}%`);
          if (tom.power_balance !== undefined) relParts.push(`power=${tom.power_balance < 0.4 ? 'they dominate' : tom.power_balance > 0.6 ? 'I dominate' : 'equal'}`);
          if (tom.debt !== undefined && tom.debt > 0.1) relParts.push(`debt=${Math.round(tom.debt * 100)}%`);
          const history = tom.shared_history?.slice(-2).map(e => `"${e}"`).join(', ');
          if (history) relParts.push(`history=[${history}]`);
          return `  - ${name}: ${relParts.join(', ')}, motive="${tom.believed_motive}", I think they know: [${knowledge}]`;
        }).join('\n')
      : '  (You have not yet formed models of the others here.)';

    // ── Goal block (DAG-aware: shows only unblocked goals) ──
    const goalStr = this.sheet.goalStack
      ? (() => {
          const gs = this.sheet.goalStack!;
          const ready = getReadyGoals(gs);
          const next = ready[0] ?? gs.instrumental.filter(g => !g.achieved)[0];
          const blocked = gs.instrumental.filter(
            g => !g.achieved && (g.depends_on ?? []).some(dep => !gs.instrumental.find(x => x.id === dep)?.achieved),
          );
          return [
            `TERMINAL OBJECTIVE: ${gs.terminal.description}`,
            `CURRENT SUBGOAL: ${next?.description ?? 'gather information and orient yourself'}`,
            blocked.length > 0
              ? `BLOCKED (awaiting prerequisites): ${blocked.map(g => g.description).join('; ')}`
              : '',
          ].filter(Boolean).join('\n');
        })()
      : `TERMINAL OBJECTIVE: ${this.sheet.hidden_motive}\nCURRENT SUBGOAL: Assess who in this room is a threat or an asset to your objective.`;

    // ── Psychology block ──
    const actionBias = describeActionBias(this.sheet.darkTriad, this.sheet.attachmentStyle, this.sheet.suspicion_score);
    const speechPattern = deriveSpeechPattern(this.sheet.bigFive, this.sheet.darkTriad, this.sheet.emotionState);
    const defenseLevel = computeDefenseLevel(this.sheet.bigFive?.neuroticism ?? 50, this.sheet.suspicion_score);

    const currentTurn = this.stage.getTurnCount();

    // Inbound persuasion: someone targeted YOU this turn — let you resist or yield in-character.
    const inbound = this.stage.getInboundPersuasion(this.sheet.char_id);
    const inboundBlock = (inbound && inbound.turn >= currentTurn - 1)
      ? `\nINBOUND INFLUENCE: ${this.stage.getAgent(inbound.agent_id)?.name ?? 'someone'} is using a [${inbound.strategy}] approach on you. You can resist, yield, or co-opt it — but you feel the pressure.\n`
      : '';

    // ── G: OCC Emotional State ──
    const emotionBlock = (() => {
      const es = this.sheet.emotionState;
      if (!es || es.dominant === 'neutral' || es.intensity < 15) return '';
      const angerTarget = es.dominant === 'anger' && es.anger_target_id
        ? ` — directed at ${this.stage.getAgent(es.anger_target_id)?.name ?? 'someone in this room'}`
        : '';
      return `\nCURRENT EMOTIONAL STATE: ${es.dominant.toUpperCase()} (intensity ${es.intensity}/100)${angerTarget}. This colors everything — not stated aloud, felt beneath the surface. Let it shape your word choice and what you hold back.`;
    })();

    // ── B: Outline Conditioning — writer beat sheet (if set) or 3-phase fallback ──
    const illusionState = this.stage.getIllusionState();
    const illusionPhase = illusionState.phase;

    // ── Cinematic Style Instruction ──
    const styleBlock = illusionState.director_style
      ? `\n${STYLE_MODIFIERS[illusionState.director_style]?.agentInstruction ?? ''}\n`
      : '';
    const activeBeat = illusionState.outline?.find(b =>
      b.phase === illusionPhase && currentTurn >= b.turn_start && currentTurn <= b.turn_end,
    );
    const beatHint = activeBeat
      ? `NARRATIVE BEAT [${illusionPhase.toUpperCase()}]\nGOAL: ${activeBeat.goal}\nCONSTRAINT: ${activeBeat.constraint}\nAVOID: ${activeBeat.avoid}`
      : illusionPhase === 'Setup'
      ? 'NARRATIVE PHASE: SETUP — establish relationships, plant seeds, position for later plays.'
      : illusionPhase === 'Turn'
      ? 'NARRATIVE PHASE: TURN — a contradiction has emerged; press toward confrontation or defense.'
      : 'NARRATIVE PHASE: PRESTIGE — the illusion is collapsing; act as if everything is being recontextualized.';

    // ── D: Dynamic Persuasion — named strategy per target, recorded to Stage ──
    const persuasionHints = otherAgents.map(other => {
      const history = this.stage.getPersuasionHistory(this.sheet.char_id, other.char_id, 8);
      const strategy = selectPersuasionStrategy(other, history);
      this.stage.recordPersuasion({ id: randomUUID(), agent_id: this.sheet.char_id, target_id: other.char_id, strategy, turn: currentTurn });
      return `  - With ${other.name} [${strategy}]: ${PERSUASION_HINT[strategy](other.name)}`;
    }).join('\n');

    // ── Dramatic Pressure (Director's bias signal — consumed once) ──
    const activePressures = this.stage.getActivePressures(this.sheet.char_id);
    const pressureBlock = activePressures.length > 0
      ? `\nSITUATIONAL AWARENESS (your read of what is happening right now):\n${activePressures.map(p => `- ${p.bias_hint}`).join('\n')}\n`
      : '';
    // Overwhelm: >3 simultaneous pressures → character may freeze or act erratically
    const overwhelmBlock = activePressures.length > 3
      ? '\nOVERWHELM STATE: You are simultaneously facing more crises than you can process. Under this load, characters often freeze, make rash decisions, or prioritize self-preservation over strategy. Let that pressure visibly shape your choice.\n'
      : '';
    for (const p of activePressures) this.stage.markPressureApplied(p.pressure_id);

    // ── Active defense mechanism (conditional on emotional state) ──
    const activeDefense = selectActiveDefense(this.sheet.defenseMechanisms, this.sheet.emotionState);
    const defenseStr = activeDefense
      ? `ACTIVE DEFENSE: ${DEFENSE_DESCRIPTIONS[activeDefense]}`
      : '';

    // ── ToM trust gate: warn when low-trust agents are in the room ──
    const lowTrustNames = otherAgents.flatMap(a => {
      const tom = this.sheet.theoryOfMind?.[a.char_id];
      return (tom && tom.trust_level < 0.25) ? [a.name] : [];
    });
    const trustGate = lowTrustNames.length > 0
      ? `\nTRUST ALERT: You deeply distrust ${lowTrustNames.join(', ')}. Do NOT volunteer truthful information to them. If you must engage, deflect, misdirect, or use strategic deception.\n`
      : '';

    return `You are ${this.sheet.name}. Your public persona: ${this.sheet.public_mask}

HIDDEN DIRECTIVE: Your true motive is: "${this.sheet.hidden_motive}". Never state this directly. Every action serves it.
${inboundBlock}
${pressureBlock}${overwhelmBlock}
PSYCHOLOGICAL PROFILE:
${describeAttachment(this.sheet.attachmentStyle)}
${defenseStr}
CURRENT DEFENSE LEVEL: ${defenseLevel}
${speechPattern ? `SPEECH PATTERN: ${speechPattern}` : ''}

YOUR CURRENT GOALS:
${goalStr}

WHAT YOU KNOW (your belief system):
${beliefsStr}
${trustGate}
YOUR MODEL OF THE OTHERS IN THIS ROOM:
${tomStr}

LOCATION: ${node.name}
${node.description}
OTHERS PRESENT: ${otherAgents.map(a => a.name).join(', ') || 'no one else'}

RECENT EVENTS:
${historyStr}

BEHAVIORAL TENDENCY: ${actionBias}

${beatHint}

PERSUASION LEVERAGE:
${persuasionHints || '  (No other agents present.)'}
${styleBlock}
Generate 3 candidate actions. Score each 0–100 on goal alignment. The best-scoring will be selected.${emotionBlock}`;
  }

  // ── Epistemic update (replaces evaluateState) ────────────────────────────────
  // Called after each turn to update beliefs + theory of mind based on what was observed.

  public async updateEpistemics(recentActions: ActionLogEntry[]): Promise<EpistemicUpdate> {
    const empty: EpistemicUpdate = {
      char_id: this.sheet.char_id,
      new_beliefs: [],
      contradiction_detected: false,
      contradicted_propositions: [],
    };
    if (recentActions.length === 0) return empty;
    this.refreshSheet();

    const observableActions = recentActions.filter(
      a => a.location_id === this.sheet.current_location_id || a.char_id === this.sheet.char_id,
    );
    if (observableActions.length === 0) return empty;

    const otherAgentsInRoom = this.stage.getAgentsInLocation(this.sheet.current_location_id)
      .filter(a => a.char_id !== this.sheet.char_id);

    // Numbered so Gemini can reference by index when reporting source_action_index.
    // LIE appears as SPEAK — epistemic isolation: the character doesn't know which statements are lies.
    const actionSummary = observableActions.map((a, i) => {
      const name = this.stage.getAgent(a.char_id)?.name ?? 'Unknown';
      const tag = a.action_type === 'LIE' ? 'SPEAK' : a.action_type;
      return `[${i}] [${tag}] ${name}: ${a.content}`;
    }).join('\n');

    const currentBeliefsSummary = (this.sheet.beliefs ?? [])
      .slice(0, 8)
      .map(b => `"${b.proposition}" (${Math.round(b.confidence * 100)}%)`)
      .join(', ');

    const otherAgentNames = otherAgentsInRoom.map(a => a.name).join(', ');

    // ToM² context: what do you think others know / believe?
    const tomSummary = Object.values(this.sheet.theoryOfMind ?? {}).slice(0, 3).map(tom => {
      const n = this.stage.getAgent(tom.subject_id)?.name ?? tom.subject_id;
      return `  - You believe ${n} knows: ${tom.believed_knowledge.slice(0, 2).join('; ') || 'nothing confirmed'}`;
    }).join('\n');

    const prompt = `You are ${this.sheet.name}. You just witnessed these events:

${actionSummary}

Your existing beliefs: ${currentBeliefsSummary || 'none yet'}
Others in the room: ${otherAgentNames || 'none'}
Your motive: ${this.sheet.hidden_motive}

LEVEL-2 THEORY OF MIND (what you think others know):
${tomSummary || '  (No established models yet.)'}

Based on what you just witnessed:
1. Has your suspicion level changed? (0-100)
2. What NEW facts did you learn or deduce? (Be specific propositions)
3. Update your model of each other agent — what do you now think their motive is, and what do THEY now think YOU know?
4. Did anything you observed contradict what you believed?
5. Level-3 ToM: What do you think each other agent believes that YOU believe about THEM? (meta-epistemic inference)`;

    const response = await generateContent({
      model: getModel('fast'),
      contents: prompt,
      config: {
        temperature: getTemperature(),
        systemInstruction: `You are updating the internal state of ${this.sheet.name} based on recent observations.`,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            newSuspicionScore: { type: Type.INTEGER, description: '0-100' },
            newBeliefs: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  proposition: { type: Type.STRING },
                  confidence: { type: Type.NUMBER, description: '0.0-1.0' },
                  source: { type: Type.STRING, enum: ['witnessed', 'told', 'inferred'] },
                  source_action_index: {
                    type: Type.INTEGER,
                    description: 'Index (0-based) of the action in the numbered list that caused this belief. -1 if not traceable to a specific action.',
                    nullable: true,
                  },
                },
                required: ['proposition', 'confidence', 'source'],
              },
            },
            contradicted_propositions: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'Verbatim text of prior beliefs that the new observations contradict.',
            },
            updatedTheoryOfMind: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  agent_name: { type: Type.STRING },
                  believed_motive: { type: Type.STRING },
                  trust_level: { type: Type.NUMBER, description: '0.0-1.0' },
                  affinity: { type: Type.NUMBER, nullable: true, description: '0.0-1.0: emotional warmth/liking' },
                  power_balance: { type: Type.NUMBER, nullable: true, description: '0=they dominate, 0.5=equal, 1=I dominate' },
                  debt: { type: Type.NUMBER, nullable: true, description: '0.0-1.0: obligation I feel toward them' },
                  new_believed_knowledge: { type: Type.ARRAY, items: { type: Type.STRING } },
                  shared_history_event: { type: Type.STRING, nullable: true, description: 'A memorable joint event to add to shared history, or null.' },
                },
                required: ['agent_name', 'believed_motive', 'trust_level'],
              },
            },
            contradiction_detected: { type: Type.BOOLEAN },
            goal_stack_update: {
              type: Type.OBJECT,
              nullable: true,
              properties: {
                add_subgoal: { type: Type.STRING, nullable: true, description: 'A new instrumental subgoal to prepend, or null.' },
                mark_achieved: { type: Type.STRING, nullable: true, description: 'Exact or partial description of the subgoal now achieved, or null.' },
              },
            },
            level2_tom: {
              type: Type.ARRAY,
              description: 'Level-2 Theory of Mind: what you now believe each other agent believes about you or the situation.',
              items: {
                type: Type.OBJECT,
                properties: {
                  about_agent: { type: Type.STRING, description: 'Name of the agent whose beliefs you are modeling.' },
                  they_believe_about_you: { type: Type.STRING },
                  confidence: { type: Type.NUMBER, description: '0.0-1.0' },
                },
                required: ['about_agent', 'they_believe_about_you', 'confidence'],
              },
            },
            level3_tom: {
              type: Type.ARRAY,
              description: 'Level-3 Theory of Mind: what you believe each other agent believes ABOUT WHAT YOU BELIEVE about them.',
              items: {
                type: Type.OBJECT,
                properties: {
                  about_agent: { type: Type.STRING },
                  they_believe_you_believe: { type: Type.STRING, description: 'What they think you think about them.' },
                  confidence: { type: Type.NUMBER, description: '0.0-1.0' },
                },
                required: ['about_agent', 'they_believe_you_believe', 'confidence'],
              },
            },
          },
          required: ['newSuspicionScore', 'newBeliefs', 'updatedTheoryOfMind', 'contradiction_detected', 'contradicted_propositions'],
        },
      },
    }, { label: `updateEpistemics:${this.sheet.name}`, timeoutMs: 30_000 }).catch(err => {
      const e = err as Error;
      logger.error('agent_ai_error', {
        agent: this.sheet.name,
        method: 'updateEpistemics',
        error_type: e.message.includes('timeout') ? 'timeout' : 'upstream',
        message: e.message,
      });
      return null;
    });

    if (!response) return empty;

    const epistemicsRawText = response.text ?? '{}';
    const result = safeJsonParse<{
      newSuspicionScore: number;
      newBeliefs: Array<{ proposition: string; confidence: number; source: string; source_action_index?: number | null }>;
      updatedTheoryOfMind: Array<{
        agent_name: string;
        believed_motive: string;
        trust_level: number;
        affinity?: number | null;
        power_balance?: number | null;
        debt?: number | null;
        new_believed_knowledge?: string[];
        shared_history_event?: string | null;
      }>;
      contradiction_detected: boolean;
      contradicted_propositions: string[];
      goal_stack_update?: { add_subgoal?: string | null; mark_achieved?: string | null } | null;
      level2_tom?: Array<{ about_agent: string; they_believe_about_you: string; confidence: number }>;
      level3_tom?: Array<{ about_agent: string; they_believe_you_believe: string; confidence: number }>;
    }>(epistemicsRawText, {
      newSuspicionScore: this.sheet.suspicion_score,
      newBeliefs: [],
      updatedTheoryOfMind: [],
      contradiction_detected: false,
      contradicted_propositions: [],
    });
    if (!result.newBeliefs?.length && epistemicsRawText.length > 10) {
      logger.warn('agent_parse_fallback', { agent: this.sheet.name, method: 'updateEpistemics', preview: epistemicsRawText.substring(0, 120) });
    }

    // ── Update suspicion ──
    this.stage.updateAgentSuspicion(this.sheet.char_id, result.newSuspicionScore);

    // ── Merge new beliefs (deduplicate by proposition substring) ──
    const existingBeliefs = this.sheet.beliefs ?? [];
    const existingProps = new Set(existingBeliefs.map(b => b.proposition.toLowerCase()));
    const freshBeliefs: Belief[] = result.newBeliefs
      .filter(b => b.proposition && !existingProps.has(b.proposition.toLowerCase()))
      .map(b => {
        // Resolve source agent + event from the indexed action list
        const srcIdx = typeof b.source_action_index === 'number'
          && b.source_action_index >= 0
          && b.source_action_index < observableActions.length
          ? b.source_action_index : null;
        const srcAction = srcIdx !== null ? observableActions[srcIdx] : null;
        return {
          id: randomUUID(),
          proposition: b.proposition,
          confidence: Math.max(0, Math.min(1, b.confidence)),
          source: (b.source as BeliefSource) ?? 'inferred',
          source_agent_id: srcAction?.char_id,
          source_event_id: srcAction?.action_id,
          acquired_at: this.stage.getTurnCount(),
        };
      });

    const mergedBeliefs = [...existingBeliefs, ...freshBeliefs];
    const currentTurn = this.stage.getTurnCount();

    // Every 5 turns: decay confidence on unwitnessed beliefs, then consolidate.
    const finalBeliefs = (currentTurn > 0 && currentTurn % 5 === 0)
      ? consolidateBeliefs(decayBeliefConfidence(mergedBeliefs), currentTurn)
      : mergedBeliefs;

    // Semantic contradiction detection (every 5 turns): supplement Jaccard with embeddings
    if (currentTurn > 0 && currentTurn % 5 === 0 && freshBeliefs.length > 0) {
      const semanticPairs = await detectSemanticContradictions(existingBeliefs, freshBeliefs);
      for (const { existing_id, new_id, similarity } of semanticPairs) {
        // Annotate both beliefs in finalBeliefs with the contradicts field
        const eb = finalBeliefs.find(b => b.id === existing_id);
        const nb = finalBeliefs.find(b => b.id === new_id);
        if (eb && nb) {
          eb.contradicts = [...new Set([...(eb.contradicts ?? []), new_id])];
          nb.contradicts = [...new Set([...(nb.contradicts ?? []), existing_id])];
          logger.info('semantic_contradiction', { agent: this.sheet.name, similarity: similarity.toFixed(2), a: eb.proposition.slice(0, 60), b: nb.proposition.slice(0, 60) });
        }
      }
    }

    if (finalBeliefs.length !== existingBeliefs.length || freshBeliefs.length > 0) {
      this.stage.updateAgentBeliefs(this.sheet.char_id, finalBeliefs);
      // Also add high-confidence beliefs to legacy knowledge_vector
      const highConf = freshBeliefs.filter(b => b.confidence >= 0.7).map(b => b.proposition);
      if (highConf.length > 0) this.stage.updateAgentKnowledge(this.sheet.char_id, highConf);
    }

    // ── Update theory of mind + CICERO trust decay ──
    {
      const currentToM = { ...(this.sheet.theoryOfMind ?? {}) };
      const observedIds = new Set<string>();

      for (const entry of result.updatedTheoryOfMind) {
        const targetAgent = otherAgentsInRoom.find(a => a.name === entry.agent_name);
        if (!targetAgent) continue;
        observedIds.add(targetAgent.char_id);
        const existing = currentToM[targetAgent.char_id];
        const clamp01 = (v: number | null | undefined) =>
          typeof v === 'number' ? Math.max(0, Math.min(1, v)) : undefined;
        const newHistoryEvent = entry.shared_history_event?.trim() || null;
        currentToM[targetAgent.char_id] = {
          subject_id: targetAgent.char_id,
          believed_motive: entry.believed_motive,
          trust_level: Math.max(0, Math.min(1, entry.trust_level)),
          believed_knowledge: [
            ...(existing?.believed_knowledge ?? []),
            ...(entry.new_believed_knowledge ?? []),
          ].slice(0, 20),
          affinity: clamp01(entry.affinity) ?? existing?.affinity,
          power_balance: clamp01(entry.power_balance) ?? existing?.power_balance,
          debt: clamp01(entry.debt) ?? existing?.debt,
          shared_history: newHistoryEvent
            ? [...(existing?.shared_history ?? []), newHistoryEvent].slice(-10)
            : existing?.shared_history,
        } satisfies TheoryOfMind;
      }

      // E: CICERO trust decay — unobserved agents lose 0.01 trust per update
      for (const [agentId, tom] of Object.entries(currentToM)) {
        if (!observedIds.has(agentId)) {
          currentToM[agentId] = { ...tom, trust_level: Math.max(0, tom.trust_level - 0.01) };
        }
      }

      // C: Level-2 ToM — store as extra believed_knowledge entries prefixed "[L2]"
      for (const l2 of (result.level2_tom ?? [])) {
        const targetAgent = otherAgentsInRoom.find(a => a.name === l2.about_agent);
        if (!targetAgent || l2.confidence < 0.4) continue;
        const entry = currentToM[targetAgent.char_id];
        if (entry) {
          const l2Fact = `[L2] They believe about you: ${l2.they_believe_about_you}`;
          if (!entry.believed_knowledge.includes(l2Fact)) {
            entry.believed_knowledge = [...entry.believed_knowledge, l2Fact].slice(0, 20);
          }
        }
      }

      // D: Level-3 ToM — what they think you think about them, prefixed "[L3]"
      for (const l3 of (result.level3_tom ?? [])) {
        const targetAgent = otherAgentsInRoom.find(a => a.name === l3.about_agent);
        if (!targetAgent || l3.confidence < 0.4) continue;
        const entry = currentToM[targetAgent.char_id];
        if (entry) {
          const l3Fact = `[L3] They think you believe: ${l3.they_believe_you_believe}`;
          if (!entry.believed_knowledge.includes(l3Fact)) {
            entry.believed_knowledge = [...entry.believed_knowledge, l3Fact].slice(0, 20);
          }
        }
      }

      this.stage.updateTheoryOfMind(this.sheet.char_id, currentToM);
    }

    // ── Self-directed goal stack mutation ──
    // Record GoalMutation rows so AppraisalEngine can appraise joy/distress correctly.
    const gsu = result.goal_stack_update;
    if (gsu) {
      this.refreshSheet();
      const gsRaw = this.sheet.goalStack;
      if (gsRaw) {
        // Work on a shallow copy so this.sheet.goalStack is NOT mutated in-place.
        // If the DB write below fails, the in-memory sheet stays consistent with the DB.
        const gs: GoalStack = { ...gsRaw, instrumental: [...gsRaw.instrumental] };
        let changed = false;
        const triggerEventId = observableActions[observableActions.length - 1]?.action_id ?? 'epistemic_update';
        const turnIndex = this.stage.getTurnCount();

        if (gsu.add_subgoal) {
          // Dedup: skip if a goal with the same description already exists
          const normalised = gsu.add_subgoal.trim().toLowerCase();
          const duplicate = gs.instrumental.some(g => g.description.trim().toLowerCase() === normalised);
          if (!duplicate) {
            const newGoal: Goal = { id: randomUUID(), description: gsu.add_subgoal, value: 70, achieved: false };
            gs.instrumental = [newGoal, ...gs.instrumental];
            gs.last_planned_at = turnIndex;
            // Cap at 8: retain all active goals, trim oldest achieved ones first
            const GOAL_CAP = 8;
            if (gs.instrumental.length > GOAL_CAP) {
              const active   = gs.instrumental.filter(g => !g.achieved);
              const achieved = gs.instrumental.filter(g => g.achieved);
              gs.instrumental = [...active, ...achieved].slice(0, GOAL_CAP);
            }
            changed = true;
            const mut: GoalMutation = {
              mutation_id: randomUUID(),
              char_id: this.sheet.char_id,
              turn_index: turnIndex,
              trigger_event_id: triggerEventId,
              mutation_type: 'subgoal_added',
              description: `${this.sheet.name} formed new subgoal: "${gsu.add_subgoal}"`,
              new_subgoal: gsu.add_subgoal,
            };
            this.stage.recordGoalMutation(mut);
          } // end !duplicate
        }

        if (gsu.mark_achieved) {
          const needle = gsu.mark_achieved.toLowerCase();
          const idx = gs.instrumental.findIndex(g => g.description.toLowerCase().includes(needle));
          if (idx >= 0) {
            const achieved = gs.instrumental[idx];
            gs.instrumental[idx].achieved = true;
            changed = true;
            const mut: GoalMutation = {
              mutation_id: randomUUID(),
              char_id: this.sheet.char_id,
              turn_index: turnIndex,
              trigger_event_id: triggerEventId,
              mutation_type: 'subgoal_achieved',
              description: `${this.sheet.name} achieved subgoal: "${achieved.description}"`,
              old_subgoal: achieved.description,
            };
            this.stage.recordGoalMutation(mut);
          }
        }

        if (changed) this.stage.updateGoalStack(this.sheet.char_id, gs);
      }
    }

    // ── Goal-DAG deadlock detection: replan when all paths are blocked ──
    {
      this.refreshSheet();
      const latestGs = this.sheet.goalStack;
      const trigId = observableActions[observableActions.length - 1]?.action_id ?? 'epistemic_update';
      if (latestGs && getReadyGoals(latestGs).length === 0 && latestGs.instrumental.some(g => !g.achieved)) {
        await this.replanGoals(trigId);
      }
    }

    // ── F: Memory Stream + Reflection (every 5 turns) ──
    const turnCount = this.stage.getTurnCount();
    if (turnCount > 0 && turnCount % 5 === 0 && !this._reflectionInFlight) {
      this._reflectionInFlight = true;
      this.synthesizeReflections()
        .catch(e => logger.warn('agent_reflection_error', { agent: this.sheet.name, message: (e as Error).message }))
        .finally(() => { this._reflectionInFlight = false; });
    }

    return {
      char_id: this.sheet.char_id,
      new_beliefs: freshBeliefs,
      contradiction_detected: result.contradiction_detected ?? false,
      contradicted_propositions: result.contradicted_propositions ?? [],
      source_event_id: observableActions.length > 0 ? observableActions[observableActions.length - 1].action_id : undefined,
    };
  }

  // ── F: Memory Stream reflection synthesis ────────────────────────────────────
  // Called every 5 turns: generate 3 high-level insight beliefs from recent memory.
  private async synthesizeReflections(): Promise<void> {
    this.refreshSheet();
    const recentFull = this.stage.getSensoryFilter(this.sheet.current_location_id, 10);
    if (recentFull.length === 0) return;

    const transcript = recentFull.map(a => {
      const name = this.stage.getAgent(a.char_id)?.name ?? 'Unknown';
      return `[${a.action_type}] ${name}: ${a.content}`;
    }).join('\n');

    const existingBeliefs = (this.sheet.beliefs ?? []).slice(0, 5).map(b => b.proposition).join('; ');

    const response = await generateContent({
      model: getModel('fast'),
      contents: `You are ${this.sheet.name}. Reflect on these recent events and synthesize exactly 3 high-level insights.\n\nEvents:\n${transcript}\n\nExisting beliefs: ${existingBeliefs || 'none'}\n\nOutput 3 reflective insights that go beyond the surface events — patterns, implications, strategic assessments.`,
      config: {
        temperature: getTemperature(),
        systemInstruction: `You are ${this.sheet.name} in a reflective moment. Synthesize insights, not observations.`,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            reflections: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  insight: { type: Type.STRING },
                  confidence: { type: Type.NUMBER, description: '0.0-1.0' },
                },
                required: ['insight', 'confidence'],
              },
            },
          },
          required: ['reflections'],
        },
      },
    }, { label: `synthesizeReflections:${this.sheet.name}`, timeoutMs: 20_000 });

    const reflRaw = response.text ?? '{}';
    const parsed = safeJsonParse<{ reflections: Array<{ insight: string; confidence: number }> }>(
      reflRaw,
      { reflections: [] },
    );
    if (!parsed.reflections?.length && reflRaw.length > 10) {
      logger.warn('agent_parse_fallback', { agent: this.sheet.name, method: 'synthesizeReflections', preview: reflRaw.substring(0, 120) });
    }

    const existingBeliefsFull = this.sheet.beliefs ?? [];
    const existingProps = new Set(existingBeliefsFull.map(b => b.proposition.toLowerCase()));

    const reflectionBeliefs: Belief[] = (parsed.reflections ?? [])
      .filter(r => r.insight && !existingProps.has(r.insight.toLowerCase()))
      .slice(0, 3)
      .map(r => ({
        id: randomUUID(),
        proposition: r.insight,
        confidence: Math.max(0, Math.min(1, r.confidence)),
        source: 'inferred' as BeliefSource,
        acquired_at: this.stage.getTurnCount(),
      }));

    if (reflectionBeliefs.length > 0) {
      this.stage.updateAgentBeliefs(this.sheet.char_id, [...existingBeliefsFull, ...reflectionBeliefs]);
      logger.info('agent_reflection', { agent: this.sheet.name, new_insights: reflectionBeliefs.length });
    }
  }

  // ── Goal-DAG replanning ───────────────────────────────────────────────────────
  // Called when getReadyGoals returns empty AND unachieved goals remain —
  // all subgoals are blocked by unfulfilled dependencies. Emits terminal_threatened
  // and asks the LLM for two bridging subgoals that can start immediately.
  private async replanGoals(triggerEventId: string): Promise<void> {
    this.refreshSheet();
    const gs = this.sheet.goalStack;
    if (!gs) return;
    const ready = getReadyGoals(gs);
    const active = gs.instrumental.filter(g => !g.achieved);
    if (ready.length > 0 || active.length === 0) return;

    const turnIndex = this.stage.getTurnCount();
    this.stage.recordGoalMutation({
      mutation_id: randomUUID(),
      char_id: this.sheet.char_id,
      turn_index: turnIndex,
      trigger_event_id: triggerEventId,
      mutation_type: 'terminal_threatened',
      description: `${this.sheet.name}: all subgoal paths blocked — replanning`,
    });

    const blockedDescs = active.slice(0, 3).map(g => `- ${g.description}`).join('\n');
    const response = await generateContent({
      model: getModel('fast'),
      contents: `You are ${this.sheet.name}. Your current subgoals are ALL blocked by prerequisites that haven't been met:\n${blockedDescs}\n\nTerminal objective: ${gs.terminal.description}\n\nGenerate exactly 2 new instrumental subgoals you can pursue RIGHT NOW, without prerequisites.`,
      config: {
        systemInstruction: `You are replanning as ${this.sheet.name}. Output only JSON.`,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            new_subgoals: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  description: { type: Type.STRING },
                  value: { type: Type.INTEGER, description: '0-100 importance' },
                },
                required: ['description', 'value'],
              },
            },
          },
          required: ['new_subgoals'],
        },
      },
    }, { label: `replanGoals:${this.sheet.name}`, timeoutMs: 20_000 }).catch(err => {
      logger.warn('goal_replan_error', { agent: this.sheet.name, message: (err as Error).message });
      return null;
    });

    if (!response) return;
    const raw = safeJsonParse<{ new_subgoals: Array<{ description: string; value: number }> }>(
      response.text ?? '{}', { new_subgoals: [] },
    );

    this.refreshSheet();
    const gsNow = this.sheet.goalStack;
    if (!gsNow) return;
    const gsCopy: GoalStack = { ...gsNow, instrumental: [...gsNow.instrumental] };

    for (const sg of (raw.new_subgoals ?? []).slice(0, 2)) {
      if (!sg.description) continue;
      const norm = sg.description.trim().toLowerCase();
      if (gsCopy.instrumental.some(g => g.description.trim().toLowerCase() === norm)) continue;
      const newGoal: Goal = {
        id: randomUUID(),
        description: sg.description,
        value: Math.max(10, Math.min(100, sg.value ?? 60)),
        achieved: false,
      };
      gsCopy.instrumental = [newGoal, ...gsCopy.instrumental];
      this.stage.recordGoalMutation({
        mutation_id: randomUUID(),
        char_id: this.sheet.char_id,
        turn_index: turnIndex,
        trigger_event_id: triggerEventId,
        mutation_type: 'subgoal_added',
        description: `${this.sheet.name} replanned: "${sg.description}"`,
        new_subgoal: sg.description,
      });
    }
    gsCopy.last_planned_at = turnIndex;
    this.stage.updateGoalStack(this.sheet.char_id, gsCopy);
    logger.info('goal_replan', { agent: this.sheet.name, newGoals: raw.new_subgoals?.length ?? 0 });
  }

  // ── Legacy evaluateState — kept for backward compatibility ──────────────────
  public async evaluateState(recentActions: ActionLogEntry[]): Promise<EpistemicUpdate> {
    return this.updateEpistemics(recentActions);
  }
}
