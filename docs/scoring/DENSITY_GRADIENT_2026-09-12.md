# The density channel's gradient — measurement record

**Branch:** `scoring/adversarial-2026-09-12`.
**Answers:** `docs/audits/2026-09-12-adversarial/engine-logic.md` findings 1 and 9.
**Reproduce:** `node --experimental-strip-types tests/core/density-gradient.test.ts`.
No private corpus was read and no AUC-24 value appears here.

## 0. What the brief asked, and what the answer turned out to be

The brief asked whether the dead zone finding 1 measured on `main` is still
there on this branch's base, and if it is, to say exactly where and what it
would take. **It is gone.** The base branch's `SUB_DENSITY_STEEPNESS 50 -> 2`
closed it, and this lane's job is therefore not to fix it but to make it
impossible to reopen without a test going red. That is what
`tests/core/density-gradient.test.ts` does.

## 1. The measurement

`d(raw craft score) / d(one more MINOR issue)`, computed through the shipped
`computeRawCraftScore` at the exact `(bySeverity, sceneCount, wordCount)` each
document produces. The RAW score is used rather than `health` because `health`
is rounded to one decimal, and rounding would report a live gradient as zero at
feature length — a display question, not a formula question. §3 separates them.

| tree | scripts with a flat gradient | gradient range | 231-scene fixture, +1 minor | +48 CRITICAL |
|---|---|---|---|---|
| `main @ 8aa1f696` | **9 of 32** | — | **1.491e-7** | did not move displayed health |
| this branch | **0 of 32** | 0.027867 … 0.456943 | **0.004946** | **2.148** |

Sampling the whole occupied range rather than only the 32 points the corpus
lands on: `main` is flat at **187 of 1001** densities in [0.05, 3.00]; this tree
is flat at **0 of 1001**.

Corpus density range on this tree: **[0.6078, 1.8840]**. The 231-scene fixture:
231 scenes, 17,436 words, 13 critical / 351 major / 569 minor, density 0.9268.

## 2. The guard shown failing first

`tests/core/density-gradient.test.ts` copied unchanged onto a `git archive` of
`main @ 8aa1f696`:

```
9 of 32 scripts sit where one more weighted issue moves the score by less than 0.0001
187 of 1001 sampled densities in [0.05, 3.00] are flat
one more MINOR finding on a 231-scene feature moves the raw score by 1.491e-7
# pass 2  # fail 3
```

On this tree: 5 pass, 0 fail.

## 3. What the property does NOT buy, said before anyone reads it as a promise

At 17,436 words one minor finding is worth 0.004946 raw points, and the
displayed health is rounded to 0.1. **It takes about eleven minor findings to
move the number a writer sees by one step at feature length.** That is a
resolution limit of the display, and it is a different complaint from "the
channel is a constant". The suite asserts which of the two is true here, in its
own test, so the gradient assertion cannot be read as a claim that the UI moves
when one note is fixed.

`tests/core/monotonicity.test.ts` asserts the score is NON-INCREASING in issue
count. A flat function satisfies that exactly, which is why it could not catch
finding 1. This file asserts a STRICT decrease with a minimum step. Both stay.

## 4. Why the threshold is 1e-4 and why it is not a calibration

`MIN_STRICT_STEP = 1e-4` on the raw score. It is three orders of magnitude
above IEEE noise at these magnitudes and, on this tree, three orders of
magnitude below the smallest gradient the corpus exhibits (0.0277) and one and
a half below the feature-length gradient (0.00477). It fails loudly on a
re-flattened curve and never on rounding.

It is deliberately NOT a statement about how much a finding should be worth.
How steep the density term ought to be is a question about the exchange rate
between a finding and a scene, and that is the owner's corpus to answer — this
lane does not pick a scale the corpus must pick. The assertion is only that the
answer is not zero.

## 5. What the owner's run can and cannot settle

Nothing in this commit changes a number. It adds a property test and no
scoring-path file, so AUC-24 cannot move because of it. What the owner's corpus
*would* settle, and what this test deliberately leaves open, is the scale: at
the private corpus's median 118 scenes and a feature's word count, the gradient
is live but sub-display. Whether that is the right size is a calibration
question, and answering it means measuring how much a finding is worth against
real labels — the P1 bet itself.
