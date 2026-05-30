// Narrative Regression Suite (Wave 29) — named structural invariants over the
// full StoryCommit ledger. Think of these as the story's CI test suite:
//   - 'pass'    = constraint satisfied
//   - 'fail'    = hard structural violation
//   - 'warning' = soft concern (story can succeed but risk is elevated)
//   - 'na'      = not applicable (not enough scenes / ops to test)
//
// All invariants are pure functions of StoryCommit[]. No LLM calls.

import type { StoryCommit } from '../state/StoryCommit.ts';
import type { StoryOp } from '../ops/StoryOp.ts';

// ── Result types ──────────────────────────────────────────────────────────────

export type InvariantStatus = 'pass' | 'fail' | 'warning' | 'na';
export type InvariantCategory = 'structure' | 'character' | 'clues' | 'tension' | 'theme';

export interface InvariantResult {
  id: string;
  name: string;
  category: InvariantCategory;
  status: InvariantStatus;
  message: string;
  sceneRef?: number;
}

export interface NarrativeInvariant {
  id: string;
  name: string;
  category: InvariantCategory;
  description: string;
  check(commits: StoryCommit[]): InvariantResult;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function allOps(commits: StoryCommit[]): Array<{ sceneIdx: number; op: StoryOp }> {
  return commits.flatMap(c => c.ops.map(op => ({ sceneIdx: c.sceneIdx, op })));
}

function opsOfKind<K extends StoryOp['op']>(
  commits: StoryCommit[],
  kind: K,
): Array<{ sceneIdx: number; op: Extract<StoryOp, { op: K }> }> {
  return allOps(commits)
    .filter(({ op }) => op.op === kind)
    .map(({ sceneIdx, op }) => ({ sceneIdx, op: op as Extract<StoryOp, { op: K }> }));
}

function maxScene(commits: StoryCommit[]): number {
  return commits.reduce((m, c) => Math.max(m, c.sceneIdx), 0);
}

function result(
  inv: Pick<NarrativeInvariant, 'id' | 'name' | 'category'>,
  status: InvariantStatus,
  message: string,
  sceneRef?: number,
): InvariantResult {
  return { id: inv.id, name: inv.name, category: inv.category, status, message, sceneRef };
}

// ── Invariant definitions ─────────────────────────────────────────────────────

const WORLD_ESTABLISHED_EARLY: NarrativeInvariant = {
  id: 'WORLD_ESTABLISHED_EARLY',
  name: 'World Established Early',
  category: 'structure',
  description: 'The story world must be grounded in scene 0 or 1 via ADD_FACT or visual/sonic facts.',
  check(commits) {
    if (commits.length === 0) return result(this, 'na', 'No scenes committed yet.');
    const early = commits.filter(c => c.sceneIdx <= 1);
    const found = early.some(c => c.ops.some(op =>
      op.op === 'ADD_FACT' || op.op === 'RECORD_VISUAL_FACT' || op.op === 'RECORD_SONIC_FACT',
    ));
    if (found) return result(this, 'pass', 'World grounded in the opening scenes.');
    return result(this, commits.length >= 3 ? 'fail' : 'warning',
      'No ADD_FACT or RECORD_VISUAL/SONIC_FACT in scenes 0–1. Establish the world immediately.');
  },
};

const COMPLICATION_BY_SCENE_3: NarrativeInvariant = {
  id: 'COMPLICATION_BY_SCENE_3',
  name: 'Complication by Scene 3',
  category: 'structure',
  description: 'A RAISE_CLOCK or fear/distress APPRAISE_EMOTION must appear by scene 3.',
  check(commits) {
    if (commits.length < 3) return result(this, 'na', 'Fewer than 3 scenes — checking later.');
    const early = commits.filter(c => c.sceneIdx <= 3);
    const hasClock = early.some(c => c.ops.some(op => op.op === 'RAISE_CLOCK'));
    const hasDistress = early.some(c => c.ops.some(op =>
      op.op === 'APPRAISE_EMOTION' &&
      (op.emotion.dominant === 'fear' || op.emotion.dominant === 'distress'),
    ));
    if (hasClock || hasDistress) return result(this, 'pass', 'Complication established by scene 3.');
    return result(this, 'fail',
      'No complication (RAISE_CLOCK or fear/distress) by scene 3. Story lacks urgency.');
  },
};

const THEME_SUPPORTED_BEFORE_RESOLVED: NarrativeInvariant = {
  id: 'THEME_SUPPORTED_BEFORE_RESOLVED',
  name: 'Theme Supported Before Resolved',
  category: 'theme',
  description: 'A theme argument must be supported or complicated before it can be resolved.',
  check(commits) {
    const themeOps = opsOfKind(commits, 'ADVANCE_THEME_ARGUMENT');
    if (themeOps.length === 0) return result(this, 'na', 'No theme arguments in story.');
    const resolves = themeOps.filter(({ op }) => op.move === 'resolve');
    if (resolves.length === 0) return result(this, 'pass', 'No premature resolution found.');
    // For each resolve, check that a support/complicate appeared before it (by sceneIdx)
    for (const { sceneIdx: rScene, op: rOp } of resolves) {
      const priorGrounding = themeOps.some(({ sceneIdx: sScene, op: sOp }) =>
        sOp.claimId === rOp.claimId &&
        (sOp.move === 'support' || sOp.move === 'complicate') &&
        sScene < rScene,
      );
      if (!priorGrounding) {
        return result(this, 'fail',
          `Theme "${rOp.claimId}" resolved without prior support or complication.`, rScene);
      }
    }
    return result(this, 'pass', 'All theme resolutions are earned by prior support or complication.');
  },
};

const SCENE_OP_VARIETY: NarrativeInvariant = {
  id: 'SCENE_OP_VARIETY',
  name: 'Scene Op Variety',
  category: 'structure',
  description: 'The full story must use at least 5 distinct op kinds to have structural range.',
  check(commits) {
    if (commits.length === 0) return result(this, 'na', 'No scenes committed yet.');
    const kinds = new Set(commits.flatMap(c => c.ops.map(op => op.op)));
    if (kinds.size >= 5) return result(this, 'pass', `${kinds.size} distinct op kinds used — good structural variety.`);
    if (kinds.size >= 3) return result(this, 'warning', `Only ${kinds.size} op kinds used. Add more: emotion, relationship, theme, clues.`);
    return result(this, 'fail', `Only ${kinds.size} op kind(s). Story is structurally flat.`);
  },
};

const CHARACTERS_HAVE_BELIEFS: NarrativeInvariant = {
  id: 'CHARACTERS_HAVE_BELIEFS',
  name: 'Characters Have Beliefs',
  category: 'character',
  description: 'At least one UPDATE_BELIEF must exist — characters must have inner lives.',
  check(commits) {
    const beliefs = opsOfKind(commits, 'UPDATE_BELIEF');
    if (beliefs.length === 0 && commits.length === 0) return result(this, 'na', 'No scenes yet.');
    if (beliefs.length === 0) return result(this, 'fail', 'No UPDATE_BELIEF ops. Characters are empty vessels with no inner life.');
    const chars = new Set(beliefs.map(({ op }) => op.charId));
    return result(this, 'pass', `${chars.size} character(s) have beliefs (${beliefs.length} total updates).`);
  },
};

const EMOTIONAL_JOURNEY: NarrativeInvariant = {
  id: 'EMOTIONAL_JOURNEY',
  name: 'Emotional Journey',
  category: 'character',
  description: 'Characters must experience emotion — APPRAISE_EMOTION must appear.',
  check(commits) {
    const emos = opsOfKind(commits, 'APPRAISE_EMOTION');
    if (commits.length === 0) return result(this, 'na', 'No scenes yet.');
    if (emos.length === 0) return result(this, 'fail', 'No APPRAISE_EMOTION ops. Story has no emotional texture.');
    const intensities = emos.map(({ op }) => op.emotion.intensity ?? 0);
    const hasVariation = new Set(intensities).size > 1;
    if (!hasVariation) {
      return result(this, 'warning', `${emos.length} emotion op(s) but all same intensity. Vary emotional peaks.`);
    }
    return result(this, 'pass', `${emos.length} emotional beat(s) across story with varying intensity.`);
  },
};

const RELATIONSHIP_ARC_EXISTS: NarrativeInvariant = {
  id: 'RELATIONSHIP_ARC_EXISTS',
  name: 'Relationship Arc Exists',
  category: 'character',
  description: 'At least one relationship must shift (SHIFT_RELATIONSHIP) across the story.',
  check(commits) {
    const shifts = opsOfKind(commits, 'SHIFT_RELATIONSHIP');
    if (commits.length < 2) return result(this, 'na', 'Fewer than 2 scenes — checking later.');
    if (shifts.length === 0) return result(this, 'fail', 'No SHIFT_RELATIONSHIP ops. Story has no relational stakes.');
    // Check for sign reversal — a sign change indicates a real arc
    const pairAmounts: Record<string, number[]> = {};
    for (const { op } of shifts) {
      const key = [...op.pair].sort().join('|');
      (pairAmounts[key] ??= []).push(op.delta.amount);
    }
    const hasArc = Object.values(pairAmounts).some(amounts =>
      amounts.some(a => a > 0) && amounts.some(a => a < 0),
    );
    if (hasArc) return result(this, 'pass', 'Relationship arc with sign reversal detected — genuine relational change.');
    return result(this, 'warning', `${shifts.length} shift(s) but no sign reversal. Relationships trend one-way — consider reversal.`);
  },
};

const CHARACTER_AGENCY_SPREAD: NarrativeInvariant = {
  id: 'CHARACTER_AGENCY_SPREAD',
  name: 'Character Agency Spread',
  category: 'character',
  description: 'At least 2 distinct characters must act (have beliefs or emotions) — no solo protagonist.',
  check(commits) {
    const actors = new Set<string>();
    for (const { op } of opsOfKind(commits, 'UPDATE_BELIEF')) actors.add(op.charId);
    for (const { op } of opsOfKind(commits, 'APPRAISE_EMOTION')) actors.add(op.charId);
    if (commits.length === 0) return result(this, 'na', 'No scenes yet.');
    if (actors.size >= 2) return result(this, 'pass', `${actors.size} distinct characters have agency.`);
    if (actors.size === 1) return result(this, 'warning', 'Only 1 character has beliefs or emotions. Add agency for other characters.');
    return result(this, 'fail', 'No characters have beliefs or emotions — story has no inner life.');
  },
};

const CLUE_BEFORE_PAYOFF: NarrativeInvariant = {
  id: 'CLUE_BEFORE_PAYOFF',
  name: 'Clue Before Payoff',
  category: 'clues',
  description: 'Every PAYOFF_SETUP must be preceded by a SEED_CLUE with the same clueId.',
  check(commits) {
    const seeds = opsOfKind(commits, 'SEED_CLUE');
    const payoffs = opsOfKind(commits, 'PAYOFF_SETUP');
    if (payoffs.length === 0) return result(this, 'na', 'No payoffs in story yet.');
    const seededIds = new Set(seeds.map(({ op }) => op.clueId));
    const orphan = payoffs.find(({ op }) => !seededIds.has(op.setupId));
    if (orphan) {
      return result(this, 'fail',
        `PAYOFF_SETUP "${orphan.op.setupId}" has no preceding SEED_CLUE. Unearned reveal.`, orphan.sceneIdx);
    }
    // Also check ordering — seed must come before payoff
    for (const { sceneIdx: pScene, op: pOp } of payoffs) {
      const seed = seeds.find(({ op }) => op.clueId === pOp.setupId);
      if (seed && seed.sceneIdx >= pScene) {
        return result(this, 'fail',
          `SEED_CLUE "${pOp.setupId}" planted in scene ${seed.sceneIdx} but paid off in scene ${pScene} — too early.`, pScene);
      }
    }
    return result(this, 'pass', `All ${payoffs.length} payoff(s) are properly seeded.`);
  },
};

const CLUE_PLANTED_BY_MIDPOINT: NarrativeInvariant = {
  id: 'CLUE_PLANTED_BY_MIDPOINT',
  name: 'Clue Planted by Midpoint',
  category: 'clues',
  description: 'If clues exist, at least one must be planted in the first half of the story.',
  check(commits) {
    const seeds = opsOfKind(commits, 'SEED_CLUE');
    if (seeds.length === 0) return result(this, 'na', 'No clues planted yet.');
    if (commits.length < 2) return result(this, 'na', 'Not enough scenes to evaluate midpoint.');
    const midpoint = Math.ceil(maxScene(commits) / 2);
    const earlyClue = seeds.find(({ sceneIdx }) => sceneIdx <= midpoint);
    if (earlyClue) return result(this, 'pass', `First clue planted in scene ${earlyClue.sceneIdx} (midpoint: ${midpoint}).`);
    return result(this, 'warning',
      `All ${seeds.length} clue(s) planted after midpoint (scene ${midpoint}). Audience has no mystery to chew on.`);
  },
};

const NO_EXCESSIVE_OPEN_CLUES: NarrativeInvariant = {
  id: 'NO_EXCESSIVE_OPEN_CLUES',
  name: 'No Excessive Open Clues',
  category: 'clues',
  description: 'At most 5 unresolved clues at story end — too many open threads lose the audience.',
  check(commits) {
    const seeds = opsOfKind(commits, 'SEED_CLUE');
    if (seeds.length === 0) return result(this, 'na', 'No clues in story.');
    const resolvedIds = new Set(opsOfKind(commits, 'PAYOFF_SETUP').map(({ op }) => op.setupId));
    const open = seeds.filter(({ op }) => !resolvedIds.has(op.clueId));
    if (open.length <= 5) return result(this, 'pass', `${open.length} open clue(s) — within acceptable range.`);
    return result(this, 'warning',
      `${open.length} unresolved clues — aim to resolve or cut down to ≤5 before ending.`);
  },
};

const CLOCK_RESOLVED: NarrativeInvariant = {
  id: 'CLOCK_RESOLVED',
  name: 'Active Clocks Tracked',
  category: 'tension',
  description: 'Every RAISE_CLOCK with a positive amount should be met with a corresponding countdown.',
  check(commits) {
    const clockOps = opsOfKind(commits, 'RAISE_CLOCK');
    if (clockOps.length === 0) return result(this, 'na', 'No clocks in story.');
    const clockTotals: Record<string, number> = {};
    for (const { op } of clockOps) {
      clockTotals[op.clockId] = (clockTotals[op.clockId] ?? 0) + (isFinite(op.amount) ? op.amount : 0);
    }
    const runaway = Object.entries(clockTotals).filter(([, total]) => total > 3);
    if (runaway.length === 0) return result(this, 'pass', 'All clocks are being counted down.');
    return result(this, 'warning',
      `Clock(s) with net positive pressure: ${runaway.map(([id]) => id).join(', ')}. Start counting them down.`);
  },
};

const TENSION_ARC_EXISTS: NarrativeInvariant = {
  id: 'TENSION_ARC_EXISTS',
  name: 'Tension Arc Exists',
  category: 'tension',
  description: 'Emotional intensity must vary across scenes — no flat affect.',
  check(commits) {
    if (commits.length < 3) return result(this, 'na', 'Need at least 3 scenes to measure tension arc.');
    const emos = opsOfKind(commits, 'APPRAISE_EMOTION');
    if (emos.length === 0) return result(this, 'warning', 'No APPRAISE_EMOTION ops — cannot measure tension arc.');
    // Group by scene, take max intensity per scene
    const sceneIntensity: Record<number, number> = {};
    for (const { sceneIdx, op } of emos) {
      sceneIntensity[sceneIdx] = Math.max(sceneIntensity[sceneIdx] ?? 0, op.emotion.intensity ?? 0);
    }
    const values = Object.values(sceneIntensity).filter(v => isFinite(v));
    if (values.length === 0) return result(this, 'warning', 'No finite intensity values in APPRAISE_EMOTION ops.');
    const range = Math.max(...values) - Math.min(...values);
    if (range >= 3) return result(this, 'pass', `Emotional intensity ranges ${Math.min(...values)}–${Math.max(...values)} — strong tension arc.`);
    if (range >= 1) return result(this, 'warning', `Emotional intensity range is ${range}. Expand peaks and valleys for a more dynamic arc.`);
    return result(this, 'fail', 'Emotional intensity is flat across all scenes. Story has no tension arc.');
  },
};

const PROPP_COMPLICATION_EXISTS: NarrativeInvariant = {
  id: 'PROPP_COMPLICATION_EXISTS',
  name: 'Propp: Complication Exists',
  category: 'structure',
  description: 'Proppian "complication" (lack/villainy) must exist — a RAISE_CLOCK or fear/distress emotion.',
  check(commits) {
    if (commits.length < 2) return result(this, 'na', 'Not enough scenes to assess Proppian stages.');
    const hasClock = opsOfKind(commits, 'RAISE_CLOCK').length > 0;
    const hasDistress = opsOfKind(commits, 'APPRAISE_EMOTION').some(({ op }) =>
      op.emotion.dominant === 'fear' || op.emotion.dominant === 'distress',
    );
    if (hasClock || hasDistress) return result(this, 'pass', 'Complication (lack/villainy) established.');
    return result(this, 'fail', 'No complication detected. Story needs a driving problem: a clock, fear, or distress.');
  },
};

// ── Registry ──────────────────────────────────────────────────────────────────

export const ALL_INVARIANTS: NarrativeInvariant[] = [
  // Structure
  WORLD_ESTABLISHED_EARLY,
  COMPLICATION_BY_SCENE_3,
  SCENE_OP_VARIETY,
  PROPP_COMPLICATION_EXISTS,
  // Character
  CHARACTERS_HAVE_BELIEFS,
  EMOTIONAL_JOURNEY,
  RELATIONSHIP_ARC_EXISTS,
  CHARACTER_AGENCY_SPREAD,
  // Clues
  CLUE_BEFORE_PAYOFF,
  CLUE_PLANTED_BY_MIDPOINT,
  NO_EXCESSIVE_OPEN_CLUES,
  // Tension
  CLOCK_RESOLVED,
  TENSION_ARC_EXISTS,
  // Theme
  THEME_SUPPORTED_BEFORE_RESOLVED,
];
