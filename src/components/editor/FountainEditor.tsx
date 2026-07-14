// FountainEditor — CodeMirror 6 editor with:
//   • Fountain syntax highlighting
//   • Inline AI ghost-text completions (Tab=accept, Ctrl-Right=word, Esc=dismiss)
//   • Fountain-specific keybindings (i→INT., e→EXT., Tab char-autocomplete)
//   • Light / dark themes
//   • Programmatic navigation via ref

import React, {
  useEffect,
  useRef,
  useImperativeHandle,
  forwardRef,
  useMemo,
} from 'react';

import { EditorView, keymap } from '@codemirror/view';
import { EditorState, Compartment } from '@codemirror/state';
import { history, defaultKeymap, historyKeymap, standardKeymap } from '@codemirror/commands';
import { highlightActiveLine, lineNumbers, drawSelection } from '@codemirror/view';
import { closeBrackets, autocompletion } from '@codemirror/autocomplete';

import { fountainHighlight, fountainTheme } from './fountain-highlight.ts';
import { screenplayFormat, screenplayFormatTheme } from './screenplay-format.ts';
import { inlineComplete, CompletionContext } from './inline-complete.ts';
import { fountainKeymap } from './fountain-keymap.ts';
import { screenplayComplete } from './screenplay-complete.ts';
import { createCollabSession, CollabSession } from './collab.ts';
import { scriptDiagnostics } from './diagnostics.ts';

export interface FountainEditorHandle {
  /** Navigate to a specific 1-indexed line number */
  navigateTo(line: number): void;
  /** Returns the EditorView for advanced integrations */
  getView(): EditorView | null;
}

export interface FountainEditorProps {
  value: string;
  onChange: (value: string) => void;
  characters?: string[];
  completionCtx?: CompletionContext;
  isDarkMode?: boolean;
  placeholder?: string;
  className?: string;
  /** Fires when the user types (after every doc change, before debounce) */
  onUserEdit?: () => void;
  /**
   * P4: when set, the editor joins a real-time collaboration room of this id.
   * Yjs becomes the source of truth for the document; the `value` prop is used
   * only to seed an empty shared doc, and external value-sync is disabled.
   */
  collabRoom?: string;
  /** Display name for this user's remote cursor in collaboration mode. */
  collabUserName?: string;
  /**
   * "Live Notes" — when true, the editor debounces after typing and diagnoses
   * the script against POST /api/scriptide/diagnose, rendering issues as
   * squiggle underlines with hover tooltips (see diagnostics.ts). Keyless
   * feature, off by default (see Toolbar/ScriptIDE "Live Notes" toggle).
   */
  liveDiagnostics?: boolean;
}

// ── Shared base theme ─────────────────────────────────────────────────────────
// Centered screenplay page: `.cm-content` IS the page (paper-colored, fixed
// text-column width, shadow); `.cm-scroller` is the muted canvas it floats
// on. Sizing is derived from screenplay-layout.ts, not invented: 60ch below
// equals SPEC.action.widthChars (the same Courier 12pt/10cpi text band the
// PDF export wraps to) — `ch` keeps that exact regardless of font-size — and
// the 1in padding matches TOP_MARGIN/BOTTOM_MARGIN there, giving an overall
// page width of ~816px @ 96dpi (60ch ≈ 624px text column + 2×1in margins),
// same US-Letter proportions the export uses.
const baseTheme = EditorView.baseTheme({
  '&': {
    fontFamily: "var(--font-courier, 'Courier Prime', 'Courier New', Courier, monospace)",
    // Tuned so 60 monospace characters (SPEC's action/scene-heading band)
    // fill roughly the ~624px text column described above, instead of an
    // arbitrary UI font size.
    fontSize: '17px',
    lineHeight: '1.65',
    height: '100%',
  },
  '.cm-scroller': {
    overflow: 'auto',
    padding: '3rem 1.5rem',
    background: '#E7E1D2', // muted canvas the page sits on (light default)
  },
  '.cm-content': {
    // content-box so `width` is the 60ch TEXT column and the 1in page margins
    // add AROUND it — CM6's default border-box would subtract the padding from
    // the 60ch, collapsing the writable band to ~41ch and wrapping every line
    // short of the industry measure.
    boxSizing: 'content-box',
    width: '60ch',
    maxWidth: '60ch',
    flexGrow: '0',
    flexShrink: '0',
    margin: '0 auto',
    padding: '1in', // industry-standard 1in top/bottom/left/right page margins
    background: '#F4F0E6', // paper (light default)
    boxShadow: '0 2px 16px rgba(0,0,0,0.18)',
    caretColor: '#000',
  },
  '.cm-line': { padding: '0' },
  '.cm-placeholder': { color: '#9ca3af', fontStyle: 'normal' },
  // Remove the border CM6 adds by default
  '&.cm-focused': { outline: 'none' },
  '&.cm-editor': { background: 'transparent' },
  // Selection styling
  '.cm-selectionBackground': { background: '#bfdbfe !important' },  // blue-100
});

const darkTheme = EditorView.theme({
  '&': { background: '#1a1a1a', color: '#e4e4e7' },
  '.cm-scroller': { background: '#141414' },
  '.cm-content': {
    background: '#242424',
    color: '#e4e4e7',
    caretColor: '#e4e4e7',
    boxShadow: '0 2px 16px rgba(0,0,0,0.6)',
  },
  '.cm-selectionBackground': { background: '#374151 !important' },
  '.cm-activeLine': { background: '#2a2a2a' },
  '.cm-placeholder': { color: '#6b7280' },
}, { dark: true });

const lightTheme = EditorView.theme({
  '&': { background: '#ffffff', color: '#18181b' },
  '.cm-scroller': { background: '#E7E1D2' },
  '.cm-content': { background: '#F4F0E6', color: '#18181b' },
  '.cm-activeLine': { background: 'rgba(0, 0, 0, 0.04)' },
});

// ── Component ─────────────────────────────────────────────────────────────────
const FountainEditor = forwardRef<FountainEditorHandle, FountainEditorProps>(
  function FountainEditor(
    {
      value,
      onChange,
      characters = [],
      completionCtx = {},
      isDarkMode = false,
      placeholder: placeholderText = 'INT. STUDIO - DAY\n\nStart typing your script here...',
      className = '',
      onUserEdit,
      collabRoom,
      collabUserName,
      liveDiagnostics = false,
    },
    ref,
  ) {
    const containerRef = useRef<HTMLDivElement>(null);
    const viewRef = useRef<EditorView | null>(null);
    // Store latest callbacks in a ref so the closure inside EditorView doesn't go stale
    const onChangeRef = useRef(onChange);
    const onUserEditRef = useRef(onUserEdit);
    const charactersRef = useRef(characters);
    useEffect(() => { onChangeRef.current = onChange; });
    useEffect(() => { onUserEditRef.current = onUserEdit; });
    useEffect(() => { charactersRef.current = characters; });

    // ── Compartments allow hot-swapping extensions without rebuilding state ────
    const themeCompartment = useRef(new Compartment());
    const completionCompartment = useRef(new Compartment());
    // Live Notes: holds scriptDiagnostics() when enabled, [] when disabled —
    // hot-swapped below the same way themeCompartment/completionCompartment are.
    const diagnosticsCompartment = useRef(new Compartment());
    // P4: joining a collab room now requires fetching an auth token first
    // (see collab.ts), so the extension can't be included synchronously at
    // EditorState.create() time — this compartment starts empty and is
    // hot-swapped in once the async session resolves, below.
    const collabCompartment = useRef(new Compartment());
    // P4: live for the editor's lifetime when a collab room is set at mount.
    const collabRef = useRef<CollabSession | null>(null);

    // ── Expose imperative handle ──────────────────────────────────────────────
    useImperativeHandle(ref, () => ({
      navigateTo(lineNo: number) {
        const view = viewRef.current;
        if (!view) return;
        const line = view.state.doc.line(
          Math.max(1, Math.min(lineNo, view.state.doc.lines)),
        );
        view.dispatch({
          selection: { anchor: line.from },
          scrollIntoView: true,
          effects: EditorView.scrollIntoView(line.from, { y: 'center' }),
        });
        view.focus();
      },
      getView: () => viewRef.current,
    }));

    // ── Build the inline completion extension with fresh context ──────────────
    const completionExt = useMemo(
      () => inlineComplete(completionCtx),
      // Re-create when context keys change
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [completionCtx?.directorStyle, completionCtx?.genre, completionCtx?.persona, JSON.stringify(completionCtx?.characters)],
    );

    // ── Create EditorView once on mount ──────────────────────────────────────
    useEffect(() => {
      if (!containerRef.current) return;

      const updateListener = EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          const newVal = update.state.doc.toString();
          onChangeRef.current(newVal);
          onUserEditRef.current?.();
        }
      });

      const fountainKm = fountainKeymap({
        get characters() { return charactersRef.current; },
      });

      // Context-aware element autocomplete (scene-heading prefixes,
      // locations, time-of-day, transitions, character cues) — see
      // screenplay-complete.ts. `characters` is read live via the same
      // ref-backed getter as fountainKm above, so prop changes don't require
      // rebuilding this extension. Enter/click accept, arrows navigate; Tab
      // is deliberately left to inline-complete's ghost-text accept below —
      // the default completionKeymap in this CodeMirror version only binds
      // Enter, so there's no collision to guard against.
      const screenplayCompletion = autocompletion({
        activateOnTyping: true,
        icons: false,
        override: [screenplayComplete({ get characters() { return charactersRef.current; } })],
      });

      const state = EditorState.create({
        // When collaborating, start empty — Yjs is the source of truth.
        doc: collabRoom ? '' : value,
        extensions: [
          // ── Collaboration (Yjs) — must precede history for proper undo scoping.
          // Starts empty; createCollabSession() below is async (it fetches a room
          // token first), so the real extension is hot-swapped in once ready. ──
          collabCompartment.current.of([]),
          // ── History (undo/redo) ─────────────────────────────────────────────
          history(),
          // ── Standard editing keybindings ───────────────────────────────────
          // Place fountain-specific bindings BEFORE default so our handlers run first.
          keymap.of([
            ...fountainKm,
            ...defaultKeymap,
            ...historyKeymap,
            ...standardKeymap,
          ]),
          // ── Inline completions (Tab=accept sits inside this) ─────────────────
          completionCompartment.current.of(completionExt),
          // ── Screenplay element autocomplete (Enter/click accept) ─────────────
          screenplayCompletion,
          // ── Live Notes: in-editor narrative diagnostics (squiggles + hover) ──
          diagnosticsCompartment.current.of(liveDiagnostics ? scriptDiagnostics() : []),
          // ── Fountain highlighting ───────────────────────────────────────────
          fountainHighlight,
          fountainTheme,
          // ── Screenplay page formatting (view-only — CSS padding/alignment
          // decorations derived from screenplay-layout.ts's SPEC; never
          // touches the buffer). Composes with fountainHighlight's color
          // classes above via distinct `.cm-sp-*` class names on the same
          // line. lineWrapping lets long action/dialogue lines soft-wrap
          // inside the page column instead of scrolling horizontally. ──────
          screenplayFormat,
          screenplayFormatTheme,
          EditorView.lineWrapping,
          // ── Visual ─────────────────────────────────────────────────────────
          drawSelection(),
          highlightActiveLine(),
          closeBrackets(),
          baseTheme,
          themeCompartment.current.of(isDarkMode ? darkTheme : lightTheme),
          // ── Change listener ─────────────────────────────────────────────────
          updateListener,
          // ── Placeholder ────────────────────────────────────────────────────
          EditorView.contentAttributes.of({ 'aria-label': 'Script editor', spellcheck: 'false' }),
        ],
      });

      const view = new EditorView({
        state,
        parent: containerRef.current,
      });

      viewRef.current = view;

      // P4: in collaboration mode, Yjs owns the document. Join is async (it
      // fetches a room auth token before opening the socket — see collab.ts) —
      // guarded by `torndown` so a fast unmount can't create/dispatch to a
      // socket after teardown, and so a component that unmounts before the
      // fetch resolves still tears down the session rather than leaking it.
      let torndown = false;
      if (collabRoom) {
        createCollabSession({
          room: collabRoom,
          userName: collabUserName,
          initialText: value,
        }).then((session) => {
          if (torndown) { session.destroy(); return; }
          collabRef.current = session;
          view.dispatch({ effects: collabCompartment.current.reconfigure(session.extension) });
        }).catch((err) => {
          // Non-fatal: the editor keeps working locally without live collaboration.
          console.error('Failed to join collaboration session:', err);
        });
      }

      return () => {
        torndown = true;
        view.destroy();
        viewRef.current = null;
        // Release the collaboration socket + shared doc on unmount.
        collabRef.current?.destroy();
        collabRef.current = null;
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // run once — value/extensions are hot-patched below

    // ── Sync external value changes (e.g. snapshot restore) ──────────────────
    useEffect(() => {
      const view = viewRef.current;
      if (!view) return;
      // In collaboration mode Yjs owns the document — never overwrite it from the
      // `value` prop, or we would clobber remote edits.
      if (collabRef.current) return;
      const currentDoc = view.state.doc.toString();
      if (currentDoc === value) return; // no-op
      view.dispatch({
        changes: { from: 0, to: currentDoc.length, insert: value },
        // Preserve cursor when possible
        selection: { anchor: Math.min(view.state.selection.main.anchor, value.length) },
      });
    }, [value]);

    // ── Hot-swap theme ────────────────────────────────────────────────────────
    useEffect(() => {
      const view = viewRef.current;
      if (!view) return;
      view.dispatch({
        effects: themeCompartment.current.reconfigure(isDarkMode ? darkTheme : lightTheme),
      });
    }, [isDarkMode]);

    // ── Hot-swap completion context when context props change ─────────────────
    useEffect(() => {
      const view = viewRef.current;
      if (!view) return;
      view.dispatch({
        effects: completionCompartment.current.reconfigure(completionExt),
      });
    }, [completionExt]);

    // ── Hot-swap Live Notes on/off ─────────────────────────────────────────────
    useEffect(() => {
      const view = viewRef.current;
      if (!view) return;
      view.dispatch({
        effects: diagnosticsCompartment.current.reconfigure(
          liveDiagnostics ? scriptDiagnostics() : [],
        ),
      });
    }, [liveDiagnostics]);

    return (
      <div
        ref={containerRef}
        className={`absolute inset-0 overflow-auto ${className}`}
        style={{ fontFamily: "'Courier New', Courier, monospace" }}
      />
    );
  },
);

FountainEditor.displayName = 'FountainEditor';
export default FountainEditor;
