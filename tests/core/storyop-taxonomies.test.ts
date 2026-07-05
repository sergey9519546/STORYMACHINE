// StoryOp taxonomy expansion (Wave E1-b) — ClueCarrier (8→18), ThemeMove
// (5→11, one candidate dropped as a synonym), RelationshipDelta.dimension
// (10→14), and ScenePurpose (9→16). Every axis is a WIDENING string union —
// existing values are untouched, so this file only proves the NEW values
// construct, render, and (for ScenePurpose) infer correctly; it does not
// re-test any pre-existing value.
//
// See tests/core/record-parity.test.ts's header for the two-producer
// contract this file must not disturb: `purpose` is NOT_COMPARED_FREEFORM
// there and `relationshipShifts[].dimension` is a plain string on both
// producers, so nothing here should ever require touching that file's
// PARITY_MATRIX (confirmed by inspection: no tier depends on the specific
// set of ScenePurpose/dimension values, only on presence/shape).

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';

import { parseFountain, type FountainBlock } from '../../src/lib/fountain.ts';
import { project, type Canon } from '../../server/nvm/project/index.ts';
import { annotateCommit, buildScreenplayMemory, type ScenePurpose } from '../../server/nvm/screenplay/memory.ts';
import { deepReadRecords, clearDeepReadCache } from '../../server/nvm/analyze/deep-read.ts';
import { analyzeFountainText } from '../../server/nvm/analyze/fountain-analyzer.ts';
import { setLLMProvider, resetLLMProvider } from '../../server/engine/ai.ts';
import type { LLMProvider } from '../../server/engine/ai.ts';
import { emptyState } from '../../server/nvm/state/NarrativeState.ts';
import { summarizeOps } from '../../server/nvm/state/StoryCommit.ts';
import type { StoryOp, ClueCarrier, ThemeMove, RelationshipDelta } from '../../server/nvm/ops/StoryOp.ts';
import type { StoryCommit } from '../../server/nvm/state/StoryCommit.ts';
import type { Belief, EmotionState } from '../../server/engine/types.ts';

// ── Fixture builders (self-contained — mirrors the idiom used by
//    projection-richness.test.ts / record-parity.test.ts, not imported from
//    them since test files export nothing) ──────────────────────────────────

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

function makeCanon(ops: StoryOp[], title = 'TAXONOMY TEST'): Canon {
  const commit: StoryCommit = {
    commitId: 'c0', parentId: null, sceneIdx: 0, ops,
    deltaSummary: summarizeOps(ops), reverted: false, createdAt: 0,
  };
  return { commits: [commit], state: emptyState(), title };
}

/** Raw projectFountain output for a single scene carrying exactly `ops`. */
function fountainOf(ops: StoryOp[]): string {
  return project(makeCanon(ops), 'fountain').content;
}

function findBlock(blocks: FountainBlock[], predicate: (text: string) => boolean): FountainBlock | undefined {
  return blocks.find(b => predicate(b.text.trim()));
}

function makeCommit(sceneIdx: number, ops: StoryOp[]): StoryCommit {
  return {
    commitId: `c${sceneIdx}`, parentId: sceneIdx === 0 ? null : `c${sceneIdx - 1}`,
    sceneIdx, ops, deltaSummary: summarizeOps(ops), reverted: false, createdAt: sceneIdx,
  };
}

const NO_OPS_FOUNTAIN = fountainOf([]);

// ═════════════════════════════════════════════════════════════════════════
// 1. ClueCarrier — 8 → 18 (costume, lighting, timing, silence,
//    transformation, wound, document, symbol, animal, price)
// ═════════════════════════════════════════════════════════════════════════

// Compile-time exhaustiveness proof, same idiom as StoryOp.ts's own
// STORY_OP_KINDS: a Record keyed on every ClueCarrier member fails to
// compile (excess or missing property) the moment the union and this list
// drift apart, independent of any switch statement's own exhaustiveness.
const CLUE_CARRIER_KINDS: Record<ClueCarrier, true> = {
  object: true, line: true, gesture: true, location: true, absence: true,
  behavior: true, camera: true, sound: true,
  costume: true, lighting: true, timing: true, silence: true,
  transformation: true, wound: true, document: true, symbol: true,
  animal: true, price: true,
};

const NEW_CLUE_CARRIERS: Array<{ carrier: ClueCarrier; phrase: string }> = [
  { carrier: 'costume', phrase: 'A change of clothes' },
  { carrier: 'lighting', phrase: 'A shift in the light' },
  { carrier: 'timing', phrase: 'A telling delay' },
  { carrier: 'silence', phrase: 'A held silence' },
  { carrier: 'transformation', phrase: 'A visible transformation' },
  { carrier: 'wound', phrase: 'A fresh wound' },
  { carrier: 'document', phrase: 'A folded document' },
  { carrier: 'symbol', phrase: 'A recurring symbol' },
  { carrier: 'animal', phrase: 'A watchful animal' },
  { carrier: 'price', phrase: 'A quoted price' },
];

describe('ClueCarrier — exhaustiveness (8 → 18)', () => {
  it('all 18 carriers are enumerated (compile-time Record above proves the type matches; this proves the count)', () => {
    assert.equal(Object.keys(CLUE_CARRIER_KINDS).length, 18);
  });

  it('every one of the 18 carriers renders SOME non-empty action line via SEED_CLUE (no carrier silently produces nothing)', () => {
    for (const carrier of Object.keys(CLUE_CARRIER_KINDS) as ClueCarrier[]) {
      const fountain = fountainOf([{ op: 'SEED_CLUE', clueId: 'clue-sweep', carrier }]);
      const blocks = parseFountain(fountain);
      const action = findBlock(blocks, t => t.includes('sweep'));
      assert.ok(action, `carrier=${carrier} produced no action line mentioning the clue id`);
      assert.equal(action!.type, 'action', `carrier=${carrier} rendered as the wrong Fountain element type`);
    }
  });
});

describe('ClueCarrier — 10 new carriers (construction + fire)', () => {
  for (const { carrier, phrase } of NEW_CLUE_CARRIERS) {
    it(`${carrier}: SEED_CLUE op is accepted and renders "${phrase}" as a craft-plausible, non-empty action line`, () => {
      const fountain = fountainOf([{ op: 'SEED_CLUE', clueId: 'clue-marker', carrier }]);
      const blocks = parseFountain(fountain);
      const action = findBlock(blocks, t => t.includes(phrase) && t.includes('marker'));
      assert.ok(action, `no action line for carrier=${carrier}: ${JSON.stringify(fountain)}`);
      assert.equal(action!.type, 'action');
      assert.ok(action!.text.trim().length > 0, 'action line must be non-empty');
    });
  }

  it('no-fire: an ops-free scene has none of the 10 new carrier phrases', () => {
    for (const { phrase } of NEW_CLUE_CARRIERS) {
      assert.ok(!NO_OPS_FOUNTAIN.includes(phrase), `unexpected phrase "${phrase}" in an ops-free scene`);
    }
  });

  it('every new carrier phrase is distinct from every other carrier phrase (new-vs-new and new-vs-original)', () => {
    const ORIGINAL_PHRASES = [
      'A small object', 'A stray remark', 'A small gesture', 'A detail in the room',
      'A conspicuous absence', 'A telling habit', 'A held frame', 'A faint sound',
    ];
    const newPhrases = NEW_CLUE_CARRIERS.map(c => c.phrase);
    const all = [...ORIGINAL_PHRASES, ...newPhrases];
    assert.equal(new Set(all).size, all.length, 'expected every carrier phrase to be unique');
  });
});

// ═════════════════════════════════════════════════════════════════════════
// 2. ThemeMove — 5 → 11 (invert, parallel, echo, interrogate,
//    demonstrate_through_failure, humanize). 'subvert' evaluated and
//    DROPPED as a synonym of 'undercut' (see StoryOp.ts's ThemeMove comment).
// ═════════════════════════════════════════════════════════════════════════

const THEME_MOVE_KINDS: Record<ThemeMove, true> = {
  support: true, attack: true, undercut: true, complicate: true, resolve: true,
  invert: true, parallel: true, echo: true, interrogate: true,
  demonstrate_through_failure: true, humanize: true,
};

const NEW_THEME_MOVES: ThemeMove[] = [
  'invert', 'parallel', 'echo', 'interrogate', 'demonstrate_through_failure', 'humanize',
];

describe('ThemeMove — exhaustiveness (5 → 11, not 12: "subvert" dropped as a synonym of "undercut")', () => {
  it('all 11 moves are enumerated', () => {
    assert.equal(Object.keys(THEME_MOVE_KINDS).length, 11);
  });

  it('"subvert" is genuinely not a member of ThemeMove (compile-time proof — this would fail tsc if it were)', () => {
    // @ts-expect-error — 'subvert' was evaluated and rejected as a synonym of
    // 'undercut'; this line documents and enforces that it stays rejected.
    const notAMove: ThemeMove = 'subvert';
    void notAMove;
  });

  it('every one of the 11 moves renders a non-empty two-voice VOICE A/VOICE B exchange via ADVANCE_THEME_ARGUMENT', () => {
    for (const move of Object.keys(THEME_MOVE_KINDS) as ThemeMove[]) {
      const fountain = fountainOf([{ op: 'ADVANCE_THEME_ARGUMENT', claimId: 'claim-sweep', move }]);
      const blocks = parseFountain(fountain);
      const cueA = findBlock(blocks, t => t === 'VOICE A');
      const cueB = findBlock(blocks, t => t === 'VOICE B');
      assert.ok(cueA, `move=${move} produced no VOICE A cue`);
      assert.ok(cueB, `move=${move} produced no VOICE B cue`);
      assert.equal(cueA!.type, 'character');
      assert.equal(cueB!.type, 'character');
    }
  });
});

describe('ThemeMove — 6 new moves (construction + fire, real dramaturgical distinction)', () => {
  for (const move of NEW_THEME_MOVES) {
    it(`${move}: ADVANCE_THEME_ARGUMENT op is accepted and renders distinct, non-empty dialogue for both voices`, () => {
      const fountain = fountainOf([{ op: 'ADVANCE_THEME_ARGUMENT', claimId: 'claim-loyalty', move }]);
      const blocks = parseFountain(fountain);
      const dialogueLines = blocks.filter(b => b.type === 'dialogue').map(b => b.text.trim());
      assert.equal(dialogueLines.length, 2, `move=${move} expected exactly 2 dialogue lines`);
      assert.ok(dialogueLines[0].length > 0 && dialogueLines[1].length > 0, 'both dialogue lines must be non-empty');
    });
  }

  it('no-fire: an ops-free scene has no VOICE A/B cues', () => {
    assert.ok(!NO_OPS_FOUNTAIN.includes('VOICE A'));
    assert.ok(!NO_OPS_FOUNTAIN.includes('VOICE B'));
  });

  it('all 11 moves (5 original + 6 new) render 11 PAIRWISE-DISTINCT dialogue exchanges — no new move is a reworded synonym', () => {
    const exchanges = new Set<string>();
    for (const move of Object.keys(THEME_MOVE_KINDS) as ThemeMove[]) {
      const fountain = fountainOf([{ op: 'ADVANCE_THEME_ARGUMENT', claimId: 'claim-x', move }]);
      const blocks = parseFountain(fountain);
      const dialogue = blocks.filter(b => b.type === 'dialogue').map(b => b.text.trim()).join(' / ');
      exchanges.add(dialogue);
    }
    assert.equal(exchanges.size, 11, 'expected 11 distinct two-voice exchanges, one per ThemeMove');
  });
});

// ═════════════════════════════════════════════════════════════════════════
// 3. RelationshipDelta.dimension — 10 → 14 (jealousy, respect, rivalry,
//    protectiveness). 'shame' deliberately excluded (it's an emotion, not a
//    relationship dimension — see StoryOp.ts's comment).
// ═════════════════════════════════════════════════════════════════════════

const RELATIONSHIP_DIMENSION_KINDS: Record<RelationshipDelta['dimension'], true> = {
  love: true, trust: true, intimacy: true, admiration: true, resentment: true,
  fear: true, contempt: true, guilt: true, obligation: true, dependency: true,
  jealousy: true, respect: true, rivalry: true, protectiveness: true,
};

const NEW_DIMENSIONS: Array<RelationshipDelta['dimension']> = ['jealousy', 'respect', 'rivalry', 'protectiveness'];

describe('RelationshipDelta.dimension — exhaustiveness (10 → 14)', () => {
  it('all 14 dimensions are enumerated', () => {
    assert.equal(Object.keys(RELATIONSHIP_DIMENSION_KINDS).length, 14);
  });

  it('"shame" is genuinely not a member of RelationshipDelta.dimension (compile-time proof) — it is an EmotionState field, not a relational axis', () => {
    // @ts-expect-error — shame is a feeling a character holds about
    // themselves (see EmotionState.shame in server/engine/types.ts), not an
    // axis a relationship BETWEEN two people moves along; deliberately
    // excluded, not an oversight.
    const notADimension: RelationshipDelta['dimension'] = 'shame';
    void notADimension;
  });
});

describe('RelationshipDelta.dimension — 4 new dimensions (construction + generic-consumer round-trip)', () => {
  for (const dimension of NEW_DIMENSIONS) {
    it(`${dimension}: SHIFT_RELATIONSHIP op is accepted, renders a non-empty action line, and round-trips through the ops-derived record untouched`, () => {
      const op: StoryOp = {
        op: 'SHIFT_RELATIONSHIP',
        pair: ['ren', 'sol'],
        delta: { dimension, amount: 0.4, reason: `a ${dimension} beat between them` },
      };
      // Fire: renders the standard SHIFT_RELATIONSHIP action line, correct
      // element type (dimension itself is not lexically rendered — it drives
      // no branch in renderFountainOp — so this proves acceptance +
      // non-empty craft-plausible rendering, per the construction-test spec).
      const fountain = fountainOf([op]);
      const blocks = parseFountain(fountain);
      const action = findBlock(blocks, t => t.includes(`a ${dimension} beat between them`));
      assert.ok(action, `no action line for dimension=${dimension}`);
      assert.equal(action!.type, 'action');

      // Generic-consumer round-trip: memory.ts's annotateCommit stores
      // dimension as a plain string (see relationship-arc.ts/conflict.ts
      // consumers, all Set/string-equality based, never an exhaustive
      // switch) — proves the new value survives the ops-derived pipeline.
      const record = annotateCommit(makeCommit(1, [op]));
      assert.equal(record.relationshipShifts?.length, 1);
      assert.equal(record.relationshipShifts![0].dimension, dimension);
      assert.equal(record.relationshipShifts![0].pairKey, 'ren|sol');
    });
  }

  it('no-fire: a scene with no SHIFT_RELATIONSHIP op has an empty relationshipShifts array', () => {
    const record = annotateCommit(makeCommit(1, [{ op: 'UPDATE_READER_STATE', delta: { suspense: 1 } }]));
    assert.deepEqual(record.relationshipShifts, []);
  });
});

// ═════════════════════════════════════════════════════════════════════════
// 4. ScenePurpose — 9 → 16 (setup_planting, relationship_beat, echo_coda,
//    breather, subplot_complication, false_victory, dark_night)
// ═════════════════════════════════════════════════════════════════════════

const SCENE_PURPOSE_KINDS: Record<ScenePurpose, true> = {
  establish_world: true, introduce_conflict: true, complicate: true, raise_stakes: true,
  revelation: true, turning_point: true, climax: true, resolution: true, character_moment: true,
  setup_planting: true, relationship_beat: true, echo_coda: true, breather: true,
  subplot_complication: true, false_victory: true, dark_night: true,
};

describe('ScenePurpose — exhaustiveness (9 → 16)', () => {
  it('all 16 purposes are enumerated', () => {
    assert.equal(Object.keys(SCENE_PURPOSE_KINDS).length, 16);
  });
});

// ── Ops-derived-reachable purposes: deterministic-inference fire/no-fire ───

describe('ScenePurpose — setup_planting (ops-derived: 2+ SEED_CLUE ops dominate the scene)', () => {
  it('fire: a scene with 2 SEED_CLUE ops infers setup_planting', () => {
    const record = annotateCommit(makeCommit(2, [
      { op: 'SEED_CLUE', clueId: 'clue-a', carrier: 'object' },
      { op: 'SEED_CLUE', clueId: 'clue-b', carrier: 'line' },
    ]));
    assert.equal(record.purpose, 'setup_planting');
  });

  it('no-fire: a scene with exactly 1 SEED_CLUE op still infers the original introduce_conflict (unchanged behavior)', () => {
    const record = annotateCommit(makeCommit(2, [
      { op: 'SEED_CLUE', clueId: 'clue-a', carrier: 'object' },
    ]));
    assert.equal(record.purpose, 'introduce_conflict');
  });

  it('no-fire: sceneIdx 0 stays establish_world even with 2 SEED_CLUE ops (establish_world takes priority)', () => {
    const record = annotateCommit(makeCommit(0, [
      { op: 'SEED_CLUE', clueId: 'clue-a', carrier: 'object' },
      { op: 'SEED_CLUE', clueId: 'clue-b', carrier: 'line' },
    ]));
    assert.equal(record.purpose, 'establish_world');
  });

  it('no-fire: PAYOFF_SETUP still takes priority over 2+ SEED_CLUE ops in the same scene (revelation unchanged)', () => {
    const record = annotateCommit(makeCommit(2, [
      { op: 'PAYOFF_SETUP', setupId: 'setup-1', payoffEventId: 'evt-1' },
      { op: 'SEED_CLUE', clueId: 'clue-a', carrier: 'object' },
      { op: 'SEED_CLUE', clueId: 'clue-b', carrier: 'line' },
    ]));
    assert.equal(record.purpose, 'revelation');
  });
});

describe('ScenePurpose — relationship_beat (ops-derived: SHIFT_RELATIONSHIP present)', () => {
  it('fire: a scene with a SHIFT_RELATIONSHIP op infers relationship_beat', () => {
    const record = annotateCommit(makeCommit(3, [
      { op: 'UPDATE_BELIEF', charId: 'ren', belief: belief('Something shifted between them.') },
      { op: 'SHIFT_RELATIONSHIP', pair: ['ren', 'sol'], delta: { dimension: 'trust', amount: 0.3, reason: 'a small kindness' } },
    ]));
    assert.equal(record.purpose, 'relationship_beat');
  });

  it('fire: SHIFT_RELATIONSHIP still wins even alongside an APPRAISE_EMOTION op (relationship_beat, not character_moment)', () => {
    const record = annotateCommit(makeCommit(3, [
      { op: 'SHIFT_RELATIONSHIP', pair: ['ren', 'sol'], delta: { dimension: 'respect', amount: 0.2, reason: 'earned respect' } },
      { op: 'APPRAISE_EMOTION', charId: 'ren', emotion: emotion({ dominant: 'pride', pride: 40, intensity: 40 }) },
    ]));
    assert.equal(record.purpose, 'relationship_beat');
  });

  it('no-fire: a scene with no SHIFT_RELATIONSHIP op never infers relationship_beat', () => {
    const record = annotateCommit(makeCommit(3, [
      { op: 'APPRAISE_EMOTION', charId: 'ren', emotion: emotion({ dominant: 'joy', joy: 40, intensity: 40 }) },
    ]));
    assert.notEqual(record.purpose, 'relationship_beat');
    assert.equal(record.purpose, 'character_moment');
  });
});

describe('ScenePurpose — echo_coda (ops-derived: ADVANCE_THEME_ARGUMENT with move "echo")', () => {
  it('fire: an "echo" theme move infers echo_coda', () => {
    const record = annotateCommit(makeCommit(4, [
      { op: 'ADVANCE_THEME_ARGUMENT', claimId: 'claim-sacrifice', move: 'echo' },
    ]));
    assert.equal(record.purpose, 'echo_coda');
  });

  it('no-fire: any other theme move (e.g. "support") stays turning_point, unchanged', () => {
    const record = annotateCommit(makeCommit(4, [
      { op: 'ADVANCE_THEME_ARGUMENT', claimId: 'claim-sacrifice', move: 'support' },
    ]));
    assert.equal(record.purpose, 'turning_point');
  });

  it('no-fire: a scene with no ADVANCE_THEME_ARGUMENT op never infers echo_coda', () => {
    const record = annotateCommit(makeCommit(4, [
      { op: 'UPDATE_BELIEF', charId: 'ren', belief: belief('A quiet thought.') },
    ]));
    assert.notEqual(record.purpose, 'echo_coda');
  });
});

describe('ScenePurpose — breather (ops-derived: the true no-signal fallback)', () => {
  it('fire: a scene with only an untold UPDATE_BELIEF (no clue/clock/relationship/theme/emotion) infers breather', () => {
    const record = annotateCommit(makeCommit(5, [
      { op: 'UPDATE_BELIEF', charId: 'ren', belief: belief('Nothing much is happening right now.') },
    ]));
    assert.equal(record.purpose, 'breather');
  });

  it('fire: a completely ops-free scene also infers breather', () => {
    const record = annotateCommit(makeCommit(5, []));
    assert.equal(record.purpose, 'breather');
  });

  it('no-fire: adding an APPRAISE_EMOTION op to an otherwise-quiet scene infers character_moment instead of breather', () => {
    const record = annotateCommit(makeCommit(5, [
      { op: 'UPDATE_BELIEF', charId: 'ren', belief: belief('Nothing much is happening right now.') },
      { op: 'APPRAISE_EMOTION', charId: 'ren', emotion: emotion({ dominant: 'shame', shame: 30, intensity: 30 }) },
    ]));
    assert.equal(record.purpose, 'character_moment');
  });
});

// ── LLM-only purposes: never reachable via the ops-derived path; reachable
//    only via deep-read.ts's model-based reader ──────────────────────────

const LLM_ONLY_PURPOSES: ScenePurpose[] = ['subplot_complication', 'false_victory', 'dark_night'];

describe('ScenePurpose — subplot_complication / false_victory / dark_night are LLM-only (construction + fire via deep-read, never via ops path)', () => {
  it('construction: none of the 3 LLM-only purposes is ever produced by the ops-derived path across a representative sweep of op combinations', () => {
    const sweeps: StoryOp[][] = [
      [],
      [{ op: 'UPDATE_BELIEF', charId: 'a', belief: belief('x') }],
      [{ op: 'SEED_CLUE', clueId: 'c1', carrier: 'object' }],
      [{ op: 'SEED_CLUE', clueId: 'c1', carrier: 'object' }, { op: 'SEED_CLUE', clueId: 'c2', carrier: 'line' }],
      [{ op: 'PAYOFF_SETUP', setupId: 's1', payoffEventId: 'e1' }],
      [{ op: 'RAISE_CLOCK', clockId: 'clk', amount: 3 }],
      [{ op: 'SHIFT_RELATIONSHIP', pair: ['a', 'b'], delta: { dimension: 'jealousy', amount: -0.5, reason: 'r' } }],
      [{ op: 'ADVANCE_THEME_ARGUMENT', claimId: 'cl', move: 'echo' }],
      [{ op: 'ADVANCE_THEME_ARGUMENT', claimId: 'cl', move: 'demonstrate_through_failure' }],
      [{ op: 'APPRAISE_EMOTION', charId: 'a', emotion: emotion({ dominant: 'distress', distress: 80, intensity: 80 }) }],
    ];
    for (let i = 0; i < sweeps.length; i++) {
      const record = annotateCommit(makeCommit(i + 1, sweeps[i]));
      assert.ok(
        !LLM_ONLY_PURPOSES.includes(record.purpose),
        `ops-derived path unexpectedly produced LLM-only purpose "${record.purpose}" for sweep ${i}`,
      );
    }
  });

  afterEach(() => {
    resetLLMProvider();
    clearDeepReadCache();
  });

  it('fire (via deep-read): a model response assigning subplot_complication/false_victory/dark_night is accepted and merged', async () => {
    const fountain = [
      'INT. SAFEHOUSE - DAY',
      '',
      'A quiet, undecorated room.',
      '',
      'INT. ROOFTOP - NIGHT',
      '',
      'Wind. A long way down.',
      '',
      'INT. KITCHEN - DAY',
      '',
      'Someone washes a single cup.',
    ].join('\n');
    const { records: baseline } = analyzeFountainText(fountain);
    assert.equal(baseline.length, 3);

    const provider: LLMProvider = {
      generate: async (params) => {
        const contents = params.contents as Array<{ parts: Array<{ text: string }> }>;
        const promptText = contents[0]?.parts?.[0]?.text ?? '';
        const idxs = [...promptText.matchAll(/--- SCENE (\d+) \(DATA/g)].map(m => Number(m[1]));
        const purposesByIdx: Record<number, ScenePurpose> = {
          0: 'subplot_complication', 1: 'false_victory', 2: 'dark_night',
        };
        const arr = idxs.map(sceneIdx => ({
          sceneIdx,
          suspenseDelta: 0,
          curiosityDelta: 0,
          emotionalShift: 'neutral',
          purpose: purposesByIdx[sceneIdx],
          dramaticTurn: `deep-read turn ${sceneIdx}`,
          revelation: null,
        }));
        return { text: JSON.stringify(arr) } as never;
      },
    };
    setLLMProvider(provider);

    const { records: merged, deepRead } = await deepReadRecords(fountain, baseline);
    assert.equal(deepRead.scenesRead, 3, 'all 3 scenes should validate against the SCENE_PURPOSES schema');
    assert.equal(merged[0].purpose, 'subplot_complication');
    assert.equal(merged[1].purpose, 'false_victory');
    assert.equal(merged[2].purpose, 'dark_night');
  });
});

// ── Sanity: buildScreenplayMemory (the real multi-scene entry point) can
//    surface every ops-derived-reachable purpose in one document ──────────

describe('ScenePurpose — buildScreenplayMemory surfaces the new ops-derived values across a multi-scene ledger', () => {
  it('a small ledger exercising setup_planting, relationship_beat, echo_coda, and breather all resolve correctly', () => {
    const commits: StoryCommit[] = [
      makeCommit(0, [{ op: 'UPDATE_BELIEF', charId: 'a', belief: belief('The morning is ordinary.') }]),
      makeCommit(1, [
        { op: 'SEED_CLUE', clueId: 'clue-x', carrier: 'document' },
        { op: 'SEED_CLUE', clueId: 'clue-y', carrier: 'symbol' },
      ]),
      makeCommit(2, [
        { op: 'SHIFT_RELATIONSHIP', pair: ['a', 'b'], delta: { dimension: 'rivalry', amount: -0.3, reason: 'a public slight' } },
      ]),
      makeCommit(3, [{ op: 'ADVANCE_THEME_ARGUMENT', claimId: 'claim-trust', move: 'echo' }]),
      makeCommit(4, []),
    ];
    const records = buildScreenplayMemory(commits);
    assert.equal(records[0].purpose, 'establish_world');
    assert.equal(records[1].purpose, 'setup_planting');
    assert.equal(records[2].purpose, 'relationship_beat');
    assert.equal(records[3].purpose, 'echo_coda');
    assert.equal(records[4].purpose, 'breather');
  });
});
