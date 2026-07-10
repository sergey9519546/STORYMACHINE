// M4 — Extracted from Agent.ts: prompt construction and action selection.
// Agent.ts delegates buildEnhancedPrompt() and the ToT candidate generation to
// these pure (or near-pure) functions so they can be tested in isolation.

import { randomUUID } from 'crypto';
import { Type } from '@google/genai';
import { generateContent, modelForTask, getTemperature } from '../ai.ts';
import { composePromptModifiers } from '../../lib/genre-router.ts';
import { CHARACTER_ARC_MODES } from '../../lib/structure-presets.ts';
import { effectiveScore } from '../../lib/personality.ts';
import { ACTION_TYPES } from '../types.ts';
import type {
  ActionType,
  CharacterSheet,
  NarrativeAction,
  ActionLogEntry,
  Location,
  PersuasionStrategy,
} from '../types.ts';
import type { Stage } from '../Stage.ts';
import { safeJsonParse } from '../../lib/json.ts';
import { logger } from '../../lib/logger.ts';
import { sanitizeForPrompt } from '../../lib/prompt-utils.ts';
import { retrieveBeliefs } from '../../lib/memory.ts';
import { buildStoryBibleSummary } from '../../nvm/bible/index.ts';
import {
  describeAttachment,
  DEFENSE_DESCRIPTIONS,
  selectActiveDefense,
  describeActionBias,
  deriveSpeechPattern,
  computeDefenseLevel,
  PERSUASION_HINT,
  selectPersuasionStrategy,
  getReadyGoals,
  deriveCascadeInputs,
  computeDefenseCascadeState,
  cascadeBehaviorProfile,
  cascadeActionBias,
  arbitrateTrinity,
  describeTrinityGuidance,
  trinityActionBias,
} from './psychology.ts';

// ── buildPrompt ───────────────────────────────────────────────────────────────

export interface BuiltPrompt {
  /** Full prompt string for the agent's turn decision. */
  prompt: string;
  /**
   * Persuasion strategies selected for each target agent during prompt build.
   * The caller (Agent.takeTurn) holds these and writes them to DB once the
   * chosen action is known — NOT during prompt construction, which may be
   * retried.
   */
  pendingStrategies: Map<string, string>;
  /**
   * Dramatic pressure IDs that were included in this prompt.
   * The caller must mark these as applied (stage.markPressureApplied) ONLY
   * after a successful action is recorded — not during prompt construction,
   * which can be retried or fail without producing an action.
   */
  consumedPressureIds: string[];
}

/**
 * Construct the full agent decision prompt for one turn.
 * Now fully read-only: no writes to stage. Returns consumedPressureIds so the
 * caller (Agent.takeTurn) can call markPressureApplied after a successful action.
 */
export function buildPrompt(
  sheet: CharacterSheet,
  stage: Stage,
  node: Location,
  history: ActionLogEntry[],
  otherAgents: CharacterSheet[],
): BuiltPrompt {
  // ── History block ──
  const VERBATIM_WINDOW = 5;
  const historyStr = history.length === 0
    ? '(Silence. You are the first to speak.)'
    : history.map((e, i) => {
        const name = sanitizeForPrompt(stage.getAgent(e.char_id)?.name ?? 'Unknown', 128);
        const tag = e.action_type === 'LIE' ? 'SPEAK' : e.action_type;
        const isRecent = i >= history.length - VERBATIM_WINDOW;
        const content = isRecent ? e.content : e.content.slice(0, 80) + (e.content.length > 80 ? '…' : '');
        return `[${i}] [${tag}] ${name}: ${content}`;
      }).join('\n');

  // ── Beliefs block (recency × importance × relevance retrieval) ──
  const beliefs = retrieveBeliefs(sheet.beliefs ?? [], stage.getTurnCount(), historyStr, 10);
  const beliefsStr = beliefs.length > 0
    ? beliefs.map(b => `  - "${b.proposition}" (confidence: ${Math.round(b.confidence * 100)}%, source: ${b.source})`).join('\n')
    : '  (No established beliefs yet — you are gathering information.)';

  // ── Theory of mind block ──
  const tomEntries = Object.values(sheet.theoryOfMind ?? {}).slice(0, 5);
  const tomStr = tomEntries.length > 0
    ? tomEntries.map(tom => {
        const name = sanitizeForPrompt(stage.getAgent(tom.subject_id)?.name ?? tom.subject_id, 128);
        const knowledge = tom.believed_knowledge.slice(0, 3).map(k => `"${sanitizeForPrompt(k, 300)}"`).join(', ');
        const relParts: string[] = [`trust=${Math.round(tom.trust_level * 100)}%`];
        if (tom.affinity !== undefined) relParts.push(`affinity=${Math.round(tom.affinity * 100)}%`);
        if (tom.power_balance !== undefined) relParts.push(`power=${tom.power_balance < 0.4 ? 'they dominate' : tom.power_balance > 0.6 ? 'I dominate' : 'equal'}`);
        if (tom.debt !== undefined && tom.debt > 0.1) relParts.push(`debt=${Math.round(tom.debt * 100)}%`);
        const histSlice = tom.shared_history?.slice(-2).map(e => `"${sanitizeForPrompt(e, 300)}"`).join(', ');
        if (histSlice) relParts.push(`history=[${histSlice}]`);
        return `  - ${name}: ${relParts.join(', ')}, motive="${sanitizeForPrompt(tom.believed_motive, 256)}", I think they know: [${knowledge}]`;
      }).join('\n')
    : '  (You have not yet formed models of the others here.)';

  // ── Goal block (DAG-aware: only unblocked goals shown) ──
  const goalStr = sheet.goalStack
    ? (() => {
        const gs = sheet.goalStack!;
        const ready = getReadyGoals(gs);
        const next = ready[0] ?? gs.instrumental.filter(g => !g.achieved)[0];
        const blocked = gs.instrumental.filter(
          g => !g.achieved && (g.depends_on ?? []).some(dep => !gs.instrumental.find(x => x.id === dep)?.achieved),
        );
        return [
          `TERMINAL OBJECTIVE: ${sanitizeForPrompt(gs.terminal.description, 400)}`,
          `CURRENT SUBGOAL: ${sanitizeForPrompt(next?.description ?? 'gather information and orient yourself', 256)}`,
          blocked.length > 0
            ? `BLOCKED (awaiting prerequisites): ${blocked.map(g => sanitizeForPrompt(g.description, 200)).join('; ')}`
            : '',
        ].filter(Boolean).join('\n');
      })()
    : `TERMINAL OBJECTIVE: ${sanitizeForPrompt(sheet.hidden_motive)}\nCURRENT SUBGOAL: Assess who in this room is a threat or an asset to your objective.`;

  // ── Psychology block ──
  const actionBias = describeActionBias(sheet.darkTriad, sheet.attachmentStyle, sheet.suspicion_score);
  const speechPattern = deriveSpeechPattern(sheet.bigFive, sheet.darkTriad, sheet.emotionState);
  const defenseLevel = computeDefenseLevel(sheet.bigFive?.neuroticism ?? 50, sheet.suspicion_score);
  const currentTurn = stage.getTurnCount();

  // ── Inbound persuasion block ──
  const inbound = stage.getInboundPersuasion(sheet.char_id);
  const inboundBlock = (inbound && inbound.turn >= currentTurn - 1)
    ? `\nINBOUND INFLUENCE: ${sanitizeForPrompt(stage.getAgent(inbound.agent_id)?.name ?? 'someone', 128)} is using a [${inbound.strategy}] approach on you. You can resist, yield, or co-opt it — but you feel the pressure.\n`
    : '';

  // ── Emotional state block ──
  const emotionBlock = (() => {
    const es = sheet.emotionState;
    if (!es || es.dominant === 'neutral' || es.intensity < 15) return '';
    const angerTarget = es.dominant === 'anger' && es.anger_target_id
      ? ` — directed at ${sanitizeForPrompt(stage.getAgent(es.anger_target_id)?.name ?? 'someone in this room', 128)}`
      : '';
    return `\nCURRENT EMOTIONAL STATE: ${es.dominant.toUpperCase()} (intensity ${es.intensity}/100)${angerTarget}. This colors everything — not stated aloud, felt beneath the surface. Let it shape your word choice and what you hold back.`;
  })();

  // ── Outline + cinematic style + genre (P8 synergy compositor) ──
  // I1-a: tone (mood register) is layered after genre/style, and the genre's
  // structural promise block (genrePromiseBlock — required behaviors,
  // forbidden shortcuts) is opted in so the genre contract reaches generation
  // rather than just its vocabulary. The character-arc mode's
  // promptInstruction lands on the same path STYLE_MODIFIERS' agentInstruction
  // does — appended to this composed block. All four axes are optional; with
  // none set the block is empty exactly as before.
  const illusionState = stage.getIllusionState();
  const illusionPhase = illusionState.phase;
  const { block: composedModifierBlock } = composePromptModifiers(
    illusionState.story_genre,
    illusionState.director_style,
    illusionState.story_tone,
    true, // include genrePromiseBlock (I1-a)
  );
  const arcModeInstruction = illusionState.character_arc_mode
    ? CHARACTER_ARC_MODES[illusionState.character_arc_mode]?.promptInstruction ?? ''
    : '';
  const styleGenreBlock = [composedModifierBlock, arcModeInstruction].filter(Boolean).join('\n\n');
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

  // ── Dynamic persuasion strategies (selected here, written to DB in takeTurn) ──
  const pendingStrategies = new Map<string, string>();
  const persuasionHints = otherAgents.map(other => {
    const hist = stage.getPersuasionHistory(sheet.char_id, other.char_id, 8);
    const strategy = selectPersuasionStrategy(other, hist);
    pendingStrategies.set(other.char_id, strategy);
    const sName = sanitizeForPrompt(other.name, 128);
    return `  - With ${sName} [${strategy}]: ${PERSUASION_HINT[strategy](sName)}`;
  }).join('\n');

  // ── Dramatic pressure (consumed once per turn) ──
  const activePressures = stage.getActivePressures(sheet.char_id);
  const pressureBlock = activePressures.length > 0
    ? `\nSITUATIONAL AWARENESS (your read of what is happening right now):\n${activePressures.map(p => `- ${p.bias_hint}`).join('\n')}\n`
    : '';
  const overwhelmBlock = activePressures.length > 3
    ? '\nOVERWHELM STATE: You are simultaneously facing more crises than you can process. Under this load, characters often freeze, make rash decisions, or prioritize self-preservation over strategy. Let that pressure visibly shape your choice.\n'
    : '';
  // pressures are read but NOT yet marked applied — caller does that after action succeeds

  // ── Active defense mechanism ──
  const activeDefense = selectActiveDefense(sheet.defenseMechanisms, sheet.emotionState);
  const defenseStr = activeDefense ? `ACTIVE DEFENSE: ${DEFENSE_DESCRIPTIONS[activeDefense]}` : '';

  // ── Threat-response cascade (arousal/freeze/flight/fight/fawn/collapse) ──
  // Distinct from the defense mechanism above (see psychology.ts's header
  // comment): this is the somatic threat response, not the psyche's cognitive
  // distortion. Drives both the prompt's behavioral guidance AND (in
  // selectBestAction below) a scoring bias so a frozen character's candidates
  // are actually penalized, not merely narrated as frozen.
  const cascade = computeDefenseCascadeState(deriveCascadeInputs(sheet, stage, node, otherAgents));
  const cascadeProfile = cascadeBehaviorProfile(cascade.state);
  const cascadeStr = `THREAT-RESPONSE STATE: ${cascade.state.toUpperCase()} (intensity ${cascade.intensity}/100, choice space: ${cascadeProfile.choiceSpace}). ${cascadeProfile.dialogueStyle} ${cascadeProfile.promptInstruction}`;

  // ── Trinity (Id/Ego/Superego) decision arbitration ──
  const trinity = arbitrateTrinity(sheet);
  const trinityStr = `DECISION ARBITRATION: ${describeTrinityGuidance(trinity)} (id=${trinity.idProposal} ego=${trinity.egoAssessment} superego=${trinity.superegoPressure})`;

  // ── ToM trust gate ──
  const lowTrustNames = otherAgents.flatMap(a => {
    const tom = sheet.theoryOfMind?.[a.char_id];
    return (tom && tom.trust_level < 0.25) ? [sanitizeForPrompt(a.name, 128)] : [];
  });
  const trustGate = lowTrustNames.length > 0
    ? `\nTRUST ALERT: You deeply distrust ${lowTrustNames.join(', ')}. Do NOT volunteer truthful information to them. If you must engage, deflect, misdirect, or use strategic deception.\n`
    : '';

  const prompt = `You are ${sanitizeForPrompt(sheet.name, 256)}. Your public persona: ${sanitizeForPrompt(sheet.public_mask)}

HIDDEN DIRECTIVE: Your true motive is: "${sanitizeForPrompt(sheet.hidden_motive)}". Never state this directly. Every action serves it.
${inboundBlock}
${pressureBlock}${overwhelmBlock}
PSYCHOLOGICAL PROFILE:
${describeAttachment(sheet.attachmentStyle)}
${defenseStr}
CURRENT DEFENSE LEVEL: ${defenseLevel}
${speechPattern ? `SPEECH PATTERN: ${speechPattern}` : ''}
${cascadeStr}
${trinityStr}

YOUR CURRENT GOALS:
${goalStr}

WHAT YOU KNOW (your belief system):
${beliefsStr}
${trustGate}
YOUR MODEL OF THE OTHERS IN THIS ROOM:
${tomStr}

LOCATION: ${sanitizeForPrompt(node.name, 256)}
${sanitizeForPrompt(node.description, 500)}
OTHERS PRESENT: ${otherAgents.map(a => sanitizeForPrompt(a.name, 128)).join(', ') || 'no one else'}
AVAILABLE EXITS: ${
  (() => {
    const exits = node.adjacent_locations
      .map(id => stage.getLocation(id)?.name)
      .filter((n): n is string => Boolean(n));
    return exits.length > 0
      ? exits.map(n => `"${sanitizeForPrompt(n, 128)}"`).join(', ') + ' — use RELOCATE with the exact name shown here.'
      : '(none — you cannot leave this location)';
  })()
}
${(() => { const b = buildStoryBibleSummary(stage); return b ? `\n${b}\n` : ''; })()}
RECENT EVENTS:
${historyStr}

BEHAVIORAL TENDENCY: ${actionBias}

${beatHint}

PERSUASION LEVERAGE:
${persuasionHints || '  (No other agents present.)'}
${styleGenreBlock ? `\n${styleGenreBlock}\n` : ''}Generate 3 candidate actions. Score each 0–100 on goal alignment. The best-scoring will be selected.${emotionBlock}`;

  const consumedPressureIds = activePressures.map(p => p.pressure_id);
  return { prompt, pendingStrategies, consumedPressureIds };
}

// ── selectBestAction ──────────────────────────────────────────────────────────

/**
 * Send the prompt to the LLM, parse 3 candidate actions, select the best
 * one using personality-adjusted scoring.
 */
export async function selectBestAction(
  sheet: CharacterSheet,
  stage: Stage,
  prompt: string,
): Promise<NarrativeAction | null> {
  const VALID_ACTIONS = new Set<string>(ACTION_TYPES);

  const response = await generateContent({
    model: modelForTask('AGENT_TURN'),
    contents: prompt,
    config: {
      temperature: getTemperature(),
      systemInstruction: `You are playing the role of ${sanitizeForPrompt(sheet.name, 256)}. Generate exactly 3 candidate actions, then score each on how well it serves your goal (0–100). You will take the highest-scoring action.`,
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
  }, { label: `takeTurn:${sheet.name}`, timeoutMs: 30_000 }).catch(err => {
    const e = err as Error;
    logger.error('agent_ai_error', {
      agent: sheet.name,
      method: 'takeTurn',
      error_type: e.message.includes('timeout') ? 'timeout' : 'upstream',
      message: e.message,
    });
    return null;
  });

  if (!response) return null;

  type Candidate = NarrativeAction & { reasoning?: string; goal_score?: number };
  const rawText = response.text || '{}';
  const raw = safeJsonParse<{ candidates: Candidate[] }>(
    rawText,
    { candidates: [{ action_type: 'SPEAK', content: '', target: null }] },
  );
  if (!raw.candidates?.length) {
    logger.error('agent_empty_candidates', { agent: sheet.name, method: 'takeTurn', preview: rawText.substring(0, 120) });
    return null;
  }
  if (!raw.candidates[0]?.content) {
    logger.warn('agent_parse_fallback', { agent: sheet.name, method: 'takeTurn', preview: rawText.substring(0, 120) });
  }

  const dt = sheet.darkTriad ?? { machiavellianism: 50, narcissism: 50, psychopathy: 50 };
  const bf = sheet.bigFive ?? { openness: 50, conscientiousness: 50, extraversion: 50, agreeableness: 50, neuroticism: 50 };
  const activeDefense = selectActiveDefense(sheet.defenseMechanisms, sheet.emotionState);
  const attachStyle = sheet.attachmentStyle;

  // Threat-response cascade + Trinity arbitration bias the CHOICE among
  // candidates, not just the prompt that generated them — otherwise a
  // frozen/collapsing character could still have its highest-goal-score
  // (bold, confrontational) candidate picked despite the prompt telling it
  // not to generate one. Recomputed here (rather than threaded from
  // buildPrompt) because selectBestAction only receives (sheet, stage,
  // prompt); both derivations are pure reads of the SAME live stage state
  // buildPrompt itself just used, so they agree turn-for-turn.
  const currentNode = stage.getLocation(sheet.current_location_id);
  const roomAgents = currentNode
    ? stage.getAgentsInLocation(sheet.current_location_id).filter(a => a.char_id !== sheet.char_id)
    : [];
  const cascadeState = currentNode
    ? computeDefenseCascadeState(deriveCascadeInputs(sheet, stage, currentNode, roomAgents)).state
    : 'arousal';
  const cascadeBias = cascadeActionBias(cascadeState);
  const trinity = arbitrateTrinity(sheet);
  const trinityBias = trinityActionBias(trinity.winner, trinity.colorer);

  // Record defense activation as a beat trace
  if (activeDefense) {
    const lastAction = stage.getLastActionForAgent(sheet.char_id);
    stage.addBeatTrace({
      beat_id: randomUUID(),
      turn_index: stage.getTurnCount(),
      location_id: sheet.current_location_id,
      trigger_event_id: lastAction?.action_id ?? randomUUID(),
      beat_type: 'defense_activated',
      participants: [sheet.char_id],
      causal_chain: lastAction ? [lastAction.action_id] : [],
      narrative_summary: `${sheet.name} activated ${activeDefense} defense (emotion: ${sheet.emotionState?.dominant ?? 'unknown'}, intensity: ${sheet.emotionState?.intensity ?? 0}).`,
      fountain_hint: '',
    });
  }

  const finiteGoalScore = (n: number | undefined): number =>
    (typeof n === 'number' && isFinite(n) ? n : 0);
  const best = (raw.candidates ?? []).reduce<Candidate>(
    (top, c) => {
      const cType = VALID_ACTIONS.has(c.action_type) ? c.action_type as ActionType : 'SPEAK';
      const tType = VALID_ACTIONS.has(top.action_type) ? top.action_type as ActionType : 'SPEAK';
      const cScore = effectiveScore(finiteGoalScore(c.goal_score), cType, dt, bf, activeDefense, attachStyle)
        * (cascadeBias[cType] ?? 1.0) * (trinityBias[cType] ?? 1.0);
      const tScore = effectiveScore(finiteGoalScore(top.goal_score), tType, dt, bf, activeDefense, attachStyle)
        * (cascadeBias[tType] ?? 1.0) * (trinityBias[tType] ?? 1.0);
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
