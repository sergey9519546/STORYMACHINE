// Shareable coverage-report export — tests for the pure HTML renderer
// (server/lib/coverage-html.ts). Conventions: node:test + assert/strict,
// matching tests/core/script-doctor.test.ts and tests/core/fdx-import.test.ts.
//
// Coverage: full-document shape over a hand-built ScriptDoctorReport fixture
// (doctype, title, verdict, all five dimension labels, footer hash), the XSS
// guard (title/issue description/scene slug carrying a <script> tag and
// quotes must never reach the output unescaped), the "What's Working"
// section being genuinely omitted (not just emptied) when strengths is
// empty, and the PASS "(decline)" parenthetical every producer-facing
// export must carry so PASS is never misread as an affirmative.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { renderCoverageHtml } from '../../server/lib/coverage-html.ts';
import type {
  ScriptDoctorReport, DimensionScore, CoverageVerdict, DoctorGrade,
} from '../../server/nvm/analyze/types.ts';
import type { StructureState } from '../../server/nvm/screenplay/structure.ts';
import type { PassName, RevisionIssue } from '../../server/nvm/revision/passes/types.ts';

const FIXED_ANALYZED_AT = Date.UTC(2026, 6, 5, 12, 0, 0); // 2026-07-05T12:00:00Z

function baseStructure(): StructureState {
  return {
    actPosition: 'act2b',
    completionPercent: 62,
    avgSuspensePerScene: 3.4,
    escalating: true,
    reversalCount: 1,
    reversalDensity: 3.3,
    approachingClimax: false,
    openClues: 0,
    revelationCount: 1,
    midpointPressure: 5,
    tightestScene: 1,
  };
}

function makeIssue(overrides: Partial<RevisionIssue> = {}): RevisionIssue {
  return {
    location: 'Scene 2 (INT. BAR)',
    rule: 'DIALOGUE_ON_THE_NOSE',
    description: 'Dialogue states the theme directly instead of dramatizing it.',
    severity: 'critical',
    ...overrides,
  };
}

const DIALOGUE_ISSUE = makeIssue({
  location: 'Scene 2 (INT. BAR)',
  rule: 'DIALOGUE_ON_THE_NOSE',
  description: 'Dialogue states the theme directly instead of dramatizing it.',
  severity: 'critical',
});
const DIALOGUE_MINOR_ISSUE = makeIssue({
  location: 'Scene 3 (EXT. STREET)',
  rule: 'DIALOGUE_FILLER',
  description: 'Filler dialogue slows the scene down.',
  severity: 'minor',
  suggestedFix: 'Cut the first two lines of this exchange.',
});
const VOICE_ISSUE = makeIssue({
  location: 'Scene 1 (INT. HOME)',
  rule: 'VOICE_FLAT',
  description: 'This character\'s voice reads flat compared to earlier scenes.',
  severity: 'major',
  suggestedFix: 'Give the character a distinct verbal tic.',
});

const DIMENSION_LABELS = [
  'Structure & Pacing', 'Character', 'Dialogue & Voice', 'Plot Logic & Payoff', 'Theme & Originality',
];

function makeDimensions(): DimensionScore[] {
  const defs: Array<{ key: DimensionScore['key']; label: string; passes: PassName[]; score: number; issueCount: number }> = [
    { key: 'structure-pacing', label: DIMENSION_LABELS[0], passes: ['structure', 'pacing', 'rhythm'], score: 88, issueCount: 0 },
    { key: 'character', label: DIMENSION_LABELS[1], passes: ['character-arc', 'intention', 'relationship-arc'], score: 92, issueCount: 0 },
    { key: 'dialogue-voice', label: DIMENSION_LABELS[2], passes: ['dialogue', 'voice'], score: 55, issueCount: 3 },
    { key: 'plot-logic', label: DIMENSION_LABELS[3], passes: ['causality', 'belief', 'payoff', 'conflict'], score: 70, issueCount: 0 },
    { key: 'theme-originality', label: DIMENSION_LABELS[4], passes: ['theme', 'originality'], score: 95, issueCount: 0 },
  ];
  return defs.map(d => ({
    ...d,
    summary: d.issueCount === 0
      ? `${d.label} reads cleanly.`
      : `${d.issueCount} problem(s) here, mostly around dialogue on the nose.`,
  }));
}

/** A fully-populated, realistic ScriptDoctorReport — every optional coverage
 *  field present, matching what runScriptDoctor actually produces for a
 *  non-degenerate script. Callers override individual fields per test. */
function buildReport(overrides: Partial<ScriptDoctorReport> = {}): ScriptDoctorReport {
  const passes: ScriptDoctorReport['passes'] = [
    { pass: 'structure', issues: [], critical: 0, major: 0, minor: 0 },
    { pass: 'dialogue', issues: [DIALOGUE_ISSUE, DIALOGUE_MINOR_ISSUE], critical: 1, major: 0, minor: 1 },
    { pass: 'voice', issues: [VOICE_ISSUE], critical: 0, major: 1, minor: 0 },
  ];

  return {
    health: 72.5,
    grade: 'solid' as DoctorGrade,
    totalIssues: 3,
    bySeverity: { critical: 1, major: 1, minor: 1 },
    passes,
    sceneHeatmap: [
      { sceneIdx: 0, slug: 'INT. HOME - DAY', issueCount: 0, critical: 0, major: 0, minor: 0 },
      { sceneIdx: 1, slug: 'INT. BAR - NIGHT', issueCount: 1, critical: 1, major: 0, minor: 0 },
      { sceneIdx: 2, slug: 'EXT. STREET - NIGHT', issueCount: 1, critical: 0, major: 0, minor: 1 },
    ],
    topPriorities: [
      { ...DIALOGUE_ISSUE, pass: 'dialogue' },
      { ...VOICE_ISSUE, pass: 'voice' },
      { ...DIALOGUE_MINOR_ISSUE, pass: 'dialogue' },
    ],
    structure: baseStructure(),
    characters: ['ALICE', 'BOB'],
    sceneCount: 3,
    wordCount: 540,
    analyzedAt: FIXED_ANALYZED_AT,
    verdict: 'CONSIDER' as CoverageVerdict,
    dimensions: makeDimensions(),
    strengths: [
      'Nothing to fix in Character — clean across all 3 scene(s).',
      'No fatal flaws surfaced across 3 scenes — nothing here would sink the draft outright.',
    ],
    plainSummary: 'CONSIDER — a promising draft that needs focused work; overall craft score 72.5/100. '
      + 'Theme & Originality is the strongest part of the draft, scoring 95/100. '
      + 'Dialogue & Voice is the weakest area, at 55/100 — most of the trouble is around dialogue on the nose.',
    contentHash: createHash('sha256').update('fixture-script-text').digest('hex'),
    ...overrides,
  };
}

describe('renderCoverageHtml — full document shape', () => {
  it('renders a complete standalone document with doctype, title, verdict, all five dimension labels, and a footer hash', () => {
    const report = buildReport();
    const html = renderCoverageHtml(report, 'The Long Wait');

    assert.ok(html.startsWith('<!DOCTYPE html>'), 'must be a complete standalone HTML document');
    assert.match(html, /<html lang="en">/);
    assert.match(html, /<title>The Long Wait/);
    assert.match(html, /The Long Wait/); // title rendered in the visible header too

    // Verdict — coverage vocabulary, not a raw enum dump.
    assert.match(html, /CONSIDER/);

    // All five DimensionKey-order labels present (ampersands render escaped).
    assert.match(html, /Structure &amp; Pacing/);
    assert.match(html, /Character/);
    assert.match(html, /Dialogue &amp; Voice/);
    assert.match(html, /Plot Logic &amp; Payoff/);
    assert.match(html, /Theme &amp; Originality/);

    // Footer: deterministic-analysis disclaimer + verification hash (short form).
    assert.match(html, /Deterministic analysis/);
    assert.match(html, /Verification hash/i);
    assert.ok(html.includes(report.contentHash!.slice(0, 12)), 'footer must include the short-form content hash');

    // Sanity: no JS is emitted anywhere (the deliverable requires zero JS to view).
    assert.ok(!/<script/i.test(html), 'document must not contain any <script> tag');

    // Scene heatmap tooltip carries the (escaped) scene slug.
    assert.match(html, /INT\. BAR - NIGHT/);

    // Top priorities and per-pass appendix both rendered.
    assert.match(html, /Top Priorities/);
    assert.match(html, /Full Pass Appendix/);
    assert.match(html, /Give the character a distinct verbal tic\./);
  });

  it('escapes an XSS payload in title, issue description, and scene slug — no raw <script> or unescaped quotes reach the output', () => {
    const maliciousSlug = 'INT. "ROOM" <script>alert(1)</script> - DAY';
    const maliciousDescription = 'He said "hello" and then <script>alert(document.cookie)</script> ran.';
    const maliciousTitle = '<script>alert(1)</script>';

    const report = buildReport({
      sceneHeatmap: [
        { sceneIdx: 0, slug: maliciousSlug, issueCount: 1, critical: 1, major: 0, minor: 0 },
      ],
      topPriorities: [
        { ...makeIssue({ description: maliciousDescription, severity: 'critical', location: 'Scene 1' }), pass: 'dialogue' },
      ],
      strengths: [],
    });

    const html = renderCoverageHtml(report, maliciousTitle);

    // No literal <script> tag anywhere in the document, case-insensitive.
    assert.ok(!/<script/i.test(html), 'no raw <script> tag may appear in the output');
    assert.ok(!html.includes('<script>alert(1)</script>'), 'title payload must not survive verbatim');
    assert.ok(!html.includes('<script>alert(document.cookie)</script>'), 'description payload must not survive verbatim');

    // The escaped forms are present instead — proof the content was rendered
    // (not silently dropped) but neutralized.
    assert.ok(html.includes('&lt;script&gt;alert(1)&lt;/script&gt;'), 'title must be HTML-escaped, not dropped');
    assert.ok(
      html.includes('&lt;script&gt;alert(document.cookie)&lt;/script&gt;'),
      'issue description must be HTML-escaped, not dropped',
    );

    // Quotes inside the scene slug (rendered into a title="" tooltip attribute)
    // must be escaped so they cannot break out of the attribute value.
    assert.ok(html.includes('&quot;ROOM&quot;'), 'quotes in the slug must be escaped for the tooltip attribute');
    assert.ok(!html.includes('title="INT. "ROOM"'), 'a raw unescaped quote must never appear inside the title attribute');

    // Quotes inside prose text are escaped too (belt-and-suspenders: one
    // escaping path for every interpolated string, no special-cased "this
    // one doesn't need it" exemptions).
    assert.ok(html.includes('&quot;hello&quot;'), 'quotes in issue description must be escaped');
  });

  it('omits the "What\'s Working" section entirely when strengths is empty', () => {
    const report = buildReport({ strengths: [] });
    const html = renderCoverageHtml(report, 'No Strengths Yet');

    assert.ok(!html.includes('What&rsquo;s Working'), 'the strengths heading must not render when there is nothing earned');
    assert.ok(!html.includes('class="checklist"'), 'the checklist markup itself must not render when strengths is empty');
  });

  it('includes the "What\'s Working" section when strengths is non-empty', () => {
    const report = buildReport();
    const html = renderCoverageHtml(report, 'Has Strengths');

    assert.ok(html.includes('What&rsquo;s Working'));
    assert.match(html, /Nothing to fix in Character/);
  });

  it('labels a PASS verdict with the "(decline)" parenthetical so laypeople don\'t misread it as an affirmative', () => {
    const report = buildReport({ verdict: 'PASS' as CoverageVerdict });
    const html = renderCoverageHtml(report, 'A Troubled Draft');

    assert.match(html, /PASS \(decline\)/);
  });

  it('renders RECOMMEND and CONSIDER verdicts without the "(decline)" parenthetical', () => {
    const recommend = renderCoverageHtml(buildReport({ verdict: 'RECOMMEND' as CoverageVerdict }), 'A Strong Draft');
    assert.match(recommend, /RECOMMEND/);
    assert.ok(!recommend.includes('(decline)'));

    const consider = renderCoverageHtml(buildReport({ verdict: 'CONSIDER' as CoverageVerdict }), 'A Promising Draft');
    assert.match(consider, /CONSIDER/);
    assert.ok(!consider.includes('(decline)'));
  });

  it('gracefully handles a degenerate zero-scene report (no dimensions/strengths/heatmap crash)', () => {
    const report = buildReport({
      health: 0,
      grade: 'troubled' as DoctorGrade,
      totalIssues: 0,
      bySeverity: { critical: 0, major: 0, minor: 0 },
      passes: [],
      sceneHeatmap: [],
      topPriorities: [],
      characters: [],
      sceneCount: 0,
      wordCount: 0,
      verdict: 'PASS' as CoverageVerdict,
      strengths: [],
      plainSummary: 'PASS — this submission is empty, so there is nothing to score; overall craft score 0/100.',
    });

    const html = renderCoverageHtml(report, 'Empty Script');
    assert.ok(html.startsWith('<!DOCTYPE html>'));
    assert.match(html, /PASS \(decline\)/);
    assert.match(html, /No scenes were analyzed/);
    assert.match(html, /Nothing urgent surfaced/);
  });
});
