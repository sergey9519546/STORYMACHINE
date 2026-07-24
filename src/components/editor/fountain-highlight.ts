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

    // parseFountain (src/lib/fountain.ts) splits the doc on '\n', so every
    // block.text is exactly one line — no embedded newlines to walk.
    const lineNo = block.lineNumber;
    if (lineNo < 1 || lineNo > state.doc.lines) continue;

    const line = state.doc.line(lineNo);
    try {
      builder.add(line.from, line.from, Decoration.line({ class: cls }));
    } catch {
      // RangeSetBuilder requires strictly ascending from values; skip if out-of-order
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
// Paper·ink·stamp palette: hierarchy comes from weight, case, italic and
// opacity on one warm ink — not a rainbow of peer accents. The single stamp
// red is reserved for the scene heading (the structural landmark a reader
// scans for) so the accent stays meaningful rather than decorative.
export const fountainTheme = EditorView.baseTheme({
  '.cm-fountain-scene':       { fontWeight: '700', letterSpacing: '0.02em', color: 'var(--sm-stamp, #c1301c)' },
  '.cm-fountain-character':   { fontWeight: '700', color: 'var(--sm-ink, #211d15)' },
  '.cm-fountain-parenthetical': { fontStyle: 'italic', color: 'rgba(33,29,21,0.55)' },
  '.cm-fountain-dialogue':    { color: 'var(--sm-ink, #211d15)' },
  '.cm-fountain-transition':  { fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'rgba(33,29,21,0.70)' },
  '.cm-fountain-lyrics':      { fontStyle: 'italic', color: 'rgba(33,29,21,0.60)' },
  '.cm-fountain-section':     { fontWeight: '700', color: 'rgba(33,29,21,0.45)' },
  '.cm-fountain-synopsis':    { fontStyle: 'italic', color: 'rgba(33,29,21,0.50)' },
  '.cm-fountain-note':        { color: 'rgba(33,29,21,0.40)' },
  // Dark mode overrides — applied when .dark ancestor is present. Scene keeps a
  // brighter stamp so it still reads as the one accent on the dark sheet.
  '.dark & .cm-fountain-scene':         { color: '#e0654f' },
  '.dark & .cm-fountain-character':     { color: '#f4f0e6' },
  '.dark & .cm-fountain-dialogue':      { color: '#e4e4e7' },
  '.dark & .cm-fountain-parenthetical': { color: 'rgba(228,228,231,0.60)' },
  '.dark & .cm-fountain-transition':    { color: 'rgba(228,228,231,0.75)' },
});
