---
type: surface
updated: 2026-09-12
sources: [src/components/scriptide/ScriptDoctorPanel.tsx, src/lib/diagnostic-copy.ts, src/lib/percentile-copy.ts, src/lib/finding-jump.ts, server/nvm/analyze/doctor.ts, tests/core/script-doctor.test.ts, tests/core/finding-jump.test.ts, src/lib/priorities-copy.ts, server/lib/strengths-copy.ts, server/lib/scene-ranges.ts, server/lib/priority-selection.ts]
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
ONE control in Coverage and said nothing at all about the rest. Only 29 of
those 374 are TAB STOPS: the note is focusable on the act-on surfaces (top
priorities, root-cause headlines, expander-revealed member rows) and not in
the Per-Pass Breakdown appendix, which is a list to read. Measured focusable
elements in the Full Report: 1,640 -> 1,295 on the fixture, 291 -> 211 on the
built-in sample. The reason stays in `title` and in `aria-label` on a
`role="note"`, so screen-reader reading order is unaffected either way.

**Root-cause card counts** (2026-09-06, discovery item #10): the card used to
say "15 issues converge here" directly above "SHOW THE 12 CONTRIBUTING
NOTES" — two numbers, one word, one card. They count different things and
both are true: 15 individual notes fired, from 12 distinct rules. The panel
now states the writer-facing size as ISSUES (`memberCount`, which is also
what the server's own explanation sentence leads with and what
`cluster.ts` sorts by), shows both numbers where they differ
("15 issues from 10 rules" — the first such card on the feature fixture, as
rendered), and names the expander after what it actually lists ("Show the 10
rules behind them"). 30 of that fixture's 70 root causes disagree this way. `rootCauseCountSentence()` /
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
(`src/hooks/useIdempotentState.ts`), which `ScriptIDE.tsx`'s title-page
autofill also now uses with a STRUCTURAL equals — that writer allocates a
fresh object every keystroke and was one condition away from the same ratchet
through a different setter. Guarded by
`tests/core/scriptide-render-loop-guard.test.ts` and by
`scripts/verify-p2-p3-surfaces.mjs`'s `P2-featurelen` phase, which is
fail-first: 3/3 failures on a tree with the one line reverted, 0/3 on this
one. See [[Patterns]], "No fixture at product length" (why it shipped) and
"A harness that hides the defect it is pointed at" (why the gate needed
non-awaited key delivery to catch it).

**Browser suite:** `scripts/verify-p2-p3-surfaces.mjs` (`P2-generative`
phase drives this panel with Labs on and off from the same starting point;
`P2-featurelen` drives it on
`tests/fixtures/feature-length/assembled-feature.fountain`, 231 scenes —
the only suite in the repository that runs at product length);
`scripts/verify-a11y.mjs` covers it in the accessibility sweep;
`scripts/smoke-p0-live-flow.mjs` step 3e drives the budget-stopped state
against a live keyless server and asserts the sentence, the Retry, and the
recovery.

**Three wordings this panel used to own alone (2026-09-11).** Each was the
panel's own copy of a fact two exported documents also stated, and each had
drifted:

- the root-cause scene label (`scene${s} 1, 2, 3`) is now
  `formatSceneList` from `server/lib/scene-ranges.ts` — see
  [[Surface - Root Cause Pipeline]] and `docs/CLAIMS_REGISTER.md` row 91.
- the priorities heading ("Top Priorities") is now `prioritiesHeadingFor` from
  `src/lib/priorities-copy.ts`, which also stops the heading promising a list
  over a single item (row 87).
- the strengths section's title and caption come from
  `server/lib/strengths-copy.ts` (row 86).

Both headline-percentile sites also moved to the GATED helpers in
`src/lib/percentile-copy.ts`, so the panel says "not comparable" — and
withholds the exact-rank tooltip — for a draft outside the calibration
reference set's scene and word band, exactly as every other surface does
(row 88).

**Two numbers this panel presented as health, and five badges that read
backwards (2026-09-12, adversarial findings #9, #4 and #14).**

On the product's own demo script one report stated THREE different health
numbers: the header's `VERDICT CONSIDER · HEALTH 78`, "Health score: 35/100" in
Story Structure Analysis, and "Graph Health 37/100 **−9hp**" in Structural
Analysis — the last in the header's own "hp" unit, in stamp red, with no caption,
so nine points looked subtracted when nothing was. `server/nvm/analyze/types.ts`
already said what those panels are: `graphDeduction` is "a potential 0–15 point
value, NOT part of health/verdict until repaired graph extraction passes
real-writing calibration." `src/lib/diagnostic-copy.ts` is now the ONE label —
a badge ("Diagnostic — not part of Health") on each section header and a
sentence naming the specific number and denying both the health and the verdict —
and the mid-report line is renamed "Graph health score:" so it stops borrowing
the header's own two words. Both scores and the −Nhp deduction still render;
they are captioned, not removed. `docs/CLAIMS_REGISTER.md` rows 102–103. (The
clue/name half of finding #9 — a protagonist's name read as an unpaid setup —
is scoring-path work and is NOT part of this.)

The five Craft Dimensions badges had the mirror-image problem. The comparability
gate that makes the headline say "not comparable" (row 88, above) never reached
them, so the SAME scrolling document said "not comparable" on line 140 and
"STRUCTURE & PACING TOP 10% · CHARACTER TOP 10% · DIALOGUE & VOICE TOP 10% ·
PLOT LOGIC & PAYOFF TOP 10% · THEME & ORIGINALITY TOP 10%" on lines 367–399.
And `percentileBand(20)` returns "top 80%", which reads as praise: on `runoff`
the badge beside Dialogue & Voice (percentile 20) read "TOP 80%" next to the
score **98**. `src/lib/percentile-copy.ts` now owns
`dimensionPercentileBadgeFor` / `dimensionPercentileTooltipFor` /
`dimensionPercentileCaptionFor` — gated, using `percentileDescriptor`'s own
direction-safe vocabulary, and shared with [[Surface - Coverage HTML]] so the
two can never word one badge two ways. `docs/CLAIMS_REGISTER.md` rows 104–105.

**The badge still ranks a different statistic from the number beside it, and
says so.** `server/nvm/analyze/doctor.ts` ranks `build.rawScore` — unclamped,
scarcity term included — while the badge sits next to the clamped display score.
That is why a 100/100 dimension could read "bottom 10%" and an 81.5 "top 10%":
the badge was a scene-count readout. Re-ranking is a scoring change and was not
made; the tooltip names the mismatch instead. See [[Patterns]] for the shape.

**Two lists and one unapplied deduction (2026-09-12, adversarial findings #8
and #11).** This panel rendered `report.topPriorities` RAW — the only one of the
four surfaces that applied no contradictory-pair suppression, so it could show a
writer a finding the coverage HTML and the coverage letter of the same
`contentHash` had already dropped as contradicted. It now renders
`orderedPriorities` from `server/lib/priority-selection.ts`, memoised on the
report object; see [[Surface - Coverage Letter]] for the measurement that found
it. Separately, the Graph Health card printed `37/100 −9hp`, the −9hp in stamp
red, in the headline health's own unit, for a field
`server/nvm/analyze/types.ts` documents as "NOT part of health/verdict" — the
2026-09-11 lane captioned that number and left the figure. The figure is now
`unappliedDeductionLine` from `src/lib/diagnostic-copy.ts`: conditional
("Would deduct if enabled"), unsigned ("up to 9 pts — not applied"), muted rather
than penalty-coloured, and the same rendering the exported report carries. The
magnitude still prints; nothing is removed.

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
- `src/lib/priorities-copy.ts`; `server/lib/strengths-copy.ts`; `server/lib/scene-ranges.ts`
- `src/lib/diagnostic-copy.ts`; `src/lib/percentile-copy.ts`
- `tests/core/diagnostic-not-health-label.test.ts`,
  `tests/core/dimension-percentile-badge.test.ts`,
  `tests/core/dimension-badge-wiring.test.ts`
- `docs/audits/2026-09-12-adversarial/writer-loop.md` findings 4, 9, 14
- `server/lib/priority-selection.ts`; `src/lib/diagnostic-copy.ts`
- `tests/core/priority-selection-one-list.test.ts`; `tests/core/unapplied-deduction-honesty.test.ts`
- `docs/CLAIMS_REGISTER.md` rows 9, 32-33, 36-38, 49, 72-73, 80-81, 86-88, 91, 102-105 (this panel's claims)
