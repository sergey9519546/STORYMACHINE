---
type: measurement
updated: 2026-09-05
sources: [docs/scoring/DENSITY_RECAL_FINDING_2026-07-11.md]
status: active
---

# Measurement — DENSITY_RECAL_FINDING_2026-07-11

**Question:** viability of switching the density opportunity unit from
`wordCount^0.7` (padding-sensitive) to a `sceneCount`-based unit
(padding-resistant) — the same direction [[Branch - R5 Verbosity Bias]] later
pursued.

**Verdict: the verbosity fix is a RE-ARCHITECTURE, not a re-tune.** Do not
attempt it as a manifest re-lock wave; documented so the next attempt
starts from the measured truth. Candidate measured scale-invariant on the
authoritative corpus + calibration: verbosity (`empty_verbosity`) FIXED at
the base.fountain scene-density level, but other regressions appear
elsewhere in the scale.

**What was NOT reproduced:** this finding predates and did not itself
implement [[Branch - R5 Verbosity Bias]]'s eventual re-architecture attempt.

## Sources

- `docs/scoring/DENSITY_RECAL_FINDING_2026-07-11.md`
