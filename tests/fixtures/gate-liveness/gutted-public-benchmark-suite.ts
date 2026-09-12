// FIXTURE, NOT A SUITE. The 2026-09-12 adversarial review's gutted public
// benchmark, preserved so the gate reporter's liveness check is tested against
// the exact attack it exists to catch.
//
// ── Provenance ─────────────────────────────────────────────────────────────
// docs/audits/2026-09-12-adversarial/engine-logic.md finding 7. The
// investigator replaced tests/core/public-benchmark.test.ts with a file that
//
//   * keeps the filename,
//   * keeps the `describe`/`it` titles,
//   * imports `measurePublicBenchmark` and runs the real 32-script
//     measurement,
//   * and asserts `Number.isFinite(d.aucPaired)` instead of
//     `d.aucPaired >= floor`,
//
// then ran `node scripts/report-unverified-gates.mjs`. It printed
// `[RAN] tests/core/public-benchmark.test.ts` and exited 0, with
// scripts/lib/auc.ts untouched so the diff looked innocent. That is the bug.
//
// ── Why it is deliberately the GENEROUS version of the attack ──────────────
// It also prints the `FLOOR …` liveness lines the real suite prints, with real
// measured values, so it passes the reporter's check (4) — "the suite reported
// every floor it guards". Only check (5), the mutation run, can tell it from
// the genuine suite. A weaker fixture that skipped the print would be caught by
// (4) and would prove nothing about (5), which is the check this file exists to
// exercise.
//
// ── Why this filename ──────────────────────────────────────────────────────
// It does NOT end in `.test.ts`, so scripts/run-tests.mjs never collects it
// (that collector takes `*.test.ts` only, and its own audit requires every
// `*.test.ts` in the tree to be collected or explicitly excused). It is run
// only by tests/scripts/report-unverified-gates.test.ts, through the reporter,
// as the suite of a synthetic verified gate.
//
// Nothing here may be copied into a real suite. It is an artifact of a failure.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { PUBLIC_FLOORS } from '../../../scripts/lib/auc.ts';
import { measurePublicBenchmark } from '../../../scripts/lib/public-benchmark.ts';

const result = await measurePublicBenchmark();
const byId = new Map(result.degradations.map((d) => [d.id, d]));

// The same printed block the genuine suite emits — real measurements, real
// floor values. This is what makes the fixture pass check (4).
process.stdout.write(
  '\nFLOOR LIVENESS (parsed by scripts/report-unverified-gates.mjs — one line per floor constant)\n'
  + PUBLIC_FLOORS
    .map((floor) => {
      const d = byId.get(floor.degradation)!;
      const measured = floor.statistic === 'paired' ? d.aucPaired : d.aucAllPairs;
      return `  FLOOR ${floor.constant} measured=${measured.toFixed(4)} floor=${floor.value} `
        + `verdict=${measured >= floor.value ? 'PASS' : 'FAIL'} primary=${floor.primary ? 'yes' : 'no'}`;
    })
    .join('\n')
  + '\n',
);

describe('public benchmark — the ratchet (six floors: three degradations x two statistics)', () => {
  for (const floor of PUBLIC_FLOORS) {
    const d = byId.get(floor.degradation)!;
    const measured = floor.statistic === 'paired' ? d.aucPaired : d.aucAllPairs;

    // THE GUTTING. The genuine suite asserts `measured >= floor.value` here.
    it(`${floor.degradation} ${floor.statistic} AUC clears ${floor.constant} = ${floor.value}${floor.primary ? ' (PRIMARY)' : ''}`, () => {
      assert.ok(Number.isFinite(measured), `${floor.degradation} ${floor.statistic} AUC is not a number`);
    });
  }
});
