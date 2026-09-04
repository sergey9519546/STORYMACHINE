// Deterministic coverage LETTER — tests for the pure renderer
// (server/lib/coverage-letter.ts). Conventions match tests/core/
// coverage-html.test.ts (same fixture-building style, node:test + strict
// assert). Three kinds of coverage here:
//
//   1. Hand-built ScriptDoctorReport fixtures (this file) exercising each
//      section's presence/absence logic, the PASS "(decline)" wording, the
//      >40-scene structural caveat, and the incomplete-analysis guard.
//   2. Determinism: same report + opts -> byte-identical markdown/text,
//      called twice.
//   3. Snapshot tests against two REAL captured ScriptDoctorReports
//      (tests/fixtures/coverage-letter/report{1,2}.json, produced by an
//      earlier discovery session driving the live app) compared against
//      committed expected-letter fixtures — proof the renderer produces a
//      stable, reviewable document for output the doctor actually emits,
//      not just for hand-built shapes.
//   4. Honesty: every specific number the letter claims (health, scene/word
//      counts, percentile, root-cause issue counts, scene numbers) is traced
//      back to a value that actually appears on the source report — no
//      sentence may claim more than the report supports.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderCoverageLetter } from '../../server/lib/coverage-letter.ts';
import { draftRankDenominatorLabel } from '../../src/lib/draft-rank-copy.ts';
import type {
  ScriptDoctorReport, CoverageVerdict, DoctorGrade, RootCauseFinding, ReportProvenance,
} from '../../server/nvm/analyze/types.ts';
import type { StructureState } from '../../server/nvm/screenplay/structure.ts';
import type { PassName, RevisionIssue } from '../../server/nvm/revision/passes/types.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = path.join(__dirname, '..', 'fixtures', 'coverage-letter');

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
const VOICE_ISSUE = makeIssue({
  location: 'Scene 1 (INT. HOME)',
  rule: 'VOICE_FLAT',
  description: 'This character\'s voice reads flat compared to earlier scenes.',
  severity: 'major',
  suggestedFix: 'Give the character a distinct verbal tic.',
});
const GENERAL_ISSUE = makeIssue({
  location: 'Overall structure',
  rule: 'NO_REVERSALS',
  description: 'No suspense-dip reversals detected anywhere in the draft.',
  severity: 'major',
});

function makeRootCause(overrides: Partial<RootCauseFinding> = {}): RootCauseFinding {
  return {
    id: 'rc1',
    title: 'Flat midpoint',
    explanation: 'The midpoint scene carries no reversal or pivot.',
    severity: 'major',
    memberRules: ['WEAK_MIDPOINT'],
    memberCount: 4,
    sceneIdxs: [3],
    ...overrides,
  };
}

/** A fully-populated, realistic ScriptDoctorReport — matches
 *  coverage-html.test.ts's buildReport() fixture style. Callers override
 *  individual fields per test. */
function buildReport(overrides: Partial<ScriptDoctorReport> = {}): ScriptDoctorReport {
  const passes: ScriptDoctorReport['passes'] = [
    { pass: 'structure', issues: [], critical: 0, major: 0, minor: 0 } as ScriptDoctorReport['passes'][number],
    { pass: 'dialogue', issues: [DIALOGUE_ISSUE], critical: 1, major: 0, minor: 0 } as ScriptDoctorReport['passes'][number],
  ];

  return {
    health: 72.5,
    grade: 'solid' as DoctorGrade,
    totalIssues: 3,
    bySeverity: { critical: 1, major: 1, minor: 1 },
    passes,
    sceneHeatmap: [],
    topPriorities: [
      { ...DIALOGUE_ISSUE, pass: 'dialogue' as PassName },
      { ...VOICE_ISSUE, pass: 'voice' as PassName },
      { ...GENERAL_ISSUE, pass: 'structure' as PassName },
    ],
    structure: baseStructure(),
    characters: ['ALICE', 'BOB'],
    sceneCount: 3,
    wordCount: 540,
    analyzedAt: FIXED_ANALYZED_AT,
    verdict: 'CONSIDER' as CoverageVerdict,
    strengths: [
      'Nothing to fix in Character — clean across all 3 scene(s).',
      'No fatal flaws surfaced across 3 scenes — nothing here would sink the draft outright.',
    ],
    plainSummary: 'CONSIDER — the engine\'s intermediate threshold-based verdict; overall engine score 73/100.',
    rootCauses: [makeRootCause()],
    healthPercentile: 64,
    contentHash: createHash('sha256').update('fixture-script-text').digest('hex'),
    analysisComplete: true,
    ...overrides,
  };
}

// ── Section presence/absence + wording ───────────────────────────────────────

describe('renderCoverageLetter — shape and wording', () => {
  it('refuses to render a report that is incomplete or scene-truncated', () => {
    assert.throws(
      () => renderCoverageLetter(buildReport({ analysisComplete: false, health: 0, verdict: undefined })),
      /complete whole-draft analysis/i,
    );
    assert.throws(
      () => renderCoverageLetter(
        buildReport({ analysisComplete: true, truncatedForAnalysis: true, totalSceneCount: 1_001 }),
      ),
      /complete whole-draft analysis/i,
    );
  });

  it('renders a title, verdict, headline stats, and summary in both formats', () => {
    const { markdown, text } = renderCoverageLetter(buildReport(), { title: 'The Long Wait', author: 'A. Writer' });

    assert.match(markdown, /^# The Long Wait/);
    assert.match(markdown, /Written by A\. Writer/);
    assert.match(markdown, /CONSIDER/);
    assert.match(markdown, /Health 72\.5\/100/);
    assert.match(markdown, /3 scenes/);
    assert.match(markdown, /540 words/);
    assert.match(markdown, /overall engine score 73\/100/);

    assert.match(text, /^THE LONG WAIT/);
    assert.match(text, /Written by A\. Writer/);
    assert.match(text, /CONSIDER/);
    assert.match(text, /Health 72\.5\/100/);
  });

  it('falls back to "Untitled" when no title is given', () => {
    const { markdown } = renderCoverageLetter(buildReport());
    assert.match(markdown, /^# Untitled/);
  });

  it('omits the byline entirely when no author is given', () => {
    const { markdown, text } = renderCoverageLetter(buildReport(), { title: 'No Byline' });
    assert.ok(!markdown.includes('Written by'));
    assert.ok(!text.includes('Written by'));
  });

  it('labels a PASS verdict with the "(decline)" parenthetical', () => {
    const { markdown, text } = renderCoverageLetter(buildReport({ verdict: 'PASS' as CoverageVerdict }));
    assert.match(markdown, /PASS \(decline\)/);
    assert.match(text, /PASS \(decline\)/);
  });

  it('renders RECOMMEND and CONSIDER without the "(decline)" parenthetical', () => {
    const recommend = renderCoverageLetter(buildReport({ verdict: 'RECOMMEND' as CoverageVerdict }));
    assert.match(recommend.markdown, /RECOMMEND/);
    assert.ok(!recommend.markdown.includes('(decline)'));
  });

  it('omits the "What\'s Working" section when strengths is empty', () => {
    const { markdown, text } = renderCoverageLetter(buildReport({ strengths: [] }));
    assert.ok(!markdown.includes('What’s Working'));
    assert.ok(!text.includes('WHAT’S WORKING'));
  });

  it('includes strengths verbatim when present', () => {
    const { markdown } = renderCoverageLetter(buildReport());
    assert.match(markdown, /Nothing to fix in Character/);
  });

  it('omits the Root Causes section when rootCauses is empty or absent', () => {
    const { markdown: withoutList } = renderCoverageLetter(buildReport({ rootCauses: [] }));
    assert.ok(!withoutList.includes('## Root Causes'));

    const { markdown: withoutField } = renderCoverageLetter(buildReport({ rootCauses: undefined }));
    assert.ok(!withoutField.includes('## Root Causes'));
  });

  it('renders up to 3 root causes, worst severity and largest member count first', () => {
    const minor = makeRootCause({ id: 'a', title: 'Minor thread', severity: 'minor', memberCount: 20, sceneIdxs: [] });
    const criticalSmall = makeRootCause({ id: 'b', title: 'Small critical', severity: 'critical', memberCount: 1, sceneIdxs: [0] });
    const majorBig = makeRootCause({ id: 'c', title: 'Big major', severity: 'major', memberCount: 9, sceneIdxs: [1, 2] });
    const majorSmall = makeRootCause({ id: 'd', title: 'Small major', severity: 'major', memberCount: 2, sceneIdxs: [] });

    const { markdown } = renderCoverageLetter(buildReport({ rootCauses: [minor, criticalSmall, majorBig, majorSmall] }));
    const order = ['Small critical', 'Big major', 'Small major', 'Minor thread']
      .map(t => markdown.indexOf(t))
      .filter(i => i !== -1);
    assert.deepEqual(order, [...order].sort((a, b) => a - b), 'must appear in severity/size order');
    assert.ok(!markdown.includes('Minor thread'), 'only the top 3 root causes render');
  });

  it('names the scenes a root cause points at, and omits the parenthetical when there are none', () => {
    const anchored = makeRootCause({ title: 'Anchored cause', sceneIdxs: [0, 2] });
    const unanchored = makeRootCause({ id: 'u', title: 'Unanchored cause', severity: 'critical', sceneIdxs: [] });

    const { markdown } = renderCoverageLetter(buildReport({ rootCauses: [unanchored, anchored] }));
    assert.match(markdown, /Anchored cause \(Scenes 1, 3\)/);
    assert.match(markdown, /Unanchored cause(?! \()/);
  });

  it('omits the Priorities section when topPriorities is empty', () => {
    const { markdown } = renderCoverageLetter(buildReport({ topPriorities: [] }));
    assert.ok(!markdown.includes('## Priorities to Address First'));
  });

  it('prefers scene/lines-anchored priorities over whole-draft generalities', () => {
    const general1 = makeIssue({ location: 'Overall pacing', description: 'General note one', severity: 'minor' });
    const general2 = makeIssue({ location: 'Whole draft', description: 'General note two', severity: 'minor' });
    const anchored = makeIssue({ location: 'Scene 5 (midpoint)', description: 'Anchored note', severity: 'minor' });

    const { markdown } = renderCoverageLetter(buildReport({
      topPriorities: [
        { ...general1, pass: 'structure' as PassName },
        { ...general2, pass: 'structure' as PassName },
        { ...anchored, pass: 'structure' as PassName },
      ],
    }));
    assert.match(markdown, /Anchored note/, 'the anchored issue must make the top-3 cut ahead of a later generality');
  });

  it('includes a suggested fix inline when the priority carries one', () => {
    const { markdown } = renderCoverageLetter(buildReport());
    assert.match(markdown, /Suggested fix: Give the character a distinct verbal tic\./);
  });

  it('always states the deterministic-analysis disclaimer', () => {
    const { markdown, text } = renderCoverageLetter(buildReport());
    assert.match(markdown, /deterministic read/i);
    assert.match(markdown, /no generative AI wrote or judged/i);
    assert.match(text, /deterministic read/i);
  });

  it('states the percentile caveat only when healthPercentile is present', () => {
    const withPct = renderCoverageLetter(buildReport({ healthPercentile: 42 })).markdown;
    assert.match(withPct, /42(nd|st|rd|th)? percentile/);

    const withoutPct = renderCoverageLetter(buildReport({ healthPercentile: undefined })).markdown;
    assert.ok(!withoutPct.includes('percentile'));
  });

  // ── draftRank (2026-09-04) — second, honest denominator alongside the
  // reference-set percentile: rank among the writer's OWN saved drafts. ──
  it('omitting opts.draftRank renders byte-identically to a call with no draftRank at all', () => {
    const report = buildReport({ healthPercentile: 42 });
    const withoutOpt = renderCoverageLetter(report, { title: 'X' }).markdown;
    const withExplicitUndefined = renderCoverageLetter(report, { title: 'X', draftRank: undefined }).markdown;
    assert.equal(withoutOpt, withExplicitUndefined);
    assert.ok(!withoutOpt.includes('saved draft'), 'no draftRank line when opts.draftRank is absent');
  });

  it('states the draft-rank line beside (not instead of) the reference-set percentile line', () => {
    const { markdown } = renderCoverageLetter(
      buildReport({ healthPercentile: 42 }),
      { title: 'X', draftRank: { rank: 2, of: 5 } },
    );
    // Both denominators present — this is additive, not a replacement.
    assert.match(markdown, /42(nd|st|rd|th)? percentile/);
    assert.match(markdown, /ranks 2nd of 5 by health/);
    assert.match(markdown, /not to the reference set above or to any other writer/i);
  });

  it('renders "first saved draft" copy, not a fabricated rank, when of <= 1', () => {
    const { markdown } = renderCoverageLetter(
      buildReport(),
      { title: 'X', draftRank: { rank: 1, of: 1 } },
    );
    assert.match(markdown, /first saved draft of this script/i);
    // REVIEW FIX (round 2 re-review, 2026-09-05): "your next run or save" —
    // a rank can also become available after simply running the doctor
    // again, not only after explicitly saving a Version; "next save" alone
    // understated it.
    assert.match(markdown, /rank among your own drafts will appear after your next run or save/i);
    assert.doesNotMatch(markdown, /appear after your next save\./i);
    assert.doesNotMatch(markdown, /ranks 1st of 1 by health/);
  });

  it('draftRank line renders even when healthPercentile is absent', () => {
    const { markdown } = renderCoverageLetter(
      buildReport({ healthPercentile: undefined }),
      { title: 'X', draftRank: { rank: 3, of: 4 } },
    );
    assert.ok(!markdown.includes('percentile'));
    assert.match(markdown, /ranks 3rd of 4 by health/);
  });

  // 2026-09-04 (audit round 2) — several byte-identical drafts sharing a
  // health value: a plain ordinal ("ranks 1st of 6") reads as clean
  // separation from the rest of the field, which is false for a dead heat.
  it('draftRank.tied renders "ties for" instead of "ranks"', () => {
    const { markdown } = renderCoverageLetter(
      buildReport({ healthPercentile: 42 }),
      { title: 'X', draftRank: { rank: 1, of: 6, tied: true } },
    );
    assert.match(markdown, /ties for 1st of 6 by health/);
    assert.doesNotMatch(markdown, /ranks 1st of 6 by health/);
  });

  it('draftRank.tied: false (or omitted) renders the ordinary "ranks" wording', () => {
    const explicitFalse = renderCoverageLetter(
      buildReport({ healthPercentile: 42 }),
      { title: 'X', draftRank: { rank: 2, of: 5, tied: false } },
    ).markdown;
    assert.match(explicitFalse, /ranks 2nd of 5 by health/);
    assert.doesNotMatch(explicitFalse, /ties for/);
  });

  // REVIEW FIX (round 2, 2026-09-05) — the letter used to call this number
  // "your own saved drafts", while ScriptDoctorPanel.tsx's DraftRankLine
  // calls the SAME number "runs and saved drafts of this script" right next
  // to it: same number, two different claims about what it is (most of the
  // union is Draft History runs, not saved Versions). Both surfaces now
  // import the SAME src/lib/draft-rank-copy.ts constant — asserted here by
  // reading the actual shared function's return value, not a hardcoded
  // literal, so this test fails if either surface stops using it.
  it('the denominator noun phrase is draftRankDenominatorLabel() verbatim — the SAME shared constant ScriptDoctorPanel.tsx\'s DraftRankLine reads', () => {
    const { markdown } = renderCoverageLetter(
      buildReport({ healthPercentile: 42 }),
      { title: 'X', draftRank: { rank: 2, of: 5 } },
    );
    assert.match(markdown, new RegExp(draftRankDenominatorLabel()));
    assert.doesNotMatch(markdown, /your own saved drafts of this script/);
  });

  // REVIEW FIX (round 2 re-review, 2026-09-05, "return the reason, not just
  // the number") — a bare `of` figure silently drops any saved record with
  // no health at all from the count. When some drafts are ranked and OTHERS
  // are unscored, the letter must say so, the same "N of M ... are
  // unranked" clause the in-panel DraftRankLine renders (both read it off
  // the SAME draftRank object the panel computed).
  it('draftRank.unscored > 0 (mixed ranked + unscored) adds the "N of M ... are unranked" clause', () => {
    const { markdown } = renderCoverageLetter(
      buildReport({ healthPercentile: 42 }),
      { title: 'X', draftRank: { rank: 1, of: 3, unscored: 2 } },
    );
    assert.match(markdown, /ranks 1st of 3 by health/);
    assert.match(markdown, /2 of 5 runs and saved drafts of this script are unranked \(saved without a fresh diagnosis\)/);
  });

  it('draftRank.unscored omitted or 0 adds no unranked clause', () => {
    const omitted = renderCoverageLetter(
      buildReport({ healthPercentile: 42 }),
      { title: 'X', draftRank: { rank: 1, of: 3 } },
    ).markdown;
    assert.doesNotMatch(omitted, /unranked/);
    const explicitZero = renderCoverageLetter(
      buildReport({ healthPercentile: 42 }),
      { title: 'X', draftRank: { rank: 1, of: 3, unscored: 0 } },
    ).markdown;
    assert.doesNotMatch(explicitZero, /unranked/);
  });

  it('states the >40-scene structural-reliability caveat only above the threshold', () => {
    const short = renderCoverageLetter(buildReport({ sceneCount: 40 })).markdown;
    assert.ok(!short.includes('most reliable under'));

    const long = renderCoverageLetter(buildReport({ sceneCount: 55 })).markdown;
    assert.match(long, /This draft has 55 scenes/);
    assert.match(long, /most reliable under ~40 scenes/);
  });

  it('prefers report.provenance.structuralReliabilityNote verbatim over recomputing it locally', () => {
    // Proves buildCaveats is a CONSUMER of the shared field (server/lib/
    // structural-reliability.ts), not an independent computation of the same
    // claim — a distinct sentinel string on provenance must win over whatever
    // computeStructuralReliabilityNote(sceneCount) would have produced.
    const provenance: ReportProvenance = {
      engineCommit: 'abc1234',
      rulebookCount: 3217,
      groundTruthSource: 'mechanical-degradation',
      percentileBasis: 'internal-calibration-corpus-20-samples',
      structuralReliabilityNote: 'SENTINEL — provenance note, not recomputed.',
    };
    const { markdown } = renderCoverageLetter(buildReport({ sceneCount: 55, provenance }));
    assert.match(markdown, /SENTINEL — provenance note, not recomputed\./);
    assert.ok(!markdown.includes('This draft has 55 scenes'), 'must not ALSO recompute its own version');
  });

  it('falls back to computing the structural-reliability note locally when provenance is absent', () => {
    const { markdown } = renderCoverageLetter(buildReport({ sceneCount: 55, provenance: undefined }));
    assert.match(markdown, /This draft has 55 scenes/);
    assert.match(markdown, /most reliable under ~40 scenes/);
  });

  it('publishes the engine commit and rulebook count in the footer only when provenance is present', () => {
    const provenance: ReportProvenance = {
      engineCommit: 'abc1234',
      rulebookCount: 3217,
      groundTruthSource: 'mechanical-degradation',
      percentileBasis: 'internal-calibration-corpus-20-samples',
    };
    const withProvenance = renderCoverageLetter(buildReport({ provenance })).markdown;
    assert.match(withProvenance, /Engine commit: abc1234/);
    assert.match(withProvenance, /Rulebook: 3,217 rule concepts\./);

    const withoutProvenance = renderCoverageLetter(buildReport({ provenance: undefined })).markdown;
    assert.ok(!withoutProvenance.includes('Engine commit:'));
    assert.ok(!withoutProvenance.includes('Rulebook:'));
  });

  it('surfaces excerptNote verbatim when present', () => {
    const note = 'This reads like an excerpt (6 scenes analyzed): treat it as feedback on the pages.';
    const { markdown } = renderCoverageLetter(buildReport({ excerptNote: note }));
    assert.ok(markdown.includes(note));
  });

  it('includes the full content hash and a verify instruction in the footer', () => {
    const report = buildReport();
    const { markdown, text } = renderCoverageLetter(report);
    assert.ok(markdown.includes(report.contentHash!));
    assert.match(markdown, /verify this letter/i);
    assert.match(markdown, /\/api\/export\/verify/);
    assert.ok(text.includes(report.contentHash!));
  });

  it('states the report has no verification hash when contentHash is absent', () => {
    const { markdown } = renderCoverageLetter(buildReport({ contentHash: undefined }));
    assert.match(markdown, /no verification hash/i);
    assert.ok(!markdown.includes('/api/export/verify'));
  });
});

// ── Determinism ───────────────────────────────────────────────────────────────

describe('renderCoverageLetter — determinism', () => {
  it('produces byte-identical markdown and text for the same report and opts, called twice', () => {
    const report = buildReport();
    const a = renderCoverageLetter(report, { title: 'Same Script', author: 'Same Author' });
    const b = renderCoverageLetter(report, { title: 'Same Script', author: 'Same Author' });
    assert.equal(a.markdown, b.markdown);
    assert.equal(a.text, b.text);
  });

  it('is deterministic across a fresh deep-equal report object (not just object identity)', () => {
    const a = renderCoverageLetter(JSON.parse(JSON.stringify(buildReport())) as ScriptDoctorReport, { title: 'X' });
    const b = renderCoverageLetter(JSON.parse(JSON.stringify(buildReport())) as ScriptDoctorReport, { title: 'X' });
    assert.equal(a.markdown, b.markdown);
    assert.equal(a.text, b.text);
  });
});

// ── Snapshot tests against real captured reports ─────────────────────────────
// Fixtures captured from the live app by an earlier discovery session
// (tests/fixtures/coverage-letter/report{1,2}.json — real ScriptDoctorReport
// JSON, not hand-built). Expected letters are committed alongside them; a
// diff here means either the renderer changed (expected — regenerate the
// fixture and review the diff) or the report shape drifted unexpectedly.

function loadReport(name: string): ScriptDoctorReport {
  return JSON.parse(readFileSync(path.join(FIXTURES_DIR, name), 'utf8')) as ScriptDoctorReport;
}

describe('renderCoverageLetter — snapshot against real captured reports', () => {
  it('matches the committed expected letter for report1.json', () => {
    const report = loadReport('report1.json');
    const { markdown } = renderCoverageLetter(report, { title: 'Dead Frequency' });
    const expected = readFileSync(path.join(FIXTURES_DIR, 'report1.expected.md'), 'utf8');
    assert.equal(markdown, expected);
  });

  it('matches the committed expected letter for report2.json', () => {
    const report = loadReport('report2.json');
    const { markdown } = renderCoverageLetter(report, { title: 'Second Sample' });
    const expected = readFileSync(path.join(FIXTURES_DIR, 'report2.expected.md'), 'utf8');
    assert.equal(markdown, expected);
  });

  // report3.json (2026-09-04) — the same real captured report shape as
  // report1/report2, PLUS a structuralSignals block (report1/report2 predate
  // that field and must stay byte-identical to their committed expected
  // letters — proven by the two tests above and the "field absent" test
  // below). Proves the "Shape and rhythm" paragraph renders on a real report
  // shape, not just a hand-built fixture.
  it('matches the committed expected letter for report3.json (carries structuralSignals)', () => {
    const report = loadReport('report3.json');
    assert.ok(report.structuralSignals?.scored, 'fixture must actually carry a scored structuralSignals block');
    const { markdown } = renderCoverageLetter(report, { title: 'Third Sample' });
    const expected = readFileSync(path.join(FIXTURES_DIR, 'report3.expected.md'), 'utf8');
    assert.equal(markdown, expected);
  });

  it('is deterministic on the real captured reports too', () => {
    const report = loadReport('report1.json');
    const a = renderCoverageLetter(report, { title: 'Dead Frequency' });
    const b = renderCoverageLetter(report, { title: 'Dead Frequency' });
    assert.equal(a.markdown, b.markdown);
    assert.equal(a.text, b.text);
  });
});

// ── Shape & rhythm caveat (2026-09-04) ───────────────────────────────────────

describe('renderCoverageLetter — shape and rhythm caveat', () => {
  it('states neither the aggregates nor the "Shape and rhythm" label when structuralSignals is absent', () => {
    const { markdown } = renderCoverageLetter(buildReport({ structuralSignals: undefined }));
    assert.ok(!markdown.includes('Shape and rhythm'));
  });

  it('states neither when structuralSignals is present but unscored (fewer than 2 scenes)', () => {
    const { markdown } = renderCoverageLetter(buildReport({
      structuralSignals: {
        scored: false, sceneCount: 1, scenes: [], sceneLengthCv: 0, meanAbsDialogueShareDelta: 0,
        dialogueShareRange: 0, newPairSceneRate: 0, lastNewPairPosition: 0, meanSpeakersPerScene: 0,
        meanTurnWords: 0, meanLeadShare: 0, leadShareSlope: 0, speakerEntropy: 0,
        actionSentenceCvOverall: 0, meanOpenCloseShift: 0, openCloseModeFlipRate: 0,
      },
    }));
    assert.ok(!markdown.includes('Shape and rhythm'));
  });

  it('names both aggregates, in order, with the "not part of the score" label when scored', () => {
    const report = loadReport('report3.json');
    const { markdown } = renderCoverageLetter(report, { title: 'Third Sample' });
    assert.match(markdown, /Shape and rhythm:/);
    const meanAbsIdx = markdown.indexOf(
      `dialogue\\/action word mix is ${report.structuralSignals!.meanAbsDialogueShareDelta.toFixed(2)}`.replace('\\/', '/'),
    );
    const cvIdx = markdown.indexOf(
      `action lines is ${report.structuralSignals!.actionSentenceCvOverall.toFixed(2)}`,
    );
    assert.ok(meanAbsIdx !== -1, 'must state meanAbsDialogueShareDelta');
    assert.ok(cvIdx !== -1, 'must state actionSentenceCvOverall');
    assert.ok(meanAbsIdx < cvIdx, 'meanAbsDialogueShareDelta must be named before actionSentenceCvOverall');
    assert.match(markdown, /no part of the score, grade, or verdict/);
  });
});

// ── Honesty: every number the letter states traces back to the report ───────

describe('renderCoverageLetter — honesty (no number outruns the report)', () => {
  function assertNumbersAreHonest(report: ScriptDoctorReport, markdown: string) {
    const reportJson = JSON.stringify(report);

    // Health, formatted to one decimal exactly as report.health.toFixed(1).
    const healthMatch = markdown.match(/Health (\d+\.\d)\/100/);
    assert.ok(healthMatch, 'letter must state health');
    assert.equal(healthMatch![1], report.health.toFixed(1));

    // Scene and word counts must equal the report's exactly.
    assert.match(markdown, new RegExp(`${report.sceneCount} scenes?\\b`));
    assert.match(markdown, new RegExp(`${report.wordCount} words?\\b`));

    // Percentile, if stated, must equal Math.round(report.healthPercentile).
    const pctMatch = markdown.match(/ranks in the (\d+)(?:st|nd|rd|th) percentile/);
    if (pctMatch) {
      assert.equal(Number(pctMatch[1]), Math.round(report.healthPercentile as number));
    } else {
      assert.equal(typeof report.healthPercentile, 'undefined');
    }

    // Every "Subsumes N issue(s)" figure must equal some rootCauses[].memberCount.
    const memberCounts = (report.rootCauses ?? []).map(rc => rc.memberCount);
    for (const m of markdown.matchAll(/Subsumes (\d+) issues?\./g)) {
      assert.ok(memberCounts.includes(Number(m[1])), `Subsumes ${m[1]} must match a real rootCause.memberCount`);
    }

    // Every "(Scene N, M)" reference must resolve to real 1-based scene
    // indices from some rootCause.sceneIdxs.
    const allSceneNumbers = new Set(
      (report.rootCauses ?? []).flatMap(rc => rc.sceneIdxs.map(i => i + 1)),
    );
    for (const m of markdown.matchAll(/\(Scenes? ([\d, ]+)\)/g)) {
      for (const n of m[1].split(',').map(s => Number(s.trim()))) {
        assert.ok(allSceneNumbers.has(n), `Scene ${n} referenced in a root cause must be a real sceneIdx+1`);
      }
    }

    // Page/runtime estimate, if present, must equal report.pageEstimate.
    const pageMatch = markdown.match(/~(\d+) pages? \/ ~(\d+) min/);
    if (pageMatch) {
      assert.equal(Number(pageMatch[1]), report.pageEstimate!.pages);
      assert.equal(Number(pageMatch[2]), report.pageEstimate!.runtimeMinutes);
    } else {
      assert.equal(report.pageEstimate, undefined);
    }

    // Sanity: nothing above was silently skipped because the report string
    // never even mentions the shared vocabulary these regexes look for.
    assert.ok(reportJson.length > 0);
  }

  it('holds for a hand-built fixture with root causes, percentile, and page estimate', () => {
    const report = buildReport({
      healthPercentile: 77,
      pageEstimate: { pages: 12, runtimeMinutes: 12, basis: 'lines' },
    });
    const { markdown } = renderCoverageLetter(report, { title: 'Honesty Check' });
    assertNumbersAreHonest(report, markdown);
  });

  it('holds for both real captured reports', () => {
    for (const name of ['report1.json', 'report2.json']) {
      const report = loadReport(name);
      const { markdown } = renderCoverageLetter(report, { title: name });
      assertNumbersAreHonest(report, markdown);
    }
  });
});
