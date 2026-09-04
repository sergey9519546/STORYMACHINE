// Visual styling for @codemirror/search's built-in find/replace panel (item
// 4, docs/PATH_TO_EXCELLENCE.md upgrade-exports-editor pass) — matching this
// app's "paper · ink · stamp" chrome (see src/styles/design-system.css and
// e.g. ShortcutModal.tsx / CommandPalette.tsx for the same token vocabulary)
// instead of the library's stock dark-blue/yellow defaults.
//
// Deliberately uses `EditorView.theme()` (regular precedence), NOT
// `EditorView.baseTheme()`: @codemirror/search ships its own
// `EditorView.baseTheme(...)` for `.cm-panel.cm-search` / `.cm-searchMatch` /
// `.cm-searchMatch-selected` (see its dist/index.js), and baseTheme-vs-
// baseTheme precedence between two different extensions is not guaranteed —
// a regular theme() reliably wins over any baseTheme(), which is what
// actually overriding those built-in colors requires.
//
// The `--sm-*` design tokens are a single fixed warm-paper palette used
// everywhere in this app regardless of the EDITOR's own light/dark theme
// (see FountainEditor.tsx's darkTheme/lightTheme — those recolor only
// `.cm-content`, never the app chrome) — so, like ShortcutModal.tsx and
// CommandPalette.tsx, this file references them directly with no
// `&dark`/`&light` variants of its own.

import { EditorView } from '@codemirror/view';

export const searchPanelTheme = EditorView.theme({
  '.cm-panel.cm-search': {
    background: 'var(--sm-panel, #f4efe2)',
    color: 'var(--sm-ink, #211d15)',
    borderBottom: '1.5px solid var(--sm-ink, #211d15)',
    fontFamily: 'var(--sm-font-mono, ui-monospace, monospace)',
    fontSize: '11px',
    padding: '8px 34px 8px 12px',
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: '2px',
  },
  '.cm-panel.cm-search input, .cm-panel.cm-search button, .cm-panel.cm-search label': {
    margin: '2px 6px 2px 0',
  },
  '.cm-panel.cm-search .cm-textfield': {
    background: 'var(--sm-paper, #e6dfcf)',
    color: 'var(--sm-ink, #211d15)',
    border: '1px solid var(--sm-hair, #d3cab3)',
    borderRadius: '2px',
    padding: '3px 6px',
    fontFamily: 'inherit',
    fontSize: 'inherit',
    outline: 'none',
  },
  '.cm-panel.cm-search .cm-textfield:focus': {
    borderColor: 'var(--sm-stamp, #c1301c)',
  },
  '.cm-panel.cm-search .cm-button': {
    background: 'var(--sm-panel, #f4efe2)',
    color: 'var(--sm-ink, #211d15)',
    border: '1.5px solid var(--sm-ink, #211d15)',
    borderRadius: '2px',
    padding: '3px 9px',
    fontFamily: 'inherit',
    fontSize: '10px',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    cursor: 'pointer',
    backgroundImage: 'none',
  },
  '.cm-panel.cm-search .cm-button:hover': {
    background: 'var(--sm-ink, #211d15)',
    color: 'var(--sm-paper, #e6dfcf)',
  },
  '.cm-panel.cm-search label': {
    color: 'var(--sm-ink-mute, #6b6152)',
    fontSize: '10px',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  },
  '.cm-panel.cm-search [name=close]': {
    color: 'var(--sm-ink-faint, #6f6553)',
    fontSize: '16px',
    lineHeight: '1',
  },
  '.cm-panel.cm-search [name=close]:hover': {
    color: 'var(--sm-ink, #211d15)',
  },
  // Match highlighting inside the document: the app's one stamp-red accent
  // instead of the library's default yellow/cyan, with the CURRENT match
  // meaningfully stronger than the rest so cycling through results (F3 /
  // Mod-g) is easy to track.
  '.cm-searchMatch': {
    backgroundColor: 'rgba(193,48,28,0.22)',
    outline: '1px solid rgba(193,48,28,0.35)',
  },
  '.cm-searchMatch-selected': {
    backgroundColor: 'rgba(193,48,28,0.45)',
    outline: '1px solid var(--sm-stamp, #c1301c)',
  },
});
