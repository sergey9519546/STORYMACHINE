# Independent review — `lane/p0-flow-race` round 1 (**42f510ee**)

**Reviewed object:** `lane/p0-flow-race` tip `42f510ee`
(`42f510eed3190fc6b411fc0da9383b6cfbe89791`), worktree `/home/user/wt-p0flow`
(`node_modules` → main's, 217 entries, not empty). One commit off `main`
`a3e6e688`; `main` is now `d8bb5088` (docs-only in between).
`git diff --stat 42f510ee~1 42f510ee` → **3 files, +264 / −6**:
`scripts/lib/browser-verify.mjs`, `scripts/smoke-p0-live-flow.mjs`,
`tests/scripts/wait-for-function-options-position.test.ts`. No `src/`, no
`server/`.
**Method:** the worktree was driven read-only — no tracked file in it was
edited; every plant and every regressed tree lives under `<session scratch>`.
Browsers launched with `PW_CHROMIUM_PATH=/opt/pw-browsers/chromium`. `dist/` is
NOT stale (`find src server -newer dist/index.html -name '*.ts*' | wc -l` → 0)
and is also irrelevant to this gate — see item 5. The only file written under
`/home/user/STORYMACHINE` is this review. The machine was checked clear
(`ps -eo args | grep -c '[s]moke-p0-live-flow\|[v]erify-p2-p3'` → 0) before
every browser run.

---

## 1. Is the diagnosis right? Re-derived independently — **yes for the run the
gate is about, and no for the unqualified version of the claim**

I instrumented the toggle myself rather than reading the lane's probe. Three
independent instruments, all in `<session scratch>/p0rev/`:

**(a) The gate's own two instants, with the run held** (`probe.mjs` S1, one
context, exit 0):

| instant | `disabled` | `title` | `held` |
|---|---|---|---|
| MOUNT (`waitFor({state:'attached'})`) | **true** | "Coverage is still running — the full report opens as soon as it finishes." | **0** |
| IN FLIGHT (after `waitUntilHeld()`) | **true** | same | **1** |
| after `release()` + verdict rendered | false | null | 1 |

`held === 0` at MOUNT is the lane's central mechanical claim, measured
independently: the toolbar toggle attaches one commit BEFORE the POST goes
out, so a bare `held === 1` read there would be legitimately 0 and the two
reads are not interchangeable. The claim in the lane report is exact.

**(b) A real, unintercepted first run, with EVERY DOM commit sampled**
(`probe.mjs` S2 — a `MutationObserver` on `document.documentElement`
(`subtree/childList/attributes/characterData`) plus a `requestAnimationFrame`
sampler, so any transient commit is recorded, not just the frames a poll
happens to catch):

```
S2/first  {"total":125,"inFlight":4,"bad":0,"sample":null}
   first in-flight commits: [["exists=true disabled=true title=\"Coverage is still running — …\"",4]]
```

**0 of 4** in-flight commits showed an enabled toggle. Nothing is intercepted
in this scenario.

**(c) A genuinely dispatched, genuinely slow run** (`probe2.mjs`, CDP
`Network.emulateNetworkConditions` latency 3000 ms — no `page.route`, the POST
reaches the real server and the real SSE stream comes back):

```
P2 inFlightNow {"ms":39538,"posted":1,"responded":0,"cancel":true,"disabled":true}
P2 afterClick  {"ms":39871,"dialogOpen":false,"posted":1,"responded":0}
P2 done        {"ms":42760,"posted":1,"responded":1,"disabled":false}
P2 commits     {"total":25,"inFlight":8,"enabledWhileInFlight":0}
```

So: **for the first (sample) run there is no window in which "Open full
report" is enabled while the run is in flight.** The lane's (a)-only diagnosis
is right, and no product change is warranted for the defect the gate is about.

### The window the brief asked about DOES exist — on the second and later runs

And not for the reason the brief supposed. It is not
`coverageSummaryStatus === "loading"` guarding alone: the FIRST clause of
`coverageFullReportToggleState` (`src/components/ScriptIDE.tsx:2452`) —
`if (coverageReport) return { disabled: false };` — short-circuits and leaves
the toggle **enabled for the whole of a re-run**. Measured (`probe.mjs` S3,
Coverage panel's own "Re-run coverage", draft unchanged):

```
S2/rerun  {"total":102,"inFlight":5,"bad":5}
   rerun in-flight commits: [["exists=true disabled=false title=null",5]]
```

**5 of 5** in-flight commits enabled. `probe4.mjs` then drove the consequence
with the re-run's POST held and a **real, non-forced** click:

```
P4 in-flight   {"held":1,"cancelVisible":true,"toggleDisabled":false,"postsSoFar":2}
P4 after click {"dialogs":1,"cancelStillThere":0,"posts":2}
P4 dialog text "SCRIPT DOCTOR … Verdict CONSIDER Health 78/100 Strong draft · 12 scenes …"
P4 final posts 2
```

The click opens a **hydrated** report (not a cold panel) and the in-flight
re-run is silently abandoned — no third POST, Cancel gone.

**Why this is still not the defect the fix would have to reach the product
for:** the report it opens is for the same draft generation, so it is
accurate; and in the one state where a stale report could mislead — the writer
edited the draft, `coverageStale` true — the toolbar renders "Coverage
outdated / Re-run coverage" *instead of* the toggle, so the control does not
exist at all. Measured (`probe.mjs` S4, edit-then-re-run):

```
S2/edit-rerun  {"total":392,"inFlight":20,"bad":0}
   edit-rerun in-flight commits: [["exists=false disabled=null title=null",20]]
```

20 of 20. So the product is coherent, and the lane's "no product defect, no
product change" conclusion stands.

**What does not stand** is the unqualified invariant the lane wrote into
`scripts/lib/browser-verify.mjs` (the `holdDoctorRunInFlight` doc comment):

> "the toggle is disabled from the first frame it carries the 'Open full
> report' name … and stays disabled for as long as the run is actually
> running."

The second half is false from the second run onward, and that comment is
exactly what the next lane will read before deciding whether an in-flight
assertion elsewhere can be trusted. Blocking item 3 below.

## 2. Is the gate weaker? — the assertions are byte-unchanged; the **detector
is still not deterministic**, and the report says it is

**The forced click and the no-dialog assertion are byte-identical.** Extracted
the block from `git show 42f510ee~1:scripts/smoke-p0-live-flow.mjs` and from
the tip and diffed them: the ONLY difference in 15 lines is the success
`console.log` string (`… did not cold-open the full report.` → `… (run held in
flight).`). `force: true`, the `.catch()`, the 300 ms settle, the
`[role="dialog"]` count and the failure message are unchanged. The MOUNT
`isDisabled()` check and its throw are also unchanged (diff context).

**Is a held request a real run?** Mechanically, no: Playwright's `page.route`
intercepts BEFORE dispatch, so while held the POST has not reached the server
and no SSE progress flows. That does not change what the assertion measures:
the toggle's `disabled` is a pure function of `(coverageReport,
coverageSummaryStatus, doctorAutoSample)`, and `onReportComputed` fires only
in the same synchronous block as `setStatus("success")`
(`src/components/scriptide/CoverageSummary.tsx:416-437`) — there is no partial
/ progressive report path that could enable the toggle mid-stream. And I did
not leave that to source reading: instrument (c) above force-clicked during a
run that was **dispatched and unanswered** (`posted:1, responded:0`, Cancel
visible, `disabled:true`) and **0 dialogs** opened. The held instant and the
real in-flight instant show the same product state.

**But the MOUNT assertion is still a race, and the report claims it is not.**
Lane report §4 says the mount-window regression "is now caught on every run",
and §7 says the gate "fails deterministically on a product tree that loses
either clause". Reproduced on a `git archive 42f510ee` export with the
`doctorAutoSample` clause removed from `coverageFullReportToggleState` —
exactly the lane's `nomount` tree (`<session scratch>/p0rev/nomount`,
`node scripts/smoke-p0-live-flow.mjs`, one at a time):

| run | load | exit | failure |
|---|---|---|---|
| 1 | 9.04 | **1** | "NOT disabled at the earliest instant" |
| 2 | 8.55 | **0** | — (regression NOT caught) |
| 3 | 6.74 | **1** | "NOT disabled at the earliest instant" |
| 4 | 6.17 | **1** | same |
| 5 | 6.08 | **1** | same |
| 6 | 5.45 | **0** | — (regression NOT caught) |

**4 of 6, not 6 of 6.** Every catch is the MOUNT assertion (none is the new IN
FLIGHT one). The reason is structural: the hold holds the *POST*, but the
mount window is the gap between `CoverageSummary` mounting and its "loading"
status reaching the parent — a sub-frame gap that nothing in this change holds
open. When `attached` resolves after that propagation,
`coverageSummaryStatus === "loading"` disables the toggle on its own and the
regressed tree passes.

**A stronger version exists, is cheap, and I measured it.** Hold
`CoverageSummary`'s own lazy chunk instead of (or as well as) the POST: the
toolbar toggle lives in `ScriptIDE`, not in the lazy child, so it attaches
while `CoverageSummary` has not mounted at all — `coverageSummaryStatus` is
still `"idle"` and **only** the `doctorAutoSample` clause can be disabling it.
`probe3.mjs` (`page.route('**/CoverageSummary*')` held, then read + forced
click), 3 runs each tree:

| tree | `disabled` at MOUNT | dialogs after the forced click |
|---|---|---|
| tip `42f510ee` | **true** 3/3 (with the "still running" title) | **0** 3/3 |
| `nomount` (clause removed) | **false** 3/3 | **1** 3/3 |

That is a deterministic fail-first in both directions, on the exact window the
step exists for — and it also makes the *cold-open* branch fire (the regressed
tree's click opens the dialog every time), which the current gate only reaches
by luck.

## 3. Reproduction

`npm run verify:p0-flow` on the tip, foreground, one at a time, in
`/home/user/wt-p0flow`:

| run | load (1 min) | exit | wall |
|---|---|---|---|
| 1 | 5.88 | **0** | 29 s |
| 2 | 8.19 | **0** | 30 s |
| 3 | 9.46 | **0** | 32 s |
| 4 | 10.82 | **0** | 32 s |

**4/4 green**, all reporting `[smoke] commit: 42f510ee…`. Wall is flat (29–32 s
against the lane's 21–24 s; this machine carried loads of 5.9–10.8 against
their 1.2–5.7, and the pre-fix signature was a *fast* 11–13 s failure, which
did not occur). The regressed-tree run is the table in item 2 — **exit 1 in 4
of 6**, which is the one number of the lane's that did not reproduce.

## 4. Gates

| gate | command | exit |
|---|---|---|
| touched test (tip) | `node --experimental-strip-types tests/scripts/wait-for-function-options-position.test.ts` | **0** — 8 pass, 0 fail, 3 suites |
| scanner **fail-first** | same test file copied onto a `git archive main` export (`<session scratch>/p0rev/mainexp`) | **1** — # pass 6 # fail 2, naming `scripts/smoke-p0-live-flow.mjs:209` (3c's hand-rolled `setTimeout` + `route.continue()`) and the absent `DOCTOR_STREAM_ROUTE` |
| scoring receipt | `node scripts/check-scoring-receipt.mjs main..HEAD` | **0** — "no scoring-path files changed" |
| claims register | `node scripts/honesty-audit.mjs` | **0** — 461 files, 481 tracked md, 106 rows, clean |
| brain graph | `node scripts/brain-graph.mjs --check` | **0** — 107 notes, 393 links, fresh |

## 5. The two "left undone" claims

**(a) "The gate drives the production build" — the lane is right that this is
false, and right to leave it.** `bootKeylessServer`
(`scripts/lib/browser-verify.mjs:384-393`) spawns `server.ts` with
`keylessBrowserServerEnv(...)`, whose `KEYLESS_OVERRIDES`
(`scripts/lib/keyless-browser-certification.mjs:4-21`) set no `NODE_ENV`;
`server/app.ts:279-285` takes the Vite dev-middleware branch whenever
`NODE_ENV !== 'production'`. Confirmed live rather than by reading: booting a
server exactly as the gate does and fetching `/` returns markup containing
`/@vite/client` → **true**, hashed `dist` asset → **false**, `NODE_ENV`
undefined. So `verify:p0-flow` certifies the dev-middleware app. This is also
already covered elsewhere — `scripts/verify-production-build.mjs:202-209`
deliberately does NOT use `bootKeylessServer` and boots with
`NODE_ENV: 'production'` for exactly this reason — so the correct disposition
is what the lane chose: name the false premise, change nothing here. The Vite
504 (`Outdated Optimize Dep`) that killed one before-run is a shared
`node_modules/.vite` collision between worktrees, not a product or gate
defect; a per-worktree `VITE_CACHE_DIR` would fix it and is out of scope.

**(b) The `const t = document.body.innerText;` scanner escape is still open,
and the new scanner has its own.** `bareVerdictPolls`
(`tests/scripts/wait-for-function-options-position.test.ts:98-108`) is
line-scoped (`lines[i]` must contain both the regex and `innerText`), so
hoisting the read one line up still escapes it — unchanged, correctly
declared. The lane's claim that `handRolledStreamHolds` does not share that
escape is **true** (it walks the whole `.route(` call; a plant spread over
seven lines is caught). But it has a symmetrical one of its own: hoist the
handler into a named `const` and the `.route(` call text contains neither
`setTimeout` nor `.continue(`. Planted into a copy of the tip
(`<session scratch>/p0rev/scan/scripts/verify-escape-a.mjs`, a genuine 4 s
hand-rolled hold on the doctor stream) → the suite reports **# pass 8 # fail
0**. Same class, same severity as the one the lane declared; non-blocking.
While planting it I also hit a smaller robustness nit: a `.route(` occurring
inside a *comment* starts the brace-walk there and swallows the following
code, so an offender can be reported at a comment's line number.

---

## VERDICT: **REVISE**

The code is a real improvement and I found no way in which it weakens an
assertion: the forced click and the no-dialog check are byte-identical, the
new IN FLIGHT read is additive, the held instant measures the same product
state as a genuinely dispatched in-flight run (measured), and the flake is
gone (4/4 green here). What sends it back is two claims that my reproduction
contradicts, both in text that the next lane will rely on, plus one cheap
change that would make the first of them true.

1. **§4's determinism claim is false as written.** "It is now caught on every
   run" / "fails deterministically on a product tree that loses either clause"
   measured **4 of 6** on the same `doctorAutoSample`-clause-removed tree
   (table in item 2), every catch at MOUNT. Either make it true (item 2 below)
   or correct the sentence — and since `p0flow-lane-report.md` is already
   committed on `main` (`eced06be`), the correction needs a follow-up commit,
   not a rewrite in place.
2. **Make the MOUNT instant deterministic, since the mechanism is cheap and
   demonstrated.** Holding `CoverageSummary`'s lazy chunk pins the toggle in
   the window where ONLY the `doctorAutoSample` clause can be disabling it:
   measured 3/3 disabled on the tip with no dialog, and 3/3 enabled **with the
   forced click opening the dialog** on the regressed tree. That turns 4/6
   into a deterministic fail-first on both branches of the original defect. If
   the lane judges this out of scope, say so with evidence and take item 1's
   other half instead — but do not leave the claim standing.
3. **Qualify the invariant in `holdDoctorRunInFlight`'s doc comment.** "the
   toggle … stays disabled for as long as the run is actually running" is
   false from the second run onward: `coverageFullReportToggleState`'s first
   clause (`ScriptIDE.tsx:2452`) enables it for the whole of a re-run —
   measured 5/5 in-flight commits enabled, and a real non-forced click opens a
   hydrated report and abandons the in-flight run (`probe4.mjs`). The
   conclusion ("no product defect") is unaffected and I am not asking for a
   product change; I am asking the comment to say "the first run, before any
   report exists", and to record the re-run window and why it is benign (the
   report matches the current draft generation; when the draft has moved, the
   toolbar renders "Re-run coverage" and the toggle does not exist at all —
   20/20 in-flight commits).

### Non-blocking

1. **The helper's mechanism sentence is imprecise.** "the real request reaches
   the real server and its response is held until this step releases it" —
   `page.route` holds the request *before dispatch*; nothing has reached the
   server while the hold is on. True of the lifecycle as a whole ("answered by
   the real analysis … only later"), but a reader debugging a server-side
   assertion under the hold will be misled by "its response is held".
2. **The gate never asserts that the released run completes.** Step 3b calls
   `earlyRun.release()` and immediately closes `earlyContext`, so "the real
   response is delivered from here" is a comment, not an assertion. I verified
   it does (`probe.mjs` S1: after release the verdict rendered and the toggle
   enabled), but the gate would not notice if `release()` stopped working —
   `held` is also never read by the gate except through `waitUntilHeld()`.
3. **`handRolledStreamHolds` hoisting escape** (item 5b): a handler assigned to
   a named `const` outside the `.route(` call is not flagged — planted, suite
   still 8/8 green with a live hand-rolled hold in `scripts/`.
4. **`handRolledStreamHolds` brace-walk starts at `.route(` occurrences inside
   comments**, which can attribute an offender to a comment's line number and
   quote 120 characters of unrelated text.
5. **Per-worktree `VITE_CACHE_DIR`** would remove the shared-`node_modules`
   504 class of failure the lane hit once before the fix (item 5a). Genuinely
   out of this lane's scope; worth a lane of its own if it recurs.
6. **`verify:ui-polish` / `verify:surfaces` were not re-run by me** — the lane
   ran both (they share `browser-verify.mjs`) and the reviewer's job is one
   driven number, not the battery. The helper is additive (a new export; no
   existing export changed), so the blast radius on those suites is nil by
   inspection.

---

## Round 2 — re-check of **632592ec**

**Reviewed object:** `lane/p0-flow-race` tip `632592ec`
(`632592ecec7a8afe8057bbf34a9a3a7f5d43cab6`, `git ls-remote` matches the local
tip), three commits over `42f510ee` — `457469f8` (pin MOUNT by holding the
lazy chunk), `d7a82a3e` (qualify the invariant), `632592ec` (scanner
deny-by-default). `git diff --stat 42f510ee 632592ec` → **3 files, +283 /
−109**; still no `src/`, no `server/`. Same reviewer, warm context: I re-checked
only my own three items plus the gates the brief named, and the worktree was
again driven read-only (every regressed tree and plant under
`<session scratch>`). Machine checked clear before every browser run.

### Item 1 — the determinism claim — **corrected**

The lane report's Round 2 §"Item 1" states plainly that §4's "caught on every
run" and §7's "fails deterministically" were wrong, names my measurement (4 of
6, runs 2 and 6 passing, every catch at MOUNT), and states what the round-1
evidence actually supported ("caught twice out of two"). It also gets the cause
right — the hold pinned IN FLIGHT, never the sub-frame mount gap. The record is
corrected rather than softened. **Closed.**

### Item 2 — MOUNT pinned — **closed, and it is now the fail-first I asked for**

`holdCoverageSummaryChunk` (`browser-verify.mjs`, over a shared internal
`holdRoute`; `COVERAGE_SUMMARY_CHUNK_ROUTE = '**/CoverageSummary*'`) holds the
lazy chunk, and step 3b walks MOUNT → click → IN FLIGHT → click. Re-measured
myself on a `git archive 632592ec` export with **only** the `doctorAutoSample`
clause removed (`<session scratch>/p0rev/nomount2`,
`node scripts/smoke-p0-live-flow.mjs`, foreground, one at a time):

| run | load | exit | wall | caught by |
|---|---|---|---|---|
| 1 | 0.84 | **1** | 7 s | MOUNT |
| 2 | 1.01 | **1** | 7 s | MOUNT |
| 3 | 1.65 | **1** | 7 s | MOUNT |
| 4 | 2.32 | **1** | 7 s | MOUNT |

**4 of 4**, all "NOT disabled at the earliest instant", all failing in 7 s
(it no longer has to wait out a run to find out). Against 4 of 6 at `42f510ee`.

The cold-open branch, checked independently: I removed **only** the MOUNT
`isDisabled()` throw from a copy of that same tree so the forced click is
actually reached (`<session scratch>/p0rev/nomount3`) — exit **1**:

```
[reviewer-plant] MOUNT throw removed; disabled=false
FAIL — golden-path cold-panel regression: … opened a dialog … (text starts:
"SCRIPT DOCTOR\nUPLOAD SCRIPT\n\nWRITE SOME SCRIPT CONTENT, OR UPLOAD A SCRIPT …")
[window: MOUNT]
```

That is the **genuinely cold** panel — the original golden-path defect — not
round 1's accidental warm one (health 78), and the new `[window: …]` tail names
which window fired. The lane's claim reproduces exactly.

**The click assertion is still byte-unchanged.** Extracting the round-1 block
and the round-2 `assertEarliestClickIsInert` body and comparing code lines only
(comments and indentation stripped): the sole difference is the added
`[window: <name>]` clause in the failure message. `force: true`, the
`.catch()`, the 300 ms settle, the `[role="dialog"]` count, the throw and its
sentence are identical — and it now runs **twice**, once per pinned window.

Tip, `npm run verify:p0-flow`, foreground, one at a time, in
`/home/user/wt-p0flow`:

| run | load | exit | wall |
|---|---|---|---|
| 1 | 2.34 | **0** | 24 s |
| 2 | 4.23 | **0** | 20 s |
| 3 | 4.65 | **0** | 21 s |

**3/3 green**, each logging `earliest-instant "Full report" click did not
cold-open the full report (MOUNT and IN FLIGHT windows both held)`. Wall is
unchanged against round 1 at comparable load, so pinning two windows costs
nothing measurable.

### Item 3 — the invariant — **closed**

`holdDoctorRunInFlight`'s comment now separates what the product guarantees
(first run, before any report exists — with my 4/4 and CDP-latency numbers)
from what it does not (re-run: `if (coverageReport) return { disabled: false }`
short-circuits, 5/5 in-flight commits enabled, a real click opens the hydrated
report and abandons the run; benign, and the toggle does not exist at all once
the draft has moved — 20/20). It ends with the line that matters for the next
lane: *"this helper pins a window. It does not certify an invariant."* No
product change, as I asked. Non-blocking 1 is closed in the same commit: the
comment now says `page.route` intercepts **before dispatch**, that nothing has
reached the server while a hold is on, and warns any gate asserting on
server-side state.

### Non-blocking 3 and 4 — the scanner

Re-run with my own round-1 plant rebuilt verbatim
(`<session scratch>/p0rev/scan2`, a `git archive 632592ec` export):

| tree | `node --experimental-strip-types tests/scripts/wait-for-function-options-position.test.ts` |
|---|---|
| tip untouched | **exit 0** — # tests 8, # pass 8, # fail 0 |
| tip + my hoisted-`const` plant (live 4 s hand-rolled hold) | **exit 1** — # pass 7, # fail 1, named `scripts/verify-escape-a.mjs:7` (8/8 green at `42f510ee`) |

The escape is closed, and by the right mechanism: deny-by-default (allowed only
if the route `.fulfill(`s) rather than another list of spellings to enumerate.
`maskCommentsAndStrings` closes the comment misattribution, with three
self-tests including the URL `//` case.

### Gates I re-ran

| gate | command | exit |
|---|---|---|
| touched test (tip) | `node --experimental-strip-types tests/scripts/wait-for-function-options-position.test.ts` | **0** — 8 pass, 0 fail |
| lint | `npx tsc --noEmit` | **0** |
| scoring receipt | `node scripts/check-scoring-receipt.mjs main..HEAD` | **0** — "no scoring-path files changed" |
| claims register | `node scripts/honesty-audit.mjs` | **0** — 461 files, 481 tracked md, 106 rows, clean |
| worktree | `git status --short` | clean; `origin/lane/p0-flow-race` == `632592ec` |

`verify:ui-polish` / `verify:surfaces` were not re-run, and after checking I
agree they need not be: `grep -rn "holdDoctorRunInFlight\|holdCoverageSummaryChunk\|holdRoute" scripts/ --include=*.mjs`
outside `browser-verify.mjs` returns **only** `smoke-p0-live-flow.mjs` (lines
40, 41, 181, 182, 281, 288), so round 2 adds an export and changes no existing
caller.

---

## VERDICT: **MERGE**

All three blocking items are closed, and closed at the cause rather than in
prose: the detector I measured at 4 of 6 is 4 of 4 for me at the new tip (6 of
6 for the lane), it now fires the genuinely cold panel on purpose in both
directions, the click assertion survived byte-identical and runs twice, the
invariant says what is true and marks where it stops, and the scanner escape I
planted is caught. The report corrects its own false claim in the record
instead of quietly restating it.

### Non-blocking

1. **The deny-by-default test's ALLOW side still reads unmasked text.**
   `handRolledStreamHolds` masks comments and strings for the brace-walk, but
   `call` is sliced from the ORIGINAL source and the exemption is
   `/route\.fulfill\(|\.fulfill\(/.test(call)` — so a genuine hand-rolled hold
   that merely *mentions* the phrase in a comment inside its handler is
   exempted. Planted
   (`<session scratch>/p0rev/scan2/scripts/verify-escape-c.mjs`: a live 4 s
   `setTimeout` + `route.continue()` hold whose body contains
   `// we do not route.fulfill( here`) → suite stays **8 pass, 0 fail**. One
   line: test the exemption against `masked.slice(at, i + 1)` and keep the
   `doctor/stream` URL check on `source`, since the mask blanks string bodies.
   Deliberate evasion rather than an accident, so not blocking — but it is the
   same shape as the escape this commit just closed.
2. **Round-1 non-blocking 2 stays open by choice** (the gate never asserts the
   released run completes). The lane's reasoning — a broken `release()` would
   surface as a `waitUntilHeld` timeout in 3b/3c, and step 2/3 drives a full
   unintercepted run to a rendered verdict — is sound. Leave it.
3. **`COVERAGE_SUMMARY_CHUNK_ROUTE` is a name-shaped dependency.** `
   **/CoverageSummary*` matches the dev module URL and today's built chunk
   name; a future build config that names chunks by hash alone would make the
   hold match nothing. It fails loudly rather than silently
   (`earlyChunk.waitUntilHeld()` throws), which is the right failure mode, but
   a one-line comment pointing at the Vite `chunkFileNames` setting would save
   the next reader the hunt.
