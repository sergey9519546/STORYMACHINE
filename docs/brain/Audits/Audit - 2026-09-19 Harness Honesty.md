---
type: audit
updated: 2026-09-19
sources: [docs/audits/2026-09-19-harness-honesty/README.md, scripts/lib/scene-segments.ts, scripts/lib/auc.ts, tests/core/scene-segments.test.ts, tests/core/auc.test.ts, tests/core/story-graph-corpus-auc.test.ts, tests/core/real-script-corpus.test.ts, CLAUDE.md]
status: active
---

# Audit — 2026-09-19 Harness Honesty

**Directory:** `docs/audits/2026-09-19-harness-honesty/` — the lane record
for two measurement-harness fixes on `claude/fable-5-1-orchestrator-yil0xr`
from `31d83cb6`. Neither touches the scoring path.

## What it answers

Two verified defects, both in the AUC/degradation harnesses rather than the
doctor:

1. **`reassembleFountainScenes`** (`scripts/lib/scene-segments.ts`) welded
   two scenes together whenever a script's final scene lacked a trailing
   newline and a degradation relocated that scene out of last position — the
   next scene's heading ran onto the previous scene's last prose line and
   stopped parsing as a heading. `shuffleDropDegrade` silently lost an extra
   scene beyond the intended drop; `assertFinalSceneIsFirst` (`scripts/lib/
   auc.ts`) threw a false "changed the scene count" error on CLIMAX_RELOCATE.
   Fixed by inserting a `\n` after a relocated slice that lacks its own
   terminator — the identity permutation still reproduces the source
   byte-for-byte. Because the recipe's output can change for such input,
   `AUC24_DEGRADATION_ID` bumps again, to `shuffle-drop/v3` (it was bumped to
   `v2` on 2026-09-12 for the unrelated segmentation-grammar fix — see
   [[Gate - AUC-24 Ratchet]]). `AUC24_FLOOR` (0.622) is untouched; no table
   has ever been locked, so nothing is invalidated. The fix also required
   making `assertFinalSceneIsFirst`'s scene-equality check tolerant of the
   one inserted terminator, without weakening it against any other mismatch.
2. **`tests/core/story-graph-corpus-auc.test.ts`** used to `return` from
   inside `describe()` when `STORY_GRAPH_CORPUS_DIR` was unset, registering
   ZERO tests — not a failure, not even a skip count, invisible to `npm
   test`'s own numbers. Restructured to match `tests/core/
   real-script-corpus.test.ts`'s own three-state (unset / broken / valid)
   skip pattern: every `it()` now always registers, carries `{ skip: reason
   }` naming the env var, and a dedicated integrity test fails loudly (rather
   than skipping) when the path is set but doesn't exist.

## Why it is safe to have merged

`node scripts/check-scoring-receipt.mjs 31d83cb6..HEAD` reports "no
scoring-path files changed" — everything touched lives under `scripts/**` or
`tests/**`, neither reachable from `doctor.ts`. The public-benchmark's six
committed statistics (see [[Gate - Public Benchmark]]) are **measured
unchanged** after the fix — 0.5313/0.5586, 0.4063/0.4443, 1.0000/0.9473 —
because all 32 committed public-benchmark scripts end with a trailing
newline, so the new reassembly branch never executes on any of them. No
floor constant was touched, no re-lock was run. The probe case from the
session report was reproduced fresh, shown failing on the old reassembly
(temporarily reverted, then restored), and shown passing on the fix — the
standing [[Patterns]] lesson this repository keeps re-learning: assert the
defect exists before claiming the fix, not after.

**Related:** [[Gate - AUC-24 Ratchet]], [[Gate - Public Benchmark]],
[[Audit - 2026-09-12 Adversarial Review]], [[Patterns]], `docs/LANE_STANDARD.md`,
`docs/audits/2026-09-19-harness-honesty/README.md`.

## Sources

- `docs/audits/2026-09-19-harness-honesty/README.md`
- `scripts/lib/scene-segments.ts`
- `scripts/lib/auc.ts`
- `tests/core/scene-segments.test.ts`
- `tests/core/auc.test.ts`
- `tests/core/story-graph-corpus-auc.test.ts`
- `tests/core/real-script-corpus.test.ts`
- `CLAUDE.md`
