// Command palette — pure, DOM-free registry types and fuzzy-filter/scoring
// logic (E5, docs/PATH_TO_EXCELLENCE.md). Kept separate from
// CommandPalette.tsx (the React shell) for the same reason
// use-modal-focus-trap.ts splits decideTabFocusAction out of its DOM
// binding: this repo has no jsdom/browser test harness (see CLAUDE.md), so
// the only slice that can get real, runnable unit coverage is whatever is
// DOM-free — everything here qualifies.

/**
 * One entry in the palette's action registry. `run` is expected to be the
 * SAME handler a visible button already calls (ScriptIDE.tsx wires every
 * action's `run` to an existing named callback — takeSnapshot,
 * handleTaskChange("ship"), exportPDF, etc.) — the palette is a second
 * entry point onto real dispatch, never a parallel implementation of it.
 */
export interface PaletteAction {
  /** Stable, unique within one registry build. */
  id: string;
  label: string;
  /** Section heading shown when the palette isn't actively filtering. */
  group: string;
  /** Optional trailing hint text (e.g. a live on/off state). */
  hint?: string;
  /** Extra search terms not present in the visible label. */
  keywords?: readonly string[];
  /** Rendered as a <kbd> next to the row when present. */
  shortcut?: string;
  disabled?: boolean;
  run: () => void;
}

/** The subset filterPaletteActions actually reads — generic so its tests
 *  (and any other future caller) don't need a real `run` closure. */
export interface PaletteSearchable {
  label: string;
  keywords?: readonly string[];
}

const SCORE_EXACT = 100;
const SCORE_PREFIX = 90;
const SCORE_WORD_BOUNDARY = 80;
const SCORE_SUBSTRING = 70;
const SCORE_KEYWORD_EXACT = 65;
const SCORE_KEYWORD_PREFIX = 60;
const SCORE_KEYWORD_SUBSTRING = 50;

/**
 * Score how well `query` (already known non-empty and trimmed by the
 * caller) matches one action's label/keywords. Higher is a better match;
 * 0 means "does not match at all" and the caller must exclude it — every
 * positive tier below scores >= SCORE_KEYWORD_SUBSTRING's floor, so 0
 * doubles safely as the sentinel.
 *
 * Deliberately literal (label/keyword substring + prefix + exact tiers
 * only) rather than a character-subsequence fuzzy match: an earlier
 * version of this scorer also fell back to "every character of the query
 * appears in order somewhere in the label," the same trick file-name
 * fuzzy-finders use — but this registry holds full sentences ("Diagnose
 * this draft (Script Doctor)"), not short filenames, so a 3-4 character
 * query nearly always finds SOME in-order subsequence in an unrelated
 * label too. Caught by this module's own tests (a "ship" query surfacing
 * "Diagnose this draft (Script Doctor)" — s···h···i···p, none of them
 * adjacent) before it ever shipped; literal matching only trades a little
 * typo-tolerance for results a writer can actually predict.
 */
export function scorePaletteMatch(label: string, keywords: readonly string[] | undefined, query: string): number {
  const q = query.toLowerCase();
  const l = label.toLowerCase();

  if (l === q) return SCORE_EXACT;
  if (l.startsWith(q)) return SCORE_PREFIX;
  if (l.includes(` ${q}`)) return SCORE_WORD_BOUNDARY;
  if (l.includes(q)) return SCORE_SUBSTRING;

  for (const raw of keywords ?? []) {
    const k = raw.toLowerCase();
    if (k === q) return SCORE_KEYWORD_EXACT;
  }
  for (const raw of keywords ?? []) {
    const k = raw.toLowerCase();
    if (k.startsWith(q)) return SCORE_KEYWORD_PREFIX;
  }
  for (const raw of keywords ?? []) {
    const k = raw.toLowerCase();
    if (k.includes(q)) return SCORE_KEYWORD_SUBSTRING;
  }

  return 0;
}

/**
 * Filter + rank a registry against a search query. An empty/whitespace-only
 * query returns every action UNCHANGED (original registry order — the
 * grouped, curated order the caller built it in), matching how the palette
 * shows a browsable menu before the writer types anything. A non-empty
 * query returns only actions that score above 0, sorted by score
 * descending; Array.prototype.sort is stable in every JS engine this repo
 * targets (Node >=22.13, evergreen browsers), so equal-score ties keep
 * their original registry order rather than shuffling arbitrarily between
 * keystrokes.
 */
export function filterPaletteActions<T extends PaletteSearchable>(actions: readonly T[], query: string): T[] {
  const trimmed = query.trim();
  if (trimmed === "") return actions.slice();

  const scored = actions
    .map((action) => ({ action, score: scorePaletteMatch(action.label, action.keywords, trimmed) }))
    .filter((entry) => entry.score > 0);

  scored.sort((a, b) => b.score - a.score);
  return scored.map((entry) => entry.action);
}
