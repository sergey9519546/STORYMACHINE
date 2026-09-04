# Blind matched pairs — does the score separate craft, or vocabulary?

**Date:** 2026-09-04 · **Tree:** worktree off `main @ 0a0edcc9` ·
**Fixtures:** `tests/fixtures/blind-pairs/` (12 scripts, CC0) ·
**Test:** `tests/core/blind-pairs-discrimination.test.ts` ·
**Scoring path:** unchanged (this lane adds fixtures, a test and this document only).

## The question

The calibration corpus (`server/nvm/analyze/calibration/corpus.ts`) is 20
hand-authored samples in four bands. Its band separation underwrites three
shipped things: the percentile a writer is shown ("stronger than N% of the
reference set"), the band-monotonicity assertions in
`tests/core/calibration.test.ts`, and the general claim that the health score
tracks craft.

The 2026-09-04 advice-quality audit raised a specific objection to all three.
The corpus's own header says the troubled band "leans hard on the
on-the-nose/cliche lexicon `dialogue.ts` and `originality.ts` already flag",
and it names the literal strings it uses (`"Everything's fine"`, `"Same as
always"`, `"Trust me on this"`). A corpus written from the rules cannot test
the rules. The audit's own matched excellent/bad pair scored 76.0 and 76.0.

So: **would a blind author's matched pairs separate?**

## Method

The stimulus had to be written by someone who did not know what the engine
looks for, or the test measures nothing. The order below was performed in this
order, and the git history is the receipt: the twelve fixtures land in their
own commit ahead of the commit carrying this document, and were not edited
afterwards. Every figure below was re-measured after that branch was rebased
onto `main @ 0a0edcc9` and is byte-identical to the pre-rebase run.

1. Read `CLAUDE.md`, `tests/core/fixture-provenance-comment-guard.test.ts`
   (header syntax) and the boneyard branch of `src/lib/fountain.ts`. Nothing
   else. Nothing under `server/nvm/` had been opened.
2. Wrote twelve original short screenplays: six matched pairs, one
   intended-excellent and one intended-bad each, sharing a premise, a
   ten-scene skeleton, a cast, and a word budget within five percent. Genre
   and register vary across the six (thriller, two-hander drama, comedy, 1893
   period piece, science-fiction horror, family story) so no result rests on
   one voice.
3. Matched the pairs mechanically to the declared design (ten scenes; per-pair
   word ratio ≤ 1.05 on the screenplay body). Only length was adjusted.
4. **Committed the fixtures**, fixing the write-first order as a fact.
5. Only then read the retrospective §1–2, the calibration corpus header, and
   the prior pair's numbers.
6. Ran the real `runScriptDoctor` over all twelve, and over the calibration
   corpus's own strong-vs-troubled samples paired by index, computing
   identical statistics on both sets.

The excellent members were written to be good on the terms a screenwriter
would use: a real midpoint turn, a protagonist who makes the decisive costly
choice, dialogue on subtext, escalating stakes, and a climax that pays off a
plant. The bad members were written to be bad the way real weak drafts are
bad — fluent, correctly formatted, same length, same subject — failing on
craft alone: stated feeling instead of subtext, a protagonist things happen
*to*, a flat middle, announced stakes, backstory in a block, and endings that
resolve nothing they set up. **Nothing is mechanically degraded.** That is the
point: shuffling scenes tests whether the engine notices damage; a pair like
this tests whether it notices writing.

## Result — the two sets side by side

Identical statistics, same code path, same run.

### Set A — the twelve blind scripts

| pair | excellent | bad | gap | ordered? | top-10 overlap | grades |
| --- | --- | --- | --- | --- | --- | --- |
| night-shift (thriller) | 76.0 | 76.0 | 0.0 | no | 8/10 | strong / strong |
| low-tide (drama) | 76.0 | 76.0 | 0.0 | no | 9/10 | strong / strong |
| the-deposit (comedy) | 75.1 | 76.0 | −0.9 | no | 7/10 | strong / strong |
| the-ledger (period) | 76.0 | 74.8 | +1.2 | **yes** | 8/10 | strong / solid |
| signal-drift (sci-fi) | 75.6 | 76.0 | −0.4 | no | 9/10 | strong / strong |
| fence-line (family) | 76.0 | 76.0 | 0.0 | no | 7/10 | strong / strong |

**Ordered correctly: 1 of 6. Mean health gap: −0.02. Mean top-10 overlap: 8.0
of 10.** All twelve scripts land in a 1.2-point band (74.8–76.0); five score
exactly 76.0. Every one of the twelve returns verdict `CONSIDER`. Strengths
counts favour the *bad* member in two pairs and the excellent member in two.

### Set B — the calibration corpus, strong vs troubled, paired by index

| pair | strong | troubled | gap | ordered? | top-10 overlap |
| --- | --- | --- | --- | --- | --- |
| Low Tide / The Grift | 59.6 | 17.6 | 42.0 | yes | 9/10 |
| Nine Minutes / Adrift | 64.0 | 31.8 | 32.2 | yes | 8/10 |
| The Long Game / Lockdown | 68.8 | 58.8 | 10.0 | yes | 6/10 |
| Second Wind / Whiteout | 58.2 | 40.6 | 17.6 | yes | 8/10 |
| Sunlight Clause / Firebreak | 61.4 | 36.6 | 24.8 | yes | 7/10 |

**Ordered correctly: 5 of 5. Mean health gap: 25.32. Mean top-10 overlap: 7.6
of 10.**

The engine orders the corpus that was written from it 5 of 5 with a 25-point
mean gap, and a blind author's pairs 1 of 6 with a gap of zero. **The
hypothesis is supported.**

## Why — three measured mechanisms, not one

The lexicon story is real but it is not the largest term. Measuring the score's
own arithmetic (`health = 100 − densityPenalty(weightedIssues / wordCount^0.7)
− 140/sceneCount`) explains the whole result, and the explanation is worse than
the hypothesis was.

### 1. The rule channel alone is at chance on BOTH sets

Rank each pair by weighted issue count (`4·critical + 1.5·major + 0.5·minor`),
which is everything the 3,217-rule catalog contributes, before any curve:

* blind pairs: **3 of 6** correct
* calibration strong-vs-troubled: **3 of 5** correct

The calibration corpus's 5-of-5 health ordering is *not* produced by the rules
finding more problems in the troubled samples. On raw findings it is a coin
flip there too. Something else produces the separation.

### 2. That something is a residual richness gradient the header says was removed

The corpus header declares a CONTROLLED-RICHNESS DESIGN: every sample "exactly
10 scenes", "within the ~300-360 word band every other sample uses", so that
"CRAFT is the only independent variable left to vary." Measured over all 20
samples:

| band | mean scene headings | mean words | word range |
| --- | --- | --- | --- |
| strong | 10.0 | 326.8 | 314–337 |
| competent | 9.8 | 297.8 | 290–311 |
| weak | 10.0 | 288.0 | 269–297 |
| troubled | **9.4** | **277.8** | **256–324** |

Word count decreases monotonically with band quality, and three troubled
samples carry 9 scene headings, not 10. Nine of the fifteen non-strong samples
fall below the declared 300-word floor; every strong sample is inside it. Both
gradients push health down in the labelled direction *by construction*:
`140/sceneCount` costs a 9-scene sample 1.6 points outright, and a smaller
`wordCount` shrinks the density denominator.

Recomputing each troubled sample's health at the strong band's mean richness
(its own weighted issues, the strong band's mean word and scene count):

| pair | actual gap | gap with richness equalised |
| --- | --- | --- |
| Low Tide / The Grift | 42.0 | 40.6 |
| Nine Minutes / Adrift | 32.2 | 19.0 |
| The Long Game / Lockdown | 10.0 | 0.2 |
| Second Wind / Whiteout | 17.6 | −1.2 |
| Sunlight Clause / Firebreak | 24.8 | 5.5 |
| **mean** | **25.32 (5/5 ordered)** | **12.83 (4/5 ordered)** |

**About half the strong-vs-troubled separation is length and scene count, not
craft.** The confound the header was written to remove is still present, in the
direction that flatters the design.

### 3. The blind scripts sit in the score's dead zone

`densityPenalty` is a logistic in `density = weightedIssues / wordCount^0.7`
with midpoint 0.52 and steepness 50. It saturates at 10.00 once density passes
roughly 0.7, and only becomes responsive again above density 1.0, on the power
branch.

| set | density range | densityPenalty range |
| --- | --- | --- |
| blind (12 scripts, 881–1022 words) | 0.704–1.110 | 10.00–11.20 |
| calibration (10 samples, 256–337 words) | 1.437–2.343 | 17.24–68.37 |

Weighted issue counts are *comparable* between the sets (blind 85.5–132.5;
calibration 83.0–134.0). The entire difference is the denominator: `wordCount^0.7`
is about 120 for a 950-word script and about 50 for a 300-word one. Eight of the
twelve blind scripts are pinned at exactly 10.00 penalty, so their health is
`100 − 10 − 14 = 76.0` no matter what the rules found.

**The calibration corpus's ~300-word budget is precisely what places it in the
score's responsive band.** The corpus is not merely written in the rules'
vocabulary; it is sized to the one region where the formula has slope.

### 4. Consequence: every blind script is "stronger than 100%" of the reference set

The reference distribution built from those 20 samples spans **17.63 to 68.76**.
All twelve blind scripts score 74.8–76.0 — above the maximum of the entire
reference set. Measured `healthPercentile`:

> **All 12 of 12 blind scripts, including all six written to be bad, return
> percentile 100.**

A writer who submits a deliberately terrible ten-scene short is told it is
stronger than 100% of the reference set. This is not a rounding artifact; it
follows directly from a reference distribution whose spread is manufactured by a
length gradient at a length no real submission has.

## What this establishes

* The calibration corpus does not demonstrate that the health score separates
  craft. On a blind author's matched pairs it separates nothing (1 of 6, mean
  gap −0.02), while ordering its own corpus 5 of 5.
* The corpus's band separation is roughly half richness confound and, on raw
  rule findings, at chance. It is a weak guard: `tests/core/calibration.test.ts`
  would keep passing through a real scoring regression, and would not obviously
  notice a real fix.
* The percentile and the "stronger than N% of the reference set" copy are
  unsafe as shipped. Every script tested here saturates them at 100.
* Per-sample band order inside the corpus is already scrambled — troubled
  `Lockdown` (58.8) outranks strong `Second Wind` (58.2), and competent
  `Thanksgiving, Maybe` (66.7) outranks four of the five strong samples. Only
  the band *averages* are monotone.

## What this does NOT establish

* **Twelve short scripts by one author are evidence, not a benchmark.** They
  are self-labelled — no independent blind labelling, no ≥3 experienced
  readers, no pre-registered split, no held-out evaluation. One author's idea
  of "genuinely bad" is one author's idea.
* Nothing here measures **feature scale**. These are ~950-word shorts. The
  AUC-24 ratchet (≥ 0.622, last measured 0.731) is a different corpus, a
  different degradation and a different denominator, and is untouched by this
  result. Do not move it on the strength of this document.
* It does **not** show the rules are worthless, only that this corpus cannot
  show they work. The rule channel being at chance *on these twelve pairs* is
  consistent with the doctor's own measurement that the weighted-rule channel
  carries AUC ~0.076.
* It is not a proposal to edit the corpus. Changing one band's richness without
  matching the others reintroduces the confound; the honest fix is a re-derived
  corpus with an enforced richness invariant, or P1 on real writing.

**The real test remains P1 on real writing.** This document is an argument for
why P1 cannot be substituted by the calibration corpus, not a substitute for
P1.

## How the failure is registered

`tests/core/blind-pairs-discrimination.test.ts` asserts in two tiers.

* **Hard:** the experimental design — twelve fixtures, ten scenes each,
  per-pair word ratio ≤ 1.05. If one breaks, the comparison stops being
  controlled and the numbers above are void.
* **Known-failing:** the engine orders all six pairs. This follows the
  disposition the repository already uses for a defect it refuses to hide
  (`evals/scoring/runner/metamorphic-cases.ts`'s
  `disposition: 'known-failing'`, whose runner prints a standing witness and
  says to "flip them to HARD after confirming recalibration").

The wrapper makes that flip mandatory in both directions: while the documented
failure reproduces, the test passes and prints the witness, so `npm test` stays
at zero failures; **the day the engine starts ordering the pairs, the test
fails** with an instruction to promote it and re-run this measurement. A known
failure that quietly starts passing is how a real improvement goes unnoticed.

No metamorphic case was added. `MetamorphicCase` is a pure text transform of
one base script asserting a direction of movement (`transform: (base: string)
=> string`); a fixture-backed pair is a cross-script comparison, not a
metamorphic relation, and dressing it as one would assert that a specific bad
script scores below an unrelated base. The runner does not accept
fixture-backed cases, so none was forced.

## A note on contamination

The order of operations exists because the author of the stimulus is also the
analyst, and the analyst wanted a particular answer.

For the record: after reading the corpus header — which names the literal
strings the troubled band uses, and states that the clue detector keys on
quoted phrases — there was a clear and specific pull to go back and put
`"Everything's fine"` and `"Same as always"` into the six bad drafts, where
they would have sat perfectly naturally, and to rewrite the plants as
quoted ALL-CAPS tokens. That would have produced separation, and the
separation would have been worthless.

The scripts were not touched. The temptation is itself evidence for the
hypothesis: it took ten minutes of reading the engine to know exactly how to
make a bad script score badly without making it any worse as writing.

## Reproducing

```
node --experimental-strip-types tests/core/blind-pairs-discrimination.test.ts
```

Health, grade, verdict, top-ten rules, strengths counts and the density terms
in this document come from `runScriptDoctor` on the twelve fixtures and on
`REFERENCE_CORPUS`, on the tree named at the top. The richness table is a
direct count over `corpus.ts`; the counterfactual recomputes the published
formula with word and scene counts substituted and nothing else.

## Follow-up: the two pending scoring branches

`BLIND_PAIRS_ON_BRANCHES_2026-09-04.md` scores the same twelve fixtures on
the R5 verbosity-bias branch and the advice-rule-fixes branch. R5 un-pins
the scripts (3 of 6 ordered, none tied) but only by exposing the raw
weighted-issue order, which is itself at chance here; advice-rule-fixes
leaves the result unchanged; the two branches conflict on five files, so the
stacked tree could not be scored.
