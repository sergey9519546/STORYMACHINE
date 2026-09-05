---
type: decision
updated: 2026-09-05
sources: [docs/DECISION_LOG.md]
status: superseded
---

# Decision #1 — User Validation First (2026-07-15)

Ten-plus contradictory planning documents forced a choice between shipping
V5.0 systems immediately, validating user demand first, a hybrid parallel
track, or "just fix what's broken." The project chose **User Validation
First**: recruit 5+ writers and prove demand before investing further,
under NORTH_STAR's original "demand before rigor" law. The implications as
originally recorded made P0 a **hard gate** (no new engine work until it
cleared), put V5 systems in shadow mode, and blocked Story Graph Phase 3-4
on a P0 GREEN result. `MASTER_ROADMAP.md` was created as the reconciled
source of truth (later itself superseded by `ROADMAP.md`), and a batch of
contradictory docs were archived to `docs/filed-backlog/2026-07-15-session/`.

**Status: superseded.** The hard-gate framing was retired by
[[Decision 2 - Retire the P0 Hard-Gate]] on 2026-08-11. P0 remains a
recommended evidence lane per this decision's original rationale; it is no
longer a prerequisite for engine work.

## Sources

- `docs/DECISION_LOG.md` — "Decision #1: User Validation First (2026-07-15)"
