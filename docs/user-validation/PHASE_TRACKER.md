# StoryMachine Phase Tracker

## Authority

`ROADMAP.md` is canonical for phase sequence, scope, and exit gates. This tracker is status-only: it reports evidence and blocking state, and **cannot waive, weaken, reinterpret, or replace any ROADMAP gate**. If this file conflicts with `ROADMAP.md`, follow `ROADMAP.md` and correct this tracker.

## Phase status

| Phase | Status | Blocked by | Gate state |
|---|---|---|---|
| P0 — Validate with real writers | **ACTIVE** | — | Not met |
| P1 — Make the score provably discriminate on real writing | **BLOCKED** | P0 | Not evaluated |
| P2 — Collapse the surface to Doctor + Editor | **BLOCKED** | P0 + P1 | Not evaluated |
| P3 — Ship the shareable, verifiable coverage report | **BLOCKED** | P0 + P1 + P2 | Not evaluated |
| P4 — Retention & defensibility | **BLOCKED** | P0 + P1 + P2 + P3 | Not evaluated |

## P0 counters

| Counter | Current | Required / interpretation |
|---|---:|---|
| Recruited real screenwriters | 0 | Recruitment progress only; does not clear gate |
| Scheduled sessions | 0 | Scheduling progress only |
| Completed sessions | 0 | Completed is not necessarily valid |
| Valid sessions | 0 | Must meet eligibility, consent, exposure, evidence, and privacy requirements |
| Fully documented sessions | 0 | >=5 valid documented sessions required |
| Sessions with real draft in hand confirmed | 0 | Required for every valid session; never collect the draft |
| Notes consent obtained | 0 | Required for every valid session |
| Anonymous quote permission obtained | 0 | Track separately; no permission means omit quotes |
| Positive signals | 0 | Assessed only from valid documented evidence |
| Qualified-positive signals | 0 | Keep conditions visible; do not merge with positive |
| Negative signals | 0 | Assessed only from valid documented evidence |
| Ambiguous signals | 0 | Assessed only from valid documented evidence |
| Invalid / excluded sessions | 0 | Record generic reason without sensitive details |
| Verbatim objections logged | 0 | Log only with anonymous quote permission |
| Verbatim moments of trust logged | 0 | Log only with anonymous quote permission |
| Verbatim moments of disbelief logged | 0 | Log only with anonymous quote permission |
| P0 gate decisions recorded | 0 | PASS, STOP, or INCONCLUSIVE after review |

## Current fielding blocker

**Correction (2026-07-15):** a prior version of this line claimed the keyless
sample journey "passes smoke verification on the current HEAD." That was not
accurate — HEAD did not boot at all. `server/engine/Stage.ts` imported three
never-committed V5.0 modules (`config/v5-flags.ts`, `monitoring/v5-metrics.ts`,
`nvm/kernel/adapters/commit-to-events.ts`) plus a duplicated import block, both
from commit `aacd715`, so `server.ts` crashed on boot (`ERR_MODULE_NOT_FOUND` /
duplicate-declaration `SyntaxError`). This is the actual cause of the
"process exits without binding a port" symptom recorded in
`P0_EVIDENCE_SUMMARY.md`.

**Boot blocker: RESOLVED.** Duplicate import removed; the three modules added as
default-OFF stubs. `npx tsx server.ts` now boots keyless and serves
`GET /api/ai-config` → `200` (`llmReady:false`). See the "Blocker root cause
found and fixed" section in `P0_EVIDENCE_SUMMARY.md` for verification detail.

**API-level smoke: CERTIFIED (2026-07-23, commit `c5749b9`, isolated sandbox
re-clone — not the persistent dev instance).** Server booted keyless
(`PORT=<isolated> node_modules/.bin/tsx server.ts`, no `GEMINI_API_KEY`);
built-in sample script (`src/lib/sample-script.ts`, "The Second Key") POSTed
verbatim to every route the live sample flow actually calls:

| Route | Status | Result |
|---|---|---|
| `GET /api/ai-config` | 200 | `llmReady:false` — analysis-only front door confirmed |
| `POST /api/scriptide/doctor` (`ScriptDoctorPanel.tsx`'s live report call) | 200 | health 68.9, grade "solid", totalIssues 200 |
| `POST /api/scriptide/diagnose` | 200 | health 68.9, verdict CONSIDER, sceneCount 14 |
| `POST /api/export/coverage` | 200 | 210,208 bytes — byte-identical size to the committed `sample-coverage-report.html` |
| `POST /api/analyze-script` (opt-in idle AI, off by default per G0-04) | 503 | clean honest-degradation body — correct keyless behavior, not a crash |
| `npm run build` | — | clean, 2294 modules, 3.63s, 0 errors |

The live doctor route's health/verdict/scene-count (68.9 / CONSIDER / 14) match
the committed static stimulus's provenance table exactly — the static report
and the live in-app report are confirmed consistent on this commit. The
previously-flagged CodeMirror synchronous-dispatch crash cause is fixed in
source at HEAD: `src/components/editor/inline-complete.ts` now defers the
dismiss-dispatch via `setTimeout(..., 0)`, with an inline comment recording the
prior crash cause.

**Still open — browser DOM smoke not certified.** The checks above ran in a
headless sandbox with no display and no Playwright install (verified: not a
dependency, no cached browser binaries). They prove every endpoint the live
flow calls returns correct data and that the frontend compiles cleanly — they
do not prove the actual StartScreen → load-sample → editor-renders →
ScriptDoctorPanel-renders click-through is crash-free in a real browser.
**Static-report-only sessions may proceed now** (the operating kit's stimulus
note already supports this exposure mode and this evidence confirms the static
artifact is live-consistent). **Before the first LIVE-FLOW session**, someone
on a machine with a browser must do one manual click-through of `npm run dev`
→ StartScreen → "Try the sample script" → confirm the Script Doctor report
renders with zero browser console errors, and record that check here and in
`P0_EVIDENCE_SUMMARY.md`. That manual check is the only remaining fielding
blocker, and only for live-flow (not static-report) sessions.

## Allowed now

- Recruit real screenwriters of any career tier who have real drafts in hand.
- Show the existing sample coverage report and observe without pitching.
- Ask the exact core question: *does this make you want to run your own draft — why or why not?*
- Document anonymized sessions.
- Log objections, moments of trust, and moments of disbelief verbatim.
- Maintain P0 evidence and status-only tracking artifacts.
- Run existing sample-flow smoke checks and existing test/build verification without modifying them.
- Maintain an inventory-only map of P1's current assets and gaps; run no P1 experiment.
- Fix critical security issues, the ROADMAP's sole exception to the P0 product/engine-code freeze.

## Blocked now

- New product or engine code other than critical security fixes.
- Scoring formula, constant, rule, detector, calibration, or emotional-arc integration changes.
- P1 benchmark construction, corpus acquisition, human scoring-label collection, reader assignment, metric reruns, or evaluation scripts.
- UI/report redesign, default-surface changes, panel/Labs gating, or terminology changes (P2).
- Shareable-report, verification-link, export-redesign, or sharing/instrumentation work (P3).
- Retention, draft-history, analytics, auth/account expansion, or workflow-lock-in work (P4).
- Engine refactors, broad type cleanup, OASIS work, or other filed-backlog work.
- Any re-sequencing not explicitly approved in the canonical ROADMAP.
- Treating recruitment, undocumented conversations, templates, or this tracker as satisfying the P0 exit gate.

## Decision log

No decisions have been made.

| Date | Phase | Decision | Evidence reference | Reviewer | Notes |
|---|---|---|---|---|---|
| — | — | — | — | — | No entries |

## Review metadata

| Field | Value |
|---|---|
| Tracker status | Status-only |
| Last reviewed | 2026-07-23 — API-level pre-session smoke certified on commit `c5749b9` (server boot, `/api/scriptide/doctor`, `/api/scriptide/diagnose`, `/api/export/coverage`, `/api/analyze-script` degradation, `npm run build`); browser-DOM click-through still open, see "Current fielding blocker" |
| Reviewed by | Agent session (sandboxed, no browser available) |
| Evidence summary | `docs/user-validation/P0_EVIDENCE_SUMMARY.md` — PLANNED, 0 sessions, static-report sessions unblocked |
| Session artifact directory | `docs/user-validation/sessions/` — empty (`.gitkeep` only) |
| Canonical source | `ROADMAP.md` §3 |
| Next review trigger | Manual browser click-through certification, first documented session, any counter/status change, or a formal P0 gate review |
