# Independent review — layout / reachability lane (B-8, B-9, B-10, B-13, area-6, golden-path hole)

## Round 1

Reviewer: independent (did not build the change). Read-only — the worktree was never edited; final
`git status --porcelain` empty. Four Playwright probes in
`/tmp/<session scratch>/layout-review/` (`p1.mjs`–`p4.mjs`, logs beside them), each against a keyless
server booted from this worktree's own `dist/` (verified fresh: `md:!hidden` and `min-w-[24px]`
present in the built bundles). Every server shut down; final `ps aux | grep "[s]erver.ts"` → no match.

Worktree `/home/user/STORYMACHINE/.claude/worktrees/agent-ab256a3d99ff7c156`, branch
`worktree-agent-ab256a3d99ff7c156`, three commits `014653ba`, `1a171862`, `c2b3f27a` on `main`
`4cbaf02f` (tag `audit/2026-09-05/layout-round1`), 12 files, +704/−35. Budget-limited pass as
instructed: diff reading, four driven probes, the three touched unit tests, the scoring receipt. No
full `npm test`, no eight-suite battery.

**Verdict: REVISE — one blocking item.** All five brief items are genuinely built and every number
in the report reproduces on my own measurements, including the two the lane flagged as narrowings
(both of which I judge acceptable — see §3). But the new disabled state introduced for item 2 ships
a *registered* sentence — claims-register row 61, "Coverage is still running — the full report opens
as soon as it finishes." — that I measured to be **false in two states reachable in two clicks from
the product's front door**: after a Cancel, and after a failed run, where the coverage panel says
"COVERAGE FAILED" on the same screen as the toolbar's "still running". LANE_STANDARD §2 is explicit
about that case. It is a small fix; items 2–7 below are non-blocking.

---

## 1. Brief vs diff

| # | Brief item | Status | Evidence (file:line + what I measured) |
|---|---|---|---|
| 1 | B-8: find the overlap, give the action row its own stacking context or normal flow; add a 375 px real-pointer click step, and the same for the 1280 px Studio tabs (area 6) | **DONE** | "Full report" removed from both in-scroll sites (`CoverageSummary.tsx:613-621` incomplete branch, `:705-735` the What-next row) and re-rendered as a `shrink-0` footer outside `sm-panel-body`'s scroll region (`:764-786`). Driven (`p1.mjs`): at **375×720** `rect {x:13, y:677, w:350, h:31}`, `document.elementFromPoint` at its own centre = `{tag:"BUTTON", text:"Full report"}`, real non-force click opens the dialog; the scroll container's bottom (664) exactly meets the bar's top (664) — `overlapsScroller:false`, so the bar covers no content. Same at **1280×800**. Report's own AFTER rect (`y:677`) reproduces to the pixel. Area 6: `md:!hidden` (`ScriptIDE.tsx:3059`) compiles to `.md\:\!hidden{display:none!important}` **inside** `@media(min-width:48rem)` — verified in `dist/assets/index-*.css`; at 1280 the close button computes `display:none` and **all 7** group tabs take a real click with `elementFromPoint` resolving to the tab itself (6 of 7 — see §4.3); at 375 the button is still `display:flex`, hit-tests to itself, and closes the drawer (`p4.mjs`), so no affordance was removed. |
| 2 | Golden path must never open cold; add the earliest-instant click and prove it fails first | **DONE** | `ScriptIDE.tsx:2323-2324` (`coverageSummaryLoadingCold`), wired at `:2729-2740`; `CoverageSummary.tsx:227-233` (`onStatusChange`), `:64` (prop). Driven (`p1.mjs`): at the toggle's earliest **attached** instant, `disabled:true`; a real click is refused; `WRITE SOME SCRIPT CONTENT` never appears; after the run the panel's own button hydrates the full report, and the whole flow makes exactly **one** `POST /api/scriptide/doctor/stream`. Gate at `scripts/smoke-p0-live-flow.mjs:127-167`; the report's fail-first log (partial fix → cold dialog) is consistent with the mechanism I traced in the code. |
| 3 | B-9: 24 px minimum bar width; a selected-scene detail line in a live region sharing the tooltip's sentence | **DONE** | `ScriptDoctorPanel.tsx:631` (`selectedSceneIdx`), `:729-760` (never `disabled`, `onClick`/`onFocus` select, `min-w-[24px]`), `:778-794` (the `role="status" aria-live="polite"` line). Driven at 375 (`p2.mjs`): 12 bars, **every one exactly 24.00 × 40.00 px**, `disabled:false`, strip still `scrollWidth > clientWidth`. Live region text on load = scene 1's full reading with zero interaction; clicking bar 12 → scene 12's; focusing bar 5 → scene 5's; and `live.textContent === bars[4].title` is **true**, so the two call sites provably cannot drift. |
| 4 | B-10: honest one-scene line plus the aggregates that ARE defined, mirrored in coverage-html (one-scene line only) and coverage-letter | **DONE** | `ScriptDoctorPanel.tsx:837-886` (`ShapeRhythmUnscored`), rendered at `:5156-5172`; `coverage-html.ts:999-1021`; `coverage-letter.ts:325-341`. Driven end to end on one real one-scene draft: panel renders "Shape & Rhythm needs at least two scenes; this draft has 1." + `ACTION-PROSE VARIATION 0.92`; `POST /api/export/coverage` renders the identical sentence + `action-sentence variation 0.92`; `POST /api/export/coverage-letter` renders its own prose with "…this draft has 1… is 0.92." **Same number and same scene count on all three surfaces.** `git diff main..HEAD -- server/lib/coverage-html.ts` touches only `buildStructuralSignalsSection` — the STYLES block is untouched, as required. `meanAbsDialogueShareDelta` is correctly never named (0 by construction at one scene). |
| 5 | B-13: key rows by `SlateFile.id`; dedupe identical submissions with a visible note through `problems[]` | **DONE, key narrowed (declared)** | Dedupe at `SlatePanel.tsx:259` (`seenTexts`) and `:285-289` (the note); keys at `:721` and `:753` → array index, not `SlateFile.id`. Driven (`p2.mjs`): the note reads exactly `"alpha-copy.fountain" skipped — already in this slate (identical to "alpha").`, the ranked table has **2** rows not 3, and **zero** console errors including zero "same key" errors. See §3 for my judgement on the index key — I tested it the way the coordinator asked and it holds. |
| — | Constraints | **HELD** | `node scripts/check-scoring-receipt.mjs main..HEAD` → exit 0, "no scoring-path files changed". `docs/brain/**`, `SnapshotManager.tsx`, `scripts/verify-a11y.mjs` and coverage-html's STYLES block untouched (not in the 12 changed files / not in the diff hunks). Four new sentences registered as rows 61–64. |

Touched unit tests re-run here: `shape-rhythm-panel-copy` **37/37**, `coverage-html` **48/48**,
`coverage-letter` **45/45**.

## 2. Register rows 61–64 — do they quote shipped sentences?

Yes, with one collision to resolve at merge:

- **61** "Coverage is still running — the full report opens as soon as it finishes." — byte-identical
  to the `title` I read off the live DOM at the earliest instant. **But see REVISE item 1: this
  sentence is not true in every state that renders it, so its "supported" status is not yet earned.**
- **62** "Shape & Rhythm needs at least two scenes; this draft has … ." — matches the panel and the
  exported HTML verbatim (both render "…this draft has 1.").
- **63** the letter's separately-worded sentence — matches the letter body verbatim.
- **64** `"…" skipped — already in this slate (identical to "…").` — matches the rendered note.
- **Collision:** `/home/user/STORYMACHINE/.claude/worktrees/agent-aadffb46506a968c2` also appends a
  **row 61** ("This is your first saved draft of this script — a rank among your own…"). Both lanes
  appended at the end of a 60-row file. Whichever merges second must renumber; the brief anticipated
  this ("renumber on rebase"), so this is an orchestrator note, not a lane defect.
- **Merge-conflict warning (same class):** this lane rewrites the `key=` attribute on the two `<tr>`
  elements at `SlatePanel.tsx:721`/`:753`; the a11y-dark lane (`agent-a768be3513a68c292`) rewrites
  the `className=` attribute on those **same two elements** (`bg-white dark:bg-zinc-900` → `rowBg`).
  Both changes are correct and independent; they will conflict textually.

## 3. The two declared narrowings

**(a) Array-index keys instead of `SlateFile.id`.** The lane's reasoning is sound (`SlateEntry` has
no id to correlate back to `SlateFile`; threading one through would touch `SlateBodySchema`,
`server/lib/slate.ts` and `server/routes/export.ts`), and I tested the failure mode the coordinator
named — rows removed, reordered, re-ranked:

```
2 scripts, ranked        : ["1 | alpha | 62", "2 | beta | 58"]
+ a 3rd script, re-ranked: ["1 | alpha | 62", "2 | gamma | 61", "3 | beta | 58"]   (order CHANGED)
- one file, re-ranked    : ["1 | gamma | 61", "2 | beta | 58"]                      (rows SHRANK)
console errors: []   duplicate-key errors: 0
```

Every row's rank, title and health stay correctly paired across a reorder and a shrink. The reason
index keys are safe here is structural and I verified it rather than took it: `result.slate` is only
ever replaced wholesale by a successful rank (there is no in-place splice/filter/sort of it after
render) and **no row carries local state** — the only editable control in the drawer, the title
`<input>`, lives in the *file list*, not in this table. **Accept.** The one thing I would add is a
one-line "if this table ever gains per-row state (an expand toggle, a checkbox), the index key stops
being safe" to the existing comment, since the dedupe now guarantees `entry.contentHash` is unique
and would be a drop-in identity key at that point.

**(b) The exact B-8 mechanism did not reproduce.** The lane says so plainly, and I agree with both
halves: there is no absolute/negative-margin CSS in `CoverageSummary.tsx` that could produce the
hunter's literal "elementFromPoint returns the verdict `<p>`", and the fix closes both framings
anyway. I will note the hunter's framing is not obviously wrong either — at 375 px the coverage
`aside` is `fixed … w-full max-w-[400px] z-50`, so it genuinely does hit-test over the toolbar
beneath it (see item 3 below, where a real click on the *toolbar's* "Full report" times out with
Playwright naming the aside's verdict `<p>` as the intercepting element). **Accept.**

## 4. Driven myself — the numbers

**4.1 Golden path at 375 px** (`p1.mjs`)
```
EARLIEST-INSTANT toggle: {"disabled":true,"title":"Coverage is still running — the full report opens as soon as it finishes."}
real click at earliest instant -> REFUSED     cold "write some script content" visible? false
after the run: toggle {"disabled":false,"title":""}
real click on the PANEL sticky-footer button -> CLICKED
after the click: {"cold":false,"hydrated":true,"dialog":true}
POSTs: {"/api/scriptide/doctor/stream":1,"/api/events":2}
```

**4.2 Sticky footer, 375 and 1280, both themes** (`p1.mjs`) — identical in all four combinations:
`hit = BUTTON "Full report"`, `overlapsScroller:false`, button `sm-btn sm-btn--ink w-full` on a bar
`bg-[var(--sm-panel)]`, computed `rgb(242,236,221)` on `rgb(33,29,21)` = **14.24:1**, and the bar's
background `rgb(244,239,226)` **unchanged between light and dark**. Both halves are theme-invariant
`--sm-*` tokens with no `dark:` variant — the convention `design-system.css`'s header states, held.

**4.3 Studio tabs at 1280** (`p1.mjs`) — `close-studio-panel` computed `display:none`, zero-size
rect; `Production/Analysis/Engine/Codex/Research/Versions` each hit-test to themselves and take a
real click; **`Title`** took the real click but its pre-click `elementFromPoint` returned `null`
(the tab is re-rendered by the preceding tab's own click, so the coordinate was momentarily empty) —
a probe artifact, not an interception: nothing else was under it, and the click succeeded.

**4.4 Bars and live region at 375** (`p2.mjs`) — `min width 24.00 px` across all 12 bars,
`disabled:false`, strip scrollable; live region `{role:"status", aria-live:"polite"}`, text equal to
the focused bar's own `title` string.

**4.5 One-scene draft, three surfaces** — panel / HTML / letter, all `sceneCount 1` and all `0.92`.

## 5. REVISE — numbered

1. **BLOCKING — `src/components/ScriptIDE.tsx:2323-2324` (and its `title` at `:2735-2738`): the new
   disabled-toggle sentence is false in two reachable states, and claims-register row 61 records it
   as "supported".** `coverageSummaryLoadingCold` ORs in `toolSlot === "coverage" && doctorAutoSample`,
   and `doctorAutoSample` is cleared in only two places (`:3547` on sample install, `:3584` on panel
   close) — never on a cancelled or failed run. Two reproductions, both from the golden-path entry
   point ("Try sample coverage"), both in `p2.mjs`/`p3.mjs`:

   ```
   after clicking the panel's own "Cancel this coverage run":
     toggle {"disabled":true,"title":"Coverage is still running — the full report opens as soon as it finishes."}
     …still identical 1s later; panel shows "COVERAGE … RUN COVERAGE" on an empty draft

   after the doctor stream returns 500 (route-stubbed):
     toggle {"disabled":true,"title":"Coverage is still running — the full report opens as soon as it finishes."}
     panel  "COVERAGE UNTITLED SCRIPT · NEXT FIX COVERAGE FAILED boom RETRY USE SAMPLE"
   ```

   In the second case two controls on the same screen contradict each other — the panel says the run
   failed, the toolbar says it is still running — which is the same defect class as B-6 in the very
   hunt this lane is answering. LANE_STANDARD §2: *"a sentence that promises something … must be true
   in every state that renders it."* The disabled state itself is defensible (there is nothing to
   open); the sentence is not. Smallest correct fix: word the title from `coverageSummaryStatus`
   rather than a single constant — `loading` → today's sentence; `error` → "Coverage failed — retry
   to open the full report."; `idle`/cancelled → "Run coverage first — the full report opens once it
   finishes." — and register the extra sentences. (Do **not** simply drop the `doctorAutoSample`
   clause: `idle` is precisely the earliest-instant status the clause exists to cover, so removing it
   reopens item 2's race. Clearing `doctorAutoSample` when the child reports a terminal status *after*
   having reported `loading` would also work and keeps one sentence.)

2. **`scripts/smoke-p0-live-flow.mjs:152-156`** — the comment justifies `force: true` with "proven
   directly below via the disabled check", and there is no disabled assertion anywhere in the block;
   the only assertion is `earlyDialogCount > 0`. Either add the one-line check the comment promises
   (it is the property the fix actually establishes, and I measured it as `disabled:true`) or reword.
   As written the gate still catches the regression — a non-disabled button would dispatch the forced
   click and open the dialog — but the comment describes a check that does not exist.

3. **Two buttons share the accessible name "Full report".** With the panel open there are now two:
   ScriptIDE's toolbar toggle and the new sticky-footer button (`page.getByRole('button', {name:'Full
   report'}).count()` → **2**). At 375 px the toolbar one is under the full-width coverage `aside`,
   and a real non-force click on it times out — Playwright names
   `<p class="mt-4 …">CONSIDER — scored in the middle band…</p>` inside the aside as the intercepting
   element (`p1.mjs` first run, log kept). This is pre-existing duplication, and the lane's own new
   gate had to disambiguate with `xpath=…not(ancestor::aside)` (`smoke-p0-live-flow.mjs:150`), which
   is the tell. Cheap fix now that the panel's button is the canonical route: give the toolbar toggle
   a distinct accessible name ("Open full report" / an `aria-label`), and drop the xpath.

4. **`CoverageSummary.tsx:774-780`** — the footer comment says it renders "for every state that has
   something to open a full report on (a completed report, an incomplete one, **or a failure with a
   report shape at all**)". The condition is `status === "success" && report`; error/loading/idle
   never render it. The *condition* is right — it matches the outer gate at `:579`, so no state that
   used to show the button lost it (I checked the incomplete-analysis branch specifically) — only the
   comment overclaims. One clause.

5. **Claims-register collision (orchestrator, not the lane):** `agent-aadffb46506a968c2` also appends
   a row **61**. Renumber whichever merges second, and re-run `honesty-audit`.

6. **Merge-conflict warning (orchestrator):** `SlatePanel.tsx:721`/`:753` — this lane changes `key=`,
   the a11y-dark lane changes `className=` on the same two `<tr>` elements. Both must survive.

7. *(nits)* `aria-pressed` on bars that also navigate reads as a toggle-button contract the bars do
   not otherwise honour; and the one number 0.92 carries three different labels across its three
   surfaces ("Action-prose variation" / "action-sentence variation" / "sentence-length variation
   across the draft's action lines"). The number agrees everywhere, which is what §2 requires; the
   label drift is worth one shared string later, not now.

## 6. What a stronger version would have done

Derived the toolbar toggle's *disabled* state and its *sentence* from one function of
`coverageSummaryStatus` + `coverageReport`, instead of one boolean and one constant string — the same
"one source, every surface" discipline the rest of this diff applies well (item 3's single
`structuralSceneTooltip` feeding both the tooltip and the live region is exactly right, and item 4's
three surfaces agreeing on 0.92 is exactly right). The gap in item 1 is the one place this lane
described a state in prose instead of computing it. Everything else here is the strong version: the
lane found and named the real cascade mechanism behind area 6 rather than adding a z-index, refused
to fake a reproduction it could not get twice, chose the harder dedupe over the easier label, and
self-caught and reported the `g0-04` anchor regression it created.

---

## Round 2

Same reviewer, warm context (LANE_STANDARD §6). Read-only: the worktree was never edited, final
`git status --porcelain` empty. Three probes in `/tmp/<session scratch>/layout-review/`
(`r2.mjs`, `r2b.mjs`, `r2c.mjs`, logs beside them), each against a keyless server booted from this
worktree's own fresh `dist/`. Every server shut down; `pgrep -af "strip-types server.ts"` → no match
at the end.

New commit `a623e9a9` on `c2b3f27a` (tag `audit/2026-09-05/layout-round2`), 14 files, +391/−56;
nothing amended.

**Verdict: MERGE.** The blocking item is closed and I drove it myself in all three states at both
widths — the toggle's sentence now agrees with the coverage panel's own status every time, and the
error case that used to contradict the panel two inches away now reads the honest sentence while the
panel's Retry/Use-sample recovery still works (I recovered from a stubbed 500 end to end). Items 2–5
are built, and item 3's rename did the thing a good rename does: it exposed a genuine
`verify-focus-traps` bug (the restore-focus check had been pointing at a button that unmounts) that
the lane found and fixed. Two orchestrator notes carry forward unchanged; two copy nits below are
non-blocking.

### My seven round-1 items vs the round-2 diff

| # | Round-1 item | Status | Evidence |
|---|---|---|---|
| 1 (BLOCKING) | The toggle's sentence was false after Cancel and after a failed run | **DONE** | `ScriptIDE.tsx:2350-2382` — one `coverageFullReportToggleState` IIFE deriving `disabled` AND `title` together from `coverageSummaryStatus` (+ report + sample-pending), wired at `:2793-2797`; `doctorAutoSample` now also cleared on the `loading → idle` / `loading → error` transition via `prevCoverageSummaryStatusRef` (`:3599`). The earliest-instant clause is kept, not dropped, exactly as required. Driven by me in all three states at 375 and 1280 — table below. Permanent gates at `smoke-p0-live-flow.mjs` steps 3c (route-delayed real run, real Cancel) and 3d (stubbed 500), with fail-first logs in the report. |
| 2 | The `force: true` comment promised a disabled check that did not exist | **DONE** | `smoke-p0-live-flow.mjs:158-165` — a real `await earlyToggle.isDisabled()` with a throw, immediately before the forced click; the comment now says "proven directly **above**". |
| 3 | Two buttons shared the accessible name "Full report" | **DONE, and it caught a real bug** | `ScriptIDE.tsx:2797` `aria-label="Open full report"`, applied only in the ambiguous state (`toolSlot === "coverage" && !coverageFull`), so the visible label is unchanged everywhere. The `xpath=…not(ancestor::aside)` is gone from `smoke-p0-live-flow.mjs` (`:152`, `:214`, `:255`). The rename turned `verify-focus-traps.mjs`'s `getByRole('button', {name:'Full report'})` into a resolver for the **panel's footer button**, which unmounts the instant the dialog opens — the wrong focus-restore trigger; retargeted at `:236` with the reasoning written down. I measured the outcome myself (below): correct, from **both** entry paths. |
| 4 | `CoverageSummary.tsx`'s footer comment overclaimed | **DONE** | `CoverageSummary.tsx:774-783` now states the actual `status === "success" && report` condition and points at the error state's own new sentence. |
| 5 | Claims-register row-number collision | **Left as-is, correctly** | Still collides with `agent-aadffb46506a968c2`'s row 61; this lane now owns 61 (updated), 62, 63 (updated), 64, **65 (new)**. Orchestrator renumbers whichever merges second — unchanged from my round-1 note. |
| 6 | `SlatePanel.tsx` merge conflict with the a11y-dark lane | **Still pending (orchestrator)** | Untouched this round; `key=` (this lane) vs `className=` (a11y-dark) on the same two `<tr>` elements. |
| 7 | Nits: `aria-pressed`; three labels for one number | **DONE, and widened** | `aria-pressed` dropped with a reasoned comment (`ScriptDoctorPanel.tsx:752-760`). New `src/lib/structural-signals-copy.ts` exports the one label, imported by `ScriptDoctorPanel.tsx` (3 sites incl. the fix-receipt strip I had not listed), `coverage-html.ts` (2), `coverage-letter.ts` (3 incl. the intro sentence), **and `WhatIfPanel.tsx:499`** — a fourth surface I missed. Verified not reachable from `doctor.ts` (`grep -rn structural-signals-copy server/nvm/` → nothing) and `check-scoring-receipt main..HEAD` → 0. |

### Driven: the toggle in every state, both widths (`r2.mjs`)

| state | toolbar toggle | coverage panel says |
|---|---|---|
| earliest instant (375 / 1280) | `disabled:true`, "Coverage is still running — the full report opens as soon as it finishes." | (mounting) / "READING THE DRAFT… CANCEL" |
| during loading | `disabled:true`, same sentence | "READING THE DRAFT… CANCEL" |
| after success | `disabled:false`, **no title** | "VERDICT CONSIDER HEALTH 78" |
| **after Cancel** | `disabled:false`, **no title** | "RUN COVERAGE" |
| **after a 500** | `disabled:true`, **"Coverage failed — retry to open the full report."** | "COVERAGE FAILED boom RETRY USE SAMPLE" |

Identical at 375 and 1280. The two states that were false in round 1 are now the two that agree with
the panel most precisely. The visible label stays "Full report" in every state; only the accessible
name differs, and only where it had to.

**Error recovery works end to end** (`r2b.mjs`, server booted directly so its exit code and log were
visible): stub a 500 → panel shows COVERAGE FAILED and the toggle its honest disabled sentence →
click the panel's own **Use sample** → verdict renders → toggle becomes `disabled:false, title:""`.
Server alive throughout (`GET /api/ai-config` → 200 afterwards), no console errors. I accept the
lane's judgement that `error` should stay **disabled** rather than "usable, no claim": the panel's
Retry/Use-sample controls are the recovery, and navigating away from them to a report that never
existed would be worse than a truthful disabled state.

**Focus restore** (`r2c.mjs`) — the question the round-1 rename raised, measured both ways:

```
opened from the TOOLBAR toggle, then Escape -> activeElement BUTTON aria="Open full report"
opened from the PANEL footer button, then Escape -> activeElement BUTTON aria="Open full report"
```

The toolbar toggle is the right restore target (it is the one control the code keeps unconditionally
mounted), and — better than I expected — focus lands there even when the trigger was the footer
button, so the path whose trigger unmounts does not dead-end on `<body>`. The `verify-focus-traps.mjs`
fix is correct and its comment states the real reason.

### Driven: one label, four surfaces, one-scene draft (`r2c.mjs`)

```
PANEL : "… Shape & Rhythm needs at least two scenes; this draft has 1. ACTION-PROSE VARIATION 0.92 …"
HTML  : "action-prose variation 0.92"          stray "action-sentence variation": none
LETTER: "the action-prose variation is 0.92."  stray "sentence-length variation across": none
```

Same number (0.92), same scene count (1), one label at every site; `WhatIfPanel.tsx` imports the same
constant (source-level, plus the new executable cross-surface test). `grep` over the built client
bundle finds **zero** occurrences of either retired wording. Registered sentences all verified as
shipped verbatim: row 61 and row 65 read off the live DOM, rows 62/63 off the rendered panel/HTML/
letter, row 64 from round 1.

Re-run here: `check-scoring-receipt main..HEAD` → 0 ("no scoring-path files changed");
`shape-rhythm-panel-copy` **42/42**, `coverage-html` **48/48**, `coverage-letter` **45/45**. Zero
browser console errors on every non-stubbed page.

### Non-blocking notes

1. **The toolbar toggle is still unclickable by pointer at 375 px whenever the coverage panel is
   open** — measured: a real click times out at 375 and succeeds at 1280 (`r2.log`, the
   after-Cancel step). This is the pre-existing overlay geometry (the coverage `aside` is
   `w-full max-w-[400px]` at that width), not a regression, and it costs nothing functionally: with
   the panel open the panel's own controls are the route ("Run coverage" in the cancelled state, the
   sticky-footer "Full report" in the success state), and with the panel closed the toggle reads
   "Open coverage" and is reachable. Worth one sentence somewhere rather than rediscovering it.
2. **`ScriptDoctorPanel.tsx`'s one-scene explanation still uses the retired third wording** as its
   *definition* line: the section now reads "ACTION-PROSE VARIATION 0.92 / Sentence-length variation
   across the draft's action lines — the one document-wide reading that needs no second scene."
   That is explanatory prose, not a competing label, so it does not violate anything — but the label
   and its gloss now sit one line apart reading as near-synonyms. A small rewording ("Variation in
   the length of the draft's action sentences — …") would finish the job item 7 started.
3. **`smoke-p0-live-flow.mjs:205-211`** — a leftover half-sentence in step 3c's comment: it says
   "THEN check the toolbar toggle repeatedly over a real interval" and then, correctly, "A single
   read after a fixed settle window is the correct check." The code does the latter. Delete the first
   clause.
4. **Reported honestly, not attributed:** in my first long probe run (`r2.log`, six sequential
   contexts) the keyless server disappeared near the end — the last two steps hit
   `ERR_CONNECTION_REFUSED`. I could not reproduce it: `r2b.mjs` drove the same 500-then-recover
   sequence with the server booted directly and it stayed alive with a clean log and a 200 on
   `/api/ai-config` afterwards. I record it because it happened, not as a finding against this diff.

---

## Round 3

Same reviewer, warm context. Read-only: worktree never edited, final `git status --porcelain` empty;
one probe (`layout-review/r3.mjs`, log beside it) against a keyless server booted from this
worktree's own fresh `dist/`, shut down at the end (`ps` clean).

Rebased onto `main` `60bce1a6` (a11y-dark merged). Rounds 1–2 are now `1414f3a2 / 8f61c04d /
1098c5bb / 91c97fba`; round 3 is `c52fc64e` + comment-only `1ae9a789` (tag
`audit/2026-09-05/layout-round3`), 5 files, +127/−9.

**Verdict: MERGE.** On the item you flagged for judgment: I drove it at 375, 700, 900 and 1280 and
I judge it a **correctness fix, not a subtraction** — with one precise residual the report describes
inaccurately, which is item 1 below. Items 2 and 3 are done, the two-lane `SlatePanel` conflict was
resolved keeping both intents (verified by driving, not by reading), and every test I ran is green.

### Item 1 — hiding the covered toolbar toggle below 640 px: my judgment

`ScriptIDE.tsx:2845` (the `className` ternary) — `` `sm-btn py-1.5 …${coverageFull ? "" : " max-sm:!hidden"}` ``, compiled to
`.max-sm\:\!hidden{display:none!important}` inside `@media not all and (min-width:40rem)` (verified
in the built CSS), so it applies only below 640 px and only while
`toolSlot === "coverage" && !coverageFull`.

**What I measured** (`r3.log`):

| state (375×720) | toolbar toggle | panel's own footer button | keyboard route to the full report |
|---|---|---|---|
| success (sample ran) | `display:none` | present, visible | **yes** — Tab reaches "Full report" inside the aside; Enter hydrates the report |
| cancelled / idle | `display:none` | *not rendered* (`status === "success" && report` gates it) | **no** |
| full report open (`coverageFull`) | "Summary", `display:flex` | — | yes (the way back is intact) |
| panel closed | not rendered (pre-existing; the "Coverage" task tab is the route, and it is in the tab order) | — | via Coverage → run → footer |

| width, success state | toggle | `elementFromPoint` at its centre | real non-force click |
|---|---|---|---|
| 700 | `display:flex`, x=154 | **itself** | **ok** |
| 900 | `display:flex`, x=442 | **itself** | **ok** |
| 1280 (round 2) | visible | itself | ok |

So the `max-sm` boundary is exactly right: there is **no residual band** where the toggle is visible
but covered — above 640 px the aside is a 380 px right-hand drawer and the toggle sits clear of it.

**Why this is a correctness fix rather than a subtraction.** Three things I can point at:

1. In the affected state the control was **invisible and impossible to click** — the aside is
   `h-dvh w-full` below `sm`, painted over the whole viewport, and round 2's own log shows a real
   click on it timing out with the aside's verdict `<p>` named as the interceptor. No pointer user
   could ever reach it; only Tab could, which lands a keyboard user on a control they cannot see
   behind opaque author content — a WCAG 2.2 **2.4.11 Focus Not Obscured (Minimum)** failure in its
   own right. Removing it removes a defect, not an affordance.
2. Where the action still matters — the success state — it is **one Tab away** and I drove it end to
   end: Tab reaches the panel's own "Full report", Enter hydrates the report. Nothing is lost there.
3. The only capability that genuinely disappears is "open a **report-less** ScriptDoctorPanel below
   640 px" — and `setCoverageFull(true)` has exactly one other call site in the whole file
   (`:3706`, `onOpenFullReport` from the panel), with no command-palette entry for it (`:2402`'s
   `go-coverage` calls `handleTaskChange("coverage")`, not the full report). That cold panel is
   precisely the dead end this lane's own round-1 item 2 spent a round preventing on the golden
   path. Removing the only route to it is consistent with, not contrary to, the lane's own thesis.

Nothing is stuck: in the cancelled state the tab order still carries "Run coverage", "Re-run
coverage" and "Close coverage", and closing returns the writer to a normal editor with the Coverage
task tab reachable.

I also agree with the rejected alternative. Elevating the toggle over the aside would put a second,
identical "Full report" pill on top of the panel a few lines above the panel's own one — I would
have rejected that too, and the lane rejected it *with a screenshot* rather than by assertion.

**The one thing that needs correcting** — see item 1 in the list below: the code comment and the
report both say the panel's own controls "are the real route in every one of those states". They are
not. In the cancelled/idle state at 375 there is **no** route to the full report at all — measured,
not inferred. That is defensible as a product rule, but it should be written down as the rule it is
rather than as a claim that a route exists.

### Items 2 and 3

- **2 (retired third wording)** — `ScriptDoctorPanel.tsx:846` and `:903` now read "How much
  action-sentence length varies across the draft — …" in both the scored and the one-scene gloss.
  My own grep over `src/` and `server/`, with a comment filter applied, returns **zero** live hits;
  the only two remaining occurrences are `//` history comments in
  `src/lib/structural-signals-copy.ts` and `server/lib/coverage-letter.ts`. The new regression test
  (`shape-rhythm-panel-copy.test.ts:119-131`) pins it.
- **3 (half-sentence)** — gone; `smoke-p0-live-flow.mjs`'s step 3c comment now says only what the
  code does ("A single read after a fixed settle window is the correct check").

### The rebase, verified by driving rather than reading

`SlatePanel.tsx:810` keeps a11y-dark's `const rowBg = i % 2 === 0 ? "bg-[var(--sm-panel)]" :
"bg-[var(--sm-panel-2)]"`, and both `<tr>` sites (`:823-824`, `:858-859`) carry **`key={i}`
(this lane) + `className={rowBg}` (a11y-dark)**. Driven on the rebased tree:

```
dedupe note: "alpha-copy.fountain" skipped — already in this slate (identical to "alpha").
rows: [ "1 | alpha | 61"  bg rgb(244,239,226)  class bg-[var(--sm-panel)]
        "2 | beta  | 58"  bg rgb(239,232,215)  class bg-[var(--sm-panel-2)] ]
duplicate-key console errors: 0 | console errors: []
```

Two rows, not three; the invariant tokens render exactly the values the a11y-dark lane pinned. Both
lanes' intents survived. No conflict markers anywhere in `src/ server/ tests/ scripts/`.

Re-run here: `check-scoring-receipt main..HEAD` → 0; `shape-rhythm-panel-copy` **43/43**,
`coverage-html` **50/50** (both lanes' describe blocks), `coverage-letter` **45/45**,
`modal-focus-trap-wirings` **24/24**, `theme-convention` **32/32** — the last one passing means
a11y-dark's `assert.equal(…, 65)` pin is genuinely unmoved by this lane's changes, not merely
claimed.

### Non-blocking follow-ups

1. **`ScriptIDE.tsx:2818-2822` (the comment) and the round-3 report** — "the panel's own controls
   (Run coverage / Cancel / the sticky-footer Full report / Retry-Use sample) are the real route in
   every one of those states" is false for one state. Measured at 375 in the cancelled/idle state:
   toolbar toggle `display:none`, `panelFooterFullReport: null`, and no Tab stop anywhere offering
   the full report. Either state the rule honestly ("below 640 px the full report is reachable only
   once a run has produced one — by design, since the alternative is the cold panel round 1 item 2
   exists to prevent"), or close the gap by giving `CoverageSummary` a route in that state too (the
   idle card already renders "Run coverage"; a secondary "Open full report" beside it would keep the
   control *inside* the panel where it is visible, instead of underneath it). I would take the first
   — it is the truer rule — but the sentence cannot stay as written.
2. **Harden the comment filter — and prefer parsing over grepping.** You asked for a judgment: yes,
   `modal-focus-trap-wirings.test.ts:48` (`!linePrefix.startsWith("//")`) should be hardened, and
   note that this round's *new* test repeats the same weakness in a slightly wider form
   (`shape-rhythm-panel-copy.test.ts:125` filters `//`, `*`, `/*` by line prefix). Both still
   miscount a **continuation line of a `{/* … */}` JSX block that begins with an ordinary word** —
   which is exactly the shape that broke the first test this round. The repo already contains the
   right technique twice: `tests/core/theme-convention.test.ts` strips comments structurally (now via
   the TypeScript AST, which never sees a comment at all). Reusing a shared `stripComments()` helper
   — or, better, counting `role="dialog"` as a JSX **attribute node** rather than a text occurrence —
   removes this whole class. Two false positives in one round from one root cause is the argument.
3. *(carried, orchestrator)* The claims-register row-61 collision with `agent-aadffb46506a968c2` is
   still open; this lane owns 61–65. The `SlatePanel` conflict from round 1's note is now **resolved**
   in-tree and needs no further action.

---

## Round 4

Same reviewer. Read-only, and per the coordinator's constraint while the merge gates run
concurrently in that worktree: **nothing built, no server started there** — only file reads, two
Node scripts importing the helper, and the two unit tests. Probes:
`layout-review/r4-strip.mjs`, `r4-strip2.mjs`, `r4-strip3.mjs`, plus `strip-fixed.ts` (my copy of the
helper carrying the one-line fix in item 1).

Commit `5e9370b7` on `1ae9a789` (tag `audit/2026-09-05/layout-round4`), 4 files, +230/−25.

**Verdict: REVISE — one item, one line, patch proven below.** Round 3's item 1 is fixed and now
states exactly the rule I measured. Item 2's new `stripComments` is the right design and survived
every hard case I could think of — strings, template literals, regex literals, JSX text, block
comments between attributes, comments at end of file — **except one class it silently leaks**, which
is the same class of bug this helper exists to kill, in a helper whose own header claims to be
"unambiguous and complete".

### Round-3 items vs the diff

| # | Round-3 item | Status | Evidence |
|---|---|---|---|
| 1 | The comment/report claimed a route exists in every state; measured false for one | **DONE** | `ScriptIDE.tsx:2819-2836` now says it straight: once a run has produced a report the panel's sticky-footer button and Tab are the route, "but below 640px, in the cancelled/idle state, there is no route to the full report at all — no footer button (CoverageSummary only renders it once `status === "success" && report`), no Tab stop offering it. That is a deliberate rule, not an oversight… Below 640px the full report is reachable only once a run has actually produced one, by design." That is precisely what I measured in round 3, stated as the rule it is. |
| 2 | Harden the comment filter; prefer parsing to grepping | **DONE in design, one residual hole** | New `tests/helpers/strip-comments.ts` — a real `ts.createSourceFile` parse, `getChildren()` walk to every leaf, blanking only the leading-trivia span between `getFullStart()` and `getStart()`. The reasoning in its header is correct and the two rejected approaches are documented with the specific file each failed on. Wired into `modal-focus-trap-wirings.test.ts` and `shape-rhythm-panel-copy.test.ts`; both pass here at **25/25** and **44/44**. |

### What I threw at the stripper (`r4-strip.mjs`, 13 cases)

Correct on all of these — offsets and line counts preserved in every case:

```
ok  JSX {/* */} continuation line (the target case)      stripped
ok  a REAL role="dialog" attribute                        survives
ok  // inside a STRING literal                            survives
ok  // inside a TEMPLATE literal                          survives
ok  /* */ inside a template literal                       survives
ok  a regex literal containing //                         survives
ok  JSX text containing //                                survives
ok  trailing // comment at END OF FILE, no newline        stripped
ok  trailing block comment at END OF FILE                 stripped
ok  // comment inside a JSX expression container          stripped
ok  block comment between JSX attributes                  stripped
ok  a string holding comment-marker text + a real comment  both handled
```

The trailing-trivia question you asked is answered by `stripTriviaBefore(sourceFile.endOfFileToken)`
at the end of `stripComments`, and it works — *except* in the case below, where that very call is the
one skipped.

### REVISE — 1 item

1. **`tests/helpers/strip-comments.ts:91-96` — the `seen` set is keyed on `getFullStart()` alone, so
   any comment that sits inside an EMPTY syntax list is never stripped.** An empty `SyntaxList` is a
   leaf whose `getFullStart() === getStart()`: it consumes no trivia, blanks nothing, but *records
   that offset as seen* — and the next token (`)`, `]`, `}`, or the EOF token), which shares the same
   `fullStart` and whose trivia actually holds the comment, is then skipped by the guard. Seven
   ordinary shapes leak (`r4-strip2.mjs`; `HERE` is the marker that should have been blanked):

   ```
   LEAK  function f(/* HERE */) {}          LEAK  const a = [/* HERE */];
   LEAK  const z = f(/* HERE */);           LEAK  const o = {/* HERE */};
   LEAK  function f() {/* HERE */}          LEAK  // only a comment HERE        (comment-only file)
                                            LEAK  /* only a comment HERE */
   ```

   No live miscount today — neither consumer's target phrase sits in such a position, which is why
   both tests pass — but this is a shared `tests/helpers/` utility offered to other source-text
   tests, `function f(/* … */) {}` is ordinary code, and the header's claim that the trivia scan is
   "unambiguous and complete, with none of either prior approach's blind spots" is now measurably
   false. The leading-trivia *reasoning* is right; the `seen` dedupe defeats it.

   **Fix, proven (`r4-strip3.mjs`, shipped vs. patched side by side): key the set on the node's full
   identity.**

   ```ts
   const seen = new Set<string>();
   const key = `${fullStart}:${node.end}:${node.kind}`;
   if (seen.has(key)) return;
   seen.add(key);
   ```

   With that one change all seven leaks strip correctly and every "must survive" case above still
   survives (string `//`, real `role="dialog"`, template `/* */`, JSX text `//`), and the target JSX
   block comment still strips. Dropping `seen` entirely also works — blanking writes spaces over
   spaces, so it is idempotent and the set is only an optimisation — but keying it is the smaller
   diff. Add `function f(/* … */) {}` and a comment-only file as fixtures so the hole cannot come
   back.

### Nothing else changed hands

`modal-focus-trap-wirings` 25/25, `shape-rhythm-panel-copy` 44/44 (both re-run here). I did not
re-run `theme-convention`, the browser suites, or `npm test` — untouched by this diff and covered by
your concurrent merge-gate run. Round 3's other findings stand as recorded: the register row-61
collision is still the orchestrator's to renumber.
