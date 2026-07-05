// Script Doctor — tests for the aggregation layer (doctor.ts) that runs the
// analyzer + all 14 revision passes in diagnose-only mode and rolls the
// result up into a ScriptDoctorReport.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import {
  runScriptDoctor, computeHealthScore, gradeForHealth, verdictFor, buildStrengths,
} from '../../server/nvm/analyze/doctor.ts';
import { runDiagnoseOnly, rewritePass } from '../../server/nvm/revision/rewrite.ts';
import { setLLMProvider, resetLLMProvider } from '../../server/engine/ai.ts';
import type { DimensionKey, DimensionScore } from '../../server/nvm/analyze/types.ts';
import type { StructureState } from '../../server/nvm/screenplay/structure.ts';

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
