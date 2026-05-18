import { randomUUID } from 'crypto';
import { Stage } from './Stage.ts';
import { Agent } from './Agent.ts';
import type { CharacterSheet, Location, EpistemicUpdate, NarrativeAction } from './types.ts';
import { DirectorNode } from './DirectorNode.ts';
import { CausalSpine } from './CausalSpine.ts';
import { AppraisalEngine } from './AppraisalEngine.ts';
import { logger } from '../lib/logger.ts';

// Events streamed to clients via SSE during a runRoomSimulation call.
export type RoomProgressEvent =
  | { type: 'agent_action'; agentId: string; agentName: string; action: NarrativeAction; turnIndex: number }
  | { type: 'round_complete'; round: number; agentCount: number }
  | { type: 'director_eval'; totalTurns: number }
  | { type: 'simulation_complete'; totalTurns: number; stoppedBy?: string };

export class Orchestrator {
  private agents: Map<string, Agent> = new Map();
  private director: DirectorNode;
  private stage: Stage;
  private spine: CausalSpine;
  private appraiser: AppraisalEngine;
  private locationMap: Map<string, Location> = new Map();

  constructor(stage: Stage) {
    this.stage = stage;
    this.director = new DirectorNode(stage);
    this.spine = new CausalSpine(stage);
    this.appraiser = new AppraisalEngine(stage);
    for (const loc of this.stage.getAllLocations()) {
      this.locationMap.set(loc.location_id, loc);
      this.locationMap.set(loc.name.toLowerCase(), loc);
    }
    // Re-hydrate agents from a persisted Stage so a server restart (or any fresh
    // Orchestrator over an existing DB) resumes the session without re-init.
    for (const sheet of this.stage.getAllAgents()) {
      this.agents.set(sheet.char_id, new Agent(sheet, this.stage));
    }
  }

  public registerAgent(sheet: CharacterSheet) {
    this.stage.addAgent(sheet);
    this.agents.set(sheet.char_id, new Agent(sheet, this.stage));
  }

  public registerNode(node: Location) {
    this.stage.addLocation(node);
    this.locationMap.set(node.location_id, node);
    this.locationMap.set(node.name.toLowerCase(), node);
  }

  // ── RELOCATE adjacency guard ────────────────────────────────────────────────
  // Returns the target Location only if it exists AND is adjacent to the agent's
  // current location. Non-adjacent moves are silently dropped so the action
  // degrades to a SPEAK rather than teleportation.
  private _resolveRelocation(agentId: string, targetStr: string): import('./types.ts').Location | null {
    const targetLoc = this.locationMap.get(targetStr.toLowerCase()) ?? this.locationMap.get(targetStr);
    if (!targetLoc) return null;
    const agent = this.stage.getAgent(agentId);
    if (!agent) return null;
    const currentLoc = this.locationMap.get(agent.current_location_id);
    if (!currentLoc) return null;
    if (!currentLoc.adjacent_locations.includes(targetLoc.location_id)) {
      logger.warn('relocation_blocked', { agent: agent.name, target: targetLoc.name });
      return null;
    }
    return targetLoc;
  }

  // ── Climax detection ─────────────────────────────────────────────────────────
  // Deterministic. True once we are in the Prestige phase AND the scene has
  // reached a genuine dramatic resolution (terminal goal achieved by any agent,
  // or enough contradictions have cascaded to constitute a revelation).
  private _isClimaxReached(location_id: string): boolean {
    const state = this.stage.getIllusionState();
    if (state.phase !== 'Prestige') return false;
    // Any agent achieved their terminal goal
    const agents = this.stage.getAgentsInLocation(location_id);
    if (agents.some(a => a.goalStack?.terminal.achieved)) return true;
    // Three or more contradiction beats in this location signal full unravelling
    const beats = this.stage.getBeatTracesForLocation(location_id);
    const contradictions = beats.filter(b => b.beat_type === 'contradiction_discovered').length;
    return contradictions >= 3;
  }

  public async runTurn(agentId: string) {
    const agent = this.agents.get(agentId);
    if (!agent) throw new Error('Agent not found');

    const currentNodeId = this.stage.getAgent(agentId)!.current_location_id;
    const action = await agent.takeTurn();

    if (action.action_type === 'RELOCATE' && action.target) {
      const targetLoc = this._resolveRelocation(agentId, action.target);
      if (targetLoc) {
        action.content = `→ ${targetLoc.name}`;
        this.stage.updateAgentLocation(agentId, targetLoc.location_id);
      } else {
        action.action_type = 'SPEAK';
        action.content = action.content || '(decides to stay put)';
        action.target = null;
      }
    }

    const action_id = this.stage.recordAction(agentId, action, currentNodeId);
    const turnIndex = this.stage.getTurnCount();

    // Build EventCard for the spine (WAIT is silent and has no propositions — skip spine)
    const actionEntry = {
      action_id,
      timestamp: Date.now(),
      char_id: agentId,
      location_id: currentNodeId,
      action_type: action.action_type,
      target_char_id: action.target ?? null,
      content: action.content,
      is_audible: action.action_type !== 'EXAMINE' && action.action_type !== 'WAIT',
    } as import('./types.ts').ActionLogEntry;
    if (action.action_type !== 'WAIT') {
      this.spine.processEvent(actionEntry, turnIndex);
    }

    // EXAMINE: deterministically reveal unexposed lies by the target.
    if (action.action_type === 'EXAMINE' && action.target) {
      const target = this.stage.getAgent(action.target);
      if (target) {
        const revealedBeliefs = this.spine.processExamine(agentId, target.char_id, currentNodeId, action_id);
        if (revealedBeliefs.length > 0) {
          const revealUpdate: EpistemicUpdate = {
            char_id: agentId,
            new_beliefs: revealedBeliefs,
            contradiction_detected: true,
            contradicted_propositions: revealedBeliefs.map(b => b.proposition),
            source_event_id: action_id,
          };
          this._runSpineForUpdate(revealUpdate, action_id, currentNodeId);
          this.appraiser.appraise(revealUpdate);
        }
      }
    }

    // Update the acting agent's epistemic state and run spine
    const recentActions = this.stage.getSensoryFilter(currentNodeId, 3);
    const update = await agent.updateEpistemics(recentActions);
    this._runSpineForUpdate(update, action_id, currentNodeId);
    this.appraiser.appraise(update);

    // ── Director evaluation ──
    // Single turns run the full Director pass (perspective evaluation, illusion-state
    // advance, pacing / arc / consistency / pivot checks) so they are first-class —
    // not a degraded path that silently skips narrative progression.
    const roomActions = this.stage.getSensoryFilter(currentNodeId, 6);
    const directorUpdates = await this.director.evaluateRoom(currentNodeId, roomActions);
    for (const u of directorUpdates) {
      this._runSpineForUpdate(u, action_id, currentNodeId);
      this.appraiser.appraise(u);
    }
    this.appraiser.applyContagion(currentNodeId);

    return action;
  }

  public async runRoomSimulation(
    location_id: string,
    maxTurns: number = 5,
    onProgress?: (event: RoomProgressEvent) => void,
  ) {
    let agentsInRoom = this.stage.getAgentsInLocation(location_id);
    if (agentsInRoom.length < 2) {
      logger.warn('dialogue_lock_insufficient_agents', { location_id, count: agentsInRoom.length });
      return;
    }

    logger.info('dialogue_lock_start', { location_id, agents: agentsInRoom.length });

    // ── Initiative order: LOWEST suspicion first ──
    // In realistic social dynamics, guilty parties are reactive, not proactive.
    // Agents with low suspicion (innocent/composed) set the frame of the conversation.
    agentsInRoom.sort((a, b) => {
      const diff = a.suspicion_score - b.suspicion_score;
      // Add small random jitter to break ties without perfect determinism
      if (Math.abs(diff) < 10) return a.char_id < b.char_id ? -1 : 1;
      return diff;
    });

    let turnCount = 0;
    let round = 0;
    let incitingActionEmitted = false;  // only one inciting_action per room simulation

    while (turnCount < maxTurns) {
      round++;
      let lastActionId = '';
      let didRelocate = false;

      for (const agentSheet of agentsInRoom) {
        const agent = this.agents.get(agentSheet.char_id);
        if (!agent) continue;

        const currentSheet = this.stage.getAgent(agentSheet.char_id);
        // Skip agents who left the room or are dead
        if (currentSheet?.current_location_id !== location_id) continue;
        if (currentSheet?.is_alive === false) continue;

        logger.debug('agent_turn', { agent: currentSheet.name, location_id });
        const action = await agent.takeTurn();
        onProgress?.({ type: 'agent_action', agentId: agentSheet.char_id, agentName: currentSheet.name, action, turnIndex: this.stage.getTurnCount() });

        if (action.action_type === 'RELOCATE' && action.target) {
          const targetLoc = this._resolveRelocation(agentSheet.char_id, action.target);
          if (targetLoc) {
            action.content = `→ ${targetLoc.name}`;
            this.stage.updateAgentLocation(agentSheet.char_id, targetLoc.location_id);
            const action_id = this.stage.recordAction(agentSheet.char_id, action, location_id);
            lastActionId = action_id;
            logger.info('agent_relocated', { agent: currentSheet.name, to: targetLoc.name });
            didRelocate = true;
            turnCount++;
            break;
          } else {
            // Non-adjacent move — downgrade to SPEAK so the turn isn't wasted
            action.action_type = 'SPEAK';
            action.content = action.content || '(decides to stay put)';
            action.target = null;
          }
        }

        const action_id = this.stage.recordAction(agentSheet.char_id, action, location_id);
        lastActionId = action_id;
        const turnIndex = this.stage.getTurnCount();

        const actionEntry = {
          action_id,
          timestamp: Date.now(),
          char_id: agentSheet.char_id,
          location_id,
          action_type: action.action_type,
          target_char_id: action.target ?? null,
          content: action.content,
          is_audible: action.action_type !== 'EXAMINE' && action.action_type !== 'WAIT',
        } as import('./types.ts').ActionLogEntry;
        if (action.action_type !== 'WAIT') {
          this.spine.processEvent(actionEntry, turnIndex);
        }

        // ── inciting_action beat: first LIE only (one per simulation — multiple lies
        //    each emitting this beat corrupts syuzhetSort's flashback reconstruction) ──
        if (action.action_type === 'LIE' && !incitingActionEmitted) {
          incitingActionEmitted = true;
          const liar = this.stage.getAgent(agentSheet.char_id);
          const witnesses = this.spine.resolveVisibility(actionEntry,
            this.stage.getAllAgents().map(a => ({ char_id: a.char_id, current_location_id: a.current_location_id })),
          ).filter(id => id !== agentSheet.char_id);
          this.spine.createBeatTrace({
            triggerEventId: action_id,
            beatType: 'inciting_action',
            participants: [agentSheet.char_id, ...witnesses],
            causalChain: [action_id],
            locationId: location_id,
            narrativeSummary: `${liar?.name ?? agentSheet.char_id} plants a false claim that may detonate later.`,
            fountainHint: `${(liar?.name ?? agentSheet.char_id).toUpperCase()} speaks — but the words cost something. A beat. The room shifts.`,
          });
        }

        // ── EXAMINE: deterministically reveal unexposed lies by the target ──
        if (action.action_type === 'EXAMINE' && action.target) {
          const target = this.stage.getAgent(action.target);
          if (target) {
            const revealedBeliefs = this.spine.processExamine(agentSheet.char_id, target.char_id, location_id, action_id);
            if (revealedBeliefs.length > 0) {
              const revealUpdate: EpistemicUpdate = {
                char_id: agentSheet.char_id,
                new_beliefs: revealedBeliefs,
                contradiction_detected: true,
                contradicted_propositions: revealedBeliefs.map(b => b.proposition),
                source_event_id: action_id,
              };
              this._runSpineForUpdate(revealUpdate, action_id, location_id);
              this.appraiser.appraise(revealUpdate);
            }
          }
        }

        turnCount++;
        if (turnCount >= maxTurns) break;
      }

      // ── Batch epistemic updates: ONCE per agent per ROUND (not per action) ──
      // This prevents O(agents × actions) Gemini calls (fanout explosion).
      if (!didRelocate && lastActionId) {
        const recentActions = this.stage.getSensoryFilter(location_id, maxTurns);
        // Snapshot suspicion scores before epistemic updates for persuasion outcome tracking
        const suspicionBefore = new Map<string, number>(
          agentsInRoom.map(a => [a.char_id, a.suspicion_score]),
        );
        const epistemicUpdates = await Promise.all(
          agentsInRoom
            .map(a => this.agents.get(a.char_id))
            .filter((a): a is Agent => a !== undefined)
            .map(a => a.updateEpistemics(recentActions))
        );
        for (const update of epistemicUpdates) {
          this._runSpineForUpdate(update, lastActionId, location_id);
          this.appraiser.appraise(update);
        }
        // Record persuasion outcomes: success when target's suspicion decreased
        const currentTurn = this.stage.getTurnCount();
        for (const agent of agentsInRoom) {
          const log = this.stage.getPersuasionLog(agent.char_id, agentsInRoom.length * 2);
          for (const rec of log.filter(r => r.turn === currentTurn && r.success === undefined)) {
            const target = this.stage.getAgent(rec.target_id);
            if (!target) continue;
            const before = suspicionBefore.get(rec.target_id) ?? target.suspicion_score;
            const success = target.suspicion_score < before - 2;
            this.stage.updatePersuasionOutcome(rec.id, success);
          }
        }
      }

      onProgress?.({ type: 'round_complete', round, agentCount: agentsInRoom.length });

      agentsInRoom = this.stage.getAgentsInLocation(location_id);
      const aliveInRoom = agentsInRoom.filter(a => a.is_alive !== false);
      if (aliveInRoom.length < 2) {
        logger.info('dialogue_lock_broken', { location_id });
        break;
      }

      // ── Climax detection: emit a revelation beat and stop ──
      if (this._isClimaxReached(location_id)) {
        const lastId = lastActionId || agentsInRoom[0]?.char_id || '';
        this.spine.createBeatTrace({
          triggerEventId: lastId,
          beatType: 'revelation',
          participants: agentsInRoom.map(a => a.char_id),
          causalChain: [lastId],
          locationId: location_id,
          narrativeSummary: 'The illusion has collapsed. Every contradiction has detonated. This is the Prestige.',
          fountainHint: 'HOLD on the faces. Everything has changed. The audience finally understands.',
        });
        logger.info('climax_reached', { location_id });
        break;
      }

      // Re-sort by suspicion after each full round (dynamics shift)
      agentsInRoom = aliveInRoom.sort((a, b) => {
        const diff = a.suspicion_score - b.suspicion_score;
        if (Math.abs(diff) < 10) return a.char_id < b.char_id ? -1 : 1;
        return diff;
      });
    }

    // ── Director Node: perspective-bounded room evaluation ──
    logger.info('director_eval_start', { location_id });
    const allActions = this.stage.getSensoryFilter(location_id, turnCount);
    const directorUpdates = await this.director.evaluateRoom(location_id, allActions);
    const lastActionId = allActions[allActions.length - 1]?.action_id ?? '';
    for (const update of directorUpdates) {
      this._runSpineForUpdate(update, lastActionId, location_id);
      this.appraiser.appraise(update);
    }
    onProgress?.({ type: 'director_eval', totalTurns: turnCount });

    // ── OCC contagion: emotions diffuse between co-present agents ──
    this.appraiser.applyContagion(location_id);
    // Suspicion contagion: distressed/fearful agents raise others' suspicion,
    // weighted by distrust. Runs after Director updates to layer on top correctly.
    this.appraiser.applySuspicionContagion(location_id);

    onProgress?.({ type: 'simulation_complete', totalTurns: turnCount });
  }

  // ── Multi-room orchestration ─────────────────────────────────────────────────
  // Runs a full scene spanning multiple locations. Each round, active rooms are
  // sorted by their current tension accumulator (highest first) so hotter rooms
  // run first and get more turns. RELOCATE agents move between rooms at round
  // boundaries, so a fleeing character naturally joins the next room's simulation.
  public async runFullScene(
    locationIds: string[],
    turnsPerRoom = 3,
    maxRounds = 4,
    onProgress?: (event: RoomProgressEvent) => void,
  ): Promise<void> {
    // Resolve locations that have ≥1 agent
    let activeLocations = locationIds.filter(lid => {
      const agents = this.stage.getAgentsInLocation(lid);
      return agents.filter(a => a.is_alive !== false).length >= 1;
    });

    for (let round = 0; round < maxRounds; round++) {
      if (activeLocations.length === 0) break;

      // Sort rooms by dramatic tension: rooms with more agents and more accumulated
      // suspicion run first so pressure cascades naturally between scenes.
      const tensionState = this.stage.getDirectorTensionState();
      const sorted = [...activeLocations].sort((a, b) => {
        const agentsA = this.stage.getAgentsInLocation(a).filter(x => x.is_alive !== false);
        const agentsB = this.stage.getAgentsInLocation(b).filter(x => x.is_alive !== false);
        // Primary key: accumulated suspicion in the room (higher → more urgent)
        const suspA = agentsA.reduce((s, ag) => s + (ag.suspicion_score ?? 0), 0);
        const suspB = agentsB.reduce((s, ag) => s + (ag.suspicion_score ?? 0), 0);
        if (suspB !== suspA) return suspB - suspA;
        // Secondary key: number of agents (more agents → more narrative potential)
        if (agentsB.length !== agentsA.length) return agentsB.length - agentsA.length;
        // Tertiary: tension accumulator tiebreak (stable across calls)
        return (tensionState.accumulator > 50 ? a : b) === a ? -1 : 1;
      });

      for (const lid of sorted) {
        const aliveHere = this.stage.getAgentsInLocation(lid).filter(a => a.is_alive !== false);
        if (aliveHere.length === 0) continue;

        logger.info('full_scene_room', { round, location_id: lid, agents: aliveHere.length });
        await this.runRoomSimulation(lid, turnsPerRoom, onProgress);
      }

      // After each full round, re-discover active locations (agents may have relocated)
      activeLocations = locationIds.filter(lid => {
        const agents = this.stage.getAgentsInLocation(lid);
        return agents.filter(a => a.is_alive !== false).length >= 1;
      });

      onProgress?.({ type: 'round_complete', round, agentCount: activeLocations.reduce((s, lid) =>
        s + this.stage.getAgentsInLocation(lid).filter(a => a.is_alive !== false).length, 0) });
    }

    onProgress?.({ type: 'simulation_complete', totalTurns: this.stage.getTurnCount() });
  }

  // ── Spine wiring helper ─────────────────────────────────────────────────────
  // Called after every EpistemicUpdate to create contradiction edges, goal
  // mutations, dramatic pressure, and beat traces.  Pure deterministic; no AI.
  private _runSpineForUpdate(
    update: EpistemicUpdate,
    triggerEventId: string,
    locationId: string,
  ): void {
    if (!update.contradiction_detected) {
      // No conflict — but new beliefs may still corroborate or update existing ones.
      if (update.new_beliefs.length > 0) {
        this.spine.processBeliefReinforcement(update.char_id, update.new_beliefs, triggerEventId);
      }
      return;
    }
    if (update.new_beliefs.length === 0) {
      this.stage.addDramaticPressure({
        pressure_id: randomUUID(),
        target_char_id: update.char_id,
        trigger_event_id: update.source_event_id ?? triggerEventId,
        pressure_type: 'CONFRONT',
        intensity: 45,
        bias_hint: `Something you heard contradicts what you already know. You sense the inconsistency, even if you can't place it yet. Trust that instinct.`,
        expires_at_turn: this.stage.getTurnCount() + 3,
        applied: false,
      });
      return;
    }

    const edges = this.spine.processBeliefUpdate(
      update.char_id,
      update.new_beliefs,
      triggerEventId,
      update.contradiction_detected,
      update.contradicted_propositions,
    );

    if (edges.length === 0) return;

    const { mutations, pressures } = this.spine.processContradiction(
      update.char_id,
      edges,
      triggerEventId,
    );

    if (mutations.length > 0 || pressures.length > 0) {
      const agent = this.stage.getAgent(update.char_id);
      const agentName = agent?.name ?? update.char_id;
      this.spine.createBeatTrace({
        triggerEventId,
        beatType: 'contradiction_discovered',
        participants: [update.char_id, ...new Set(edges.map(e => {
          // include the source agent of the contradicted belief if known
          const allBeliefs = agent?.beliefs ?? [];
          return allBeliefs.find(b => b.id === e.from_belief_id)?.source_agent_id ?? '';
        }).filter(Boolean))],
        causalChain: [triggerEventId],
        locationId,
        narrativeSummary: `${agentName} discovers a contradiction in their belief graph, triggering ${mutations.length} goal mutation(s) and ${pressures.length} dramatic pressure(s).`,
        fountainHint: `${agentName.toUpperCase()} pauses — something doesn't add up. The air between them changes.`,
      });

      logger.info('contradiction_processed', { agent: agentName, edges: edges.length, mutations: mutations.length, pressures: pressures.length });
    }
  }
}
