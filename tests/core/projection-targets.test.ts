// Projection targets — Output Syntax expansion (B1-d). Six new professional
// document formats layered onto the holographic projection (project/index.ts):
// treatment, outline, dialogue_only, epistolary, simulation_log,
// director_commentary. Each reuses the per-op craft vocabulary already
// established by renderFountainOp/emotionBeat/carrierPhrase/cleanId/
// themeArgumentLines/readerStateBeat rather than duplicating it — this file
// only exercises the NEW target-level composition, not the shared primitives
// (those are covered by tests/core/projection-richness.test.ts).
//
// Per target: one FIRE test (a multi-op canon renders the target's
// distinctive structural element) and at least one NO-FIRE/edge test (empty
// canon → valid minimal doc, reverted commits excluded, no NaN/undefined text
// for ops carrying optional fields). Plus one integration test: every target
// in the ProjectionTarget union returns non-empty content for a canon
// carrying all 14 StoryOp kinds in one commit.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { project, type Canon, type ProjectionTarget } from '../../server/nvm/project/index.ts';
import { emptyState, type NarrativeState } from '../../server/nvm/state/NarrativeState.ts';
import { summarizeOps } from '../../server/nvm/state/StoryCommit.ts';
import type { StoryOp } from '../../server/nvm/ops/StoryOp.ts';
import type { StoryCommit } from '../../server/nvm/state/StoryCommit.ts';
import type { Belief, EmotionState } from '../../server/engine/types.ts';

// ── Fixture builders ─────────────────────────────────────────────────────────

function belief(proposition: string, source: Belief['source'] = 'inferred'): Belief {
  return { id: 'b1', proposition, confidence: 0.8, source, acquired_at: 0, contradicts: [] };
}

function emotion(overrides: Partial<EmotionState>): EmotionState {
  return {
    joy: 0, distress: 0, anger: 0, fear: 0, pride: 0, shame: 0,
    dominant: 'neutral', intensity: 0, last_updated_at: 0,
    ...overrides,
  };
}

function commit(sceneIdx: number, ops: StoryOp[], reverted = false): StoryCommit {
  return {
    commitId: `c${sceneIdx}`, parentId: null, sceneIdx, ops,
    deltaSummary: summarizeOps(ops), reverted, createdAt: 0,
  };
}

function makeCanon(
  commits: StoryCommit[],
  opts: { title?: string; state?: Partial<NarrativeState> } = {},
): Canon {
  return {
    commits,
    state: { ...emptyState(), ...opts.state },
    title: opts.title ?? 'TARGETS TEST',
  };
}

/** All 14 StoryOp kinds — borrowed fixture idea from projection-richness.test.ts. */
const ALL_14_OPS: StoryOp[] = [
  { op: 'ADD_FACT', fact: { factId: 'f1', subject: 'the vault', predicate: 'contains', object: 'a fortune', addedAtTurn: 0, validFrom: 0, validTo: null } },
  { op: 'EXPIRE_FACT', factId: 'fact-old-treaty', atTurn: 5 },
  { op: 'UPDATE_BELIEF', charId: 'nora', belief: belief('The lantern flickered once and went dark.') },
  { op: 'APPRAISE_EMOTION', charId: 'mara', emotion: emotion({ dominant: 'anger', anger: 70, intensity: 70 }) },
  { op: 'SHIFT_RELATIONSHIP', pair: ['nora', 'helmer'], delta: { dimension: 'trust', amount: 0.2, reason: 'a quiet truce' } },
  { op: 'ADVANCE_OBJECT_ARC', objectId: 'object-locket', toState: 'shattered' },
  { op: 'TRIGGER_RULE', mechanismId: 'mechanism-trapdoor', ruleId: 'rule-release' },
  { op: 'SEED_CLUE', clueId: 'clue-locket', carrier: 'object' },
  { op: 'PAYOFF_SETUP', setupId: 'clue-locket', payoffEventId: 'evt-1' },
  { op: 'RAISE_CLOCK', clockId: 'clock-fuse', amount: 1 },
  { op: 'ADVANCE_THEME_ARGUMENT', claimId: 'claim-loyalty', move: 'attack' },
  { op: 'UPDATE_READER_STATE', delta: { suspense: 2, curiosity: 0 } },
  { op: 'RECORD_VISUAL_FACT', sceneId: 's1', fact: 'a torn photograph on the floor' },
  { op: 'RECORD_SONIC_FACT', sceneId: 's1', fact: 'a floorboard creaks upstairs' },
];

// ── 1. treatment ───────────────────────────────────────────────────────────

describe('projection targets — treatment', () => {
  it('fire: has a logline naming the protagonist and their opposition, plus a closing status paragraph', () => {
    const canon = makeCanon([
      commit(0, [
        { op: 'UPDATE_BELIEF', charId: 'nora', belief: belief('she can trust no one now') },
        { op: 'SHIFT_RELATIONSHIP', pair: ['nora', 'helmer'], delta: { dimension: 'resentment', amount: -0.3, reason: 'a betrayal' } },
      ]),
      commit(1, [{ op: 'SEED_CLUE', clueId: 'clue-locket', carrier: 'object' }]),
    ], { state: { authorIntent: { theme: 'trust is earned, not given' } } });

    const artifact = project(canon, 'treatment');
    assert.equal(artifact.target, 'treatment');
    assert.ok(artifact.content.includes('LOGLINE'), 'no LOGLINE section');
    assert.ok(artifact.content.includes('Nora'), 'protagonist not named in logline/body');
    assert.ok(artifact.content.includes('Helmer'), 'opposition not named in logline');
    assert.ok(artifact.content.includes('WHERE THE STORY STANDS'), 'no closing status section');
    assert.ok(artifact.content.includes('trust is earned, not given'), 'theme not carried into closing paragraph');
  });

  it('no-fire/edge: empty canon still produces a valid minimal document; reverted commits excluded', () => {
    const empty = project(makeCanon([]), 'treatment');
    assert.ok(empty.content.includes('LOGLINE'));
    assert.ok(empty.content.includes('WHERE THE STORY STANDS'));
    assert.ok(!empty.content.includes('undefined'));
    assert.ok(!empty.content.includes('NaN'));

    const canon = makeCanon([
      commit(0, [{ op: 'SEED_CLUE', clueId: 'clue-hidden', carrier: 'object' }], true),
    ]);
    const artifact = project(canon, 'treatment');
    assert.ok(!artifact.content.includes('hidden'), 'reverted commit leaked into treatment');
  });
});

// ── 2. outline ─────────────────────────────────────────────────────────────

describe('projection targets — outline', () => {
  it('fire: has a [PAYOFF] tag when PAYOFF_SETUP is present, and [SETUP]/[CLOCK] for their ops', () => {
    const canon = makeCanon([
      commit(0, [{ op: 'SEED_CLUE', clueId: 'clue-key', carrier: 'object' }]),
      commit(1, [{ op: 'RAISE_CLOCK', clockId: 'clock-bomb', amount: 1 }]),
      commit(2, [{ op: 'PAYOFF_SETUP', setupId: 'clue-key', payoffEventId: 'evt-1' }]),
    ]);
    const content = project(canon, 'outline').content;
    assert.ok(content.includes('[SETUP]'), 'no [SETUP] tag for SEED_CLUE');
    assert.ok(content.includes('[CLOCK]'), 'no [CLOCK] tag for RAISE_CLOCK');
    assert.ok(content.includes('[PAYOFF]'), 'no [PAYOFF] tag for PAYOFF_SETUP');
    assert.ok(/^1\. /m.test(content), 'no numbered beat entry for scene 1');
  });

  it('act markers appear at 25/50/75% for a long enough outline', () => {
    const commits = Array.from({ length: 8 }, (_, i) => commit(i, [{ op: 'RAISE_CLOCK', clockId: 'clock-x', amount: 1 }]));
    const content = project(makeCanon(commits), 'outline').content;
    assert.ok(content.includes('END OF ACT ONE'));
    assert.ok(content.includes('MIDPOINT'));
    assert.ok(content.includes('END OF ACT TWO'));
  });

  it('no-fire/edge: empty canon yields a valid minimal doc; reverted commits excluded from beats and tags', () => {
    const empty = project(makeCanon([]), 'outline');
    assert.ok(empty.content.includes('OUTLINE'));
    assert.ok(!empty.content.includes('undefined'));

    const canon = makeCanon([
      commit(0, [{ op: 'RAISE_CLOCK', clockId: 'clock-hidden', amount: 1 }], true),
    ]);
    const content = project(canon, 'outline').content;
    assert.ok(!content.includes('[CLOCK]'), 'reverted commit still produced a [CLOCK] tag');
    assert.ok(!content.includes('hidden'));
  });
});

// ── 3. dialogue_only ─────────────────────────────────────────────────────────

describe('projection targets — dialogue_only', () => {
  it('fire: renders UPDATE_BELIEF and ADVANCE_THEME_ARGUMENT as dialogue, drops action/visual/sonic ops', () => {
    const canon = makeCanon([
      commit(0, [
        { op: 'UPDATE_BELIEF', charId: 'mara', belief: belief('the plan will work') },
        { op: 'RECORD_VISUAL_FACT', sceneId: 's1', fact: 'a torn photograph on the floor' },
        { op: 'RECORD_SONIC_FACT', sceneId: 's1', fact: 'a floorboard creaks' },
        { op: 'ADVANCE_THEME_ARGUMENT', claimId: 'claim-loyalty', move: 'attack' },
        { op: 'SEED_CLUE', clueId: 'clue-x', carrier: 'object' },
      ]),
    ]);
    const content = project(canon, 'dialogue_only').content;
    assert.ok(content.includes('MARA'), 'no character cue for UPDATE_BELIEF');
    assert.ok(content.includes('the plan will work'), 'no dialogue line for the belief');
    assert.ok(content.includes('VOICE A') && content.includes('VOICE B'), 'no theme-argument dialogue exchange');
    assert.ok(!content.includes('torn photograph'), 'visual fact leaked into dialogue-only draft');
    assert.ok(!content.includes('floorboard creaks'), 'sonic fact leaked into dialogue-only draft');
    assert.ok(!content.includes('catches the eye'), 'clue-seed action prose leaked into dialogue-only draft');
  });

  it('no-fire/edge: a scene with no dialogue-bearing ops still renders a valid (non-empty) entry; empty canon valid; reverted excluded', () => {
    const noDialogue = project(makeCanon([commit(0, [{ op: 'RAISE_CLOCK', clockId: 'clock-x', amount: 1 }])]), 'dialogue_only');
    assert.ok(noDialogue.content.includes('SCENE 1'));
    assert.ok(noDialogue.content.length > 0);

    const empty = project(makeCanon([]), 'dialogue_only');
    assert.ok(!empty.content.includes('undefined'));

    const canon = makeCanon([
      commit(0, [{ op: 'UPDATE_BELIEF', charId: 'ghost', belief: belief('a hidden thought') }], true),
    ]);
    const content = project(canon, 'dialogue_only').content;
    assert.ok(!content.includes('GHOST'), 'reverted commit leaked a character cue');
    assert.ok(!content.includes('hidden thought'));
  });
});

// ── 4. epistolary ────────────────────────────────────────────────────────────

describe('projection targets — epistolary', () => {
  it('fire: the dominant character addresses their relationship partner in first person, date-stamped by sceneIdx', () => {
    const canon = makeCanon([
      commit(2, [
        { op: 'UPDATE_BELIEF', charId: 'nora', belief: belief('something is wrong here') },
        { op: 'SHIFT_RELATIONSHIP', pair: ['nora', 'helmer'], delta: { dimension: 'trust', amount: -0.2, reason: 'a broken promise' } },
      ]),
    ]);
    const content = project(canon, 'epistolary').content;
    assert.ok(content.includes('ENTRY — DAY 3'), 'entry not date-stamped by sceneIdx');
    assert.ok(content.includes('To you, Helmer:'), 'relationship partner not addressed in first person');
    assert.ok(content.includes('— Nora'), 'entry not signed by the dominant (POV) character');
  });

  it('no-fire/edge: a relationship shift NOT touching the scene\'s dominant character is not addressed; empty ops entry still valid; reverted excluded', () => {
    const canon = makeCanon([
      commit(0, [
        { op: 'UPDATE_BELIEF', charId: 'charlie', belief: belief('one thought') },
        { op: 'UPDATE_BELIEF', charId: 'charlie', belief: belief('another thought') },
        { op: 'SHIFT_RELATIONSHIP', pair: ['nora', 'helmer'], delta: { dimension: 'trust', amount: -0.2, reason: 'unrelated to charlie' } },
      ]),
    ]);
    const content = project(canon, 'epistolary').content;
    assert.ok(!content.includes('To you, Helmer'), 'shift addressed even though dominant char (charlie) is not party to it');
    assert.ok(!content.includes('To you, Nora'));

    const noOps = project(makeCanon([commit(0, [])]), 'epistolary');
    assert.ok(noOps.content.includes('Nothing worth recording happened today.'));
    assert.ok(!noOps.content.includes('undefined'));

    const reverted = project(makeCanon([commit(0, [
      { op: 'UPDATE_BELIEF', charId: 'ghost', belief: belief('a secret') },
    ], true)]), 'epistolary');
    assert.ok(!reverted.content.includes('a secret'));
  });
});

// ── 5. simulation_log ────────────────────────────────────────────────────────

describe('projection targets — simulation_log', () => {
  it('fire: exactly one neutral TURN-indexed line per op, with zero presentation spin', () => {
    const ops: StoryOp[] = [
      { op: 'ADD_FACT', fact: { factId: 'f1', subject: 'marla', predicate: 'moves_to', object: 'the docks', addedAtTurn: 0, validFrom: 0, validTo: null } },
      { op: 'SEED_CLUE', clueId: 'brass-key', carrier: 'object' },
      { op: 'RAISE_CLOCK', clockId: 'clock-fuse', amount: 1 },
    ];
    const canon = makeCanon([commit(3, ops)]);
    const content = project(canon, 'simulation_log').content;
    const turnLines = content.split('\n').filter(l => l.startsWith('TURN'));
    assert.equal(turnLines.length, ops.length, 'expected exactly one TURN line per op');
    assert.ok(content.includes('TURN 3 · FACT: marla moves_to the docks'));
    assert.ok(content.includes('TURN 3 · CLUE SEEDED: brass-key (object)'));
    assert.ok(content.includes('TURN 3 · CLOCK: clock-fuse +1'));
  });

  it('no-fire/edge: empty canon logs no TURN lines; reverted commits excluded; a no-signal reader-state delta produces no NaN/undefined', () => {
    const empty = project(makeCanon([]), 'simulation_log');
    assert.ok(!empty.content.includes('TURN'));
    assert.ok(empty.content.includes('No ops recorded'));

    const reverted = project(makeCanon([commit(0, [{ op: 'RAISE_CLOCK', clockId: 'clock-hidden', amount: 1 }], true)]), 'simulation_log');
    assert.ok(!reverted.content.includes('TURN'));

    const noSignal = project(makeCanon([commit(0, [{ op: 'UPDATE_READER_STATE', delta: {} }])]), 'simulation_log');
    assert.ok(!noSignal.content.includes('NaN'));
    assert.ok(!noSignal.content.includes('undefined'));
    assert.ok(noSignal.content.includes('no change'));
  });
});

// ── 6. director_commentary ───────────────────────────────────────────────────

describe('projection targets — director_commentary', () => {
  it('fire: mentions the planted clue, a payoff, tension movement, theme work, and dramatic irony', () => {
    const canon = makeCanon([
      commit(0, [{ op: 'SEED_CLUE', clueId: 'clue-brass-key', carrier: 'object' }]),
      commit(1, [
        { op: 'PAYOFF_SETUP', setupId: 'clue-brass-key', payoffEventId: 'evt-1' },
        { op: 'UPDATE_READER_STATE', delta: { suspense: 2, curiosity: 0 } },
        { op: 'ADVANCE_THEME_ARGUMENT', claimId: 'claim-loyalty', move: 'attack' },
        { op: 'UPDATE_BELIEF', charId: 'nora', belief: belief('everyone is on her side', 'told') },
      ]),
    ]);
    const content = project(canon, 'director_commentary').content;
    assert.ok(content.includes('brass key'), 'planted clue not mentioned in commentary');
    assert.ok(content.includes("We're planting"));
    assert.ok(content.includes('pays off'));
    assert.ok(content.includes('dramatic irony'), 'no dramatic-irony note for a told belief');
    assert.ok(content.includes('audience already knows better'));
  });

  it('no-fire/edge: a scene with no notable machinery gets a quiet-beat fallback; empty canon valid; reverted excluded', () => {
    const quiet = project(makeCanon([commit(0, [{ op: 'ADVANCE_OBJECT_ARC', objectId: 'object-locket', toState: 'shattered' }])]), 'director_commentary');
    assert.ok(quiet.content.includes('A quieter beat'));

    const empty = project(makeCanon([]), 'director_commentary');
    assert.ok(!empty.content.includes('undefined'));

    const reverted = project(makeCanon([commit(0, [{ op: 'SEED_CLUE', clueId: 'clue-hidden', carrier: 'object' }], true)]), 'director_commentary');
    assert.ok(!reverted.content.includes('hidden'));
  });
});

// ── Integration: every target renders non-empty content for all 14 op kinds ──

describe('projection targets — every ProjectionTarget renders non-empty content', () => {
  const ALL_TARGETS: ProjectionTarget[] = [
    'fountain', 'novel', 'stage', 'comic', 'interactive', 'pitch', 'bible',
    'rewatch', 'cutting_room', 'sidecar',
    'treatment', 'outline', 'dialogue_only', 'epistolary', 'simulation_log', 'director_commentary',
  ];

  it('all 14 op kinds are exercised by this fixture (guards the fixture from silently losing a kind)', () => {
    const kinds = new Set(ALL_14_OPS.map(o => o.op));
    assert.equal(kinds.size, 14, `expected 14 distinct op kinds, got ${kinds.size}`);
  });

  it('every projection target produces non-empty content for a commit carrying all 14 op kinds', () => {
    const canon = makeCanon([commit(0, ALL_14_OPS)], {
      state: { authorIntent: { theme: 'trust is earned' } },
    });
    for (const target of ALL_TARGETS) {
      const artifact = project(canon, target);
      assert.equal(artifact.target, target);
      assert.ok(artifact.content.length > 0, `target "${target}" produced empty content`);
    }
  });

  it('every one of the 6 new targets also produces non-empty content for a single-scene, single-op story', () => {
    const canon = makeCanon([commit(0, [{ op: 'RAISE_CLOCK', clockId: 'clock-fuse', amount: 1 }])]);
    const newTargets: ProjectionTarget[] = ['treatment', 'outline', 'dialogue_only', 'epistolary', 'simulation_log', 'director_commentary'];
    for (const target of newTargets) {
      const artifact = project(canon, target);
      assert.ok(artifact.content.length > 0, `target "${target}" produced empty content for single-scene story`);
      assert.ok(!artifact.content.includes('undefined'), `target "${target}" leaked "undefined"`);
      assert.ok(!artifact.content.includes('NaN'), `target "${target}" leaked "NaN"`);
    }
  });
});
