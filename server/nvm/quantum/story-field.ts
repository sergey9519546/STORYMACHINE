// Quantum Narrative Field — Main Story Field
//
// Maintains 100-1000 parallel story-states in superposition with automatic
// probability calculation, Trinity Gate filtering, and entanglement tracking.
// Provides wavefunction collapse for user decisions and auto-validation when
// setups change.
//
// Performance targets:
// - 100 states: <10ms for validation cycle
// - 1000 states: <100ms for validation cycle
//
// Design: In-memory Map/Set structures optimized for fast lookups and updates.
// States pruned continuously based on probability threshold. Entanglement graph
// updated incrementally as states are added/removed.

import { randomUUID } from 'node:crypto';
import type {
  QuantumStoryState,
  QuantumFieldConfig,
  QuantumFieldSnapshot,
  CollapseResult,
  ValidationResult,
  ValidationError,
  ValidationWarning,
} from './types.ts';
import type { NarrativeEvent } from '../kernel/types.ts';
import type { EventStore } from '../kernel/event-store.ts';
import {
  EntanglementGraphBuilder,
  EntanglementAnalyzer,
  createEntanglementGraph,
} from './entanglement.ts';
import { buildStoryGraph, analyzeStoryGraph } from '../analyze/story-graph.ts';
import type { FountainAnalysis } from '../analyze/types.ts';
import { emptyState, type NarrativeState } from '../state/NarrativeState.ts';

// ── Quantum Narrative Field ──────────────────────────────────────────────────

export class QuantumNarrativeField {
  // Core state storage
  private states: Map<string, QuantumStoryState> = new Map();
  private config: QuantumFieldConfig;
  
  // Entanglement tracking
  private entanglementBuilder: EntanglementGraphBuilder;
  
  // Trinity Gate validator (stubbed for now)
  private narrativeState: NarrativeState;
  
  // Performance tracking
  private lastValidationTimeMs: number = 0;
  private lastPruningTimeMs: number = 0;
  
  constructor(config: Partial<QuantumFieldConfig> = {}) {
    this.config = { ...this.getDefaultConfig(), ...config };
    this.entanglementBuilder = new EntanglementGraphBuilder();
    this.narrativeState = emptyState();
  }
  
  // ── State Management ──────────────────────────────────────────────────────────
  
  /**
   * Initialize field with root state from event store
   */
  async initialize(eventStore: EventStore): Promise<QuantumStoryState> {
    const events = eventStore.getAllEvents();
    
    const rootState = await this.createState(events, null);
    this.states.set(rootState.stateId, rootState);
    
    // Build initial entanglement graph
    this.entanglementBuilder.buildFromState(rootState);
    
    return rootState;
  }
  
  /**
   * Add new story-state to superposition
   */
  async addState(events: NarrativeEvent[], parentStateId: string | null): Promise<QuantumStoryState> {
    // Check capacity
    if (this.states.size >= this.config.maxStates) {
      await this.prune();
    }
    
    const state = await this.createState(events, parentStateId);
    
    // Validate through Trinity Gate
    if (this.config.enableTrinityGate) {
      const validationStart = Date.now();
      const validation = await this.trinityGate.validate(state);
      this.lastValidationTimeMs = Date.now() - validationStart;
      
      state.isLegal = validation.isValid;
      state.validationErrors = validation.errors.map(e => e.message);
    }
    
    // Store state
    this.states.set(state.stateId, state);
    
    // Update entanglement graph
    this.entanglementBuilder.addState(state);
    
    // Normalize probabilities
    this.normalizeProbabilities();
    
    return state;
  }
  
  /**
   * Branch from existing state with new events
   */
  async branch(fromStateId: string, newEvents: NarrativeEvent[]): Promise<QuantumStoryState> {
    const parentState = this.states.get(fromStateId);
    if (!parentState) {
      throw new Error(`State ${fromStateId} not found`);
    }
    
    // Combine parent events with new events
    const combinedEvents = [...parentState.events, ...newEvents];
    
    return this.addState(combinedEvents, fromStateId);
  }
  
  /**
   * Collapse wavefunction to single state (user decision)
   */
  collapse(stateId: string): CollapseResult {
    const chosen = this.states.get(stateId);
    if (!chosen) {
      throw new Error(`State ${stateId} not found in superposition`);
    }
    
    const totalBefore = this.states.size;
    const probability = chosen.probability;
    
    // Collect states to prune
    const pruned: QuantumStoryState[] = [];
    for (const [id, state] of this.states) {
      if (id !== stateId) {
        pruned.push(state);
        this.entanglementBuilder.removeState(id);
      }
    }
    
    // Clear all except chosen
    this.states.clear();
    this.states.set(stateId, { ...chosen, probability: 1.0 });
    
    // Analyze entanglement changes
    const graph = this.entanglementBuilder.getGraph();
    const resolvedSetups: string[] = [];
    const introducedSetups: string[] = [];
    const brokenEntanglements: string[] = [];
    
    for (const [setupId, edge] of graph.edges) {
      if (edge.isResolved && edge.statesWithPayoff.has(stateId)) {
        resolvedSetups.push(setupId);
      }
      if (edge.statesWithSetup.has(stateId) && !edge.isResolved) {
        introducedSetups.push(setupId);
      }
      if (edge.violatingStates.has(stateId)) {
        brokenEntanglements.push(setupId);
      }
    }
    
    return {
      collapsedState: chosen,
      prunedStates: pruned,
      totalStatesBeforeCollapse: totalBefore,
      probabilityOfChosen: probability,
      entanglementChanges: {
        resolvedSetups,
        introducedSetups,
        brokenEntanglements,
      },
    };
  }
  
  /**
   * Propagate setup change to all affected states
   */
  async propagateSetupChange(setupId: string, newSetupEvent: NarrativeEvent): Promise<Set<string>> {
    const affectedStateIds = this.entanglementBuilder.findAffectedStates(setupId);
    const revalidated = new Set<string>();
    
    const validationStart = Date.now();
    
    // Revalidate all affected states
    for (const stateId of affectedStateIds) {
      const state = this.states.get(stateId);
      if (!state) continue;
      
      // Update event in state
      const updatedEvents = state.events.map(e =>
        e.eventId === newSetupEvent.eventId ? newSetupEvent : e
      );
      
      // Revalidate
      const validation = await this.trinityGate.validate({ ...state, events: updatedEvents });
      state.isLegal = validation.isValid;
      state.validationErrors = validation.errors.map(e => e.message);
      
      revalidated.add(stateId);
    }
    
    this.lastValidationTimeMs = Date.now() - validationStart;
    
    // Propagate through entanglement graph
    this.entanglementBuilder.propagateSetupChange(setupId, newSetupEvent);
    
    return revalidated;
  }
  
  // ── Query Interface ───────────────────────────────────────────────────────────
  
  /**
   * Get all states in superposition
   */
  getAllStates(): QuantumStoryState[] {
    return Array.from(this.states.values());
  }
  
  /**
   * Get specific state by ID
   */
  getState(stateId: string): QuantumStoryState | undefined {
    return this.states.get(stateId);
  }
  
  /**
   * Get top N states by probability
   */
  getTopStates(n: number = 10): QuantumStoryState[] {
    return Array.from(this.states.values())
      .sort((a, b) => b.probability - a.probability)
      .slice(0, n);
  }
  
  /**
   * Get legal states only
   */
  getLegalStates(): QuantumStoryState[] {
    return Array.from(this.states.values()).filter(s => s.isLegal);
  }
  
  /**
   * Get entanglement graph
   */
  getEntanglementGraph() {
    return this.entanglementBuilder.getGraph();
  }
  
  /**
   * Get field snapshot (for debugging/visualization)
   */
  getSnapshot(): QuantumFieldSnapshot {
    const states = Array.from(this.states.values());
    const legalStates = states.filter(s => s.isLegal).length;
    const illegalStates = states.length - legalStates;
    
    const totalProbability = states.reduce((sum, s) => sum + s.probability, 0);
    
    const topStates = this.getTopStates(10).map(s => ({
      stateId: s.stateId,
      probability: s.probability,
      depth: s.depth,
      eventCount: s.events.length,
    }));
    
    const graph = this.entanglementBuilder.getGraph();
    
    return {
      timestamp: Date.now(),
      stateCount: this.states.size,
      totalProbabilityMass: totalProbability,
      legalStates,
      illegalStates,
      topStates,
      entanglement: {
        totalSetups: graph.totalSetups,
        resolvedSetups: graph.resolvedSetups,
        avgDistance: graph.avgDistance,
        violationCount: graph.violationCount,
      },
      performance: {
        validationTimeMs: this.lastValidationTimeMs,
        pruningTimeMs: this.lastPruningTimeMs,
      },
    };
  }
  
  // ── Maintenance ───────────────────────────────────────────────────────────────
  
  /**
   * Prune low-probability states
   */
  async prune(): Promise<number> {
    const pruneStart = Date.now();
    let prunedCount = 0;
    
    const statesToRemove: string[] = [];
    
    // Find states below threshold
    for (const [stateId, state] of this.states) {
      if (state.probability < this.config.pruningThreshold) {
        statesToRemove.push(stateId);
      }
    }
    
    // If still over capacity, prune lowest probability states
    if (this.states.size - statesToRemove.length > this.config.maxStates) {
      const sorted = Array.from(this.states.values())
        .filter(s => !statesToRemove.includes(s.stateId))
        .sort((a, b) => a.probability - b.probability);
      
      const excess = this.states.size - statesToRemove.length - this.config.maxStates;
      for (let i = 0; i < excess; i++) {
        statesToRemove.push(sorted[i].stateId);
      }
    }
    
    // Remove states
    for (const stateId of statesToRemove) {
      this.states.delete(stateId);
      this.entanglementBuilder.removeState(stateId);
      prunedCount++;
    }
    
    // Renormalize probabilities
    this.normalizeProbabilities();
    
    this.lastPruningTimeMs = Date.now() - pruneStart;
    return prunedCount;
  }
  
  /**
   * Clear all states
   */
  clear(): void {
    this.states.clear();
    this.entanglementBuilder = new EntanglementGraphBuilder();
  }
  
  /**
   * Get field size
   */
  size(): number {
    return this.states.size;
  }
  
  // ── Private Helpers ───────────────────────────────────────────────────────────
  
  private async createState(
    events: NarrativeEvent[],
    parentStateId: string | null
  ): Promise<QuantumStoryState> {
    const stateId = randomUUID();
    
    // Calculate depth
    const depth = parentStateId
      ? (this.states.get(parentStateId)?.depth || 0) + 1
      : 0;
    
    // Build Story Graph to compute metrics
    const graphMetrics = await this.computeGraphMetrics(events);
    
    // Calculate probability from metrics
    const probability = this.calculateProbability(graphMetrics);
    
    // Extract entangled setups/payoffs
    const entangledSetups = new Set<string>();
    const entangledPayoffs = new Set<string>();
    
    for (const event of events) {
      const op = event.op as any;
      if (op.op === 'SEED_CLUE') entangledSetups.add(op.clueId);
      if (op.op === 'PAYOFF_SETUP') entangledPayoffs.add(op.setupId);
    }
    
    return {
      stateId,
      parentStateId,
      events,
      probability,
      phase: Math.random() * 2 * Math.PI, // Random initial phase
      isLegal: true, // Will be validated if Trinity Gate enabled
      validationErrors: [],
      graphMetrics,
      entangledSetups,
      entangledPayoffs,
      createdAt: Date.now(),
      depth,
    };
  }
  
  private async computeGraphMetrics(events: NarrativeEvent[]): Promise<any> {
    // Convert events to minimal FountainAnalysis for Story Graph
    // This is a simplified version - production would need full conversion
    const records = events.map(e => ({
      slug: `SCENE_${e.sceneIdx}`,
      purpose: 'advance' as const,
      seededClueIds: [],
      payoffSetupIds: [],
      relationshipShifts: [],
      suspenseDelta: 0,
    }));
    
    // Extract seeded clues and payoffs
    for (const event of events) {
      const op = event.op as any;
      const record = records[event.sceneIdx];
      if (!record) continue;
      
      if (op.op === 'SEED_CLUE') {
        record.seededClueIds.push(op.clueId);
      }
      if (op.op === 'PAYOFF_SETUP') {
        record.payoffSetupIds.push(op.setupId);
      }
    }
    
    const analysis: FountainAnalysis = {
      records,
      sceneCount: Math.max(...events.map(e => e.sceneIdx), 0) + 1,
      totalLines: events.length,
      wordCount: events.length * 10, // Rough estimate
      pages: events.length / 10,
    } as any;
    
    const storyGraph = buildStoryGraph(analysis);
    
    return {
      promisePaymentRatio: storyGraph.promisePaymentRatio,
      forwardEdgeRatio: storyGraph.forwardEdgeRatio,
      escalationMonotonicity: storyGraph.escalationMonotonicity,
      causalDensity: storyGraph.causalDensity,
    };
  }
  
  private calculateProbability(metrics: any): number {
    const w = this.config.probabilityWeights;
    
    // Weighted sum of metrics
    const score =
      metrics.promisePaymentRatio * w.promisePayment +
      metrics.forwardEdgeRatio * w.forwardCausality +
      metrics.escalationMonotonicity * w.escalation +
      Math.min(metrics.causalDensity / 2, 1.0) * w.density; // Normalize density
    
    // Clamp to [0, 1]
    return Math.max(0, Math.min(1, score));
  }
  
  private normalizeProbabilities(): void {
    const total = Array.from(this.states.values()).reduce(
      (sum, s) => sum + s.probability,
      0
    );
    
    if (total > 0) {
      for (const state of this.states.values()) {
        state.probability = state.probability / total;
      }
    }
  }
  
  private getDefaultConfig(): QuantumFieldConfig {
    return {
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
  }
}

// ── Trinity Gate Validator (Stub) ────────────────────────────────────────────

/**
 * Validates story-states for causality, continuity, and character consistency.
 * This is a stub implementation - full Trinity Gate will be implemented later.
 */
class TrinityGateValidator {
  async validate(state: QuantumStoryState): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    
    // Basic validation: check for temporal consistency
    let prevStoryTime = -Infinity;
    const eventsByStoryTime: NarrativeEvent[] = [...state.events].sort(
      (a, b) => a.storyTime - b.storyTime
    );
    
    for (const event of eventsByStoryTime) {
      if (event.storyTime < prevStoryTime) {
        errors.push({
          type: 'temporal',
          message: `Event ${event.eventId} occurs before previous event in story-time`,
          severity: 'major',
          affectedEvents: [event.eventId],
        });
      }
      prevStoryTime = event.storyTime;
    }
    
    // Check entanglement consistency
    const validation = this.validateEntanglement(state);
    if (!validation.isValid) {
      for (const setupId of validation.brokenEntanglements) {
        errors.push({
          type: 'entanglement',
          message: `Payoff for "${setupId}" occurs without prior setup`,
          severity: 'critical',
          affectedEvents: [],
          suggestion: 'Ensure setup event precedes payoff in story-time',
        });
      }
    }
    
    return {
      isValid: errors.filter(e => e.severity === 'critical').length === 0,
      errors,
      warnings,
      checkedRules: {
        causality: true,
        continuity: false, // Not implemented yet
        characterConsistency: false, // Not implemented yet
      },
    };
  }
  
  private validateEntanglement(state: QuantumStoryState): {
    isValid: boolean;
    brokenEntanglements: string[];
  } {
    const setupsSeen = new Set<string>();
    const broken: string[] = [];
    
    for (const event of state.events) {
      const op = event.op as any;
      
      if (op.op === 'SEED_CLUE') {
        setupsSeen.add(op.clueId);
      }
      
      if (op.op === 'PAYOFF_SETUP') {
        if (!setupsSeen.has(op.setupId)) {
          broken.push(op.setupId);
        }
      }
    }
    
    return {
      isValid: broken.length === 0,
      brokenEntanglements: broken,
    };
  }
}

// ── Export Factory ───────────────────────────────────────────────────────────

/**
 * Create new Quantum Narrative Field
 */
export function createQuantumField(config?: Partial<QuantumFieldConfig>): QuantumNarrativeField {
  return new QuantumNarrativeField(config);
}
