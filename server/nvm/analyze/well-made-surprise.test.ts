import { test } from 'node:test';
import assert from 'node:assert/strict';
import { assessWellMadeSurprise } from './well-made-surprise.ts';

test('setup before reveal + misdirection -> wellMade, ENTAILED, strength up', () => {
  const report = assessWellMadeSurprise([
    { id: 'twist-1', revealSceneIndex: 10, setupSceneIndices: [2, 5], misdirectionPresent: true },
  ]);
  assert.equal(report.surprises.length, 1);
  assert.equal(report.surprises[0].inevitable, true);
  assert.equal(report.surprises[0].unexpected, true);
  assert.equal(report.surprises[0].wellMade, true);
  assert.equal(report.wellMadeCount, 1);
  assert.equal(report.cheapSurpriseCount, 0);
  assert.equal(report.support, 'ENTAILED');
  assert.ok(report.strength > 0);
});

test('misdirection but NO prior setup -> cheapSurprise + CONTRADICTED + penalized strength', () => {
  const cheap = assessWellMadeSurprise([
    { id: 'twist-cheap', revealSceneIndex: 10, setupSceneIndices: [], misdirectionPresent: true },
  ]);
  assert.equal(cheap.surprises[0].inevitable, false);
  assert.equal(cheap.surprises[0].unexpected, true);
  assert.equal(cheap.surprises[0].wellMade, false);
  assert.equal(cheap.wellMadeCount, 0);
  assert.equal(cheap.cheapSurpriseCount, 1);
  assert.equal(cheap.support, 'CONTRADICTED');
  assert.equal(cheap.strength, 0);

  // Compare against a mixed case: one well-made + one cheap should score
  // strictly lower than the well-made-only case above.
  const mixed = assessWellMadeSurprise([
    { id: 'twist-good', revealSceneIndex: 10, setupSceneIndices: [2], misdirectionPresent: true },
    { id: 'twist-cheap-2', revealSceneIndex: 12, setupSceneIndices: [], misdirectionPresent: true },
  ]);
  const goodOnly = assessWellMadeSurprise([
    { id: 'twist-good', revealSceneIndex: 10, setupSceneIndices: [2], misdirectionPresent: true },
  ]);
  assert.ok(mixed.strength < goodOnly.strength);
});

test('setup but no misdirection -> not wellMade, UNKNOWN (merely predictable)', () => {
  const report = assessWellMadeSurprise([
    { id: 'predictable-1', revealSceneIndex: 8, setupSceneIndices: [1, 3], misdirectionPresent: false },
  ]);
  assert.equal(report.surprises[0].inevitable, true);
  assert.equal(report.surprises[0].unexpected, false);
  assert.equal(report.surprises[0].wellMade, false);
  assert.equal(report.wellMadeCount, 0);
  assert.equal(report.cheapSurpriseCount, 0);
  assert.equal(report.support, 'UNKNOWN');
});

test('setup exactly at reveal scene is NOT inevitable (boundary)', () => {
  const report = assessWellMadeSurprise([
    { id: 'boundary-1', revealSceneIndex: 5, setupSceneIndices: [5], misdirectionPresent: true },
  ]);
  assert.equal(report.surprises[0].inevitable, false);
  assert.equal(report.surprises[0].wellMade, false);
  assert.equal(report.cheapSurpriseCount, 1);
  assert.equal(report.support, 'CONTRADICTED');
});

test('empty input abstains', () => {
  const empty1 = assessWellMadeSurprise([]);
  assert.equal(empty1.surprises.length, 0);
  assert.equal(empty1.wellMadeCount, 0);
  assert.equal(empty1.cheapSurpriseCount, 0);
  assert.equal(empty1.strength, 0);
  assert.equal(empty1.support, 'UNKNOWN');

  const empty2 = assessWellMadeSurprise(null);
  assert.equal(empty2.support, 'UNKNOWN');

  const empty3 = assessWellMadeSurprise(undefined);
  assert.equal(empty3.support, 'UNKNOWN');

  // Malformed/duplicate events also collapse to abstain when nothing usable remains.
  const malformedOnly = assessWellMadeSurprise([
    { id: '', revealSceneIndex: 5, setupSceneIndices: [1], misdirectionPresent: true },
    { id: 'dup', revealSceneIndex: -1, setupSceneIndices: [1], misdirectionPresent: true },
  ]);
  assert.equal(malformedOnly.support, 'UNKNOWN');
  assert.equal(malformedOnly.surprises.length, 0);
});

test('strength stays bounded within [0,1] across many well-made and many cheap surprises', () => {
  const manyGood = Array.from({ length: 20 }, (_, i) => ({
    id: `good-${i}`,
    revealSceneIndex: 100 + i,
    setupSceneIndices: [1],
    misdirectionPresent: true,
  }));
  const goodReport = assessWellMadeSurprise(manyGood);
  assert.ok(goodReport.strength <= 1);
  assert.ok(goodReport.strength >= 0);

  const manyCheap = Array.from({ length: 20 }, (_, i) => ({
    id: `cheap-${i}`,
    revealSceneIndex: 100 + i,
    setupSceneIndices: [],
    misdirectionPresent: true,
  }));
  const cheapReport = assessWellMadeSurprise(manyCheap);
  assert.ok(cheapReport.strength <= 1);
  assert.ok(cheapReport.strength >= 0);
  assert.equal(cheapReport.strength, 0);

  // Duplicate id is dropped (first occurrence kept), does not double count.
  const dupReport = assessWellMadeSurprise([
    { id: 'same', revealSceneIndex: 10, setupSceneIndices: [1], misdirectionPresent: true },
    { id: 'same', revealSceneIndex: 20, setupSceneIndices: [], misdirectionPresent: true },
  ]);
  assert.equal(dupReport.surprises.length, 1);
  assert.equal(dupReport.wellMadeCount, 1);
});
