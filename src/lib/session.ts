// ── Per-browser session identity ──────────────────────────────────────────────
// The server keeps one SQLite-backed Stage per sessionId (see
// server/lib/session-store.ts's sessionId(req)). Without a per-client id, every
// browser hitting a deployed instance shared the 'default' session's story
// state. This module mints a durable id once per browser, persists it in
// localStorage so it survives reloads, and exposes the two primitives the rest
// of the app needs:
//
//   - getSessionId()   — the id itself, consumed by src/main.tsx's fetch
//                         wrapper to set the X-Session-Id header on every
//                         same-origin /api/* call.
//   - withSession(url) — append the id as a `sessionId` query param, for the
//                         handful of EventSource (SSE) call sites, which
//                         cannot send custom request headers at all. The
//                         server's precedence rule (session-store.ts) treats
//                         an explicit query sessionId as authoritative over
//                         the header, so this "just works" without any
//                         special-casing on the server side.
//
// Dozens of panels call fetch('/api/...') directly today; centralizing header
// injection in main.tsx's wrapper covers all of them (and every future call
// site) from one place, instead of editing ~30 files and inevitably missing
// the next one added later.

const STORAGE_KEY = 'sm_session_id_v1';

// Must stay inside server/lib/session-store.ts's HEADER_SESSION_ID_RE
// ([A-Za-z0-9_-]{8,64}); a mismatch wouldn't break correctness (the server
// falls back to 'default' rather than erroring on an invalid header) but it
// would silently re-introduce the shared-'default'-session bug this file
// exists to fix, so keep the two in sync if either changes.
const VALID_ID_RE = /^[A-Za-z0-9_-]{8,64}$/;

function generateId(): string {
  // crypto.randomUUID() -> 36 chars incl. 4 dashes; stripping dashes leaves 32
  // lowercase hex chars, comfortably inside [A-Za-z0-9_-]{8,64}.
  return crypto.randomUUID().replace(/-/g, '');
}

// Fallback used when localStorage throws (Safari private browsing raises on
// setItem; some hardened/locked-down browsers disable it outright). Keeping
// one id per tab lifetime — rather than minting a fresh one on every call —
// still gives that tab a consistent, isolated session; it just won't survive
// a reload, which is the best available behavior with no working storage.
let memoryFallbackId: string | null = null;

/** Returns this browser's persistent session id, generating one if absent. */
export function getSessionId(): string {
  try {
    const existing = localStorage.getItem(STORAGE_KEY);
    if (existing && VALID_ID_RE.test(existing)) return existing;
    const fresh = generateId();
    localStorage.setItem(STORAGE_KEY, fresh);
    return fresh;
  } catch {
    if (!memoryFallbackId) memoryFallbackId = generateId();
    return memoryFallbackId;
  }
}

/** Replaces the current browser's persistent session id (e.g. after rotation). */
export function setSessionId(newId: string): void {
  if (!VALID_ID_RE.test(newId)) return;
  try {
    localStorage.setItem(STORAGE_KEY, newId);
  } catch {
    memoryFallbackId = newId;
  }
}

/**
 * Append the current session id as a `sessionId` query param. Use this ONLY
 * for EventSource URLs — EventSource has no headers API, so the X-Session-Id
 * header main.tsx's fetch wrapper injects everywhere else is invisible to it.
 * Safe to call on a URL that already has a query string.
 */
export function withSession(url: string): string {
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}sessionId=${encodeURIComponent(getSessionId())}`;
}

// ── fetch() header-merge helper ───────────────────────────────────────────────
// Extracted so it's independently unit-testable: fetch's `headers` init option
// can be a Headers instance, a [string, string][] array, or a plain object,
// and each needs the X-Session-Id entry added (replacing any pre-existing one,
// case-insensitively) without dropping the caller's other headers. main.tsx's
// wrapper is the only runtime caller.
export type FetchHeaders = HeadersInit | undefined;

export function mergeSessionHeader(existing: FetchHeaders, sessionId: string): HeadersInit {
  if (existing instanceof Headers) {
    const merged = new Headers(existing);
    merged.set('X-Session-Id', sessionId);
    return merged;
  }
  if (Array.isArray(existing)) {
    const filtered = existing.filter(([key]) => key.toLowerCase() !== 'x-session-id');
    return [...filtered, ['X-Session-Id', sessionId]];
  }
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(existing ?? {})) {
    if (key.toLowerCase() === 'x-session-id') continue;
    result[key] = value as string;
  }
  result['X-Session-Id'] = sessionId;
  return result;
}

// ── same-origin '/api/' request detection ────────────────────────────────────
// main.tsx's fetch wrapper only ever intended to touch same-origin '/api/'
// calls (see its header comment) — attaching X-Session-Id to a cross-origin
// request would leak this browser's session id to a third-party host. The
// original check (`typeof input === 'string' && input.startsWith('/api/')`)
// enforced that correctly for the plain-string call shape every panel in
// this app actually uses, but silently fell through to "pass unmodified" for
// a Request or URL input instead of resolving it the same way — a future
// `fetch(new Request('/api/...'))` or `fetch(new URL('/api/...', ...))`
// call would bypass session-header attachment with no error at all. No
// current call site does this (verified), so this closes a latent gap
// rather than fixing a live bug.
//
// Extracted as a pure function (currentOrigin passed in explicitly, never
// read from `window.location` internally) for the same reason
// mergeSessionHeader above is extracted: independently unit-testable under
// plain Node, which has no DOM/`window` (see CLAUDE.md — this repo has no
// jsdom/browser test harness).
export function isSameOriginApiRequest(input: RequestInfo | URL, currentOrigin: string): boolean {
  if (typeof input === 'string') {
    // Relative paths are inherently same-origin. This matches the original,
    // narrower string contract exactly: only a literal '/api/'-prefixed
    // relative path matches — an absolute same-origin URL STRING (e.g.
    // `` `${location.origin}/api/x` ``) is intentionally NOT matched here,
    // unchanged from prior behavior. No call site in this app passes one.
    return input.startsWith('/api/');
  }
  const href = input instanceof Request ? input.url : input.href;
  try {
    const parsed = new URL(href, currentOrigin);
    return parsed.origin === currentOrigin && parsed.pathname.startsWith('/api/');
  } catch {
    return false;
  }
}

/** Decide whether main.tsx should attach the browser session capability.
 * Product event posts are deliberately session-unlinked, so the exact
 * `/api/events` path is excluded for every fetch input form. All other
 * same-origin API requests retain isSameOriginApiRequest's existing behavior.
 */
export function shouldAttachSessionHeader(input: RequestInfo | URL, currentOrigin: string): boolean {
  if (!isSameOriginApiRequest(input, currentOrigin)) return false;

  const href = typeof input === 'string'
    ? input
    : input instanceof Request
      ? input.url
      : input.href;
  try {
    const pathname = new URL(href, currentOrigin).pathname;
    return pathname !== '/api/events' && pathname !== '/api/events/';
  } catch {
    return false;
  }
}
