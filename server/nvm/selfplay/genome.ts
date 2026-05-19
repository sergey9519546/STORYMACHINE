// StoryGenome (G13) — compressed essence of a completed story run.
// Captures: mechanism fingerprint, dominant wound type, theme claim,
// reveal taxonomy, tension topology, voice vectors, arc archetype.
// Two genomes can be diffed (cosine similarity) and bred (genome of A + arc of B).

import type { Canon } from '../project/index.ts';
import type { NarrativeState } from '../state/NarrativeState.ts';
import type { ArcArchetype } from '../valuation/topology.ts';
import type { MutationOperator } from '../converge/operators.ts';

// ── Types ─────────────────────────────────────────────────────────────────────

/**
 * Compressed essence of a story — the minimal representation that captures
 * what makes it structurally distinct from other stories.
 */
export interface StoryGenome {
  /** Unique identifier (usually the story title or manifestId). */
  genomeId: string;
  /** Total scene count. */
  sceneCount: number;
  /** Dominant arc archetype (from topology analysis). */
  arcArchetype: ArcArchetype | 'unknown';
  /** Theme claim IDs argued in this story. */
  themeClaims: string[];
  /** Dominant wound type: most-frequent charId with highest distress. */
  dominantWound: string | null;
  /** Reveal taxonomy: proportion of payoffs that had multi-clue setups. */
  revealComplexity: number;   // 0–1: 0 = simple reveals, 1 = deeply layered
  /** Tension fingerprint: 5 normalized tension values (sampled at 20% intervals). */
  tensionProfile: [number, number, number, number, number];
  /** Voice vectors: proportion of op types in the corpus. */
  voiceVector: Record<string, number>;   // op kind → proportion
  /** Mutation operators most used in this run. */
  dominantOperators: MutationOperator[];
  /** Proportion of commits that were reverted (instability signal). */
  revertRate: number;
  /** Dramatic irony density: told-belief / total-belief ratio. */
  ironyDensity: number;
}

// ── extractGenome ─────────────────────────────────────────────────────────────

/**
 * Extract a StoryGenome from a completed Canon.
 */
export function extractGenome(
  canon: Canon,
  genomeId?: string,
  dominantOperators: MutationOperator[] = [],
): StoryGenome {
  const id = genomeId ?? canon.title ?? 'unnamed';
  const commits = canon.commits;
  const state = canon.state;
  const nonReverted = commits.filter(c => !c.reverted);
  const sceneCount = nonReverted.length;

  // Voice vector: count op kinds
  const opCounts: Record<string, number> = {};
  let totalOps = 0;
  for (const commit of nonReverted) {
    for (const op of commit.ops) {
      opCounts[op.op] = (opCounts[op.op] ?? 0) + 1;
      totalOps++;
    }
  }
  const voiceVector: Record<string, number> = {};
  for (const [kind, count] of Object.entries(opCounts)) {
    voiceVector[kind] = totalOps > 0 ? count / totalOps : 0;
  }

  // Dramatic irony density
  const allBeliefs = Object.values(state.characterBeliefs).flat();
  const toldBeliefs = allBeliefs.filter(b => b.source === 'told').length;
  const ironyDensity = allBeliefs.length > 0 ? toldBeliefs / allBeliefs.length : 0;

  // Revert rate
  const revertRate = commits.length > 0
    ? commits.filter(c => c.reverted).length / commits.length
    : 0;

  // Dominant wound: character with highest distress (fear + shame + distress)
  let dominantWound: string | null = null;
  let maxPain = -1;
  for (const [charId, emo] of Object.entries(state.characterEmotions)) {
    const pain = emo.distress + emo.fear + emo.shame;
    if (pain > maxPain) { maxPain = pain; dominantWound = charId; }
  }

  // Theme claims
  const themeClaims = state.themeArgument.map(t => t.claimId);

  // Reveal complexity: mean required clues per payoff (we don't have requiredClueIds in state
  // but we can approximate from clue-to-payoff ratio)
  const clueCount = state.clues.length;
  const payoffCount = state.payoffs.length;
  const revealComplexity = payoffCount > 0
    ? Math.min(clueCount / (payoffCount * 3), 1)   // 3 clues/payoff = complexity 1.0
    : 0;

  // Tension profile: sample 5 points from scene suspense progression
  // We reconstruct from the audienceState of the final state (simplification:
  // we don't have per-scene history in canon, so we synthesize a ramp)
  const finalSuspense = state.audienceState.suspense / 100;
  const tensionProfile: [number, number, number, number, number] = [
    finalSuspense * 0.2,
    finalSuspense * 0.45,
    finalSuspense * 0.65,
    finalSuspense * 0.85,
    finalSuspense,
  ];

  return {
    genomeId: id,
    sceneCount,
    arcArchetype: 'unknown',   // set by caller if topology is known
    themeClaims,
    dominantWound,
    revealComplexity,
    tensionProfile,
    voiceVector,
    dominantOperators,
    revertRate,
    ironyDensity,
  };
}

// ── diffGenomes ───────────────────────────────────────────────────────────────

/**
 * Compute a similarity score (0–1) between two genomes.
 * Uses cosine similarity on the tension profile + voice vector.
 */
export function diffGenomes(a: StoryGenome, b: StoryGenome): GenomeDiff {
  const tensionSim = cosineSimilarity(
    Array.from(a.tensionProfile),
    Array.from(b.tensionProfile),
  );

  // Merge voice vector keys
  const keys = new Set([...Object.keys(a.voiceVector), ...Object.keys(b.voiceVector)]);
  const aVec = [...keys].map(k => a.voiceVector[k] ?? 0);
  const bVec = [...keys].map(k => b.voiceVector[k] ?? 0);
  const voiceSim = cosineSimilarity(aVec, bVec);

  // Thematic overlap
  const aThemes = new Set(a.themeClaims);
  const bThemes = new Set(b.themeClaims);
  const intersection = [...aThemes].filter(t => bThemes.has(t)).length;
  const union = new Set([...aThemes, ...bThemes]).size;
  const thematicSim = union > 0 ? intersection / union : 1;

  // Arc match
  const arcMatch = a.arcArchetype === b.arcArchetype ? 1 : 0;

  // Composite similarity (weighted)
  const similarity = 0.35 * tensionSim + 0.30 * voiceSim + 0.20 * thematicSim + 0.15 * arcMatch;

  const differences: string[] = [];
  if (Math.abs(a.ironyDensity - b.ironyDensity) > 0.2)
    differences.push(`irony density: ${a.ironyDensity.toFixed(2)} vs ${b.ironyDensity.toFixed(2)}`);
  if (a.arcArchetype !== b.arcArchetype)
    differences.push(`arc: ${a.arcArchetype} vs ${b.arcArchetype}`);
  if (a.dominantWound !== b.dominantWound)
    differences.push(`wound: ${a.dominantWound} vs ${b.dominantWound}`);

  return { similarity, tensionSim, voiceSim, thematicSim, arcMatch, differences };
}

export interface GenomeDiff {
  /** Overall similarity score (0–1). */
  similarity: number;
  tensionSim: number;
  voiceSim: number;
  thematicSim: number;
  arcMatch: number;
  /** Human-readable list of notable differences. */
  differences: string[];
}

// ── breedGenomes ──────────────────────────────────────────────────────────────

/**
 * Breed two genomes: mechanism of A + arc of B → a new seed genome.
 * The resulting genome can be used to bias a fresh scenario.
 */
export function breedGenomes(a: StoryGenome, b: StoryGenome, newId: string): StoryGenome {
  // Voice: average the two voice vectors
  const keys = new Set([...Object.keys(a.voiceVector), ...Object.keys(b.voiceVector)]);
  const voiceVector: Record<string, number> = {};
  for (const k of keys) {
    voiceVector[k] = ((a.voiceVector[k] ?? 0) + (b.voiceVector[k] ?? 0)) / 2;
  }

  // Tension: interleave (A for first half, B for second half)
  const tensionProfile: [number, number, number, number, number] = [
    a.tensionProfile[0],
    a.tensionProfile[1],
    (a.tensionProfile[2] + b.tensionProfile[2]) / 2,
    b.tensionProfile[3],
    b.tensionProfile[4],
  ];

  // Theme: union
  const themeClaims = [...new Set([...a.themeClaims, ...b.themeClaims])];

  // Operators: prefer B's if it scored higher (caller can weight by score)
  const opSet = new Set([...a.dominantOperators, ...b.dominantOperators]);
  const dominantOperators = [...opSet].slice(0, 4) as MutationOperator[];

  return {
    genomeId: newId,
    sceneCount: Math.round((a.sceneCount + b.sceneCount) / 2),
    arcArchetype: b.arcArchetype,           // arc from B
    themeClaims,
    dominantWound: b.dominantWound,         // wound from B
    revealComplexity: (a.revealComplexity + b.revealComplexity) / 2,
    tensionProfile,
    voiceVector,
    dominantOperators,
    revertRate: (a.revertRate + b.revertRate) / 2,
    ironyDensity: (a.ironyDensity + b.ironyDensity) / 2,
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom < 1e-9 ? 1 : dot / denom;
}
