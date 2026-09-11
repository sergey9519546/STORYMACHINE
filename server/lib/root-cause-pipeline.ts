// ONE root-cause pipeline — the single place a ScriptDoctorReport plus its raw
// Fountain text becomes located issues, per-scene line spans, clustered root
// causes, and the "start here" ordering, AND the single place those findings
// are turned into reader-facing statements.
//
// ── Why this exists (2026-09-11, producer-tier discovery defect #2) ─────────
//
// The writer's screen and the producer's export disagreed about where the
// problem was, from the SAME contentHash. Eight call sites hand-assembled the
// same four-step pipeline, and three of them passed a DIFFERENT argument list:
//
//   server/routes/scriptide.ts  /doctor          clusterIssues(located, spans)
//   server/routes/scriptide.ts  /doctor/stream   clusterIssues(located, spans)
//   server/routes/scriptide.ts  /doctor (deep)   clusterIssues(located, spans)
//   server/routes/scriptide.ts  /doctor/pdf      clusterIssues(located, spans)
//   server/routes/scriptide.ts  /diagnose        clusterIssues(located, spans)
//   server/routes/export.ts     /export/coverage clusterIssues(located)   <— no spans
//   server/routes/coverage-letter.ts             clusterIssues(located)   <— no spans
//   scripts/generate-p0-sample-report.ts         clusterIssues(located)   <— no spans
//
// `sceneSpans` is not cosmetic. clusterIssues (server/nvm/analyze/cluster.ts)
// uses it for TWO things: `sceneIdxsOf`, which decides which scenes a finding
// names, and `cohesionKey`/`splitOversizedGroup`, which decides how an
// over-cap group is split into separate findings. Omitting it therefore
// changes the scene ranges, the member counts, the number of findings, and —
// because the final sort key is `memberCount` — the ORDER the writer is told
// to fix things in.
//
// MEASURED on tests/fixtures/feature-length/assembled-feature.fountain. The
// numbers are NOT written out in this comment — they are the exported constant
// SCENE_SPAN_DRIFT_MEASUREMENT at the bottom of this file, and
// tests/routes/root-cause-parity.test.ts re-measures every one of them against a
// live run on that fixture, plus the brain note that quotes them.
//
// Round 2 (2026-09-11): this used to be a hand-typed table here, and one of its
// three rows was wrong in both columns at once — it read
// `top finding's scenes | 1, 2–12 | 1, 2–9`, where the real values are
// `Scenes 2–12` and `Scenes 2–4, 6–9`. There is no scene 1 in either, and the
// without-spans list is GAPPY rather than the contiguous run the table showed, so
// the table understated its own finding while being unreproducible. A measured
// table that only a human re-types is a claim with no gate under it; this one now
// has one.
//
// The headline it records: the producer's report named ONE scene where the
// writer's screen named fifty-eight, and the two documents carried a different
// number of findings in a different order — from one hash, one engine, one
// script.
//
// Every call site now goes through buildRootCausePipeline(). There is no
// `sceneSpans` argument to forget: the function derives the spans from the
// same `fountain` string it derives the located issues from.
//
// Pure (no I/O, no clock, no randomness) over a report + its text, so the same
// pair always produces the same findings in the same order with the same ids —
// which is exactly what the cross-surface parity test
// (tests/routes/root-cause-parity.test.ts) asserts of all four renderers at
// once.
//
// NOT on the scoring path: nothing here is reachable from
// server/nvm/analyze/doctor.ts (this module imports it nowhere, and doctor.ts
// attaches no rootCauses itself — see server/routes/scriptide.ts's own comment
// on why clustering is a route-level enrichment). Verified by
// `node scripts/check-scoring-receipt.mjs`.

import { locateIssues, sceneLineSpans, type SceneLineSpan } from '../nvm/analyze/locate.ts';
import { clusterIssues, isNamedRootCause } from '../nvm/analyze/cluster.ts';
import { buildPrioritizedIssues, type PrioritizedIssue } from '../nvm/analyze/prioritize.ts';
import type { LocatedIssue, RootCauseFinding, ScriptDoctorReport } from '../nvm/analyze/types.ts';
import type { PassName, RevisionIssue } from '../nvm/revision/passes/types.ts';
import { formatSceneList } from './scene-ranges.ts';
// The panel's own count wording, imported rather than re-worded: "15 issues
// from 12 rules" is the sentence ScriptDoctorPanel.tsx's RootCauseCard renders
// under every finding (src/lib/finding-jump.ts, registered in
// docs/CLAIMS_REGISTER.md). The exports used to hand-write "Subsumes 15
// issues" instead, so the same cluster was two different sentences depending
// on which document you were holding.
import { rootCauseCountSentence } from '../../src/lib/finding-jump.ts';

/** The flat issue list every consumer of this pipeline needs, with each
 *  issue tagged by the pass that raised it — the exact shape locateIssues
 *  takes, and the exact shape the routes used to build inline. */
export type IssueWithPass = RevisionIssue & { pass: PassName };

export interface RootCausePipeline {
  /** report.passes flattened, each issue tagged with its pass. */
  issuesWithPass: IssueWithPass[];
  /** Every issue resolved to an honest anchor (or correctly left unlocatable). */
  locatedIssues: LocatedIssue[];
  /** Index i is scene i's { startLine, endLine }. The argument three call
   *  sites used to omit. */
  sceneLineSpans: SceneLineSpan[];
  /** Clustered root causes, in clusterIssues' canonical order (severity, then
   *  named-beats-generic, then member count). */
  rootCauses: RootCauseFinding[];
  /** The "start here" ordering over the located issues. */
  prioritized: PrioritizedIssue[];
}

/** The minimum a report has to carry for this pipeline to run. Deliberately
 *  narrow (`passes` only) so a caller holding a partial or reconstructed
 *  report shape — scripts/generate-p0-sample-report.ts builds one by hand —
 *  can use it without first satisfying the whole ScriptDoctorReport contract. */
export type ClusterableReport = Pick<ScriptDoctorReport, 'passes'>;

/**
 * Build every root-cause-derived value for one (report, fountain) pair.
 *
 * `fountain` MUST be the exact text the report was produced from — the same
 * string the caller passed to runScriptDoctor — because the located anchors
 * and the scene spans are both resolved against it by line number. Handing in
 * a different draft silently produces anchors for the wrong lines; that is
 * why this takes the text rather than accepting pre-located issues.
 */
export function buildRootCausePipeline(
  report: ClusterableReport,
  fountain: string,
): RootCausePipeline {
  const issuesWithPass: IssueWithPass[] = report.passes.flatMap(
    p => p.issues.map(issue => ({ ...issue, pass: p.pass })),
  );
  const locatedIssues = locateIssues(issuesWithPass, fountain);
  const spans = sceneLineSpans(fountain);
  const rootCauses = clusterIssues(locatedIssues, spans);
  const prioritized = buildPrioritizedIssues(locatedIssues, rootCauses);
  return { issuesWithPass, locatedIssues, sceneLineSpans: spans, rootCauses, prioritized };
}

// ── Reader-facing statements ─────────────────────────────────────────────────

/** How many root causes a summary-length surface leads with — the coverage
 *  letter's "Root Causes" list and the producer tier's "things to fix first".
 *  Three, matching the letter's pre-existing slice; named here so the two
 *  cannot pick different numbers of "top" findings. */
export const TOP_ROOT_CAUSE_COUNT = 3;

/** One finding, said the way every surface says it.
 *
 *  `countSentence` and `sceneList` are the two statements that had drifted:
 *  the panel said "15 issues from 12 rules • scenes 1, 2, 3", the HTML export
 *  said "Subsumes 15 issues — Scene 1, Scene 2, Scene 3", and the letter said
 *  "Subsumes 15 issues." with "(Scenes 1, 2, 3)" welded onto the heading.
 *  Both now come from here. `sceneList` is '' for a finding with no scene
 *  anchor (27 of the 70 on the feature fixture) — see formatSceneList on why
 *  the empty case is the caller's to punctuate. */
export interface RootCauseStatement {
  id: string;
  severity: RootCauseFinding['severity'];
  title: string;
  explanation: string;
  memberCount: number;
  ruleCount: number;
  /** "15 issues from 12 rules" — src/lib/finding-jump.ts. */
  countSentence: string;
  /** "Scenes 1–3, 7" — server/lib/scene-ranges.ts. '' when unanchored. */
  sceneList: string;
  memberRules: string[];
  /** True for the hand-written, evidence-backed named templates/families the
   *  coverage HTML promotes above Top Priorities (cluster.ts's
   *  isNamedRootCause) — exposed here so that presentation split reads the
   *  same predicate every other surface does. */
  named: boolean;
}

/** Canonical statements for a finding list, IN THE ORDER GIVEN. Never
 *  re-sorts: clusterIssues already applied the one ordering the product has
 *  (severity, named-beats-generic, member count), and the coverage letter used
 *  to re-sort by `severity || memberCount` — dropping the named-beats-generic
 *  key — so the letter's "top three" could be three different findings from
 *  the three the panel led with for the same script. */
export function rootCauseStatements(rootCauses: readonly RootCauseFinding[]): RootCauseStatement[] {
  return rootCauses.map(rc => ({
    id: rc.id,
    severity: rc.severity,
    title: rc.title,
    explanation: rc.explanation,
    memberCount: rc.memberCount,
    ruleCount: rc.memberRules.length,
    countSentence: rootCauseCountSentence(rc.memberCount, rc.memberRules.length),
    sceneList: formatSceneList(rc.sceneIdxs),
    memberRules: rc.memberRules,
    named: isNamedRootCause(rc),
  }));
}

/** The first TOP_ROOT_CAUSE_COUNT findings in canonical order — what a
 *  summary-length surface leads with. Takes the findings (not statements) so a
 *  caller can slice before deciding how to say them. */
export function topRootCauses(
  rootCauses: readonly RootCauseFinding[],
  count: number = TOP_ROOT_CAUSE_COUNT,
): RootCauseFinding[] {
  return rootCauses.slice(0, Math.max(0, count));
}

// ── The measurement, as data ──────────────────────────────────────────

/**
 * What omitting `sceneSpans` actually costs, on the one feature-length input this
 * repository owns.
 *
 * EXPORTED AND TESTED, not narrated. Every field here is re-derived from a live
 * `runScriptDoctor` + `clusterIssues` run on the named fixture by
 * tests/routes/root-cause-parity.test.ts, which also asserts that
 * `docs/brain/Surfaces/Surface - Root Cause Pipeline.md` quotes the same values —
 * so the module, the test and the brain note cannot drift apart, and a cluster.ts
 * change that moves any of them fails there instead of quietly making this file
 * wrong.
 *
 * `topFindingScenes` / `thirdFindingScenes` are `formatSceneList` renderings of
 * findings [0] and [2] in canonical order. Two things in them are the finding:
 * index 2 names 58 scenes with the spans and ONE without, and index 0's
 * without-spans value is a GAPPY list — the producer's document was naming a
 * different SET of scenes, not a narrower span of them.
 */
export const SCENE_SPAN_DRIFT_MEASUREMENT = {
  fixture: 'tests/fixtures/feature-length/assembled-feature.fountain',
  sceneCount: 231,
  wordCount: 19293,
  issueCount: 899,
  /** First 12 hex of the report's contentHash — the whole point is that BOTH
   *  columns below come from this one hash. */
  contentHash12: '6c27c8693c40',
  health: 84.4,
  verdict: 'CONSIDER',
  withSpans: {
    rootCauses: 70,
    topFindingScenes: 'Scenes 2–12',
    thirdFindingScenes: 'Scenes 1–58',
  },
  withoutSpans: {
    rootCauses: 69,
    topFindingScenes: 'Scenes 2–4, 6–9',
    thirdFindingScenes: 'Scene 1',
  },
} as const;
