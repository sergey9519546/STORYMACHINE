// Story Graph — Wave SG-1: Graph-native structural analysis
//
// Constructs a typed causal-temporal graph from existing scene signals
// (seededClueIds, payoffSetupIds, relationshipShifts) and scores graph-native
// properties (promise-payment ratio, arc coherence, escalation monotonicity,
// forward-edge ratio) to solve the act-swap AUC 0.48 failure and rule-channel
// AUC 0.076 weakness documented in DEEP_AUDIT findings #2 and #9.
//
// DIAGNOSTIC ONLY — adds optional field to ScriptDoctorReport, not yet coupled
// to health score. Follows the proven pattern from emotional-arc.ts: pure
// function, one call site in doctor.ts, backward compatible.
//
// Key insight: All raw signals already exist in ScreenplaySceneRecord. We're
// connecting existing signals into graph-structured analysis, not adding new
// detection. The payoff.ts pass already tracks seededClueIds/payoffSetupIds;
// we layer promise-level semantics on top.

import type { FountainAnalysis } from './types.ts';
import type { ScreenplaySceneRecord, ScenePurpose } from '../screenplay/memory.ts';

// ── Type Definitions ──────────────────────────────────────────────────────────

/** Story Graph node types */
export type NodeType = 'scene' | 'promise' | 'character' | 'arc-moment';

export interface StoryGraphNode {
  id: string;
  type: NodeType;
  sceneIdx?: number;  // For scene nodes
  label: string;
  metadata: {
    // Scene nodes
    slug?: string;
    purpose?: ScenePurpose;
    
    // Promise nodes
    promiseType?: 'setup' | 'payoff';
    clueId?: string;
    
    // Character nodes
    characterName?: string;
    
    // Arc-moment nodes (emotional/suspense/curiosity peaks)
    tension?: number;
    valence?: number;
  };
}

export interface StoryGraphEdge {
  source: string;  // node id
  target: string;  // node id
  type: 'causal' | 'promise-link' | 'character-arc' | 'temporal';
  weight: number;  // 0-1 strength
  metadata?: {
    distance?: number;  // scenes between source and target
  };
}

export interface StoryGraph {
  nodes: StoryGraphNode[];
  edges: StoryGraphEdge[];
  
  // Derived metrics
  promisePaymentRatio: number;      // paid promises / total promises
  unpaidPromises: string[];         // clue IDs never resolved
  arcCoherence: number;             // 0-1, measures forward progression (Pearson: suspense vs position)
  escalationMonotonicity: number;   // 0-1, tension rises across acts
  causalDensity: number;            // edges per node
  isolatedScenes: number[];         // scene indices with no edges
  
  // Act-swap discrimination features (KEY for solving AUC 0.48 failure)
  forwardEdgeRatio: number;         // edges pointing forward / total
  setupPayoffDistance: number;      // mean scenes between setup→payoff
  
  scored: boolean;
}

export interface StoryGraphReport {
  graph: StoryGraph;
  
  // User-facing findings
  findings: Array<{
    type: 'unpaid-promise' | 'isolated-scene' | 'backward-arc' | 'flat-tension';
    sceneIdx?: number;
    message: string;
  }>;
  
  // Diagnostic scores (not in health yet)
  graphHealth: number;  // 0-100 composite
}

// ── Graph Construction ────────────────────────────────────────────────────────

export function buildStoryGraph(analysis: FountainAnalysis): StoryGraph {
  const nodes: StoryGraphNode[] = [];
  const edges: StoryGraphEdge[] = [];
  
  // 1. Create scene nodes (one per scene)
  for (const [idx, record] of analysis.records.entries()) {
    nodes.push({
      id: `scene-${idx}`,
      type: 'scene',
      sceneIdx: idx,
      label: record.slug,
      metadata: {
        slug: record.slug,
        purpose: record.purpose,
      },
    });
  }
  
  // 2. Create promise nodes and link to scenes
  const promiseMap = new Map<string, { seedIdx: number; payoffIdx?: number }>();
  
  for (const [idx, record] of analysis.records.entries()) {
    // Track seeded clues
    for (const clueId of record.seededClueIds) {
      if (!promiseMap.has(clueId)) {
        promiseMap.set(clueId, { seedIdx: idx });
        
        nodes.push({
          id: `promise-setup-${clueId}`,
          type: 'promise',
          label: `Setup: ${clueId}`,
          metadata: { promiseType: 'setup', clueId },
        });
        
        // Edge: scene → promise (seeds it)
        edges.push({
          source: `scene-${idx}`,
          target: `promise-setup-${clueId}`,
          type: 'promise-link',
          weight: 1.0,
        });
      }
    }
    
    // Track payoffs
    for (const setupId of record.payoffSetupIds) {
      const promise = promiseMap.get(setupId);
      if (promise) {
        promise.payoffIdx = idx;
        
        nodes.push({
          id: `promise-payoff-${setupId}`,
          type: 'promise',
          label: `Payoff: ${setupId}`,
          metadata: { promiseType: 'payoff', clueId: setupId },
        });
        
        // Edge: promise-setup → promise-payoff (causal link)
        edges.push({
          source: `promise-setup-${setupId}`,
          target: `promise-payoff-${setupId}`,
          type: 'causal',
          weight: 1.0,
          metadata: { distance: idx - promise.seedIdx },
        });
        
        // Edge: promise-payoff → scene (resolves in)
        edges.push({
          source: `promise-payoff-${setupId}`,
          target: `scene-${idx}`,
          type: 'promise-link',
          weight: 1.0,
        });
      }
    }
  }
  
  // 3. Create temporal edges (scene N → scene N+1)
  for (let i = 0; i < analysis.records.length - 1; i++) {
    edges.push({
      source: `scene-${i}`,
      target: `scene-${i + 1}`,
      type: 'temporal',
      weight: 0.5,  // Lower weight than causal
    });
  }
  
  // 4. Create character arc edges (relationship shifts)
  for (const [idx, record] of analysis.records.entries()) {
    if (record.relationshipShifts && record.relationshipShifts.length > 0) {
      for (const shift of record.relationshipShifts) {
        // Find next scene with same relationship pair
        for (let j = idx + 1; j < analysis.records.length; j++) {
          const nextShifts = analysis.records[j].relationshipShifts || [];
          if (nextShifts.some(s => s.pairKey === shift.pairKey)) {
            edges.push({
              source: `scene-${idx}`,
              target: `scene-${j}`,
              type: 'character-arc',
              weight: Math.abs(shift.amount) / 10,  // Normalize to 0-1
            });
            break;  // Only link to immediate next occurrence
          }
        }
      }
    }
  }
  
  return computeGraphMetrics(nodes, edges, promiseMap, analysis);
}

// ── Graph Metrics Computation ─────────────────────────────────────────────────

function computeGraphMetrics(
  nodes: StoryGraphNode[],
  edges: StoryGraphEdge[],
  promiseMap: Map<string, { seedIdx: number; payoffIdx?: number }>,
  analysis: FountainAnalysis
): StoryGraph {
  // Promise-payment ratio
  const totalPromises = promiseMap.size;
  const paidPromises = Array.from(promiseMap.values()).filter(p => p.payoffIdx !== undefined).length;
  const promisePaymentRatio = totalPromises > 0 ? paidPromises / totalPromises : 1.0;
  
  // Unpaid promises
  const unpaidPromises = Array.from(promiseMap.entries())
    .filter(([_, p]) => p.payoffIdx === undefined)
    .map(([clueId, _]) => clueId);
  
  // Forward edge ratio (for act-swap discrimination)
  const causalEdges = edges.filter(e => e.type === 'causal' || e.type === 'character-arc');
  let forwardEdges = 0;
  for (const edge of causalEdges) {
    const sourceIdx = extractSceneIdx(edge.source);
    const targetIdx = extractSceneIdx(edge.target);
    if (sourceIdx !== null && targetIdx !== null && sourceIdx < targetIdx) {
      forwardEdges++;
    }
  }
  const forwardEdgeRatio = causalEdges.length > 0 ? forwardEdges / causalEdges.length : 0.5;
  
  // Setup-payoff distance
  const distances = Array.from(promiseMap.values())
    .filter(p => p.payoffIdx !== undefined)
    .map(p => p.payoffIdx! - p.seedIdx);
  const setupPayoffDistance = distances.length > 0
    ? distances.reduce((a, b) => a + b, 0) / distances.length
    : 0;
  
  // Arc coherence (position-aware tension progression)
  const arcCoherence = computeArcCoherence(analysis.records);
  
  // Escalation monotonicity
  const escalationMonotonicity = computeEscalationMonotonicity(analysis.records);
  
  // Causal density
  const causalDensity = nodes.length > 0 ? edges.length / nodes.length : 0;
  
  // Isolated scenes (no incoming or outgoing causal edges)
  const isolatedScenes: number[] = [];
  for (let i = 0; i < analysis.sceneCount; i++) {
    const sceneId = `scene-${i}`;
    const hasEdge = edges.some(e =>
      (e.source === sceneId || e.target === sceneId) && (e.type === 'causal' || e.type === 'character-arc')
    );
    if (!hasEdge && analysis.sceneCount > 2) {  // Don't flag isolated in very short scripts
      isolatedScenes.push(i);
    }
  }
  
  return {
    nodes,
    edges,
    promisePaymentRatio,
    unpaidPromises,
    arcCoherence,
    escalationMonotonicity,
    causalDensity,
    isolatedScenes,
    forwardEdgeRatio,
    setupPayoffDistance,
    scored: true,
  };
}

function extractSceneIdx(nodeId: string): number | null {
  const match = nodeId.match(/scene-(\d+)/);
  return match ? parseInt(match[1], 10) : null;
}

function computeArcCoherence(records: ScreenplaySceneRecord[]): number {
  // Position-aware: does tension/suspense rise toward the end?
  if (records.length < 2) return 0.5;
  
  const suspenseValues = records.map(r => r.suspenseDelta);
  const positions = records.map((_, i) => i / Math.max(records.length - 1, 1));
  
  // Pearson correlation (borrowed from emotional-arc.ts pattern)
  return pearsonCorrelation(suspenseValues, positions);
}

function computeEscalationMonotonicity(records: ScreenplaySceneRecord[]): number {
  // Check if tension generally increases across acts
  const n = records.length;
  if (n < 3) return 0.5;
  
  const act1End = Math.floor(n * 0.25);
  const act2End = Math.floor(n * 0.75);
  
  // Avoid divide by zero for very short acts
  if (act1End === 0 || act2End === act1End || n === act2End) return 0.5;
  
  const act1Suspense = records.slice(0, act1End).reduce((s, r) => s + r.suspenseDelta, 0) / act1End;
  const act2Suspense = records.slice(act1End, act2End).reduce((s, r) => s + r.suspenseDelta, 0) / (act2End - act1End);
  const act3Suspense = records.slice(act2End).reduce((s, r) => s + r.suspenseDelta, 0) / (n - act2End);
  
  // How many act boundaries show increase?
  let increases = 0;
  if (act2Suspense > act1Suspense) increases++;
  if (act3Suspense > act2Suspense) increases++;
  
  return increases / 2.0;  // 0, 0.5, or 1.0
}

function pearsonCorrelation(a: number[], b: number[]): number {
  const n = a.length;
  if (n < 2) return 0;
  
  const meanA = a.reduce((s, x) => s + x, 0) / n;
  const meanB = b.reduce((s, x) => s + x, 0) / n;
  
  let numerator = 0, denomA = 0, denomB = 0;
  for (let i = 0; i < n; i++) {
    const da = a[i] - meanA;
    const db = b[i] - meanB;
    numerator += da * db;
    denomA += da * da;
    denomB += db * db;
  }
  
  const denominator = Math.sqrt(denomA * denomB);
  return denominator > 0 ? numerator / denominator : 0;
}

// ── Report Generation ─────────────────────────────────────────────────────────

export function analyzeStoryGraph(analysis: FountainAnalysis): StoryGraphReport | undefined {
  if (analysis.sceneCount === 0) return undefined;
  
  const graph = buildStoryGraph(analysis);
  
  // Generate findings
  const findings: StoryGraphReport['findings'] = [];
  
  // Unpaid promises
  for (const clueId of graph.unpaidPromises) {
    const promiseNode = graph.nodes.find(n => n.metadata.clueId === clueId && n.metadata.promiseType === 'setup');
    if (promiseNode) {
      // Find the scene that seeded this promise
      const seedingScene = graph.nodes.find(n => n.type === 'scene' && graph.edges.some(e => e.source === n.id && e.target === promiseNode.id));
      findings.push({
        type: 'unpaid-promise',
        sceneIdx: seedingScene?.sceneIdx,
        message: `Setup "${clueId}" planted but never resolved`,
      });
    }
  }
  
  // Isolated scenes
  for (const idx of graph.isolatedScenes) {
    findings.push({
      type: 'isolated-scene',
      sceneIdx: idx,
      message: `Scene ${idx + 1} has no causal connections to the story`,
    });
  }
  
  // Backward arc (act-swap signal)
  if (graph.forwardEdgeRatio < 0.6) {
    findings.push({
      type: 'backward-arc',
      message: `${Math.round((1 - graph.forwardEdgeRatio) * 100)}% of causal links point backward — possible structural incoherence`,
    });
  }
  
  // Flat tension
  if (graph.escalationMonotonicity < 0.3) {
    findings.push({
      type: 'flat-tension',
      message: 'Tension does not escalate across acts — story may feel static',
    });
  }
  
  // Composite graph health (weighted formula)
  // Weights tuned for discrimination: promise-payment (40%), forward-edges (25%), escalation (20%), arc-coherence (15%)
  const graphHealth = Math.round(
    graph.promisePaymentRatio * 40 +
    graph.forwardEdgeRatio * 25 +
    graph.escalationMonotonicity * 20 +
    Math.max(0, (graph.arcCoherence + 1) / 2) * 15  // Normalize Pearson [-1,1] to [0,1]
  );
  
  return {
    graph,
    findings,
    graphHealth,
  };
}
