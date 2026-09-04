// log-redact.ts — the ONE sanctioned way to put writer-derived text into a
// log line anywhere under server/engine/**.
//
// WHY THIS EXISTS. The keyless log test (tests/routes/no-writer-content-in-
// logs.test.ts) proves the deterministic front door never logs a writer's
// content. It cannot reach the generative simulation surface
// (server/engine/**) at all, because that surface only runs with an AI
// provider key configured — and it is Labs-only in the product. An audit of
// that surface found parse-failure and AI-error branches logging
// `preview: <raw LLM output>.substring(0, 120)` and `agent: <character
// name>` — a log sink is exactly where nobody expects to find someone's
// screenplay, and PrivacyPage.tsx's "no route logs your script text, your
// title, or a character's name" carries no "unless you enabled Labs"
// exception.
//
// THE RULE. A parse failure still needs to be debuggable — log what
// CHARACTERISES the failure, not what the writer wrote: length, a
// non-reversible hash prefix, the model id, the pass/label, and the error
// message the parser itself raised (see the json.ts note near safeJsonParse
// for why even that needed a second look — V8's JSON.parse SyntaxError
// embeds a snippet of the offending input verbatim). Every call site that
// used to log a story fragment now calls describeContent()/idRef() instead
// of writing the field directly, so a future call site cannot bypass the
// decision by accident — enforced by
// tests/core/no-writer-content-in-engine-logs.test.ts, which greps
// server/engine/** for the field names this module exists to guard
// (preview, raw, text, proposition, content, output) and fails unless the
// value passed through this module.
//
// THE ESCAPE HATCH. Some operators genuinely need the raw text to diagnose a
// stubborn parse failure. STORYMACHINE_LOG_WRITER_CONTENT=1 (default OFF)
// opts a whole deployment's logs into carrying it — documented in
// .env.example and README.md as "logs writer content — do not enable in a
// deployment holding other people's scripts." It is a single flag read in a
// single place so the default can never regress silently at a call site.
import { createHash } from 'node:crypto';

const FLAG = 'STORYMACHINE_LOG_WRITER_CONTENT';

/** True only when this deployment has explicitly opted into raw writer
 *  content reaching its own logs. Default OFF. Mirrors the `'1' || 'true'`
 *  convention used by STORYMACHINE_DISABLE_CRAFT_SPEC
 *  (server/nvm/generate/craft-spec.ts) so the two escape-hatch flags in this
 *  codebase read the same way. */
export function writerContentLoggingEnabled(): boolean {
  const raw = process.env[FLAG];
  return raw === '1' || raw === 'true';
}

/** A short, non-reversible fingerprint of a string — enough to confirm "this
 *  is the same input as that other log line" across a debugging session,
 *  never enough to recover the input. Exported so call sites and tests can
 *  share one definition of "how long is a hash prefix here". */
export function shortHash(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex').slice(0, 12);
}

export interface ContentDescriptor {
  /** Character length of the original text. */
  length: number;
  /** sha256 prefix — non-reversible, stable across repeated calls with the
   *  same input (so two log lines about the same failure correlate). */
  sha256_12: string;
  /** Present ONLY when STORYMACHINE_LOG_WRITER_CONTENT=1. The raw text,
   *  bounded so the escape hatch cannot itself become an unbounded-log-line
   *  hazard. */
  raw?: string;
}

const RAW_CAP = 2000;

/** The ONE way server/engine/** may describe potentially writer-derived text
 *  (raw LLM output, a parsed proposition, an outline beat, stakes prose, …)
 *  in a log line. Returns a non-reversible descriptor by default; includes
 *  the actual text, capped, only when writerContentLoggingEnabled(). */
export function describeContent(text: string | null | undefined): ContentDescriptor {
  const value = text ?? '';
  const descriptor: ContentDescriptor = { length: value.length, sha256_12: shortHash(value) };
  if (writerContentLoggingEnabled()) descriptor.raw = value.slice(0, RAW_CAP);
  return descriptor;
}

/** A stable, non-reversible reference for an identifier that might be, or
 *  might carry, writer-chosen text (most commonly a display name — a
 *  character's `.name` or a location's `.name` — used only to correlate log
 *  lines about "the same entity", never to reveal what it is called). Plain
 *  technical ids assigned by the app itself (char_id, location_id) are NOT
 *  routed through this — see each call site's comment for why it is already
 *  safe to log bare. */
export function idRef(id: string): string {
  return shortHash(id);
}
