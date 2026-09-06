---
type: decision
updated: 2026-09-06
sources: [docs/DECISION_LOG.md, server/lib/doctor-budget.ts, server/nvm/analyze/doctor-pool.ts, server/app.ts, README.md]
status: active
---

# Decision #7 — Bound One Analysis by Wall Clock, Not by Shape (2026-09-06)

Eight review rounds against the Fountain shape guard
(`server/lib/validation.ts`) took the worst accepted `POST
/api/scriptide/doctor` from **343,598 ms** down to **~12–14 s**. What is left
at ~14 s is not a guard defect: it is a draft at the analyzer's own 400-scene
ceiling with a large cast and one short-spoken character, where the guard and
the analyzer **agree** and the thirteen non-voice passes simply do correct
work. The round-7 reviewer referred it upward — *"a request-timeout/pool
question, not a validation-guard one"* — and this decision is the ruling.

**Decided:** a configurable per-analysis wall-clock budget,
`DOCTOR_ANALYSIS_BUDGET_MS`, default **30,000 ms**, enforced in the doctor
worker pool with the same primitive [[Surface - Script Doctor Panel]]'s Cancel
already uses — terminate the worker, because `runScriptDoctor` is a
synchronous CPU loop with no await point at which a cooperative flag could be
observed.

**Where 30 s comes from:** measured accepted worst case **13,765 ms** (800
distinct cues × 15 occurrences, 632,427 chars, 389 scenes; the round-7
reviewer measured the same family at 12,340–13,566 ms under load), **2×
headroom** → ~28 s → 30 s; the same number `DOCTOR_POOL_PREWARM_TIMEOUT_MS`
already defaults to; and below the panel's own 120 s watchdog so the writer
reads the honest sentence rather than a generic timeout.

**What the writer sees:** one registered sentence
(`docs/CLAIMS_REGISTER.md` row 72) in the panel's existing error state beside
its existing Retry. JSON routes answer `400 { error }` — the same status and
body shape the shape guard's own analysis-cost 4xx uses; the SSE route, which
has already flushed headers, sends the identical string in a `doctor_error`
frame.

**Deliberate limits, written down rather than discovered:** the budget applies
to the **worker path only** (with `DOCTOR_WORKER_POOL=off`, on a host that
cannot spawn workers, or on deep read there is nothing to terminate — the same
carve-out Cancel already has); it is armed at **submission**, not dispatch,
because queue time is the writer's wall clock too; and it changes **no**
scoring-path file — `check-scoring-receipt` reports none changed and the
doctor output-identity harness is 45/45 byte-identical.

The point is not that this rejects the ~14 s document — at 30 s it does not,
by design. The point is that no submission can occupy a worker unboundedly
again, whoever adds the next slow pass. See [[Gate - Receipt Gate]] for why a
change like this one is allowed to leave the scoring path alone.

## Sources

- `docs/DECISION_LOG.md` — "Decision #7"
- `server/lib/doctor-budget.ts` (the number, its derivation, the sentence,
  the typed error), `server/nvm/analyze/doctor-pool.ts` (enforcement),
  `server/app.ts` (the 400), `server/routes/scriptide.ts` (the SSE frame)
- `tests/core/doctor-analysis-budget.test.ts`,
  `tests/routes/doctor-analysis-budget.test.ts`,
  `scripts/smoke-p0-live-flow.mjs` step 3e
- `docs/audits/2026-09-06-mistake-search/serverfix2-review.md` §7.7 (the
  measurement and the referral)
