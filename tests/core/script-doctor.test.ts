// Script Doctor — tests for the aggregation layer (doctor.ts) that runs the
// analyzer + all 14 revision passes in diagnose-only mode and rolls the
// result up into a ScriptDoctorReport.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { runScriptDoctor, computeHealthScore, gradeForHealth } from '../../server/nvm/analyze/doctor.ts';
import { runDiagnoseOnly, rewritePass } from '../../server/nvm/revision/rewrite.ts';
import { setLLMProvider, resetLLMProvider } from '../../server/engine/ai.ts';

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
  it('matches the documented formula for a known issue count', () => {
    // 100 - (4*1 + 1.5*2 + 0.5*3) * (30/10) = 100 - 8.5*3 = 100 - 25.5 = 74.5
    const health = computeHealthScore({ critical: 1, major: 2, minor: 3 }, 10);
    assert.equal(health, 74.5);
    assert.equal(gradeForHealth(health), 'solid');
  });

  it('returns 100 (excellent) for zero issues regardless of scene count', () => {
    const health = computeHealthScore({ critical: 0, major: 0, minor: 0 }, 25);
    assert.equal(health, 100);
    assert.equal(gradeForHealth(health), 'excellent');
  });

  it('clamps to 0 when the penalty would exceed 100', () => {
    const health = computeHealthScore({ critical: 10, major: 10, minor: 10 }, 5);
    assert.equal(health, 0);
    assert.equal(gradeForHealth(health), 'troubled');
  });
});
