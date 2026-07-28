// Pagination limit/offset clamping on read endpoints (data-integrity).
//
// server/routes/game.ts repeats the same clamp block across several list
// endpoints:
//   const limit  = isNaN(rawLimit)  || rawLimit  < 1 ? 50  : Math.min(rawLimit,  500);
//   const offset = isNaN(rawOffset) || rawOffset < 0 ? 0   : rawOffset;
// and, when either param is present, returns { data, total, limit, offset }
// (otherwise a bare array). None of these handlers had route-level coverage,
// so a silent regression in the clamp (e.g. dropping the Math.min cap, or
// treating NaN as 0) could let a caller request unbounded pages or crash on
// bad input. This file locks in the existing clamp behavior — it changes no
// engine code, only asserts what the routes already do.
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startTestServer, freshSessionId, type TestServer } from './helpers.ts';

type Page = { data: unknown[]; total: number; limit: number; offset: number };

async function getJson(url: string, session: string): Promise<{ status: number; body: unknown }> {
  const res = await fetch(url, { headers: { 'X-Session-Id': session } });
  return { status: res.status, body: await res.json() };
}

describe('routes — pagination limit/offset clamping', () => {
  let server: TestServer;
  before(async () => { server = await startTestServer(); });
  after(async () => { await server.close(); });

  // The four endpoints that share the clamp + { data, total, limit, offset }
  // paginated shape. (Sibling endpoints /api/ledger/fountain and
  // /api/dramatic-pressure-all look similar but do NOT paginate — the former
  // returns { fountain, characters, turnCount, ... }, the latter returns
  // getAllActivePressures() directly — so neither is in this list.)
  const endpoints = [
    '/api/ledger',
    '/api/beat-traces',
    '/api/belief-edges',
    '/api/goal-mutations',
  ];

  for (const ep of endpoints) {
    describe(`${ep}`, () => {
      it('clamps limit=99999 down to 500', async () => {
        const session = freshSessionId();
        const { status, body } = await getJson(`${server.baseUrl}${ep}?limit=99999`, session);
        assert.equal(status, 200);
        assert.equal((body as Page).limit, 500, 'limit must be clamped to the 500 ceiling');
      });

      it('defaults limit to 50 on NaN (?limit=abc)', async () => {
        const session = freshSessionId();
        const { status, body } = await getJson(`${server.baseUrl}${ep}?limit=abc`, session);
        assert.equal(status, 200);
        assert.equal((body as Page).limit, 50, 'non-numeric limit falls back to the 50 default');
      });

      it('defaults limit to 50 on negative (?limit=-1)', async () => {
        const session = freshSessionId();
        const { status, body } = await getJson(`${server.baseUrl}${ep}?limit=-1`, session);
        assert.equal(status, 200);
        assert.equal((body as Page).limit, 50, 'limit < 1 falls back to the 50 default');
      });

      it('defaults limit to 50 on empty (?limit=)', async () => {
        const session = freshSessionId();
        const { status, body } = await getJson(`${server.baseUrl}${ep}?limit=`, session);
        assert.equal(status, 200);
        assert.equal((body as Page).limit, 50, 'empty limit falls back to the 50 default');
      });

      it('defaults offset to 0 on negative (?offset=-5)', async () => {
        const session = freshSessionId();
        const { status, body } = await getJson(`${server.baseUrl}${ep}?offset=-5`, session);
        assert.equal(status, 200);
        assert.equal((body as Page).offset, 0, 'offset < 0 falls back to 0');
      });

      it('echoes a valid limit/offset unchanged', async () => {
        const session = freshSessionId();
        const { status, body } = await getJson(`${server.baseUrl}${ep}?limit=10&offset=5`, session);
        assert.equal(status, 200);
        assert.equal((body as Page).limit, 10);
        assert.equal((body as Page).offset, 5);
        // total is always present on the paginated shape, even on an empty session.
        assert.equal(typeof (body as Page).total, 'number');
        assert.ok(Array.isArray((body as Page).data));
      });
    });
  }
});
