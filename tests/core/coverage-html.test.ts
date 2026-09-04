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
import { computeStructuralReliabilityNote } from '../../server/lib/structural-reliability.ts';
import type {
  ScriptDoctorReport, DimensionScore, CoverageVerdict, DoctorGrade, RootCauseFinding,
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
    // Reader-voice format (writer-experience #3, 2026-09-03): a reader
    // sentence first, the methodology caveat immediately after (not folded
    // into it), then the dimension bullets — matches doctor.ts's
    // buildPlainSummary shape exactly, kept realistic per this function's
    // own doc comment above.
    plainSummary: 'CONSIDER — solid bones with fixable structural problems; overall score 73/100. '
      + 'This is the engine\'s deterministic, threshold-based verdict, not a human read. '
      + 'Theme & Originality is the highest-scoring diagnostic dimension, at 95/100. '
      + 'Dialogue & Voice is the lowest-scoring diagnostic dimension, at 55/100 — most of the trouble is around dialogue on the nose.',
    contentHash: createHash('sha256').update('fixture-script-text').digest('hex'),
    ...overrides,
  };
}

describe('renderCoverageHtml — full document shape', () => {
  it('refuses to export a report that is incomplete or scene-truncated', () => {
    assert.throws(
      () => renderCoverageHtml(buildReport({ analysisComplete: false, health: 0, verdict: undefined }), 'Incomplete'),
      /complete whole-draft analysis/i,
    );
    assert.throws(
      () => renderCoverageHtml(
        buildReport({ analysisComplete: true, truncatedForAnalysis: true, totalSceneCount: 1_001 }),
        'Truncated',
      ),
      /complete whole-draft analysis/i,
    );
  });

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

    // Footer: deterministic-analysis disclaimer + script-text hash (short form).
    assert.match(html, /Deterministic analysis/);
    assert.match(html, /Script-text hash/i);
    assert.ok(!/Verification hash/i.test(html), 'footer must not retain the legacy "Verification hash" label');
    assert.ok(html.includes(report.contentHash!.slice(0, 12)), 'footer must include the short-form content hash');
    assert.ok(!/same script, same verdict, every time/i.test(html), 'footer must not collapse reproducibility into a correctness claim');

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

  it('uses the parsed title-page title over "Untitled" when no explicit title was posted', () => {
    const report = buildReport();
    // title === 'Untitled' is the route's own sentinel for "no title field
    // was posted" (server/routes/export.ts defaults an absent body.title to
    // the literal string 'Untitled') — the renderer treats that the same as
    // empty and falls back to the parsed title page.
    const html = renderCoverageHtml(report, 'Untitled', { titlePageTitle: 'The Long Wait' });

    assert.match(html, /<title>The Long Wait &mdash; Script Coverage<\/title>/);
    assert.match(html, /<h1 class="title">The Long Wait<\/h1>/);
    assert.ok(!html.includes('<h1 class="title">Untitled</h1>'), 'the literal word "Untitled" must not win over a real title page');
  });

  it('an explicit title always wins over the parsed title page', () => {
    const report = buildReport();
    const html = renderCoverageHtml(report, 'The Real Title', { titlePageTitle: 'Some Other Title' });

    assert.match(html, /<h1 class="title">The Real Title<\/h1>/);
    assert.ok(!html.includes('Some Other Title'));
  });

  it('falls back to "Untitled" when there is no explicit title AND no title page', () => {
    const report = buildReport();
    const html = renderCoverageHtml(report, 'Untitled', {});
    assert.match(html, /<h1 class="title">Untitled<\/h1>/);
  });

  it('renders a byline when a title-page author is present, and escapes it', () => {
    const report = buildReport();
    const html = renderCoverageHtml(report, 'The Long Wait', { titlePageAuthor: '<script>alert(1)</script>' });

    assert.match(html, /class="byline">Written by/);
    assert.ok(!/<script>alert\(1\)<\/script>/.test(html));
    assert.ok(html.includes('&lt;script&gt;alert(1)&lt;/script&gt;'));
  });

  it('omits the byline entirely when no title-page author is present', () => {
    const report = buildReport();
    const html = renderCoverageHtml(report, 'The Long Wait');
    assert.ok(!html.includes('class="byline"'));
  });

  it('renders the logline section when a logline is provided, escaped', () => {
    const report = buildReport();
    const html = renderCoverageHtml(report, 'The Long Wait', {
      logline: 'When <script>alert(1)</script> strikes, ALICE must contend with the truth.',
    });

    assert.match(html, /class="logline-line">/);
    assert.match(html, /ALICE must contend with the truth\./);
    assert.ok(!/<script>alert\(1\)<\/script>/.test(html));
  });

  it('omits the logline line entirely when no logline is provided', () => {
    const report = buildReport();
    const html = renderCoverageHtml(report, 'The Long Wait');
    assert.ok(!html.includes('class="logline-line"'));
  });

  it('refuses a zero-scene report instead of exporting a fabricated PASS assessment', () => {
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
      analysisComplete: false,
      verdict: undefined,
      strengths: undefined,
      dimensions: undefined,
      plainSummary: 'Analysis incomplete — no screenplay scenes were found, so the score and verdict are withheld.',
    });

    assert.throws(
      () => renderCoverageHtml(report, 'Empty Script'),
      /complete whole-draft analysis/i,
    );
  });
});

// P3 — the shared report must be INDEPENDENTLY verifiable by a third party
// (ROADMAP §3 P3 exit gate). That turns the verify block into a contract, not
// decoration: whoever receives the file needs the full digest (the footer's
// 12-char display prefix cannot anchor collision resistance), every headline
// number they're being asked to trust, and a route to check them against.
describe('renderCoverageHtml — the verify block (P3 independent verification)', () => {
  it('publishes the FULL 64-hex content hash, not just the display prefix', () => {
    const report = buildReport();
    const html = renderCoverageHtml(report, 'The Long Wait');
    const fullHash = report.contentHash!;

    assert.equal(fullHash.length, 64, 'fixture sanity: contentHash is a full SHA-256 hex digest');
    assert.match(html, /Verify this report/i);
    assert.ok(
      html.includes(fullHash),
      'the verify block must carry the complete digest — a recipient cannot re-attest a report against a truncated prefix',
    );
  });

  it('publishes every claim the recipient is asked to check, matching the report exactly', () => {
    const report = buildReport();
    const html = renderCoverageHtml(report, 'The Long Wait');

    // Each value must be re-checkable via POST /api/export/verify's `expected`
    // — so each must appear as the report's own value, not a rounded display
    // form that would fail verification for the wrong reason.
    assert.match(html, /Script-text hash \(SHA-256, full\)/i);
    assert.ok(html.includes(report.health.toFixed(1)), 'health must be published for verification');
    assert.ok(html.includes(String(report.totalIssues)), 'total issues must be published for verification');
    assert.match(html, /CONSIDER/, 'verdict must be published for verification');
  });

  it('tells the recipient where to verify and what happens when they do', () => {
    const html = renderCoverageHtml(buildReport(), 'The Long Wait');

    // The instructions must resolve to something real: the #verify surface
    // (src/components/VerifyReport.tsx, routed in App.tsx) and the route it
    // posts to. A verify block that only asserts "this is verifiable" without
    // a path to verification is a trust claim, not a trust mechanism.
    assert.match(html, /#verify/, 'must name the in-app verification surface');
    assert.match(html, /\/api\/export\/verify/, 'must name the verification endpoint');
    assert.match(html, /recomputes/i, 'must state that the hash is recomputed, not merely displayed');

    // Still zero JS — verification is a human/HTTP action, not script in the
    // artifact (which would also defeat the point: self-checking code in the
    // file being checked proves nothing).
    assert.ok(!/<script/i.test(html), 'the verify block must not introduce any JS');
  });

  it('omits the verify block entirely when the report carries no content hash', () => {
    // No hash means nothing to anchor verification to. Rendering the block
    // anyway — with instructions and an empty hash — would invite a recipient
    // to "verify" a report that cannot be verified.
    const html = renderCoverageHtml(buildReport({ contentHash: undefined }), 'No Hash');

    assert.ok(!/Verify this report/i.test(html), 'no hash, no verification invitation');
    assert.ok(!html.includes('class="verify-block"'), 'the verify markup itself must not render');
  });

  it('publishes claims that survive a round-trip to the verify route unchanged', () => {
    // The block's whole job is to be machine-transcribable: a recipient types
    // these values into #verify and POSTs them as `expected`. So each must
    // appear in a form that parses back to the report's own value — a
    // thousands separator in totalIssues, or a locale-formatted health, would
    // make an authentic report fail verification.
    const report = buildReport({ health: 72.5, totalIssues: 1234 });
    const html = renderCoverageHtml(report, 'Round Trip');

    const hashMatch = html.match(/<dt>Script-text hash \(SHA-256, full\)<\/dt><dd><code>([^<]+)<\/code><\/dd>/);
    assert.ok(hashMatch, 'the hash must be published in a parseable dt/dd pair');
    assert.equal(hashMatch![1], report.contentHash);

    assert.ok(html.includes('<code>1234</code>'), 'totalIssues must be raw digits, not locale-grouped ("1,234")');
    assert.ok(html.includes('<code>72.5</code>'), 'health must be the plain numeric value');
  });
});

// Pilot session 2026-08-07 finding #3 (PILOT_SESSION_REPORT.md §0.3/§6/§9.3):
// the API report carries a rootCauses synthesis that the exported coverage.html
// never rendered — it jumped straight from Top Priorities to the raw Full Pass
// Appendix. renderCoverageHtml now renders it, only when the report actually
// carries one.
//
// 2026-09-04 (advice-quality audit item 1): that single section is now TWO.
// `id` below is shaped like cluster.ts actually produces it — a template/
// family slug plus a hyphen plus a 16-hex hash for a NAMED finding
// (isNamedRootCause reads exactly this shape, not the title) — so these
// fixtures exercise the real discriminator, not a coincidence of the id
// string 'rc-1' the pre-split fixture used.
function makeRootCause(overrides: Partial<RootCauseFinding> = {}): RootCauseFinding {
  return {
    id: 'protagonist-passivity-climax-a1b2c3d4e5f67890',
    title: 'Protagonist checks out at the climax',
    explanation: 'The climax scene shows no protagonist engagement — neutral emotion, no clock pressure, no discovery.',
    severity: 'critical',
    memberRules: ['PROTAGONIST_PASSIVITY_CLIMAX', 'UNMOTIVATED_DECISION'],
    memberCount: 4,
    sceneIdxs: [8],
    ...overrides,
  };
}

/** A generic, auto-titled cluster — id is a BARE 16-hex hash, exactly what
 *  cluster.ts's synthesize*Finding functions emit with no slug prefix. */
function makeGenericRootCause(overrides: Partial<RootCauseFinding> = {}): RootCauseFinding {
  return {
    id: 'a1b2c3d4e5f67890',
    title: 'Recurring Structure & Pacing trouble in Scene 3',
    explanation: '5 issues converge here, mostly around structure — concentrated in Scene 3 (lines 40-60).',
    severity: 'major',
    memberRules: ['THIN_SCENE', 'FLAT_CONFLICT'],
    memberCount: 5,
    sceneIdxs: [2],
    ...overrides,
  };
}

describe('renderCoverageHtml — Root Causes sections', () => {
  it('ends at the closing html tag without trailing whitespace', () => {
    const html = renderCoverageHtml(buildReport({ rootCauses: [makeRootCause(), makeGenericRootCause()] }), 'Whitespace-Free Export');

    assert.equal(html, html.trimEnd(), 'generated exports must be reproducible without post-render whitespace cleanup');
    assert.ok(html.endsWith('</html>'));
    const trailingWhitespaceLines = html
      .split('\n')
      .map((line, index) => ({ line, number: index + 1 }))
      .filter(({ line }) => /[ \t]+$/.test(line));
    assert.deepEqual(trailingWhitespaceLines, [], 'no generated line may need manual trailing-whitespace cleanup');
  });

  it('omits both sections entirely when the report carries no rootCauses field', () => {
    const html = renderCoverageHtml(buildReport(), 'A Draft With No Clustering');
    assert.ok(!html.includes('<h2>Root Causes</h2>'), 'named-findings heading must not render when rootCauses is absent');
    assert.ok(!html.includes('<h2>Recurring Issue Clusters</h2>'), 'generic-clusters heading must not render when rootCauses is absent');
  });

  it('omits both sections when rootCauses is an empty array', () => {
    const html = renderCoverageHtml(buildReport({ rootCauses: [] }), 'A Draft With No Clustering');
    assert.ok(!html.includes('<h2>Root Causes</h2>'));
    assert.ok(!html.includes('<h2>Recurring Issue Clusters</h2>'));
    assert.ok(!html.includes('Subsumes'), 'no root-cause list markup when nothing clustered');
  });

  it('renders only Root Causes (named) when every rootCause is named, above Top Priorities', () => {
    const html = renderCoverageHtml(buildReport({ rootCauses: [makeRootCause()] }), 'Named Only');
    assert.match(html, /<h2>Root Causes<\/h2>/);
    assert.ok(!html.includes('<h2>Recurring Issue Clusters</h2>'), 'no generic section when nothing generic clustered');
    const rootCausesIdx = html.indexOf('<h2>Root Causes</h2>');
    const topPrioritiesIdx = html.indexOf('<h2>Top Priorities</h2>');
    assert.ok(rootCausesIdx >= 0 && topPrioritiesIdx > rootCausesIdx, 'named Root Causes must render BEFORE Top Priorities');
  });

  it('renders only Recurring Issue Clusters (generic) when every rootCause is generic, below Top Priorities', () => {
    const html = renderCoverageHtml(buildReport({ rootCauses: [makeGenericRootCause()] }), 'Generic Only');
    assert.ok(!html.includes('<h2>Root Causes</h2>'), 'no named section when nothing named clustered');
    assert.match(html, /<h2>Recurring Issue Clusters<\/h2>/);
    const topPrioritiesIdx = html.indexOf('<h2>Top Priorities</h2>');
    const clustersIdx = html.indexOf('<h2>Recurring Issue Clusters</h2>');
    assert.ok(topPrioritiesIdx >= 0 && clustersIdx > topPrioritiesIdx, 'generic clusters must render AFTER Top Priorities');
  });

  it('renders a mix in the order: Root Causes (named) < Top Priorities < Recurring Issue Clusters (generic) < Full Pass Appendix', () => {
    const report = buildReport({
      rootCauses: [
        makeRootCause(),
        makeGenericRootCause({
          id: 'b2c3d4e5f6789012',
          title: 'On-the-nose exposition in the office scene',
          explanation: 'Ottie delivers backstory in one unbroken speech with no witnessed confirmation.',
          severity: 'major',
          memberRules: ['UNINTERRUPTED_MONOLOGUE', 'REVELATION_UNEARNED'],
          memberCount: 3,
          sceneIdxs: [4],
        }),
      ],
    });
    const html = renderCoverageHtml(report, 'Has Root Causes');

    assert.match(html, /<h2>Root Causes<\/h2>/);
    assert.match(html, /Protagonist checks out at the climax/);
    assert.match(html, /neutral emotion, no clock pressure, no discovery/);
    assert.match(html, /Subsumes 4 issues/);
    assert.match(html, /Scene 9/, 'sceneIdxs must render 1-based, matching the codebase-wide display convention');
    assert.match(html, /PROTAGONIST_PASSIVITY_CLIMAX/);
    assert.match(html, /<h2>Recurring Issue Clusters<\/h2>/);
    assert.match(html, /On-the-nose exposition in the office scene/);

    const rootCausesIdx = html.indexOf('<h2>Root Causes</h2>');
    const topPrioritiesIdx = html.indexOf('<h2>Top Priorities</h2>');
    const clustersIdx = html.indexOf('<h2>Recurring Issue Clusters</h2>');
    const appendixIdx = html.indexOf('<h2>Full Pass Appendix</h2>');
    assert.ok(rootCausesIdx >= 0 && topPrioritiesIdx > rootCausesIdx, 'named Root Causes must render before Top Priorities');
    assert.ok(clustersIdx > topPrioritiesIdx, 'generic clusters must render after Top Priorities');
    assert.ok(appendixIdx > clustersIdx, 'generic clusters must render before the Full Pass Appendix, which must still be kept');
  });

  it('escapes an XSS payload in a named root cause title, explanation, and member rule', () => {
    const report = buildReport({
      rootCauses: [
        makeRootCause({
          title: '<script>alert(1)</script>',
          explanation: 'He said "hello" and then <script>alert(document.cookie)</script> ran.',
          memberRules: ['<script>alert(2)</script>'],
        }),
      ],
    });
    const html = renderCoverageHtml(report, 'Malicious Root Cause');

    assert.ok(!/<script/i.test(html), 'no raw <script> tag may appear in the output');
    assert.ok(html.includes('&lt;script&gt;alert(1)&lt;/script&gt;'), 'title must be HTML-escaped, not dropped');
    assert.ok(html.includes('&lt;script&gt;alert(document.cookie)&lt;/script&gt;'), 'explanation must be HTML-escaped');
    assert.ok(html.includes('&lt;script&gt;alert(2)&lt;/script&gt;'), 'member rule names must be HTML-escaped');
    assert.ok(html.includes('&quot;hello&quot;'), 'quotes in the explanation must be escaped');
  });

  it('escapes an XSS payload in a generic root cause title', () => {
    const report = buildReport({
      rootCauses: [makeGenericRootCause({ title: '<script>alert(3)</script>' })],
    });
    const html = renderCoverageHtml(report, 'Malicious Generic Cluster');
    assert.ok(!/<script/i.test(html));
    assert.ok(html.includes('&lt;script&gt;alert(3)&lt;/script&gt;'));
  });
});

// ── Contradiction suppression in Top Priorities (2026-09-04, advice-quality
// audit item 10) — see prioritize.ts's CONTRADICTORY_PAIRS for the table.
// buildTopPrioritiesSection applies it so every renderCoverageHtml caller
// (the live /coverage export, PDF, the P0 sample report generator) gets the
// suppression even when the route that built the report didn't already
// filter — see server/routes/scriptide.ts's publicDoctorReport for the
// separate route-layer application to the live JSON API.
describe('renderCoverageHtml — Top Priorities contradiction suppression', () => {
  function issueOf(rule: string): RevisionIssue & { pass: PassName } {
    return {
      rule,
      location: `${rule} location`,
      description: `${rule} description`,
      severity: 'major',
      pass: 'structure',
    };
  }

  it('never renders both INCITING_INCIDENT_TOO_LATE and FALSE_CLIMAX in the same report', () => {
    const html = renderCoverageHtml(
      buildReport({ topPriorities: [issueOf('FALSE_CLIMAX'), issueOf('INCITING_INCIDENT_TOO_LATE')] }),
      'Contradiction A',
    );
    assert.match(html, /FALSE_CLIMAX location/);
    assert.ok(!html.includes('INCITING_INCIDENT_TOO_LATE location'), 'the suppressed rule must not reach the rendered page');
  });

  it('never renders both PURPOSE_CLIMAX_ABSENT and PROTAGONIST_PASSIVITY_CLIMAX in the same report', () => {
    const html = renderCoverageHtml(
      buildReport({ topPriorities: [issueOf('PROTAGONIST_PASSIVITY_CLIMAX'), issueOf('PURPOSE_CLIMAX_ABSENT')] }),
      'Contradiction B',
    );
    assert.match(html, /PROTAGONIST_PASSIVITY_CLIMAX location/);
    assert.ok(!html.includes('PURPOSE_CLIMAX_ABSENT location'));
  });

  it('renders an uncorroborated suppressed rule fine on its own', () => {
    const html = renderCoverageHtml(buildReport({ topPriorities: [issueOf('PURPOSE_CLIMAX_ABSENT')] }), 'Lone Finding');
    assert.match(html, /PURPOSE_CLIMAX_ABSENT location/);
  });
});

// ── Structural reliability note (#8 provenance) ─────────────────────────────
// server/lib/structural-reliability.ts is now the SINGLE source of truth for
// this caveat: doctor.ts's aggregation populates it onto
// ScriptDoctorReport.provenance.structuralReliabilityNote, and this renderer
// is a CONSUMER of that field rather than an independent computation. These
// tests are the regression guard the header comments on both files promise:
// if the two ever drift (someone edits the text in one place but not the
// other, or the >40 threshold moves in only one file), a test here fails.
describe('renderCoverageHtml — structural reliability note stays in sync with doctor.ts provenance', () => {
  it('renders the exact note carried on report.provenance when present', () => {
    const note = computeStructuralReliabilityNote(45);
    assert.ok(note, 'sanity: 45 scenes must earn a note from the shared function');
    const report = buildReport({
      sceneCount: 45,
      provenance: {
        engineCommit: 'abc123',
        rulebookCount: 3217,
        groundTruthSource: 'mechanical-degradation',
        percentileBasis: 'internal-calibration-corpus-20-samples',
        structuralReliabilityNote: note,
      },
    });
    const html = renderCoverageHtml(report, 'Feature Length Draft');
    assert.ok(html.includes(`<div class="footer-caveat">${note}</div>`));
  });

  it('falls back to computing the SAME note when a report carries no provenance field', () => {
    // Simulates a report shape older than the provenance field, or a
    // hand-reconstructed one — the renderer must still be correct, and must
    // still agree with the value doctor.ts would have attached.
    const report = buildReport({ sceneCount: 45, provenance: undefined });
    const html = renderCoverageHtml(report, 'Feature Length Draft');
    const expected = computeStructuralReliabilityNote(45);
    assert.ok(html.includes(`<div class="footer-caveat">${expected}</div>`));
  });

  it('a provenance note that DISAGREES with the shared function would be rendered verbatim — proving the renderer trusts the report, not a second computation', () => {
    // Not a "should happen" case (doctor.ts always calls the same shared
    // function), but it demonstrates the renderer is genuinely a CONSUMER:
    // it prints whatever the report says, rather than silently recomputing
    // and overriding it.
    const report = buildReport({
      sceneCount: 45,
      provenance: {
        engineCommit: 'abc123',
        rulebookCount: 3217,
        groundTruthSource: 'mechanical-degradation',
        percentileBasis: 'internal-calibration-corpus-20-samples',
        structuralReliabilityNote: 'a distinguishable sentinel string the test can find',
      },
    });
    const html = renderCoverageHtml(report, 'Feature Length Draft');
    assert.ok(html.includes('a distinguishable sentinel string the test can find'));
  });

  it('omits the caveat at/below the threshold, matching computeStructuralReliabilityNote returning undefined', () => {
    assert.equal(computeStructuralReliabilityNote(40), undefined);
    const report = buildReport({ sceneCount: 40, provenance: undefined });
    const html = renderCoverageHtml(report, 'Short Draft');
    // '.footer-caveat' the CSS rule is always present in the stylesheet;
    // what must be absent is the actual rendered <div>.
    assert.ok(!html.includes('<div class="footer-caveat">'));
  });
});
