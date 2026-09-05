---
type: measurement
updated: 2026-09-05
sources: [docs/scoring/VERBOSITY_BIAS_2026-07-11.md]
status: active
---

# Measurement — VERBOSITY_BIAS_2026-07-11

**Question:** investigate and disposition the verbosity-bias defect —
appending stateless filler moves health upward.

**Decision: HOLD as a documented defect.** The fix requires a full
from-scratch re-calibration of the density regime; no zero-regression
surgical patch exists — proven three ways by measurement. The
`empty_verbosity` metamorphic case stays the standing regression witness;
CI's `npm run test:metamorphic` classifies it known-failing (printed, exit
0 if only it fails) until recalibration.

**What this fed:** this is the original finding [[Branch - R5 Verbosity Bias]]
was later dispatched to fix, and that
[[Measurement - DENSITY_RECAL_FINDING_2026-07-11]] scoped as a
re-architecture rather than a re-tune.

## Sources

- `docs/scoring/VERBOSITY_BIAS_2026-07-11.md`
