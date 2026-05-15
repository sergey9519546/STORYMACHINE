import { Stage } from './Stage.ts';
import { Agent } from './Agent.ts';
import type { CharacterSheet, Location } from './types.ts';
import { DirectorNode } from './DirectorNode.ts';

export class Orchestrator {
  private agents: Map<string, Agent> = new Map();
  private director: DirectorNode;
  private stage: Stage;
  private locationMap: Map<string, Location> = new Map();

  constructor(stage: Stage) {
    this.stage = stage;
    this.director = new DirectorNode(stage);
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

    // 1. Agent takes action
    const action = await agent.takeTurn();

    // 2. Record action in the Script Ledger
    const currentNodeId = this.stage.getAgent(agentId)!.current_location_id;
    this.stage.recordAction(agentId, action, currentNodeId);

    // 3. Handle physical relocation
    if (action.action_type === 'RELOCATE' && action.target) {
      const targetLoc = this.locationMap.get(action.target.toLowerCase()) || this.locationMap.get(action.target);
      if (targetLoc) {
        this.stage.updateAgentLocation(agentId, targetLoc.location_id);
      }
    }

    return action;
  }

  public async runRoomSimulation(location_id: string, maxTurns: number = 5) {
    let agentsInRoom = this.stage.getAgentsInLocation(location_id);
    if (agentsInRoom.length < 2) {
      console.log(`[Orchestrator] Not enough agents in ${location_id} for a dialogue lock.`);
      return;
    }

    console.log(`[Orchestrator] Initiating Dialogue Lock in ${location_id} with ${agentsInRoom.length} agents.`);
    
    // Initiative Order based on suspicion (highest suspicion goes first)
    agentsInRoom.sort((a, b) => b.suspicion_score - a.suspicion_score);

    let turnCount = 0;
    while (turnCount < maxTurns) {
      for (const agentSheet of agentsInRoom) {
        const agent = this.agents.get(agentSheet.char_id);
        if (!agent) continue;

        // Check if agent is still in the room
        const currentSheet = this.stage.getAgent(agentSheet.char_id);
        if (currentSheet?.current_location_id !== location_id) continue;

        console.log(`[Orchestrator] ${currentSheet.name}'s turn in ${location_id}`);
        const action = await agent.takeTurn();
        this.stage.recordAction(agentSheet.char_id, action, location_id);

        if (action.action_type === 'RELOCATE' && action.target) {
          const targetLoc = this.locationMap.get(action.target.toLowerCase()) || this.locationMap.get(action.target);
          if (targetLoc) {
            console.log(`[Orchestrator] ${currentSheet.name} relocated to ${targetLoc.name}. Breaking Dialogue Lock.`);
            this.stage.updateAgentLocation(agentSheet.char_id, targetLoc.location_id);
            // Break the conversation lock if someone leaves
            break;
          }
        }
        
        turnCount++;
        if (turnCount >= maxTurns) break;
      }

      // Re-evaluate who is in the room
      agentsInRoom = this.stage.getAgentsInLocation(location_id);
      if (agentsInRoom.length < 2) {
        console.log(`[Orchestrator] Dialogue Lock broken in ${location_id}. Not enough agents.`);
        break;
      }
    }

    // 5. State Evaluation Engine (Director Node)
    console.log(`[Orchestrator] Running Director Node evaluation for ${location_id}`);
    const recentActions = this.stage.getSensoryFilter(location_id, turnCount);
    await this.director.evaluateRoom(location_id, recentActions);
  }
}
