// Pure classification tests for the metamorphic runner's hard vs known-failing policy.
// The full doctor suite is exercised by `npm run test:metamorphic` / CI.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  classifyResults,
  HARD_CASE_IDS,
  KNOWN_FAILING_CASE_IDS,
  check,
} from './metamorphic-lib.ts';
import type { MetamorphicResult } from '../contracts/scoring-eval-case.ts';

function result(id: string, passed: boolean): MetamorphicResult {
  return {
    id,
    category: 'invariance',
    baseHealth: 66.4,
    variantHealth: passed ? 66.4 : 72.9,
    delta: passed ? 0 : 6.5,
    passed,
    reason: passed ? 'ok' : 'fail',
  };
}

describe('metamorphic classifyResults', () => {
  it('treats empty_verbosity failure as known-failing, not hard', () => {
    const { hardFailures, knownFailures } = classifyResults([
      result('identity', true),
      result('empty_verbosity', false),
      result('scene_shuffle', true),
    ]);
    assert.deepEqual(hardFailures.map(r => r.id), []);
    assert.deepEqual(knownFailures.map(r => r.id), ['empty_verbosity']);
  });

  it('treats a failed hard case as a hard failure', () => {
    const { hardFailures, knownFailures } = classifyResults([
      result('identity', false),
      result('empty_verbosity', false),
    ]);
    assert.deepEqual(hardFailures.map(r => r.id), ['identity']);
    assert.deepEqual(knownFailures.map(r => r.id), ['empty_verbosity']);
  });

  it('surfaces an unexpected pass of a known-failing case', () => {
    const { unexpectedPasses } = classifyResults([
      result('empty_verbosity', true),
    ]);
    assert.deepEqual(unexpectedPasses.map(r => r.id), ['empty_verbosity']);
  });

  it('HARD and KNOWN_FAILING partitions are disjoint and cover the suite ids', () => {
    for (const id of KNOWN_FAILING_CASE_IDS) {
      assert.equal(HARD_CASE_IDS.has(id), false, `${id} must not be both hard and known-failing`);
    }
    assert.ok(HARD_CASE_IDS.has('scene_shuffle'));
    assert.ok(KNOWN_FAILING_CASE_IDS.has('empty_verbosity'));
  });
});

describe('metamorphic check()', () => {
  it('not_increase fails when health rises past epsilon', () => {
    const r = check(
      { id: 'x', category: 'invariance', description: '', transform: b => b, expect: { kind: 'not_increase', epsilon: 0.5 }, provenance: { author: 't', created: '2026-07-14' } },
      66.4,
      72.9,
    );
    assert.equal(r.passed, false);
  });

  it('decrease passes when drop meets minDrop', () => {
    const r = check(
      { id: 'x', category: 'sensitivity', description: '', transform: b => b, expect: { kind: 'decrease', minDrop: 0.1 }, provenance: { author: 't', created: '2026-07-14' } },
      66.4,
      63.8,
    );
    assert.equal(r.passed, true);
  });
});
