---
type: measurement
updated: 2026-09-06
sources: [docs/scoring/ADVICE_RULE_FIXES_2026-09-04.md, docs/p1-benchmark/MEASUREMENT_RECEIPTS.md]
status: pending-measurement
---

# Measurement — ADVICE_RULE_FIXES_2026-09-04

**Question:** the 2026-09-04 advice-quality audit
([[Measurement - DETECTOR_DEFECTS_2026-08-03]] is its predecessor) found the
tool's accuracy running inversely to draft quality — the well-made member of
a matched pair was told more was wrong with it than its badly-made twin. Six
of the named detector defects are correctness bugs rather than judgment
calls. Fix those six and measure what moves.

**What changed:** six detector corrections across `fountain-analyzer.ts`,
`reversal-detection.ts`, `structure.ts` and six revision passes. A rule that
was a constant on 42 of 42 scripts now separates them; a rule that could not
fire on a script made entirely of its own target defect now fires four times
there and zero times on the well-made twin; three findings that printed
impossible facts print true ones; the health denominator stopped counting the
repository's own provenance headers.

**Status: PENDING OWNER MEASUREMENT.** No real-corpus run has happened, and
this range widens a previously dead predicate as well as changing the
denominator, so a re-measurement is not a formality. See
[[Gate - Receipt Gate]] and [[Owner - R5 Measurement and Merge]].

**Measured in-repo, against `main` at `2bfcbf9d` (2026-09-06 re-run after the
rebase):** 45 of 45 reports differ; health moves on 29 of 45 (RMS 6.88) and
3 verdicts change. The 16 fixtures that do not move are already at `main`'s
density clamp — a detector fix cannot move a number sitting at its ceiling.
On the blind matched pairs the branch alone changes nothing measurable: 1 of
6 ordered, mean gap +0.03, nine of twelve scripts still tied at exactly 76.0
([[Measurement - BLIND_PAIRS_ON_BRANCHES_2026-09-04]]).

**What the stack shows, and what it does not:** stacked under
[[Branch - R5 Verbosity Bias]] the same six fixes DO separate the audit's
matched pair, 60.4 against 47.1, because R5 removes the clamp that was
flattening the 132-against-150 finding difference into 76.0 against 76.0.
Section 9 of the source doc records this and leaves section 8's contrary
claim standing, since that claim is accurate about this branch by itself.

**What this fed:** [[Branch - Advice Rule Fixes]], and through it the stacked
branch `scoring/stacked-r5-plus-advice` that the owner's second measurement
needs.

## Sources

- `docs/scoring/ADVICE_RULE_FIXES_2026-09-04.md`
- `docs/p1-benchmark/MEASUREMENT_RECEIPTS.md` (the PENDING entry and its 2026-09-06 addendum)
