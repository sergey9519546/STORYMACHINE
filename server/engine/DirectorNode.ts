import { Type } from '@google/genai';
import { Stage } from './Stage.ts';
import type { ActionLogEntry, PerspectiveEvaluation, BeliefSource, EpistemicUpdate, IllusionElement } from './types.ts';
import { safeJsonParse } from '../../src/lib/json.ts';
import { randomUUID } from 'crypto';
import { getAI, getModel, withTimeout } from './ai.ts';

export class DirectorNode {
  private stage: Stage;
  private _tensionHistory: number[] = [];  // H: track tension deltas for pivot detection

  constructor(stage: Stage) {
    this.stage = stage;
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
      return `[${visibleType}] ${agent?.name ?? 'Unknown'}: ${a.content}`;
    }).join('\n');

    // Ground truth for the Director (which statements were actually lies)
    const lieTranscript = recentActions
      .filter(a => a.action_type === 'LIE')
      .map(a => {
        const agent = this.stage.getAgent(a.char_id);
        return `${agent?.name ?? 'Unknown'} LIED: "${a.content}"`;
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
        console.log(`[Director] ${target.name} suspicion ${update.delta > 0 ? '+' : ''}${update.delta} → ${newScore}. Reason: ${update.reason}`);
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
    const avgTensionDelta = evaluations.reduce((s, e) => s + e.tension_delta, 0) / Math.max(1, evaluations.length);
    const contradictionsFound = evaluations.filter(e => e.contradiction_detected).length;
    this.advanceIllusionState(avgTensionDelta, contradictionsFound);

    // Log aggregate tension
    console.log(`[Director] Avg tension delta: ${avgTensionDelta.toFixed(1)}, contradictions: ${contradictionsFound}/${evaluations.length} observers`);

    // ── A: Pacing Controller ──
    this._checkPacing(location_id, recentActions.length);

    // ── H: Auto-Pivot Detection ──
    this._detectPivot(location_id, avgTensionDelta, recentActions);

    // ── I: Narrative Consistency Checker (every 5 turns) ──
    const totalTurns = this.stage.getTurnCount();
    if (totalTurns > 0 && totalTurns % 5 === 0) {
      this._checkConsistency(location_id, agentsInRoom.map(a => a.char_id));
    }

    // ── J: Belief-Edge pressure — read high-severity edges, emit canonical pressure ──
    this._checkBeliefEdges(location_id);

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
    const observerBeliefs = (observer.beliefs ?? [])
      .slice(0, 8)
      .map(b => `"${b.proposition}" (${Math.round(b.confidence * 100)}% confident)`).join(', ');

    const prompt = `You are evaluating how ${observer.name} perceives a scene.

OBSERVER PROFILE:
- Name: ${observer.name}
- Public persona: ${observer.public_mask}
- Prior beliefs: ${observerBeliefs || 'none established yet'}
- Current suspicion level: ${observer.suspicion_score}/100

WHAT ${observer.name.toUpperCase()} OBSERVED (transcript of audible events):
${observableTranscript}

DIRECTOR'S HIDDEN KNOWLEDGE (not available to ${observer.name}):
${lieTranscript}

From ${observer.name}'s perspective only:
1. How much has their tension/suspicion changed? (delta: -20 to +20)
2. Did anything they observed contradict their prior beliefs?
3. What new facts did they derive from what they saw/heard?
4. How has their suspicion of each other person changed?`;

    const response = await withTimeout(getAI().models.generateContent({
      model: getModel(),
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
    }), 30_000, `evaluatePerspective:${observer_id}`).catch(err => {
      console.error(`[Director] evaluatePerspective fallback: ${(err as Error).message}`);
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
  ): void {
    const state = this.stage.getIllusionState();
    const totalTurns = this.stage.getTurnCount();

    let nextPhase = state.phase;

    if (state.phase === 'Setup' && (totalTurns >= 10 || (avgTensionDelta > 10 && totalTurns >= 5))) {
      nextPhase = 'Turn';
      console.log('[Director] Illusion phase: Setup → Turn');
    } else if (state.phase === 'Turn' && (totalTurns >= 20 || (contradictionsFound >= 2 && totalTurns >= 12))) {
      nextPhase = 'Prestige';
      console.log('[Director] Illusion phase: Turn → Prestige');
    }

    if (nextPhase !== state.phase) {
      const element: IllusionElement = {
        description: this._plantedElementDescription(state.phase, nextPhase, totalTurns),
        turn_index: totalTurns,
        is_load_bearing: nextPhase === 'Prestige',
      };
      this.stage.updateIllusionState({
        phase: nextPhase,
        planted_elements: [...state.planted_elements, element],
      });
    }
  }

  private _plantedElementDescription(fromPhase: string, toPhase: string, turn: number): string {
    if (toPhase === 'Turn') {
      return `At turn ${turn}: the inciting lie has been planted. Observers now hold a false belief that will become structurally important.`;
    }
    return `At turn ${turn}: the contradiction has been surfaced. The illusion collapses — what was hidden will now be revealed.`;
  }

  // ── A: Pacing Controller ──
  private _checkPacing(location_id: string, actionCount: number): void {
    const totalTurns = this.stage.getTurnCount();
    const agents = this.stage.getAgentsInLocation(location_id);
    if (totalTurns < 6 || actionCount >= agents.length * 2) return;
    for (const agent of agents) {
      this.stage.addDramaticPressure({
        pressure_id: randomUUID(),
        target_char_id: agent.char_id,
        trigger_event_id: 'pacing_controller',
        pressure_type: 'revelation_due',
        intensity: 40,
        bias_hint: 'The scene is losing momentum. Something must happen — say something unexpected, reveal a new piece of information, or make a decisive move.',
        expires_at_turn: totalTurns + 3,
        applied: false,
      });
    }
    console.log(`[Director] Pacing lag detected at turn ${totalTurns} — injected momentum pressure`);
  }

  // ── H: Auto-Pivot Detection ──
  private _detectPivot(location_id: string, avgTensionDelta: number, recentActions: ActionLogEntry[]): void {
    this._tensionHistory.push(avgTensionDelta);
    if (this._tensionHistory.length > 5) this._tensionHistory.shift();
    if (this._tensionHistory.length < 3) return;

    // Sign-change twice in 3 consecutive readings = pivot
    let signChanges = 0;
    for (let i = 1; i < this._tensionHistory.length; i++) {
      if (Math.sign(this._tensionHistory[i]) !== Math.sign(this._tensionHistory[i - 1])) signChanges++;
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
    console.log(`[Director] Auto-pivot detected at turn ${this.stage.getTurnCount()}`);
    this._tensionHistory = [];  // reset after pivot
  }

  // ── I: Narrative Consistency Checker ──
  private _checkConsistency(location_id: string, charIds: string[]): void {
    for (const charId of charIds) {
      const agent = this.stage.getAgent(charId);
      if (!agent) continue;
      const beliefs = agent.beliefs ?? [];
      const contradicted = beliefs.filter(b => (b.contradicts ?? []).length > 0);
      if (contradicted.length === 0) continue;
      this.stage.addDramaticPressure({
        pressure_id: randomUUID(),
        target_char_id: charId,
        trigger_event_id: 'consistency_checker',
        pressure_type: 'evidence_against',
        intensity: 55,
        bias_hint: `You hold ${contradicted.length} contradictory belief(s). Something you believe cannot be true simultaneously with something else you believe. This cognitive dissonance is pressing on your decision-making.`,
        expires_at_turn: this.stage.getTurnCount() + 4,
        applied: false,
      });
      console.log(`[Director] Consistency alert for ${agent.name}: ${contradicted.length} contradiction(s)`);
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

      this.stage.addDramaticPressure({
        pressure_id: randomUUID(),
        target_char_id: agent.char_id,
        trigger_event_id: worst.source_event_id,
        pressure_type: 'CONFRONT',
        intensity: Math.min(100, Math.round((worst.severity ?? 50) + 20)),
        bias_hint: `A high-severity contradiction in your belief system demands resolution. You cannot remain passive — act on what you know.`,
        expires_at_turn: turnIndex + 4,
        applied: false,
      });

      console.log(`[Director] High-severity edge (${worst.severity?.toFixed(0)}) → CONFRONT pressure on ${agent.name}`);
    }
  }

  private emptyEvaluation(observer_id: string): PerspectiveEvaluation {
    return { observer_id, tension_delta: 0, contradiction_detected: false, new_beliefs: [], suspicion_updates: [], contradicted_propositions: [] };
  }
}
