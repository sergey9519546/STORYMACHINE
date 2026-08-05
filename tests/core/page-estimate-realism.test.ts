// estimatePages must agree with the real paginator, and land in the density
// range that actual produced screenplays occupy.
//
// WHY: estimatePages used to count non-blank SOURCE lines at ~55 lines/page.
// In Fountain source an entire speech or action paragraph is ONE line however
// many lines it occupies once rendered, so that count bore no relation to page
// count. It under-reported every real script by 2-3x: the 665-word, 14-scene
// sample rendered as "~1 page / ~1 min" in the coverage report header — also
// self-contradictory, since 14 scene headings cannot fit on one page.
//
// GROUND TRUTH, two independent sources that agree:
//   1. The P1 corpus of 761 produced screenplays (scripts/output/corpus-split.json)
//      has a median of 23,604 words. A produced feature runs ~110 pages at the
//      1-page-per-minute convention => ~215 words/page.
//   2. The six CC0 produced screenplays committed under data/screenplays/ pool
//      to 208 words/page under layoutScreenplay — within 3% of (1).
// The old formula implied 434-761 words/page on those same six scripts.
//
// This test pins the fix against source (2), which is committed and therefore
// always available, and asserts the corpus-derived density band from (1).
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { estimatePages } from '../../server/nvm/analyze/doctor.ts';
import { layoutScreenplay } from '../../src/lib/screenplay-layout.ts';

const root = path.resolve(import.meta.dirname, '../..');
const corpusDir = path.join(root, 'data/screenplays');

function wordCount(s: string): number {
  return s.split(/\s+/).filter(Boolean).length;
}

// Produced screenplays occupy roughly this density. The band is deliberately
// wide — short scripts with many scene headings legitimately run leaner (a
// heading plus its blank lines costs vertical space with few words) — but it
// excludes the old formula's 434-761 by a wide margin.
const MIN_WORDS_PER_PAGE = 100;
const MAX_WORDS_PER_PAGE = 320;

describe('estimatePages — realistic, and consistent with the editor', () => {
  const files = fs.existsSync(corpusDir)
    ? fs.readdirSync(corpusDir).filter((f) => f.endsWith('.fountain'))
    : [];

  it('the committed produced-screenplay corpus is present', () => {
    assert.ok(files.length >= 6, `expected the CC0 screenplays in data/screenplays, found ${files.length}`);
  });

  for (const file of files) {
    it(`${file}: agrees with layoutScreenplay and lands in a real density band`, () => {
      const text = fs.readFileSync(path.join(corpusDir, file), 'utf8');
      const est = estimatePages(text);
      assert.ok(est, `${file} should produce an estimate`);

      // 1. The report and the editor must never disagree about length.
      const truth = layoutScreenplay(text).length;
      assert.equal(
        est.pages,
        truth,
        `${file}: report says ${est.pages}pp, the editor's paginator says ${truth}pp — these must match`,
      );

      // 2. The result must be plausible for a real screenplay.
      const wpp = wordCount(text) / est.pages;
      assert.ok(
        wpp >= MIN_WORDS_PER_PAGE && wpp <= MAX_WORDS_PER_PAGE,
        `${file}: ${wpp.toFixed(0)} words/page is outside the produced-screenplay band ` +
          `${MIN_WORDS_PER_PAGE}-${MAX_WORDS_PER_PAGE} (real corpus median ~215). ` +
          `The old source-line formula produced 434-761 here.`,
      );
    });
  }

  it('pooled density across the corpus is close to the 761-script corpus median (~215 w/p)', () => {
    let words = 0;
    let pages = 0;
    for (const file of files) {
      const text = fs.readFileSync(path.join(corpusDir, file), 'utf8');
      words += wordCount(text);
      pages += estimatePages(text)!.pages;
    }
    const pooled = words / pages;
    assert.ok(
      pooled >= 120 && pooled <= 280,
      `pooled ${pooled.toFixed(0)} words/page should sit near the corpus median of ~215`,
    );
  });

  it('a 14-scene sample can never be reported as one page', () => {
    // The specific regression: 14 scene headings do not fit on a single page.
    const sampleSrc = fs.readFileSync(path.join(root, 'src/lib/sample-script.ts'), 'utf8');
    const sample = /`([\s\S]+)`/.exec(sampleSrc)?.[1];
    assert.ok(sample, 'expected to extract the sample screenplay');
    const sceneHeadings = sample.split('\n').filter((l) => /^(INT|EXT)[. ]/.test(l.trim())).length;
    const est = estimatePages(sample)!;
    assert.ok(sceneHeadings >= 10, `sanity: sample should be scene-dense, got ${sceneHeadings}`);
    assert.ok(
      est.pages > 1,
      `a ${sceneHeadings}-scene script reported as ${est.pages} page(s) — scene headings alone exceed one page`,
    );
  });

  it('empty input yields no estimate rather than a fabricated one', () => {
    assert.equal(estimatePages(''), null);
    assert.equal(estimatePages('   \n\n  '), null);
  });

  it('runtime keeps the one-page-per-minute convention', () => {
    const text = fs.readFileSync(path.join(corpusDir, files[0]), 'utf8');
    const est = estimatePages(text)!;
    assert.equal(est.runtimeMinutes, est.pages);
  });
});
