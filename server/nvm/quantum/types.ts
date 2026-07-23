// Quantum Narrative Field — Type Definitions
//
// Maintains 100-1000 parallel story-states in superposition, filters illegal
// branches through Trinity Gate, tracks setup→payoff entanglement, and collapses
// wavefunction when user commits to a choice.
//
// Core metaphor: Each story decision creates a branching superposition. Most
// branches are illegal (violate causality/continuity). The quantum field tracks
// legal branches with probability weights derived from Story Graph metrics.

import type { NarrativeEvent } from '../kernel/types.ts';
import type { StoryGraph } from '../analyze/story-graph.ts';

// ── Quantum Story State ───────────────────────────────────────────────────────

/**
 * A single story-state in superposition (one possible branch)
 */
export interface QuantumStoryState {
  // Identity
  stateId: string;                    // Unique identifier for this branch
  parentStateId: string | null;       // Parent state (null for initial)
  
  // Event sequence
  events: NarrativeEvent[];           // All events in this branch
  
  // Quantum properties
  probability: number;                // 0-1 likelihood (derived from metrics)
  phase: number;                      // Quantum phase for interference (0-2π)
  
  // Validation status
  isLegal: boolean;                   // Passed Trinity Gate validation
  validationErrors: string[];         // Why this branch is illegal (if any)
  
  // Graph-derived metrics (cached)
  graphMetrics: {
    promisePaymentRatio: number;      // From Story Graph
    forwardEdgeRatio: number;         // Causal coherence
    escalationMonotonicity: number;   // Tension progression
    causalDensity: number;            // Connectedness
  };
  
  // Entanglement tracking
  entangledSetups: Set<string>;       // Setup IDs this state depends on
  entangledPayoffs: Set<string>;      // Payoff IDs this state has resolved
  
  // Metadata
  createdAt: number;                  // Wall-clock timestamp
  depth: number;                      // Distance from root (branch depth)
  tags?: string[];                    // User annotations
}

// ── Quantum Field Configuration ──────────────────────────────────────────────

export interface QuantumFieldConfig {
  // Capacity limits
  maxStates: number;                  // Hard cap on superposition size (default: 1000)
  pruningThreshold: number;           // Min probability to keep (default: 0.01)
  
  // Validation
  enableTrinityGate: boolean;         // Filter illegal branches (default: true)
  
  // Probability calculation
  probabilityWeights: {
    promisePayment: number;           // Weight for closure (default: 0.4)
    forwardCausality: number;         // Weight for coherence (default: 0.25)
    escalation: number;               // Weight for tension (default: 0.2)
    density: number;                  // Weight for connectedness (default: 0.15)
  };
  
  // Performance
  enableParallelValidation: boolean;  // Validate branches concurrently (default: true)
  batchSize: number;                  // Events per validation batch (default: 10)
}

// ── Entanglement Edge ─────────────────────────────────────────────────────────

/**
 * Setup→payoff dependency edge in entanglement graph
 */
export interface EntanglementEdge {
  setupId: string;                    // Setup event/clue ID
  payoffId: string | null;            // Payoff event ID (null if unpaid)
  
  // Temporal properties
  setupSceneIdx: number;              // Scene where setup occurs
  payoffSceneIdx: number | null;      // Scene where payoff occurs (null if unpaid)
  distance: number;                   // Scenes between setup and payoff
  
  // States involved
  statesWithSetup: Set<string>;       // Story-states containing this setup
  statesWithPayoff: Set<string>;      // Story-states that resolve this setup
  
  // Entanglement strength
  strength: number;                   // 0-1, how critical is this dependency
  
  // Validation
  isResolved: boolean;                // Has this setup been paid off?
  violatingStates: Set<string>;       // States that break this entanglement
}

// ── Entanglement Graph ────────────────────────────────────────────────────────

export interface EntanglementGraph {
  edges: Map<string, EntanglementEdge>;  // Keyed by setupId
  
  // Derived metrics
  totalSetups: number;
  resolvedSetups: number;
  unresolvedSetups: number;
  avgDistance: number;                // Mean scenes between setup→payoff
  
  // Violation tracking
  violationCount: number;             // Total states with broken entanglement
}

// ── Wavefunction Collapse ─────────────────────────────────────────────────────

/**
 * Result of collapsing superposition to single state
 */
export interface CollapseResult {
  // Chosen state
  collapsedState: QuantumStoryState;
  
  // Discarded states
  prunedStates: QuantumStoryState[];
  
  // Statistics
  totalStatesBeforeCollapse: number;
  probabilityOfChosen: number;
  
  // Entanglement changes
  entanglementChanges: {
    resolvedSetups: string[];         // Setups resolved by this choice
    introducedSetups: string[];       // New setups created by this choice
    brokenEntanglements: string[];    // Dependencies violated by this choice
  };
}

// ── Quantum Operation ─────────────────────────────────────────────────────────

/**
 * Operations on the quantum field
 */
export type QuantumOperation =
  | { type: 'ADD_STATE'; state: QuantumStoryState }
  | { type: 'PRUNE_STATE'; stateId: string; reason: string }
  | { type: 'UPDATE_PROBABILITY'; stateId: string; newProbability: number }
  | { type: 'COLLAPSE'; stateId: string }
  | { type: 'ENTANGLE'; setupId: string; stateIds: string[] }
  | { type: 'RESOLVE_SETUP'; setupId: string; payoffId: string };

// ── Quantum Field Snapshot ────────────────────────────────────────────────────

/**
 * Point-in-time view of the quantum field (for debugging/visualization)
 */
export interface QuantumFieldSnapshot {
  timestamp: number;
  stateCount: number;
  totalProbabilityMass: number;       // Should sum to ~1.0
  
  // State distribution
  legalStates: number;
  illegalStates: number;
  
  // Probability distribution
  topStates: Array<{                  // Top 10 by probability
    stateId: string;
    probability: number;
    depth: number;
    eventCount: number;
  }>;
  
  // Entanglement status
  entanglement: {
    totalSetups: number;
    resolvedSetups: number;
    avgDistance: number;
    violationCount: number;
  };
  
  // Performance metrics
  performance: {
    validationTimeMs: number;
    pruningTimeMs: number;
    memoryUsageBytes?: number;
  };
}

// ── Validation Result ─────────────────────────────────────────────────────────

/**
 * Trinity Gate validation result for a story state
 */
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  
  // Checked constraints
  checkedRules: {
    causality: boolean;               // Events in valid causal order
    continuity: boolean;              // No contradictory facts
    characterConsistency: boolean;    // Character actions match beliefs
  };
}

export interface ValidationError {
  type: 'causality' | 'continuity' | 'character' | 'temporal' | 'entanglement';
  message: string;
  severity: 'critical' | 'major' | 'minor';
  affectedEvents: string[];           // Event IDs involved
  suggestion?: string;                // How to fix
}

export interface ValidationWarning {
  type: 'weak-causality' | 'potential-plot-hole' | 'suspicious-timing';
  message: string;
  affectedEvents: string[];
  confidence: number;                 // 0-1, how certain we are
}

// ── Export Helpers ────────────────────────────────────────────────────────────

/**
 * Default field configuration (optimized for 100-1000 states)
 */
export const DEFAULT_QUANTUM_CONFIG: QuantumFieldConfig = {
  maxStates: 1000,
  pruningThreshold: 0.01,
  enableTrinityGate: true,
  probabilityWeights: {
    promisePayment: 0.4,
    forwardCausality: 0.25,
    escalation: 0.2,
    density: 0.15,
  },
  enableParallelValidation: true,
  batchSize: 10,
};

/**
 * Performance-optimized config for 100 states
 */
export const FAST_QUANTUM_CONFIG: QuantumFieldConfig = {
  maxStates: 100,
  pruningThreshold: 0.05,
  enableTrinityGate: true,
  probabilityWeights: {
    promisePayment: 0.4,
    forwardCausality: 0.25,
    escalation: 0.2,
    density: 0.15,
  },
  enableParallelValidation: false,
  batchSize: 5,
};
