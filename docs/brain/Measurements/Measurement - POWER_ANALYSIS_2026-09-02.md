---
type: measurement
updated: 2026-09-05
sources: [docs/p1-benchmark/POWER_ANALYSIS_2026-09-02.md]
status: active
---

# Measurement — POWER_ANALYSIS_2026-09-02

**Question:** answers retrospective finding #10 — was the One Bet's sample
design (5 P0 sessions, ≥3 P1 readers, no overlap budget) ever
power-analyzed? It wasn't.

**Status at authorship: PROPOSAL** — every number was a recommendation for
the owner to sign off on in `PRE_REGISTRATION_PROTOCOL.md` §12.

**Verdict counts:** at the existing n=153 test partition, the 95% CI on an
AUC of 0.80 is about **±0.07** — the gate cannot be told from 0.75. Five P0
sessions bound "would use again" to a 95% CI of roughly [28%, 99%]. Kappa
needs 43-49 triple-rated scripts for a precise estimate.

**What happened next:** adopted as governing targets by
[[Decision 4 - Adopt the Power-Analysis Proposals]] (2026-09-03) — §12
moved PROPOSAL → ADOPTED, P0 target became 17 sessions.

## Sources

- `docs/p1-benchmark/POWER_ANALYSIS_2026-09-02.md`
