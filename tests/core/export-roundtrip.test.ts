// Export -> re-import: what survives, what does not, and the report that comes
// back — adversarial finding #18.
//
// THE FINDING. Exporting the 231-scene fixture to FDX and importing it back
// dropped the title page (`Title:` / `Credit:` / `Author:` / `Draft date:`),
// mangled every `FADE OUT.` into `> FADE OUT.:`, and produced a different
// report on the returned file than on the file that was sent:
//
//     health 84.4 -> 84.8 · wordCount 19,293 -> 17,442 · issues 899 -> 887
//
// with nothing anywhere in the product saying any of it would happen.
//
// THE SPLIT THIS FILE ENFORCES.
//
//   BUG, fixed — the title page (server/lib/fdx-import.ts deleted the whole
//   <TitlePage> subtree), the draft date (it was not in the shared
//   ExportTitlePage model at all, so every exporter dropped it), and the
//   transition terminator (a transition already ending in "." had a colon
//   appended to it). Asserted here as preserved, per format.
//
//   FORMAT LIMIT, disclosed — the Fountain constructs that are DEFINED as never
//   printed (boneyard, notes, synopses, section headings). FDX, PDF and DOCX
//   have no construct for them. Asserted here as EXACTLY the loss: the round
//   trip is compared against the source with those constructs stripped, so a
//   round trip that lost one printing line fails even though the word count
//   would still be "about right".
//
//   NO IMPORTER AT ALL — .docx. Asserted, so the disclosure stays true if one is
//   ever added without the copy being updated.
//
// The contentHash is asserted preserved where it SHOULD be: a draft already in
// the importer's own canonical shape (no non-printing constructs) makes the FDX
// round trip an identity, so `sha256(trim(x))` — which is exactly how
// server/routes/export.ts computes a report's contentHash — is unchanged, and
// so is the whole report.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { fountainToFdx } from '../../src/lib/fdx.ts';
import { fdxToFountain } from '../../server/lib/fdx-import.ts';
import { fountainToPdf } from '../../src/lib/pdf.ts';
import { pdfToFountain } from '../../server/lib/pdf-import.ts';
import { parseFountainTitleBlock } from '../../src/lib/fountain-title-block.ts';
import {
  EXPORT_ROUNDTRIP_NOTE, EXPORT_ROUNDTRIP_SUMMARY, NON_PRINTING_FOUNTAIN_CONSTRUCTS,
} from '../../src/lib/export-roundtrip.ts';
import { runScriptDoctor } from '../../server/nvm/analyze/doctor.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, '..', '..');
const SHIP_PANEL = join(REPO, 'src', 'components', 'scriptide', 'ShipPanel.tsx');

/** The same hash server/routes/export.ts falls back to for a report's
 *  contentHash: sha256 of the trimmed script text. */
function contentHash(fountain: string): string {
  return createHash('sha256').update(fountain.trim()).digest('hex');
}

/** The source with every non-printing Fountain construct removed — the exact
 *  set `NON_PRINTING_FOUNTAIN_CONSTRUCTS` names. This is the disclosure, as
 *  code: what a printed-page format is expected to come back with. */
function withoutNonPrinting(fountain: string): string {
  return fountain
    .replace(/\/\*[\s\S]*?\*\//g, '')        // boneyard
    .replace(/\[\[[\s\S]*?\]\]/g, '')        // inline notes
    .split('\n')
    .filter(line => !/^\s*=(?!=)/.test(line)) // synopses
    .filter(line => !/^\s*#{1,6}\s/.test(line)) // section headings
    .join('\n');
}

/** Content lines, whitespace-normalised — blank-line discipline differs between
 *  a hand-written Fountain file and the importer's output, and that difference
 *  is not a loss. */
function contentLines(fountain: string): string[] {
  return fountain.split('\n').map(l => l.trim()).filter(Boolean);
}

const CASES = [
  { name: 'the 231-scene feature fixture', path: 'tests/fixtures/feature-length/assembled-feature.fountain' },
  { name: 'runoff (9 scenes)', path: 'data/screenplays/runoff.fountain' },
  { name: 'chain-of-custody (13 scenes)', path: 'data/screenplays/chain-of-custody.fountain' },
];

// ── The bug half: what must now survive ──────────────────────────────────────

describe('the FDX round trip preserves everything that prints', () => {
  for (const c of CASES) {
    it(`${c.name}: the loss is EXACTLY the non-printing constructs`, () => {
      const src = readFileSync(join(REPO, c.path), 'utf8');
      const back = fdxToFountain(fountainToFdx(src)).fountain;

      const expected = contentLines(withoutNonPrinting(src));
      const actual = contentLines(back);
      const missing = expected.filter(l => !actual.includes(l));

      assert.deepEqual(
        missing, [],
        `${c.name}: the round trip lost printing lines, not only non-printing ones`,
      );
    });

    it(`${c.name}: the title page comes back`, () => {
      const src = readFileSync(join(REPO, c.path), 'utf8');
      const before = parseFountainTitleBlock(src);
      const back = fdxToFountain(fountainToFdx(src)).fountain;
      const after = parseFountainTitleBlock(back);
      assert.deepEqual(after, before, `${c.name}: the title page did not survive the round trip`);
      // The draft date too — not one of the three fields parseFountainTitleBlock
      // used to carry, and the one line the title-page fix alone still lost.
      const draftDate = src.match(/^Draft date:\s*(.+)$/m);
      if (draftDate) {
        assert.match(back, new RegExp(`^Draft date: ${draftDate[1].trim()}$`, 'm'));
      }
    });

    it(`${c.name}: every transition comes back as written`, () => {
      const src = readFileSync(join(REPO, c.path), 'utf8');
      const back = fdxToFountain(fountainToFdx(src)).fountain;
      const transitions = (t: string) => t.split('\n')
        .map(l => l.trim())
        .filter(l => /^(?:> )?(?:FADE (?:IN|OUT)|CUT TO|DISSOLVE TO|SMASH CUT)[.:]/i.test(l));
      assert.deepEqual(transitions(back), transitions(src),
        `${c.name}: a transition was reworded by the round trip`);
      assert.ok(!/FADE OUT\.:/i.test(back), 'the doubled terminator must not reappear');
    });
  }
});

describe('a draft with no non-printing text round-trips to the same contentHash', () => {
  // The canonical shape: exactly what server/lib/fdx-import.ts emits, so the
  // round trip is an identity and the hash — the value every exported report
  // publishes and every verifier recomputes — is unchanged.
  const CANONICAL = [
    'Title: THE CANONICAL DRAFT',
    'Credit: Written by',
    'Author: A. Writer',
    'Draft date: 2026-09-12',
    '',
    'INT. KITCHEN - DAY',
    '',
    'MAYA pours coffee and does not drink it.',
    '',
    'MAYA',
    '(quietly)',
    'You said Thursday.',
    '',
    'DAN',
    'I said I would try.',
    '',
    'CUT TO:',
    '',
    'EXT. PORCH - NIGHT',
    '',
    'The cup is still full on the rail.',
    '',
    'FADE OUT.',
    '',
  ].join('\n');

  it('the text is byte-identical and so is the hash', () => {
    const back = fdxToFountain(fountainToFdx(CANONICAL)).fountain;
    assert.equal(back.trim(), CANONICAL.trim());
    assert.equal(contentHash(back), contentHash(CANONICAL));
  });

  it('and the report the engine produces from it is the same report', async () => {
    const back = fdxToFountain(fountainToFdx(CANONICAL)).fountain;
    const before = await runScriptDoctor(CANONICAL);
    const after = await runScriptDoctor(back);
    assert.equal(after.health, before.health);
    assert.equal(after.verdict, before.verdict);
    assert.equal(after.grade, before.grade);
    assert.equal(after.sceneCount, before.sceneCount);
    assert.equal(after.wordCount, before.wordCount);
    assert.equal(after.contentHash, before.contentHash);
  });

  it('a second round trip changes nothing — the conversion is idempotent', () => {
    const once = fdxToFountain(fountainToFdx(CANONICAL)).fountain;
    const twice = fdxToFountain(fountainToFdx(once)).fountain;
    assert.equal(twice, once);
  });
});

// ── The format half: what is disclosed, measured ─────────────────────────────

describe('the disclosed loss is the measured loss', () => {
  it('FDX: the words that do not come back are the non-printing ones', async () => {
    const src = readFileSync(join(REPO, 'tests/fixtures/feature-length/assembled-feature.fountain'), 'utf8');
    const back = fdxToFountain(fountainToFdx(src)).fountain;

    const before = await runScriptDoctor(src);
    const after = await runScriptDoctor(back);

    // Everything structural survives.
    assert.equal(after.sceneCount, before.sceneCount, 'no scene may be lost');
    assert.equal(after.verdict, before.verdict);
    assert.equal(after.grade, before.grade);

    // The word gap is the non-printing text, within the blank-line and
    // punctuation noise a format conversion legitimately introduces.
    const stripped = await runScriptDoctor(withoutNonPrinting(src));
    const gap = Math.abs(after.wordCount - stripped.wordCount);
    assert.ok(gap < stripped.wordCount * 0.01,
      `the FDX round trip loses ${after.wordCount} vs ${stripped.wordCount} words with the `
      + 'non-printing text already removed — that gap is not explained by the disclosure');
    assert.ok(after.wordCount < before.wordCount,
      'sanity: this fixture does carry non-printing text, so some loss is expected');
  });

  it('PDF: comes back as text, with the same scene count', async () => {
    const src = readFileSync(join(REPO, 'data/screenplays/runoff.fountain'), 'utf8');
    const back = (await pdfToFountain(fountainToPdf(src))).fountain;
    const before = await runScriptDoctor(src);
    const after = await runScriptDoctor(back);
    assert.equal(after.sceneCount, before.sceneCount,
      'a PDF round trip must not lose a scene — the disclosure only claims line breaks are inferred');
    assert.notEqual(after.contentHash, before.contentHash,
      'sanity: a PDF round trip is NOT hash-preserving, which is what the disclosure says');
  });

  it('DOCX: there is still no importer, which is what the copy claims', async () => {
    const docx = await import('../../src/lib/docx.ts');
    assert.ok(typeof docx.fountainToDocx === 'function');
    assert.ok(!('docxToFountain' in docx),
      'a .docx importer exists now — EXPORT_ROUNDTRIP_NOTE.docx is no longer true');
  });
});

describe('the writer is told, where the button is', () => {
  const src = readFileSync(SHIP_PANEL, 'utf8');

  it('every export button carries its own round-trip note', () => {
    assert.ok(src.includes('EXPORT_ROUNDTRIP_NOTE[format]'),
      'the button title must come from the shared module');
    for (const format of ['fountain', 'fdx', 'pdf', 'docx'] as const) {
      assert.ok(src.includes(`format: "${format}"`), `no export action declares format ${format}`);
    }
  });

  it('the always-visible paragraph states the summary', () => {
    assert.ok(src.includes('EXPORT_ROUNDTRIP_SUMMARY'));
    assert.ok(src.includes('data-export-roundtrip'), 'a stable hook for the browser suite');
  });

  it('the summary agrees with each per-format note on the fact that matters', () => {
    // .docx: both say it cannot come back.
    assert.match(EXPORT_ROUNDTRIP_NOTE.docx, /Cannot be brought back/);
    assert.match(EXPORT_ROUNDTRIP_SUMMARY, /\.docx cannot be re-imported/);
    // .fountain and .fdx: both say what prints survives.
    assert.match(EXPORT_ROUNDTRIP_NOTE.fountain, /Comes back whole/);
    assert.match(EXPORT_ROUNDTRIP_NOTE.fdx, /Comes back whole/);
    assert.match(EXPORT_ROUNDTRIP_SUMMARY, /\.fountain and \.fdx re-import without losing anything that prints/);
    // PDF: both say it is re-read from layout.
    assert.match(EXPORT_ROUNDTRIP_NOTE.pdf, /where it sits on the page/);
    assert.match(EXPORT_ROUNDTRIP_SUMMARY, /re-read from its page layout/);
  });

  it('the disclosed non-printing set is the set the test strips', () => {
    // The list is the disclosure's own definition of the loss; if an entry is
    // added here without withoutNonPrinting learning about it, the "exactly the
    // disclosed set" assertions above stop meaning what they say.
    assert.deepEqual([...NON_PRINTING_FOUNTAIN_CONSTRUCTS], [
      'boneyard comments (/* … */)',
      'inline notes ([[ … ]])',
      'synopses (= …)',
      'section headings (# …)',
    ]);
  });
});
