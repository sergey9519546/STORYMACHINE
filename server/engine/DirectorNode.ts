import { Type } from '@google/genai';
import { Stage } from './Stage.ts';
import type { ActionLogEntry, PerspectiveEvaluation, BeliefSource, EpistemicUpdate, IllusionElement, IllusionState } from './types.ts';
import { safeJsonParse } from '../lib/json.ts';
import { randomUUID } from 'crypto';
import { logger } from '../lib/logger.ts';
import { getModel, generateContent } from './ai.ts';
import { expectedTensionAt, STYLE_MODIFIERS } from '../lib/structure-presets.ts';
import { analyzeSubtext } from '../lib/subtext-meter.ts';
import { sanitizeForPrompt } from '../lib/prompt-utils.ts';

export class DirectorNode {
  private stage: Stage;
  private _tensionHistory: number[] = [];
  private _tensionAccumulator = 50;

  constructor(stage: Stage) {
    this.stage = stage;
    // Restore tension state from the persisted DB so server restarts don't reset
    // arc-deviation and pivot detection.
    const ts = stage.getDirectorTensionState();
    this._tensionAccumulator = ts.accumulator;
    this._tensionHistory = ts.history;
  }

  // ── Perspective-bounded room evaluation ─────────────────────────────────────
  // Each observer sees ONLY what they could observe in their location.
  // The Director evaluates tension from each observer's perspective independently.
  // No agent's hidden motive or private knowledge is shared across agents.

  public async evaluateRoom(location_id: string, recentActions: ActionLogEntry[]): Promise<EpistemicUpdate[]> {
    if (recentActions.length === 0) return [];

    const agentsInRoom = this.stage.getAgentsInLocation(location_id);
    if (agentsInRoom.length === 0) return [];

    // Observable transcript — what any agent in the room could perceive
    // LIE actions appear as SPEAK to observers; only the Director knows which is which
    const observableTranscript = recentActions.map(a => {
      const agent = this.stage.getAgent(a.char_id);
      const visibleType = a.action_type === 'LIE' ? 'SPEAK' : a.action_type;
      const sName = sanitizeForPrompt(agent?.name ?? 'Unknown', 128);
      const sContent = sanitizeForPrompt(a.content, 500);
      return `[${visibleType}] ${sName}: ${sContent}`;
    }).join('\n');

    // Ground truth for the Director (which statements were actually lies)
    const lieTranscript = recentActions
      .filter(a => a.action_type === 'LIE')
      .map(a => {
        const agent = this.stage.getAgent(a.char_id);
        const sName = sanitizeForPrompt(agent?.name ?? 'Unknown', 128);
        const sContent = sanitizeForPrompt(a.content, 500);
        return `${sName} LIED: "${sContent}"`;
      }).join('\n') || 'No lies detected in this sequence.';

    // Evaluate from each agent's perspective concurrently
    const evaluations = await Promise.all(
      agentsInRoom.map(observer => this.evaluatePerspective(observer.char_id, observableTranscript, lieTranscript, location_id))
    );

    // ── Apply all suspicion updates ──
    for (const eval_ of evaluations) {
      for (const update of eval_.suspicion_updates) {
        const target = this.stage.getAgent(update.char_id);
        if (!target) continue;
        const newScore = Math.max(0, Math.min(100, target.suspicion_score + update.delta));
        this.stage.updateAgentSuspicion(update.char_id, newScore);
        logger.info('suspicion_update', { agent: target.name, delta: update.delta, score: newScore, reason: update.reason });
      }
    }

    // ── Propagate belief updates back to each observer (with source fields) ──
    const epistemicUpdates: EpistemicUpdate[] = [];
    // Map action_id → the action for source resolution
    const actionById = new Map(recentActions.map(a => [a.action_id, a]));

    for (const eval_ of evaluations) {
      const observer = this.stage.getAgent(eval_.observer_id);
      if (!observer) continue;

      const existingBeliefs = observer.beliefs ?? [];
      const existingProps = new Set(existingBeliefs.map(b => b.proposition.toLowerCase()));

      // For Director evaluations, beliefs sourced from SPEAK/LIE actions
      // are attributed to the last audible non-self action in the transcript
      const lastExternalAction = [...recentActions].reverse()
        .find(a => a.char_id !== eval_.observer_id && a.is_audible);

      const freshBeliefs = eval_.new_beliefs
        .filter(b => b.proposition && !existingProps.has(b.proposition.toLowerCase()))
        .map(b => ({
          id: randomUUID(),
          proposition: b.proposition,
          confidence: Math.max(0, Math.min(1, b.confidence)),
          source: (b.source as BeliefSource) ?? 'inferred',
          source_agent_id: b.source === 'told' ? lastExternalAction?.char_id : undefined,
          source_event_id: b.source === 'told' ? lastExternalAction?.action_id : undefined,
          acquired_at: this.stage.getTurnCount(),
        }));

      if (freshBeliefs.length > 0) {
        this.stage.updateAgentBeliefs(observer.char_id, [...existingBeliefs, ...freshBeliefs]);
      }

      const triggerEventId = lastExternalAction?.action_id
        ?? recentActions[recentActions.length - 1]?.action_id ?? '';

      epistemicUpdates.push({
        char_id: eval_.observer_id,
        new_beliefs: freshBeliefs,
        contradiction_detected: eval_.contradiction_detected,
        contradicted_propositions: (eval_ as PerspectiveEvaluation & { contradicted_propositions?: string[] }).contradicted_propositions ?? [],
        source_event_id: triggerEventId,
      });
    }

    // ── Advance illusion state based on aggregate tension ──
    // Use max (not mean) tension so a single high-tension observer isn't diluted
    // by observers who detected nothing — one contradiction in 4 agents is still
    // a real event, not 0.25× an event.
    const maxTensionDelta = evaluations.reduce((m, e) => Math.max(m, e.tension_delta), 0);
    const avgTensionDelta = evaluations.reduce((s, e) => s + e.tension_delta, 0) / Math.max(1, evaluations.length);
    const peakTensionDelta = evaluations.some(e => e.contradiction_detected) ? maxTensionDelta : avgTensionDelta;
    const contradictionsFound = evaluations.filter(e => e.contradiction_detected).length;
    this.advanceIllusionState(peakTensionDelta, contradictionsFound, location_id);

    logger.info('director_eval', { tensionDelta: peakTensionDelta.toFixed(1), contradictions: contradictionsFound, observers: evaluations.length });

    // ── A: Pacing Controller ──
    this._checkPacing(location_id, recentActions);

    // ── F: Emotional Arc Deviation ──
    this._tensionAccumulator = Math.max(0, Math.min(100,
      this._tensionAccumulator + avgTensionDelta * 0.4,
    ));
    this._checkArcDeviation(location_id);

    // ── H: Auto-Pivot Detection ──
    this._detectPivot(location_id, avgTensionDelta, recentActions);

    // ── I: Narrative Consistency Checker (every 5 turns) ──
    const totalTurns = this.stage.getTurnCount();
    if (totalTurns > 0 && totalTurns % 5 === 0) {
      this._checkConsistency(location_id, agentsInRoom.map(a => a.char_id));
    }

    // ── J: Belief-Edge pressure — read high-severity edges, emit canonical pressure ──
    this._checkBeliefEdges(location_id);

    // ── K: Subtext meter — flag on-the-nose dialogue; emit COOL pressure when score is high ──
    this._checkSubtext(location_id, recentActions);

    // ── L: Stakes escalation — high-magnitude active stakes ratchet tension ──
    this._checkStakesEscalation(location_id, agentsInRoom.map(a => a.char_id));

    // ── M: Dramatic irony — track audience-vs-character information gaps ──
    this._checkDramaticIrony(location_id);

    // ── N: Outline beat enforcement — police constraint/avoid violations ──
    this._checkBeatCompliance(location_id, recentActions);

    // Persist tension state so arc-deviation and pivot detection survive restarts.
    this.stage.saveDirectorTensionState(this._tensionAccumulator, this._tensionHistory);

    return epistemicUpdates;
  }

  private async evaluatePerspective(
    observer_id: string,
    observableTranscript: string,
    lieTranscript: string,
    location_id: string,
  ): Promise<PerspectiveEvaluation> {
    const observer = this.stage.getAgent(observer_id);
    if (!observer) return this.emptyEvaluation(observer_id);

    const agentsInRoom = this.stage.getAgentsInLocation(location_id);
    const otherAgentIds = agentsInRoom.filter(a => a.char_id !== observer_id).map(a => a.char_id);

    // Build observer's bounded context — ONLY their own beliefs, NOT others' hidden motives
    const sObserverName = sanitizeForPrompt(observer.name, 128);
    const sPublicMask   = sanitizeForPrompt(observer.public_mask ?? '', 256);
    const observerBeliefs = (observer.beliefs ?? [])
      .slice(0, 8)
      .map(b => `"${sanitizeForPrompt(b.proposition, 200)}" (${Math.round(b.confidence * 100)}% confident)`).join(', ');

    const prompt = `You are evaluating how ${sObserverName} perceives a scene.

OBSERVER PROFILE:
- Name: ${sObserverName}
- Public persona: ${sPublicMask}
- Prior beliefs: ${observerBeliefs || 'none established yet'}
- Current suspicion level: ${observer.suspicion_score}/100

WHAT ${sObserverName.toUpperCase()} OBSERVED (transcript of audible events):
${observableTranscript}

DIRECTOR'S HIDDEN KNOWLEDGE (not available to ${sObserverName}):
${lieTranscript}

From ${sObserverName}'s perspective only:
1. How much has their tension/suspicion changed? (delta: -20 to +20)
2. Did anything they observed contradict their prior beliefs?
3. What new facts did they derive from what they saw/heard?
4. How has their suspicion of each other person changed?`;

    const response = await generateContent({
      model: getModel('pro'),
      contents: prompt,
      config: {
        systemInstruction: `You are the Director Node. Evaluate this scene from a single bounded perspective. You know who lied but the observer does not — factor this in when evaluating whether contradictions were apparent.`,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            tension_delta: { type: Type.INTEGER, description: 'Change in tension for this observer, -20 to +20' },
            contradiction_detected: { type: Type.BOOLEAN },
            new_beliefs: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  proposition: { type: Type.STRING },
                  confidence: { type: Type.NUMBER },
                  source: { type: Type.STRING, enum: ['witnessed', 'told', 'inferred'] },
                },
                required: ['proposition', 'confidence', 'source'],
              },
            },
            suspicion_updates: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  agent_name: { type: Type.STRING },
                  delta: { type: Type.INTEGER, description: '-20 to +20' },
                  reason: { type: Type.STRING },
                },
                required: ['agent_name', 'delta', 'reason'],
              },
            },
            contradicted_propositions: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'Verbatim text of prior beliefs that the new events contradict.',
            },
          },
          required: ['tension_delta', 'contradiction_detected', 'new_beliefs', 'suspicion_updates', 'contradicted_propositions'],
        },
      },
    }, { label: `evaluatePerspective:${observer_id}`, timeoutMs: 30_000 }).catch(err => {
      logger.error('director_eval_error', { observer_id, message: (err as Error).message });
      return null;
    });

    if (!response) return this.emptyEvaluation(observer_id);

    const raw = safeJsonParse<{
      tension_delta: number;
      contradiction_detected: boolean;
      new_beliefs: Array<{ proposition: string; confidence: number; source: string }>;
      suspicion_updates: Array<{ agent_name: string; delta: number; reason: string }>;
      contradicted_propositions: string[];
    }>(response.text ?? '{}', {
      tension_delta: 0,
      contradiction_detected: false,
      new_beliefs: [],
      suspicion_updates: [],
      contradicted_propositions: [],
    });

    // Resolve agent names → char_ids for suspicion updates
    const allAgents = this.stage.getAllAgents();
    const resolvedUpdates = (raw.suspicion_updates ?? [])
      .map(u => {
        const target = allAgents.find(a => a.name === u.agent_name);
        if (!target) return null;
        return { char_id: target.char_id, delta: Math.max(-20, Math.min(20, u.delta)), reason: u.reason };
      })
      .filter((u): u is { char_id: string; delta: number; reason: string } => u !== null);

    // Only include agents in room for suspicion updates
    const validIds = new Set([observer_id, ...otherAgentIds]);
    const filteredUpdates = resolvedUpdates.filter(u => validIds.has(u.char_id));

    const safeBeliefs = (raw.new_beliefs ?? []).map(b => ({
      ...b,
      source: (['witnessed', 'told', 'inferred'].includes(b.source) ? b.source : 'inferred') as BeliefSource,
    }));

    return {
      observer_id,
      tension_delta: Math.max(-20, Math.min(20, raw.tension_delta ?? 0)),
      contradiction_detected: raw.contradiction_detected ?? false,
      new_beliefs: safeBeliefs,
      suspicion_updates: filteredUpdates,
      contradicted_propositions: raw.contradicted_propositions ?? [],
    };
  }

  // ── Cognitive illusion state machine ────────────────────────────────────────
  // Advances phase based on accumulated tension + turn count:
  // Setup → Turn at 33% of turns or when avg tension spikes
  // Turn → Prestige at 66% of turns or when contradictions peak

  private advanceIllusionState(
    avgTensionDelta: number,
    contradictionsFound: number,
    location_id: string,
  ): void {
    const state = this.stage.getIllusionState();
    const totalTurns = this.stage.getTurnCount();

    // Phase boundaries scale to the writer's expected session length so the
    // engine's Setup/Turn/Prestige machine aligns with the structure preset's
    // beat-sheet phases (which instantiatePreset() assigns at the 33%/66% marks).
    const expectedTurns = state.expected_turns ?? 20;
    const setupEnd = Math.max(4, Math.round(expectedTurns * 0.33));
    const turnEnd  = Math.max(setupEnd + 3, Math.round(expectedTurns * 0.66));

    let nextPhase = state.phase;

    if (state.phase === 'Setup' && (totalTurns >= setupEnd || (avgTensionDelta > 10 && totalTurns >= Math.round(setupEnd / 2)))) {
      nextPhase = 'Turn';
      logger.info('illusion_phase', { from: 'Setup', to: 'Turn', turn: totalTurns, setupEnd });
    } else if (state.phase === 'Turn' && (totalTurns >= turnEnd || (contradictionsFound >= 2 && totalTurns >= setupEnd + 2))) {
      nextPhase = 'Prestige';
      logger.info('illusion_phase', { from: 'Turn', to: 'Prestige', turn: totalTurns, turnEnd });
    }

    if (nextPhase !== state.phase) {
      const element: IllusionElement = {
        description: this._plantedElementDescription(state.phase, nextPhase, totalTurns),
        turn_index: totalTurns,
        is_load_bearing: nextPhase === 'Prestige',
      };

      const updatedElements = [...state.planted_elements, element];
      const update: Partial<IllusionState> = {
        phase: nextPhase,
        planted_elements: updatedElements,
      };

      // Prestige payoff: recontextualize every load-bearing planted element
      // and emit a REVEAL pressure to every agent in the room so they are
      // prompted to surface the hidden truth they witnessed.
      if (nextPhase === 'Prestige') {
        const loadBearing = updatedElements.filter(e => e.is_load_bearing && e.revealed_at == null);
        const recontexts = loadBearing.map(e => e.description);
        if (recontexts.length > 0) {
          update.pending_recontextualization = [
            ...(state.pending_recontextualization ?? []),
            ...recontexts,
          ];
          // Stamp revealed_at on each load-bearing element in-place
          for (const e of loadBearing) {
            e.revealed_at = totalTurns;
          }
        }

        // Emit a REVEAL pressure to every living agent in the location
        const agents = this.stage.getAgentsInLocation(location_id);
        const triggerEventId = randomUUID();
        for (const agent of agents) {
          if (!agent.is_alive) continue;
          this.stage.addDramaticPressure({
            pressure_id: randomUUID(),
            target_char_id: agent.char_id,
            trigger_event_id: triggerEventId,
            pressure_type: 'REVEAL',
            intensity: 85,
            bias_hint: `The illusion is collapsing. Everything you planted in earlier scenes is now being exposed — what was hidden must now be confronted. ${recontexts[0] ?? ''}`,
            expires_at_turn: totalTurns + 3,
            applied: false,
          });
        }
        logger.info('prestige_payoff', { recontexts: recontexts.length, agents: agents.length });
      }

      this.stage.updateIllusionState(update);
    }
  }

  private _plantedElementDescription(fromPhase: string, toPhase: string, turn: number): string {
    if (toPhase === 'Turn') {
      return `At turn ${turn}: the inciting lie has been planted. Observers now hold a false belief that will become structurally important.`;
    }
    return `At turn ${turn}: the contradiction has been surfaced. The illusion collapses — what was hidden will now be revealed.`;
  }

  // ── A: Pacing Controller ──
  // Measures real text statistics from the action log: sentence-length variance
  // and action density. Produces specific momentum pressure based on what's wrong.
  // Pure deterministic — no LLM calls.
  private _measurePacing(recentActions: ActionLogEntry[]): {
    avgSentenceLen: number;
    sentenceLenVariance: number;   // normalized 0–1 (stddev ~8 words = 1.0)
    actionDensity: number;          // non-speech actions per 100 words
    tempo: 'fast' | 'medium' | 'slow';
    monotonyRisk: boolean;          // variance < 0.15 over 4+ sentences
  } {
    const speech = recentActions.filter(a => a.action_type === 'SPEAK' || a.action_type === 'LIE');
    const nonSpeech = recentActions.filter(a => a.action_type !== 'SPEAK' && a.action_type !== 'LIE');

    const allText = speech.map(a => a.content).join(' ');
    const sentences = allText.split(/[.!?]+/).map(s => s.trim()).filter(Boolean);
    const wordLens = sentences.map(s => s.split(/\s+/).filter(Boolean).length);

    const avgLen = wordLens.length > 0
      ? wordLens.reduce((s, l) => s + l, 0) / wordLens.length
      : 0;
    const variance = wordLens.length > 1
      ? wordLens.reduce((s, l) => s + Math.pow(l - avgLen, 2), 0) / wordLens.length
      : 0;
    const normVariance = Math.min(1, variance / 64);  // 8-word stddev → 1.0

    const totalWords = allText.split(/\s+/).filter(Boolean).length;
    const density = totalWords > 0 ? (nonSpeech.length / totalWords) * 100 : 0;

    let tempo: 'fast' | 'medium' | 'slow' = 'medium';
    if (density > 0.5 && avgLen < 8) tempo = 'fast';
    else if (density < 0.15 && avgLen > 20) tempo = 'slow';

    return { avgSentenceLen: avgLen, sentenceLenVariance: normVariance, actionDensity: density, tempo, monotonyRisk: normVariance < 0.15 && sentences.length >= 4 };
  }

  private _checkPacing(location_id: string, recentActions: ActionLogEntry[]): void {
    const totalTurns = this.stage.getTurnCount();
    const agents = this.stage.getAgentsInLocation(location_id);
    if (totalTurns < 6 || agents.length === 0) return;

    const m = this._measurePacing(recentActions);
    const target = this.stage.getIllusionState().pacing_target ?? 'medium';

    let hint: string | null = null;
    let intensity = 40;

    if (target === 'fast') {
      // Writer wants urgency — any slow drift or monotony triggers harder push
      if (m.monotonyRisk) {
        hint = 'The scene is rhythmically stale — every line the same shape. Break the pattern with a fragment, an accusation, a sudden shift.';
        intensity = 55;
      } else if (m.tempo === 'slow' || m.actionDensity < 0.2) {
        hint = 'The scene is losing urgency. Cut to the chase — short, punchy lines. Something decisive must happen now.';
        intensity = 60;
      }
    } else if (target === 'slow') {
      // Writer wants deliberate contemplation — only fire if it's actively too fast or too monotone
      if (m.monotonyRisk) {
        hint = 'The scene is becoming rhythmically automatic. Let silences breathe — a pause, an unfinished thought, an unexpected observation.';
        intensity = 30;
      } else if (m.tempo === 'fast' && m.actionDensity > 0.8) {
        hint = 'The scene is moving too quickly through its emotional beats. Slow down — let weight settle before the next move.';
        intensity = 35;
      }
      // If tempo is 'slow' and target is 'slow', no pressure needed
    } else {
      // Default: medium target — fire when clearly wrong
      if (m.monotonyRisk) {
        hint = 'The scene is rhythmically stale — every line the same shape. Break the pattern: a fragment, a question, an unexpected silence, a one-word reply.';
      } else if (m.tempo === 'slow' && m.avgSentenceLen > 25) {
        hint = 'The scene is dragging. Short, punchy lines. No digressions. Something must happen — say it and mean it.';
      } else if (m.actionDensity < 0.1 && recentActions.length >= agents.length * 2) {
        hint = 'The scene is losing momentum. Something must happen — say something unexpected, reveal a new piece of information, or make a decisive move.';
      }
    }

    if (!hint) return;

    // Append director-style suffix when active
    const directorStyle = this.stage.getIllusionState().director_style;
    if (directorStyle) {
      const styleMod = STYLE_MODIFIERS[directorStyle];
      if (styleMod?.pacingHintSuffix) hint += styleMod.pacingHintSuffix;
    }

    for (const agent of agents) {
      this.stage.addDramaticPressure({
        pressure_id: randomUUID(),
        target_char_id: agent.char_id,
        trigger_event_id: 'pacing_controller',
        pressure_type: 'revelation_due',
        intensity,
        bias_hint: hint,
        expires_at_turn: totalTurns + 3,
        applied: false,
      });
    }
    logger.info('pacing_check', { target, style: directorStyle ?? 'none', tempo: m.tempo, monotony: m.monotonyRisk, turn: totalTurns });

    // ── Stuck-character detection: emit REDIRECT when an agent hasn't moved in >4 turns ──
    this._emitStuckPressure(location_id, recentActions, totalTurns);
  }

  private _emitStuckPressure(location_id: string, recentActions: ActionLogEntry[], totalTurns: number): void {
    if (totalTurns < 5) return;
    const agents = this.stage.getAgentsInLocation(location_id);
    const loc = this.stage.getLocation(location_id);
    if (!loc || loc.adjacent_locations.length === 0) return; // no exits — pointless to pressure

    const exitNames = loc.adjacent_locations
      .map(id => this.stage.getLocation(id)?.name)
      .filter((n): n is string => Boolean(n))
      .map(n => sanitizeForPrompt(n, 128));
    if (exitNames.length === 0) return;

    // Scan last 5 actions in this room — if an agent accounts for ≥4 of them, they're stuck.
    const last5 = recentActions.slice(-5);
    const agentActionCount = new Map<string, number>();
    for (const a of last5) agentActionCount.set(a.char_id, (agentActionCount.get(a.char_id) ?? 0) + 1);

    for (const agent of agents) {
      if ((agentActionCount.get(agent.char_id) ?? 0) < 4) continue;

      // Don't stack duplicate stuck pressures for this agent
      const existing = this.stage.getActivePressures(agent.char_id);
      if (existing.some(p => p.pressure_type === 'REDIRECT' && p.bias_hint.includes('exit'))) continue;

      const exitList = exitNames.map(n => `"${n}"`).join(' or ');
      this.stage.addDramaticPressure({
        pressure_id: randomUUID(),
        target_char_id: agent.char_id,
        trigger_event_id: 'stuck_detector',
        pressure_type: 'REDIRECT',
        intensity: 55,
        bias_hint: `You have lingered here too long — your objective requires movement. RELOCATE to ${exitList}.`,
        expires_at_turn: totalTurns + 2,
        applied: false,
      });
      logger.info('stuck_pressure_emitted', { agent: agent.name, location_id, exits: exitNames });
    }
  }

  // ── H: Auto-Pivot Detection ──
  private _detectPivot(location_id: string, avgTensionDelta: number, recentActions: ActionLogEntry[]): void {
    this._tensionHistory.push(avgTensionDelta);
    if (this._tensionHistory.length > 5) this._tensionHistory.shift();
    if (this._tensionHistory.length < 3) return;

    // Sign-change twice in 3 consecutive non-zero readings = pivot.
    // Skip zero entries: Math.sign(0)===0 would match both positive and negative
    // neighbors, generating spurious turning points on flat tension sequences.
    let signChanges = 0;
    for (let i = 1; i < this._tensionHistory.length; i++) {
      const prev = Math.sign(this._tensionHistory[i - 1]);
      const curr = Math.sign(this._tensionHistory[i]);
      if (prev !== 0 && curr !== 0 && prev !== curr) signChanges++;
    }
    if (signChanges < 2) return;

    const agents = this.stage.getAgentsInLocation(location_id);
    const lastActionId = recentActions[recentActions.length - 1]?.action_id ?? randomUUID();
    this.stage.addBeatTrace({
      beat_id: randomUUID(),
      turn_index: this.stage.getTurnCount(),
      location_id,
      trigger_event_id: lastActionId,
      beat_type: 'turning_point',
      participants: agents.map(a => a.char_id),
      causal_chain: recentActions.slice(-3).map(a => a.action_id),
      narrative_summary: 'Auto-pivot detected: the emotional valence of the scene has reversed twice. A turning point has been reached.',
      fountain_hint: 'The room shifts. What was certain is now in doubt. Someone has crossed a line.',
    });
    logger.info('auto_pivot', { turn: this.stage.getTurnCount() });
    this._tensionHistory = [];  // reset after pivot
  }

  // ── F: Emotional Arc Deviation Check ──
  // Compares the cumulative measured tension to the expected tension for the
  // selected emotional_arc at the current story position. Emits ESCALATE when
  // the story is running too calm, COOL when running too hot.
  private _checkArcDeviation(location_id: string): void {
    const state = this.stage.getIllusionState();
    const arc = state.emotional_arc;
    if (!arc) return;

    const totalTurns = this.stage.getTurnCount();
    const expectedTotal = state.expected_turns ?? 20;
    const position = Math.min(1, totalTurns / expectedTotal);
    const expectedTension = expectedTensionAt(arc, position);
    if (expectedTension === null) return;

    const deviation = this._tensionAccumulator - expectedTension;
    const THRESHOLD = 22;  // ±22 points before correction fires
    if (Math.abs(deviation) < THRESHOLD) return;

    const agents = this.stage.getAgentsInLocation(location_id);
    if (agents.length === 0) return;

    const styleMod = state.director_style ? STYLE_MODIFIERS[state.director_style] : null;

    if (deviation < 0) {
      // Story running BELOW expected tension — push up
      const hint = styleMod
        ? `The scene needs more intensity. ${styleMod.pacingHintSuffix}`
        : `The scene is running quieter than its arc demands at this point. Escalate — raise the stakes, reveal something, or force a confrontation.`;
      for (const agent of agents) {
        this.stage.addDramaticPressure({
          pressure_id: randomUUID(),
          target_char_id: agent.char_id,
          trigger_event_id: 'arc_deviation',
          pressure_type: 'ESCALATE',
          intensity: Math.min(100, Math.round(Math.abs(deviation) * 0.8)),
          bias_hint: hint,
          expires_at_turn: totalTurns + 3,
          applied: false,
        });
      }
      logger.info('arc_deviation', { direction: 'escalate', tension: this._tensionAccumulator, expected: expectedTension });
    } else {
      // Story running ABOVE expected tension — cool down
      const hint = `The scene is more intense than the ${arc.replace(/_/g, ' ')} arc calls for at this stage. Ease the pressure — a moment of apparent calm, false security, or quiet revelation before the next wave.`;
      for (const agent of agents) {
        this.stage.addDramaticPressure({
          pressure_id: randomUUID(),
          target_char_id: agent.char_id,
          trigger_event_id: 'arc_deviation',
          pressure_type: 'COOL',
          intensity: Math.min(100, Math.round(Math.abs(deviation) * 0.6)),
          bias_hint: hint,
          expires_at_turn: totalTurns + 2,
          applied: false,
        });
      }
      logger.info('arc_deviation', { direction: 'cool', tension: this._tensionAccumulator, expected: expectedTension });
    }
  }

  // ── I: Narrative Consistency Checker ──
  // Runs every 5 turns. Pure deterministic — no LLM calls.
  // Checks: (1) belief contradictions, (2) goal/personality mismatch, (3) goal stack overload.
  private _checkConsistency(location_id: string, charIds: string[]): void {
    const totalTurns = this.stage.getTurnCount();

    for (const charId of charIds) {
      const agent = this.stage.getAgent(charId);
      if (!agent) continue;

      // ── Belief contradiction pressure ──
      const beliefs = agent.beliefs ?? [];
      const contradicted = beliefs.filter(b => (b.contradicts ?? []).length > 0);
      if (contradicted.length > 0) {
        this.stage.addDramaticPressure({
          pressure_id: randomUUID(),
          target_char_id: charId,
          trigger_event_id: 'consistency_checker',
          pressure_type: 'evidence_against',
          intensity: 55,
          bias_hint: `You hold ${contradicted.length} contradictory belief(s). Something you believe cannot be true simultaneously with something else you believe. This cognitive dissonance is pressing on your decision-making.`,
          expires_at_turn: totalTurns + 4,
          applied: false,
        });
        logger.info('consistency_contradiction', { agent: agent.name, count: contradicted.length });
      }

      // ── Goal/personality coherence ──
      const dt = agent.darkTriad;
      if (dt && dt.machiavellianism < 30) {
        const activeGoals = agent.goalStack?.instrumental.filter(g => !g.achieved) ?? [];
        const deceptionGoals = activeGoals.filter(g =>
          /deceive|lie|mislead|manipulate|conceal|hide/i.test(g.description),
        );
        if (deceptionGoals.length > 1) {
          this.stage.addDramaticPressure({
            pressure_id: randomUUID(),
            target_char_id: charId,
            trigger_event_id: 'consistency_checker',
            pressure_type: 'COOL',
            intensity: 50,
            bias_hint: `Your conscience is catching up with you. You're not someone who deceives easily — the weight of what you're planning feels wrong. Consider a more honest path.`,
            expires_at_turn: totalTurns + 3,
            applied: false,
          });
          logger.info('conscience_pressure', { agent: agent.name, deceptionGoals: deceptionGoals.length });
        }
      }

      // ── Goal stack overload ──
      const activeCount = (agent.goalStack?.instrumental ?? []).filter(g => !g.achieved).length;
      if (activeCount > 5) {
        this.stage.addDramaticPressure({
          pressure_id: randomUUID(),
          target_char_id: charId,
          trigger_event_id: 'consistency_checker',
          pressure_type: 'REDIRECT',
          intensity: 40,
          bias_hint: `You're juggling too many competing priorities. Something has to give — focus on what matters most right now and let go of the peripheral plans.`,
          expires_at_turn: totalTurns + 2,
          applied: false,
        });
        logger.info('goal_overload', { agent: agent.name, activeCount });
      }
    }
  }

  // ── J: Belief-Edge pressure ──
  // Reads the deterministic contradiction graph and emits canonical CONFRONT/WITHHOLD/etc.
  // pressure for any agent whose belief edges reach the high-severity threshold.
  // Guards against duplicate pressure for the same trigger event.
  private _checkBeliefEdges(location_id: string): void {
    const agents = this.stage.getAgentsInLocation(location_id);
    const turnIndex = this.stage.getTurnCount();

    for (const agent of agents) {
      const edges = this.stage.getActiveBeliefEdges(agent.char_id);
      const highEdges = edges.filter(e => (e.severity ?? 0) >= 50);
      if (highEdges.length === 0) continue;

      // Use the most severe unaddressed edge
      const worst = highEdges.sort((a, b) => (b.severity ?? 0) - (a.severity ?? 0))[0];

      // Skip if we already have active pressure from this event
      const existing = this.stage.getActivePressures(agent.char_id);
      if (existing.some(p => p.trigger_event_id === worst.source_event_id)) continue;

      const state = this.stage.getIllusionState();
      const styleMod = state.director_style ? STYLE_MODIFIERS[state.director_style] : null;
      const intensityBoost = styleMod?.beliefEdgeIntensityBoost ?? 0;
      const baseHint = styleMod?.confrontationHintOverride
        ?? `A high-severity contradiction in your belief system demands resolution. You cannot remain passive — act on what you know.`;

      this.stage.addDramaticPressure({
        pressure_id: randomUUID(),
        target_char_id: agent.char_id,
        trigger_event_id: worst.source_event_id,
        pressure_type: 'CONFRONT',
        intensity: Math.min(100, Math.round((worst.severity ?? 50) + 20 + intensityBoost)),
        bias_hint: baseHint,
        expires_at_turn: turnIndex + 4,
        applied: false,
      });

      logger.info('belief_edge_confront', { agent: agent.name, severity: worst.severity, style: state.director_style ?? 'none' });
    }
  }

  // ── K: Subtext meter ─────────────────────────────────────────────────────────
  // Scores on-the-nose dialogue in the current round and emits a COOL pressure
  // when the score exceeds 60, nudging agents toward indirection and subtext.
  private _checkSubtext(location_id: string, recentActions: ActionLogEntry[]): void {
    const dialogue = recentActions
      .filter(a => a.action_type === 'SPEAK' || a.action_type === 'LIE')
      .map(a => a.content);
    if (dialogue.length === 0) return;

    const analysis = analyzeSubtext(dialogue);
    const turnIndex = this.stage.getTurnCount();

    logger.info('subtext_score', { score: analysis.score, onTheNose: analysis.onTheNoseCount, subtext: analysis.subtextCount, lines: analysis.totalLines });

    if (analysis.score >= 60) {
      const agents = this.stage.getAgentsInLocation(location_id).filter(a => a.is_alive);
      const triggerEventId = recentActions[recentActions.length - 1]?.action_id ?? randomUUID();
      const hint = analysis.worstLine
        ? `Dialogue is becoming too direct. The line "${analysis.worstLine.slice(0, 80)}..." is on-the-nose. Displace the real tension onto an object, a memory, or a question. Say less, mean more.`
        : `Dialogue is becoming too direct. Displace the real tension onto subtext — let what is NOT said do the work.`;

      for (const agent of agents) {
        // Don't stack COOL pressures already active for this agent
        const existing = this.stage.getActivePressures(agent.char_id);
        if (existing.some(p => p.pressure_type === 'COOL')) continue;
        this.stage.addDramaticPressure({
          pressure_id: randomUUID(),
          target_char_id: agent.char_id,
          trigger_event_id: triggerEventId,
          pressure_type: 'COOL',
          intensity: Math.min(100, analysis.score),
          bias_hint: hint,
          expires_at_turn: turnIndex + 2,
          applied: false,
        });
      }
      logger.info('subtext_cool_pressure', { agents: agents.length, score: analysis.score });
    }
  }

  // ── L: Stakes escalation ─────────────────────────────────────────────────────
  // Active high-magnitude stakes add dramatic pressure on the stakeholder.
  // Stakes with magnitude ≥ 70 emit a FORESHADOW pressure; ≥ 90 emit CONFRONT.
  // Terminal goal achievement resolves the matching stake as 'won'.
  private _checkStakesEscalation(location_id: string, charIds: string[]): void {
    const currentTurn = this.stage.getTurnCount();
    for (const charId of charIds) {
      const agent = this.stage.getAgent(charId);
      if (!agent) continue;

      // Resolve won stakes — terminal goal achieved
      if (agent.goalStack?.terminal.achieved) {
        const activeStakes = this.stage.getActiveStakes(charId);
        for (const s of activeStakes) {
          this.stage.resolveStakes(s.id, 'won', currentTurn);
          logger.info('stakes_resolved', { agent: agent.name, stakes: s.description, outcome: 'won' });
        }
        continue;
      }

      const stakes = this.stage.getActiveStakes(charId);
      for (const s of stakes) {
        if (s.magnitude < 70) continue;
        const pressureType = s.magnitude >= 90 ? 'CONFRONT' : 'ESCALATE';
        const existingPressures = this.stage.getActivePressures(charId);
        const alreadyHas = existingPressures.some(
          p => p.pressure_type === pressureType && p.bias_hint.includes(s.id),
        );
        if (alreadyHas) continue;
        this.stage.addDramaticPressure({
          pressure_id: randomUUID(),
          target_char_id: charId,
          trigger_event_id: `stakes:${s.id}`,
          pressure_type: pressureType,
          intensity: s.magnitude,
          bias_hint: `[stakes:${s.id}] The ${s.category} stake looms: ${s.description}`,
          expires_at_turn: currentTurn + 3,
          applied: false,
        });
        logger.info('stakes_pressure', { agent: agent.name, stakes: s.description, pressureType, magnitude: s.magnitude });
      }
    }
  }

  // ── N: Outline beat compliance ───────────────────────────────────────────────
  // Checks each recent action against the active OutlineBeat's `avoid` field using
  // keyword tokenization. A match emits a REDIRECT pressure (not a punishment —
  // a course-correction) nudging agents back to the beat's intent.
  // Also injects a constraint reminder when the beat has one, so agents are aware
  // of what must not happen yet.
  private _checkBeatCompliance(location_id: string, recentActions: ActionLogEntry[]): void {
    const state = this.stage.getIllusionState();
    const { outline, phase } = state;
    if (!outline || outline.length === 0) return;

    const turnIndex = this.stage.getTurnCount();
    const activeBeat = outline.find(b =>
      b.phase === phase && turnIndex >= b.turn_start && turnIndex <= b.turn_end,
    );
    if (!activeBeat) return;

    // Tokenize the avoid string into keywords
    const avoidTokens = activeBeat.avoid
      .toLowerCase()
      .split(/[\s,;]+/)
      .filter(w => w.length > 3);
    if (avoidTokens.length === 0) return;

    const agents = this.stage.getAgentsInLocation(location_id);
    if (agents.length === 0) return;

    // Check recent speech actions for avoid-keyword matches
    const violations = recentActions
      .filter(a => a.action_type === 'SPEAK' || a.action_type === 'LIE')
      .filter(a => {
        const lower = a.content.toLowerCase();
        return avoidTokens.some(tok => lower.includes(tok));
      });

    if (violations.length === 0) return;

    // Emit a REDIRECT to the violating agent(s) — and everyone in the room
    const violatingIds = new Set(violations.map(v => v.char_id));
    for (const agent of agents) {
      const existing = this.stage.getActivePressures(agent.char_id);
      if (existing.some(p => p.pressure_type === 'REDIRECT')) continue;
      const sConstraint = sanitizeForPrompt(activeBeat.constraint, 300);
      const sGoal = sanitizeForPrompt(activeBeat.goal, 300);
      this.stage.addDramaticPressure({
        pressure_id: randomUUID(),
        target_char_id: agent.char_id,
        trigger_event_id: violations[violations.length - 1].action_id,
        pressure_type: 'REDIRECT',
        intensity: violatingIds.has(agent.char_id) ? 65 : 40,
        bias_hint: `Beat constraint: ${sConstraint} — ${violatingIds.has(agent.char_id) ? 'you have started to drift from the scene\'s intended beat. Pull back.' : 'the scene is drifting; steer it back toward: ' + sGoal}`,
        expires_at_turn: turnIndex + 2,
        applied: false,
      });
    }
    logger.info('beat_compliance_redirect', { phase, avoid: activeBeat.avoid.slice(0, 60), violations: violations.length, turn: turnIndex });
  }

  // ── M: Dramatic irony ────────────────────────────────────────────────────────
  // Finds unexposed lies in the room (audience knows but characters don't).
  // Escalates pressure as the lie ages — the longer the bomb sits under the table,
  // the more the Director pushes toward revelation.
  private _checkDramaticIrony(location_id: string): void {
    const agents = this.stage.getAgentsInLocation(location_id);
    if (agents.length === 0) return;
    const turnIndex = this.stage.getTurnCount();

    for (const agent of agents) {
      // Unexposed lies spoken BY other agents that this agent hasn't discovered
      const unexposed = agents
        .filter(a => a.char_id !== agent.char_id)
        .flatMap(a => this.stage.getUnexposedLiesByAgent(a.char_id, location_id));
      if (unexposed.length === 0) continue;

      // Skip if an ESCALATE or CONFRONT pressure already active for this agent
      const existing = this.stage.getActivePressures(agent.char_id);
      if (existing.some(p => p.pressure_type === 'ESCALATE' || p.pressure_type === 'CONFRONT')) continue;

      // Oldest unexposed lie determines urgency
      const oldest = unexposed.sort((a, b) => a.proposition_id.localeCompare(b.proposition_id))[0];
      const liarsName = sanitizeForPrompt(
        this.stage.getAgent(
          unexposed.map(p => p.asserted_by).find(id => id !== agent.char_id) ?? ''
        )?.name ?? 'someone',
        128,
      );

      // Fresh irony (1-2 unexposed lies, no WITHHOLD yet): emit WITHHOLD — the
      // information gap is opening. As it accumulates (3+ lies or existing WITHHOLD),
      // escalate to ESCALATE — the bomb has been under the table long enough.
      const hasWithhold = existing.some(p => p.pressure_type === 'WITHHOLD');
      const pressureType = (!hasWithhold && unexposed.length <= 2) ? 'WITHHOLD' : 'ESCALATE';
      const hint = pressureType === 'WITHHOLD'
        ? `${liarsName} knows something they haven't told you. You sense a gap — information is being withheld. Probe carefully.`
        : `Dramatic tension: ${liarsName} has told you something that isn't true — you don't know it yet, but the moment of revelation is approaching. Your instincts should be signaling that something is off.`;

      this.stage.addDramaticPressure({
        pressure_id: randomUUID(),
        target_char_id: agent.char_id,
        trigger_event_id: oldest.event_id,
        pressure_type: pressureType,
        intensity: Math.min(75, 30 + unexposed.length * 10),
        bias_hint: hint,
        expires_at_turn: turnIndex + 2,
        applied: false,
      });

      // Emit a BeatTrace with information_position = 'inferior' (character doesn't know)
      // only once per location per active lie set
      const beatExists = this.stage.getBeatTracesForLocation(location_id)
        .some(b => b.beat_type === 'pressure_applied' && b.fountain_hint.includes('dramatic_irony'));
      if (!beatExists) {
        this.stage.addBeatTrace({
          beat_id: randomUUID(),
          turn_index: turnIndex,
          location_id,
          trigger_event_id: oldest.event_id,
          beat_type: 'pressure_applied',
          participants: agents.map(a => a.char_id),
          causal_chain: unexposed.map(p => p.event_id),
          narrative_summary: `Dramatic irony active: ${unexposed.length} unexposed lie(s) in the room. Audience superior.`,
          fountain_hint: 'dramatic_irony: audience knows; characters do not. Sustain the gap.',
          information_position: 'inferior',
        });
        logger.info('dramatic_irony', { location_id, unexposedLies: unexposed.length, turn: turnIndex });
      }
    }
  }

  private emptyEvaluation(observer_id: string): PerspectiveEvaluation {
    return { observer_id, tension_delta: 0, contradiction_detected: false, new_beliefs: [], suspicion_updates: [], contradicted_propositions: [] };
  }
}
