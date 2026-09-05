# Independent review — cross-surface parity lane (LANE_STANDARD §6)

Reviewer: independent agent (did not build this change).
Worktree: `/home/user/STORYMACHINE/.claude/worktrees/agent-a44b759f2b8a6d0d2`
Branch: `worktree-agent-a44b759f2b8a6d0d2`, one commit `aa45951e`, 16 files,
+632/-23. Reviewed read-only; one probe planted and reverted (§3 below);
final `git status --porcelain` in the worktree: clean (empty).

**Verdict: REVISE** — four numbered items in §5. The feature itself is real
and works end to end in a browser; the defects are in the proof, in one
surface's copy, and in one gate assertion.

---

## 1. Brief item vs. diff

| # | Brief item | Status | Evidence |
|---|---|---|---|
| 1a | Coverage HTML renders the health percentile with the panel's exact copy | **DONE** | `server/lib/coverage-html.ts:138-142` produces `Health percentile: <band> within a 20-sample, hand-authored synthetic reference set` plus the same `title="Exact rank: Nth of 20 reference samples"` tooltip as `src/components/scriptide/ScriptDoctorPanel.tsx:3982-3985`. Byte-for-byte identical sentence confirmed in a live export (§2). |
| 1b | Draft-rank line when the body carries `draftRank`; schema added like `CoverageLetterBodySchema.draftRank`, bounds-checked | **DONE** | `server/lib/validation.ts:866-874` (`CoverageBodySchema` = `DoctorBodySchema` fields + `DraftRankSchema.optional()`, no accepted field lost); route swap at `server/routes/export.ts:323-325,402`; render at `coverage-html.ts:155-161`; panel pass-through at `ScriptDoctorPanel.tsx:2836,2856` (export payload only — no `DraftRankLine`/`ShapeRhythmSection` edit, as the coordinator required). Bounds proved live: `rank>of` → 400 "rank must not exceed of"; `rank:0` → 400; `of:999` → 400; `1.5` → 400; string → 400. |
| 1c | "Reports without those fields render byte-identically (find the existing fixtures/tests and prove it)" | **SILENTLY CHANGED — the claim is false and the test cannot fail** | Rendering the same report (with `healthPercentile` deleted, no opts) through `main`'s and the lane's `renderCoverageHtml`: **215 629 vs 215 908 bytes**, diff = a new `<div class="health-text-block">` wrapper around `.plain-summary` (`coverage-html.ts:212-216`), two new CSS blocks (`:699-711`), two blank interpolation lines. The test the report cites (`tests/core/coverage-html.test.ts:661-666`) compares `renderCoverageHtml(r,t)` with `renderCoverageHtml(r,t,{})` — but the signature is `opts: CoverageHtmlOptions = {}` (`coverage-html.ts:1070`), so the two calls are the same call. Probe: I injected an unconditional `<div class="REVIEWER-PROBE">` into every report's health section; **all 41 tests still passed**, including the "byte-identical" one (probe reverted). |
| 2a | Snapshots additively store `healthPercentile`, captured the same way `health` is, only from a fresh scored report | **DONE (one of three writers left out)** | `SnapshotManager.tsx:42`; capture at `ScriptIDE.tsx:2091-2096` (`confirmSnapshot`, gated on `freshReport`) and `:1121-1124` (undo path, gated on `previousReport`). The third snapshot writer — the What-If promote path, `ScriptIDE.tsx:1131-1144` — cannot carry it because `BranchPromotion` (`WhatIfPanel.tsx:215-231`) has no such field and `presentReport` (`server/routes/nvm/twin-whatif.ts:161-178`) never emits one. Disclosed in the report; see §3.3. |
| 2b | Trend renders it beside health | **DONE, with copy drift** | `snapshot-trend.ts:52,131`; rendered at `SnapshotManager.tsx:183-187`. Copy is **not** the panel's: `top 10% of 20-sample reference set` (`:185`) vs the panel's `Health percentile: top 10% within a 20-sample, hand-authored synthetic reference set`. See §3.2. |
| 2c | Versions shows each snapshot's rank; **reuse `computeDraftRank`, never a second implementation** | **DONE** | `snapshot-trend.ts:153-158` — `snapshotDraftRanks` literally calls `computeDraftRank(others, snap.health)`; no second ranking arithmetic anywhere (`grep` for a rank computation finds only `computeDraftRank`). Wired at `SnapshotManager.tsx:262,308,225`. The agreement test (`tests/core/snapshot-trend.test.ts`, "agrees exactly with computeDraftRank(others, thisHealth) called directly") is real, though tautological by construction; the ordering/tie/null tests around it are not. |
| 3 | `verify.recomputed.structuralSignals`, informational only, tampering must not flip `verified` | **DONE — reproduced live** | `server/routes/export.ts:785-790`. My own POST with `expected.structuralSignals = {999, -999}`: `verified: true`, `mismatches: []`, `checked: ["contentHash","health","verdict","totalIssues"]`, `recomputed.structuralSignals` unchanged at `{0.2846, 0.6385}`. The field is structurally unnameable (no `expected.structuralSignals` in `VerifyBodySchema`), so this is a guarantee, not a convention. |
| 4 | Slate rows gain the two aggregates when scored, labelled descriptive, rendered in `SlatePanel.tsx` "with the same 'not part of the score' copy the panel uses" | **NARROWED** | Data + HTML: `server/lib/slate.ts:86-89,265-268,280,314,326-327` — the exported HTML carries a visible footer sentence, good. In-app: `SlatePanel.tsx:666-671,760-768` put that copy **only in a `title=` tooltip**. The panel's own Shape & Rhythm label is visible text (`ScriptDoctorPanel.tsx:1967`, `SnapshotManager.tsx:131`). A keyboard or touch reader of the Slate never sees "not part of the score". |
| 5 | ARCHITECTURE surface table + CLAIMS_REGISTER additively for any new empirical sentence | **NARROWED** | `ARCHITECTURE.md:187-212` matrix is accurate and matches what I measured. Register rows 46-50 added; every evidence pointer's file exists and every quoted test name exists (`coverage-html.test.ts` ×3, `snapshot-trend.test.ts` `snapshotDraftRanks`, `verify-p2-p3-surfaces.mjs`, `export-producer.test.ts` — names paraphrased for row 50 but present), and rows render as 6-cell table rows (`honesty-audit` exit 0). **Missing:** the new snapshot percentile sentence (`SnapshotManager.tsx:185`) is a new empirical sentence and is not registered. (The pre-existing ARCHITECTURE line 187 still says `draftRank` is "passed through `POST /api/export/coverage-letter`" — now also `/api/export/coverage`; stale by one route.) |
| — | Never touch scoring path | **DONE** | `node scripts/check-scoring-receipt.mjs main..HEAD` → "no scoring-path files changed. OK." (exit 0). |

## 2. Driving it — and the parity check: **REPRODUCED**

Keyless server booted from the worktree (`SESSION_DB_DIR=:memory: PORT=5391
node --experimental-strip-types server.ts`, `llmReady:false` confirmed);
real Chromium (`/opt/pw-browsers/chromium`) driving the built `dist/`.

Sample script "Dead Frequency" → `POST /api/scriptide/doctor`: **health 78.3,
verdict CONSIDER, healthPercentile 100, structuralSignals
meanAbsDialogueShareDelta 0.2846 / actionSentenceCvOverall 0.6385.**

| Surface | Percentile | Draft rank | The two aggregates |
|---|---|---|---|
| ScriptDoctorPanel (browser, dialog) | `Health percentile: top 10% within a 20-sample, hand-authored synthetic reference set` | `Rank among your drafts: 1st of 3 (by health, your own saved drafts of this script)` | Shape & Rhythm section present |
| Exported coverage HTML (downloaded through the real Export button, 2 saved snapshots) | identical string | identical string | `swing 0.28 · … · action-sentence variation 0.64` |
| Coverage HTML via route, `draftRank {2,5}` / `{1,1}` | same line | `Rank among your drafts: 2nd of 5 (…)` / `First saved draft — rank among your drafts appears after your next save` | same |
| Coverage letter | "ranks in the 100th percentile against a fixed, 20-sample, hand-authored reference set" | "ranks 2nd of 5 by health" | "0.28" and "0.64" |
| Versions (Ship, after two saves) | `top 10% of 20-sample reference set` | `Ranks 1st of 2 by health among your saved drafts` (both rows — tie shares the better rank) | `Talk/action swing 0.28 → 0.28` |
| `POST /api/export/verify` | `healthPercentile: 100` | n/a | `{0.2846, 0.6385}` exact |
| `POST /api/export/slate` (JSON + HTML) | `100th pct` | n/a | `swing 0.28 · cv 0.64` |

**Same numbers everywhere — REPRODUCED.** Every reading traces to the one
report (`healthPercentile` 100; `0.2846`/`0.6385`), and `computeDraftRank` is
the single rank producer. Two presentation notes that fall out of the drive
(both pre-existing, neither introduced here): the letter and the slate print
the **exact ordinal** ("100th percentile", "100th pct") while the panel,
coverage HTML, Versions and SlatePanel print the D5 **band** ("top 10%"); and
the panel's denominator counts the unsaved current draft ("1st of **3**")
while the adjacent Versions row counts only saved snapshots ("1st of **2**")
— a writer sees two denominators for what looks like one question.

Gates I re-ran myself, in the worktree, foreground, exit codes:
`npm run lint` 0 · `npm run honesty-audit` 0 · `npm run check-docs` 0 ·
`npm run check-no-console` 0 · `check-scoring-receipt main..HEAD` 0 ·
touched tests 41/36/18/24 pass, 0 fail · `PW_CHROMIUM_PATH=… npm run
verify:surfaces` exit 0, **162/162 assertions** · full `npm test` exit 0,
**11 877 tests / 11 785 pass / 0 fail / 91 skipped / 1 todo** — every gate
number in the lane's report reproduced exactly.

## 3. The shortcut hunt

**3.1 A test that cannot fail (the one that matters).** Covered in the table:
the byte-identity guarantee the brief asked to be *proved* is asserted by a
test whose two sides are the same function call, and the actual output is
**not** byte-identical to the pre-change renderer (+279 bytes). My injected
`REVIEWER-PROBE` div passed all 41 tests. The report states this as "Proved
byte-identical when both fields are absent" — by LANE_STANDARD §5 that is a
false report line for a narrowed item, and by §3 the guard was never shown to
fail on the unfixed input.

**3.2 Copy that differs by a word between surfaces.** `SnapshotManager.tsx:185`
renders `top 10% of 20-sample reference set`; every other surface says
`within a 20-sample, hand-authored synthetic reference set`. The dropped words
are the honest ones — "hand-authored synthetic" is what stops a reader
assuming the percentile is against *real* scripts. The rank line diverges too
("Ranks 1st of 2 by health among your saved drafts" vs "Rank among your
drafts: 1st of 3 (by health, your own saved drafts of this script)"); that one
is registered (row 49) and defensible as a compact list variant, the
percentile one is neither registered nor compact-by-necessity. Related: after
this commit `ordinal()`/`percentileBand()` exist in **four** copies (panel
`:349,374`, `coverage-html.ts:110,127`, `SnapshotManager.tsx:146,163`,
`SlatePanel.tsx:144,166`) and **no test compares any two of them** — the panel's
own copy is not pinned anywhere, so a wording change there silently desyncs
the exported artifact. The drift the lane's own comment warns about ("any
wording change there needs the identical change made here") already happened
inside this same commit.

**3.3 The widened browser assertion.** `scripts/verify-p2-p3-surfaces.mjs:1280`
accepts either `Ranks N of M by health among your saved drafts` **or** `Only
saved draft with a health score so far`. It can still fail (if the line stops
rendering), but it cannot distinguish a correct per-snapshot rank from a
degenerate implementation that always returns `{rank:1, of:1}` — and by the
lane's own account the branch the gate actually hits is the `of <= 1` one
(the promote flow's undo snapshot is unscored, confirmed in the battery
output: only the promoted snapshot carries `health`). So the browser gate
proves the line exists, not that the rank is real. This is avoidable: in my
own Chromium run, saving two versions from the sample flow (`Ship` → "Save
Version" ×2) rendered `Ranks 1st of 2 by health among your saved drafts` in
about twenty lines of driver code — a strict assertion is reachable in the
same battery.

**3.4 What-If promotion without `healthPercentile` — "out of scope"?** Half
true. The report's stated blocker (server route + panel contract) is real but
tiny: `presentReport` (`twin-whatif.ts:161-178`) already emits health,
verdict and both aggregates from a report that *has* `healthPercentile`;
adding it is one gated spread there, one optional field on `BranchPromotion`
(`WhatIfPanel.tsx:215-231`), one line at the promotion call
(`WhatIfPanel.tsx:834-844`) and one at `ScriptIDE.tsx:1131-1144`. The
concurrency worry is thinner than stated — the coordinator's note named
`ScriptDoctorPanel.tsx`, not `WhatIfPanel.tsx`. The visible consequence of
leaving it: inside the *same* Versions list, a manually saved snapshot now
shows a percentile line and a promoted one never can — an asymmetry this
commit created (before it, no snapshot showed one).

**3.5 Claims-register rows.** Verified: all five rows render as proper table
rows, every evidence pointer's file exists on disk (honesty-audit invariant 2
passes), and each quoted test name is a real test. No fabricated evidence.

**3.6 A percentile without its denominator.** `SlatePanel.tsx:740-751` shows
`top 10%` under a bare `Percentile` header with the denominator only in a
`title=` tooltip — no visible "of 20 reference samples" anywhere in the panel
(the exported slate HTML does state it, `slate.ts:322-325`). Pre-existing, not
introduced here, but it is exactly the question the audit asked and it now
sits next to a second tooltip-only caveat this lane added (§1 item 4).

**3.7 Copy that must be true in every state that renders it.** The exported
coverage HTML for a first-time user renders "First saved draft — rank among
your drafts appears after your next save" — addressed to the writer, inside
P3's shareable artifact that a third-party reader receives. The coverage
letter already does the same thing (register row 35), so this is consistent
rather than new; flagging it as a product question, not a lane defect.

## 4. What a stronger version would have done

The stronger version would have made the byte-identity claim *true* instead of
*asserted*: keep the new wrapper only when at least one of the two lines
exists, and pin the no-fields health section against a committed fixture
string — the test I probed would then have failed on my injected div, which is
what "prove it, do not assert it" means here. It would have shipped **one**
copy of the percentile sentence rather than a fourth hand-copy: a tiny shared
module (`percentileBandLabel` + the sentence) imported by `coverage-html.ts`,
`SnapshotManager.tsx` and the panel, or — if the pure-renderer rule really
forbids the import — a test that reads `ScriptDoctorPanel.tsx`'s literal and
asserts the exported HTML contains the identical string, so drift fails CI
instead of being warned about in a comment. It would have saved two versions
in the browser battery so the rank assertion tests a real `N of M`. And it
would have spent the five extra lines to carry `healthPercentile` through the
What-If promotion, so the Versions list is internally uniform rather than
uniform-except-promoted. All four are inside this lane's blast radius; none
touches the scoring path, the concurrent lane's `ScriptDoctorPanel.tsx`
sections, or any gate.

## 5. Verdict: REVISE

1. **`tests/core/coverage-html.test.ts:661` + `server/lib/coverage-html.ts:212-216,699-711`** —
   the "byte-identical" test compares `render(r,t)` with `render(r,t,{})`,
   which is the same call (`:1070` defaults `opts = {}`); it passed with an
   unconditional junk `<div>` injected into every report. Either restore true
   byte-identity for the no-field case (emit the `health-text-block` wrapper
   only when a percentile or rank line exists) and pin it with a fixture the
   probe would break, or drop the claim and record the exact +279-byte delta
   against `main` in the report. Do not leave a report line saying "proved
   byte-identical" while the bytes differ.
2. **`src/components/scriptide/SnapshotManager.tsx:185`** — the Versions
   percentile copy drops "hand-authored synthetic", the qualifier that keeps
   the reference set from reading as real scripts. Use the panel's sentence
   (compact form is fine: `top 10% of a 20-sample, hand-authored synthetic
   reference set`), and add the resulting sentence to
   `docs/CLAIMS_REGISTER.md` — brief item 5 requires it and rows 46-50 do not
   cover it.
3. **`src/components/SlatePanel.tsx:666-671,760-768`** — "Descriptive only —
   not part of the score or this ranking" is tooltip-only, so keyboard and
   touch readers never see it. Render it as visible copy (the `Ranked …`
   caption line at `:652` is the natural home), matching the visible label the
   Doctor panel and Versions use and the visible footer the exported slate
   HTML already carries.
4. **`scripts/verify-p2-p3-surfaces.mjs:1280`** — the widened assertion passes
   on the `of <= 1` branch, which is the branch the promote flow actually
   produces, so it cannot catch a degenerate rank. Add a strict assertion in
   the sample-coverage context (save two versions, assert `Ranks 1st of 2 by
   health among your saved drafts`); keep the widened one for the promote
   context if you like, but the battery must exercise a real `N of M`.

Optional, and I would take it if the lane has room (§3.4): carry
`healthPercentile` through `twin-whatif.ts`'s `presentReport` →
`BranchPromotion` → `promotedSnapshot` so promoted snapshots are not the one
row in Versions that can never show a percentile.

Nothing in items 1-4 touches the scoring path, `doctor.ts`'s import graph, or
the sections of `ScriptDoctorPanel.tsx` the concurrent lane owns.

---

# Re-review (2026-09-05)

**Verdict: MERGE.** All four REVISE items are genuinely fixed — verified
independently, not taken on the report's word — and the two extras the
coordinator required plus the file-input bug are real and driven in a browser.

State: `/home/user/STORYMACHINE/.claude/worktrees/agent-a44b759f2b8a6d0d2`,
rebased onto `686e6268`, three commits `842f0fcc` · `c2eb1606` · `41c40ddf`,
`git status --porcelain` empty before and after my work. I drove the previous
rebase of the same work (`5c53a390`); `git diff 5c53a390 HEAD` is
**`docs/LANE_STANDARD.md` only** (main's own docs commit), so every
measurement below applies to `41c40ddf` verbatim, and the two cheapest checks
(fixture test + probe) were re-run on `41c40ddf` itself. The SnapshotManager
conflict resolution keeps main's extracted dialog components — `useModalFocusTrap`
at `:241` and `:324`, `role="dialog"`/`aria-modal` on both modals — with the
lane's percentile/rank line re-inserted in the list half (`:170-171`, `:401-404`,
`:450`). Nothing from either side was dropped.

## Item by item

| # | Claim | Verdict | Evidence |
|---|---|---|---|
| 1 | Byte-identity made TRUE; fixture from main's renderer; my probe now fails | **VERIFIED** | Wrapper and CSS are conditional: `coverage-html.ts:196` (`textBlock` ternary), `:916` (`HEALTH_TEXT_BLOCK_STYLES` held out of `STYLES`), `:1106` (`needsHealthTextBlockStyles`, one boolean for markup and CSS), `:1130`. **Independent check** (not the lane's test): main's `renderCoverageHtml` vs the lane's, same real doctor report with `healthPercentile` deleted → **identical, 215 629 = 215 629 bytes** (it was 215 629 vs 215 908 last round); with a percentile present the lane's output legitimately grows +457. Fixture `tests/fixtures/coverage-html/no-percentile-no-draftrank.html` is 18 301 bytes and contains **0** occurrences of `health-text-block`/`health-percentile`. **Probe re-run on `41c40ddf`**: re-injecting the unconditional `REVIEWER-PROBE` div at the same site turns 42/42 pass into **40 pass / 2 fail** (the byte-identity test and the new no-wrapper/no-CSS test); reverted, worktree clean. The guard bites. |
| 2 | One shared `percentile-copy.ts`; "hand-authored synthetic" restored; consistency test; register row 51 | **VERIFIED** | `src/lib/percentile-copy.ts` (ordinal, percentileBand, exactRankTooltip, healthPercentileSentence, compactPercentileNote, referenceSetDescription, percentileColumnHeaderTooltip, slatePercentileCaption). Imported by panel `:54`, `coverage-html.ts:36`, `SnapshotManager.tsx:9`, `SlatePanel.tsx:25-27`, `slate.ts:25`, `WhatIfPanel.tsx:20`; no local `ordinal`/`percentileBand` survives in any of the six. Compact note now reads, live in the browser, `top 10% of a 20-sample, hand-authored synthetic reference set` (`SnapshotManager.tsx:171`). `tests/core/percentile-copy-consistency.test.ts` 19 pass — source scans **plus** rendered-output assertions on both the coverage HTML and the slate HTML. Register row 51 added. |
| 3 | Slate "not part of the score" is visible copy; test strips `title=` | **VERIFIED** | `SlatePanel.tsx:643` visible span (caption line) and `:780-782` the percentile caption; the stripping test lives in `tests/core/shape-rhythm-panel-copy.test.ts` (23 pass) and asserts the match survives `title="…"` removal. In my browser run the panel renders `RANKED 9/5/2026, 1:59:13 AM · Shape & Rhythm column is descriptive only — not part of the score or this ranking` as page text. |
| 4 | Strict `Ranks 1st of 2 …` assertion in the sample-coverage context | **VERIFIED** | `scripts/verify-p2-p3-surfaces.mjs:844-849` asserts the exact string after two saves. Independently reproduced in my own Chromium run: after saving "Rev A" and "Rev B" the Versions list shows **`Ranks 1st of 2 by health among your saved drafts`** on both rows (the documented tie rule), not the `of <= 1` copy — the branch the old widened assertion could never leave. |
| 5 (extra) | Slate percentile denominator visible on **both** surfaces | **VERIFIED** | Shared functions used in both: `SlatePanel.tsx:655` (header tooltip) + `:780-782` (visible caption); `slate.ts:315` + `:331`. Live route output: footer `Percentile ranks each script's health against a 20-sample, hand-authored synthetic reference set — not the other scripts in this slate.`, header `title="Rank against a 20-sample, hand-authored synthetic reference set, not the other scripts in this slate"`. In-app: the same caption rendered under the ranked table (browser-read text, not source). |
| 6 (extra) | What-If DoctorReadout shows the percentile | **VERIFIED** | `WhatIfPanel.tsx:480` via the shared `compactPercentileNote`; server side `twin-whatif.ts:174` gated on the same `complete` flag as health/grade/verdict; `tests/routes/nvm-whatif-doctor.test.ts` (5 pass) asserts base **and** every branch carry it. Drove the Lab end to end (seed ops → Advanced: Simulation → Inspect → What-if → Explore → Score with Script Doctor): before scoring **no** percentile text exists (honest absence); after scoring the branch cards read `bottom 10% of a 20-sample, hand-authored synthetic reference set` and `top 50% of a 20-sample, hand-authored synthetic reference set`. |
| 7 | The `FileList` bug and its fix | **CONFIRMED — a real user-facing bug** | Mechanism isolated in real Chromium on a bare page: a live `FileList` with 2 files reports `{before: 2, liveAfterReset: 0, copiedAfterReset: 2}` after `input.value = ''`. The old code read the live list, reset, then tested `list.length > 0` — always 0, so the Slate picker silently accepted nothing for **any** user, not just Playwright. Fixed at `SlatePanel.tsx:442` (`Array.from(e.target.files)` before the reset) with `handleFilesSelected(fileList: File[])` at `:233`; single call site, so no `dataTransfer` path is left passing a `FileList`. End to end: uploading two `.fountain` files now yields `Scripts (2/20)` and a successful rank (`POST /api/export/slate` 200). |

## Five surfaces, one input — IDENTICAL

Sample script "Dead Frequency": health **78.3**, `healthPercentile` **100**,
signals **0.2846 / 0.6385**.

| Surface | Percentile string rendered |
|---|---|
| ScriptDoctorPanel (browser) | `Health percentile: top 10% within a 20-sample, hand-authored synthetic reference set` |
| Exported coverage HTML (real download) | the identical string |
| Versions / snapshot trend | `top 10% of a 20-sample, hand-authored synthetic reference set` |
| Slate — in-app row + caption | row `TOP 10%`, caption `Percentile ranks each script's health against a 20-sample, hand-authored synthetic reference set …` |
| Exported slate HTML | the same caption + the same column tooltip |
| `POST /api/export/verify` | `recomputed.healthPercentile: 100`, `structuralSignals {0.2846, 0.6385}`; a tampered `expected.structuralSignals {999,-999}` still returns `verified: true`, `mismatches: []` |

Same band, same qualifier, one implementation. The Slate row also shows
`SWING 0.28 · CV 0.64` — the same two aggregates, same rounding, as the letter,
the export and verify.

## Gates re-run (per LANE_STANDARD §4 as amended: the orchestrator owns the full suite and the battery)

`npm run lint` 0 · `npm run build` 0 · `honesty-audit` 0 · `check-docs` 0 ·
`check-no-console` 0 · `check-scoring-receipt main..HEAD` 0 ("no scoring-path
files changed") · the seven touched/new test files on the rebased tree:
coverage-html **42**, percentile-copy-consistency **19**, shape-rhythm-panel-copy
**23**, snapshot-trend **36**, export-producer **24**, export-verify **18**,
nvm-whatif-doctor **5** — 0 failures. `draftRank` bounds still reject
`rank>of` / `rank:0` / `of:999` with 400s. No page errors in the browser runs
beyond the documented keyless WebSocket notice.

## Recorded, not blocking

1. `ARCHITECTURE.md`'s cross-surface matrix still has **no What-If Lab row**
   (0 mentions of "What-If" in that section) although that surface now shows
   both shape signals and the percentile; register row 51's "where it appears"
   names only `SnapshotManager.tsx` though `WhatIfPanel.tsx:480` renders the
   same sentence, and `slatePercentileCaption()` — now visible copy on two
   surfaces — has no row of its own. Two table lines would close all three; the
   sentences themselves are registered, so nothing user-facing overclaims.
2. `server/lib/coverage-letter.ts:230-231` is now the **only** percentile
   surface not on the shared module: it prints the exact ordinal ("100th
   percentile") and says "hand-authored reference set", dropping *synthetic*.
   Pre-existing and outside this brief, but it is the obvious next
   consolidation now that one implementation exists.
3. The consistency scan's `function ordinal\s*\(` regex would not catch a
   re-implementation written as `const ordinal = (n) => …`.

None of the three changes behavior, and none makes a rendered sentence untrue.
