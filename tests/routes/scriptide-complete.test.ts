// GET /api/scriptide/complete — compatibility tombstone.
//
// The former keystroke-triggered EventSource route put draft text and a bearer
// session id in a GET URL. The URL stays registered so old clients receive an
// explicit retirement response, but it must be deterministic zero-work even
// when a normal provider is ready. A separate positive control proves that
// provider readiness and an explicit ScriptIDE AI workflow remain intact.
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startTestServer, type TestServer } from './helpers.ts';
import { setLLMProvider, resetLLMProvider } from '../../server/engine/ai.ts';
import { sessions } from '../../server/lib/session-store.ts';
import type { GenerateContentParameters } from '@google/genai';

const DRAFT_SENTINEL = 'INT. PRIVATE DRAFT - NIGHT\nThis text must never reach a provider.';
const SESSION_SENTINEL = 'retired-inline-session-sentinel';

describe('routes/scriptide — GET /api/scriptide/complete retirement tombstone', async () => {
  let server: TestServer;
  const providerCalls: GenerateContentParameters[] = [];
  let sessionLookups = 0;
  const previousGeminiKey = process.env.GEMINI_API_KEY;
  const originalSessionsGet = sessions.get;

  before(async () => {
    process.env.GEMINI_API_KEY = 'test-key-proves-provider-is-ready';
    sessions.get = function (key: string) {
      sessionLookups++;
      return originalSessionsGet.call(sessions, key);
    };
    server = await startTestServer();
    setLLMProvider({
      generate: async (params: GenerateContentParameters) => {
        providerCalls.push(params);
        return { text: 'explicit-ai-provider-control' } as unknown as import('@google/genai').GenerateContentResponse;
      },
    });
  });

  after(async () => {
    sessions.get = originalSessionsGet;
    resetLLMProvider();
    if (previousGeminiKey === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = previousGeminiKey;
    await server.close();
  });

  it('returns exact 410 no-store JSON without SSE, provider calls, or session lookup/work', async () => {
    providerCalls.length = 0;
    sessionLookups = 0;
    const query = new URLSearchParams({
      prefix: DRAFT_SENTINEL,
      suffix: 'PRIVATE SUFFIX',
      persona: 'private-persona',
      directorStyle: 'kubrick',
      genre: 'heist',
      characters: 'ALICE,BOB',
      sessionId: SESSION_SENTINEL,
    });

    const res = await fetch(`${server.baseUrl}/api/scriptide/complete?${query}`);
    const bodyText = await res.text();

    assert.equal(res.status, 410);
    assert.equal(res.headers.get('cache-control'), 'no-store');
    assert.notEqual(res.headers.get('content-type'), 'text/event-stream');
    assert.deepEqual(JSON.parse(bodyText), { error: 'inline_completion_retired' });
    assert.deepEqual(providerCalls, [], 'retired route must never reach the configured provider');
    assert.equal(sessionLookups, 0, 'retired route must not resolve or inspect session data');
  });

  it('preserves normal readiness and an explicit ScriptIDE AI route', async () => {
    providerCalls.length = 0;

    const configRes = await fetch(`${server.baseUrl}/api/ai-config`);
    assert.equal(configRes.status, 200);
    const config = await configRes.json();
    assert.equal(config.llmReady, true, 'normal Gemini readiness must remain available');

    const explicitRes = await fetch(`${server.baseUrl}/api/scriptide/world-build`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ beat: 'A lighthouse keeper answers a deliberate distress call.' }),
    });
    assert.equal(explicitRes.status, 200);
    assert.deepEqual(await explicitRes.json(), { result: 'explicit-ai-provider-control' });
    assert.equal(providerCalls.length, 1, 'explicit AI workflow must remain wired to the provider');
  });
});
