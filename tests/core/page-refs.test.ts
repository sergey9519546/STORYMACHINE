// server/lib/page-refs.ts — "the number in the report is the number on the page".
//
// The claim this file has to prove is not "page-refs returns plausible numbers".
// It is that a producer who reads "Scene 58 (p. 47)" and turns to the page
// printed 47 in the exported PDF finds scene 58 there. So the assertions below
// run the REAL PDF writer (src/lib/pdf.ts's fountainToPdf), pull the page label
// out of each page's content stream, and compare.
//
// Page-number convention being pinned (src/lib/pdf.ts):
//   stream 0 = the title page   -> pageNumber 0 sentinel, prints NOTHING
//   stream 1 = script page 1    -> prints NOTHING (industry convention)
//   stream k = script page k    -> prints "k."
// A reference to page 1 is therefore a reference to an unnumbered page, which is
// correct: a reader counts the script's first page as page one whether or not it
// carries the numeral.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { scenePageNumbers, pageRefLabel, pageForSceneIdxs } from '../../server/lib/page-refs.ts';
import { fountainToPdf } from '../../src/lib/pdf.ts';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const FEATURE = readFileSync(
  path.join(REPO_ROOT, 'tests/fixtures/feature-length/assembled-feature.fountain'), 'utf-8',
);

/** Every page's content stream, in page order.
 *
 *  pdf.ts emits objects sorted by number, and allocates contentNum then pageNum
 *  per page (4,5 then 6,7 …), so the streams appear in the document in exactly
 *  page order. */
function pdfPageStreams(fountain: string): string[] {
  const bytes = fountainToPdf(fountain);
  let pdf = '';
  for (const b of bytes) pdf += String.fromCharCode(b);
  const streams: string[] = [];
  const re = /stream\n([\s\S]*?)\nendstream/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(pdf)) !== null) streams.push(m[1]);
  return streams;
}

/** The page number actually PRINTED on a page, or null when it prints none.
 *  pdf.ts draws it as the last text-showing operator before ET. */
function printedPageNumber(stream: string): number | null {
  const ops = [...stream.matchAll(/\((\d+)\.\) Tj/g)];
  if (ops.length === 0) return null;
  return Number(ops[ops.length - 1][1]);
}

describe('scenePageNumbers — the feature fixture', () => {
  const pages = scenePageNumbers(FEATURE);

  it('resolves every scene, with nothing guessed', () => {
    assert.equal(pages.length, 231, 'the committed fixture is 231 scenes');
    assert.equal(pages.filter(p => p === null).length, 0, 'every scene heading must be located');
  });

  it('is monotonic — scene k+1 never lands before scene k', () => {
    const nums = pages as number[];
    for (let i = 1; i < nums.length; i++) {
      assert.ok(nums[i] >= nums[i - 1], `scene ${i + 1} on page ${nums[i]} is before scene ${i} on ${nums[i - 1]}`);
    }
  });

  it('spans the whole document rather than collapsing onto page 1', () => {
    const nums = pages as number[];
    assert.equal(nums[0], 1);
    assert.ok(nums[nums.length - 1] > 50, `last scene resolved to page ${nums[nums.length - 1]}`);
  });
});

describe('scenePageNumbers — equals the number PRINTED on the PDF page', () => {
  // Drives the real PDF writer once and checks every scene against it.
  it('the printed label on each referenced page matches the reference (pages 2+)', () => {
    const pages = scenePageNumbers(FEATURE);
    const streams = pdfPageStreams(FEATURE);
    // The fixture has a Fountain title page, so stream index = page number.
    // (stream 0 is the title page, whose sentinel pageNumber is 0.)
    assert.equal(printedPageNumber(streams[0]), null, 'the title page must print no number');
    assert.equal(printedPageNumber(streams[1]), null, 'script page 1 must print no number');

    let checked = 0;
    for (const page of pages as number[]) {
      assert.ok(streams[page] !== undefined, `the PDF has no page ${page}`);
      if (page >= 2) {
        assert.equal(printedPageNumber(streams[page]), page,
          `page ${page} of the PDF prints ${printedPageNumber(streams[page])}`);
        checked += 1;
      }
    }
    assert.ok(checked > 200, `only ${checked} references were checkable against a printed number`);
  });

  it('the scene heading is actually on the page the reference points at', () => {
    const pages = scenePageNumbers(FEATURE) as number[];
    const streams = pdfPageStreams(FEATURE);
    const headings = FEATURE.split('\n')
      .map(l => l.trim())
      .filter(l => /^(INT|EXT|EST|INT\.\/EXT|I\/E)[. ]/i.test(l))
      .map(l => l.toUpperCase());
    assert.equal(headings.length, pages.length, 'heading scrape and scene count must agree');

    // Spot-check across the document rather than all 231: each check is a
    // substring search over a whole page's stream.
    for (const i of [0, 1, 57, 115, 172, 230]) {
      const stream = streams[pages[i]];
      // pdf.ts transliterates a few glyphs; compare on the first 30 characters,
      // which are plain ASCII slug text in this fixture.
      const needle = headings[i].slice(0, 30);
      assert.ok(stream.includes(needle),
        `scene ${i + 1} ("${needle}") is not on page ${pages[i]}`);
    }
  });
});

describe('scenePageNumbers — edge cases', () => {
  it('no scenes at all returns an empty array, not a fabricated page 1', () => {
    assert.deepEqual(scenePageNumbers(''), []);
    assert.deepEqual(scenePageNumbers('Just some prose with no slug.'), []);
  });

  it('a forced heading (leading ".") resolves like any other', () => {
    const pages = scenePageNumbers('.THE VOID\n\nNothing here.\n');
    assert.deepEqual(pages, [1]);
  });

  it('two scenes sharing one slug resolve to their OWN occurrences, not both to the first', () => {
    // 60 pages of filler between two identical slugs.
    const filler = Array.from({ length: 700 }, (_, i) => `Line ${i} of action in the room.`).join('\n\n');
    const script = `INT. CAR - DAY\n\nShe drives.\n\n${filler}\n\nINT. CAR - DAY\n\nShe drives again.\n`;
    const pages = scenePageNumbers(script) as number[];
    assert.equal(pages.length, 2);
    assert.equal(pages[0], 1);
    assert.ok(pages[1] > 1, `the second identical slug collapsed onto page ${pages[1]}`);
  });
});

describe('pageRefLabel', () => {
  it('fire: a resolved page renders a short reference', () => {
    assert.equal(pageRefLabel(1), 'p. 1');
    assert.equal(pageRefLabel(47), 'p. 47');
  });

  it('no-fire: an unresolved page renders NOTHING rather than a broken reference', () => {
    assert.equal(pageRefLabel(null), '');
    assert.equal(pageRefLabel(undefined), '');
    assert.equal(pageRefLabel(0), '');
  });
});

describe('pageForSceneIdxs', () => {
  const scenePages = [1, 1, 2, 5, null, 9];

  it('fire: the earliest resolved page among the finding’s scenes', () => {
    assert.equal(pageForSceneIdxs([3, 2, 5], scenePages), 2);
    assert.equal(pageForSceneIdxs([5], scenePages), 9);
  });

  it('no-fire: no scenes, or only unresolved ones, yields null', () => {
    assert.equal(pageForSceneIdxs([], scenePages), null);
    assert.equal(pageForSceneIdxs([4], scenePages), null);
    assert.equal(pageForSceneIdxs([99], scenePages), null);
  });
});
