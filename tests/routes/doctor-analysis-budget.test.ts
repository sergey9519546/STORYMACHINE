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
/** Distinct per call so the doctor's content-hash LRU cannot answer a request
 *  this test needs to reach the pool. */
const distinctScript = (tag: string): string =>
  `INT. ROOM ${tag} - DAY\n\nA figure waits by the window.\n\nALEX\nWe should go.\n\nSAM\nNot yet.\n`;

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
    delete process.env.DOCTOR_QUEUE_BUDGET_MS;
    delete process.env.DOCTOR_WORKER_POOL_SIZE;
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

  // ── The round-2 BLOCKER on the wire ──────────────────────────────────────
  // Reproduced by the reviewer with 60 concurrent distinct 346 KB features on
  // a 2-worker pool (on this box: 40 of 60 rejected at ~34.8 s reading "This
  // draft took longer to analyze … split the draft into shorter files", for
  // jobs that never ran). The mechanism is identical at any scale — the
  // worker is busy, the rest of the burst waits — so this drives the same
  // path over HTTP deterministically, with one worker and a 1 ms queue
  // budget, instead of shipping a 35-second load-sensitive burst into CI.
  // The real 60-concurrent before/after is in the lane report.
  it('a burst that queues behind a busy worker is shed with 503 + Retry-After and the CONTENTION sentence, never row 72\'s', async (t) => {
    if (!poolUsable) { t.skip('worker pool unavailable'); return; }
    await shutdownDoctorPool();
    clearDoctorCache();
    process.env.DOCTOR_WORKER_POOL_SIZE = '1';
    process.env.DOCTOR_QUEUE_BUDGET_MS = '1';
    // Running budget at its shipped default: nothing here can be stopped for
    // occupancy, so every rejection below must be a queue one.
    delete process.env.DOCTOR_ANALYSIS_BUDGET_MS;
    try {
      const responses = await Promise.all(
        ['b1', 'b2', 'b3', 'b4', 'b5'].map(async (tag) => {
          const res = await postDoctor('/api/scriptide/doctor', { fountain: distinctScript(tag) });
          return { status: res.status, retryAfter: res.headers.get('retry-after'), body: await res.json() as Record<string, unknown> };
        }),
      );
      const shed = responses.filter((r) => r.status !== 200);
      assert.ok(shed.length >= 4, `expected the queued submissions to be shed, got ${JSON.stringify(responses.map((r) => r.status))}`);
      for (const r of shed) {
        assert.equal(r.status, 503, 'contention is a server state — a 4xx would file it as a client error');
        const retryAfter = Number(r.retryAfter);
        assert.ok(
          Number.isInteger(retryAfter) && retryAfter >= 1,
          `a 503 must carry an actionable integer Retry-After header, got ${JSON.stringify(r.retryAfter)}`,
        );
        assert.deepEqual(Object.keys(r.body), ['error'], 'same body shape as validate()\'s own 4xx');
        const message = String(r.body.error);
        assert.match(message, /^This server is busy/);
        assert.match(message, /Nothing is wrong with the draft/);
        assert.match(message, new RegExp(`try again in about ${retryAfter} seconds?\\.`), 'the header and the sentence must agree');
        // The blocker itself.
        assert.notEqual(message, SENTENCE_AT_1MS);
        assert.doesNotMatch(message, /This draft took longer to analyze/);
        assert.doesNotMatch(message, /split the draft/);
        assert.notEqual(message, 'Malformed request');
      }
    } finally {
      delete process.env.DOCTOR_WORKER_POOL_SIZE;
      delete process.env.DOCTOR_QUEUE_BUDGET_MS;
      await shutdownDoctorPool();
    }
  });

  it('the SSE route carries the same distinction — the contention sentence, not row 72\'s', async (t) => {
    if (!poolUsable) { t.skip('worker pool unavailable'); return; }
    await shutdownDoctorPool();
    clearDoctorCache();
    process.env.DOCTOR_WORKER_POOL_SIZE = '1';
    process.env.DOCTOR_QUEUE_BUDGET_MS = '1';
    delete process.env.DOCTOR_ANALYSIS_BUDGET_MS;
    try {
      const texts = await Promise.all(
        ['s1', 's2', 's3', 's4'].map(async (tag) => {
          const res = await postDoctor('/api/scriptide/doctor/stream', { fountain: distinctScript(tag) });
          return res.text();
        }),
      );
      const errorFrames = texts.flatMap((text) => text.split('\n\n').filter(Boolean).flatMap((frame) => {
        const line = frame.split('\n').find((l) => l.startsWith('data: '));
        if (!line) return [];
        const payload = JSON.parse(line.slice(6)) as Record<string, unknown>;
        return payload.type === 'doctor_error' ? [String(payload.error)] : [];
      }));
      assert.ok(errorFrames.length >= 3, `expected shed submissions to report doctor_error frames, got ${errorFrames.length}`);
      for (const message of errorFrames) {
        assert.match(message, /^This server is busy/);
        // SSE cannot send a Retry-After header once the stream has opened, so
        // the estimate has to be IN the sentence for this transport.
        assert.match(message, /try again in about \d+ seconds?\./);
        assert.doesNotMatch(message, /This draft took longer to analyze/);
        assert.notEqual(message, 'internal_error');
      }
    } finally {
      delete process.env.DOCTOR_WORKER_POOL_SIZE;
      delete process.env.DOCTOR_QUEUE_BUDGET_MS;
      await shutdownDoctorPool();
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
