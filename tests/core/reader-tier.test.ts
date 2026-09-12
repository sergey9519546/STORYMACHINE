// server/lib/reader-tier.ts — the producer's one page.
//
// What has to be true, and is asserted here:
//   * ONE PAGE. A line budget derived from the measured Chromium print geometry
//     (scripts/measure-reader-tier-page.mjs), so an edit that doubles the tier
//     fails in CI without a browser.
//   * NO FACT TWICE on the first page. The report header must not repeat the
//     logline, the length line or the verdict that the tier states.
//   * EVERY FINDING CARRIES A PAGE NUMBER, resolved through the real paginator,
//     and an unresolved one is omitted rather than guessed.
//   * THE HONEST NULLS. No logline, no priorities, no percentile, no script
//     text — each is stated, not silently dropped.
//   * ONE DATA OBJECT, TWO RENDERERS. The HTML report and the letter cannot
//     disagree about a number.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildReaderTier, renderReaderTierHtml, renderReaderTierMarkdown, renderReaderTierText,
  tierFindingHeadline, TIER_PRIORITY_COUNT, NO_PAGE_REFS_NOTE,
} from '../../server/lib/reader-tier.ts';
import { renderCoverageHtml } from '../../server/lib/coverage-html.ts';
import { scenePageNumbers } from '../../server/lib/page-refs.ts';
import { prioritiesHeadingFor } from '../../src/lib/priorities-copy.ts';
import {
  healthPercentileSentence, notComparableSentence, referenceBoundsLine,
} from '../../src/lib/percentile-copy.ts';
import { runScriptDoctor } from '../../server/nvm/analyze/doctor.ts';
import { analyzeFountainText } from '../../server/nvm/analyze/fountain-analyzer.ts';
import { buildLogline } from '../../server/lib/logline.ts';
import type { ScriptDoctorReport } from '../../server/nvm/analyze/types.ts';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const LETTER_FIXTURE = path.join(REPO_ROOT, 'tests/fixtures/coverage-letter/report1.json');

function loadReport(): ScriptDoctorReport {
  return JSON.parse(readFileSync(LETTER_FIXTURE, 'utf8')) as ScriptDoctorReport;
}

const identity = (v: string) => v;

describe('buildReaderTier — the facts it states', () => {
  const report = loadReport();

  it('states length, verdict and health from the report, unmodified', () => {
    const tier = buildReaderTier(report);
    assert.ok(tier.lengthLine.includes(`${report.sceneCount} scene`));
    assert.ok(tier.lengthLine.includes(`${report.wordCount} word`));
    assert.equal(tier.verdict, report.verdict);
    assert.equal(tier.healthLine, `Health ${report.health.toFixed(1)} / 100`);
  });

  // ROUND 2 (2026-09-11) — the bounds are stated ONCE per page, and never zero
  // times. The not-comparable sentence already ends in
  // "(20 samples / 9-10 scenes / 256-337 words)", so the separate "Reference
  // bounds:" line under it put the identical string on the producer's first page
  // twice, a centimetre apart — round-1 item 2 ("no fact rendered twice on the
  // producer's first page") broken by the code that implements the confidence
  // line. MEASURED: 0 of the 20 CC0 shorts are inside the band, so the doubled
  // path was the one every real draft took.
  it('states the bounds ONCE: via the percentile sentence when that already carries them', () => {
    const outOfBand = { ...report, sceneCount: 231, wordCount: 19293, healthPercentile: 100 };
    const tier = buildReaderTier(outOfBand);
    assert.equal(tier.percentileLine, notComparableSentence());
    assert.ok(tier.percentileLine!.includes(referenceBoundsLine()), 'the sentence carries the bounds');
    assert.equal(tier.boundsLine, null, 'so the separate line must not render');
    for (const doc of [
      renderReaderTierMarkdown(tier), renderReaderTierText(tier), renderReaderTierHtml(tier, identity),
    ]) {
      assert.equal(doc.split(referenceBoundsLine()).length - 1, 1,
        'the bounds string must appear exactly once in the tier');
      assert.ok(!doc.includes('Reference bounds:'), 'and the labelled line must be gone');
    }
  });

  it('states the bounds ONCE: via its own line when the percentile sentence does not carry them', () => {
    const inBand = { ...report, sceneCount: 10, wordCount: 300, healthPercentile: 42 };
    const tier = buildReaderTier(inBand);
    assert.equal(tier.percentileLine, healthPercentileSentence(42));
    assert.ok(!tier.percentileLine!.includes(referenceBoundsLine()));
    assert.equal(tier.boundsLine, referenceBoundsLine());
    for (const doc of [
      renderReaderTierMarkdown(tier), renderReaderTierText(tier), renderReaderTierHtml(tier, identity),
    ]) {
      assert.equal(doc.split(referenceBoundsLine()).length - 1, 1,
        'the bounds string must appear exactly once in the tier');
      assert.ok(doc.includes('Reference bounds:'), 'stated by the labelled line here');
    }
  });

  it('states the bounds even with no percentile at all — never zero times', () => {
    const tier = buildReaderTier({ ...report, healthPercentile: undefined });
    assert.equal(tier.percentileLine, null);
    assert.equal(tier.boundsLine, referenceBoundsLine());
    assert.equal(
      renderReaderTierText(tier).split(referenceBoundsLine()).length - 1, 1,
      'a report with no percentile still states what the reference set is',
    );
  });

  it('the bounds line, when it renders, is the derived one', () => {
    const tier = buildReaderTier({ ...report, healthPercentile: undefined });
    assert.match(tier.boundsLine!, /^\d+ samples \/ .+ scenes \/ .+ words$/);
  });

  it('leads with at most TIER_PRIORITY_COUNT findings, in the report’s own order', () => {
    const tier = buildReaderTier(report);
    assert.ok(tier.priorities.length <= TIER_PRIORITY_COUNT);
    assert.equal(tier.prioritiesHeading, prioritiesHeadingFor(tier.priorities.length));
    tier.priorities.forEach((finding, i) => {
      assert.equal(finding.location, report.topPriorities![i].location);
    });
  });

  it('states a BAND when the draft is inside the reference bounds', () => {
    const inBand = { ...report, sceneCount: 10, wordCount: 300, healthPercentile: 42 };
    assert.equal(buildReaderTier(inBand).percentileLine, healthPercentileSentence(42));
  });

  it('states NOT COMPARABLE when it is outside them — never a reassuring band', () => {
    // data/screenplays/runoff.fountain's real shape: 9 scenes (inside the band),
    // 1,448 words (four times over it). Symmetric gate, so this is not comparable.
    const outOfBand = { ...report, sceneCount: 9, wordCount: 1448, healthPercentile: 100 };
    assert.equal(buildReaderTier(outOfBand).percentileLine, notComparableSentence());
  });

  it('omits the percentile line entirely when the report carries no percentile', () => {
    assert.equal(buildReaderTier({ ...report, healthPercentile: undefined }).percentileLine, null);
  });
});

describe('buildReaderTier — the honest nulls', () => {
  const report = loadReport();

  it('no logline: the tier says so, in both renderers, rather than dropping the line', () => {
    const tier = buildReaderTier(report, { logline: null });
    assert.equal(tier.logline, null);
    // ONE wording for the gate's sentence, shared by all three renderers
    // (2026-09-12): it used to be three hand-copies that differed in case
    // ("Not derived" / "not derived" / "No logline was derived"), and the claim
    // set now publishes this state, so the sentence a reader sees and the state a
    // verifier checks have to come from the same constant.
    assert.match(renderReaderTierMarkdown(tier), /Not derived/);
    assert.match(renderReaderTierText(tier), /Not derived/);
    assert.match(renderReaderTierHtml(tier, identity), /No logline was derived/);
    assert.equal(tier.claims.loglineState, 'not derived');
  });

  // THE THIRD STATE (2026-09-12). The gate's sentence — "no single speaker holds
  // enough of this script's dialogue for one" — is a claim ABOUT THE SCRIPT, and
  // before this it was printed for a caller that simply passed no logline and no
  // script text, which is no evidence for it. With the text but no logline the
  // engine's own logline is derived; with neither, the tier says it cannot say.
  it('neither a logline nor the script text: the tier states that it cannot say, and claims nothing', () => {
    const tier = buildReaderTier(report);
    assert.equal(tier.logline, undefined);
    assert.equal(tier.claims.loglineState, undefined, 'no basis, so no claim');
    for (const doc of [renderReaderTierMarkdown(tier), renderReaderTierText(tier), renderReaderTierHtml(tier, identity)]) {
      assert.match(doc, /Unavailable for this report \(it was rendered without the script text\)/);
      assert.doesNotMatch(doc, /no single speaker/, 'the gate never ran — its sentence must not be printed');
    }
  });

  it('no script text: page references are omitted and their absence is stated', () => {
    const tier = buildReaderTier(report);
    assert.equal(tier.pageRefsUnavailable, true);
    assert.ok(tier.priorities.every(p => p.pageRef === ''));
    assert.ok(renderReaderTierMarkdown(tier).includes(NO_PAGE_REFS_NOTE));
    assert.ok(renderReaderTierText(tier).includes(NO_PAGE_REFS_NOTE));
  });

  it('no priorities: the heading and the body both say nothing surfaced', () => {
    const tier = buildReaderTier({ ...report, topPriorities: [] });
    assert.equal(tier.priorities.length, 0);
    assert.equal(tier.prioritiesHeading, prioritiesHeadingFor(0));
    assert.match(renderReaderTierMarkdown(tier), /Nothing urgent surfaced/);
    assert.match(renderReaderTierHtml(tier, identity), /Nothing urgent surfaced/);
  });
});

describe('buildReaderTier — page references, resolved through the real paginator', () => {
  const fountain = readFileSync(path.join(REPO_ROOT, 'data/screenplays/runoff.fountain'), 'utf8');

  it('every resolvable finding carries a page number that the paginator agrees with', async () => {
    const report = await runScriptDoctor(fountain);
    const tier = buildReaderTier(report, { fountain });
    const scenePages = new Set(scenePageNumbers(fountain).filter((p): p is number => p !== null));

    assert.equal(tier.pageRefsUnavailable, false);
    const withRefs = tier.priorities.filter(p => p.pageRef !== '');
    assert.ok(withRefs.length > 0, 'at least one finding on a real short must resolve to a page');
    for (const finding of withRefs) {
      const page = Number(finding.pageRef.replace('p. ', ''));
      assert.ok(scenePages.has(page), `${finding.pageRef} is not a page any scene starts on`);
    }
  });

  it('a document-anchored finding gets NO page reference rather than page 1 by default', async () => {
    const report = await runScriptDoctor(fountain);
    const tier = buildReaderTier(report, { fountain });
    // "Overall structure"-style locations resolve to the document tier in
    // locate.ts and have no honest span, so they must carry no reference.
    for (const finding of tier.priorities) {
      if (/^overall\b/i.test(finding.location)) {
        assert.equal(finding.pageRef, '', `"${finding.location}" invented a page reference`);
      }
    }
  });
});

describe('renderReaderTier* — one data object, two renderers', () => {
  const report = loadReport();

  it('the markdown, text and HTML renderings state the same numbers', () => {
    const tier = buildReaderTier(report, { logline: 'A clerk finds a ledger.' });
    const md = renderReaderTierMarkdown(tier);
    const txt = renderReaderTierText(tier);
    const html = renderReaderTierHtml(tier, identity);
    for (const doc of [md, txt, html]) {
      assert.ok(doc.includes(tier.lengthLine), 'length line');
      assert.ok(doc.includes(tier.healthLine), 'health line');
      assert.ok(doc.includes(referenceBoundsLine()), 'the bounds, from one place or the other');
      assert.ok(doc.includes('A clerk finds a ledger.'), 'logline');
      for (const finding of tier.priorities) assert.ok(doc.includes(finding.description));
    }
  });

  it('a finding headline has one assembly: severity, location, page reference', () => {
    const finding = {
      severity: 'major' as const, location: 'Scene 9 (INT. BAR)', description: 'x', pageRef: 'p. 6',
      rule: 'WEAK_MIDPOINT',
    };
    assert.equal(tierFindingHeadline(finding), 'MAJOR — Scene 9 (INT. BAR) — p. 6');
    assert.equal(
      tierFindingHeadline({ ...finding, pageRef: '' }), 'MAJOR — Scene 9 (INT. BAR)',
      'no dangling separator when there is no page to point at',
    );
  });
});

describe('the exported coverage report — no fact twice on the producer’s first page', () => {
  // The header identifies the document; the tier states the findings. Before
  // 2026-09-11 the header ALSO carried the logline, the scene/word/page length
  // line and the verdict stamp — every one of which the tier states.
  it('the header carries no logline, no length line and no verdict', async () => {
    const fountain = readFileSync(path.join(REPO_ROOT, 'data/screenplays/runoff.fountain'), 'utf8');
    const report = await runScriptDoctor(fountain);
    const { records } = analyzeFountainText(fountain);
    const logline = buildLogline(report, records, fountain);
    const html = renderCoverageHtml(report, 'Runoff', { logline, fountain });

    const header = html.slice(html.indexOf('<header'), html.indexOf('</header>'));
    assert.ok(header.includes('SCRIPT COVERAGE'), 'the masthead still identifies the document');
    assert.ok(header.includes('Runoff'), 'the title still identifies the document');
    assert.ok(!header.includes('scene'), 'the length line moved to the tier');
    assert.ok(!header.includes('word'), 'the length line moved to the tier');
    assert.ok(!header.includes('class="stamp"'), 'the verdict stamp moved to the tier');
    assert.ok(!header.includes('logline-line'), 'the logline moved to the tier');

    // And each of them appears EXACTLY once in the first page's worth of markup
    // (header + tier, everything above the divider).
    const firstPage = html.slice(0, html.indexOf('<hr class="tier-divider"'));
    assert.equal(firstPage.split('class="stamp"').length - 1, 1, 'one verdict stamp');
    assert.equal(firstPage.split('class="logline-line"').length - 1, 1, 'one logline');
    assert.equal(firstPage.split(`${report.sceneCount} scene`).length - 1, 1, 'one length statement');
  });

  it('the tier renders above the divider, and the full report below it', async () => {
    const fountain = readFileSync(path.join(REPO_ROOT, 'data/screenplays/runoff.fountain'), 'utf8');
    const report = await runScriptDoctor(fountain);
    const html = renderCoverageHtml(report, 'Runoff', { fountain });
    const tierIdx = html.indexOf('class="reader-tier"');
    const dividerIdx = html.indexOf('class="tier-divider"');
    const healthIdx = html.indexOf('class="section health-section"');
    const appendixIdx = html.indexOf('Full Pass Appendix');
    assert.ok(tierIdx > 0 && dividerIdx > tierIdx, 'tier then divider');
    assert.ok(healthIdx > dividerIdx, 'the full report starts after the divider');
    assert.ok(appendixIdx > healthIdx, 'and still carries the whole appendix');
  });

  it('breaks the page after the tier so the summary is its own printed sheet', async () => {
    const fountain = readFileSync(path.join(REPO_ROOT, 'data/screenplays/runoff.fountain'), 'utf8');
    const report = await runScriptDoctor(fountain);
    const html = renderCoverageHtml(report, 'Runoff', { fountain });
    assert.match(html, /\.reader-tier \{ break-after: page; page-break-after: always;/);
  });
});

describe('the producer tier fits ONE printed page', () => {
  // MEASURED, then pinned.
  //
  // scripts/measure-reader-tier-page.mjs renders a real export in Chromium with
  // `media: print` and measures the tier's bounding box against the printable
  // band of a US Letter page at this report's own 0.65in margins
  // ((11 - 1.3) x 96 = 931.2px). Run 2026-09-11, keyless:
  //
  //   runoff.fountain            tier 490.5px, bottom 631.8px  (67.8% of the page)
  //   dead-frequency.fountain    tier 470.4px, bottom 611.7px  (65.7%)
  //   assembled-feature.fountain tier 470.4px, bottom 611.7px  (65.7%)
  //
  // Worst case runoff: 299.4px of headroom at 1,524 characters of tier text, so
  // the density is 1524/490.5 = 3.11 characters per pixel and the headroom is
  // worth another 930 characters — an implied budget of 2,454.
  //
  // That measurement cannot run in the default CI job (no browser), so the budget
  // below is what CI checks instead: the tier's own reader-facing TEXT length, the
  // only thing that varies (the markup is fixed-size). It is the MEASURED implied
  // budget, not a round number above it — a budget looser than the measurement
  // would let the tier grow onto a second sheet while this test still passed.
  // If the tier is deliberately grown, re-run the measurement script and move this
  // to whatever it reports.
  const TIER_CHARACTER_BUDGET = 2454;

  it('the longest real tier this repository can produce stays inside the measured budget', async () => {
    const fountain = readFileSync(
      path.join(REPO_ROOT, 'tests/fixtures/feature-length/assembled-feature.fountain'), 'utf8',
    );
    const report = await runScriptDoctor(fountain);
    const { records } = analyzeFountainText(fountain);
    const tier = buildReaderTier(report, {
      logline: buildLogline(report, records, fountain), fountain,
    });
    // Count the reader-facing TEXT, not the markup: the markup is fixed-size and
    // the descriptions are what vary.
    const textLength = renderReaderTierText(tier).length;
    assert.ok(
      textLength <= TIER_CHARACTER_BUDGET,
      `the tier renders ${textLength} characters of text, over the ${TIER_CHARACTER_BUDGET} budget `
      + 'measured to fit one printed page — if this is a deliberate growth, re-run '
      + 'scripts/measure-reader-tier-page.mjs and move the budget to what it measures',
    );
  });

  it('leads with three findings, not the whole list — the cap is what makes one page possible', () => {
    assert.equal(TIER_PRIORITY_COUNT, 3);
    const report = loadReport();
    const many = {
      ...report,
      topPriorities: Array.from({ length: 10 }, (_, i) => ({
        ...report.topPriorities![0], location: `Scene ${i + 1}`,
      })),
    };
    assert.equal(buildReaderTier(many).priorities.length, 3);
  });
});
