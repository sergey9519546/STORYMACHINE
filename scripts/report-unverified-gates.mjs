#!/usr/bin/env node
// Reports which verification gates did NOT actually run — and blocks once a
// reported gap has been open past its expiry.
//
// WHY THIS EXISTS. `npm test` reporting "0 failures" reads as "everything is
// verified." It is not. Several suites skip silently when their input is
// absent — including the AUC-24 structural-degradation ratchet that CLAUDE.md
// names as the floor protecting the score from regressing into
// structure-blindness. CI sets only GEMINI_API_KEY, so REAL_SCRIPT_CORPUS_DIR
// is never set and that assertion has never executed in CI. A change making
// the doctor more structure-blind would merge green.
//
// A GATE CAN BE KEYED ON A FILE, NOT ONLY AN ENV VAR. This reporter used to
// know about three env-gated suites and reported "3 of 3" — while a fourth,
// tests/nvm/generate/craft-kb.test.ts, skipped 7 assertions whenever
// data/craft/craft-kb.json was absent (which is always, in CI: data/ is
// gitignored). A report that under-counts what it did not check is the same
// kind of false assurance as the "0 failures" line it exists to qualify, so
// gates now declare either `env` or `file`.
//
// ── EXPIRY (2026-09-03, retrospective finding #9) ──────────────────────────
// This script used to exit 0 unconditionally, by design, and said so. The
// 2026-09-02 retrospective named that design as a pattern rather than a
// feature: "documentation of a gap became the deliverable" — 24,722 dead
// lines written up and none deleted, skipped suites named and none blocked.
// A beautiful report on a gap nobody is obliged to close is how a gap stays
// open for a year.
//
// So a gate may now carry `expires` (an ISO date). Before that date the gate
// reports exactly as before and the script exits 0; on or after it, the
// script exits 1 and the CI step — which is a normal blocking step — fails.
// An expiry is a commitment with a deadline attached, not a threat: the ways
// to clear it are (a) do the work so the gate runs, (b) delete the gate if it
// stopped mattering, or (c) move the date DELIBERATELY, in a diff a reviewer
// sees and can refuse. All three are better than silence.
//
// A gate with no `expires` reports and does not block. That is deliberate:
// the existing four gates' deadlines are the owner's call, not this script's,
// and inventing dates for them would be the same overreach in the opposite
// direction.

import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/**
 * One verification gate. Exactly one of `env`/`file` says what makes it run;
 * `expires` (ISO date, optional) is what makes a still-open gap eventually
 * block instead of merely reporting.
 *
 * @typedef {object} Gate
 * @property {string} suite      test file the gate protects.
 * @property {string} protects   what the suite actually asserts when it runs.
 * @property {string} ifSkipped  what is unverified while it does not.
 * @property {string} [env]      env var whose presence means the gate ran.
 * @property {string} [file]     repo-relative input file whose presence means the gate ran.
 * @property {string} [expires]  ISO date on which an unclosed gate starts failing the build.
 */

/** @type {Gate[]} */
const GATES = [
  {
    env: 'REAL_SCRIPT_CORPUS_DIR',
    suite: 'tests/core/real-script-corpus.test.ts',
    protects:
      'AUC-24 structural-degradation ratchet measured live (shuffle + drop-every-third '
      + 'over a 24-script subset; last measured 0.731), plus 71 per-script '
      + 'health/verdict manifest locks.',
    ifSkipped:
      'The live measurement does not happen here. Since 2026-09-03 the AUC itself is '
      + 'no longer only measurable here: tests/core/auc24-table.test.ts recomputes it '
      + 'from a committed table of numbers (see the gate below). The manifest locks and '
      + 'a FRESH measurement still need the corpus — run `npm run measure-real` locally '
      + 'before merging any scoring change.',
  },
  {
    file: 'tests/fixtures/auc24-table.json',
    suite: 'tests/core/auc24-table.test.ts',
    // The one gate that carries a deadline, because it is the one gate whose
    // work is a single local command with no open design questions left.
    expires: '2026-10-01',
    protects:
      'The AUC-24 ratchet, recomputed in CI from committed NUMBERS (24 intact/degraded '
      + 'health pairs) rather than from corpus text that can never reach CI. The floor '
      + 'assertion, running on every CI run, on every machine.',
    ifSkipped:
      'The table is not committed yet, so the AUC floor is still asserted only inside '
      + 'the corpus-gated suite above — which means nowhere. The machinery is delivered '
      + 'and tested (tests/core/auc.test.ts, tests/scripts/lock-auc24.test.ts); what is '
      + 'missing is one owner-local run: '
      + '`REAL_SCRIPT_CORPUS_DIR=/path/to/corpus npm run lock-auc24`, then commit '
      + 'tests/fixtures/auc24-table.json. The values cannot be produced anywhere the '
      + 'corpus is absent, and inventing them is the exact fabrication the table exists '
      + 'to make expensive.',
  },
  {
    env: 'REAL_SLOP_CORPUS_DIR',
    suite: 'tests/core/anti-slop-real-corpus.test.ts',
    protects: 'Anti-slop marker discrimination on real writing.',
    ifSkipped: 'Anti-slop markers are unverified against real prose.',
  },
  {
    env: 'RUN_E2E',
    suite: 'tests/e2e/journeys.test.ts',
    protects:
      'The only full-stack test: boots a real server and drives the writer '
      + 'journey over HTTP.',
    ifSkipped:
      'No test exercises the app end to end. Route-level tests still run.',
  },
  {
    file: 'data/craft/craft-kb.json',
    suite: 'tests/nvm/generate/craft-kb.test.ts',
    protects:
      'The 7 schema/integrity assertions over the craft knowledge base: 22 films x 7 '
      + 'canonical sections = 154 entries, every entry genre-attributed with a numeric '
      + 'health, and — the load-bearing one — NO REPRODUCED SCREENPLAY TEXT (entries must '
      + 'be described patterns, never quotations). tests/nvm/generate/craft-guardrails.test.ts '
      + 'silently returns early on the same file for its own copy of that last check.',
    ifSkipped:
      'The knowledge base that feeds generation directive-routing is unvalidated, including '
      + 'the no-quoted-screenplay property that keeps it legally distributable. data/ is '
      + 'gitignored, so this NEVER runs in CI. Build it locally with '
      + '`node scripts/build-craft-kb.mjs` and re-run the suite after editing any '
      + 'data/craft/notes/*.md.',
  },
];

/**
 * A gate ran if its env var is set, or if its input file is present.
 * @param {Gate} g
 * @param {{ env?: Record<string, string | undefined>, root?: string }} [opts]
 */
export function gateRan(g, { env = process.env, root = REPO_ROOT } = {}) {
  if (g.env) return Boolean(env[g.env]);
  if (g.file) return existsSync(path.join(root, g.file));
  return false;
}

/**
 * What the reader has to provide to make the gate run.
 * @param {Gate} g
 */
function gateInput(g) {
  return g.env ? `unset:     ${g.env}` : `missing:   ${g.file}`;
}

/**
 * A skipped gate is EXPIRED when it carries an `expires` date and today is on
 * or after it. Dates are compared as ISO strings (YYYY-MM-DD sorts
 * lexicographically), so this is timezone-independent to the day — the point
 * is a deadline, not an instant.
 *
 * @param {Gate} g
 * @param {string} [today] ISO date (YYYY-MM-DD).
 */
export function isExpired(g, today = new Date().toISOString().slice(0, 10)) {
  return typeof g.expires === 'string' && g.expires !== '' && today >= g.expires;
}

/**
 * The whole decision, as a pure function, so tests can drive it without
 * touching process.env or the clock.
 *
 * @param {Gate[]} [gates]
 * @param {{ env?: Record<string, string | undefined>, root?: string, today?: string }} [opts]
 * @returns {{ skipped: Gate[], ran: Gate[], expired: Gate[], exitCode: number }}
 */
export function evaluateGates(gates = GATES, opts = {}) {
  const skipped = gates.filter((g) => !gateRan(g, opts));
  const ran = gates.filter((g) => gateRan(g, opts));
  const expired = skipped.filter((g) => isExpired(g, opts.today));
  return { skipped, ran, expired, exitCode: expired.length > 0 ? 1 : 0 };
}

/** @param {{ skipped: Gate[], ran: Gate[], expired: Gate[] }} result */
export function render({ skipped, ran, expired }) {
  if (skipped.length === 0) return 'All env-gated verification gates ran.\n';
  const lines = [
    '',
    '='.repeat(72),
    `UNVERIFIED GATES: ${skipped.length} of ${skipped.length + ran.length} did NOT run`,
    '='.repeat(72),
    'A passing test suite does NOT mean these were checked.',
    '',
  ];
  for (const g of skipped) {
    const expiredNow = expired.includes(g);
    lines.push(`  [${expiredNow ? 'EXPIRED' : 'SKIPPED'}] ${g.suite}`);
    lines.push(`     ${gateInput(g)}`);
    if (g.expires) {
      lines.push(`     expires:   ${g.expires}${expiredNow ? '  — PASSED. This step now fails the build.' : '  (reports until then, blocks after)'}`);
    }
    lines.push(`     protects:  ${g.protects}`);
    lines.push(`     therefore: ${g.ifSkipped}`);
    lines.push('');
  }
  if (ran.length) lines.push(`  Ran: ${ran.map((g) => g.env ?? g.file).join(', ')}`);
  if (expired.length) {
    lines.push(
      '',
      '-'.repeat(72),
      `BLOCKING: ${expired.length} gate(s) are past the expiry recorded next to them.`,
      'This step is failing on purpose. A reported gap with a deadline is a',
      'commitment; the deadline has arrived. Close the gate, delete it if it',
      'stopped mattering, or move the date deliberately — in a diff a reviewer',
      'can see and refuse.',
      '-'.repeat(72),
    );
  }
  lines.push('='.repeat(72), '');
  return lines.join('\n');
}

// Run only when invoked directly, so tests can import the pieces above.
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = evaluateGates();
  process.stdout.write(render(result));
  process.exit(result.exitCode);
}
