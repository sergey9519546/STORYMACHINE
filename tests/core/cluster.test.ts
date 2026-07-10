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

// ── Wave 1193 additions (Program v2, Type 4 — cross-pass duplicate-family
// merging + 4 document-mode root-cause templates; adversarial-review
// response) — see cluster.ts's own "Wave 1193 additions" comments (above the
// duplicate-family registry and above the four new ROOT_CAUSE_TEMPLATES
// entries) for the full audit trail of which rules were verified as real
// duplicates/co-occurrences vs. rejected as overlapping with existing
// coverage. Located issues in these tests use anchor 'document' with no
// startLine/endLine, matching how locate.ts actually resolves every member
// rule's free-form location text (verified against the pass source, not
// assumed) — the plural "Scenes N–M" and whole-script summary strings none
// of these rules ever produce a "Scene N" or "Lines N-M" match.

describe('clusterIssues — duplicate-family merge: "Seeded threads carry no feeling"', () => {
  it('merges 4 same-family rules (2 of them from the same intention.ts pass, matching real rulebook authorship) into one finding counting 4 issues across 3 distinct passes', () => {
    const issues = [
      // SEED_EMOTIONAL_DECOUPLED and PROACTIVE_EMOTION_DECOUPLED are both
      // genuinely authored in intention.ts in the real rulebook (Waves 451
      // and 339) — the family merge is keyed on member-rule identity, not on
      // pass identity, so two members sharing a pass is still real evidence,
      // just not a fourth independent pass. passCount below is 3 (intention,
      // payoff, character-arc), matching that real authorship map.
      located('SEED_EMOTIONAL_DECOUPLED', 'All 3 seed scene(s) — emotionally neutral', 'document', 'intention'),
      located('CLUE_SEED_EMOTION_FLAT', 'Clue-seeding scenes — emotional register', 'document', 'payoff'),
      located('PROACTIVE_EMOTION_DECOUPLED', 'Proactive scenes', 'document', 'intention'),
      located('ARC_SEED_EMOTIONAL_AFTERMATH_VOID', '3 seed scene(s) — all followed by emotionally neutral scenes', 'document', 'character-arc'),
    ];
    const findings = clusterIssues(issues);
    const finding = findings.find(f => f.title === 'Seeded threads carry no feeling');
    assert.ok(finding, 'expected the seed-scene-emotional-flatline family to merge');
    assert.ok(finding!.id.startsWith('seed-scene-emotional-flatline-'));
    assert.equal(finding!.memberCount, 4);
    assert.match(finding!.explanation, /3 separate checks agree/);
    assert.deepEqual(
      [...finding!.memberRules].sort(),
      ['ARC_SEED_EMOTIONAL_AFTERMATH_VOID', 'CLUE_SEED_EMOTION_FLAT', 'PROACTIVE_EMOTION_DECOUPLED', 'SEED_EMOTIONAL_DECOUPLED'],
    );
    assert.doesNotMatch(finding!.title, /[A-Z]{3,}/);
    assert.doesNotMatch(finding!.explanation, /[A-Z]{3,}/);
    // Only ONE finding for these 4 issues — no leftover generic cluster.
    assert.equal(findings.length, 1);
  });

  it('does not merge when only one family rule is present (no other member to duplicate)', () => {
    const issues = [
      located('SEED_EMOTIONAL_DECOUPLED', 'All 3 seed scene(s) — emotionally neutral', 'document', 'intention'),
      located('UNRELATED_RULE', 'Some other observation', 'document', 'voice'),
    ];
    assert.deepEqual(clusterIssues(issues), []);
  });

  it('does not merge two family rules fired by the SAME pass (not a cross-pass duplicate)', () => {
    // Contrived — no real pass fires two family members itself — but proves
    // the mechanism's cross-pass requirement rather than a same-pass count.
    const issues = [
      located('SEED_EMOTIONAL_DECOUPLED', 'All 3 seed scene(s) — emotionally neutral', 'document', 'intention'),
      located('PROACTIVE_EMOTION_DECOUPLED', 'Proactive scenes', 'document', 'intention'),
    ];
    assert.deepEqual(clusterIssues(issues), []);
  });
});

describe('clusterIssues — duplicate-family merge: dual-authorship rules', () => {
  it('merges PAYOFF_EMOTION_DECOUPLED fired independently by intention.ts and payoff.ts', () => {
    const issues = [
      located('PAYOFF_EMOTION_DECOUPLED', '3 payoff scenes — all emotionally neutral', 'document', 'intention'),
      located('PAYOFF_EMOTION_DECOUPLED', 'Payoff scenes — emotional register', 'document', 'payoff'),
    ];
    const findings = clusterIssues(issues);
    const finding = findings.find(f => f.title === 'Payoffs land with no feeling attached');
    assert.ok(finding, 'expected the dual-authorship PAYOFF_EMOTION_DECOUPLED family to merge');
    assert.equal(finding!.memberCount, 2);
    assert.deepEqual(finding!.memberRules, ['PAYOFF_EMOTION_DECOUPLED']);
    assert.match(finding!.explanation, /2 independent checks/);
  });

  it('merges REVELATION_RELATIONSHIP_DECOUPLED fired independently by belief.ts and intention.ts', () => {
    const issues = [
      located('REVELATION_RELATIONSHIP_DECOUPLED', 'Revelation scenes — relational impact', 'document', 'belief'),
      located('REVELATION_RELATIONSHIP_DECOUPLED', '3 revelation scene(s) — none with a relationship shift', 'document', 'intention'),
    ];
    const findings = clusterIssues(issues);
    const finding = findings.find(f => f.title === 'Discoveries never change how anyone relates to anyone');
    assert.ok(finding, 'expected the dual-authorship REVELATION_RELATIONSHIP_DECOUPLED family to merge');
    assert.equal(finding!.memberCount, 2);
  });

  it('does not merge PAYOFF_RELATIONSHIP_DECOUPLED with an unrelated document-anchored issue from a different family', () => {
    const issues = [
      located('PAYOFF_RELATIONSHIP_DECOUPLED', 'Payoff scenes — relational impact', 'document', 'payoff'),
      located('THEME_MUDDLED', 'Theme clarity', 'document', 'theme'),
    ];
    assert.deepEqual(clusterIssues(issues), []);
  });
});

describe('clusterIssues — root-cause template (document mode): "The story has no turning mechanism" (static-spine)', () => {
  it('fires when NO_REVERSALS, SUSPENSE_FLATLINE_RUN, and PURPOSE_MONOTONE_RUN all appear', () => {
    const issues = [
      located('NO_REVERSALS', 'Overall structure', 'document', 'structure', { severity: 'major' }),
      located('SUSPENSE_FLATLINE_RUN', '6 consecutive scenes — suspense flatline', 'document', 'pacing', { severity: 'minor' }),
      located('PURPOSE_MONOTONE_RUN', 'Scenes 2–7 (purpose: "setup")', 'document', 'structure', { severity: 'minor' }),
    ];
    const findings = clusterIssues(issues);
    const finding = findings.find(f => f.title === 'The story has no turning mechanism');
    assert.ok(finding, 'expected the static-spine template to fire');
    assert.ok(finding!.id.startsWith('static-spine-'));
    assert.equal(finding!.memberCount, 3);
    assert.equal(finding!.severity, 'major');
    assert.equal(finding!.startLine, undefined);
    assert.deepEqual(
      [...finding!.memberRules].sort(),
      ['NO_REVERSALS', 'PURPOSE_MONOTONE_RUN', 'SUSPENSE_FLATLINE_RUN'],
    );
    assert.doesNotMatch(finding!.title, /[A-Z]{3,}/);
    assert.doesNotMatch(finding!.explanation, /[A-Z]{3,}/);
  });

  it('does not fire when only two of the three required rules are present', () => {
    const issues = [
      located('NO_REVERSALS', 'Overall structure', 'document', 'structure', { severity: 'major' }),
      located('SUSPENSE_FLATLINE_RUN', '6 consecutive scenes — suspense flatline', 'document', 'pacing', { severity: 'minor' }),
    ];
    const findings = clusterIssues(issues);
    assert.ok(!findings.some(f => f.title === 'The story has no turning mechanism'));
  });
});

describe('clusterIssues — root-cause template (document mode): "Planted material never pays off" (promises-unkept)', () => {
  it('fires when CHEKHOV_GUN_UNFIRED and SETUP_PAYOFF_IMBALANCE both appear', () => {
    const issues = [
      located('CHEKHOV_GUN_UNFIRED', 'Scenes 0–4 (setup zone)', 'document', 'causality', { severity: 'minor' }),
      located('SETUP_PAYOFF_IMBALANCE', 'Setup/payoff distribution', 'document', 'causality', { severity: 'minor' }),
    ];
    const findings = clusterIssues(issues);
    const finding = findings.find(f => f.title === 'Planted material never pays off');
    assert.ok(finding, 'expected the promises-unkept template to fire');
    assert.ok(finding!.id.startsWith('promises-unkept-'));
    assert.equal(finding!.memberCount, 2);
    assert.doesNotMatch(finding!.title, /[A-Z]{3,}/);
    assert.doesNotMatch(finding!.explanation, /[A-Z]{3,}/);
  });

  it('does not fire when only SETUP_PAYOFF_IMBALANCE is present', () => {
    const issues = [
      located('SETUP_PAYOFF_IMBALANCE', 'Setup/payoff distribution', 'document', 'causality', { severity: 'minor' }),
      located('UNRELATED_RULE', 'Some other observation', 'document', 'voice'),
    ];
    assert.deepEqual(clusterIssues(issues), []);
  });
});

describe('clusterIssues — root-cause template (document mode): "The character changes, but nothing pushed them there" (unearned-change)', () => {
  it('fires when UNMOTIVATED_TRANSFORMATION and ESCALATION_PLATEAU both appear', () => {
    const issues = [
      located('UNMOTIVATED_TRANSFORMATION', 'Mid-story character arc', 'document', 'character-arc', { severity: 'major' }),
      located('ESCALATION_PLATEAU', 'Suspense escalation arc', 'document', 'causality', { severity: 'minor' }),
    ];
    const findings = clusterIssues(issues);
    const finding = findings.find(f => f.title === 'The character changes, but nothing pushed them there');
    assert.ok(finding, 'expected the unearned-change template to fire');
    assert.ok(finding!.id.startsWith('unearned-change-'));
    assert.equal(finding!.memberCount, 2);
    assert.equal(finding!.severity, 'major');
    assert.doesNotMatch(finding!.title, /[A-Z]{3,}/);
    assert.doesNotMatch(finding!.explanation, /[A-Z]{3,}/);
  });

  it('does not fire when only UNMOTIVATED_TRANSFORMATION is present', () => {
    const issues = [
      located('UNMOTIVATED_TRANSFORMATION', 'Mid-story character arc', 'document', 'character-arc', { severity: 'major' }),
    ];
    assert.deepEqual(clusterIssues(issues), []);
  });
});

describe('clusterIssues — root-cause template (document mode): "The story is being told in conversation, not in action" (talk-over-action)', () => {
  it('fires when DIALOGUE_DOMINANCE (whole-script ratio) and TALKING_HEADS (a local run) both appear', () => {
    const issues = [
      located('DIALOGUE_DOMINANCE', 'Script dialogue/action balance', 'document', 'originality', { severity: 'minor' }),
      located('TALKING_HEADS', 'Lines 40–58', 'lines', 'dialogue', { severity: 'minor', startLine: 40, endLine: 58 }),
    ];
    const findings = clusterIssues(issues);
    const finding = findings.find(f => f.title === 'The story is being told in conversation, not in action');
    assert.ok(finding, 'expected the talk-over-action template to fire');
    assert.ok(finding!.id.startsWith('talk-over-action-'));
    assert.equal(finding!.memberCount, 2);
    // A mixed-anchor group (one document, one lines) still reports the
    // lines-bearing member's span rather than crashing on Math.min(undefined).
    assert.equal(finding!.startLine, 40);
    assert.equal(finding!.endLine, 58);
    assert.doesNotMatch(finding!.title, /[A-Z]{3,}/);
    assert.doesNotMatch(finding!.explanation, /[A-Z]{3,}/);
  });

  it('does not fire when only TALKING_HEADS is present without the script-wide ratio check', () => {
    const issues = [
      located('TALKING_HEADS', 'Lines 40–58', 'lines', 'dialogue', { severity: 'minor', startLine: 40, endLine: 58 }),
    ];
    assert.deepEqual(clusterIssues(issues), []);
  });
});

describe('clusterIssues — Wave 1193 corpus-level proof (real script, real pipeline)', () => {
  it('runs the full pipeline over every calibration sample without throwing, and any family/template finding stays free of raw rule tokens', async () => {
    // Named findings (duplicate families + templates, both spatial and
    // document mode) carry hand-authored explanation text, unlike the
    // generic clusterers' titles (which legitimately embed an ALL-CAPS
    // character NAME via characterLabel — not a rule-token leak, so that
    // mechanism is intentionally excluded from this guard). This checks the
    // new Wave 1193 mechanisms specifically don't leak a rule constant.
    const namedTitles = new Set([
      'Seeded threads carry no feeling', 'Payoffs land with no feeling attached',
      'Payoffs never move a relationship', 'Discoveries never change how anyone relates to anyone',
      'The story has no turning mechanism', 'Planted material never pays off',
      'The character changes, but nothing pushed them there',
      'The story is being told in conversation, not in action',
    ]);
    for (const sample of REFERENCE_CORPUS) {
      const report = await runScriptDoctor(sample.fountain);
      const issuesWithPass = report.passes.flatMap(p => p.issues.map(issue => ({ ...issue, pass: p.pass })));
      const located2 = locateIssues(issuesWithPass, sample.fountain);
      const findings = clusterIssues(located2);
      for (const finding of findings) {
        if (!namedTitles.has(finding.title)) continue;
        assert.doesNotMatch(finding.title, /[A-Z]{3,}/);
        assert.doesNotMatch(finding.explanation, /[A-Z]{3,}/);
      }
    }
  });
});
