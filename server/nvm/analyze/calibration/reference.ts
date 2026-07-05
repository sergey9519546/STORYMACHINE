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
// ── KNOWN LIMITATION — corpus band ordering is not fully monotonic ────────
// The guarantees this module is tested to hold: strong-band average raw
// score > troubled-band average, and the pinned strong sample outranks the
// pinned troubled sample through the real pipeline (calibration.test.ts).
// What does NOT hold yet: full four-band monotonicity. Averaged per band,
// 'competent' currently scores LOWEST of all four bands, and one strong
// sample ranks below every troubled sample. Root cause (investigated, not
// yet fixed): the pipeline's many "structural signal absent" checks scale
// with scene count and script richness more than with authored quality, and
// the 30/sceneCount normalization doesn't correct for that — so a richer,
// longer, mid-quality script can out-penalize a barren troubled one. A
// minimal corpus edit was prototyped and closed only ~a quarter of the gap,
// so the fix is a deliberate corpus rebalance and/or a richness-aware
// normalization, not a patch. Until then, percentile CLAIMS remain honest
// (they only reference "the reference set"), but mid-band rankings should be
// read as coarse. Tracked as a follow-up work item.

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
   *  the clamp, most/all corpus samples tie at 0 and the distribution is
   *  useless for ranking. */
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
  // Raw (unclamped), NOT computeHealthScore's displayed [0, 100] value: with
  // ~1,300 accumulated rules across 14 passes, almost every realistic 8+
  // scene script — including this reference corpus — racks up enough
  // minor/major issues that the clamped score saturates at 0 for most/all
  // samples, which would make the distribution built below useless for
  // ranking (see doctor.ts's aggregateReport calibration-layer comment for
  // the full defect writeup). computeRawCraftScore is the identical formula
  // without the clamp, so a 40-issue and a 400-issue sample stay
  // distinguishable in the distribution instead of tying at the floor.
  const health = computeRawCraftScore(bySeverityTotal, analysis.sceneCount);

  const dimensions = {} as Record<DimensionKey, number>;
  for (const def of DIMENSION_PASS_MAP) {
    const passSet = new Set<PassName>(def.passes);
    const bySeverity = { critical: 0, major: 0, minor: 0 };
    for (const pr of result.passResults) {
      if (!passSet.has(pr.pass)) continue;
      for (const issue of pr.issues) bySeverity[issue.severity]++;
    }
    // Same reasoning as `health` above — raw, unclamped, for ranking symmetry.
    dimensions[def.key] = computeRawCraftScore(bySeverity, analysis.sceneCount);
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
