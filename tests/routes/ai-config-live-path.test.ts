// ai-config-live-path.test.ts — Lane G, Part 2.2: in-sandbox, no-real-keys
// proof that the multi-provider AI path is real, not just mocked-provider
// theater. This file stands up its OWN mock upstream HTTP server (a real
// loopback listener this test controls, not a stubbed function) and drives
// the real server routes over real HTTP against it.
//
// What this proves, and where in the server code each assertion pins:
//
//   1. THE OR TRAP (CLAUDE.md: "`/api/ai-config` ... reports `llmReady`,
//      which ORs the TWO independent key sources (env `GEMINI_API_KEY` and
//      the multi-provider config) — checking only one is a recurring
//      trap"): llmReady() (server/lib/ai-config.ts:197-201) evaluates
//      whichever source matches the ACTIVE selected provider —
//      `if (pub.provider === 'gemini') return Boolean(process.env.
//      GEMINI_API_KEY); return Boolean(pub.baseUrl) && (pub.keySet ||
//      isLoopbackBaseUrl(pub.baseUrl));` — so a caller that checked only
//      ONE of those two branches (e.g. only `process.env.GEMINI_API_KEY`)
//      would silently under-report readiness the moment a config-source
//      provider is active. This file proves BOTH arms independently:
//        - "config source flips llmReady true" below proves the second
//          branch (openai-compat) with NO GEMINI_API_KEY ever set.
//        - "env source flips llmReady true" below proves the first branch
//          (gemini) with the config source pointed at an unreachable/mocked
//          target — i.e. readiness there is env-key PRESENCE, not a proven
//          working call, which is exactly what the code at ai-config.ts:199
//          claims and no more.
//
//   2. AN AI ROUTE REACHES THE MOCK AND RETURNS ITS PAYLOAD: POST
//      /api/ai-config/test (server/routes/config.ts:179-207) is the
//      existing connection-test route — it calls generateContent(), which
//      resolves through server/engine/ai.ts's active LLM provider. When the
//      config source is active that provider is
//      makeOpenAICompatLLMProvider() (server/lib/ai-providers/
//      openai-compat.ts:409-469), which POSTs to `${baseUrl}/chat/
//      completions` via fetchOpenAICompat() (openai-compat.ts:240-368).
//      That function performs a REAL DNS lookup + SSRF re-validation +
//      pinned TCP connect (resolveAndValidateHost(), openai-compat.ts:
//      145-179) before dialing — this test does not bypass any of that
//      pipeline; it only substitutes what DNS resolves the mock hostname
//      to (see "DNS interception" below), then lets the real fetch reach
//      a real loopback HTTP server this test wrote and controls.
//
//   3. KEYS ARE NEVER SERIALIZED TO A CLIENT-VISIBLE RESPONSE:
//      getPublicConfig() (ai-config.ts:155-168) returns only `keySet`/
//      `imgKeySet`/`ttsKeySet`/`embKeySet` booleans, never a key field —
//      this test asserts that contract against GET /api/ai-config, POST
//      /api/ai-config, and POST /api/ai-config/test response bodies, by
//      searching the full serialized JSON text for the configured fake key
//      string.
//
//   4. RATE LIMITING STAYS ENGAGED: aiLimiter (server/lib/session-store.ts:
//      133-139, 20 req/min, standardHeaders: true) still gates POST
//      /api/ai-config/test — proved by a burst past its ceiling, mirroring
//      the existing pattern in tests/routes/limiters.test.ts.
//
// DNS interception (why this needs no real network, no /etc/hosts edit, and
// cannot leak to any other test file): server/lib/ai-providers/
// openai-compat.ts does `import dns from 'node:dns/promises'` and calls
// `dns.lookup(hostname, { all: true })` at call time off that SAME default-
// export object. Node's ES module cache is a per-specifier singleton within
// one process, so THIS file's `import dns from 'node:dns/promises'` is the
// identical object reference — monkey-patching its `.lookup` method here is
// visible to the app code running in this same process. This repo's test
// runner isolates every *.test.ts file into its own worker process (see
// tests/routes/limiters.test.ts's header comment for the same guarantee
// applied to shared rate-limiter state), so the patch cannot bleed into any
// sibling test file, and it is restored in `after()` regardless.
//
// checkAdminAuth (server/lib/admin-auth.ts:49-63) gates POST /api/ai-config
// and POST /api/ai-config/test: with no ADMIN_TOKEN set, only a loopback
// caller is admitted. This test's fetch() calls target 127.0.0.1 directly
// (startTestServer() binds to 127.0.0.1), so the loopback branch applies
// with no token needed — this file explicitly deletes/restores
// process.env.ADMIN_TOKEN so ambient state can't change that.

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer as createHttpServer, type IncomingMessage, type ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';
import dns from 'node:dns/promises';

import { startTestServer, type TestServer } from './helpers.ts';
import { applyConfig, getPublicConfig, initFromEnv } from '../../server/lib/ai-config.ts';

// Reserved-for-documentation TLD (RFC 2606) — guaranteed never to be a real,
// publicly-resolvable host, and deliberately NOT on validation.ts's
// PRIVATE_HOSTNAME_EXACT/PRIVATE_HOSTNAME_SUFFIXES blocklist (only
// 'localhost', '.localhost', '.local', '.internal' are blocked there), so
// POST /api/ai-config's zod schema (AiConfigSchema.baseUrl -> the shared
// ssrfSafeUrlField(), validation.ts:182-187) accepts it at the HTTP layer —
// exactly the layer a real operator's request would go through. The literal
// hostname is never a private/loopback IP; only the DNS *resolution* this
// test controls points it at the mock server.
const MOCK_HOSTNAME = 'storymachine-test-upstream.invalid';
const MOCK_UPSTREAM_TEXT = 'MOCK_UPSTREAM_PONG';
// Clearly-fake, never a real credential — used only to prove it never
// reaches a client-visible response.
const FAKE_CONFIG_KEY = 'sk-test-mock-upstream-key-should-never-leave-process';

function startMockUpstream(): Promise<{
  baseUrl: string;
  requestCount: () => number;
  lastAuthHeader: () => string | undefined;
  close: () => Promise<void>;
}> {
  let count = 0;
  let lastAuth: string | undefined;
  const server = createHttpServer((req: IncomingMessage, res: ServerResponse) => {
    if (req.method === 'POST' && req.url?.startsWith('/v1/chat/completions')) {
      let body = '';
      req.on('data', (c) => { body += c; });
      req.on('end', () => {
        count += 1;
        lastAuth = req.headers.authorization;
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          choices: [{ message: { content: MOCK_UPSTREAM_TEXT } }],
          usage: { prompt_tokens: 3, completion_tokens: 2 },
        }));
      });
      return;
    }
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'not found' }));
  });
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address() as AddressInfo;
      resolve({
        baseUrl: `http://${MOCK_HOSTNAME}:${port}/v1`,
        requestCount: () => count,
        lastAuthHeader: () => lastAuth,
        close: () => new Promise<void>((res2) => server.close(() => res2())),
      });
    });
  });
}

describe('POST /api/ai-config live path (mock upstream, no real keys)', async () => {
  let server: TestServer;
  let mock: Awaited<ReturnType<typeof startMockUpstream>>;
  const realLookup = dns.lookup.bind(dns);

  const savedEnv: Record<string, string | undefined> = {};
  const ENV_FLAGS = ['GEMINI_API_KEY', 'ADMIN_TOKEN', 'AI_ALLOW_PRIVATE_NETWORK_TARGETS', 'NODE_ENV'] as const;

  before(async () => {
    for (const k of ENV_FLAGS) savedEnv[k] = process.env[k];
    for (const k of ENV_FLAGS) delete process.env[k];
    // Belt-and-suspenders per openai-compat.ts's own documented escape
    // hatch (its header comment): the resolved dial target (127.0.0.1) is a
    // private address, and the fetch-site guard only enforces
    // NODE_ENV==='production' anyway (NODE_ENV is deleted above), but
    // setting this explicitly makes the test's intent self-documenting and
    // keeps it correct even if that gating convention changes later.
    process.env.AI_ALLOW_PRIVATE_NETWORK_TARGETS = 'true';

    // Establish a clean, keyless ai-config baseline (same pattern as
    // tests/routes/llm-ready.test.ts) so this file's assertions can't be
    // thrown off by state a differently-ordered `before` left behind.
    initFromEnv();

    mock = await startMockUpstream();

    // Monkey-patch the SHARED node:dns/promises singleton's .lookup so the
    // mock hostname resolves to the mock server's loopback address, and
    // every other hostname keeps resolving for real. See the file header
    // for why this is visible to server/lib/ai-providers/openai-compat.ts
    // without changing that file at all.
    dns.lookup = (async (hostname: string, opts?: unknown) => {
      if (hostname === MOCK_HOSTNAME) {
        const rec = { address: '127.0.0.1', family: 4 };
        const wantsAll = typeof opts === 'object' && opts !== null && (opts as { all?: boolean }).all;
        return wantsAll ? [rec] : rec;
      }
      return realLookup(hostname, opts as never);
    }) as typeof dns.lookup;

    server = await startTestServer();
  });

  after(async () => {
    dns.lookup = realLookup;
    for (const k of ENV_FLAGS) {
      if (savedEnv[k] === undefined) delete process.env[k];
      else process.env[k] = savedEnv[k];
    }
    initFromEnv();
    await mock.close();
    await server.close();
  });

  it('keyless baseline: llmReady is false and no key material appears anywhere', async () => {
    const res = await fetch(`${server.baseUrl}/api/ai-config`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.llmReady, false, 'nothing configured yet — must not report ready');
    for (const forbidden of ['apiKey', 'imgApiKey', 'ttsApiKey', 'embApiKey']) {
      assert.equal(body[forbidden], undefined, `${forbidden} must never appear in the response`);
    }
  });

  it('config source: POST /api/ai-config against the mock upstream flips llmReady true, ' +
     'and POST /api/ai-config/test actually reaches the mock and returns its payload', async () => {
    // Point the multi-provider config at the mock upstream through the
    // REAL, zod-validated HTTP route (server/routes/config.ts:169-174 ->
    // validate(AiConfigSchema) -> applyConfig()) — not by calling
    // applyConfig() directly, so this exercises the exact boundary a real
    // operator's Settings-panel request would cross.
    const postRes = await fetch(`${server.baseUrl}/api/ai-config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider: 'openai-compat', baseUrl: mock.baseUrl, apiKey: FAKE_CONFIG_KEY }),
    });
    const postText = await postRes.text();
    assert.equal(postRes.status, 200, postText);
    const postBody = JSON.parse(postText);
    assert.equal(postBody.ok, true);
    assert.equal(postBody.config.provider, 'openai-compat');
    assert.equal(postBody.config.baseUrl, mock.baseUrl);
    assert.equal(postBody.config.keySet, true, 'keySet boolean must flip true — the raw key itself must not appear (checked below)');

    // The OR trap, arm 1: readiness flips true via the CONFIG source ALONE
    // — GEMINI_API_KEY was deleted in before() and stays deleted for this
    // whole test. If code anywhere checked only process.env.GEMINI_API_KEY
    // for readiness, this would wrongly read false.
    const getRes = await fetch(`${server.baseUrl}/api/ai-config`);
    const getBody = await getRes.json();
    assert.equal(getBody.llmReady, true, 'llmReady must flip true from the multi-provider config source alone');
    assert.equal(process.env.GEMINI_API_KEY, undefined, 'sanity: the env source is genuinely absent for this assertion');

    // The AI route reaches the mock and returns ITS payload (not a canned
    // string this test invented) — proves the full generate ->
    // makeOpenAICompatLLMProvider -> fetchOpenAICompat -> DNS -> SSRF ->
    // pinned-TCP-connect -> real HTTP response pipeline actually ran.
    const testRes = await fetch(`${server.baseUrl}/api/ai-config/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    });
    const testText = await testRes.text();
    assert.equal(testRes.status, 200, testText);
    const testBody = JSON.parse(testText);
    assert.equal(testBody.ok, true);
    assert.equal(testBody.response, MOCK_UPSTREAM_TEXT, 'the route must return the MOCK UPSTREAM\'s own payload, not a stub');
    assert.equal(mock.requestCount(), 1, 'the mock upstream must have actually been called exactly once');
    assert.equal(mock.lastAuthHeader(), `Bearer ${FAKE_CONFIG_KEY}`, 'the configured key must reach the UPSTREAM (expected wire behavior) — checked separately below that it never reaches a CLIENT-VISIBLE response');

    // Keys never serialized to any client-visible response, across every
    // response body touched by this test so far.
    const allBodies = JSON.stringify([postBody, getBody, testBody]);
    assert.ok(!allBodies.includes(FAKE_CONFIG_KEY), 'the fake key string must not appear in any client-visible response body');
    assert.ok(
      !Object.prototype.hasOwnProperty.call(getPublicConfig(), 'apiKey'),
      'getPublicConfig() itself must never expose a key field (ai-config.ts:155-168) — not even as a TypeScript-invisible extra property'
    );
  });

  it('env source: llmReady flips true from GEMINI_API_KEY presence alone (config readiness ' +
     'is config PRESENCE, not a proven working call) while the config source stays pointed at the mock', async () => {
    // Switch the active provider back to gemini so ai-config.ts:199's first
    // branch is the one under test. The config source (still openai-compat
    // credentials from the previous test, now inactive) intentionally stays
    // configured but unreachable-from-this-branch — proving provider
    // selection, not credential presence, decides which arm of the OR is
    // live (server/lib/ai-config.ts:197-201).
    const switchRes = await fetch(`${server.baseUrl}/api/ai-config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider: 'gemini' }),
    });
    assert.equal(switchRes.status, 200);

    const beforeRes = await fetch(`${server.baseUrl}/api/ai-config`);
    const beforeBody = await beforeRes.json();
    assert.equal(beforeBody.llmReady, false, 'gemini selected, no GEMINI_API_KEY yet — must not be ready');

    // Set a dummy env key directly (in-process — llmReady() reads
    // process.env.GEMINI_API_KEY at call time, no restart needed) and
    // deliberately do NOT call POST /api/ai-config/test against it: that
    // would fire a real outbound call to Google's API with an invalid key,
    // which is both a real network dependency this suite must not have and
    // beside the point being proved here. The point is narrower and exactly
    // what the code claims: readiness for this arm is config PRESENCE.
    process.env.GEMINI_API_KEY = 'dummy-test-key-not-real-and-never-used-in-a-real-call';
    const afterRes = await fetch(`${server.baseUrl}/api/ai-config`);
    const afterBody = await afterRes.json();
    assert.equal(afterBody.llmReady, true, 'llmReady must flip true from GEMINI_API_KEY presence alone — the OR trap\'s second arm');
    for (const forbidden of ['apiKey', 'imgApiKey', 'ttsApiKey', 'embApiKey']) {
      assert.equal(afterBody[forbidden], undefined, `${forbidden} must never appear even with a dummy env key set`);
    }
    assert.ok(
      !JSON.stringify(afterBody).includes('dummy-test-key-not-real-and-never-used-in-a-real-call'),
      'the dummy env key string must not appear in the response body either'
    );

    delete process.env.GEMINI_API_KEY;
  });

  it('rate limiting stays engaged: aiLimiter still returns 429 within 25 rapid ' +
     'POST /api/ai-config/test requests', async () => {
    // Re-point at the mock (previous test switched the active provider to
    // gemini with no working key) so requests that DO get through the
    // limiter resolve fast instead of stalling on a real network call.
    await fetch(`${server.baseUrl}/api/ai-config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider: 'openai-compat', baseUrl: mock.baseUrl, apiKey: FAKE_CONFIG_KEY }),
    });

    const statuses: number[] = [];
    for (let i = 0; i < 25; i++) {
      const res = await fetch(`${server.baseUrl}/api/ai-config/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      });
      statuses.push(res.status);
      if (res.status === 429) break;
    }
    assert.ok(statuses.includes(429), `expected a 429 within 25 requests (aiLimiter is 20/min), got: ${statuses.join(',')}`);
    // Confirm express-rate-limit's own headers are present — the concrete,
    // observable evidence that aiLimiter (standardHeaders: true,
    // session-store.ts:133-139) is the middleware actually firing here,
    // not some other unrelated 429 source.
    const limitedRes = await fetch(`${server.baseUrl}/api/ai-config/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    });
    assert.equal(limitedRes.status, 429);
    assert.ok(limitedRes.headers.has('ratelimit-limit') || limitedRes.headers.has('RateLimit-Limit'),
      'a 429 from aiLimiter must carry standardHeaders rate-limit metadata');
  });
});
