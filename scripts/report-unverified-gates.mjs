#!/usr/bin/env node
// Reports which verification gates did NOT actually run — and blocks once a
// reported gap has been open past its expiry.
//
// ── RUNTIME (2026-09-06 round 2, stated because it changed) ────────────────
// This script used to be instant: it stat()ed a few files and printed. It now
// also RUNS each VERIFIED gate's suite and reads the exit code (see the
// VERIFIED_GATES block below for why a row that claims "this was measured"
// has to check the measurement). That makes `npm run gates` cost about
// 5.8-6.4s on this machine — measured over three consecutive runs — instead
// of a fraction of a second, essentially all of it
// tests/core/public-benchmark.test.ts's 128 doctor runs and three bootstraps.
// The CI step is `if: always()` and unchanged otherwise; the cost is flagged
// here rather than left for someone to discover in a build-time graph, and it
// scales with however many verified gates get added later.
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
// gate deadlines are the owner's call, not this script's, and inventing dates
// for them would be the same overreach in the opposite direction.
//
// ── EVERY GATE NOW HAS AN EXPLICIT ANSWER (2026-09-03, Decision #5 —
// docs/DECISION_LOG.md) ── "no expires" used to mean "nobody decided yet."
// As of this entry every gate below carries either a real ISO date or an
// explicit `expires: null`, so the absence of a deadline is a stated
// decision (see each gate's `expiresReason` where present), never an
// oversight. `expires: null` still means what "no expires" always meant —
// report, never block — the only change is that it is now chosen, not
// missing.

import { spawnSync } from 'node:child_process';
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
 * @property {string | null} [expires]  ISO date on which an unclosed gate starts failing the
 *   build, or explicit `null` for a gate that by design can never close in CI (see
 *   `expiresReason`). Omitting the field entirely is no longer used in this file — every
 *   gate below states one or the other on purpose.
 * @property {string} [expiresReason]  required alongside `expires: null` — why this gate
 *   is exempt from ever blocking, so the absence of a deadline reads as a decision.
 */

/** @type {Gate[]} */
export const GATES = [
  {
    env: 'REAL_SCRIPT_CORPUS_DIR',
    suite: 'tests/core/real-script-corpus.test.ts',
    expires: null,
    expiresReason:
      'The corpus cannot reach CI by design (local-only, copyright; mounting it via '
      + 'secrets was rejected — secrets are not a corpus transport). The closable half of '
      + 'this gap is the committed table gate below, which does have a deadline.',
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
    // The gate with the nearest deadline: it is the one whose work is a
    // single local command with no open design questions left.
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
    expires: null,
    expiresReason:
      'Same reason as the real-script-corpus gate above: this corpus cannot reach CI by '
      + 'design (local-only, copyright), so it has no closable path a deadline could force.',
    protects: 'Anti-slop marker discrimination on real writing.',
    ifSkipped: 'Anti-slop markers are unverified against real prose.',
  },
  {
    env: 'RUN_E2E',
    suite: 'tests/e2e/journeys.test.ts',
    expires: '2026-10-15',
    protects:
      'The only full-stack test: boots a real server and drives the writer '
      + 'journey over HTTP.',
    ifSkipped:
      'No test exercises the app end to end. Route-level tests still run.',
  },
  {
    file: 'data/craft/craft-kb.json',
    suite: 'tests/nvm/generate/craft-kb.test.ts',
    expires: '2026-11-01',
    expiresReason:
      'Closing this gate requires deciding whether to commit the generated KB itself '
      + '(data/ is gitignored today) or a derived hash of it that a smaller, committable '
      + 'fixture can check against — that choice, not the test code, is what the deadline '
      + 'forces a decision on.',
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
 * ── VERIFIED GATES (2026-09-06) ────────────────────────────────────────────
 * The list above is what did NOT get checked. Until now a reader had no way
 * to tell "absent from this report because it ran" from "absent because
 * nobody wrote it down" — and for the whole life of this script the honest
 * answer for discrimination was the second one: EVERY discrimination
 * assertion in the repository was either corpus-gated (skipped) or waiting on
 * an owner-local lock (skipped), so a reader scanning this output found the
 * AUC-24 gap and nothing to set against it.
 *
 * That changed when tests/core/public-benchmark.test.ts landed: a
 * discrimination number computed end to end, in CI, on committed text, with
 * no env var and no owner step. It is a DIFFERENT KIND OF ROW from everything
 * above — it reports that a gate RAN, not that one didn't — so it is rendered
 * in its own section rather than smuggled into a report about gaps.
 *
 * A verified gate is CHECKED, not asserted, and — since 2026-09-06 round 2 —
 * checked on all three of the things that have to be true for the row to be
 * honest:
 *
 *   1. its INPUT exists (the fixture the suite measures against),
 *   2. its SUITE exists, and
 *   3. its suite PASSES — this script runs it and reads the exit code.
 *
 * (1) alone was the round-1 shape and it was not enough. The independent
 * review deleted `tests/core/public-benchmark.test.ts` and ran `npm run
 * gates`: the reporter printed `[RAN] tests/core/public-benchmark.test.ts`,
 * by name, with the file that does the measuring gone, and exited 0. That is
 * precisely the false assurance this file exists to prevent, and it is the
 * likelier deletion of the two — a fixture reads as load-bearing, a test file
 * reads as something you can comment out when it is in the way.
 *
 * Running the suite costs ~4.6s and is the only check that survives "the file
 * is still there but its assertions were gutted". It is worth it here because
 * this section makes a positive claim; the rest of the file only reports gaps.
 *
 * The runner is injectable so the tests can drive all four outcomes without
 * spawning anything.
 *
 * @typedef {object} VerifiedGate
 * @property {string} suite      the test file that does the checking.
 * @property {string} file       repo-relative input whose presence proves the suite has something to assert against.
 * @property {string} command    how a reader reproduces the number outside CI.
 * @property {string} proves     what actually gets checked on every run.
 * @property {string} doesNotProve  the claim a reader might wrongly take from it.
 */

/** @type {VerifiedGate[]} */
export const VERIFIED_GATES = [
  {
    suite: 'tests/core/public-benchmark.test.ts',
    file: 'tests/fixtures/public-corpus-manifest.json',
    command: 'npm run benchmark:public',
    proves:
      'Degradation discrimination on the 32 DISTRIBUTABLE screenplays (20 CC0 in '
      + 'data/screenplays + 12 blind-pair fixtures), recomputed from committed .fountain text on '
      + 'every CI run with no corpus mount: THREE degradations x TWO statistics against six '
      + 'floors in scripts/lib/auc.ts — shuffle-drop (the AUC-24 recipe), climax-relocate (scene '
      + 'count preserved, so the 140/sceneCount term cancels), and DIALOGUE_FLATTEN as a POSITIVE '
      + 'CONTROL. The control is what makes the other two readings interpretable: the score '
      + 'catches it on 32 of 32 scripts, zero ties, so a near-chance reading elsewhere is the '
      + 'score being blind, not the harness being broken. Matched-pair is the primary statistic '
      + '(this is a paired design); all-pairs is floored too. Each carries a seeded '
      + '2000-resample 95% bootstrap interval, on a pre-registered sha256-derived split. Plus a '
      + '32-row manifest lock (sceneCount/words/health/verdict), so a scoring change\'s effect on '
      + 'real distributable prose is a reviewable numeric diff.',
    doesNotProve:
      'Nothing about the AUC-24 >= 0.622 ratchet above — different corpus, different script '
      + 'length, different denominator. And it is not a good result: measured 2026-09-06, both '
      + 'MEASUREMENT channels are near chance (shuffle-drop 0.5313 matched-pair / 0.5586 '
      + 'all-pairs; climax-relocate 0.4219 / 0.4673) and all four 95% intervals contain 0.5. The '
      + 'control reads 1.0000 / 0.9473 but proves only that the instrument works — the engine '
      + 'ships a deduction built for that exact manipulation. Floors are those values minus a '
      + '0.02 margin, so the engine cannot get WORSE unnoticed. They are the current truth, not '
      + 'a target. The split is reported, NOT used for held-out evaluation: the floors were '
      + 'locked from all 32 scripts, holdout included.',
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
    } else if (g.expires === null) {
      lines.push(`     expires:   never — ${g.expiresReason ?? 'no reason recorded'}`);
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

/**
 * Actually run a verified gate's suite and report whether it passed. The
 * default runner; injectable via `opts.runSuite` so tests need not spawn.
 *
 * @param {string} suitePath absolute path to the suite file
 * @returns {boolean} true iff the suite exited 0
 */
export function runSuiteDefault(suitePath) {
  const result = spawnSync(process.execPath, ['--experimental-strip-types', suitePath], {
    encoding: 'utf8',
    stdio: 'ignore',
    timeout: 300_000,
  });
  return result.status === 0;
}

/** The four states a verified row can be in. Only `ran` is a claim. */
export const VERIFIED_STATES = ['ran', 'missing-input', 'missing-suite', 'failing'];

/**
 * @param {VerifiedGate} g
 * @param {{ env?: Record<string, string | undefined>, root?: string, runSuite?: (p: string) => boolean }} [opts]
 * @returns {'ran' | 'missing-input' | 'missing-suite' | 'failing'}
 */
export function verifiedGateState(g, { env = process.env, root = REPO_ROOT, runSuite = runSuiteDefault } = {}) {
  if (!gateRan(g, { env, root })) return 'missing-input';
  const suitePath = path.join(root, g.suite);
  if (!existsSync(suitePath)) return 'missing-suite';
  return runSuite(suitePath) ? 'ran' : 'failing';
}

/** Why each non-`ran` state is not a claim, rendered next to the row. */
const VERIFIED_STATE_REASON = {
  'missing-input': 'its input file is gone. This row can no longer verify itself.',
  'missing-suite': 'THE SUITE THAT DOES THE MEASURING IS GONE. The row would otherwise still say RAN.',
  failing: 'the suite ran and FAILED. Whatever it protects is not holding right now.',
};

/**
 * Which verified gates can still verify themselves.
 *
 * @param {VerifiedGate[]} [gates]
 * @param {{ env?: Record<string, string | undefined>, root?: string, runSuite?: (p: string) => boolean }} [opts]
 * @returns {{ present: VerifiedGate[], absent: VerifiedGate[], states: Map<VerifiedGate, string>, exitCode: number }}
 */
export function evaluateVerified(gates = VERIFIED_GATES, opts = {}) {
  const states = new Map(gates.map((g) => [g, verifiedGateState(g, opts)]));
  const present = gates.filter((g) => states.get(g) === 'ran');
  const absent = gates.filter((g) => states.get(g) !== 'ran');
  return { present, absent, states, exitCode: absent.length > 0 ? 1 : 0 };
}

/** @param {{ present: VerifiedGate[], absent: VerifiedGate[], states?: Map<VerifiedGate, string> }} result */
export function renderVerified({ present, absent, states }) {
  if (present.length === 0 && absent.length === 0) return '';
  const lines = [
    '='.repeat(72),
    `VERIFIED GATES: ${present.length} of ${present.length + absent.length} ran here, with no corpus and no owner step`,
    '='.repeat(72),
    'These are the checks the report above is NOT about. Listed so "not mentioned',
    'as a gap" and "actually measured" stop looking the same. Each row is checked',
    'three ways: its input exists, its suite exists, and its suite passes here.',
    '',
  ];
  for (const g of [...present, ...absent]) {
    const state = states?.get(g) ?? (present.includes(g) ? 'ran' : 'missing-input');
    lines.push(`  [${state === 'ran' ? 'RAN' : 'ABSENT'}] ${g.suite}`);
    if (state !== 'ran') lines.push(`     WHY:       ${VERIFIED_STATE_REASON[state] ?? state}`);
    lines.push(`     input:     ${g.file}`);
    lines.push(`     suite:     ${g.suite}${state === 'ran' ? ' — run by this script, exit 0' : ''}`);
    lines.push(`     reproduce: ${g.command}`);
    lines.push(`     proves:    ${g.proves}`);
    lines.push(`     but not:   ${g.doesNotProve}`);
    lines.push('');
  }
  if (absent.length) {
    lines.push(
      '-'.repeat(72),
      `${absent.length} verified gate(s) can no longer verify themselves. This step is`,
      'failing on purpose: a row claiming something is measured, next to a missing',
      'input, a missing suite, or a failing one, is the false assurance this whole',
      'script exists to prevent.',
      '-'.repeat(72),
    );
  }
  lines.push('='.repeat(72), '');
  return lines.join('\n');
}

// Run only when invoked directly, so tests can import the pieces above.
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = evaluateGates();
  const verified = evaluateVerified();
  process.stdout.write(render(result));
  process.stdout.write(renderVerified(verified));
  process.exit(result.exitCode || verified.exitCode);
}
