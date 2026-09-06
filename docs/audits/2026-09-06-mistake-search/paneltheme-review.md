# Independent review — ScriptDoctorPanel / ScriptIDE theme-convention fixes

## Round 1

Reviewer: independent (did not build the change); I am the reviewer who sampled three of the 65 hits
in the a11y-dark lane and measured them at 1.41 / 2.45 / 1.06:1 in dark mode — I re-measured those
same three nodes here. Read-only with respect to the lane's worktree: I never edited it and never
built or booted there. Everything ran from a `git archive 55d792d8 | tar -x` export at
`<session scratch>/paneltheme-export` (node_modules symlinked), built and driven there. The server I
booted was shut down (`shutdown()`; no `server.ts` left with that export as cwd).

Worktree `/home/user/STORYMACHINE/.claude/worktrees/agent-a89809db4272ec6ae`, one commit `55d792d8`
on `6fe6fa6a` (tag `audit/2026-09-06/paneltheme-round1`), 4 files, +656/−155.

**Verdict: MERGE.** This is the strongest lane in the batch so far. I verified the headline claim
independently rather than reading it: the scanner goes **66 → 0** across all 62 `.tsx` files under
`src/components`, the three nodes I personally measured as unreadable are now **13.53 / 5.72 /
16.1:1**, and the worst-20 survey has **zero nodes below 4.5:1 in BOTH themes** — including the light
mode the coordinator worried a darkening fix could regress (light worst **4.63**, on 1021 measured
nodes). Five follow-ups below; none blocks, and the sharpest of them (item 1) is about a duplication
the fix introduced, not about anything a writer can see.

## 1. Brief vs diff

| # | Brief item | Status | Evidence |
|---|---|---|---|
| 1 | Fix every hit in both files — invariant tokens preferred, fully-themed pairs only where the surface is meant to follow the OS theme | **DONE, per site** | `ScriptDoctorPanel.tsx` +363/−… across the IssueCard / RootCauseCard / FixReceiptCard family and the GODMODE structural-analysis cards, each with its own comment naming the choice; `ScriptIDE.tsx:2243-2250` drops `renderTitlePage`'s orphaned `dark:text-white` (the 1.15:1 hit I flagged in a11y-dark round 3). I re-ran the scanner myself over the pre-fix and post-fix trees: **66 → 0**, and the 66 are exactly `ScriptDoctorPanel.tsx` 65 + `ScriptIDE.tsx` 1 — the two allowlisted counts, reproduced independently. |
| 2 | Remove BOTH allowlist entries; keep the lower-bound machinery only if some third file needs it | **DONE, nothing left behind** | `theme-convention.test.ts` — `RESERVED_FILES` and both pinned-floor tests deleted, the zero-tolerance gate renamed to say so, and the removal explained where the set used to be ("if a future file genuinely cannot be fixed … re-add a SET with the file's own §2 evidence — a gate that cannot fail for a file is not a gate"). My whole-tree run confirms there is no third file needing one. 30/30. |
| 3 | MEASURE both themes with Playwright + axe; per-node before/after table for the worst 20 | **DONE, and I reproduced it** | See §2 — my numbers and the lane's agree to within one node's rounding (light worst 4.63 both; dark worst 4.77 mine vs 4.78 theirs — the same two nodes, both above the bar). |
| 4 | Extend `verify-a11y.mjs` with a step auditing the open Doctor panel, all sections expanded, both themes, proven failing first, every wait through `timing.ms()` | **DONE** | Step 11 (`verify-a11y.mjs`, 15 `doctor-full-report-gate` assertions): real multi-scene draft → Run Diagnosis → Full report → Shape & Rhythm, Root Causes, the deterministic "Verify my rewrite" receipt, Draft History, Per-Pass Breakdown, then axe on the whole dialog plus the worst-20 survey, per theme. I grepped the added lines for raw numeric waits — **none**; every timeout goes through `timing.ms()`. Keyless-deterministic: the receipt path is "Verify my rewrite" (server-side fix-delta), and no `/api/analyze-script` or generative route appears in the step. Fail-first log is real (§3). |
| 5 | `theme-convention` fail-first with the real count, then pass | **DONE** | 66 on the unfixed tree (my own run), 0 after; 30/30. |
| — | Constraints | **HELD** | `check-scoring-receipt 6fe6fa6a..55d792d8` → exit 0, "no scoring-path files changed". Changes are classes/tokens plus the two ternary inlinings — no functional edits. |

## 2. Driven myself, both themes (`paneltheme-drive.mjs`, on the export build)

A 14-scene draft → Coverage → Full report, every expandable section opened and the deterministic fix
receipt run, at 1440×1000, canvas-resolved and alpha-composited:

**The three nodes I measured in the a11y-dark review:**

| node | dark, then (my a11y-dark round-3 measurement) | dark, now | light, now |
|---|---|---|---|
| metric-tile value (`text-lg font-bold`) | **1.41** | **13.53** | 20.1 |
| metric-tile caption | **2.45** | **5.72** | 4.63 |
| "Graph Health" / "Character Functions" | **1.06** | **16.1** | 21 |

**Worst 20 in each theme, whole dialog:**

```
LIGHT — 1021 text nodes — 0 of the worst 20 below 4.5 — worst 4.63
        (all twenty are rgb(106,114,130) on rgb(249,250,251): gray-500 on gray-50)
DARK  — 1032 text nodes — 0 of the worst 20 below 4.5 — worst 4.77
        4.77 white on rgb(231,0,11)   <- the inlined "Critical" severity badge, passing
        4.78 rgb(176,42,25) / rgb(118,90,30) on the invariant stamp/amber cards
        4.81 "Introduced (0)"   5.00 "Cleared (0)"
```

Zero console errors on the driven page. The coordinator's specific worry — that darkening text for
dark mode could regress light mode on an invariant cream panel — does **not** materialise: light's
worst node is 4.63 and every one of its worst twenty is the same gray-500-on-gray-50 pair, i.e. the
fix landed on themed pairs, not by darkening invariant surfaces. The gate's own final log
(`REBASED-verify-a11y.log`, 134/134, zero `[FAIL]`) records light 4.63 / dark 4.78 — matching my
independent run.

## 3. Fail-first: are the three failures the ones I would expect?

`gate-logs/verify-a11y-FAIL-FIRST.log` — **131/134**, exactly three:

```
[FAIL] light: worst-20 survey — 10/20 below 4.5:1 — worst 2.27:1
[FAIL] dark-doctor-full-report-EXPANDED :: axe — serious:color-contrast(10)
[FAIL] dark:  worst-20 survey — 20/20 below 4.5:1 — worst 1.04:1
```

Yes: the two surveys plus the scoped axe run, which are precisely the three assertions step 11 adds
that can see a contrast defect. `1.04:1` is the same order as the `1.06` I measured by hand on
"Graph Health", from the same family of cards. Note the log shows **light was broken too** (10/20
below, worst 2.27) — the report's summary mentions only the dark survey; saying both makes the
before/after stronger, not weaker (follow-up 5).

## 4. The two "redundant bg" roots — is the paint really invisible, and is this a scope limit?

**Invisible: yes, verified in source and on screen.** `FixStructuralSignalsStrip` and `FixDeltaList`
each gained `bg-gray-50 dark:bg-zinc-800` on their own root. Every enclosing card at every call site
is *byte-identically* `bg-gray-50 dark:bg-zinc-800` — `ScriptDoctorPanel.tsx:2382`, `:2413`, `:2455`
(the FixReceiptCard family), wrapping the call sites at `:2435`, `:2514`, `:2520-2521`. So the child
paints the same colour its parent already painted, in both themes, and my measurements agree: the
text in both components composites onto `rgb(249,250,251)` in light and `rgb(39,39,42)` in dark —
gray-50 and zinc-800 — exactly the parent's colours. No visual change.

**Scope limit: yes, and it is disclosed in the wrong place.** The mechanism (the walk evaluates each
top-level function's JSX from the file's root defaults, with no notion of the ambient a caller
renders it on) is explained at length in the round-6 narrative note and in each component's own
comment — but the file's numbered "three deliberate scope limits" block, where a future reader
actually looks, still lists three. This is a fourth, and it cuts *both* ways (a correct component can
look broken; a broken one can look clean). See follow-up 3.

## 5. The inlined severity badges — subtraction, or duplication?

Not subtraction: `SEVERITY_META` is untouched (`:211-218`) and its `badge` field is **still consumed**
— `SeverityChip` at `:1825` still renders `${meta.badge}`. What the change actually does is turn one
source of the badge palette into **three**: the object, IssueCard's ternary (`:1866-1872`) and
RootCauseCard's ternary (`:1969-1975`). I checked the strings: all three carry
`bg-red-600 text-white` / `bg-amber-500 text-black` / `bg-zinc-400 text-black`, byte-identical today,
and the rendered result is right (white-on-red-600 measured **4.77** in the live dialog). But nothing
pins them together, so editing `SEVERITY_META` now silently leaves two badges on the old palette —
in the very file this lane just spent 65 fixes on, and against the owner rule's "one feature that
does it all beats N copies."

Worth naming *why* `SeverityChip` was left alone: it is its own top-level function with no
`dark:bg-*` ancestor **in the walk's file-root-relative view**, so the scanner never flagged it. The
inlining was therefore driven by scanner visibility, not by correctness — which is also the tell for
follow-up 2.

Tests I ran on the export: `theme-convention` **30/30**, `shape-rhythm-panel-copy` **44/44**,
`check-scoring-receipt` **0**, `npm run build` **0**.

## 6. Follow-ups (numbered, none blocking)

1. **Pin the three copies of the severity palette together, or reduce them to one.**
   `ScriptDoctorPanel.tsx:215-217` (`SEVERITY_META`), `:1866-1872` (IssueCard), `:1969-1975`
   (RootCauseCard) now hold the same three class pairs independently, and `:1825` (`SeverityChip`)
   still reads the object — so the file is inconsistent *and* unpinned. Cheapest honest fix: a test
   asserting the ternaries' three strings equal `SEVERITY_META`'s three `badge` values (a source
   match in the style this file's own tests already use), so a palette edit fails loudly. Better, if
   the appetite exists: leave the product code alone and teach the scanner the shape instead —
   editing shipping code to satisfy a static analyser is the tail wagging the dog, and this lane did
   it twice (here and the two redundant backgrounds).
2. **Correct the scanner's documented limit #2.** The header says a bare-identifier `className`
   "cannot produce a false positive, only a possible missed case." The severity badges disprove it:
   `${meta.badge}` resolves at runtime to a correct, self-contained `bg-*/text-*` pair, and the walk
   flagged the span anyway because it could not see the colour. That is a false positive of exactly
   the kind the sentence rules out — and it is what forced this round's inlining. One sentence.
3. **Promote the fourth scope limit into the numbered list.** The "reusable component evaluated from
   file-root defaults" mechanism is currently only in the round-6 narrative and the two component
   comments; the numbered block still says three. Add it, with the note that it can make a correct
   component look broken *and* a broken one look clean — which is why the two redundant backgrounds
   exist.
4. **Merge-conflict warning (orchestrator).** This lane branched from `6fe6fa6a`, before the
   signal-precision lane landed. Both lanes edit `FixStructuralSignalsStrip`: this one adds the
   redundant `bg-gray-50 dark:bg-zinc-800` root and rewrites its comment block; the other replaces
   its `pair()`/`toFixed(2)` body with `formatSignalDelta`. In the export I reviewed, the old
   `pair()` is still present — both changes must survive the rebase onto `c9bbc673`. (The lane is
   rebasing concurrently; worth a targeted re-check of that one function post-rebase.)
5. **Report nit:** the fail-first summary names only the dark worst-20 (20/20 below, worst 1.04).
   The log also shows light failing 10/20 with a 2.27 worst. Both belong in the before/after.
