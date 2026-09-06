---
type: surface
updated: 2026-09-05
sources: [src/components/scriptide/ScriptDoctorPanel.tsx, server/nvm/analyze/doctor.ts, tests/core/script-doctor.test.ts]
status: active
---

# Surface — Script Doctor Panel

**Files:** `src/components/scriptide/ScriptDoctorPanel.tsx` (the panel and
its subcomponents — `DraftRankLine`, `FixReceiptCard`, `ShapeRhythmSection`);
rendered from `server/nvm/analyze/doctor.ts`'s `ScriptDoctorReport`, which
is the shared module every other surface in this list also reads from.

**What it shows:** health, grade, verdict, top priorities, a health
percentile against the 20-sample hand-authored synthetic reference set
(`compactPercentileNote()`, `src/lib/percentile-copy.ts`), and a draft-rank
line ("rank among your drafts: N of M runs and saved drafts of this
script") built from `src/lib/draft-rank-copy.ts`'s shared helpers — the
same helpers [[Surface - Coverage HTML]] and [[Surface - Coverage Letter]]
call, so the three surfaces never re-implement the wording independently
(see [[Patterns]], "one value rendered by N hand-written sentences"). The
`ShapeRhythmSection` shows two structural-signal aggregates (talk/action
swing, action-prose variation) labeled "descriptive only, not part of the
score" — read from `server/nvm/analyze/structural-signals.ts`, no lexicon
involved.

**When a run does not finish**
([[Decision 7 - Per-Analysis Wall-Clock Budget]], 2026-09-06):
the analysis runs on a worker thread
(`server/nvm/analyze/doctor-pool.ts`) under a per-analysis wall-clock budget,
`DOCTOR_ANALYSIS_BUDGET_MS` (default **30,000 ms** — derived from a measured
~14 s accepted worst case with 2× headroom, and kept below this panel's own
120 s diagnosis watchdog so the writer reads the honest sentence rather than
the generic timeout copy). Crossing it terminates the worker exactly the way
this panel's **Cancel** button already does, and the writer meets one
registered sentence (`docs/CLAIMS_REGISTER.md` row 72) in this panel's
existing error state beside its existing Retry — delivered as `400 { error }`
on the JSON doctor routes and as a `doctor_error` frame on
`POST /api/scriptide/doctor/stream`. The budget applies to the **worker path
only**: with `DOCTOR_WORKER_POOL=off`, on a host that cannot spawn workers, or
on the deep-read route the analysis runs in-process, where there is nothing to
terminate — the same carve-out Cancel already has, and the panel's Cancel copy
already says so.

**Browser suite:** `scripts/verify-p2-p3-surfaces.mjs` (`P2-generative`
phase drives this panel with Labs on and off from the same starting point);
`scripts/verify-a11y.mjs` covers it in the accessibility sweep;
`scripts/smoke-p0-live-flow.mjs` step 3e drives the budget-stopped state
against a live keyless server and asserts the sentence, the Retry, and the
recovery.

## Sources

- `src/components/scriptide/ScriptDoctorPanel.tsx`
- `server/lib/doctor-budget.ts`, `server/nvm/analyze/doctor-pool.ts`
- `tests/core/script-doctor.test.ts`,
  `tests/core/doctor-analysis-budget.test.ts`,
  `tests/routes/doctor-analysis-budget.test.ts`
- `docs/CLAIMS_REGISTER.md` rows 9, 32-33, 36-38, 49, 72 (this panel's claims)
