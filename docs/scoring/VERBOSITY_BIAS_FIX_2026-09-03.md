# Verbosity-bias fix — the health score stopped rewarding padding (2026-09-03)

Lane R5, from `docs/audits/2026-09-02-retrospective/RETROSPECTIVE.md` §1.
Supersedes `docs/scoring/VERBOSITY_BIAS_2026-07-11.md`, which held the defect
as documented-and-accepted for seven weeks.

**Status: READY BRANCH, NOT MERGEABLE YET.** Every gate this repository can
run itself is green. The two things it cannot run — a real-corpus AUC-24
measurement and the produced-anchor manifest re-lock — are the owner's, and
§7 is the exact command sequence. The receipt entry filed with this change is
headed `PENDING OWNER MEASUREMENT` and says in the first person that
`npm run measure-real` has **not** been run.

**Read that status literally: nothing mechanical is stopping this merge.**
`node scripts/check-scoring-receipt.mjs main..HEAD` exits **0** on this
branch — correctly, and by that validator's own documented design ("an honest
'no measurement, here is why' entry passes; a fabricated measurement does
not"). The gate proves a receipt exists, never that an AUC was measured. The
env-gated `tests/core/real-script-corpus.test.ts` would catch the stale
manifest, but it SKIPS in CI because `REAL_SCRIPT_CORPUS_DIR` is unset there.
So the "do not merge yet" on this branch is a human constraint carried by this
document, the receipt heading and the commit message — not something CI will
enforce for you.

---

## 1. The defect

`health = 100 − densityPenalty − scarcityPenalty`, with

```
density        = weightedIssues / wordCount^0.7
densityPenalty = piecewise(logistic below density 1, 2.5·density^3.75 above)
scarcityPenalty = 140 / sceneCount
```

`weightedIssues = 4·critical + 1.5·major + 0.5·minor`.

Appending stateless filler prose — words that change no state, introduce no
character and answer no question — grew the denominator faster than it grew
the findings, so density fell, the penalty fell, and **health rose**.

Reproduced on `main` at `c49e5542` with the standing witness
(`empty_verbosity` in `evals/scoring/runner/metamorphic-cases.ts`, appending
*"The wind continues. Nothing else happens. Time passes without event."* to
every scene of `evals/scoring/metamorphic/base.fountain`):

| | scenes | words | weightedIssues | density | health | verdict |
|---|---|---|---|---|---|---|
| base | 9 | 253 | 79.0 | 1.642 | **60.9** | CONSIDER |
| padded | 9 | 343 | 87.5 | 1.470 | **66.3** | CONSIDER |

**+5.4 points for nine paragraphs of nothing.** The denominator grew 24%
(253^0.7 → 343^0.7) while the findings grew 11%. The 2026-07-11 doc records
the same witness at +6.5 against a different rule set, and notes it crossed a
verdict tier at the time.

The witness had `disposition: 'known-failing'`; `run-metamorphic.ts` printed
it and exited 0; `ci.yml` said in a comment that it "does not fail this step."
The stated reason for holding was that a fix would break the 20-sample
calibration bands and the produced-anchor manifest — which, as the
retrospective puts it, is the corpus being protected from the score instead of
the score from the corpus.

### Why `^0.7` existed

It was measured, not guessed (`doctor.ts`'s own design comment): concatenating
renamed copies of one 10-scene reference sample showed `weightedIssues` growing
100.5 → 165.5 → 230.0 at 290 → 590 → 890 words, i.e. **sub-linearly** in words.
Raising `wordCount` to 0.7 tracked that, and made the formula length-invariant
for matched-quality scripts. The exponent was right about the *shape* and wrong
about the *variable*: it is scenes, not words, that the finding count tracks
(§3).

### The padding invariant, stated

1. **Prose-only filler.** Appending issue-free, opportunity-free filler —
   action paragraphs, no scene heading, no dialogue — must not raise health.
2. **Filler that adds opportunity.** Appending filler that DOES add scenes may
   raise health, but only within the scene-scarcity relief those scenes buy:
   `Δhealth ≤ 140/sc_before − 140/sc_after`.
3. **No lower bound is asserted, deliberately.** Real filler is not
   issue-free: the pipeline legitimately fires 17 extra minor findings on the
   witness's filler (54 → 71 minors), which is why health now *falls* 4.4
   points rather than staying flat. An invariant demanding "filler must not
   lower health" would be demanding the score ignore detections it actually
   made. What IS asserted instead, and is stronger, is that the whole delta is
   attributable to those findings: health is reproducible from
   `(bySeverity, sceneCount)` alone, with no residual word-count channel
   (`tests/core/verbosity-bias.test.ts`).

---

## 2. The fix

```diff
- opportunityWords = wordCount^0.7
+ opportunityWords = (sceneCount * SCENE_OPPORTUNITY_WORDS)^0.7      // 30

- densityPenalty   = density < 1 ? logistic(10, 0.52, 50)
-                                : 10 + 2.5*(density^3.75 - 1)
+ densityPenalty   = DENSITY_SCALE * density^DENSITY_POWER           // 8, 2
```

`scarcityPenalty`, the severity weights, the `^0.7` exponent, the deduction
structure (structural / arc-incoherence / dialogue) and the [0,100] clamp are
all unchanged. `fastWordCount` (`server/lib/string-utils.ts`) stays — the
revision passes still use it, and `wordCount` is still reported; it is simply
no longer an input to the score.

Signatures lost their now-unused size parameter rather than accepting and
ignoring it: `computeHealthScore`, `computeRawCraftScore`,
`computeDimensionScore`, `computeDimensionRawScore` and the internal
`craftPenalty` / `densityPenalty` / `dimensionDensityPenalty` /
`buildDimensions` all take `sceneCount` alone. `tsc --noEmit` found all 41
call sites across 6 files.

`SCENE_OPPORTUNITY_WORDS = 30` is a **unit conversion, not a claim about
screenplays**: the calibration corpus's own measured mean is 30.4 words per
scene (20 samples, 256–337 words over 9–10 scenes), so expressing the
denominator this way keeps `density` reading the same as before — "weighted
findings per scene-of-reference-length" — and keeps the corpus in its old
density regime (1.44–2.34 → 1.56–2.47). Real screenplays run 43–161 words per
scene in-repo and far higher in the produced corpus; that is precisely the
channel this constant refuses to read.

### The dimension scores got the same substitution

`dimensionDensityPenalty` (the DISPLAYED per-dimension score, Wave 18-β) read
the same word denominator, so padding raised all five dimension numbers too.
It now uses the identical scene-opportunity denominator with its own unchanged
curve (`DENSITY_POWER_DIM = 1.5`, `DENSITY_SCALE_DIM = 100`). Measured before
adopting, across the 20 live-action fixtures: no dimension pins to either
clamp, and the per-script spread across the five dimensions **widens** (e.g.
`chain-of-custody` 25 points → 55), so Wave 18-β's dimension-collapse defect is
not reintroduced.

---

## 3. Why scenes, and only scenes

The retrospective proposed "scenes, speeches, action paragraphs". All three
were swept against every in-repo criterion. **Two of the three are
contaminated**, and the measurements are the reason the shipped denominator
is narrower than the proposal:

| denominator | padding witness | 20-sample band monotonicity | 6 discrimination pairs |
|---|---|---|---|
| `wordCount^0.7` (before) | **+5.4 — fails** | holds | 6/6 |
| `(scenes+speeches+action)^0.7` | **still dilutes 11% — fails** | holds | 5/6 |
| `(scenes+speeches)^0.7` | passes | **breaks** (weak < competent) | 4/6 |
| `(scenes*30)^0.7` (shipped) | **−4.4 — passes** | holds | 6/6 |

* **Action paragraphs are exactly what the filler adds.** Counting them leaves
  the bias in place: the padded variant gains 9 action lines against 8.5
  weighted findings, so it is still 11% *less* dense than the base.
* **Speeches are inflated by the bad craft the score exists to detect.**
  On-the-nose and repetitive writing says more, in more lines. The corpus's
  `weak` band carries 16–18 speeches against `strong`'s 13–15, so normalizing
  by speeches ranks `weak` above `competent`; and the "bad" halves of the
  escalation and setup-payoff pairs carry 34 speeches against their "good"
  halves' 18–20, so both invert.

**Scene count is also the unit the finding count empirically tracks.** Two
independent in-repo measurements, both re-runnable:

* Concatenating the 20 live-action fixtures into progressively longer
  documents (each copy's cue lines tagged so cross-copy recurrence artifacts
  don't accumulate): 13 → 231 scenes grows `weightedIssues` 146 → 806.5, i.e.
  `weightedIssues ∝ sceneCount^0.599`.
* Across the same 20 fixtures individually: `weightedIssues ∝ sceneCount^0.605`.

| copies | scenes | words | words/scene | weightedIssues | `W/word^0.7` | `W/(30·sc)^0.7` |
|---|---|---|---|---|---|---|
| 1 | 13 | 830 | 64 | 146.0 | 1.321 | 2.239 |
| 2 | 26 | 1,696 | 65 | 188.0 | 1.032 | 1.774 |
| 4 | 50 | 4,239 | 85 | 400.0 | 1.156 | 2.389 |
| 8 | 96 | 8,809 | 92 | 495.0 | 0.857 | 1.872 |
| 12 | 139 | 12,465 | 90 | 576.0 | 0.782 | 1.681 |
| 16 | 185 | 16,099 | 87 | 677.0 | 0.769 | 1.618 |
| 20 | 231 | 19,480 | 84 | 806.5 | 0.801 | 1.650 |

Against words, the density falls 39% as the document grows 23x — that is the
bias, visible directly. Against scenes it falls 26%, and the shipped `^0.7`
sits inside the 0.60–0.79 bracket the two estimates give, so it was left
unchanged rather than re-fitted on a bracket this wide.

---

## 4. Why the curve constants had to be re-derived too

This is the part the 2026-07-11 doc predicted ("no zero-regression surgical
patch exists"), and it was right.

Measured: the calibration corpus runs **30 words per scene**; realistic drafts
run **43–161** (the 20 in-repo live-action fixtures) and produced features run
far higher. Under the word denominator every realistic script was therefore
*less* dense than the corpus; under a scene denominator several are *more*
dense. The population's density range widens from a 1.6x band to 3.8x
(pairs 0.75 → densest fixture 2.84), and `2.5·density^3.75` cannot span that:
3.8^3.75 ≈ 380x of penalty does not fit in 100 points. Carrying 3.75 across
measured **every live-action fixture at or near health 0** — the exact
saturation defect the opportunity design was introduced to remove
(`calibration/reference.ts`'s header).

The piecewise split is **gone, not re-tuned**. Its logistic branch existed
only because the word denominator pushed the 7-scene discrimination fixtures
into a sub-1.0 regime that a power tuned for density ≥ 1.4 crushed to nothing.
The scene denominator puts the whole population in one regime, so one
continuous, strictly increasing curve covers it — which makes the monotonicity
contract (2026-07-14) and the seam-continuity contract (2026-07-15, P0.1) true
by construction instead of by matching two branches at a seam.

### Selection rule for `(DENSITY_SCALE, DENSITY_POWER)`

Stated before the sweep, not after it. Take every pair for which **every
in-repo gate still holds at its existing threshold**:

* four-band monotonicity on band-average raw craft score;
* no `strong` sample below the `troubled` band average;
* all 6 discrimination pairs ordered, composite pair gap ≥ 5.0 displayed
  points (`tests/core/discrimination.test.ts`, threshold NOT re-locked);
* 1x/2x/3x length invariance within 10 points;
* both padding invariants, plus `scene_dup_padding` and the two
  scene-order sensitivity cases;
* the act-swap deduction gate at 8.0;
* no in-repo fixture within 10 points of either clamp.

…and among those, take the pair that **moves the existing scores least**: the
minimum RMS change in displayed health over all 45 output-identity fixtures
plus the calibration corpus and the length variants. Removing one channel from
the formula is not licence to rescore everything, so the tie-break is minimum
disruption, not best-looking separation.

That lands on **(8, 2)** — "the penalty grows with the square of issue
density". RMS displacement 23.5 points; the next-best viable pairs run
20.5–28.4 and each either breaks a gate or costs more separation:

| candidate | RMS | band spread | composite gap | dup margin | closest to a clamp |
|---|---|---|---|---|---|
| **(8, 2) — shipped** | 23.5 | 11.1 | **5.2** | −1.8 | 16.7 |
| (7, 2) | 20.5 | 9.9 | 4.6 ✗ | −0.6 | 25.0 |
| (10, 1.75) | 23.4 | 10.3 | 5.8 | −1.3 | 19.1 |
| (18, 1.25) | 28.4 | 9.5 | 7.6 | −1.1 | 13.5 |
| (9, 2) | 27.1 | 12.4 | 5.9 | −3.0 | 8.1 ✗ |

---

## 5. In-repo before / after

### 5.1 The padding witness

| | health before | health after |
|---|---|---|
| base | 60.9 | 64.7 |
| + prose filler (`empty_verbosity`) | 66.3 (**+5.4**) | 60.3 (**−4.4**) |
| + filler with scene headings (`filler_scenes`, new) | — | 56.9 (−7.8) |

Full metamorphic suite, after: **8/8 pass, 0 known-failing witnesses.**

| case | Δ before | Δ after |
|---|---|---|
| identity / whitespace_reflow / rename_character | 0 | 0 |
| `empty_verbosity` | +5.4 (KNOWN FAIL) | **−4.4 (PASS, now HARD)** |
| `filler_scenes` (added by this lane) | — | −7.8 (PASS) |
| `scene_shuffle` | −11.3 | −6.4 |
| `scene_reverse` | −6.0 | −3.6 |
| `scene_dup_padding` | −10.5 | −2.3 |

`scene_dup_padding`'s margin tightened from 10.5 points to 2.3. It is the
binding constraint on the density scale: duplicating every scene halves the
scarcity term (140/9 → 140/18 = −7.8 points of penalty), so the density term
must rise by more than that on a 22% density increase. This is why no
lower-scale candidate is viable, and it is the number to watch first if the
owner's re-derivation moves `SCARCITY_SCALE`.

### 5.2 Calibration corpus (raw, unclamped craft statistic)

| band | before | after |
|---|---|---|
| strong | 62.39 | 61.92 |
| competent | 52.52 | 58.36 |
| weak | 42.12 | 54.77 |
| troubled | 37.08 | 50.78 |
| **spread (strong − troubled)** | **25.31** | **11.13** |

Monotonicity holds; no sample saturates at either clamp; no `strong` sample
falls below the `troubled` average. **The separation is less than half what it
was** — an honest cost, and the direct consequence of the corpus no longer
being scored on a scale calibrated to its own unrealistic 30-words-per-scene
prose rate. `calibration.test.ts` asserts the ordering, not the magnitude, and
the corpus's own header documents the band-average targets as soft.

**No corpus sample was edited.** The CLAUDE.md constraint — that band
monotonicity is a property of the controlled-richness design, and that editing
one band's richness reintroduces the confound — was not touched. The one
richness variable the corpus does NOT control is speech count (12–18, and
systematically higher in the weak/troubled bands), which is why §3 rejects the
speech denominator rather than re-balancing the corpus to accommodate it.

### 5.3 Discrimination pairs (displayed health, good vs bad)

| pair | before | after |
|---|---|---|
| subtext-vs-on-the-nose | 79.7 / 75.4 (gap 4.3) | 75.5 / 73.7 (gap 1.8) |
| active-vs-passive-protagonist | 78.8 / 70.3 (gap 8.5) | 74.3 / 72.3 (gap 2.0) |
| escalation-vs-flat-repetition | 76.9 / 70.0 (gap 6.9) | 74.7 / 69.9 (gap 4.8) |
| setup-payoff-vs-orphaned-setups | 76.4 / 70.1 (gap 6.3) | 74.5 / 72.5 (gap 2.0) |
| dramatized-vs-told-exposition | 77.5 / 72.6 (gap 4.9) | 75.1 / 73.3 (gap 1.8) |
| composite-reviewer-scenario | 78.5 / 70.0 (gap 8.5) | 75.3 / 70.1 (**gap 5.2**) |

6/6 still ordered correctly; the composite pair still clears its unchanged
≥ 5.0 gate, with 0.2 to spare. The gaps narrowing is the same compression as
§5.2 and the same honest cost.

### 5.4 Fixture-level: all 45 output-identity reports moved

`node scripts/check-doctor-output-identity.mjs` against `git archive main`
(`c49e5542`): **45 of 45 reports differ; 28 change verdict.** Health delta
range −39.9 to +24.2, mean −11.2.

| fixture | before → after | verdict |
|---|---|---|
| calibration Merge | 20.9 → 45.1 (+24.2) | PASS → PASS |
| calibration The Grift | 17.6 → 37.1 (+19.5) | PASS → PASS |
| calibration Adrift | 31.8 → 50.0 (+18.2) | PASS → PASS |
| calibration The Long Game | 68.8 → 66.6 (−2.2) | CONSIDER → CONSIDER |
| synthetic 300-scenes | 88.4 → 81.5 (−6.9) | RECOMMEND → CONSIDER |
| synthetic 240-scenes | 87.5 → 77.0 (−10.5) | RECOMMEND → CONSIDER |
| synthetic 120-scenes | 86.6 → 69.0 (−17.6) | RECOMMEND → CONSIDER |
| synthetic 60-scenes | 85.6 → 60.2 (−25.4) | RECOMMEND → CONSIDER |
| screenplay dead-frequency (= P0 sample) | 78.3 → 54.8 (−23.5) | CONSIDER → PASS |
| screenplay runoff (161 words/scene) | 74.6 → 53.5 (−21.1) | CONSIDER → PASS |
| screenplay room-12 (43 words/scene) | 30.9 → 21.4 (−9.5) | PASS → PASS |
| screenplay mise | 72.9 → 33.0 (−39.9) | CONSIDER → PASS |

The direction is the whole point: **the wordier a script was, the more it
loses.** The troubled end of the calibration corpus rises because those
samples were being punished for being word-thin, not for being badly written.
Nothing clamps: the lowest in-repo report is 16.7 and the highest is 81.5.

Every changed number in these 45 reports is recomputable from this repository
with no external corpus. No locked number was updated where the new value was
not computable in-repo.

---

## 6. What broke, and what was done about each

The full suite is green (`npm test`: 11,130 tests, **0 failures**, 91 skipped).
Getting there required these changes, listed with the reason each is or is not
a re-lock of the old score as ground truth.

| # | Test | Why it failed | Action |
|---|---|---|---|
| 1 | `tests/core/discrimination.test.ts` (4 of 6 pairs) | Pairs sat at density 0.47–0.76 under words, 0.75–1.13 under scenes — right where the retired logistic saturated, so pairs tied after rounding | Fixed by re-deriving the curve (§4). **No threshold changed.** |
| 2 | `tests/core/feature-scale-discrimination.test.ts` (act-swap) | Both fixtures clamped at health 0 under the un-re-derived curve | Fixed by §4. **Gate stays 8.0**; the header's measured table was re-measured by ablation (live 8.5, ablated 4.6). |
| 3 | `tests/core/feature-scale-discrimination.test.ts` (dialogue-flatten delta) | Gate 20.0 was reachable only because ~10.7 of the old 28.7-point delta came from the density channel reacting to deleted words — the chance-level (AUC 0.54) signal the file's own header names | **Re-locked 20.0 → 8.0**, by the original methodology: measured live 12.0, ablated **−6.0**. The gate now separates "deduction alive" from "deduction dead" cleanly for the first time; the ablated side is negative rather than 10.7 short. |
| 4 | `tests/core/feature-scale-discrimination.test.ts` (verdict-tier drop) | Both fixtures now score in the bottom tier (29.7 and 17.7), because `verdictFor`'s 85/60 boundaries are anchored to the OLD distribution in which produced features scored 97–98 | **SUSPENDED, not deleted** — weakened to "must not IMPROVE", with an in-file `OWNER RE-DERIVATION REQUIRED` note pointing here. Re-anchoring the tiers needs the produced corpus; it is item 4 of §7. The delta gate (#3) still catches a dead deduction. |
| 5 | `tests/core/deep-read.test.ts` (deep/quick lineage) | Deep and quick health collapsed onto the same rounded value under the un-re-derived curve | Fixed by §4. No change to the test. |
| 6 | `tests/core/rebuild-experiment.test.ts` (rule-channel zeroing) | Asserted the add-back is invariant to `sceneCount` — true only while density read words alone. Density now reads `sceneCount`, so the probe fails for a reason unrelated to the property | **Re-expressed, not weakened**: now asserts the add-back equals the density term with scarcity cancelling (against the unclamped statistic), and that it is invariant to `wordCount` — which is the lane's property, stated directly. |
| 7 | `evals/scoring/runner/metamorphic-exit.test.ts`, `run-metamorphic-classify.test.ts` (5 cases) | Encoded the policy that `empty_verbosity` is known-failing | Updated to the new policy: it is HARD, `KNOWN_FAILING_CASE_IDS` is empty. `classifyResults` gained an injectable known-failing set so its branch stays testable with an empty roster. |
| 8 | `tests/core/script-doctor.test.ts`, `tests/core/calibration.test.ts` (formula spot-checks) | Locked numbers and fixtures chosen against the old formula | Locked numbers recomputed in-repo (`{1,2,3}@10 scenes: 86 → 85.8`; `{0,0,0}@25: 94.4` and `@4: 65` unchanged). Two saturation fixtures re-chosen because a "tiny wordCount" no longer saturates anything: the clamp case is now `{30,30,30}@5 scenes`, the raw-ordering case `{60,0,0}` vs `{90,0,0}@10`. The honesty-guard rounding case was restructured to assert against its own raw score, because `sceneCount` is now both the precision switch and the denominator. Dimension spot-check re-locked `[75.3, 69.8, 93.7, 76.3, 97.3]` → `[42, 29.2, 85.3, 44.5, 93.7]`. |

### Will fail until the owner acts

* **`tests/core/real-script-corpus.test.ts`** — env-gated on
  `REAL_SCRIPT_CORPUS_DIR`, so it SKIPS in CI and skipped here. Run locally
  against the real corpus it will fail on
  `tests/fixtures/real-corpus-manifest.json`: every one of the 72 rows carries
  a `health` and `verdict` computed by the old formula, and §5.4 shows those
  move. The manifest **cannot** be re-locked from this repository — the corpus
  is local-only and deliberately absent. §7 item 3 is the command.
* **`tests/core/auc24-table.test.ts`** — skips today because the table does not
  exist yet (`npm run lock-auc24`, blocking from 2026-10-01). When it is
  produced it must be produced on THIS formula, not before the merge.

---

## 7. Owner command sequence to finish

Run from a checkout of this branch, on the machine that has the corpus.

```bash
# 0. Confirm the branch is still green locally.
npm run lint && npm test && npm run test:metamorphic

# 1. Measure AUC-24 on the real corpus. This is the step CI cannot do.
REAL_SCRIPT_CORPUS_DIR=<local corpus path> npm run measure-real

# 2. Re-lock the CI-recomputable AUC-24 table on THIS formula.
REAL_SCRIPT_CORPUS_DIR=<local corpus path> npm run lock-auc24

# 3. Re-lock the produced-anchor manifest (72 rows of health/verdict/sceneCount).
#    NOTE: there is no committed re-lock script — grep confirms nothing under
#    scripts/ writes tests/fixtures/real-corpus-manifest.json, and the test only
#    reads it. Regenerate each row by running runScriptDoctor over the local
#    corpus and rewriting `health`, `verdict` and `sceneCount` IN PLACE, one to
#    one, preserving array order exactly: the first 24 entries are the AUC-24
#    subset and re-ordering them silently changes what the floor measures
#    (tests/fixtures/real-corpus-manifest.README.md, "The array order is
#    load-bearing"). `contentHash` must not change — if one does, the corpus
#    file changed, not the formula.
REAL_SCRIPT_CORPUS_DIR=<local corpus path> \
  node --experimental-strip-types tests/core/real-script-corpus.test.ts   # must pass after the re-lock

# 4. Decide the verdict/grade boundaries.
#    verdictFor's 85/60 and gradeForHealth's 90/75/55/35 (doctor.ts) were
#    anchored to a distribution in which produced features scored 97-98. After
#    step 3 you will have their new distribution — re-derive the boundaries
#    against it, or accept the shift and say so. Then restore the strict
#    verdict-tier assertion in tests/core/feature-scale-discrimination.test.ts
#    (marked SUSPENDED, with the numbers, at its site).

# 5. Append a real receipt entry to docs/p1-benchmark/MEASUREMENT_RECEIPTS.md
#    carrying the measured AUC-24 from step 1, superseding the
#    PENDING OWNER MEASUREMENT entry this branch filed.

# 6. Re-check the gate over the whole range, then merge.
node scripts/check-scoring-receipt.mjs main..HEAD
```

**Do not raise or lower the AUC-24 floor in `scripts/lib/auc.ts` as part of
this migration.** If step 1 comes back below 0.622, that is a finding about
this change, not a reason to move the ratchet.

---

## 8. What this lane did NOT do

* No corpus sample was edited, in either direction.
* `SCARCITY_SCALE` (140), `WORD_COUNT_EXPONENT` (0.7), the severity weights,
  the three deductions and the clamp are untouched.
* No AUC was measured, claimed, or estimated. The receipt entry filed with
  this change says so in the first person.
* `verdictFor` / `gradeForHealth` boundaries are untouched — they need the
  produced corpus, which this repository does not have (§7 item 4).
