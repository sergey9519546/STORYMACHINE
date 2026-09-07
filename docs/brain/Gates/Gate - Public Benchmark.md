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
this repository. **Three degradations x two statistics = six floors**, all in
`scripts/lib/auc.ts` beside `AUC24_FLOOR`, mapped once by `PUBLIC_FLOORS`.
**The matched-pair statistic is PRIMARY** — this is a paired design (each
script against a degraded copy of itself) and all-pairs was the friendlier of
the two in 7 of the 8 cells measured.

| channel | matched-pair (PRIMARY) | floor | all-pairs | floor |
|---|---|---|---|---|
| `SHUFFLE_DROP` (AUC-24 recipe, scene count changes) | 0.5313 | `PUBLIC_SHUFFLE_DROP_PAIRED_FLOOR` 0.5113 | 0.5586 | `PUBLIC_SHUFFLE_DROP_FLOOR` 0.5386 |
| `CLIMAX_RELOCATE` (scene count preserved, scarcity delta 0.000) | 0.4219 | `PUBLIC_ORDER_PAIRED_FLOOR` 0.4019 | 0.4673 | `PUBLIC_ORDER_FLOOR` 0.4473 |
| `DIALOGUE_FLATTEN` (**POSITIVE CONTROL**) | 1.0000 | `PUBLIC_DIALOGUE_FLATTEN_PAIRED_FLOOR` 0.98 | 0.9473 | `PUBLIC_DIALOGUE_FLATTEN_FLOOR` 0.9273 |

Every floor is `round4(measured − 0.02)`. **The control is the row that makes
the other two readable**: both measurement channels read chance, and without a
manipulation the score demonstrably DOES catch (32 of 32, zero ties, +29.30
points, ~16.71 of them from outside the density/scarcity formula) a reader
could not tell a blind score from a broken harness. It proves the instrument
reads — never that the score is valid; the engine ships a deduction built for
exactly that manipulation. Alongside the AUCs the gate locks a 32-row manifest
(`sceneCount`, `words`, `health`, `verdict` per script) and a pre-registered
split derived from each file's own sha256, so a scoring change's effect on real
distributable prose lands as a reviewable numeric diff.

**Command:** `npm run benchmark:public` prints the table;
`npm run benchmark:public -- --lock` re-locks the manifest, the split **and all
six floor constants** (printing every before/after — it does not rewrite prose,
and the suite fails until `auc.ts`'s narrative and the measurement doc agree
with the run); `npm test` runs the assertions unconditionally. `npm run gates`
lists this as the first — and so far only — **VERIFIED** row in
`scripts/report-unverified-gates.mjs`, a section added with this gate because
until then that reporter only ever listed gates that did NOT run. That row is
checked three ways: its input exists, its suite exists, **and the reporter runs
the suite** — round 1 checked only the fixture, and deleting the suite left the
reporter printing `[RAN]` for it and exiting 0.

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
* **All four measurement-channel intervals contain 0.5.** These are not good
  numbers; the gate ratchets the engine against getting *worse* at something it
  is already bad at here. Raising any floor is a rerun's job, never an edit's.
* **A third of `CLIMAX_RELOCATE`'s N cannot move** — 10 scripts sit pinned at
  health 76.0 on the density cap, so 11 of 32 pairs are exact ties. Its
  narrower interval is pinning, not precision.
* **No held-out evaluation.** The split is pre-registered and reported; all six
  floors were locked from all 32 scripts, holdout included, so that holdout is
  already spent against these floors.
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
