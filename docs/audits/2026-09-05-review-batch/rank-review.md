# Independent review — draft-rank denominator + Shape & Rhythm dark mode / a11y gate

Reviewer: independent (did not build the change). Read-only.
Worktree: `/home/user/STORYMACHINE/.claude/worktrees/agent-a25c63e9711927c2e`
Branch: `worktree-agent-a25c63e9711927c2e`, one commit `8eef1375`, rebased on `main` `1e170831`
(`git merge-base --is-ancestor main HEAD` → 0). Final `git status --porcelain` in the worktree:
**empty** (no probe left behind; every probe ran from the scratchpad, none touched the worktree).

**Verdict: REVISE** (numbered list in §5). Two of the three findings are not actually fixed in the
running app, and the new a11y gate step cannot fail on the bug it was written for — both measured
in Chromium below, not inferred.

---

## 1. Brief vs diff

| # | Brief item | Status | Evidence |
|---|---|---|---|
| 1 | Rank among the **union** of snapshots + Draft History, deduped, honest denominator label, letter/export payload in sync | **NARROWED + SILENTLY CHANGED** | Union and dedupe exist (`src/lib/snapshot-trend.ts:141-207`), label changed to "N runs and saved drafts of this script" (`ScriptDoctorPanel.tsx:413`), one `useMemo` feeds both panel and letter (`ScriptDoctorPanel.tsx:2126`, `:3080`). **But the current run is counted twice** — every completed non-sample run writes its own entry to `sm_doctor_history_v1` (`ScriptDoctorPanel.tsx:2690`, `:2846` → `recordDoctorHistory`, `:1290`) *before* `computeDraftRank` adds `currentHealth` again, and nothing dedupes the union against the current draft. Measured: 1 run / 0 versions → "**tied 1st of 2**". The letter's denominator noun was **not** brought in sync (`server/lib/coverage-letter.ts:255` still says "Among your own saved drafts", never "runs and"). `contentHash` was added to `confirmSnapshot` (`ScriptIDE.tsx:2089`) but **not** to the What-If promote/undo snapshots (`ScriptIDE.tsx:1110-1140`), where `previousReport.contentHash` is already in hand. |
| 2 | Distinguishable unscored shape + its own copy; keep first-draft copy; tests for both | **DONE in code, UNREACHABLE in the app** | Shape (`snapshot-trend.ts:110-118`) and copy (`ScriptDoctorPanel.tsx:408-410`) are there and unit-tested. But because of item 1 the union is never empty after a real run, so neither the unscored copy nor "First saved draft" can render for a writer who just ran the doctor. Measured: seeded 5 health-less saved Versions + a run → panel rendered "**tied 1st of 2 runs and saved drafts**", not "5 saved drafts have no score yet". |
| 3 | Dark-mode fix on `ShapeRhythmSection` + close the gate hole in `verify-a11y.mjs`, proven to fail first | **NARROWED** | Labels/numbers/header fixed and measured at **18.29:1** in dark (reproduced). But three captions **inside the same section** (`ScriptDoctorPanel.tsx:657`, `:727`, `:741` — `text-gray-600 dark:text-gray-300`) were *correct* under the old `bg-white dark:bg-zinc-900` and are now **1.28:1** on the theme-invariant `--sm-panel` — a regression this change introduced, measured live. The new gate step (`scripts/verify-a11y.mjs:641-667`, `:679-691`) runs `auditSurface` with the section ~5,258px below the fold of a 52,000px-tall scroll container; axe skips it entirely, so the step passes on the broken state. |
| F/U | Render ties as "tied 1st of 6" | DONE (wording) | `ScriptDoctorPanel.tsx:413`, `coverage-letter.ts:255`. Because of item 1, `tied` is true on **every** real run, so the word now fires when there is nothing to tie with. |
| F/U | Four denominator cases (none; 5 unscored; 5 with 1 scored; 5 identical) | DONE as unit tests, **models a state the app never produces** | `tests/core/snapshot-trend.test.ts:186-215` — every case passes a `history` array that does not contain the current run's own entry, which is why the double count is invisible to the suite. |
| F/U | Dark-mode root cause = mixed chrome conventions; 1.19:1 / 1.06:1 | DONE and confirmed | I reproduced 1.19:1 (axe says 1.18) for `text-black` on `#18181b`; the 1.06:1 header figure checks out arithmetically for `--sm-ink #211d15` on `#18181b` (1.055). |
| F/U | Close the gate by clicking "Full report" in §6 | **SKIPPED in substance** | The click happens; the audit does not reach the section. See §2/§3. |

The report's own admissions are accurate as far as they go: the 5 s health+timestamp fallback, the
21→71 schema widening, the out-of-scope "Root Causes" caption fix, and surfaces/ui-polish not re-run
after rebase are all disclosed. What the report does **not** disclose is that its headline claim
("ranks the union … honestly") is off by one on every run, and that its fail-then-pass proof for the
new gate step does not hold up.

---

## 2. Driving it as a writer (Chromium, keyless server booted from the worktree)

Driver scripts: (scratch path outside the repository) (writer flow), `drive4/5/6/7.mjs`
(axe probes), `drive8.mjs` (scroll sweep), `drive9.mjs` (375px + screenshots). All use
`bootKeylessServer` + `PW_CHROMIUM_PATH=/opt/pw-browsers/chromium`; every server was shut down
(`pgrep -af server.ts` shows no process in this worktree).

Sample script seeded as the writer's own draft (`scriptide_draft_v1`), then the real Coverage →
Full report path:

| State (what the writer actually did) | Draft History button | Rank line rendered |
|---|---|---|
| A) 1 doctor run, 0 saved Versions | "Draft History **1 draft**" | "Rank among your drafts: **tied 1st of 2** runs and saved drafts of this script (by health)" |
| B) 2 runs, 0 saved Versions | "**2 drafts**" | "**tied 1st of 3** runs and saved drafts" |
| C) 3 runs + 1 **unscored** saved Version | "**3 drafts**" | "**tied 1st of 4** runs and saved drafts" (the unscored Version is silently dropped, unmentioned) |
| D) 3 runs + 2 identical scored Versions + 1 unscored | "**3 drafts**" | "**tied 1st of 5** runs and saved drafts" |
| E) 5 unscored saved Versions + a sample run | "**1 draft**" | "**tied 1st of 2** runs and saved drafts" (the new unscored copy never appears) |

- **REPRODUCED (as a defect):** the union is counted, but dishonestly. In A the writer has *one*
  run and *zero* saved drafts and is told there are two, and that they are tied. The audit's
  complaint was that the panel and the Draft History button a few hundred pixels apart disagree;
  after this change they still disagree — 1 vs 2, 2 vs 3, 3 vs 4, 3 vs 5.
- **REPRODUCED:** the label does read "runs and saved drafts of this script".
- **REPRODUCED (tie):** state D renders "tied", and the letter agrees.
- **NOT REPRODUCED:** an honest tie. `tied` was `true` in *every* state I could reach, including
  A (one run, nothing to tie with), because the current run's own history row always matches its
  own health.
- **NOT REPRODUCED:** the unscored-state copy (finding 2's deliverable). It exists only in tests.

**Letter export** (POST intercepted at `/api/export/coverage-letter`, state D):

```
payload : "draftRank":{"rank":1,"of":5,"tied":true}
markdown: Among your own saved drafts of this script, this one ties for 1st of 5 by health — …
```

Numbers match the panel exactly (1, 5, tie). **Words do not:** the panel calls the 5 "runs and
saved drafts"; the letter calls all 5 "your own saved drafts" — in that state only 3 were saved
Versions and only 2 of those carried a score. Same number, two different claims about what it is.

**Dark mode (Alt+Shift+D → Full report), resolved fg/bg + WCAG ratio, measured in page:**

| Node | fg | bg | ratio |
|---|---|---|---|
| Header span "Shape & Rhythm" | `rgb(0,0,0)` | `rgb(244,239,226)` | **18.29** |
| "Talk/action swing" / "Action-prose variation" | `rgb(0,0,0)` | `rgb(244,239,226)` | **18.29** |
| "0.28" / "0.64" | `rgb(0,0,0)` | `rgb(244,239,226)` | **18.29** |
| Root Causes caption (the lane's second fix) | `rgb(107,97,82)` | `rgb(244,239,226)` | **5.29** |
| **Section captions ×3** (`text-gray-600 dark:text-gray-300`, lines 657/727/741) | `#d1d5dc` | `#f4efe2` | **1.28** ← axe, serious |
| "Scene 1" / "Scene 12" (`text-gray-400`) | `#99a1af` | `#f4efe2` | **2.26** ← axe, serious |

The report's 18.29:1 is **REPRODUCED**. The 1.19:1 "before" is **REPRODUCED** (restoring the old
`dark:bg-zinc-900` chrome in the DOM returns those nodes to 1.18–1.19). Screenshots at 375px:
`rank-review/shape-375-light.png` vs `shape-375-dark.png` — in dark the three captions and the
scene-axis labels are visibly washed out; the labels and numbers are fine.

**`npm run verify:a11y`: exit 0, 74/74**, including
`[PASS] dark-full-report-shape-rhythm :: axe: zero serious/critical violations — clean` —
*while the 1.28:1 and 2.26:1 violations above are live in that exact dialog and theme.*

**Would the new step have failed on the old classes? NO — proven, not argued.**

1. With the section left exactly as shipped, `axe.run(document)` at the step's own scroll position:
   **0 gated violations**. Scoped to the section element: 0 violations, 101 passes.
2. Scroll the section into view, nothing else changed: **5 serious `color-contrast` violations**
   inside it (3 × 1.28, 2 × 2.26), 119 passes.
3. Restore the old chrome (`dark:bg-zinc-900`) in the DOM and re-run at the step's own scroll
   position: still **0 gated violations** document-wide. Scroll it into view: **13** nodes,
   including `1.18 (#000000 on #18181b)` on the header span, both labels and both numbers.

So the section is clipped out of axe's reach at the moment the new step measures. The report's
captured `[FAIL] dark-full-report-shape-rhythm … serious:color-contrast(1)` cannot have come from
these five/six nodes (it would have been ≥5, and it is 0 at that scroll position); the single node
is consistent with the "Root Causes" caption, which sits in the first viewport and was still broken
at 1.28:1 during that run — i.e. the fail-then-pass proof measured the *other* bug and was
attributed to this one. A scroll sweep of the dialog (`drive8.mjs`) finds **4** unique
serious/critical nodes in light and **163** in dark that the gate never sees; most are pre-existing
(`text-black` on `dark:bg-zinc-800` cards elsewhere in the panel) and not this lane's to fix, but
they are the measure of how little the new step actually audits.

---

## 3. Shortcut hunt

- **Dedupe correctness.** Hash-vs-hash and hash-mismatch paths are right. The 5 s fallback compares
  `Snapshot.analyzedAt`, a **server** `Date.now()` (`server/routes/scriptide.ts:1037`), against
  `DoctorHistoryEntry.at`, a **client** `Date.now()` (`ScriptDoctorPanel.tsx:1307`). Any client
  clock skew > 5 s silently disables the legacy fallback (double count, never a false collapse) —
  worth naming in the comment that already claims "a real same-run pair lands well inside this
  window". Conversely a legitimately different draft with the same health inside 5 s is collapsible,
  but only for pre-`contentHash` snapshots and only on a hand-edit-and-re-save inside 5 s: an
  acceptable, documented approximation. Snapshots are deliberately never deduped against each other
  — but now that both sides carry `contentHash`, two saves of the identical text count as two
  "drafts" under a label that claims to count drafts (state D: `of=5` for 3 distinct texts).
- **The real double count** is not the legacy fallback at all: it is the current run against its own
  Draft History row. `report.contentHash` is available in the panel and is simply not passed to
  `computeDraftRank`.
- **Letter tie wording.** "ties for 1st of 5" vs panel "tied 1st of 5" — fine. The **denominator
  noun** is the mismatch (§2).
- **`DraftRankSchema` bound.** 71 = 20 + 50 + 1 is the correct union ceiling (`ScriptIDE.tsx:2098`
  slices to 20; `DOCTOR_HISTORY_MAX_ENTRIES = 50`). `.refine(rank <= of)` is retained
  (`server/lib/validation.ts:848`) and the route test proves 71 accepted / 72 rejected. `unscored`
  is not in the schema — correct, the client never forwards that shape (`ScriptDoctorPanel.tsx:3080`);
  the consequence is that the letter simply omits the line in that state, which is honest by omission
  but is a surface the panel now speaks to and the letter does not.
- **What-If promotion snapshots.** `promotedSnapshot` and `undoSnapshot` (`ScriptIDE.tsx:1110-1140`)
  carry health/verdict/sceneCount/analyzedAt but **no `contentHash`**, even though `previousReport`
  has one; they enter the union on the approximate path only. Not a double count in the common case
  (both timestamps derive from the same analysis) but exactly the gap the brief asked to close.
- **Other surfaces.** No other surface renders this denominator: `grep -rn "drafts of this script"`
  hits only `coverage-letter.ts` and `snapshot-trend.ts`; the cross-surface coverage-HTML lane is not
  in `main` yet (`main` = `1e170831`) and `server/lib/coverage-html.ts` has no `draftRank`.
- **`--sm-panel` chrome at 375px.** Header/body/dialog all resolve to `rgb(244,239,226)` with
  `rgb(33,29,21)` borders; the section reads as an outlined region on the same paper as the
  "Story Metrics" block below it — consistent with `MetricStatRow`, inconsistent with the Draft
  History collapsible right below (`rgb(255,255,255)` on black border), which is a defensible trade.
  No horizontal overflow at 375 (`body.scrollWidth === innerWidth === 375`).
- **Is the "Root Causes" caption fix complete?** No. `dark:text-gray-300` appears **24×** in this
  file; at minimum `:657`, `:727`, `:741` (inside the section this lane owns) and `:495`
  (`MetricStatRow`'s own caption — the very pattern the fix cites as its model) sit on `--sm-panel`
  and measure 1.28:1 in dark. The one-line fix at `:4188` was correct and incomplete.
- **Tests that can fail:** `shape-rhythm-panel-copy.test.ts`'s container assertion does fail on the
  pre-fix source (it asserts `--sm-panel` and the absence of `dark:bg-zinc-900`); the "no `dark:`
  override on `text-black`" assertion would have passed pre-fix too, so it pins the new convention
  rather than catching the old bug. No test anywhere asserts a *rendered* contrast value, and no
  test models a `history` array containing the current run — the two gaps that let both defects
  through. Lint 0, `check-scoring-receipt main..HEAD` 0 ("no scoring-path files changed"), all five
  touched test files pass (38/22/15/40/21).

---

## 4. The stronger version

The strongest version would have treated "what is one draft?" as the whole problem instead of "which
arrays do I concatenate": every record — snapshot, history row, and the report on screen — is
identified by its `contentHash`, so the union is a `Map<contentHash, record>` seeded with the
current report, the count is `map.size`, `tied` means another *distinct* hash at the same health,
and the denominator label, the letter sentence and the Draft History button all read the same number
off that map (the map also makes "3 of your 5 saved Versions aren't scored" expressible alongside a
real rank, which is the third bullet of audit item 4 that this change still drops silently). On the
a11y side it would have accepted that `auditSurface` measures one viewport and either scrolled the
dialog in steps and audited the worst moment, or scoped axe to the section element after
`scrollIntoView` — and it would have re-derived the fail-then-pass proof from *that* harness, which
would have immediately shown that making the container theme-invariant breaks every `dark:text-*`
descendant inside it and that `MetricStatRow`'s caption has the same defect. Both are in scope: the
first is the brief's item 1 done correctly, the second is item 3's "prove it FAILS on the unfixed
input" done on a harness that can actually see the input.

---

## 5. Verdict — REVISE

1. **`src/lib/snapshot-trend.ts` + `src/components/scriptide/ScriptDoctorPanel.tsx:2126`** — the
   current draft is counted twice. Pass the current report's `contentHash` into `computeDraftRank`
   and exclude any union record that is the same run as the current draft (hash match, or the
   documented health+timestamp fallback). Measured today: 1 run / 0 Versions → "tied 1st of 2";
   2 runs → "tied 1st of 3" while the Draft History button says "2 drafts". This also makes `tied`
   mean something (it is currently true on every run) and restores reachability of both the
   "First saved draft" and the new "N saved drafts have no score yet" copy — the latter is presently
   dead in the app (5 unscored Versions + a run renders "tied 1st of 2").
2. **`tests/core/snapshot-trend.test.ts`** — add the case the app actually produces: a `history`
   array whose newest entry has the same `contentHash`/`health` as `currentHealth`. Assert
   `{rank:1, of:1, tied:false}` for one run and no saved Versions. The four denominator cases as
   written cannot catch this.
3. **`server/lib/coverage-letter.ts:255`** — the letter still calls the union "your own saved
   drafts". The panel calls the same number "runs and saved drafts of this script". Same number,
   different claim; reconcile the wording (and its tests at `tests/core/coverage-letter.test.ts:278+`).
4. **`src/components/scriptide/ScriptDoctorPanel.tsx:657, :727, :741`** — the three
   `text-gray-600 dark:text-gray-300` captions inside `ShapeRhythmSection` were correct on the old
   `bg-white dark:bg-zinc-900` and are **1.28:1 in dark** on `--sm-panel` (axe: serious ×3; visible
   in `shape-375-dark.png`). Use the theme-invariant token the Root Causes caption fix used. While
   there: `:708`'s `text-gray-400` scene-axis labels measure 2.26:1 in **both** themes, and
   `MetricStatRow`'s own caption (`:495`) has the identical 1.28:1 defect — the "root cause"
   narrative in the commit is only true once those are fixed too.
5. **`scripts/verify-a11y.mjs:641-667, :679-691`** — the new step cannot fail on the bug it was
   written for. Proven: with the old classes restored, document-wide axe at the step's own scroll
   position reports **0** gated violations; scrolled into view it reports **13**. Scroll the section
   into view (or sweep the dialog's scroll container and record the worst moment) before
   `auditSurface`, using `timing.ms(...)` as the step already does.
6. **Report correction** — after (5), re-capture the failing-then-passing log. The captured
   `serious:color-contrast(1)` is not attributable to the Shape & Rhythm nodes (there are 5–6 of
   them, and 0 are visible to axe at that scroll position); it is consistent with the "Root Causes"
   caption that was still broken during that run. §3 of LANE_STANDARD is not satisfied by the proof
   as written.
7. **`src/components/ScriptIDE.tsx:1110-1140`** (minor, additive) — the What-If promote and undo
   snapshots do not carry `contentHash` although `previousReport.contentHash` is in scope, so those
   drafts can only ever dedupe on the approximate path the brief asked to retire. Also worth one
   sentence at `DEDUPE_TIMESTAMP_TOLERANCE_MS`: `Snapshot.analyzedAt` is a **server** timestamp and
   `DoctorHistoryEntry.at` is a **client** one, so the 5 s window is a cross-clock comparison.

Items 1–5 are blocking. 6 is a report-honesty fix. 7 is a small additive follow-on that can ride
along with 1.

---

# Re-review (round 2, 2026-09-05) — commit `4cf4d0b1`

Two commits on the lane (`91f6e7f8`, `4cf4d0b1`), rebased on `main` `6697e88d`.
Budget-limited pass as instructed: no full `npm test`, no browser battery. I re-read the diff,
re-drove states A–E in Chromium against a keyless server booted from the worktree, re-measured the
dark-mode section, and reproduced the scoped audit's fail-then-pass. Worktree `git status` is empty
after the pass; no server left running.

**Verdict: MERGE** (two non-blocking notes below, and a rebase caveat).

## Items vs diff

| Claim | Status | Evidence |
|---|---|---|
| (1) `computeDraftRank` takes `currentContentHash`/`currentAt` and excludes the current run | **DONE** | `src/lib/snapshot-trend.ts:180-185` (signature), `:231-244` (`currentRecord` + `others = union.filter(!isSameRun)`), `:248` (`of` from `others`), `:255` (`tied` from `others`); threaded at `ScriptDoctorPanel.tsx:2246-2249` from `report.contentHash`/`report.analyzedAt`. |
| (2) Tests model the real state; fail-then-pass | **DONE** | `tests/core/snapshot-trend.test.ts:194-260` — a dedicated describe whose every case puts the current run's own row in `history`. Reverting the exclusion (`others` → `union`) makes A `{1,2,true}`≠`{1,1,false}`, B `of 3`≠2, C `of 4`≠3, D `of 6`≠5 fail and E pass — exactly the claimed 4/5. |
| (3) Letter says "runs and saved drafts", pinned | **DONE** | `server/lib/coverage-letter.ts:269`; pinned both ways at `tests/core/coverage-letter.test.ts:298-311` (asserts the new phrase and `doesNotMatch` the old). |
| (4) Captions, scene-axis labels, `MetricStatRow` caption → `--sm-ink-mute` | **DONE** | `ScriptDoctorPanel.tsx:495` (MetricStatRow), `:670`, `:732`, `:754`, `:768`; pinned by two new tests asserting **no** `text-gray-*` survives in either function (`shape-rhythm-panel-copy.test.ts:124-156`). |
| (5)/(6) Gate scrolls the section in and scopes axe to it | **DONE** | `scripts/verify-a11y.mjs:141-167` (`auditElement`), `:169-199` (`scrollShapeRhythmIntoView`, `scrollIntoViewIfNeeded`, `timing.ms`), used at `:724-735` and `:761-764`; hook `data-a11y-section="shape-rhythm"` at `ScriptDoctorPanel.tsx:627`. |
| (7) What-If `contentHash` forwarded end to end | **DONE** | `server/routes/nvm/twin-whatif.ts:170-179` → `WhatIfPanel.tsx:162-168, :234-235, :853` → `ScriptIDE.tsx:1125-1130` (undo) and `:1146-1150` (promoted); route tests assert a 64-hex digest and determinism (`tests/routes/nvm-whatif-doctor.test.ts:103-112, :152-159`). The cross-clock caveat is now written at `snapshot-trend.ts:98-110`. |

## Driven live (Chromium, sample seeded as the writer's own draft)

| State | Draft History button | Rank line |
|---|---|---|
| A) 1 run, 0 Versions | "1 draft" | "**First saved draft** — rank among your drafts appears after your next save" (was "tied 1st of 2") |
| B) 2 runs, 0 Versions | "2 drafts" | "Rank among your drafts: **1st of 2** runs and saved drafts of this script (by health)" |
| D) 3 runs, two of them coincidentally at health 79.2 (distinct hashes `82d2ab`/`555a79`) | "3 drafts" | "**tied 1st of 3** runs and saved drafts" — a *real* tie against a distinct draft, live-captured (the lane had this unit-proven only) |
| C) +1 saved Version with no fresh score (an auto-analysis run also landed, so 4 runs) | "4 drafts" | "tied 1st of **4** runs and saved drafts" — the unscored Version is excluded, not counted |
| E) 5 unscored Versions + a sample run | "1 draft" | "**5 saved drafts have no score yet — run the doctor before saving to rank them**" — the copy that was unreachable in round 1 now renders; also live-captured this round |

Panel and button agree in every state (button counts recorded runs; the line counts distinct other
drafts + the current one). Letter export from state C: payload `{"rank":1,"of":4,"tied":true}` →
"**Among your own runs and saved drafts of this script**, this one ties for 1st of 4 by health" —
same number, and now the same claim about what the number is.

## Dark mode (Alt+Shift+D → Full report → section scrolled into view)

Every text node inside `[data-a11y-section="shape-rhythm"]`, measured in page:

- Header label, both aggregate labels, both numbers: `rgb(0,0,0)` on `rgb(244,239,226)` = **18.29:1**
- Intro caption, both aggregate captions, "Scene 1"/"Scene 13", "Descriptive — not part of the
  score": `rgb(107,97,82)` on `rgb(244,239,226)` = **5.29:1**

No node in the section is below 4.5:1 in dark. (`rank-review/r2-dark.png`.) The round-1 regression
(1.28:1 captions, 2.26:1 scene-axis) is gone.

## Does the scoped audit actually fail?

Reproduced with the shipped harness's own shape (scroll `scrollIntoViewIfNeeded`, then
`axe.run(section)` with the suite's tag set), dark theme:

- as shipped: **0** gated violations;
- captions forced back to the round-1 colors in the DOM: **1 violation, 3 nodes,
  "insufficient color contrast of 1.28 (#d1d5dc on #f4efe2)"** → serious.

So the step now fails on the state it exists to catch, where in round 1 it could not
(0 gated at the un-scrolled position against 13 once scrolled). Claim (5)/(6) is real.

## Gates I re-ran (budget-limited)

`npm run lint` → 0 · `node scripts/check-scoring-receipt.mjs main..HEAD` → 0 ("no scoring-path files
changed") · touched tests: `snapshot-trend` 43/0, `shape-rhythm-panel-copy` 24/0, `snapshot-schema`
15/0, `coverage-letter` 41/0, `export-coverage-letter` 21/0, `nvm-whatif-doctor` 5/0. Full suite and
battery not run, per the budget instruction.

## Non-blocking notes (do not hold the merge)

1. `tests/core/snapshot-trend.test.ts:243-247` states as fact that "Sample runs never reach
   recordDoctorHistory … so `history` is empty here". Measured live in state E: the StartScreen
   sample path **does** write one history row (`history rows: 1`). The assertion still holds — the
   self-exclusion removes that row — but the comment's reason is wrong; fix the comment when the file
   is next touched.
2. The audit's third bullet on item 4 is still unbuilt: when *some* drafts are scored, an unscored
   saved Version is silently excluded with no mention ("3 of your 5 saved Versions were saved without
   a fresh diagnosis and aren't ranked here"). State C shows "of 4" with the unscored Version
   invisible. The `unscored` count is already computed in every branch — surfacing it alongside a
   real rank is a small follow-on, not a reason to hold this.
3. Scoping the gate to the section subtree deliberately gives up the accidental document-wide sweep
   at that scroll depth; the ~163 serious dark-mode contrast nodes elsewhere in that dialog
   (pre-existing, other sections — measured in round 1) remain ungated. The script says so in its own
   comment. Out of this lane's scope, but it is the next real a11y liability in this dialog.
4. Both surfaces still say a rank "appears after your next save" in the `of <= 1` state; a rank now
   also appears after the next *run*. Understates rather than overclaims.

## Rebase caveat

The cross-surface lane merges first and also touches `src/lib/snapshot-trend.ts`
(`snapshotDraftRanks`), `server/lib/coverage-letter.ts` and
`src/components/scriptide/ScriptDoctorPanel.tsx`. On the rebase, the three things to re-check are:
(a) any other caller of `computeDraftRank` introduced by that lane must pass the two new
`currentContentHash`/`currentAt` arguments — they are optional, so a stale call site compiles and
silently reintroduces the self-count; (b) the letter's denominator noun phrase must stay identical to
`DraftRankLine`'s (the pinning test only checks the letter side); (c) `data-a11y-section="shape-rhythm"`
must survive on the section's outer `div`, or the new gate step silently reverts to auditing nothing.

---

# Re-review — rebase (2026-09-05) — commits `5dffc831`, `3d13383c` on `ed87d8a6`

Read-only, budget-limited: diff reading, one zod check, lint + four test files. No browser drive
this round (the states were driven in the previous round; nothing in the rebase changes them except
the item below, which is decided by the schema, not the DOM).

**Verdict: REVISE — one item, one line, plus its test.**

## The three caveats

1. **`snapshotDraftRanks` resolution — CORRECT, and the reasoning holds.**
   `src/lib/snapshot-trend.ts:349-354` calls `computeDraftRank(others, [], numberOrNull(snap.health))`
   with no `currentContentHash`/`currentAt`. That makes the new self-exclusion step a deliberate
   no-op there: with `currentRecord.contentHash === null` and `at === null`, `isSameRun` takes the
   `a.at === null → false` branch (`:229-243`), so nothing is dropped by content. Correct for this
   surface — the Versions list answers "where does *this saved Version* rank among the writer's
   *other saved Versions*", and two identical saves are two rows the writer can see, so collapsing
   them by content would make the list contradict itself (the P3 assertion that caught it was right).
   The `j !== i` filter gives the only guarantee that surface needs.
   **Is there a state where a Version IS the current run and should be excluded? Yes — and the panel
   already handles it elsewhere:** a Version saved from the exact text on screen is excluded from the
   *live* rank line, because the panel's own call passes the report's hash
   (`ScriptDoctorPanel.tsx:2246-2249` → `snapshot-trend.ts:231-244`, which filters the union
   including `snapRecords`). So the just-saved Version is excluded where it would be a self-count,
   and still counted where it is a peer. The two surfaces answer different questions with the same
   rule; the header at `:326-348` says so.
2. **Shared denominator label used by BOTH surfaces — CONFIRMED.**
   `src/lib/draft-rank-copy.ts:31` (`draftRankDenominatorLabel`), imported and rendered at
   `src/components/scriptide/ScriptDoctorPanel.tsx:57-58, :383` and
   `server/lib/coverage-letter.ts:84-85, :284`. `draftRankNextOpportunityLabel` (panel `:381`,
   letter `:270`) and `unrankedDraftsNote` (panel `:388`, letter `:286-289`) are shared the same way;
   pinned by `tests/core/coverage-letter.test.ts:367-372` and
   `tests/core/percentile-copy-consistency.test.ts` (22/0).
3. **a11y hook on the outer div — CONFIRMED.** `ScriptDoctorPanel.tsx:616`
   `<div data-a11y-section="shape-rhythm">`, the section's outermost element, with
   `verify-a11y.mjs`'s `scrollShapeRhythmIntoView`/`auditElement` unchanged.

The three small items are in: the sample-run comment correction, the "N of M … unranked" clause
(both surfaces, from one helper), and "your next run or save".

## The one defect the rebase introduced

`src/components/scriptide/ScriptDoctorPanel.tsx:3016` — the **coverage-HTML** export (the
cross-surface lane's line) forwards the rank object unguarded:

```ts
if (draftRank) payload.draftRank = draftRank;   // → POST /api/export/coverage
```

`DraftRank` now also has the `{ rank: null, of: 0, unscored: N }` shape, and `CoverageBodySchema`
(`server/lib/validation.ts:885` → `DraftRankSchema:840`) requires `rank` to be an integer ≥ 1.
Measured with the real schema:

```
unscored shape accepted by /api/export/coverage schema? false
  first issue: {"expected":"number","code":"invalid_type","path":["draftRank","rank"], …}
ranked+unscored accepted? true
```

The state is reachable and I captured it live last round: 5 saved Versions with no score + a complete
report renders "5 saved drafts have no score yet …" *with the Export report button present* — so
pressing it now 400s where it used to download. The coverage-LETTER path immediately below
(`:3207`) has exactly the right guard (`draftRank.rank !== null` plus an explicit field pick); the
HTML path was left with the old assumption. No route test covers `draftRank` on
`/api/export/coverage` (`grep draftRank tests/routes/*coverage*` → letter only), which is why lint
(0) and the suite are green on it.

**Fix:** mirror the letter path at `:3016` — forward only the ranked shape, picking
`{ rank, of, tied?, unscored? }` — and add a route test posting the unscored shape to
`/api/export/coverage` (it must not 400 the export; either omit the field or accept it).

Everything else re-checked post-rebase: `npm run lint` 0; `snapshot-trend` 57/0, `coverage-letter`
44/0, `percentile-copy-consistency` 22/0, `shape-rhythm-panel-copy` 27/0. Worktree clean, no server
started.
