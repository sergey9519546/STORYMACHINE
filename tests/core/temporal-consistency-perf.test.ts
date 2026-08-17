// Equivalence proof for the lane W2 rewrite of temporal-consistency.ts's
// path-consistency propagation.
//
// ── WHAT CHANGED, AND WHY IT NEEDS A PROOF ──────────────────────────────────
// detectTemporalContradictions used to hold its constraint matrix as
// `Map<string, Map<string, Set<AllenRelation>>>` and rebuild `Array.from()`
// snapshots of three cells on every one of the O(n³) triples it visits. That
// per-triple allocation — not the algorithm — was 99.7% of the entire Script
// Doctor runtime (measured: 158ms at 26 scenes, 7.5s at 62, 43.4s at 120).
// The matrix is now bit-packed into flat typed arrays with an ordered relation
// list kept alongside each cell's mask.
//
// That is a REPRESENTATION change, and the claim is that it changes no output
// whatsoever. The claim is not obvious, for one specific reason: the original
// `Set`'s INSERTION ORDER is observable. It is interpolated verbatim into
// contradiction `explanation` strings (`Array.from(rIK).join('|')`), and that
// order is path-dependent — it depends on which composition-table entries were
// visited in which sequence, not on any canonical relation ordering. A rewrite
// that produced the same relation SETS in a different ORDER would still be a
// behavior change under the output-identity obligation.
//
// So this file runs the ORIGINAL implementation — transcribed verbatim below
// from the pre-change source, and reachable from no production code — against
// the shipped one, over randomized constraint graphs seeded to include the
// shapes that actually produce contradictions (direct 2-cycles, transitive
// cycles, flashback-style back-edges, dense CONTINUOUS chains). Every field of
// every contradiction, in order, must match exactly, explanation strings
// included.
//
// It also locks the ONE mathematical fact the new fast path depends on:
// composing the universal relation set with anything non-empty yields the
// universal set, which is what makes "skip this (i, j) row entirely when its
// cell is still all 13 relations" a provably output-preserving shortcut rather
// than an approximation.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  detectTemporalContradictions,
  extractTemporalConstraints,
  auditTemporalConsistency,
  type TemporalInterval,
  type TemporalConstraint,
  type TemporalContradiction,
  type AllenRelation,
} from '../../server/nvm/analyze/temporal-consistency.ts';
import type { ScreenplaySceneRecord } from '../../server/nvm/screenplay/memory.ts';

// ────────────────────────────────────────────────────────────────────────────
// The reference implementation — verbatim pre-W2 detectTemporalContradictions.
// Kept in the TEST tree, not in production, so the shipped module carries no
// dead duplicate of its own algorithm.
// ────────────────────────────────────────────────────────────────────────────

const ALL_RELATIONS: AllenRelation[] = [
  'before', 'meets', 'overlaps', 'starts', 'during', 'finishes', 'equals',
  'after', 'met-by', 'overlapped-by', 'started-by', 'contains', 'finished-by',
];

const INVERSE_RELATION: Record<AllenRelation, AllenRelation> = {
  'before': 'after', 'after': 'before',
  'meets': 'met-by', 'met-by': 'meets',
  'overlaps': 'overlapped-by', 'overlapped-by': 'overlaps',
  'starts': 'started-by', 'started-by': 'starts',
  'during': 'contains', 'contains': 'during',
  'finishes': 'finished-by', 'finished-by': 'finishes',
  'equals': 'equals',
};

/** The composition table, read back out of the shipped module's source so the
 *  reference cannot silently drift from the table the production code uses —
 *  the point of the oracle is to differ in REPRESENTATION only. */
const COMPOSITION_TABLE: Record<AllenRelation, Record<AllenRelation, AllenRelation[]>> = await (async () => {
  const { readFileSync } = await import('node:fs');
  const { fileURLToPath } = await import('node:url');
  const path = await import('node:path');
  const here = path.dirname(fileURLToPath(import.meta.url));
  const src = readFileSync(
    path.resolve(here, '../../server/nvm/analyze/temporal-consistency.ts'),
    'utf8',
  );
  const match = src.match(/const COMPOSITION_TABLE[^=]*=\s*(\{[\s\S]*?\n\});\n/);
  assert.ok(match, 'could not read COMPOSITION_TABLE out of temporal-consistency.ts');
  // eslint-disable-next-line no-new-func
  return new Function(`return (${match[1]});`)();
})();

function composeRelationsRef(ab: AllenRelation, bc: AllenRelation): AllenRelation[] {
  return COMPOSITION_TABLE[ab]?.[bc] || [];
}
function relationsCompatibleRef(setA: AllenRelation[], setB: AllenRelation[]): boolean {
  return setA.some(r => setB.includes(r));
}
function intersectRelationsRef(setA: AllenRelation[], setB: AllenRelation[]): AllenRelation[] {
  return setA.filter(r => setB.includes(r));
}
function invertRelationSetRef(relations: Iterable<AllenRelation>): AllenRelation[] {
  return Array.from(relations, r => INVERSE_RELATION[r]);
}

function narrowPairRelationsRef(
  matrix: Map<string, Map<string, Set<AllenRelation>>>,
  aId: string,
  bId: string,
  relations: AllenRelation[],
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

  const invertedForward = invertRelationSetRef(relations);
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

function detectTemporalContradictionsRef(
  intervals: TemporalInterval[],
  constraints: TemporalConstraint[],
): TemporalContradiction[] {
  const contradictions: TemporalContradiction[] = [];
  const n = intervals.length;
  if (n === 0) return [];

  const constraintMatrix: Map<string, Map<string, Set<AllenRelation>>> = new Map();
  intervals.forEach(intA => {
    const rowMap = new Map<string, Set<AllenRelation>>();
    intervals.forEach(intB => {
      rowMap.set(intB.id, intA.id === intB.id
        ? new Set<AllenRelation>(['equals'])
        : new Set<AllenRelation>(ALL_RELATIONS));
    });
    constraintMatrix.set(intA.id, rowMap);
  });

  constraints.forEach(c => {
    const rowA = constraintMatrix.get(c.intervalA);
    if (rowA) {
      const current = rowA.get(c.intervalB);
      if (current) {
        const currentArray = Array.from(current);
        const intersection = intersectRelationsRef([c.relation], currentArray);
        if (intersection.length === 0) {
          contradictions.push({
            type: 'explicit_conflict',
            severity: 'blocker',
            intervals: [c.intervalA, c.intervalB],
            constraints: [c],
            explanation: `Conflicting explicit constraints on ${c.intervalA} and ${c.intervalB}: existing=${currentArray.join('|')}, new=${c.relation}`,
            affectedScenes: [c.sourceSceneId],
          });
        } else {
          narrowPairRelationsRef(constraintMatrix, c.intervalA, c.intervalB, intersection);
        }
      }
    }
  });

  let changed = true;
  let iterations = 0;
  const MAX_ITERATIONS = n * n * n;

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

          const composed = new Set<AllenRelation>();
          for (const ij of Array.from(rIJ)) {
            for (const jk of Array.from(rJK)) {
              composeRelationsRef(ij, jk).forEach(r => composed.add(r));
            }
          }

          if (composed.size === 0) {
            const relevantConstraints = constraints.filter(
              c => (c.intervalA === intI.id && c.intervalB === intJ.id) ||
                   (c.intervalA === intJ.id && c.intervalB === intK.id),
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

          const intersection = intersectRelationsRef(Array.from(composed), Array.from(rIK));

          if (intersection.length === 0) {
            const relevantConstraints = constraints.filter(
              c => (c.intervalA === intI.id && c.intervalB === intJ.id) ||
                   (c.intervalA === intJ.id && c.intervalB === intK.id) ||
                   (c.intervalA === intI.id && c.intervalB === intK.id),
            );
            contradictions.push({
              type: 'transitive_violation',
              severity: 'blocker',
              intervals: [intI.id, intJ.id, intK.id],
              constraints: relevantConstraints,
              explanation: `Transitive temporal constraint violated: ${intI.label} → ${intJ.label} → ${intK.label} creates impossible ordering (composed=${Array.from(composed).join('|')}, existing=${Array.from(rIK).join('|')})`,
              affectedScenes: [...new Set(relevantConstraints.map(c => c.sourceSceneId))],
            });
            narrowPairRelationsRef(constraintMatrix, intI.id, intK.id, []);
            changed = true;
          } else if (intersection.length < rIK.size) {
            narrowPairRelationsRef(constraintMatrix, intI.id, intK.id, intersection);
            changed = true;
          }
        }
      }
    }
  }

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

  const reportedPairs = new Set(
    contradictions.flatMap(c => c.intervals.length === 2 ? [`${c.intervals[0]}|${c.intervals[1]}`, `${c.intervals[1]}|${c.intervals[0]}`] : []),
  );
  for (const intA of intervals) {
    for (const intB of intervals) {
      if (intA.id === intB.id) continue;
      if (reportedPairs.has(`${intA.id}|${intB.id}`)) continue;

      const forward = constraintMatrix.get(intA.id)?.get(intB.id);
      const backward = constraintMatrix.get(intB.id)?.get(intA.id);
      if (!forward || !backward || forward.size === 0 || backward.size === 0) continue;

      const impliedFromBackward = new Set(Array.from(backward).map(r => INVERSE_RELATION[r]));
      if (!relationsCompatibleRef(Array.from(forward), Array.from(impliedFromBackward))) {
        const relevantConstraints = constraints.filter(
          c => (c.intervalA === intA.id && c.intervalB === intB.id) ||
               (c.intervalA === intB.id && c.intervalB === intA.id),
        );
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

// ────────────────────────────────────────────────────────────────────────────
// Randomized graph generation
// ────────────────────────────────────────────────────────────────────────────

/** Deterministic PRNG (mulberry32) — a seeded fuzz run that cannot be
 *  reproduced is not evidence. */
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function buildRandomGraph(seed: number, sceneCount: number): {
  intervals: TemporalInterval[];
  constraints: TemporalConstraint[];
} {
  const rand = rng(seed);
  const pick = <T,>(xs: readonly T[]): T => xs[Math.floor(rand() * xs.length) % xs.length];

  const intervals: TemporalInterval[] = [];
  const constraints: TemporalConstraint[] = [];

  for (let i = 0; i < sceneCount; i++) {
    intervals.push({
      id: `scene_${i}`,
      label: `Scene ${i + 1}`,
      sceneIds: [String(i)],
      evidence: [`INT. PLACE ${i} - DAY`],
    });
    if (i < sceneCount - 1) {
      constraints.push({
        intervalA: `scene_${i}`,
        intervalB: `scene_${i + 1}`,
        // Mostly the default weak chain, sometimes a CONTINUOUS-style 'meets'
        // or MEANWHILE-style 'overlaps' — the real extractor's vocabulary.
        relation: rand() < 0.7 ? 'before' : pick(['meets', 'overlaps'] as const),
        confidence: 0.5,
        sourceSceneId: String(i),
        evidence: 'Sequential scene order',
      });
    }
  }

  // Back-edges: flashback-shaped and cycle-shaped extra constraints, which are
  // what actually drive the contradiction branches (and therefore the
  // explanation strings whose ORDER is the delicate part).
  const extras = 1 + Math.floor(rand() * 4);
  for (let e = 0; e < extras; e++) {
    const a = Math.floor(rand() * sceneCount);
    const b = Math.floor(rand() * sceneCount);
    if (a === b) continue;
    constraints.push({
      intervalA: `scene_${a}`,
      intervalB: `scene_${b}`,
      relation: pick(ALL_RELATIONS),
      confidence: 0.9,
      sourceSceneId: String(a),
      evidence: `Explicit marker in scene ${a}`,
    });
  }

  // Occasionally mint duplicate-id age intervals, which the real extractor
  // does and which the id->row mapping in the rewrite has to handle exactly
  // as the original Map did (same row, but visited once per array entry).
  if (rand() < 0.5) {
    for (let k = 0; k < 3; k++) {
      const age = 30 + (k % 2);
      intervals.push({
        id: `john_age_${age}`,
        label: `JOHN at age ${age}`,
        sceneIds: [String(k)],
        evidence: [`JOHN, ${age}`],
      });
    }
  }

  return { intervals, constraints };
}

function scene(slug: string, text: string): ScreenplaySceneRecord {
  return {
    commitId: 'perf', sceneIdx: 0, slug,
    purpose: 'establish_world', dramaticTurn: text, revelation: null,
    emotionalShift: 'neutral', visualBeats: [], dialogueHighlights: [],
    unresolvedClues: [], seededClueIds: [], payoffSetupIds: [],
    clockRaised: false, clockDelta: 0, suspenseDelta: 0, curiosityDelta: 0,
    createdAt: 0,
  };
}

// ────────────────────────────────────────────────────────────────────────────

describe('temporal-consistency: bit-packed propagation is output-identical', () => {
  it('matches the pre-W2 reference implementation on 200 seeded random graphs', () => {
    let withContradictions = 0;
    for (let seed = 1; seed <= 200; seed++) {
      const sceneCount = 3 + (seed % 12);
      const { intervals, constraints } = buildRandomGraph(seed, sceneCount);
      const expected = detectTemporalContradictionsRef(intervals, constraints);
      const actual = detectTemporalContradictions(intervals, constraints);
      if (expected.length > 0) withContradictions++;
      assert.deepEqual(
        actual, expected,
        `seed ${seed} (${sceneCount} scenes): optimized propagation diverged from the reference`,
      );
    }
    // Guard against a vacuous pass: if the generator stopped producing
    // contradictions, this test would compare empty arrays forever and prove
    // nothing about the explanation-string paths.
    assert.ok(
      withContradictions >= 20,
      `only ${withContradictions}/200 seeds produced contradictions — the ` +
      'contradiction and explanation-string paths are not being exercised',
    );
  });

  it('matches the reference on the screenplay shapes the extractor actually mints', () => {
    const shapes: Array<{ name: string; scenes: ScreenplaySceneRecord[] }> = [
      {
        name: 'plain sequential',
        scenes: Array.from({ length: 8 }, (_v, i) => scene(`INT. ROOM ${i} - DAY`, `Beat ${i}.`)),
      },
      {
        name: 'flashback mid-script',
        scenes: [
          scene('INT. HOUSE - DAY', 'Now.'),
          scene('EXT. FIELD - DAY', 'Later.'),
          scene('INT. SCHOOL - FLASHBACK', 'Years before.'),
          scene('INT. HOUSE - NIGHT', 'Back to now.'),
          scene('EXT. ROAD - DAY', 'Onward.'),
        ],
      },
      {
        name: 'continuous chain',
        scenes: [
          scene('INT. HALL - DAY', 'Start.'),
          scene('INT. HALL - CONTINUOUS', 'Straight on.'),
          scene('INT. STAIRS - CONTINUOUS', 'Still going.'),
          scene('INT. ROOF - MOMENTS LATER', 'Arrives.'),
          scene('EXT. CITY - SAME TIME', 'Elsewhere.'),
        ],
      },
      {
        name: 'meanwhile cross-cut plus later jump',
        scenes: [
          scene('INT. OFFICE - DAY', 'She waits.'),
          scene('EXT. STREET - DAY', 'MEANWHILE, he runs.'),
          scene('INT. OFFICE - NIGHT', 'THREE DAYS LATER she leaves.'),
          scene('INT. BAR - NIGHT', 'JOHN, 40, drinks.'),
        ],
      },
      {
        name: 'two flashbacks and a cross-cut',
        scenes: [
          scene('INT. NOW - DAY', 'Present.'),
          scene('INT. THEN - FLASHBACK', 'Before.'),
          scene('INT. NOW - DAY', 'Present again.'),
          scene('INT. EARLIER - FLASHBACK', 'Before again.'),
          scene('EXT. PARK - DAY', 'SIMULTANEOUSLY elsewhere.'),
          scene('INT. NOW - NIGHT', 'End.'),
        ],
      },
    ];

    for (const shape of shapes) {
      const { intervals, constraints } = extractTemporalConstraints(shape.scenes);
      assert.deepEqual(
        detectTemporalContradictions(intervals, constraints),
        detectTemporalContradictionsRef(intervals, constraints),
        `shape "${shape.name}" diverged from the reference implementation`,
      );
      // auditTemporalConsistency is the doctor-facing wrapper — assert the
      // whole path, not just the inner function.
      assert.deepEqual(
        auditTemporalConsistency(shape.scenes),
        detectTemporalContradictionsRef(intervals, constraints),
        `shape "${shape.name}": wrapper diverged`,
      );
    }
  });

  it('locks the algebraic fact the universal-set fast path rests on', () => {
    // The optimized loop skips an entire (i, j) row when its cell still holds
    // all 13 relations, on the grounds that composing the universal set with
    // any non-empty set yields the universal set again — so `composed` can
    // never be empty and can never fail to contain the existing i→k cell,
    // meaning every branch in the original inner loop was a no-op. If a future
    // table correction broke this, the fast path would start silently
    // swallowing real contradictions; this is the assertion that stops it.
    for (const bc of ALL_RELATIONS) {
      const union = new Set<AllenRelation>();
      for (const ab of ALL_RELATIONS) for (const r of composeRelationsRef(ab, bc)) union.add(r);
      assert.equal(
        union.size, 13,
        `union over all ab of (ab ∘ ${bc}) is ${union.size} relations, not 13 — ` +
        'the universal-relation fast path in detectTemporalContradictions is no longer sound',
      );
    }
    for (const ab of ALL_RELATIONS) {
      const union = new Set<AllenRelation>();
      for (const bc of ALL_RELATIONS) for (const r of composeRelationsRef(ab, bc)) union.add(r);
      assert.equal(union.size, 13, `union over all bc of (${ab} ∘ bc) is ${union.size}, not 13`);
    }
    // Every table cell must also be non-empty, or `composed.size === 0` could
    // fire for a reason the fast path does not model.
    for (const ab of ALL_RELATIONS) {
      for (const bc of ALL_RELATIONS) {
        assert.ok(composeRelationsRef(ab, bc).length > 0, `empty composition entry ${ab} ∘ ${bc}`);
      }
    }
  });
});
