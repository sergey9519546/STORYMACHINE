---
type: owner
updated: 2026-09-05
sources: [docs/UNIFIED_STATE_2026-09-02.md, CLAUDE.md, docs/p1-benchmark/MEASUREMENT_RECEIPTS.md]
status: active
---

# Owner Item — Run the Real-Corpus Measurement

**Why only the owner:** the produced-screenplay corpus is local-only and
copyright-restricted by design — it cannot reach CI (mounting it via CI
secrets was rejected: secrets are not a corpus transport, and uploading the
text anywhere is the exact exposure the de-identification work exists to
avoid). Only whoever holds the corpus on their own machine can run this.

**What's pending:** the measurement itself, for the main tree and
separately for [[Branch - R5 Verbosity Bias]] (see
[[Owner - R5 Measurement and Merge]]). A receipt stub is already prepared
in `docs/p1-benchmark/MEASUREMENT_RECEIPTS.md` with everything filled in
except the number.

**The command:**
```
REAL_SCRIPT_CORPUS_DIR=<corpus> npm run measure-real
```

## Sources

- `docs/UNIFIED_STATE_2026-09-02.md` §4, item 3
- `CLAUDE.md` "Standing task" section
