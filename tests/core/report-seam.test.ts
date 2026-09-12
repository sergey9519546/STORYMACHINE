// WHAT THE REPORT SAYS ABOUT ITS OWN NUMBERS.
//
// ── What this file is for (2026-09-12, writer's-loop findings 12 and 13) ────
// Two defects at the seam between the score and the sentences beside it:
//
//   12. `buildDimensionSummary`'s top two bands read "a handful of <severity>
//       notes" with no number, while the caption directly beneath them in the
//       panel stated the real one. On the 231-scene fixture that rendered as
//       "Character is in good shape — a handful of minor notes" next to "Based
//       on 342 issues across 3 passes"; Plot Logic managed it over 278 and even
//       the 12-scene sample over 58. The three lower bands already interpolated
//       the count correctly, so the top two were the exception, not the rule.
//
//   13. The ranked list a writer acts on had no notion of WHERE a finding is.
//       It sorted by severity and then by pass order, so act-shape checks that
//       fire on nearly every short script filled all ten slots and a defect
//       concentrated in one scene never appeared.
//
// Both directions are asserted. A summary that always printed a count would
// pass a count test while saying something else false, so the copy is checked
// against the dimension's real issue mix; and a ranking that always led with
// the busiest scene would bury a genuine whole-draft critical, so the
// criticals are asserted to survive.

import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

import { runScriptDoctor } from '../../server/nvm/analyze/doctor.ts';
import type { ScriptDoctorReport } from '../../server/nvm/analyze/types.ts';

const REPO_ROOT = path.resolve(import.meta.dirname, '../..');
const ONE_BAD_SCENE = 'tests/fixtures/localisation/one-bad-scene.fountain';
const FEATURE = 'tests/fixtures/feature-length/assembled-feature.fountain';

function read(f: string): string { return readFileSync(path.join(REPO_ROOT, f), 'utf8'); }

describe('every dimension summary states its own count (finding 12)', () => {
  let feature: ScriptDoctorReport;
  before(async () => { feature = await runScriptDoctor(read(FEATURE)); });

  /** `dimensions` is optional on the report type; a feature-length fixture that
   *  produced none would make every assertion below vacuous, so it is checked
   *  once rather than defended against five times. */
  const dims = (): NonNullable<ScriptDoctorReport['dimensions']> => {
    assert.ok(feature.dimensions && feature.dimensions.length > 0, 'the feature fixture produced no dimensions');
    return feature.dimensions!;
  };

  it('no dimension summary says "a handful"', () => {
    for (const d of dims()) {
      assert.doesNotMatch(
        d.summary, /handful/i,
        `${d.label}'s summary says "handful": ${JSON.stringify(d.summary)}. The word is the only one in that `
        + 'sentence a reader can check, and it was the only one that was false — on this fixture the top-band '
        + 'branch printed it over 342 issues.',
      );
    }
  });

  it('every dimension summary contains a number, and it is that dimension\'s dominant count', () => {
    for (const d of dims()) {
      // A dimension with no issues at all takes the "reads cleanly" branch,
      // which legitimately has no count — assert that separately rather than
      // demanding a number from a sentence that should not have one.
      if (/reads cleanly/.test(d.summary)) {
        assert.equal(d.issueCount, 0, `${d.label} says "reads cleanly" over ${d.issueCount} issues`);
        continue;
      }
      assert.match(
        d.summary, /\d/,
        `${d.label}'s summary has no number in it: ${JSON.stringify(d.summary)}`,
      );
    }
  });

  it('the top-band sentence explains how a draft can read well with many notes', () => {
    // The honest version of "95/100 over 342 notes" needs one clause or it
    // reads as a contradiction. Asserted only where it applies.
    const heavy = dims().filter((d) => /is in good shape/.test(d.summary));
    assert.ok(heavy.length > 0, 'this fixture should have at least one top-band dimension');
    for (const d of heavy) {
      const m = /(\d+) \w+ note\(s\)/.exec(d.summary);
      assert.ok(m, `could not find the count in ${JSON.stringify(d.summary)}`);
      if (Number(m![1]) >= 12) {
        assert.match(
          d.summary, /density-normalised/,
          `${d.label} reports ${m![1]} notes in its top band without saying why that can still read well: `
          + JSON.stringify(d.summary),
        );
      }
    }
  });

  it('the summary and the panel caption cannot disagree about the count', () => {
    for (const d of dims()) {
      const m = /(\d+) \w+ (?:note|problem)\(s\)/.exec(d.summary);
      if (!m) continue;
      assert.ok(
        Number(m[1]) <= d.issueCount,
        `${d.label}'s summary claims ${m[1]} of its dominant severity but the dimension has only `
        + `${d.issueCount} issues in total`,
      );
    }
  });
});

describe('the ranked list finds a defect concentrated in one scene (finding 13)', () => {
  let report: ScriptDoctorReport;
  before(async () => { report = await runScriptDoctor(read(ONE_BAD_SCENE)); });

  it('the fixture is what it claims: 12 scenes, one of them carrying the defect', () => {
    assert.equal(report.sceneCount, 12);
    const heat = report.sceneHeatmap;
    const last = heat[heat.length - 1];
    const others = heat.slice(0, -1).map((h) => h.issueCount);
    assert.ok(
      last.issueCount > Math.max(...others),
      `scene 12 carries ${last.issueCount} issues against a maximum of ${Math.max(...others)} elsewhere — `
      + 'if that stops being true the fixture no longer tests localisation',
    );
  });

  it('THE ASSERTION THAT WOULD HAVE CAUGHT IT: the exposition defect appears in the ranked list', () => {
    const rules = report.topPriorities.map((p) => p.rule);
    assert.ok(
      rules.includes('AS_YOU_KNOW_BOB'),
      `the ranked list is ${JSON.stringify(rules)} and none of it is the defect. Before 2026-09-12 this list `
      + 'was MISSING_INCITING_INCIDENT / PASSIVE_ACT3_INTENTION / NO_REVERSALS_LONG_STORY / WEAK_MIDPOINT / '
      + 'NO_REVERSALS / ACT1_BOUNDARY_WEAK / ACT2_BOUNDARY_WEAK / REVELATION_DROUGHT x3 — ten act-shape checks '
      + 'that fire on nearly every short script, and scene 12 did not appear at all.',
    );
  });

  it('so does at least one finding anchored to the defect scene by name', () => {
    const atScene12 = report.topPriorities.filter((p) => /Scene 12\b/.test(p.location));
    assert.ok(
      atScene12.length > 0,
      `no entry in the ranked list names Scene 12: ${JSON.stringify(report.topPriorities.map((p) => p.location))}`,
    );
  });

  it('and the criticals are not buried by it — severity still leads', () => {
    // The over-correction this ranking must not make. A whole-draft critical
    // outranks a concentrated major, always.
    const severities = report.topPriorities.map((p) => p.severity);
    const firstMajor = severities.indexOf('major');
    const lastCritical = severities.lastIndexOf('critical');
    if (firstMajor !== -1 && lastCritical !== -1) {
      assert.ok(
        lastCritical < firstMajor,
        `a major appears at ${firstMajor} before a critical at ${lastCritical}: ${JSON.stringify(severities)}`,
      );
    }
    assert.ok(
      report.topPriorities.some((p) => p.severity === 'critical' && !/Scene 12/.test(p.location)),
      'every critical in the list is now in the busy scene — concentration has stopped being a tie-break and '
      + 'started being the sort',
    );
  });

  it('no single rule owns the list — the mirror-image failure is capped too', () => {
    // The first version of this ranking put SEVEN AS_YOU_KNOW_BOB entries in
    // the ten slots. A writer learns no more from seven copies of a note than
    // from none of it.
    const counts = new Map<string, number>();
    for (const p of report.topPriorities) counts.set(p.rule, (counts.get(p.rule) ?? 0) + 1);
    for (const [rule, n] of counts) {
      assert.ok(n <= 2, `${rule} occupies ${n} of the ${report.topPriorities.length} slots`);
    }
    assert.equal(report.topPriorities.length, 10, 'the list must still be ten long — the cap relaxes rather than shortening it');
  });

  it('the ranking is deterministic', async () => {
    const again = await runScriptDoctor(read(ONE_BAD_SCENE));
    assert.deepEqual(
      again.topPriorities.map((p) => `${p.rule}@${p.location}`),
      report.topPriorities.map((p) => `${p.rule}@${p.location}`),
    );
  });

  it('an issue location is a line number in the WRITER\'S file, not in the analyzer\'s copy', () => {
    // The cost of stripping non-printing text, checked rather than assumed.
    // stripNonPrinting and stripTitlePage BLANK the lines they remove instead
    // of deleting them precisely so this stays true; deleting the fixture's
    // 18-line provenance boneyard would slide every location 18 lines up.
    const lines = read(ONE_BAD_SCENE).split('\n');
    const withLine = report.topPriorities.filter((p) => /^Line (\d+)/.test(p.location));
    assert.ok(withLine.length > 0, 'this fixture should produce at least one line-anchored finding');
    for (const p of withLine) {
      const n = Number(/^Line (\d+)/.exec(p.location)![1]);
      const text = lines[n - 1] ?? '';
      assert.match(
        text, /as you know/i,
        `${p.rule} points at line ${n}, which in the writer's own file reads ${JSON.stringify(text)}. `
        + 'Line numbering has slid — see stripNonPrinting\'s comment on blanking rather than deleting.',
      );
    }
  });
});
