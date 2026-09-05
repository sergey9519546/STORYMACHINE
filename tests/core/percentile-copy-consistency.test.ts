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
  percentileColumnHeaderTooltip, slatePercentileCaption,
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
  it('coverage-letter.ts renders its percentile line via the shared ordinal()/REFERENCE_SET_SIZE/REFERENCE_SET_LABEL, not a hand-built "Nth percentile" string', () => {
    assert.match(coverageLetter, /\$\{ordinal\(Math\.round\(report\.healthPercentile\)\)\}\s*percentile/);
    assert.match(coverageLetter, /\$\{REFERENCE_SET_SIZE\}-sample, \$\{REFERENCE_SET_LABEL\}/);
    assert.ok(!/\$\{Math\.round\(report\.healthPercentile\)\}th percentile/.test(coverageLetter), 'the old hardcoded "th" suffix must be gone');
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

  it('the rendered HTML contains healthPercentileSentence(pct) verbatim, for several inputs', () => {
    for (const pct of [0, 10, 42, 82, 100]) {
      const html = renderCoverageHtml(minimalReport(pct), 'Consistency Check');
      assert.ok(
        html.includes(healthPercentileSentence(pct)),
        `expected the exported HTML to contain "${healthPercentileSentence(pct)}" for healthPercentile=${pct}`,
      );
    }
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

  const NO_LOCAL_DENOMINATOR = /\bfunction\s+draftRankDenominatorLabel\s*\(|\b(?:const|let|var)\s+draftRankDenominatorLabel\s*=/;
  const NO_LOCAL_NEXT_OPPORTUNITY = /\bfunction\s+draftRankNextOpportunityLabel\s*\(|\b(?:const|let|var)\s+draftRankNextOpportunityLabel\s*=/;
  const NO_LOCAL_UNRANKED_NOTE = /\bfunction\s+unrankedDraftsNote\s*\(|\b(?:const|let|var)\s+unrankedDraftsNote\s*=/;

  for (const [name, src, importPath] of [
    ['ScriptDoctorPanel.tsx', panel, '../../lib/draft-rank-copy.ts'],
    ['coverage-html.ts', coverageHtml, '../../src/lib/draft-rank-copy.ts'],
    ['coverage-letter.ts', coverageLetter, '../../src/lib/draft-rank-copy.ts'],
  ] as const) {
    it(`${name} imports the draft-rank denominator/next-opportunity/unranked-note copy from draft-rank-copy.ts rather than hand-writing it`, () => {
      assert.ok(src.includes(importPath), `${name} must import from ${importPath}`);
      assert.ok(src.includes('draftRankDenominatorLabel'), `${name} must call draftRankDenominatorLabel()`);
      assert.ok(src.includes('draftRankNextOpportunityLabel'), `${name} must call draftRankNextOpportunityLabel()`);
      assert.ok(!NO_LOCAL_DENOMINATOR.test(src), `${name} must not define a local draftRankDenominatorLabel()`);
      assert.ok(!NO_LOCAL_NEXT_OPPORTUNITY.test(src), `${name} must not define a local draftRankNextOpportunityLabel()`);
      assert.ok(!NO_LOCAL_UNRANKED_NOTE.test(src), `${name} must not define a local unrankedDraftsNote()`);
    });
  }

  it('coverage-html.ts no longer hand-writes the pre-migration "your own saved drafts of this script" / "your next save" literals', () => {
    assert.ok(!coverageHtml.includes('your own saved drafts of this script'));
    assert.ok(!/appears? after your next save\b/.test(coverageHtml));
  });

  // 2026-09-05 (owner rule: one wording per concept) — the last draft-rank
  // sentence off the shared helpers: SnapshotManager.tsx's per-snapshot
  // badge ranks against a NARROWER set (saved Versions only — see
  // draft-rank-copy.ts's DraftRankDenominatorScope header) than the three
  // surfaces above, so it calls draftRankDenominatorLabel('saved') rather
  // than the union default — never draftRankNextOpportunityLabel(), since
  // this badge has no "first draft" branch of its own (a snapshot with
  // nothing else scored renders "Only saved draft with a health score so
  // far" instead, a distinct sentence this module does not own).
  const snapshotManager = read('../../src/components/scriptide/SnapshotManager.tsx');
  it('SnapshotManager.tsx imports draftRankDenominatorLabel(\'saved\') from draft-rank-copy.ts rather than hand-writing "your saved drafts"', () => {
    assert.ok(snapshotManager.includes('../../lib/draft-rank-copy.ts'), 'SnapshotManager.tsx must import from ../../lib/draft-rank-copy.ts');
    assert.match(snapshotManager, /draftRankDenominatorLabel\(\s*['"]saved['"]\s*\)/);
    assert.ok(!NO_LOCAL_DENOMINATOR.test(snapshotManager), 'SnapshotManager.tsx must not define a local draftRankDenominatorLabel()');
  });

  it('SnapshotManager.tsx no longer hand-writes the pre-migration "among your saved drafts" literal (missing "of this script")', () => {
    assert.ok(!/among your saved drafts`/.test(snapshotManager), 'the old bare "among your saved drafts" template-literal ending must be gone');
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

  it('carries the shared REFERENCE_SET_LABEL ("hand-authored synthetic reference set") and the correct ordinal suffix, for several inputs', () => {
    // 82 is the case that would have exposed the old hardcoded-"th" bug
    // ("82th" instead of "82nd") had this test existed before the fix.
    for (const pct of [1, 2, 3, 11, 12, 13, 82, 90, 100]) {
      const { markdown } = renderCoverageLetter(letterReport(pct), { title: 'Consistency Check' });
      const expectedFragment = `ranks in the ${ordinal(pct)} percentile against a fixed, ${REFERENCE_SET_SIZE}-sample, ${REFERENCE_SET_LABEL}`;
      assert.ok(
        markdown.includes(expectedFragment),
        `expected the coverage letter to contain "${expectedFragment}" for healthPercentile=${pct} — got: ${markdown}`,
      );
    }
  });
});
