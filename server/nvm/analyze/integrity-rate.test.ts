import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  computeIntegrityRate,
  TAVERN_LETTER_FIXTURE,
  TAVERN_LETTER_FIXTURE_BROKEN,
} from './integrity-rate.ts';

test('golden Tavern-Letter fixture yields integrityRate 1.0, ENTAILED, no failures', () => {
  const result = computeIntegrityRate(TAVERN_LETTER_FIXTURE);
  assert.equal(result.integrityRate, 1.0);
  assert.equal(result.support, 'ENTAILED');
  assert.deepEqual(result.failures, []);
  assert.equal(result.totalChecks, 4);
  assert.equal(result.passedChecks, 4);
});

test('broken Tavern-Letter variant (cheap surprise + unkept promise) yields lower rate, correct failures, CONTRADICTED', () => {
  const result = computeIntegrityRate(TAVERN_LETTER_FIXTURE_BROKEN);
  assert.equal(result.integrityRate, 0.5);
  assert.equal(result.support, 'CONTRADICTED');
  assert.deepEqual(result.failures, ['unkept-promises', 'cheap-surprise']);
  assert.equal(result.totalChecks, 4);
  assert.equal(result.passedChecks, 2);
});

test('all dimensions passing (no hard/soft failures) → rate 1.0, ENTAILED', () => {
  const result = computeIntegrityRate({
    assertionContained: true,
    promisesKept: 3,
    promisesTotal: 3,
    mysteryFair: true,
    cheapSurprises: 0,
    wellMadeSurprises: 2,
  });
  assert.equal(result.integrityRate, 1);
  assert.equal(result.support, 'ENTAILED');
  assert.deepEqual(result.failures, []);
});

test('mixed: only assertion containment applicable and it fails → rate 0, CONTRADICTED', () => {
  const result = computeIntegrityRate({ assertionContained: false });
  assert.equal(result.integrityRate, 0);
  assert.equal(result.support, 'CONTRADICTED');
  assert.deepEqual(result.failures, ['assertion-contradiction']);
  assert.equal(result.totalChecks, 1);
  assert.equal(result.passedChecks, 0);
});

test('mixed: unfair mystery alone fails → CONTRADICTED with correct failure name', () => {
  const result = computeIntegrityRate({ mysteryFair: false });
  assert.equal(result.support, 'CONTRADICTED');
  assert.deepEqual(result.failures, ['unfair-mystery']);
  assert.equal(result.integrityRate, 0);
});

test('mixed: unkept promises alone (no hard failure) → UNKNOWN, not CONTRADICTED', () => {
  const result = computeIntegrityRate({ promisesKept: 1, promisesTotal: 2 });
  assert.equal(result.support, 'UNKNOWN');
  assert.deepEqual(result.failures, ['unkept-promises']);
  assert.equal(result.integrityRate, 0);
  assert.equal(result.totalChecks, 1);
});

test('empty/null/undefined input → UNKNOWN, rate 0, zero checks, no failures', () => {
  for (const input of [null, undefined, {}]) {
    // exercising the null/undefined guard deliberately
    const result = computeIntegrityRate(input as never);
    assert.equal(result.integrityRate, 0);
    assert.equal(result.support, 'UNKNOWN');
    assert.equal(result.totalChecks, 0);
    assert.equal(result.passedChecks, 0);
    assert.deepEqual(result.failures, []);
  }
});

test('promise ratio math is exact for non-trivial fractions', () => {
  const result = computeIntegrityRate({
    assertionContained: true,
    mysteryFair: true,
    cheapSurprises: 0,
    promisesKept: 2,
    promisesTotal: 4, // fails (not all kept) but dimension itself is exact
  });
  // 3 of 4 dims pass: assertion, mystery, surprise; promise fails.
  assert.equal(result.integrityRate, 0.75);
  assert.equal(result.totalChecks, 4);
  assert.equal(result.passedChecks, 3);
});

test('promisesTotal === 0 is a vacuous pass (nothing planted, nothing unkept)', () => {
  const result = computeIntegrityRate({ promisesKept: 0, promisesTotal: 0 });
  assert.equal(result.support, 'ENTAILED');
  assert.equal(result.integrityRate, 1);
  assert.deepEqual(result.failures, []);
});

test('negative/non-finite counts are dropped (guarded) rather than corrupting the rate', () => {
  const result = computeIntegrityRate({
    promisesKept: -5,
    promisesTotal: NaN,
    cheapSurprises: -1,
  });
  // promisesTotal NaN -> safeCount 0; promisesKept -5 -> safeCount 0 -> total 0 vacuous pass
  // cheapSurprises -1 -> safeCount 0 -> pass
  assert.equal(result.support, 'ENTAILED');
  assert.equal(result.integrityRate, 1);
  assert.equal(result.totalChecks, 2);
});

test('kept exceeding total is clamped so rate never exceeds 1.0 for that dimension', () => {
  const result = computeIntegrityRate({ promisesKept: 10, promisesTotal: 2 });
  assert.equal(result.support, 'ENTAILED');
  assert.equal(result.integrityRate, 1);
});

test('overall integrityRate is always clamped within [0, 1]', () => {
  const result = computeIntegrityRate({
    assertionContained: false,
    mysteryFair: false,
    cheapSurprises: 3,
    promisesKept: 0,
    promisesTotal: 5,
  });
  assert.ok(result.integrityRate >= 0 && result.integrityRate <= 1);
  assert.equal(result.integrityRate, 0);
  assert.equal(result.support, 'CONTRADICTED');
  assert.deepEqual(result.failures, ['assertion-contradiction', 'unkept-promises', 'unfair-mystery', 'cheap-surprise']);
});

test('boolean dimensions with only one of the two count-fields present are still applicable', () => {
  const onlyKept = computeIntegrityRate({ promisesKept: 1 });
  assert.equal(onlyKept.totalChecks, 1);
  const onlyTotal = computeIntegrityRate({ promisesTotal: 1 });
  assert.equal(onlyTotal.totalChecks, 1);
  const onlyCheap = computeIntegrityRate({ cheapSurprises: 0 });
  assert.equal(onlyCheap.totalChecks, 1);
  const onlyWellMade = computeIntegrityRate({ wellMadeSurprises: 1 });
  assert.equal(onlyWellMade.totalChecks, 1);
});
