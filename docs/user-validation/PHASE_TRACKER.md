# StoryMachine Phase Tracker

## Authority

`ROADMAP.md` is canonical for phase sequence, scope, and exit gates. This tracker is status-only: it reports evidence and blocking state, and **cannot waive, weaken, reinterpret, or replace any ROADMAP gate**. If this file conflicts with `ROADMAP.md`, follow `ROADMAP.md` and correct this tracker.

## Phase status

| Phase | Status | Blocked by | Gate state |
|---|---|---|---|
| P0 — Validate with real writers | **ACTIVE — fielding authorized (GO, 2026-08-04)** | — | **Not yet evaluated — 0 of >=5 valid sessions documented** |
| P1 — Make the score provably discriminate on real writing | **ACTIVE** | — | In progress |
| P2 — Collapse the surface to Doctor + Editor | **BLOCKED** | P1 | Not evaluated |
| P3 — Ship the shareable, verifiable coverage report | **BLOCKED** | P1 + P2 | Not evaluated |
| P4 — Retention & defensibility | **BLOCKED** | P1 + P2 + P3 | Not evaluated |

## P0 counters

**Correction (2026-08-07):** this table previously showed fabricated
values (5 recruited/scheduled/completed/valid sessions, a 4-Strong/
1-Qualified pull tally, and a "PASS — GREEN (P0 GATE CLEARED)" decision).
No session has ever been run — `docs/user-validation/sessions/` contains no
session files, and `P0_EVIDENCE_SUMMARY.md`'s own session tables have
always read "No sessions documented." The table below reflects the actual
state: fielding is authorized (GO, see decision log below) but zero
sessions have occurred.

| Counter | Current | Required / interpretation |
|---|---:|---|
| Recruited real screenwriters | 0 | Track toward >=5 |
| Scheduled sessions | 0 | Track toward >=5 |
| Completed sessions | 0 | Track toward >=5 |
| Valid sessions | 0 | >=5 valid documented sessions required |
| Fully documented sessions | 0 | >=5 valid documented sessions required |
| Sessions with real draft in hand confirmed | 0 | None yet |
| Notes consent obtained | 0 | None yet |
| Anonymous quote permission obtained | 0 | None yet |
| Positive signals | 0 | None yet |
| Qualified-positive signals | 0 | None yet |
| Negative signals | 0 | None yet |
| Ambiguous signals | 0 | None yet |
| Invalid / excluded sessions | 0 | None yet |
| Verbatim objections logged | 0 | None yet |
| Verbatim moments of trust logged | 0 | None yet |
| Verbatim moments of disbelief logged | 0 | None yet |
| P0 gate decisions recorded | 1 | **GO — field P0** (fielding-authorization decision only; the separate outcome gate (PASS/STOP) cannot be evaluated until >=5 valid sessions exist — see decision log below) |

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
- Keep P1 work within its machine-checked measurement-receipt gates; no P1
  experiment substitutes for the still-unmet P0 human gate.
- Fix critical security issues immediately. The former blanket P0
  product/engine-code freeze is retired; P4 retention/lock-in work remains
  barred until P0 passes.

## Gated now (the freeze is retired — see ROADMAP's 2026-08-04 amendment)

The blanket "blocked" list is replaced by evidence gates. What each former
block became:

- **Scoring changes** (formula, constant, rule, detector, calibration,
  arc integration): GATED by the CI receipt guard — a scoring-path change
  fails the build without a `MEASUREMENT_RECEIPTS.md` entry in range, and
  the AUC-24 >= 0.622 ratchet still applies to the measurement itself.
- **New signals/detectors**: GATED by the unwired-first pattern — build
  unwired with fixtures and an opt-in measure flag, wire only with a
  receipt.
- **UI/report/surface changes**: GATED by the browser verification suites
  (smoke, focus-traps, p2-p3 surfaces) and the honesty gates, all of which
  must stay green.
- **P1 benchmark work**: OPEN (and already under way — corpus expansion,
  labeling kit, pre-registered split). Human blind-labeling still requires
  real readers; zero labels may be fabricated.
- **P4 retention/lock-in work**: STILL PROHIBITED until the P0 gate reads
  PASS. This is the one block the amendment keeps: no mechanism can
  substitute for demand evidence.
- **Unchanged and permanent**: recruitment, templates, or this tracker
  never satisfy the P0 exit gate — only >=5 valid documented human
  sessions do; fabricating any part of them remains prohibited.

## Decision log

| Date | Phase | Decision | Evidence reference | Reviewer | Notes |
|---|---|---|---|---|---|
| 2026-08-04 | P0 | **GO — field P0.** Static-report sessions first; live-flow sessions permitted per the existing certifications. | `FIELDING_DECISION_BRIEF.md` (incl. 2026-08-03 update: browser caveat cleared, stimulus corrected, thinness recorded) | Project Maintainer (role) — recording delegated, see Notes | The maintainer explicitly delegated all open decisions to the agent session on 2026-08-04 ("make all the decisions for me … always proceed"). This entry records the GO under that delegation. Sessions themselves remain HUMAN-RUN: recruitment, moderation, and documentation cannot be delegated to an agent, and fabricating session data remains prohibited under this tracker's own constitutional guard. |
| 2026-08-04 | P0 | **Stimulus swap — "The Second Key" -> "Dead Frequency"**, resolving the sample-thinness limitation recorded in the row above (~47.5 -> ~152.6 words/scene). `src/lib/sample-script.ts` now embeds `data/screenplays/dead-frequency.fountain`, a tracked CC0 corpus script, chosen as the closest-to-band words/scene (152.6, vs. the 161–181 real-corpus median) among candidates that also clear the >=12-scene preference (full 20-script comparison table in `FIELDING_DECISION_BRIEF.md`'s 2026-08-04 "RESOLVED" addendum). New provenance: health 78.3, verdict CONSIDER (unchanged), sceneCount 12, contentHash `a1b44eff859da29988dbd81354056b2574655302d63180022e679a7c942cf3ca`, `sample-coverage-report.html` regenerated at 193,132 bytes. Retired stimulus preserved verbatim at `docs/user-validation/ARCHIVED_SAMPLE_THE_SECOND_KEY.md`; `demo/corpus/MANIFEST.json` bumped to version 2 with the retired version kept in a `history` field. | `FIELDING_DECISION_BRIEF.md` 2026-08-04 "RESOLVED" addendum; `P0_EVIDENCE_SUMMARY.md` 2026-08-04 "stimulus swap" addendum | Project Maintainer (role) — recording delegated, see Notes | Same 2026-08-04 blanket delegation as the GO decision above — this is stimulus-quality remediation of an already-decided GO, not a re-opening of the field/no-field question. **Zero P0 sessions had been run against the retired stimulus**, so no session comparability is lost. Re-verified green: `npm run lint`, `npm run honesty-audit`, `scripts/smoke-p0-live-flow.mjs` (PASS, keyless, zero genuine console errors), `scripts/verify-p2-p3-surfaces.mjs` (89/89). Full `npm test` has 6 pre-existing-shape failures in `tests/core/scene-label-consistency.test.ts` (3) and `tests/core/reversal-detection.test.ts` (3) that couple to the exact content of the live sample and are unavoidable for any stimulus swap (not specific to this choice) — see the evidence-summary addendum's "Known collateral test impact" note; that `tests/` lane was owned by a concurrent session at swap time and needs a follow-up to re-lock the coupled thresholds/fixtures. |
| 2026-08-07 | P0 | **Doc-consistency correction (no session data changed).** Reverted fabricated "P0 GATE CLEARED (GREEN)" / "5 valid sessions" claims that had been introduced into this table's Phase-status row, this file's P0-counters table, and `P0_EVIDENCE_SUMMARY.md`'s Status block — all contradicted by those same documents' own session tables, which have always read "No sessions documented." No real-writer session has occurred; `docs/user-validation/sessions/` contains no session files. This entry records the correction only; it does not re-open or change the 2026-08-04 GO decision above. | This entry; `FIELDING_DECISION_BRIEF.md` "The state of the gate, honestly"; `P0_EVIDENCE_SUMMARY.md` "Status" | Agent session (docs-consistency pass) | Session counters remain 0 of >=5 after this correction; only the mis-stated claims were changed. |
| 2026-08-08 | P0 | **Generated-artifact provenance repair (no session data changed).** Regenerated `sample-coverage-report.html` with the canonical generator after the live equal-peak tie-break/report-rendering fixes. Current artifact: health 78.3, CONSIDER, 12 scenes, contentHash `a1b44eff859da29988dbd81354056b2574655302d63180022e679a7c942cf3ca`, 207,740 bytes. The 193,132-byte value in the 2026-08-04 row is historical swap-time provenance. | `P0_EVIDENCE_SUMMARY.md` "Current artifact provenance — 2026-08-08 repair" | Agent session (artifact repair) | Fielding authorization remains GO; **0 of >=5** valid human sessions and **no P0 outcome verdict**. |

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

**Historical retired-stimulus caveat:** the ~47.5-words/scene warning applied
to the retired "The Second Key" stimulus. The current fielding stimulus is
"Dead Frequency" (~152.6 words/scene), as recorded in
`P0_EVIDENCE_SUMMARY.md`. Remarks about stimulus quality should still be
logged, but the retired sample's thinness must not be attributed to the
current stimulus or used to change the pre-registered validity rules.

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
