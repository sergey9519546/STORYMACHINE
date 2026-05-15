import { Stage } from './Stage.ts';
import { Agent } from './Agent.ts';
import type { CharacterSheet, Location, EpistemicUpdate } from './types.ts';
import { DirectorNode } from './DirectorNode.ts';
import { CausalSpine } from './CausalSpine.ts';

export class Orchestrator {
  private agents: Map<string, Agent> = new Map();
  private director: DirectorNode;
  private stage: Stage;
  private spine: CausalSpine;
  private locationMap: Map<string, Location> = new Map();

  constructor(stage: Stage) {
    this.stage = stage;
    this.director = new DirectorNode(stage);
    this.spine = new CausalSpine(stage);
    for (const loc of this.stage.getAllLocations()) {
      this.locationMap.set(loc.location_id, loc);
      this.locationMap.set(loc.name.toLowerCase(), loc);
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

  public async runTurn(agentId: string) {
    const agent = this.agents.get(agentId);
    if (!agent) throw new Error('Agent not found');

    const action = await agent.takeTurn();

    const currentNodeId = this.stage.getAgent(agentId)!.current_location_id;
    const action_id = this.stage.recordAction(agentId, action, currentNodeId);
    const turnIndex = this.stage.getTurnCount();

    // Build EventCard for the spine
    const actionEntry = {
      action_id,
      timestamp: Date.now(),
      char_id: agentId,
      location_id: currentNodeId,
      action_type: action.action_type,
      target_char_id: action.target ?? null,
      content: action.content,
      is_audible: action.action_type !== 'EXAMINE',
    } as import('./types.ts').ActionLogEntry;
    this.spine.processEvent(actionEntry, turnIndex);

    if (action.action_type === 'RELOCATE' && action.target) {
      const targetLoc = this.locationMap.get(action.target.toLowerCase()) ?? this.locationMap.get(action.target);
      if (targetLoc) {
        action.content = `→ ${targetLoc.name}`;
        this.stage.updateAgentLocation(agentId, targetLoc.location_id);
      }
    }

    // Update the acting agent's epistemic state and run spine
    const recentActions = this.stage.getSensoryFilter(currentNodeId, 3);
    const update = await agent.updateEpistemics(recentActions);
    this._runSpineForUpdate(update, action_id, currentNodeId);

    return action;
  }

  public async runRoomSimulation(location_id: string, maxTurns: number = 5) {
    let agentsInRoom = this.stage.getAgentsInLocation(location_id);
    if (agentsInRoom.length < 2) {
      console.log(`[Orchestrator] Not enough agents in ${location_id} for a dialogue lock.`);
      return;
    }

    console.log(`[Orchestrator] Initiating Dialogue Lock in ${location_id} with ${agentsInRoom.length} agents.`);

    // ── Initiative order: LOWEST suspicion first ──
    // In realistic social dynamics, guilty parties are reactive, not proactive.
    // Agents with low suspicion (innocent/composed) set the frame of the conversation.
    agentsInRoom.sort((a, b) => {
      const diff = a.suspicion_score - b.suspicion_score;
      // Add small random jitter to break ties without perfect determinism
      if (Math.abs(diff) < 10) return Math.random() - 0.5;
      return diff;
    });

    let turnCount = 0;
    while (turnCount < maxTurns) {
      let lastActionId = '';
      let didRelocate = false;

      for (const agentSheet of agentsInRoom) {
        const agent = this.agents.get(agentSheet.char_id);
        if (!agent) continue;

        const currentSheet = this.stage.getAgent(agentSheet.char_id);
        if (currentSheet?.current_location_id !== location_id) continue;

        console.log(`[Orchestrator] ${currentSheet.name}'s turn in ${location_id}`);
        const action = await agent.takeTurn();
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
          is_audible: action.action_type !== 'EXAMINE',
        } as import('./types.ts').ActionLogEntry;
        this.spine.processEvent(actionEntry, turnIndex);

        // ── inciting_action beat: fired immediately when a LIE is recorded ──
        if (action.action_type === 'LIE') {
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

        if (action.action_type === 'RELOCATE' && action.target) {
          const targetLoc = this.locationMap.get(action.target.toLowerCase()) ?? this.locationMap.get(action.target);
          if (targetLoc) {
            action.content = `→ ${targetLoc.name}`;
            console.log(`[Orchestrator] ${currentSheet.name} relocated to ${targetLoc.name}. Breaking Dialogue Lock.`);
            this.stage.updateAgentLocation(agentSheet.char_id, targetLoc.location_id);
            didRelocate = true;
            turnCount++;
            break;
          }
        }

        turnCount++;
        if (turnCount >= maxTurns) break;
      }

      // ── Batch epistemic updates: ONCE per agent per ROUND (not per action) ──
      // This prevents O(agents × actions) Gemini calls (fanout explosion).
      if (!didRelocate && lastActionId) {
        const recentActions = this.stage.getSensoryFilter(location_id, maxTurns);
        const epistemicUpdates = await Promise.all(
          agentsInRoom
            .map(a => this.agents.get(a.char_id))
            .filter((a): a is Agent => a !== undefined)
            .map(a => a.updateEpistemics(recentActions))
        );
        for (const update of epistemicUpdates) {
          this._runSpineForUpdate(update, lastActionId, location_id);
        }
      }

      agentsInRoom = this.stage.getAgentsInLocation(location_id);
      if (agentsInRoom.length < 2) {
        console.log(`[Orchestrator] Dialogue Lock broken in ${location_id}. Not enough agents.`);
        break;
      }

      // Re-sort by suspicion after each full round (dynamics shift)
      agentsInRoom.sort((a, b) => {
        const diff = a.suspicion_score - b.suspicion_score;
        if (Math.abs(diff) < 10) return Math.random() - 0.5;
        return diff;
      });
    }

    // ── Director Node: perspective-bounded room evaluation ──
    console.log(`[Orchestrator] Running Director Node evaluation for ${location_id}`);
    const allActions = this.stage.getSensoryFilter(location_id, turnCount);
    const directorUpdates = await this.director.evaluateRoom(location_id, allActions);
    const lastActionId = allActions[allActions.length - 1]?.action_id ?? '';
    for (const update of directorUpdates) {
      this._runSpineForUpdate(update, lastActionId, location_id);
    }
  }

  // ── Spine wiring helper ─────────────────────────────────────────────────────
  // Called after every EpistemicUpdate to create contradiction edges, goal
  // mutations, dramatic pressure, and beat traces.  Pure deterministic; no AI.
  private _runSpineForUpdate(
    update: EpistemicUpdate,
    triggerEventId: string,
    locationId: string,
  ): void {
    if (!update.contradiction_detected || update.new_beliefs.length === 0) return;

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

      console.log(`[Spine] Contradiction: ${agentName} → ${edges.length} edge(s), ${mutations.length} mutation(s), ${pressures.length} pressure(s)`);
    }
  }
}
