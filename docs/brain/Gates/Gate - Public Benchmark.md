---
type: gate
updated: 2026-09-06
sources: [scripts/lib/public-benchmark.ts, scripts/lib/auc.ts, tests/core/public-benchmark.test.ts, tests/fixtures/public-corpus-manifest.json, tests/fixtures/public-benchmark-split.json, scripts/benchmark-public.ts, scripts/report-unverified-gates.mjs, docs/p1-benchmark/PUBLIC_BENCHMARK_2026-09-06.md]
status: active
---

# Gate — Public Benchmark

**What it checks:** degradation discrimination on the **32 distributable**
screenplays (20 CC0 originals in `data/screenplays/` + the 12 blind-pair
fixtures), recomputed end to end on **every CI run** — no corpus mount, no
API key, no env var, no owner-local step, because the text is committed to
this repository. Two AUCs, both against floors that live in
`scripts/lib/auc.ts` beside `AUC24_FLOOR`:

* **`PUBLIC_SHUFFLE_DROP_FLOOR` = 0.5386** — the AUC-24 recipe
  (`shuffleDropDegrade`, imported verbatim), which changes scene count.
  Measured 0.5586, 95% CI [0.4219, 0.6973].
* **`PUBLIC_ORDER_FLOOR` = 0.4473** — `degradeClimaxRelocate`, which
  preserves scene count exactly (measured scarcity delta 0.000), so the
  `140/sceneCount` scarcity term cancels and only order-sensitivity is left.
  Measured 0.4673, 95% CI [0.4014, 0.5264].

Both floors are `round4(measured − 0.02)`. Alongside the AUCs it locks a
32-row manifest (`sceneCount`, `words`, `health`, `verdict` per script) and a
pre-registered split derived from each file's own sha256, so a scoring
change's effect on real distributable prose lands as a reviewable numeric
diff.

**Command:** `npm run benchmark:public` prints the table;
`npm run benchmark:public -- --lock` re-locks the manifest and the split;
`npm test` runs the assertions unconditionally. `npm run gates` lists this as
the first — and so far only — **VERIFIED** row in
`scripts/report-unverified-gates.mjs`, a section added with this gate because
until then that reporter only ever listed gates that did NOT run.

**Where it lives:** `scripts/lib/public-benchmark.ts` (harness),
`scripts/lib/auc.ts` (floors), `tests/core/public-benchmark.test.ts`
(assertions), `tests/fixtures/public-corpus-manifest.json` and
`tests/fixtures/public-benchmark-split.json` (locks),
`scripts/benchmark-public.ts` (CLI). Method and every number:
[[Measurement - PUBLIC_BENCHMARK_2026-09-06]].

**What it cannot catch — read this before quoting a number:**

* It is **not** [[Gate - AUC-24 Ratchet]] and the two must never be compared.
  Different corpus, different script length, different denominator. The
  feature-scale deductions (`ARC_DED_MIN_SCENES` / `CLIMAX_DED_MIN_SCENES`,
  both 15) never fire at 9–14 scenes, so this gate measures a strictly
  smaller engine.
* **Both intervals contain 0.5.** These are not good numbers; the gate
  ratchets the engine against getting *worse* at something it is already bad
  at here. Raising either floor is a rerun's job, never an edit's.
* It says nothing about **craft**. Mechanical damage is not bad writing —
  that question is [[Measurement - BLIND_PAIRS_2026-09-04]], answer 1 of 6.
* Twenty of the 32 scripts are agent-authored and twelve are one human
  author's, unlabelled by independent readers. The calibration corpus is
  excluded from every asserted number and scored only as a labelled control,
  because [[Measurement - RULE_CHANNEL_EVIDENCE_2026-08-24]] §0 finding 3
  shows its band ordering is carried entirely by the weighted-rule channel.

## Sources

- `scripts/lib/public-benchmark.ts`
- `scripts/lib/auc.ts` (`PUBLIC_SHUFFLE_DROP_FLOOR`, `PUBLIC_ORDER_FLOOR`, `PUBLIC_FLOOR_MARGIN`)
- `tests/core/public-benchmark.test.ts`
- `docs/p1-benchmark/PUBLIC_BENCHMARK_2026-09-06.md`
