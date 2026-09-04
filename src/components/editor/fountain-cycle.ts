// Pure (no CodeMirror imports) decision logic for the Tab element-cycling
// feature implemented in fountain-keymap.ts.
//
// Kept CodeMirror-free — like src/lib/command-palette.ts and
// incremental-reparse.ts in this same directory — so it gets real, directly
// -imported unit coverage under this repo's `node --experimental-strip-types`
// test runner: fountain-keymap.ts itself can never be imported there (its
// `KeyBinding`/`EditorView` type imports from @codemirror/view break Node's
// type-stripper, which does not do cross-usage elision the way Vite/tsc do —
// see tests/core/editor-decorations.test.ts's header for the same issue
// elsewhere in this editor, and this file's own test for a byte-for-byte
// confirmation of the failure this split avoids).

export type CycleElementType = 'action' | 'character' | 'parenthetical' | 'dialogue' | 'transition';

// Order specified by the design brief: action → character → parenthetical →
// dialogue → transition, with Shift-Tab reversing it. `null` (no pending
// cycle yet — a truly untouched empty line) sits conceptually BEFORE
// 'action' going forward and AFTER 'transition' going backward, so the very
// first Tab press on a fresh line always lands on 'action' and the very
// first Shift-Tab press always lands on 'transition'.
export const CYCLE_ORDER: readonly CycleElementType[] = [
  'action',
  'character',
  'parenthetical',
  'dialogue',
  'transition',
];

// The only element type that gets REAL inserted text — see this module's
// header and fountain-keymap.ts's doc comment for why 'character' /
// 'transition' / 'dialogue' rely on a CSS-only preview instead
// (screenplay-format.ts's `.cm-sp-*` classes, including
// text-transform:uppercase for the two all-caps types): Fountain has no
// punctuation marker for a character cue or a transition, and inventing
// placeholder text (a fake name, "TO:") would have to be silently deleted
// before the writer could type their own — worse than typing straight into
// a genuinely empty, correctly-indented line. Parenthetical is the one
// exception: "()" IS itself complete, valid Fountain parenthetical syntax
// (parseFountain: a line that starts with "(" and ends with ")" immediately
// after a character/dialogue/parenthetical block) — a real placeholder that
// is also already-correct content, unlike a fake name would be.
const SYNTHETIC_TEXT: Partial<Record<CycleElementType, string>> = { parenthetical: '()' };

/** The literal text a given cycle type inserts, or '' if it inserts nothing. */
export function syntheticTextFor(type: CycleElementType): string {
  return SYNTHETIC_TEXT[type] ?? '';
}

export interface CycleApplyPlan {
  nextType: CycleElementType;
  /** Text to insert at the (now-empty) line start. May be ''. */
  insertText: string;
  /** Cursor offset from line start after inserting `insertText`. */
  cursorOffset: number;
}

/**
 * Pure step function: given the CURRENTLY pending type (null if this is the
 * first Tab press on an untouched empty line) and a direction, returns the
 * next type plus what to insert and where the cursor lands. Never reads or
 * writes a document — the caller (fountain-keymap.ts) removes whatever
 * `current`'s own synthetic text was (via syntheticTextFor) before applying
 * this plan's `insertText`, in the same CodeMirror transaction.
 */
export function planCycleStep(current: CycleElementType | null, dir: 1 | -1): CycleApplyPlan {
  const len = CYCLE_ORDER.length;
  // `null` needs its own case rather than folding into the mod-arithmetic
  // below as index -1: that would make BOTH directions step away from
  // 'action' (index 0) — dir=-1 would land on index -2 mod len = 'dialogue'
  // — instead of the intended "null sits before 'action' going forward, and
  // after 'transition' going backward" symmetry.
  const nextIdx = current === null ? (dir === 1 ? 0 : len - 1) : ((CYCLE_ORDER.indexOf(current) + dir) % len + len) % len;
  const nextType = CYCLE_ORDER[nextIdx];
  const insertText = syntheticTextFor(nextType);
  // Parenthetical: land the cursor BETWEEN the parens ("(|)"). Every other
  // type inserts nothing, so the cursor simply stays at line start (offset 0
  // as of an empty insertText).
  const cursorOffset = nextType === 'parenthetical' ? 1 : insertText.length;
  return { nextType, insertText, cursorOffset };
}
