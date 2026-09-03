// scripts/report-unverified-gates.mjs — the expiry mechanism, and the gate
// list itself.
//
// WHY: this script became a BLOCKING CI step on 2026-09-03 (retrospective
// finding #9 — "documentation of a gap became the deliverable"). A gate that
// carries an `expires` date fails the build once that date arrives. That makes
// the date arithmetic load-bearing: an off-by-one that blocks a day early
// stops every build for a reason nobody can see in the diff, and one that
// never fires re-creates exactly the non-blocking reporter this replaced.
//
// The functions under test are pure — gates, today's date and the env come in
// as arguments — so nothing here mutates process.env or waits for a real date.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { evaluateGates, gateRan, isExpired, render, GATES } from '../../scripts/report-unverified-gates.mjs';

const REPO_ROOT = path.resolve(import.meta.dirname, '../..');
const SCRIPT = path.join(REPO_ROOT, 'scripts/report-unverified-gates.mjs');

const envGate = { env: 'SOME_CORPUS_DIR', suite: 's1', protects: 'p', ifSkipped: 'i' };
const fileGate = { file: 'tests/fixtures/real-corpus-manifest.json', suite: 's2', protects: 'p', ifSkipped: 'i' };
const missingFileGate = { file: 'tests/fixtures/definitely-not-here.json', suite: 's3', protects: 'p', ifSkipped: 'i' };

describe('gateRan', () => {
  it('an env gate ran when its variable is set to a non-empty value', () => {
    assert.equal(gateRan(envGate, { env: { SOME_CORPUS_DIR: '/x' } }), true);
    assert.equal(gateRan(envGate, { env: {} }), false);
    assert.equal(gateRan(envGate, { env: { SOME_CORPUS_DIR: '' } }), false);
  });

  it('a file gate ran when its input file exists', () => {
    assert.equal(gateRan(fileGate, { root: REPO_ROOT }), true);
    assert.equal(gateRan(missingFileGate, { root: REPO_ROOT }), false);
  });
});

describe('isExpired', () => {
  it('a gate with no expiry never expires — reporting stays the default', () => {
    assert.equal(isExpired(envGate, '2099-01-01'), false);
    assert.equal(isExpired({ ...envGate, expires: '' }, '2099-01-01'), false);
  });

  it('expires: null never blocks, at any date — the explicit "will not close in CI" case (Decision #5)', () => {
    const g = { ...envGate, expires: null, expiresReason: 'cannot reach CI by design' };
    assert.equal(isExpired(g, '2026-09-03'), false);
    assert.equal(isExpired(g, '2099-01-01'), false);
    assert.equal(evaluateGates([g], { env: {}, root: REPO_ROOT, today: '2099-01-01' }).exitCode, 0);
  });

  it('expires ON the date, not the day after', () => {
    const g = { ...envGate, expires: '2026-10-01' };
    assert.equal(isExpired(g, '2026-09-30'), false);
    assert.equal(isExpired(g, '2026-10-01'), true);
    assert.equal(isExpired(g, '2026-10-02'), true);
  });

  it('compares full ISO dates, so year and month boundaries are not string traps', () => {
    const g = { ...envGate, expires: '2027-01-01' };
    assert.equal(isExpired(g, '2026-12-31'), false);
    assert.equal(isExpired(g, '2027-01-01'), true);
    // A naive day-only or month-only comparison would call this expired.
    assert.equal(isExpired({ ...envGate, expires: '2026-10-01' }, '2026-09-02'), false);
  });
});

describe('evaluateGates — what makes the CI step block', () => {
  it('skipped gates without an expiry report and exit 0', () => {
    const r = evaluateGates([envGate], { env: {}, root: REPO_ROOT, today: '2099-01-01' });
    assert.equal(r.skipped.length, 1);
    assert.equal(r.expired.length, 0);
    assert.equal(r.exitCode, 0);
  });

  it('a skipped gate past its expiry exits 1 — the whole point of finding #9', () => {
    const r = evaluateGates([{ ...envGate, expires: '2026-10-01' }], { env: {}, root: REPO_ROOT, today: '2026-10-01' });
    assert.equal(r.expired.length, 1);
    assert.equal(r.exitCode, 1);
  });

  it('an expired gate that actually RAN does not block — the deadline is on the gap, not the date', () => {
    const r = evaluateGates(
      [{ ...envGate, expires: '2020-01-01' }],
      { env: { SOME_CORPUS_DIR: '/x' }, root: REPO_ROOT, today: '2026-10-01' },
    );
    assert.equal(r.ran.length, 1);
    assert.equal(r.expired.length, 0);
    assert.equal(r.exitCode, 0);
  });

  it('one expired gate blocks even when other gates are merely skipped', () => {
    const r = evaluateGates(
      [envGate, { ...missingFileGate, expires: '2026-01-01' }],
      { env: {}, root: REPO_ROOT, today: '2026-10-01' },
    );
    assert.equal(r.skipped.length, 2);
    assert.equal(r.expired.length, 1);
    assert.equal(r.exitCode, 1);
  });
});

describe('render', () => {
  it('marks an expired gate EXPIRED and says the step is now failing', () => {
    const out = render(evaluateGates(
      [{ ...envGate, expires: '2026-01-01' }],
      { env: {}, root: REPO_ROOT, today: '2026-10-01' },
    ));
    assert.match(out, /\[EXPIRED\]/);
    assert.match(out, /BLOCKING: 1 gate\(s\) are past the expiry/);
  });

  it('marks an unexpired gate SKIPPED and prints its deadline', () => {
    const out = render(evaluateGates(
      [{ ...envGate, expires: '2026-10-01' }],
      { env: {}, root: REPO_ROOT, today: '2026-09-03' },
    ));
    assert.match(out, /\[SKIPPED\]/);
    assert.match(out, /expires:\s+2026-10-01/);
    assert.doesNotMatch(out, /BLOCKING/);
  });

  it('marks a null-expiry gate SKIPPED, prints "never" with its reason, and never blocks', () => {
    const out = render(evaluateGates(
      [{ ...envGate, expires: null, expiresReason: 'cannot reach CI by design' }],
      { env: {}, root: REPO_ROOT, today: '2099-01-01' },
    ));
    assert.match(out, /\[SKIPPED\]/);
    assert.match(out, /expires:\s+never — cannot reach CI by design/);
    assert.doesNotMatch(out, /\[EXPIRED\]/);
    assert.doesNotMatch(out, /BLOCKING/);
  });
});

describe('the real gate list', () => {
  it('names the auc24 table gate, with an expiry, and points at the lock command', () => {
    // This gate is the deliverable of retrospective finding #2: the AUC-24
    // ratchet recomputed in CI from committed numbers. Until the owner locks
    // the table it is the one gap in the project with a deadline on it.
    const out = execFileSync('node', [SCRIPT], { cwd: REPO_ROOT, encoding: 'utf8' });
    assert.match(out, /tests\/core\/auc24-table\.test\.ts/);
    assert.match(out, /missing:\s+tests\/fixtures\/auc24-table\.json/);
    assert.match(out, /expires:\s+2026-10-01/);
    assert.match(out, /npm run lock-auc24/);
  });

  it('exits 0 today — no gate has passed its expiry yet', () => {
    // If this fails, a deadline arrived. That is the mechanism working: close
    // the gate, or move the date in a diff a reviewer can refuse.
    const r = execFileSync('node', [SCRIPT], { cwd: REPO_ROOT, encoding: 'utf8' });
    assert.ok(r.length > 0);
  });

  it('every gate now has an explicit expires — a deadline or a stated null (Decision #5)', () => {
    // The 2026-09-03 decision (docs/DECISION_LOG.md Decision #5) requires
    // that no gate be silently undated. A gate with expires: null must carry
    // an expiresReason so the absence of a deadline reads as a decision.
    for (const g of GATES) {
      assert.ok('expires' in g, `${g.suite} has no expires field at all`);
      if (g.expires === null) {
        assert.ok(g.expiresReason, `${g.suite} has expires: null with no expiresReason`);
      } else {
        assert.match(g.expires ?? '', /^\d{4}-\d{2}-\d{2}$/, `${g.suite} expires is not an ISO date`);
      }
    }
  });

  it('the E2E journeys gate expires 2026-10-15', () => {
    const out = execFileSync('node', [SCRIPT], { cwd: REPO_ROOT, encoding: 'utf8' });
    assert.match(out, /tests\/e2e\/journeys\.test\.ts/);
    assert.match(out, /unset:\s+RUN_E2E/);
    assert.match(out, /expires:\s+2026-10-15/);
  });

  it('the craft-kb gate expires 2026-11-01 and names the commit-vs-hash decision it forces', () => {
    const out = execFileSync('node', [SCRIPT], { cwd: REPO_ROOT, encoding: 'utf8' });
    assert.match(out, /tests\/nvm\/generate\/craft-kb\.test\.ts/);
    assert.match(out, /expires:\s+2026-11-01/);
  });

  it('the two corpus-gated suites carry an explicit null expiry with a reason, not silence', () => {
    const out = execFileSync('node', [SCRIPT], { cwd: REPO_ROOT, encoding: 'utf8' });
    assert.match(out, /tests\/core\/real-script-corpus\.test\.ts/);
    assert.match(out, /tests\/core\/anti-slop-real-corpus\.test\.ts/);
    // Both should render "expires: never — <reason>", never a bare SKIPPED
    // with no expires line at all.
    const skippedGateBlocks = out.split(/\[SKIPPED\]/).slice(1);
    assert.ok(skippedGateBlocks.length >= 2);
  });
});
