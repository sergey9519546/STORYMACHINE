import { randomUUID } from 'crypto';
import type {
  ActionLogEntry,
  Belief,
  BeliefEdge,
  BeatTrace,
  BeatType,
  DramaticPressure,
  EventCard,
  EventProposition,
  GoalMutation,
} from './types.ts';
import { Stage } from './Stage.ts';

// ── CausalSpine ───────────────────────────────────────────────────────────────
// Pure deterministic logic — no Gemini calls.
// Converts raw engine events into the causal-epistemic graph:
//   ActionLogEntry → EventCard → BeliefEdge → GoalMutation → DramaticPressure → BeatTrace

export class CausalSpine {
  private stage: Stage;
  constructor(stage: Stage) {
    this.stage = stage;
  }

  // 1. Extract propositions from a recorded action and persist as EventCard.
  //    Called immediately after Stage.recordAction().
  public processEvent(entry: ActionLogEntry, turnIndex: number): EventCard {
    const propositions: EventProposition[] = [];

    if (entry.action_type === 'SPEAK' || entry.action_type === 'LIE') {
      propositions.push({
        proposition_id: randomUUID(),
        event_id: entry.action_id,
        content: entry.content,
        is_lie: entry.action_type === 'LIE',
        asserted_by: entry.char_id,
        perceived_truth: true,
      });
    } else if (entry.action_type === 'EXAMINE' && entry.content.trim()) {
      propositions.push({
        proposition_id: randomUUID(),
        event_id: entry.action_id,
        content: entry.content,
        is_lie: false,
        asserted_by: entry.char_id,
        perceived_truth: true,
      });
    }

    const card: EventCard = {
      event_id: entry.action_id,
      char_id: entry.char_id,
      action_type: entry.action_type,
      content: entry.content,
      location_id: entry.location_id,
      turn_index: turnIndex,
      propositions,
    };

    this.stage.recordEventCard(card);
    if (propositions.length > 0) this.stage.addEventPropositions(propositions);
    return card;
  }

  // 2. After a belief update: if contradiction was detected, find existing beliefs
  //    that conflict with the new ones, create BeliefEdge rows, and update
  //    Belief.contradicts[] so the graph has real edges.
  //
  //    contradictedPropositions: text strings Gemini said were contradicted.
  //    sourceEventId: the action_id that triggered this update.
  public processBeliefUpdate(
    char_id: string,
    newBeliefs: Belief[],
    sourceEventId: string,
    contradictionDetected: boolean,
    contradictedPropositions: string[],
  ): BeliefEdge[] {
    if (!contradictionDetected || newBeliefs.length === 0) return [];

    // Read the pre-update belief set (newBeliefs are ALREADY written to Stage by caller)
    const allBeliefs = this.stage.getAgent(char_id)?.beliefs ?? [];
    const existingBeliefs = allBeliefs.filter(b => !newBeliefs.some(nb => nb.id === b.id));
    const turnIndex = this.stage.getTurnCount();
    const edges: BeliefEdge[] = [];

    for (const newBelief of newBeliefs) {
      for (const existing of existingBeliefs) {
        // A contradiction edge fires when:
        // (a) Gemini reported the existing proposition was contradicted, OR
        // (b) the two propositions have significant content overlap (heuristic)
        const namedConflict = contradictedPropositions.some(cp =>
          this._overlap(cp, existing.proposition),
        );
        const directConflict = this._overlap(newBelief.proposition, existing.proposition);

        if ((namedConflict || directConflict) && newBelief.id !== existing.id) {
          const edge: BeliefEdge = {
            edge_id: randomUUID(),
            from_belief_id: existing.id,
            to_belief_id: newBelief.id,
            edge_type: 'contradicts',
            discovered_by: char_id,
            source_event_id: sourceEventId,
            turn_index: turnIndex,
          };
          this.stage.addBeliefEdge(edge);
          edges.push(edge);
        }
      }
    }

    // Rewrite Belief.contradicts[] arrays for affected beliefs
    if (edges.length > 0) {
      const updatedBeliefs = allBeliefs.map(b => {
        const outgoing = edges.filter(e => e.from_belief_id === b.id).map(e => e.to_belief_id);
        const incoming = edges.filter(e => e.to_belief_id === b.id).map(e => e.from_belief_id);
        const extra = [...outgoing, ...incoming];
        if (extra.length === 0) return b;
        return {
          ...b,
          contradicts: [...new Set([...(b.contradicts ?? []), ...extra])],
        };
      });
      this.stage.updateAgentBeliefs(char_id, updatedBeliefs);
    }

    return edges;
  }

  // 3. From contradiction edges: resolve WHO was lied to and by whom,
  //    mutate the discoverer's goal stack, and emit DramaticPressure on both parties.
  public processContradiction(
    discoverer_id: string,
    edges: BeliefEdge[],
    triggerEventId: string,
  ): { mutations: GoalMutation[]; pressures: DramaticPressure[] } {
    const mutations: GoalMutation[] = [];
    const pressures: DramaticPressure[] = [];
    if (edges.length === 0) return { mutations, pressures };

    const discoverer = this.stage.getAgent(discoverer_id);
    if (!discoverer) return { mutations, pressures };

    const turnIndex = this.stage.getTurnCount();

    // Find all agents whose told-beliefs are now contradicted (potential liars)
    const allBeliefs = discoverer.beliefs ?? [];
    const suspectIds = new Set<string>();

    for (const edge of edges) {
      const fromBelief = allBeliefs.find(b => b.id === edge.from_belief_id);
      if (fromBelief?.source_agent_id) {
        suspectIds.add(fromBelief.source_agent_id);
      }
    }

    for (const suspectId of suspectIds) {
      const suspect = this.stage.getAgent(suspectId);
      if (!suspect || suspectId === discoverer_id) continue;

      // ── Mutate discoverer's goal stack: prepend confrontation subgoal ──
      if (discoverer.goalStack) {
        const confrontGoal = {
          id: randomUUID(),
          description: `Confront ${suspect.name} about the contradicting information`,
          value: 80,
          achieved: false,
        };
        const updatedStack = {
          ...discoverer.goalStack,
          instrumental: [confrontGoal, ...discoverer.goalStack.instrumental],
          last_planned_at: turnIndex,
        };
        this.stage.updateGoalStack(discoverer_id, updatedStack);

        const mutation: GoalMutation = {
          mutation_id: randomUUID(),
          char_id: discoverer_id,
          turn_index: turnIndex,
          trigger_event_id: triggerEventId,
          trigger_belief_id: edges[0]?.from_belief_id,
          mutation_type: 'subgoal_added',
          description: `${discoverer.name} found contradictory evidence; added confrontation subgoal targeting ${suspect.name}`,
          new_subgoal: confrontGoal.description,
        };
        this.stage.recordGoalMutation(mutation);
        mutations.push(mutation);
      }

      // ── DramaticPressure on the SUSPECT: confrontation_imminent ──
      const suspectPressure: DramaticPressure = {
        pressure_id: randomUUID(),
        target_char_id: suspectId,
        source_char_id: discoverer_id,
        trigger_event_id: triggerEventId,
        pressure_type: 'confrontation_imminent',
        intensity: 70,
        bias_hint: `${discoverer.name} has found evidence that contradicts something you said earlier. A confrontation may be coming. You feel the need to prepare a defense, deflect attention, or double down.`,
        expires_at_turn: turnIndex + 5,
        applied: false,
      };
      this.stage.addDramaticPressure(suspectPressure);
      pressures.push(suspectPressure);

      // ── DramaticPressure on the DISCOVERER: evidence_against ──
      const discovererPressure: DramaticPressure = {
        pressure_id: randomUUID(),
        target_char_id: discoverer_id,
        source_char_id: suspectId,
        trigger_event_id: triggerEventId,
        pressure_type: 'evidence_against',
        intensity: 65,
        bias_hint: `You have found evidence that contradicts what ${suspect.name} told you. You are weighing whether to confront them directly, keep watching, or use this knowledge strategically.`,
        expires_at_turn: turnIndex + 5,
        applied: false,
      };
      this.stage.addDramaticPressure(discovererPressure);
      pressures.push(discovererPressure);
    }

    return { mutations, pressures };
  }

  // 4. Create and persist a BeatTrace.
  public createBeatTrace(params: {
    triggerEventId: string;
    beatType: BeatType;
    participants: string[];
    causalChain: string[];
    locationId: string;
    narrativeSummary: string;
    fountainHint: string;
  }): BeatTrace {
    const trace: BeatTrace = {
      beat_id: randomUUID(),
      turn_index: this.stage.getTurnCount(),
      location_id: params.locationId,
      trigger_event_id: params.triggerEventId,
      beat_type: params.beatType,
      participants: params.participants,
      causal_chain: params.causalChain,
      narrative_summary: params.narrativeSummary,
      fountain_hint: params.fountainHint,
    };
    this.stage.addBeatTrace(trace);
    return trace;
  }

  // ── Heuristic: shared content words ≥ 40% of the smaller set ───────────────
  // Used as a fallback when Gemini's contradicted_propositions doesn't match exactly.
  private _overlap(a: string, b: string): boolean {
    if (!a || !b) return false;
    const wordsA = new Set((a.toLowerCase().match(/\b\w{4,}\b/g) ?? []));
    const wordsB = new Set((b.toLowerCase().match(/\b\w{4,}\b/g) ?? []));
    if (wordsA.size === 0 || wordsB.size === 0) return false;
    let shared = 0;
    for (const w of wordsA) if (wordsB.has(w)) shared++;
    return shared / Math.min(wordsA.size, wordsB.size) >= 0.4;
  }
}
