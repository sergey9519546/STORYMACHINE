// Graph Health — GODMODE L5 (Causal Architecture) diagnostic contribution.
//
// Produces a graph-native structural diagnostic. It deliberately does NOT
// change health or verdict: controlled-corpus calibration measured wrong-sign
// discrimination (scripts/calibrate-graph-health.ts, r=-0.290 vs band rank).
// The potential deduction is retained as an explicitly untrusted counterfactual
// value for future re-calibration, not a live scoring channel.
//
// Metrics weighted: promise-payment (35%), forward-edges (25%),
// escalation (20%), arc-coherence (15%), causal-density (5%).

import type { StoryGraph, StoryGraphReport } from '../analyze/story-graph.ts';

export interface GraphHealthContribution {
  /** 0–100 health contribution from graph metrics (100 = excellent). */
  graphHealthScore: number;
  /** Potential deduction (0–15, capped). Diagnostic-only until a future
   *  calibration establishes correct real-writing discrimination. */
  graphDeduction: number;
  /** Individual metrics that drove the score. */
  metrics: {
    promisePaymentRatio: number;
    forwardEdgeRatio: number;
    escalationMonotonicity: number;
    arcCoherence: number;
    causalDensity: number;
    isolatedSceneCount: number;
  };
  /** Key findings explaining the score. */
  findings: string[];
}

function normalizeArcCoherence(pearson: number): number {
  // Pearson ranges [-1, 1]; normalize to [0, 1]
  return Math.max(0, (pearson + 1) / 2);
}

function normalizeCausalDensity(density: number): number {
  // 2.0 edges/node is "rich"; cap at 1.0
  return Math.min(1, density / 2.0);
}

export function computeGraphHealth(graph: StoryGraph, sceneCount: number): GraphHealthContribution {
  const {
    promisePaymentRatio,
    forwardEdgeRatio,
    escalationMonotonicity,
    arcCoherence,
    causalDensity,
    isolatedScenes,
  } = graph;

  const weights = { payment: 0.35, forward: 0.25, escalation: 0.20, arc: 0.15, density: 0.05 };
  const normArc = normalizeArcCoherence(arcCoherence);
  const normDensity = normalizeCausalDensity(causalDensity);

  const graphHealthScore = Math.round(
    (promisePaymentRatio * weights.payment +
     forwardEdgeRatio * weights.forward +
     escalationMonotonicity * weights.escalation +
     normArc * weights.arc +
     normDensity * weights.density) * 100,
  );

  const graphDeduction = Math.round(Math.min(15, Math.max(0, ((100 - graphHealthScore) / 100) * 15)));

  const findings: string[] = [];
  if (promisePaymentRatio < 0.7) {
    findings.push(`Promise-payment ratio is ${promisePaymentRatio.toFixed(2)} — ${graph.unpaidPromises.length} unpaid setup(s) may feel like plot holes.`);
  }
  if (forwardEdgeRatio < 0.6) {
    findings.push(`Forward-edge ratio is ${forwardEdgeRatio.toFixed(2)} — causal links may flow backward, suggesting structural confusion.`);
  }
  if (escalationMonotonicity < 0.5) {
    findings.push(`Escalation monotonicity is ${escalationMonotonicity.toFixed(2)} — tension does not consistently rise across acts.`);
  }
  if (normArc < 0.5) {
    findings.push(`Arc coherence is low — tension progression may not track with story position.`);
  }
  if (sceneCount > 5 && isolatedScenes.length > 0) {
    findings.push(`${isolatedScenes.length} isolated scene(s) with no causal connections to the story.`);
  }

  return {
    graphHealthScore,
    graphDeduction,
    metrics: {
      promisePaymentRatio,
      forwardEdgeRatio,
      escalationMonotonicity,
      arcCoherence,
      causalDensity,
      isolatedSceneCount: isolatedScenes.length,
    },
    findings,
  };
}

export function graphHealthFromReport(
  report: StoryGraphReport | undefined,
  sceneCount: number,
): GraphHealthContribution | null {
  if (!report || sceneCount === 0) return null;
  return computeGraphHealth(report.graph, sceneCount);
}
