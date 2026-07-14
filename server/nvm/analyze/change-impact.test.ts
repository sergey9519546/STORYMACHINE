import { test } from 'node:test';
import assert from 'node:assert/strict';
import { analyzeChangeImpact } from './change-impact.ts';
import type { FountainAnalysis } from './types.ts';
import type { ScreenplaySceneRecord } from '../screenplay/memory.ts';

/** Helper: minimal FountainAnalysis fixture for testing. */
function makeAnalysis(records: ScreenplaySceneRecord[]): FountainAnalysis {
  return {
    records,
    annotations: [],
    structure: {
      actPosition: 'act1',
      completionPercent: 0,
      avgSuspensePerScene: 0,
      escalating: false,
      reversalCount: 0,
      reversalDensity: 0,
      approachingClimax: false,
      openClues: 0,
      revelationCount: 0,
      midpointPressure: 0,
      tightestScene: null,
    },
    characters: [],
    sceneCount: records.length,
    dialogueLineCount: 0,
    actionLineCount: 0,
    wordCount: 0,
  };
}

/** Helper: minimal ScreenplaySceneRecord. */
function makeScene(
  idx: number,
  overrides: Partial<ScreenplaySceneRecord> = {},
): ScreenplaySceneRecord {
  return {
    commitId: `commit-${idx}`,
    sceneIdx: idx,
    slug: `INT. SCENE ${idx + 1}`,
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
    createdAt: Date.now(),
    ...overrides,
  };
}

// ── Fire tests: dependencies correctly detected ──────────────────────────────

test('clue seeded in scene 0, paid off in scene 3 → BREAKING severity', () => {
  const records = [
    makeScene(0, { seededClueIds: ['brass-key'] }),
    makeScene(1),
    makeScene(2),
    makeScene(3, { payoffSetupIds: ['brass-key'] }),
  ];
  const analysis = makeAnalysis(records);
  const report = analyzeChangeImpact(analysis, 0);

  assert.equal(report.severity, 'breaking');
  assert.equal(report.dependencies.length, 1);
  assert.equal(report.dependencies[0].type, 'clue-payoff');
  assert.equal(report.dependencies[0].downstreamSceneIdx, 3);
  assert.ok(report.dependencies[0].description.includes('brass-key'));
  assert.deepEqual(report.affectedScenes, [3]);
  assert.equal(report.summary.cluePayoffs, 1);
});

test('multiple clues seeded, multiple payoffs → all dependencies reported', () => {
  const records = [
    makeScene(0, { seededClueIds: ['clue-a', 'clue-b'] }),
    makeScene(1),
    makeScene(2, { payoffSetupIds: ['clue-a'] }),
    makeScene(3),
    makeScene(4, { payoffSetupIds: ['clue-b'] }),
  ];
  const analysis = makeAnalysis(records);
  const report = analyzeChangeImpact(analysis, 0);

  assert.equal(report.severity, 'breaking');
  assert.equal(report.dependencies.length, 2);
  assert.equal(report.summary.cluePayoffs, 2);
  assert.deepEqual(report.affectedScenes, [2, 4]);
  
  const clueADep = report.dependencies.find(d => d.dependencyId === 'clue:clue-a:2');
  const clueBDep = report.dependencies.find(d => d.dependencyId === 'clue:clue-b:4');
  assert.ok(clueADep);
  assert.ok(clueBDep);
  assert.equal(clueADep?.downstreamSceneIdx, 2);
  assert.equal(clueBDep?.downstreamSceneIdx, 4);
});

test('questions raised in scene 1, resolved in scene 5 → POTENTIALLY-AFFECTED', () => {
  const records = [
    makeScene(0),
    makeScene(1, { questionsRaised: 2 }),
    makeScene(2),
    makeScene(3),
    makeScene(4),
    makeScene(5, { questionsResolved: 1 }),
  ];
  const analysis = makeAnalysis(records);
  const report = analyzeChangeImpact(analysis, 1);

  assert.equal(report.severity, 'potentially-affected');
  assert.equal(report.dependencies.length, 1);
  assert.equal(report.dependencies[0].type, 'question-answer');
  assert.equal(report.dependencies[0].downstreamSceneIdx, 5);
  assert.deepEqual(report.affectedScenes, [5]);
  assert.equal(report.summary.questionAnswers, 1);
  assert.equal(report.summary.cluePayoffs, 0);
});

test('relationship shift in scene 2, same pair shifts in scene 4 → dependency detected', () => {
  const records = [
    makeScene(0),
    makeScene(1),
    makeScene(2, { 
      relationshipShifts: [{ pairKey: 'alice|bob', dimension: 'trust', amount: -3 }] 
    }),
    makeScene(3),
    makeScene(4, { 
      relationshipShifts: [{ pairKey: 'alice|bob', dimension: 'trust', amount: 2 }] 
    }),
  ];
  const analysis = makeAnalysis(records);
  const report = analyzeChangeImpact(analysis, 2);

  assert.equal(report.severity, 'potentially-affected');
  assert.equal(report.dependencies.length, 1);
  assert.equal(report.dependencies[0].type, 'character-relationship');
  assert.equal(report.dependencies[0].downstreamSceneIdx, 4);
  assert.ok(report.dependencies[0].description.includes('alice|bob'));
  assert.equal(report.summary.characterRelationships, 1);
});

test('multiple relationship pairs, deduplicated per downstream scene', () => {
  const records = [
    makeScene(0, { 
      relationshipShifts: [
        { pairKey: 'alice|bob', dimension: 'trust', amount: -2 },
        { pairKey: 'alice|charlie', dimension: 'respect', amount: 1 },
      ] 
    }),
    makeScene(1),
    makeScene(2, { 
      relationshipShifts: [
        { pairKey: 'alice|bob', dimension: 'trust', amount: 1 },
        { pairKey: 'alice|bob', dimension: 'respect', amount: -1 },
      ] 
    }),
  ];
  const analysis = makeAnalysis(records);
  const report = analyzeChangeImpact(analysis, 0);

  // Should report scene 2 only ONCE for alice|bob, even though two shifts occur there.
  assert.equal(report.dependencies.length, 1);
  assert.equal(report.dependencies[0].downstreamSceneIdx, 2);
  assert.ok(report.dependencies[0].description.includes('alice|bob'));
});

test('revelation in scene 0, downstream dramatic turn in scene 3 → potentially affected', () => {
  const records = [
    makeScene(0, { revelation: 'The butler did it' }),
    makeScene(1),
    makeScene(2),
    makeScene(3, { dramaticTurn: 'confrontation' }),
  ];
  const analysis = makeAnalysis(records);
  const report = analyzeChangeImpact(analysis, 0);

  assert.equal(report.severity, 'potentially-affected');
  assert.equal(report.dependencies.length, 1);
  assert.equal(report.dependencies[0].type, 'revelation');
  assert.equal(report.dependencies[0].downstreamSceneIdx, 3);
  assert.equal(report.summary.revelations, 1);
});

test('dramatic turn in scene 1, downstream turn in scene 4 → potentially affected', () => {
  const records = [
    makeScene(0),
    makeScene(1, { dramaticTurn: 'betrayal' }),
    makeScene(2),
    makeScene(3),
    makeScene(4, { dramaticTurn: 'alliance' }),
  ];
  const analysis = makeAnalysis(records);
  const report = analyzeChangeImpact(analysis, 1);

  assert.equal(report.severity, 'potentially-affected');
  assert.equal(report.dependencies.length, 1);
  assert.equal(report.dependencies[0].type, 'dramatic-turn');
  assert.equal(report.dependencies[0].downstreamSceneIdx, 4);
  assert.equal(report.summary.dramaticTurns, 1);
});

test('mixed dependencies: clue + questions + relationships → BREAKING severity (clue wins)', () => {
  const records = [
    makeScene(0, { 
      seededClueIds: ['evidence'],
      questionsRaised: 1,
      relationshipShifts: [{ pairKey: 'detective|suspect', dimension: 'trust', amount: -2 }],
    }),
    makeScene(1),
    makeScene(2, { questionsResolved: 1 }),
    makeScene(3, { 
      payoffSetupIds: ['evidence'],
      relationshipShifts: [{ pairKey: 'detective|suspect', dimension: 'trust', amount: 1 }],
    }),
  ];
  const analysis = makeAnalysis(records);
  const report = analyzeChangeImpact(analysis, 0);

  assert.equal(report.severity, 'breaking');
  assert.equal(report.dependencies.length, 3);
  assert.equal(report.summary.cluePayoffs, 1);
  assert.equal(report.summary.questionAnswers, 1);
  assert.equal(report.summary.characterRelationships, 1);
  assert.deepEqual(report.affectedScenes, [2, 3]);
});

// ── No-fire tests: isolated scenes correctly identified ──────────────────────

test('isolated scene (no seeds, no shifts) → ISOLATED severity', () => {
  const records = [
    makeScene(0, { seededClueIds: ['setup'] }),
    makeScene(1), // Isolated: no clues, no questions, no relationships
    makeScene(2, { payoffSetupIds: ['setup'] }),
  ];
  const analysis = makeAnalysis(records);
  const report = analyzeChangeImpact(analysis, 1);

  assert.equal(report.severity, 'isolated');
  assert.equal(report.dependencies.length, 0);
  assert.deepEqual(report.affectedScenes, []);
  assert.equal(report.summary.cluePayoffs, 0);
  assert.equal(report.summary.questionAnswers, 0);
  assert.equal(report.summary.characterRelationships, 0);
  assert.equal(report.summary.dramaticTurns, 0);
  assert.equal(report.summary.revelations, 0);
});

test('final scene with payoff but no seeds → ISOLATED (no downstream)', () => {
  const records = [
    makeScene(0, { seededClueIds: ['final-clue'] }),
    makeScene(1),
    makeScene(2, { payoffSetupIds: ['final-clue'] }),
  ];
  const analysis = makeAnalysis(records);
  const report = analyzeChangeImpact(analysis, 2);

  assert.equal(report.severity, 'isolated');
  assert.equal(report.dependencies.length, 0);
  assert.deepEqual(report.affectedScenes, []);
});

test('scene seeds clue but no downstream payoff → ISOLATED', () => {
  const records = [
    makeScene(0),
    makeScene(1, { seededClueIds: ['orphan-clue'] }),
    makeScene(2),
    makeScene(3),
  ];
  const analysis = makeAnalysis(records);
  const report = analyzeChangeImpact(analysis, 1);

  assert.equal(report.severity, 'isolated');
  assert.equal(report.dependencies.length, 0);
});

test('questions raised but never resolved downstream → ISOLATED', () => {
  const records = [
    makeScene(0),
    makeScene(1, { questionsRaised: 3 }),
    makeScene(2),
    makeScene(3),
  ];
  const analysis = makeAnalysis(records);
  const report = analyzeChangeImpact(analysis, 1);

  assert.equal(report.severity, 'isolated');
  assert.equal(report.dependencies.length, 0);
});

test('relationship shift but no downstream continuation → ISOLATED', () => {
  const records = [
    makeScene(0),
    makeScene(1, { relationshipShifts: [{ pairKey: 'hero|mentor', dimension: 'trust', amount: 2 }] }),
    makeScene(2),
    makeScene(3, { relationshipShifts: [{ pairKey: 'villain|sidekick', dimension: 'rivalry', amount: -1 }] }),
  ];
  const analysis = makeAnalysis(records);
  const report = analyzeChangeImpact(analysis, 1);

  assert.equal(report.severity, 'isolated');
  assert.equal(report.dependencies.length, 0);
});

// ── Edge cases and guards ─────────────────────────────────────────────────────

test('out-of-bounds sceneIdx (negative) → isolated report', () => {
  const records = [makeScene(0), makeScene(1)];
  const analysis = makeAnalysis(records);
  const report = analyzeChangeImpact(analysis, -1);

  assert.equal(report.sourceSceneIdx, -1);
  assert.equal(report.severity, 'isolated');
  assert.equal(report.dependencies.length, 0);
});

test('out-of-bounds sceneIdx (beyond length) → isolated report', () => {
  const records = [makeScene(0), makeScene(1)];
  const analysis = makeAnalysis(records);
  const report = analyzeChangeImpact(analysis, 5);

  assert.equal(report.sourceSceneIdx, 5);
  assert.equal(report.severity, 'isolated');
  assert.equal(report.dependencies.length, 0);
});

test('empty screenplay → isolated report', () => {
  const analysis = makeAnalysis([]);
  const report = analyzeChangeImpact(analysis, 0);

  assert.equal(report.severity, 'isolated');
  assert.equal(report.dependencies.length, 0);
});

test('single-scene screenplay → always isolated', () => {
  const records = [makeScene(0, { seededClueIds: ['clue'], questionsRaised: 2 })];
  const analysis = makeAnalysis(records);
  const report = analyzeChangeImpact(analysis, 0);

  assert.equal(report.severity, 'isolated');
  assert.equal(report.dependencies.length, 0);
});

test('undefined optional fields treated as empty', () => {
  const records = [
    makeScene(0, { seededClueIds: undefined, questionsRaised: undefined, relationshipShifts: undefined }),
    makeScene(1, { payoffSetupIds: undefined, questionsResolved: undefined, relationshipShifts: undefined }),
  ];
  const analysis = makeAnalysis(records);
  const report = analyzeChangeImpact(analysis, 0);

  assert.equal(report.severity, 'isolated');
  assert.equal(report.dependencies.length, 0);
});

// ── Determinism ───────────────────────────────────────────────────────────────

test('determinism: same input produces identical output', () => {
  const records = [
    makeScene(0, { seededClueIds: ['clue-x'] }),
    makeScene(1, { questionsRaised: 1 }),
    makeScene(2, { payoffSetupIds: ['clue-x'], questionsResolved: 1 }),
  ];
  const analysis = makeAnalysis(records);
  
  const report1 = analyzeChangeImpact(analysis, 0);
  const report2 = analyzeChangeImpact(analysis, 0);

  assert.deepEqual(report1, report2);
});

test('affectedScenes deduplicated and sorted', () => {
  const records = [
    makeScene(0, { 
      seededClueIds: ['clue-a', 'clue-b'],
      questionsRaised: 1,
    }),
    makeScene(1),
    makeScene(2, { 
      payoffSetupIds: ['clue-a'],
      questionsResolved: 1,
    }),
    makeScene(3),
    makeScene(4, { payoffSetupIds: ['clue-b'] }),
  ];
  const analysis = makeAnalysis(records);
  const report = analyzeChangeImpact(analysis, 0);

  // Scene 2 appears in both clue-payoff and question-answer dependencies,
  // but affectedScenes should list it only once, and the array should be sorted.
  assert.deepEqual(report.affectedScenes, [2, 4]);
  assert.equal(report.dependencies.length, 3); // 2 clues + 1 question
});
