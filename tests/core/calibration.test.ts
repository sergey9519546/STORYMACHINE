// Script Doctor — tests for the calibration layer: percentile math
// (calibration/percentile.ts), the reference distribution
// (calibration/reference.ts), and computeRawCraftScore's saturation-safe
// ranking statistic (doctor.ts), plus end-to-end percentile population
// through the real runScriptDoctor pipeline. See doctor.ts's aggregateReport
// calibration-layer comment and calibration/reference.ts's header for the
// full design (why RAW/unclamped, why lazy-build, why the recursion can't
// happen).
//
// Fixtures deliberately stay minimal: band-ordering + distribution tests
// below already run the 14-pass pipeline via corpus samples that
// getReferenceDistribution() loads once at module scope, plus one small
// original fixture for the plain-call/termination case — never a second
// large hand-authored screenplay.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { percentileRank, percentileDescriptor } from '../../server/nvm/analyze/calibration/percentile.ts';
import { getReferenceDistribution } from '../../server/nvm/analyze/calibration/reference.ts';
import { REFERENCE_CORPUS } from '../../server/nvm/analyze/calibration/corpus.ts';
import type { CorpusBand, CorpusSample } from '../../server/nvm/analyze/calibration/corpus.ts';
import { runScriptDoctor, computeRawCraftScore, computeHealthScore } from '../../server/nvm/analyze/doctor.ts';
import type { DimensionKey } from '../../server/nvm/analyze/types.ts';

const DIMENSION_KEYS: DimensionKey[] = [
  'structure-pacing', 'character', 'dialogue-voice', 'plot-logic', 'theme-originality',
];

/** Small original 4-scene fixture — deliberately minimal (unlike
 *  script-doctor.test.ts's richer buildMultiSceneFountain): this file's job
 *  is exercising the calibration layer, not re-proving pass diagnostics, so
 *  the one fixture that isn't an already-loaded corpus sample stays cheap. */
function buildSmallFountain(): string {
  return [
    'INT. OFFICE - DAY',
    '',
    'Jules reviews a stack of overdue invoices.',
    '',
    'JULES',
    'Nothing about this adds up.',
    '',
    'INT. OFFICE - NIGHT',
    '',
    "Priya finds a discrepancy buried in last quarter's ledger.",
    '',
    'PRIYA',
    'This changes everything.',
    '',
    'EXT. PARKING LOT - NIGHT',
    '',
    'Jules and Priya compare notes under a flickering streetlight.',
    '',
    'JULES',
    'We should have caught this months ago.',
    '',
    'INT. OFFICE - MORNING',
    '',
    'The two file their findings before the review board convenes.',
    '',
    'PRIYA',
    "Let's see what they make of it.",
  ].join('\n');
}

describe('percentileRank', () => {
  const dist = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];

  it('is monotonic: a higher value never ranks lower than a lower one', () => {
    const values = [-50, 0, 10, 25, 55, 75, 100, 150];
    let prevRank = -1;
    for (const v of values) {
      const rank = percentileRank(v, dist);
      assert.ok(rank >= prevRank, `rank regressed at value ${v}: ${rank} < ${prevRank}`);
      prevRank = rank;
    }
  });

  it('lands below 50 at the distribution minimum and above 50 at the maximum', () => {
    assert.ok(percentileRank(10, dist) < 50, 'value at the exact minimum should rank low, not neutral');
    assert.ok(percentileRank(100, dist) > 50, 'value at the exact maximum should rank high, not neutral');
  });

  it('clamps to 0 below the minimum and 100 above the maximum', () => {
    assert.equal(percentileRank(-1000, dist), 0);
    assert.equal(percentileRank(1000, dist), 100);
  });

  it('returns 50 for an empty distribution (neutral, no opinion)', () => {
    assert.equal(percentileRank(42, []), 50);
  });

  it('is sane for a single-element distribution: below/equal/above land at 0/50/100', () => {
    assert.equal(percentileRank(5, [10]), 0);
    assert.equal(percentileRank(10, [10]), 50);
    assert.equal(percentileRank(15, [10]), 100);
  });
});

describe('percentileDescriptor', () => {
  const subject = 'Dialogue & Voice';
  const bands = [0, 5, 15, 30, 50, 70, 85, 95, 100];

  it('returns a non-empty string across low, mid, and high bands', () => {
    for (const pct of bands) {
      assert.ok(percentileDescriptor(pct, subject).length > 0, `empty descriptor at pct=${pct}`);
    }
  });

  it('every variant mentions "the reference set"', () => {
    for (const pct of bands) {
      assert.ok(
        percentileDescriptor(pct, subject).includes('the reference set'),
        `descriptor at pct=${pct} doesn't name "the reference set"`,
      );
    }
  });

  it('never leaks an ALL_CAPS rule-style token', () => {
    for (const pct of bands) {
      const desc = percentileDescriptor(pct, subject);
      // A rule constant looks like PAYOFF_TOO_QUICK: 3+ uppercase letters
      // (optionally underscore-joined). None of that vocabulary belongs in a
      // writer-facing sentence — only the caller-supplied `subject` and plain
      // lowercase prose should appear.
      assert.ok(!/\b[A-Z][A-Z_]{2,}\b/.test(desc), `descriptor leaked an ALL_CAPS token: "${desc}"`);
    }
  });
});

describe('getReferenceDistribution', () => {
  const dist = getReferenceDistribution();

  it('has 20 health scores and 20 scores per dimension, matching corpus.ts size', () => {
    assert.equal(dist.health.length, 20, 'health distribution must match REFERENCE_CORPUS size');
    assert.equal(REFERENCE_CORPUS.length, 20, 'sanity: corpus itself must be 20 samples');
    for (const key of DIMENSION_KEYS) {
      assert.equal(dist.dimensions[key].length, 20, `dimension ${key} distribution must match REFERENCE_CORPUS size`);
    }
  });

  it('is sorted ascending for health and every dimension', () => {
    const isSorted = (arr: number[]) => arr.every((v, i) => i === 0 || arr[i - 1] <= v);
    assert.ok(isSorted(dist.health), 'health distribution must be sorted ascending');
    for (const key of DIMENSION_KEYS) {
      assert.ok(isSorted(dist.dimensions[key]), `dimension ${key} distribution must be sorted ascending`);
    }
  });

  it('has non-degenerate spread (max > min) for health and at least 3 of 5 dimensions', () => {
    assert.ok(
      dist.health[dist.health.length - 1] > dist.health[0],
      'health distribution must not collapse to a single repeated value across 4 quality bands',
    );
    const dimensionsWithSpread = DIMENSION_KEYS.filter(key => {
      const arr = dist.dimensions[key];
      return arr[arr.length - 1] > arr[0];
    });
    assert.ok(
      dimensionsWithSpread.length >= 3,
      `expected at least 3 of 5 dimensions to show spread, got ${dimensionsWithSpread.length} ` +
      `(${dimensionsWithSpread.join(', ')})`,
    );
  });

  // MIN_CORPUS_SIZE (reference.ts) isn't directly testable from here: it's an
  // unexported module-level const gating a build path that already ran (and
  // memoized) at module load, before this test file's imports finish
  // resolving — exercising the <8 branch would require re-importing
  // reference.ts with a mocked corpus.ts under a fresh module registry, which
  // is disproportionate to what one boolean gate is worth. This asserts the
  // gate's *effect* indirectly instead: corpus.ts currently ships 20 samples
  // (>= the gate's floor of 8), so getReferenceDistribution() must have taken
  // the "build a real distribution" branch rather than emptyDistribution()'s
  // early return — proven by a non-empty, correctly-sized distribution here,
  // exactly the observable difference the gate exists to produce.
  it('(indirect) MIN_CORPUS_SIZE gate: a 20-sample corpus clears the floor and yields a real, non-empty distribution', () => {
    assert.ok(REFERENCE_CORPUS.length >= 8, 'corpus must clear MIN_CORPUS_SIZE for this assertion to be meaningful');
    assert.ok(dist.health.length > 0, 'gate must have taken the real-build branch, not emptyDistribution()');
    for (const key of DIMENSION_KEYS) {
      assert.ok(dist.dimensions[key].length > 0, `dimension ${key} must be non-empty on the real-build branch`);
    }
  });
});

describe('computeRawCraftScore vs computeHealthScore', () => {
  // Post-fix signature: both functions now also take wordCount, since
  // craftPenalty (doctor.ts) blends a word-density term with a scene-based
  // scarcity term instead of normalizing by scene count alone.
  it('equals computeHealthScore (up to 0.1 rounding) when unsaturated', () => {
    const bySeverity = { critical: 1, major: 1, minor: 1 };
    const sceneCount = 10;
    const wordCount = 300;
    const raw = computeRawCraftScore(bySeverity, sceneCount, wordCount);
    const health = computeHealthScore(bySeverity, sceneCount, wordCount);
    assert.equal(Math.round(raw * 10) / 10, health);
    assert.ok(raw > 0 && raw < 100, 'sanity: this fixture should be comfortably unsaturated');
  });

  it('goes negative (not 0) once the penalty exceeds 100', () => {
    // A small wordCount (dense issue rate relative to the script's own size)
    // is what drives the density term high enough to saturate now — see
    // doctor.ts's craftPenalty comment for why density is word-based.
    const bySeverity = { critical: 20, major: 0, minor: 0 };
    const sceneCount = 5;
    const wordCount = 50;
    const raw = computeRawCraftScore(bySeverity, sceneCount, wordCount);
    const health = computeHealthScore(bySeverity, sceneCount, wordCount);
    assert.ok(raw < 0, `expected a negative raw score, got ${raw}`);
    assert.equal(health, 0, 'the displayed score should still clamp to 0');
  });

  it('strictly orders two saturated severity mixes that computeHealthScore ties at 0', () => {
    const sceneCount = 10;
    const wordCount = 50;
    const lighter = { critical: 20, major: 0, minor: 0 };
    const heavier = { critical: 60, major: 0, minor: 0 };

    assert.equal(computeHealthScore(lighter, sceneCount, wordCount), 0);
    assert.equal(computeHealthScore(heavier, sceneCount, wordCount), 0, 'both mixes must tie at the clamped floor');

    const rawLighter = computeRawCraftScore(lighter, sceneCount, wordCount);
    const rawHeavier = computeRawCraftScore(heavier, sceneCount, wordCount);
    assert.ok(
      rawLighter > rawHeavier,
      `raw score must keep the lighter mix ranked above the heavier one: ${rawLighter} vs ${rawHeavier}`,
    );
  });
});

// ── Band ordering — controlled-richness corpus design ────────────────────
// corpus.ts's header explains the fix: every one of the 20 samples is now
// built from the same 10-scene skeleton with a matched ~300-360 word budget,
// so richness (scene count, word count, which structural signals are
// present) is held constant across bands and craft is the only independent
// variable. That design is what lets the assertions below hold as STRICT
// guarantees rather than the old file's "known limitation" (competent
// ranking lowest of all four bands, one strong sample ranking below every
// troubled sample) — see reference.ts's header for the before/after.

/** Recompute the same RAW (unclamped) craft-score statistic reference.ts's
 *  scoreSample uses, but from runScriptDoctor's own public report shape
 *  (DoctorPassSummary[] + sceneCount + wordCount) rather than reference.ts's
 *  private scoring path — this exercises the real end-to-end pipeline
 *  (analyzeFountainText -> runRevisionPipeline -> aggregateReport) the way an
 *  actual Script Doctor request does, instead of re-deriving reference.ts's
 *  internal build. computeRawCraftScore itself is doctor.ts's published,
 *  parameter-only formula — reusing it here (rather than reading
 *  report.health, which is CLAMPED) is exactly the saturation-safe ranking
 *  statistic this whole calibration layer is built on; see doctor.ts's
 *  aggregateReport calibration-layer comment for why the raw statistic is
 *  the one that must be used for any cross-sample ranking. wordCount is
 *  passed alongside sceneCount because the opportunity-based craftPenalty
 *  (the saturation fix) blends a word-density term with a scene-scarcity
 *  term — see craftPenalty's own comment in doctor.ts.
 */
async function rawCraftScoreFor(sample: CorpusSample): Promise<number> {
  const report = await runScriptDoctor(sample.fountain);
  const bySeverity = report.passes.reduce(
    (acc, p) => ({
      critical: acc.critical + p.critical,
      major: acc.major + p.major,
      minor: acc.minor + p.minor,
    }),
    { critical: 0, major: 0, minor: 0 },
  );
  return computeRawCraftScore(bySeverity, report.sceneCount, report.wordCount);
}

async function bandAverageRawScore(band: CorpusBand): Promise<number> {
  const samples = REFERENCE_CORPUS.filter(s => s.band === band);
  assert.ok(samples.length > 0, `corpus must contain at least one '${band}' sample`);
  const scores = await Promise.all(samples.map(rawCraftScoreFor));
  return scores.reduce((sum, v) => sum + v, 0) / scores.length;
}

describe('band ordering through the real runScriptDoctor pipeline', () => {
  it('full band-average monotonicity: strong > competent > weak > troubled, strictly', async () => {
    const [strongAvg, competentAvg, weakAvg, troubledAvg] = await Promise.all([
      bandAverageRawScore('strong'),
      bandAverageRawScore('competent'),
      bandAverageRawScore('weak'),
      bandAverageRawScore('troubled'),
    ]);

    assert.ok(
      strongAvg > competentAvg,
      `strong band average (${strongAvg.toFixed(1)}) must exceed competent (${competentAvg.toFixed(1)})`,
    );
    assert.ok(
      competentAvg > weakAvg,
      `competent band average (${competentAvg.toFixed(1)}) must exceed weak (${weakAvg.toFixed(1)})`,
    );
    assert.ok(
      weakAvg > troubledAvg,
      `weak band average (${weakAvg.toFixed(1)}) must exceed troubled (${troubledAvg.toFixed(1)})`,
    );
  });

  it("no strong sample's raw score falls below the troubled-band average", async () => {
    const strongSamples = REFERENCE_CORPUS.filter(s => s.band === 'strong');
    const troubledSamples = REFERENCE_CORPUS.filter(s => s.band === 'troubled');
    const [strongScores, troubledScores] = await Promise.all([
      Promise.all(strongSamples.map(rawCraftScoreFor)),
      Promise.all(troubledSamples.map(rawCraftScoreFor)),
    ]);
    const troubledAvg = troubledScores.reduce((sum, v) => sum + v, 0) / troubledScores.length;

    strongScores.forEach((score, i) => {
      assert.ok(
        score > troubledAvg,
        `${strongSamples[i].label} (${score.toFixed(1)}) fell below the troubled-band average (${troubledAvg.toFixed(1)})`,
      );
    });
  });

  it('a strong corpus sample outranks a troubled one on healthPercentile (pinned to the most robust pair)', async () => {
    // Pinned by label, not by array order or .find()'s first match: "The
    // Long Game" is the highest-scoring strong sample and "The Grift" the
    // lowest-scoring troubled sample in this corpus (see the measurement in
    // corpus.ts's design rationale), so this pair carries the largest
    // available raw-score gap of any strong/troubled pair — a deliberately
    // non-marginal pin, immune to small future corpus edits nudging any one
    // sample by a few points.
    const strongSample = REFERENCE_CORPUS.find(s => s.label === 'The Long Game');
    const troubledSample = REFERENCE_CORPUS.find(s => s.label === 'The Grift');
    assert.ok(strongSample, 'pinned strong sample "The Long Game" must exist in the corpus');
    assert.ok(troubledSample, 'pinned troubled sample "The Grift" must exist in the corpus');

    const [strongReport, troubledReport] = await Promise.all([
      runScriptDoctor(strongSample!.fountain),
      runScriptDoctor(troubledSample!.fountain),
    ]);

    assert.equal(typeof strongReport.healthPercentile, 'number', 'strong report must carry a healthPercentile');
    assert.equal(typeof troubledReport.healthPercentile, 'number', 'troubled report must carry a healthPercentile');

    for (const pct of [strongReport.healthPercentile!, troubledReport.healthPercentile!]) {
      assert.ok(pct >= 0 && pct <= 100, `healthPercentile out of range: ${pct}`);
    }
    assert.ok(
      strongReport.healthPercentile! > troubledReport.healthPercentile!,
      `expected strong (${strongReport.healthPercentile}) > troubled (${troubledReport.healthPercentile})`,
    );

    for (const report of [strongReport, troubledReport]) {
      assert.ok(report.dimensions, 'dimensions must be populated');
      for (const dim of report.dimensions!) {
        assert.ok(
          typeof dim.percentileDescriptor === 'string' && dim.percentileDescriptor.length > 0,
          `dimension ${dim.key} missing percentileDescriptor`,
        );
      }
    }
  });
});

// ── Saturation fix regression coverage ────────────────────────────────────
// doctor.ts's craftPenalty replaced a scene-count-only normalization with an
// opportunity-based one (a word-density term + a scene-scarcity term) so
// that every realistic multi-scene script no longer clamps to displayed
// health 0. These two tests encode that fix as real, running-pipeline
// regressions rather than leaving it as tuning-script observation only:
//   1. no corpus sample — including the worst 'troubled' one — saturates to
//      displayed health 0 anymore;
//   2. the SAME craft quality at 2x/3x length (built by concatenating
//      renamed copies of a real corpus sample's own scenes, so its planted
//      clue/payoff pair still resolves per-copy) keeps displayed health
//      within ~10 points of the 1x original — the direct regression test
//      for the defect ("length-biased to the point of uselessness").
describe('no-saturation & length-invariance (opportunity-based craftPenalty fix)', () => {
  it('no reference-corpus sample saturates to displayed health 0, including the worst troubled sample', async () => {
    const reports = await Promise.all(REFERENCE_CORPUS.map(s => runScriptDoctor(s.fountain)));
    reports.forEach((report, i) => {
      assert.ok(
        report.health > 0,
        `${REFERENCE_CORPUS[i].label} (${REFERENCE_CORPUS[i].band}) saturated to displayed health ${report.health}`,
      );
    });
  });

  it('displayed health stays within ~10 points at 2x/3x length for matched craft quality', async () => {
    // Build 2x/3x variants of the 'competent'-band 'Zero Day' corpus sample
    // by concatenating renamed copies of its own 10-scene pattern — same
    // craft quality, same clue/payoff shape, just longer. This is the direct
    // regression test for the saturation defect: before this fix, a longer
    // script of matched quality scored MUCH worse (more accumulated issues,
    // same scene-count-only divisor); after the fix, word-based density
    // normalization (doctor.ts's craftPenalty) should keep it close to flat.
    const zeroDay = REFERENCE_CORPUS.find(s => s.label === 'Zero Day');
    assert.ok(zeroDay, "pinned sample 'Zero Day' must exist in the corpus");

    // Rename the two speaking characters AND the recurring prop vocabulary
    // per extra copy so each copy's own planted clue ("Payload triggers at
    // market open") and its payoff still resolve as a distinct,
    // self-contained clue/payoff pair rather than three copies of literally
    // the same objects — see corpus.ts's header for why the reference corpus
    // itself is controlled this way. The prop renames exist because BOTH
    // clue channels in fountain-analyzer.ts (exact-token quoted phrases and
    // the content-word cluster channel) legitimately treat a verbatim-
    // repeated prop sentence in a later scene as a recurrence — which is
    // correct detector behavior on real scripts, but on this fixture's
    // concatenation methodology it would manufacture cross-copy seed/payoff
    // pairs that a genuinely longer script of matched craft would not have.
    // Each copy keeps its own internal recurrences (logs/feeds/traces recur
    // within their copy exactly like the original), so per-copy craft signal
    // is preserved; only cross-copy lexical identity is removed.
    function renamedCopy(
      fountain: string,
      nadia: string,
      manager: string,
      tag: string,
      props: Record<string, string>,
    ): string {
      let out = fountain
        .replace(/\bNADIA\b/g, nadia.toUpperCase())
        .replace(/\bNadia\b/g, nadia)
        .replace(/\bMANAGER\b/g, manager.toUpperCase())
        .replace(/\bManager\b/g, manager)
        .replace(/- (NIGHT|DAY|CONTINUOUS|MORNING)$/gm, m => `${m} (${tag})`);
      for (const [from, to] of Object.entries(props)) {
        out = out
          .replace(new RegExp(`\\b${from}\\b`, 'g'), to)
          .replace(
            new RegExp(`\\b${from[0].toUpperCase()}${from.slice(1)}\\b`, 'g'),
            `${to[0].toUpperCase()}${to.slice(1)}`,
          );
      }
      return out;
    }

    const copy1 = zeroDay!.fountain;
    const copy2 = renamedCopy(zeroDay!.fountain, 'Priya', 'Rios', 'II', {
      payload: 'package', logs: 'feeds', wall: 'bank', noise: 'chatter',
      script: 'macro', market: 'exchange', dashboard: 'console',
    });
    const copy3 = renamedCopy(zeroDay!.fountain, 'Elena', 'Cho', 'III', {
      payload: 'charge', logs: 'traces', wall: 'grid', noise: 'static',
      script: 'routine', market: 'auction', dashboard: 'monitor',
    });

    const [report1x, report2x, report3x] = await Promise.all([
      runScriptDoctor(copy1),
      runScriptDoctor([copy1, copy2].join('\n\n')),
      runScriptDoctor([copy1, copy2, copy3].join('\n\n')),
    ]);

    // Sanity: the variants really are 2x/3x longer, not accidentally
    // deduped or truncated — otherwise "health stayed flat" would be
    // trivially true for the wrong reason.
    assert.equal(report2x.sceneCount, report1x.sceneCount * 2);
    assert.equal(report3x.sceneCount, report1x.sceneCount * 3);
    assert.ok(report2x.wordCount > report1x.wordCount * 1.8);
    assert.ok(report3x.wordCount > report1x.wordCount * 2.7);

    const drift2x = Math.abs(report2x.health - report1x.health);
    const drift3x = Math.abs(report3x.health - report1x.health);
    assert.ok(
      drift2x <= 10,
      `2x length drifted ${drift2x.toFixed(1)} points (1x=${report1x.health}, 2x=${report2x.health}) — expected <= 10`,
    );
    assert.ok(
      drift3x <= 10,
      `3x length drifted ${drift3x.toFixed(1)} points (1x=${report1x.health}, 3x=${report3x.health}) — expected <= 10`,
    );
  });
});

describe('termination / no-recursion', () => {
  it('a plain runScriptDoctor call on a small fixture resolves with healthPercentile defined', async () => {
    // Success here implicitly proves calibration/reference.ts's module-load
    // top-level-await distribution build already settled without deadlocking
    // against this same call path — see reference.ts's header comment on
    // breaking the recursion cycle (this module's own getReferenceDistribution()
    // call above already exercised the synchronous accessor; this proves the
    // full runScriptDoctor path resolves too, not just the accessor).
    const report = await runScriptDoctor(buildSmallFountain());
    assert.equal(typeof report.healthPercentile, 'number');
    assert.ok(report.healthPercentile! >= 0 && report.healthPercentile! <= 100);
  });
});
