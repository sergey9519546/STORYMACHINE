// Self-Play Corpus (G13) — the engine runs N headless sims, scores each
// (proof pass-rate + valuation), and stores the full run as a CorpusEntry.
// The corpus feeds `mineCorpus()` which extracts the learned Director policy
// and ranks mechanism+arc combos by mean valuation.

import type { NarrativeState } from '../state/NarrativeState.ts';
import type { NarrativeTransitionIR } from '../ir/NarrativeTransitionIR.ts';
import type { CandidateGenerator, SceneTarget } from '../generate/proof-spec.ts';
import type { MutationOperator } from '../converge/operators.ts';
import { convergeScene } from '../converge/loop.ts';
import { emptyState } from '../state/NarrativeState.ts';
import { logger } from '../../lib/logger.ts';
import { applyStoryOps } from '../ops/dispatcher.ts';
import { runTier1 } from '../proof/kernel.ts';
import { deriveTensionLedger } from '../valuation/futures.ts';
import { makePrng, randInt } from '../repro/seed.ts';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface SimScenario {
  scenarioId: string;
  /** Seed for the PRNG — fully deterministic replay. */
  seed: number;
  /** Initial state to start the sim from (defaults to emptyState). */
  initialState?: NarrativeState;
  /** Target for each scene. */
  sceneTargets: SceneTarget[];
}

export interface SimResult {
  scenarioId: string;
  seed: number;
  /** Mean proof pass-rate across all scenes (0–1). */
  proofPassRate: number;
  /** Mean valuation (0–100) across all scenes. */
  meanValuation: number;
  /** Composite score: 0.5*proofPassRate + 0.5*(meanValuation/100) */
  score: number;
  /** Which operators were selected most in this run. */
  topOperators: MutationOperator[];
  /** The IRs produced for each scene (in order). */
  scenes: NarrativeTransitionIR[];
  /** Any operator that fired ≥2× is considered "effective" in this run. */
  effectiveOperators: MutationOperator[];
  /** Total convergence iterations across all scenes. */
  totalIterations: number;
}

export interface CorpusReport {
  runs: SimResult[];
  /** Mean score across all runs. */
  meanScore: number;
  /** The single best-scoring run. */
  bestRun: SimResult;
  /** The single worst-scoring run. */
  worstRun: SimResult;
  /** Global operator frequency table (operator → count across all runs). */
  operatorFrequency: Record<MutationOperator, number>;
}

// ── runSelfPlay ────────────────────────────────────────────────────────────────

/**
 * Run N headless sims (one per scenario) and return a CorpusReport.
 * Each sim uses `generate` as the candidate source — pass a mock for tests.
 *
 * H6: `maxSimulations` caps how many scenarios are executed.  Scenarios beyond
 * the cap are silently skipped so callers don't need to pre-slice the array.
 */
export async function runSelfPlay(
  scenarios: SimScenario[],
  generate: CandidateGenerator,
  maxSimulations?: number,
): Promise<CorpusReport> {
  const effectiveScenarios = maxSimulations != null
    ? scenarios.slice(0, maxSimulations)
    : scenarios;

  const runs: SimResult[] = [];

  for (const scenario of effectiveScenarios) {
    try {
      const result = await runOneSim(scenario, generate);
      runs.push(result);
    } catch (err) {
      logger.error('selfplay_scenario_failed', { scenarioId: scenario.scenarioId, error: (err as Error).message });
    }
  }

  if (runs.length === 0) {
    return {
      runs: [], meanScore: 0,
      bestRun: { scenarioId: '', seed: 0, proofPassRate: 0, meanValuation: 0, score: 0, topOperators: [], scenes: [], effectiveOperators: [], totalIterations: 0 },
      worstRun: { scenarioId: '', seed: 0, proofPassRate: 0, meanValuation: 0, score: 0, topOperators: [], scenes: [], effectiveOperators: [], totalIterations: 0 },
      operatorFrequency: {} as Record<MutationOperator, number>,
    };
  }

  const meanScore = runs.reduce((s, r) => s + r.score, 0) / runs.length;
  const sorted = [...runs].sort((a, b) => b.score - a.score);

  const operatorFrequency = {} as Record<MutationOperator, number>;
  for (const run of runs) {
    for (const op of run.topOperators) {
      operatorFrequency[op] = (operatorFrequency[op] ?? 0) + 1;
    }
  }

  return { runs, meanScore, bestRun: sorted[0], worstRun: sorted[sorted.length - 1], operatorFrequency };
}

// ── Internal: single sim ──────────────────────────────────────────────────────

async function runOneSim(scenario: SimScenario, generate: CandidateGenerator): Promise<SimResult> {
  let state: NarrativeState = scenario.initialState
    ? { ...scenario.initialState }
    : emptyState();

  const scenes: NarrativeTransitionIR[] = [];
  const proofPassRates: number[] = [];
  const valuations: number[] = [];
  const operatorCounts = new Map<MutationOperator, number>();
  let totalIterations = 0;

  for (const target of scenario.sceneTargets) {
    const convergeResult = await convergeScene(
      state, target, generate,
      { maxIterations: 4, candidatesPerIteration: 2 },
      scenario.seed + target.sceneIdx,
    );

    const ir = convergeResult.ir;
    scenes.push(ir);
    totalIterations += convergeResult.iterations;

    // Score: proof pass-rate for this scene
    const proofResults = runTier1(ir, state);
    const passCount = proofResults.filter(r => r.pass).length;
    proofPassRates.push(proofResults.length > 0 ? passCount / proofResults.length : 1);

    // Score: valuation via tension ledger
    const stateAfter = applyStoryOps(state, ir.ops);
    const ledger = deriveTensionLedger(stateAfter, target.sceneIdx);
    valuations.push(ledger.totalTension);

    // Track which operators dominated the convergence history
    for (const step of convergeResult.history) {
      if (step.operator) {
        operatorCounts.set(step.operator, (operatorCounts.get(step.operator) ?? 0) + 1);
      }
    }

    state = stateAfter;
  }

  const proofPassRate = proofPassRates.length > 0
    ? proofPassRates.reduce((a, b) => a + b, 0) / proofPassRates.length
    : 0;
  const meanValuation = valuations.length > 0
    ? valuations.reduce((a, b) => a + b, 0) / valuations.length
    : 0;
  const score = 0.5 * proofPassRate + 0.5 * (Math.min(meanValuation, 100) / 100);

  // Top operators: sort by count descending
  const topOperators = [...operatorCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([op]) => op);

  // Effective: fired ≥2 times
  const effectiveOperators = [...operatorCounts.entries()]
    .filter(([, count]) => count >= 2)
    .map(([op]) => op);

  return {
    scenarioId: scenario.scenarioId,
    seed: scenario.seed,
    proofPassRate,
    meanValuation,
    score,
    topOperators,
    scenes,
    effectiveOperators,
    totalIterations,
  };
}
