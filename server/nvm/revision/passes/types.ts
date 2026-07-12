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
  | 'theme'
  | 'relationship-arc';

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
  /** W1 (confidence.ts, D.3). Epistemic basis of this finding. Optional +
   *  additive: absent ⇒ treated exactly as legacy. Only `deterministic`/
   *  `structured_only` findings may be `critical` (hard-block); a `heuristic`
   *  finding that is `critical` is a gate violation (assertSeverityLegal). */
  determinism?: import('./confidence.ts').Determinism;
  /** How strongly current evidence supports this finding, kept separate from
   *  severity (TRACE §17.3). Absent ⇒ full legacy weight in the health formula. */
  confidenceTier?: import('./confidence.ts').ConfidenceTier;
}

export interface StoryContext {
  /** Story theme statement (e.g. "Power corrupts") */
  theme?: string;
  /** Genre (e.g. "thriller", "drama") */
  genre?: string;
  /** Tone register (e.g. "bleak", "operatic") — I1-a: composed with genre via
   *  composeThresholds (server/lib/genre-router.ts) by the passes whose rule
   *  thresholds are genre-conditioned (pacing, structure, belief). Follows
   *  IllusionState.story_tone through the same route-level threading genre
   *  uses (server/routes/nvm/revision.ts). */
  tone?: string;
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
