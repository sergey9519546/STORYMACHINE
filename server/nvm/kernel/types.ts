// Event-Sourced Narrative Kernel — Type Definitions
//
// Defines the immutable event log that replaces StoryCommit as the authoritative
// representation of narrative state. Every story beat becomes a cryptographically-
// signed transaction with full provenance tracking.
//
// Design: Event-granular (each StoryOp becomes one event) with dual temporal
// dimensions (story-time for diegetic order, presentation-time for audience
// reveal order, enabling flashbacks).

import type { StoryOp, AtomicFact } from '../ops/StoryOp.ts';

// ── Reality Layers ────────────────────────────────────────────────────────────
// Describes the narrative status of an event relative to the canonical story world.
// All events in single log with metadata field (smartest approach per Agent 1).

export type RealityLayer = 
  | 'diegetic'      // Canon story world events
  | 'dream'         // Character dream/hallucination
  | 'memory'        // Character flashback/recollection
  | 'hypothetical'  // "What if" speculation / alternate timeline
  | 'deceptive';    // Lie told by unreliable narrator

// ── Provenance Origin ─────────────────────────────────────────────────────────
// Tracks authorship for IP and collaboration purposes

export type ProvenanceOrigin =
  | 'user_authored'      // Human writer directly created
  | 'director_proposed'  // Director AI suggested
  | 'screenwriter_generated' // Screenwriter AI generated
  | 'actor_improvised'   // Actor AI contributed
  | 'system_inferred';   // Automatically derived from constraints

// ── Narrative Event ───────────────────────────────────────────────────────────
// Immutable event in the append-only narrative log.
// Each event wraps a single StoryOp and creates a cryptographic chain.

export interface NarrativeEvent {
  // Identity
  eventId: string;          // UUID v4
  eventHash: string;        // SHA-256(content + parentHash) - creates chain
  parentHash: string | null; // null only for genesis event
  
  // Dual Temporal Dimensions (enables flashbacks)
  storyTime: number;        // Diegetic timestamp (when in story world)
  presentationIndex: number; // Audience reveal order (scene/beat sequence)
  
  // Content
  op: StoryOp;              // Single atomic operation
  assertions: AtomicFact[]; // Facts this event creates/updates
  
  // Provenance (causal chain)
  derivedFrom: string[];    // Parent event IDs this depends on
  createdBy: ProvenanceOrigin;
  
  // Reality Layer
  realityLayer: RealityLayer;
  
  // Metadata
  sceneIdx: number;         // Scene grouping (backward compatibility)
  createdAt: number;        // Wall-clock timestamp (milliseconds since epoch)
  
  // Optional context
  metadata?: {
    sourceSpan?: string;    // If from existing screenplay
    confidence?: number;    // 0-1 for extracted/inferred events
    tags?: string[];        // User or system annotations
  };
}

// ── Event Creation Request ────────────────────────────────────────────────────
// Input to EventStore.append() - system computes hash

export type NarrativeEventInput = Omit<NarrativeEvent, 'eventHash' | 'eventId' | 'createdAt'> & {
  eventId?: string;         // Optional - will generate if not provided
};

// ── Merge Strategy ────────────────────────────────────────────────────────────
// Conflict resolution when merging timeline branches

export type MergeStrategy =
  | 'ours'        // Keep main timeline, discard branch conflicts
  | 'theirs'      // Accept branch changes, main takes lower priority
  | 'interactive' // Return conflicts for manual resolution
  | 'time-ordered'; // Merge by storyTime, re-index presentation order

// ── Merge Result ──────────────────────────────────────────────────────────────

export interface MergeResult {
  success: boolean;
  mergedEvents: NarrativeEvent[];
  conflicts?: MergeConflict[];
}

export interface MergeConflict {
  mainEvent: NarrativeEvent;
  branchEvent: NarrativeEvent;
  conflictType: 'temporal' | 'causal' | 'factual';
  resolution?: 'resolved' | 'needs_manual';
}

// ── Timeline Branch ───────────────────────────────────────────────────────────

export interface TimelineBranch {
  branchId: string;
  branchName: string;
  forkedFrom: string;       // Event ID where branch diverged
  createdAt: number;
  events: NarrativeEvent[];
}

// ── Snapshot Options ──────────────────────────────────────────────────────────

export interface SnapshotOptions {
  storyTime?: number;               // Include events up to this story-time
  presentationIndex?: number;       // Include events up to this presentation index
  realityLayers?: RealityLayer[];   // Filter by layers (default: ['diegetic'])
  includeProvenance?: boolean;      // Include derivation chains (default: false)
}
