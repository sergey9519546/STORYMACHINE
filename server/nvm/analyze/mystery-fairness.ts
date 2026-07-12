// Mystery Fairness Gates (OWNE O5).
//
// Complements disclosure-ledger.ts, which checks setup-BEFORE-payoff ORDER
// for arbitrary story facts. This module checks CLUE-SUFFICIENCY for a
// mystery's solution: does the audience receive every clue the solution
// requires, in time, and NOT hidden from them ("fair play" mystery
// convention)? Deterministic bookkeeping over caller-supplied clue-plant
// events -- not semantic understanding of what a clue means.
import type { SupportState } from '../proof/surfacing.ts';

/** A single clue-plant event: the clue with id `clueId` is planted in scene
 *  `sceneIndex`. `concealed` marks a clue that exists in-world but is
 *  withheld from the audience (e.g. described as off-page, discovered by a
 *  character but never shown/stated on the page) -- such a clue cannot help
 *  the audience solve the mystery even though it was "planted". */
export interface CluePlantEvent {
  clueId: string;
  sceneIndex: number;
  concealed?: boolean;
}

/** The mystery's solution: the set of clue ids required to fairly solve it,
 *  plus the scene at which the solution is revealed to the audience. */
export interface MysterySolution {
  requiredClueIds: readonly string[];
  revealSceneIndex: number;
}

export interface MysteryFairnessReport {
  fair: boolean;
  missingClues: string[];
  lateClues: string[];
  concealedCritical: string[];
  support: SupportState;
}

function isFiniteNonNegativeInt(n: unknown): n is number {
  return typeof n === 'number' && Number.isFinite(n) && Number.isInteger(n) && n >= 0;
}

function isValidPlantEvent(e: unknown): e is CluePlantEvent {
  if (!e || typeof e !== 'object') return false;
  const ev = e as Partial<CluePlantEvent>;
  if (typeof ev.clueId !== 'string' || ev.clueId.length === 0) return false;
  if (!isFiniteNonNegativeInt(ev.sceneIndex)) return false;
  if (ev.concealed !== undefined && typeof ev.concealed !== 'boolean') return false;
  return true;
}

/** Assess fair-play mystery clue-sufficiency, pure and deterministic.
 *
 *  Guards: malformed/negative-index plant events are dropped rather than
 *  thrown; duplicate plants of the same clue are fine (earliest valid plant
 *  wins for lateness/concealment purposes -- see below); an empty or
 *  malformed required-clue set degrades to UNKNOWN rather than a spurious
 *  pass/fail.
 *
 *  Per-required-clue evaluation, in order:
 *   1. missingClues  -- never planted anywhere (no valid plant event at all).
 *   2. lateClues     -- planted, but EVERY valid plant for this clue is AT or
 *      AFTER revealSceneIndex (planting a clue in the same scene as the
 *      reveal gives the audience no time to reason about it before being
 *      told the answer, so `sceneIndex >= revealSceneIndex` counts as late).
 *      If a clue has multiple plants and at least one lands strictly before
 *      the reveal and is not concealed-only, it is not late.
 *   3. concealedCritical -- the clue has at least one plant strictly before
 *      the reveal, but EVERY such early plant is marked `concealed` (hidden
 *      from the audience). A clue with at least one early, unconcealed plant
 *      is fine even if other plants of the same clue are concealed.
 *
 *  A required clue can land in exactly one of {missing, late,
 *  concealedCritical} or none (fair for that clue) -- the three lists are
 *  evaluated in the priority order above and are mutually exclusive per
 *  clue.
 *
 *  Support-state choice (mirrors surfacing.ts's SupportState contract):
 *   - no required clues (empty/malformed requiredClueIds after guarding) ->
 *     UNKNOWN. There is nothing to entail or contradict -- an empty
 *     solution is not evidence of fairness.
 *   - fair (no missing, no late, no concealed-critical, >=1 required clue)
 *     -> ENTAILED: the ledger positively establishes every required clue
 *     was fairly given to the audience in time.
 *   - any violation -> CONTRADICTED: the ledger positively establishes an
 *     unfair mystery (a hard fact about the clue record, not an absence of
 *     evidence). */
export function assessMysteryFairness(input: {
  solution: MysterySolution;
  plants: readonly CluePlantEvent[];
}): MysteryFairnessReport {
  const solution = input?.solution;
  const revealSceneIndex = isFiniteNonNegativeInt(solution?.revealSceneIndex)
    ? solution.revealSceneIndex
    : NaN;

  const requiredRaw = Array.isArray(solution?.requiredClueIds) ? solution.requiredClueIds : [];
  const requiredClueIds = Array.from(
    new Set(requiredRaw.filter((id): id is string => typeof id === 'string' && id.length > 0))
  );

  if (requiredClueIds.length === 0 || !Number.isFinite(revealSceneIndex)) {
    return { fair: true, missingClues: [], lateClues: [], concealedCritical: [], support: 'UNKNOWN' };
  }

  const plants = Array.isArray(input?.plants) ? input.plants.filter(isValidPlantEvent) : [];
  const plantsByClue = new Map<string, CluePlantEvent[]>();
  for (const p of plants) {
    const list = plantsByClue.get(p.clueId) ?? [];
    list.push(p);
    plantsByClue.set(p.clueId, list);
  }

  const missingClues: string[] = [];
  const lateClues: string[] = [];
  const concealedCritical: string[] = [];

  for (const clueId of requiredClueIds) {
    const clues = plantsByClue.get(clueId);
    if (!clues || clues.length === 0) {
      missingClues.push(clueId);
      continue;
    }

    const earlyPlants = clues.filter(c => c.sceneIndex < revealSceneIndex);
    if (earlyPlants.length === 0) {
      // every plant is at or after the reveal scene -- too late to be solvable.
      lateClues.push(clueId);
      continue;
    }

    const hasUnconcealedEarlyPlant = earlyPlants.some(c => c.concealed !== true);
    if (!hasUnconcealedEarlyPlant) {
      concealedCritical.push(clueId);
    }
  }

  const fair = missingClues.length === 0 && lateClues.length === 0 && concealedCritical.length === 0;
  return {
    fair,
    missingClues,
    lateClues,
    concealedCritical,
    support: fair ? 'ENTAILED' : 'CONTRADICTED',
  };
}
