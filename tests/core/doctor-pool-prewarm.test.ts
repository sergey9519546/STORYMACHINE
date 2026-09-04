// Script Doctor worker-pool boot-time pre-warm (2026-09-04) — warmDoctorPool().
//
// The 2026-09-04 re-verification (docs/audits/2026-09-04-reverification/
// REVERIFICATION.md) measured ~460-540ms of worker-pool cold start on the
// first POST /api/scriptide/doctor after a fresh boot, dropping to 6-26ms
// once a worker is warm. warmDoctorPool() (server/nvm/analyze/doctor-pool.ts)
// pays that cost once at boot, fire-and-forget from server.ts, instead of on
// the first real user's request.
//
// Four properties this file proves:
//   1. It actually spawns workers and resolves (production path, real pool).
//   2. It is a no-op under NODE_ENV=test — a test run should never spend
//      wall-clock time or spawn threads warming a pool nobody is measuring.
//   3. It is a no-op under DOCTOR_POOL_PREWARM=0 — the explicit opt-out.
//   4. It tolerates a failing worker/job — never rejects, never throws, even
//      when every dispatched job fails.

import { describe, it, after, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  warmDoctorPool, shutdownDoctorPool, doctorPoolStatus,
} from '../../server/nvm/analyze/doctor-pool.ts';

after(async () => { await shutdownDoctorPool(); });

// warmDoctorPool() reads these two env vars fresh on every call; snapshot and
// restore around each test so one test's env tweak can't leak into the next.
const ENV_KEYS = ['NODE_ENV', 'DOCTOR_POOL_PREWARM'] as const;
let snapshot: Record<string, string | undefined>;

beforeEach(() => {
  snapshot = Object.fromEntries(ENV_KEYS.map((k) => [k, process.env[k]]));
});

afterEach(async () => {
  for (const k of ENV_KEYS) {
    if (snapshot[k] === undefined) delete process.env[k];
    else process.env[k] = snapshot[k];
  }
  await shutdownDoctorPool();
});

describe('warmDoctorPool', () => {
  it('spawns the pool and resolves once every warm-up job settles', async () => {
    delete process.env.NODE_ENV;
    delete process.env.DOCTOR_POOL_PREWARM;
    await shutdownDoctorPool();
    assert.equal(doctorPoolStatus().workers, 0, 'precondition: no pool workers before the call');

    await warmDoctorPool();

    const status = doctorPoolStatus();
    if (status.disabled) return; // environment can't host workers at all — fell back in-process, nothing new to prove
    assert.ok(status.workers >= 1, 'expected at least one worker spawned by the pre-warm');
    assert.equal(status.queued, 0, 'no job should be left queued once warmDoctorPool has resolved');
  });

  it('is a no-op under NODE_ENV=test', async () => {
    process.env.NODE_ENV = 'test';
    delete process.env.DOCTOR_POOL_PREWARM;
    await shutdownDoctorPool();

    let called = false;
    await warmDoctorPool({ runJob: async () => { called = true; } });

    assert.equal(called, false, 'no warm-up job should run under NODE_ENV=test');
    assert.equal(doctorPoolStatus().workers, 0, 'no worker should be spawned under NODE_ENV=test');
  });

  it('is a no-op when DOCTOR_POOL_PREWARM=0', async () => {
    delete process.env.NODE_ENV;
    process.env.DOCTOR_POOL_PREWARM = '0';
    await shutdownDoctorPool();

    let called = false;
    await warmDoctorPool({ runJob: async () => { called = true; } });

    assert.equal(called, false, 'no warm-up job should run when DOCTOR_POOL_PREWARM=0');
    assert.equal(doctorPoolStatus().workers, 0, 'no worker should be spawned when DOCTOR_POOL_PREWARM=0');
  });

  it('tolerates every warm-up job failing without throwing or rejecting', async () => {
    delete process.env.NODE_ENV;
    delete process.env.DOCTOR_POOL_PREWARM;

    let calls = 0;
    await assert.doesNotReject(
      warmDoctorPool({
        runJob: async () => {
          calls++;
          throw new Error('simulated worker failure');
        },
      }),
    );
    assert.ok(calls >= 1, 'expected at least one warm-up job to have been attempted');
  });

  it('runs one distinct warm-up job per configured pool slot (not collapsed by the report cache)', async () => {
    delete process.env.NODE_ENV;
    delete process.env.DOCTOR_POOL_PREWARM;
    process.env.DOCTOR_WORKER_POOL_SIZE = '3';

    const seen: string[] = [];
    try {
      await warmDoctorPool({ runJob: async (fountain: string) => { seen.push(fountain); } });
    } finally {
      delete process.env.DOCTOR_WORKER_POOL_SIZE;
    }

    assert.equal(seen.length, 3, 'expected one warm-up job per configured pool slot');
    assert.equal(new Set(seen).size, 3, 'expected each warm-up job to use distinct content');
  });
});
