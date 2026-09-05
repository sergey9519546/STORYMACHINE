---
type: measurement
updated: 2026-09-05
sources: [docs/p1-benchmark/BLIND_PAIRS_ON_BRANCHES_2026-09-04.md]
status: active
---

# Measurement — BLIND_PAIRS_ON_BRANCHES_2026-09-04

**Question:** companion to [[Measurement - BLIND_PAIRS_2026-09-04]] — how do
the same twelve blind fixtures score on the two pending scoring branches,
[[Branch - R5 Verbosity Bias]] and [[Branch - Advice Rule Fixes]]? Read-only,
produced in extracted `git archive` trees; nothing on either branch changed.
The main-tree run first reproduced the registered numbers exactly (1/6,
−0.02, 5/5, 25.32).

**Verdict counts:** **R5 alone: 3/6** ordered (up from main's 1/6), but only
by un-pinning the tie and exposing raw weighted-issue order, itself at
chance on this set — 0 of 12 tie (vs. 9/12 on main). **advice-rule-fixes
alone: 1/6**, unchanged from main; 9 of 12 still tie at exactly 76.0.

**What was NOT reproduced:** the **stacked tree (R5 + advice-rule-fixes)
could not be scored** — the branches have different merge-bases with main
(R5 is ~74 commits behind where advice-rule-fixes branched) and conflict on
five files including `character-arc.ts`, `rhythm.ts`, and `fountain.ts`.
This document corrects the earlier owner merge-order guidance ("measure R5
first, then rebase advice-rule-fixes onto it").

## Sources

- `docs/p1-benchmark/BLIND_PAIRS_ON_BRANCHES_2026-09-04.md`
