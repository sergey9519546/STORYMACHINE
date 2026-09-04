// GET /ready and GET /health's doctorPool field — 2026-09-04 ops audit
// finding A: the Script Doctor worker pool's boot-time pre-warm
// (warmDoctorPool(), server/nvm/analyze/doctor-pool.ts) runs for ~2.1-3.9s
// AFTER the port is already accepting connections (server.ts fires it from
// the app.listen callback, fire-and-forget), so a request landing in that
// window silently pays the full cold-start cost with nothing telling an
// orchestrator when warm-up is done. GET /ready is the fix: 503 before the
// pool has settled, 200 once it has, so a load balancer's readiness probe
// can hold traffic back for exactly that window (see the Dockerfile
// HEALTHCHECK and docker-compose.yml healthcheck, both pointed here).
//
// REVISED same day by the follow-up review, which reproduced /ready sharing
// gameLimiter's per-IP bucket with the whole /api surface — 130 ordinary
// /api requests from one IP made a WARM, healthy server's /ready answer 429,
// which reads as unhealthy to any orchestrator probe. /ready now carries no
// rate limiter at all (tests/routes/route-capabilities.test.ts's
// exemptRoutes, same precedent as /health), and this file's "no rate-limit
// headers" and "still 200 after the gameLimiter bucket is exhausted" tests
// below guard that directly. The same follow-up added a DRAINING signal
// (server/lib/readiness.ts, set by server.ts's createShutdownHandler): once
// a graceful shutdown begins, /ready must answer 503 even on a warm pool —
// covered below too.
//
// Route tests boot the app via createApp() directly (tests/routes/helpers.ts)
// and never call server.ts's own `void warmDoctorPool()` — so every test
// below drives the SAME warmDoctorPool() a real boot would, with an injected
// `runJob` (mirroring tests/core/doctor-pool-prewarm.test.ts's own pattern)
// so nothing here spawns a real worker thread or sleeps on one. The state
// machine itself (started/finished/ms/slotsWarmed/failed/finishedAt/timedOut)
// has its own dedicated coverage in tests/core/doctor-pool-warm-state.test.ts;
// this file only proves the live HTTP surfaces read that state correctly.
import { describe, it, before, after, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { startTestServer, type TestServer } from './helpers.ts';
import { warmDoctorPool, resetDoctorPoolWarmStateForTests } from '../../server/nvm/analyze/doctor-pool.ts';
import { setDraining, resetDrainingForTests } from '../../server/lib/readiness.ts';

const ENV_KEYS = ['NODE_ENV', 'DOCTOR_POOL_PREWARM'] as const;
let snapshot: Record<string, string | undefined>;

describe('routes/config — GET /ready and /health.doctorPool', () => {
  let server: TestServer;

  before(async () => { server = await startTestServer(); });
  after(async () => { await server.close(); });

  beforeEach(() => {
    snapshot = Object.fromEntries(ENV_KEYS.map((k) => [k, process.env[k]]));
    resetDoctorPoolWarmStateForTests();
    resetDrainingForTests();
  });

  afterEach(() => {
    for (const k of ENV_KEYS) {
      if (snapshot[k] === undefined) delete process.env[k];
      else process.env[k] = snapshot[k];
    }
    resetDoctorPoolWarmStateForTests();
    resetDrainingForTests();
  });

  it('GET /ready returns 503 {ready:false, reason} before the pool has warmed', async () => {
    const res = await fetch(`${server.baseUrl}/ready`);
    assert.equal(res.status, 503);
    assert.match(res.headers.get('content-type') ?? '', /application\/json/);
    const body = await res.json();
    assert.equal(body.ready, false);
    assert.equal(typeof body.reason, 'string');
    assert.ok(body.reason.length > 0);
  });

  it('GET /health.doctorPool reports warm:false, warmedAt:null, ms:null before warm-up', async () => {
    const res = await fetch(`${server.baseUrl}/health`);
    assert.equal(res.status, 200);
    const body = await res.json();
    // Every prior /health field stays intact (additive change).
    assert.equal(body.status, 'ok');
    assert.equal(typeof body.uptime, 'number');
    assert.equal(typeof body.sessions, 'number');
    assert.equal(typeof body.version, 'string');
    assert.deepEqual(body.doctorPool, { warm: false, warmedAt: null, ms: null, timedOut: false });
  });

  it('GET /ready flips 503 -> 200 once warmDoctorPool() settles (fake pool warm function, no real workers)', async () => {
    delete process.env.NODE_ENV;
    delete process.env.DOCTOR_POOL_PREWARM;

    const before1 = await fetch(`${server.baseUrl}/ready`);
    assert.equal(before1.status, 503, 'precondition: not warm yet');

    await warmDoctorPool({ runJob: async () => {} });

    const after1 = await fetch(`${server.baseUrl}/ready`);
    assert.equal(after1.status, 200);
    const body = await after1.json();
    assert.deepEqual(body, { ready: true });
  });

  it('GET /health.doctorPool reports warm:true with a numeric ms and an ISO warmedAt after warm-up', async () => {
    delete process.env.NODE_ENV;
    delete process.env.DOCTOR_POOL_PREWARM;

    await warmDoctorPool({ runJob: async () => {} });

    const res = await fetch(`${server.baseUrl}/health`);
    const body = await res.json();
    assert.equal(body.doctorPool.warm, true);
    assert.equal(typeof body.doctorPool.ms, 'number');
    assert.ok(body.doctorPool.ms >= 0);
    assert.equal(typeof body.doctorPool.warmedAt, 'string');
    assert.ok(!Number.isNaN(Date.parse(body.doctorPool.warmedAt)), 'warmedAt must be a parseable ISO timestamp');
  });

  it('GET /ready is immediately 200 when pre-warm is a no-op under NODE_ENV=test — never blocks on a warm-up that will never run', async () => {
    process.env.NODE_ENV = 'test';
    delete process.env.DOCTOR_POOL_PREWARM;
    await warmDoctorPool();

    const res = await fetch(`${server.baseUrl}/ready`);
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { ready: true });
  });

  it('GET /ready is immediately 200 when pre-warm is disabled via DOCTOR_POOL_PREWARM=0', async () => {
    delete process.env.NODE_ENV;
    process.env.DOCTOR_POOL_PREWARM = '0';
    await warmDoctorPool();

    const res = await fetch(`${server.baseUrl}/ready`);
    assert.equal(res.status, 200);
  });

  it('GET /ready carries NO rate-limit headers — exempt, same as GET /health (follow-up review item 1)', async () => {
    delete process.env.NODE_ENV;
    delete process.env.DOCTOR_POOL_PREWARM;
    await warmDoctorPool({ runJob: async () => {} });

    const res = await fetch(`${server.baseUrl}/ready`);
    assert.equal(res.status, 200);
    // Neither express-rate-limit header family should be present: /ready
    // must never be able to fail for rate-limit reasons, since that is
    // exactly the failure a readiness endpoint under load cannot afford —
    // see this file's header comment and route-capabilities.test.ts's
    // exemptRoutes entry for /ready.
    assert.equal(res.headers.has('ratelimit-limit'), false, 'GET /ready must carry no RateLimit-* header');
    assert.equal(res.headers.has('x-ratelimit-limit'), false, 'GET /ready must carry no X-RateLimit-* header');
  });

  it('GET /ready still answers 200 on a warm pool after gameLimiter\'s shared bucket is exhausted by ordinary /api traffic', async () => {
    delete process.env.NODE_ENV;
    delete process.env.DOCTOR_POOL_PREWARM;
    await warmDoctorPool({ runJob: async () => {} });

    // gameLimiter (server/lib/session-store.ts) is max 120 requests/60s,
    // keyed by IP, and shared by every gameLimiter-gated route including the
    // /api 404 guard (server/app.ts) that GET /api/nope-<n> below hits.
    // Node's test runner isolates each CLI-given test FILE into its own
    // process, so gameLimiter's in-memory store starts fresh for this file —
    // safe to exhaust it here without affecting any other test file's
    // budget. 130 requests reliably exceeds the 120/60s ceiling.
    const statuses: Record<number, number> = {};
    for (let i = 0; i < 130; i++) {
      // eslint-disable-next-line no-await-in-loop
      const res = await fetch(`${server.baseUrl}/api/nope-${i}`);
      statuses[res.status] = (statuses[res.status] ?? 0) + 1;
    }
    assert.ok((statuses[429] ?? 0) > 0, `expected the gameLimiter bucket to actually trip 429s; got ${JSON.stringify(statuses)}`);

    const res = await fetch(`${server.baseUrl}/ready`);
    assert.equal(res.status, 200, '/ready must not be rate-limited by ordinary /api traffic, even after that traffic tripped 429s elsewhere');
    assert.deepEqual(await res.json(), { ready: true });
  });

  it('GET /ready answers 503 {ready:false, reason:"draining"} once shutdown has begun, even on a warm pool', async () => {
    delete process.env.NODE_ENV;
    delete process.env.DOCTOR_POOL_PREWARM;
    await warmDoctorPool({ runJob: async () => {} });

    const beforeDraining = await fetch(`${server.baseUrl}/ready`);
    assert.equal(beforeDraining.status, 200, 'precondition: warm and not draining');

    setDraining();

    const res = await fetch(`${server.baseUrl}/ready`);
    assert.equal(res.status, 503);
    assert.deepEqual(await res.json(), { ready: false, reason: 'draining' });
  });

  it('GET /health stays 200 even while draining — liveness is unconditional', async () => {
    setDraining();
    const res = await fetch(`${server.baseUrl}/health`);
    assert.equal(res.status, 200);
    assert.equal((await res.json()).status, 'ok');
  });
});
