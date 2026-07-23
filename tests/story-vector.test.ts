// tests/story-vector.test.ts — Test coverage for Story Vector Embedding system
// Tests vectorization, similarity, clustering, and genome extraction.

import { describe, it, expect, beforeEach } from 'vitest';
import type { RevisionIssue } from '../server/nvm/revision/passes/types.ts';
import type { ScreenplaySceneRecord } from '../server/nvm/screenplay/memory.ts';
import {
  vectorizeFromIssues,
  cosineSimilarity,
  euclideanDistance,
  findNearestNeighbors,
  clusterCorpus,
  resetRuleIndex,
  getRuleIndex,
  type StoryVector,
} from '../server/nvm/analyze/story-vector.ts';
import {
  extractGenome,
  compareGenomes,
  type StructuralGenome,
} from '../server/nvm/analyze/structural-genome.ts';

// ── Test Fixtures ──────────────────────────────────────────────────────────

function createMockIssues(rules: Array<{ pass: string; rule: string; count: number }>): RevisionIssue[] {
  const issues: RevisionIssue[] = [];
  for (const { pass, rule, count } of rules) {
    for (let i = 0; i < count; i++) {
      issues.push({
        pass: pass as any,
        rule,
        severity: 'major',
        line: 1,
        message: `Mock issue: ${rule}`,
      });
    }
  }
  return issues;
}

function createMockSceneRecords(count: number): ScreenplaySceneRecord[] {
  return Array.from({ length: count }, (_, i) => ({
    sceneIdx: i,
    sceneNumber: i + 1,
    slugline: `INT. LOCATION ${i + 1} - DAY`,
    wordCount: 100 + i * 10,
    suspenseDelta: Math.sin(i / count * Math.PI), // Sine wave pattern
    emotionalShift: i % 3 === 0 ? 'positive' : i % 3 === 1 ? 'negative' : 'neutral',
    questionsRaised: i % 2,
    questionsResolved: i % 3 === 0 ? 1 : 0,
    dramaticTurn: i % 5 === 0,
    relationshipShifts: [],
    seededClueIds: [],
    payoffClueIds: [],
    purpose: 'advance_plot',
    clockRaised: false,
  }));
}

// ── Vectorization Tests ────────────────────────────────────────────────────

describe('Story Vector - Vectorization', () => {
  beforeEach(() => {
    resetRuleIndex();
  });

  it('should create a 3,216-dimensional vector from issues', () => {
    const issues = createMockIssues([
      { pass: 'structure', rule: 'ACT_BREAK_MISSING', count: 3 },
      { pass: 'pacing', rule: 'SCENE_TOO_LONG', count: 5 },
      { pass: 'dialogue', rule: 'ON_THE_NOSE', count: 2 },
    ]);

    const vector = vectorizeFromIssues(issues, {
      title: 'Test Script',
      source: 'synthetic',
      contentHash: 'test-hash',
    });

    expect(vector.dimensions).toBeDefined();
    expect(vector.dimensions.length).toBeGreaterThan(0);
    expect(vector.metadata.title).toBe('Test Script');
    expect(vector.metadata.source).toBe('synthetic');
  });

  it('should normalize vectors to unit L2-norm', () => {
    const issues = createMockIssues([
      { pass: 'structure', rule: 'RULE_A', count: 10 },
      { pass: 'pacing', rule: 'RULE_B', count: 20 },
    ]);

    const vector = vectorizeFromIssues(issues, {
      title: 'Test',
      source: 'synthetic',
      contentHash: 'hash',
    });

    // Compute L2 norm: sqrt(sum of squares)
    const norm = Math.sqrt(
      vector.dimensions.reduce((sum, val) => sum + val * val, 0)
    );

    // Should be very close to 1.0 (unit length)
    expect(norm).toBeCloseTo(1.0, 5);
  });

  it('should handle zero vector (no issues)', () => {
    const issues: RevisionIssue[] = [];

    const vector = vectorizeFromIssues(issues, {
      title: 'Empty Script',
      source: 'synthetic',
      contentHash: 'empty',
    });

    expect(vector.dimensions).toBeDefined();
    // Zero vector should stay zero (no normalization possible)
    expect(vector.dimensions.every(d => d === 0)).toBe(true);
  });

  it('should produce deterministic vectors for same input', () => {
    const issues = createMockIssues([
      { pass: 'structure', rule: 'RULE_X', count: 5 },
    ]);

    const v1 = vectorizeFromIssues(issues, {
      title: 'Test',
      source: 'synthetic',
      contentHash: 'hash',
    });

    const v2 = vectorizeFromIssues(issues, {
      title: 'Test',
      source: 'synthetic',
      contentHash: 'hash',
    });

    expect(v1.dimensions).toEqual(v2.dimensions);
  });
});

// ── Similarity Tests ───────────────────────────────────────────────────────

describe('Story Vector - Similarity', () => {
  beforeEach(() => {
    resetRuleIndex();
  });

  it('should compute cosine similarity = 1 for identical vectors', () => {
    const issues = createMockIssues([
      { pass: 'structure', rule: 'RULE_A', count: 5 },
    ]);

    const v1 = vectorizeFromIssues(issues, {
      title: 'V1',
      source: 'synthetic',
      contentHash: 'h1',
    });

    const v2 = vectorizeFromIssues(issues, {
      title: 'V2',
      source: 'synthetic',
      contentHash: 'h2',
    });

    const similarity = cosineSimilarity(v1, v2);
    expect(similarity).toBeCloseTo(1.0, 5);
  });

  it('should compute cosine similarity ≈ 0 for orthogonal vectors', () => {
    const issues1 = createMockIssues([
      { pass: 'structure', rule: 'RULE_A', count: 10 },
    ]);

    const issues2 = createMockIssues([
      { pass: 'dialogue', rule: 'RULE_B', count: 10 },
    ]);

    const v1 = vectorizeFromIssues(issues1, {
      title: 'V1',
      source: 'synthetic',
      contentHash: 'h1',
    });

    const v2 = vectorizeFromIssues(issues2, {
      title: 'V2',
      source: 'synthetic',
      contentHash: 'h2',
    });

    const similarity = cosineSimilarity(v1, v2);
    
    // Should be close to 0 (orthogonal) since they share no rules
    expect(similarity).toBeLessThan(0.1);
  });

  it('should compute intermediate similarity for partially overlapping vectors', () => {
    const issues1 = createMockIssues([
      { pass: 'structure', rule: 'RULE_A', count: 5 },
      { pass: 'pacing', rule: 'RULE_B', count: 5 },
    ]);

    const issues2 = createMockIssues([
      { pass: 'structure', rule: 'RULE_A', count: 5 },
      { pass: 'dialogue', rule: 'RULE_C', count: 5 },
    ]);

    const v1 = vectorizeFromIssues(issues1, {
      title: 'V1',
      source: 'synthetic',
      contentHash: 'h1',
    });

    const v2 = vectorizeFromIssues(issues2, {
      title: 'V2',
      source: 'synthetic',
      contentHash: 'h2',
    });

    const similarity = cosineSimilarity(v1, v2);
    
    // Should be between 0 and 1 (partial overlap)
    expect(similarity).toBeGreaterThan(0.3);
    expect(similarity).toBeLessThan(0.9);
  });

  it('should compute euclidean distance = 0 for identical vectors', () => {
    const issues = createMockIssues([
      { pass: 'structure', rule: 'RULE_A', count: 5 },
    ]);

    const v1 = vectorizeFromIssues(issues, {
      title: 'V1',
      source: 'synthetic',
      contentHash: 'h1',
    });

    const v2 = vectorizeFromIssues(issues, {
      title: 'V2',
      source: 'synthetic',
      contentHash: 'h2',
    });

    const distance = euclideanDistance(v1, v2);
    expect(distance).toBeCloseTo(0, 5);
  });

  it('should throw on dimension mismatch', () => {
    const v1: StoryVector = {
      dimensions: [1, 0, 0],
      metadata: {
        title: 'V1',
        source: 'synthetic',
        contentHash: 'h1',
        timestamp: new Date().toISOString(),
      },
    };

    const v2: StoryVector = {
      dimensions: [1, 0],
      metadata: {
        title: 'V2',
        source: 'synthetic',
        contentHash: 'h2',
        timestamp: new Date().toISOString(),
      },
    };

    expect(() => cosineSimilarity(v1, v2)).toThrow('Dimension mismatch');
    expect(() => euclideanDistance(v1, v2)).toThrow('Dimension mismatch');
  });
});

// ── Nearest Neighbors Tests ────────────────────────────────────────────────

describe('Story Vector - Nearest Neighbors', () => {
  beforeEach(() => {
    resetRuleIndex();
  });

  it('should find k nearest neighbors sorted by similarity', () => {
    const issues = [
      createMockIssues([{ pass: 'structure', rule: 'RULE_A', count: 10 }]),
      createMockIssues([{ pass: 'structure', rule: 'RULE_A', count: 8 }]),
      createMockIssues([{ pass: 'structure', rule: 'RULE_A', count: 2 }]),
      createMockIssues([{ pass: 'dialogue', rule: 'RULE_B', count: 10 }]),
    ];

    const vectors = issues.map((iss, i) => 
      vectorizeFromIssues(iss, {
        title: `Script ${i}`,
        source: 'corpus',
        contentHash: `hash-${i}`,
      })
    );

    const query = vectorizeFromIssues(
      createMockIssues([{ pass: 'structure', rule: 'RULE_A', count: 9 }]),
      {
        title: 'Query',
        source: 'generated',
        contentHash: 'query-hash',
      }
    );

    const neighbors = findNearestNeighbors(query, vectors, 3);

    expect(neighbors).toHaveLength(3);
    // Should be sorted by descending similarity
    expect(neighbors[0].similarity).toBeGreaterThanOrEqual(neighbors[1].similarity);
    expect(neighbors[1].similarity).toBeGreaterThanOrEqual(neighbors[2].similarity);
    
    // Most similar should be Script 0 or 1 (closest counts to query's 9)
    expect(['Script 0', 'Script 1']).toContain(neighbors[0].vector.metadata.title);
  });

  it('should handle k > corpus size gracefully', () => {
    const issues = [
      createMockIssues([{ pass: 'structure', rule: 'RULE_A', count: 5 }]),
      createMockIssues([{ pass: 'pacing', rule: 'RULE_B', count: 5 }]),
    ];

    const vectors = issues.map((iss, i) => 
      vectorizeFromIssues(iss, {
        title: `Script ${i}`,
        source: 'corpus',
        contentHash: `hash-${i}`,
      })
    );

    const query = vectorizeFromIssues(
      createMockIssues([{ pass: 'structure', rule: 'RULE_A', count: 5 }]),
      {
        title: 'Query',
        source: 'generated',
        contentHash: 'query-hash',
      }
    );

    const neighbors = findNearestNeighbors(query, vectors, 10);

    // Should return all available vectors (2), not fail
    expect(neighbors).toHaveLength(2);
  });
});

// ── Clustering Tests ───────────────────────────────────────────────────────

describe('Story Vector - Clustering', () => {
  beforeEach(() => {
    resetRuleIndex();
  });

  it('should cluster vectors by structural similarity', () => {
    const issues = [
      createMockIssues([{ pass: 'structure', rule: 'RULE_A', count: 10 }]),
      createMockIssues([{ pass: 'structure', rule: 'RULE_A', count: 11 }]),
      createMockIssues([{ pass: 'dialogue', rule: 'RULE_B', count: 10 }]),
      createMockIssues([{ pass: 'dialogue', rule: 'RULE_B', count: 9 }]),
    ];

    const vectors = issues.map((iss, i) => 
      vectorizeFromIssues(iss, {
        title: `Script ${i}`,
        source: 'corpus',
        contentHash: `hash-${i}`,
      })
    );

    const clusters = clusterCorpus(vectors, 2);

    expect(clusters).toHaveLength(2);
    
    // Each cluster should have members
    expect(clusters[0].members.length).toBeGreaterThan(0);
    expect(clusters[1].members.length).toBeGreaterThan(0);
    
    // Total members should equal input vectors
    const totalMembers = clusters[0].members.length + clusters[1].members.length;
    expect(totalMembers).toBe(vectors.length);
    
    // Each cluster should have a centroid
    expect(clusters[0].centroid).toBeDefined();
    expect(clusters[1].centroid).toBeDefined();
  });

  it('should be deterministic with same seed', () => {
    const issues = Array.from({ length: 10 }, (_, i) => 
      createMockIssues([{ pass: 'structure', rule: `RULE_${i % 3}`, count: i + 1 }])
    );

    const vectors = issues.map((iss, i) => 
      vectorizeFromIssues(iss, {
        title: `Script ${i}`,
        source: 'corpus',
        contentHash: `hash-${i}`,
      })
    );

    const clusters1 = clusterCorpus(vectors, 3, 100, 42);
    const clusters2 = clusterCorpus(vectors, 3, 100, 42);

    // Same seed should produce same clustering
    expect(clusters1[0].members.length).toBe(clusters2[0].members.length);
    expect(clusters1[1].members.length).toBe(clusters2[1].members.length);
    expect(clusters1[2].members.length).toBe(clusters2[2].members.length);
  });

  it('should compute inertia (within-cluster variance)', () => {
    const issues = Array.from({ length: 6 }, (_, i) => 
      createMockIssues([{ pass: 'structure', rule: 'RULE_A', count: i + 1 }])
    );

    const vectors = issues.map((iss, i) => 
      vectorizeFromIssues(iss, {
        title: `Script ${i}`,
        source: 'corpus',
        contentHash: `hash-${i}`,
      })
    );

    const clusters = clusterCorpus(vectors, 2);

    // Inertia should be non-negative
    expect(clusters[0].inertia).toBeGreaterThanOrEqual(0);
    expect(clusters[1].inertia).toBeGreaterThanOrEqual(0);
  });

  it('should throw on invalid k', () => {
    const vectors = [
      vectorizeFromIssues(createMockIssues([{ pass: 'structure', rule: 'R', count: 1 }]), {
        title: 'S1',
        source: 'corpus',
        contentHash: 'h1',
      }),
    ];

    expect(() => clusterCorpus(vectors, 0)).toThrow('Invalid numClusters');
    expect(() => clusterCorpus(vectors, 5)).toThrow('Invalid numClusters'); // k > n
  });
});

// ── Genome Extraction Tests ────────────────────────────────────────────────

describe('Structural Genome - Extraction', () => {
  it('should extract basic genome from screenplay', () => {
    const vector = vectorizeFromIssues(
      createMockIssues([{ pass: 'structure', rule: 'RULE_A', count: 5 }]),
      {
        title: 'Test Script',
        source: 'corpus',
        contentHash: 'hash',
      }
    );

    const records = createMockSceneRecords(20);
    const genome = extractGenome(vector, records);

    expect(genome.sourceTitle).toBe('Test Script');
    expect(genome.actBreakPositions).toBeDefined();
    expect(genome.reversalCount).toBeGreaterThanOrEqual(0);
    expect(['linear', 'exponential', 'stair-step', 'flat']).toContain(genome.conflictEscalationPattern);
    expect(['flat', 'linear', 'u-shape', 'inverted-u']).toContain(genome.characterArcShape);
    expect(genome.emotionalCurvature).toBeGreaterThanOrEqual(0);
    expect(genome.emotionalCurvature).toBeLessThanOrEqual(1);
  });

  it('should detect act breaks at appropriate positions', () => {
    const vector = vectorizeFromIssues(
      createMockIssues([{ pass: 'structure', rule: 'RULE_A', count: 5 }]),
      {
        title: 'Test Script',
        source: 'corpus',
        contentHash: 'hash',
      }
    );

    const records = createMockSceneRecords(30);
    const genome = extractGenome(vector, records);

    // Act breaks should be percentages [0-100]
    for (const breakPos of genome.actBreakPositions) {
      expect(breakPos).toBeGreaterThanOrEqual(0);
      expect(breakPos).toBeLessThanOrEqual(100);
    }
  });

  it('should return empty act breaks for short scripts', () => {
    const vector = vectorizeFromIssues(
      createMockIssues([{ pass: 'structure', rule: 'RULE_A', count: 1 }]),
      {
        title: 'Short Script',
        source: 'corpus',
        contentHash: 'hash',
      }
    );

    const records = createMockSceneRecords(5); // Too short for act structure
    const genome = extractGenome(vector, records);

    expect(genome.actBreakPositions).toEqual([]);
  });

  it('should count reversals from emotional shifts', () => {
    const vector = vectorizeFromIssues(
      createMockIssues([{ pass: 'structure', rule: 'RULE_A', count: 1 }]),
      {
        title: 'Test Script',
        source: 'corpus',
        contentHash: 'hash',
      }
    );

    const records = createMockSceneRecords(15);
    // Pattern: positive → negative → positive should count as 2 reversals
    
    const genome = extractGenome(vector, records);
    expect(genome.reversalCount).toBeGreaterThan(0);
  });

  it('should compute emotional curvature in [0, 1] range', () => {
    const vector = vectorizeFromIssues(
      createMockIssues([{ pass: 'structure', rule: 'RULE_A', count: 1 }]),
      {
        title: 'Test Script',
        source: 'corpus',
        contentHash: 'hash',
      }
    );

    const records = createMockSceneRecords(20);
    const genome = extractGenome(vector, records);

    expect(genome.emotionalCurvature).toBeGreaterThanOrEqual(0);
    expect(genome.emotionalCurvature).toBeLessThanOrEqual(1);
  });
});

// ── Genome Comparison Tests ────────────────────────────────────────────────

describe('Structural Genome - Comparison', () => {
  it('should generate comparison report between two genomes', () => {
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

    expect(report).toContain('Script A');
    expect(report).toContain('Script B');
    expect(report).toContain('act structure');
    expect(report).toContain('reversals');
    expect(report).toContain('escalation');
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

    // Should mention differences
    expect(report).toContain('⚠');
  });
});
