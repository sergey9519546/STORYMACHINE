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
import { closeBrackets } from '@codemirror/autocomplete';

import { fountainHighlight, fountainTheme } from './fountain-highlight.ts';
import { inlineComplete, CompletionContext } from './inline-complete.ts';
import { fountainKeymap, FountainKeymapOptions } from './fountain-keymap.ts';

export interface FountainEditorHandle {
  /** Navigate to a specific 1-indexed line number */
  navigateTo(line: number): void;
  /** Returns the EditorView for advanced integrations */
  getView(): EditorView | null;
}

export interface FountainEditorProps {
  value: string;
  onChange: (value: string) => void;
  onCharacterEnter?: FountainKeymapOptions['onCharacterEnter'];
  characters?: string[];
  completionCtx?: CompletionContext;
  isDarkMode?: boolean;
  placeholder?: string;
  className?: string;
  /** Fires when the user types (after every doc change, before debounce) */
  onUserEdit?: () => void;
}

// ── Shared base theme ─────────────────────────────────────────────────────────
const baseTheme = EditorView.baseTheme({
  '&': {
    fontFamily: "'Courier New', Courier, monospace",
    fontSize: '18px',
    lineHeight: '1.65',
    height: '100%',
  },
  '.cm-scroller': { overflow: 'auto', padding: '2rem' },
  '.cm-content': { padding: 0, caretColor: '#000' },
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
  '.cm-content': { caretColor: '#e4e4e7' },
  '.cm-selectionBackground': { background: '#374151 !important' },
  '.cm-activeLine': { background: '#2a2a2a' },
  '.cm-placeholder': { color: '#6b7280' },
}, { dark: true });

const lightTheme = EditorView.theme({
  '&': { background: '#ffffff', color: '#18181b' },
  '.cm-activeLine': { background: '#f9f9f9' },
});

// ── Component ─────────────────────────────────────────────────────────────────
const FountainEditor = forwardRef<FountainEditorHandle, FountainEditorProps>(
  function FountainEditor(
    {
      value,
      onChange,
      onCharacterEnter,
      characters = [],
      completionCtx = {},
      isDarkMode = false,
      placeholder: placeholderText = 'INT. STUDIO - DAY\n\nStart typing your script here...',
      className = '',
      onUserEdit,
    },
    ref,
  ) {
    const containerRef = useRef<HTMLDivElement>(null);
    const viewRef = useRef<EditorView | null>(null);
    // Store latest callbacks in a ref so the closure inside EditorView doesn't go stale
    const onChangeRef = useRef(onChange);
    const onCharEnterRef = useRef(onCharacterEnter);
    const onUserEditRef = useRef(onUserEdit);
    const charactersRef = useRef(characters);
    useEffect(() => { onChangeRef.current = onChange; });
    useEffect(() => { onCharEnterRef.current = onCharacterEnter; });
    useEffect(() => { onUserEditRef.current = onUserEdit; });
    useEffect(() => { charactersRef.current = characters; });

    // ── Compartments allow hot-swapping extensions without rebuilding state ────
    const themeCompartment = useRef(new Compartment());
    const completionCompartment = useRef(new Compartment());

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
      [completionCtx?.directorStyle, completionCtx?.genre, JSON.stringify(completionCtx?.characters)],
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
        onCharacterEnter(name, cursor) {
          onCharEnterRef.current?.(name, cursor);
        },
      });

      const state = EditorState.create({
        doc: value,
        extensions: [
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
          // ── Fountain highlighting ───────────────────────────────────────────
          fountainHighlight,
          fountainTheme,
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

      return () => {
        view.destroy();
        viewRef.current = null;
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // run once — value/extensions are hot-patched below

    // ── Sync external value changes (e.g. snapshot restore) ──────────────────
    useEffect(() => {
      const view = viewRef.current;
      if (!view) return;
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
