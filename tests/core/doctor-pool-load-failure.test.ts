// The Script Doctor pool's environment fallback — property (4) of
// server/nvm/analyze/doctor-pool.ts's header, tested for the failure it
// actually names (lane doctor-pool-fallback, 2026-09-19; session report
// §4 row 12, logic audit C9/C10).
//
// WHAT WAS WRONG. Property (4) promises that if workers cannot run in this
// environment — "an exotic loader setup, a locked-down runtime, a bundler
// that did not emit the worker file" — the pool disables itself permanently
// and every call runs in-process. The latch had two triggers: `new Worker()`
// throwing, and an `'error'` event on a worker that had not yet proved
// itself. Neither one fires for the case the sentence names most directly: a
// worker thread that STARTS fine and then cannot `import('./doctor.ts')`.
// doctor-worker.ts wrapped that import in the same try/catch as the analysis,
// so a load failure came back as an ordinary per-job `{type:'error'}`:
// `ready` stayed false, `slot.ready` never flipped, no `'error'` event was
// emitted, and the pool read it as one failed script. It rejected the caller,
// KEPT the slot, and did the whole thing again on the next request — the
// product's front door 500ing forever instead of falling back.
//
// Measured on the pre-change files (the lane record has the full probe
// output): call 1 REJECTED, `poolDisabled` false, `workers` 1, call 2
// REJECTED again, zero `doctor_pool_disabled` lines.
//
// HOW THE FAILURE IS INJECTED. `DOCTOR_WORKER_DOCTOR_MODULE` — a test-only
// override, ignored under NODE_ENV=production, documented in README.md — is
// the specifier doctor-worker.ts imports the doctor from. Pointing it at a
// module that does not resolve reproduces "this environment cannot load the
// doctor" inside the REAL worker file. That matters more than it looks: the
// alternative (a hand-written stand-in worker behind `DOCTOR_WORKER_SCRIPT`)
// would test the pool against a copy of doctor-worker.ts that is free to
// drift from the shipped one, which is exactly the thing this suite must not
// allow. `DOCTOR_WORKER_SCRIPT` is still used once below, for the one branch
// a real worker cannot reach on demand: the exit-code backstop for a
// `load_failed` message that never arrives.

import { describe, it, before, after, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import {
  runScriptDoctorOffThread, shutdownDoctorPool, doctorPoolStatus,
  resetDoctorPoolCountersForTests, resetDoctorPoolDisabledForTests,
} from '../../server/nvm/analyze/doctor-pool.ts';
import { DOCTOR_WORKER_LOAD_FAILED_EXIT } from '../../server/nvm/analyze/doctor-worker.ts';

// The eager respawn is pinned off for the same reason
// tests/core/doctor-worker-pool.test.ts pins it: this file counts workers and
// asserts that nothing is spawned after the latch, and a background warm-up
// racing those assertions would measure the pool plus a warm-up rather than
// the pool. (It is a no-op here anyway — respawnWarmWorkerAfterTerminate()
// returns immediately once `poolDisabled` is set — which is itself part of
// what makes the latch permanent.)
process.env.DOCTOR_POOL_EAGER_RESPAWN = '0';

const ENV_KEYS = [
  'DOCTOR_WORKER_DOCTOR_MODULE', 'DOCTOR_WORKER_SCRIPT', 'DOCTOR_WORKER_POOL',
  'DOCTOR_ANALYSIS_BUDGET_MS', 'DOCTOR_QUEUE_BUDGET_MS',
] as const;
let snapshot: Record<string, string | undefined> = {};

/** A specifier that is guaranteed not to resolve from doctor-worker.ts's own
 *  directory — the "bundler did not emit the module" case, reproduced. */
const MISSING_DOCTOR_MODULE = './__doctor_module_that_does_not_exist__.ts';

/** Distinct content per call: the coordinator-side LRU (property 1) answers a
 *  repeat submission without reaching the pool at all, which would make a
 *  "did this run in-process?" assertion pass for the wrong reason. */
function script(slug: string): string {
  return `INT. ${slug} - DAY\n\nA figure stands, waiting.\n\nFIGURE\nHello.\n\n`
    + `EXT. ${slug} STREET - NIGHT\n\nRain falls on nothing in particular.\n`;
}

/** Tee (never swallow) process output for the duration of `body`, and return
 *  every emitted line — same pattern as
 *  tests/core/engine-parse-failure-logs-no-writer-content.test.ts. */
async function captureLogLines(body: () => Promise<void>): Promise<string[]> {
  const captured: string[] = [];
  const realOut = process.stdout.write.bind(process.stdout);
  const realErr = process.stderr.write.bind(process.stderr);
  const tee = (real: typeof realOut) => ((chunk: string | Uint8Array, ...rest: unknown[]) => {
    captured.push(String(chunk));
    return (real as (...a: unknown[]) => boolean)(chunk, ...rest);
  }) as typeof process.stdout.write;
  process.stdout.write = tee(realOut);
  process.stderr.write = tee(realErr);
  try {
    await body();
  } finally {
    process.stdout.write = realOut;
    process.stderr.write = realErr;
  }
  return captured.join('').split('\n').filter(Boolean);
}

function linesFor(lines: string[], msg: string): string[] {
  return lines.filter((line) => line.includes(`"msg":"${msg}"`));
}

describe('doctor pool — a worker that cannot load the doctor (C9)', () => {
  before(() => { snapshot = Object.fromEntries(ENV_KEYS.map((k) => [k, process.env[k]])); });

  afterEach(async () => {
    await shutdownDoctorPool();
    for (const k of ENV_KEYS) {
      if (snapshot[k] === undefined) delete process.env[k];
      else process.env[k] = snapshot[k];
    }
    resetDoctorPoolDisabledForTests();
    resetDoctorPoolCountersForTests();
  });

  after(() => { delete process.env.DOCTOR_POOL_EAGER_RESPAWN; });

  it('latches the pool off, answers the in-flight caller in-process, and never spawns again', async () => {
    process.env.DOCTOR_WORKER_DOCTOR_MODULE = MISSING_DOCTOR_MODULE;
    delete process.env.DOCTOR_WORKER_POOL;
    resetDoctorPoolDisabledForTests();
    resetDoctorPoolCountersForTests();

    assert.equal(doctorPoolStatus().disabled, false, 'precondition: the latch starts open');
    assert.equal(doctorPoolStatus().disabledReason, null);

    let first: Awaited<ReturnType<typeof runScriptDoctorOffThread>> | undefined;
    let second: Awaited<ReturnType<typeof runScriptDoctorOffThread>> | undefined;
    const lines = await captureLogLines(async () => {
      // The caller that DISCOVERS the broken environment must still get a
      // report — pre-fix this rejected, and went on rejecting forever.
      first = await runScriptDoctorOffThread(script('LOAD FAILURE ONE'));
      second = await runScriptDoctorOffThread(script('LOAD FAILURE TWO'));
    });

    assert.ok(first, 'the in-flight caller got a result, not a rejection');
    assert.equal(typeof first.health, 'number');
    assert.ok(second, 'a later caller got a result too');
    assert.equal(typeof second.health, 'number');

    const status = doctorPoolStatus();
    assert.equal(status.disabled, true, 'the environment latch is set');
    assert.equal(typeof status.disabledReason, 'string');
    assert.match(
      status.disabledReason ?? '', /could not load the doctor module/,
      'the reason names the load failure rather than a generic worker error',
    );
    // 2026-09-19 review finding 7: the reason is sanitized before it is ever
    // stored, so it keeps the module-not-found WORDING ("Cannot find
    // module") but no longer names the actual file — that used to be an
    // absolute filesystem path (including this box's directory layout) and
    // this field reaches the unauthenticated GET /health.
    assert.match(status.disabledReason ?? '', /Cannot find module/,
      'the underlying loader wording survives sanitization');
    assert.doesNotMatch(status.disabledReason ?? '', /__doctor_module_that_does_not_exist__/,
      'the specific module path is sanitized away, not carried verbatim');
    assert.match(status.disabledReason ?? '', /<path>/,
      'sanitized path segments are replaced with the placeholder');
    assert.ok((status.disabledReason ?? '').length <= 200, 'the reason is capped at 200 chars');

    // Both submissions were served on the main thread, and the slot that
    // failed was dropped rather than kept and re-fed (the pre-fix behaviour
    // was `workers: 1` and two worker dispatches, both rejected).
    assert.equal(status.inProcessRuns, 2, 'both callers ran in-process');
    assert.equal(status.workers, 0, 'the failed worker was dropped and no replacement spawned');
    assert.equal(status.queued, 0, 'nothing is left waiting behind a pool that cannot run');

    const disabledLines = linesFor(lines, 'doctor_pool_disabled');
    assert.equal(disabledLines.length, 1,
      `exactly one doctor_pool_disabled line for the life of the latch, got ${disabledLines.length}`);
    assert.match(disabledLines[0]!, /"level":"warn"/);
    assert.match(disabledLines[0]!, /could not load the doctor module/);
  });

  it('a second submission after the latch never reaches a worker at all', async () => {
    process.env.DOCTOR_WORKER_DOCTOR_MODULE = MISSING_DOCTOR_MODULE;
    resetDoctorPoolDisabledForTests();
    resetDoctorPoolCountersForTests();

    await runScriptDoctorOffThread(script('LATCH PRIMER'));
    const afterFirst = doctorPoolStatus();
    assert.equal(afterFirst.disabled, true, 'precondition: the latch is set');

    await runScriptDoctorOffThread(script('POST LATCH'));
    const afterSecond = doctorPoolStatus();
    assert.equal(afterSecond.workerRuns, afterFirst.workerRuns,
      'no further dispatch to a worker — the latch short-circuits before the queue');
    assert.equal(afterSecond.inProcessRuns, afterFirst.inProcessRuns + 1);
    assert.equal(afterSecond.workers, 0, 'and no thread was spawned to find that out');
  });

  it('a worker that exits with the load-failure code, message lost, still latches (backstop)', async () => {
    // The one branch a real worker cannot be made to take on demand: the
    // `load_failed` message never arriving. This stand-in exits with the
    // agreed code and posts nothing, which is precisely the state the
    // 'exit' handler's backstop exists for.
    const dir = mkdtempSync(path.join(tmpdir(), 'doctor-pool-backstop-'));
    const stub = path.join(dir, 'silent-load-failure-worker.mjs');
    writeFileSync(stub, `process.exit(${DOCTOR_WORKER_LOAD_FAILED_EXIT});\n`);
    try {
      process.env.DOCTOR_WORKER_SCRIPT = stub;
      delete process.env.DOCTOR_WORKER_DOCTOR_MODULE;
      resetDoctorPoolDisabledForTests();
      resetDoctorPoolCountersForTests();

      const report = await runScriptDoctorOffThread(script('BACKSTOP'));
      assert.equal(typeof report.health, 'number', 'the caller still got a report');

      const status = doctorPoolStatus();
      assert.equal(status.disabled, true, 'the exit code alone is enough to latch');
      assert.match(status.disabledReason ?? '', /without loading the doctor module/);
      assert.equal(status.inProcessRuns, 1);
      assert.equal(status.workers, 0);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe('doctor pool — the fallback path is silent about the budget no more (C10)', () => {
  before(() => { snapshot = Object.fromEntries(ENV_KEYS.map((k) => [k, process.env[k]])); });

  afterEach(async () => {
    await shutdownDoctorPool();
    for (const k of ENV_KEYS) {
      if (snapshot[k] === undefined) delete process.env[k];
      else process.env[k] = snapshot[k];
    }
    resetDoctorPoolDisabledForTests();
    resetDoctorPoolCountersForTests();
  });

  it('an in-process run past the analysis budget logs doctor_inprocess_over_budget with its elapsed ms', async () => {
    // No rejection is asserted, and none is wanted: the budget is not
    // ENFORCEABLE here (there is no thread to terminate), so adding one would
    // stop the caller's wait while the analysis kept running underneath them.
    // The claim under test is narrower and is the whole point of C10: the
    // overrun is no longer invisible.
    process.env.DOCTOR_WORKER_POOL = 'off';
    process.env.DOCTOR_ANALYSIS_BUDGET_MS = '1';
    process.env.DOCTOR_QUEUE_BUDGET_MS = '60000';
    resetDoctorPoolDisabledForTests();
    resetDoctorPoolCountersForTests();

    const lines = await captureLogLines(async () => {
      await runScriptDoctorOffThread(script('OVER BUDGET'));
    });

    const overBudget = linesFor(lines, 'doctor_inprocess_over_budget');
    assert.equal(overBudget.length, 1, 'one line, after the run, naming what it cost');
    assert.match(overBudget[0]!, /"level":"warn"/);
    assert.match(overBudget[0]!, /"analysisBudgetMs":1\b/);
    assert.match(overBudget[0]!, /"elapsedMs":\d+/);
    assert.match(overBudget[0]!, /"queueBudgetMs":60000/);
  });

  it('says nothing when the operator has switched the wall-clock bound off', async () => {
    process.env.DOCTOR_WORKER_POOL = 'off';
    process.env.DOCTOR_ANALYSIS_BUDGET_MS = '1';
    process.env.DOCTOR_QUEUE_BUDGET_MS = 'off';
    resetDoctorPoolDisabledForTests();
    resetDoctorPoolCountersForTests();

    const lines = await captureLogLines(async () => {
      await runScriptDoctorOffThread(script('BUDGET OFF'));
    });
    assert.equal(linesFor(lines, 'doctor_inprocess_over_budget').length, 0);
  });

  it('says nothing about a deep read, which is in-process by design and I/O-bound', async () => {
    process.env.DOCTOR_ANALYSIS_BUDGET_MS = '1';
    process.env.DOCTOR_QUEUE_BUDGET_MS = '60000';
    resetDoctorPoolDisabledForTests();
    resetDoctorPoolCountersForTests();

    const lines = await captureLogLines(async () => {
      await runScriptDoctorOffThread(script('DEEP READ'), undefined, { deepRead: true });
    });
    assert.equal(linesFor(lines, 'doctor_inprocess_over_budget').length, 0,
      'a deep read legitimately outruns a CPU budget — warning on every one would bury the real case');
  });
});
