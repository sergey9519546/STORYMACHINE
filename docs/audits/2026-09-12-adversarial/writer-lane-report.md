# Lane report — the writer's loop, client half (2026-09-12)

**Worktree:** `/home/user/wt-writer` · **Branch:** `lane/writer-loop-client`,
from `main` at `412f23cb` · **Tip:** `c19000c7`, pushed to
`origin/lane/writer-loop-client` after every commit (§7.1).
**Scratch paths below are written as `<session scratch>`.**

```
c19000c7 fix(coverage): a superseded coverage run is stopped, not left running
27674794 fix(verify): every waitForFunction budget in the surfaces suite is real, not 30s
abf62318 docs(brain,claims): record the seven writer-loop fixes, and follow two moved guards
f75a5421 fix(percentiles): one gated, direction-safe function owns dimension-badge copy
fe476f72 fix(doctor-panel): one number is the health of the draft; the diagnostics say so
82a6df5f fix(coverage): the compact "not a screenplay" card carries the server's hint
70f9db92 fix(startscreen): gate every simulation control behind Labs instead of shipping it dead
b7b576d3 fix(startscreen): the front-door Coverage card renders the sample's real numbers
a3f04d20 fix(coverage): a jump span belongs to the finding that produced it
c4bee818 fix(coverage): "Re-run coverage" re-runs coverage, and only a completed run clears "outdated"
```

10 commits · 30 files, +3013 / −119. Seven of the ten close one brief item each;
the other three are named below (two guard follow-ups, one pre-existing suite
defect, one cost bug this lane's own change exposed).

---

## §1 — what the thing IS, and where the brief's premise needed correcting

The seven findings are all **presentation** defects on the three surfaces a
writer meets in order: the start screen, the compact Coverage card, and the full
Script Doctor panel. None of them is a scoring defect, and none of the fixes
touches a number the engine computes —
`node scripts/check-scoring-receipt.mjs 412f23cb..HEAD` ends *"no scoring-path
files changed"*, and the output-identity harness reports **45/45 byte-identical**
against a `git archive 412f23cb` baseline (`analyzedAt` excluded, `GIT_SHA`
pinned across both runs).

Three corrections to the brief's premises, each found by reading the code rather
than assumed:

1. **Finding 3's banner is not only reachable from coverage.** The brief (and the
   finding) say the banner appears "while the writer is looking at coverage". In
   fact the ternary branch `coverageStale && !isEmptyDraft` sits ABOVE the
   `task === "coverage"` branch, so the banner renders for `write` and `ship`
   too — where `handleTaskChange("coverage")` was not a no-op. `rerunCoverage`
   therefore has two paths: invoke the registered `run()` when the panel is
   mounted, and open the panel (which runs on mount) when it is not. Both leave
   the stale flag to a COMPLETED run.

2. **Finding 15's "Paste from PDF?" cannot succeed from the state it is offered
   in, and the fix says so.** The route's `hasSceneHeading` tests each line
   *trimmed*, and `normalizeScreenplay` re-spaces blocks without ever inventing a
   slugline — so a paste that reaches the refusal card has no `INT.`/`EXT.` line
   anywhere and re-spacing cannot produce one. The affordance still does real
   work (it runs the normaliser, installs the re-spaced draft, and re-submits it
   through the same `run()`), and its two outcomes are honest, but its VALUE is
   the one instruction it lands plus the repaired draft now in the editor — not a
   report. This is written into the code, the brain note and claims row 100
   rather than left for a reader to discover. **What a stronger version would
   have done** is recover a heading a PDF paste glued to a page-header or scene
   number ("12 INT. KITCHEN - DAY"), which needs a heading repair that does not
   exist and would be a fourth copy of the scene-heading test; out of scope here.

3. **Finding 4's core defect cannot be fixed on this branch.**
   `doctor.ts` ranks `build.rawScore` — the unclamped craft statistic, scarcity
   term included — while the badge sits beside the clamped display score. That is
   why a 100/100 dimension read "bottom 10%" and an 81.5 read "top 10%". Re-ranking
   is a scoring change. What this lane does instead: the comparability gate now
   reaches the badges (so the anti-correlated reading is withheld on every real
   draft), and where a badge IS shown its tooltip names the statistic it ranked.

---

## §3 — before/after numbers, each with the command that produced it

### Finding 3 — BROKEN P2, "Re-run coverage" did not re-run coverage
`src/components/ScriptIDE.tsx` · `src/components/scriptide/CoverageSummary.tsx`

The banner's handler was `handleTaskChange("coverage")`, a no-op on the surface
it is reachable from, which ALSO cleared the stale flag. There is now one
`run()` — CoverageSummary's — published through `onRegisterRun` and invoked by
`ScriptIDE`'s `rerunCoverage`; `onFreshReport` is the only thing that retracts
"Coverage outdated".

| | before | after |
|---|---|---|
| `/api/scriptide/doctor/stream` POSTs from the banner click | **0** | **1** |
| health shown after the click (runoff + one new scene) | 75 (stale) | **76** |
| banner after the click | gone, with no run | gone, **because the run completed** |

`npm run verify:surfaces`, phase `P2-rerun` (5 assertions).

**Fail-first:** `tests/core/coverage-rerun-one-control.test.ts` — **7 of 8
assertions fail** on a `git archive 412f23cb` checkout, 8/8 pass here.
Log: `<session scratch>/faillogs/f3-failfirst.log`.

### Finding 5 — BROKEN P2, the "next fix" jump invented a line
`src/lib/jump-span.ts` · `src/components/scriptide/CoverageSummary.tsx`

Measured with the finding's own command, run against both trees
(`<session scratch>/f5-probe.mjs`, log `faillogs/f5-failfirst.log`):

```
412f23cb   top priority "Conflict layer" (document-tier: true)
           what the CARD gets = {"startLine":137,"endLine":2709}
           => renders "Jump to line 137" and flashes 87.9% of the 2928-line file
here       what the CARD gets = undefined
           => renders the honest "No location" note (no line invented)
```

`computeJumpSpan` split into `computeTopPriorityJumpSpan` /
`computeRootCauseJumpSpan`, each reading ONE finding's anchors; every span
carries its `owner`. Nothing subtracted: the root cause's located notes are still
offered, attributed to that finding, through `jumpTargetForMemberRule` — a
**31-line** span (lines 90–120, 1.1% of the file) instead of the 2,573-line
envelope, labelled "Jump to scene 2" in the browser.

`npm run verify:surfaces`, phase `P2-featurelen` (3 new assertions).
**Fail-first:** `tests/core/coverage-next-fix-jump-honesty.test.ts` (8
assertions, real doctor on the real fixture) and the 5 new cases in
`tests/core/jump-span.test.ts` both fail to load on 412f23cb; the probe above is
the behavioural half.

### Finding 6 — UNTRUE P0, the front door's numbers were not the sample's
`src/components/StartScreen.tsx` · `src/lib/sample-coverage-facts.ts` (generated)

| | start screen claimed | the sample returns | now shown |
|---|---|---|---|
| health | 76 | **78** | 78 |
| critical · major · minor | 3 · 38 · 159 | **2 · 32 · 139** | 2 · 32 · 139 |
| next | "Climax engagement" | `Scene 9 (climax peak)` | Scene 9 (climax peak) |

`npm run generate-p0-sample` now writes a second artifact from the doctor run it
already performs. The committed `docs/user-validation/sample-coverage-report.html`
is deliberately unchanged: a regeneration moved only the three fields
`p0-sample-drift.test.ts` already masks (header date, footer timestamp, engine
commit), so the 226 KB artifact was left alone rather than churned.

`npm run verify:surfaces`, phase `P2-startcard` (5 assertions) — floored on the
SERVER's answer for the sample's exact bytes, not on the artifact.
**Fail-first:** `tests/core/start-screen-sample-card.test.ts` is source-only so it
RUNS on 412f23cb: **4 of 5 fail** there ("the card still contains the hardcoded
\"Climax engagement\""). Log: `faillogs/f6-failfirst.log`.

### Finding 10 — HALF-BUILT, two dead buttons and a Labs section on the default screen
`src/components/StartScreen.tsx`

Three simulation entry points now sit behind the `{onOpenStoryMachine && (…)}`
gate line ~559 already used; the "Where you are" rail's step 4 reads
"Export · verify" when Labs is off. **Nothing is deleted** — the hero, the
four-cell grid, the numbered workflow and both buttons render unchanged with Labs
on, which the suite's existing Labs-ON context drives.

| | before | after |
|---|---|---|
| visible enabled buttons on the keyless start screen, audited by clicking each | not audited (the gate did not exist) | **7** |
| of those, inert (no navigation, no page change) | **2**, named by the audit ("Open simulation", "Simulate") | **0** |
| OASIS sections rendered with Labs off | 1 | **0** |
| "Story Machine Simulate" / "Simulate if needed" / "Export · simulate" | present | **absent** |

The "before" inert count is the audit's own measurement on `c087a6ca`, not mine:
I did not run the new `P2-deadcontrols` phase against the unfixed tree, because
those two buttons are gone from it by construction. The source-level fail-first
below is what I measured on `412f23cb`.

`npm run verify:surfaces`, phase `P2-deadcontrols` (3 assertions) — enumerates
every visible, enabled button and clicks each on a freshly reloaded page.
**Fail-first:** `tests/core/start-screen-labs-gate.test.ts` — **4 of 6 fail** on
412f23cb. Log: `faillogs/f10-failfirst.log`.

**Why gated rather than disabled-with-a-reason.** NORTH_STAR §1 is explicit
("hide, don't disable") and P2's exit gate is a first coverage report with zero
exposure to simulation jargon — a disabled control's reason would have to name
the feature. The way back in is unchanged and asserted: Toolbar overflow →
"Labs & Settings".

### Finding 15 — HALF-BUILT P0, the compact card dropped the server's hint
`src/components/scriptide/CoverageSummary.tsx`

The card now renders the hint (185 characters the route was already sending), is
headed "Not a screenplay" rather than "Coverage failed" (the route returns 200 —
the request succeeded), and offers "Paste from PDF?" through the existing
`normalizeScreenplay`, imported and unmodified because it is scoring-path. A new
`onRepairDraft` prop installs the re-spaced draft through `installDraft` — NOT
the sample-install handler, whose host callback would retitle the draft to
"Dead Frequency".

`npm run verify:surfaces`, phase `P2-format` (5 assertions).
**Fail-first:** `tests/core/coverage-format-unrecognized-card.test.ts` — **9 of
12 fail** on 412f23cb. Log: `faillogs/f15-failfirst.log`.

### Finding 9 (presentation half) — UNTRUE P1/P3, three health numbers in one report
`src/lib/diagnostic-copy.ts` (new) · `src/components/scriptide/ScriptDoctorPanel.tsx`

One label module; a badge on each diagnostic section header and a sentence under
each diagnostic number. The mid-report line is renamed from "Health score:" to
"Graph health score:", so it stops borrowing the header's own two words. Both
scores and the `−Nhp` deduction still render, captioned rather than removed.

Driven on the sample's full report (`P3-onehealth`, 3 assertions):
`labelled slots rendered=4`, every label's text asserted, and
`bareHealthScoreLine=0 / graphHealthScoreLine=1`.

**Fail-first:** `tests/core/diagnostic-not-health-label.test.ts` — **5 of 8 fail**
against 412f23cb with the new copy module copied in, so the guard loads and fails
on the unfixed panel rather than on a missing import. Log:
`faillogs/f9-failfirst.log`.

The clue/name half (a protagonist's name read as an unpaid setup) is
scoring-path work on the owner-gated branch and was not touched.

### Findings 4 / 14 (panel half) — the Craft Dimensions badges
`src/lib/percentile-copy.ts` · `src/components/scriptide/ScriptDoctorPanel.tsx`

Measured on three real reports, same command both trees
(`<session scratch>/f4-probe.mjs`, log `faillogs/f4-14-failfirst.log`):

```
runoff (9 sc / 1448 w)   Dialogue & Voice  score  98  pct  20   was "top 80%"  -> not comparable
                         Theme & Orig.     score 100  pct  20   was "top 80%"  -> not comparable
231-scene assembly       Character         score  82  pct 100   was "top 10%"  -> not comparable
the P0 sample            all five                    pct 100   was "top 10%"  -> not comparable
```

All three report "not comparable" in the HEADLINE, so the document now agrees
with itself. A test walks all 101 percentiles asserting the badge never disagrees
in DIRECTION with `percentileDescriptor`, the descriptor the server already emits.

`npm run verify:surfaces`, phase `P3-dimbadge` (5 assertions).
**Fail-first:** `tests/core/dimension-badge-wiring.test.ts` is source-only and
RUNS on 412f23cb: **3 of 3 fail** there.

---

## The one function the export lane must call

> **`dimensionPercentileBadgeFor(pct, sceneCount, wordCount)`** — exported from
> **`src/lib/percentile-copy.ts`**, which `server/lib/coverage-html.ts` already
> imports (line 46, `percentileSentenceFor` / `exactRankTooltipFor`).

Two siblings beside it, for the same block:

- **`dimensionPercentileTooltipFor(pct, label, sceneCount, wordCount)`** — the
  `title=` text. Out of bounds it gives the reason and NO exact rank; in bounds it
  gives the band, the exact rank, and the clause naming the statistic that was
  ranked.
- **`dimensionPercentileCaptionFor(sceneCount, wordCount)`** — the section
  caption, so the exported block does not promise a comparison its badges withhold.

`dimensionPercentileBand(pct)` is the ungated band underneath, exported for tests;
the export side should call the `…For` helpers, never the bare band and never
`percentileBand`. Note that `buildDimensionsSection` in `coverage-html.ts` does
not currently render a percentile badge at all — it renders label / bar / score /
summary / basis. If the export lane ADDS one, these are the functions. Its
existing `buildGodmodeSection` block IS in scope for finding 9's labels: it prints
`Graph Health {score}/100` and, worse, `→ Health deduction −{N}`, and should carry
`DIAGNOSTIC_NOT_IN_HEALTH_LABEL` / `diagnosticNotInHealthSentence('Graph Health')`
from **`src/lib/diagnostic-copy.ts`**. I left `coverage-html.ts` untouched because
the brief assigns the export side to another lane.

---

## §4 — gates, with exit codes

| gate | command | result |
|---|---|---|
| lint | `npx tsc --noEmit` | **0** |
| no-console | `node scripts/check-no-console.mjs` | **0** |
| docs quality | `npm run check-docs` | **0** — "No AI writing patterns detected" |
| honesty audit | `node scripts/honesty-audit.mjs` | **0** — 460 files, 460 markdown, 100 claims rows, clean |
| brain graph | `node scripts/brain-graph.mjs --check` | **0** — 103 notes, 358 links, fresh |
| brain coverage | `tests/core/brain-coverage.test.ts` | **7/7** (was 6/7 on 412f23cb — see below) |
| scoring receipt | `node scripts/check-scoring-receipt.mjs 412f23cb..HEAD` | **0** — "no scoring-path files changed" |
| output identity | `check-doctor-output-identity.mjs --compare` | **PASS — 45/45 byte-identical** |
| public benchmark | `tests/core/public-benchmark.test.ts` | **28/28** |
| full suite | `npm test` | **0** — 13272 tests, 13180 pass, **0 fail**, 91 skipped, 1 todo |
| browser | `PW_CHROMIUM_PATH=/opt/pw-browsers/chromium npm run verify:surfaces` | **0** — **242/242 assertions passed**, zero genuine browser console errors |

Both were run on the FINAL tree (tip `c19000c7`). `npm test` was run three times
across the lane; the first run reported 3 failures, all three recorded and
closed, and the last two are clean:

- **`brain-coverage.test.ts` (b)** — PRE-EXISTING on 412f23cb: the
  `docs/audits/2026-09-12-adversarial` directory had no brain note citing it.
  Verified failing on the baseline checkout. Closed by this lane's two new
  Surface notes.
- **`command-palette-wiring.test.ts`** — the gate scans `ScriptIDE.tsx` for
  command-dispatch expressions and allow-lists each. The new
  `registerCoverageRun` callback's parameter annotation had that exact textual
  shape. Fixed by renaming the parameter, NOT by widening the allow-list.
- **`g0-09-report-honesty-copy.test.ts`** — required the literal "synthetic
  reference set" inside `ScriptDoctorPanel.tsx`; that literal was the hand-written
  dimension caption this lane replaced with the shared gated helper. The
  disclosure is now asserted in `src/lib/percentile-copy.ts` (where it lives) AND,
  at the panel, as four assertions that it reaches that copy through the gated
  helpers and never renders the ungated band. Strictly more than it checked before.

---

## A cost bug this lane's own change exposed, fixed (commit c19000c7)

Driving finding #3 at FEATURE length surfaced a real defect in
`CoverageSummary.run()` that predates this lane: `genRef` already made a stale
RESPONSE harmless (the late resolution returns early), but the stale REQUEST kept
running. The server carried both analyses to completion and only one was ever
read. On the 231-scene fixture that is **two full 14-pass analyses competing for
the doctor pool**, and the visible symptom was `P2-featurelen`'s coverage run
never landing inside its 180-second budget. `run()` now aborts the in-flight
controller before creating its own — which closes the connection and frees the
pool worker immediately, exactly what `cancelRun` already relies on and what that
method's own comment already claimed. Pinned by
`tests/core/coverage-format-unrecognized-card.test.ts`.

The trigger was worth recording too: three phases of the browser suite clicked
`getByRole('button', { name: /run coverage/i })`, and that regex matches BOTH
CoverageSummary's own "Run coverage" and the action strip's "Re-run coverage"
banner button — which finding #3 had just given a real handler, so a locator that
used to hit an inert control now started a second analysis. Each of those phases
now asks for the exact name and clicks only when the control is visible, since
opening Coverage already starts a run on mount.

## A pre-existing defect in the browser suite, fixed (commit 27674794)

`page.waitForFunction(fn, arg, options)` takes its options THIRD. All six calls
in `scripts/verify-p2-p3-surfaces.mjs` passed `{ timeout }` in the ARG position,
so waits written as 30s / 120s / 180s budgets all ran on Playwright's 30-second
default. That is why "coverage completes on a 231-scene draft" — an analysis that
takes minutes under load — failed as `Timeout 30000ms exceeded` in 2 of this
lane's 6 runs of the suite and passed in the other 4. Four of the six calls
predate this lane. Every call now passes `undefined` as the arg.

One assertion was DROPPED rather than kept, and it is named here rather than
quietly lost: a `P2-format` step asserting over HTTP that a double-spaced paste
WITH sluglines is analysed rather than refused. A fourth doctor POST from that
phase trips the route's `gameLimiter` (measured: status 429, *"Too many requests,
please slow down"*, twice in a row), and a rate-limited request proves nothing
about the card. The same claim is asserted in
`tests/core/coverage-format-unrecognized-card.test.ts` against
`normalizeScreenplay` and the route's own exported `hasSceneHeading`. For the same
reason the `P2-deadcontrols` phase moved to its own context at the END of the
suite: inside context A its per-button reloads put ~50 requests into the same
60-second window as the feature-length doctor run.

---

## §5 — what was left undone, and why

- **Finding 4's real cause** (the badge ranks `build.rawScore`, the number beside
  it is clamped) is a scoring change. Not touched; the tooltip states the
  mismatch instead.
- **Finding 9's clue/name half** (a protagonist's name read as an unpaid setup) is
  on the owner-gated scoring branch. Not touched, per the brief.
- **`server/lib/coverage-html.ts`** still prints `Graph Health {n}/100` and
  `→ Health deduction −{n}` with no diagnostic label, and its Craft Dimensions
  block has no percentile badge to gate. Left to the export lane, with the exact
  functions named above.
- **Finding 11's specific wording** ("would deduct up to N pts if enabled") was
  not written; it is not in this brief. The row is now captioned as a diagnostic
  that has not been added to or subtracted from health, which is true and covers
  the number's presentation, but it is not the sentence finding 11 asks for.
- **`onLoadFountain`'s `setCoverageStale(false)`** (`ScriptIDE.tsx`, the
  accepted-fix / converted-draft install path) still clears the flag on a
  programmatic install of text that has not been analysed. It is the same shape as
  finding 3 and is NOT in that finding's scope; flagged here rather than changed.

Nothing in this lane was narrowed, skipped, or silently widened relative to the
brief's seven items.

---

## Round 2

**Worktree:** `/home/user/wt-writer` · **Branch:** `lane/writer-loop-client`,
now from `main` at `f94d587e` · **Round-1 reviewed object:** `718a0b1d` ·
**Round-2 tip:** `d0d1b759`, pushed after every commit.

```
d0d1b759 fix(coverage): revert the unmount abort — it breaks the golden path under StrictMode
f5e42b35 fix(verify,coverage): give the gates their own rate-limit budget; disclose the PDF repair's edit
cb456436 fix(verify): the waitForFunction fix reaches all four suites, with a guard
7734452b fix(debris): remove a stray probe comment, correct two dangling claims pointers
```

14 files, +910 / −53 on top of the reviewed tip. Every fail-first number below is
measured against **718a0b1d** (the tree the review read), not against
`f94d587e` — these are fixes to this lane's own work.

### The seven review items

| # | item | done | evidence |
|---|---|---|---|
| 1 | `verify:surfaces` green, fixed at the cause | **yes** | 3/3 idle runs **246/246, exit 0**; peak request window measured |
| 2 | stray `// probe` | **yes** | deleted; `percentile-copy.ts` |
| 3 | two dangling claims pointers | **yes** | rows 103→94, 102→95, plus a guard |
| 4 | the eight remaining `waitForFunction` misuses | **yes** | all eight fixed; grep-style guard added |
| 5 | "Paste from PDF?" rewrites the draft silently | **yes** | disclosed before AND after; button withheld when it cannot act; row 100 corrected |
| 6 | stale docstring naming `onLoadSampleIntoEditor` | **yes** | names `onRepairDraft` and why |
| 7 | follow-up B proved at source, not behaviour | **yes, and more** | said below; the gap was attempted, measured, and reverted |

### Item 1 — the gate is green, and the review's diagnosis is now a number

The reviewer was right and my round-1 report was wrong: I recorded this gate as
"0 — 242/242 assertions passed" and blamed load for the rest. The cause is the
limiter, and the suite now measures it.

**The measurement.** `scripts/verify-p2-p3-surfaces.mjs` gained a permanent
budget meter: it timestamps every `/api/` request the suite causes — from the
browser (a `request` listener on all eight contexts, paired with
`wireConsoleCapture` so a new context cannot be added unmetered) and from the
script's own probes (one `globalThis.fetch` wrapper, rather than ten call
sites) — and prints the busiest 60-second window. Identical across all three
runs:

```
[verify] API-request budget: 133 /api/ requests total, peak 124 in any 60 s window
         (gameLimiter production ceiling 120/min; the gate's server runs with
          VERIFY_RATE_LIMIT_MULTIPLIER=10, i.e. 1200)
```

**124 against a ceiling of 120.** That is the whole defect, and it explains the
flakiness exactly: the suite sits four requests over the line, so whether the
feature-length phase's doctor POST was the 121st or the 119th depended on
scheduling — which is why it failed three times for the reviewer and passed
sometimes for me. It was never load.

**The fix, and what it is not.** `server/lib/session-store.ts` resolves
`VERIFY_RATE_LIMIT_MULTIPLIER` once at module load, default **1**, and the three
limiters take `rateLimitMax(n)`.
`scripts/lib/keyless-browser-certification.mjs` — the one place that sets it —
gives every browser gate's own isolated server 10×. Not "off": a runaway loop in
a gate should still trip a ceiling, and 1200 leaves ~10× headroom over today's
measured 124 for the phases a future lane adds.

`tests/core/rate-limit-verification-override.test.ts` (9 assertions) is the
safety catch, and it checks the property rather than the intention:

- unset gives the production numbers (120 / 20 / 10) — asserted in a process that
  runs with the variable absent, like every deployment;
- ten hostile values (`'0'`, `'-5'`, `'51'`, `'Infinity'`, `'NaN'`,
  `'10; rm -rf /'`, …) all fall back to the production ceiling, and `'9.9'`
  floors to 9× — each probed in a child process, because the resolution is a
  module-scope constant;
- **no deployment path names it**: Dockerfile, docker-compose.yml, package.json,
  server.ts, .env.example, all of `.github/`, `server/` and `src/` — 173 files
  scanned;
- every file that merely *names* it is on an explicit allowlist with a reason,
  scanned with `git grep --untracked` so a new file is caught before it is
  committed.

Two alternatives are recorded beside the code with why they lost: a per-phase
identity needs `TRUST_PROXY` (trading a limiter artifact for a proxy-trust
artifact in every other assertion the suite makes), and waiting out the window
papers over the count and breaks the next time a phase is added.

**And a lost request can no longer delete a phase.** The three `HEALTH` waits are
recorded failures, not throws. An unhandled throw ends `main()`, which is how one
429 removed 24 assertions while the run printed "218/218 passed".

**Three runs, idle machine, no edits between them:**

| run | load at start | result |
|---|---|---|
| 1 | 2.12 / 4 cpus | **246/246, exit 0** — peak 124/60 s |
| 2 | 2.16 / 4 cpus | **246/246, exit 0** — peak 124/60 s |
| 3 | 2.91 / 4 cpus | **246/246, exit 0** — peak 124/60 s |

246, not 242: the phases that used to be deleted now run, and item 5 added four.

**A fourth run is not counted, and here is why.** My first attempt failed
(`P2-generative :: Sample coverage still produces a verdict with Labs ON`)
because I edited `CoverageSummary.tsx` while it was running. The gates drive the
DEV build — `server/app.ts` mounts Vite middleware unless `NODE_ENV=production` —
so a live edit reaches the browser mid-suite. That run is void and excluded; the
three above are on the committed tree with no edits in between.

### Item 5 — what the PDF repair does, said out loud

The reviewer's judgement is accepted in full: the messaging was honest, the
*action* was not disclosed. Reproduced exactly —
`normalizeScreenplay` collapses blank-line runs and joins wrapped lines, so

```
BEFORE  "The room was cold.\n\n\n\n\nMaya opened the door.\n\n\n\n\nShe said nothing.\n\n\n\n\nThe tape was still running.\n"
AFTER   "The room was cold. Maya opened the door. She said nothing. The tape was still running.\n"
```

four beats become one paragraph. Three changes:

1. **Before the click** — the button's `title` says "Rewrites your draft with the
   screenplay normaliser — blank lines collapsed, wrapped lines joined — and runs
   coverage on the result. Ctrl+Z undoes it." A writer should not have to press a
   button to learn that it rewrites their draft.
2. **After the click** — the outcome sentence names the edit and the undo:
   *"…Your draft was rewritten to do it: blank lines collapsed and wrapped lines
   joined. Press Ctrl+Z (⌘Z on a Mac) to put it back. To get coverage, add a
   scene heading such as INT. KITCHEN - DAY."*
3. **Where it cannot act, it is not offered.** The button renders only when
   `normalizeScreenplay(fountain) !== fountain`, computed once per refusal in a
   memo and read by the click, so what the card offers and what it does cannot
   drift. The no-op branch survives as a documented defensive path, not a normal
   one.

**Claims row 100 is rewritten and says so.** Its round-1 text called the result
"the re-spaced draft now in the editor for the writer to keep working in". That
was false in the only state where the control acts, and the row now says that in
those words.

Driven in both states (`P2-format`, four new assertions):

```
[PASS] a paste the normaliser cannot change is offered no "Paste from PDF?" button at all — buttons rendered=0
[PASS] the button discloses that it REWRITES the draft, before the click, and names the undo
[PASS] the repair really does rewrite the writer's draft — beforeLen=112 afterLen=88 changed=true
[PASS] the outcome names the edit AND the undo, and the button is not re-offered
```

### Item 7 — proved at source, and the gap is worse than "not closed"

**Said plainly, as asked:** the supersede-abort is proved by source and by a
guard that fails without it. The reviewer could construct no UI path that starts
two concurrent analyses, and neither can I: during a run the header control is
replaced by Cancel and the banner button is disabled, so both re-run affordances
are unreachable while the abort would matter. The round-1 commit message's "two
full 14-pass analyses competing for the doctor pool" describes the **test
harness's** double-click, not a writer's path. That sentence overclaimed.

**The gap the reviewer named is real, and it is not a one-line fix — measured.**
I built the obvious repair (`abortRef.current?.abort()` in an unmount cleanup)
and the gate caught what it does. `src/main.tsx` renders under `<StrictMode>`, so
in the dev build every gate drives, React mounts → effects → cleanups → effects.
The cleanup aborts the panel's *first* sample run, and the mount effect's B-4
guards (`sampleRunRef` / `lastRunTextRef`, which exist to stop a second analysis
of byte-identical text) then correctly refuse to start another:

```
[FAIL] P3 :: Sample coverage produces a rendered verdict (Doctor reachable end to end)
       — summary panel verdict text present=false
```

That is the golden path. It is reverted (`d0d1b759`). What ships is the finding,
written above `abortRef` where the next person to reach for that cleanup reads it
first, plus a test asserting the naive fix is **not** in the tree and the note
**is**. Closing it properly means distinguishing a real unmount from StrictMode's
simulated one, or making the run-once guards survivable across an aborted run —
a change to the golden path's concurrency contract, and the right size for its
own brief.

### Items 2, 3, 4, 6 — the small ones

- **2.** `// probe` deleted from `src/lib/percentile-copy.ts`.
- **3.** `StartScreen.tsx` row 103 → **94**, `CoverageSummary.tsx` row 102 → **95**.
  `tests/core/claims-row-citations.test.ts` now parses the register for the rows
  it defines and walks `src/`, `server/`, `scripts/`, `tests/` and `docs/brain/`
  for every citation, expanding ranges, so a pointer into the register must land
  on a row that exists. `docs/audits/**` is excluded by design — dated snapshots
  legitimately quote the register as it stood. Fail-first on 718a0b1d: **pass 1 /
  fail 2**, naming both.
- **4.** All eight remaining misuses fixed
  (`verify-a11y.mjs:383,387,817,995,1743`, `verify-focus-traps.mjs:175,365`,
  `verify-ui-polish-affordances.mjs:123`), including the 45 s and 40 s budgets
  that were silently 30 s. `tests/scripts/wait-for-function-options-position.test.ts`
  walks each call from its opening paren tracking bracket depth, so it reads both
  the one-line and pretty-printed forms, distinguishes the defect from a genuine
  page argument, and runs the scanner over six hand-written shapes first so a
  scanner that never fires cannot pass. Fail-first: **12 of 12 calls flagged on
  `f94d587e`; exactly the 8 the review named on `718a0b1d`**.
- **6.** The `tryPdfRepair` docstring names `onRepairDraft` and says why
  `onLoadSampleIntoEditor` would be wrong.

### Round-2 gates

| gate | command | result |
|---|---|---|
| lint | `npx tsc --noEmit` | **0** |
| no-console | `check-no-console.mjs` | **0** |
| docs | `npm run check-docs` | **0** |
| honesty audit | `honesty-audit.mjs` | **0** — 460 files, 100 claims rows, clean |
| brain | `brain-graph.mjs --check` | **0** — 103 notes, 358 links, fresh |
| scoring receipt | `check-scoring-receipt.mjs f94d587e..HEAD` | **0** — *"no scoring-path files changed"* |
| output identity | `--compare` vs `git archive f94d587e`, `GIT_SHA=r2pin` both trees | **PASS — 45/45 byte-identical** |
| public benchmark | `tests/core/public-benchmark.test.ts` | **28/28** |
| browser | `PW_CHROMIUM_PATH=… npm run verify:surfaces` ×3, idle | **246/246, exit 0, three times** |
| full suite | `npm test` | **0** — 13291 tests, 13199 pass, **0 fail**, 91 skipped, 1 todo |

Touched suites, each run individually: `coverage-format-unrecognized-card` 18,
`rate-limit-verification-override` 9, `claims-row-citations` 3,
`wait-for-function-options-position` 2, `limiters` 2,
`keyless-browser-certification` 2, `coverage-rerun-one-control` 8,
`coverage-handoff` 8, `percentile-copy-consistency` 30,
`honesty-audit-claims` 5 — all green.

### Still open, and named rather than left quiet

- **The unmount-abort gap** (item 7 above) — real, attempted, measured, reverted.
- **Finding 3's deeper half** — "outdated" is still a strip-level flag rather than
  a property of the report the panel shows, and `onLoadFountain` still clears it
  on a programmatic install of unanalysed text. Same bug, different brief.
- **`computeJumpSpan` has no production caller.** The reviewer is right. Keeping
  it is the conservative choice and it is documented; retiring it belongs in a
  change that can prove nothing else wants it.
- **Finding 4's real cause** — the badge ranks `build.rawScore` while the number
  beside it is clamped. Scoring-path; the tooltip states the mismatch.
- **`server/lib/coverage-html.ts`** still prints `Graph Health n/100` and
  `→ Health deduction −n` unlabelled, and has no dimension badge to gate. Left to
  the export lane, with the functions named in Round 1 above.

---

## Round 3

**Worktree:** `/home/user/wt-writer` · **Branch:** `lane/writer-loop-client`,
rebased onto `main` `8c99f92d` · **Round-2 reviewed object:** `6dbabc9c` ·
**Round-3 tip:** `ca31828d`, one commit, pushed.

Two deterministic gate failures were reported against `6dbabc9c`. I measured
both before changing anything, and they are not the same kind of thing.

### (b) `verify:ui-polish` phase A — real, and the cause is in the gate

**The suspicion was that finding 5 took the sample's jump away. It did not.**
Measured on the sample, through the same pipeline the route uses:

```
topPriorities[0].location = "Scene 9 (climax peak)"  rule PROTAGONIST_PASSIVITY_CLIMAX
document-tier? false
computeTopPriorityJumpSpan = {"startLine":155,"endLine":171,"owner":"top-priority"}
```

The sample's first card has a genuinely located finding, and the card renders
**"Jump to scene 9"** for it. The honest-note path is not reached on the sample
at all — it is the feature fixture's document-tier priority that reaches it.

**What actually fails is the gate's readiness wait.** It was
`waitForFunction(() => /RECOMMEND|CONSIDER|PASS/.test(document.body.innerText))`.
`innerText` reflects CSS `text-transform`, and `.sm-slug` uppercases, so the
doctor's own per-pass counter renders as **"RUNNING PASS 1 OF 14…"** — and its
literal "PASS" satisfies a poll that was asking for a verdict. The phase then
counts the jump control while the panel is still streaming. Probed four times
per tree, same steps:

| tree | run 1 | runs 2-4 | control once settled |
|---|---|---|---|
| `6dbabc9c` (this lane) | `loading:true` → **count=0** | count=1 | `["Jump to scene 9"]` |
| `main` | `loading:true` → **count=0** | count=1 | `["Jump to scene 9"]` |

**Identical on both trees** — a pre-existing ~1-in-4 race in the gate, not a
product regression. A second probe names the culprit exactly:

```
{"hit":"PASS","owner":{"cls":"sm-slug","text":"RUNNING PASS 1 OF 14…"},"loading":true,"hasJump":false}
```

This is the **third independent rediscovery** of the same trap, each time fixed
in one suite only — `verify-production-build.mjs` (waits for the literal
"CONSIDER", and its comment explains why), `verify-p2-p3-surfaces.mjs`'s P3 phase
(fixed 2026-09-05 with the same diagnosis in its comment), and now ui-polish's
phase A and the P2-generative wait. Fixed at the cause and once:
`waitForDoctorVerdict` in `scripts/lib/browser-verify.mjs` strips the progress
copy, requires a verdict as a whole **word**, and takes a `selector` so the wait
is scoped to the surface the assertions read. The two `verify-a11y.mjs` sites are
deliberately untouched — they poll `textContent`, which does not reflect
`text-transform`, so the raw lowercase "Running pass 1 of 14…" cannot match a
case-sensitive verdict regex.

**The gate is not weakened.** No assertion changed; the readiness signal became
stricter (a verdict, as a word, inside the Coverage panel, with progress copy
removed — instead of any occurrence of "PASS" anywhere on the page).
`tests/scripts/wait-for-function-options-position.test.ts` grows a second scanner
so a fourth hand-rolled copy cannot be written; **fail-first on `main`: both
`innerText` sites named by file and line**.

**One correction to my own round-2 report.** `P2-generative :: Sample coverage
still produces a verdict with Labs ON` failed once during round 2 and I
attributed it to a mid-run edit of my own. The mid-run edit was real and that run
was rightly voided — but this bare-poll race is the likelier cause of that
specific assertion, and it is the one now fixed.

### (a) `verify:p0-flow` — could not reproduce, and no mechanism found

Reported as exit 1 on `6dbabc9c` with *"Open full report was NOT disabled at the
earliest instant"*. Run alone, in the foreground, **three times on `6dbabc9c`'s
tree and again after this commit — exit 0 every time**, at load 7.21, 9.75 and
9.97 (harder than idle, not easier), each printing the gate's own
`[smoke] earliest-instant "Full report" click did not cold-open the full report.`

I looked for a mechanism in this lane's diff and did not find one. The toggle's
disabled state is `coverageSummaryStatus === "loading" || (status === "idle" &&
doctorAutoSample)`; this lane never touched `coverageFullReportToggleState`,
`onStatusChange`, or the order in which `CoverageSummary` reports its first
status (the status effect is declared well before the `onRegisterRun` effect this
lane added). The round-2 supersede-abort is a no-op on the first run, where
`abortRef` is still null.

**I am not claiming it cannot fail** — I am recording that it did not fail in six
foreground runs across two commits, and that I found no line in the diff that
could cause it. If it reproduces, the log to capture is the one that shows the
toggle's `disabled`/`title` at the earliest instant; that is the state I would
need to see.

### Round-3 gates, each run alone in the foreground

| gate | result |
|---|---|
| `verify:ui-polish` ×3 | **27/27, exit 0** each |
| `verify:p0-flow` ×3 | **PASS, exit 0** each (load 7.2 / 9.8 / 10.0) |
| `verify:focus-traps` | **27/27, exit 0** |
| `verify:a11y` | **134/134, exit 0** |
| `verify:surfaces` | **248/248, exit 0** — peak 124/60 s, unchanged |
| lint · no-console | **0** |
| scoring receipt `8c99f92d..HEAD` | **0** — *"no scoring-path files changed"* |
| output identity vs `git archive 8c99f92d`, `GIT_SHA=r3pin` | **PASS — 45/45 byte-identical** |

No full `npm test` this round, per the brief — the orchestrator runs the merge
gates.
