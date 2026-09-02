#!/usr/bin/env node
// power-analysis.mjs — all arithmetic for POWER_ANALYSIS_2026-09-02.md.
// Zero dependencies. Every number quoted in the doc must come from this
// script's stdout — nothing here is typed by hand into the doc.

// ---------------------------------------------------------------------------
// Shared constants
// ---------------------------------------------------------------------------
const Z_975 = 1.959964;   // two-sided alpha=0.05 critical value (95% CI)
const Z_80POWER = 0.841621; // one-sided z for 80% power (beta=0.20)

function fmt(x, d = 4) {
  return Number(x.toFixed(d));
}

// ---------------------------------------------------------------------------
// Section 1: Hanley-McNeil SE of AUC
// ---------------------------------------------------------------------------
// SE(AUC) = sqrt[ AUC(1-AUC) + (n1-1)(Q1-AUC^2) + (n2-1)(Q2-AUC^2) ] / sqrt(n1*n2)
// Q1 = AUC / (2 - AUC)
// Q2 = 2*AUC^2 / (1 + AUC)
function hanleyMcNeilSE(auc, n1, n2) {
  const q1 = auc / (2 - auc);
  const q2 = (2 * auc * auc) / (1 + auc);
  const numerator =
    auc * (1 - auc) +
    (n1 - 1) * (q1 - auc * auc) +
    (n2 - 1) * (q2 - auc * auc);
  return Math.sqrt(numerator / (n1 * n2));
}

console.log('='.repeat(78));
console.log('SECTION 1 — Hanley-McNeil SE of AUC, n=153-script test partition');
console.log('='.repeat(78));

const N = 153;
const splits = [
  { label: '50/50 (pairwise-construction default: each script contributes one "better" and one "worse" instance)', n1: 77, n2: 76 },
  { label: 'derived from SPLIT_STRATEGY quality-tier target (A+B=60% vs C+D=40%, midpoints 25/35/30/10)', n1: Math.round(N * 0.6), n2: N - Math.round(N * 0.6) },
  { label: '1:3 imbalance (stress case)', n1: Math.round(N / 4), n2: N - Math.round(N / 4) },
];

const aucPoints = [
  { label: 'gate (0.80)', auc: 0.80 },
  { label: 'observed MIDPOINT_DROP test baseline (0.766)', auc: 0.766 },
  { label: 'observed SCENE_SHUFFLE test baseline (0.734)', auc: 0.734 },
];

for (const split of splits) {
  console.log(`\n-- split: ${split.label} --`);
  console.log(`   n1=${split.n1}, n2=${split.n2} (n1+n2=${split.n1 + split.n2})`);
  for (const p of aucPoints) {
    const se = hanleyMcNeilSE(p.auc, split.n1, split.n2);
    const ciLo = p.auc - Z_975 * se;
    const ciHi = p.auc + Z_975 * se;
    const width = 2 * Z_975 * se;
    console.log(
      `   AUC=${p.auc} (${p.label}): SE=${fmt(se)}  95% CI=[${fmt(ciLo)}, ${fmt(ciHi)}]  width=${fmt(width)}`
    );
  }
}

// Minimum detectable difference between two INDEPENDENT AUC estimates
// (e.g. re-measuring the same channel after a scoring change), same n,
// evaluated at the midpoint AUC ~0.78 for both arms (symmetric case):
//   MDE = (z_{1-alpha/2} + z_{1-beta}) * sqrt(SE_A^2 + SE_B^2)
console.log(`\n-- Minimum detectable difference (MDE) between two independent AUC`);
console.log(`   estimates at 80% power, alpha=0.05 two-sided, evaluated at AUC~0.78 --`);
for (const split of splits) {
  const se = hanleyMcNeilSE(0.78, split.n1, split.n2);
  const mde = (Z_975 + Z_80POWER) * Math.sqrt(se * se + se * se);
  console.log(`   ${split.label}: SE=${fmt(se)}  MDE=${fmt(mde)}`);
}

// One-sample question: is a fixed gate of 0.80 distinguishable from a fixed
// comparator of 0.75 given the CI computed AT the gate value (single point
// estimate vs a fixed constant)?
console.log(`\n-- One-sample check: is 0.80 distinguishable from 0.75 at n=153? --`);
for (const split of splits) {
  const se = hanleyMcNeilSE(0.80, split.n1, split.n2);
  const ciLo = 0.80 - Z_975 * se;
  const distinguishable = ciLo > 0.75;
  console.log(
    `   ${split.label}: SE=${fmt(se)}  95% CI lower bound=${fmt(ciLo)}  ` +
    `0.75 ${distinguishable ? 'OUTSIDE (distinguishable)' : 'INSIDE the CI (NOT distinguishable)'}`
  );
}

// ---------------------------------------------------------------------------
// Section 2: Fleiss' kappa SE, overlap budget
// ---------------------------------------------------------------------------
console.log('\n' + '='.repeat(78));
console.log('SECTION 2 — Fleiss\' kappa: overlap budget for a target CI half-width');
console.log('='.repeat(78));

// Large-sample variance approximation for Fleiss' kappa (Fleiss, Levin & Paik
// 2003, the formula implemented by the `irr` R package's kappam.fleiss):
//   Var(kappa) = (2 / (N*n*(n-1))) * [ (S1)^2 - S2 ] / (S1)^2
// where, with p_j = marginal proportion of all ratings falling in category j:
//   S1 = sum_j p_j (1 - p_j)
//   S2 = sum_j p_j (1 - p_j) (1 - 2 p_j)
// This requires the p_j (category marginals), which do not exist yet (no
// labels collected). We compute it under a stated PLANNING assumption and
// show the sensitivity to that assumption.
function fleissVarPerSubject(pj) {
  // returns Var(kappa) * N * n * (n-1) / 2  (i.e. the part independent of N,n)
  const s1 = pj.reduce((s, p) => s + p * (1 - p), 0);
  const s2 = pj.reduce((s, p) => s + p * (1 - p) * (1 - 2 * p), 0);
  return (s1 * s1 - s2) / (s1 * s1);
}

const scenarios = [
  { label: 'uniform 4-tier planning default (A=B=C=D=0.25)', pj: [0.25, 0.25, 0.25, 0.25] },
  { label: 'SPLIT_STRATEGY target distribution (A=0.25,B=0.35,C=0.30,D=0.10)', pj: [0.25, 0.35, 0.30, 0.10] },
];

const nRaters = 3;
const target95HalfWidth = 0.10; // proposal: see doc rationale

for (const sc of scenarios) {
  const core = fleissVarPerSubject(sc.pj); // Var(kappa) = 2*core / (N*n*(n-1))
  console.log(`\n-- ${sc.label} --`);
  console.log(`   core factor [(S1)^2 - S2]/(S1)^2 = ${fmt(core, 6)}`);
  // Var(kappa) = 2*core / (N * n*(n-1))
  // SE(kappa) = sqrt(2*core / (N*n*(n-1)))
  // Solve for N given target half-width = z*SE:
  //   target = z * sqrt(2*core/(N*n*(n-1)))
  //   N = 2*core*z^2 / (target^2 * n*(n-1))
  const nOverlap = (2 * core * Z_975 * Z_975) / (target95HalfWidth * target95HalfWidth * nRaters * (nRaters - 1));
  console.log(
    `   N (all-${nRaters}-raters overlap) for 95% CI half-width <= ${target95HalfWidth}: ` +
    `N = 2*core*z^2 / (halfWidth^2 * n*(n-1)) = ${fmt(nOverlap, 2)} -> round up to ${Math.ceil(nOverlap)}`
  );
  // Show SE and CI width at a few candidate N values
  for (const testN of [30, 43, 45, 60, 100, 150]) {
    const varK = (2 * core) / (testN * nRaters * (nRaters - 1));
    const se = Math.sqrt(varK);
    const halfWidth = Z_975 * se;
    console.log(`     N=${testN}: SE=${fmt(se)}  95% half-width=${fmt(halfWidth)}  full width=${fmt(2 * halfWidth)}`);
  }
}

// Reader labor: total labels per reader and reader-hours.
console.log(`\n-- Reader labor for a full-overlap design (every reader rates every`);
console.log(`   script in the corpus) at the PRE_REGISTRATION_PROTOCOL corpus target --`);
const corpusTargets = [100, 150, 200];
const avgPages = 105; // stated assumption: mid-point of a 90-120pg feature range
const pagesPerHourOptions = [40, 60, 90]; // careful-coverage-with-rating-notes pace range
for (const corpusN of corpusTargets) {
  console.log(`\n   corpus N=${corpusN} (full overlap: each of ${nRaters} readers labels all ${corpusN}):`);
  console.log(`     total labels produced = ${nRaters} * ${corpusN} = ${nRaters * corpusN}`);
  console.log(`     labels per reader = ${corpusN}`);
  const totalPages = corpusN * avgPages;
  console.log(`     pages per reader = ${corpusN} * ${avgPages} = ${totalPages}`);
  for (const pph of pagesPerHourOptions) {
    const hours = totalPages / pph;
    console.log(`       at ${pph} pages/hour: ${fmt(hours, 1)} reader-hours per reader (${fmt(hours * nRaters, 1)} total across ${nRaters} readers)`);
  }
}

// ---------------------------------------------------------------------------
// Section 3: n=5 moderated-session binomial CI
// ---------------------------------------------------------------------------
console.log('\n' + '='.repeat(78));
console.log('SECTION 3 — n=5 moderated sessions: binomial CI on a proportion');
console.log('='.repeat(78));

function logChoose(n, k) {
  function lgamma(x) {
    // Stirling / Lanczos not needed for small integers; use log-factorial via
    // simple accumulation (n<=few hundred is exact enough in double).
    let r = 0;
    for (let i = 2; i < x; i++) r += Math.log(i);
    return r;
  }
  return lgamma(n + 1) - lgamma(k + 1) - lgamma(n - k + 1);
}
function binomPMF(k, n, p) {
  if (p <= 0) return k === 0 ? 1 : 0;
  if (p >= 1) return k === n ? 1 : 0;
  return Math.exp(logChoose(n, k) + k * Math.log(p) + (n - k) * Math.log(1 - p));
}
function binomCDF(k, n, p) {
  let s = 0;
  for (let i = 0; i <= k; i++) s += binomPMF(i, n, p);
  return s;
}
function binomSF(k, n, p) {
  // P(X >= k)
  let s = 0;
  for (let i = k; i <= n; i++) s += binomPMF(i, n, p);
  return s;
}

// Clopper-Pearson exact 95% CI via bisection.
function clopperPearson(x, n, alpha = 0.05) {
  const lo = x === 0 ? 0 : bisect((p) => binomSF(x, n, p) - alpha / 2, 1e-12, 1 - 1e-12);
  const hi = x === n ? 1 : bisect((p) => binomCDF(x, n, p) - alpha / 2, 1e-12, 1 - 1e-12);
  return [lo, hi];
}
function bisect(f, lo, hi, iters = 200) {
  let fLo = f(lo);
  for (let i = 0; i < iters; i++) {
    const mid = (lo + hi) / 2;
    const fMid = f(mid);
    if ((fLo < 0) === (fMid < 0)) {
      lo = mid;
      fLo = fMid;
    } else {
      hi = mid;
    }
  }
  return (lo + hi) / 2;
}

// Wilson score interval, for comparison (better small-n behavior than Wald).
function wilson(x, n, z = Z_975) {
  const p = x / n;
  const denom = 1 + (z * z) / n;
  const center = p + (z * z) / (2 * n);
  const halfWidth = z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n));
  return [(center - halfWidth) / denom, (center + halfWidth) / denom];
}

for (const [x, n] of [[4, 5], [5, 5], [3, 5]]) {
  const cp = clopperPearson(x, n);
  const w = wilson(x, n);
  console.log(
    `\n   x=${x}/n=${n} (observed p=${fmt(x / n)}):\n` +
    `     Clopper-Pearson exact 95% CI: [${fmt(cp[0])}, ${fmt(cp[1])}]  width=${fmt(cp[1] - cp[0])}\n` +
    `     Wilson score 95% CI:          [${fmt(w[0])}, ${fmt(w[1])}]  width=${fmt(w[1] - w[0])}`
  );
}

// What n bounds the exact CI half-width to <= 0.20, assuming the true rate
// stays near the observed 0.8 (i.e. x = round(0.8*n) each time)?
console.log(`\n-- Smallest n (assuming true rate stays near 0.80, x=round(0.8n)) such`);
console.log(`   that the exact Clopper-Pearson 95% CI half-width <= 0.20 --`);
for (let n = 5; n <= 60; n++) {
  const x = Math.round(0.8 * n);
  const cp = clopperPearson(x, n);
  const halfWidth = (cp[1] - cp[0]) / 2;
  if (halfWidth <= 0.20) {
    console.log(`   n=${n}, x=${x}: CI=[${fmt(cp[0])}, ${fmt(cp[1])}]  half-width=${fmt(halfWidth)}  <-- first n meeting +/-20pt target`);
    break;
  }
}
// Also show the conservative Wald-normal planning formulas for reference:
console.log(`\n-- Reference: normal-approximation planning formulas (not what's used above,`);
console.log(`   shown for cross-check) n = z^2*p*(1-p)/E^2, E=0.20, z=1.96 --`);
for (const p of [0.5, 0.8]) {
  const n = (Z_975 * Z_975 * p * (1 - p)) / (0.20 * 0.20);
  console.log(`   p=${p}: n = ${fmt(n, 2)} -> round up to ${Math.ceil(n)}`);
}

console.log('\n' + '='.repeat(78));
console.log('END OF COMPUTATION');
console.log('='.repeat(78));
