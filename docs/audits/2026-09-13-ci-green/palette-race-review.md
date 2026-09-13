# Palette-close-race lane — independent review, round 1

Reviewed object: `lane/palette-close-race` @ **`a7232476`** (single commit),
base `main` @ `7663df1f`. Worktree `/home/user/wt-palette`. Reviewer did not
build this lane. Procedure: `docs/LANE_STANDARD.md` §6. Repro paths below are
written as `<session scratch>`.

Diff under review: `git diff 7663df1f..a7232476` — 7 files, +501/-11
(`scripts/verify-e5-command-palette.mjs`,
`tests/core/command-palette-wiring.test.ts`,
`tests/scripts/wait-for-function-options-position.test.ts`, the lane report,
one brain note, and the two regenerated brain-graph files).

## 1. Brief items against the diff

| # | brief item | disposition | evidence |
|---|---|---|---|
| 1 | race vs regression, with evidence | **done, and the verdict is right — but the causal account is incomplete** (finding F4) | `runAt()` (CommandPalette.tsx:47-52) calls `action.run()` then `onClose()` in one synchronous handler; `ScriptIDE.tsx:3233-3237` renders the palette inside `<AnimatePresence>`; `CommandPalette.tsx:85-89` declares `exit={…}` with `transition={{ duration: 0.14 }}`. All four citations in the report check out verbatim. Independently reproduced below: the unfixed read fails 0/6 on an isolated path, passes on the full suite. |
| 2 | fix at the cause, through `timing.ms()`, meaning kept | **done** | The reported assertion becomes `paletteDialog.waitFor({ state: 'detached', timeout: timing.ms(3000) })`. Meaning is preserved and the guard still bites: with `onClose()` stubbed out, the suite records `[FAIL] The palette itself closes after running an action` and exits 1 (§3 below). Three pre-existing Escape-close checks converted from `waitForTimeout(400/300)` + synchronous `.count()` to the same wait — justified, see F5. |
| 3 | deterministic reproduction before the fix | **done by the lane, re-derived here independently** | The lane's repro harness lived in session scratch and is gone; its 1/15 and 3/10 numbers cannot be re-derived by anyone. This review built its own probe and got the same shape: OLD 0/6, NEW 6/6 (§3). Claim stands on re-measurement, not on the record. |
| 4 | audit the other seven suites; fix state-transition reads; consider a scanner | **audit done and accurate; scanner shipped but under-scoped against its own claim** (F1, F2, F3) | Independent grep of `scripts/*.mjs` + `scripts/lib/*.mjs` for every absence shape the report names found no second instance of the defect. The two `(await x.count()) === 0` sites the report does not mention (`smoke-p0-live-flow.mjs:477`, `verify-p2-p3-surfaces.mjs:2004`) are skip-if-absent guards, not post-action close assertions — correctly out of scope, and both invisible to the new scanner (F2). |
| 5 | 5 idle runs + 1 under throttle | **done by the lane; one idle run reproduced here** | §3. |
| a | is the race explanation right; reconcile the runner's 3-of-3 | **mechanism right, reconciliation wrong** — see F4 and §4 | |
| b | does the fixed assertion still fail on a palette that never closes | **yes, driven** | §3 |
| c | scanner: evadable? false positives? is 10 lines justified? | **evadable (0/10 mutations caught), three false-positive shapes, and 10 lines is already too small for the file it guards** | F1, F2, F3 |
| d | judged-safe sites `surfaces:1970` and `production:624` | **both judgments confirmed correct** | §5 |
| e | the brain note's body on this lane | recorded for the union | §6 |

## 2. Gates and numbers reproduced (LANE_STANDARD §6.2)

All on this worktree at `a7232476`, `PW_CHROMIUM_PATH=/opt/pw-browsers/chromium`,
machine load 1.5-2.5 on 4 cores (other agents live on this box throughout).

| command | reported | reproduced |
|---|---|---|
| `npm run verify:command-palette` | exit 0, 17/17 | **exit 0, 17/17** |
| `node --experimental-strip-types tests/scripts/wait-for-function-options-position.test.ts` | 19/19 | **19/19, 4 suites, 0 fail** |
| `node --experimental-strip-types tests/core/command-palette-wiring.test.ts` | 29/29 | **29/29, 8 suites, 0 fail** |
| scanner vs `main`'s `verify-e5-command-palette.mjs` | "exactly the 4 offenders" | **4 — lines 134, 158, 178, 209**; against the fixed tree, 0 |
| `npm run check-brain` | not reported | OK, 114 notes, 445 links, fresh |
| `tests/core/brain-coverage.test.ts` | not reported | 7/7 |

### Fail-first, driven (LANE_STANDARD §3)

**The fixed assertion on a palette that never closes.** `onClose()` commented
out of `runAt()` in a scratch edit of `CommandPalette.tsx`, suite run once:

```
[PASS] Enter on the highlighted action runs it for real: the Ship panel opens
[FAIL] The palette itself closes after running an action
EXIT=1
```

The run then aborts at `scripts/verify-e5-command-palette.mjs:160` — the
still-mounted `z-[300]` palette overlay intercepts the "Close ship panel"
click, which is what a genuinely stuck modal does. The assertion is real, it
costs its 3 s timeout and no more, and the file was restored (`git status`
clean) before any other step.

**The wiring guard fails first on both regressions it claims to catch.** Two
scratch mutations of `runAt()`, test run after each:

| mutation | result |
|---|---|
| `const runAt = async (…)` with `await action.run();` | `not ok 6 — runAt calls action.run() then onClose() synchronously` (28 pass / 1 fail) |
| `action.run(); setTimeout(() => onClose(), 300);` | same test red (28 pass / 1 fail) |

## 3. The race, re-measured independently

Probe (`<session scratch>/timing-probe.mjs`): boots the same keyless server
through `scripts/lib/browser-verify.mjs`, drives the same
`Ctrl+K -> "ship" -> Enter` sequence N times in one browser session, and for
each run records the `Enter -> Ship-panel-visible` gap, the OLD check
(`paletteDialog.count().then((n) => n === 0)`, sampled the instant the Ship
panel appears) and the NEW check (`waitFor({ state: 'detached' })`), plus how
long after `Enter` the dialog actually leaves the DOM.

Cold path, no warm-up, 6 runs:

```
OLD 0/6   NEW 6/6
Enter->ShipPanel gap (ms) : 147, 76, 37, 42, 36, 28
palette detached at   (ms): 241, 293, 224, 230, 224, 212
```

With the suite's own warm-up (12-press Tab walk, screenshots before `Enter`),
6 runs:

```
OLD 1/6   NEW 6/6
Enter->ShipPanel gap (ms) : 813, 66, 56, 62, 39, 27
palette detached at   (ms): 821, 264, 252, 264, 229, 230
```

And `main`'s unmodified, unfixed suite, run three times on this box: **17/17,
17/17, 17/17** — the reported assertion PASSES every time.

Those three results together settle the mechanism and correct the report's
explanation of it. The only run that passes the unfixed check is the **first**
Ship open in a browser session (813 ms, matching the lane's own 808 ms
observation); every later open in the same session costs 27-66 ms and fails it.
`ShipPanel` is `lazy(() => import("./scriptide/ShipPanel"))`
(`src/components/ScriptIDE.tsx:103`), so the first open pays a one-time
dynamic-import and dev-server transform, and the suite opens Ship exactly once.
That one-time cost, not "a fast render path" in general, is the quantity the
0.14 s exit animation is racing.

## 4. Reconciling the runner's 3-of-3 (check a)

The lane's law — "the race fires when the Ship panel renders faster than the
140 ms animation, so a slower box passes more" — rests on an unstated premise
that the GitHub runner is the slower machine. That premise is backwards and
was never measured. This sandbox is the loaded machine: it carries concurrent
agents (load 1.5-2.5 of 4 cores during every run above), a shared symlinked
`node_modules`, and a per-boot Vite cache directory. A hosted runner executing
the browser job is dedicated to it.

No exotic explanation is needed, and the two offered in the brief are not
supported: headless Chromium does not disable the animation here (the suite's
own Escape-close margins of 300-400 ms were sized for it and were passing on
the runner), and `MotionConfig reducedMotion="user"` (`src/App.tsx:216,233`)
only collapses animation under `prefers-reduced-motion`, which a default
Playwright context does not set — and if it did, the unfixed check would pass,
not fail. What actually differs is the size of the one-time `ShipPanel` chunk
cost relative to the unmount:

- on this box that cost is ~800 ms, comfortably past the ~210-290 ms it takes
  the palette to leave the DOM, so the unfixed read lands after the unmount and
  the suite is 17/17;
- on the runner it evidently lands under that unmount time — a faster
  transform/IO path for one dynamic import is enough — so the read lands
  mid-animation and the assertion is red 3-of-3, deterministically rather than
  flakily, which is exactly the pattern CI showed.

CPU throttling masks the race for the same reason: it slows the lazy
transform along with everything else, pushing the gap back past the
frame-driven unmount. The lane read that result correctly ("throttling makes
it pass more") but drew the wrong law from it. Two measurements the report
should carry instead of the current narrative: the deciding quantity is the
first Ship open's lazy-chunk cost, and the mounted window is not 140 ms —
measured detach is 212-293 ms after `Enter` (motion's exit is frame-driven, so
0.14 s is a floor, not the window).

None of this touches the verdict. The product is not regressed, the
assertion was racing the harness against React, and an event-based wait is the
right fix on any machine because neither side of that race is predictable.

## 5. The two judged-safe sites (check d)

Both confirmed, from the source rather than from the pattern:

- **`verify-p2-p3-surfaces.mjs:1970`** — `moreBtnOn.click()` then
  `openStudioItem.count()`. `src/components/scriptide/Toolbar.tsx` imports no
  `motion` and no `AnimatePresence` at all (grep: zero hits); the overflow menu
  is a plain `{overflowOpen && (…)}` conditional at line 537. A mount commits
  with the discrete click event, and this is an appearance check regardless.
  The preceding "Close ship panel" click plus a fixed 200 ms wait is safe for a
  different reason worth recording: Playwright's click auto-waits for
  actionability, so a still-animating Ship overlay delays the click instead of
  producing a wrong read.
- **`verify-production-build.mjs:624`** — `exportMenuBtn.click()` then
  `item.count() > 0`. `Toolbar.tsx:471-494` is `{exportOpen && (…)}`, and each
  menu item's own `onClick` calls `item.fn(); setExportOpen(false);`, so the
  loop's second and third iterations reopen a menu that closed synchronously.
  No animation on either edge. Correct as judged.

One adjacent note, not this lane's scope and not a defect: the pattern the
report holds up as exemplary, `verify-focus-traps.mjs:175`, ends in
`.catch(() => {})`, so if the dialog never unmounts the wait passes silently.
It degrades into a real failure at the following `activeElement` assertion
rather than a false pass, so it is safe today.

## 6. The brain note (check e), for the orchestrator's union

`docs/brain/Audits/Audit - 2026-09-13 CI Green.md` on this branch is 29 lines:
frontmatter `type: audit`, `updated: 2026-09-13`, `status: active`, with
`sources: [docs/audits/2026-09-13-ci-green/palette-race-lane-report.md]` — one
source only. Body: a directory blurb ("reports from the lanes opened by the
first day CI ran for this repository since 2026-09-02, each investigating one
red assertion on `main`") followed by one paragraph on
**palette-race-lane-report.md** — the three red runs, the harness-race verdict,
`runAt()` vs `AnimatePresence`, the 14/15-fail / 15/15-pass reproduction, the
`waitFor({ state: 'detached' })` fix, and pointers to the seven-suite audit and
the new scanner.

To union three lanes' versions: the frontmatter `sources:` list is the union of
each lane's report path; the directory blurb is identical boilerplate to
de-duplicate; each lane contributes exactly one named paragraph. `GRAPH.md` and
`brain.graph.json` will conflict textually on every merge (each lane bumped the
same counters, 113 -> 114 notes and `audit (10)` -> `(11)`), so resolve those
two files by regenerating with `npm run brain` after the last merge rather than
by hand-merging hunks; `npm run check-brain` passes on this branch alone
(114 notes, 445 links).

## 7. Findings, by severity

### F1 — MAJOR. The new scanner does not catch a re-introduction of the very line it guards

The rule requires the triggering `.press(`/`.click(` within **10 lines** above
the check. On `main` that held (the four offenders sat 2-4 lines below their
action). In the tree this lane ships, the lane's own 20-line explanatory
comment sits between them: `keyboard.press('Enter')` is line 130 and the
assertion is line 151, a gap of 21.

Mutation, run against the shipped file: revert **only** the fixed assertion
back to `const paletteClosedAfterRun = await paletteDialog.count().then((n) => n === 0);`,
comment left in place — the exact regression this guard exists to prevent —

```
offenders reported: 0
```

The scanner's fail-first evidence is a three-line synthetic string and `main`'s
pre-comment file; neither reflects the file as shipped. By LANE_STANDARD §3 a
guard that cannot catch the bug in the tree it protects proves nothing. The
cheap fix is to count non-comment, non-blank code lines inside the window (or
scan to the top of the enclosing block), plus one fixture that mutates the
real file and asserts a hit.

### F2 — MODERATE. "Deny-by-default" overclaims; ten spellings of the same defect evade the regex

The report's §6 defines the bug shape as an absence check spelled
`.count() === 0`, `.then((n) => n === 0)`, `isHidden()`, a negated
`isVisible()`, or an `evaluate` reading `!document.querySelector(...)`. The
scanner sees only the first two. Mutation matrix, each an action followed by an
absence read with no detached wait:

| spelling | flagged |
|---|---|
| `await d.count().then((n) => n === 0)` (baseline) | yes |
| `const n = await d.count();` then `n === 0` | no |
| `(await d.count()) === 0` | no |
| `(await d.count()) == 0` | no |
| `0 === (await d.count())` | no |
| `await expect(d).toHaveCount(0)` | no |
| `await d.isHidden()` | no |
| `!(await d.isVisible())` | no |
| `await page.evaluate(() => !document.querySelector('[role="dialog"]'))` | no |
| action 11 lines above (F1) | no |
| action spelled `.tap()` / `.fill()` | no |

Zero of ten. The paren form is not hypothetical: `smoke-p0-live-flow.mjs:477`
and `verify-p2-p3-surfaces.mjs:2004` already spell count comparisons that way
(both legitimately out of scope, but it shows which spelling this codebase
reaches for). Either widen the shapes or state in the report and the docstring
that the rule covers two spellings of one shape — "deny-by-default" and "a
clean zero-exemption rule" as written are not true of what shipped.

### F3 — MINOR. Two known false-positive shapes are undocumented, and the prescribed fix is vacuous for one read

- A correct `page.waitForFunction(() => !document.querySelector('[role="dialog"]'))`
  followed by a count read is flagged, because the wait is not on that locator.
  That is the pattern `verify-focus-traps.mjs:175` uses and the report praises.
  The flag's message would then demand a redundant second wait.
- For an assertion that something never appeared at all ("no error toast after
  this click"), the prescribed fix inverts the test: `waitFor({ state:
  'detached' })` resolves immediately against a locator that never matched, so
  the check becomes unconditionally true. A future author following the
  message would land a test that cannot fail.
- Flagging `waitForTimeout(400)` + `.count()` is intended and documented, and
  is the right call; it is listed here only so the three are not confused.

One paragraph in the docstring covers all three.

### F4 — MINOR (report accuracy). The causal account names the wrong deciding quantity and an unmeasured premise

§2 and §3 attribute the failure to "a fast, lightly-loaded render path" and
reason from the runner being slower than this sandbox. Measured (§3, §4): the
deciding quantity is the one-time `React.lazy` chunk cost of the first Ship
open — 813 ms on the first open, 27-66 ms on every later open in the same
session, with only the first passing the unfixed check — and this sandbox is
the loaded machine, not the runner. The report is the durable record of this
investigation; as written it would send the next reader hunting for a slow
runner.

### F5 — MINOR (report accuracy). The 0.14 s window is a floor, not the measurement

Both the shipped comments and the report describe the dialog as staying
mounted "for the 0.14s exit animation" / "~0.14s of real wall-clock time".
Measured detach on this box is 212-293 ms after `Enter` (motion's exit is
frame-driven, so the declared duration is a lower bound). Worth correcting
where it stands as evidence, because it also retro-justifies converting the
Settings check's 300 ms margin, which was inside the measured range for the
palette rather than comfortably past it — the strongest argument for item 2's
scope widening, and the report does not make it.

### F6 — TRIVIAL. The report's own git log is a placeholder

LANE_STANDARD §5 asks for `git log --oneline main..HEAD`. The lane is a single
commit, `a7232476`; the report prints two lines, the second being
`<this report's own commit>`. Now that the SHA exists, write it in.

Nothing in F1-F6 impugns the fix itself, the wiring guard, or the seven-suite
audit, each of which I re-derived above.

## 8. What a stronger version would have done

The shortcut here is not a widened tolerance; it is that the durable guard is
textual where it could have been structural. A stronger version would add one
`expectClosed(locator, timing)` helper to `scripts/lib/browser-verify.mjs` —
the single implementation of "this thing is gone now", wrapping
`waitFor({ state: 'detached' })` with the bounded, load-scaled timeout — convert
the four call sites to it, and reduce the scanner to a rule that an absence
check in a browser suite must go through that helper. That is
one-implementation-per-concept (LANE_STANDARD §1), it cannot be evaded by
spelling the comparison differently (F2), it does not care how many comment
lines sit between the action and the read (F1), and its failure message has
somewhere concrete to point. It is in scope for a round 2: the helper file
already exists and already owns `timing`, and the four call sites are in one
file. Two smaller things are also in scope and cheap: committing the isolated
fast-path probe as an env-gated script so the reproduction survives the next
sandbox rebuild (LANE_STANDARD §7), and having the 3000 ms bound in the verify
script be justified against a measured detach rather than a declared 0.14 s.

## VERDICT: REVISE

1. **F1** — make the scanner catch a re-introduction of the fixed line in the
   file as shipped: count non-comment, non-blank lines in the lookback window
   (or scan to the enclosing block), and add a fixture that mutates the real
   `scripts/verify-e5-command-palette.mjs` assertion back to
   `.count().then((n) => n === 0)` and asserts exactly one hit. Today that
   mutation reports zero.
2. **F2** — reconcile the scanner with the claim made for it: either extend the
   shapes to `(await x.count()) === 0`, the `const n = …; n === 0` split form,
   `toHaveCount(0)`, `isHidden()`, `!(await x.isVisible())` and the
   `evaluate(() => !document.querySelector(...))` form, or drop
   "deny-by-default" / "clean zero-exemption rule" from the report and name the
   two spellings actually covered.
3. **F3** — document the two false-positive shapes in the scanner's docstring,
   including that `waitFor({ state: 'detached' })` is vacuous for a
   never-appeared assertion, so nobody follows the message into a test that
   cannot fail.
4. **F4** — correct §2/§3 of the lane report: the deciding quantity is the
   one-time `React.lazy` cost of the first `ShipPanel` open (813 ms first vs
   27-66 ms later, same session, same box; only the first open passes the
   unfixed check), and the "runner is slower than this sandbox" premise is
   unmeasured and backwards — this box ran at load 1.5-2.5 of 4 cores with
   other agents live.
5. **F5** — where the 0.14 s window is used as evidence, give the measured
   number beside it (212-293 ms to detach after `Enter` on this box) and note
   that it is what justifies converting the 300 ms Settings margin.
6. **F6** — put the real SHA in the report's `git log --oneline main..HEAD`
   block.

Items 1-3 are the ones that decide the merge; 4-6 are corrections to the
durable record and should ride along in the same round. Re-review will check
these six against the new diff.

---

# Round 2 (`cb4b3c4d`)

Re-check of the six round-1 items against `git diff a7232476..cb4b3c4d`
(3 files: the scanner test, the lane report, and this review file, which the
lane carried forward unchanged — verified: `git diff a7232476..cb4b3c4d --
docs/audits/2026-09-13-ci-green/palette-race-review.md` is pure addition of
round 1's text). No production or scoring-path file moved this round.

## Re-run and re-mutated here

| command / mutation | result |
|---|---|
| `node --experimental-strip-types tests/scripts/wait-for-function-options-position.test.ts` | **21/21, 4 suites, 0 fail** |
| `npm run lint` (`tsc --noEmit`) | exit 0, no output (32 s) |
| `PW_CHROMIUM_PATH=/opt/pw-browsers/chromium npm run verify:command-palette` | **exit 0, 17/17**, `[PASS] The palette itself closes after running an action` |
| shipped `scripts/verify-e5-command-palette.mjs`, unmutated | 0 offenders |
| **M1** — revert only the fixed assertion, lane's 20-line comment left in place (round 1's F1 mutation, verbatim) | **1 offender, line 151**, `paletteDialog.count().then((n) => n === 0)` |
| **M2** — same line respelled as the split form (`const nPal = await paletteDialog.count(); … nPal === 0`) | **1 offender, line 152** |
| **M3** — same line respelled `await paletteDialog.isHidden()` | **1 offender, line 151** |
| **M4** — same line respelled `(await paletteDialog.count()) === 0` | **1 offender, line 151** |
| **M5** — same bug on an inline locator never confirmed open | 0 offenders (documented design trade, see note N2) |

M2-M4 are three of round 1's ten evasion spellings, re-applied by this
reviewer to the real file rather than to a fixture, so they exercise the
shipped scanner against the shipped script.

## Per-item verdicts

1. **F1 (major) — CLOSED.** The distance heuristic is gone; the scan now
   tracks, per named locator and in file order, whether it was confirmed open
   (a `.waitFor(` without a detached/hidden state) and whether its own close
   was confirmed (`state: 'detached' | 'hidden'`, or `expectDetached(name, …)`),
   with a re-open clearing an earlier close. The fixture reads the real
   on-disk `scripts/verify-e5-command-palette.mjs`, asserts the fixed line is
   still present verbatim (so the fixture goes stale loudly rather than
   silently), applies exactly round 1's mutation and asserts exactly one
   offender. Independently reproduced above: M1 flags line 151.
2. **F2 (moderate) — CLOSED.** All ten spellings from round 1's matrix are
   covered, and the 11-line and `.tap()` evasions are genuinely moot now that
   no rule reads actions at all. The two `(await x.count()) === 0` existence
   guards stay unflagged for the right reason — neither locator is ever
   confirmed open — and that reason is asserted by its own fixture rather than
   left to a comment. Repo-wide scan across `scripts/` and `scripts/lib/`
   still reports zero under the widened rules, so the widening bought no false
   positives.
3. **F3 (minor) — CLOSED.** Both shapes are in the docstring. The
   `waitForFunction(() => !document.querySelector(...))` pattern has its own
   fixture asserting zero hits, with the reason stated (`evaluate` is not a
   substring of `waitForFunction`, and the shape is a real wait). The vacuity
   caveat is written down as a caveat the rule cannot enforce, which is the
   honest disposition — text alone cannot separate "was shown, now gone" from
   "never shown".
4. **F4 (report accuracy) — CLOSED IN THE REPORT, NOT IN THE CODE.** §2 is
   rewritten to the lazy `ShipPanel` first import with the per-run gap and
   detach numbers, and the "runner is slower" premise is retracted explicitly.
   §3 now marks the lost scratch harness as a LANE_STANDARD §7 gap and treats
   the reproduced probe numbers as primary. The retraction did not reach the
   comment at the assertion itself — see R2-1.
5. **F5 (report accuracy) — NARROWED.** Every `0.14s` citation *in the report*
   now carries the measured 212-293 ms detach, and §1 adds the argument round 1
   asked for (the Settings check's 300 ms margin sat inside the measured
   range, which is what justifies converting all three Escape-close checks).
   The four citations in code do not — see R2-1.
6. **F6 (trivial) — CLOSED as far as it can be.** The log block names
   `a7232476` as round 1's tip; round 2's own SHA remains a placeholder for
   the same unavoidable reason (a commit cannot name itself). Acceptable.

## R2-1 — MODERATE, the only open item

The comment block at `scripts/verify-e5-command-palette.mjs:134-153` — the
first thing anyone reads when this assertion is next in question — still
carries, verbatim, two claims round 2 retracted in the report and one that is
the inverse of the lane's own finding:

- `"on a loaded CI runner the Ship-panel wait above can itself eat into that
  0.14s window"` (line 143) is the "runner is the slower, loaded machine"
  premise that §2 now retracts by name.
- `"reproduced deterministically under CPU throttling"` (line 147) inverts the
  lane's own result. Throttling MASKS this race (the lane measured 10/10,
  10/10, 7/8 passing under it, and §2 now explains why: throttling slows the
  lazy chunk too). Nothing was reproduced under throttling; the reproduction
  is the idle fast path. This sentence was wrong in round 1, survived round 2,
  and now contradicts the report it cites two lines later.
- `"stays mounted for the 0.14s AnimatePresence exit animation"` (line 137)
  and `"stays mounted for that long"` (line 172), plus
  `tests/core/command-palette-wiring.test.ts:216-217`, still present 0.14 s as
  the window rather than the floor. The report's own sentence — "Every place
  that used ~0.14s as the mounted-window evidence now also cites the measured
  212-293ms detach time" — is true of the report and not of the code, which is
  the "done for an item that was narrowed" shape LANE_STANDARD §5 names.

This is comments only, it costs one edit in two files, and none of it touches
behaviour, gates, or the scanner. It is held open rather than waived because
the durable artifact that gets read first is the one still saying the opposite
of the finding.

## Notes, not blocking

- **N1 (reviewer's correction of his own round-1 item).**
  `expect(x).toHaveCount(0)` is Playwright's auto-retrying web-first
  assertion: it polls until the expect timeout, so it is a correct wait, not
  the defect. Round 1's F2 table listed it among the missed spellings and the
  lane implemented it as asked. It is inert today — no suite in `scripts/`
  imports `@playwright/test`'s `expect` — so nothing false-positives now, but
  if a suite ever adopts it, that one pattern should come back out rather than
  be worked around. Worth one clause in the docstring whenever the file is
  next touched.
- **N2.** M5 above: the same bug written against an inline locator that is
  never confirmed open (`await page.getByRole('dialog', …).count().then((n) => n === 0)`)
  is invisible to the scan. That is the deliberate price of the
  ownership design — it is what keeps the two existence guards unflagged — and
  the docstring explains the exemption, though not this consequence of it. A
  sentence naming it would finish the thought.
- **N3.** `verify-focus-traps.mjs:175`'s `.catch(() => {})` on its
  detached-wait still swallows a timeout. Unchanged, out of this lane's scope,
  and safe (it degrades into the following `activeElement` assertion failing).

## VERDICT: REVISE

1. **R2-1** — bring the comment at
   `scripts/verify-e5-command-palette.mjs:134-153` into line with the report
   round 2 just rewrote: delete the "on a loaded CI runner … eat into that
   0.14s window" premise, delete or correct "reproduced deterministically
   under CPU throttling" (throttling masked the race; the idle fast path
   reproduces it), and state the mounted window as "0.14s declared, 212-293 ms
   measured detach on this box" at lines 137, 172 and in
   `tests/core/command-palette-wiring.test.ts:216-217`. Then either restate or
   scope the report's "every place that cited 0.14s has been corrected"
   sentence so it is true of the code too.

Items 1, 2, 3 and 6 are closed and will not be re-checked. Item 4 and item 5
are closed in the report and re-check only against R2-1. Nothing else from
round 1 remains open; on R2-1 landing, this lane is a MERGE.
