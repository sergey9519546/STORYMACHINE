// Regression coverage for the loop-simplification salvaged from
// origin/bolt/fountain-highlighting-13478035081562833227 (commit 6214a97)
// into src/components/editor/fountain-highlight.ts and
// src/components/editor/screenplay-format.ts.
//
// WHAT CHANGED: buildDecorations() in both files used to walk each block's
// text for embedded '\n' characters (`block.text.indexOf('\n', startIndex)`
// in a loop) to map a block onto potentially several CodeMirror doc lines.
// That's dead generality: parseFountain (src/lib/fountain.ts:32) splits the
// whole document on '\n' up front, and every block it produces carries
// `text: line` — the untouched single source line (see fountain.ts:43, :53,
// :123) — so `block.text` NEVER contains '\n'. The salvaged change collapses
// the walk to one direct `lineNo = block.lineNumber` lookup.
//
// WHY THIS TEST DOESN'T IMPORT THE REAL MODULES: fountain-highlight.ts and
// screenplay-format.ts import `DecorationSet` and `FountainBlockType` as
// plain named imports even though both are type-only. Under this repo's
// test runner (`node --experimental-strip-types`, no bundler/loader), Node's
// type stripper does not do cross-usage elision the way Vite/tsc do, so
// loading either file directly throws:
//   SyntaxError: The requested module '@codemirror/view' does not provide
//   an export named 'DecorationSet'
// (verified: `node --experimental-strip-types` against a standalone import
// of fountain-highlight.ts fails with exactly this error, independent of
// this salvage's edits — the files are only ever consumed through Vite,
// which handles the elision). A decoration-level test that imports the real
// ViewPlugin is therefore not feasible under node:test here. Per repo
// convention (see tests/core/fountain-analyzer.test.ts et al. testing pure
// logic instead of the CodeMirror-integrated call sites), this file instead:
//   1. Pins the INVARIANT the simplification depends on — every
//      parseFountain block is exactly one line — against a rich multi-block
//      document exercising every block type.
//   2. Proves the OLD (multi-line-walk) and NEW (direct-lookup) mapping
//      algorithms produce IDENTICAL per-line decoration assignments, by
//      reimplementing both algorithms verbatim in test code (mirroring the
//      before/after diff exactly, decoupled from @codemirror/view types) and
//      running them over the same multi-block documents.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseFountain, type FountainBlock } from '../../src/lib/fountain.ts';

// A document that exercises every FountainBlockType parseFountain can
// produce, so the invariant and the mapping-equivalence check both run
// against real block-type diversity, not just action/dialogue.
const RICH_FOUNTAIN_DOC = [
  '# ACT ONE',
  '',
  '= A quiet town keeps a secret.',
  '',
  'INT. KITCHEN - DAY',
  '',
  'Sarah stares at the letter on the counter.',
  '',
  'SARAH',
  "I can't believe this.",
  '',
  'JOHN ^',
  'Neither can I.',
  '',
  'MARY',
  '(quietly)',
  "We should've said something sooner.",
  '',
  '~Hush now, don\'t you cry~',
  '',
  '[[note to self: tighten this scene]]',
  '',
  '/* TODO: revisit blocking',
  'once the set is finalized */',
  '',
  '>THE END<',
  '',
  'CUT TO:',
  '',
  'EXT. STREET - NIGHT',
  '',
  'CLOSE UP ON THE DOOR',
  '',
  'FADE OUT.',
].join('\n');

describe('editor decoration line-mapping — invariant parseFountain relies on', () => {
  it('every block.text from parseFountain is exactly one line (no embedded \\n), across every block type', () => {
    const blocks = parseFountain(RICH_FOUNTAIN_DOC);
    // Sanity: the document actually produced a variety of block types, so
    // the invariant check below isn't vacuous.
    const typesSeen = new Set(blocks.map((b) => b.type));
    assert.ok(typesSeen.size >= 8, `expected broad block-type coverage, got: ${[...typesSeen].join(', ')}`);

    for (const block of blocks) {
      assert.equal(
        block.text.includes('\n'),
        false,
        `block ${block.id} (type=${block.type}) contains an embedded newline: ${JSON.stringify(block.text)}`,
      );
      assert.equal(block.text.split('\n').length, 1);
    }
  });

  it('holds across edge-case documents: empty, single line, trailing blank lines, CRLF source', () => {
    const docs = [
      '',
      'INT. ROOM - DAY',
      'INT. ROOM - DAY\n\n\n',
      'INT. ROOM - DAY\r\nSarah enters.\r\n',
      '/* unclosed boneyard\nstill going',
    ];
    for (const doc of docs) {
      const blocks = parseFountain(doc);
      for (const block of blocks) {
        assert.equal(
          block.text.includes('\n'),
          false,
          `doc ${JSON.stringify(doc)} produced a block with an embedded newline: ${JSON.stringify(block.text)}`,
        );
      }
    }
  });
});

// ── Minimal stand-ins for the two files' line-mapping algorithms ───────────
// These mirror the OLD and NEW buildDecorations() loop bodies exactly
// (see the diff), but operate on plain {lineNo, cls} pairs instead of
// CodeMirror's RangeSetBuilder/Decoration, so they run without importing
// @codemirror/view.

interface LineDecoration {
  lineNo: number;
  cls: string;
}

/** Pre-simplification algorithm (both files, before this salvage). */
function mapBlocksOld(blocks: FountainBlock[], classFor: (b: FountainBlock) => string | undefined, totalLines: number): LineDecoration[] {
  const out: LineDecoration[] = [];
  for (const block of blocks) {
    const cls = classFor(block);
    if (!cls) continue;
    let startIndex = 0;
    let offset = 0;
    while (startIndex <= block.text.length) {
      const nextNewline = block.text.indexOf('\n', startIndex);
      const lineNo = block.lineNumber + offset;
      if (lineNo >= 1 && lineNo <= totalLines) {
        out.push({ lineNo, cls });
      }
      if (nextNewline === -1) break;
      startIndex = nextNewline + 1;
      offset++;
    }
  }
  return out;
}

/** Post-simplification algorithm (both files, after this salvage). */
function mapBlocksNew(blocks: FountainBlock[], classFor: (b: FountainBlock) => string | undefined, totalLines: number): LineDecoration[] {
  const out: LineDecoration[] = [];
  for (const block of blocks) {
    const cls = classFor(block);
    if (!cls) continue;
    const lineNo = block.lineNumber;
    if (lineNo < 1 || lineNo > totalLines) continue;
    out.push({ lineNo, cls });
  }
  return out;
}

// Stand-in class maps shaped like fountain-highlight.ts's BLOCK_CLASSES and
// screenplay-format.ts's INDENTS keying (real class names don't matter for
// this equivalence check — only whether a block type maps to *some* class).
const HIGHLIGHT_CLASSES: Partial<Record<FountainBlock['type'], string>> = {
  scene_heading: 'cm-fountain-scene',
  character: 'cm-fountain-character',
  dual_dialogue: 'cm-fountain-character',
  parenthetical: 'cm-fountain-parenthetical',
  dialogue: 'cm-fountain-dialogue',
  transition: 'cm-fountain-transition',
  lyrics: 'cm-fountain-lyrics',
  section: 'cm-fountain-section',
  synopsis: 'cm-fountain-synopsis',
  note: 'cm-fountain-note',
};

const FORMAT_CLASSES: Partial<Record<FountainBlock['type'], string>> = {
  scene_heading: 'cm-sp-scene_heading',
  action: 'cm-sp-action',
  character: 'cm-sp-character',
  dual_dialogue: 'cm-sp-dual_dialogue',
  parenthetical: 'cm-sp-parenthetical',
  dialogue: 'cm-sp-dialogue',
  transition: 'cm-sp-transition',
  centered: 'cm-sp-centered',
  shot: 'cm-sp-shot',
};

describe('editor decoration line-mapping — old loop vs new direct lookup produce identical results', () => {
  const docs = [
    RICH_FOUNTAIN_DOC,
    '',
    'INT. ROOM - DAY',
    'INT. ROOM - DAY\n\n\n',
    '/* unclosed boneyard\nstill going',
    [
      'JOHN ^',
      'First line.',
      '',
      'MARY',
      '(overlapping)',
      'Second line.',
    ].join('\n'),
  ];

  for (const [i, doc] of docs.entries()) {
    it(`fountain-highlight.ts mapping: doc[${i}] identical old vs new`, () => {
      const blocks = parseFountain(doc);
      const totalLines = doc.split('\n').length;
      const before = mapBlocksOld(blocks, (b) => HIGHLIGHT_CLASSES[b.type], totalLines);
      const after = mapBlocksNew(blocks, (b) => HIGHLIGHT_CLASSES[b.type], totalLines);
      assert.deepEqual(after, before, `doc[${i}] diverged:\nold=${JSON.stringify(before)}\nnew=${JSON.stringify(after)}`);
    });

    it(`screenplay-format.ts mapping: doc[${i}] identical old vs new`, () => {
      const blocks = parseFountain(doc);
      const totalLines = doc.split('\n').length;
      const before = mapBlocksOld(blocks, (b) => FORMAT_CLASSES[b.type], totalLines);
      const after = mapBlocksNew(blocks, (b) => FORMAT_CLASSES[b.type], totalLines);
      assert.deepEqual(after, before, `doc[${i}] diverged:\nold=${JSON.stringify(before)}\nnew=${JSON.stringify(after)}`);
    });
  }

  it('sanity: the equivalence check is non-vacuous — both algorithms emit decorations for the rich doc', () => {
    const blocks = parseFountain(RICH_FOUNTAIN_DOC);
    const totalLines = RICH_FOUNTAIN_DOC.split('\n').length;
    const result = mapBlocksNew(blocks, (b) => HIGHLIGHT_CLASSES[b.type], totalLines);
    assert.ok(result.length > 5, 'expected multiple decorated lines in the rich fixture');
  });
});
