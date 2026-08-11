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

export type PromiseKind = 'CLUE' | 'CLOCK' | 'REL' | 'THEME' | 'OBJECT' | 'EMOTIONAL_DEBT' | 'BELIEF_CONFLICT' | 'AUDIENCE_QUESTION' | 'SCENE_DEAD_AIR';
export type PromiseUrgency = 'overdue' | 'due_soon' | 'on_track' | 'not_yet';

/**
 * Stress accounts — decomposes dramatic pressure into typed categories
 * aligned with the GODMODE Screenplay Understanding Standard
 * (docs/GODMODE_SCREENPLAY_UNDERSTANDING_STANDARD.md).
 *
 * GODMODE level mapping:
 *   systemic    ← L21 (Setup/Payoff Architecture), L3 (World/Rules)
 *   relational  ← L10 (Relationship Architecture)
 *   character   ← L27 (Emotional Architecture), L6 (Protagonist)
 *   epistemic   ← L19 (Reveal & Clue Architecture), L4 (Fabula/Syuzhet)
 *   thematic    ← L23 (Theme as Argument)
 *   scene       ← L14 (Scene Function Intelligence), L26 (Pacing & Rhythm)
 *   audience    ← L20 (Audience-State Architecture)
 */
export type StressAccount = 'systemic' | 'relational' | 'character' | 'epistemic' | 'thematic' | 'scene' | 'audience';

/** Maps each PromiseKind to the stress account it feeds. */
export const PROMISE_KIND_TO_ACCOUNT: Record<PromiseKind, StressAccount> = {
  CLOCK: 'systemic',
  OBJECT: 'systemic',
  REL: 'relational',
  EMOTIONAL_DEBT: 'character',
  CLUE: 'epistemic',
  BELIEF_CONFLICT: 'epistemic',
  AUDIENCE_QUESTION: 'audience',
  SCENE_DEAD_AIR: 'scene',
  THEME: 'thematic',
};

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

export interface AccountBreakdown {
  account: StressAccount;
  /** Debt score for this account alone (0–100, same weighting as overall). */
  subtotal: number;
  openCount: number;
  overdueCount: number;
  promises: OpenPromise[];
}

/** Path-dependence lock mode — restricts stress transitions (spec §16). */
export type HysteresisLockMode = 'none' | 'tense_truce' | 'aftermath_lock' | 'burnout_lock';

/**
 * Temporal dynamics across scenes: fatigue accumulation, catharsis recency,
 * and hysteresis lock mode. These are the mechanisms that make the ledger
 * qualitatively different from a flat promise tracker (spec §16–17).
 */
export interface TemporalDynamics {
  /** Fatigue scalar 0–1: sustained high distress numbs sensitivity. */
  fatigue: number;
  highStressBeatCount: number;
  recoveryBeatCount: number;
  /** 1.0 = normal sensitivity, lower = numb. effective_delta = raw_delta * sensitivityMultiplier. */
  sensitivityMultiplier: number;
  /** Scenes since the last catharsis (EMOTIONAL_DEBT resolution). totalScenes if none occurred. */
  beatsSinceCatharsis: number;
  /** Lock mode derived from fatigue + catharsis recency. */
  lockMode: HysteresisLockMode;
}

/**
 * Per-sequence structural summary (GODMODE L12 — Sequence Architecture).
 * Sequences are the most useful unit between whole script and scene.
 * Grouping adapts to script length: target 8 sequences, minimum 3 scenes each.
 */
export interface SequenceGroup {
  index: number;
  startScene: number;
  endScene: number;
  /** Promise kinds that opened during this sequence. */
  kindsOpened: PromiseKind[];
  /** Count of promises opened during this sequence (from final openPromises). */
  promisesOpened: number;
  /** Whether this sequence contains a catharsis beat (EMOTIONAL_DEBT resolved). */
  hasCatharsis: boolean;
  /** Whether this sequence contains high distress (EMOTIONAL_DEBT opened). */
  hasDistress: boolean;
  /** Whether this sequence contains a reveal (knownFact delivered). */
  hasReveal: boolean;
  /** Whether this sequence is entirely dead air (no substance in any scene). */
  isDeadAir: boolean;
}

export interface ArcCompletionReport {
  totalScenes: number;
  openPromises: OpenPromise[];
  resolvedCount: number;
  overdueCount: number;
  /** Debt score: 0 = no debt, 100 = all promises overdue. */
  debtScore: number;
  /** Per-account decomposition of open promises. Accounts with no detectors
   *  yet (scene, audience) appear with empty promise lists. */
  accounts: Record<StressAccount, AccountBreakdown>;
  /** Temporal dynamics: fatigue, catharsis recency, hysteresis lock mode. */
  temporalDynamics: TemporalDynamics;
  /** Per-sequence structural summary (GODMODE L12). */
  sequences: SequenceGroup[];
}

// ── Promise accumulator ───────────────────────────────────────────────────────

interface SceneOps {
  sceneIdx: number;
  ops: StoryOp[];
}

export function analyzeArcCompletion(scenes: SceneOps[]): ArcCompletionReport {
  const totalScenes = scenes.length;

  // Accumulate open/closed promises pass-over
  const openClues        = new Map<string, number>();   // clueId → openedAtScene
  const openClocks       = new Map<string, { scene: number; totalAmount: number }>();
  const openRelNeg       = new Map<string, { scene: number; netAmount: number }>();
  const openThemes       = new Map<string, { scene: number; moves: string[] }>();
  const openObjects      = new Map<string, { scene: number; currentState: string }>();
  // EMOTIONAL_DEBT: character in peak distress/fear with no catharsis yet
  const openEmotionalDebts = new Map<string, { scene: number; dominant: string; intensity: number }>();
  // BELIEF_CONFLICT: character holds contradictory beliefs (witnessed + told at same proposition stem)
  const charBeliefs = new Map<string, Array<{ id: string; proposition: string; source: string }>>();
  const openBeliefConflicts = new Map<string, { scene: number; charId: string; stem: string }>();
  // AUDIENCE_QUESTION: suspense/curiosity raised without a resolving knownFact
  let audienceQuestionsRaised = 0;
  let audienceQuestionsAnswered = 0;
  let lastQuestionScene = -1;
  // SCENE_DEAD_AIR: consecutive scenes with no substantive state-changing ops.
  // Sensory-only ops (RECORD_VISUAL_FACT, RECORD_SONIC_FACT) don't count —
  // they add texture without changing canon, beliefs, relationships, etc.
  const SUBSTANTIVE_OPS = new Set<StoryOp['op']>([
    'ADD_FACT', 'EXPIRE_FACT', 'UPDATE_BELIEF', 'APPRAISE_EMOTION',
    'SHIFT_RELATIONSHIP', 'ADVANCE_OBJECT_ARC', 'TRIGGER_RULE',
    'SEED_CLUE', 'PAYOFF_SETUP', 'RAISE_CLOCK', 'ADVANCE_THEME_ARGUMENT',
    'UPDATE_READER_STATE',
  ]);
  let deadAirStreakStart = -1;
  const resolvedDeadAirStreaks: number[] = [];
  // Fatigue + hysteresis: temporal dynamics across scenes (spec §16–17)
  let fatigue = 0;
  let highStressBeatCount = 0;
  let recoveryBeatCount = 0;
  let lastCatharsisScene = -1;
  // Per-scene flags for sequence analysis (GODMODE L12)
  const sceneFlags = new Map<number, { distress?: boolean; catharsis?: boolean; reveal?: boolean; deadAir?: boolean }>();
  let resolvedCount      = 0;

  const HIGH_DISTRESS_EMOTIONS = new Set(['fear', 'distress', 'anger', 'shame']);
  const CATHARTIC_EMOTIONS     = new Set(['joy', 'pride', 'neutral']);

  const TERMINAL_OBJECT_STATES = new Set(['destroyed', 'resolved', 'returned', 'complete', 'found', 'lost_permanently']);

  for (const { sceneIdx, ops } of scenes) {
    // SCENE_DEAD_AIR: check substance before processing ops
    const hasSubstance = ops.some(o => SUBSTANTIVE_OPS.has(o.op));
    if (hasSubstance) {
      if (deadAirStreakStart >= 0) {
        resolvedDeadAirStreaks.push(deadAirStreakStart);
        deadAirStreakStart = -1;
      }
    } else if (deadAirStreakStart < 0) {
      deadAirStreakStart = sceneIdx;
    }
    if (!hasSubstance) {
      const f = sceneFlags.get(sceneIdx) ?? {};
      f.deadAir = true;
      sceneFlags.set(sceneIdx, f);
    }

    // Fatigue: per-scene flags for high-stress exposure and catharsis recovery
    let sceneHadHighStress = false;
    let sceneHadCatharsis = false;
    let sceneHadReveal = false;

    for (const op of ops) {
      switch (op.op) {
        case 'SEED_CLUE':
          openClues.set(op.clueId, sceneIdx);
          break;

        case 'PAYOFF_SETUP': {
          if (openClues.has(op.setupId)) { openClues.delete(op.setupId); resolvedCount++; }
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

        case 'APPRAISE_EMOTION': {
          const { dominant, intensity } = op.emotion;
          if (HIGH_DISTRESS_EMOTIONS.has(dominant) && intensity >= 75) {
            // Character enters peak distress — open an emotional debt
            openEmotionalDebts.set(op.charId, { scene: sceneIdx, dominant, intensity });
            sceneHadHighStress = true;
          } else if (openEmotionalDebts.has(op.charId)) {
            // Cathartic resolution: calming emotion or intensity drops below 40
            if (CATHARTIC_EMOTIONS.has(dominant) || intensity < 40) {
              openEmotionalDebts.delete(op.charId);
              resolvedCount++;
              sceneHadCatharsis = true;
            }
          }
          break;
        }

        case 'UPDATE_BELIEF': {
          const { belief, charId } = op;
          const existing = charBeliefs.get(charId) ?? [];
          // Upsert by id (same semantics as the dispatcher)
          const updated = existing.some(b => b.id === belief.id)
            ? existing.map(b => b.id === belief.id
                ? { id: belief.id, proposition: belief.proposition, source: belief.source }
                : b)
            : [...existing, { id: belief.id, proposition: belief.proposition, source: belief.source }];
          charBeliefs.set(charId, updated);

          // Recompute stem conflicts for this character (reuses the heuristic
          // from belief-revision.ts:reviseBelief — same 40-char proposition
          // stem with witnessed/told source asymmetry = contradiction).
          const stemSources = new Map<string, { witnessed: boolean; told: boolean }>();
          for (const b of updated) {
            const stem = b.proposition.slice(0, 40);
            const entry = stemSources.get(stem) ?? { witnessed: false, told: false };
            if (b.source === 'witnessed') entry.witnessed = true;
            if (b.source === 'told') entry.told = true;
            stemSources.set(stem, entry);
          }
          // Open new conflicts, close resolved ones for this character
          const currentConflictKeys = new Set<string>();
          for (const [stem, { witnessed, told }] of stemSources) {
            if (witnessed && told) {
              const key = `${charId}:${stem}`;
              currentConflictKeys.add(key);
              if (!openBeliefConflicts.has(key)) {
                openBeliefConflicts.set(key, { scene: sceneIdx, charId, stem });
              }
            }
          }
          for (const [key, conflict] of openBeliefConflicts) {
            if (conflict.charId === charId && !currentConflictKeys.has(key)) {
              openBeliefConflicts.delete(key);
              resolvedCount++;
            }
          }
          break;
        }

        case 'UPDATE_READER_STATE': {
          const d = op.delta;
          const fin = (n: number | undefined): number => (typeof n === 'number' && isFinite(n) ? n : 0);
          // A positive suspense or curiosity delta poses an audience question
          if (fin(d.suspense) > 0 || fin(d.curiosity) > 0) {
            audienceQuestionsRaised++;
            lastQuestionScene = sceneIdx;
          }
          // A knownFact answers the audience's most recent open question
          if (d.knownFact) {
            audienceQuestionsAnswered++;
            sceneHadReveal = true;
          }
          break;
        }
      }
    }

    // Fatigue: update after processing the scene (spec §17)
    if (sceneHadHighStress) {
      highStressBeatCount++;
      fatigue = Math.min(1, fatigue + 0.08);
    }
    if (sceneHadCatharsis) {
      recoveryBeatCount++;
      fatigue = Math.max(0, fatigue - 0.12);
      lastCatharsisScene = sceneIdx;
    }
    // Record per-scene flags for sequence analysis (GODMODE L12)
    const flags = sceneFlags.get(sceneIdx) ?? {};
    if (sceneHadHighStress) flags.distress = true;
    if (sceneHadCatharsis) flags.catharsis = true;
    if (sceneHadReveal) flags.reveal = true;
    sceneFlags.set(sceneIdx, flags);
  }

  // Close resolved dead-air streaks
  resolvedCount += resolvedDeadAirStreaks.length;

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

  // EMOTIONAL_DEBT promises — catharsis should follow within 2–5 scenes
  for (const [charId, { scene: openedAtScene, dominant, intensity }] of openEmotionalDebts) {
    const age = totalScenes - openedAtScene;
    const targetWindow: [number, number] = [openedAtScene + 2, openedAtScene + 5];
    const urgency = computeUrgency(totalScenes - 1, targetWindow);
    openPromises.push({
      promiseId: `debt:${charId}`,
      kind: 'EMOTIONAL_DEBT',
      description: `"${charId}" is stuck in ${dominant} (intensity ${intensity}) since scene ${openedAtScene} — owes a catharsis`,
      openedAtScene,
      targetWindow,
      urgency,
      suggestedOp: 'APPRAISE_EMOTION',
      pacingScore: computePacingScore(age, 2, 5),
    });
  }

  // BELIEF_CONFLICT promises — character holds contradictory beliefs; reconcile within 4–12 scenes
  for (const [key, { scene: openedAtScene, charId, stem }] of openBeliefConflicts) {
    const age = totalScenes - openedAtScene;
    const targetWindow: [number, number] = [openedAtScene + 4, openedAtScene + 12];
    const urgency = computeUrgency(totalScenes - 1, targetWindow);
    openPromises.push({
      promiseId: `belief:${key}`,
      kind: 'BELIEF_CONFLICT',
      description: `"${charId}" holds contradictory beliefs about "${stem}..." — needs reconciliation`,
      openedAtScene,
      targetWindow,
      urgency,
      suggestedOp: 'UPDATE_BELIEF',
      pacingScore: computePacingScore(age, 4, 12),
    });
  }

  // AUDIENCE_QUESTION — suspense/curiosity raised but not yet answered by a knownFact
  if (audienceQuestionsRaised > audienceQuestionsAnswered && lastQuestionScene >= 0) {
    const age = totalScenes - lastQuestionScene;
    const targetWindow: [number, number] = [lastQuestionScene + 2, lastQuestionScene + 8];
    openPromises.push({
      promiseId: 'audience:open_questions',
      kind: 'AUDIENCE_QUESTION',
      description: `${audienceQuestionsRaised - audienceQuestionsAnswered} audience question(s) unanswered — suspense/curiosity raised without a resolving knownFact`,
      openedAtScene: lastQuestionScene,
      targetWindow,
      urgency: computeUrgency(totalScenes - 1, targetWindow),
      suggestedOp: 'UPDATE_READER_STATE',
      pacingScore: computePacingScore(age, 2, 8),
    });
  }

  // SCENE_DEAD_AIR — consecutive scenes with no substantive state change
  if (deadAirStreakStart >= 0) {
    const age = totalScenes - deadAirStreakStart;
    const targetWindow: [number, number] = [deadAirStreakStart + 1, deadAirStreakStart + 3];
    openPromises.push({
      promiseId: `scene:dead_air:${deadAirStreakStart}`,
      kind: 'SCENE_DEAD_AIR',
      description: `Dead-air streak since scene ${deadAirStreakStart} (${age} scenes) — no canon/belief/relationship/object/theme/clue/clock change. The next scene must deliver substantive dramatic action.`,
      openedAtScene: deadAirStreakStart,
      targetWindow,
      urgency: computeUrgency(totalScenes - 1, targetWindow),
      suggestedOp: 'SHIFT_RELATIONSHIP',
      pacingScore: computePacingScore(age, 1, 3),
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

  // Per-account breakdown: regroup open promises into the 7 stress accounts.
  // Accounts without detectors yet (scene, audience) get empty promise lists.
  const ACCOUNTS: readonly StressAccount[] = ['systemic', 'relational', 'character', 'epistemic', 'thematic', 'scene', 'audience'];
  const accounts = Object.fromEntries(
    ACCOUNTS.map(account => {
      const promises = openPromises.filter(p => PROMISE_KIND_TO_ACCOUNT[p.kind] === account);
      const accountOverdue = promises.filter(p => p.urgency === 'overdue').length;
      const accountDueSoon = promises.filter(p => p.urgency === 'due_soon').length;
      const subtotal = promises.length === 0
        ? 0
        : Math.min(100, Math.round((accountOverdue / promises.length) * 80 + (accountDueSoon / promises.length) * 20));
      return [account, {
        account,
        subtotal,
        openCount: promises.length,
        overdueCount: accountOverdue,
        promises,
      }];
    }),
  ) as Record<StressAccount, AccountBreakdown>;

  // Temporal dynamics: fatigue, catharsis recency, hysteresis lock mode (spec §16–17)
  const sensitivityMultiplier = 1 - 0.6 * fatigue;
  const beatsSinceCatharsis = lastCatharsisScene >= 0 ? totalScenes - 1 - lastCatharsisScene : totalScenes;
  let lockMode: HysteresisLockMode = 'none';
  if (fatigue >= 0.7) {
    lockMode = 'burnout_lock';
  } else if (beatsSinceCatharsis <= 1 && lastCatharsisScene >= 0) {
    lockMode = 'aftermath_lock';
  }
  const temporalDynamics: TemporalDynamics = {
    fatigue: Math.round(fatigue * 100) / 100,
    highStressBeatCount,
    recoveryBeatCount,
    sensitivityMultiplier: Math.round(sensitivityMultiplier * 100) / 100,
    beatsSinceCatharsis,
    lockMode,
  };

  // Sequence architecture (GODMODE L12 — groups scenes into structural units)
  const seqSize = totalScenes > 0 ? Math.max(3, Math.ceil(totalScenes / 8)) : 1;
  const sequences: SequenceGroup[] = [];
  for (let s = 0; s * seqSize < totalScenes; s++) {
    const startScene = s * seqSize;
    const endScene = Math.min(startScene + seqSize - 1, Math.max(totalScenes - 1, 0));
    const seqPromises = openPromises.filter(p => p.openedAtScene >= startScene && p.openedAtScene <= endScene);
    const kindsOpened = [...new Set(seqPromises.map(p => p.kind))];
    let hasDistress = false, hasCatharsis = false, hasReveal = false, isDeadAir = true;
    for (let i = startScene; i <= endScene; i++) {
      const f = sceneFlags.get(i);
      if (f?.distress) hasDistress = true;
      if (f?.catharsis) hasCatharsis = true;
      if (f?.reveal) hasReveal = true;
      if (!f?.deadAir) isDeadAir = false;
    }
    sequences.push({
      index: s, startScene, endScene,
      kindsOpened, promisesOpened: seqPromises.length,
      hasCatharsis, hasDistress, hasReveal, isDeadAir,
    });
  }

  return { totalScenes, openPromises, resolvedCount, overdueCount, debtScore: Math.min(100, debtScore), accounts, temporalDynamics, sequences };
}

// ── Pacing helpers ────────────────────────────────────────────────────────────

function computeUrgency(currentScene: number, [earliest, latest]: [number, number]): PromiseUrgency {
  if (currentScene > latest)    return 'overdue';
  if (currentScene >= earliest) return 'due_soon';
  // Clamp earliest - 2 to 0 so negative scene indices don't produce spurious 'on_track'.
  if (currentScene >= Math.max(0, earliest - 2)) return 'on_track';
  return 'not_yet';
}

function computePacingScore(age: number, minAge: number, maxAge: number): number {
  if (age < minAge) return 1;
  if (age <= maxAge) return maxAge === minAge ? 1 : 1 - ((age - minAge) / (maxAge - minAge)) * 0.5;
  const overdue = age - maxAge;
  return Math.max(0, 0.5 - overdue * 0.08);
}
