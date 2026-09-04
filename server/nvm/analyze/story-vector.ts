// server/nvm/analyze/story-vector.ts — Story Vector Embedding primitive for
// comparative screenplay analysis. Converts Script Doctor's rule-firing
// pattern into a normalized vector representation for similarity search,
// clustering, and structural pattern extraction.
//
// ARCHITECTURE: Script Doctor already produces a rule-firing vector (how many
// times each rule across the 14 passes triggered). This module treats that as
// a raw structural fingerprint and provides:
//   1. Vectorization — normalize the raw counts to unit L2-norm
//   2. Alignment — project vectors onto one shared dimension space
//   3. Similarity — cosine similarity between any two vectors (range [0,1])
//   4. Nearest neighbors — find k most similar scripts from a corpus
//   5. Clustering — group scripts by structural similarity
//
// DIMENSION COUNT IS NOT FIXED. RULE_INDEX (bottom of this file) is built
// lazily from the (pass, rule) keys actually encountered, so a vector's length
// is "how many distinct rules this process has seen so far", not a constant.
// This header used to state a fixed 3,2xx-dimensional space; it never was one.
// Every vector therefore carries `ruleKeys` — its own dimension-to-rule
// mapping — and alignVectors() reconciles vectors by rule NAME before any
// distance math. Scripts with similar structural patterns (pacing issues in
// the same places, similar character-arc shapes, parallel plot construction)
// cluster together in this space regardless of genre or surface content.

import crypto from 'node:crypto';
import type { RevisionIssue, PassName } from '../revision/passes/types.ts';
import type { ScriptDoctorReport } from './types.ts';
import { isWholeDraftAnalysisComplete } from '../../lib/analysis-completeness.ts';

/** RevisionIssue doesn't carry its own pass name (that's tracked one level up,
 *  on PassResult/DoctorPassSummary) — this module needs it to build "pass::
 *  rule" dimension keys, so callers tag each issue with its pass before
 *  handing the flat list in. Same shape doctor.ts's buildTopPriorities()
 *  already uses for the same reason. */
type TaggedIssue = RevisionIssue & { pass: PassName };

// ── Core Types ─────────────────────────────────────────────────────────────

export interface StoryVector {
  /** L2-normalized (unit length) vector. Each dimension corresponds to one
   *  specific diagnostic rule's firing count. The dimension count is NOT
   *  fixed: RULE_INDEX is built lazily from the rules actually encountered
   *  (see its comment below), so two vectors built in different processes —
   *  or in the same process from different scripts — routinely have different
   *  lengths. `ruleKeys` is what makes them comparable anyway. */
  dimensions: number[];

  /** The exact dimension-to-rule mapping this vector was built against:
   *  ruleKeys[i] is the "pass::rule" key that dimensions[i] counts.
   *
   *  WHY THIS EXISTS (2026-08-24 fix). RULE_INDEX is a per-process, lazily
   *  grown, encounter-ordered list. Two consequences made every multi-vector
   *  comparison unsafe before this field existed: (1) a vector built earlier
   *  in a process is SHORTER than one built later, so cosineSimilarity threw
   *  "Dimension mismatch"; (2) across processes the same index position can
   *  denote a DIFFERENT rule, because the append order depends on which
   *  scripts were vectorized first — which is silently wrong rather than
   *  loud. Carrying the axis labels on the vector lets alignVectors() project
   *  everything into one shared, sorted key space by NAME instead of by
   *  position, which is correct in both cases.
   *
   *  Optional only for backward compatibility with vectors deserialized from
   *  a pre-2026-08-24 cache file. Anything this module builds always sets it,
   *  and server/lib/corpus-loader.ts treats its absence as a stale cache row. */
  ruleKeys?: readonly string[];


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

    /** Present only when vectorizeScript confirmed that every diagnostic pass
     *  covered the complete submitted draft. Corpus caches require this
     *  receipt so a legacy prefix-only vector cannot be reused as a
     *  whole-draft comparison. */
    wholeDraftAnalysisComplete?: true;
  };
}

/** K-means clustering result: scripts grouped by structural similarity */
export interface Cluster {
  /** Cluster ID (0-indexed) */
  id: number;
  
  /** Vectors assigned to this cluster */
  members: StoryVector[];
  
  /** Centroid position in the cluster run's aligned dimension space (the
   *  cluster's "average" vector) */
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

/** Convert Script Doctor's raw issue list into a story vector. Each dimension
 *  = count of how many times that specific rule fired, then L2-normalize to
 *  unit length for cosine similarity. The number of dimensions is however many
 *  distinct (pass, rule) keys RULE_INDEX holds at call time — see the header.
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
type VectorizeFromIssuesFn = (
  issues: TaggedIssue[],
  metadata: Omit<StoryVector['metadata'], 'timestamp'>
) => StoryVector;

function vectorizeFromIssuesCore(
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
    // Snapshot, not a live reference: RULE_INDEX keeps growing after this
    // call, and this vector's axes are frozen at the length it had here.
    ruleKeys: [...RULE_INDEX],
    metadata: {
      ...metadata,
      timestamp: new Date().toISOString(),
    },
  };
}

// `vectorizeFromIssues` is declared as a typed `let` (not `export function`)
// specifically so it CAN be reassigned below, once, to a wrapper that builds
// RULE_INDEX on first call — see "Module Initialization" further down. A
// plain `export function` binding is not reassignable (tsc: "Cannot assign
// to 'X' because it is a function", TS2630), which is why this used to be
// patched via `(vectorizeFromIssues as any) = ...`. The `let` binding is
// still a live ESM export (function/let/const exports are all live
// bindings), so external behavior — importers always observe the
// index-building wrapper, never the bare core implementation — is unchanged.
export let vectorizeFromIssues: VectorizeFromIssuesFn = vectorizeFromIssuesCore;

/** Convenience wrapper: vectorize directly from Fountain text by running
 *  Script Doctor first. This is the high-level entry point for most callers.
 *
 *  IN-PROCESS. The doctor runs on the calling thread, which is right for a
 *  test or a CLI script and wrong for an Express route: one such call holds
 *  Node's event loop for the whole analysis and every other user's request
 *  waits behind it. Server callers want vectorizeScriptOffThread below.
 *
 *  @param fountainText - Raw Fountain screenplay text
 *  @param title - Human-readable title for this screenplay
 *  @param source - Provenance tag ('generated' | 'corpus' | 'synthetic')
 *  @returns StoryVector ready for comparison
 *  @throws when the doctor could not analyze the complete submitted draft */
export async function vectorizeScript(
  fountainText: string,
  title: string,
  source: 'generated' | 'corpus' | 'synthetic' = 'generated'
): Promise<StoryVector> {
  const { runScriptDoctor } = await import('./doctor.ts');
  const report = await runScriptDoctor(fountainText);
  return vectorizeFromReport(report, fountainText, title, source);
}

/** The off-thread twin of vectorizeScript: the identical vector, but the
 *  Script Doctor half runs on a worker thread (doctor-pool.ts) instead of
 *  holding Node's event loop for the whole analysis.
 *
 *  This is the entry point every SERVER caller should use. Two of them exist,
 *  and the second is why this matters more than it looks: the route
 *  (POST /api/nvm/analyze/compare) vectorizes ONE draft, but the corpus loader
 *  (server/lib/corpus-loader.ts) vectorizes all 20 tracked reference
 *  screenplays whenever data/screenplays/.vectors is cold — which it is in
 *  every fresh checkout, because data/ is gitignored. That made the first
 *  compare request after any install run twenty consecutive full analyses
 *  on the main thread, with every other request in the server queued behind
 *  them.
 *
 *  vectorizeScript above stays in-process for tests, CLI scripts and anything
 *  that would rather not spawn a thread; doctor-pool.ts falls back to exactly
 *  that path by itself whenever workers cannot run in an environment, so this
 *  function is never WORSE than the in-process one.
 *
 *  Only the doctor call moves. The counting arithmetic stays on the
 *  coordinator, for the reason vectorizeFromReport's comment gives.
 *
 *  @param opts.signal - cancels the analysis outright when the caller has gone
 *         away. doctor-pool.ts terminates the worker to do it: the doctor is a
 *         synchronous CPU loop with no await point at which a cooperative flag
 *         could be observed.
 *  @throws when the doctor could not analyze the complete submitted draft */
export async function vectorizeScriptOffThread(
  fountainText: string,
  title: string,
  source: 'generated' | 'corpus' | 'synthetic' = 'generated',
  opts?: { signal?: AbortSignal }
): Promise<StoryVector> {
  const { runScriptDoctorOffThread } = await import('./doctor-pool.ts');
  const report = await runScriptDoctorOffThread(
    fountainText,
    undefined,
    opts?.signal ? { signal: opts.signal } : undefined,
  );
  return vectorizeFromReport(report, fountainText, title, source);
}

/** Build the vector for a Script Doctor report that has ALREADY been produced
 *  — the half of vectorizeScript that is not analysis.
 *
 *  ── WHY THE SPLIT EXISTS (2026-09-04) ─────────────────────────────────────
 *  vectorizeScript is two very different things welded together: a
 *  runScriptDoctor call, and about a millisecond of counting arithmetic.
 *  Measured on a 150-scene synthetic draft in this container: 613 ms inside
 *  the doctor, 1.35 ms in everything below it (707 issues → 464 dimensions).
 *  Only the first half is the event-loop hazard doctor-pool.ts exists for.
 *
 *  And only the first half can move off-thread without a consequence. The
 *  arithmetic reads and EXTENDS RULE_INDEX — per-process, append-only,
 *  encounter-ordered module state (see its comment at the bottom of this
 *  file). Run it in a worker and a vector's axis space becomes a function of
 *  WHICH of the pool's workers served the request, so `dimensions.length` —
 *  which POST /api/nvm/analyze/compare reports back to the caller — would
 *  start varying between two identical submissions to the same server.
 *  Correctness would survive that (every vector carries its own `ruleKeys`
 *  and alignVectors reconciles by NAME before any distance math, which is
 *  exactly what the 2026-08-24 fix built), but a shipped number would start
 *  moving for a reason no reader could reconstruct. Keeping the index on the
 *  coordinator keeps that number exactly what it was before the doctor moved:
 *  this change is meant to move no number at all.
 *
 *  @param report - a whole-draft report for `fountainText`
 *  @param fountainText - the text that produced it, hashed here for the
 *         vector's determinism receipt exactly as vectorizeScript always did
 *  @throws when the doctor could not analyze the complete submitted draft */
export async function vectorizeFromReport(
  report: ScriptDoctorReport,
  fountainText: string,
  title: string,
  source: 'generated' | 'corpus' | 'synthetic' = 'generated'
): Promise<StoryVector> {
  if (!isWholeDraftAnalysisComplete(report)) {
    throw new Error('Story vector requires a complete whole-draft analysis.');
  }
  const { computeContentHash } = await import('./doctor.ts');

  // Flatten all issues from all 14 passes, tagging each with its pass name
  // (RevisionIssue itself doesn't carry it — see TaggedIssue above).
  const allIssues = report.passes.flatMap(p => p.issues.map(issue => ({ ...issue, pass: p.pass })));

  const vector = vectorizeFromIssues(allIssues, {
    title,
    source,
    contentHash: computeContentHash(fountainText),
    sceneCount: report.sceneCount,
    wordCount: report.wordCount,
  });
  return {
    ...vector,
    metadata: { ...vector.metadata, wholeDraftAnalysisComplete: true },
  };
}

// ── Dimension Alignment ────────────────────────────────────────────────────

/** Project a set of vectors into one shared, deterministic dimension space so
 *  they can actually be compared.
 *
 *  THE PROBLEM THIS SOLVES. RULE_INDEX (below) is per-process, append-only and
 *  ENCOUNTER-ORDERED. Vectorize a user's draft, then the corpus, and the draft
 *  ends up with fewer dimensions than every corpus entry — which is exactly
 *  what POST /api/nvm/analyze/compare did on every single request, producing
 *  "Dimension mismatch: 2 vs 185" out of cosineSimilarity and a 500. Worse,
 *  the same position can mean a different rule in a different process (the
 *  append order follows whichever script was vectorized first), so a warm
 *  corpus cache could line up positionally and still be comparing unrelated
 *  rules — wrong numbers with no error at all. clusterCorpus has no length
 *  guard whatsoever, so there the failure is a silent NaN centroid.
 *
 *  THE FIX. Every vector carries `ruleKeys` (its own axis labels). Take the
 *  union of all keys, SORT it (so the result depends only on the set of keys
 *  present, never on call order or on which process built which vector), and
 *  rewrite each vector's dimensions into that order, filling 0 for a rule a
 *  given vector never saw. Zero is the honest value: an absent key means that
 *  rule fired zero times.
 *
 *  This is loss-free and geometry-preserving. Re-projection is a permutation
 *  plus zero-extension, and neither changes an L2 norm or a dot product, so
 *  aligned vectors stay unit-length and every similarity/distance computed
 *  from them is the value the un-aligned math was reaching for.
 *
 *  Legacy inputs: a vector with no `ruleKeys` (deserialized from a cache file
 *  written before the field existed) cannot be projected, because nothing
 *  records what its positions meant. If every input already has the same
 *  length, they are returned untouched — the pre-existing positional
 *  assumption, unchanged. If lengths differ, this throws rather than guessing,
 *  because guessing is how silently-wrong similarity gets shipped.
 *
 *  @param vectors - Vectors to bring into a common space
 *  @returns Vectors with identical, sorted dimension ordering (input order
 *           preserved; metadata carried through untouched) */
export function alignVectors(vectors: StoryVector[]): StoryVector[] {
  if (vectors.length <= 1) return vectors;

  const allKeyed = vectors.every(v => v.ruleKeys !== undefined);
  if (!allKeyed) {
    const lengths = new Set(vectors.map(v => v.dimensions.length));
    if (lengths.size === 1) return vectors;
    throw new Error(
      `Cannot align vectors of differing length (${[...lengths].join(', ')}) without ruleKeys — `
      + 're-vectorize the inputs so each carries its dimension-to-rule mapping.',
    );
  }

  // Fast path: identical axis labels already (the common case once every
  // vector in a request came from the same primed index).
  const first = vectors[0].ruleKeys as readonly string[];
  const alreadyAligned = vectors.every(v => {
    const keys = v.ruleKeys as readonly string[];
    return keys.length === first.length && keys.every((k, i) => k === first[i]);
  });
  if (alreadyAligned) return vectors;

  const union = new Set<string>();
  for (const v of vectors) for (const key of v.ruleKeys as readonly string[]) union.add(key);
  const sharedKeys = [...union].sort();

  return vectors.map(v => {
    const keys = v.ruleKeys as readonly string[];
    const byKey = new Map<string, number>();
    for (let i = 0; i < keys.length; i++) byKey.set(keys[i], v.dimensions[i] ?? 0);
    return {
      ...v,
      dimensions: sharedKeys.map(key => byKey.get(key) ?? 0),
      ruleKeys: sharedKeys,
    };
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
 *  The query and the corpus are aligned onto a shared dimension space first
 *  (see alignVectors) — a draft vectorized before the corpus has a shorter,
 *  differently-ordered index, and comparing it raw either throws or silently
 *  compares the wrong rules. The returned `vector` is the caller's ORIGINAL
 *  corpus object, not the aligned copy, so object identity and any cached
 *  dimensions the caller holds are left alone.
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
  const [alignedQuery, ...alignedCorpus] = alignVectors([query, ...corpus]);

  // Compute similarity to every corpus vector
  const neighbors: Neighbor[] = alignedCorpus.map((alignedVec, i) => ({
    vector: corpus[i],
    similarity: cosineSimilarity(alignedQuery, alignedVec),
    distance: euclideanDistance(alignedQuery, alignedVec),
  }));

  // Sort by similarity (descending) and take top k
  neighbors.sort((a, b) => b.similarity - a.similarity);
  return neighbors.slice(0, k);
}

// ── Clustering ─────────────────────────────────────────────────────────────

/** K-means clustering: group vectors by structural similarity. Uses Lloyd's
 *  algorithm with k-means++ initialization for stable cluster assignment.
 *
 *  Inputs are aligned onto a shared dimension space first (see alignVectors).
 *  This matters more here than anywhere else in the module: every distance
 *  loop below indexes `dimensions[i]` with NO length guard, so a vector
 *  shorter than the first one reads `undefined` past its end and propagates
 *  NaN through every centroid, every assignment and every inertia — a wrong
 *  clustering with nothing thrown to catch it. Members and centroids in the
 *  returned clusters are therefore expressed in the aligned space.
 *
 *  @param inputVectors - Vectors to cluster
 *  @param numClusters - How many clusters to create (k)
 *  @param maxIterations - Maximum Lloyd iterations (default 100)
 *  @param seed - Random seed for deterministic k-means++ init (default 42)
 *  @returns Array of clusters with centroids and inertia */
export function clusterCorpus(
  inputVectors: StoryVector[],
  numClusters: number,
  maxIterations: number = 100,
  seed: number = 42
): Cluster[] {
  if (inputVectors.length === 0) {
    return [];
  }

  if (numClusters <= 0 || numClusters > inputVectors.length) {
    throw new Error(`Invalid numClusters: ${numClusters} (corpus has ${inputVectors.length} vectors)`);
  }

  const vectors = alignVectors(inputVectors);
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

/** Per-process, append-only mapping from dimension index → "pass::rule" key.
 *
 *  WHAT IT ACTUALLY IS (corrected 2026-08-24 — the previous version of this
 *  comment opened by calling it a fixed module-load-time enumeration in which
 *  "dimension 0 always means the same rule across all vectors", then two
 *  paragraphs later admitted the opposite): it starts EMPTY and grows on every
 *  vectorizeFromIssues call, appending whichever keys that call introduced,
 *  sorted among themselves. So the index is a function of which scripts this
 *  process has vectorized and in what order — dimension 0 means the same rule
 *  only within one uninterrupted sequence in one process.
 *
 *  Enumerating the real rule set up front is still the better design, and
 *  would need one of:
 *    (a) Import all 14 pass files and extract their rule sets, OR
 *    (b) Define rules in a central registry that both passes and this module
 *        read from, OR
 *    (c) Freeze a versioned snapshot of the generated rulebook and index
 *        against that.
 *  None of those is done here. What IS done, so that the lazy index cannot
 *  produce wrong comparisons in the meantime: every vector records its own
 *  `ruleKeys`, and alignVectors() reconciles by key before any distance math.
 *  A new rule appearing in a later pass simply becomes a new shared dimension
 *  that older vectors carry as 0 — which is the truth about them. */
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

// Patch vectorizeFromIssues to build the index on first call. `vectorizeFromIssues`
// is a typed `let` (see its declaration above), so this plain reassignment
// type-checks with no cast — tsc verifies the wrapper matches
// VectorizeFromIssuesFn exactly, including the return type.
const originalVectorizeFromIssues = vectorizeFromIssues;
vectorizeFromIssues = function(
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
