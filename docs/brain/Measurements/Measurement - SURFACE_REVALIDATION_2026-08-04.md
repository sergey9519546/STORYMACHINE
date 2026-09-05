---
type: measurement
updated: 2026-09-05
sources: [docs/p1-benchmark/SURFACE_REVALIDATION_2026-08-04.md]
status: active
---

# Measurement — SURFACE_REVALIDATION_2026-08-04

**Question:** re-validate the P2/P3 "DONE" claims against the current tree.

**Verdict counts:** 89/89 structural (P2/P4-instrumentation) checks passed.

**⚠ What was superseded same-day:** every `contentHash`/`health`/
`verdict`/`totalIssues` figure originally reported (`33dcf214…` / `68.9` /
`CONSIDER` / `200`) described the run against "The Second Key" sample,
before that day's later stimulus swap to "Dead Frequency" (health 78.3,
`contentHash a1b44eff859d…`) — see
`docs/user-validation/FIELDING_DECISION_BRIEF.md`'s "RESOLVED" addendum.
The 89/89 pass count itself is unaffected — re-run post-swap and confirmed
still 89/89 with the new values substituted, since this script derives its
own checks from whatever `src/lib/sample-script.ts` currently contains.

## Sources

- `docs/p1-benchmark/SURFACE_REVALIDATION_2026-08-04.md`
