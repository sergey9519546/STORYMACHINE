import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startTestServer, type TestServer } from './helpers.ts';

describe('routes/ai-providers — HTTP behavior', async () => {
  let server: TestServer;
  before(async () => { server = await startTestServer(); });
  after(async () => { await server.close(); });

  it('GET /api/ai-providers returns 200 with a providers list and a current provider', async () => {
    const res = await fetch(`${server.baseUrl}/api/ai-providers`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(Array.isArray(body.providers));
    assert.equal(typeof body.current, 'string');
  });

  it('POST /api/ai-providers/switch rejects a body missing provider with 400 (zod validation)', async () => {
    const res = await fetch(`${server.baseUrl}/api/ai-providers/switch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(typeof body.error, 'string');
  });

  it('POST /api/ai-providers/switch rejects a non-string provider with 400 (zod validation)', async () => {
    const res = await fetch(`${server.baseUrl}/api/ai-providers/switch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider: 123 }),
    });
    assert.equal(res.status, 400);
  });

  it('POST /api/ai-providers/switch rejects an empty-string provider with 400 (zod validation)', async () => {
    const res = await fetch(`${server.baseUrl}/api/ai-providers/switch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider: '' }),
    });
    assert.equal(res.status, 400);
  });

  it('POST /api/ai-providers/switch still 400s an unknown-but-well-formed provider (route-level check, not zod)', async () => {
    const res = await fetch(`${server.baseUrl}/api/ai-providers/switch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider: 'not-a-real-provider' }),
    });
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.match(body.error, /Unknown provider/);
  });
});
