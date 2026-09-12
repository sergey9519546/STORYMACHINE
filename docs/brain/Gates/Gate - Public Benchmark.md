---
type: gate
updated: 2026-09-12
sources: [scripts/lib/public-benchmark.ts, scripts/lib/auc.ts, scripts/lib/scene-segments.ts, tests/core/public-benchmark.test.ts, tests/fixtures/public-corpus-manifest.json, tests/fixtures/public-benchmark-split.json, scripts/benchmark-public.ts, scripts/report-unverified-gates.mjs, docs/p1-benchmark/PUBLIC_BENCHMARK_2026-09-06.md]
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
| `CLIMAX_RELOCATE` (scene count preserved, scarcity delta 0.000) | 0.4063 | `PUBLIC_ORDER_PAIRED_FLOOR` 0.3863 | 0.4443 | `PUBLIC_ORDER_FLOOR` 0.4243 |
| `DIALOGUE_FLATTEN` (**POSITIVE CONTROL**) | 1.0000 | `PUBLIC_DIALOGUE_FLATTEN_PAIRED_FLOOR` 0.98 | 0.9473 | `PUBLIC_DIALOGUE_FLATTEN_FLOOR` 0.9273 |

**The `CLIMAX_RELOCATE` row was re-locked on 2026-09-12, and the score did not
move.** That degradation spliced the final scene in at position TWO — leaving the
script's opening intact — while its own label, its `recipe` string, the
measurement doc and this note all said "position 1"
([[Audit - 2026-09-12 Adversarial Review]] finding 12); nothing asserted the
claim. It now moves the final scene to position one and
`assertFinalSceneIsFirst` checks it every run. Floors re-locked from the
corrected, STRONGER manipulation: paired 0.4219 → 0.4063 (floor 0.4019 →
0.3863), all-pairs 0.4673 → 0.4443 (floor 0.4473 → 0.4243), intervals
[0.2813, 0.5625] → [0.2656, 0.5469] and [0.4014, 0.5264] → [0.3662, 0.5112],
inverted pairs 13 → 14 of 32, mean gap −1.46 → −1.23. Nothing on the scoring
path was touched: the doctor output-identity harness is 45/45 byte-identical and
the 32-row manifest re-locked to its previous bytes, so this is an INSTRUMENT
change, not a scoring one. `SHUFFLE_DROP` did not move at all, because the same
change's segmenter fix produces byte-identical output on these 32 scripts (see
[[Gate - AUC-24 Ratchet]] for what it does mean for the corpus run).

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
checked **five** ways: its input exists, its suite exists, the reporter runs the
suite, the suite REPORTS every floor it guards, and — run a second time with one
floor raised above its own measurement — the suite FAILS on that floor by name.
Round 1 checked only the fixture, and deleting the suite left the reporter
printing `[RAN]` and exiting 0. Round 2 ran the suite and read its exit code, and
[[Audit - 2026-09-12 Adversarial Review]] finding 7 defeated that too: a suite
asserting `Number.isFinite(auc)` instead of `auc >= floor` also exits 0. The
mutation run is the liveness check; `npm run gates` costs ~11.5 s because of it,
against 5.9–6.5 s for the single-run version measured back to back.

**Where it lives:** `scripts/lib/public-benchmark.ts` (harness),
`scripts/lib/auc.ts` (floors), `tests/core/public-benchmark.test.ts`
(assertions), `tests/fixtures/public-corpus-manifest.json` and
`tests/fixtures/public-benchmark-split.json` (locks),
`scripts/benchmark-public.ts` (CLI). Method and every number:
[[Measurement - PUBLIC_BENCHMARK_2026-09-06]].

**What it cannot catch — read this before quoting a number:**

* It is **not** [[Gate - AUC-24 Ratchet]] and the two must never be compared.
  Different corpus, different script length, different denominator. The
  feature-scale deduction `ARC_DED_MIN_SCENES` (15) never fires at 9–14 scenes,
  so this gate measures a strictly smaller engine. (`CLIMAX_DED_MIN_SCENES` used
  to be named here too. It gates `climaxZoneDecayDeduction`, which is exported
  and **not wired into health anywhere** — `doctor.ts:2130-2134` records why it
  was reverted — so saying it "never fires at this length" implied it fires at
  some length. It fires at no length. Corrected 2026-09-12,
  [[Audit - 2026-09-12 Adversarial Review]] finding 6.)
* **All four measurement-channel intervals contain 0.5.** These are not good
  numbers; the gate ratchets the engine against getting *worse* at something it
  is already bad at here. Raising any floor is a rerun's job, never an edit's.
* **A third of `CLIMAX_RELOCATE`'s N cannot move** — 10 scripts sit pinned at
  health 76.0 on the saturated density term, so 10 of 32 pairs are exact ties
  (9 of the 10 are those pinned scripts; it was 11 before the 2026-09-12
  position-one fix unfroze one pair). Its narrower interval is pinning, not
  precision.
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
