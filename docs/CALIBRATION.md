# Calibration Methodology

How the Script Doctor turns a raw issue count into a 0-100 health score, a
letter-grade band, and a percentile against a reference set — and exactly
what that percentile does and doesn't claim. Every section below cites the
file it's describing; nothing here is aspirational, it's a reading of the
code as it exists today.

## 1. The controlled-richness reference corpus

The reference set is 20 original, hand-authored Fountain screenplays —
`server/nvm/analyze/calibration/corpus.ts` (`REFERENCE_CORPUS`) — split into
four 5-sample quality bands: `strong`, `competent`, `weak`, `troubled`. None
of it is copied from, or based on, any real, produced, or copyrighted
screenplay; every premise, character, and line was written for this corpus
(corpus.ts's header, "What this is").

**The design problem an earlier revision had.** An earlier version of the
corpus let scene count and word count vary freely by band — `strong` samples
were the longest and richest, `troubled` the shortest and barest. That
confounded the experiment: the ~3,000-rule pipeline's structural-absence and
prose-texture checks scale with scene count and word count at least as much
as with authored quality, so a richer mid-quality script could out-penalize a
barren troubled one on the raw craft score. Averaged per band, that defect
made `competent` rank *lowest* of all four bands and let at least one
`strong` sample rank below every `troubled` sample (corpus.ts's "CONTROLLED-
RICHNESS DESIGN" section; reference.ts's "Corpus band ordering" section).

**The fix is experimental design, not score-gaming.** Every sample is now
built from the *same* 10-scene skeleton with a matched ~300-360 word budget,
so richness (scene count, word count, and which structural signals — a
clock/deadline mention, a planted clue, dialogue, action, a two-character
relationship beat — are present) is held constant across all four bands.
Craft execution is the only variable left to differ:

- **strong** — the clue pays off late (scene 9 of 10, ~90%, well past the
  midpoint), a genuine revelation lands past the midpoint (scene 6), the
  clock is mentioned in both halves and honored, danger/urgency language
  escalates into the climax, and the relationship gets a full arc: a rupture
  (scene 4) resolved by a distinct, earned Act 3 reconciliation (scene 10).
- **competent** — the identical skeleton with real, deliberate flaws: the
  clue pays off early (scene 6, ~60%) so scene 9 has nothing left to
  resolve; two scenes (5 and 7) share the same low-momentum "nothing new"
  beat; one stock/cliché reassurance line appears; the Act 3 relationship
  beat is a thin, shorter acknowledgment rather than a full reconciliation.
- **weak** — the clock is stated once and never followed up on; the clue
  gets addressed flatly and procedurally, with no reversal or urgency
  language; two scenes (5 and 6) repeat the same beat almost verbatim; the
  relationship rupture gets no resolution; a cliché phrase appears near the
  close.
- **troubled** — pervasive failure at the *same* richness, not barrenness:
  the clock is stated once and then flatly contradicted; the clue is
  genuinely orphaned (seeded, never mentioned again); there is no revelation
  at all; four consecutive scenes (5-8) recycle an identical "same as
  always" purpose; the relationship beat gets zero movement; the dialogue
  leans hard on the on-the-nose/cliché lexicon the `dialogue`/`originality`
  passes already flag.

(All four band descriptions are corpus.ts's own, "CONTROLLED-RICHNESS
DESIGN" section.)

**Why band monotonicity is a property of the design, not an accident.**
Because richness is matched across bands, craft is the only thing left that
can move the score, so `strong > competent > weak > troubled` is expected to
hold — and does, as a tested invariant (`tests/core/calibration.test.ts`,
"full band-average monotonicity"). This is also why CLAUDE.md's gotchas note
that changing one band's richness without matching every other band
reintroduces the exact confound the redesign removed, and the monotonicity
test will (correctly) start failing — the fix in that situation is the wave
that touched the corpus, never the test (corpus.ts's "Constraint for future
corpus editors"; `server/nvm/revision/WAVE_QUALITY_GUARANTEE.md`'s Program v2
"Shared constraints" section says the same thing from the wave-discipline
side).

## 2. The opportunity-normalized health formula

The raw craft score is `100 - craftPenalty(...)`, computed by
`computeRawCraftScore` and displayed (clamped to `[0, 100]`, rounded to one
decimal) by `computeHealthScore` — both in `server/nvm/analyze/doctor.ts`.
`craftPenalty`'s shape (constants omitted deliberately; see the file for the
current tuned values, which are expected to drift as the rule count grows):

```
weightedIssues  = 4·critical + 1.5·major + 0.5·minor
opportunityWords = wordCount ^ WORD_COUNT_EXPONENT
density         = weightedIssues / opportunityWords
densityPenalty  = DENSITY_SCALE · density ^ DENSITY_POWER
scarcityPenalty = SCARCITY_SCALE / sceneCount
penalty         = densityPenalty + scarcityPenalty
```

**Why this replaced a scene-count-only divisor.** The prior formula was
`weightedIssues * (30 / sceneCount)` — normalizing only by scene count. With
the pipeline's now-thousands of accumulated rules, issue volume scales with
*prose length* at least as much as scene count: a script with more words per
scene racks up proportionally more dialogue/action-level issues that a
scene-count-only divisor never discounts. Measured against the 20 richness-
matched corpus samples, that produced a *raw* score around -180 to -330 for
every one of them — every realistic script saturated the `[0, 100]` clamp at
the same value, so displayed health, grade, and verdict carried no
information for exactly the scripts that matter (doctor.ts's "Opportunity-
based craft penalty" comment; reference.ts's "saturation defect" section).

**Two independent, additive terms, both with a measured rationale:**

1. **`densityPenalty`** — issue density relative to the script's own size,
   amplified so real craft-quality gaps actually separate on a 0-100 scale.
   `wordCount ^ WORD_COUNT_EXPONENT` (not raw `wordCount`) is the length-
   invariance mechanism: concatenating renamed copies of the same 10-scene
   sample at 2x/3x length (290 → 590 → 890 words) showed `weightedIssues`
   growing *sub-linearly* with length (many rules are per-document, not
   per-repetition) — 100.5 weighted issues at 290 words became 165.5 at 590
   and 230.0 at 890. Raising word count to a fractional power before
   dividing tracks that same sub-linear growth, which is what makes the
   penalty length-invariant for scripts of matched quality (doctor.ts's
   `craftPenalty` comment; the length-invariance regression test lives in
   `tests/core/script-doctor.test.ts`). The exponent amplifying the density
   ratio exists because the corpus's own band-to-band density spread is
   narrow in relative terms (under a 2x spread, best sample to worst) — a
   plain linear scaling either barely separates bands or has to be so
   aggressive it clips everything to 0 or 100.
2. **`scarcityPenalty`** — an always-non-negative term that decays as
   `1/sceneCount`. A script with very few scenes hasn't had enough
   structural opportunity (escalation, revelation, relationship-arc,
   payoff-timing checks all need several scenes to even evaluate) for its
   measured word-density to mean anything; left uncorrected, density alone
   would reward shortness — the small-script mirror image of the original
   defect. It fades to near-nothing for realistic scene counts and dominates
   for a 3-4 scene fragment, which is the intended effect: a tiny script can
   no longer read as "clean" purely by being too short to accumulate issues
   (doctor.ts's `craftPenalty` comment).

**Length-invariance is the guarantee, and it is explicitly bounded.** The
formula is tuned so two scripts of matched authored quality score similarly
regardless of length — verified up to the ~890-word point of the
concatenation experiment that produced the exponent. Real feature-length
scripts run 10-50x longer than that measurement's largest point, so
length-invariance at that larger scale is a well-founded expectation
extrapolated from the data, not a proof (reference.ts's "What remains
genuinely unfixed" §2).

## 3. Known residuals (verbatim honesty)

Quoting `server/nvm/analyze/calibration/reference.ts`'s own "What remains
genuinely unfixed" section, because a methodology writeup that omits this
would be less honest than the code it's describing:

1. **Small-script ceiling, by design, not oversight.** `scarcityPenalty`
   deliberately keeps a 2-4 scene script out of the top of the range even
   when it's genuinely clean — there isn't enough material for most of the
   pipeline's structural checks to have had a fair chance to fire, and a
   "clean" reading from that little evidence isn't trustworthy. The
   correction is uniform: a genuinely exceptional 3-scene excerpt and a
   mediocre 3-scene fragment both absorb the same scarcity surcharge, so
   discrimination *within* the "too short to fully evaluate" bucket stays
   compressed. `verdictFor`'s separate `sceneCount >= 8` floor for a
   `RECOMMEND` verdict is the product's own, coarser guard against the same
   concern.
2. **The word-count exponent is empirical, not a mathematical guarantee.**
   It was measured from one real concatenation experiment (290 → 890
   words) — a strong empirical signal that issue density grows sub-linearly
   with length, not a proof that every screenplay's own mix of per-scene vs.
   per-document rule firings scales identically. Real feature-length scripts
   run far past that measurement's largest point, so length-invariance there
   is extrapolated, not verified.
3. **The density constants are calibrated to the corpus's current density
   spread.** The wave-discipline standing task
   (`server/nvm/revision/WAVE_QUALITY_GUARANTEE.md`) adds new rules
   indefinitely; if that steadily widens or narrows the corpus's band-to-
   band density spread over many waves, the achieved 0-100 separation will
   drift with it. `tests/core/calibration.test.ts`'s monotonicity assertions
   catch an outright *ordering* break; they do not catch a slow drift in how
   *wide* the separation is, since the band-average targets are documented
   as soft, not asserted exactly.

`ROADMAP.md`'s Run 16 backlog (§12, "Residual formula bias follow-up") tracks
revisiting these constants after Program v2 has run long enough to show
whether the density spread has moved.

## 4. Percentile semantics — "the reference set," never broader

`percentileRank` (`server/nvm/analyze/calibration/percentile.ts`) computes a
report's rank against the corpus's sorted health/dimension arrays using the
standard mean-rank (midpoint tie-break) convention: for `N` samples, with
`below` strictly below the value and `at` equal to it,

```
percentile = 100 * (below + at / 2) / N
```

An empty distribution ranks at exactly 50 — "no opinion," not a fabricated
number — and `doctor.ts`'s caller additionally treats an empty distribution
as "calibration unavailable" and leaves the percentile fields undefined
entirely (percentile.ts's `percentileRank` comment).

`percentileDescriptor` (same file) is the wording layer, and it is
deliberately careful about what it implies: every phrasing names **"the
reference set"** explicitly — "stronger than 74% of the reference set,"
"in the top 10% of the reference set" — never "all produced screenplays" or
any broader population claim the 20-sample corpus can't support
(percentile.ts's own comment, echoing corpus.ts's and reference.ts's header
disclaimers). `server/nvm/analyze/calibration/reference.ts` states the same
constraint from the distribution side: this is "a small, originally-
authored, hand-graded reference corpus... NOT 'all produced screenplays,'
not an industry benchmark."

**Ranking uses the unclamped statistic, the display doesn't.**
`aggregateReport` (doctor.ts) ranks a report's health and each dimension
score on `computeRawCraftScore` — the same formula as the displayed health,
*without* the `[0, 100]` clamp — specifically so two scripts that both clamp
to a displayed health of 0 can still separate on the raw statistic instead of
tying at the same percentile (doctor.ts's "Calibration layer" comment,
lines around `aggregateReport`). The displayed health, grade, and verdict are
untouched by this; only the number fed into `percentileRank` differs.

**Calibration is an enhancement, never a dependency.** `reference.ts` builds
its distribution lazily (scores the corpus once per process, memoized) and
falls back to an empty distribution if scoring throws for any reason;
`doctor.ts`'s `aggregateReport` wraps the whole calibration step in a second,
defensive `try/catch` on top of that, so no future change to the calibration
layer can turn a Script Doctor request into a 500 — worst case, a report
comes back without percentile fields, which every consumer already treats as
optional (doctor.ts's "Calibration layer" comment).

**Below 8 samples, there is no distribution at all.** `MIN_CORPUS_SIZE = 8`
in reference.ts gates `buildDistribution()`: percentiles ranked against a
handful of reference scripts are statistical theater (with two samples,
every score reads as roughly "0th/50th/100th percentile"), so below that
floor the module returns the empty distribution outright rather than emit a
descriptor the data can't support. The live corpus carries 20 samples, well
past the floor.

## 5. The wave health gate

`server/nvm/revision/WAVE_QUALITY_GUARANTEE.md`'s Program v2 "Shared
constraints" section states the operating rule plainly: new rules and
signals shift the corpus's scored distribution automatically at module
load (by design — reference.ts scores the corpus through the *real*
pipeline, so it can't help but reflect whatever the pipeline currently
does), but **if a wave makes the band-ordering test fail, the wave's
thresholds are mis-tuned — the fix is the wave, never the corpus.**

Concretely, `tests/core/calibration.test.ts`'s "band ordering through the
real runScriptDoctor pipeline" suite is the enforcement mechanism, asserting
as strict guarantees:

1. **Full four-band monotonicity** on band-average raw craft score:
   `strong > competent > weak > troubled`, computed through the real
   `runScriptDoctor` pipeline.
2. **No `strong` sample falls below the `troubled`-band average** — not just
   an average-vs-average comparison, a floor on the worst individual
   `strong` sample against the best-case band it should always beat.
3. **A pinned `strong`/`troubled` pair** — chosen as the most robust
   (largest-gap) pair in the corpus, not a marginal one — outranks correctly
   on `healthPercentile` through the real pipeline end-to-end.

Because this test runs the *actual* 14-pass pipeline over the *actual*
corpus, it is a live gate: any wave that adds or reweights a rule and
happens to invert one of these three guarantees fails `npm test` before it
can be pushed, by construction rather than by a separate review step. A wave
that measurably shifts corpus band averages by more than a few points is
additionally expected to say so in its own commit message, per the same
"Shared constraints" section, so drift stays visible even when it doesn't
cross the strict thresholds above.
