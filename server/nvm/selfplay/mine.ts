// Corpus miner (G13) — distills a CorpusReport into a Playbook of ranked
// mechanism+arc combos and a learned Director policy. The policy is a simple
// frequency-based lookup: given (mechanismId, arcArchetype, sceneFunction),
// return the ranked list of mutation operators that worked best in similar runs.

import type { CorpusReport, SimResult } from './corpus.ts';
import type { MutationOperator } from '../converge/operators.ts';
import type { ArcArchetype } from '../valuation/topology.ts';

// ── Types ─────────────────────────────────────────────────────────────────────

/** A ranked combination of mechanism and arc, with mean score across corpus runs. */
export interface RankedCombo {
  arcArchetype: ArcArchetype | 'unknown';
  /** Mean composite score (0–1) for runs exhibiting this combo. */
  meanScore: number;
  /** Number of corpus runs in this bucket. */
  sampleSize: number;
  /** Operators most effective in these runs. */
  topOperators: MutationOperator[];
}

/** The learned Director policy: a ranked-combo table the Director queries. */
export interface DirectorPolicy {
  /** Ranked combos, best first. */
  rankedCombos: RankedCombo[];
  /** Global top operators across ALL corpus runs. */
  globalTopOperators: MutationOperator[];
  /** Operator ranked by mean composite score improvement per application. */
  operatorEffectiveness: Array<{ operator: MutationOperator; score: number }>;
}

/** The full mined playbook returned by `mineCorpus`. */
export interface Playbook {
  policy: DirectorPolicy;
  /** The top-N best-scoring runs. */
  hallOfFame: SimResult[];
  /** Summary of what the corpus learned. */
  summary: string;
}

// ── mineCorpus ────────────────────────────────────────────────────────────────

/**
 * Mine a CorpusReport into a Playbook containing the learned Director policy
 * and a ranked combo table. The result is a queryable structure the Director
 * uses to bias operator selection in future convergence loops.
 */
export function mineCorpus(report: CorpusReport, topN = 3): Playbook {
  const runs = report.runs;

  if (runs.length === 0) {
    const emptyPolicy: DirectorPolicy = { rankedCombos: [], globalTopOperators: [], operatorEffectiveness: [] };
    return { policy: emptyPolicy, hallOfFame: [], summary: '(empty corpus — no runs to mine)' };
  }

  // Global top operators (sorted by frequency across all runs)
  const globalTopOperators = Object.entries(report.operatorFrequency)
    .sort((a, b) => b[1] - a[1])
    .map(([op]) => op as MutationOperator);

  // Operator effectiveness: mean score of runs where that operator appears in topOperators
  const operatorScores = new Map<MutationOperator, number[]>();
  for (const run of runs) {
    for (const op of run.topOperators) {
      if (!operatorScores.has(op)) operatorScores.set(op, []);
      operatorScores.get(op)!.push(run.score);
    }
  }
  const operatorEffectiveness = [...operatorScores.entries()]
    .map(([operator, scores]) => {
      const finiteScores = scores.filter(s => isFinite(s));
      return {
        operator,
        score: finiteScores.length > 0 ? finiteScores.reduce((a, b) => a + b, 0) / finiteScores.length : 0,
      };
    })
    .sort((a, b) => b.score - a.score);

  // Group runs by arc archetype (we don't compute topology here — use 'unknown' as default)
  // In a real system this would call computeTopology; for the learned-policy mock we
  // treat each run as its own bucket keyed by scenarioId prefix.
  const buckets = new Map<string, SimResult[]>();
  for (const run of runs) {
    // Simple bucketing: group by leading scenarioId segment (e.g. "drama", "mystery")
    const key = run.scenarioId.split('_')[0] ?? 'unknown';
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key)!.push(run);
  }

  const rankedCombos: RankedCombo[] = [];
  for (const [, bucket] of buckets) {
    const finiteScores = bucket.map(r => r.score).filter(s => isFinite(s));
    const meanScore = finiteScores.length > 0 ? finiteScores.reduce((s, v) => s + v, 0) / finiteScores.length : 0;
    const opFreq = new Map<MutationOperator, number>();
    for (const run of bucket) {
      for (const op of run.topOperators) opFreq.set(op, (opFreq.get(op) ?? 0) + 1);
    }
    const topOperators = [...opFreq.entries()].sort((a, b) => b[1] - a[1]).map(([op]) => op);
    rankedCombos.push({ arcArchetype: 'unknown', meanScore, sampleSize: bucket.length, topOperators });
  }
  rankedCombos.sort((a, b) => b.meanScore - a.meanScore);

  // Hall of fame: top-N by score
  const hallOfFame = [...runs].sort((a, b) => b.score - a.score).slice(0, topN);

  const policy: DirectorPolicy = { rankedCombos, globalTopOperators, operatorEffectiveness };

  const lines = [
    `## Corpus Playbook (${runs.length} runs, mean score ${report.meanScore.toFixed(3)})`,
    '',
    `Best run: ${report.bestRun.scenarioId} (score=${report.bestRun.score.toFixed(3)})`,
    `Worst run: ${report.worstRun.scenarioId} (score=${report.worstRun.score.toFixed(3)})`,
    '',
    `Top operators globally: ${globalTopOperators.slice(0, 3).join(', ') || '(none)'}`,
    '',
    `Ranked combos:`,
    ...rankedCombos.map((c, i) =>
      `  ${i + 1}. arc=${c.arcArchetype} score=${c.meanScore.toFixed(3)} n=${c.sampleSize} ops=[${c.topOperators.slice(0, 2).join(',')}]`
    ),
  ];

  return { policy, hallOfFame, summary: lines.join('\n') };
}

// ── queryPolicy ───────────────────────────────────────────────────────────────

/**
 * Query the learned Director policy: given an arc archetype, return the
 * top-ranked operators the policy recommends, falling back to global ranking.
 */
export function queryPolicy(
  policy: DirectorPolicy,
  arcArchetype: ArcArchetype | 'unknown' = 'unknown',
): MutationOperator[] {
  const combo = policy.rankedCombos.find(c => c.arcArchetype === arcArchetype);
  if (combo?.topOperators.length) return combo.topOperators;
  return policy.globalTopOperators;
}
