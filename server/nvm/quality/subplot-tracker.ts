// Subplot Tracker — GODMODE L13 (Subplot Architecture).
//
// Identifies and tracks subplots from the StoryOp stream. A subplot is a
// secondary dramatic thread with its own goal, conflict, and lifecycle
// that intersects with but is distinct from the main plot.
//
// Subplot types (GODMODE §13):
//   relationship_arc     — a character pair with 3+ relationship shifts
//   mystery_thread       — a clue seeded but not paid off within 5 scenes
//   theme_counterargument — a theme claim with 3+ moves that doesn't resolve
//   object_arc            — an object with 2+ lifecycle advancements
//   unclassified         — too little data to classify
//
// Each subplot tracks: participants, openedAtScene, resolvedAtScene,
// intersectionScenes (where 2+ subplots are active simultaneously).

import type { StoryOp } from '../ops/StoryOp.ts';

export type SubplotType =
  | 'relationship_arc' | 'mystery_thread' | 'theme_counterargument'
  | 'object_arc' | 'unclassified';

export interface SubplotRecord {
  subplotId: string;
  type: SubplotType;
  participants: string[];
  openedAtScene: number;
  resolvedAtScene: number | null;
  intersectionScenes: number[];
  opsCount: number;
  description: string;
}

export interface SubplotAnalysisReport {
  subplots: SubplotRecord[];
  totalSubplots: number;
  unresolvedSubplots: number;
  intersectionCount: number;
  scored: boolean;
}

interface SceneOps { sceneIdx: number; ops: StoryOp[] }

export function analyzeSubplots(scenes: SceneOps[]): SubplotAnalysisReport {
  // Track per-thread state
  const relShifts = new Map<string, { scenes: number[]; pairs: string[]; count: number }>();
  const clueThreads = new Map<string, { seedScene: number; payoffScene: number | null }>();
  const themeThreads = new Map<string, { scenes: number[]; moves: string[]; resolved: boolean }>();
  const objectThreads = new Map<string, { scenes: number[]; states: string[]; terminal: boolean }>();

  for (const { sceneIdx, ops } of scenes) {
    for (const op of ops) {
      switch (op.op) {
        case 'SHIFT_RELATIONSHIP': {
          const key = [...op.pair].sort().join('|');
          const entry = relShifts.get(key) ?? { scenes: [], pairs: [...op.pair].sort(), count: 0 };
          entry.scenes.push(sceneIdx);
          entry.count++;
          relShifts.set(key, entry);
          break;
        }
        case 'SEED_CLUE': {
          if (!clueThreads.has(op.clueId)) {
            clueThreads.set(op.clueId, { seedScene: sceneIdx, payoffScene: null });
          }
          break;
        }
        case 'PAYOFF_SETUP': {
          const thread = clueThreads.get(op.setupId);
          if (thread && thread.payoffScene === null) {
            thread.payoffScene = sceneIdx;
          }
          break;
        }
        case 'ADVANCE_THEME_ARGUMENT': {
          const entry = themeThreads.get(op.claimId) ?? { scenes: [], moves: [], resolved: false };
          entry.scenes.push(sceneIdx);
          entry.moves.push(op.move);
          if (op.move === 'resolve') entry.resolved = true;
          themeThreads.set(op.claimId, entry);
          break;
        }
        case 'ADVANCE_OBJECT_ARC': {
          const entry = objectThreads.get(op.objectId) ?? { scenes: [], states: [], terminal: false };
          entry.scenes.push(sceneIdx);
          entry.states.push(op.toState);
          const TERMINAL = new Set(['destroyed', 'resolved', 'returned', 'complete', 'found', 'lost_permanently']);
          if (TERMINAL.has(op.toState.toLowerCase())) entry.terminal = true;
          objectThreads.set(op.objectId, entry);
          break;
        }
      }
    }
  }

  // Build subplot records
  const subplots: SubplotRecord[] = [];

  // Relationship arcs: 3+ shifts
  for (const [key, data] of relShifts) {
    if (data.count >= 3) {
      subplots.push({
        subplotId: `rel:${key}`,
        type: 'relationship_arc',
        participants: data.pairs,
        openedAtScene: data.scenes[0],
        resolvedAtScene: data.scenes[data.scenes.length - 1],
        intersectionScenes: [],
        opsCount: data.count,
        description: `${data.pairs[0]}↔${data.pairs[1]} relationship arc (${data.count} shifts)`,
      });
    }
  }

  // Mystery threads: seeded but not paid off within 5 scenes
  for (const [clueId, thread] of clueThreads) {
    const isUnresolved = thread.payoffScene === null;
    const isLate = thread.payoffScene !== null && (thread.payoffScene - thread.seedScene) > 5;
    if (isUnresolved || isLate) {
      subplots.push({
        subplotId: `mystery:${clueId}`,
        type: 'mystery_thread',
        participants: [],
        openedAtScene: thread.seedScene,
        resolvedAtScene: thread.payoffScene,
        intersectionScenes: [],
        opsCount: isUnresolved ? 1 : 2,
        description: `Mystery thread "${clueId}" ${isUnresolved ? 'unresolved' : 'late payoff'} (seeded scene ${thread.seedScene})`,
      });
    }
  }

  // Theme counterarguments: 3+ moves without resolution
  for (const [claimId, data] of themeThreads) {
    if (data.moves.length >= 3 && !data.resolved) {
      subplots.push({
        subplotId: `theme:${claimId}`,
        type: 'theme_counterargument',
        participants: [],
        openedAtScene: data.scenes[0],
        resolvedAtScene: null,
        intersectionScenes: [],
        opsCount: data.moves.length,
        description: `Theme "${claimId}" has ${data.moves.length} moves [${data.moves.join(', ')}] — unresolved argument`,
      });
    }
  }

  // Object arcs: 2+ advancements
  for (const [objId, data] of objectThreads) {
    if (data.states.length >= 2) {
      subplots.push({
        subplotId: `obj:${objId}`,
        type: 'object_arc',
        participants: [],
        openedAtScene: data.scenes[0],
        resolvedAtScene: data.terminal ? data.scenes[data.scenes.length - 1] : null,
        intersectionScenes: [],
        opsCount: data.states.length,
        description: `Object "${objId}" lifecycle: ${data.states.join(' → ')}${data.terminal ? ' (terminal)' : ' (active)'}`,
      });
    }
  }

  // Compute intersection scenes: scenes where 2+ subplots are simultaneously active
  const sceneActivity = new Map<number, number>();
  for (const sp of subplots) {
    const end = sp.resolvedAtScene ?? 9999;
    for (let s = sp.openedAtScene; s <= end && s < (scenes.length); s++) {
      sceneActivity.set(s, (sceneActivity.get(s) ?? 0) + 1);
    }
  }
  const intersectionScenes = [...sceneActivity.entries()]
    .filter(([, count]) => count >= 2)
    .map(([scene]) => scene);
  for (const sp of subplots) {
    sp.intersectionScenes = intersectionScenes.filter(s => s >= sp.openedAtScene && (sp.resolvedAtScene === null || s <= sp.resolvedAtScene));
  }

  const unresolved = subplots.filter(s => s.resolvedAtScene === null).length;

  return {
    subplots: subplots.sort((a, b) => a.openedAtScene - b.openedAtScene),
    totalSubplots: subplots.length,
    unresolvedSubplots: unresolved,
    intersectionCount: intersectionScenes.length,
    scored: true,
  };
}
