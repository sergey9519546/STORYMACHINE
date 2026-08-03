// server/lib/safe-error.ts — a single sanitizer for server-side error text
// before it reaches a client OR the logger.
//
// WHY THIS EXISTS: server/routes/config.ts's POST /api/ai-config/test used to
// compute a redacted copy of an upstream provider error for the HTTP
// response, then log the RAW (unredacted) error two lines below it — so a
// provider error that echoed a bearer token or an sk- key wrote it verbatim
// into the logs even though the client-facing response was already safe
// (fixed in 3a4a905, but only at that one call site, with its own inline
// regex pair). CI's `rg "console\."` grep cannot catch this class of leak —
// it is a `logger.*` call, a legitimate, allowed sink, which is exactly why
// it survived review. Centralizing the redaction here — and routing every
// response/logger sink that carries server-side error text through it — is
// the fix that generalizes.
//
// Deliberately covers classes of secret this codebase's own error paths are
// known to be able to echo: bearer tokens (ai-config/test's own upstream auth
// errors), sk-/API-key-shaped provider keys, generic api_key=/token= query or
// field patterns, connection-string credentials, and absolute filesystem
// paths (this process's directory layout). None of these need to be
// EXPECTED at a given call site to be worth redacting — the point of a
// single shared sanitizer is that call sites do not have to individually
// reason about what an upstream or internal error might contain.

const MAX_ERROR_MESSAGE_LENGTH = 200;

interface RedactionRule {
  readonly pattern: RegExp;
  readonly replacement: string;
}

// Order matters only where patterns could overlap (e.g. a connection string
// containing what also looks like a bearer token) — credential-bearing URL
// authority segments are redacted before the generic path/token rules run so
// a leftover fragment can't accidentally re-match a laxer rule downstream.
const REDACTION_RULES: readonly RedactionRule[] = [
  // Authorization headers echoed back verbatim from an upstream error body.
  { pattern: /Bearer\s+[A-Za-z0-9._~+/=-]+/gi, replacement: 'Bearer [redacted]' },
  // Connection strings / URLs with embedded credentials: scheme://user:pass@host
  // (postgres://, mongodb://, redis://, amqp://, https://user:pass@…, etc.)
  { pattern: /\b([a-z][a-z0-9+.-]*:\/\/)[^\s/:@]+:[^\s/@]+@/gi, replacement: '$1[redacted]@' },
  // OpenAI-style secret keys: sk-…, sk-proj-…, sk-ant-…
  { pattern: /\bsk-[A-Za-z0-9_-]{6,}/g, replacement: 'sk-[redacted]' },
  // Google API keys (Gemini, Maps, etc.)
  { pattern: /\bAIza[0-9A-Za-z_-]{20,}/g, replacement: 'AIza[redacted]' },
  // Generic api_key=/token=/secret= as a query or form field, wherever it appears.
  { pattern: /\b((?:api[_-]?key|access[_-]?token|auth[_-]?token|secret)\s*[:=]\s*)['"]?[A-Za-z0-9._-]{8,}['"]?/gi, replacement: '$1[redacted]' },
  // The same fields specifically as URL query parameters (?api_key=…&token=…).
  { pattern: /([?&](?:api[_-]?key|token|key|secret)=)[^&\s"'<>]+/gi, replacement: '$1[redacted]' },
  // Absolute POSIX filesystem paths under common roots — this process's own
  // directory layout is not something a client needs to see in an error.
  { pattern: /\/(?:home|root|Users|etc|var|usr|opt|tmp|srv)(?:\/[\w.-]+)+/g, replacement: '[path redacted]' },
  // Absolute Windows filesystem paths (C:\Users\..., D:\data\...).
  { pattern: /[A-Za-z]:\\(?:[^\s\\]+\\)*[^\s\\]+/g, replacement: '[path redacted]' },
];

export interface SanitizedError {
  /** Redaction-safe, length-bounded error text. Safe for both an HTTP response and the logger. */
  message: string;
  /** The error's constructor name (e.g. 'TypeError'), or typeof the thrown value for a non-Error throw. */
  errorClass: string;
  /** Passed through only when the thrown value carries a genuine numeric status/statusCode property. */
  status?: number;
}

function extractStatus(error: unknown): number | undefined {
  if (typeof error !== 'object' || error === null) return undefined;
  const candidate = error as { status?: unknown; statusCode?: unknown };
  const raw = candidate.status ?? candidate.statusCode;
  return typeof raw === 'number' && Number.isInteger(raw) && raw >= 100 && raw < 600 ? raw : undefined;
}

/**
 * Sanitizes arbitrary server-side error text — an upstream provider error, a
 * thrown Error's message, a caught non-Error value — before it is allowed to
 * reach EITHER an HTTP response or the logger. Bounded length plus a fixed
 * set of redaction rules for the secret/path shapes this codebase's error
 * paths are known to be able to echo (see module header). Idempotent and
 * side-effect-free; safe to call more than once on the same input.
 */
export function sanitizeExternalError(error: unknown): SanitizedError {
  const raw = error instanceof Error ? error.message : String(error);
  const errorClass = error instanceof Error ? error.constructor.name : typeof error;
  // Redact BEFORE truncating, not after: truncating first could cut a secret
  // mid-string at exactly the 200-char boundary, leaving a partial fragment
  // that no longer matches any redaction pattern. Redacting the full text
  // first replaces every secret with a short fixed placeholder, so the
  // subsequent truncation can never re-expose part of one.
  const redacted = REDACTION_RULES.reduce((text, rule) => text.replace(rule.pattern, rule.replacement), raw);
  const message = redacted.length > MAX_ERROR_MESSAGE_LENGTH
    ? redacted.substring(0, MAX_ERROR_MESSAGE_LENGTH) + '…'
    : redacted;
  const status = extractStatus(error);
  return { message, errorClass, ...(status !== undefined ? { status } : {}) };
}
