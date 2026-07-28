// llmReady — single-source-of-truth readiness for every route that gates on
// whether a text-LLM call can be served. This is discrimination evidence for
// the historical trap: a readiness check must follow the selected provider,
// not OR every credential visible to the process. Otherwise a ScriptIDE route
// admits a request that its actual provider cannot serve.
//
// Self-contained — no running server, no other test file's fixtures (matches
// this repo's per-file test convention). applyConfig's _keys is append-only,
// so the stored-key scenario is deliberately last; Node's test runner isolates
// this file in its own worker process. Env and non-secret config are restored
// in hooks for the earlier scenarios.

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';

import { llmReady, applyConfig, getPublicConfig, initFromEnv } from '../../server/lib/ai-config.ts';

const ENV_FLAGS = ['GEMINI_API_KEY', 'OPENROUTER_API_KEY', 'AI_PROVIDER', 'AI_BASE_URL', 'AI_API_KEY'] as const;

describe('llmReady — readiness follows the configured provider', () => {
  // Snapshot env so this file's temporary credentials never leak to another
  // scenario in the worker process.
  const savedEnv: Record<string, string | undefined> = {};
  before(() => {
    for (const k of ENV_FLAGS) savedEnv[k] = process.env[k];
    // Establish a clean keyless baseline: clear env, then rebuild _cfg/_keys
    // from that empty env. Every test below starts from this state.
    for (const k of ENV_FLAGS) delete process.env[k];
    initFromEnv();
  });
  after(() => {
    for (const k of ENV_FLAGS) {
      if (savedEnv[k] === undefined) delete process.env[k];
      else process.env[k] = savedEnv[k];
    }
    initFromEnv();
  });

  it('keyless baseline: no source set → llmReady is false (no-fire)', () => {
    assert.equal(llmReady(), false, 'with no key source configured, must report not ready');
  });

  it('GEMINI_API_KEY → ready only when Gemini is the selected provider', () => {
    process.env.GEMINI_API_KEY = 'test-gemini-key';
    try {
      assert.equal(llmReady(), true);
      applyConfig({ provider: 'openai-compat', baseUrl: 'https://example.test/v1' });
      assert.equal(llmReady(), false, 'an inactive Gemini credential cannot enable openai-compat');
    } finally {
      delete process.env.GEMINI_API_KEY;
      initFromEnv();
    }
  });

  it('OPENROUTER_API_KEY alone is not ready for the ScriptIDE workflow', () => {
    // FreeRide is deliberately excluded until its response bridge is
    // compatible with every ScriptIDE consumer. This prevents provider traffic
    // that returns empty or invalid output.
    process.env.OPENROUTER_API_KEY = 'test-openrouter-key';
    try {
      assert.equal(llmReady(), false);
    } finally {
      delete process.env.OPENROUTER_API_KEY;
      initFromEnv();
    }
  });

  it('clearing the active Gemini credential flips readiness back to false', () => {
    process.env.GEMINI_API_KEY = 'temp-key';
    try {
      assert.equal(llmReady(), true);
      delete process.env.GEMINI_API_KEY;
      initFromEnv();
      assert.equal(llmReady(), false);
    } finally {
      delete process.env.GEMINI_API_KEY;
      initFromEnv();
    }
  });

  it('keyless local model server (openai-compat + baseUrl, no key) → ready', () => {
    // Ollama/LM Studio ignore Authorization, so keySet stays false yet the
    // provider genuinely works — readiness must OR this path in too.
    applyConfig({ provider: 'openai-compat', baseUrl: 'http://localhost:11434/v1' });
    assert.equal(getPublicConfig().keySet, false, 'the local-model path must not be masked by a stored key');
    assert.equal(llmReady(), true);
  });

  it('keyless public openai-compat endpoint is not ready', () => {
    applyConfig({ provider: 'openai-compat', baseUrl: 'https://example.test/v1' });
    assert.equal(llmReady(), false);
  });

  it('runtime config key → ready only for openai-compat, never Gemini', () => {
    // Keep this last: applyConfig's private key store is intentionally
    // append-only for a live process, so a later test could not establish a
    // trustworthy keyless baseline.
    applyConfig({ provider: 'openai-compat', baseUrl: 'https://example.test/v1' }, { apiKey: 'cfg-key' });
    assert.equal(llmReady(), true);
    applyConfig({ provider: 'gemini' });
    assert.equal(llmReady(), false, 'an openai-compat key cannot make Gemini ready');
  });
});
