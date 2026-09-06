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

**Two budgets, after the round-2 review (2026-09-06).** The first build armed
one timer at submission for both the queue wait and the run, so the sentence
about a slow draft rendered for jobs that had never run — measured at **40 of
60** concurrent legitimate 346 KB features on a 2-worker pool. The halves are
now separate, because only one of them is the draft's fault:

| | bounds | default | answer | sentence |
|---|---|---|---|---|
| `DOCTOR_ANALYSIS_BUDGET_MS` | worker **occupancy**, from dispatch | 30,000 ms | **400** | row 72 |
| `DOCTOR_QUEUE_BUDGET_MS` | the **wait** for a worker, from submission | 60,000 ms | **503** + `Retry-After` | row 73 |

400 for the running half because that outcome is deterministic for a given
draft on a given server (a 5xx would invite a blind retry); 503 for the queued
half for the mirror reason — contention is not deterministic, a retry IS the
right client behaviour, and a 4xx would file server contention inside
client-error metrics. The queue budget is larger on purpose, and its size is
arithmetic with a measurement as the check: the budgets compose, so
60 + 30 = 90 s must stay under the panel's 120 s watchdog (a test asserts that
sum), and re-running the same 60-concurrent burst turned **20 scored / 40
falsely-blamed 400s** into **34 scored / 26 honest 503s** with `Retry-After`
5–66 s. It is not claimed that 60 s admits any burst — nothing under the
watchdog could, and shedding genuine overflow is the right answer; the remedy
for 503s under ordinary load is `DOCTOR_WORKER_POOL_SIZE`.

**What the writer sees:** one registered sentence per state
(`docs/CLAIMS_REGISTER.md` rows 72 and 73) in the panel's existing error state
beside its existing enabled Retry. The queued sentence names the server, says
plainly that nothing is wrong with the draft, gives no "split the draft"
advice, and carries the retry estimate in words — which is how the SSE route,
already past its headers, delivers the same distinction a `Retry-After` header
gives the JSON routes.

**Second amendment (round-3, 2026-09-06) — two consequences of the split,
built rather than deferred:**

- **Admission control.** The queue budget is now checked at SUBMISSION as well
  as by the timer, so a submission the pool already cannot serve is refused at
  once instead of waiting the full 60 s to be told to come back. Measured A/B
  on one binary (`DOCTOR_QUEUE_ADMISSION=off` vs on), **four runs per arm on a
  box carrying other lanes**: first 503 of a wave landing on a saturated pool
  **60,296-60,474 ms -> 853-959 ms in 3 of 4 runs** (the fourth fell back to
  the timer at 60,342 ms because the EWMA had not learned enough by then --
  the mechanism's honest limit, not a defect). Served count **50-52 off vs
  50-54 on**, same median: no measurable difference, which is the property
  that matters. Two biases keep it from shedding work the timer would have
  served: the estimate excludes the job's own execution, and must exceed the
  budget by 1.5x -- the measured over-statement of the estimator at the shed
  boundary. Same 503, same `Retry-After`, same row-73 sentence: same state,
  sooner.
- **Eager respawn after a terminate.** Cancel, a run-budget kill and a purge
  all terminate a worker, and all three used to leave the pool one warm worker
  short until the next submission -- an unrelated writer paid the ~2-3 s cold
  start (measured: `workers: 0` after ten kills, 9,513 ms for the next
  ordinary submission). A replacement is now warmed through the same path boot
  uses. This is also where **Cancel's** long-standing version of that cost is
  finally written down. The first build of it RACED shutdown: a replacement
  could spawn after `shutdownDoctorPool()` had resolved, hanging the process
  and turning a clean SIGTERM into exit 1 ten seconds late. Closed with a
  shutdown generation, a bounded drain of in-flight respawns, and an
  orphan-terminating `finally` (probe: exit 124 -> exit 0, workers 0, no
  MessagePort).

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
