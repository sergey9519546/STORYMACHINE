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
// PURITY: nothing here reads the filesystem, the environment, or the clock.

import { makePrng, seedFromString, shuffle } from '../../server/nvm/repro/seed.ts';

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
 * These two are NOT the AUC-24 ratchet and must never be compared to it, to
 * each other's lineage, or to the 761-script P1 baseline. They belong here,
 * next to AUC24_FLOOR, for exactly the reason AUC24_FLOOR is here: one
 * definition of a floor, imported everywhere, so it cannot be raised in one
 * file and left behind in another.
 *
 * WHAT THEY MEASURE. scripts/lib/public-benchmark.ts scores the 32
 * DISTRIBUTABLE .fountain files (20 CC0 scripts in data/screenplays + 12
 * blind-pair fixtures) intact and then degraded, on every CI run, with no
 * corpus mount — tests/core/public-benchmark.test.ts. Both floors are on the
 * ALL-PAIRS Mann-Whitney statistic that computeAuc below defines, so the two
 * numbers are directly comparable to each other; that comparison IS the
 * finding they exist to protect.
 *
 * WHY TWO. PUBLIC_SHUFFLE_DROP_FLOOR uses shuffleDropDegrade — the AUC-24
 * recipe, which drops every third scene and therefore moves
 * `scarcityPenalty = 140/sceneCount` (doctor.ts:465-467) directly.
 * PUBLIC_ORDER_FLOOR uses degradeClimaxRelocate, which preserves scene count
 * exactly, so the scarcity term cancels (measured: mean scarcity delta
 * 0.000 over all 32 scripts) and what is left is order-sensitivity alone.
 *
 * BOTH FLOORS ARE NEAR CHANCE, AND THAT IS THE CURRENT TRUTH, NOT A TARGET.
 * Measured on this tree, 2026-09-06: shuffle-drop 0.5586 (95% CI
 * [0.4219, 0.6973]), climax-relocate 0.4673 (95% CI [0.4014, 0.5264]). Both
 * intervals contain 0.5. On this corpus the doctor does not reliably prefer
 * an intact script to a mechanically damaged copy of itself under either
 * recipe. A floor set at a near-chance measurement is a ratchet against
 * getting WORSE at something the engine is already bad at, which is the only
 * honest thing to assert here. Raising either number is a measurement's job,
 * never an edit's.
 *
 * THE PREDICTION THIS REFUTED, kept because it is the useful part. The
 * scene-count-artifact argument (doctor.ts:2092-2093 — scarcity AUC 0.938,
 * rule channel 0.076) predicts that dropping every third scene of a 10-scene
 * script adds 140/7 - 140/10 = 6.00 points of scarcity penalty, against 0.58
 * points at the private corpus's median 118 scenes, and therefore that a
 * short-script shuffle-drop benchmark would look ~10x MORE separable. It does
 * not. Measured decomposition over these 32 scripts: the scarcity penalty
 * does rise by a mean of +5.693 points, and the DENSITY penalty falls by a
 * mean of 7.625 points at the same time, because dropping a third of the
 * scenes removes a larger share of the weighted issues than of the words and
 * `density = weightedIssues / wordCount^0.7` is convex. Net mean health
 * MOVES UP 1.93 points under degradation. The prediction was right about the
 * scarcity term and wrong about the total, which is exactly why the floor is
 * set from a measurement instead of from the arithmetic.
 *
 * HOW THEY WERE SET. floor = round4(measured - PUBLIC_FLOOR_MARGIN), from
 * `npm run benchmark:public` on this tree. The measured values, the bootstrap
 * intervals, N, and the per-script pairs are in
 * docs/p1-benchmark/PUBLIC_BENCHMARK_2026-09-06.md and in the PUBLIC-CORPUS
 * section of docs/p1-benchmark/MEASUREMENT_RECEIPTS.md.
 */
export const PUBLIC_SHUFFLE_DROP_FLOOR = 0.5386;

/** See PUBLIC_SHUFFLE_DROP_FLOOR above. Near chance, deliberately: measured
 *  0.4673, and its own 95% CI [0.4014, 0.5264] contains 0.5. */
export const PUBLIC_ORDER_FLOOR = 0.4473;

/**
 * The margin between a fresh public-benchmark measurement and the floor
 * locked from it. Smaller than AUC24_FLOOR_MARGIN (0.05) on purpose: this
 * measurement is RE-RUN ON EVERY CI RUN over committed text, so it carries no
 * corpus-drift or re-measurement uncertainty — the only slack it needs is for
 * a genuinely intended scoring change, and a 0.02 band keeps the ratchet
 * tight enough to notice one. A change that moves either statistic by more
 * than this is supposed to fail, be looked at, and be re-locked deliberately.
 */
export const PUBLIC_FLOOR_MARGIN = 0.02;

/** Identifies the exact degradation the committed table was produced by. Bump
 *  the version if the recipe, the PRNG, or the seed template ever changes —
 *  a table produced by a different recipe is not comparable, and the
 *  table-driven test refuses it. */
export const AUC24_DEGRADATION_ID = 'shuffle-drop/v1';

/** Human-readable description of `AUC24_DEGRADATION_ID`, embedded in the
 *  committed table so the artifact is self-describing. */
export const AUC24_DEGRADATION = {
  id: AUC24_DEGRADATION_ID,
  recipe:
    'seeded Fisher-Yates shuffle of all INT./EXT. scenes, then drop every third '
    + 'scene of the shuffled order (index % 3 === 2); any pre-first-slugline head '
    + 'is preserved verbatim at the top',
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
 */
export function shuffleDropDegrade(text: string, seedKey: string): string {
  const parts = text.split(/^(?=INT\.|EXT\.)/mi);
  const head = /^(INT\.|EXT\.)/i.test(parts[0]) ? '' : parts.shift() ?? '';
  const scenes = parts.filter((x) => /^(INT\.|EXT\.)/i.test(x));
  const rng = makePrng(degradationSeed(seedKey));
  return head + shuffle(rng, scenes).filter((_, i) => i % 3 !== 2).join('');
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
