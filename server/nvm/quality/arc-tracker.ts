// Arc Completion Tracker (Wave 25) — finds every open narrative promise
// in the committed scene history and generates pacing-aware completion
// recommendations. "Open promise" = a story beat that has been planted
// but not resolved.
//
// Promise categories:
//   CLUE    — SEED_CLUE with no matching PAYOFF_SETUP
//   CLOCK   — RAISE_CLOCK with no subsequent RAISE_CLOCK(amount<0) or counter-op
//   REL     — negative SHIFT_RELATIONSHIP with no positive recovery
//   THEME   — ADVANCE_THEME_ARGUMENT 'support'/'attack' without 'resolve'
//   OBJECT  — ADVANCE_OBJECT_ARC that is not in a terminal lifecycle state

import type { StoryOp } from '../ops/StoryOp.ts';

// ── Types ─────────────────────────────────────────────────────────────────────

export type PromiseKind = 'CLUE' | 'CLOCK' | 'REL' | 'THEME' | 'OBJECT';
export type PromiseUrgency = 'overdue' | 'due_soon' | 'on_track' | 'not_yet';

export interface OpenPromise {
  promiseId: string;
  kind: PromiseKind;
  description: string;
  openedAtScene: number;
  /** Ideal completion window [earliest, latest] scene index (inclusive). */
  targetWindow: [number, number];
  urgency: PromiseUrgency;
  /** Suggested StoryOp kind to resolve this promise. */
  suggestedOp: StoryOp['op'];
  /** Pacing score 0–1: 1 = perfect pacing, 0 = severely overdue. */
  pacingScore: number;
}

export interface ArcCompletionReport {
  totalScenes: number;
  openPromises: OpenPromise[];
  resolvedCount: number;
  overdueCount: number;
  /** Debt score: 0 = no debt, 100 = all promises overdue. */
  debtScore: number;
}

// ── Promise accumulator ───────────────────────────────────────────────────────

interface SceneOps {
  sceneIdx: number;
  ops: StoryOp[];
}

export function analyzeArcCompletion(scenes: SceneOps[]): ArcCompletionReport {
  const totalScenes = scenes.length;

  // Accumulate open/closed promises pass-over
  const openClues       = new Map<string, number>();   // clueId → openedAtScene
  const openClocks      = new Map<string, { scene: number; totalAmount: number }>();
  const openRelNeg      = new Map<string, { scene: number; netAmount: number }>();
  const openThemes      = new Map<string, { scene: number; moves: string[] }>();
  const openObjects     = new Map<string, { scene: number; currentState: string }>();
  let resolvedCount     = 0;

  const TERMINAL_OBJECT_STATES = new Set(['destroyed', 'resolved', 'returned', 'complete', 'found', 'lost_permanently']);

  for (const { sceneIdx, ops } of scenes) {
    for (const op of ops) {
      switch (op.op) {
        case 'SEED_CLUE':
          openClues.set(op.clueId, sceneIdx);
          break;

        case 'PAYOFF_SETUP': {
          const matchedClue = [...openClues.keys()].find(id => id === op.setupId);
          if (matchedClue) { openClues.delete(matchedClue); resolvedCount++; }
          break;
        }

        case 'RAISE_CLOCK': {
          const existing = openClocks.get(op.clockId);
          const newTotal = (existing?.totalAmount ?? 0) + (isFinite(op.amount) ? op.amount : 0);
          if (newTotal <= 0) {
            if (existing) resolvedCount++;
            openClocks.delete(op.clockId);
          } else {
            openClocks.set(op.clockId, { scene: existing?.scene ?? sceneIdx, totalAmount: newTotal });
          }
          break;
        }

        case 'SHIFT_RELATIONSHIP': {
          const key = [...op.pair].sort().join('|');
          const existing = openRelNeg.get(key);
          const deltaAmt = typeof op.delta?.amount === 'number' && isFinite(op.delta.amount) ? op.delta.amount : 0;
          const net = (existing?.netAmount ?? 0) + deltaAmt;
          if (net >= -0.1) {
            if (existing) resolvedCount++;
            openRelNeg.delete(key);
          } else {
            openRelNeg.set(key, { scene: existing?.scene ?? sceneIdx, netAmount: net });
          }
          break;
        }

        case 'ADVANCE_THEME_ARGUMENT': {
          if (op.move === 'resolve') {
            if (openThemes.has(op.claimId)) resolvedCount++;
            openThemes.delete(op.claimId);
          } else {
            const existing = openThemes.get(op.claimId);
            openThemes.set(op.claimId, {
              scene: existing?.scene ?? sceneIdx,
              moves: [...(existing?.moves ?? []), op.move],
            });
          }
          break;
        }

        case 'ADVANCE_OBJECT_ARC': {
          const isTerminal = TERMINAL_OBJECT_STATES.has(op.toState.toLowerCase());
          if (isTerminal) {
            if (openObjects.has(op.objectId)) resolvedCount++;
            openObjects.delete(op.objectId);
          } else {
            openObjects.set(op.objectId, { scene: sceneIdx, currentState: op.toState });
          }
          break;
        }
      }
    }
  }

  // Build open promise list with pacing recommendations
  const openPromises: OpenPromise[] = [];

  // CLUE promises — ideal window: 3–8 scenes after planting; beyond 8 = overdue
  for (const [clueId, openedAtScene] of openClues) {
    const age = totalScenes - openedAtScene;
    const targetWindow: [number, number] = [openedAtScene + 3, openedAtScene + 8];
    const urgency = computeUrgency(totalScenes - 1, targetWindow);
    openPromises.push({
      promiseId: `clue:${clueId}`,
      kind: 'CLUE',
      description: `Clue "${clueId}" seeded at scene ${openedAtScene} — needs a PAYOFF_SETUP`,
      openedAtScene,
      targetWindow,
      urgency,
      suggestedOp: 'PAYOFF_SETUP',
      pacingScore: computePacingScore(age, 3, 8),
    });
  }

  // CLOCK promises — ideal resolution: 2–6 scenes after raising
  for (const [clockId, { scene: openedAtScene, totalAmount }] of openClocks) {
    const age = totalScenes - openedAtScene;
    const targetWindow: [number, number] = [openedAtScene + 2, openedAtScene + 6];
    const urgency = computeUrgency(totalScenes - 1, targetWindow);
    openPromises.push({
      promiseId: `clock:${clockId}`,
      kind: 'CLOCK',
      description: `Clock "${clockId}" at ${totalAmount.toFixed(1)} — planted at scene ${openedAtScene}, awaiting countdown`,
      openedAtScene,
      targetWindow,
      urgency,
      suggestedOp: 'RAISE_CLOCK',
      pacingScore: computePacingScore(age, 2, 6),
    });
  }

  // REL promises — negative relationships should recover within 4–10 scenes
  for (const [key, { scene: openedAtScene, netAmount }] of openRelNeg) {
    const age = totalScenes - openedAtScene;
    const targetWindow: [number, number] = [openedAtScene + 2, openedAtScene + 10];
    const urgency = computeUrgency(totalScenes - 1, targetWindow);
    const [a, b] = key.split('|');
    openPromises.push({
      promiseId: `rel:${key}`,
      kind: 'REL',
      description: `${a}↔${b} relationship at net ${netAmount.toFixed(2)} — needs recovery arc`,
      openedAtScene,
      targetWindow,
      urgency,
      suggestedOp: 'SHIFT_RELATIONSHIP',
      pacingScore: computePacingScore(age, 2, 10),
    });
  }

  // THEME promises — resolve within 5–15 scenes of first support/attack
  for (const [claimId, { scene: openedAtScene, moves }] of openThemes) {
    const age = totalScenes - openedAtScene;
    const targetWindow: [number, number] = [openedAtScene + 5, openedAtScene + 15];
    const urgency = computeUrgency(totalScenes - 1, targetWindow);
    openPromises.push({
      promiseId: `theme:${claimId}`,
      kind: 'THEME',
      description: `Theme "${claimId}" has ${moves.length} move(s) [${moves.join(', ')}] — awaiting 'resolve'`,
      openedAtScene,
      targetWindow,
      urgency,
      suggestedOp: 'ADVANCE_THEME_ARGUMENT',
      pacingScore: computePacingScore(age, 5, 15),
    });
  }

  // OBJECT promises — resolve within 3–12 scenes of last non-terminal arc
  for (const [objectId, { scene: openedAtScene, currentState }] of openObjects) {
    const age = totalScenes - openedAtScene;
    const targetWindow: [number, number] = [openedAtScene + 3, openedAtScene + 12];
    const urgency = computeUrgency(totalScenes - 1, targetWindow);
    openPromises.push({
      promiseId: `obj:${objectId}`,
      kind: 'OBJECT',
      description: `Object "${objectId}" in state "${currentState}" — lifecycle not yet completed`,
      openedAtScene,
      targetWindow,
      urgency,
      suggestedOp: 'ADVANCE_OBJECT_ARC',
      pacingScore: computePacingScore(age, 3, 12),
    });
  }

  // Sort: overdue first, then by pacing score ascending
  const urgencyOrder: Record<PromiseUrgency, number> = { overdue: 0, due_soon: 1, on_track: 2, not_yet: 3 };
  openPromises.sort((a, b) => urgencyOrder[a.urgency] - urgencyOrder[b.urgency] || a.pacingScore - b.pacingScore);

  const overdueCount = openPromises.filter(p => p.urgency === 'overdue').length;
  const dueSoonCount = openPromises.filter(p => p.urgency === 'due_soon').length;
  // Normalized 0–100: overdue weighted 80%, due_soon weighted 20%.
  // Both terms are proportions (count/total) so the result stays in [0, 100].
  const debtScore = openPromises.length === 0
    ? 0
    : Math.round(
        (overdueCount / openPromises.length) * 80 +
        (dueSoonCount  / openPromises.length) * 20,
      );

  return { totalScenes, openPromises, resolvedCount, overdueCount, debtScore: Math.min(100, debtScore) };
}

// ── Pacing helpers ────────────────────────────────────────────────────────────

function computeUrgency(currentScene: number, [earliest, latest]: [number, number]): PromiseUrgency {
  if (currentScene > latest)    return 'overdue';
  if (currentScene >= earliest) return 'due_soon';
  if (currentScene >= earliest - 2) return 'on_track';
  return 'not_yet';
}

function computePacingScore(age: number, minAge: number, maxAge: number): number {
  if (age < minAge) return 1;
  if (age <= maxAge) return maxAge === minAge ? 1 : 1 - ((age - minAge) / (maxAge - minAge)) * 0.5;
  const overdue = age - maxAge;
  return Math.max(0, 0.5 - overdue * 0.08);
}
