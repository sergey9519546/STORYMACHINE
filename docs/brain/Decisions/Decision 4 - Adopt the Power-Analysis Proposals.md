---
type: decision
updated: 2026-09-05
sources: [docs/DECISION_LOG.md, docs/p1-benchmark/POWER_ANALYSIS_2026-09-02.md, docs/p1-benchmark/PRE_REGISTRATION_PROTOCOL.md]
status: active
---

# Decision #4 — Adopt the Power-Analysis Proposals (2026-09-03)

`docs/p1-benchmark/POWER_ANALYSIS_2026-09-02.md` and
`PRE_REGISTRATION_PROTOCOL.md` §12 computed, for the first time, whether the
project's evidence-gathering sample sizes could actually answer their
questions — a kappa floor with a stated confidence interval, an overlap
budget for computing it precisely, the minimum detectable AUC difference at
the existing n=153 test partition, and the P0 session count needed to bound
"would use again" to ±20 points — against the previously unexamined
defaults of 5 sessions and ≥3 readers with no overlap budget.

**Decision: adopt the proposals as written.** §12 moved from PROPOSAL to
ADOPTED; the P0 target became **17 moderated sessions** (the existing 5
kept as a first checkpoint, not the finish line); the P1 human-labeled
benchmark keeps its ≥0.60 Fleiss' kappa floor and adds a 95% CI half-width
≤0.10 requirement plus a ≥49-script all-three-reader overlap budget.
`ROADMAP.md` P0/P1 and `docs/user-validation/P0_QUICK_START.md` were
updated; `NORTH_STAR.md` did not state the old sizes and was left
unchanged. **Not decided:** this does not claim any P0 session or P1 label
exists yet (0 of 17, 0 labels), does not raise the P1 AUC gate above 0.80,
and does not resolve the reader-labor timeline gap already flagged in
§12.2.

## Sources

- `docs/DECISION_LOG.md` — "Decision #4"
- `docs/p1-benchmark/POWER_ANALYSIS_2026-09-02.md`
