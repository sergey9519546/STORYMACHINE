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
/** Shared penalty expression behind both computeRawCraftScore and
 *  computeHealthScore — factored out so the two can never drift apart. See
 *  the design comment above for the full rationale; in short:
 *    penalty = DENSITY_SCALE * (weightedIssues / wordCount^WORD_COUNT_EXPONENT)^DENSITY_POWER
 *            + SCARCITY_SCALE / sceneCount
 *  where weightedIssues = 4·critical + 1.5·major + 0.5·minor (unchanged from
 *  the prior formula — only the normalization changed).
 *
 *  The four tuned constants are declared LOCALLY (inside this function body)
 *  rather than at module scope — deliberately, not for style. doctor.ts and
 *  calibration/reference.ts import each other (reference.ts's header
 *  explains why: it reuses this exact formula to build its distribution,
 *  without ever calling back into aggregateReport/runScriptDoctor). Whichever
 *  of the two modules a process happens to load FIRST becomes the entry
 *  point of that cycle; if it were doctor.ts, reference.ts's top-level
 *  `await buildDistribution()` would call into this function while doctor.ts
 *  was still mid-evaluation — before any module-scope `const` declared here
 *  had run its initializer. That's a genuine TemporalDeadZone ReferenceError
 *  (verified while building this fix), silently swallowed by reference.ts's
 *  own top-level try/catch into an empty distribution — every report would
 *  then quietly lose healthPercentile for the rest of the process, with
 *  nothing crashing to reveal why. Function PARAMETERS and function-local
 *  `const`s have no such hazard: they're initialized fresh on every call,
 *  independent of module evaluation order, so the cycle above can never
 *  observe them uninitialized. */
function craftPenalty(
  bySeverity: { critical: number; major: number; minor: number },
  sceneCount: number,
  wordCount: number,
): number {
  const WORD_COUNT_EXPONENT = 0.7;
  const DENSITY_POWER = 3.75;
  const DENSITY_SCALE = 2.5;
  const SCARCITY_SCALE = 140;

  const weightedIssues = 4 * bySeverity.critical + 1.5 * bySeverity.major + 0.5 * bySeverity.minor;
  const opportunityWords = Math.pow(Math.max(wordCount, 1), WORD_COUNT_EXPONENT);
  const density = weightedIssues / opportunityWords;
  const densityPenalty = DENSITY_SCALE * Math.pow(density, DENSITY_POWER);
  const scarcityPenalty = SCARCITY_SCALE / Math.max(sceneCount, 1);
  return densityPenalty + scarcityPenalty;
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
  /** computeRawCraftScore for this dimension's own issue mix — unclamped,
   *  used only for calibration ranking (aggregateReport below), never
   *  displayed. See computeRawCraftScore's comment for why ranking needs the
   *  unclamped statistic. */
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
 *  each dimension's own opportunity-based penalty (craftPenalty in
 *  computeHealthScore/computeRawCraftScore) is scaled against the same
 *  script-wide word count as the overall health score, exactly as sceneCount
 *  already was before this fix. */
function buildDimensions(passes: DoctorPassSummary[], sceneCount: number, wordCount: number): DimensionBuild[] {
  return DIMENSION_DEFS.map(def => {
    const passSet = new Set<PassName>(def.passes);
    const issues = passes.filter(p => passSet.has(p.pass)).flatMap(p => p.issues);
    const bySeverity = issues.reduce(
      (acc, i) => { acc[i.severity]++; return acc; },
      { critical: 0, major: 0, minor: 0 },
    );
    const score = computeHealthScore(bySeverity, sceneCount, wordCount);
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
  /** Wave 1183 (Program v2, Type 2 — excellence): the per-scene records the
   *  three new detectors below read (clockRaised, relationshipShifts,
   *  emotionalShift). Optional — defaults to [] inside buildStrengths — so
   *  every fixture/test written before this wave still typechecks and still
   *  produces byte-identical output (an empty/absent records array can never
   *  satisfy any of the three new guards' minimum-population conditions).
   *  Matches the file's existing optional-field precedent (memory.ts's
   *  relationshipShifts/questionsRaised: "treat absence as []/0"). */
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

/**
 * Earned, never-padded "what's working" bullets. Exported as a pure function
 * over already-computed report data (rather than folded inline into
 * aggregateReport) so each guard is fixture-testable directly — build a
 * StructureState/DimensionScore[] that should or shouldn't trigger a given
 * bullet, with no dependency on which of the hundreds of accumulated pass
 * rules happen to fire for a given fountain string.
 */
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

  const health = computeHealthScore(bySeverity, analysis.sceneCount, analysis.wordCount);
  const topPriorities = buildTopPriorities(passes);

  // ── Coverage layer ──────────────────────────────────────────────────────
  const dimensionBuilds = buildDimensions(passes, analysis.sceneCount, analysis.wordCount);
  const dimensions = dimensionBuilds.map(d => d.score);
  const verdict = verdictFor(health, analysis.sceneCount);
  const anyClueSeeded = analysis.records.some(r => r.seededClueIds.length > 0);
  const strengths = buildStrengths({
    structure: analysis.structure,
    anyClueSeeded,
    sceneCount: analysis.sceneCount,
    bySeverity,
    dimensions,
    records: analysis.records,
  });
  const plainSummary = buildPlainSummary(verdict, health, dimensionBuilds, topPriorities);

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
