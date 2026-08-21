// S2 (RELIABILITY.md concurrency re-verification, Phase S) — the global room
// cap. reserveSimulationRooms() in server/routes/game.ts already refused a
// DUPLICATE reservation for the same session+location (409), but nothing
// bounded the process-wide TOTAL of concurrently reserved rooms across every
// session — an unbounded fan-out of /api/run-room /api/run-room-stream
// /api/run-scene requests (each up to 8 locations) could exhaust the server.
// MAX_ROOMS (server/lib/session-store.ts) closes that gap with a clear 429
// once admitting a NEW (non-duplicate) reservation would exceed the cap.
//
// This drives the boundary directly through `runningRooms` (the real
// module-singleton Set the middleware reads) rather than trying to hold
// MAX_ROOMS real simulations open concurrently — deterministic and fast,
// and exercises the exact same code path a real fan-out would hit.
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startTestServer, freshSessionId, type TestServer } from './helpers.ts';
import { runningRooms, MAX_ROOMS } from '../../server/lib/session-store.ts';

describe('POST /api/run-room — global MAX_ROOMS cap', () => {
  let server: TestServer;
  before(async () => { server = await startTestServer(); });
  after(async () => {
    await server.close();
    // Leave the shared singleton exactly as this file found it.
    for (const key of [...runningRooms]) {
      if (key.startsWith('sm-cap-seed:')) runningRooms.delete(key);
    }
  });

  it('MAX_ROOMS has a sensible, env-overridable positive default', () => {
    assert.ok(Number.isInteger(MAX_ROOMS) && MAX_ROOMS > 0, `MAX_ROOMS should be a positive integer, got ${MAX_ROOMS}`);
  });

  it('fire case: a NEW reservation is rejected with 429 once the process is already at the cap', async () => {
    // Saturate the global cap with fake, unrelated reservations — this
    // session's key is guaranteed distinct, so the earlier 409 (duplicate-key)
    // check never fires; only the capacity check can produce the rejection.
    for (let i = 0; i < MAX_ROOMS; i++) runningRooms.add(`sm-cap-seed:${i}`);
    try {
      const sid = freshSessionId();
      const res = await fetch(`${server.baseUrl}/api/run-room`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: sid, nodeId: 'nonexistent-room' }),
      });
      assert.equal(res.status, 429, 'a new reservation must be refused once the process is at MAX_ROOMS');
      const body = await res.json() as { error?: string };
      assert.match(body.error ?? '', /capacity/i, 'the 429 body should say plainly that the server is at capacity');
      assert.ok(!runningRooms.has(`${sid}:nonexistent-room`), 'a rejected reservation must not be added to the set');
    } finally {
      for (let i = 0; i < MAX_ROOMS; i++) runningRooms.delete(`sm-cap-seed:${i}`);
    }
  });

  it('no-fire case: a NEW reservation is admitted once the process is back under the cap', async () => {
    assert.equal(runningRooms.size, 0, 'previous test must have cleaned up its seeded reservations');
    const sid = freshSessionId();
    const res = await fetch(`${server.baseUrl}/api/run-room`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: sid, nodeId: 'nonexistent-room' }),
    });
    // Under the cap, the request is admitted past reserveSimulationRooms() and
    // reaches the handler's own location-existence check — 404, not 429. The
    // reservation is released again (finally-block in the route) once that
    // 404 fires, so this also proves release-on-early-exit still works.
    assert.equal(res.status, 404, 'a reservation under the cap must be admitted through to the handler');
    assert.ok(!runningRooms.has(`${sid}:nonexistent-room`), 'the reservation must be released after the request settles');
  });

  it('a request already rejected as a duplicate key never reaches the capacity check as a second failure mode', async () => {
    // Sanity check that the two guards compose correctly: pre-reserve this
    // exact key, then confirm the SAME request is refused as a 409 (duplicate)
    // even while comfortably under MAX_ROOMS — the capacity gate must not
    // mask or replace the existing duplicate-reservation protection.
    const sid = freshSessionId();
    runningRooms.add(`${sid}:dup-room`);
    try {
      const res = await fetch(`${server.baseUrl}/api/run-room`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: sid, nodeId: 'dup-room' }),
      });
      assert.equal(res.status, 409);
    } finally {
      runningRooms.delete(`${sid}:dup-room`);
    }
  });
});
