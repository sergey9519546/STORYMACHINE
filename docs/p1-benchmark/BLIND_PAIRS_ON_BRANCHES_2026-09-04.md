# Blind matched pairs, scored on both pending scoring branches — 2026-09-04

Companion to `BLIND_PAIRS_2026-09-04.md`. Read-only measurement, produced
in extracted trees (`git archive`) — nothing on any branch was changed. The
12 blind fixtures live only on `main`; they were copied unmodified into each
branch tree, and the main-tree run reproduced the registered numbers exactly
(1/6, −0.02, 5/5, 25.32) before either branch was scored.

## Why this exists

Two scoring branches are parked behind the receipt gate awaiting the owner's
`npm run measure-real`: `claude/r5-verbosity-bias-pending-measurement` (R5:
density normalised by scene opportunity, penalty `8·density²`) and
`claude/advice-rule-fixes-pending-measurement` (six detector-defect fixes).
Before the owner spends a corpus run on either, this answers the cheaper
question: does either branch change the one discrimination result the repo
already knows is bad — the blind matched pairs?

## Owner merge order — corrected

The earlier guidance ("measure R5 first, then rebase the advice-rule branch
onto it and measure again") assumed the second step was a clean rebase. It
is not. Both a full rebase and a single-commit cherry-pick of the advice
branch onto the R5 tip conflict on real code, not only on the receipts
ledger: `server/nvm/revision/passes/character-arc.ts`,
`server/nvm/revision/passes/rhythm.ts`, `src/lib/fountain.ts`,
`tests/core/agency-signal.test.ts`, and
`docs/p1-benchmark/MEASUREMENT_RECEIPTS.md`. The second measurement needs a
manual merge of those five files first. The stacked tree was therefore not
scored.

---
# Blind pairs, scored on both pending scoring branches (and the stack)

Read-only measurement. Trees extracted with `git archive` from:

- **main** — `975eada2` (tip at time of run)
- **R5** — `origin/claude/r5-verbosity-bias-pending-measurement` @ `0f625c27`
- **advice** — `origin/claude/advice-rule-fixes-pending-measurement` @ `68c64eca`
- **stacked** — **not producible**; see "Stacked tree" below.

The blind-pairs fixtures and `tests/core/blind-pairs-discrimination.test.ts`
are main-only (both branches predate and delete them in their diff against
main). The 12 fixtures were copied unmodified into the R5 and advice trees;
`node_modules` was symlinked from the real main checkout into all three
extracted trees. Scoring reuses the same computation the main test/doc use
(`runScriptDoctor` over each fixture and over `REFERENCE_CORPUS`'s
strong/troubled samples paired by index), via one script run standalone in
each tree (not `npm test`, to avoid depending on branch-specific test-runner
changes). The main-tree run reproduced the document's own numbers exactly
(1/6 ordered, gap −0.02, 5/5 calibration ordered, gap 25.32), which is the
receipt that the harness matches the registered computation. The one metric
NOT independently re-derivable from the document is top-10 rule overlap — no
script computing it was left in the repo, so this run defines its own
identity key ((pass, rule) pair on `topPriorities`) and applies it
identically across all three trees; the main-tree overlap this produces
(7.67) is close to but not bit-identical to the document's reported 8.0, so
overlap numbers below are internally comparable across trees but not a
byte-exact reproduction of the document's overlap figure.

## The table

| tree | blind ordered/6 | blind mean gap | blind mean top-10 overlap | cal ordered/5 | cal mean gap | blind scripts still pinned at an identical health |
| --- | --- | --- | --- | --- | --- | --- |
| main | 1/6 | −0.02 | 7.67/10 | 5/5 | 25.32 | 9 of 12 (all at exactly 76.0) |
| R5 alone | **3/6** | **+1.50** | 7.67/10 | 5/5 | 11.14 | **0 of 12** (12 distinct health values) |
| advice-rule-fixes alone | 1/6 | +0.03 | 7.00/10 | 5/5 | 25.36 | 9 of 12 (all at exactly 76.0) |
| stacked (R5 + advice) | not measured — rebase/cherry-pick conflicts, see below | | | | | |

## Per-script health, all three measured trees

`good` = intended-excellent member, `bad` = intended-bad member. `wi` =
weighted issues (4·critical + 1.5·major + 0.5·minor) at that tree's own
detector set.

| pair | main good | main bad | R5 good | R5 bad | advice good | advice bad |
| --- | --- | --- | --- | --- | --- | --- |
| night-shift | 76.0 (wi 95.0) | 76.0 (wi 111.0) | 61.4 (wi 95.0) | 52.4 (wi 111.0) | 76.0 (wi 92.0) | 76.0 (wi 113.0) |
| low-tide | 76.0 (wi 85.5) | 76.0 (wi 101.0) | 66.1 (wi 85.5) | 58.2 (wi 101.0) | 76.0 (wi 89.0) | 76.0 (wi 100.0) |
| the-deposit | 75.1 (wi 132.5) | 76.0 (wi 112.0) | 38.2 (wi 132.5) | 51.8 (wi 112.0) | 74.6 (wi 130.5) | 76.0 (wi 106.5) |
| the-ledger | 76.0 (wi 98.5) | 74.8 (wi 130.5) | 59.6 (wi 98.5) | 39.6 (wi 130.5) | 76.0 (wi 108.5) | 73.9 (wi 128.5) |
| signal-drift | 75.6 (wi 121.0) | 76.0 (wi 102.0) | 46.1 (wi 121.0) | 57.7 (wi 102.0) | 75.5 (wi 116.5) | 76.0 (wi 98.5) |
| fence-line | 76.0 (wi 109.5) | 76.0 (wi 105.0) | 53.3 (wi 109.5) | 56.0 (wi 105.0) | 76.0 (wi 102.5) | 76.0 (wi 116.0) |

Ordered pairs (good > bad): main = {the-ledger}; R5 = {night-shift, low-tide,
the-ledger}; advice = {the-ledger}. The-deposit and signal-drift are
INVERTED on every tree measured (the "bad" member scores higher), because
the bad member happens to fire fewer weighted issues than the good member on
this detector set — a labelling the rule channel gets backwards regardless
of which density formula reads it.

All twelve fixtures carry `sceneCount = 10` by fixture design (the hard
gate `tests/core/blind-pairs-discrimination.test.ts` enforces this), so on
every tree `scarcityPenalty(10) = 140/10 = 14.0` is identical across all
twelve scripts on all three trees — none of the movement above comes from
the scarcity term; all of it is `densityPenalty`.

## Density and penalty, per script, main-formula vs. R5-formula

Recomputed directly from each script's measured `wordCount`/`sceneCount`/
`bySeverity` against each tree's own published `densityPenalty` (main and
advice share one formula; R5 replaces it — see next section).

| pair, variant | words | wi | main density | main penalty | R5 density | R5 penalty |
| --- | --- | --- | --- | --- | --- | --- |
| night-shift good | 933 | 95.0 | 0.792 | 10.00 | 1.753 | 24.58 |
| night-shift bad | 1006 | 111.0 | 0.878 | 10.00 | 2.048 | 33.56 |
| low-tide good | 950 | 85.5 | 0.704 | 10.00 | 1.578 | 19.91 |
| low-tide bad | 965 | 101.0 | 0.823 | 10.00 | 1.864 | 27.78 |
| the-deposit good | 953 | 132.5 | 1.089 | 10.94 | 2.445 | 47.81 |
| the-deposit bad | 962 | 112.0 | 0.914 | 10.00 | 2.066 | 34.16 |
| the-ledger good | 881 | 98.5 | 0.855 | 10.00 | 1.817 | 26.42 |
| the-ledger bad | 907 | 130.5 | 1.110 | 11.20 | 2.408 | 46.38 |
| signal-drift good | 894 | 121.0 | 1.040 | 10.39 | 2.233 | 39.87 |
| signal-drift bad | 957 | 102.0 | 0.836 | 10.00 | 1.882 | 28.33 |
| fence-line good | 980 | 109.5 | 0.882 | 10.00 | 2.020 | 32.65 |
| fence-line bad | 1022 | 105.0 | 0.821 | 10.00 | 1.937 | 30.03 |

**9 of 12 land at exactly `penalty = 10.00` under the main/advice formula**
(the logistic's saturation ceiling for `density ≥ ~0.65`, `SUB_DENSITY_SCALE`)
— matching the doc's "eight of twelve" finding closely (small delta is
expected: `wi` differs slightly between main and the doc's original run
because this reproduction measured `wi` independently rather than copying
the doc's numbers, and both are consistent with the same saturation story).
**0 of 12 saturate under R5's `8·density²`**: R5's density range on these
scripts is 1.58–2.45, and the quadratic keeps producing distinct output
(19.9–47.8) across that whole range — it never flattens.

## Why R5 un-pins some pairs (and why it still gets 3, not 6)

R5's `densityPenalty` denominator changed from `wordCount^0.7` to
`(sceneCount·30)^0.7`. All twelve blind fixtures share `sceneCount = 10` by
the fixture design's own hard gate, so `(sceneCount·30)^0.7` is the SAME
constant (≈ 51.6) for every one of the twelve scripts on R5. That collapses
R5's `density` to a function of `weightedIssues` alone for this corpus —
and, because `8·x²` is strictly increasing, R5's health ranking within each
pair is now **exactly the ranking of raw weighted-issue count**, unclamped.

That is precisely the "rule channel alone" statistic the BLIND_PAIRS
document already measured and reported as being at chance: 3 of 6 correct on
raw weighted-issue ordering, both on the blind pairs and (separately) on the
calibration corpus. This run's R5 numbers (3/6, {night-shift, low-tide,
the-ledger} ordered; the-deposit and signal-drift inverted, matching exactly
which pairs invert on raw `wi` above) confirm that mechanism directly rather
than by inference: R5 does not add or change any judgment about which pair
is better-written — it removes the saturating dead zone that was hiding the
existing weighted-issue signal, and that signal is a coin flip on this
corpus. Un-saturating a channel that is itself uninformative about half the
time yields the observed jump from 1/6 to 3/6, not 6/6.

On the calibration corpus R5 still orders 5/5 (unchanged — that corpus's
samples are also all ~10 scenes, so R5's scene-based denominator reads them
similarly), but the mean gap falls from 25.32 to 11.14. This tracks the same
document's separately measured finding that roughly half of the calibration
corpus's strong/troubled gap was a word-count and scene-count confound, not
craft — R5 removes the word-count term from the denominator entirely, and
the calibration gap shrinks by almost exactly that "confound removed" share.

advice-rule-fixes alone changes six detector defects but does not touch
`densityPenalty`, `scarcityPenalty`, or the word-count-based denominator; the
`wi` values shift by a few points per script (detector-defect fixes fire or
stop firing specific findings) but stay inside the same saturated band —
9 of 12 scripts are still pinned at exactly 76.0, the blind ordering is
unchanged at 1/6, and the mean gap barely moves (−0.02 → +0.03). The
detector fixes are not the mechanism that un-pins the blind scripts; the
formula (R5) is.

## Stacked tree (R5 + advice-rule-fixes): does not apply cleanly

Per instructions this was attempted in a scratch clone only
(a scratch clone outside the repository, never the real repo
working tree) and abandoned on conflict rather than resolved.

Two attempts, both conflicting:

1. **`git rebase origin/claude/r5-verbosity-bias-pending-measurement`** with
   `advice-rule-fixes-pending-measurement` checked out. The two branches
   have different merge-bases with `main` (R5 branched from an older `main`
   commit, ~74 commits behind where `advice-rule-fixes` branched), so the
   rebase had to replay 75 commits, not one, and conflicted at commit
   `978ef548` (an unrelated `MEASUREMENT_RECEIPTS.md` entry from main's own
   history) on `docs/p1-benchmark/MEASUREMENT_RECEIPTS.md`.
2. **`git cherry-pick`** of just `advice-rule-fixes`'s one real commit
   (`68c64eca`) onto the R5 tip — a cleaner test of "the stack", avoiding the
   75-commit staleness noise above. This also conflicted, and not only on
   history noise: real overlapping edits, in
   - `docs/p1-benchmark/MEASUREMENT_RECEIPTS.md`
   - `server/nvm/revision/passes/character-arc.ts`
   - `server/nvm/revision/passes/rhythm.ts`
   - `src/lib/fountain.ts`
   - `tests/core/agency-signal.test.ts`

Both attempts were aborted (`git rebase --abort` / `git cherry-pick --abort`)
and the scratch clone's temporary branches deleted; nothing was pushed or
merged, and the real repository working tree was never touched. Per
instructions, the stacked tree was not built and no stacked numbers are
reported. The conflicting files above are code, not only docs — a human
merge of the two branches will need to resolve real overlapping changes in
`character-arc.ts`, `rhythm.ts`, and `fountain.ts`, not just the receipts
doc.

## Answer

**R5 alone measurably changes the blind-pairs result; advice-rule-fixes
alone does not.** R5 moves the engine from ordering 1 of 6 blind pairs to 3
of 6, with the mean gap going from −0.02 to +1.50, and un-pins all twelve
scripts from the single shared health value (9 of 12 were tied at exactly
76.0 on main; 0 of 12 are tied on R5). advice-rule-fixes alone leaves the
blind result unchanged (1/6, gap +0.03, 9/12 still pinned at 76.0) because
none of its six detector fixes touch the density formula that was doing the
pinning.

The mechanism, with per-script evidence above: the saturating logistic in
main's `densityPenalty` clamps at penalty 10.00 for any `density ≥ ~0.65`,
and 9 of the 12 blind scripts (881–1022 words, `density` 0.70–1.11 under the
word-count denominator) sit inside that clamp — confirmed directly by
recomputing `density`/`penalty` per script above, not inferred. R5's
`8·density²` over a scene-based denominator never clamps, so it exposes
whatever the raw weighted-issue count already says. But raw weighted-issue
count is itself at chance on this corpus — this run reproduces the
document's own "3 of 6 correct on raw `wi`" finding directly, and R5's
blind-pair ordering (3/6, the SAME three pairs correct and the SAME two
inverted as raw `wi` predicts) is arithmetically that statistic with the
saturation removed, nothing more. R5 does not add craft judgment; it stops
hiding a signal that is already a coin flip on blind writing.

**Neither branch, alone or combined (to the extent the stack could be
checked before it conflicted), gets the engine past that ceiling on short
drafts.** This implies the owner's planned real-corpus measurement run
cannot be expected to rescue discrimination on short scripts through either
pending branch by itself: R5 is a plumbing fix (it removes a dead zone) and
advice-rule-fixes is a detector-correctness fix (it corrects six specific
rule defects), and neither changes what the rule channel's weighted-issue
count actually tracks on writing craft, which — per the document this task
was scoped against — is the thing that is at chance. Per the task's own
framing, that leaves the structural-signals work (scene-count-scarcity-style
signal, not rule density) as the only route measured here that has ever
shown real separation on this corpus (`scarcityPenalty` is untouched by
either branch and identical across all three trees). This is not a
recommendation on merging either branch — both may still be worth merging
for what they were built to fix (verbosity bias at feature scale; six named
detector defects) independent of what they do or do not do for blind-pairs
discrimination — it is only the numbers and the mechanism the owner asked
for before deciding on the real-corpus measurement.

