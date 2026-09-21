# Saturation sweep — what each `SCARCITY_SATURATION_SCENES` setting costs in ceiling and buys in padding resistance

**Lane:** `lane/land-feature-length-defects`, measured on `4a0ad86a`
(`docs(scoring): disclose the 88.3 ceiling, the gain's composition, the
feature-length evidence and the double-spent split`).
**Date:** 2026-09-21. **Machine:** Intel(R) Xeon(R) Processor @ 2.80GHz x4,
16 GiB, node v22.22.2, linux/x64.
**Scope:** measurement only. **No file on the scoring path is changed by this
lane** — `git diff --stat 4a0ad86a -- server/` is empty, and every number below
comes from a scratch copy of this tree outside the worktree.

**What this answers.** `docs/scoring/FEATURE_LENGTH_DEFECTS_2026-09-07.md` §13
and this README's D1 disclose that `scarcityPenalty = 140 / min(max(n, 1), 12)`
caps health at 88.3 for every script of 12 or more scenes, retiring the
`excellent` grade at feature length, and leave the owner three answers without
measuring what any of them costs. §8.2 of that document records why 12 rather
than 13 or 15; it does not measure 24, 60, 120 or removal. This sweep varies
that one constant and nothing else, and reports the trade.

---

## 1. The scratch mechanism

One `git archive` of `HEAD` per setting, `node_modules` symlinked, and exactly
one line changed in each copy. No scratch tree is ever the worktree, and the
worktree's `doctor.ts` is untouched throughout.

```
SC=<scratchpad>                      # session scratchpad directory
WT=$SC/wt-sat                        # the lane worktree, at 4a0ad86a
cd $WT
for S in S12 S24 S60 S120 NONE; do
  mkdir -p $SC/sweep/$S
  git archive HEAD | tar -x -C $SC/sweep/$S
  ln -s /home/user/STORYMACHINE/node_modules $SC/sweep/$S/node_modules
done
perl -0pi -e 's/const SCARCITY_SATURATION_SCENES = 12;/const SCARCITY_SATURATION_SCENES = 24;/'                      $SC/sweep/S24/server/nvm/analyze/doctor.ts
perl -0pi -e 's/const SCARCITY_SATURATION_SCENES = 12;/const SCARCITY_SATURATION_SCENES = 60;/'                      $SC/sweep/S60/server/nvm/analyze/doctor.ts
perl -0pi -e 's/const SCARCITY_SATURATION_SCENES = 12;/const SCARCITY_SATURATION_SCENES = 120;/'                     $SC/sweep/S120/server/nvm/analyze/doctor.ts
perl -0pi -e 's/const SCARCITY_SATURATION_SCENES = 12;/const SCARCITY_SATURATION_SCENES = Number.POSITIVE_INFINITY;/' $SC/sweep/NONE/server/nvm/analyze/doctor.ts
# verified: diff against `git show HEAD:server/nvm/analyze/doctor.ts` is that
# one line (doctor.ts:678) in every tree, and empty in S12.
```

The constant is function-local (`scarcityPenalty`, `doctor.ts:560-680`) — it
stays there for the documented temporal-dead-zone reason, so there is no env
var or parameter to vary and a scratch copy is the only honest mechanism.

**`NONE` means the pre-branch term.** `Math.min(Math.max(n, 1), Infinity)` is
`Math.max(n, 1)`, so `NONE` computes `140 / n` for every script of one or more
scenes — the 2026-09-06 formula, with the divide-by-zero guard the branch
added kept in place. It is NOT the session head `6ca3fcd0`: the density
steepness change, the `ORPHAN_CLUE` guard and the report fixes are all still
present. `NONE` isolates the saturation, it does not revert the branch.

Two extra trees, `S13`/`S14`/`S15`, were built the same way for the boundary
probe in §5. They are not part of the five-setting table.

## 2. The commands, exactly as run

Each was run with the scratch tree as the working directory (`cd $SC/sweep/$S`)
or with the tree root as the probe's only argument.

| measure | command |
|---|---|
| 1. ceiling + clean feature | `node --experimental-strip-types --no-warnings $SC/probe-ceiling.mjs $SC/sweep/$S` |
| 2. public benchmark | `node --experimental-strip-types scripts/benchmark-public.ts --json` (no `--lock`, ever) |
| 2b. floor assertions | `node --experimental-strip-types --test tests/core/public-benchmark.test.ts` |
| 3. blind pairs | `node --experimental-strip-types --test tests/core/blind-pairs-discrimination.test.ts` |
| 4. metamorphic | `node --experimental-strip-types evals/scoring/runner/run-metamorphic.ts` (`npm run test:metamorphic`) |
| 4b. padding probe | `node --experimental-strip-types --no-warnings $SC/probe-padding.mjs $SC/sweep/$S` |
| 5. feature fixture | `node --experimental-strip-types --no-warnings $SC/probe-feature.mjs $SC/sweep/$S` |
| 6. calibration | `node --experimental-strip-types --test tests/core/calibration.test.ts` |
| 7. identity fixtures | `node scripts/check-doctor-output-identity.mjs --tree $SC/sweep/$S --out $SC/id-$S` |

The three probes are recorded verbatim in §7 so every number here can be
rebuilt from this file alone.

---

## 3. The table — five settings, eight measures

`S12` is the shipped candidate. Every cell is measured on this tree, not
quoted from an earlier pass.

| measure | **S12** (shipped) | **S24** | **S60** | **S120** | **NONE** (`140/n`) |
|---|---|---|---|---|---|
| **1a. zero-issue ceiling** `computeHealthScore({0,0,0}, n, 50000)`, n = 12 / 24 / 60 / 120 / 231 / 300 | 88.3 / 88.3 / 88.3 / 88.3 / 88.3 / 88.3 | 88.3 / 94.2 / 94.2 / 94.2 / 94.2 / 94.2 | 88.3 / 94.2 / 97.7 / 97.7 / 97.7 / 97.7 | 88.3 / 94.2 / 97.7 / 98.8 / 98.8 / 98.8 | 88.3 / 94.2 / 97.7 / 98.8 / 99.4 / 99.5 |
| **1b. `excellent` (>= 90) reachable by a zero-issue draft of 12+ scenes** — needs `min(n, S) >= 14` | **no, at any length** | yes, from 14 scenes (90.0) | yes, from 14 scenes | yes, from 14 scenes | yes, from 14 scenes |
| **1c. clean 100-scene feature** at the repo's measured density penalty **8.8965** (`assembled-feature.fountain`): health / grade / verdict | 79.4 `strong` CONSIDER | 85.3 `strong` **RECOMMEND** | 88.8 `strong` **RECOMMEND** | 89.7 `strong` **RECOMMEND** | 89.7 `strong` **RECOMMEND** |
| **2. public benchmark, matched-pair (PRIMARY)** DROP / CLIMAX / CTRL | 0.8750 / 0.5938 / 1.0000 | 0.8750 / 0.5938 / 1.0000 | 0.8750 / 0.5938 / 1.0000 | 0.8750 / 0.5938 / 1.0000 | 0.8750 / 0.5938 / 1.0000 |
| **2. public benchmark, all-pairs** DROP / CLIMAX / CTRL | 0.8291 / **0.5269** / 1.0000 | 0.8306 / 0.5176 / 1.0000 | 0.8306 / 0.5176 / 1.0000 | 0.8306 / 0.5176 / 1.0000 | 0.8306 / 0.5176 / 1.0000 |
| **2. ordered / inverted / tied** DROP ; CLIMAX ; CTRL | 28/4/0 ; 18/12/2 ; 32/0/0 | 28/4/0 ; 18/12/2 ; 32/0/0 | 28/4/0 ; 18/12/2 ; 32/0/0 | 28/4/0 ; 18/12/2 ; 32/0/0 | 28/4/0 ; 18/12/2 ; 32/0/0 |
| **2. mean health gap** DROP ; CLIMAX | +1.8937 ; +0.0875 | +2.1094 ; +0.0875 | +2.1094 ; +0.0875 | +2.1094 ; +0.0875 | +2.1094 ; +0.0875 |
| **2b. all six committed floors clear** | yes (33/33) | yes, 6/6 floor subtests (suite 29/4 — bookkeeping, §4) | yes, 6/6 (29/4) | yes, 6/6 (29/4) | yes, 6/6 (29/4) |
| **3. blind pairs** | ordered 4 of 6, mean gap 0.3833 | 4 of 6, 0.3833 | 4 of 6, 0.3833 | 4 of 6, 0.3833 | 4 of 6, 0.3833 |
| **4. `scene_dup_padding`** (base 61.3 at 9 scenes -> 18) | **-4.4 PASS** | -0.6 PASS | -0.6 PASS | -0.6 PASS | -0.6 PASS |
| **4. `stapled_shorts`** (best part 81.8, max over 14 orderings) | **-1.6 PASS** [min 76.8, max 80.2, range 3.4] | **+4.2 HARD FAIL** [82.6-86.0] | **+7.7 HARD FAIL** [86.1-89.5] | **+8.9 HARD FAIL** [87.3-90.7] | **+9.0 HARD FAIL** [87.5-90.8] |
| **4. `npm run test:metamorphic` exit** | **0** (7 hard passes) | **1** | **1** | **1** | **1** |
| **4b. padding probe** — `undertow.fountain` (12 scenes, 78.2) padded to 24 / 60 / 120 / 300 scenes | 66.4 / 62.2 / 59.4 / 57.9 | 72.3 / 68.0 / 65.2 / 63.8 | 72.3 / 71.5 / 68.7 / 67.3 | 72.3 / 71.5 / 69.9 / 68.4 | 72.3 / 71.5 / 69.9 / 69.1 |
| **4b. what padding to 300 scenes buys vs S12** | — (reference) | +5.9 | +9.4 | +10.5 | +11.2 |
| **5. `assembled-feature.fountain`** (231 scenes) intact health / grade / verdict | 74.4 `solid` CONSIDER | 80.3 `strong` CONSIDER | 83.8 `strong` CONSIDER | 84.9 `strong` CONSIDER | **85.5 `strong` RECOMMEND** |
| **5. its shuffle-drop gap** (`shuffleDropDegrade`, seed 1098408135, 231 -> 154 scenes) | 74.4 - 58.1 = **+16.30** | 80.3 - 64.0 = **+16.30** | 83.8 - 67.5 = **+16.30** | 84.9 - 68.6 = **+16.30** | 85.5 - 68.9 = **+16.60** |
| **6. `tests/core/calibration.test.ts`** | 21/21, monotonicity holds | 21/21 | 21/21 | 21/21 | 21/21 |
| **7. 45 identity fixtures vs S12** health moves / verdict flips / grade flips | — (reference) | 10 / **1** / 0 | 10 / **4** / 0 | 10 / **4** / **1** | 10 / **4** / **1** |

Rounding note: the ceiling row is `computeHealthScore`'s own one-decimal
output. The arithmetic behind it is `100 - 140/min(n, S)` exactly: 88.333 at
S = 12, 94.167 at 24, 97.667 at 60, 98.833 at 120.

## 4. What is behind three of the cells

**Measure 2b, and why "29/4" is not a floor failure.** At S24 and above
`tests/core/public-benchmark.test.ts` reports 29 pass / 4 fail, and **none of
the four is a floor**. All six ratchet subtests pass at every setting, and so
does "every floor sits a stated margin below a real measurement":

```
ok 1 - SHUFFLE_DROP paired AUC clears PUBLIC_SHUFFLE_DROP_PAIRED_FLOOR = 0.855 (PRIMARY)
ok 2 - SHUFFLE_DROP allPairs AUC clears PUBLIC_SHUFFLE_DROP_FLOOR = 0.8091
ok 3 - CLIMAX_RELOCATE paired AUC clears PUBLIC_ORDER_PAIRED_FLOOR = 0.5738 (PRIMARY)
ok 4 - CLIMAX_RELOCATE allPairs AUC clears PUBLIC_ORDER_FLOOR = 0.5069
ok 5 - DIALOGUE_FLATTEN paired AUC clears PUBLIC_DIALOGUE_FLATTEN_PAIRED_FLOOR = 0.98 (PRIMARY)
ok 6 - DIALOGUE_FLATTEN allPairs AUC clears PUBLIC_DIALOGUE_FLATTEN_FLOOR = 0.98
ok 7 - every floor sits a stated margin below a real measurement, not at a round number
```

The four failures are bookkeeping a re-lock would settle: the 32-row manifest
(six 13-and-14-scene rows move), the re-lock idempotence subtest, and the two
subtests that require the committed narrative in `scripts/lib/auc.ts` and
`docs/p1-benchmark/PUBLIC_BENCHMARK_2026-09-06.md` to quote the measured
values. **Nothing here was re-locked.** A sweep does not move a ratchet.

**Measure 4b, and what the padding probe does and does not show.** The probe
appends duplicated scenes from `undertow.fountain` itself, cycling through its
twelve in order, so every padded document is a literal repetition. Health
**falls** at every setting and every k, because duplication manufactures
findings faster than it manufactures scarcity relief. The row that matters is
the difference between the columns, which is pure scarcity: padding a 12-scene
script to 300 scenes is worth `140/12 - 140/min(300, S)` points more at
setting S than at S12 — 5.833 at S24, 9.333 at S60, 10.5 at S120, 11.2 at
NONE, against measured 5.9 / 9.4 / 10.5 / 11.2. The arithmetic and the
measurement agree to a rounding step.

**That is the floor on what padding buys, not the ceiling.** The naive padder
pays a density price the scarcity relief does not cover. `stapled_shorts` is
the same manipulation without that price — twelve DIFFERENT shorts, so the
repetition findings never fire — and there the relief is collected in full:
at S24 the best of 14 orderings scores **+4.2 above its own best part**, at
S60 **+7.7**, at S120 **+8.9**, at NONE **+9.0**. Under S12 it is **-1.6**,
and that margin is not a residue: at a saturation point of 12 the term
contributes exactly zero to the comparison (`140/min(139,12) = 140/min(12,12)`),
so what is left is the staple's own density disadvantage.

**Measure 7, the ten fixtures that move.** The same ten at every setting — the
four synthetic scale fixtures and the six committed screenplays of 13 or 14
scenes. Every other one of the 45 is 9-12 scenes, where `min(n, S)` is `n` for
every S in this sweep and the term is byte-identical.

| fixture | scenes | S12 | S24 | S60 | S120 | NONE |
|---|---|---|---|---|---|---|
| `synthetic/300-scenes` | 306 | 79.6 | 85.4 | 88.9 | **90.1** | **90.8** |
| `synthetic/240-scenes` | 244 | 77.6 | 83.5 | 87.0 | 88.1 | 88.7 |
| `synthetic/120-scenes` | 120 | 76.7 | 82.5 | 86.0 | 87.2 | 87.2 |
| `synthetic/60-scenes` | 62 | 76.6 | 82.5 | 86.0 | 86.1 | 86.1 |
| `screenplay/code-blue` | 14 | 77.8 | 79.5 | 79.5 | 79.5 | 79.5 |
| `screenplay/red-line` | 14 | 76.7 | 78.3 | 78.3 | 78.3 | 78.3 |
| `screenplay/chain-of-custody` | 13 | 77.7 | 78.6 | 78.6 | 78.6 | 78.6 |
| `screenplay/close-quarters` | 13 | 77.8 | 78.7 | 78.7 | 78.7 | 78.7 |
| `screenplay/high-voltage` | 13 | 78.3 | 79.2 | 79.2 | 79.2 | 79.2 |
| `screenplay/two-lane` | 13 | 78.7 | 79.6 | 79.6 | 79.6 | 79.6 |

The verdict flips are all four synthetic fixtures crossing CONSIDER ->
RECOMMEND (only `300-scenes` at S24; all four from S60 up). The one grade flip
is `synthetic/300-scenes` reaching `excellent` at S120 (90.1) and NONE (90.8) —
a 306-scene document with 985 findings, which is the shape of the thing the
saturation exists to stop.

## 5. The boundary, measured: 13 passes, 14 does not

The table's five settings leave a gap between 12 and 24 that decides the
question this sweep was asked. Three more scratch trees, same mechanism, same
commands:

| setting | zero-issue ceiling (n >= S) | `scene_dup_padding` | `stapled_shorts` (best part 81.8) | metamorphic exit |
|---|---|---|---|---|
| S12 | 88.3 | -4.4 PASS | -1.6 PASS [76.8-80.2] | 0 |
| **S13** | **89.2** | -3.5 PASS | **-0.7 PASS** [77.7-81.1] | **0** |
| **S14** | **90.0** | -2.8 PASS | **+0.1 HARD FAIL** [78.5-81.9] | **1** |
| S15 | 90.7 | -2.1 PASS | +0.7 HARD FAIL [79.1-82.5] | 1 |

This reproduces §8.2's own 14-ordering table (`1.6 / 0.7 / -0.1 / -0.7` margins
at 12 / 13 / 14 / 15) on this tree, from the runner rather than from a probe.

**The two boundaries coincide.** The witness passes exactly when `S <= 13`.
A zero-issue draft reaches 90.0 exactly when `min(n, S) >= 14` (`140/14 = 10`),
which needs `S >= 14`. Measured, at n = 13 / 14 / 15 / 16 / 24 the zero-issue
score reads 88.3 flat at S12, 89.2 flat at S13, `89.2 / 90.0 / 90.0 / 90.0 /
90.0` at S14 and `89.2 / 90.0 / 90.7 / 91.3 / 94.2` at S24 and every setting
above it. There is no setting on either side of that line that has both.

## 6. The plain reading

**What a writer can buy by padding (measure 4).**

* **S12** — nothing at or above 12 scenes. Stapling twelve unrelated shorts
  scores 1.6 points BELOW the best part in the worst of 14 orderings, and
  duplicating a 12-scene script's scenes to 300 costs 20.3 points.
* **S24** — 5.8 points of scarcity relief for padding to 24+ scenes, and the
  staple beats its own best part by 4.2.
* **S60** — 9.3 points, staple +7.7.
* **S120** — 10.5 points, staple +8.9.
* **NONE** — 11.2 points, staple +9.0 and a 306-scene fixture of 985 findings
  graded `excellent`.

**What the top grade costs (measure 1).**

* **S12** — `excellent` is unreachable for any draft of 12 or more scenes, and
  RECOMMEND requires density plus deductions under 3.33 points at a corpus
  whose one feature carries 8.90 of density alone. This tree's 231-scene
  fixture reads 74.4 `solid`.
* **S24** — the ceiling rises to 90.0 at 14 scenes and 94.2 at 24 and above; a
  clean 100-scene feature at the measured density reads 85.3 and RECOMMEND
  returns. `excellent` becomes reachable, but for a 24+-scene draft only with
  under 4.17 points of density and deductions combined.
* **S60 / S120 / NONE** — ceilings 97.7 / 98.8 / 99.5; the same clean feature
  reads 88.8 / 89.7 / 89.7.
* **At NO setting does a clean 100-scene feature carrying this repository's
  measured density penalty reach 90.** It needs `140/min(100, S) <= 1.1`, i.e.
  `min(100, S) >= 127.3`, which no S can satisfy at 100 scenes. Removing the
  saturation entirely does not restore `excellent` for a typical feature; it
  restores it for a 306-scene stapled synthetic. The grade is held below 90 by
  the density term at feature length, not only by this constant.

**What the benchmark says (measures 2 and 3).** Nothing, in either direction.
All three matched-pair AUCs — the PRIMARY statistic — are identical to four
decimals at all five settings, blind pairs are 4 of 6 with mean gap 0.3833 at
all five, and calibration is 21/21 at all five. The only movement in the entire
public channel is in the two secondary all-pairs statistics, and it points both
ways: S12 is 0.0015 WORSE on shuffle-drop all-pairs (0.8291 vs 0.8306) and
0.0093 BETTER on climax-relocate all-pairs (0.5269 vs 0.5176). Both differences
are far inside the 1/32 = 0.03125 quantum a single pair flip moves the paired
statistic by (D9). **The public benchmark cannot arbitrate this constant**, for
the reason D3 and D6 give: all 32 scripts are 9-14 scenes, so `min(n, S)` is
`n` for every S >= 15 and the term is identical; only S12 and S13 touch the six
13-and-14-scene scripts at all.

**Dominance, stated without adjectives.**

* On **padding resistance** (measure 4), the ordering is strict and total:
  S12 > S13 > S14 > S15 > S24 > S60 > S120 > NONE. S12 dominates every other
  setting on both witnesses.
* On **ceiling** (measure 1a), the ordering is exactly reversed and equally
  strict: NONE > S120 > S60 > S24 > S15 > S14 > S13 > S12.
* On **public discrimination** (measures 2, 3, 6), no setting dominates any
  other: the primary statistics, the blind pairs and the calibration bands are
  identical, and the two secondary statistics split one each.
* On **feature-scale separation** (measure 5), no setting dominates: the
  shuffle-drop gap on the 231-scene fixture is +16.30 at S12, S24, S60 and
  S120 and +16.60 at NONE. The saturation is a level shift at feature scale —
  intact and degraded fall together — so it cannot move a matched-pair
  statistic. NONE's +0.30 is the one place the term does not cancel
  (`140/154 - 140/231`), and it is inside the seed noise D3 measured
  (-0.60 to +1.00 over twelve seed keys).
* On **committed floors** (measure 2b), no setting dominates: all six clear
  everywhere.

**So the trade is one-dimensional.** The ceiling and the padding resistance are
the same number read from two ends — `140/min(n, S)` is both the health a long
script cannot earn and the health a padded script cannot buy — and every other
measured axis is flat. There is no setting that is better on both, and no
measurement in this repository that breaks the tie from outside.

**Is there a setting that keeps the padding witness passing while lifting the
ceiling above 90 for a clean 100-scene feature? No, twice over.**

1. The witness passes only at `S <= 13` (§5, measured), where a zero-issue
   draft tops out at 89.2 whatever its length. The smallest setting that puts
   any draft at 90.0 is S14, and S14 fails `stapled_shorts` by +0.1 over its
   14 orderings.
2. Even setting the witness aside, no S lifts a clean 100-scene feature
   carrying the measured 8.90 density penalty to 90 — the arithmetic above
   caps it at 89.7 for every `S >= 100`.

If the owner wants `excellent` reachable at feature length, this constant is
not the lever that reaches it alone. The levers that do are the ones D1 already
names — the threshold, or the density term — and each needs its own
measurement.

## 7. The three probes, verbatim

Saved outside the repository during the sweep; reproduced here so this file is
self-contained. Each takes a scratch tree's root as its only argument.

`probe-ceiling.mjs` (measure 1):

```js
const tree = process.argv[2];
const { computeHealthScore, computeRawCraftScore, gradeForHealth, verdictFor, runScriptDoctor } =
  await import(tree + '/server/nvm/analyze/doctor.ts');
const zero = { critical: 0, major: 0, minor: 0 };
for (const n of [12, 24, 60, 120, 231, 300]) console.log(n, computeHealthScore(zero, n, 50000));
const fs = await import('node:fs');
const REL = 'tests/fixtures/feature-length/assembled-feature.fountain';
const r = await runScriptDoctor(fs.readFileSync(tree + '/' + REL, 'utf8'));
const raw = computeRawCraftScore(r.bySeverity, r.sceneCount, r.wordCount);
// scarcity is recovered by scoring a zero-issue document at the same scene
// count with a word count large enough to drive the density term to 0.
const scarcity231 = 100 - computeRawCraftScore(zero, r.sceneCount, 1e12);
const density = 100 - raw - scarcity231;                       // 8.8965
const scarcity100 = 100 - computeRawCraftScore(zero, 100, 1e12);
const clean100 = 100 - density - scarcity100;
console.log(density, clean100, gradeForHealth(+clean100.toFixed(1)), verdictFor(+clean100.toFixed(1), 100));
```

`probe-padding.mjs` (measure 4b):

```js
const tree = process.argv[2];
const fs = await import('node:fs');
const { runScriptDoctor } = await import(tree + '/server/nvm/analyze/doctor.ts');
const { segmentFountainScenes, reassembleFountainScenes, countFountainScenes } =
  await import(tree + '/scripts/lib/scene-segments.ts');   // the doctor's own heading grammar
const text = fs.readFileSync(tree + '/data/screenplays/undertow.fountain', 'utf8');
const { head, scenes } = segmentFountainScenes(text);       // 12 scenes
console.log(0, (await runScriptDoctor(text)).health);
for (const k of [12, 48, 108, 288]) {
  const padded = scenes.slice();
  for (let i = 0; i < k; i++) padded.push(scenes[i % scenes.length]);
  const doc = reassembleFountainScenes(head, padded);
  const r = await runScriptDoctor(doc);
  console.log(k, r.sceneCount, countFountainScenes(doc), r.wordCount, r.health, r.grade, r.verdict);
}
```

`probe-feature.mjs` (measure 5):

```js
const tree = process.argv[2];
const fs = await import('node:fs');
const { runScriptDoctor } = await import(tree + '/server/nvm/analyze/doctor.ts');
const { shuffleDropDegrade, degradationSeed } = await import(tree + '/scripts/lib/auc.ts');
const REL = 'tests/fixtures/feature-length/assembled-feature.fountain';   // the manifest seed convention
const text = fs.readFileSync(tree + '/' + REL, 'utf8');
const intact = await runScriptDoctor(text);
const degraded = await runScriptDoctor(shuffleDropDegrade(text, REL));
console.log(degradationSeed(REL), intact.health, intact.grade, intact.verdict,
            degraded.health, degraded.sceneCount, intact.health - degraded.health);
```

## 8. Not done

* No constant is changed. `git diff --stat 4a0ad86a -- server/` is empty and
  `node scripts/check-scoring-receipt.mjs 4a0ad86a..HEAD` reports no
  scoring-path file changed, which is the whole claim this lane makes about
  its own diff.
* No floor, manifest or fixture was re-locked; `--lock` was not run.
* `npm run measure-real`, `npm run lock-auc24` and therefore AUC-24 at any
  setting — the private corpus is absent from this environment, as in every
  pass of this lane. **The sweep cannot say what any setting does to AUC-24**,
  and §S5 step 1 is still the only thing that can. What it does say is that
  the term is rank-preserving inside a matched pair at feature length
  (measure 5), which is the reason to expect that run to be near-silent about
  this constant either way.
* The full `npm test` and `npm run brain` — excluded by this lane's brief.
* No push. The orchestrator pushes `lane/land-feature-length-defects`.
