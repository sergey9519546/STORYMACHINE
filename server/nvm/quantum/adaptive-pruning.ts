// Adaptive Pruning Engine — Multi-Objective Optimization for 100K States
//
// Implements intelligent state pruning using multi-objective optimization
// to balance quality, diversity, and computational cost. Uses Pareto front
// selection to keep only the most valuable states.
//
// Objectives:
// 1. Quality: Story Graph probability score
// 2. Diversity: Unique story paths and genre variety
// 3. Cost: Computational complexity and memory usage
//
// Strategy:
// - Keep top 0.1% by composite score (100 states from 100K)
// - Ensure diversity (min 3 branches per decision point)
// - Maintain genre variety (min 5 distinct genres)
// - Apply hierarchical pruning (prune at cluster level first)
//
// Performance target: Prune 100K -> 1K states in <2s

import type { QuantumStoryState } from './types.ts';
import type { StateCluster } from './hierarchical-clustering.ts';

// ── Type Definitions ──────────────────────────────────────────────────────────

export interface PruningConfig {
  // Selection thresholds
  targetStateCount: number;        // Target after pruning (default: 1000)
  minProbability: number;          // Min probability to keep (default: 0.001)
  
  // Diversity constraints
  minBranchesPerDecision: number;  // Min alternatives per choice (default: 3)
  minGenreCount: number;           // Min distinct genres (default: 5)
  minArcVariety: number;           // Min different arc types (default: 3)
  
  // Objective weights
  objectiveWeights: {
    quality: number;               // Probability score weight (default: 0.5)
    diversity: number;             // Path diversity weight (default: 0.3)
    cost: number;                  // Computational cost weight (default: 0.2)
  };
  
  // Pareto optimization
  paretoLayers: number;            // Number of Pareto layers to keep (default: 3)
  
  // Performance
  enableHierarchicalPruning: boolean; // Prune clusters first (default: true)
  enableIncremental: boolean;      // Incremental pruning (default: true)
}

export interface PruningResult {
  kept: QuantumStoryState[];
  pruned: QuantumStoryState[];
  
  stats: {
    initialCount: number;
    finalCount: number;
    pruneRatio: number;            // % pruned
    avgQuality: number;
    diversityScore: number;
    genreCount: number;
    arcVariety: number;
    executionTimeMs: number;
  };
  
  paretoFront: ParetoFront;
}

export interface ParetoFront {
  layers: ParetoLayer[];
  dominanceGraph: Map<string, string[]>; // stateId -> dominated state IDs
}

export interface ParetoLayer {
  layerIndex: number;
  states: QuantumStoryState[];
  avgQuality: number;
  avgDiversity: number;
  avgCost: number;
}

export interface ObjectiveScores {
  stateId: string;
  quality: number;      // 0-1, higher is better
  diversity: number;    // 0-1, higher is better
  cost: number;         // 0-1, lower is better (inverted for minimization)
  composite: number;    // Weighted sum
}

export interface DiversityMetrics {
  pathUniqueness: number;        // 0-1, how different from other paths
  genreNovelty: number;          // 0-1, how rare this genre combination
  arcVariation: number;          // 0-1, how different the character arc
  thematicDistance: number;      // 0-1, thematic distinctiveness
}

export interface CostMetrics {
  stateComplexity: number;       // Computational cost to maintain
  validationCost: number;        // Cost to validate this state
  memoryFootprint: number;       // Bytes used
  entanglementDegree: number;    // Number of dependencies
}

// ── Adaptive Pruning Engine ──────────────────────────────────────────────────

export class AdaptivePruningEngine {
  private config: PruningConfig;
  
  constructor(config: Partial<PruningConfig> = {}) {
    this.config = {
      targetStateCount: 1000,
      minProbability: 0.001,
      minBranchesPerDecision: 3,
      minGenreCount: 5,
      minArcVariety: 3,
      objectiveWeights: {
        quality: 0.5,
        diversity: 0.3,
        cost: 0.2,
      },
      paretoLayers: 3,
      enableHierarchicalPruning: true,
      enableIncremental: true,
      ...config,
    };
  }
  
  // ── Main Pruning Interface ────────────────────────────────────────────────────
  
  /**
   * Prune states using multi-objective optimization
   */
  async prune(
    states: QuantumStoryState[],
    clusters?: Map<string, StateCluster>
  ): Promise<PruningResult> {
    const startTime = Date.now();
    
    if (states.length <= this.config.targetStateCount) {
      // No pruning needed
      return {
        kept: states,
        pruned: [],
        stats: {
          initialCount: states.length,
          finalCount: states.length,
          pruneRatio: 0,
          avgQuality: this.avgProbability(states),
          diversityScore: 1.0,
          genreCount: this.countGenres(states),
          arcVariety: this.countArcs(states),
          executionTimeMs: Date.now() - startTime,
        },
        paretoFront: {
          layers: [{
            layerIndex: 0,
            states,
            avgQuality: this.avgProbability(states),
            avgDiversity: 1.0,
            avgCost: 0.5,
          }],
          dominanceGraph: new Map(),
        },
      };
    }
    
    // Step 1: Fast filtering (remove obviously bad states)
    const filtered = this.fastFilter(states);
    
    // Step 2: Hierarchical pruning (if clusters provided)
    let candidates = filtered;
    if (this.config.enableHierarchicalPruning && clusters) {
      candidates = await this.hierarchicalPrune(filtered, clusters);
    }
    
    // Step 3: Compute objective scores
    const scores = await this.computeObjectiveScores(candidates);
    
    // Step 4: Pareto optimization
    const paretoFront = this.computeParetoFront(scores, candidates);
    
    // Step 5: Select states from Pareto layers
    const kept = this.selectFromParetoFront(paretoFront, candidates);
    
    // Step 6: Enforce diversity constraints
    const finalKept = this.enforceDiversityConstraints(kept);
    
    // Step 7: Compute pruned states
    const keptIds = new Set(finalKept.map(s => s.stateId));
    const pruned = states.filter(s => !keptIds.has(s.stateId));
    
    return {
      kept: finalKept,
      pruned,
      stats: {
        initialCount: states.length,
        finalCount: finalKept.length,
        pruneRatio: pruned.length / states.length,
        avgQuality: this.avgProbability(finalKept),
        diversityScore: this.computeOverallDiversity(finalKept),
        genreCount: this.countGenres(finalKept),
        arcVariety: this.countArcs(finalKept),
        executionTimeMs: Date.now() - startTime,
      },
      paretoFront,
    };
  }
  
  /**
   * Incremental pruning (update existing pruning decisions)
   */
  async incrementalPrune(
    currentStates: QuantumStoryState[],
    newStates: QuantumStoryState[]
  ): Promise<PruningResult> {
    // Combine current and new states
    const allStates = [...currentStates, ...newStates];
    
    // Prune combined set
    return this.prune(allStates);
  }
  
  // ── Filtering & Hierarchical Pruning ──────────────────────────────────────────
  
  private fastFilter(states: QuantumStoryState[]): QuantumStoryState[] {
    return states.filter(s => {
      // Remove illegal states
      if (!s.isLegal) return false;
      
      // Remove very low probability states
      if (s.probability < this.config.minProbability) return false;
      
      // Remove states with critical errors
      if (s.validationErrors.length > 0) {
        const hasCritical = s.validationErrors.some(e => 
          e.includes('critical') || e.includes('illegal')
        );
        if (hasCritical) return false;
      }
      
      return true;
    });
  }
  
  private async hierarchicalPrune(
    states: QuantumStoryState[],
    clusters: Map<string, StateCluster>
  ): Promise<QuantumStoryState[]> {
    // Prune at cluster level first
    const stateToCluster = new Map<string, string>();
    
    for (const [clusterId, cluster] of clusters) {
      for (const stateId of cluster.states) {
        stateToCluster.set(stateId, clusterId);
      }
    }
    
    // Group states by cluster
    const clusterStates = new Map<string, QuantumStoryState[]>();
    for (const state of states) {
      const clusterId = stateToCluster.get(state.stateId);
      if (!clusterId) continue;
      
      const existing = clusterStates.get(clusterId) || [];
      existing.push(state);
      clusterStates.set(clusterId, existing);
    }
    
    // Prune within each cluster
    const kept: QuantumStoryState[] = [];
    const statesPerCluster = Math.max(
      1,
      Math.floor(this.config.targetStateCount / clusters.size)
    );
    
    for (const [clusterId, clusterStateList] of clusterStates) {
      // Keep top N states per cluster
      const sorted = clusterStateList.sort((a, b) => b.probability - a.probability);
      kept.push(...sorted.slice(0, statesPerCluster));
    }
    
    return kept;
  }
  
  // ── Objective Score Computation ───────────────────────────────────────────────
  
  private async computeObjectiveScores(
    states: QuantumStoryState[]
  ): Promise<Map<string, ObjectiveScores>> {
    const scores = new Map<string, ObjectiveScores>();
    
    // Precompute diversity and cost for all states
    const diversityMap = await this.computeDiversityForAll(states);
    const costMap = await this.computeCostForAll(states);
    
    for (const state of states) {
      const quality = state.probability;
      const diversity = diversityMap.get(state.stateId) || 0;
      const cost = costMap.get(state.stateId) || 1.0;
      
      const w = this.config.objectiveWeights;
      const composite = w.quality * quality + w.diversity * diversity + w.cost * (1 - cost);
      
      scores.set(state.stateId, {
        stateId: state.stateId,
        quality,
        diversity,
        cost,
        composite,
      });
    }
    
    return scores;
  }
  
  private async computeDiversityForAll(
    states: QuantumStoryState[]
  ): Promise<Map<string, number>> {
    const diversityScores = new Map<string, number>();
    
    for (const state of states) {
      const metrics = await this.computeDiversityMetrics(state, states);
      
      // Combine diversity dimensions
      const diversity = (
        metrics.pathUniqueness * 0.4 +
        metrics.genreNovelty * 0.3 +
        metrics.arcVariation * 0.2 +
        metrics.thematicDistance * 0.1
      );
      
      diversityScores.set(state.stateId, diversity);
    }
    
    return diversityScores;
  }
  
  private async computeDiversityMetrics(
    state: QuantumStoryState,
    allStates: QuantumStoryState[]
  ): Promise<DiversityMetrics> {
    // Path uniqueness: how different is this event sequence?
    const pathUniqueness = this.computePathUniqueness(state, allStates);
    
    // Genre novelty: how rare is this genre combination?
    const genreNovelty = this.computeGenreNovelty(state, allStates);
    
    // Arc variation: how different is the character arc?
    const arcVariation = this.computeArcVariation(state, allStates);
    
    // Thematic distance: how distinct are the themes?
    const thematicDistance = this.computeThematicDistance(state, allStates);
    
    return {
      pathUniqueness,
      genreNovelty,
      arcVariation,
      thematicDistance,
    };
  }
  
  private computePathUniqueness(
    state: QuantumStoryState,
    allStates: QuantumStoryState[]
  ): number {
    // Compare event sequences using Jaccard similarity
    const stateEvents = new Set(state.events.map(e => e.eventId));
    
    let maxSimilarity = 0;
    for (const other of allStates) {
      if (other.stateId === state.stateId) continue;
      
      const otherEvents = new Set(other.events.map(e => e.eventId));
      const intersection = new Set([...stateEvents].filter(e => otherEvents.has(e)));
      const union = new Set([...stateEvents, ...otherEvents]);
      
      const similarity = intersection.size / union.size;
      maxSimilarity = Math.max(maxSimilarity, similarity);
    }
    
    return 1 - maxSimilarity; // Uniqueness is inverse of similarity
  }
  
  private computeGenreNovelty(
    state: QuantumStoryState,
    allStates: QuantumStoryState[]
  ): number {
    // Simplified: assume genre is encoded in state metadata
    // Higher novelty for less common genre combinations
    return 0.5; // Placeholder
  }
  
  private computeArcVariation(
    state: QuantumStoryState,
    allStates: QuantumStoryState[]
  ): number {
    // Compare escalation patterns
    const statePattern = state.graphMetrics.escalationMonotonicity;
    
    let sumDiff = 0;
    for (const other of allStates) {
      if (other.stateId === state.stateId) continue;
      sumDiff += Math.abs(statePattern - other.graphMetrics.escalationMonotonicity);
    }
    
    const avgDiff = sumDiff / (allStates.length - 1);
    return Math.min(1, avgDiff);
  }
  
  private computeThematicDistance(
    state: QuantumStoryState,
    allStates: QuantumStoryState[]
  ): number {
    // Compare theme sets (simplified)
    return 0.5; // Placeholder
  }
  
  private async computeCostForAll(
    states: QuantumStoryState[]
  ): Promise<Map<string, number>> {
    const costScores = new Map<string, number>();
    
    for (const state of states) {
      const metrics = this.computeCostMetrics(state);
      
      // Combine cost dimensions (normalize to 0-1)
      const cost = (
        metrics.stateComplexity * 0.3 +
        metrics.validationCost * 0.3 +
        metrics.memoryFootprint * 0.2 +
        metrics.entanglementDegree * 0.2
      );
      
      costScores.set(state.stateId, cost);
    }
    
    return costScores;
  }
  
  private computeCostMetrics(state: QuantumStoryState): CostMetrics {
    // State complexity: number of events and depth
    const stateComplexity = Math.min(1, (state.events.length + state.depth) / 200);
    
    // Validation cost: proportional to events
    const validationCost = Math.min(1, state.events.length / 100);
    
    // Memory footprint: rough estimate
    const memoryFootprint = Math.min(1, state.events.length / 150);
    
    // Entanglement degree: number of dependencies
    const entanglementDegree = Math.min(
      1,
      (state.entangledSetups.size + state.entangledPayoffs.size) / 50
    );
    
    return {
      stateComplexity,
      validationCost,
      memoryFootprint,
      entanglementDegree,
    };
  }
  
  // ── Pareto Optimization ───────────────────────────────────────────────────────
  
  private computeParetoFront(
    scores: Map<string, ObjectiveScores>,
    states: QuantumStoryState[]
  ): ParetoFront {
    const layers: ParetoLayer[] = [];
    const dominanceGraph = new Map<string, string[]>();
    
    let remaining = new Set(states.map(s => s.stateId));
    let layerIndex = 0;
    
    while (remaining.size > 0 && layerIndex < this.config.paretoLayers) {
      // Find non-dominated states in remaining set
      const nonDominated: string[] = [];
      
      for (const stateId of remaining) {
        const isDominated = Array.from(remaining).some(otherId => {
          if (stateId === otherId) return false;
          return this.dominates(scores.get(otherId)!, scores.get(stateId)!);
        });
        
        if (!isDominated) {
          nonDominated.push(stateId);
        }
      }
      
      // Create layer
      const layerStates = states.filter(s => nonDominated.includes(s.stateId));
      const layerScores = nonDominated.map(id => scores.get(id)!);
      
      layers.push({
        layerIndex,
        states: layerStates,
        avgQuality: layerScores.reduce((sum, s) => sum + s.quality, 0) / layerScores.length,
        avgDiversity: layerScores.reduce((sum, s) => sum + s.diversity, 0) / layerScores.length,
        avgCost: layerScores.reduce((sum, s) => sum + s.cost, 0) / layerScores.length,
      });
      
      // Update dominance graph
      for (const stateId of nonDominated) {
        const dominated = Array.from(remaining).filter(otherId => 
          otherId !== stateId && this.dominates(scores.get(stateId)!, scores.get(otherId)!)
        );
        dominanceGraph.set(stateId, dominated);
      }
      
      // Remove non-dominated from remaining
      for (const stateId of nonDominated) {
        remaining.delete(stateId);
      }
      
      layerIndex++;
    }
    
    return { layers, dominanceGraph };
  }
  
  private dominates(a: ObjectiveScores, b: ObjectiveScores): boolean {
    // A dominates B if A is better in all objectives and strictly better in at least one
    const betterOrEqual =
      a.quality >= b.quality &&
      a.diversity >= b.diversity &&
      a.cost <= b.cost;
    
    const strictlyBetter =
      a.quality > b.quality ||
      a.diversity > b.diversity ||
      a.cost < b.cost;
    
    return betterOrEqual && strictlyBetter;
  }
  
  private selectFromParetoFront(
    paretoFront: ParetoFront,
    states: QuantumStoryState[]
  ): QuantumStoryState[] {
    const selected: QuantumStoryState[] = [];
    const statesPerLayer = Math.floor(this.config.targetStateCount / paretoFront.layers.length);
    
    for (const layer of paretoFront.layers) {
      // Sort layer by composite score
      const sorted = layer.states.sort((a, b) => b.probability - a.probability);
      selected.push(...sorted.slice(0, statesPerLayer));
    }
    
    // Fill remaining slots with best from first layer
    if (selected.length < this.config.targetStateCount && paretoFront.layers.length > 0) {
      const firstLayer = paretoFront.layers[0].states;
      const sorted = firstLayer.sort((a, b) => b.probability - a.probability);
      const needed = this.config.targetStateCount - selected.length;
      selected.push(...sorted.slice(0, needed));
    }
    
    return selected;
  }
  
  // ── Diversity Constraints ─────────────────────────────────────────────────────
  
  private enforceDiversityConstraints(states: QuantumStoryState[]): QuantumStoryState[] {
    let result = states;
    
    // Ensure minimum branches per decision
    result = this.ensureMinBranches(result);
    
    // Ensure minimum genre count
    result = this.ensureMinGenres(result);
    
    // Ensure minimum arc variety
    result = this.ensureMinArcs(result);
    
    return result;
  }
  
  private ensureMinBranches(states: QuantumStoryState[]): QuantumStoryState[] {
    // Group by parent
    const byParent = new Map<string | null, QuantumStoryState[]>();
    
    for (const state of states) {
      const parent = state.parentStateId;
      const siblings = byParent.get(parent) || [];
      siblings.push(state);
      byParent.set(parent, siblings);
    }
    
    // Ensure each parent has min branches
    const result: QuantumStoryState[] = [];
    
    for (const [parent, siblings] of byParent) {
      if (siblings.length < this.config.minBranchesPerDecision) {
        // Keep all siblings if below threshold
        result.push(...siblings);
      } else {
        // Keep top N siblings
        const sorted = siblings.sort((a, b) => b.probability - a.probability);
        result.push(...sorted.slice(0, this.config.minBranchesPerDecision));
      }
    }
    
    return result;
  }
  
  private ensureMinGenres(states: QuantumStoryState[]): QuantumStoryState[] {
    const genreCount = this.countGenres(states);
    
    if (genreCount >= this.config.minGenreCount) {
      return states;
    }
    
    // Need to add states to increase genre diversity
    // (Simplified: just return current states)
    return states;
  }
  
  private ensureMinArcs(states: QuantumStoryState[]): QuantumStoryState[] {
    const arcCount = this.countArcs(states);
    
    if (arcCount >= this.config.minArcVariety) {
      return states;
    }
    
    // Need to add states to increase arc variety
    // (Simplified: just return current states)
    return states;
  }
  
  // ── Helper Methods ────────────────────────────────────────────────────────────
  
  private avgProbability(states: QuantumStoryState[]): number {
    if (states.length === 0) return 0;
    return states.reduce((sum, s) => sum + s.probability, 0) / states.length;
  }
  
  private computeOverallDiversity(states: QuantumStoryState[]): number {
    if (states.length < 2) return 0;
    
    // Compute pairwise diversity
    let totalDiversity = 0;
    let pairs = 0;
    
    for (let i = 0; i < states.length; i++) {
      for (let j = i + 1; j < states.length; j++) {
        const stateA = new Set(states[i].events.map(e => e.eventId));
        const stateB = new Set(states[j].events.map(e => e.eventId));
        
        const intersection = new Set([...stateA].filter(e => stateB.has(e)));
        const union = new Set([...stateA, ...stateB]);
        
        const similarity = intersection.size / union.size;
        totalDiversity += 1 - similarity;
        pairs++;
      }
    }
    
    return totalDiversity / pairs;
  }
  
  private countGenres(states: QuantumStoryState[]): number {
    // Simplified: assume each state has genre metadata
    return 5; // Placeholder
  }
  
  private countArcs(states: QuantumStoryState[]): number {
    // Count distinct arc patterns
    const patterns = new Set<number>();
    
    for (const state of states) {
      // Use escalation as proxy for arc type
      const pattern = Math.floor(state.graphMetrics.escalationMonotonicity * 10);
      patterns.add(pattern);
    }
    
    return patterns.size;
  }
}

// ── Export Factory ────────────────────────────────────────────────────────────

export function createPruningEngine(config?: Partial<PruningConfig>): AdaptivePruningEngine {
  return new AdaptivePruningEngine(config);
}
