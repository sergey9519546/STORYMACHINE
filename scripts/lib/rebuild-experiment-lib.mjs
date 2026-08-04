// REBUILD-EXPERIMENT LIBRARY — the pure, testable mechanics behind
// scripts/rebuild-experiment.mjs (P1 "One Bet" rebuild: which signals
// actually separate?).
//
// ── Why this file is separate from the runner ──────────────────────────────
// scripts/rebuild-experiment.mjs is a top-to-bottom script: importing it runs
// a corpus measurement. Everything a test can meaningfully assert about the
// harness — degradation determinism, AUC arithmetic, bootstrap seeding, CLI
// parsing, the caveat text, the configuration matrix, the candidate deduction
// shapes — lives HERE instead, so tests/core/rebuild-experiment.test.ts can
// import it without touching a corpus or the doctor.
//
// ── Provenance of every ported piece (nothing here was invented) ───────────
// The four degradations and the AUC/bootstrap arithmetic are PORTED VERBATIM
// from scripts/measure-auc-split.mjs (which this file must never edit):
//
//   mulberry32                 <- measure-auc-split.mjs lines 245-252
//   pairwiseAuc                <- measure-auc-split.mjs lines 253-261
//   bootstrapCi                <- measure-auc-split.mjs lines 262-274
//                                 (seed 42, percentile bounds; iteration
//                                  count is a parameter here, defaulting to
//                                  2000 rather than that file's 10000 —
//                                  see BOOTSTRAP_DEFAULT below)
//   HEADING_RE / DOT_RE        <- measure-auc-split.mjs lines 277-278
//   segmentScenes / reassemble <- measure-auc-split.mjs lines 279-297
//   degradeShuffle             <- measure-auc-split.mjs lines 298-305 (seed 42)
//   degradeMidpointDrop        <- measure-auc-split.mjs lines 306-311
//   degradeClimaxRelocate      <- measure-auc-split.mjs lines 312-318
//   degradeDialogueFlatten     <- measure-auc-split.mjs lines 319-325
//   DEGRADATIONS order         <- measure-auc-split.mjs lines 327-332
//
// The AUC-24 ratchet in tests/core/real-script-corpus.test.ts uses a
// DIFFERENT recipe (one combined shuffle-AND-drop-every-third degradation,
// seeded per-file via seedFromString, scored as an all-pairs goods x bads
// grid rather than matched pairs). It is deliberately NOT reproduced here:
// mixing the two would produce a number comparable to neither the 0.622
// ratchet nor the 761-script baseline. This harness measures the FOUR
// SEPARATE measure-auc-split degradations, matched-pair, exactly as
// docs/p1-benchmark/DISCRIMINATION_BASELINE_2026-07-29.md reports them.
//
// ── What is NEW here, and therefore not evidence of anything yet ───────────
// Three of the four unwired candidate signals have NO agreed deduction shape
// anywhere in the codebase — measure-auc-split.mjs's --with-reversal-detection
// and --with-agency-signal flags are explicitly DIAGNOSTIC ONLY ("this flag
// does NOT touch health, the AUC pairs, or the CSV rows at all", that file's
// header), and truth-extraction.ts has no flag at all. Only
// question-latency-deduction.ts ships its own bounded deduction.
//
// So candidateDeductions() below defines HARNESS-LOCAL candidate shapes for
// reversal / agency / truth. They are research probes for an exploration
// partition, not wiring proposals, and no constant in them was tuned: every
// value was fixed before the first measurement run and left alone afterward.
// Each shape reuses the bounded-deduction pattern the codebase already uses
// (gate -> rate -> reference -> slope -> cap), with caps in the same order of
// magnitude as doctor.ts's existing structural deductions (15/18/24).

import { computeHealthScore } from '../../server/nvm/analyze/doctor.ts';
import { normalizeScreenplay } from '../../server/nvm/analyze/screenplay-normalizer.ts';
import { parseFountain } from '../../src/lib/fountain.ts';
import { computeQuestionLatencyDeduction } from '../../server/nvm/analyze/question-latency-deduction.ts';
import { detectReversals } from '../../server/nvm/analyze/reversal-detection.ts';
import { computeD2AgencyDelta } from '../../server/nvm/analyze/agency-signal.ts';
import { detectTruthContradictions } from '../../server/nvm/analyze/truth-extraction.ts';

// ───────────────────────────────────────────────────────────────────────────
// Seeded RNG + AUC (ported verbatim — see provenance block above)
// ───────────────────────────────────────────────────────────────────────────

/** measure-auc-split.mjs lines 245-252, unchanged. */
export function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Matched-pair AUC. measure-auc-split.mjs lines 253-261, unchanged: a tie
 *  counts half, an empty pair list is NaN (not 0.5 — "no measurement" and
 *  "chance" must stay distinguishable). */
export function pairwiseAuc(pairs) {
  if (pairs.length === 0) return NaN;
  let correct = 0;
  for (const { real, degraded } of pairs) {
    if (real > degraded) correct += 1;
    else if (real === degraded) correct += 0.5;
  }
  return correct / pairs.length;
}

/** Default bootstrap resamples. measure-auc-split.mjs uses 10000 on a
 *  456-script partition; this harness's brief requires >= 2000 and it runs
 *  32 configurations x 5 statistics, so 2000 is the default and --bootstrap
 *  raises it. Seeded identically (mulberry32, seed 42, percentile bounds), so
 *  a given (pairs, iterations, seed) triple always reproduces. */
export const BOOTSTRAP_DEFAULT = 2000;

/** measure-auc-split.mjs lines 262-274, with iterations/seed exposed. */
export function bootstrapCi(pairs, iterations = BOOTSTRAP_DEFAULT, seed = 42) {
  if (pairs.length === 0) return { lo: NaN, hi: NaN };
  const rng = mulberry32(seed);
  const n = pairs.length;
  const aucs = new Float64Array(iterations);
  for (let i = 0; i < iterations; i++) {
    const resample = [];
    for (let j = 0; j < n; j++) resample.push(pairs[Math.floor(rng() * n)]);
    aucs[i] = pairwiseAuc(resample);
  }
  const sorted = Array.from(aucs).sort((a, b) => a - b);
  return { lo: sorted[Math.floor(0.025 * iterations)], hi: sorted[Math.floor(0.975 * iterations)] };
}

// ───────────────────────────────────────────────────────────────────────────
// Degradations (ported verbatim — see provenance block above)
// ───────────────────────────────────────────────────────────────────────────

const HEADING_RE = /^(INT\.|EXT\.|EST\.|INT\/EXT\.)/;
const DOT_RE = /^\./;

export function segmentScenes(text) {
  const lines = text.split(/\r?\n/);
  const scenes = []; let cur = null; const preamble = [];
  for (const line of lines) {
    const t = line.trim();
    if (HEADING_RE.test(t) || DOT_RE.test(t)) {
      if (cur) scenes.push(cur);
      cur = { heading: line, body: [] };
    } else if (cur) cur.body.push(line);
    else preamble.push(line);
  }
  if (cur) scenes.push(cur);
  return { preamble, scenes };
}

export function reassemble(preamble, scenes) {
  const out = [...preamble];
  for (const s of scenes) { out.push(s.heading); out.push(...s.body); }
  return out.join('\n');
}

/** Seed 42, identical Fisher-Yates direction to measure-auc-split.mjs — the
 *  same script always produces the same shuffle. */
export function degradeShuffle(text) {
  const { preamble, scenes } = segmentScenes(text);
  if (scenes.length < 3) return null;
  const rng = mulberry32(42);
  const sh = scenes.slice();
  for (let i = sh.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [sh[i], sh[j]] = [sh[j], sh[i]]; }
  return reassemble(preamble, sh);
}

export function degradeMidpointDrop(text) {
  const { preamble, scenes } = segmentScenes(text);
  const n = scenes.length;
  if (n < 5) return null;
  return reassemble(preamble, scenes.slice(0, Math.floor(n * 0.4)).concat(scenes.slice(Math.floor(n * 0.6))));
}

export function degradeClimaxRelocate(text) {
  const { preamble, scenes } = segmentScenes(text);
  if (scenes.length < 3) return null;
  const last = scenes.pop();
  scenes.splice(1, 0, last);
  return reassemble(preamble, scenes);
}

export function degradeDialogueFlatten(text) {
  const normalized = normalizeScreenplay(text);
  const blocks = parseFountain(normalized);
  if (blocks.length === 0) return null;
  const dl = new Set(blocks.filter(b => b.type === 'dialogue' || b.type === 'parenthetical').map(b => b.lineNumber));
  return normalized.split(/\r?\n/).map((l, i) => dl.has(i + 1) ? 'Hello.' : l).join('\n');
}

export const DEGRADATIONS = [
  { id: 'SCENE_SHUFFLE', fn: degradeShuffle },
  { id: 'MIDPOINT_DROP', fn: degradeMidpointDrop },
  { id: 'CLIMAX_RELOCATE', fn: degradeClimaxRelocate },
  { id: 'DIALOGUE_FLATTEN', fn: degradeDialogueFlatten },
];

// ───────────────────────────────────────────────────────────────────────────
// Candidate signal deductions
// ───────────────────────────────────────────────────────────────────────────
// SIGNALS[i].id is the short token used in configuration names.
export const SIGNALS = ['QL', 'REV', 'AGENCY', 'TRUTH'];

/** question-latency-deduction.ts's OWN bounded deduction — the only one of
 *  the four that ships a shape. Composed exactly as measure-auc-split.mjs's
 *  healthWithOptionalQlDeduction does (lines 132-144): subtract, floor at 0.
 *  NOTE the module's own feature-scale gate: it returns 0 below 15 scenes
 *  (question-latency-deduction.ts minScenesFloor()), so on any corpus of
 *  short scripts this signal is IDENTICALLY ZERO and cannot move AUC. That
 *  is a property of the module, not a harness bug — the harness reports the
 *  gate-pass rate so a zero-lift result is never mistaken for "measured and
 *  found useless." */
function qlDeduction(records) {
  const r = computeQuestionLatencyDeduction(records);
  return {
    deduction: r.deduction,
    gated: r.gated,
    raw: { qlRaised: r.raised, qlUnresolvedRate: r.unresolvedRate ?? '' },
  };
}

/** HARNESS-LOCAL candidate (reversal-detection.ts ships no deduction shape).
 *  Reversal SCARCITY: a feature that never turns costs something. Constants
 *  fixed before the first run, never tuned:
 *    gate      >= 8 scenes (below that, one reversal swings the rate wildly)
 *    reference 0.15 reversals/scene (~one turn per 7 scenes)
 *    cap       12 points (same order as doctor.ts's 15/18/24 structural caps)
 *    slope     cap / reference = 80, so rate 0 maps exactly to the cap. */
function revDeduction(records) {
  const MIN_SCENES = 8;
  const REF = 0.15;
  const CAP = 12;
  const SLOPE = CAP / REF;
  const n = records.length;
  if (n < MIN_SCENES) return { deduction: 0, gated: false, raw: { revCount: '' } };
  const { reversalCount } = detectReversals(records);
  const rate = reversalCount / n;
  return {
    deduction: Math.min(CAP, SLOPE * Math.max(0, REF - rate)),
    gated: true,
    raw: { revCount: reversalCount },
  };
}

/** HARNESS-LOCAL candidate (agency-signal.ts ships comparison stats, not a
 *  deduction). Act-3 INITIATIVE scarcity, read off computeD2AgencyDelta's
 *  detectedInitiativeCount / act3SceneCount. Constants fixed before the first
 *  run, never tuned:
 *    gate      >= 2 Act-3 scenes
 *    reference 0.5 (the protagonist acts in at least half of Act 3)
 *    cap       10 points
 *    slope     cap / reference = 20
 *  Protagonist = characters[0] (most-frequently-speaking), exactly the
 *  default measure-auc-split.mjs's own diagnoseAgencyDelta uses (line 195).
 *  This is the only candidate whose window is POSITIONAL, so it is the one
 *  with a mechanical reason to notice CLIMAX_RELOCATE. */
function agencyDeduction(records, protagonist) {
  const MIN_ACT3_SCENES = 2;
  const REF = 0.5;
  const CAP = 10;
  const SLOPE = CAP / REF;
  const empty = { act3Initiative: '', act3Scenes: '' };
  if (!protagonist) return { deduction: 0, gated: false, raw: empty };
  const d2 = computeD2AgencyDelta(records, protagonist);
  if (d2.act3SceneCount < MIN_ACT3_SCENES) return { deduction: 0, gated: false, raw: empty };
  const rate = d2.detectedInitiativeCount / d2.act3SceneCount;
  return {
    deduction: Math.min(CAP, SLOPE * Math.max(0, REF - rate)),
    gated: true,
    raw: { act3Initiative: d2.detectedInitiativeCount, act3Scenes: d2.act3SceneCount },
  };
}

/** HARNESS-LOCAL candidate (truth-extraction.ts ships a detector, not a
 *  deduction). Flat per-contradiction cost, capped. Constants fixed before
 *  the first run, never tuned: 4 points per contradiction, cap 12. Unlike the
 *  three rate-based shapes this one has no scene-count gate — a contradicted
 *  life-status fact is a discrete finding, not a rate. */
function truthDeduction(text) {
  const PER = 4;
  const CAP = 12;
  const { contradictions, facts } = detectTruthContradictions(text);
  return {
    deduction: Math.min(CAP, PER * contradictions.length),
    gated: true,
    raw: { truthFacts: facts.length, truthContradictions: contradictions.length },
  };
}

/**
 * All four candidate deductions for one screenplay variant, plus the
 * weighted-rule channel-zero adjustment.
 *
 * @param {string} text        the (possibly degraded) screenplay text
 * @param {object} analysis    analyzeFountainText(text) output
 * @param {object} report      runScriptDoctor(text, ...) output
 */
export function candidateDeductions(text, analysis, report) {
  const records = analysis.records ?? [];
  const protagonist = (analysis.characters ?? [])[0];
  const ql = qlDeduction(records);
  const rev = revDeduction(records);
  const agency = agencyDeduction(records, protagonist);
  const truth = truthDeduction(text);
  return {
    QL: ql.deduction, QL_gated: ql.gated,
    REV: rev.deduction, REV_gated: rev.gated,
    AGENCY: agency.deduction, AGENCY_gated: agency.gated,
    TRUTH: truth.deduction, TRUTH_gated: truth.gated,
    RULE_ZERO_ADJ: ruleChannelZeroAdjustment(report),
    // Raw detector outputs behind each deduction. Reported so a saturated
    // deduction (e.g. a scarcity shape sitting at its cap because the
    // detector found nothing anywhere) is visibly distinguishable from a
    // deduction that is genuinely varying with the material.
    raw: { ...ql.raw, ...rev.raw, ...agency.raw, ...truth.raw },
  };
}

/** Column order for the per-script raw-signal CSV. */
export const RAW_SIGNAL_COLUMNS = [
  'qlRaised', 'qlUnresolvedRate', 'revCount', 'act3Initiative', 'act3Scenes',
  'truthFacts', 'truthContradictions',
];

/**
 * How many health points the WEIGHTED-RULE CHANNEL is currently subtracting
 * from this report — i.e. the amount to ADD BACK to zero that channel.
 *
 * This is an EXACT external zeroing, not an approximation, and it needs no
 * edit to doctor.ts. doctor.ts's health is
 *   health = max(0, round10(baseHealth - structural - arc - dialogue))
 * with baseHealth = computeHealthScore(bySeverity, sceneCount, wordCount)
 * (doctor.ts line 1795), and computeHealthScore = clamp(100 -
 * densityPenalty(bySeverity, wordCount) - scarcityPenalty(sceneCount)).
 * densityPenalty is the ONLY term that reads bySeverity, and scarcityPenalty
 * reads only sceneCount — so evaluating the EXPORTED computeHealthScore twice,
 * once with the real severity counts and once with all-zero counts, isolates
 * the weighted-rule channel's contribution exactly. ScriptDoctorReport carries
 * bySeverity, sceneCount and wordCount (types.ts lines 248/257/258), so every
 * input is available from outside.
 *
 * Two honest edges, both reported rather than hidden:
 *  - health is rounded to 0.1 before this adjustment is added, so a zeroed
 *    health can differ from a hypothetical internally-zeroed one by <= 0.05.
 *  - health is floored at 0; a script already saturated at 0 cannot have the
 *    channel added back faithfully. The runner counts saturated scripts.
 */
export function ruleChannelZeroAdjustment(report) {
  const zero = computeHealthScore({ critical: 0, major: 0, minor: 0 }, report.sceneCount, report.wordCount);
  const real = computeHealthScore(report.bySeverity, report.sceneCount, report.wordCount);
  return zero - real;
}

// ───────────────────────────────────────────────────────────────────────────
// Configuration matrix
// ───────────────────────────────────────────────────────────────────────────

/**
 * Full factorial: every subset of the four candidate signals (16) crossed
 * with rule-channel-zeroing on/off (2) = 32 configurations. This costs
 * nothing extra to measure — every configuration is a linear combination of
 * per-variant numbers the harness computes once — so there is no reason to
 * measure a "sensible subset" and wonder about the rest.
 */
export function buildConfigs() {
  const configs = [];
  for (const ruleZero of [false, true]) {
    for (let mask = 0; mask < 16; mask++) {
      const signals = SIGNALS.filter((_, i) => (mask >> i) & 1);
      const parts = [];
      if (ruleZero) parts.push('RULE_ZERO');
      parts.push(...signals);
      const id = parts.length === 0 ? 'baseline' : (ruleZero && signals.length === 0 ? 'RULE_ZERO' : parts.join('+'));
      configs.push({ id, signals, ruleZero });
    }
  }
  return configs;
}

/** Health under one configuration, from a variant's precomputed numbers.
 *  Rule-zeroing adds the weighted-rule channel back BEFORE the candidate
 *  deductions come off, and the result is clamped to [0, 100] — the same
 *  order and the same floor doctor.ts itself applies (line 1939). */
export function configHealth(config, variant) {
  let h = variant.health;
  if (config.ruleZero) h += variant.deductions.RULE_ZERO_ADJ;
  for (const s of config.signals) h -= variant.deductions[s];
  return Math.max(0, Math.min(100, h));
}

// ───────────────────────────────────────────────────────────────────────────
// CLI
// ───────────────────────────────────────────────────────────────────────────

export const PARTITIONS = ['trainval', 'train', 'val'];

/**
 * Parse the harness's argv. Deliberately strict about one thing: there is no
 * way to point this exploration harness at the held-out test partition.
 * PRE_REGISTRATION_PROTOCOL / MEASUREMENT_RUNBOOK §"test" reserve that set
 * for a single final evaluation through scripts/measure-auc-split.mjs, which
 * carries the SHA-256 test-set hash lock. Exploration that touches it burns
 * it. `--partition=test` therefore returns an error rather than a partition.
 *
 * Returns { ok: true, opts } or { ok: false, error }.
 */
export function parseArgs(argv, env = {}) {
  const opts = {
    corpusDir: env.CORPUS_DIR || 'data/screenplays',
    partition: 'trainval',
    withCalibration: false,
    bootstrap: BOOTSTRAP_DEFAULT,
    seed: 42,
    help: false,
    force: false,
    outDir: 'scripts/output',
  };
  for (const a of argv) {
    if (a === '--help' || a === '-h') { opts.help = true; continue; }
    if (a === '--with-calibration') { opts.withCalibration = true; continue; }
    if (a === '--force' || a === '-f') { opts.force = true; continue; }
    if (a.startsWith('--partition=')) {
      const p = a.slice('--partition='.length);
      if (p === 'test') {
        return {
          ok: false,
          error: 'REFUSED: --partition=test. The 153-script test partition is hash-locked for a '
            + 'single final evaluation via scripts/measure-auc-split.mjs (MEASUREMENT_RUNBOOK.md). '
            + 'This is an EXPLORATION harness; running it on test would burn the held-out set. '
            + 'Use --partition=trainval (default), train, or val.',
        };
      }
      if (!PARTITIONS.includes(p)) {
        return { ok: false, error: `Invalid --partition=${p}. Use one of: ${PARTITIONS.join(', ')}.` };
      }
      opts.partition = p;
      continue;
    }
    if (a.startsWith('--bootstrap=')) {
      const n = Number(a.slice('--bootstrap='.length));
      if (!Number.isFinite(n) || n < 200 || !Number.isInteger(n)) {
        return { ok: false, error: `Invalid --bootstrap=${a.slice('--bootstrap='.length)}. Use an integer >= 200.` };
      }
      opts.bootstrap = n;
      continue;
    }
    if (a.startsWith('--seed=')) {
      const n = Number(a.slice('--seed='.length));
      if (!Number.isInteger(n)) return { ok: false, error: `Invalid --seed=${a.slice('--seed='.length)}. Use an integer.` };
      opts.seed = n;
      continue;
    }
    if (a.startsWith('--corpus-dir=')) { opts.corpusDir = a.slice('--corpus-dir='.length); continue; }
    if (a.startsWith('--out-dir=')) { opts.outDir = a.slice('--out-dir='.length); continue; }
    return { ok: false, error: `Unknown argument "${a}". Run with --help.` };
  }
  return { ok: true, opts };
}

/** The caveat block. Printed at the TOP and the BOTTOM of every run, and
 *  copied verbatim into the results doc. It exists so an in-sandbox number
 *  can never be quoted as if it were a corpus measurement. */
export const CAVEAT_BLOCK = [
  '───────────────────────────────────────────────────────────────────────────',
  'CAVEATS — read before quoting any number from this run',
  '───────────────────────────────────────────────────────────────────────────',
  '1. DIRECTIONAL, NOT CONCLUSIVE. The in-repo corpus is ~20 CC0 scripts (40',
  '   with --with-calibration). At that N a 95% bootstrap CI on an AUC spans',
  '   roughly +/-0.2. Rankings here are hypotheses to test on the real corpus,',
  '   not findings.',
  '2. NOT COMPARABLE to docs/p1-benchmark/DISCRIMINATION_BASELINE_2026-07-29.md.',
  '   That baseline is 761 produced feature screenplays (153-script hash-locked',
  '   test partition, 100-400 scenes each). The in-repo scripts are 9-14-scene',
  '   AI-authored shorts (docs/p1-benchmark/CC0_CORPUS_EXPANSION_2026-08-04.md',
  '   says so up front). Several scoring paths are feature-scale-gated and',
  '   cannot fire at all at this length — the gate-pass table below reports',
  '   exactly which.',
  '3. NOT COMPARABLE to the AUC-24 >= 0.622 ratchet in',
  '   tests/core/real-script-corpus.test.ts either: that is ONE combined',
  '   shuffle-and-drop degradation scored as an all-pairs grid, not these four',
  '   separate matched-pair degradations.',
  '4. THE REAL MEASUREMENT IS THE MAINTAINER COMMAND:',
  '     CORPUS_DIR=<local corpus> node scripts/rebuild-experiment.mjs --partition=trainval',
  '   Run locally against the 761-script corpus. Nothing in CI can run it —',
  '   the corpus is local-only for copyright reasons (CLAUDE.md).',
  '5. THE CANDIDATE DEDUCTION SHAPES FOR REV / AGENCY / TRUTH ARE HARNESS-LOCAL',
  '   research probes, not proposed wiring. Only question-latency-deduction.ts',
  '   ships its own deduction; the reversal/agency plumbing in',
  '   scripts/measure-auc-split.mjs is diagnostic-only by that file\'s own',
  '   header. Constants were fixed before the first run and never tuned.',
  '───────────────────────────────────────────────────────────────────────────',
].join('\n');

export const USAGE = [
  'rebuild-experiment.mjs — which signals actually separate? (P1 One Bet)',
  '',
  'Usage:',
  '  CORPUS_DIR=<dir> node scripts/rebuild-experiment.mjs [options]',
  '',
  'Options:',
  '  --partition=trainval|train|val   Split partition (default trainval = everything',
  '                                   NOT in corpus-split.json\'s test set, including',
  '                                   files the split never assigned). --partition=test',
  '                                   is refused: the test set is hash-locked for a',
  '                                   single final evaluation via measure-auc-split.mjs.',
  '  --corpus-dir=<dir>               Overrides CORPUS_DIR (default data/screenplays).',
  '  --with-calibration               Also score the 20 calibration-corpus samples',
  '                                   (server/nvm/analyze/calibration/corpus.ts).',
  '  --bootstrap=<n>                  Bootstrap resamples, integer >= 200 (default 2000).',
  '  --seed=<n>                       Bootstrap seed (default 42).',
  '  --out-dir=<dir>                  Where CSV/JSON go (default scripts/output).',
  '  --force                          Allow the output guard to shrink an existing file.',
  '  --help                           This text.',
  '',
  CAVEAT_BLOCK,
].join('\n');
