// Emotional Topology (C3, part 2) — story as a trajectory through an
// emotion manifold, scored against the 6 archetypal arcs (after Kurt Vonnegut
// / Reagan-Socolof-Acerbi computational narrative research).
//
// Each arc is a topological signature: the rise/fall pattern of audience
// emotional valence across scenes. We score the current story trajectory
// against each archetype and return the closest match.

import type { TensionLedger } from './futures.ts';

export type ArcArchetype =
  | 'rags_to_riches'          // monotone rise
  | 'riches_to_rags'          // monotone fall (tragedy)
  | 'man_in_hole'             // fall then rise (redemption)
  | 'icarus'                  // rise then fall (hubris)
  | 'cinderella'              // rise, fall, rise (two-beat redemption)
  | 'oedipus';                // fall, rise, fall (two-beat tragedy)

export interface TopologyScore {
  archetype: ArcArchetype;
  similarity: number;    // 0–1: dot-product cosine similarity with archetype template
  rank: number;          // 1 = closest match
}

export interface TopologyReport {
  trajectory: number[];         // normalized tension values per scene
  scores: TopologyScore[];
  dominantArc: ArcArchetype;
  coherence: number;            // 0–100: how cleanly the story fits any known arc
}

// Archetype templates: 6-point normalized tension trajectories.
// Values 0–1; will be resampled to match actual scene count.
const ARC_TEMPLATES: Record<ArcArchetype, number[]> = {
  rags_to_riches:  [0.1, 0.2, 0.4, 0.55, 0.75, 0.95],
  riches_to_rags:  [0.95, 0.75, 0.55, 0.4, 0.2, 0.1],
  man_in_hole:     [0.6, 0.3, 0.1, 0.2, 0.6, 0.9],
  icarus:          [0.2, 0.5, 0.75, 0.9, 0.6, 0.2],
  cinderella:      [0.3, 0.7, 0.4, 0.2, 0.6, 0.95],
  oedipus:         [0.8, 0.4, 0.7, 0.9, 0.5, 0.2],
};

function normalize(arr: number[]): number[] {
  const max = Math.max(...arr, 0.001);
  const min = Math.min(...arr);
  const range = max - min;
  if (range === 0) return arr.map(() => 0.5);
  return arr.map(v => (v - min) / range);
}

// Linear resample arr to targetLength points.
function resample(arr: number[], targetLength: number): number[] {
  if (arr.length === targetLength) return arr;
  if (arr.length === 1) return Array(targetLength).fill(arr[0]);
  const result: number[] = [];
  for (let i = 0; i < targetLength; i++) {
    const t = i / (targetLength - 1);
    const idx = t * (arr.length - 1);
    const lo = Math.floor(idx);
    const hi = Math.min(arr.length - 1, lo + 1);
    result.push(arr[lo] + (arr[hi] - arr[lo]) * (idx - lo));
  }
  return result;
}

function cosineSimilarity(a: number[], b: number[]): number {
  const dot = a.reduce((s, v, i) => s + v * b[i], 0);
  const magA = Math.sqrt(a.reduce((s, v) => s + v * v, 0));
  const magB = Math.sqrt(b.reduce((s, v) => s + v * v, 0));
  if (magA === 0 || magB === 0) return 0;
  return Math.max(0, Math.min(1, dot / (magA * magB)));
}

export function computeTopology(ledgers: TensionLedger[]): TopologyReport {
  if (ledgers.length === 0) {
    return {
      trajectory: [],
      scores: (Object.keys(ARC_TEMPLATES) as ArcArchetype[]).map((a, i) => ({
        archetype: a, similarity: 0, rank: i + 1,
      })),
      dominantArc: 'man_in_hole',
      coherence: 0,
    };
  }

  const rawTrajectory = ledgers.map(l => l.totalTension);
  const trajectory = normalize(rawTrajectory);
  const n = trajectory.length;

  const scores: TopologyScore[] = (Object.entries(ARC_TEMPLATES) as [ArcArchetype, number[]][])
    .map(([archetype, template]) => ({
      archetype,
      similarity: cosineSimilarity(trajectory, resample(template, n)),
      rank: 0,
    }))
    .sort((a, b) => b.similarity - a.similarity)
    .map((s, i) => ({ ...s, rank: i + 1 }));

  const dominant = scores[0];
  const coherence = Math.round(dominant.similarity * 100);

  return {
    trajectory: trajectory.map(v => Math.round(v * 1000) / 1000),
    scores,
    dominantArc: dominant.archetype,
    coherence,
  };
}

// Check whether the current trajectory is on track for a target arc.
// Used by the Convergence Loop to bias mutations toward a desired shape.
export function onTrackForArc(
  ledgers: TensionLedger[],
  target: ArcArchetype,
  minCoherence: number = 60,
): boolean {
  const report = computeTopology(ledgers);
  if (report.dominantArc !== target) return false;
  return report.coherence >= minCoherence;
}
