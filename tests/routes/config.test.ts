import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startTestServer, freshSessionId, type TestServer } from './helpers.ts';

describe('routes/config — HTTP behavior', async () => {
  let server: TestServer;
  before(async () => { server = await startTestServer(); });
  after(async () => { await server.close(); });

  it('GET /health returns 200 with status ok', async () => {
    const res = await fetch(`${server.baseUrl}/health`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.status, 'ok');
    assert.equal(typeof body.sessions, 'number');
  });

  it('GET /api/ai-config returns 200 and never leaks a key value, only boolean flags', async () => {
    const res = await fetch(`${server.baseUrl}/api/ai-config`);
    assert.equal(res.status, 200);
    const body = await res.json();
    for (const forbiddenKey of ['apiKey', 'imgApiKey', 'ttsApiKey', 'embApiKey']) {
      assert.equal(body[forbiddenKey], undefined, `response must not include ${forbiddenKey}`);
    }
    for (const flag of ['keySet', 'imgKeySet', 'ttsKeySet', 'embKeySet']) {
      assert.equal(typeof body[flag], 'boolean', `${flag} must be a boolean flag`);
    }
  });

  it('POST /api/ai-config rejects an invalid body with 400 (zod validation)', async () => {
    const res = await fetch(`${server.baseUrl}/api/ai-config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider: 'not-a-real-provider' }),
    });
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(typeof body.error, 'string');
  });

  it('POST /api/outline rejects a body without a beats array with 400 (zod validation)', async () => {
    const res = await fetch(`${server.baseUrl}/api/outline`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: freshSessionId(), notBeats: true }),
    });
    assert.equal(res.status, 400);
  });

  it('POST /api/outline accepts a well-formed beats array with 200', async () => {
    const res = await fetch(`${server.baseUrl}/api/outline`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: freshSessionId(),
        beats: [{ phase: 'Setup', turn_start: 0, turn_end: 3, goal: 'Introduce the world' }],
      }),
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.beatCount, 1);
  });

  it('POST /api/session/import rejects a snapshot missing required arrays with 400', async () => {
    const res = await fetch(`${server.baseUrl}/api/session/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: freshSessionId(), notAgents: [] }),
    });
    assert.equal(res.status, 400);
  });

  it('GET /api/pacing-target rejects a malformed sessionId with 400', async () => {
    const res = await fetch(`${server.baseUrl}/api/pacing-target?sessionId=${encodeURIComponent('has spaces!')}`);
    assert.equal(res.status, 400);
  });
});
