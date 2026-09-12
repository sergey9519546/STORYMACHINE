# Independent review — `lane/writer-loop-client`: round 1 **718a0b1d**, round 2 **d0d1b759**

**Reviewed object:** `718a0b1d` (the lane's `c19000c7` rebased onto `main`
`f94d587e`; ten commits; on `origin/lane/writer-loop-client`).
**Reviewer:** did not build this change. **Baseline for every fail-first
number below:** `git archive f94d587e`.
**Method:** `git archive 718a0b1d | tar -x` and `git archive f94d587e | tar -x`
into `<session scratch>/writer-review/{tip,base}` with `node_modules`
symlinked, `npm run build` in each (both exit 0), a keyless server per tree
(tip :5411, base :5412, `llmReady:false` on both), and Playwright driven
against the built app with `PW_CHROMIUM_PATH=/opt/pw-browsers/chromium`.
`/home/user/wt-writer` and `/home/user/STORYMACHINE`'s tree were not touched.
Every server and browser started for this review was killed.

---

## Round 1

### Brief vs diff

| # | brief item | verdict | evidence |
|---|---|---|---|
| 3 | "Re-run coverage" re-runs; only a completed run clears "outdated"; both controls call one `run()` | **done** | banner click → 1 `/api/scriptide/doctor/stream` POST, health 75 → 76; baseline 0 POSTs, 75 → 75; flag survives a cancelled run |
| 5 | a jump span belongs to the finding that produced it | **done** | `computeTopPriorityJumpSpan` returns `undefined` for the document-tier priority; baseline returned 137–2709 of 2,928 lines |
| 6 | the front-door card is a build-time artifact of a real doctor run, labelled, drift-guarded | **done** | card = live server answer field-for-field; mutating the artifact fails the guard 3/3 |
| 10 | every dead control gated or honestly disabled; nothing deleted | **done** | keyless buttons 9 → 7, inert 2 → 0; Labs-ON inventory identical to baseline (10) |
| 15 | the compact card carries the server's hint; "Paste from PDF?" | **done, with a caveat** | hint + affordance render; see item 5 below on what the affordance does to the draft |
| 9 (presentation) | one number is the health; the diagnostics say so | **done** | 4 labelled slots, 0 bare `Health score: N/100`, headline 78 only |
| 4 / 14 (panel) | one gated, direction-safe function owns the badge copy | **done** | 5 badges "not comparable" on every real draft; baseline showed five "TOP 10%" |
| follow-up A | six `waitForFunction` budgets were silently 30 s | **done in this suite, not elsewhere** | 8 identical misuses remain in three sibling suites — item 4 below |
| follow-up B | a superseded coverage run is aborted | **done at source; not reproducible through the UI** | item 8 below |

**Nothing was removed rather than gated**, and no tolerance was widened. The
one existing test the lane rewrote (`g0-09-report-honesty-copy.test.ts`) is
strictly stronger: it lost one `assert.match(panel, /synthetic reference set/)`
(now asserted where the copy lives) and gained four assertions that the panel
reaches that copy only through the gated helpers and never renders the ungated
band.

---

### Reproductions

Every command below was run by the reviewer; every number is from that run.

**Finding 3 — the banner.** `<session scratch>/writer-review/drive-rerun.mjs`
(import `data/screenplays/runoff.fountain` → COVERAGE → RUN → type
`INT. ANOTHER ROOM - DAY …` → click the text-labelled `Re-run coverage`):

```
BASE f94d587e: first run health=75 posts=1
BASE: BANNER CLICK -> doctor POSTs=0  health 75 -> 75  outdated=false  bannerVisible=false
TIP  718a0b1d: BANNER CLICK -> doctor POSTs=1  health 75 -> 76  outdated=false bannerVisible=false
```

The baseline no-op is reproduced exactly as the audit reported it: the warning
is dismissed by a click that issues no request. Both controls reach one `run()`
— `CoverageSummary.tsx:513-520` publishes it through `onRegisterRun`, and
`ScriptIDE.tsx:1691-1698` (`rerunCoverage`) invokes that function object;
driven, the aria-labelled header control also produces exactly 1 POST.

*Only a completed run clears the flag* — `drive-cancel.mjs`, with the stream
delayed 8 s so mid-run is observable:

```
TIP: before click        outdated=true   label="RE-RUN COVERAGE"
TIP: MID-RUN (t+2.5 s)   posts=1  outdated=true   label="RE-RUNNING COVERAGE…"
TIP: cancel visible mid-run=true
TIP: AFTER CANCEL        outdated=true   label="RE-RUN COVERAGE"
TIP: t+15 s after cancel outdated=true
```

`handleTaskChange` / `openToolSlot` no longer call `setCoverageStale(false)`
(`ScriptIDE.tsx:1629-1634`, `:1656-1657`); `onFreshReport` is the only retractor
and is itself guarded by `if (stale) return;` in `CoverageSummary`.

**Finding 5 — the invented line.** `<session scratch>/writer-review/f5probe.mjs`,
the finding's own expression corrected to what the CARD actually receives
(`report.topPriorities[0]` and the route-attached `rootCauses`, `server/routes/
scriptide.ts:607-618` — the audit's one-liner read `pipe.prioritized[0]`, which
resolves to a different, line-anchored finding on today's main):

```
BASE f94d587e  lines 2928
  CARD topPriorities[0].location = "Conflict layer"  rule NO_REVERSALS_LONG_STORY
  document-tier? true
  WHAT THE CARD GETS = {"startLine":137,"endLine":2709}        # 2,573 lines = 87.9%
TIP 718a0b1d
  WHAT THE CARD GETS (computeTopPriorityJumpSpan) = undefined  # honest no-location note
  root-cause span (offered separately, owner:"root-cause") = 137–2709
```

The attributed member jump is tight, as claimed (`f5member.mjs`):
`MEMBER JUMP rule REVELATION_DROUGHT label "Jump to scene 2" lines 90 - 120
(31 lines, 1.1% of 2928)`. The lane's 137–2709 / 90–120 / 31-line numbers all
reproduce.

**Finding 6 — the front door.** Live keyless POST of `src/lib/sample-script.ts`
to the tip server (`sample-post.mjs` / `sample2.mjs`):

```
verdict CONSIDER · health 78.3 (→78) · grade strong · 12 scenes · 1830 words
bySeverity {"critical":2,"major":32,"minor":139}
topPriorities[0] = "Scene 9 (climax peak)" / PROTAGONIST_PASSIVITY_CLIMAX
contentHash 09e8b0381f1fc862619630b5684458bbec6f2c7910d4c0aee7a77ec2c1ec7cb0
```

Every field equals `src/lib/sample-coverage-facts.ts` byte-for-byte. Driven
(`drive-card.mjs`): tip card = `VERDICT CONSIDER · HEALTH 78 · NEXT "Scene 9
(climax peak)" (title=PROTAGONIST_PASSIVITY_CLIMAX) · COUNTS 2 · 32 · 139`,
plus the provenance line *"The sample's own numbers — Dead Frequency, 12 scenes,
run keyless by this build."*; baseline card = `HEALTH 76 · NEXT "Climax
engagement" · COUNTS 3 · 38 · 159`, no provenance line.

*The drift guard fails on mutation* — editing the committed artifact
(`health: 78 → 76`, `minor: 139 → 159`) and running
`node --experimental-strip-types tests/core/sample-coverage-facts.test.ts`:
`# pass 0 # fail 3` (restored afterwards).

**Finding 10 — dead controls.** `drive-start.mjs` / `drive-card.mjs`, enumerating
every visible enabled `<button>` and clicking the two the audit named:

```
BASE  labs=false  9 buttons  incl. "OPEN SIMULATION", "SIMULATE"
        CLICK "Open simulation": url changed=false content changed=false
        CLICK "Simulate":        url changed=false content changed=false
TIP   labs=false  7 buttons  no simulation control, no OASIS hero,
        "STORY MACHINE SIMULATE"=false  "WHEN YOU NEED PRESSURE"=false
TIP   labs=true  10 buttons   BASE labs=true 10 buttons   → nothing deleted
        CLICK "Open simulation" (Labs on): content changed=true
```

**Finding 15 — the compact card.** `drive-format.mjs`, a title-page-only paste:

```
TIP : hint rendered (185 chars, [data-format-hint]); buttons = RETRY, PASTE FROM PDF?, USE SAMPLE
BASE: hint=null;                                     buttons = RETRY, USE SAMPLE
```

Both outcome branches are honest and were driven — see item 5 for the judgement
the brief asked for.

**Finding 9 — one health number.** `drive-panel.mjs` (Try sample coverage → Full
report):

```
TIP : labelledSlots=4  bareHealthScoreLine=0  graphHealthScoreLine=1
      headline HEALTH 78 · "Graph Health 37/100 −9hp" still rendered, captioned
      labels: "DIAGNOSTIC — NOT PART OF HEALTH" ×2, and the two sentences verbatim
BASE: labelledSlots=0  bareHealthScoreLine=1  graphHealthScoreLine=0
```

The label's claim is the engine's own and still true: `graphHealth` /
`storyGraph` are attached at `doctor.ts:2323-2324` and feed no health term
(`grep -n "graphHealth\|storyGraph" server/nvm/analyze/doctor.ts` → 58, 2141,
2142, 2323, 2324, 2326, 2352 only), matching `types.ts:403-405`.

**Findings 4 / 14 — the badges.** `f4probe.mjs` on a live `runoff` report, and
the panel driven:

```
runoff: 9 scenes / 1448 words   comparable? false
  Structure & Pacing  94.2  pct  90  WAS "top 10%"  NOW "not comparable"
  Character           95.5  pct  65  WAS "top 40%"  NOW "not comparable"
  Dialogue & Voice    98.1  pct  20  WAS "top 80%"  NOW "not comparable"
  Plot Logic & Payoff 89.2  pct  70  WAS "top 30%"  NOW "not comparable"
  Theme & Originality 99.6  pct  20  WAS "top 80%"  NOW "not comparable"
sample 12/1830 → not comparable · 231-scene fixture → not comparable
TIP panel: 5 badges "NOT COMPARABLE", zero "TOP N%"   BASE panel: five "TOP 10%"
```

Clamping and boundaries check out (`dimensionPercentileBand(-5)="bottom 10%"`,
`(150)="top 10%"`, `(89)="stronger than 89%"`, `(90)="top 10%"`; gate true only
at scenes 9–10 **and** words 256–337), and
`tests/core/dimension-percentile-badge.test.ts:63,75,81,102,117` are real
boundary/direction cases, including a walk of all 101 percentiles against
`percentileDescriptor`.

*The lane's root-cause claim is correct.* Read, not touched:
`server/nvm/analyze/doctor.ts:2257` ranks `build.rawScore`
(`computeRawCraftScore`, unclamped, scarcity term included — `:671-677`,
`:1078`), while the number printed beside the badge is `build.score.score` =
`computeDimensionScore` (density only, clamped — `:835-844`, `:1077`). Two
different statistics; re-ranking is scoring-path.

---

### Gates, re-run by the reviewer

| gate | command | result |
|---|---|---|
| lint | `npx tsc --noEmit` (tip) | **0** |
| no-console | `node scripts/check-no-console.mjs` | **0** |
| docs | `npm run check-docs` | **0** — "No AI writing patterns detected" |
| honesty audit | `node scripts/honesty-audit.mjs` | **0** — 460 files, 100 claims rows, clean |
| brain | `node scripts/brain-graph.mjs --check` | **0** — 103 notes, 358 links, fresh |
| scoring receipt | `node scripts/check-scoring-receipt.mjs f94d587e..718a0b1d` | **0** — *"no scoring-path files changed"* |
| output identity | `check-doctor-output-identity.mjs --compare` (`GIT_SHA=reviewpin` on both trees) | **PASS — 45/45 byte-identical** |
| public benchmark | `tests/core/public-benchmark.test.ts` | **28/28** |
| touched suites | 15 files, run individually | **all green** — jump-span 15, dimension-percentile-badge 11, dimension-badge-wiring 3, diagnostic-not-health-label 8, start-screen-labs-gate 6, start-screen-sample-card 5, coverage-rerun-one-control 8, g0-09 4, command-palette-wiring 28, brain-coverage 7, coverage-jump-highlight 13, coverage-format-unrecognized-card 13, sample-coverage-facts 3, coverage-next-fix-jump-honesty 8, p0-sample-drift 4 |
| **browser** | `PW_CHROMIUM_PATH=… npm run verify:surfaces` | **FAILS — see item 1** |

**Fail-first, measured on `f94d587e` by copying each new test in:**

| suite | on the baseline |
|---|---|
| `dimension-badge-wiring` | pass 0 / **fail 3** |
| `start-screen-labs-gate` | pass 2 / **fail 4** |
| `start-screen-sample-card` | pass 1 / **fail 4** |
| `coverage-rerun-one-control` | pass 1 / **fail 7** |
| `diagnostic-not-health-label` (with `diagnostic-copy.ts` copied in) | pass 3 / **fail 5** |
| `coverage-format-unrecognized-card` | pass 3 / **fail 10** |
| `coverage-next-fix-jump-honesty`, `jump-span` | do not load — *"does not provide an export named 'computeRootCauseJumpSpan'"* |

Every fail-first number the lane reported reproduces. (The report's "9 of 12"
for the format card is now 10 of 13: commit `718a0b1d` added the thirteenth
assertion after that measurement.)

**Claims rows 94–100** quote shipped bytes: rows 94, 96, 97, 98 and 100 were read
off the rendered page in this review; row 95 is the template of a line whose
rendered form was asserted by the suite's `P2-featurelen` phase; row 99's clause
lives in `dimensionPercentileTooltipFor`'s in-bounds branch, which — as the row
itself says — no real draft reaches.

**Trailers:** all ten commits carry `Co-Authored-By:` and `Claude-Session:`.
No model identifier appears in any shipped byte
(`git diff f94d587e 718a0b1d | grep -iE '^\+.*(opus|sonnet|haiku|fable|gpt-|claude-[0-9])'`
→ empty). The `Co-Authored-By` value itself names a model; that is the lane
harness's own trailer text, flagged for the orchestrator rather than charged to
the lane.

---

## VERDICT: **REVISE**

Seven brief items are genuinely closed, each with a fail-first guard that fails
on the unfixed tree, and the two "key findings beyond the brief" hold up under
independent reading. The items below are all small; none of them asks for the
product work to be redone.

### 1. `npm run verify:surfaces` is not green on this tip, and the cause is the route's own rate limiter — BLOCKING

`scripts/verify-p2-p3-surfaces.mjs:2546-2551` · `server/lib/session-store.ts:137-142`

The report records this gate as **"0 — 242/242 assertions passed"**. Three runs
of the unmodified tip tree by the reviewer:

| run | machine load at start | result |
|---|---|---|
| 1 | 5.4/4 cpus (scale 1.4x) | **FATAL** at `:511` after **83/83** — `locator('header.sm-pagetop')` 20 s |
| 2 | 3.7/4 cpus (scale 1.0x) | **FATAL** at `:2551` after **218/218** — `waitForFunction` 180 s |
| 3 | **0.2/4 cpus** (idle machine) | **FATAL** at `:2551` after **218/218** — identical |

Exit code 1 every time, and 24 assertions — the whole of `P2-featurelen`'s
finding-#5 evidence and all three `P2-deadcontrols` assertions — never run.

An instrumented copy of the tree (the same wait shortened to 45 s, plus a
`response` listener and per-page console tagging) isolates the cause:

```
[FAIL] (global) :: ZERO genuine browser console errors — 4 found:
  [pageC] Failed to load resource: the server responded with a status of 429 (Too Many Requests)  ×4
[FAIL] P2-featurelen :: coverage completes on a 231-scene draft and renders a report
```

`pageC` **is** the `P2-featurelen` context. The phase's doctor POST is being
refused by `gameLimiter` (`windowMs: 60_000, max: 120`) because the earlier
phases have already spent the window; the card then never renders `HEALTH`, and
on the unmodified tree that becomes a 180-second fatal instead of a failed
assertion. This is the same limiter the lane already worked around twice (a
dropped `P2-format` assertion, `P2-deadcontrols` moved to the end) — the
workaround did not reach the phase that actually needs the request. In a fourth
run the phase won the race and the suite reported 241/242, still failing the
global console-error check on the same 429s, and once also on
`Maximum update depth exceeded` (observed in one of four instrumented runs;
not attributed to this lane).

Verified this is not a machine-speed problem: a cold keyless server analyses the
231-scene fixture in **2,581 ms** (`POST /api/scriptide/doctor`, health 84.4,
231 scenes), and the same phase driven in isolation on a fresh server passes
(`drive-featurelen.mjs`: `HEALTH appeared within 60s = true`, one
`/api/scriptide/doctor/stream`, zero console errors).

**Fix:** give `P2-featurelen` its own window — pause before the phase, or drive
its doctor call on a context that has not spent the budget — and make the wait a
recorded failure rather than a fatal, so one lost request cannot delete 24
assertions. Then re-run and report the number that comes back.

### 2. Debris: a stray `// probe` shipped in a source file

`src/lib/percentile-copy.ts:299`

```
export function slatePercentileCaption(): string { … }
// probe            ← added by f989563c, between the slate caption and the new section header
```

Left over from the lane's own probing. Delete it.

### 3. Two code comments cite claims-register rows that do not exist

`src/components/StartScreen.tsx:723` — *"Registered as docs/CLAIMS_REGISTER.md
row 103"*; the claim is **row 94**.
`src/components/scriptide/CoverageSummary.tsx:1008` — *"row 102"*; the claim is
**row 95**.

The register ends at row 100 (`honesty-audit` counts 100 rows). A reader
following either pointer lands nowhere, which is the exact failure mode the
register exists to prevent.

### 4. The `waitForFunction` follow-up stops at this lane's own file

`scripts/verify-a11y.mjs:383, :387, :817, :995, :1743` ·
`scripts/verify-focus-traps.mjs:175, :365` ·
`scripts/verify-ui-polish-affordances.mjs:123`

Commit `1bf9a482` is right, and its six fixes are verified (`grep -n
"waitForFunction" scripts/verify-p2-p3-surfaces.mjs` → every call now passes
`undefined` third-arg-style with `timing.ms(...)` in options). But eight
identical misuses survive in three sibling suites the orchestrator's eight-suite
battery runs, including two budgets that silently collapse from 45 s and 40 s to
Playwright's 30 s default:

```
verify-a11y.mjs:1743           45000 → 30000 (gates a recorded assertion)
verify-ui-polish-affordances:123  40000 → 30000
```

Either fix them (one token each) or write the reason down; §2 allows the second,
the report does neither.

### 5. "Paste from PDF?" rewrites the writer's draft without saying so

`src/components/scriptide/CoverageSummary.tsx:457-508`, the card at `:770-808`

The brief asks for a judgement. **The messaging is honest degradation and should
stay; the one thing the control actually *does* is not disclosed, and that part
should be fixed before it ships.** Driven on the two states it is reachable from:

```
title-page-only paste  → "Nothing to re-space … It has no INT./EXT. scene
                          headings to find."   (no request, no edit)  ✔ honest
double-spaced prose    → editor BEFORE: "The room was cold.\n\n\n\n\nMaya opened
                          the door.\n\n\n\n\nShe said nothing…"
                          editor AFTER : "The room was cold. Maya opened the door.
                          She said nothing…"
                          outcome: "Re-spaced the paste and ran it again — still
                          no scene headings. Add one, such as INT. KITCHEN - DAY…"
```

Four separate action beats were joined into one run-on paragraph. The report and
claims row 100 describe the affordance's residual value as *"the repaired draft
now in the editor"*; in the state it is offered in, that draft is materially
**worse** than the one the writer pasted, and nothing on the card says the text
was changed. (Ctrl+Z does restore it — verified — but the card never says so.)

**The best version**, cheapest first: the outcome sentence names what happened
and how to undo it ("Your draft was re-spaced — press ⌘Z / Ctrl+Z to put it
back"); better, the button is offered only when
`normalizeScreenplay(fountain) !== fountain`, so the no-op branch never renders a
control at all; best, the repair does what a PDF paste actually needs — recover a
slugline glued to a page header or scene number — which the lane correctly scopes
out but which is the only version that can succeed from this state.

### 6. A stale docstring names the wrong prop

`src/components/scriptide/CoverageSummary.tsx:469`

> *"…and then submits the repaired text through the same `run()`, with
> `onLoadSampleIntoEditor` installing it so the editor and the report never
> describe different bytes."*

The code installs through `onRepairDraft` (`:505`), and the prop doc at `:59-65`
says *"Deliberately NOT `onLoadSampleIntoEditor`, whose host handler carries
sample semantics"*. One of the two sentences is wrong; it is this one.

### 7. Follow-up B is proved at source, not behaviour — say so

`src/components/scriptide/CoverageSummary.tsx:351` ·
`tests/core/coverage-format-unrecognized-card.test.ts:60-70`

The abort is real (the baseline has no `abortRef.current?.abort()` before
`new AbortController()` — `base/…/CoverageSummary.tsx:250,286,383`) and the
guard fails on the baseline. But the reviewer could not construct **any** UI path
that starts two concurrent analyses on either tree: during a run the panel's
header control is replaced by Cancel and the banner button is `disabled`, so both
re-run affordances are unreachable while the abort would matter
(`drive-super.mjs`, `drive-remount.mjs`, `drive-double2.mjs` — in every attempt
request #1 had already finished before request #2 started). The commit message's
"two full 14-pass analyses competing for the doctor pool" therefore describes the
*test harness's* double-click, not a writer's path. Say that in the report, and
note the gap the fix does not close: there is no unmount cleanup that aborts
(`grep -n abortRef` → 299, 351, 455 only), so closing Coverage mid-run still
orphans a full analysis on both trees.

---

### What a stronger version would have done (in scope, not asked for)

- **Finding 3's deeper half** is still open and the lane knows it: "outdated"
  remains a strip-level flag rather than a property of the report the panel is
  showing (`contentHash` ≠ the editor's), and
  `onLoadFountain`'s `setCoverageStale(false)` still clears it on a programmatic
  install of unanalysed text. Flagged in §5 of the report rather than fixed —
  correctly out of this brief's scope, but it is the same bug.
- **The composite `computeJumpSpan` now has no production caller** (`grep`
  across `src/`, `server/`, `scripts/` finds only tests). Keeping it is the
  conservative choice and it is documented; a follow-up should either give it a
  caller or retire it through the normal path.

---

## Round 2

**Reviewed object:** `d0d1b759` (four round-2 commits on the round-1 tip
`718a0b1d`; on `origin/lane/writer-loop-client`). Same reviewer, warm context.
**Method:** `git archive d0d1b759 | tar -x` into
`<session scratch>/writer-review/tip2` beside the round-1 exports, `npm run
build` (exit 0), and a keyless server of my own
(`llmReady:false`). `/home/user/wt-writer` was not opened for writing; the only
file written under `/home/user/STORYMACHINE` is this review.

**One method note against myself.** My first pass at item 5 read a stale
server: a round-1 build was still answering on the port I reused, and it showed
the round-2 fixes missing. Caught it by fetching the served chunk
(`curl …/assets/CoverageSummary-*.js | grep -c "Rewrites your draft"` → 0),
killed every node process, rebound on a clean port, and re-drove everything
below against a server whose served bundle contains the round-2 bytes
(`index-BikXokst.js`, grep → 1). Every number in this round is from that
server.

### The seven items

| # | item | verdict |
|---|---|---|
| 1 | `verify:surfaces` green, fixed at the cause | **closed** — 3/3 runs 246/246 exit 0, one of them at load 6.0/4 cpus; production ceiling proved unchanged on a live server |
| 2 | stray `// probe` | **closed** |
| 3 | two dangling claims pointers + a guard | **closed** — guard fires on a planted bad row |
| 4 | the eight remaining `waitForFunction` misuses | **closed** — my own scanner: 12 / 8 / **0** across the three trees |
| 5 | "Paste from PDF?" rewrote the draft silently | **closed** — driven in both states |
| 6 | stale docstring | **closed** |
| 7 | follow-up B restated; the unmount gap | **closed as a statement; the guard is half a tautology** — item 3 below |

---

### Item 1 — the limiter

**The production ceiling is unchanged, read and measured.**
`server/lib/session-store.ts:137-193` resolves `VERIFY_RATE_LIMIT_MULTIPLIER`
once at module load, defaults to 1, and ignores anything outside a finite
1–50. Driven against real servers, one port each, `GET /api/ai-providers`
(`gameLimiter`), 130 requests per server:

```
MULT unset          200s=119  429s=11   first 429 at request #120   ← production, unchanged
MULT=10             200s=130  429s=0                                ← the gate's server
MULT=51             …first 429 at #120     MULT=Infinity  …#120
MULT=NaN            …#120                  MULT=0         …#120
MULT=-5             …#120                  MULT="10; rm -rf /"  …#120
MULT=9.9            200s=130  429s=0    ← floors to 9x, as claimed
```

(The unset run allows exactly 120 in the window; the boot health-check I used
to wait for the port spends the first one, which is why the first refusal lands
on my 120th request rather than my 121st. A separate single-server run with no
health-check probe gave `200s=120 … first429at=121`.)

**Nothing else can reach it from the repository.** Independent grep: four files
name the variable — `server/lib/session-store.ts` (reads it),
`scripts/lib/keyless-browser-certification.mjs` (sets it),
`scripts/verify-p2-p3-surfaces.mjs` (prints it in the meter line),
`tests/core/rate-limit-verification-override.test.ts` (the guard). No
Dockerfile, docker-compose, package.json, `.github/**`, `server/**` or `src/**`
mention. The guard is not decorative: planting
`// VERIFY_RATE_LIMIT_MULTIPLIER hint` in `server/app.ts` takes it to
**7 pass / 2 fail** (restored).

**The suite is green, and green under load.** Three runs of the unmodified
`d0d1b759` export:

| run | load at start | assertions | exit | peak `/api/` in any 60 s |
|---|---|---|---|---|
| 1 | 3.8 / 4 cpus | **246/246** | **0** | 122 |
| 2 | **6.0 / 4 cpus** | **246/246** | **0** | 119 |
| 3 | 3.6 / 4 cpus | **246/246** | **0** | 124 |

That is stronger than the report's three idle runs: run 2 sat at a load higher
than any of the three round-1 runs that failed. The three `HEALTH` waits are
now `.then(…).catch(…)` feeding `record(...)`
(`scripts/verify-p2-p3-surfaces.mjs`, both feature-length phases and the
re-run phase), so a lost request costs one assertion rather than the 24 it cost
in round 1.

One correction to the report: the peak is **not** "identical across all three
runs". I measured 122 / 119 / 124. That does not weaken the diagnosis — it
sharpens it: the suite straddles the 120 line, which is exactly why the failure
was a coin flip rather than a constant.

### Items 2, 3, 4, 6 — verified, each in the failure direction

- **2.** `// probe` is gone from `src/lib/percentile-copy.ts`.
- **3.** `StartScreen.tsx:723` → row 94, `CoverageSummary.tsx:1094` → row 95.
  Planting `// See docs/CLAIMS_REGISTER.md row 147 …` in
  `src/lib/diagnostic-copy.ts` makes `tests/core/claims-row-citations.test.ts`
  fail naming it exactly — *"src/lib/diagnostic-copy.ts: \"CLAIMS_REGISTER.md
  row 147\" — row 147 does not exist"* (pass 2 / fail 1; restored).
- **4.** I wrote my own bracket-depth scanner rather than trust the lane's
  (`<session scratch>/writer-review/scan.py`, walking each
  `waitForFunction(` call and counting a two-argument call whose second argument
  is an options object). It reproduces the lane's numbers exactly:

  ```
  f94d587e : 12 misuse(s)
  718a0b1d :  8 misuse(s)   ← exactly the eight round 1 named
  d0d1b759 :  0 misuse(s)
  ```

  The two budgets round 1 called out are real now:
  `verify-a11y.mjs:817` and `:1744` (45 s) and
  `verify-ui-polish-affordances.mjs:123` (40 s) all pass `undefined` third-arg
  style. The lane's own scanner is not toothless either: re-introducing one
  misuse at `verify-focus-traps.mjs:175` fails
  `tests/scripts/wait-for-function-options-position.test.ts` with the offending
  line quoted (restored).
- **6.** `CoverageSummary.tsx:509-515` names `onRepairDraft` and says why
  `onLoadSampleIntoEditor` would be wrong.

### Item 5 — driven, in both states

Against the round-2 build, on my own keyless server:

```
A) title-page-only paste (the normaliser cannot act)
   server hint rendered = true
   "Paste from PDF?" buttons in the DOM = 0        ← withheld, hide-don't-disable
   buttons = RETRY, USE SAMPLE

B) double-spaced heading-less paste (the normaliser acts)
   "Paste from PDF?" present, title = "Rewrites your draft with the screenplay
     normaliser — blank lines collapsed, wrapped lines joined — and runs coverage
     on the result. Ctrl+Z undoes it."           ← disclosed BEFORE the click
   editor BEFORE = "The room was cold.\n\n\n\n\nMaya opened the door.\n\n\n\n\nShe said…"
   editor AFTER  = "The room was cold. Maya opened the door. She said nothing…"  changed=true
   outcome = "Re-spaced the paste and ran it again — still no scene headings. Your
     draft was rewritten to do it: blank lines collapsed and wrapped lines joined.
     Press Ctrl+Z (⌘Z on a Mac) to put it back. To get coverage, add a scene
     heading such as INT. KITCHEN - DAY."        ← disclosed AFTER, word for word
   button re-offered = false
   Ctrl+Z restores the paste = true
```

The outcome sentence is byte-identical to the rewritten claims row 100, and
that row now says in its own words that its round-1 text was wrong. The
judgement round 1 asked for is answered: the control is offered only where it
acts, and it says what it does before and after. Accepted in full.

### Item 7 — the statement is right; the guard is half a tautology

The restatement is correct and I agree with it: the supersede-abort is proved
by source and by a guard that fails without it, no UI path starts two
concurrent analyses on either tree, and the round-1 commit message's "two full
14-pass analyses competing for the doctor pool" described the harness's
double-click. The StrictMode finding is a real one, well told, and reverting was
right.

The *test*, though, is weaker than "a test asserting the naive fix is not in the
tree". Measured, by planting each of the two ways someone would reintroduce it
into `tests/core/coverage-format-unrecognized-card.test.ts`:

```
A) abortRef.current?.abort() appended to the existing aliveRef unmount cleanup
   → # pass 17 # fail 1     CAUGHT (by the cleanup-shape assertion, not the doesNotMatch)
B) a separate useEffect(() => { return () => { abortRef.current?.abort(); }; }, [])
   — the exact defect the lane says it built, formatted normally —
   → # pass 18 # fail 0     NOT CAUGHT
```

The `doesNotMatch` regex names one single-line spelling
(`useEffect(() => () => { abortRef.current?.abort(); }, []);`) that nobody would
write. What gives the test teeth is the neighbouring exact-shape assertion on
the `aliveRef` cleanup — which is real, and catches route (A). See item 3 below
for the one-line strengthening.

### Gates, re-run by the reviewer on `d0d1b759`

| gate | command | result |
|---|---|---|
| lint | `npx tsc --noEmit` | **0** |
| no-console | `check-no-console.mjs` | **0** |
| docs | `npm run check-docs` | **0** |
| honesty audit | `honesty-audit.mjs` | **0** — 460 files, 100 claims rows, clean |
| brain | `brain-graph.mjs --check` | **0** — 103 notes, 358 links, fresh |
| scoring receipt | `check-scoring-receipt.mjs f94d587e..d0d1b759` | **0** — *"no scoring-path files changed"* |
| output identity | `--compare` vs `git archive f94d587e`, `GIT_SHA=r2reviewpin` on both trees | **PASS — 45/45 byte-identical** |
| public benchmark | `tests/core/public-benchmark.test.ts` | **28/28** |
| browser | `verify:surfaces` ×3 | **246/246, exit 0, three times** |
| touched suites | run individually | `coverage-format-unrecognized-card` 18, `rate-limit-verification-override` 9, `claims-row-citations` 3, `wait-for-function-options-position` 2, `keyless-browser-certification` 2, `coverage-rerun-one-control` 8, `dimension-percentile-badge` 11, `start-screen-labs-gate` 6, `start-screen-sample-card` 5, `sample-coverage-facts` 3, `diagnostic-not-health-label` 8, `percentile-copy-consistency` 30, `honesty-audit-claims` 5, `brain-coverage` 7 — **all 0 fail** |

`npm test` and the eight-suite battery were not re-run here, per the review
budget; the orchestrator runs both once on the rebased branch.

---

## VERDICT: **MERGE**

All seven round-1 items are closed, each verified in the failure direction, and
the blocking one is closed at its cause with a number rather than a guess. The
three items below are follow-ups, not blockers: none of them changes what a
writer sees, none of them can loosen a production limiter, and none needs to
hold the merge.

**1. The gate multiplier reaches more than "every browser gate".**
`scripts/lib/keyless-browser-certification.mjs:49` puts
`VERIFY_RATE_LIMIT_MULTIPLIER=10` into the env of **every** server booted
through `keylessBrowserServerEnv`, which is three callers beyond the browser
suites: `scripts/fuzz-routes.mjs:64`, `scripts/verify-production-build.mjs:204`
and `scripts/load-test-doctor.mjs:335`. Measured, same endpoint, 200 requests:

```
gate server (MULT=10)      200s=200  429s=0     ← no overflow at all
default server (no MULT)   200s=120  429s=80    first 429 at #121
```

`fuzz-routes.mjs:37` states the behaviour it exists to exercise: the server
must stay responsive "and to 429 the overflow rather than let the [process fall
over]", and its `200-concurrent-doctor-requests` record at `:487` reports the
429 count. At 1200/min that overflow never happens, so the scenario is recorded
as zero rather than exercised. Nothing asserts on it today, so nothing is
falsely green — but the fuzzer is measuring a server the product never runs.
The fix is small: set the multiplier in the browser suites that need it rather
than in the shared boot helper, or have `fuzz-routes` and
`verify-production-build` opt out. Either way the report's "gives every browser
gate's own isolated server 10×" should name the three non-browser callers.

**2. The guard's scope is the repository, and the comment claims a little more.**
`server/lib/session-store.ts:167-171` says the variable is one "that only
`scripts/lib/keyless-browser-certification.mjs` sets". True of the repository,
and the guard proves it. It is not true of the running process: `dotenv/config`
loads `.env` before the limiters are constructed, and an untracked `.env` line
is honoured — measured, `VERIFY_RATE_LIMIT_MULTIPLIER=10` in `tip2/.env` gave
`200s=130 429s=0` (file removed). `.env` is gitignored, so no guard can cover
it; the honest form is one clause — "nothing in the repository sets it; a value
placed in a deployment's own environment or in an untracked `.env` is honoured,
bounded to 50×". The sentence right below it ("a deployment that never sets the
variable is byte-for-byte the deployment that existed before") is already
exactly right and needs no change.

**3. Strengthen item 7's guard, or stop calling it what it is not.**
`tests/core/coverage-format-unrecognized-card.test.ts:84-88` names one
unrealistic spelling. A count assertion catches every route: the tree contains
exactly two `abortRef.current?.abort()` sites — `run()`'s supersede prefix and
`cancelRun` — so

```ts
assert.equal((coverageSummary.match(/abortRef\.current\?\.abort\(\)/g) ?? []).length, 2,
  'the unmount abort breaks the golden path under StrictMode — see the note above abortRef');
```

fails on both reintroduction routes I planted, including the one that passes
today. Until then, the report should say the guard pins the note and the
`aliveRef` cleanup's shape, not that it asserts the naive fix is absent.

### Carried forward unchanged (named by the lane, agreed)

The unmount-abort gap itself (attempted, measured, reverted, documented);
finding 3's deeper half (`onLoadFountain` still clears the stale flag on a
programmatic install); `computeJumpSpan` having no production caller; finding
4's real cause in `doctor.ts`'s ranking of `build.rawScore`; and
`server/lib/coverage-html.ts`'s unlabelled `Graph Health` block, left to the
export lane with the functions named in Round 1.
