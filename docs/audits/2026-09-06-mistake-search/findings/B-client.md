# B-client — writer-facing mistake hunt, `git log 1e170831..802f1c16`

Worktree: `/home/user/STORYMACHINE/.claude/worktrees/agent-ab4e991ad36c58183` (read-only; no edits, no commits).
Scope: reviews in `docs/audits/2026-09-05-review-batch/`; every claim reproduced, never read-only-accepted.

Status: COMPLETE — areas 1-8 driven; area 6 partial and marked as such.

---

## B-1 — CRITICAL — the exported coverage HTML is a THIRD hand-copy of the draft-rank sentence and never got the round-2 fix

`server/lib/coverage-html.ts:131-137` (`buildDraftRankLine`)

`5dffc831`/`3d13383c` created `src/lib/draft-rank-copy.ts` explicitly because "ScriptDoctorPanel.tsx's
DraftRankLine and server/lib/coverage-letter.ts's buildCaveats each hand-wrote their own sentence
around the SAME `{rank, of}` value — and drifted". The module header names exactly two surfaces.
There were three. `coverage-html.ts` renders the same field from its own literal strings and was
never converted, so the writer-facing export the product ships as its "shareable, third-party-
verifiable coverage report" (ROADMAP P3) states the number three different ways from the panel.

Reproduced (no browser needed) with one `draftRank` object rendered through both exporters —
`/tmp/<session scratch>/mistakes-2026-09-05/probe-rank-copy.ts`,
`node --experimental-strip-types probe-rank-copy.ts`:

| draftRank | panel / letter | exported coverage HTML |
|---|---|---|
| `{rank:1, of:1}` | "...appears after **your next run or save**" | "...appears after **your next save**" |
| `{rank:1, of:6, tied:true}` | "this one **ties for** 1st of 6" | "**1st of 6**" — the tie is gone |
| `{rank:2, of:4, unscored:2}` | "...ranks 2nd of 4 ... **2 of 6 runs and saved drafts of this script are unranked (saved without a fresh diagnosis)**" | "2nd of 4" — the 2 unranked drafts are silently dropped |
| every ranked state | denominator "**runs and saved drafts** of this script" | "**your own saved drafts** of this script" |

Three separate honesty regressions in one function:

1. **"your next save" is the exact false promise the round-2 fix removed.** `draftRankNextOpportunityLabel()`
   exists (`src/lib/draft-rank-copy.ts:69-71`) because a rank appears after a plain *run* too — the panel
   and the letter say so, the exported report the writer sends to a producer still says "save".
2. **`tied` is dropped.** `server/routes/export.ts:325` types the body as `{rank, of}` and
   `CoverageHtmlOptions.draftRank` (`server/lib/coverage-html.ts:948`) is `{rank: number; of: number}`,
   so the `tied: true` the client sends (`draftRankExportPayload` forwards it, and `DraftRankSchema`
   at `server/lib/validation.ts:1171` accepts it) is validated, carried across the wire, and then
   thrown away. A dead heat exports as clean separation — the precise defect audit round 2 fixed
   in the other two surfaces.
3. **`unscored` is dropped the same way** (`validation.ts:1176` accepts it, nothing renders it), so the
   "N of M ... are unranked" clause exists in the panel and the letter and nowhere in the HTML.
4. **The denominator noun drifted back** to the pre-fix "your own saved drafts of this script", which
   is the claim `draft-rank-copy.ts`'s header calls out as false ("most of the union is Draft History
   runs, never explicitly saved as a Version").

Why nothing caught it: `tests/core/percentile-copy-consistency.test.ts` is the gate that is supposed to
stop exactly this, and it only covers *percentile* copy — there is no `draft-rank-copy.ts` row in its
`[name, src, importPath]` table (`tests/core/percentile-copy-consistency.test.ts:105-113`) and no
end-to-end draft-rank render assertion. `coverage-html.ts` does not import `draft-rank-copy.ts` at all
(`grep -c draft-rank-copy server/lib/coverage-html.ts` → 0).

**BUILD/WIRE fix** (never removal): widen `CoverageHtmlOptions.draftRank` to the shared
`DraftRankExportPayload` type from `src/lib/draft-rank-copy.ts`; make `buildDraftRankLine` compose from
`draftRankNextOpportunityLabel()`, `draftRankDenominatorLabel()` and `unrankedDraftsNote()` (plus the
`tied ? 'tied ' : ''` prefix) exactly as `ScriptDoctorPanel.tsx:377-396` does — ideally by lifting that
whole sentence-builder into `draft-rank-copy.ts` as one `draftRankSentence(draftRank)` the panel, the
letter and the HTML all call; widen `server/routes/export.ts:325`'s destructured type so `tied`/`unscored`
reach it; then add `coverage-html.ts` (and the panel and the letter) to the consistency test's table with
an end-to-end assertion per state, run first against the current tree to watch it FAIL.

## B-2 — HIGH — `scripts/verify-p2-p3-surfaces.mjs` still asserts the OLD draft-rank copy, so the browser gate is pinned to the bug

`scripts/verify-p2-p3-surfaces.mjs:683-684`

```
const exportedHtmlHasDraftRankLine = /Rank among your drafts: \w+ of \d+ \(by health, your own saved drafts of this script\)/.test(exportedHtml)
  || /First saved draft — rank among your drafts appears after your next save/.test(exportedHtml);
```

Both alternatives are the pre-fix wording. This is a gate that now *requires* the B-1 drift: fixing
`coverage-html.ts` to use the shared copy makes this assertion FAIL, and leaving the drift makes it pass.
The lane changed the panel and letter copy in `3d13383c` and did not re-point the browser suite that
asserts the third surface's copy.

**BUILD/WIRE fix**: build the expected strings in the suite from `draft-rank-copy.ts`'s exported helpers
(the file is plain TS with no runtime deps — the suite already evaluates `src/lib/sample-script.ts` the
same way at `scripts/verify-p2-p3-surfaces.mjs:161-170`) instead of literals, so the assertion tracks the
shared module and can never re-pin a drift.

## B-3 — CRITICAL — "runs and saved drafts **of this script**" counts runs on OTHER scripts, and the built-in sample

`src/components/scriptide/ScriptDoctorPanel.tsx:2230-2235` (the `draftRank` memo) ·
`src/lib/snapshot-trend.ts:200-280` (`computeDraftRank`) · `src/lib/draft-rank-copy.ts:60-63`

Draft History is ONE GLOBAL localStorage array (`sm_doctor_history_v1`,
`ScriptDoctorPanel.tsx:1145`). Entries carry a `title` (`DoctorHistoryEntry.title`,
`ScriptDoctorPanel.tsx:1192`) and **nothing filters on it** — not the list UI
(`ScriptDoctorPanel.tsx:5043-5045`, a plain `[...history].reverse().slice(0, 10)`) and, new in this
batch, not the rank: the memo passes the whole array into `computeDraftRank`. The denominator label the
same batch introduced then asserts the number is scoped to one script.

Driven in Chromium against the keyless server (`/tmp/<session scratch>/mistakes-2026-09-05/p1-rank.mjs`,
`PW_CHROMIUM_PATH=/opt/pw-browsers/chromium node p1-rank.mjs`) — one fresh profile, three states:

```
== STATE 1: SAMPLE report (StartScreen -> "Try sample coverage" -> "Full report") ==
  rank line: ["First saved draft — rank among your drafts appears after your next run or save"]
  Draft History button: "DRAFT HISTORY | 1 DRAFT"
  localStorage sm_doctor_history_v1: Dead Frequency@78          <-- the BUILT-IN SAMPLE
== STATE 2: uploaded alpha.fountain ("Title: Script Alpha") ==
  rank line: ["Rank among your drafts: 2nd of 2 runs and saved drafts of this script (by health)"]
  localStorage: Dead Frequency@78, Dead Frequency@65
== STATE 3: uploaded beta.fountain ("Title: Script Beta") — a DIFFERENT script ==
  rank line: ["Rank among your drafts: 3rd of 3 runs and saved drafts of this script (by health)"]
  localStorage: Dead Frequency@78, Dead Frequency@65, Dead Frequency@62
```

Three separate falsehoods in one sentence, all reproduced:

1. **"of this script" is false.** In STATE 3 the writer is looking at Script Beta and is told it ranks
   "3rd of 3 runs and saved drafts of this script" — the other two are the sample and Script Alpha.
   Two unrelated scripts and a demo, presented as one script's revision history. This number is
   exported into the coverage letter and the coverage HTML a writer sends to a producer.
2. **The built-in sample is counted as one of the writer's own drafts** (see B-4 for why it is in the
   store at all). The sample scores 78 — higher than either real draft — so it permanently pushes the
   writer's own work down a rank.
3. **The recorded titles are all wrong too**: every entry says "Dead Frequency" even for uploads whose
   own title page says "Script Alpha"/"Script Beta". `recordDoctorHistory(data, effectiveTitle ?? "")`
   (`ScriptDoctorPanel.tsx:2810`) stamps the HOST project's title, not the analyzed document's — so
   even the one field that could have scoped the union is unusable as written.

Note also the panel's two numbers disagree by construction once Versions exist: the "Draft History"
button counts `history.length` (which INCLUDES the run on screen), while the rank's `of` excludes the
current run and adds snapshots. In STATE 3 they coincide at 3 only by accident.

**BUILD/WIRE fix**: give history a per-script identity and scope both the list and the union to it —
`recordDoctorHistory` should stamp the analyzed document's own title (`activeReportTitle`, the value the
export path at `ScriptDoctorPanel.tsx:2996` already correctly prefers over the live `title` prop) plus a
stable script key (ScriptIDE already has a draft/session identity; the snapshots array is per-document
already), then filter in the `draftRank` memo and in the Draft History list by that key. Keep every entry
(nothing removed) — the list can keep showing other scripts under their real titles, grouped; only the
RANK denominator must be scoped. If a per-script key genuinely cannot be threaded, then the honest
alternative is to change `draftRankDenominatorLabel()` to say what the number is ("runs and saved drafts
in this browser") — but scoping is the stronger build, and the label as written is the claim under test.

## B-4 — HIGH — the built-in sample is written into the writer's real Draft History on the golden path

`src/components/scriptide/CoverageSummary.tsx:326-338` · `src/components/ScriptIDE.tsx:3425,3451` ·
`src/components/scriptide/ScriptDoctorPanel.tsx:2964-2972`

The panel's hydration effect guards history-recording with `if (!initialReport.isSample && ...)`, and
`runDiagnosis` has the matching `if (!isSampleRun && ...)` guard with a comment explaining that a sample
"would plant a fake draft in a returning writer's real history (and, worse, become the delta baseline for
their NEXT actual diagnosis)". The guard does not hold, because the report that reaches the panel is
marked `isSample: false`.

Driven (`/tmp/<session scratch>/mistakes-2026-09-05/p1b-sample-history.mjs`):

```
after CoverageSummary sample run, history = []
  api calls: ["POST /api/scriptide/doctor/stream","POST /api/scriptide/doctor/stream"]
after Full report (panel hydrated), history = ["Dead Frequency@78"]
  api calls: (unchanged — no new request; the entry came from the hydration effect)
```

Mechanism, confirmed by request tracing (`p1c-two-runs.mjs`, `p1d-runs-long.mjs`): the sample click runs
the doctor **twice**, and the second run is not marked as a sample.

```
REQ +881ms /api/scriptide/doctor/stream     <- run({sample:true})  -> isSample TRUE
verdict rendered +919ms
REQ +975ms /api/scriptide/doctor/stream     <- void run()          -> isSample FALSE  (wins)
```

`CoverageSummary.tsx:326-338` is
`useEffect(() => { if (autoLoadSample && !sampleFired.current) { sampleFired.current = true; void run({…sample:true}); return; } void run(); }, [autoLoadSample])`.
Once `sampleFired.current` is set, **every** later evaluation of this effect falls through to the plain
`void run()` — which re-analyses the sample text now sitting in the editor and calls
`onReportComputed({ …, isSample: !!override?.sample })` = `false`, overwriting the correctly-flagged
report. Two triggers reach that fallthrough: React StrictMode's dev remount (the +975ms call above), and
— in dev AND in a production build — the genuine dependency change when the sample install flips
`doctorAutoSample` to false (`ScriptIDE.tsx:3451`, prop at `:3425`).

Blast radius beyond history: the same overwrite sets `setAnalyzedIsSample(false)`
(`ScriptDoctorPanel.tsx:2945`), which is the flag guarding the sample against fix-acceptance
(`:3524`, `:4519`, `:4583`) — so on the product's primary entry point the panel does not know it is
showing a demo. And the sample is analysed twice, doubling the cost of the P0 golden path.

**BUILD/WIRE fix**: make the sample identity a property of the RUN, not of the effect's re-entry — keep a
`sampleRunRef` (or thread `sample` through `run`'s own state) so a re-evaluation after the install cannot
downgrade the report's provenance; and guard the fallthrough (`void run()` should not fire when a run for
this exact text/generation has already been computed — the component already has `genRef`/`sampleFired`
to build that on). Add a browser assertion on the golden path that `sm_doctor_history_v1` is still empty
after "Try sample coverage" → "Full report", which is the state the two existing comments claim.

---

# Area 2 — "Verify my rewrite" (keyless, Labs off)

**What I tried.** Drove every provenance × format state in Chromium against the keyless server on
:5199 (`p2-verify.mjs`, `p2b-verify.mjs`, `p2c-receipt.mjs`, `p2d-direct.mjs` in the scratch dir):
sample via StartScreen → "Full report"; sample via the panel's own "Try a sample"; `.fountain` upload;
`.fdx` upload; a hand-built 12-scene `.pdf` upload (`make-pdf.mjs`); upload-then-cleared; an
editor-sourced report untouched and then edited; the receipt's numbers against a direct
`POST /api/scriptide/fix` with the same two texts.

**Clean.** Four of the five withheld reasons are exactly right and reachable, with the button
`disabled` and the reason rendered as visible text *and* as the button's `title`:

| state | reason rendered |
|---|---|
| panel-loaded sample | "This report is the built-in sample script, not your draft. Dismiss the sample (✕ above)…" |
| `.fountain` upload | "This report came from an uploaded file. Verification compares your editor draft…" |
| `.fdx` upload | "…uploaded Final Draft file, and the browser holds no Fountain version of it to compare…" |
| `.pdf` upload | "…uploaded PDF file, and the browser holds no Fountain version of it to compare…" |
| upload then cleared (✕) | the whole Verify section is gone — `setReport(null)` really does end the report, and the panel returns to "Run Diagnosis". The copy that says so is true. |

The receipt itself is faithful. Panel: `Health 65 → 66`, `+1.5`, `CLEARED (5)`, `INTRODUCED (13)`,
`Talk/action swing 0.00 → 0.03`, `Action-prose variation 0.22 → 0.21`. Direct
`POST /api/scriptide/fix` with the same base/candidate: `before.health 64.6`, `after.health 66.1`,
`cleared 5`, `introduced 13`, `structuralSignals.before.meanAbsDialogueShareDelta 0.0042` →
`after 0.0254`, `0.2228 → 0.2144`, `usedLLM false`, `source "writer"`. Every number the panel shows
is the route's own. Zero console errors across all of it. Verify round-trip ≈1.6 s.

## B-5 — HIGH — on the product's primary entry point the sample-withhold never fires, so a writer can "verify a rewrite" of the demo

`src/components/scriptide/ScriptDoctorPanel.tsx:3396-3412` (`verifyBlockedReason`)

`verifyBlockedReason` decides provenance from `uploadedFile`, which is only ever set by the panel's own
`loadSample`/`handleFileSelected`. On the StartScreen path ("Try sample coverage" → "Full report") the
report is threaded in as `initialReport` and `uploadedFile` is **null**, so the guard is skipped
entirely. Driven (`p2-verify.mjs`, state A):

```
== A. SAMPLE via StartScreen -> Full report ==
{ "buttonFound": true, "disabled": false, "title": null,
  "section": [... "Your draft is unchanged since this report — verifying now reports a zero delta." ] }
```

versus the same sample one click later, loaded through the panel (`p2b-verify.mjs`, state E):

```
{ "disabled": true,
  "reason": "This report is the built-in sample script, not your draft. Dismiss the sample (✕ above)…" }
```

Same script, same panel, opposite behaviour, decided by which door the writer came through — and the
door 100% of first-time writers use is the one that offers the control. `6697e88d` ("name the SAMPLE in
the withheld reason, not 'an uploaded file'") polished a string that the golden path never reaches.
This is the same root cause as B-4: `analyzedIsSample` is false there too (`:2945`), so the
`isSample` prop the receipt card uses to disable Accept (`:4519`) is also wrong on that path.

**BUILD/WIRE fix**: make provenance a property of the REPORT, not of `uploadedFile` — the panel already
has `analyzedIsSample`, set from `initialReport.isSample` on the threaded path and from `isSampleRun` on
the run path. Add `analyzedIsSample` as the first branch of `verifyBlockedReason` (it already carries the
right sentence), and fix the upstream `isSample:false` overwrite from B-4 so that flag is trustworthy.
Assert both entry points in the browser suite, not just the panel-loaded one.

## B-6 — HIGH — the draft-rank line contradicts the verify line one paragraph above it, on the sample

`src/components/scriptide/ScriptDoctorPanel.tsx:2230-2235`

In the panel-loaded-sample state (the one where the panel correctly refuses to verify *because* "this
report is the built-in sample script, not your draft"), the same render shows:

```
rank line on the sample: ["Rank among your drafts: 1st of 2 runs and saved drafts of this script (by health)"]
reason under the button: "This report is the built-in sample script, not your draft."
```

Reproduced in `p2b-verify.mjs`, state E, after one real `.fountain` upload had been diagnosed. The demo
script is ranked *as one of the writer's own drafts of their script*, and — because the sample outscores
the writer's draft — it takes 1st place from them. `runDiagnosis` has an `isSampleRun` guard for
history, the receipt card has an `isSample` prop, `verifyBlockedReason` has a sample branch; the
`draftRank` memo added this session has none.

**BUILD/WIRE fix**: gate the memo the same way the rest of the panel is gated —
`reportIsComplete && report && !analyzedIsSample`, and render a short honest line in its place for the
sample ("The sample is not ranked against your drafts"), so the section does not silently vanish.

## B-7 — LOW — the receipt's rounded endpoints contradict its own delta chip

`src/components/scriptide/ScriptDoctorPanel.tsx` (FixReceiptCard health row, ~`:2040-2090`)

The card renders `Health 65 → 66` beside `+1.5`. The route's numbers are 64.6 → 66.1. A reader doing the
arithmetic on the two numbers actually printed gets +1, not +1.5. Same shape on the descriptive row:
`Talk/action swing 0.00 → 0.03` for 0.0042 → 0.0254 (apparent +0.03, actual +0.021).

**BUILD/WIRE fix**: print the endpoints at the precision the delta is computed at (one decimal for
health, two for the structural signals), or derive the displayed delta from the displayed, rounded
endpoints. Either is internally consistent; the current mix is not, and LANE_STANDARD §2's "every
surface that shows a number shows the same number" applies inside one card too.

---

# Area 3 — Shape & Rhythm

**What I tried.** Drove a 12-scene editor draft to a full report and measured, in-page, the computed
colour of **every** text node inside `[data-a11y-section="shape-rhythm"]` against its resolved
background, in light mode and then in dark mode (toggled with the app's own ⌥⇧D command) —
`p3-shape.mjs`. Then a real `Tab` into the scene strip and `Enter`/`Space` on a bar (`p3b-focus.mjs`),
375 px both by launching at that viewport and by resizing with the panel open (`p3c-375.mjs`,
`p3d-resize.mjs`), the collapse preference across a toggle, and two edge reports — one scene of
10,000 words (below `MIN_SCENES_TO_SCORE = 2`) and two scenes where the first carries 10,000 words
(`p3e-edge.mjs`).

**Clean — the dark-mode fix is real.** Every text node measures identically in both themes, because the
container is the theme-invariant `--sm-panel` and the text uses `--sm-ink-mute`/`text-black`:

```
  5.29  9px/400   rgb(107,97,82) on rgb(244,239,226)  "Descriptive — not part of the score"
  5.29  11px/400  rgb(107,97,82) on rgb(244,239,226)  "Read from the shape of the document — word, li…"
  5.29  9px/400   rgb(107,97,82) on rgb(244,239,226)  "Scene 1" / "Scene 12"
 18.29  12px/700  rgb(0,0,0)     on rgb(244,239,226)  "Talk/action swing" / "0.00"
  5.29  11px/400  rgb(107,97,82) on rgb(244,239,226)  "Mean scene-to-scene change …"
 18.29  12px/700  rgb(0,0,0)     on rgb(244,239,226)  "Action-prose variation" / "0.21"
 → DARK failures <4.5:1 : []          (html.dark = true confirmed in the same run)
```

Keyboard is also clean: 12 bars, all tabbable, none disabled, `aria-label` "Scene 1: INT. ROOM 1 - DAY —
jump to this scene", `matches(':focus-visible') === true` after a real Tab with a UA ring
(`outline: auto 1px rgb(16,16,16)`), Enter and Space both activate with no console error. Collapse
persistence works (`sm_doctor_shape_rhythm_open_v1` → `"0"`, strip unmounted). At 375 px the strip is its
own `overflow-x: auto` container and the body never scrolls horizontally
(`documentElement.scrollWidth === clientWidth`).

## B-8 — HIGH — at 375 px a writer cannot open the full report at all: "Full report" is covered by the verdict paragraph

`src/components/scriptide/CoverageSummary.tsx` (the verdict `<p class="mt-4 text-sm …">` overlapping the
"Full report" control in the 375 px layout)

Launching Chromium at 375×720 and driving the real path (Start fresh → paste 12 scenes → Coverage →
"Full report"), the click never lands (`p3c-375.mjs`):

```
== 375px: "Full report" hit-test ==
 rect: { x: 154, y: 215, w: 110, h: 31 }   viewport 375×720   inViewport: true
 hitElement: "P.mt-4 text-sm leading-snug text-[var(--sm-ink-soft)]"
 hitIsButton: false
 hitText: "CONSIDER — scored in the middle band, above the decline line"
 after scrollIntoViewIfNeeded: unchanged — still not the button
 → locator.click: Timeout 15000ms exceeded ; no dialog opened
 → == 375px Shape & Rhythm == { "missing": true }
```

The button is on-screen and `visible`, but `document.elementFromPoint` at its own centre returns the
verdict paragraph, so every real pointer event goes to the `<p>`. On a phone the Script Doctor full
report — and with it Shape & Rhythm, the draft rank, Verify my rewrite and every export — is
unreachable. The only route that works is opening the panel at desktop width and *then* narrowing
(`p3d-resize.mjs` succeeds), which is what a reviewer measuring "375 px" from an already-open panel
would do — `docs/audits/2026-09-05-review-batch/rank-review.md:147-151` reports exactly that
already-open measurement, so the batch's 375 px evidence never exercised the opening click.

`CoverageSummary.tsx` is not itself in `1e170831..802f1c16`, so the overlap is pre-existing — but it
makes every 375 px claim in this batch unverifiable through a writer's own path, and it is the reason to
report it here rather than assume someone else owns it.

**BUILD/WIRE fix**: find the negative margin / absolute positioning that lets the verdict paragraph
extend over the action row in the narrow layout and give the action row its own stacking context
(a `relative z-10` on the button row, or normal flow with the paragraph clipped) — then add a 375 px
step to the browser suite that clicks "Full report" through the real pointer path, which is the check
that would have caught it (a `visible`/`enabled` assertion never can).

## B-9 — MEDIUM — the new scene bars are below the minimum target size, and the only place their reading exists is a `title` attribute

`src/components/scriptide/ScriptDoctorPanel.tsx:679-712` (the `[role="group"]` strip)

Measured at 375 px with the panel open (`p3d-resize.mjs`): 12 bars at **21.1 × 40 px** each. WCAG 2.2
2.5.8 (AA) requires a 24×24 CSS-px target. The class is `flex-1 min-w-[10px]`, so the width falls with
scene count: a feature-length draft (60+ scenes) hits the 10 px floor. These are real `<button>`s that
navigate the editor, not decoration.

Second half of the same problem: each bar's full reading —
`"INT. ROOM 1 - DAY — 24 words (z -0.31) · dialogue 62% (Δ +0.12) · 2 speaker(s), 2 turn(s), 11.0
words/turn · lead share 55% · new pairings 1 · open/close shift 0.30"`, 163 characters — exists **only**
in the `title` attribute. `title` is unreachable on touch (no hover) and the element's `aria-label`
("Scene 1: … — jump to this scene") deliberately overrides it as the accessible name. So on the exact
viewport where the bars are smallest, the data they encode cannot be read at all.

**BUILD/WIRE fix**: keep the strip, and give it a keyboard/touch-reachable readout — a selected-scene
detail line under the strip (click/focus a bar → the same sentence rendered as text, which also gives
screen-reader users the reading via a live region), plus a minimum bar width of 24 px with the strip's
existing `overflow-x: auto` doing the scrolling it is already set up for. Nothing is removed; the
tooltip stays for mouse users.

## B-10 — LOW — a computed structural reading is withheld with no notice when a draft has one scene

`src/components/scriptide/ScriptDoctorPanel.tsx:4821` · `server/lib/coverage-html.ts:963` ·
`server/lib/coverage-letter.ts:314`

Driven (`p3e-edge.mjs`), a one-scene 10,000-word draft:

```
API  /api/scriptide/doctor -> 200
  sceneCount 1 · analysisComplete TRUE · structuralSignals.scored FALSE · scenes 1
  meanAbsDialogueShareDelta 0 · actionSentenceCvOverall 0.9994
PANEL: { sectionPresent: false, anyShapeText: false, bars: 0 }
```

The report is complete and scored, the writer sees a health and a verdict — and one whole section of the
report vanishes with no sentence saying why. `actionSentenceCvOverall` was genuinely computed (0.9994)
and is thrown away. All three surfaces gate on `scored` identically, so at least there is no drift
between them (two scenes, first of 10,000 words: `scored true`, 2 scenes, aggregates 0.4282 / 1.4127).

**BUILD/WIRE fix**: render the section with an honest line in place of the strip — "Shape & Rhythm needs
at least two scenes; this draft has one" — and show the document aggregates that ARE defined for one
scene (the sentence-length variation), the same way the rest of this codebase treats a missing value as
"a known fact, not an unknown".

---

# Area 4 — SnapshotManager

**What I tried.** Ship tab → Save/Restore dialogs (`p4-snapshots.mjs`): role/aria-modal/accessible
name, where focus lands, Escape, focus return, Enter. Two byte-identical saves against one fresh report,
then a save made after an edit so no fresh report matched (`p4b-snapshot-fields.mjs` dumps the persisted
`scriptide_draft_v1` snapshot objects, so the rows are checked against the stored fields, not just the
text). An A/B on whether closing the Coverage panel first drops the score (`p4c-escape-ab.mjs`) and a
save-timing sweep at 0/300/900/2000 ms after the verdict renders (`p4d-race.mjs`). Then a measured
contrast pass over every text node in the section, light and dark, with canvas-resolved colours so
Tailwind v4's `oklch()` values are actually read (`p4e-dark-contrast.mjs`).

**Clean.** Both modals now carry the same semantics — `role="dialog"`, `aria-modal="true"`,
`aria-labelledby` resolving to a real name ("Save Snapshot" / "Restore Snapshot?"), focus moved inside
(Save → the name input, labelled "Snapshot version name"; Restore → "Cancel", the safe default, and
Enter there cancels rather than restores). Escape closes Save and **focus returns to the trigger**
(`aria-label="Save new script version snapshot"`). `303aadb9`'s claim holds. Snapshots capture
`health / verdict / healthPercentile / contentHash / meanAbsDialogueShareDelta` correctly
(`{health: 64.3, pct: 100, hash: "16c62ee0"}`), the snapshot text is byte-identical to the editor
draft, and there is **no** save-timing race — saving 485 ms after the verdict renders captures the
score just as well as at 2465 ms. The trend line handles the mixed case without fabricating: an
unscored Version 3 simply contributes no point.

## B-11 — CRITICAL — in dark mode every word on a snapshot card is unreadable (1.13:1 measured)

`src/components/scriptide/SnapshotManager.tsx:456` (`bg-white dark:bg-zinc-800` card) with
`:461-468, :176-196, :202-226` (the text inside it)

The card is a **real dark surface** in dark mode, but every text token inside it is a light-theme
design-system value. Measured in the browser (`p4e-dark-contrast.mjs`, canvas-resolved colours, ⌥⇧D via
the app's own command, `html.dark = true` verified in the same run):

```
== DARK — Ship "Script Snapshots" section ==
   1.13  12px/700  rgb(33,29,21)  on rgb(39,39,42)  "Version 2"
   1.13  10px/400  rgb(33,29,21)  on rgb(39,39,42)  "64.3/100"
   2.31  10px/700  rgb(118,90,30) on rgb(39,39,42)  "CONSIDER"
   2.45  10px/400  rgb(107,97,82) on rgb(39,39,42)  "9/5/2026, 11:31:41 AM"
   2.45  10px/400  rgb(107,97,82) on rgb(39,39,42)  "→ ±0.0"
   2.45  10px/400  rgb(107,97,82) on rgb(39,39,42)  "top 10% of a 20-sample, hand-authored synthetic …"
   2.45  10px/400  rgb(107,97,82) on rgb(39,39,42)  "Ranks 1st of 2 by health among your saved drafts"
 FAILURES <4.5:1 : 13 of 13 nodes on the cards
== LIGHT — the same nodes: 6.07–16.78, zero failures
```

The version name and the health number are at **1.13:1** — effectively invisible. This includes the two
lines this batch added (the percentile note and the draft-rank line). The section heading and the trend
caption above the cards are fine (5.29–14.62) because they sit on the theme-invariant `--sm-panel`; only
the cards go dark.

The file's own a11y comments show how it happened — `:461` says *"opacity-60 on inherited black-ish text
measured 4.45:1 on this card's white background — --sm-ink-mute clears it (6.07:1)"*. 6.07 is exactly the
light-mode number my run reproduces; the dark card was never measured. This is the mirror image of the
Shape & Rhythm fix in the same batch (there: `dark:` variants on a theme-invariant panel; here:
theme-invariant tokens on a real dark card) — the two lanes fixed opposite halves of one convention
collision and neither checked the other direction.

**BUILD/WIRE fix**: pick one convention per surface and make the gate enforce it. The cheapest correct
build here is to drop `dark:bg-zinc-800` and put the cards on `bg-[var(--sm-panel-2)]` (theme-invariant,
matching `.sm-card` in `src/styles/design-system.css:126`), so the existing `--sm-ink`/`--sm-ink-mute`
text is correct in both themes — the same move the Shape & Rhythm fix made. Then extend
`scripts/verify-a11y.mjs` past the `data-a11y-section="shape-rhythm"` scope it currently audits to the
Ship panel's `section[aria-labelledby="ship-versions-heading"]`, in dark mode, and watch it fail on this
tree before it passes on the fix.

## B-12 — HIGH — the Versions list is a fourth hand-copy of the draft-rank sentence: no "tied", no unranked note, different denominator

`src/components/scriptide/SnapshotManager.tsx:168-196` (`SnapshotPercentileAndRankLine`)

It receives a full `DraftRank` and renders only `rank`/`of`:

```tsx
{draftRank.rank === null || draftRank.of <= 1
  ? "Only saved draft with a health score so far"
  : `Ranks ${ordinal(draftRank.rank)} of ${draftRank.of} by health among your saved drafts`}
```

Driven, two byte-identical saves against one report (`p4-snapshots.mjs`) — a genuine dead heat,
`tied === true` on both:

```
VERSION 2 · CONSIDER · 64.3/100 · → ±0.0 · top 10% … · "Ranks 1st of 2 by health among your saved drafts"
VERSION 1 · CONSIDER · 64.3/100 ·            top 10% … · "Ranks 1st of 2 by health among your saved drafts"
```

No "tied". Then a third Version saved after an edit (so no fresh report — `health` absent):

```
VERSION 3 · 9/5/2026, 11:30:42 AM          <- no score line at all, no explanation
VERSION 2 · … "Ranks 1st of 2 by health among your saved drafts"
VERSION 1 · … "Ranks 1st of 2 by health among your saved drafts"
```

Three saved versions are on screen and both rank lines say "of 2". The `DraftRank` those rows hold
carries `unscored: 1`; `unrankedDraftsNote()` exists in `src/lib/draft-rank-copy.ts:74-81` precisely for
this and is never called here. The panel, given the identical object, would render "… — 1 of 3 runs and
saved drafts of this script is unranked (saved without a fresh diagnosis)".

Three drifts in one component: the missing `tied` prefix (the audit-round-2 defect, unfixed on this
surface), the missing unranked note (the review-round-2 defect, unfixed on this surface), and a
denominator noun — "among your saved drafts" — hand-written instead of `draftRankDenominatorLabel()`.
Together with B-1 that makes **four** places rendering this one sentence and only two of them fixed.

**BUILD/WIRE fix**: the same lift as B-1 — one `draftRankSentence(draftRank)` in `draft-rank-copy.ts`
that every surface calls. Here the population genuinely differs (snapshots only, no Draft History), so
the shared builder should take the denominator label as a parameter (`'saved versions of this script'`
vs `'runs and saved drafts of this script'`) rather than being forked — that keeps the tie prefix and
the unranked note automatic on all four surfaces. Then add SnapshotManager.tsx to
`tests/core/percentile-copy-consistency.test.ts`'s table with a draft-rank row, run it against the
current tree to see it fail first.

---

# Area 5 — SlatePanel (Labs on)

**What I tried.** `p5-slate.mjs`: Labs on → overflow → "Slate compare"; selected the same `.fountain`
file **twice** through the real hidden `<input type="file">`, then a rejected `.pdf`, then a second real
script, then ranked; read the table's headers/tooltips/rows and the visible captions; measured every
text node in the table plus the captions, light and dark, with canvas-resolved colours.

**Clean — the file-input fix is real.** `ac3ec262`'s `Array.from(e.target.files)`-before-`value = ""`
fix works: selecting the same filename a second time adds a second entry rather than silently doing
nothing. The `.pdf` is rejected without breaking the panel. The Percentile column header carries
`percentileColumnHeaderTooltip()` and the **visible** caption is really rendered as page text:
`"Percentile ranks each script's health against a 20-sample, hand-authored synthetic reference set —
not the other scripts in this slate."` — the owner-rule follow-up holds. The Shape & Rhythm column
renders `swing 0.00 · cv 0.22` per row with its own "descriptive only" tooltip and a visible caveat on
the "Ranked …" line.

## B-13 — HIGH — the file-input fix exposes a React duplicate-key error and a duplicated row

`src/components/SlatePanel.tsx:679,711` (`key={entry.contentHash ?? …}`)

The very flow the fix enables — adding the same script twice — produces four genuine React console
errors and a duplicated table row (`p5-slate.mjs`):

```
CONSOLE ERRORS: [ "Encountered two children with the same key, `%s`. … e05565d48ee9d2e8…", x4 ]
rows: [ ["1","beta","67","Consider","top 10%","14 / 590", …],
        ["2","alpha","61","Consider","top 10%","10 / 422", …],
        ["3","alpha","61","Consider","top 10%","10 / 422", …] ]   <- same script, ranked twice
```

Two scripts with identical text share a `contentHash`, so the row key collides. React's own message
says the behaviour is "unsupported and could change" — and it lands on the console-error tripwire the
browser suites use (`wireConsoleCapture` classifies it as a genuine error). The slate also ranks the
same script twice, which quietly changes what "3 scripts ranked" means.

**BUILD/WIRE fix**: key rows by the slate file's own id (`SlateFile.id`, already a `crypto.randomUUID()`
used at `:499`) carried onto the entry, not by content hash — a content hash is a *value*, not an
identity. Then decide the product question deliberately: either dedupe identical submissions in
`handleFilesSelected` with a visible "already in this slate" note (the panel already has a `problems[]`
channel for exactly this), or keep both rows and label them. Either is a build; the current state is
neither.

## B-14 — MEDIUM — the slate's Health column fails contrast in light mode, and the whole table fails in dark

`src/components/SlatePanel.tsx` (health cell colour; `dark:bg-zinc-*` rows with `--sm-ink` text)

Measured (`p5-slate.mjs`, canvas-resolved, 36 nodes each pass):

```
== light — 3 below 4.5:1 ==
   2.13  12px  rgb(254,154,0) on rgb(255,255,255)  "67"     <- the health score itself
   2.04  12px  rgb(254,154,0) on rgb(249,250,251)  "61"
== dark — 6 below 4.5:1 ==
   1.06  12px  rgb(33,29,21) on rgb(24,24,27)  "1" / "beta"
   1.13  12px  rgb(33,29,21) on rgb(39,39,42)  "2" / "alpha"
```

The light-mode failure is the *health number* — the one value the whole panel exists to compare. The
dark-mode failures are the same convention collision as B-11: the rows take a real dark background while
the rank and title keep the light-theme `--sm-ink`.

**BUILD/WIRE fix**: same as B-11 — one surface convention. Give the health cell a colour that clears
4.5:1 against both row backgrounds (the amber is a semantic band colour, so darken the band ramp rather
than dropping it), and put the rows on a theme-invariant token so `--sm-ink` stays correct. Extend the
a11y gate to this table in both themes.

---

# Area 6 — WhatIfPanel (Labs on) — PARTIAL, and I am saying so rather than claiming coverage

**What I tried.** `p6-whatif.mjs`: Labs on, overflow menu → the panel is not directly listed; "Open
Simulate" opens the IDE's Simulate task tab and "Open Studio" opens StoryMachine with group tabs
`Production / Analysis / Engine / Codex / Research`. I scanned Analysis and Engine for a "What-if"
control (none found), and the Production/Research group buttons could not be clicked — a
`div.p-6.space-y-6` and the mobile-only `button[aria-label="Close studio panel"]` intercept the pointer
at their centres, so Playwright's real-click path times out on both. I did not reach `WhatIfPanel` in
the budget available, so **I make no claim about its DoctorReadout percentile, promote/undo behaviour,
or focus trap** beyond what is below.

What I did verify, on the wire the panel consumes: `server/routes/nvm/twin-whatif.ts:162-190`'s
`presentReport` now emits `contentHash` unconditionally and `healthPercentile` gated on the same
`complete` flag as `health`/`grade`/`verdict`, and `src/components/ScriptIDE.tsx:1118-1160` copies both
onto **both** the promoted and the undo snapshot with the never-fabricated `...(x !== undefined ? … : {})`
rule. The REVISE items the rank review raised (`rank-review.md:140-143`: "promotedSnapshot and
undoSnapshot carry no contentHash") are genuinely closed in the diff.

The one defect I can state with evidence, because it is not What-If-specific: a promoted snapshot's
Versions row goes through `SnapshotPercentileAndRankLine`, so it inherits B-12 in full — no tie prefix,
no unranked note, and a denominator that counts only snapshots while the Doctor panel's line counts the
union with Draft History.

**Note for whoever picks this up**: the two intercepted group buttons are themselves worth a look —
`button[aria-label="Close studio panel"]` is `md:hidden` yet was hit-testing over a group tab at a
1280 px viewport, which is the same class of overlay defect as B-8.

---

# Area 7 — Exports from the panel

**What I tried.** Drove Export report + Coverage letter from a real report in the panel
(`p7-exports.mjs`), then hit both routes directly with three identical `draftRank` payloads
(`p7b-routes.mjs`), then rendered the returned HTML from `file://` in Chromium in light, in
`prefers-color-scheme: dark`, and at 375 px, and grepped it for panel chrome.

**The driven confirmation of B-1.** One click each, same report, same moment:

```
panel  : "First saved draft — rank among your drafts appears after your next run or save"
LETTER : "This is your first saved draft of this script — a rank … will appear after your next run or save."
HTML   : "First saved draft — rank among your drafts appears after your next save"
```

and at the route level (HTTP 200 from both, identical body):

```
tied 1st of 6         HTML "Rank among your drafts: 1st of 6 (by health, your own saved drafts of this script)"
                      LETTER "…this one ties for 1st of 6 by health…"
2nd of 4, 2 unscored  HTML "Rank among your drafts: 2nd of 4 (by health, your own saved drafts of this script)"
                      LETTER "…ranks 2nd of 4 … 2 of 6 runs and saved drafts of this script are unranked
                              (saved without a fresh diagnosis)."
```

**Clean.** No panel chrome leaks into the export — `Verify my rewrite`, `Draft History`,
`Run Diagnosis`, `Deep read`, `Fix & verify`, `localStorage`, `sm_doctor` are all absent from the HTML.
The exported page raises no console errors of its own. Fountain/FDX/PDF exports were not re-driven
(nothing in this range touches them; the coverage lane's diff does not reach `fountain.ts`/`fdx.ts`).

## B-15 — MEDIUM — the shareable coverage report fails contrast on its own evidence lines, and overflows a phone

`server/lib/coverage-html.ts` (the `STYLES` block's muted colours; the wide blocks' lack of an
`overflow-x` wrapper)

Measured on the downloaded file rendered from `file://` (`p7b-routes.mjs`, 730 text nodes):

```
light : 7 nodes below 4.5:1 —
        2.48  "Based on 49 issues across 3 passes (Structure, …)"   (x5, one per dimension)
        2.48  "The 14 findings below cluster the detailed issues…"
        3.19  "11"
dark (prefers-color-scheme: dark) : identical — bodyBg stays rgb(244,242,236)
375 px : documentElement.scrollWidth > clientWidth  ->  horizontal overflow: TRUE
```

The failing lines are the *provenance* lines — "Based on N issues across M passes" is the sentence that
tells a producer where a dimension score came from, which is the whole third-party-verifiability claim
of ROADMAP P3. And the report a writer sends to a producer does not fit a phone.

The dark-mode result is by design (the export is a fixed-palette, print-like document with no
`prefers-color-scheme` rules) and it stays legible, so that half is fine — but it is worth stating
explicitly rather than leaving it an unknown.

**BUILD/WIRE fix**: raise those two muted colours in `coverage-html.ts`'s `STYLES` block so they clear
4.5:1 against their own card backgrounds (they are literals in that one file, so this is a one-place
change), and give the wide blocks (the per-scene strip, the tables) their own `overflow-x: auto` wrapper
so the page body stops scrolling sideways at 375 px. Then extend `tests/core/coverage-html.test.ts` with
a rendered-contrast assertion — the existing tests check for substrings, so no test in the repo can
currently fail on a colour.

---

# Area 8 — Cross-cutting

**What I tried.** Captured every `/api/**` request and every console `error`/`warning`/`pageerror` on
the keyless default surface across StartScreen → "Try sample coverage" → "Full report"
(`p8-network.mjs`), plus the console sink wired into every other probe in this report.

**Clean.** No console errors or warnings at all on the default path, and no network call that should not
fire:

```
== StartScreen ==            []
== sample coverage run ==    { "GET /api/ai-config": 2, "GET /api/scriptide/load": 1,
                               "POST /api/scriptide/doctor/stream": 2 }
== Full report ==            { "GET /api/ai-config": 2, "POST /api/events": 2 }
== console (errors + warnings), deduped ==  []
```

Nothing reaches `/api/analyze-script` or any generative route with Labs off and no key. The only
anomaly in that table is the **two** `doctor/stream` POSTs, which is B-4's duplicate run (one sample
run, then a plain run that overwrites the sample provenance) — the cost side of that defect is that the
P0 golden path pays for two full 14-pass analyses.

The only React key warning found anywhere in this hunt is B-13's, on the Labs-gated Slate panel.

---

# Summary

| id | severity | area | one line |
|---|---|---|---|
| B-1 | CRITICAL | 1, 7 | exported coverage HTML is a third hand-copy of the draft-rank sentence: "next save" not "next run or save", `tied` dropped, `unscored` dropped, old denominator |
| B-2 | HIGH | 1 | `verify-p2-p3-surfaces.mjs:683` pins the OLD copy, so the browser gate requires the bug |
| B-3 | CRITICAL | 1 | "runs and saved drafts **of this script**" counts other scripts and the sample; Draft History is one global store and the recorded titles are the host project's |
| B-4 | HIGH | 1 | the sample lands in the writer's Draft History on the golden path (`isSample` overwritten by a second, plain run) — and that path pays for two analyses |
| B-5 | HIGH | 2 | the sample-withhold on "Verify my rewrite" never fires on the primary entry point |
| B-6 | HIGH | 1, 2 | the rank line ranks the built-in sample "among your drafts" one paragraph above the line saying it is not your draft |
| B-7 | LOW | 2 | receipt shows `65 → 66` beside `+1.5` (true values 64.6 → 66.1) |
| B-8 | HIGH | 3 | at 375 px "Full report" is covered by the verdict paragraph — the whole Doctor panel is unreachable on a phone |
| B-9 | MEDIUM | 3 | scene bars are 21.1x40 px (below the 24x24 minimum) and their reading exists only in a `title` |
| B-10 | LOW | 3 | one-scene drafts silently lose the whole Shape & Rhythm section, including a value that WAS computed |
| B-11 | CRITICAL | 4 | dark mode: every word on a snapshot card measures 1.13–2.45:1 |
| B-12 | HIGH | 4 | Versions list is a fourth hand-copy: no tie prefix, no unranked note, different denominator |
| B-13 | HIGH | 5 | duplicate React key + duplicated row when the same script is added twice |
| B-14 | MEDIUM | 5 | slate health number 2.04–2.13:1 in light; rank/title 1.06–1.13:1 in dark |
| B-15 | MEDIUM | 7 | exported report's provenance lines at 2.48:1, and horizontal overflow at 375 px |
| — | — | 6 | What-If Lab not reached; recorded as unverified rather than claimed |

**The pattern worth naming.** Two of the four CRITICAL/HIGH families are the same mistake made twice in
opposite directions. One shared value is rendered by four independent hand-written sentences (B-1, B-6,
B-12 — `src/lib/draft-rank-copy.ts` exists specifically to stop this and only two of the four callers
use it). And one theme convention is applied per-file instead of per-surface (B-11 and B-14 versus the
Shape & Rhythm fix — this batch fixed `dark:`-variants-on-a-theme-invariant-panel in one file and left
theme-invariant-tokens-on-a-real-dark-card in two others). Both are cheap to close permanently: extend
`tests/core/percentile-copy-consistency.test.ts` to draft-rank copy with one rendered assertion per
state, and extend `scripts/verify-a11y.mjs` past its single `data-a11y-section="shape-rhythm"` scope to
the Ship versions list, the slate table and the exported HTML, in dark mode. Per LANE_STANDARD §3, both
gates must be shown to FAIL on this tree before they are shown to pass on a fix.

**Housekeeping.** Every server started was killed. Every probe lives in
`<session scratch>/mistakes-2026-09-05/`.
The worktree was never written to.
