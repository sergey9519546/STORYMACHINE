// Factory functions for OpenAI-compatible provider adapters.
// A single adapter covers any API that speaks the OpenAI REST dialect:
// OpenRouter, OpenAI, Groq, DeepSeek, Mistral, Together, Ollama, LM Studio, Azure, xAI, etc.

import type { GenerateContentParameters, GenerateContentResponse, Schema } from '@google/genai';
import type { EmbeddingProvider, ImageProvider, TTSProvider, LLMProvider } from '../../engine/ai.ts';
import { geminiSchemaToJsonSchema } from './schema.ts';
import { ssrfUnsafeUrlReason } from '../validation.ts';

// ── Belt-and-suspenders SSRF guard (audit finding S1-a-1) ───────────────────
// server/lib/validation.ts's AiConfigSchema already rejects a private/
// loopback/link-local/metadata baseUrl at the POST /api/ai-config boundary —
// that's the primary fix, closing the anonymous-caller attack path. This is
// the second checkpoint, re-checked right here at the actual fetch site, so
// the protection holds even if a baseURL reaches this adapter through a path
// that bypasses that schema entirely — the clearest example being
// server/lib/ai-config.ts's initFromEnv(), which reads AI_BASE_URL/
// AI_IMG_BASE_URL/AI_TTS_BASE_URL/AI_EMBEDDING_BASE_URL straight from
// process.env with no zod validation at all.
//
// Scoped to NODE_ENV==='production', same convention server/app.ts already
// uses for its own environment-gated hardening (its production-only CSP) and
// server/routes/collab.ts now uses for its COLLAB_SECRET gate. Two reasons:
//   1. Self-hosted deployments that intentionally point at a LOCAL model
//      server (Ollama, LM Studio — both commonly run on localhost/RFC1918,
//      and both are explicitly-supported targets per this file's header
//      comment) need an escape hatch; AI_ALLOW_PRIVATE_NETWORK_TARGETS=true
//      is that hatch for a production deployment, but development/test runs
//      should never need to set it just to talk to a local mock server —
//      and this codebase's own test suite (tests/core/core-01.test.ts and
//      siblings) does exactly that, spinning up real loopback HTTP servers
//      to exercise this adapter.
//   2. The primary fix — AiConfigSchema's SSRF refinement — already blocks
//      the actual anonymous-caller attack path (POST /api/ai-config) in
//      EVERY environment, dev included, because zod validation isn't
//      environment-gated. This fetch-site check is purely the second,
//      defense-in-depth checkpoint for paths that bypass that schema
//      (chiefly env-var-sourced config — see below) — it's acceptable, not
//      a silent hole, for that second checkpoint to apply where it matters
//      most: a real deployment.
// Self-hosted production deployments that intentionally point at a LOCAL
// model server must opt in explicitly via AI_ALLOW_PRIVATE_NETWORK_TARGETS=
// true — see .env.example for the flag.
// Read at call time (not module load) so tests / ops can toggle the flag
// without re-importing this module.
function allowPrivateNetworkTargets(): boolean {
  return process.env.AI_ALLOW_PRIVATE_NETWORK_TARGETS === 'true';
}
function enforceFetchSiteGuard(): boolean {
  return process.env.NODE_ENV === 'production';
}

function assertFetchTargetSafe(baseURL: string): void {
  if (!enforceFetchSiteGuard() || allowPrivateNetworkTargets()) return;
  const reason = ssrfUnsafeUrlReason(baseURL);
  if (reason) {
    throw new Error(`Refusing outbound AI-provider request: baseUrl ${reason}`);
  }
}

// ── Redirect-safe fetch (audit finding: open redirect SSRF) ───────────────────
// Node's fetch() follows redirects by default WITHOUT re-running the baseURL
// SSRF check above. A permitted public provider URL can 302 to 127.0.0.1 /
// 169.254.169.254 / RFC1918 and the server would still connect with its own
// network identity (and, worse, forward the Authorization header).
//
// This helper:
//   1. Uses redirect:'manual' so every hop is explicit.
//   2. Re-validates each hop via assertFetchTargetSafe (same production policy
//      as the initial baseURL check).
//   3. Never forwards Authorization across origins (scheme/host/port change).
//   4. Caps the hop chain (default 3).
//
// Residual gap (unchanged, documented in validation.ts): this is still a
// literal-form host check, not DNS-pinning. A hostname that resolves public at
// validation time can be repointed to a private IP before the TCP connect.
// Full closure needs resolve-and-pin at the connection layer — out of scope here.
const DEFAULT_MAX_REDIRECTS = 3;

function originKey(u: URL): string {
  const port = u.port || (u.protocol === 'https:' ? '443' : u.protocol === 'http:' ? '80' : '');
  return `${u.protocol}//${u.hostname.toLowerCase()}:${port}`;
}

function isRedirectStatus(status: number): boolean {
  return status === 301 || status === 302 || status === 303 || status === 307 || status === 308;
}

/** Normalize HeadersInit into a mutable Headers so we can strip Authorization. */
function toHeaders(init?: HeadersInit): Headers {
  return new Headers(init ?? undefined);
}

/**
 * fetch() with manual redirect handling and per-hop SSRF revalidation.
 * Exported for unit tests that exercise redirect chains directly.
 */
export async function fetchOpenAICompat(
  url: string,
  init: RequestInit = {},
  opts: { maxRedirects?: number } = {},
): Promise<Response> {
  const maxRedirects = opts.maxRedirects ?? DEFAULT_MAX_REDIRECTS;
  let currentUrl = url;
  // Clone once so body/method stay available across same-origin hops. Request
  // bodies may be streams; our adapters always pass a string body, so re-use
  // is safe.
  const baseInit: RequestInit = { ...init, redirect: 'manual' };
  const originalHeaders = toHeaders(init.headers);
  const startOrigin = originKey(new URL(currentUrl));

  for (let hop = 0; hop <= maxRedirects; hop++) {
    assertFetchTargetSafe(currentUrl);

    const headers = toHeaders(originalHeaders);
    // Strip credentials when the hop leaves the original origin — never hand
    // the API key to an attacker-controlled redirect target.
    if (originKey(new URL(currentUrl)) !== startOrigin) {
      headers.delete('Authorization');
    }

    const res = await fetch(currentUrl, { ...baseInit, headers });
    if (!isRedirectStatus(res.status)) return res;

    if (hop === maxRedirects) {
      throw new Error(`OpenAI-compat redirect limit (${maxRedirects}) exceeded starting from ${url}`);
    }

    const location = res.headers.get('location');
    if (!location) {
      throw new Error(`OpenAI-compat redirect missing Location header (HTTP ${res.status}) from ${currentUrl}`);
    }

    let next: URL;
    try {
      next = new URL(location, currentUrl);
    } catch {
      throw new Error(`OpenAI-compat redirect has invalid Location: ${location}`);
    }

    const nextUrl = next.toString();
    // Production gate (same as initial baseURL).
    assertFetchTargetSafe(nextUrl);
    // Cross-origin hops are revalidated with the literal SSRF guard even in
    // dev/test: a same-host loopback mock may still redirect to itself (dev
    // Ollama/LM Studio / unit tests), but a public origin pivoting to
    // 127.0.0.1 / 169.254.169.254 / RFC1918 is never intentional.
    const prevOrigin = originKey(new URL(currentUrl));
    if (originKey(next) !== prevOrigin && !allowPrivateNetworkTargets()) {
      const reason = ssrfUnsafeUrlReason(nextUrl);
      if (reason) {
        throw new Error(`Refusing OpenAI-compat redirect to ${nextUrl}: ${reason}`);
      }
    }

    // 303 switches method to GET and drops the body per fetch semantics.
    if (res.status === 303) {
      baseInit.method = 'GET';
      delete baseInit.body;
    }

    currentUrl = nextUrl;
  }

  throw new Error(`OpenAI-compat redirect limit (${maxRedirects}) exceeded starting from ${url}`);
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function extractText(c: unknown): string {
  if (typeof c === 'string') return c;
  const obj = c as { parts?: Array<{ text?: string }>; text?: string };
  if (obj.parts) return obj.parts.map(p => p.text ?? '').join('');
  return obj.text ?? '';
}

function buildMessages(
  params: GenerateContentParameters,
): Array<{ role: string; content: string }> {
  const msgs: Array<{ role: string; content: string }> = [];

  const sys = params.config?.systemInstruction;
  if (sys) {
    const text = extractText(sys);
    if (text) msgs.push({ role: 'system', content: text });
  }

  const contents = params.contents;
  if (Array.isArray(contents)) {
    for (const c of contents) {
      const text = extractText(c);
      const role = (c as { role?: string }).role ?? 'user';
      if (text) msgs.push({ role: role === 'model' ? 'assistant' : role, content: text });
    }
  } else {
    const text = extractText(contents);
    if (text) msgs.push({ role: 'user', content: text });
  }

  return msgs;
}

// ── LLM adapter ──────────────────────────────────────────────────────────────
// Uses params.model as the model name — set AI_MODEL / AI_FAST_MODEL so that
// getModel() returns the right OpenAI-compat model name at call sites.

export function makeOpenAICompatLLMProvider(cfg: {
  baseURL: string;
  apiKey: string;
}): LLMProvider {
  return {
    generate: async (params: GenerateContentParameters): Promise<GenerateContentResponse> => {
      const messages = buildMessages(params);
      const body: Record<string, unknown> = { model: params.model, messages };

      if (
        params.config?.responseMimeType === 'application/json' &&
        params.config?.responseSchema
      ) {
        body.response_format = {
          type: 'json_schema',
          json_schema: {
            name: 'response',
            strict: false, // not universally supported
            schema: geminiSchemaToJsonSchema(params.config.responseSchema as Schema),
          },
        };
      }

      if (params.config?.temperature != null) {
        body.temperature = params.config.temperature;
      }

      const res = await fetchOpenAICompat(`${cfg.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${cfg.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        throw new Error(`OpenAI-compat LLM error ${res.status}: ${errText}`);
      }

      const data = await res.json() as {
        choices?: Array<{ message?: { content?: string } }>;
        usage?: { prompt_tokens?: number; completion_tokens?: number };
      };

      return {
        text: data.choices?.[0]?.message?.content ?? '',
        usageMetadata: {
          promptTokenCount:     data.usage?.prompt_tokens     ?? 0,
          candidatesTokenCount: data.usage?.completion_tokens ?? 0,
        },
      } as unknown as GenerateContentResponse;
    },
  };
}

// ── Embedding adapter ─────────────────────────────────────────────────────────

export function makeOpenAICompatEmbeddingProvider(cfg: {
  baseURL: string;
  apiKey: string;
  model: string;
}): EmbeddingProvider {
  return {
    embed: async (text: string): Promise<number[]> => {
      const res = await fetchOpenAICompat(`${cfg.baseURL}/embeddings`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${cfg.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ model: cfg.model, input: text }),
      });
      if (!res.ok) return [];
      const data = await res.json() as { data?: Array<{ embedding?: number[] }> };
      return data.data?.[0]?.embedding ?? [];
    },
  };
}

// ── Image adapter ─────────────────────────────────────────────────────────────

export function makeOpenAICompatImageProvider(cfg: {
  baseURL: string;
  apiKey: string;
  model: string;
}): ImageProvider {
  return {
    generate: async (prompt: string): Promise<string | undefined> => {
      const res = await fetchOpenAICompat(`${cfg.baseURL}/images/generations`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${cfg.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: cfg.model,
          prompt,
          n: 1,
          size: '1792x1024',
          response_format: 'b64_json',
        }),
      });
      if (!res.ok) return undefined;
      const data = await res.json() as { data?: Array<{ b64_json?: string }> };
      const b64 = data.data?.[0]?.b64_json;
      return b64 ? `data:image/png;base64,${b64}` : undefined;
    },
  };
}

// ── TTS adapter ───────────────────────────────────────────────────────────────

export function makeOpenAICompatTTSProvider(cfg: {
  baseURL: string;
  apiKey: string;
  model: string;
  voice?: string;
}): TTSProvider {
  return {
    speak: async (text: string): Promise<{ dataUrl: string; mimeType: string } | undefined> => {
      if (!text) return undefined;
      const res = await fetchOpenAICompat(`${cfg.baseURL}/audio/speech`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${cfg.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: cfg.model,
          input: text,
          voice: cfg.voice ?? 'alloy',
          response_format: 'mp3',
        }),
      });
      if (!res.ok) return undefined;
      const buf = Buffer.from(await res.arrayBuffer());
      return {
        dataUrl: `data:audio/mpeg;base64,${buf.toString('base64')}`,
        mimeType: 'audio/mpeg',
      };
    },
  };
}
