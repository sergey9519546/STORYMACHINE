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
import {
  METAMORPHIC_CASES,
  STAPLED_SHORT_NAMES,
  stapledShortParts,
  stapledShortsText,
} from './metamorphic-cases.ts';

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

  it('case definitions are the exact single source of policy truth', () => {
    const ids = METAMORPHIC_CASES.map(c => c.id);
    assert.equal(new Set(ids).size, ids.length, 'case ids must be unique');
    assert.deepEqual(ids, [
      'identity',
      'whitespace_reflow',
      'rename_character',
      // 2026-09-12: a Fountain-legal dialogue reflow, epsilon 0. See the case's
      // own comment in metamorphic-cases.ts and
      // tests/core/parse-format-invariance.test.ts for the per-script set.
      'dialogue_reflow',
      'empty_verbosity',
      'scene_shuffle',
      'scene_reverse',
      'scene_dup_padding',
      'stapled_shorts',
    ]);
    assert.deepEqual([...KNOWN_FAILING_CASE_IDS], ['empty_verbosity']);
    assert.deepEqual([...HARD_CASE_IDS], ids.filter(id => id !== 'empty_verbosity'));
  });
});

describe('stapled_shorts case shape', () => {
  const stapled = METAMORPHIC_CASES.find(c => c.id === 'stapled_shorts')!;

  it('names exactly twelve parts and reads each of them', () => {
    assert.equal(STAPLED_SHORT_NAMES.length, 12);
    assert.equal(stapledShortParts().length, 12);
    assert.equal(stapled.parts, stapledShortParts, 'the case must use the SAME loader as the variant builder');
  });

  it('is the only case with a `parts` comparison point', () => {
    assert.deepEqual(METAMORPHIC_CASES.filter(c => c.parts).map(c => c.id), ['stapled_shorts']);
  });

  it('the variant contains every part\'s scene body and no part\'s title page', () => {
    const text = stapledShortsText();
    for (const part of stapledShortParts()) {
      const body = part.slice(part.search(/^(INT\.|EXT\.)/mi));
      assert.ok(text.includes(body.trimEnd()), 'every part\'s scene body must survive the staple');
      const titlePage = part.slice(0, part.search(/^(INT\.|EXT\.)/mi));
      if (titlePage.includes('Title:')) {
        assert.ok(!text.includes(titlePage.trim()), 'no part\'s title page may be stapled into the middle of the document');
      }
    }
  });

  it('asserts an inequality, not a tolerance', () => {
    assert.deepEqual(stapled.expect, { kind: 'not_increase', epsilon: 0 });
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
