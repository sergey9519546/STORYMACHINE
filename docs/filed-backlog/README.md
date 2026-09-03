# Filed Backlog — Historical / Superseded Planning Docs

This directory holds historical and superseded planning documents from before
the 2026-07-28 documentation reconciliation. **Nothing here is active
direction.** These files are retained for institutional memory only; their
claims, phase numbers, and status statements are NOT authoritative.

## Canonical sources (use these instead)

For current, authoritative direction read:

- `ROADMAP.md` — single source of truth for project direction, phases, and sequencing.
- `NORTH_STAR.md` — product constitution.
- `ARCHITECTURE.md` — system map.
- `docs/adr/` — authoritative record of phase-defining architectural decisions
  (see `docs/adr/README.md`; e.g. ADR-001, ADR-002).
- `docs/user-validation/PHASE_TRACKER.md` — active P0 phase tracking.

## How to read files here

Each archived file carries an `ARCHIVED` banner at the top stating when it was
demoted, why, and what supersedes it. If a file lacks a banner, treat it the
same way: historical, not active.

## Subdirectories

- `2026-07-15-session/` — the 2026-07-15 "single source of truth" session.
  Contains superseded planning docs (V5 vision, Story Graph status, session
  epics, UX overhauls, ultraprompt blueprints) plus the demoted
  `MASTER_ROADMAP.md` and `PHASE_0_1_COMPLETE.md` (both archived 2026-07-28;
  `ROADMAP.md` is canonical).
- `TASKS_2026-07-11.md` (this directory, top level) — the 2026-07-11 task list
  for the retired wave program. Archived 2026-07-28; not active direction.
- `MEGA_CATALOG_12700_SYSTEMS.md` (this directory, top level) — a mechanical
  100x permutation catalog of genre/craft systems, formerly at the repo
  root. Archived 2026-09-03 per
  `docs/audits/2026-09-02-retrospective/RETROSPECTIVE.md` finding #8; see
  its own archival header for why. Not active direction.
- `STORYMACHINE_ACTIVE_WORK_PROMPT.md` (this directory, top level) — a
  fresh-agent-session prompt written under the P0 hard-gate, formerly at
  `docs/reference/`. Archived 2026-09-03: superseded by the gate's 2026-08-11
  retirement (`docs/DECISION_LOG.md` Decision #2) and by
  `docs/PATH_TO_EXCELLENCE.md`. Not active direction.
- `RUN_DEMO.md` (this directory, top level) — a root-level Windows
  quick-start for the keyless demo, last touched 2026-08-08. Archived
  2026-09-03: unreferenced by any live doc and superseded by the more
  complete `docs/user-validation/RUN_DEMO.md`, which the P0 operating kit
  and `FIRST_SESSION_QUICKSTART.md` actually point to.
- `BASELINE.md` (this directory, top level) — a one-time G0-00 baseline
  capture recorded 2026-07-23 against `main` at `5c49609`. Archived
  2026-09-03: unreferenced anywhere in the tree, and `main` has moved far
  past that commit.
- `SECURITY_AUDIT_2026-07-14.md` (this directory, top level) — the
  SEC-001…SEC-030 security/reliability audit and wave-based repair plan,
  produced 2026-07-14. Archived 2026-09-03: `SECURITY.md` has always
  described it as "the historical internal audit findings," it was already
  self-identified as historical, just sitting at the repo root. Most items
  were addressed by the repair work that followed; not re-verified against
  current code. `SECURITY.md` links here for the audit record.
- `ULTRAREVIEW_FINDINGS.md` (this directory, top level) — a closed
  41-agent adversarial-review ledger (178 files / 64,971 LOC, 55 confirmed +
  2 plausible findings), produced 2026-08-04 and closed the same day ("all
  57 findings verified, none open"). Archived 2026-09-03: a completed,
  dated audit record, not live guidance; line-number references have
  drifted from current code. Still cited by name (not path) in comments in
  `server/engine/Orchestrator.ts`, `server/routes/game.ts`, and
  `tests/routes/sse-wall-timer-cancellation.test.ts`, and by path in
  `docs/PATH_TO_DONE.md`.
