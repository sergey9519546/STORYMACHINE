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

**Still required before fielding:** the operating kit's full pre-session smoke
check must be run and certified against a clean boot — sample flow renders end
to end, no CodeMirror update crash, `/api/analyze-script` and coverage return
non-error responses. The earlier CodeMirror crash / 503 was seen on a stale
`commit: dev` instance and has not been re-verified post-fix. Do not begin
participant sessions until that certification is recorded here and in
`P0_EVIDENCE_SUMMARY.md`.

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
| Last reviewed | Not yet reviewed |
| Reviewed by | Not assigned |
| Evidence summary | `docs/user-validation/P0_EVIDENCE_SUMMARY.md` — PLANNED, 0 sessions |
| Session artifact directory | `docs/user-validation/sessions/` — empty (`.gitkeep` only) |
| Canonical source | `ROADMAP.md` §3 |
| Next review trigger | First documented session, any counter/status change, or a formal P0 gate review |
