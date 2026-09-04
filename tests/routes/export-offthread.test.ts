// The doctor-consuming EXPORT routes run off the main thread (2026-09-04,
// security review finding #1) — and produce exactly what they produced before.
//
// The routes: POST /api/export/coverage-letter, /coverage, /pitchkit, /slate,
// /verify. Every one of them re-runs the doctor for authenticity (a producer
// must never wonder whether the exported numbers are the numbers the tool
// computed), and every one of them used to do it with a direct
// runScriptDoctor call on Node's main thread. The review measured what that
// costs everyone else: one unauthenticated POST of a large-but-schema-legal
// script stalled a concurrent GET /health for 2.6-2.8s, while the same input
// through the pool-backed /api/scriptide/doctor left /health at ~10ms.
//
// TWO THINGS NEED PROVING, and neither is visible in a response body on its
// own:
//
//   * OFF THE MAIN THREAD — a route that imported the pool and then called
//     the in-process function anyway would return a byte-identical export. So
//     these tests observe the POOL (doctorPoolStatus); the server runs in this
//     process, so it is the same pool. Same technique as
//     tests/routes/scriptide-doctor-pdf-offthread.test.ts.
//
//   * IDENTICAL OUTPUT — the pool boundary is a structured clone, so "same
//     report" is a real risk, not a ceremonial one.
//     tests/core/doctor-worker-pool.test.ts pins that at the REPORT level; this
//     file pins it at the level a user actually sees, the exported document,
//     by rendering each export twice — once through the pool, once with
//     DOCTOR_WORKER_POOL=off forcing the old in-process path — and comparing
//     the bytes.
//
// tests/core/doctor-pool-call-sites.test.ts is the cheap total guard that no
// route regresses to the in-process call; this file is the behavioural proof
// for the routes that actually did.

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { startTestServer, type TestServer } from './helpers.ts';
import { clearDoctorCache } from '../../server/nvm/analyze/doctor.ts';
import { doctorPoolStatus, shutdownDoctorPool } from '../../server/nvm/analyze/doctor-pool.ts';

const FOUNTAIN = `INT. WAREHOUSE - NIGHT

Rain hammers the tin roof. JAX crouches behind a stack of crates, a gun in his hand.

JAX
(whispering)
She said midnight. It's already past that.

MARA
We wait. If they're not here by dawn, we run.

JAX
I don't like waiting in the dark.

EXT. WAREHOUSE - CONTINUOUS

A truck's headlights sweep across the gravel lot. MARA watches through a cracked window.

MARA
Someone's here. Get down.

INT. WAREHOUSE - MOMENTS LATER

The door bursts open. A STRANGER steps inside, face hidden in shadow.

STRANGER
I know what you did.

JAX
That's not true.

STRANGER
You've been lying to her since the beginning.

MARA
Jax? What is he talking about?

EXT. HIGHWAY - DAWN

JAX and MARA run toward the car as the "SILVER KEY" catches the first light.

MARA
Just drive. We'll figure out the rest later.

JAX
I'm sorry. I should have told you everything.
`;

/** A script long enough that its analysis is still running a second later —
 *  needed to abort one mid-flight. Sluglines are uniquified so the analyzer
 *  sees distinct scenes rather than one repeated location. */
function longFountain(repeats: number): string {
  return Array.from({ length: repeats }, (_, i) =>
    FOUNTAIN.replace(/^(INT\.|EXT\.)(.*)$/gm, (_m, head, rest) => `${head}${rest} [${i}]`),
  ).join('\n\n');
}

const contentHash = (fountain: string) => createHash('sha256').update(fountain.trim()).digest('hex');

/** The five doctor-consuming export routes, with a body for each. */
const ROUTES: Array<{ path: string; body: (f: string) => unknown; json: boolean }> = [
  { path: '/api/export/coverage-letter', body: (f) => ({ fountain: f, title: 'The Long Wait' }), json: true },
  { path: '/api/export/coverage', body: (f) => ({ fountain: f, title: 'The Long Wait' }), json: false },
  { path: '/api/export/pitchkit', body: (f) => ({ fountain: f, title: 'The Long Wait' }), json: false },
  {
    path: '/api/export/slate',
    body: (f) => ({ scripts: [{ title: 'A', fountain: f }, { title: 'B', fountain: `${f}\n\n/* second */` }] }),
    json: true,
  },
  // /verify returns before the doctor ever runs if the hash does not match, so
  // the expected hash must be the real one — otherwise this would assert
  // against a route that never analysed anything.
  { path: '/api/export/verify', body: (f) => ({ fountain: f, expected: { contentHash: contentHash(f) } }), json: true },
];

// The ONE thing that legitimately differs between two runs over identical
// input: the wall-clock stamp the doctor refreshes on every read (analyzedAt),
// rendered into the exports as a formatted UTC date. It is the same field
// scripts/check-doctor-output-identity.mjs strips for the same reason — noise
// by construction, with nothing else in the report derived from it.
// Both shapes coverage-html.ts/coverage-letter.ts render: the date alone
// ("September 4, 2026") and the full stamp, whose date/time separator is ICU's
// — " at " for a long month name, "," in other locales/versions. Getting that
// separator wrong is not a cosmetic bug in this file: it leaves the SECONDS
// unmasked, and the test then fails whenever the two runs land either side of
// a second boundary, which is how it was caught.
const RENDERED_TIMESTAMP =
  /(?:January|February|March|April|May|June|July|August|September|October|November|December) \d{1,2}, \d{4}(?:(?:,| at) \d{2}:\d{2}:\d{2}\s(?:AM|PM) [A-Z]{2,5})?/g;
/** Response-level wall-clock fields, same reasoning. */
const VOLATILE_JSON_FIELDS = /"(verifiedAt|rankedAt|analyzedAt)":\s*\d+/g;

function normalize(body: string): string {
  return body.replace(RENDERED_TIMESTAMP, '<ANALYZED-AT>').replace(VOLATILE_JSON_FIELDS, '"$1":0');
}

/** Two multi-KB HTML documents compared with assert.equal produce an
 *  unreadable dump, and the whole point of this test is to SHOW what diverged
 *  across the clone boundary. Report the first differing offset in context. */
function firstDifference(a: string, b: string): string {
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i += 1;
  if (i === a.length && i === b.length) return 'identical';
  const window = 90;
  return `first difference at offset ${i} of ${a.length}/${b.length}:\n`
    + `  pooled:     …${JSON.stringify(a.slice(Math.max(0, i - window), i + window))}\n`
    + `  in-process: …${JSON.stringify(b.slice(Math.max(0, i - window), i + window))}`;
}

describe('routes/export — every doctor-consuming export runs off the main thread', () => {
  let server: TestServer;
  before(async () => { server = await startTestServer(); });
  after(async () => {
    delete process.env.DOCTOR_WORKER_POOL;
    await server.close();
    // Leave no worker holding this test process open.
    await shutdownDoctorPool();
  });

  async function post(path: string, body: unknown, signal?: AbortSignal): Promise<Response> {
    return fetch(`${server.baseUrl}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      ...(signal ? { signal } : {}),
    });
  }

  async function waitFor(predicate: () => boolean, timeoutMs: number, what: string): Promise<void> {
    const deadline = Date.now() + timeoutMs;
    while (!predicate()) {
      if (Date.now() > deadline) assert.fail(`timed out after ${timeoutMs}ms waiting for ${what}`);
      await new Promise((resolve) => setTimeout(resolve, 5));
    }
  }

  for (const route of ROUTES) {
    it(`${route.path} dispatches the analysis to a doctor worker`, async () => {
      await shutdownDoctorPool();
      // A cache hit would answer before any dispatch and prove nothing — this
      // has to be a real analysis.
      clearDoctorCache();
      assert.equal(doctorPoolStatus().workers, 0, 'precondition: no pool workers before the request');

      const res = await post(route.path, route.body(FOUNTAIN));
      const body = await res.text();
      assert.equal(res.status, 200, `${route.path} did not answer 200: ${body.slice(0, 200)}`);

      const status = doctorPoolStatus();
      assert.equal(status.disabled, false, 'the pool disabled itself — workers cannot run in this environment');
      assert.ok(status.workers >= 1, `${route.path} did not dispatch through the worker pool`);
    });
  }

  for (const route of ROUTES) {
    it(`${route.path} exports the same bytes whether the doctor ran in the pool or in-process`, async () => {
      // Pool path.
      delete process.env.DOCTOR_WORKER_POOL;
      clearDoctorCache();
      const pooled = await post(route.path, route.body(FOUNTAIN));
      assert.equal(pooled.status, 200);
      const pooledBody = await pooled.text();

      // The pre-fix path, forced: doctor-pool.ts's DOCTOR_WORKER_POOL=off
      // escape hatch runs the identical call in-process. Clearing the cache
      // matters — otherwise the second run is answered from the coordinator's
      // LRU and the comparison is vacuous.
      process.env.DOCTOR_WORKER_POOL = 'off';
      clearDoctorCache();
      const inProcess = await post(route.path, route.body(FOUNTAIN));
      assert.equal(inProcess.status, 200);
      const inProcessBody = await inProcess.text();
      delete process.env.DOCTOR_WORKER_POOL;

      assert.ok(
        normalize(pooledBody) === normalize(inProcessBody),
        `${route.path} produced a different export across the pool's structured-clone boundary — `
        + firstDifference(normalize(pooledBody), normalize(inProcessBody)),
      );
      assert.ok(pooledBody.length > 100, 'precondition: the export is not empty');
    });
  }

  it('cancels the analysis on the server when the client hangs up mid-export', async () => {
    await shutdownDoctorPool();
    clearDoctorCache();
    const controller = new AbortController();
    const pending = post('/api/export/coverage-letter', { fountain: longFountain(40) }, controller.signal)
      .then(() => 'completed')
      .catch(() => 'aborted');

    // Wait until the job is actually with a worker: before dispatch there is
    // nothing to cancel, so aborting earlier would prove nothing.
    await waitFor(() => doctorPoolStatus().workers >= 1, 60_000, 'the export analysis to reach a worker');
    controller.abort();

    // The pool terminates a cancelled job's worker outright (doctor-pool.ts's
    // dispatch/onAbort) and drops the slot. Had the abort never reached the
    // pool, the worker would finish the analysis and stay in the pool, idle.
    await waitFor(() => doctorPoolStatus().workers === 0, 30_000, 'the cancelled worker to be terminated');
    assert.equal(await pending, 'aborted');

    // And the server is immediately usable again — a cancelled export must not
    // leave the pool poisoned for the next writer.
    clearDoctorCache();
    const next = await post('/api/export/coverage-letter', { fountain: FOUNTAIN, title: 'After Cancel' });
    assert.equal(next.status, 200);
    assert.ok((await next.json()).markdown.includes('After Cancel'));
  });
});
