import { GoogleGenAI } from '@google/genai';
import type { GenerateContentParameters, GenerateContentResponse } from '@google/genai';
import { logger } from '../lib/logger.ts';
import { metrics } from '../lib/metrics.ts';

let _shared: GoogleGenAI | null = null;

export function getAI(): GoogleGenAI {
  if (!_shared) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) throw new Error('GEMINI_API_KEY environment variable is required');
    _shared = new GoogleGenAI({ apiKey: key });
  }
  return _shared;
}

// ── LLM provider seam ────────────────────────────────────────────────────────
// generateContent() delegates to the active provider rather than calling Gemini
// directly. This makes the engine's AI paths testable (swap in a mock provider)
// and leaves room for alternate LLM backends without touching call sites.
export interface LLMProvider {
  generate(params: GenerateContentParameters): Promise<GenerateContentResponse>;
}

const geminiProvider: LLMProvider = {
  generate: (params) => getAI().models.generateContent(params),
};

let _provider: LLMProvider = geminiProvider;

export function setLLMProvider(p: LLMProvider): void { _provider = p; }
export function resetLLMProvider(): void { _provider = geminiProvider; }

// Model tiering. High-volume per-turn calls (agent actions) can run on the
// fast tier to cut cost/latency; quality-critical calls stay on the pro tier.
// Override per tier with GEMINI_FAST_MODEL / GEMINI_MODEL.
export function getModel(tier: 'fast' | 'pro' = 'pro'): string {
  if (tier === 'fast') return process.env.GEMINI_FAST_MODEL ?? 'gemini-2.5-flash';
  return process.env.GEMINI_MODEL ?? 'gemini-2.5-pro';
}

// Returns the generation temperature to use for all Gemini calls.
// Set GEMINI_TEMPERATURE=0 in .env to get near-deterministic outputs.
// Defaults to 1.0 (Gemini default). Values outside 0–2 are clamped.
export function getTemperature(): number {
  const raw = parseFloat(process.env.GEMINI_TEMPERATURE ?? '');
  return isNaN(raw) ? 1.0 : Math.max(0, Math.min(2, raw));
}

// Wraps a promise with a hard deadline. Clears the timer on settle so Node can exit cleanly.
export function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`Gemini timeout (${ms}ms): ${label}`)),
      ms,
    );
    promise.then(
      (v) => { clearTimeout(timer); resolve(v); },
      (e) => { clearTimeout(timer); reject(e); },
    );
  });
}

const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

// A failure is transient (worth retrying) if it's a rate-limit, an upstream
// 5xx, a timeout, or a dropped connection. Bad-request / auth errors are not.
function isTransient(err: unknown): boolean {
  const msg = ((err as Error)?.message ?? String(err)).toLowerCase();
  const status = (err as { status?: number })?.status;
  if (status === 429 || status === 500 || status === 502 || status === 503 || status === 504) return true;
  return /\b(429|500|502|503|504)\b/.test(msg)
    || msg.includes('rate limit')
    || msg.includes('quota')
    || msg.includes('overloaded')
    || msg.includes('unavailable')
    || msg.includes('timeout')
    || msg.includes('econnreset')
    || msg.includes('etimedout')
    || msg.includes('socket hang up')
    || msg.includes('fetch failed');
}

// Retries a promise factory on transient failures with exponential backoff
// (500ms, 1s, 2s, … capped at 8s) plus jitter. The factory is re-invoked on
// each attempt so a fresh request is issued every time.
export async function withRetry<T>(
  factory: () => Promise<T>,
  label: string,
  maxAttempts = 3,
): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await factory();
    } catch (e) {
      lastErr = e;
      if (attempt >= maxAttempts || !isTransient(e)) throw e;
      metrics.recordAiRetry(label);
      const backoff = Math.min(8000, 500 * 2 ** (attempt - 1));
      const delay = backoff + Math.random() * 250;
      logger.warn('ai_retry', { label, attempt, maxAttempts, delayMs: Math.round(delay), error: (e as Error).message });
      await sleep(delay);
    }
  }
  throw lastErr;
}

// Convenience: a single Gemini generateContent call with both a hard timeout
// and transient-failure retry. Replaces the bare withTimeout(ai...generateContent())
// pattern at call sites so retry is applied uniformly.
export async function generateContent(
  params: GenerateContentParameters,
  opts: { label: string; timeoutMs?: number; maxAttempts?: number },
): Promise<GenerateContentResponse> {
  const { label, timeoutMs = 30_000, maxAttempts = 3 } = opts;
  const started = Date.now();
  let ok = false;
  let res: GenerateContentResponse | undefined;
  try {
    res = await withRetry(
      () => withTimeout(_provider.generate(params), timeoutMs, label),
      label,
      maxAttempts,
    );
    ok = true;
    return res;
  } finally {
    metrics.recordAiCall(
      label,
      Date.now() - started,
      ok,
      res ? (res as GenerateContentResponse & { usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number } }).usageMetadata : undefined,
    );
  }
}
