// tests/core/story-vector.test.ts — coverage for the Story Vector Embedding
// system (server/nvm/analyze/story-vector.ts) and Structural Genome
// extraction/comparison (server/nvm/analyze/structural-genome.ts).
//
// 2026-08-03 audit: ported from the former tests/story-vector.test.ts, which
// never executed anywhere — it was absent from scripts/run-tests.mjs's
// TEST_ROOTS, excluded in tsconfig.json, and imported `vitest` rather than
// `node:test`, so it could not have run even if discovered (see that file's
// current header for the full pointer). It was the ONLY test anywhere for
// extractGenome/compareGenomes, and structural-genome.ts is imported by the
// live server/routes/nvm/analysis.ts route — i.e. real, route-connected code
// had zero executing coverage. Porting surfaced several real problems in the
// original (never having run, none of them were ever caught):
//
//   1. `createMockSceneRecords` built objects with fields that don't exist on
//      the real ScreenplaySceneRecord (`sceneNumber`, `slugline`,
//      `payoffClueIds`, `purpose: 'advance_plot'` — that isn't even a valid
//      ScenePurpose). This file could never have type-checked; it's part of
//      why it needed excluding from tsconfig in the first place. Replaced
//      with makeSceneRecord() below, built against the real interface.
//   2. The "should create a 3,216-dimensional vector" test only asserted
//      `.length > 0`, not the number in its own name — because the real
//      number ISN'T 3,216. story-vector.ts's own header comment documents
//      RULE_INDEX as "a PLACEHOLDER that assumes 3,216 synthetic rules": it
//      is actually built lazily, one dimension per DISTINCT (pass, rule) key
//      seen so far since the last resetRuleIndex(). Ported below as a test of
//      the REAL lazy-index behavior, with the discrepancy noted at its call
//      site rather than repeating the false claim.
//   3. Un-primed sequential vectorization is a live footgun: RULE_INDEX only
//      ever grows (new rules append; existing vectors are never backfilled),
//      so two vectors built back-to-back from only-partially-overlapping
//      rule sets can end up with different `.dimensions.length`, and
//      cosineSimilarity/euclideanDistance THROW ("Dimension mismatch")
//      rather than compare them. The original "partial overlap" and
//      "orthogonal similarity" tests would have hit this and failed/thrown
//      immediately if they had ever run — further proof this file was never
//      executed. Fixed below by priming the index (one throwaway
//      vectorizeFromIssues call per distinct issue set) before building the
//      vectors under test, which is the only currently-correct usage pattern
//      for comparing more than one dynamically-vectorized script.
//   4. The nearest-neighbor test asserted the "closest by count" corpus
//      entry would rank first, but cosine similarity is magnitude-invariant:
//      when every candidate's only non-zero dimension is the same rule,
//      they're all colinear and normalize to the identical unit vector
//      (similarity 1.0, a 4-way tie broken only by Array.sort's stability).
//      The original assertion passed by coincidence, not by exercising the
//      claimed discrimination. Replaced with a multi-dimensional fixture
//      where the ranking is actually earned.
//
// Everything below was run against the real modules and, where a fixture's
// expected value wasn't obvious by inspection, verified empirically first.

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import type { RevisionIssue, PassName } from '../../server/nvm/revision/passes/types.ts';
import type { ScreenplaySceneRecord } from '../../server/nvm/screenplay/memory.ts';
import {
  vectorizeFromIssues,
  alignVectors,
  cosineSimilarity,
  euclideanDistance,
  findNearestNeighbors,
  clusterCorpus,
  resetRuleIndex,
  getRuleIndex,
  type StoryVector,
} from '../../server/nvm/analyze/story-vector.ts';
import {
  extractGenome,
  compareGenomes,
  type StructuralGenome,
} from '../../server/nvm/analyze/structural-genome.ts';

// ── Test Fixtures ──────────────────────────────────────────────────────────

type TaggedIssue = RevisionIssue & { pass: PassName };

function mockIssues(rules: Array<{ pass: PassName; rule: string; count: number }>): TaggedIssue[] {
  const issues: TaggedIssue[] = [];
  for (const { pass, rule, count } of rules) {
    for (let i = 0; i < count; i++) {
      issues.push({
        pass,
        rule,
        severity: 'major',
        location: 'Scene 1',
        description: `Mock issue: ${rule}`,
      });
    }
  }
  return issues;
}

/** Minimal, correctly-typed ScreenplaySceneRecord factory (mirrors the
 *  pattern in tests/passes/helpers.ts's makeSceneRecord, redefined locally so
 *  this file has no cross-directory test dependency). */
function makeSceneRecord(sceneIdx: number, overrides: Partial<ScreenplaySceneRecord> = {}): ScreenplaySceneRecord {
  return {
    commitId: `commit-${sceneIdx}`,
    sceneIdx,
    slug: `INT. SCENE ${sceneIdx} - DAY`,
    purpose: 'complicate',
    dramaticTurn: '',
    revelation: null,
    emotionalShift: 'neutral',
    visualBeats: [],
    dialogueHighlights: [],
    unresolvedClues: [],
    seededClueIds: [],
    payoffSetupIds: [],
    clockRaised: false,
    clockDelta: 0,
    suspenseDelta: 0,
    curiosityDelta: 0,
    relationshipShifts: [],
    createdAt: 0,
    ...overrides,
  };
}

/** Prime RULE_INDEX with every distinct rule across all given issue sets
 *  before vectorizing any of them for real — see file header note (3). Each
 *  priming call's own throwaway vector is discarded; only the shared,
 *  now-stable RULE_INDEX matters. */
function primeRuleIndex(...issueSets: TaggedIssue[][]): void {
  for (const issues of issueSets) {
    vectorizeFromIssues(issues, { title: 'prime', source: 'synthetic', contentHash: `prime-${Math.random()}` });
  }
}

function assertClose(actual: number, expected: number, epsilon = 1e-9): void {
  assert.ok(
    Math.abs(actual - expected) < epsilon,
    `expected ${actual} to be within ${epsilon} of ${expected}`
  );
}

// ── Vectorization Tests ────────────────────────────────────────────────────

describe('Story Vector - Vectorization', () => {
  beforeEach(() => {
    resetRuleIndex();
  });

  it('derives dimensionality from the distinct rules encountered (RULE_INDEX is a lazy placeholder, not a fixed 3,216)', () => {
    // See file header note (2): story-vector.ts's own comment on RULE_INDEX
    // calls the 3,216 figure "a PLACEHOLDER" — the real index is built
    // lazily, one dimension per distinct (pass, rule) key seen since the
    // last reset. 3 distinct rules -> 3 dimensions, not 3,216.
    const issues = mockIssues([
      { pass: 'structure', rule: 'ACT_BREAK_MISSING', count: 3 },
      { pass: 'pacing', rule: 'SCENE_TOO_LONG', count: 5 },
      { pass: 'dialogue', rule: 'ON_THE_NOSE', count: 2 },
    ]);

    const vector = vectorizeFromIssues(issues, {
      title: 'Test Script',
      source: 'synthetic',
      contentHash: 'test-hash',
    });

    assert.equal(vector.dimensions.length, 3);
    assert.equal(getRuleIndex().length, 3);
    assert.equal(vector.metadata.title, 'Test Script');
    assert.equal(vector.metadata.source, 'synthetic');
  });

  it('should normalize vectors to unit L2-norm', () => {
    const issues = mockIssues([
      { pass: 'structure', rule: 'RULE_A', count: 10 },
      { pass: 'pacing', rule: 'RULE_B', count: 20 },
    ]);

    const vector = vectorizeFromIssues(issues, {
      title: 'Test',
      source: 'synthetic',
      contentHash: 'hash',
    });

    const norm = Math.sqrt(vector.dimensions.reduce((sum, val) => sum + val * val, 0));
    assertClose(norm, 1.0, 1e-9);
  });

  it('keeps an all-zero vector all-zero (no division-by-zero/NaN) when no issues fire against a non-empty rule vocabulary', () => {
    // A fresh reset with NO issues ever passed leaves RULE_INDEX empty, so
    // dimensions=[] and `.every(...)` on an empty array is vacuously true --
    // that isn't a real test of the zero-norm fallback. Priming the index
    // with real rules FIRST, then vectorizing an empty issue list, actually
    // exercises the norm===0 branch (vectorizeFromIssuesCore's `norm > 0 ?
    // ... : rawDimensions`) against a non-trivial, non-empty vector.
    primeRuleIndex(mockIssues([
      { pass: 'structure', rule: 'RULE_A', count: 1 },
      { pass: 'pacing', rule: 'RULE_B', count: 1 },
    ]));
    assert.equal(getRuleIndex().length, 2);

    const vector = vectorizeFromIssues([], { title: 'Empty Script', source: 'synthetic', contentHash: 'empty' });
    assert.equal(vector.dimensions.length, 2);
    assert.ok(vector.dimensions.every(d => d === 0));
  });

  it('should produce deterministic vectors for same input', () => {
    const issues = mockIssues([{ pass: 'structure', rule: 'RULE_X', count: 5 }]);

    const v1 = vectorizeFromIssues(issues, { title: 'Test', source: 'synthetic', contentHash: 'hash' });
    const v2 = vectorizeFromIssues(issues, { title: 'Test', source: 'synthetic', contentHash: 'hash' });

    assert.deepEqual(v1.dimensions, v2.dimensions);
  });
});

// ── Similarity Tests ───────────────────────────────────────────────────────

describe('Story Vector - Similarity', () => {
  beforeEach(() => {
    resetRuleIndex();
  });

  it('should compute cosine similarity = 1 for identical vectors', () => {
    const issues = mockIssues([{ pass: 'structure', rule: 'RULE_A', count: 5 }]);

    const v1 = vectorizeFromIssues(issues, { title: 'V1', source: 'synthetic', contentHash: 'h1' });
    const v2 = vectorizeFromIssues(issues, { title: 'V2', source: 'synthetic', contentHash: 'h2' });

    assertClose(cosineSimilarity(v1, v2), 1.0, 1e-9);
  });

  it('should compute cosine similarity = 0 for orthogonal vectors', () => {
    const issues1 = mockIssues([{ pass: 'structure', rule: 'RULE_A', count: 10 }]);
    const issues2 = mockIssues([{ pass: 'dialogue', rule: 'RULE_B', count: 10 }]);

    // See file header note (3): prime with both issue sets first so RULE_A
    // and RULE_B are both already in RULE_INDEX before either vector under
    // test is built, keeping their dimension counts equal.
    primeRuleIndex(issues1, issues2);
    const v1 = vectorizeFromIssues(issues1, { title: 'V1', source: 'synthetic', contentHash: 'h1' });
    const v2 = vectorizeFromIssues(issues2, { title: 'V2', source: 'synthetic', contentHash: 'h2' });

    assert.equal(v1.dimensions.length, v2.dimensions.length);
    assert.equal(cosineSimilarity(v1, v2), 0);
  });

  it('should compute intermediate similarity for partially overlapping vectors', () => {
    const issues1 = mockIssues([
      { pass: 'structure', rule: 'RULE_A', count: 5 },
      { pass: 'pacing', rule: 'RULE_B', count: 5 },
    ]);
    const issues2 = mockIssues([
      { pass: 'structure', rule: 'RULE_A', count: 5 },
      { pass: 'dialogue', rule: 'RULE_C', count: 5 },
    ]);

    primeRuleIndex(issues1, issues2);
    const v1 = vectorizeFromIssues(issues1, { title: 'V1', source: 'synthetic', contentHash: 'h1' });
    const v2 = vectorizeFromIssues(issues2, { title: 'V2', source: 'synthetic', contentHash: 'h2' });

    const similarity = cosineSimilarity(v1, v2);
    // Should be between 0 and 1 (partial overlap) -- empirically ~0.5 for
    // this fixture (one shared rule out of two per vector).
    assert.ok(similarity > 0.3, `expected > 0.3, got ${similarity}`);
    assert.ok(similarity < 0.9, `expected < 0.9, got ${similarity}`);
  });

  it('should compute euclidean distance = 0 for identical vectors', () => {
    const issues = mockIssues([{ pass: 'structure', rule: 'RULE_A', count: 5 }]);

    const v1 = vectorizeFromIssues(issues, { title: 'V1', source: 'synthetic', contentHash: 'h1' });
    const v2 = vectorizeFromIssues(issues, { title: 'V2', source: 'synthetic', contentHash: 'h2' });

    assertClose(euclideanDistance(v1, v2), 0, 1e-9);
  });

  it('should throw on dimension mismatch', () => {
    const v1: StoryVector = {
      dimensions: [1, 0, 0],
      metadata: { title: 'V1', source: 'synthetic', contentHash: 'h1', timestamp: new Date().toISOString() },
    };
    const v2: StoryVector = {
      dimensions: [1, 0],
      metadata: { title: 'V2', source: 'synthetic', contentHash: 'h2', timestamp: new Date().toISOString() },
    };

    assert.throws(() => cosineSimilarity(v1, v2), /Dimension mismatch/);
    assert.throws(() => euclideanDistance(v1, v2), /Dimension mismatch/);
  });
});

// ── Dimension Alignment Tests ──────────────────────────────────────────────
//
// Added 2026-08-24 with alignVectors(). File header note (3) called
// un-primed sequential vectorization "a live footgun" and worked around it in
// the fixtures with primeRuleIndex(); POST /api/nvm/analyze/compare could not
// work around it, because it vectorizes the user's draft first and only then
// loads the corpus. Reproduced against a booted server, that produced
// "Dimension mismatch: 2 vs 185" and a 500 on every well-formed request.
// These tests pin the alignment that makes the un-primed order work.

describe('Story Vector - Dimension Alignment', () => {
  beforeEach(() => {
    resetRuleIndex();
  });

  it('records the dimension-to-rule mapping on every vector it builds', () => {
    const vector = vectorizeFromIssues(
      mockIssues([
        { pass: 'structure', rule: 'RULE_A', count: 1 },
        { pass: 'pacing', rule: 'RULE_B', count: 1 },
      ]),
      { title: 'V', source: 'synthetic', contentHash: 'h' },
    );

    assert.ok(vector.ruleKeys, 'vector must carry its own axis labels');
    assert.equal(vector.ruleKeys!.length, vector.dimensions.length);
    assert.deepEqual([...vector.ruleKeys!].sort(), ['pacing::RULE_B', 'structure::RULE_A']);
  });

  it('projects differently-indexed vectors onto one sorted key space, zero-filling absent rules', () => {
    const early = vectorizeFromIssues(
      mockIssues([{ pass: 'structure', rule: 'RULE_A', count: 4 }]),
      { title: 'early', source: 'synthetic', contentHash: 'h1' },
    );
    const late = vectorizeFromIssues(
      mockIssues([
        { pass: 'structure', rule: 'RULE_A', count: 4 },
        { pass: 'pacing', rule: 'RULE_B', count: 3 },
      ]),
      { title: 'late', source: 'synthetic', contentHash: 'h2' },
    );
    assert.notEqual(early.dimensions.length, late.dimensions.length);

    const [a, b] = alignVectors([early, late]);

    assert.deepEqual(a.ruleKeys, b.ruleKeys);
    assert.deepEqual([...a.ruleKeys!], ['pacing::RULE_B', 'structure::RULE_A']);
    // `early` never saw RULE_B: zero is the honest value for that axis.
    assert.equal(a.dimensions[0], 0);
    // Re-projection is a permutation plus zero-extension, so unit length
    // survives it exactly — that is what keeps cosine similarity valid.
    const norm = (v: StoryVector) => Math.sqrt(v.dimensions.reduce((s, x) => s + x * x, 0));
    assertClose(norm(a), 1, 1e-12);
    assertClose(norm(b), 1, 1e-12);
  });

  it('leaves already-matching vectors untouched (identity, not a rebuild)', () => {
    const issues = mockIssues([{ pass: 'structure', rule: 'RULE_A', count: 2 }]);
    primeRuleIndex(issues);
    const v1 = vectorizeFromIssues(issues, { title: 'A', source: 'synthetic', contentHash: 'h1' });
    const v2 = vectorizeFromIssues(issues, { title: 'B', source: 'synthetic', contentHash: 'h2' });

    const aligned = alignVectors([v1, v2]);
    assert.equal(aligned[0], v1);
    assert.equal(aligned[1], v2);
  });

  it('refuses to guess when un-labeled vectors disagree on length', () => {
    // A vector deserialized from a pre-ruleKeys cache file carries no record
    // of what its positions meant. Guessing is how silently-wrong similarity
    // ships, so this throws instead.
    const legacyShort: StoryVector = {
      dimensions: [1, 0],
      metadata: { title: 'legacy', source: 'corpus', contentHash: 'h1', timestamp: new Date().toISOString() },
    };
    const legacyLong: StoryVector = {
      dimensions: [1, 0, 0],
      metadata: { title: 'legacy2', source: 'corpus', contentHash: 'h2', timestamp: new Date().toISOString() },
    };
    assert.throws(() => alignVectors([legacyShort, legacyLong]), /without ruleKeys/);

    // Equal-length un-labeled vectors keep the old positional assumption.
    const sameLength: StoryVector = { ...legacyLong, metadata: { ...legacyLong.metadata, contentHash: 'h3' } };
    assert.doesNotThrow(() => alignVectors([legacyLong, sameLength]));
  });

  it('compares a draft vectorized BEFORE the corpus (the live route order)', () => {
    // Exactly what POST /api/nvm/analyze/compare does: vectorize the user's
    // draft, THEN load/vectorize the corpus. Before alignVectors() this threw
    // "Dimension mismatch" out of cosineSimilarity and 500ed the request.
    const query = vectorizeFromIssues(
      mockIssues([{ pass: 'structure', rule: 'RULE_A', count: 8 }]),
      { title: 'User Draft', source: 'generated', contentHash: 'query' },
    );
    const corpus = [
      vectorizeFromIssues(
        mockIssues([
          { pass: 'structure', rule: 'RULE_A', count: 9 },
          { pass: 'pacing', rule: 'RULE_B', count: 1 },
        ]),
        { title: 'near', source: 'corpus', contentHash: 'c1' },
      ),
      vectorizeFromIssues(
        mockIssues([
          { pass: 'dialogue', rule: 'RULE_C', count: 7 },
          { pass: 'rhythm', rule: 'RULE_D', count: 7 },
        ]),
        { title: 'far', source: 'corpus', contentHash: 'c2' },
      ),
    ];
    assert.notEqual(query.dimensions.length, corpus[1].dimensions.length);

    const neighbors = findNearestNeighbors(query, corpus, 2);

    assert.equal(neighbors.length, 2);
    for (const n of neighbors) {
      assert.ok(Number.isFinite(n.similarity), `non-finite similarity for ${n.vector.metadata.title}`);
      assert.ok(Number.isFinite(n.distance), `non-finite distance for ${n.vector.metadata.title}`);
    }
    // The near-identical corpus entry must win; the disjoint one scores 0.
    assert.equal(neighbors[0].vector.metadata.title, 'near');
    assertClose(neighbors[1].similarity, 0, 1e-12);
    // Callers get their own objects back, not aligned copies.
    assert.equal(neighbors[0].vector, corpus[0]);
  });

  it('clusters vectors of differing length without propagating NaN', () => {
    // clusterCorpus has no length guard of its own: a short vector reads
    // `undefined` past its end and NaN spreads through every centroid and
    // inertia with nothing thrown. Alignment is what prevents that.
    const vectors = [
      vectorizeFromIssues(mockIssues([{ pass: 'structure', rule: 'RULE_A', count: 10 }]),
        { title: 'S0', source: 'corpus', contentHash: 'h0' }),
      vectorizeFromIssues(mockIssues([{ pass: 'structure', rule: 'RULE_A', count: 9 }, { pass: 'pacing', rule: 'RULE_B', count: 1 }]),
        { title: 'S1', source: 'corpus', contentHash: 'h1' }),
      vectorizeFromIssues(mockIssues([{ pass: 'dialogue', rule: 'RULE_C', count: 10 }]),
        { title: 'S2', source: 'corpus', contentHash: 'h2' }),
      vectorizeFromIssues(mockIssues([{ pass: 'dialogue', rule: 'RULE_C', count: 9 }, { pass: 'rhythm', rule: 'RULE_D', count: 1 }]),
        { title: 'S3', source: 'corpus', contentHash: 'h3' }),
    ];
    assert.ok(new Set(vectors.map(v => v.dimensions.length)).size > 1, 'fixture must have mixed lengths');

    const clusters = clusterCorpus(vectors, 2);

    assert.equal(clusters.length, 2);
    for (const cluster of clusters) {
      assert.ok(Number.isFinite(cluster.inertia), `NaN inertia in cluster ${cluster.id}`);
      for (const value of cluster.centroid) {
        assert.ok(Number.isFinite(value), `NaN centroid component in cluster ${cluster.id}`);
      }
    }
    const clusterOf = (title: string) => clusters.findIndex(c => c.members.some(m => m.metadata.title === title));
    assert.equal(clusterOf('S0'), clusterOf('S1'));
    assert.equal(clusterOf('S2'), clusterOf('S3'));
    assert.notEqual(clusterOf('S0'), clusterOf('S2'));
  });
});

// ── Nearest Neighbors Tests ────────────────────────────────────────────────

describe('Story Vector - Nearest Neighbors', () => {
  beforeEach(() => {
    resetRuleIndex();
  });

  it('should find k nearest neighbors sorted by similarity, with the closest ratio ranking first', () => {
    // See file header note (4): cosine similarity is magnitude-invariant, so
    // a single-shared-dimension fixture can't discriminate by count at all
    // (every candidate normalizes to the same unit vector). This fixture
    // uses two dimensions with different RATIOS so the ranking is genuinely
    // earned rather than an accidental stable-sort tie.
    const mostlyA = mockIssues([{ pass: 'structure', rule: 'RULE_A', count: 9 }, { pass: 'dialogue', rule: 'RULE_B', count: 1 }]);
    const mostlyB = mockIssues([{ pass: 'structure', rule: 'RULE_A', count: 1 }, { pass: 'dialogue', rule: 'RULE_B', count: 9 }]);
    const balanced = mockIssues([{ pass: 'structure', rule: 'RULE_A', count: 5 }, { pass: 'dialogue', rule: 'RULE_B', count: 5 }]);
    const offTopic = mockIssues([{ pass: 'pacing', rule: 'RULE_C', count: 10 }]);
    const issueSets = [mostlyA, mostlyB, balanced, offTopic];

    primeRuleIndex(...issueSets);
    const vectors = issueSets.map((iss, i) =>
      vectorizeFromIssues(iss, { title: ['mostlyA', 'mostlyB', 'balanced', 'offTopic'][i], source: 'corpus', contentHash: `hash-${i}` })
    );
    const query = vectorizeFromIssues(
      mockIssues([{ pass: 'structure', rule: 'RULE_A', count: 8 }, { pass: 'dialogue', rule: 'RULE_B', count: 2 }]),
      { title: 'Query', source: 'generated', contentHash: 'query-hash' }
    );

    const neighbors = findNearestNeighbors(query, vectors, 3);

    assert.equal(neighbors.length, 3);
    assert.ok(neighbors[0].similarity >= neighbors[1].similarity);
    assert.ok(neighbors[1].similarity >= neighbors[2].similarity);
    // The query is mostly-RULE_A -- mostlyA should rank first, genuinely.
    assert.equal(neighbors[0].vector.metadata.title, 'mostlyA');
    // offTopic shares no dimension with the query at all -- it should be
    // excluded from the top 3 entirely (it's the least similar of the 4).
    assert.ok(!neighbors.some(n => n.vector.metadata.title === 'offTopic'));
  });

  it('should handle k > corpus size gracefully', () => {
    const issues1 = mockIssues([{ pass: 'structure', rule: 'RULE_A', count: 5 }]);
    const issues2 = mockIssues([{ pass: 'pacing', rule: 'RULE_B', count: 5 }]);
    const issueSets = [issues1, issues2];

    primeRuleIndex(...issueSets);
    const vectors = issueSets.map((iss, i) =>
      vectorizeFromIssues(iss, { title: `Script ${i}`, source: 'corpus', contentHash: `hash-${i}` })
    );
    const query = vectorizeFromIssues(
      mockIssues([{ pass: 'structure', rule: 'RULE_A', count: 5 }]),
      { title: 'Query', source: 'generated', contentHash: 'query-hash' }
    );

    const neighbors = findNearestNeighbors(query, vectors, 10);

    // Should return all available vectors (2), not fail
    assert.equal(neighbors.length, 2);
  });
});

// ── Clustering Tests ───────────────────────────────────────────────────────

describe('Story Vector - Clustering', () => {
  beforeEach(() => {
    resetRuleIndex();
  });

  it('should cluster vectors by structural similarity', () => {
    const issueSets = [
      mockIssues([{ pass: 'structure', rule: 'RULE_A', count: 10 }]),
      mockIssues([{ pass: 'structure', rule: 'RULE_A', count: 11 }]),
      mockIssues([{ pass: 'dialogue', rule: 'RULE_B', count: 10 }]),
      mockIssues([{ pass: 'dialogue', rule: 'RULE_B', count: 9 }]),
    ];

    // Priming matters here for a reason beyond similarity correctness:
    // clusterCorpus has NO dimension-length guard (unlike cosineSimilarity/
    // euclideanDistance) -- vectors with mismatched lengths would silently
    // read `undefined` past the shorter array and propagate NaN through
    // every centroid, with no thrown error to catch it.
    primeRuleIndex(...issueSets);
    const vectors = issueSets.map((iss, i) =>
      vectorizeFromIssues(iss, { title: `Script ${i}`, source: 'corpus', contentHash: `hash-${i}` })
    );

    const clusters = clusterCorpus(vectors, 2);

    assert.equal(clusters.length, 2);
    assert.ok(clusters[0].members.length > 0);
    assert.ok(clusters[1].members.length > 0);
    assert.equal(clusters[0].members.length + clusters[1].members.length, vectors.length);
    assert.ok(Array.isArray(clusters[0].centroid));
    assert.ok(Array.isArray(clusters[1].centroid));

    // The two structure-heavy scripts (0, 1) should land in the same
    // cluster, separate from the two dialogue-heavy scripts (2, 3) -- proves
    // the clustering is actually grouping by similarity, not just splitting
    // 4 items 2-and-2 arbitrarily.
    const clusterOf = (title: string) => clusters.findIndex(c => c.members.some(m => m.metadata.title === title));
    assert.equal(clusterOf('Script 0'), clusterOf('Script 1'));
    assert.equal(clusterOf('Script 2'), clusterOf('Script 3'));
    assert.notEqual(clusterOf('Script 0'), clusterOf('Script 2'));
  });

  it('should be deterministic with same seed', () => {
    const issueSets = Array.from({ length: 10 }, (_, i) =>
      mockIssues([{ pass: 'structure', rule: `RULE_${i % 3}`, count: i + 1 }])
    );

    primeRuleIndex(...issueSets);
    const vectors = issueSets.map((iss, i) =>
      vectorizeFromIssues(iss, { title: `Script ${i}`, source: 'corpus', contentHash: `hash-${i}` })
    );

    const clusters1 = clusterCorpus(vectors, 3, 100, 42);
    const clusters2 = clusterCorpus(vectors, 3, 100, 42);

    assert.equal(clusters1[0].members.length, clusters2[0].members.length);
    assert.equal(clusters1[1].members.length, clusters2[1].members.length);
    assert.equal(clusters1[2].members.length, clusters2[2].members.length);
  });

  it('should compute inertia (within-cluster variance)', () => {
    const issueSets = Array.from({ length: 6 }, (_, i) =>
      mockIssues([{ pass: 'structure', rule: 'RULE_A', count: i + 1 }])
    );

    primeRuleIndex(...issueSets);
    const vectors = issueSets.map((iss, i) =>
      vectorizeFromIssues(iss, { title: `Script ${i}`, source: 'corpus', contentHash: `hash-${i}` })
    );

    const clusters = clusterCorpus(vectors, 2);

    assert.ok(clusters[0].inertia >= 0);
    assert.ok(clusters[1].inertia >= 0);
  });

  it('should throw on invalid k', () => {
    const vectors = [
      vectorizeFromIssues(mockIssues([{ pass: 'structure', rule: 'R', count: 1 }]), {
        title: 'S1',
        source: 'corpus',
        contentHash: 'h1',
      }),
    ];

    assert.throws(() => clusterCorpus(vectors, 0), /Invalid numClusters/);
    assert.throws(() => clusterCorpus(vectors, 5), /Invalid numClusters/); // k > n
  });
});

// ── Genome Extraction Tests ────────────────────────────────────────────────

describe('Structural Genome - Extraction', () => {
  // extractGenome only reads vector.metadata.title -- a single throwaway
  // vector (source doesn't matter) is enough context for every test below.
  const dummyVector = vectorizeFromIssues([], { title: 'Test Script', source: 'corpus', contentHash: 'hash' });

  it('should extract a well-formed genome with real (non-static) scene variance', () => {
    const records = Array.from({ length: 20 }, (_, i) => makeSceneRecord(i, {
      suspenseDelta: Math.round(3 * Math.sin((i / 20) * Math.PI)),
      emotionalShift: i % 3 === 0 ? 'positive' : i % 3 === 1 ? 'negative' : 'neutral',
    }));
    const genome = extractGenome(dummyVector, records);

    assert.equal(genome.sourceTitle, 'Test Script');
    assert.ok(Array.isArray(genome.actBreakPositions));
    assert.ok(genome.reversalCount >= 0);
    assert.ok(['linear', 'exponential', 'stair-step', 'flat'].includes(genome.conflictEscalationPattern));
    assert.ok(['flat', 'linear', 'u-shape', 'inverted-u'].includes(genome.characterArcShape));
    assert.ok(genome.emotionalCurvature >= 0);
    assert.ok(genome.emotionalCurvature <= 1);
  });

  it('should detect exactly 2 act breaks (classic 3-act split) for scripts of 10+ scenes, at valid percentage positions', () => {
    // detectActBreaks always takes the top-2 suspense discontinuities once
    // records.length >= 10 -- assert the count is actually non-empty (the
    // original test only bounds-checked each element, which is vacuously
    // true over an empty array) before checking each position is a valid
    // percentage.
    const records = Array.from({ length: 30 }, (_, i) => makeSceneRecord(i, {
      suspenseDelta: Math.round(3 * Math.sin((i / 30) * Math.PI * 2)),
    }));
    const genome = extractGenome(dummyVector, records);

    assert.equal(genome.actBreakPositions.length, 2);
    for (const breakPos of genome.actBreakPositions) {
      assert.ok(breakPos >= 0);
      assert.ok(breakPos <= 100);
    }
  });

  it('should return empty act breaks for short scripts', () => {
    const records = Array.from({ length: 5 }, (_, i) => makeSceneRecord(i)); // Too short for act structure
    const genome = extractGenome(dummyVector, records);

    assert.deepEqual(genome.actBreakPositions, []);
  });

  it('should count reversals from emotional shifts (positive -> negative -> positive = 2 reversals)', () => {
    // Clean, deliberately-spaced fixture (each shift >= 2 scenes from the
    // last non-neutral one, which is countReversals' own gap requirement):
    // positive at 0, negative at 2, positive at 4, neutral elsewhere.
    const records = Array.from({ length: 15 }, (_, i) => makeSceneRecord(i, {
      emotionalShift: i === 0 ? 'positive' : i === 2 ? 'negative' : i === 4 ? 'positive' : 'neutral',
    }));
    const genome = extractGenome(dummyVector, records);

    assert.equal(genome.reversalCount, 2);
  });

  it('should compute emotional curvature as the variance of the +1/0/-1 emotional-shift signal', () => {
    // emotions cycle [1, 0, -1, 0] x5 -> mean 0, variance (mean of squares)
    // = (1+0+1+0)/4 = 0.5 exactly -- an exact, hand-checkable value rather
    // than just a bounds check, so a regression that zeroes out or corrupts
    // the computation is actually caught.
    const records = Array.from({ length: 20 }, (_, i) => makeSceneRecord(i, {
      emotionalShift: i % 4 === 0 ? 'positive' : i % 4 === 2 ? 'negative' : 'neutral',
    }));
    const genome = extractGenome(dummyVector, records);

    assertClose(genome.emotionalCurvature, 0.5, 1e-9);
  });
});

// ── Genome Comparison Tests ────────────────────────────────────────────────

describe('Structural Genome - Comparison', () => {
  it('should generate a comparison report between two similar genomes', () => {
    const genome1: StructuralGenome = {
      sourceTitle: 'Script A',
      actBreakPositions: [25, 75],
      reversalCount: 3,
      conflictEscalationPattern: 'linear',
      characterArcShape: 'u-shape',
      emotionalCurvature: 0.6,
    };
    const genome2: StructuralGenome = {
      sourceTitle: 'Script B',
      actBreakPositions: [25, 75],
      reversalCount: 3,
      conflictEscalationPattern: 'linear',
      characterArcShape: 'u-shape',
      emotionalCurvature: 0.7,
    };

    const report = compareGenomes(genome1, genome2);

    assert.ok(report.includes('Script A'));
    assert.ok(report.includes('Script B'));
    assert.ok(report.includes('act structure'));
    assert.ok(report.includes('reversals'));
    assert.ok(report.includes('escalation'));
    // All 5 categories should read as similar (✓), zero (⚠), for genomes
    // this close.
    assert.equal((report.match(/⚠/g) ?? []).length, 0);
    assert.equal((report.match(/✓/g) ?? []).length, 5);
  });

  it('should highlight differences in comparison report', () => {
    const genome1: StructuralGenome = {
      sourceTitle: 'Script A',
      actBreakPositions: [25, 75],
      reversalCount: 5,
      conflictEscalationPattern: 'exponential',
      characterArcShape: 'linear',
      emotionalCurvature: 0.3,
    };
    const genome2: StructuralGenome = {
      sourceTitle: 'Script B',
      actBreakPositions: [33, 66],
      reversalCount: 2,
      conflictEscalationPattern: 'linear',
      characterArcShape: 'u-shape',
      emotionalCurvature: 0.8,
    };

    const report = compareGenomes(genome1, genome2);

    assert.ok(report.includes('⚠'));
    // 4 of 5 categories differ enough to warn (reversals, escalation,
    // character arc, emotional range). Act structure does NOT warn here,
    // even though [25,75] !== [33,66] -- compareGenomes only compares act
    // *count* (both have 2 breaks -> 3 acts), not exact positions. That's
    // documented, current behavior, not asserted as a bug.
    assert.ok(report.includes('✓ Similar act structure'));
    assert.equal((report.match(/⚠/g) ?? []).length, 4);
  });
});
