// Story Graph Verifier — Trinity Verification Gate Layer 1
//
// Validates structural coherence using existing story-graph.ts analysis.
// Detects unpaid promises, isolated scenes, backward causality, and flat tension.
// Returns violations with repair suggestions when graph health is below threshold.
//
// Design: Pure function that takes event + current state, builds incremental graph,
// and checks structural invariants. Integrates with existing story-graph.ts metrics.

import type { NarrativeEvent } from '../types.ts';
import type { NarrativeState } from '../../state/NarrativeState.ts';
import { buildStoryGraph, analyzeStoryGraph, type StoryGraph } from '../../analyze/story-graph.ts';
import type { FountainAnalysis } from '../../analyze/types.ts';

// ── Type Definitions ──────────────────────────────────────────────────────────

export interface GraphViolation {
  type: 'unpaid-promise' | 'isolated-scene' | 'backward-causality' | 'flat-tension' | 'orphaned-setup';
  severity: 'critical' | 'medium' | 'low';
  message: string;
  affectedScenes: number[];
  repairSuggestions: string[];
  confidence: number;  // 0-1
}

export interface StoryGraphVerification {
  pass: boolean;
  graphHealth: number;  // 0-100
  violations: GraphViolation[];
  graph?: StoryGraph;
  timestamp: number;
}

// ── Configuration ─────────────────────────────────────────────────────────────

const HEALTH_THRESHOLD = 60;  // Minimum graph health to pass
const PROMISE_PAYMENT_THRESHOLD = 0.7;  // Minimum ratio to pass
const FORWARD_EDGE_THRESHOLD = 0.6;  // Minimum forward causality
const ESCALATION_THRESHOLD = 0.3;  // Minimum escalation monotonicity

// ── Core Verifier ─────────────────────────────────────────────────────────────

/**
 * Verify story graph structural coherence for a proposed event.
 * 
 * Checks:
 * - Promise-payment ratio (unpaid setups create violations)
 * - Causal connectivity (isolated scenes are flagged)
 * - Forward causality (backward edges suggest act-swap issues)
 * - Tension escalation (flat tension across acts)
 * 
 * Returns violations with repair suggestions when health < threshold.
 */
export function verifyStoryGraph(
  event: NarrativeEvent,
  currentState: NarrativeState,
  allEvents: NarrativeEvent[]
): StoryGraphVerification {
  
  // Build prospective event list (current + proposed)
  const prospectiveEvents = [...allEvents, event];
  
  // Convert events to FountainAnalysis format for story-graph.ts
  const analysis = convertEventsToAnalysis(prospectiveEvents, currentState);
  
  // Run graph analysis
  const report = analyzeStoryGraph(analysis);
  
  if (!report) {
    // No analysis possible (empty story)
    return {
      pass: true,
      graphHealth: 100,
      violations: [],
      timestamp: Date.now(),
    };
  }
  
  const { graph, diagnostics } = report;
  const violations: GraphViolation[] = [];
  
  // Convert diagnostics to violations
  for (const diag of diagnostics.critical) {
    violations.push({
      type: mapDiagnosticType(diag.type),
      severity: 'critical',
      message: diag.message,
      affectedScenes: collectAffectedScenes(diag),
      repairSuggestions: diag.suggestions || [],
      confidence: diag.confidence || 0.8,
    });
  }
  
  for (const diag of diagnostics.medium) {
    violations.push({
      type: mapDiagnosticType(diag.type),
      severity: 'medium',
      message: diag.message,
      affectedScenes: collectAffectedScenes(diag),
      repairSuggestions: diag.suggestions || [],
      confidence: diag.confidence || 0.7,
    });
  }
  
  // Check thresholds for additional violations
  if (graph.promisePaymentRatio < PROMISE_PAYMENT_THRESHOLD) {
    violations.push({
      type: 'unpaid-promise',
      severity: 'critical',
      message: `Low promise closure: ${Math.round(graph.promisePaymentRatio * 100)}% of setups are paid off (threshold: ${PROMISE_PAYMENT_THRESHOLD * 100}%)`,
      affectedScenes: [],
      repairSuggestions: [
        'Review unpaid promises and add payoff scenes',
        'Remove unnecessary setups that don\'t serve the story',
        'Weave resolutions into existing climax scenes',
      ],
      confidence: 0.9,
    });
  }
  
  if (graph.forwardEdgeRatio < FORWARD_EDGE_THRESHOLD) {
    violations.push({
      type: 'backward-causality',
      severity: 'critical',
      message: `Poor forward causality: ${Math.round(graph.forwardEdgeRatio * 100)}% of causal links point forward (threshold: ${FORWARD_EDGE_THRESHOLD * 100}%)`,
      affectedScenes: [],
      repairSuggestions: [
        'Review scene order to ensure setups precede payoffs',
        'Check for flashback scenes causing temporal confusion',
        'Verify act structure has correct narrative flow',
      ],
      confidence: 0.85,
    });
  }
  
  if (graph.escalationMonotonicity < ESCALATION_THRESHOLD) {
    violations.push({
      type: 'flat-tension',
      severity: 'medium',
      message: `Weak escalation: tension monotonicity score ${graph.escalationMonotonicity.toFixed(2)} (threshold: ${ESCALATION_THRESHOLD})`,
      affectedScenes: [],
      repairSuggestions: [
        'Increase stakes and complications in Act 2',
        'Build tension toward climax in final act',
        'Add pressure points at structural turning points',
      ],
      confidence: 0.75,
    });
  }
  
  // Determine pass/fail
  const criticalCount = violations.filter(v => v.severity === 'critical').length;
  const pass = report.graphHealth >= HEALTH_THRESHOLD && criticalCount === 0;
  
  return {
    pass,
    graphHealth: report.graphHealth,
    violations,
    graph,
    timestamp: Date.now(),
  };
}

// ── Helper Functions ──────────────────────────────────────────────────────────

function mapDiagnosticType(type: string): GraphViolation['type'] {
  switch (type) {
    case 'unpaid-promise': return 'unpaid-promise';
    case 'isolated-scene': return 'isolated-scene';
    case 'backward-arc': return 'backward-causality';
    case 'flat-tension': return 'flat-tension';
    default: return 'orphaned-setup';
  }
}

function collectAffectedScenes(diag: any): number[] {
  const scenes: number[] = [];
  if (diag.sceneIdx !== undefined) scenes.push(diag.sceneIdx);
  if (diag.sceneRange) scenes.push(...range(diag.sceneRange[0], diag.sceneRange[1]));
  if (diag.relatedScenes) scenes.push(...diag.relatedScenes);
  return [...new Set(scenes)].sort((a, b) => a - b);
}

function range(start: number, end: number): number[] {
  const result: number[] = [];
  for (let i = start; i <= end; i++) {
    result.push(i);
  }
  return result;
}

/**
 * Convert event stream to FountainAnalysis format for story-graph.ts.
 * 
 * Extracts scene-level data from events:
 * - seededClueIds from SEED_CLUE ops
 * - payoffSetupIds from PAYOFF_SETUP ops
 * - relationshipShifts from SHIFT_RELATIONSHIP ops
 * - suspenseDelta from UPDATE_READER_STATE ops
 */
function convertEventsToAnalysis(
  events: NarrativeEvent[],
  state: NarrativeState
): FountainAnalysis {
  
  // Group events by scene
  const sceneMap = new Map<number, NarrativeEvent[]>();
  for (const event of events) {
    const sceneIdx = event.sceneIdx;
    if (!sceneMap.has(sceneIdx)) {
      sceneMap.set(sceneIdx, []);
    }
    sceneMap.get(sceneIdx)!.push(event);
  }
  
  // Build scene records
  const records: any[] = [];
  const sceneIndices = Array.from(sceneMap.keys()).sort((a, b) => a - b);
  
  for (const sceneIdx of sceneIndices) {
    const sceneEvents = sceneMap.get(sceneIdx)!;
    
    // Extract signals from events
    const seededClueIds: string[] = [];
    const payoffSetupIds: string[] = [];
    const relationshipShifts: any[] = [];
    let suspenseDelta = 0;
    
    for (const event of sceneEvents) {
      const op = event.op;
      
      if (op.op === 'SEED_CLUE') {
        seededClueIds.push(op.clueId);
      } else if (op.op === 'PAYOFF_SETUP') {
        payoffSetupIds.push(op.setupId);
      } else if (op.op === 'SHIFT_RELATIONSHIP') {
        relationshipShifts.push({
          pairKey: `${op.pair[0]}<->${op.pair[1]}`,
          amount: op.delta.amount,
        });
      } else if (op.op === 'UPDATE_READER_STATE') {
        suspenseDelta += op.delta.suspense || 0;
      }
    }
    
    records.push({
      slug: `SCENE_${sceneIdx}`,
      purpose: 'advance' as const,
      seededClueIds,
      payoffSetupIds,
      relationshipShifts,
      suspenseDelta,
    });
  }
  
  return {
    records,
    sceneCount: records.length,
    wordCount: 0,  // Not used by story-graph.ts
    pageCount: 0,  // Not used by story-graph.ts
  };
}

// ── Export ────────────────────────────────────────────────────────────────────

export type { StoryGraph };
