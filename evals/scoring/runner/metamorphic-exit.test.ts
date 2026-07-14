// Exit-code contract for classifyResults → process.exitCode mapping.
// Does not re-run the doctor; only asserts the hard-fail decision rule used by
// run-metamorphic.ts so CI cannot silently ignore hard regressions.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { classifyResults } from './metamorphic-lib.ts';
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

/** Mirror of run-metamorphic.ts exit decision (kept tiny and explicit). */
function exitCodeFor(results: MetamorphicResult[]): number {
  const { hardFailures } = classifyResults(results);
  return hardFailures.length > 0 ? 1 : 0;
}

describe('metamorphic exit-code contract', () => {
  it('exits 0 when only known-failing empty_verbosity fails', () => {
    const code = exitCodeFor([
      result('identity', true),
      result('whitespace_reflow', true),
      result('rename_character', true),
      result('empty_verbosity', false),
      result('scene_shuffle', true),
      result('scene_reverse', true),
      result('scene_dup_padding', true),
    ]);
    assert.equal(code, 0);
  });

  it('exits 1 when a hard case fails', () => {
    const code = exitCodeFor([
      result('identity', true),
      result('scene_shuffle', false),
      result('empty_verbosity', false),
    ]);
    assert.equal(code, 1);
  });
});
