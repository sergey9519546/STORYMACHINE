# Feature-length defects — the score at the length the product is for

**Branch:** `scoring/feature-length-defects` · **Base:** `main @ 9b199b72` ·
**Date:** 2026-09-07 · **Status:** PENDING OWNER MEASUREMENT — nothing here
touched the private 761-script corpus, and no number in this document
describes it.

Every number below came out of a command quoted beside it, run in the
foreground on this branch. Nothing is transcribed from another document.

```
npm run benchmark:public                                          # (1)
node --experimental-strip-types tests/core/blind-pairs-discrimination.test.ts   # (2)
node --experimental-strip-types tests/core/calibration.test.ts    # (3)
npm run test:metamorphic                                          # (4)
node scripts/check-doctor-output-identity.mjs --tree . --out <dir> # (5)
```

---

## 0. What this branch is, in one paragraph

Three defects that only show up at, or are only visible because of, feature
length: (1) the dialogue channel abstains for the WHOLE script the moment any
one character has under 30 words, so it is structurally dead on every real
feature; (2) `ORPHAN_CLUE`'s critical tier is character names and the script's
own title; (3) the health formula pays a writer to delete a third of their
scenes AND pays them again for stapling unrelated scripts together. (3) is the
One Bet — it is the reason `SHUFFLE_DROP`'s mean health gap is negative on
`main` before any branch is involved, and it is why twelve CONSIDER shorts
concatenated score RECOMMEND. A fourth item, `meanAbsDialogueShareDelta`, was
measured as a candidate wiring and is reported in §7.

---

## 1. The measurement block

The same seven readings are taken after every commit and appended to §8's
running table:

| # | reading | command |
|---|---|---|
| a | public benchmark: 3 degradations x {matched-pair, all-pairs} with 95% CIs | `npm run benchmark:public` |
| b | blind matched pairs: ordered/6, mean gap | `tests/core/blind-pairs-discrimination.test.ts` |
| c | calibration band monotonicity | `tests/core/calibration.test.ts` |
| d | metamorphic gate incl. `empty_verbosity` and the new `stapled_shorts` | `npm run test:metamorphic` |
| e | output identity vs `main @ 9b199b72`: how many of 45 moved, by how much | `scripts/check-doctor-output-identity.mjs` |
| f | verdict flips over the same 45 | same snapshots |
| g | the staple witness: stapled-12 health vs the best single part | `npm run test:metamorphic` (case `stapled_shorts`) |

**A correction to the brief.** The brief asks for "the 54-fixture
output-identity diff summary" and "the 45-fixture verdict-flip count" as two
different sets. There is one set:
`scripts/check-doctor-output-identity.mjs` writes **45** report snapshots (20
`data/screenplays/*.fountain`, 20 calibration `REFERENCE_CORPUS` samples, the
P0 sample script, and four `synthetic/*-scenes` fixtures), plus two
bookkeeping files (`_index.json`, `_timings.json`) that are not reports. Both
the identity diff and the verdict-flip count are over those same 45. "54" is
the count of tracked fixtures in `server/lib/validation.ts`'s shape-guard
margin proof, a different set for a different purpose.

---

## 2. The baseline, decomposed

`main @ 9b199b72`, all 32 public-corpus scripts scored intact and under each
of the three degradations, with the health formula's two terms separated
(`densityPenalty` / `scarcityPenalty`, `doctor.ts:426-468`):

```
SHUFFLE_DROP    means over 32: wi ratio 0.5018, word ratio 0.7252, Δ densityPenalty -7.632, Δ scarcityPenalty +5.693
CLIMAX_RELOCATE means over 32: wi ratio 1.0031, word ratio 1.0000, Δ densityPenalty -1.470, Δ scarcityPenalty  0.000
DIALOGUE_FLATTEN means over 32: wi ratio 1.0305, word ratio 0.6051, Δ densityPenalty +15.124, Δ scarcityPenalty 0.000
```

That is the whole of defect (3), stated as arithmetic. **Deleting a third of
the scenes removes half the weighted issues but only a quarter of the words**,
so `density = weightedIssues / wordCount^0.7` falls to ~0.62 of its intact
value, the near-step logistic (steepness 50 about midpoint 0.52,
`doctor.ts:447-449`) gives back up to its entire 10-point range, and the
scarcity term's +5.693 cannot cover the −7.632. Net: the damaged copy scores
**1.9 points higher on average**.

The staple is the same formula's other end, and it is a DIFFERENT term:

```
STAPLE  scenes=139 words=11412 wi=561 density=0.8106 densPen=10.000 scarce=1.007 resid=2.49 health=86.5 verdict=RECOMMEND
best part (dead-frequency)  scenes=12 words=1830 wi=125.5 density=0.6530 densPen=9.987 scarce=11.667 resid=0.05 health=78.3 verdict=CONSIDER
```

Both are pinned at the density ceiling (10.000 vs 9.987 — **0.013 apart**).
The entire +8.2 is `scarcityPenalty`: 11.667 at 12 scenes against 1.007 at
139, less the 2.49 the feature-scale deductions claw back. **No change
confined to the density term can move this witness**, and that is a measured
fact about this corpus, not an argument.

---

## 8. The running table

Appended after every commit. `DROP`/`CLIMAX`/`CTRL` are the public
benchmark's matched-pair AUCs (the PRIMARY statistic); all-pairs and the CIs
are in §8.1.

| # | commit | DROP | CLIMAX | CTRL | blind | cal | `empty_verbosity` | `stapled_shorts` | identity moved | verdict flips |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | `stapled_shorts` witness | 0.5313 | 0.4219 | 1.0000 | 1/6, −0.0167 | 21/21 pass | KNOWN FAIL +5.4 | **KNOWN FAIL +8.2** | 0 of 45 | 0 of 45 |

### 8.1 Per-commit detail

**Commit 1 — the `stapled_shorts` witness (instrument only, no scoring
change).**

```
SHUFFLE_DROP     matched-pair 0.5313 [0.3750, 0.6875] floor 0.5113 · all-pairs 0.5586 [0.4219, 0.6973] floor 0.5386 · 17/15/0
CLIMAX_RELOCATE  matched-pair 0.4219 [0.2813, 0.5625] floor 0.4019 · all-pairs 0.4673 [0.4014, 0.5264] floor 0.4473 ·  8/13/11
DIALOGUE_FLATTEN matched-pair 1.0000 [1.0000, 1.0000] floor 0.98   · all-pairs 0.9473 [0.8779, 1.0000] floor 0.9273 · 32/0/0
blind pairs      ordered 1 of 6, mean gap -0.0167 (night-shift/low-tide/fence-line tie at 76.0)
calibration      tests 21, pass 21, fail 0
metamorphic      6/8 raw, hard passes 6, known-failing witnesses 2 (empty_verbosity +5.4, stapled_shorts +8.2)
identity         45 compared, 0 byte-differing, health moved 0, verdict flips 0, grade flips 0
```

The witness is shown FAILING on the tree it was written against — base 78.3
(the best single part), variant 86.5, Δ **+8.2** against `not_increase`
epsilon 0 — which is what makes it evidence rather than decoration. It is
registered `known-failing`, the same disposition `empty_verbosity` carries,
so it prints on every run and fails no build until the formula is fixed.
