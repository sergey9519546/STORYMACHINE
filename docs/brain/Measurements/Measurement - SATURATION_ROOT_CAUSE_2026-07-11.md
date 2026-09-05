---
type: measurement
updated: 2026-09-05
sources: [docs/scoring/SATURATION_ROOT_CAUSE_2026-07-11.md]
status: active
---

# Measurement — SATURATION_ROOT_CAUSE_2026-07-11

**Question:** three separate heavy waves — arc→health graduation,
verbosity-bias fix, and the composite min-gap guard — all failed. Is there
one shared root cause?

**Verdict: yes, now proven on the real gate rather than argued
analytically.** `health = 100 − densityPenalty − scarcityPenalty`. The
sub-1.0-density branch is a logistic
`SUB_DENSITY_SCALE / (1 + e^(−STEEPNESS·(density − 0.52)))` with SCALE=10,
STEEPNESS=50, which **hard-saturates at 10 points** for any density ≳0.65 —
so every fixture at or above that density gets `densityPenalty = 10.0`
exactly, flattening any further signal.

**What this connects:** the same saturation mechanism
[[Measurement - COMPOSITE_MINGAP_FINDING_2026-07-11]] found blocking the
composite-reviewer min-gap.

## Sources

- `docs/scoring/SATURATION_ROOT_CAUSE_2026-07-11.md`
