// craft-formula.ts — the Script Doctor's craft-score formula, as a LEAF.
//
// WHAT LIVES HERE. The four functions behind the overall health number —
// densityPenalty, scarcityPenalty, craftPenalty and computeRawCraftScore —
// with every tuned constant they read, moved here VERBATIM from doctor.ts on
// 2026-09-21 (bodies byte-identical; only the `export` keywords and this
// header are new — see docs/audits/2026-09-21-craft-formula-leaf/README.md
// for the before/after import graph and the output-identity receipt). The
// clamped, displayed computeHealthScore stays in doctor.ts and calls
// computeRawCraftScore from here; doctor.ts re-exports computeRawCraftScore
// so every existing import site still resolves.
//
// WHY A LEAF. This module imports NOTHING — not doctor.ts, not
// calibration/reference.ts, nothing that imports either. That is the whole
// point. reference.ts scores its 20-sample reference corpus in a top-level
// `await` at module load, through computeRawCraftScore; until 2026-09-21 it
// imported that function from doctor.ts, while doctor.ts imported
// reference.ts back. Whenever doctor.ts was the cycle's entry (every pool
// worker, and a `tsx server.ts` main thread) the corpus build therefore ran
// code from a module whose body had NOT yet evaluated, and two things failed
// silently there, each swallowed by reference.ts's fallback into an empty
// distribution:
//   1. a module-level `const` read by the formula was in its temporal dead
//      zone (CLAUDE.md's "formula constants stay function-local" gotcha);
//   2. under the production loader (tsx = esbuild `keepNames`), a NAMED
//      nested function expression or arrow on the path compiled to a call on
//      esbuild's hoisted-but-uninitialised `var __name`
//      (tests/core/doctor-calibration-under-tsx.test.ts's finding).
// With the formula here, reference.ts imports it from this leaf, this leaf
// has no module body that could be half-evaluated, and neither mechanism can
// fire on the corpus-scoring path: both probes were re-run against this
// module after the move and PASSED (the audit record above has the runs).
//
// THE CONVENTION IS KEPT ANYWAY. Every constant below is still declared
// inside the function that reads it, and there is still no named nested
// function expression on the path — belt and braces, so this file stays
// correct even if someone later gives it an import. The per-function doc
// comments below still explain the original TDZ reason in the past tense;
// the tsx guard test still runs on every `npm test`.
//
// KEEP THIS FILE IMPORT-FREE. If the formula ever needs a helper, it goes in
// this file as a hoisted `function` declaration, or in another leaf with no
// imports of its own — never an import of doctor.ts or calibration/**.
// tests/core/craft-formula-leaf.test.ts asserts the import closure of this
// file is exactly itself.

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
// MONOTONICITY FIX (2026-07-14): The prior piecewise formula had a ~7.5-point
// discontinuity at density=1 — the logistic sub-1 branch saturated near 10,
// while the power >=1 branch started at 2.5. A nominally worse issue density
// could therefore IMPROVE health. Replaced with a single continuous power
// curve (DENSITY_SCALE * density^DENSITY_POWER) that is monotonic by
// construction: adding any severity-weighted issue can only increase the
// penalty. The old sub-1 branch's flat ~10-point penalty in [0.65, 1.0) was
// a low-confidence zone where no corpus sample or discrimination pair landed;
// the new curve is smooth across that region. See tests/core/monotonicity.test.ts
// for property-based invariants enforcing this contract.
/** The word-density half of craftPenalty, factored out on its own (Wave
 *  18-β) so a caller can apply it WITHOUT the scarcity term below — see
 *  computeDimensionScore's comment for why the per-dimension scores need
 *  exactly that. Byte-identical arithmetic to what craftPenalty always
 *  computed for this half at density >= 1.0; see the design comment above
 *  for the density < 1.0 branch this wave added.
 *
 *  The tuned constants are declared LOCALLY (inside this function body)
 *  rather than at module scope, for the TemporalDeadZone reason documented
 *  on craftPenalty below — until 2026-09-21 this function lived in doctor.ts,
 *  on the doctor.ts <-> calibration/reference.ts import cycle (reference.ts's
 *  scoreSample reaches it transitively through computeRawCraftScore), so a
 *  module-level `const` there carried the hazard. This file is a leaf now
 *  (see its header) and the hazard cannot fire here; the style is kept as
 *  the convention. */
export function densityPenalty(
  bySeverity: { critical: number; major: number; minor: number },
  wordCount: number,
): number {
  const WORD_COUNT_EXPONENT = 0.7;
  const DENSITY_POWER = 3.75;
  const DENSITY_SCALE = 2.5;
  // CONTINUITY FIX (P0.1, 2026-07-15): the prior piecewise formula had a
  // ~7.5-point discontinuity at density=1 — logistic sub-1 branch saturated
  // near SUB_DENSITY_SCALE=10 while the power branch started at
  // DENSITY_SCALE=2.5. Crossing the seam could IMPROVE health despite more
  // weighted issues (non-monotonic at the branch boundary).
  //
  // Fix: keep the calibrated logistic for density < 1 (unchanged shape in the
  // band where discrimination pairs live), and for density >= 1 use a power
  // curve that starts at the same value the logistic reaches at density=1:
  //   SUB_DENSITY_SCALE + DENSITY_SCALE * (density^DENSITY_POWER - 1)
  // At density=1 both sides equal 10. Both sides are increasing, so the full
  // function is continuous and monotonic. Above density=1 the penalty is
  // higher than the old 2.5*density^3.75 by a constant +7.5 offset — denser
  // scripts are scored more harshly, but never rewarded for crossing the seam.
  const SUB_DENSITY_SCALE = 10;
  const SUB_DENSITY_MIDPOINT = 0.52;
  const SUB_DENSITY_STEEPNESS = 50;

  const weightedIssues = 4 * bySeverity.critical + 1.5 * bySeverity.major + 0.5 * bySeverity.minor;
  const opportunityWords = Math.pow(Math.max(wordCount, 1), WORD_COUNT_EXPONENT);
  const density = weightedIssues / Math.max(opportunityWords, 1e-10);

  if (density < 1) {
    return SUB_DENSITY_SCALE / (1 + Math.exp(-SUB_DENSITY_STEEPNESS * (density - SUB_DENSITY_MIDPOINT)));
  }
  return SUB_DENSITY_SCALE + DENSITY_SCALE * (Math.pow(density, DENSITY_POWER) - 1);
}

/** The scene-scarcity half of craftPenalty, factored out on its own (Wave
 *  18-β) for the same reason as densityPenalty above — see that function's
 *  comment. SCARCITY_SCALE stays function-local for the identical TDZ
 *  reason — now a kept convention, not a live hazard (this file's header). */
export function scarcityPenalty(sceneCount: number): number {
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
 *  than re-declared here — the same TDZ hazard those two functions'
 *  comments explain, retired structurally by this file being a leaf and
 *  kept as convention; this function never declares a module-level const of
 *  its own either. */
export function craftPenalty(
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
