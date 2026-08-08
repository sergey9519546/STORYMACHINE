import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  assertKeylessAiConfig,
  keylessBrowserServerEnv,
} from '../../scripts/lib/keyless-browser-certification.mjs';

describe('keyless browser certification environment', () => {
  it('neutralizes inherited Gemini, OpenAI-compatible, legacy-provider, and media-provider configuration', () => {
    const env = keylessBrowserServerEnv({
      GEMINI_API_KEY: 'inherited-gemini-key',
      OPENROUTER_API_KEY: 'inherited-openrouter-key',
      OPENAI_API_KEY: 'inherited-openai-key',
      ANTHROPIC_API_KEY: 'inherited-anthropic-key',
      AI_PROVIDER: 'openai-compat',
      AI_BASE_URL: 'https://provider.example/v1',
      AI_API_KEY: 'inherited-compat-key',
      AI_IMG_PROVIDER: 'openai-compat',
      AI_IMG_BASE_URL: 'https://images.example/v1',
      AI_IMG_API_KEY: 'inherited-image-key',
      AI_TTS_PROVIDER: 'openai-compat',
      AI_TTS_BASE_URL: 'https://tts.example/v1',
      AI_TTS_API_KEY: 'inherited-tts-key',
      AI_EMBEDDING_PROVIDER: 'openai-compat',
      AI_EMBEDDING_BASE_URL: 'https://embeddings.example/v1',
      AI_EMBEDDING_API_KEY: 'inherited-embedding-key',
      DOTENV_CONFIG_OVERRIDE: 'true',
    });

    for (const name of [
      'GEMINI_API_KEY', 'OPENROUTER_API_KEY', 'OPENAI_API_KEY', 'ANTHROPIC_API_KEY',
      'AI_BASE_URL', 'AI_API_KEY', 'AI_IMG_BASE_URL', 'AI_IMG_API_KEY',
      'AI_TTS_BASE_URL', 'AI_TTS_API_KEY', 'AI_EMBEDDING_BASE_URL', 'AI_EMBEDDING_API_KEY',
    ]) {
      assert.equal(env[name], '', `${name} must not reach the certification server`);
    }
    assert.equal(env.AI_PROVIDER, 'gemini');
    assert.equal(env.AI_IMG_PROVIDER, 'none');
    assert.equal(env.AI_TTS_PROVIDER, 'none');
    assert.equal(env.AI_EMBEDDING_PROVIDER, 'none');
    assert.equal(
      'DOTENV_CONFIG_OVERRIDE' in env,
      false,
      'the spawned keyless server must not let dotenv override its forced blank credentials',
    );
  });

  it('fails closed unless the server reports llmReady:false', async () => {
    await assert.doesNotReject(() => assertKeylessAiConfig(
      'http://certification.test',
      async () => new Response(JSON.stringify({ llmReady: false })),
    ));

    await assert.rejects(
      () => assertKeylessAiConfig(
        'http://certification.test',
        async () => new Response(JSON.stringify({ llmReady: true })),
      ),
      /llmReady:false/,
    );
  });
});
