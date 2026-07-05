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

import type { StoryContext, PassName, RevisionIssue } from '../revision/passes/types.ts';
import type { CompiledScreenplay } from '../screenplay/compile.ts';
import type { StructureState } from '../screenplay/structure.ts';
import { runRevisionPipeline, type RevisionResult } from '../revision/pipeline.ts';
import { runDiagnoseOnly } from '../revision/rewrite.ts';
import { analyzeFountainText } from './fountain-analyzer.ts';
import type {
  FountainAnalysis, ScriptDoctorReport, DoctorPassSummary, SceneDiagnostics, DoctorGrade,
  CoverageVerdict, DimensionKey, DimensionScore,
} from './types.ts';

/** health = 100 − (4·critical + 1.5·major + 0.5·minor) · (30 / max(sceneCount, 1)),
 *  clamped to [0, 100] and rounded to 1 decimal. Exported as a pure function
 *  (rather than inlined) so the formula itself can be spot-checked with a
 *  known issue count without needing to run the full 14-pass pipeline. */
export function computeHealthScore(
  bySeverity: { critical: number; major: number; minor: number },
  sceneCount: number,
): number {
  const rawPenalty =
    (4 * bySeverity.critical + 1.5 * bySeverity.major + 0.5 * bySeverity.minor) *
    (30 / Math.max(sceneCount, 1));
  const clamped = Math.max(0, Math.min(100, 100 - rawPenalty));
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
}

/** Roll the 14 per-pass summaries up into the 5 contract dimensions. Kept
 *  separate from aggregateReport so the pass->dimension mapping is a single,
 *  independently testable seam. Returns the internal `mix` alongside each
 *  public DimensionScore so buildPlainSummary can name a top rule area for
 *  the weakest dimension without recomputing it from scratch. */
function buildDimensions(passes: DoctorPassSummary[], sceneCount: number): DimensionBuild[] {
  return DIMENSION_DEFS.map(def => {
    const passSet = new Set<PassName>(def.passes);
    const issues = passes.filter(p => passSet.has(p.pass)).flatMap(p => p.issues);
    const bySeverity = issues.reduce(
      (acc, i) => { acc[i.severity]++; return acc; },
      { critical: 0, major: 0, minor: 0 },
    );
    const score = computeHealthScore(bySeverity, sceneCount);
    const mix = analyzeDimensionIssues(issues);
    return {
      mix,
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
  const { structure, anyClueSeeded, sceneCount, bySeverity, dimensions } = input;
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

function aggregateReport(result: RevisionResult, analysis: FountainAnalysis): ScriptDoctorReport {
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

  const health = computeHealthScore(bySeverity, analysis.sceneCount);
  const topPriorities = buildTopPriorities(passes);

  // ── Coverage layer ──────────────────────────────────────────────────────
  const dimensionBuilds = buildDimensions(passes, analysis.sceneCount);
  const dimensions = dimensionBuilds.map(d => d.score);
  const verdict = verdictFor(health, analysis.sceneCount);
  const anyClueSeeded = analysis.records.some(r => r.seededClueIds.length > 0);
  const strengths = buildStrengths({
    structure: analysis.structure,
    anyClueSeeded,
    sceneCount: analysis.sceneCount,
    bySeverity,
    dimensions,
  });
  const plainSummary = buildPlainSummary(verdict, health, dimensionBuilds, topPriorities);

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
  };
}

/**
 * Run the full Script Doctor checkup on raw Fountain text: analyze it into
 * scene records (no LLM, no I/O), then run all 14 revision passes in
 * diagnose-only mode (issues collected, no rewrite ever attempted), then
 * aggregate into a single report.
 */
export async function runScriptDoctor(fountain: string, storyContext?: StoryContext): Promise<ScriptDoctorReport> {
  const analysis = analyzeFountainText(fountain);

  // Nothing to diagnose — return a well-formed, worst-case report rather than
  // running 14 passes over an empty screenplay. The coverage layer degrades
  // the same way: PASS (there is nothing to recommend), all-zero dimensions
  // that say so rather than silently omitting themselves, no strengths
  // (nothing was earned — there was nothing to earn it from), and a
  // plainSummary that says plainly that the submission was empty instead of
  // reusing the "problems found" templates on data that doesn't exist.
  if (analysis.sceneCount === 0) {
    return {
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
    };
  }

  const compiled: CompiledScreenplay = {
    fountain,
    annotations: analysis.annotations,
    structureSummary: buildStructureSummaryLine(analysis),
    wordCount: analysis.wordCount,
    compiledAt: Date.now(),
  };

  const result = await runDiagnoseOnly(() =>
    runRevisionPipeline(compiled, analysis.records, analysis.structure, [], undefined, storyContext),
  );

  return aggregateReport(result, analysis);
}
