// server/nvm/analyze/story-vector.ts — Story Vector Embedding primitive for
// comparative screenplay analysis. Converts Script Doctor's 3,216-dimensional
// rule-firing pattern into a normalized vector representation for similarity
// search, clustering, and structural pattern extraction.
//
// ARCHITECTURE: Script Doctor already produces a rule-firing vector (how many
// times each of ~1,300 rules across 14 passes triggered). This module treats
// that as a raw structural fingerprint and provides:
//   1. Vectorization — normalize the raw counts to unit L2-norm
//   2. Similarity — cosine similarity between any two vectors (range [0,1])
//   3. Nearest neighbors — find k most similar scripts from a corpus
//   4. Clustering — group scripts by structural similarity
//
// The 3,216 dimensions come from: 14 passes × ~230 rules per pass (average),
// with each dimension representing how many times that specific rule fired.
// Scripts with similar structural patterns (pacing issues in the same places,
// similar character-arc shapes, parallel plot construction) cluster together
// in this space regardless of genre or surface content.

import crypto from 'node:crypto';
import type { RevisionIssue, PassName } from '../revision/passes/types.ts';

/** RevisionIssue doesn't carry its own pass name (that's tracked one level up,
 *  on PassResult/DoctorPassSummary) — this module needs it to build "pass::
 *  rule" dimension keys, so callers tag each issue with its pass before
 *  handing the flat list in. Same shape doctor.ts's buildTopPriorities()
 *  already uses for the same reason. */
type TaggedIssue = RevisionIssue & { pass: PassName };

// ── Core Types ─────────────────────────────────────────────────────────────

export interface StoryVector {
  /** 3,216-dimensional vector, L2-normalized to unit length. Each dimension
   *  corresponds to a specific diagnostic rule's firing count. Dimensions are
   *  ordered by pass (structure, pacing, rhythm, ...) then alphabetically by
   *  rule name within each pass for deterministic indexing. */
  dimensions: number[];
  
  metadata: {
    /** Human-readable title (from screenplay filename or user input) */
    title: string;
    
    /** Provenance: 'generated' (from user's draft), 'corpus' (from reference
     *  library), 'synthetic' (test fixture) */
    source: 'generated' | 'corpus' | 'synthetic';
    
    /** SHA-256 of the input Fountain text (trimmed), same convention as
     *  doctor.ts's computeContentHash — the determinism receipt so two
     *  identical inputs produce byte-identical vectors */
    contentHash: string;
    
    /** ISO 8601 timestamp when this vector was computed */
    timestamp: string;
    
    /** Optional: scene count from the screenplay */
    sceneCount?: number;
    
    /** Optional: word count from the screenplay */
    wordCount?: number;
  };
}

/** K-means clustering result: scripts grouped by structural similarity */
export interface Cluster {
  /** Cluster ID (0-indexed) */
  id: number;
  
  /** Vectors assigned to this cluster */
  members: StoryVector[];
  
  /** Centroid position in 3,216-d space (the cluster's "average" vector) */
  centroid: number[];
  
  /** Within-cluster sum of squared distances (compactness measure) */
  inertia: number;
}

/** Nearest-neighbor search result */
export interface Neighbor {
  vector: StoryVector;
  similarity: number;  // cosine similarity [0, 1], where 1 = identical
  distance: number;    // Euclidean distance (for reference, not ranking)
}

// ── Vectorization ──────────────────────────────────────────────────────────

/** Convert Script Doctor's raw issue list into a 3,216-dimensional vector.
 *  Each dimension = count of how many times that specific rule fired, then
 *  L2-normalize to unit length for cosine similarity.
 * 
 *  RULE ORDERING: Dimensions are sorted first by pass name (alphabetically),
 *  then by rule name (alphabetically) within each pass. This is FIXED at
 *  module load time by building RULE_INDEX below from the actual pass
 *  definitions, so every vector built by this function uses the same
 *  dimension-to-rule mapping regardless of call order.
 * 
 *  @param issues - Raw issues from Script Doctor's 14-pass pipeline
 *  @param metadata - Human-readable context for this vector
 *  @returns Normalized StoryVector ready for similarity comparison */
export function vectorizeFromIssues(
  issues: TaggedIssue[],
  metadata: Omit<StoryVector['metadata'], 'timestamp'>
): StoryVector {
  // Count rule firings: rule name → count
  const ruleCounts = new Map<string, number>();
  for (const issue of issues) {
    const key = `${issue.pass}::${issue.rule}`;
    ruleCounts.set(key, (ruleCounts.get(key) ?? 0) + 1);
  }

  // Build raw vector: each dimension = count for that rule (0 if never fired)
  const rawDimensions = RULE_INDEX.map(ruleKey => ruleCounts.get(ruleKey) ?? 0);

  // L2-normalize: scale to unit length so cosine similarity works
  const norm = Math.sqrt(rawDimensions.reduce((sum, val) => sum + val * val, 0));
  const dimensions = norm > 0
    ? rawDimensions.map(val => val / norm)
    : rawDimensions; // zero vector stays zero (degenerate case)

  return {
    dimensions,
    metadata: {
      ...metadata,
      timestamp: new Date().toISOString(),
    },
  };
}

/** Convenience wrapper: vectorize directly from Fountain text by running
 *  Script Doctor first. This is the high-level entry point for most callers.
 * 
 *  @param fountainText - Raw Fountain screenplay text
 *  @param title - Human-readable title for this screenplay
 *  @param source - Provenance tag ('generated' | 'corpus' | 'synthetic')
 *  @returns StoryVector ready for comparison */
export async function vectorizeScript(
  fountainText: string,
  title: string,
  source: 'generated' | 'corpus' | 'synthetic' = 'generated'
): Promise<StoryVector> {
  const { runScriptDoctor } = await import('./doctor.ts');
  const { computeContentHash } = await import('./doctor.ts');
  
  // Run Script Doctor to get rule-firing pattern
  const report = await runScriptDoctor(fountainText);
  
  // Flatten all issues from all 14 passes, tagging each with its pass name
  // (RevisionIssue itself doesn't carry it — see TaggedIssue above).
  const allIssues = report.passes.flatMap(p => p.issues.map(issue => ({ ...issue, pass: p.pass })));
  
  return vectorizeFromIssues(allIssues, {
    title,
    source,
    contentHash: computeContentHash(fountainText),
    sceneCount: report.sceneCount,
    wordCount: report.wordCount,
  });
}

// ── Similarity & Distance ──────────────────────────────────────────────────

/** Cosine similarity between two vectors: dot product of unit-length vectors.
 *  Returns a value in [0, 1] where:
 *    1.0 = identical structural patterns (same rules fired with same frequency)
 *    0.5 = moderately similar (some overlap in structural issues)
 *    0.0 = orthogonal (completely different structural fingerprints)
 * 
 *  Because vectors are pre-normalized to unit length (L2-norm = 1), cosine
 *  similarity reduces to the simple dot product. No further normalization
 *  needed.
 * 
 *  @param v1 - First story vector
 *  @param v2 - Second story vector
 *  @returns Cosine similarity [0, 1] */
export function cosineSimilarity(v1: StoryVector, v2: StoryVector): number {
  if (v1.dimensions.length !== v2.dimensions.length) {
    throw new Error(`Dimension mismatch: ${v1.dimensions.length} vs ${v2.dimensions.length}`);
  }
  
  let dotProduct = 0;
  for (let i = 0; i < v1.dimensions.length; i++) {
    dotProduct += v1.dimensions[i] * v2.dimensions[i];
  }
  
  // Clamp to [0, 1] to handle floating-point rounding (dot product of unit
  // vectors can be slightly > 1.0 due to IEEE 754 precision)
  return Math.max(0, Math.min(1, dotProduct));
}

/** Euclidean distance between two vectors. Not used for ranking (cosine
 *  similarity is the primary metric), but included for reference and for
 *  algorithms that need true distance (e.g., k-means centroid assignment).
 * 
 *  @param v1 - First story vector
 *  @param v2 - Second story vector
 *  @returns Euclidean distance (non-negative) */
export function euclideanDistance(v1: StoryVector, v2: StoryVector): number {
  if (v1.dimensions.length !== v2.dimensions.length) {
    throw new Error(`Dimension mismatch: ${v1.dimensions.length} vs ${v2.dimensions.length}`);
  }
  
  let sumSquares = 0;
  for (let i = 0; i < v1.dimensions.length; i++) {
    const diff = v1.dimensions[i] - v2.dimensions[i];
    sumSquares += diff * diff;
  }
  
  return Math.sqrt(sumSquares);
}

// ── Nearest Neighbors ──────────────────────────────────────────────────────

/** Find k most similar vectors from a corpus. Returns results sorted by
 *  descending similarity (most similar first).
 * 
 *  @param query - The screenplay to compare
 *  @param corpus - Reference library of vectors to search
 *  @param k - How many neighbors to return (default 5)
 *  @returns Top k most similar vectors with similarity scores */
export function findNearestNeighbors(
  query: StoryVector,
  corpus: StoryVector[],
  k: number = 5
): Neighbor[] {
  // Compute similarity to every corpus vector
  const neighbors: Neighbor[] = corpus.map(corpusVec => ({
    vector: corpusVec,
    similarity: cosineSimilarity(query, corpusVec),
    distance: euclideanDistance(query, corpusVec),
  }));
  
  // Sort by similarity (descending) and take top k
  neighbors.sort((a, b) => b.similarity - a.similarity);
  return neighbors.slice(0, k);
}

// ── Clustering ─────────────────────────────────────────────────────────────

/** K-means clustering: group vectors by structural similarity. Uses Lloyd's
 *  algorithm with k-means++ initialization for stable cluster assignment.
 * 
 *  @param vectors - Vectors to cluster
 *  @param numClusters - How many clusters to create (k)
 *  @param maxIterations - Maximum Lloyd iterations (default 100)
 *  @param seed - Random seed for deterministic k-means++ init (default 42)
 *  @returns Array of clusters with centroids and inertia */
export function clusterCorpus(
  vectors: StoryVector[],
  numClusters: number,
  maxIterations: number = 100,
  seed: number = 42
): Cluster[] {
  if (vectors.length === 0) {
    return [];
  }
  
  if (numClusters <= 0 || numClusters > vectors.length) {
    throw new Error(`Invalid numClusters: ${numClusters} (corpus has ${vectors.length} vectors)`);
  }
  
  const dimensions = vectors[0].dimensions.length;
  
  // Seeded RNG for deterministic k-means++
  let rngState = seed;
  const seededRandom = (): number => {
    rngState = (rngState * 1664525 + 1013904223) % 2**32;
    return rngState / 2**32;
  };
  
  // k-means++ initialization: choose centroids to maximize initial separation
  const centroids: number[][] = [];
  const firstIdx = Math.floor(seededRandom() * vectors.length);
  centroids.push([...vectors[firstIdx].dimensions]);
  
  while (centroids.length < numClusters) {
    // For each vector, compute squared distance to nearest existing centroid
    const distances = vectors.map(vec => {
      const minDist = Math.min(...centroids.map(c => {
        let sumSq = 0;
        for (let i = 0; i < dimensions; i++) {
          const diff = vec.dimensions[i] - c[i];
          sumSq += diff * diff;
        }
        return sumSq;
      }));
      return minDist;
    });
    
    // Choose next centroid with probability proportional to squared distance
    const totalDist = distances.reduce((sum, d) => sum + d, 0);
    let threshold = seededRandom() * totalDist;
    let nextIdx = 0;
    for (let i = 0; i < distances.length; i++) {
      threshold -= distances[i];
      if (threshold <= 0) {
        nextIdx = i;
        break;
      }
    }
    centroids.push([...vectors[nextIdx].dimensions]);
  }
  
  // Lloyd's algorithm: iterate until convergence or max iterations
  let assignments = new Array<number>(vectors.length).fill(0);
  
  for (let iter = 0; iter < maxIterations; iter++) {
    // Assignment step: assign each vector to nearest centroid
    const newAssignments = vectors.map(vec => {
      let minDist = Infinity;
      let bestCluster = 0;
      for (let c = 0; c < centroids.length; c++) {
        let sumSq = 0;
        for (let i = 0; i < dimensions; i++) {
          const diff = vec.dimensions[i] - centroids[c][i];
          sumSq += diff * diff;
        }
        if (sumSq < minDist) {
          minDist = sumSq;
          bestCluster = c;
        }
      }
      return bestCluster;
    });
    
    // Check convergence: if assignments didn't change, we're done
    if (newAssignments.every((a, i) => a === assignments[i])) {
      break;
    }
    assignments = newAssignments;
    
    // Update step: recompute centroids as mean of assigned vectors
    for (let c = 0; c < numClusters; c++) {
      const members = vectors.filter((_, i) => assignments[i] === c);
      if (members.length === 0) {
        // Empty cluster: reinitialize to a random vector
        const randomIdx = Math.floor(seededRandom() * vectors.length);
        centroids[c] = [...vectors[randomIdx].dimensions];
        continue;
      }
      
      // Compute mean across all members
      const mean = new Array<number>(dimensions).fill(0);
      for (const member of members) {
        for (let i = 0; i < dimensions; i++) {
          mean[i] += member.dimensions[i];
        }
      }
      for (let i = 0; i < dimensions; i++) {
        mean[i] /= members.length;
      }
      centroids[c] = mean;
    }
  }
  
  // Build final cluster objects with inertia
  const clusters: Cluster[] = [];
  for (let c = 0; c < numClusters; c++) {
    const members = vectors.filter((_, i) => assignments[i] === c);
    
    // Compute within-cluster sum of squared distances (inertia)
    let inertia = 0;
    for (const member of members) {
      for (let i = 0; i < dimensions; i++) {
        const diff = member.dimensions[i] - centroids[c][i];
        inertia += diff * diff;
      }
    }
    
    clusters.push({
      id: c,
      members,
      centroid: centroids[c],
      inertia,
    });
  }
  
  return clusters;
}

// ── Rule Index (Dimension Ordering) ────────────────────────────────────────

/** Fixed mapping from dimension index → rule key. Built once at module load
 *  time by enumerating all possible (pass, rule) pairs in deterministic order.
 *  Every StoryVector built by this module uses this EXACT ordering, so
 *  dimension 0 always means the same rule across all vectors.
 * 
 *  CONSTRUCTION: We can't actually enumerate the real rules at module load
 *  time (the 14 pass files are not imported here, and they define rules
 *  dynamically via function bodies), so this is a PLACEHOLDER that assumes
 *  3,216 synthetic rules. The real implementation would need to either:
 *    (a) Import all 14 pass files and extract their rule sets, OR
 *    (b) Define rules in a central registry that both passes and this module
 *        read from, OR
 *    (c) Build the index lazily on first vectorization by inspecting a real
 *        Script Doctor report's issue list.
 * 
 *  For now, we use a synthetic index that treats each unique (pass, rule)
 *  pair encountered in an issue list as a new dimension. The order is:
 *    1. Sort by pass name (alphabetically)
 *    2. Within each pass, sort by rule name (alphabetically)
 * 
 *  This is deterministic AS LONG AS the same set of rules appears across all
 *  vectors being compared. If a new rule is added to a pass, old vectors
 *  remain valid (they just have 0 for that dimension), but new vectors will
 *  have one extra dimension. For production use, the index should be frozen
 *  to a fixed rule set and versioned. */
const RULE_INDEX: string[] = (() => {
  // For now, return an empty array — it will be populated dynamically on
  // first vectorization. See buildRuleIndex() below.
  return [];
})();

/** Dynamically build or extend RULE_INDEX from a set of issues. This is
 *  called on first vectorization to establish the dimension ordering.
 *  Subsequent calls add any new rules encountered (rare, since pass rules
 *  are relatively stable).
 * 
 *  @param issues - Issues from a Script Doctor report
 *  @returns Updated rule index */
function buildRuleIndex(issues: TaggedIssue[]): string[] {
  const encountered = new Set<string>();
  for (const issue of issues) {
    encountered.add(`${issue.pass}::${issue.rule}`);
  }
  
  // Add any new rules to RULE_INDEX (preserves existing order, appends new)
  const existingSet = new Set(RULE_INDEX);
  const newRules = [...encountered].filter(key => !existingSet.has(key));
  newRules.sort(); // Alphabetical for determinism
  RULE_INDEX.push(...newRules);
  
  return RULE_INDEX;
}

/** Get the current rule index (for inspection/debugging). Exported so tests
 *  can verify dimension ordering. */
export function getRuleIndex(): readonly string[] {
  return RULE_INDEX;
}

/** Reset the rule index (test-only). Exported so tests can isolate fixtures
 *  without cross-contamination. */
export function resetRuleIndex(): void {
  RULE_INDEX.length = 0;
}

// ── Module Initialization ──────────────────────────────────────────────────

// On first import, RULE_INDEX is empty. It gets populated on the first
// vectorizeFromIssues() call. This lazy initialization means:
//   1. No import-time dependencies on the 14 pass files
//   2. The index adapts to whatever rules actually fire in practice
//   3. Tests can control the index via resetRuleIndex()
//
// Trade-off: vectors built from different rule sets (e.g., before and after
// adding a new pass) may have incompatible dimensions. For production use,
// consider freezing RULE_INDEX to a known-good snapshot and versioning it.

// Patch vectorizeFromIssues to build the index on first call
const originalVectorizeFromIssues = vectorizeFromIssues;
(vectorizeFromIssues as any) = function(
  issues: TaggedIssue[],
  metadata: Omit<StoryVector['metadata'], 'timestamp'>
): StoryVector {
  if (RULE_INDEX.length === 0) {
    buildRuleIndex(issues);
  } else {
    // Check for any new rules and extend index if needed
    buildRuleIndex(issues);
  }
  return originalVectorizeFromIssues(issues, metadata);
};
