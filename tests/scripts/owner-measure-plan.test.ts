// THE PLAN RECORD AND THE OWNER NOTE MUST STATE THE SAME ORDER.
//
// `npm run owner:measure` executes docs/p1-benchmark/owner-measurement-plan.json;
// a person reads the table in docs/brain/Owner/Owner - R5 Measurement and
// Merge.md. Two artifacts, one order. This file is the mechanical check that
// they agree — the reason the script reads a record instead of carrying a
// hardcoded list, and the reason the note's table is not decoration.
//
// It earned its keep on the day it was written: the note's table said
// `scoring/renderer-residuals` was at `56b96765`, and `origin` had `a4df0c49`
// (one review commit later). The comparison below is what printed that.
//
// Every refusal in validatePlan is shown FAILING on the input it exists for.
// A plan whose `tip` is missing would turn the pre-flight's stale-tip stop into
// a no-op, which is the one guard whose absence cannot be seen in the output.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import {
  PlanError, comparePlanWithNote, formatPlan, parseNoteBranchTable, planBranchOrder,
  stepEligibility, validatePlan, wrap,
} from '../../scripts/lib/owner-measure-plan.mjs';

const REPO = path.resolve(import.meta.dirname, '../..');
const PLAN_PATH = path.join(REPO, 'docs/p1-benchmark/owner-measurement-plan.json');

function loadPlan() {
  return validatePlan(JSON.parse(readFileSync(PLAN_PATH, 'utf8')));
}

/** A minimal plan the shape checks accept, so each check can be broken one at
 *  a time and shown firing. */
function goodPlan(): Record<string, unknown> {
  return {
    schemaVersion: 1,
    updated: '2026-09-13',
    note: 'docs/brain/Owner/Owner - R5 Measurement and Merge.md',
    remote: 'origin',
    baseline: { ref: 'main', reason: 'the baseline' },
    steps: [
      {
        id: 'first', branch: 'scoring/a', tip: 'a'.repeat(40), base: 'b'.repeat(40),
        when: 'always', gate: 'accept-reject', reason: 'first',
        receiptRanges: [`${'b'.repeat(40)}..HEAD`],
      },
      {
        id: 'second', branch: 'scoring/b', tip: 'c'.repeat(40), base: 'b'.repeat(40),
        when: 'if-accepted:first', gate: 'report', reason: 'second',
        receiptRanges: [`${'b'.repeat(40)}..HEAD`],
      },
    ],
    lock: { command: 'npm run lock-auc24', artifact: 'tests/fixtures/auc24-table.json', reason: 'the deadline' },
  };
}

describe('the committed plan record', () => {
  it('parses and satisfies every shape rule', () => {
    const plan = loadPlan();
    assert.equal(plan.schemaVersion, 1);
    assert.ok(plan.steps.length >= 3, 'the plan must schedule the branches the note lists');
  });

  it('agrees with the owner note, branch for branch, tip for tip, in order', () => {
    const plan = loadPlan();
    const note = readFileSync(path.join(REPO, plan.note), 'utf8');
    const problems = comparePlanWithNote(plan, note);
    assert.deepEqual(
      problems, [],
      `the owner note and ${path.relative(REPO, PLAN_PATH)} disagree:\n  - ${problems.join('\n  - ')}`,
    );
  });

  it('names every branch the note names, and no others', () => {
    const plan = loadPlan();
    const note = readFileSync(path.join(REPO, plan.note), 'utf8');
    const noteBranches = parseNoteBranchTable(note).map((r) => r.branch).sort();
    const planBranches = planBranchOrder(plan).map((r) => r.branch).sort();
    assert.deepEqual(planBranches, noteBranches);
  });

  it('measures the top of a stack, and lists its members in order', () => {
    const plan = loadPlan();
    const stacked = plan.steps.find((s: any) => Array.isArray(s.stack));
    assert.ok(stacked, 'the plan should carry the adversarial stack as ONE step');
    assert.equal(stacked.stack[stacked.stack.length - 1].branch, stacked.branch);
    assert.ok(stacked.stack.length >= 2);
  });

  it('the note table comparison FAILS when a tip drifts (the stale-tip case)', () => {
    const plan = loadPlan();
    const note = readFileSync(path.join(REPO, plan.note), 'utf8');
    const first = parseNoteBranchTable(note)[0];
    const stale = note.replace(`\`${first.tip}\``, '`0000000`');
    const problems = comparePlanWithNote(plan, stale);
    assert.equal(problems.length, 1);
    assert.match(problems[0], /the note's table says tip `0000000`/);
  });

  it('the comparison FAILS when the order is rearranged', () => {
    const plan = loadPlan();
    const note = readFileSync(path.join(REPO, plan.note), 'utf8');
    const rows = parseNoteBranchTable(note);
    // Swap two adjacent branch rows in the note's table text.
    const lines = note.split('\n');
    // Only the rows parseNoteBranchTable accepts — a backticked branch AND a
    // backticked SHA. The note carries a SECOND table whose first cell is also
    // a branch name (the three-scan exit-code table), and swapping two of its
    // rows changes nothing, which is the correct behaviour and was this test's
    // own first bug.
    const idx = lines.map((l, i) => ({ l, i }))
      .filter(({ l }) => /^\|\s*`scoring\/[^`]+`\s*\|\s*`[0-9a-f]{7,40}`\s*\|/.test(l.trim()))
      .map(({ i }) => i);
    const [a, b] = [idx[0], idx[1]];
    const swapped = lines.slice();
    [swapped[a], swapped[b]] = [swapped[b], swapped[a]];
    const problems = comparePlanWithNote(plan, swapped.join('\n'));
    assert.ok(rows.length >= 2);
    assert.ok(problems.some((p) => /the order disagrees/.test(p)), problems.join(' | '));
  });

  it('the comparison FAILS when the note drops a branch the plan measures', () => {
    const plan = loadPlan();
    const note = readFileSync(path.join(REPO, plan.note), 'utf8');
    const dropped = note.split('\n').filter((l) => !/^\|\s*`scoring\/forced-cue`/.test(l.trim())).join('\n');
    const problems = comparePlanWithNote(plan, dropped);
    assert.ok(problems.some((p) => /no row for it/.test(p)), problems.join(' | '));
  });
});

describe('validatePlan refuses, one broken field at a time', () => {
  const cases: Array<[string, (p: any) => void, RegExp]> = [
    ['a wrong schemaVersion', (p) => { p.schemaVersion = 2; }, /schemaVersion/],
    ['no remote', (p) => { delete p.remote; }, /plan\.remote/],
    ['no baseline reason', (p) => { delete p.baseline.reason; }, /plan\.baseline/],
    ['no steps', (p) => { p.steps = []; }, /non-empty array/],
    ['a short tip', (p) => { p.steps[0].tip = 'bcc96f85'; }, /full 40-character SHA/],
    ['a short base', (p) => { p.steps[0].base = 'ad3f6fa7'; }, /base must be a full 40/],
    ['a missing reason', (p) => { delete p.steps[0].reason; }, /missing a string `reason`/],
    ['a duplicate id', (p) => { p.steps[1].id = 'first'; }, /duplicate step id/],
    ['an unreadable when', (p) => { p.steps[1].when = 'sometimes'; }, /unreadable `when`/],
    ['an unknown gate', (p) => { p.steps[0].gate = 'maybe'; }, /unknown `gate`/],
    ['a receipt range that is not ..HEAD', (p) => { p.steps[0].receiptRanges = ['a..b']; }, /must end in "\.\.HEAD"/],
    ['no receipt range', (p) => { p.steps[0].receiptRanges = []; }, /at least one receiptRange/],
    ['a dependency on a step that does not exist', (p) => { p.steps[1].when = 'if-accepted:ghost'; }, /waits on step "ghost"/],
    ['a stack whose last member is not the measured branch', (p) => {
      p.steps[1].stack = [{ branch: 'scoring/x', tip: 'd'.repeat(40) }];
    }, /must be the top of the stack/],
  ];
  for (const [label, breakIt, expected] of cases) {
    it(`refuses ${label}`, () => {
      const plan = goodPlan();
      breakIt(plan);
      assert.throws(() => validatePlan(plan), (err: unknown) => {
        assert.ok(err instanceof PlanError, `expected a PlanError, got ${err}`);
        assert.match((err as Error).message, expected);
        return true;
      });
    });
  }
  it('accepts the unbroken shape', () => {
    assert.doesNotThrow(() => validatePlan(goodPlan()));
  });
});

describe('step eligibility', () => {
  it('an always step runs, with its reason', () => {
    const { eligible, reason } = stepEligibility(goodPlan().steps[0] as any, new Map());
    assert.equal(eligible, true);
    assert.match(reason, /unconditional/);
  });
  it('an if-accepted step waits until the step it names is decided', () => {
    const step = (goodPlan() as any).steps[1];
    assert.equal(stepEligibility(step, new Map()).eligible, false);
    assert.equal(stepEligibility(step, new Map([['first', 'rejected']])).eligible, false);
    assert.equal(stepEligibility(step, new Map([['first', 'accepted']])).eligible, true);
  });
  it('an if-rejected step is the mirror image', () => {
    const step = { ...(goodPlan() as any).steps[1], when: 'if-rejected:first' };
    assert.equal(stepEligibility(step, new Map([['first', 'accepted']])).eligible, false);
    assert.equal(stepEligibility(step, new Map([['first', 'rejected']])).eligible, true);
  });
  it('a manual step is never scheduled, and says how to reach it', () => {
    const step = { ...(goodPlan() as any).steps[1], when: 'manual' };
    const { eligible, reason } = stepEligibility(step, new Map([['first', 'accepted']]));
    assert.equal(eligible, false);
    assert.match(reason, /--only=/);
  });
  it('the real plan schedules exactly one unconditional step', () => {
    const plan = loadPlan();
    const always = plan.steps.filter((s: any) => s.when === 'always');
    assert.equal(always.length, 1, 'the order has one starting point, and the note says which');
    assert.equal(always[0].branch, 'scoring/feature-length-defects');
  });
});

describe('the printed plan', () => {
  it('prints every step, its condition and its reason before anything runs', () => {
    const plan = loadPlan();
    const text = formatPlan(plan);
    for (const step of plan.steps) {
      assert.ok(text.includes(step.id), `the plan print omits ${step.id}`);
      assert.ok(text.includes(step.tip.slice(0, 8)), `the plan print omits ${step.id}'s tip`);
    }
    assert.ok(text.includes(plan.baseline.ref));
    assert.ok(text.includes(plan.lock.artifact));
  });
  it('shows a note disagreement in the printed plan, not only in an exception', () => {
    const plan = loadPlan();
    const text = formatPlan(plan, { noteProblems: ['the note says X, the plan says Y'] });
    assert.match(text, /THE NOTE AND THE PLAN DISAGREE/);
    assert.match(text, /the note says X/);
  });
  it('wrap() keeps prose inside the column it is given', () => {
    const lines = wrap('a '.repeat(200), 76, '      ');
    for (const line of lines) assert.ok(line.length <= 76, `line too long: ${line.length}`);
  });
});
