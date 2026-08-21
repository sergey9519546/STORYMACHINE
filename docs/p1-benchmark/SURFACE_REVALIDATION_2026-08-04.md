# Surface re-validation — P2/P3 DONE claims vs. the current tree (2026-08-04)

**SUPERSEDED VALUE NOTE (later same day, 2026-08-04):** every contentHash /
health / verdict / totalIssues figure below (`33dcf214…` / `68.9` /
`CONSIDER` / `200`) describes the run against the "The Second Key" sample,
before that day's later stimulus swap to "Dead Frequency" (health 78.3,
contentHash `a1b44eff859d…`) — see
`docs/user-validation/FIELDING_DECISION_BRIEF.md`'s "RESOLVED" addendum. The
89/89 pass count and every structural (P2/P4-instrumentation) finding below
are unaffected — re-run post-swap and confirmed still 89/89 with the new
values substituted (this script derives its own checks from whatever
`src/lib/sample-script.ts` currently contains, so no script edit was
needed).

**Scope note:** this is NOT `PATH_TO_DONE.md` task 6 ("re-validate P2/P3
against what P0/P1 learn") — that task is evidence-driven and correctly
NOT STARTED, since no P0 session or P1 human-label evidence exists yet.
This document is narrower: P2 and P3 were marked DONE on 2026-07-29, and
this week's tree saw the 1-based scene migration, the ultrareview merge (42
files), an architecture-deepening merge (42 more), a11y focus-trap
restructuring of ScriptIDE's modals, and CoverageSummary changes — nobody
had re-run a browser check against the post-churn tree. This is that check.

**Commit:** the task specified `26240a5` as the reference point. Repo HEAD
advanced to `d1fe38d` partway through this session via a concurrent sibling
commit (`p1: D3 reversal detector built unwired`, touching only
`server/nvm/analyze/**`) — unrelated to the ScriptIDE/Toolbar/App.tsx/export/
verify/events surfaces this script exercises. The verdicts below hold for
both commits.

**Tool:** `scripts/verify-p2-p3-surfaces.mjs` — a real headless-Chromium run
against the app plus a static import-graph cross-check, no LLM key. Not
wired into CI (no browser there); run by hand:

```
PW_CHROMIUM_PATH=/opt/pw-browsers/chromium node scripts/verify-p2-p3-surfaces.mjs
```

Ran clean twice in direct succession: **88/89 assertions passed both runs**,
identically. The one failure is a real finding (below), not flake — see
"Stability" at the end.

---

## Verdicts

| Phase | Verdict |
|---|---|
| **P2** — collapse to Doctor + Editor | **DONE claim holds, with one regression found and reported (not fixed — see below).** The default surface is genuinely Doctor + Editor: every one of the ~38 StoryMachine.tsx research panels is reachable only through the Labs flag, both statically (import-graph) and live (Toolbar overflow items absent with Labs off, present with Labs on). The one exception is narrow and does not leak OASIS/NVM jargon — see Finding 1. |
| **P3** — shareable, verifiable coverage report | **DONE claim holds as of 26240a5 / d1fe38d.** The full round trip (sample coverage → export → paste into `#verify` → match; alter one character → mismatch) reproduced exactly, twice, with zero discrepancies. |
| **P4-prep** — events instrumentation | **Live.** `doctor_run` / `export_report` / `first_report` / `verify_run` all fire, both observed on the wire and reflected in `GET /api/events/summary`'s counters, `exportRate`, and `avgTimeToFirstReportMs`. Confirmed the documented null-before-first-run behavior at server boot. |

---

## P2 — assertion detail

**Static cross-check** (import-graph BFS from `App.tsx`, no browser): every
`.tsx`/`.ts` file under `src/components/**` is reachable either (a) on the
default path (outside `StoryMachine.tsx`) or (b) exclusively through
`StoryMachine.tsx`, itself gated by `App.tsx`'s
`effectiveShowStoryMachine = labsEnabled && showStoryMachine`. **Zero dead
files** (nothing unreachable from `App.tsx` at all) and **zero panels
reachable outside both the default path and the Labs gate.** All ~38
research-panel files (`ArcCompletionPanel.tsx`, `CausalTwinPanel.tsx`,
`ConvergePanel.tsx`, `EpistemicMapPanel.tsx`, `RoomPanel.tsx`,
`WhatIfPanel.tsx`, etc.) fall into the second category. This is a plain
import-graph fact, not a claim about what each file's UI actually shows —
see the caveat under Finding 1.

**Live checks, Labs OFF (fresh profile):**
- StartScreen offers "Try sample coverage" — PASS.
- StartScreen's "Advanced: Simulation" (the Labs-gated OASIS entry point) is
  absent — PASS (0 matches).
- Toolbar overflow menu: "Open Studio" / "Director HUD" / "Slate compare" /
  "Open Simulate" are all absent — PASS (4/4). "Labs & Settings" stays
  reachable, so a writer can turn Labs on without first hitting a gated
  surface — PASS.

**Live checks, Labs ON (fresh profile, `sm_labs_enabled=true`):**
- StartScreen's "Advanced: Simulation" appears — PASS.
- Clicking it reaches the OASIS surface (body text carries "Story Machine" +
  "Agents") — PASS. This is the "gate is the flag, not dead code" proof the
  task asked for: the exact same build that hides these surfaces with Labs
  off shows them with Labs on.
- Toolbar overflow: all four gated items now present — PASS (4/4).

### Finding 1 — Ship task tab bypasses the Studio Labs gate (regression, not fixed)

`ScriptIDE.tsx`'s `handleTaskChange` (the handler behind the always-visible,
never-gated "Ship" task tab in `Toolbar.tsx`'s `TASKS` array) does:

```ts
} else if (next === "ship") {
  setToolSlot("studio");
  setActiveTab("versions");
  setCoverageFull(false);
}
```

`toolSlot === "studio"` is the *same* panel `Toolbar.tsx`'s "Open Studio"
overflow item opens — and that overflow item IS correctly wrapped in
`{labsEnabled && (...)}`. Live-verified: with Labs OFF, clicking the "Ship"
task tab opens the Studio panel anyway, with tabs `Production / Analysis /
Engine / Codex / Research / Title / Versions` all clickable — no Labs check
anywhere in this path.

**Severity assessment, not a fix:** the Studio panel's tab content was
checked live against an OASIS/NVM jargon regex (`OASIS`, `NVM`, "causal
twin", "epistemic map", "converge panel", "fixed-points", "self-play",
"agent roster") and matched nothing — PASS on that narrower check. The
panel's "Research" tab is `ResearchNotes.tsx` (the writer's own freeform
story notes), not an NVM/OASIS research panel; "Engine" is `AIPanel.tsx` (a
world/dialogue/tension/character co-writing assistant, keyless-safe); the
rest is Production/Codex/Title/Versions script-management chrome. So this
does **not** violate the P2 exit gate's literal wording ("zero exposure to
NVM/converge/twin/simulation jargon") — but it does contradict the
narrower, explicit claim that Studio is a Labs-gated slot: the Toolbar's
"Open Studio" gate is provably not the only door, which is exactly the kind
of inconsistency `docs/PATH_TO_DONE.md` task 6 exists to eventually catch.
Whether the fix is "gate the Ship task's `setToolSlot("studio")` too" or
"stop treating Studio as Labs-gated and rename/scope the overflow item
instead" is a product decision (what should Ship-tier writers see without
Labs?), not a small, unambiguous code change — reported rather than fixed,
per this task's scope.

**Where:** `src/components/ScriptIDE.tsx`, `handleTaskChange`'s `"ship"`
branch (search `setToolSlot("studio")`); the correctly-gated comparison
point is `src/components/scriptide/Toolbar.tsx`'s `{labsEnabled && (...)}`
block around the Studio/Director/Slate `OverflowItem`s.

---

## P3 — verify-loop assertion detail

Full round trip, driven with the exact text of the built-in sample script
(`src/lib/sample-script.ts`, "The Second Key", read directly rather than
scraped from the DOM, so the comparison text is byte-identical to what the
server actually analyzed):

1. StartScreen → "Try sample coverage" → `/api/scriptide/doctor` 200 →
   CoverageSummary renders a verdict — PASS.
2. "Full report" → ScriptDoctorPanel dialog opens → "Run Diagnosis" (the
   dialog's own diagnosis, since it mounts with `autoLoadSample={false}`) →
   report renders — confirmed via the Export button becoming available.
3. "Export coverage report as an HTML document" → downloads a 211,403-byte
   HTML file — PASS.
4. The exported file carries the full 64-hex verify block: contentHash
   `33dcf21462118381ae1941b79240ffd441b0469f5f12dc997110c9bf9186004f`,
   health `68.9`, verdict `CONSIDER`, totalIssues `200` — PASS.
5. Navigate to `#verify`, paste the same script text + those four claimed
   values, submit → server response `verified: true`, `mismatches: []`,
   recomputed values byte-identical to the export's claims — PASS. UI shows
   the "Verified" heading — PASS.
6. **Negative test:** insert one character into the pasted script text
   (same claimed hash/health/verdict/totalIssues), submit again → server
   response `verified: false`, `mismatches` contains `contentHash`
   (expected `33dcf214…`, actual `7db6d103…`) — PASS. UI shows "Does not
   match" — PASS.

No false positive, no false negative, reproduced identically on both runs.
This is the first time this exact loop (export → `#verify` → paste →
compare, plus the negative case) has been driven end-to-end in a real
browser rather than only through `tests/routes/export-verify.test.ts`'s
server-side-only coverage.

---

## P4-prep — events instrumentation detail

Baseline immediately after server boot, before any browser action:
`counts` all zero, `exportRate: null`, `avgTimeToFirstReportMs: null` —
PASS (confirms the documented null-before-first-run behavior).

Around the P3 flow above (`GET /api/events/summary` before/after, plus live
network observation of `POST /api/events` request bodies):

| Event | Before | After | Network-observed |
|---|---|---|---|
| `doctor_run` | 0 | 1 | yes |
| `first_report` | 0 | 1 | yes |
| `export_report` | 0 | 1 | yes |
| `verify_run` | 0 | 2 (positive + negative call) | yes |

After: `exportRate: 1` (1 export / 1 doctor run), `avgTimeToFirstReportMs:
~607–641ms` across the two runs (time from app-module-load to the first
successful Doctor run in that browser session). Matches
`server/routes/events.ts`'s documented formulas exactly.

The P2 flow (StartScreen checks, Toolbar overflow checks, the Ship-task
finding) deliberately never calls the doctor route, so it does not move
these counters — confirmed implicitly by the P3 baseline reading zero
immediately before the sample-coverage click.

---

## Stability

Ran twice back to back, `PW_CHROMIUM_PATH=/opt/pw-browsers/chromium node
scripts/verify-p2-p3-surfaces.mjs`: **88/89 both times**, same single
failure (Finding 1), same contentHash, same health/verdict/totalIssues, zero
genuine browser console errors both runs. Exit code 1 both times — correct,
since Finding 1 is a real (if narrow) P2 gating inconsistency and the script
is written to fail non-zero on it rather than average it away.

## Verify / build gates

- `npm run lint` — 0 errors (`tsc --noEmit` clean).
- `npm test` — 0 failures (10180 passed, 78 skipped, 2 todo, 10260 total).
  Full suite, not scoped to this change — this session touched no
  `server/**` or `src/**` production code, only the new verification script
  and this doc.
- `honesty-audit`/`check-docs` scope note: `scripts/honesty-audit.mjs`
  deliberately excludes `docs/**` by construction (see its own header
  comment) — this file was never in its scan surface, so "honesty-audit
  passes" holds trivially. `check-docs-quality.ts` was run directly against
  this file since `npm run check-docs -- --all` only scans a fixed root-doc
  list, not `docs/**`:

  ```
  node --experimental-strip-types scripts/check-docs-quality.ts docs/p1-benchmark/SURFACE_REVALIDATION_2026-08-04.md
  ```

## Re-run command

```
PW_CHROMIUM_PATH=/opt/pw-browsers/chromium node scripts/verify-p2-p3-surfaces.mjs
```

Exit 0 only once Finding 1 (or any future regression it catches) is
resolved and no assertion fails. Not wired into `npm test` — CI has no
provisioned browser, matching `scripts/verify-focus-traps.mjs`'s precedent.

---

## Addendum (2026-08-04) — Finding 1 resolved: ACCEPT CURRENT BEHAVIOR

**Decision (maintainer-delegated):** the Ship/Studio Labs-gate bypass
documented as Finding 1 above is resolved as **ACCEPT CURRENT BEHAVIOR**,
not fixed. The always-visible "Ship" task tab keeps opening the Studio
panel (`toolSlot="studio"`) with Labs off; the Toolbar's Labs-gated "Open
Studio" overflow item stays as-is, i.e. a second, redundant door onto the
same panel rather than the only one. `scripts/verify-p2-p3-surfaces.mjs`
was rewritten accordingly (detail below) and now passes 89/89.

### Rationale, verified rather than assumed

The task delegating this decision offered three supporting points. Each was
checked directly against source before being restated here, per this
session's instruction not to parrot them on faith.

**1. Removing the Ship tab risks removing load-bearing functionality.**
Verified true, with one nuance. `ScriptIDE.tsx`'s Title tab
(`activeTab === "titlePage"`, the title/author/contact editor at
`renderTitlePage()`) is reachable from exactly one `setActiveTab("titlePage")`
call site — the Studio panel's own tab-button row (`ScriptIDE.tsx:2120`),
which only renders when `toolSlot === "studio"` (`ScriptIDE.tsx:2086`).
`toolSlot` is set to `"studio"` from exactly two places in the whole tree:
`Toolbar.tsx`'s Labs-gated `"Open Studio"` overflow item (via
`openToolSlot("studio")`) and `handleTaskChange`'s `"ship"` branch
(`ScriptIDE.tsx:1187`, behind the always-visible Ship task tab). No other
button, route, or default-surface affordance sets `toolSlot` to `"studio"`
or `activeTab` to `"titlePage"`. **So for Title editing, Ship→Studio is
genuinely the only default-surface (Labs-off) path** — gating Ship without
another door would make title/author/contact editing Labs-only, which is
exactly the kind of core Editor affordance the task's rationale describes
as load-bearing, and lines up with the title-page-persistence data-loss fix
landed this same week.

For Versions, the claim holds for the load-bearing half but not
monolithically — worth reporting honestly rather than restating flat. The
Ship task tab's own toolbar row (rendered when `task === "ship"`, which is
a *separate* piece of state from `toolSlot`) includes a "Snapshot" button
(`ScriptIDE.tsx:1854`, `onClick={takeSnapshot}`) that saves a new version
snapshot without ever opening the Studio subpanel or setting
`toolSlot === "studio"`. So "save a version" has a path that doesn't route
through the Studio panel specifically. It is, however, still gated by
clicking the same always-visible Ship tab, not an independent bypass of
Ship itself — the decision is about the Ship gate as a whole, not about
Studio's Versions tab in isolation, so this doesn't undercut the rationale.
What genuinely is Ship→Studio-only is *viewing, restoring, or deleting*
existing versions: `SnapshotManager`'s full list only mounts with
`hideList={false}`, which only happens when `toolSlot === "studio" &&
activeTab === "versions"` (`ScriptIDE.tsx:2611-2626`) — everywhere else it
mounts with `hideList` (modals only, no list, no restore/delete). So the
read/restore/delete half of version management is exactly as load-bearing
and exactly as Ship-gated as Title; only "create a new snapshot" has a
second entry point, and that entry point is still behind Ship, not a way
around it.

One adjacent observation, out of scope for this decision but worth flagging
for a future pass: that same Ship-tab toolbar row also has a "Simulate"
button (`handleSimulateScript`, `ScriptIDE.tsx:1463`) that posts to
`/api/reset` and builds an OASIS-style agent scenario — a Labs-agnostic path
to the same simulate action that otherwise requires Labs ON (StartScreen's
"Advanced: Simulation" / Toolbar's "Open Simulate" overflow item). It
doesn't open a panel and wasn't part of Finding 1's `toolSlot="studio"`
reachability question, so it isn't covered by today's assertion rewrite —
noting it here so it isn't lost.

**2. The live-verified content is Production/Analysis/Codex/Research-notes/
Title/Versions — none of the 38 Labs-gated research panels.** Confirmed:
this is the same `OASIS_JARGON_RE` check the original Finding 1 already ran
(`OASIS`, `NVM`, "causal twin", "epistemic map", "converge panel",
"fixed-points", "self-play", "agent roster"), re-run against the Ship-opened
Studio panel's body text on both stability runs below — zero matches both
times. Re-reading the tab list itself (`ScriptIDE.tsx:2107-2116`:
Production/Analysis/Engine/Codex/Research/Title/Versions) against the ~38
files gated exclusively behind `StoryMachine.tsx` (the static cross-check's
`labsOnlyViaStoryMachine` set) confirms none of the seven tabs' backing
components appear in that set — "Engine" is `AIPanel.tsx` (a co-writing
assistant), "Research" is `ResearchNotes.tsx` (freeform writer notes), the
rest is script-management chrome. Holds.

**3. The Toolbar's Labs-gated "Open Studio" is a shortcut, not the sole
gate.** Confirmed directly from point 1's source read: two independent call
sites (`openToolSlot("studio")` from the Labs-gated overflow item,
`handleTaskChange`'s `"ship"` branch from the ungated Ship tab) both set the
same `toolSlot === "studio"` state. Neither is downstream of the other, so
"shortcut, not sole gate" is a literal description of the code, not a
reframing.

**Net assessment:** all three points check out against source. The one
place the rationale needed sharpening rather than just restating is
Versions' "save" affordance having a second entry point — but since that
entry point is still inside the Ship tab (not a way to reach version-saving
with Labs off *and* without clicking Ship), it doesn't weaken the "Ship is
the door" framing the decision rests on.

### What the reshaped assertion now protects

The two assertions previously logged under `P2-finding` (one of which was
Finding 1's deliberate, permanent FAIL) are now logged under `P2-decision`
and both PASS by encoding the accepted decision as the expected state,
while remaining live tripwires:

1. **Ship reachability with Labs off must stay true.** The assertion now
   asserts `studioReachableViaShip === true` (inverted from the pre-decision
   version, which asserted the opposite). If a future change guards the
   Ship tab's `setToolSlot("studio")` call — silently reversing today's
   accepted decision without updating this document — this assertion flips
   to FAIL, forcing whoever made that change to reconcile it with the
   decision recorded here rather than have it pass unnoticed.
2. **The panel it opens must carry zero OASIS/NVM jargon.** Unchanged in
   substance from the original Finding 1 check, but now framed explicitly
   as the condition the accept decision depends on: if a future change ever
   routes an actual gated research panel through the Ship→Studio door (not
   just Production/Analysis/Codex/Research-notes/Title/Versions), this
   assertion fails loudly, because that would violate the P2 exit gate the
   whole decision was conditioned on holding.

Both assertions' messages cite this addendum's decision date (2026-08-04)
and this document's filename directly, so a future reader who lands on a
failing assertion finds the reasoning in one hop instead of having to
reconstruct it.

### Stability — post-fix runs

Ran `PW_CHROMIUM_PATH=/opt/pw-browsers/chromium node
scripts/verify-p2-p3-surfaces.mjs` four times total while making this
change. Two consecutive runs at the end, back to back: **89/89 both times**,
exit code 0 both times, same `P2-decision` PASS lines, same P3 contentHash/
health/verdict/totalIssues as the original revalidation
(`33dcf21462118381ae1941b79240ffd441b0469f5f12dc997110c9bf9186004f` / `68.9`
/ `CONSIDER` / `200`), zero genuine browser console errors both runs.

For full honesty: one of the four total runs (the second of the four, not
one of the two consecutive stability runs reported above) failed at 69/70
on an unrelated, pre-existing flake — "P3 :: Sample coverage produces a
rendered verdict" timed out, which then cascaded into a `Full report`
button wait failing and aborting the rest of that run early (hence 70
total instead of 89 — the crash happened mid-run, not a clean stop). This
is the same kind of DOM-timing flake the original document's own
`waitForTimeout(400)` calls are already exposed to; it reproduced on
neither the run immediately before nor the two runs immediately after, and
it has nothing to do with the `P2-decision` assertions changed today (both
of those had already recorded PASS before the crash in that run). Not
swept under the rug — flagged here in case a future session sees it
recur and needs a starting pointer.

### Verify / build gates (this addendum)

- `PW_CHROMIUM_PATH=/opt/pw-browsers/chromium node
  scripts/verify-p2-p3-surfaces.mjs` — 89/89, exit 0, run twice consecutively
  for stability (see above).
- `npm run lint` — 0 errors (`tsc --noEmit` clean).
- `npm test` — 0 failures (10195 passed, 78 skipped, 2 todo, 10275 total).
  Full suite; this change touched only `scripts/verify-p2-p3-surfaces.mjs`
  and this doc, no `server/**` or `src/**` production code.
- `honesty-audit`/`check-docs` — same scope note as the original document:
  `scripts/honesty-audit.mjs` excludes `docs/**` by construction, so it
  passes trivially on this file; `check-docs-quality.ts` was run directly:
  `node --experimental-strip-types scripts/check-docs-quality.ts
  docs/p1-benchmark/SURFACE_REVALIDATION_2026-08-04.md` → "No AI writing
  patterns detected. Documentation is clean!"

## Addendum (2026-08-04, Lane E) — flagged "Simulate" leak CLOSED

The item noted above as out of scope for a future pass — the Ship-tab
toolbar row's "Simulate" button (`ScriptIDE.tsx:1463`,
`handleSimulateScript`) rendering unconditionally, a Labs-agnostic path to
the same simulate action that otherwise requires Labs ON — is now closed.

### Fix

`src/components/ScriptIDE.tsx`'s Ship-task action strip (the `task ===
"ship"` branch of the director's-slate row, `ScriptIDE.tsx:1845` onward)
wraps the "Simulate" `<button>` in `{onOpenStoryMachine && (...)}` — the
exact same truthiness gate already used by:

- `scriptide/Toolbar.tsx`'s "Open Simulate" overflow item
  (`{onOpenStoryMachine && (<OverflowItem label="Open Simulate" ... />)}`,
  `Toolbar.tsx:469`), and
- `StartScreen.tsx`'s "Advanced: Simulation" button (`{onOpenStoryMachine &&
  (...)}`, `StartScreen.tsx:361`).

No new state was introduced. `App.tsx` only ever passes a real
`onOpenStoryMachine` callback into `ScriptIDE` when `labsEnabled` is true
(`onOpenStoryMachine={labsEnabled ? () => setShowStoryMachine(true) :
undefined}`, `App.tsx:217`); with Labs OFF the prop is `undefined`, so the
new conditional collapses the button out of the tree along with every
other Labs-gated control that already keys off this same prop. The button
itself, and `handleSimulateScript`, were left otherwise untouched — this is
a visibility gate, not a deletion, per the standing deletion moratorium.

One button was found to be genuinely out of scope for this fix and is
called out rather than silently left alone: `scriptide/Toolbar.tsx:333-349`
has its own persistent "Simulate" control (Sparkles icon, `aria-label`
"Simulate in Story Machine") in the always-visible top nav bar, disabled
only by `isSimulating || !onSimulateScript`. `ScriptIDE.tsx` passes
`onSimulateScript={handleSimulateScript}` to `Toolbar` unconditionally
(`ScriptIDE.tsx:1757`), so that control is *also* Labs-agnostic today. It is
a distinct element from the one this addendum's originating note flagged
(a different row, a different accessible name — `aria-label` overrides its
visible "Simulate" text, so it did not collide with the new assertions
below) and was not part of this task's scope. Flagging it here so it is not
lost, matching this document's own established practice for adjacent
findings.

### New verify-script assertions

`scripts/verify-p2-p3-surfaces.mjs` gained two `record(...)` calls in the
existing `P2` phase, mirroring the file's established Labs-OFF/Labs-ON pair
pattern:

- Labs OFF (CONTEXT A, immediately after the existing Ship-tab/Studio-bypass
  checks): `Ship toolbar row: "Simulate" button ABSENT with Labs OFF
  (closes SURFACE_REVALIDATION_2026-08-04.md flagged item)` — asserts
  `page.getByRole('button', { name: 'Simulate', exact: true })` has zero
  matches while the Ship tab is open.
- Labs ON (CONTEXT B, after the existing Toolbar-overflow-ON checks): `Ship
  toolbar row: "Simulate" button (reachable equivalent) APPEARS with Labs
  ON` — clicks the Ship task tab, then asserts the same locator becomes
  visible.

Both assertions use `exact: true` specifically so they do not collide with
the unrelated `Toolbar.tsx` "Simulate in Story Machine" control noted above
— confirmed live (see run below): the new assertions passed independently
of that control's presence.

### Verify / build gates (this addendum)

- `PW_CHROMIUM_PATH=/opt/pw-browsers/chromium node
  scripts/verify-p2-p3-surfaces.mjs` — **91/91**, exit 0 (up from 89/89;
  the two new assertions above both PASS). Zero genuine browser console
  errors.
- `PW_CHROMIUM_PATH=/opt/pw-browsers/chromium node
  scripts/smoke-p0-live-flow.mjs` — PASS, exit 0 (`verdict=CONSIDER,
  health~78`, zero genuine console errors).
- `npm run lint` — 0 errors (`tsc --noEmit` clean).
- `npm test` — 0 failures (10261 passed, 78 skipped, 2 todo, 10341 total).
  No test exercises `ScriptIDE.tsx`'s Ship-row JSX directly (the existing
  `tests/core/scenario-from-script.test.ts` and `tests/core/core-0{1,2,3}
  .test.ts` cover the pure `buildScenarioFromScript` logic
  `handleSimulateScript` calls, unaffected by this visibility-only change);
  behavioral proof for the gate itself is the live browser run above, not a
  unit test.
- Files changed: `src/components/ScriptIDE.tsx`,
  `scripts/verify-p2-p3-surfaces.mjs`, this document.

### Addendum — 2026-08-04 (same day, follow-up): the adjacent persistent-Toolbar Simulate control is ALSO closed

The adjacent finding logged above (the persistent top-Toolbar "Simulate"
control, aria-label "Simulate in Story Machine",
`scriptide/Toolbar.tsx` — Labs-agnostic because `ScriptIDE.tsx` passed
`onSimulateScript` unconditionally) did not wait for a future pass. It is
now gated by the same mechanism at both ends: `ScriptIDE` withholds the
handler entirely unless `onOpenStoryMachine` is truthy (i.e. Labs is on),
and `Toolbar` hides — not merely disables — the control when no handler is
supplied, so no research affordance survives on the default Doctor+Editor
surface.

Verified in a real browser: `verify-p2-p3-surfaces.mjs` grew 91 → 93
(persistent control ABSENT with Labs OFF, APPEARS with Labs ON), all 93
passing, exit 0, zero genuine console errors. With this, no known
Labs-agnostic research affordance remains on the default surface.

---

## Addendum (2026-08-21) — Finding 1 / the Ship-Studio bypass is now CLOSED, reversing the 2026-08-04 accept decision

docs/PATH_TO_EXCELLENCE.md's W6 ("the Ship tab — a primary non-Labs tab —
opens the research console... to show a snapshots list") named this
document's own accepted item as "its known remaining item family" and asked
for a real fix, not another accept. This addendum records that fix and,
per this document's own established practice, checks its reasoning against
source rather than restating the brief on faith — including the one place
the 2026-08-04 decision's rationale predicted a real regression if Ship
were ever gated without a replacement door.

**What changed.** `ScriptIDE.tsx`'s `handleTaskChange("ship")` no longer
calls `setToolSlot("studio")`; it calls `setToolSlot("ship")`, a new,
separate `IdeToolSlot` value (`scriptide/Toolbar.tsx`) that mounts a new
component, `scriptide/ShipPanel.tsx` — a plain writer-facing drawer in the
same paper·ink·stamp language CoverageSummary already uses (`sm-pagetop`
header, `sm-panel-body`/`sm-card`/`sm-btn` tokens), containing exactly three
things:

1. **Export** — all four working actions (PDF, Fountain, Final Draft/.fdx,
   Word/.docx), each calling the same `exportPDF`/`exportFountain`/
   `exportFDX`/`exportDOCX` handlers the old Ship-tab toolbar row already
   used, disabled together on an empty draft.
2. **Snapshots/versions** — the full `SnapshotManager` (not the
   `hideList`-only mode used elsewhere), so save/restore/delete of every
   version is on the DEFAULT surface now, not Ship→Studio-only as the
   2026-08-04 addendum's point 1 found for the read/restore/delete half of
   version management. This is a strict improvement over the accepted
   state, not just a leak fix.
3. **Independent verification** — a "Verify a report" link to the same
   `#verify` hash route (`App.tsx`, `VerifyReport.tsx`) StartScreen's own
   link already uses, deliberately outside the Labs gate per that
   component's own header comment.

The research shell itself (`toolSlot="studio"`, the PRODUCTION/ANALYSIS/
ENGINE/CODEX/RESEARCH/TITLE/VERSIONS tab bar) is **not deleted** — the
deletion moratorium holds. It is now reachable **exclusively** through
`Toolbar.tsx`'s existing Labs-gated "Open Studio" overflow item;
`openToolSlot`'s `next === "studio"` branch no longer special-cases `task`
to stay `"ship"`, so Studio now behaves like Director/Slate (an
independent overlay, opened without regard to whichever task tab is
active) instead of secretly doubling as Ship's own content.

**The Title Page regression this document's own 2026-08-04 rationale
warned about — addressed, not silently absorbed.** Point 1 of that
addendum's rationale found, by source read, that Title editing
(`renderTitlePage()`, the title/author/contact form) had exactly one
default-surface path: Ship→Studio's "Title" tab. Gating Ship without a
replacement, it warned, "would make title/author/contact editing
Labs-only... exactly the kind of core Editor affordance the task's
rationale describes as load-bearing." This fix does not add a
default-surface form for Title editing — W6's brief scoped ShipPanel to
exports, snapshots, and the verify pointer, not Title — so that warning is
not fully answered, and it would be dishonest to claim otherwise. What
holds it short of a functional regression, verified by source read rather
than assumed:

- `exportFountain` (`ScriptIDE.tsx`) only injects the `titlePage` state's
  title/author/contact fields when the draft does not already start with
  `Title:` — so a writer can set all three by typing standard Fountain
  title-page syntax (`Title: ...`, `Author: ...`, etc.) directly at the top
  of the draft, which is how most Fountain tooling expects title metadata
  to travel in the first place, and requires no Labs flag.
- `exportFDX`/`exportPDF`/`exportDOCX` were already found (this session,
  not assumed) to pass `scriptText` straight through without ever reading
  `titlePage` at all — a pre-existing inconsistency across the four
  exporters, out of scope for this change (would touch `src/lib/fdx.ts`
  `pdf.ts` `docx.ts`, none of which are in this lane) and not introduced or
  worsened by it.
- The dedicated visual form (three labeled fields vs. raw Fountain syntax)
  is a real convenience loss for a writer who does not already know
  Fountain's title-page syntax, and it is now Labs-gated along with the
  rest of Studio's tab bar. Flagged here, honestly, as an open item for
  whoever next touches Ship or Title — not claimed resolved.

**The adjacent Ship-toolbar-row "Simulate" button** the 2026-08-04
addendum flagged as "out of scope for this decision" was independently
closed the same day (see the addendum immediately above this one) and
remains closed — reconfirmed live below, unaffected by this change.

**The OASIS-jargon condition the 2026-08-04 accept rested on** is now moot
rather than re-checked: since Ship no longer reaches the research shell at
all, there is no panel content left to jargon-scan on that path. The
`OASIS_JARGON_RE` check itself still applies (unmodified) to the Studio
path in the live-browser P2/P3 test suite's other assertions.

### New verify-script assertions

`scripts/verify-p2-p3-surfaces.mjs`: the old `P2-decision` block encoding
the 2026-08-04 accept (`studioReachableViaShip` and its OASIS-jargon check)
is removed — asserting a bypass "must stay reachable" no longer makes sense
once the bypass is fixed — replaced with a `P2-W6` block, in both the
Labs-OFF (CONTEXT A) and Labs-ON (CONTEXT B) passes:

- Ship tab shows NO research-chrome tab bar — a shared
  `hasResearchShellChrome(bodyText)` helper requires **all four** of
  Production/Analysis/Engine/Codex present together (not any single one):
  an early version of this check matched "Analysis" alone and false-positived
  on the Toolbar's unrelated, pre-existing "No AI key · analysis ok" banner
  text, caught and fixed by requiring the full set actually only the tab bar
  renders together.
- All four export actions (PDF/Fountain/Final Draft/Word) reachable from
  ShipPanel.
- The snapshots/versions list ("Script Snapshots") reachable.
- The verify-report pointer ("Verify a report" → `#verify`) reachable.
- (Labs ON only) the research shell is still genuinely reachable via
  Toolbar's "Open Studio" overflow item — proving Studio was gated, not
  deleted.

### Verify / build gates (this addendum)

- `PW_CHROMIUM_PATH=/opt/pw-browsers/chromium node
  scripts/verify-p2-p3-surfaces.mjs` — **104/108**, exit 1. All new P2-W6
  assertions PASS. The 4 remaining failures are not part of this change —
  `oasis/{BeliefDriftGraph,ReplayInspector,SecretsMatrix,SimulationSandbox}.tsx`
  reported dead/unreachable by the static cross-check, pre-existing from
  the 2026-08-08 "preserve unreviewed prototype work" quarantine commit,
  unrelated to any Ship/Studio/Settings surface. (An earlier run this same
  session also showed 4 P4-instrumentation counter failures tied to
  `tests/core/coverage-handoff.test.ts` / `ScriptDoctorPanel.tsx`'s
  in-flight W3/W4 report-threading work on this same branch, a different
  lane — those resolved between runs as that lane's own concurrent fix
  landed, confirmed by `npm test` below now passing clean.) Zero genuine
  browser console errors.
- `PW_CHROMIUM_PATH=/opt/pw-browsers/chromium node
  scripts/smoke-p0-live-flow.mjs` — PASS, exit 0 (`verdict=CONSIDER,
  health~78`, zero genuine console errors).
- `npm run lint` — 0 errors (`tsc --noEmit` clean).
- `npm test` — **0 failures** out of 10662 (10576 pass, 85 skipped, 1 todo).
  This session's own lane is `SettingsPanel.tsx`, `StartScreen.tsx` (mobile
  CTA), `scriptide/**` excluding the save/persistence and CoverageSummary→
  ScriptDoctorPanel handoff paths, `scripts/verify-p2-p3-surfaces.mjs`, and
  this document — the coverage-handoff fix above landed from a different,
  concurrent lane on this same branch.
- Also fixed this same session, W5 (Phase W, docs/PATH_TO_EXCELLENCE.md):
  `SettingsPanel.tsx`'s modal shell carried `sm-btn` (the interactive-button
  primitive — `display:inline-flex`, centered content, hover-inverts to a
  near-black background) instead of `sm-panel` (the inert panel frame),
  fighting the `flex flex-col` layout so provider cards below the first
  overflowed the panel's real edges into the dimmed backdrop, and the whole
  modal flipped near-black on hover — root-caused via live computed-style
  inspection, fixed by the one-class swap, re-verified with screenshots at
  900px (scrolled + full-page) and on the Labs tab. `StartScreen.tsx`'s
  "Recommended" ribbon on the primary CTA reused `sm-stamp`, whose
  `color: var(--sm-stamp)` is the exact red the CTA's own `sm-btn--stamp`
  background already paints — invisible text, at every viewport width, not
  only 375px — and the button's real padding is `.sm-btn`'s 8px/16px
  shorthand (also loading after Tailwind's utilities), not the intended
  `px-8 py-10`, so the badge's border box dipped into the caption row at
  375px. Fixed with a small self-contained cream-on-stamp ribbon lifted
  clear of that row, verified with screenshots at 375px and 1440px.
- Files changed: `src/components/SettingsPanel.tsx`,
  `src/components/StartScreen.tsx`, `src/components/scriptide/Toolbar.tsx`,
  `src/components/scriptide/ShipPanel.tsx` (new),
  `src/components/ScriptIDE.tsx`, `scripts/verify-p2-p3-surfaces.mjs`, this
  document.
