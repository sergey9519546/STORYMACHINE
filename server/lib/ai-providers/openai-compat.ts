// Factory functions for OpenAI-compatible provider adapters.
// A single adapter covers any API that speaks the OpenAI REST dialect:
// OpenRouter, OpenAI, Groq, DeepSeek, Mistral, Together, Ollama, LM Studio, Azure, xAI, etc.

import type { GenerateContentParameters, GenerateContentResponse, Schema } from '@google/genai';
import type { EmbeddingProvider, ImageProvider, TTSProvider, LLMProvider } from '../../engine/ai.ts';
import { geminiSchemaToJsonSchema } from './schema.ts';
import { ssrfUnsafeUrlReason, isPrivateIp } from '../validation.ts';
// undici ships the global fetch's implementation; we import its fetch + Agent
// directly so we can pass a custom dispatcher that pins the TCP connect to the
// DNS-resolved, re-validated IP. (The GLOBAL fetch rejects a custom-connect
// Agent with `invalid onRequestStart method` in current Node — undici's own
// fetch accepts it. Same Response API surface as global fetch, so callers are
// unchanged.)
import { fetch as undiciFetch, Agent } from 'undici';
import net from 'node:net';
import tls from 'node:tls';
import dns from 'node:dns/promises';
import { logger } from '../logger.ts';

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
  // URL shape is always enforced. Development and the explicit production
  // override may allow private model servers, but neither may enable non-http
  // schemes, userinfo, or malformed targets.
  const reason = ssrfUnsafeUrlReason(baseURL, {
    allowPrivateNetworkTargets: !enforceFetchSiteGuard() || allowPrivateNetworkTargets(),
  });
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
// DNS rebinding — CLOSED at this fetch site. Every hop is resolved with the
// shared resolveHost() below (production default: node:dns/promises lookup),
// each resolved address is re-checked against the SAME private-IP policy the
// literal guard uses (server/lib/validation.ts isPrivateIp), and the TCP
// connect is PINNED to a validated IP via a per-hop undici Agent whose connect
// function dials the resolved address. The Host header and TLS SNI stay bound
// to the URL hostname (undici derives them from the URL), so a hostname that
// resolves public at validation time but is repointed to a private IP before
// connect cannot redirect the socket — the pin was set against the
// re-validated resolution, and a mid-flight DNS change has no effect.
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

// ── DNS resolver + IP-pin test seam ──────────────────────────────────────────
// resolveHost is the stubbable seam: production resolves via node:dns/promises
// lookup({ all: true }); tests inject a deterministic resolver so rebinding /
// NXDOMAIN / re-pin cases never depend on real external DNS or monkeypatch
// Node globals. resolvePort lets a test pin a hop to a specific port (e.g. a
// loopback mock); production leaves it undefined so the URL's own port is used.
export type ResolvedAddress = { address: string; family: number };
export type ResolveHost = (hostname: string) => Promise<ResolvedAddress[]>;
export type ResolvePort = (hostname: string) => Promise<number | undefined>;
// Test seam: the IP to actually DIAL, which may differ from the validated IP
// returned by resolveHost (e.g. a test validates a PUBLIC hostname but routes
// the socket to a loopback mock). Production leaves this undefined and the
// validated IP from resolveHost is the dial target (validated == dialed).
export type ResolveDialTarget = (hostname: string) => Promise<ResolvedAddress | undefined>;

async function defaultResolveHost(hostname: string): Promise<ResolvedAddress[]> {
  // { all: true } returns every A/AAAA record; we validate EACH — a hostname
  // that returns a mix of public + private addresses must fail closed.
  const records = await dns.lookup(hostname, { all: true });
  return records.map(r => ({ address: r.address, family: r.family }));
}

/**
 * Resolve a hostname, validate EVERY resolved IP against the shared private-IP
 * policy, and return the first validated public (or override-allowed private)
 * address to pin the connect to. Throws the same shape of error
 * assertFetchTargetSafe throws when ANY resolved IP is private and the
 * production gate is active without the override; throws on NXDOMAIN/lookup
 * failure. Never falls back to letting the transport re-resolve.
 */
async function resolveAndValidateHost(
  hostname: string,
  resolveHost: ResolveHost,
): Promise<ResolvedAddress> {
  let records: ResolvedAddress[];
  try {
    records = await resolveHost(hostname);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`Refusing outbound AI-provider request: DNS resolution failed for ${hostname} (${msg})`);
  }
  if (!Array.isArray(records) || records.length === 0) {
    throw new Error(`Refusing outbound AI-provider request: DNS resolution returned no addresses for ${hostname} (NXDOMAIN)`);
  }
  // Check every resolved address — a single private address in the set is a
  // rebinding signal and must fail closed even when other addresses are public.
  const rejectPrivate = enforceFetchSiteGuard() && !allowPrivateNetworkTargets();
  for (const rec of records) {
    if (isPrivateIp(rec.address)) {
      if (rejectPrivate) {
        throw new Error(`Refusing outbound AI-provider request: ${hostname} resolves to a private/loopback/reserved address (${rec.address})`);
      }
      // Override / dev: allowed, but we still surface it for traceability.
      logger.warn('ai-provider-resolve-private-allowed', {
        hostname,
        address: rec.address,
        override: true,
      });
    }
  }
  // Pin to the first resolved address (the resolver order is the OS's
  // preference). Both public and override-allowed-private addresses are valid
  // pin targets here; the private ones were already policy-checked above.
  return records[0];
}

/**
 * Build a fresh undici Agent whose connect function pins the TCP dial to a
 * specific IP, preserving the URL's hostname for the Host header and TLS SNI.
 * One Agent per request keeps the pin bound to that request's resolution.
 *
 * `dialPortOverride` is a test-only seam: when set, the socket dials that port
 * instead of the URL's port (so a loopback mock on an ephemeral port can be
 * reached while the URL host/port — and thus the Host header and origin
 * tracking — stay intact). Production leaves it undefined and the URL port is
 * used.
 *
 * TLS: for https:// URLs the raw TCP socket to the pinned IP is wrapped with
 * tls.connect using servername = the URL hostname (options.hostname). That
 * keeps SNI bound to the original host AND keeps certificate verification
 * against the hostname — NOT the pinned IP — so HTTPS integrity is unchanged.
 */
function pinnedAgentFor(ip: ResolvedAddress, dialPortOverride?: number): Agent {
  return new Agent({
    connect: (options, callback) => {
      const urlPort = typeof options.port === 'number' ? options.port : Number(options.port);
      const dialPort = typeof dialPortOverride === 'number' ? dialPortOverride : urlPort;
      const dialOpts: net.TcpNetConnectOpts = {
        host: ip.address,
        family: ip.family,
        port: dialPort,
      };
      const raw = net.connect(dialOpts);
      let settled = false;
      const fail = (err: Error): void => {
        if (!settled) { settled = true; callback(err, null); }
        raw.destroy();
      };
      raw.once('connect', () => {
        if (options.protocol === 'https:') {
          // Wrap the pinned plain socket in TLS with SNI/cert-verification
          // bound to the URL hostname — never the pinned IP. Default
          // rejectUnauthorized (true) keeps production cert validation intact.
          const tlsSock = tls.connect({
            socket: raw,
            servername: options.servername || options.hostname,
          });
          tlsSock.once('secureConnect', () => {
            if (!settled) { settled = true; callback(null, tlsSock); }
          });
          tlsSock.once('error', fail);
        } else {
          if (!settled) { settled = true; callback(null, raw); }
        }
      });
      raw.once('error', fail);
    },
  });
}

/**
 * fetch() with manual redirect handling, per-hop SSRF revalidation, AND per-hop
 * DNS resolve-and-pin (closes DNS rebinding). Exported for unit tests that
 * exercise redirect chains and the resolver directly.
 */
export async function fetchOpenAICompat(
  url: string,
  init: RequestInit = {},
  opts: {
    maxRedirects?: number;
    resolveHost?: ResolveHost;
    resolvePort?: ResolvePort;
    resolveDialTarget?: ResolveDialTarget;
  } = {},
): Promise<Response> {
  const maxRedirects = opts.maxRedirects ?? DEFAULT_MAX_REDIRECTS;
  if (!Number.isInteger(maxRedirects) || maxRedirects < 0) {
    throw new Error('OpenAI-compat maxRedirects must be a non-negative integer');
  }
  const resolveHost = opts.resolveHost ?? defaultResolveHost;
  const resolvePort = opts.resolvePort ?? (async () => undefined);
  const resolveDialTarget = opts.resolveDialTarget ?? (async () => undefined);

  let currentUrl = url;
  // Clone once so body/method stay available across same-origin hops. Request
  // bodies may be streams; our adapters always pass a string body, so re-use
  // is safe.
  const baseInit: RequestInit = { ...init, redirect: 'manual' };
  const originalHeaders = toHeaders(init.headers);
  assertFetchTargetSafe(currentUrl);
  const startOrigin = originKey(new URL(currentUrl));

  for (let hop = 0; hop <= maxRedirects; hop++) {
    assertFetchTargetSafe(currentUrl);

    const headers = toHeaders(originalHeaders);
    // Strip credentials when the hop leaves the original origin — never hand
    // the API key to an attacker-controlled redirect target.
    if (originKey(new URL(currentUrl)) !== startOrigin) {
      headers.delete('Authorization');
    }

    // Resolve + validate + pin the connect for THIS hop. A redirect to a new
    // hostname gets its own resolution and IP validation (re-pin on redirect).
    const hopUrl = new URL(currentUrl);
    const pinnedAddr = await resolveAndValidateHost(hopUrl.hostname, resolveHost);
    // The dial target is normally the validated IP (validated == dialed). The
    // resolveDialTarget seam lets a test route the socket elsewhere (e.g. a
    // loopback mock) WITHOUT weakening the validation above.
    const dialTarget = (await resolveDialTarget(hopUrl.hostname)) ?? pinnedAddr;
    // Test seam: let a test point the DIAL port at a controlled mock port
    // without changing the URL (so Host header + origin tracking stay honest).
    const dialPortOverride = await resolvePort(hopUrl.hostname);
    const agent = pinnedAgentFor(dialTarget, typeof dialPortOverride === 'number' ? dialPortOverride : undefined);

    // undici's fetch accepts a `dispatcher` option (global RequestInit does
    // not). Its Response/RequestInit types differ from lib.dom's only in
    // ReadableStream generic params, so we type the call through undici's own
    // RequestInit and cast the result back to the global Response the callers
    // (and this function's signature) expect — they are structurally identical
    // at runtime.
    let res: Response;
    try {
      const undiciRes = await undiciFetch(currentUrl, {
        ...baseInit,
        headers,
        dispatcher: agent,
      } as unknown as Parameters<typeof undiciFetch>[1]);
      res = undiciRes as unknown as Response;
    } finally {
      // Release the per-request connection pool promptly so a fresh pin is
      // used every hop (and so tests don't leak sockets across cases).
      agent.close().catch(() => { /* best effort */ });
    }

    if (!isRedirectStatus(res.status)) return res;
    await res.body?.cancel().catch(() => { /* best effort: release redirect connection */ });

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
    const crossesOrigin = originKey(next) !== prevOrigin;
    if (crossesOrigin && !allowPrivateNetworkTargets()) {
      const reason = ssrfUnsafeUrlReason(nextUrl);
      if (reason) {
        throw new Error(`Refusing OpenAI-compat redirect to ${nextUrl}: ${reason}`);
      }
    }

    const method = (baseInit.method ?? 'GET').toUpperCase();
    const switchesToGet =
      (res.status === 303 && method !== 'GET' && method !== 'HEAD') ||
      ((res.status === 301 || res.status === 302) && method === 'POST');

    // Never forward prompt/input bodies across origins on a body-preserving
    // redirect. Authorization stripping alone would still disclose user data.
    if (crossesOrigin && baseInit.body != null && !switchesToGet) {
      throw new Error(`Refusing OpenAI-compat cross-origin ${res.status} redirect with request body to ${nextUrl}`);
    }

    // Match Fetch semantics for POST 301/302 and non-GET/HEAD 303 redirects.
    if (switchesToGet) {
      baseInit.method = 'GET';
      delete baseInit.body;
      originalHeaders.delete('Content-Type');
      originalHeaders.delete('Content-Length');
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
      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        throw new Error(`OpenAI-compat embedding error ${res.status}: ${errText}`);
      }
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
