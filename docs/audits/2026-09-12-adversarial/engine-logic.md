# Adversarial engine-logic review — `main @ c087a6ca`

**Lens:** the engine and its claims. What is the best achievable version of THIS
deterministic score, and where does the current tree's LOGIC fall short of it?
**Scope:** `server/nvm/analyze/doctor.ts` and its import graph (the receipt
gate's own file set), the public benchmark, structural signals, the shape guard
and analysis budget, the calibration corpus, and the empirical claims in
`docs/CLAIMS_REGISTER.md` / `docs/rulebook/README.md` / `CLAUDE.md`.
**Mode:** read-only. Nothing in `/home/user/STORYMACHINE`'s working tree was
modified except this file. No scoring-path file was edited anywhere, nothing was
committed or pushed, and `--lock` was never run.

`docs/audits/2026-09-07-innovation/` already records a set of owner-gated items
against the `scoring/feature-length-defects` branch (the staple-invariant
order-sensitivity, the clue-guard bypasses, the R5 denominator, the disclosure
sentence). **Those are not re-listed here.** Everything below was measured on
`main`, and where a branch review found a cousin of the same shape I say so and
give the main-tree number.

---

## Method

```
git archive c087a6ca | tar -x -C <scratch>/invB     # node_modules symlinked
node --experimental-strip-types <probe>.ts          # probes listed per finding
```

Every number below came out of a probe I wrote, in that export, against the real
`runScriptDoctor` / `computeHealthScore` / `computeStructuralSignals` /
`fountainShapeRejectionReason`. Where the repository already publishes a
statistic I re-derived it with my **own** implementation rather than reading the
repo's: the all-pairs Mann-Whitney was computed two independent ways (tie-corrected
rank-sum and the naive double loop) and they agree to `1e-12`; the matched-pair
statistic and the mean gaps were recomputed from the per-script pairs.

Probe directory (all paths below are relative to it):
`/tmp/claude-0/-home-user-STORYMACHINE/057a350f-7a69-54f4-ba49-41ec690a2ffe/scratchpad/invB/`

| probe | what it does |
|---|---|
| `probe-lib.ts` | shared scorer + formula decomposition helper |
| `probe-auc-rederive.mjs` | independent re-derivation of all six public-benchmark AUCs |
| `probe-density-flat.ts` | density/gradient decomposition over the 32 public scripts |
| `probe-feature-invert.ts` | the 231-scene reversal, and `d(health)/d(issues)` in the dead zone |
| `probe-perm.ts` | seeded permutation ensembles on the 21- and 231-scene fixtures |
| `probe-arcded.ts` | arc-deduction firing at feature scale |
| `probe-15cliff.ts` | the `ARC_DED_MIN_SCENES` boundary |
| `probe-reflow.ts`, `probe-reflow2.ts` | Fountain-legal dialogue reflow invariance + the parse mechanism |
| `probe-invariance.ts` | nine formatting transforms × 32 scripts |
| `probe-titlepage.ts` | title-page sensitivity, rule-by-rule |
| `probe-bench-attack.ts` | recipe check, control-contamination check, three scene definitions, title-paged AUCs |
| `probe-calib.ts`, `probe-calib2.ts` | the calibration corpus's "controlled richness" |
| `probe-shapeguard.ts`, `probe-cast.ts` | shape-guard accept/reject on legitimate features |
| `probe-structsig.ts` | structural-signals claims and the cast-size confound |
| `probe-boundary.ts` | verdict/grade boundary as a function of scene count |
| `probe-determinism.ts` | worker vs in-process report identity |
| `probe-claims.mjs`, `probe-claims2.mjs` | mechanical check of every `supported` claims-register row |
| `scripts/generate-rulebook.ts` (the repo's own) | rulebook regeneration idempotence (finding 14) |

---

## Findings, ranked by how much they change what the score means

### 1. The density channel is a step function, and for a third of the corpus its gradient is exactly zero — the 3,217-rule channel is a CONSTANT there

**Severity: WRONG.** **Phase anchor: P1** (this is the One Bet's object: the
score cannot "provably discriminate" on a channel with no gradient).

`densityPenalty` (`server/nvm/analyze/doctor.ts:426-461`) keeps a logistic for
`density < 1` with `SUB_DENSITY_MIDPOINT = 0.52` and
`SUB_DENSITY_STEEPNESS = 50` (`doctor.ts:447-449`). A steepness of 50 about a
midpoint of 0.52 is not a curve, it is a switch. Measured (`probe-density-flat.ts`):

```
density 0.40 -> penalty  0.024726
density 0.45 -> penalty  0.293122
density 0.52 -> penalty  5.000000
density 0.60 -> penalty  9.820138
density 0.70 -> penalty  9.998766
density 0.90 -> penalty 10.000000
density 0.99 -> penalty 10.000000
```

The whole 10-point dynamic range lives in `density ∈ [0.40, 0.65]`. Above 0.65
the term is flat to six decimals. **Ten of the 32 public-benchmark scripts sit in
that dead zone** (`density` 0.704 … 0.914), and for them the marginal effect of
one more weighted issue is `0.000000`:

```
fence-line-bad       density 0.8214  densPen 10.0000  d(pen)/d(+1 minor) 0.000001
low-tide-bad         density 0.8225  densPen 10.0000  d(pen)/d(+1 minor) 0
the-deposit-bad      density 0.9141  densPen 10.0000  d(pen)/d(+1 minor) 0
...  10/32 scripts have |dHealth/d(+1 minor issue)| < 0.001
```

At feature scale it is worse, because `density = weightedIssues / wordCount^0.7`
and a feature's word count is large. On the repository's own 231-scene fixture
(`tests/fixtures/feature-length/assembled-feature.fountain`, density 0.8064),
driven through the shipped `computeHealthScore` (`probe-feature-invert.ts`):

```
+   0 MINOR issues (570)   -> health 89.4
+ 386 MINOR issues (956)   -> health 89.4
+ 128 MAJOR issues (446)   -> health 89.4
+  48 CRITICAL issues (59) -> health 89.4
```

**Forty-eight additional CRITICAL findings do not move the displayed health by
0.1 of a point.** That is the entire weighted-rule channel — all 3,217 constants —
reporting a constant on a feature-length draft. `CLAUDE.md` already says the rule
channel carries AUC ~0.076; this is the *mechanism*, and it is stronger than
"weak": over a wide, commonly-occupied band the channel is **identically zero**.

Two live comments are falsified by this. `doctor.ts:403-412` ("MONOTONICITY
FIX") says the sub-1 branch was "Replaced with a single continuous power curve"
and that "The old sub-1 branch's flat ~10-point penalty in [0.65, 1.0) was a
low-confidence zone where no corpus sample or discrimination pair landed". The
next comment block (`doctor.ts:437-446`, "CONTINUITY FIX") restored that logistic,
so the first block describes code that no longer exists — and its factual claim is
false on the tree's own benchmark corpus: 10 of 32 scripts land in `[0.65, 1.0)`
(`probe-density-flat.ts`). (It is still true of the 20 calibration samples: 0/20
land there — `probe-calib.ts`.) `docs/p1-benchmark/PUBLIC_BENCHMARK_2026-09-06.md`
and `scripts/lib/public-benchmark.ts:750` call the 10 points "the density penalty
at its 10-point cap"; it is not a cap, it is a saturated logistic, and calling it
a cap hides that the saturation is the reason 11 of 32 `CLIMAX_RELOCATE` pairs tie.

**Best achievable version.** The density term should be monotone *with non-vanishing
gradient* across the range real drafts occupy. Replace the logistic with a single
concave-increasing function calibrated so that the interquartile range of
`density` on the measurement corpus maps to a usable fraction of the penalty
range — e.g. `k · log1p(density/d₀)` or a power curve with a much gentler
exponent — and add a property test asserting
`health(bs + one minor) < health(bs)` strictly, with a minimum step, at every
density the corpus exhibits (`tests/core/monotonicity.test.ts` today asserts
non-increasing, which a flat function satisfies). **This does not need the owner's
corpus**: the gradient property is a statement about the formula, provable on the
32 committed scripts and on `computeHealthScore` directly. Re-measuring AUC-24
after the change does need the corpus.

### 2. At feature scale, reversing every scene in a 231-scene screenplay RAISES health by 5.0 and promotes the verdict CONSIDER → RECOMMEND

**Severity: WRONG.** **Phase anchor: P1** (order-sensitivity is the property the
`CLIMAX_RELOCATE` channel exists to measure) **and P3** (the verdict tier is
what the shareable report asserts).

`probe-feature-invert.ts`, on `tests/fixtures/feature-length/assembled-feature.fountain`:

```
INTACT           health 84.4  verdict CONSIDER   sc 231  c/m/n 11/318/570
                 baseHealth 89.4  SCC_COLLAPSE x0  PERVASIVE false  GLOBAL_ARC_INCOHERENCE false  arcHealth 0.5766
FULLY REVERSED   health 89.4  verdict RECOMMEND  sc 231  c/m/n 11/301/561
                 baseHealth 89.4  SCC_COLLAPSE x0  PERVASIVE false  GLOBAL_ARC_INCOHERENCE false  arcHealth 1.8172
```

Decomposition: both sides have `baseHealth` 89.4 (the density term is pinned at
exactly 10.0 on both — finding 1). The whole 5.0-point difference is
`arcIncoherenceDeduction` (`doctor.ts:2104-2117`), which fires at 4.987 on the
**intact** cut (`arcHealth` 0.5766 < `ARC_DED_REF` 1.2) and at 0 on the reversed
one (`arcHealth` 1.8172). The arc term has the wrong sign on this document, and
it is the *only* term that moves, so it decides the verdict by itself.

Three detectors that should have caught a fully reversed feature all report
nothing: `SCENE_CONTINUITY_COLLAPSE` fires **0** times, `SCENE_CONTINUITY_PERVASIVE`
false, `GLOBAL_ARC_INCOHERENCE` false. `CLAUDE.md`'s gotcha ("Structural findings
at feature scale must go through the bounded deduction path in `doctor.ts`")
describes a path that, at 231 scenes, is not reached at all.

This is not an artifact of the fixture being a staple. The same shape appears on
the repository's coherent 21-scene feature-scale fixture — see finding 3 — and
random permutations of the 231-scene file do go *down* (0 of 8 beat the intact,
`probe-perm.ts`). It is reversal specifically that the arc term rewards, because
`arcHealth` is built from `rampCorrelation` and `peakPosition`
(`server/nvm/analyze/emotional-arc.ts:121`), and reversing a document whose
intensity happens to fall can manufacture a rising ramp out of nothing.

**Best achievable version.** An order term must be *symmetric under the null* and
*monotone in disorder*: its value on a script should dominate its value on any
permutation of that script's scenes, and the property must be asserted over an
ensemble of seeded permutations, not one committed permutation. Concretely:
replace the single-threshold `max(0, 1.2 − arcHealth)` ramp with a statistic whose
reference distribution is the script's own permutations (a permutation p-value or
a z-score against `N` shuffles of the same scenes), which is deterministic under a
fixed seed and costs `N` arc computations, not `N` doctor runs. Then assert
`health(script) ≥ max over 20 seeded permutations` as a hard invariant.
**No corpus needed** — the invariant is self-referential; the committed 21- and
231-scene fixtures are enough to make it bite.

### 3. The feature-scale "a scrambled act order must never score HIGHER" invariant is false for 13 of 20 permutations of its own fixture, and the committed permutation is the most favourable of the 21 measured

**Severity: UNPROVEN.** **Phase anchor: P1.**

`tests/core/feature-scale-discrimination.test.ts:220` asserts, in its own words,
`'a scrambled act order must never score HIGHER than the draft it was cut from'`,
and `:212-219` gates the act-swap delta at `>= 8.0`. Both are checked against
exactly one hand-built permutation, `act-swapped.fountain`.

`probe-perm.ts` runs 20 seeded `mulberry32` permutations of the **same 21 scene
bodies** in `intact.fountain` (scene count preserved 21 → 21 on every one, so
scarcity and word count are constant):

```
intact 79.7
perm healths: 70.2 71.5 72.9 73.4 73.8 76.9 77.3 80.5 81.1 81.8 82.1 82.8 83.3 83.3 83.3 83.3 83.3 83.3 83.3 ...
=> 13/20 permutations score HIGHER than the intact script; range 70.2..83.3 (max +3.6)
```

The committed `act-swapped.fountain` scores **70.0** — lower than all 20 random
permutations of the same scenes. So:

* the stated invariant ("never score HIGHER") is **violated by 65% of the
  permutations of the fixture it is asserted over**;
* only **2 of 20** permutations clear the 8.0-point gate the test uses to prove
  the arc deduction is "wired up and directionally alive";
* the one permutation the suite uses is an extreme-value draw from a distribution
  with 13.3 points of spread.

This is the same *class* of defect the 2026-09-07 branch review recorded for
`stapled_shorts` (a witness that passes by pinning a favourable ordering), but it
is on `main`, and it is on the arc deduction — the only order-sensitive term the
score has.

**Best achievable version.** Replace both single-permutation assertions with an
ensemble assertion over `K ≥ 20` seeded permutations, reporting the permutation
AUC (intact vs. its own shuffles) and flooring it; the committed `act-swapped`
file stays as a readable example, not as the evidence. **No corpus needed.**

### 4. A Fountain-legal dialogue reflow moves health by up to 11.1 points — five times the whole measured degradation signal — because the parser treats every line of a speech after the first as ACTION

**Severity: WRONG.** **Phase anchor: P1** (the benchmark's corpus systematically
avoids the document shape real drafts have) **and P2/P3** (a writer pasting from
Final Draft gets a different score than the same writer pasting from a plain-text
editor).

`src/lib/fountain.ts:168-170`: a line is classified `dialogue` only when the
**previous block** is `character`, `dual_dialogue` or `parenthetical`. A previous
block of type `dialogue` is not accepted — so the second and every subsequent
line of a multi-line speech falls through to the default, `action`. (The
parenthetical branch at `:161` *does* accept a previous `dialogue` block, so the
omission is local to the dialogue branch.) The Fountain spec's dialogue element
runs to the next blank line.

`probe-reflow.ts` re-wraps **dialogue lines only** at 35 columns, using the
repository's own parser to identify them, introduces no blank line, and verifies
the whitespace-normalised text is byte-identical to the original. Scene count is
unchanged on all 32 scripts. Result:

```
transfer-window.fountain        health 31.9 -> 43.0   (Δ +11.1)
room-12.fountain                health 33.5 -> 42.8   (Δ  +9.3)
chain-of-custody.fountain       health 76.3 -> 71.4   (Δ  -4.9)
the-key-under-the-mat.fountain  health 74.2 -> 69.3   (Δ  -4.9)
the-detour.fountain             health 74.0 -> 77.3   (Δ  +3.3)
=> health moved on 22/32; range [-4.9, +11.1]; scene count changed on 0
```

Mechanism, confirmed by block-type census (`probe-reflow2.ts`, `undertow.fountain`):

```
action  15 -> 55        character 18 -> 18        dialogue 18 -> 18
```

Forty lines of dialogue are reclassified as action prose, with the same words, the
same speaker and the same order. `structuralSignals` moves with it:
`meanTurnWords` 17.5556 → 6.5, `actionSentenceCvOverall` 0.4802 → 0.9347,
`meanAbsDialogueShareDelta` 0.2386 → 0.0787 — i.e. the two channels
`docs/scoring/STRUCTURAL_SIGNALS_2026-09-04.md` reports as the separating ones are
defeated by line-wrapping. The module header
(`server/nvm/analyze/structural-signals.ts:23-24`) says "None of them can be
defeated by choosing different vocabulary" — true as written, and beside the point:
they are defeated by whitespace.

Put next to the benchmark: the shuffle-drop channel's entire measured mean gap is
**−1.93** points and climax-relocate's is **−1.46**. An 11.1-point swing from how
the writer pressed Enter inside a speech is **5.7×** the signal the benchmark is
built to detect. All 32 committed scripts write one-line speeches, which is why
the defect is invisible to every committed test.

**Best achievable version.** Fix the parser branch (accept a previous `dialogue`
block), then add a metamorphic suite asserting reflow invariance: for each
committed script and each wrap width in {30, 35, 40, 60}, the report's
`health`, `verdict`, `sceneCount` and `bySeverity` must be identical.
**No corpus needed**, and it is the single highest-value change in this list,
because it is a correctness bug with a cheap test and it moves more health than
any deduction in the engine.

### 5. A standard Fountain title page is scored as screenplay prose: 34 rules change firing, health moves on 20 of 32 scripts (worst −5.2), and the primary benchmark AUC shifts by 0.047 — more than twice the floor margin

**Severity: WRONG.** **Phase anchor: P1 / P3.**

`server/nvm/analyze/fountain-analyzer.ts` has no title-page handling at all
(grep for `Title:`/`titlePage` returns nothing), and **zero** of the 20
`data/screenplays/*.fountain`, **zero** of the 12 blind-pair fixtures and
**zero** of the 20 calibration samples carry one. Adding the four metadata lines
every real draft has (`probe-titlepage.ts`, `code-blue.fountain`):

```
no title page             health 78.0   wordCount 951
Title+Author+Draft date   health 76.5   wordCount 958    (Δ -1.5)
34 rules change their firing count, e.g.
  OPENING_SUSPENSE_FLATLINE                     1 -> 0
  STRUCTURE_REVELATION_SUSPENSE_AFTERMATH_VOID  0 -> 1
  ... 28 further *_SUSPENSE_AFTERMATH_VOID rules 0 -> 1
```

Across all 32 (`probe-invariance.ts`):

```
title page added (Fountain metadata)   moved 20/32  meanΔ -0.681  range [-5.2, 0.0]
```

And it moves the benchmark (`probe-bench-attack.ts` §D, same degradations, same
seeds, title page prepended to every script before both sides of each pair):

```
                as committed                        with title page
SHUFFLE_DROP    paired 0.5313  allPairs 0.5586      paired 0.5313  allPairs 0.5562   meanGap -1.93 -> -2.49
CLIMAX_RELOCATE paired 0.4219  allPairs 0.4673      paired 0.4688  allPairs 0.4795   ties 11 -> 8
```

`PUBLIC_ORDER_PAIRED_FLOOR` is the PRIMARY statistic for the order channel, and a
metadata-only change to the corpus moves it by **+0.047** — **2.3× the
`PUBLIC_FLOOR_MARGIN` of 0.02**. The 0.02 band is therefore not a tolerance for
"an intended scoring change": it is smaller than the benchmark's sensitivity to
document formatting, so it will trip on a corpus reformat and can be cancelled by
one.

**Best achievable version.** Parse and strip the title page into metadata before
analysis (the Fountain spec defines it precisely: `Key: Value` lines before the
first blank line), assert health/verdict invariance under its addition across all
32 scripts, and add a title page to a meaningful share of the benchmark corpus so
the measured shape is the shape writers submit. **No corpus needed.**

### 6. `climaxZoneDecayDeduction` is not wired into health anywhere, yet `CLAUDE.md`, the brain, the measurement doc and the benchmark's own stdout all present `CLIMAX_DED_MIN_SCENES` as a live feature-scale gate

**Severity: STALE-CLAIM (shading into UNPROVEN).** **Phase anchor: P1.**

`computeClimaxZoneSignals` (`doctor.ts:589`) and `climaxZoneDecayDeduction`
(`doctor.ts:617`) are exported. A repo-wide grep finds **no call site on the
scoring path** — the only consumer is `scripts/probe-deduction-firing.mjs`.
`doctor.ts:2130-2134` records why ("REVERTED — it over-fired on real scripts with
naturally flat climaxes"). `aggregateReport`'s health line (`doctor.ts:2144`)
subtracts `structuralDeduction`, `arcIncoherenceDeduction` and
`dialogueDeduction` only.

But four places present the constant as live:

* `CLAUDE.md:209-211` — "the feature-scale deductions (`ARC_DED_MIN_SCENES` /
  `CLIMAX_DED_MIN_SCENES`, both 15) never fire at this length, so the public
  benchmark measures a strictly smaller engine";
* `scripts/lib/public-benchmark.ts:765` — the same sentence, **printed on every
  `npm run benchmark:public` run**;
* `docs/p1-benchmark/PUBLIC_BENCHMARK_2026-09-06.md:556`;
* `docs/brain/Gates/Gate - Public Benchmark.md:60`.

"Never fires at this length" implies it fires at some length. It fires at no
length. The honest sentence names `ARC_DED_MIN_SCENES` alone. Measured
(`probe-arcded.ts`): the arc term is the only feature-scale deduction that moves,
and even it is dormant on 4 of my 6 ≥15-scene fixtures at intact
(`arcHealth` 1.49 … 2.95 vs `ARC_DED_REF` 1.2).

### 7. `npm run gates` prints `[RAN] tests/core/public-benchmark.test.ts` and exits 0 against a suite whose six floor assertions have been deleted

**Severity: WRONG.** **Phase anchor: P1 / P3** (this row is the repository's only
always-on discrimination claim).

`scripts/report-unverified-gates.mjs:205-207` states the design intent:
"Running the suite costs ~4.6s and **is the only check that survives 'the file is
still there but its assertions were gutted'**." It does not survive that.
`verifiedGateState` (`:364-369`) returns `ran` iff `runSuite(suitePath)` exits 0,
and a suite that asserts nothing exits 0.

Reproduction (in the scratch export only; the export's copy was restored and
verified byte-identical afterwards). I replaced
`tests/core/public-benchmark.test.ts` with a file that keeps the filename, keeps
the `describe`/`it` titles, imports `measurePublicBenchmark`, runs the real
32-script measurement, and then asserts `Number.isFinite(d.aucPaired)` instead of
`d.aucPaired >= floor`:

```
$ node scripts/report-unverified-gates.mjs
VERIFIED GATES: 1 of 1 ran here, with no corpus and no owner step
  [RAN] tests/core/public-benchmark.test.ts
reporter exit=0
```

So the one positive row in the gate report — the row that exists specifically so
that "not mentioned as a gap" and "actually measured" stop looking the same —
can be satisfied by a suite that measures and asserts nothing. Note the
round-1 hole (delete the file) **is** closed; this is the harder-to-spot twin,
and it leaves `scripts/lib/auc.ts` untouched, so the diff looks innocent.

**Best achievable version.** A verified row should check that the suite asserted
what it claims, not merely that it exited 0. Two cheap mechanisms, both
corpus-free: (a) require the suite's own output to name each floor constant and
its measured value, and have the reporter parse that (`node --test-reporter`
output already carries the `it` titles, which are generated from `PUBLIC_FLOORS`);
(b) mutation-check it — the reporter runs the suite a second time with one floor
constant raised above its measured value in a temp copy of `auc.ts` and requires
a **failure**. (b) is a genuine assertion-liveness check and costs one extra run.

### 8. The calibration corpus's "controlled-richness design" does not control the word budget: 34.5% of its headline 25.32-point band gap is word count, not craft

**Severity: WRONG (the claim), FRAGILE (the control statistic).**
**Phase anchor: P1.**

`CLAUDE.md:188-193` states the invariant as a gotcha: "band monotonicity is a
property of the CONTROLLED-RICHNESS DESIGN — **all 20 samples share scene/word
budgets** and structural-signal presence, so craft is the only variable."

Measured on `main` (`probe-calib.ts`):

```
band        n  scenes   words (min..max, mean)   mean health   density range
strong      5  10..10   314..337  (327)          62.40         1.437..1.747
competent   5   9..10   290..311  (298)          52.52         1.458..2.076
weak        5  10..10   269..297  (288)          42.12         1.818..2.309
troubled    5   9..10   256..324  (278)          37.08         1.697..2.343

Spearman(band, wordCount)  = +0.7526
Spearman(band, health)     = +0.7099
Spearman(health, wordCount)= +0.4353
```

The word budget is **not** shared: the strong band averages 327 words and the
troubled band 278, and band rank correlates with word count (+0.7526) *more
tightly than it correlates with the health score the corpus is supposed to
calibrate* (+0.7099). Scene count is not shared either (three troubled and one
competent sample have 9 scenes, carrying an extra `140/9 − 140/10 = 1.56` points
of scarcity penalty — also in the direction that flatters the band ordering).

This matters because all 20 samples sit on the power branch (density 1.44 … 2.34)
where `densityPenalty` is steep, and `density = weightedIssues / wordCount^0.7`:
extra words mechanically buy a lower penalty. Counterfactual
(`probe-calib2.ts`) — re-score every sample through the shipped
`computeHealthScore` at a **common 298-word, 10-scene budget**, keeping its own
issue mix:

```
band        shipped mean   budget-equalised mean   Δ
  strong       62.40          58.22              -4.18
  competent    52.52          52.92              +0.40
  weak         42.12          44.80              +2.68
  troubled     37.08          41.64              +4.56

strong-minus-troubled gap: 25.32 -> 16.58   (34.5% of the gap was the budget)
all-25-pairs AUC(strong > troubled): 0.9600 -> 0.7600
```

Two further problems with how the control is reported. `npm run benchmark:public
-- --control` prints "strong over troubled: 5 of 5 ordered, mean gap 25.32".
That count is an **index-wise** pairing of two unrelated bands
(`scripts/lib/public-benchmark.ts:619-632`): there is no matched-pair
relationship between `strong[i]` and `troubled[i]`, and the statistic depends on
the array order, which nothing pins — it holds for only **96 of the 120**
orderings of the troubled band (`probe-calib2.ts`). The honest cross-band
statistic is **0.9600**, not 1.0000, because `Lockdown` (troubled, 58.8) outscores
`Second Wind` (strong, 58.2).

**Best achievable version.** Either make the design actually controlled — pin
every sample to an identical word and scene budget (a mechanical edit, checkable
by a test asserting equal `wordCount` and `sceneCount` across all 20) — or stop
calling it a control and report the band ordering as an all-pairs AUC with the
word budget as a covariate. The `--control` line should print the 25-pair AUC and
drop the index-wise count. **No corpus needed.**

### 9. In the saturated zone the verdict is a pure function of scene count: `RECOMMEND` is unreachable below 28 scenes and nearly automatic above it

**Severity: WRONG.** **Phase anchor: P3** (`CLAIMS_REGISTER` row 12 ships the
sentence "The deterministic engine placed this draft in its top verdict tier").

`verdictFor` (`doctor.ts:860-864`) is `health >= 85 && sceneCount >= 8 →
RECOMMEND`. In the dead zone of finding 1, `health = 100 − 10 − 140/sceneCount`
exactly. Tabulated (`probe-boundary.ts`):

```
sceneCount   scarcity   health at densPen=10   max density that can still reach 85
     8        17.500          72.50            0.0000
    10        14.000          76.00            0.4761
    15         9.333          80.67            0.5254
    20         7.000          83.00            0.5477
    28         5.000          85.00            RECOMMEND eligible
   120         1.167          88.83            RECOMMEND eligible
   231         0.606          89.39            RECOMMEND eligible
```

So for any draft whose weighted-issue density exceeds ~0.55 — which is every one
of the 32 committed scripts (0.598 … 2.181) — **`RECOMMEND` is arithmetically
impossible below 28 scenes and arithmetically automatic above it**, subject only
to the arc term. That is the whole content of the product's top verdict tier at
the lengths it is used at: a scene count and one arc threshold. It is also why all
32 public scripts read `CONSIDER` and why the 231-scene staple reads `RECOMMEND`
once reversed (finding 2).

**Best achievable version.** The verdict threshold has to be defined on a
length-normalised score, or the scarcity term has to saturate (which is what the
2026-09-07 branch attempted with its `SATURATION` block — absent from `main`).
Either way the invariant to assert is corpus-free: across scene counts 8…250 with
a fixed issue *rate*, the verdict must not be monotone in scene count. **No corpus
needed for the invariant; the corpus is needed to choose the saturation point.**

### 10. The shape guard rejects an ordinary 20-character ensemble feature outright — no score, no report

**Severity: WRONG.** **Phase anchor: P2** (the Doctor is the product's front
door) **and P1** (a rejected document contributes nothing to any measurement).

`MAX_FOUNTAIN_VOICE_ELIGIBLE_WEIGHT = 300_000`
(`server/lib/validation.ts:580`) rejects when
`eligibleSpeakers × pooledEligibleDialogueWords > 300_000`
(`validation.ts:1483-1491`), where "eligible" means every speaker clears
`VOICE_ELIGIBLE_MIN_WORDS = 30` (`validation.ts:567`).

A feature screenplay has 12,000–18,000 dialogue words. The bound therefore binds
at a cast of `300_000 / 15_000 = 20`. Measured on a synthetic but normally-shaped
110-page feature (`probe-cast.ts`, Zipf-distributed speech, 35-word floor):

```
cast 15  speakers 15  pooled dialogue words 15150  weight 227250  ok
cast 18  speakers 18  pooled 15105             weight 271890  ok
cast 19  speakers 19  pooled 15120             weight 287280  ok
cast 20  speakers 20  pooled 15120             weight 302400  > 300000 -> REJECTED
```

Twenty speaking characters who each say more than thirty words is an entirely
ordinary ensemble feature — a heist, a courtroom drama, a war film, a TV pilot.
The document is ~98 KB, far under `MAX_FOUNTAIN_CHARS = 900_000`. The writer gets
"trim the cast or split the draft" and no analysis at all. The neighbouring
constant's own comment (`validation.ts:542-548`) says "A real large-ensemble
feature can comfortably have dozens of characters" — that is true of
`MAX_FOUNTAIN_FREQUENT_CUE_LINES = 50`, but the voice-eligible bound fires far
earlier and is the one that actually decides.

**Best achievable version.** The cost this bound exists to stop is
`analyzeVoices`'s O(distinct²) Burrows's-Delta pair grid. Bound the *work*, not
the document: cap the number of voice-compared pairs (e.g. compare only the top-N
speakers by word count, report the rest as "not voice-scored"), and let the
document through. A degraded voice section on a 40-character ensemble is strictly
better than no score. Then assert that a realistic 20/30/40-character feature is
ACCEPTED, and keep the existing DoS fixtures as the rejection cases.
**No corpus needed.**

### 11. Two stale line anchors the claims register's own enforcement cannot catch, in three files, after a prior audit recorded them FIXED

**Severity: STALE-CLAIM.** **Phase anchor: P1 / P3.**

`docs/CLAIMS_REGISTER.md:72` (row 22) carries evidence pointer
`server/nvm/analyze/doctor.ts:1892-1898` for the AUC ~0.076 / ~0.938 claim. What
is at those lines (`probe-claims2.mjs`):

```
  1892: // so decode at this boundary. "Scene 0" (impossible post-migration)
  1896: const sceneIdx = parseInt(m[1], 10) - 1;
```

The comment is at `doctor.ts:2092-2093`.
`docs/audits/2026-09-06-mistake-search/brain-review.md:398` records this exact
anchor as "**FIXED in both places**" — and it was, in `CLAUDE.md` and
`docs/brain/00 Home.md`. It survives in three more:
`docs/CLAIMS_REGISTER.md:72`, `ROADMAP.md:60`, `scripts/check-scoring-receipt.mjs:134`.

The register is explicit that its own lane checks only existence: "Every row with
status `supported` must carry an evidence pointer that **exists on disk** (a
`path`, or `path:line` — **only the path is checked**)"
(`docs/CLAIMS_REGISTER.md:22-23`). I ran the stronger check mechanically across
every `supported` row (`probe-claims2.mjs`): **0 rows** have a non-existent path
and **0** have a line past EOF — so the enforcement that exists holds. What it
cannot see is a line number pointing at the wrong code, which is the failure mode
that actually occurred, twice, in the one row that carries the project's central
negative finding about its own score.

**Best achievable version.** Extend the claims lane to verify `path:line`
*content*: require each `path:line` pointer to carry a short quoted anchor string
and assert that string occurs within ±3 lines. Cheap, corpus-free, and it would
have caught this the day the line moved.

### 12. `CLIMAX_RELOCATE` does not do what every document says it does, and no degradation asserts it produced different text

**Severity: STALE-CLAIM + FRAGILE.** **Phase anchor: P1.**

`scripts/lib/public-benchmark.ts:360` labels the degradation `'move the final
scene to position 1 (scene count preserved)'`, `:275` repeats it, and
`docs/p1-benchmark/PUBLIC_BENCHMARK_2026-09-06.md` §3 says "move the final scene
to position 1". The implementation is
`scripts/lib/rebuild-experiment-lib.mjs:160-166`:

```js
const last = scenes.pop();
scenes.splice(1, 0, last);      // index 1 = position TWO
```

Measured (`probe-bench-attack.ts` §A, `chain-of-custody.fountain`):

```
intact   : [FREIGHT DEPOT - LOADING, HIGHWAY - NIGHT, DELGADO'S VAN - NIGHT]
degraded : [FREIGHT DEPOT - LOADING, FREIGHT DEPOT - LOADING(last), HIGHWAY - NIGHT]
```

The original opening stays first. The degradation is "move the climax to slot 2",
which leaves the script's most load-bearing position — its opening — intact, and
is a materially weaker manipulation than the one claimed.

Separately, `measurePublicBenchmark` (`scripts/lib/public-benchmark.ts:556-566`)
skips a script only when `apply` returns `null`; nothing asserts
`degradedText !== script.text`. A degradation that silently no-ops produces a
tie, counted as a legitimate 0.5 observation. That is reachable: `auc.ts`'s
`shuffleDropDegrade` splits only on `/^(?=INT\.|EXT\.)/mi` — it does not
recognise `EST.`, `I/E.`, `INT./EXT.` or Fountain forced headings (`.HEADING`),
all standard and all present in real drafts. On a synthetic mixed-heading script
the three scene definitions in play disagree and the degradation is a **no-op**
(`probe-bench-attack.ts` §C):

```
synthetic mixed-heading script: auc.ts sees 2 scenes, segmentScenes 4, the doctor 5
shuffleDropDegrade output identical to input? true
```

On the 32 committed scripts all three definitions agree (0/32 disagreement), so
this is latent here — but `shuffleDropDegrade` is **byte-for-byte the AUC-24
recipe**, and the AUC-24 corpus is real screenplays, which do use `I/E.` and
forced headings. Every such script silently contributes a weaker degradation, or
none, to the 0.731 figure.

**Best achievable version.** One scene segmenter, shared by the doctor and both
degraders, handling the full heading grammar; an assertion in every degradation
that the output differs from the input (and, for `CLIMAX_RELOCATE`, that the
final scene is now first); and the doc text corrected. **The segmenter fix needs
the owner's corpus only to re-measure AUC-24 afterwards** — the correctness part
is corpus-free.

### 13. Curly apostrophes and private boneyard notes change the score

**Severity: FRAGILE.** **Phase anchor: P2.**

`probe-invariance.ts`, nine transforms × 32 scripts:

```
ASCII apostrophe -> U+2019     moved 18/32  meanΔ +0.003  range [-4.7, +2.2]
boneyard note prepended        moved 19/32  meanΔ +0.200  range [ 0.0, +2.1]
ASCII double quote -> U+201C/D moved  7/32  meanΔ +0.113  range [-0.1, +1.6]
boneyard note appended         moved 15/32  meanΔ +0.016  range [-0.6, +0.4]
```

Replacing `'` with `’` — what every word processor, Final Draft and Highland
emit — moves health on 18 of 32 scripts by up to **4.7 points**, 2.4× the
shuffle-drop mean gap, because the rule lexicons match on ASCII. And writing
yourself a `/* fix act two */` note **raises** your craft score on 19 of 32
scripts (up to +2.1): the boneyard's words reach `wordCount` and lower `density`
without carrying issues.

**Best achievable version.** Unicode-normalise punctuation (NFKC plus a quote
fold) once, in the analyzer, before any lexicon sees the text; exclude boneyard
content from `wordCount`; assert both as invariants over the 32 scripts.
**No corpus needed.**

### 14. `npm run rulebook` is not idempotent on `main`: a clean regeneration adds four root-cause clusters, three of them with an empty title and all four with an empty `Requires:` list

**Severity: STALE-CLAIM.** **Phase anchor: P3** (the rulebook is what a
third-party verifier reads) **and P1** (`docs/rulebook/README.md` is cited
repo-wide as "the machine-counted authority").

`docs/rulebook/README.md:9` states: "This file, and everything else under
`docs/rulebook/`, is generated by `scripts/generate-rulebook.ts`
(`npm run rulebook`) directly from the live pass files — never hand-maintained.
**Regenerating after a wave lands is idempotent (a no-op diff)** until the next
wave actually changes something."

Reproduction, in the scratch export (`node --experimental-strip-types
scripts/generate-rulebook.ts`, exit 0, nothing else touched):

```
diff against the committed copy: 16 added lines, in docs/rulebook/root-causes.md only
> ###  (`clock-zone-imbalance`)
> ###  (`seed-suspense-aftermath-void`)
> ### Physical staging is bunched, not spread (`staging-zone-imbalance`)
> ###  (`stakes-zone-imbalance`)
   ... each followed by an empty `Requires:` line
```

Thirteen of the fourteen generated rulebook files are byte-identical after
regeneration; `root-causes.md` is not. So four root-cause clusters exist in the
live pass files and are **absent from the committed catalog**, and three of the
four have no human-readable title to generate — the generator emits
`### ` + an empty string. Nothing in CI catches it: `tests/core/rulebook.test.ts`
imports `extractAllPasses`/`listPassFiles` and checks the rule **count** against
`README.md`, and `tests/core/rulebook-links.test.ts` checks anchors; neither
regenerates the catalog and diffs it, so the "idempotent" claim is asserted in
prose and enforced nowhere. (I verified this against the repository working tree
and then restored it with `git checkout --`; the tree is clean.)

**Best achievable version.** One test that regenerates into a temp directory and
asserts a zero diff against `docs/rulebook/**` — the standard generated-artifact
guard, corpus-free, a few seconds. Plus a generator assertion that every emitted
cluster has a non-empty title and a non-empty `Requires:` list, since an entry
with neither is not a catalog entry. **No corpus needed.**

---

## What I could not break

Each of these was an attempt to find a defect that failed, and the negative
result is worth as much as the positives.

1. **All six public-benchmark statistics reproduce exactly on my own code.**
   `probe-auc-rederive.mjs`: `SHUFFLE_DROP` paired 0.5313 / all-pairs 0.5586,
   `CLIMAX_RELOCATE` 0.4219 / 0.4673, `DIALOGUE_FLATTEN` 1.0000 / 0.9473; sign
   counts 17/15/0, 8/13/11, 32/0/0; mean gaps −1.93125, −1.45625, +29.30000 — all
   identical. The tie-corrected rank-sum route and the naive double loop agree to
   `1e-12` (`AGREE`). The seeded bootstrap intervals and `seed 42 / 2000
   iterations` are as documented.
2. **`10 of 32` pinned at 76.0 and `11 of 32` climax-relocate ties reproduce
   exactly** (`probe-auc-rederive.mjs`), as does the statement that 10 of the 11
   ties are the pinned scripts. `CLAUDE.md`'s wording here is precise.
3. **Determinism holds across the worker and in-process paths.**
   `probe-determinism.ts`: `runScriptDoctor` vs
   `runScriptDoctorSequentialForTest` — **0 of 10** reports differ on any field
   but `analyzedAt`, including the 231-scene feature. Repeat runs are identical.
4. **The `DIALOGUE_FLATTEN` control is not contaminated by normalisation.** The
   degradation normalises its input while the intact side is scored raw, which
   looked like an uncontrolled difference. `probe-bench-attack.ts` §B:
   `normalizeScreenplay` changes the bytes of all 32 files and the health of
   **0 of 32**. The control's 29.30-point gap is the manipulation, not the
   normaliser.
5. **CRLF, BOM, tab→space and trailing blank lines are exact invariants** —
   `0/32` moved, `meanΔ 0.000`, `max|Δ| 0.0` (`probe-invariance.ts`). The
   analyzer's whitespace handling is genuinely clean; the reflow defect in
   finding 4 is a parse-classification bug, not a whitespace bug.
6. **`docs/scoring/STRUCTURAL_SIGNALS_2026-09-04.md`'s blind-pair numbers
   reproduce.** `probe-structsig.ts`: `meanAbsDialogueShareDelta` orders **5 of
   6** pairs (inverting only on `signal-drift`, 0.3402 vs 0.3502) and
   `actionSentenceCvOverall` **6 of 6** — exactly as the doc's table says. The
   registered cast-size confound reproduces too: my own Spearman over the pooled
   32 scripts is **−0.6949** against the doc's −0.643/−0.677, so the caveat is
   real and correctly sized, not understated.
7. **No `supported` claims-register row has a missing evidence path or a
   past-EOF line** (`probe-claims2.mjs`, 0 problems over all rows). The lane's
   existence check holds; only the line-content gap in finding 11 is open.
8. **`3217` reproduces from the live pass files.** `npm run rulebook` prints
   "3217 rules across 14 passes", matching `docs/rulebook/README.md:7`,
   `CLAUDE.md:108` and `NORTH_STAR.md:85`. (The neighbouring "3186 of 3186 rule
   constants are referenced by at least one test" is measured over distinct
   *names* while the total is pass-scoped *entries* — consistent, since
   `coverage.json` carries both `totalRuleRecords` and
   `totalDistinctRuleNames`, but the two figures sitting one line apart invites
   a misread.)
9. **Random permutations of the 231-scene fixture do not beat it** — 0 of 8,
   range 67.8…69.4 against 84.4 (`probe-perm.ts`). Finding 2 is specific to
   reversal, and I state it that way rather than as general permutation
   inversion at feature scale.
10. **The shape guard accepts the repository's own 231-scene feature**
    (113,954 chars, `reject? null`) and accepts a single character carrying four
    cue extensions 60 times each (`probe-shapeguard.ts`). The cue-weight and
    frequent-cue bounds did not fire on anything legitimate I built; only the
    voice-eligible bound did (finding 10).
11. **The `ARC_DED_MIN_SCENES = 15` boundary is not a visible cliff on the
    fixtures that cross it.** `probe-15cliff.ts` walks
    `intact.fountain` from 12 to 21 scenes: `arcHealth` stays 2.43…2.95,
    well above `ARC_DED_REF = 1.2`, so the term contributes 0 on both sides of
    the gate and no discontinuity appears. The cliff is latent (a 15-point term
    switched on by one scene), not demonstrated.

## Coverage I did not reach

The revision pipeline's 14-pass **rewrite** path (`server/nvm/revision/rewrite.ts`,
`rewrite-llm.ts`) and the What-If compiler's end-to-end agreement with a plain
doctor run on the same bytes are in my brief and I did not get a reproduction
either way inside budget. I read `server/routes/nvm/twin-whatif.ts:200-250` and
its `presentReport` does forward the real `ScriptDoctorReport`'s
`health`/`grade`/`verdict`/`contentHash` under one `complete` flag, so I found no
second notion of "scored" there — but I did not construct a session and compare
a materialised branch against `runScriptDoctor` on its bytes, and I did not test
pass idempotence. Both remain open.

---

## The best achievable version, in one paragraph

The best achievable version of this engine is a score with three properties it
does not have today, none of which needs the owner's corpus to *establish* — only
to *re-measure* afterwards. **First, a live gradient**: the density channel must
move when a finding is added, at every density the corpus exhibits, so that the
3,217-rule catalog stops being a constant over a third of the corpus and all of
feature length (findings 1, 9). **Second, parse and format invariance**: identical
writing must score identically however it reaches the analyzer — multi-line
dialogue, a title page, curly quotes, a boneyard note (findings 4, 5, 13). Today
an 11.1-point swing is buyable with the Enter key while the entire measured
structural signal is 1.9 points, which means the benchmark is currently measuring
formatting noise at five times the amplitude of the thing it claims to measure,
and every AUC in the repository inherits that. **Third, ensemble invariants
instead of single witnesses**: every order claim must be asserted against a seeded
permutation ensemble of the script's own scenes, not one hand-built permutation,
because the hand-built one is reliably the favourable draw (findings 2, 3, 8, 12).
Those three are cheap, corpus-free, and they are prerequisites — not alternatives
— to the P1 bet. Only after them does the owner's `npm run measure-real` produce
a number worth ratcheting: an AUC measured on a scorer with a live gradient, on
text whose formatting cannot move the answer, against invariants a single lucky
permutation cannot satisfy. Running it before them re-locks a floor onto an
instrument that reads whitespace. The one thing that genuinely cannot be done
without the corpus is choosing where the scarcity term should saturate and what
the density curve's scale should be; everything else on this list is a correctness
fix with a test that fits in CI.
