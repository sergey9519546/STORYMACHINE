---
type: branch
updated: 2026-09-05
sources: [docs/p1-benchmark/BLIND_PAIRS_ON_BRANCHES_2026-09-04.md]
status: parked
---

# Branch — Advice-Rule-Fixes

**Branch:** `origin/claude/advice-rule-fixes-pending-measurement` @
`68c64eca`.

**What it is:** six detector-correctness fixes (corrects six specific
detector defects — see [[Measurement - DETECTOR_DEFECTS_2026-08-03]]),
distinct from [[Branch - R5 Verbosity Bias]]'s formula-level change to the
density calculation.

**Why it is parked:** same as R5 — a scoring-path change awaiting
`npm run measure-real` before merge (see [[Gate - Receipt Gate]]).
Alone, on the twelve blind-pairs fixtures, it **changes nothing measurable**
(1 of 6 ordered, matching main's own baseline exactly) — nine of twelve
scripts still tie at exactly health 76.0, all at chance on the rule
channel.

**The conflict:** stacking with R5 requires a manual merge, not a clean
rebase — the branches conflict on five files including `character-arc.ts`,
`rhythm.ts`, and `fountain.ts`. A cherry-pick of advice-rule-fixes' one
real commit (`68c64eca`) onto the R5 tip was tried as a cleaner test of
"the stack" but the measurement was not completed in that document.

## Sources

- `docs/p1-benchmark/BLIND_PAIRS_ON_BRANCHES_2026-09-04.md`
