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
import { METAMORPHIC_CASES } from './metamorphic-cases.ts';

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
  it('treats a failed empty_verbosity as a HARD failure — it stopped being a known-failing witness on 2026-09-03', () => {
    const { hardFailures, knownFailures } = classifyResults([
      result('identity', true),
      result('empty_verbosity', false),
      result('scene_shuffle', true),
    ]);
    assert.deepEqual(hardFailures.map(r => r.id), ['empty_verbosity']);
    assert.deepEqual(knownFailures.map(r => r.id), []);
  });

  it('treats a failed hard case as a hard failure', () => {
    const { hardFailures, knownFailures } = classifyResults([
      result('identity', false),
      result('scene_shuffle', true),
    ]);
    assert.deepEqual(hardFailures.map(r => r.id), ['identity']);
    assert.deepEqual(knownFailures.map(r => r.id), []);
  });

  it('still knows how to surface an unexpected pass, should a case ever be held known-failing again', () => {
    // KNOWN_FAILING_CASE_IDS is empty today (see the policy assertion below),
    // so this exercises the branch through a synthetic id set rather than a
    // real case — the classifier's contract, not the current roster.
    const { unexpectedPasses, knownFailures, hardFailures } = classifyResults(
      [result('identity', true)],
      new Set(['identity']),
    );
    assert.deepEqual(unexpectedPasses.map(r => r.id), ['identity']);
    assert.deepEqual(knownFailures.map(r => r.id), []);
    assert.deepEqual(hardFailures.map(r => r.id), []);
  });

  it('case definitions are the exact single source of policy truth', () => {
    const ids = METAMORPHIC_CASES.map(c => c.id);
    assert.equal(new Set(ids).size, ids.length, 'case ids must be unique');
    assert.deepEqual(ids, [
      'identity',
      'whitespace_reflow',
      'rename_character',
      'empty_verbosity',
      'filler_scenes',
      'scene_shuffle',
      'scene_reverse',
      'scene_dup_padding',
    ]);
    // No case is held known-failing any more: empty_verbosity, the only one
    // there has ever been, was promoted to hard by lane R5 (2026-09-03).
    assert.deepEqual([...KNOWN_FAILING_CASE_IDS], []);
    assert.deepEqual([...HARD_CASE_IDS], ids);
  });
});

describe('metamorphic check()', () => {
  it('not_increase fails when health rises past epsilon', () => {
    const r = check(
      { id: 'x', category: 'invariance', disposition: 'hard', description: '', transform: b => b, expect: { kind: 'not_increase', epsilon: 0.5 }, provenance: { author: 't', created: '2026-07-14' } },
      66.4,
      72.9,
    );
    assert.equal(r.passed, false);
  });

  it('decrease passes when drop meets minDrop', () => {
    const r = check(
      { id: 'x', category: 'sensitivity', disposition: 'hard', description: '', transform: b => b, expect: { kind: 'decrease', minDrop: 0.1 }, provenance: { author: 't', created: '2026-07-14' } },
      66.4,
      63.8,
    );
    assert.equal(r.passed, true);
  });
});
