// src/lib/percentile-copy.ts — the ONE shared implementation of the
// calibration reference-set percentile copy (ordinal suffixing, the D5
// false-precision band, and the sentences built from them).
//
// 2026-09-04 review finding: after the first pass of the cross-surface
// parity lane, ordinal()/percentileBand() existed as FOUR independent
// hand-copies (ScriptDoctorPanel.tsx, server/lib/coverage-html.ts,
// SnapshotManager.tsx, SlatePanel.tsx) with no test comparing any two of
// them, and one of the four had already silently drifted — SnapshotManager
// dropped "hand-authored synthetic" from its sentence. This file has two
// halves: (1) direct unit tests on the shared module's pure functions, and
// (2) source-text checks (the g0-06/g0-07/g0-09/shape-rhythm-panel-copy
// convention — no React render harness exists in this repo, see
// tests/core/shape-rhythm-panel-copy.test.ts's own header) proving all four
// surfaces import from this module rather than re-implementing it. Since a
// surface's JSX only ever interpolates this module's return value, "imports
// the shared function, does not define a local one" is the strongest
// available proof (short of a browser render) that they can never disagree.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import {
  ordinal, percentileBand, exactRankTooltip, healthPercentileSentence, compactPercentileNote,
  percentileColumnHeaderTooltip, slatePercentileCaption, notComparableSentence,
  REFERENCE_SET_SIZE, REFERENCE_SET_LABEL,
} from '../../src/lib/percentile-copy.ts';
import { renderCoverageHtml } from '../../server/lib/coverage-html.ts';
import { buildSlateEntry, rankSlate, renderSlateHtml } from '../../server/lib/slate.ts';
import { renderCoverageLetter } from '../../server/lib/coverage-letter.ts';
import type { ScriptDoctorReport, DoctorGrade, CoverageVerdict } from '../../server/nvm/analyze/types.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const read = (rel: string) => readFileSync(resolve(__dirname, rel), 'utf8');

describe('percentile-copy.ts — pure functions', () => {
  it('ordinal() handles the 11-13 teens exception', () => {
    assert.equal(ordinal(1), '1st');
    assert.equal(ordinal(2), '2nd');
    assert.equal(ordinal(3), '3rd');
    assert.equal(ordinal(4), '4th');
    assert.equal(ordinal(11), '11th');
    assert.equal(ordinal(12), '12th');
    assert.equal(ordinal(13), '13th');
    assert.equal(ordinal(21), '21st');
    assert.equal(ordinal(100), '100th');
  });

  it('percentileBand() buckets to the nearest 10, with a top/bottom 10% floor', () => {
    assert.equal(percentileBand(100), 'top 10%');
    assert.equal(percentileBand(95), 'top 10%');
    assert.equal(percentileBand(82), 'top 20%');
    assert.equal(percentileBand(50), 'top 50%');
    assert.equal(percentileBand(10), 'bottom 10%');
    assert.equal(percentileBand(0), 'bottom 10%');
  });

  it('exactRankTooltip() names the reference-set size', () => {
    assert.equal(exactRankTooltip(82), `Exact rank: 82nd of ${REFERENCE_SET_SIZE} reference samples`);
  });

  it('healthPercentileSentence() carries the "hand-authored synthetic" qualifier', () => {
    const sentence = healthPercentileSentence(82);
    assert.equal(sentence, `Health percentile: top 20% within a ${REFERENCE_SET_SIZE}-sample, ${REFERENCE_SET_LABEL}`);
    assert.match(sentence, /hand-authored synthetic/);
  });

  it('compactPercentileNote() ALSO carries the "hand-authored synthetic" qualifier — the exact bug this module fixes', () => {
    const note = compactPercentileNote(82);
    assert.equal(note, `top 20% of a ${REFERENCE_SET_SIZE}-sample, ${REFERENCE_SET_LABEL}`);
    assert.match(note, /hand-authored synthetic/, 'the compact form must not drop the qualifier that stops the percentile reading as a comparison against real scripts');
  });

  it('percentileColumnHeaderTooltip()/slatePercentileCaption() carry the "hand-authored synthetic" qualifier too — the Slate table\'s bare "Percentile" column had the same silent-denominator gap the compact note had', () => {
    assert.match(percentileColumnHeaderTooltip(), /hand-authored synthetic/);
    assert.match(percentileColumnHeaderTooltip(), /not the other scripts in this slate/);
    assert.match(slatePercentileCaption(), /hand-authored synthetic/);
    assert.match(slatePercentileCaption(), /not the other scripts in this slate/);
  });
});

describe('percentile-copy.ts — no surface re-implements it', () => {
  const panel = read('../../src/components/scriptide/ScriptDoctorPanel.tsx');
  const coverageHtml = read('../../server/lib/coverage-html.ts');
  const snapshotManager = read('../../src/components/scriptide/SnapshotManager.tsx');
  const slatePanel = read('../../src/components/SlatePanel.tsx');
  const slateHtml = read('../../server/lib/slate.ts');
  const whatIfPanel = read('../../src/components/WhatIfPanel.tsx');
  const coverageLetter = read('../../server/lib/coverage-letter.ts');

  // 2026-09-05 review tightening: the original regexes only caught a
  // `function ordinal(...)`/`function percentileBand(...)` DECLARATION —
  // coverage-letter.ts's own drift (found in the same review) was exactly
  // that shape, but an arrow-function re-implementation
  // (`const ordinal = (n) => {...}`) would have slipped past both the old
  // regex AND the "must import from percentile-copy.ts" check below (a file
  // can do both: import the module for something else, and STILL shadow
  // `ordinal` with a local const). Matches any declaration form —
  // `function`, `const`/`let`/`var` bound to a function or arrow expression.
  const NO_LOCAL_ORDINAL = /\bfunction\s+ordinal\s*\(|\b(?:const|let|var)\s+ordinal\s*=\s*(?:function\b|\()/;
  const NO_LOCAL_PERCENTILE_BAND = /\bfunction\s+percentileBand\s*\(|\b(?:const|let|var)\s+percentileBand\s*=\s*(?:function\b|\()/;

  for (const [name, src, importPath] of [
    ['ScriptDoctorPanel.tsx', panel, '../../lib/percentile-copy.ts'],
    ['coverage-html.ts', coverageHtml, '../../src/lib/percentile-copy.ts'],
    ['SnapshotManager.tsx', snapshotManager, '../../lib/percentile-copy.ts'],
    ['SlatePanel.tsx', slatePanel, '../lib/percentile-copy.ts'],
    ['slate.ts', slateHtml, '../../src/lib/percentile-copy.ts'],
    ['WhatIfPanel.tsx', whatIfPanel, '../lib/percentile-copy.ts'],
    ['coverage-letter.ts', coverageLetter, '../../src/lib/percentile-copy.ts'],
  ] as const) {
    it(`${name} imports from percentile-copy.ts rather than defining its own ordinal()/percentileBand()`, () => {
      assert.ok(src.includes(importPath), `${name} must import from ${importPath}`);
      assert.ok(!NO_LOCAL_ORDINAL.test(src), `${name} must not define a local ordinal() — that is exactly how the previous drift happened`);
      assert.ok(!NO_LOCAL_PERCENTILE_BAND.test(src), `${name} must not define a local percentileBand()`);
    });
  }

  it('ScriptDoctorPanel.tsx renders the sentence via the shared healthPercentileSentence(), not a hand-built string', () => {
    assert.match(panel, /\{healthPercentileSentence\(report\.healthPercentile\)\}/);
    assert.ok(!panel.includes('Health percentile: {percentileBand'), 'the old hand-built JSX interpolation must be gone');
  });

  it('SnapshotManager.tsx renders the compact note via the shared compactPercentileNote(), and the sentence still contains "hand-authored synthetic"', () => {
    assert.match(snapshotManager, /\{compactPercentileNote\(healthPercentile\)\}/);
  });

  // Owner-rule follow-up (2026-09-05): the Slate table's Percentile column
  // was the last surface whose denominator qualifier was tooltip-only (in
  // both the in-app panel and the exported HTML). Both now render the SAME
  // shared sentence, visibly, not just in a title= attribute.
  it('SlatePanel.tsx renders the Percentile column\'s denominator as VISIBLE text via slatePercentileCaption(), not only a tooltip', () => {
    assert.match(slatePanel, /\{slatePercentileCaption\(\)\}/);
    assert.match(slatePanel, /title=\{percentileColumnHeaderTooltip\(\)\}/);
  });

  it('slate.ts (the exported HTML) renders the SAME shared column-header tooltip and visible footer caption', () => {
    assert.match(slateHtml, /\$\{percentileColumnHeaderTooltip\(\)\}/);
    assert.match(slateHtml, /\$\{slatePercentileCaption\(\)\}/);
  });

  it('WhatIfPanel.tsx\'s DoctorReadout renders the percentile beside health via the shared compactPercentileNote(), so the What-If Lab is not the one place this number is silent', () => {
    assert.match(whatIfPanel, /\{compactPercentileNote\(draft\.healthPercentile\)\}/);
    assert.match(whatIfPanel, /typeof draft\.healthPercentile === ['"]number['"]/);
  });

  // 2026-09-05 review — coverage-letter.ts was the LAST percentile surface
  // off the shared module: a local `function ordinal(...)` (used for the
  // draftRank line) and a hardcoded "Nth percentile"/"hand-authored
  // reference set" for the healthPercentile line — the exact "th" suffix on
  // every number (wrong for e.g. 82, which reads "82nd") and the exact
  // "synthetic" drop the review flagged. Now uses the shared ordinal() plus
  // REFERENCE_SET_SIZE/REFERENCE_SET_LABEL for both lines.
  // 2026-09-11 (producer-tier discovery #12) — the letter moved one step further
  // off its own copy. It used to compose the sentence itself from the shared
  // ordinal()/REFERENCE_SET_SIZE/REFERENCE_SET_LABEL pieces, which fixed the "th"
  // suffix bug but still left the letter stating an ORDINAL where the producer
  // tier at the top of the SAME letter stated a BAND. It now calls
  // healthPercentileSentence / notComparableSentence — the whole sentence, not the
  // pieces — so the letter carries one wording, exactly twice (pinned by
  // tests/core/coverage-letter.test.ts).
  it('coverage-letter.ts renders the WHOLE shared percentile sentence, not a composition of its pieces', () => {
    assert.match(coverageLetter, /healthPercentileSentence\(report\.healthPercentile\)/);
    assert.match(coverageLetter, /notComparableSentence\(\)/);
    assert.match(coverageLetter, /percentileIsComparable\(report\.sceneCount, report\.wordCount\)/);
    assert.ok(!/\$\{ordinal\(Math\.round\(report\.healthPercentile\)\)\}\s*percentile/.test(coverageLetter),
      'the hand-composed ordinal percentile sentence must be gone');
    assert.ok(!/\$\{Math\.round\(report\.healthPercentile\)\}th percentile/.test(coverageLetter),
      'the old hardcoded "th" suffix must be gone');
  });
});

describe('percentile-copy.ts — end-to-end: the exported coverage HTML actually contains the shared sentence', () => {
  // Pure Node-side proof (no DOM needed) that coverage-html.ts's rendered
  // OUTPUT — not just its source text — contains exactly what
  // healthPercentileSentence() produces for the same input, closing the
  // loop the source-text checks above cannot reach on their own.
  function minimalReport(healthPercentile: number): ScriptDoctorReport {
    return {
      health: 78.3,
      grade: 'strong' as DoctorGrade,
      totalIssues: 0,
      bySeverity: { critical: 0, major: 0, minor: 0 },
      passes: [],
      sceneHeatmap: [],
      topPriorities: [],
      structure: {
        actPosition: 'act2b', completionPercent: 50, avgSuspensePerScene: 3,
        escalating: true, reversalCount: 0, reversalDensity: 0, approachingClimax: false,
        openClues: 0, revelationCount: 0, midpointPressure: 0, tightestScene: 0,
      },
      characters: [],
      sceneCount: 3,
      wordCount: 100,
      analyzedAt: Date.UTC(2026, 8, 4),
      verdict: 'RECOMMEND' as CoverageVerdict,
      dimensions: [],
      strengths: [],
      plainSummary: 'A clean report.',
      healthPercentile,
    };
  }

  // 2026-09-11: the report has to be INSIDE the reference set's bounds for a band
  // to be a meaningful reading at all — 10 scenes / 300 words is sample-shaped.
  // The out-of-band case is the next test, and it is the one that matters for real
  // drafts.
  it('the rendered HTML contains healthPercentileSentence(pct) verbatim for an in-band draft, for several inputs', () => {
    for (const pct of [0, 10, 42, 82, 100]) {
      const report = { ...minimalReport(pct), sceneCount: 10, wordCount: 300 };
      const html = renderCoverageHtml(report, 'Consistency Check');
      assert.ok(
        html.includes(healthPercentileSentence(pct)),
        `expected the exported HTML to contain "${healthPercentileSentence(pct)}" for healthPercentile=${pct}`,
      );
    }
  });

  it('the rendered HTML states NOT COMPARABLE, not a band, for a draft outside the bounds', () => {
    // minimalReport is 3 scenes / 100 words — under the reference band, the same
    // way every real draft is over it. A band here would be the defect: the
    // percentile would be measuring length.
    const html = renderCoverageHtml(minimalReport(100), 'Consistency Check');
    assert.ok(html.includes(notComparableSentence()), 'must state the not-comparable sentence');
    assert.ok(!html.includes(healthPercentileSentence(100)), 'must not state a band it cannot support');
    assert.ok(!html.includes('Exact rank:'), 'and no exact-rank tooltip either');
  });
});

describe('percentile-copy.ts — end-to-end: the exported slate HTML actually contains the shared column tooltip and caption', () => {
  function slateReport(healthPercentile: number): ScriptDoctorReport {
    return {
      health: 65,
      grade: 'solid' as DoctorGrade,
      totalIssues: 0,
      bySeverity: { critical: 0, major: 0, minor: 0 },
      passes: [],
      sceneHeatmap: [],
      topPriorities: [],
      structure: {} as ScriptDoctorReport['structure'],
      characters: [],
      sceneCount: 8,
      wordCount: 4000,
      dimensions: [],
      analysisComplete: true,
      healthPercentile,
    } as unknown as ScriptDoctorReport;
  }

  it('renders the shared percentileColumnHeaderTooltip() and slatePercentileCaption() verbatim', () => {
    const entry = buildSlateEntry('Consistency Check', slateReport(82), 'hash-consistency');
    const html = renderSlateHtml(rankSlate([entry]), 0);
    assert.ok(
      html.includes(percentileColumnHeaderTooltip()),
      `expected the exported slate HTML's column header tooltip to be "${percentileColumnHeaderTooltip()}"`,
    );
    assert.ok(
      html.includes(slatePercentileCaption()),
      `expected the exported slate HTML's footer to contain "${slatePercentileCaption()}"`,
    );
  });
});

// 2026-09-05 migration — the SAME class of bug this whole file exists to
// catch, but for the draft-rank denominator instead of the percentile: the
// cross-surface-parity lane added coverage-html.ts's buildDraftRankLine
// BEFORE src/lib/draft-rank-copy.ts existed, so it was never migrated once
// the panel and the letter moved onto the shared helpers — see that
// module's own header for the drift story and tests/core/
// draft-rank-copy-consistency.test.ts for the full ranked/tied/unscored/
// first-draft end-to-end proof. This block is the draft-rank counterpart to
// the percentile surface scan above: same convention, same three surfaces.
describe('draft-rank-copy.ts — no surface re-implements it', () => {
  const panel = read('../../src/components/scriptide/ScriptDoctorPanel.tsx');
  const coverageHtml = read('../../server/lib/coverage-html.ts');
  const coverageLetter = read('../../server/lib/coverage-letter.ts');
  const snapshotManager = read('../../src/components/scriptide/SnapshotManager.tsx');

  const NO_LOCAL_DENOMINATOR = /\bfunction\s+draftRankDenominatorLabel\s*\(|\b(?:const|let|var)\s+draftRankDenominatorLabel\s*=/;
  const NO_LOCAL_NEXT_OPPORTUNITY = /\bfunction\s+draftRankNextOpportunityLabel\s*\(|\b(?:const|let|var)\s+draftRankNextOpportunityLabel\s*=/;
  const NO_LOCAL_UNRANKED_NOTE = /\bfunction\s+unrankedDraftsNote\s*\(|\b(?:const|let|var)\s+unrankedDraftsNote\s*=/;
  const NO_LOCAL_SENTENCE = /\bfunction\s+draftRankSentence\s*\(|\b(?:const|let|var)\s+draftRankSentence\s*=/;

  // 2026-09-05 follow-up (client-hunter B-12): the granular
  // denominator/next-opportunity/unranked-note fix left SnapshotManager.tsx
  // as a FOURTH hand-copy — it called draftRankDenominatorLabel('saved') for
  // the noun but still hand-composed everything around it, with no "tied"
  // prefix and no unrankedDraftsNote() call, so a genuine dead heat and a
  // mixed ranked+unscored Versions list both silently lost information the
  // other three surfaces already carried. draftRankSentence(draftRank,
  // scope) is now the ONE implementation of the whole sentence (every
  // branch: ranked, tied, unranked-note, first-draft) for every surface that
  // renders a compact label — the panel, the HTML export, and this badge.
  for (const [name, src] of [
    ['ScriptDoctorPanel.tsx', panel],
    ['coverage-html.ts', coverageHtml],
    ['SnapshotManager.tsx', snapshotManager],
  ] as const) {
    it(`${name} calls the single draftRankSentence() from draft-rank-copy.ts rather than re-composing ordinal/denominator/tied/unranked-note itself`, () => {
      assert.match(src, /draftRankSentence\(/, `${name} must call draftRankSentence()`);
      assert.ok(!NO_LOCAL_SENTENCE.test(src), `${name} must not define a local draftRankSentence()`);
      assert.ok(!NO_LOCAL_DENOMINATOR.test(src), `${name} must not define a local draftRankDenominatorLabel()`);
      assert.ok(!NO_LOCAL_NEXT_OPPORTUNITY.test(src), `${name} must not define a local draftRankNextOpportunityLabel()`);
      assert.ok(!NO_LOCAL_UNRANKED_NOTE.test(src), `${name} must not define a local unrankedDraftsNote()`);
    });
  }

  it('coverage-html.ts no longer hand-writes the pre-migration "your own saved drafts of this script" / "your next save" literals', () => {
    assert.ok(!coverageHtml.includes('your own saved drafts of this script'));
    assert.ok(!/appears? after your next save\b/.test(coverageHtml));
  });

  it('SnapshotManager.tsx no longer hand-writes the pre-migration "among your saved drafts" literal (missing "of this script", no tied prefix, no unranked note)', () => {
    assert.ok(!/among your saved drafts`/.test(snapshotManager), 'the old bare "among your saved drafts" template-literal ending must be gone');
    assert.ok(!/`Ranks \$\{ordinal\(draftRank\.rank\)\}/.test(snapshotManager), 'the old hand-composed "Ranks ${ordinal}..." template literal (no tied prefix, no note) must be gone');
  });

  // coverage-letter.ts is the one surface that deliberately does NOT call
  // draftRankSentence(): its rendering is a longer caveat PARAGRAPH ("Among
  // your own X, this one ranks/ties for N of M by health — a comparison to
  // your own history...") structurally unlike the three compact labels
  // above, so it composes its own sentence from the SAME granular helpers
  // draftRankSentence itself is built from — never a fourth, independent
  // hand-copy of the denominator/next-opportunity/unranked-note words
  // themselves, only of the surrounding prose shape.
  it("coverage-letter.ts imports the granular draftRankDenominatorLabel/draftRankNextOpportunityLabel/unrankedDraftsNote helpers directly (its longer caveat paragraph is not a compact label, so it does not call draftRankSentence())", () => {
    assert.ok(coverageLetter.includes('../../src/lib/draft-rank-copy.ts'), 'coverage-letter.ts must import from ../../src/lib/draft-rank-copy.ts');
    assert.ok(coverageLetter.includes('draftRankDenominatorLabel'), 'coverage-letter.ts must call draftRankDenominatorLabel()');
    assert.ok(coverageLetter.includes('draftRankNextOpportunityLabel'), 'coverage-letter.ts must call draftRankNextOpportunityLabel()');
    assert.ok(coverageLetter.includes('unrankedDraftsNote'), 'coverage-letter.ts must call unrankedDraftsNote()');
    assert.ok(!NO_LOCAL_DENOMINATOR.test(coverageLetter), 'coverage-letter.ts must not define a local draftRankDenominatorLabel()');
    assert.ok(!NO_LOCAL_NEXT_OPPORTUNITY.test(coverageLetter), 'coverage-letter.ts must not define a local draftRankNextOpportunityLabel()');
    assert.ok(!NO_LOCAL_UNRANKED_NOTE.test(coverageLetter), 'coverage-letter.ts must not define a local unrankedDraftsNote()');
  });
});

describe('percentile-copy.ts — end-to-end: the exported coverage LETTER uses the shared ordinal() and "hand-authored synthetic" wording', () => {
  function letterReport(healthPercentile: number): ScriptDoctorReport {
    return {
      health: 78.3,
      grade: 'strong' as DoctorGrade,
      totalIssues: 0,
      bySeverity: { critical: 0, major: 0, minor: 0 },
      passes: [],
      sceneHeatmap: [],
      topPriorities: [],
      structure: {
        actPosition: 'act2b', completionPercent: 50, avgSuspensePerScene: 3,
        escalating: true, reversalCount: 0, reversalDensity: 0, approachingClimax: false,
        openClues: 0, revelationCount: 0, midpointPressure: 0, tightestScene: 0,
      },
      characters: [],
      sceneCount: 3,
      wordCount: 100,
      analyzedAt: Date.UTC(2026, 8, 4),
      verdict: 'RECOMMEND' as CoverageVerdict,
      dimensions: [],
      strengths: [],
      plainSummary: 'A clean report.',
      healthPercentile,
    };
  }

  // 2026-09-11 (producer-tier discovery #12): the letter no longer states an
  // ORDINAL at all. It states the same BAND sentence the producer tier at the top
  // of the letter states — or, for a draft outside the reference set's bounds, the
  // not-comparable sentence. The ordinal was both a false precision on 20 samples
  // and a second wording for one number in one document.
  //
  // letterReport is 3 scenes / 100 words, i.e. OUT of the reference band, which is
  // the case every real draft is in; the in-band case is asserted below it.
  it('carries the shared not-comparable sentence for an out-of-band draft, at every percentile', () => {
    for (const pct of [1, 2, 3, 11, 12, 13, 82, 90, 100]) {
      const { markdown } = renderCoverageLetter(letterReport(pct), { title: 'Consistency Check' });
      assert.ok(
        markdown.includes(notComparableSentence()),
        `expected the coverage letter to state the not-comparable sentence for healthPercentile=${pct}`,
      );
      assert.ok(
        !/ranks in the \d+(?:st|nd|rd|th) percentile/.test(markdown),
        'no ordinal percentile anywhere in the letter',
      );
    }
  });

  it('carries the shared BAND sentence, and the correct band, for an in-band draft', () => {
    for (const pct of [1, 42, 82, 90, 100]) {
      const report = { ...letterReport(pct), sceneCount: 10, wordCount: 300 };
      const { markdown } = renderCoverageLetter(report, { title: 'Consistency Check' });
      assert.ok(
        markdown.includes(healthPercentileSentence(pct)),
        `expected "${healthPercentileSentence(pct)}" for healthPercentile=${pct} — got: ${markdown}`,
      );
      // The shared label survives the move: this is the qualifier that stops the
      // percentile reading as a comparison against real scripts.
      assert.ok(markdown.includes(REFERENCE_SET_LABEL));
      assert.ok(markdown.includes(`${REFERENCE_SET_SIZE}-sample`));
    }
  });
});
