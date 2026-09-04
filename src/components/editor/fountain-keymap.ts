// Fountain-specific keybindings for CodeMirror 6.
//
// Stage 2: the old i/e-on-empty-line slug shortcuts and the Enter-after-cue
// modal trigger are GONE:
//   - i/e shortcuts → replaced by the real autocomplete dropdown in
//     screenplay-complete.ts (typing "int"/"ext"/... anywhere now offers the
//     scene-heading prefixes instead of hijacking every i/e keystroke).
//   - Enter-after-cue → onCharacterEnter modal → replaced below by Final
//     Draft's actual behavior: Enter always inserts a normal newline (via
//     defaultKeymap's insertNewlineAndIndent, which runs immediately after
//     this binding since it always returns `false`), and Fountain treats
//     whatever non-blank text follows an uppercase cue as dialogue on its
//     own — no modal needed.
//
// Item 3 (docs/PATH_TO_EXCELLENCE.md upgrade-exports-editor pass): Tab used
// to be left completely unbound, which silently ejects a keyboard user's
// focus out of `.cm-content` mid-draft the instant they press it out of
// Final Draft/Highland muscle memory — no cue, no way back short of
// clicking. Tab is now bound to TWO things depending on where the cursor is:
//
//   1. On a truly empty "new paragraph" line (the same isBlankOrDocStart gate
//      screenplay-complete.ts and the Enter-commit logic below already use —
//      the one position scene headings / transitions / character cues are
//      even legal at), Tab CYCLES a pending element type: action →
//      character → parenthetical → dialogue → transition, Shift-Tab in
//      reverse — mirroring Final Draft's own Tab-cycles-paragraph-format
//      behavior on an empty line. See planCycleStep (fountain-cycle.ts) for
//      the pure step logic and pendingCycleField/pendingCycleDecorations
//      below for how it's previewed. THIS IS DELIBERATELY THE SMALLEST
//      USEFUL VERSION, not a full parity re-implementation of Final Draft's
//      paragraph-format model: Fountain's grammar has no metadata layer to
//      "set the format" of an empty line the way Final Draft's document
//      model does — every element type is inferred purely from what text is
//      actually there (src/lib/fountain.ts). So the cycle is a TYPING AID,
//      not a guarantee: it previews the target format via the real
//      `.cm-sp-*`/`.cm-fountain-*` CSS classes (screenplay-format.ts /
//      fountain-highlight.ts) on the still-empty line — including
//      text-transform:uppercase, which is why typing lowercase while
//      'character'/'transition' is pending visually shows uppercase without
//      touching the buffer — but the moment real content is typed, Fountain's
//      own parser (not this cycle) decides what the line actually becomes,
//      same as it always has. Only 'parenthetical' inserts real text ("()",
//      cursor between the parens) because "()" IS itself complete, correct
//      Fountain syntax; the other types have no punctuation marker to offer.
//      Escape or typing anything real dismisses the pending cycle (see
//      pendingCycleField's update()) — "Escape/typing committing," per the
//      design brief.
//   2. Anywhere else (mid-paragraph, a non-empty line, or an empty line not
//      in "new paragraph" position), Tab/Shift-Tab fall back to CodeMirror's
//      own insertTab/indentLess — the documented MINIMUM baseline ("keep
//      focus in the editor and insert the conventional indent") for
//      positions the cycling behavior doesn't apply to.
//
// Accessibility escape hatch (both bindings above capture Tab, so a
// keyboard-only user needs a documented way OUT — see ShortcutModal.tsx's
// "Editor" group for the same text): press Escape once (with no pending
// cycle active — Escape's FIRST job is dismissing that, if there is one),
// which arms a one-shot "next Tab moves focus instead" flag
// (tabEscapeArmedField); the very next Tab or Shift-Tab consumes that flag
// and returns `false` (unhandled), letting the browser's normal focus-move
// happen. Any other keypress or edit in between lets the arming lapse. This
// is the "Escape-then-Tab" idiom CodeMirror's own docs recommend for exactly
// this situation. Ctrl-m (the OTHER common CodeMirror convention for this,
// distinct from the Mod-modifier bindings elsewhere in this app) is also
// bound, toggling tabCaptureDisabledField — while disabled, Tab/Shift-Tab
// are unhandled unconditionally (ordinary focus-order Tab) until pressed
// again.
//
// What's also left: Enter's "commit" auto-uppercase. When the cursor is
// about to leave a scene heading / transition / character cue, uppercase
// that line's real text (a normal undoable, collab-safe `view.dispatch`)
// before the newline is inserted — mirroring Final Draft's on-commit
// capitalization. Action and dialogue text is never touched.

import { KeyBinding, EditorView, Decoration } from '@codemirror/view';
import { StateField, StateEffect, MapMode, type Extension } from '@codemirror/state';
import { insertTab, indentLess } from '@codemirror/commands';
import { SCENE_PREFIX_RE, TRANSITIONS, dedupeUpper, harvestCueNames } from './screenplay-complete.ts';
import { BLOCK_CLASSES } from './fountain-highlight.ts';
import { planCycleStep, syntheticTextFor, type CycleElementType } from './fountain-cycle.ts';

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

// ── Tab element-cycling (item 3) ────────────────────────────────────────────

interface PendingCycle {
  /** The tracked line's start position — re-mapped through edits below. */
  pos: number;
  type: CycleElementType;
}

const setPendingCycle = StateEffect.define<PendingCycle | null>();

/**
 * The currently-pending Tab-cycle type, if any. Cleared automatically the
 * moment real content lands on the tracked line or the cursor leaves it —
 * "typing committing," per the design brief — so it never lingers as stale
 * state a later, unrelated Tab press could accidentally react to.
 */
export const pendingCycleField: StateField<PendingCycle | null> = StateField.define<PendingCycle | null>({
  create() {
    return null;
  },
  update(value, tr) {
    let next = value;
    if (next) {
      // MapMode.TrackDel: if the tracked line's start got deleted outright
      // (e.g. the whole line was removed), stop tracking it rather than
      // resolving to a nonsensical position.
      const mapped = tr.changes.mapPos(next.pos, -1, MapMode.TrackDel);
      next = mapped === null ? null : { pos: mapped, type: next.type };
    }
    let settingNew = false;
    for (const effect of tr.effects) {
      if (effect.is(setPendingCycle)) {
        next = effect.value;
        settingNew = true;
      }
    }
    // Skip the auto-clear checks for the very transaction that establishes
    // a NEW pending cycle — that transaction may itself insert this type's
    // synthetic text (e.g. "()" for parenthetical) as part of SETTING the
    // state, not as the writer typing real content.
    if (next && !settingNew) {
      const line = tr.state.doc.lineAt(Math.min(next.pos, tr.state.doc.length));
      const stillSynthetic = tr.state.doc.sliceString(line.from, line.to) === syntheticTextFor(next.type);
      if (line.text.trim() !== '' && !stillSynthetic) next = null; // real content typed
      if (next) {
        const head = tr.state.selection.main.head;
        if (head < line.from || head > line.to) next = null; // cursor left the line
      }
    }
    return next;
  },
});

// Ephemeral preview decoration for the pending cycle — reuses the SAME
// `.cm-sp-*` (screenplay-format.ts) and `.cm-fountain-*` (fountain-highlight
// .ts, via the imported BLOCK_CLASSES) classes real content gets, so the
// preview looks exactly like the real thing (indent, alignment, and — for
// 'character'/'transition' — the CSS text-transform:uppercase that makes
// lowercase-typed text visually appear uppercase without touching the
// buffer). `EditorView.decorations.compute` (not a full ViewPlugin) since
// this depends only on pendingCycleField's value, never a document parse.
export const pendingCycleDecorations: Extension = EditorView.decorations.compute([pendingCycleField], (state) => {
  const pending = state.field(pendingCycleField);
  if (!pending || pending.pos < 0 || pending.pos > state.doc.length) return Decoration.none;
  const line = state.doc.lineAt(pending.pos);
  const classes = [`cm-sp-${pending.type}`, BLOCK_CLASSES[pending.type]].filter(Boolean).join(' ');
  return Decoration.set([Decoration.line({ class: classes }).range(line.from)]);
});

// ── Escape-then-Tab / Ctrl-m escape hatches (accessibility) ────────────────

const armTabEscape = StateEffect.define<void>();
const consumeTabEscape = StateEffect.define<void>();

/** One-shot: true only until the NEXT transaction (a Tab press consumes it; anything else lapses it). */
const tabEscapeArmedField: StateField<boolean> = StateField.define<boolean>({
  create: () => false,
  update(value, tr) {
    for (const effect of tr.effects) {
      if (effect.is(armTabEscape)) return true;
      if (effect.is(consumeTabEscape)) return false;
    }
    return value && !(tr.docChanged || tr.selection) ? value : false;
  },
});

const toggleTabCapture = StateEffect.define<void>();

/** Persistent (until toggled again) — Ctrl-m's "stop capturing Tab entirely" mode. */
const tabCaptureDisabledField: StateField<boolean> = StateField.define<boolean>({
  create: () => false,
  update(value, tr) {
    for (const effect of tr.effects) if (effect.is(toggleTabCapture)) return !value;
    return value;
  },
});

/**
 * State fields + decoration this file's keymap depends on — must be added
 * to the EditorState's own `extensions` array alongside
 * `keymap.of(fountainKeymap(...))` (FountainEditor.tsx does this), since a
 * KeyBinding's `run()` reading `view.state.field(x)` throws if `x` was never
 * installed as an extension.
 */
export const fountainKeymapExtensions: Extension[] = [
  pendingCycleField,
  pendingCycleDecorations,
  tabEscapeArmedField,
  tabCaptureDisabledField,
];

/** Tab/Shift-Tab eligibility + line content, shared by both cycle directions. */
function cycleContext(view: EditorView) {
  const sel = view.state.selection.main;
  if (!sel.empty) return null; // don't hijack a real selection — fall through to insertTab's indentMore-on-selection behavior
  const line = view.state.doc.lineAt(sel.head);
  const pending = view.state.field(pendingCycleField, false);
  const isPendingHere = !!pending && pending.pos === line.from;
  const lineContent = view.state.doc.sliceString(line.from, line.to);
  const isEmpty = lineContent.trim() === '';
  const isUntouchedSynthetic = isPendingHere && syntheticTextFor(pending!.type) === lineContent && lineContent !== '';
  if (!isEmpty && !isUntouchedSynthetic) return null; // real content already here — not a cycling position
  if (!isBlankOrDocStart(view, line.number)) return null; // scene heading/cue/transition aren't legal here anyway
  return { line, currentType: isPendingHere ? pending!.type : null, currentContent: lineContent };
}

function cycleElement(view: EditorView, dir: 1 | -1): boolean {
  const ctx = cycleContext(view);
  if (!ctx) return false;
  const { line, currentType, currentContent } = ctx;
  const plan = planCycleStep(currentType, dir);
  view.dispatch({
    changes: { from: line.from, to: line.from + currentContent.length, insert: plan.insertText },
    selection: { anchor: line.from + plan.cursorOffset },
    effects: setPendingCycle.of({ pos: line.from, type: plan.nextType }),
    scrollIntoView: true,
  });
  return true;
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
    // Escape: FIRST job is dismissing a pending Tab-cycle, if one is active
    // (returns true — handled — so nothing else reacts to this Escape).
    // Otherwise arms the "next Tab exits" flag and returns FALSE (unhandled)
    // so any other Escape behavior (autocompletion's own Prec.highest
    // closeCompletion, the app's panel-closing ladder) still runs normally —
    // this binding never swallows Escape on its own.
    {
      key: 'Escape',
      run(view) {
        if (view.state.field(pendingCycleField, false)) {
          view.dispatch({ effects: setPendingCycle.of(null) });
          return true;
        }
        view.dispatch({ effects: armTabEscape.of() });
        return false;
      },
    },
    // Ctrl-m: the other common CodeMirror convention for this — toggles
    // whether Tab/Shift-Tab are captured at all versus always left to move
    // focus, persistently until pressed again.
    {
      key: 'Ctrl-m',
      run(view) {
        view.dispatch({ effects: toggleTabCapture.of() });
        return true;
      },
    },
    {
      key: 'Tab',
      run(view) {
        if (view.state.field(tabCaptureDisabledField, false)) return false;
        if (view.state.field(tabEscapeArmedField, false)) {
          view.dispatch({ effects: consumeTabEscape.of() });
          return false;
        }
        return cycleElement(view, 1) || insertTab(view);
      },
    },
    {
      key: 'Shift-Tab',
      run(view) {
        if (view.state.field(tabCaptureDisabledField, false)) return false;
        if (view.state.field(tabEscapeArmedField, false)) {
          view.dispatch({ effects: consumeTabEscape.of() });
          return false;
        }
        return cycleElement(view, -1) || indentLess(view);
      },
    },
  ];
}
