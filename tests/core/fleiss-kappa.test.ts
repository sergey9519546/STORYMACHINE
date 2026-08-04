// FLEISS' KAPPA — unit tests against known, hand-computable / published
// values, per CLAUDE.md's requirement that any scoring-adjacent math ship
// with reference cases, not just synthetic fire/no-fire coverage.
//
// scripts/p1-labeling/lib/fleiss-kappa.mjs implements the ~40-line formula;
// this file proves it against:
//   1. A small 4-item / 3-rater / 2-category table whose kappa is an exact
//      fraction (1/3), hand-derived below so the arithmetic is checkable
//      without running any code.
//   2. Fleiss (1971) Table 1 — the paper's own worked example (10 subjects,
//      14 raters, 5 categories) — cross-checked against the published
//      kappa (~0.21). This is public statistical literature, not corpus
//      labeling data.
//   3. A perturbation of case 2 (one cell moved) proving the statistic is
//      falsifiable: change real disagreement and kappa must change.
//   4. Degenerate edges: perfect agreement (kappa = 1) and the "all raters
//      agree on everything, every item, one category" zero-chance-error
//      case.
//   5. Input-validation guards (ragged rows, wrong rater count per row).
//
// No fixture in this file is a screenplay quality label — see
// docs/p1-benchmark/LABELING_KIT.md's honesty boundary: this project
// produces ZERO synthetic rating data anywhere, including test fixtures.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { computeFleissKappa, interpretKappa } from '../../scripts/p1-labeling/lib/fleiss-kappa.mjs';

describe('computeFleissKappa', () => {
  it('matches a hand-derived exact fraction (4 items, 3 raters, 2 categories)', () => {
    // Table (item -> [count rating A, count rating B]):
    //   item1: [3,0]   item2: [0,3]   item3: [2,1]   item4: [1,2]
    // N=4, n=3, k=2.
    //
    // p_A = (3+0+2+1)/(4*3) = 6/12 = 1/2   p_B = (0+3+1+2)/12 = 6/12 = 1/2
    // P_e = (1/2)^2 + (1/2)^2 = 1/4 + 1/4 = 1/2
    //
    // P_i = (sum(n_ij^2) - n) / (n*(n-1)), n*(n-1) = 3*2 = 6
    //   item1: (9+0-3)/6 = 6/6   = 1
    //   item2: (0+9-3)/6 = 6/6   = 1
    //   item3: (4+1-3)/6 = 2/6   = 1/3
    //   item4: (1+4-3)/6 = 2/6   = 1/3
    // P_bar = (1 + 1 + 1/3 + 1/3) / 4 = (8/3) / 4 = 2/3
    //
    // kappa = (P_bar - P_e) / (1 - P_e) = (2/3 - 1/2) / (1 - 1/2)
    //       = (1/6) / (1/2) = 1/3
    const table = [
      [3, 0],
      [0, 3],
      [2, 1],
      [1, 2],
    ];
    const result = computeFleissKappa(table);
    assert.equal(result.N, 4);
    assert.equal(result.n, 3);
    assert.equal(result.k, 2);
    assert.ok(Math.abs(result.Pe - 0.5) < 1e-12, `Pe expected 0.5, got ${result.Pe}`);
    assert.ok(Math.abs(result.Pbar - 2 / 3) < 1e-12, `Pbar expected 2/3, got ${result.Pbar}`);
    assert.ok(
      Math.abs(result.kappa - 1 / 3) < 1e-9,
      `kappa expected 1/3 (0.3333...), got ${result.kappa}`
    );
  });

  it('reproduces the published kappa from Fleiss (1971) Table 1', () => {
    // Fleiss, J.L. (1971), Psychological Bulletin 76(5), 378-382, Table 1.
    // 10 subjects (rows), 14 raters per subject, 5 diagnostic categories.
    // Every row sums to 14 by construction (a required precondition of the
    // statistic — checked explicitly below before trusting the result).
    const table = [
      [0, 0, 0, 0, 14],
      [0, 2, 6, 4, 2],
      [0, 0, 3, 5, 6],
      [0, 3, 9, 2, 0],
      [2, 2, 8, 1, 1],
      [7, 7, 0, 0, 0],
      [3, 2, 6, 3, 0],
      [2, 5, 3, 2, 2],
      [6, 5, 2, 1, 0],
      [0, 2, 2, 3, 7],
    ];
    for (const row of table) {
      assert.equal(row.reduce((a, b) => a + b, 0), 14, 'every row of the published table sums to 14 raters');
    }
    const result = computeFleissKappa(table);
    // Fleiss (1971) reports kappa = 0.21 (rounded). This implementation's
    // unrounded value is 0.20993..., which rounds to the same published
    // figure — the tolerance below is loose enough to accept rounding in
    // the original paper's own reporting, tight enough to catch a formula
    // error (a wrong exponent or a missing (n-1) term shifts this well
    // outside 0.01).
    assert.ok(
      Math.abs(result.kappa - 0.21) < 0.01,
      `kappa expected ~0.21 (Fleiss 1971 published value), got ${result.kappa}`
    );
    assert.equal(interpretKappa(result.kappa), 'fair');
  });

  it('is falsifiable: perturbing one cell of the Fleiss table changes kappa', () => {
    const base = [
      [0, 0, 0, 0, 14],
      [0, 2, 6, 4, 2],
      [0, 0, 3, 5, 6],
      [0, 3, 9, 2, 0],
      [2, 2, 8, 1, 1],
      [7, 7, 0, 0, 0],
      [3, 2, 6, 3, 0],
      [2, 5, 3, 2, 2],
      [6, 5, 2, 1, 0],
      [0, 2, 2, 3, 7],
    ];
    const perturbed = base.map((row) => row.slice());
    // Subject 1 was perfect agreement ([0,0,0,0,14]); move one rater's vote
    // from category 5 to category 4 — introduces real disagreement on an
    // item that previously had none, while keeping the row sum at 14.
    perturbed[0] = [0, 0, 0, 1, 13];

    const baseResult = computeFleissKappa(base);
    const perturbedResult = computeFleissKappa(perturbed);

    // Hand check: perturbed subject 1's P_i drops from 1 to
    // (1 + 169 - 14) / (14*13) = 156/182 = 6/7 ≈ 0.857143, so P_bar drops by
    // (1 - 6/7)/10 = (1/7)/10 = 1/70 ≈ 0.014286 relative to the base P_bar —
    // a real, non-zero, predictable movement, not noise.
    const expectedPbarDelta = (1 - 6 / 7) / 10;
    assert.ok(
      Math.abs((baseResult.Pbar - perturbedResult.Pbar) - expectedPbarDelta) < 1e-9,
      `P_bar should drop by exactly 1/70; base=${baseResult.Pbar} perturbed=${perturbedResult.Pbar}`
    );
    assert.notEqual(baseResult.kappa, perturbedResult.kappa, 'perturbing a real cell must move kappa');
    assert.ok(perturbedResult.kappa < baseResult.kappa, 'introducing disagreement must lower kappa, not raise it');
    // Loose sanity bound matching the /tmp derivation used to build this
    // fixture (not re-run here — the delta check above is the real proof).
    assert.ok(Math.abs(perturbedResult.kappa - 0.1928) < 0.001, `perturbed kappa expected ~0.1928, got ${perturbedResult.kappa}`);
  });

  it('returns kappa = 1 for perfect agreement across items and categories', () => {
    // 3 items, 3 raters, 2 categories, unanimous every time.
    const table = [
      [3, 0],
      [0, 3],
      [3, 0],
    ];
    const result = computeFleissKappa(table);
    assert.equal(result.kappa, 1);
    assert.equal(interpretKappa(result.kappa), 'almost perfect');
  });

  it('reports kappa = 1 (not NaN) when every rating lands in a single category with zero diversity', () => {
    // Degenerate Pe === 1 case: all items, all raters, one category. There
    // is no disagreement to measure and no chance model to compare against
    // (Pe = 1 makes the raw formula 0/0) — treated as full agreement by
    // convention, not as an error.
    const table = [
      [5, 0, 0],
      [5, 0, 0],
    ];
    const result = computeFleissKappa(table);
    assert.equal(result.Pe, 1);
    assert.equal(result.kappa, 1);
    assert.ok(!Number.isNaN(result.kappa));
  });

  it('rejects a table where rows do not share the same rater count', () => {
    const raggedTable = [
      [2, 1], // sums to 3
      [1, 1], // sums to 2 -- mismatched rater count
    ];
    assert.throws(() => computeFleissKappa(raggedTable), /same, fixed rater count/);
  });

  it('rejects fewer than 2 categories and fewer than 2 raters', () => {
    assert.throws(() => computeFleissKappa([[5]]), /at least 2 categories/);
    assert.throws(() => computeFleissKappa([[1, 0]]), /at least 2 raters/);
  });

  it('rejects an empty table', () => {
    assert.throws(() => computeFleissKappa([]), /non-empty/);
  });
});

describe('interpretKappa', () => {
  it('follows the Landis & Koch (1977) bands cited in ADR-002', () => {
    assert.equal(interpretKappa(-0.1), 'poor (worse than chance)');
    assert.equal(interpretKappa(0.1), 'slight');
    assert.equal(interpretKappa(0.35), 'fair');
    assert.equal(interpretKappa(0.55), 'moderate');
    assert.equal(interpretKappa(0.65), 'substantial');
    assert.equal(interpretKappa(0.9), 'almost perfect');
    // ADR-002's own gate value must land in "substantial" — this is the
    // whole point of choosing 0.60 as the threshold.
    assert.equal(interpretKappa(0.60), 'moderate'); // exactly 0.60 is the moderate/substantial boundary, inclusive-low per Landis & Koch's own table (0.41-0.60 moderate, 0.61-0.80 substantial)
    assert.equal(interpretKappa(0.61), 'substantial');
  });
});
