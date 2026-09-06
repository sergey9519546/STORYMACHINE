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

/** Default per-analysis wall-clock budget. See this file's header for the
 *  derivation; change it there, with a measurement, not here alone. */
export const DOCTOR_ANALYSIS_BUDGET_DEFAULT_MS = 30_000;

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

/** Thrown by the doctor worker pool when one analysis crosses the budget.
 *  `status` is read by server/app.ts's global error handler, which answers
 *  the same `{ error }` body shape the Fountain shape guard's 4xx uses. */
export class DoctorAnalysisBudgetExceededError extends Error {
  readonly budgetMs: number;
  /** Same status as the shape guard's own analysis-cost rejections
   *  (MAX_FOUNTAIN_VOICE_ELIGIBLE_WEIGHT answers 400 and says in its own
   *  message that it is "a cast-size and analysis-cost limit, not a
   *  formatting error"). A 5xx was considered and rejected: it invites a
   *  blind retry of what is, for the same draft on the same server, a
   *  deterministic outcome. */
  readonly status = 400;
  constructor(budgetMs: number) {
    super(doctorAnalysisBudgetSentence(budgetMs));
    this.name = DOCTOR_ANALYSIS_BUDGET_ERROR_NAME;
    this.budgetMs = budgetMs;
  }
}

/** Recognizes the error above. Checks the NAME as well as the prototype so a
 *  duplicate module instance (a worker realm, a test that re-imports this
 *  file under a different specifier) cannot make the check silently false. */
export function isDoctorAnalysisBudgetExceeded(err: unknown): err is DoctorAnalysisBudgetExceededError {
  return err instanceof DoctorAnalysisBudgetExceededError
    || (err instanceof Error && err.name === DOCTOR_ANALYSIS_BUDGET_ERROR_NAME);
}
