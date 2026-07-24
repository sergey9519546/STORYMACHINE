# P0 Evidence Summary

## Status

**PLANNED**

- Study status: **PLANNED — STATIC-REPORT SESSIONS UNBLOCKED; LIVE-FLOW SESSIONS PENDING ONE MANUAL BROWSER CHECK**
- Study dates: **Not started**
- Intended stimulus commit SHA: `e7b9a946510da21f2cab4b8b3eaa8621e76e9cf1` (superseded — main has advanced; see certified SHA below)
- Certified stimulus commit SHA (API-level only): **`c5749b9`** — exact-commit keyless instance boots and every live-flow route returns correct data; browser-DOM click-through still uncertified (no display/Playwright in the verifying sandbox)
- Provisional UI inspection: an older local instance (`/health` reported `commit: dev`) reached StartScreen and rendered sample coverage, but is not an authorized study stimulus
- Recruited / scheduled / completed / valid / fully documented: **0 / 0 / 0 / 0 / 0**
- Required valid documented sessions: **>=5**
- Decision: **INCONCLUSIVE (placeholder; no sessions completed)**
- P0 gate: **NOT MET**

No participants or sessions are represented in this document yet. Recruitment and scheduling may proceed. **Static-report-only sessions may now begin** on the strength of the API-level certification below (commit `c5749b9`), which confirms the committed static stimulus matches the live pipeline byte-for-byte in health/verdict/scene-count. **Live-flow sessions** (interactive editor, not just the static report) still require the one manual browser click-through described below before fielding. Historical blocker evidence (superseded, kept for the record): supported `npm run dev`, `npx tsx server.ts`, `node --import tsx server.ts`, and absolute-entry invocations exited 0 without binding the requested isolated port; the already-running `commit: dev` instance logged a CodeMirror update crash and `503` responses from `/api/analyze-script` during provisional inspection. Root cause and fix below; the fix is confirmed present at `c5749b9`.

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
| `POST /api/export/coverage` | 200 | 210,208 bytes — byte-identical size to the committed `sample-coverage-report.html` |
| `POST /api/analyze-script` (opt-in idle AI, off by default per G0-04) | 503 | clean honest-degradation body (`"This AI feature needs a model key — add one in Settings to enable it."`) — correct keyless behavior, not a crash |
| `npm run build` | — | clean, 2294 modules transformed, 3.63s, 0 errors |

The live `/api/scriptide/doctor` route's health/verdict/scene-count
(68.9 / CONSIDER / 14) match this document's static-stimulus provenance table
below exactly, confirming the static report and the live in-app report are
consistent on this commit. Source inspection also confirms the previously
diagnosed CodeMirror crash cause is fixed at HEAD:
`src/components/editor/inline-complete.ts`'s trigger plugin now defers its
dismiss-dispatch via `setTimeout(..., 0)` (comment: "dispatching synchronously
from a plugin update crashes") instead of calling `view.dispatch()`
synchronously inside the ViewPlugin `update()` lifecycle method.

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

## Allowed P1 inputs only after PASS

These inputs may begin only after P0 is explicitly recorded as **PASS**:

- Legally distributable real-draft benchmark materials: Creative-Commons/public-domain screenplay material and explicitly licensed author-contributed drafts.
- Blinded pairwise judgments from >=3 independent experienced readers, including inter-rater agreement and preserved disagreements.
- A pre-registered benchmark split, score metrics, and gates.
- A held-out set unavailable for implementer tuning.
- Versioned and hashed fixture and label artifacts.

Until PASS, P1 product/engine work is blocked. Critical security fixes remain the ROADMAP's only exception to the P0 product/engine-code freeze.

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
| P1 baseline inventory | `docs/user-validation/P1_BASELINE_INVENTORY.md` | Inventory only; P1 blocked | — |
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

**Scope caveat (do not overclaim):** the static report is the report artifact
only. It does not exercise the interactive flow (loading, running, scrolling
through the live panel), and any P0 session that shows only the static report
must record exposure as **static report, not live flow** per the operating
kit's exposure-controls rule. Whether a static-report-only session satisfies
the operating kit's "existing sample flow and coverage report" requirement is
a decision-owner call, recorded per session — this note does not relax that
requirement.
