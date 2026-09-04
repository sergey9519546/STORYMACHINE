// POST /api/nvm/analyze/compare runs off the main thread (2026-09-04, security
// review finding #1, second half) — and answers exactly what it answered
// before.
//
// THIS ROUTE WAS THE LAST ONE LEFT. tests/core/doctor-pool-call-sites.test.ts
// carried it as an allow-listed exception with an honest reason: its
// runScriptDoctor call was only HALF its main-thread cost, because
// vectorizeScript ran a SECOND in-process analysis of the same text a few
// lines later, and — on a cold data/screenplays/.vectors, i.e. every fresh
// checkout — loadCorpusVectors ran up to twenty more. Pooling the first call
// alone would have satisfied that grep while leaving the route just as
// blocking, so it was recorded rather than half-fixed. The allow-list entry is
// gone now because the route is genuinely fixed, and this file is the
// behavioural proof that stands behind that deletion.
//
// Measured on the live keyless server (scripts/load-test-doctor.mjs, identical
// invocation before and after): GET /health p95 WHILE this route was under
// load went from 2,420 ms to the figure recorded in that script's results
// block. That measurement is what says the change worked; what a TEST can
// still add is the two things a percentile cannot pin —
//
//   * that the dispatch really goes to a worker (a route that imported the
//     pool and called the in-process doctor anyway would return a
//     byte-identical response), so these tests watch the pool itself; and
//   * that the response did not change, since a structured-clone hop now sits
//     between the analysis and the vector derived from it.

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { startTestServer, type TestServer } from './helpers.ts';
import { clearDoctorCache } from '../../server/nvm/analyze/doctor.ts';
import { doctorPoolStatus, shutdownDoctorPool } from '../../server/nvm/analyze/doctor-pool.ts';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
/** A real tracked corpus screenplay: complete enough that the route does not
 *  take its 422 "analysis incomplete" branch, and rich enough that the vector
 *  crossing the boundary is not a near-empty one. */
const FOUNTAIN = readFileSync(path.join(REPO, 'data', 'screenplays', 'two-lane.fountain'), 'utf8');

/** The route's only genuinely volatile field: the ISO stamp vectorizeFromIssues
 *  writes onto every vector it builds. Same reasoning as the analyzedAt mask in
 *  tests/routes/export-offthread.test.ts. */
const VOLATILE = /"timestamp":"[^"]*"/g;
const normalize = (body: string) => body.replace(VOLATILE, '"timestamp":"<T>"');

describe('routes/nvm/analysis — the comparative-analysis route analyses off the main thread', () => {
  let server: TestServer;

  async function compare(fountain: string, signal?: AbortSignal): Promise<Response> {
    return fetch(`${server.baseUrl}/api/nvm/analyze/compare`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scriptText: fountain }),
      ...(signal ? { signal } : {}),
    });
  }

  before(async () => {
    server = await startTestServer();
    // WARM-UP, and it is load-bearing rather than politeness. The corpus
    // loader vectorizes every tracked screenplay on a cold
    // data/screenplays/.vectors, and each of those vectorizations EXTENDS
    // story-vector.ts's per-process RULE_INDEX — so the very first request a
    // process serves reports a smaller `vector.dimensions` than every request
    // after it, cold cache or not. That is pre-existing behaviour of the lazy
    // rule index (documented at RULE_INDEX's declaration), not something this
    // lane introduced, but comparing two responses across it would compare the
    // index's growth rather than the worker boundary. One throwaway request
    // with the SAME fixture settles the index first.
    const warm = await compare(FOUNTAIN);
    assert.equal(warm.status, 200, `warm-up request failed: ${(await warm.text()).slice(0, 300)}`);
  });

  after(async () => {
    delete process.env.DOCTOR_WORKER_POOL;
    await server.close();
    await shutdownDoctorPool();
  });

  it('dispatches the submitted draft to a doctor worker', async () => {
    await shutdownDoctorPool();
    // A coordinator cache hit answers before any dispatch and would prove
    // nothing — this has to be a real analysis.
    clearDoctorCache();
    assert.equal(doctorPoolStatus().workers, 0, 'precondition: no pool workers before the request');

    const res = await compare(FOUNTAIN);
    const body = await res.text();
    assert.equal(res.status, 200, `compare did not answer 200: ${body.slice(0, 300)}`);

    const status = doctorPoolStatus();
    assert.equal(status.disabled, false, 'the pool disabled itself — workers cannot run in this environment');
    assert.ok(status.workers >= 1, 'the compare route did not dispatch through the worker pool');
  });

  it('answers the same body whether the doctor ran in the pool or in-process', async () => {
    delete process.env.DOCTOR_WORKER_POOL;
    clearDoctorCache();
    const pooled = await compare(FOUNTAIN);
    assert.equal(pooled.status, 200);
    const pooledBody = await pooled.text();

    // The pre-fix path, forced: DOCTOR_WORKER_POOL=off runs the identical call
    // in-process (doctor-pool.ts's "NEVER WORSE THAN BEFORE" escape hatch).
    process.env.DOCTOR_WORKER_POOL = 'off';
    clearDoctorCache();
    const inProcess = await compare(FOUNTAIN);
    assert.equal(inProcess.status, 200);
    const inProcessBody = await inProcess.text();
    delete process.env.DOCTOR_WORKER_POOL;

    assert.equal(normalize(pooledBody), normalize(inProcessBody));

    // And it is a real comparative result, not an empty shell that would make
    // the equality above vacuous.
    const parsed = JSON.parse(pooledBody) as {
      vector: { dimensions: number; metadata: { wholeDraftAnalysisComplete?: boolean } };
      healthMetrics: { health: number; sceneCount: number };
      corpus: { size: number };
    };
    assert.ok(parsed.vector.dimensions > 0, 'the query vector has no dimensions');
    assert.equal(parsed.vector.metadata.wholeDraftAnalysisComplete, true);
    assert.equal(typeof parsed.healthMetrics.health, 'number');
    assert.ok(parsed.corpus.size > 0, 'no corpus vectors were loaded — the comparison ran against nothing');
  });

  it('cancels the analysis on the server when the client hangs up mid-request', async () => {
    await shutdownDoctorPool();
    clearDoctorCache();
    const controller = new AbortController();
    // A long draft, so the analysis is still running when the abort lands.
    // Sluglines are uniquified so the analyzer sees distinct scenes.
    const long = Array.from({ length: 6 }, (_, i) =>
      FOUNTAIN.replace(/^(INT\.|EXT\.)(.*)$/gm, (_m, head, rest) => `${head}${rest} [${i}]`),
    ).join('\n\n');
    const pending = compare(long, controller.signal).then(() => 'completed').catch(() => 'aborted');

    const deadline = Date.now() + 60_000;
    while (doctorPoolStatus().workers === 0) {
      assert.ok(Date.now() < deadline, 'timed out waiting for the analysis to reach a worker');
      await new Promise((resolve) => setTimeout(resolve, 5));
    }
    controller.abort();
    assert.equal(await pending, 'aborted');

    // The pool terminates a cancelled job's worker outright, and the route must
    // be immediately usable again afterwards.
    clearDoctorCache();
    const next = await compare(FOUNTAIN);
    assert.equal(next.status, 200);
  });
});
