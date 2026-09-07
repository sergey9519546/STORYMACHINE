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
measured as a candidate wiring and is a NULL result — reported in §7.

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
| 2 | voice: per-character abstention | 0.5313 | 0.4219 | 1.0000 | 1/6, −0.0167 | 21/21 pass | KNOWN FAIL +5.4 | KNOWN FAIL +8.2 | 0 of 45 (45 byte-differ) | 0 of 45 |
| 3 | `ORPHAN_CLUE` proper-noun/title guard | **0.5781** | **0.5156** | 1.0000 | **0/6**, −0.0667 | 21/21 pass | KNOWN FAIL +5.3 | KNOWN FAIL +7.0 | 18 of 45, RMS 10.652 | 2 of 45 |
| 4 | density steepness 50→2 + scarcity saturation | **0.8750** | **0.5469** | 1.0000 | **4/6**, +0.3833 | 21/21 pass | KNOWN FAIL +5.3 | **PASS −2.0** (promoted to `hard`) | 25 of 45, RMS 9.580 | 6 of 45 |
| 5 | normalised dialogue-share roughness (exposed, NOT wired) | 0.8750 | 0.5469 | 1.0000 | 4/6, +0.3833 | 21/21 pass | KNOWN FAIL +5.3 | PASS −2.0 | 0 of 45 (45 byte-differ) | 0 of 45 |
| 6 | honest `plainSummary` / `strengths` (strings only) | 0.8750 | 0.5469 | 1.0000 | 4/6, +0.3833 | 21/21 pass | KNOWN FAIL +5.3 | PASS −2.0 | **0 of 45** (identity PASS modulo the two keys) | 0 of 45 |

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


**Commit 2 — the voice channel abstains per character, not per script.**

Every AUC, every blind pair, every calibration band and every health value is
unchanged, and that is the expected result, not a null one: nothing in the
scoring pipeline reads `voiceAnalysis`. `doctor.ts:2292` carries it onto the
report and the only consumers are display (`CoverageSummary.tsx`'s Voice
Separation tile) and generation (`voice-constraint.ts`). All 45 reports
byte-differ because they gain an `excludedCharacters` field and, on 26 of
them, a pair matrix they never had; **0 of 45 move health and 0 flip verdict**.

```
identity  45 compared, 45 byte-differing, health moved 0, verdict flips 0, grade flips 0
voice     scored 18 of 45 -> scored 44 of 45 (one fixture still has fewer than two characters over the floor)
```

**A correction to the brief.** The brief says "the shorts unchanged". They are
not: on `main @ 9b199b72` **27 of the 45 in-repo fixtures abstained entirely**,
including seven of the twelve CC0 shorts the staple is built from
(`close-quarters`, `code-blue`, `high-voltage`, `mise`, `off-season`,
`quiet-season`, `red-line`), plus all four `synthetic/*-scenes` fixtures. The
defect was never confined to feature length — feature length only made it
certain. What IS unchanged is every delta already being reported: `burrowsDelta`
builds its corpus statistics from the two characters it is handed and nothing
else, so dropping a sparse third character cannot move a surviving pair's
number. That is asserted directly
(`tests/core/voice-delta.test.ts`, "the sparse character changes nothing about
the surviving pair's number").

The feature-scale evidence the brief asks for, on the only feature-scale
document this repository has (the stapled twelve — see §2):

```
stapled-12  scenes=139 chars=55  scored=true pairs=820 excluded=14  runScriptDoctor 515ms
            first pairs NELL/DELGADO 0.83, NELL/OSEI 0.98, NELL/RAY 0.86, NELL/ROSALIND 1.05
            excluded TRAN, REPORTER, DR. NAKASHIMA, NURSE OKONJO, NAKASHIMA, YOUNGER RIVA, …
```

### Two coupled changes the brief did not name, and why they were required

**(a) A 220x performance fix, because per-character abstention is what makes
the expensive path reachable.** `burrowsDelta` re-derived BOTH characters'
full ~63-word frequency tables once per function word, per pair — invisible
while a single walk-on abstained the whole script, and quadratic the moment it
does not. Measured on the security suite's own 200-name payload (200 eligible
characters, 11,970 pooled words, 19,900 pairs):

```
analyzeVoices alone   42,062 ms  ->  191 ms
```

Each character's table is now derived once. The arithmetic is unchanged and in
the same order, and the output is asserted bit-identical against a from-scratch
reference implementation of the pre-2026-09-07 walk
(`tests/core/voice-delta.test.ts`, "output is byte-identical to a per-pair
burrowsDelta walk"). Cost at deliberately extreme scale, after the fix:

| eligible characters | pooled words | guard weight | pairs | ms |
|---|---|---|---|---|
| 100 | 36,000 | 3,600,000 | 4,950 | 32 |
| 200 | 96,000 | 19,200,000 | 19,900 | 102 |
| 520 | 249,600 | 129,792,000 | 134,940 | 563 |

**(b) The shape guard's cost model had to move with the analyzer, and it made
the guard stricter.** `server/lib/validation.ts`'s
`MAX_FOUNTAIN_VOICE_ELIGIBLE_WEIGHT` evaluated a weight AT ALL only once every
distinct character cleared 30 words — a faithful mirror of the old analyzer,
and a hole the moment the analyzer stopped abstaining. It now reads the
eligible SUBSET, which rejects a superset of what it rejected before, never a
subset. Two security controls legitimately flip and were re-anchored per that
suite's own rule, with the measurement rather than a widened tolerance:

* `R5-6` and `R4-2b` (a 200-name cast plus one one-word walk-on) asserted
  ACCEPT. That acceptance was only safe because the analyzer abstained too.
  Measured after per-character abstention and BEFORE the performance fix:
  weight 2,394,000 against the 300,000 bound, 19,900 pairs, **42,062 ms in
  `analyzeVoices` alone**. Both now assert REJECT, and `R4-2b` gained a
  fail-first companion asserting a genuinely small cast is still accepted.
* The round-7 `fail-first` proof asserted that the retired legacy walk could
  be BYPASSED by poisoning one name. Per-character eligibility closes that
  entire class structurally, so the test was re-anchored to the property that
  survives and is still falsifiable: the demotion ghost still miscounts the
  cast on at least five cue families, and no family with a real over-bound
  cast can defeat the bound with it.

**What was deliberately NOT done.** `MAX_FOUNTAIN_VOICE_ELIGIBLE_WEIGHT` was
not raised. No cost bound is loosened as a side effect of a scoring change, and
every payload that suite pins as rejected stays rejected. The price is stated
rather than hidden: the suite's own synthetic "realistic 150-name feature" now
sits at **1.2x headroom** (eligible weight 259,200 against 300,000) where it
previously never reached the bound at all, so a legitimate ensemble feature
somewhat larger than that fixture would now be rejected for a cost the table
above puts in the tens of milliseconds. Re-deriving that constant from the new
rate belongs to a lane whose review is about this guard.

**Gates:** `npm run lint` 0 · `check-no-console` 0 · `check-docs` 0 ·
`tests/core/voice-delta.test.ts` 18/18 ·
`tests/security/fountain-shape-guard-cue-parity.test.ts` **647/647**.


**Commit 3 — `ORPHAN_CLUE`'s proper-noun / title / location guard.**

```
SHUFFLE_DROP     matched-pair 0.5781 [0.4063, 0.7344] floor 0.5113 · all-pairs 0.6196 [0.4751, 0.7622] floor 0.5386 · 18/13/1
CLIMAX_RELOCATE  matched-pair 0.5156 [0.3906, 0.6250] floor 0.4019 · all-pairs 0.4971 [0.4722, 0.5205] floor 0.4473 ·  8/7/17
DIALOGUE_FLATTEN matched-pair 1.0000 [1.0000, 1.0000] floor 0.98   · all-pairs 1.0000 [1.0000, 1.0000] floor 0.9273 · 32/0/0
blind pairs      ordered 0 of 6, mean gap -0.0667                          <- RATCHET FAILS, see below
calibration      tests 21, pass 21, fail 0
metamorphic      6/8 raw, hard passes 6, witnesses 2 (empty_verbosity +5.3, stapled_shorts +7.0)
identity         45 compared, 45 byte-differing, health moved 18, RMS 10.652, mean +4.844,
                 largest +32.2 (transfer-window 31.9 -> 64.1), verdict flips 2, grade flips 4
payoff pass      453/453 · clue-information-test 8/8 · clue-proper-noun-guard 8/8
```

**What the guard is.** Three shapes walked past the existing speaker guard,
and the third is why the existing one was nearly inert:

1. A cue of `NELL` against an inline introduction reading
   `DISPATCHER NELL ARCEO (40s)` — `CAPS_TOKEN_RE` takes up to three caps
   words, so the token is `dispatcher nell arceo` and set equality fails.
2. The title page. `segmentScenes` prepends every block before the first
   scene heading into scene 1's body, so `Title: THE LONG WAY DOWN` was
   scene-1 action text to the clue walk.
3. **The cue set was almost empty.** The guard built `speakerNames` by
   scanning `s.rawText`, which is `orderedLines.join('\n')` — action lines
   plus dialogue TEXT, with the cue lines already stripped by
   `extractSceneContent`. This file's own comment at `CAPS_TOKEN_RE` says
   "character names are exactly what the speaker guard below DISCARDS"; that
   was true of the intent, not of the code. The cue set now comes from
   `s.characters` and `dialogueLines[].speaker`.

The name test is `EVERY word must be a name word`, never `any` — `BRASS KEY`
beside a character called KEY stays a clue, because `brass` is not a name
word. To make that strict test reach `ramon delgado` (cue `DELGADO`, `ramon`
unknown), the guard first learns full names from the screenplay's own
introduction convention: one pass over the caps tokens, and any token
containing an already-known cue word teaches its other words. One pass, not a
fixed point, so the set cannot chain outward through unrelated props.

**The measured before/after, on the 139-scene stapled document:**

```
main @ 9b199b72, ORPHAN_CLUE in the top ten (8 of 10 priorities):
  ["dispatcher-nell-arceo","ramon-delgado","detective-osei","ray-bellweather",
   "rosalind-kane","imogen-kane","victor-prieto","dispatcher"]
  retitled ZEBRA PANCAKE QUANTUM -> ["zebra-pancake-quantum", …]  (the title becomes finding #1)

this commit:
  ["handling-it","only","something-happens","term-sheet","hours","weekdays","mrs"]
  retitled ZEBRA PANCAKE QUANTUM -> byte-identical priority tier
```

Not one character name, not one title word, and **the priority tier no longer
moves when the title does** — asserted directly
(`tests/core/clue-proper-noun-guard.test.ts`, "at feature scale the priority
tier does not move when the title does"). The remaining ids are quoted
dialogue phrases from the other clue channel; they are noisy in their own way
and are out of this commit's scope.

**Fail-first, run rather than asserted.** With the guard call reverted to the
old `speakerNames.has(token)` line and nothing else changed, **5 of the new
file's 8 tests fail**; with it restored, 0 do. One honest gap: the LOCATION
assertion (`riverside-motel`, `parking-lot`) passes in BOTH directions on this
fixture — that shape is guarded but not demonstrated to have been broken, and
it is recorded as a guard rather than a proven fix.

### The regression this commit causes, stated before anything else

**The blind-pairs ratchet FAILS: 1 of 6 ordered → 0 of 6, mean gap −0.0167 →
−0.0667.** `tests/core/blind-pairs-discrimination.test.ts` exits 1. That test
was added on 2026-09-06 precisely so a drop like this could not pass silently,
and it worked.

The mechanism is visible in the numbers and is NOT "the guard broke
discrimination": removing name-clues removes weighted issues, health rises
(mean +4.8 over the 45 fixtures), and more scripts land on the density
penalty's 10-point ceiling — **exactly the saturation §2 identifies as the
core defect**. On `main` five of the twelve blind fixtures were pinned at
health 76.0; after this commit ten of twelve are, so `the-ledger`, the single
pair the engine ordered, becomes a tie. The one ordered pair was carried by
the "bad" member firing more character-name clues than the "excellent" one,
which is the noise this commit removes.

That reading is a hypothesis until the ceiling is gone, so **no floor is
re-anchored here**. The test's own instruction ("if the drop is intended,
re-run the measurement, update `MEASURED_ORDERED_PAIRS` … and say why") is
deferred to commit 4, which removes the saturation; whether the pairs come
back is a measurement, not a prediction, and it is reported either way.

Both measurement channels of the public benchmark move UP in the same
commit — `SHUFFLE_DROP` 0.5313 → 0.5781 matched-pair, `CLIMAX_RELOCATE`
0.4219 → 0.5156 — and the control goes to a clean 1.0000/1.0000. Read that
with its own caveat: `CLIMAX_RELOCATE`'s exact ties went from 11 to **17** of
32, so more than half its N now cannot move, and its point estimate rests on
15 scripts.


### A correction to commit 3's entry

Commit 3's block did not include `tests/core/discrimination.test.ts`, and it
should have. Re-run afterwards with only that commit's `doctor.ts` in place,
**two of that file's assertions were already failing there**, not at commit 4:

```
dramatized-vs-told-exposition   gap -1.4   INVERTED   (commit 3's tree)
composite-reviewer-scenario     gap +0.1   below the 5.0 margin floor
```

Commit 4 recovers both partially (−1.4 → −0.2, +0.1 → +1.4). The attribution
and the re-anchoring are in commit 4's entry below, under the heading they
belong to; the misattribution is recorded here rather than quietly fixed,
because "which commit broke it" is the part a reviewer cannot re-derive later.

**Commit 4 — the length pathology. `SUB_DENSITY_STEEPNESS` 50 → 2, and
`scarcityPenalty` saturates at 15 scenes.**

```
SHUFFLE_DROP     matched-pair 0.8750 [0.7500, 0.9688] floor 0.855  · all-pairs 0.8306 [0.7236, 0.9277] floor 0.8106 · 28/4/0
CLIMAX_RELOCATE  matched-pair 0.5469 [0.3750, 0.7188] floor 0.5269 · all-pairs 0.5151 [0.4551, 0.5767] floor 0.4951 · 17/14/1
DIALOGUE_FLATTEN matched-pair 1.0000 [1.0000, 1.0000] floor 0.98   · all-pairs 1.0000 [1.0000, 1.0000] floor 0.98   · 32/0/0
blind pairs      ordered 4 of 6, mean gap +0.3833, no ties        <- the commit-3 ratchet failure is repaid, and passed
calibration      tests 21, pass 21, fail 0 (band monotonicity intact; NOT ONE of the 20 samples moves)
metamorphic      7/8 raw, hard passes 7, witnesses 1 — stapled_shorts PASSES at -2.0 and is PROMOTED to `hard`
identity         45 compared, health moved 25, RMS 9.580, mean +2.944, largest +32.2, verdict flips 6, grade flips 5
identity (this commit alone, vs commit 3): health moved 11 of 45, RMS 4.738, mean -1.236, verdict flips 4
```

### 8.2 The candidate comparison

Every candidate was evaluated on the same block. The four rightmost columns
are the acceptance criteria the brief set. Rows measured offline are exact:
the residual `health − (100 − densityPenalty − scarcityPenalty)` is
|resid| ≤ 0.05 on all 116 public-corpus and calibration rows, i.e. no
deduction fires at 9-14 scenes; the two rows marked ✓harness were re-run
through `npm run benchmark:public` end to end and agree.

| candidate | DROP paired | DROP all-pairs | DROP mean gap | CLIMAX paired | CLIMAX ties | blind | calibration | control | staple |
|---|---|---|---|---|---|---|---|---|---|
| `main @ 9b199b72` | 0.5313 | 0.5586 | −1.93 | 0.4219 | 11/32 | 1/6 | MONO, gap 25.32 | 1.0000 | +8.2 FAIL |
| commit 3 (clue guard) ✓harness | 0.5781 | 0.6196 | +1.18 | 0.5156 | 17/32 | 0/6 | MONO, gap 25.32 | 1.0000 | +7.0 FAIL |
| **(a) R5 verbatim** `8·(wi/(n·30)^0.7)²` | **0.0938** | 0.1250 | −15.77 | 0.4844 | 1/32 | 3/6 | MONO, gap 11.16 | 0.9375 | +19.5 FAIL |
| (a′) scene denominator, main's curve | **0.0938** | 0.1045 | −28.25 | 0.5000 | 2/32 | 3/6 | MONO, gap 21.32 | 0.8906 | +25.9 FAIL |
| (b) credit cap alone (`cap=15`) | 0.9219 | 0.8779 | +2.86 | 0.5156 | 17/32 | 0/6 | MONO, gap 25.32 | 1.0000 | +7.0 FAIL |
| (c) steepness 2 alone | 0.8750 | 0.8306 | +2.10 | 0.5625 | 0/32 | 4/6 | MONO, gap 25.32 | 1.0000 | +6.4 FAIL |
| (d) saturation alone (`sat=15`) | 0.5781 | 0.6196 | +1.18 | 0.5156 | 17/32 | 0/6 | MONO, gap 25.32 | 1.0000 | −1.3 PASS |
| (b)+(c)+(d) | 0.8750 | 0.8564 | +2.59 | 0.5625 | 2/32 | 4/6 | MONO, gap 25.32 | 1.0000 | −1.9 PASS |
| **CHOSEN: (c)+(d)** ✓harness | **0.8750** | 0.8306 | +2.10 | **0.5469** | **1/32** | **4/6** | MONO, gap 25.32 | 1.0000 | **−2.0 PASS** |

**Why (a) inverts, understood before anything was chosen.** R5 replaces the
denominator `wordCount^0.7` with `(sceneCount·30)^0.7`. Under the shuffle-drop
recipe the scene count falls to 2/3, so that denominator shrinks by
`(2/3)^0.7 = 0.752`, while the weighted issues fall to a measured **0.5460** of
intact. Density therefore lands at `0.546/0.752 = 0.73` of intact and the
penalty falls further than the +5.693 the scarcity term rises. R5 normalises by
the quantity the degradation attacks, so the numerator always wins. Its
unbounded `8·density²` amplifies that; `(a′)` shows the inversion survives
swapping the curve back, so the denominator is the defect, not the curve.

**Why (b) was measured well and rejected anyway.** The credit cap
(`credit ≤ 10·min(1, sceneCount/15)`) is the best row in the table on the
secondary statistic and it costs nothing on the primary one. It was still
rejected, because it introduces a **new saturation exactly where this branch
is removing one**: at 7 scenes it floors the density penalty at
`10 − 10·(7/15) = 5.33`, and five of the six synthetic discrimination pairs'
good halves land pinned at health **74.7** as a result:

```
                                  k=2, no cap        k=2 + cap=15
subtext-vs-on-the-nose            75.5 - 73.1        74.7 - 73.1
active-vs-passive-protagonist     74.9 - 73.5        74.7 - 73.5
escalation-vs-flat-repetition     74.9 - 72.4        74.7 - 72.4
setup-payoff-vs-orphaned-setups   74.8 - 74.2        74.7 - 74.2
dramatized-vs-told-exposition     75.1 - 75.3        74.7 - 74.7
```

Trading the 76.0 pin for a 74.7 pin to buy 0.026 of a secondary statistic is
not a trade worth making in a branch whose whole diagnosis is that saturation
is the defect.

**Why steepness 2 and not a value that measures better.** The brief's stated
constraint is that the sub-1 curve's derivative must not exceed the scarcity
slope. Stated per script as `Δscarcity / |Δdensity|` under the drop recipe,
and measured over all 32 scripts on the commit-3 tree, the eight tightest are:

```
the-deposit-excellent    Δscarcity 6.000  |Δdensity| 0.5257  ratio 11.41   <- BINDING
low-tide-excellent       Δscarcity 6.000  |Δdensity| 0.4747  ratio 12.64
signal-drift-bad         Δscarcity 6.000  |Δdensity| 0.4686  ratio 12.80
night-shift-bad          Δscarcity 6.000  |Δdensity| 0.4645  ratio 12.92
fence-line-bad           Δscarcity 6.000  |Δdensity| 0.4562  ratio 13.15
signal-drift-excellent   Δscarcity 6.000  |Δdensity| 0.4410  ratio 13.61
the-deposit-bad          Δscarcity 6.000  |Δdensity| 0.4214  ratio 14.24
quiet-season             Δscarcity 6.000  |Δdensity| 0.3905  ratio 15.36
```

**The constraint is very nearly infeasible, and that is a finding.** Any curve
that must rise `SUB_DENSITY_SCALE = 10` points across a unit of density has
MEAN slope 10, so its maximum is at least 10 — against a binding ratio of
11.41 there is almost no room. Measured maximum slope by steepness:

```
k -> 0 (a straight line)  10.000  satisfies
k = 2                     10.823  satisfies      <- CHOSEN
k = 2.6335                11.410  satisfies (the exact boundary)
k = 3                     11.815  VIOLATES
k = 4                     13.140  VIOLATES
k = 8                     20.760  VIOLATES
k = 50 (main)            125.000  VIOLATES by 11x
```

k = 4, 5 and 8 all measure marginally better on shuffle-drop
(paired 0.9063 at k = 4 with the cap) and every one of them violates the
constraint, so none was taken. k = 2 is the largest integer that satisfies it,
with the 5% headroom left rather than spent — and it is also the value at which
`CLIMAX_RELOCATE`'s exact ties reach **zero** offline, i.e. the corpus is fully
un-pinned.

**Why saturation at 15 scenes.** `SCARCITY_SCALE / sceneCount` decays to zero,
so length alone buys health without bound; §2 measures the whole of the staple
gap as that term. Scarcity is a DEFICIENCY penalty — "there is not enough
script here to judge" — so it must stop paying once there is enough. 15 is not
a fitted number: it is `ARC_DED_MIN_SCENES` and `CLIMAX_DED_MIN_SCENES`
(`doctor.ts`, both 15), the scene count at which the doctor's own structural
deductions begin to read a script's shape at all. Below it, scene count is the
only proxy the engine has for "is there enough here"; at and above it the
engine reads structure directly. Sensitivity, measured:

```
sat=10  staple -4.3 PASS   sat=15  staple -1.9 PASS   sat=20  staple +0.4 FAIL
sat=12  staple -4.2 PASS   sat=16  staple -1.3 PASS   sat=24  staple +1.6 FAIL
sat=14  staple -2.6 PASS   sat=18  staple -0.3 PASS   none    staple +6.4 FAIL
```

The witness admits anything up to 18; 15 was chosen for the anchor, not for
the margin, and the margin it happens to give is 1.9 points.

**What saturation provably does NOT touch.** For any script of 15 scenes or
fewer the term is byte-identical to before. The entire 32-script public
benchmark (9-14 scenes intact, 6-10 degraded) and the entire 20-sample
calibration corpus (9-10 scenes) are untouched by that line — confirmed by the
`sat=15 alone` row above, which moves nothing except the staple. Its only
in-repo evidence is the staple witness and the four `synthetic/*-scenes`
fixtures, which lose 6.5-7.6 points each. **On the private corpus, whose median
is 118 scenes, it will move every script by roughly 8 points and that is the
single largest thing the owner's run has to check.**

### 8.3 The floor re-lock — the reviewable artifact

`npm run benchmark:public -- --lock`, printed verbatim:

```
locked tests/fixtures/public-benchmark-split.json
locked tests/fixtures/public-corpus-manifest.json
locked scripts/lib/auc.ts — six floor constants:
  PUBLIC_SHUFFLE_DROP_PAIRED_FLOOR        0.5113 ->   0.855   (measured 0.8750, PRIMARY)
  PUBLIC_SHUFFLE_DROP_FLOOR               0.5386 ->  0.8106   (measured 0.8306)
  PUBLIC_ORDER_PAIRED_FLOOR               0.4019 ->  0.5269   (measured 0.5469, PRIMARY)
  PUBLIC_ORDER_FLOOR                      0.4473 ->  0.4951   (measured 0.5151)
  PUBLIC_DIALOGUE_FLATTEN_PAIRED_FLOOR      0.98 ->    0.98   (measured 1.0000, PRIMARY, unchanged)
  PUBLIC_DIALOGUE_FLATTEN_FLOOR           0.9273 ->    0.98   (measured 1.0000)
```

Every floor moves UP. `tests/fixtures/public-corpus-manifest.json` moves on
33 of its 66 lines (every script's health, no script's scene count). The
2026-09-06 measurement document is NOT rewritten — its §§0-10 stay as the
record of what `main` did — and a §11 addendum carries the new table, because
`tests/core/public-benchmark.test.ts` asserts that document quotes every floor
and every measured AUC the code currently produces.

### 8.4 What this cost, in full

Four assertions moved. None was widened to fit a number.

1. **`tests/core/public-benchmark.test.ts`, the pinning guard** — asserted
   "11 exact ties, from 10 scripts pinned at health 76.0". Its own failure
   message said what to do: "If the density cap stopped pinning scripts, that
   is a real scoring change." Measured now: **1 tie, 0 scripts at 76.0.** The
   assertion is INVERTED (`tied ≤ 3`, `pinned ≤ 2`) rather than deleted, so a
   change that reintroduces the saturation fails here.
2. **`tests/core/script-doctor.test.ts`, the formula spot-check** — three
   values re-run against `computeHealthScore`, each with the mechanism
   restated (`86 → 82.7`, `94.4 → 90.7`, `65 → 57.7`), plus a NEW assertion
   that a 200-scene clean script scores no better than a 15-scene one while an
   8-scene one still scores worse.
3. **`tests/core/discrimination.test.ts`, two of six synthetic craft pairs** —
   `dramatized-vs-told-exposition` inverts (−0.2) and
   `composite-reviewer-scenario`'s margin is +1.4 against a 5.0 floor. **Both
   arrive with commit 3's clue guard, not with this commit** (−1.4 and +0.1
   there; this commit recovers both partially). `COMPOSITE_MIN_GAP` stays at
   **5.0** — a floor moved down to meet a number is not a floor — and both are
   returned to `todo` with the measurement and the attribution in the reason
   string. The mechanism, recorded because it is uncomfortable: both pairs were
   ordered partly by `ORPHAN_CLUE` firing on CHARACTER NAMES, with the weaker
   half paying more of that penalty. That is the AUC-0.076 weighted-rule
   channel turning out to be what ordered a craft pair.
4. **`tests/core/rebuild-experiment.test.ts`, the scene-count invariance of
   the rule channel** — tolerance widened from 1e-6 to one display step (0.1),
   and the claim is unchanged. The adjustment is
   `health(0 issues) − health(real issues)` at the same scene and word count,
   so scarcity cancels exactly; what the 1e-6 assertion silently relied on is
   that `computeHealthScore` rounds to one decimal and the two roundings only
   cancel when the two scarcity terms share a fractional part. They used to by
   luck (140/12 and 140/120 are both x.6667); with saturation 140/120 is
   140/15 = 9.3333. It was asserting a coincidence about two fractions.

**The one thing this branch does NOT claim.** Every number above is on 32
short distributable scripts and 45 in-repo fixtures. The feature-scale
deductions (`ARC_DED_MIN_SCENES` / `CLIMAX_DED_MIN_SCENES`, both 15) never
fire on the public corpus, so it measures a strictly smaller engine, and
`AUC-24` on the private 761-script corpus is untouched and unmeasured. The
scarcity saturation in particular will move every feature-length script by
roughly 8 points, and nothing in this repository can tell you whether AUC-24
stays above its 0.622 floor. That is the owner's run.


## 7. `meanAbsDialogueShareDelta`, normalised — a null result, measured

**What was built.** `meanAbsDialogueShareDeltaNormalised`, a new channel on
`StructuralSignalsReport`: the existing raw channel divided by the standard
deviation of the same per-scene dialogue shares, clamped to [0, 2]. Registered
in `STRUCTURAL_SIGNAL_SPECS` with the SAME direction (`higher`) as its raw
parent, deliberately — it is that hypothesis with a confound divided out, not
a new one, and registering a fresh prior for it would be direction-fishing.

**The normalisation, stated.** `mean|share_n − share_{n−1}| / sd(share)` is a
scale-free roughness index. Anything that acts on the SCALE of scene-to-scene
share variation cancels exactly in a ratio of a mean absolute difference to a
standard deviation — and a bigger cast splitting each scene's dialogue more
evenly is precisely such a thing. That is the mechanism by which the confound
`STRUCTURAL_SIGNALS_2026-09-04.md` §4 attack 1 named should disappear, and it
is asserted directly on the arithmetic as well as measured on the corpus
(`server/nvm/analyze/structural-signals.test.ts`, "invariant to a uniform
rescaling of the share sequence, and the raw one is not").

**The confound shrinks, as predicted:**

| set | Spearman(raw, `meanSpeakersPerScene`) | Spearman(normalised, same) |
|---|---|---|
| 32 public-corpus scripts | **−0.695** | **−0.015** |
| 12 blind-pair fixtures | **−0.643** | **−0.176** |

and the separation the raw channel had is kept: **5 of 6** blind pairs ordered
on the signal alone, on both the raw and the normalised version. The
normalised channel's range on this corpus is 0.8682–1.7848, comfortably inside
the clamp.

**It is order-SENSITIVE, which is the whole reason it was the candidate.**
`STRUCTURAL_SIGNALS_2026-09-04.md` §6 nominated two channels;
`actionSentenceCvOverall` is computed over a document-wide multiset and a scene
permutation leaves it bit-identical, so it cannot move a scene-count-preserving
statistic by construction. This one can, and does: under `CLIMAX_RELOCATE` it
moves on **32 of 32** scripts, mean |delta| 0.1427.

**AND IT IS A NULL. It moves at random.** Under `CLIMAX_RELOCATE` it moves UP
on 16 scripts and DOWN on 16; the intact script is the higher of the pair on
**exactly 16 of 32**, which is 0.5 by count. Wiring it in its registered
direction cannot raise that channel.

That was then measured rather than left as arithmetic. A bounded ramp of the
shape the structural block already uses (cap 6 — the same order as
`GLOBAL_ARC_DEDUCTION` — deducting below a roughness of 1.0), applied to every
script's real `runScriptDoctor` health over the real corpus and the real
degradations:

```
SHUFFLE_DROP       unwired 0.8750 (28/4/0)  ->  wired 0.8750 (28/4/0)
CLIMAX_RELOCATE    unwired 0.5469 (17/14/1)  ->  wired 0.5156 (16/15/1)
DIALOGUE_FLATTEN   unwired 1.0000 (32/0/0)  ->  wired 1.0000 (32/0/0)
```

**Wiring it does not raise the order-sensitive statistic — it LOWERS it**,
0.5469 → 0.5156, by flipping one pair. So the channel ships **exposed and not
wired**, per the brief's own instruction, and the fact that no score reads it
is asserted rather than trusted
(`structural-signals.test.ts`, "NOT WIRED: no score reads the normalised
channel" greps `doctor.ts`, so a later change that wires it fails here and
owes this measurement re-run).

**What that null does and does not say.** It says this signal does not help
the doctor tell an intact script from one with its climax moved to the front,
on 32 short distributable scripts. It does NOT say the signal is worthless:
its blind-pair ordering (5 of 6 on the signal alone, on six pairs) is the
craft question, and it is untouched by this result. What the confound
measurement adds is that whatever that 5 of 6 is, it is no longer mostly cast
size — which is the honest reason to keep the channel on the report rather
than delete it.

**Cost:** zero. All six benchmark AUCs, the blind pairs, the calibration bands,
the metamorphic suite and every one of the 45 in-repo fixtures' health values
are byte-identical to commit 4; the 45 reports differ only by gaining the new
field.


## 9. Commit 6 — the paragraph may not contradict the five numbers beside it

This one changes STRINGS, not numbers, and §9.2's identity receipt is what
proves it.

**The defect (product-discovery item 8), reproduced on `main @ 9b199b72` and
again on this branch before the fix:**

```
=== inert 2-scene script ===
health 30 (troubled)  verdict PASS  scenes 2
dimensions: Structure & Pacing 100 | Character 100 | Dialogue & Voice 100 | Plot Logic & Payoff 100 | Theme & Originality 100
plainSummary: PASS — scored in the bottom band, below the decline line; overall score 30/100. … Structure &
              Pacing is the highest-scoring diagnostic dimension, with nothing flagged. No diagnostic
              dimension had an issue flagged.
strengths (5): "Nothing to fix in Structure & Pacing — clean across all 2 scene(s)."  (…and four more)

=== assembled feature (stapled 12) ===
health 80  dimensions: Structure 95 | Character 82 | Dialogue 99 | Plot 84 | Theme 100
plainSummary: … Character is the lowest-scoring diagnostic dimension, at 82/100 …      <- 82 is ABOVE 80
```

**One omission causes both.** `computeDimensionScore` is scarcity-free by
construction (Wave 18-β: it calls `densityPenalty` ALONE, deliberately), while
`health` carries `scarcityPenalty` on top. The dimensions and the overall are
therefore two different statistics, and whenever the scene-count term is large
the dimensions sit above the overall. At that point calling the smallest of
them "the lowest-scoring dimension" points the writer at the wrong thing, and
printing them without naming the term is the paragraph withholding the finding.

**Fixed at the source, because nothing downstream can fix it.**
`plainSummary` is synthesised inside `aggregateReport` and all four consumers
interpolate it opaquely. `strengths` is different in kind — it is a list a
renderer chooses to show — so the two are treated separately, per the exports
reviewer's item 6.

**What the paragraph does now:**

```
inert 2-scene:  … Every diagnostic dimension scores at or above the overall (lowest: Structure & Pacing
                at 100/100), because the dimensions read issue density alone while the overall also
                carries the scene-count term — at 2 scene(s) that term alone removes 70 point(s).
                The gap is the length of the draft, not the dimensions.
                strengths: []
stapled 12:     … (same sentence) … at 139 scene(s) that term alone removes 9 point(s). …
mise (77.4):    … Structure & Pacing is the lowest-scoring diagnostic dimension, at 76/100 — most of the
                trouble is around revelation drought.        <- UNCHANGED; 76 is below 77
```

The disclosure fires only when the displayed lowest dimension is at least
`SCENE_TERM_DISCLOSURE_MIN_POINTS` (1) above the displayed overall — compared
as DISPLAYED, because a contradiction that exists only at three decimals is
not one a reader can see. The scene-count figure is read from
`scarcityPenalty` itself rather than re-derived, so a second copy of
`140 / min(n, 15)` cannot drift into the prose.

**The strengths rule is narrow on purpose.** A DIMENSION may not be called a
strength under a bottom-band verdict. The other guards read structural facts
(escalating tension, clock continuity, turn distribution), and a bottom-band
draft that measurably escalates has still earned that sentence — deleting it
would be a different dishonesty. Asserted in both directions
(`tests/core/summary-honesty.test.ts`, "a bottom-band report keeps a
structural strength it genuinely earned").

**Fail-first, run rather than asserted.** With both guards reverted to their
pre-change constants and nothing else touched, **6 of the new file's 9 tests
fail**; restored, 0 do.

### 9.1 What the exports lane must satisfy once this lands

The scoring path now guarantees exactly one thing about `report.strengths`,
and it is asserted (`summary-honesty.test.ts`, "the guarantee the exports
'What's Working' block relies on"):

> No strength names a diagnostic dimension unless that dimension's own
> `issueCount` is 0 **and** the verdict is not bottom-band.

So the exports-side "What's Working" block, eleven lines below the summary in
the coverage HTML, may render `report.strengths` verbatim and cannot list a
strength the same report's dimension scores contradict. Three things it must
NOT do, because the guarantee does not extend to them:

1. **Do not synthesise strengths from the dimension scores.** A renderer that
   derives "Dialogue & Voice is clean" from `score === 100` reintroduces the
   exact defect, because a 100 there means "nothing was flagged in two
   scenes", not "this is clean".
2. **Do not render the block at all when `strengths` is empty.** A
   bottom-band report legitimately has none, and an empty "What's Working"
   heading reads as an omission rather than as a finding.
3. **Do not re-order or re-title the bullets against a dimension.** The
   bullets no longer map onto dimensions one-to-one — most of them are
   structural facts — so grouping them under dimension headings would assert
   a correspondence the data does not carry.

### 9.2 The identity receipt

Run over all 45 in-repo fixtures against the previous commit's snapshot, with
exactly the keys this commit is allowed to move ignored — the shape the P3
lane's receipt used for `provenance.engineCommit`:

```
node scripts/check-doctor-output-identity.mjs --compare <before> <after> \
  --ignore-keys plainSummary,strengths,provenance.engineCommit

Ignored keys (excluded from the identity check, over 45 compared reports):
  "plainSummary": differs in 21/45 reports
  "strengths": differs in 0/45 reports
  "provenance.engineCommit": differs in 45/45 reports

OUTPUT IDENTITY: PASS — all 45 reports are byte-identical modulo the ignored
key(s) [plainSummary, strengths, provenance.engineCommit] (analyzedAt excluded).
```

Every other byte of every report is unchanged: **no health value, no verdict,
no grade, no dimension score, no finding and no id moves.** `strengths`
differs on **0 of 45** because no tracked fixture is bottom-band with a
zero-issue dimension — the shape that guard exists for is the inert two-scene
script, which is a test fixture rather than a tracked one, and it is asserted
there directly. `provenance.engineCommit` is a per-commit stamp and differs by
construction.

Benchmark, blind pairs, calibration and metamorphic are all byte-identical to
commit 5: `SHUFFLE_DROP` 0.8750/0.8306, `CLIMAX_RELOCATE` 0.5469/0.5151,
control 1.0000/1.0000, blind 4 of 6 at +0.3833, calibration 21/21, metamorphic
7 hard passes with `stapled_shorts` at −2.0.

### 9.3 A correction to commit 4, found by this commit's test run

Commit 4's re-anchoring of `tests/core/script-doctor.test.ts` was measured
against a variant that commit did not ship. Two of the three spot-check values
were taken while the scene-count CREDIT CAP was still in the tree; the cap was
then measured, rejected (§8.2) and removed, and that file was not re-run
before the commit landed. The shipped formula's values are:

| case | committed in commit 4 | actual, corrected here | why |
|---|---|---|---|
| `{1,2,3}` at 10 scenes / 300 words | 82.7 | **84.6** | no credit cap: density 0.1889 is charged by the near-linear curve alone |
| `{0,0,0}` at 25 scenes / 2000 words | 90.7 | 90.7 (unchanged) | the saturated scarcity term, correctly measured |
| `{0,0,0}` at 4 scenes / 80 words | 57.7 | **65** | no credit cap, and density 0 — this case is identical to `main`, which is itself worth pinning: the branch moved the middle of the curve, not its origin |

Recorded rather than quietly amended, because "which commit was wrong" is the
part a reviewer cannot re-derive. It is also the reason the lane standard puts
one full `npm test` on the FINAL tree: this is exactly what that run is for,
and it is what found it.


## 10. What the one full `npm test` found, and the two assertions it moved

The lane standard puts a single full `npm test` on the FINAL rebased tree
rather than after every commit. That run is not ceremony: it found three
things the per-file runs could not, one of which was a genuine error in an
earlier commit of this branch (§9.3). The other two are downstream movements
of this branch, both re-anchored with their measurement and their
attribution, neither widened.

**First run:** 13,057 tests, **4 failing**. **Final run:** 13,058 tests,
**0 failing**, 91 skipped, 4 todo.

### 10.1 `tests/core/agency-signal.test.ts` — three cells of the locked table

Three of the twenty rows moved, all in one direction:

```
code-blue.fountain          d2Disagreement  false -> true
the-defense-rests.fountain  d2Disagreement  false -> true
the-detour.fountain         d1Disagreement  false -> true
```

Nothing else in the table changed — every protagonist, scene count, peak
scene set, `anyAgencyAtPeak`, `allSpectatorAtPeak` and act-3 count is
identical, and the whole table was re-run rather than the three rows patched,
per that table's own instruction.

**The mechanism, and it is why this is a reading rather than drift.**
`legacyIsPassive` (`agency-signal.ts`) reproduces `structure.ts`'s
`PROTAGONIST_PASSIVITY_CLIMAX` predicate exactly, and one of its three terms
is `record.seededClueIds.length === 0`. Commit 3's proper-noun guard removes
name-seeds, so scenes that used to carry a character-name "clue" now carry
none, and the legacy predicate calls them passive. The agency-aware read then
DISAGREES with it on three more scripts. **That is what these two statistics
are for** — they are bounded comparison stats, not rules and not deductions,
and both are UNWIRED, so no score moves with them. The rise says the legacy
predicate was partly propped up by clue-seeds that were character names.

The corpus-level selectivity counts moved with the rows and are re-anchored
exactly rather than loosened to bounds: `d1Disagreement` 1/20 → **2/20**,
`d2Disagreement` 3/20 → **5/20**.

### 10.2 `tests/core/feature-scale-discrimination.test.ts` — a threshold, not a signal

The dialogue-flatten test asserts three things. Two still pass and one does
not:

```
intact              health 81.4  CONSIDER  strong   21 scenes
dialogue-flattened  health 60.5  CONSIDER  solid    21 scenes
act-swapped         health 71.2  CONSIDER  solid    21 scenes

delta 20.9  >= the 20.0 gate            PASSES  (the substantive assertion)
grade strong -> solid                   PASSES  (added here, see below)
verdict CONSIDER -> CONSIDER            FAILS
```

The deduction is doing its job at full strength — 20.9 points of the ~28.7
this fixture was built around — and the flattened draft simply lands **0.5
points above the PASS line** (health < 60) instead of below it, because this
branch's density recalibration lifts short-and-mid-length scripts generally.

Handled by keeping a real tier check rather than deleting one: the GRADE tier
still separates (`strong` → `solid`) and is now asserted, and the verdict-tier
assertion is split out into its own `todo` carrying the numbers. The PASS line
was NOT moved and the 20.0 delta gate was NOT weakened. What closes that todo
is the fixture scoring below 60 on its own merits.

### 10.3 The final gate table

| gate | command | exit |
|---|---|---|
| lint | `npm run lint` | 0 |
| no-console | `npm run check-no-console` | 0 |
| server reachability | `npm run check-server-reachability` | 0 |
| docs quality | `npm run check-docs` | 0 |
| honesty audit | `npm run honesty-audit` | 0 |
| brain graph | `npm run check-brain` | 0 |
| build | `npm run build` | 0 |
| metamorphic | `npm run test:metamorphic` | 0 (7 hard passes, 1 witness) |
| unverified-gates report | `npm run gates` | 0 |
| public benchmark | `npm run benchmark:public` | 0 |
| **full suite** | `npm test` | **0** — 13,058 tests, 0 failing, 91 skipped, 4 todo |
| **receipt gate** | `node scripts/check-scoring-receipt.mjs main..HEAD` | **1**, naming the PENDING entry — the intended state on a scoring branch |

The receipt gate's exact refusal, which is the one this branch wants:

```
PENDING ENTRY (### 2026-09-07 — FEATURE-LENGTH DEFECTS: …) — this receipt
records that no measurement happened (the entry heading contains "PENDING").
A pending entry is a promise to measure, not a receipt of a measurement…
```
