---
type: measurement
updated: 2026-09-05
sources: [docs/p1-benchmark/REBUILD_EXPERIMENT_2026-08-04.md]
status: active
---

# Measurement — REBUILD_EXPERIMENT_2026-08-04

**Question:** which signals actually separate, tested by scoring a corpus
under 32 scoring configurations (all 16 subsets of four unwired candidate
signals, each with/without the weighted-rule channel zeroed) across the
four `measure-auc-split.mjs` degradations.

**Status:** harness built and run
(`scripts/rebuild-experiment.mjs`, `scripts/lib/rebuild-experiment-lib.mjs`,
`tests/core/rebuild-experiment.test.ts`). Every number in the document came
from a run against the **in-repo** corpus.

**What was NOT reproduced / authorized:** **no number here is a corpus
measurement**, and none of it authorizes a scoring change — the maintainer
command named in the document's §8 is the measurement that would.

## Sources

- `docs/p1-benchmark/REBUILD_EXPERIMENT_2026-08-04.md`
