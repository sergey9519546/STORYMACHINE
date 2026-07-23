// server/routes/ai-providers.ts — POST /api/ai-providers/switch mutates
// process.env.AI_PROVIDER/AI_BASE_URL/AI_API_KEY, which is PROCESS-GLOBAL
// state shared by every concurrent session on this server, not just the
// caller's own. That's the exact same class of mutation POST /api/ai-config
// (server/routes/config.ts) already gates behind checkAdminAuth (see
// tests/routes/config.test.ts's "ADMIN_TOKEN gate for AI config writes"
// describe block for that precedent) — this file proves the switch route
// shares the identical gate rather than allowing any anonymous remote caller
// to flip every session's AI provider config with no authorization at all,
// AND that it zod-validates its body before doing anything.
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startTestServer, type TestServer } from './helpers.ts';

describe('routes/ai-providers — HTTP behavior', async () => {
  let server: TestServer;
  before(async () => { server = await startTestServer(); });
  after(async () => { await server.close(); });

  it('GET /api/ai-providers stays open with no admin gate (read-only, booleans only)', async () => {
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

// ── ADMIN_TOKEN gate for AI provider switching ────────────────────────────
// Own describe block (fresh server, own env-var lifecycle) so it can't bleed
// ADMIN_TOKEN state into the tests above, which all assume it's unset —
// same isolation pattern as tests/routes/config.test.ts's own ADMIN_TOKEN
// describe block.
describe('routes/ai-providers — ADMIN_TOKEN gate for POST /api/ai-providers/switch', async () => {
  let server: TestServer;
  before(async () => { server = await startTestServer(); });
  after(async () => {
    delete process.env.ADMIN_TOKEN;
    await server.close();
  });

  it('succeeds from loopback with ADMIN_TOKEN unset (no-fire: default dev/test behavior preserved)', async () => {
    delete process.env.ADMIN_TOKEN;
    const res = await fetch(`${server.baseUrl}/api/ai-providers/switch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider: 'nonexistent-provider-xyz' }),
    });
    // Loopback is authorized with no ADMIN_TOKEN set — the request reaches
    // the route's own provider-validation logic (400 on an unknown provider
    // id), never the 401 the auth gate would otherwise produce.
    assert.notEqual(res.status, 401);
  });

  it('rejects a loopback caller with no bearer token once ADMIN_TOKEN is set (fire — this is the bug: previously ANY caller, admin or not, could flip every session\'s AI provider config)', async () => {
    process.env.ADMIN_TOKEN = 'test-admin-token-abc';
    try {
      const res = await fetch(`${server.baseUrl}/api/ai-providers/switch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: 'gemini' }),
      });
      assert.equal(res.status, 401);
      const body = await res.json();
      assert.equal(typeof body.error, 'string');
    } finally {
      delete process.env.ADMIN_TOKEN;
    }
  });

  it('rejects a wrong bearer token once ADMIN_TOKEN is set (fire)', async () => {
    process.env.ADMIN_TOKEN = 'test-admin-token-abc';
    try {
      const res = await fetch(`${server.baseUrl}/api/ai-providers/switch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer wrong-token' },
        body: JSON.stringify({ provider: 'gemini' }),
      });
      assert.equal(res.status, 401);
    } finally {
      delete process.env.ADMIN_TOKEN;
    }
  });

  it('passes the gate with the correct bearer token once ADMIN_TOKEN is set (no-fire: reaches the route\'s own provider-validation logic, never a 401)', async () => {
    process.env.ADMIN_TOKEN = 'test-admin-token-abc';
    try {
      const res = await fetch(`${server.baseUrl}/api/ai-providers/switch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer test-admin-token-abc' },
        body: JSON.stringify({ provider: 'nonexistent-provider-xyz' }),
      });
      // The correct token clears the auth gate; the route then 400s on the
      // unknown provider id — proving the request reached past checkAdminAuth
      // rather than being rejected by it.
      assert.notEqual(res.status, 401);
      assert.equal(res.status, 400);
    } finally {
      delete process.env.ADMIN_TOKEN;
    }
  });

  it('GET /api/ai-providers stays open regardless of ADMIN_TOKEN (no-fire: the read route is never gated)', async () => {
    process.env.ADMIN_TOKEN = 'test-admin-token-abc';
    try {
      const res = await fetch(`${server.baseUrl}/api/ai-providers`);
      assert.equal(res.status, 200);
    } finally {
      delete process.env.ADMIN_TOKEN;
    }
  });
});
