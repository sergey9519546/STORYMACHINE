// Script Doctor — tests for the aggregation layer (doctor.ts) that runs the
// analyzer + all 14 revision passes in diagnose-only mode and rolls the
// result up into a ScriptDoctorReport.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import {
  runScriptDoctor, computeHealthScore, gradeForHealth, verdictFor, buildStrengths,
  computeDimensionScore, computeDimensionRawScore, aggregateReport, clearDoctorCache,
} from '../../server/nvm/analyze/doctor.ts';
import { runDiagnoseOnly, rewritePass } from '../../server/nvm/revision/rewrite.ts';
import { setLLMProvider, resetLLMProvider } from '../../server/engine/ai.ts';
import { REFERENCE_CORPUS } from '../../server/nvm/analyze/calibration/corpus.ts';
import type { DimensionKey, DimensionScore, FountainAnalysis } from '../../server/nvm/analyze/types.ts';
import type { StructureState } from '../../server/nvm/screenplay/structure.ts';
import type { ScreenplaySceneRecord } from '../../server/nvm/screenplay/memory.ts';
import type { RevisionResult } from '../../server/nvm/revision/pipeline.ts';
import type { PassResult, RevisionIssue } from '../../server/nvm/revision/passes/types.ts';

const PASS_ORDER = [
  'structure', 'causality', 'intention', 'belief', 'conflict', 'character-arc', 'dialogue',
  'rhythm', 'pacing', 'originality', 'payoff', 'voice', 'theme', 'relationship-arc',
];

/** A reasonably rich 10-scene fountain — enough dialogue, danger lexicon,
 *  deadline mentions, and character interplay for the 14 passes to have real
 *  material to diagnose, without needing to assert on exact issue counts. */
function buildMultiSceneFountain(): string {
  return [
    'INT. APARTMENT - DAY',
    '',
    'Maya stares out the window, waiting for news.',
    '',
    'MAYA',
    'I hope everything turns out fine.',
    '',
    'INT. PRECINCT - DAY',
    '',
    'Detective Cole reviews the case file at his desk.',
    '',
    'COLE',
    "Something here doesn't add up.",
    '',
    'INT. WAREHOUSE - NIGHT',
    '',
    'A gun. Blood on the floor. Someone runs! Screams echo through the dark warehouse.',
    '',
    'COLE',
    'Run! Now! Hurry!',
    '',
    'INT. PRECINCT - NIGHT',
    '',
    'The clock reads five minutes to midnight. The deadline is closing in.',
    '',
    'MAYA',
    'We are running out of time.',
    '',
    'INT. ALLEY - NIGHT',
    '',
    'A hidden note reveals the truth. It was you all along.',
    '',
    'COLE',
    'I knew it.',
    '',
    'INT. APARTMENT - NIGHT',
    '',
    'MAYA',
    'I trust you completely, and I love how kind you have been.',
    '',
    'COLE',
    "I'm so grateful and happy too.",
    '',
    'INT. ROOFTOP - NIGHT',
    '',
    'The city lights spread out below them.',
    '',
    'MAYA',
    'What happens now?',
    '',
    'INT. PRECINCT - DAY',
    '',
    'Cole files the closed case.',
    '',
    'COLE',
    'Case closed.',
    '',
    'INT. APARTMENT - DAY',
    '',
    'Maya and Cole share a quiet, calm morning.',
    '',
    'MAYA',
    'It is finally over.',
    '',
    'EXT. PARK - DAY',
    '',
    'They walk together into the sunlight.',
    '',
    'COLE',
    'A fresh start.',
  ].join('\n');
}

describe('runScriptDoctor — report shape', () => {
  it('includes all 14 passes in pipeline order, with health/grade consistent', async () => {
    const report = await runScriptDoctor(buildMultiSceneFountain());

    assert.equal(report.passes.length, 14, 'all 14 passes must be present, including zero-issue passes');
    assert.deepEqual(report.passes.map(p => p.pass), PASS_ORDER);

    assert.ok(report.health >= 0 && report.health <= 100, `health out of range: ${report.health}`);
    assert.equal(report.grade, gradeForHealth(report.health), 'grade must match the health->grade mapping');

    assert.equal(report.sceneCount, 10);
    assert.ok(report.wordCount > 0);
    assert.ok(Array.isArray(report.characters));
    assert.ok(report.characters.includes('MAYA'));
    assert.ok(report.characters.includes('COLE'));
    // The heatmap is a complete positional strip: exactly one cell per scene,
    // in scene order, with zero-issue scenes present as healthy (0-count)
    // cells rather than gaps — the panel indexes into it positionally.
    assert.equal(report.sceneHeatmap.length, report.sceneCount,
      'heatmap must contain every scene, including zero-issue scenes');
    report.sceneHeatmap.forEach((cell, i) => {
      assert.equal(cell.sceneIdx, i, 'heatmap must be sorted by sceneIdx with no gaps');
      assert.equal(cell.issueCount, cell.critical + cell.major + cell.minor,
        'per-cell severity counts must reconcile with issueCount');
    });
    assert.ok(Array.isArray(report.topPriorities));
    assert.ok(report.topPriorities.length <= 10);
    assert.ok(report.structure, 'structure must be present');

    // bySeverity must reconcile with totalIssues and with the per-pass sums.
    const summedFromPasses = report.passes.reduce((s, p) => s + p.critical + p.major + p.minor, 0);
    assert.equal(summedFromPasses, report.totalIssues);
    assert.equal(
      report.bySeverity.critical + report.bySeverity.major + report.bySeverity.minor,
      report.totalIssues,
    );

    // topPriorities ordering: critical > major > minor, each tagged with its pass.
    for (let i = 1; i < report.topPriorities.length; i++) {
      const rank = (s: string) => (s === 'critical' ? 0 : s === 'major' ? 1 : 2);
      assert.ok(rank(report.topPriorities[i - 1].severity) <= rank(report.topPriorities[i].severity));
    }
    for (const tp of report.topPriorities) {
      assert.ok(PASS_ORDER.includes(tp.pass), `topPriorities entry tagged with unknown pass: ${tp.pass}`);
    }
  });

  it('returns a well-formed troubled/zero report for whitespace-only input', async () => {
    const report = await runScriptDoctor('   \n\n  \t  ');
    assert.equal(report.health, 0);
    assert.equal(report.grade, 'troubled');
    assert.equal(report.totalIssues, 0);
    assert.deepEqual(report.passes, []);
    assert.deepEqual(report.sceneHeatmap, []);
    assert.deepEqual(report.topPriorities, []);
    assert.equal(report.sceneCount, 0);
    assert.equal(report.wordCount, 0);
    assert.deepEqual(report.bySeverity, { critical: 0, major: 0, minor: 0 });
  });
});

describe('runScriptDoctor — diagnose-only guarantee', () => {
  it('resolves without invoking the LLM even with a throwing provider installed', async () => {
    // Belt-and-suspenders: install a provider that throws if ever invoked.
    // (rewritePass's LLM call goes through ai.geminiProvider directly rather
    // than the ai._provider seam this swaps, so the real guarantee under test
    // is runDiagnoseOnly's isDiagnoseOnly() short-circuit below — this mock
    // is a regression trip-wire in case that wiring ever changes.)
    setLLMProvider({
      generate: async () => { throw new Error('LLM must not be invoked in diagnose-only mode'); },
    });
    try {
      const fountain = buildMultiSceneFountain();
      const report = await runScriptDoctor(fountain);
      assert.equal(report.passes.length, 14);
      assert.ok(report.health >= 0 && report.health <= 100);
    } finally {
      resetLLMProvider();
    }
  });

  it('rewritePass returns the fountain unchanged under runDiagnoseOnly, regardless of issues found', async () => {
    // Direct proof of the Deliverable-2 contract: ScriptDoctorReport has no
    // field exposing whether a pass changed the text (by design — it's a
    // diagnostic report, not a rewrite result), so we verify the guarantee at
    // its source by calling rewritePass() directly inside the same scope
    // doctor.ts wraps the whole pipeline in.
    const fountain = 'INT. ROOM - DAY\n\nSomething happens.';
    const dummyIssue = {
      location: 'Scene 0',
      rule: 'TEST_RULE',
      description: 'test issue',
      severity: 'critical' as const,
    };
    const result = await runDiagnoseOnly(() =>
      rewritePass({ fountain, issues: [dummyIssue], passName: 'dialogue', approvedSpans: [] }),
    );
    assert.equal(result.revised, fountain);
    assert.equal(result.usedLLM, false);
  });
});

describe('computeHealthScore / gradeForHealth — formula spot-check', () => {
  // Post-saturation-fix formula (doctor.ts's craftPenalty):
  //   penalty = DENSITY_SCALE * (weightedIssues / wordCount^WORD_COUNT_EXPONENT)^DENSITY_POWER
  //           + SCARCITY_SCALE / sceneCount
  // with DENSITY_SCALE=2.5, WORD_COUNT_EXPONENT=0.7, DENSITY_POWER=3.75,
  // SCARCITY_SCALE=140 (doctor.ts). The exponents are irrational-ish tuned
  // constants (see doctor.ts's craftPenalty comment for the empirical
  // rationale), so — like the prior formula's spot-checks — these assert
  // against the ROUNDED displayed value rather than hand-expanded arithmetic;
  // computeHealthScore itself is the single source of truth for the formula.
  it('matches the documented formula for a known issue count', () => {
    // weightedIssues = 4*1 + 1.5*2 + 0.5*3 = 8.5; sceneCount=10, wordCount=300.
    const health = computeHealthScore({ critical: 1, major: 2, minor: 3 }, 10, 300);
    assert.equal(health, 86);
    assert.equal(gradeForHealth(health), 'strong');
  });

  it('approaches, but does not necessarily hit, 100 for zero issues at a well-evidenced scene count', () => {
    // Zero issues still carries a small scarcityPenalty (SCARCITY_SCALE /
    // sceneCount = 140/25 = 5.6) — a deliberate residual (see doctor.ts's
    // craftPenalty comment): a report is never "0 issues, therefore
    // literally 100" purely from a big denominator, it's the scarcity
    // correction fading toward (not to) zero as scenes accumulate.
    const health = computeHealthScore({ critical: 0, major: 0, minor: 0 }, 25, 2000);
    assert.equal(health, 94.4);
    assert.equal(gradeForHealth(health), 'excellent');
  });

  it('does NOT return 100 for zero issues at a tiny scene/word count — small-script sanity', () => {
    // The defect this fix targets in the other direction: a 4-scene, 80-word
    // fixture that happens to have zero issues must not read as a proven
    // "excellent" script — there wasn't enough material for most of the
    // pipeline's structural checks to have had a fair chance to fire.
    // scarcityPenalty (140/4 = 35) keeps even a clean tiny script in a
    // plausible mid band instead of at the ceiling.
    const health = computeHealthScore({ critical: 0, major: 0, minor: 0 }, 4, 80);
    assert.equal(health, 65);
    assert.equal(gradeForHealth(health), 'solid');
  });

  it('clamps to 0 when the penalty would exceed 100', () => {
    const health = computeHealthScore({ critical: 10, major: 10, minor: 10 }, 5, 50);
    assert.equal(health, 0);
    assert.equal(gradeForHealth(health), 'troubled');
  });
});

// ── Coverage layer ────────────────────────────────────────────────────────────
// verdict / dimensions / strengths / plainSummary — the industry-coverage
// surface added on top of the raw health/passes rollup above.

const DIMENSION_CONTRACT_ORDER: Array<{ key: DimensionKey; label: string }> = [
  { key: 'structure-pacing', label: 'Structure & Pacing' },
  { key: 'character', label: 'Character' },
  { key: 'dialogue-voice', label: 'Dialogue & Voice' },
  { key: 'plot-logic', label: 'Plot Logic & Payoff' },
  { key: 'theme-originality', label: 'Theme & Originality' },
];

/** All 14 passes, exactly once each, across the 5 fixed dimensions. */
const DIMENSION_PASS_MAP: Record<DimensionKey, string[]> = {
  'structure-pacing': ['structure', 'pacing', 'rhythm'],
  character: ['character-arc', 'intention', 'relationship-arc'],
  'dialogue-voice': ['dialogue', 'voice'],
  'plot-logic': ['causality', 'belief', 'payoff', 'conflict'],
  'theme-originality': ['theme', 'originality'],
};

function baseStructureState(overrides: Partial<StructureState> = {}): StructureState {
  return {
    actPosition: 'act2a',
    completionPercent: 40,
    avgSuspensePerScene: 1,
    escalating: false,
    reversalCount: 0,
    reversalDensity: 0,
    approachingClimax: false,
    openClues: 0,
    revelationCount: 0,
    midpointPressure: 0,
    tightestScene: null,
    ...overrides,
  };
}

/** DimensionScore fixtures for buildStrengths, one per contract dimension,
 *  with caller-supplied issueCounts (index-aligned to DIMENSION_CONTRACT_ORDER). */
function buildDimensionFixtures(issueCounts: number[]): DimensionScore[] {
  return DIMENSION_CONTRACT_ORDER.map((d, i) => ({
    key: d.key,
    label: d.label,
    passes: DIMENSION_PASS_MAP[d.key] as DimensionScore['passes'],
    score: issueCounts[i] === 0 ? 100 : 50,
    issueCount: issueCounts[i],
    summary: 'fixture summary — not under test here',
  }));
}

describe('runScriptDoctor — dimensions', () => {
  it('reports exactly 5 dimensions, in contract order, covering all 14 passes exactly once', async () => {
    const report = await runScriptDoctor(buildMultiSceneFountain());
    assert.ok(report.dimensions, 'dimensions must be populated on a non-degenerate report');
    const dimensions = report.dimensions!;

    assert.equal(dimensions.length, 5);
    assert.deepEqual(dimensions.map(d => d.key), DIMENSION_CONTRACT_ORDER.map(d => d.key));
    assert.deepEqual(dimensions.map(d => d.label), DIMENSION_CONTRACT_ORDER.map(d => d.label));

    const allMappedPasses = dimensions.flatMap(d => d.passes);
    assert.deepEqual(
      [...allMappedPasses].sort(),
      [...PASS_ORDER].sort(),
      'every one of the 14 passes must appear in exactly one dimension, with no gaps or overlaps',
    );
    assert.equal(new Set(allMappedPasses).size, 14, 'no pass may be double-mapped into two dimensions');

    for (const dim of dimensions) {
      assert.deepEqual(dim.passes, DIMENSION_PASS_MAP[dim.key], `unexpected pass list for dimension ${dim.key}`);

      // Per-dimension issueCount must reconcile with the sum of the matching
      // passes' issue counts in the report's own per-pass rollup.
      const expectedIssueCount = report.passes
        .filter(p => dim.passes.includes(p.pass))
        .reduce((s, p) => s + p.issues.length, 0);
      assert.equal(dim.issueCount, expectedIssueCount, `issueCount mismatch for dimension ${dim.key}`);

      assert.ok(dim.score >= 0 && dim.score <= 100, `dimension ${dim.key} score out of range: ${dim.score}`);
      assert.ok(dim.summary.length > 0, `dimension ${dim.key} must have a non-empty summary`);

      // No pass's ALL_CAPS rule constant may leak verbatim into the
      // writer-facing summary sentence.
      const dimRules = report.passes
        .filter(p => dim.passes.includes(p.pass))
        .flatMap(p => p.issues.map(i => i.rule));
      for (const rule of dimRules) {
        assert.ok(!dim.summary.includes(rule), `dimension summary leaked raw rule token "${rule}"`);
      }
    }
  });
});

describe('verdictFor — boundary mapping', () => {
  it('RECOMMENDs only at health >= 85 AND sceneCount >= 8 (both boundaries inclusive)', () => {
    assert.equal(verdictFor(85, 8), 'RECOMMEND');
    assert.equal(verdictFor(100, 30), 'RECOMMEND');
  });

  it('falls back to CONSIDER just below either RECOMMEND boundary', () => {
    assert.equal(verdictFor(84.9, 8), 'CONSIDER', 'health just under 85 must not RECOMMEND');
    assert.equal(verdictFor(85, 7), 'CONSIDER', 'sceneCount just under 8 must not RECOMMEND');
  });

  it('caps a short-but-healthy script at CONSIDER — high health alone is not enough', () => {
    // The exact scenario called out in the contract comment: a 3-scene
    // fragment scoring 95 is too short a sample to fully judge, so it's
    // capped at CONSIDER rather than RECOMMEND.
    assert.equal(verdictFor(95, 3), 'CONSIDER');
  });

  it('PASSes below health 60 regardless of sceneCount', () => {
    assert.equal(verdictFor(59.9, 100), 'PASS');
    assert.equal(verdictFor(0, 0), 'PASS');
  });

  it('CONSIDERs the health===60 boundary (not PASS) and mid-health scripts generally', () => {
    assert.equal(verdictFor(60, 1), 'CONSIDER');
    assert.equal(verdictFor(70, 20), 'CONSIDER');
  });
});

describe('buildStrengths — earned, never-padded bullets', () => {
  it('fire case: each guard fires exactly once when its evidence is genuinely present', () => {
    const strengths = buildStrengths({
      structure: baseStructureState({ escalating: true, openClues: 0 }),
      anyClueSeeded: true,
      sceneCount: 10,
      bySeverity: { critical: 0, major: 3, minor: 5 },
      // Only the first dimension is clean — isolates the "zero-issue
      // dimension" guard to firing exactly once, not once-per-dimension.
      dimensions: buildDimensionFixtures([0, 2, 3, 4, 5]),
    });

    assert.deepEqual(strengths, [
      'Nothing to fix in Structure & Pacing — clean across all 10 scene(s).',
      'Tension genuinely builds as the story goes — the back half reads more intensely than the front half, not less.',
      'Every clue planted in this draft gets paid off — nothing is left dangling by the end.',
      'No fatal flaws surfaced across 10 scenes — nothing here would sink the draft outright.',
    ]);
  });

  it('no-fire case: nothing is padded in when no guard has genuine evidence', () => {
    const strengths = buildStrengths({
      structure: baseStructureState({ escalating: false, openClues: 3 }),
      anyClueSeeded: true,
      sceneCount: 3, // below the >= 5 no-fatal-flaws floor
      bySeverity: { critical: 0, major: 1, minor: 0 },
      dimensions: buildDimensionFixtures([1, 1, 1, 1, 1]), // no dimension is clean
    });

    assert.deepEqual(strengths, []);
  });

  it('the setup/payoff strength requires an actual seeded clue, not just openClues === 0', () => {
    // A script that never planted anything trivially has openClues === 0 —
    // that must NOT read as "every setup pays off" (there were no setups).
    const strengths = buildStrengths({
      structure: baseStructureState({ escalating: false, openClues: 0 }),
      anyClueSeeded: false,
      sceneCount: 10,
      bySeverity: { critical: 1, major: 0, minor: 0 },
      dimensions: buildDimensionFixtures([1, 1, 1, 1, 1]),
    });

    assert.ok(
      !strengths.some(s => s.includes('gets paid off')),
      'must not claim payoff completeness when nothing was ever seeded',
    );
  });
});

// ── Wave 1183 (Program v2, Type 2 — excellence detectors) ────────────────────
// Three new buildStrengths guards, added additively via StrengthsInput.records
// (see doctor.ts's Wave 1183 header comment for placement/distinctness
// rationale): sustained stakes (clockRaised in both halves), relationship
// dynamism (a rupture-then-repair for the same character pair), and emotional
// range (both valence directions present, landing deliberately positive).

/** Substrings unique to each Wave 1183 strength template — used only to
 *  detect WHICH guard fired without depending on exact scene numbers/wording,
 *  so corpus-level assertions below stay robust to phrasing tweaks. */
const WAVE_1183_MARKERS = [
  "isn't set once and forgotten",       // buildStakesContinuityStrength
  'living thread, not a flat one',      // buildRelationshipDynamismStrength
  'earns its ending rather than coasting', // buildEmotionalRangeStrength
] as const;

/** Minimal ScreenplaySceneRecord fixture factory — every field defaulted to
 *  "nothing happened this scene" so a test only needs to override the one or
 *  two fields its guard actually reads, matching this file's existing
 *  baseStructureState/buildDimensionFixtures precedent. */
function buildSceneRecord(sceneIdx: number, overrides: Partial<ScreenplaySceneRecord> = {}): ScreenplaySceneRecord {
  return {
    commitId: `fixture-scene-${sceneIdx}`,
    sceneIdx,
    slug: `INT. FIXTURE - SCENE ${sceneIdx + 1}`,
    purpose: 'complicate',
    dramaticTurn: '',
    revelation: null,
    emotionalShift: 'neutral',
    visualBeats: [],
    dialogueHighlights: [],
    unresolvedClues: [],
    seededClueIds: [],
    payoffSetupIds: [],
    clockRaised: false,
    clockDelta: 0,
    suspenseDelta: 0,
    curiosityDelta: 0,
    relationshipShifts: [],
    createdAt: sceneIdx,
    ...overrides,
  };
}

function buildSceneRecords(
  sceneCount: number, overridesByIdx: Record<number, Partial<ScreenplaySceneRecord>> = {},
): ScreenplaySceneRecord[] {
  return Array.from({ length: sceneCount }, (_, i) => buildSceneRecord(i, overridesByIdx[i]));
}

/** buildStrengths input shared by every Wave 1183 fixture test below: no
 *  other guard has genuine evidence, so a fired strength can only be one of
 *  the three new ones under test — isolates each assertion the same way the
 *  pre-existing "no-fire case" fixture above does. */
function baseStrengthsInputFor(records: ScreenplaySceneRecord[]) {
  return {
    structure: baseStructureState({ escalating: false, openClues: 3 }),
    anyClueSeeded: false,
    sceneCount: records.length,
    bySeverity: { critical: 1, major: 0, minor: 0 },
    dimensions: buildDimensionFixtures([1, 1, 1, 1, 1]),
    records,
  };
}

describe('buildStrengths — Wave 1183 excellence detectors (hand-built fixtures)', () => {
  it('stakes continuity FIRE: clock raised in both halves names both scenes', () => {
    const records = buildSceneRecords(8, {
      1: { clockRaised: true },
      6: { clockRaised: true },
    });
    const strengths = buildStrengths(baseStrengthsInputFor(records));

    assert.ok(
      strengths.some(s => s.includes("isn't set once and forgotten") && s.includes('Scene 1') && s.includes('Scene 6')),
      `expected the stakes-continuity strength naming Scene 1 and Scene 6, got: ${JSON.stringify(strengths)}`,
    );
  });

  it('stakes continuity NO-FIRE: a competent-but-unremarkable clock raised only once never fires', () => {
    // Mirrors the corpus's own 'competent'/'weak' pattern: the deadline is
    // stated once and never returned to — real craft elsewhere, just not
    // sustained stakes. Not broken, just unremarkable on this one axis.
    const records = buildSceneRecords(8, { 1: { clockRaised: true } });
    const strengths = buildStrengths(baseStrengthsInputFor(records));

    assert.ok(
      !strengths.some(s => s.includes("isn't set once and forgotten")),
      `stakes-continuity must not fire on a single first-half-only clock mention, got: ${JSON.stringify(strengths)}`,
    );
  });

  it('relationship dynamism FIRE: a rupture followed 6 scenes later by a repair names both scenes and the pair', () => {
    const records = buildSceneRecords(8, {
      1: { relationshipShifts: [{ pairKey: 'ALEX|JORDAN', dimension: 'trust', amount: -3 }] },
      7: { relationshipShifts: [{ pairKey: 'ALEX|JORDAN', dimension: 'trust', amount: 2 }] },
    });
    const strengths = buildStrengths(baseStrengthsInputFor(records));

    assert.ok(
      strengths.some(s =>
        s.includes('living thread, not a flat one') && s.includes('ALEX/JORDAN') &&
        s.includes('Scene 1') && s.includes('Scene 7')),
      `expected the relationship-dynamism strength naming ALEX/JORDAN, Scene 1 and Scene 7, got: ${JSON.stringify(strengths)}`,
    );
  });

  it('relationship dynamism NO-FIRE: a rupture with no later repair for the same pair never fires', () => {
    // Mirrors the corpus's 'competent' design note: a real rupture, but the
    // Act 3 beat is a thin acknowledgment that never actually reverses it —
    // competent-but-unremarkable, not a broken relationship-arc pass.
    const records = buildSceneRecords(8, {
      1: { relationshipShifts: [{ pairKey: 'ALEX|JORDAN', dimension: 'trust', amount: -3 }] },
    });
    const strengths = buildStrengths(baseStrengthsInputFor(records));

    assert.ok(
      !strengths.some(s => s.includes('living thread, not a flat one')),
      `relationship-dynamism must not fire on a rupture with no qualifying repair, got: ${JSON.stringify(strengths)}`,
    );
  });

  it('emotional range FIRE: a negative scene followed by a positive final scene names both scenes', () => {
    const records = buildSceneRecords(8, {
      2: { emotionalShift: 'negative' },
      7: { emotionalShift: 'positive' },
    });
    const strengths = buildStrengths(baseStrengthsInputFor(records));

    assert.ok(
      strengths.some(s =>
        s.includes('earns its ending rather than coasting') && s.includes('Scene 2') && s.includes('Scene 7')),
      `expected the emotional-range strength naming Scene 2 and Scene 7, got: ${JSON.stringify(strengths)}`,
    );
  });

  it('emotional range NO-FIRE: a negative scene with no positive scene anywhere never fires', () => {
    // Mirrors the corpus's 'competent' pattern (Reasonable Doubt, Thanksgiving,
    // Maybe): real negative-valence craft, but the draft never earns a
    // genuine positive swing anywhere, including at the close.
    const records = buildSceneRecords(8, { 2: { emotionalShift: 'negative' } });
    const strengths = buildStrengths(baseStrengthsInputFor(records));

    assert.ok(
      !strengths.some(s => s.includes('earns its ending rather than coasting')),
      `emotional-range must not fire on a negative-only draft with no positive scene anywhere, got: ${JSON.stringify(strengths)}`,
    );
  });
});

describe('runScriptDoctor — Wave 1183 excellence detectors against the real reference corpus', () => {
  it('at least one new detector fires somewhere across the 5 strong-band samples', async () => {
    const strongReports = await Promise.all(
      REFERENCE_CORPUS.filter(s => s.band === 'strong').map(s => runScriptDoctor(s.fountain)),
    );
    const anyFired = strongReports.some(r => (r.strengths ?? []).some(s => WAVE_1183_MARKERS.some(m => s.includes(m))));
    assert.ok(
      anyFired,
      `expected at least one Wave 1183 strength somewhere in the strong band, got: ` +
        `${JSON.stringify(strongReports.map(r => r.strengths))}`,
    );
  });

  it('never-padded proof: no Wave 1183 detector fires on any competent-band sample', async () => {
    const competentReports = await Promise.all(
      REFERENCE_CORPUS.filter(s => s.band === 'competent').map(async s => ({
        label: s.label, report: await runScriptDoctor(s.fountain),
      })),
    );
    for (const { label, report } of competentReports) {
      const fired = WAVE_1183_MARKERS.filter(m => (report.strengths ?? []).some(s => s.includes(m)));
      assert.deepEqual(
        fired, [],
        `Wave 1183 detector(s) [${fired.join(', ')}] false-fired on competent-band sample "${label}" — ` +
          `the competent band is deliberately competent-but-unremarkable, never broken; a fire here means the ` +
          `guard is padded.`,
      );
    }
  });
});

describe('Wave 1183 — calibration-drift guard (strengths must never leak into scoring)', () => {
  it('health stays a pure function of bySeverity/sceneCount/wordCount across the whole corpus, regardless of which (if any) Wave 1183 strengths fired', async () => {
    let sawAWave1183Strength = false;
    for (const sample of REFERENCE_CORPUS) {
      const report = await runScriptDoctor(sample.fountain);
      if ((report.strengths ?? []).some(s => WAVE_1183_MARKERS.some(m => s.includes(m)))) sawAWave1183Strength = true;

      const expectedHealth = computeHealthScore(report.bySeverity, report.sceneCount, report.wordCount);
      assert.equal(
        report.health, expectedHealth,
        `${sample.label}: health must equal computeHealthScore(bySeverity, sceneCount, wordCount) exactly — ` +
          `strengths (a separate, downstream field) must never be able to move it`,
      );
    }
    assert.ok(
      sawAWave1183Strength,
      'expected at least one corpus sample to carry a Wave 1183 strength — otherwise this guard would be vacuous',
    );
  });
});

// ── Wave 1187 (Program v2, Type 2 — excellence detectors, opening cycle 2) ──
// Three more buildStrengths guards, added additively over the same
// StrengthsInput.records seam Wave 1183 introduced (see doctor.ts's Wave 1187
// header comment for placement/distinctness/rejection rationale): scene-
// purpose variety (>=6 distinct ScenePurpose values, no single one >50%),
// suspense shaping (a genuine closing-quarter suspense peak that tops every
// earlier quarter's average, off a real opening baseline), and dramatic-turn
// density (>=2 named dramaticTurn scenes in BOTH the front and back half).

/** Substrings unique to each Wave 1187 strength template — same
 *  phrasing-independent detection convention as WAVE_1183_MARKERS above. */
const WAVE_1187_MARKERS = [
  "doesn't lean on one narrative gear", // buildScenePurposeVarietyStrength
  'genuine peak late in the draft',     // buildSuspenseShapingStrength
  'keeps generating real turns',        // buildDramaticTurnDensityStrength
] as const;

// ── Run 20 (excellence sprint) — cold-open hook, climax placement, acceleration ──
// Fixture evidence for the never-padded prime directive: the calibration
// corpus sits under these detectors' scene floors (structurally exempt), so
// fire + no-fire proof lives here. Real-corpus fire rates at introduction:
// acceleration 17/69, cold-open 13/69, climax 7/69 (see doctor.ts header).

describe('buildStrengths — Run 20 excellence detectors (hand-built fixtures)', () => {
  it('cold-open FIRE: first scene turns + first-quarter clock', () => {
    const records = buildSceneRecords(12, {
      0: { suspenseDelta: 2, dramaticTurn: 'the body is found' },
      2: { clockRaised: true, clockDelta: 1 },
    });
    const strengths = buildStrengths(baseStrengthsInputFor(records));
    assert.ok(strengths.some(s => s.includes('opening earns attention immediately')),
      `expected cold-open strength; got: ${strengths.join(' | ')}`);
  });

  it('cold-open NO-FIRE: first scene moves but no first-quarter stakes (competent, unremarkable)', () => {
    const records = buildSceneRecords(12, {
      0: { suspenseDelta: 2, dramaticTurn: 'the body is found' },
      8: { clockRaised: true }, // stakes arrive, but late — the OPENING did not earn it
    });
    const strengths = buildStrengths(baseStrengthsInputFor(records));
    assert.ok(!strengths.some(s => s.includes('opening earns attention immediately')),
      'late stakes must not earn a cold-open claim');
  });

  it('climax placement FIRE: peak intensity in the final 30%, last quarter outweighs first', () => {
    const records = buildSceneRecords(12, {
      1: { suspenseDelta: 1 },
      9: { suspenseDelta: 3, clockDelta: 2, dramaticTurn: 'everything breaks' },
      10: { suspenseDelta: 2 },
      11: { suspenseDelta: 2, dramaticTurn: 'the answer lands' },
    });
    const strengths = buildStrengths(baseStrengthsInputFor(records));
    assert.ok(strengths.some(s => s.includes('climax is where it belongs')),
      `expected climax-placement strength; got: ${strengths.join(' | ')}`);
  });

  it('climax placement NO-FIRE: draft peaks early (front-loaded intensity)', () => {
    const records = buildSceneRecords(12, {
      1: { suspenseDelta: 4, clockDelta: 2, dramaticTurn: 'everything breaks' },
      2: { suspenseDelta: 3 },
      10: { suspenseDelta: 1 },
    });
    const strengths = buildStrengths(baseStrengthsInputFor(records));
    assert.ok(!strengths.some(s => s.includes('climax is where it belongs')),
      'a front-loaded draft must not earn the climax-placement claim');
  });

  it('acceleration FIRE: final-quarter scenes measurably tighter than the opening', () => {
    const longScene = (i: number) => `INT. SC${i} - DAY\n\n${'word '.repeat(120).trim()}\n\n`;
    const shortScene = (i: number) => `INT. SC${i} - DAY\n\n${'word '.repeat(30).trim()}\n\n`;
    const fountain =
      Array.from({ length: 8 }, (_, i) => longScene(i)).join('') +
      Array.from({ length: 8 }, (_, i) => shortScene(8 + i)).join('');
    const records = buildSceneRecords(16);
    const strengths = buildStrengths({ ...baseStrengthsInputFor(records), fountain });
    assert.ok(strengths.some(s => s.includes('cutting accelerates')),
      `expected acceleration strength; got: ${strengths.join(' | ')}`);
  });

  it('acceleration NO-FIRE: uniform scene lengths, and silently absent without fountain', () => {
    const uniform = Array.from({ length: 16 }, (_, i) => `INT. SC${i} - DAY\n\n${'word '.repeat(60).trim()}\n\n`).join('');
    const records = buildSceneRecords(16);
    const withUniform = buildStrengths({ ...baseStrengthsInputFor(records), fountain: uniform });
    assert.ok(!withUniform.some(s => s.includes('cutting accelerates')),
      'flat pacing must not earn the acceleration claim');
    const withoutFountain = buildStrengths(baseStrengthsInputFor(records));
    assert.ok(!withoutFountain.some(s => s.includes('cutting accelerates')),
      'no fountain provided -> detector must silently no-fire, never throw');
  });
});

describe('buildStrengths — Wave 1187 excellence detectors (hand-built fixtures)', () => {
  it('scene-purpose variety FIRE: 8 distinct purposes with no dominant one names the count and the top purpose', () => {
    const records = buildSceneRecords(8, {
      0: { purpose: 'establish_world' },
      1: { purpose: 'introduce_conflict' },
      2: { purpose: 'complicate' },
      3: { purpose: 'raise_stakes' },
      4: { purpose: 'revelation' },
      5: { purpose: 'turning_point' },
      6: { purpose: 'climax' },
      7: { purpose: 'resolution' },
    });
    const strengths = buildStrengths(baseStrengthsInputFor(records));

    assert.ok(
      strengths.some(s =>
        s.includes("doesn't lean on one narrative gear") && s.includes('8 distinct scene functions') &&
        s.includes('establish world')),
      `expected the scene-purpose-variety strength naming 8 distinct functions and the top purpose, got: ${JSON.stringify(strengths)}`,
    );
  });

  it('scene-purpose variety NO-FIRE: 6 distinct purposes but one dominating over half the scenes never fires', () => {
    // Mirrors the corpus's 'competent'/'weak' pattern: real variety on paper
    // (6 distinct purposes present), but a single purpose (complicate) still
    // runs the show at 7/12 = 58% of scenes — not a genuinely varied draft.
    const records = buildSceneRecords(12, {
      0: { purpose: 'establish_world' },
      1: { purpose: 'raise_stakes' },
      2: { purpose: 'revelation' },
      3: { purpose: 'climax' },
      4: { purpose: 'resolution' },
      // idx 5-11 (7 scenes) keep the buildSceneRecord default purpose 'complicate'.
    });
    const strengths = buildStrengths(baseStrengthsInputFor(records));

    assert.ok(
      !strengths.some(s => s.includes("doesn't lean on one narrative gear")),
      `scene-purpose-variety must not fire when one purpose dominates over half the scenes, got: ${JSON.stringify(strengths)}`,
    );
  });

  it('suspense shaping FIRE: a closing-quarter peak that tops every earlier quarter average names both scenes', () => {
    const records = buildSceneRecords(8, {
      0: { suspenseDelta: 1 },
      1: { suspenseDelta: 1 },
      // idx 2-5 (quarters two and three) stay at the default suspenseDelta 0.
      6: { suspenseDelta: 2 },
      7: { suspenseDelta: 0 },
    });
    const strengths = buildStrengths(baseStrengthsInputFor(records));

    assert.ok(
      strengths.some(s =>
        s.includes('genuine peak late in the draft') && s.includes('Scene 6') && s.includes('Scene 0')),
      `expected the suspense-shaping strength naming Scene 6 (the peak) and Scene 0 (the baseline), got: ${JSON.stringify(strengths)}`,
    );
  });

  it('suspense shaping NO-FIRE: a closing-quarter peak that only TIES the opening baseline never fires', () => {
    // Mirrors the corpus's designed flaw: the ending isn't actually stronger
    // than the opening, just even with it — not a genuine build.
    const records = buildSceneRecords(8, {
      0: { suspenseDelta: 1 },
      1: { suspenseDelta: 1 },
      6: { suspenseDelta: 1 },
      7: { suspenseDelta: 0 },
    });
    const strengths = buildStrengths(baseStrengthsInputFor(records));

    assert.ok(
      !strengths.some(s => s.includes('genuine peak late in the draft')),
      `suspense-shaping must not fire when the closing peak merely ties (not tops) an earlier quarter's average, got: ${JSON.stringify(strengths)}`,
    );
  });

  it('dramatic-turn density FIRE: 2 turns in the front half and 2 in the back half names all four scenes', () => {
    const records = buildSceneRecords(8, {
      1: { dramaticTurn: 'She finally confronts him.' },
      2: { dramaticTurn: 'The alibi falls apart.' },
      5: { dramaticTurn: 'The truth comes out.' },
      6: { dramaticTurn: 'He chooses to stay.' },
    });
    const strengths = buildStrengths(baseStrengthsInputFor(records));

    assert.ok(
      strengths.some(s =>
        s.includes('keeps generating real turns') && s.includes('Scenes 1, 2') && s.includes('Scenes 5, 6')),
      `expected the dramatic-turn-density strength naming Scenes 1, 2 and Scenes 5, 6, got: ${JSON.stringify(strengths)}`,
    );
  });

  it('dramatic-turn density NO-FIRE: 2 turns in the front half but only 1 in the back half never fires', () => {
    // Mirrors the corpus's 'competent' near-miss (Thanksgiving, Maybe): real
    // turns up front, but the back half only manages a single, thinner turn.
    const records = buildSceneRecords(8, {
      1: { dramaticTurn: 'She finally confronts him.' },
      2: { dramaticTurn: 'The alibi falls apart.' },
      6: { dramaticTurn: 'He chooses to stay.' },
    });
    const strengths = buildStrengths(baseStrengthsInputFor(records));

    assert.ok(
      !strengths.some(s => s.includes('keeps generating real turns')),
      `dramatic-turn-density must not fire when only one half clears the 2-turn floor, got: ${JSON.stringify(strengths)}`,
    );
  });
});

describe('runScriptDoctor — Wave 1187 excellence detectors against the real reference corpus', () => {
  it('at least one new detector fires somewhere across the 5 strong-band samples', async () => {
    const strongReports = await Promise.all(
      REFERENCE_CORPUS.filter(s => s.band === 'strong').map(s => runScriptDoctor(s.fountain)),
    );
    const anyFired = strongReports.some(r => (r.strengths ?? []).some(s => WAVE_1187_MARKERS.some(m => s.includes(m))));
    assert.ok(
      anyFired,
      `expected at least one Wave 1187 strength somewhere in the strong band, got: ` +
        `${JSON.stringify(strongReports.map(r => r.strengths))}`,
    );
  });

  it('never-padded proof: no Wave 1187 detector fires on any competent-band sample', async () => {
    const competentReports = await Promise.all(
      REFERENCE_CORPUS.filter(s => s.band === 'competent').map(async s => ({
        label: s.label, report: await runScriptDoctor(s.fountain),
      })),
    );
    for (const { label, report } of competentReports) {
      const fired = WAVE_1187_MARKERS.filter(m => (report.strengths ?? []).some(s => s.includes(m)));
      assert.deepEqual(
        fired, [],
        `Wave 1187 detector(s) [${fired.join(', ')}] false-fired on competent-band sample "${label}" — ` +
          `the competent band is deliberately competent-but-unremarkable, never broken; a fire here means the ` +
          `guard is padded.`,
      );
    }
  });
});

describe('Wave 1187 — calibration-drift guard (strengths must never leak into scoring)', () => {
  it('health stays a pure function of bySeverity/sceneCount/wordCount across the whole corpus, extending the Wave 1183 mechanism check to at least one Wave 1187 strength', async () => {
    let sawAWave1187Strength = false;
    for (const sample of REFERENCE_CORPUS) {
      const report = await runScriptDoctor(sample.fountain);
      if ((report.strengths ?? []).some(s => WAVE_1187_MARKERS.some(m => s.includes(m)))) sawAWave1187Strength = true;

      const expectedHealth = computeHealthScore(report.bySeverity, report.sceneCount, report.wordCount);
      assert.equal(
        report.health, expectedHealth,
        `${sample.label}: health must equal computeHealthScore(bySeverity, sceneCount, wordCount) exactly — ` +
          `strengths (a separate, downstream field) must never be able to move it, Wave 1187's included`,
      );
    }
    assert.ok(
      sawAWave1187Strength,
      'expected at least one corpus sample to carry a Wave 1187 strength — otherwise this guard would be vacuous',
    );
  });
});

describe('runScriptDoctor — plainSummary', () => {
  it('is non-empty, names the verdict, and never leaks a raw ALL_CAPS rule token', async () => {
    const report = await runScriptDoctor(buildMultiSceneFountain());
    assert.ok(report.plainSummary && report.plainSummary.length > 0);
    assert.ok(report.verdict, 'verdict must be populated alongside plainSummary');
    assert.ok(
      report.plainSummary!.includes(report.verdict!),
      'plainSummary must state the verdict word itself',
    );

    const allRules = report.passes.flatMap(p => p.issues.map(i => i.rule));
    for (const rule of allRules) {
      assert.ok(!report.plainSummary!.includes(rule), `plainSummary leaked raw rule token "${rule}"`);
    }
  });
});

describe('runScriptDoctor — degenerate zero-scene coverage layer', () => {
  it('returns PASS, empty strengths, and all-zero (but present) dimensions for whitespace-only input', async () => {
    const report = await runScriptDoctor('   \n\n  \t  ');

    assert.equal(report.verdict, 'PASS');
    assert.deepEqual(report.strengths, []);

    assert.ok(report.dimensions, 'dimensions must still be present on the degenerate report');
    const dimensions = report.dimensions!;
    assert.equal(dimensions.length, 5);
    assert.deepEqual(dimensions.map(d => d.key), DIMENSION_CONTRACT_ORDER.map(d => d.key));
    for (const dim of dimensions) {
      assert.equal(dim.score, 0);
      assert.equal(dim.issueCount, 0);
      assert.ok(dim.summary.length > 0);
    }

    assert.ok(report.plainSummary && report.plainSummary.length > 0);
    assert.ok(report.plainSummary!.includes('PASS'));
  });
});

// ── contentHash ───────────────────────────────────────────────────────────────
// The determinism receipt (types.ts's ScriptDoctorReport.contentHash doc
// comment): sha256 hex of the TRIMMED analyzed Fountain text, present on
// every report — including the degenerate zero-scene one — so draft-over-
// draft comparisons (the client's history feature) have a stable identity
// key that's independent of analyzedAt or any other timestamp.
describe('runScriptDoctor — contentHash', () => {
  it('is present and is a 64-char lowercase hex string', async () => {
    const report = await runScriptDoctor(buildMultiSceneFountain());
    assert.ok(report.contentHash, 'contentHash must be populated');
    assert.equal(report.contentHash!.length, 64, 'sha256 hex digest must be 64 characters');
    assert.match(report.contentHash!, /^[0-9a-f]{64}$/, 'contentHash must be lowercase hex');
  });

  it('is stable across two runs on the same input', async () => {
    const fountain = buildMultiSceneFountain();
    const first = await runScriptDoctor(fountain);
    const second = await runScriptDoctor(fountain);
    assert.equal(first.contentHash, second.contentHash, 'identical input must hash identically');
  });

  it('differs across different inputs', async () => {
    const a = await runScriptDoctor(buildMultiSceneFountain());
    const b = await runScriptDoctor(buildMultiSceneFountain() + '\n\nEXT. NEW LOCATION - DAY\n\nSomething new happens here.');
    assert.notEqual(a.contentHash, b.contentHash, 'different scripts must not collide');
  });

  it('is present on the degenerate whitespace-only report', async () => {
    const report = await runScriptDoctor('   \n\n  \t  ');
    assert.ok(report.contentHash, 'contentHash must be populated even on the zero-scene report');
    assert.equal(report.contentHash!.length, 64);
    assert.match(report.contentHash!, /^[0-9a-f]{64}$/);
  });

  it('equals an independently computed createHash("sha256") of the trimmed fixture', async () => {
    const fountain = buildMultiSceneFountain();
    const report = await runScriptDoctor(fountain);
    const expected = createHash('sha256').update(fountain.trim()).digest('hex');
    assert.equal(report.contentHash, expected);
  });

  it('trims before hashing, so incidental surrounding whitespace does not change the degenerate hash', async () => {
    // The degenerate zero-scene path is the one place where the raw input can
    // be pure whitespace of varying shape (different amounts/kinds of
    // whitespace) yet still be "the same empty submission" — proving the
    // trim happens even on that branch, not just the non-degenerate one.
    const a = await runScriptDoctor('   \n\n  \t  ');
    const b = await runScriptDoctor('\t\t\n   ');
    assert.equal(a.contentHash, b.contentHash, 'different whitespace-only inputs must trim to the same hash');
    const expected = createHash('sha256').update(''.trim()).digest('hex');
    assert.equal(a.contentHash, expected);
  });
});

// ── Calibration percentiles ──────────────────────────────────────────────────
// healthPercentile / DimensionScore.percentile+percentileDescriptor, populated
// by aggregateReport's calibration layer (doctor.ts) via calibration/
// reference.ts's reference-corpus distribution. See tests/core/calibration.test.ts
// for percentile math, distribution shape, and cross-band ordering coverage —
// this block only exercises the fields as seen through runScriptDoctor's own
// report shape and determinism guarantee, using this file's existing fixture.
describe('runScriptDoctor — calibration percentiles', () => {
  it('populates healthPercentile and a per-dimension percentile/percentileDescriptor for a normal script', async () => {
    const report = await runScriptDoctor(buildMultiSceneFountain());

    assert.equal(typeof report.healthPercentile, 'number', 'healthPercentile must be populated');
    assert.ok(
      report.healthPercentile! >= 0 && report.healthPercentile! <= 100,
      `healthPercentile out of range: ${report.healthPercentile}`,
    );

    assert.ok(report.dimensions, 'dimensions must be populated');
    for (const dim of report.dimensions!) {
      assert.equal(typeof dim.percentile, 'number', `dimension ${dim.key} missing percentile`);
      assert.ok(
        dim.percentile! >= 0 && dim.percentile! <= 100,
        `dimension ${dim.key} percentile out of range: ${dim.percentile}`,
      );
      assert.ok(
        typeof dim.percentileDescriptor === 'string' && dim.percentileDescriptor.length > 0,
        `dimension ${dim.key} missing a non-empty percentileDescriptor`,
      );
    }
  });

  it('leaves healthPercentile and every dimension percentile undefined for degenerate whitespace-only input', async () => {
    const report = await runScriptDoctor('   \n\n  \t  ');

    assert.equal(report.healthPercentile, undefined, 'the zero-scene report must never populate healthPercentile');
    assert.ok(report.dimensions, 'dimensions must still be present on the degenerate report');
    for (const dim of report.dimensions!) {
      assert.equal(dim.percentile, undefined, `dimension ${dim.key} must not carry a percentile on the degenerate report`);
      assert.equal(
        dim.percentileDescriptor, undefined,
        `dimension ${dim.key} must not carry a percentileDescriptor on the degenerate report`,
      );
    }
  });

  it('is deterministic: two runs on the same input produce identical healthPercentile and per-dimension percentiles', async () => {
    const fountain = buildMultiSceneFountain();
    const [first, second] = await Promise.all([runScriptDoctor(fountain), runScriptDoctor(fountain)]);

    assert.equal(first.healthPercentile, second.healthPercentile);
    assert.ok(first.dimensions && second.dimensions);
    assert.equal(first.dimensions!.length, second.dimensions!.length);
    for (let i = 0; i < first.dimensions!.length; i++) {
      assert.equal(first.dimensions![i].percentile, second.dimensions![i].percentile);
      assert.equal(first.dimensions![i].percentileDescriptor, second.dimensions![i].percentileDescriptor);
    }
  });
});

// ── Wave 18-β: dimension-collapse fix (short-script dimension scores) ───────
// FINDING this wave fixes: on a short script (608 words, 9 scenes), all 5
// DimensionScore.score values rendered identical (84.4 x5) despite issue
// counts per dimension differing 4-5x (35/40/14/34/8). Root cause: buildDimensions
// (doctor.ts) fed every dimension through computeHealthScore's FULL formula,
// including scarcityPenalty (140/sceneCount) — a term that reads only the
// WHOLE script's sceneCount, identical across all 5 dimension calls, and
// dominates at low word counts, swamping the tiny per-dimension density
// differences. Fix: the displayed dimension score (computeDimensionScore) now
// omits the scarcity term entirely and uses its own, separately-tuned density
// curve (dimensionDensityPenalty) — see doctor.ts's own Wave 18-β design
// comment for the full rationale and the measurement that ruled out reusing
// craftPenalty's curve outright (it collapses dimensions toward the 100
// ceiling instead of separating them). DimensionBuild.rawScore (calibration
// percentile ranking) is untouched — see doctor.ts for why.

describe('computeDimensionScore / computeDimensionRawScore — formula spot-check (Wave 18-β)', () => {
  it('separates 5 skewed dimension issue-mixes at the bug repro word/scene count, ordered by issue density', () => {
    // Mirrors the bug's own repro shape: 608 words, 9 scenes, per-dimension
    // weightedIssues 35/40/14/34/8 (minor-only counts of 70/80/28/68/16, since
    // weightedIssues = 0.5*minorCount). Expected values below are this wave's
    // own measured output (see doctor.ts's Wave 18-β comment) — computeDimensionScore
    // itself is the single source of truth for the formula, same convention as
    // computeHealthScore's own spot-check block above.
    const wordCount = 608;
    const sceneCount = 9;
    const minorCounts = [70, 80, 28, 68, 16]; // -> weightedIssues 35, 40, 14, 34, 8
    const scores = minorCounts.map(minor => computeDimensionScore({ critical: 0, major: 0, minor }, wordCount, sceneCount));

    assert.deepEqual(scores, [75.3, 69.8, 93.7, 76.3, 97.3]);

    // The historical bug: all 5 rendered IDENTICAL (84.4 x5). Direct regression
    // guard — this must never collapse back to a single repeated value.
    assert.equal(new Set(scores).size, 5, `expected 5 distinct scores, got ${JSON.stringify(scores)}`);
    const range = Math.max(...scores) - Math.min(...scores);
    assert.ok(range > 15, `expected a visible spread (>15pts) tracking issue density, got range ${range.toFixed(1)} (${scores.join(', ')})`);

    // Ordering must match issue severity/density: more weighted issues -> lower
    // score. minorCounts[1]=80 is the heaviest (score[1] must be the lowest);
    // minorCounts[4]=16 is the lightest (score[4] must be the highest).
    assert.equal(Math.min(...scores), scores[1], 'the heaviest-issue dimension must score lowest');
    assert.equal(Math.max(...scores), scores[4], 'the lightest-issue dimension must score highest');
  });

  it('stays within [0, 100] even for a heavily-flagged dimension at a tiny word count', () => {
    const score = computeDimensionScore({ critical: 50, major: 0, minor: 0 }, 20, 10);
    assert.equal(score, 0);
    const raw = computeDimensionRawScore({ critical: 50, major: 0, minor: 0 }, 20);
    assert.ok(raw < 0, `expected the unclamped raw score to go negative, got ${raw}`);
  });

  it('is exactly 100 for a zero-issue dimension regardless of sceneCount — no scarcity floor unlike the overall score', () => {
    // Contrast with computeHealthScore's OWN zero-issue behavior (this file's
    // "does NOT return 100 for zero issues at a tiny scene/word count" test
    // above): the overall score keeps a scarcity surcharge even at zero
    // issues, but a dimension's displayed score has no such term by design
    // (Wave 18-β) — a genuinely clean dimension reads as a clean 100.
    assert.equal(computeDimensionScore({ critical: 0, major: 0, minor: 0 }, 80, 4), 100);
    assert.equal(computeDimensionScore({ critical: 0, major: 0, minor: 0 }, 2000, 25), 100);
  });

  it('honesty guard: rounds to the nearest whole point (not a tenth) below 3 scenes', () => {
    const bySeverity = { critical: 0, major: 0, minor: 70 }; // weightedIssues 35
    const wordCount = 608;
    assert.equal(computeDimensionScore(bySeverity, wordCount, 1), 75, 'sceneCount=1 must round to a whole point');
    assert.equal(computeDimensionScore(bySeverity, wordCount, 2), 75, 'sceneCount=2 must round to a whole point');
    // sceneCount=3 clears the low-confidence floor (< 3, not <= 3) and keeps
    // the normal tenths-place precision.
    assert.equal(computeDimensionScore(bySeverity, wordCount, 3), 75.3, 'sceneCount=3 must keep tenths precision');
  });
});

/** Fixture PassResult with all issues attached to a single named pass (each
 *  dimension's own first mapped pass, per DIMENSION_PASS_MAP above) — enough
 *  for buildDimensions'/aggregateReport's per-dimension rollup, which only
 *  cares which DIMENSION a pass belongs to, not which of its 2-4 member
 *  passes carried the issues. */
function buildDimensionSkewedResult(
  weightedByDimension: Array<{ critical?: number; major?: number; minor?: number }>,
): RevisionResult {
  const passResults: PassResult[] = PASS_ORDER.map(pass => ({
    pass: pass as PassResult['pass'],
    issues: [] as RevisionIssue[],
    revisedFountain: '',
    changed: false,
    summary: '',
  }));

  DIMENSION_CONTRACT_ORDER.forEach((def, i) => {
    const mix = weightedByDimension[i];
    const targetPass = DIMENSION_PASS_MAP[def.key][0];
    const pr = passResults.find(p => p.pass === targetPass)!;
    const push = (severity: RevisionIssue['severity'], count: number) => {
      for (let j = 0; j < count; j++) {
        pr.issues.push({
          location: 'Scene 0', rule: `TEST_RULE_${def.key.toUpperCase()}`,
          description: `synthetic ${def.key} test issue`, severity,
        });
      }
    };
    push('critical', mix.critical ?? 0);
    push('major', mix.major ?? 0);
    push('minor', mix.minor ?? 0);
  });

  return {
    passResults,
    finalFountain: '', originalFountain: '', totalIssuesFound: 0, passesWithChanges: 0, failedPasses: [], completedAt: 0,
  };
}

function buildAnalysisFixture(sceneCount: number, wordCount: number): FountainAnalysis {
  return {
    records: [], annotations: [], structure: baseStructureState(),
    characters: [], sceneCount, dialogueLineCount: 0, actionLineCount: 0, wordCount,
  };
}

describe('runScriptDoctor report shape — dimension-collapse fix, end to end (Wave 18-β)', () => {
  it('FIRE: a short (9-scene, 608-word) script with skewed per-dimension issue counts produces non-identical dimension scores, ordered by issue density', () => {
    // Same repro shape as the formula spot-check above, but exercised through
    // the actual public aggregation path (aggregateReport) rather than the
    // bare formula, proving the fix reaches the real report shape a caller
    // receives — not just the underlying function.
    const analysis = buildAnalysisFixture(9, 608);
    const result = buildDimensionSkewedResult([
      { minor: 70 }, // structure-pacing: weightedIssues 35
      { minor: 80 }, // character: weightedIssues 40
      { minor: 28 }, // dialogue-voice: weightedIssues 14
      { minor: 68 }, // plot-logic: weightedIssues 34
      { minor: 16 }, // theme-originality: weightedIssues 8
    ]);
    const report = aggregateReport(result, analysis, 'fixture fountain — dimension collapse fire case');

    const scores = report.dimensions!.map(d => d.score);
    assert.equal(new Set(scores).size, 5, `expected 5 distinct dimension scores, got ${JSON.stringify(scores)} — this is the exact historical bug (84.4 x5)`);

    const range = Math.max(...scores) - Math.min(...scores);
    assert.ok(range > 15, `expected visible spread across dimensions, got range ${range.toFixed(1)} (${JSON.stringify(scores)})`);

    // character (index 1, weightedIssues 40, the heaviest) must score lowest;
    // theme-originality (index 4, weightedIssues 8, the lightest) must score
    // highest — ordering matches issue severity/density exactly.
    const byKey = Object.fromEntries(report.dimensions!.map(d => [d.key, d.score]));
    assert.equal(byKey['character'], Math.min(...scores), 'the heaviest-issue dimension must score lowest');
    assert.equal(byKey['theme-originality'], Math.max(...scores), 'the lightest-issue dimension must score highest');

    for (const score of scores) assert.ok(score >= 0 && score <= 100, `dimension score out of range: ${score}`);
  });

  it('NO-FIRE / control: a short script with a BALANCED issue mix across dimensions produces near-equal scores', () => {
    // Control for the fire case above: when the underlying issue mix genuinely
    // IS balanced across dimensions (not skewed), the fix must not manufacture
    // spread that isn't there — dimensions should land close together, same as
    // they did (for the wrong reason) before this fix.
    const analysis = buildAnalysisFixture(9, 608);
    const result = buildDimensionSkewedResult([
      { minor: 40 }, { minor: 42 }, { minor: 38 }, { minor: 41 }, { minor: 39 },
    ]);
    const report = aggregateReport(result, analysis, 'fixture fountain — balanced control case');

    const scores = report.dimensions!.map(d => d.score);
    const range = Math.max(...scores) - Math.min(...scores);
    assert.ok(range < 10, `expected near-equal dimension scores for a balanced issue mix, got range ${range.toFixed(1)} (${JSON.stringify(scores)})`);
  });

  it('identical bySeverity mixes across all 5 dimensions produce byte-identical scores (determinism sanity)', () => {
    const analysis = buildAnalysisFixture(10, 320);
    const result = buildDimensionSkewedResult([
      { minor: 20 }, { minor: 20 }, { minor: 20 }, { minor: 20 }, { minor: 20 },
    ]);
    const report = aggregateReport(result, analysis, 'fixture fountain — identical mixes');

    const scores = report.dimensions!.map(d => d.score);
    assert.ok(scores.every(s => s === scores[0]), `expected all 5 identical scores for identical issue mixes, got ${JSON.stringify(scores)}`);
  });

  it('honesty guard reaches the real report: dimension scores round to a whole point below 3 scenes', () => {
    const analysis = buildAnalysisFixture(2, 608);
    const result = buildDimensionSkewedResult([{ minor: 70 }, {}, {}, {}, {}]);
    const report = aggregateReport(result, analysis, 'fixture fountain — low-confidence rounding');

    const structureDim = report.dimensions!.find(d => d.key === 'structure-pacing')!;
    assert.equal(structureDim.score, Math.round(structureDim.score), `expected a whole-point score below 3 scenes, got ${structureDim.score}`);
  });

  it('length-invariance is NOT expected of the dimension formula the same way as overall health — sanity: dimension scores stay in [0, 100] across a 1x/2x/3x-issue sweep', () => {
    // Not a strict invariance claim (the overall health length-invariance test
    // in calibration.test.ts is the binding one, and it is untouched by this
    // wave — see doctor.ts's craftPenalty comment). This is a basic sanity
    // bound: whatever the dimension curve does as issue volume scales up, it
    // must never leave the documented [0, 100] contract.
    const analysis = buildAnalysisFixture(9, 608);
    for (const multiplier of [1, 2, 3]) {
      const result = buildDimensionSkewedResult([
        { minor: 70 * multiplier }, { minor: 80 * multiplier }, { minor: 28 * multiplier },
        { minor: 68 * multiplier }, { minor: 16 * multiplier },
      ]);
      const report = aggregateReport(result, analysis, `fixture fountain — issue sweep x${multiplier}`);
      for (const dim of report.dimensions!) {
        assert.ok(dim.score >= 0 && dim.score <= 100, `dimension ${dim.key} out of range at x${multiplier}: ${dim.score}`);
      }
    }
  });
});

// ── P0.3 incomplete analysis (pass failure withholding) ─────────────────────
// When any revision pass throws, the pipeline records it in failedPasses and
// aggregateReport must withhold the complete-looking quality surface rather
// than treating a crashed detector as "zero issues found".
describe('aggregateReport — incomplete analysis when passes fail', () => {
  it('withholds verdict/percentiles and marks analysisComplete=false when failedPasses is non-empty', () => {
    const analysis = buildAnalysisFixture(10, 500);
    const result = buildDimensionSkewedResult([
      { minor: 10 }, { minor: 10 }, { minor: 10 }, { minor: 10 }, { minor: 10 },
    ]);
    result.failedPasses = ['structure', 'payoff'];
    const report = aggregateReport(result, analysis, 'fixture fountain — incomplete analysis');

    assert.equal(report.analysisComplete, false);
    assert.deepEqual(report.failedPasses, ['structure', 'payoff']);
    assert.equal(report.verdict, undefined, 'verdict must be withheld on incomplete analysis');
    assert.equal(report.dimensions, undefined, 'dimensions must be withheld on incomplete analysis');
    assert.equal(report.healthPercentile, undefined, 'percentile must be withheld on incomplete analysis');
    assert.equal(report.health, 0, 'health sentinel is 0 when incomplete');
    assert.equal(report.grade, 'troubled', 'grade sentinel is troubled when incomplete');
    assert.match(report.plainSummary ?? '', /Analysis incomplete/i);
    assert.match(report.plainSummary ?? '', /structure/);
    assert.match(report.plainSummary ?? '', /payoff/);
  });

  it('marks analysisComplete=true and keeps verdict when no passes failed', () => {
    const analysis = buildAnalysisFixture(10, 500);
    const result = buildDimensionSkewedResult([
      { minor: 4 }, { minor: 4 }, { minor: 4 }, { minor: 4 }, { minor: 4 },
    ]);
    const report = aggregateReport(result, analysis, 'fixture fountain — complete analysis');
    assert.equal(report.analysisComplete, true);
    assert.equal(report.failedPasses, undefined);
    assert.ok(report.verdict, 'complete analysis still emits a verdict');
    assert.ok(Array.isArray(report.dimensions) && report.dimensions.length === 5);
    assert.ok(report.health > 0, 'complete analysis emits a real health score');
  });
});

// ── P0.2 truncation denominator scope ───────────────────────────────────────
// Health density must not count text the analyzer did not diagnose. Scripts
// under the scene ceiling keep full-fountain word counts (calibration
// compatibility). Scripts over the ceiling count only analyzed scene blocks.
describe('analyzeFountainText / runScriptDoctor — truncation denominator scope', () => {
  it('does not improve health solely by appending ignored scenes beyond the analyzer ceiling', async () => {
    // Build a baseline under the ceiling, then append enough minimal scenes to
    // force truncation. If wordCount still counted the ignored tail, the larger
    // denominator would reduce issue density and could raise health.
    const baseline = buildMultiSceneFountain();
    const filler = Array.from({ length: 1100 }, (_, i) =>
      `INT. PAD ROOM ${i} - DAY\n\nA person waits.\n\nPERSON\nOkay.\n`,
    ).join('\n');
    const padded = `${baseline}\n\n${filler}`;

    const baseReport = await runScriptDoctor(baseline);
    const padReport = await runScriptDoctor(padded);

    assert.equal(baseReport.analysisComplete, true);
    assert.equal(padReport.analysisComplete, true);
    assert.ok(padReport.truncatedForAnalysis, 'padded script must trip the analyzer ceiling');
    assert.ok((padReport.totalSceneCount ?? 0) > padReport.sceneCount,
      'totalSceneCount must exceed analyzed sceneCount when truncated');

    // Core invariant: ignored post-ceiling text must not raise health.
    assert.ok(
      padReport.health <= baseReport.health,
      `post-ceiling padding improved health from ${baseReport.health} to ${padReport.health}`,
    );
  });
});

// ── Narrative metrics (I1-c) ─────────────────────────────────────────────────
// ScriptDoctorReport.metrics — analyze/metrics.ts's NarrativeMetricsReport,
// computed by aggregateReport from the same analyzer records every other
// layer reads, and attached on every non-degenerate run. pacingFit is null
// throughout by construction: the doctor has no session emotional_arc to pass
// (StoryContext carries no arc field), and metrics.ts reports that absence
// honestly instead of fabricating a neutral score.
describe('runScriptDoctor — narrative metrics (report.metrics)', () => {
  it('is present on a normal run, with one per-scene entry per scene in sceneIdx order', async () => {
    const report = await runScriptDoctor(buildMultiSceneFountain());

    assert.ok(report.metrics, 'metrics must be populated on a non-degenerate report');
    const metrics = report.metrics!;
    assert.equal(metrics.perScene.length, report.sceneCount,
      'perScene must carry exactly one entry per analyzed scene');
    assert.equal(metrics.script.sceneCount, report.sceneCount);
    metrics.perScene.forEach((scene, i) => {
      assert.equal(scene.sceneIdx, i, 'perScene must be sceneIdx-ascending with no gaps');
      assert.ok(scene.slug.length > 0, 'every per-scene entry must carry its slug');
    });
  });

  it('every score is within its documented range', async () => {
    const report = await runScriptDoctor(buildMultiSceneFountain());
    const metrics = report.metrics!;

    for (const scene of metrics.perScene) {
      for (const key of ['pivotStrength', 'cliffhangerStrength', 'twistImpact', 'surpriseProxy', 'informationAsymmetryStrength'] as const) {
        const v = scene[key];
        assert.ok(Number.isFinite(v) && v >= 0 && v <= 100, `scene ${scene.sceneIdx} ${key} out of [0,100]: ${v}`);
      }
    }

    const s = metrics.script;
    for (const key of ['suspenseEntropy', 'momentumConsistency', 'finalCliffhangerStrength', 'narrativeCohesion'] as const) {
      assert.ok(s[key] >= 0 && s[key] <= 100, `script.${key} out of [0,100]: ${s[key]}`);
    }
    assert.ok(s.emotionalImpactRange.peak >= 0 && s.emotionalImpactRange.peak <= 100);
    assert.ok(s.emotionalImpactRange.spread >= 0 && s.emotionalImpactRange.spread <= 100);
    // tensionMeasures: lexical is SIGNED and unbounded by contract (finite is
    // the only guarantee); the other three are 0-100.
    assert.ok(Number.isFinite(s.tensionMeasures.lexical));
    for (const key of ['structural', 'rhythmic', 'asymmetric'] as const) {
      const v = s.tensionMeasures[key];
      assert.ok(v >= 0 && v <= 100, `tensionMeasures.${key} out of [0,100]: ${v}`);
    }
  });

  it('pacingFit is honestly null everywhere — the doctor has no session emotional arc to measure against', async () => {
    const report = await runScriptDoctor(buildMultiSceneFountain());
    const metrics = report.metrics!;
    assert.equal(metrics.script.pacingFit, null, 'script-level pacingFit must be null with no arc configured');
    for (const scene of metrics.perScene) {
      assert.equal(scene.pacingFit, null, `scene ${scene.sceneIdx} pacingFit must be null with no arc configured`);
    }
  });

  it('is deterministic: two genuinely fresh runs (cache cleared between) produce deep-equal metrics', async () => {
    const fountain = buildMultiSceneFountain();
    clearDoctorCache();
    const first = await runScriptDoctor(fountain);
    clearDoctorCache(); // make the second run a real recompute, not a cache hit
    const second = await runScriptDoctor(fountain);
    assert.deepEqual(first.metrics, second.metrics,
      'metrics must be byte-identical across independent runs on the same input');
  });

  it('final hook reconciles: script.finalCliffhangerStrength equals the last scene\'s cliffhangerStrength', async () => {
    const report = await runScriptDoctor(buildMultiSceneFountain());
    const metrics = report.metrics!;
    assert.equal(
      metrics.script.finalCliffhangerStrength,
      metrics.perScene[metrics.perScene.length - 1].cliffhangerStrength,
    );
  });

  it('is absent from the degenerate zero-scene report — a missing field, not a fabricated all-zero one', async () => {
    const report = await runScriptDoctor('   \n\n  \t  ');
    assert.equal(report.metrics, undefined,
      'the zero-scene report skips the pipeline entirely and must not carry metrics');
  });
});
