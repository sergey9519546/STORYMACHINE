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

import type { StoryContext, PassName, RevisionIssue } from '../revision/passes/types.ts';
import type { CompiledScreenplay } from '../screenplay/compile.ts';
import { runRevisionPipeline, type RevisionResult } from '../revision/pipeline.ts';
import { runDiagnoseOnly } from '../revision/rewrite.ts';
import { analyzeFountainText } from './fountain-analyzer.ts';
import type { FountainAnalysis, ScriptDoctorReport, DoctorPassSummary, SceneDiagnostics, DoctorGrade } from './types.ts';

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

  return {
    health,
    grade: gradeForHealth(health),
    totalIssues,
    bySeverity,
    passes,
    sceneHeatmap: buildSceneHeatmap(passes, analysis),
    topPriorities: buildTopPriorities(passes),
    structure: analysis.structure,
    characters: analysis.characters,
    sceneCount: analysis.sceneCount,
    wordCount: analysis.wordCount,
    analyzedAt: Date.now(),
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
  // running 14 passes over an empty screenplay.
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
