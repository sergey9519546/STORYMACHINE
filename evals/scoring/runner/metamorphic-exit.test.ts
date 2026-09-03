// Exit-code contract for classifyResults → process.exitCode mapping.
// Does not re-run the doctor; only asserts the hard-fail decision rule used by
// run-metamorphic.ts so CI cannot silently ignore hard regressions.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { exitCodeForResults } from './metamorphic-lib.ts';
import type { MetamorphicResult } from '../contracts/scoring-eval-case.ts';

function result(id: string, passed: boolean): MetamorphicResult {
  return {
    id,
    category: 'invariance',
    baseHealth: 66.4,
    variantHealth: passed ? 66.4 : 50,
    delta: passed ? 0 : -16.4,
    passed,
    reason: passed ? 'ok' : 'fail',
  };
}

describe('metamorphic exit-code contract', () => {
  it('exits 0 when every case passes', () => {
    const code = exitCodeForResults([
      result('identity', true),
      result('whitespace_reflow', true),
      result('rename_character', true),
      result('empty_verbosity', true),
      result('filler_scenes', true),
      result('scene_shuffle', true),
      result('scene_reverse', true),
      result('scene_dup_padding', true),
    ]);
    assert.equal(code, 0);
  });

  it('exits 1 when empty_verbosity fails — it is a HARD case as of 2026-09-03', () => {
    // It was `known-failing` (exit 0) for seven weeks while the verbosity bias
    // stood; lane R5 fixed the formula and promoted it. This assertion is the
    // guard against it quietly sliding back to a soft witness — see
    // docs/scoring/VERBOSITY_BIAS_FIX_2026-09-03.md.
    const code = exitCodeForResults([
      result('identity', true),
      result('empty_verbosity', false),
    ]);
    assert.equal(code, 1);
  });

  it('exits 1 when a hard case fails', () => {
    const code = exitCodeForResults([
      result('identity', true),
      result('scene_shuffle', false),
    ]);
    assert.equal(code, 1);
  });

  it('exits 0 for an unrecognised-but-passing id, 1 for an unrecognised failing one', () => {
    assert.equal(exitCodeForResults([result('some_future_case', true)]), 0);
    assert.equal(exitCodeForResults([result('some_future_case', false)]), 1);
  });
});
