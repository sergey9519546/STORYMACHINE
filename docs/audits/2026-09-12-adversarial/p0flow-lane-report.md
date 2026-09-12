# p0-flow lane — `verify:p0-flow`'s earliest-instant race, fixed at the cause

**Worktree:** `/home/user/wt-p0flow` · **Branch:** `lane/p0-flow-race`, one
commit off `main` `a3e6e688` · **Tip:** `42f510ee`, pushed.
**Brief:** decide with evidence whether the step-3b flake is a gate race (a) or
a product defect (b), fix it at the cause, and do not weaken the assertion.

---

## 1. Diagnosis: (a), and only (a)

**It is a gate race. There is no instant in which "Full report" is enabled
while the sample is still loading.** Every recorded failure is the gate
asserting a precondition it does not control — "while the sample run is still
in flight" — against a run that had already finished.

### The two reported messages are one defect seen from two sides

The reviewer's two branches of the same block are:

| message | what was actually true |
|---|---|
| *"Open full report" was NOT disabled at the earliest instant* | the report had already landed, so the toggle was **correctly** enabled |
| *cold-panel regression: … opened a dialog …* | the report landed between the `isDisabled()` read and the forced click, so the dialog that opened was a **complete** report — its own text carries "Health 78/100", which is a WARM panel, not the cold one the message names |

### The measurement

A probe of exactly the step-3b steps — 10 fresh browser contexts against one
warm keyless server, load 10.3/4, script in
`<session scratch>/p0flow/probe-earliest.mjs` — recorded, at the toggle's
`waitFor({ state: 'attached' })` instant: the toggle's `disabled` and `title`,
the coverage panel's rendered text, and the wall-clock offset between that
instant and the doctor-stream POST's completion.

| | runs | at the "earliest instant" |
|---|---|---|
| response finished **before** `attached` (by 245 ms and 258 ms) | **2 / 10** | `disabled=false`, `title=null`, panel reads `VERDICT CONSIDER HEALTH 78`; the forced click opens a fully hydrated Script Doctor |
| response finished **after** `attached` (by 108–451 ms) | **8 / 10** | `disabled=true`, `title="Coverage is still running — …"`, no dialog |

The timings say why it is luck: the built-in sample's POST completes in
**0–49 ms**, while `attached` resolves **877–1482 ms** after the click. The
gate's "earliest instant" is a control that is in the DOM from the panel's
first commit, so nothing holds the run open while the gate reads it; which
side of the run the read lands on is decided by Playwright's locator plumbing.

### Why the product is not at fault

- `coverageFullReportToggleState` (`src/components/ScriptIDE.tsx:2451`)
  disables the toggle while `coverageSummaryStatus === "loading"` **or** while
  `coverageSummaryStatus === "idle" && doctorAutoSample` — the second clause
  covering the commit in which the panel mounts but the POST is not yet out.
- `doctorAutoSample` is the parent's own state, set in the **same batch** as
  `setToolSlot("coverage")` (`ScriptIDE.tsx:1590-1593`, and the two
  "Sample coverage" buttons at `:2833`/`:3173`), and the `aria-label="Open full
  report"` that the gate's locator matches only exists while
  `toolSlot === "coverage" && !coverageFull`. So the toggle is disabled from
  the **first frame it carries that name**.
- On the resolving side, `CoverageSummary` calls `setStatus("success")`,
  `onLoadSampleIntoEditor` and `onReportComputed` in one synchronous block
  (`CoverageSummary.tsx:416-437`), so the report is set in the same commit the
  toggle becomes enabled — no gap.
- In 10 probed runs the enabled-with-loading state was observed **zero** times.

No product change was made, and none is warranted. (Belt and braces: the
same conclusion is re-proved from the other direction in §4 — the fixed gate
still fails, deterministically, on a tree where that product logic is removed.)

---

## 2. Before: 8 foreground runs on the untouched worktree (`main` a3e6e688)

`PW_CHROMIUM_PATH=/opt/pw-browsers/chromium npm run verify:p0-flow`, one at a
time, in `/home/user/wt-p0flow`, with the machine checked clear of other
browser gates first.

| run | load (1 min) | exit | wall | result |
|---|---|---|---|---|
| 1 | 2.09 | **1** | 13 s | *"NOT disabled at the earliest instant"* |
| 2 | 4.06 | **1** | 13 s | same |
| 3 | 6.98 | 0 | 29 s | PASS |
| 4 | 8.65 | **1** | 11 s | *"cold-panel regression … opened a dialog"* |
| 5 | 7.60 | **1** | 37 s | unrelated — see below |
| 6 | 7.45 | 0 | 32 s | PASS |
| 7 | 9.44 | 0 | 33 s | PASS |
| 8 | 10.91 | 0 | 33 s | PASS |

**3 of 8 are the earliest-instant defect** (4 red in total). The shape is
plain in the wall column: every earliest-instant failure is a *fast* run
(11–13 s), every pass is a slow one (29–33 s) — a warm, quick server is what
lets the sample resolve inside the gate's gap.

**Run 5 is a different, pre-existing failure and is NOT fixed here.** It died
on `getByRole('button', { name: /try sample coverage/i })` with three console
errors reading `504 (Outdated Optimize Dep)` — Vite's dep-optimizer cache.
The smoke gate boots `server.ts` without `NODE_ENV=production`, so it serves
through **Vite dev middleware** (`server/app.ts:279-285`), and this worktree
symlinks `node_modules` to the main checkout as the brief instructed, so a
concurrent lane's Vite run can invalidate the shared `node_modules/.vite`
under it mid-run. Left undone: see §7.

---

## 3. What changed

Three files, one commit (`42f510ee`), no `src/`, no `server/`.

**`scripts/lib/browser-verify.mjs` — the one new readiness signal.**
`holdDoctorRunInFlight(page)` holds the doctor's streaming request open until
the caller releases it. The request is **not stubbed**: it reaches the real
server and is answered by the real analysis exactly as it would be for a
writer, only later. The handle exposes `held` (how many doctor-stream requests
were actually intercepted), `waitUntilHeld()` (blocks until the run provably
exists, throws on its deadline) and `release()`. `DOCTOR_STREAM_ROUTE` is the
single spelling of the glob, so a gate cannot quietly intercept a near-miss
path and hold nothing.

**`scripts/smoke-p0-live-flow.mjs` step 3b — two instants, not one.** The
product disables the toggle through a *different clause* in each window, so
both are now asserted, and neither can be taken against a finished run:

1. **MOUNT** — at the same `attached` instant as before (the run is armed;
   the POST is not yet out). This is the window `doctorAutoSample` exists for,
   and the one whose absence produced the original cold-open.
2. **IN FLIGHT** — after `await earlyRun.waitUntilHeld()`, so the POST is
   provably out and held.

Then the earliest-instant click is attempted exactly as before — still
`force: true`, still followed by the "no `[role=dialog]` opened" assertion —
and the hold is released. A bare `held === 1` read at the mount instant is
**not** the right check and was tried first: it measured 0, because the panel
and its controls attach one commit *before* the POST goes out. That is why the
helper has `waitUntilHeld()` and why the step keeps two separate reads.

**`scripts/smoke-p0-live-flow.mjs` step 3c — the same helper.** Its Cancel
window was a hand-rolled `setTimeout(timing.ms(4000))` before
`route.continue()` — a wider race, not the absence of one. It now shares
`holdDoctorRunInFlight` and releases immediately after the Cancel click, so
the response still arrives after the abort, as before, but deterministically.

**`tests/scripts/wait-for-function-options-position.test.ts` — a third
scanner.** `handRolledStreamHolds` flags any `page.route(… doctor/stream …)`
whose handler delays (`setTimeout`) or forwards (`route.continue()`), i.e. any
new hand-rolled "hold the run in flight". A route that *fulfils* the stream
with a canned failure (step 3d's injected 500, the budget-stop stub) is a
different thing and is deliberately not flagged. Plus two structural
assertions that the helper still holds-until-released and still reports what
it intercepted.

---

## 4. The assertion is not weakened — proven against two regressed trees

`git archive main | tar -x` into scratch, the new gate's two script files
copied in, then the product logic regressed and the **new** gate run against it.

| scratch tree | regression planted in `coverageFullReportToggleState` | new gate |
|---|---|---|
| `<scratch>/p0flow/prefix` | disabled logic removed entirely (`if (false)`) | **exit 1** — *"NOT disabled at the earliest instant"* |
| `<scratch>/p0flow/nomount` | only the `doctorAutoSample` clause removed (keeps `status === "loading"`) | **exit 1, twice in two runs** — at the **MOUNT** assertion |

The second row is the point: the mount-window hole is the one the old
single-instant gate could only catch when its `attached` read happened to land
in that window. It is now caught on every run.

**Scanner fail-first**, `git archive main` export + the tip's test file:
**# pass 6 # fail 2**, naming `scripts/smoke-p0-live-flow.mjs:209` (3c's
hand-rolled delay) and the absent `DOCTOR_STREAM_ROUTE` /
`holdDoctorRunInFlight`.

---

## 5. After: 8 foreground runs on `42f510ee`

| run | load (1 min) | exit | wall | result |
|---|---|---|---|---|
| 1 | 1.15 | 0 | 24 s | PASS |
| 2 | 3.16 | 0 | 22 s | PASS |
| 3 | 2.74 | 0 | 23 s | PASS |
| 4 | 5.23 | 0 | 24 s | PASS |
| 5 | 4.23 | 0 | 22 s | PASS |
| 6 | 4.31 | 0 | 21 s | PASS |
| 7 | 3.78 | 0 | 22 s | PASS |
| 8 | 5.73 | 0 | 22 s | PASS |

**8/8 green.** The wall column is the secondary evidence: it collapses from a
bimodal 11–13 s (red) / 29–37 s (green) into a flat 21–24 s. The step no
longer finishes early by skipping past a run it was supposed to be watching.

---

## 6. Gates (all foreground, in `/home/user/wt-p0flow`, exit codes)

| gate | command | exit |
|---|---|---|
| touched test | `node --experimental-strip-types tests/scripts/wait-for-function-options-position.test.ts` | **0** — 8 pass, 0 fail |
| lint | `npx tsc --noEmit` | **0** |
| no-console | `node scripts/check-no-console.mjs` | **0** — 305 files |
| docs | `npm run check-docs` | **0** |
| claims register | `node scripts/honesty-audit.mjs` | **0** — 461 files, 481 tracked md, 106 rows, clean |
| brain graph | `node scripts/brain-graph.mjs --check` | **0** — 107 notes, 393 links, fresh |
| scoring receipt | `node scripts/check-scoring-receipt.mjs main..HEAD` | **0** — *"no scoring-path files changed"* |
| p0-flow ×8 | `npm run verify:p0-flow` | **0** ×8 (table above) |
| ui-polish | `npm run verify:ui-polish` | **0** — 27/27 |
| surfaces | `npm run verify:surfaces` | **0** — 248/248, peak 124/60 s vs ceiling 1200 |
| full suite | `npm test` | **0** — 13645 tests, 13553 pass, **0 fail**, 91 skipped |

Both browser gates that share `browser-verify.mjs` were run because this lane
edits that helper.

---

## 7. What I left undone

- **The Vite dep-optimizer failure (before-run 5) is not fixed.** It is a
  different defect in the same gate: the smoke gate serves the app through
  Vite dev middleware, so a shared `node_modules/.vite` (unavoidable while
  lanes symlink `node_modules`, as the brief instructs) can 504 mid-run and
  the failure surfaces as a missing "Try sample coverage" button plus three
  genuine console errors. It did not recur in the 8 after-runs. Fixing it
  properly means either booting the gate with `NODE_ENV=production` against
  `dist/` (a real change in what the gate certifies — the brief's premise that
  this gate "drives the production build" is currently **not true**) or giving
  each worktree its own `VITE_CACHE_DIR`. Both are out of this lane's scope
  and should be decided deliberately.
- **The round-3 reviewer's non-blocking scanner escape is still open.** A bare
  verdict poll with `const t = document.body.innerText;` hoisted one line above
  the regex is still not caught by `bareVerdictPolls`. My new scanner does not
  have the same escape (it walks the whole `.route(` call, not one line), but I
  did not close theirs.
- **No product test was added**, because the evidence says there is no product
  defect to guard. The equivalent guarantee is §4's two regressed trees, which
  show the gate now fails deterministically on a product tree that loses
  either clause of the disabled logic.

---

## Tip and origin

```
$ git log --oneline -1
42f510ee fix(gates): hold the doctor run in flight — verify:p0-flow's earliest-instant race, at the cause

$ git rev-parse HEAD
42f510eed3190fc6b411fc0da9383b6cfbe89791

$ git ls-remote origin lane/p0-flow-race
42f510eed3190fc6b411fc0da9383b6cfbe89791	refs/heads/lane/p0-flow-race

$ git status --short
(clean)
```

origin == local tip.

**Base note.** This lane branched from `main` `a3e6e688` as briefed. `main` has
since advanced to `d8bb5088` with **docs-only** commits (other lanes' audit
reports); nothing in that range touches `scripts/` or `tests/`, so this branch
needs no rebase and cannot conflict — `check-scoring-receipt.mjs main..HEAD`
was run against the advanced `main` and still reports "no scoring-path files
changed".
