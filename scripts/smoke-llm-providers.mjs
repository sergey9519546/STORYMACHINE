#!/usr/bin/env node
// smoke-llm-providers.mjs — Lane G, Part 2.1: the maintainer command for
// "the day keys exist."
//
// The server boots keyless by design — analysis-only mode is the product's
// front door (server.ts's own header comment; CLAUDE.md's gotchas). The
// AI-assisted paths have, until now, only ever been exercised against
// in-test mocks. This script is the first thing that actually calls a real
// LLM provider, end to end, through the real server process and the real
// .env — so a maintainer who just added a key can find out, in one command,
// whether the multi-provider readiness plumbing (server/lib/ai-config.ts's
// llmReady()) actually works against a live upstream, not just in tests.
//
// What it does:
//   1. Boots the real server (server.ts, unmodified — same file `npm run
//      dev` runs) on an isolated port. server.ts's own `import 'dotenv/
//      config'` loads the repo's real .env, exactly like a normal boot.
//   2. Calls GET /api/ai-config and reports llmReady plus WHICH source is
//      live — boolean flags and the provider name ONLY. It never reads,
//      holds, or prints a key value, not even a prefix or length: this
//      script's own process does not import a key into a variable it might
//      accidentally log (see detectConfiguredSources() below — presence
//      booleans only, the parsed .env object is discarded immediately).
//   3. For each source detected as configured in the real .env
//      (GEMINI_API_KEY, or AI_PROVIDER=openai-compat + AI_BASE_URL), boots
//      a FRESH isolated server instance with AI_PROVIDER forced to that
//      provider, and fires ONE real round trip through
//      POST /api/ai-config/test.
//
// Why POST /api/ai-config/test is "the cheapest-possible real LLM route":
// it is server/routes/config.ts's existing connection-test endpoint — the
// same one the Settings UI already calls to verify credentials. Its prompt
// is a fixed 5-word string ("Reply with the single word: OK"), it caps
// maxOutputTokens at 8, temperature 0, and it is the ONLY route in this
// codebase whose entire purpose is "make one minimal real call and report
// pass/fail." Every other AI-triggering route (outline generation, scene
// rewrites, interview voices, ...) does substantively more work and costs
// more per call for the exact same yes/no signal this script needs.
// aiLimiter (20 req/min) still applies — this script fires one request per
// configured provider, nowhere near that ceiling.
//
// Keyless is a SUPPORTED state, not a failure (server.ts's own comment:
// "the deterministic half of the product... is the product's front door").
// With nothing configured, this exits 0.
//
// Usage (from the repo root):
//   node scripts/smoke-llm-providers.mjs
//
// Exit codes: 0 = keyless (nothing to smoke) OR every configured provider's
// round trip passed. 1 = at least one configured provider's round trip
// failed, or the server failed to boot.

import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';

const REPO = process.cwd();
const BOOT_TIMEOUT_MS = 30_000;

function pickFreePort() {
  return new Promise((resolve, reject) => {
    const s = createServer();
    s.unref();
    s.on('error', reject);
    s.listen(0, '127.0.0.1', () => {
      const { port } = s.address();
      s.close(() => resolve(port));
    });
  });
}

// Reads the real .env (if present) into a local object ONLY to answer
// presence questions ("is a key configured?") and, for AI-provider-mutating
// admin routes, to supply ADMIN_TOKEN's *value* as a request header. The
// object never leaves this function's callers' hands except as that one
// header value, and nothing derived from it is ever passed to console.log
// / console.error / console.warn anywhere in this file.
function readRealEnv() {
  const envPath = path.join(REPO, '.env');
  if (!existsSync(envPath)) return {};
  try {
    return dotenv.parse(readFileSync(envPath, 'utf8'));
  } catch {
    return {};
  }
}

function detectConfiguredSources(env) {
  const hasGeminiEnvKey = Boolean(env.GEMINI_API_KEY);
  const hasOpenAiCompatEnvConfig =
    env.AI_PROVIDER === 'openai-compat' && Boolean(env.AI_BASE_URL);
  return { hasGeminiEnvKey, hasOpenAiCompatEnvConfig };
}

// Boots server.ts (unmodified) on an isolated port with the given env
// override layered on top of this script's own inherited env — server.ts's
// `import 'dotenv/config'` fills in everything else from the real .env,
// exactly as a normal `npm run dev` boot would, because dotenv does not
// overwrite an env var that's already set (the override wins; every other
// real .env value still applies).
async function bootServer(envOverride = {}) {
  const port = await pickFreePort();
  const proc = spawn(process.execPath, ['--experimental-strip-types', 'server.ts'], {
    cwd: REPO,
    env: { ...process.env, PORT: String(port), ...envOverride },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let booted = false;
  const bootTimeout = new Promise((_, rej) =>
    setTimeout(() => rej(new Error('server boot timeout (30s)')), BOOT_TIMEOUT_MS));
  const bootReady = new Promise((resolve) => {
    let buf = '';
    const onData = (d) => { buf += d; if (buf.includes('server_started')) { booted = true; resolve(); } };
    proc.stdout.on('data', onData);
    proc.stderr.on('data', onData);
  });
  try {
    await Promise.race([bootReady, bootTimeout]);
  } catch (e) {
    proc.kill('SIGKILL');
    throw new Error(`server did not report server_started: ${e.message}`);
  }
  if (!booted) {
    proc.kill('SIGKILL');
    throw new Error('server exited without emitting server_started');
  }

  return {
    baseUrl: `http://127.0.0.1:${port}`,
    stop: () => new Promise((resolve) => {
      proc.once('exit', () => resolve());
      proc.kill('SIGTERM');
      setTimeout(() => { if (!proc.killed) proc.kill('SIGKILL'); }, 2000).unref();
    }),
  };
}

// One round trip against a freshly-booted, single-provider-forced server:
// confirm llmReady, then fire POST /api/ai-config/test and time it.
async function roundTripFor(providerLabel, envOverride, adminToken) {
  const server = await bootServer(envOverride);
  try {
    const cfgRes = await fetch(`${server.baseUrl}/api/ai-config`);
    const cfg = await cfgRes.json();
    if (!cfg.llmReady) {
      return {
        provider: providerLabel,
        ok: false,
        latencyMs: null,
        detail: `llmReady=false after forcing AI_PROVIDER=${providerLabel} — the .env source that looked configured did not actually make the server ready; nothing was exercised.`,
      };
    }

    const headers = { 'Content-Type': 'application/json' };
    if (adminToken) headers.Authorization = `Bearer ${adminToken}`;

    const t0 = performance.now();
    const testRes = await fetch(`${server.baseUrl}/api/ai-config/test`, {
      method: 'POST',
      headers,
      body: '{}',
    });
    const latencyMs = Math.round(performance.now() - t0);
    const body = await testRes.json().catch(() => ({}));

    if (testRes.status === 401) {
      return {
        provider: providerLabel,
        ok: false,
        latencyMs,
        detail: 'POST /api/ai-config/test returned 401 — set ADMIN_TOKEN in the environment this script runs in (matching the real .env) if the server requires it, or run this script from the same host so the loopback default applies.',
      };
    }

    return {
      provider: providerLabel,
      ok: testRes.status === 200 && body.ok === true,
      latencyMs,
      // body.error, when present, is already sanitized by
      // server/lib/safe-error.ts's sanitizeExternalError() before it ever
      // reaches this response (server/routes/config.ts's /api/ai-config/test
      // handler) — safe to print as-is; it is never key material.
      detail: body.ok ? `response: "${body.response ?? ''}"` : (body.error ?? `HTTP ${testRes.status}`),
    };
  } finally {
    await server.stop();
  }
}

async function main() {
  const env = readRealEnv();
  const adminToken = env.ADMIN_TOKEN; // used only as a header value below, never printed
  const { hasGeminiEnvKey, hasOpenAiCompatEnvConfig } = detectConfiguredSources(env);

  // 1. Baseline: boot with the real, unmodified .env and report what it
  //    resolves to naturally (no AI_PROVIDER override).
  console.log('[smoke] booting server with the real .env (no overrides)...');
  const baseline = await bootServer();
  let baselineCfg;
  try {
    const res = await fetch(`${baseline.baseUrl}/api/ai-config`);
    baselineCfg = await res.json();
  } finally {
    await baseline.stop();
  }
  console.log(
    `[smoke] GET /api/ai-config -> llmReady=${baselineCfg.llmReady} provider=${baselineCfg.provider} ` +
    `keySet=${baselineCfg.keySet} imgKeySet=${baselineCfg.imgKeySet} ttsKeySet=${baselineCfg.ttsKeySet} embKeySet=${baselineCfg.embKeySet}`
  );

  if (!hasGeminiEnvKey && !hasOpenAiCompatEnvConfig) {
    console.log('[smoke] keyless — analysis-only mode, nothing to smoke.');
    process.exit(0);
  }

  // 2. One isolated round trip per configured source, each with its own
  //    freshly-booted server so the two sources (env GEMINI_API_KEY vs. the
  //    multi-provider AI_PROVIDER=openai-compat config) can never mask or
  //    interfere with each other — directly exercising CLAUDE.md's
  //    documented "checking only one is a recurring trap" by checking both,
  //    independently, when both are configured.
  const results = [];
  if (hasGeminiEnvKey) {
    console.log('[smoke] testing source: env GEMINI_API_KEY (forcing AI_PROVIDER=gemini)...');
    results.push(await roundTripFor('gemini', { AI_PROVIDER: 'gemini' }, adminToken));
  }
  if (hasOpenAiCompatEnvConfig) {
    console.log('[smoke] testing source: multi-provider config (forcing AI_PROVIDER=openai-compat)...');
    results.push(await roundTripFor('openai-compat', { AI_PROVIDER: 'openai-compat' }, adminToken));
  }

  console.log('\n[smoke] results:');
  for (const r of results) {
    const status = r.ok ? 'PASS' : 'FAIL';
    const latency = r.latencyMs === null ? 'n/a' : `${r.latencyMs}ms`;
    console.log(`  ${status}  provider=${r.provider}  latency=${latency}  ${r.detail}`);
  }

  const anyFailed = results.some((r) => !r.ok);
  console.log(anyFailed ? '\n[smoke] FAIL — see above.' : '\n[smoke] PASS — every configured provider round-tripped.');
  process.exit(anyFailed ? 1 : 0);
}

main().catch((e) => {
  console.error(`[smoke] FAIL — ${e.message}`);
  process.exit(1);
});
