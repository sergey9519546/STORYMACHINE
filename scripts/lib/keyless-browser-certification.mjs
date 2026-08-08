// Shared contract for browser certifications: inherited developer/provider
// configuration must never make a P0/demo run capable of calling an LLM.

const KEYLESS_OVERRIDES = Object.freeze({
  GEMINI_API_KEY: '',
  OPENROUTER_API_KEY: '',
  OPENAI_API_KEY: '',
  ANTHROPIC_API_KEY: '',
  AI_PROVIDER: 'gemini',
  AI_BASE_URL: '',
  AI_API_KEY: '',
  AI_IMG_PROVIDER: 'none',
  AI_IMG_BASE_URL: '',
  AI_IMG_API_KEY: '',
  AI_TTS_PROVIDER: 'none',
  AI_TTS_BASE_URL: '',
  AI_TTS_API_KEY: '',
  AI_EMBEDDING_PROVIDER: 'none',
  AI_EMBEDDING_BASE_URL: '',
  AI_EMBEDDING_API_KEY: '',
});

export function keylessBrowserServerEnv(parentEnv, port) {
  const env = { ...parentEnv, ...KEYLESS_OVERRIDES, PORT: String(port) };
  // dotenv/config honors this flag before loading .env. It must be absent,
  // rather than the string "false", so the forced blank credentials above
  // cannot be overwritten by a developer's local provider configuration.
  delete env.DOTENV_CONFIG_OVERRIDE;
  return env;
}

export async function assertKeylessAiConfig(baseUrl, fetchImpl = fetch) {
  const response = await fetchImpl(new URL('/api/ai-config', baseUrl));
  if (!response.ok) {
    throw new Error(`keyless certification could not read /api/ai-config (HTTP ${response.status})`);
  }
  const config = await response.json();
  if (config?.llmReady !== false) {
    throw new Error('keyless certification requires /api/ai-config to report llmReady:false');
  }
  return config;
}
