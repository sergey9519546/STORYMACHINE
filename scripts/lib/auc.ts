// Shared, pure AUC-24 machinery — ONE definition of the statistic and of the
// degradation recipe, imported by every place that claims to measure them.
//
// WHY THIS FILE EXISTS. Until 2026-09-02 the AUC-24 ratchet lived entirely
// inside tests/core/real-script-corpus.test.ts, which is env-gated on
// REAL_SCRIPT_CORPUS_DIR and therefore SKIPS on every CI run (the corpus text
// is copyrighted and local-only). The project reasoned: corpus cannot reach CI
// -> therefore the AUC cannot be verified in CI. The second arrow is false.
// The AUC is computed from two arrays of NUMBERS produced by a seeded,
// deterministic degradation. Numbers are not copyrighted screenplay text, and
// this repo already commits exactly that shape without exposure
// (tests/fixtures/real-corpus-manifest.json: 72 rows of hashes and scores).
//
// So the statistic is split from the text: the owner runs
// `npm run lock-auc24` locally (the only place the corpus exists) to lock a
// committed table of per-script intact/degraded health values, and CI
// RECOMPUTES the AUC from that committed table on every run
// (tests/core/auc24-table.test.ts). CI still cannot confirm that the numbers
// came from the real corpus — but the arithmetic over them is then checked,
// any change is a reviewable numeric diff, and passing a fabricated table
// means forging 48 individually-plausible health values whose Mann-Whitney
// statistic lands on the claimed number, instead of typing one figure into
// prose (the 2026-08-08 receipt-fabrication shape).
//
// STATUS AS COMMITTED (2026-09-03): the table does NOT exist yet. It cannot
// be produced in any environment that lacks the corpus, and inventing its
// values would be exactly the fabrication this machinery exists to make
// expensive. tests/core/auc24-table.test.ts therefore SKIPS with a message
// naming the lock command, scripts/report-unverified-gates.mjs lists the
// missing file as an unverified gate, and that gate carries an expiry after
// which the reporter exits non-zero and the CI step blocks. The machinery is
// delivered and tested on synthetic data (tests/core/auc.test.ts); only the
// owner's one local run is outstanding.
//
// ── THE AUC-24 RECIPE'S SCENE SEGMENTATION CHANGED ON 2026-09-12 ──────────
// `shuffleDropDegrade` below is byte-for-byte the AUC-24 recipe. Until
// 2026-09-12 it split scenes on `/^(?=INT\.|EXT\.)/mi` and therefore could not
// see `EST.`, `I/E.`, `INT./EXT.` or Fountain forced `.HEADING` lines — all
// standard, and the AUC-24 corpus is real screenplays, which use them
// (docs/audits/2026-09-12-adversarial/engine-logic.md finding 12). It now
// segments with the DOCTOR'S OWN heading grammar via
// scripts/lib/scene-segments.ts.
//
// What that means for the lock, stated here because it is the first thing a
// reader of this file needs to know:
//
//   * THE LAST MEASURED AUC-24, 0.731, WAS MEASURED ON THE OLD RECIPE
//     (2026-07-11, docs/p1-benchmark/MEASUREMENT_RECEIPTS.md §2.1). It is not
//     comparable to a run of the new one.
//   * NOTHING WAS INVALIDATED, because `tests/fixtures/auc24-table.json` has
//     never existed (see the STATUS block below). The owner's
//     `npm run lock-auc24` must simply run on the NEW recipe; its number is the
//     first AUC-24 figure this segmentation has ever produced.
//   * `AUC24_FLOOR` IS UNTOUCHED at 0.622. Moving a floor is a measurement's
//     job, and a recipe that degrades strictly more aggressively is exactly the
//     case where guessing a new floor would be a guess wearing a gate's clothes.
//   * `AUC24_DEGRADATION_ID` is bumped to `shuffle-drop/v2`, so a table
//     produced by the old recipe can never be compared to a new measurement.
//   * On the 32 committed public-benchmark scripts the new segmentation produces
//     BYTE-IDENTICAL output (measured: 0 of 32 differ), so neither SHUFFLE_DROP
//     floor below moved. The same statement is in CLAUDE.md's "Which floor,
//     exactly" section and docs/brain/Gates/Gate - AUC-24 Ratchet.md.
//
// PURITY: nothing here reads the filesystem, the environment, or the clock.

import { makePrng, seedFromString, shuffle } from '../../server/nvm/repro/seed.ts';
import { reassembleFountainScenes, segmentFountainScenes } from './scene-segments.ts';

/** The 24-script subset is `MANIFEST.slice(0, SUBSET)` — the manifest's array
 *  ORDER selects which scripts the floor is measured over. See
 *  tests/fixtures/real-corpus-manifest.README.md: never sort or regroup it. */
export const AUC24_SUBSET = 24;

/**
 * The ratchet floor, and the ONE definition of it.
 *
 * 0.622 is the value tests/core/real-script-corpus.test.ts has asserted since
 * 2026-07-10 (derived then as measured 0.672 minus a 0.05 margin). That test
 * now imports this constant instead of carrying its own literal, and
 * tests/core/auc24-table.test.ts asserts the two agree, so the floor can no
 * longer be raised in one place and left behind in the other.
 *
 * NOT RAISED HERE, DELIBERATELY. The retrospective's finding #7 ("the ratchet
 * does not ratchet") is correct: the last recorded AUC-24 receipt is 0.731
 * (docs/p1-benchmark/MEASUREMENT_RECEIPTS.md §2.1), so a measured-minus-0.05
 * rule would put the floor at 0.681 and a change could otherwise give back
 * 0.109 of separation and still pass. But that 0.731 was measured on
 * 2026-07-11, before many scoring changes, and every receipt since is an
 * output-identity receipt rather than a fresh AUC run. Raising an assertion
 * to a number nobody has re-measured against today's doctor would be a guess
 * wearing a gate's clothes. The honest sequence is: owner runs
 * `npm run lock-auc24`, the committed table carries a real current number,
 * and the floor moves to that number minus the margin in the same change
 * that records it. This constant is the single place that edit has to happen.
 *
 * DO NOT set this from the P1 baseline numbers (SCENE_SHUFFLE 0.734 /
 * MIDPOINT_DROP 0.766 in docs/p1-benchmark/DISCRIMINATION_BASELINE_2026-07-29.md).
 * Those are SEPARATE degradations, measured on a 153-script hash-locked test
 * partition of a different 761-script corpus, against a >= 0.80 gate. AUC-24
 * is ONE COMBINED degradation (shuffle AND drop-every-third) over a 24-script
 * subset of the local-only corpus. Different corpus, different degradation,
 * different denominator — they have been confused before, and importing a P1
 * number here would break the ratchet for no real regression.
 */
export const AUC24_FLOOR = 0.622;

/** The margin between a fresh measurement and the floor locked from it. Kept
 *  next to the floor so the "measured minus margin" rule is a number in the
 *  code rather than a sentence in a doc that drifts from it. */
export const AUC24_FLOOR_MARGIN = 0.05;

/**
 * ── THE PUBLIC-BENCHMARK FLOORS ───────────────────────────────────────────
 *
 * SIX constants: three degradations x two statistics. None of them is the
 * AUC-24 ratchet and none may be compared to it, to each other's lineage, or
 * to the 761-script P1 baseline. They live here, next to AUC24_FLOOR, for the
 * reason AUC24_FLOOR lives here: one definition of a floor, imported
 * everywhere, so it cannot be raised in one file and left behind in another.
 *
 * WHAT THEY MEASURE. scripts/lib/public-benchmark.ts scores the 32
 * DISTRIBUTABLE .fountain files (20 CC0 scripts in data/screenplays + 12
 * blind-pair fixtures) intact and then degraded, on every CI run, with no
 * corpus mount — tests/core/public-benchmark.test.ts.
 *
 * WHICH STATISTIC IS PRIMARY: the MATCHED-PAIR one (`*_PAIRED_FLOOR`). This
 * is a paired design — every script against a degraded copy of ITSELF — so
 * the estimator that respects the pairing is the honest reading. The
 * all-pairs Mann-Whitney compares script A intact against script B degraded
 * and folds between-script variance (author, length, content) back into a
 * comparison the design controls. It is floored too, because the shuffle-drop
 * recipe comes from that lineage and a reader will look for it — but it is
 * the SECONDARY number, and it is the LESS conservative of the two in 7 of
 * the 8 cells measured across main and the three scoring branches. Flooring
 * only it would have meant ratcheting the friendlier statistic and letting a
 * regression visible only in the paired one pass CI.
 *
 * WHY THREE DEGRADATIONS.
 *
 *  - SHUFFLE_DROP is the AUC-24 recipe: it drops every third scene and so
 *    moves `scarcityPenalty` directly — but ONLY below that term's saturation
 *    point. Since 2026-09-11 it is `140/min(sceneCount, 12)`, so on a document
 *    whose intact AND dropped scene counts both exceed 12 the term contributes
 *    exactly zero to this channel. That is the whole private-corpus case (see
 *    WHAT SATURATION DOES TO AUC-24 below); on this 32-script corpus, where
 *    every document is 6-14 scenes, the term still moves.
 *  - CLIMAX_RELOCATE preserves scene count exactly (measured: mean scarcity
 *    delta 0.000 over all 32 scripts), so that term cancels and what is left
 *    is order-sensitivity alone. Since 2026-09-12 it moves the final scene to
 *    POSITION ONE, as every document describing it always said; until then it
 *    spliced at index 1 — position TWO — leaving the script's opening intact,
 *    and nothing asserted otherwise (finding 12). The assertion now exists
 *    (`assertFinalSceneIsFirst`), and the two ORDER floors below were re-locked
 *    from the corrected, stronger manipulation.
 *  - DIALOGUE_FLATTEN is a POSITIVE CONTROL, not a finding. Both measurement
 *    channels read chance; without a manipulation the score demonstrably DOES
 *    detect, a reader cannot tell "the score is blind to mechanical damage"
 *    from "the harness never worked". The score catches this one on 32 of 32
 *    scripts with zero ties, through a scoring channel neither other
 *    degradation touches (~17-18 of its 26.40-point mean gap comes from
 *    outside the density/scarcity craft formula; that gap read 29.30 on
 *    `main @ 9b199b72` and the figure was carried forward unrefreshed until
 *    round 2). The engine ships a deduction built
 *    for exactly this manipulation, which is what makes it a liveness check
 *    on the instrument rather than evidence about the score.
 *
 * WHERE THE NUMBERS STAND, 2026-09-12 (branch scoring/adversarial-2026-09-12,
 * AFTER the parse-and-format-invariance commits). Shuffle-drop 0.8438
 * matched-pair [0.7188, 0.9688] / 0.7896 all-pairs; climax-relocate 0.5938
 * [0.4219, 0.7500] / 0.5234; control 1.0000 / 0.9814.
 *
 * FOUR FLOORS MOVED DOWN, AND THE REASON IS A MEASUREMENT ARTIFACT LEAVING,
 * NOT THE ENGINE GETTING WORSE. This is the single most important sentence in
 * this header, so it is stated with its mechanism. `wordCount` — the
 * denominator of the density term, which is most of health — was
 * `fastWordCount(<the raw submission>)`. Every one of the 20 CC0 screenplays
 * and all 12 blind-pair fixtures opens with its own CC0 licence and provenance
 * record, moved into a Fountain boneyard comment by the 2026-09-04 corpus-integrity
 * correction so that it would not be DIAGNOSED. Its words went on being
 * COUNTED: 24 to 151 words per file, which on the two shortest scripts is a
 * fifth of everything the denominator saw. Those words carried no issues, so
 * they lowered density and raised health for free — which is also the
 * mechanism of the padding attack this commit closes (an 800-repetition
 * boneyard moved health on 32 of 32 scripts, mean +7.206, up to +18.6, four
 * verdicts CONSIDER -> RECOMMEND).
 *
 * With the denominator now the screenplay's own printed words, every script
 * falls: mean -1.453, range -0.1 to -12.3, two verdicts CONSIDER -> PASS
 * (room-12 63.9 -> 51.6 on 427 -> 338 words, transfer-window 64.1 -> 55.8 on
 * 454 -> 379). One matched pair flips with them, 28/4/0 -> 27/5/0, and that is
 * the whole of the shuffle-drop movement:
 *
 *   PUBLIC_SHUFFLE_DROP_PAIRED_FLOOR   0.855  -> 0.8238  (measured 0.8750 -> 0.8438)
 *   PUBLIC_SHUFFLE_DROP_FLOOR          0.8091 -> 0.7696  (measured 0.8291 -> 0.7896)
 *   PUBLIC_ORDER_FLOOR                 0.5069 -> 0.5034  (measured 0.5269 -> 0.5234)
 *   PUBLIC_DIALOGUE_FLATTEN_FLOOR      0.98   -> 0.9614  (measured 1.0000 -> 0.9814)
 *
 * The two PRIMARY matched-pair floors for the order channel and the control
 * did not move, and AUC24_FLOOR did not move. The attribution is measured, not
 * argued: with the denominator change alone reverted and every other change in
 * place, shuffle-drop reads 0.8750 / 0.8232 — i.e. the three parse fixes
 * (typography fold, non-printing strip, title-page strip) move it by 0.0000 /
 * -0.0059 and the denominator moves the rest.
 *
 * READ IT AS A CORRECTION TO THE INSTRUMENT'S INPUT. A benchmark whose
 * separation depends on each fixture counting its own licence text as
 * screenplay was reporting a number about this repository's filing habits.
 * 0.8438 is what the same engine scores on the same writing once that stops.
 * Nothing here licenses a future re-lock downward on a number that fell for a
 * reason nobody can name.
 *
 * THE PREVIOUS ENTRY, kept because the order floors above were set by it
 * (branch scoring/adversarial-2026-09-12,
 * which is scoring/feature-length-defects REBASED onto main and re-locked from
 * the rerun that rebase forced). Shuffle-drop 0.8750 matched-pair / 0.8291
 * all-pairs; climax-relocate 0.5938 / 0.5269; control 1.0000 / 1.0000.
 *
 * THE TWO ORDER FLOORS MOVED AND THE SCORE DID NOT. The rebase brought in
 * main's instrument fix (63d7ede1): CLIMAX_RELOCATE now moves the final scene
 * to position ONE rather than TWO, and one shared segmenter replaces the
 * INT./EXT.-only split. That is a STRONGER manipulation applied to an
 * unchanged scorer, so the channel reads higher: matched-pair 0.5469 -> 0.5938
 * and all-pairs 0.5151 -> 0.5269, with PUBLIC_ORDER_PAIRED_FLOOR 0.5269 ->
 * 0.5738 and PUBLIC_ORDER_FLOOR 0.4951 -> 0.5069. The evidence that the engine
 * did not move with them: `tests/fixtures/public-corpus-manifest.json` (32 rows
 * of intact sceneCount/words/health/verdict) and
 * `tests/fixtures/public-benchmark-split.json` both re-locked to BYTE-IDENTICAL
 * content, and the shuffle-drop and control floors did not move at all. A
 * higher floor from a stronger degradation is not a better score; it is the
 * same score measured with a sharper instrument, and it must not be read as
 * progress on the order question — the matched-pair interval [0.4219, 0.7500]
 * still contains 0.5.
 *
 * Read the 2026-09-11 branch figures below against what they were and what
 * they mean; the two climax-relocate values in them are the position-TWO
 * measurement, superseded by the paragraph above:
 *
 *  - SHUFFLE-DROP moved 0.5313 -> 0.8750 matched-pair, and the sign counts
 *    moved with it: 17 ordered / 15 inverted / 0 tied -> 28 / 4 / 0, with the
 *    mean health gap going from -1.93125 (the DAMAGED copy scored higher) to
 *    +1.89375. (Round 1 of this branch read +2.109375 and wrote it "+2.10",
 *    truncated rather than rounded; round 2's scarcity saturation at 12 rather
 *    than 15 scenes costs the six 13-and-14-scene scripts 0.898-1.667 points
 *    each, which is where the rest of the difference went.) That is not a
 *    tuning: it is the formula no longer paying the AVERAGE writer to delete a
 *    third of their scenes. It is NOT "no writer": FOUR of the 32 are still
 *    inverted, and they are named here because a narrative beside a disclosed
 *    28/4/0 should not need a reader to go looking —
 *      transfer-window          64.1 -> 73.0  (+8.9 for the damaged copy)
 *      room-12                  63.9 -> 72.3  (+8.4)
 *      the-key-under-the-mat    72.5 -> 74.1  (+1.6)
 *      quiet-season             73.8 -> 73.9  (+0.1)
 *    All four sit on the density POWER branch (intact density > 1), which the
 *    sub-1 slope constraint provably cannot reach — see §8.2 of
 *    docs/scoring/FEATURE_LENGTH_DEFECTS_2026-09-07.md, which states that
 *    constraint's population (the 16 scripts sub-1 at both ends) rather than
 *    implying all 32. See also the DELETION REWARD block above doctor.ts's
 *    densityPenalty.
 *  - CLIMAX-RELOCATE moved 0.4219 -> 0.5469 matched-pair under the OLD
 *    position-two relocation, and its exact ties collapsed from 11 of 32 to 1.
 *    That second number matters more than the first: the channel's N is no
 *    longer a third frozen. Under main's corrected position-ONE relocation the
 *    same scorer reads 0.5938 with 2 ties of 32 — 30 movable scripts — and its
 *    interval [0.4219, 0.7500] still contains 0.5. The doctor still does not
 *    reliably detect reordering with scene count held constant. It reads
 *    chance HONESTLY now instead of reading chance through a saturated formula.
 *  - The CONTROL is unchanged in kind and cleaner in degree (0.9473 -> 1.0000
 *    all-pairs). It is still a liveness check on the instrument, never
 *    evidence about the score.
 *
 * NONE OF THIS IS EVIDENCE THE SCORE TRACKS CRAFT. Every degradation here is
 * mechanical damage, and the craft question is the blind-pairs measurement
 * (4 of 6 ordered on this branch, up from 1 of 6 — on six pairs, which is
 * inside what chance produces). A floor is a ratchet against getting worse;
 * raising one is a measurement's job, never an edit's.
 *
 * THE PREDICTION THIS REFUTED, kept because it is the useful part. The
 * scene-count-artifact argument (doctor.ts:2394-2395 — scarcity AUC 0.938,
 * rule channel 0.076) predicts that dropping every third scene of a 10-scene
 * script adds 140/7 - 140/10 = 6.00 points of scarcity penalty, against 0.58
 * points at the private corpus's median 118 scenes, and therefore that a
 * short-script shuffle-drop benchmark would look ~10x MORE separable. It did
 * not, and the reason WAS the defect. Measured decomposition over these 32
 * scripts on `main @ 9b199b72`: the scarcity penalty rose by a mean of +5.693
 * points while the DENSITY penalty fell by a mean of 7.632 at the same time,
 * because dropping a third of the scenes removes a larger share of the
 * weighted issues than of the words. Net mean health MOVED UP 1.93 points
 * under degradation. The 2026-09-07 change closes exactly that gap, which is
 * why the shuffle-drop floors moved as far as they did — and it is still true
 * that every floor here is set from a measurement rather than from the
 * arithmetic.
 *
 * WHAT SATURATION DOES TO AUC-24, stated so the owner reads the right half.
 * Two different things happen to a feature-length script and only one of them
 * can move a matched-pair rank statistic:
 *
 *  - A NEAR-UNIFORM LEVEL SHIFT, which cannot. At the private corpus's median
 *    118 scenes the term goes from 140/118 = 1.186 to 140/12 = 11.667, i.e.
 *    every script loses 10.480 points (9.92 at 80 scenes, 10.97 at 200). That
 *    WILL move verdicts, grades and the 72-row real-corpus manifest, and the
 *    owner note asks for exactly that re-lock. It is rank-preserving within a
 *    matched pair, so by itself it cannot move AUC-24 at all.
 *  - THE SCARCITY CHANNEL'S DEGRADATION DELTA GOING TO EXACTLY ZERO, which
 *    can. This is the AUC-relevant change and it is the one to read. For a
 *    118-scene script the drop recipe leaves ~79 scenes; before saturation the
 *    term contributed 140/79 - 140/118 = +0.586 points of separation, and
 *    after it contributes 140/12 - 140/12 = 0.000 exactly. For EVERY script of
 *    roughly 22 scenes or more — i.e. essentially the whole private corpus —
 *    the channel main's own measurements credit with AUC 0.938 now contributes
 *    nothing to this degradation.
 *
 * So AUC-24 CAN settle whether health still orders an intact feature above a
 * shuffle-dropped copy of itself once scarcity contributes zero and the sub-1
 * density curve is near-linear. It CANNOT settle which of the two changes is
 * responsible (they are separately landable — see
 * `scoring/feature-length-saturation-only` — but neither half has its own
 * AUC-24 receipt), and it says nothing about craft.
 *
 * HOW THEY ARE SET AND RE-SET. floor = round4(measured - PUBLIC_FLOOR_MARGIN).
 * `npm run benchmark:public -- --lock` rewrites all six constant lines below
 * (and the two committed fixtures) from a fresh run and prints every
 * before -> after. Do that ONLY after a scoring change you intended, and read
 * the resulting diff: a re-lock following an unintended regression silently
 * lowers the ratchet, which is the one way this machinery can be defeated.
 * TWO floors have ever moved UP for a reason that is not a scoring change:
 * the 2026-09-12 rebase re-lock moved both ORDER floors because the
 * DEGRADATION got stronger (position two -> position one), with the manifest
 * re-locking byte-identical to prove the scorer sat still. A floor raised by a
 * sharper instrument ratchets the same engine against a harder test; it is not
 * a claim that the engine improved.
 * ONE floor has ever moved DOWN here: round 2's re-lock took
 * PUBLIC_SHUFFLE_DROP_FLOOR from 0.8106 to 0.8091 (measured 0.8306 ->
 * 0.8291), because the saturation point moved from 15 scenes to 12 and one of
 * the 1,024 all-pairs comparisons went with it. The PRIMARY floor and the
 * other four did not move, AUC24_FLOOR did not move, and the change was
 * intended and measured before it was locked — which is the only condition
 * under which a downward re-lock is allowed to happen at all.
 * The values, intervals, N and per-script pairs are in
 * docs/p1-benchmark/PUBLIC_BENCHMARK_2026-09-06.md and in the PUBLIC-CORPUS
 * section of docs/p1-benchmark/MEASUREMENT_RECEIPTS.md.
 *
 * The six lines below are MACHINE-REWRITTEN by that command. Keep each on one
 * line in the form `export const NAME = <number>;` — scripts/benchmark-public.ts
 * matches exactly that shape, and tests/core/public-benchmark.test.ts asserts
 * every one of them is still reachable by it.
 */
export const PUBLIC_SHUFFLE_DROP_PAIRED_FLOOR = 0.8238;
export const PUBLIC_SHUFFLE_DROP_FLOOR = 0.7696;
export const PUBLIC_ORDER_PAIRED_FLOOR = 0.5738;
export const PUBLIC_ORDER_FLOOR = 0.5034;
export const PUBLIC_DIALOGUE_FLATTEN_PAIRED_FLOOR = 0.98;
export const PUBLIC_DIALOGUE_FLATTEN_FLOOR = 0.9614;

/**
 * The margin between a fresh public-benchmark measurement and the floor
 * locked from it. Smaller than AUC24_FLOOR_MARGIN (0.05) on purpose: this
 * measurement is RE-RUN ON EVERY CI RUN over committed text, so it carries no
 * corpus-drift or re-measurement uncertainty — the only slack it needs is for
 * a genuinely intended scoring change, and a 0.02 band keeps the ratchet
 * tight enough to notice one. A change that moves any of the six statistics
 * by more than this is supposed to fail, be looked at, and be re-locked
 * deliberately.
 */
export const PUBLIC_FLOOR_MARGIN = 0.02;

/**
 * Which floor guards which (degradation, statistic) pair — ONE mapping, so
 * the CLI, the test, the `--lock` rewriter and the docs cannot disagree about
 * it. `constant` is the exact identifier `--lock` rewrites; `primary` marks
 * the matched-pair reading this paired design earns.
 */
export const PUBLIC_FLOORS = [
  {
    degradation: 'SHUFFLE_DROP', statistic: 'paired', primary: true,
    constant: 'PUBLIC_SHUFFLE_DROP_PAIRED_FLOOR', value: PUBLIC_SHUFFLE_DROP_PAIRED_FLOOR,
  },
  {
    degradation: 'SHUFFLE_DROP', statistic: 'allPairs', primary: false,
    constant: 'PUBLIC_SHUFFLE_DROP_FLOOR', value: PUBLIC_SHUFFLE_DROP_FLOOR,
  },
  {
    degradation: 'CLIMAX_RELOCATE', statistic: 'paired', primary: true,
    constant: 'PUBLIC_ORDER_PAIRED_FLOOR', value: PUBLIC_ORDER_PAIRED_FLOOR,
  },
  {
    degradation: 'CLIMAX_RELOCATE', statistic: 'allPairs', primary: false,
    constant: 'PUBLIC_ORDER_FLOOR', value: PUBLIC_ORDER_FLOOR,
  },
  {
    degradation: 'DIALOGUE_FLATTEN', statistic: 'paired', primary: true,
    constant: 'PUBLIC_DIALOGUE_FLATTEN_PAIRED_FLOOR', value: PUBLIC_DIALOGUE_FLATTEN_PAIRED_FLOOR,
  },
  {
    degradation: 'DIALOGUE_FLATTEN', statistic: 'allPairs', primary: false,
    constant: 'PUBLIC_DIALOGUE_FLATTEN_FLOOR', value: PUBLIC_DIALOGUE_FLATTEN_FLOOR,
  },
] as const;

/** Identifies the exact degradation the committed table was produced by. Bump
 *  the version if the recipe, the PRNG, or the seed template ever changes —
 *  a table produced by a different recipe is not comparable, and the
 *  table-driven test refuses it.
 *
 *  BUMPED TO v2 ON 2026-09-12: the scene SEGMENTATION changed from an
 *  `INT.`/`EXT.`-only split to the doctor's own heading grammar
 *  (scripts/lib/scene-segments.ts) — see `shuffleDropDegrade`'s header. No
 *  table existed at v1, so nothing was invalidated; the bump is what stops a
 *  v1 table from ever being compared to a v2 measurement. */
export const AUC24_DEGRADATION_ID = 'shuffle-drop/v2';

/** Human-readable description of `AUC24_DEGRADATION_ID`, embedded in the
 *  committed table so the artifact is self-describing. */
export const AUC24_DEGRADATION = {
  id: AUC24_DEGRADATION_ID,
  recipe:
    'seeded Fisher-Yates shuffle of all scenes — segmented by the doctor\'s own heading grammar '
    + '(scripts/lib/scene-segments.ts over src/lib/fountain.ts\'s parseFountain: INT./EXT./EST./'
    + 'I/E./INT./EXT. and forced .HEADING lines, boneyard excluded), NOT the INT./EXT.-only split '
    + 'used before 2026-09-12 — then drop every third scene of the shuffled order '
    + '(index % 3 === 2); any pre-first-heading head is preserved verbatim at the top',
  seedTemplate: 'seedFromString("degrade:" + <manifest entry.file>)',
  prng: 'mulberry32 (makePrng) + djb2 (seedFromString), server/nvm/repro/seed.ts',
  subsetSize: AUC24_SUBSET,
  subsetRule: 'real-corpus-manifest.json entries 0..23, in committed array order',
} as const;

/** Repo-relative path of the committed table. One constant, so the lock
 *  script, the test, and the gate reporter cannot disagree about where it is. */
export const AUC24_TABLE_PATH = 'tests/fixtures/auc24-table.json';

/** The exact command that (re)locks the committed table. Quoted verbatim in
 *  the failure/skip messages so a reader never has to go find it. */
export const AUC24_LOCK_COMMAND =
  'REAL_SCRIPT_CORPUS_DIR=/path/to/corpus npm run lock-auc24';

/**
 * Mann-Whitney AUC: P(random intact > random degraded), ties counted as half.
 * 1.0 = the intact script always outscores its own scrambled self; 0.5 = coin
 * flip (structure-blind); below 0.5 = inverted (the scramble scores HIGHER).
 *
 * This arithmetic is identical to the definition that lived inline in
 * tests/core/real-script-corpus.test.ts — extracted, not re-derived, so the
 * env-gated test and the always-on table-driven test cannot drift apart.
 * tests/core/auc.test.ts keeps a verbatim copy of the pre-extraction inline
 * loop and asserts the two agree on random inputs.
 */
export function computeAuc(intact: readonly number[], degraded: readonly number[]): number {
  if (intact.length === 0 || degraded.length === 0) {
    throw new Error('computeAuc: both bands must be non-empty');
  }
  let wins = 0;
  let ties = 0;
  for (const g of intact) {
    for (const b of degraded) {
      if (g > b) wins++;
      else if (g === b) ties++;
    }
  }
  return (wins + ties / 2) / (intact.length * degraded.length);
}

/** The seed the degradation uses for one script. Exported so the lock script
 *  can record the exact integer in the committed table, and the table test can
 *  re-derive it, without either re-implementing the seed template. */
export function degradationSeed(seedKey: string): number {
  return seedFromString(`degrade:${seedKey}`);
}

/**
 * The shuffle-drop degradation. `seedKey` is the manifest entry's `file`
 * value — the seed is derived from it, so a de-identification rename of that
 * field CHANGES the degradation and invalidates the committed table (which is
 * why the table records the seed integer and the recipe version).
 *
 * ── THE SEGMENTATION CHANGED ON 2026-09-12. READ THIS BEFORE LOCKING. ─────
 * Until then this function split on `/^(?=INT\.|EXT\.)/mi` and nothing else,
 * which means `EST.`, `I/E.`, `INT./EXT.` and Fountain forced headings
 * (a leading `.`) were INVISIBLE to it — all four are standard, and the AUC-24
 * corpus is real screenplays, which use them. Every such script silently
 * contributed a weaker degradation, or none at all: on a synthetic
 * mixed-heading script the old split saw 2 scenes where the doctor saw 5 and
 * the "degradation" returned its input unchanged
 * (docs/audits/2026-09-12-adversarial/engine-logic.md finding 12).
 *
 * It now segments with `scripts/lib/scene-segments.ts`, which reads the
 * DOCTOR'S OWN heading classification off `parseFountain`. Consequences, stated
 * rather than left to be discovered:
 *
 *   * On the 32 committed public-benchmark scripts the output is BYTE-IDENTICAL
 *     to the old recipe's (measured 2026-09-12: 0 of 32 differ), because all
 *     their headings are plain `INT.`/`EXT.` at column 0. So the public
 *     benchmark's two SHUFFLE_DROP floors did not move, and the fact that they
 *     did not is evidence the change is the narrow one claimed.
 *   * On the real AUC-24 corpus the output CAN differ, and where it differs the
 *     new recipe degrades MORE (it sees scenes the old one walked past).
 *   * The last recorded AUC-24 receipt, 0.731 (2026-07-11,
 *     docs/p1-benchmark/MEASUREMENT_RECEIPTS.md §2.1), was measured on the OLD
 *     recipe. `npm run lock-auc24` must be run on the NEW one before its number
 *     is compared to anything. Nothing was invalidated by this change because
 *     `tests/fixtures/auc24-table.json` does not exist yet — the table has never
 *     been locked — but a 0.731-vs-new comparison is a recipe change away from
 *     meaningless. AUC24_FLOOR was deliberately NOT touched here: raising or
 *     lowering a floor is a measurement's job.
 *   * `AUC24_DEGRADATION_ID` / `AUC24_DEGRADATION.recipe` below record the new
 *     segmentation, so a table produced by the old recipe is refused by
 *     `tests/core/auc24-table.test.ts` rather than silently compared.
 *
 * WHAT DID NOT CHANGE: the shuffle (seeded Fisher-Yates, `makePrng` +
 * `seedFromString("degrade:" + key)`), the drop rule (`index % 3 === 2`), the
 * head preservation, and the fact that every surviving scene is byte-identical
 * to its source. Only the answer to "where does a scene begin" moved.
 *
 * It stays a TOTAL function — a script with no headings comes back unchanged
 * rather than throwing, which `tests/core/auc.test.ts` pins. A no-op IS an
 * error, but it is the measurement's error to raise, not the recipe's: see
 * `assertDegradationChangedText`, which every call site that counts an
 * observation applies. Throwing here instead would make the recipe partial on a
 * legal input and break the byte-for-byte oracle that keeps it comparable.
 */
export function shuffleDropDegrade(text: string, seedKey: string): string {
  const { head, scenes } = segmentFountainScenes(text);
  const rng = makePrng(degradationSeed(seedKey));
  return reassembleFountainScenes(head, shuffle(rng, scenes).filter((_, i) => i % 3 !== 2));
}

/**
 * A degradation that produced its own input is an ERROR, never a 0.5 tie.
 *
 * WHY THIS IS A FUNCTION AND NOT AN `if` INSIDE EACH RECIPE (2026-09-12,
 * finding 12). `measurePublicBenchmark` skipped a script only when `apply`
 * returned `null`; nothing asserted `degraded !== text`. A recipe that silently
 * no-opped therefore scored a script against an identical copy of itself, and
 * the tie was counted as a legitimate observation contributing exactly 0.5 —
 * the one value that cannot be distinguished from "the engine read this pair and
 * could not separate it". That is a harness fault wearing a finding's clothes.
 *
 * Every call site that turns a degradation into an OBSERVATION applies this:
 * `scripts/lib/public-benchmark.ts`'s three `apply` functions,
 * `scripts/lock-auc24.mjs`, and `tests/core/real-script-corpus.test.ts`. The
 * recipes themselves stay total (see `shuffleDropDegrade` above).
 *
 * @throws when `degraded` is identical to `text`, naming the script.
 */
export function assertDegradationChangedText(
  degradationId: string,
  scriptLabel: string,
  text: string,
  degraded: string,
): string {
  if (degraded !== text) return degraded;
  throw new Error(
    `${degradationId} produced its input unchanged on ${scriptLabel}. A no-op degradation is a `
    + 'HARNESS FAULT, not a measurement: scoring a script against an identical copy of itself '
    + 'yields an exact tie, which is counted as 0.5 and is indistinguishable from "the engine '
    + 'could not separate this pair". Either the segmenter does not recognise this script\'s '
    + 'scene headings (scripts/lib/scene-segments.ts reads the doctor\'s own grammar — if it '
    + 'sees no scenes here, neither does the doctor), or the recipe has no effect at this length '
    + 'and the script must be SKIPPED by name rather than silently tied.',
  );
}

/**
 * CLIMAX_RELOCATE's defining property, asserted rather than assumed.
 *
 * The degradation is documented everywhere as "move the final scene to position
 * 1", and until 2026-09-12 it spliced at index 1 — position TWO — leaving the
 * script's most load-bearing position, its opening, intact
 * (finding 12). Nothing checked. This is the check: after the degradation the
 * FIRST scene must be the intact script's LAST, and the scene count must be
 * unchanged.
 *
 * @throws when the relocation did not land the final scene first.
 */
export function assertFinalSceneIsFirst(scriptLabel: string, text: string, degraded: string): string {
  const before = segmentFountainScenes(text).scenes;
  const after = segmentFountainScenes(degraded).scenes;
  if (after.length !== before.length) {
    throw new Error(
      `CLIMAX_RELOCATE changed the scene count on ${scriptLabel} (${before.length} -> ${after.length}). `
      + 'This degradation exists to isolate order-sensitivity from the 140/sceneCount scarcity '
      + 'term; if it moves the count it measures the same artifact as SHUFFLE_DROP.',
    );
  }
  if (before.length > 0 && after[0] !== before[before.length - 1]) {
    throw new Error(
      `CLIMAX_RELOCATE did not put the final scene first on ${scriptLabel}. Every document `
      + 'describing this degradation says "move the final scene to position 1"; a relocation that '
      + 'leaves the original opening in place is a materially weaker manipulation than the one '
      + 'claimed, and that discrepancy went unnoticed from the day it was written until '
      + '2026-09-12 because nothing asserted it.',
    );
  }
  return degraded;
}

/** One committed row: hashes and numbers only — never text, never a title. */
export interface Auc24Row {
  /** Manifest index (0..23). Pins the subset selection into the artifact. */
  manifestIndex: number;
  /** The intact script's content hash, as committed in real-corpus-manifest.json. */
  contentHash: string;
  /** `degradationSeed(entry.file)` — the integer that produced this row's shuffle. */
  seed: number;
  /** Health of the intact script (must equal the manifest's `health`). */
  intactHealth: number;
  /** Health of the same script after `shuffleDropDegrade`. */
  degradedHealth: number;
}

/** The committed artifact's shape (tests/fixtures/auc24-table.json). */
export interface Auc24Table {
  schemaVersion: 1;
  degradation: Record<string, unknown>;
  /** The floor this table was locked against; must equal AUC24_FLOOR. */
  floor: number;
  /** AUC the owner's run computed. Recomputed from `rows` by the table test. */
  measuredAuc: number;
  /** ISO date (YYYY-MM-DD) of the owner's run. */
  measuredAt: string;
  /** `git rev-parse HEAD` at lock time. */
  gitSha: string;
  /** sha256 of real-corpus-manifest.json's bytes at lock time — the table is
   *  only meaningful against the manifest whose first 24 rows it measured. */
  manifestHash: string;
  /** Total manifest entries seen at lock time — a corpus fingerprint. */
  manifestScriptCount: number;
  rows: Auc24Row[];
}

/** Recompute the table's AUC from its own rows. The whole point of the
 *  artifact: the statistic is a pure function of committed numbers. */
export function aucFromTable(rows: readonly Auc24Row[]): number {
  return computeAuc(rows.map((r) => r.intactHealth), rows.map((r) => r.degradedHealth));
}
