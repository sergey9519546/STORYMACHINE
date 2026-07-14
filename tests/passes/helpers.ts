// Shared test-side factories for revision-pass tests (audit M2.2). New waves
// should import these instead of cloning a local `makeRecNNN`/fountain-builder
// per wave — existing wave describe blocks are untouched (frozen, still green)
// and keep their own local copies.
import type { ScreenplaySceneRecord } from '../../server/nvm/screenplay/memory.ts';
import type { StructureState, ActPosition } from '../../server/nvm/screenplay/structure.ts';

/** A valid, minimal ScreenplaySceneRecord with sensible zero-signal defaults. */
export function makeSceneRecord(
  sceneIdx: number,
  overrides: Partial<ScreenplaySceneRecord> = {},
): ScreenplaySceneRecord {
  return {
    commitId: `commit-${sceneIdx}`,
    sceneIdx,
    slug: `INT. SCENE ${sceneIdx} - DAY`,
    purpose: 'complicate',
    dramaticTurn: 'nothing',
    revelation: null,
    emotionalShift: 'neutral',
    visualBeats: [],
    dialogueHighlights: [],
    unresolvedClues: [],
    seededClueIds: [],
    payoffSetupIds: [],
    clockRaised: false,
    clockDelta: 0,
    suspenseDelta: 0,
    curiosityDelta: 0,
    relationshipShifts: [],
    createdAt: 0,
    ...overrides,
  };
}

/** A plain, cliché-free fountain with one scene heading + one action line per record. */
export function buildPlainFountain(count: number): string {
  return Array.from({ length: count }, (_, i) => `INT. SCENE ${i} - DAY\n\nAction happens.`).join('\n\n');
}

/** A valid, minimal StructureState with sensible zero-signal defaults. Mirrors
 *  makeSceneRecord's convention: neutral baseline you override per-test. Kept in
 *  sync with StructureState in server/nvm/screenplay/structure.ts. */
export function makeStructureState(
  overrides: Partial<StructureState> = {},
): StructureState {
  return {
    actPosition: 'act1' as ActPosition,
    completionPercent: 20,
    avgSuspensePerScene: 2,
    escalating: false,
    reversalCount: 1,
    reversalDensity: 1,
    approachingClimax: false,
    openClues: 0,
    revelationCount: 0,
    midpointPressure: 2,
    tightestScene: null,
    ...overrides,
  };
}
