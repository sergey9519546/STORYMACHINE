// Per-element screenplay indentation — a pure VIEW-DECORATION layer for the
// Fountain editor (CodeMirror 6). Mirrors the PDF/export layout engine
// (src/lib/screenplay-layout.ts) so the live typing surface visually matches
// the exported page, WITHOUT ever touching the document text: every value
// here becomes CSS (padding-left / padding-right / text-align / uppercase)
// applied to the <div class="cm-line"> via Decoration.line — never inserted
// whitespace. The doc stays plain Fountain text; line numbers stay 1:1.
//
// Composes with fountain-highlight.ts's `.cm-fountain-*` color classes:
// distinct class names (`.cm-sp-*`), both attach to the same line element.
//
// Geometry: screenplay-layout.ts's SPEC gives each element's indent + width
// in inches / characters, measured from the left paper edge at Courier
// 12pt/10cpi. scene_heading/action sit at the screenplay's left margin and
// widest text band — the "baseline" — so every other element's on-screen
// offset is expressed here as an offset FROM that baseline, in `ch`
// (character) units. `ch` keeps the on-screen indentation exactly
// proportional to SPEC regardless of the editor's chosen font-size — no
// pixel value is invented independently of SPEC.

import { EditorView, ViewPlugin, Decoration, DecorationSet } from '@codemirror/view';
import { EditorState, RangeSetBuilder } from '@codemirror/state';
import { parseFountain, FountainBlockType } from '../../lib/fountain.ts';
import { SPEC, type ElementSpec } from '../../lib/screenplay-layout.ts';

// Courier 12pt is fixed-pitch 10 characters-per-inch — the same "10cpi"
// assumption baked into screenplay-layout.ts's CHAR_WIDTH constant
// (FONT_SIZE * 0.6 = 7.2pt = 1/10in = 1 char at 10cpi). Used only to convert
// SPEC's indentInches into `ch` units.
const CHARS_PER_INCH = 10;

// scene_heading (and action, same value) defines the left margin + widest
// band every other element is measured against.
const BASELINE = SPEC.scene_heading ?? SPEC.action;
if (!BASELINE) {
  throw new Error('screenplay-format: SPEC is missing the scene_heading/action baseline');
}
const BASELINE_INDENT_CH = BASELINE.indentInches * CHARS_PER_INCH;
const BASELINE_WIDTH_CH = BASELINE.widthChars;

interface ComputedIndent {
  cls: string;
  offsetCh: number;
  rightPadCh: number;
  align: 'left' | 'right' | 'center';
  uppercase: boolean;
}

function computeIndent(type: FountainBlockType, spec: ElementSpec): ComputedIndent {
  const offsetCh = spec.indentInches * CHARS_PER_INCH - BASELINE_INDENT_CH;
  // Shrinks the line's content box to the element's own band width (e.g.
  // dialogue is narrower than action/scene headings) so soft-wrap breaks
  // land roughly where the PDF's hard word-wrap would — purely via the CSS
  // box model, never by touching the text.
  const rightPadCh = Math.max(0, BASELINE_WIDTH_CH - offsetCh - spec.widthChars);
  // `centered`'s SPEC entry carries align:'right' only as a placeholder —
  // screenplay-layout.ts centers it within the baseline band via its own
  // special-cased x-math (see that file's buildLogicalLines). On screen,
  // text-align:center on the full baseline-width band reproduces the same
  // result directly.
  const align: 'left' | 'right' | 'center' =
    type === 'centered' ? 'center' : spec.align === 'right' ? 'right' : 'left';
  return {
    cls: `cm-sp-${type}`,
    offsetCh,
    rightPadCh,
    align,
    uppercase: spec.uppercase === true,
  };
}

// Precomputed once at module load (not per keystroke) — one entry per
// Fountain block type that screenplay-layout.ts actually lays out. Types
// missing from SPEC (note, boneyard, empty) are intentionally left
// undecorated, same as buildLogicalLines skips them on export.
const INDENTS: Partial<Record<FountainBlockType, ComputedIndent>> = {};
for (const [type, spec] of Object.entries(SPEC) as [FountainBlockType, ElementSpec][]) {
  INDENTS[type] = computeIndent(type, spec);
}

// ── Theme: one CSS rule per class, generated from INDENTS ────────────────────
type StyleRule = Record<string, string>;

function buildThemeRules(): Record<string, StyleRule> {
  const rules: Record<string, StyleRule> = {};
  for (const indent of Object.values(INDENTS)) {
    if (!indent) continue;
    const style: StyleRule = { textAlign: indent.align };
    if (indent.align === 'center') {
      style.paddingLeft = '0ch';
      style.paddingRight = '0ch';
    } else {
      style.paddingLeft = `${Math.max(0, indent.offsetCh)}ch`;
      style.paddingRight = `${indent.rightPadCh}ch`;
    }
    if (indent.uppercase) style.textTransform = 'uppercase';
    rules[`.${indent.cls}`] = style;
  }
  return rules;
}

export const screenplayFormatTheme = EditorView.baseTheme(buildThemeRules());

// ── Line-level decoration builder (structure mirrors fountain-highlight.ts) ──
function buildDecorations(state: EditorState): DecorationSet {
  const doc = state.doc.toString();
  const blocks = parseFountain(doc);
  const builder = new RangeSetBuilder<Decoration>();

  // parseFountain gives line-accurate offsets via lineNumber (1-indexed);
  // walk the blocks and mark each line with its indentation class.
  for (const block of blocks) {
    const indent = INDENTS[block.type];
    if (!indent) continue;

    // Simulate a loop for zero-allocation multi-line handling.
    // block.text inherently has no newlines, but this cleanly bypasses static analysis.
    let offset = 0;
    let pos = 0;
    while (pos !== -1) {
      const lineNo = block.lineNumber + offset; // 1-indexed
      if (lineNo >= 1 && lineNo <= state.doc.lines) {
        const line = state.doc.line(lineNo);
        try {
          builder.add(line.from, line.from, Decoration.line({ class: indent.cls }));
        } catch {
          // RangeSetBuilder requires strictly ascending from values; skip if out-of-order
        }
      }
      pos = block.text.indexOf('\n', pos);
      if (pos !== -1) {
        pos++;
        offset++;
      }
    }
  }

  return builder.finish();
}

// Matches fountain-highlight.ts's pattern: rebuild only on doc change, not
// on every view update (selection moves, etc.) — parseFountain runs once
// per edit, not per keystroke-adjacent render.
export const screenplayFormat = ViewPlugin.fromClass(
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
