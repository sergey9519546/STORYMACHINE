// Mechanics tests for the P1 rebuild-experiment harness
// (scripts/rebuild-experiment.mjs + scripts/lib/rebuild-experiment-lib.mjs).
//
// WHAT THIS FILE IS FOR: the harness produces AUC numbers that a rebuild
// decision may be argued from. A harness whose degradations drift between runs,
// whose AUC arithmetic is subtly wrong, or whose partition guard can be talked
// into touching the hash-locked test set would produce confident, wrong
// evidence. These tests pin the mechanics — NOT the measured results, which
// are corpus-dependent by design and belong in
// docs/p1-benchmark/REBUILD_EXPERIMENT_2026-08-04.md.
//
// WHAT IT DELIBERATELY DOES NOT TEST: any AUC value on any corpus. The in-repo
// corpus is 18-38 short scripts; asserting a number measured on it would turn a
// directional research reading into a locked expectation, which is exactly the
// mistake the harness's own caveat block exists to prevent.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  mulberry32, pairwiseAuc, bootstrapCi, BOOTSTRAP_DEFAULT,
  segmentScenes, reassemble, degradeShuffle, degradeMidpointDrop,
  degradeClimaxRelocate, degradeDialogueFlatten, DEGRADATIONS, SIGNALS,
  buildConfigs, configHealth, ruleChannelZeroAdjustment,
  parseArgs, PARTITIONS, CAVEAT_BLOCK, USAGE,
} from '../../scripts/lib/rebuild-experiment-lib.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '../..');

/** A 6-scene fountain fixture: enough scenes for every degradation's floor
 *  (shuffle >= 3, midpoint-drop >= 5, relocate >= 3), with a preamble line so
 *  preamble handling is exercised too. */
const FIXTURE = [
  'Title: Fixture',
  '',
  'INT. ONE - DAY',
  '',
  'Ana waits.',
  '',
  'ANA',
  'Scene one line.',
  '',
  'INT. TWO - DAY',
  '',
  'Ben arrives.',
  '',
  'BEN',
  'Scene two line.',
  '',
  'INT. THREE - DAY',
  '',
  'They argue.',
  '',
  'INT. FOUR - DAY',
  '',
  'They drive.',
  '',
  'INT. FIVE - DAY',
  '',
  'They stop.',
  '',
  'INT. SIX - DAY',
  '',
  'They part.',
  '',
].join('\n');

const headingsOf = (text: string) => segmentScenes(text).scenes.map((s: { heading: string }) => s.heading.trim());

describe('rebuild-experiment — scene segmentation', () => {
  it('splits on INT./EXT. headings and keeps the pre-heading preamble separate', () => {
    const { preamble, scenes } = segmentScenes(FIXTURE);
    assert.equal(scenes.length, 6);
    assert.ok(preamble.join('\n').includes('Title: Fixture'));
    assert.equal(scenes[0].heading.trim(), 'INT. ONE - DAY');
  });

  it('treats a leading-dot line as a forced scene heading (Fountain power-user syntax)', () => {
    const { scenes } = segmentScenes('.A FORCED HEADING\n\nAction.\n\nINT. REAL - DAY\n\nMore.');
    assert.equal(scenes.length, 2);
    assert.equal(scenes[0].heading, '.A FORCED HEADING');
  });

  it('reassemble(preamble, scenes) round-trips segmentScenes', () => {
    const { preamble, scenes } = segmentScenes(FIXTURE);
    assert.equal(reassemble(preamble, scenes), FIXTURE);
  });
});

describe('rebuild-experiment — degradations are deterministic under seed', () => {
  it('SCENE_SHUFFLE is byte-identical across repeated calls (seed 42, fixed)', () => {
    assert.equal(degradeShuffle(FIXTURE), degradeShuffle(FIXTURE));
  });

  it('SCENE_SHUFFLE preserves the scene multiset but changes the order', () => {
    const shuffled = degradeShuffle(FIXTURE) as string;
    const before = headingsOf(FIXTURE);
    const after = headingsOf(shuffled);
    assert.deepEqual([...after].sort(), [...before].sort());
    assert.notDeepEqual(after, before);
  });

  it('every degradation is a pure function of its input (repeat calls agree)', () => {
    for (const d of DEGRADATIONS) {
      assert.equal(d.fn(FIXTURE), d.fn(FIXTURE), `${d.id} is not deterministic`);
    }
  });

  it('MIDPOINT_DROP removes exactly the 40%-60% scene window', () => {
    const dropped = degradeMidpointDrop(FIXTURE) as string;
    // n=6 -> keep scenes [0, floor(2.4)=2) and [floor(3.6)=3, 6) -> 5 scenes
    assert.deepEqual(headingsOf(dropped), [
      'INT. ONE - DAY', 'INT. TWO - DAY', 'INT. FOUR - DAY', 'INT. FIVE - DAY', 'INT. SIX - DAY',
    ]);
  });

  it('CLIMAX_RELOCATE moves the final scene to index 1 and keeps the count', () => {
    const relocated = degradeClimaxRelocate(FIXTURE) as string;
    assert.deepEqual(headingsOf(relocated), [
      'INT. ONE - DAY', 'INT. SIX - DAY', 'INT. TWO - DAY', 'INT. THREE - DAY', 'INT. FOUR - DAY', 'INT. FIVE - DAY',
    ]);
  });

  it('DIALOGUE_FLATTEN replaces dialogue with "Hello." and leaves action alone', () => {
    const flat = degradeDialogueFlatten(FIXTURE) as string;
    assert.ok(flat.includes('Hello.'), 'no flattened dialogue found');
    assert.ok(!flat.includes('Scene one line.'), 'original dialogue survived flattening');
    assert.ok(flat.includes('Ana waits.'), 'action text was destroyed — only dialogue should flatten');
  });

  it('returns null below each degradation\'s scene floor rather than a bogus variant', () => {
    const twoScenes = 'INT. A - DAY\n\nX.\n\nINT. B - DAY\n\nY.';
    const fourScenes = `${twoScenes}\n\nINT. C - DAY\n\nZ.\n\nINT. D - DAY\n\nW.`;
    assert.equal(degradeShuffle(twoScenes), null);
    assert.equal(degradeClimaxRelocate(twoScenes), null);
    assert.equal(degradeMidpointDrop(fourScenes), null);
  });
});

describe('rebuild-experiment — AUC arithmetic on hand-computable fixtures', () => {
  it('perfectly separated pairs (every real > degraded) score 1.0', () => {
    assert.equal(pairwiseAuc([
      { real: 90, degraded: 10 }, { real: 80, degraded: 79 }, { real: 1, degraded: 0 },
    ]), 1);
  });

  it('perfectly inverted pairs (every degraded > real) score 0.0', () => {
    assert.equal(pairwiseAuc([
      { real: 10, degraded: 90 }, { real: 79, degraded: 80 },
    ]), 0);
  });

  it('perfectly tied pairs score exactly 0.5 (a tie counts half)', () => {
    assert.equal(pairwiseAuc([
      { real: 50, degraded: 50 }, { real: 12.5, degraded: 12.5 },
    ]), 0.5);
  });

  it('a mixed set is (wins + 0.5*ties) / n', () => {
    // 2 wins, 1 tie, 1 loss over 4 pairs -> (2 + 0.5) / 4 = 0.625
    assert.equal(pairwiseAuc([
      { real: 9, degraded: 1 }, { real: 9, degraded: 2 },
      { real: 5, degraded: 5 }, { real: 1, degraded: 9 },
    ]), 0.625);
  });

  it('an empty pair list is NaN, not 0.5 — "not measured" must not read as "chance"', () => {
    assert.ok(Number.isNaN(pairwiseAuc([])));
  });
});

describe('rebuild-experiment — seeded bootstrap', () => {
  const mixed = Array.from({ length: 20 }, (_, i) => ({ real: 50 + i, degraded: 50 + ((i * 7) % 20) }));

  it('is reproducible: the same (pairs, iterations, seed) gives the same CI', () => {
    const a = bootstrapCi(mixed, 500, 7);
    const b = bootstrapCi(mixed, 500, 7);
    assert.deepEqual(a, b);
  });

  it('brackets the point estimate and is ordered lo <= hi', () => {
    const auc = pairwiseAuc(mixed);
    const { lo, hi } = bootstrapCi(mixed, 2000, 42);
    assert.ok(lo <= hi, `CI inverted: [${lo}, ${hi}]`);
    assert.ok(lo <= auc && auc <= hi, `point estimate ${auc} outside CI [${lo}, ${hi}]`);
  });

  it('collapses to [1, 1] on perfectly separated pairs (no resample can disagree)', () => {
    const perfect = Array.from({ length: 10 }, (_, i) => ({ real: 100, degraded: i }));
    assert.deepEqual(bootstrapCi(perfect, 500, 42), { lo: 1, hi: 1 });
  });

  it('is NaN on an empty pair list', () => {
    const { lo, hi } = bootstrapCi([], 500, 42);
    assert.ok(Number.isNaN(lo) && Number.isNaN(hi));
  });

  it('defaults to at least 2000 resamples, as the brief requires', () => {
    assert.ok(BOOTSTRAP_DEFAULT >= 2000);
  });

  it('mulberry32 emits a fixed sequence in [0, 1) for a given seed', () => {
    const a = mulberry32(42); const b = mulberry32(42);
    const seqA = [a(), a(), a()];
    assert.deepEqual(seqA, [b(), b(), b()]);
    for (const v of seqA) assert.ok(v >= 0 && v < 1, `${v} out of range`);
    assert.notDeepEqual(seqA, [mulberry32(43)(), mulberry32(43)(), mulberry32(43)()]);
  });
});

describe('rebuild-experiment — configuration matrix', () => {
  it('is the full factorial: 32 uniquely-named configurations', () => {
    const configs = buildConfigs();
    assert.equal(configs.length, 2 ** SIGNALS.length * 2);
    assert.equal(configs.length, 32);
    assert.equal(new Set(configs.map((c: { id: string }) => c.id)).size, 32);
  });

  it('names the two anchor configurations "baseline" and "RULE_ZERO"', () => {
    const ids = buildConfigs().map((c: { id: string }) => c.id);
    assert.ok(ids.includes('baseline'));
    assert.ok(ids.includes('RULE_ZERO'));
    assert.ok(ids.includes(`RULE_ZERO+${SIGNALS.join('+')}`));
  });

  it('baseline health is the doctor health, untouched', () => {
    const variant = { health: 72.3, deductions: { QL: 1, REV: 2, AGENCY: 3, TRUTH: 4, RULE_ZERO_ADJ: 9 } };
    const baseline = buildConfigs().find((c: { id: string }) => c.id === 'baseline');
    assert.equal(configHealth(baseline, variant), 72.3);
  });

  it('signal configurations subtract exactly the named deductions', () => {
    const variant = { health: 72.3, deductions: { QL: 1, REV: 2, AGENCY: 3, TRUTH: 4, RULE_ZERO_ADJ: 9 } };
    const cfg = buildConfigs().find((c: { id: string }) => c.id === 'REV+TRUTH');
    assert.equal(configHealth(cfg, variant), 72.3 - 2 - 4);
  });

  it('rule-zeroing ADDS the weighted-rule channel back before deductions come off', () => {
    const variant = { health: 72.3, deductions: { QL: 1, REV: 2, AGENCY: 3, TRUTH: 4, RULE_ZERO_ADJ: 9 } };
    const cfg = buildConfigs().find((c: { id: string }) => c.id === 'RULE_ZERO+AGENCY');
    assert.equal(+configHealth(cfg, variant).toFixed(6), +(72.3 + 9 - 3).toFixed(6));
  });

  it('clamps to [0, 100] the same way doctor.ts does', () => {
    const cfgAll = buildConfigs().find((c: { id: string }) => c.id === `${SIGNALS.join('+')}`);
    const low = { health: 2, deductions: { QL: 15, REV: 12, AGENCY: 10, TRUTH: 12, RULE_ZERO_ADJ: 0 } };
    assert.equal(configHealth(cfgAll, low), 0);
    const ruleZero = buildConfigs().find((c: { id: string }) => c.id === 'RULE_ZERO');
    const high = { health: 99, deductions: { QL: 0, REV: 0, AGENCY: 0, TRUTH: 0, RULE_ZERO_ADJ: 40 } };
    assert.equal(configHealth(ruleZero, high), 100);
  });
});

describe('rebuild-experiment — weighted-rule channel zeroing', () => {
  // Issue counts below are in the range the in-repo corpus actually produces
  // (see scripts/output/rebuild-experiment-signals-*.csv: 9-14-scene scripts
  // carry a 10-59 point rule channel). A near-zero issue count at feature word
  // count sits far below densityPenalty's logistic midpoint and correctly costs
  // ~0 — that is the formula working, not the adjustment failing.
  const REALISTIC_WORDS = 900;

  it('is zero when a report carries no issues (nothing to add back)', () => {
    const report = { bySeverity: { critical: 0, major: 0, minor: 0 }, sceneCount: 12, wordCount: REALISTIC_WORDS };
    assert.equal(ruleChannelZeroAdjustment(report), 0);
  });

  it('is positive, and monotone in issue weight, when a report carries issues', () => {
    const base = { sceneCount: 12, wordCount: REALISTIC_WORDS };
    const few = ruleChannelZeroAdjustment({ ...base, bySeverity: { critical: 5, major: 20, minor: 40 } });
    const many = ruleChannelZeroAdjustment({ ...base, bySeverity: { critical: 20, major: 60, minor: 120 } });
    assert.ok(few > 0, `expected a positive add-back, got ${few}`);
    assert.ok(many > few, `add-back should grow with issue weight: ${many} !> ${few}`);
  });

  it('ignores sceneCount-only changes (scarcity is not part of the rule channel)', () => {
    const bySeverity = { critical: 5, major: 20, minor: 40 };
    const a = ruleChannelZeroAdjustment({ bySeverity, sceneCount: 12, wordCount: REALISTIC_WORDS });
    const b = ruleChannelZeroAdjustment({ bySeverity, sceneCount: 120, wordCount: REALISTIC_WORDS });
    assert.ok(a > 0, 'fixture must produce a non-zero channel for this test to mean anything');
    assert.equal(+a.toFixed(6), +b.toFixed(6));
  });
});

describe('rebuild-experiment — CLI parsing', () => {
  /** parseArgs returns a discriminated {ok, opts} | {ok, error}; these two
   *  helpers narrow it so each test asserts on the branch it means. */
  function opts(argv: string[], env: Record<string, string> = {}) {
    const r = parseArgs(argv, env);
    assert.ok(r.ok, `expected parse to succeed: ${r.error}`);
    assert.ok(r.opts);
    return r.opts;
  }
  function errorOf(argv: string[]) {
    const r = parseArgs(argv, {});
    assert.equal(r.ok, false, `expected parse to fail for ${argv.join(' ')}`);
    assert.ok(r.error);
    return r.error;
  }

  it('defaults to the trainval partition, data/screenplays, and the default bootstrap', () => {
    const o = opts([]);
    assert.equal(o.partition, 'trainval');
    assert.equal(o.corpusDir, 'data/screenplays');
    assert.equal(o.bootstrap, BOOTSTRAP_DEFAULT);
    assert.equal(o.withCalibration, false);
  });

  it('REFUSES --partition=test — the held-out set is hash-locked for one final evaluation', () => {
    const err = errorOf(['--partition=test']);
    assert.match(err, /REFUSED/);
    assert.match(err, /hash-locked/);
    assert.ok(!PARTITIONS.includes('test'), 'test must not be an offered partition');
  });

  it('rejects an unknown partition and an unknown flag', () => {
    assert.match(errorOf(['--partition=holdout']), /Invalid --partition/);
    assert.match(errorOf(['--tune-until-it-passes']), /Unknown argument/);
  });

  it('accepts every documented option', () => {
    const o = opts([
      '--partition=val', '--with-calibration', '--bootstrap=5000', '--seed=7',
      '--corpus-dir=/tmp/c', '--out-dir=/tmp/o', '--force',
    ]);
    assert.deepEqual(
      {
        partition: o.partition, withCalibration: o.withCalibration,
        bootstrap: o.bootstrap, seed: o.seed,
        corpusDir: o.corpusDir, outDir: o.outDir, force: o.force,
      },
      {
        partition: 'val', withCalibration: true, bootstrap: 5000, seed: 7,
        corpusDir: '/tmp/c', outDir: '/tmp/o', force: true,
      },
    );
  });

  it('rejects a bootstrap count too small to give a meaningful percentile CI', () => {
    for (const bad of ['--bootstrap=10', '--bootstrap=abc', '--bootstrap=2000.5']) {
      assert.match(errorOf([bad]), /Invalid --bootstrap/);
    }
  });

  it('reads CORPUS_DIR from the environment, and lets --corpus-dir override it', () => {
    assert.equal(opts([], { CORPUS_DIR: '/env/corpus' }).corpusDir, '/env/corpus');
    assert.equal(opts(['--corpus-dir=/flag'], { CORPUS_DIR: '/env/corpus' }).corpusDir, '/flag');
  });
});

describe('rebuild-experiment — the caveat block', () => {
  it('states every claim the numbers must never be read without', () => {
    assert.match(CAVEAT_BLOCK, /DIRECTIONAL, NOT CONCLUSIVE/);
    assert.match(CAVEAT_BLOCK, /NOT COMPARABLE to docs\/p1-benchmark\/DISCRIMINATION_BASELINE_2026-07-29\.md/);
    assert.match(CAVEAT_BLOCK, /AUC-24 >= 0\.622/);
    assert.match(CAVEAT_BLOCK, /THE REAL MEASUREMENT IS THE MAINTAINER COMMAND/);
    assert.match(CAVEAT_BLOCK, /CORPUS_DIR=<local corpus> node scripts\/rebuild-experiment\.mjs --partition=trainval/);
    assert.match(CAVEAT_BLOCK, /HARNESS-LOCAL/);
  });

  it('is embedded in the usage text', () => {
    assert.ok(USAGE.includes(CAVEAT_BLOCK));
  });

  it('is actually printed by the runner: `--help` exits 0 and emits it', () => {
    const run = spawnSync(process.execPath, ['scripts/rebuild-experiment.mjs', '--help'], {
      cwd: REPO_ROOT, encoding: 'utf8',
    });
    assert.equal(run.status, 0, `--help exited ${run.status}: ${run.stderr}`);
    assert.ok(run.stdout.includes(CAVEAT_BLOCK), '--help did not print the caveat block');
  });

  it('the runner refuses --partition=test with a non-zero exit and writes nothing', () => {
    const run = spawnSync(process.execPath, ['scripts/rebuild-experiment.mjs', '--partition=test'], {
      cwd: REPO_ROOT, encoding: 'utf8',
    });
    assert.equal(run.status, 1);
    assert.match(run.stderr, /REFUSED/);
  });
});
