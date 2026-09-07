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
| 2 | voice: per-character abstention | 0.5313 | 0.4219 | 1.0000 | 1/6, −0.0167 | 21/21 pass | KNOWN FAIL +5.4 | KNOWN FAIL +8.2 | 0 of 45 (45 byte-differ) | 0 of 45 |
| 3 | `ORPHAN_CLUE` proper-noun/title guard | **0.5781** | **0.5156** | 1.0000 | **0/6**, −0.0667 | 21/21 pass | KNOWN FAIL +5.3 | KNOWN FAIL +7.0 | 18 of 45, RMS 10.652 | 2 of 45 |

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
