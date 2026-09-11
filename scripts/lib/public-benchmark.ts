// PUBLIC BENCHMARK — degradation discrimination on the DISTRIBUTABLE corpus,
// computed on every CI run, with no corpus mount and no owner-local step.
//
// ── Why this file exists ───────────────────────────────────────────────────
// ROADMAP P1 asks for "a legally distributable benchmark of real drafts
// running in CI". Until now the project had two discrimination instruments
// and neither ran in CI:
//
//   * tests/core/real-script-corpus.test.ts — the AUC-24 ratchet. Env-gated on
//     REAL_SCRIPT_CORPUS_DIR, and the corpus is local-only for copyright
//     reasons, so it SKIPS on every CI run.
//   * tests/core/auc24-table.test.ts — the same statistic recomputed from a
//     committed table of numbers. Real machinery, but the table itself can
//     only be produced by the owner (`npm run lock-auc24`) and is not
//     committed yet, so it SKIPS too.
//
// The text this file measures is already in the repository and already
// redistributable, so neither gate applies: CI can run the whole measurement
// end to end, from .fountain bytes to an AUC with a bootstrap interval. That
// is the entire claim being made here — an ALWAYS-ON number, not a better
// number.
//
// ── What this benchmark IS, stated before any result ───────────────────────
// A degradation-sensitivity regression benchmark on 32 short distributable
// screenplays. It answers "did a scoring change make the doctor less able to
// tell an intact script from a mechanically damaged copy of ITSELF, on text
// anyone can re-run?" It does NOT answer "does health track craft on real
// writing" — see PUBLIC_BENCHMARK_LIMITS below, which is quoted verbatim by
// the test, by `npm run benchmark:public`, and by the measurement doc, so the
// caveats cannot drift away from the number they qualify.
//
// ── Reuse, not reimplementation ────────────────────────────────────────────
// Every piece of arithmetic below is imported:
//
//   computeAuc, shuffleDropDegrade, degradationSeed  <- scripts/lib/auc.ts
//     (the AUC-24 statistic and the AUC-24 recipe, byte-for-byte the ones the
//      ratchet uses — so degradation (a) here is the ratchet's own recipe on
//      different text, not a lookalike)
//   mulberry32, pairwiseAuc, bootstrapCi,
//   degradeClimaxRelocate, BOOTSTRAP_DEFAULT        <- scripts/lib/rebuild-experiment-lib.mjs
//     (the four-degradation harness's PRNG, matched-pair AUC, seeded
//      percentile bootstrap, and the scene-count-preserving degradation)
//
// ONE function is adapted rather than imported, and this is the whole of the
// adaptation: `bootstrapCiAllPairs`. rebuild-experiment-lib's `bootstrapCi`
// hardcodes `pairwiseAuc` inside its resample loop, so it cannot produce an
// interval for the all-pairs Mann-Whitney statistic that scripts/lib/auc.ts
// defines. `bootstrapCiAllPairs` performs the IDENTICAL resample — same
// mulberry32, same default seed 42, same "resample n pairs with replacement",
// same 2.5/97.5 percentile bounds off a sorted Float64Array — and differs
// only in which statistic it recomputes inside the loop. Both intervals are
// reported for both degradations, so nothing rests on that choice.
//
// PURITY: this module reads .fountain files off disk (that is its job) and
// runs the doctor. It reads no environment variable and no clock.

import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { runScriptDoctor } from '../../server/nvm/analyze/doctor.ts';
import { REFERENCE_CORPUS } from '../../server/nvm/analyze/calibration/corpus.ts';
import {
  PUBLIC_FLOORS,
  PUBLIC_FLOOR_MARGIN,
  assertDegradationChangedText,
  assertFinalSceneIsFirst,
  computeAuc,
  degradationSeed,
  shuffleDropDegrade,
} from './auc.ts';
import {
  BOOTSTRAP_DEFAULT,
  bootstrapCi,
  degradeClimaxRelocate,
  degradeDialogueFlatten,
  mulberry32,
  pairwiseAuc,
} from './rebuild-experiment-lib.mjs';

export const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

// ───────────────────────────────────────────────────────────────────────────
// The corpus: what is in it, and on whose licence
// ───────────────────────────────────────────────────────────────────────────

/** One distributable set. `licence` and `provenance` are transcribed from the
 *  set's own licence/header file, named in `provenanceFile` — never asserted
 *  here independently of it. */
export interface CorpusSet {
  id: string;
  dir: string;
  provenanceFile: string;
  licence: string;
  provenance: string;
  /** What a reviewer must hold against any number this set contributes to. */
  caveat: string;
}

export const PUBLIC_CORPUS_SETS: readonly CorpusSet[] = [
  {
    id: 'cc0-live-action',
    dir: 'data/screenplays',
    provenanceFile: 'data/screenplays/LICENSE-live-action.md',
    licence: 'CC0 1.0 Universal (Public Domain Dedication)',
    provenance:
      'Original works written in 2026 for the STORYMACHINE benchmark corpus; '
      + 'LICENSE-live-action.md §Provenance: "None is copied from, adapted from, or based on '
      + 'any real, produced, copyrighted, or publicly-distributed screenplay."',
    caveat:
      'AGENT-AUTHORED. undertow.fountain\'s own boneyard says so and adds: "Not a substitute '
      + 'for professionally-authored \'real writing\' in P1\'s validation sense."',
  },
  {
    id: 'blind-pairs',
    dir: 'tests/fixtures/blind-pairs',
    provenanceFile: 'tests/fixtures/blind-pairs/README.md',
    licence: 'CC0 1.0 Universal, declared in each file\'s /* */ boneyard',
    provenance:
      'Six matched excellent/bad pairs written 2026-09-04 by an author who had read no '
      + 'scoring rule, lexicon, revision pass, calibration sample or prior discrimination '
      + 'number at the time of writing (README.md "The exact order of operations", steps 1-5; '
      + 'the write-first order is a fact in the git history).',
    caveat:
      'Twelve short scripts by a SINGLE author, not blind-labelled by independent readers, '
      + 'no held-out labels. The README says it: "evidence, not a benchmark."',
  },
];

/**
 * The calibration corpus is measured and printed, and is DELIBERATELY NOT part
 * of any asserted number.
 *
 * docs/p1-benchmark/RULE_CHANNEL_EVIDENCE_2026-08-24.md §0 finding 3 shows the
 * band ordering there is carried ENTIRELY by the weighted-rule channel —
 * zeroing that channel "breaks calibration band monotonicity outright". The
 * samples were hand-authored from the rules' own lexicons
 * (calibration/corpus.ts's header names the literal strings), so including
 * them would let the engine's recognition of its own vocabulary inflate a
 * benchmark whose whole purpose is to be independent of it. Reported as a
 * labelled CONTROL: a contrast to read the 32-script number against, never a
 * contributor to it.
 */
export const CALIBRATION_CONTROL_NOTE =
  'CONTROL ONLY — excluded from every asserted number. The calibration corpus was authored '
  + 'from the rules\' own lexicons, and RULE_CHANNEL_EVIDENCE_2026-08-24 §0 finding 3 shows its '
  + 'band ordering is carried entirely by the weighted-rule channel.';

/** One distributable script, as it sits on disk. */
export interface PublicScript {
  /** Repo-relative path. Also the degradation seed key — see `seed`. */
  file: string;
  /** Which CorpusSet it came from. */
  set: string;
  /** sha256 of the file's bytes (NOT of the trimmed text — this is a file
   *  fixture lock, so it must move if a single byte of the file moves). */
  sha256: string;
  text: string;
}

export function sha256Hex(bytes: Buffer | string): string {
  return createHash('sha256').update(bytes).digest('hex');
}

/** Every .fountain file in the two distributable sets, in a stable order:
 *  set order first (as declared above), then filename ascending. The order is
 *  part of the artifact — the manifest is committed in it. */
export function listPublicCorpus(root: string = REPO_ROOT): PublicScript[] {
  const out: PublicScript[] = [];
  for (const set of PUBLIC_CORPUS_SETS) {
    const dir = path.join(root, set.dir);
    const names = readdirSync(dir)
      .filter((n) => n.endsWith('.fountain'))
      .sort();
    for (const name of names) {
      const bytes = readFileSync(path.join(dir, name));
      out.push({
        file: `${set.dir}/${name}`,
        set: set.id,
        sha256: sha256Hex(bytes),
        text: bytes.toString('utf8'),
      });
    }
  }
  return out;
}

/** How many scripts the benchmark expects. A set that grows or shrinks must
 *  do so in a diff that also moves this constant and re-locks the manifest. */
export const PUBLIC_CORPUS_SIZE = 32;

// ───────────────────────────────────────────────────────────────────────────
// The pre-registered split
// ───────────────────────────────────────────────────────────────────────────

export const PARTITIONS = ['exploration', 'holdout'] as const;
export type Partition = (typeof PARTITIONS)[number];

/**
 * THE SPLIT RULE, stated once and implemented once.
 *
 * partition(file) = holdout iff parseInt(sha256(file bytes).slice(0, 8), 16) % 10 < 3
 *
 * Three properties this rule has and a hand-picked split does not:
 *
 *  1. NOBODY CHOSE IT. The assignment is a function of the file's own bytes.
 *     There is no version of this where a script lands in exploration because
 *     it scored inconveniently — the split was computed before any AUC was.
 *  2. ADDING A SCRIPT NEVER REASSIGNS AN EXISTING ONE. A rank-based rule
 *     ("sort by hash, take the first 30%") would reshuffle every assignment
 *     whenever the corpus grows; a per-file modulo cannot. That is what makes
 *     it a PRE-registration rather than a snapshot.
 *  3. EDITING A SCRIPT MOVES IT, LOUDLY. The hash is over file bytes, so any
 *     edit changes both the manifest row and possibly the partition, and both
 *     show up as a reviewable diff in tests/fixtures/public-benchmark-split.json.
 *
 * ~30% holdout was chosen for the same reason the P1 corpus split reserves a
 * test partition: a set nobody has looked at while tuning. At N=32 the
 * holdout is small and its own AUC is correspondingly wide — that is reported,
 * not hidden.
 *
 * KNOWN LIMITATION, stated here rather than discovered later: the blind-pairs
 * set contains near-duplicates by construction (an `-excellent` and a `-bad`
 * member share a premise, a ten-scene skeleton and a cast). A per-file rule
 * can put one member in exploration and its partner in holdout, so the
 * holdout is not fully independent of the exploration half for those scripts.
 * Keying the split on the pair instead would fix that and break property (1),
 * because "which member's hash names the pair" is a choice. The split is
 * per-file; the limitation is written down.
 */
export const PUBLIC_SPLIT_RULE =
  "holdout iff parseInt(sha256(file bytes).slice(0, 8), 16) % 10 < 3; otherwise exploration";

export function partitionFor(sha256: string): Partition {
  return parseInt(sha256.slice(0, 8), 16) % 10 < 3 ? 'holdout' : 'exploration';
}

/** Repo-relative paths of the two committed artifacts, and the one command
 *  that (re)produces them. One constant each, so the lock script, the tests,
 *  the gate reporter and the docs cannot disagree about where they are. */
export const PUBLIC_SPLIT_PATH = 'tests/fixtures/public-benchmark-split.json';
export const PUBLIC_MANIFEST_PATH = 'tests/fixtures/public-corpus-manifest.json';
export const PUBLIC_LOCK_COMMAND = 'npm run benchmark:public -- --lock';

// ───────────────────────────────────────────────────────────────────────────
// The two degradations
// ───────────────────────────────────────────────────────────────────────────

/**
 * (b) is the reason this benchmark reports two numbers instead of one.
 *
 * doctor.ts:465-467 is `scarcityPenalty(sceneCount) = 140 / max(sceneCount,1)`,
 * summed into craftPenalty at doctor.ts:657. The AUC-24 recipe drops every
 * third scene, so it moves that term directly — and doctor.ts's own comment at
 * :2092-2093 records what that means: "the doctor's shuffle-drop 'structural
 * discrimination' is almost entirely a scene-COUNT artifact (scarcity term AUC
 * 0.938; the weightedIssues rule channel AUC is 0.076)".
 *
 * The arithmetic predicts that artifact is ~10x larger at this corpus's
 * length. A 10-scene script dropped to 7 moves scarcity by 140/7 - 140/10 =
 * 6.00 points; on the private corpus's median 118 scenes the same recipe
 * moves it by 140/79 - 140/118 = 0.58 points. The prediction that follows —
 * "a short-script shuffle-drop benchmark would look far MORE separable" —
 * was MEASURED HERE AND IS FALSE, and the reason is worth carrying in the
 * code: over these 32 scripts the scarcity penalty rises by a mean of +5.693
 * points exactly as predicted, while the density penalty falls by a mean of
 * 7.625 points at the same time (dropping a third of the scenes removes a
 * larger share of the weighted issues than of the words, and
 * `density = weightedIssues / wordCount^0.7` is convex). Net, degradation
 * RAISES mean health by 1.93 points, and the AUC lands at 0.5586 —
 * indistinguishable from chance, not inflated.
 *
 * That is precisely why both degradations are reported. Neither number can be
 * argued from the formula alone; both have to be run.
 *
 * degradeClimaxRelocate moves the last scene to position 1 and changes nothing
 * else: the scene COUNT is identical, so the scarcity term cancels exactly
 * (verified — mean scarcity delta 0.000 over all 32 scripts) and what is left
 * is order-sensitivity. It is expected to be near chance, and is:
 * doctor.ts:2100 records act-swap AUC 0.48 -> 0.62 on the private corpus, the
 * P1 baseline reports CLIMAX_RELOCATE 0.523 on its 153-script test partition,
 * and this corpus gives 0.4443.
 *
 * THAT SENTENCE WAS FALSE UNTIL 2026-09-12. `degradeClimaxRelocate` spliced the
 * popped final scene in at index 1 — position TWO — so the original OPENING, the
 * script's most load-bearing position, stayed exactly where it was, while this
 * file's label, its `recipe` string, the measurement doc and the brain gate note
 * all said "position 1" (docs/audits/2026-09-12-adversarial/engine-logic.md
 * finding 12). Nothing asserted the claim, so nothing caught it. The code is now
 * what the documents describe, `assertFinalSceneIsFirst` checks it on every run,
 * and the two ORDER floors were re-locked from the corrected manipulation:
 * matched-pair 0.4219 -> 0.4063, all-pairs 0.4673 -> 0.4443. The corrected
 * version is the STRONGER manipulation and the engine reads it slightly WORSE,
 * which is the direction an order-blind score predicts.
 */
export interface Degradation {
  id: string;
  label: string;
  sceneCountPreserving: boolean;
  recipe: string;
  source: string;
  /** `measurement` — a channel whose reading is the finding. `control` — a
   *  manipulation the score is KNOWN to detect, present so a null reading on
   *  the measurement channels cannot be confused with a broken harness. See
   *  PUBLIC_CONTROL_RATIONALE below. */
  role: 'measurement' | 'control';
  apply: (script: PublicScript) => string | null;
  /** Seed integer for this script, or null for a deterministic recipe that
   *  uses no PRNG. Recorded per row so a run is reproducible from the file. */
  seedFor: (script: PublicScript) => number | null;
}

/**
 * WHY THERE IS A THIRD DEGRADATION, AND WHY IT IS NOT EVIDENCE.
 *
 * The two measurement channels both read chance (0.5586 and 0.4443, both 95%
 * intervals containing 0.5, both mean gaps running the wrong way). A reader
 * given only those two numbers cannot tell **"the score is blind to
 * mechanical damage"** from **"this harness never worked"** — and every null
 * result in the artifact depends on that distinction. A benchmark whose every
 * reading is null carries no information unless something in it responds.
 *
 * DIALOGUE_FLATTEN is that something. It replaces every dialogue and
 * parenthetical line with "Hello." and the score catches it on **32 of 32**
 * scripts, zero ties, mean gap +29.30 points. So the instrument demonstrably
 * separates an intact script from a damaged one on this exact corpus, with
 * these exact 32 files, through this exact code path — which is what makes
 * the other two readings the SCORE's and not the harness's.
 *
 * IT IS A CONTROL, NOT VALIDITY EVIDENCE, and the difference matters:
 *
 *  - The engine ships a deduction built specifically for this manipulation
 *    (doctor.ts's dialogue-degradation deduction, motivated in its own header
 *    by DIALOGUE_FLATTEN measuring 0.54 at feature scale). Catching a
 *    manipulation you built a detector for is a liveness check, not a
 *    discovery.
 *  - Roughly 17-18 of the 29.30 points come from OUTSIDE the
 *    density/scarcity craft formula — measured: the craft formula predicts
 *    75.20 for a flattened `the-ledger-excellent` and the doctor returns
 *    58.1. That is the point: the control exercises a second, independent
 *    scoring channel that neither SHUFFLE_DROP nor CLIMAX_RELOCATE touches,
 *    so "the harness reaches the whole engine" is checked rather than
 *    assumed.
 *  - Its matched-pair AUC is 1.0000 with zero ties, so if a future change
 *    breaks the harness this number moves first and moves unmistakably.
 *
 * The private-corpus lineage reports the same channel PASSING its own gate
 * (DIALOGUE_FLATTEN test AUC 0.990 against >= 0.80,
 * DISCRIMINATION_BASELINE_2026-07-29.md), which is the one place the public
 * and private benchmarks agree qualitatively.
 */
export const PUBLIC_CONTROL_RATIONALE =
  'DIALOGUE_FLATTEN is a POSITIVE CONTROL, not evidence: the engine ships a deduction built for '
  + 'exactly this manipulation. It is here so a near-chance reading on the other two channels '
  + 'cannot be dismissed as a broken harness — the instrument separates intact from damaged on '
  + '32 of 32 scripts here, so those readings are the score\'s, not the harness\'s.';

/**
 * EVERY `apply` BELOW ASSERTS THAT IT CHANGED THE TEXT (2026-09-12, finding 12).
 *
 * `measurePublicBenchmark` skipped a script only when `apply` returned `null`;
 * nothing checked `degraded !== text`. A recipe that silently no-opped therefore
 * scored a script against an identical copy of itself, and the resulting EXACT
 * TIE was counted as a legitimate observation contributing 0.5 — the one value
 * indistinguishable from "the engine read this pair and could not separate it".
 * That was reachable: before this change `shuffleDropDegrade` split on
 * `INT.`/`EXT.` only, so a script headed with `EST.`, `I/E.`, `INT./EXT.` or
 * forced `.HEADING` lines came back untouched.
 *
 * `null` (cannot degrade — too few scenes) and a no-op (could degrade and
 * didn't) are now different outcomes: the first is a named skip, the second is
 * an error that stops the run. `assertDegradationChangedText` /
 * `assertFinalSceneIsFirst` live in scripts/lib/auc.ts next to the recipe, and
 * the same guards are applied by scripts/lock-auc24.mjs and
 * tests/core/real-script-corpus.test.ts — every call site that turns a
 * degradation into an observation.
 */
export const PUBLIC_DEGRADATIONS: readonly Degradation[] = [
  {
    id: 'SHUFFLE_DROP',
    label: 'shuffle scenes AND drop every third (the AUC-24 recipe)',
    sceneCountPreserving: false,
    recipe:
      'seeded Fisher-Yates shuffle of all scenes — segmented by the doctor\'s own heading grammar '
      + '(scripts/lib/scene-segments.ts; INT./EXT./EST./I/E./INT./EXT. and forced .HEADING lines), '
      + 'not the INT./EXT.-only split used before 2026-09-12 — then drop every third scene of the '
      + 'shuffled order (index % 3 === 2); any pre-first-heading head is preserved verbatim',
    source: 'scripts/lib/auc.ts shuffleDropDegrade (imported verbatim — the AUC-24 ratchet\'s own recipe)',
    role: 'measurement',
    apply: (s) => assertDegradationChangedText(
      'SHUFFLE_DROP', s.file, s.text, shuffleDropDegrade(s.text, s.file),
    ),
    seedFor: (s) => degradationSeed(s.file),
  },
  {
    id: 'CLIMAX_RELOCATE',
    label: 'move the final scene to position 1 (scene count preserved)',
    sceneCountPreserving: true,
    recipe:
      'pop the last scene and put it FIRST — position one, as every document describing this '
      + 'degradation has always said; it spliced at index 1 (position TWO, leaving the original '
      + 'opening in place) until 2026-09-12. Head and every scene body unchanged',
    source: 'scripts/lib/rebuild-experiment-lib.mjs degradeClimaxRelocate (imported verbatim)',
    role: 'measurement',
    apply: (s) => {
      const degraded = degradeClimaxRelocate(s.text) as string | null;
      if (degraded === null) return null;
      return assertFinalSceneIsFirst(
        s.file, s.text, assertDegradationChangedText('CLIMAX_RELOCATE', s.file, s.text, degraded),
      );
    },
    seedFor: () => null,
  },
  {
    id: 'DIALOGUE_FLATTEN',
    label: 'replace every dialogue line with "Hello." (POSITIVE CONTROL — the score must catch this)',
    sceneCountPreserving: true,
    recipe:
      'normalize, parse, and replace the text of every dialogue and parenthetical line with '
      + '"Hello."; scene headings, action and scene count are untouched',
    source: 'scripts/lib/rebuild-experiment-lib.mjs degradeDialogueFlatten (imported verbatim)',
    role: 'control',
    apply: (s) => {
      const degraded = degradeDialogueFlatten(s.text) as string | null;
      if (degraded === null) return null;
      // NOTE: this recipe normalises its input first, so `degraded !== text`
      // holds for all 32 scripts whether or not a line was flattened
      // (normalizeScreenplay changes the bytes of all 32 and the health of
      // none — measured, 2026-09-12 audit's "what I could not break" §4). The
      // guard is kept anyway: it is the one that would fire if a future
      // normaliser became a no-op AND the script had no dialogue, which is
      // exactly the silent-tie case.
      return assertDegradationChangedText('DIALOGUE_FLATTEN', s.file, s.text, degraded);
    },
    seedFor: () => null,
  },
];

// ───────────────────────────────────────────────────────────────────────────
// The two statistics, and intervals for both
// ───────────────────────────────────────────────────────────────────────────

/** One script's intact and degraded health, plus the scene counts that make
 *  the scene-count-artifact argument checkable rather than asserted. */
export interface HealthPair {
  file: string;
  set: string;
  partition: Partition;
  seed: number | null;
  real: number;
  degraded: number;
  intactScenes: number;
  degradedScenes: number;
}

export interface Interval {
  lo: number;
  hi: number;
}

/**
 * Bootstrap interval for the ALL-PAIRS statistic. See this file's header for
 * why it is adapted rather than imported: rebuild-experiment-lib's bootstrapCi
 * hardcodes pairwiseAuc in its loop. Everything else — the PRNG, the default
 * seed, the resample shape, the percentile bounds, the Float64Array sort — is
 * the same procedure, so the two intervals below are comparable to each other.
 */
export function bootstrapCiAllPairs(
  pairs: readonly HealthPair[],
  iterations: number = BOOTSTRAP_DEFAULT,
  seed = 42,
): Interval {
  if (pairs.length === 0) return { lo: NaN, hi: NaN };
  const rng = mulberry32(seed);
  const n = pairs.length;
  const aucs = new Float64Array(iterations);
  for (let i = 0; i < iterations; i++) {
    const intact: number[] = [];
    const degraded: number[] = [];
    for (let j = 0; j < n; j++) {
      const pick = pairs[Math.floor(rng() * n)];
      intact.push(pick.real);
      degraded.push(pick.degraded);
    }
    aucs[i] = computeAuc(intact, degraded);
  }
  const sorted = Array.from(aucs).sort((a, b) => a - b);
  return { lo: sorted[Math.floor(0.025 * iterations)], hi: sorted[Math.floor(0.975 * iterations)] };
}

export interface DegradationResult {
  id: string;
  label: string;
  sceneCountPreserving: boolean;
  recipe: string;
  source: string;
  role: 'measurement' | 'control';
  n: number;
  /** Sign counts behind the AUC. `tied` is load-bearing: on CLIMAX_RELOCATE
   *  11 of 32 pairs are EXACT ties because 10 scripts sit pinned at the
   *  density penalty's 10-point cap, so a third of that statistic's N cannot
   *  move at all and contributes 0.5 apiece by construction. An interval that
   *  looks narrow because a third of its sample is frozen is not a more
   *  precise measurement, and the number is printed so nobody reads it as one. */
  ordered: number;
  inverted: number;
  tied: number;
  /** Scripts the recipe refused (too few scenes). Reported, never silently dropped. */
  skipped: string[];
  /**
   * SECONDARY. Mann-Whitney over the full intact x degraded grid
   * (scripts/lib/auc.ts computeAuc) — the AUC-24 statistic's definition.
   * Reported because that is the lineage the shuffle-drop recipe comes from,
   * and floored, but it is NOT the primary reading: it compares script A
   * intact against script B degraded, mixing between-script variance (author,
   * length, content) into a comparison this design controls by pairing.
   */
  aucAllPairs: number;
  /**
   * PRIMARY. Matched pair — each script against a degraded copy of ITSELF
   * (rebuild-experiment-lib pairwiseAuc), which is the estimator this design
   * earns by construction.
   *
   * It is also the LESS FLATTERING of the two in 7 of the 8 cells this
   * benchmark has measured across main and the three scoring branches, so
   * quoting all-pairs as the headline would systematically report the
   * friendlier number and would let a regression visible only in the paired
   * statistic pass CI. Both are floored (see scripts/lib/auc.ts), so neither
   * can move without an assertion noticing.
   */
  aucPaired: number;
  ciAllPairs: Interval;
  ciPaired: Interval;
  bootstrapIterations: number;
  bootstrapSeed: number;
  /** Mean (intact - degraded) health, in points. */
  meanGap: number;
  pairs: HealthPair[];
}

/** Everything a run produces. Rendered by `npm run benchmark:public`, asserted
 *  by tests/core/public-benchmark.test.ts, transcribed into the measurement
 *  doc — one shape, so the three cannot disagree. */
export interface BenchmarkResult {
  scripts: ScriptRow[];
  degradations: DegradationResult[];
  calibrationControl: CalibrationControlResult | null;
}

/**
 * `verdict` is OPTIONAL on ScriptDoctorReport (types.ts:329) — a report can
 * come back without one. Locking a blank cell in that case would make "the
 * doctor stopped producing verdicts" look identical to "this row is fine", so
 * the absence is recorded as a value and the test asserts no row carries it.
 */
export const MISSING_VERDICT = 'NO-VERDICT';

/** A manifest row: what gets locked. Numbers and a hash — no screenplay text. */
export interface ScriptRow {
  file: string;
  sha256: string;
  sceneCount: number;
  words: number;
  health: number;
  verdict: string;
}

export interface CalibrationControlResult {
  note: string;
  bands: { band: string; n: number; meanHealth: number }[];
  strongOverTroubled: { ordered: number; of: number; meanGap: number };
}

/**
 * Score every distributable script intact, then under each degradation.
 *
 * `onScript` exists so the CLI can show progress without this module printing
 * anything (it is imported by a test; a library that writes to stdout when a
 * test imports it is a library that fails `check-no-console` reviews for the
 * wrong reason).
 */
export async function measurePublicBenchmark(options: {
  root?: string;
  bootstrapIterations?: number;
  bootstrapSeed?: number;
  includeCalibrationControl?: boolean;
  onScript?: (file: string, index: number, total: number) => void;
} = {}): Promise<BenchmarkResult> {
  const root = options.root ?? REPO_ROOT;
  const iterations = options.bootstrapIterations ?? BOOTSTRAP_DEFAULT;
  const seed = options.bootstrapSeed ?? 42;
  const scripts = listPublicCorpus(root);

  const rows: ScriptRow[] = [];
  const intactByFile = new Map<string, { health: number; sceneCount: number }>();
  for (const [i, script] of scripts.entries()) {
    options.onScript?.(script.file, i, scripts.length);
    const report = await runScriptDoctor(script.text);
    rows.push({
      file: script.file,
      sha256: script.sha256,
      sceneCount: report.sceneCount,
      words: report.wordCount,
      health: report.health,
      verdict: report.verdict ?? MISSING_VERDICT,
    });
    intactByFile.set(script.file, { health: report.health, sceneCount: report.sceneCount });
  }

  const degradations: DegradationResult[] = [];
  for (const degradation of PUBLIC_DEGRADATIONS) {
    const pairs: HealthPair[] = [];
    const skipped: string[] = [];
    for (const script of scripts) {
      const degradedText = degradation.apply(script);
      if (degradedText === null) {
        skipped.push(script.file);
        continue;
      }
      const degradedReport = await runScriptDoctor(degradedText);
      const intact = intactByFile.get(script.file)!;
      pairs.push({
        file: script.file,
        set: script.set,
        partition: partitionFor(script.sha256),
        seed: degradation.seedFor(script),
        real: intact.health,
        degraded: degradedReport.health,
        intactScenes: intact.sceneCount,
        degradedScenes: degradedReport.sceneCount,
      });
    }
    degradations.push({
      id: degradation.id,
      label: degradation.label,
      sceneCountPreserving: degradation.sceneCountPreserving,
      recipe: degradation.recipe,
      source: degradation.source,
      role: degradation.role,
      n: pairs.length,
      ordered: pairs.filter((p) => p.real > p.degraded).length,
      inverted: pairs.filter((p) => p.real < p.degraded).length,
      tied: pairs.filter((p) => p.real === p.degraded).length,
      skipped,
      aucAllPairs: computeAuc(pairs.map((p) => p.real), pairs.map((p) => p.degraded)),
      aucPaired: pairwiseAuc(pairs) as number,
      ciAllPairs: bootstrapCiAllPairs(pairs, iterations, seed),
      ciPaired: bootstrapCi(pairs, iterations, seed) as Interval,
      bootstrapIterations: iterations,
      bootstrapSeed: seed,
      meanGap: pairs.reduce((acc, p) => acc + (p.real - p.degraded), 0) / pairs.length,
      pairs,
    });
  }

  return {
    scripts: rows,
    degradations,
    calibrationControl: options.includeCalibrationControl
      ? await measureCalibrationControl()
      : null,
  };
}

/** The labelled control. Scored, printed, never asserted against a floor and
 *  never mixed into the 32-script statistic. */
export async function measureCalibrationControl(): Promise<CalibrationControlResult> {
  const byBand = new Map<string, number[]>();
  const health = new Map<string, number>();
  for (const sample of REFERENCE_CORPUS) {
    const report = await runScriptDoctor(sample.fountain);
    if (!byBand.has(sample.band)) byBand.set(sample.band, []);
    byBand.get(sample.band)!.push(report.health);
    health.set(sample.label, report.health);
  }
  const strong = REFERENCE_CORPUS.filter((s) => s.band === 'strong');
  const troubled = REFERENCE_CORPUS.filter((s) => s.band === 'troubled');
  // Pair them by position, exactly as docs/p1-benchmark/BLIND_PAIRS_2026-09-04.md
  // reports "5 of 5 with a 25.32 gap" — the strong and troubled bands hold five
  // samples each and are compared index-wise.
  let ordered = 0;
  let gapSum = 0;
  const n = Math.min(strong.length, troubled.length);
  for (let i = 0; i < n; i++) {
    const good = health.get(strong[i].label)!;
    const bad = health.get(troubled[i].label)!;
    if (good > bad) ordered += 1;
    gapSum += good - bad;
  }
  return {
    note: CALIBRATION_CONTROL_NOTE,
    bands: [...byBand.entries()].map(([band, values]) => ({
      band,
      n: values.length,
      meanHealth: values.reduce((a, b) => a + b, 0) / values.length,
    })),
    strongOverTroubled: { ordered, of: n, meanGap: n === 0 ? NaN : gapSum / n },
  };
}

// ───────────────────────────────────────────────────────────────────────────
// What the number can and cannot say
// ───────────────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────────────
// Re-locking the floor constants
// ───────────────────────────────────────────────────────────────────────────

/** Repo-relative path of the file whose floor constants `--lock` rewrites. */
export const AUC_LIB_PATH = 'scripts/lib/auc.ts';

/** floor = round4(measured - margin). The ONE place that rule is arithmetic
 *  rather than prose; scripts/lib/auc.ts states it and this implements it. */
export function floorFor(measured: number, margin: number = PUBLIC_FLOOR_MARGIN): number {
  return Math.round((measured - margin) * 1e4) / 1e4;
}

export interface FloorRelock {
  /** False when ANY constant could not be located. Nothing is rewritten then,
   *  and the CLI turns this into a non-zero exit. */
  ok: boolean;
  /** The rewritten source. Equal to the input when `ok` is false. */
  source: string;
  /** One `before -> after` line per constant, for the operator to read. */
  lines: string[];
  /** Constants that could not be located, with why. */
  missing: string[];
}

/**
 * Rewrite the six floor constants in `scripts/lib/auc.ts` from a measurement.
 *
 * PURE, and living here rather than in the CLI, for one reason: both of its
 * outcomes have to be testable, and neither is testable if the only way to
 * reach them is to run a script that edits the real `auc.ts` in place. The CLI
 * does the reading, the writing and the exit code; this does the decision.
 *
 * It edits ONLY lines of the exact shape `export const NAME = <number>;` for
 * the names in PUBLIC_FLOORS, and refuses — writing nothing at all, not even
 * the constants it did find — if any one of them is missing. A partial re-lock
 * would leave some floors from this run and some from an older one, which is
 * the one state nobody could reason about afterwards.
 */
export function relockFloorSource(
  source: string,
  degradations: readonly DegradationResult[],
  margin: number = PUBLIC_FLOOR_MARGIN,
): FloorRelock {
  let next = source;
  const lines: string[] = [];
  const missing: string[] = [];

  for (const floor of PUBLIC_FLOORS) {
    const d = degradations.find((x) => x.id === floor.degradation);
    if (!d) {
      missing.push(`${floor.constant} (no ${floor.degradation} result in this run)`);
      continue;
    }
    const measured = floor.statistic === 'paired' ? d.aucPaired : d.aucAllPairs;
    const value = floorFor(measured, margin);
    const pattern = new RegExp(`(export const ${floor.constant} = )(-?[0-9.]+)(;)`);
    if (!pattern.test(next)) {
      missing.push(`${floor.constant} (no single-line \`export const … = <number>;\` in ${AUC_LIB_PATH})`);
      continue;
    }
    next = next.replace(pattern, `$1${value}$3`);
    lines.push(
      `  ${floor.constant.padEnd(38)} ${String(floor.value).padStart(7)} -> ${String(value).padStart(7)}`
      + `   (measured ${measured.toFixed(4)}${floor.primary ? ', PRIMARY' : ''}`
      + `${value === floor.value ? ', unchanged' : ''})`,
    );
  }

  if (missing.length > 0) return { ok: false, source, lines: [], missing };
  return { ok: true, source: next, lines, missing };
}

/**
 * Quoted verbatim by the test's failure message, by `npm run benchmark:public`,
 * and by docs/p1-benchmark/PUBLIC_BENCHMARK_2026-09-06.md. A caveat that lives
 * in one file next to the number cannot be left behind when the number is
 * copied somewhere else.
 */
/** The count of scripts sitting EXACTLY on the density penalty's 10-point cap
 *  plus a 14.0 scarcity term — health 76.0 — which is what made a third of
 *  CLIMAX_RELOCATE's pairs exact ties before 2026-09-07. Computed from the run
 *  rather than written down, because it is the number that went stale first. */
export const PINNED_HEALTH = 76.0;

export function pinnedScriptCount(result: BenchmarkResult): number {
  return result.scripts.filter((r) => r.health === PINNED_HEALTH).length;
}

/** The blind-pairs craft reading, recomputed from the SAME intact healths this
 *  benchmark already scored: six `<name>-excellent` / `<name>-bad` pairs, and
 *  how many of them the doctor orders the right way round. It is a different
 *  question from every degradation here (craft, not mechanical damage), and it
 *  is quoted in the caveats, so it is derived from the run instead of being
 *  retyped. */
export function blindPairOrdering(result: BenchmarkResult): { ordered: number; of: number; meanGap: number } {
  const health = new Map(result.scripts.map((r) => [r.file, r.health]));
  const stems = [...new Set(
    result.scripts
      .map((r) => /blind-pairs\/(.+)-(excellent|bad)\.fountain$/.exec(r.file)?.[1])
      .filter((x): x is string => typeof x === 'string'),
  )].sort();
  let ordered = 0;
  let gapSum = 0;
  for (const stem of stems) {
    const good = health.get(`tests/fixtures/blind-pairs/${stem}-excellent.fountain`);
    const bad = health.get(`tests/fixtures/blind-pairs/${stem}-bad.fountain`);
    if (good === undefined || bad === undefined) continue;
    if (good > bad) ordered++;
    gapSum += good - bad;
  }
  return { ordered, of: stems.length, meanGap: stems.length === 0 ? NaN : gapSum / stems.length };
}

/**
 * The caveats, rendered FROM the measurement rather than written beside it.
 *
 * WHY THIS IS A FUNCTION (2026-09-11, round 2 item 5). It used to be a frozen
 * string constant, and an independent reviewer found `npm run benchmark:public`
 * printing five numbers its own table contradicted forty lines above in the
 * same output: "Shuffle-drop 0.5313 / 0.5586" under a table reading
 * 0.8750 / 0.8306, "ALL FOUR intervals contain 0.5" when the shuffle-drop
 * intervals no longer did, "Control: 1.0000 / 0.9473" against a measured
 * 1.0000 / 1.0000, "Ten of the 32 scripts sit pinned ... 11 of 32 pairs are
 * EXACT ties" against 0 pinned and 1 tie, and "1 of 6" blind pairs against 4
 * of 6. This file's own header promises the caveats "cannot drift away from
 * the number they qualify"; as a constant, nothing held it to that.
 *
 * Every live number below is now interpolated from the `BenchmarkResult`, so
 * drift is not possible by construction, and
 * tests/core/public-benchmark.test.ts additionally parses the rendered text
 * and asserts that every four-decimal figure and every "N of 32" / "N of 6"
 * count in it is a value the same run produced.
 */
export function publicBenchmarkLimits(result: BenchmarkResult): string {
  const by = new Map(result.degradations.map((d) => [d.id, d]));
  const shuffle = by.get('SHUFFLE_DROP');
  const order = by.get('CLIMAX_RELOCATE');
  const control = by.get('DIALOGUE_FLATTEN');
  const f4 = (n: number | undefined): string => (n === undefined ? 'n/a' : n.toFixed(4));
  const iv = (i: Interval | undefined): string => (i === undefined ? '[n/a]' : `[${i.lo.toFixed(4)}, ${i.hi.toFixed(4)}]`);
  const contains = (i: Interval | undefined): boolean => i !== undefined && i.lo <= 0.5 && i.hi >= 0.5;
  const measurementIntervals = [shuffle?.ciPaired, shuffle?.ciAllPairs, order?.ciPaired, order?.ciAllPairs];
  const crossing = measurementIntervals.filter(contains).length;
  const pinned = pinnedScriptCount(result);
  const blind = blindPairOrdering(result);
  const orderTied = order?.tied ?? 0;
  const orderMovable = (order?.n ?? 0) - orderTied;
  const labelled: Array<[string, Interval | undefined]> = [
    ['shuffle-drop matched-pair', shuffle?.ciPaired],
    ['shuffle-drop all-pairs', shuffle?.ciAllPairs],
    ['climax-relocate matched-pair', order?.ciPaired],
    ['climax-relocate all-pairs', order?.ciAllPairs],
  ];
  const crossingNames = labelled.filter(([, i]) => contains(i)).map(([n]) => n);
  const intervalVerdict = crossing === measurementIntervals.length
    ? 'ALL FOUR of the measurement intervals contain 0.5: on this corpus the doctor does not'
      + ' reliably prefer\n    an intact script to a mechanically damaged copy of itself.'
    : crossing === 0
      ? 'NONE of the four measurement intervals contains 0.5.'
      : `${crossing} of the four measurement intervals still contain 0.5 — ${crossingNames.join(', ')}`
        + ' —\n    so whatever those channels measure is not yet separated from chance.';
  return [
    'WHAT THIS BENCHMARK CAN SHOW',
    '  * That the doctor still separates an intact script from a mechanically damaged copy of',
    '    ITSELF, recomputed from committed text on every CI run, by anyone, with no corpus mount.',
    '  * That a scoring change did or did not move that separation — as a numeric diff, with a',
    '    seeded bootstrap interval, on a pre-registered split.',
    '  * The scene-count question, directly rather than by arithmetic: (a) changes scene count and',
    '    (b) does not, so the two numbers can be read against each other. On this corpus that',
    '    comparison refuted the prediction that (a) would be inflated — see the header of',
    '    PUBLIC_DEGRADATIONS for the measured decomposition (+5.693 scarcity, -7.632 density).',
    '  * That the HARNESS works, separately from what it reads. DIALOGUE_FLATTEN is a positive',
    `    control: the score catches it on ${control?.ordered ?? 0} of ${control?.n ?? 0} scripts with ${control?.tied ?? 0} ties (matched-pair AUC`,
    `    ${f4(control?.aucPaired)}, ${(control?.meanGap ?? 0).toFixed(2)} points). So a near-chance reading on the other two channels is the`,
    '    SCORE being blind, not the instrument being broken — the one hypothesis a benchmark',
    '    with only null readings can never rule out.',
    '',
    'WHAT IT SAYS TODAY (this tree, this run; matched-pair is the primary statistic)',
    `  * Shuffle-drop ${f4(shuffle?.aucPaired)} matched-pair ${iv(shuffle?.ciPaired)} / ${f4(shuffle?.aucAllPairs)} all-pairs ${iv(shuffle?.ciAllPairs)}.`,
    `    Climax-relocate ${f4(order?.aucPaired)} ${iv(order?.ciPaired)} / ${f4(order?.aucAllPairs)} ${iv(order?.ciAllPairs)}.`,
    `    ${intervalVerdict}`,
    `    Control: ${f4(control?.aucPaired)} / ${f4(control?.aucAllPairs)}.`,
    '',
    'WHAT IT CANNOT SHOW',
    `  * A moving reading on every CLIMAX_RELOCATE pair. ${pinned} of the ${result.scripts.length} scripts sit pinned at exactly`,
    `    health ${PINNED_HEALTH.toFixed(1)} (density penalty at its 10-point cap plus a 14.0 scarcity term), and ${orderTied} of`,
    `    ${order?.n ?? 0} pairs ${orderTied === 1 ? 'is an EXACT tie' : 'are EXACT ties'}, contributing 0.5 apiece by construction. That channel's point`,
    `    estimate rests on ${orderMovable} movable scripts, and a narrow interval there can reflect pinning`,
    '    rather than precision. Do not read it as the more precise of the two.',
    '  * A held-out result. The split is PRE-REGISTERED AND REPORTED, not used for evaluation:',
    '    every floor was locked from all 32 scripts, the five holdout files included, so no',
    '    held-out evaluation has taken place and that holdout is already spent against these',
    '    floors. ROADMAP P1 asks for held-out evaluation by name; this is not it. The split earns',
    '    its keep the first time a future change is tuned on exploration and checked on holdout',
    '    against floors re-locked from exploration alone.',
    '  * That health tracks CRAFT. Mechanical damage is not bad writing. The blind-pairs result',
    `    (${blind.ordered} of ${blind.of} ordered, mean gap ${blind.meanGap.toFixed(4)}, tests/core/blind-pairs-discrimination.test.ts) is the`,
    '    craft question, and it is a different measurement on six pairs — inside what chance',
    '    produces either way, so it is a number to re-measure on more pairs, not a result.',
    '  * That any number here transfers to feature-length real writing. N=32, 9-14 scenes each.',
    '    ARC_DED_MIN_SCENES is 15 (doctor.ts), so THE one feature-scale deduction that is wired',
    '    into health never fires on this corpus at all — this benchmark measures a strictly',
    '    smaller engine than the AUC-24 ratchet does. (This line named CLIMAX_DED_MIN_SCENES too,',
    '    until 2026-09-12. That constant gates climaxZoneDecayDeduction, which is EXPORTED and',
    '    wired into nothing — doctor.ts records the revert: it over-fired on real scripts with',
    '    naturally flat climaxes. Saying it "never fires at this length" implied it fires at some',
    '    length. It fires at no length.) Since 2026-09-11 the scarcity term also',
    '    saturates at 12 scenes, which on THIS corpus still moves (every document is 6-14',
    '    scenes) and on a feature-length corpus contributes exactly zero to shuffle-drop.',
    '  * Anything about the AUC-24 >= 0.622 ratchet. Different corpus, different denominator,',
    "    different script length. The owner's `npm run measure-real` run is what confirms or",
    '    refutes transfer; nothing in this repository can.',
    '  * Craft validity of the SOURCE TEXT. Twenty of the 32 scripts are agent-authored and the',
    "    other twelve are one human author's, unlabelled by independent readers.",
  ].join('\n');
}
