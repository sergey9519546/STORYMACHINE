// The health percentile reads 100 for every real draft — and the fix has to hold
// on EVERY surface at once.
//
// ── The defect (2026-09-06 product discovery, #12) ──────────────────────────
//
// Every percentile in this product is a rank against the calibration reference
// set: twenty hand-authored samples of 9-10 scenes and 256-337 words each, a band
// the corpus's own header explains is deliberate (controlled richness, so craft is
// the only variable). A real screenplay is four to sixty times longer, lands at
// the top of that distribution for being longer, and the number stops being a
// reading about craft.
//
// ── The defect the FIRST fix introduced, which this file exists to pin ──────
//
// The gate was applied per surface, and one surface applied half of it — the
// scene count only. data/screenplays/runoff.fountain is 9 scenes (INSIDE the band)
// and 1,448 words (four times over it), so it read "top 30%" in the Versions list
// and "not comparable" everywhere else, for one draft, in one session.
//
// So: ONE function, symmetric over both dimensions, and these tests drive the
// REAL runoff report through every renderer that shows the number.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  percentileIsComparable, percentileSentenceFor, compactPercentileNoteFor,
  exactRankTooltipFor, percentileCellFor, healthPercentileSentence,
  notComparableSentence, compactNotComparableNote, percentileBand,
  referenceBoundsLine, percentileCaveatSentenceFor,
} from '../../src/lib/percentile-copy.ts';
import { renderCoverageHtml } from '../../server/lib/coverage-html.ts';
import { renderCoverageLetter } from '../../server/lib/coverage-letter.ts';
import { buildReaderTier } from '../../server/lib/reader-tier.ts';
import { buildSlateEntry, rankSlate, renderSlateHtml } from '../../server/lib/slate.ts';
import { snapshotTrend } from '../../src/lib/snapshot-trend.ts';
import { SnapshotSchema } from '../../server/lib/validation.ts';
import { runScriptDoctor } from '../../server/nvm/analyze/doctor.ts';
import { analyzeFountainText } from '../../server/nvm/analyze/fountain-analyzer.ts';
import { buildLogline, findApparentGoal } from '../../server/lib/logline.ts';
import type { Snapshot } from '../../src/components/scriptide/SnapshotManager.tsx';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const RUNOFF = readFileSync(path.join(REPO_ROOT, 'data/screenplays/runoff.fountain'), 'utf8');

describe('runoff.fountain — the fixture the asymmetry was found on', () => {
  it('is 9 scenes (inside the reference band) and far over its word ceiling', async () => {
    const report = await runScriptDoctor(RUNOFF);
    assert.equal(report.sceneCount, 9, 'the scene count is INSIDE the reference band');
    assert.ok(report.wordCount > 337 * 3, `${report.wordCount} words must be far over the band`);
    // The exact shape that made a scene-count-only gate say "comparable".
    assert.equal(percentileIsComparable(report.sceneCount, undefined), false);
    assert.equal(percentileIsComparable(report.sceneCount, report.wordCount), false);
  });

  it('reads NOT COMPARABLE on every renderer that shows the number', async () => {
    const report = await runScriptDoctor(RUNOFF);
    assert.equal(typeof report.healthPercentile, 'number', 'sanity: runoff is scored and ranked');
    const expectedSentence = notComparableSentence();

    // 1. the producer tier
    const tier = buildReaderTier(report, { fountain: RUNOFF });
    assert.equal(tier.percentileLine, expectedSentence);

    // 2. the exported coverage HTML (both the tier and the health section)
    const html = renderCoverageHtml(report, 'Runoff', { fountain: RUNOFF });
    assert.ok(html.includes(expectedSentence));
    assert.ok(!html.includes(healthPercentileSentence(report.healthPercentile!)));
    assert.ok(!html.includes('Exact rank:'), 'no exact ordinal against a set it cannot be compared to');

    // 3. the coverage letter, in both renderings
    const letter = renderCoverageLetter(report, { title: 'Runoff', fountain: RUNOFF });
    assert.ok(letter.markdown.includes(expectedSentence));
    assert.ok(letter.text.includes(expectedSentence));

    // 4. the exported slate table
    const slateHtml = renderSlateHtml(
      rankSlate([buildSlateEntry('Runoff', report, report.contentHash ?? 'hash')]), 0,
    );
    assert.ok(slateHtml.includes('not comparable'), 'the slate cell must say so too');
    assert.ok(!/\d+th pct/.test(slateHtml), 'and must not render the old hardcoded-"th" ordinal');

    // 5. the Versions list, through the real snapshot -> trend path
    const snapshot: Snapshot = {
      id: 's1', name: 'v1', text: RUNOFF, date: '2026-09-11',
      health: report.health, verdict: report.verdict, sceneCount: report.sceneCount,
      wordCount: report.wordCount, healthPercentile: report.healthPercentile,
    };
    const [entry] = snapshotTrend([snapshot]);
    assert.equal(entry.wordCount, report.wordCount, 'the trend entry carries the word count');
    assert.equal(
      compactPercentileNoteFor(entry.healthPercentile!, entry.sceneCount, entry.wordCount),
      compactNotComparableNote(),
      'the Versions row must read not comparable — this is the exact cell that read "top 30%"',
    );
    assert.equal(exactRankTooltipFor(entry.healthPercentile!, entry.sceneCount, entry.wordCount), undefined);
  });
});

describe('an in-band draft still gets a real reading — the gate is not a blanket off switch', () => {
  it('every helper returns the band form for a sample-shaped draft', () => {
    assert.equal(percentileSentenceFor(42, 10, 300), healthPercentileSentence(42));
    assert.equal(compactPercentileNoteFor(42, 10, 300), `top 60% of a 20-sample, hand-authored synthetic reference set`);
    assert.equal(percentileCellFor(42, 10, 300), percentileBand(42));
    assert.ok(exactRankTooltipFor(42, 10, 300)?.startsWith('Exact rank:'));
  });
});

describe('legacy snapshots — absent wordCount degrades to not comparable, never to a stale band', () => {
  it('a snapshot saved before the field existed carries null and reads not comparable', () => {
    const legacy = {
      id: 's0', name: 'old', text: 'INT. ROOM - DAY\n\nAction.', date: '2026-08-01',
      health: 70, sceneCount: 10, healthPercentile: 90,
    } as Snapshot;
    const [entry] = snapshotTrend([legacy]);
    assert.equal(entry.wordCount, null, 'absent means null, not 0');
    assert.equal(
      compactPercentileNoteFor(entry.healthPercentile!, entry.sceneCount, entry.wordCount),
      compactNotComparableNote(),
    );
  });

  it('the zod schema ACCEPTS an absent wordCount', () => {
    const parsed = SnapshotSchema.safeParse({ id: 'a', text: 'x', health: 70, sceneCount: 10 });
    assert.equal(parsed.success, true);
  });

  it('the zod schema REJECTS a malformed wordCount rather than storing it', () => {
    for (const bad of ['1200', -5, 12.5, null, {}, NaN]) {
      const parsed = SnapshotSchema.safeParse({ id: 'a', text: 'x', wordCount: bad });
      assert.equal(parsed.success, false, `wordCount ${JSON.stringify(bad)} must be rejected`);
    }
  });

  it('the zod schema accepts a well-formed one', () => {
    const parsed = SnapshotSchema.safeParse({ id: 'a', text: 'x', wordCount: 1448 });
    assert.equal(parsed.success, true);
  });
});

describe('no surface keeps its own comparability decision', () => {
  // Source-text proof, matching the convention of
  // tests/core/percentile-copy-consistency.test.ts: every percentile-showing
  // surface must call a gated helper, and none may call the raw band formatter for
  // the HEADLINE percentile. percentileBand itself stays legitimate for the
  // per-DIMENSION percentiles (ScriptDoctorPanel's dimension rows), which rank
  // against the same set's per-dimension distributions.
  const SURFACES: Array<[string, string]> = [
    ['server/lib/coverage-html.ts', 'percentileSentenceFor'],
    // Round 2: the letter's only percentile use is its how-to-read caveat, whose
    // trailing clause is branched on comparability too — so it calls the gated
    // sentence-PLUS-qualification helper rather than the bare gated sentence.
    ['server/lib/coverage-letter.ts', 'percentileCaveatSentenceFor'],
    ['server/lib/reader-tier.ts', 'percentileSentenceFor'],
    ['server/lib/slate.ts', 'percentileCellFor'],
    ['src/components/SlatePanel.tsx', 'percentileCellFor'],
    ['src/components/WhatIfPanel.tsx', 'compactPercentileNoteFor'],
    ['src/components/scriptide/SnapshotManager.tsx', 'compactPercentileNoteFor'],
    ['src/components/scriptide/ScriptDoctorPanel.tsx', 'percentileSentenceFor'],
  ];

  for (const [file, expected] of SURFACES) {
    it(`${file} decides through ${expected}, not its own condition`, () => {
      const src = readFileSync(path.join(REPO_ROOT, file), 'utf8');
      assert.ok(src.includes(expected), `${file} must call ${expected}`);
      assert.ok(
        !/percentileIsComparable\(/.test(src),
        `${file} re-implements the comparability branch instead of calling the gated helper`,
      );
    });
  }
});

// ── Round 2 (2026-09-11): the two copy defects the review found in SHIPPED bytes
//
// Both were on the path 100% of real drafts take — 0 of the 20 CC0 shorts are
// inside the reference band — which is why "it only shows on an out-of-band draft"
// is not a mitigation here but the whole population.

describe('the reference bounds are stated once per page, not twice', () => {
  it('the exported HTML first page carries the bounds exactly once for a real draft', async () => {
    const report = await runScriptDoctor(RUNOFF);
    const html = renderCoverageHtml(report, 'Runoff', { fountain: RUNOFF });
    const firstPage = html.slice(0, html.indexOf('<hr class="tier-divider"'));
    assert.ok(firstPage.length > 0, 'sanity: the tier and its divider render');
    assert.equal(
      firstPage.split(referenceBoundsLine()).length - 1, 1,
      'the bounds string must appear exactly once above the divider',
    );
    // The specific reproduction: "20 samples" and "256" each appeared 2x.
    assert.equal(firstPage.split('20 samples').length - 1, 1);
    assert.equal(firstPage.split('256').length - 1, 1);
    assert.ok(!firstPage.includes('Reference bounds:'),
      'the labelled line is the one that goes, because the sentence already states them');
  });

  it('the letter tier carries them once too, and the whole letter twice — one per section', async () => {
    const report = await runScriptDoctor(RUNOFF);
    const { markdown, text } = renderCoverageLetter(report, { title: 'Runoff', fountain: RUNOFF });
    // The tier ends where the letter proper begins — at its verdict line. NOT at
    // the first "---": the plain-text renderer underlines its own section headings
    // with dashes, so that would cut the tier off at its second line.
    for (const [label, doc, verdictMarker] of [
      ['markdown', markdown, '**Verdict: '], ['text', text, 'VERDICT: '],
    ] as const) {
      const tierEnd = doc.indexOf(verdictMarker);
      assert.ok(tierEnd > 0, `${label}: could not find where the tier ends`);
      const tierBlock = doc.slice(0, tierEnd);
      assert.equal(tierBlock.split(referenceBoundsLine()).length - 1, 1,
        `${label}: the tier states the bounds once`);
      // THREE times in the letter's PROSE, one per section that states a
      // READING the bounds qualify, and no more:
      //
      //   1. the producer tier's percentile line
      //   2. the Craft Dimensions caption (2026-09-12, adversarial findings #4
      //      and #14) — five badges reading "not comparable" need the sentence
      //      that says against what, beside them, and it is the SAME string from
      //      src/lib/percentile-copy.ts's dimensionPercentileCaptionFor that the
      //      exported HTML and the in-app panel print, not a third wording
      //   3. the how-to-read caveat
      //
      // It was two until the letter carried no dimension section at all; the
      // committed goldens carried it three times before the 2026-09-11 round,
      // and THAT three was one section stating it twice, which is the defect
      // this test exists for. The count is asserted exactly, and each occurrence
      // is asserted to fall in a different section below, so a section that
      // states it twice still fails here.
      //
      // 2026-09-12: the verify footer adds a third occurrence, and it is NOT a
      // third statement of the fact — it is the `Reference bounds:` CLAIM ROW
      // (server/lib/artifact-claims.ts), the machine-readable value a verifier
      // reads back and recomputes. The claim block exists to restate every value
      // the document states; the render-a-fact-once rule is about the prose a
      // producer reads. So the count is asserted separately on each side of the
      // footer boundary, which still fails if a third PROSE copy appears.
      const footerStart = doc.indexOf('Script-text hash (SHA-256):');
      assert.ok(footerStart > 0, `${label}: the letter must carry its verify footer`);
      const prose = doc.slice(0, footerStart);
      const footer = doc.slice(footerStart);
      assert.equal(prose.split(referenceBoundsLine()).length - 1, 3,
        `${label}: the letter's prose states the bounds exactly three times`);
      // One per section, never twice in one. Section boundaries are the three
      // headings themselves, so this fails if any single section repeats it.
      const dimsHeading = label === 'markdown' ? '\n## Craft Dimensions' : '\nCRAFT DIMENSIONS';
      const howToHeading = label === 'markdown' ? '\n## How to Read This Report' : '\nHOW TO READ THIS REPORT';
      const dimsAt = prose.indexOf(dimsHeading);
      const howToAt = prose.indexOf(howToHeading);
      assert.ok(dimsAt > 0 && howToAt > dimsAt, `${label}: expected both sections, in order`);
      const sections = [
        prose.slice(0, dimsAt), prose.slice(dimsAt, howToAt), prose.slice(howToAt),
      ];
      for (const [i, section] of sections.entries()) {
        assert.equal(section.split(referenceBoundsLine()).length - 1, 1,
          `${label}: section ${i} states the bounds exactly once`);
      }
      assert.equal(footer.split(referenceBoundsLine()).length - 1, 1,
        `${label}: the verify block publishes the bounds exactly once, as a claim`);
      assert.match(footer, new RegExp(`^Reference bounds: ${referenceBoundsLine()}$`, 'm'),
        `${label}: the footer occurrence is the claim row, not prose`);
    }
  });
});

describe("the letter's percentile caveat parses on the path every real draft takes", () => {
  it('a not-comparable letter does NOT carry the dangling "not against other scripts" clause', async () => {
    const report = await runScriptDoctor(RUNOFF);
    const { markdown, text } = renderCoverageLetter(report, { title: 'Runoff', fountain: RUNOFF });
    for (const [label, doc] of [['markdown', markdown], ['text', text]] as const) {
      assert.ok(doc.includes(notComparableSentence()), `${label}: states the not-comparable reading`);
      assert.ok(
        !doc.includes('not against other scripts you might send it'),
        `${label}: that clause modifies "ranks ... against", which this sentence does not contain`,
      );
      assert.ok(
        doc.includes("A percentile against that set would be measuring this draft's length, not its craft."),
        `${label}: and it says what IS true of this state`,
      );
    }
  });

  it('an in-band letter DOES carry it — the clause was not deleted, it was branched', () => {
    const inBand = {
      ...JSON.parse(readFileSync(
        path.join(REPO_ROOT, 'tests/fixtures/coverage-letter/report1.json'), 'utf8',
      )),
      sceneCount: 10, wordCount: 300, healthPercentile: 42,
    };
    const { markdown } = renderCoverageLetter(inBand, { title: 'In Band' });
    assert.ok(markdown.includes(healthPercentileSentence(42)));
    assert.ok(markdown.includes('not against other scripts you might send it, and not a market comparison.'));
    assert.ok(!markdown.includes("measuring this draft's length"));
  });

  it('percentileCaveatSentenceFor is the one decision point for both', () => {
    assert.equal(
      percentileCaveatSentenceFor(42, 10, 300),
      `${healthPercentileSentence(42)} \u2014 not against other scripts you might send it, `
      + 'and not a market comparison.',
    );
    assert.equal(
      percentileCaveatSentenceFor(100, 9, 1448),
      `${notComparableSentence()}. A percentile against that set would be measuring this `
      + "draft's length, not its craft.",
    );
  });
});

describe("the producer tier's logline is one sentence, never a truncated speech", () => {
  // ROUND 2: runoff.fountain's shipped tier opened with
  //   SARA must contend with "Creek Mile 14, Tuesday morning. Turbidity source
  //   appears to originate above the new construction pad at the tree line. The
  //   upstream contrac…"
  // — three sentences, cut mid-word, as the first line of the producer's page, which
  // is product-discovery finding #7 verbatim. findIncitingIncident had been given
  // the one-sentence rule; its sibling findApparentGoal had not.
  it('runoff.fountain\u2019s tier logline carries no mid-clause truncation', async () => {
    const report = await runScriptDoctor(RUNOFF);
    const { records } = analyzeFountainText(RUNOFF);
    const logline = buildLogline(report, records, RUNOFF);
    assert.ok(logline, 'runoff still has a protagonist and still gets a logline');
    assert.ok(!logline!.includes('\u2026'), `still truncated: ${logline}`);
    assert.ok(!logline!.includes('The upstream contrac'), 'the mangled fragment must be gone');
    // And the clause it quotes is the one that voices the want, not the first
    // sentence of the block (which is a location stamp).
    // As SHIPPED: assembleLogline strips the clause's trailing period before
    // quoting it, so this asserts the bytes the producer reads, not the raw
    // sentence findApparentGoal returned.
    assert.ok(logline!.includes("I'm going to need their discharge permit"),
      `expected the want sentence, got: ${logline}`);
  });

  it('the quoted want is the matching sentence, not merely the first one', () => {
    // dead-frequency's protagonist voices the want in the THIRD sentence; quoting
    // the first would drop the only thing that made the block a goal.
    const fountain = readFileSync(path.join(REPO_ROOT, 'data/screenplays/dead-frequency.fountain'), 'utf8');
    const goal = findApparentGoal(fountain, 'MAYA');
    assert.equal(goal, 'I want to know what you can see from here.');
  });

  it('no goal clause is lost to the one-sentence rule — 7 of 32 before, 7 after', async () => {
    // The cost of the change, asserted rather than asserted-to-have-been-measured.
    const dir = path.join(REPO_ROOT, 'data/screenplays');
    let withGoal = 0;
    for (const file of readdirSync(dir).filter(f => f.endsWith('.fountain')).sort()) {
      const fountain = readFileSync(path.join(dir, file), 'utf8');
      const report = await runScriptDoctor(fountain);
      const goal = findApparentGoal(fountain, report.characters?.[0] ?? '');
      if (goal) {
        withGoal += 1;
        assert.ok(!goal.includes('\u2026'), `${file}: goal clause is truncated mid-word`);
      }
    }
    // 5 of the 20 CC0 shorts voice a want the lexicon detects (the other 2 of the
    // 7 measured across all 32 are blind-pair fixtures).
    assert.equal(withGoal, 5, 'the CC0 shorts that voice a detectable want');
  });
});
