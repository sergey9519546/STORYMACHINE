// Script Doctor — tests for prioritize.ts, the "what should I fix first?"
// display ordering the routes attach beside `topPriorities`. Conventions:
// node:test + assert/strict, matching tests/core/locate.test.ts and
// tests/core/cluster.test.ts.

import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildPrioritizedIssues, suppressContradictoryFindings } from '../../server/nvm/analyze/prioritize.ts';
import { clusterIssues } from '../../server/nvm/analyze/cluster.ts';
import { locateIssues, sceneLineSpans } from '../../server/nvm/analyze/locate.ts';
import { runScriptDoctor } from '../../server/nvm/analyze/doctor.ts';
import { REFERENCE_CORPUS } from '../../server/nvm/analyze/calibration/corpus.ts';
import type { IssueAnchor, LocatedIssue, RootCauseFinding } from '../../server/nvm/analyze/types.ts';
import type { PassName, RevisionIssue } from '../../server/nvm/revision/passes/types.ts';

function located(
  rule: string,
  anchor: IssueAnchor,
  opts: {
    severity?: RevisionIssue['severity'];
    startLine?: number;
    endLine?: number;
    location?: string;
    pass?: PassName;
  } = {},
): LocatedIssue {
  return {
    issue: {
      location: opts.location ?? rule,
      rule,
      description: `${rule} description`,
      severity: opts.severity ?? 'minor',
    },
    pass: opts.pass ?? 'structure',
    anchor,
    startLine: opts.startLine,
    endLine: opts.endLine,
  };
}

describe('buildPrioritizedIssues — ordering', () => {
  it('orders by anchor quality first: lines, then scene, then character, then document', () => {
    const issues = [
      located('D', 'document'),
      located('C', 'character', { startLine: 5, endLine: 5 }),
      located('S', 'scene', { startLine: 1, endLine: 4 }),
      located('L', 'lines', { startLine: 2, endLine: 3 }),
    ];
    assert.deepEqual(
      buildPrioritizedIssues(issues).map(p => p.issue.rule),
      ['L', 'S', 'C', 'D'],
    );
  });

  it('promotes an anchored issue over a more severe unanchored one — the whole point', () => {
    // This is the failure the lane exists to fix: buildTopPriorities would put
    // the critical document-level note first, and the writer cannot open the
    // editor to "Dialogue throughout".
    const issues = [
      located('WHOLE_SCRIPT', 'document', { severity: 'critical', location: 'Dialogue throughout' }),
      located('SCENE_FOUR', 'scene', { severity: 'minor', startLine: 13, endLine: 16 }),
    ];
    assert.deepEqual(
      buildPrioritizedIssues(issues).map(p => p.issue.rule),
      ['SCENE_FOUR', 'WHOLE_SCRIPT'],
    );
  });

  it('breaks an anchor-tier tie by severity', () => {
    const issues = [
      located('MINOR', 'scene', { severity: 'minor', startLine: 1, endLine: 4 }),
      located('CRITICAL', 'scene', { severity: 'critical', startLine: 9, endLine: 12 }),
      located('MAJOR', 'scene', { severity: 'major', startLine: 5, endLine: 8 }),
    ];
    assert.deepEqual(
      buildPrioritizedIssues(issues).map(p => p.issue.rule),
      ['CRITICAL', 'MAJOR', 'MINOR'],
    );
  });

  it('breaks an anchor+severity tie by cluster membership, then by cluster size', () => {
    const lonely = located('LONELY', 'scene', { severity: 'major', startLine: 1, endLine: 4 });
    const small = located('SMALL', 'scene', { severity: 'major', startLine: 5, endLine: 8 });
    const big = located('BIG', 'scene', { severity: 'major', startLine: 9, endLine: 12 });
    const findings: RootCauseFinding[] = [
      {
        id: 'f-small', title: 'small', explanation: '', severity: 'major',
        memberRules: ['SMALL'], memberCount: 2, sceneIdxs: [1], startLine: 5, endLine: 8,
      },
      {
        id: 'f-big', title: 'big', explanation: '', severity: 'major',
        memberRules: ['BIG'], memberCount: 9, sceneIdxs: [2], startLine: 9, endLine: 12,
      },
    ];
    const ordered = buildPrioritizedIssues([lonely, small, big], findings);
    assert.deepEqual(ordered.map(p => p.issue.rule), ['BIG', 'SMALL', 'LONELY']);
    assert.equal(ordered[0].clusterId, 'f-big');
    assert.equal(ordered[0].clusterSize, 9);
    assert.equal(ordered[2].clusterId, undefined);
  });

  it('attaches the most specific claiming finding when several match', () => {
    const li = located('R', 'scene', { startLine: 9, endLine: 12 });
    const findings: RootCauseFinding[] = [
      {
        id: 'wide', title: 'wide', explanation: '', severity: 'minor',
        memberRules: ['R'], memberCount: 12, sceneIdxs: [0, 1, 2], startLine: 1, endLine: 32,
      },
      {
        id: 'tight', title: 'tight', explanation: '', severity: 'minor',
        memberRules: ['R'], memberCount: 3, sceneIdxs: [2], startLine: 9, endLine: 12,
      },
    ];
    assert.equal(buildPrioritizedIssues([li], findings)[0].clusterId, 'tight');
  });

  it('never claims an issue for a finding whose span does not contain it', () => {
    const li = located('R', 'scene', { startLine: 25, endLine: 32 });
    const findings: RootCauseFinding[] = [{
      id: 'elsewhere', title: 'elsewhere', explanation: '', severity: 'minor',
      memberRules: ['R'], memberCount: 4, sceneIdxs: [0], startLine: 1, endLine: 4,
    }];
    assert.equal(buildPrioritizedIssues([li], findings)[0].clusterId, undefined);
  });

  it('caps the list at ten and is deterministic across calls', () => {
    const issues = Array.from({ length: 40 }, (_, i) =>
      located(`RULE_${i}`, 'scene', { startLine: i + 1, endLine: i + 2 }));
    const first = buildPrioritizedIssues(issues);
    assert.equal(first.length, 10);
    assert.deepEqual(first, buildPrioritizedIssues(issues));
  });

  it('returns an empty list for no issues', () => {
    assert.deepEqual(buildPrioritizedIssues([]), []);
  });

  it('omits startLine/endLine entirely for a document-anchored entry', () => {
    const [entry] = buildPrioritizedIssues([located('D', 'document')]);
    assert.equal('startLine' in entry, false);
    assert.equal('endLine' in entry, false);
  });
});

describe('buildPrioritizedIssues — the anchored-lead guarantee on real analysis', () => {
  /** The contract the lane is measured against: whenever the draft produced at
   *  least three scene- or lines-anchored findings, the first three entries of
   *  the actionable list are all anchored. Asserted over every calibration
   *  sample and both real screenplay fixtures, through the real doctor. */
  function assertAnchoredLead(label: string, locatedIssues: LocatedIssue[], findings: RootCauseFinding[]): void {
    const anchoredCount = locatedIssues.filter(l => l.anchor === 'scene' || l.anchor === 'lines').length;
    const prioritized = buildPrioritizedIssues(locatedIssues, findings);
    if (anchoredCount < 3) return;
    assert.ok(prioritized.length >= 3, `${label}: expected at least three prioritized entries`);
    for (const entry of prioritized.slice(0, 3)) {
      assert.ok(
        entry.anchor === 'scene' || entry.anchor === 'lines',
        `${label}: prioritized entry "${entry.issue.rule}" leads with anchor "${entry.anchor}"`,
      );
    }
  }

  it('holds across all 20 calibration samples', async () => {
    let measured = 0;
    for (const sample of REFERENCE_CORPUS) {
      const report = await runScriptDoctor(sample.fountain);
      const issuesWithPass = report.passes.flatMap(p => p.issues.map(issue => ({ ...issue, pass: p.pass })));
      const locatedIssues = locateIssues(issuesWithPass, sample.fountain);
      const findings = clusterIssues(locatedIssues, sceneLineSpans(sample.fountain));
      assertAnchoredLead(sample.label, locatedIssues, findings);
      if (locatedIssues.filter(l => l.anchor === 'scene' || l.anchor === 'lines').length >= 3) measured++;
    }
    assert.ok(measured >= 15, `expected most corpus samples to reach three anchored findings, got ${measured}/20`);
  });

  it('holds on the two real screenplay fixtures, and beats the severity-only ordering there', async () => {
    for (const name of ['chain-of-custody', 'red-line']) {
      const fountain = readFileSync(new URL(`../../data/screenplays/${name}.fountain`, import.meta.url), 'utf8');
      const report = await runScriptDoctor(fountain);
      const issuesWithPass = report.passes.flatMap(p => p.issues.map(issue => ({ ...issue, pass: p.pass })));
      const locatedIssues = locateIssues(issuesWithPass, fountain);
      const findings = clusterIssues(locatedIssues, sceneLineSpans(fountain));
      assertAnchoredLead(name, locatedIssues, findings);

      // And the ordering must actually be doing work: the report's own
      // severity-then-pass-order topPriorities leads with an unanchored
      // finding on both of these fixtures, which is the observation this lane
      // was opened on. If that ever stops being true the comparison below is
      // simply skipped rather than failing — the guarantee above is the
      // contract; this is the evidence.
      const byRule = new Map(locatedIssues.map(l => [l.issue.rule, l] as const));
      const topAnchor = byRule.get(report.topPriorities[0]?.rule ?? '')?.anchor;
      if (topAnchor === 'document') {
        assert.notEqual(
          buildPrioritizedIssues(locatedIssues, findings)[0].anchor,
          'document',
          `${name}: prioritized still leads with an unanchored finding`,
        );
      }
    }
  });
});

// ── Contradiction suppression (2026-09-04, advice-quality audit item 10) ───
// Both pairs below are the exact ones the audit measured against real script
// text — see prioritize.ts's CONTRADICTORY_PAIRS comment for the full
// reasoning behind each kept/dropped rule.
function priorityIssue(rule: string, overrides: Partial<RevisionIssue> = {}): RevisionIssue & { pass: PassName } {
  return {
    rule,
    location: `${rule} location`,
    description: `${rule} description`,
    severity: 'major',
    pass: 'structure',
    ...overrides,
  };
}

describe('suppressContradictoryFindings', () => {
  it('drops INCITING_INCIDENT_TOO_LATE when FALSE_CLIMAX is also present', () => {
    const items = [priorityIssue('FALSE_CLIMAX'), priorityIssue('INCITING_INCIDENT_TOO_LATE')];
    const rules = suppressContradictoryFindings(items).map(i => i.rule);
    assert.deepEqual(rules, ['FALSE_CLIMAX']);
  });

  it('drops INCITING_INCIDENT_TOO_LATE when CLIMAX_TOO_EARLY is also present', () => {
    const items = [priorityIssue('CLIMAX_TOO_EARLY'), priorityIssue('INCITING_INCIDENT_TOO_LATE')];
    const rules = suppressContradictoryFindings(items).map(i => i.rule);
    assert.deepEqual(rules, ['CLIMAX_TOO_EARLY']);
  });

  it('drops PURPOSE_CLIMAX_ABSENT when PROTAGONIST_PASSIVITY_CLIMAX is also present', () => {
    const items = [priorityIssue('PROTAGONIST_PASSIVITY_CLIMAX'), priorityIssue('PURPOSE_CLIMAX_ABSENT')];
    const rules = suppressContradictoryFindings(items).map(i => i.rule);
    assert.deepEqual(rules, ['PROTAGONIST_PASSIVITY_CLIMAX']);
  });

  it('never contains both members of any listed pair, on either input order', () => {
    const pairs: Array<[string, string]> = [
      ['CLIMAX_TOO_EARLY', 'INCITING_INCIDENT_TOO_LATE'],
      ['FALSE_CLIMAX', 'INCITING_INCIDENT_TOO_LATE'],
      ['PROTAGONIST_PASSIVITY_CLIMAX', 'PURPOSE_CLIMAX_ABSENT'],
    ];
    for (const [a, b] of pairs) {
      for (const items of [[priorityIssue(a), priorityIssue(b)], [priorityIssue(b), priorityIssue(a)]]) {
        const rules = new Set(suppressContradictoryFindings(items).map(i => i.rule));
        assert.ok(!(rules.has(a) && rules.has(b)), `both ${a} and ${b} survived together`);
      }
    }
  });

  it('is one-directional: the suppressed rule survives alone, uncorroborated', () => {
    const items = [priorityIssue('INCITING_INCIDENT_TOO_LATE'), priorityIssue('PURPOSE_CLIMAX_ABSENT')];
    assert.deepEqual(
      suppressContradictoryFindings(items).map(i => i.rule).sort(),
      ['INCITING_INCIDENT_TOO_LATE', 'PURPOSE_CLIMAX_ABSENT'],
    );
  });

  it('leaves unrelated findings, and their order, untouched', () => {
    const items = [
      priorityIssue('DIALOGUE_ON_THE_NOSE'),
      priorityIssue('FALSE_CLIMAX'),
      priorityIssue('WEAK_MIDPOINT'),
      priorityIssue('INCITING_INCIDENT_TOO_LATE'),
      priorityIssue('NO_REVERSALS'),
    ];
    assert.deepEqual(
      suppressContradictoryFindings(items).map(i => i.rule),
      ['DIALOGUE_ON_THE_NOSE', 'FALSE_CLIMAX', 'WEAK_MIDPOINT', 'NO_REVERSALS'],
    );
  });

  it('is a no-op on an input with no contradictory rule present', () => {
    const items = [priorityIssue('DIALOGUE_ON_THE_NOSE'), priorityIssue('WEAK_MIDPOINT')];
    assert.deepEqual(suppressContradictoryFindings(items), items);
  });

  it('is a no-op on an empty list', () => {
    assert.deepEqual(suppressContradictoryFindings([]), []);
  });
});
