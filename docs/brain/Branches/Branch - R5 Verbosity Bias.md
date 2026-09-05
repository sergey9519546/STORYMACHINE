---
type: branch
updated: 2026-09-05
sources: [docs/p1-benchmark/BLIND_PAIRS_ON_BRANCHES_2026-09-04.md, docs/PATH_TO_EXCELLENCE.md, docs/audits/2026-09-02-retrospective/RETROSPECTIVE.md]
status: parked
---

# Branch — R5 (Verbosity Bias)

**Branch:** `origin/claude/r5-verbosity-bias-pending-measurement` @
`0f625c27` (4 commits).

**What it is:** the dispatched fix for retrospective finding #1 (the
health score rewards padding — appending stateless filler moved health
66.4 → 72.9 across a verdict tier). Density is renormalized by scene
opportunity — `weightedIssues / (sceneCount·30)^0.7`, penalty `8·density²`
— instead of `wordCount^0.7`, because the proposed opportunity count could
not include action paragraphs (they are the filler) or speeches (bad craft
inflates them).

**Why it is parked:** it is a scoring-path change, so it needs
`npm run measure-real` against the local corpus before it can be trusted
and merged (see [[Gate - Receipt Gate]], [[Owner - R5 Measurement and Merge]]).
Measured costs are already written down: the padding witness flips from
+5.4 to −4.4, metamorphic 8/8 with zero known-failing cases, 11,212 tests
0 failing — but calibration band separation halves (25.3 → 11.1), the
composite discrimination pair sits 0.2 above its gate, all 45 in-repo
reports move (28 change verdict), one feature-scale tier assertion is
SUSPENDED pending verdict re-anchoring, and the 72-row real-corpus manifest
is stale until re-locked.

**The conflict:** R5 branched from an older `main` commit (~74 commits
behind where [[Branch - Advice Rule Fixes]] branched); the two branches
conflict on five files (`character-arc.ts`, `rhythm.ts`, `fountain.ts`,
plus two others) when stacked, so a clean rebase is not possible — a manual
merge is required. On the blind-pairs fixtures, **R5 alone orders 3 of 6**
pairs (up from 1 of 6 on main) — but only by un-pinning a tie and exposing
raw weighted-issue order, itself at chance on this set; 0 of 12 blind
scripts tie at one health value (main ties 9 of 12).

## Sources

- `docs/p1-benchmark/BLIND_PAIRS_ON_BRANCHES_2026-09-04.md`
- `docs/DECISION_LOG.md` / `docs/audits/2026-09-02-retrospective/RETROSPECTIVE.md` finding #1
