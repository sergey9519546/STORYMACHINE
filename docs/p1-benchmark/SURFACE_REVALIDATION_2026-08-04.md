# Surface re-validation — P2/P3 DONE claims vs. the current tree (2026-08-04)

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
