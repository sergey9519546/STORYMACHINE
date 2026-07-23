// Event-Sourced Kernel — Backward Compatibility Adapters
//
// Bridges between the new event-sourced EventStore and the existing
// StoryCommit-based architecture. Enables gradual migration without
// breaking existing screenplay analysis workflows.
//
// Key insight from Integration Audit: StoryCommit groups ops by scene,
// EventStore stores individual ops. This adapter performs bidirectional
// conversion while preserving semantic equivalence.

import type { NarrativeEvent } from './types.ts';
import type { StoryCommit } from '../state/StoryCommit.ts';
import type { StoryOp } from '../ops/StoryOp.ts';
import type { EventStore } from './event-store.ts';
import type { ScreenplaySceneRecord } from '../screenplay/memory.ts';
import type { FountainAnalysis } from '../analyze/types.ts';

// ── StoryCommit Conversion ────────────────────────────────────────────────────

/**
 * Convert event-granular log to scene-granular commits
 * Groups events by sceneIdx, preserving scene-level semantics
 */
export function eventsToCommits(events: NarrativeEvent[]): StoryCommit[] {
  // Group by sceneIdx
  const sceneMap = new Map<number, NarrativeEvent[]>();
  
  for (const event of events.filter(e => e.realityLayer === 'diegetic')) {
    if (!sceneMap.has(event.sceneIdx)) {
      sceneMap.set(event.sceneIdx, []);
    }
    sceneMap.get(event.sceneIdx)!.push(event);
  }
  
  // Convert to commits (sorted by scene index)
  const commits: StoryCommit[] = [];
  const sortedScenes = Array.from(sceneMap.keys()).sort((a, b) => a - b);
  
  for (let i = 0; i < sortedScenes.length; i++) {
    const sceneIdx = sortedScenes[i];
    const sceneEvents = sceneMap.get(sceneIdx)!;
    
    // Sort events within scene by presentation order
    sceneEvents.sort((a, b) => a.presentationIndex - b.presentationIndex);
    
    const ops = sceneEvents.map(e => e.op);
    
    commits.push({
      commitId: sceneEvents[0].eventId, // Use first event's ID as commit ID
      parentId: i > 0 ? commits[i - 1].commitId : null,
      sceneIdx,
      ops,
      deltaSummary: summarizeOps(ops),
      reverted: false,
      createdAt: Math.min(...sceneEvents.map(e => e.createdAt))
    });
  }
  
  return commits;
}

/**
 * Convert scene-granular commits to event-granular log
 * Explodes each commit's ops array into individual events
 */
export function commitsToEvents(commits: StoryCommit[]): NarrativeEvent[] {
  const events: NarrativeEvent[] = [];
  let presentationIndex = 0;
  
  for (const commit of commits) {
    for (const op of commit.ops) {
      events.push({
        eventId: `${commit.commitId}_op${events.length}`,
        eventHash: '', // Will be computed on append
        parentHash: events.length > 0 ? events[events.length - 1].eventHash : null,
        storyTime: commit.sceneIdx * 100, // Approximate - real story time may differ
        presentationIndex: presentationIndex++,
        op,
        assertions: extractAssertions(op),
        derivedFrom: commit.parentId ? [commit.parentId] : [],
        createdBy: 'user_authored',
        realityLayer: 'diegetic',
        sceneIdx: commit.sceneIdx,
        createdAt: commit.createdAt,
      });
    }
  }
  
  return events;
}

// ── Screenplay Integration ────────────────────────────────────────────────────

/**
 * Build screenplay memory from EventStore
 * Converts to commits first, then uses existing memory builder
 */
export async function buildScreenplayMemoryFromEvents(
  eventStore: EventStore
): Promise<ScreenplaySceneRecord[]> {
  const { buildScreenplayMemory } = await import('../screenplay/memory.ts');
  const commits = eventsToCommits(eventStore.getAllEvents());
  return buildScreenplayMemory(commits);
}

/**
 * Convert EventStore to FountainAnalysis for Story Graph
 */
export async function eventStoreToFountainAnalysis(
  eventStore: EventStore
): Promise<FountainAnalysis> {
  const records = await buildScreenplayMemoryFromEvents(eventStore);
  
  return {
    records,
    sceneCount: records.length,
    characterCount: countUniqueCharacters(records),
    pageCount: estimatePageCount(records),
    // Additional fields can be added as needed
  };
}

// ── Helper Functions ──────────────────────────────────────────────────────────

/**
 * Summarize ops for commit delta summary
 */
function summarizeOps(ops: StoryOp[]): string {
  const opCounts = new Map<string, number>();
  
  for (const op of ops) {
    const count = opCounts.get(op.op) || 0;
    opCounts.set(op.op, count + 1);
  }
  
  const parts: string[] = [];
  for (const [opType, count] of opCounts.entries()) {
    parts.push(`${count} ${opType}`);
  }
  
  return parts.join(', ');
}

/**
 * Extract atomic facts from a StoryOp
 */
function extractAssertions(op: StoryOp): any[] {
  if (op.op === 'ADD_FACT') {
    return [op.fact];
  }
  // Other ops may have implicit assertions
  return [];
}

/**
 * Count unique characters mentioned in scene records
 */
function countUniqueCharacters(records: ScreenplaySceneRecord[]): number {
  const chars = new Set<string>();
  for (const record of records) {
    if (record.characters) {
      record.characters.forEach(c => chars.add(c));
    }
  }
  return chars.size;
}

/**
 * Estimate page count (rough heuristic: 1 page per scene)
 */
function estimatePageCount(records: ScreenplaySceneRecord[]): number {
  return records.length; // Simplified - real calculation would use dialogue/action ratio
}

// ── Convenience Methods for EventStore ────────────────────────────────────────

/**
 * Add convenience methods to EventStore via extension
 * (Can be mixed in or added to EventStore class directly)
 */
export interface EventStoreWithAdapters extends EventStore {
  buildScreenplayMemory(): Promise<ScreenplaySceneRecord[]>;
  toFountainAnalysis(): Promise<FountainAnalysis>;
  getCommits(): StoryCommit[];
}

export function addAdaptersToEventStore(store: EventStore): EventStoreWithAdapters {
  return Object.assign(store, {
    async buildScreenplayMemory() {
      return buildScreenplayMemoryFromEvents(this);
    },
    async toFountainAnalysis() {
      return eventStoreToFountainAnalysis(this);
    },
    getCommits() {
      return eventsToCommits(this.getAllEvents());
    }
  });
}
