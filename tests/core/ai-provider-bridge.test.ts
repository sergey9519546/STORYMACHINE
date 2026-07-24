// tests/core/ai-provider-bridge.test.ts — OpenRouter → Gemini response-shape
// bridge coverage for server/engine/ai-provider.ts's FreeRideProvider.
//
// Context: FreeRideProvider.generate()/generateStream() used to build the
// Gemini-shaped return value and force it through `as any as
// GenerateContentResponse` (a double-cast escape hatch — the audit target
// this suite exists to guard). That was replaced by a single typed choke
// point (`toGeminiResponse()`), fed by a precisely-typed
// `OpenRouterBridgeResponse` object built from the real @google/genai field
// types (`Candidate`, `GenerateContentResponseUsageMetadata`). This is a
// TYPE-ONLY hardening: these tests exist to prove the runtime shape returned
// by both bridge paths (non-streaming and streaming) is byte-for-byte the
// same plain object shape as before — in particular, that the bridged
// response is NOT a real `GenerateContentResponse` class instance (its
// `.text`/`.data`/... getters must stay inert; every consumer already reads
// `response.text ?? <fallback>` and depends on that getter being absent for
// OpenRouter-bridged responses).
import { describe, it, after } from 'node:test';
import assert from 'node:assert/strict';
import { GenerateContentResponse } from '@google/genai';
import { FreeRideProvider } from '../../server/engine/ai-provider.ts';

const realFetch = globalThis.fetch;
after(() => { globalThis.fetch = realFetch; });

function mockJsonFetch(body: unknown, status = 200): typeof fetch {
  return (async () =>
    new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    })) as unknown as typeof fetch;
}

describe('FreeRideProvider — OpenRouter to Gemini bridge (generate)', () => {
  it('builds a candidates[0].content.parts[0].text shape consumers read', async () => {
    globalThis.fetch = mockJsonFetch({
      choices: [{ message: { content: 'Hello from OpenRouter' } }],
      usage: { prompt_tokens: 12, completion_tokens: 34, total_tokens: 46 },
    });

    const provider = new FreeRideProvider('sk-or-test-key');
    const response = await provider.generate({
      model: 'test/model',
      contents: [{ role: 'user', parts: [{ text: 'hi' }] }],
    });

    // Exact fields every real consumer reads (server/nvm/generate/llm-generator.ts,
    // server/engine/ai.ts's metrics recording, server/nvm/revision/rewrite.ts).
    assert.equal(response.candidates?.[0]?.content?.parts?.[0]?.text, 'Hello from OpenRouter');
    assert.equal(response.candidates?.[0]?.content?.role, 'model');
    assert.equal(response.candidates?.[0]?.finishReason, 'STOP');
    assert.deepEqual(response.candidates?.[0]?.safetyRatings, []);
    assert.equal(response.usageMetadata?.promptTokenCount, 12);
    assert.equal(response.usageMetadata?.candidatesTokenCount, 34);
    assert.equal(response.usageMetadata?.totalTokenCount, 46);
  });

  it('proves zero behavior change: bridged response is a plain object, not a real GenerateContentResponse instance', async () => {
    globalThis.fetch = mockJsonFetch({
      choices: [{ message: { content: 'some text' } }],
      usage: { prompt_tokens: 1, completion_tokens: 2, total_tokens: 3 },
    });

    const provider = new FreeRideProvider('sk-or-test-key');
    const response = await provider.generate({
      model: 'test/model',
      contents: [{ role: 'user', parts: [{ text: 'hi' }] }],
    });

    // The old `as any as GenerateContentResponse` cast never made this a real
    // class instance — it stayed a plain object. The new typed
    // `as unknown as GenerateContentResponse` choke point (toGeminiResponse)
    // must preserve that exactly: no prototype swap, no getters wired up.
    assert.equal(response instanceof GenerateContentResponse, false);
    // The class's `.text` getter is what every consumer falls back past
    // (`response.text ?? '...'`). Confirm it's genuinely absent here (not
    // silently start resolving to 'some text'), the way it always has been
    // for this bridge.
    assert.equal((response as { text?: unknown }).text, undefined);
  });

  it('defaults missing OpenRouter fields to the same fallbacks as before (empty text, zeroed usage)', async () => {
    globalThis.fetch = mockJsonFetch({ choices: [], usage: {} });

    const provider = new FreeRideProvider('sk-or-test-key');
    const response = await provider.generate({
      model: 'test/model',
      contents: [{ role: 'user', parts: [{ text: 'hi' }] }],
    });

    assert.equal(response.candidates?.[0]?.content?.parts?.[0]?.text, '');
    assert.equal(response.usageMetadata?.promptTokenCount, 0);
    assert.equal(response.usageMetadata?.candidatesTokenCount, 0);
    assert.equal(response.usageMetadata?.totalTokenCount, 0);
  });
});

describe('FreeRideProvider — OpenRouter to Gemini bridge (generateStream)', () => {
  it('yields the same candidates[0].content.parts[0].text shape per chunk, with no usageMetadata', async () => {
    const sseBody =
      `data: ${JSON.stringify({ choices: [{ delta: { content: 'Hel' } }] })}\n\n` +
      `data: ${JSON.stringify({ choices: [{ delta: { content: 'lo' } }] })}\n\n` +
      `data: [DONE]\n\n`;

    globalThis.fetch = (async () =>
      new Response(sseBody, { status: 200 })) as unknown as typeof fetch;

    const provider = new FreeRideProvider('sk-or-test-key');
    const stream = await provider.generateStream({
      model: 'test/model',
      contents: [{ role: 'user', parts: [{ text: 'hi' }] }],
    });

    const chunks: string[] = [];
    for await (const chunk of stream) {
      assert.equal(chunk.candidates?.[0]?.content?.role, 'model');
      assert.equal(chunk.candidates?.[0]?.finishReason, 'STOP');
      assert.deepEqual(chunk.candidates?.[0]?.safetyRatings, []);
      // Streaming chunks never set usageMetadata — same as before this change.
      assert.equal(chunk.usageMetadata, undefined);
      assert.equal(chunk instanceof GenerateContentResponse, false);
      chunks.push(chunk.candidates?.[0]?.content?.parts?.[0]?.text ?? '');
    }

    assert.deepEqual(chunks, ['Hel', 'lo']);
  });
});
