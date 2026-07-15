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

// Enhanced diagnostic types (Phase 2)
export type DiagnosticSeverity = 'critical' | 'medium' | 'low' | 'strength';

export interface EnhancedDiagnostic {
  severity: DiagnosticSeverity;
  type: 'unpaid-promise' | 'isolated-scene' | 'backward-arc' | 'flat-tension' | 'tight-causality' | 'strong-escalation' | 'high-closure';
  sceneIdx?: number;
  sceneRange?: [number, number];  // For multi-scene issues
  message: string;
  impact: string;  // Why this matters
  suggestions: string[];  // How to fix it
  relatedScenes?: number[];  // Connected scenes
  confidence?: number;  // 0-1, how sure we are
}

export interface StoryGraphReport {
  graph: StoryGraph;
  
  // Enhanced diagnostics (Phase 2)
  diagnostics: {
    critical: EnhancedDiagnostic[];
    medium: EnhancedDiagnostic[];
    low: EnhancedDiagnostic[];
    strengths: EnhancedDiagnostic[];
  };
  
  // Summary statistics
  summary: {
    totalIssues: number;
    criticalCount: number;
    strengthCount: number;
    overallAssessment: 'strong' | 'good' | 'needs-work' | 'weak';
  };
  
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
  // Use promiseMap directly since it has seedIdx and payoffIdx
  const paidPromisesArray = Array.from(promiseMap.values()).filter(p => p.payoffIdx !== undefined);
  let forwardPromises = 0;
  for (const promise of paidPromisesArray) {
    if (promise.seedIdx < promise.payoffIdx!) {
      forwardPromises++;
    }
  }
  const forwardEdgeRatio = paidPromisesArray.length > 0 
    ? forwardPromises / paidPromisesArray.length 
    : 0.5;
  
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

// ── Enhanced Diagnostics (Phase 2) ───────────────────────────────────────────

/** Classify severity based on finding type and context */
function classifySeverity(
  finding: { type: string; sceneIdx?: number },
  analysis: FountainAnalysis,
  graph: StoryGraph
): DiagnosticSeverity {
  const sceneCount = analysis.sceneCount;
  const act1End = Math.floor(sceneCount * 0.25);
  const act2End = Math.floor(sceneCount * 0.75);
  
  if (finding.type === 'unpaid-promise' && finding.sceneIdx !== undefined) {
    // Critical if setup in Act 1, medium if Act 2, low if Act 3
    if (finding.sceneIdx < act1End) return 'critical';
    if (finding.sceneIdx < act2End) return 'medium';
    return 'low';
  }
  
  if (finding.type === 'isolated-scene' && finding.sceneIdx !== undefined) {
    // Critical if isolated at key structural positions
    const position = finding.sceneIdx / Math.max(sceneCount - 1, 1);
    const isKeyPosition = 
      position < 0.05 ||  // Opening
      (position > 0.23 && position < 0.27) ||  // Act 1 break
      (position > 0.48 && position < 0.52) ||  // Midpoint
      (position > 0.73 && position < 0.77) ||  // Act 2 break
      position > 0.95;  // Climax/resolution
    return isKeyPosition ? 'critical' : 'medium';
  }
  
  if (finding.type === 'backward-arc') {
    // Critical if > 40% backward, medium otherwise
    return graph.forwardEdgeRatio < 0.6 ? 'critical' : 'medium';
  }
  
  if (finding.type === 'flat-tension') {
    // Medium issue (not critical but should address)
    return 'medium';
  }
  
  return 'medium';
}

/** Generate impact explanation for a finding */
function generateImpact(finding: { type: string; sceneIdx?: number }, analysis: FountainAnalysis): string {
  if (finding.type === 'unpaid-promise') {
    return 'Audiences remember setups and expect payoffs. Unresolved promises can feel like plot holes or wasted screen time.';
  }
  
  if (finding.type === 'isolated-scene') {
    return 'This scene doesn\'t affect or get affected by the main plot. It may feel disconnected or unnecessary.';
  }
  
  if (finding.type === 'backward-arc') {
    return 'Causal relationships should flow forward in story time. Backward links suggest structural confusion or act-order issues.';
  }
  
  if (finding.type === 'flat-tension') {
    return 'Stories need escalation to maintain engagement. Flat tension across acts can make the story feel static or episodic.';
  }
  
  return 'This structural pattern may affect story clarity or engagement.';
}

/** Generate actionable suggestions for fixing a finding */
function generateSuggestions(
  finding: { type: string; sceneIdx?: number },
  analysis: FountainAnalysis,
  graph: StoryGraph
): string[] {
  const sceneCount = analysis.sceneCount;
  const act1End = Math.floor(sceneCount * 0.25);
  const act2End = Math.floor(sceneCount * 0.75);
  
  if (finding.type === 'unpaid-promise' && finding.sceneIdx !== undefined) {
    const inAct1 = finding.sceneIdx < act1End;
    const inAct2 = finding.sceneIdx >= act1End && finding.sceneIdx < act2End;
    
    if (inAct1) {
      return [
        'Add a payoff scene in Act 2 or 3 to resolve this setup',
        'If this setup is no longer relevant to the main plot, consider removing it',
        'Connect this promise to an existing climax or resolution scene'
      ];
    } else if (inAct2) {
      return [
        'Add a payoff scene in Act 3 before the climax',
        'Weave the resolution into an existing scene\'s events',
        'If minor, consider whether this setup adds necessary complexity'
      ];
    } else {
      return [
        'Add a brief payoff in the resolution',
        'If this is a minor detail, it may be acceptable to leave unresolved',
        'Consider whether this setup is necessary this late in the story'
      ];
    }
  }
  
  if (finding.type === 'isolated-scene') {
    return [
      'Add a causal connection: have this scene\'s events affect later scenes',
      'Seed or pay off a promise in this scene to connect it to the main plot',
      'Show character growth or relationship changes that carry forward',
      'If truly standalone, evaluate whether this scene serves the story'
    ];
  }
  
  if (finding.type === 'backward-arc') {
    return [
      'Review scene order: ensure setups come before payoffs',
      'Check for flashback scenes that might be causing confusion',
      'Verify that causal chains flow forward in narrative time',
      'Consider whether act structure needs adjustment'
    ];
  }
  
  if (finding.type === 'flat-tension') {
    return [
      'Raise stakes in Act 2: introduce complications, obstacles, or reversals',
      'Build toward climax: increase suspense and conflict in the final 25%',
      'Add pressure points at act breaks to signal escalation',
      'Ensure protagonist faces increasingly difficult challenges'
    ];
  }
  
  return ['Review this structural pattern and consider adjustments'];
}

/** Detect structural strengths in the story */
function detectStrengths(graph: StoryGraph, analysis: FountainAnalysis): EnhancedDiagnostic[] {
  const strengths: EnhancedDiagnostic[] = [];
  
  // High closure rate
  if (graph.promisePaymentRatio >= 0.8 && graph.unpaidPromises.length > 0) {
    strengths.push({
      severity: 'strength',
      type: 'high-closure',
      message: `Strong closure: ${Math.round(graph.promisePaymentRatio * 100)}% of promises are paid off`,
      impact: 'Audiences feel satisfied when setups are resolved. High closure rates build trust in the storytelling.',
      suggestions: [
        'Maintain this attention to setup-payoff structure',
        'Ensure remaining unpaid promises are intentional (mysteries for sequels, etc.)'
      ],
      confidence: 0.9
    });
  }
  
  // Tight causal chains (long setup-payoff distances)
  if (graph.setupPayoffDistance > 20 && graph.promisePaymentRatio > 0.5) {
    strengths.push({
      severity: 'strength',
      type: 'tight-causality',
      message: `Patient setup: Average ${Math.round(graph.setupPayoffDistance)} scenes between setup and payoff`,
      impact: 'Long setup-payoff distances show patience and trust in the audience. This creates satisfying "aha" moments.',
      suggestions: [
        'Continue building anticipation with well-spaced setups and payoffs',
        'Ensure audiences don\'t forget early setups by providing subtle reminders'
      ],
      confidence: 0.8
    });
  }
  
  // Strong escalation
  if (graph.escalationMonotonicity >= 1.0) {
    strengths.push({
      severity: 'strength',
      type: 'strong-escalation',
      message: 'Excellent escalation: Tension rises consistently across all acts',
      impact: 'Clear escalation keeps audiences engaged and builds toward a satisfying climax.',
      suggestions: [
        'Maintain this momentum through the climax',
        'Ensure the final act delivers on the built-up tension'
      ],
      confidence: 0.95
    });
  }
  
  // Strong forward causality
  if (graph.forwardEdgeRatio >= 0.95 && graph.edges.filter(e => e.type === 'causal').length > 5) {
    strengths.push({
      severity: 'strength',
      type: 'tight-causality',
      message: `Clear causality: ${Math.round(graph.forwardEdgeRatio * 100)}% of causal links flow forward`,
      impact: 'Forward-flowing causality creates clear cause-and-effect chains that audiences can follow.',
      suggestions: [
        'Continue maintaining clear causal relationships',
        'Ensure audiences understand how early actions lead to later consequences'
      ],
      confidence: 0.85
    });
  }
  
  return strengths;
}

// ── Report Generation ─────────────────────────────────────────────────────────

export function analyzeStoryGraph(analysis: FountainAnalysis): StoryGraphReport | undefined {
  if (analysis.sceneCount === 0) return undefined;
  
  const graph = buildStoryGraph(analysis);
  
  // Enhanced diagnostics with severity classification
  const critical: EnhancedDiagnostic[] = [];
  const medium: EnhancedDiagnostic[] = [];
  const low: EnhancedDiagnostic[] = [];
  
  // Unpaid promises
  for (const clueId of graph.unpaidPromises) {
    const promiseNode = graph.nodes.find(n => n.metadata.clueId === clueId && n.metadata.promiseType === 'setup');
    if (promiseNode) {
      // Find the scene that seeded this promise
      const seedingScene = graph.nodes.find(n => n.type === 'scene' && graph.edges.some(e => e.source === n.id && e.target === promiseNode.id));
      const finding = {
        type: 'unpaid-promise',
        sceneIdx: seedingScene?.sceneIdx
      };
      
      const severity = classifySeverity(finding, analysis, graph);
      const diagnostic: EnhancedDiagnostic = {
        severity,
        type: 'unpaid-promise',
        sceneIdx: seedingScene?.sceneIdx,
        message: `Setup "${clueId}" planted but never resolved`,
        impact: generateImpact(finding, analysis),
        suggestions: generateSuggestions(finding, analysis, graph),
        confidence: 0.85
      };
      
      if (severity === 'critical') critical.push(diagnostic);
      else if (severity === 'medium') medium.push(diagnostic);
      else low.push(diagnostic);
    }
  }
  
  // Isolated scenes
  for (const idx of graph.isolatedScenes) {
    const finding = { type: 'isolated-scene', sceneIdx: idx };
    const severity = classifySeverity(finding, analysis, graph);
    
    const diagnostic: EnhancedDiagnostic = {
      severity,
      type: 'isolated-scene',
      sceneIdx: idx,
      message: `Scene ${idx + 1} has no causal connections to the story`,
      impact: generateImpact(finding, analysis),
      suggestions: generateSuggestions(finding, analysis, graph),
      confidence: 0.8
    };
    
    if (severity === 'critical') critical.push(diagnostic);
    else if (severity === 'medium') medium.push(diagnostic);
    else low.push(diagnostic);
  }
  
  // Backward arc (act-swap signal)
  if (graph.forwardEdgeRatio < 0.6) {
    const finding = { type: 'backward-arc' };
    const severity = classifySeverity(finding, analysis, graph);
    
    const diagnostic: EnhancedDiagnostic = {
      severity,
      type: 'backward-arc',
      message: `${Math.round((1 - graph.forwardEdgeRatio) * 100)}% of causal links point backward — possible structural incoherence`,
      impact: generateImpact(finding, analysis),
      suggestions: generateSuggestions(finding, analysis, graph),
      confidence: 0.7
    };
    
    if (severity === 'critical') critical.push(diagnostic);
    else medium.push(diagnostic);
  }
  
  // Flat tension
  if (graph.escalationMonotonicity < 0.3) {
    const finding = { type: 'flat-tension' };
    const diagnostic: EnhancedDiagnostic = {
      severity: 'medium',
      type: 'flat-tension',
      message: 'Tension does not escalate across acts — story may feel static',
      impact: generateImpact(finding, analysis),
      suggestions: generateSuggestions(finding, analysis, graph),
      confidence: 0.75
    };
    
    medium.push(diagnostic);
  }
  
  // Detect strengths
  const strengths = detectStrengths(graph, analysis);
  
  // Overall assessment
  const totalIssues = critical.length + medium.length + low.length;
  let overallAssessment: 'strong' | 'good' | 'needs-work' | 'weak';
  
  if (critical.length === 0 && medium.length <= 2 && strengths.length >= 2) {
    overallAssessment = 'strong';
  } else if (critical.length === 0 && totalIssues <= 5) {
    overallAssessment = 'good';
  } else if (critical.length <= 2 && totalIssues <= 10) {
    overallAssessment = 'needs-work';
  } else {
    overallAssessment = 'weak';
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
    diagnostics: {
      critical,
      medium,
      low,
      strengths
    },
    summary: {
      totalIssues,
      criticalCount: critical.length,
      strengthCount: strengths.length,
      overallAssessment
    },
    graphHealth,
  };
}

