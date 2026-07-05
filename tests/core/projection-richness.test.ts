// Projection richness — Run 17-B ("compiler richness"). Contracts that
// projectFountain (server/nvm/project/index.ts's renderFountainOp) renders
// ALL 14 StoryOp kinds as craft-plausible Fountain text, not just the 3
// (UPDATE_BELIEF, SHIFT_RELATIONSHIP, RECORD_VISUAL_FACT) it rendered before
// this wave. Each of the 14 kinds gets:
//   - a FIRE test: the op present in a scene's ops produces its distinctive
//     rendered text in the compiled fountain, parsed as the correct Fountain
//     element type (scene_heading / action / character / dialogue).
//   - a NO-FIRE test: the op absent produces no spurious trace of that text.
// Plus one integration test: a single commit carrying all 14 kinds compiles
// to Fountain that src/lib/fountain.ts's parseFountain reads cleanly (no
// camera-bleed lint errors, a real scene heading, cue/dialogue pairs that
// parse as such) — the "nothing renders as a debug dump, nothing breaks
// Fountain structure" acceptance bar for this wave.
//
// See tests/core/record-parity.test.ts for the companion contract (the two
// ScreenplaySceneRecord producers agreeing on what these richer renderings
// mean) and server/nvm/project/index.ts's renderFountainOp for the per-op
// rendering design (each branch is commented with which lexicon term, if
// any, it deliberately reuses from fountain-analyzer.ts).

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { parseFountain, type FountainBlock } from '../../src/lib/fountain.ts';
import { project, type Canon } from '../../server/nvm/project/index.ts';
import { compileScreenplay } from '../../server/nvm/screenplay/compile.ts';
import { buildScreenplayMemory } from '../../server/nvm/screenplay/memory.ts';
import { analyzeStructure } from '../../server/nvm/screenplay/structure.ts';
import { emptyState } from '../../server/nvm/state/NarrativeState.ts';
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

function makeCanon(ops: StoryOp[], title = 'RICHNESS TEST'): Canon {
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

/** Baseline: a scene with NO ops at all — every fire-test marker below must
 *  be absent from this, or the "no-fire" half of the contract is meaningless. */
const NO_OPS_FOUNTAIN = fountainOf([]);

// ── 1. UPDATE_BELIEF ─────────────────────────────────────────────────────────

describe('projection richness — UPDATE_BELIEF', () => {
  it('fire: renders a character cue + "(believing) <proposition>" dialogue line', () => {
    const fountain = fountainOf([
      { op: 'UPDATE_BELIEF', charId: 'nora', belief: belief('The lantern flickered once and went dark.') },
    ]);
    const blocks = parseFountain(fountain);
    const cue = findBlock(blocks, t => t === 'NORA');
    const dialogue = findBlock(blocks, t => t === '(believing) The lantern flickered once and went dark.');
    assert.ok(cue, 'character cue "NORA" not found');
    assert.equal(cue!.type, 'character');
    assert.ok(dialogue, 'believing dialogue line not found');
    assert.equal(dialogue!.type, 'dialogue');
  });

  it('no-fire: an ops-free scene has no character cue and no "(believing)" text', () => {
    assert.ok(!NO_OPS_FOUNTAIN.includes('NORA'));
    assert.ok(!NO_OPS_FOUNTAIN.includes('(believing)'));
  });
});

// ── 2. SHIFT_RELATIONSHIP ────────────────────────────────────────────────────

describe('projection richness — SHIFT_RELATIONSHIP', () => {
  it('fire: renders an action line naming both characters and the reason', () => {
    const fountain = fountainOf([
      { op: 'SHIFT_RELATIONSHIP', pair: ['nora', 'helmer'], delta: { dimension: 'trust', amount: 0.2, reason: 'a quiet truce' } },
    ]);
    const blocks = parseFountain(fountain);
    const line = findBlock(blocks, t => t === 'The dynamic between nora and helmer shifts — a quiet truce.');
    assert.ok(line, 'relationship-shift action line not found');
    assert.equal(line!.type, 'action');
  });

  it('no-fire: an ops-free scene has no "dynamic between" text', () => {
    assert.ok(!NO_OPS_FOUNTAIN.includes('dynamic between'));
  });
});

// ── 3. RECORD_VISUAL_FACT ────────────────────────────────────────────────────

describe('projection richness — RECORD_VISUAL_FACT', () => {
  it('fire: renders an ALL-CAPS action line of the fact', () => {
    const fountain = fountainOf([
      { op: 'RECORD_VISUAL_FACT', sceneId: 's1', fact: 'a torn photograph on the floor' },
    ]);
    const blocks = parseFountain(fountain);
    const line = findBlock(blocks, t => t === 'A TORN PHOTOGRAPH ON THE FLOOR');
    assert.ok(line, 'visual-fact action line not found');
    assert.equal(line!.type, 'action');
  });

  it('no-fire: an ops-free scene has no visual-fact text', () => {
    assert.ok(!NO_OPS_FOUNTAIN.includes('TORN PHOTOGRAPH'));
  });
});

// ── 4. RECORD_SONIC_FACT ─────────────────────────────────────────────────────

describe('projection richness — RECORD_SONIC_FACT', () => {
  it('fire: renders an ALL-CAPS "(SOUND)"-suffixed action line', () => {
    const fountain = fountainOf([
      { op: 'RECORD_SONIC_FACT', sceneId: 's1', fact: 'a floorboard creaks upstairs' },
    ]);
    const blocks = parseFountain(fountain);
    const line = findBlock(blocks, t => t === 'A FLOORBOARD CREAKS UPSTAIRS (SOUND)');
    assert.ok(line, 'sonic-fact action line not found');
    assert.equal(line!.type, 'action');
  });

  it('no-fire: an ops-free scene has no sonic-fact text', () => {
    assert.ok(!NO_OPS_FOUNTAIN.includes('FLOORBOARD CREAKS'));
  });
});

// ── 5. ADD_FACT ───────────────────────────────────────────────────────────────

describe('projection richness — ADD_FACT', () => {
  it('fire: renders a dramatized action line carrying subject/predicate/object', () => {
    const fountain = fountainOf([
      { op: 'ADD_FACT', fact: { factId: 'f1', subject: 'the vault', predicate: 'contains', object: 'a fortune', addedAtTurn: 0, validFrom: 0, validTo: null } },
    ]);
    const blocks = parseFountain(fountain);
    const line = findBlock(blocks, t => t === 'The vault contains a fortune, plain and undeniable now.');
    assert.ok(line, 'ADD_FACT action line not found');
    assert.equal(line!.type, 'action');
  });

  it('fire (moves_to variant): renders a location-aware scene heading AND an arrival action line', () => {
    const fountain = fountainOf([
      { op: 'ADD_FACT', fact: { factId: 'f2', subject: 'nora', predicate: 'moves_to', object: 'the harbor', addedAtTurn: 0, validFrom: 0, validTo: null } },
    ]);
    const blocks = parseFountain(fountain);
    const heading = findBlock(blocks, t => t === 'INT. THE HARBOR — SCENE 1');
    const arrival = findBlock(blocks, t => t === 'Nora arrives, and the world resettles around the harbor.');
    assert.ok(heading, 'location-aware scene heading not found');
    assert.equal(heading!.type, 'scene_heading');
    assert.ok(arrival, 'arrival action line not found');
    assert.equal(arrival!.type, 'action');
  });

  it('no-fire: an ops-free scene has no ADD_FACT text', () => {
    assert.ok(!NO_OPS_FOUNTAIN.includes('vault contains'));
    assert.ok(!NO_OPS_FOUNTAIN.includes('resettles around'));
  });
});

// ── 6. EXPIRE_FACT ────────────────────────────────────────────────────────────

describe('projection richness — EXPIRE_FACT', () => {
  it('fire: renders an action line marking the fact\'s lapse, id humanized', () => {
    const fountain = fountainOf([
      { op: 'EXPIRE_FACT', factId: 'fact-old-treaty', atTurn: 5 },
    ]);
    const blocks = parseFountain(fountain);
    const line = findBlock(blocks, t => t === 'Whatever "old treaty" once meant quietly stops being true.');
    assert.ok(line, 'EXPIRE_FACT action line not found');
    assert.equal(line!.type, 'action');
  });

  it('no-fire: an ops-free scene has no expiry text', () => {
    assert.ok(!NO_OPS_FOUNTAIN.includes('once meant quietly stops being true'));
  });
});

// ── 7. APPRAISE_EMOTION ───────────────────────────────────────────────────────

describe('projection richness — APPRAISE_EMOTION', () => {
  it('fire: renders a physical action beat for the dominant emotion (never states the emotion word as narration)', () => {
    const fountain = fountainOf([
      { op: 'APPRAISE_EMOTION', charId: 'mara', emotion: emotion({ dominant: 'anger', anger: 70, intensity: 70 }) },
    ]);
    const blocks = parseFountain(fountain);
    const line = findBlock(blocks, t => t === 'Mara clenches a fist, anger flashing hot across their face.');
    assert.ok(line, 'emotion action beat not found');
    assert.equal(line!.type, 'action');
    assert.ok(!fountain.includes('Mara feels anger'), 'must not narrate the emotion directly');
  });

  it('every dominant emotion (joy/distress/anger/fear/pride/shame/neutral) renders a distinct beat', () => {
    const dominants: EmotionState['dominant'][] = ['joy', 'distress', 'anger', 'fear', 'pride', 'shame', 'neutral'];
    const beats = new Set<string>();
    for (const dominant of dominants) {
      const fountain = fountainOf([
        { op: 'APPRAISE_EMOTION', charId: 'quinn', emotion: emotion({ dominant, intensity: 50 }) },
      ]);
      const blocks = parseFountain(fountain);
      const line = blocks.find(b => b.type === 'action' && b.text.trim().startsWith('Quinn'));
      assert.ok(line, `no action beat rendered for dominant=${dominant}`);
      beats.add(line!.text.trim());
    }
    assert.equal(beats.size, dominants.length, 'expected a distinct beat per dominant emotion');
  });

  it('no-fire: an ops-free scene has no emotion-beat text', () => {
    assert.ok(!NO_OPS_FOUNTAIN.includes('clenches a fist'));
  });
});

// ── 8. ADVANCE_OBJECT_ARC ─────────────────────────────────────────────────────

describe('projection richness — ADVANCE_OBJECT_ARC', () => {
  it('fire: renders an action line showing the object\'s new state', () => {
    const fountain = fountainOf([
      { op: 'ADVANCE_OBJECT_ARC', objectId: 'object-locket', toState: 'shattered' },
    ]);
    const blocks = parseFountain(fountain);
    const line = findBlock(blocks, t => t === 'The locket is shattered now, visibly and unmistakably changed.');
    assert.ok(line, 'object-arc action line not found');
    assert.equal(line!.type, 'action');
  });

  it('no-fire: an ops-free scene has no object-arc text', () => {
    assert.ok(!NO_OPS_FOUNTAIN.includes('visibly and unmistakably changed'));
  });
});

// ── 9. TRIGGER_RULE ───────────────────────────────────────────────────────────

describe('projection richness — TRIGGER_RULE', () => {
  it('fire: renders an action line showing the mechanism visibly operating', () => {
    const fountain = fountainOf([
      { op: 'TRIGGER_RULE', mechanismId: 'mechanism-trapdoor', ruleId: 'rule-release' },
    ]);
    const blocks = parseFountain(fountain);
    const line = findBlock(blocks, t => t === 'The trapdoor shudders to life and does exactly what it was built to do.');
    assert.ok(line, 'mechanism action line not found');
    assert.equal(line!.type, 'action');
  });

  it('no-fire: an ops-free scene has no mechanism text', () => {
    assert.ok(!NO_OPS_FOUNTAIN.includes('shudders to life'));
  });
});

// ── 10. SEED_CLUE ─────────────────────────────────────────────────────────────

describe('projection richness — SEED_CLUE', () => {
  it('fire: renders an action line with a quoted, distinctive clue token', () => {
    const fountain = fountainOf([
      { op: 'SEED_CLUE', clueId: 'clue-locket', carrier: 'object' },
    ]);
    const blocks = parseFountain(fountain);
    const line = findBlock(blocks, t => t === 'A small object catches the eye: "locket," small and easy to miss.');
    assert.ok(line, 'clue-seed action line not found');
    assert.equal(line!.type, 'action');
  });

  it('every clue carrier renders its own descriptive phrase', () => {
    const carriers: StoryOp['op'] extends never ? never : Array<Extract<StoryOp, { op: 'SEED_CLUE' }>['carrier']> =
      ['object', 'line', 'gesture', 'location', 'absence', 'behavior', 'camera', 'sound'];
    const phrases = new Set<string>();
    for (const carrier of carriers) {
      const fountain = fountainOf([{ op: 'SEED_CLUE', clueId: 'clue-x', carrier }]);
      const blocks = parseFountain(fountain);
      const line = blocks.find(b => b.type === 'action' && b.text.includes('catches the eye'));
      assert.ok(line, `no clue line rendered for carrier=${carrier}`);
      phrases.add(line!.text.trim());
    }
    assert.equal(phrases.size, carriers.length, 'expected a distinct phrase per carrier type');
  });

  it('no-fire: an ops-free scene has no clue-seed text', () => {
    assert.ok(!NO_OPS_FOUNTAIN.includes('catches the eye'));
  });
});

// ── 11. PAYOFF_SETUP ──────────────────────────────────────────────────────────

describe('projection richness — PAYOFF_SETUP', () => {
  it('fire: renders a callback action line re-quoting the setup id', () => {
    const fountain = fountainOf([
      { op: 'PAYOFF_SETUP', setupId: 'clue-locket', payoffEventId: 'evt-1' },
    ]);
    const blocks = parseFountain(fountain);
    const line = findBlock(blocks, t => t === 'There it is again: "locket," exactly as it was seeded, and everything clicks into place.');
    assert.ok(line, 'payoff callback line not found');
    assert.equal(line!.type, 'action');
  });

  it('no-fire: an ops-free scene has no payoff-callback text', () => {
    assert.ok(!NO_OPS_FOUNTAIN.includes('exactly as it was seeded'));
  });
});

// ── 12. RAISE_CLOCK ───────────────────────────────────────────────────────────

describe('projection richness — RAISE_CLOCK', () => {
  it('fire: renders an action line with deadline/urgency vocabulary', () => {
    const fountain = fountainOf([
      { op: 'RAISE_CLOCK', clockId: 'clock-fuse', amount: 1 },
    ]);
    const blocks = parseFountain(fountain);
    const line = findBlock(blocks, t => t === 'The deadline tightens. They are running out of time before the fuse reaches its final hour.');
    assert.ok(line, 'clock action line not found');
    assert.equal(line!.type, 'action');
    // Exact DEADLINE_TERMS entries (fountain-analyzer.ts, read-only reference)
    // this line is designed to carry.
    assert.ok(fountain.includes('deadline'));
    assert.ok(fountain.includes('running out of time'));
    assert.ok(fountain.includes('final hour'));
  });

  it('no-fire: an ops-free scene has no clock text', () => {
    assert.ok(!NO_OPS_FOUNTAIN.includes('deadline tightens'));
  });
});

// ── 13. ADVANCE_THEME_ARGUMENT ────────────────────────────────────────────────

describe('projection richness — ADVANCE_THEME_ARGUMENT', () => {
  it('fire: renders a two-voice dialogue exchange embodying the thematic move', () => {
    const fountain = fountainOf([
      { op: 'ADVANCE_THEME_ARGUMENT', claimId: 'claim-loyalty', move: 'attack' },
    ]);
    const blocks = parseFountain(fountain);
    const cueA = findBlock(blocks, t => t === 'VOICE A');
    const cueB = findBlock(blocks, t => t === 'VOICE B');
    const lineA = findBlock(blocks, t => t === 'Loyalty? Not anymore.');
    const lineB = findBlock(blocks, t => t === 'It was never as true as we thought.');
    assert.ok(cueA, 'VOICE A cue not found');
    assert.equal(cueA!.type, 'character');
    assert.ok(cueB, 'VOICE B cue not found');
    assert.equal(cueB!.type, 'character');
    assert.ok(lineA, 'VOICE A dialogue not found');
    assert.equal(lineA!.type, 'dialogue');
    assert.ok(lineB, 'VOICE B dialogue not found');
    assert.equal(lineB!.type, 'dialogue');
  });

  it('every ThemeMove renders a distinct two-line exchange', () => {
    const moves: Array<Extract<StoryOp, { op: 'ADVANCE_THEME_ARGUMENT' }>['move']> =
      ['support', 'attack', 'undercut', 'complicate', 'resolve'];
    const exchanges = new Set<string>();
    for (const move of moves) {
      const fountain = fountainOf([{ op: 'ADVANCE_THEME_ARGUMENT', claimId: 'claim-x', move }]);
      const blocks = parseFountain(fountain);
      const dialogue = blocks.filter(b => b.type === 'dialogue').map(b => b.text.trim()).join(' / ');
      assert.ok(dialogue.length > 0, `no dialogue rendered for move=${move}`);
      exchanges.add(dialogue);
    }
    assert.equal(exchanges.size, moves.length, 'expected a distinct exchange per ThemeMove');
  });

  it('no-fire: an ops-free scene has no VOICE A/B cues', () => {
    assert.ok(!NO_OPS_FOUNTAIN.includes('VOICE A'));
    assert.ok(!NO_OPS_FOUNTAIN.includes('VOICE B'));
  });
});

// ── 14. UPDATE_READER_STATE ───────────────────────────────────────────────────

describe('projection richness — UPDATE_READER_STATE', () => {
  it('fire (suspense > 0): renders a danger-leaning atmosphere line', () => {
    const fountain = fountainOf([
      { op: 'UPDATE_READER_STATE', delta: { suspense: 2, curiosity: 0 } },
    ]);
    const blocks = parseFountain(fountain);
    const line = findBlock(blocks, t => t === 'A dangerous hush falls over the room, and something feels wrong.');
    assert.ok(line, 'suspense-positive atmosphere line not found');
    assert.equal(line!.type, 'action');
  });

  it('fire (suspense < 0): renders a relief-leaning atmosphere line', () => {
    const fountain = fountainOf([
      { op: 'UPDATE_READER_STATE', delta: { suspense: -1, curiosity: 0 } },
    ]);
    const line = findBlock(parseFountain(fountain), t => t === 'The tension eases; the air feels calm and safe again.');
    assert.ok(line, 'suspense-negative atmosphere line not found');
    assert.equal(line!.type, 'action');
  });

  it('fire (curiosity > 0, suspense 0): renders a mystery-leaning atmosphere line', () => {
    const fountain = fountainOf([
      { op: 'UPDATE_READER_STATE', delta: { suspense: 0, curiosity: 1 } },
    ]);
    const line = findBlock(parseFountain(fountain), t => t === 'Something strange lingers unspoken, a small mystery nobody names.');
    assert.ok(line, 'curiosity-positive atmosphere line not found');
    assert.equal(line!.type, 'action');
  });

  it('no-fire (both fields zero): renders no atmosphere line at all — "subtle" means silence, not noise', () => {
    const fountain = fountainOf([
      { op: 'UPDATE_READER_STATE', delta: { suspense: 0, curiosity: 0 } },
    ]);
    assert.ok(!fountain.includes('dangerous hush'));
    assert.ok(!fountain.includes('tension eases'));
    assert.ok(!fountain.includes('mystery nobody names'));
    assert.ok(!fountain.includes('unanswered question'));
  });

  it('no-fire: an ops-free scene has no atmosphere text', () => {
    assert.ok(!NO_OPS_FOUNTAIN.includes('dangerous hush'));
    assert.ok(!NO_OPS_FOUNTAIN.includes('tension eases'));
  });
});

// ── Integration: all 14 kinds in one commit compile to valid Fountain ────────

describe('projection richness — a commit carrying all 14 StoryOp kinds compiles to valid Fountain', () => {
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

  function compileAll14() {
    const commits: StoryCommit[] = [{
      commitId: 'c0', parentId: null, sceneIdx: 0, ops: ALL_14_OPS,
      deltaSummary: summarizeOps(ALL_14_OPS), reverted: false, createdAt: 0,
    }];
    const records = buildScreenplayMemory(commits);
    const structure = analyzeStructure(records, commits);
    return compileScreenplay(commits, emptyState(), records, structure, 'ALL FOURTEEN');
  }

  it('all 14 op kinds are exercised by this fixture (guards the fixture itself from silently losing a kind)', () => {
    const kinds = new Set(ALL_14_OPS.map(o => o.op));
    assert.equal(kinds.size, 14, `expected 14 distinct op kinds, got ${kinds.size}: ${[...kinds].join(', ')}`);
  });

  it('parseFountain reads the compiled output with zero lint errors (no camera-bleed, no malformed lines)', () => {
    const compiled = compileAll14();
    const blocks = parseFountain(compiled.fountain);
    assert.ok(blocks.length > 0, 'parseFountain produced no blocks');
    const withLintErrors = blocks.filter(b => b.lintErrors && b.lintErrors.length > 0);
    assert.deepEqual(withLintErrors.map(b => ({ text: b.text, lintErrors: b.lintErrors })), []);
  });

  it('the compiled output contains at least one real scene heading', () => {
    const compiled = compileAll14();
    const blocks = parseFountain(compiled.fountain);
    assert.ok(blocks.some(b => b.type === 'scene_heading'), 'no scene_heading block found');
  });

  it('every character cue is followed (within the scene) by at least one dialogue block', () => {
    const compiled = compileAll14();
    const blocks = parseFountain(compiled.fountain);
    const cueIdxs = blocks.map((b, i) => ({ b, i })).filter(({ b }) => b.type === 'character').map(({ i }) => i);
    assert.ok(cueIdxs.length > 0, 'expected at least one character cue (UPDATE_BELIEF + ADVANCE_THEME_ARGUMENT both render one)');
    for (const idx of cueIdxs) {
      const hasDialogueAfter = blocks.slice(idx + 1).some(b => b.type === 'dialogue');
      assert.ok(hasDialogueAfter, `character cue at block ${idx} ("${blocks[idx].text.trim()}") has no dialogue anywhere after it`);
    }
  });

  it('every one of the 14 ops leaves its distinctive marker text somewhere in the compiled fountain', () => {
    const compiled = compileAll14();
    const f = compiled.fountain;
    const markers: Array<[string, string]> = [
      ['ADD_FACT', 'The vault contains a fortune, plain and undeniable now.'],
      ['EXPIRE_FACT', 'Whatever "old treaty" once meant quietly stops being true.'],
      ['UPDATE_BELIEF', '(believing) The lantern flickered once and went dark.'],
      ['APPRAISE_EMOTION', 'Mara clenches a fist, anger flashing hot across their face.'],
      ['SHIFT_RELATIONSHIP', 'The dynamic between nora and helmer shifts — a quiet truce.'],
      ['ADVANCE_OBJECT_ARC', 'The locket is shattered now, visibly and unmistakably changed.'],
      ['TRIGGER_RULE', 'The trapdoor shudders to life and does exactly what it was built to do.'],
      ['SEED_CLUE', 'A small object catches the eye: "locket," small and easy to miss.'],
      ['PAYOFF_SETUP', 'There it is again: "locket," exactly as it was seeded, and everything clicks into place.'],
      ['RAISE_CLOCK', 'The deadline tightens. They are running out of time before the fuse reaches its final hour.'],
      ['ADVANCE_THEME_ARGUMENT (VOICE A)', 'Loyalty? Not anymore.'],
      ['ADVANCE_THEME_ARGUMENT (VOICE B)', 'It was never as true as we thought.'],
      ['UPDATE_READER_STATE', 'A dangerous hush falls over the room, and something feels wrong.'],
      ['RECORD_VISUAL_FACT', 'A TORN PHOTOGRAPH ON THE FLOOR'],
      ['RECORD_SONIC_FACT', 'A FLOORBOARD CREAKS UPSTAIRS (SOUND)'],
    ];
    for (const [label, marker] of markers) {
      assert.ok(f.includes(marker), `missing marker text for ${label}: "${marker}"`);
    }
  });

  it('re-parsing the compiled fountain through analyzeFountainText round-trips without throwing', async () => {
    const { analyzeFountainText } = await import('../../server/nvm/analyze/fountain-analyzer.ts');
    const compiled = compileAll14();
    assert.doesNotThrow(() => analyzeFountainText(compiled.fountain));
  });
});
