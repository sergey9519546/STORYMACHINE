// Pure line-diff utility — powers RevisionPanel's per-pass "View changes"
// view and the span-lock client-side post-check (verifying protected lines
// truly didn't change). Dependency-free and deterministic: same two strings
// in, same diff out, always.
//
// Algorithm: trim the common prefix/suffix first (cheap, and it's exactly
// what makes typical single-pass revisions — a handful of changed lines in
// an otherwise-untouched script — fast regardless of total script length),
// then run a classic LCS dynamic-program over whatever "changed middle"
// remains to get a minimal, correctly-ordered diff of that middle.

export type DiffLineType = 'same' | 'added' | 'removed';

export interface DiffLine {
  type: DiffLineType;
  line: string;
  /** 1-based line number in `before`. Present for 'same' and 'removed'. */
  beforeLine?: number;
  /** 1-based line number in `after`. Present for 'same' and 'added'. */
  afterLine?: number;
}

// The classic LCS DP table is O(n*m) time AND memory (an (n+1)x(m+1) table).
// For a changed middle of up to DP_LINE_CAP lines on a side, that's at most
// ~4001x4001 Uint16 cells (~32MB) and 16M inner-loop comparisons — a bounded,
// still-interactive cost for an on-demand UI action. Screenplays realistically
// run to a few thousand lines, so this covers the real workload exactly; past
// it (e.g. diffing two almost entirely unrelated documents) the DP table would
// grow unboundedly in both time and memory, which is unacceptable for
// something triggered by clicking "View changes" in a side panel. Past the
// cap we fall back to a single collapsed remove-block + add-block for the
// middle: coarser (no attempt to find a partial LCS within the middle) but
// still O(n+m), and still a fully valid, fully reconstructible patch — which
// is the only invariant callers (and the span-lock post-check) actually rely on.
const DP_LINE_CAP = 4000;

function sameLine(line: string, beforeLine: number, afterLine: number): DiffLine {
  return { type: 'same', line, beforeLine, afterLine };
}
function removedLine(line: string, beforeLine: number): DiffLine {
  return { type: 'removed', line, beforeLine };
}
function addedLine(line: string, afterLine: number): DiffLine {
  return { type: 'added', line, afterLine };
}

// Diffs a "middle" section (already known to share no leading/trailing lines
// with the other side) via classic LCS dynamic programming, and reconstructs
// the diff by backtracking through the table. `offsetA`/`offsetB` are the
// 0-based index, within the FULL original arrays, of the first element of
// `a`/`b` respectively — used to translate mid-local positions back into
// real 1-based line numbers.
function lcsDiffMiddle(a: string[], b: string[], offsetA: number, offsetB: number): DiffLine[] {
  const n = a.length;
  const m = b.length;
  const stride = m + 1;
  // dp[i*stride+j] = length of the LCS of a[0..i) and b[0..j).
  // Uint16 is safe: the LCS length can never exceed min(n, m) <= DP_LINE_CAP (4000).
  const dp = new Uint16Array((n + 1) * stride);

  for (let i = 1; i <= n; i++) {
    const row = i * stride;
    const prevRow = row - stride;
    const ai = a[i - 1];
    for (let j = 1; j <= m; j++) {
      if (ai === b[j - 1]) {
        dp[row + j] = dp[prevRow + j - 1] + 1;
      } else {
        const up = dp[prevRow + j];
        const left = dp[row + j - 1];
        dp[row + j] = up >= left ? up : left;
      }
    }
  }

  // Backtrack from the bottom-right corner. Built in reverse order, so the
  // caller reverses the result. On a tie (up === left), prefer consuming a
  // removed line before an added one — this makes replace blocks render as
  // "removed lines, then added lines" (the conventional diff grouping)
  // instead of interleaving them arbitrarily; reconstruction is correct
  // either way since it only depends on each type's *own* relative order.
  const out: DiffLine[] = [];
  let i = n;
  let j = m;
  while (i > 0 && j > 0) {
    if (a[i - 1] === b[j - 1]) {
      out.push(sameLine(a[i - 1], offsetA + i, offsetB + j));
      i--; j--;
    } else {
      const up = dp[(i - 1) * stride + j];
      const left = dp[i * stride + (j - 1)];
      if (up > left) {
        out.push(removedLine(a[i - 1], offsetA + i));
        i--;
      } else {
        out.push(addedLine(b[j - 1], offsetB + j));
        j--;
      }
    }
  }
  while (i > 0) { out.push(removedLine(a[i - 1], offsetA + i)); i--; }
  while (j > 0) { out.push(addedLine(b[j - 1], offsetB + j)); j--; }

  out.reverse();
  return out;
}

/**
 * Line-level diff between `before` and `after`. Returns a flat, ordered list
 * of same/added/removed rows suitable for direct rendering (each carries the
 * 1-based line number(s) it corresponds to on whichever side(s) it exists).
 *
 * Correctness invariant callers may rely on: filtering out 'added' rows and
 * joining the rest with '\n' reconstructs `before` exactly; filtering out
 * 'removed' rows and joining the rest reconstructs `after` exactly. This
 * holds in BOTH the exact-LCS path and the >cap fallback path.
 */
export function diffLines(before: string, after: string): DiffLine[] {
  // An empty string has zero lines, not one blank line — split('\n') on ''
  // would otherwise yield [''], fabricating a phantom empty line.
  const a = before === '' ? [] : before.split('\n');
  const b = after === '' ? [] : after.split('\n');

  let prefixLen = 0;
  const maxPrefix = Math.min(a.length, b.length);
  while (prefixLen < maxPrefix && a[prefixLen] === b[prefixLen]) prefixLen++;

  // Bounded by maxPrefix - prefixLen so the suffix scan can never re-consume
  // lines already claimed by the prefix scan (matters when e.g. every line
  // is identical — prefixLen alone would already cover the whole array).
  let suffixLen = 0;
  const maxSuffix = maxPrefix - prefixLen;
  while (
    suffixLen < maxSuffix &&
    a[a.length - 1 - suffixLen] === b[b.length - 1 - suffixLen]
  ) suffixLen++;

  const result: DiffLine[] = [];

  for (let k = 0; k < prefixLen; k++) {
    result.push(sameLine(a[k], k + 1, k + 1));
  }

  const midA = a.slice(prefixLen, a.length - suffixLen);
  const midB = b.slice(prefixLen, b.length - suffixLen);
  const offsetA = prefixLen; // 0-based index of midA[0] within `a`
  const offsetB = prefixLen; // 0-based index of midB[0] within `b`

  if (midA.length > DP_LINE_CAP || midB.length > DP_LINE_CAP) {
    // Fallback: the changed middle is too large to afford an exact LCS.
    // Collapse it to one removed block followed by one added block — still
    // a fully valid, fully reconstructible patch, just coarser than the
    // minimal diff a smaller middle would get.
    for (let k = 0; k < midA.length; k++) {
      result.push(removedLine(midA[k], offsetA + k + 1));
    }
    for (let k = 0; k < midB.length; k++) {
      result.push(addedLine(midB[k], offsetB + k + 1));
    }
  } else {
    result.push(...lcsDiffMiddle(midA, midB, offsetA, offsetB));
  }

  for (let k = 0; k < suffixLen; k++) {
    const ai = a.length - suffixLen + k;
    const bi = b.length - suffixLen + k;
    result.push(sameLine(a[ai], ai + 1, bi + 1));
  }

  return result;
}
