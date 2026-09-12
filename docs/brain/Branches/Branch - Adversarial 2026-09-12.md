---
type: branch
updated: 2026-09-12
status: pending-owner-measurement
sources: [docs/p1-benchmark/MEASUREMENT_RECEIPTS.md, docs/scoring/PARSE_FORMAT_INVARIANCE_2026-09-12.md, docs/scoring/DENSITY_GRADIENT_2026-09-12.md, docs/scoring/CALIBRATION_CONFOUND_2026-09-12.md, docs/scoring/REPORT_SEAM_2026-09-12.md, docs/scoring/VOICE_PAIR_CAP_2026-09-12.md]
---

# Branch — `scoring/adversarial-2026-09-12`

The answer to `docs/audits/2026-09-12-adversarial/engine-logic.md` findings 1,
2, 3, 4, 5, 8, 9, 10 (the analyzer half) and 13, and to
`writer-loop.md` findings 1, 7, 12 and 13. It is **stacked on**
[[Branch - Feature-Length Defects]], rebased onto `main` @ `8aa1f696`, not
parallel to it: see [[Owner - R5 Measurement and Merge]] for where it sits in
the order and what the corpus is needed for.

## The thesis it implements

The investigator's, and this branch agrees with it: a live gradient, parse and
format invariance, and permutation-ensemble invariants are **prerequisites** to
the P1 bet, corpus-free to establish and only corpus-requiring to re-measure.
Running `npm run measure-real` before them re-locks a floor onto an instrument
that reads whitespace.

## What it does

1. **Parse and format invariance.** Eleven transforms that moved the score on
   the 32 committed scripts read **0 of 32** afterwards — a dialogue reflow at
   four widths (was 119 of 128 script-width pairs, up to 8.8 points, one verdict
   flip), a standard title page, curly quotes, boneyard notes, inline notes,
   synopses, section headings.
2. **The denominator is the screenplay**, not the raw submission. Closes a
   free-score attack: an 800-repetition boneyard moved health on 32 of 32
   scripts, mean +7.206, up to +18.6, flipping four verdicts.
3. **A live density gradient, asserted.** The dead zone finding 1 measured on
   `main` (9 of 32 scripts flat, 187 of 1001 sampled densities flat, 1.491e-7
   per finding at feature length) is already closed on this base; the property
   test stops it reopening.
4. **Order claims become ensemble statistics** over 20 seeded permutations, and
   the 231-scene reversal defect (+4.7, wrong sign) is pinned as a named,
   still-failing witness rather than omitted.
5. **The calibration corpus's word budget is disclosed as a confound** —
   Spearman(band, words) 0.7526 exceeds Spearman(band, health) 0.7099 — without
   re-authoring the corpus.
6. **Report truth**: every dimension summary states its count; the ranked list
   weights concentration.
7. **The voice pair grid's work is bounded** at 40 speakers, so a 20-to-60
   character ensemble feature is analyzed instead of refused.

## The cost

Four public-benchmark floors move DOWN, isolated by rerun to the denominator
change alone: `PUBLIC_SHUFFLE_DROP_PAIRED_FLOOR` 0.855 → 0.8238 (measured
0.8750 → 0.8438), `PUBLIC_SHUFFLE_DROP_FLOOR` 0.8091 → 0.7696,
`PUBLIC_ORDER_FLOOR` 0.5069 → 0.5034, `PUBLIC_DIALOGUE_FLATTEN_FLOOR` 0.98 →
0.9614. `AUC24_FLOOR` untouched. The cause is that all 32 fixtures counted their
own CC0 licence record as screenplay words. See
[[Gate - Public Benchmark]] and the measurement doc's §14.

## Receipt

One PENDING entry, 2026-09-12 "ADVERSARIAL LANE", in
`docs/p1-benchmark/MEASUREMENT_RECEIPTS.md`. `check-scoring-receipt` exits 1
naming exactly it, which is the intended state.
