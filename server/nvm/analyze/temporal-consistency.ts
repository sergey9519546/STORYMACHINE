/**
 * TRACE §13 Temporal-Consistency Detectors
 * 
 * Implements Allen's Interval Algebra (13 relations) for screenplay temporal reasoning.
 * Detects transitive contradictions, impossible orderings, and timeline violations.
 * 
 * Source: RESEARCH_INTEGRATION_2026-07-11.md (TRACE §13.2)
 *         STORYMACHINE_RESEARCH_AND_MATH.md §3.2 (Allen Interval Algebra)
 * 
 * Allen's 13 Relations (mutually exclusive):
 * - before(A,B): A entirely before B, gap exists
 * - meets(A,B): A ends exactly when B starts
 * - overlaps(A,B): A starts first, they overlap, B ends last
 * - starts(A,B): A and B start together, A ends first
 * - during(A,B): A entirely contained within B
 * - finishes(A,B): A and B end together, A starts later
 * - equals(A,B): identical intervals
 * - [7 inverses of the above]
 * 
 * Complexity: O(n³) constraint propagation, sub-10ms at screenplay scale (verified)
 *
 * ── Status (2026-08-03 wiring audit) ────────────────────────────────────────
 * DIAGNOSTIC-WIRED as of this audit: `auditTemporalConsistency` is now called
 * from doctor.ts's aggregateReport and attached as the report's optional
 * `temporalConsistency` field (types.ts), the same pattern already used for
 * emotionalArc/antiSlop/mirrorScenes/etc. — a pure diagnostic passenger,
 * never read by computeHealthScore/aggregateReport's health/verdict math. Do
 * NOT fold it into a score/verdict term without the P1 evidence described
 * below; that remains a distinct, ungated-today change.
 *
 * FALSE-POSITIVE BUG FOUND AND FIXED THIS AUDIT: the FLASHBACK branch below
 * used to add a "scene_idx before scene_0" constraint WITHOUT removing the
 * default sequential chain (built up front, confidence 0.5, never discounted
 * during propagation — detectTemporalContradictions does not read
 * `.confidence` at all) that runs straight through the flashback scene. That
 * chain transitively composes to "scene_0 before scene_idx" and directly
 * contradicts the flashback constraint — not only for the flashback scene's
 * neighbors but, via path-consistency propagation, for OTHER unrelated scene
 * pairs in the same script. Measured before the fix: an ordinary 10-scene
 * script with exactly one FLASHBACK scene and nothing else unusual produced
 * **10 BLOCKER-severity contradictions**, most on scene pairs with no
 * relationship to the flashback. The existing test suite did not catch this
 * — its one test exercising this shape ("detects flashback paradox in real
 * screenplay context") only asserted `Array.isArray(contradictions)`, never
 * a count, which in hindsight reads as the original author already being
 * unsure of the answer. Fixed by mirroring the CONTINUOUS/MEANWHILE
 * branches' existing "splice out the weak default edge before asserting the
 * stronger one" pattern (see the FLASHBACK branch below and the regression
 * tests in temporal-consistency.test.ts). Re-verify against
 * `formatTemporalReport`/`auditTemporalConsistency` on any FUTURE change to
 * the extraction heuristics below — this class of bug (a default weak
 * constraint left standing against a later stronger one) is easy to
 * reintroduce and the unit-test suite alone did not catch it once already.
 *
 * ORDER-SENSITIVITY (2026-08-03 finding, reported per explicit ask): this
 * module's constraint extraction is a direct function of scene ARRAY
 * POSITION (idx), not scene content — the rarest property in
 * server/nvm/analyze/, where nearly every other signal is content-derived
 * and therefore provably invariant under SCENE_SHUFFLE (see doctor.ts's own
 * comments on the rule channel's AUC ~0.076 and "with scene count held
 * constant the doctor cannot detect reordering at all (AUC ~0.48)").
 * Post-fix, a hand-built 14-scene fixture with a flashback+continuous pair,
 * a MEANWHILE cross-cut, and a LATER jump — arranged so the ORIGINAL
 * discourse order is fully consistent (0 contradictions) — was run through
 * 20 seeded shuffles of the SAME scenes: 7/20 (35%) produced 1-2 BLOCKER
 * contradictions, mean 0.50/shuffle, vs 0 on the intact order (probe:
 * scratchpad probe-shuffle-sensitivity.mjs, reproducible, not checked in).
 * This is a genuine, reproducible intact-vs-shuffled separation on a
 * synthetic fixture — evidence the mechanism CAN separate, not a measured
 * AUC. Known limitation: a script using none of the FLASHBACK/CONTINUOUS/
 * MEANWHILE/LATER cue words produces zero signal regardless of order (20/20
 * seeded shuffles of a marker-less fixture stayed at 0) — recall on a real
 * corpus is unmeasured and depends on how often produced screenplays use
 * these explicit discourse markers.
 *
 * P1 CANDIDATE (score-side; NOT implemented — spec only, per the freeze):
 * doctor.ts already has a precedent shape for turning a bounded, rare,
 * order-sensitive signal into a capped deduction outside the density-
 * normalized instance count (see STRUCTURAL_ROLLUP_DEDUCTION /
 * GLOBAL_ARC_DEDUCTION / arcIncoherenceDeduction in aggregateReport, each
 * with its own "MEASURED MOTIVATION" comment). A `temporalDeduction` in the
 * same family — e.g. a small fixed amount per BLOCKER-severity
 * auditTemporalConsistency contradiction, capped like the others — is
 * plausible ONLY after: (1) measuring SHUFFLE/DROP/RELOCATE AUC contribution
 * on the real corpus (`REAL_SCRIPT_CORPUS_DIR`, `npm run measure-real`) the
 * way every other structural deduction in doctor.ts was measured before
 * shipping; (2) confirming the false-positive rate on INTACT real scripts
 * that use flashbacks/cross-cuts is low enough not to punish ordinary craft
 * (this file's own bug above shows that bar is easy to miss without a real
 * probe); (3) a pre-registered fixture pair (positive = a genuine
 * use-before-establishment timeline error; negative = a correctly-ordered
 * flashback/cross-cut) per the same discipline
 * docs/p1-benchmark/DETECTOR_DEFECTS_2026-08-03.md's D6 fix-shape spells out
 * for the sibling clue-lifecycle defect. Until that evidence exists this
 * stays diagnostic-only, per NORTH_STAR's "correct before reproducible" and
 * "measure discrimination on runnable, real writing — always."
 */

import type { ScreenplaySceneRecord } from '../screenplay/memory.ts';

// ────────────────────────────────────────────────────────────────────────────────
// Allen's 13 Interval Relations
// ────────────────────────────────────────────────────────────────────────────────

export type AllenRelation =
  | 'before'     // A ---- B
  | 'meets'      // A----B
  | 'overlaps'   // A----
  | 'starts'     // A--   (B starts)
  | 'during'     // --A--
  | 'finishes'   // --A   (B finishes)
  | 'equals'     // A===B
  | 'after'      // inverse of before
  | 'met-by'     // inverse of meets
  | 'overlapped-by' // inverse of overlaps
  | 'started-by' // inverse of starts
  | 'contains'   // inverse of during
  | 'finished-by'; // inverse of finishes

export interface TemporalInterval {
  id: string;
  label: string;  // "Scene 23" or "John's childhood" or "Day 3"
  start?: number; // Optional absolute timestamps
  end?: number;
  sceneIds: string[]; // Which scenes reference this interval
  evidence: string[]; // Text spans that established this
}

export interface TemporalConstraint {
  intervalA: string; // interval ID
  intervalB: string;
  relation: AllenRelation;
  confidence: number; // 0.0-1.0
  sourceSceneId: string;
  evidence: string; // The text that implies this relation
}

export interface TemporalContradiction {
  type: 'transitive_violation' | 'explicit_conflict' | 'impossible_ordering' | 'cyclic_dependency';
  severity: 'blocker' | 'major' | 'minor';
  intervals: string[];
  constraints: TemporalConstraint[];
  explanation: string;
  affectedScenes: string[];
}

// ────────────────────────────────────────────────────────────────────────────────
// Allen Algebra Constraint Propagation
// ────────────────────────────────────────────────────────────────────────────────

/**
 * Composition table for Allen relations.
 * If A rel1 B and B rel2 C, returns possible relations between A and C.
 *
 * This is the heart of constraint propagation - allows transitive inference.
 *
 * ── REPLACED 2026-08-03 (second, deeper root cause behind the CONTINUOUS/
 * MOMENTS LATER/SAME TIME false-positive bug) ─────────────────────────────
 * The hand-written table this replaced was wrong on 81 of its 169 entries
 * (48%) — verified two independent ways: (1) an exhaustive, non-random
 * enumeration of every qualitative order-type of 6 interval endpoints
 * (As,Ae,Bs,Be,Cs,Ce over integers 0-5, the values sufficient to realize
 * every distinct ordering including ties — 46,656 configurations checked,
 * 3,375 valid after enforcing As<Ae/Bs<Be/Cs<Ce), directly computing
 * rel(A,C) for every (rel(A,B), rel(B,C)) pair actually realized; (2)
 * cross-checked against psiwray/allen-ia's independently-authored
 * ternary_constraints_table.txt (an existing open-source implementation of
 * Allen 1983's canonical table) — all 169 entries agree exactly. A worked
 * example of the old table's error: 'before' composed with 'met-by' was
 * hardcoded to just ['before'], but before∘met-by is actually {before,
 * during, meets, overlaps, starts} — 'meets' is a real possibility the old
 * entry excluded. That is not a rounding error; nearly every row past
 * 'before'/'meets' silently collapsed rich, multi-relation compositions
 * down to whatever single relation looked plausible at a glance.
 *
 * Why this was hiding, and why it surfaced now: detectTemporalContradictions
 * only ever wrote the FORWARD cell of a pair during propagation before this
 * same 2026-08-03 fix added narrowPairRelations to keep both directions in
 * sync (see that function's doc comment for that half of the story). With
 * the matrix left asymmetric, the backward cell for most pairs stayed at
 * "all 13 relations possible" or got narrowed by unrelated, coincidentally
 * weak composition paths — so a too-narrow table entry rarely got
 * intersected against anything specific enough to produce a visible empty
 * intersection. Once the matrix was made symmetric (the correct, necessary
 * fix), a chain of only two 'meets' edges — exactly what a run of
 * consecutive CONTINUOUS/MOMENTS LATER/SAME TIME scene headings produces —
 * started reliably composing 'before' (from meets∘meets, which was and is
 * correct) against the *backward* cell's synced 'met-by', hit the old
 * before∘met-by=['before'] entry, and found it excluded 'meets' — which is
 * exactly the relation the direct CONTINUOUS assertion held on that same
 * pair. Intersection empty → spurious BLOCKER. Fixing only the matrix
 * symmetry bug (without this table correction) would have left that
 * specific false positive in place; fixing only this table (without matrix
 * symmetry) would have left the ORIGINAL asymmetric-graph defect free to
 * keep producing different false positives through other paths. Both were
 * required. See temporal-consistency.test.ts's CONTINUOUS-chain regression
 * table and the genuine-contradiction test proving detection still fires.
 */
const COMPOSITION_TABLE: Record<AllenRelation, Record<AllenRelation, AllenRelation[]>> = {
  'before': {
    'before': ['before'],
    'meets': ['before'],
    'overlaps': ['before'],
    'starts': ['before'],
    'during': ['before', 'during', 'meets', 'overlaps', 'starts'],
    'finishes': ['before', 'during', 'meets', 'overlaps', 'starts'],
    'equals': ['before'],
    'after': ['after', 'before', 'contains', 'during', 'equals', 'finished-by', 'finishes', 'meets', 'met-by', 'overlapped-by', 'overlaps', 'started-by', 'starts'],
    'met-by': ['before', 'during', 'meets', 'overlaps', 'starts'],
    'overlapped-by': ['before', 'during', 'meets', 'overlaps', 'starts'],
    'started-by': ['before'],
    'contains': ['before'],
    'finished-by': ['before'],
  },
  'meets': {
    'before': ['before'],
    'meets': ['before'],
    'overlaps': ['before'],
    'starts': ['meets'],
    'during': ['during', 'overlaps', 'starts'],
    'finishes': ['during', 'overlaps', 'starts'],
    'equals': ['meets'],
    'after': ['after', 'contains', 'met-by', 'overlapped-by', 'started-by'],
    'met-by': ['equals', 'finished-by', 'finishes'],
    'overlapped-by': ['during', 'overlaps', 'starts'],
    'started-by': ['meets'],
    'contains': ['before'],
    'finished-by': ['before'],
  },
  'overlaps': {
    'before': ['before'],
    'meets': ['before'],
    'overlaps': ['before', 'meets', 'overlaps'],
    'starts': ['overlaps'],
    'during': ['during', 'overlaps', 'starts'],
    'finishes': ['during', 'overlaps', 'starts'],
    'equals': ['overlaps'],
    'after': ['after', 'contains', 'met-by', 'overlapped-by', 'started-by'],
    'met-by': ['contains', 'overlapped-by', 'started-by'],
    'overlapped-by': ['contains', 'during', 'equals', 'finished-by', 'finishes', 'overlapped-by', 'overlaps', 'started-by', 'starts'],
    'started-by': ['contains', 'finished-by', 'overlaps'],
    'contains': ['before', 'contains', 'finished-by', 'meets', 'overlaps'],
    'finished-by': ['before', 'meets', 'overlaps'],
  },
  'starts': {
    'before': ['before'],
    'meets': ['before'],
    'overlaps': ['before', 'meets', 'overlaps'],
    'starts': ['starts'],
    'during': ['during'],
    'finishes': ['during'],
    'equals': ['starts'],
    'after': ['after'],
    'met-by': ['met-by'],
    'overlapped-by': ['during', 'finishes', 'overlapped-by'],
    'started-by': ['equals', 'started-by', 'starts'],
    'contains': ['before', 'contains', 'finished-by', 'meets', 'overlaps'],
    'finished-by': ['before', 'meets', 'overlaps'],
  },
  'during': {
    'before': ['before'],
    'meets': ['before'],
    'overlaps': ['before', 'during', 'meets', 'overlaps', 'starts'],
    'starts': ['during'],
    'during': ['during'],
    'finishes': ['during'],
    'equals': ['during'],
    'after': ['after'],
    'met-by': ['after'],
    'overlapped-by': ['after', 'during', 'finishes', 'met-by', 'overlapped-by'],
    'started-by': ['after', 'during', 'finishes', 'met-by', 'overlapped-by'],
    'contains': ['after', 'before', 'contains', 'during', 'equals', 'finished-by', 'finishes', 'meets', 'met-by', 'overlapped-by', 'overlaps', 'started-by', 'starts'],
    'finished-by': ['before', 'during', 'meets', 'overlaps', 'starts'],
  },
  'finishes': {
    'before': ['before'],
    'meets': ['meets'],
    'overlaps': ['during', 'overlaps', 'starts'],
    'starts': ['during'],
    'during': ['during'],
    'finishes': ['finishes'],
    'equals': ['finishes'],
    'after': ['after'],
    'met-by': ['after'],
    'overlapped-by': ['after', 'met-by', 'overlapped-by'],
    'started-by': ['after', 'met-by', 'overlapped-by'],
    'contains': ['after', 'contains', 'met-by', 'overlapped-by', 'started-by'],
    'finished-by': ['equals', 'finished-by', 'finishes'],
  },
  'equals': {
    'before': ['before'],
    'meets': ['meets'],
    'overlaps': ['overlaps'],
    'starts': ['starts'],
    'during': ['during'],
    'finishes': ['finishes'],
    'equals': ['equals'],
    'after': ['after'],
    'met-by': ['met-by'],
    'overlapped-by': ['overlapped-by'],
    'started-by': ['started-by'],
    'contains': ['contains'],
    'finished-by': ['finished-by'],
  },
  // Inverses (symmetric entries)
  'after': {
    'before': ['after', 'before', 'contains', 'during', 'equals', 'finished-by', 'finishes', 'meets', 'met-by', 'overlapped-by', 'overlaps', 'started-by', 'starts'],
    'meets': ['after', 'during', 'finishes', 'met-by', 'overlapped-by'],
    'overlaps': ['after', 'during', 'finishes', 'met-by', 'overlapped-by'],
    'starts': ['after', 'during', 'finishes', 'met-by', 'overlapped-by'],
    'during': ['after', 'during', 'finishes', 'met-by', 'overlapped-by'],
    'finishes': ['after'],
    'equals': ['after'],
    'after': ['after'],
    'met-by': ['after'],
    'overlapped-by': ['after'],
    'started-by': ['after'],
    'contains': ['after'],
    'finished-by': ['after'],
  },
  'met-by': {
    'before': ['before', 'contains', 'finished-by', 'meets', 'overlaps'],
    'meets': ['equals', 'started-by', 'starts'],
    'overlaps': ['during', 'finishes', 'overlapped-by'],
    'starts': ['during', 'finishes', 'overlapped-by'],
    'during': ['during', 'finishes', 'overlapped-by'],
    'finishes': ['met-by'],
    'equals': ['met-by'],
    'after': ['after'],
    'met-by': ['after'],
    'overlapped-by': ['after'],
    'started-by': ['after'],
    'contains': ['after'],
    'finished-by': ['met-by'],
  },
  'overlapped-by': {
    'before': ['before', 'contains', 'finished-by', 'meets', 'overlaps'],
    'meets': ['contains', 'finished-by', 'overlaps'],
    'overlaps': ['contains', 'during', 'equals', 'finished-by', 'finishes', 'overlapped-by', 'overlaps', 'started-by', 'starts'],
    'starts': ['during', 'finishes', 'overlapped-by'],
    'during': ['during', 'finishes', 'overlapped-by'],
    'finishes': ['overlapped-by'],
    'equals': ['overlapped-by'],
    'after': ['after'],
    'met-by': ['after'],
    'overlapped-by': ['after', 'met-by', 'overlapped-by'],
    'started-by': ['after', 'met-by', 'overlapped-by'],
    'contains': ['after', 'contains', 'met-by', 'overlapped-by', 'started-by'],
    'finished-by': ['contains', 'overlapped-by', 'started-by'],
  },
  'started-by': {
    'before': ['before', 'contains', 'finished-by', 'meets', 'overlaps'],
    'meets': ['contains', 'finished-by', 'overlaps'],
    'overlaps': ['contains', 'finished-by', 'overlaps'],
    'starts': ['equals', 'started-by', 'starts'],
    'during': ['during', 'finishes', 'overlapped-by'],
    'finishes': ['overlapped-by'],
    'equals': ['started-by'],
    'after': ['after'],
    'met-by': ['met-by'],
    'overlapped-by': ['overlapped-by'],
    'started-by': ['started-by'],
    'contains': ['contains'],
    'finished-by': ['contains'],
  },
  'contains': {
    'before': ['before', 'contains', 'finished-by', 'meets', 'overlaps'],
    'meets': ['contains', 'finished-by', 'overlaps'],
    'overlaps': ['contains', 'finished-by', 'overlaps'],
    'starts': ['contains', 'finished-by', 'overlaps'],
    'during': ['contains', 'during', 'equals', 'finished-by', 'finishes', 'overlapped-by', 'overlaps', 'started-by', 'starts'],
    'finishes': ['contains', 'overlapped-by', 'started-by'],
    'equals': ['contains'],
    'after': ['after', 'contains', 'met-by', 'overlapped-by', 'started-by'],
    'met-by': ['contains', 'overlapped-by', 'started-by'],
    'overlapped-by': ['contains', 'overlapped-by', 'started-by'],
    'started-by': ['contains'],
    'contains': ['contains'],
    'finished-by': ['contains'],
  },
  'finished-by': {
    'before': ['before'],
    'meets': ['meets'],
    'overlaps': ['overlaps'],
    'starts': ['overlaps'],
    'during': ['during', 'overlaps', 'starts'],
    'finishes': ['equals', 'finished-by', 'finishes'],
    'equals': ['finished-by'],
    'after': ['after', 'contains', 'met-by', 'overlapped-by', 'started-by'],
    'met-by': ['contains', 'overlapped-by', 'started-by'],
    'overlapped-by': ['contains', 'overlapped-by', 'started-by'],
    'started-by': ['contains'],
    'contains': ['contains'],
    'finished-by': ['finished-by'],
  },
};

/**
 * Infer possible relations between A and C given A→B and B→C
 */
function composeRelations(ab: AllenRelation, bc: AllenRelation): AllenRelation[] {
  return COMPOSITION_TABLE[ab]?.[bc] || [];
}

/** Each Allen relation's inverse (file-header comment's "[7 inverses]"), so a
 *  relation asserted A→B can be checked against what B→A implies about A→B. */
const INVERSE_RELATION: Record<AllenRelation, AllenRelation> = {
  'before': 'after', 'after': 'before',
  'meets': 'met-by', 'met-by': 'meets',
  'overlaps': 'overlapped-by', 'overlapped-by': 'overlaps',
  'starts': 'started-by', 'started-by': 'starts',
  'during': 'contains', 'contains': 'during',
  'finishes': 'finished-by', 'finished-by': 'finishes',
  'equals': 'equals',
};

// ────────────────────────────────────────────────────────────────────────────────
// Bit-packed relation sets (perf substrate for detectTemporalContradictions)
//
// PURE REPRESENTATION CHANGE, 2026-08-21 (lane W2). The path-consistency
// propagation below used to hold every matrix cell as a `Set<AllenRelation>`
// inside a `Map<string, Map<string, Set<...>>>`, and re-derive `Array.from()`
// snapshots of three of them on every one of the O(n³) triples it visits.
// MEASURED (profile over synthetic concatenations of data/screenplays/*.
// fountain): auditTemporalConsistencyReport was 99.7% of the entire Script
// Doctor runtime — 158ms at 26 scenes, 7.5s at 62, 43.4s at 120, i.e. the
// whole reported super-quadratic doctor curve was this one function. The
// per-triple allocation (two Array.from snapshots, a fresh Set, a filter
// closure) dominated; the algorithm itself is fine.
//
// So the sets became 13-bit integers and the matrix became flat typed arrays,
// with the ORDERED relation list kept alongside the mask because the original
// Set's INSERTION ORDER is observable: it is spliced verbatim into
// `explanation` strings (`Array.from(rIK).join('|')`) on every reported
// contradiction. `cellRel`/`cellLen` reproduce that order element-for-element;
// `cellMask` exists only so the hot comparisons (empty? subset? disjoint?)
// become single integer ops instead of array scans. Nothing about WHICH
// contradictions are found, in WHAT order, or with WHAT text changed — see
// tests/core/temporal-consistency-perf.test.ts, which runs the original
// Set-based reference implementation and this one over the same randomized
// constraint graphs and deep-equals the results.
// ────────────────────────────────────────────────────────────────────────────────

/** Canonical relation order — MUST match the literal order the original
 *  implementation inserted into each freshly-initialized "all 13 possible"
 *  cell, because that order is what `Array.from(cell).join('|')` renders. */
const RELATION_ORDER: readonly AllenRelation[] = [
  'before', 'meets', 'overlaps', 'starts', 'during', 'finishes', 'equals',
  'after', 'met-by', 'overlapped-by', 'started-by', 'contains', 'finished-by',
];
const RELATION_COUNT = RELATION_ORDER.length; // 13
const FULL_MASK = (1 << RELATION_COUNT) - 1;  // 0b1111111111111 = 8191
const EQUALS_INDEX = RELATION_ORDER.indexOf('equals');

const RELATION_INDEX: Record<AllenRelation, number> = Object.fromEntries(
  RELATION_ORDER.map((r, i) => [r, i]),
) as Record<AllenRelation, number>;

/** COMPOSE_ORDERED[ab * 13 + bc] — the composition table's own entry order,
 *  as relation INDICES. Order matters: it is the order the original code
 *  inserted composed relations into its `composed` Set. */
const COMPOSE_ORDERED: Uint8Array[] = new Array(RELATION_COUNT * RELATION_COUNT);
/** COMPOSE_MASK[ab * 13 + bc] — the same entry as a bitmask. */
const COMPOSE_MASK = new Uint16Array(RELATION_COUNT * RELATION_COUNT);
for (let ab = 0; ab < RELATION_COUNT; ab++) {
  for (let bc = 0; bc < RELATION_COUNT; bc++) {
    const entry = composeRelations(RELATION_ORDER[ab], RELATION_ORDER[bc]);
    const indices = new Uint8Array(entry.length);
    let mask = 0;
    for (let e = 0; e < entry.length; e++) {
      const idx = RELATION_INDEX[entry[e]];
      indices[e] = idx;
      mask |= 1 << idx;
    }
    COMPOSE_ORDERED[ab * RELATION_COUNT + bc] = indices;
    COMPOSE_MASK[ab * RELATION_COUNT + bc] = mask;
  }
}

/** INVERSE_INDEX[i] — relation i's inverse, as an index. */
const INVERSE_INDEX = new Uint8Array(RELATION_COUNT);
for (let i = 0; i < RELATION_COUNT; i++) {
  INVERSE_INDEX[i] = RELATION_INDEX[INVERSE_RELATION[RELATION_ORDER[i]]];
}

/** Bitmask of the inverses of every relation in `mask`. */
function invertMask(mask: number): number {
  let out = 0;
  let rest = mask;
  while (rest !== 0) {
    const bit = rest & -rest;
    out |= 1 << INVERSE_INDEX[31 - Math.clz32(bit)];
    rest ^= bit;
  }
  return out;
}

function popcount(mask: number): number {
  let m = mask - ((mask >> 1) & 0x55555555);
  m = (m & 0x33333333) + ((m >> 2) & 0x33333333);
  m = (m + (m >> 4)) & 0x0f0f0f0f;
  return (m * 0x01010101) >> 24;
}

/**
 * Narrow constraintMatrix[aId][bId] to `relations` AND, in the same step,
 * narrow constraintMatrix[bId][aId] to its intersection with inverse(relations).
 *
 * ROOT CAUSE THIS EXISTS TO FIX (2026-08-03): standard Allen-algebra path
 * consistency (Allen 1983; Vilain & Kautz's PC-2) maintains, as an
 * invariant held after EVERY narrowing, that the matrix cell for B→A always
 * equals the inverse of the cell for A→B — the two directions of one pair
 * are the same fact seen from either end, never two independently-derived
 * facts. This module's matrix updates (both explicit-constraint application
 * and the Floyd-Warshall-style composition loop) used to write ONLY the
 * forward cell (A→B) on every narrowing and never touch the backward cell
 * (B→A) at all. The backward cell was then left to be narrowed later,
 * coincidentally, by whatever OTHER composition chains happened to route
 * through it — a computation that has no reason to land on the true inverse
 * of the forward cell, since it draws on a different, often much weaker, set
 * of paths. The two cells for the same pair could therefore diverge into
 * two "correct in isolation" but mutually inconsistent views — not because
 * the timeline was actually contradictory, but because the graph itself was
 * never kept internally coherent. The pairwise mirror-consistency check
 * further down (originally added to catch genuine direct 2-cycles) then
 * flagged that divergence as though it were a real contradiction, which is
 * exactly the false-positive mechanism behind a run of consecutive
 * CONTINUOUS/MOMENTS LATER/SAME TIME scene headings: each adjacent pair
 * gets an explicit 'meets' forward-only, its backward cell drifts away from
 * 'met-by' via unrelated composition paths, and the mirror check fires on
 * the drift. Composing meets∘meets=before is, and always was, perfectly
 * consistent — the defect was structural (an unmaintained invariant), not
 * algebraic. Fixing constraint application and propagation to go through
 * this single symmetric setter (so every narrowing simultaneously narrows
 * both directions) restores the invariant everywhere and the false
 * positives disappear without weakening real-conflict detection: an actual
 * cyclic/impossible chain still drives some cell's relation set to empty,
 * which both the explicit-conflict and transitive-violation checks still
 * catch (see temporal-consistency.test.ts's regression tests).
 *
 * Returns true iff either cell actually changed, so callers can fold this
 * into their existing propagation `changed` flag.
 *
 * (2026-08-21, lane W2) Same setter, same semantics, expressed against the
 * bit-packed matrix described above instead of Map-of-Map-of-Set:
 *   - the FORWARD cell is REPLACED by `relations`, keeping its order, and
 *     only when it differs as a SET from what's already there (a same-set,
 *     different-order narrowing was a no-op before and stays one, so no
 *     explanation string can shift under this change);
 *   - the BACKWARD cell is FILTERED in place against inverse(relations),
 *     which preserves its own existing order exactly as `Array.from(...)
 *     .filter(...)` did.
 */
class RelationMatrix {
  readonly size: number;
  /** Ordered relation indices per cell, 13 slots each (row-major i*size+j). */
  private readonly rel: Uint8Array;
  /** How many of those 13 slots are live. */
  private readonly len: Uint8Array;
  /** Same content as a bitmask — lets the hot loop test empty/subset/disjoint
   *  with one integer op instead of an array scan. Always in sync with rel/len. */
  readonly mask: Uint16Array;

  constructor(size: number) {
    this.size = size;
    this.rel = new Uint8Array(size * size * RELATION_COUNT);
    this.len = new Uint8Array(size * size);
    this.mask = new Uint16Array(size * size);
    // Initialize: self-cell = {equals}; every other cell = all 13 relations in
    // canonical order (the literal order the original initializer used).
    for (let i = 0; i < size; i++) {
      for (let j = 0; j < size; j++) {
        const cell = i * size + j;
        if (i === j) {
          this.rel[cell * RELATION_COUNT] = EQUALS_INDEX;
          this.len[cell] = 1;
          this.mask[cell] = 1 << EQUALS_INDEX;
        } else {
          const base = cell * RELATION_COUNT;
          for (let r = 0; r < RELATION_COUNT; r++) this.rel[base + r] = r;
          this.len[cell] = RELATION_COUNT;
          this.mask[cell] = FULL_MASK;
        }
      }
    }
  }

  cellIndex(i: number, j: number): number { return i * this.size + j; }
  lengthAt(cell: number): number { return this.len[cell]; }
  /** Relation index at a flat slot (`cell * RELATION_COUNT + ordinal`). */
  relAt(slot: number): number { return this.rel[slot]; }

  /** The cell's relations, in order, as an array — used only for rendering
   *  explanation strings and for the (rare) narrowing path. */
  toArray(cell: number): AllenRelation[] {
    const n = this.len[cell];
    const base = cell * RELATION_COUNT;
    const out: AllenRelation[] = new Array(n);
    for (let r = 0; r < n; r++) out[r] = RELATION_ORDER[this.rel[base + r]];
    return out;
  }

  /** Overwrite a cell with `indices` (already deduped, order significant). */
  private write(cell: number, indices: ArrayLike<number>, count: number, mask: number): void {
    const base = cell * RELATION_COUNT;
    for (let r = 0; r < count; r++) this.rel[base + r] = indices[r];
    this.len[cell] = count;
    this.mask[cell] = mask;
  }

  /** See the doc comment above — the symmetric setter, bit-packed. */
  narrowPair(a: number, b: number, indices: ArrayLike<number>, count: number, newMask: number): boolean {
    let changed = false;

    const forward = this.cellIndex(a, b);
    if (this.mask[forward] !== newMask || this.len[forward] !== count) {
      this.write(forward, indices, count, newMask);
      changed = true;
    }

    const backward = this.cellIndex(b, a);
    const currentBackward = this.mask[backward];
    const keep = currentBackward & invertMask(newMask);
    if (keep !== currentBackward) {
      // Filter in place, preserving the backward cell's own existing order.
      const base = backward * RELATION_COUNT;
      let out = 0;
      for (let r = 0, n = this.len[backward]; r < n; r++) {
        const idx = this.rel[base + r];
        if ((keep >> idx) & 1) this.rel[base + out++] = idx;
      }
      this.len[backward] = out;
      this.mask[backward] = keep;
      changed = true;
    }

    return changed;
  }
}

// ────────────────────────────────────────────────────────────────────────────────
// Temporal Extraction from Screenplay
// ────────────────────────────────────────────────────────────────────────────────

/**
 * Extract temporal intervals and constraints from screenplay scenes.
 * 
 * Looks for:
 * - Explicit time markers: "THREE YEARS AGO", "THE NEXT DAY", "CONTINUOUS"
 * - Flashbacks: "FLASHBACK" slugline modifiers
 * - Age mentions: "John, now 40" vs "John, 25"
 * - Causal language: "after", "before", "during", "while", "meanwhile"
 */
export function extractTemporalConstraints(scenes: ScreenplaySceneRecord[]): {
  intervals: TemporalInterval[];
  constraints: TemporalConstraint[];
} {
  const intervals: TemporalInterval[] = [];
  const constraints: TemporalConstraint[] = [];
  
  // Create an interval for each scene
  scenes.forEach((scene, idx) => {
    const sceneInterval: TemporalInterval = {
      id: `scene_${idx}`,
      label: scene.slug || `Scene ${idx + 1}`,
      sceneIds: [String(idx)],
      evidence: [scene.slug || ''],
    };
    intervals.push(sceneInterval);
    
    // Default sequential constraint (each scene before the next)
    if (idx < scenes.length - 1) {
      constraints.push({
        intervalA: `scene_${idx}`,
        intervalB: `scene_${idx + 1}`,
        relation: 'before',
        confidence: 0.5, // Weak - can be overridden by explicit markers
        sourceSceneId: String(idx),
        evidence: 'Sequential scene order',
      });
    }
  });
  
  // Extract explicit temporal markers
  scenes.forEach((scene, idx) => {
    const heading = scene.slug?.toUpperCase() || '';
    // ScreenplaySceneRecord carries no raw scene prose (heuristic extraction
    // keeps only structured fields) — approximate "scene text" for keyword
    // matching by concatenating its narrative-bearing string fields.
    const sceneText = [scene.dramaticTurn, scene.revelation, ...scene.dialogueHighlights, ...scene.visualBeats]
      .filter((s): s is string => Boolean(s))
      .join(' ')
      .toUpperCase();
    const combined = heading + ' ' + sceneText;
    
    // FLASHBACK detection
    if (/FLASHBACK/.test(heading)) {
      // A flashback scene's discourse position (idx) is not its story-time
      // position: it happens BEFORE "the present" (scene_0), which the
      // upfront default sequential chain (every scene 'before' the next,
      // confidence 0.5, built in the loop above) has no way to know. Left
      // in place, that chain composes transitively THROUGH this scene back
      // to scene_0 (before∘before∘...∘before = before) and conflicts with
      // the explicit flashback constraint below — not only for this
      // scene's immediate neighbors, but, via detectTemporalContradictions'
      // path-consistency propagation, for OTHER unrelated scene pairs
      // elsewhere in the chain too (confidence is carried on
      // TemporalConstraint but never read during propagation, so a 0.5
      // default guess is treated as equally certain as a 0.9 explicit
      // marker). CONFIRMED BY PROBE (not asserted by any existing test —
      // the co-located test's own "flashback paradox" case only checked
      // `Array.isArray(contradictions)`, not the count): an otherwise
      // ordinary 10-scene script with exactly one FLASHBACK scene and no
      // other markers produced 10 BLOCKER contradictions before this fix,
      // most of them between scene pairs with no relationship to the
      // flashback at all (e.g. scene_0/scene_1). See
      // 'an ordinary flashback does not cascade into unrelated scene
      // pairs' below for the locked-in regression.
      //
      // Fix mirrors the CONTINUOUS/MEANWHILE branches below, which already
      // splice out the one default edge their own new relation directly
      // replaces. FLASHBACK's new relation lands on a DIFFERENT pair
      // (scene_idx <-> scene_0, not scene_idx's immediate neighbor), so
      // here we remove BOTH default edges touching this scene's position
      // in the chain (incoming from scene_{idx-1}, outgoing to
      // scene_{idx+1}) rather than one matching edge on the same pair —
      // that's what breaks the chain's ability to transitively reach back
      // to scene_0 through this scene.
      for (const [a, b] of [[`scene_${idx - 1}`, `scene_${idx}`], [`scene_${idx}`, `scene_${idx + 1}`]]) {
        const weakConstraintIdx = constraints.findIndex(
          c => c.intervalA === a && c.intervalB === b && c.confidence === 0.5
        );
        if (weakConstraintIdx >= 0) {
          constraints.splice(weakConstraintIdx, 1);
        }
      }
      // This scene is BEFORE the main timeline
      constraints.push({
        intervalA: `scene_${idx}`,
        intervalB: 'scene_0', // Assume scene 0 is present timeline
        relation: 'before',
        confidence: 0.9,
        sourceSceneId: String(idx),
        evidence: `Flashback marker in ${scene.slug}`,
      });
    }
    
    // CONTINUOUS / MOMENTS LATER
    if (/CONTINUOUS|MOMENTS LATER|SAME TIME/.test(heading)) {
      if (idx > 0) {
        // Remove the weak sequential 'before' and replace with 'meets'
        const weakConstraintIdx = constraints.findIndex(
          c => c.intervalA === `scene_${idx - 1}` && c.intervalB === `scene_${idx}` && c.confidence === 0.5
        );
        if (weakConstraintIdx >= 0) {
          constraints.splice(weakConstraintIdx, 1);
        }
        
        constraints.push({
          intervalA: `scene_${idx - 1}`,
          intervalB: `scene_${idx}`,
          relation: 'meets', // Abutting, no gap
          confidence: 0.95,
          sourceSceneId: String(idx),
          evidence: `Continuous marker in ${scene.slug}`,
        });
      }
    }
    
    // LATER / DAYS LATER / YEARS LATER
    const laterMatch = combined.match(/(DAYS?|WEEKS?|MONTHS?|YEARS?)\s+LATER/);
    if (laterMatch && idx > 0) {
      const weakConstraintIdx = constraints.findIndex(
        c => c.intervalA === `scene_${idx - 1}` && c.intervalB === `scene_${idx}` && c.confidence === 0.5
      );
      if (weakConstraintIdx >= 0) {
        constraints[weakConstraintIdx].confidence = 0.8;
        constraints[weakConstraintIdx].evidence = `${laterMatch[0]} in ${scene.slug}`;
      }
    }
    
    // MEANWHILE / MEANWHILE detection (simultaneous)
    if (/MEANWHILE|SIMULTANEOUSLY|AT THE SAME TIME/.test(combined) && idx > 0) {
      const weakConstraintIdx = constraints.findIndex(
        c => c.intervalA === `scene_${idx - 1}` && c.intervalB === `scene_${idx}` && c.confidence === 0.5
      );
      if (weakConstraintIdx >= 0) {
        constraints.splice(weakConstraintIdx, 1);
      }
      
      constraints.push({
        intervalA: `scene_${idx - 1}`,
        intervalB: `scene_${idx}`,
        relation: 'overlaps', // They overlap in time
        confidence: 0.85,
        sourceSceneId: String(idx),
        evidence: `Meanwhile/simultaneous in scene ${idx}`,
      });
    }
    
    // Age mentions (extract character ages to build timeline)
    const ageMatch = combined.match(/(\w+),?\s+(?:NOW\s+)?(\d{1,3})\s*(?:YEARS?\s+OLD)?/);
    if (ageMatch) {
      const [, charName, age] = ageMatch;
      const ageInterval: TemporalInterval = {
        id: `${charName.toLowerCase()}_age_${age}`,
        label: `${charName} at age ${age}`,
        sceneIds: [String(idx)],
        evidence: [ageMatch[0]],
      };
      intervals.push(ageInterval);
    }
  });
  
  return { intervals, constraints };
}

// ────────────────────────────────────────────────────────────────────────────────
// Constraint Propagation & Contradiction Detection
// ────────────────────────────────────────────────────────────────────────────────

/**
 * Path consistency algorithm (Allen's constraint propagation)
 * 
 * For every triple (i, j, k):
 *   - Compose constraints i→j and j→k to infer i→k
 *   - Intersect with existing constraint on i→k
 *   - If intersection is empty → CONTRADICTION
 * 
 * Complexity: O(n³) where n = number of intervals
 * Typical screenplay: 40-60 scenes = ~100k operations, sub-10ms (verified)
 */
export function detectTemporalContradictions(
  intervals: TemporalInterval[],
  constraints: TemporalConstraint[]
): TemporalContradiction[] {
  const contradictions: TemporalContradiction[] = [];
  const n = intervals.length;

  if (n === 0) return [];

  // Build constraint matrix: constraintMatrix[i][j] = possible relations
  // between interval i and j. Keyed by DISTINCT interval id, exactly as the
  // original Map-of-Maps was: `intervals` can legitimately contain repeated
  // ids (extractTemporalConstraints mints `${char}_age_${age}` intervals that
  // collide whenever two scenes mention the same character at the same age),
  // and a repeated id addressed the same single row before. The loops below
  // still walk the `intervals` ARRAY — so a repeated id is visited as many
  // times as it appears, preserving duplicate self-cycle/mirror reports.
  const idIndex = new Map<string, number>();
  for (const interval of intervals) {
    if (!idIndex.has(interval.id)) idIndex.set(interval.id, idIndex.size);
  }
  const distinctCount = idIndex.size;
  const matrix = new RelationMatrix(distinctCount);
  /** Array-position -> distinct-id row, so the O(n³) loops below can work in
   *  integers while still iterating `intervals` in its own order. */
  const rowOf = new Int32Array(n);
  for (let p = 0; p < n; p++) rowOf[p] = idIndex.get(intervals[p].id)!;

  // Scratch buffers reused across every triple — the whole point of the
  // bit-packed representation is that the hot loop allocates nothing.
  const composedScratch = new Uint8Array(RELATION_COUNT);
  const intersectScratch = new Uint8Array(RELATION_COUNT);
  const singleScratch = new Uint8Array(1);

  // Apply explicit constraints and check for immediate conflicts
  constraints.forEach(c => {
    const a = idIndex.get(c.intervalA);
    if (a === undefined) return;
    const b = idIndex.get(c.intervalB);
    if (b === undefined) return;
    const cell = matrix.cellIndex(a, b);
    const relIdx = RELATION_INDEX[c.relation];
    if (relIdx === undefined) return;
    if (((matrix.mask[cell] >> relIdx) & 1) === 0) {
      // Explicit contradiction - same pair has incompatible constraints
      contradictions.push({
        type: 'explicit_conflict',
        severity: 'blocker',
        intervals: [c.intervalA, c.intervalB],
        constraints: [c],
        explanation: `Conflicting explicit constraints on ${c.intervalA} and ${c.intervalB}: existing=${matrix.toArray(cell).join('|')}, new=${c.relation}`,
        affectedScenes: [c.sourceSceneId],
      });
    } else {
      // Narrow BOTH directions together (see narrowPairRelations) so the
      // backward cell never drifts away from being the true inverse of
      // this forward assertion.
      singleScratch[0] = relIdx;
      matrix.narrowPair(a, b, singleScratch, 1, 1 << relIdx);
    }
  });

  // Path consistency propagation (Floyd-Warshall style)
  let changed = true;
  let iterations = 0;
  const MAX_ITERATIONS = n * n * n; // Safety limit

  while (changed && iterations < MAX_ITERATIONS) {
    changed = false;
    iterations++;

    for (let pi = 0; pi < n; pi++) {
      const i = rowOf[pi];
      for (let pj = 0; pj < n; pj++) {
        const j = rowOf[pj];
        if (i === j) continue;

        const cellIJ = matrix.cellIndex(i, j);
        const maskIJ = matrix.mask[cellIJ];
        if (maskIJ === 0) continue;
        // FAST PATH (pure, verified): composing the UNIVERSAL relation set
        // with any non-empty set yields the universal set again — the union
        // of COMPOSITION_TABLE[*][bc] is all 13 relations for every bc (an
        // exhaustive check of the table, locked by
        // tests/core/temporal-consistency-perf.test.ts). A universal
        // `composed` can never be empty and always contains rIK, so the
        // original code's every branch below was a no-op for this whole
        // (i, j) row: no contradiction pushed, no cell narrowed, `changed`
        // untouched. Skipping it is therefore output-identical, and it is
        // what keeps intervals that carry no constraints at all (every
        // `${char}_age_${n}` interval) from costing an inner O(n) scan each.
        if (maskIJ === FULL_MASK) continue;
        const lenIJ = matrix.lengthAt(cellIJ);
        const baseIJ = cellIJ * RELATION_COUNT;

        for (let pk = 0; pk < n; pk++) {
          const k = rowOf[pk];
          if (k === i || k === j) continue;

          const cellJK = matrix.cellIndex(j, k);
          const cellIK = matrix.cellIndex(i, k);
          const maskJK = matrix.mask[cellJK];
          const maskIK = matrix.mask[cellIK];

          if (maskJK === 0 || maskIK === 0) continue;

          // Compose all pairs of relations — bitmask only. The ORDERED
          // composition is rebuilt below, and only on the rare paths that
          // actually observe its order (a narrowing or a contradiction).
          let composedMask = 0;
          const baseJK = cellJK * RELATION_COUNT;
          const lenJK = matrix.lengthAt(cellJK);
          for (let x = 0; x < lenIJ; x++) {
            const ij = matrix.relAt(baseIJ + x) * RELATION_COUNT;
            for (let y = 0; y < lenJK; y++) {
              composedMask |= COMPOSE_MASK[ij + matrix.relAt(baseJK + y)];
            }
          }

          // If composition is empty, that's impossible
          if (composedMask === 0) {
            const intI = intervals[pi], intJ = intervals[pj], intK = intervals[pk];
            const relevantConstraints = constraints.filter(
              c => (c.intervalA === intI.id && c.intervalB === intJ.id) ||
                   (c.intervalA === intJ.id && c.intervalB === intK.id)
            );

            contradictions.push({
              type: 'transitive_violation',
              severity: 'blocker',
              intervals: [intI.id, intJ.id, intK.id],
              constraints: relevantConstraints,
              explanation: `Transitive temporal constraint violated: No valid composition of ${intI.label} → ${intJ.label} → ${intK.label}`,
              affectedScenes: [...new Set(relevantConstraints.map(c => c.sourceSceneId))],
            });

            return contradictions;
          }

          // Intersect with existing constraint on i→k. `intersection` is
          // always a subset of rIK (it is `composed` filtered by membership
          // in rIK), so `intersection.length < rIK.size` is exactly
          // "composed does not contain all of rIK" — one integer test.
          if ((composedMask & maskIK) === maskIK) continue; // no narrowing, no report

          // From here on the composition's ORDER is observable, so rebuild it
          // exactly as the original Set did: iterate rIJ in order, rJK in
          // order, and append each table entry's relations on first sight.
          let composedCount = 0;
          let seen = 0;
          for (let x = 0; x < lenIJ; x++) {
            const ij = matrix.relAt(baseIJ + x) * RELATION_COUNT;
            for (let y = 0; y < lenJK; y++) {
              const entry = COMPOSE_ORDERED[ij + matrix.relAt(baseJK + y)];
              for (let e = 0; e < entry.length; e++) {
                const r = entry[e];
                if (((seen >> r) & 1) === 0) {
                  seen |= 1 << r;
                  composedScratch[composedCount++] = r;
                }
              }
            }
          }
          const intersectMask = composedMask & maskIK;
          let intersectCount = 0;
          for (let x = 0; x < composedCount; x++) {
            const r = composedScratch[x];
            if ((intersectMask >> r) & 1) intersectScratch[intersectCount++] = r;
          }

          if (intersectCount === 0) {
            // Transitive contradiction detected
            const intI = intervals[pi], intJ = intervals[pj], intK = intervals[pk];
            const relevantConstraints = constraints.filter(
              c => (c.intervalA === intI.id && c.intervalB === intJ.id) ||
                   (c.intervalA === intJ.id && c.intervalB === intK.id) ||
                   (c.intervalA === intI.id && c.intervalB === intK.id)
            );
            const composedRendered: AllenRelation[] = new Array(composedCount);
            for (let x = 0; x < composedCount; x++) composedRendered[x] = RELATION_ORDER[composedScratch[x]];

            contradictions.push({
              type: 'transitive_violation',
              severity: 'blocker',
              intervals: [intI.id, intJ.id, intK.id],
              constraints: relevantConstraints,
              explanation: `Transitive temporal constraint violated: ${intI.label} → ${intJ.label} → ${intK.label} creates impossible ordering (composed=${composedRendered.join('|')}, existing=${matrix.toArray(cellIK).join('|')})`,
              affectedScenes: [...new Set(relevantConstraints.map(c => c.sourceSceneId))],
            });

            // Don't return immediately - collect all contradictions
            // But mark this relation as impossible (both directions, via
            // narrowPairRelations, so the backward cell doesn't keep
            // reporting a now-invalidated relation set).
            matrix.narrowPair(i, k, intersectScratch, 0, 0);
            changed = true;
          } else {
            // Narrow BOTH directions together (see narrowPairRelations) so
            // the backward cell (K→I) stays the true inverse of this
            // forward cell instead of drifting via unrelated composition
            // paths — the root cause of the CONTINUOUS/MOMENTS LATER/SAME
            // TIME false positives fixed 2026-08-03 (see that function's
            // doc comment).
            matrix.narrowPair(i, k, intersectScratch, intersectCount, intersectMask);
            changed = true;
          }
        }
      }
    }
  }

  // Check for cycles (interval before itself)
  intervals.forEach(int => {
    const self = idIndex.get(int.id);
    if (self !== undefined && ((matrix.mask[matrix.cellIndex(self, self)] >> EQUALS_INDEX) & 1) === 0) {
      contradictions.push({
        type: 'cyclic_dependency',
        severity: 'blocker',
        intervals: [int.id],
        constraints: [],
        explanation: `Cyclic temporal dependency detected: ${int.label} must occur before itself`,
        affectedScenes: int.sceneIds,
      });
    }
  });

  // Pairwise mirror-consistency check: A→B's constrained relations must agree
  // with what B→A implies (each relation's inverse — e.g. B before A implies
  // A after B). The Floyd-Warshall propagation above only surfaces
  // contradictions through a third interval, so a direct 2-interval cycle
  // (A before B AND B before A, with nothing else in the graph) is otherwise
  // invisible — there's no distinct third interval to route the composition
  // through. Skip pairs already reported via the transitive/explicit checks.
  const reportedPairs = new Set(
    contradictions.flatMap(c => c.intervals.length === 2 ? [`${c.intervals[0]}|${c.intervals[1]}`, `${c.intervals[1]}|${c.intervals[0]}`] : [])
  );
  for (let pa = 0; pa < n; pa++) {
    const intA = intervals[pa];
    const a = rowOf[pa];
    for (let pb = 0; pb < n; pb++) {
      const intB = intervals[pb];
      const b = rowOf[pb];
      if (a === b) continue;
      // (`reportedPairs.size > 0` short-circuit only skips building the key
      // string for the overwhelmingly common empty-set case; the membership
      // semantics are unchanged.)
      if (reportedPairs.size > 0 && reportedPairs.has(`${intA.id}|${intB.id}`)) continue;

      const forwardCell = matrix.cellIndex(a, b);
      const backwardCell = matrix.cellIndex(b, a);
      const forwardMask = matrix.mask[forwardCell];
      const backwardMask = matrix.mask[backwardCell];
      if (forwardMask === 0 || backwardMask === 0) continue;

      if ((forwardMask & invertMask(backwardMask)) === 0) {
        const forward = matrix.toArray(forwardCell);
        const backward = matrix.toArray(backwardCell);
        const relevantConstraints = constraints.filter(
          c => (c.intervalA === intA.id && c.intervalB === intB.id) ||
               (c.intervalA === intB.id && c.intervalB === intA.id)
        );
        // Distinguish a direct 2-interval cycle (both directions come from
        // their OWN explicit constraint — e.g. a flashback marker asserting
        // both "present before flashback" and "flashback before present")
        // from a transitive one (this pair's conflict only surfaces once a
        // third interval's chain is composed through it — the classic A→B→C→A
        // case, where A→C was never asserted directly, only inferred).
        const hasDirectForward = constraints.some(c => c.intervalA === intA.id && c.intervalB === intB.id);
        const hasDirectBackward = constraints.some(c => c.intervalA === intB.id && c.intervalB === intA.id);
        const isDirectCycle = hasDirectForward && hasDirectBackward;
        contradictions.push({
          type: isDirectCycle ? 'cyclic_dependency' : 'transitive_violation',
          severity: 'blocker',
          intervals: [intA.id, intB.id],
          constraints: relevantConstraints,
          explanation: isDirectCycle
            ? `Cyclic temporal dependency detected: ${intA.label} and ${intB.label} directly constrain each other to incompatible orderings (${forward.join('|')} vs. inverse of ${backward.join('|')})`
            : `Transitive temporal constraint violated: inferred ordering between ${intA.label} and ${intB.label} (${forward.join('|')}) conflicts with the inverse of the explicit ordering back from ${intB.label} (${backward.join('|')})`,
          affectedScenes: [...new Set(relevantConstraints.map(c => c.sourceSceneId))],
        });
        reportedPairs.add(`${intA.id}|${intB.id}`);
        reportedPairs.add(`${intB.id}|${intA.id}`);
      }
    }
  }

  return contradictions;
}

// ────────────────────────────────────────────────────────────────────────────────
// High-Level API
// ────────────────────────────────────────────────────────────────────────────────

/**
 * Run full TRACE §13 temporal-consistency audit on screenplay.
 * 
 * Returns contradictions with severity classification:
 * - blocker: Impossible timeline (A before B, B before C, C before A)
 * - major: Likely error (flashback to future, age inconsistency)
 * - minor: Possible ambiguity (unclear simultaneity)
 */
export function auditTemporalConsistency(
  scenes: ScreenplaySceneRecord[]
): TemporalContradiction[] {
  const { intervals, constraints } = extractTemporalConstraints(scenes);
  const contradictions = detectTemporalContradictions(intervals, constraints);
  
  return contradictions;
}

/**
 * Generate human-readable temporal audit report
 */
export function formatTemporalReport(contradictions: TemporalContradiction[]): string {
  if (contradictions.length === 0) {
    return '✓ No temporal contradictions detected. Timeline is consistent.';
  }
  
  const lines: string[] = [
    `⚠ ${contradictions.length} temporal ${contradictions.length === 1 ? 'contradiction' : 'contradictions'} detected:\n`,
  ];
  
  contradictions.forEach((c, idx) => {
    lines.push(`${idx + 1}. [${c.severity.toUpperCase()}] ${c.type.replace(/_/g, ' ')}`);
    lines.push(`   ${c.explanation}`);
    lines.push(`   Intervals: ${c.intervals.join(', ')}`);
    lines.push(`   Affected scenes: ${c.affectedScenes.join(', ')}`);
    if (c.constraints.length > 0) {
      lines.push(`   Conflicting constraints:`);
      c.constraints.forEach(con => {
        lines.push(`     • ${con.intervalA} ${con.relation} ${con.intervalB} (${con.evidence})`);
      });
    }
    lines.push('');
  });

  return lines.join('\n');
}

/** Report shape for the doctor's diagnostic surface (types.ts's
 *  ScriptDoctorReport.temporalConsistency) — the same
 *  structured-data-plus-convenience-summary shape the rest of the
 *  diagnostic-field family uses. Wraps auditTemporalConsistency +
 *  formatTemporalReport; adds no new detection logic of its own. */
export interface TemporalConsistencyReport {
  contradictions: TemporalContradiction[];
  /** True iff no contradictions were found — convenience for a UI that just
   *  wants a pass/fail read without inspecting the array. */
  consistent: boolean;
  /** Human-readable rendering of `contradictions` (formatTemporalReport). */
  summary: string;
}

/** Doctor-facing entry point: run the audit and wrap it for direct
 *  attachment to ScriptDoctorReport. Diagnostic only — the caller must NOT
 *  fold this into health/verdict (see this file's 2026-08-03 header note
 *  for what evidence would be needed before that's a defensible change). */
export function auditTemporalConsistencyReport(
  scenes: ScreenplaySceneRecord[]
): TemporalConsistencyReport {
  const contradictions = auditTemporalConsistency(scenes);
  return {
    contradictions,
    consistent: contradictions.length === 0,
    summary: formatTemporalReport(contradictions),
  };
}
