// Script Doctor — S1-b (pre-deployment security audit BLOCKER): the analyzer
// caps script BYTES (DoctorBodySchema, validation.ts) but not scene/issue
// COUNT, so a script built from tens of thousands of minimal scenes
// ("INT. A - DAY\nA.\n" repeated) fits comfortably under the byte cap while
// driving sceneCount into the tens of thousands — several cross-scene passes
// (detectClueLifecycle's content-word channel, detectQuestionLatency,
// cluster.ts's overlap clustering) are O(n^2)-shaped in the worst case,
// freezing the single-threaded event loop for EVERY concurrent session.
//
// This file proves the guards added to fix it:
//   1. ANALYZER_SCENE_CEILING (fountain-analyzer.ts) — the primary guard: a
//      script over 1000 scenes is analyzed on its first 1000 only, flagged
//      honestly via truncatedForAnalysis/totalSceneCount.
//   2. Defense-in-depth bounds on the specific quadratic loops themselves —
//      overlapClusters/matchOverlapTemplate (cluster.ts), detectQuestionLatency
//      and detectRelationshipShifts (fountain-analyzer.ts), and
//      computeContentWordClueClusters's anchor-cluster scan (fountain-analyzer.ts)
//      — bounded so even a single pathological SCENE (many lines/candidates,
//      not many scenes) can't blow up runtime.
// Conventions: node:test + assert/strict, matching tests/core/cluster.test.ts
// and tests/core/fountain-analyzer.test.ts.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { analyzeFountainText } from '../../server/nvm/analyze/fountain-analyzer.ts';
import { runScriptDoctor, clearDoctorCache } from '../../server/nvm/analyze/doctor.ts';
import { clusterIssues } from '../../server/nvm/analyze/cluster.ts';
import { REFERENCE_CORPUS } from '../../server/nvm/analyze/calibration/corpus.ts';
import type { LocatedIssue, IssueAnchor } from '../../server/nvm/analyze/types.ts';
import type { PassName, RevisionIssue } from '../../server/nvm/revision/passes/types.ts';

/** Builds N minimal trivial scenes — the exact pathological shape from the
 *  audit finding: cheap in bytes, expensive in scene/candidate count. */
function buildTrivialScenes(count: number): string {
  const parts: string[] = [];
  for (let i = 0; i < count; i++) {
    parts.push(`INT. ROOM ${i} - DAY`, '', `Someone is here in room ${i}.`, '');
  }
  return parts.join('\n');
}

function located(
  rule: string,
  location: string,
  anchor: IssueAnchor,
  pass: PassName,
  opts: { severity?: RevisionIssue['severity']; startLine?: number; endLine?: number } = {},
): LocatedIssue {
  return {
    issue: { location, rule, description: `${rule} description`, severity: opts.severity ?? 'minor' },
    pass,
    anchor,
    startLine: opts.startLine,
    endLine: opts.endLine,
  };
}

describe('analyzer DoS guard — primary scene-count ceiling', () => {
  it('fire: a pathological 5000-trivial-scene script is truncated, flagged, and analyzed in bounded time', () => {
    const fountain = buildTrivialScenes(5000);
    const t0 = performance.now();
    const analysis = analyzeFountainText(fountain);
    const elapsed = performance.now() - t0;

    // Pre-fix, the O(n^2) cross-scene loops over 5000 scenes would take this
    // well past any reasonable request budget; post-fix the ceiling caps the
    // expensive work to 1000 scenes regardless of how large the input is.
    assert.ok(elapsed < 5000, `expected bounded analysis time, took ${elapsed}ms`);
    assert.equal(analysis.truncatedForAnalysis, true);
    assert.equal(analysis.totalSceneCount, 5000);
    assert.equal(analysis.sceneCount, 1000);
    assert.equal(analysis.records.length, 1000);
    assert.equal(analysis.annotations.length, 1000);
  });

  it('fire: runScriptDoctor over the same pathological script completes in bounded time with an honest truncation notice', async () => {
    clearDoctorCache();
    const fountain = buildTrivialScenes(5000);
    const t0 = performance.now();
    const report = await runScriptDoctor(fountain);
    const elapsed = performance.now() - t0;

    assert.ok(elapsed < 15000, `expected bounded doctor runtime, took ${elapsed}ms`);
    assert.equal(report.truncatedForAnalysis, true);
    assert.equal(report.totalSceneCount, 5000);
    assert.equal(report.sceneCount, 1000);
    assert.ok(Number.isFinite(report.health));
    assert.ok(report.plainSummary?.includes('5000 scenes'));
    assert.ok(report.plainSummary?.includes('1000-scene limit'));
  });

  it('no-fire: a script at exactly the ceiling (1000 scenes) is analyzed in full, with no truncation flag', () => {
    const fountain = buildTrivialScenes(1000);
    const analysis = analyzeFountainText(fountain);
    assert.equal(analysis.sceneCount, 1000);
    assert.equal(analysis.records.length, 1000);
    assert.equal(analysis.truncatedForAnalysis, undefined);
    assert.equal(analysis.totalSceneCount, undefined);
  });

  it('no-fire: a script just under the ceiling (999 scenes) analyzes fully and unflagged', () => {
    const fountain = buildTrivialScenes(999);
    const analysis = analyzeFountainText(fountain);
    assert.equal(analysis.sceneCount, 999);
    assert.equal(analysis.records.length, 999);
    assert.equal(analysis.truncatedForAnalysis, undefined);
    assert.equal(analysis.totalSceneCount, undefined);
  });

  it('no-fire: normal-sized calibration corpus scripts are completely unaffected (no new fields, same shape)', () => {
    for (const sample of REFERENCE_CORPUS) {
      const analysis = analyzeFountainText(sample.fountain);
      assert.equal(analysis.truncatedForAnalysis, undefined);
      assert.equal(analysis.totalSceneCount, undefined);
      assert.ok(analysis.sceneCount < 1000);
      assert.equal('truncatedForAnalysis' in analysis, false);
      assert.equal('totalSceneCount' in analysis, false);
    }
  });
});

describe('analyzer DoS guard — defense-in-depth: single-scene pathological volume', () => {
  it('fire: a single scene packed with thousands of substantive dialogue questions completes in bounded time', () => {
    // ANALYZER_SCENE_CEILING bounds scene COUNT, not lines within one scene —
    // this exercises detectQuestionLatency's OPEN_QUESTIONS_SCAN_CAP guard,
    // which is what actually keeps a single giant scene from going quadratic.
    const lines: string[] = ['INT. WAR ROOM - DAY', ''];
    for (let i = 0; i < 3000; i++) {
      lines.push('SPEAKER');
      lines.push(`Did anyone ever really figure out what happened to case number ${i} back then?`);
      lines.push('');
    }
    const fountain = lines.join('\n');
    const t0 = performance.now();
    const analysis = analyzeFountainText(fountain);
    const elapsed = performance.now() - t0;
    assert.ok(elapsed < 5000, `expected bounded analysis time, took ${elapsed}ms`);
    assert.equal(analysis.sceneCount, 1);
    assert.ok((analysis.records[0]!.questionsRaised ?? 0) >= 3000);
  });

  it('no-fire: a realistic scene with a handful of open questions still tracks latency correctly', () => {
    const fountain = [
      'INT. WAR ROOM - DAY',
      '',
      'ALEX',
      'Why did the shipment never arrive at the depot?',
      '',
      'INT. DOCKS - NIGHT',
      '',
      'JORDAN',
      'The shipment never arrived because the depot was compromised.',
    ].join('\n');
    const analysis = analyzeFountainText(fountain);
    assert.equal(analysis.records[0]!.questionsRaised, 1);
    assert.ok((analysis.records[0]!.questionsResolved ?? 0) >= 0);
    assert.equal(analysis.records[1]!.questionsResolved, 1);
  });

  it('fire: a single scene with hundreds of distinct one-line speakers completes in bounded time', () => {
    // Exercises detectRelationshipShifts' MAX_RELATIONSHIP_PAIRING_CHARACTERS
    // guard — characters-per-scene isn't bounded by the scene ceiling either.
    const lines: string[] = ['INT. BALLROOM - NIGHT', '', 'A huge crowd mingles.', ''];
    for (let i = 0; i < 300; i++) {
      lines.push(`GUEST${i}`);
      lines.push(`This is simply a wonderful party, don't you think, number ${i}?`);
      lines.push('');
    }
    const fountain = lines.join('\n');
    const t0 = performance.now();
    const analysis = analyzeFountainText(fountain);
    const elapsed = performance.now() - t0;
    assert.ok(elapsed < 5000, `expected bounded analysis time, took ${elapsed}ms`);
    assert.equal(analysis.sceneCount, 1);
    assert.equal(analysis.characters.length, 300);
  });

  it('no-fire: a realistic scene with a few speaking characters still reports relationship shifts', () => {
    const fountain = [
      'INT. KITCHEN - DAY',
      '',
      'MAYA',
      "I can't believe you'd betray me like that, after everything terrible you did.",
      '',
      'JOHN',
      "I hate you and I regret every terrible thing I ever did to you.",
    ].join('\n');
    const analysis = analyzeFountainText(fountain);
    assert.equal(analysis.characters.length, 2);
    // Two characters trading strongly negative-valence lines should clear the
    // relationship-shift threshold — proves the (now-bounded) pairing loop
    // still runs and produces real signal for a normal scene.
    assert.ok((analysis.records[0]!.relationshipShifts ?? []).length >= 1);
  });
});

describe('analyzer DoS guard — defense-in-depth: cluster.ts overlap clustering at scale', () => {
  it('fire: clusterIssues over 20,000 synthetic located issues completes in bounded time and still finds the true overlaps', () => {
    // Mostly non-overlapping noise issues (one line apart, i.e. an "island"
    // per pair), plus one genuine overlapping pair buried at the end — proves
    // the sort+early-break rewrite of overlapClusters/matchOverlapTemplate
    // still finds real convergences, not just that it runs fast.
    const issues: LocatedIssue[] = [];
    for (let i = 0; i < 10000; i++) {
      const line = i * 10;
      issues.push(located('THIN_SCENE', `Scene ${i} (INT. X)`, 'scene', 'pacing', { startLine: line, endLine: line + 1 }));
    }
    issues.push(located('THIN_SCENE', 'Scene 9998 (INT. BAR)', 'scene', 'pacing', { severity: 'minor', startLine: 500000, endLine: 500010 }));
    issues.push(located('FLAT_CONFLICT', 'Scene 9998 (INT. BAR)', 'scene', 'conflict', { severity: 'critical', startLine: 500005, endLine: 500015 }));

    const t0 = performance.now();
    const findings = clusterIssues(issues);
    const elapsed = performance.now() - t0;
    assert.ok(elapsed < 5000, `expected bounded clustering time, took ${elapsed}ms`);

    const overlapFinding = findings.find(f => f.startLine === 500000);
    assert.ok(overlapFinding, 'the genuine overlapping pair should still be found among the noise');
    assert.equal(overlapFinding!.memberCount, 2);
    assert.equal(overlapFinding!.severity, 'critical');
  });

  it('no-fire: clusterIssues over a small realistic issue set behaves exactly as before', () => {
    const issues = [
      located('THIN_SCENE', 'Scene 2 (INT. BAR)', 'scene', 'pacing', { severity: 'minor', startLine: 10, endLine: 20 }),
      located('FLAT_CONFLICT', 'Scene 2 (INT. BAR)', 'scene', 'conflict', { severity: 'critical', startLine: 10, endLine: 20 }),
      located('LONE_NOTE', 'Scene 7 (INT. HALL)', 'scene', 'voice', { severity: 'minor', startLine: 90, endLine: 95 }),
    ];
    const findings = clusterIssues(issues);
    assert.equal(findings.length, 1);
    assert.equal(findings[0].memberCount, 2);
    assert.equal(findings[0].severity, 'critical');
  });
});
