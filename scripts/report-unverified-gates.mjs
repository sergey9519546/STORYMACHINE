#!/usr/bin/env node
// Reports which verification gates did NOT actually run — and blocks once a
// reported gap has been open past its expiry.
//
// ── RUNTIME (2026-09-12, stated because it changed AGAIN) ──────────────────
// This script used to be instant: it stat()ed a few files and printed. On
// 2026-09-06 it began RUNNING each VERIFIED gate's suite and reading the exit
// code, which cost 5.8-6.4s (measured then, three consecutive runs). As of
// 2026-09-12 it runs each verified suite TWICE — once as itself, once with one
// floor constant raised above its measured value, requiring the second run to
// FAIL on that floor (adversarial review finding 7: exit 0 does not distinguish
// a live assertion from a gutted one).
//
// MEASURED, back to back on one machine, three consecutive runs each: the
// single-run reporter at main@59bbaf55 costs 5.86-6.51s and this one costs
// 11.47-11.68s. Essentially all of it is
// tests/core/public-benchmark.test.ts's 128 doctor runs and three bootstraps,
// paid twice (one suite run is 5.92-6.15s on the same machine). Measure the
// pair side by side if you re-measure: sandbox load moved the absolute numbers
// by 20% within one session, and the ~1.9x RATIO is the part that is about this
// change. The CI step is `if: always()` and unchanged otherwise; the cost is
// flagged here rather than left for someone to discover in a build-time graph,
// and it scales with however many verified gates get added later.
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
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** The in-memory floor-raising hook the mutation check loads. See its header. */
const RAISE_FLOOR_HOOK = path.join(REPO_ROOT, 'scripts/lib/raise-auc-floor-hook.mjs');

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
 * A verified gate is CHECKED, not asserted, and — since 2026-09-12 — checked
 * on all FIVE of the things that have to be true for the row to be honest:
 *
 *   1. its INPUT exists (the fixture the suite measures against),
 *   2. its SUITE exists,
 *   3. its suite PASSES — this script runs it and reads the exit code,
 *   4. its suite REPORTS every floor it claims to guard, with a measured value
 *      at or above each — parsed out of the suite's own stdout, and
 *   5. its floor assertions are LIVE — the suite is run a second time with one
 *      floor constant raised above its measured value and must FAIL on that
 *      constant by name.
 *
 * (1) alone was the round-1 shape and it was not enough. The independent
 * review deleted `tests/core/public-benchmark.test.ts` and ran `npm run
 * gates`: the reporter printed `[RAN] tests/core/public-benchmark.test.ts`,
 * by name, with the file that does the measuring gone, and exited 0. That is
 * precisely the false assurance this file exists to prevent, and it is the
 * likelier deletion of the two — a fixture reads as load-bearing, a test file
 * reads as something you can comment out when it is in the way.
 *
 * (3) WAS CLAIMED TO CLOSE THE REST AND DID NOT. This block used to say
 * running the suite "is the only check that survives 'the file is still there
 * but its assertions were gutted'". The 2026-09-12 adversarial review
 * (docs/audits/2026-09-12-adversarial/engine-logic.md finding 7) falsified that
 * sentence by doing it: it replaced the suite with one that keeps the filename,
 * keeps every `describe`/`it` title, runs the real 32-script measurement, and
 * asserts `Number.isFinite(d.aucPaired)` instead of `d.aucPaired >= floor`.
 * `node scripts/report-unverified-gates.mjs` printed
 * `[RAN] tests/core/public-benchmark.test.ts` and exited 0, with
 * `scripts/lib/auc.ts` untouched so the diff looked innocent. An exit code
 * cannot tell "asserted and held" from "asserted nothing".
 *
 * (4) and (5) are the finding's own two mechanisms, both corpus-free, and they
 * are complementary rather than alternative:
 *
 *   * (4) catches a suite that stopped REPORTING what it guards. It reads the
 *     `FLOOR <CONSTANT> measured=… floor=… verdict=…` lines the suite prints
 *     and requires one per `PUBLIC_*_FLOOR` constant found in
 *     `scripts/lib/auc.ts` — the source of truth, so a suite cannot shorten the
 *     list it is checked against. A gutted suite that kept the print passes
 *     this one, which is exactly why (5) exists.
 *   * (5) catches a suite that stopped ASSERTING. It is the genuine liveness
 *     check: `scripts/lib/raise-auc-floor-hook.mjs` presents `auc.ts` to a
 *     second child process with one floor raised (in memory — never on disk;
 *     see that file's header), and THREE things must then be true of that run:
 *       a. it exits NON-ZERO,
 *       b. its output carries `not ok … clears <CONSTANT> = <raised>`, and
 *       c. its output does NOT also carry `ok … clears <CONSTANT> = <raised>` —
 *          the same floor cannot be reported failing and passing at once.
 *
 *     WHAT THIS DOES AND DOES NOT BUY, stated exactly (round-2 review). None of
 *     the three is proof that an assertion exists: this reporter reads a child
 *     process's SELF-REPORT, and a child can print whatever it likes. The
 *     round-1 version required (b) alone and said "only an assertion that
 *     compares the measurement to that constant can name it in a failure" —
 *     which was FALSE, and was falsified the same way finding 7 falsified this
 *     file's previous confident sentence. The reviewer planted a 26-line suite
 *     that asserts `assert.ok(true)` for every floor, prints the real FLOOR
 *     report, and appends one literal `not ok 99 - … clears
 *     PUBLIC_SHUFFLE_DROP_PAIRED_FLOOR = 0.5813` line — the raised value is
 *     `round4(measured + 0.05)` off the suite's own printed measurement, so it
 *     is fully predictable. That suite got `[RAN]` and exit 0.
 *
 *     What the three conditions together buy is a COST: a forgery must now
 *     print a failing line for the floor, suppress the passing line its own
 *     `it` block emits for the same title, and exit non-zero — none of which a
 *     suite does by accident, and all of which a genuine suite does for free
 *     (measured: the genuine mutated run exits 1 and emits the `not ok` line
 *     and no `ok` twin; the forged one exits 0 and emits both). The remaining
 *     gap is deliberate forgery, and an output-parsing check cannot close it.
 *     `tests/fixtures/gate-liveness/forged-liveness-suite.ts` is that forgery,
 *     committed, and the reporter must report it NOT verified.
 *
 * WHICH CONSTANT GETS RAISED is decided deterministically and from the SOURCE,
 * never from the suite's output: the first `PUBLIC_*_FLOOR` in `auc.ts`'s own
 * textual order whose reported measurement leaves room to raise it. Today that
 * is `PUBLIC_SHUFFLE_DROP_PAIRED_FLOOR`, the PRIMARY paired floor of the first
 * degradation — see `chooseFloorToRaise`.
 *
 * Running the suite twice costs about 11.5s in total, against 5.9-6.5s for the
 * single-run version on the same machine (see the RUNTIME note at the top of
 * this file). It is worth it here because this section makes a positive claim;
 * the rest of the file only reports gaps.
 *
 * The runner is injectable so the tests can drive every outcome without
 * spawning anything.
 *
 * @typedef {object} VerifiedGate
 * @property {string} suite      the test file that does the checking.
 * @property {string} file       repo-relative input whose presence proves the suite has something to assert against.
 * @property {string} command    how a reader reproduces the number outside CI.
 * @property {string} proves     what actually gets checked on every run.
 * @property {string} doesNotProve  the claim a reader might wrongly take from it.
 * @property {string} [floorSource]  repo-relative module whose `export const <NAME>_FLOOR = <number>;`
 *   lines are the floors this gate's suite must report and assert. Present means checks (4) and (5)
 *   apply; absent means the row is only checked three ways, and the gate list's test requires the
 *   public-benchmark row to carry it.
 * @property {string} [floorPrefix]  only floors whose identifier starts with this are this gate's.
 *   `scripts/lib/auc.ts` also holds `AUC24_FLOOR`, which belongs to a suite that SKIPS in CI for
 *   want of the local-only corpus — it is the gap the UNVERIFIED section above reports by name, and
 *   requiring the always-on public benchmark to report it would make this row claim the AUC-24
 *   ratchet is verified here. It is not, and no prefix-less list may imply otherwise.
 */

/** @type {VerifiedGate[]} */
export const VERIFIED_GATES = [
  {
    suite: 'tests/core/public-benchmark.test.ts',
    file: 'tests/fixtures/public-corpus-manifest.json',
    floorSource: 'scripts/lib/auc.ts',
    floorPrefix: 'PUBLIC_',
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
      + 'length, different denominator. No point estimate is quoted here on purpose (2026-09-11): '
      + 'this string is static and the measurement is not, and a frozen copy of it went stale and '
      + 'contradicted the benchmark\'s own printed table for five days. `npm run benchmark:public` '
      + 'prints the current six AUCs, their intervals, their floors and its own caveats, all '
      + 'rendered from the run. What is structurally true of the reading whatever it says: the two '
      + 'MEASUREMENT channels are mechanical damage, not craft; the floors are the measured values '
      + 'minus a 0.02 margin, so the engine cannot get WORSE unnoticed, and they are the current '
      + 'truth rather than a target; the control proves only that the instrument works, because the '
      + 'engine ships a deduction built for that exact manipulation; and the split is reported, NOT '
      + 'used for held-out evaluation — every floor was locked from all 32 scripts, holdout '
      + 'included.' + '\n'
      + '     AND NOT that the floors are WELL CHOSEN. Checks (4) and (5) prove the suite reports '
      + 'and actually asserts every floor in scripts/lib/auc.ts — not that any floor is at a '
      + 'defensible value. A floor re-locked downward after an unintended regression still passes '
      + 'every check here; reading the `auc.ts` diff is still the reviewer\'s job.',
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
 * Actually run a verified gate's suite, capturing its output so the floor
 * report can be parsed out of it. The default runner; injectable via
 * `opts.runSuite` so tests need not spawn.
 *
 * `raise` makes this the MUTATION run: the child loads
 * scripts/lib/raise-auc-floor-hook.mjs, which rewrites one floor constant in
 * memory as scripts/lib/auc.ts is imported. Nothing on disk changes — see that
 * file's header for why that matters.
 *
 * @param {string} suitePath absolute path to the suite file
 * @param {{ raise?: { constant: string, value: number } }} [opts]
 * @returns {{ ok: boolean, output: string }} exit status and stdout+stderr
 */
export function runSuiteDefault(suitePath, { raise } = {}) {
  // `--test-reporter=tap` and a scrubbed NODE_TEST_CONTEXT are both load-bearing,
  // not belt-and-braces. When this script runs UNDER `npm test`, node:test sets
  // NODE_TEST_CONTEXT in the environment; a child that inherits it switches to
  // the V8-serialized reporter and stops printing TAP, so the mutation check's
  // `not ok … clears <CONSTANT> = <raised>` line never appears and a perfectly
  // live suite is reported as `mutation-survived`. Measured: with
  // NODE_TEST_CONTEXT=child-v8 in the environment, the unfixed reporter called
  // the real benchmark ABSENT. The reporter must read the same text whoever
  // invoked it.
  const args = ['--experimental-strip-types', '--test-reporter=tap'];
  const env = { ...process.env };
  delete env.NODE_TEST_CONTEXT;
  if (raise) {
    args.push('--import', pathToFileURL(RAISE_FLOOR_HOOK).href);
    env.AUC_FLOOR_MUTATION_CONSTANT = raise.constant;
    env.AUC_FLOOR_MUTATION_VALUE = String(raise.value);
  }
  args.push(suitePath);
  const result = spawnSync(process.execPath, args, {
    encoding: 'utf8',
    timeout: 300_000,
    cwd: REPO_ROOT,
    env,
  });
  return { ok: result.status === 0, output: `${result.stdout ?? ''}${result.stderr ?? ''}` };
}

/** The six states a verified row can be in. Only `ran` is a claim. */
export const VERIFIED_STATES = [
  'ran', 'missing-input', 'missing-suite', 'failing', 'unreported-floors', 'mutation-survived',
];

/**
 * Every `export const <NAME>_FLOOR = <number>;` in a floor module, in the
 * file's own textual order. The SOURCE of the list a suite is checked against —
 * read here rather than taken from the suite's output, so a suite cannot
 * shorten the list of floors it is held to by printing fewer lines.
 *
 * The shape is the same single-line shape
 * `npm run benchmark:public -- --lock` rewrites and
 * tests/core/public-benchmark.test.ts already asserts, so a refactor that
 * breaks one breaks both rather than quietly narrowing this check.
 *
 * @param {string} source
 * @returns {{ constant: string, value: number }[]}
 */
export function parseFloorConstants(source, prefix = '') {
  const out = [];
  const re = /^export const ([A-Z][A-Z0-9_]*_FLOOR) = (-?[0-9.]+);$/gm;
  for (let m = re.exec(source); m !== null; m = re.exec(source)) {
    if (!m[1].startsWith(prefix)) continue;
    out.push({ constant: m[1], value: Number(m[2]) });
  }
  return out;
}

/**
 * The `FLOOR <CONSTANT> measured=<n> floor=<n> verdict=<PASS|FAIL>` lines a
 * verified suite prints. One entry per match, in output order.
 *
 * @param {string} output
 * @returns {{ constant: string, measured: number, floor: number, verdict: string }[]}
 */
export function parseFloorReport(output) {
  const out = [];
  const re = /^\s*FLOOR ([A-Z][A-Z0-9_]*) measured=(-?[0-9.]+) floor=(-?[0-9.]+) verdict=(PASS|FAIL)/gm;
  for (let m = re.exec(output); m !== null; m = re.exec(output)) {
    out.push({ constant: m[1], measured: Number(m[2]), floor: Number(m[3]), verdict: m[4] });
  }
  return out;
}

/**
 * Check (4): the suite reported every floor the source declares, at the same
 * value, with a measurement at or above it.
 *
 * @param {{ constant: string, value: number }[]} declared
 * @param {{ constant: string, measured: number, floor: number, verdict: string }[]} reported
 * @returns {string[]} one complaint per problem; empty means the report is whole
 */
export function floorReportProblems(declared, reported) {
  const problems = [];
  if (declared.length === 0) {
    return ['the floor module declares no `export const <NAME>_FLOOR = <number>;` line at all'];
  }
  for (const { constant, value } of declared) {
    const rows = reported.filter((r) => r.constant === constant);
    if (rows.length === 0) {
      problems.push(`${constant}: the suite printed no FLOOR line for it`);
      continue;
    }
    if (rows.length > 1) {
      problems.push(`${constant}: the suite printed ${rows.length} FLOOR lines for it`);
      continue;
    }
    const [row] = rows;
    if (row.floor !== value) {
      problems.push(`${constant}: suite reported floor=${row.floor}, source says ${value}`);
    }
    if (!(row.measured >= row.floor)) {
      problems.push(`${constant}: reported measured=${row.measured} is below floor=${row.floor}`);
    }
    if (row.verdict !== 'PASS') {
      problems.push(`${constant}: the suite's own verdict for it is ${row.verdict}`);
    }
  }
  return problems;
}

/** How far above its measured value a floor is raised for the mutation run.
 *  Large enough that no rounding can leave it at or below the measurement,
 *  small enough to stay a value somebody could plausibly have typed. */
export const FLOOR_RAISE_DELTA = 0.05;

/** A raised floor is still clamped below 1, the maximum an AUC can take. */
const FLOOR_RAISE_CEILING = 0.9999;

/**
 * Check (5)'s first half: WHICH floor to raise. Deterministic and derived from
 * the source's own order, not from the suite's output — the first declared
 * floor whose reported measurement leaves room to raise it above itself. On
 * scripts/lib/auc.ts that is PUBLIC_SHUFFLE_DROP_PAIRED_FLOOR, the PRIMARY
 * paired floor of the first degradation.
 *
 * A floor whose measurement is already pinned at 1.0000 (the positive control's
 * matched-pair statistic is) cannot be raised above it inside the range an AUC
 * can occupy, so it is skipped rather than raised to an impossible value that
 * a sanity assertion could fail on for the wrong reason.
 *
 * @param {{ constant: string, value: number }[]} declared
 * @param {{ constant: string, measured: number }[]} reported
 * @returns {{ constant: string, value: number, measured: number } | null}
 */
export function chooseFloorToRaise(declared, reported) {
  for (const { constant } of declared) {
    const row = reported.find((r) => r.constant === constant);
    if (!row) continue;
    const raised = Math.round(Math.min(row.measured + FLOOR_RAISE_DELTA, FLOOR_RAISE_CEILING) * 1e4) / 1e4;
    if (raised > row.measured) return { constant, value: raised, measured: row.measured };
  }
  return null;
}

/**
 * Check (5)'s second half: did the mutated run FAIL on that constant, by name?
 *
 * A non-zero exit is not enough. Under the hook the suite's imported floors and
 * the on-disk literals disagree, so its `--lock`-shape assertions fail too; a
 * gutted suite that kept those assertions would exit non-zero while asserting
 * nothing about the measurement. So the exit code is NECESSARY and not
 * sufficient, and the same is true of the named line in the other direction —
 * a `process.stdout.write` can print one. Both are required, plus the absence
 * of a passing twin:
 *
 *   * `not ok … clears <CONSTANT> = <raised>` — the floor's own test, whose
 *     title node:test generates from the constant and the raised value,
 *     reported as a FAILURE;
 *   * no `ok … clears <CONSTANT> = <raised>` — the same title must not ALSO be
 *     reported as a pass. A suite that merely prints a forged failure line
 *     still runs its real (vacuous) `it` block, and that block emits the
 *     passing twin. Measured on the reviewer's forged suite: both lines
 *     present. Measured on the genuine suite: only the failure.
 *
 * See the VERIFIED GATES block above for what this does and does not buy. In
 * one line: it raises the cost of faking from "keep the file and gut the
 * assertions" to "deliberately forge three separate signals", which is as far
 * as a check that parses a child's self-report can go.
 *
 * @param {string} output  the mutated run's stdout+stderr
 * @param {{ constant: string, value: number }} raise
 * @returns {{ ok: boolean, reason: string }}
 */
export function mutationWasCaught(output, raise) {
  const escaped = `${raise.value}`.replace(/\./g, '\\.');
  const title = `clears ${raise.constant} = ${escaped}`;
  if (!new RegExp(`not ok [^\\n]*${title}`).test(output)) {
    return { ok: false, reason: 'the mutated run reported no failure naming that floor' };
  }
  if (new RegExp(`^\\s*ok \\d+ - [^\\n]*${title}`, 'm').test(output)) {
    return {
      ok: false,
      reason: 'the mutated run reported the SAME floor as both failing and passing — a forged '
        + 'failure line next to the real (vacuous) test\'s passing one',
    };
  }
  return { ok: true, reason: '' };
}

/**
 * @param {VerifiedGate} g
 * @param {{ env?: Record<string, string | undefined>, root?: string, runSuite?: (p: string, o?: object) => { ok: boolean, output: string } }} [opts]
 * @returns {{ state: string, detail: string }}
 */
export function verifiedGateOutcome(g, { env = process.env, root = REPO_ROOT, runSuite = runSuiteDefault } = {}) {
  if (!gateRan(g, { env, root })) return { state: 'missing-input', detail: g.file };
  const suitePath = path.join(root, g.suite);
  if (!existsSync(suitePath)) return { state: 'missing-suite', detail: g.suite };

  const first = runSuite(suitePath);
  if (!first.ok) return { state: 'failing', detail: g.suite };
  if (!g.floorSource) return { state: 'ran', detail: '' };

  let source;
  try {
    source = readFileSync(path.join(root, g.floorSource), 'utf8');
  } catch {
    return { state: 'unreported-floors', detail: `${g.floorSource} is unreadable, so no floor list exists to check against` };
  }
  const declared = parseFloorConstants(source, g.floorPrefix ?? '');
  const reported = parseFloorReport(first.output);
  const problems = floorReportProblems(declared, reported);
  if (problems.length > 0) return { state: 'unreported-floors', detail: problems.join('; ') };

  const raise = chooseFloorToRaise(declared, reported);
  if (raise === null) {
    return {
      state: 'unreported-floors',
      detail: 'no declared floor has a measurement that can be raised above itself, so the '
        + 'mutation check has nothing to move',
    };
  }
  const mutated = runSuite(suitePath, { raise: { constant: raise.constant, value: raise.value } });
  // THE EXIT CODE IS REQUIRED, NOT MERELY REPORTED (round-2 review item 1).
  // Round 1 ignored `mutated.ok` entirely, on the reasoning that the shape
  // assertions fail under the hook anyway — true, but it left the whole check
  // resting on a text match a `process.stdout.write` can satisfy. A suite whose
  // floor assertion really fires exits non-zero for free; one that only prints
  // a failure line does not. Costs nothing, strictly safe, and it catches the
  // reviewer's forged suite (measured: forged mutated run exits 0, genuine
  // exits 1).
  if (mutated.ok) {
    return {
      state: 'mutation-survived',
      detail: `${raise.constant} was raised from ${raise.measured} (its own measurement) to `
        + `${raise.value} and the mutated run still EXITED 0. A suite whose floor assertion `
        + 'compares the measurement to that constant cannot pass with the constant above it, '
        + 'whatever its output says.',
    };
  }
  const caught = mutationWasCaught(mutated.output, raise);
  if (!caught.ok) {
    return {
      state: 'mutation-survived',
      detail: `${raise.constant} was raised from ${raise.measured} (its own measurement) to `
        + `${raise.value} and ${caught.reason}. The mutated run did fail — but a failure that `
        + 'does not name the floor is not evidence the floor is asserted.',
    };
  }
  return {
    state: 'ran',
    detail: `mutation check: ${raise.constant} raised to ${raise.value} -> suite FAILED on that `
      + 'floor by name, exit non-zero, no passing twin',
  };
}

/**
 * Backwards-compatible view of {@link verifiedGateOutcome} — the state alone.
 *
 * @param {VerifiedGate} g
 * @param {object} [opts]
 * @returns {string}
 */
export function verifiedGateState(g, opts = {}) {
  return verifiedGateOutcome(g, opts).state;
}

/** Why each non-`ran` state is not a claim, rendered next to the row. */
const VERIFIED_STATE_REASON = {
  'missing-input': 'its input file is gone. This row can no longer verify itself.',
  'missing-suite': 'THE SUITE THAT DOES THE MEASURING IS GONE. The row would otherwise still say RAN.',
  failing: 'the suite ran and FAILED. Whatever it protects is not holding right now.',
  'unreported-floors':
    'the suite PASSED but did not report every floor it guards, at the value the source declares. '
    + 'A suite that no longer names its own floors cannot be read as having checked them.',
  'mutation-survived':
    'THE SUITE PASSED AND ITS FLOOR ASSERTIONS ARE NOT LIVE. Run a second time with one floor '
    + 'raised above its own measurement, it did not fail on that floor — so it would also pass '
    + 'with the floors deleted. This is finding 7 of the 2026-09-12 adversarial review, caught.',
};

/**
 * Which verified gates can still verify themselves.
 *
 * @param {VerifiedGate[]} [gates]
 * @param {{ env?: Record<string, string | undefined>, root?: string, runSuite?: (p: string, o?: object) => { ok: boolean, output: string } }} [opts]
 * @returns {{ present: VerifiedGate[], absent: VerifiedGate[], states: Map<VerifiedGate, string>, details: Map<VerifiedGate, string>, exitCode: number }}
 */
export function evaluateVerified(gates = VERIFIED_GATES, opts = {}) {
  const outcomes = new Map(gates.map((g) => [g, verifiedGateOutcome(g, opts)]));
  const states = new Map(gates.map((g) => [g, outcomes.get(g).state]));
  const details = new Map(gates.map((g) => [g, outcomes.get(g).detail]));
  const present = gates.filter((g) => states.get(g) === 'ran');
  const absent = gates.filter((g) => states.get(g) !== 'ran');
  return { present, absent, states, details, exitCode: absent.length > 0 ? 1 : 0 };
}

/** @param {{ present: VerifiedGate[], absent: VerifiedGate[], states?: Map<VerifiedGate, string>, details?: Map<VerifiedGate, string> }} result */
export function renderVerified({ present, absent, states, details }) {
  if (present.length === 0 && absent.length === 0) return '';
  const lines = [
    '='.repeat(72),
    `VERIFIED GATES: ${present.length} of ${present.length + absent.length} ran here, with no corpus and no owner step`,
    '='.repeat(72),
    'These are the checks the report above is NOT about. Listed so "not mentioned',
    'as a gap" and "actually measured" stop looking the same. Each row is checked',
    'five ways: its input exists, its suite exists, its suite passes here, its',
    'suite REPORTS every floor it guards, and — run again with one floor raised',
    'above its own measurement — its suite FAILS on that floor. Exit 0 alone was',
    'satisfied by a suite whose assertions had been replaced by Number.isFinite.',
    '',
  ];
  for (const g of [...present, ...absent]) {
    const state = states?.get(g) ?? (present.includes(g) ? 'ran' : 'missing-input');
    const detail = details?.get(g) ?? '';
    lines.push(`  [${state === 'ran' ? 'RAN' : 'ABSENT'}] ${g.suite}`);
    if (state !== 'ran') lines.push(`     WHY:       ${VERIFIED_STATE_REASON[state] ?? state}`);
    if (state !== 'ran' && detail) lines.push(`     DETAIL:    ${detail}`);
    lines.push(`     input:     ${g.file}`);
    lines.push(`     suite:     ${g.suite}${state === 'ran' ? ' — run by this script, exit 0' : ''}`);
    if (g.floorSource) lines.push(`     floors:    ${g.floorSource}${state === 'ran' && detail ? ` — ${detail}` : ''}`);
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
      'input, a missing suite, a failing one, one that no longer reports its own',
      'floors, or one whose floor assertions survive being raised above their own',
      'measurement, is the false assurance this whole script exists to prevent.',
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
