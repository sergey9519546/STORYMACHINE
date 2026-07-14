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
    assert.equal(loadBody.updatedAt, saveBody.updatedAt);
    assert.deepEqual(loadBody.snapshots, []);
    assert.deepEqual(loadBody.characters, []);
    assert.deepEqual(loadBody.researchNotes, []);
    assert.equal(loadBody.isDarkMode, true);
  });

  it('persists an intentionally blank draft and metadata-only state', async () => {
    const sid = freshSessionId();
    const saveRes = await fetch(`${server.baseUrl}/api/scriptide/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: sid,
        scriptText: '',
        snapshots: [],
        characters: [{ id: 'c1', name: 'ONLY METADATA' }],
        researchNotes: [{ id: 'r1', title: 'Note', content: 'Research' }],
        isDarkMode: false,
      }),
    });
    assert.equal(saveRes.status, 200);
    const saveBody = await saveRes.json();

    const loadRes = await fetch(`${server.baseUrl}/api/scriptide/load?sessionId=${sid}`);
    const loadBody = await loadRes.json();
    assert.equal(loadBody.status, 'ok');
    assert.equal(loadBody.scriptText, '');
    assert.deepEqual(loadBody.snapshots, []);
    assert.equal(loadBody.characters[0].name, 'ONLY METADATA');
    assert.equal(loadBody.researchNotes[0].title, 'Note');
    assert.equal(loadBody.updatedAt, saveBody.updatedAt);
  });

  it('rejects a stale conditional save without changing server state', async () => {
    const sid = freshSessionId();
    const createRes = await fetch(`${server.baseUrl}/api/scriptide/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: sid,
        scriptText: 'REVISION ONE',
        expectedUpdatedAt: null,
      }),
    });
    assert.equal(createRes.status, 200);
    const created = await createRes.json();

    const updateRes = await fetch(`${server.baseUrl}/api/scriptide/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: sid,
        scriptText: 'REVISION TWO',
        expectedUpdatedAt: created.updatedAt,
      }),
    });
    assert.equal(updateRes.status, 200);
    const updated = await updateRes.json();
    assert.ok(updated.updatedAt > created.updatedAt);

    const staleRes = await fetch(`${server.baseUrl}/api/scriptide/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: sid,
        scriptText: 'STALE OVERWRITE',
        expectedUpdatedAt: created.updatedAt,
      }),
    });
    assert.equal(staleRes.status, 409);
    const conflict = await staleRes.json();
    assert.equal(conflict.status, 'conflict');
    assert.equal(conflict.server.scriptText, 'REVISION TWO');
    assert.equal(conflict.server.updatedAt, updated.updatedAt);
    assert.deepEqual(conflict.server.snapshots, []);
    assert.deepEqual(conflict.server.characters, []);
    assert.deepEqual(conflict.server.researchNotes, []);

    const loadRes = await fetch(`${server.baseUrl}/api/scriptide/load?sessionId=${sid}`);
    const loaded = await loadRes.json();
    assert.equal(loaded.scriptText, 'REVISION TWO');
    assert.equal(loaded.updatedAt, updated.updatedAt);
  });

  it('rejects conditional creation when a row already exists', async () => {
    const sid = freshSessionId();
    await fetch(`${server.baseUrl}/api/scriptide/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: sid, scriptText: 'EXISTING' }),
    });
    const res = await fetch(`${server.baseUrl}/api/scriptide/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: sid,
        scriptText: 'SECOND CREATOR',
        expectedUpdatedAt: null,
      }),
    });
    assert.equal(res.status, 409);
    const body = await res.json();
    assert.equal(body.server.scriptText, 'EXISTING');
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
