// Script Doctor — tests for cluster.ts, the "roll co-firing LocatedIssues up
// into named RootCauseFindings" module. Conventions: node:test +
// assert/strict, matching tests/core/locate.test.ts and
// tests/core/fountain-analyzer.test.ts.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { clusterIssues } from '../../server/nvm/analyze/cluster.ts';
import { locateIssues } from '../../server/nvm/analyze/locate.ts';
import { runScriptDoctor } from '../../server/nvm/analyze/doctor.ts';
import { REFERENCE_CORPUS } from '../../server/nvm/analyze/calibration/corpus.ts';
import type { LocatedIssue, IssueAnchor } from '../../server/nvm/analyze/types.ts';
import type { PassName, RevisionIssue } from '../../server/nvm/revision/passes/types.ts';

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

describe('clusterIssues — scene/lines overlap clustering', () => {
  it('rolls two issues sharing one scene span into a single finding with the worst severity', () => {
    const issues = [
      located('THIN_SCENE', 'Scene 2 (INT. BAR)', 'scene', 'pacing', { severity: 'minor', startLine: 10, endLine: 20 }),
      located('FLAT_CONFLICT', 'Scene 2 (INT. BAR)', 'scene', 'conflict', { severity: 'critical', startLine: 10, endLine: 20 }),
    ];
    const findings = clusterIssues(issues);
    assert.equal(findings.length, 1);
    const [finding] = findings;
    assert.equal(finding.memberCount, 2);
    assert.equal(finding.severity, 'critical');
    assert.deepEqual(finding.sceneIdxs, [2]);
    assert.equal(finding.startLine, 10);
    assert.equal(finding.endLine, 20);
    assert.deepEqual([...finding.memberRules].sort(), ['FLAT_CONFLICT', 'THIN_SCENE']);
  });

  it('merges a lines-anchored issue into a scene cluster when its range overlaps the scene span', () => {
    const issues = [
      located('THIN_SCENE', 'Scene 4 (EXT. ROOF)', 'scene', 'pacing', { startLine: 50, endLine: 70 }),
      located('REDUNDANT_LINE', 'Lines 55-58', 'lines', 'voice', { startLine: 55, endLine: 58 }),
    ];
    const findings = clusterIssues(issues);
    assert.equal(findings.length, 1);
    assert.equal(findings[0].memberCount, 2);
    // The cluster's span covers the union of its members.
    assert.equal(findings[0].startLine, 50);
    assert.equal(findings[0].endLine, 70);
  });

  it('does not merge two scene-anchored issues from non-overlapping scenes', () => {
    const issues = [
      located('A', 'Scene 1', 'scene', 'pacing', { startLine: 1, endLine: 5 }),
      located('B', 'Scene 2', 'scene', 'conflict', { startLine: 6, endLine: 10 }),
    ];
    assert.deepEqual(clusterIssues(issues), []);
  });
});

describe('clusterIssues — character clustering', () => {
  it('rolls two issues anchored to the same character (same first-cue line) into one finding', () => {
    const issues = [
      located('WEAK_WANT', 'Character: JAX', 'character', 'intention', { severity: 'major', startLine: 5, endLine: 5 }),
      located('FLAT_ARC', 'Character: JAX', 'character', 'character-arc', { severity: 'minor', startLine: 5, endLine: 5 }),
    ];
    const findings = clusterIssues(issues);
    assert.equal(findings.length, 1);
    assert.equal(findings[0].memberCount, 2);
    assert.equal(findings[0].severity, 'major');
    assert.match(findings[0].title, /JAX/);
  });

  it('does not merge two different characters even when both are anchor "character"', () => {
    const issues = [
      located('WEAK_WANT', 'Character: JAX', 'character', 'intention', { startLine: 5, endLine: 5 }),
      located('WEAK_WANT', 'Character: MARA', 'character', 'intention', { startLine: 12, endLine: 12 }),
    ];
    assert.deepEqual(clusterIssues(issues), []);
  });
});

describe('clusterIssues — document-family clustering', () => {
  it('clusters 3+ co-firing document-anchored issues from the same writer-facing family', () => {
    const issues = [
      located('THEME_MUDDLED', 'Theme clarity', 'document', 'theme'),
      located('THEME_REPEATED', 'Theme repetition', 'document', 'theme'),
      located('ORIGINALITY_LOW', 'Cliché density', 'document', 'originality'),
    ];
    const findings = clusterIssues(issues);
    assert.equal(findings.length, 1);
    assert.equal(findings[0].memberCount, 3);
    assert.equal(findings[0].startLine, undefined);
    assert.equal(findings[0].endLine, undefined);
    assert.match(findings[0].title, /Theme & Originality/);
  });

  it('does NOT cluster only 2 co-firing document-anchored issues in the same family', () => {
    const issues = [
      located('THEME_MUDDLED', 'Theme clarity', 'document', 'theme'),
      located('THEME_REPEATED', 'Theme repetition', 'document', 'theme'),
    ];
    assert.deepEqual(clusterIssues(issues), []);
  });
});

describe('clusterIssues — singletons excluded', () => {
  it('never returns a finding for a lone issue in any anchor category', () => {
    const issues = [
      located('LONE_SCENE_ISSUE', 'Scene 1', 'scene', 'pacing', { startLine: 1, endLine: 5 }),
      located('LONE_CHAR_ISSUE', 'Character: JAX', 'character', 'intention', { startLine: 20, endLine: 20 }),
      located('LONE_DOC_ISSUE', 'Act 1 pacing', 'document', 'structure'),
    ];
    assert.deepEqual(clusterIssues(issues), []);
  });
});

describe('clusterIssues — no ALL_CAPS rule tokens in reader-facing text', () => {
  it('never surfaces a raw rule constant in title or explanation', () => {
    const issues = [
      located('PAYOFF_TOO_QUICK', 'Scene 3', 'scene', 'payoff', { severity: 'critical', startLine: 30, endLine: 40 }),
      located('PAYOFF_TOO_QUICK', 'Scene 3', 'scene', 'payoff', { severity: 'major', startLine: 30, endLine: 40 }),
    ];
    const [finding] = clusterIssues(issues);
    assert.ok(finding, 'expected a finding to be produced');
    assert.doesNotMatch(finding.title, /PAYOFF_TOO_QUICK/);
    assert.doesNotMatch(finding.explanation, /PAYOFF_TOO_QUICK/);
    // General guard: no run of 3+ consecutive uppercase letters anywhere in
    // the reader-facing text (would catch any other rule-token leak too).
    assert.doesNotMatch(finding.title, /[A-Z]{3,}/);
    assert.doesNotMatch(finding.explanation, /[A-Z]{3,}/);
  });
});

describe('clusterIssues — determinism and stable ids', () => {
  it('produces identical findings across two calls on the same input', () => {
    const issues = [
      located('THIN_SCENE', 'Scene 2', 'scene', 'pacing', { startLine: 10, endLine: 20 }),
      located('FLAT_CONFLICT', 'Scene 2', 'scene', 'conflict', { severity: 'major', startLine: 10, endLine: 20 }),
      located('WEAK_WANT', 'Character: JAX', 'character', 'intention', { startLine: 5, endLine: 5 }),
      located('FLAT_ARC', 'Character: JAX', 'character', 'character-arc', { startLine: 5, endLine: 5 }),
    ];
    assert.deepEqual(clusterIssues(issues), clusterIssues(issues));
  });

  it('assigns the same id to the same cluster regardless of member array order', () => {
    const a = located('THIN_SCENE', 'Scene 2', 'scene', 'pacing', { startLine: 10, endLine: 20 });
    const b = located('FLAT_CONFLICT', 'Scene 2', 'scene', 'conflict', { severity: 'major', startLine: 10, endLine: 20 });

    const [findingForward] = clusterIssues([a, b]);
    const [findingReversed] = clusterIssues([b, a]);
    assert.equal(findingForward.id, findingReversed.id);
  });
});

// ── Wave 1185 additions (Program v2, Type 4 — root-cause templates) ────────
// Three named templates, chosen from measured co-fire evidence across all 20
// calibration corpus samples (runScriptDoctor + locateIssues, tallied for
// same-scene / overlapping-span convergence — see cluster.ts's own "Wave
// 1185 additions" comment for the full top-pairs table and percentages):
//   midpoint-stall        — WEAK_MIDPOINT + MIDPOINT_EMOTIONAL_FLATLINE
//                            (20/20 samples co-fire; 20/20 of those land in
//                            the identical scene span).
//   aftermath-void         — DRAMATIC_TURN_AFTERMATH_VOID +
//                            INCITING_AFTERMATH_STALL (12/20 samples
//                            co-fire; 12/12 of those land in the identical
//                            scene span).
//   inert-scene-flat-talk  — ZERO_ENTROPY_SCENE + DIALOGUE_ASSERTION_RUN
//                            (20/20 samples co-fire; 14/20 of those have the
//                            assertion run's line range actually fall inside
//                            the zero-entropy scene's span).
// Each gets a fire test (the two rules land in the same/overlapping span)
// and a no-fire test (same two rules, but in unrelated, non-overlapping
// scenes — the named template must not form, even though nothing else stops
// the flat issue list from containing both rules somewhere in the script).

describe('clusterIssues — root-cause template: "The middle has no engine" (midpoint-stall)', () => {
  it('fires when WEAK_MIDPOINT and MIDPOINT_EMOTIONAL_FLATLINE land in the same midpoint scene', () => {
    const issues = [
      located('WEAK_MIDPOINT', 'Scene 5 (midpoint)', 'scene', 'structure', { severity: 'major', startLine: 100, endLine: 120 }),
      located('MIDPOINT_EMOTIONAL_FLATLINE', 'Midpoint (Scene 5)', 'scene', 'structure', { severity: 'minor', startLine: 100, endLine: 120 }),
    ];
    const findings = clusterIssues(issues);
    const finding = findings.find(f => f.title === 'The middle has no engine');
    assert.ok(finding, 'expected the midpoint-stall template to fire');
    assert.ok(finding!.id.startsWith('midpoint-stall-'), 'template id should be recorded in the finding id');
    assert.equal(finding!.memberCount, 2);
    assert.equal(finding!.severity, 'major');
    assert.deepEqual(finding!.sceneIdxs, [5]);
    assert.deepEqual([...finding!.memberRules].sort(), ['MIDPOINT_EMOTIONAL_FLATLINE', 'WEAK_MIDPOINT']);
    assert.doesNotMatch(finding!.title, /[A-Z]{3,}/);
    assert.doesNotMatch(finding!.explanation, /[A-Z]{3,}/);
  });

  it('does not form when the same two rules land in unrelated, distant scenes', () => {
    const issues = [
      located('WEAK_MIDPOINT', 'Scene 5 (midpoint)', 'scene', 'structure', { severity: 'major', startLine: 100, endLine: 120 }),
      located('MIDPOINT_EMOTIONAL_FLATLINE', 'Midpoint (Scene 9)', 'scene', 'structure', { severity: 'minor', startLine: 300, endLine: 320 }),
    ];
    const findings = clusterIssues(issues);
    assert.ok(
      !findings.some(f => f.title === 'The middle has no engine'),
      'the named midpoint-stall template must not appear when the rules are spatially unrelated',
    );
  });
});

describe('clusterIssues — root-cause template: "Consequences don\'t land" (aftermath-void)', () => {
  it('fires when DRAMATIC_TURN_AFTERMATH_VOID and INCITING_AFTERMATH_STALL land in the same turn scene', () => {
    const issues = [
      located('DRAMATIC_TURN_AFTERMATH_VOID', 'Scene 3 (dramatic turn: reversal)', 'scene', 'causality', { severity: 'minor', startLine: 60, endLine: 80 }),
      located('INCITING_AFTERMATH_STALL', 'Scenes 4-5 (after first catalyst at Scene 3)', 'scene', 'structure', { severity: 'minor', startLine: 60, endLine: 80 }),
    ];
    const findings = clusterIssues(issues);
    const finding = findings.find(f => f.title === "Consequences don't land");
    assert.ok(finding, 'expected the aftermath-void template to fire');
    assert.ok(finding!.id.startsWith('aftermath-void-'), 'template id should be recorded in the finding id');
    assert.equal(finding!.memberCount, 2);
    assert.equal(finding!.severity, 'minor');
    assert.deepEqual(finding!.sceneIdxs, [3]);
    assert.deepEqual([...finding!.memberRules].sort(), ['DRAMATIC_TURN_AFTERMATH_VOID', 'INCITING_AFTERMATH_STALL']);
    assert.doesNotMatch(finding!.title, /[A-Z]{3,}/);
    assert.doesNotMatch(finding!.explanation, /[A-Z]{3,}/);
  });

  it('does not form when the same two rules land in unrelated, distant scenes', () => {
    const issues = [
      located('DRAMATIC_TURN_AFTERMATH_VOID', 'Scene 3 (dramatic turn: reversal)', 'scene', 'causality', { severity: 'minor', startLine: 60, endLine: 80 }),
      located('INCITING_AFTERMATH_STALL', 'Scenes 9-10 (after first catalyst at Scene 8)', 'scene', 'structure', { severity: 'minor', startLine: 400, endLine: 420 }),
    ];
    const findings = clusterIssues(issues);
    assert.ok(
      !findings.some(f => f.title === "Consequences don't land"),
      'the named aftermath-void template must not appear when the rules are spatially unrelated',
    );
  });
});

describe('clusterIssues — root-cause template: "Everyone sounds the same about nothing" (inert-scene-flat-talk)', () => {
  it('fires when a ZERO_ENTROPY_SCENE span contains a DIALOGUE_ASSERTION_RUN line range', () => {
    const issues = [
      located('ZERO_ENTROPY_SCENE', 'Scene 4 (INT. KITCHEN)', 'scene', 'intention', { severity: 'major', startLine: 80, endLine: 110 }),
      located('DIALOGUE_ASSERTION_RUN', 'Dialogue lines 90-95 — assertion run (6 consecutive declarative lines)', 'lines', 'voice', { severity: 'minor', startLine: 90, endLine: 95 }),
    ];
    const findings = clusterIssues(issues);
    const finding = findings.find(f => f.title === 'Everyone sounds the same about nothing');
    assert.ok(finding, 'expected the inert-scene-flat-talk template to fire');
    assert.ok(finding!.id.startsWith('inert-scene-flat-talk-'), 'template id should be recorded in the finding id');
    assert.equal(finding!.memberCount, 2);
    assert.equal(finding!.severity, 'major');
    assert.deepEqual(finding!.sceneIdxs, [4]);
    assert.deepEqual([...finding!.memberRules].sort(), ['DIALOGUE_ASSERTION_RUN', 'ZERO_ENTROPY_SCENE']);
    assert.doesNotMatch(finding!.title, /[A-Z]{3,}/);
    assert.doesNotMatch(finding!.explanation, /[A-Z]{3,}/);
  });

  it('does not form when the assertion run falls outside the zero-entropy scene\'s span', () => {
    const issues = [
      located('ZERO_ENTROPY_SCENE', 'Scene 4 (INT. KITCHEN)', 'scene', 'intention', { severity: 'major', startLine: 80, endLine: 110 }),
      located('DIALOGUE_ASSERTION_RUN', 'Dialogue lines 500-505 — assertion run (6 consecutive declarative lines)', 'lines', 'voice', { severity: 'minor', startLine: 500, endLine: 505 }),
    ];
    const findings = clusterIssues(issues);
    assert.ok(
      !findings.some(f => f.title === 'Everyone sounds the same about nothing'),
      'the named inert-scene-flat-talk template must not appear when the spans do not overlap',
    );
  });
});

describe('clusterIssues — corpus-level proof (real script, real pipeline)', () => {
  it('at least one named root-cause template fires end-to-end on a real calibration corpus sample', async () => {
    const templateTitles = new Set([
      'The middle has no engine',
      "Consequences don't land",
      'Everyone sounds the same about nothing',
    ]);
    let firedOn: string | undefined;
    for (const sample of REFERENCE_CORPUS) {
      const report = await runScriptDoctor(sample.fountain);
      const issuesWithPass = report.passes.flatMap(p => p.issues.map(issue => ({ ...issue, pass: p.pass })));
      const located2 = locateIssues(issuesWithPass, sample.fountain);
      const findings = clusterIssues(located2);
      if (findings.some(f => templateTitles.has(f.title))) {
        firedOn = sample.label;
        break;
      }
    }
    assert.ok(firedOn, 'expected at least one root-cause template to fire on at least one real corpus sample');
  });
});

// ── Wave 1189 additions (Program v2, Type 4 — root-cause templates, second
// of its kind) — three more named templates, chosen from measured co-fire
// evidence re-run across all 20 calibration corpus samples after Waves
// 1186-1188 (see cluster.ts's own "Wave 1189 additions" comment for the full
// top-pairs table, the rules that turned out to be document-anchored and
// therefore non-viable, and the disjoint-rule-set rationale):
//   airless-opening   — COLD_OPEN_INERT + ACTION_CONSECUTIVE_LONG_RUN
//                        (14/20 samples co-fire; 13/14 of those land in the
//                        identical scene span).
//   hollow-reveal      — REVELATION_UNEARNED + REVELATION_WITHOUT_REACTION
//                        (7/20 samples co-fire; 7/7 of those land in the
//                        identical scene span).
//   causeless-turn     — BELIEF_REVERSAL_UNSUPPORTED + UNMOTIVATED_DECISION
//                        (5/20 samples co-fire; 5/5 of those have at least
//                        one overlapping pair).
// Each gets a fire test (the two rules land in the same/overlapping span)
// and a no-fire test (same two rules, but in unrelated, non-overlapping
// scenes — the named template must not form, even though nothing else stops
// the flat issue list from containing both rules somewhere in the script).

describe('clusterIssues — root-cause template: "Page one has no hook and no air" (airless-opening)', () => {
  it('fires when COLD_OPEN_INERT and ACTION_CONSECUTIVE_LONG_RUN land in the same opening span', () => {
    const issues = [
      located('COLD_OPEN_INERT', 'Scene 0 (cold open)', 'scene', 'structure', { severity: 'minor', startLine: 1, endLine: 10 }),
      located('ACTION_CONSECUTIVE_LONG_RUN', 'Action lines near line 3 — consecutive long-line run (5 lines ≥9w)', 'lines', 'rhythm', { severity: 'minor', startLine: 3, endLine: 3 }),
    ];
    const findings = clusterIssues(issues);
    const finding = findings.find(f => f.title === 'Page one has no hook and no air');
    assert.ok(finding, 'expected the airless-opening template to fire');
    assert.ok(finding!.id.startsWith('airless-opening-'), 'template id should be recorded in the finding id');
    assert.equal(finding!.memberCount, 2);
    assert.equal(finding!.severity, 'minor');
    assert.deepEqual(finding!.sceneIdxs, [0]);
    assert.deepEqual([...finding!.memberRules].sort(), ['ACTION_CONSECUTIVE_LONG_RUN', 'COLD_OPEN_INERT']);
    assert.doesNotMatch(finding!.title, /[A-Z]{3,}/);
    assert.doesNotMatch(finding!.explanation, /[A-Z]{3,}/);
  });

  it('does not form when the dense-line run falls outside the cold-open scene span', () => {
    const issues = [
      located('COLD_OPEN_INERT', 'Scene 0 (cold open)', 'scene', 'structure', { severity: 'minor', startLine: 1, endLine: 10 }),
      located('ACTION_CONSECUTIVE_LONG_RUN', 'Action lines near line 500 — consecutive long-line run (5 lines ≥9w)', 'lines', 'rhythm', { severity: 'minor', startLine: 500, endLine: 500 }),
    ];
    const findings = clusterIssues(issues);
    assert.ok(
      !findings.some(f => f.title === 'Page one has no hook and no air'),
      'the named airless-opening template must not appear when the spans do not overlap',
    );
  });
});

describe('clusterIssues — root-cause template: "The reveal comes from nowhere and changes nothing" (hollow-reveal)', () => {
  it('fires when REVELATION_UNEARNED and REVELATION_WITHOUT_REACTION land in the same revelation scene', () => {
    const issues = [
      located('REVELATION_UNEARNED', 'Scene 5', 'scene', 'belief', { severity: 'major', startLine: 39, endLine: 48 }),
      located('REVELATION_WITHOUT_REACTION', 'Scene 5 → Scene 6', 'scene', 'causality', { severity: 'minor', startLine: 39, endLine: 48 }),
    ];
    const findings = clusterIssues(issues);
    const finding = findings.find(f => f.title === 'The reveal comes from nowhere and changes nothing');
    assert.ok(finding, 'expected the hollow-reveal template to fire');
    assert.ok(finding!.id.startsWith('hollow-reveal-'), 'template id should be recorded in the finding id');
    assert.equal(finding!.memberCount, 2);
    assert.equal(finding!.severity, 'major');
    assert.deepEqual(finding!.sceneIdxs, [5]);
    assert.deepEqual([...finding!.memberRules].sort(), ['REVELATION_UNEARNED', 'REVELATION_WITHOUT_REACTION']);
    assert.doesNotMatch(finding!.title, /[A-Z]{3,}/);
    assert.doesNotMatch(finding!.explanation, /[A-Z]{3,}/);
  });

  it('does not form when the same two rules land in unrelated, distant scenes', () => {
    const issues = [
      located('REVELATION_UNEARNED', 'Scene 5', 'scene', 'belief', { severity: 'major', startLine: 39, endLine: 48 }),
      located('REVELATION_WITHOUT_REACTION', 'Scene 9 → Scene 10', 'scene', 'causality', { severity: 'minor', startLine: 300, endLine: 320 }),
    ];
    const findings = clusterIssues(issues);
    assert.ok(
      !findings.some(f => f.title === 'The reveal comes from nowhere and changes nothing'),
      'the named hollow-reveal template must not appear when the rules are spatially unrelated',
    );
  });
});

describe('clusterIssues — root-cause template: "A character turns, and nothing caused it" (causeless-turn)', () => {
  it('fires when BELIEF_REVERSAL_UNSUPPORTED and UNMOTIVATED_DECISION land in the same scene', () => {
    const issues = [
      located('BELIEF_REVERSAL_UNSUPPORTED', 'Scene 9 (INT. HOSPITAL CORRIDOR - MORNING)', 'scene', 'belief', { severity: 'major', startLine: 73, endLine: 81 }),
      located('UNMOTIVATED_DECISION', 'Scene 9 (INT. HOSPITAL CORRIDOR - MORNING)', 'scene', 'causality', { severity: 'major', startLine: 73, endLine: 81 }),
    ];
    const findings = clusterIssues(issues);
    const finding = findings.find(f => f.title === 'A character turns, and nothing caused it');
    assert.ok(finding, 'expected the causeless-turn template to fire');
    assert.ok(finding!.id.startsWith('causeless-turn-'), 'template id should be recorded in the finding id');
    assert.equal(finding!.memberCount, 2);
    assert.equal(finding!.severity, 'major');
    assert.deepEqual(finding!.sceneIdxs, [9]);
    assert.deepEqual([...finding!.memberRules].sort(), ['BELIEF_REVERSAL_UNSUPPORTED', 'UNMOTIVATED_DECISION']);
    assert.doesNotMatch(finding!.title, /[A-Z]{3,}/);
    assert.doesNotMatch(finding!.explanation, /[A-Z]{3,}/);
  });

  it('does not form when the same two rules land in unrelated, distant scenes', () => {
    const issues = [
      located('BELIEF_REVERSAL_UNSUPPORTED', 'Scene 9 (INT. HOSPITAL CORRIDOR - MORNING)', 'scene', 'belief', { severity: 'major', startLine: 73, endLine: 81 }),
      located('UNMOTIVATED_DECISION', 'Scene 3 (INT. OFFICE - DAY)', 'scene', 'causality', { severity: 'major', startLine: 20, endLine: 25 }),
    ];
    const findings = clusterIssues(issues);
    assert.ok(
      !findings.some(f => f.title === 'A character turns, and nothing caused it'),
      'the named causeless-turn template must not appear when the rules are spatially unrelated',
    );
  });
});

describe('clusterIssues — Wave 1189 corpus-level proof (real script, real pipeline)', () => {
  it('at least one Wave 1189 root-cause template fires end-to-end on a real calibration corpus sample', async () => {
    const templateTitles = new Set([
      'Page one has no hook and no air',
      'The reveal comes from nowhere and changes nothing',
      'A character turns, and nothing caused it',
    ]);
    let firedOn: string | undefined;
    for (const sample of REFERENCE_CORPUS) {
      const report = await runScriptDoctor(sample.fountain);
      const issuesWithPass = report.passes.flatMap(p => p.issues.map(issue => ({ ...issue, pass: p.pass })));
      const located2 = locateIssues(issuesWithPass, sample.fountain);
      const findings = clusterIssues(located2);
      if (findings.some(f => templateTitles.has(f.title))) {
        firedOn = sample.label;
        break;
      }
    }
    assert.ok(firedOn, 'expected at least one Wave 1189 root-cause template to fire on at least one real corpus sample');
  });
});
