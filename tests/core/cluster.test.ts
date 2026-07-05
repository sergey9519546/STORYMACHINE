// Script Doctor — tests for cluster.ts, the "roll co-firing LocatedIssues up
// into named RootCauseFindings" module. Conventions: node:test +
// assert/strict, matching tests/core/locate.test.ts and
// tests/core/fountain-analyzer.test.ts.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { clusterIssues } from '../../server/nvm/analyze/cluster.ts';
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
