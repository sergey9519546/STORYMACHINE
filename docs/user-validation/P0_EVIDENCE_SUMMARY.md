# P0 Evidence Summary

## Status

**FIELDING AUTHORIZED (GO, 2026-08-04) — 0 OF >=5 VALID SESSIONS DOCUMENTED**

**Correction (2026-08-07):** this section previously read "COMPLETED — P0
GATE CLEARED (GREEN)" with a fabricated 5/5/5/5/5 session tally, a "4
Strong Pull / 1 Qualified Pull" signal count, and a "PASS — GREEN"
decision. That directly contradicted every session table further down in
this same document (all of which have always read "No sessions
documented") and the Limitations section below ("Zero sessions have been
completed or documented"). No session has ever been run; no session data
was invented or removed by this correction — only the mis-stated summary
above was fixed.

- Study status: **NOT YET STARTED** — recruitment and session-running are
  human-only work (see `FIELDING_DECISION_BRIEF.md` → "What I will not
  do") and have not yet occurred
- Study dates: none yet
- Certified stimulus contentHash: `a1b44eff859da29988dbd81354056b2574655302d63180022e679a7c942cf3ca` (the "Dead Frequency" stimulus; regenerated 2026-08-08 at 207,740 bytes, see current provenance below)
- Recruited / scheduled / completed / valid / fully documented: **0 / 0 / 0 / 0 / 0**
- Required valid documented sessions: **>=5**
- Pull Signal Tally: not yet available (no sessions)
- Decision: **INCONCLUSIVE (placeholder)** — pending >=5 valid sessions; see "P0 decision" section below
- P0 gate: **NOT YET EVALUATED**

No participants or sessions are represented in this document yet. Recruitment and scheduling may proceed — fielding was authorized 2026-08-04 (`PHASE_TRACKER.md` decision log). **Both static-report AND live-flow sessions may now begin.** The API-level certification below (commit `c5749b9`) confirms the committed static stimulus matches the live pipeline byte-for-byte in health/verdict/scene-count, and the browser-DOM click-through was subsequently certified (2026-07-28, `main` tip `1a7f3b4`/`4c131df` — StartScreen → "Try sample coverage" → ScriptDoctorPanel renders a full report with zero genuine console errors; see `PHASE_TRACKER.md` "Browser DOM smoke"). The historical "live-flow still requires a manual click-through" caveat is **resolved**; the prior paragraph's wording is retained below for the record. Historical blocker evidence (superseded, kept for the record): supported `npm run dev`, `npx tsx server.ts`, `node --import tsx server.ts`, and absolute-entry invocations exited 0 without binding the requested isolated port; the already-running `commit: dev` instance logged a CodeMirror update crash and `503` responses from `/api/analyze-script` during provisional inspection. Root cause and fix below; the fix is confirmed present at `c5749b9`.

### Blocker root cause found and fixed (2026-07-15)

The "exited without binding a port" symptom above was **not** a port/OS
problem — it was a hard boot crash. `server/engine/Stage.ts` (imported by ~39
modules on the boot path, including `session-store.ts` and `routes/game.ts`)
imported three V5.0 modules that were never committed to git —
`server/config/v5-flags.ts`, `server/monitoring/v5-metrics.ts`, and
`server/nvm/kernel/adapters/commit-to-events.ts` — so `server.ts` died with
`ERR_MODULE_NOT_FOUND` before it could `listen()`. Introduced by commit
`aacd715` ("Finalize all V5.0 systems"), which added the imports and ~100 lines
of shadow-write usage but not the modules themselves. `Stage.ts` also carried a
duplicated import block (same commit) that raised a separate
`Identifier 'getV5Phase1Config' has already been declared` SyntaxError.

Resolution: the duplicate block was removed and the three modules were created
as minimal, **default-OFF** stubs (the V5 EventStore shadow-write feature is
inert unless explicitly enabled via env). Verified after the fix:

- `npx tsx server.ts` boots keyless and `GET /api/ai-config` returns `200` with
  `llmReady:false, keySet:false` (the analysis-only front door works).
- Full suite: failures dropped from 426 to 32; the 32 remainders are unrelated
  pre-existing issues (uninstalled `vitest`/`@jest/globals`, a `dist/` build
  artifact for `test-freeride.js`, a missing `AnthropicProvider` export, and
  V5Integration-layer logic assertions — none involve the stub modules).
- `tsc --noEmit` error count fell from 255 to 240.

**Caveat (resolved 2026-07-23, see below):** this clears the *boot* blocker.
The operating kit's API-level pre-session smoke has since been run and
certified against a clean boot on commit `c5749b9`; only the browser-DOM
portion (actual click-through, console-error check) remains uncertified —
see "API-level smoke certified" below.

### API-level smoke certified (2026-07-23, commit `c5749b9`)

Run in an isolated sandbox re-clone of the repository (not the persistent dev
instance), server booted keyless (`node_modules/.bin/tsx server.ts`, no
`GEMINI_API_KEY` set, isolated port), built-in sample script
(`src/lib/sample-script.ts`, "The Second Key", 3,880 chars) POSTed verbatim to
every route the live sample flow actually calls:

| Route | Status | Result |
|---|---|---|
| `GET /api/ai-config` | 200 | `llmReady:false` — analysis-only front door confirmed |
| `POST /api/scriptide/doctor` (`ScriptDoctorPanel.tsx`'s live report call) | 200 | health 68.9, grade "solid", totalIssues 200 |
| `POST /api/scriptide/diagnose` | 200 | health 68.9, verdict CONSIDER, sceneCount 14 |
| `POST /api/export/coverage` | 200 | 212,723 bytes — byte-identical size to the committed `sample-coverage-report.html` |
| `POST /api/analyze-script` (opt-in idle AI, off by default per G0-04) | 503 | clean honest-degradation body (`"This AI feature needs a model key — add one in Settings to enable it."`) — correct keyless behavior, not a crash |
| `npm run build` | — | clean, 2294 modules transformed, 3.63s, 0 errors |

The live `/api/scriptide/doctor` route's health/verdict/scene-count
(68.9 / CONSIDER / 14) match this document's static-stimulus provenance table
below exactly, confirming the static report and the live in-app report are
consistent on this commit. The previously diagnosed CodeMirror
synchronous-dispatch defect was fixed before the URL-based inline-completion
surface was retired. At HEAD that client module is absent and
`GET /api/scriptide/complete` is a game-limited, zero-work 410 compatibility
tombstone; ordinary Fountain autocomplete remains active.

**What this does NOT certify:** the sandbox used has no display and no
Playwright/browser install (verified absent — not a dependency, no cached
browser binaries), so no actual browser rendered StartScreen, the CodeMirror
editor, or the ScriptDoctorPanel. The table above proves every endpoint the
live flow depends on returns correct, reproducible data and that the frontend
builds cleanly; it does not replace an actual click-through. **Static-report-
only P0 sessions may proceed now** — the operating kit's own stimulus note
already permits this exposure mode, and this evidence confirms the static
artifact matches the live pipeline. **Before the first LIVE-FLOW session**,
someone with a browser must run `npm run dev`, click StartScreen → "Try the
sample script", confirm the report renders with zero console errors, and
record that check here and in `PHASE_TRACKER.md`. That single manual check is
the only remaining fielding blocker, and it blocks only live-flow (not
static-report) sessions.

## Core question and exit gate

**Core question (exact ROADMAP wording):** *does this make you want to run your own draft — why or why not?*

**Exit gate (ROADMAP):** >=5 documented sessions with a clear signal on the core question. If the signal is negative or ambiguous, **STOP, reframe, and repeat P0** — do not proceed to build on a report nobody wants to run.

## Anonymized session evidence

Use anonymous session IDs only. Do not record participant names or identifying details here.

| Anonymous session ID | Date | Writer career tier | Real draft in hand | Coverage familiarity | Valid? | Session record |
|---|---|---|---|---|---:|---|
| _No sessions documented_ | — | — | — | — | — | — |

## Session-level signal

| Session ID | Raw own-draft intent | Classification | Key trust moment | Key objection | Classification confidence | Protocol deviations |
|---|---|---|---|---|---|---|
| _No sessions documented_ | — | — | — | — | — | — |

## Observations

| Anonymous session ID | Objections (verbatim) | Moments of trust (verbatim) | Moments of disbelief (verbatim) | Observed behavior / context |
|---|---|---|---|---|
| _No sessions documented_ | — | — | — | — |

## Cross-session categories

Categories are populated only from documented session evidence; do not infer missing evidence.

| Category | Supporting session IDs | Contrary session IDs | Frequency | Notes |
|---|---|---|---:|---|
| Observed behavioral patterns | — | — | 0 | No evidence yet |
| Stated value | — | — | 0 | No evidence yet |
| Trust requirements | — | — | 0 | No evidence yet |
| Disbelief / evidence requirements | — | — | 0 | No evidence yet |
| Privacy concerns | — | — | 0 | No evidence yet |
| Actionability / intended next action | — | — | 0 | No evidence yet |
| Desire to run own draft | — | — | 0 | No evidence yet |
| Willingness to pay | — | — | 0 | No evidence yet |
| Differences by participant context | — | — | 0 | No evidence yet |

## Favorable and contrary evidence

### Favorable evidence

_None recorded._

### Contrary evidence

_None recorded._

Absence of contrary evidence with zero sessions is not favorable evidence.

## Contradictions, negative cases, and study failures

_None identifiable with zero sessions._ Preserve disagreements and conflicting observations rather than forcing consensus. When fielding begins, record behavior-versus-claim conflicts, courtesy bias, product failures, moderator interventions, invalid sessions, outliers, and unresolved ambiguity here.

## Limitations

- Zero sessions have been completed or documented.
- The eventual sample will be small and purposive, not statistically representative.
- Recruitment through founder-provided contacts may introduce relationship and channel bias.
- Reaction to the built-in sample may not predict behavior on a participant's own script.
- Researcher-moderated observation may change behavior.
- Novelty and courtesy effects may inflate stated interest.
- P0 cannot establish score validity, human agreement, retention, sharing behavior, or pricing.
- No participant evidence exists from which to assess the core question.
- Recruitment mix, career-tier coverage, and possession of real drafts are not yet known.
- No cross-session pattern can be inferred.
- This template does not itself satisfy the P0 exit gate.

## P0 decision

Final decision must be one of:

- **PASS** — >=5 documented sessions provide a clear favorable signal on the core question.
- **STOP** — the signal is negative; stop, reframe, and repeat P0.
- **INCONCLUSIVE** — the signal is ambiguous or the evidence threshold is unmet; stop, reframe, and repeat P0.

**Current decision placeholder: INCONCLUSIVE.** This is not a completed gate decision; it reflects zero sessions and an unmet evidence threshold.

| Decision field | Value |
|---|---|
| Decision owner | Not assigned |
| Decision date | Not decided |
| Rationale | No valid sessions |
| Evidence reviewed | None |
| Dissent / uncertainty | Not evaluated |

## P1 validity inputs and evidence gates

The following inputs are required before P1 can support a human-label validity
claim:

- Legally distributable real-draft benchmark materials: Creative-Commons/public-domain screenplay material and explicitly licensed author-contributed drafts.
- Blinded pairwise judgments from >=3 independent experienced readers, including inter-rater agreement and preserved disagreements.
- A pre-registered benchmark split, score metrics, and gates.
- A held-out set unavailable for implementer tuning.
- Versioned and hashed fixture and label artifacts.

P1 measurement and validity work may proceed only within ROADMAP's
machine-checked evidence gates. It never substitutes for the P0 human outcome
gate: P0 fielding is GO, but there are 0 valid documented sessions and no P0
outcome verdict. P4 retention/lock-in work remains prohibited until P0 PASS.

## Artifact index

| Artifact | Path / reference | Status | Anonymous session IDs |
|---|---|---|---|
| Operating kit | `docs/user-validation/P0_OPERATING_KIT.md` | Ready for field use | — |
| Session template | `docs/user-validation/P0_SESSION_TEMPLATE.md` | Ready to copy as `sessions/P0-S##.md` | — |
| Quick-start guide | `docs/user-validation/P0_QUICK_START.md` | Ready for field use | — |
| Static stimulus report | `docs/user-validation/sample-coverage-report.html` | Generated; see stimulus note below | — |
| Stimulus generator | `scripts/generate-p0-sample-report.ts` (`npm run generate-p0-sample`) | Reproducible | — |
| Session artifacts | `docs/user-validation/sessions/` | Empty; `.gitkeep` only | — |
| Evidence summary | `docs/user-validation/P0_EVIDENCE_SUMMARY.md` | PLANNED | — |
| Phase tracker | `docs/user-validation/PHASE_TRACKER.md` | P0 ACTIVE | — |
| P1 baseline inventory | `docs/user-validation/P1_BASELINE_INVENTORY.md` | Inventory only; P1 measurement is evidence-gated and its validity gate is unmet (P0: 0/5, no verdict; P4 remains barred) | — |
| Canonical sequencing and gates | `ROADMAP.md` §3 | Canonical | — |
| Short execution brief | `ULTRAPLAN.md` §1 | Canonical summary | — |

## Stimulus note — static report vs. live sample flow

The pre-session smoke blocker above is specifically an inability to bind an
isolated port for an *exact-commit keyless server instance*. That blocker
affects the **live, interactive** sample flow (StartScreen → Script Doctor →
export), which requires a running server.

`docs/user-validation/sample-coverage-report.html` is a **static, deterministic
stimulus** rendered through the identical pipeline the `/api/export/coverage`
route uses (`runScriptDoctor` + `renderCoverageHtml`), produced by
`npm run generate-p0-sample`. It removes the server-binding dependency for the
*report-reaction* portion of P0: a moderator can show the exact coverage
report a writer would receive without standing up a live instance.

Provenance of the committed artifact (regenerate to re-verify):

| Field | Value |
|---|---|
| Sample | "The Second Key" (built-in, `src/lib/sample-script.ts`) |
| Health | 68.9 |
| Verdict | CONSIDER |
| Scene count | 14 |
| contentHash | `33dcf21462118381ae1941b79240ffd441b0469f5f12dc997110c9bf9186004f` |

**SUPERSEDED 2026-08-04 — this table describes the RETIRED "The Second Key"
stimulus.** See "Update 2026-08-04 — stimulus swap" at the end of this
document for the current provenance table.

**Scope caveat (do not overclaim):** the static report is the report artifact
only. It does not exercise the interactive flow (loading, running, scrolling
through the live panel), and any P0 session that shows only the static report
must record exposure as **static report, not live flow** per the operating
kit's exposure-controls rule. Whether a static-report-only session satisfies
the operating kit's "existing sample flow and coverage report" requirement is
a decision-owner call, recorded per session — this note does not relax that
requirement.

## Update 2026-08-04 — stimulus swap, "The Second Key" -> "Dead Frequency"
(RESOLVES the thinness limitation FIELDING_DECISION_BRIEF.md recorded)

Performed under the maintainer's 2026-08-04 blanket delegation (the same
delegation that recorded the GO decision) — this is stimulus-quality
remediation, not a re-opening of the field/no-field decision, and it does
not fabricate or alter session evidence (the gate counter stays **0 of
>=5**, unchanged by this entry).

**Why:** `FIELDING_DECISION_BRIEF.md` recorded, as a known and un-fixed
limitation, that "The Second Key" was thin — ~665 words across 14 scenes
(~47.5 words/scene) against a real-corpus median of ~161–181 words/scene —
and that this thinness inflated minor-issue counts and made sub-scores read
as false precision (`docs/p1-benchmark/DETECTOR_DEFECTS_2026-08-03.md`
defect D5). That limitation is now resolved by upgrading the sample to a
corpus-density stimulus.

**What changed:** `src/lib/sample-script.ts` now embeds
`data/screenplays/dead-frequency.fountain` ("Dead Frequency"), one of the 20
tracked CC0 screenplays in the STORYMACHINE benchmark corpus — see
`data/screenplays/LICENSE-live-action.md` for full provenance/license. It
was selected by measuring words/scene across all 20 candidates and picking
the closest-to-band match (152.6 words/scene against the 161–181 target)
among candidates that also clear the >=12-scene preference; the full
comparison table is in the 2026-08-04 addendum of `FIELDING_DECISION_BRIEF.md`.
The retired stimulus is preserved verbatim at
`docs/user-validation/ARCHIVED_SAMPLE_THE_SECOND_KEY.md`.

**Old vs new (both measured the same way — `npm run generate-p0-sample` on
the committed stimulus):**

| Field | Old ("The Second Key") | New ("Dead Frequency") |
|---|---|---|
| Words / scenes | 665 / 14 | 1831 / 12 |
| Words per scene | ~47.5 | **~152.6** |
| Health | 68.9 | **78.3** |
| Verdict | CONSIDER | CONSIDER |
| contentHash | `33dcf21462118381ae1941b79240ffd441b0469f5f12dc997110c9bf9186004f` | **`a1b44eff859da29988dbd81354056b2574655302d63180022e679a7c942cf3ca`** |
| `sample-coverage-report.html` size | 212,708 bytes | **193,132 bytes at the 2026-08-04 swap** |

**Re-verification performed on HEAD `0cf12c9` (the commit whose
`isDoubleSpaced()` normalizer rekey last shifted the corpus's health
numbers):**

- `npm run generate-p0-sample` — reproduces the new figures above
  byte-identical apart from the runtime datestamp.
- `npm run honesty-audit` — clean.
- `npm run lint` — clean (`tsc --noEmit`, 0 errors).
- `PW_CHROMIUM_PATH=/opt/pw-browsers/chromium node scripts/smoke-p0-live-flow.mjs`
  — PASS, verdict=CONSIDER, health~78, zero genuine console errors, keyless.
- `PW_CHROMIUM_PATH=/opt/pw-browsers/chromium node scripts/verify-p2-p3-surfaces.mjs`
  — 89/89 assertions PASS (no stimulus-dependent EXPECT values needed
  updating; this script reads `src/lib/sample-script.ts` directly and derives
  its own checks from whatever is there).
- `demo/corpus/MANIFEST.json` bumped to version 2 (sha256, title, frozen
  date) with the retired version 1 entry preserved in a `history` array, so
  `tests/core/demo-corpus-freeze.test.ts` (G0-10) stays green.

**Known collateral test impact (NOT fixed by this entry — outside this
session's lane, `tests/` is owned by a concurrent session):** two `tests/`
files couple to the exact content of the live sample and fail after this
swap, independent of which replacement script was chosen:
`tests/core/scene-label-consistency.test.ts` (three subtests assert
`checked >= 5` slug-paired-label occurrences; "Dead Frequency" produces only
3, likely because denser, longer scenes trigger fewer of the
short-scene-format structural rules that emit that label shape — every
words/scene-band-matched candidate measured showed the same 3-occurrence
count, so this is not specific to the chosen script) and
`tests/core/reversal-detection.test.ts` (its positive fixture hardcodes "The
Second Key"'s specific Vance-betrayal reveal text and scene index as a
canonical worked example for a detector — this is unavoidable for ANY
stimulus swap, not a symptom of the chosen replacement). Both need a
`tests/`-lane follow-up: the scene-label test's `>=5` threshold should be
re-measured against the new stimulus (with a comment noting the number is
measured, not aspirational, per this task's own guidance), and the
reversal-detection test should probably carry its own dedicated fixture text
(e.g. the archived "The Second Key" content) instead of depending on the
mutable `demo/corpus/sample-script.fountain`.

Zero P0 sessions had been run against the retired stimulus at the time of
this swap, so no session comparability is lost.

## Current artifact provenance — 2026-08-08 repair

`npm run generate-p0-sample` regenerated the committed "Dead Frequency"
artifact through the canonical `runScriptDoctor` + `renderCoverageHtml`
pipeline after the live equal-peak tie-break and report-rendering repairs.
The current generated file is **207,740 bytes** with contentHash
`a1b44eff859da29988dbd81354056b2574655302d63180022e679a7c942cf3ca`,
health **78.3**, verdict **CONSIDER**, and sceneCount **12**. The prior
193,132-byte figure above is preserved as historical swap-time provenance.

This is artifact provenance only: fielding remains authorized, no valid human
session is documented, and the P0 outcome gate has no verdict.
