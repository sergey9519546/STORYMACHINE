// THE RULE CHANNEL MUST HAVE A GRADIENT WHEREVER REAL DRAFTS LIVE.
//
// ── What this file is for (2026-09-12, adversarial review findings 1 and 9) ─
// The 3,217-constant rulebook reaches the health score through exactly one
// term: `densityPenalty(bySeverity, wordCount)`. On `main` that term is a
// logistic with steepness 50 about a midpoint of 0.52 — a switch, not a curve.
// The review measured its consequence directly: ten of the 32 committed
// scripts sat in a band where the marginal effect of one more weighted issue
// was `0.000000`, and on the repository's own 231-scene fixture FORTY-EIGHT
// additional CRITICAL findings moved the displayed health by 0.0. Over a wide,
// commonly-occupied range the entire weighted-rule channel reported a
// CONSTANT.
//
// `tests/core/monotonicity.test.ts` could not catch that: it asserts the score
// is NON-INCREASING in issue count, and a flat function satisfies that exactly.
// This file asserts the strictly stronger property — a STRICT decrease with a
// minimum step — at every density the committed corpus actually exhibits, and
// at feature length.
//
// ── Why it is corpus-free ──────────────────────────────────────────────────
// The gradient is a property of the formula, not of any corpus. It is checked
// here against `computeRawCraftScore` directly, at the (issues, scenes, words)
// triples the 32 committed scripts and the committed feature-length fixture
// produce, so it needs no private text to establish. Re-measuring AUC after a
// change to the curve is what needs the corpus; this is not that.
//
// ── What this file does NOT do ─────────────────────────────────────────────
// It does not choose the curve's scale. How steep the density term should be
// is a question about how much a finding is worth relative to a scene, and
// that is the owner's corpus to answer. This asserts only that the answer is
// not zero.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

import { computeRawCraftScore, runScriptDoctor } from '../../server/nvm/analyze/doctor.ts';
import { analyzeFountainText } from '../../server/nvm/analyze/fountain-analyzer.ts';

const REPO_ROOT = path.resolve(import.meta.dirname, '../..');

/** The smallest strict step this suite will accept from one more MINOR issue,
 *  on the RAW (pre-rounding, pre-clamp) craft score.
 *
 *  It is deliberately far below anything the display shows. The claim being
 *  guarded is "the channel is not a constant here", not "the channel is worth
 *  a visible amount here" — the second is a calibration question and needs the
 *  owner's corpus. 1e-4 is three orders of magnitude above IEEE noise at these
 *  magnitudes and three orders of magnitude below the smallest gradient
 *  measured on this tree (0.0277 on the 32 scripts, 0.00477 at feature length),
 *  so it fails loudly on a re-flattened curve and never on rounding. */
const MIN_STRICT_STEP = 1e-4;

function corpusFiles(): string[] {
  const screenplays = readdirSync(path.join(REPO_ROOT, 'data/screenplays'))
    .filter((f) => f.endsWith('.fountain'))
    .map((f) => `data/screenplays/${f}`);
  const blind = readdirSync(path.join(REPO_ROOT, 'tests/fixtures/blind-pairs'))
    .filter((f) => f.endsWith('.fountain'))
    .map((f) => `tests/fixtures/blind-pairs/${f}`);
  return [...screenplays, ...blind].sort();
}

const FEATURE_FIXTURE = 'tests/fixtures/feature-length/assembled-feature.fountain';

/** density, exactly as densityPenalty computes it. Duplicated here ON PURPOSE:
 *  the whole point is to check the shipped function against an independently
 *  written statement of where the corpus sits, and importing the private
 *  helper would make the two move together. The weights are asserted against
 *  the source below so the copy cannot drift silently. */
function densityOf(bySeverity: { critical: number; major: number; minor: number }, wordCount: number): number {
  const weighted = 4 * bySeverity.critical + 1.5 * bySeverity.major + 0.5 * bySeverity.minor;
  return weighted / Math.pow(Math.max(wordCount, 1), 0.7);
}

describe('the density channel has a gradient at every density the corpus exhibits (finding 1)', () => {
  it('the weights this file assumes are the weights doctor.ts uses', () => {
    const src = readFileSync(path.join(REPO_ROOT, 'server/nvm/analyze/doctor.ts'), 'utf8');
    assert.match(
      src,
      /const weightedIssues = 4 \* bySeverity\.critical \+ 1\.5 \* bySeverity\.major \+ 0\.5 \* bySeverity\.minor;/,
      'densityPenalty\'s issue weights changed — densityOf() in this file is a deliberate second copy and '
      + 'must be updated with them, or every density reported below is wrong',
    );
    assert.match(src, /const WORD_COUNT_EXPONENT = 0\.7;/);
  });

  it('one more MINOR issue strictly lowers the raw craft score on all 32 committed scripts', async () => {
    const flat: string[] = [];
    const measured: Array<{ file: string; density: number; step: number }> = [];
    for (const f of corpusFiles()) {
      const r = await runScriptDoctor(readFileSync(path.join(REPO_ROOT, f), 'utf8'));
      const bs = r.bySeverity;
      const before = computeRawCraftScore(bs, r.sceneCount, r.wordCount);
      const after = computeRawCraftScore({ ...bs, minor: bs.minor + 1 }, r.sceneCount, r.wordCount);
      const step = before - after;
      measured.push({ file: f, density: densityOf(bs, r.wordCount), step });
      if (!(step >= MIN_STRICT_STEP)) flat.push(`${f} density ${densityOf(bs, r.wordCount).toFixed(4)} step ${step.toExponential(3)}`);
    }
    assert.deepEqual(
      flat, [],
      `${flat.length} of ${measured.length} scripts sit where one more weighted issue moves the score by less `
      + `than ${MIN_STRICT_STEP}. That is the 3,217-rule channel reporting a constant. On main, ten of these `
      + 'scripts were in that state; the sub-1 steepness moved 50 -> 2 to get out of it, and this assertion is '
      + 'what stops it coming back.',
    );
    // Printed on pass as well as on failure: a bare "it did not flatten" hides
    // how much headroom the property has.
    const steps = measured.map((m) => m.step).sort((a, b) => a - b);
    const densities = measured.map((m) => m.density).sort((a, b) => a - b);
    console.log(
      `    corpus density range [${densities[0].toFixed(4)}, ${densities[densities.length - 1].toFixed(4)}]; `
      + `gradient per +1 minor [${steps[0].toFixed(6)}, ${steps[steps.length - 1].toFixed(6)}]`,
    );
  });

  it('the gradient is strict across a dense sweep of the whole occupied range', () => {
    // The 32 scripts are 32 points. This sweeps the interval they occupy, plus
    // the sub-1 band `main`'s logistic flattened, at 1 000 points — so a curve
    // that is live at every committed script and flat between two of them
    // still fails.
    const WORDS = 1000;
    const SCENES = 10;
    const flat: string[] = [];
    for (let i = 0; i <= 1000; i++) {
      const density = 0.05 + (i / 1000) * (3.0 - 0.05);
      // minor issues carrying exactly this density at WORDS words
      const minor = (density * Math.pow(WORDS, 0.7)) / 0.5;
      const before = computeRawCraftScore({ critical: 0, major: 0, minor }, SCENES, WORDS);
      const after = computeRawCraftScore({ critical: 0, major: 0, minor: minor + 1 }, SCENES, WORDS);
      if (!(before - after >= MIN_STRICT_STEP)) flat.push(`density ${density.toFixed(4)} step ${(before - after).toExponential(3)}`);
    }
    assert.deepEqual(
      flat.slice(0, 8), [],
      `${flat.length} of 1001 sampled densities in [0.05, 3.00] are flat. main's logistic (steepness 50 about `
      + 'midpoint 0.52) was flat to six decimals above density 0.65 — the whole 10-point range lived in '
      + '[0.40, 0.65] and everything above it was a constant.',
    );
  });
});

describe('the gradient survives feature length (finding 1, the 231-scene case)', () => {
  it('adding findings to a 231-scene feature moves the score, and more findings move it more', async () => {
    const text = readFileSync(path.join(REPO_ROOT, FEATURE_FIXTURE), 'utf8');
    const analysis = analyzeFountainText(text);
    const report = await runScriptDoctor(text);
    const bs = report.bySeverity;
    const base = computeRawCraftScore(bs, report.sceneCount, report.wordCount);

    assert.ok(report.sceneCount > 200, `the feature fixture should be feature-scale, got ${report.sceneCount} scenes`);
    assert.ok(analysis.wordCount > 10000, `expected a feature-length word count, got ${analysis.wordCount}`);

    const step = (add: { critical?: number; major?: number; minor?: number }): number =>
      base - computeRawCraftScore(
        {
          critical: bs.critical + (add.critical ?? 0),
          major: bs.major + (add.major ?? 0),
          minor: bs.minor + (add.minor ?? 0),
        },
        report.sceneCount,
        report.wordCount,
      );

    const oneMinor = step({ minor: 1 });
    assert.ok(
      oneMinor >= MIN_STRICT_STEP,
      `one more MINOR finding on a ${report.sceneCount}-scene feature moves the raw score by `
      + `${oneMinor.toExponential(3)}. On main this was 0.000000 — forty-eight additional CRITICAL findings `
      + 'did not move the displayed health by 0.1, which is the entire weighted-rule channel reporting a '
      + 'constant on a feature-length draft.',
    );

    // MONOTONE IN SEVERITY AND IN COUNT, not merely non-zero. The specific
    // number the review reported as immovable was +48 CRITICAL.
    const c48 = step({ critical: 48 });
    assert.ok(c48 > oneMinor, `+48 CRITICAL (${c48.toFixed(5)}) must move the score more than +1 minor (${oneMinor.toFixed(5)})`);
    assert.ok(
      c48 >= 1.0,
      `+48 CRITICAL findings move a ${report.sceneCount}-scene feature's raw score by only ${c48.toFixed(5)} points. `
      + 'The review measured exactly 0.0 for this on main.',
    );
    assert.ok(step({ minor: 386 }) > step({ minor: 100 }), 'more findings must cost more than fewer');

    console.log(
      `    ${report.sceneCount} scenes, ${report.wordCount} words, `
      + `c/m/n ${bs.critical}/${bs.major}/${bs.minor}, density ${densityOf(bs, report.wordCount).toFixed(4)}: `
      + `+1 minor ${oneMinor.toFixed(6)}, +48 critical ${c48.toFixed(5)}`,
    );
  });

  it('the DISPLAY rounding, not the formula, is what hides a single finding at feature length', async () => {
    // Honesty about what the property does and does not buy. At ~19k words one
    // minor finding is worth well under the 0.1 the displayed health is rounded
    // to, so a writer who fixes one note still sees the same number. That is a
    // resolution limit of the display, and it is a different complaint from
    // "the channel is a constant" — this asserts which of the two is true here,
    // so nobody reads the gradient assertion above as a promise the UI moves.
    const text = readFileSync(path.join(REPO_ROOT, FEATURE_FIXTURE), 'utf8');
    const report = await runScriptDoctor(text);
    const bs = report.bySeverity;
    const base = computeRawCraftScore(bs, report.sceneCount, report.wordCount);
    const one = base - computeRawCraftScore({ ...bs, minor: bs.minor + 1 }, report.sceneCount, report.wordCount);
    assert.ok(one < 0.05, 'this test documents a SUB-display-resolution gradient; if one finding is now worth '
      + 'more than half a display step at feature length, the formula changed and this note needs rewriting');
    const needed = Math.ceil(0.05 / one);
    assert.ok(needed > 1 && Number.isFinite(needed));
    console.log(`    at feature length it takes ~${needed} minor findings to move the DISPLAYED health by one step`);
  });
});
