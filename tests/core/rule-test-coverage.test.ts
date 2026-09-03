// CI tripwire for retrospective finding #6 (2026-09-02 audit, §6):
// docs/rulebook/README.md used to claim every rule constant is "fire-tested
// and no-fire-tested" as a hardcoded string in scripts/generate-rulebook.ts,
// never actually measured — 21 of 3,186 distinct rule constants had zero
// occurrence anywhere under tests/. scripts/measure-rule-test-coverage.mjs is
// the real measurement (it reuses generate-rulebook.ts's own extractAllPasses
// enumeration, so there is one source of truth for "the set of rule
// constants," never a second regex). This test asserts two things going
// forward:
//   1. The zero-occurrence list stays EMPTY — a future rule added with no
//      test reference fails CI immediately instead of silently joining the
//      untested pile the retrospective found.
//   2. docs/rulebook/README.md's published coverage sentence cannot drift
//      from the live measurement — if a wave changes the rule set and nobody
//      re-runs `npm run rulebook`, this fails and points at the fix.
// See docs/rulebook/COVERAGE_2026-09-03.md for the method, before/after
// numbers, and the 21 rules that were untested when this test was written.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { measureCoverage } from '../../scripts/measure-rule-test-coverage.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '../..');
const README_PATH = path.join(REPO_ROOT, 'docs/rulebook/README.md');

// Computed once at module scope and reused by every assertion below — this
// scan walks every file under tests/** against every rule constant name
// (~9s), so running it fresh per `it()` would triple the suite's cost for no
// benefit: the measurement is a pure function of the checked-out tree, and
// nothing in this file mutates it between assertions.
const report = measureCoverage();

describe('rule test coverage (retrospective 2026-09-02 §6)', () => {
  it('every distinct rule constant is referenced by at least one file under tests/**', () => {
    assert.equal(
      report.zeroOccurrenceCount, 0,
      `${report.zeroOccurrenceCount} rule constant(s) have zero occurrence anywhere under tests/**: ` +
      `${report.zeroOccurrenceRules.join(', ')}. Add a fire/no-fire behavioural test for each ` +
      '(see docs/rulebook/COVERAGE_2026-09-03.md for the pattern used for the original 21), or if a ' +
      'rule is genuinely unreachable, write a test that documents that and marks it `// KNOWN WEAKNESS:` ' +
      '— never delete a rule constant to make this pass.',
    );
  });

  it('every rule record extracted by the generator resolves to a distinct name covered by the measurement', () => {
    // Sanity cross-check: totalRuleRecords (the rulebook's published "Total
    // distinct rules" count, one row per (pass, rule-constant-name)) must be
    // >= totalDistinctRuleNames (unique constant names) — never the reverse,
    // and never zero, or the enumeration itself is broken.
    assert.ok(report.totalDistinctRuleNames > 0, 'measured zero distinct rule constants — the enumeration is broken');
    assert.ok(
      report.totalRuleRecords >= report.totalDistinctRuleNames,
      `totalRuleRecords (${report.totalRuleRecords}) must be >= totalDistinctRuleNames ` +
      `(${report.totalDistinctRuleNames}) — a name can recur across passes but a distinct name can't ` +
      'outnumber its own records',
    );
  });

  it("docs/rulebook/README.md's published coverage sentence matches the live measurement " +
    '(fails when the docs go stale after a wave — re-run `npm run rulebook`)', () => {
    const readme = readFileSync(README_PATH, 'utf8');
    const m = /(\d+) of (\d+) rule constants are referenced by at least one test/.exec(readme);
    assert.ok(
      m,
      'docs/rulebook/README.md does not contain the "N of M rule constants are referenced..." ' +
      'coverage sentence — run `npm run rulebook` to (re)generate it',
    );

    const publishedTested = parseInt(m![1], 10);
    const publishedTotal = parseInt(m![2], 10);

    assert.equal(
      publishedTotal, report.totalDistinctRuleNames,
      `README says ${publishedTotal} total distinct rule constants, but the live measurement now ` +
      `finds ${report.totalDistinctRuleNames} — the docs are stale. Run \`npm run rulebook\` to ` +
      'regenerate and commit the result.',
    );
    assert.equal(
      publishedTested, report.testedDistinctRuleNames,
      `README says ${publishedTested} rule constants are tested, but the live measurement now finds ` +
      `${report.testedDistinctRuleNames} — the docs are stale. Run \`npm run rulebook\` to regenerate ` +
      'and commit the result.',
    );
  });
});
