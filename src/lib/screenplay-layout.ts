// Wave 91 — Screenplay layout engine (P2 export pipeline)
//
// Pure function: Fountain script → paginated, positioned text lines following
// US industry-standard screenplay formatting (US Letter, Courier 12pt, 10 cpi).
// This is the reusable core shared by the PDF and (future) print renderers — it
// owns the hard parts (margins, indents, word-wrap, pagination, widow/orphan
// rules) so the renderers stay trivial and the logic stays unit-testable.

import { parseFountain, type FountainBlock, type FountainBlockType } from './fountain.ts';

// ── Page geometry (points; 72 pt = 1 inch) ────────────────────────────────────
export const PAGE_WIDTH = 612;   // 8.5"
export const PAGE_HEIGHT = 792;  // 11"
const PT_PER_INCH = 72;
const FONT_SIZE = 12;            // Courier 12pt — the screenplay standard
const LINE_HEIGHT = 12;         // single-spaced, 6 lines per inch
const CHAR_WIDTH = FONT_SIZE * 0.6; // Courier advance width = 0.6 em → 7.2pt → 10 cpi

const TOP_MARGIN = 1 * PT_PER_INCH;     // 1"
const BOTTOM_MARGIN = 1 * PT_PER_INCH;  // 1"
// First baseline sits one line below the top margin.
const FIRST_BASELINE_Y = PAGE_HEIGHT - TOP_MARGIN - LINE_HEIGHT;
// Usable vertical band → lines per page.
export const LINES_PER_PAGE = Math.floor(
  (PAGE_HEIGHT - TOP_MARGIN - BOTTOM_MARGIN) / LINE_HEIGHT,
); // = 54

// ── Element layout spec (indent from left edge in inches, width in characters) ─
// Exported so view-layer consumers (e.g. the editor's screenplay-format.ts
// indentation decorations) can derive on-screen proportions from the SAME
// numbers the PDF/export pipeline uses, instead of duplicating them.
export interface ElementSpec {
  indentInches: number;
  widthChars: number;
  uppercase?: boolean;
  align?: 'left' | 'right';
  blankBefore?: number; // blank lines inserted before this element
}

// Standard US screenplay indents (measured from the left paper edge).
export const SPEC: Partial<Record<FountainBlockType, ElementSpec>> = {
  scene_heading: { indentInches: 1.5, widthChars: 60, uppercase: true, blankBefore: 1 },
  action:        { indentInches: 1.5, widthChars: 60, blankBefore: 1 },
  character:     { indentInches: 3.7, widthChars: 38, uppercase: true, blankBefore: 1 },
  parenthetical: { indentInches: 3.1, widthChars: 28 },
  dialogue:      { indentInches: 2.5, widthChars: 35 },
  dual_dialogue: { indentInches: 3.7, widthChars: 38, uppercase: true, blankBefore: 1 },
  transition:    { indentInches: 1.5, widthChars: 60, uppercase: true, align: 'right', blankBefore: 1 },
  shot:          { indentInches: 1.5, widthChars: 60, uppercase: true, blankBefore: 1 },
  centered:      { indentInches: 1.5, widthChars: 60, align: 'right' }, // centered handled specially below
  lyrics:        { indentInches: 2.5, widthChars: 35 },
  section:       { indentInches: 1.5, widthChars: 60, uppercase: true, blankBefore: 1 },
  synopsis:      { indentInches: 1.5, widthChars: 60, blankBefore: 1 },
};

// A single positioned line of text ready to draw.
export interface LayoutLine {
  text: string;
  xPt: number;   // x of the line's left edge, in points from the page left
  yPt: number;   // baseline y, in points from the page bottom
}

export interface LayoutPage {
  lines: LayoutLine[];
  pageNumber: number;
}

// ── Word wrap: break text into lines no longer than maxChars ──────────────────
function wrapText(text: string, maxChars: number): string[] {
  if (maxChars <= 0) return [text];
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [''];
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    if (current === '') {
      // A single word longer than the line gets hard-split.
      if (word.length > maxChars) {
        let rest = word;
        while (rest.length > maxChars) {
          lines.push(rest.slice(0, maxChars));
          rest = rest.slice(maxChars);
        }
        current = rest;
      } else {
        current = word;
      }
    } else if (current.length + 1 + word.length <= maxChars) {
      current += ' ' + word;
    } else {
      lines.push(current);
      if (word.length > maxChars) {
        let rest = word;
        while (rest.length > maxChars) {
          lines.push(rest.slice(0, maxChars));
          rest = rest.slice(maxChars);
        }
        current = rest;
      } else {
        current = word;
      }
    }
  }
  if (current !== '') lines.push(current);
  return lines;
}

// Strip Fountain force/markup characters so the rendered prose is clean.
function cleanText(block: FountainBlock): string {
  let t = block.text.trim();
  if (block.type === 'scene_heading' && t.startsWith('.')) t = t.slice(1).trim();
  if (block.type === 'action' && t.startsWith('!')) t = t.slice(1);
  if (block.type === 'character' || block.type === 'dual_dialogue') t = t.replace(/\s*\^\s*$/, '').trim();
  if (block.type === 'centered') t = t.replace(/^>\s*/, '').replace(/\s*<$/, '').trim();
  if (block.type === 'lyrics') t = t.replace(/^~\s*/, '');
  if (block.type === 'section') t = t.replace(/^#+\s*/, '');
  if (block.type === 'synopsis') t = t.replace(/^=\s*/, '');
  return t;
}

// Intermediate logical line — knows its element type for widow/orphan handling.
interface LogicalLine {
  text: string;
  xPt: number;
  blockType: FountainBlockType;
  /** Lines that must not be split from the NEXT logical line (e.g. character cue). */
  keepWithNext?: boolean;
}

function buildLogicalLines(blocks: FountainBlock[]): LogicalLine[] {
  const out: LogicalLine[] = [];
  let pastTitlePage = false;

  for (let bi = 0; bi < blocks.length; bi++) {
    const block = blocks[bi];
    if (block.type === 'empty' || block.type === 'boneyard' || block.type === 'note') continue;

    const spec = SPEC[block.type];
    if (!spec) continue;

    let text = cleanText(block);

    // Skip leading Fountain title-page key:value lines.
    if (!pastTitlePage) {
      if (/^(title|credit|author|authors|source|draft date|contact|copyright|notes?)\s*:/i.test(text)) continue;
      pastTitlePage = true;
    }
    if (text === '') continue;
    if (spec.uppercase) text = text.toUpperCase();

    // Blank lines before this element (paragraph spacing).
    for (let b = 0; b < (spec.blankBefore ?? 0); b++) {
      out.push({ text: '', xPt: 0, blockType: 'empty' });
    }

    const wrapped = wrapText(text, spec.widthChars);
    // A character cue should not be orphaned at the bottom of a page.
    const isCue = block.type === 'character' || block.type === 'dual_dialogue';

    for (let li = 0; li < wrapped.length; li++) {
      let lineText = wrapped[li];
      let xPt = spec.indentInches * PT_PER_INCH;

      if (spec.align === 'right') {
        // Right-align within the text band ending at 7.5" from left (1" right margin).
        const rightEdge = 7.5 * PT_PER_INCH;
        xPt = rightEdge - lineText.length * CHAR_WIDTH;
      } else if (block.type === 'centered') {
        // Centre within the action band (1.5"–7.5").
        const bandStart = 1.5 * PT_PER_INCH;
        const bandWidth = 6 * PT_PER_INCH;
        xPt = bandStart + (bandWidth - lineText.length * CHAR_WIDTH) / 2;
      }
      if (xPt < 0) xPt = 0;

      out.push({
        text: lineText,
        xPt,
        blockType: block.type,
        keepWithNext: isCue && li === wrapped.length - 1, // last cue line glued to dialogue
      });
    }
  }

  // Trim a leading blank line on the very first element.
  while (out.length > 0 && out[0].text === '' && out[0].blockType === 'empty') out.shift();
  return out;
}

// ── Pagination with widow/orphan handling ─────────────────────────────────────
export function layoutScreenplay(fountain: string): LayoutPage[] {
  const blocks = parseFountain(fountain);
  const logical = buildLogicalLines(blocks);

  const pages: LayoutPage[] = [];
  let pageLines: LogicalLine[] = [];
  let pageNumber = 1;

  const flush = () => {
    // Drop trailing blank lines on the page.
    while (pageLines.length > 0 && pageLines[pageLines.length - 1].text === '') pageLines.pop();
    if (pageLines.length === 0) return;
    const lines: LayoutLine[] = pageLines.map((ll, idx) => ({
      text: ll.text,
      xPt: ll.xPt,
      yPt: FIRST_BASELINE_Y - idx * LINE_HEIGHT,
    }));
    pages.push({ lines, pageNumber });
    pageNumber++;
    pageLines = [];
  };

  for (let i = 0; i < logical.length; i++) {
    const line = logical[i];

    // Don't start a page with a blank line.
    if (line.text === '' && pageLines.length === 0) continue;

    // Widow rule: a scene heading or a character cue may not be orphaned at the
    // bottom of a page — it must be followed by its content on the same page.
    // We require enough free slots for the element AND the line(s) that follow,
    // accounting for the fact that a trailing blank line will be trimmed (which
    // could otherwise promote a second-to-last heading into the last line).
    // A scene heading is followed by a blank + an action/content line (needs 3);
    // a character cue is followed directly by dialogue (needs 2).
    const freeSlots = LINES_PER_PAGE - pageLines.length;
    if (line.blockType === 'scene_heading' && freeSlots < 3) {
      flush();
    } else if (line.keepWithNext === true && freeSlots < 2) {
      flush();
    }

    if (pageLines.length >= LINES_PER_PAGE) flush();
    if (line.text === '' && pageLines.length === 0) continue;
    pageLines.push(line);
  }
  flush();

  // A document with no body lines still yields one empty page.
  if (pages.length === 0) pages.push({ lines: [], pageNumber: 1 });
  return pages;
}
