# Independent review — a11y / dark-mode contrast lane (B-11, B-14, B-15)

## Round 1

Reviewer: independent (did not build the change). Read-only: the worktree was never edited;
the only file I created there was `scripts/output/verify-a11y-exported-coverage.html`, which
`npm run verify:a11y` itself writes (see item 6) — deleted afterwards, final
`git status --porcelain` empty. Every probe lives in
`/tmp/<session scratch>/rank-review/`. Every server I booted was shut down
(`shutdown()` per probe; final `ps aux | grep "[s]erver.ts"` → no match).

Worktree `/home/user/STORYMACHINE/.claude/worktrees/agent-a768be3513a68c292`, branch
`worktree-agent-a768be3513a68c292`, one commit `5a11844f` on `08d3398b`
(tag `audit/2026-09-05/a11y-dark-round1`), 8 files, +736/−37. Budget-limited pass as instructed:
diff reading, four browser probes (three surfaces in both themes, plus one counterfactual and one
root-cause bisect), one `verify:a11y`, the two touched unit tests, the scoring receipt. No full
`npm test`, no eight-suite battery.

**Verdict: REVISE.** The three findings' *named* surfaces are genuinely fixed and every number in
the report reproduces on my own measurements, including the one the brief got wrong. But the same
1.13:1 defect B-11 describes is **still live two functions up in the same file** — on the two modals
a writer must pass through to create the very cards that were fixed, and which the new gate's own
step 10a clicks through twice without auditing (item 1). And the report's LANE_STANDARD §3
fail-then-pass proof for the source-level scanner is attributed to a detector that was not shipped
(item 2). Items 3–7 are non-blocking.

---

## 1. Brief vs diff

| # | Brief item | Status | Evidence |
|---|---|---|---|
| 1 | B-11: cards onto `--sm-panel-2`; measure every text node in the section, both themes, ≥4.5:1; table in the report | **DONE for the section — INCOMPLETE for the file** | `SnapshotManager.tsx:492` — `bg-white dark:bg-zinc-800` → `bg-[var(--sm-panel-2)]`. Driven by me (below): **18 text nodes, 0 failures, min 4.97 max 14.62, identical in both themes.** Also a real bonus fix: `:448` gives the heading the `ship-versions-heading` id `ShipPanel.tsx` was already pointing `aria-labelledby` at — a dangling reference that left the region unnamed. But `:293` and `:369` (`bg-white dark:bg-zinc-800`) were left untouched → **1.13:1 measured, see item 1 of the REVISE list.** |
| 2 | B-14: darkened band ramp clearing 4.5:1 on both row backgrounds; rows on a theme-invariant token; measure all 36 nodes both themes | **DONE** | `SlatePanel.tsx:130-136` ramp (green-800/amber-800/red-700/red-800), `:151` RECOMMEND chip green-600→green-700 (found by the lane, not in the finding — correctly disclosed), `:718` `rowBg` = `--sm-panel`/`--sm-panel-2`, `:671` the `data-a11y-section="slate-table"` hook. Driven: **scoped table 27 nodes, 0 failures, min 4.77, identical light and dark.** The full 36-node dialog scope is clean in dark (0/36); its 7 light failures are pre-existing chrome the diff never touched — item 4. |
| 3 | B-15: raise muted colours ≥4.5:1; wrap wide blocks in `overflow-x:auto` so the body never scrolls sideways; contrast assertion in `coverage-html.test.ts`; 375 px check in the browser suite | **DONE, and the brief's premise correctly rejected** | `coverage-html.ts:771` `.dim-basis` `#a3a3a3`→`#6b6b6b`, `:311` major heat cell `#d97706`→`#b45309` (reusing the `#b45309` already at `:100`/`:107`, so no second amber). `:802`/`:816` got the defensive `overflow-x:auto`; the actual fix is `:872-876` `.issue-fix { overflow-wrap: anywhere }`. I bisected this myself and the lane is exactly right — see §2.4. Tests at `coverage-html.test.ts:795-895` (2 cases), browser check at `verify-a11y.mjs:1244`/`:1259`. |
| 4 | Gate: extend `verify-a11y.mjs` to (a) Ship versions with two saved versions, (b) the Slate table after a rank with Labs on, (c) the exported HTML from `file://`, each in BOTH themes; show each new step failing first; every wait through `timing.ms()` | **DONE — one step's fail-first is weaker than the report says** | `verify-a11y.mjs:1077` (10a), `:1139` (10b), `:1192` (10c); every wait I checked goes through `timing.ms(...)`. `verify:a11y` reproduced by me at **92/92, exit 0**. PRE-FIX log shows **exactly the seven** failures the report names. But 10b's two pre-fix failures are *"[data-a11y-section] renders"* selector misses — the scoped axe assertion never ran, so B-14's own numbers were never shown to fail a gate. I closed that gap myself (§2.2) rather than holding it against the lane; the report should still say so — item 3. |
| 5 | Write the convention down (prefer `design-system.css`); add a source-level scan for `dark:bg-` + `text-black`/`text-[var(--sm-ink` and **prove it fails on the current tree** | **PARAGRAPH DONE · SCAN NARROWED, and the fail-first proof as written is false** | `design-system.css:16-42` — the right place (it is where the tokens are defined, it names both correct shapes and both directions of the bug, and it points at the test; the test points back). Verified true: no `.dark`/`prefers-color-scheme` rule anywhere in `src/styles` redefines a `--sm-*` token, and in-browser under `html.dark` they resolve to `#f4efe2 / #efe8d7 / #211d15 / #6b6152`. The scan (`theme-convention.test.ts:104-119`) is same-element only. The narrowing is disclosed in the test header and the report's "Narrowed" section — but the report's proof sentence is not true of the shipped detector. See item 2. |
| — | Constraints (no scoring-path edits; don't touch `ScriptDoctorPanel/CoverageSummary/ScriptIDE`) | **HELD** | `node scripts/check-scoring-receipt.mjs main..HEAD` → exit 0, *"no scoring-path files changed"*. The 8 changed files include none of the three reserved components. |

## 2. Driven myself

All four probes ran against a keyless server booted from this worktree's own `dist/` (verified fresh:
`dist/assets/ShipPanel-*.js` contains `ship-versions-heading`, `SlatePanel-*.js` contains
`slate-table`), Chromium at `PW_CHROMIUM_PATH=/opt/pw-browsers/chromium`, canvas-resolved colours,
the hunter's own `MEASURE` function from `p4e-dark-contrast.mjs` / `p5-slate.mjs`.

**2.1 The three surfaces, both themes** (`rank-review/a11y-review.mjs`, log `probe1.log`):

| surface | light | dark |
|---|---|---|
| `section[aria-labelledby="ship-versions-heading"]` (B-11) | 18 nodes, **0 fail**, 4.97–14.62 | 18 nodes, **0 fail**, 4.97–14.62 (identical) |
| `[data-a11y-section="slate-table"]` (B-14) | 27 nodes, **0 fail**, 4.77–14.62 | 27 nodes, **0 fail**, 4.77–14.62 (identical) |
| whole Slate dialog, 36 nodes | 7 fail at 2.49–2.60 (pre-existing chrome, item 4) | **0 fail** |
| exported coverage HTML @375 px (B-15) | 949 nodes, 1 "fail" at 4.31:1 — the 48 px health number, which is WCAG **large text** (3.0:1 floor), so it passes AA and axe agrees | identical (fixed palette, as designed) |

The report's headline numbers are exact: ink **14.62** on `--sm-panel` / **13.74** on `--sm-panel-2`,
mute **5.29 / 4.97**. Token values under `html.dark = true`:
`{"dark":true,"panel":"#f4efe2","panel2":"#efe8d7","ink":"#211d15","mute":"#6b6152"}` — `--sm-panel-2`
is a real token declared at `design-system.css:49` with the stated `#efe8d7`, and neither ink token
moves under dark. Exported HTML: `documentElement.scrollWidth 375 == clientWidth 375` at 375 px in
both `colorScheme` states (and 1280 == 1280), and **zero** `<li>` with a non-list parent. Recomputed
from the emitted literals: `.dim-basis #6b6b6b` = **5.25** on `#fffdf9`, **4.76** on `#f4f2ec`;
white on `#b45309` = **5.02** (pre-fix `#d97706` = **3.19**). Zero console errors on every page.

**2.2 Does step 10b actually catch B-14?** (`rank-review/slate-counterfactual.mjs`, `slate-cf.log`)
Because the pre-fix run only failed 10b on a missing selector, I drove the real slate, then restored
the pre-fix colours in the live DOM and re-ran the *same* scoped `axe.run(el, …)` call `auditElement`
makes:

```
light  shipped: []
       pre-fix colours restored: serious:color-contrast(2)
         2.13 (#fe9a00 on #ffffff, 12px bold) | 2.04 (#fe9a00 on #f9fafb)
dark   pre-fix colours restored: serious:color-contrast(12)
         1.05 (#211d15 on #18181b) | 2.91 (#6b6152 on #18181b) ...
```

Those are the finding's own numbers to two decimals (B-14 measured 2.13 / 2.04 / 1.06). **The gate
has real teeth for B-14** — the lane just never demonstrated it. (The "dark shipped" line in my log
carries the light numbers: my probe does not reset the injected styles between passes. That is a
probe artifact; the real `verify:a11y` run reports `dark-slate-table … clean`.)

**2.3 `verify:a11y`, once, foreground, redirected**
`PW_CHROMIUM_PATH=/opt/pw-browsers/chromium npm run verify:a11y` → `VERIFY_A11Y_EXIT=0`,
`[verify] 92/92 assertions passed.` (`rank-review/verify-a11y-REVIEW.log`). The PRE-FIX log is
exactly seven failures, and they are the ones the report names: `dark-ship-versions` contrast (12
nodes), the two `slate-table-gate` render assertions, `light-/dark-exported-coverage-html` contrast
(`.dim-basis` ×9 + `listitem` ×9), and the two 375 px overflow assertions. `light-ship-versions`
passed pre-fix — correct, B-11 was dark-only.

**2.4 The overflow root cause** (`rank-review/overflow-cause.mjs`) — three variants of the real
exported document at 375 px:

```
shipped (as exported)                  : 375 / 375  OK
minus .issue-fix overflow-wrap         : 418 / 375  OVERFLOW +43px
minus the two strip overflow-x floors  : 375 / 375  OK
```

`418 vs 375` is precisely the pre-fix number in the gate log. The brief's guess (per-scene strip,
tables) is measurably wrong and the lane's `.issue-fix` diagnosis is measurably right. Rejecting a
brief premise with a bisect instead of accepting it is the behaviour this standard is for.

**2.5 Gates I re-ran:** `check-scoring-receipt main..HEAD` → 0, "no scoring-path files changed";
`tests/core/coverage-html.test.ts` → 46/46; `tests/core/theme-convention.test.ts` → 6/6.

## 3. The shortcut hunt

Three things did not survive it, all reproduced below in §4. The rest is clean: the band ramp is one
`Record`, not a second copy of a threshold; `heatmapCellColor` reuses the file's existing `#b45309`
rather than inventing a second amber; the `<ul>` wrappers are each guarded on a non-empty findings
list (`coverage-html.ts:1107`, `:1121`, `:1142`, `:1152`) so no empty list is emitted; the dropped
`dark:` variants in `SlatePanel` are dropped *because* their backgrounds became invariant, not to
quiet a check; and the regenerated fixture is consistent with the renderer (46/46).

## 4. REVISE — numbered

1. **`src/components/scriptide/SnapshotManager.tsx:293` and `:369` — B-11 is still live, at the same
   1.13:1, in the same file, in the flow the fix exists to serve.** Both modals are still
   `bg-white dark:bg-zinc-800`, and their headings and Cancel button inherit `--sm-ink`.
   Reproduction (`rank-review/modal-probe.mjs`, `modal.log`; Ship panel, `html.dark = true`):

   ```
   == DARK Save Snapshot modal ==       1.13  rgb(33,29,21) on rgb(39,39,42)  "Save Snapshot"
                                        1.13  rgb(33,29,21) on rgb(39,39,42)  "Cancel"
   == DARK Restore Snapshot modal ==    1.13  rgb(33,29,21) on rgb(39,39,42)  "Restore Snapshot?"
                                        1.13  rgb(33,29,21) on rgb(39,39,42)  "Cancel"
   ```

   This is not a new bug and not a regression — but it is B-11's exact shape, in the file the lane
   edited, on the modal a writer must open to produce the cards that were fixed, and step 10a
   (`verify-a11y.mjs:1085-1095`) clicks through it **twice** without auditing it. LANE_STANDARD §2
   allows leaving a surface out only with "the reason it cannot be … written down with file and line
   evidence"; nothing in the diff or the report mentions these two lines. Fix: the same move as
   `:492` — `bg-[var(--sm-panel-2)]` on both, drop the input's `dark:bg-zinc-700 dark:text-white`
   (`:308`) and the Cancel buttons' `dark:hover:bg-zinc-700` (`:314`, `:380`) so the modal is
   invariant end-to-end, and add one `auditElement(page10a, <the open modal>, 'dark-save-snapshot-modal')`
   inside 10a's existing save loop. `scripts/verify-focus-traps.mjs:282-326` already drives both
   modals if a second gate site is preferred.

2. **`a11ydark-report.md`, "Theme-convention source scan" — the fail-first proof is attributed to a
   detector that was not shipped.** The report says: *"Proven against the real pre-fix
   `SnapshotManager.tsx` (via `git show HEAD:…`, logged at `theme-scan-fails-first.log`) — it found
   the date caption's violation."* The violation recorded in that log is
   `"value": "text-[10px] font-mono text-[var(--sm-ink-mute)]"` — a string containing **no
   `dark:bg-`**, so the shipped same-element detector
   (`tests/core/theme-convention.test.ts:104-119`) cannot return it. I ran the shipped detector's
   exact logic (`rank-review/scan.mjs`) against `git show main:src/components/scriptide/SnapshotManager.tsx`
   → `[]`, and against **all 62 `.tsx` files of `main`'s `src/components`** → `[]`. So the shipped
   scanner has never been shown to fail on any real input, and the second describe block ("the
   actual regression gate over src/components") passes identically on `main` — brief item 5's
   "prove it fails on the current tree" is unmet. The honest resolution is not a bigger scanner (the
   test header's reasoning for staying same-element is sound and I agree with it): it is to say in
   the report that **the exact pattern item 5 names has zero instances anywhere in this repo, past
   or present, so it cannot be shown failing on the tree**, that the fixtures are therefore the only
   available teeth, and to relabel `theme-scan-fails-first.log` as the abandoned cross-element
   prototype's output rather than the shipped test's.

3. **Report, "Gate extension — fail-then-pass" — 10b's pre-fix failure was a selector miss, not a
   contrast miss.** The report's parenthetical ("scoping hook didn't exist yet — that's part of this
   batch's wiring") is accurate but undersells the gap: the `light-slate-table` / `dark-slate-table`
   axe assertions, the ones that would catch B-14, never executed against the unfixed colours. §2.2
   above supplies the missing measurement (2.13 / 2.04 light, 1.05 dark, from the gate's own scoped
   axe call) — please fold it, or an equivalent run of your own, into the report so the §3 claim is
   backed rather than assumed.

Non-blocking, worth doing in the same round since the files are open:

4. **`src/components/SlatePanel.tsx:506`, `:529`, `:534`, `:512`, `:653`, `:823` — the Slate panel's chrome
   fails contrast in LIGHT at 2.49–2.60:1**, and the new gate is scoped past it. Measured on the
   whole dialog (`probe1.log`): `"6,013 / 6,000,000 chars"` 2.60, `"alpha.fountain"` 2.49,
   `"2,314 ch"` 2.49, `"beta.fountain"` 2.49, `"3,699 ch"` 2.49, the `· Shape & Rhythm column is
   descriptive only …` caption 2.60, the percentile explainer 2.60 — all `text-gray-400`
   (`rgb(153,161,175)`) on white / `bg-gray-50`. These are pre-existing and the diff does not touch
   them, so this is not a regression; but B-14's own headline was "the slate's Health column fails
   contrast in light mode", the panel around the fixed table still does, and
   `[data-a11y-section="slate-table"]` (`:671`) deliberately excludes it. Either widen the hook to
   the dialog or record these as a known gap.
5. **`SlatePanel.tsx:718` — the ranked table now renders light invariant rows inside a panel root
   that is still fully themed dark (`:438`, `bg-white dark:bg-zinc-900 dark:text-white`).** It is
   accessible (0/27 failures, verified) and it is the convention the finding recommended, but in
   dark mode a writer sees a cream table island in a black drawer. Worth one sentence in the file
   saying that is deliberate, or a follow-up to bring the whole drawer to convention (1).
6. **`scripts/verify-a11y.mjs:1227` writes a 218 KB `verify-a11y-exported-coverage.html` into
   `scripts/output/`, which is a *tracked* directory** (`.gitignore:94-104` ignores only
   `scripts/output/*.png` and `flaky-retries/`). Every `npm run verify:a11y` now leaves the tree
   dirty — my own run did, and I deleted the file to restore the worktree. Add the filename to
   `.gitignore` or write it under `os.tmpdir()`.
7. `tests/core/coverage-html.test.ts:840` — the `.dim-basis`-on-`body` assertion is described in its
   own comment as defensive ("today it never does"). Fine, but the comment at `:797-806` claims the
   three pairs are "the ones B-15 measured as failing"; pair 2 was not measured failing, it was
   inferred. One word ("and one defensive pair") keeps the block as honest as the rest of the diff.

## 5. What a stronger version would have done

Two things, both in scope. First, treated *the file* rather than *the finding's line number* as the
unit of work: a `grep -n "dark:bg-" src/components/scriptide/SnapshotManager.tsx` returns four hits
and the lane fixed one — the other three are item 1, and one grep would have found them before the
gate was written. Second, made step 10a audit the modal it already opens; the gate currently proves
the surface B-11 *named* is clean while walking through an identical 1.13:1 surface to get there,
which is the narrower version of the same "per-file, not per-surface" mistake the lane's own
`design-system.css:16-42` paragraph exists to name. Out of scope and correctly left alone: the
`dark:bg-` + `--sm-ink` collision also lives in `ScriptDoctorPanel.tsx` (40 hits) and
`ScriptIDE.tsx` (6) — files the brief reserved for another lane — which is the real argument for
keeping the browser gates as the enforcement mechanism and the scanner narrow.

---

## Round 2

Same reviewer, warm context (LANE_STANDARD §6). Read-only: the worktree was never edited, and
`git status --porcelain` is **empty** after everything below, including the `verify:a11y` run —
round-1 item 6 is fixed and I confirmed it rather than took it. Every probe lives in
`/tmp/<session scratch>/rank-review/`; every server was shut down (`ps aux | grep "[s]erver.ts"` → no
match at the end).

Worktree `…/agent-a768be3513a68c292`, branch `worktree-agent-a768be3513a68c292`, now
`8ecb89b9` (round 2, tag `audit/2026-09-05/a11y-dark-round2`) on `7df51ae8` (round 1, rebased from
`5a11844f`) on `main` `4cbaf02f`. Round-2 diff: 5 files, +552/−144.

**Verdict: MERGE.** All seven items from Round 1 are built, and I reproduced each one myself rather
than reading the report: the two modals now measure 13.74 / 4.97 in **both** themes, the whole Slate
drawer measures 0 failures across empty / error / idle / ranked in **both** themes, the rewritten
scanner really does report 6 and 5 violations against `git show main:` (I ran it independently), the
36 ScriptDoctorPanel hits are real (three sampled and measured in the browser at 1.06, 1.41 and
2.45:1), `verify:a11y` is 95/95 with a genuine 94/95 fail-first for the new modal step, and nothing
from round 1 regressed. Four follow-ups below are worth doing — two of them before another lane
leans on this scanner — but none is a defect on this tree and none is a reason to hold the merge.

### Round-1 items vs the round-2 diff

| # | Round-1 item | Status | Evidence (file:line + my measurement) |
|---|---|---|---|
| 1 | B-11 still live in both SnapshotManager modals | **DONE, plus a self-found regression** | `SnapshotManager.tsx:304` and `:393` → `bg-[var(--sm-panel-2)]`; input `:324` and both Cancel buttons `:336`/`:413` de-themed (`hover:bg-[var(--sm-hair)]`); the Restore caption `:405` → `text-[var(--sm-ink-mute)]`. Driven (`r2-probe.mjs`, `r2-probe3.mjs`): **Save modal 3/3 nodes ≥13.74, both themes; Restore modal 4/4 clean, both themes** — heading 13.74, caption **4.97**, Cancel 13.74, Restore button 14.24, *identical numbers in light and dark*. The caption regression the lane reports finding (invariant background + a surviving `dark:text-gray-400`, 2.13:1) is the mirror-image bug and the honest catch of this round. |
| 2 | The scanner's fail-first proof was attributed to an unshipped detector | **DONE** | `theme-convention.test.ts` rewritten as a TS-AST subtree walk (`:277-317`), with the round-1 misattribution written into the header verbatim (`:7-23`). I extracted the detector unchanged (`rank-review/scanner.ts`) and ran it myself: `git show main:src/components/scriptide/SnapshotManager.tsx` → **6** (`:295`, `:312`, `:371`, `:378` the modals; `:469`, `:473` the card + date caption), `git show main:src/components/SlatePanel.tsx` → **5** (`:683`, `:714`, `:715`, `:721`, `:726`). Live tree → **0** in both. The proof is now real and independently reproducible. 14/14 tests pass. |
| 3 | 10b's fail-first was a selector miss, not a contrast miss | **DONE** | The report now carries the counterfactual numbers (2.13 / 2.04 light, 1.05 dark) from my round-1 probe, run against the round-2 tree. Independently re-confirmed by the *gate itself* this round: `verify-a11y-PRE-FIX-round2.log:111` is a real contrast FAIL (`dark-save-snapshot-modal … serious:color-contrast(2)`), i.e. this round's new step was shown failing on unfixed source and passing after — 94/95 → 95/95. |
| 4 | Slate chrome failing 2.49–2.60:1 in light, outside the gate's scope | **DONE** | Eight `text-gray-400`/`text-gray-500 dark:text-gray-400` nodes → `text-[var(--sm-ink-mute)]` (`SlatePanel.tsx:537`, `:540`, `:546`, `:563`, `:568`, `:623`, `:687`, `:859`); hook widened from the table wrapper to the content container (`:533`), old inner hook removed so exactly **one** element carries it (verified in-DOM: `data-a11y-section="slate-table"` element count = 1). Driven: light idle 8 nodes min **4.97**, light ranked whole drawer 36 nodes min **4.77**, **0 failures** — the seven 2.49–2.60 failures I measured in round 1 are gone. |
| 5 | Drawer/table theme mismatch | **DONE, and measured before being declared safe** | Root `:446` → `bg-[var(--sm-panel)] text-[var(--sm-ink)]`; every remaining `dark:` token in the file removed (`grep -n "dark:" src/components/SlatePanel.tsx` returns only historical comments). Driven across **empty / rejected-file error banner / idle-with-files / ranked**, both themes: **0 failures in every state** (min 4.77). The report's account of the first attempt regressing to 7 violations (including both filename `<input>`s at 1.05:1 — a *new* B-11 instance created by the fix) and being caught by measurement rather than assumption is exactly §3 behaviour. |
| 6 | `verify:a11y` left a 218 KB file in tracked `scripts/output/` | **DONE** | `verify-a11y.mjs:1272` → `${tmpdir()}/…`. Confirmed after my own full run: `git status --porcelain` **empty**, `/tmp/verify-a11y-exported-coverage.html` present (220,276 bytes), nothing matching `verify-a11y` in `scripts/output/`. |
| 7 | `coverage-html.test.ts` comment overclaimed which pairs were measured | **DONE** | `:800-812` now marks pair 1 and pair 3 "MEASURED" and pair 2 "NOT one of B-15's measured failures … inferred rather than measured". 46/46 pass. |

### Is the AST walk sound? (read hard, probed, not taken on faith)

I re-implemented nothing: I lifted the detector verbatim (`theme-convention.test.ts:134-318`) into
`rank-review/scanner.ts` and fed it fixtures.

**What it gets right.** The model is the right one — background as *paint* (nearest opaque ancestor,
reset by the first descendant that declares its own) and `color` as real CSS *inheritance* rooted at
an invariant `body { color }` — and it is why one rule catches both historical shapes plus the modal
shape (unstyled text, no class at all). `classNameRaw` reads the attribute's **source text**, so
both branches of a ternary and every string inside a `clsx(...)`/template literal are seen; I
confirmed both (`fix/d-clsx.tsx` → 1 violation, `fix/e-template.tsx` → 1 violation). The
`.sm-btn` family is modelled explicitly, which is the only reason B-14 reproduces at all (its
invariant ink came from a stylesheet rule two levels up, not a Tailwind class). `classifyTextBody`
correctly separates `text-xs` / `text-[10px]` (size) from `text-black` / `text-[var(--sm-ink)]`
(colour) — the overload that would otherwise make this whole thing noise. Fractional-opacity
`dark:bg-*/10` exclusion is justified and, per the header, verified against a real AnalysisPanel
false positive.

**Three things it cannot see.** One is disclosed; two are not:

- *(disclosed)* `className={someVar}` is not constant-folded. I confirmed the exact live shape:
  `fix/a-bare-var.tsx` — a `.sm-btn` wrapper, a `const rowBg = i % 2 === 0 ? "bg-white
  dark:bg-zinc-900" : "bg-gray-50 dark:bg-zinc-800"`, and `<tr className={rowBg}>` — reports **0
  violations**. That is B-14 *in the shape round 1 left the live code in* (`SlatePanel.tsx:754`), so
  the scanner reproduces the historical bug but could not catch its regression. Round 1's browser
  step 10b provably can (I measured it), so this is covered — but it belongs in the header's list of
  what the browser gates are backstopping, spelled out with that file:line.
- *(not disclosed)* **Composition across function/component boundaries is invisible.**
  `fix/b-cross-function.tsx` (a `<Card>` whose invariant-ink `<span>` renders inside a
  `dark:bg-zinc-800` parent in the same file) → **0 violations**; `fix/c-component-child.tsx`
  (`<SomeText />` inside a `dark:bg-zinc-800` div) → **0**. The walk resets to the root defaults at
  every JSX tree, and `ts.isJsxSelfClosingElement` returns without recursing — correct for `<input>`,
  wrong for a component that renders text. JSX passed as an *attribute* (`label={<span>…</span>}`) is
  likewise never visited, since `JsxElement` iterates `node.children` only.
- *(not disclosed, and it matters for the message)* **The reverse direction is not implemented.**
  `fix/f-reverse.tsx` — `bg-[var(--sm-panel-2)]` with `text-gray-600 dark:text-gray-400` inside, i.e.
  *literally the regression this round found and fixed at `SnapshotManager.tsx:405`* — reports **0
  violations**. But the regression gate's own failure message
  (`theme-convention.test.ts:470`) reads *"dark:bg-* composited with invariant ink text, **or the
  reverse**"*. The detector only implements the first half.

**The ScriptDoctorPanel exemption is honest, and the 36 are real.** It is an explicit named allowlist
(`RESERVED_FILES`, `:130-132`), skipped in the zero-gate at `:462`, and the count is pinned by a
second test at `:482` (`assert.equal(violations.length, 36)`) — so both a new violation there and a
fix there show up as a failing test, not silent drift. That is the right shape: not a blanket skip.
I ran the detector against that file myself (36 hits, line list in `rank-review/`) and sampled three
different ones in a real dark-mode browser:

| scanner hit | rendered node | measured (dark) |
|---|---|---|
| `:848` `text-lg font-bold text-black` inside `:843`'s `bg-gray-50 dark:bg-zinc-800` tile | the metric tile's big number ("+1.58", "26", "44") | **1.41:1** |
| `:849` `text-[var(--sm-ink-mute)]` in the same tile | "13 issues • scenes 7, 8, 9, …" | **2.45:1** |
| `:5098` bare `text-xs font-bold` inside `:5096`'s `bg-white dark:bg-zinc-900` card | "Graph Health", "Disclosure & Epistemics", "Character Functions" | **1.06:1** |

All three are genuine, unfixed B-11-shape bugs in a file this lane was told not to touch. Correctly
disclosed, correctly not fixed here. Given the third bullet above, **36 is a lower bound**, not the
count — the pinned assertion is still useful as a drift detector, but the comment at `:479-481`
should say so.

### Gates I ran

`PW_CHROMIUM_PATH=/opt/pw-browsers/chromium npm run verify:a11y` → exit **0**, **95/95**
(`rank-review/verify-a11y-ROUND2.log`), including the three new modal assertions
(`light-save-snapshot-modal` clean, `save-snapshot-modal reopens in dark mode`,
`dark-save-snapshot-modal` clean) and, unchanged from round 1, `light-/dark-ship-versions`,
`light-/dark-slate-table`, `light-/dark-exported-coverage-html` and both 375 px overflow assertions —
so **nothing from round 1 regressed**. `tests/core/theme-convention.test.ts` → 14/14.
`tests/core/coverage-html.test.ts` → 46/46. `git status --porcelain` empty afterwards. Zero browser
console errors across all four of my probes.

### Non-blocking follow-ups (numbered, in the order I would do them)

1. **`tests/core/theme-convention.test.ts:470`** — the failure message promises "or the reverse" and
   the detector does not implement it. Either drop those three words, or implement the reverse rule
   (effective background `safe`/invariant + an own `dark:text-*` with no `dark:bg-*` anywhere up the
   chain), which would have caught this round's own `SnapshotManager.tsx:405` regression instead of
   leaving it to a hand probe. Reproduction: `rank-review/fix/f-reverse.tsx` → 0 violations.
2. **`tests/core/theme-convention.test.ts:62-88` (the "two deliberate scope limits" block)** — add
   the third: composition across function/component boundaries and JSX-in-attributes is not walked.
   Reproductions: `rank-review/fix/b-cross-function.tsx` and `fix/c-component-child.tsx`, both 0
   violations. Then soften `:479-481` from a pinned *count* to a pinned *lower bound*, and add
   `SlatePanel.tsx:754` as the named example of the bare-variable limit (it is the live shape of the
   very bug the file reproduces at `:441-451`).
3. **`scripts/verify-a11y.mjs:1146-1165`** — step 10a audits only the **Save** modal. The Restore
   modal is where this round's mirror-image regression actually lived (`SnapshotManager.tsx:405`) and
   nothing gates it; a repeat would again be invisible to CI. It is two more lines in the same block
   (the button's accessible name is `Restore snapshot: <version>` — a `getByRole('button', { name:
   /^Restore snapshot/ })`, then `auditElement` on
   `[role="dialog"][aria-labelledby="restore-snapshot-modal-title"]`, then Escape), and I have it
   working in `rank-review/r2-probe3.mjs`.
4. **`SlatePanel.tsx:533` vs `:499`** — the widened hook starts at the content container, so the
   drawer header and the `fileError` alert above it are still outside the audited subtree (in-DOM: 35
   scoped nodes vs 37 in the whole drawer). Both measure clean today in both themes, so this is a gate
   blind spot, not a bug; moving `data-a11y-section` up to the drawer root closes it for free.
5. *(nit)* The round-2 report's item-4 before/after table (2.08–2.21 → 4.97–5.29) is a synthetic
   counterfactual on the **round-2** backgrounds, not the historical measurement — the same nodes
   measured 2.49–2.60 on the actual pre-fix `bg-white`/`bg-gray-50` in my round-1 probe. The method
   is stated in the report, so this is a labelling nit, not a false number; saying "on today's
   background" in the table header would remove the ambiguity.

---

## Round 3

Same reviewer, warm context. Read-only: worktree never edited, `git status --porcelain` **empty**
after the `verify:a11y` run. Probes in `/tmp/<session scratch>/rank-review/` (`r3-colors.mjs`,
`r3-colors2.mjs`, `scanner3.ts` — the shipped round-3 detector lifted verbatim). No servers were
needed for the colour work (the measurement page inlines the app's own built stylesheet); the one
`verify:a11y` run cleaned up after itself (`ps aux | grep "[s]erver.ts"` → no match).

Third commit `0fb0f046` on `8ecb89b9` (tag `audit/2026-09-05/a11y-dark-round3`), 5 files, +412/−40.

**Verdict: REVISE — one item, small and precise.** All five round-2 follow-ups are built, and the new
reverse rule is a genuine improvement that found three real bugs nobody knew about. But I measured
the two it "fixed", and **neither reaches 4.5:1 in either theme after the fix** (3.32:1, 2.56:1, and
4.08:1), while the round-3 report calls both "**Fixed**" with no residual number. In a lane whose
entire acceptance criterion is 4.5:1 that reads as "these surfaces now pass", and they do not. The
remedy is three class names in two files this round already touched, with replacements I measured
below. Items 2–4 are non-blocking.

### Round-2 follow-ups vs the round-3 diff

| # | Round-2 follow-up | Status | Evidence |
|---|---|---|---|
| 1 | Implement the reverse rule or drop the "or the reverse" promise | **DONE (implemented)** | `theme-convention.test.ts:235` (`'themed'` TextMode), `:344-380` (`hasFractionalDarkBg`, `ownAttemptedDarkBg`, the four-way `ownBgMode`), `:447-448` (`isReverseViolation`). My round-2 reproduction `fix/f-reverse.tsx` is now a shipped fixture at `:585-600` and asserts **1** violation where the forward-only detector reported 0. Three live hits found — all three genuine, measured below. |
| 2 | Disclose the third scope limit; name `rowBg`; make the pinned count a lower bound | **DONE** | Header `:80-125` (bare-variable limit, now naming `SlatePanel.tsx`'s `rowBg` and pointing at step 10b's proven counterfactual) and `:126-147` (composition across function/component boundaries + JSX-as-attribute, never walked). My own three fixtures are shipped verbatim as `SCOPE LIMIT (disclosed)` tests at `:625-690`. Counts: `assert.ok(>= 65)` at `:768-772` and `assert.ok(>= 1)` at `:784-787`. I re-ran the shipped detector myself: **ScriptDoctorPanel 65, ScriptIDE 1, Sidebar 0, StateDeltaCard 0, SlatePanel 0** — the pinned floors are exactly at the measured values. See item 4 on the direction. |
| 3 | Gate the Restore modal | **DONE** | `verify-a11y.mjs:1134-1157` (light) and `:1188-1204` (dark). Confirmed in my own run: `light-restore-snapshot-modal … clean`, `dark-restore-snapshot-modal … clean`, plus the two reachability assertions. |
| 4 | Move the Slate hook to the drawer root | **DONE** | `SlatePanel.tsx:434-441` (hook on the `motion.div` root), `:547` (the content container no longer carries it) — exactly one element, matching the round-2 in-DOM count I took. `light-/dark-slate-table` both clean. |
| 5 | Relabel the round-2 item-4 table as a counterfactual | **DONE** | Round-3 report §Item 5 labels it "on today's background" and adds the real historical 2.49–2.60:1 figures from my own `probe1.log` beside it. |

`tests/core/theme-convention.test.ts` → **22/22**. `PW_CHROMIUM_PATH=… npm run verify:a11y` → exit
**0**, **100/100**, zero `[FAIL]` lines, `git status --porcelain` empty afterwards.

### The three reverse-rule findings, measured (`r3-colors.mjs`)

Rendered against the app's own `dist/assets/index-CQkieQav.css`, canvas-resolved (Tailwind v4 emits
`oklch()`), alpha-composited through the `bg-amber-500/10` tint, in both themes:

| node | dark, BEFORE | dark, AFTER | light, AFTER |
|---|---|---|---|
| `Sidebar.tsx:161` count at limit (`text-red-500`) | **2.52** | **3.32** | 3.32 |
| `Sidebar.tsx:161` count near limit (`text-yellow-600`) | **1.37** | **2.56** | 2.56 |
| `StateDeltaCard.tsx:83` Dramatic Irony (`text-amber-700` on `bg-amber-500/10`) | **1.17** | **4.08** | 4.08 |
| `ScriptIDE.tsx:2222` `bg-[var(--sm-panel)] dark:text-white` (reserved, NOT fixed) | **1.15** | — | 16.39 |

So: **all four reverse-rule hits are real bugs** — the scanner is not producing noise, and the
`ScriptIDE.tsx:2222` one it disclosed instead of fixing is a genuine 1.15:1 white-on-cream in dark
mode, correctly left to the lane that owns that file. The two fixes are strict improvements and make
both themes render identically, which is the convention the lane set out to enforce. **But none of
the three reaches AA**, and all three are small text (9px / 11px), so the large-text exception does
not apply.

### REVISE — numbered

1. **BLOCKING (small) — `src/components/Sidebar.tsx:161` and `src/components/StateDeltaCard.tsx:83`
   are reported as "Fixed" while still measuring 3.32:1, 2.56:1 and 4.08:1 in *both* themes.** The
   round-3 report's Item 1 says "**Fixed**: dropped the `dark:` half" for each, and gives no residual
   ratio; a reader merging this concludes those surfaces now meet the lane's own 4.5:1 bar. What was
   fixed is the *convention* (an orphaned themed half), not the *contrast*. Two ways to close it, and
   in an accessibility lane I would take the first — it is three class names in two files this round
   already edits, using colours already present in the built stylesheet, all measured on
   `--sm-panel` / the irony tint in the same harness:

   ```
   text-red-700   -> 5.59   (replaces text-red-500,    3.32)
   text-amber-800 -> 6.17   (replaces text-yellow-600, 2.56)
   text-amber-800 -> 5.75 on the bg-amber-500/10 tint (replaces text-amber-700, 4.08)
   ```

   `text-amber-800` is the same token round 1 already chose for SlatePanel's "solid" health band, so
   this adds no new colour to the system. If instead the lane wants to keep the palette and defer,
   then say so explicitly in the report — "convention fixed; these three nodes remain below AA at
   3.32/2.56/4.08, filed as a follow-up" — and note that nothing gates them (neither `Sidebar`'s
   `nearLimit` caption nor `StateDeltaCard` is reached by any step of `verify:a11y`).

2. *(non-blocking)* **The fractional-opacity carve-out is unbounded in alpha**
   (`theme-convention.test.ts:344`, `hasFractionalDarkBg`). Any `dark:bg-*/N` resolves to
   `inherit` regardless of `N`, so a future `dark:bg-zinc-900/95` — effectively an opaque dark
   surface — would be exempted from the FORWARD rule and its invariant-ink text would go unflagged.
   Nothing live is hidden today: every fractional `dark:bg-*` in `src` is `/10`, `/20` or `/40`
   (`grep -rho "dark:bg-[^ \"'\`]*" src --include=*.tsx | sort | uniq -c` — full list in the review
   log), which genuinely composites light over this app's invariant ambient. The principled version
   thresholds the alpha (≥ ~60 counts as solid dark); one line, and it turns "no live counterexample"
   into "cannot have one".

3. *(non-blocking)* **`dark:bg-[var(--sm-*)]` is classified as a dark background when it is a light
   one.** `hasSolidDarkBg`'s token regex matches `dark:bg-[var(--sm-panel)]`, so
   `ScriptIDE.tsx:3035`'s `bg-black dark:bg-[var(--sm-panel)]` propagates `bg: 'dark'` to its subtree
   — the *opposite* of what it paints. It is inside a reserved file and carries no text, so it
   produces no false positive today (`ScriptIDE.tsx` reports exactly the 1 real hit), but it is a
   latent false-positive shape in a scanner whose value is that it does not cry wolf. Excluding
   `dark:bg-[var(--sm-` from `hasSolidDarkBg` is the same one-line class as item 2.

4. *(non-blocking — the direction judgement you asked for)* **`assert.ok(>= 65)` / `>= 1` is the
   right *value* and the wrong *operator*.** It does what the round-2 review asked in one direction:
   if the reserved lane fixes `ScriptDoctorPanel.tsx`, the count drops and the test fails loudly — a
   fixed file is a visible test change, confirmed by construction (65 → 0 fails). What it gives up is
   the other direction: new violations added to either reserved file now pass **silently**, and
   `ScriptIDE.tsx` is being edited by a concurrently-running lane right now. The lane's stated reason
   for `>=` — "without asserting a completeness this walk cannot back up" — conflates two different
   things: the *number* is a lower bound on reality, but the *assertion* can still pin the
   observation exactly. `assert.equal(violations.length, 65)` with the existing comment (this is what
   THIS walk sees today, a floor on the true count; check by hand before re-pinning in either
   direction) keeps the honesty and restores the second signal.

### What I did not re-check

Everything already verified in rounds 1 and 2 and untouched by this diff (the Ship section, the
exported coverage HTML, the `.issue-fix` overflow root cause, the modals' 13.74/4.97). The one
`verify:a11y` run covers them all and is clean at 100/100.

---

## Round 4

Same reviewer, warm context. Read-only; worktree never edited, `git status --porcelain` empty. Smallest
pass as instructed: re-measure the three ratios on the rebuilt tree, read the three classifier changes
for soundness, run `theme-convention` once. No `verify:a11y` this round — the three changed files are
two components that no step of that suite reaches plus a unit test, so round 3's 100/100 still stands
for every surface it covers. Probes: `rank-review/r4-colors.mjs`, `scanner4.ts`, `scanner5.ts` (the
shipped round-4 detector lifted verbatim). No server was needed or started by me. (A transient
`server.ts` process belonging to another session appeared and exited during this round; nothing of
mine boots one, and none is running now.)

Fourth commit `242386c2` on `0fb0f046` (tag `audit/2026-09-05/a11y-dark-round4`), 3 files, +149/−41.

**Verdict: MERGE.** Round 3's blocking item is closed and I re-measured it rather than read it: the
shipped classes land at **exactly 5.59 / 6.17 / 5.75 in both themes**, on a freshly rebuilt stylesheet,
with the round-3 baselines reproducing in the same run. The three classifier changes are sound and I
probed each for the bypass the coordinator asked about — the alpha bound and the `var(--sm-panel*)`
lookahead both behave as documented, and the one residual bypass I found has no live instance and is a
one-line follow-up.

### Round-3 items vs the round-4 diff

| # | Round-3 item | Status | Evidence |
|---|---|---|---|
| 1 (blocking) | The two "fixed" surfaces still failed AA | **DONE, re-measured by me** | `Sidebar.tsx:171` → `text-red-700` / `text-amber-800`; `StateDeltaCard.tsx:89` → `text-amber-800`. Measured with my own method against the app's own rebuilt `dist/assets/index-att5DMP2.css`, canvas-resolved, alpha-composited through the `bg-amber-500/10` tint (`r4-colors.mjs`) — table below. Both files' comments now state the before/after ratios at the site. |
| 2 | Bound the fractional-opacity carve-out | **DONE** | `theme-convention.test.ts:294` (`FRACTIONAL_DARK_BG_SOLID_THRESHOLD = 60`) and the alpha parse in `hasSolidDarkBg`. Probed (`scanner4.ts`): `/95` → **1**, `/60` → **1**, `/59` → **0**. Fixtures for both directions ship at `:626-644`. |
| 3 | `dark:bg-[var(--sm-panel*)]` misclassified as dark | **DONE, and narrow** | `DARK_BG_TOKEN_SRC`'s negative lookahead (`:260`) plus `INVARIANT_BG_VAR_RE` (`:300`) feeding `hasOwnSolidBg` (`:381`). Probed: `dark:bg-[var(--sm-panel)]` → 0, `dark:bg-[var(--sm-panel-2)]` → 0, and — the check that matters — **`dark:bg-[var(--sm-ink)]` → 1**, so this is not an "any `var()`" escape hatch. The shipped guard fixture (a real `dark:bg-zinc-900` next to a `dark:bg-[var(--sm-panel)]` in one className → 1 violation) is the right test to have written. |
| 4 | `>=` gave up the second signal | **DONE** | `assert.equal(violations.length, 65)` and `assert.equal(violations.length, 1)`, with a failure message that says *"measured floor … re-measure by hand and re-pin, do not loosen this back to `>=`"* — which keeps round 3's honest framing (the number is what THIS walk sees, not a completeness claim) while restoring the both-directions signal. My independent run of the shipped detector: **ScriptDoctorPanel 65, ScriptIDE 1, Sidebar 0, StateDeltaCard 0** — the pins are exact. |

`tests/core/theme-convention.test.ts` → **27/27** (was 22/22).

### The three ratios, re-measured (`r4-colors.mjs`, stylesheet `index-att5DMP2.css`)

| node | round-3 (before) | round-4 (shipped) |
|---|---|---|
| `Sidebar.tsx:171` count at limit — `text-red-500` → `text-red-700` | 3.32 | **5.59** |
| `Sidebar.tsx:171` count near limit — `text-yellow-600` → `text-amber-800` | 2.56 | **6.17** |
| `StateDeltaCard.tsx:89` Dramatic Irony — `text-amber-700` → `text-amber-800` on `bg-amber-500/10` | 4.08 | **5.75** |

Identical to the tenth in light and dark (the surfaces are invariant, which was the point), and the
round-3 baselines re-measured in the same run at 3.32 / 2.56 / 4.08 — so both the problem and the fix
reproduce from one command. `text-amber-800` is the token round 1 already uses for SlatePanel's
"solid" health band; no new colour entered the system.

### Soundness of the classifier changes (the two questions asked)

**Does the lookahead exclude only `--sm-panel` / `--sm-panel-2`?** Effectively yes, and it is narrow in
the direction that matters: other `--sm-*` background vars are still treated as dark
(`dark:bg-[var(--sm-ink)]` → 1). The lookahead is a *prefix* match (`(?!\[var\(--sm-panel`) while
`INVARIANT_BG_VAR_RE` requires the exact `--sm-panel` or `--sm-panel-2` with its closing `)]`, so the
two disagree on a hypothetical `dark:bg-[var(--sm-panelXYZ)]`: excluded from the dark regexes by the
lookahead, not matched by the invariant RE either, so it falls through to `inherit` rather than
`safe`. No such token exists (`grep -rho "dark:bg-\[[^]\"'\`]*\]" src` → one hit, `dark:bg-[var(--sm-panel)]`).
See follow-up 1.

**Can the alpha threshold be bypassed by arbitrary-value syntax?** Two of the three spellings I tried
**over**-catch, which is the safe direction: `dark:bg-zinc-900/[0.95]` → 1, `dark:bg-[#18181bF2]` → 1.
One bypasses: **`dark:bg-[rgb(24_24_27/0.95)]` → 0**. The token regex's character class excludes `/`,
so matching stops at the slash inside the arbitrary value and the trailing `(\/\d{1,3})?` group then
reads `/0` — alpha 0, below the threshold, exempt. No live instance: the only arbitrary-value dark
background in `src` is `dark:bg-[var(--sm-panel)]`, and `grep -rn "dark:bg-\[[^]]*/" src` is empty.
See follow-up 2.

### Non-blocking follow-ups

1. **`theme-convention.test.ts:260`** — tighten the lookahead to `(?!\[var\(--sm-panel(-2)?\)\])` so it
   matches `INVARIANT_BG_VAR_RE` exactly, and the two paths cannot disagree on a future
   `--sm-panel`-prefixed token name.
2. **`theme-convention.test.ts:294` + `hasSolidDarkBg`** — an arbitrary-value dark background carrying its own inline
   alpha (`dark:bg-[rgb(… / 0.95)]`) currently parses as alpha 0 and is exempted. Either add `/` to the
   token's character class so the arbitrary value is consumed whole (it then has no `(\/\d{1,3})` tail
   and is treated as solid — the safe direction, matching the `/[0.95]` and 8-digit-hex behaviour that
   already works), or refuse to classify an arbitrary-value dark background at all. Reproduction:
   `rank-review/scanner4.ts`, first case.
3. *(carried from round 3, still true)* Neither `Sidebar.tsx`'s `nearLimit` caption nor
   `StateDeltaCard` is reached by any step of `verify:a11y`, so nothing gates these three ratios in a
   browser — the source-level scanner pins the *convention*, not the contrast. Worth a step in a later
   round for whichever suite owns those surfaces; not this lane's brief.

Nothing from rounds 1–3 regressed in this diff: it touches only the two colour literals and the
scanner, and the reserved-file counts, the Sidebar/StateDeltaCard violation counts, and the whole
27-test suite all come out where round 3 left them.

---

## Round 5

Same reviewer. Read-only, and — per the coordinator's constraint while the merge gates run
concurrently in that worktree — **nothing was built and no server was started there**. The only
processes I ran against it were file reads, one unit test, and two Node scripts; the colour
measurement used a *copy* of the built stylesheet (`rank-review/r5.css`) rendered in my own browser
context via `setContent`, so no worktree state was touched. `verify:a11y` was NOT re-run for that
reason — the coordinator's own run covers it.

Fifth commit `60bce1a6` on `242386c2` (tag `audit/2026-09-05/a11y-dark-round5`), 2 files, +362.

**Verdict: MERGE.** Both round-4 follow-ups are implemented exactly as specified and I re-probed the
regex myself across ten spellings; the new step 10d drives the **real** components through the real
client code path, asserts on the two specific nodes rather than a section, and the cascade
explanation for the changed numbers is not only right but a genuinely non-obvious catch that
corrects my own round-3/4 harness.

### The three questions

**1. Does the mock exercise the real `StateDeltaCard` render path?** Yes — it mocks the *network
boundary*, not the component. `page10d.route('**/api/live/intent', …)` returns
`{intent, card:{action, effects:[], requiresConfirmation:true, dramaticIrony:true}}`; the real client
effect (`ScriptIDE.tsx:1380-1390`) does `if (data.card && data.card.requiresConfirmation)
setDeltaCard(data.card)` and the real `StateDeltaCard` renders it. I checked the payload against the
route's own contract (`server/routes/live.ts:38-42` returns exactly `{intent, card}`) and against
`server/nvm/live/types.ts:17-23`, where `dramaticIrony`, `dialogue`, `characterBeliefMap`,
`confidenceScore` and `suggestionChips` are all optional — so the mock is a legal, faithful instance
of the real type, not a reduced look-alike. The companion `/api/ai-config` route override keeps every
live field and flips only `llmReady`, which is the flag that effect is gated on. That is the right
seam to mock: any narrower and the surface simply cannot exist in a keyless suite.

**2. Does it assert on the specific nodes, or just "section clean"?** Specific nodes.
`auditElement` is called on `p[id^="count-"]` (the caption itself) and on the Dramatic Irony
callout's own `<div>` (`getByText('Dramatic Irony:').locator('..')` — the element that carries both
`text-amber-800` and `bg-amber-500/10`), once per theme — six scoped axe runs plus six render
assertions. The step also guards against the "passed because it found nothing" failure mode the
round-2 review worried about: `measureContrastNode` reports `nodeCount` alongside the ratio, and both
are logged per node per theme. One honest limit worth naming, not a defect: the measured **ratios are
logged, not asserted** — what gates is axe's own 4.5:1 colour-contrast rule on those scoped elements,
which is the right threshold and does bite (a regression to round 3's 2.56:1 would fail it). The
numbers are evidence; axe is the assertion.

**3. Is the cascade explanation right?** Yes, and it corrects an error in *my* earlier harness.
`design-system.css:154` — `.sm-card{border:1.5px solid var(--sm-hair);background:var(--sm-panel-2);padding:12px}`
— is an unlayered plain-class rule, and `Sidebar.tsx:425` renders the character card as
`<div className="sm-card border-[var(--sm-ink)] bg-[var(--sm-panel)] p-3">`: both on the same element,
so the unlayered `.sm-card` background beats the layered Tailwind utility and the card actually paints
`--sm-panel-2`. My round-3/4 measurements used the file's *root* (`--sm-panel`) as the ancestor, which
is why I quoted 5.59/6.17. Re-measured against the real ancestor (`rank-review/r5-colors.mjs`, on a
copy of the shipped stylesheet, canvas-resolved, alpha-composited):

```
5.80  rgb(151,60,0) on rgb(239,232,215)   near-limit  text-amber-800 on .sm-card
5.26  rgb(193,0,7)  on rgb(239,232,215)   at-limit    text-red-700   on .sm-card
5.75  rgb(151,60,0) on rgb(244,230,203)   Dramatic Irony text-amber-800 on the amber tint
13.74 rgb(33,29,21) on rgb(239,232,215)   (the card's own painted background = #efe8d7 = --sm-panel-2)
```

Identical in light and dark, and exactly the lane's 5.8 / 5.26 / 5.75. All three still clear AA, which
is what round 3's blocking item required; the lane reporting the *lower*, real-DOM numbers rather than
quoting my rosier isolated ones is the right instinct.

### Round-4 follow-ups vs the diff

| # | Follow-up | Status | Evidence |
|---|---|---|---|
| 1 | Tighten the lookahead to the exact `)]` | **DONE** | `theme-convention.test.ts:288` — `(?!\[var\(--sm-panel(-2)?\)\])`. Probed: `dark:bg-[var(--sm-panel)]` → 0, `[var(--sm-panel-2)]` → 0, **`[var(--sm-panelXYZ)]` → 1** (was 0 — a look-alike is now confidently dark rather than falling through to `inherit`), `[var(--sm-ink)]` → 1. The two paths can no longer disagree, and there is a shipped fixture for the look-alike. |
| 2 | Parse alpha inside arbitrary-value brackets | **DONE** | `:288` splits bracket vs named alternatives; `parseInternalAlpha` (`:339`) reads the last internal `/`, normalising 0–1 and 0–100. Probed all four spellings I raised plus six more: `[rgb(24_24_27/0.95)]` → **1** (was 0 — my round-4 bypass, closed), `/0.6` → 1, `/0.59` → 0, `/0.3` → 0, `zinc-900/[0.95]` → 1, `[#18181bF2]` → 1, plain `/95` → 1, `/60` → 1, `/59` → 0, live `dark:bg-red-950/40` → 0. Outer-vs-inner precedence is right too: `[rgb(…/0.95)]/20` → 0, because the outer Tailwind shorthand is what actually controls the rendered alpha. |
| 3 | Gate the two surfaces in a browser | **DONE** | `verify-a11y.mjs:1416-1560` (step 10d) + the shared `measureContrastNode` helper at `:186`. Answers 1 and 2 above. |

`tests/core/theme-convention.test.ts` → **32/32** (was 27/27). I did not re-run `verify:a11y`; the
coordinator's concurrent merge-gate run covers the claimed 117/117.

### Non-blocking

1. **`src/components/Sidebar.tsx:425`** — `bg-[var(--sm-panel)]` on that `.sm-card` element is dead
   code: it never wins the cascade (that is precisely what this round established). Harmless, but it
   is the kind of line that makes the next reader mis-measure the surface the way I did. One-line
   removal for whoever owns Sidebar; out of this lane's scope.
2. Step 10d's ratios are console evidence, not assertions (axe's 4.5:1 rule is the gate). If a future
   round wants the *numbers* pinned rather than the threshold, `measureContrastNode` already returns
   everything needed to `record()` them.
