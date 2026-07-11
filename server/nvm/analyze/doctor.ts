// Script Doctor — half 2 of the bridge described in ./types.ts. Takes raw
// Fountain text, runs it through the analyzer (half 1) and then all 14
// revision passes in diagnose-only mode, and aggregates the result into the
// single ScriptDoctorReport the POST /api/scriptide/doctor route and
// ScriptDoctorPanel.tsx consume (half 3).
//
// This is intentionally a pure aggregation layer: every actual diagnostic
// rule lives in the 14 pass files under revision/passes/. The doctor's own
// logic is limited to (a) building a throwaway CompiledScreenplay so the
// pipeline has something to revise, (b) running it under runDiagnoseOnly()
// so no pass ever calls the LLM, and (c) rolling the 14 PassResults up into
// the report shape.
//
// ── Coverage layer ────────────────────────────────────────────────────────
// On top of that raw rollup, the doctor also derives the industry-coverage
// surface from types.ts: `verdict` (RECOMMEND/CONSIDER/PASS), `dimensions`
// (the 14 passes regrouped into 5 writer-facing scores), `strengths`
// (earned, never-padded bullets), and `plainSummary` (a few
// film-school-free sentences). All four are deterministic templates over
// data the pipeline already computed — no new heuristics over the fountain
// text itself, and no LLM, so the same report is produced byte-for-byte
// (minus analyzedAt) for the same input every time.
//
// ── Calibration layer ─────────────────────────────────────────────────────
// On top of the coverage layer, aggregateReport also ranks health and each
// dimension score against calibration/reference.ts's reference-corpus
// distribution, populating types.ts's optional healthPercentile /
// DimensionScore.percentile+percentileDescriptor fields. Calibration is an
// enhancement, not a dependency — see aggregateReport's own comment for the
// guard that keeps a calibration failure from ever crashing the doctor.

import crypto from 'node:crypto';
import type { StoryContext, PassName, RevisionIssue } from '../revision/passes/types.ts';
import type { CompiledScreenplay, SceneAnnotation } from '../screenplay/compile.ts';
import type { ScreenplaySceneRecord } from '../screenplay/memory.ts';
import type { StructureState } from '../screenplay/structure.ts';
import { analyzeStructure } from '../screenplay/structure.ts';
import { runRevisionPipeline, type RevisionResult } from '../revision/pipeline.ts';
import { runDiagnoseOnly } from '../revision/rewrite.ts';
import { analyzeFountainText } from './fountain-analyzer.ts';
import { deepReadRecords } from './deep-read.ts';
import { getReferenceDistribution } from './calibration/reference.ts';
import { percentileRank, percentileDescriptor } from './calibration/percentile.ts';
import { computeNarrativeMetrics } from './metrics.ts';
import type {
  FountainAnalysis, ScriptDoctorReport, DoctorPassSummary, SceneDiagnostics, DoctorGrade,
  CoverageVerdict, DimensionKey, DimensionScore,
} from './types.ts';

/** sha256 hex of the trimmed Fountain text — the determinism receipt on
 *  ScriptDoctorReport.contentHash (types.ts). Trimmed (not raw) so that
 *  incidental leading/trailing whitespace — which affects nothing the doctor
 *  actually analyzes (analyzeFountainText already tolerates it) — doesn't
 *  register as "a different draft" for the client's draft-over-draft history.
 *  Exported as a pure function, same rationale as computeHealthScore below:
 *  spot-checkable against node:crypto directly without running the pipeline. */
export function computeContentHash(fountain: string): string {
  return crypto.createHash('sha256').update(fountain.trim()).digest('hex');
}

// ── Doctor result cache (contentHash + storyContext, memoization) ──────────
// runScriptDoctor is a PURE function of (trimmed fountain, storyContext): it
// runs no LLM in diagnose-only mode (rewrite.ts's runDiagnoseOnly short-
// circuits every pass's rewritePass() call before any network/dynamic-import
// work happens), and none of the 14 passes read any non-deterministic input
// (no Math.random/Date.now in passes/*.ts — verified by inspection). Same
// input therefore always produces the same report (minus the analyzedAt
// timestamp), which makes a same-process cache pure memoization — free
// correctness, not an approximation.
//
// Key includes storyContext, not just contentHash: verified by inspection
// that two passes read storyContext directly in their DIAGNOSTIC (issue-
// generating) logic, not merely in the LLM rewrite prompt that diagnose-only
// mode skips — originality.ts's genre-cliché check reads storyContext.genre,
// and theme.ts's whole pass is gated on storyContext.theme. So the same
// fountain text CAN legitimately produce two different reports under two
// different storyContexts, and keying on contentHash alone would serve a
// stale/wrong cached report to the second caller. The key folds in all four
// StoryContext fields (not just theme/genre) so a future pass that starts
// reading directorStyle/characters in its diagnostics can't silently go
// stale against this cache.
//
// Key ALSO includes a 'q'/'d' mode discriminator (quick vs deep read):
// deep-read.ts's LLM sensor makes a deep report's signals genuinely different
// from a quick report's for the identical (contentHash, storyContext) pair —
// types.ts's deepRead doc comment is explicit that the two are NOT the same
// lineage and must never be compared draft-over-draft. Without the
// discriminator, whichever mode ran FIRST for a given input would silently
// serve its report to a caller asking for the other mode — a `q` result
// masquerading as `d` (missing the deepRead field entirely) or vice versa.
// The discriminator prefixes the key (rather than appending) purely so it's
// visually obvious at a glance in a debugger/log dump which lineage a given
// cache entry belongs to.
const DOCTOR_CACHE_CAPACITY = 64;
/** Plain Map, no deps: insertion order is the recency order because every
 *  hit deletes-then-re-sets its key (bumping it to "most recent"), and every
 *  miss/insert evicts the Map's iteration-order-first (least-recently-used)
 *  entry once size exceeds capacity. That's a textbook LRU without needing
 *  an external LRU package. */
const doctorCache = new Map<string, Omit<ScriptDoctorReport, 'analyzedAt'>>();

/** Manual field-order encoding (not JSON.stringify, and not a plain
 *  delimiter-joined string) so the key is both stable regardless of how a
 *  caller constructed their StoryContext object literal (JSON.stringify's
 *  output order follows the object's own key insertion order, which callers
 *  don't all guarantee identically) AND collision-free regardless of what
 *  the free-text fields contain. Each field is length-PREFIXED
 *  (`${length}:${value}`) rather than joined with a delimiter character:
 *  theme/genre/directorStyle/characters are author-controlled prose that
 *  could contain literally any character, including a chosen delimiter —
 *  e.g. theme:"AB" + genre:"" and theme:"A" + genre:"B" would concatenate to
 *  the identical string "AB" under plain delimiter-joining. Length-prefixing
 *  makes every distinct 4-tuple map to a distinct key string, full stop. */
function storyContextCacheKey(storyContext?: StoryContext): string {
  if (!storyContext) return '';
  const fields = [
    storyContext.theme ?? '',
    storyContext.genre ?? '',
    storyContext.directorStyle ?? '',
    storyContext.characters ?? '',
  ];
  return fields.map(f => `${f.length}:${f}`).join('');
}

function doctorCacheKey(contentHash: string, storyContext?: StoryContext, deepRead = false): string {
  return `${deepRead ? 'd' : 'q'}${contentHash}${storyContextCacheKey(storyContext)}`;
}

function doctorCacheGet(key: string): Omit<ScriptDoctorReport, 'analyzedAt'> | undefined {
  const hit = doctorCache.get(key);
  if (hit === undefined) return undefined;
  // Bump recency: delete + re-set moves this key to the end of the Map's
  // iteration order, which is what the eviction below treats as "newest".
  doctorCache.delete(key);
  doctorCache.set(key, hit);
  return hit;
}

function doctorCacheSet(key: string, report: Omit<ScriptDoctorReport, 'analyzedAt'>): void {
  doctorCache.delete(key);
  doctorCache.set(key, report);
  if (doctorCache.size > DOCTOR_CACHE_CAPACITY) {
    // Map iteration order is insertion order, so .keys().next() is always
    // the least-recently-used entry once every hit/set re-inserts on touch.
    const oldestKey = doctorCache.keys().next().value;
    if (oldestKey !== undefined) doctorCache.delete(oldestKey);
  }
}

/** Test-only (and ops-safety) escape hatch: drop every cached report. Needed
 *  so tests asserting cache behavior (hit/miss/eviction) never leak state
 *  between test cases, and so a future admin/debug endpoint could force a
 *  clean recompute without restarting the process. */
export function clearDoctorCache(): void {
  doctorCache.clear();
}

// ── Opportunity-based craft penalty (saturation fix) ────────────────────────
// PRIOR DESIGN (superseded — kept here as the historical record the rest of
// this comment block refers to): craftPenalty = weightedIssues * (30 /
// sceneCount). That normalizes ONLY by scene count. With the pipeline's
// ~1,300 accumulated rules across 14 passes, issue volume actually scales
// with PROSE LENGTH (word count) at least as much as with scene count — a
// script with more words per scene racks up proportionally more dialogue/
// action-level issues that the scene-count-only divisor never discounts.
// Empirically (calibration/corpus.ts's 20 richness-matched, 10-scene,
// ~300-360-word samples), that produced a *raw* craft score around -180 to
// -330 for every sample — every realistic multi-scene script saturated the
// [0, 100] clamp at the SAME value (0), so the displayed health, grade, and
// verdict carried no information at all for exactly the scripts that matter
// (see calibration/reference.ts's former "what remains genuinely unfixed"
// section, and this fix's own commit history, for the full measurement).
//
// NEW DESIGN: penalty is opportunity-based — proportional to issue DENSITY
// relative to the script's own size — with two independent, additive terms:
//
//   1. densityPenalty = DENSITY_SCALE * (weightedIssues / wordCount^WORD_COUNT_EXPONENT) ^ DENSITY_POWER
//
//      "How much worse is this script's issue rate than its size would
//      predict, amplified so real craft-quality gaps actually separate."
//      wordCount^WORD_COUNT_EXPONENT (not raw wordCount) is the word-based
//      opportunity unit: WORD_COUNT_EXPONENT = 0.7 was measured, not guessed
//      — concatenating renamed copies of the same 10-scene reference sample
//      (verifying the SAME craft quality at 2x/3x length through the real
//      pipeline) showed weightedIssues does NOT scale linearly with wordCount
//      (many rules are per-document, not per-repetition: 100.5 weighted
//      issues at 290 words became 165.5 at 590 and 230.0 at 890 —
//      issues-per-word actually FALLS as the script gets longer). Raising
//      wordCount to the 0.7 power before dividing tracks that same
//      sub-linear growth, which is what makes the formula LENGTH-INVARIANT
//      for scripts of matched quality (see the length-invariance regression
//      test in tests/core/script-doctor.test.ts). DENSITY_POWER (3.75)
//      exists because the reference corpus's own band-to-band density range
//      is narrow in relative terms (best-sample density to worst-sample
//      density is under a 2x spread) — a plain linear scaling of that
//      density either barely separates bands or has to be so large it clips
//      every sample to 0 or 100. Raising density to a power > 1 amplifies
//      the SAME underlying ordering (it's still strictly increasing in
//      density, so it changes no comparison, only the scale) into a
//      genuinely readable 0-100 spread. DENSITY_SCALE (2.5) is the
//      remaining unit-scale constant.
//
//   2. scarcityPenalty = SCARCITY_SCALE / sceneCount
//
//      A script with very few scenes hasn't had enough structural
//      opportunities (escalation, revelation, relationship-arc, payoff-
//      timing checks — most of which need several scenes to even evaluate)
//      for its measured word-density to mean anything: a 4-scene fragment
//      naturally registers a LOWER issue density than a full script of
//      identical underlying quality, simply because most of the pipeline's
//      structural rules never had enough material to fire at all. Left
//      uncorrected, density alone rewards shortness — the small-script
//      mirror image of the old defect. scarcityPenalty is a second,
//      independent, always-non-negative term (it can never subtract from
//      the density term, only add) that decays as 1/sceneCount: room for
//      the pipeline's structural checks to have had a fair chance to run.
//      It fades to near-nothing for realistic scene counts (SCARCITY_SCALE
//      / 40 = 3.5 points) but dominates for a 3-4 scene fixture
//      (SCARCITY_SCALE / 4 = 35 points), which is exactly the intended
//      effect: a tiny script can no longer read as "clean" purely because
//      it was too short to accumulate issues.
//
// All constants were tuned empirically against calibration/corpus.ts's 20
// samples to hit, simultaneously: full four-band monotonicity on both raw
// and displayed health; no band average pinned at either clamp; the
// length-invariance measurement above staying within ~10 points at 2x/3x
// length; and a 4-scene fixture landing in a plausible mid band rather than
// 90+. See calibration/reference.ts's header for the residual bias this does
// NOT fully correct (an individual very-short-but-genuinely-clean script
// still can't reach the top of the range — that's scarcityPenalty working
// as designed, not a bug).
// ── Wave (health-formula sensitivity): sub-1.0-density discrimination fix ──
// FINDING this wave fixes: three discrimination pairs (calibration/
// discrimination-pairs.ts's subtext-vs-on-the-nose, active-vs-passive-
// protagonist, dramatized-vs-told-exposition) landed EXACTLY TIED at
// displayed health 79.8, despite the bad half firing measurably more
// weighted issues on two of the three (subtext: 33 vs 36; dramatized: 35 vs
// 38.5 — see tests/core/discrimination.test.ts). Root cause, MEASURED (see
// this wave's own scratchpad, not checked into the repo): these are all
// 7-scene, ~400-470-word fixtures, which land at density = weightedIssues /
// wordCount^0.7 in the 0.47-0.76 range — a completely different regime from
// the reference corpus's 10-scene, ~290-340-word samples, which land at
// density 1.48-2.39 (every corpus sample, every band; see corpus.ts). The
// ORIGINAL density^3.75 curve was tuned entirely against that >= 1.4 regime;
// raising a sub-1.0 density to the 3.75 power crushes it near-zero (0.472^
// 3.75 = 0.067, penalty = 2.5 * 0.067 = 0.15), so a 3-issue difference in
// that regime moves the penalty by ~0.03 — a fraction of the 0.1-point
// rounding granularity computeHealthScore displays at. This is the OVERALL-
// score mirror of Wave 18-β's dimension-collapse finding (see that wave's
// comment above computeDimensionScore): same "sub-1.0 density crushed by a
// power tuned for density >= 1" defect, at the OVERALL level instead of the
// per-dimension level.
//
// Fix chosen, MEASURED not guessed (see this wave's own scratchpad — one
// script ran all 6 discrimination pairs + all 20 corpus samples + the 2x/3x
// length variants through the real pipeline to get the actual density
// distributions above; another swept a logistic-curve parameter grid against
// those exact numbers): densityPenalty is now a PIECEWISE function of
// density, split at density = 1.0 — below that, subDensityPenalty (below)
// entirely REPLACES the density^3.75 curve; at/above it, the ORIGINAL
// density^3.75 curve is byte-identical to before this wave (same constants,
// same expression) — so every reference-corpus sample and both length
// variants (all measured at density 1.48-2.39, comfortably above the split)
// see EXACTLY the same penalty as before, not just "within ~0.5pt": the
// `density >= 1` branch below is untouched code. Candidate (i) from this
// wave's brief ("piecewise... keep behavior at corpus-typical densities
// identical") is what this ships; candidates that instead lowered
// DENSITY_POWER globally, or added an issue-count-linear term active at all
// densities, were rejected because both necessarily perturb the >= 1.4
// regime the current formula (and calibration/reference.ts's live-computed,
// non-baked distribution) is already tuned against — no reason to touch a
// regime with no measured defect.
//
// subDensityPenalty is a logistic (sigmoid) curve, not a second power law:
// a bounded-scale power law continuous with the >= 1 branch (i.e. forced to
// pass through the same DENSITY_SCALE=2.5 at density=1) was tried first and
// measured to fail — ANY monotonic curve bounded by that continuity
// constraint tops out at 2.5 across the whole [0, 1) domain, and the
// discrimination pairs' density GAPS within a pair are tiny (0.013-0.024)
// relative to that domain, so even the steepest such curve produced at most
// a ~0.4-point gap (measured) — nowhere near enough separation. Dropping the
// continuity requirement (this function's own scale is independent of the
// >= 1 branch's) is what unlocks real sensitivity: a logistic centered at
// SUB_DENSITY_MIDPOINT=0.52 (the middle of the discrimination pairs' 0.47-
// 0.76 cluster) with SUB_DENSITY_STEEPNESS=50 stays near-zero below ~0.4
// density (so a genuinely clean short script, e.g. the formula spot-check
// fixture at density 0.157, is barely touched — measured penalty <0.001)
// and saturates near SUB_DENSITY_SCALE=10 above ~0.65 (so the already-
// passing escalation/setup-payoff/composite pairs, whose "bad" halves sit at
// 0.64-0.76 density, get MORE separation, not less). Measured per-pair
// densityPenalty deltas (bad minus good, direction that must be positive for
// good > bad to hold, scarcity term identical within a pair so cancels):
// subtext +1.49, dramatized +1.40, escalation +6.09, setup-payoff +4.59,
// composite +2.23 (was +0.32 before this wave) — active-vs-passive-
// protagonist measures -1.87 (WORSENS; see this wave's own report for why:
// that pair's "good" half already fires MORE weighted issues than its "bad"
// half under the current rule set — 38 vs 35 — so no density-curve change
// can fix it; it is a missing-detector gap, not a compression gap, and stays
// a discrimination.test.ts todo).
//
// Accepted, documented tradeoff: subDensityPenalty saturates near
// SUB_DENSITY_SCALE=10 for density roughly >= 0.65, while the >= 1 branch
// starts at DENSITY_SCALE=2.5 at density=1 — a discontinuity of ~7.5 points
// exists across the density=1 seam, and the whole [0.65, 1.0) sub-band scores
// a flat ~10-point penalty rather than density^3.75's continuously-rising
// curve. No corpus sample, discrimination pair, or 2x/3x length variant this
// wave measured against lands in [0.65, 1.0) — that band is short scripts
// (roughly 400-900 words at typical weighted-issue counts) sitting almost
// exactly at the boundary between "too little material for structural rules
// to fire" and "enough material to read as a normal script," which is
// inherently a low-confidence zone for this formula (see
// DIMENSION_LOW_CONFIDENCE_SCENES above for the same honesty concern at the
// per-dimension level). Noted here rather than silently smoothed over, in
// case a future wave's fixture ever lands there and the seam needs revisiting.
/** The word-density half of craftPenalty, factored out on its own (Wave
 *  18-β) so a caller can apply it WITHOUT the scarcity term below — see
 *  computeDimensionScore's comment for why the per-dimension scores need
 *  exactly that. Byte-identical arithmetic to what craftPenalty always
 *  computed for this half at density >= 1.0; see the design comment above
 *  for the density < 1.0 branch this wave added.
 *
 *  The tuned constants are declared LOCALLY (inside this function body)
 *  rather than at module scope, for the same TemporalDeadZone reason
 *  documented on craftPenalty below — this function is on the same
 *  doctor.ts <-> calibration/reference.ts import cycle (reference.ts's
 *  scoreSample reaches it transitively through computeRawCraftScore), so a
 *  module-level `const` here would carry the identical hazard. */
function densityPenalty(
  bySeverity: { critical: number; major: number; minor: number },
  wordCount: number,
): number {
  const WORD_COUNT_EXPONENT = 0.7;
  const DENSITY_POWER = 3.75;
  const DENSITY_SCALE = 2.5;
  // Sub-1.0-density branch (see design comment above) — a logistic, not a
  // power law, so its scale is independent of DENSITY_SCALE above.
  const SUB_DENSITY_SCALE = 10;
  const SUB_DENSITY_MIDPOINT = 0.52;
  const SUB_DENSITY_STEEPNESS = 50;

  const weightedIssues = 4 * bySeverity.critical + 1.5 * bySeverity.major + 0.5 * bySeverity.minor;
  const opportunityWords = Math.pow(Math.max(wordCount, 1), WORD_COUNT_EXPONENT);
  const density = weightedIssues / opportunityWords;

  if (density < 1) {
    return SUB_DENSITY_SCALE / (1 + Math.exp(-SUB_DENSITY_STEEPNESS * (density - SUB_DENSITY_MIDPOINT)));
  }
  return DENSITY_SCALE * Math.pow(density, DENSITY_POWER);
}

/** The scene-scarcity half of craftPenalty, factored out on its own (Wave
 *  18-β) for the same reason as densityPenalty above — see that function's
 *  comment. SCARCITY_SCALE stays function-local for the identical TDZ
 *  reason. */
function scarcityPenalty(sceneCount: number): number {
  const SCARCITY_SCALE = 140;
  return SCARCITY_SCALE / Math.max(sceneCount, 1);
}

/** Shared penalty expression behind both computeRawCraftScore and
 *  computeHealthScore — factored out so the two can never drift apart. See
 *  the design comment above for the full rationale; in short:
 *    penalty = DENSITY_SCALE * (weightedIssues / wordCount^WORD_COUNT_EXPONENT)^DENSITY_POWER
 *            + SCARCITY_SCALE / sceneCount
 *  where weightedIssues = 4·critical + 1.5·major + 0.5·minor (unchanged from
 *  the prior formula — only the normalization changed).
 *
 *  Now a thin sum of densityPenalty + scarcityPenalty above (Wave 18-β
 *  factoring) — the OVERALL health formula this function backs is completely
 *  unchanged by that refactor: same two terms, same constants, same sum, so
 *  every existing computeHealthScore/computeRawCraftScore caller (including
 *  calibration/reference.ts's scoreSample, which this file must not touch —
 *  see Wave 18-β's own report) sees byte-identical output before and after.
 *  Only computeDimensionScore below is new, and it deliberately calls
 *  densityPenalty alone, never this function.
 *
 *  Constants stay pushed down into densityPenalty/scarcityPenalty rather
 *  than re-declared here — same TDZ hazard as those two functions'
 *  comments explain; this function never declares a module-level const of
 *  its own either. */
function craftPenalty(
  bySeverity: { critical: number; major: number; minor: number },
  sceneCount: number,
  wordCount: number,
): number {
  return densityPenalty(bySeverity, wordCount) + scarcityPenalty(sceneCount);
}

/** 100 − craftPenalty, with NO clamping — can go deeply negative for a
 *  heavily-flagged script. This is the same statistic computeHealthScore
 *  displays, just before the [0, 100] clamp; see computeHealthScore and
 *  calibration/reference.ts for why the UNCLAMPED value is what calibration
 *  ranks on. Exported (rather than inlined) so it's independently
 *  spot-checkable, same rationale as computeHealthScore itself.
 *
 *  wordCount is the size parameter this fix added alongside sceneCount (see
 *  the opportunity-based design comment above) — both are required now
 *  because the penalty is a blend of word-based density and scene-based
 *  scarcity correction, not scene count alone. */
export function computeRawCraftScore(
  bySeverity: { critical: number; major: number; minor: number },
  sceneCount: number,
  wordCount: number,
): number {
  return 100 - craftPenalty(bySeverity, sceneCount, wordCount);
}

/** health = 100 − craftPenalty(...), clamped to [0, 100] and rounded to 1
 *  decimal. Exported as a pure function (rather than inlined) so the formula
 *  itself can be spot-checked with a known issue count without needing to
 *  run the full 14-pass pipeline.
 *
 *  Note: this is the DISPLAYED score. Ranking (healthPercentile / dimension
 *  percentile, in aggregateReport below) uses computeRawCraftScore's
 *  unclamped value instead — see that function's comment for why. */
export function computeHealthScore(
  bySeverity: { critical: number; major: number; minor: number },
  sceneCount: number,
  wordCount: number,
): number {
  const clamped = Math.max(0, Math.min(100, computeRawCraftScore(bySeverity, sceneCount, wordCount)));
  return Math.round(clamped * 10) / 10;
}

// ── Wave 18-β: per-dimension score, scarcity-free (dimension-collapse fix) ──
// FINDING this wave fixes: on a short script (measured case: 608 words, 9
// scenes), all 5 DimensionScore.score values rendered identical (84.4 x5)
// despite issue counts per dimension differing by 4-5x (35/40/14/34/8). Root
// cause, isolated by direct measurement: buildDimensions (below) fed every
// dimension's own bySeverity mix through the SAME computeHealthScore used for
// the overall score — i.e. through the FULL craftPenalty, densityPenalty +
// scarcityPenalty. scarcityPenalty (140/sceneCount) does not vary by
// dimension at all (it only reads sceneCount, which is the whole script's,
// identical across all 5 calls), and at low word counts it dominates: for a
// 9-scene/~600-word script, scarcityPenalty ≈ 140/9 ≈ 15.6, while
// densityPenalty for a REALISTIC per-dimension weightedIssues at that word
// count is well under 1 point. Health = 100 - penalty then rounds every
// dimension to the same displayed number: the identical ~15.6-point scarcity
// term swamps a sub-1-point density signal, five times over. This is exactly
// the scarcity term's own design intent working correctly for the OVERALL
// score (see craftPenalty's design comment above: "a tiny script can no
// longer read as clean purely because it was too short to accumulate
// issues") — it was simply never meant to be reapplied identically across 5
// sibling dimensions, where its only visible effect is to erase the one
// signal a dimension score exists to show: RELATIVE issue density between a
// script's own craft families.
//
// Fix chosen, MEASURED not guessed (see this wave's own scratchpad
// measurement scripts, not checked into the repo — one ran the real 20-
// sample reference corpus through the real pipeline to get actual
// per-dimension weightedIssues distributions, one tried candidate constants
// against that data plus synthetic skewed short scripts): apply
// scarcityPenalty to OVERALL health only — a dimension's DISPLAYED score
// uses a density term alone. But reusing craftPenalty's EXACT densityPenalty
// curve for that (candidate (a) taken literally) was tried first and
// measured to fail: densityPenalty's constants (DENSITY_POWER=3.75,
// DENSITY_SCALE=2.5) were tuned against the OVERALL script's total
// weightedIssues (summed across all 14 passes, typically >= wordCount^0.7,
// i.e. density >= 1). A single dimension's weightedIssues is a SHARE of that
// total (2-3 passes' worth, not 14) — typically well under wordCount^0.7,
// i.e. density < 1 — and raising a sub-1 density to the 3.75 power crushes
// it disproportionately (measured: realistic per-dimension weightedIssues in
// the 5-40 range at 250-600 word counts produced densityPenalty well under
// 1 point for EVERY dimension), collapsing all 5 dimensions toward the 100
// ceiling instead of toward one shared mid-value — the identical bug in the
// other direction, not a fix.
//
// So this wave ships a SEPARATE, independently-tuned dimension density curve
// (dimensionDensityPenalty below: DENSITY_POWER_DIM=1.5, DENSITY_SCALE_DIM=
// 100, same WORD_COUNT_EXPONENT=0.7 opportunity unit) rather than reusing
// craftPenalty's curve outright. Verified against the real 20-sample
// corpus: every one of the 5 dimensions shows non-degenerate spread (no
// dimension pins to a single clamped value across the corpus) at this
// curve, and the bug's own repro shape (9 scenes, ~600 words, per-dimension
// weighted issues roughly 35/40/14/34/8) separates to roughly 75/70/94/76/97
// — a ~27-point spread that orders exactly by issue density, instead of one
// repeated number.
//
// Known, accepted residual: per-dimension band-average ordering (strong vs.
// troubled) is not strictly monotonic for every one of the 5 dimensions in
// the CURRENT reference corpus (e.g. the 'structure-pacing' family happens
// to carry slightly MORE weighted issues, on average, in the 'troubled' band
// than in 'weak'/'competent' — a property of which craft family each band's
// samples were designed to be weak in, not a formula artifact). This is
// PRE-EXISTING: it was already true of the OLD per-dimension formula too
// (scarcityPenalty was a constant additive term for same-sceneCount corpus
// samples, so it never could have changed relative per-dimension ordering
// either), and no test in this file's own test suite (nor calibration.test.ts)
// asserts per-dimension band monotonicity — only OVERALL health/healthPercentile
// band ordering is asserted, and that is completely untouched by this wave
// (see below). Not in this wave's scope to fix; noted for the record rather
// than silently glossed over.
//
// What this deliberately does NOT touch: computeHealthScore/
// computeRawCraftScore/craftPenalty (the OVERALL formula) are byte-identical
// before and after this wave — see craftPenalty's own comment. Nor does it
// touch DimensionBuild.rawScore (buildDimensions below): that field feeds
// ONLY the calibration percentile ranking against calibration/reference.ts's
// distribution, and reference.ts's own scoreSample computes its per-dimension
// reference statistic via computeRawCraftScore too (scarcity included, same
// as before) — reference.ts is outside this wave's file-ownership scope, so
// rawScore keeps calling computeRawCraftScore unchanged, ranking on the exact
// same statistic basis the reference distribution was built from. Only the
// DISPLAYED dimension `score` (types.ts's DimensionScore.score, the number a
// writer actually reads) changes formula.
//
// Honesty guard: below DIMENSION_LOW_CONFIDENCE_SCENES scenes, a dimension's
// own issue family has barely had room to differentiate at all (most of a
// dimension's passes need several scenes' worth of material before their
// rules can meaningfully fire) — rounding to a whole point rather than a
// tenth avoids implying a precision the signal doesn't support. types.ts is
// read-only for this wave (per its own file-ownership constraint) and has no
// existing low-confidence marker field to populate instead; a
// `DimensionScore.lowConfidence?: boolean` field would be the natural next
// step if the report contract is ever reopened — noted here rather than
// added.
const DIMENSION_LOW_CONFIDENCE_SCENES = 3;

/** Dimension-scoped density penalty — deliberately NOT craftPenalty's
 *  densityPenalty (see the design comment above for why reusing that curve
 *  measured out to a ceiling-collapse instead of a fix). Same word-based
 *  opportunity unit (WORD_COUNT_EXPONENT=0.7, unchanged from the overall
 *  formula — the sub-linear issues-per-word falloff that motivated it there
 *  applies equally to a dimension's own issue family), but its own power/
 *  scale, tuned against the real corpus's per-dimension weightedIssues range
 *  (see this wave's own report for the measurement). Constants stay
 *  function-local for the same TDZ reason as densityPenalty/scarcityPenalty
 *  above — this function sits on the identical doctor.ts <-> reference.ts
 *  import cycle transitively (reachable from computeDimensionRawScore,
 *  called by buildDimensions, called from aggregateReport). */
function dimensionDensityPenalty(
  bySeverity: { critical: number; major: number; minor: number },
  wordCount: number,
): number {
  const WORD_COUNT_EXPONENT = 0.7;
  const DENSITY_POWER_DIM = 1.5;
  const DENSITY_SCALE_DIM = 100;

  const weightedIssues = 4 * bySeverity.critical + 1.5 * bySeverity.major + 0.5 * bySeverity.minor;
  const opportunityWords = Math.pow(Math.max(wordCount, 1), WORD_COUNT_EXPONENT);
  const density = weightedIssues / opportunityWords;
  return DENSITY_SCALE_DIM * Math.pow(density, DENSITY_POWER_DIM);
}

/** Unclamped dimension craft statistic: 100 − dimensionDensityPenalty(...),
 *  no scarcity term. Exported for the same spot-check reason as
 *  computeRawCraftScore — independently checkable against a known issue mix
 *  without running the pipeline. Not used for calibration ranking (that's
 *  DimensionBuild.rawScore, computeRawCraftScore, unchanged — see the design
 *  comment above); this is purely the basis for the DISPLAYED per-dimension
 *  score below. */
export function computeDimensionRawScore(
  bySeverity: { critical: number; major: number; minor: number },
  wordCount: number,
): number {
  return 100 - dimensionDensityPenalty(bySeverity, wordCount);
}

/** DISPLAYED per-dimension score: computeDimensionRawScore, clamped to
 *  [0, 100], honesty-guard-rounded (see DIMENSION_LOW_CONFIDENCE_SCENES
 *  above). sceneCount is used ONLY for that rounding-precision decision here
 *  — never fed into a scarcity term, which is the whole point of this wave's
 *  fix; see the design comment above computeDimensionRawScore. */
export function computeDimensionScore(
  bySeverity: { critical: number; major: number; minor: number },
  wordCount: number,
  sceneCount: number,
): number {
  const clamped = Math.max(0, Math.min(100, computeDimensionRawScore(bySeverity, wordCount)));
  return sceneCount < DIMENSION_LOW_CONFIDENCE_SCENES
    ? Math.round(clamped)
    : Math.round(clamped * 10) / 10;
}

/** health >= 90 excellent, >= 75 strong, >= 55 solid, >= 35 uneven, else troubled. */
export function gradeForHealth(health: number): DoctorGrade {
  if (health >= 90) return 'excellent';
  if (health >= 75) return 'strong';
  if (health >= 55) return 'solid';
  if (health >= 35) return 'uneven';
  return 'troubled';
}

/** Industry coverage verdict (types.ts's CoverageVerdict contract). Encoded
 *  as its own pure function — same reasoning as computeHealthScore above —
 *  so the three boundaries (the 85/8 RECOMMEND floor, the 60 PASS ceiling,
 *  and the short-script cap that keeps a thin-but-healthy draft at CONSIDER
 *  rather than RECOMMEND) can be spot-checked without running the pipeline. */
export function verdictFor(health: number, sceneCount: number): CoverageVerdict {
  if (health >= 85 && sceneCount >= 8) return 'RECOMMEND';
  if (health < 60) return 'PASS';
  return 'CONSIDER';
}

/** Deterministic page/runtime estimate from the analyzed Fountain text.
 *  Pure arithmetic over the text the doctor already holds — no layout engine,
 *  no new heuristics: non-blank rendered lines at the classic ~55 lines per
 *  screenplay page, runtime at the 1-page-≈-1-minute convention. Constants
 *  stay function-local per this file's standing TDZ note (doctor↔reference
 *  circular import). Floors at 1 page for any non-empty text so a one-scene
 *  excerpt never reports "0 pages"; returns null for empty/whitespace input
 *  (degenerate reports carry no estimate rather than a fabricated one). */
export function estimatePages(fountain: string): ScriptDoctorReport['pageEstimate'] | null {
  const LINES_PER_PAGE = 55; // classic screenplay layout density
  const lines = fountain.split(/\r?\n/).filter(l => l.trim().length > 0).length;
  if (lines === 0) return null;
  const pages = Math.max(1, Math.round(lines / LINES_PER_PAGE));
  return { pages, runtimeMinutes: pages, basis: 'lines' };
}

/** One honest sentence when the input is thinner than the RECOMMEND verdict
 *  floor (verdictFor's sceneCount >= 8) — the report is excerpt feedback,
 *  not feature coverage, and saying so beats false precision. Returns
 *  undefined at or above the floor: never padded onto full-length input. */
export function excerptNoteFor(sceneCount: number): string | undefined {
  if (sceneCount >= 8) return undefined;
  return `This reads like an excerpt (${sceneCount} scene${sceneCount === 1 ? '' : 's'} analyzed): ` +
    'scores and verdicts are computed the same way as for a full script, but with this ' +
    'little material they should be read as feedback on the pages, not coverage of a feature.';
}

// ── Dimension rollup ──────────────────────────────────────────────────────────
// The 14 passes, regrouped into the 5 writer-facing dimensions fixed by the
// DimensionKey contract in types.ts. Each pass belongs to exactly one
// dimension: the union of the five `passes` arrays below is the pipeline's
// full 14-PassName set with no overlaps and no gaps (checked by the
// script-doctor tests). The mapping is a fixed editorial decision, not
// something to infer from data, so it's a plain table rather than a
// computed grouping.
const DIMENSION_DEFS: ReadonlyArray<{ key: DimensionKey; label: string; passes: PassName[] }> = [
  { key: 'structure-pacing', label: 'Structure & Pacing', passes: ['structure', 'pacing', 'rhythm'] },
  { key: 'character', label: 'Character', passes: ['character-arc', 'intention', 'relationship-arc'] },
  { key: 'dialogue-voice', label: 'Dialogue & Voice', passes: ['dialogue', 'voice'] },
  { key: 'plot-logic', label: 'Plot Logic & Payoff', passes: ['causality', 'belief', 'payoff', 'conflict'] },
  { key: 'theme-originality', label: 'Theme & Originality', passes: ['theme', 'originality'] },
];

/** Turn a rule constant (e.g. "PAYOFF_TOO_QUICK") into plain lowercase words.
 *  Deliberately generic rather than a per-rule phrase dictionary: the 14
 *  pass files gain 3 new rules every wave (CLAUDE.md's standing task), so
 *  any hand-curated rule->phrase table would silently go stale the moment a
 *  new rule shipped. Lowercasing + de-underscoring is enough to guarantee no
 *  ALL_CAPS rule token ever reaches a writer-facing sentence, which is the
 *  actual contract requirement — distinctness-by-construction rather than
 *  distinctness-by-maintenance. */
function humanizeRuleName(rule: string): string {
  return rule.toLowerCase().replace(/_/g, ' ');
}

interface DimensionIssueMix {
  bySeverity: { critical: number; major: number; minor: number };
  dominantSeverity: RevisionIssue['severity'];
  dominantCount: number;
  /** Plain-language rendering of whichever rule fired most often among this
   *  dimension's issues — the "concrete top rule area" the summary names. */
  topRuleArea: string;
}

/** Reduce a dimension's issues to "what's the story here": which severity
 *  dominates and which single rule recurs most. Ties in rule frequency
 *  resolve to whichever rule is encountered first in pipeline order,
 *  keeping the result deterministic without an arbitrary secondary sort
 *  key. Returns null for a clean dimension so the caller branches on "no
 *  issues" explicitly rather than this function inventing a placeholder. */
function analyzeDimensionIssues(issues: RevisionIssue[]): DimensionIssueMix | null {
  if (issues.length === 0) return null;

  const bySeverity = { critical: 0, major: 0, minor: 0 };
  const ruleCounts = new Map<string, number>();
  for (const issue of issues) {
    bySeverity[issue.severity]++;
    ruleCounts.set(issue.rule, (ruleCounts.get(issue.rule) ?? 0) + 1);
  }

  // Dominant severity: whichever bucket has the most issues; a tie prefers
  // the more severe bucket so a script that's equally critical- and
  // major-heavy is never undersold as merely "major".
  const dominantSeverity: RevisionIssue['severity'] =
    bySeverity.critical > 0 && bySeverity.critical >= bySeverity.major && bySeverity.critical >= bySeverity.minor
      ? 'critical'
      : bySeverity.major > 0 && bySeverity.major >= bySeverity.minor
      ? 'major'
      : 'minor';

  let topRule = issues[0].rule;
  let topCount = 0;
  for (const issue of issues) {
    const count = ruleCounts.get(issue.rule)!;
    if (count > topCount) { topCount = count; topRule = issue.rule; }
  }

  return {
    bySeverity,
    dominantSeverity,
    dominantCount: bySeverity[dominantSeverity],
    topRuleArea: humanizeRuleName(topRule),
  };
}

/** One sentence per dimension, templated by health band (reusing
 *  gradeForHealth so a dimension's vocabulary tracks the same excellent/
 *  strong/solid/uneven/troubled scale as the overall grade) and dominant
 *  severity, naming the concrete top rule area whenever issues exist. */
function buildDimensionSummary(
  label: string, sceneCount: number, score: number, mix: DimensionIssueMix | null,
): string {
  if (!mix) {
    return `${label} reads cleanly — no issues found across ${sceneCount} scene(s).`;
  }

  const { dominantSeverity, dominantCount, topRuleArea } = mix;
  switch (gradeForHealth(score)) {
    case 'excellent':
    case 'strong':
      return `${label} is in good shape — a handful of ${dominantSeverity} notes, mostly around ${topRuleArea}.`;
    case 'solid':
      return `${dominantCount} ${dominantSeverity} problem(s) here, mostly around ${topRuleArea}.`;
    case 'uneven':
      return `${dominantCount} ${dominantSeverity} problem(s) here, mostly around ${topRuleArea} — worth a focused revision pass.`;
    case 'troubled':
      return `${label} needs real work — ${dominantCount} ${dominantSeverity} problem(s), centered on ${topRuleArea}.`;
  }
}

interface DimensionBuild {
  score: DimensionScore;
  mix: DimensionIssueMix | null;
  /** computeRawCraftScore (the FULL formula, scarcity term included) for
   *  this dimension's own issue mix — unclamped, used ONLY for calibration
   *  ranking against calibration/reference.ts's distribution (aggregateReport
   *  below). Deliberately NOT computeDimensionRawScore (the scarcity-free
   *  statistic the displayed `score` below is now built from, Wave 18-β):
   *  reference.ts's own scoreSample builds its per-dimension reference
   *  numbers via computeRawCraftScore too (unchanged — reference.ts is
   *  outside this wave's file-ownership scope), so ranking must stay on that
   *  same statistic basis or a report's dimension percentile would compare
   *  apples (scarcity-free) to the reference set's oranges (scarcity-
   *  included). See computeRawCraftScore's comment for why ranking needs the
   *  unclamped statistic in the first place. */
  rawScore: number;
}

/** Roll the 14 per-pass summaries up into the 5 contract dimensions. Kept
 *  separate from aggregateReport so the pass->dimension mapping is a single,
 *  independently testable seam. Returns the internal `mix` alongside each
 *  public DimensionScore so buildPlainSummary can name a top rule area for
 *  the weakest dimension without recomputing it from scratch.
 *
 *  wordCount is the WHOLE script's word count, shared across all 5
 *  dimensions — there's no per-dimension word count to measure (a dimension
 *  is a regrouping of issues by PASS, not a distinct slice of the prose), so
 *  each dimension's own density penalty is scaled against the same
 *  script-wide word count as the overall health score, exactly as sceneCount
 *  already was before this fix.
 *
 *  The DISPLAYED `score` (Wave 18-β) is computeDimensionScore — density only,
 *  no scarcity term — so 5 dimensions built from the same sceneCount no
 *  longer collapse to one identical number at low scene/word counts; see
 *  computeDimensionScore's own design comment above for the full finding and
 *  rationale. `rawScore` stays on the OLD (scarcity-included)
 *  computeRawCraftScore statistic — see DimensionBuild's own comment for why
 *  that field specifically must not change. */
function buildDimensions(passes: DoctorPassSummary[], sceneCount: number, wordCount: number): DimensionBuild[] {
  return DIMENSION_DEFS.map(def => {
    const passSet = new Set<PassName>(def.passes);
    const issues = passes.filter(p => passSet.has(p.pass)).flatMap(p => p.issues);
    const bySeverity = issues.reduce(
      (acc, i) => { acc[i.severity]++; return acc; },
      { critical: 0, major: 0, minor: 0 },
    );
    const score = computeDimensionScore(bySeverity, wordCount, sceneCount);
    const rawScore = computeRawCraftScore(bySeverity, sceneCount, wordCount);
    const mix = analyzeDimensionIssues(issues);
    return {
      mix,
      rawScore,
      score: {
        key: def.key,
        label: def.label,
        passes: def.passes,
        score,
        issueCount: issues.length,
        summary: buildDimensionSummary(def.label, sceneCount, score, mix),
      },
    };
  });
}

/** All-5 zero-score dimensions for the degenerate zero-scene report. Each
 *  still names its own label so a reader can tell nothing was silently
 *  dropped — there was simply nothing to score. */
function emptyDimensions(): DimensionScore[] {
  return DIMENSION_DEFS.map(def => ({
    key: def.key,
    label: def.label,
    passes: def.passes,
    score: 0,
    issueCount: 0,
    summary: `${def.label} could not be scored — this submission has no scenes to analyze.`,
  }));
}

// ── Strengths ─────────────────────────────────────────────────────────────────

export interface StrengthsInput {
  structure: StructureState;
  /** Whether any scene seeded a clue (records[].seededClueIds.length > 0
   *  somewhere) — needed alongside structure.openClues === 0 because a
   *  script that never planted anything hasn't earned a payoff-completeness
   *  claim, it just has nothing to pay off. */
  anyClueSeeded: boolean;
  sceneCount: number;
  bySeverity: { critical: number; major: number; minor: number };
  dimensions: DimensionScore[];
  /** Run 20 (excellence sprint): raw analyzed Fountain text for the
   *  acceleration detector's per-scene word counts (records don't carry
   *  scene length). Optional — absent means that detector silently
   *  no-fires, so every pre-Run-20 caller/fixture stays byte-identical. */
  fountain?: string;
  /** Wave 1183 (Program v2, Type 2 — excellence): the per-scene records the
   *  three new detectors below read (clockRaised, relationshipShifts,
   *  emotionalShift). Optional — defaults to [] inside buildStrengths — so
   *  every fixture/test written before this wave still typechecks and still
   *  produces byte-identical output (an empty/absent records array can never
   *  satisfy any of the three new guards' minimum-population conditions).
   *  Matches the file's existing optional-field precedent (memory.ts's
   *  relationshipShifts/questionsRaised: "treat absence as []/0"). Wave 1187
   *  reuses this same array for three more channels already present on
   *  every record — purpose, suspenseDelta, dramaticTurn — no schema change
   *  needed. */
  records?: ScreenplaySceneRecord[];
}

// ── Wave 1183 additions (Program v2, Type 2 — excellence) ──────────────────
// Placement rationale (per the wave's own charter): a revision PASS's whole
// contract (revision/passes/types.ts) is to emit RevisionIssues — defects to
// fix. These three checks produce the opposite artifact, an earned STRENGTH
// string, and their only consumer is buildStrengths' own `strengths: string[]`
// output — there is no RevisionIssue-shaped wrapper to produce, so a pass file
// would have to manufacture one just to throw it away. buildStrengths is
// already this file's fixture-testable seam for exactly this kind of check
// (a pure function over already-computed report data, independent of which of
// the ~1300 accumulated pass rules fired) — Program v2 Type 2 extends that
// seam rather than inventing a second one.
//
// Never-padded discipline (WAVE_QUALITY_GUARANTEE.md's binding Type 2 clause,
// and CLAUDE.md's "an excellence rule that fires on mediocre input is a
// FAILING rule"): all three guards below were measured against
// calibration/corpus.ts's 20 controlled-richness-designed samples
// before being accepted. Each guard's own comment cites the exact scene-level
// evidence that separates it from the 'competent' band — which the corpus is
// deliberately designed to be competent-but-unremarkable, never broken — so a
// guard that would fire on 'competent' input was rejected at design time, not
// discovered later by a failing test. Two candidate axes from the wave's own
// candidate list were evaluated and REJECTED for lack of corpus support
// (documented at the wave's own report, not restated here to avoid this
// comment going stale): payoff-latency distance (the corpus's own payoff
// detection never actually fires on ANY of the 20 samples, strong included —
// a script-doctor.ts-level detector built on it would never fire on real
// input) and question-answer latency (the aggregate per-scene counts
// currently exposed by fountain-analyzer.ts cannot distinguish a genuinely
// "held" question from an accidental one — measured directly, it fires
// equally on a 'troubled' corpus sample as on a 'strong' one, which fails the
// never-padded bar outright).

/** Minimum scenes for any Wave 1183 excellence check below: each one needs a
 *  genuine two-position comparison (front half vs back half, or two scenes
 *  separated by a real gap) which a fragment under 6 scenes hasn't got room
 *  to demonstrate honestly. One scene higher than the existing no-fatal-flaws
 *  guard's sceneCount >= 5 floor, because these checks need TWO separated
 *  positions to compare, not merely "enough scenes to have accumulated one
 *  fact." */
const EXCELLENCE_MIN_SCENES = 6;

/** Guard: deadline/clock pressure is raised in BOTH halves of the document,
 *  not planted once and abandoned. Distinct from the pre-existing
 *  `escalating` guard above: that one reads suspenseDelta's AVERAGE trend
 *  (tension intensity is rising), this reads clockRaised's discrete PRESENCE
 *  by position (the stakes themselves are still being invoked) — a script
 *  can hold a flat suspense average while still re-raising its clock twice,
 *  or escalate in danger-lexicon language without ever mentioning the
 *  deadline again after Act One; fountain-analyzer.ts treats these as
 *  independent lexicons for exactly this reason. Verified against
 *  calibration/corpus.ts: 2 of 5 'strong' samples (Nine Minutes, Sunlight
 *  Clause) re-raise the clock in both halves; 0 of the other 15 samples
 *  (across 'competent', 'weak', and 'troubled') do — every non-strong sample
 *  states its deadline once, or not at all, and never returns to it, which is
 *  precisely the corpus's designed flaw for those bands ("the clock is
 *  stated once and never followed up on"). */
function buildStakesContinuityStrength(
  records: ScreenplaySceneRecord[], sceneCount: number,
): string | null {
  if (sceneCount < EXCELLENCE_MIN_SCENES) return null;

  const midN = Math.floor(sceneCount / 2);
  const firstHalfClock = records.slice(0, midN).filter(r => r.clockRaised);
  const secondHalfClock = records.slice(midN).filter(r => r.clockRaised);
  if (firstHalfClock.length === 0 || secondHalfClock.length === 0) return null;

  const firstScene = firstHalfClock[0].sceneIdx;
  const lastScene = secondHalfClock[secondHalfClock.length - 1].sceneIdx;
  return (
    `The clock isn't set once and forgotten — deadline pressure resurfaces in both halves of the draft ` +
    `(first raised in Scene ${firstScene}, still live as late as Scene ${lastScene}), keeping the stakes genuinely alive throughout.`
  );
}

/** Minimum scene gap between a relationship rupture and its later repair for
 *  the repair to read as an earned arc rather than a same-beat flip-flop —
 *  one scene stricter than detectClueLifecycle's own payoff gap (>= 2) since
 *  a relationship repair is a bigger dramatic claim than a prop re-mention. */
const RELATIONSHIP_ARC_MIN_GAP = 3;
/** Minimum |amount| a shift must carry to count as a genuine rupture/repair.
 *  Restates fountain-analyzer.ts's own RELATIONSHIP_SHIFT_THRESHOLD (2)
 *  defensively rather than trusting every caller's `records` to already
 *  respect it — StrengthsInput.records is a public-ish seam (any future
 *  caller could hand-build fixtures), so the guard checks its own input
 *  rather than relying on an upstream invariant it can't see. */
const RELATIONSHIP_ARC_MIN_MAGNITUDE = 2;

interface RelationshipMovement { sceneIdx: number; amount: number }

/** Guard: a specific character pair whose relationship genuinely moves in
 *  BOTH directions — a rupture (negative shift) followed, at least
 *  RELATIONSHIP_ARC_MIN_GAP scenes later, by a repair (positive shift) for
 *  the SAME pair. Distinct from every pre-existing guard (none of the four
 *  above ever read relationshipShifts) and from buildStakesContinuityStrength
 *  above (a different channel entirely: relationshipShifts, not
 *  clockRaised). Verified against calibration/corpus.ts: exactly 1 of the 20
 *  samples (The Long Game, 'strong') shows a rupture-then-repair for the same
 *  pair — CASS|ODELL ruptures at Scene 3 (amount -2) and repairs at Scene 9
 *  (amount +3), a 6-scene gap. Zero of the 5 'competent' samples register a
 *  single POSITIVE relationship shift anywhere in the document — their Act 3
 *  beat is, per the corpus's own design note, "a thin, shorter
 *  acknowledgment" that never clears fountain-analyzer.ts's
 *  RELATIONSHIP_SHIFT_THRESHOLD — so this guard cannot mistake a
 *  merely-present relationship arc for a genuinely repaired one; there is
 *  nothing in the 'competent' band for it to false-fire on. */
function buildRelationshipDynamismStrength(
  records: ScreenplaySceneRecord[], sceneCount: number,
): string | null {
  if (sceneCount < EXCELLENCE_MIN_SCENES) return null;

  const byPair = new Map<string, RelationshipMovement[]>();
  for (const r of records) {
    for (const shift of r.relationshipShifts ?? []) {
      if (Math.abs(shift.amount) < RELATIONSHIP_ARC_MIN_MAGNITUDE) continue;
      const movement = { sceneIdx: r.sceneIdx, amount: shift.amount };
      const arr = byPair.get(shift.pairKey);
      if (arr) arr.push(movement);
      else byPair.set(shift.pairKey, [movement]);
    }
  }

  // Strongest qualifying pair wins (largest combined swing); ties resolve to
  // whichever pair was encountered first in scene order — same determinism
  // convention as analyzeDimensionIssues' rule-frequency tie-break above.
  let best: { pairKey: string; rupture: RelationshipMovement; repair: RelationshipMovement } | null = null;
  let bestSwing = -Infinity;
  for (const [pairKey, movements] of byPair) {
    movements.sort((a, b) => a.sceneIdx - b.sceneIdx);
    const ruptures = movements.filter(m => m.amount < 0);
    const repairs = movements.filter(m => m.amount > 0);
    for (const rupture of ruptures) {
      const repair = repairs.find(r => r.sceneIdx - rupture.sceneIdx >= RELATIONSHIP_ARC_MIN_GAP);
      if (!repair) continue;
      const swing = Math.abs(rupture.amount) + repair.amount;
      if (swing > bestSwing) {
        bestSwing = swing;
        best = { pairKey, rupture, repair };
      }
      break; // earliest qualifying rupture for this pair is enough evidence
    }
  }

  if (!best) return null;
  const [charA, charB] = best.pairKey.split('|');
  return (
    `The ${charA}/${charB} relationship is a living thread, not a flat one — it ruptures in Scene ${best.rupture.sceneIdx} ` +
    `(trust swings ${best.rupture.amount}) and genuinely repairs ${best.repair.sceneIdx - best.rupture.sceneIdx} scenes later ` +
    `in Scene ${best.repair.sceneIdx} (trust swings +${best.repair.amount}), not left as a one-note thread.`
  );
}

/** Guard: the draft is willing to swing NEGATIVE at least once and POSITIVE
 *  at least once — not merely upbeat throughout — and lands deliberately on a
 *  positive final scene rather than trailing off neutral. Distinct from
 *  buildStakesContinuityStrength and buildRelationshipDynamismStrength above
 *  (a third, independent channel: emotionalShift, not clockRaised or
 *  relationshipShifts) and from the pre-existing `escalating` guard
 *  (suspense TREND, not emotional valence — fountain-analyzer.ts's own header
 *  is explicit these are different axes: "a scene can be tense without being
 *  mysterious," and equally, without being emotionally negative). Requiring
 *  BOTH directions present — not just a positive ending — is what keeps this
 *  from firing on a script that is simply upbeat throughout and never earns
 *  the swing: verified against calibration/corpus.ts's 'troubled' band, where
 *  one sample (The Grift) ends on a lexically positive final scene (repeated
 *  "I feel so happy" dialogue) but never registers a single negative-valence
 *  scene anywhere in the document — this guard correctly does not fire for
 *  it. Exactly 1 of the 20 corpus samples (The Long Game, 'strong') clears
 *  all three conditions; 0 of the 5 'competent' samples do (each has either
 *  no positive-valence scene anywhere, or no negative-valence scene anywhere). */
function buildEmotionalRangeStrength(
  records: ScreenplaySceneRecord[], sceneCount: number,
): string | null {
  if (sceneCount < EXCELLENCE_MIN_SCENES) return null;
  if (records.length === 0) return null;

  const negativeScenes = records.filter(r => r.emotionalShift === 'negative');
  const positiveScenes = records.filter(r => r.emotionalShift === 'positive');
  const finalRecord = records[records.length - 1];
  if (negativeScenes.length === 0 || positiveScenes.length === 0) return null;
  if (finalRecord.emotionalShift !== 'positive') return null;

  return (
    `This draft earns its ending rather than coasting to it — real emotional difficulty surfaces ` +
    `(Scene ${negativeScenes[0].sceneIdx} turns negative) before the story lands deliberately positive at the close (Scene ${finalRecord.sceneIdx}).`
  );
}

// ── Wave 1187 additions (Program v2, Type 2 — excellence) ──────────────────
// Three more never-padded buildStrengths guards, each over a signal channel
// this file has never read before (`purpose`, zone-quartile `suspenseDelta`,
// and distributional `dramaticTurn`) — distinct from the four originals
// above and from all three Wave 1183 guards (clockRaised, relationshipShifts,
// emotionalShift). Same authoring discipline as Wave 1183: every guard below
// was measured against calibration/corpus.ts's 20 controlled-richness samples
// through the real analyzer (analyzeFountainText) before being accepted, and
// three candidate axes from the wave's own candidate list were evaluated and
// REJECTED for lack of corpus support:
//
// REJECTED — question discipline (raises AND resolves with nonzero
// cross-scene latency), re-measured with the discriminating guard the
// charter asked for (a minimum raised-count + resolution-rate window +
// latency floor) after Wave 1183 rejected a weaker version: across all 20
// corpus samples only two ever carry a nonzero cross-scene resolution
// (questionsResolved - questionsResolvedSameScene > 0) at all — Sunlight
// Clause ('strong') and The Grift ('troubled') — and they are tied on every
// axis a guard could threshold (both raise exactly 1 question, resolve
// exactly 1, resolutionRate 1.0). Worse, The Grift's raise-to-resolve gap
// (Scene 5 to Scene 9, a 4-scene latency) is LONGER than Sunlight Clause's
// (Scene 7 to Scene 9, a 2-scene latency) — so a latency FLOOR does not
// merely fail to discriminate, it actively inverts (a stricter floor keeps
// the troubled sample and drops the strong one). No raised-count/
// resolution-rate/latency threshold separates strong from troubled at this
// corpus's population (n=2 nonzero samples total). REJECTED again,
// definitively — confirmed unsupportable, not merely under-guarded.
//
// REJECTED — power contest presence (a scene where powerFlipped is true):
// measured directly, powerFlipped is false on all 20 corpus samples, strong
// band included — exactly Wave 1186's own finding when it shipped the
// signal. Fixture-only axes are explicitly disallowed by the charter
// (never-padded requires corpus-real fire in the strong band); there is
// nothing here to build a rule on.
//
// REJECTED — curiosity seeding (positive curiosityDelta in the opening zone
// sustained by later positive scenes): measured directly, ZERO of the 20
// corpus samples carry a positive-curiosity opening-quarter scene followed
// by a later positive-curiosity scene. Every sample has at most one nonzero-
// curiosity scene in the whole document EXCEPT Zero Day ('competent'), which
// has three (Scenes 2, 3, 6) — Zero Day would be the ONLY sample to
// false-fire under any loosened version of this axis (e.g. "any positive
// scene in the first half, any later one"). The axis never fires where it
// should (strong) and would fire exactly where it must not (competent)
// under the only relaxation available — REJECTED.
//
// The three SHIPPED below were each measured to fire on at least one
// 'strong' sample and zero of the other 19 non-strong samples across EVERY
// band (not merely 'competent') — stronger evidence than the never-padded
// bar requires.

/** Minimum distinct ScenePurpose values (of the 9 possible) for genuine
 *  narrative-function variety, and the ceiling share any single purpose may
 *  hold without the "variety" claim just describing one dominant purpose
 *  with a couple of garnish scenes. Distinct from every pre-existing guard
 *  and from all three Wave 1183 guards — a fourth, independent channel
 *  (`purpose`) buildStrengths has never read before — and from
 *  buildSuspenseShapingStrength/buildDramaticTurnDensityStrength below (a
 *  DISTRIBUTION-of-VALUES mode, how many distinct categories appear and how
 *  evenly, rather than either of those two's zone/half TIMING mode). Verified
 *  against calibration/corpus.ts: exactly 3 of 5 'strong' samples (Nine
 *  Minutes: 7 distinct purposes, 20% dominance; Second Wind: 6 distinct, 50%
 *  dominance; Sunlight Clause: 6 distinct, 40% dominance) clear both
 *  thresholds; 0 of the other 15 samples across 'competent', 'weak', and
 *  'troubled' reach 6 distinct purposes at all (the closest non-strong
 *  showing is Thanksgiving, Maybe's 5) — every non-strong sample draws its
 *  scene purposes from a narrower registry, precisely the corpus's designed
 *  competent-but-unremarkable flaw of leaning on 2-3 functions
 *  (`complicate`/`character_moment` dominate the weak and troubled bands). */
const SCENE_PURPOSE_VARIETY_MIN_DISTINCT = 6;
/** See SCENE_PURPOSE_VARIETY_MIN_DISTINCT above for the corpus evidence this
 *  ceiling was measured against. */
const SCENE_PURPOSE_VARIETY_MAX_DOMINANCE = 0.5;

/** Guard: the draft moves through a genuinely varied set of scene purposes
 *  rather than repeating the same 2-3 narrative functions — SCENE_PURPOSE_
 *  VARIETY_MIN_DISTINCT-or-more distinct ScenePurpose values represented,
 *  with no single one exceeding SCENE_PURPOSE_VARIETY_MAX_DOMINANCE share of
 *  all scenes (so "one dominant purpose plus a sprinkling of one-off
 *  purposes" cannot masquerade as variety). See the constant comment above
 *  for corpus evidence and distinctness rationale. */
function buildScenePurposeVarietyStrength(
  records: ScreenplaySceneRecord[], sceneCount: number,
): string | null {
  if (sceneCount < EXCELLENCE_MIN_SCENES) return null;
  if (records.length === 0) return null;

  // First-encountered-wins tie-break for both the distinct-value ordering
  // (readable, scene-order-stable output) and the dominant-purpose pick —
  // same determinism convention as buildRelationshipDynamismStrength's pair
  // selection above.
  const order: string[] = [];
  const counts = new Map<string, number>();
  for (const r of records) {
    if (!counts.has(r.purpose)) order.push(r.purpose);
    counts.set(r.purpose, (counts.get(r.purpose) ?? 0) + 1);
  }
  const distinct = counts.size;
  if (distinct < SCENE_PURPOSE_VARIETY_MIN_DISTINCT) return null;

  let topPurpose = order[0];
  let topCount = counts.get(topPurpose)!;
  for (const p of order) {
    const c = counts.get(p)!;
    if (c > topCount) { topPurpose = p; topCount = c; }
  }
  const dominance = topCount / records.length;
  if (dominance > SCENE_PURPOSE_VARIETY_MAX_DOMINANCE) return null;

  const humanized = order.map(p => p.replace(/_/g, ' '));
  return (
    `This draft doesn't lean on one narrative gear — it moves through ${distinct} distinct scene functions ` +
    `(${humanized.join(', ')}) without any single one taking over (the most common, "${topPurpose.replace(/_/g, ' ')}", ` +
    `is only ${Math.round(dominance * 100)}% of scenes).`
  );
}

/** Minimum scenes for the suspense-shaping guard specifically — stricter
 *  than EXCELLENCE_MIN_SCENES because this guard partitions the document
 *  into FOUR quarters (not two halves like the guards above and below), and a
 *  quarter under real population can't carry a meaningful average; one scene
 *  below the corpus's own smallest sample size (9) so no corpus sample is
 *  excluded from measurement by construction. */
const SUSPENSE_SHAPING_MIN_SCENES = 8;
const SUSPENSE_SHAPING_ZONES = 4;

/** Guard: suspense doesn't merely trend upward on average (that's the
 *  pre-existing `structure.escalating` guard above, a two-HALF average
 *  trend) — it builds all the way to a genuine PEAK scene in the closing
 *  quarter that outright tops every earlier quarter's own average, off a
 *  real (nonzero) opening-quarter baseline. Distinct from `structure.
 *  escalating` on both analytical mode (peak vs. average) and position
 *  granularity (quarters vs. halves): a script can escalate on a first-half/
 *  second-half average while its actual closing peak is unremarkable, or
 *  vice versa — this reads the sharper, more specific claim directly, per
 *  WAVE_QUALITY_GUARANTEE.md's own "no stronger sibling skipped" clause.
 *  Distinct from every Wave 1183 guard (a different channel — suspenseDelta
 *  zone-peak, not clockRaised/relationshipShifts/emotionalShift) and from
 *  buildScenePurposeVarietyStrength above (a distribution-of-VALUES check,
 *  not a positional peak-vs-average one). Verified against
 *  calibration/corpus.ts: exactly 1 of 5 'strong' samples (Second Wind)
 *  clears it — suspense opens at a real baseline (Scene 0, suspense delta 1;
 *  quarter-one average 0.67), goes flat through quarters two and three
 *  (average 0 each), then peaks at Scene 8 (suspense delta 1), topping every
 *  earlier quarter's average. 0 of the other 19 samples (every other band,
 *  not merely 'competent') clear it — each either never establishes a
 *  nonzero opening baseline at all, or its closing quarter never exceeds an
 *  earlier quarter's average. */
function buildSuspenseShapingStrength(
  records: ScreenplaySceneRecord[], sceneCount: number,
): string | null {
  if (sceneCount < SUSPENSE_SHAPING_MIN_SCENES) return null;

  const zones: ScreenplaySceneRecord[][] = Array.from({ length: SUSPENSE_SHAPING_ZONES }, () => []);
  records.forEach((r, i) => {
    const zone = Math.min(SUSPENSE_SHAPING_ZONES - 1, Math.floor((i / sceneCount) * SUSPENSE_SHAPING_ZONES));
    zones[zone].push(r);
  });
  // Every quarter must have real population — an empty quarter's "average"
  // is a meaningless 0 that could trivially satisfy either side of the
  // comparison below.
  if (zones.some(z => z.length === 0)) return null;

  const zoneAvg = zones.map(z => z.reduce((s, r) => s + r.suspenseDelta, 0) / z.length);
  const earlyBaseline = zoneAvg[0];
  if (earlyBaseline === 0) return null;

  const finalZone = zones[SUSPENSE_SHAPING_ZONES - 1];
  const peakRecord = finalZone.reduce((best, r) => (r.suspenseDelta > best.suspenseDelta ? r : best), finalZone[0]);
  if (peakRecord.suspenseDelta <= 0) return null;

  const earlierAvgs = zoneAvg.slice(0, SUSPENSE_SHAPING_ZONES - 1);
  if (!earlierAvgs.every(avg => peakRecord.suspenseDelta > avg)) return null;

  const baselineRecord = zones[0].find(r => r.suspenseDelta !== 0) ?? zones[0][0];
  return (
    `Suspense doesn't stay flat and hope for the best — it builds to a genuine peak late in the draft ` +
    `(Scene ${peakRecord.sceneIdx}, suspense delta ${peakRecord.suspenseDelta}) that tops every earlier quarter's average tension, ` +
    `off a real baseline established as early as Scene ${baselineRecord.sceneIdx}.`
  );
}

/** Minimum dramatic turns required in EACH half for the density claim below
 *  — one scene's worth of "the draft names a turn" per half would already be
 *  covered in spirit by buildStakesContinuityStrength's own >=1-per-half
 *  pattern (a different channel), so this guard requires DENSITY (>=2 per
 *  half) to earn a distinct, stronger claim on this noisier, free-text
 *  channel. */
const DRAMATIC_TURN_DENSITY_MIN_PER_HALF = 2;

/** Guard: a named dramatic turn (dramaticTurn non-empty) lands at least
 *  DRAMATIC_TURN_DENSITY_MIN_PER_HALF times in BOTH the front and back half
 *  of the document — the story keeps generating real narrative turns
 *  throughout, not just once near the top and once at the very end. Distinct
 *  from buildStakesContinuityStrength (Wave 1183: clockRaised, a boolean
 *  presence channel) despite the shared both-halves POSITION — this reads
 *  `dramaticTurn`, a free-text per-scene channel buildStrengths has never
 *  consumed, and requires DENSITY (>=2, not merely >=1) per half. Distinct
 *  from buildScenePurposeVarietyStrength and buildSuspenseShapingStrength
 *  above (a third, independent channel, and a plain half-split position
 *  rather than either of those two's value-distribution or quarter-zone
 *  mode). Verified against calibration/corpus.ts: exactly 1 of 5 'strong'
 *  samples (Low Tide) clears >=2 turns in both halves (front: Scenes 2, 3;
 *  back: Scenes 8, 9). 0 of the other 19 samples (every band) reach 2 turns
 *  in even one half, let alone both — Thanksgiving, Maybe ('competent')
 *  comes closest with 2 turns in its front half but only 1 in its back half,
 *  which correctly does not clear this guard. */
function buildDramaticTurnDensityStrength(
  records: ScreenplaySceneRecord[], sceneCount: number,
): string | null {
  if (sceneCount < EXCELLENCE_MIN_SCENES) return null;

  const midN = Math.floor(sceneCount / 2);
  const firstHalfTurns = records.slice(0, midN).filter(r => r.dramaticTurn.length > 0);
  const secondHalfTurns = records.slice(midN).filter(r => r.dramaticTurn.length > 0);
  if (firstHalfTurns.length < DRAMATIC_TURN_DENSITY_MIN_PER_HALF) return null;
  if (secondHalfTurns.length < DRAMATIC_TURN_DENSITY_MIN_PER_HALF) return null;

  const frontScenes = firstHalfTurns.map(r => r.sceneIdx).join(', ');
  const backScenes = secondHalfTurns.map(r => r.sceneIdx).join(', ');
  return (
    `This draft keeps generating real turns, not just one per act — dramatic turning points land repeatedly in ` +
    `both the front half (Scenes ${frontScenes}) and the back half (Scenes ${backScenes}) of the document.`
  );
}

/**
 * Earned, never-padded "what's working" bullets. Exported as a pure function
 * over already-computed report data (rather than folded inline into
 * aggregateReport) so each guard is fixture-testable directly — build a
 * StructureState/DimensionScore[] that should or shouldn't trigger a given
 * bullet, with no dependency on which of the hundreds of accumulated pass
 * rules happen to fire for a given fountain string.
 */
// ── Run 20 (excellence sprint) detectors ─────────────────────────────────────
// Measured against the 69-script real corpus AND the 20-sample calibration
// corpus BEFORE thresholds were committed (standing measure-before-threshold
// practice). Fire rates at introduction: acceleration 17/69, cold-open 13/69,
// climax-placement 7/69 real produced features; 0/20 calibration (the corpus
// samples sit under the 12/16-scene floors — structurally exempt, so the
// never-padded no-fire evidence for these three lives in their fixture tests,
// not corpus silence). Selectivity is intentional: an excellence claim earned
// by 10-25% of PRODUCED features is a real distinction, not participation
// praise. Two candidates were measured and honestly DROPPED this wave: voice
// distinctness (dialogue-cue parsing on the PDF import path only yields 3
// qualifying speakers on 12/69 scripts — the channel is extraction-noise-
// bound) and payoff discipline (the content-word clue channel seeds 300-700
// "clues" on features with ~20% payoff ratio everywhere — noise-dominated,
// a detector on it would reward noise). Their measurements are retained here
// so the next excellence wave doesn't re-run the same dead ends.

const RUN20_MIN_SCENES = 12;
const RUN20_ACCEL_MIN_SCENES = 16;

/** Cold-open hook: the first scene already moves (suspense/curiosity rises or
 *  a real dramatic turn) AND real stakes (a clock) appear inside the first
 *  quarter. Distinct from buildStakesContinuityStrength (clock PERSISTENCE
 *  across the whole script) and structure.escalating (half-vs-half trend):
 *  this reads only the opening — a script can hook cold and still fail both
 *  of those, and vice versa. */
function buildColdOpenStrength(
  records: ScreenplaySceneRecord[], sceneCount: number,
): string | null {
  if (sceneCount < RUN20_MIN_SCENES || records.length === 0) return null;
  const first = records[0];
  const hooked = (first.suspenseDelta ?? 0) > 0 || (first.curiosityDelta ?? 0) > 0 ||
    (first.dramaticTurn != null && first.dramaticTurn !== 'nothing' && first.dramaticTurn !== '');
  if (!hooked) return null;
  const q1 = records.slice(0, Math.max(3, Math.floor(sceneCount / 4)));
  if (!q1.some(r => r.clockRaised || (r.clockDelta ?? 0) > 0)) return null;
  return 'The opening earns attention immediately — the very first scene already turns, and real stakes are on the table before the first quarter is out.';
}

/** Climax placement: the single most intense scene (suspense + clock + turn)
 *  lands in the final 30%, and the final quarter carries more total intensity
 *  than the first. Distinct from buildSuspenseShapingStrength (quartile-zone
 *  suspense AVERAGES) — this is about where the PEAK sits and whether the
 *  ending outweighs the opening, which zone averages can miss entirely. */
function buildClimaxPlacementStrength(
  records: ScreenplaySceneRecord[], sceneCount: number,
): string | null {
  if (sceneCount < RUN20_MIN_SCENES || records.length === 0) return null;
  const intensity = records.map(r =>
    Math.max(0, r.suspenseDelta ?? 0) + Math.max(0, r.clockDelta ?? 0) +
    ((r.dramaticTurn != null && r.dramaticTurn !== 'nothing' && r.dramaticTurn !== '') ? 1 : 0));
  const max = Math.max(...intensity);
  if (max <= 0) return null;
  if (intensity.indexOf(max) < Math.floor(sceneCount * 0.7)) return null;
  const sumQ4 = intensity.slice(Math.floor(sceneCount * 0.75)).reduce((a, b) => a + b, 0);
  const sumQ1 = intensity.slice(0, Math.floor(sceneCount * 0.25)).reduce((a, b) => a + b, 0);
  if (sumQ4 <= sumQ1) return null;
  return 'The climax is where it belongs — the story\'s single most intense scene lands in the final stretch, and the last quarter outweighs the first instead of the draft peaking early.';
}

/** Acceleration: scene lengths compress toward the end (final-quarter mean
 *  word count <= 75% of first-quarter mean) — the cutting gets faster as the
 *  stakes rise, a hallmark of controlled feature pacing. Needs the raw
 *  fountain (records carry no scene length); silently no-fires without it. */
function buildAccelerationStrength(
  fountain: string | undefined, sceneCount: number,
): string | null {
  if (!fountain || sceneCount < RUN20_ACCEL_MIN_SCENES) return null;
  const scenes = fountain.split(/^(?=INT\.|EXT\.)/mi).filter(s => /^(INT\.|EXT\.)/i.test(s));
  if (scenes.length < RUN20_ACCEL_MIN_SCENES) return null;
  const w = scenes.map(s => s.split(/\s+/).length);
  const q = Math.floor(w.length / 4);
  if (q === 0) return null;
  const first = w.slice(0, q).reduce((a, b) => a + b, 0) / q;
  const last = w.slice(-q).reduce((a, b) => a + b, 0) / q;
  if (first <= 0 || last > 0.75 * first) return null;
  return 'The cutting accelerates as the story closes — scenes in the final quarter run measurably tighter than the opening\'s, pacing that rises with the stakes instead of flattening.';
}

export function buildStrengths(input: StrengthsInput): string[] {
  const { structure, anyClueSeeded, sceneCount, bySeverity, dimensions, records = [] } = input;
  const strengths: string[] = [];

  // Guard: a genuinely zero-issue dimension is real, checked evidence —
  // name it rather than folding it into a vague "looks good".
  for (const dim of dimensions) {
    if (dim.issueCount === 0) {
      strengths.push(`Nothing to fix in ${dim.label} — clean across all ${sceneCount} scene(s).`);
    }
  }

  // Guard: StructureState.escalating is itself a measured fact (second-half
  // suspense average > first-half average), not a guess — safe to restate
  // as an earned strength rather than generic praise.
  if (structure.escalating) {
    strengths.push(
      'Tension genuinely builds as the story goes — the back half reads more intensely than the front half, not less.',
    );
  }

  // Guard: every clue this draft planted got paid off. Requires a clue to
  // have been seeded at all — a script with nothing planted trivially has
  // openClues === 0 but hasn't earned a "pays off" claim, it just never set
  // anything up in the first place.
  if (structure.openClues === 0 && anyClueSeeded) {
    strengths.push('Every clue planted in this draft gets paid off — nothing is left dangling by the end.');
  }

  // Guard: zero critical issues, but only once there's been enough script
  // for "no fatal flaws" to mean anything — a fragment of a couple scenes
  // hasn't earned the claim, there's barely been room for one.
  if (bySeverity.critical === 0 && sceneCount >= 5) {
    strengths.push(`No fatal flaws surfaced across ${sceneCount} scenes — nothing here would sink the draft outright.`);
  }

  // Wave 1183 additions (Program v2, Type 2 — excellence): three new,
  // never-padded guards over signals buildStrengths didn't previously read
  // at all (clockRaised, relationshipShifts, emotionalShift). See each
  // helper's own comment above for its guard conditions, corpus evidence, and
  // distinctness rationale versus the four guards above and each other.
  const stakesContinuity = buildStakesContinuityStrength(records, sceneCount);
  if (stakesContinuity) strengths.push(stakesContinuity);

  const relationshipDynamism = buildRelationshipDynamismStrength(records, sceneCount);
  if (relationshipDynamism) strengths.push(relationshipDynamism);

  const emotionalRange = buildEmotionalRangeStrength(records, sceneCount);
  if (emotionalRange) strengths.push(emotionalRange);

  // Wave 1187 additions (Program v2, Type 2 — excellence): three more
  // never-padded guards over signal channels buildStrengths didn't
  // previously read (purpose, zone-quartile suspenseDelta, distributional
  // dramaticTurn). See each helper's own comment above for its guard
  // conditions, corpus evidence, and distinctness rationale versus the four
  // original guards and Wave 1183's three.
  const scenePurposeVariety = buildScenePurposeVarietyStrength(records, sceneCount);
  if (scenePurposeVariety) strengths.push(scenePurposeVariety);

  const suspenseShaping = buildSuspenseShapingStrength(records, sceneCount);
  if (suspenseShaping) strengths.push(suspenseShaping);

  // Run 20 (excellence sprint) additions — see the block comment above the
  // three helpers for measurement evidence and the two candidates dropped.
  const coldOpen = buildColdOpenStrength(records, sceneCount);
  if (coldOpen) strengths.push(coldOpen);

  const climaxPlacement = buildClimaxPlacementStrength(records, sceneCount);
  if (climaxPlacement) strengths.push(climaxPlacement);

  const acceleration = buildAccelerationStrength(input.fountain, sceneCount);
  if (acceleration) strengths.push(acceleration);

  const dramaticTurnDensity = buildDramaticTurnDensityStrength(records, sceneCount);
  if (dramaticTurnDensity) strengths.push(dramaticTurnDensity);

  return strengths;
}

// ── Plain-language summary ──────────────────────────────────────────────────

const VERDICT_DESCRIPTORS: Record<CoverageVerdict, string> = {
  RECOMMEND: 'a strong draft ready to move forward',
  CONSIDER: 'a promising draft that needs focused work',
  PASS: 'a draft with fundamental problems to solve first',
};

/** 2-4 template sentences: verdict + health, the strongest dimension, the
 *  weakest dimension (replaced with a "no weak spot" line when every
 *  dimension is clean), and — only when there's an actual top priority — a
 *  plain paraphrase of where to start. Every clause reads from
 *  already-computed data; nothing here re-derives or guesses, so identical
 *  input always produces an identical summary. */
function buildPlainSummary(
  verdict: CoverageVerdict,
  health: number,
  builds: DimensionBuild[],
  topPriorities: Array<RevisionIssue & { pass: PassName }>,
): string {
  const sentences: string[] = [
    `${verdict} — ${VERDICT_DESCRIPTORS[verdict]}; overall craft score ${health}/100.`,
  ];

  // Strongest/weakest picked with strict comparisons so the first dimension
  // in contract (DimensionKey) order wins any tie — deterministic, no
  // hidden reshuffle.
  let strongest = builds[0];
  let weakest = builds[0];
  for (const b of builds) {
    if (b.score.score > strongest.score.score) strongest = b;
    if (b.score.score < weakest.score.score) weakest = b;
  }

  sentences.push(
    strongest.score.issueCount === 0
      ? `${strongest.score.label} is the strongest part of the draft, with nothing flagged.`
      : `${strongest.score.label} is the strongest part of the draft, scoring ${strongest.score.score}/100.`,
  );

  // weakest.mix === null only when every dimension cleared — a dimension can
  // only be the minimum-scoring one AND issue-free if nothing anywhere
  // scored below 100.
  sentences.push(
    weakest.mix === null
      ? 'No dimension underperforms — every area holds up well.'
      : `${weakest.score.label} is the weakest area, at ${weakest.score.score}/100 — most of the trouble is around ${weakest.mix.topRuleArea}.`,
  );

  if (topPriorities.length > 0) {
    const topDescription = topPriorities[0].description.replace(/[.]+$/, '');
    sentences.push(`Start with the highest-priority fix: ${topDescription}.`);
  }

  return sentences.join(' ');
}

function buildStructureSummaryLine(analysis: FountainAnalysis): string {
  const { structure, sceneCount } = analysis;
  return (
    `${sceneCount} scene(s) — ${structure.actPosition.toUpperCase()} ` +
    `(${structure.completionPercent}% complete), ${structure.escalating ? 'escalating' : 'flat'} tension, ` +
    `${structure.openClues} open clue(s), ${structure.revelationCount} revelation(s).`
  );
}

/** Attribute an issue to a scene by parsing "Scene N" (case-insensitive) out
 *  of its `location`. Issues whose location doesn't name a scene (e.g. a
 *  cross-scene range like "Scenes 3–5", or a story-wide issue) count only
 *  toward the report totals, per the SceneDiagnostics contract. */
const SCENE_LOCATION_RE = /Scene (\d+)/i;

function buildSceneHeatmap(passes: DoctorPassSummary[], analysis: FountainAnalysis): SceneDiagnostics[] {
  // Seed one entry per scene so the heatmap is a complete strip: a zero-issue
  // scene is a data point (a healthy cell), not a gap — the panel renders
  // sceneHeatmap positionally, so omitting clean scenes would misalign it.
  const bySceneIdx = new Map<number, SceneDiagnostics>();
  for (const record of analysis.records) {
    bySceneIdx.set(record.sceneIdx, {
      sceneIdx: record.sceneIdx, slug: record.slug,
      issueCount: 0, critical: 0, major: 0, minor: 0,
    });
  }
  for (const p of passes) {
    for (const issue of p.issues) {
      const m = SCENE_LOCATION_RE.exec(issue.location);
      if (!m) continue;
      const sceneIdx = parseInt(m[1], 10);
      // A location naming a scene outside the analyzed range (a pass-invented
      // index) still counts toward report totals but can't be pinned to a cell.
      const entry = bySceneIdx.get(sceneIdx);
      if (!entry) continue;
      entry.issueCount++;
      if (issue.severity === 'critical') entry.critical++;
      else if (issue.severity === 'major') entry.major++;
      else entry.minor++;
    }
  }
  return [...bySceneIdx.values()].sort((a, b) => a.sceneIdx - b.sceneIdx);
}

const SEVERITY_RANK: Record<RevisionIssue['severity'], number> = { critical: 0, major: 1, minor: 2 };

/** Highest-priority issues across all passes: critical first, then major,
 *  then minor; ties broken by pipeline pass order. At most 10. */
function buildTopPriorities(passes: DoctorPassSummary[]): Array<RevisionIssue & { pass: PassName }> {
  const tagged: Array<RevisionIssue & { pass: PassName; passOrder: number }> = [];
  passes.forEach((p, passOrder) => {
    for (const issue of p.issues) tagged.push({ ...issue, pass: p.pass, passOrder });
  });
  tagged.sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity] || a.passOrder - b.passOrder);
  return tagged.slice(0, 10).map(({ passOrder: _passOrder, ...rest }) => rest);
}

// Exported (rather than module-private) solely so
// tests/core/pipeline-parallel.test.ts can drive it directly from a
// forced-sequential RevisionResult to build an independent reference report
// for the parallel-path identity proof — see
// runScriptDoctorSequentialForTest below. No other caller needs it:
// runScriptDoctor already wires it into the normal request path.
export function aggregateReport(result: RevisionResult, analysis: FountainAnalysis, fountain: string): ScriptDoctorReport {
  const passes: DoctorPassSummary[] = result.passResults.map(pr => ({
    pass: pr.pass,
    issues: pr.issues,
    critical: pr.issues.filter(i => i.severity === 'critical').length,
    major: pr.issues.filter(i => i.severity === 'major').length,
    minor: pr.issues.filter(i => i.severity === 'minor').length,
  }));

  const totalIssues = passes.reduce((s, p) => s + p.issues.length, 0);
  const bySeverity = passes.reduce(
    (acc, p) => ({ critical: acc.critical + p.critical, major: acc.major + p.major, minor: acc.minor + p.minor }),
    { critical: 0, major: 0, minor: 0 },
  );

  const baseHealth = computeHealthScore(bySeverity, analysis.sceneCount, analysis.wordCount);

  // ── Structural-integrity deduction (health-formula wave, 2026-07-10) ─────
  // MEASURED MOTIVATION (degradation harness, tests/core/real-script-corpus
  // .test.ts): craftPenalty reads only severity COUNTS as a density against
  // script size, so at feature-scale issue volume (~600 issues) even a dozen
  // majors plus a critical from ONE rule family moves displayed health by
  // ~0.1 — scrambled features scored within 1.2 points of their intact
  // originals (AUC 0.677) even after SCENE_CONTINUITY_COLLAPSE landed and
  // fired correctly. Document-scale structural collapse is a different KIND
  // of finding from accumulated line-level craft defects: it is one verdict
  // about the whole scene ORDER, and averaging it into a density erases it
  // by construction. So it gets a direct, bounded, named deduction here —
  // NOT a craftPenalty change: the density formula, its calibration-band
  // monotonicity, and its length-invariance regression are untouched
  // (structural rules carry feature-scale floors, so the calibration corpus
  // and every fixture are structurally exempt and score byte-identically).
  // Bounded at 20 points (see AUC-conversion wave below for how that bound
  // and the per-instance weight were chosen): enough to separate a scrambled
  // feature from its intact original by well more than the whole pre-wave
  // gap, small enough that an otherwise-excellent draft with a genuinely
  // mosaic structure lands in CONSIDER territory rather than being executed
  // on one axis.
  //
  // AUC-conversion wave (2026-07-10, follow-on to PR #193's two-tier gate).
  // MEASURED MOTIVATION: PR #193 widened SCENE_CONTINUITY_COLLAPSE's firing
  // condition (tight CI<0.05 unconditional OR wide CI<0.30-with-locRun<0.015)
  // and it now catches 29/42 floor-eligible degraded scripts with zero intact
  // false positives -- but the deduction those catches fed into stayed at the
  // OLD per-instance weight (0.5) and cap (12), so wider DETECTION never
  // converted into wider SEPARATION: AUC-12 (real-script-corpus.test.ts's
  // original subset) measured 0.684, but AUC-71 (the full 71-script corpus
  // this wave added instrumentation for) measured only 0.603 -- barely above
  // a coin flip once averaged over the whole manifest.
  //
  // FIRST CANDIDATE TRIED AND REJECTED, measured not guessed: raising the cap
  // only when SCENE_CONTINUITY_PERVASIVE fires (the critical rollup issue).
  // Direct instrumentation of all 71 degraded scripts (seeded shuffle-drop,
  // same recipe as the test harness) showed PERVASIVE never fires at this
  // degradation intensity -- SCENE_CONTINUITY_COLLAPSE instance counts across
  // the corpus range 0-12 (median 0, max 12, exactly structure.ts's own
  // SCC_DETAIL_CAP=12 detail-issue cap), and PERVASIVE's own gate requires
  // MORE unlisted breaks beyond that cap, which no script in the corpus
  // reaches. A PERVASIVE-gated-only change is therefore a documented
  // zero-effect no-op against this corpus -- verified directly (identical
  // health, digit for digit, before/after) rather than left as a
  // plausible-sounding but unmeasured guess.
  //
  // FIX SHIPPED, measured against a full grid of (weight, cap) pairs by
  // reconstructing baseHealth (= old health + old deduction) for all 71
  // degraded scripts and recomputing AUC-12/24/71 for each candidate without
  // rerunning the pipeline: weight 0.5->2.0 (4x) and cap 12->20 (on the
  // instance-count-driven path, not the still-dormant PERVASIVE rollup)
  // moved AUC-71 from 0.603 to 0.652 (AUC-12 0.684->0.712, AUC-24
  // 0.622->0.672) -- see real-script-corpus.test.ts's own header comment for
  // the exact shipped numbers. Weight was not pushed further (weight 4/cap 24
  // measured AUC-71 0.669, a smaller marginal gain per unit of aggressiveness)
  // to keep the deduction's per-instance meaning legible: 2.0 points per
  // corroborated double-break cut, capped at 20 total, stays in the same
  // order of magnitude as the original 0.5/12 design rather than becoming a
  // different formula in disguise. PERVASIVE keeps its own (now-matching)
  // rollup=14/cap=20 terms for the day a degradation recipe or a real
  // submission DOES clear SCC_DETAIL_CAP -- dormant today, but zero cost to
  // leave wired in, since it structurally cannot fire on any intact script
  // (verified: zero PERVASIVE fires anywhere across the 71 intact-corpus
  // healths, so this is provably a no-op on every currently-passing manifest
  // entry either way).
  const STRUCTURAL_ROLLUP_DEDUCTION = 14;
  const STRUCTURAL_ROLLUP_DEDUCTION_CAP = 20;
  const STRUCTURAL_INSTANCE_DEDUCTION = 2.0; // per detailed break, capped below
  const STRUCTURAL_INSTANCE_DEDUCTION_CAP = 20;
  const sccInstances = passes.reduce(
    (n, p) => n + p.issues.filter(i => i.rule === 'SCENE_CONTINUITY_COLLAPSE').length, 0);
  const sccPervasive = passes.some(p => p.issues.some(i => i.rule === 'SCENE_CONTINUITY_PERVASIVE'));
  const sccDeduction = sccPervasive
    ? Math.min(STRUCTURAL_ROLLUP_DEDUCTION_CAP, STRUCTURAL_ROLLUP_DEDUCTION + sccInstances * STRUCTURAL_INSTANCE_DEDUCTION)
    : Math.min(STRUCTURAL_INSTANCE_DEDUCTION_CAP, sccInstances * STRUCTURAL_INSTANCE_DEDUCTION);

  // ── Global-arc deduction (global-arc wave, 2026-07-10) ───────────────────
  // GLOBAL_ARC_INCOHERENCE (structure.ts) is a single document-level finding
  // (fires 0 or 1 time -- there is no per-instance count to scale against,
  // unlike SCENE_CONTINUITY_COLLAPSE's per-cut emission), so its deduction is
  // a flat, bounded amount rather than an instance-weighted one. Measured
  // zero-intact-FP by construction (see the rule's own header at its firing
  // site) across all 67 floor-eligible real-corpus scripts, so this is a
  // zero-effect no-op on every currently-passing manifest entry. Combined
  // with the SCC deduction under one outer cap (20 -> 24) so a script that
  // trips BOTH a local-adjacency collapse and a global-arc inversion can be
  // separated further than either alone, while staying in the same order of
  // magnitude as the pre-existing structural-deduction design.
  const GLOBAL_ARC_DEDUCTION = 6;
  const STRUCTURAL_TOTAL_DEDUCTION_CAP = 24;
  const globalArcFires = passes.some(p => p.issues.some(i => i.rule === 'GLOBAL_ARC_INCOHERENCE'));
  const structuralDeduction = Math.min(
    STRUCTURAL_TOTAL_DEDUCTION_CAP,
    sccDeduction + (globalArcFires ? GLOBAL_ARC_DEDUCTION : 0),
  );
  const health = Math.max(0, Math.round((baseHealth - structuralDeduction) * 10) / 10);
  const topPriorities = buildTopPriorities(passes);

  // ── Coverage layer ──────────────────────────────────────────────────────
  const dimensionBuilds = buildDimensions(passes, analysis.sceneCount, analysis.wordCount);
  const dimensions = dimensionBuilds.map(d => d.score);
  // Verdict cap (AUC-conversion wave, 2026-07-10): a script whose scene ORDER
  // has collapsed pervasively (SCENE_CONTINUITY_PERVASIVE -- the rollup that
  // only fires once BOTH gate tiers above have corroborated document-scale
  // collapse, never a single anomalous cut) cannot honestly be a RECOMMEND
  // regardless of how healthy its density-based score reads: a structurally
  // scrambled feature is not a feature worth shooting, whatever its
  // line-level craft. Downgrading RECOMMEND->CONSIDER here is deliberately
  // narrower than a health-score change -- it touches only the one verdict
  // tier where "ship it" is the actual claim being made, leaves CONSIDER and
  // PASS untouched (a scrambled script that already scored below RECOMMEND
  // needs no further downgrade), and cannot fire on intact scripts (verified:
  // PERVASIVE never fires on any of the 71 real-corpus intact scripts, so
  // this is a zero-effect no-op for every currently-passing manifest entry).
  const verdict = sccPervasive && verdictFor(health, analysis.sceneCount) === 'RECOMMEND'
    ? 'CONSIDER'
    : verdictFor(health, analysis.sceneCount);
  const anyClueSeeded = analysis.records.some(r => r.seededClueIds.length > 0);
  const strengths = buildStrengths({
    structure: analysis.structure,
    anyClueSeeded,
    sceneCount: analysis.sceneCount,
    bySeverity,
    dimensions,
    records: analysis.records,
    fountain,
  });
  let plainSummary = buildPlainSummary(verdict, health, dimensionBuilds, topPriorities);
  // DoS guard (S1-b) notice: analysis.sceneCount is already the
  // ceiling-truncated count (every formula above — health, dimensions,
  // verdict, strengths — is computed against it consistently), so surface
  // the gap honestly rather than silently reporting on a fraction of the
  // submission with no indication anything was cut.
  if (analysis.truncatedForAnalysis && analysis.totalSceneCount !== undefined) {
    plainSummary =
      `NOTE: this script has ${analysis.totalSceneCount} scenes, which exceeds the analyzer's ` +
      `${analysis.sceneCount}-scene limit — only the first ${analysis.sceneCount} scenes were analyzed. ` +
      plainSummary;
  }

  // ── Narrative metrics layer (I1-c) ──────────────────────────────────────
  // Deterministic per-scene/whole-script narrative-shape metrics from
  // analyze/metrics.ts (blueprint §27), computed from the SAME analyzer
  // records every other layer above already reads (analysis.records —
  // post-deep-read-merge when deepReadMode ran, since aggregateReport is
  // always called with mergedAnalysis, never the pre-merge original — see
  // runScriptDoctor). No emotionalArc is passed: the doctor has no session
  // arc configuration to read (StoryContext carries theme/genre/
  // directorStyle/characters only, no emotional_arc field — see
  // revision/passes/types.ts), so every pacingFit value below is honestly
  // `null` throughout, exactly as metrics.ts's computePacingFit documents
  // for the no-arc case, never a fabricated neutral score. computeNarrativeMetrics
  // never throws (guarded to safe all-zero/neutral defaults even for an
  // empty records array — see its own header), so this needs no defensive
  // try/catch the way the calibration layer below does.
  //
  // Cache note: this adds NO new cache-key dimension. metrics is a pure,
  // deterministic function of analysis.records alone (no LLM, no
  // Math.random/Date.now — metrics.ts's own header), and records are fully
  // determined by (trimmed fountain, quick/deep mode) — both already folded
  // into doctorCacheKey (contentHash + the 'q'/'d' discriminator).
  // storyContext never influences records (it only gates which pass issues
  // fire), so the existing key remains exactly sufficient for the metrics
  // field too.
  const metrics = computeNarrativeMetrics(analysis.records);

  // ── Calibration layer ─────────────────────────────────────────────────────
  // Rank this report's health and each dimension's score against
  // calibration/reference.ts's reference-corpus distribution, populating
  // types.ts's optional healthPercentile / DimensionScore.percentile fields.
  //
  // Why this still ranks on the UNCLAMPED craft statistic, not the displayed
  // 0-100 score, even after the opportunity-based rebalance above: the
  // clamp in computeHealthScore is a floor/ceiling on what gets DISPLAYED,
  // not a floor/ceiling on what the underlying craftPenalty formula can
  // compute — an exceptionally issue-dense script can still drive the raw
  // (pre-clamp) score arbitrarily negative even though the new formula no
  // longer does this for ordinary realistic scripts (see craftPenalty's own
  // comment above for the fix). Two scripts that both clamp to displayed
  // health 0 would, ranked on THAT number, tie at the same percentile —
  // computeRawCraftScore (doctor.ts) is the identical formula WITHOUT the
  // clamp, so they still separate on the raw statistic and order correctly
  // against the reference corpus. The displayed health/grade/verdict/
  // dimension scores are untouched by this — only the statistic fed into
  // percentileRank changes, per dimension too (the same clamp-vs-raw
  // distinction applies to any dimension, not just the overall score).
  //
  // Calibration is an enhancement, not a dependency: getReferenceDistribution
  // already guards its own build (reference.ts falls back to an empty
  // distribution rather than throwing), but this pass gets a defensive
  // try/catch on top anyway, plus an explicit empty-array check per
  // distribution, so no future change to the calibration module can ever
  // turn a Script Doctor request into a 500 — worst case, a report simply
  // comes back without percentile fields, which every consumer already
  // treats as optional.
  let healthPercentile: number | undefined;
  try {
    const distribution = getReferenceDistribution();
    const rawHealth = computeRawCraftScore(bySeverity, analysis.sceneCount, analysis.wordCount);
    if (distribution.health.length > 0) {
      healthPercentile = percentileRank(rawHealth, distribution.health);
    }
    for (const build of dimensionBuilds) {
      const referenceScores = distribution.dimensions[build.score.key];
      if (referenceScores && referenceScores.length > 0) {
        build.score.percentile = percentileRank(build.rawScore, referenceScores);
        build.score.percentileDescriptor = percentileDescriptor(build.score.percentile, build.score.label);
      }
    }
  } catch {
    // Leave healthPercentile / dim.percentile / dim.percentileDescriptor
    // undefined for this report — the raw health/dimension scores above are
    // computed independently of calibration and remain fully valid on their own.
  }

  return {
    health,
    grade: gradeForHealth(health),
    totalIssues,
    bySeverity,
    passes,
    sceneHeatmap: buildSceneHeatmap(passes, analysis),
    topPriorities,
    structure: analysis.structure,
    characters: analysis.characters,
    sceneCount: analysis.sceneCount,
    wordCount: analysis.wordCount,
    analyzedAt: Date.now(),
    verdict,
    dimensions,
    strengths,
    plainSummary,
    contentHash: computeContentHash(fountain),
    healthPercentile,
    metrics,
    pageEstimate: estimatePages(fountain) ?? undefined,
    excerptNote: excerptNoteFor(analysis.sceneCount),
    ...(analysis.truncatedForAnalysis
      ? { truncatedForAnalysis: true, totalSceneCount: analysis.totalSceneCount }
      : {}),
  };
}

/** Rebuild SceneAnnotation[] from records — the same field-for-field mapping
 *  compile.ts's compileScreenplay and fountain-analyzer.ts's
 *  analyzeFountainText both inline (neither exports it, and this module is
 *  constrained to touch only itself + deep-read.ts + its own test, so it's
 *  re-derived here rather than imported). Needed after a deep read merges new
 *  purpose/dramaticTurn/revelation/emotionalShift values into `records`:
 *  annotations are a pure projection of those same four fields (plus
 *  clockRaised/openClues, which deep read never touches) — deep-read's
 *  overridden signals only reach the revision pipeline if annotations are
 *  rebuilt from the MERGED records rather than reused from the original
 *  lexicon-only analysis. */
function buildAnnotationsFromRecords(records: FountainAnalysis['records']): SceneAnnotation[] {
  return records.map(r => ({
    sceneIdx: r.sceneIdx,
    purpose: r.purpose,
    dramaticTurn: r.dramaticTurn,
    revelation: r.revelation,
    emotionalShift: r.emotionalShift,
    clockRaised: r.clockRaised,
    openClues: r.unresolvedClues.length,
  }));
}

/**
 * Run the full Script Doctor checkup on raw Fountain text: analyze it into
 * scene records (no LLM, no I/O), then run all 14 revision passes in
 * diagnose-only mode (issues collected, no rewrite ever attempted), then
 * aggregate into a single report.
 *
 * opts.deepRead (additive, default off — the quick path below is byte-
 * identical to before this option existed, a deliberate regression gate):
 * when true, runs deep-read.ts's LLM scene sensor over the SAME lexicon
 * records analyzeFountainText produced, merges its (validated-only, per-
 * scene) signals in, and rebuilds structure/annotations from the merged
 * records before they reach the 14-pass pipeline — see deep-read.ts's own
 * header for the full non-determinism/injection/cache story. Keyless or
 * total-failure degrades to the quick signals with report.deepRead.usedLLM
 * === false; it never throws for lack of a key (see deep-read.ts).
 */
export async function runScriptDoctor(
  fountain: string,
  storyContext?: StoryContext,
  opts?: { deepRead?: boolean },
): Promise<ScriptDoctorReport> {
  const deepReadMode = opts?.deepRead === true;

  // ── Cache check ────────────────────────────────────────────────────────
  // contentHash is cheap (one sha256 over the trimmed text) relative to the
  // 14-pass pipeline, so it's always worth computing up front and checking
  // the cache before touching the analyzer at all. The cache key folds in
  // deepReadMode (see doctorCacheKey's comment) so quick and deep lineages
  // for the same (contentHash, storyContext) never collide or serve each
  // other's report.
  const contentHash = computeContentHash(fountain);
  const cacheKey = doctorCacheKey(contentHash, storyContext, deepReadMode);
  const cached = doctorCacheGet(cacheKey);
  if (cached) {
    // Shallow copy: callers get their own top-level object (safe to
    // reassign fields on) that shares nested arrays/objects with the cached
    // entry; analyzedAt is stamped fresh so a cache hit never reports a
    // stale "checked at" time.
    return { ...cached, analyzedAt: Date.now() };
  }

  const analysis = analyzeFountainText(fountain);

  // Nothing to diagnose — return a well-formed, worst-case report rather than
  // running 14 passes over an empty screenplay. The coverage layer degrades
  // the same way: PASS (there is nothing to recommend), all-zero dimensions
  // that say so rather than silently omitting themselves, no strengths
  // (nothing was earned — there was nothing to earn it from), and a
  // plainSummary that says plainly that the submission was empty instead of
  // reusing the "problems found" templates on data that doesn't exist.
  //
  // Deliberately NOT cached: this branch already skips the entire 14-pass
  // pipeline (the whole point of the cache), so memoizing it would only
  // spend one of the 64 LRU slots on a report that costs next to nothing to
  // rebuild — a strictly worse trade than caching a real pipeline run.
  if (analysis.sceneCount === 0) {
    const degenerate: ScriptDoctorReport = {
      health: 0,
      grade: 'troubled',
      totalIssues: 0,
      bySeverity: { critical: 0, major: 0, minor: 0 },
      passes: [],
      sceneHeatmap: [],
      topPriorities: [],
      structure: analysis.structure,
      characters: [],
      sceneCount: 0,
      wordCount: 0,
      analyzedAt: Date.now(),
      verdict: 'PASS',
      dimensions: emptyDimensions(),
      strengths: [],
      plainSummary:
        'PASS — this submission is empty, so there is nothing to score; overall craft score 0/100. ' +
        'Add at least one scene of screenplay content and resubmit for a real assessment.',
      contentHash,
    };
    // A deep-read request against an empty submission is still a "deep"
    // lineage report — types.ts's deepRead field is populated on every
    // non-degenerate deep run, so an all-zero one here (nothing to read)
    // keeps that promise rather than silently omitting the field.
    if (deepReadMode) {
      degenerate.deepRead = { scenesRead: 0, scenesTotal: 0, usedLLM: false, fallbackScenes: [] };
    }
    return degenerate;
  }

  // ── Deep read (additive) ──────────────────────────────────────────────
  // Quick path (deepReadMode === false) never touches analysis beyond this
  // point unmodified — byte-identical to pre-deep-read behavior.
  let mergedAnalysis: FountainAnalysis = analysis;
  let deepReadField: ScriptDoctorReport['deepRead'] | undefined;

  if (deepReadMode) {
    const { records, deepRead } = await deepReadRecords(fountain, analysis.records);
    // Rebuild, don't reuse: structure.ts's analyzeStructure and this file's
    // buildAnnotationsFromRecords both derive purely from record signals
    // (suspenseDelta/revelation/clockRaised/unresolvedClues for structure;
    // purpose/dramaticTurn/revelation/emotionalShift/clockRaised/
    // unresolvedClues for annotations) — reusing analysis.structure/
    // analysis.annotations here would silently discard every signal deep
    // read just overrode.
    const structure = analyzeStructure(records, []);
    const annotations = buildAnnotationsFromRecords(records);
    mergedAnalysis = { ...analysis, records, structure, annotations };
    deepReadField = deepRead;
  }

  const compiled: CompiledScreenplay = {
    fountain,
    annotations: mergedAnalysis.annotations,
    structureSummary: buildStructureSummaryLine(mergedAnalysis),
    wordCount: mergedAnalysis.wordCount,
    compiledAt: Date.now(),
  };

  const result = await runDiagnoseOnly(() =>
    runRevisionPipeline(compiled, mergedAnalysis.records, mergedAnalysis.structure, [], undefined, storyContext),
  );

  const report = aggregateReport(result, mergedAnalysis, fountain);
  if (deepReadField) report.deepRead = deepReadField;

  // Store a shallow copy (not the object about to be returned) so nothing
  // the caller later does to their own report — e.g. reassigning a
  // top-level field — can reach back into the cached entry. analyzedAt is
  // dropped from the stored copy: it's meaningless to memoize (every hit
  // stamps its own fresh value in the cache-check block above), so the
  // Omit<..., 'analyzedAt'> cache type keeps that explicit rather than
  // caching a timestamp nobody will ever read back out unmodified.
  const { analyzedAt: _analyzedAt, ...cacheable } = report;
  doctorCacheSet(cacheKey, cacheable);

  return report;
}

/**
 * TEST-ONLY escape hatch (tests/core/pipeline-parallel.test.ts): runs the
 * identical analyze -> diagnose-only pipeline -> aggregate path as
 * runScriptDoctor above, except it forces runRevisionPipeline's
 * pre-existing SEQUENTIAL per-pass loop (pipeline.ts's
 * forceSequentialForTest parameter) instead of the parallel diagnose-only
 * fast path. This exists purely to give the parallel-path identity proof an
 * independent reference report computed from the exact same inputs through
 * the exact same aggregation code — the only thing that differs is whether
 * the 14 passes ran one-at-a-time or via Promise.all.
 *
 * Deliberately bypasses the doctor cache entirely (always a fresh run) and
 * does not replicate the zero-scene degenerate branch (real corpus samples
 * always have scenes; callers needing that branch should use
 * runScriptDoctor directly). Never called by runScriptDoctor or any other
 * production code path.
 */
export async function runScriptDoctorSequentialForTest(
  fountain: string, storyContext?: StoryContext,
): Promise<ScriptDoctorReport> {
  const analysis = analyzeFountainText(fountain);
  if (analysis.sceneCount === 0) {
    throw new Error(
      'runScriptDoctorSequentialForTest does not support zero-scene input — use runScriptDoctor directly.',
    );
  }

  const compiled: CompiledScreenplay = {
    fountain,
    annotations: analysis.annotations,
    structureSummary: buildStructureSummaryLine(analysis),
    wordCount: analysis.wordCount,
    compiledAt: Date.now(),
  };

  const result = await runDiagnoseOnly(() =>
    runRevisionPipeline(compiled, analysis.records, analysis.structure, [], undefined, storyContext, true),
  );

  return aggregateReport(result, analysis, fountain);
}
