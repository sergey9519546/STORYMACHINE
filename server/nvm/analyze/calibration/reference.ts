// Script Doctor — calibration reference distribution (Deliverable 1/2 of the
// calibration feature: this file is the "reference.ts" half; the sample
// scripts themselves live in ./corpus.ts).
//
// ── What this is, honestly ───────────────────────────────────────────────
// This is a small, originally-authored, hand-graded reference corpus (see
// corpus.ts's header comment) — NOT "all produced screenplays," not an
// industry benchmark, and not built from any real/copyrighted script. It
// exists so a raw 0-100 health or dimension score can be read relative to a
// deliberately quality-banded set of samples ("stronger than 74% of the
// reference set") instead of floating in the abstract. Every descriptor
// built on top of this (calibration/percentile.ts's percentileDescriptor)
// names "the reference set" explicitly for exactly this reason — never
// implying a broader claim than the data supports.
//
// ── Why "lazy compute + cache" (option b) over baked consts (option a) ────
// The corpus is small (~20 scripts), analyzeFountainText + the 14-pass
// pipeline are deterministic and keyless (no LLM — diagnose-only, see
// revision/rewrite.ts's runDiagnoseOnly), and scoring the whole corpus takes
// low-single-digit milliseconds. That makes eager baked-in numbers strictly
// worse: every time a wave in CLAUDE.md's standing task adds 3 new checks to
// a pass file, hand-baked scores would silently drift out of sync with the
// very corpus they claim to describe, with no test catching the staleness.
// Scoring lazily at module load keeps this file self-maintaining — add a
// scene to corpus.ts, the distribution picks it up automatically, no manual
// regeneration step to forget.
//
// ── Breaking the recursion cycle ─────────────────────────────────────────
// runScriptDoctor() (doctor.ts) -> aggregateReport() -> getReferenceDistribution()
// (this file) is the normal request path once the distribution is cached.
// But BUILDING that cache needs to score the corpus through the real
// pipeline too — if it did so by calling runScriptDoctor(), that would
// re-enter aggregateReport(), which would call getReferenceDistribution()
// again before the first build finished: infinite recursion.
//
// The fix is architectural, not a runtime flag: this module scores the
// corpus via the same LOWER-LEVEL pipeline pieces doctor.ts's runScriptDoctor
// itself calls (analyzeFountainText, runRevisionPipeline, runDiagnoseOnly),
// and rolls the 14 pass results up into health/dimension numbers itself,
// rather than ever calling runScriptDoctor() or importing doctor.ts's
// private aggregateReport(). The corpus-scoring path below and the
// user-report path in doctor.ts therefore never call each other — there is
// no cycle to guard against, by construction, rather than by a boolean latch
// that could be forgotten or bypassed. (This file does import doctor.ts's
// `computeRawCraftScore` — a pure, parameter-only function with no
// dependency on any of doctor.ts's own module-level state — so reusing the
// exact published craft-score formula here creates no re-entrancy risk:
// nothing in this module's build path ever calls back into doctor.ts's
// aggregateReport or runScriptDoctor. This is the UNCLAMPED variant of
// computeHealthScore — see computeRawCraftScore's own comment in doctor.ts
// and the "raw, not clamped" note on scoreSample() below for why the
// distribution built here is deliberately not built from the displayed
// 0-100 health score.)
//
// Regeneration: there is nothing to regenerate by hand — getReferenceDistribution()
// recomputes from corpus.ts on first call in every process, memoized after
// that (buildDistribution() below runs at most once per process).
//
// ── Corpus band ordering: now fully monotonic (controlled-richness fix) ───
// An earlier revision of this corpus had a real calibration defect: averaged
// per band, 'competent' scored LOWEST of all four bands, and one strong
// sample ranked below every troubled sample. Root cause: the pipeline's many
// "structural signal absent" checks scale with scene count and script
// richness more than with authored quality, and the 30/sceneCount
// normalization (doctor.ts's craftPenalty) doesn't fully correct for that —
// so a richer, longer, mid-quality script could out-penalize a barren
// troubled one on the raw craft score.
//
// The fix was experimental design, not score-gaming: corpus.ts's 20 samples
// were rebuilt so RICHNESS (scene count, word count, and which structural
// signals — clock, planted clue, dialogue, action, a relationship beat — are
// present) is held constant across all four bands, leaving CRAFT as the only
// independent variable. See corpus.ts's header for the exact per-band craft
// design (what 'strong' executes that 'troubled' doesn't, at matched
// richness). With that constraint in place, tests/core/calibration.test.ts
// now enforces, as STRICT guarantees rather than a partial one:
//   (a) full four-band monotonicity on band-average raw craft score:
//       strong > competent > weak > troubled;
//   (b) no strong sample's raw score falls below the troubled-band average;
//   (c) a pinned strong/troubled pair (the most robust — largest-gap — pair
//       in the corpus, not a marginal one) outranks correctly on
//       healthPercentile through the real runScriptDoctor pipeline.
//
// Constraint for future corpus editors: this monotonicity is a PROPERTY OF
// THE CORPUS DESIGN, not an accident of the current 20 samples — it holds
// because richness is matched. A future edit that changes one band's scene
// count, word count, or structural-signal presence without changing every
// other band the same way reintroduces the exact confound this fix removes,
// and the test suite will (correctly) start failing again. See corpus.ts's
// header for the full constraint and the per-sample word/scene budget.
//
// ── The saturation defect this file used to document (now fixed) ─────────
// Until this fix, doctor.ts's craftPenalty normalized ONLY by scene count
// (weightedIssues * (30 / sceneCount)). Issue volume actually scales with
// prose length (word count) as much as with scene count, so every one of
// this corpus's 20 richness-matched, ~300-360-word samples produced a raw
// craft score around -180 to -330 — comfortably past the [0, 100] clamp.
// Every realistic multi-scene script displayed health 0, grade 'troubled',
// verdict 'PASS', regardless of authored quality; only tiny 2-4 scene
// fixtures (too little material for the same issue volume to accumulate)
// ever cleared the clamp. See doctor.ts's craftPenalty comment for the
// opportunity-based replacement (a word-density term, amplified nonlinearly
// so the corpus's narrow band-to-band density range still separates on the
// 0-100 scale, plus an additive scene-scarcity term so a script can't read
// as "clean" purely by being too short to accumulate issues).
//
// ── What remains genuinely unfixed (out of scope here) ────────────────────
// No formula is perfect; here is the honest residual bias in the NEW
// opportunity-based craftPenalty, not the old one:
//   1. Small-script ceiling by design, not oversight: scarcityPenalty
//      (doctor.ts) deliberately keeps a 2-4 scene script out of the top of
//      the range even when it's genuinely clean, because there isn't enough
//      material for most of the pipeline's structural checks (escalation,
//      revelation, payoff timing, relationship arcs) to have had a fair
//      chance to fire — a "clean" reading from too little evidence isn't
//      trustworthy. The correction is uniform, though: a genuinely
//      exceptional 3-scene excerpt and a mediocre 3-scene fragment both
//      absorb the same scarcity surcharge, so discrimination WITHIN the
//      "too short to fully evaluate" bucket stays compressed relative to
//      what the same material would show at full length. verdictFor's own
//      sceneCount >= 8 RECOMMEND floor (unchanged by this fix) is the
//      product's separate, coarser guard against the same concern.
//   2. The word-count exponent (WORD_COUNT_EXPONENT in doctor.ts) that makes
//      the penalty length-invariant was measured from ONE real concatenation
//      experiment (a matched-quality sample duplicated to 2x/3x length, 290
//      to 890 words) — a strong empirical signal, not a mathematical
//      guarantee that every screenplay's own mix of per-scene vs.
//      per-document rule firings scales identically. Real feature-length
//      scripts run 10-50x longer than that measurement's largest point; the
//      exponent is extrapolated past what was directly verified, so
//      length-invariance at those larger scales is a well-founded
//      expectation, not a proof.
//   3. DENSITY_POWER and DENSITY_SCALE are calibrated to THIS corpus's
//      current band-to-band density spread (roughly 1.6x, best sample to
//      worst). CLAUDE.md's standing task adds 3 new revision-pass checks
//      every wave, indefinitely — if that steadily widens or narrows the
//      corpus's density spread over many waves, the achieved 0-100
//      separation will drift with it, and these constants (like any
//      hand-tuned constants) will eventually warrant re-tuning against the
//      then-current corpus. tests/core/calibration.test.ts's monotonicity
//      assertions will catch an outright ordering break; they will NOT
//      catch a slow drift in how WIDE the separation is, since the
//      band-average targets are documented as soft, not asserted exactly.

import type { CompiledScreenplay } from '../../screenplay/compile.ts';
import type { PassName } from '../../revision/passes/types.ts';
import { runRevisionPipeline } from '../../revision/pipeline.ts';
import { runDiagnoseOnly } from '../../revision/rewrite.ts';
import { analyzeFountainText } from '../fountain-analyzer.ts';
import { computeRawCraftScore } from '../doctor.ts';
import type { DimensionKey } from '../types.ts';
import { REFERENCE_CORPUS } from './corpus.ts';

export interface ReferenceDistribution {
  /** Sorted ascending RAW (unclamped) craft-score statistics across the
   *  reference corpus — computeRawCraftScore's output, not the displayed
   *  computeHealthScore value. See the file header's saturation note: with
   *  the clamp, an unusually issue-dense sample could tie another at 0 and
   *  make the distribution unable to distinguish them. */
  health: number[];
  /** Sorted ascending per-dimension RAW craft-score statistics, keyed by
   *  DimensionKey — same unclamped rationale as `health` above. */
  dimensions: Record<DimensionKey, number[]>;
}

// Mirrors doctor.ts's DIMENSION_DEFS pass->dimension contract (also restated
// in types.ts's DimensionKey doc comment and locked down by
// tests/core/script-doctor.test.ts's "covering all 14 passes exactly once"
// case). Duplicated here — rather than imported from doctor.ts — specifically
// so this module never needs doctor.ts's aggregateReport/buildDimensions
// (module-level `const` state that would be in the temporal dead zone if
// reached mid-cycle); see the file header above. This table is a fixed
// editorial decision that changes only if the DimensionKey contract itself
// changes, at which point script-doctor.test.ts's own contract assertion
// would fail first and point back here.
const DIMENSION_PASS_MAP: ReadonlyArray<{ key: DimensionKey; passes: PassName[] }> = [
  { key: 'structure-pacing', passes: ['structure', 'pacing', 'rhythm'] },
  { key: 'character', passes: ['character-arc', 'intention', 'relationship-arc'] },
  { key: 'dialogue-voice', passes: ['dialogue', 'voice'] },
  { key: 'plot-logic', passes: ['causality', 'belief', 'payoff', 'conflict'] },
  { key: 'theme-originality', passes: ['theme', 'originality'] },
];

/** Score one corpus sample through the real 14-pass diagnostic pipeline —
 *  the identical pipeline runScriptDoctor() drives — and roll it up into a
 *  RAW (unclamped) craft-score number plus one raw score per dimension.
 *  Deliberately NOT built by calling runScriptDoctor()/aggregateReport(): see
 *  the recursion note above. Deliberately NOT computeHealthScore's clamped
 *  displayed value either: see the file header's saturation note. */
async function scoreSample(fountain: string): Promise<{ health: number; dimensions: Record<DimensionKey, number> }> {
  const analysis = analyzeFountainText(fountain);

  // A corpus sample is hand-authored Fountain (see corpus.ts) and always has
  // scenes, but guard anyway rather than assume: a zero-scene sample would
  // otherwise skew the distribution with a meaningless perfect/zero score.
  if (analysis.sceneCount === 0) {
    const zeroed = Object.fromEntries(DIMENSION_PASS_MAP.map(d => [d.key, 0])) as Record<DimensionKey, number>;
    return { health: 0, dimensions: zeroed };
  }

  const compiled: CompiledScreenplay = {
    fountain,
    annotations: analysis.annotations,
    // Not read by runRevisionPipeline or any pass (only compiled.fountain and
    // compiled.annotations are consumed) — a plain label is enough here.
    structureSummary: 'calibration corpus sample',
    wordCount: analysis.wordCount,
    compiledAt: 0,
  };

  const result = await runDiagnoseOnly(() =>
    runRevisionPipeline(compiled, analysis.records, analysis.structure, []),
  );

  const bySeverityTotal = { critical: 0, major: 0, minor: 0 };
  for (const pr of result.passResults) {
    for (const issue of pr.issues) bySeverityTotal[issue.severity]++;
  }
  // Raw (unclamped), NOT computeHealthScore's displayed [0, 100] value: even
  // after doctor.ts's opportunity-based rebalance (craftPenalty now blends a
  // word-density term with a scene-scarcity term instead of normalizing by
  // scene count alone — see craftPenalty's own comment in doctor.ts), an
  // exceptionally issue-dense sample can still drive the pre-clamp score
  // deeply negative. Ranking on the unclamped statistic keeps any two such
  // samples distinguishable in the distribution instead of tying at the
  // clamped floor — see doctor.ts's aggregateReport calibration-layer
  // comment for the full rationale. computeRawCraftScore now also takes
  // wordCount (analysis.wordCount) alongside sceneCount, since the
  // opportunity-based penalty is a blend of both.
  const health = computeRawCraftScore(bySeverityTotal, analysis.sceneCount, analysis.wordCount);

  const dimensions = {} as Record<DimensionKey, number>;
  for (const def of DIMENSION_PASS_MAP) {
    const passSet = new Set<PassName>(def.passes);
    const bySeverity = { critical: 0, major: 0, minor: 0 };
    for (const pr of result.passResults) {
      if (!passSet.has(pr.pass)) continue;
      for (const issue of pr.issues) bySeverity[issue.severity]++;
    }
    // Same reasoning as `health` above — raw, unclamped, for ranking
    // symmetry, using the whole sample's wordCount (a dimension is a
    // regrouping of issues by pass, not a distinct slice of the prose, so
    // there's no separate per-dimension word count — same rationale as
    // doctor.ts's buildDimensions).
    dimensions[def.key] = computeRawCraftScore(bySeverity, analysis.sceneCount, analysis.wordCount);
  }

  return { health, dimensions };
}

/** Percentiles ranked against a tiny sample are statistical theater — with
 *  two reference scripts, every user score reads as roughly "0th/50th/100th
 *  percentile" and the descriptor ("stronger than N% of the reference set")
 *  becomes a claim the data cannot support. Until the corpus carries at
 *  least this many quality-banded samples, buildDistribution() returns the
 *  empty distribution, which doctor.ts's guard treats as "calibration
 *  unavailable": percentile fields stay undefined and every consumer
 *  (panel, coverage export) already renders that state. corpus.ts is
 *  currently an explicit STUB (see its header) — this gate is what keeps
 *  the stub from ever leaking meaningless numbers to a writer while the
 *  real corpus is authored. */
const MIN_CORPUS_SIZE = 8;

async function buildDistribution(): Promise<ReferenceDistribution> {
  if (REFERENCE_CORPUS.length < MIN_CORPUS_SIZE) return emptyDistribution();

  const health: number[] = [];
  const dimensions: Record<DimensionKey, number[]> = {
    'structure-pacing': [], character: [], 'dialogue-voice': [], 'plot-logic': [], 'theme-originality': [],
  };

  for (const sample of REFERENCE_CORPUS) {
    const scored = await scoreSample(sample.fountain);
    health.push(scored.health);
    for (const def of DIMENSION_PASS_MAP) dimensions[def.key].push(scored.dimensions[def.key]);
  }

  health.sort((a, b) => a - b);
  for (const def of DIMENSION_PASS_MAP) dimensions[def.key].sort((a, b) => a - b);

  return { health, dimensions };
}

/** Empty-but-well-formed distribution — the fallback used when scoring the
 *  corpus throws for any reason. percentileRank's empty-array -> 50 contract
 *  (percentile.ts) means this degrades to "no opinion" rather than
 *  propagating an error, and doctor.ts's own guard treats an all-empty
 *  distribution as "calibration unavailable" and leaves the percentile
 *  fields undefined entirely — "calibration is an enhancement, not a
 *  dependency" (doctor.ts's aggregateReport comment). */
function emptyDistribution(): ReferenceDistribution {
  return {
    health: [],
    dimensions: {
      'structure-pacing': [], character: [], 'dialogue-voice': [], 'plot-logic': [], 'theme-originality': [],
    },
  };
}

// Module-load-time build via a genuine top-level await, memoized for the
// lifetime of the process (buildDistribution() runs at most once — see the
// "lazy compute + cache" note above). Top-level await is safe here because
// the build path (scoreSample -> analyzeFountainText/runRevisionPipeline/
// runDiagnoseOnly, and doctor.ts's computeRawCraftScore) never calls back into
// this module or into doctor.ts's aggregateReport/runScriptDoctor, so there
// is no cycle for module-evaluation order to trip over. Per ES module
// semantics, Node resolves this await (and everything it's transitively
// waiting on) before any module that imports this one — including
// doctor.ts — finishes its own load, so getReferenceDistribution() can stay
// a plain synchronous function: by the time any real caller invokes it at
// runtime, `distribution` below is already settled.
//
// Wrapped in try/catch rather than left to reject the module: calibration
// must never be able to take the whole Script Doctor down. If a future
// corpus edit produces malformed Fountain or a pipeline pass throws while
// scoring it, this falls back to an empty distribution instead of failing
// this module's (and therefore doctor.ts's) load.
let distribution: ReferenceDistribution;
try {
  distribution = await buildDistribution();
} catch {
  distribution = emptyDistribution();
}

/**
 * The calibration reference distribution: sorted-ascending health scores and
 * per-dimension scores across corpus.ts's reference corpus. Synchronous by
 * contract (doctor.ts calls this from inside the synchronous aggregateReport)
 * — see the module-load-time build above for how an inherently async scoring
 * step becomes safe to expose synchronously.
 */
export function getReferenceDistribution(): ReferenceDistribution {
  return distribution;
}
