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
| `POST /api/export/coverage` | 200 | 212,723 bytes — byte-identical size to the committed `sample-coverage-report.html` |
| `POST /api/analyze-script` (opt-in idle AI, off by default per G0-04) | 503 | clean honest-degradation body — correct keyless behavior, not a crash |
| `npm run build` | — | clean, 2294 modules, 3.63s, 0 errors |

The live doctor route's health/verdict/scene-count (68.9 / CONSIDER / 14) match
the committed static stimulus's provenance table exactly — the static report
and the live in-app report are confirmed consistent on this commit. The
previously-flagged CodeMirror synchronous-dispatch crash cause is fixed in
source at HEAD: `src/components/editor/inline-complete.ts` now defers the
dismiss-dispatch via `setTimeout(..., 0)`, with an inline comment recording the
prior crash cause.

**Browser DOM smoke: CERTIFIED (2026-07-28, current `main` tip `1a7f3b4`,
on a machine with a real browser).** Drove the exact flow the operating kit
requires with headless Chromium (Playwright 1.61.1, system-wide install +
cached browser binaries; not a project dependency and not required to be one):

- Keyless boot (`tsx server.ts`, `PORT=4319`, no `GEMINI_API_KEY`) → analysis-
  only mode, `GET /` → 200, StartScreen rendered with the "Try sample
  coverage" CTA.
- Click "Try sample coverage" → `ScriptIDE` + `ScriptDoctorPanel` mount via
  `autoLoadSample`.
- `POST /api/scriptide/doctor` → **200**, full deterministic report: grade
  `solid`, verdict `CONSIDER`, 14 revision passes, 13 root causes, 200
  issues, dimensions/strengths/storyGraph/healthPercentile all populated.
- Report rendered in the DOM (probed + screenshot): `CONSIDER` stamp, health
  69, craft dimensions (overall 68.9, Theme & Originality 98.8, Structure &
  Pacing 67.7), issue counts 3 Critical / 38 Major / 159 Minor. Banner read
  "NO AI KEY · ANALYSIS OK" (keyless posture confirmed).
- **Zero genuine browser console errors.** The only console events were (a)
  dev-only Vite HMR WebSocket noise on port 24678 (never present in a prod
  build) and (b) the documented keyless 503 on `POST /api/analyze-script`
  (the opt-in AI Director generative path, off by default per G0-04; the
  client intentionally swallows it to keep the editor usable). The
  deterministic coverage route `/api/scriptide/doctor` is unaffected.

No source files were modified for this check; throwaway harness + screenshots
live under the gitignored `.playwright-cli/`. **Both static-report AND
live-flow P0 sessions are now unblocked.** (One non-blocking observation noted
during the run, no action taken: the panel briefly showed a "COVERAGE
OUTDATED / RE-RUN COVERAGE" affordance alongside the rendered report on first
sample load — the report content itself was present and correct, so this is a
freshness affordance rather than a missing render; worth a glance in a future
pass if the gate intends a "fresh" first-load label.)

**Re-certified after the scene-label migration (2026-08-03,
`claude/fix-scene-numbering`).** The 1-based scene-number migration
(presentation-only: issue labels + their three "Scene N" consumers; no
scoring change) triggered a full re-run of this gate via the now-repeatable
`scripts/smoke-p0-live-flow.mjs` (PASS: keyless boot → StartScreen → "Try
sample coverage" → report rendered CONSIDER / health ~69, zero genuine
console errors). The stimulus was regenerated through the same pipeline:
health 68.9 / CONSIDER / 14 scenes / contentHash `33dcf214…` all unchanged;
HTML is 212,708 bytes (earlier byte-size claims of 212,723 describe the
pre-migration artifact — scene labels inside issue text shifted to 1-based,
nothing else). Determinism re-verified: two consecutive generations differ
only in the footer datestamp. The run also caught and fixed a real 404 every
browser visit produced (no favicon existed; one was added and declared in
`index.html`), which is what previously stood between the repeatable smoke
script and a clean exit.

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

| Date | Phase | Decision | Evidence reference | Reviewer | Notes |
|---|---|---|---|---|---|
| 2026-08-04 | P0 | **GO — field P0.** Static-report sessions first; live-flow sessions permitted per the existing certifications. | `FIELDING_DECISION_BRIEF.md` (incl. 2026-08-03 update: browser caveat cleared, stimulus corrected, thinness recorded) | Project Maintainer (role) — recording delegated, see Notes | The maintainer explicitly delegated all open decisions to the agent session on 2026-08-04 ("make all the decisions for me … always proceed"). This entry records the GO under that delegation. Sessions themselves remain HUMAN-RUN: recruitment, moderation, and documentation cannot be delegated to an agent, and fabricating session data remains prohibited under this tracker's own constitutional guard. |

**Pre-registered signal rule** (fixed before any session; no post-hoc
reinterpretation): each valid documented session is classified per the
operating kit as Positive / Qualified / Negative / Ambiguous / Invalid on
the core question (*does this make you want to run your own draft?*).

- **PASS:** among the first 5 valid sessions, >= 3 are Positive or
  Qualified, AND at least 1 is fully Positive.
- **STOP:** >= 3 of the first 5 valid sessions are Negative.
- **Otherwise INCONCLUSIVE:** extend to 8 valid sessions; then PASS
  requires >= 5 of 8 Positive-or-Qualified with >= 2 fully Positive;
  anything else is STOP.
- Ambiguous sessions never count toward PASS. Invalid sessions count
  toward no threshold. The rule is evaluated in session order as sessions
  complete; the first threshold reached decides.

**Sample-thinness caveat carried into the decision** (per the brief): the
stimulus is a competent skeleton (~47.5 words/scene vs. a 161–181 corpus
median). Fielding on it is a deliberate choice to measure whether the
report's *shape* creates pull; participant remarks about script thinness
should be logged but do not make a session Invalid.

## Review metadata

| Field | Value |
|---|---|
| Tracker status | Status-only |
| Last reviewed | 2026-08-03 — browser DOM click-through RE-certified on `claude/fix-scene-numbering` after the 1-based scene-label migration, via the repeatable `scripts/smoke-p0-live-flow.mjs` (PASS, zero genuine console errors); stimulus regenerated with health/verdict/sceneCount/contentHash unchanged. Prior certifications: browser DOM on `main` tip `1a7f3b4` (2026-07-28), API-level smoke on `c5749b9`, static-stimulus reproducibility on `d733240` — see `FIELDING_DECISION_BRIEF.md` and "Browser DOM smoke" above. |
| Reviewed by | Agent session (Playwright/Chromium available this run) |
| Evidence summary | `docs/user-validation/P0_EVIDENCE_SUMMARY.md` — PLANNED, 0 sessions; static-report AND live-flow sessions now unblocked |
| Session artifact directory | `docs/user-validation/sessions/` — empty (`.gitkeep` only) |
| Canonical source | `ROADMAP.md` §3 |
| Next review trigger | First documented session, any counter/status change, or a formal P0 gate review (no remaining fielding blocker) |
