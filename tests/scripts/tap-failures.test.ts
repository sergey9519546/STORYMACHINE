// tap-failures.test.ts — scripts/tap-failures.mjs pulls a red run's `not ok`
// lines out of a full TAP13 stream so they survive GitHub's ~100 KB job-log
// truncation (see that script's header for the full incident this fixes:
// run 34741928418 reported "# fail 2" with no way to name them from the API).
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { extractFailures, renderSummary } from '../../scripts/tap-failures.mjs';

// A representative slice of real node:test TAP13 output: one passing test,
// one failing test with a multi-line block-scalar `error:`, and a second
// failing test with a short INLINE error — the two shapes the extractor has
// to handle differently.
const SAMPLE_TAP = `TAP version 13
# Subtest: a passing test
ok 1 - a passing test
  ---
  duration_ms: 0.7
  type: 'test'
  ...
# Subtest: a failing test with a multi-line error
not ok 2 - a failing test with a multi-line error
  ---
  duration_ms: 0.7
  type: 'test'
  location: '/repo/tests/example.test.ts:10:1'
  failureType: 'testCodeFailure'
  error: |-
    one is not two

    1 !== 2

  code: 'ERR_ASSERTION'
  name: 'AssertionError'
  ...
# Subtest: a second failing test with a short error
not ok 3 - a second failing test with a short error
  ---
  duration_ms: 0.3
  type: 'test'
  location: '/repo/tests/example.test.ts:20:1'
  failureType: 'testCodeFailure'
  error: boom
  code: 'ERR_ASSERTION'
  ...
1..3
# tests 3
# pass 1
# fail 2
`;

describe('tap-failures: extractFailures', () => {
  it('finds every `not ok` line and none of the `ok` ones', () => {
    const failures = extractFailures(SAMPLE_TAP);
    assert.equal(failures.length, 2, 'exactly the two `not ok` tests, not the one `ok` test');
    assert.deepEqual(failures.map((f) => f.num), ['2', '3']);
    assert.deepEqual(failures.map((f) => f.name), [
      'a failing test with a multi-line error',
      'a second failing test with a short error',
    ]);
  });

  it('extracts the location field for each failure', () => {
    const failures = extractFailures(SAMPLE_TAP);
    assert.equal(failures[0].location, "'/repo/tests/example.test.ts:10:1'");
    assert.equal(failures[1].location, "'/repo/tests/example.test.ts:20:1'");
  });

  it('extracts a multi-line block-scalar `error:` body, collapsed to one line', () => {
    const failures = extractFailures(SAMPLE_TAP);
    assert.equal(failures[0].error, 'one is not two 1 !== 2');
  });

  it('extracts a short inline `error:` value without treating it as a block scalar', () => {
    const failures = extractFailures(SAMPLE_TAP);
    assert.equal(failures[1].error, 'boom');
  });

  it('returns an empty array for an all-passing stream', () => {
    const allPass = SAMPLE_TAP
      .replace(/not ok 2 - .+/, 'ok 2 - a failing test with a multi-line error')
      .replace(/not ok 3 - .+/, 'ok 3 - a second failing test with a short error');
    // The replaced `ok N` lines still carry the old diagnostic blocks
    // (including old `error:` fields) — extractFailures must key on the
    // `not ok` prefix, not on the presence of an `error:` field, so this is
    // a real negative case and not just an empty string.
    assert.deepEqual(extractFailures(allPass), []);
  });

  it('does not let one failure\'s scan run past a later `not ok` line when no `---` is present', () => {
    // A hand-built TAP fragment with no diagnostic block at all for the
    // first failure — the scan must stop at the next `not ok`, not swallow
    // the second failure's own block as the first failure's "error".
    const noBlock = [
      'not ok 1 - no diagnostic block at all',
      'not ok 2 - a real failure',
      '  ---',
      "  location: '/repo/x.test.ts:1:1'",
      '  error: real error',
      '  ...',
    ].join('\n');
    const failures = extractFailures(noBlock);
    assert.equal(failures.length, 2);
    assert.equal(failures[0].location, '(no diagnostic block)');
    assert.equal(failures[0].error, '(no diagnostic block)');
    assert.equal(failures[1].location, "'/repo/x.test.ts:1:1'");
    assert.equal(failures[1].error, 'real error');
  });
});

describe('tap-failures: renderSummary', () => {
  it('reports "nothing to report" for zero failures, without a failure count line', () => {
    const out = renderSummary([]);
    assert.match(out, /no `not ok` lines found/);
    assert.doesNotMatch(out, /failing test\(s\)/);
  });

  it('prints one block per failure, in order, with number/name/location/error all present', () => {
    const failures = extractFailures(SAMPLE_TAP);
    const out = renderSummary(failures);
    assert.match(out, /2 failing test\(s\)/);
    const idx2 = out.indexOf('not ok 2 -');
    const idx3 = out.indexOf('not ok 3 -');
    assert.ok(idx2 !== -1 && idx3 !== -1 && idx2 < idx3, 'both failures present, in TAP order');
    assert.match(out, /location: '\/repo\/tests\/example\.test\.ts:10:1'/);
    assert.match(out, /error: one is not two 1 !== 2/);
    assert.match(out, /error: boom/);
  });
});
