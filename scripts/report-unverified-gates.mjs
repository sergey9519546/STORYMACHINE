#!/usr/bin/env node
// Reports which verification gates did NOT actually run.
//
// WHY THIS EXISTS. `npm test` reporting "0 failures" reads as "everything is
// verified." It is not. Three suites are env-gated and skip silently when
// their input is absent — including the AUC-24 >= 0.622 structural-degradation
// ratchet that CLAUDE.md names as the floor protecting the score from
// regressing into structure-blindness. CI sets only GEMINI_API_KEY, so
// REAL_SCRIPT_CORPUS_DIR is never set and that assertion has never executed in
// CI. A change making the doctor more structure-blind would merge green.
//
// This does not fix that gap — enforcing it needs either the corpus mounted
// via CI secrets or a required human step, which is a maintainer decision.
// What it does is stop the gap being INVISIBLE: every CI run now prints which
// gates were skipped and what each one would have protected. Silence was the
// dangerous part.
//
// Exit code is always 0. This reports; it does not block.

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
];

const skipped = GATES.filter(g => !process.env[g.env]);
const ran = GATES.filter(g => process.env[g.env]);

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
    lines.push(`     unset:     ${g.env}`);
    lines.push(`     protects:  ${g.protects}`);
    lines.push(`     therefore: ${g.ifSkipped}`);
    lines.push('');
  }
  if (ran.length) lines.push(`  Ran: ${ran.map(g => g.env).join(', ')}`);
  lines.push('='.repeat(72), '');
  process.stdout.write(lines.join('\n'));
}
