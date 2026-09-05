---
type: decision
updated: 2026-09-05
sources: [docs/DECISION_LOG.md]
status: active
---

# Decision #2 — Retire the P0 Hard-Gate (2026-08-11)

By 2026-08-11, [[Decision 1 - User Validation First]]'s P0 hard-gate had
zero documented valid sessions — the one "GREEN" state that briefly
appeared on a quarantined branch was a fabrication, reverted by the
maintainer in commit `a28436c`. The hard-gate had frozen all engine work
indefinitely, pending human recruitment that had not happened. **Decision:
retire the hard-gate.** Engine work now proceeds in parallel with P0; P0
remains a recommended, actively-pursued evidence lane, not a prerequisite.

Changed as part of this decision: `NORTH_STAR.md` §1's "demand before
rigor" law moved from gate to principle; `AGENTS.md`'s "What's Gated"
section became "Standing constraints" with P0-dependent gates removed;
`CLAUDE.md` and `ROADMAP.md`'s P0 sections were reframed. **Not changed:**
P0 is still worth pursuing, the rule-count freeze (3,217 constants) and
wave-program retirement stand independent of P0, and the 2026-08-04
machine-checked evidence gates ([[Gate - Receipt Gate]], [[Gate - AUC-24 Ratchet]])
for scoring-path changes remain in force.

## Sources

- `docs/DECISION_LOG.md` — "Decision #2: Retire the P0 Hard-Gate (2026-08-11)"
