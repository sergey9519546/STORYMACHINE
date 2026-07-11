// Fountain-specific keybindings for CodeMirror 6.
//
// Stage 2: the old i/e-on-empty-line slug shortcuts, the Tab
// character-cycle/space-indent hacks, and the Enter-after-cue modal trigger
// are GONE:
//   - i/e shortcuts → replaced by the real autocomplete dropdown in
//     screenplay-complete.ts (typing "int"/"ext"/... anywhere now offers the
//     scene-heading prefixes instead of hijacking every i/e keystroke).
//   - Tab space-indent/character-cycle → indentation is a pure view
//     decoration now (screenplay-format.ts never touches the buffer), and
//     character-name cycling is superseded by the same autocomplete dropdown.
//     Tab is intentionally left unbound here so it falls through to
//     inline-complete's Tab-accept binding.
//   - Enter-after-cue → onCharacterEnter modal → replaced below by Final
//     Draft's actual behavior: Enter always inserts a normal newline (via
//     defaultKeymap's insertNewlineAndIndent, which runs immediately after
//     this binding since it always returns `false`), and Fountain treats
//     whatever non-blank text follows an uppercase cue as dialogue on its
//     own — no modal needed.
//
// What's left: Enter's "commit" auto-uppercase. When the cursor is about to
// leave a scene heading / transition / character cue, uppercase that line's
// real text (a normal undoable, collab-safe `view.dispatch`) before the
// newline is inserted — mirroring Final Draft's on-commit capitalization.
// Action and dialogue text is never touched.

import { KeyBinding, EditorView } from '@codemirror/view';
import { SCENE_PREFIX_RE, TRANSITIONS, dedupeUpper, harvestCueNames } from './screenplay-complete.ts';

export interface FountainKeymapOptions {
  /** Character names for cue-commit detection — read live via a getter so a mutable ref can back it without rebuilding the keymap. */
  characters: string[];
}

const TRANSITIONS_UPPER = new Set(TRANSITIONS.map((t) => t.toUpperCase()));
// Generic "ends in ` TO:`" transitions (e.g. "REVERSE ANGLE TO:") that aren't
// in the fixed TRANSITIONS list but are still unambiguously transitions.
const GENERIC_TRANSITION_RE = /^[a-z ]+ to:$/i;

function isBlankOrDocStart(view: EditorView, lineNumber: number): boolean {
  return lineNumber === 1 || view.state.doc.line(lineNumber - 1).text.trim() === '';
}

// Decides whether the line the cursor is currently on should be uppercased
// as part of an Enter "commit". Returns the line's range + its uppercased
// text, or null if nothing should happen (including: already uppercase).
function uppercaseCommitTarget(
  view: EditorView,
  opts: FountainKeymapOptions,
): { from: number; to: number; upper: string } | null {
  const cursor = view.state.selection.main.head;
  const line = view.state.doc.lineAt(cursor);
  const lineText = view.state.doc.sliceString(line.from, line.to);
  const trimmed = lineText.trim();
  if (!trimmed) return null;

  const upper = lineText.toUpperCase();
  if (lineText === upper) return null; // nothing to commit — already uppercase

  // Scene headings, transitions, and character cues are only legal
  // immediately after a blank line (or at doc start) per Fountain's own
  // grammar — the same gate screenplay-complete.ts uses to offer them.
  if (!isBlankOrDocStart(view, line.number)) return null;

  const isSceneHeading = SCENE_PREFIX_RE.test(trimmed);
  const isTransition = TRANSITIONS_UPPER.has(trimmed.toUpperCase()) || GENERIC_TRANSITION_RE.test(trimmed);

  let isCue = false;
  if (!isSceneHeading && !isTransition) {
    // Conservative: only uppercase a plain-typed line as a character cue
    // when it (minus a trailing (V.O.)/(O.S.)/(CONT'D)-style extension)
    // matches a KNOWN character — from the `characters` prop or a cue
    // already used elsewhere in the script. This is what keeps ordinary
    // action-paragraph first lines ("Sarah walks in.") from being
    // mistaken for a cue and shouted into caps.
    const bareName = trimmed.replace(/\s*\(.*?\)\s*$/, '').trim().toUpperCase();
    if (bareName) {
      const known = dedupeUpper([...opts.characters, ...harvestCueNames(view.state, line.number)]);
      isCue = known.includes(bareName);
    }
  }

  if (!isSceneHeading && !isTransition && !isCue) return null;
  return { from: line.from, to: line.to, upper };
}

export function fountainKeymap(opts: FountainKeymapOptions): KeyBinding[] {
  return [
    // Enter: commit-time auto-uppercase, then fall through (always returns
    // `false`) so defaultKeymap's insertNewlineAndIndent — or the
    // autocomplete dropdown's own Prec.highest Enter-accept, if a dropdown is
    // open — handles the actual keystroke.
    {
      key: 'Enter',
      run(view) {
        const target = uppercaseCommitTarget(view, opts);
        if (target) {
          view.dispatch({
            changes: { from: target.from, to: target.to, insert: target.upper },
          });
        }
        return false;
      },
    },
  ];
}
