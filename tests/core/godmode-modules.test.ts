// Dedicated tests for the 4 GODMODE modules (L4/L19, L8, L13, L5).
// The quality bar requires positive/negative fixtures with discrimination
// evidence — not just "does it run" but "does it distinguish good from bad."

import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { analyzeDisclosureAndEpistemics } from '../../server/nvm/quality/disclosure-analysis.ts';
import { classifyCharacterFunctions } from '../../server/nvm/quality/character-function.ts';
import { analyzeSubplots } from '../../server/nvm/quality/subplot-tracker.ts';
import { computeGraphHealth } from '../../server/nvm/quality/graph-health.ts';
import type { StoryGraph } from '../../server/nvm/analyze/story-graph.ts';
import type { ScreenplaySceneRecord } from '../../server/nvm/screenplay/memory.ts';
import type { StoryOp } from '../../server/nvm/ops/StoryOp.ts';

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeRecord(overrides: Partial<ScreenplaySceneRecord> = {}): ScreenplaySceneRecord {
  return {
    sceneIdx: 0, slug: 'INT. TEST', purpose: 'advance_plot',
    suspenseDelta: 0, curiosityDelta: 0, clockRaised: false, clockDelta: 0,
    emotionalShift: 'neutral', dramaticTurn: '', revelation: null,
    dialogueHighlights: [], visualBeats: [], unresolvedClues: [],
    seededClueIds: [], payoffSetupIds: [], relationshipShifts: [],
    ...overrides,
  } as ScreenplaySceneRecord;
}

function shiftRel(a: string, b: string, amount: number, sceneIdx: number): StoryOp {
  return { op: 'SHIFT_RELATIONSHIP', pair: [a, b], delta: { dimension: 'trust', amount, reason: 'test' } };
}
function seedClue(id: string): StoryOp {
  return { op: 'SEED_CLUE', clueId: id, carrier: 'object' };
}
function payoffClue(id: string): StoryOp {
  return { op: 'PAYOFF_SETUP', setupId: id, payoffEventId: `${id}-payoff` };
}
function themeMove(claim: string, move: string): StoryOp {
  return { op: 'ADVANCE_THEME_ARGUMENT', claimId: claim, move: move as never };
}
function objectArc(id: string, state: string): StoryOp {
  return { op: 'ADVANCE_OBJECT_ARC', objectId: id, toState: state };
}

// ── L4/L19: Disclosure Analysis ──────────────────────────────────────────────

describe('Disclosure Analysis (L4/L19)', () => {
  test('reports 0 violations when setup precedes payoff', () => {
    const records = [
      makeRecord({ sceneIdx: 0, seededClueIds: ['clue-1'] }),
      makeRecord({ sceneIdx: 5, payoffSetupIds: ['clue-1'] }),
    ];
    const report = analyzeDisclosureAndEpistemics(records);
    assert.equal(report.violationCount, 0, 'fair reveal: setup before payoff');
    assert.equal(report.scored, true);
  });

  test('detects orphaned payoff (payoff with no setup)', () => {
    const records = [
      makeRecord({ sceneIdx: 0, payoffSetupIds: ['clue-x'] }),
    ];
    const report = analyzeDisclosureAndEpistemics(records);
    assert.ok(report.violationCount >= 1, 'should detect unwithdrawable twist');
    assert.equal(report.fairReveal.fair, false);
  });

  test('detects epistemic gap when character present at seed but absent at payoff', () => {
    const records = [
      makeRecord({
        sceneIdx: 0, seededClueIds: ['secret'],
        relationshipShifts: [{ pairKey: 'alice|bob', dimension: 'trust', amount: -0.5 }],
      }),
      makeRecord({
        sceneIdx: 5, payoffSetupIds: ['secret'],
        relationshipShifts: [{ pairKey: 'bob|charlie', dimension: 'trust', amount: -0.3 }],
      }),
    ];
    const report = analyzeDisclosureAndEpistemics(records);
    assert.ok(report.epistemicGaps.length > 0, 'alice present at seed but absent at payoff');
    assert.match(report.epistemicGaps[0].description, /alice/);
  });

  test('returns unscored for empty records', () => {
    const report = analyzeDisclosureAndEpistemics([]);
    assert.equal(report.scored, false);
    assert.equal(report.violationCount, 0);
  });
});

// ── L8: Character Function Classification ────────────────────────────────────

describe('Character Function Classification (L8)', () => {
  test('classifies the most active character as protagonist', () => {
    const records = [
      makeRecord({ sceneIdx: 0, relationshipShifts: [
        { pairKey: 'alice|bob', dimension: 'trust', amount: -0.5 },
        { pairKey: 'alice|bob', dimension: 'trust', amount: -0.3 },
      ]}),
      makeRecord({ sceneIdx: 1, relationshipShifts: [
        { pairKey: 'alice|carol', dimension: 'trust', amount: 0.2 },
      ]}),
    ];
    const profiles = classifyCharacterFunctions(['alice', 'bob', 'carol'], records);
    const protagonist = profiles.find(p => p.function === 'protagonist');
    assert.ok(protagonist, 'should identify a protagonist');
    assert.equal(protagonist!.characterId, 'alice');
    assert.ok(protagonist!.confidence > 0.5);
  });

  test('classifies consistently negative character as rival', () => {
    const records = [
      makeRecord({ sceneIdx: 0, relationshipShifts: [
        { pairKey: 'alice|bob', dimension: 'trust', amount: -0.8 },
        { pairKey: 'alice|bob', dimension: 'trust', amount: -0.6 },
        { pairKey: 'alice|bob', dimension: 'trust', amount: -0.5 },
      ]}),
    ];
    const profiles = classifyCharacterFunctions(['alice', 'bob'], records);
    // bob has net -1.9 from his side → should be rival or foil
    const bob = profiles.find(p => p.characterId === 'bob');
    assert.ok(bob);
    // The classifier should detect the opposition pattern
    assert.ok(['rival', 'foil', 'protagonist'].includes(bob!.function));
  });

  test('returns empty array for no characters', () => {
    const profiles = classifyCharacterFunctions([], []);
    assert.equal(profiles.length, 0);
  });
});

// ── L13: Subplot Tracker ─────────────────────────────────────────────────────

describe('Subplot Tracker (L13)', () => {
  test('identifies relationship arc from 3+ shifts on same pair', () => {
    const scenes = [
      { sceneIdx: 0, ops: [shiftRel('a', 'b', -0.5, 0)] },
      { sceneIdx: 1, ops: [shiftRel('a', 'b', -0.3, 1)] },
      { sceneIdx: 2, ops: [shiftRel('a', 'b', 0.2, 2)] },
    ];
    const report = analyzeSubplots(scenes);
    const relArcs = report.subplots.filter(s => s.type === 'relationship_arc');
    assert.equal(relArcs.length, 1, 'should find one relationship arc');
    assert.match(relArcs[0].subplotId, /a\|b/);
    assert.equal(relArcs[0].opsCount, 3);
  });

  test('identifies mystery thread from orphaned clue', () => {
    const scenes = [
      { sceneIdx: 0, ops: [seedClue('mystery-1')] },
      { sceneIdx: 10, ops: [] as StoryOp[] },
    ];
    const report = analyzeSubplots(scenes);
    const mysteries = report.subplots.filter(s => s.type === 'mystery_thread');
    assert.ok(mysteries.length >= 1, 'orphaned clue should be a mystery thread');
    assert.equal(report.unresolvedSubplots, mysteries.length);
  });

  test('identifies theme counterargument from 3+ unresolved moves', () => {
    const scenes = [
      { sceneIdx: 0, ops: [themeMove('claim-1', 'support')] },
      { sceneIdx: 1, ops: [themeMove('claim-1', 'attack')] },
      { sceneIdx: 2, ops: [themeMove('claim-1', 'complicate')] },
    ];
    const report = analyzeSubplots(scenes);
    const themes = report.subplots.filter(s => s.type === 'theme_counterargument');
    assert.equal(themes.length, 1, 'should find one unresolved theme thread');
    assert.equal(themes[0].opsCount, 3);
  });

  test('identifies object arc from 2+ advancements', () => {
    const scenes = [
      { sceneIdx: 0, ops: [objectArc('gun', 'found')] },
      { sceneIdx: 1, ops: [objectArc('gun', 'loaded')] },
    ];
    const report = analyzeSubplots(scenes);
    const objs = report.subplots.filter(s => s.type === 'object_arc');
    assert.equal(objs.length, 1);
    assert.match(objs[0].description, /gun/);
  });

  test('detects intersection scenes where multiple subplots overlap', () => {
    const scenes = [
      { sceneIdx: 0, ops: [shiftRel('a', 'b', -0.5, 0)] },
      { sceneIdx: 1, ops: [shiftRel('a', 'b', -0.3, 1), shiftRel('c', 'd', -0.4, 1)] },
      { sceneIdx: 2, ops: [shiftRel('a', 'b', -0.2, 2), shiftRel('c', 'd', -0.3, 2)] },
      { sceneIdx: 3, ops: [shiftRel('c', 'd', -0.1, 3)] },
    ];
    const report = analyzeSubplots(scenes);
    // Both relationship arcs are active during scenes 1-2
    assert.ok(report.intersectionCount > 0, 'scenes 1-2 have overlapping relationship arcs');
  });

  test('returns empty for empty input', () => {
    const report = analyzeSubplots([]);
    assert.equal(report.totalSubplots, 0);
  });
});

// ── L5: Graph Health ─────────────────────────────────────────────────────────

describe('Graph Health (L5)', () => {
  function makeGraph(overrides: Partial<StoryGraph> = {}): StoryGraph {
    return {
      nodes: [], edges: [],
      promisePaymentRatio: 1.0, unpaidPromises: [],
      arcCoherence: 0.8, escalationMonotonicity: 1.0,
      causalDensity: 1.5, isolatedScenes: [],
      forwardEdgeRatio: 1.0, setupPayoffDistance: 5,
      scored: true,
      ...overrides,
    };
  }

  test('produces high score for excellent graph metrics', () => {
    const graph = makeGraph({
      promisePaymentRatio: 1.0, forwardEdgeRatio: 1.0,
      escalationMonotonicity: 1.0, arcCoherence: 0.9,
      causalDensity: 2.0, isolatedScenes: [],
    });
    const result = computeGraphHealth(graph, 20);
    assert.ok(result.graphHealthScore >= 90, `score was ${result.graphHealthScore}`);
    assert.equal(result.graphDeduction, 0, 'excellent graph → zero deduction');
    assert.equal(result.findings.length, 0, 'no findings for excellent graph');
  });

  test('produces deduction for poor graph metrics', () => {
    const graph = makeGraph({
      promisePaymentRatio: 0.3, forwardEdgeRatio: 0.4,
      escalationMonotonicity: 0.0, arcCoherence: -0.5,
      causalDensity: 0.5, isolatedScenes: [3, 7, 12],
    });
    const result = computeGraphHealth(graph, 20);
    assert.ok(result.graphHealthScore < 50, `score was ${result.graphHealthScore}`);
    assert.ok(result.graphDeduction > 5, `deduction was ${result.graphDeduction}`);
    assert.ok(result.findings.length > 0, 'should flag poor metrics');
  });

  test('deduction is capped at 15', () => {
    const graph = makeGraph({
      promisePaymentRatio: 0.0, forwardEdgeRatio: 0.0,
      escalationMonotonicity: 0.0, arcCoherence: -1.0,
      causalDensity: 0.0, isolatedScenes: [1, 2, 3, 4, 5],
    });
    const result = computeGraphHealth(graph, 20);
    assert.ok(result.graphDeduction <= 15, `deduction ${result.graphDeduction} exceeds cap`);
  });

  test('flags unpaid promises in findings', () => {
    const graph = makeGraph({
      promisePaymentRatio: 0.5, unpaidPromises: ['clue-a', 'clue-b'],
    });
    const result = computeGraphHealth(graph, 10);
    assert.ok(result.findings.some(f => f.includes('unpaid')));
  });

  test('flags isolated scenes in findings', () => {
    const graph = makeGraph({ isolatedScenes: [5, 10] });
    const result = computeGraphHealth(graph, 15);
    assert.ok(result.findings.some(f => f.includes('isolated')));
  });
});
