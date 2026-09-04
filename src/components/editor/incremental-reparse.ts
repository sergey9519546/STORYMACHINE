// Pure (no CodeMirror imports) windowed-reparse logic shared by
// fountain-highlight.ts and screenplay-format.ts.
//
// WHY THIS EXISTS: both files used to call `state.doc.toString()` +
// `parseFountain(doc)` — a full-document parse — on EVERY keystroke,
// unbounded by viewport. Measured on a 430-scene/145KB script: ~100-120
// ms/keystroke, vs. ~15 ms/keystroke on an empty doc (see
// docs/perf/incremental-decorations-benchmark.md and this pass's commit
// message for the full before/after numbers). This module computes just the
// [anchorLine, endLine] slice of the document that actually needs
// re-parsing for a given changed-or-visible line range, so the two
// ViewPlugins can patch a small, bounded piece of their DecorationSet
// instead of rebuilding the whole thing — with a full reparse still run on
// idle (see both files) so any staleness this window logic doesn't reach
// self-corrects.
//
// KEPT CODEMIRROR-FREE so it gets real, directly-imported unit coverage
// under this repo's `node --experimental-strip-types` test runner —
// fountain-highlight.ts / screenplay-format.ts themselves cannot be
// imported there (their `DecorationSet`/`FountainBlockType` type imports
// from @codemirror/view break Node's type-stripper — see
// tests/core/editor-decorations.test.ts's header for the same issue and the
// convention this file follows instead).
//
// THE CORE REASONING (why a blank-line anchor is a SAFE place to resume
// parsing, and the two cases that need MORE than that):
//
// parseFountain (src/lib/fountain.ts) classifies each line using at most
// THREE pieces of context beyond the line's own text:
//
//   1. Whether the immediately preceding block is 'empty' — gates scene
//      heading / transition / character-cue eligibility (fountain.ts:78)
//      and the character→parenthetical/dialogue continuation chain
//      (fountain.ts:99, :106). parseFountain treats "no previous block at
//      all" (a fresh parse call, `blocks` still empty) identically to
//      "previous block is 'empty'" for both checks, so re-starting the
//      parse right AFTER a blank source line reproduces the same context a
//      full-document parse would have had there — for free, with no state
//      to carry in (see findBlankAnchor below).
//   2. The retroactive dual-dialogue walk (fountain.ts:86-91): a "^"-suffixed
//      cue retags the NEAREST PRECEDING 'character' block within the same
//      scene (bounded by the last scene_heading, fountain.ts:88) to
//      'dual_dialogue'. This can reach further back than the nearest blank
//      line (there may be several blank-line-separated exchanges since the
//      real character cue). findAnchorLine below detects a "^" cue inside
//      the candidate window and extends the anchor back to the nearest
//      scene heading — the EXACT bound the real algorithm itself uses, so a
//      windowed reparse's own local dual-dialogue retag sees the same
//      preceding character block a full-document parse would have retagged.
//   3. `inBoneyard` (fountain.ts:35, :48-58): a `/* ... */` block-comment
//      toggle that is NOT reset by blank lines (the blank-line check
//      `continue`s before the boneyard check even runs — fountain.ts:42-44)
//      — so it can span across any number of blank lines and is NOT
//      bounded by this module's blank-line anchor at all. This module does
//      not attempt to track it; instead, the two ViewPlugins guard against
//      it directly with `containsBoneyardMarker` (below): if the edit
//      touches a `/*` or `*/`, or the document is already known to contain
//      one (checked once per full parse, not every keystroke), they fall
//      back to a full reparse for that update rather than trust a windowed
//      one. Boneyard comments are rare in real screenplays, so this
//      preserves correctness unconditionally while costing nothing in the
//      common (no-boneyard) case this pass's benchmark exercises.

import { parseFountain, type FountainBlock } from '../../lib/fountain.ts';

export interface DocLike {
  /** CodeMirror's state.doc.lines convention: >= 1, even for an empty document. */
  totalLines: number;
  /** 1-indexed line text, no trailing newline. */
  lineText(lineNumber: number): string;
}

// Mirrors fountain.ts's own scene_heading test (line 63) — duplicated here
// ONLY to bound the backward search in findSceneHeadingAnchor. It only needs
// to be a safe upper bound on "where might a scene heading be" for that
// search to stop; it is never the authoritative classifier (the real
// parseFountain always re-runs over the resulting slice), so an over-eager
// match here only makes the window larger than strictly necessary, never
// produces a wrong decoration.
const SCENE_HEADING_LIKE_RE =
  /^(INT|EXT|EST|I\/E|INTERIOR|EXTERIOR|ESTABLECIENDO|INT\/EXT|INTÉRIEUR|EXTÉRIEUR|INTERIEUR|EXTERIEUR|INNEN|AUSSEN)[. ]/iu;

function looksLikeSceneHeading(text: string): boolean {
  const t = text.trim();
  return SCENE_HEADING_LIKE_RE.test(t) || t.startsWith('.');
}

// Over-approximates fountain.ts's dual-dialogue cue trigger (fountain.ts:80,
// a "^"-suffixed line, optionally after a (V.O.)-style extension) closely
// enough to be a safe TRIGGER for extending the anchor backward — see
// computeReparseWindow. A false positive here only widens the window; a
// false negative would be the real bug, so this stays deliberately loose
// (any line ending in "^").
function looksLikeDualDialogueCue(text: string): boolean {
  return /\^\s*$/.test(text.trim());
}

/** True if `text` might open or close a Fountain boneyard comment. Used by
 *  the two ViewPlugins to decide when a windowed reparse cannot be trusted
 *  — see this file's header, case 3. */
export function containsBoneyardMarker(text: string): boolean {
  return text.includes('/*') || text.includes('*/');
}

/**
 * Walk backward from `fromLine` to the START of its uninterrupted
 * (non-blank) run — i.e. one line PAST the nearest preceding blank line, or
 * line 1 if none exists. The blank line itself is deliberately excluded:
 * parseFountain treats "no previous block yet" (`blocks` still empty, at the
 * very start of a parse call) exactly the same as "previous block is
 * 'empty'" (fountain.ts:78 `if (!prevBlock || prevBlock.type === 'empty')`,
 * :106 `blocks.length > 0 && ...`), so starting the windowed parse right
 * AFTER the blank line reproduces the same context a full-document parse
 * would have had there, one line smaller.
 */
function findBlankAnchor(doc: DocLike, fromLine: number): number {
  let n = fromLine;
  while (n > 1 && doc.lineText(n - 1).trim() !== '') n--;
  return n;
}

/** Walk backward from `fromLine` to the nearest scene-heading-like line (or line 1). */
function findSceneHeadingAnchor(doc: DocLike, fromLine: number): number {
  let n = fromLine;
  while (n > 1 && !looksLikeSceneHeading(doc.lineText(n))) n--;
  return n;
}

/** Walk forward from `toLine` to the nearest blank line at/after it (or the last line). */
function findBlankEnd(doc: DocLike, toLine: number): number {
  let n = toLine;
  while (n < doc.totalLines && doc.lineText(n).trim() !== '') n++;
  return n;
}

export interface ReparseWindow {
  anchorLine: number;
  endLine: number;
}

/**
 * The full anchor/end computation for one changed-or-visible 1-indexed
 * inclusive line range [fromLine, toLine]. See this file's header for the
 * reasoning behind each step.
 */
export function computeReparseWindow(doc: DocLike, fromLine: number, toLine: number): ReparseWindow {
  const clampedFrom = Math.max(1, Math.min(fromLine, doc.totalLines));
  const clampedTo = Math.max(clampedFrom, Math.min(toLine, doc.totalLines));
  let anchorLine = findBlankAnchor(doc, clampedFrom);
  // Scan [anchorLine, clampedTo] for a dual-dialogue cue that needs more
  // backward context than the blank-line anchor alone provides. Bounded by
  // the same locality as the anchor search in the overwhelming common case
  // (one screen's worth of lines, never the whole document).
  for (let n = anchorLine; n <= clampedTo; n++) {
    if (looksLikeDualDialogueCue(doc.lineText(n))) {
      anchorLine = Math.min(anchorLine, findSceneHeadingAnchor(doc, anchorLine));
      break;
    }
  }
  const endLine = findBlankEnd(doc, clampedTo);
  return { anchorLine, endLine };
}

/**
 * Merge a list of (possibly overlapping, unordered) 1-indexed inclusive line
 * ranges into the minimal sorted, non-overlapping set — used to union
 * "changed range" + "visible range" before reparsing, so adjoining or
 * overlapping windows are patched once instead of redundantly.
 */
export function mergeLineRanges(ranges: readonly (readonly [number, number])[]): [number, number][] {
  if (ranges.length === 0) return [];
  const sorted = ranges.map(([a, b]) => [a, b] as [number, number]).sort((a, b) => a[0] - b[0]);
  const out: [number, number][] = [sorted[0]];
  for (let i = 1; i < sorted.length; i++) {
    const [from, to] = sorted[i];
    const last = out[out.length - 1];
    if (from <= last[1] + 1) {
      if (to > last[1]) last[1] = to;
    } else {
      out.push([from, to]);
    }
  }
  return out;
}

/**
 * Re-runs the REAL parseFountain (never a reimplementation) over the
 * [anchorLine, endLine] slice of the document, remapping each resulting
 * block's `lineNumber` from slice-relative back to real document line
 * numbers. `sliceText` is the exact text CodeMirror's
 * `state.sliceDoc(lineStart, lineEnd)` gives you for that inclusive range.
 */
export function parseWindow(sliceText: string, anchorLine: number): FountainBlock[] {
  const blocks = parseFountain(sliceText);
  return blocks.map((b) => ({ ...b, lineNumber: anchorLine + (b.lineNumber - 1) }));
}
