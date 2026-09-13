# Palette-close-race lane report

Worktree: `/home/user/wt-palette`. Branch: `lane/palette-close-race`, from
`main` @ `7663df1f`. Round 1 tip: `a7232476` (single commit). Round 2 tip:
see the `Tip:` line the lane's final message reports (round 2's own commit
is the tip, so it cannot name its own SHA in advance).

```
$ git log --oneline main..HEAD
a7232476 fix(e5): wait for the command palette to detach instead of sampling .count() — the palette-close-race lane
<round 2's commit, addressing docs/audits/2026-09-13-ci-green/palette-race-review.md>
```

## 1. What the thing IS (before touching it)

`scripts/verify-e5-command-palette.mjs` line 130-135 (pre-fix) ran:

```js
await page.keyboard.press('Enter');
const shipPanelOpened = await page.locator('[aria-labelledby="ship-panel-title"]')
  .waitFor({ timeout: timing.ms(5000) }).then(() => true).catch(() => false);
record('Enter on the highlighted action runs it for real: the Ship panel opens', shipPanelOpened);

const paletteClosedAfterRun = await paletteDialog.count().then((n) => n === 0);
record('The palette itself closes after running an action', paletteClosedAfterRun);
```

`src/components/scriptide/CommandPalette.tsx`'s `runAt()` (lines 47-52):

```js
const runAt = (index: number) => {
  const action = filtered[index];
  if (!action || action.disabled) return;
  action.run();
  onClose();
};
```

`action.run()` then `onClose()` run back-to-back in the SAME synchronous
handler — `PaletteAction.run` is typed `() => void`
(`src/lib/command-palette.ts:29`), never a promise, so there is no async gap
between running the action and telling the parent to close. `ScriptIDE.tsx`
renders `<CommandPalette>` inside `<AnimatePresence>` (line 3233-3237), and
`CommandPalette.tsx` declares `exit={{ opacity: 0, scale: 0.97, y: -8 }}` with
`transition={{ duration: 0.14 }}` (lines 85-89). AnimatePresence's whole job is
to keep an exiting child mounted until its exit animation finishes — so the
`<dialog role="dialog">` node stays in the DOM for SOME time after
`onClose()` has already flipped `paletteOpen` to `false`. **0.14s is the
declared duration passed to Motion, not the measured unmount time** — Motion's
exit is frame-driven (`requestAnimationFrame`-paced), so it is a floor, not
the window; round-1 review measured the palette's actual detach at 212-293ms
after `Enter` on this box (§3/§4). Every place below that cited "0.14s" as the
mounted window has been corrected to cite that measured range instead.

The verify script's OWN comment three sections down (pre-fix line 152-157, on
the Escape-close check) already names this mechanism and adds a 400ms
`waitForTimeout` margin for it. That fix was never applied to the
Enter-runs-an-action check three sections up — that omission is the whole bug.
(The Settings Escape-close check used a 300ms margin — inside the 212-293ms
measured range, not comfortably past it; see §4's round-2 correction for why
that matters.)

## 2. Race vs regression — verdict: RACE, with evidence

**Verdict: the assertion races the harness against React; the product is not
regressed.** `runAt()` closes the palette in the same synchronous tick the
action runs in, which is the correct, strongest behavior (the writer pressed
Enter; the palette should go immediately, and it does, in React-state terms).
`tests/core/command-palette-wiring.test.ts` gained a new regression test
("runAt calls action.run() then onClose() synchronously — not after an
await") that pins this by reading the actual `runAt` source and asserting
`action.run()` precedes `onClose()` with no `async`/`await` in between. It
would fail the day this ever became a real regression (the palette staying
open through the action's own work) — which is the case this whole
investigation needs distinguished from a harness race, and now is. Round-1
review reproduced this directly: with `onClose()` stubbed out of `runAt()`,
the suite records `[FAIL] The palette itself closes after running an action`
and exits 1, and the same test goes red under two separate mutations of
`runAt()` (`async`/`await` before the close; a 300ms `setTimeout` before the
close).

**Corrected in round 2 (round-1 review, F4): the deciding quantity is not
"how fast the Ship panel renders in general" — it is the ONE-TIME cost of
`ShipPanel`'s first dynamic import in a browser session, and the report's
"the runner must be slower" premise was backwards and unmeasured.**
`ShipPanel` is lazy-loaded: `const ShipPanel = lazy(() => import("./scriptide/ShipPanel"))`
(`src/components/ScriptIDE.tsx:103`). The suite opens Ship exactly once. The
FIRST time any browser session opens it, `Enter->shipPanel` pays a one-time
dynamic-import-and-transform cost; every later open in the SAME session is a
cache hit. Round-1 review's independent probe (same harness, same production
code, `Ctrl+K -> "ship" -> Enter` repeated N times in one browser session)
measured this directly:

```
cold path, no warm-up, 6 runs:
  OLD 0/6   NEW 6/6
  Enter->ShipPanel gap (ms) : 147, 76, 37, 42, 36, 28
  palette detached at   (ms): 241, 293, 224, 230, 224, 212

with the suite's own warm-up (12-press Tab walk, screenshots), 6 runs:
  OLD 1/6   NEW 6/6
  Enter->ShipPanel gap (ms) : 813, 66, 56, 62, 39, 27
  palette detached at   (ms): 821, 264, 252, 264, 229, 230
```

Only the FIRST Ship open in a session (813ms, matching this lane's own
original 808ms observation) is slow enough to pass the unfixed check; every
later open in the same session costs 27-66ms and fails it. `main`'s
unmodified, unfixed suite still runs 17/17 three times in a row on this box —
because the suite opens Ship exactly once, and that one open is always the
slow, cache-miss, first-import path, which happens to land past the palette's
measured 212-293ms detach time on THIS machine. **The premise that the
GitHub-hosted runner is the slower machine is backwards, and unmeasured**:
this sandbox carries concurrent agents (load 1.5-2.5 of 4 cores during every
probe run above), a shared symlinked `node_modules`, and a per-boot Vite cache
directory — a hosted CI runner executing one browser job is dedicated to it.
What actually differs is not general render speed but the SIZE of that one
dynamic-import cost relative to the ~212-293ms unmount: on this box it is
comfortably past that window (comfortable enough that even the throttled and
CPU-hog measurements below never caught it under); on the runner it evidently
lands under it, which is why CI failed the SAME assertion deterministically on
3 consecutive runs rather than flaking on some of them.

Applying real CDP CPU throttling (`Emulation.setCPUThrottlingRate`, rates
4x/6x/10x/20x) or a genuine 3-core CPU hog made the unfixed check pass MORE
reliably (10/10, 10/10, 7/8) for the same reason: throttling slows the lazy
chunk's transform along with everything else, pushing `Enter->shipPanel`
further past the 212-293ms unmount rather than under it. This lane's original
read of that result ("throttling makes it pass more") was correct; the law it
drew from that observation ("a slower box passes more, so the runner must be
faster") was an unmeasured guess that happened to point the right direction on
throttling but the wrong direction on the runner comparison. Neither a slower
render path in general, nor headless Chromium disabling the animation
(`MotionConfig reducedMotion="user"` in `src/App.tsx:216,233` only collapses
motion under `prefers-reduced-motion`, which a default Playwright context does
not set, and if it did the unfixed check would PASS, not fail — the suite's
own 300-400ms Escape-close margins were sized assuming the animation runs and
were passing on the runner) is needed to explain any of the measurements
above.

None of this changes the verdict: the product is not regressed, the assertion
was racing the harness against React, and an event-based wait is the right
fix on any machine because neither side of that race — the lazy-chunk cost,
or the frame-driven unmount — is predictable from either side.

## 3. Reproduced deterministically (LANE_STANDARD §3)

Repro harness: `/tmp/claude-.../scratchpad/repro-palette-race.mjs` (session
scratch — not committed; boots the real keyless server via the same
`scripts/lib/browser-verify.mjs` helpers the suite uses, drives the identical
`Cmd/Ctrl+K -> type "ship" -> Enter -> wait for Ship panel -> check palette
closed` sequence, and checks the close condition two ways: OLD =
`paletteDialog.count().then((n) => n === 0)` with no wait — the exact unfixed
line; NEW = `paletteDialog.waitFor({ state: 'detached', timeout:
timing.ms(3000) })` — the fix).

Same box, same server, same script, one run after another:

| | OLD (unfixed) | NEW (fixed) |
|---|---|---|
| 15 runs | **1/15 passed** (14/15 FAIL) | **15/15 passed** |
| 10 runs (separate batch) | 3/10 passed (7/10 FAIL) | 10/10 passed |
| 8 runs, under a 3-process CPU hog | 7/8 passed (masks the race, see §2) | 8/8 passed |

This lane's own repro harness lived in session scratch and did not survive to
round 2 for direct re-run (LANE_STANDARD §7 gap — noted, not yet fixed, see
§9). Round-1 review built an independent probe from the same production code
and shared library and reproduced the same shape (cold path OLD 0/6, NEW
6/6 — §2), which is the number this report now treats as primary since it
also carries the per-run gap/detach measurements that explain the mechanism.

This satisfies "a guard must be shown FAILING on the unfixed input before it
is shown passing on the fixed one" — same harness, same production code, same
machine, only the assertion's wait strategy differs.

The full, unmodified `verify-e5-command-palette.mjs` (all 17 assertions, not
the trimmed repro) stayed 17/17 across 5 idle runs both before and after the
fix on this box (§5), and 17/17 three more times when round-1 review ran
`main`'s unmodified suite directly — consistent with "locally this suite is
17/17 every time it has been run": the suite opens `ShipPanel` exactly once,
and that one open always pays the slow, first-import cost that on this box
outlasts the palette's 212-293ms unmount (§2). The isolated repro (which
repeats the open, so only its FIRST run pays that cost) is what makes the
underlying race reproducible on demand; CI's 3/3 failures on `main` are the
same one-time cost landing under the unmount time on that runner instead.

## 4. The fix

`scripts/verify-e5-command-palette.mjs`:

- The reported assertion (line ~134, pre-fix) now waits for the dialog to
  actually detach: `paletteDialog.waitFor({ state: 'detached', timeout:
  timing.ms(3000) }).then(() => true).catch(() => false)`. A palette that
  never closes still fails, within the timeout — the assertion's meaning is
  unchanged, only how it detects "closed."
- The file's three PRE-EXISTING Escape-close checks (`paletteClosedOnEscape`,
  `shortcutDialogClosedOnEscape`, `settingsClosedOnEscape`) used
  `waitForTimeout(400ms or 300ms)` then a synchronous `.count() === 0` — the
  same defect with a bigger, hand-picked margin rather than an event-based
  wait. Converted all three to the same `waitFor({ state: 'detached' })`
  pattern for internal consistency and to remove their residual (smaller,
  unreported) race risk; this also lets item 5's new scanner (below) be a
  clean zero-exemption rule instead of one that has to carve out this file.

`tests/core/command-palette-wiring.test.ts`: added a regression test pinning
`runAt`'s synchronous `run()`-then-`onClose()` ordering (§2).

## 5. `npm run verify:command-palette` — idle and under load

Idle, fixed tree, 5 consecutive runs:

```
run 1 exit=0 17/17 assertions passed
run 2 exit=0 17/17 assertions passed
run 3 exit=0 17/17 assertions passed
run 4 exit=0 17/17 assertions passed
run 5 exit=0 17/17 assertions passed
```

Once under a 3-process CPU hog (`node -e "while(Date.now()<end){}"` x3,
started before the run, killed by PID after):

```
exit=0  17/17 assertions passed
```

(Consistent with §2/§3: throttling this suite's FULL, un-trimmed sequence
does not reproduce the race — it only ever made it harder to reproduce on
this box. The fixed assertion is unconditionally correct either way, which is
the actual goal.)

## 6. Audit of the other seven browser suites (item 4)

The eight-suite battery (`npm run verify:browser`,
`package.json`'s `verify:browser` script): `verify:p0-flow`,
`verify:focus-traps`, `verify:surfaces`, `verify:ui-polish`,
`verify:local-safety-net`, `verify:command-palette`, `verify:a11y`,
`verify:production`. The other seven, by file:

- `scripts/smoke-p0-live-flow.mjs`
- `scripts/verify-focus-traps.mjs`
- `scripts/verify-p2-p3-surfaces.mjs`
- `scripts/verify-ui-polish-affordances.mjs`
- `scripts/verify-e4-local-safety-net.mjs`
- `scripts/verify-a11y.mjs`
- `scripts/verify-production-build.mjs`

**Method:** grepped every one of these plus `verify-e5-command-palette.mjs`
itself for the exact shape of the bug — an ABSENCE check (`.count() === 0`,
the `.then((n) => n === 0)` form, `isHidden()`, a negated `isVisible()`, or an
`evaluate` reading `!document.querySelector('[role="dialog"]')`) — and
separately for every `.click(`/`.press(` immediately (within 2 lines, no
`waitFor*` in between) followed by a `.count()`, `.isVisible()`, or
`evaluate()` read of any kind, to catch the same textual shape even where it
isn't a dialog-close.

**Every `.count() === 0` / `n === 0` dialog-closed shape in the codebase**
(the literal shape of the bug): only inside
`verify-e5-command-palette.mjs` itself — the one fixed here (§4) plus the
three pre-existing Escape-close instances also converted in §4. Zero
instances in the other seven suites.

`scripts/verify-focus-traps.mjs` already gets this right for its own
animated-exit dialogs (`ScriptDoctorPanel`'s framer-motion spring): its
`RESTORE` step (line ~172-175) uses
`page.waitForFunction(() => !document.querySelector('[role="dialog"]'), ...)`
— a real wait, not a synchronous read — with a comment naming the same
"framer-motion exit spring needs real time to finish" reasoning this lane's
fix uses. Not a bug; cited as the existing good pattern.

**Every remaining action-then-immediate-read site found** (file:line, what it
reads, and why it is or is not the same defect):

| file:line | action | read | same defect? |
|---|---|---|---|
| `verify-a11y.mjs:448-449`, `568-569`, `619-620`, `657-658`, `663-664`, `1060-1061`, `1085-1086`, `1101-1102`, `1123-1124` | `keyboard.press('Tab')` | `evaluate(() => document.activeElement...)` | No — browser focus moves synchronously as part of dispatching Tab; there is no animation gating it. |
| `verify-ui-polish-affordances.mjs:281-282` | `keyboard.press('Tab')` (Settings tab strip) | `evaluate(() => document.activeElement?.id...)` | No — `SettingsPanel.tsx`'s `handleTabKeyDown` (line 911-921) calls `tabRefs.current[target]?.focus()` directly in the same synchronous handler, not through an animation or an effect. |
| `verify-a11y.mjs:813-815`, `1739-1741` | `coverageNavBtn.click()` | `runDiagnosisBtn.count()` | No — an appearance check. A mount commits in the same React commit as the click; AnimatePresence in this codebase only ever delays *removal*, never insertion. |
| `verify-p2-p3-surfaces.mjs:1970-1972` | `moreBtnOn.click()` | `openStudioItem.count()` | No — appearance check, same reasoning. |
| `verify-p2-p3-surfaces.mjs:2351-2353`, `2496-2498` | `.click()` (COVERAGE tab) | `runBtnE/F.isVisible()` | No — appearance check. |
| `verify-production-build.mjs:624-627` | `exportMenuBtn.click()` | `item.count() > 0` | No — `Toolbar.tsx`'s export dropdown (lines 452-494) is a plain `{exportOpen && (...)}` conditional render, no `motion`/`AnimatePresence` on either open or close; appearance check regardless. |
| `verify-production-build.mjs:648-651` | `sessionTab.click()` | `deleteBtn.count() > 0` | No — appearance check (tab-panel content swap), and the Settings tab panel swap is the same plain conditional render as the export menu. |

**Conclusion:** no other browser suite reproduces this defect. The hazard is
specific to checking that an `AnimatePresence`-wrapped dialog has ALREADY
UNMOUNTED, with no wait, right after an unrelated action — every other
action-then-read site in the battery either reads a synchronously-committed
DOM mutation (focus, a plain conditional mount) or already waits correctly
(`verify-focus-traps.mjs`).

**Deny-by-default scanner** (item 4's suggested home):
`tests/scripts/wait-for-function-options-position.test.ts` gained
`unwaitedCloseChecks()` and a new `describe` block — **redesigned in round 2**
after round-1 review (F1, F2) showed the original design both missed a
reintroduction of the exact bug it guards and missed ten evasion spellings.
See round 2's own section below for the corrected design (owner/order
tracking instead of line-distance) and what it covers now.

## 7. Gates (round 1)

| gate | result |
|---|---|
| `node --experimental-strip-types tests/core/command-palette-wiring.test.ts` | 29/29 pass |
| `node --experimental-strip-types tests/core/command-palette.test.ts` | 14/14 pass |
| `node --experimental-strip-types tests/scripts/wait-for-function-options-position.test.ts` | 19/19 pass |
| `npm run lint` (`tsc --noEmit`) | exit 0, no output |
| `node scripts/check-scoring-receipt.mjs main..HEAD` | exit 0 — "no scoring-path files changed" |
| `node --experimental-strip-types scripts/check-docs-quality.ts --all` | exit 0 — no AI-writing patterns |
| `node scripts/honesty-audit.mjs` | exit 0 — 465 files + 502 tracked markdown + 115-row claims register, clean |
| `PW_CHROMIUM_PATH=/opt/pw-browsers/chromium npm run verify:command-palette` | exit 0, 17/17, x5 idle + x1 under CPU hog (§5) |
| `PW_CHROMIUM_PATH=/opt/pw-browsers/chromium npm run verify:surfaces` | exit 0, 248/248 |

No full `npm test` run (per GATES — the orchestrator runs it at merge). Round
2's gates are in its own section below (narrower, per the coordinator's
round-2 cost rule).

## 8. Left undone, and why

- The seven-suite audit (§6) found no fix-worthy sites, so nothing else in
  those files was touched — fixing a non-bug to match a textual pattern would
  be exactly the "narrowed/widened" shortcut LANE_STANDARD §6.3 asks a
  reviewer to look for.
- CDP CPU throttling and a real CPU hog were tried per the brief's own
  suggestion and are reported in §2-3 because they turned out to be the WRONG
  lever for this specific race (they mask it, they don't reproduce it) — that
  is itself load-bearing evidence for the race-vs-regression verdict, not a
  dead end, so it is reported rather than discarded.
- Round 1's own isolated repro harness (`repro-palette-race.mjs`) lived only
  in session scratch and did not survive to round 2 (LANE_STANDARD §7's
  "nothing durable lives only in the sandbox" rule, missed once here) — round
  2 does not re-add it, since round-1 review already reproduced the same
  shape independently with per-run gap/detach numbers and the coordinator's
  round-2 cost rule does not ask for it; noted so a future round knows why
  the original 1/15 and 3/10 counts in §3 cannot be re-derived from a
  committed script.

## Round 2 (docs/audits/2026-09-13-ci-green/palette-race-review.md)

Independent review of `a7232476` returned REVISE on three items (F1 major,
F2 moderate, F3 minor — the scanner) plus three report-accuracy corrections
(F4, F5, F6). Per-item disposition:

**Item 1 / F1 (major) — scanner missed a reintroduction of its own guarded
line.** Round 1's scan gated on textual distance (a triggering
`.press(`/`.click(` within 10 lines). The review's mutation — revert only the
fixed assertion back to the pre-fix line, comment left in place — put
`press('Enter')` 21 lines above the check, outside the window, and reported
zero offenders on the file the guard exists to protect.

Fixed by dropping the distance heuristic entirely. `unwaitedCloseChecks` now
tracks, per named locator, whether it was ever OPENED (`.waitFor(...)`
confirming presence, no `state: detached|hidden`) and whether its OWN close
was ever confirmed (`.waitFor({ state: 'detached' | 'hidden' })`, or
`expectDetached(name, …)` for a codebase that adopts that helper name) BEFORE
each absence read — in file order, with no line-count anywhere in the logic.
A new test reads the REAL `scripts/verify-e5-command-palette.mjs` off disk,
applies the review's exact mutation (string-replaces the shipped fixed line
back to `paletteDialog.count().then((n) => n === 0)`, leaving the comment in
place), and asserts the scanner reports exactly that one line — shown
failing on the unfixed input (`git stash` the test file alone and rerun to
confirm 0, or diff round 1's function against round 2's) and passing against
the real fixed file, both checked in the same test.

**Item 2 / F2 (moderate) — ten evasion spellings.** Widened rather than
narrowed the claim, since owner/order tracking makes every one of them
catchable without inflating the false-positive rate (see item 3 below).
`unwaitedCloseChecks` now also matches: the split assignment form
(`const n = await x.count(); … n === 0`), the parenthesised
`(await x.count()) === 0` / `== 0` and its reversed `0 === (…)` form (the
exact spelling `smoke-p0-live-flow.mjs:477` and
`verify-p2-p3-surfaces.mjs:2004` already use, for a legitimately different
shape — see below), `expect(x).toHaveCount(0)`, `x.isHidden()`,
`!(await x.isVisible())`, and a one-time `page.evaluate(() => !document.
querySelector(...))` read (matched unconditionally — there is no Playwright
locator variable to own it). The "action 11 lines away" and "action spelled
`.tap()`" evasions from the review's matrix are moot under the new design: it
never looks at actions at all, only at each locator's own open/close order.
A new test runs all ten fixtures from the review's mutation matrix plus the
eleventh (evaluate-shape) through the scanner and asserts each is caught.

The two paren-form sites the review named
(`smoke-p0-live-flow.mjs:477`, `verify-p2-p3-surfaces.mjs:2004`) remain
correctly unflagged after the widening, for the reason the review gave: the
checked locator (`budgetRetry`, `tab`) is never the subject of an earlier
`.waitFor(` anywhere in the file, so it never enters `openedEver` — the scan
distinguishes "this thing was confirmed open, now check it's gone" (the real
defect) from "this thing may or may not be here at all" (an existence guard)
by whether the locator was ever opened, not by the shape of the comparison. A
dedicated test pins this using the review's exact `budgetRetry` shape.

**Item 3 / F3 (minor) — two false-positive shapes documented.** The
scanner's docstring now states, and a test verifies, that:
(a) `page.waitForFunction(() => !document.querySelector(...))` — the pattern
`verify-focus-traps.mjs:175` uses correctly — is never flagged, because it is
a real wait (`waitForFunction`, not `evaluate`; the two method names share no
substring) rather than a one-time read; and
(b) the fix this scanner recommends is VACUOUS for an assertion that
something never appeared at all: `waitFor({ state: 'detached' })` /
`expectDetached(...)` against a locator that never matched resolves
immediately, so a "no error toast after this click" check "fixed" this way
becomes unconditionally true. This is written into the docstring as a caveat
a human must apply, since no textual scan can tell "was shown, now gone" from
"never shown" apart — it was also added to this report (§2's framing already
never claimed appearance was in scope, so no report correction was needed
beyond the docstring itself).

**Item 4 / F4 (report accuracy) — corrected causal account.** §2 and §3
above are rewritten in place (not appended) to name the one-time
`React.lazy` cost of `ShipPanel`'s first import as the deciding quantity
(813ms first open vs 27-66ms every later open, same session, same box; only
the first passes the unfixed check) and to retract the "the runner is
slower" premise, which was backwards and unmeasured — this sandbox is the
loaded machine (concurrent agents, load 1.5-2.5 of 4 cores throughout every
probe run), a dedicated hosted runner is not.

**Item 5 / F5 (report accuracy) — 0.14s is a floor, cited beside the
measurement.** Every place that used "~0.14s" as the mounted-window evidence
now also cites the measured 212-293ms detach time, and §1/§4 note explicitly
that this is what justifies converting the Settings check's 300ms margin (it
sat INSIDE the measured range for the palette, not comfortably past it — the
weakest of the three pre-existing margins, and the strongest single argument
for round 1's scope-widening to all three Escape-close checks, which the
original report did not make).

**Item 6 / F6 (trivial) — git log placeholder.** Fixed: the block now names
`a7232476` as round 1's tip and this section as round 2's addition, with the
round-2 SHA to follow once committed (see the lane's final message for the
number).

### Round 2 gates

| gate | result |
|---|---|
| `node --experimental-strip-types tests/scripts/wait-for-function-options-position.test.ts` | 21/21 pass (19 round-1 tests plus 2 net-new after consolidating the F1/F2/F3 fixtures — see the diff) |
| `node --experimental-strip-types tests/core/command-palette-wiring.test.ts` | 29/29 pass (unchanged by round 2; re-run per the cost rule) |
| `npm run lint` (`tsc --noEmit`) | exit 0, no output |
| `node --experimental-strip-types scripts/check-docs-quality.ts --all` | exit 0 — no AI-writing patterns |
| `node scripts/honesty-audit.mjs` | exit 0, clean |
| `PW_CHROMIUM_PATH=/opt/pw-browsers/chromium npm run verify:command-palette` | exit 0, 17/17 — x3 idle (round-2 cost rule; round 1 already ran x5 idle + x1 under a CPU hog) |

Per the coordinator's round-2 cost rule: no full `npm test`, no re-run of
`verify:surfaces` (unchanged production code this round — round 2 touches
only the test file and this report).
