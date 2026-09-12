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
