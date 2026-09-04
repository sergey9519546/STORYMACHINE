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
import type { SceneAnnotation } from '../screenplay/compile-types.ts';
import type { StructureState } from '../screenplay/structure.ts';
import type { PassName, RevisionIssue } from '../revision/passes/types.ts';
import type { NarrativeMetricsReport } from './metrics.ts';
import type { StoryGraphReport } from './story-graph.ts';
import type { RevisionProgressEvent } from '../revision/pipeline.ts';

/**
 * E1 (2026-08-21): observational progress events runScriptDoctor can
 * optionally emit while it works, for a live-progress UI. Purely a side
 * channel — an onProgress callback never changes what any of these stages
 * COMPUTE, only when a caller is told a stage started or a pass finished.
 * `pass_complete` is RevisionProgressEvent (server/nvm/revision/pipeline.ts),
 * unmodified — that event already existed for the /api/nvm/revise-stream SSE
 * route; this type just gives doctor.ts's own quick/parsing/aggregating
 * bookends a matching shape so one callback can carry the whole run.
 */
export type DoctorProgressEvent =
  | { type: 'stage'; stage: 'parsing' }
  | { type: 'stage'; stage: 'deep_read' }
  | { type: 'stage'; stage: 'passes_start'; totalPasses: number }
  | { type: 'stage'; stage: 'aggregating' }
  | RevisionProgressEvent;

/** One recurring content-word object that did NOT earn clue status: it
 *  recurs across scenes, but nothing in the text ever marks it as unknown.
 *  D4's two named examples ("photograph-spread", "table-spread") land here.
 *  Kept as a reported category rather than deleted — the channel is demoted,
 *  not removed. See fountain-analyzer.ts's partitionContentWordClusters. */
export interface RecurringImage {
  /** Same id shape the clue channel would have used, so a reader comparing a
   *  pre-2026-08-04 report against a new one can see exactly what moved. */
  id: string;
  /** The clue-anchor noun the cluster formed around, stemmed. */
  anchor: string;
  /** Scene indices, ascending. */
  scenes: number[];
}

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
  /** Recurring content-word objects that did NOT earn clue status (D4,
   *  DETECTOR_DEFECTS_2026-08-03.md): a noun that recurs across scenes with
   *  nothing in the text ever marking it as unknown. Reported so the
   *  observation stays available — it is real, and a writer may want to see
   *  it — while being kept out of seededClueIds / payoffSetupIds /
   *  unresolvedClues, which are reserved for objects the text actually
   *  introduces as information. Optional so pre-existing FountainAnalysis
   *  constructions (tests, fixtures, the ops path) stay valid. */
  recurringImagery?: RecurringImage[];
  /** DoS guard (S1-b): set only when the script exceeded
   *  fountain-analyzer.ts's ANALYZER_SCENE_CEILING and was analyzed on its
   *  first `sceneCount` scenes only. Absent (not `false`) for every script at
   *  or under the ceiling — see analyzeFountainText's return for why. */
  truncatedForAnalysis?: boolean;
  /** The script's TRUE total scene count, only present alongside
   *  truncatedForAnalysis === true (sceneCount above is the smaller,
   *  actually-analyzed count in that case). */
  totalSceneCount?: number;
  /** Character voice distinctiveness (Burrows's Delta) */
  voiceAnalysis?: {
    pairs: Array<{ a: string; b: string; delta: number; swapRisk: boolean }>;
    scored: boolean;
  };
  /** Subtext ratio (ratio of subtext/action/indirect dialogue to direct exposition) */
  subtextRatio?: number;
  /** Question latency summary across script */
  questionLatencyOverall?: {
    totalQuestions: number;
    totalResolved: number;
    avgScenesToResolve: number;
  };
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
  /** True only when every pass completed and the whole submitted draft was
   *  analyzed. Partial located issues remain useful to the editor, but the
   *  headline fields below are absent unless this is true. */
  analysisComplete: boolean;
  /** Present only when the analyzer stopped at its scene ceiling. */
  truncatedForAnalysis?: boolean;
  /** True submitted scene count when `truncatedForAnalysis` is true; the
   *  regular `sceneCount` remains the analyzed-prefix count. */
  totalSceneCount?: number;
  /** Present only for a complete whole-draft analysis. */
  health?: number;
  /** Present only for a complete whole-draft analysis. */
  grade?: DoctorGrade;
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

/** Response of POST /api/scriptide/fix — the fix-and-verify receipt.
 *  Generation is the LLM's (opt-in, aiLimiter, span-scoped); VERIFICATION is
 *  the deterministic doctor's: the delta below is computed by re-running the
 *  full diagnose-only pipeline on the exact candidate text, so the receipt is
 *  proof, not promise. Both contentHashes are included so anyone can re-run
 *  the doctor on either text and get byte-identical numbers. Keyless: 200
 *  with usedLLM false and no candidate — never a 500. */
export interface FixVerifyResult {
  usedLLM: boolean;
  /** One honest sentence when no candidate could be produced (keyless, model
   *  failure, or the rewrite failed validation guards). */
  note?: string;
  /** The full document with the span replaced — what "Accept" applies. */
  candidateFountain?: string;
  /** Just the replacement span text (for the diff view). */
  spanReplacement?: string;
  /** 1-based inclusive lines of the span that was rewritten. */
  span?: { startLine: number; endLine: number };
  before?: { health: number; verdict?: CoverageVerdict; contentHash: string };
  after?: { health: number; verdict?: CoverageVerdict; contentHash: string };
  /** Issues present in the baseline report and absent from the candidate's —
   *  matched by (rule, location) identity. The whole document is compared,
   *  not just the span: a fix can ripple, and hiding ripples would make the
   *  receipt a lie. */
  cleared?: Array<RevisionIssue & { pass: PassName }>;
  /** Issues absent from the baseline and present in the candidate's report —
   *  regressions the fix introduced, shown with the same prominence as wins. */
  introduced?: Array<RevisionIssue & { pass: PassName }>;
}

export interface ScriptDoctorReport {
  /** 0–100 deterministic health score. 100-ceiling, opportunity-normalized:
   *  weighted issues (4·critical + 1.5·major + 0.5·minor) are read as a
   *  DENSITY against script size (wordCount^0.7), amplified to a readable
   *  spread, plus a scarcity penalty (140/sceneCount) so tiny scripts can't
   *  score high purely from having too little material to judge. Exact
   *  constants and their empirical tuning live in doctor.ts's craftPenalty —
   *  that function is the single source of truth; this comment describes
   *  shape, not constants, so it can't silently drift. Length-invariant by
   *  regression test: same craft at 1×/2×/3× length scores within ~10 pts.
   *  P0: when analysisComplete is false (a pass failed, the submitted draft
   *  was scene-truncated, or no screenplay scene was found), this is a
   *  degraded value (0) and must not be
   *  presented as a real score — show the incomplete banner. */
  health: number;
  /** health ≥ 90 excellent · ≥ 75 strong · ≥ 55 solid · ≥ 35 uneven · else troubled.
   *  P0: when analysisComplete is false, this is 'troubled' and must not be
   *  presented as a real grade — show the incomplete banner. */
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
  voiceAnalysis?: {
    pairs: Array<{ a: string; b: string; delta: number; swapRisk: boolean }>;
    scored: boolean;
  };
  subtextRatio?: number;
  questionLatencyOverall?: {
    totalQuestions: number;
    totalResolved: number;
    avgScenesToResolve: number;
  };

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
  /** ROADMAP §8 EA: deterministic emotional-arc signal (VAD+tension → shape).
   *  Diagnostic only — surfaced in the report, NOT fed into `health`. */
  emotionalArc?: import('./emotional-arc.ts').EmotionalArc;
  /** Diagnostic-only (does NOT affect health/verdict — additive report fields).
   *  Surfaced so the product can show anti-slop, theme, and interiority readings
   *  alongside the deterministic verdict without any scoring coupling. */
  antiSlop?: import('./anti-slop.ts').SlopReport;
  theme?: import('./theme-extract.ts').ThemeExtract;
  interiority?: import('./interiority.ts').InteriorityReport;
  /** Additional diagnostic-only excellence readings (no health coupling). */
  mirrorScenes?: import('./mirror-scene.ts').MirrorReport;
  silence?: import('./silence-signal.ts').SilenceReport;
  bonding?: import('./bonding-signal.ts').BondingReport;
  coldOpenPromise?: import('./cold-open-promise.ts').ColdOpenReport;
  patternEstablishment?: import('./pattern-establishment.ts').PatternReport;
  /** Dense, LEXICON-FREE structural readings — per scene and per document —
   *  computed from counts of words, lines, sentences, speech turns and
   *  speakers alone. Added 2026-09-04 in response to the advice-quality
   *  audit's measured finding that the four channels most of the advice
   *  derives from (`suspenseDelta`, `emotionalShift`, `clockRaised`,
   *  `revelation`) read "absent" on ~93% of scenes, so "X is missing" notes
   *  fire on an excellent draft and a bad one alike. These channels are dense
   *  by construction and cannot be defeated by vocabulary.
   *  DIAGNOSTIC ONLY — deliberately NOT wired into health, verdict, grade,
   *  dimensions, topPriorities, or any of the 14 passes. Wiring any channel
   *  into the score is an owner decision with one stated path: wire the
   *  candidate, run `npm run measure-real` on the local real corpus, compare
   *  AUC-24 against the >= 0.622 floor in `scripts/lib/auc.ts`, write the
   *  MEASUREMENT_RECEIPTS.md entry, then merge. See
   *  docs/scoring/STRUCTURAL_SIGNALS_2026-09-04.md for each channel's
   *  measured density and separation, including the two that came out
   *  degenerate. */
  structuralSignals?: import('./structural-signals.ts').StructuralSignalsReport;
  /** TRACE §13: Allen's Interval Algebra temporal-consistency audit (built,
   *  tested, and wired 2026-08-03 — see temporal-consistency.ts's header for
   *  the false-positive bug found and fixed during wiring, and the
   *  order-sensitivity finding that makes this module notable: unlike
   *  almost everything else in this list, its output is a function of scene
   *  ORDER, not just content). Diagnostic only — does NOT affect
   *  health/verdict; folding it into the score is a separate, P1-gated,
   *  evidence-requiring change (see temporal-consistency.ts). */
  temporalConsistency?: import('./temporal-consistency.ts').TemporalConsistencyReport;
  /** Wave SG-1: Story Graph diagnostic analysis. Constructs typed
   *  causal-temporal graph from existing scene signals (seededClueIds,
   *  payoffSetupIds, relationshipShifts), scores graph-native properties
   *  (promise-payment ratio, arc coherence, escalation monotonicity,
   *  forward-edge ratio) to solve act-swap AUC 0.48 and rule-channel AUC 0.076
   *  failures (DEEP_AUDIT findings #2, #9). Diagnostic only — not yet coupled
   *  to health. Optional so reports serialized before this field existed stay
   *  valid; the doctor populates it only for complete, non-degenerate runs.
   *  Prefix-only analysis must not present a graph-health reading as a
   *  whole-draft assessment. */
  storyGraph?: StoryGraphReport;
  /** GODMODE L4/L19: Disclosure & epistemic analysis — fair-reveal
   *  assessment, setup/payoff ordering violations, and character knowledge
   *  gaps. Optional; populated for complete analyses. */
  disclosureAnalysis?: import('../quality/disclosure-analysis.ts').DisclosureAnalysisReport;
  /** GODMODE L8: Character function classification — assigns each
   *  character to one of 14 supporting-function types. */
  characterFunctions?: import('../quality/character-function.ts').CharacterFunctionProfile[];
  /** GODMODE L13: Subplot architecture — identifies secondary dramatic
   *  threads (relationship arcs, mystery threads, theme arguments) and
   *  their intersection points with the main plot. */
  subplots?: import('../quality/subplot-tracker.ts').SubplotAnalysisReport;
  /** GODMODE L5: Story-graph health diagnostic. `graphDeduction` is a
   *  potential 0–15 point value, NOT part of health/verdict until repaired
   *  graph extraction passes real-writing calibration. */
  graphHealth?: import('../quality/graph-health.ts').GraphHealthContribution;
  /** GODMODE L37: Deliberate rule-breaking — convention violations that ARE
   *  compensated (passive protagonist with late-agency climax, minimal
   *  dialogue carried by visual density, escalating repetition). Diagnostic
   *  only; each finding carries a preserveNotice so downstream "fix this"
   *  advice can be suppressed where the violation reads as deliberate. */
  ruleBreaking?: import('../quality/rule-breaking.ts').RuleBreakingReport;
  /** Set by the HTTP route when it knows the submission format. */
  source?: DoctorSource;
  /** Present ONLY on deep-read reports (POST /api/scriptide/doctor/deep).
   *  Deep read is the one deliberate exception to the doctor's determinism:
   *  an LLM reads each scene's MEANING (subtext, stakes, motivation, irony)
   *  and emits values into the SAME record-signal schema the 1,300 rules
   *  already judge — the model senses, the rules still deliver every
   *  verdict. Annotations are cached per scene-content hash, so unchanged
   *  scenes reuse prior readings; scenes whose annotation fails or doesn't
   *  validate fall back to the lexicon signals (never a hard failure).
   *  A quick (deterministic) report NEVER carries this field, and consumers
   *  must treat deep and quick reports as distinct lineages: same
   *  contentHash + different mode = NOT comparable draft-over-draft. */
  deepRead?: {
    /** Scenes whose signals came from the LLM reading (vs lexicon fallback). */
    scenesRead: number;
    scenesTotal: number;
    /** False when no key was available — every scene fell back to lexicon
     *  and the report is effectively a quick read that was ASKED to be deep. */
    usedLLM: boolean;
    /** Scene indices that fell back to lexicon signals (failed/invalid
     *  annotation), so the panel can mark them honestly. Empty when all read. */
    fallbackScenes: number[];
  };
  /** P0: false when any revision pass threw, the submitted draft was
   *  scene-truncated, or no screenplay scene was found. In each case
   *  health/verdict/percentiles are withheld: a failed detector can make a
   *  script look healthier, an unseen suffix cannot support a whole-draft
   *  claim, and no scene supplies no assessment evidence. The client must show an
   *  incomplete-analysis banner instead of a score. */
  analysisComplete?: boolean;
  /** P0: passes that threw during execution. Omitted when all passes ran;
   *  a scene-truncated report may be incomplete with this field absent. */
  failedPasses?: PassName[];
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
  /** Deterministic narrative-shape metrics from analyze/metrics.ts (blueprint
   *  §27) — pivot/cliffhanger/twist/surprise/information-asymmetry per scene,
   *  plus suspense/momentum/cohesion/final-hook/emotional-range/tension-
   *  measures for the whole script. Reuses metrics.ts's own
   *  NarrativeMetricsReport shape verbatim (no redeclaration here) so the two
   *  can never drift apart. Optional so reports serialized/cached before this
   *  field existed stay valid: a missing `metrics` means "not computed for
   *  this report", never "computed as empty" (the doctor populates it only
   *  for complete, non-degenerate runs — see doctor.ts's aggregateReport).
   *  Prefix-only analysis cannot truthfully supply whole-draft shape metrics.
   *  Every
   *  pacingFit inside (per-scene and script-level) is `null` on every doctor
   *  report: the doctor has no session `emotional_arc` to pass
   *  computeNarrativeMetrics, and metrics.ts reports that absence honestly
   *  rather than fabricating a neutral score — see computePacingFit's header
   *  in metrics.ts. */
  metrics?: NarrativeMetricsReport;
  /** Deterministic industry-units estimate so a producer-facing report can
   *  speak in pages and minutes, not word counts. Derived from the analyzed
   *  Fountain text's rendered line count at the classic ~55 lines/page, with
   *  runtime at the 1-page-≈-1-minute convention. An ESTIMATE, clearly
   *  labeled as such by consumers — Fountain has no true pagination, so this
   *  is reproducible arithmetic, not layout. Optional so reports serialized
   *  before this field existed stay valid; the doctor populates it on every
   *  non-degenerate run. */
  pageEstimate?: {
    pages: number;
    runtimeMinutes: number;
    /** How the estimate was computed — 'lines' is the only basis today. */
    basis: 'lines';
  };
  /** Present ONLY when the input is too thin to judge as a complete work
   *  (fewer scenes than the RECOMMEND verdict floor of 8): one plain-language
   *  sentence telling the reader the report should be read as excerpt
   *  feedback, not feature coverage. Absent on full-length input — never
   *  padded. Confidence honesty, not a verdict change: verdict/dimensions
   *  are computed exactly as before. */
  excerptNote?: string;
  /** DoS guard (S1-b): mirrors FountainAnalysis.truncatedForAnalysis — set
   *  only when the submitted script exceeded the analyzer's scene ceiling and
   *  this report covers its first `sceneCount` scenes only. Absent for every
   *  normal-sized script. It also makes analysisComplete false, because a
   *  prefix cannot support a whole-draft score or verdict. */
  truncatedForAnalysis?: boolean;
  /** The script's TRUE total scene count, present only alongside
   *  truncatedForAnalysis === true. */
  totalSceneCount?: number;
  /** Which engine, and by what method, produced this report — the identity
   *  half of the determinism story `contentHash` already tells for the
   *  INPUT. Populated deterministically by doctor.ts's aggregation for every
   *  non-degenerate run (same tree -> same provenance, always — no
   *  Date.now(), no environment probing beyond the build-time commit
   *  identity every other release-facing surface already reads through
   *  server/lib/build-info.ts). Optional so reports serialized/cached before
   *  this field existed stay valid. */
  provenance?: ReportProvenance;
}

/** engineCommit/rulebookCount are also what POST /api/export/verify and the
 *  exported coverage HTML's verify block re-publish (server/routes/
 *  export.ts, server/lib/coverage-html.ts) so a recipient can tell an
 *  `engine_mismatch` (the engine moved since this report was produced, but
 *  the content and score still check out — a soft, re-run-to-confirm signal)
 *  apart from a real content/score mismatch. */
export interface ReportProvenance {
  /** The build/deploy-time git SHA of the running instance — server/lib/
   *  build-info.ts's `commit` verbatim (falls back to 'dev' locally/CI, same
   *  as GET /health). Never computed by shelling out to git at request time:
   *  a Docker-built image ships with no .git directory (build-info.ts's own
   *  header explains why) and a doctor worker thread should never touch the
   *  filesystem beyond what it already reads at module load. */
  engineCommit: string;
  /** The rulebook's `totalRuleRecords` (docs/rulebook/coverage.json) at the
   *  moment this file was built — the machine-counted rule-concept count
   *  behind the verdict, read once at module load (server/lib/
   *  rulebook-count.ts), never per report. */
  rulebookCount: number;
  /** How the ground truth this report's percentile/health is normalized
   *  against was established. Always this one literal today — there is no
   *  other calibration source in the codebase — kept as a named field
   *  (rather than baked into a comment) so an export/verify consumer can
   *  display it without knowing the engine's internals. */
  groundTruthSource: 'mechanical-degradation';
  /** Which reference distribution `healthPercentile` is ranked against —
   *  server/nvm/analyze/calibration/corpus.ts's 20-sample REFERENCE_CORPUS,
   *  the only percentile basis this engine has. */
  percentileBasis: 'internal-calibration-corpus-20-samples';
  /** Present iff sceneCount > server/lib/structural-reliability.ts's
   *  STRUCTURAL_ABSORPTION_THRESHOLD (40) — the SAME field the exported
   *  coverage HTML's footer caveat renders (coverage-html.ts is now a
   *  CONSUMER of this value, not an independent computation of it; see that
   *  module's header). Absent below the threshold — never an empty string. */
  structuralReliabilityNote?: string;
}
