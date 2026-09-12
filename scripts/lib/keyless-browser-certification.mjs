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

/**
 * VERIFICATION-ONLY rate-limit headroom (2026-09-12, writer-loop review round 1,
 * item 1).
 *
 * The limiters in `server/lib/session-store.ts` key on `req.ip`, which is the
 * right identity for a writer and the wrong one for a gate: a suite drives every
 * phase, every browser context and its own `fetch` probes through one server
 * from 127.0.0.1, so it spends ONE client's minute across work that represents
 * many. Measured on `npm run verify:surfaces`: the feature-length phase's doctor
 * POST came back 429 because earlier phases had spent the 120/60 s window, and
 * 24 assertions never ran while the suite printed "218/218 passed".
 *
 * 10x, not "off": a runaway loop in a gate should still trip a ceiling. The
 * number is sized from the measurement in
 * `docs/audits/2026-09-12-adversarial/writer-lane-report.md` — the busiest
 * 60-second window of a full `verify:surfaces` run — with room for the phases a
 * future lane adds.
 *
 * This is the ONLY place in the repository that sets the variable.
 * `tests/core/rate-limit-verification-override.test.ts` asserts that, asserts
 * the default is the production number, and asserts no deployment path
 * (Dockerfile, docker-compose.yml, package.json scripts, .github/**, server/**,
 * src/**) mentions it.
 */
const VERIFICATION_RATE_LIMIT_MULTIPLIER = '10';

export function keylessBrowserServerEnv(parentEnv, port) {
  const env = {
    ...parentEnv,
    ...KEYLESS_OVERRIDES,
    VERIFY_RATE_LIMIT_MULTIPLIER: VERIFICATION_RATE_LIMIT_MULTIPLIER,
    PORT: String(port),
  };
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
