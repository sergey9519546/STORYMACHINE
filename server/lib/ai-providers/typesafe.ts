// TypeSafe System One adapter — "select instead of generate".
//
// WHAT THIS IS. A minimal client for `POST https://api.typesafe.ai/v1/systemone`,
// an API that does not write text: it answers a fixed set of CLOSED questions
// about a piece of state — a choice from an enumerated set, a score on an
// ordered ladder of level descriptions, or a short noun phrase — and returns a
// confidence with each answer. Its whole value to this repository is that a
// caller can ask "which of THESE cast members is this invented name?" and get
// back an option it supplied itself, rather than a sentence it then has to
// parse and trust.
//
// WHAT IT IS NOT. It is not a generative provider and it is deliberately NOT
// wired into server/engine/ai.ts's LLMProvider seam: that seam's contract is
// `generate(GenerateContentParameters) -> GenerateContentResponse`, and nothing
// here produces content. It is also not on the deterministic scoring path and
// must never become one — no answer from this API may touch a health score, a
// verdict, or any user-visible number (NORTH_STAR.md §1).
//
// FAILURE POLICY. Every failure mode — missing key, HTTP error, timeout,
// malformed body — throws TypeSafeUnavailableError. This module NEVER returns a
// success-shaped result for a call that did not succeed, and never substitutes a
// default answer. Deciding what a failure means is the caller's job
// (server/nvm/converge/cast-alignment.ts turns it into an explicit
// `applied: false, reason: 'error'` record that travels with the candidate).
// That split exists because this codebase's documented failure mode is
// fallbacks that look like success (docs/story-generation/STORY_BENCH_2026-09-13.md §1).
//
// SECRET HANDLING. TYPESAFE_API_KEY is read from the environment at CALL time,
// is sent only in the Authorization header, and appears in no log line, no error
// message and no cache key. redactSecrets() additionally scrubs the key out of
// any upstream error text before it is attached to an Error, so a provider that
// echoes the request can never leak it through a thrown message.
//
// KNOWN LIMITS of the upstream model (they shape how a caller must use it):
//   * text only, and the state is capped upstream at ~32k tokens;
//   * it reads `instructions` LITERALLY — an ambiguous instruction gets an
//     answer to the question as literally written, not the one intended;
//   * it cannot count;
//   * irrelevant state degrades answers ("jaggedness"), so a caller should send
//     the smallest state that contains the answer;
//   * state text is untrusted input: adversarial text inside it can steer the
//     answer. A caller that puts MODEL-GENERATED text in the state must treat
//     the result as a suggestion to be re-checked by a deterministic proof,
//     never as an authority.

import { createHash } from 'node:crypto';
import { logger } from '../logger.ts';

// ── Wire types ───────────────────────────────────────────────────────────────

/** A short noun-phrase answer. `criteria` is free-form guidance for the model. */
export interface TypeSafeNoulQuestion {
  type: 'noul';
  instructions: string;
  criteria?: string | null;
}

/**
 * A pick from an enumerated set. `criteria` maps each option to a description
 * (or null for "the option speaks for itself"). The answer is always one of
 * these keys — that is the whole point of the API for this repository.
 */
export interface TypeSafeChoiceQuestion {
  type: 'choice';
  instructions: string;
  criteria: Record<string, string | null>;
}

/**
 * A position on an ORDERED ladder. `criteria[i]` describes level i, so the
 * returned score is an interpolated index into this array — 0 is the first
 * description, criteria.length - 1 the last.
 */
export interface TypeSafeScoreQuestion {
  type: 'score';
  instructions: string;
  criteria: string[];
}

export type TypeSafeQuestion =
  | TypeSafeNoulQuestion
  | TypeSafeChoiceQuestion
  | TypeSafeScoreQuestion;

export interface TypeSafeAnswer {
  type: string;
  /** Present for a 'choice' question — always one of that question's criteria keys. */
  choice?: string;
  /** Present for a 'score' question — an index into that question's criteria array. */
  score?: number;
  /** Present for a 'noul' question. */
  noul?: string;
  probabilities?: unknown;
  /** 0–1. LOW CONFIDENCE ON A CHOICE IS THE INTERESTING SIGNAL, not noise. */
  confidence?: number;
  legend?: unknown;
}

export interface SystemOneRequest {
  /** A string, or a JSON-serialisable object. Keep it small — see "jaggedness". */
  state: string | Record<string, unknown>;
  questions: Record<string, TypeSafeQuestion>;
  /** Caller deadline; combined with this module's own 10 s timeout. */
  signal?: AbortSignal;
}

export interface SystemOneResult {
  model: string;
  answers: Record<string, TypeSafeAnswer>;
  usage: { input_tokens: number; output_tokens: number };
  /** True when this result came from the in-memory cache and no request was sent. */
  cacheHit: boolean;
}

// ── Failure ──────────────────────────────────────────────────────────────────

export type TypeSafeFailureReason =
  | 'no_key'       // TYPESAFE_API_KEY unset or blank
  | 'http_error'   // upstream returned a non-2xx status
  | 'timeout'      // this module's own deadline fired
  | 'aborted'      // the CALLER's signal aborted the request
  | 'malformed'    // 2xx whose body is not a System One response
  | 'transport';   // fetch itself failed (DNS, TLS, socket)

export class TypeSafeUnavailableError extends Error {
  readonly reason: TypeSafeFailureReason;
  readonly status?: number;
  constructor(reason: TypeSafeFailureReason, message: string, status?: number) {
    super(message);
    this.name = 'TypeSafeUnavailableError';
    this.reason = reason;
    this.status = status;
  }
}

// ── Config (read at call time, never cached at module load) ──────────────────

export const TYPESAFE_ENDPOINT = 'https://api.typesafe.ai/v1/systemone';
/**
 * PINNED, not an alias. Aliases move underneath a deployment; a pinned id is
 * what makes "the identical request returns the identical answer" a property
 * this adapter can actually offer, together with the cache below.
 */
export const TYPESAFE_DEFAULT_MODEL = 'jev-1.13.0';
const TIMEOUT_MS = 10_000;
const CACHE_MAX_ENTRIES = 256;

/** The configured key, or undefined. NEVER log or return this to a client. */
export function typeSafeApiKey(): string | undefined {
  const raw = process.env.TYPESAFE_API_KEY;
  if (typeof raw !== 'string') return undefined;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function typeSafeModel(): string {
  const raw = process.env.TYPESAFE_MODEL;
  const trimmed = typeof raw === 'string' ? raw.trim() : '';
  return trimmed.length > 0 ? trimmed : TYPESAFE_DEFAULT_MODEL;
}

/** Whether a call could even be attempted. Callers use this to skip WITHOUT calling. */
export function typeSafeConfigured(): boolean {
  return typeSafeApiKey() !== undefined;
}

/**
 * Remove the configured key from arbitrary text before it reaches an Error
 * message or a log line. Cheap insurance against an upstream that echoes the
 * request it received.
 */
export function redactSecrets(text: string): string {
  const key = typeSafeApiKey();
  if (!key) return text;
  return text.split(key).join('[redacted]');
}

// ── Injectable transport (same role as engine/ai.ts's setLLMProvider) ────────
// Tests must never reach the network. This is the single seam they replace; the
// request assembly, response validation, cache and log line below are the code
// under test either way.

export interface TypeSafeRequestInit {
  method: string;
  headers: Record<string, string>;
  body: string;
  signal: AbortSignal;
}

export interface TypeSafeTransportResponse {
  status: number;
  text(): Promise<string>;
}

export type TypeSafeTransport = (
  url: string,
  init: TypeSafeRequestInit,
) => Promise<TypeSafeTransportResponse>;

const defaultTransport: TypeSafeTransport = async (url, init) => {
  // Global fetch — no new dependency. undici's Agent plumbing in
  // openai-compat.ts exists for SSRF-reachable, user-configurable base URLs;
  // this endpoint is a compile-time constant, so none of that applies.
  const res = await fetch(url, {
    method: init.method,
    headers: init.headers,
    body: init.body,
    signal: init.signal,
  });
  return { status: res.status, text: () => res.text() };
};

let _transport: TypeSafeTransport = defaultTransport;

export function setTypeSafeTransport(t: TypeSafeTransport): void { _transport = t; }
export function resetTypeSafeTransport(): void { _transport = defaultTransport; }

// ── Reproducibility cache ────────────────────────────────────────────────────
// Keyed by sha256 of the canonical JSON of {model, state, questions}: the exact
// inputs that determine the answer. The API key is NOT part of the key (it is
// not an input to the answer, and a cache key is a thing that gets logged in
// other codebases — this one must never make that mistake possible).
//
// LRU by re-insertion: a Map iterates in insertion order, so deleting and
// re-setting a key on read makes the first key the least recently used.

const _cache = new Map<string, SystemOneResult>();

export function clearTypeSafeCache(): void { _cache.clear(); }
export function typeSafeCacheSize(): number { return _cache.size; }

/** JSON with recursively sorted object keys — same technique as NarrativeState's. */
function canonical(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'null';
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  const obj = value as Record<string, unknown>;
  return '{' + Object.keys(obj).sort()
    .map(k => JSON.stringify(k) + ':' + canonical(obj[k]))
    .join(',') + '}';
}

function cacheKey(model: string, state: SystemOneRequest['state'], questions: SystemOneRequest['questions']): string {
  return createHash('sha256').update(canonical({ model, state, questions })).digest('hex');
}

function cacheGet(key: string): SystemOneResult | undefined {
  const hit = _cache.get(key);
  if (!hit) return undefined;
  _cache.delete(key);
  _cache.set(key, hit);
  return hit;
}

function cacheSet(key: string, value: SystemOneResult): void {
  _cache.set(key, value);
  while (_cache.size > CACHE_MAX_ENTRIES) {
    const oldest = _cache.keys().next();
    if (oldest.done) break;
    _cache.delete(oldest.value);
  }
}

// ── Response validation ──────────────────────────────────────────────────────

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function parseBody(raw: string, requestedModel: string): Omit<SystemOneResult, 'cacheHit'> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new TypeSafeUnavailableError('malformed', 'TypeSafe response was not JSON');
  }
  if (!isRecord(parsed)) {
    throw new TypeSafeUnavailableError('malformed', 'TypeSafe response was not an object');
  }
  const answersRaw = parsed['answers'];
  if (!isRecord(answersRaw)) {
    throw new TypeSafeUnavailableError('malformed', 'TypeSafe response has no answers object');
  }
  const answers: Record<string, TypeSafeAnswer> = {};
  for (const [id, value] of Object.entries(answersRaw)) {
    if (!isRecord(value) || typeof value['type'] !== 'string') {
      throw new TypeSafeUnavailableError('malformed', `TypeSafe answer "${id}" is not an answer object`);
    }
    answers[id] = {
      type: value['type'],
      choice: typeof value['choice'] === 'string' ? value['choice'] : undefined,
      score: typeof value['score'] === 'number' ? value['score'] : undefined,
      noul: typeof value['noul'] === 'string' ? value['noul'] : undefined,
      confidence: typeof value['confidence'] === 'number' ? value['confidence'] : undefined,
      probabilities: value['probabilities'],
      legend: value['legend'],
    };
  }
  const usageRaw = isRecord(parsed['usage']) ? parsed['usage'] : {};
  return {
    model: typeof parsed['model'] === 'string' ? parsed['model'] : requestedModel,
    answers,
    usage: {
      input_tokens: typeof usageRaw['input_tokens'] === 'number' ? usageRaw['input_tokens'] : 0,
      output_tokens: typeof usageRaw['output_tokens'] === 'number' ? usageRaw['output_tokens'] : 0,
    },
  };
}

// ── The one call ─────────────────────────────────────────────────────────────

/**
 * Ask System One a set of closed questions about `state`.
 *
 * Throws TypeSafeUnavailableError for every failure; returns only a real answer
 * set (or an identical cached one). Emits exactly one structured log line per
 * successful call — `typesafe_system_one_call` with the model, latency, token
 * counts and whether it was a cache hit. The state text and the API key appear
 * in NO log line, by construction: nothing below passes either to the logger.
 */
export async function systemOne(req: SystemOneRequest): Promise<SystemOneResult> {
  const key = typeSafeApiKey();
  if (!key) {
    throw new TypeSafeUnavailableError('no_key', 'TYPESAFE_API_KEY is not set');
  }
  const model = typeSafeModel();
  const startedAt = Date.now();

  const ck = cacheKey(model, req.state, req.questions);
  const cached = cacheGet(ck);
  if (cached) {
    const hit: SystemOneResult = { ...cached, cacheHit: true };
    logger.info('typesafe_system_one_call', {
      model: hit.model,
      ms: Date.now() - startedAt,
      inputTokens: hit.usage.input_tokens,
      outputTokens: hit.usage.output_tokens,
      cacheHit: true,
    });
    return hit;
  }

  const timeoutController = new AbortController();
  const timer = setTimeout(() => timeoutController.abort(), TIMEOUT_MS);
  // Node's timer keeps the event loop alive; a 10 s deadline must not delay a
  // process shutdown that happens while a call is in flight.
  (timer as unknown as { unref?: () => void }).unref?.();
  const signal = req.signal
    ? AbortSignal.any([timeoutController.signal, req.signal])
    : timeoutController.signal;

  let response: TypeSafeTransportResponse;
  let raw: string;
  try {
    response = await _transport(TYPESAFE_ENDPOINT, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ model, state: req.state, questions: req.questions }),
      signal,
    });
    raw = await response.text();
  } catch (err) {
    const reason: TypeSafeFailureReason = timeoutController.signal.aborted
      ? 'timeout'
      : (req.signal?.aborted ? 'aborted' : 'transport');
    const message = reason === 'timeout'
      ? `TypeSafe request exceeded ${TIMEOUT_MS} ms`
      : redactSecrets((err as Error).message ?? String(err));
    logger.warn('typesafe_system_one_failed', { reason, ms: Date.now() - startedAt });
    throw new TypeSafeUnavailableError(reason, message);
  } finally {
    clearTimeout(timer);
  }

  if (response.status < 200 || response.status >= 300) {
    logger.warn('typesafe_system_one_failed', {
      reason: 'http_error', status: response.status, ms: Date.now() - startedAt,
    });
    throw new TypeSafeUnavailableError(
      'http_error',
      `TypeSafe returned HTTP ${response.status}: ${redactSecrets(raw).slice(0, 300)}`,
      response.status,
    );
  }

  let parsed: Omit<SystemOneResult, 'cacheHit'>;
  try {
    parsed = parseBody(raw, model);
  } catch (err) {
    logger.warn('typesafe_system_one_failed', { reason: 'malformed', ms: Date.now() - startedAt });
    throw err instanceof TypeSafeUnavailableError
      ? err
      : new TypeSafeUnavailableError('malformed', redactSecrets((err as Error).message));
  }

  cacheSet(ck, { ...parsed, cacheHit: false });
  logger.info('typesafe_system_one_call', {
    model: parsed.model,
    ms: Date.now() - startedAt,
    inputTokens: parsed.usage.input_tokens,
    outputTokens: parsed.usage.output_tokens,
    cacheHit: false,
  });
  return { ...parsed, cacheHit: false };
}
