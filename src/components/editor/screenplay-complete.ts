// Context-aware Fountain autocomplete (CodeMirror 6) — Stage 2.
//
// A single CompletionSource dispatches on where the cursor sits, using
// parseFountain (src/lib/fountain.ts) for structural context instead of any
// duplicated element-detection logic:
//
//   1. New-paragraph token (cursor is the first thing typed after a blank
//      line, or at doc start) → merged dropdown of scene-heading prefixes
//      (INT./EXT./INT./EXT./EST.), transitions (CUT TO:, FADE OUT., …), and
//      CHARACTER cue names (the `characters` option + names harvested from
//      existing cues in the doc). This mirrors Fountain's own grammar: all
//      three element types are only legal immediately after a blank line, so
//      they share one trigger position and are disambiguated purely by the
//      text the user types.
//   2. Inside a scene heading, after INT./EXT./EST. has been typed →
//      LOCATIONS harvested from existing scene_heading blocks (prefix +
//      time-of-day stripped, deduped) until a `-` is typed, then TIME-OF-DAY
//      suggestions (DAY, NIGHT, CONTINUOUS, …) filtered by whatever follows
//      the dash.
//
// Never fires mid-word in prose/dialogue: every branch requires either (a)
// the typed text since the line start to still be a plain word/name (no
// punctuation reached yet — the natural point where it stops matching any
// candidate), or (b) an explicit scene-heading prefix already present on the
// line. Ordinary action/dialogue text quickly diverges from every candidate
// and the source returns null, closing the dropdown.

import { CompletionContext, CompletionResult, Completion, CompletionSource } from '@codemirror/autocomplete';
import { EditorState } from '@codemirror/state';
import { parseFountain } from '../../lib/fountain.ts';

export interface ScreenplayCompleteOptions {
  /** Character names to suggest at cue position — read live so a ref-backed getter works. */
  characters: string[];
}

// ── Candidate word lists ──────────────────────────────────────────────────────
const SCENE_PREFIXES = ['INT. ', 'EXT. ', 'INT./EXT. ', 'EST. '];

// Exported: fountain-keymap.ts's Enter-commit auto-uppercase reuses this list
// (and SCENE_PREFIX_RE / dedupeUpper / harvestCueNames below) so the two
// features agree on exactly what counts as a transition/scene-heading/cue —
// no second, drifting copy of the same detection rules.
export const TRANSITIONS = [
  'CUT TO:',
  'DISSOLVE TO:',
  'SMASH CUT TO:',
  'MATCH CUT TO:',
  'FADE OUT.',
  'FADE TO:',
  'INTERCUT WITH:',
];

const TIME_OF_DAY = [
  'DAY',
  'NIGHT',
  'CONTINUOUS',
  'MORNING',
  'EVENING',
  'LATER',
  'MOMENTS LATER',
  'DUSK',
  'DAWN',
];

// Matches an already-typed scene-heading prefix (any of the four forms, any
// casing, with or without periods) at the start of the line — the boundary
// between "still choosing the element" and "typing inside a scene heading".
export const SCENE_PREFIX_RE = /^(int\.?\s*\/\s*ext\.?|i\/e|int|ext|est)[.\s]+/i;

// A bare word/name being typed at a new-paragraph position: letters,
// apostrophes, and internal spaces only — stops matching (and so stops
// suggesting) the instant punctuation particular to prose/dialogue appears.
const NEW_PARAGRAPH_TOKEN_RE = /^[A-Za-z][A-Za-z' ]*$/;

export function dedupeUpper(names: Iterable<string>): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of names) {
    const name = raw.trim().toUpperCase();
    if (!name || seen.has(name)) continue;
    seen.add(name);
    out.push(name);
  }
  return out;
}

// Cue names already used in the script (character + dual_dialogue blocks),
// with dual-dialogue's trailing `^` and extensions like (V.O.)/(O.S.)/(CONT'D)
// stripped so the bare name is what's offered.
export function harvestCueNames(state: EditorState, excludeLine: number): string[] {
  const blocks = parseFountain(state.doc.toString());
  const names: string[] = [];
  for (const block of blocks) {
    if (block.type !== 'character' && block.type !== 'dual_dialogue') continue;
    if (block.lineNumber === excludeLine) continue;
    const name = block.text
      .trim()
      .replace(/\^\s*$/, '')
      .replace(/\s*\(.*?\)\s*$/, '')
      .trim();
    if (name) names.push(name);
  }
  return names;
}

// Locations already used in scene headings, with the INT./EXT./EST. prefix
// and any trailing " - TIME OF DAY" stripped, deduped case-insensitively.
function harvestLocations(state: EditorState, excludeLine: number): string[] {
  const blocks = parseFountain(state.doc.toString());
  const locations: string[] = [];
  for (const block of blocks) {
    if (block.type !== 'scene_heading') continue;
    if (block.lineNumber === excludeLine) continue;
    const loc = block.text
      .trim()
      .replace(SCENE_PREFIX_RE, '')
      .replace(/\s*-\s*.*$/, '')
      .trim();
    if (loc) locations.push(loc);
  }
  return locations;
}

function toOptions(labels: readonly string[], type: string): Completion[] {
  return labels.map((label) => ({ label, type }));
}

// ── Branch: inside a scene heading (prefix already typed) ─────────────────────
function sceneHeadingCompletions(
  context: CompletionContext,
  lineFrom: number,
  lineTextBefore: string,
  prefixLen: number,
): CompletionResult | null {
  const afterPrefix = lineTextBefore.slice(prefixLen);
  const dashIdx = afterPrefix.lastIndexOf('-');

  if (dashIdx === -1) {
    // Still typing the location.
    const typed = afterPrefix.trim();
    const typedUpper = typed.toUpperCase();
    const excludeLine = context.state.doc.lineAt(context.pos).number;
    const candidates = dedupeUpper(harvestLocations(context.state, excludeLine)).filter((loc) =>
      loc.startsWith(typedUpper),
    );
    if (candidates.length === 0) return null;
    return {
      from: lineFrom + prefixLen + (afterPrefix.length - afterPrefix.trimStart().length),
      options: toOptions(candidates, 'text'),
      filter: false,
    };
  }

  // Typing the time-of-day after a `-`.
  const todTyped = afterPrefix.slice(dashIdx + 1).replace(/^\s+/, '');
  const todUpper = todTyped.toUpperCase();
  const candidates = TIME_OF_DAY.filter((tod) => tod.startsWith(todUpper));
  if (candidates.length === 0) return null;
  return {
    from: context.pos - todTyped.length,
    options: toOptions(candidates, 'keyword'),
    filter: false,
  };
}

// ── Branch: new-paragraph token — scene/transition/character merge ───────────
function newParagraphCompletions(
  context: CompletionContext,
  lineFrom: number,
  lineTextBefore: string,
  characters: string[],
): CompletionResult | null {
  if (!NEW_PARAGRAPH_TOKEN_RE.test(lineTextBefore)) return null;

  const typedUpper = lineTextBefore.toUpperCase();
  const options: Completion[] = [];

  for (const prefix of SCENE_PREFIXES) {
    if (prefix.startsWith(typedUpper)) options.push({ label: prefix, type: 'keyword', boost: 2 });
  }
  for (const transition of TRANSITIONS) {
    if (transition.startsWith(typedUpper)) options.push({ label: transition, type: 'keyword' });
  }

  const excludeLine = context.state.doc.lineAt(context.pos).number;
  const cueNames = dedupeUpper([...characters, ...harvestCueNames(context.state, excludeLine)]);
  for (const name of cueNames) {
    if (name.startsWith(typedUpper)) options.push({ label: name, type: 'variable' });
  }

  if (options.length === 0) return null;
  return { from: lineFrom, options, filter: false };
}

// ── Public factory ─────────────────────────────────────────────────────────────
export function screenplayComplete(opts: ScreenplayCompleteOptions): CompletionSource {
  return (context: CompletionContext): CompletionResult | null => {
    const line = context.state.doc.lineAt(context.pos);
    const lineTextBefore = context.state.sliceDoc(line.from, context.pos);
    if (lineTextBefore.length === 0) return null;

    // Scene headings, transitions, and character cues are all only legal
    // immediately after a blank line (or at doc start) per Fountain's own
    // grammar — gate every branch on it up front so none of them nag inside
    // an action paragraph or mid-dialogue.
    const prevBlank = line.number === 1 || context.state.doc.line(line.number - 1).text.trim() === '';
    if (!prevBlank) return null;

    const prefixMatch = lineTextBefore.match(SCENE_PREFIX_RE);
    if (prefixMatch) {
      return sceneHeadingCompletions(context, line.from, lineTextBefore, prefixMatch[0].length);
    }

    return newParagraphCompletions(context, line.from, lineTextBefore, opts.characters);
  };
}
