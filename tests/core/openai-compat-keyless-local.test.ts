// Keyless local-model generation (Ollama / LM Studio recipe).
//
// Proves the product can exercise its LLM generation features with NO paid API
// key: point AI_PROVIDER=openai-compat at a local OpenAI-compatible server
// (a loopback mock here stands in for Ollama / LM Studio), supply no key, and a
// real generateContent() call through the engine seam still succeeds.
//
// This is the regression guard for the friction that used to block it:
// wireProviders() previously required a non-empty apiKey (`if (baseURL &&
// apiKey)`), so a keyless local server never got wired. It now wires on
// baseURL alone and passes a conventional placeholder token that local servers
// ignore.
import { describe, it, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import type { GenerateContentParameters } from '@google/genai';
import { applyConfig, getPublicConfig } from '../../server/lib/ai-config.ts';
import { generateContent } from '../../server/engine/ai.ts';

function listen(handler: http.RequestListener): Promise<{ url: string; server: http.Server }> {
  return new Promise((resolve) => {
    const server = http.createServer(handler);
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address() as { port: number };
      resolve({ url: `http://127.0.0.1:${addr.port}`, server });
    });
  });
}

async function close(server: http.Server): Promise<void> {
  await new Promise<void>((r) => server.close(() => r()));
}

describe('keyless local-model generation (openai-compat)', () => {
  // Always hand the seam back to the default provider so we never leak the
  // loopback provider into sibling test files that share this module's state.
  after(() => applyConfig({ provider: 'gemini' }, {}));

  it('wires and generates against a local server with NO api key', async () => {
    let seenAuth: string | undefined;
    let seenPath: string | undefined;
    const { url, server } = await listen((req, res) => {
      seenAuth = req.headers.authorization;
      seenPath = req.url;
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({
        choices: [{ message: { content: 'FADE IN: a keyless draft.' } }],
        usage: { prompt_tokens: 3, completion_tokens: 7 },
      }));
    });

    try {
      // The keyless recipe: provider + baseUrl, and an EMPTY keys object.
      applyConfig({ provider: 'openai-compat', baseUrl: url, model: 'local-model' }, {});

      // No key is stored, yet the client-facing readiness contract still holds:
      // getPublicConfig reports keySet:false (we never learned a key)...
      assert.equal(getPublicConfig().keySet, false, 'no api key should be stored');

      // ...while a real generation call through the engine seam succeeds.
      const response = await generateContent(
        { model: 'local-model', contents: 'write a slugline' } as GenerateContentParameters,
        { label: 'keyless-local-test', timeoutMs: 5_000, maxAttempts: 1 },
      );

      assert.equal(
        (response as unknown as { text: string }).text,
        'FADE IN: a keyless draft.',
        'content from the local server should flow back through the seam',
      );
      assert.equal(seenPath, '/chat/completions', 'should hit the OpenAI-compatible chat route');
      assert.ok(
        (seenAuth ?? '').startsWith('Bearer '),
        'a placeholder bearer token is sent; local servers ignore it, so no real key is needed',
      );
    } finally {
      await close(server);
    }
  });
});
