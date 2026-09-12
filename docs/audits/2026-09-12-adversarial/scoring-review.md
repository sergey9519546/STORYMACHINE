# Independent review — `scoring/adversarial-2026-09-12` round 1 (**85273742**)

**Reviewer:** independent scoring-path reviewer (did not build the change).
**Object:** `scoring/adversarial-2026-09-12` @ `85273742`, worktree
`/home/user/wt-scoring`. 28 commits over `git merge-base 85273742 main` =
`8aa1f696`; the lane's own **10** commits are `ccab6853..85273742`, stacked on
`78ec4464` (`scoring/feature-length-defects` rebased onto main). `origin/scoring/adversarial-2026-09-12`
is at the reviewed SHA; all 10 commits carry both required trailers (10 of 10).
**Lane report:** `docs/audits/2026-09-12-adversarial/scoring-lane-report.md` (467 lines, read in full).
**Method:** `git archive` exports of `8aa1f696` (main), `78ec4464` (lane base)
and `85273742` (tip) into `<session scratch>` with `node_modules` symlinked,
plus two patched probe trees built from the tip export (one with the
denominator change alone reverted, one with `compiled.fountain` set to the
expression the branch documents). `/home/user/STORYMACHINE` and
`/home/user/wt-scoring` were never modified except for this file; nothing was
committed, pushed, merged or checked out; `--lock` was never run; no full
`npm test`; no private corpus exists on this machine and none was sought.

This is scoring-path work, so the verdict is READY-FOR-OWNER or REVISE, never
MERGE. It is **REVISE**, for one item.

---

## 1. What reproduced

Every headline number in the lane report that I attempted, reproduced. Each
with its command and exit code.

### 1.1 The public benchmark (§1, §7)

```
cd /home/user/wt-scoring && npm run benchmark:public          EXIT=0   (10.19 s)
  SHUFFLE_DROP      matched-pair 0.8438 [0.7188, 0.9688] floor 0.8238
                    all-pairs    0.7896 [0.6738, 0.8975] floor 0.7696   27/5/0
  CLIMAX_RELOCATE   matched-pair 0.5938 [0.4219, 0.7500] floor 0.5738
                    all-pairs    0.5234 [0.4678, 0.5874] floor 0.5034   18/12/2
  DIALOGUE_FLATTEN  matched-pair 1.0000 [1.0000, 1.0000] floor 0.98
                    all-pairs    0.9814 [0.9531, 1.0000] floor 0.9614   32/0/0
```

Identical to the lane's table. All six floors are exactly `measured − 0.02`;
I checked each by hand. `AUC24_FLOOR` is untouched at 0.622.

### 1.2 The floor isolation — **the isolation HOLDS**

This is the item the lane itself said to push hardest on, and it survives.

I rebuilt the tip export with the denominator change **alone** reverted
(`wordCount = truncatedForAnalysis ? analyzedWordCount : fastWordCount(fountain)`,
every other change of the branch left in place) and re-ran the benchmark:

```
cd <session scratch>/nodenom && npm run benchmark:public     EXIT=0
  SHUFFLE_DROP  matched-pair 0.8750 [0.7500, 0.9688]   all-pairs 0.8232 [0.7114, 0.9253]   28/4/0
  DIALOGUE_FLATTEN all-pairs 1.0000
```

`0.8750 / 0.8232`, sign counts `28/4/0` — exactly the figures
`PUBLIC_BENCHMARK_2026-09-06.md` §14.3 and the `auc.ts` header state for that
cell. The denominator change is the whole of the shuffle-drop movement, and it
is also the whole of the control's all-pairs movement (1.0000 → 0.9814), which
§14.3's table does not cover but the header's attribution implies.

**The denominator claim verified by hand**, counting the words the old path
counted versus the new, on two fixtures (`<session scratch>/hand.mjs`,
whitespace-token count, which is `fastWordCount`'s definition):

| fixture | raw submission (old denominator) | minus its boneyard (new) | boneyard words |
|---|---|---|---|
| `room-12.fountain` | **427** | **338** | 89 |
| `transfer-window.fountain` | **454** | **379** | 75 |
| `dead-frequency.fountain` | 1830 | 1806 | 24 |

427 → 338 and 454 → 379 are the lane's own numbers to the word, and 89/427 is
20.8% — "a fifth of the denominator on the two shortest" is accurate. Across
all 32 fixtures: **32 of 32 carry exactly one boneyard, 24 to 151 words**
(`<session scratch>/hand2.mjs`), which is the stated range to the word.

I also checked the new denominator does not quietly *drop* printing content:
`PRINTING_BLOCK_TYPES` is exactly `FountainBlockType` minus `section`,
`synopsis`, `note`, `boneyard`, `empty` — no printing type is omitted — and
`fastWordCount(s.slug)` is not a double count, because `segmentScenes` slices
`start + 1` and the heading is not in `s.blocks`.

**Conclusion on §4.1:** the four downward floors are a measurement artifact
leaving, not an engine regression. The cause is named, isolated by rerun,
reproducible on an independent tree, and checkable in the corpus by hand. No
grounds to reject the denominator change.

Two floors moved UP on `ccab6853` (both ORDER floors) for the stronger
degradation, and I confirmed the supporting claim mechanically:
`git show --stat` on that commit touches `scripts/lib/auc.ts` and **not**
`tests/fixtures/public-corpus-manifest.json` or
`tests/fixtures/public-benchmark-split.json` — byte-identical, so the scorer
sat still while the instrument sharpened. The manifest moves only on
`ef683d4e` (the denominator), and the split never moves at all.

### 1.3 The live gradient (§3.2)

```
cd /home/user/wt-scoring && node --experimental-strip-types tests/core/density-gradient.test.ts
  # tests 5  # pass 5  # fail 0                                          EXIT=0
  corpus density range [0.6078, 1.8840]; gradient per +1 minor [0.027867, 0.456943]
  231 scenes, 17436 words, c/m/n 13/351/569, density 0.9268: +1 minor 0.004946, +48 critical 2.14784
  at feature length it takes ~11 minor findings to move the DISPLAYED health by one step
```

`+48 CRITICAL = 2.148` and `~11 findings` reproduce exactly.

**The test can fail.** Copied unchanged onto the `8aa1f696` export:

```
cd <session scratch>/base && node --experimental-strip-types tests/core/density-gradient.test.ts
  # tests 5  # pass 2  # fail 3                                          EXIT=1
  "9 of 32 scripts sit where one more weighted issue moves the score by less than 0.0001"
  "187 of 1001 sampled densities in [0.05, 3.00] are flat"
```

9 of 32 and 187 of 1001 are the lane's `main` figures to the unit.

**Monotone, not merely non-zero — checked independently of the test.** My own
sweep over `computeRawCraftScore` (`<session scratch>/mono.ts`), stepping the
minor count one at a time rather than sampling densities:

```
words=1000  scenes=10  minor 0..4000: increases=0 flatSteps(<1e-4)=0 minStep=3.324e-2
words=17436 scenes=231 minor 0..4000: increases=0 flatSteps(<1e-4)=0 minStep=4.487e-3
words=400   scenes=10  minor 0..2000: increases=0 flatSteps(<1e-4)=0 minStep=6.323e-2
```

Strictly decreasing everywhere at three shapes including the feature-length
one. The dead zone is gone on the raw craft score, and the branch's residual
(display rounding at feature length) is asserted as the separate thing it is.

### 1.4 Parse and format invariance (§3.1)

```
cd /home/user/wt-scoring && node --experimental-strip-types tests/core/parse-format-invariance.test.ts
  # tests 49  # pass 49  # fail 0                                        EXIT=0   (14.1 s)
cd <session scratch>/lanebase && (same file, copied unchanged)
  # tests 49  # pass 5   # fail 44                                       EXIT=1
```

**The lane's whole "before" column reproduces** on the `78ec4464` export
(`<session scratch>/before.mjs`, health-move count, all 32 scripts):

| transform | lane's base figure | mine |
|---|---|---|
| a standard Fountain title page | 29 / 32, [−0.5, +1.2] | **29 / 32, [−0.5, +1.2]** |
| curly apostrophes | 21 / 32, [−0.6, +1.6] | **21 / 32, [−0.6, +1.6]** |
| boneyard padded ×800 | 32 / 32, mean +7.206, up to +18.6, 4 verdict flips | **32 / 32, mean +7.206, range +3.4 to +18.6, 4 verdict flips** |

### 1.5 Permutation-ensemble invariants (§3.3)

```
cd /home/user/wt-scoring && node --experimental-strip-types tests/core/order-ensemble.test.ts
  # tests 5  # pass 5  # fail 0                                          EXIT=0
  21-scene:  intact 79.1; 20 perms [65.3, 81.5]; 5 higher, 0 tied; AUC 0.7500; reversed 66.7 (−12.4)
  231-scene: intact 74.4; 20 perms [54.7, 59.7]; 0 higher, 0 tied; AUC 1.0000; reversed 79.1 (+4.7)
  act-swapped 68.9 ranks 2 of 20 from the bottom
```

**The pin is a real two-sided assertion, not a `Number.isFinite`.**
`order-ensemble.test.ts:205-217` asserts both `delta <= FEATURE_REVERSAL_DELTA_CEILING`
(= 5.2, against a measured 4.7) **and** `delta > 0`, with the failure message
instructing the reader to replace the witness with the real invariant rather
than leave a ceiling passing for the wrong reason. If the sign defect were
fixed, this test goes red. The lane's claim is accurate.

The companion narrowing at `feature-scale-discrimination.test.ts:220` is an
honest one: the *assertion* is unchanged (`swapped.health < intact.health`);
only its message stops asserting a universal claim that 5 of 20 seeded
permutations falsify, with the general claim moved to the stronger ensemble
statistic. That is a correction, not a widened tolerance.

I found only one `Number.isFinite` added anywhere in the branch's test diff
(`density-gradient.test.ts`, a sanity guard sitting beside a real `one < 0.05`
assertion). No `.skip`, no `it.todo`, no `assert.ok(true)` added.

### 1.6 The receipt (§7)

```
cd /home/user/wt-scoring && node scripts/check-scoring-receipt.mjs 78ec4464..HEAD
  EXIT=1 — exactly ONE "PENDING ENTRY" reported, the 2026-09-12 one. No other problem.
cd /home/user/wt-scoring && node scripts/check-scoring-receipt.mjs 8aa1f696..HEAD
  EXIT=1 — TWO pending entries (the base branch's 2026-09-07 and this lane's 2026-09-12),
  8 scoring-path files listed.
```

Over the lane's own range it is exactly one, as reported. Over the full
merge-base range it is necessarily two, because the stack carries the base
branch's own pending receipt; that is what a stacked scoring branch looks
like, not a defect, but the owner should expect two.

**No AUC-24 value is stated, implied or projected anywhere on the branch.**
`git diff 8aa1f696..85273742` added lines mentioning AUC-24 are all either
`AUC24_FLOOR` untouched at 0.622, `**Measured AUC-24:** **PENDING**`, or prose
about what the run can and cannot settle. The one added line carrying `0.731`
is a pre-existing table row in `PUBLIC_BENCHMARK_2026-09-06.md` re-emitted
solely because a `doctor.ts:2092-2093 → 2544-2545` anchor inside it moved; the
diff shows the two lines identical but for the anchor.

### 1.7 Output identity (§4.3, §4.4)

Snapshots taken with `GIT_SHA=REVIEWPIN` pinned equal on both sides.

```
GIT_SHA=REVIEWPIN node scripts/check-doctor-output-identity.mjs --tree <scratch>/lanebase --out <scratch>/ident-lanebase
GIT_SHA=REVIEWPIN node scripts/check-doctor-output-identity.mjs --tree .                   --out <scratch>/ident-tip
  45 snapshots each, EXIT=0
```

Health deltas, lane base → tip (`<session scratch>/healthdiff.mjs`):

```
45 fixtures compared | health moved 25 | largest −12.3 on room-12 | verdict flips 2 | grade flips 1
```

**25 of 45** — the lane's disclosed count, and still the net over the whole
lane. Both verdict flips are the two it named:
`room-12` 63.9 → 51.6 (CONSIDER → PASS) and `transfer-window` 64.1 → 55.8
(CONSIDER → PASS). None of the 20 calibration samples moved, as claimed.

Against `main` (`8aa1f696`) the compare is `OUTPUT IDENTITY: FAIL — 45 fixture(s)
differ`, EXIT=1, which is expected: the whole stack changes scores, and commit 6
changes `topPriorities` and `dimensions.*.summary` on 45 of 45 by design.

Over the 32 benchmark scripts (`<session scratch>/delta32.mjs`), lane base → tip:

```
32 scripts: moved 32 | mean −1.453 | range −12.3 to −0.1 | verdict flips 2
```

`mean −1.453`, `range −0.1 to −12.3`, all 32 fall — §4.2 to three decimals.

### 1.8 Gates I re-ran

| gate | result |
|---|---|
| `npm run lint` | **EXIT=0** |
| `npm run check-no-console` | EXIT=0 — 304 files, 23 quarantine entries |
| `npm run check-docs` | EXIT=0 — clean |
| `npm run honesty-audit` | EXIT=0 — 458 files, 472 markdown files, 93 claims rows |
| `npm run check-brain` | EXIT=0 — 104 notes, 386 links, fresh |
| `npm run gates` | **EXIT=0**, 9.35 s; 1 of 1 verified row RAN; mutation check raised `PUBLIC_SHUFFLE_DROP_PAIRED_FLOOR` to 0.8938 and the suite **FAILED on that floor by name**, no passing twin |
| `npm run test:metamorphic` | EXIT=0 — 8 hard passes, 1 documented known-failing witness (`empty_verbosity`); `dialogue_reflow` now in the list and PASSES at Δ=0 |
| `tests/core/public-benchmark.test.ts` | 33 / 33, EXIT=0 |
| `tests/core/public-benchmark-limits.test.ts` | 7 / 7, EXIT=0 |
| `tests/core/calibration.test.ts` | 25 / 25, EXIT=0 |
| `tests/core/report-seam.test.ts` | 11 / 11, EXIT=0 |
| `tests/core/voice-pair-cap.test.ts` | 9 / 9, EXIT=0 |

Per the cost rule I did not re-run the full `npm test`; the lane reports
13,388 tests / 0 fail on the final tree.

### 1.9 The voice pair grid (§3.6), measured

A 223-speaker × 30-word document (`<session scratch>/cast.mjs`), end to end
through `runScriptDoctor`:

```
tip   223 speakers -> 169 ms,    voicePairs 780,    notVoiceScoredCharacters 183
main  223 speakers -> 30,082 ms, voicePairs 24,753, notVoiceScoredCharacters 0
```

780 = C(40,2) and 183 = 223 − 40, so the cap is real and the omission is named
rather than silent; `CoverageSummary.tsx` surfaces it in the panel copy. This
is a 178× improvement on a shape that currently exceeds the 30 s analysis
budget on `main`. `MAX_FOUNTAIN_VOICE_ELIGIBLE_WEIGHT` is untouched at
1,500,000, exactly as the lane says.

### 1.10 The shape-guard re-derivations

Both re-anchored bounds are justified, not widened. `guardVoiceWordCounts`'s
`g <= 40 → <= 80` follows arithmetically from the corrected parser rule
(3 wrapped lines × 5 words × 4 occurrences = 60, bound 80), and the
`accumulateDialogueWords` change makes the guard count **more**, which is the
safe direction for a DoS bound (`guardWords >= pipelineWords`). The A3
boneyard test is inverted to a strictly stronger assertion
(`characterBlocks <= 1`, plus "boneyard content must not reach the analyzer at
all") with its old title quoted. The `report-unverified-gates` change removes a
hardcoded second copy of a floor and asserts the real property — "exactly one
constant moved" — reading the neighbour from the file; it still fails if the
hook touches the neighbour.

### 1.11 Calibration corpus

`git diff --stat 8aa1f696..85273742 -- server/nvm/analyze/calibration/
data/screenplays/ tests/fixtures/blind-pairs/` is **empty**. The
controlled-richness confound is not re-introduced, because no corpus file is
touched at all. The four new assertions in `calibration.test.ts` pin the
confound two-sidedly and each failure message says to **re-derive as the
invariant**, never to relax. The 20 calibration samples are byte-identical in
the output-identity run. Correct handling of the CLAUDE.md gotcha.

---

## 2. My own transform, which the lane did not think of

The brief asks for one transform outside the lane's eleven, measured on the 32
public scripts. I wrote ten; four are cleanly invariant and four move the
score. The headline is **Fountain's forced-action marker `!`**.

`!` at the start of a line is the Fountain spec's explicit "this line is
action" marker. It is never printed, and the branch **already knows it exists**
— it is one of the four documented escapes from the new dialogue-block rule
(`src/lib/fountain.ts:168`, `:232`). But `parseFountain` uses it only to *type*
the line and leaves it in `b.text`, so the `!` glues to the first word of every
action line and reaches every rule lexicon and the word count.

Transform: prefix `!` to every line the repository's own parser types `action`.
No printed word changes; no block type changes (they were already action).

```
<session scratch>/bang32.mjs, all 32 public scripts, health/verdict/issues compared

  tip  (85273742): moved 32 of 32 | up 24, down 7 | mean +1.056 | largest +7.0 on room-12
                   | 1 verdict flip (transfer-window PASS -> CONSIDER)
  main (8aa1f696): moved 32 of 32 | up 21, down 1  | mean +1.422 | largest +9.8 on room-12
```

**The number the brief asked for: 32 of 32, largest +7.0.** Worst individual
cases at the tip: `room-12` 51.6 → 58.6, `transfer-window` 55.8 → 61.8
(verdict flip), `the-detour` 69.1 → 74.9; issue counts fall by up to 38
(`the-detour` 156 → 118).

This is a **free-score attack of the same class the boneyard one was** — a
never-printed spec marker, applied mechanically, worth up to 7 points and a
verdict promotion — and it is **pre-existing, not introduced by this lane**
(it is slightly smaller at the tip than on main). It is therefore not a
blocking item. It does mean the invariance claim carries its eleven transforms
and not the universal sentence at the head of
`PARSE_FORMAT_INVARIANCE_2026-09-12.md` §0.

The other nine, for the record:

| transform | moved (of the applicable scripts) | max Δhealth |
|---|---|---|
| FDX-style leading indentation on every speech line | **0 of 32** | 0.0 |
| trailing whitespace on every line | **0 of 32** | 0.0 |
| mixed CRLF/LF (alternating) | **0 of 32** | 0.0 |
| a forced page break `===` between every scene | **0 of 32** | 0.0 |
| an inline `[[note]]` mid-action-line | **0 of 32** | 0.0 |
| forced-action `!` on every action line | **32 of 32** | **7.0** |
| `(V.O.)` → `(V.O)` extension spelling | **9 of 9 applicable** | 1.3 |
| a dual-dialogue `^` on one adjacent cue pair | 29 of 32 | 4.1 |
| an inline mid-line `/* boneyard */` in an action paragraph | 20 of 32 | 1.2 |
| a `~lyric` marker on one dialogue line | 8 of 32 | 0.5 |

The first five are genuine wins for this branch — indentation and mixed line
endings are exactly what an FDX or PDF conversion emits, and they are now flat.
`(V.O.)` → `(V.O)` moves every one of the nine scripts that contain the
construct, which is the same punctuation-sensitivity family as the curly-quote
fix the lane closed. The dual-dialogue and lyric transforms change block types,
so a score move there is arguable rather than a defect; the mid-line boneyard
is the same gap as `!` (the marker is only recognised at a line start).

---

## VERDICT: **REVISE**

One blocking item. Everything else in the lane is measured, honest, and
reproduced exactly; the downward floor re-lock, which is the thing that could
have defeated this machinery, is defensible and I could not break it.

1. **`compiled.fountain` IS `normalizeScreenplay(fountain)` at the tip, and
   three places on the branch say it is not — including the comment directly
   above the line, and the "Every cost" and "what the owner's run settles"
   sections the owner reads to decide what to measure.**

   At `716ee817` (commit 2) the line read
   `fountain: joinWrappedDialogue(fountain)` and the comment above it was true.
   At `ef683d4e` (commit 3) it became
   `fountain: stripTitlePage(normalizeScreenplay(fountain))` and the comment
   did not follow. At `85273742`:

   * `server/nvm/analyze/doctor.ts:2982-2992` — *"The join is applied rather
     than the whole normalizer… `joinWrappedDialogue` is a no-op on every input
     whose speeches are already one line… The other half is recorded as
     measured-and-not-taken"* — sits directly above
     `fountain: stripTitlePage(normalizeScreenplay(fountain)),` at `:2992`.
   * `docs/scoring/PARSE_FORMAT_INVARIANCE_2026-09-12.md:63` — *"`compiled.fountain`
     is `joinWrappedDialogue(fountain)`."* — and §1.6, *"It is not taken here…
     it should be measured as its own change, not smuggled in with this one."*
   * The lane report §5, first bullet: *"Recorded as measured-and-not-taken."*

   It **was** taken. On a double-spaced import `normalizeScreenplay` runs the
   full reconstruction — joining hard-wrapped fragments, reflowing action
   paragraphs, collapsing the blank line between cue and speech — and the 14
   revision passes now receive that text. Demonstrated
   (`<session scratch>/ds.ts`): on a double-spaced, hard-wrapped document
   `stripTitlePage(normalizeScreenplay(raw)) !== joinWrappedDialogue(raw)`,
   the latter being a no-op on that shape.

   It is not cosmetic. End to end on a double-spaced re-emission of a committed
   CC0 screenplay (`dead-frequency.fountain` re-wrapped at 45 columns with a
   blank line between every line — the scraped-PDF shape; no word changed,
   `<session scratch>/dsreport.mjs`):

   ```
   tip  (compiled.fountain = stripTitlePage(normalizeScreenplay(f)))  health 81.4, 182 issues, c/m/n 2/32/148
   probe(compiled.fountain = joinWrappedDialogue(f), as documented)   health 82.3, 158 issues, c/m/n 2/28/128
   ```

   0.9 points and 24 issues, on exactly the document shape the private corpus
   is made of, from a change the branch says three times it did not make.

   It is also absent from every place built for it: it is not in §4 "Every
   cost"; it is not in §6 "What the owner's run can and cannot settle"; and the
   receipt's owner paragraphs cover commit 2 ("the expected AUC-24 movement
   from this commit is **zero**") and commit 3 (the denominator only) without
   mentioning it. The owner is being handed an enumeration of corpus-visible
   changes with the largest invisible one missing from it — which is the
   `LANE_STANDARD` §5 false-report condition, and it bears directly on the one
   decision the owner's run is for.

   **Either** revert `doctor.ts:2992` to `joinWrappedDialogue(fountain)` — the
   branch's own stated position, and the one that keeps the lane's blast radius
   measurable from this tree — **or** keep the stronger version and correct all
   three statements, add it to §4 as its own cost, add it to §6 beside item 8
   (it is the same class of finding: a change whose entire effect lands on the
   corpus's own document shape), and add a row to the receipt saying what the
   owner should compare. Whichever is chosen, the `ef683d4e` drift should be
   named in the revision so the two halves of the pipeline seam stop
   contradicting each other.

   For scope: the branch already discloses this class of thing well when it
   notices it — §4 item 8 on the strip order is a model of the disclosure this
   item is missing. This reads as drift between commits 2 and 3, not as
   concealment.

### Non-blocking

1. **Fountain's forced-action `!` is not stripped from block text**
   (§2 above): 32 of 32 scripts move, mean +1.056, largest +7.0, one verdict
   flip, in the score-improving direction. Pre-existing, so out of this lane's
   blast radius — but it is a live free-score attack of the same class the
   boneyard one was, the branch already names `!` as a parser escape, and the
   same family (`.` forced heading, `>` transition, `~` lyric, and `@` if it is
   ever implemented) will have the same shape. Worth its own lane. Until then,
   `PARSE_FORMAT_INVARIANCE_2026-09-12.md` §0's *"Identical writing must score
   identically however it reaches the analyzer"* should be scoped to the eleven
   transforms it evidences, since a spec-defined marker the file itself handles
   elsewhere still moves 32 of 32.
2. **`(V.O.)` → `(V.O)` moves 9 of 9 applicable scripts**, up to 1.3 points.
   Same punctuation-sensitivity family as the curly-quote fold. A candidate
   twelfth transform.
3. **`PARSE_FORMAT_INVARIANCE_2026-09-12.md` §1.5 is stale**: it reports "35 of
   37 assertions fail" on the base and "37 of 37 pass" here. The committed file
   has **49** tests; measured, **44 of 49 fail** on the `78ec4464` export and
   **49 of 49 pass** at the tip. The lane's own gate table already says 49/49,
   so this is an un-updated doc line, and the direction of the claim is
   unaffected — it is stronger than written.
4. **The §3.1 / §2 "before" counts and the "after" counts are different
   statistics.** The before-column counts health moves (29 of 32 title page, 21
   of 32 curly apostrophes — both of which I reproduce exactly); the
   after-column's `0 of 32` is over the six-field surface the test asserts. On
   the base, the title page moves *some* surface field on 32 of 32. One clause
   naming the field set would make the two columns comparable.
5. **The `auc.ts` header's "−0.0059" and §14.3's leave-one-out table are
   different decompositions** and read as though they were the same one. The
   header quotes the joint effect of all three parse fixes (0.8291 → 0.8232);
   §14.3 reverts each singly, giving the non-printing strip +0.0024 and the
   other two 0.0000. Both are true; the header would be clearer saying "jointly".
6. **`honesty-audit` reports 472 tracked markdown files** where §7 says 470.
   Drift since the lane's run, harmless.
7. **`MAX_FOUNTAIN_VOICE_ELIGIBLE_WEIGHT = 1,500,000` carries forward the base
   branch's known defect.** This lane is right not to edit it from a second
   cost model, and its analyzer cap makes the pathological shape cheap here
   (measured 169 ms vs 30,082 ms on `main`). But the bound itself is still
   un-re-derived, and the stack must not land before the sibling lane's
   correction is applied on the merged tree with the cap in place.

### What the owner's run settles and what it cannot

**Settles.** The one genuinely unknown quantity: how much of each of the 761
drafts is text Fountain never prints. The denominator correction is the only
change on this branch whose direction on AUC-24 nobody here can predict, and
the three cases the lane names are the right three (no non-printing text → no
movement; a title page on most drafts → a level shift that is largely
rank-preserving, with the 72-row manifest still needing a re-lock; substantial
boneyard or note text → movement of unknown sign). The concrete comparison to
make is `submittedWordCount` against `wordCount` per script, split by whether
`isDoubleSpaced` fires, before looking at any AUC — that tells the owner how
much text left the denominator and on which document shape, which is the thing
that makes a moved AUC-24 interpretable.

**Settles, and this is where blocking item 1 changes the question.** Two
changes on this branch reach the private corpus's own document shape and
nothing else in the repository, so both are invisible from here:

* the non-printing strip now running **before** the double-spaced
  reconstruction (§4 item 8, disclosed);
* the 14 revision passes now receiving the **reconstructed** double-spaced text
  (undisclosed, item 1 above).

They compound: on a double-spaced import both the analyzer's text and the
passes' text change, and the second is worth 0.9 health and 24 issues on a
single synthetic case here. The owner should compare, on the corpus and split
by `isDoubleSpaced`: per-script health and verdict, `sceneCount`, issue counts
by severity, and the 72-row manifest — **before** reading AUC-24, because a
rank statistic that does not move is not evidence that these two did nothing.

**On the strip order specifically** (the brief's question — parse-invariance fix
or a way to make the measurement look better): it is a fix, and the direction
of the incentive runs against the lane. Stripping non-printing text *removes*
words from the denominator, which lowers health — the same correction on the
single-spaced path lowered all 32 public scripts, mean −1.453, and cost 0.031
of the primary public AUC. It removes text equally from both halves of every
matched pair, which is largely rank-neutral by construction. The justification
is the Fountain specification, not a statistic, and the alternative — a
boneyard being a comment on one normaliser path and not the other — is
indefensible. The lane flagged it as the single largest unmeasurable-from-here
consequence in three separate places rather than burying it. Nothing about it
reads as gaming.

**Cannot settle.** Whether the denominator correction is *right*: that is a
question about what a screenplay is, and the format answers it. The lane's
instruction — if AUC-24 falls, read the drafts, do not move `AUC24_FLOOR` — is
the correct standing order and should be preserved verbatim through any
revision.

**Cannot move at all.** Commits 4, 5, 6 and 7 change no health, verdict, grade,
scene count or severity mix anywhere; I confirmed this from the lane-base → tip
identity run, where the only health moves come from `ef683d4e`. The single
exception the lane names is real: any corpus script with more than forty
speaking characters gets a different voice section.

**Not the corpus's question.** The voice-eligible weight bound (a cost
measurement, and still owed the sibling lane's re-derivation) and whether the
calibration corpus is well designed (a different corpus, a different purpose).

---

*Round 1. On a revision, the same reviewer re-checks item 1 against the new
diff. The reviewed SHA is **`85273742`**.*

---

## Round 2 — re-check of `b798a0c4`

**Object:** five commits over `85273742` (`ee861117`, `9b9a99f8`, `29dfe349`,
`c0614f8d`, `b798a0c4`); `origin/scoring/adversarial-2026-09-12` is at the
reviewed SHA. Warm re-check of my own items against the new diff, plus the two
mechanisms the lane's R2.10 invited attack on. Same method as round 1: my own
`git archive` exports of `85273742` and `78ec4464` in `<session scratch>` with
`node_modules` symlinked; nothing committed, pushed, merged or checked out;
`--lock` never run; no full `npm test`; no private corpus touched.

*Method note, not a finding about the branch:* my round-1 snapshot directory
for `85273742` was overwritten by another agent's identity run in the shared
scratch path (it came back stamped with a different `GIT_SHA` pin than the one
I set). I re-derived it from my own `git archive 85273742` export before
comparing, and every identity figure below is from that re-derived baseline.

### R2.a My blocking item — **CLOSED**

The orchestrator kept `stripTitlePage(normalizeScreenplay(fountain))` and told
the whole truth, which is the better of the two exits I offered. All four
statements are corrected, and none was quietly deleted:

* `server/nvm/analyze/doctor.ts:2982-3020` — the paragraph is replaced by
  "THE WHOLE NORMALIZER IS APPLIED, NOT JUST THE JOIN", naming `716ee817` and
  `ef683d4e`, listing exactly what the reconstruction does to a double-spaced
  import, and carrying the measurement table.
* `PARSE_FORMAT_INVARIANCE_2026-09-12.md:72-75` — item 3 now reads
  `stripTitlePage(normalizeScreenplay(fountain))` with "**that was wrong from
  `ef683d4e` onwards**"; §1.6 is retitled "The stronger half WAS taken, and
  three places said it was not".
* Lane report §5 first bullet — **struck through** and marked false rather than
  removed, with what remains true of it kept.
* New §4 item 10 and a new §6 paragraph.

**The measurement reproduces, at the round-2 tip, including the lane's own
third datum** (`<session scratch>/dsreport.mjs`, `dead-frequency.fountain`
re-emitted at 45 columns with a blank line after every line):

```
as shipped, stripTitlePage(normalizeScreenplay(f))   health 81.4, 182 issues, c/m/n 2/32/148
as documented, joinWrappedDialogue(f)                health 82.3, 158 issues   (my round-1 probe tree)
the same file NOT re-emitted                         health 81.7, 173 issues   EXIT=0
```

The third row is the lane's addition and it is the affirmative case, which I
had not made: the shipped expression reads the re-emitted document **0.3** from
the un-re-emitted original and the documented one **0.6** away. The stronger
half halves the format gap this seam exists to close. That converts my item
from "undisclosed cost" to "disclosed cost with an argument for paying it", and
the argument is correct.

### R2.b The floors did not move — and the reason verified by hand

```
cd /home/user/wt-scoring && npm run benchmark:public                      EXIT=0
  SHUFFLE_DROP      0.8438 [0.7188, 0.9688] floor 0.8238 · 0.7896 [0.6738, 0.8975] floor 0.7696 · 27/5/0
  CLIMAX_RELOCATE   0.5938 [0.4219, 0.7500] floor 0.5738 · 0.5234 [0.4678, 0.5874] floor 0.5034 · 18/12/2
  DIALOGUE_FLATTEN  1.0000 floor 0.98 · 0.9814 [0.9531, 1.0000] floor 0.9614 · 32/0/0
```

Identical to round 1 to the digit. `git diff 85273742..b798a0c4 -- scripts/lib/auc.ts`
is **comment-only** — the single `export const` line in the diff is context, no
constant changed, `AUC24_FLOOR` untouched at 0.622 — and
`tests/fixtures/public-corpus-manifest.json` and
`tests/fixtures/public-benchmark-split.json` have an **empty diffstat**.

**The claim that makes that unsurprising, checked against the corpus rather
than taken** (`<session scratch>/corpusmarkers.mjs`, all 32 committed scripts):

```
forced markers found —  ! : 0  |  . : 0  |  > : 0  |  > … < : 0  |  @ : 0  |  ~ : 0
files carrying ANY forced marker: 0 of 32
cue extensions present: (V.O.) ×28, (O.S.) ×1, (CONT'D) ×25
non-canonical extension spellings: 0
```

Zero forced markers of any kind and zero non-canonical extensions in the whole
benchmark corpus, and no `(O.C.)` either. So round 2's three scoring-path
commits are no-ops on these 32 documents **by construction**, and a floor could
not have moved. That is also the diagnosis: this is precisely why a benchmark
that runs on every CI run could not catch any of these defects, and why every
"before" figure had to be manufactured by a synthetic transform. The lane
states it plainly rather than resting on "the numbers did not change".

### R2.c My transforms, re-measured on both trees

`<session scratch>/r2markers.mjs`, all 32 scripts, six-field surface, run once
against my `85273742` export and once against the round-2 worktree.

| transform | at `85273742` | at `b798a0c4` |
|---|---|---|
| forced-action `!` on every action line | **32 / 32, mean +1.056, largest +7.0 on room-12, 1 verdict flip** | **0 / 32** |
| forced-heading `.` on every scene heading | **32 / 32, mean +0.659, largest +2.5 on the-key-under-the-mat** | **0 / 32** |
| forced-transition `>` on every transition | **5 / 6 applicable, largest −15.7 on room-12** | **0 / 6** |
| forced-cue `@` on every character cue | **32 / 32, mean −1.172, largest −26.8 on room-12** | **32 / 32 — pinned, not fixed** |
| `(V.O.)` → `(V.O)` (my round-1 transform) | **8 / 8 applicable, largest −1.3 on soft-launch** | **0 / 8** |
| every extension respelled without periods | **12 / 14 applicable, largest −1.3** | **0 / 14** |

Every cell reproduces, including my round-1 `!` figures to the third decimal.
The lane's correction of my "9 of 9 applicable" to **8 of 8** is right — eight
of the 32 scripts contain `(V.O.)` and all eight move; I had miscounted the
denominator, not the finding. Its `>` mean of −4.080 against my −3.400 is the
same numbers over a different denominator (5 moved vs 6 applicable:
−3.400 × 6 / 5 = −4.080).

**Fail-first**, my own copy of the committed round-2 suite:

```
cd /home/user/wt-scoring          tests/core/parse-format-invariance.test.ts   59 pass / 0 fail   EXIT=0
cd <scratch>/tip (85273742)       same file, copied unchanged                  51 pass / 8 fail   EXIT=1
```

The 8 are exactly the composition claimed: three marker rows, three extension
spellings, and both halves of the `(O.C.)` test.

**Output identity, `85273742` → round-2 tip**, `GIT_SHA=REVIEWPIN` pinned equal
on both sides, baseline re-derived from my own export:

```
node scripts/check-doctor-output-identity.mjs --compare <scratch>/ident-85273742 <scratch>/ident-r2
  OUTPUT IDENTITY: PASS — all 45 reports are byte-identical (analyzedAt excluded)     EXIT=0
```

Round 2 moves no fixture's report at all, as claimed.

### R2.d The two mechanisms R2.10 asked me to break

**`stripForcedMarkers`'s re-parse rule — I could not break it, and I do not
think it can be broken.** The function returns its candidate only when every
unmarked line re-parses to its original type and every stripped line re-parses
into the set its marker *declared*; anything else rejects the nearest allowed
marker and the loop retries on a strictly smaller set. That is a verification,
not a heuristic, so "a marker is removed and a block boundary moves" is
excluded by the postcondition rather than by argument. Seven adversarial
documents (`<session scratch>/attack.ts`), all behaving correctly:

| case | stripped? | scenes | types |
|---|---|---|---|
| `!` escaping a speech (`NORA` / line / `!She slams…`) — the real-world use | **no** | 1 → 1 | unchanged |
| `.BACK TO THE HOUSE` (a heading only because of the dot) | **no** | 2 → 2 | unchanged |
| `.INT. HALL - NIGHT` (redundant) | **yes** | 2 → 2 | unchanged |
| `>CUT TO:` inside a speech | **no** | 1 → 1 | unchanged |
| `>CUT TO:` as its own element | **yes** | 2 → 2 | action → **transition** (the declared change) |
| a bare `!` alone on a line | **no** | 1 → 1 | unchanged |
| `...` opening an action line | **no** | 2 → 2 | unchanged |

The first row is the one that matters most: `!` is used in real drafts
precisely to break out of a speech, and there the strip correctly declines and
keeps the leak rather than re-typing the line. The admitted residual is real
and checkable — `>SMASH TO BLACK.` is not stripped because the parser's
transition branch does not recognise it, while `>CUT TO:`, `>FADE OUT.`,
`>MATCH CUT TO:` and `>DISSOLVE TO:` all are — and it fails safe.

**`normalizeCueExtensions`'s line gate — it does not eat prose or a wryly.**
`MARY (into phone)`, `she picks up the phone (v.o.)` and
`THE SIGN READS KEEP OUT (beat)` are all returned unchanged; `MARY (V.O) (CONT'D)`,
`MARY (vo)`, `MARY ^ (VO)` and `MARY (O.C)` canonicalise correctly, the `^`
preserved. One behaviour change worth naming, and it is a consistency fix
rather than a defect (non-blocking 5 below).

### R2.e My non-blocking items 1–7

All seven addressed, and three of them went wider than I asked:

1. **Markers** — I reported one; the lane measured four, fixed three and pinned
   the fourth with its size. Verified above.
2. **Extensions** — I reported one spelling; the lane folded three spelling
   families to one canonical set, consolidated **five** duplicate copies of the
   extension list into `CUE_EXTENSIONS` / `stripCueDecorations` in
   `src/lib/fountain.ts` (I confirmed `locate.ts`, `prioritize.ts`,
   `truth-extraction.ts` and `fountain-analyzer.ts` now all alias the one
   definition), and found that all five omitted `(O.C.)`. I reproduced the
   `(O.C.)` bug and its fix end to end: on `85273742` `MARY (O.C.)` and her
   speech both parse as `action`; at the tip they parse `character` +
   `dialogue`, with `wordCount` unchanged at 16 either way.
3. **§1.5's stale counts** — corrected, and the lane's new figures are right:
   I measure the round-2 file at **51 pass / 8 fail** on `85273742` and
   **59 / 59** here.
4. **Before/after columns** — a clause added to each naming the field set.
5. **`auc.ts`'s "−0.0059"** — now "move it **JOINTLY** by", with the parenthetical
   naming §14.3's leave-one-out-singly table as the different statistic.
   Comment-only diff, verified.
6. **Markdown file count** — 474, which is what `honesty-audit` prints here.
7. **The voice bound** — the sentence is in §5.

### R2.f Gates I re-ran

| gate | result |
|---|---|
| `npm run lint` | **EXIT=0** |
| `npm run check-no-console` | EXIT=0 — 304 files, 24 quarantine entries applied |
| `npm run check-docs` | EXIT=0 — clean |
| `npm run honesty-audit` | EXIT=0 — 458 files, **474** markdown files, 93 claims rows |
| `npm run check-brain` | EXIT=0 — 104 notes, 386 links, fresh |
| `npm run gates` | **EXIT=0**; 1 of 1 verified row RAN; mutation check raised `PUBLIC_SHUFFLE_DROP_PAIRED_FLOOR` to 0.8938 and the suite **FAILED on that floor by name**, no passing twin |
| `npm run benchmark:public` | EXIT=0, six AUCs as above |
| `check-scoring-receipt.mjs 78ec4464..HEAD` | **EXIT=1**, exactly **one** PENDING entry, 8 scoring-path files, no other problem |
| `tests/core/parse-format-invariance.test.ts` | **59 / 59** |
| `fountain-analyzer` · `locate` · `prioritize` · `truth-extraction` | 69 / 69 · 35 / 35 · 19 / 19 · 28 / 28 |
| `unicode-character-cues` · `voice-delta` · `report-seam` · `calibration` · `public-benchmark` | 16 / 16 · 18 / 18 · 11 / 11 · 25 / 25 · 33 / 33 |
| `tests/security/fountain-shape-guard-cue-parity.test.ts` | **650 / 650** |
| `tests/routes/fountain-shape-guard-cue-bypass.test.ts` | **57 / 57** |

No AUC-24 value is stated, implied or projected anywhere in the round-2 diff;
every hit is `AUC24_FLOOR` untouched at 0.622, a `PENDING` marker, or a
quotation of this review.

### R2.g Is pinning `@` honest scoping or a dodge?

**Honest scoping**, on four grounds, and I would not accept a fix here.

1. It is the **largest** number in the round (32 of 32, up to −26.8) and the
   lane leads with it rather than burying it — R2.2, R2.9, the normalizer's
   block comment, the receipt row and a dedicated `describe` block all carry
   the figure.
2. The technical reason is real and I verified its load-bearing half: no
   renderer strips `@` (`src/lib/pdf.ts`, `fdx.ts`, `docx.ts`,
   `screenplay-layout.ts` contain no `@` handling at all). Honouring `@` in the
   normaliser alone would make the analysis treat `@MARY` as a speaker while
   five renderers print the marker — an analyzer/renderer split, which is the
   exact class of defect this whole branch exists to close. Unlike `!`, `.` and
   `>`, stripping `@` also re-types every line *below* the cue, so the re-parse
   rule that makes the other three safe does not apply.
3. The pin is `assert.equal(moved, 32)` with a message naming the destination
   ("move this row into FORMAT_TRANSFORMS … Do not relax it"), not a tolerance
   and not a `Number.isFinite`. It goes red the day the parser learns `@`.
4. It is not a regression: 32 of 32 at `85273742` and 32 of 32 now.

The residual risk is worth stating for the owner rather than held against the
lane: `@` and `.` are the two markers most likely to appear in scraped or
converted real drafts, and they are respectively the one **not fixed** and the
one **fixed but unverifiable from this tree**.

### R2.h Is the receipt's "what to compare" what an owner needs?

**Yes, and it is better than what I asked for**, on four counts: it names the
split variable (`isDoubleSpaced`) instead of gesturing at "document shape"; it
orders the checks diagnostic-first with the reason (a change that moves both
halves of every matched pair is largely rank-neutral); it names the statistic
that moves **first** — issue counts by severity, with the evidence that 24
issues moved on a document whose health moved 0.9; and it says what not to
conclude and what not to do (`Do not move AUC24_FLOOR`). An owner who followed
only step 4 would have drawn the wrong conclusion, and the paragraph exists to
stop that.

Two gaps, both one-line, both below.

## VERDICT: **READY-FOR-OWNER**

The blocking item is closed in the strongest available direction — the better
change kept, every contradicting statement corrected rather than deleted, the
drift named by SHA, the cost enumerated where the owner reads it, and an
affirmative measurement added that I had not made. The two non-blocking builds
went wider than the brief. Nothing moved a floor, nothing re-locked, no fixture
report changed, and the two new mechanisms survive the attacks their own author
nominated. This branch is now waiting only on `npm run measure-real`.

### Non-blocking

1. **The receipt's step 1 is not executable as written.** It tells the owner to
   compare "`submittedWordCount` against `wordCount`, per script", but
   `submittedWordCount` is assigned once in `fountain-analyzer.ts:2735` and
   **read nowhere** — it is not on `FountainAnalysis`, not on
   `ScriptDoctorReport`, not exported (two occurrences in the file: the comment
   and the assignment). `isDoubleSpaced` is likewise module-private
   (`screenplay-normalizer.ts:112`), so the split the paragraph is built around
   cannot be computed either. The round-1 comment at the site — "keeps the raw
   figure for anything that legitimately wants 'how much did the writer send'"
   — is a promise nothing can consume. Two exports, or a field on the analysis,
   makes the branch's most important owner instruction mechanical instead of
   manual. A corpus-gated probe script in `scripts/` printing both numbers plus
   `isDoubleSpaced` per script would be better still: every other gate on this
   branch has a reproduce line and this one is prose.
2. **"WHAT TO COMPARE" scopes itself to two changes; there are four.** It says
   "this change and the strip-order change above COMPOUND". Receipt rows 9 and
   10 — the marker strip and the extension fold — are *also* corpus-visible,
   and the corpus is where they will actually fire: the whole finding of R2.b
   is that the 32 committed scripts carry **zero** forced markers and **zero**
   non-canonical extensions, while scraped PDFs and FDX exports are exactly the
   text that carries them. One sentence naming rows 9 and 10 in that paragraph
   would close it. Worth noting in the same sentence that `sceneCount` cannot
   move from the marker strip (the re-parse rule forbids it, and I confirmed
   2 → 2 on a `.`-heading document), so a corpus script whose scene count
   changes is evidence of something else.
3. **`@` and `.` are the two markers with the most corpus exposure**, and they
   are the unfixed one and the fixed-but-unverifiable one (R2.g). Not an
   objection — a line for the owner's reading of any AUC-24 movement.
4. **`DOOR SLAMS (OS)` becomes a character cue where it did not before.** An
   all-caps action line ending in a non-canonical extension alias is now a cue
   with the next line as dialogue. I checked this is a *consistency* fix, not a
   new misparse class: the canonical `DOOR SLAMS (O.S.)` was **already** read as
   a cue at `85273742`, so the round removes a spelling-dependent inconsistency
   rather than creating an ambiguity. The doc's "what it will not eat"
   paragraph addresses the wryly case (`MARY (into phone)`, verified untouched)
   but not this one; one clause would complete it.
5. **R2.8's "23 quarantine entries"** reads 24 here. The `exclude` array is
   **24 entries on both trees and byte-unchanged in round 2** (empty
   `tsconfig*.json` diffstat), and the gate prints how many entries exist on
   disk — environment-dependent, not a widened exemption. Cosmetic.
6. **Carried forward from round 1, unchanged and still binding:**
   `MAX_FOUNTAIN_VOICE_ELIGIBLE_WEIGHT = 1,500,000` must not land before the
   sibling lane's 675,000 re-derivation is applied on the merged tree with the
   analyzer cap in place. The lane's §5 now says so.

### What the owner's run settles and what it cannot

Unchanged from round 1 in substance; round 2 changes only the *list* of
corpus-visible changes, and that list is now written where the owner reads it.

**Settles.** How much of those 761 drafts is text Fountain never prints (the
denominator), and — newly, and this is the one the branch says to read first —
what the two double-spaced-path changes do to per-script health, verdict,
scene count and issue counts. The receipt's four-step order is the right order,
with the caveat of non-blocking 1 that step 1 needs two exports before it can
be run.

**Settles, with four changes now in scope rather than two.** The strip-order
change, the passes reading the reconstructed text, the marker strip and the
extension fold all fire on document shapes this repository does not contain.
The first two compound on every double-spaced document; the second two fire
wherever a real draft carries a forced marker or a non-canonical extension,
which — on the evidence of R2.b — is the difference between the private corpus
and the benchmark corpus.

**Cannot settle.** Whether the corrections are *right*. A boneyard is a
comment, a forced marker is not a word, and one spelling of an extension is one
speaker: the format answers all three, not a statistic. If AUC-24 falls, the
finding is about what those drafts contain and what shape they arrive in.
`AUC24_FLOOR` does not move.

**Cannot move at all.** Round 2 itself: 45 of 45 reports byte-identical to
`85273742`, six AUCs unchanged to the digit, no floor touched, no re-lock run.

---

*Round 2. Reviewed SHA **`b798a0c4`**; round 1's was `85273742`.*
