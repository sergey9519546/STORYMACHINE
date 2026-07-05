// Script Doctor — PDF screenplay import.
// Conventions: node:test + assert/strict, matching tests/core/fdx-import.test.ts.
//
// Coverage: slugline/action/character/dialogue/parenthetical/transition
// classification by x-position, forced (non-INT/EXT) scene headings,
// page-number/CONTINUED/MORE/(CONT'D) stripping, repeated header/footer
// stripping, multi-page dialogue continuation, the %PDF-missing and
// no-text-layer error paths, and determinism.
//
// Fixture PDFs are built programmatically right here (per this feature's
// brief) rather than checked in as binary files: an uncompressed PDF with a
// BT/Tf/Tm/Tj content stream and a correct xref table is fully legal PDF and
// far easier to keep in sync with each test's exact expectations than a
// binary fixture would be.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { pdfToFountain } from '../../server/lib/pdf-import.ts';

// ── PDF fixture builder ──────────────────────────────────────────────────────
// Places each run of text at an exact (x, y) PDF-user-space position via a
// `1 0 0 1 x y Tm` (absolute text matrix) + `(text) Tj` pair, so a test can
// assert on screenplay-column classification without needing pdfjs to do any
// layout guesswork of its own. Multiple runs on one `y` (a `line`'s `runs`
// array) let a test also exercise the x-gap word-spacing heuristic across
// multiple glyph runs on the same visual line.
interface Run { x: number; text: string }
interface Line { y: number; runs: Run[] }
type Page = Line[];

function escapePdfString(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

function buildScreenplayPdf(pages: Page[], opts: { width?: number; height?: number } = {}): Buffer {
  const width = opts.width ?? 612;
  const height = opts.height ?? 792;

  // Object numbering: 1=Catalog, 2=Pages, 3=Font, then a (Page, Contents)
  // pair per input page.
  const objects: string[] = [];
  const pageObjNums: number[] = [];
  const contentObjNums: number[] = [];
  let nextObj = 4;
  for (let p = 0; p < pages.length; p++) {
    pageObjNums.push(nextObj++);
    contentObjNums.push(nextObj++);
  }

  objects[1] = '<< /Type /Catalog /Pages 2 0 R >>';
  objects[2] = `<< /Type /Pages /Kids [${pageObjNums.map(n => `${n} 0 R`).join(' ')}] /Count ${pages.length} >>`;
  // WinAnsiEncoding explicitly, so apostrophes/quotes in test fixtures decode
  // as plain ASCII rather than a bare Type1 font's built-in StandardEncoding
  // (which maps the apostrophe code point to a typographic curly quote) —
  // real screenplay-app PDF exports specify an encoding for the same reason.
  objects[3] = '<< /Type /Font /Subtype /Type1 /BaseFont /Courier /Encoding /WinAnsiEncoding >>';

  for (let p = 0; p < pages.length; p++) {
    const pageObjNum = pageObjNums[p]!;
    const contentObjNum = contentObjNums[p]!;
    objects[pageObjNum] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${width} ${height}] `
      + `/Resources << /Font << /F1 3 0 R >> >> /Contents ${contentObjNum} 0 R >>`;

    const ops = ['BT', '/F1 12 Tf'];
    for (const line of pages[p]!) {
      for (const run of line.runs) {
        ops.push(`1 0 0 1 ${run.x} ${line.y} Tm`);
        ops.push(`(${escapePdfString(run.text)}) Tj`);
      }
    }
    ops.push('ET');
    const content = ops.join('\n');
    objects[contentObjNum] = `<< /Length ${Buffer.byteLength(content)} >>\nstream\n${content}\nendstream`;
  }

  return assemblePdf(objects, nextObj - 1);
}

// A single-page PDF whose content stream has no text-showing operators at
// all — simulates a scanned page with no extractable text layer.
function buildBlankPagePdf(): Buffer {
  const objects: string[] = [];
  objects[1] = '<< /Type /Catalog /Pages 2 0 R >>';
  objects[2] = '<< /Type /Pages /Kids [3 0 R] /Count 1 >>';
  objects[3] = '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R >>';
  objects[4] = '<< /Length 0 >>\nstream\n\nendstream';
  return assemblePdf(objects, 4);
}

// Shared object-table → full-PDF-bytes assembly: writes each numbered object
// in order, recording its byte offset, then appends a standard xref table
// and trailer pointing at object 1 (Catalog) as /Root.
function assemblePdf(objects: string[], totalObjs: number): Buffer {
  let pdf = '%PDF-1.4\n%\xE2\xE3\xCF\xD3\n';
  const offsets = new Array<number>(totalObjs + 1).fill(0);
  for (let i = 1; i <= totalObjs; i++) {
    offsets[i] = Buffer.byteLength(pdf, 'binary');
    pdf += `${i} 0 obj\n${objects[i]}\nendobj\n`;
  }
  const xrefOffset = Buffer.byteLength(pdf, 'binary');
  pdf += `xref\n0 ${totalObjs + 1}\n`;
  pdf += '0000000000 65535 f \n';
  for (let i = 1; i <= totalObjs; i++) {
    pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${totalObjs + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return Buffer.from(pdf, 'binary');
}

// Standard US Letter screenplay column x-positions (pt from the left edge),
// matching server/lib/pdf-import.ts's FIXED_BANDS exactly.
const X_ACTION = 108;
const X_DIALOGUE = 180;
const X_PARENTHETICAL = 223;
const X_CHARACTER = 266;

describe('pdfToFountain — classification by position', () => {
  it('classifies a slugline, action, character, parenthetical, dialogue, and transition purely by x-position', async () => {
    const pdf = buildScreenplayPdf([[
      { y: 700, runs: [{ x: X_ACTION, text: 'INT. KITCHEN - DAY' }] },
      { y: 680, runs: [{ x: X_ACTION, text: 'Sarah stares at the letter, hands trembling.' }] },
      { y: 650, runs: [{ x: X_CHARACTER, text: 'SARAH' }] },
      { y: 636, runs: [{ x: X_PARENTHETICAL, text: '(whispering)' }] },
      { y: 622, runs: [{ x: X_DIALOGUE, text: 'I cannot believe this is real.' }] },
      { y: 600, runs: [{ x: X_CHARACTER, text: 'JOHN' }] },
      { y: 586, runs: [{ x: X_DIALOGUE, text: 'We need to go now.' }] },
      { y: 560, runs: [{ x: 380, text: 'CUT TO:' }] },
    ]]);

    const { fountain, warnings } = await pdfToFountain(new Uint8Array(pdf));
    assert.deepEqual(warnings, []);

    assert.match(fountain, /^INT\. KITCHEN - DAY$/m);
    assert.match(fountain, /^Sarah stares at the letter, hands trembling\.$/m);
    assert.match(fountain, /^SARAH$/m);
    assert.match(fountain, /^JOHN$/m);
    assert.match(fountain, /^We need to go now\.$/m);
    assert.match(fountain, /^CUT TO:$/m);

    // Character/Parenthetical/Dialogue of one speech sit tight together — no
    // blank line between them (Fountain's blank-line discipline, same as
    // fdx-import.ts's round trip).
    assert.match(fountain, /^SARAH\n\(whispering\)\nI cannot believe this is real\.$/m);

    // A blank line separates each new block (scene heading → action →
    // character block → character block → transition).
    const blocks = fountain.trim().split('\n\n');
    assert.equal(blocks.length, 5);
  });

  it('classifies dialogue split across multiple x-gapped glyph runs on one line, inferring word spaces correctly', async () => {
    const pdf = buildScreenplayPdf([[
      { y: 700, runs: [{ x: X_ACTION, text: 'INT. OFFICE - DAY' }] },
      {
        y: 650,
        runs: [
          { x: X_DIALOGUE, text: 'Multiple' },
          { x: X_DIALOGUE + 60, text: 'glyph' },
          { x: X_DIALOGUE + 100, text: 'runs.' },
        ],
      },
    ]]);
    // No character cue precedes this dialogue-band line, so it's classified
    // as an orphaned dialogue-band line (still emitted, just outside a
    // speech) — the point of this test is the word-spacing merge, not the
    // surrounding block structure.
    const { fountain } = await pdfToFountain(new Uint8Array(pdf));
    assert.match(fountain, /Multiple glyph runs\./);
  });

  it('force-headings a slugline-band line that reads like a heading but lacks INT/EXT', async () => {
    const pdf = buildScreenplayPdf([[
      { y: 700, runs: [{ x: X_ACTION, text: 'THE OLD MILL - LATER' }] },
      { y: 680, runs: [{ x: X_ACTION, text: 'Dust settles in the moonlight.' }] },
    ]]);
    const { fountain } = await pdfToFountain(new Uint8Array(pdf));
    // Forced with Fountain's leading "." marker, matching fdx-import.ts's
    // formatSceneHeading convention for the same "heading-shaped but no
    // INT/EXT" case.
    assert.match(fountain, /^\.THE OLD MILL - LATER$/m);
  });

  it('does not force-heading an ordinary action-band sentence that merely happens to be short', async () => {
    const pdf = buildScreenplayPdf([[
      { y: 700, runs: [{ x: X_ACTION, text: 'EXT. PARK - DAY' }] },
      { y: 680, runs: [{ x: X_ACTION, text: 'She waits.' }] },
    ]]);
    const { fountain } = await pdfToFountain(new Uint8Array(pdf));
    assert.match(fountain, /^She waits\.$/m);
    assert.doesNotMatch(fountain, /^\.She waits\.$/m);
  });
});

describe('pdfToFountain — page-number, MORE, and CONTINUED stripping', () => {
  it('strips page numbers, a repeated running header, and (MORE)/CONTINUED: page-break furniture', async () => {
    const titleHeader = { x: 280, text: 'The Long Wait' };
    const page1: Page = [
      { y: 754, runs: [titleHeader] }, // repeated running header (top margin band)
      { y: 700, runs: [{ x: X_ACTION, text: 'INT. WAREHOUSE - NIGHT' }] },
      { y: 680, runs: [{ x: X_ACTION, text: 'Rain hammers the tin roof.' }] },
      { y: 650, runs: [{ x: X_CHARACTER, text: 'JAX' }] },
      { y: 636, runs: [{ x: X_DIALOGUE, text: 'This speech keeps going right up to the' }] },
      { y: 622, runs: [{ x: X_DIALOGUE, text: 'bottom of the page where it gets cut off' }] },
      { y: 608, runs: [{ x: 340, text: '(MORE)' }] },
      { y: 36, runs: [{ x: 296, text: '1.' }] }, // page number, bottom margin
    ];
    const page2: Page = [
      { y: 754, runs: [titleHeader] }, // repeated running header, page 2
      { y: 726, runs: [{ x: X_ACTION, text: 'CONTINUED:' }] },
      { y: 700, runs: [{ x: X_CHARACTER, text: "JAX (CONT'D)" }] },
      { y: 686, runs: [{ x: X_DIALOGUE, text: 'and picks back up here on page two.' }] },
      { y: 36, runs: [{ x: 296, text: '2.' }] }, // page number, bottom margin
    ];

    const { fountain, warnings } = await pdfToFountain(new Uint8Array(buildScreenplayPdf([page1, page2])));

    assert.doesNotMatch(fountain, /The Long Wait/);
    assert.doesNotMatch(fountain, /^1\.$/m);
    assert.doesNotMatch(fountain, /^2\.$/m);
    assert.doesNotMatch(fountain, /MORE/);
    assert.doesNotMatch(fountain, /CONTINUED/i);

    assert.ok(
      warnings.some(w => /repeated header\/footer/.test(w)),
      `expected a repeated-header warning, got ${JSON.stringify(warnings)}`,
    );
  });

  it('leaves a legitimately short numeric-looking scene element alone when it is not in the margin band', async () => {
    // A page number is only ever recognized in the top/bottom margin band —
    // regression guard against over-eagerly stripping any short digit line.
    const pdf = buildScreenplayPdf([[
      { y: 700, runs: [{ x: X_ACTION, text: 'INT. ROOM 12 - DAY' }] },
      { y: 400, runs: [{ x: X_ACTION, text: '12' }] }, // mid-page, not margin-band furniture
    ]]);
    const { fountain } = await pdfToFountain(new Uint8Array(pdf));
    assert.match(fountain, /^12$/m);
  });
});

describe('pdfToFountain — multi-page dialogue continuation', () => {
  it('merges a speech split across a page break into one uninterrupted dialogue block', async () => {
    const page1: Page = [
      { y: 700, runs: [{ x: X_ACTION, text: 'INT. WAREHOUSE - NIGHT' }] },
      { y: 650, runs: [{ x: X_CHARACTER, text: 'JAX' }] },
      { y: 636, runs: [{ x: X_DIALOGUE, text: 'This sentence starts on page one' }] },
      { y: 622, runs: [{ x: 340, text: '(MORE)' }] },
    ];
    const page2: Page = [
      { y: 726, runs: [{ x: X_ACTION, text: 'CONTINUED:' }] },
      { y: 700, runs: [{ x: X_CHARACTER, text: "JAX (CONT'D)" }] },
      { y: 686, runs: [{ x: X_DIALOGUE, text: 'and finishes on page two.' }] },
    ];

    const { fountain } = await pdfToFountain(new Uint8Array(buildScreenplayPdf([page1, page2])));

    // Exactly one "JAX" cue survives — the page-2 "JAX (CONT'D)" re-cue is
    // absorbed into the same speech, not re-emitted as a second block.
    const jaxCues = fountain.match(/^JAX\b.*$/gm) ?? [];
    assert.equal(jaxCues.length, 1);
    assert.equal(jaxCues[0], 'JAX');

    // The two dialogue lines appear back-to-back under that one cue, with no
    // blank line and no stray "(CONT'D)"/"CONTINUED:"/"(MORE)" text between.
    assert.match(
      fountain,
      /^JAX\nThis sentence starts on page one\nand finishes on page two\.$/m,
    );
  });

  it('does NOT merge a genuinely new speaker whose name happens to follow a MORE-truncated speech', async () => {
    const page1: Page = [
      { y: 700, runs: [{ x: X_ACTION, text: 'INT. WAREHOUSE - NIGHT' }] },
      { y: 650, runs: [{ x: X_CHARACTER, text: 'JAX' }] },
      { y: 636, runs: [{ x: X_DIALOGUE, text: 'Keep quiet.' }] },
    ];
    const page2: Page = [
      { y: 700, runs: [{ x: X_CHARACTER, text: 'MARA' }] }, // different speaker, no (CONT'D)
      { y: 686, runs: [{ x: X_DIALOGUE, text: 'Someone is coming.' }] },
    ];
    const { fountain } = await pdfToFountain(new Uint8Array(buildScreenplayPdf([page1, page2])));
    assert.match(fountain, /^JAX$/m);
    assert.match(fountain, /^MARA$/m);
    // Both cues are distinct, real blocks — not merged into one.
    assert.equal((fountain.match(/^(JAX|MARA)$/gm) ?? []).length, 2);
  });
});

describe('pdfToFountain — invalid input', () => {
  it('throws when the bytes have no %PDF header at all', async () => {
    await assert.rejects(
      () => pdfToFountain(new Uint8Array(Buffer.from('This is just a plain text file, not a PDF.', 'utf8'))),
      /no %PDF header/i,
    );
  });

  it('throws the documented scan message when no page has a text layer', async () => {
    await assert.rejects(
      () => pdfToFountain(new Uint8Array(buildBlankPagePdf())),
      /This PDF has no text layer \(it may be a scan\)\. Export the script from your writing app instead\./,
    );
  });

  it('warns (but does not throw) when only some pages lack a text layer', async () => {
    // Page 1 has real text; page 2 has an empty content stream (e.g. an
    // inserted storyboard/image-only page) — the document as a whole still
    // converts using page 1's content, with a per-page warning about the
    // empty one rather than the document-level scan error.
    const pdf = buildScreenplayPdf([
      [{ y: 700, runs: [{ x: X_ACTION, text: 'INT. ROOM - DAY' }] }],
      [], // page 2: no lines at all → an empty content stream
    ]);
    const { fountain, warnings } = await pdfToFountain(new Uint8Array(pdf));
    assert.match(fountain, /^INT\. ROOM - DAY$/m);
    assert.ok(
      warnings.some(w => /Page 2:.*no text layer/.test(w)),
      `expected a page-2 no-text-layer warning, got ${JSON.stringify(warnings)}`,
    );
  });
});

describe('pdfToFountain — determinism', () => {
  it('produces byte-identical output across repeated conversions of the same bytes', async () => {
    const pdf = buildScreenplayPdf([
      [
        { y: 700, runs: [{ x: X_ACTION, text: 'INT. WAREHOUSE - NIGHT' }] },
        { y: 680, runs: [{ x: X_ACTION, text: 'Rain hammers the tin roof.' }] },
        { y: 650, runs: [{ x: X_CHARACTER, text: 'JAX' }] },
        { y: 636, runs: [{ x: X_DIALOGUE, text: 'She said midnight.' }] },
      ],
    ]);
    const bytes = new Uint8Array(pdf);
    const first = await pdfToFountain(bytes);
    const second = await pdfToFountain(bytes);
    assert.deepEqual(first, second);
  });
});
