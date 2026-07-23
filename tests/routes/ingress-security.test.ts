// Ingress security hardening (S1-a): closes 3 pre-deployment audit findings.
//   1. SSRF via POST /api/ai-config — baseUrl/imgBaseUrl/ttsBaseUrl/embBaseUrl
//      must reject non-http(s) schemes, userinfo, and private/loopback/
//      link-local/metadata-IP hosts, while still accepting normal public
//      https provider URLs. See ssrfUnsafeUrlReason() in server/lib/validation.ts.
//   2. Unauthenticated GET /metrics — loopback-only by default, bearer-token
//      gated (404 on miss, not 401) once METRICS_TOKEN is set.
//   3. Collab token minting's COLLAB_SECRET production gate.
// Rate-limiter tier assertions for /api/run-room live in limiters.test.ts's
// pattern (dedicated file to avoid cross-test budget interference) — this
// file only asserts the two routes are wired to aiLimiter's lower ceiling.
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startTestServer, freshSessionId, type TestServer } from './helpers.ts';
import { ssrfUnsafeUrlReason } from '../../server/lib/validation.ts';

describe('ingress-security — SSRF guard unit coverage (ssrfUnsafeUrlReason)', () => {
  it('rejects cloud metadata IP literals (AWS/GCP/Azure all use 169.254.169.254)', () => {
    assert.notEqual(ssrfUnsafeUrlReason('http://169.254.169.254/latest/meta-data/'), null);
  });

  it('rejects loopback literals', () => {
    assert.notEqual(ssrfUnsafeUrlReason('http://127.0.0.1:11434/v1'), null);
    assert.notEqual(ssrfUnsafeUrlReason('http://[::1]:8080/v1'), null);
  });

  it('rejects RFC1918 private ranges', () => {
    assert.notEqual(ssrfUnsafeUrlReason('http://10.0.0.5/v1'), null);
    assert.notEqual(ssrfUnsafeUrlReason('http://172.16.0.5/v1'), null);
    assert.notEqual(ssrfUnsafeUrlReason('http://192.168.1.5/v1'), null);
  });

  it('rejects unique-local and IPv4-mapped private IPv6 literals', () => {
    assert.notEqual(ssrfUnsafeUrlReason('http://[fd12:3456:789a::1]/v1'), null);
    assert.notEqual(ssrfUnsafeUrlReason('http://[::ffff:127.0.0.1]/v1'), null);
    assert.notEqual(ssrfUnsafeUrlReason('http://[::ffff:7f00:1]/v1'), null);
    assert.notEqual(ssrfUnsafeUrlReason('http://[::ffff:a00:1]/v1'), null);
  });

  it('rejects localhost and internal/.local hostnames, including absolute DNS names', () => {
    assert.notEqual(ssrfUnsafeUrlReason('http://localhost:8080/v1'), null);
    assert.notEqual(ssrfUnsafeUrlReason('http://localhost.:8080/v1'), null);
    assert.notEqual(ssrfUnsafeUrlReason('http://metadata.google.internal/v1'), null);
    assert.notEqual(ssrfUnsafeUrlReason('http://metadata.google.internal./v1'), null);
    assert.notEqual(ssrfUnsafeUrlReason('http://my-router.local/v1'), null);
    assert.notEqual(ssrfUnsafeUrlReason('http://my-router.local./v1'), null);
  });

  it('rejects non-http(s) schemes', () => {
    assert.notEqual(ssrfUnsafeUrlReason('file:///etc/passwd'), null);
    assert.notEqual(ssrfUnsafeUrlReason('ftp://example.com/v1'), null);
  });

  it('rejects userinfo-in-URL', () => {
    assert.notEqual(ssrfUnsafeUrlReason('https://user:pass@api.openai.com/v1'), null);
  });

  it('private-network override only relaxes address policy, never scheme or userinfo', () => {
    const policy = { allowPrivateNetworkTargets: true };
    assert.equal(ssrfUnsafeUrlReason('http://127.0.0.1:11434/v1', policy), null);
    assert.notEqual(ssrfUnsafeUrlReason('file:///etc/passwd', policy), null);
    assert.notEqual(ssrfUnsafeUrlReason('https://user:pass@localhost/v1', policy), null);
  });

  it('rejects alternate numeric-IP encodings (decimal/hex for 127.0.0.1)', () => {
    assert.notEqual(ssrfUnsafeUrlReason('http://2130706433/v1'), null);
    assert.notEqual(ssrfUnsafeUrlReason('http://0x7f000001/v1'), null);
  });

  it('accepts real public https provider URLs', () => {
    assert.equal(ssrfUnsafeUrlReason('https://api.openai.com/v1'), null);
    assert.equal(ssrfUnsafeUrlReason('https://generativelanguage.googleapis.com/v1beta'), null);
    assert.equal(ssrfUnsafeUrlReason('https://my-custom-gateway.example.com:8443/v1'), null);
    assert.equal(ssrfUnsafeUrlReason('https://openrouter.ai/api/v1'), null);
  });
});

describe('routes/config — ingress security (HTTP behavior)', async () => {
  let server: TestServer;
  before(async () => { server = await startTestServer(); });
  after(async () => { await server.close(); });

  // ── SSRF: POST /api/ai-config ────────────────────────────────────────────

  it('POST /api/ai-config rejects a metadata-IP baseUrl with 400', async () => {
    const res = await fetch(`${server.baseUrl}/api/ai-config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider: 'openai-compat', baseUrl: 'http://169.254.169.254/latest/meta-data/' }),
    });
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.match(body.error, /baseUrl/);
  });

  it('POST /api/ai-config rejects a loopback baseUrl with 400', async () => {
    const res = await fetch(`${server.baseUrl}/api/ai-config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider: 'openai-compat', baseUrl: 'http://127.0.0.1:11434/v1' }),
    });
    assert.equal(res.status, 400);
  });

  it('POST /api/ai-config rejects an RFC1918 imgBaseUrl with 400', async () => {
    const res = await fetch(`${server.baseUrl}/api/ai-config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imgProvider: 'openai-compat', imgBaseUrl: 'http://10.0.0.5/v1' }),
    });
    assert.equal(res.status, 400);
  });

  it('POST /api/ai-config rejects a non-http(s) ttsBaseUrl with 400', async () => {
    const res = await fetch(`${server.baseUrl}/api/ai-config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ttsProvider: 'openai-compat', ttsBaseUrl: 'file:///etc/passwd' }),
    });
    assert.equal(res.status, 400);
  });

  it('POST /api/ai-config rejects a userinfo embBaseUrl with 400', async () => {
    const res = await fetch(`${server.baseUrl}/api/ai-config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ embProvider: 'openai-compat', embBaseUrl: 'https://user:pass@evil.example.com/v1' }),
    });
    assert.equal(res.status, 400);
  });

  it('POST /api/ai-config accepts a real public https baseUrl with 200 (valid-input behavior preserved)', async () => {
    const res = await fetch(`${server.baseUrl}/api/ai-config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider: 'openai-compat', baseUrl: 'https://api.openai.com/v1' }),
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.ok, true);
    assert.equal(body.config.baseUrl, 'https://api.openai.com/v1');
  });

  it('POST /api/ai-config accepts a custom public gateway host with 200', async () => {
    const res = await fetch(`${server.baseUrl}/api/ai-config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider: 'openai-compat', baseUrl: 'https://my-gateway.example.com:8443/v1' }),
    });
    assert.equal(res.status, 200);
  });

  it('POST /api/ai-config still accepts an omitted baseUrl with 200 (Gemini-only config unaffected)', async () => {
    const res = await fetch(`${server.baseUrl}/api/ai-config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider: 'gemini' }),
    });
    assert.equal(res.status, 200);
  });

  // ── /metrics gating ──────────────────────────────────────────────────────

  it('GET /metrics is reachable over loopback with no METRICS_TOKEN configured (documented default)', async () => {
    assert.equal(process.env.METRICS_TOKEN, undefined, 'precondition: METRICS_TOKEN must be unset for this test');
    const res = await fetch(`${server.baseUrl}/metrics`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(typeof body.sessions, 'number');
  });

  it('GET /health stays open with no auth required', async () => {
    const res = await fetch(`${server.baseUrl}/health`);
    assert.equal(res.status, 200);
  });
});

describe('routes/config — /metrics with METRICS_TOKEN set', async () => {
  let server: TestServer;
  before(async () => {
    process.env.METRICS_TOKEN = 'test-metrics-token-12345';
    server = await startTestServer();
  });
  after(async () => {
    delete process.env.METRICS_TOKEN;
    await server.close();
  });

  it('returns 404 (not 401) with no Authorization header', async () => {
    const res = await fetch(`${server.baseUrl}/metrics`);
    assert.equal(res.status, 404);
  });

  it('returns 404 with an incorrect bearer token', async () => {
    const res = await fetch(`${server.baseUrl}/metrics`, {
      headers: { Authorization: 'Bearer wrong-token' },
    });
    assert.equal(res.status, 404);
  });

  it('returns 200 with the correct bearer token', async () => {
    const res = await fetch(`${server.baseUrl}/metrics`, {
      headers: { Authorization: `Bearer ${process.env.METRICS_TOKEN}` },
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(typeof body.sessions, 'number');
  });

  it('/health remains open even when METRICS_TOKEN is set', async () => {
    const res = await fetch(`${server.baseUrl}/health`);
    assert.equal(res.status, 200);
  });
});

describe('routes/collab — token minting (HTTP behavior)', async () => {
  let server: TestServer;
  before(async () => { server = await startTestServer(); });
  after(async () => { await server.close(); });

  it('POST /api/collab/token mints a token for any syntactically-valid room name (bearer-capability model)', async () => {
    const res = await fetch(`${server.baseUrl}/api/collab/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ room: `room-${freshSessionId()}` }),
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(typeof body.token, 'string');
    assert.equal(typeof body.expiresAt, 'number');
  });

  it('POST /api/collab/token rejects a malformed room name with 400', async () => {
    const res = await fetch(`${server.baseUrl}/api/collab/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ room: 'has spaces! and $ymbols' }),
    });
    assert.equal(res.status, 400);
  });
});

describe('routes/collab — COLLAB_SECRET production gate', async () => {
  let server: TestServer;
  const originalNodeEnv = process.env.NODE_ENV;
  before(async () => {
    delete process.env.COLLAB_SECRET;
    process.env.NODE_ENV = 'production';
    server = await startTestServer();
  });
  after(async () => {
    process.env.NODE_ENV = originalNodeEnv;
    await server.close();
  });

  it('refuses to mint a token with 503 when NODE_ENV=production and COLLAB_SECRET is unset', async () => {
    const res = await fetch(`${server.baseUrl}/api/collab/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ room: 'prod-room-1' }),
    });
    assert.equal(res.status, 503);
  });
});

describe('routes/game — run-room limiter tier', async () => {
  let server: TestServer;
  before(async () => { server = await startTestServer(); });
  after(async () => { await server.close(); });

  it('POST /api/run-room hits aiLimiter\'s lower ceiling (20/min), not gameLimiter\'s (120/min)', async () => {
    const sid = freshSessionId();
    const statuses: number[] = [];
    for (let i = 0; i < 25; i++) {
      const res = await fetch(`${server.baseUrl}/api/run-room`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: sid, nodeId: 'nowhere' }),
      });
      statuses.push(res.status);
      if (res.status === 429) break;
    }
    assert.ok(statuses.includes(429), `expected a 429 within 25 requests under aiLimiter, got: ${statuses.join(',')}`);
  });

  it('GET /api/run-room-stream hits aiLimiter\'s lower ceiling (20/min)', async () => {
    const sid = freshSessionId();
    // run-room's non-streaming POST above already consumed some of aiLimiter's
    // shared 20/min budget for this IP within this server instance — a fresh
    // burst here still crosses into 429 well before gameLimiter's 120 would.
    const statuses: number[] = [];
    for (let i = 0; i < 25; i++) {
      const res = await fetch(`${server.baseUrl}/api/run-room-stream?sessionId=${sid}&nodeId=nowhere`);
      statuses.push(res.status);
      if (res.status === 429) break;
    }
    assert.ok(statuses.includes(429), `expected a 429 within 25 requests under aiLimiter, got: ${statuses.join(',')}`);
  });
});
