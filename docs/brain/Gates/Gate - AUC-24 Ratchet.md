---
type: gate
updated: 2026-09-12
sources: [CLAUDE.md, tests/core/real-script-corpus.test.ts, tests/core/auc24-table.test.ts, scripts/lib/auc.ts, scripts/lib/scene-segments.ts, tests/fixtures/real-corpus-manifest.json]
status: active
---

# Gate — AUC-24 Ratchet

**What it checks:** the floor is **AUC-24 ≥ 0.622** — ONE combined
degradation (shuffle scenes AND drop every third) over a 24-script subset;
last measured **0.731**. It is asserted two ways: (1) live, in
`tests/core/real-script-corpus.test.ts` (env-gated on
`REAL_SCRIPT_CORPUS_DIR`), which also locks 72 per-script health/verdict
values (`tests/fixtures/real-corpus-manifest.json`; 71 is an older figure
that appears in a `doctor.ts` comment and should not be trusted over the
manifest itself — see [[Branch - R5 Verbosity Bias]]'s "72-row" wording);
(2) since 2026-09-03, on every CI run with no corpus, by
`tests/core/auc24-table.test.ts`, which recomputes the AUC from a committed
table of 24 intact/degraded health pairs (`tests/fixtures/auc24-table.json`)
— but only once that table exists (produced by `npm run lock-auc24` on the
owner's machine). Both the floor value and the degradation recipe live in
`scripts/lib/auc.ts` — edit the constant there, never a literal in a test.

**THE RECIPE'S SCENE SEGMENTATION CHANGED ON 2026-09-12, AND THE 0.731 WAS
MEASURED ON THE OLD ONE.** `shuffleDropDegrade` split scenes on
`/^(?=INT\.|EXT\.)/mi` until then, so `EST.`, `I/E.`, `INT./EXT.` and Fountain
forced `.HEADING` lines were invisible to it — all four are standard and this
corpus is real screenplays, which use them. Every such script contributed a
weaker degradation, or none: on a mixed-heading script the recipe returned its
input unchanged, and that no-op went into the AUC as an exact tie worth 0.5
([[Audit - 2026-09-12 Adversarial Review]] finding 12). It now segments with the
doctor's own heading grammar (`scripts/lib/scene-segments.ts`), and a no-op is an
error rather than a tie. Consequences:

* **Nothing was invalidated**, because `tests/fixtures/auc24-table.json` has
  never existed — the table has not been locked even once.
* **The owner's `npm run lock-auc24` must run on the NEW recipe.** Its number
  will be the first AUC-24 figure this segmentation has ever produced. **Do not
  compare it to 0.731**, which is a different recipe's measurement.
* **`AUC24_FLOOR` is untouched at 0.622.** Moving a floor is a measurement's
  job, and a recipe that degrades strictly more aggressively is exactly where a
  guessed floor would be a guess wearing a gate's clothes.
* `AUC24_DEGRADATION_ID` is bumped to `shuffle-drop/v2`, so an old-recipe table
  can never be compared to a new measurement —
  `tests/core/auc24-table.test.ts` refuses it.
* On the 32 committed scripts of [[Gate - Public Benchmark]] the new
  segmentation produces byte-identical output (0 of 32 differ), which is why
  neither shuffle-drop floor there moved.

**Command:** `REAL_SCRIPT_CORPUS_DIR=<corpus> npm test` (live);
`REAL_SCRIPT_CORPUS_DIR=<corpus> npm run lock-auc24` (produces the
committed table); `npm test` alone runs the table-based assertion once
`tests/fixtures/auc24-table.json` is committed.

**Where it lives:** `scripts/lib/auc.ts` (constant + recipe);
`tests/core/real-script-corpus.test.ts`; `tests/core/auc24-table.test.ts`;
tracked by [[Gate - Receipt Gate]]'s reporting sibling,
`scripts/report-unverified-gates.mjs` (this gate's table-commit gap
`expires: 2026-10-01`, blocking after that date — see
[[Decision 5 - Every Reported Unverified Gate Gets an Expiry]]).

**What it cannot catch:** a no-op degradation used to be invisible here and is
not any more, but the floor's VALUE is still unverifiable in CI. Also: this is
**not** the same statistic as the 761-script
P1 baseline (SCENE_SHUFFLE 0.734, MIDPOINT_DROP 0.766, separately, against a
≥0.80 gate on a 153-script test partition) — different corpus, different
degradation, different denominator; see
[[Measurement - DISCRIMINATION_BASELINE_2026-07-29]] — **and since 2026-09-12
that baseline's own two recipes (`degradeShuffle`, `degradeMidpointDrop`) segment
scenes differently too**, so a FRESH run of `scripts/rebuild-experiment.mjs` is no
longer comparable to 0.734 / 0.766 any more than a fresh AUC-24 is comparable to
0.731. Both halves of that disclosure come from the same change; see
`scripts/lib/rebuild-experiment-lib.mjs`'s header and
[[Audit - 2026-09-12 Adversarial Review]]. The dated baseline doc is left as
written. Even with the table committed, CI can never verify a *fresh* AUC value — the corpus is
local-only by design and cannot reach CI (copyright; secrets were rejected
as a corpus transport).

## Sources

- `CLAUDE.md` "Which floor, exactly" section
- `scripts/lib/auc.ts`
