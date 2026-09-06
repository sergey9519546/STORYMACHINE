// What a writer's client actually receives when the Script Doctor's
// per-analysis wall-clock budget fires — Decision #7 (2026-09-06).
//
// The unit half (tests/core/doctor-analysis-budget.test.ts) proves the pool
// stops the job and throws the typed error. This file proves the two things
// that unit test structurally cannot: that the error reaches the WIRE in the
// shape the client already knows how to render, on BOTH doctor entry points —
// the JSON route (a 400 with the same `{ error }` body the Fountain shape
// guard's own 4xx uses, via server/app.ts's global error handler) and the SSE
// route (a `doctor_error` frame, because that route has already flushed its
// headers and can no longer send a status). Both carry the SAME registered
// sentence, so a writer meets one wording no matter which route the panel used.
//
// The budget is stubbed by shrinking it to 1 ms rather than by submitting a
// genuinely slow script: the branch under test is the same either way, and a
// ~14 s fixture would add ~14 s to every CI run to prove it.

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startTestServer, type TestServer } from './helpers.ts';
import { clearDoctorCache } from '../../server/nvm/analyze/doctor.ts';
import { doctorPoolStatus, shutdownDoctorPool } from '../../server/nvm/analyze/doctor-pool.ts';
import { doctorAnalysisBudgetSentence } from '../../server/lib/doctor-budget.ts';

const SCRIPT = 'INT. ROOM - DAY\n\nA figure waits by the window.\n\nALEX\nWe should go.\n\nSAM\nNot yet.\n';
const SENTENCE_AT_1MS = doctorAnalysisBudgetSentence(1);

describe('POST /api/scriptide/doctor(/stream) — the per-analysis budget on the wire', () => {
  let server: TestServer;
  let poolUsable = false;

  before(async () => {
    server = await startTestServer();
    await shutdownDoctorPool();
    const status = doctorPoolStatus();
    poolUsable = status.enabled && !status.disabled;
  });
  after(async () => {
    delete process.env.DOCTOR_ANALYSIS_BUDGET_MS;
    await server.close();
    await shutdownDoctorPool();
  });

  const postDoctor = (path: string, body: unknown) =>
    fetch(`${server.baseUrl}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

  it('the JSON route answers 400 with the registered sentence in the shape guard\'s own `{ error }` body', async (t) => {
    if (!poolUsable) { t.skip('worker pool unavailable — the budget is a worker-path mechanism'); return; }
    clearDoctorCache();
    process.env.DOCTOR_ANALYSIS_BUDGET_MS = '1';
    try {
      const res = await postDoctor('/api/scriptide/doctor', { fountain: SCRIPT });
      assert.equal(res.status, 400, 'same status the shape guard uses for its own analysis-cost rejections');
      const body = await res.json() as Record<string, unknown>;
      assert.deepEqual(Object.keys(body), ['error'], 'the body shape must match validate()\'s 400 exactly');
      assert.equal(body.error, SENTENCE_AT_1MS);
      // Never the global handler's generic 4xx copy: the request was
      // well-formed, it was the analysis that did not finish.
      assert.notEqual(body.error, 'Malformed request');
    } finally {
      delete process.env.DOCTOR_ANALYSIS_BUDGET_MS;
    }
  });

  it('the SSE route sends the SAME sentence in a doctor_error frame the panel already renders', async (t) => {
    if (!poolUsable) { t.skip('worker pool unavailable'); return; }
    clearDoctorCache();
    process.env.DOCTOR_ANALYSIS_BUDGET_MS = '1';
    try {
      const res = await postDoctor('/api/scriptide/doctor/stream', { fountain: SCRIPT });
      // SSE opens 200 and reports failures in-band — that is the transport,
      // not a claim that the analysis succeeded.
      assert.equal(res.status, 200);
      const text = await res.text();
      const frames = text.split('\n\n').filter(Boolean).map((f) => {
        const line = f.split('\n').find((l) => l.startsWith('data: '));
        return line ? JSON.parse(line.slice(6)) as Record<string, unknown> : null;
      }).filter(Boolean) as Record<string, unknown>[];
      const errorFrame = frames.find((f) => f.type === 'doctor_error');
      assert.ok(errorFrame, `expected a doctor_error frame, got ${JSON.stringify(frames.map((f) => f.type))}`);
      assert.equal(errorFrame.error, SENTENCE_AT_1MS);
      // Never the route's generic fault copy — a bound doing its job is not
      // an internal error, and 'internal_error' is what the writer used to
      // see for anything that was not an AbortError.
      assert.notEqual(errorFrame.error, 'internal_error');
      assert.ok(!frames.some((f) => f.type === 'doctor_result'), 'no report may be reported alongside a stopped run');
    } finally {
      delete process.env.DOCTOR_ANALYSIS_BUDGET_MS;
    }
  });

  it('with the shipped budget in force, the same request is answered normally — the bound is invisible in ordinary use', async () => {
    clearDoctorCache();
    delete process.env.DOCTOR_ANALYSIS_BUDGET_MS;
    const res = await postDoctor('/api/scriptide/doctor', { fountain: SCRIPT });
    assert.equal(res.status, 200);
    const body = await res.json() as Record<string, unknown>;
    assert.ok(body.contentHash, 'the ordinary path must still return a report');
    assert.ok(!('error' in body));
  });
});
