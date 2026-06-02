// Wave 39 — Revision Pass Shared Types
// Each of the 12 revision passes shares this interface contract.

import type { SceneAnnotation } from '../../screenplay/compile.ts';
import type { StructureState } from '../../screenplay/structure.ts';
import type { ScreenplaySceneRecord } from '../../screenplay/memory.ts';

export type PassName =
  | 'structure'
  | 'causality'
  | 'intention'
  | 'belief'
  | 'conflict'
  | 'character-arc'
  | 'dialogue'
  | 'rhythm'
  | 'pacing'
  | 'originality'
  | 'payoff'
  | 'voice'
  | 'theme';

export interface ApprovedSpan {
  /** 1-based line number (inclusive) */
  startLine: number;
  /** 1-based line number (inclusive) */
  endLine: number;
  reason: string;
}

export interface RevisionIssue {
  /** e.g. "Scene 3 (INT. THE BAR)" or "Lines 40-42" */
  location: string;
  rule: string;
  description: string;
  severity: 'critical' | 'major' | 'minor';
  /** Optional inline fix hint fed to the LLM rewriter */
  suggestedFix?: string;
}

export interface StoryContext {
  /** Story theme statement (e.g. "Power corrupts") */
  theme?: string;
  /** Genre (e.g. "thriller", "drama") */
  genre?: string;
  /** Director/style shorthand (e.g. "Hitchcock — slow build, subtext") */
  directorStyle?: string;
  /** Compact character summary — names + emotional state */
  characters?: string;
}

export interface PassInput {
  /** Fountain text as currently revised (prior passes may have changed it) */
  fountain: string;
  /** Original compiled fountain (for strength-preservation checks) */
  original: string;
  annotations: SceneAnnotation[];
  structure: StructureState;
  records: ScreenplaySceneRecord[];
  /** Spans the author has approved — rewriters must not change them */
  approvedSpans: ApprovedSpan[];
  /** Live story context injected into every LLM rewrite prompt */
  storyContext?: StoryContext;
  /** Results from all passes that ran before this one — lets each pass avoid
   *  undoing prior improvements and coordinate with earlier diagnostic work. */
  priorPassResults?: PassResult[];
}

export interface PassResult {
  pass: PassName;
  /** Issues found during diagnosis */
  issues: RevisionIssue[];
  /** Fountain text after this pass (unchanged if no issues or LLM unavailable) */
  revisedFountain: string;
  /** True if the fountain text changed */
  changed: boolean;
  /** One-sentence human-readable summary of what was done */
  summary: string;
}

/** Each pass exports a function matching this signature */
export type RevisionPass = (input: PassInput) => Promise<PassResult>;
