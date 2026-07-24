// G0-09 — Keyless zero-AI smoke test.
//
// Proves the demo path: a full deterministic session on the built-in sample
// (doctor coverage, diagnose-as-you-type, save/load, config probe) completes
// keyless with ZERO provider calls — asserted two ways:
//   1. Provider-seam spies: every LLM/embedding/image/TTS provider slot is
//      replaced with a recording spy (server/engine/ai.ts's documented seam,
//      the single choke point all generation funnels through).
//   2. Network recording: globalThis.fetch is wrapped for the session's
//      duration; any request leaving loopback is recorded. The deterministic
//      session must produce zero external requests.
//
// Falsifiability (the RED-analog for a proof-test): the final subtest proves
// the harness CAN detect provider traffic — with a dummy key installed, an
// explicit AI route invocation must register on the spy. If the seam ever
// stopped observing real traffic, that subtest fails, so the zero-count
// assertion above it cannot rot into a vacuous pass.
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startTestServer, type TestServer } from './helpers.ts';
import { fountain as sampleFountain } from '../../src/lib/sample-script.ts';

// Scrub every key source BEFORE the app boots so the server is genuinely
// keyless (llmReady=false), matching the demo environment.
const KEY_VARS = [
  'GEMINI_API_KEY', 'OPENROUTER_API_KEY', 'AI_API_KEY', 'AI_IMG_API_KEY',
  'AI_TTS_API_KEY', 'AI_EMBEDDING_API_KEY', 'AI_PROVIDER', 'AI_BASE_URL',
] as const;
const savedEnv: Record<string, string | undefined> = {};
for (const k of KEY_VARS) { savedEnv[k] = process.env[k]; delete process.env[k]; }

type Call = { seam: string };

describe('G0-09 — keyless deterministic session emits zero provider calls', async () => {
  let server: TestServer;
  const providerCalls: Call[] = [];
  const externalRequests: string[] = [];
  const realFetch = globalThis.fetch;
  let ai: typeof import('../../server/engine/ai.ts');

  before(async () => {
    // Network recorder: anything leaving loopback is logged.
    globalThis.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input instanceof Request ? input.url : input);
      if (!/^https?:\/\/(127\.0\.0\.1|localhost|\[::1\])/.test(url)) {
        externalRequests.push(url);
      }
      return realFetch(input as RequestInfo, init);
    }) as typeof fetch;

    server = await startTestServer();
    ai = await import('../../server/engine/ai.ts');
    // Recording spies on every provider seam. They throw after recording so
    // any accidental invocation also surfaces as a route-level error.
    ai.setLLMProvider({
      generate: async () => { providerCalls.push({ seam: 'llm.generate' }); throw new Error('spy'); },
      generateStream: async () => { providerCalls.push({ seam: 'llm.stream' }); throw new Error('spy'); },
    } as never);
    ai.setEmbeddingProvider({ embed: async () => { providerCalls.push({ seam: 'embed' }); return []; } });
    ai.setImageProvider({ generate: async () => { providerCalls.push({ seam: 'image' }); return undefined; } });
    ai.setTTSProvider({ speak: async () => { providerCalls.push({ seam: 'tts' }); return undefined; } });
  });

  after(async () => {
    globalThis.fetch = realFetch;
    ai.resetLLMProvider();
    await server.close();
    for (const k of KEY_VARS) {
      if (savedEnv[k] === undefined) delete process.env[k]; else process.env[k] = savedEnv[k];
    }
  });

  it('health + config: server boots keyless into analysis-only mode', async () => {
    const health = await realFetch(`${server.baseUrl}/health`);
    assert.equal(health.status, 200);
    const cfg = await (await realFetch(`${server.baseUrl}/api/ai-config`)).json();
    assert.equal(cfg.llmReady, false, 'keyless boot must report llmReady:false');
  });

  it('full 14-pass doctor coverage on the sample succeeds deterministically', async () => {
    const res = await realFetch(`${server.baseUrl}/api/scriptide/doctor`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ fountain: sampleFountain }),
    });
    assert.equal(res.status, 200);
    const report = await res.json();
    assert.equal(typeof report.health, 'number');
    assert.ok(report.verdict, 'sample coverage must produce a verdict');
  });

  it('diagnose-as-you-type on the sample succeeds deterministically', async () => {
    const res = await realFetch(`${server.baseUrl}/api/scriptide/diagnose`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ fountain: sampleFountain }),
    });
    assert.equal(res.status, 200);
  });

  it('draft save/load round-trips', async () => {
    const save = await realFetch(`${server.baseUrl}/api/scriptide/save`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ scriptText: sampleFountain }),
    });
    assert.equal(save.status, 200);
    const load = await realFetch(`${server.baseUrl}/api/scriptide/load`);
    assert.equal(load.status, 200);
  });

  it('gated AI routes refuse honestly (503), not silently attempt', async () => {
    const res = await realFetch(`${server.baseUrl}/api/scriptide/complete?prefix=${encodeURIComponent(sampleFountain.slice(0, 200))}`);
    assert.equal(res.status, 503, 'keyless completion must 503, not attempt a call');
  });

  it('ZERO provider calls and ZERO external network requests occurred', () => {
    assert.deepEqual(providerCalls, [], `provider seams were invoked: ${JSON.stringify(providerCalls)}`);
    assert.deepEqual(externalRequests, [], `external requests escaped: ${JSON.stringify(externalRequests)}`);
  });

  it('sensitivity: the harness DOES catch a real provider call (falsifiability)', async () => {
    process.env.GEMINI_API_KEY = 'dummy-sensitivity-key';
    try {
      const res = await realFetch(`${server.baseUrl}/api/scriptide/world-build`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ beat: 'a lighthouse town at dusk' }),
      });
      // The spy throws, so the route errors — but the CALL must be recorded.
      assert.ok(providerCalls.length >= 1, 'spy must record an explicit AI invocation');
      assert.notEqual(res.status, 200);
    } finally {
      delete process.env.GEMINI_API_KEY;
      providerCalls.length = 0;
    }
  });
});
