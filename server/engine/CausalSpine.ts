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
  Goal,
  GoalMutation,
  GoalStack,
  InformationPosition,
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

  // 1b. EXAMINE action: deterministically reveal any unexposed lies by the target.
  //     Returns witnessed Belief[] for the examiner (empty if no lies found).
  //     Also flips perceived_truth on exposed propositions so they are permanently
  //     marked as discovered — subsequent observers and snapshots reflect this.
  public processExamine(
    examinerId: string,
    targetId: string,
    locationId: string,
    actionId: string,
  ): Belief[] {
    const lies = this.stage.getUnexposedLiesByAgent(targetId, locationId);
    if (lies.length === 0) return [];

    const target = this.stage.getAgent(targetId);
    const targetName = target?.name ?? targetId;
    const turnIndex = this.stage.getTurnCount();

    const newBeliefs: Belief[] = [];
    for (const lie of lies) {
      // Flip the proposition's perceived_truth so it's permanently exposed
      this.stage.setPropositionPerceivedTruth(lie.proposition_id, false);

      // Create a witnessed belief for the examiner contradicting the original claim
      newBeliefs.push({
        id: randomUUID(),
        proposition: `${targetName}'s statement "${lie.content}" was a deliberate lie`,
        confidence: 1.0,
        source: 'witnessed' as const,
        source_agent_id: targetId,
        source_event_id: actionId,
        acquired_at: turnIndex,
      });
    }

    // Merge the new beliefs into the examiner's belief set
    const examiner = this.stage.getAgent(examinerId);
    if (examiner && newBeliefs.length > 0) {
      const existingProps = new Set((examiner.beliefs ?? []).map(b => b.proposition.toLowerCase()));
      const fresh = newBeliefs.filter(b => !existingProps.has(b.proposition.toLowerCase()));
      if (fresh.length > 0) {
        this.stage.updateAgentBeliefs(examinerId, [...(examiner.beliefs ?? []), ...fresh]);
      }
    }

    return newBeliefs;
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
            severity: Math.round(existing.confidence * newBelief.confidence * 100),
          };
          this.stage.addBeliefEdge(edge);
          edges.push(edge);
        }
      }
    }

    // Rewrite Belief.contradicts[] arrays and decay confidence of superseded beliefs
    if (edges.length > 0) {
      const contradictedIds = new Set(edges.map(e => e.from_belief_id));
      const updatedBeliefs = allBeliefs.map(b => {
        const outgoing = edges.filter(e => e.from_belief_id === b.id).map(e => e.to_belief_id);
        const incoming = edges.filter(e => e.to_belief_id === b.id).map(e => e.from_belief_id);
        const extra = [...outgoing, ...incoming];
        const contradicts = extra.length > 0
          ? [...new Set([...(b.contradicts ?? []), ...extra])]
          : b.contradicts;
        // Contradicted (superseded) beliefs lose half their confidence — they're still
        // in the graph for traceability but carry reduced epistemic weight.
        const confidence = contradictedIds.has(b.id)
          ? Math.max(0.05, b.confidence * 0.5)
          : b.confidence;
        return { ...b, contradicts, confidence };
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

    let discoverer = this.stage.getAgent(discoverer_id);
    if (!discoverer) return { mutations, pressures };

    const turnIndex = this.stage.getTurnCount();

    // Find all agents whose told-beliefs are now contradicted (potential liars).
    // Primary path: source_agent_id set on the belief (when Gemini resolved source_action_index).
    // Fallback: source_event_id set but source_agent_id absent — look up EventProposition.asserted_by,
    // which is the authoritative ground truth written deterministically by processEvent().
    const allBeliefs = discoverer.beliefs ?? [];
    const suspectIds = new Set<string>();

    for (const edge of edges) {
      const fromBelief = allBeliefs.find(b => b.id === edge.from_belief_id);
      if (fromBelief?.source_agent_id) {
        suspectIds.add(fromBelief.source_agent_id);
      } else if (fromBelief?.source_event_id) {
        const props = this.stage.getEventPropositions(fromBelief.source_event_id);
        for (const p of props) {
          if (p.asserted_by !== discoverer_id) suspectIds.add(p.asserted_by);
        }
      }
    }

    for (const suspectId of suspectIds) {
      const suspect = this.stage.getAgent(suspectId);
      if (!suspect || suspectId === discoverer_id) continue;

      // ── Auto-initialize goalStack from hidden_motive if not yet set ──
      if (!discoverer.goalStack) {
        const initialStack: GoalStack = {
          terminal: { id: randomUUID(), description: discoverer.hidden_motive, value: 100, achieved: false } as Goal,
          instrumental: [],
          last_planned_at: turnIndex,
        };
        this.stage.updateGoalStack(discoverer_id, initialStack);
        discoverer = { ...discoverer, goalStack: initialStack };
      }

      // ── Mutate discoverer's goal stack: prepend confrontation subgoal ──
      if (discoverer.goalStack) {
        const confrontGoal = {
          id: randomUUID(),
          description: `Confront ${suspect.name} about the contradicting information`,
          value: 80,
          achieved: false,
        };
        const updatedStack: GoalStack = {
          ...discoverer.goalStack,
          instrumental: [confrontGoal, ...discoverer.goalStack.instrumental],
          last_planned_at: turnIndex,
        };
        this.stage.updateGoalStack(discoverer_id, updatedStack);
        discoverer = { ...discoverer, goalStack: updatedStack };

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

      // ── Mutate SUSPECT's goal stack: prepend defensive subgoal ──
      if (suspect.goalStack) {
        const repairGoal = {
          id: randomUUID(),
          description: `Deflect ${discoverer.name}'s suspicion and protect your position`,
          value: 85,
          achieved: false,
        };
        this.stage.updateGoalStack(suspectId, {
          ...suspect.goalStack,
          instrumental: [repairGoal, ...suspect.goalStack.instrumental],
          last_planned_at: turnIndex,
        });
        const suspectMutation: GoalMutation = {
          mutation_id: randomUUID(),
          char_id: suspectId,
          turn_index: turnIndex,
          trigger_event_id: triggerEventId,
          trigger_belief_id: edges[0]?.to_belief_id,
          mutation_type: 'subgoal_added',
          description: `${suspect.name} faces scrutiny; added defensive subgoal`,
          new_subgoal: repairGoal.description,
        };
        this.stage.recordGoalMutation(suspectMutation);
        mutations.push(suspectMutation);
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

      // ── GoalMutation: subgoal_blocked on the SUSPECT ──
      // The suspect's active deception/concealment subgoal is now endangered.
      if (suspect.goalStack) {
        const activeGoals = suspect.goalStack.instrumental.filter(g => !g.achieved);
        const blockedGoal = activeGoals.find(g =>
          /deceive|lie|mislead|manipulate|conceal|hide|deflect|protect/i.test(g.description),
        ) ?? activeGoals[0];
        if (blockedGoal) {
          const blockedMutation: GoalMutation = {
            mutation_id: randomUUID(),
            char_id: suspectId,
            turn_index: turnIndex,
            trigger_event_id: triggerEventId,
            trigger_belief_id: edges[0]?.to_belief_id,
            mutation_type: 'subgoal_blocked',
            description: `${suspect.name}'s subgoal "${blockedGoal.description}" is now blocked by ${discoverer.name}'s discovery`,
            old_subgoal: blockedGoal.description,
          };
          this.stage.recordGoalMutation(blockedMutation);
          mutations.push(blockedMutation);
        }
      }

      // ── GoalMutation: terminal_threatened on the DISCOVERER when high-severity ──
      // If the contradiction is severe enough AND overlaps with the discoverer's terminal
      // goal, the discoverer's core objective itself is now at risk.
      const worstSeverity = Math.max(...edges.map(e => e.severity ?? 0));
      if (worstSeverity >= 75 && discoverer.goalStack) {
        const terminalDesc = discoverer.goalStack.terminal.description;
        const contradictedText = edges
          .map(e => allBeliefs.find(b => b.id === e.from_belief_id)?.proposition ?? '')
          .join(' ');
        if (this._overlap(contradictedText, terminalDesc)) {
          const threatenedMutation: GoalMutation = {
            mutation_id: randomUUID(),
            char_id: discoverer_id,
            turn_index: turnIndex,
            trigger_event_id: triggerEventId,
            trigger_belief_id: edges[0]?.from_belief_id,
            mutation_type: 'terminal_threatened',
            description: `${discoverer.name}'s terminal objective is threatened: the contradiction undermines a core assumption`,
          };
          this.stage.recordGoalMutation(threatenedMutation);
          mutations.push(threatenedMutation);
        }
      }
    }

    return { mutations, pressures };
  }

  // 4. Create and persist a BeatTrace. information_position derived from beatType when not given.
  public createBeatTrace(params: {
    triggerEventId: string;
    beatType: BeatType;
    participants: string[];
    causalChain: string[];
    locationId: string;
    narrativeSummary: string;
    fountainHint: string;
    informationPosition?: InformationPosition;
  }): BeatTrace {
    const defaultPosition: Record<BeatType, InformationPosition> = {
      inciting_action:         'superior',
      contradiction_discovered:'parity',
      goal_mutated:            'superior',
      pressure_applied:        'superior',
      revelation:              'parity',
      turning_point:           'parity',
    };

    // Compute audience information position dynamically: if the causal chain
    // contains an unexposed lie (is_lie=true, perceived_truth=true), the
    // audience has superior knowledge — they know a deception the characters don't.
    let audiencePosition = params.informationPosition ?? defaultPosition[params.beatType];
    if (!params.informationPosition && params.causalChain.length > 0) {
      const hasHiddenLie = this.stage.hasUnexposedLiesInChain(params.causalChain);
      if (hasHiddenLie) audiencePosition = 'superior';
    }

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
      information_position: audiencePosition,
    };
    this.stage.addBeatTrace(trace);
    return trace;
  }

  // 5. Determine which agents can observe an event.
  //    EXAMINE is private; SPEAK/LIE/RELOCATE are visible to all in the same location.
  public resolveVisibility(
    entry: ActionLogEntry,
    allAgents: Array<{ char_id: string; current_location_id: string }>,
  ): string[] {
    if (entry.action_type === 'EXAMINE') return [entry.char_id];
    return allAgents
      .filter(a => a.current_location_id === entry.location_id)
      .map(a => a.char_id);
  }

  // 6. Snapshot of the current causal state for DirectorNode (no AI calls).
  public summarizeForDirector(turnIndex: number): {
    recentBeats: BeatTrace[];
    recentEdges: BeliefEdge[];
    activeEdgeCount: number;
  } {
    const allBeats  = this.stage.getAllBeatTraces();
    const allEdges  = this.stage.getAllBeliefEdges();
    return {
      recentBeats:     allBeats.filter(b => b.turn_index  >= turnIndex - 3),
      recentEdges:     allEdges.filter(e => e.turn_index  >= turnIndex - 2),
      activeEdgeCount: allEdges.length,
    };
  }

  // ── Heuristic: shared content words ≥ 40% of the smaller set ───────────────
  // Used as a fallback when Gemini's contradicted_propositions doesn't match exactly.
  private _overlap(a: string, b: string): boolean {
    if (!a || !b) return false;
    const negationRe = /\bisn?'?t\b|\bwasn?'?t\b|\baren?'?t\b|\bweren?'?t\b|\bnot\b|\bnever\b|\bno\b/i;
    const hasNeg = (s: string) => negationRe.test(s);
    const strip = (s: string) => s.toLowerCase().replace(negationRe, '').replace(/\s+/g, ' ').trim();

    // Negation-pair detection: one belief affirms, the other denies the same claim.
    // Use a lower overlap threshold because the stripped forms will be nearly identical.
    if (hasNeg(a) !== hasNeg(b)) {
      const sA = new Set((strip(a).match(/\b\w{4,}\b/g) ?? []));
      const sB = new Set((strip(b).match(/\b\w{4,}\b/g) ?? []));
      if (sA.size > 0 && sB.size > 0) {
        let shared = 0;
        for (const w of sA) if (sB.has(w)) shared++;
        if (shared / Math.min(sA.size, sB.size) >= 0.35) return true;
      }
    }

    const wordsA = new Set((a.toLowerCase().match(/\b\w{4,}\b/g) ?? []));
    const wordsB = new Set((b.toLowerCase().match(/\b\w{4,}\b/g) ?? []));
    if (wordsA.size === 0 || wordsB.size === 0) return false;
    let shared = 0;
    for (const w of wordsA) if (wordsB.has(w)) shared++;
    return shared / Math.min(wordsA.size, wordsB.size) >= 0.4;
  }
}
