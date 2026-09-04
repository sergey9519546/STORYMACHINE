// Tests for src/components/editor/incremental-reparse.ts — the pure,
// CodeMirror-free windowed-reparse logic behind the perf fix in
// fountain-highlight.ts / screenplay-format.ts (both now delegate to
// src/components/editor/incremental-decorator.ts, a ViewPlugin factory this
// file's harness deliberately mirrors — see below).
//
// WHY THIS TEST DOESN'T IMPORT incremental-decorator.ts / fountain-highlight
// .ts / screenplay-format.ts DIRECTLY: all three pull in `DecorationSet`
// (@codemirror/view) and/or `ViewUpdate`/`EditorState` as TYPE-ONLY named
// imports. Under this repo's test runner (`node --experimental-strip-types`,
// no bundler), Node's type stripper does not do cross-usage elision the way
// Vite/tsc do, so loading any of them directly throws — verified below —
// exactly the same limitation documented in
// tests/core/editor-decorations.test.ts's header for the two files this
// perf pass touched.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseFountain, type FountainBlock, type FountainBlockType } from '../../src/lib/fountain.ts';
import { SPEC } from '../../src/lib/screenplay-layout.ts';
import {
  computeReparseWindow,
  mergeLineRanges,
  parseWindow,
  containsBoneyardMarker,
  type DocLike,
} from '../../src/components/editor/incremental-reparse.ts';

describe('incremental-reparse.ts cannot be avoided by importing the real ViewPlugin files directly', () => {
  it('fountain-highlight.ts / screenplay-format.ts / incremental-decorator.ts all fail to import under the type-stripped runner', async () => {
    for (const rel of [
      '../../src/components/editor/fountain-highlight.ts',
      '../../src/components/editor/screenplay-format.ts',
      '../../src/components/editor/incremental-decorator.ts',
    ]) {
      await assert.rejects(() => import(rel), /does not provide an export named/);
    }
  });
});

// ── Class maps mirroring the two real ViewPlugins' block→class functions ────
// (Same convention as editor-decorations.test.ts: the real modules can't be
// imported, so their tiny, stable class-name tables are reproduced here —
// FORMAT_CLASSES is derived from the REAL, imported SPEC rather than
// hand-copied, so it can never drift from screenplay-layout.ts.)
const HIGHLIGHT_CLASSES: Partial<Record<FountainBlockType, string>> = {
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

const FORMAT_CLASSES: Partial<Record<FountainBlockType, string>> = {};
for (const type of Object.keys(SPEC) as FountainBlockType[]) {
  FORMAT_CLASSES[type] = `cm-sp-${type}`;
}

// ═════════════════════════════ Part 1: unit tests for the pure primitives ═══

describe('computeReparseWindow — anchor/end selection', () => {
  const lines = [
    'INT. KITCHEN - DAY',       // 1
    '',                          // 2
    'Sarah stares at the letter.', // 3
    'She sets it down.',         // 4
    '',                          // 5
    'SARAH',                     // 6
    "I can't believe this.",     // 7
    '',                          // 8
    'EXT. STREET - NIGHT',       // 9
    '',                          // 10
    'A car passes.',             // 11
  ];
  const doc: DocLike = { totalLines: lines.length, lineText: (n) => lines[n - 1] ?? '' };

  it('anchors backward to the start of the uninterrupted run (one line past the nearest blank line)', () => {
    const { anchorLine } = computeReparseWindow(doc, 4, 4);
    assert.equal(anchorLine, 3); // line 2 is blank; lines 3-4 form the run, so the run starts at 3
  });

  it('anchors to line 1 when no blank line precedes the change', () => {
    const { anchorLine } = computeReparseWindow(doc, 1, 1);
    assert.equal(anchorLine, 1);
  });

  it('ends forward at the nearest blank line at/after the change', () => {
    const { endLine } = computeReparseWindow(doc, 6, 6);
    assert.equal(endLine, 8);
  });

  it('ends at the last line when no blank line follows the change', () => {
    const { endLine } = computeReparseWindow(doc, 11, 11);
    assert.equal(endLine, 11);
  });

  it('clamps out-of-range fromLine/toLine into the document', () => {
    const w = computeReparseWindow(doc, 0, 999);
    assert.equal(w.anchorLine, 1);
    assert.equal(w.endLine, 11);
  });

  it('a single-line document never throws and returns [1,1]', () => {
    const one: DocLike = { totalLines: 1, lineText: () => 'INT. ROOM - DAY' };
    assert.deepEqual(computeReparseWindow(one, 1, 1), { anchorLine: 1, endLine: 1 });
  });

  it('extends the anchor back to the nearest scene heading when a dual-dialogue "^" cue is in the window', () => {
    const dualLines = [
      'INT. KITCHEN - DAY', // 1
      '',                    // 2
      'JOHN',                // 3 — the character cue the ^ below must reach back to
      'Get down!',           // 4
      '',                    // 5
      'MARY ^',              // 6 — dual-dialogue cue; without the extension, the
      'Get down!',           // 7   nearest-blank anchor (line 5) would miss line 3
    ];
    const d: DocLike = { totalLines: dualLines.length, lineText: (n) => dualLines[n - 1] ?? '' };
    const { anchorLine } = computeReparseWindow(d, 6, 6);
    assert.equal(anchorLine, 1, 'anchor must reach back at least to the scene heading (line 1) to see the real JOHN cue at line 3');
  });

  it('does NOT extend the anchor when no "^" cue is present (common case stays cheap)', () => {
    const { anchorLine } = computeReparseWindow(doc, 7, 7);
    assert.equal(anchorLine, 6); // just the blank-line anchor — no scene-heading walk needed
  });
});

describe('mergeLineRanges', () => {
  it('merges overlapping ranges', () => {
    assert.deepEqual(mergeLineRanges([[1, 5], [3, 8]]), [[1, 8]]);
  });
  it('merges adjacent (touching) ranges', () => {
    assert.deepEqual(mergeLineRanges([[1, 5], [6, 8]]), [[1, 8]]);
  });
  it('keeps disjoint ranges separate, sorted', () => {
    assert.deepEqual(mergeLineRanges([[10, 12], [1, 2]]), [[1, 2], [10, 12]]);
  });
  it('handles a single range and the empty list', () => {
    assert.deepEqual(mergeLineRanges([[4, 4]]), [[4, 4]]);
    assert.deepEqual(mergeLineRanges([]), []);
  });
  it('a range fully nested inside another collapses to the outer one', () => {
    assert.deepEqual(mergeLineRanges([[1, 20], [5, 8]]), [[1, 20]]);
  });
});

describe('containsBoneyardMarker', () => {
  it('detects an opening marker', () => assert.equal(containsBoneyardMarker('/* start'), true));
  it('detects a closing marker', () => assert.equal(containsBoneyardMarker('end */'), true));
  it('is false for ordinary prose, including a lone slash or asterisk', () => {
    assert.equal(containsBoneyardMarker('Sarah walks in * beat *.'), false);
    assert.equal(containsBoneyardMarker('50/50 chance.'), false);
  });
});

describe('parseWindow — remaps slice-relative line numbers back to real document lines', () => {
  it('matches the corresponding slice of a full parse, offset by the anchor', () => {
    const fullText = [
      'INT. KITCHEN - DAY',
      '',
      'SARAH',
      "I can't believe this.",
      '',
    ].join('\n');
    const full = parseFountain(fullText);
    const anchorLine = 3;
    const sliceText = ['SARAH', "I can't believe this.", ''].join('\n');
    const windowed = parseWindow(sliceText, anchorLine);
    const expected = full.filter((b) => b.lineNumber >= anchorLine);
    assert.deepEqual(
      windowed.map((b) => ({ lineNumber: b.lineNumber, type: b.type, text: b.text })),
      expected.map((b) => ({ lineNumber: b.lineNumber, type: b.type, text: b.text })),
    );
  });
});

// ═══════════════ Part 2: end-to-end correctness — incremental vs full parse ═

// A faithful, line-number-indexed mirror of incremental-decorator.ts's
// ViewPlugin: same two decisions (boneyard fallback; else windowed patch via
// computeReparseWindow + parseWindow), operating on a plain string[] instead
// of a CodeMirror Text/DecorationSet. `decorations.map(update.changes)`'s
// position-based re-anchoring is mirrored here as shiftMapAfter — a line
// entirely inside the replaced span is dropped (mirrors a decoration whose
// anchor position was deleted), and every line strictly after the replaced
// span shifts by the line-count delta.
type ClassMap = Map<number, string>;

function buildFullMap(lines: string[], classFor: (t: FountainBlockType) => string | undefined): ClassMap {
  const blocks = parseFountain(lines.join('\n'));
  const map: ClassMap = new Map();
  for (const b of blocks) {
    const cls = classFor(b.type);
    if (cls) map.set(b.lineNumber, cls);
  }
  return map;
}

function shiftMapAfter(map: ClassMap, afterLine: number, delta: number) {
  if (delta === 0) return;
  const toMove = [...map.entries()].filter(([ln]) => ln > afterLine);
  for (const [ln] of toMove) map.delete(ln);
  for (const [ln, cls] of toMove) map.set(ln + delta, cls);
}

function docHasBoneyardAnywhere(lines: string[]): boolean {
  return lines.some((l) => containsBoneyardMarker(l));
}

/** Mirrors incremental-decorator.ts's patchRanges() for ONE changed range. */
function patchIncremental(
  map: ClassMap,
  lines: string[],
  fromLine: number,
  toLine: number,
  classFor: (t: FountainBlockType) => string | undefined,
) {
  if (docHasBoneyardAnywhere(lines)) {
    // Mirrors incremental-decorator.ts's docHasBoneyard fallback exactly —
    // see incremental-reparse.ts's header, case 3.
    const fresh = buildFullMap(lines, classFor);
    map.clear();
    for (const [k, v] of fresh) map.set(k, v);
    return;
  }
  const doc: DocLike = { totalLines: lines.length, lineText: (n) => lines[n - 1] ?? '' };
  const { anchorLine, endLine } = computeReparseWindow(doc, fromLine, toLine);
  for (let n = anchorLine; n <= endLine; n++) map.delete(n);
  const sliceText = lines.slice(anchorLine - 1, endLine).join('\n');
  const blocks = parseWindow(sliceText, anchorLine);
  for (const b of blocks) {
    const cls = classFor(b.type);
    if (cls) map.set(b.lineNumber, cls);
  }
}

interface EditStep {
  label: string;
  /** Replace lines [fromLine, toLine] (1-indexed, inclusive) with newLines. */
  fromLine: number;
  toLine: number;
  newLines: string[];
}

/** Runs one edit sequence through both paths, asserting equality after EVERY step. */
function runEditSequence(initialLines: string[], steps: EditStep[], classFor: (t: FountainBlockType) => string | undefined) {
  let lines = initialLines.slice();
  let incMap = buildFullMap(lines, classFor); // mount-time full build, same as the real plugin's constructor()

  // Sanity: the initial full map actually decorates something, so later
  // equality checks aren't vacuously comparing two empty maps.
  assert.ok(incMap.size > 0, 'fixture setup produced no decorations at all — test would be vacuous');

  for (const step of steps) {
    const delta = step.newLines.length - (step.toLine - step.fromLine + 1);
    shiftMapAfter(incMap, step.toLine, delta);
    for (let n = step.fromLine; n <= step.toLine; n++) incMap.delete(n);
    lines = [...lines.slice(0, step.fromLine - 1), ...step.newLines, ...lines.slice(step.toLine)];

    const changedTo = step.newLines.length > 0 ? step.fromLine + step.newLines.length - 1 : step.fromLine;
    patchIncremental(incMap, lines, step.fromLine, changedTo, classFor);

    const refMap = buildFullMap(lines, classFor);
    assert.deepEqual(
      [...incMap.entries()].sort((a, b) => a[0] - b[0]),
      [...refMap.entries()].sort((a, b) => a[0] - b[0]),
      `after step "${step.label}": incremental decorations diverged from a full parse\ndoc:\n${lines.join('\n')}`,
    );
  }
}

const BASE_SCRIPT = [
  'INT. KITCHEN - DAY',        // 1
  '',                           // 2
  'Sarah stares at the letter on the counter.', // 3
  '',                           // 4
  'SARAH',                      // 5
  "I can't believe this.",      // 6
  '',                           // 7
  'JOHN (O.S.)',                // 8
  'Believe what?',              // 9
  '',                           // 10
  'EXT. STREET - NIGHT',        // 11
  '',                           // 12
  'A car passes slowly.',       // 13
  '',                           // 14
  'CUT TO:',                    // 15
  '',                           // 16
];

for (const [label, classFor] of [
  ['fountain-highlight.ts color classes', (t: FountainBlockType) => HIGHLIGHT_CLASSES[t]] as const,
  ['screenplay-format.ts indent classes', (t: FountainBlockType) => FORMAT_CLASSES[t]] as const,
]) {
  describe(`incremental === full-parse decorations (${label})`, () => {
    it('typing mid-word inside an existing action paragraph', () => {
      runEditSequence(
        BASE_SCRIPT,
        [
          { label: 'insert a word into the action line', fromLine: 3, toLine: 3, newLines: ['Sarah quietly stares at the letter on the counter.'] },
          { label: 'extend the sentence further', fromLine: 3, toLine: 3, newLines: ['Sarah quietly stares at the old letter on the counter, hands trembling.'] },
        ],
        classFor,
      );
    });

    it('typing inside dialogue right after a character cue', () => {
      runEditSequence(
        BASE_SCRIPT,
        [{ label: 'extend SARAH\'s line', fromLine: 6, toLine: 6, newLines: ["I can't believe this is happening."] }],
        classFor,
      );
    });

    it('inserting a brand-new scene heading + action mid-document', () => {
      runEditSequence(
        BASE_SCRIPT,
        [{
          label: 'insert a whole new scene before EXT. STREET',
          fromLine: 11,
          toLine: 11,
          newLines: ['INT. HALLWAY - CONTINUOUS', '', 'Sarah storms out.', '', 'EXT. STREET - NIGHT'],
        }],
        classFor,
      );
    });

    it('deleting a blank line merges two blocks into one run', () => {
      runEditSequence(
        BASE_SCRIPT,
        [{ label: 'delete the blank line between JOHN and CUT TO: paragraph', fromLine: 10, toLine: 10, newLines: [] }],
        classFor,
      );
    });

    it('inserting a blank line splits a previously-uninterrupted action paragraph', () => {
      const twoLine = BASE_SCRIPT.slice();
      twoLine[2] = 'Sarah stares at the letter.';
      twoLine.splice(3, 0, 'She sets it down slowly.'); // still one contiguous action run, no blank between
      runEditSequence(
        twoLine,
        [{ label: 'split the action run with a blank line', fromLine: 4, toLine: 4, newLines: ['', 'She sets it down slowly.'] }],
        classFor,
      );
    });

    it('typing a brand-new all-caps line into a character cue, mid-sequence', () => {
      runEditSequence(
        BASE_SCRIPT,
        [
          { label: 'add a fresh scene + empty cue line', fromLine: 16, toLine: 16, newLines: ['INT. GARAGE - DAY', '', 'MAR', ''] },
          { label: 'finish typing the cue name', fromLine: 19, toLine: 19, newLines: ['MARY'] },
          { label: 'type dialogue under the new cue', fromLine: 20, toLine: 20, newLines: ['We need to go.'] },
        ],
        classFor,
      );
    });

    it('a "^" dual-dialogue cue several exchanges after the real character cue it must reach back to', () => {
      const dualScript = [
        'INT. KITCHEN - DAY', // 1
        '',                   // 2
        'JOHN',               // 3 — the block a later ^ cue must retag
        'Get down!',          // 4
        '',                   // 5
        'JOHN',               // 6 — a SECOND John line, further away, just prose-ish filler between
        'Stay low.',          // 7
        '',                   // 8
        'MARY',               // 9 — this is the one that becomes dual_dialogue once ^ is typed
        'Get down!',          // 10
        '',                   // 11
      ];
      runEditSequence(
        dualScript,
        [{ label: 'type a trailing ^ onto MARY\'s cue', fromLine: 9, toLine: 9, newLines: ['MARY ^'] }],
        classFor,
      );
    });

    it('editing inside an unclosed boneyard comment that spans a blank line (fallback path)', () => {
      const boneyardScript = [
        'INT. ROOM - DAY',              // 1
        '',                              // 2
        '/* TODO: revisit this scene',   // 3 — opens boneyard
        '',                               // 4 — blank line INSIDE the boneyard (inBoneyard survives it)
        'JOHN',                           // 5 — still boneyard per full parse, NOT a character cue
        'closing the note here */',       // 6 — closes boneyard
        '',                                // 7
        'EXT. STREET - NIGHT',             // 8
        '',                                 // 9
        'A car passes.',                    // 10
      ];
      runEditSequence(
        boneyardScript,
        [{ label: 'edit the line that LOOKS like a character cue but is really still boneyard', fromLine: 5, toLine: 5, newLines: ['JOHN K.'] }],
        classFor,
      );
    });
  });
}

describe('negative control: the windowed path WITHOUT the boneyard fallback can misclassify (justifies the fallback)', () => {
  it('a line that looks like a character cue, but is really still inside an unclosed boneyard, is misclassified by pure windowing alone', () => {
    const boneyardScript = [
      'INT. ROOM - DAY',
      '',
      '/* TODO: revisit this scene',
      '',
      'JOHN',
      'closing the note here */',
    ];
    const doc: DocLike = { totalLines: boneyardScript.length, lineText: (n) => boneyardScript[n - 1] ?? '' };
    const { anchorLine, endLine } = computeReparseWindow(doc, 5, 5);
    const sliceText = boneyardScript.slice(anchorLine - 1, endLine).join('\n');
    const windowedBlocks = parseWindow(sliceText, anchorLine);
    const johnWindowed = windowedBlocks.find((b) => b.lineNumber === 5);
    const johnFull = parseFountain(boneyardScript.join('\n')).find((b) => b.lineNumber === 5);
    assert.equal(johnFull?.type, 'boneyard');
    assert.notEqual(
      johnWindowed?.type,
      johnFull?.type,
      'expected the windowed parse (with NO boneyard awareness) to diverge here — this is exactly why incremental-decorator.ts checks containsBoneyardMarker before trusting a windowed patch',
    );
  });
});
