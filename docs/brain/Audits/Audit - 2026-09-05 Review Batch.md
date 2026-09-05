---
type: audit
updated: 2026-09-05
sources: [docs/audits/2026-09-05-review-batch/README.md, docs/LANE_STANDARD.md]
status: active
---

# Audit — 2026-09-05 Review Batch

**Directory:** `docs/audits/2026-09-05-review-batch/` (`README.md`, plus
one file per reviewed lane: `fixverify-review.md`, `guard-review.md`,
`rank-review.md`, `readiness-review.md`, `timing-review.md`,
`xsurface-review.md`).

**What it is:** the committed record of the six independent reviews from
[[Session - 2026-09-05 Review Batch]], each conducted under
`docs/LANE_STANDARD.md` §6 before its lane merged — one file per reviewer,
the first pass and every re-review appended below it.

**Verdict counts (rounds → merge commit):** readiness/log-prefixes REVISE
6 → REVISE 1 → MERGE (`f7e5507c`); timing/snapshot dialogs/rho row REVISE
3 → MERGE (`7f686808`); keyless Fix & verify REVISE 5 → REVISE 1 → merge on
report (`6697e88d`); cross-surface percentile/rank/signals REVISE 5 → MERGE
+2 nits (`ed87d8a6`); draft rank/dark mode/a11y gate REVISE 7 → MERGE →
rebase REVISE 1 (`58eaafbf`); Fountain shape guard REVISE 5 → 4 → 1 → 1 →
MERGE (`5d2b2638`). **No lane passed on its first pass.**

**What was NOT reproduced:** the reviewers' own probe scripts lived in
session scratch space and are described in the review files, not copied —
every finding they produced is instead pinned by a committed test or
fixture on main, not by the probe script itself. A same-day self-audit of
this directory found its own initial claim wrong: it said none of the
per-round commits cited inside the six review files was reachable after
rebase; checked directly (`git cat-file -e`, `git merge-base
--is-ancestor`), **21 of the cited round SHAs are genuinely unreachable**
but this is "usually true," not universally — the correction is recorded
in place per the lane's own no-rewrite discipline. This episode is also
what [[Patterns]]'s "prove it fails, then prove it passes" / tagging-round
rule in `docs/LANE_STANDARD.md` §6 exists to prevent going forward.

## Sources

- `docs/audits/2026-09-05-review-batch/README.md`
- `docs/LANE_STANDARD.md` §6
