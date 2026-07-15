// Event-Sourced Narrative Kernel — Event Store
//
// Immutable append-only event log that replaces StoryCommit as the authoritative
// representation of narrative state. Provides cryptographic chain integrity,
// temporal queries, timeline branching, and deterministic state snapshots.
//
// Design principles from Agent 1:
// - Events are op-granular (each StoryOp becomes one event)
// - Cryptographic chain like Git commits
// - Dual temporal dimensions (story-time + presentation-time)
// - Reality layers in metadata (single log, multiple narratives)

import { createHash } from 'node:crypto';
import { randomUUID } from 'node:crypto';
import type {
  NarrativeEvent,
  NarrativeEventInput,
  TimelineBranch,
  MergeStrategy,
  MergeResult,
  SnapshotOptions,
} from './types.ts';
import type { NarrativeState } from '../state/NarrativeState.ts';

// ── Event Store ───────────────────────────────────────────────────────────────

export class EventStore {
  private events: Map<string, NarrativeEvent> = new Map();
  private branches: Map<string, TimelineBranch> = new Map();
  private mainTimelineHead: string | null = null;
  
  constructor() {
    // Initialize with empty state
  }
  
  // ── Core Operations ─────────────────────────────────────────────────────────
  
  /**
   * Append event to immutable log with cryptographic chain
   */
  append(input: NarrativeEventInput): NarrativeEvent {
    const eventId = input.eventId || randomUUID();
    const createdAt = Date.now();
    
    // Compute parent hash (null for genesis)
    const parentHash = this.mainTimelineHead 
      ? this.events.get(this.mainTimelineHead)?.eventHash || null
      : null;
    
    // Compute cryptographic hash
    const eventHash = this.computeHash({
      eventId,
      parentHash,
      op: input.op,
      storyTime: input.storyTime,
      presentationIndex: input.presentationIndex,
      realityLayer: input.realityLayer,
    });
    
    const event: NarrativeEvent = {
      ...input,
      eventId,
      eventHash,
      parentHash,
      createdAt,
    };
    
    // Validate before appending
    this.validateEvent(event);
    
    // Append to log
    this.events.set(eventId, event);
    this.mainTimelineHead = eventId;
    
    return event;
  }
  
  /**
   * Get all events up to specified story-time
   */
  getEventsBeforeStoryTime(t: number, realityLayers: string[] = ['diegetic']): NarrativeEvent[] {
    return Array.from(this.events.values())
      .filter(e => e.storyTime <= t && realityLayers.includes(e.realityLayer))
      .sort((a, b) => a.storyTime - b.storyTime);
  }
  
  /**
   * Get all events up to specified presentation index
   */
  getEventsBeforePresentationIndex(idx: number, realityLayers: string[] = ['diegetic']): NarrativeEvent[] {
    return Array.from(this.events.values())
      .filter(e => e.presentationIndex <= idx && realityLayers.includes(e.realityLayer))
      .sort((a, b) => a.presentationIndex - b.presentationIndex);
  }
  
  /**
   * Get events by reality layer
   */
  getEventsByRealityLayer(layer: string): NarrativeEvent[] {
    return Array.from(this.events.values())
      .filter(e => e.realityLayer === layer)
      .sort((a, b) => a.presentationIndex - b.presentationIndex);
  }
  
  /**
   * Derive NarrativeState snapshot from events
   */
  async snapshot(options: SnapshotOptions = {}): Promise<NarrativeState> {
    const {
      storyTime,
      presentationIndex,
      realityLayers = ['diegetic'],
    } = options;
    
    // Get filtered events
    let relevantEvents = Array.from(this.events.values())
      .filter(e => realityLayers.includes(e.realityLayer));
    
    if (storyTime !== undefined) {
      relevantEvents = relevantEvents.filter(e => e.storyTime <= storyTime);
    }
    
    if (presentationIndex !== undefined) {
      relevantEvents = relevantEvents.filter(e => e.presentationIndex <= presentationIndex);
    }
    
    // Sort by presentation order
    relevantEvents.sort((a, b) => a.presentationIndex - b.presentationIndex);
    
    // Reduce events to state
    return await this.reduceEventsToState(relevantEvents);
  }
  
  // ── Timeline Branching ──────────────────────────────────────────────────────
  
  /**
   * Fork timeline at specified event
   */
  fork(fromEventId: string, branchName: string): string {
    const branchId = `branch_${randomUUID()}`;
    
    const branch: TimelineBranch = {
      branchId,
      branchName,
      forkedFrom: fromEventId,
      createdAt: Date.now(),
      events: [],
    };
    
    this.branches.set(branchId, branch);
    return branchId;
  }
  
  /**
   * Merge branch back into main timeline
   */
  merge(branchId: string, strategy: MergeStrategy = 'ours'): MergeResult {
    const branch = this.branches.get(branchId);
    if (!branch) {
      throw new Error(`Branch ${branchId} not found`);
    }
    
    // Simple strategy for now: append branch events
    const mergedEvents: NarrativeEvent[] = [];
    const conflicts: any[] = [];
    
    for (const event of branch.events) {
      // Check for conflicts (same story-time, different content)
      const existing = this.getEventsBeforeStoryTime(event.storyTime + 1)
        .find(e => Math.abs(e.storyTime - event.storyTime) < 0.001);
      
      if (existing && existing.eventHash !== event.eventHash) {
        conflicts.push({
          mainEvent: existing,
          branchEvent: event,
          conflictType: 'temporal',
        });
        
        if (strategy === 'ours') {
          continue; // Skip branch event
        }
      }
      
      mergedEvents.push(event);
      this.events.set(event.eventId, event);
    }
    
    return {
      success: conflicts.length === 0 || strategy !== 'interactive',
      mergedEvents,
      conflicts: conflicts.length > 0 ? conflicts : undefined,
    };
  }
  
  // ── Validation & Integrity ──────────────────────────────────────────────────
  
  /**
   * Validate cryptographic chain integrity
   */
  validateChain(): boolean {
    const allEvents = Array.from(this.events.values())
      .sort((a, b) => a.createdAt - b.createdAt);
    
    for (const event of allEvents) {
      // Recompute hash
      const expectedHash = this.computeHash({
        eventId: event.eventId,
        parentHash: event.parentHash,
        op: event.op,
        storyTime: event.storyTime,
        presentationIndex: event.presentationIndex,
        realityLayer: event.realityLayer,
      });
      
      if (expectedHash !== event.eventHash) {
        console.error(`Hash mismatch for event ${event.eventId}`);
        return false;
      }
      
      // Verify parent exists (except genesis)
      if (event.parentHash) {
        const parentExists = Array.from(this.events.values())
          .some(e => e.eventHash === event.parentHash);
        if (!parentExists) {
          console.error(`Parent hash ${event.parentHash} not found for event ${event.eventId}`);
          return false;
        }
      }
    }
    
    return true;
  }
  
  /**
   * Get events by provenance chain
   */
  getEventsByProvenance(eventIds: string[]): NarrativeEvent[] {
    const result: NarrativeEvent[] = [];
    const visited = new Set<string>();
    
    const traverse = (id: string) => {
      if (visited.has(id)) return;
      visited.add(id);
      
      const event = this.events.get(id);
      if (!event) return;
      
      result.push(event);
      
      // Traverse derivedFrom chain
      for (const parentId of event.derivedFrom) {
        traverse(parentId);
      }
    };
    
    for (const id of eventIds) {
      traverse(id);
    }
    
    return result;
  }
  
  /**
   * Get all events (for full replay)
   */
  getAllEvents(): NarrativeEvent[] {
    return Array.from(this.events.values())
      .sort((a, b) => a.createdAt - b.createdAt);
  }
  
  /**
   * Get event count
   */
  size(): number {
    return this.events.size;
  }
  
  // ── Private Helpers ─────────────────────────────────────────────────────────
  
  private computeHash(data: {
    eventId: string;
    parentHash: string | null;
    op: any;
    storyTime: number;
    presentationIndex: number;
    realityLayer: string;
  }): string {
    const canonical = JSON.stringify({
      eventId: data.eventId,
      parentHash: data.parentHash,
      op: data.op,
      storyTime: data.storyTime,
      presentationIndex: data.presentationIndex,
      realityLayer: data.realityLayer,
    });
    
    return createHash('sha256').update(canonical).digest('hex');
  }
  
  private validateEvent(event: NarrativeEvent): void {
    if (!event.eventId) {
      throw new Error('Event must have eventId');
    }
    if (!event.op) {
      throw new Error('Event must have op');
    }
    if (typeof event.storyTime !== 'number') {
      throw new Error('Event must have numeric storyTime');
    }
    if (typeof event.presentationIndex !== 'number') {
      throw new Error('Event must have numeric presentationIndex');
    }
  }
  
  private async reduceEventsToState(events: NarrativeEvent[]): Promise<NarrativeState> {
    // Import existing state builder
    const { emptyState } = await import('../state/NarrativeState.ts');
    const state = emptyState();
    
    // Apply each event's op to state
    for (const event of events) {
      await this.applyStoryOpToState(state, event.op);
    }
    
    // Set turn counter from highest turn number in events
    state.turn = events.length > 0 
      ? Math.max(...events.map(e => {
          if (e.op.op === 'ADD_FACT') return e.op.fact.addedAtTurn;
          return 0;
        }))
      : 0;
    
    return state;
  }
  
  /**
   * Apply a single StoryOp to NarrativeState (full 14-operation dispatcher)
   */
  private async applyStoryOpToState(state: NarrativeState, op: any): Promise<void> {
    switch (op.op) {
      case 'ADD_FACT':
        state.objectiveReality.push(op.fact);
        break;
      case 'EXPIRE_FACT':
        state.objectiveReality = state.objectiveReality.filter(f => f.factId !== op.factId);
        break;
      case 'UPDATE_BELIEF':
        if (!state.characterBeliefs[op.charId]) state.characterBeliefs[op.charId] = [];
        state.characterBeliefs[op.charId].push(op.belief);
        break;
      case 'SHIFT_RELATIONSHIP':
        const key = `${op.pair[0]}<->${op.pair[1]}`;
        if (!state.relationships[key]) state.relationships[key] = [];
        state.relationships[key].push(op.delta);
        break;
      case 'APPRAISE_EMOTION':
        state.characterEmotions[op.charId] = op.emotion;
        break;
      case 'SEED_CLUE':
        state.clues.push({ clueId: op.clueId, carrier: op.carrier });
        break;
      case 'PAYOFF_SETUP':
        state.payoffs.push({ setupId: op.setupId, payoffEventId: op.payoffEventId });
        break;
      case 'RAISE_CLOCK':
        if (!state.clocks[op.clockId]) state.clocks[op.clockId] = 0;
        state.clocks[op.clockId] += op.amount;
        break;
      case 'ADVANCE_THEME_ARGUMENT':
        state.themeArgument.push({ claimId: op.claimId, move: op.move });
        break;
      case 'ADVANCE_OBJECT_ARC':
        state.objectArcs[op.objectId] = op.toState;
        break;
      case 'TRIGGER_RULE':
        state.firedRules.push(`${op.mechanismId}:${op.ruleId}`);
        break;
      case 'UPDATE_READER_STATE':
        if (op.delta.suspense !== undefined) {
          state.audienceState.suspense += op.delta.suspense;
        }
        if (op.delta.curiosity !== undefined) {
          state.audienceState.curiosity += op.delta.curiosity;
        }
        if (op.delta.investment !== undefined) {
          state.audienceState.investment += op.delta.investment;
        }
        if (op.delta.knownFact) {
          state.audienceState.knownFacts.push(op.delta.knownFact);
        }
        break;
      case 'RECORD_VISUAL_FACT':
        state.sceneFacts.push({ sceneId: op.sceneId, kind: 'visual', fact: op.fact });
        break;
      case 'RECORD_SONIC_FACT':
        state.sceneFacts.push({ sceneId: op.sceneId, kind: 'sonic', fact: op.fact });
        break;
      default:
        // Unknown op type - log but don't crash
        console.warn(`Unknown StoryOp type: ${(op as any).op}`);
    }
  }
}

// ── Export ────────────────────────────────────────────────────────────────────

export function createEventStore(): EventStore {
  return new EventStore();
}
