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

/**
 * Check if two relation sets are compatible (have non-empty intersection)
 */
function relationsCompatible(setA: AllenRelation[], setB: AllenRelation[]): boolean {
  return setA.some(r => setB.includes(r));
}

/**
 * Find the intersection of two relation sets
 */
function intersectRelations(setA: AllenRelation[], setB: AllenRelation[]): AllenRelation[] {
  return setA.filter(r => setB.includes(r));
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

function invertRelationSet(relations: Iterable<AllenRelation>): AllenRelation[] {
  return Array.from(relations, r => INVERSE_RELATION[r]);
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
 */
function narrowPairRelations(
  matrix: Map<string, Map<string, Set<AllenRelation>>>,
  aId: string,
  bId: string,
  relations: AllenRelation[]
): boolean {
  let changed = false;
  const rowA = matrix.get(aId);
  const rowB = matrix.get(bId);

  const newForward = new Set(relations);
  const currentForward = rowA?.get(bId);
  if (rowA) {
    if (!currentForward || currentForward.size !== newForward.size || !Array.from(currentForward).every(r => newForward.has(r))) {
      rowA.set(bId, newForward);
      changed = true;
    }
  }

  const invertedForward = invertRelationSet(relations);
  const currentBackward = rowB?.get(aId);
  if (rowB && currentBackward) {
    const newBackward = new Set(Array.from(currentBackward).filter(r => invertedForward.includes(r)));
    if (newBackward.size !== currentBackward.size) {
      rowB.set(aId, newBackward);
      changed = true;
    }
  }

  return changed;
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
  
  // Build constraint matrix: constraintMatrix[i][j] = possible relations between interval i and j
  const constraintMatrix: Map<string, Map<string, Set<AllenRelation>>> = new Map();
  
  // Initialize with all possible relations
  intervals.forEach(intA => {
    const rowMap = new Map<string, Set<AllenRelation>>();
    intervals.forEach(intB => {
      if (intA.id === intB.id) {
        rowMap.set(intB.id, new Set<AllenRelation>(['equals']));
      } else {
        // Start with all 13 relations possible
        rowMap.set(intB.id, new Set<AllenRelation>([
          'before', 'meets', 'overlaps', 'starts', 'during', 'finishes', 'equals',
          'after', 'met-by', 'overlapped-by', 'started-by', 'contains', 'finished-by'
        ]));
      }
    });
    constraintMatrix.set(intA.id, rowMap);
  });
  
  // Apply explicit constraints and check for immediate conflicts
  constraints.forEach(c => {
    const rowA = constraintMatrix.get(c.intervalA);
    if (rowA) {
      const current = rowA.get(c.intervalB);
      if (current) {
        const currentArray = Array.from(current);
        // Intersect with existing constraint
        const intersection = intersectRelations([c.relation], currentArray);
        if (intersection.length === 0) {
          // Explicit contradiction - same pair has incompatible constraints
          contradictions.push({
            type: 'explicit_conflict',
            severity: 'blocker',
            intervals: [c.intervalA, c.intervalB],
            constraints: [c],
            explanation: `Conflicting explicit constraints on ${c.intervalA} and ${c.intervalB}: existing=${currentArray.join('|')}, new=${c.relation}`,
            affectedScenes: [c.sourceSceneId],
          });
        } else {
          // Narrow BOTH directions together (see narrowPairRelations) so the
          // backward cell never drifts away from being the true inverse of
          // this forward assertion.
          narrowPairRelations(constraintMatrix, c.intervalA, c.intervalB, intersection);
        }
      }
    }
  });
  
  // Path consistency propagation (Floyd-Warshall style)
  let changed = true;
  let iterations = 0;
  const MAX_ITERATIONS = n * n * n; // Safety limit
  
  while (changed && iterations < MAX_ITERATIONS) {
    changed = false;
    iterations++;
    
    for (const intI of intervals) {
      for (const intJ of intervals) {
        if (intI.id === intJ.id) continue;
        
        const rIJ = constraintMatrix.get(intI.id)?.get(intJ.id);
        if (!rIJ || rIJ.size === 0) continue;
        
        for (const intK of intervals) {
          if (intK.id === intI.id || intK.id === intJ.id) continue;
          
          const rJK = constraintMatrix.get(intJ.id)?.get(intK.id);
          const rIK = constraintMatrix.get(intI.id)?.get(intK.id);
          
          if (!rJK || !rIK || rJK.size === 0 || rIK.size === 0) continue;
          
          // Compose all pairs of relations
          const composed = new Set<AllenRelation>();
          for (const ij of Array.from(rIJ)) {
            for (const jk of Array.from(rJK)) {
              const compositions = composeRelations(ij, jk);
              compositions.forEach(r => composed.add(r));
            }
          }
          
          // If composition is empty, that's impossible
          if (composed.size === 0) {
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
          
          // Intersect with existing constraint on i→k
          const intersection = intersectRelations(Array.from(composed), Array.from(rIK));
          
          if (intersection.length === 0) {
            // Transitive contradiction detected
            const relevantConstraints = constraints.filter(
              c => (c.intervalA === intI.id && c.intervalB === intJ.id) ||
                   (c.intervalA === intJ.id && c.intervalB === intK.id) ||
                   (c.intervalA === intI.id && c.intervalB === intK.id)
            );
            
            contradictions.push({
              type: 'transitive_violation',
              severity: 'blocker',
              intervals: [intI.id, intJ.id, intK.id],
              constraints: relevantConstraints,
              explanation: `Transitive temporal constraint violated: ${intI.label} → ${intJ.label} → ${intK.label} creates impossible ordering (composed=${Array.from(composed).join('|')}, existing=${Array.from(rIK).join('|')})`,
              affectedScenes: [...new Set(relevantConstraints.map(c => c.sourceSceneId))],
            });
            
            // Don't return immediately - collect all contradictions
            // But mark this relation as impossible (both directions, via
            // narrowPairRelations, so the backward cell doesn't keep
            // reporting a now-invalidated relation set).
            narrowPairRelations(constraintMatrix, intI.id, intK.id, []);
            changed = true;
          } else if (intersection.length < rIK.size) {
            // Narrow BOTH directions together (see narrowPairRelations) so
            // the backward cell (K→I) stays the true inverse of this
            // forward cell instead of drifting via unrelated composition
            // paths — the root cause of the CONTINUOUS/MOMENTS LATER/SAME
            // TIME false positives fixed 2026-08-03 (see that function's
            // doc comment).
            narrowPairRelations(constraintMatrix, intI.id, intK.id, intersection);
            changed = true;
          }
        }
      }
    }
  }
  
  // Check for cycles (interval before itself)
  intervals.forEach(int => {
    const selfRelations = constraintMatrix.get(int.id)?.get(int.id);
    if (selfRelations && !selfRelations.has('equals')) {
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
  for (const intA of intervals) {
    for (const intB of intervals) {
      if (intA.id === intB.id) continue;
      if (reportedPairs.has(`${intA.id}|${intB.id}`)) continue;

      const forward = constraintMatrix.get(intA.id)?.get(intB.id);
      const backward = constraintMatrix.get(intB.id)?.get(intA.id);
      if (!forward || !backward || forward.size === 0 || backward.size === 0) continue;

      const impliedFromBackward = new Set(Array.from(backward).map(r => INVERSE_RELATION[r]));
      if (!relationsCompatible(Array.from(forward), Array.from(impliedFromBackward))) {
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
            ? `Cyclic temporal dependency detected: ${intA.label} and ${intB.label} directly constrain each other to incompatible orderings (${Array.from(forward).join('|')} vs. inverse of ${Array.from(backward).join('|')})`
            : `Transitive temporal constraint violated: inferred ordering between ${intA.label} and ${intB.label} (${Array.from(forward).join('|')}) conflicts with the inverse of the explicit ordering back from ${intB.label} (${Array.from(backward).join('|')})`,
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
