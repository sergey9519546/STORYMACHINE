---
type: surface
updated: 2026-09-06
sources: [src/components/scriptide/ScriptDoctorPanel.tsx, src/lib/finding-jump.ts, server/nvm/analyze/doctor.ts, tests/core/script-doctor.test.ts, tests/core/finding-jump.test.ts]
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
(`server/nvm/analyze/doctor-pool.ts`) under **two** wall-clock budgets, and
which one fires decides what this panel renders:

- **`DOCTOR_ANALYSIS_BUDGET_MS`** (default **30,000 ms**, derived from a
  measured ~14 s accepted worst case with 2× headroom) bounds how long an
  analysis may OCCUPY a worker. Crossing it terminates the worker exactly the
  way this panel's **Cancel** button already does, and the writer meets
  `docs/CLAIMS_REGISTER.md` **row 72** — `400 { error }` on the JSON doctor
  routes, a `doctor_error` frame on `POST /api/scriptide/doctor/stream`.
- **`DOCTOR_QUEUE_BUDGET_MS`** (default **60,000 ms**) bounds how long a
  submission WAITS for a free worker. That is server contention, not the
  draft, so it gets **row 73** instead — a different sentence naming the
  server, with no "split the draft" advice — and **503** with a `Retry-After`
  the pool estimates from its own queue depth and recent job times. Before
  this split, 40 of 60 concurrent legitimate requests read row 72's
  draft-blaming copy for analyses that had never started.

The queue half is enforced twice (round-3): once at **submission**, so a
writer whose draft the pool already cannot take is told in milliseconds rather
than after a minute of waiting (measured 60.4 s → 1.1 s on a saturated pool),
and once by the timer, for a submission admitted before the queue grew behind
it. Cancelling from this panel, and a run-budget kill, both terminate the
worker — and now warm a replacement eagerly, so the NEXT writer no longer pays
the ~2–3 s cold start those terminations used to leave behind.

Either way the sentence lands in this panel's existing error state beside its
existing **enabled** Retry, and the sum of the two budgets is asserted to stay
under this panel's own 120 s diagnosis watchdog so the writer reads a
registered sentence rather than the generic timeout copy. Both budgets apply
to the **worker path only**: with `DOCTOR_WORKER_POOL=off`, on a host that
cannot spawn workers, or on the deep-read route the analysis runs in-process,
where there is nothing to terminate — the same carve-out Cancel already has,
and the panel's Cancel copy already says so.

**One jump affordance per finding** (2026-09-06, discovery item #9): every
row this panel renders that the server resolved to a line span — each of the
ten top priorities, each per-pass issue, each root-cause headline, and (new)
each contributing RULE inside a root cause's expander — carries the same
control, from one implementation: `FindingJump`
(`src/components/scriptide/FindingJump.tsx`) over `src/lib/finding-jump.ts`.
The accessible name IS the destination — **"Jump to scene N"** when the
server anchored the finding to a scene, **"Jump to line N"** for a
line-precise or character anchor — and the anchor tier, not a guess, picks
the word. [[Surface - Coverage HTML|Coverage]]'s own What-next control reads
the same helper, so the two surfaces can no longer name one concept two ways
(they used to: `Jump to line 136` here, `Jump to "<prose location>" in the
script` there).

A finding with **no** honest span no longer renders nothing. It renders a
keyboard-reachable "NO LOCATION" note whose hover/focus text says which kind
of nothing it is: a whole-draft (act-level or cross-scene-pattern) finding,
or one the report could not resolve to a line. On the 231-scene fixture that
is 374 notes beside 605 jump controls — before this change the panel offered
ONE control in Coverage and said nothing at all about the rest.

**Root-cause card counts** (2026-09-06, discovery item #10): the card used to
say "15 issues converge here" directly above "SHOW THE 12 CONTRIBUTING
NOTES" — two numbers, one word, one card. They count different things and
both are true: 15 individual notes fired, from 12 distinct rules. The panel
now states the writer-facing size as ISSUES (`memberCount`, which is also
what the server's own explanation sentence leads with and what
`cluster.ts` sorts by), shows both numbers where they differ
("15 issues from 12 rules"), and names the expander after what it actually
lists ("Show the 12 rules behind them"). `rootCauseCountSentence()` /
`rootCauseExpanderLabel()` in `src/lib/finding-jump.ts` are the only place
that wording lives; `docs/CLAIMS_REGISTER.md` row 80 registers the sentence (row 81 registers the jump control's own naming rule and its two "no location" reasons).

**Typing into a feature-length draft** (2026-09-06, discovery item #1): with
this panel's report on screen, typing a new scene into a 231-scene draft used
to throw React error #185 ("Maximum update depth exceeded") out of the
editor's CodeMirror update listener. The cause was not this panel — it was a
per-keystroke no-op `setSaveStatus` write in `ScriptIDE.tsx`'s localStorage
persistence effect that React could not bail out of while the same fiber had
the keystroke's own update pending, so every commit ended with pending lanes
and the nested-update counter never reset. Fixed with `useIdempotentState`
(`src/hooks/useIdempotentState.ts`); guarded by
`tests/core/scriptide-render-loop-guard.test.ts` and by
`scripts/verify-p2-p3-surfaces.mjs`'s `P2-featurelen` phase. See
[[Patterns]], "No fixture at product length", for why it shipped.

**Browser suite:** `scripts/verify-p2-p3-surfaces.mjs` (`P2-generative`
phase drives this panel with Labs on and off from the same starting point;
`P2-featurelen` drives it on
`tests/fixtures/feature-length/assembled-feature.fountain`, 231 scenes —
the only suite in the repository that runs at product length);
`scripts/verify-a11y.mjs` covers it in the accessibility sweep;
`scripts/smoke-p0-live-flow.mjs` step 3e drives the budget-stopped state
against a live keyless server and asserts the sentence, the Retry, and the
recovery.

## Sources

- `src/components/scriptide/ScriptDoctorPanel.tsx`,
  `src/components/scriptide/FindingJump.tsx`, `src/lib/finding-jump.ts`
- `src/hooks/useIdempotentState.ts`, `src/hooks/idempotent-state.ts`
- `server/lib/doctor-budget.ts`, `server/nvm/analyze/doctor-pool.ts`
- `tests/core/script-doctor.test.ts`,
  `tests/core/doctor-analysis-budget.test.ts`,
  `tests/routes/doctor-analysis-budget.test.ts`,
  `tests/core/finding-jump.test.ts`,
  `tests/core/scriptide-render-loop-guard.test.ts`
- `docs/CLAIMS_REGISTER.md` rows 9, 32-33, 36-38, 49, 72-73, 80-81 (this panel's claims)
