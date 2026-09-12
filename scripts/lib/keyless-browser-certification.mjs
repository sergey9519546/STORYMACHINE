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
 * item 1; scoped to browser gates only, round-2 follow-up item 1).
 *
 * The limiters in `server/lib/session-store.ts` key on `req.ip`, which is the
 * right identity for a writer and the wrong one for a BROWSER GATE: a suite
 * drives every phase, every browser context and its own `fetch` probes through
 * one server from 127.0.0.1, so it spends ONE client's minute across work that
 * represents many. Measured on `npm run verify:surfaces`: the feature-length
 * phase's doctor POST came back 429 because earlier phases had spent the
 * 120/60 s window, and 24 assertions never ran while the suite printed
 * "218/218 passed".
 *
 * 10x, not "off": a runaway loop in a gate should still trip a ceiling. The
 * number is sized from the measurement in
 * `docs/audits/2026-09-12-adversarial/writer-lane-report.md` — the busiest
 * 60-second window of a full `verify:surfaces` run — with room for the phases a
 * future lane adds.
 *
 * NOT every keyless caller wants this headroom. `scripts/fuzz-routes.mjs`,
 * `scripts/verify-production-build.mjs` and `scripts/load-test-doctor.mjs`
 * each boot a keyless server specifically to measure how the PRODUCTION
 * limiter behaves under load (a 200-concurrent-request attack case, a real
 * Dockerfile-shaped boot, a doctor-pool latency run) — multiplying their
 * ceiling to 1200/min silently turned "measure the limiter" into "measure a
 * server the product never runs": the fuzzer's 200-concurrent-doctor-requests
 * case recorded 0 429s at any concurrency below 1200, and the production
 * verifier's real Dockerfile-shaped boot never saw its own ceiling either.
 * Those three callers pass `{ productionRateLimit: true }` to opt OUT of the
 * multiplier and keep the real 120/20/10-per-minute ceilings; every other
 * (browser-suite) caller gets the multiplier by default.
 *
 * This is the ONLY place in the repository that sets the variable.
 * `tests/core/rate-limit-verification-override.test.ts` asserts that, asserts
 * the default is the production number, asserts the three non-browser callers
 * opt out, and asserts no deployment path (Dockerfile, docker-compose.yml,
 * package.json scripts, .github/**, server/**, src/**) mentions it.
 */
const VERIFICATION_RATE_LIMIT_MULTIPLIER = '10';

export function keylessBrowserServerEnv(parentEnv, port, { productionRateLimit = false } = {}) {
  const env = {
    ...parentEnv,
    ...KEYLESS_OVERRIDES,
    // Browser gates (the default) get the verification-only headroom above;
    // the three callers measuring the production limiter itself pass
    // productionRateLimit: true and get the real ceiling instead — see the
    // doc comment above VERIFICATION_RATE_LIMIT_MULTIPLIER.
    ...(productionRateLimit ? {} : { VERIFY_RATE_LIMIT_MULTIPLIER: VERIFICATION_RATE_LIMIT_MULTIPLIER }),
    PORT: String(port),
  };
  if (productionRateLimit) delete env.VERIFY_RATE_LIMIT_MULTIPLIER;
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
