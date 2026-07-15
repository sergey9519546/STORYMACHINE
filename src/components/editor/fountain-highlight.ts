// Fountain syntax highlighting for CodeMirror 6.
// Re-uses parseFountain() from src/lib/fountain.ts so block-type detection
// stays in one place. The plugin runs on every doc change and replaces the
// old line-decoration set with a fresh one.

import { EditorView, ViewPlugin, Decoration, DecorationSet } from '@codemirror/view';
import { EditorState, RangeSetBuilder } from '@codemirror/state';
import { parseFountain, FountainBlockType } from '../../lib/fountain.ts';

// ── Tailwind-equivalent class names for each block type ──────────────────────
const BLOCK_CLASSES: Partial<Record<FountainBlockType, string>> = {
  scene_heading: 'cm-fountain-scene',
  character:     'cm-fountain-character',
  dual_dialogue: 'cm-fountain-character',
  parenthetical: 'cm-fountain-parenthetical',
  dialogue:      'cm-fountain-dialogue',
  transition:    'cm-fountain-transition',
  lyrics:        'cm-fountain-lyrics',
  section:       'cm-fountain-section',
  synopsis:      'cm-fountain-synopsis',
  note:          'cm-fountain-note',
};

// ── Line-level decoration builder ────────────────────────────────────────────
function buildDecorations(state: EditorState): DecorationSet {
  const doc = state.doc.toString();
  const blocks = parseFountain(doc);
  const builder = new RangeSetBuilder<Decoration>();

  // parseFountain gives us blocks with line-accurate offsets via lineNumber (1-indexed).
  // Walk the blocks and mark each line with its decoration class.
  for (const block of blocks) {
    const cls = BLOCK_CLASSES[block.type];
    if (!cls) continue;
    let startIndex = 0;
    let offset = 0;
    while (startIndex <= block.text.length) {
      const nextNewline = block.text.indexOf('\n', startIndex);
      const lineNo = block.lineNumber + offset;          // 1-indexed

      if (lineNo >= 1 && lineNo <= state.doc.lines) {
        const line = state.doc.line(lineNo);
        try {
          builder.add(line.from, line.from, Decoration.line({ class: cls }));
        } catch {
          // RangeSetBuilder requires strictly ascending from values; skip if out-of-order
        }
      }

      if (nextNewline === -1) break;
      startIndex = nextNewline + 1;
      offset++;
    }
  }

  return builder.finish();
}

export const fountainHighlight = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;
    constructor(view: EditorView) {
      this.decorations = buildDecorations(view.state);
    }
    update(update: { docChanged: boolean; state: EditorState }) {
      if (update.docChanged) {
        this.decorations = buildDecorations(update.state);
      }
    }
  },
  { decorations: (v) => v.decorations },
);

// ── Base theme (applied via EditorView.baseTheme) ────────────────────────────
// Light and dark variants use .cm-fountain-* classes defined here.
export const fountainTheme = EditorView.baseTheme({
  '.cm-fountain-scene':       { fontWeight: '700', color: '#2563eb' },
  '.cm-fountain-character':   { fontWeight: '700', color: '#7c3aed' },
  '.cm-fountain-parenthetical': { fontStyle: 'italic', color: '#71717a' },
  '.cm-fountain-dialogue':    { color: '#27272a' },
  '.cm-fountain-transition':  { fontWeight: '700', textTransform: 'uppercase', color: '#f97316' },
  '.cm-fountain-lyrics':      { fontStyle: 'italic', color: '#71717a' },
  '.cm-fountain-section':     { fontWeight: '700', color: '#0891b2' },
  '.cm-fountain-synopsis':    { fontStyle: 'italic', color: '#6b7280' },
  '.cm-fountain-note':        { color: '#9ca3af' },
  // Dark mode overrides — applied when .dark ancestor is present
  '.dark & .cm-fountain-scene':       { color: '#60a5fa' },
  '.dark & .cm-fountain-character':   { color: '#a78bfa' },
  '.dark & .cm-fountain-dialogue':    { color: '#e4e4e7' },
});
