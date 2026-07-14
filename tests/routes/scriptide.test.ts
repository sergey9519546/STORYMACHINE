import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startTestServer, freshSessionId, type TestServer } from './helpers.ts';

describe('routes/scriptide — HTTP behavior', async () => {
  let server: TestServer;
  before(async () => { server = await startTestServer(); });
  after(async () => { await server.close(); });

  it('GET /api/scriptide/personas returns 200 with a personas array', async () => {
    const res = await fetch(`${server.baseUrl}/api/scriptide/personas`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(Array.isArray(body.personas));
  });

  it('GET /api/scriptide/load returns 200 "empty" status for a fresh session', async () => {
    const sid = freshSessionId();
    const res = await fetch(`${server.baseUrl}/api/scriptide/load?sessionId=${sid}`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.status, 'empty');
  });

  it('POST /api/scriptide/save then GET /api/scriptide/load roundtrips text + updatedAt', async () => {
    const sid = freshSessionId();
    // POST reads sessionId from body (not query) — see session-store.sessionId().
    const saveRes = await fetch(`${server.baseUrl}/api/scriptide/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: sid,
        scriptText: 'INT. TEST ROOM - DAY\n\nA draft for persistence.\n',
        snapshots: [],
        characters: [],
        researchNotes: [],
        isDarkMode: true,
      }),
    });
    assert.equal(saveRes.status, 200);
    const saveBody = await saveRes.json();
    assert.equal(saveBody.status, 'saved');
    assert.equal(typeof saveBody.updatedAt, 'number');

    const loadRes = await fetch(`${server.baseUrl}/api/scriptide/load?sessionId=${sid}`);
    assert.equal(loadRes.status, 200);
    const loadBody = await loadRes.json();
    assert.equal(loadBody.status, 'ok');
    assert.match(loadBody.scriptText, /TEST ROOM/);
    assert.equal(typeof loadBody.updatedAt, 'number');
    assert.ok(loadBody.updatedAt >= saveBody.updatedAt - 5_000);
    assert.equal(loadBody.isDarkMode, true);
  });

  it('POST /api/scriptide/personas rejects an invalid persona with 400', async () => {
    const res = await fetch(`${server.baseUrl}/api/scriptide/personas`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notAValidPersona: true }),
    });
    assert.equal(res.status, 400);
  });

  // /api/scriptide/clean-action is aiLimiter-protected but this asserts only the
  // input-guard path (missing 'text'), which runs before any AI call — it does
  // not require a live Gemini key. See tests/routes/limiters.test.ts for the
  // rate-limiter behavior on this same route.
  it('POST /api/scriptide/clean-action without text does not return 2xx', async () => {
    const res = await fetch(`${server.baseUrl}/api/scriptide/clean-action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    assert.ok(res.status >= 400, `expected an error status, got ${res.status}`);
  });
});
