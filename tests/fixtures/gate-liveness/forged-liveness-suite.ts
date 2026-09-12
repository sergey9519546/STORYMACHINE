// FIXTURE, NOT A SUITE. The round-1 REVIEWER'S forged benchmark: a suite that
// asserts nothing and FORGES the mutation check's proof line.
//
// ── Provenance ─────────────────────────────────────────────────────────────
// docs/audits/2026-09-12-adversarial/instrument-review.md, round 1 item 1.
// Reproduced verbatim in substance from the reviewer's own probe
// (`forged-liveness-suite.ts`), committed here so the attack it demonstrates
// has a permanent regression test instead of living in a scratch directory.
//
// ── What it attacks ────────────────────────────────────────────────────────
// The round-1 mutation check required ONE thing of the mutated run: an output
// line matching `not ok … clears <CONSTANT> = <raised>`. Two properties made
// that forgeable:
//
//   * the raised value is `round4(measured + 0.05)` computed from the floor's
//     own measurement, which this suite also computes — so it is predictable;
//   * `mutationWasCaught` regex-matched TEXT, and `verifiedGateOutcome` ignored
//     the mutated run's exit code entirely.
//
// So printing one literal line was enough. Measured on the round-1 reporter:
// `[RAN]`, `VERIFIED GATES: 1 of 1`, exit 0 — with no floor asserted anywhere.
//
// ── Why it is caught now ───────────────────────────────────────────────────
// Three signals, all of which a genuine suite produces for free and each of
// which a forgery must manufacture separately:
//
//   1. EXIT CODE. This suite's assertions all pass, so its mutated run exits 0.
//      The genuine suite's floor assertion fires and it exits 1.
//   2. THE NAMED FAILURE. Still required, still forgeable on its own — which is
//      why it is no longer alone.
//   3. NO PASSING TWIN. The forged failure line does not stop the real (vacuous)
//      `it` block from running, and under the hook its title is generated from
//      the RAISED value, so the same title is also reported as `ok`. The genuine
//      suite emits only the failure.
//
// Any one of (1) or (3) catches this file; both are asserted in
// tests/scripts/report-unverified-gates.test.ts so that removing either is a
// visible red test rather than a silent weakening.
//
// ── Why this filename ──────────────────────────────────────────────────────
// It does NOT end in `.test.ts`, so scripts/run-tests.mjs never collects it. It
// is run only through the reporter, as the suite of a synthetic verified gate.
//
// Nothing here may be copied into a real suite. It is an artifact of an attack.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { PUBLIC_FLOORS } from '../../../scripts/lib/auc.ts';
import { measurePublicBenchmark } from '../../../scripts/lib/public-benchmark.ts';

const result = await measurePublicBenchmark();
const byId = new Map(result.degradations.map((d) => [d.id, d]));

// The real FLOOR report — so check (4) passes — plus ONE forged failure line,
// aimed at the first floor the reporter can raise, with the value it will use.
const lines: string[] = [];
let forged = '';
for (const floor of PUBLIC_FLOORS) {
  const d = byId.get(floor.degradation)!;
  const measured = floor.statistic === 'paired' ? d.aucPaired : d.aucAllPairs;
  lines.push(
    `  FLOOR ${floor.constant} measured=${measured.toFixed(4)} floor=${floor.value} `
    + `verdict=${measured >= floor.value ? 'PASS' : 'FAIL'} primary=${floor.primary ? 'yes' : 'no'}`,
  );
  if (!forged) {
    const raised = Math.round(Math.min(measured + 0.05, 0.9999) * 1e4) / 1e4;
    if (raised > measured) {
      forged = `not ok 99 - ${floor.degradation} ${floor.statistic} AUC clears ${floor.constant} = ${raised}`;
    }
  }
}
process.stdout.write(
  '\nFLOOR LIVENESS (parsed by scripts/report-unverified-gates.mjs — one line per floor constant)\n'
  + `${lines.join('\n')}\n${forged}\n`,
);

describe('public benchmark — the ratchet (six floors: three degradations x two statistics)', () => {
  for (const floor of PUBLIC_FLOORS) {
    // THE FORGERY. The genuine suite asserts `measured >= floor.value` here.
    it(`${floor.degradation} ${floor.statistic} AUC clears ${floor.constant} = ${floor.value}`, () => {
      assert.ok(true);
    });
  }
});
