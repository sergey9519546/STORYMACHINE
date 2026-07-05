import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startTestServer, freshSessionId, type TestServer } from './helpers.ts';

describe('routes/game — HTTP behavior', async () => {
  let server: TestServer;
  before(async () => { server = await startTestServer(); });
  after(async () => { await server.close(); });

  it('POST /api/init accepts an empty body with 200 (nodes/agents are optional)', async () => {
    const res = await fetch(`${server.baseUrl}/api/init`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: freshSessionId() }),
    });
    assert.equal(res.status, 200);
  });

  it('POST /api/init rejects a malformed sessionId with 400 (zod validation)', async () => {
    const res = await fetch(`${server.baseUrl}/api/init`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: 'has spaces! and $ymbols' }),
    });
    assert.equal(res.status, 400);
  });

  it('POST /api/turn rejects a body without agentId with 400 (zod validation)', async () => {
    const res = await fetch(`${server.baseUrl}/api/turn`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: freshSessionId() }),
    });
    assert.equal(res.status, 400);
  });

  it('POST /api/run-room rejects a body without nodeId with 400 (zod validation)', async () => {
    const res = await fetch(`${server.baseUrl}/api/run-room`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: freshSessionId() }),
    });
    assert.equal(res.status, 400);
  });

  it('GET /api/state returns 200 for a fresh session', async () => {
    const sid = freshSessionId();
    const res = await fetch(`${server.baseUrl}/api/state?sessionId=${sid}`);
    assert.equal(res.status, 200);
  });

  it('GET /api/scenes rejects a malformed sessionId with 400', async () => {
    const res = await fetch(`${server.baseUrl}/api/scenes?sessionId=${encodeURIComponent('../../etc/passwd')}`);
    assert.equal(res.status, 400);
  });
});
