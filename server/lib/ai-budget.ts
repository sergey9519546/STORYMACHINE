// server/lib/ai-budget.ts — request-scoped budget bounding LLM provider
// fan-out per request.
//
// WHY THIS EXISTS: a comment in server/routes/game.ts used to claim turns
// were "bounded by the engine's own per-turn call budget" — no such budget
// existed anywhere in server/engine (grep found nothing), which is exactly
// why /api/turn and /api/simulate-to-fountain sat on the wrong rate limiter
// for weeks (see game.ts's aiLimiter comments, 2026-08-03 audit). Rate
// limiting bounds REQUESTS; it cannot bound the fan-out WITHIN one request —
// /api/simulate-to-fountain alone can reach ~40 provider calls from a single
// HTTP call. This module is the real thing the old comment only claimed
// existed: an attempt ceiling and a wall-clock deadline, enforced per
// request, independent of the per-minute rate limiters in session-store.ts.
//
// DEVIATION FROM THE 2026-07-15 PLAN (docs/superpowers/plans/…/Task 6): the
// plan's Step 3 says "generateContent must call consumeAiAttempt() for every
// provider attempt, including retries" — i.e. instrument the choke point
// inside server/engine/ai.ts directly. This session's assigned slice is
// server/lib/**, server/routes/**, and tests/routes/** — server/engine/** and
// server/nvm/** are owned by sibling agents and explicitly off-limits here.
// So the true per-attempt choke point (server/engine/ai.ts's generateContent,
// called from Agent.ts/agent/decision.ts/agent/memory.ts/DirectorNode.ts) is
// NOT editable from this change. Two consequences, both documented at each
// call site that needs them:
//
//   1. Wherever a route calls generateContent/generateContentStream DIRECTLY
//      (game.ts's /api/game/interview, config.ts's /api/ai-config/test, most
//      of scriptide.ts's AI routes) — full enforcement (attempts + deadline)
//      is wired in, because the call site is inside this slice.
//
//   2. Wherever fan-out happens by CALLING BACK INTO a generator function the
//      route itself constructs (nvm/converge.ts, nvm/selfplay.ts's
//      makeLLMCandidateGenerator()) — withCountedAttempts() below wraps that
//      function reference before it's handed to server/nvm/**'s convergence
//      loop. The loop still lives out-of-slice, but it only ever reaches the
//      provider through the exact function reference the route gave it, so
//      wrapping that reference is a real, load-bearing attempt ceiling
//      without editing a single file under server/nvm/**.
//
//   3. Wherever fan-out happens entirely inside server/engine/Orchestrator.ts
//      (turn, run-room, run-scene, simulate-to-fountain) there is no
//      injectable seam at all — Agent.ts/decision.ts/memory.ts import
//      generateContent directly. Attempt-ceiling enforcement is NOT possible
//      there without an out-of-slice edit; only the wall-clock deadline is
//      enforced, at the route boundary, using the coordinator-safe pattern
//      below. This is called out explicitly wherever it applies rather than
//      silently degrading the guarantee.
//
// COORDINATOR SAFETY (why there are two different deadline primitives): some
// routes this budget wraps mutate a session's SQLite state through
// SessionCommandCoordinator (server/lib/session-store.ts), which guarantees
// one command completes — including every write it makes — before the next
// queued command for that session begins. A deadline that ABANDONS the
// underlying operation (stops waiting on it, lets it keep mutating state in
// the background) would let the coordinator consider the command "done" the
// moment the deadline fires, while the abandoned operation could still be
// writing to Stage — reintroducing exactly the kind of race the coordinator
// exists to prevent. So:
//   - raceDeadline()/withAiBudget() ABANDON on timeout — safe ONLY for
//     operations with no coordinator (or other external caller) depending on
//     really being finished when the returned promise settles.
//   - withDeadline() never abandons anything — it reports whether the
//     operation settled in time WITHOUT rejecting, so a coordinator-tracked
//     caller can send an early, honest response to the client while still
//     independently awaiting the real operation before letting its own
//     handler promise resolve. See server/routes/game.ts's /api/turn for the
//     canonical example of this pattern.
import { AsyncLocalStorage } from 'node:async_hooks';

export type AiBudgetErrorCode = 'AI_BUDGET_ATTEMPTS_EXCEEDED' | 'AI_BUDGET_DEADLINE_EXCEEDED';

/** Thrown by consumeAiAttempt()/raceDeadline()/withAiBudget() when a request-scoped
 *  AI budget is exceeded. Never contains upstream error text — its message is
 *  entirely first-party, so it needs no sanitize-error routing before it
 *  reaches a client or the logger. */
export class AiBudgetExceededError extends Error {
  readonly code: AiBudgetErrorCode;
  constructor(code: AiBudgetErrorCode, message: string) {
    super(message);
    this.name = 'AiBudgetExceededError';
    this.code = code;
  }
}

export function isAiBudgetExceededError(e: unknown): e is AiBudgetExceededError {
  return e instanceof AiBudgetExceededError;
}

export interface AiBudgetLimits {
  /** Hard ceiling on provider attempts for this request. Each consumeAiAttempt()
   *  call (or each invocation of a withCountedAttempts()-wrapped generator)
   *  counts as one attempt, regardless of which module makes it — the budget
   *  is scoped by AsyncLocalStorage, not by call site. */
  maxAttempts: number;
  /** Wall-clock budget in milliseconds, starting when the budget context is entered. */
  timeoutMs: number;
  /** Short identifier folded into error messages/logs (e.g. 'turn', 'converge'). */
  label: string;
}

interface BudgetRecord {
  readonly label: string;
  readonly maxAttempts: number;
  readonly deadlineAt: number;
  attempts: number;
}

const budgetStorage = new AsyncLocalStorage<BudgetRecord>();

/**
 * Reads an environment override for a budget number, falling back to
 * `fallback` when unset, empty, non-numeric, or non-positive. Mirrors
 * session-store.ts's boundedIntegerEnv() convention (env-tunable operational
 * constants) and, deliberately, doubles as this module's test seam: tests can
 * set e.g. AI_BUDGET_TURN_TIMEOUT_MS to a few milliseconds before booting the
 * app to prove a route's wiring actually enforces its budget, without waiting
 * out a real multi-second/minute production ceiling.
 */
export function aiBudgetEnvNumber(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

/**
 * Called immediately before EVERY provider attempt at an instrumented call
 * site. Throws AiBudgetExceededError BEFORE the attempt is made once
 * maxAttempts is exhausted or the deadline has already elapsed — this is what
 * actually stops the next call from ever being issued, not a counter that
 * merely observes fan-out after the fact.
 *
 * A no-op outside any withAiBudget()/runWithBudgetContext() context: call
 * sites with no active budget (existing tests that invoke generateContent
 * directly, or any call site nobody has wired a budget around yet) are
 * completely unaffected. The budget is strictly opt-in per request.
 */
export function consumeAiAttempt(): void {
  const record = budgetStorage.getStore();
  if (!record) return;
  if (Date.now() > record.deadlineAt) {
    throw new AiBudgetExceededError(
      'AI_BUDGET_DEADLINE_EXCEEDED',
      `AI budget deadline exceeded for '${record.label}' (${record.attempts}/${record.maxAttempts} attempts made)`,
    );
  }
  if (record.attempts >= record.maxAttempts) {
    throw new AiBudgetExceededError(
      'AI_BUDGET_ATTEMPTS_EXCEEDED',
      `AI budget exhausted for '${record.label}': ${record.attempts}/${record.maxAttempts} attempts already made`,
    );
  }
  record.attempts += 1;
}

/** Number of attempts consumed so far in the active budget context, or 0 outside one. */
export function currentAiAttempts(): number {
  return budgetStorage.getStore()?.attempts ?? 0;
}

/**
 * Establishes a request-scoped AI budget for the duration of `fn`, via
 * AsyncLocalStorage — every consumeAiAttempt() call anywhere in the async
 * call graph `fn` kicks off (regardless of which module runs it) sees the
 * SAME attempt counter and deadline. Returns whatever `fn()` returns
 * (typically a Promise, already in flight) — this primitive does NOT itself
 * race a deadline; pair it with withDeadline() (coordinator-safe) or
 * raceDeadline() (abandon-on-timeout) depending on the caller's needs. Most
 * callers should use withAiBudget() below instead; this lower-level primitive
 * exists for coordinator-tracked routes that must keep awaiting the real
 * operation regardless of what the client is told — see this module's header
 * comment.
 */
export function runWithBudgetContext<T>(limits: AiBudgetLimits, fn: () => T): T {
  const record: BudgetRecord = {
    label: limits.label,
    maxAttempts: limits.maxAttempts,
    deadlineAt: Date.now() + limits.timeoutMs,
    attempts: 0,
  };
  return budgetStorage.run(record, fn);
}

/**
 * Rejects with AiBudgetExceededError('AI_BUDGET_DEADLINE_EXCEEDED') if
 * `promise` has not settled within `timeoutMs`; otherwise settles exactly as
 * `promise` does. Does NOT cancel `promise` — Node has no way to abort
 * arbitrary in-flight async work from outside, and this module deliberately
 * has no engine-specific cancellation hooks. Safe to use only where nothing
 * else depends on `promise` actually being finished when this rejects — see
 * this module's header comment on coordinator safety.
 */
export function raceDeadline<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new AiBudgetExceededError(
        'AI_BUDGET_DEADLINE_EXCEEDED',
        `AI budget deadline (${timeoutMs}ms) exceeded for '${label}'`,
      ));
    }, timeoutMs);
    promise.then(
      (v) => { clearTimeout(timer); resolve(v); },
      (e) => { clearTimeout(timer); reject(e); },
    );
  });
}

/**
 * Coordinator-safe deadline race: resolves to `{timedOut:true}` if `promise`
 * has not settled within `timeoutMs`, WITHOUT rejecting and WITHOUT
 * abandoning `promise` — the caller remains responsible for (and able to)
 * keep awaiting `promise` afterward. If `promise` settles first, resolves to
 * `{timedOut:false, value}`; if it rejects first, withDeadline's own returned
 * promise rejects with that same error (there is nothing useful to degrade to
 * — a real failure, not a timeout, is the caller's to handle as it already
 * does for non-budget errors).
 */
export function withDeadline<T>(
  promise: Promise<T>,
  timeoutMs: number,
): Promise<{ timedOut: true } | { timedOut: false; value: T }> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => resolve({ timedOut: true }), timeoutMs);
    promise.then(
      (value) => { clearTimeout(timer); resolve({ timedOut: false, value }); },
      (err) => { clearTimeout(timer); reject(err); },
    );
  });
}

/**
 * Full-enforcement wrapper for call sites with NO external coordinator
 * tracking `operation`'s completion (no SessionCommandCoordinator involved,
 * no other code independently depends on `operation` having truly finished
 * when this resolves). Establishes the AsyncLocalStorage budget context AND
 * abandons `operation` on deadline (raceDeadline — see its doc comment).
 *
 * This is the primitive to reach for by default; only drop to
 * runWithBudgetContext()+withDeadline() directly when the operation mutates
 * coordinator-tracked session state (see module header).
 */
export function withAiBudget<T>(limits: AiBudgetLimits, operation: () => Promise<T>): Promise<T> {
  const promise = runWithBudgetContext(limits, () => Promise.resolve().then(operation));
  return raceDeadline(promise, limits.timeoutMs, limits.label);
}

/**
 * Wraps a callback-style generator/candidate function — the dependency-
 * injection seam factories like server/nvm/generate/llm-generator.ts's
 * makeLLMCandidateGenerator() return — so every invocation consumes one
 * attempt from whichever withAiBudget()/runWithBudgetContext() context is
 * active when it's called. This is how the budget reaches fan-out that
 * happens deep inside server/nvm/** (out of this change's slice) WITHOUT
 * editing any file there: the route already constructs the generator
 * function and hands it BY REFERENCE into the engine; wrapping the reference
 * intercepts every call the engine makes through it. Throws (via
 * consumeAiAttempt()) BEFORE delegating to `fn`, so the real generator is
 * never invoked past the ceiling.
 */
export function withCountedAttempts<Args extends unknown[], R>(
  fn: (...args: Args) => R,
): (...args: Args) => R {
  return (...args: Args): R => {
    consumeAiAttempt();
    return fn(...args);
  };
}
