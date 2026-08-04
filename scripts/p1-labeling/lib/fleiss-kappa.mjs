// FLEISS' KAPPA — inter-rater agreement for >=2 raters over nominal categories.
//
// Formula source: Fleiss, J.L. (1971). "Measuring nominal scale agreement
// among many raters." Psychological Bulletin, 76(5), 378-382. The worked
// example in tests/core/fleiss-kappa.test.ts reproduces that paper's Table 1
// (N=10 subjects, n=14 raters, k=5 categories) and checks this implementation
// against the published kappa (~0.21) as an independent cross-check, plus a
// small hand-computable case whose arithmetic is shown in the test comment.
//
// ADR-002 (docs/adr/ADR-002-p1-benchmark-design.md) sets the P1 labeling gate
// at Fleiss' kappa >= 0.60 ("substantial agreement" on the Landis & Koch
// 1977 scale). This module implements the statistic only; the >=0.60 gate
// check lives in compute-agreement.mjs, which is the thing that actually
// applies ADR-002's threshold.
//
// ── The formula ──────────────────────────────────────────────────────────
// Given N items, each rated by the SAME FIXED number n of raters, into one
// of k mutually exclusive categories, and n_ij = the number of raters who
// assigned item i to category j:
//
//   p_j    = (1 / (N*n)) * sum_i( n_ij )                    -- category j's overall share of all ratings
//   P_i    = (1 / (n*(n-1))) * ( sum_j( n_ij^2 ) - n )       -- item i's own observed agreement
//   P_bar  = (1/N) * sum_i( P_i )                            -- mean observed agreement
//   P_e    = sum_j( p_j^2 )                                  -- agreement expected by chance
//   kappa  = (P_bar - P_e) / (1 - P_e)
//
// This module takes the n_ij matrix directly (an N x k array of counts) so
// it stays independent of how categories are labeled or how the raw ratings
// were collected — compute-agreement.mjs is responsible for turning
// {reader, script, tier} rows into that matrix.

/**
 * @param {number[][]} table - N items x k categories, table[i][j] = number
 *   of raters who assigned item i to category j. Every row MUST sum to the
 *   same n (Fleiss' kappa requires a fixed number of raters per item) —
 *   pass only complete rows; filter incomplete items out before calling.
 * @returns {{ kappa: number, n: number, k: number, N: number, pj: number[],
 *   Pi: number[], Pbar: number, Pe: number }}
 */
export function computeFleissKappa(table) {
  if (!Array.isArray(table) || table.length === 0) {
    throw new Error('computeFleissKappa: table must be a non-empty array of rows.');
  }
  const N = table.length;
  const k = table[0].length;
  if (k < 2) throw new Error('computeFleissKappa: need at least 2 categories.');

  const n = table[0].reduce((a, b) => a + b, 0);
  if (n < 2) throw new Error('computeFleissKappa: need at least 2 raters per item.');

  for (let i = 0; i < N; i++) {
    const row = table[i];
    if (!Array.isArray(row) || row.length !== k) {
      throw new Error(`computeFleissKappa: row ${i} does not have ${k} categories.`);
    }
    const rowSum = row.reduce((a, b) => a + b, 0);
    if (rowSum !== n) {
      throw new Error(
        `computeFleissKappa: row ${i} sums to ${rowSum}, expected ${n} (every item must have the same, fixed rater count). ` +
        'Filter out incomplete items before calling this function.'
      );
    }
    for (const v of row) {
      if (!Number.isInteger(v) || v < 0) {
        throw new Error(`computeFleissKappa: row ${i} has a non-integer or negative count (${v}).`);
      }
    }
  }

  const colSums = new Array(k).fill(0);
  for (const row of table) for (let j = 0; j < k; j++) colSums[j] += row[j];
  const pj = colSums.map((s) => s / (N * n));

  const Pi = table.map((row) => {
    const sumSq = row.reduce((a, x) => a + x * x, 0);
    return (sumSq - n) / (n * (n - 1));
  });
  const Pbar = Pi.reduce((a, b) => a + b, 0) / N;
  const Pe = pj.reduce((a, p) => a + p * p, 0);

  // Pe === 1 means every rating landed in a single category (zero variance) —
  // "expected chance agreement" is total agreement, and kappa is
  // mathematically undefined (0/0). Report it as exactly 1 (raters agreed
  // completely and there was no category diversity to disagree about),
  // which is the conventional treatment, rather than throwing or returning
  // NaN into a PASS/FAIL gate.
  const kappa = Pe === 1 ? 1 : (Pbar - Pe) / (1 - Pe);

  return { kappa, n, k, N, pj, Pi, Pbar, Pe };
}

/**
 * Interpretation band per Landis & Koch (1977), as cited in ADR-002's
 * "Why Fleiss' kappa >= 0.60?" section.
 * @param {number} kappa
 */
export function interpretKappa(kappa) {
  if (kappa < 0) return 'poor (worse than chance)';
  if (kappa <= 0.20) return 'slight';
  if (kappa <= 0.40) return 'fair';
  if (kappa <= 0.60) return 'moderate';
  if (kappa <= 0.80) return 'substantial';
  return 'almost perfect';
}
