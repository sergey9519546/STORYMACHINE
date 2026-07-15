// Trinity Gate — Three-Layer Verification Orchestrator
//
// Orchestrates the three verification layers that prevent plot holes by construction:
// 1. Story Graph Verifier (structural coherence)
// 2. OWNE Verifier (world consistency + intentionality)
// 3. Pre-Flight Auditor (epistemic + possession + spatial)
//
// ALL THREE must pass for an event to commit. Returns comprehensive violations
// with repair suggestions when any layer fails.
//
// Design: Production-ready orchestrator with proper error handling, logging,
// and integration with EventStore. Replaces manual proof checking with
// systematic three-layer gate.

import type { NarrativeEvent, NarrativeEventInput } from './types.ts';
import type { NarrativeState } from '../state/NarrativeState.ts';
import { verifyStoryGraph, type StoryGraphVerification, type GraphViolation } from './verifiers/story-graph-verifier.ts';
import { verifyOwne, type OwneVerification, type OwneViolation } from './verifiers/owne-verifier.ts';
import { auditPreFlight, type PreFlightAudit, type PreFlightViolation } from './verifiers/preflight-auditor.ts';

// ── Type Definitions ──────────────────────────────────────────────────────────

export type VerificationLayer = 'story-graph' | 'owne' | 'preflight';

export interface TrinityViolation {
  layer: VerificationLayer;
  type: string;
  severity: 'critical' | 'medium' | 'low';
  message: string;
  repairSuggestions: string[];
  metadata: {
    affectedScenes?: number[];
    characterIds?: string[];
    objectIds?: string[];
    factIds?: string[];
    confidence?: number;
  };
}

export interface TrinityVerification {
  pass: boolean;
  layers: {
    storyGraph: StoryGraphVerification;
    owne: OwneVerification;
    preflight: PreFlightAudit;
  };
  violations: TrinityViolation[];
  overallHealth: number;  // 0-100 composite score
  timestamp: number;
  
  // Detailed breakdown
  summary: {
    totalViolations: number;
    criticalCount: number;
    mediumCount: number;
    lowCount: number;
    failedLayers: VerificationLayer[];
  };
}

export interface TrinityGateOptions {
  strictMode?: boolean;  // If true, medium violations also block commit
  enableLogging?: boolean;  // Log verification results
  repairMode?: boolean;  // Generate repair suggestions even on pass
}

// ── Trinity Gate Orchestrator ─────────────────────────────────────────────────

/**
 * Run all three verification layers on a proposed event.
 * 
 * Returns comprehensive verification result with:
 * - Pass/fail status (all 3 must pass)
 * - Violations from each layer with repair suggestions
 * - Overall health score
 * - Detailed breakdown by layer
 * 
 * Usage:
 * ```typescript
 * const verification = await runTrinityGate(event, state, allEvents);
 * if (!verification.pass) {
 *   console.error('Trinity Gate BLOCKED:', verification.summary);
 *   for (const violation of verification.violations) {
 *     console.log(`[${violation.layer}] ${violation.message}`);
 *   }
 * }
 * ```
 */
export async function runTrinityGate(
  event: NarrativeEvent,
  currentState: NarrativeState,
  allEvents: NarrativeEvent[],
  options: TrinityGateOptions = {}
): Promise<TrinityVerification> {
  
  const startTime = Date.now();
  const { strictMode = false, enableLogging = false, repairMode = false } = options;
  
  if (enableLogging) {
    console.log(`[Trinity Gate] Verifying event ${event.eventId} at story-time ${event.storyTime}`);
  }
  
  // Run all three layers in parallel for performance
  const [storyGraphResult, owneResult, preflightResult] = await Promise.all([
    Promise.resolve(verifyStoryGraph(event, currentState, allEvents)),
    Promise.resolve(verifyOwne(event, currentState, allEvents)),
    Promise.resolve(auditPreFlight(event, currentState, allEvents)),
  ]);
  
  // Collect all violations
  const violations: TrinityViolation[] = [];
  
  // Story Graph violations
  for (const v of storyGraphResult.violations) {
    violations.push(convertGraphViolation(v));
  }
  
  // OWNE violations
  for (const v of owneResult.violations) {
    violations.push(convertOwneViolation(v));
  }
  
  // Pre-Flight violations
  for (const v of preflightResult.violations) {
    violations.push(convertPreflightViolation(v));
  }
  
  // Determine which layers failed
  const failedLayers: VerificationLayer[] = [];
  if (!storyGraphResult.pass) failedLayers.push('story-graph');
  if (!owneResult.pass) failedLayers.push('owne');
  if (!preflightResult.pass) failedLayers.push('preflight');
  
  // Count violations by severity
  const criticalCount = violations.filter(v => v.severity === 'critical').length;
  const mediumCount = violations.filter(v => v.severity === 'medium').length;
  const lowCount = violations.filter(v => v.severity === 'low').length;
  
  // Determine overall pass/fail
  const allLayersPass = storyGraphResult.pass && owneResult.pass && preflightResult.pass;
  const pass = strictMode ? (allLayersPass && mediumCount === 0) : allLayersPass;
  
  // Compute overall health (weighted average)
  const overallHealth = computeOverallHealth(storyGraphResult, owneResult, preflightResult);
  
  const verification: TrinityVerification = {
    pass,
    layers: {
      storyGraph: storyGraphResult,
      owne: owneResult,
      preflight: preflightResult,
    },
    violations,
    overallHealth,
    timestamp: Date.now(),
    summary: {
      totalViolations: violations.length,
      criticalCount,
      mediumCount,
      lowCount,
      failedLayers,
    },
  };
  
  if (enableLogging) {
    const duration = Date.now() - startTime;
    console.log(`[Trinity Gate] Verification complete in ${duration}ms`);
    console.log(`[Trinity Gate] Result: ${pass ? 'PASS' : 'FAIL'} (health: ${overallHealth}/100)`);
    if (!pass) {
      console.log(`[Trinity Gate] Failed layers: ${failedLayers.join(', ')}`);
      console.log(`[Trinity Gate] Violations: ${criticalCount} critical, ${mediumCount} medium, ${lowCount} low`);
    }
  }
  
  return verification;
}

/**
 * Convenience function: verify and return only pass/fail + critical violations.
 */
export async function quickVerify(
  event: NarrativeEvent,
  currentState: NarrativeState,
  allEvents: NarrativeEvent[]
): Promise<{ pass: boolean; criticalViolations: TrinityViolation[] }> {
  
  const result = await runTrinityGate(event, currentState, allEvents);
  const criticalViolations = result.violations.filter(v => v.severity === 'critical');
  
  return {
    pass: result.pass,
    criticalViolations,
  };
}

/**
 * Verify multiple events in sequence (for batch operations).
 * Returns first failure or success if all pass.
 */
export async function verifyEventSequence(
  events: NarrativeEvent[],
  currentState: NarrativeState,
  allEvents: NarrativeEvent[],
  options: TrinityGateOptions = {}
): Promise<TrinityVerification[]> {
  
  const results: TrinityVerification[] = [];
  let accumulatedEvents = [...allEvents];
  
  for (const event of events) {
    const verification = await runTrinityGate(event, currentState, accumulatedEvents, options);
    results.push(verification);
    
    if (!verification.pass) {
      // Stop on first failure
      break;
    }
    
    // Add to accumulated events for next verification
    accumulatedEvents.push(event);
  }
  
  return results;
}

// ── Violation Converters ──────────────────────────────────────────────────────

function convertGraphViolation(v: GraphViolation): TrinityViolation {
  return {
    layer: 'story-graph',
    type: v.type,
    severity: v.severity,
    message: v.message,
    repairSuggestions: v.repairSuggestions,
    metadata: {
      affectedScenes: v.affectedScenes,
      confidence: v.confidence,
    },
  };
}

function convertOwneViolation(v: OwneViolation): TrinityViolation {
  return {
    layer: 'owne',
    type: v.type,
    severity: v.severity,
    message: v.message,
    repairSuggestions: v.repairSuggestions,
    metadata: {
      characterIds: v.characterIds,
      objectIds: v.objectIds,
      factIds: v.factIds,
      confidence: v.confidence,
    },
  };
}

function convertPreflightViolation(v: PreFlightViolation): TrinityViolation {
  return {
    layer: 'preflight',
    type: v.type,
    severity: v.severity,
    message: v.message,
    repairSuggestions: v.repairSuggestions,
    metadata: {
      characterIds: v.characterIds,
      objectIds: v.objectIds,
      factIds: v.factIds,
      confidence: v.confidence,
    },
  };
}

// ── Health Computation ────────────────────────────────────────────────────────

/**
 * Compute overall health as weighted average of all layers.
 * 
 * Weights:
 * - Story Graph: 30% (structural coherence)
 * - OWNE World: 25% (world consistency)
 * - OWNE Intentionality: 15% (character motivation)
 * - OWNE Promises: 15% (setup/payoff integrity)
 * - PreFlight Epistemic: 10% (knowledge tracking)
 * - PreFlight Possession: 3% (object custody)
 * - PreFlight Spatial: 2% (travel feasibility)
 */
function computeOverallHealth(
  graph: StoryGraphVerification,
  owne: OwneVerification,
  preflight: PreFlightAudit
): number {
  
  const weights = {
    storyGraph: 0.30,
    owneWorld: 0.25,
    owneIntentionality: 0.15,
    ownePromises: 0.15,
    preflightEpistemic: 0.10,
    preflightPossession: 0.03,
    preflightSpatial: 0.02,
  };
  
  const weightedScore =
    graph.graphHealth * weights.storyGraph +
    owne.worldConsistency * weights.owneWorld +
    owne.intentionalityScore * weights.owneIntentionality +
    owne.promiseIntegrity * weights.ownePromises +
    preflight.epistemicConsistency * weights.preflightEpistemic +
    preflight.possessionTracking * weights.preflightPossession +
    preflight.spatialFeasibility * weights.preflightSpatial;
  
  return Math.round(weightedScore);
}

// ── Repair Suggestion Aggregator ──────────────────────────────────────────────

/**
 * Aggregate and prioritize repair suggestions from all violations.
 * Returns top N suggestions sorted by impact.
 */
export function getTopRepairSuggestions(
  verification: TrinityVerification,
  maxSuggestions: number = 5
): string[] {
  
  const suggestions = new Map<string, number>();  // suggestion -> priority score
  
  for (const violation of verification.violations) {
    const priorityWeight = violation.severity === 'critical' ? 3 : violation.severity === 'medium' ? 2 : 1;
    const confidence = violation.metadata.confidence || 0.5;
    
    for (const suggestion of violation.repairSuggestions) {
      const currentScore = suggestions.get(suggestion) || 0;
      suggestions.set(suggestion, currentScore + priorityWeight * confidence);
    }
  }
  
  // Sort by score and return top N
  return Array.from(suggestions.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxSuggestions)
    .map(([suggestion, _]) => suggestion);
}

/**
 * Format verification result as human-readable report.
 */
export function formatVerificationReport(verification: TrinityVerification): string {
  const lines: string[] = [];
  
  lines.push('═══════════════════════════════════════════════════════════════');
  lines.push('  TRINITY VERIFICATION GATE REPORT');
  lines.push('═══════════════════════════════════════════════════════════════');
  lines.push('');
  lines.push(`Status: ${verification.pass ? '✓ PASS' : '✗ FAIL'}`);
  lines.push(`Overall Health: ${verification.overallHealth}/100`);
  lines.push(`Timestamp: ${new Date(verification.timestamp).toISOString()}`);
  lines.push('');
  
  if (verification.summary.failedLayers.length > 0) {
    lines.push(`Failed Layers: ${verification.summary.failedLayers.join(', ')}`);
    lines.push('');
  }
  
  lines.push('Layer Scores:');
  lines.push(`  Story Graph:     ${verification.layers.storyGraph.graphHealth}/100`);
  lines.push(`  OWNE World:      ${verification.layers.owne.worldConsistency}/100`);
  lines.push(`  OWNE Intent:     ${verification.layers.owne.intentionalityScore}/100`);
  lines.push(`  OWNE Promises:   ${verification.layers.owne.promiseIntegrity}/100`);
  lines.push(`  PreFlight Epist: ${verification.layers.preflight.epistemicConsistency}/100`);
  lines.push(`  PreFlight Poss:  ${verification.layers.preflight.possessionTracking}/100`);
  lines.push(`  PreFlight Space: ${verification.layers.preflight.spatialFeasibility}/100`);
  lines.push('');
  
  if (verification.violations.length > 0) {
    lines.push(`Violations (${verification.summary.totalViolations} total):`);
    lines.push(`  Critical: ${verification.summary.criticalCount}`);
    lines.push(`  Medium:   ${verification.summary.mediumCount}`);
    lines.push(`  Low:      ${verification.summary.lowCount}`);
    lines.push('');
    
    // Group by layer
    const byLayer = {
      'story-graph': verification.violations.filter(v => v.layer === 'story-graph'),
      'owne': verification.violations.filter(v => v.layer === 'owne'),
      'preflight': verification.violations.filter(v => v.layer === 'preflight'),
    };
    
    for (const [layer, violations] of Object.entries(byLayer)) {
      if (violations.length === 0) continue;
      
      lines.push(`[${layer.toUpperCase()}]`);
      for (const v of violations) {
        lines.push(`  ${v.severity.toUpperCase()}: ${v.message}`);
        if (v.repairSuggestions.length > 0) {
          lines.push(`    → ${v.repairSuggestions[0]}`);
        }
      }
      lines.push('');
    }
    
    // Top repair suggestions
    const topSuggestions = getTopRepairSuggestions(verification, 5);
    if (topSuggestions.length > 0) {
      lines.push('Top Repair Suggestions:');
      topSuggestions.forEach((s, i) => {
        lines.push(`  ${i + 1}. ${s}`);
      });
      lines.push('');
    }
  } else {
    lines.push('No violations detected. ✓');
    lines.push('');
  }
  
  lines.push('═══════════════════════════════════════════════════════════════');
  
  return lines.join('\n');
}

// ── Export ────────────────────────────────────────────────────────────────────

export type {
  TrinityViolation,
  TrinityVerification,
  TrinityGateOptions,
  VerificationLayer,
};
