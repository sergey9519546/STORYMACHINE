import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startTestServer, freshSessionId, type TestServer } from './helpers.ts';

describe('routes/nvm — HTTP behavior', async () => {
  let server: TestServer;
  before(async () => { server = await startTestServer(); });
  after(async () => { await server.close(); });

  it('GET /api/nvm/commits returns 200 with an empty commit list for a fresh session', async () => {
    const sid = freshSessionId();
    const res = await fetch(`${server.baseUrl}/api/nvm/commits?sessionId=${sid}`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.deepEqual(body.commits, []);
  });

  it('GET /api/nvm/ghost-commits returns 200 for a fresh session', async () => {
    const sid = freshSessionId();
    const res = await fetch(`${server.baseUrl}/api/nvm/ghost-commits?sessionId=${sid}`);
    assert.equal(res.status, 200);
  });

  it('GET /api/nvm/commits/:commitId returns 404 for a nonexistent commit', async () => {
    const sid = freshSessionId();
    const res = await fetch(`${server.baseUrl}/api/nvm/commits/does-not-exist?sessionId=${sid}`);
    assert.equal(res.status, 404);
  });

  it('POST /api/nvm/converge-arc requires a non-empty scenes array — rejects with 400', async () => {
    const res = await fetch(`${server.baseUrl}/api/nvm/converge-arc`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: freshSessionId(), scenes: [] }),
    });
    assert.equal(res.status, 400);
  });

  it('POST /api/nvm/selfplay requires a non-empty scenarios array — rejects with 400', async () => {
    const res = await fetch(`${server.baseUrl}/api/nvm/selfplay`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: freshSessionId(), scenarios: [] }),
    });
    assert.equal(res.status, 400);
  });
});
