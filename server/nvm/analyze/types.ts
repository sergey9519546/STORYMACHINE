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
}
