// llm-port.ts — the deterministic analysis core's ONE outbound seam to a
// language model.
//
// WHY THIS EXISTS (2026-09-03 retrospective finding #5). ARCHITECTURE.md §1
// promises the analysis core is pure and keyless, but the promise was prose:
// server/nvm/analyze/deep-read.ts statically imported server/engine/ai.ts, so
// the static import graph rooted at doctor.ts dragged in the whole provider
// stack — engine/ai-provider.ts, lib/ai-providers/openai-compat.ts (an HTTP
// client), lib/validation.ts, lib/metrics.ts — and every doctor worker thread
// paid to load an AI transport in order to compute a DETERMINISTIC score.
// scripts/check-scoring-receipt.mjs then (correctly) classified all of it as
// scoring-path, so an unrelated edit to validation.ts had to carry a
// measurement receipt.
//
// THE INVERSION. The core declares the narrow contract it needs; the ADAPTER
// lives outside the core and plugs itself in. server/engine/ai.ts calls
// registerLlmPort() at module load, so every process that has already loaded
// the AI stack (every Express route, every test that touches setLLMProvider)
// wires the port automatically — no new composition root, no wiring order to
// remember. A process that never loads engine/ai.ts — a doctor worker thread,
// `npm run measure-real`, the calibration corpus builder — simply has no port,
// which is indistinguishable from "no API key configured": the exact state the
// analysis-only front door is designed around (CLAUDE.md's boot-without-a-key
// gotcha).
//
// TYPES ARE STRUCTURAL ON PURPOSE. This module does not import @google/genai,
// or anything else. Its request/response shapes are the minimum the core
// actually sends and reads, written out by hand so the core's type graph
// carries no SDK either. The adapter widens/narrows at the boundary, which is
// the adapter's job.
//
// ENFORCEMENT. tests/core/pure-core-boundary.test.ts recomputes doctor.ts's
// reachable set and fails if server/engine/ai.ts (or the rest of the forbidden
// list) reappears in it. That test, not this comment, is what keeps the
// boundary real.

/** The one request shape the core sends. A superset-compatible subset of
 *  @google/genai's GenerateContentParameters — the adapter passes it straight
 *  through. */
export interface LlmPortRequest {
  model: string;
  contents: Array<{ role: string; parts: Array<{ text: string }> }>;
  config?: {
    responseMimeType?: string;
    temperature?: number;
    maxOutputTokens?: number;
  };
}

/** The fields the core actually reads off a response. Everything else the SDK
 *  returns is deliberately invisible here. */
export interface LlmPortResponse {
  /** Concatenated text of the first candidate, when the provider supplies it. */
  text?: string;
  candidates?: Array<{
    finishReason?: string;
    content?: { parts?: Array<{ text?: string }> };
  }>;
}

/** Timeout/retry knobs the core asks for per call — mirrors engine/ai.ts's
 *  generateContent(opts). */
export interface LlmPortCallOptions {
  label: string;
  timeoutMs?: number;
  maxAttempts?: number;
}

export interface LlmPort {
  /** Resolve a task name ('ANALYSIS', 'REVISION', …) to a concrete model id. */
  modelForTask(task: string): string;
  /** One call WITH the adapter's timeout + transient-failure retry policy. */
  generateContent(request: LlmPortRequest, options: LlmPortCallOptions): Promise<LlmPortResponse>;
  /** One call with NO retry wrapper — the caller owns its own budget. */
  generateDirect(request: LlmPortRequest): Promise<LlmPortResponse>;
}

let registered: LlmPort | null = null;

/** Called by the adapter (server/engine/ai.ts) at module load. Passing null
 *  unregisters — used by tests that need to observe the keyless path. */
export function registerLlmPort(port: LlmPort | null): void {
  registered = port;
}

/** The registered adapter, or null when no AI stack has been loaded in this
 *  process/thread. Callers on the deterministic path MUST handle null by
 *  degrading, never by throwing: "no port" is the same condition as "no API
 *  key", and the analysis surface is required to work in that state. */
export function getLlmPort(): LlmPort | null {
  return registered;
}
