---
type: measurement
updated: 2026-09-05
sources: [docs/p1-benchmark/STRUCTURAL_SIGNAL_SCREEN_2026-08-03.md]
status: active
---

# Measurement — STRUCTURAL_SIGNAL_SCREEN_2026-08-03

**Question:** a cheap falsification pass over five candidate order-sensitive
signals, run BEFORE implementing any of them.

**What it is not:** a P1 result. Every number comes from 26 scripts (the 20
band-labeled calibration samples plus 6 CC0 screenplays), not the 761-script
corpus — no figure here may be quoted as a gate measurement. Reproduce with
`node scripts/probe-interscene-candidates.mjs`.

**Verdict counts:** four of five candidates were weak, near-chance, or
(candidate 4, setup-before-payoff ordering) structurally incapable of ever
firing, because the seed/payoff relation is *assigned* from scene order
rather than *observed* (recorded as detector defect D6 in
[[Measurement - DETECTOR_DEFECTS_2026-08-03]]). Candidate 5
(question-answer latency) is order-sensitive by construction and already
implemented, but routed through the density-normalized rule channel that
dissolves at feature scale.

## Sources

- `docs/p1-benchmark/STRUCTURAL_SIGNAL_SCREEN_2026-08-03.md`
