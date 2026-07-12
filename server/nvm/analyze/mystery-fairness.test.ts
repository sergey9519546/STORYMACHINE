import { test } from 'node:test';
import assert from 'node:assert/strict';
import { assessMysteryFairness } from './mystery-fairness.ts';

test('all required clues planted before reveal -> fair / ENTAILED', () => {
  const report = assessMysteryFairness({
    solution: { requiredClueIds: ['murder-weapon', 'motive'], revealSceneIndex: 10 },
    plants: [
      { clueId: 'murder-weapon', sceneIndex: 2 },
      { clueId: 'motive', sceneIndex: 5 },
    ],
  });
  assert.equal(report.fair, true);
  assert.equal(report.support, 'ENTAILED');
  assert.deepEqual(report.missingClues, []);
  assert.deepEqual(report.lateClues, []);
  assert.deepEqual(report.concealedCritical, []);
});

test('required clue never planted anywhere -> missingClues + CONTRADICTED', () => {
  const report = assessMysteryFairness({
    solution: { requiredClueIds: ['murder-weapon', 'alibi-hole'], revealSceneIndex: 10 },
    plants: [{ clueId: 'murder-weapon', sceneIndex: 2 }],
  });
  assert.equal(report.fair, false);
  assert.equal(report.support, 'CONTRADICTED');
  assert.deepEqual(report.missingClues, ['alibi-hole']);
  assert.deepEqual(report.lateClues, []);
  assert.deepEqual(report.concealedCritical, []);
});

test('clue planted after reveal scene -> lateClues + CONTRADICTED', () => {
  const report = assessMysteryFairness({
    solution: { requiredClueIds: ['fingerprint'], revealSceneIndex: 5 },
    plants: [{ clueId: 'fingerprint', sceneIndex: 8 }],
  });
  assert.equal(report.fair, false);
  assert.equal(report.support, 'CONTRADICTED');
  assert.deepEqual(report.lateClues, ['fingerprint']);
  assert.deepEqual(report.missingClues, []);
  assert.deepEqual(report.concealedCritical, []);
});

test('concealed required clue (all early plants concealed) -> concealedCritical + CONTRADICTED', () => {
  const report = assessMysteryFairness({
    solution: { requiredClueIds: ['secret-letter'], revealSceneIndex: 10 },
    plants: [{ clueId: 'secret-letter', sceneIndex: 3, concealed: true }],
  });
  assert.equal(report.fair, false);
  assert.equal(report.support, 'CONTRADICTED');
  assert.deepEqual(report.concealedCritical, ['secret-letter']);
  assert.deepEqual(report.missingClues, []);
  assert.deepEqual(report.lateClues, []);
});

test('empty required-clue set -> UNKNOWN, no violation lists populated', () => {
  const report = assessMysteryFairness({
    solution: { requiredClueIds: [], revealSceneIndex: 10 },
    plants: [{ clueId: 'irrelevant', sceneIndex: 1 }],
  });
  assert.equal(report.fair, true);
  assert.equal(report.support, 'UNKNOWN');
  assert.deepEqual(report.missingClues, []);
  assert.deepEqual(report.lateClues, []);
  assert.deepEqual(report.concealedCritical, []);
});

test('duplicate and early-plus-late plants of same clue are fine (no false positive)', () => {
  const report = assessMysteryFairness({
    solution: { requiredClueIds: ['weapon'], revealSceneIndex: 10 },
    plants: [
      { clueId: 'weapon', sceneIndex: 2 },
      { clueId: 'weapon', sceneIndex: 2 }, // duplicate plant, same scene
      { clueId: 'weapon', sceneIndex: 12 }, // a later re-mention past reveal, harmless
    ],
  });
  assert.equal(report.fair, true);
  assert.equal(report.support, 'ENTAILED');
  assert.deepEqual(report.missingClues, []);
  assert.deepEqual(report.lateClues, []);
  assert.deepEqual(report.concealedCritical, []);
});

test('boundary: clue planted exactly at reveal scene index counts as late', () => {
  const report = assessMysteryFairness({
    solution: { requiredClueIds: ['weapon'], revealSceneIndex: 7 },
    plants: [{ clueId: 'weapon', sceneIndex: 7 }],
  });
  assert.equal(report.fair, false);
  assert.equal(report.support, 'CONTRADICTED');
  assert.deepEqual(report.lateClues, ['weapon']);
});

test('malformed / negative-index plants are dropped, not thrown; clue then reads as missing', () => {
  const report = assessMysteryFairness({
    solution: { requiredClueIds: ['weapon'], revealSceneIndex: 10 },
    plants: [
      { clueId: 'weapon', sceneIndex: -1 },
      { clueId: '', sceneIndex: 2 },
      { clueId: 'weapon', sceneIndex: 3.5 },
      null as unknown as { clueId: string; sceneIndex: number },
    ],
  });
  assert.equal(report.fair, false);
  assert.equal(report.support, 'CONTRADICTED');
  assert.deepEqual(report.missingClues, ['weapon']);
});

test('clue with one early unconcealed plant and one concealed plant is fair (not concealed-critical)', () => {
  const report = assessMysteryFairness({
    solution: { requiredClueIds: ['weapon'], revealSceneIndex: 10 },
    plants: [
      { clueId: 'weapon', sceneIndex: 2, concealed: true },
      { clueId: 'weapon', sceneIndex: 4, concealed: false },
    ],
  });
  assert.equal(report.fair, true);
  assert.equal(report.support, 'ENTAILED');
  assert.deepEqual(report.concealedCritical, []);
});

test('missing input guarded: absent solution/plants does not throw, degrades to UNKNOWN', () => {
  const report = assessMysteryFairness({} as unknown as Parameters<typeof assessMysteryFairness>[0]);
  assert.equal(report.support, 'UNKNOWN');
  assert.equal(report.fair, true);
});
