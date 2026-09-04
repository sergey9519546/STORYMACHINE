// Fountain syntax highlighting for CodeMirror 6.
// Re-uses parseFountain() from src/lib/fountain.ts so block-type detection
// stays in one place. The plugin recomputes decorations incrementally (see
// incremental-decorator.ts) — only the changed + visible line ranges on
// every keystroke, with a full reparse on idle — rather than re-parsing the
// whole document on every doc change.

import { EditorView } from '@codemirror/view';
import { FountainBlockType } from '../../lib/fountain.ts';
import { incrementalFountainDecorator } from './incremental-decorator.ts';

// ── Tailwind-equivalent class names for each block type ──────────────────────
// Exported so fountain-keymap.ts's Tab element-cycling preview (an ephemeral
// decoration on an as-yet-untyped line — see that file) can reuse the SAME
// color classes real content gets, instead of a second, drifting copy.
export const BLOCK_CLASSES: Partial<Record<FountainBlockType, string>> = {
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

// ── Incremental line-level decoration plugin ─────────────────────────────────
// See incremental-decorator.ts for the strategy and correctness reasoning.
export const fountainHighlight = incrementalFountainDecorator((type) => BLOCK_CLASSES[type]);

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
