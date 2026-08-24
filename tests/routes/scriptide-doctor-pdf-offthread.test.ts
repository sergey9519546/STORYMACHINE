// POST /api/scriptide/doctor/pdf — off-thread execution (2026-08-24).
//
// This route was the last quick-read entry point still calling
// runScriptDoctor on the main thread, and it was the worst one to leave
// there: a PDF is how a feature-length screenplay actually arrives, so an
// in-process call held the event loop — and therefore every other user's
// request — for the whole analysis. It now goes through the same worker pool
// /doctor and /doctor/stream use (server/nvm/analyze/doctor-pool.ts).
//
// Neither half of that is provable from the response body alone. A route that
// imported the pool and then called the in-process function anyway would
// return a byte-identical report, and a "cancel" that only closed the socket
// would look exactly like one that stopped the work. So these tests observe
// the pool itself (doctorPoolStatus) — the server runs in this process, so it
// is the same pool — and assert the report contract separately.
//
// A SEPARATE FILE from scriptide-doctor-pdf.test.ts on purpose: the route
// sits behind heavyBodyLimiter (10 uploads/min) and express-rate-limit's
// store is a module-level singleton shared by every test server in a process,
// so both suites' uploads in one file trip the limit and start asserting
// against 429s.

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startTestServer, type TestServer } from './helpers.ts';
import { clearDoctorCache } from '../../server/nvm/analyze/doctor.ts';
import { doctorPoolStatus, shutdownDoctorPool } from '../../server/nvm/analyze/doctor-pool.ts';
import { FIXTURE_PDF, buildLongScreenplayPdf } from './pdf-fixture.ts';

describe('routes/scriptide/doctor/pdf — runs off the main thread', () => {
  let server: TestServer;
  before(async () => { server = await startTestServer(); });
  after(async () => {
    await server.close();
    // Leave no worker holding this test process open.
    await shutdownDoctorPool();
  });

  const postPdf = (body: Buffer, signal?: AbortSignal) =>
    fetch(`${server.baseUrl}/api/scriptide/doctor/pdf`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/pdf' },
      body: new Uint8Array(body),
      ...(signal ? { signal } : {}),
    });

  async function waitFor(predicate: () => boolean, timeoutMs: number, what: string): Promise<void> {
    const deadline = Date.now() + timeoutMs;
    while (!predicate()) {
      if (Date.now() > deadline) assert.fail(`timed out after ${timeoutMs}ms waiting for ${what}`);
      await new Promise((resolve) => setTimeout(resolve, 5));
    }
  }

  it('dispatches the analysis to a doctor worker instead of running it in-process', async () => {
    await shutdownDoctorPool();
    // A cache hit would return before any dispatch and prove nothing — this
    // has to be a real analysis.
    clearDoctorCache();
    assert.equal(doctorPoolStatus().workers, 0, 'precondition: no pool workers before the request');

    const res = await postPdf(FIXTURE_PDF);
    assert.equal(res.status, 200);
    const body = await res.json();
    // Contract unchanged by the move: same 14 passes, same source block.
    assert.equal(body.passes.length, 14);
    assert.equal(body.source.format, 'pdf');
    assert.equal(typeof body.health, 'number');
    assert.ok(Array.isArray(body.locatedIssues));
    assert.ok(Array.isArray(body.rootCauses));

    const status = doctorPoolStatus();
    assert.equal(status.disabled, false, 'the pool disabled itself — workers cannot run in this environment');
    assert.ok(status.workers >= 1, 'the pdf route did not dispatch through the worker pool');
  });

  it('produces the same report the pooled fountain route does for the converted text', async () => {
    clearDoctorCache();
    const pdfRes = await postPdf(FIXTURE_PDF);
    assert.equal(pdfRes.status, 200);
    const pdfBody = await pdfRes.json();

    clearDoctorCache();
    const fountainRes = await fetch(`${server.baseUrl}/api/scriptide/doctor`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fountain: pdfBody.source.convertedFountain }),
    });
    assert.equal(fountainRes.status, 200);
    const fountainBody = await fountainRes.json();

    // Everything except the two fields that legitimately differ: `source`
    // (pdf vs fountain, by definition) and the wall-clock stamp.
    delete pdfBody.analyzedAt; delete fountainBody.analyzedAt;
    delete pdfBody.source; delete fountainBody.source;
    assert.deepEqual(pdfBody, fountainBody);
  });

  it('cancels the analysis on the server when the client hangs up', async () => {
    await shutdownDoctorPool();
    clearDoctorCache();
    const controller = new AbortController();
    const pending = postPdf(buildLongScreenplayPdf(200), controller.signal)
      .then(() => 'completed')
      .catch(() => 'aborted');

    // Wait until the job is actually with a worker: before dispatch there is
    // nothing to cancel, so aborting earlier would prove nothing about the
    // pool.
    await waitFor(() => doctorPoolStatus().workers >= 1, 60_000, 'the pdf analysis to reach a worker');
    controller.abort();

    // The pool terminates a cancelled job's worker outright (doctor-pool.ts's
    // dispatch/onAbort) and drops the slot. If the abort never reached the
    // pool, the worker would finish the analysis and stay in the pool, idle.
    await waitFor(() => doctorPoolStatus().workers === 0, 15_000, 'the cancelled worker to be terminated');
    assert.equal(await pending, 'aborted');

    // And the server is immediately usable again — a cancelled analysis must
    // not leave the pool poisoned for the next writer.
    clearDoctorCache();
    const next = await postPdf(FIXTURE_PDF);
    assert.equal(next.status, 200);
    assert.equal((await next.json()).passes.length, 14);
  });
});
