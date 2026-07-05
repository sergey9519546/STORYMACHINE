// Script Doctor — shared contract for the Fountain-native analysis bridge.
//
// This module defines the interface between the three halves of the feature:
//   1. fountain-analyzer.ts — raw Fountain text → ScreenplaySceneRecord[] via
//      deterministic heuristic signal extraction (no session, no LLM).
//   2. doctor.ts — analyzer output → all 14 revision passes in diagnose-only
//      mode → aggregated ScriptDoctorReport.
//   3. POST /api/scriptide/doctor + ScriptDoctorPanel.tsx — the user surface.
//
// Everything here is JSON-serializable: the report travels over HTTP verbatim.

import type { ScreenplaySceneRecord } from '../screenplay/memory.ts';
import type { SceneAnnotation } from '../screenplay/compile.ts';
import type { StructureState } from '../screenplay/structure.ts';
import type { PassName, RevisionIssue } from '../revision/passes/types.ts';

/** Output of the heuristic Fountain analyzer — everything the revision
 *  pipeline needs, reconstructed from raw text instead of StoryCommits. */
export interface FountainAnalysis {
  records: ScreenplaySceneRecord[];
  annotations: SceneAnnotation[];
  structure: StructureState;
  /** Speaking characters, ordered by dialogue-line count (descending). */
  characters: string[];
  sceneCount: number;
  dialogueLineCount: number;
  actionLineCount: number;
  wordCount: number;
}

/** Per-pass rollup: the issues one pass found, with severity counts. */
export interface DoctorPassSummary {
  pass: PassName;
  issues: RevisionIssue[];
  critical: number;
  major: number;
  minor: number;
}

/** Per-scene rollup for the heatmap. Issues whose `location` names a scene
 *  ("Scene 3 (INT. BAR)") are attributed to it; unattributable issues count
 *  only toward the report totals. */
export interface SceneDiagnostics {
  sceneIdx: number;
  slug: string;
  issueCount: number;
  critical: number;
  major: number;
  minor: number;
}

export type DoctorGrade = 'excellent' | 'strong' | 'solid' | 'uneven' | 'troubled';

/** Industry-standard coverage verdict, the vocabulary studio readers use:
 *  RECOMMEND — champion it up the chain (rare); CONSIDER — promising, worth
 *  development; PASS — decline (in coverage, "pass" means *no*).
 *  Mapping: health ≥ 85 AND sceneCount ≥ 8 → RECOMMEND; health ≥ 60 (or a
 *  high-health script too short to fully judge) → CONSIDER; else PASS. */
export type CoverageVerdict = 'RECOMMEND' | 'CONSIDER' | 'PASS';

/** The 14 passes rolled up into 5 writer-facing craft dimensions. */
export type DimensionKey =
  | 'structure-pacing'    // structure, pacing, rhythm
  | 'character'           // character-arc, intention, relationship-arc
  | 'dialogue-voice'      // dialogue, voice
  | 'plot-logic'          // causality, belief, payoff, conflict
  | 'theme-originality';  // theme, originality

export interface DimensionScore {
  key: DimensionKey;
  /** Display label, e.g. "Structure & Pacing" */
  label: string;
  /** The passes that feed this dimension (fixed mapping above). */
  passes: PassName[];
  /** 0–100, same weighting formula as `health` but scoped to this
   *  dimension's issues. */
  score: number;
  issueCount: number;
  /** One plain-language sentence a non-technical writer understands. */
  summary: string;
  /** 0–100 percentile rank against the calibration reference corpus for THIS
   *  dimension (calibration/reference.ts). Computed on the UNCLAMPED craft
   *  statistic underlying `score` (doctor.ts's computeRawCraftScore), not on
   *  `score` itself — `score` is clamped to [0, 100] and, with enough
   *  accumulated issues, saturates at 0/100 for many scripts at once; ranking
   *  the unclamped statistic keeps two saturated scripts ordered correctly
   *  instead of tying. Optional so a report built without calibration data
   *  stays valid; the doctor populates it whenever the reference
   *  distribution is available. */
  percentile?: number;
  /** Plain-language gloss of `percentile`, e.g. "stronger than 74% of
   *  produced screenplays in the reference set". */
  percentileDescriptor?: string;
}

/** How the submitted script reached the doctor. Populated by the route, not
 *  by runScriptDoctor. When the input was converted (e.g. from Final Draft
 *  .fdx), convertedFountain carries the result so the client can load it. */
export interface DoctorSource {
  format: 'fountain' | 'fdx' | 'pdf';
  convertedFountain?: string;
  /** Non-critical fdx→Fountain conversion notes (e.g. an unrecognized Final
   *  Draft paragraph type that was imported as Action). Present only when
   *  fdxToFountain produced at least one. */
  warnings?: string[];
}

/** Where in the script an issue can be pinned. Most revision-pass issues are
 *  scene- or act-level, not line-precise (their `location` reads "Scene 3
 *  (INT. BAR)" or "Act 1 pacing"), so honest anchoring has four tiers rather
 *  than pretending every finding maps to a caret range:
 *   - 'scene'     — attributed to one scene; anchored to that scene's line span.
 *   - 'character' — about one character; anchored to their first speaking line.
 *   - 'lines'     — the location already named an explicit line range.
 *   - 'document'  — act-level / whole-script / prose-pattern; NO line anchor
 *                   (startLine/endLine undefined) — surfaced in summaries, not
 *                   as an editor squiggle. */
export type IssueAnchor = 'scene' | 'character' | 'lines' | 'document';

/** A RevisionIssue resolved against concrete Fountain text so the editor can
 *  draw it. startLine/endLine are 1-based inclusive (CodeMirror line numbers);
 *  both undefined when anchor === 'document'. */
export interface LocatedIssue {
  issue: RevisionIssue;
  pass: PassName;
  anchor: IssueAnchor;
  startLine?: number;
  endLine?: number;
}

/** A cluster of co-firing issues rolled into one named diagnosis — the
 *  difference between a 40-item lint dump and a script reader saying "your
 *  antagonist vanishes for act two, and these nine symptoms are all that one
 *  wound". Deterministic: grouped by scene-span overlap + known rule
 *  co-occurrence templates, never by an LLM. */
export interface RootCauseFinding {
  /** Stable id derived from the member rules + span (for React keys / dedup). */
  id: string;
  /** Plain-language name of the underlying problem. */
  title: string;
  /** One or two sentences naming the root cause and its evidence in the
   *  writer's own vocabulary — no rule-name jargon. */
  explanation: string;
  /** Worst severity among members. */
  severity: RevisionIssue['severity'];
  /** The rules that fired together to form this finding. */
  memberRules: string[];
  /** How many individual issues this finding subsumes. */
  memberCount: number;
  /** Scenes the finding touches (for the heatmap / navigation). */
  sceneIdxs: number[];
  /** Line span covering the finding when it is scene/line-anchored. */
  startLine?: number;
  endLine?: number;
}

/** Response of POST /api/scriptide/diagnose — the lightweight, debounce-friendly
 *  "diagnostics as you type" endpoint that powers editor squiggles. Carries only
 *  what the editor needs (located issues + clusters + the headline numbers),
 *  NOT the full 14-pass report, so it stays cheap to call on every pause. */
export interface LiveDiagnosis {
  health: number;
  grade: DoctorGrade;
  verdict?: CoverageVerdict;
  sceneCount: number;
  /** Every diagnosable issue, resolved to a line anchor where possible. */
  locatedIssues: LocatedIssue[];
  /** The same issues rolled up into named root-cause findings. */
  rootCauses: RootCauseFinding[];
  /** Determinism receipt (sha256 of trimmed fountain) so the client can skip
   *  redundant re-renders when the text hasn't materially changed. */
  contentHash: string;
  analyzedAt: number;
}

export interface ScriptDoctorReport {
  /** 0–100 deterministic health score. 100 = zero issues. Formula:
   *  100 − (4·critical + 1.5·major + 0.5·minor) · (30 / max(sceneCount, 1)),
   *  clamped to [0, 100] — i.e. issue weight normalized per 30-scene feature. */
  health: number;
  /** health ≥ 90 excellent · ≥ 75 strong · ≥ 55 solid · ≥ 35 uneven · else troubled */
  grade: DoctorGrade;
  totalIssues: number;
  bySeverity: { critical: number; major: number; minor: number };
  /** All 14 passes in pipeline execution order, including zero-issue passes. */
  passes: DoctorPassSummary[];
  sceneHeatmap: SceneDiagnostics[];
  /** Highest-priority issues across all passes: critical first, then major,
   *  then minor; ties broken by pipeline pass order. At most 10. */
  topPriorities: Array<RevisionIssue & { pass: PassName }>;
  structure: StructureState;
  characters: string[];
  sceneCount: number;
  wordCount: number;
  analyzedAt: number;

  // ── Coverage layer (optional so older report consumers stay valid; the
  //    doctor always populates all four on every non-degenerate run) ────────
  /** Industry coverage verdict derived from health + sceneCount. */
  verdict?: CoverageVerdict;
  /** Always all 5 dimensions in the DimensionKey order above. */
  dimensions?: DimensionScore[];
  /** Deterministic, plain-language "what's working" bullets earned from the
   *  data (zero-issue dimensions, escalating tension, all setups paid off…).
   *  Empty array when nothing is genuinely earned — never padded. */
  strengths?: string[];
  /** 2–4 template-built sentences summarizing the whole report for a reader
   *  with no film-school vocabulary. Deterministic — no LLM. */
  plainSummary?: string;
  /** Set by the HTTP route when it knows the submission format. */
  source?: DoctorSource;
  /** sha256 hex of the trimmed analyzed Fountain text. The determinism
   *  receipt: two reports with equal contentHash came from the identical
   *  script, so their verdicts are comparable draft-over-draft, and an
   *  exported report can be re-verified byte-for-byte. */
  contentHash?: string;
  /** 0–100 percentile rank against the calibration reference corpus.
   *  Computed on the UNCLAMPED craft statistic underlying `health` (doctor.ts's
   *  computeRawCraftScore), not on `health` itself — `health` is clamped to
   *  [0, 100] and, with enough accumulated issues, saturates at 0 for many
   *  scripts at once; ranking the unclamped statistic keeps two saturated
   *  scripts ordered correctly instead of tying at the same percentile.
   *  Optional — populated only when calibration data is available. */
  healthPercentile?: number;
  /** Co-firing issues clustered into named diagnoses (see RootCauseFinding).
   *  Optional so older consumers stay valid; the doctor populates it whenever
   *  there are issues to cluster. */
  rootCauses?: RootCauseFinding[];
}
