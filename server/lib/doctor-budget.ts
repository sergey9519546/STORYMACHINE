// Per-analysis wall-clock budget for the Script Doctor (Decision #7,
// 2026-09-06 — docs/DECISION_LOG.md).
//
// ── WHY THIS IS A POOL/TIMEOUT MATTER AND NOT A VALIDATION-GUARD ONE ─────────
// Eight review rounds (docs/audits/2026-09-06-mistake-search/serverfix2-review.md)
// closed every shape where server/lib/validation.ts's cue guard MIS-MODELLED
// the analyzer and let a 42-343 second request through. What is left is a
// document where the guard and the analyzer AGREE: a draft sitting at the
// analyzer's own 400-scene ceiling with a large cast and one short-spoken
// character, so `analyzeVoices` correctly abstains and the remaining thirteen
// passes do ordinary, correct work — measured at ~12-14 s (that review's
// §7.7, and re-measured on this lane's box at 13,765 ms for the most
// expensive corner of the accepted envelope: 800 distinct cues x 15
// occurrences, 632,427 chars, 389 scenes). The reviewer's own conclusion:
// "Bounding it would mean rejecting documents at the ceiling the analyzer
// itself advertises, which is a request-timeout/pool question, not a
// validation-guard one."
//
// So this file does NOT try to predict cost from the text. It bounds the
// WALL CLOCK of one analysis and stops it when the bound is crossed. The
// point is not to reject the ~14 s document — the default budget is more than
// twice that — it is that no submission can ever again occupy a worker
// unboundedly, whether because someone adds a slow pass, because a worker
// wedges, or because a shape nobody has found yet gets past the guard.
//
// ── WHAT THE DEFAULT IS AND WHERE IT COMES FROM ─────────────────────────────
// DOCTOR_ANALYSIS_BUDGET_DEFAULT_MS = 30_000. Derivation, in full:
//   * measured accepted worst case on this lane's box: 13,765 ms (above);
//     the round-7 reviewer measured the same family at 12,340-13,566 ms on a
//     box carrying load average 1.9-3.0 and called its own absolute numbers
//     "~10-20% pessimistic". Call the accepted ceiling ~14 s.
//   * 2x headroom over that ceiling = ~28 s, rounded to 30 s. Headroom is
//     what keeps this from firing on a legitimate document analysed on a
//     contended box, which is the only way a wall-clock bound can be unfair:
//     the same draft that finishes in 14 s idle can take materially longer
//     under load.
//   * 30_000 is also the value DOCTOR_POOL_PREWARM_TIMEOUT_MS already
//     defaults to (server/nvm/analyze/doctor-pool.ts), so an operator reading
//     the env table meets one number for "how long the doctor is allowed to
//     take", not two.
//   * it must stay BELOW the client's own 120 s diagnosis watchdog
//     (src/components/scriptide/ScriptDoctorPanel.tsx) — otherwise the writer
//     meets the generic "Diagnosis timed out (120s)" copy and never sees the
//     honest sentence below. 30 s is well inside it.
// The no-fire evidence for this default (54 tracked .fountain fixtures, the
// 20 calibration REFERENCE_CORPUS samples, the CC0 reference screenplays, the
// P0 sample, and a realistic 150-name/3,000-block feature) is in
// tests/core/doctor-analysis-budget.test.ts and this lane's report; the
// slowest legitimate item measured 6,935 ms, a 4.3x margin.
//
// ── TWO BUDGETS, NOT ONE (round-2 review, 2026-09-06) ───────────────────────
// Round 1 armed ONE timer at submission, covering queue wait and execution
// together, and rejected both with the same error and the same sentence. The
// reviewer produced the state where that sentence is FALSE: 60 concurrent
// distinct 346 KB features (each ~2-3 s solo, half of gameLimiter's own
// per-IP allowance, nothing oversized anywhere) on a 2-worker pool. On this
// lane's box 40 of the 60 were rejected at ~34.8 s reading "This draft took
// longer to analyze … split the draft into shorter files" — for jobs that
// never ran, about drafts that are fine, advising a remedy that cannot help.
//
// So the two waits are now two budgets, because they bound two different
// things and only one of them is a property of the draft:
//
//   RUNNING (DOCTOR_ANALYSIS_BUDGET_MS, 30 s) — how long one analysis may
//   OCCUPY a worker. That is the draft's own cost, it is deterministic for a
//   given draft on a given server, and it is answered 400 with the sentence
//   below: the same status the shape guard's own analysis-cost rejection
//   uses, and the reason Decision #7 rejected a 5xx ("a 5xx invites a blind
//   retry of a deterministic outcome") is exactly right for this half.
//
//   QUEUED (DOCTOR_QUEUE_BUDGET_MS, 60 s) — how long a submission may WAIT
//   for a free worker. That is contention, not the draft: it is not
//   deterministic, retrying later IS the correct client behaviour, and a 400
//   would also file server contention inside client-error metrics. Answered
//   503 with `Retry-After` and its own sentence, which names the server and
//   gives no "split the draft" advice.
//
// Why 60 s for the queue half, and why a SEPARATE (larger) number rather
// than reusing 30 s. The BINDING constraint is arithmetic, not the burst:
//   * The ceiling is the client's own 120 s diagnosis watchdog
//     (src/components/scriptide/ScriptDoctorPanel.tsx). Queue and run budgets
//     COMPOSE — a job admitted at 59.9 s then gets its full 30 s — so
//     QUEUE + RUNNING must stay under it or the writer meets the generic
//     "Diagnosis timed out (120s)" copy instead of a registered sentence.
//     60 + 30 = 90 s, leaving 30 s of margin. A test asserts that sum.
//   * The floor is what the pool can actually serve. Measured on the
//     60-concurrent burst above, same box, same payloads, defaults
//     otherwise: with round 1's single 30 s budget, **20 of 60** scored and
//     **40** were rejected — every one of them with the running sentence,
//     which was false for all 40. With the queue half raised to 60 s,
//     **34 of 60** score and the other **26** get an honest 503 with
//     Retry-After 5-66 s. So the split converts fourteen wrongly-blamed
//     rejections into completed analyses and relabels the rest truthfully.
//   * NOT claimed: that 60 s admits any burst. It does not, and no value
//     under the 120 s watchdog could — 60 jobs of ~2-3 s each on 2 workers
//     needs well over 100 s to drain, past the point where the writer's own
//     client has given up. Sixty concurrent feature-length submissions
//     against a 2-worker pool is genuinely past capacity, and shedding the
//     overflow with 503 + Retry-After is the correct answer rather than a
//     shortfall of this number. If a deployment sees these 503s under
//     ordinary load, the fix is DOCTOR_WORKER_POOL_SIZE, not a bigger
//     budget — README's env table says so.
//   * Occupancy is bounded TIGHTER by this split, not looser: the running
//     budget now measures execution alone, uncontaminated by queue wait,
//     which is what Decision #7 said it was for.
//
// ── WHERE IT IS ENFORCED ────────────────────────────────────────────────────
// server/nvm/analyze/doctor-pool.ts, on the WORKER path only, using the same
// primitive Cancel already uses (terminate the worker — the doctor is a
// synchronous CPU loop with no await point at which a cooperative flag could
// be observed, so terminating is the only cancellation that actually stops
// the work). The in-process fallback (DOCTOR_WORKER_POOL=off, a host that
// cannot spawn workers, and deep read) therefore has no budget for exactly
// the same reason it has no Cancel: there is nothing to terminate. That is
// stated here rather than left for someone to discover.
//
// This module is deliberately a LEAF: it imports nothing, so server/app.ts's
// global error handler can recognize the error without pulling the analyzer's
// module graph into every request.

/** Default per-analysis wall-clock budget — how long one analysis may OCCUPY
 *  a worker, measured from dispatch. See this file's header for the
 *  derivation; change it there, with a measurement, not here alone. */
export const DOCTOR_ANALYSIS_BUDGET_DEFAULT_MS = 30_000;

/** Default queue-wait budget — how long a submission may WAIT for a free
 *  worker, measured from submission to dispatch. Deliberately larger than the
 *  running budget: queue wait is contention, not the draft's cost. Bounded
 *  above by the client's 120 s watchdog minus the running budget. See this
 *  file's header, "TWO BUDGETS, NOT ONE", for the full derivation and for
 *  what this number does NOT claim. */
export const DOCTOR_QUEUE_BUDGET_DEFAULT_MS = 60_000;

/** The client's own diagnosis watchdog
 *  (src/components/scriptide/ScriptDoctorPanel.tsx). Both budgets, and their
 *  SUM, must stay under it or the writer meets the panel's generic timeout
 *  copy instead of one of the registered sentences below. Asserted in
 *  tests/core/doctor-analysis-budget.test.ts. */
export const CLIENT_DIAGNOSIS_WATCHDOG_MS = 120_000;

/** Upper bound on what an operator may configure. A budget above this is
 *  indistinguishable from no budget at all for a human waiting on a page, and
 *  every HTTP client in front of this server times out long before it. */
const DOCTOR_ANALYSIS_BUDGET_MAX_MS = 600_000;

export const DOCTOR_ANALYSIS_BUDGET_ERROR_NAME = 'DoctorAnalysisBudgetExceededError';

/**
 * The configured budget in ms, or 0 when the operator has switched it off
 * (`DOCTOR_ANALYSIS_BUDGET_MS=0` or `=off`).
 *
 * Read per call rather than at import time so a test (and an operator using a
 * process manager that rewrites the environment) sees the current value.
 *
 * An unparseable or out-of-range value falls back to the default rather than
 * throwing: this is a bounding mechanism, and a mechanism that exists to keep
 * the product up must never be the thing that takes it down over a typo in an
 * env var — the same "NEVER WORSE THAN BEFORE" property doctor-pool.ts's own
 * header states for the pool itself.
 */
export function doctorAnalysisBudgetMs(): number {
  const raw = process.env.DOCTOR_ANALYSIS_BUDGET_MS;
  if (raw === undefined || raw === '') return DOCTOR_ANALYSIS_BUDGET_DEFAULT_MS;
  if (raw === 'off') return 0;
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0 || value > DOCTOR_ANALYSIS_BUDGET_MAX_MS) {
    return DOCTOR_ANALYSIS_BUDGET_DEFAULT_MS;
  }
  return Math.floor(value);
}

/**
 * The configured queue-wait budget in ms, or 0 when switched off
 * (`DOCTOR_QUEUE_BUDGET_MS=0` or `=off`). Same per-call read, same
 * never-throw fallback and same ceiling as doctorAnalysisBudgetMs above —
 * see this file's header for why this is a SEPARATE, larger number rather
 * than a reuse of the running budget.
 */
export function doctorQueueBudgetMs(): number {
  const raw = process.env.DOCTOR_QUEUE_BUDGET_MS;
  if (raw === undefined || raw === '') return DOCTOR_QUEUE_BUDGET_DEFAULT_MS;
  if (raw === 'off') return 0;
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0 || value > DOCTOR_ANALYSIS_BUDGET_MAX_MS) {
    return DOCTOR_QUEUE_BUDGET_DEFAULT_MS;
  }
  return Math.floor(value);
}

/** Human-readable rendering of the budget for the writer-facing sentence —
 *  seconds when the budget is at least a second (the only shape a deployment
 *  ever uses), milliseconds below that (the shape a test uses). */
function renderBudget(budgetMs: number): string {
  return budgetMs >= 1000 ? `${Math.round(budgetMs / 1000)}s` : `${budgetMs}ms`;
}

/**
 * The one writer-facing sentence for this state — registered in
 * docs/CLAIMS_REGISTER.md (row 72). It says three true things and no more:
 * the run was stopped, nothing was scored, and what the writer can do next.
 * It deliberately does not promise that a retry will succeed (on the same
 * draft and the same server it usually will not) or that the draft is at
 * fault (a contended box can cross the budget on a draft that is fine).
 */
export function doctorAnalysisBudgetSentence(budgetMs: number): string {
  return `This draft took longer to analyze than this server's per-analysis budget (${renderBudget(budgetMs)}), so the run was stopped and nothing was scored. Try again, or split the draft into shorter files and analyze them separately.`;
}

/**
 * The writer-facing sentence for a submission dropped while it was still
 * WAITING for a free worker — registered in docs/CLAIMS_REGISTER.md (row 73),
 * and deliberately a different sentence from the one above rather than the
 * same one reused.
 *
 * Every clause of the running sentence is false in this state (round-2 review
 * finding, reproduced at 40 of 60 concurrent legitimate requests): the draft
 * did not take longer than any budget, it never ran at all, and "split the
 * draft into shorter files" points at a remedy that cannot help. So this one
 * names the SERVER, says explicitly that the draft is not the problem, and
 * gives the only advice that is actually actionable — when to come back.
 *
 * `retryAfterSeconds` is the pool's own estimate (queue depth ÷ pool size ×
 * mean recent job time, capped) — the same number that goes in the
 * `Retry-After` header, said in words so it also reaches the SSE path, which
 * cannot send headers once its stream has opened.
 */
export function doctorQueueBudgetSentence(budgetMs: number, retryAfterSeconds: number): string {
  return `This server is busy: your draft waited longer than the ${renderBudget(budgetMs)} it allows for a free analysis slot, so the run never started and nothing was scored. Nothing is wrong with the draft — try again in about ${retryAfterSeconds} second${retryAfterSeconds === 1 ? '' : 's'}.`;
}

/**
 * Thrown by the doctor worker pool when a submission crosses one of the two
 * budgets. `state` says WHICH, and it decides everything a caller can see:
 *
 *   'running' -> 400 + doctorAnalysisBudgetSentence (row 72). The draft's own
 *     cost, deterministic for a given draft on a given server, matching the
 *     Fountain shape guard's own analysis-cost 4xx
 *     (MAX_FOUNTAIN_VOICE_ELIGIBLE_WEIGHT answers 400 while saying in its own
 *     message that it is "a cast-size and analysis-cost limit, not a
 *     formatting error"). Decision #7's rejection of a 5xx here stands: it
 *     would invite a blind retry of a deterministic outcome.
 *
 *   'queued'  -> 503 + Retry-After + doctorQueueBudgetSentence (row 73).
 *     Contention, not the draft: not deterministic, retrying later IS the
 *     correct client behaviour, and a 400 would additionally file server
 *     contention inside client-error metrics where no operator would find it.
 *
 * `status` is read by server/app.ts's global error handler, which answers the
 * same `{ error }` body shape the shape guard's 4xx uses in both cases.
 */
export class DoctorAnalysisBudgetExceededError extends Error {
  readonly budgetMs: number;
  readonly state: 'running' | 'queued';
  readonly status: 400 | 503;
  /** Present only for `state: 'queued'` — seconds, for the `Retry-After`
   *  header. Never sent on the running half, where a retry of the same draft
   *  on the same server is expected to fail the same way. */
  readonly retryAfterSeconds?: number;
  constructor(budgetMs: number, state: 'running' | 'queued' = 'running', retryAfterSeconds?: number) {
    super(state === 'queued'
      ? doctorQueueBudgetSentence(budgetMs, retryAfterSeconds ?? 1)
      : doctorAnalysisBudgetSentence(budgetMs));
    this.name = DOCTOR_ANALYSIS_BUDGET_ERROR_NAME;
    this.budgetMs = budgetMs;
    this.state = state;
    this.status = state === 'queued' ? 503 : 400;
    if (state === 'queued') this.retryAfterSeconds = retryAfterSeconds ?? 1;
  }
}

/** Recognizes the error above. Checks the NAME as well as the prototype so a
 *  duplicate module instance (a worker realm, a test that re-imports this
 *  file under a different specifier) cannot make the check silently false. */
export function isDoctorAnalysisBudgetExceeded(err: unknown): err is DoctorAnalysisBudgetExceededError {
  return err instanceof DoctorAnalysisBudgetExceededError
    || (err instanceof Error && err.name === DOCTOR_ANALYSIS_BUDGET_ERROR_NAME);
}
