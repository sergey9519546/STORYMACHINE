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
//
// ── ROUND 2 (2026-09-12 review): this file could not see either half ─────────
//
// The three scripts below use nothing but boneyard comments, and the expected
// side strips all four non-printing constructs — so a construct that WRONGLY
// SURVIVED (a `# ACT ONE` arriving as a printed action line) was invisible, and
// the five printing constructs the exporter flattened (dual dialogue, centered
// text, lyrics, a forced action line, a page break) were never exercised at all.
// tests/fixtures/fountain-constructs/every-construct.fountain carries one of
// each, and `FDX_CONSTRUCT_FATE` — the disclosure as a table — is asserted row
// by row against it, in BOTH directions: what must come back, and what must not.

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
  FDX_CONSTRUCT_FATE,
} from '../../src/lib/export-roundtrip.ts';
import { parseFountain } from '../../src/lib/fountain.ts';
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
    // An inline note removed from the middle of a printing line leaves a double
    // space behind. src/lib/fdx.ts collapses it so the sentence still reads as
    // written, so the expected side has to collapse it too — otherwise this
    // helper would report a loss where the only difference is one space.
    .split('\n').map(line => line.replace(/[ \t]{2,}/g, ' ').replace(/[ \t]+$/, '')).join('\n')
    .split('\n')
    .filter(line => !/^\s*=(?!=)/.test(line) || /^\s*={3,}\s*$/.test(line)) // synopses (a `===` page break prints)
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

      // A MULTISET comparison, not a set one (2026-09-12 review, non-blocking 3).
      // `expected.filter(l => !actual.includes(l))` was blind to a lost
      // DUPLICATE — one of five identical `MAYA` cues, a repeated action beat —
      // because one surviving copy satisfied every occurrence. Counting each
      // distinct line makes a dropped repeat as visible as a dropped singleton.
      const tally = (ls: string[]) => {
        const m = new Map<string, number>();
        for (const l of ls) m.set(l, (m.get(l) ?? 0) + 1);
        return m;
      };
      const want = tally(expected);
      const got = tally(actual);
      const missing: string[] = [];
      for (const [line, n] of want) {
        const have = got.get(line) ?? 0;
        if (have < n) missing.push(`${n - have}x "${line}"`);
      }

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
    // MEASURED 2026-09-12 on this fixture: the gap is ZERO — the round trip
    // returns exactly the words that remain once the non-printing text is
    // removed. The tolerance used to be 1% (174 words on this fixture), which is
    // two orders of magnitude of slack over a measured gap of nothing, so a real
    // regression could have hidden inside it. Two words of margin is kept only
    // so that a blank-line or punctuation difference in a future fixture is not
    // reported as a lost line; anything larger is a finding, not noise.
    const stripped = await runScriptDoctor(withoutNonPrinting(src));
    const gap = Math.abs(after.wordCount - stripped.wordCount);
    assert.ok(gap <= 2,
      `the FDX round trip returns ${after.wordCount} words against ${stripped.wordCount} with the `
      + `non-printing text already removed (gap ${gap}, measured 0) — that gap is not explained by the disclosure`);
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
    assert.match(EXPORT_ROUNDTRIP_NOTE.fdx, /Everything that prints comes back/);
    assert.match(EXPORT_ROUNDTRIP_SUMMARY, /\.fountain and \.fdx re-import without losing anything that prints/);
    // And both state the non-printing set as LEFT OUT — not as "not carried"
    // while the exporter quietly printed three of the four (round-2 finding).
    assert.match(EXPORT_ROUNDTRIP_NOTE.fdx, /is left out rather than carried/);
    assert.match(EXPORT_ROUNDTRIP_SUMMARY, /leaves out Fountain comments, notes, synopses and section headings/);
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

// ── Every construct the parser supports, one at a time ───────────────────────
//
// The three scripts above are real screenplays and between them use exactly one
// non-core construct (the boneyard). This fixture uses all of them, so the
// disclosure can be asserted row by row instead of in aggregate.

describe('every Fountain construct has a stated fate, and meets it', () => {
  const src = readFileSync(
    join(REPO, 'tests/fixtures/fountain-constructs/every-construct.fountain'), 'utf8',
  );
  const back = fdxToFountain(fountainToFdx(src)).fountain;
  const fdx = fountainToFdx(src);
  const backLines = contentLines(back);
  const typeOf = (text: string, doc: string): string | undefined => {
    for (const b of parseFountain(doc)) {
      if (b.type !== 'empty' && b.text.trim() === text) return b.type;
    }
    return undefined;
  };

  // The construct, the exact line in the fixture, and what it must come back as.
  const CONSTRUCTS: Array<{ fate: keyof typeof FDX_CONSTRUCT_FATE; line: string; type?: string }> = [
    { fate: 'dual dialogue (^)',           line: 'DAN ^',                        type: 'dual_dialogue' },
    { fate: 'centered text (> … <)',       line: '> THE END <',                  type: 'centered' },
    { fate: 'lyrics (~ …)',                line: '~Somewhere a radio plays',     type: 'lyrics' },
    { fate: 'page break (===)',            line: '===',                          type: 'synopsis' },
    { fate: 'forced action (! …)',         line: '!INT. THE MIND OF A KILLER',   type: 'action' },
    { fate: 'boneyard comments (/* … */)', line: '/* a boneyard note' },
    { fate: 'inline notes ([[ … ]])',      line: '[[check this line]]' },
    { fate: 'synopses (= …)',              line: '= Maya finds the log and decides not to report it.' },
    { fate: 'section headings (# …)',      line: '# ACT ONE' },
  ];

  for (const c of CONSTRUCTS) {
    const declared = FDX_CONSTRUCT_FATE[c.fate];
    it(`${c.fate}: the disclosure says "${declared}", and that is what happens`, () => {
      if (declared === 'dropped') {
        // Not carried means NOT CARRIED — not "carried as a printed action
        // line", which is what `# ACT ONE` and `= …` used to do.
        assert.ok(!back.includes(c.line.replace(/^[#=]\s*/, '').replace(/^\/\*\s*/, '')),
          `${c.fate} came back in the body: it is disclosed as never carried`);
        assert.ok(!backLines.includes(c.line), `${c.fate} came back verbatim`);
      } else {
        assert.ok(backLines.includes(c.line),
          `${c.fate} did not survive the round trip — it is disclosed as "${declared}"`);
        if (c.type) {
          assert.equal(typeOf(c.line, back), c.type,
            `${c.fate} came back as text but is no longer parsed as ${c.type}`);
        }
      }
    });
  }

  it('the forced action marker is kept exactly where Fountain needs it, and nowhere else', () => {
    // `!` is a force MARKER, not content: it exists to stop Fountain reading a
    // line as something else. `!INT. …` keeps it — without it the line came back
    // as a SCENE HEADING and the round trip invented a scene. A line that reads
    // as action on its own does not get one, because prefixing `!` to text the
    // writer never forced is a rewrite of their file, not a repair.
    assert.equal(FDX_CONSTRUCT_FATE['forced action (! …)'], 'unforced');
    assert.ok(backLines.includes('!INT. THE MIND OF A KILLER'));
    assert.ok(backLines.includes('FORCED ACTION LINE IN CAPS'));
    assert.ok(!backLines.includes('!FORCED ACTION LINE IN CAPS'));
    assert.equal(typeOf('FORCED ACTION LINE IN CAPS', back), 'action');
  });

  it('the round trip does not invent a scene', () => {
    const scenes = (t: string) => parseFountain(t).filter(b => b.type === 'scene_heading').length;
    assert.equal(scenes(back), scenes(src),
      'the scene count changed — before the round-2 repair "!INT. THE MIND OF A KILLER" '
      + 'came back unforced and re-parsed as a scene heading (2 -> 3)');
    assert.equal(scenes(src), 2);
  });

  it('non-printing text is absent from the FDX document itself, not just from the way back', () => {
    // The strongest form of "not carried": the words are not in the file a
    // writer opens in Final Draft either.
    assert.ok(!fdx.includes('ACT ONE'), 'a section heading is in the exported FDX body');
    assert.ok(!fdx.includes('Maya finds the log'), 'a synopsis is in the exported FDX body');
    assert.ok(!fdx.includes('check this line'), 'an inline note is in the exported FDX body');
    assert.ok(!fdx.includes('a standalone note'), 'a note is in the exported FDX body');
    assert.ok(!fdx.includes('a boneyard note'), 'a boneyard comment is in the exported FDX body');
  });

  it('the printing constructs cross over in FDX vocabulary, not in invented elements', () => {
    // Each one rides on a Paragraph/Text attribute Final Draft already defines,
    // so the exported file is still a document Final Draft reads.
    assert.match(fdx, /<DualDialogue>/);
    assert.match(fdx, /<Paragraph Type="Action" Alignment="Center">/);
    assert.match(fdx, /<Text Style="Italic">Somewhere a radio plays<\/Text>/);
    assert.match(fdx, /<Paragraph Type="Action" StartsNewPage="Yes">/);
    // And nothing outside that vocabulary was invented to carry them.
    const types = [...fdx.matchAll(/<Paragraph Type="([^"]+)"/g)].map(m => m[1]);
    for (const t of new Set(types)) {
      assert.ok(
        [
          // body
          'Scene Heading', 'Action', 'Character', 'Dialogue', 'Parenthetical', 'Transition', 'Shot',
          // title page
          'Title', 'Credit', 'Author', 'Contact', 'Draft Date',
        ].includes(t),
        `the exporter invented a paragraph type: "${t}"`,
      );
    }
  });

  it('the title page still survives, and the whole document round-trips to itself', () => {
    // The verbatim expectation: every fate above, visible in one block of text.
    assert.equal(back.trim(), [
      'Title: THE CONSTRUCT DRAFT',
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
      'DAN ^',
      'I said I would try.',
      '',
      '!INT. THE MIND OF A KILLER',
      '',
      'FORCED ACTION LINE IN CAPS',
      '',
      '~Somewhere a radio plays',
      '',
      '> THE END <',
      '',
      '===',
      '',
      'EXT. PORCH - NIGHT',
      '',
      'The cup is still full on the rail.',
      '',
      'FADE OUT.',
    ].join('\n'));
  });

  it('a second round trip changes nothing — the constructs are stable, not merely restored', () => {
    assert.equal(fdxToFountain(fountainToFdx(back)).fountain, back);
  });

  it('the fate table and the disclosure sentence name the same non-printing set', () => {
    const dropped = Object.entries(FDX_CONSTRUCT_FATE)
      .filter(([, fate]) => fate === 'dropped')
      .map(([name]) => name)
      .sort();
    assert.deepEqual(dropped, [...NON_PRINTING_FOUNTAIN_CONSTRUCTS].sort());
  });
});
