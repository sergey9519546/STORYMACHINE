#!/usr/bin/env node
// Reports which verification gates did NOT actually run.
//
// WHY THIS EXISTS. `npm test` reporting "0 failures" reads as "everything is
// verified." It is not. Several suites skip silently when their input is
// absent — including the AUC-24 >= 0.622 structural-degradation ratchet that
// CLAUDE.md names as the floor protecting the score from regressing into
// structure-blindness. CI sets only GEMINI_API_KEY, so REAL_SCRIPT_CORPUS_DIR
// is never set and that assertion has never executed in CI. A change making
// the doctor more structure-blind would merge green.
//
// This does not fix that gap — enforcing it needs either the corpus mounted
// via CI secrets or a required human step, which is a maintainer decision.
// What it does is stop the gap being INVISIBLE: every CI run now prints which
// gates were skipped and what each one would have protected. Silence was the
// dangerous part.
//
// A GATE CAN BE KEYED ON A FILE, NOT ONLY AN ENV VAR. This reporter used to
// know about three env-gated suites and reported "3 of 3" — while a fourth,
// tests/nvm/generate/craft-kb.test.ts, skipped 7 assertions whenever
// data/craft/craft-kb.json was absent (which is always, in CI: data/ is
// gitignored). A report that under-counts what it did not check is the same
// kind of false assurance as the "0 failures" line it exists to qualify, so
// gates now declare either `env` or `file`.
//
// Exit code is always 0. This reports; it does not block.

import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const GATES = [
  {
    env: 'REAL_SCRIPT_CORPUS_DIR',
    suite: 'tests/core/real-script-corpus.test.ts',
    protects:
      'AUC-24 >= 0.622 structural-degradation ratchet (shuffle + drop-every-third '
      + 'over a 24-script subset; last measured 0.731), plus 71 per-script '
      + 'health/verdict manifest locks.',
    ifSkipped:
      'A scoring change that made the doctor MORE structure-blind would merge '
      + 'with npm test reporting 0 failures. Run `npm run measure-real` locally '
      + 'before merging any scoring change — nothing checks this for you.',
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

/** A gate ran if its env var is set, or if its input file is present. */
function gateRan(g) {
  if (g.env) return Boolean(process.env[g.env]);
  if (g.file) return existsSync(path.join(REPO_ROOT, g.file));
  return false;
}

/** What the reader has to provide to make the gate run. */
function gateInput(g) {
  return g.env ? `unset:     ${g.env}` : `missing:   ${g.file}`;
}

const skipped = GATES.filter(g => !gateRan(g));
const ran = GATES.filter(g => gateRan(g));

if (skipped.length === 0) {
  process.stdout.write('All env-gated verification gates ran.\n');
} else {
  const lines = [
    '',
    '='.repeat(72),
    `UNVERIFIED GATES: ${skipped.length} of ${GATES.length} did NOT run`,
    '='.repeat(72),
    'A passing test suite does NOT mean these were checked.',
    '',
  ];
  for (const g of skipped) {
    lines.push(`  [SKIPPED] ${g.suite}`);
    lines.push(`     ${gateInput(g)}`);
    lines.push(`     protects:  ${g.protects}`);
    lines.push(`     therefore: ${g.ifSkipped}`);
    lines.push('');
  }
  if (ran.length) lines.push(`  Ran: ${ran.map(g => g.env ?? g.file).join(', ')}`);
  lines.push('='.repeat(72), '');
  process.stdout.write(lines.join('\n'));
}
