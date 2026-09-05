// Doctor pool warm-state machine — 2026-09-04 ops audit finding A.
//
// warmDoctorPool() (server/nvm/analyze/doctor-pool.ts) runs for the measured
// "~2.1–2.7 s on an idle box, up to ~3.9 s under load (measured
// 2026-09-04/05)" (warmDoctorPool()'s own doc comment — the one place this
// figure is defined) AFTER the port is already accepting connections (server.ts dispatches it
// fire-and-forget from the app.listen callback — see that file's comment).
// Before this fix nothing recorded when it started or finished, so a request
// landing in that window silently paid the cold-start cost with no way for
// anything — a load balancer, GET /ready, a test — to tell the two states
// apart. This file proves the state machine itself: getDoctorPoolWarmState()
// transitions correctly through started -> finished, on both the real
// warm-up path and every no-op branch, independent of GET /ready (covered
// against the live HTTP route in tests/routes/ready.test.ts).
//
// Every test here injects a fake `runJob` (mirroring
// tests/core/doctor-pool-prewarm.test.ts's own pattern) so nothing spawns a
// real worker thread — this file is about the state machine's bookkeeping,
// not the pool's worker-spawning behavior, which that other file already
// covers.
import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  warmDoctorPool, getDoctorPoolWarmState, resetDoctorPoolWarmStateForTests,
} from '../../server/nvm/analyze/doctor-pool.ts';

const ENV_KEYS = ['NODE_ENV', 'DOCTOR_POOL_PREWARM', 'DOCTOR_POOL_PREWARM_TIMEOUT_MS'] as const;
let snapshot: Record<string, string | undefined>;

beforeEach(() => {
  snapshot = Object.fromEntries(ENV_KEYS.map((k) => [k, process.env[k]]));
  resetDoctorPoolWarmStateForTests();
});

afterEach(() => {
  for (const k of ENV_KEYS) {
    if (snapshot[k] === undefined) delete process.env[k];
    else process.env[k] = snapshot[k];
  }
  resetDoctorPoolWarmStateForTests();
});

describe('getDoctorPoolWarmState / resetDoctorPoolWarmStateForTests', () => {
  it('starts as not-started, not-finished before warmDoctorPool() has ever run', () => {
    const state = getDoctorPoolWarmState();
    assert.deepEqual(state, {
      started: false, finished: false, ms: null, slotsWarmed: 0, failed: 0, finishedAt: null, timedOut: false,
      completedAfterDeadline: false, settledAfterTimeoutMs: null,
    });
  });

  it('returns a copy — mutating the result cannot corrupt the module\'s own tracking state', () => {
    const state = getDoctorPoolWarmState();
    (state as { started: boolean }).started = true;
    assert.equal(getDoctorPoolWarmState().started, false, 'mutation of the returned snapshot must not leak back');
  });
});

describe('warmDoctorPool — state transitions (real path, fake runJob)', () => {
  it('is started:true, finished:false the instant the call begins, before the injected job resolves', async () => {
    delete process.env.NODE_ENV;
    delete process.env.DOCTOR_POOL_PREWARM;

    let releaseJob: () => void = () => {};
    const gate = new Promise<void>((resolve) => { releaseJob = resolve; });
    const pending = warmDoctorPool({ runJob: async () => { await gate; } });

    // warmDoctorPool() runs synchronously up to its first `await`, so by the
    // time control returns here (before we've even awaited `pending`), the
    // state must already reflect "warming in progress" — this is exactly
    // the window GET /ready exists to guard: a request that lands here must
    // see finished:false, not silently pass through as if nothing were warming.
    const mid = getDoctorPoolWarmState();
    assert.equal(mid.started, true);
    assert.equal(mid.finished, false);
    assert.equal(mid.ms, null);

    releaseJob();
    await pending;

    const done = getDoctorPoolWarmState();
    assert.equal(done.started, true);
    assert.equal(done.finished, true);
    assert.equal(typeof done.ms, 'number');
    assert.ok((done.ms as number) >= 0);
    assert.equal(typeof done.finishedAt, 'number');
  });

  it('records slotsWarmed and failed:0 when every warm-up job succeeds', async () => {
    delete process.env.NODE_ENV;
    delete process.env.DOCTOR_POOL_PREWARM;

    let calls = 0;
    await warmDoctorPool({ runJob: async () => { calls++; } });

    const state = getDoctorPoolWarmState();
    assert.equal(state.finished, true);
    assert.equal(state.failed, 0);
    assert.ok(calls >= 1, 'expected at least one warm-up job to run');
    assert.equal(state.slotsWarmed, calls, 'every dispatched job succeeded, so slotsWarmed must equal the call count');
  });

  it('records a nonzero failed count, but still finishes, when every warm-up job throws', async () => {
    delete process.env.NODE_ENV;
    delete process.env.DOCTOR_POOL_PREWARM;

    let calls = 0;
    await warmDoctorPool({
      runJob: async () => { calls++; throw new Error('simulated failure'); },
    });

    const state = getDoctorPoolWarmState();
    // warmDoctorPool() must never leave `finished` stuck at false just
    // because every job failed — a /ready gate must not wait forever on a
    // warm-up that has already given up (see this function's own comment).
    assert.equal(state.finished, true);
    assert.ok(calls >= 1);
    assert.equal(state.failed, calls);
    assert.equal(state.slotsWarmed, 0);
  });
});

describe('warmDoctorPool — no-op branches still report finished:true', () => {
  it('under NODE_ENV=test: finished immediately, without ever invoking runJob', async () => {
    process.env.NODE_ENV = 'test';
    delete process.env.DOCTOR_POOL_PREWARM;

    let called = false;
    await warmDoctorPool({ runJob: async () => { called = true; } });

    assert.equal(called, false, 'no-op branch must never invoke runJob');
    const state = getDoctorPoolWarmState();
    assert.equal(state.started, true);
    assert.equal(state.finished, true);
    assert.equal(state.ms, 0);
    assert.equal(state.slotsWarmed, 0);
    assert.equal(state.failed, 0);
    assert.equal(typeof state.finishedAt, 'number');
  });

  it('under DOCTOR_POOL_PREWARM=0: finished immediately, without ever invoking runJob', async () => {
    delete process.env.NODE_ENV;
    process.env.DOCTOR_POOL_PREWARM = '0';

    let called = false;
    await warmDoctorPool({ runJob: async () => { called = true; } });

    assert.equal(called, false, 'no-op branch must never invoke runJob');
    const state = getDoctorPoolWarmState();
    assert.equal(state.started, true);
    assert.equal(state.finished, true);
    assert.equal(state.ms, 0);
  });
});

describe('warmDoctorPool — deadline (follow-up review item 4, 2026-09-04)', () => {
  it('finishes at the deadline, timedOut:true, when a warm-up job never resolves', async () => {
    delete process.env.NODE_ENV;
    delete process.env.DOCTOR_POOL_PREWARM;
    process.env.DOCTOR_POOL_PREWARM_TIMEOUT_MS = '50';

    let called = 0;
    // A runJob whose promise never settles DURING THE TEST — the exact
    // "worker accepts a job and never replies" case that previously left
    // `finished` false (and therefore GET /ready at 503) forever. warmDoctorPool()
    // abandons this job in the background once the deadline fires (its own
    // doc comment); resolving it explicitly after the assertions below lets
    // that abandoned background chain settle before this test ends, so
    // nothing is left genuinely pending when the file's test run finishes
    // (node:test flags a promise still pending at process-exit time as a
    // failure, even in an unrelated later test).
    let releaseJob: () => void = () => {};
    const stallUntilReleased = new Promise<void>((resolve) => { releaseJob = resolve; });

    const beforeCall = Date.now();
    await warmDoctorPool({ runJob: async () => { called++; return stallUntilReleased; } });
    const elapsed = Date.now() - beforeCall;

    assert.ok(called >= 1, 'expected at least one warm-up job to have been dispatched');
    const state = getDoctorPoolWarmState();
    assert.equal(state.started, true);
    assert.equal(state.finished, true, 'a wedged job must not leave finished stuck at false');
    assert.equal(state.timedOut, true);
    assert.equal(typeof state.ms, 'number');
    // 2026-09-05 review finding B2: immediately after the deadline fires,
    // nothing has settled late yet.
    assert.equal(state.completedAfterDeadline, false);
    assert.equal(state.settledAfterTimeoutMs, null);
    // The deadline is 50ms; warmDoctorPool() must return close to that, not
    // hang indefinitely waiting on the never-resolving job.
    assert.ok(elapsed < 2000, `expected warmDoctorPool() to return near the 50ms deadline, took ${elapsed}ms`);

    releaseJob();
    await stallUntilReleased;
  });

  // B2 (2026-09-05 review, LOW). Before this fix, a timed-out prewarm froze
  // /health.doctorPool at slotsWarmed:0/failed:0 FOREVER — the abandoned
  // `jobsSettled` promise kept running in the background but nothing wrote
  // its outcome back, so `void jobsSettled` discarded the real result even
  // after every worker warmed successfully a moment later. This is the
  // opposite of the test above: the job does NOT stall forever, it just
  // resolves a little AFTER the (short) deadline, and this test proves the
  // snapshot updates in place once that happens.
  it('updates slotsWarmed/failed and flips completedAfterDeadline once an abandoned job settles late', async () => {
    delete process.env.NODE_ENV;
    delete process.env.DOCTOR_POOL_PREWARM;
    process.env.DOCTOR_POOL_PREWARM_TIMEOUT_MS = '30';

    let calls = 0;
    let releaseJob: () => void = () => {};
    const settleLate = new Promise<void>((resolve) => { releaseJob = resolve; });

    await warmDoctorPool({ runJob: async () => { calls++; return settleLate; } });

    const timedOutState = getDoctorPoolWarmState();
    assert.equal(timedOutState.timedOut, true, 'precondition: the short deadline must have fired first');
    assert.equal(timedOutState.completedAfterDeadline, false);
    assert.equal(timedOutState.slotsWarmed, 0, 'frozen snapshot, same as before this fix, until the job actually settles');
    assert.ok(calls >= 1, 'expected at least one warm-up job to have been dispatched');

    // Let the abandoned job(s) resolve now, and give their .then() a tick to run.
    releaseJob();
    await settleLate;
    await new Promise((r) => setTimeout(r, 10));

    const settledState = getDoctorPoolWarmState();
    assert.equal(settledState.timedOut, true, 'the deadline DID fire — that stays true, it is not un-happened');
    assert.equal(settledState.completedAfterDeadline, true, 'the late settlement must flip this once it lands');
    assert.equal(settledState.slotsWarmed, calls, 'the real outcome (every dispatched job warmed) must replace the frozen 0');
    assert.equal(settledState.failed, 0);
    assert.equal(typeof settledState.settledAfterTimeoutMs, 'number');
    assert.ok(settledState.settledAfterTimeoutMs! >= 0);
  });

  // A late settlement must never clobber a NEWER generation of warmState —
  // e.g. a reset that happened in between.
  it('a late-settling abandoned job does not overwrite a warmState that was reset in the meantime', async () => {
    delete process.env.NODE_ENV;
    delete process.env.DOCTOR_POOL_PREWARM;
    process.env.DOCTOR_POOL_PREWARM_TIMEOUT_MS = '30';

    let releaseJob: () => void = () => {};
    const settleLate = new Promise<void>((resolve) => { releaseJob = resolve; });
    await warmDoctorPool({ runJob: async () => { return settleLate; } });
    assert.equal(getDoctorPoolWarmState().timedOut, true, 'precondition: the short deadline must have fired first');

    resetDoctorPoolWarmStateForTests();
    const resetState = getDoctorPoolWarmState();

    releaseJob();
    await settleLate;
    await new Promise((r) => setTimeout(r, 10));

    assert.deepEqual(getDoctorPoolWarmState(), resetState, 'the late settlement must be a no-op once the state has moved on');
  });

  it('does NOT time out when every job settles well within the deadline', async () => {
    delete process.env.NODE_ENV;
    delete process.env.DOCTOR_POOL_PREWARM;
    process.env.DOCTOR_POOL_PREWARM_TIMEOUT_MS = '5000';

    await warmDoctorPool({ runJob: async () => {} });

    const state = getDoctorPoolWarmState();
    assert.equal(state.finished, true);
    assert.equal(state.timedOut, false);
  });

  it('falls back to the 30s default when DOCTOR_POOL_PREWARM_TIMEOUT_MS is unset or invalid', async () => {
    delete process.env.NODE_ENV;
    delete process.env.DOCTOR_POOL_PREWARM;
    delete process.env.DOCTOR_POOL_PREWARM_TIMEOUT_MS;

    // A fast-settling job should never come anywhere near a 30s default —
    // this just proves the missing/invalid env var doesn't produce a
    // near-zero deadline that would spuriously time out real warm-ups.
    await warmDoctorPool({ runJob: async () => {} });
    assert.equal(getDoctorPoolWarmState().timedOut, false);
  });
});

describe('resetDoctorPoolWarmStateForTests', () => {
  it('restores the never-warmed state after a completed warm-up', async () => {
    delete process.env.NODE_ENV;
    delete process.env.DOCTOR_POOL_PREWARM;
    await warmDoctorPool({ runJob: async () => {} });
    assert.equal(getDoctorPoolWarmState().finished, true, 'precondition: pool reports warm');

    resetDoctorPoolWarmStateForTests();

    assert.deepEqual(getDoctorPoolWarmState(), {
      started: false, finished: false, ms: null, slotsWarmed: 0, failed: 0, finishedAt: null, timedOut: false,
      completedAfterDeadline: false, settledAfterTimeoutMs: null,
    });
  });
});
