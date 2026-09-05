---
type: owner
updated: 2026-09-05
sources: [docs/PATH_TO_EXCELLENCE.md, docs/p1-benchmark/BLIND_PAIRS_ON_BRANCHES_2026-09-04.md]
status: active
---

# Owner Item — Measure and Merge R5 (or Manually Merge with Advice-Rule-Fixes)

**Why only the owner:** requires the same local, copyright-restricted
corpus as [[Owner - Run Measure Real]], plus a judgment call on a
scoring-path change that ships costs the [[Gate - Receipt Gate]] currently
only PENDING OWNER MEASUREMENT.

**What's pending:** `npm run measure-real` has not been run on
[[Branch - R5 Verbosity Bias]]. Per the corrected guidance in
[[Measurement - BLIND_PAIRS_ON_BRANCHES_2026-09-04]], stacking R5 with
[[Branch - Advice Rule Fixes]] needs a **manual merge**, not the clean
rebase the earlier guidance assumed — the two branches conflict on five
files including `character-arc.ts`, `rhythm.ts`, and `fountain.ts`.

**The command:**
```
git checkout claude/r5-verbosity-bias-pending-measurement
REAL_SCRIPT_CORPUS_DIR=<corpus> npm run measure-real
# then re-lock the 72-row real-corpus manifest and merge
```

## Sources

- `docs/PATH_TO_EXCELLENCE.md` "What only the owner can do now"
- `docs/p1-benchmark/BLIND_PAIRS_ON_BRANCHES_2026-09-04.md` "Stacked tree" section
