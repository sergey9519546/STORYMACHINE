// Wave 39 — LLM Prose Rewriter
// Given a fountain draft + diagnosed issues, calls Gemini to rewrite
// only the flagged layer, preserving approved spans.
// Falls back (returns original) when LLM is unavailable.

import { AsyncLocalStorage } from 'node:async_hooks';
import type { RevisionIssue, ApprovedSpan, PassName, PassResult, StoryContext } from './passes/types.ts';

// ── Script Doctor diagnose-only scope ────────────────────────────────────────
// The doctor (server/nvm/analyze/doctor.ts) runs all 14 revision passes purely
// to collect their diagnostic issue lists — it must never trigger an LLM
// rewrite, even when GEMINI_API_KEY is configured, since a "checkup" endpoint
// silently mutating the author's screenplay would violate its own contract.
// AsyncLocalStorage lets this flag propagate through the pipeline's ordinary
// async call chain (runRevisionPipeline -> pass fn -> rewritePass) without
// threading an extra parameter through every pass's signature.
const diagnoseOnlyStore = new AsyncLocalStorage<boolean>();

/** Run `fn` with every rewritePass() call inside it forced to diagnose-only
 *  (issues are still collected; no LLM is ever invoked). */
export function runDiagnoseOnly<T>(fn: () => Promise<T>): Promise<T> {
  return diagnoseOnlyStore.run(true, fn);
}

/** True when called from inside a runDiagnoseOnly() scope. */
export function isDiagnoseOnly(): boolean {
  return diagnoseOnlyStore.getStore() === true;
}

export interface RewriteInput {
  fountain: string;
  issues: RevisionIssue[];
  passName: PassName;
  approvedSpans: ApprovedSpan[];
  storyContext?: StoryContext;
  /** Compact summaries of passes that already ran — prevents undoing prior improvements. */
  priorPassResults?: PassResult[];
}

export interface RewriteResult {
  revised: string;
  usedLLM: boolean;
}

/** Minimum fraction of the original length an accepted rewrite must retain.
 *  Below this we assume the model silently dropped scenes. */
export const REWRITE_MIN_LENGTH_RATIO = 0.80;

export type RewriteVerdict =
  | { accept: true }
  | { accept: false; reason: 'truncated' | 'too_short' | 'empty' };

/**
 * Decide whether an LLM rewrite is safe to accept. Pure and exported so the
 * truncation/length guards can be unit-tested without a live model.
 *
 * - Rejects when the model hit its token ceiling (finishReason MAX_TOKENS): the
 *   screenplay's ending was dropped, so accepting would delete the final act.
 * - Rejects when output is empty or shrank below REWRITE_MIN_LENGTH_RATIO.
 */
export function evaluateRewrite(
  revisedText: string,
  originalLength: number,
  finishReason: string | undefined,
): RewriteVerdict {
  if (finishReason === 'MAX_TOKENS') return { accept: false, reason: 'truncated' };
  const text = revisedText.trim();
  if (text.length === 0) return { accept: false, reason: 'empty' };
  if (text.length < originalLength * REWRITE_MIN_LENGTH_RATIO) {
    return { accept: false, reason: 'too_short' };
  }
  return { accept: true };
}


// ── LLM rewriter registry (retrospective #5, 2026-09-03) ─────────────────────
// Everything below the diagnose-only short-circuit — prompt construction, the
// craft-spec block, the provider call, the accept/reject logging — used to
// live in this file behind `await import()` calls. Lazy imports do NOT hide a
// module from scripts/lib/import-graph.mjs (it matches `import('…')` as an
// edge, deliberately), so doctor.ts's reachable set contained
// server/engine/ai.ts, its whole provider/HTTP stack, and
// server/nvm/generate/craft-spec.ts — a file whose own header says it "must
// never be imported by, or influence, the deterministic doctor/scoring path".
//
// The generative half now lives in ./rewrite-llm.ts, which registers itself at
// module load. server/routes/nvm/revision.ts — the only entrypoint that ever
// runs a pass OUTSIDE runDiagnoseOnly — imports it, so the product behaviour is
// unchanged; the doctor, the calibration corpus builder and the worker threads
// never load it and never could have used it (isDiagnoseOnly() returns before
// this point on every one of those paths).
//
// An unregistered rewriter is therefore not a degraded state to warn about: it
// is the ordinary condition of every deterministic caller, and it produces the
// same value those callers already got — the draft, unchanged.
export type LlmRewriter = (input: RewriteInput) => Promise<RewriteResult>;

let llmRewriter: LlmRewriter | null = null;

/** Called by ./rewrite-llm.ts at module load. Passing null unregisters. */
export function registerLlmRewriter(rewriter: LlmRewriter | null): void {
  llmRewriter = rewriter;
}

/**
 * Attempt an LLM prose rewrite. Returns original if LLM unavailable or fails.
 */
export async function rewritePass(input: RewriteInput): Promise<RewriteResult> {
  const { fountain, issues } = input;
  if (issues.length === 0) return { revised: fountain, usedLLM: false };
  // Script Doctor diagnose-only contract: skip straight to the unchanged
  // fallback before any prompt-building or LLM work happens below, so
  // diagnose-only mode has zero LLM cost and zero risk of a network call
  // even when a key is configured.
  if (isDiagnoseOnly()) return { revised: fountain, usedLLM: false };

  const rewriter = llmRewriter;
  if (!rewriter) return { revised: fountain, usedLLM: false };
  return rewriter(input);
}
