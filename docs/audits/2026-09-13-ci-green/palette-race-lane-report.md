# Palette-close-race lane report

Worktree: `/home/user/wt-palette`. Branch: `lane/palette-close-race`, from
`main` @ `7663df1f`. Tip: see the `Tip:` line the lane's final message
reports (this report's own commit is the tip, so it cannot name its own SHA
in advance).

```
$ git log --oneline main..HEAD
fix(e5): wait for the command palette to detach instead of sampling .count() — the palette-close-race lane
<this report's own commit>
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
`<dialog role="dialog">` node stays in the DOM for ~0.14s of real wall-clock
time AFTER `onClose()` has already flipped `paletteOpen` to `false`.

The verify script's OWN comment three sections down (pre-fix line 152-157, on
the Escape-close check) already names this mechanism and adds a 400ms
`waitForTimeout` margin for it. That fix was never applied to the
Enter-runs-an-action check three sections up — that omission is the whole bug.

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
investigation needs distinguished from a harness race, and now is.

The finding's own hypothesis ("a slower runner") does not survive
measurement. Isolating the exact same production code path (same
`CommandPalette.tsx`, same `AnimatePresence` duration) in a trimmed repro
script and timing the gap between `Enter` and the Ship panel becoming visible
on this sandbox, idle, with no artificial throttle:

```
Enter->shipPanel=89ms   -> unfixed check FAILS (dialog still exit-animating)
Enter->shipPanel=808ms  -> unfixed check PASSES (animation already finished)
```

The race fires when the Ship panel's own render finishes FASTER than the
palette's fixed 140ms exit animation — i.e. on a fast, lightly-loaded render
path — not on a slow one. Applying real CDP CPU throttling
(`Emulation.setCPUThrottlingRate`, rates 4x/6x/10x/20x) or a genuine 3-core
CPU hog made the unfixed check pass MORE reliably (10/10, 10/10, 7/8), because
throttling slows the Ship panel's own DOM work more than it affects the
fixed-duration, timer-driven exit animation — it pushes `Enter->shipPanel`
comfortably past 140ms and masks the race rather than reproducing it. See §3
for the numbers this rests on.

## 3. Reproduced deterministically (LANE_STANDARD §3)

Repro harness: `/tmp/claude-.../scratchpad/repro-palette-race.mjs` (session
scratch — not committed; boots the real keyless server via the same
`scripts/lib/browser-verify.mjs` helpers the suite uses, drives the identical
`Cmd/Ctrl+K -> type "ship" -> Enter -> wait for Ship panel -> check palette
closed` sequence, and checks the close condition two ways: OLD =
`paletteDialog.count().then((n) => n === 0)` with no wait — the exact unfixed
line; NEW = `paletteDialog.waitFor({ state: 'detached', timeout:
timing.ms(3000) })` — the fix).

Same box, same server, same script, throttle=1x (no artificial slowdown —
this is what actually reproduces it, see §2), one run after another:

| | OLD (unfixed) | NEW (fixed) |
|---|---|---|
| 15 runs | **1/15 passed** (14/15 FAIL) | **15/15 passed** |
| 10 runs (separate batch) | 3/10 passed (7/10 FAIL) | 10/10 passed |
| 8 runs, under a 3-process CPU hog | 7/8 passed (masks the race, see §2) | 8/8 passed |

This satisfies "a guard must be shown FAILING on the unfixed input before it
is shown passing on the fixed one" — same harness, same production code, same
machine, only the assertion's wait strategy differs.

The full, unmodified `verify-e5-command-palette.mjs` (all 17 assertions, not
the trimmed repro) stayed 17/17 across 5 idle runs both before and after the
fix on this box (§5) — consistent with "locally this suite is 17/17 every
time it has been run": the suite's earlier steps (the Tab-order walk, the
first screenshot) apparently warm the render pipeline enough on this sandbox
that `Enter->shipPanel` lands past 140ms every time. The isolated repro (which
skips those steps) is what makes the underlying race reproducible on demand;
CI's 3/3 failures on `main` are the same mechanism landing on the fast side of
140ms there instead.

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

**New deny-by-default scanner** (item 4's suggested home):
`tests/scripts/wait-for-function-options-position.test.ts` gained
`unwaitedCloseChecks()` and a new `describe` block. It flags a
`<locator>.count() === 0` (or `.then((n) => n === 0)`) read within 10 lines of
a `.press(`/`.click(` action UNLESS that same locator's own
`.waitFor({ state: 'detached' | 'hidden' })` was called first — deliberately
narrow (appearance checks and synchronous focus reads are out of scope; see
§ above for why they're safe) to avoid false-positiving on the table above.
Shown failing first: run against `main`'s original
`verify-e5-command-palette.mjs` it reports exactly the 4 offenders fixed in
§4 (line 134 plus the three Escape-close instances); against this lane's
fixed tree, and against all seven other suites, it reports zero. A
`no script re-introduces the defect` test runs the same scan over every file
under `scripts/` and `scripts/lib/`.

## 7. Gates

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

No full `npm test` run (per GATES — the orchestrator runs it at merge).

## 8. Left undone, and why

- The seven-suite audit (§6) found no fix-worthy sites, so nothing else in
  those files was touched — fixing a non-bug to match a textual pattern would
  be exactly the "narrowed/widened" shortcut LANE_STANDARD §6.3 asks a
  reviewer to look for.
- The new scanner is scoped to the ABSENCE-check shape (the actual bug
  class); it deliberately does not attempt to also flag entrance/appearance
  checks or synchronous focus reads, because those are not races in this
  codebase (§6) and a general "any read after any action" rule would false-
  positive on roughly a dozen legitimate sites.
- CDP CPU throttling and a real CPU hog were tried per the brief's own
  suggestion and are reported in §2-3 because they turned out to be the WRONG
  lever for this specific race (they mask it, they don't reproduce it) — that
  is itself load-bearing evidence for the race-vs-regression verdict, not a
  dead end, so it is reported rather than discarded.
