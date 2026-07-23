// Quantum Narrative Field — Entanglement Graph
//
// Tracks setup→payoff dependencies across quantum story-states. When a setup
// changes in one branch, all dependent payoffs are auto-validated. Solves the
// "change Act 1, break Act 3" problem by making dependencies explicit and
// automatically propagating validation.
//
// Design: Graph of EntanglementEdges where each edge represents a setup→payoff
// dependency. Each edge tracks which story-states contain the setup/payoff, and
// maintains entanglement strength (how critical is this dependency).

import type {
  EntanglementEdge,
  EntanglementGraph,
  QuantumStoryState,
} from './types.ts';
import type { NarrativeEvent } from '../kernel/types.ts';
import type { StoryGraph } from '../analyze/story-graph.ts';

// ── Entanglement Graph Builder ───────────────────────────────────────────────

export class EntanglementGraphBuilder {
  private edges: Map<string, EntanglementEdge> = new Map();
  
  constructor() {
    // Initialize empty graph
  }
  
  /**
   * Build entanglement graph from a story state
   */
  buildFromState(state: QuantumStoryState): EntanglementGraph {
    this.edges.clear();
    
    // Extract setups and payoffs from events
    const setupEvents = new Map<string, { event: NarrativeEvent; sceneIdx: number }>();
    const payoffEvents = new Map<string, { event: NarrativeEvent; sceneIdx: number }>();
    
    for (const event of state.events) {
      const op = event.op as any;
      
      // SEED_CLUE operation creates a setup
      if (op.op === 'SEED_CLUE') {
        setupEvents.set(op.clueId, { event, sceneIdx: event.sceneIdx });
      }
      
      // PAYOFF_SETUP operation resolves a setup
      if (op.op === 'PAYOFF_SETUP') {
        payoffEvents.set(op.setupId, { event, sceneIdx: event.sceneIdx });
      }
    }
    
    // Create edges for each setup
    for (const [setupId, setupData] of setupEvents) {
      const payoffData = payoffEvents.get(setupId);
      
      const edge: EntanglementEdge = {
        setupId,
        payoffId: payoffData?.event.eventId || null,
        setupSceneIdx: setupData.sceneIdx,
        payoffSceneIdx: payoffData?.sceneIdx || null,
        distance: payoffData ? payoffData.sceneIdx - setupData.sceneIdx : 0,
        statesWithSetup: new Set([state.stateId]),
        statesWithPayoff: payoffData ? new Set([state.stateId]) : new Set(),
        strength: this.calculateEntanglementStrength(setupData.sceneIdx, payoffData?.sceneIdx),
        isResolved: payoffData !== undefined,
        violatingStates: new Set(),
      };
      
      this.edges.set(setupId, edge);
    }
    
    return this.buildGraph();
  }
  
  /**
   * Update entanglement graph with new state
   */
  addState(state: QuantumStoryState): void {
    // Track which setups/payoffs this state contains
    const stateSetups = new Set<string>();
    const statePayoffs = new Set<string>();
    
    for (const event of state.events) {
      const op = event.op as any;
      
      if (op.op === 'SEED_CLUE') {
        stateSetups.add(op.clueId);
      }
      
      if (op.op === 'PAYOFF_SETUP') {
        statePayoffs.add(op.setupId);
      }
    }
    
    // Update edges
    for (const [setupId, edge] of this.edges) {
      if (stateSetups.has(setupId)) {
        edge.statesWithSetup.add(state.stateId);
      }
      
      if (statePayoffs.has(setupId)) {
        edge.statesWithPayoff.add(state.stateId);
      }
      
      // Check for violations: state has payoff without setup
      if (statePayoffs.has(setupId) && !stateSetups.has(setupId)) {
        edge.violatingStates.add(state.stateId);
      }
    }
  }
  
  /**
   * Remove state from entanglement tracking
   */
  removeState(stateId: string): void {
    for (const edge of this.edges.values()) {
      edge.statesWithSetup.delete(stateId);
      edge.statesWithPayoff.delete(stateId);
      edge.violatingStates.delete(stateId);
    }
  }
  
  /**
   * Find all states affected by changing a setup
   */
  findAffectedStates(setupId: string): Set<string> {
    const edge = this.edges.get(setupId);
    if (!edge) return new Set();
    
    // States affected = states with this setup OR states with its payoff
    const affected = new Set<string>();
    for (const stateId of edge.statesWithSetup) affected.add(stateId);
    for (const stateId of edge.statesWithPayoff) affected.add(stateId);
    
    return affected;
  }
  
  /**
   * Check if a state maintains entanglement consistency
   */
  validateState(state: QuantumStoryState): {
    isValid: boolean;
    brokenEntanglements: string[];
  } {
    const broken: string[] = [];
    
    // Check each entanglement edge
    for (const [setupId, edge] of this.edges) {
      // If state has payoff but not setup → broken
      if (edge.statesWithPayoff.has(state.stateId) && !edge.statesWithSetup.has(state.stateId)) {
        broken.push(setupId);
      }
    }
    
    return {
      isValid: broken.length === 0,
      brokenEntanglements: broken,
    };
  }
  
  /**
   * Propagate setup change to dependent payoffs
   */
  propagateSetupChange(setupId: string, newSetupEvent: NarrativeEvent): Set<string> {
    const edge = this.edges.get(setupId);
    if (!edge) return new Set();
    
    // Mark all states with payoffs as needing revalidation
    const needsRevalidation = new Set<string>();
    for (const stateId of edge.statesWithPayoff) {
      needsRevalidation.add(stateId);
    }
    
    return needsRevalidation;
  }
  
  /**
   * Get current entanglement graph
   */
  getGraph(): EntanglementGraph {
    return this.buildGraph();
  }
  
  // ── Private Helpers ───────────────────────────────────────────────────────────
  
  private calculateEntanglementStrength(setupSceneIdx: number, payoffSceneIdx?: number): number {
    // Strength based on:
    // 1. Distance (longer = stronger entanglement)
    // 2. Whether resolved (resolved = stronger)
    
    if (payoffSceneIdx === undefined) {
      return 0.3; // Unresolved setup has weak entanglement
    }
    
    const distance = payoffSceneIdx - setupSceneIdx;
    
    // Normalize distance to 0-1 (assume max 100 scenes)
    const distanceScore = Math.min(distance / 100, 1.0);
    
    // Strength = 0.5 (base for resolved) + 0.5 * distance score
    return 0.5 + 0.5 * distanceScore;
  }
  
  private buildGraph(): EntanglementGraph {
    const resolved = Array.from(this.edges.values()).filter(e => e.isResolved).length;
    const unresolved = this.edges.size - resolved;
    
    // Calculate average distance (only for resolved)
    const distances = Array.from(this.edges.values())
      .filter(e => e.isResolved)
      .map(e => e.distance);
    const avgDistance = distances.length > 0
      ? distances.reduce((a, b) => a + b, 0) / distances.length
      : 0;
    
    // Count total violations
    let violationCount = 0;
    for (const edge of this.edges.values()) {
      violationCount += edge.violatingStates.size;
    }
    
    return {
      edges: new Map(this.edges),
      totalSetups: this.edges.size,
      resolvedSetups: resolved,
      unresolvedSetups: unresolved,
      avgDistance,
      violationCount,
    };
  }
}

// ── Entanglement Analyzer ─────────────────────────────────────────────────────

/**
 * Analyzes entanglement patterns across multiple story-states
 */
export class EntanglementAnalyzer {
  /**
   * Compare entanglement between two states
   */
  static compareStates(
    state1: QuantumStoryState,
    state2: QuantumStoryState
  ): {
    sharedSetups: string[];
    uniqueToState1: string[];
    uniqueToState2: string[];
    divergencePoint: number; // Scene index where they diverge
  } {
    const setups1 = state1.entangledSetups;
    const setups2 = state2.entangledSetups;
    
    const shared: string[] = [];
    const unique1: string[] = [];
    const unique2: string[] = [];
    
    for (const setup of setups1) {
      if (setups2.has(setup)) {
        shared.push(setup);
      } else {
        unique1.push(setup);
      }
    }
    
    for (const setup of setups2) {
      if (!setups1.has(setup)) {
        unique2.push(setup);
      }
    }
    
    // Find divergence point (first event that differs)
    let divergencePoint = 0;
    const minLength = Math.min(state1.events.length, state2.events.length);
    for (let i = 0; i < minLength; i++) {
      if (state1.events[i].eventId !== state2.events[i].eventId) {
        divergencePoint = state1.events[i].sceneIdx;
        break;
      }
    }
    
    return { sharedSetups: shared, uniqueToState1: unique1, uniqueToState2: unique2, divergencePoint };
  }
  
  /**
   * Find states that share significant entanglement
   */
  static findEntangledStates(
    states: QuantumStoryState[],
    minSharedSetups: number = 3
  ): Array<{ state1: string; state2: string; sharedSetups: number }> {
    const pairs: Array<{ state1: string; state2: string; sharedSetups: number }> = [];
    
    for (let i = 0; i < states.length; i++) {
      for (let j = i + 1; j < states.length; j++) {
        const comparison = this.compareStates(states[i], states[j]);
        
        if (comparison.sharedSetups.length >= minSharedSetups) {
          pairs.push({
            state1: states[i].stateId,
            state2: states[j].stateId,
            sharedSetups: comparison.sharedSetups.length,
          });
        }
      }
    }
    
    return pairs.sort((a, b) => b.sharedSetups - a.sharedSetups);
  }
  
  /**
   * Detect entanglement violations across all states
   */
  static detectViolations(
    states: QuantumStoryState[],
    graph: EntanglementGraph
  ): Map<string, string[]> {
    const violations = new Map<string, string[]>();
    
    for (const state of states) {
      const stateViolations: string[] = [];
      
      // Check each edge for violations
      for (const [setupId, edge] of graph.edges) {
        if (edge.violatingStates.has(state.stateId)) {
          stateViolations.push(setupId);
        }
      }
      
      if (stateViolations.length > 0) {
        violations.set(state.stateId, stateViolations);
      }
    }
    
    return violations;
  }
  
  /**
   * Calculate entanglement density (how interconnected is the story)
   */
  static calculateDensity(graph: EntanglementGraph, stateCount: number): number {
    if (stateCount === 0) return 0;
    
    // Density = (total entanglement edges) / (possible state pairs)
    const totalEdges = graph.totalSetups;
    const possiblePairs = (stateCount * (stateCount - 1)) / 2;
    
    return possiblePairs > 0 ? Math.min(totalEdges / possiblePairs, 1.0) : 0;
  }
  
  /**
   * Find critical setups (affect many states)
   */
  static findCriticalSetups(
    graph: EntanglementGraph,
    minAffectedStates: number = 5
  ): Array<{ setupId: string; affectedStates: number; strength: number }> {
    const critical: Array<{ setupId: string; affectedStates: number; strength: number }> = [];
    
    for (const [setupId, edge] of graph.edges) {
      const affected = edge.statesWithSetup.size + edge.statesWithPayoff.size;
      
      if (affected >= minAffectedStates) {
        critical.push({
          setupId,
          affectedStates: affected,
          strength: edge.strength,
        });
      }
    }
    
    return critical.sort((a, b) => b.affectedStates - a.affectedStates);
  }
}

// ── Export Utilities ──────────────────────────────────────────────────────────

/**
 * Create empty entanglement graph
 */
export function createEntanglementGraph(): EntanglementGraph {
  return {
    edges: new Map(),
    totalSetups: 0,
    resolvedSetups: 0,
    unresolvedSetups: 0,
    avgDistance: 0,
    violationCount: 0,
  };
}

/**
 * Merge two entanglement graphs
 */
export function mergeEntanglementGraphs(
  graph1: EntanglementGraph,
  graph2: EntanglementGraph
): EntanglementGraph {
  const merged = new Map(graph1.edges);
  
  // Merge edges from graph2
  for (const [setupId, edge2] of graph2.edges) {
    const edge1 = merged.get(setupId);
    
    if (edge1) {
      // Merge sets
      for (const stateId of edge2.statesWithSetup) edge1.statesWithSetup.add(stateId);
      for (const stateId of edge2.statesWithPayoff) edge1.statesWithPayoff.add(stateId);
      for (const stateId of edge2.violatingStates) edge1.violatingStates.add(stateId);
      
      // Update strength (take max)
      edge1.strength = Math.max(edge1.strength, edge2.strength);
    } else {
      merged.set(setupId, { ...edge2 });
    }
  }
  
  // Recompute metrics
  const builder = new EntanglementGraphBuilder();
  (builder as any).edges = merged;
  return builder.getGraph();
}
