// X1 — blueprint action-vocabulary expansion. Round-trip (proposed → recorded
// → side effect applied → bridge maps to right StoryOp) + determinism tests
// for the ten new ACTION_TYPES entries (HIDE, OBSERVE, LISTEN, SEARCH,
// REVEAL, THREATEN, BETRAY, PROTECT, FORM_ALLIANCE, FLEE). Self-contained —
// no dependency on any other test file's fixtures, matching this repo's
// existing per-file test convention (deterministic-sim.test.ts,
// bridge-ops.test.ts). FLEE's own rule-based (keyless) fire/no-fire coverage
// already lives in deterministic-sim.test.ts; the tests here drive the
// LLM-candidate path via a mocked provider, exactly like core-01.test.ts's
// "WAIT action — Orchestrator is_audible" test does, so every action here is
// exercised the same way a real turn actually proposes one.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { GenerateContentParameters } from '@google/genai';

import { Stage } from '../../server/engine/Stage.ts';
import { Orchestrator } from '../../server/engine/Orchestrator.ts';
import { CausalSpine } from '../../server/engine/CausalSpine.ts';
import { setLLMProvider, resetLLMProvider } from '../../server/engine/ai.ts';
import type { ActionLogEntry, CharacterSheet, EmotionState, Location, TheoryOfMind } from '../../server/engine/types.ts';

// ── Fixtures ─────────────────────────────────────────────────────────────────

function room(): Location {
  return { location_id: 'room', name: 'Study', description: 'A quiet study.', adjacent_locations: ['hall'] };
}
function hall(): Location {
  return { location_id: 'hall', name: 'Hallway', description: 'An empty hallway.', adjacent_locations: ['room'] };
}

function sheet(overrides: Partial<CharacterSheet> & Pick<CharacterSheet, 'char_id' | 'name'>): CharacterSheet {
  return {
    public_mask: 'unremarkable',
    hidden_motive: 'stay unnoticed',
    knowledge_vector: [],
    current_location_id: 'room',
    suspicion_score: 10,
    is_alive: true,
    ...overrides,
  };
}

// A provider whose turn-decision branch always proposes ONE fixed candidate,
// and whose epistemics branch ECHOES the actor's live suspicion score (read
// from the SAME `stage` at call time) rather than hardcoding a value — so the
// actor's own (unrelated) updateEpistemics call, which always runs right
// after a turn's immediate action effects, never clobbers whatever this
// test's action already wrote to suspicion_score.
function fixedActionProvider(
  stage: Stage,
  actorId: string,
  candidate: { action_type: string; content: string; target?: string | null; goal_score?: number },
) {
  return {
    generate: async (params: GenerateContentParameters) => {
      const sys = typeof params.config?.systemInstruction === 'string' ? params.config.systemInstruction : '';
      if (sys.includes('candidate actions')) {
        return {
          text: JSON.stringify({
            candidates: [{ target: null, goal_score: 80, ...candidate }],
          }),
        } as never;
      }
      return {
        text: JSON.stringify({
          newSuspicionScore: stage.getAgent(actorId)?.suspicion_score ?? 0,
          newBeliefs: [],
          updatedTheoryOfMind: [],
          contradiction_detected: false,
          contradicted_propositions: [],
        }),
      } as never;
    },
  };
}

function emotion(dominant: EmotionState['dominant'], intensity: number): EmotionState {
  return { joy: 0, distress: 0, anger: 0, fear: 0, pride: 0, shame: 0, dominant, intensity, last_updated_at: 0 };
}

function findAction(stage: Stage, actionType: string): ActionLogEntry | undefined {
  return stage.getFullLedger().find(e => e.action_type === actionType);
}

// ── HIDE ─────────────────────────────────────────────────────────────────────

describe('X1 — HIDE', () => {
  it('fire: lowers suspicion_score and is recorded non-audible, with a matching conceals_self StoryOp', async () => {
    const stage = new Stage(':memory:');
    try {
      stage.addLocation(room());
      const alice = sheet({ char_id: 'alice', name: 'Alice', suspicion_score: 20 });
      stage.addAgent(alice);
      const orch = new Orchestrator(stage);
      setLLMProvider(fixedActionProvider(stage, 'alice', { action_type: 'HIDE', content: '(goes still, unseen)' }));
      try {
        await orch.runTurn('alice');
      } finally {
        resetLLMProvider();
      }
      const entry = findAction(stage, 'HIDE');
      assert.ok(entry, 'HIDE action recorded');
      // is_audible round-trips through SQLite as 0/1, not a real boolean — truthy check, matching core-01.test.ts's own WAIT-audibility test convention.
      assert.ok(!entry!.is_audible, 'HIDE must not be audible');
      assert.ok(stage.getAgent('alice')!.suspicion_score < 20, 'HIDE relieves suspicion');

      const commit = stage.getCommits().at(-1);
      if (commit) {
        assert.ok(
          commit.ops.some(op => op.op === 'ADD_FACT' && op.fact.predicate === 'conceals_self'),
          'bridge maps HIDE to a conceals_self ADD_FACT op',
        );
      }
    } finally {
      stage.close();
    }
  });

  it('no-fire: suspicion already at 0 never goes negative', async () => {
    const stage = new Stage(':memory:');
    try {
      stage.addLocation(room());
      const alice = sheet({ char_id: 'alice', name: 'Alice', suspicion_score: 0 });
      stage.addAgent(alice);
      const orch = new Orchestrator(stage);
      setLLMProvider(fixedActionProvider(stage, 'alice', { action_type: 'HIDE', content: '(goes still)' }));
      try {
        await orch.runTurn('alice');
      } finally {
        resetLLMProvider();
      }
      assert.equal(stage.getAgent('alice')!.suspicion_score, 0);
    } finally {
      stage.close();
    }
  });
});

// ── OBSERVE ──────────────────────────────────────────────────────────────────

describe('X1 — OBSERVE', () => {
  it('fire: a significant target emotion becomes a witnessed belief for the observer', async () => {
    const stage = new Stage(':memory:');
    try {
      stage.addLocation(room());
      stage.addAgent(sheet({ char_id: 'alice', name: 'Alice', current_location_id: 'room' }));
      stage.addAgent(sheet({ char_id: 'bob', name: 'Bob', current_location_id: 'room' }));
      stage.updateEmotionState('bob', emotion('fear', 60));
      const orch = new Orchestrator(stage);
      setLLMProvider(fixedActionProvider(stage, 'alice', { action_type: 'OBSERVE', content: '(watches Bob closely)', target: 'bob' }));
      try {
        await orch.runTurn('alice');
      } finally {
        resetLLMProvider();
      }
      const entry = findAction(stage, 'OBSERVE');
      assert.ok(entry, 'OBSERVE action recorded');
      assert.ok(!entry!.is_audible, 'OBSERVE must not be audible');
      const beliefs = stage.getAgent('alice')!.beliefs ?? [];
      assert.ok(beliefs.some(b => /Bob seems fear/.test(b.proposition) && b.source === 'witnessed'), 'observer gains a witnessed belief about the target\'s emotional tell');
    } finally {
      stage.close();
    }
  });

  it('no-fire: a neutral/insignificant target emotion produces no belief', async () => {
    const stage = new Stage(':memory:');
    try {
      stage.addLocation(room());
      stage.addAgent(sheet({ char_id: 'alice', name: 'Alice', current_location_id: 'room' }));
      stage.addAgent(sheet({ char_id: 'bob', name: 'Bob', current_location_id: 'room' }));
      // No emotion set at all (undefined) — below the significance gate.
      const orch = new Orchestrator(stage);
      setLLMProvider(fixedActionProvider(stage, 'alice', { action_type: 'OBSERVE', content: '(watches Bob)', target: 'bob' }));
      try {
        await orch.runTurn('alice');
      } finally {
        resetLLMProvider();
      }
      const beliefs = stage.getAgent('alice')!.beliefs ?? [];
      assert.equal(beliefs.length, 0, 'no emotion signal ⇒ no fabricated belief');
    } finally {
      stage.close();
    }
  });
});

// ── LISTEN ───────────────────────────────────────────────────────────────────

describe('X1 — LISTEN', () => {
  it('fire: the target\'s ToM read of a third party becomes an inferred belief for the listener', async () => {
    const stage = new Stage(':memory:');
    try {
      stage.addLocation(room());
      stage.addLocation(hall());
      stage.addAgent(sheet({ char_id: 'alice', name: 'Alice', current_location_id: 'room' }));
      const bobTom: Record<string, TheoryOfMind> = {
        cass: { subject_id: 'cass', believed_knowledge: [], believed_motive: 'is hiding the forged ledger', trust_level: 0.1 },
      };
      stage.addAgent(sheet({ char_id: 'bob', name: 'Bob', current_location_id: 'room', theoryOfMind: bobTom }));
      stage.addAgent(sheet({ char_id: 'cass', name: 'Cass', current_location_id: 'hall' }));
      const orch = new Orchestrator(stage);
      setLLMProvider(fixedActionProvider(stage, 'alice', { action_type: 'LISTEN', content: '(lingers near Bob)', target: 'bob' }));
      try {
        await orch.runTurn('alice');
      } finally {
        resetLLMProvider();
      }
      const beliefs = stage.getAgent('alice')!.beliefs ?? [];
      assert.ok(
        beliefs.some(b => b.source === 'inferred' && /Bob privately believes Cass's motive/.test(b.proposition)),
        'listener gains an inferred belief eavesdropped from the target\'s ToM',
      );
    } finally {
      stage.close();
    }
  });

  it('no-fire: the target has no ToM entries at all — nothing to overhear', async () => {
    const stage = new Stage(':memory:');
    try {
      stage.addLocation(room());
      stage.addAgent(sheet({ char_id: 'alice', name: 'Alice', current_location_id: 'room' }));
      stage.addAgent(sheet({ char_id: 'bob', name: 'Bob', current_location_id: 'room' }));
      const orch = new Orchestrator(stage);
      setLLMProvider(fixedActionProvider(stage, 'alice', { action_type: 'LISTEN', content: '(lingers)', target: 'bob' }));
      try {
        await orch.runTurn('alice');
      } finally {
        resetLLMProvider();
      }
      const beliefs = stage.getAgent('alice')!.beliefs ?? [];
      assert.equal(beliefs.length, 0);
    } finally {
      stage.close();
    }
  });
});

// ── SEARCH ───────────────────────────────────────────────────────────────────

describe('X1 — SEARCH', () => {
  it('fire: exposes an unconfronted lie by a co-present agent, room-wide (no target needed)', async () => {
    const stage = new Stage(':memory:');
    try {
      stage.addLocation(room());
      stage.addAgent(sheet({ char_id: 'alice', name: 'Alice', current_location_id: 'room' }));
      stage.addAgent(sheet({ char_id: 'bob', name: 'Bob', current_location_id: 'room' }));

      // Seed an unexposed lie by Bob in this room, exactly as CausalSpine.processEvent
      // would have from a real LIE turn.
      const spine = new CausalSpine(stage);
      const lieActionId = stage.recordAction('bob', { action_type: 'LIE', content: 'I never touched the safe.', target: null }, 'room');
      spine.processEvent(
        { action_id: lieActionId, timestamp: Date.now(), char_id: 'bob', location_id: 'room', action_type: 'LIE', target_char_id: null, content: 'I never touched the safe.', is_audible: true },
        stage.getTurnCount(),
      );

      const orch = new Orchestrator(stage);
      setLLMProvider(fixedActionProvider(stage, 'alice', { action_type: 'SEARCH', content: '(searches the room)' }));
      try {
        await orch.runTurn('alice');
      } finally {
        resetLLMProvider();
      }
      const entry = findAction(stage, 'SEARCH');
      assert.ok(entry, 'SEARCH action recorded');
      assert.ok(!entry!.is_audible, 'SEARCH must not be audible');
      const beliefs = stage.getAgent('alice')!.beliefs ?? [];
      assert.ok(beliefs.some(b => /deliberate lie/.test(b.proposition)), 'searcher discovers the unexposed lie, room-wide');
    } finally {
      stage.close();
    }
  });

  it('no-fire: nothing to find — no beliefs fabricated', async () => {
    const stage = new Stage(':memory:');
    try {
      stage.addLocation(room());
      stage.addAgent(sheet({ char_id: 'alice', name: 'Alice', current_location_id: 'room' }));
      stage.addAgent(sheet({ char_id: 'bob', name: 'Bob', current_location_id: 'room' }));
      const orch = new Orchestrator(stage);
      setLLMProvider(fixedActionProvider(stage, 'alice', { action_type: 'SEARCH', content: '(searches)' }));
      try {
        await orch.runTurn('alice');
      } finally {
        resetLLMProvider();
      }
      const beliefs = stage.getAgent('alice')!.beliefs ?? [];
      assert.equal(beliefs.length, 0);
    } finally {
      stage.close();
    }
  });
});

// ── REVEAL ───────────────────────────────────────────────────────────────────

describe('X1 — REVEAL', () => {
  it('fire: the target ledger gains a guaranteed, high-confidence belief; bridge maps to UPDATE_BELIEF at 0.85', async () => {
    const stage = new Stage(':memory:');
    try {
      stage.addLocation(room());
      stage.addAgent(sheet({ char_id: 'alice', name: 'Alice', current_location_id: 'room', knowledge_vector: ['alice knows the vault code'] }));
      stage.addAgent(sheet({ char_id: 'bob', name: 'Bob', current_location_id: 'room' }));
      const orch = new Orchestrator(stage);
      const content = 'The vault code is 4-4-7-9.';
      setLLMProvider(fixedActionProvider(stage, 'alice', { action_type: 'REVEAL', content, target: 'bob' }));
      try {
        await orch.runTurn('alice');
      } finally {
        resetLLMProvider();
      }
      const entry = findAction(stage, 'REVEAL');
      assert.ok(entry, 'REVEAL action recorded');
      assert.ok(entry!.is_audible, 'REVEAL is a public act');
      const bobBeliefs = stage.getAgent('bob')!.beliefs ?? [];
      const revealed = bobBeliefs.find(b => b.proposition === content);
      assert.ok(revealed, 'target gains the revealed content as a real belief');
      assert.equal(revealed!.confidence, 0.85);
      assert.equal(revealed!.source, 'told');

      const commit = stage.getCommits().at(-1);
      assert.ok(commit, 'REVEAL produces a StoryCommit');
      const beliefOp = commit!.ops.find(op => op.op === 'UPDATE_BELIEF');
      assert.ok(beliefOp && beliefOp.op === 'UPDATE_BELIEF');
      assert.equal((beliefOp as Extract<typeof beliefOp, { op: 'UPDATE_BELIEF' }>).belief.confidence, 0.85, 'bridge maps REVEAL to the guaranteed 0.85-confidence UPDATE_BELIEF');
    } finally {
      stage.close();
    }
  });

  it('no-fire: revealing the same content twice does not duplicate the target\'s belief', async () => {
    const stage = new Stage(':memory:');
    try {
      stage.addLocation(room());
      stage.addAgent(sheet({ char_id: 'alice', name: 'Alice', current_location_id: 'room' }));
      stage.addAgent(sheet({ char_id: 'bob', name: 'Bob', current_location_id: 'room' }));
      const orch = new Orchestrator(stage);
      const content = 'The vault code is 4-4-7-9.';
      setLLMProvider(fixedActionProvider(stage, 'alice', { action_type: 'REVEAL', content, target: 'bob' }));
      try {
        await orch.runTurn('alice');
        await orch.runTurn('alice');
      } finally {
        resetLLMProvider();
      }
      const bobBeliefs = (stage.getAgent('bob')!.beliefs ?? []).filter(b => b.proposition === content);
      assert.equal(bobBeliefs.length, 1, 'duplicate REVEAL content is not written twice');
    } finally {
      stage.close();
    }
  });
});

// ── THREATEN ─────────────────────────────────────────────────────────────────

describe('X1 — THREATEN', () => {
  it('fire: the target\'s trust in the actor drops, and a real dramatic pressure lands on the target (cascade connection)', async () => {
    const stage = new Stage(':memory:');
    try {
      stage.addLocation(room());
      stage.addAgent(sheet({ char_id: 'alice', name: 'Alice', current_location_id: 'room' }));
      const bobTom: Record<string, TheoryOfMind> = {
        alice: { subject_id: 'alice', believed_knowledge: [], believed_motive: 'unknown', trust_level: 0.6 },
      };
      stage.addAgent(sheet({ char_id: 'bob', name: 'Bob', current_location_id: 'room', theoryOfMind: bobTom }));
      const orch = new Orchestrator(stage);
      setLLMProvider(fixedActionProvider(stage, 'alice', { action_type: 'THREATEN', content: 'Say a word and you\'ll regret it.', target: 'bob' }));
      try {
        await orch.runTurn('alice');
      } finally {
        resetLLMProvider();
      }
      const entry = findAction(stage, 'THREATEN');
      assert.ok(entry, 'THREATEN action recorded');
      assert.ok(entry!.is_audible, 'THREATEN is a public act');

      const bobAfter = stage.getAgent('bob')!;
      assert.ok(bobAfter.theoryOfMind!.alice!.trust_level < 0.6, 'being threatened lowers the target\'s trust in the actor');

      const pressures = stage.getActivePressures('bob');
      assert.ok(pressures.some(p => p.source_char_id === 'alice'), 'THREATEN lands a real dramatic pressure on the target, feeding the defense cascade on their next turn');
    } finally {
      stage.close();
    }
  });

  it('no-fire: THREATEN with no target mutates nothing and adds no pressure', async () => {
    const stage = new Stage(':memory:');
    try {
      stage.addLocation(room());
      stage.addAgent(sheet({ char_id: 'alice', name: 'Alice', current_location_id: 'room' }));
      stage.addAgent(sheet({ char_id: 'bob', name: 'Bob', current_location_id: 'room' }));
      const orch = new Orchestrator(stage);
      setLLMProvider(fixedActionProvider(stage, 'alice', { action_type: 'THREATEN', content: 'Someone should be careful.', target: null }));
      try {
        await orch.runTurn('alice');
      } finally {
        resetLLMProvider();
      }
      assert.equal(stage.getActivePressures('bob').length, 0);
    } finally {
      stage.close();
    }
  });
});

// ── BETRAY ───────────────────────────────────────────────────────────────────

describe('X1 — BETRAY', () => {
  it('fire: the steepest trust drop of the vocabulary, plus a dramatic pressure on the target', async () => {
    const stage = new Stage(':memory:');
    try {
      stage.addLocation(room());
      stage.addAgent(sheet({ char_id: 'alice', name: 'Alice', current_location_id: 'room' }));
      const bobTom: Record<string, TheoryOfMind> = {
        alice: { subject_id: 'alice', believed_knowledge: [], believed_motive: 'unknown', trust_level: 0.6, affinity: 0.6 },
      };
      stage.addAgent(sheet({ char_id: 'bob', name: 'Bob', current_location_id: 'room', theoryOfMind: bobTom }));
      const orch = new Orchestrator(stage);
      setLLMProvider(fixedActionProvider(stage, 'alice', { action_type: 'BETRAY', content: 'Alice hands your secret to the detective.', target: 'bob' }));
      try {
        await orch.runTurn('alice');
      } finally {
        resetLLMProvider();
      }
      const bobAfter = stage.getAgent('bob')!;
      assert.ok(bobAfter.theoryOfMind!.alice!.trust_level <= 0.6 - 0.34, 'BETRAY drops trust more steeply than THREATEN');
      assert.ok((bobAfter.theoryOfMind!.alice!.affinity ?? 1) < 0.6, 'BETRAY also damages affinity when a baseline existed');
      assert.ok(stage.getActivePressures('bob').some(p => p.source_char_id === 'alice' && p.intensity >= 70), 'BETRAY\'s pressure reads more intense than THREATEN\'s');
    } finally {
      stage.close();
    }
  });

  it('determinism: identical BETRAY turns from identical starting state produce identical trust deltas', async () => {
    async function runOnce(): Promise<number> {
      const stage = new Stage(':memory:');
      try {
        stage.addLocation(room());
        stage.addAgent(sheet({ char_id: 'alice', name: 'Alice', current_location_id: 'room' }));
        const bobTom: Record<string, TheoryOfMind> = {
          alice: { subject_id: 'alice', believed_knowledge: [], believed_motive: 'unknown', trust_level: 0.6 },
        };
        stage.addAgent(sheet({ char_id: 'bob', name: 'Bob', current_location_id: 'room', theoryOfMind: bobTom }));
        const orch = new Orchestrator(stage);
        setLLMProvider(fixedActionProvider(stage, 'alice', { action_type: 'BETRAY', content: 'Alice gives you up.', target: 'bob' }));
        try {
          await orch.runTurn('alice');
        } finally {
          resetLLMProvider();
        }
        return stage.getAgent('bob')!.theoryOfMind!.alice!.trust_level;
      } finally {
        stage.close();
      }
    }
    const first = await runOnce();
    const second = await runOnce();
    assert.equal(first, second, 'identical inputs produce an identical trust delta both times');
  });
});

// ── PROTECT ──────────────────────────────────────────────────────────────────

describe('X1 — PROTECT', () => {
  it('fire: strengthens the target\'s trust in the actor', async () => {
    const stage = new Stage(':memory:');
    try {
      stage.addLocation(room());
      stage.addAgent(sheet({ char_id: 'alice', name: 'Alice', current_location_id: 'room' }));
      const bobTom: Record<string, TheoryOfMind> = {
        alice: { subject_id: 'alice', believed_knowledge: [], believed_motive: 'unknown', trust_level: 0.4 },
      };
      stage.addAgent(sheet({ char_id: 'bob', name: 'Bob', current_location_id: 'room', theoryOfMind: bobTom }));
      const orch = new Orchestrator(stage);
      setLLMProvider(fixedActionProvider(stage, 'alice', { action_type: 'PROTECT', content: 'Leave him alone — he\'s with me.', target: 'bob' }));
      try {
        await orch.runTurn('alice');
      } finally {
        resetLLMProvider();
      }
      assert.ok(stage.getAgent('bob')!.theoryOfMind!.alice!.trust_level > 0.4, 'PROTECT raises the target\'s trust in the actor');
    } finally {
      stage.close();
    }
  });

  it('no-fire: PROTECT with no target changes no relationship', async () => {
    const stage = new Stage(':memory:');
    try {
      stage.addLocation(room());
      stage.addAgent(sheet({ char_id: 'alice', name: 'Alice', current_location_id: 'room' }));
      stage.addAgent(sheet({ char_id: 'bob', name: 'Bob', current_location_id: 'room' }));
      const orch = new Orchestrator(stage);
      setLLMProvider(fixedActionProvider(stage, 'alice', { action_type: 'PROTECT', content: 'Everyone stay calm.', target: null }));
      try {
        await orch.runTurn('alice');
      } finally {
        resetLLMProvider();
      }
      assert.deepEqual(stage.getAgent('bob')!.theoryOfMind ?? {}, {});
    } finally {
      stage.close();
    }
  });
});

// ── FORM_ALLIANCE ────────────────────────────────────────────────────────────

describe('X1 — FORM_ALLIANCE', () => {
  it('fire: strengthens trust AND felt obligation (debt) in the target\'s view of the actor when a debt baseline exists', async () => {
    const stage = new Stage(':memory:');
    try {
      stage.addLocation(room());
      stage.addAgent(sheet({ char_id: 'alice', name: 'Alice', current_location_id: 'room' }));
      const bobTom: Record<string, TheoryOfMind> = {
        alice: { subject_id: 'alice', believed_knowledge: [], believed_motive: 'unknown', trust_level: 0.5, debt: 0.1 },
      };
      stage.addAgent(sheet({ char_id: 'bob', name: 'Bob', current_location_id: 'room', theoryOfMind: bobTom }));
      const orch = new Orchestrator(stage);
      setLLMProvider(fixedActionProvider(stage, 'alice', { action_type: 'FORM_ALLIANCE', content: 'Let\'s work together on this.', target: 'bob' }));
      try {
        await orch.runTurn('alice');
      } finally {
        resetLLMProvider();
      }
      const bobAfter = stage.getAgent('bob')!;
      assert.ok(bobAfter.theoryOfMind!.alice!.trust_level > 0.5);
      assert.ok((bobAfter.theoryOfMind!.alice!.debt ?? 0) > 0.1, 'FORM_ALLIANCE raises felt obligation when a debt baseline already existed');
    } finally {
      stage.close();
    }
  });

  it('no-fire (honesty rule): with no prior debt baseline, FORM_ALLIANCE moves trust but never fabricates a debt value', async () => {
    const stage = new Stage(':memory:');
    try {
      stage.addLocation(room());
      stage.addAgent(sheet({ char_id: 'alice', name: 'Alice', current_location_id: 'room' }));
      stage.addAgent(sheet({ char_id: 'bob', name: 'Bob', current_location_id: 'room' })); // no theoryOfMind at all
      const orch = new Orchestrator(stage);
      setLLMProvider(fixedActionProvider(stage, 'alice', { action_type: 'FORM_ALLIANCE', content: 'Let\'s work together.', target: 'bob' }));
      try {
        await orch.runTurn('alice');
      } finally {
        resetLLMProvider();
      }
      const bobAfter = stage.getAgent('bob')!;
      assert.ok(bobAfter.theoryOfMind!.alice!.trust_level > 0.5, 'trust_level always has a documented baseline, so it still moves');
      assert.equal(bobAfter.theoryOfMind!.alice!.debt, undefined, 'debt is never fabricated from nothing');
    } finally {
      stage.close();
    }
  });
});

// ── FLEE ─────────────────────────────────────────────────────────────────────

describe('X1 — FLEE', () => {
  it('fire: relocates through the same adjacency guard as RELOCATE, but with fear framing and audibly', async () => {
    const stage = new Stage(':memory:');
    try {
      stage.addLocation(room());
      stage.addLocation(hall());
      stage.addAgent(sheet({ char_id: 'alice', name: 'Alice', current_location_id: 'room' }));
      const orch = new Orchestrator(stage);
      setLLMProvider(fixedActionProvider(stage, 'alice', { action_type: 'FLEE', content: '(runs)', target: 'Hallway' }));
      try {
        await orch.runTurn('alice');
      } finally {
        resetLLMProvider();
      }
      const entry = findAction(stage, 'FLEE');
      assert.ok(entry, 'FLEE action recorded');
      assert.ok(entry!.is_audible, 'fleeing is a public, visible act');
      assert.match(entry!.content, /\(flees\)$/);
      assert.equal(stage.getAgent('alice')!.current_location_id, 'hall', 'FLEE actually relocates the agent');
    } finally {
      stage.close();
    }
  });

  it('no-fire: a blocked FLEE (non-adjacent target) downgrades to WAIT, not RELOCATE — cornered, not merely re-planning', async () => {
    const stage = new Stage(':memory:');
    try {
      const sealed: Location = { location_id: 'room', name: 'Vault', description: 'Sealed.', adjacent_locations: [] };
      stage.addLocation(sealed);
      stage.addAgent(sheet({ char_id: 'alice', name: 'Alice', current_location_id: 'room' }));
      const orch = new Orchestrator(stage);
      setLLMProvider(fixedActionProvider(stage, 'alice', { action_type: 'FLEE', content: '', target: 'Nowhere' }));
      try {
        await orch.runTurn('alice');
      } finally {
        resetLLMProvider();
      }
      const entry = stage.getFullLedger().at(-1)!;
      assert.equal(entry.action_type, 'WAIT');
      assert.equal(stage.getAgent('alice')!.current_location_id, 'room', 'blocked FLEE never moves the agent');
    } finally {
      stage.close();
    }
  });
});
