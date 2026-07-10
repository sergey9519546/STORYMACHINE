import { randomUUID } from 'crypto';
import { Stage, isAudibleActionType } from './Stage.ts';
import { Agent } from './Agent.ts';
import type { CharacterSheet, Location, EpistemicUpdate, NarrativeAction, TheoryOfMind, EmotionState, ActionType, Belief } from './types.ts';
import { DirectorNode } from './DirectorNode.ts';
import { CausalSpine } from './CausalSpine.ts';
import { AppraisalEngine } from './AppraisalEngine.ts';
import { logger } from '../lib/logger.ts';
// Wave 32 — Action↔StoryOp Bridge: unify the live sim with the canon ledger.
import { buildTurnCommit } from '../nvm/bridge/action-to-ops.ts';
import type { RelationshipDeltaInput, EmotionAppraisalInput } from '../nvm/bridge/action-to-ops.ts';
import { buildNarrativeState, emptyState } from '../nvm/state/NarrativeState.ts';
import type { NarrativeState } from '../nvm/state/NarrativeState.ts';
import { applyStoryOps } from '../nvm/ops/dispatcher.ts';

// Events streamed to clients via SSE during a runRoomSimulation call.
export type RoomProgressEvent =
  | { type: 'agent_action'; agentId: string; agentName: string; action: NarrativeAction; turnIndex: number }
  | { type: 'round_complete'; round: number; agentCount: number }
  | { type: 'director_eval'; totalTurns: number }
  // Fix C: additive — droppedCommits is only present when this call dropped
  // at least one Tier-1-rejected commit from canon (see consumeDroppedCommits()).
  | { type: 'simulation_complete'; totalTurns: number; stoppedBy?: string; droppedCommits?: DroppedCommits };

// Fix C (silent canon drops): buildTurnCommit returns null and only logs a
// warning when a turn's ops fail the Tier-1 proof gate — the user previously
// had no way to learn a turn's narrative consequences never reached canon.
export interface DroppedCommits {
  count: number;
  reasons: string[];
}

// Fix A: TheoryOfMind dimensions with a direct RelationshipDelta counterpart.
// power_balance has NO matching StoryOp dimension (RelationshipDelta's union —
// love/trust/intimacy/admiration/resentment/fear/contempt/guilt/obligation/
// dependency — has nothing shaped like a 0=they-dominate..1=I-dominate power
// axis) and is intentionally NOT bridged rather than force-mapped onto a
// dimension that would misrepresent it.
const TOM_TO_RELATIONSHIP_DIM: ReadonlyArray<{
  tomKey: 'trust_level' | 'affinity' | 'debt';
  dimension: RelationshipDeltaInput['dimension'];
  label: string;
}> = [
  { tomKey: 'trust_level', dimension: 'trust',      label: 'trust' },
  { tomKey: 'affinity',    dimension: 'love',        label: 'affinity' },
  { tomKey: 'debt',        dimension: 'obligation',  label: 'felt obligation' },
];

// X1 — blueprint action-vocabulary expansion: fixed trust/affinity/debt
// deltas applied directly to the TARGET's TheoryOfMind entry ABOUT THE ACTOR,
// modeling how directly experiencing being threatened, betrayed, protected,
// or allied-with immediately shifts how the recipient sees the actor —
// independent of, and prior to, whatever their own next updateEpistemics
// call additionally infers from tone (deterministic.ts's lexicon already
// includes "threat"/"betrayed" in its accusatory/negative-tone word lists,
// so that probabilistic layer reinforces rather than duplicates this direct
// one). trust_level always has a documented neutral default (0.5 —
// types.ts's TheoryOfMind doc comment), so it is always adjusted; affinity
// and debt follow the SAME no-fabricated-baseline rule diffTheoryOfMind
// already enforces below (only nudged when a prior value exists — a
// first-ever encounter never invents a baseline).
const RELATIONSHIP_ACTION_DELTA: Partial<Record<ActionType, { trust: number; affinity: number; debt: number }>> = {
  THREATEN:      { trust: -0.18, affinity: -0.08, debt:  0.00 },
  BETRAY:        { trust: -0.35, affinity: -0.20, debt: -0.10 },
  PROTECT:       { trust:  0.15, affinity:  0.10, debt:  0.08 },
  FORM_ALLIANCE: { trust:  0.22, affinity:  0.15, debt:  0.12 },
};

// Pure diff: TheoryOfMind before/after (both snapshotted at the Orchestrator
// call site, where the observing agent's own belief/emotion update is in
// scope) → RelationshipDeltaInput[] the bridge can turn into SHIFT_RELATIONSHIP
// ops. trust_level always has an engine-established neutral default (0.5 —
// see Agent.ts's ToM-update block) so a brand-new subject still yields a
// meaningful delta from that baseline; affinity/debt have no such documented
// default, so a first-ever observation of a subject (no `before` entry) is
// skipped for those two dimensions rather than inventing a baseline that
// could misrepresent the character's actual first impression.
function diffTheoryOfMind(
  observerId: string,
  before: Record<string, TheoryOfMind>,
  after: Record<string, TheoryOfMind>,
  turnIndex: number,
): RelationshipDeltaInput[] {
  const deltas: RelationshipDeltaInput[] = [];
  for (const [subjectId, a] of Object.entries(after)) {
    const b = before[subjectId];
    const pair: [string, string] = [observerId, subjectId];
    for (const { tomKey, dimension, label } of TOM_TO_RELATIONSHIP_DIM) {
      const afterVal = a[tomKey];
      if (afterVal === undefined) continue;
      const beforeVal = tomKey === 'trust_level'
        ? (b?.trust_level ?? 0.5)
        : b?.[tomKey];
      if (beforeVal === undefined) continue; // no honest baseline for this dimension yet
      const amount = afterVal - beforeVal;
      if (amount === 0) continue;
      deltas.push({
        pair, dimension, amount,
        reason: `${observerId}'s ${label} in ${subjectId} shifted at turn ${turnIndex}`,
      });
    }
  }
  return deltas;
}

// Pure diff: EmotionState before/after (snapshotted immediately around the
// AppraisalEngine.appraise() call for one char_id) → an EmotionAppraisalInput
// candidate, or null when nothing changed. Significance thresholding (is this
// appraisal worth a permanent StoryOp) is the bridge's job, not this diff's —
// see emotionAppraisalsToOps in action-to-ops.ts.
function diffEmotion(
  charId: string,
  before: EmotionState | undefined,
  after: EmotionState | undefined,
): EmotionAppraisalInput | null {
  if (!after) return null;
  if (before && before.dominant === after.dominant && before.intensity === after.intensity) return null;
  return { charId, emotion: after };
}

export class Orchestrator {
  private agents: Map<string, Agent> = new Map();
  private director: DirectorNode;
  private stage: Stage;
  private spine: CausalSpine;
  private appraiser: AppraisalEngine;
  private locationMap: Map<string, Location> = new Map();
  // Wave 32: tracks the most-recent StoryCommit ID so parent chains are correct.
  private _lastCommitId: string | null = null;
  // Wave 43: running NarrativeState accumulated from committed ops so the proof
  // gate sees prior facts/clocks/relationships, not just the current IR's ops.
  private _narrativeState: NarrativeState = emptyState();
  // Fix C: Tier-1 canon-drop bookkeeping. Accumulates across buildTurnCommit
  // calls via the onTier1Reject hook; drained (read + reset) by
  // consumeDroppedCommits() so a route handler gets exactly "what was dropped
  // during MY call", not a lifetime total that keeps growing across a
  // long-lived session's many turn/run-room requests.
  private _droppedCount = 0;
  private _droppedReasons: string[] = [];

  private _onTier1Reject = (reasons: string): void => {
    this._droppedCount++;
    // Cap retained reason strings so a pathological run can't grow this
    // unboundedly between consumeDroppedCommits() calls.
    if (this._droppedReasons.length < 50) this._droppedReasons.push(reasons);
  };

  /** Drains (reads + resets) Tier-1 drops accumulated since the last drain.
   *  Returns null when nothing was dropped so callers can splice an additive
   *  `droppedCommits` field into a response only when nonzero (Fix C). */
  public consumeDroppedCommits(): { count: number; reasons: string[] } | null {
    if (this._droppedCount === 0) return null;
    const result = { count: this._droppedCount, reasons: this._droppedReasons };
    this._droppedCount = 0;
    this._droppedReasons = [];
    return result;
  }

  // Non-destructive peek — used only to annotate an in-flight SSE
  // `simulation_complete` progress event with the running total so far,
  // without resetting state that a wrapping runFullScene call (which emits
  // its OWN final event after possibly many nested runRoomSimulation calls)
  // still needs to see in full. Only the top-level route handler actually
  // drains, via consumeDroppedCommits(), once the whole call has resolved.
  private _peekDroppedCommits(): { count: number; reasons: string[] } | null {
    if (this._droppedCount === 0) return null;
    return { count: this._droppedCount, reasons: [...this._droppedReasons] };
  }

  // Fix A: snapshot helpers — read the live Stage-persisted ToM/emotion for one
  // agent so the Orchestrator can diff before/after around the exact calls
  // (Agent.updateEpistemics, AppraisalEngine.appraise) that mutate them.
  private _snapshotTom(charId: string): Record<string, TheoryOfMind> {
    return { ...(this.stage.getAgent(charId)?.theoryOfMind ?? {}) };
  }

  private _snapshotEmotion(charId: string): EmotionState | undefined {
    return this.stage.getAgent(charId)?.emotionState;
  }

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
    // Wave 32: seed parent chain from the last commit already in the ledger.
    const existingCommits = this.stage.getCommits();
    if (existingCommits.length > 0) {
      this._lastCommitId = existingCommits[existingCommits.length - 1].commitId;
    }
    // Wave 43: fold existing commits into _narrativeState so the proof gate
    // sees prior facts/clocks/relationships on every subsequent turn.
    for (const c of existingCommits) {
      this._narrativeState = applyStoryOps(this._narrativeState, c.ops);
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

    const _stageAgent = this.stage.getAgent(agentId);
    if (!_stageAgent) throw new Error(`Agent ${agentId} missing from stage`);
    const currentNodeId = _stageAgent.current_location_id;
    const action = await agent.takeTurn();

    // RELOCATE (personality-driven exit) and FLEE (cascade fear-driven exit —
    // see agent/deterministic.ts's tier 1 vs tier 6 split) share the same
    // adjacency-guarded resolution; they differ only in framing and in what a
    // blocked attempt degrades to.
    if ((action.action_type === 'RELOCATE' || action.action_type === 'FLEE') && action.target) {
      const targetLoc = this._resolveRelocation(agentId, action.target);
      if (targetLoc) {
        action.content = action.action_type === 'FLEE' ? `→ ${targetLoc.name} (flees)` : `→ ${targetLoc.name}`;
        this.stage.updateAgentLocation(agentId, targetLoc.location_id);
      } else if (action.action_type === 'FLEE') {
        // A blocked flight reads as cornered, not merely as changing plans —
        // WAIT (not SPEAK) is the honest downgrade for a failed fear-response.
        action.action_type = 'WAIT';
        action.content = action.content || `(there's nowhere to run)`;
        action.target = null;
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
      is_audible: isAudibleActionType(action.action_type),
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
          try {
            this._runSpineForUpdate(revealUpdate, action_id, currentNodeId);
            this.appraiser.appraise(revealUpdate);
          } catch (err) {
            logger.warn('spine_reveal_failed', { agentId, error: (err as Error).message });
          }
        }
      }
    }

    // X1: SEARCH — the room-wide counterpart of EXAMINE (see _applySearchReveal).
    if (action.action_type === 'SEARCH') {
      const searchUpdate = this._applySearchReveal(agentId, currentNodeId, action_id);
      if (searchUpdate) {
        try {
          this._runSpineForUpdate(searchUpdate, action_id, currentNodeId);
          this.appraiser.appraise(searchUpdate);
        } catch (err) {
          logger.warn('spine_search_failed', { agentId, error: (err as Error).message });
        }
      }
    }

    // X1: HIDE / OBSERVE / LISTEN / REVEAL / THREATEN / BETRAY / PROTECT /
    // FORM_ALLIANCE — see _applyImmediateActionEffects for the per-type mechanics.
    let immediateRelationshipDeltas: RelationshipDeltaInput[] = [];
    try {
      immediateRelationshipDeltas = this._applyImmediateActionEffects(agentId, action, currentNodeId, action_id, turnIndex);
    } catch (err) {
      logger.warn('immediate_action_effect_error', { agentId, actionType: action.action_type, error: (err as Error).message });
    }

    // Update the acting agent's epistemic state and run spine
    // Fix A: snapshot theory-of-mind BEFORE updateEpistemics — it's the only
    // place ToM mutates (Agent.ts's "Update theory of mind" block) — so we can
    // diff it into RelationshipDeltaInput[] once the call has run.
    const tomBefore = this._snapshotTom(agentId);
    const emotionBeforePrimary = this._snapshotEmotion(agentId);
    const recentActions = this.stage.getSensoryFilter(currentNodeId, 3);
    const update = await agent.updateEpistemics(recentActions);
    try {
      this._runSpineForUpdate(update, action_id, currentNodeId);
      this.appraiser.appraise(update);
    } catch (err) {
      logger.warn('spine_epistemic_failed', { agentId, error: (err as Error).message });
    }
    const relationshipDeltas = [
      ...immediateRelationshipDeltas,
      ...diffTheoryOfMind(agentId, tomBefore, this._snapshotTom(agentId), turnIndex),
    ];
    const emotionAppraisals: EmotionAppraisalInput[] = [];
    const primaryEmotionDelta = diffEmotion(agentId, emotionBeforePrimary, this._snapshotEmotion(agentId));
    if (primaryEmotionDelta) emotionAppraisals.push(primaryEmotionDelta);

    // ── Director evaluation ──
    // Single turns run the full Director pass (perspective evaluation, illusion-state
    // advance, pacing / arc / consistency / pivot checks) so they are first-class —
    // not a degraded path that silently skips narrative progression.
    const roomActions = this.stage.getSensoryFilter(currentNodeId, 6);
    const directorUpdates = await this.director.evaluateRoom(currentNodeId, roomActions);
    for (const u of directorUpdates) {
      const emotionBeforeDirector = this._snapshotEmotion(u.char_id);
      try {
        this._runSpineForUpdate(u, action_id, currentNodeId);
        this.appraiser.appraise(u);
      } catch (err) {
        logger.warn('spine_director_failed', { agentId, error: (err as Error).message });
      }
      const directorEmotionDelta = diffEmotion(u.char_id, emotionBeforeDirector, this._snapshotEmotion(u.char_id));
      if (directorEmotionDelta) emotionAppraisals.push(directorEmotionDelta);
    }
    this.appraiser.applyContagion(currentNodeId);

    // ── Wave 32: bridge action → StoryOp[] → StoryCommit (canon ledger) ────────
    // Snapshot the narrative state BEFORE the commit so the proof kernel can
    // verify preconditions against the pre-turn world.
    // Wave 43: use running _narrativeState (accumulated ops) so prior facts/
    // clocks/relationships are visible to the proof gate (not just DB beliefs).
    const beforeState: NarrativeState = {
      ...this._narrativeState,
      ...(() => {
        const db = buildNarrativeState(this.stage);
        return {
          characterBeliefs:  { ...this._narrativeState.characterBeliefs,  ...db.characterBeliefs },
          characterEmotions: { ...this._narrativeState.characterEmotions, ...db.characterEmotions },
        };
      })(),
      turn: this.stage.getTurnCount(),
    };
    const card = action.action_type !== 'WAIT'
      ? (this.stage.getEventCard(action_id) ?? null)
      : null;
    const commit = buildTurnCommit({
      entry: actionEntry,
      card,
      primaryUpdate: update,
      extraUpdates: directorUpdates,
      relationshipDeltas,
      emotionAppraisals,
      onTier1Reject: this._onTier1Reject,
      turnIndex,
      beforeState,
      sceneIdx: turnIndex,
      parentId: this._lastCommitId,
    });
    if (commit) {
      this.stage.appendCommit(commit);
      this._lastCommitId = commit.commitId;
      // Wave 43: advance running state so next turn sees this commit's ops.
      this._narrativeState = applyStoryOps(this._narrativeState, commit.ops);
    }

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
      // X1: relationship deltas produced by THREATEN/BETRAY/PROTECT/FORM_ALLIANCE
      // are computed immediately per-action (direct ToM mutation on the
      // TARGET), not via the round-end diffTheoryOfMind batch below — collect
      // them here so they still reach this round's StoryCommit.
      const roundExtraRelationshipDeltas: RelationshipDeltaInput[] = [];

      for (const agentSheet of agentsInRoom) {
        const agent = this.agents.get(agentSheet.char_id);
        if (!agent) continue;

        const currentSheet = this.stage.getAgent(agentSheet.char_id);
        // Skip agents who left the room or are dead
        if (currentSheet?.current_location_id !== location_id) continue;
        if (currentSheet?.is_alive === false) continue;

        logger.debug('agent_turn', { agent: currentSheet.name, location_id });
        let action: import('./types.ts').NarrativeAction;
        try {
          action = await agent.takeTurn();
        } catch (takeTurnErr) {
          logger.warn('agent_take_turn_failed', { agent: currentSheet.name, error: (takeTurnErr as Error).message });
          action = { action_type: 'WAIT', content: '(waits)', target: null };
        }
        onProgress?.({ type: 'agent_action', agentId: agentSheet.char_id, agentName: currentSheet.name, action, turnIndex: this.stage.getTurnCount() });

        // RELOCATE (personality-driven) and FLEE (cascade-driven — see
        // agent/deterministic.ts's tier 1 vs tier 6 split) share the same
        // adjacency-guarded resolution and both end the round early on success
        // (the room's composition just changed). They differ only in framing
        // and in what a blocked attempt degrades to.
        if ((action.action_type === 'RELOCATE' || action.action_type === 'FLEE') && action.target) {
          const targetLoc = this._resolveRelocation(agentSheet.char_id, action.target);
          if (targetLoc) {
            action.content = action.action_type === 'FLEE' ? `→ ${targetLoc.name} (flees)` : `→ ${targetLoc.name}`;
            this.stage.updateAgentLocation(agentSheet.char_id, targetLoc.location_id);
            const action_id = this.stage.recordAction(agentSheet.char_id, action, location_id);
            lastActionId = action_id;
            logger.info('agent_relocated', { agent: currentSheet.name, to: targetLoc.name, fled: action.action_type === 'FLEE' });
            didRelocate = true;
            turnCount++;
            break;
          } else if (action.action_type === 'FLEE') {
            // A blocked flight reads as cornered, not merely as changing plans.
            action.action_type = 'WAIT';
            action.content = action.content || `(there's nowhere to run)`;
            action.target = null;
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
          is_audible: isAudibleActionType(action.action_type),
        } as import('./types.ts').ActionLogEntry;
        if (action.action_type !== 'WAIT') {
          this.spine.processEvent(actionEntry, turnIndex);
        }

        // ── inciting_action beat: first LIE only (one per simulation — multiple lies
        //    each emitting this beat corrupts syuzhetSort's flashback reconstruction) ──
        if (action.action_type === 'LIE' && !incitingActionEmitted) {
          incitingActionEmitted = true;
          const liar = this.stage.getAgent(agentSheet.char_id);
          const witnesses = (this.spine.resolveVisibility(actionEntry,
            this.stage.getAllAgents().map(a => ({ char_id: a.char_id, current_location_id: a.current_location_id })),
          ) ?? []).filter(id => id !== agentSheet.char_id);
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

        // ── X1: SEARCH — the room-wide counterpart of EXAMINE ──
        if (action.action_type === 'SEARCH') {
          const searchUpdate = this._applySearchReveal(agentSheet.char_id, location_id, action_id);
          if (searchUpdate) {
            try {
              this._runSpineForUpdate(searchUpdate, action_id, location_id);
              this.appraiser.appraise(searchUpdate);
            } catch (err) {
              logger.warn('spine_search_failed', { agentId: agentSheet.char_id, error: (err as Error).message });
            }
          }
        }

        // ── X1: HIDE / OBSERVE / LISTEN / REVEAL / THREATEN / BETRAY / PROTECT /
        // FORM_ALLIANCE — see _applyImmediateActionEffects. Deltas are
        // collected per-round (not diffed at round end, since these mutate
        // the TARGET's ToM directly, not the acting agent's own).
        try {
          roundExtraRelationshipDeltas.push(
            ...this._applyImmediateActionEffects(agentSheet.char_id, action, location_id, action_id, turnIndex),
          );
        } catch (err) {
          logger.warn('immediate_action_effect_error', { agentId: agentSheet.char_id, actionType: action.action_type, error: (err as Error).message });
        }

        turnCount++;
        if (turnCount >= maxTurns) break;
      }

      // ── Batch epistemic updates: ONCE per agent per ROUND (not per action) ──
      // This prevents O(agents × actions) Gemini calls (fanout explosion).
      // C4: serialized (not Promise.all) to prevent concurrent SQLite belief writes
      // that would interleave and silently lose updates under WAL mode.
      if (!didRelocate && lastActionId) {
        const recentActions = this.stage.getSensoryFilter(location_id, maxTurns);
        // Snapshot suspicion scores before epistemic updates for persuasion outcome tracking
        const suspicionBefore = new Map<string, number>(
          agentsInRoom.map(a => [a.char_id, a.suspicion_score]),
        );
        // Fix A: snapshot ToM per agent BEFORE the batch — updateEpistemics is
        // the only place ToM mutates, so diffing before/after across this loop
        // captures every agent's relationship shift for the round in one pass.
        const tomSnapshots = new Map<string, Record<string, TheoryOfMind>>(
          agentsInRoom.map(sheet => [sheet.char_id, this._snapshotTom(sheet.char_id)]),
        );
        const epistemicUpdates: import('./types.ts').EpistemicUpdate[] = [];
        for (const sheet of agentsInRoom) {
          const agent = this.agents.get(sheet.char_id);
          if (!agent) continue;
          try {
            epistemicUpdates.push(await agent.updateEpistemics(recentActions));
          } catch (epistemicsErr) {
            logger.warn('agent_epistemics_failed', { agent: sheet.char_id, error: (epistemicsErr as Error).message });
          }
        }
        const roundTurnIndexForDeltas = this.stage.getTurnCount();
        // X1: THREATEN/BETRAY/PROTECT/FORM_ALLIANCE deltas gathered per-action
        // above, ahead of the round-end diff (which only ever sees each
        // agent's OWN ToM, not the direct target-side mutation these four
        // actions make).
        const roundRelationshipDeltas: RelationshipDeltaInput[] = [...roundExtraRelationshipDeltas];
        for (const sheet of agentsInRoom) {
          const before = tomSnapshots.get(sheet.char_id) ?? {};
          roundRelationshipDeltas.push(
            ...diffTheoryOfMind(sheet.char_id, before, this._snapshotTom(sheet.char_id), roundTurnIndexForDeltas),
          );
        }
        const roundEmotionAppraisals: EmotionAppraisalInput[] = [];
        for (const update of epistemicUpdates) {
          const emotionBeforeRound = this._snapshotEmotion(update.char_id);
          try {
            this._runSpineForUpdate(update, lastActionId, location_id);
            this.appraiser.appraise(update);
          } catch (spineErr) {
            logger.warn('epistemic_spine_appraise_error', { location_id, error: (spineErr as Error).message });
          }
          const roundEmotionDelta = diffEmotion(update.char_id, emotionBeforeRound, this._snapshotEmotion(update.char_id));
          if (roundEmotionDelta) roundEmotionAppraisals.push(roundEmotionDelta);
        }
        // Record persuasion outcomes: success when target's suspicion decreased
        const currentTurn = this.stage.getTurnCount();
        for (const agent of agentsInRoom) {
          const log = this.stage.getPersuasionLog(agent.char_id, agentsInRoom.length * 2) ?? [];
          for (const rec of log.filter(r => r.turn === currentTurn && r.success === undefined)) {
            const target = this.stage.getAgent(rec.target_id);
            if (!target) continue;
            const before = suspicionBefore.get(rec.target_id) ?? target.suspicion_score;
            const success = target.suspicion_score < before - 2;
            this.stage.updatePersuasionOutcome(rec.id, success);
          }
        }

        // Wave 32: commit this round's epistemic batch to the canon ledger.
        // We use the last action of the round as the representative entry;
        // all agent epistemic updates in the round are bundled into one commit.
        const lastEntry = this.stage.getActionById(lastActionId);
        if (lastEntry) {
          const roundCard = this.stage.getEventCard(lastActionId) ?? null;
          const beforeStateRoom: NarrativeState = {
            ...this._narrativeState,
            ...(() => {
              const db = buildNarrativeState(this.stage);
              return {
                characterBeliefs:  { ...this._narrativeState.characterBeliefs,  ...db.characterBeliefs },
                characterEmotions: { ...this._narrativeState.characterEmotions, ...db.characterEmotions },
              };
            })(),
            turn: this.stage.getTurnCount(),
          };
          const [primaryUp, ...extraUps] = epistemicUpdates;
          if (primaryUp) {
            const roundCommit = buildTurnCommit({
              entry: lastEntry,
              card: roundCard,
              primaryUpdate: primaryUp,
              extraUpdates: extraUps,
              relationshipDeltas: roundRelationshipDeltas,
              emotionAppraisals: roundEmotionAppraisals,
              onTier1Reject: this._onTier1Reject,
              turnIndex: this.stage.getTurnCount(),
              beforeState: beforeStateRoom,
              sceneIdx: this.stage.getTurnCount(),
              parentId: this._lastCommitId,
            });
            if (roundCommit) {
              this.stage.appendCommit(roundCommit);
              this._lastCommitId = roundCommit.commitId;
              // Wave 43: advance running state so next round sees this commit.
              this._narrativeState = applyStoryOps(this._narrativeState, roundCommit.ops);
            }
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
        if (!lastActionId) {
          logger.warn('climax_no_trigger_action', { location_id });
          break;
        }
        this.spine.createBeatTrace({
          triggerEventId: lastActionId,
          beatType: 'revelation',
          participants: agentsInRoom.map(a => a.char_id),
          causalChain: [lastActionId],
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
      try {
        this._runSpineForUpdate(update, lastActionId, location_id);
        this.appraiser.appraise(update);
      } catch (dirErr) {
        logger.warn('director_spine_appraise_error', { location_id, error: (dirErr as Error).message });
      }
    }
    onProgress?.({ type: 'director_eval', totalTurns: turnCount });

    // ── OCC contagion: emotions diffuse between co-present agents ──
    try {
      this.appraiser.applyContagion(location_id);
      // Suspicion contagion: distressed/fearful agents raise others' suspicion,
      // weighted by distrust. Runs after Director updates to layer on top correctly.
      this.appraiser.applySuspicionContagion(location_id);
    } catch (contagionErr) {
      logger.warn('contagion_error', { location_id, error: (contagionErr as Error).message });
    }

    // Fix C: peek (not drain) so a wrapping runFullScene call — which may run
    // many rooms/rounds after this one and emits its OWN final event — still
    // sees the full accumulated total. Only the top-level route handler
    // actually drains, via consumeDroppedCommits(), once its call resolves.
    const droppedSoFar = this._peekDroppedCommits();
    onProgress?.({
      type: 'simulation_complete', totalTurns: turnCount,
      ...(droppedSoFar ? { droppedCommits: droppedSoFar } : {}),
    });
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
  ): Promise<{ totalTurns: number; roundsRun: number; locationIds: string[] }> {
    let roundsRun = 0;
    // Resolve locations that have ≥1 agent
    let activeLocations = locationIds.filter(lid => {
      const agents = this.stage.getAgentsInLocation(lid);
      return agents.filter(a => a.is_alive !== false).length >= 1;
    });

    for (let round = 0; round < maxRounds; round++) {
      if (activeLocations.length === 0) break;
      roundsRun = round + 1;

      // Sort rooms by dramatic tension: rooms with more agents and more accumulated
      // suspicion run first so pressure cascades naturally between scenes.
      const tensionState = this.stage.getDirectorTensionState();
      const sorted = [...activeLocations].sort((a, b) => {
        const agentsA = this.stage.getAgentsInLocation(a).filter(x => x.is_alive !== false);
        const agentsB = this.stage.getAgentsInLocation(b).filter(x => x.is_alive !== false);
        // Primary key: accumulated suspicion in the room (higher → more urgent)
        const suspA = agentsA.reduce((s, ag) => s + (isFinite(ag.suspicion_score) ? ag.suspicion_score : 0), 0);
        const suspB = agentsB.reduce((s, ag) => s + (isFinite(ag.suspicion_score) ? ag.suspicion_score : 0), 0);
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

    // Fix C: peek (not drain) — see the identical comment on runRoomSimulation's
    // own final event above. This is the outermost event runFullScene emits, so
    // it aggregates drops from every room/round this call ran.
    const droppedSoFar = this._peekDroppedCommits();
    const totalTurns = this.stage.getTurnCount();
    onProgress?.({
      type: 'simulation_complete', totalTurns,
      ...(droppedSoFar ? { droppedCommits: droppedSoFar } : {}),
    });
    return { totalTurns, roundsRun, locationIds };
  }

  // ── X1 — new action-type side effects ───────────────────────────────────────
  // Honest, deterministic mechanics for the ten blueprint additions that have
  // real state to act on (see types.ts's header comment for the five that were
  // excluded and why). Dispatched from both runTurn and runRoomSimulation
  // right after the action is recorded, mirroring the pre-existing EXAMINE
  // special-case's placement and try/catch discipline.

  private static readonly HIDE_SUSPICION_RELIEF = 4;
  private static readonly OBSERVE_EMOTION_THRESHOLD = 20;
  private static readonly REVEAL_CONFIDENCE = 0.85;
  private static readonly LISTEN_CONFIDENCE = 0.6;

  // HIDE: a real, bounded suspicion-management lever (reuses the existing
  // suspicion_score field — the same one deterministic.ts's ACCUSATION/
  // DEFENSE bumps and decision.ts's computeDefenseLevel already read). No
  // "invisible until turn N" flag is introduced — that would need new
  // persisted state this run does not add; HIDE's honest, scoped effect is
  // successfully NOT drawing attention this turn, not literal invisibility.
  private _applyHide(agentId: string): void {
    const sheet = this.stage.getAgent(agentId);
    if (!sheet) return;
    const relieved = Math.max(0, (sheet.suspicion_score ?? 0) - Orchestrator.HIDE_SUSPICION_RELIEF);
    if (relieved !== sheet.suspicion_score) this.stage.updateAgentSuspicion(agentId, relieved);
  }

  // OBSERVE: surfaces a real, already-tracked but not-yet-known signal — the
  // TARGET's current EmotionState — as a witnessed belief for the observer.
  // Only fires when the target's emotion is both non-neutral and significant
  // (mirrors the bridge's EMOTION_SIGNIFICANCE_THRESHOLD-style gating), and
  // is deduplicated against the observer's existing beliefs.
  private _applyObserve(observerId: string, targetId: string, actionId: string, turnIndex: number): void {
    if (observerId === targetId) return;
    const observer = this.stage.getAgent(observerId);
    const target = this.stage.getAgent(targetId);
    if (!observer || !target) return;
    const es = target.emotionState;
    if (!es || es.dominant === 'neutral' || es.intensity < Orchestrator.OBSERVE_EMOTION_THRESHOLD) return;
    const proposition = `${target.name} seems ${es.dominant} — something in their manner gives it away.`;
    const existing = observer.beliefs ?? [];
    if (existing.some(b => b.proposition.toLowerCase() === proposition.toLowerCase())) return;
    const belief: Belief = {
      id: randomUUID(),
      proposition,
      confidence: 0.9,
      source: 'witnessed',
      source_agent_id: targetId,
      source_event_id: actionId,
      acquired_at: turnIndex,
    };
    this.stage.updateAgentBeliefs(observerId, [...existing, belief]);
  }

  // LISTEN: surfaces a real, already-tracked signal — the TARGET's own
  // TheoryOfMind read of a THIRD party — as an inferred belief for the
  // listener (eavesdropping on a private assessment, not a public claim).
  // Picks the target's most emotionally "live" relationship using the SAME
  // trust-deviation ordering deterministic.ts's pickAddressee already uses,
  // so the eavesdropped content is the most narratively significant thing
  // available, not an arbitrary pick.
  private _applyListen(listenerId: string, targetId: string, actionId: string, turnIndex: number): void {
    if (listenerId === targetId) return;
    const listener = this.stage.getAgent(listenerId);
    const target = this.stage.getAgent(targetId);
    if (!listener || !target?.theoryOfMind) return;
    const candidates = Object.values(target.theoryOfMind).filter(t => t.subject_id !== listenerId);
    if (candidates.length === 0) return;
    const about = candidates.slice().sort((a, b) =>
      Math.abs((b.trust_level ?? 0.5) - 0.5) - Math.abs((a.trust_level ?? 0.5) - 0.5),
    )[0];
    const aboutName = this.stage.getAgent(about.subject_id)?.name ?? about.subject_id;
    const proposition = `${target.name} privately believes ${aboutName}'s motive is: ${about.believed_motive}`;
    const existing = listener.beliefs ?? [];
    if (existing.some(b => b.proposition.toLowerCase() === proposition.toLowerCase())) return;
    const belief: Belief = {
      id: randomUUID(),
      proposition,
      confidence: Orchestrator.LISTEN_CONFIDENCE, // inferred by eavesdropping, not directly witnessed
      source: 'inferred',
      source_agent_id: targetId,
      source_event_id: actionId,
      acquired_at: turnIndex,
    };
    this.stage.updateAgentBeliefs(listenerId, [...existing, belief]);
  }

  // SEARCH: the room-wide counterpart of EXAMINE — sweeps every co-present
  // agent (not just one target) through the SAME deterministic
  // CausalSpine.processExamine unexposed-lie check EXAMINE already uses, and
  // — like EXAMINE — returns an EpistemicUpdate-shaped result the caller runs
  // through the normal _runSpineForUpdate/appraiser pipeline. Returns null
  // (no update at all) when nothing was found, exactly like EXAMINE's own
  // `revealedBeliefs.length > 0` gate.
  private _applySearchReveal(searcherId: string, locationId: string, actionId: string): EpistemicUpdate | null {
    const others = this.stage.getAgentsInLocation(locationId).filter(a => a.char_id !== searcherId);
    const revealedBeliefs: Belief[] = [];
    for (const other of others) {
      revealedBeliefs.push(...this.spine.processExamine(searcherId, other.char_id, locationId, actionId));
    }
    if (revealedBeliefs.length === 0) return null;
    return {
      char_id: searcherId,
      new_beliefs: revealedBeliefs,
      contradiction_detected: true,
      contradicted_propositions: revealedBeliefs.map(b => b.proposition),
      source_event_id: actionId,
    };
  }

  // REVEAL: a GUARANTEED, direct epistemic transfer — unlike SPEAK/LIE (whose
  // content only becomes a belief once the listener's own, probabilistic
  // updateEpistemics call interprets it), REVEAL writes straight into the
  // target's belief ledger at a higher confidence (0.85 vs SPEAK/LIE's 0.7
  // "claim" confidence — see action-to-ops.ts's header comment), because it
  // is framed as an intentional, direct confiding act, not overheard chatter.
  private _applyReveal(actorId: string, targetId: string, content: string, actionId: string, turnIndex: number): void {
    if (actorId === targetId || !content.trim()) return;
    const target = this.stage.getAgent(targetId);
    if (!target) return;
    const proposition = content.trim();
    const existing = target.beliefs ?? [];
    if (existing.some(b => b.proposition.toLowerCase() === proposition.toLowerCase())) return;
    const belief: Belief = {
      id: randomUUID(),
      proposition,
      confidence: Orchestrator.REVEAL_CONFIDENCE,
      source: 'told',
      source_agent_id: actorId,
      source_event_id: actionId,
      acquired_at: turnIndex,
    };
    this.stage.updateAgentBeliefs(targetId, [...existing, belief]);
  }

  // THREATEN / BETRAY / PROTECT / FORM_ALLIANCE: direct, guaranteed
  // TheoryOfMind mutation on the TARGET's read of the ACTOR (see
  // RELATIONSHIP_ACTION_DELTA's header comment for the honesty rules this
  // follows), fed through the SAME diffTheoryOfMind() helper the acting
  // agent's own ToM changes already use so the resulting RelationshipDeltaInput[]
  // flows through the identical SHIFT_RELATIONSHIP bridge path (Fix A).
  private _applyDirectRelationshipEffect(
    actorId: string,
    targetId: string,
    actionType: ActionType,
    turnIndex: number,
  ): RelationshipDeltaInput[] {
    const d = RELATIONSHIP_ACTION_DELTA[actionType];
    if (!d || actorId === targetId) return [];
    const target = this.stage.getAgent(targetId);
    const actor = this.stage.getAgent(actorId);
    if (!target || !actor) return [];
    const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
    const before = { ...(target.theoryOfMind ?? {}) };
    const existing = before[actorId];
    const updated: TheoryOfMind = {
      subject_id: actorId,
      believed_motive: existing?.believed_motive ?? actor.public_mask.slice(0, 200),
      believed_knowledge: existing?.believed_knowledge ?? [],
      trust_level: clamp01((existing?.trust_level ?? 0.5) + d.trust),
      affinity: existing?.affinity !== undefined ? clamp01(existing.affinity + d.affinity) : existing?.affinity,
      power_balance: existing?.power_balance,
      debt: existing?.debt !== undefined ? clamp01(existing.debt + d.debt) : existing?.debt,
      shared_history: existing?.shared_history,
    };
    const after = { ...before, [actorId]: updated };
    this.stage.updateTheoryOfMind(targetId, after);
    return diffTheoryOfMind(targetId, before, after, turnIndex);
  }

  // THREATEN / BETRAY: connects the new action to the defense CASCADE (this
  // run's item 3) by adding a real DramaticPressure on the TARGET, exactly
  // like processContradiction's own confrontation_imminent pressure does.
  // deriveCascadeInputs (psychology.ts) reads this pressure's intensity as
  // `suddenness` and its source_char_id as the `socialThreat` signal on the
  // target's VERY NEXT turn — so a threatened/betrayed character's own
  // cascade genuinely reads FREEZE/FIGHT/FAWN (biasing toward HIDE/WAIT per
  // cascadeActionBias) rather than this being cosmetic.
  private _addRelationalPressure(
    targetId: string,
    sourceId: string,
    actionId: string,
    turnIndex: number,
    kind: 'THREATEN' | 'BETRAY',
  ): void {
    const sourceName = this.stage.getAgent(sourceId)?.name ?? sourceId;
    const bias_hint = kind === 'THREATEN'
      ? `${sourceName} just threatened you directly. You feel the danger — you may need to prepare a defense, deflect, or find a way out.`
      : `${sourceName} just betrayed you in front of others. The shock of it is still landing.`;
    try {
      this.stage.addDramaticPressure({
        pressure_id: randomUUID(),
        target_char_id: targetId,
        source_char_id: sourceId,
        trigger_event_id: actionId,
        pressure_type: 'ESCALATE',
        intensity: kind === 'BETRAY' ? 75 : 60,
        bias_hint,
        expires_at_turn: turnIndex + 3,
        applied: false,
      });
    } catch (err) {
      logger.warn('relational_pressure_error', { targetId, sourceId, kind, error: (err as Error).message });
    }
  }

  // Single dispatch point for the seven X1 action types whose entire effect
  // is either a one-shot state write (HIDE/OBSERVE/LISTEN/REVEAL) or a
  // relationship delta (THREATEN/BETRAY/PROTECT/FORM_ALLIANCE). SEARCH is
  // deliberately NOT here — its EpistemicUpdate-shaped result needs the
  // caller's own _runSpineForUpdate/appraiser wiring, so it stays a
  // standalone call at each call site (mirroring EXAMINE's placement).
  private _applyImmediateActionEffects(
    agentId: string,
    action: NarrativeAction,
    locationId: string,
    actionId: string,
    turnIndex: number,
  ): RelationshipDeltaInput[] {
    const deltas: RelationshipDeltaInput[] = [];
    switch (action.action_type) {
      case 'HIDE':
        this._applyHide(agentId);
        break;
      case 'OBSERVE':
        if (action.target) this._applyObserve(agentId, action.target, actionId, turnIndex);
        break;
      case 'LISTEN':
        if (action.target) this._applyListen(agentId, action.target, actionId, turnIndex);
        break;
      case 'REVEAL':
        if (action.target) this._applyReveal(agentId, action.target, action.content, actionId, turnIndex);
        break;
      case 'THREATEN':
        if (action.target) {
          deltas.push(...this._applyDirectRelationshipEffect(agentId, action.target, 'THREATEN', turnIndex));
          this._addRelationalPressure(action.target, agentId, actionId, turnIndex, 'THREATEN');
        }
        break;
      case 'BETRAY':
        if (action.target) {
          deltas.push(...this._applyDirectRelationshipEffect(agentId, action.target, 'BETRAY', turnIndex));
          this._addRelationalPressure(action.target, agentId, actionId, turnIndex, 'BETRAY');
        }
        break;
      case 'PROTECT':
        if (action.target) deltas.push(...this._applyDirectRelationshipEffect(agentId, action.target, 'PROTECT', turnIndex));
        break;
      case 'FORM_ALLIANCE':
        if (action.target) deltas.push(...this._applyDirectRelationshipEffect(agentId, action.target, 'FORM_ALLIANCE', turnIndex));
        break;
      default:
        break; // SPEAK / LIE / EXAMINE / RELOCATE / WAIT / SEARCH / FLEE: handled elsewhere or need no immediate effect here.
    }
    return deltas;
  }

  // ── Spine wiring helper ─────────────────────────────────────────────────────
  // Called after every EpistemicUpdate to create contradiction edges, goal
  // mutations, dramatic pressure, and beat traces.  Pure deterministic; no AI.
  // H4: each spine call is individually try-catched; a single failure does not
  // abort the entire turn — remaining spine operations continue.
  private _runSpineForUpdate(
    update: EpistemicUpdate,
    triggerEventId: string,
    locationId: string,
  ): void {
    if (!update.contradiction_detected) {
      // No conflict — but new beliefs may still corroborate or update existing ones.
      if (update.new_beliefs.length > 0) {
        try {
          this.spine.processBeliefReinforcement(update.char_id, update.new_beliefs, triggerEventId);
        } catch (err) {
          logger.warn('spine_belief_reinforcement_error', { char_id: update.char_id, error: (err as Error).message });
        }
      }
      return;
    }
    if (update.new_beliefs.length === 0) {
      try {
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
      } catch (err) {
        logger.warn('spine_dramatic_pressure_error', { char_id: update.char_id, error: (err as Error).message });
      }
      return;
    }

    let edges: ReturnType<typeof this.spine.processBeliefUpdate> = [];
    try {
      edges = this.spine.processBeliefUpdate(
        update.char_id,
        update.new_beliefs,
        triggerEventId,
        update.contradiction_detected,
        update.contradicted_propositions,
      );
    } catch (err) {
      logger.warn('spine_belief_update_error', { char_id: update.char_id, error: (err as Error).message });
      return;
    }

    if (edges.length === 0) return;

    let mutations: unknown[] = [];
    let pressures: unknown[] = [];
    try {
      ({ mutations, pressures } = this.spine.processContradiction(
        update.char_id,
        edges,
        triggerEventId,
      ));
    } catch (err) {
      logger.warn('spine_contradiction_error', { char_id: update.char_id, error: (err as Error).message });
      return;
    }

    if (mutations.length > 0 || pressures.length > 0) {
      try {
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
      } catch (err) {
        logger.warn('spine_beat_trace_error', { char_id: update.char_id, error: (err as Error).message });
      }
    }
  }
}
