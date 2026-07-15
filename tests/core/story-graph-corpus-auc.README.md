# Story Graph Position-Sensitivity Regression Test

## Purpose

**This is a structural regression guard**, not a craft discrimination test.

It proves graph-native metrics (forwardEdgeRatio, arcCoherence, graphHealth) are **not position-blind** by measuring their ability to discriminate between intact screenplays and synthetically corrupted versions (acts reordered 1-2-3 → 3-1-2).

**Target**: AUC ≥ 0.70 ensures metrics detect large-scale scene-order scrambling.

## What this does NOT do

This does **not** satisfy P1's requirement for proving the score discriminates craft quality on real writing. P1 requires:

> A legally distributable benchmark of real drafts... independently blind-labeled by >=3 experienced readers, with a pre-registered split, held-out evaluation, and uncertainty reporting.

Act-swap corruption is synthetic—it proves position-sensitivity (good!) but not craft discrimination (P1's goal).

## Usage

By default, this test is **skipped** (like `real-script-corpus.test.ts`). To enable:

```bash
# Set the corpus directory to your merged-fountain corpus path
export STORY_GRAPH_CORPUS_DIR="/path/to/corpus-pipeline/output/merged-fountain"

# Run the test
node --experimental-strip-types tests/core/story-graph-corpus-auc.test.ts

# Or run all tests (this will skip if env var not set)
npm test
```

## Expected corpus format

- Fountain format (`.fountain.txt` files)
- Minimum 15 scenes per script (configurable in test)
- Tests sample up to 50 scripts by default

## Interpretation

- **AUC ≥ 0.70**: Metric successfully detects structural scrambling (position-sensitive)
- **AUC < 0.70**: Regression—metric may have become position-blind
- **Separation (mean difference)**: Shows practical effect size beyond AUC

## Related files

- `real-script-corpus.test.ts` — Env-gated harness for real-corpus validation
- `doctor.ts:1656-1669` — Current AUC measurements on calibration corpus
