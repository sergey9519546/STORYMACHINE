// Diff utility — tests for the pure line-diff behind RevisionPanel's
// per-pass "View changes" view and the span-lock client-side post-check.
// Conventions: node:test + assert/strict, matching tests/core/fountain-analyzer.test.ts.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { diffLines, type DiffLine } from '../../src/lib/diff.ts';

// The correctness invariant every diffLines() output must satisfy, regardless
// of which internal path (exact LCS vs >cap fallback) produced it: dropping
// 'added' rows and joining the rest reconstructs `before`; dropping 'removed'
// rows and joining the rest reconstructs `after`. Both RevisionPanel's diff
// view and its span-lock post-check ultimately depend on this holding.
function assertReconstructs(diff: DiffLine[], before: string, after: string) {
  const reconstructedBefore = diff.filter(d => d.type !== 'added').map(d => d.line).join('\n');
  const reconstructedAfter = diff.filter(d => d.type !== 'removed').map(d => d.line).join('\n');
  assert.equal(reconstructedBefore, before);
  assert.equal(reconstructedAfter, after);
}

describe('diffLines — identity', () => {
  it('marks every line "same" with matching line numbers when before === after', () => {
    const text = ['INT. KITCHEN - DAY', '', 'Sarah stares.', '', 'SARAH', 'Hello.'].join('\n');
    const diff = diffLines(text, text);
    assert.equal(diff.length, 6);
    assert.ok(diff.every(d => d.type === 'same'));
    diff.forEach((d, idx) => {
      assert.equal(d.beforeLine, idx + 1);
      assert.equal(d.afterLine, idx + 1);
    });
    assertReconstructs(diff, text, text);
  });
});

describe('diffLines — pure insertion', () => {
  it('inserts one line in the middle without disturbing surrounding same lines', () => {
    const before = ['A', 'B'].join('\n');
    const after = ['A', 'X', 'B'].join('\n');
    const diff = diffLines(before, after);
    assert.deepEqual(diff, [
      { type: 'same', line: 'A', beforeLine: 1, afterLine: 1 },
      { type: 'added', line: 'X', afterLine: 2 },
      { type: 'same', line: 'B', beforeLine: 2, afterLine: 3 },
    ]);
    assertReconstructs(diff, before, after);
  });
});

describe('diffLines — pure deletion', () => {
  it('removes one line from the middle without disturbing surrounding same lines', () => {
    const before = ['A', 'X', 'B'].join('\n');
    const after = ['A', 'B'].join('\n');
    const diff = diffLines(before, after);
    assert.deepEqual(diff, [
      { type: 'same', line: 'A', beforeLine: 1, afterLine: 1 },
      { type: 'removed', line: 'X', beforeLine: 2 },
      { type: 'same', line: 'B', beforeLine: 3, afterLine: 2 },
    ]);
    assertReconstructs(diff, before, after);
  });
});

describe('diffLines — replacement', () => {
  it('turns a single changed line into a removed+added pair, not a spurious same', () => {
    const before = ['A', 'B', 'C'].join('\n');
    const after = ['A', 'X', 'C'].join('\n');
    const diff = diffLines(before, after);
    assert.deepEqual(diff, [
      { type: 'same', line: 'A', beforeLine: 1, afterLine: 1 },
      { type: 'removed', line: 'B', beforeLine: 2 },
      { type: 'added', line: 'X', afterLine: 2 },
      { type: 'same', line: 'C', beforeLine: 3, afterLine: 3 },
    ]);
    assertReconstructs(diff, before, after);
  });
});

describe('diffLines — interleaved changes', () => {
  it('tracks correct independent line numbers on both sides across multiple separated changes', () => {
    const before = ['alpha', 'bravo', 'charlie', 'delta', 'echo'].join('\n');
    const after = ['alpha', 'BRAVO', 'charlie', 'DELTA', 'echo'].join('\n');
    const diff = diffLines(before, after);

    // Untouched anchors must resolve to the correct line number on BOTH
    // sides even though the lines between them shifted independently.
    assert.deepEqual(diff, [
      { type: 'same', line: 'alpha', beforeLine: 1, afterLine: 1 },
      { type: 'removed', line: 'bravo', beforeLine: 2 },
      { type: 'added', line: 'BRAVO', afterLine: 2 },
      { type: 'same', line: 'charlie', beforeLine: 3, afterLine: 3 },
      { type: 'removed', line: 'delta', beforeLine: 4 },
      { type: 'added', line: 'DELTA', afterLine: 4 },
      { type: 'same', line: 'echo', beforeLine: 5, afterLine: 5 },
    ]);
    assertReconstructs(diff, before, after);
  });
});

describe('diffLines — empty inputs', () => {
  it('treats an empty original as a pure insertion of every line in `after`', () => {
    const after = ['x', 'y'].join('\n');
    const diff = diffLines('', after);
    assert.ok(diff.every(d => d.type === 'added'));
    assert.deepEqual(diff.map(d => d.line), ['x', 'y']);
    assert.deepEqual(diff.map(d => d.afterLine), [1, 2]);
    assertReconstructs(diff, '', after);
  });

  it('treats an empty result as a pure deletion of every line in `before`', () => {
    const before = ['x', 'y'].join('\n');
    const diff = diffLines(before, '');
    assert.ok(diff.every(d => d.type === 'removed'));
    assert.deepEqual(diff.map(d => d.line), ['x', 'y']);
    assert.deepEqual(diff.map(d => d.beforeLine), [1, 2]);
    assertReconstructs(diff, before, '');
  });

  it('produces zero rows — not a phantom blank line — when both sides are empty', () => {
    const diff = diffLines('', '');
    assert.deepEqual(diff, []);
    assertReconstructs(diff, '', '');
  });
});

describe('diffLines — >cap fallback (pathologically large changed middle)', () => {
  it('still produces a fully reconstructible patch when the changed middle exceeds the DP cap', () => {
    // No shared prefix/suffix and thousands of wholly distinct lines on both
    // sides forces the entire body into the "middle" and past the ~4000-line
    // DP cap, exercising the collapsed replace-block fallback rather than
    // the exact LCS path (which would be prohibitively large here).
    const N = 4500;
    const before = Array.from({ length: N }, (_, i) => `before-only-line-${i}`).join('\n');
    const after = Array.from({ length: N }, (_, i) => `after-only-line-${i}`).join('\n');
    const diff = diffLines(before, after);

    // Coarse but valid: nothing on either side matches, so the fallback
    // collapses to "everything before removed, everything after added" —
    // no spurious 'same' rows.
    assert.ok(diff.every(d => d.type === 'removed' || d.type === 'added'));
    assert.equal(diff.filter(d => d.type === 'removed').length, N);
    assert.equal(diff.filter(d => d.type === 'added').length, N);
    assertReconstructs(diff, before, after);
  });

  it('still finds the shared prefix/suffix surrounding an oversized middle', () => {
    const N = 4200;
    const sharedHead = 'INT. OPENING SCENE - DAY';
    const sharedTail = 'FADE OUT.';
    const beforeMid = Array.from({ length: N }, (_, i) => `before-${i}`);
    const afterMid = Array.from({ length: N }, (_, i) => `after-${i}`);
    const before = [sharedHead, ...beforeMid, sharedTail].join('\n');
    const after = [sharedHead, ...afterMid, sharedTail].join('\n');
    const diff = diffLines(before, after);

    assert.deepEqual(diff[0], { type: 'same', line: sharedHead, beforeLine: 1, afterLine: 1 });
    assert.deepEqual(diff[diff.length - 1], {
      type: 'same', line: sharedTail, beforeLine: N + 2, afterLine: N + 2,
    });
    assert.equal(diff.length, 2 + N + N); // shared head + shared tail + N removed + N added
    assertReconstructs(diff, before, after);
  });
});
