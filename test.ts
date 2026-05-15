import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { safeJsonParse } from './src/lib/json.ts';

describe('safeJsonParse', () => {
  it('returns parsed value for valid JSON object', () => {
    assert.deepEqual(safeJsonParse('{"a":1,"b":"hello"}', {}), { a: 1, b: 'hello' });
  });

  it('returns parsed value for valid JSON array', () => {
    assert.deepEqual(safeJsonParse('[1,2,3]', []), [1, 2, 3]);
  });

  it('returns fallback for invalid JSON', () => {
    assert.equal(safeJsonParse('not valid json {{', 42), 42);
  });

  it('returns fallback for null input', () => {
    assert.equal(safeJsonParse(null, 'default'), 'default');
  });

  it('returns fallback for empty string', () => {
    assert.equal(safeJsonParse('', 99), 99);
  });

  it('preserves fallback type for array fallback', () => {
    const result = safeJsonParse<string[]>('invalid', []);
    assert.ok(Array.isArray(result));
    assert.equal(result.length, 0);
  });

  it('preserves fallback type for null fallback', () => {
    const result = safeJsonParse<Record<string, number> | null>('{bad}', null);
    assert.equal(result, null);
  });

  it('handles nested objects', () => {
    const input = '{"outer":{"inner":true}}';
    const result = safeJsonParse<{ outer: { inner: boolean } }>(input, { outer: { inner: false } });
    assert.equal(result.outer.inner, true);
  });
});

describe('Fountain script block parsing (regex patterns)', () => {
  const isSceneHeading = (line: string) => /^(INT\.|EXT\.|INT\/EXT\.)/i.test(line);
  const isCharacter    = (line: string) => /^[A-Z\s]+(\(V\.O\.\)|\(O\.S\.\))?$/.test(line) && line.trim().length > 0;
  const isTransition   = (line: string) => /^(CUT TO:|FADE OUT\.|FADE IN:)/i.test(line);
  const isParenthetical= (line: string) => /^\(.*\)$/.test(line);

  it('detects INT. scene heading', () => {
    assert.ok(isSceneHeading('INT. THE STUDY - NIGHT'));
  });

  it('detects EXT. scene heading', () => {
    assert.ok(isSceneHeading('EXT. CITY ROOFTOP - DAY'));
  });

  it('detects INT/EXT. scene heading', () => {
    assert.ok(isSceneHeading('INT/EXT. MOVING CAR - CONTINUOUS'));
  });

  it('does not mis-classify action as scene heading', () => {
    assert.ok(!isSceneHeading('He walks into the room.'));
  });

  it('detects ALL CAPS character name', () => {
    assert.ok(isCharacter('DETECTIVE VANCE'));
  });

  it('detects V.O. character name', () => {
    assert.ok(isCharacter('ELEANOR (V.O.)'));
  });

  it('does not classify mixed-case as character', () => {
    assert.ok(!isCharacter('He turns slowly.'));
  });

  it('detects CUT TO: transition', () => {
    assert.ok(isTransition('CUT TO:'));
  });

  it('detects FADE OUT. transition', () => {
    assert.ok(isTransition('FADE OUT.'));
  });

  it('detects parenthetical', () => {
    assert.ok(isParenthetical('(quietly)'));
    assert.ok(isParenthetical('(beat)'));
  });

  it('does not classify non-parenthetical as parenthetical', () => {
    assert.ok(!isParenthetical('She smiles.'));
  });
});

// ── Causal-Epistemic Spine — one-lie vertical slice ──────────────────────────
// Alice lies to Bob. Bob finds contradictory evidence.
// Verifies: EventCard, sourced beliefs, BeliefEdge, GoalMutation,
//           DramaticPressure, BeatTrace, and Fountain [[BEAT:...]] output.

import { Stage } from './server/engine/Stage.ts';
import { CausalSpine } from './server/engine/CausalSpine.ts';
import { transcriptToFountain } from './server/lib/fountain.ts';
import type { ActionLogEntry, Belief, CharacterSheet, Location } from './server/engine/types.ts';

function makeStage(): Stage {
  const stage = new Stage(':memory:');
  const loc: Location = {
    location_id: 'room1',
    name: 'The Study',
    description: 'A dusty room.',
    adjacent_locations: [],
  };
  stage.addLocation(loc);

  const alice: CharacterSheet = {
    char_id: 'alice',
    name: 'Alice',
    public_mask: 'Librarian',
    hidden_motive: 'Steal the ledger',
    knowledge_vector: [],
    current_location_id: 'room1',
    suspicion_score: 10,
    is_alive: true,
    goalStack: {
      terminal: { id: 'g0', description: 'Get the ledger', value: 100, achieved: false },
      instrumental: [{ id: 'g1', description: 'Keep Bob distracted', value: 70, achieved: false }],
      last_planned_at: 0,
    },
  };

  const bob: CharacterSheet = {
    char_id: 'bob',
    name: 'Bob',
    public_mask: 'Detective',
    hidden_motive: 'Expose the thief',
    knowledge_vector: [],
    current_location_id: 'room1',
    suspicion_score: 5,
    is_alive: true,
    goalStack: {
      terminal: { id: 'g2', description: 'Identify the thief', value: 100, achieved: false },
      instrumental: [{ id: 'g3', description: 'Gather evidence', value: 60, achieved: false }],
      last_planned_at: 0,
    },
  };

  stage.addAgent(alice);
  stage.addAgent(bob);
  return stage;
}

describe('CausalSpine — EventCard creation', () => {
  it('creates EventCard with LIE proposition (is_lie=true)', () => {
    const stage = makeStage();
    const spine = new CausalSpine(stage);

    const lieEntry: ActionLogEntry = {
      action_id: 'evt-lie-1',
      timestamp: 1000,
      char_id: 'alice',
      location_id: 'room1',
      action_type: 'LIE',
      target_char_id: 'bob',
      content: 'I was home all night reading.',
      is_audible: true,
    };

    const card = spine.processEvent(lieEntry, 1);
    assert.equal(card.event_id, 'evt-lie-1');
    assert.equal(card.action_type, 'LIE');
    assert.equal(card.propositions.length, 1);
    assert.equal(card.propositions[0].is_lie, true);
    assert.equal(card.propositions[0].asserted_by, 'alice');
    assert.equal(card.propositions[0].perceived_truth, true);

    // Verify persisted to DB
    const props = stage.getEventPropositions('evt-lie-1');
    assert.equal(props.length, 1);
    assert.equal(props[0].is_lie, true);
  });

  it('creates EventCard with SPEAK proposition (is_lie=false)', () => {
    const stage = makeStage();
    const spine = new CausalSpine(stage);

    const speakEntry: ActionLogEntry = {
      action_id: 'evt-speak-1',
      timestamp: 1001,
      char_id: 'bob',
      location_id: 'room1',
      action_type: 'SPEAK',
      target_char_id: null,
      content: 'The ledger was on the desk this morning.',
      is_audible: true,
    };

    const card = spine.processEvent(speakEntry, 2);
    assert.equal(card.propositions.length, 1);
    assert.equal(card.propositions[0].is_lie, false);
    assert.equal(card.propositions[0].content, 'The ledger was on the desk this morning.');
  });

  it('creates no propositions for RELOCATE', () => {
    const stage = makeStage();
    const spine = new CausalSpine(stage);

    const relocateEntry: ActionLogEntry = {
      action_id: 'evt-rel-1',
      timestamp: 1002,
      char_id: 'alice',
      location_id: 'room1',
      action_type: 'RELOCATE',
      target_char_id: null,
      content: 'The Conservatory',
      is_audible: true,
    };

    const card = spine.processEvent(relocateEntry, 3);
    assert.equal(card.propositions.length, 0);
    const props = stage.getEventPropositions('evt-rel-1');
    assert.equal(props.length, 0);
  });
});

describe('CausalSpine — BeliefEdge on contradiction', () => {
  it('creates contradiction edge when new belief conflicts with told belief from Alice', () => {
    const stage = makeStage();
    const spine = new CausalSpine(stage);

    // Alice's lie creates a belief in Bob's graph (source_agent_id=alice)
    const liedBelief: Belief = {
      id: 'b-alice-lie',
      proposition: 'Alice was home all night reading',
      confidence: 0.7,
      source: 'told',
      source_agent_id: 'alice',
      source_event_id: 'evt-lie-1',
      acquired_at: 1,
    };

    // Bob examines evidence that contradicts Alice's story
    const witnessedBelief: Belief = {
      id: 'b-bob-witness',
      proposition: 'Alice was at the library at midnight, not at home',
      confidence: 0.9,
      source: 'witnessed',
      source_event_id: 'evt-examine-1',
      acquired_at: 2,
    };

    // Pre-populate Bob's beliefs with the told belief
    stage.updateAgentBeliefs('bob', [liedBelief]);

    // Now process: Bob gets a new witnessed belief that contradicts
    stage.updateAgentBeliefs('bob', [liedBelief, witnessedBelief]);

    const edges = spine.processBeliefUpdate(
      'bob',
      [witnessedBelief],
      'evt-examine-1',
      true,
      ['Alice was home all night reading'],
    );

    assert.ok(edges.length >= 1, 'Should create at least one contradiction edge');
    const edge = edges[0];
    assert.equal(edge.edge_type, 'contradicts');
    assert.equal(edge.from_belief_id, 'b-alice-lie');
    assert.equal(edge.to_belief_id, 'b-bob-witness');
    assert.equal(edge.discovered_by, 'bob');
    assert.equal(edge.source_event_id, 'evt-examine-1');

    // Verify edge persisted
    const stored = stage.getAllBeliefEdges();
    assert.ok(stored.some(e => e.edge_id === edge.edge_id));

    // Verify Belief.contradicts[] was updated
    const bobAfter = stage.getAgent('bob');
    const lieBelief = bobAfter?.beliefs?.find(b => b.id === 'b-alice-lie');
    assert.ok(lieBelief?.contradicts?.includes('b-bob-witness'), 'from-belief should list to-belief in contradicts[]');
  });

  it('returns empty edges when no contradiction detected', () => {
    const stage = makeStage();
    const spine = new CausalSpine(stage);

    const newBelief: Belief = {
      id: 'b-new',
      proposition: 'The window was open',
      confidence: 0.8,
      source: 'witnessed',
      acquired_at: 1,
    };

    const edges = spine.processBeliefUpdate('bob', [newBelief], 'evt-1', false, []);
    assert.equal(edges.length, 0);
  });
});

describe('CausalSpine — GoalMutation and DramaticPressure', () => {
  it('creates confrontation subgoal for Bob and pressure on both agents', () => {
    const stage = makeStage();
    const spine = new CausalSpine(stage);

    // Give Bob a belief sourced from Alice so the spine can identify the suspect
    const liedBelief: Belief = {
      id: 'b-alice-lie',
      proposition: 'Alice was home all night reading',
      confidence: 0.7,
      source: 'told',
      source_agent_id: 'alice',
      source_event_id: 'evt-lie-1',
      acquired_at: 1,
    };
    const witnessedBelief: Belief = {
      id: 'b-bob-witness',
      proposition: 'Alice was at the library at midnight',
      confidence: 0.9,
      source: 'witnessed',
      source_event_id: 'evt-examine-1',
      acquired_at: 2,
    };
    stage.updateAgentBeliefs('bob', [
      { ...liedBelief, contradicts: ['b-bob-witness'] },
      witnessedBelief,
    ]);

    const edge = {
      edge_id: 'edge-1',
      from_belief_id: 'b-alice-lie',
      to_belief_id: 'b-bob-witness',
      edge_type: 'contradicts' as const,
      discovered_by: 'bob',
      source_event_id: 'evt-examine-1',
      turn_index: 2,
    };

    const { mutations, pressures } = spine.processContradiction('bob', [edge], 'evt-examine-1');

    // Bob should get a confrontation subgoal
    assert.ok(mutations.length >= 1, 'Should create at least one goal mutation');
    assert.equal(mutations[0].char_id, 'bob');
    assert.equal(mutations[0].mutation_type, 'subgoal_added');
    assert.ok(mutations[0].new_subgoal?.toLowerCase().includes('confront'));

    // Bob's goal stack should have the new subgoal at the front
    const bobUpdated = stage.getAgent('bob');
    assert.ok(bobUpdated?.goalStack?.instrumental[0].description.toLowerCase().includes('confront'));

    // Should have pressure on Alice (confrontation_imminent)
    const alicePressure = pressures.find(p => p.target_char_id === 'alice');
    assert.ok(alicePressure, 'Alice should have confrontation_imminent pressure');
    assert.equal(alicePressure?.pressure_type, 'confrontation_imminent');
    assert.ok(alicePressure!.intensity > 0);
    assert.equal(alicePressure!.applied, false);

    // Should have pressure on Bob (evidence_against)
    const bobPressure = pressures.find(p => p.target_char_id === 'bob');
    assert.ok(bobPressure, 'Bob should have evidence_against pressure');
    assert.equal(bobPressure?.pressure_type, 'evidence_against');

    // Verify persisted
    const storedMutations = stage.getGoalMutations('bob');
    assert.ok(storedMutations.length >= 1);

    const activePressures = stage.getActivePressures('alice');
    assert.ok(activePressures.length >= 1);
    assert.equal(activePressures[0].applied, false);
  });

  it('marks pressure applied and excludes it from active set', () => {
    const stage = makeStage();
    const spine = new CausalSpine(stage);

    // Set up a contradiction so pressure exists
    const liedBelief: Belief = {
      id: 'b-lie', proposition: 'All fine', confidence: 0.7,
      source: 'told', source_agent_id: 'alice', source_event_id: 'e1', acquired_at: 1,
    };
    const witnessedBelief: Belief = {
      id: 'b-wit', proposition: 'Clearly not fine at all last night',
      confidence: 0.9, source: 'witnessed', source_event_id: 'e2', acquired_at: 2,
    };
    stage.updateAgentBeliefs('bob', [{ ...liedBelief, contradicts: ['b-wit'] }, witnessedBelief]);
    const edge = {
      edge_id: 'e-1', from_belief_id: 'b-lie', to_belief_id: 'b-wit',
      edge_type: 'contradicts' as const, discovered_by: 'bob', source_event_id: 'e2', turn_index: 2,
    };

    const { pressures } = spine.processContradiction('bob', [edge], 'e2');
    const alicePressure = pressures.find(p => p.target_char_id === 'alice')!;
    assert.ok(alicePressure);

    // Mark applied
    stage.markPressureApplied(alicePressure.pressure_id);

    // Should no longer appear in active
    const active = stage.getActivePressures('alice');
    assert.ok(!active.some(p => p.pressure_id === alicePressure.pressure_id));
  });
});

describe('CausalSpine — BeatTrace', () => {
  it('creates and retrieves a BeatTrace', () => {
    const stage = makeStage();
    const spine = new CausalSpine(stage);

    const trace = spine.createBeatTrace({
      triggerEventId: 'evt-lie-1',
      beatType: 'contradiction_discovered',
      participants: ['alice', 'bob'],
      causalChain: ['evt-lie-1', 'evt-examine-1'],
      locationId: 'room1',
      narrativeSummary: 'Bob discovers Alice lied about her whereabouts.',
      fountainHint: 'BOB pauses — something doesn\'t add up. He glances at the window.',
    });

    assert.ok(trace.beat_id);
    assert.equal(trace.beat_type, 'contradiction_discovered');
    assert.deepEqual(trace.participants, ['alice', 'bob']);
    assert.equal(trace.causal_chain.length, 2);

    const all = stage.getAllBeatTraces();
    assert.ok(all.some(t => t.beat_id === trace.beat_id));

    const byLoc = stage.getBeatTracesForLocation('room1');
    assert.ok(byLoc.some(t => t.beat_id === trace.beat_id));

    const byOther = stage.getBeatTracesForLocation('other-room');
    assert.equal(byOther.length, 0);
  });
});

describe('Fountain export — BeatTrace integration', () => {
  it('includes [[BEAT (contradiction_discovered): ...]] note before the triggering action', () => {
    const agents: CharacterSheet[] = [
      {
        char_id: 'alice', name: 'Alice', public_mask: '', hidden_motive: '',
        knowledge_vector: [], current_location_id: 'room1', suspicion_score: 0, is_alive: true,
      },
      {
        char_id: 'bob', name: 'Bob', public_mask: '', hidden_motive: '',
        knowledge_vector: [], current_location_id: 'room1', suspicion_score: 0, is_alive: true,
      },
    ];
    const locations: Location[] = [
      { location_id: 'room1', name: 'The Study', description: '', adjacent_locations: [] },
    ];
    const log: ActionLogEntry[] = [
      {
        action_id: 'evt-lie-1',
        timestamp: 1000,
        char_id: 'alice',
        location_id: 'room1',
        action_type: 'LIE',
        target_char_id: 'bob',
        content: 'I was home all night.',
        is_audible: true,
      },
      {
        action_id: 'evt-examine-1',
        timestamp: 1001,
        char_id: 'bob',
        location_id: 'room1',
        action_type: 'EXAMINE',
        target_char_id: null,
        content: 'Finds a ticket stub proving Alice was at the theatre.',
        is_audible: false,
      },
    ];
    const beatTraces = [
      {
        beat_id: 'bt-1',
        turn_index: 2,
        location_id: 'room1',
        trigger_event_id: 'evt-examine-1',
        beat_type: 'contradiction_discovered' as const,
        participants: ['bob', 'alice'],
        causal_chain: ['evt-lie-1', 'evt-examine-1'],
        narrative_summary: 'Bob discovers Alice lied.',
        fountain_hint: "BOB pauses — something doesn't add up. The air changes.",
      },
    ];

    const output = transcriptToFountain(log, agents, locations, undefined, beatTraces);

    assert.ok(output.includes('[[BEAT (contradiction_discovered):'), 'Should include BEAT note');
    assert.ok(output.includes("BOB pauses"), 'Should include fountain_hint text');
    // Beat note should appear before the EXAMINE action content
    const beatIdx = output.indexOf('[[BEAT');
    const examineIdx = output.indexOf('Finds a ticket stub');
    assert.ok(beatIdx < examineIdx, 'BEAT note should come before the action content');
  });

  it('produces valid Fountain when no beat traces provided', () => {
    const agents: CharacterSheet[] = [
      {
        char_id: 'alice', name: 'Alice', public_mask: '', hidden_motive: '',
        knowledge_vector: [], current_location_id: 'room1', suspicion_score: 0, is_alive: true,
      },
    ];
    const locations: Location[] = [
      { location_id: 'room1', name: 'The Study', description: '', adjacent_locations: [] },
    ];
    const log: ActionLogEntry[] = [
      {
        action_id: 'e1', timestamp: 1000, char_id: 'alice', location_id: 'room1',
        action_type: 'SPEAK', target_char_id: null, content: 'Hello.', is_audible: true,
      },
    ];

    const output = transcriptToFountain(log, agents, locations);
    assert.ok(output.includes('ALICE'));
    assert.ok(output.includes('Hello.'));
    assert.ok(!output.includes('[[BEAT'));
  });
});

describe('Stage — spine table isolation', () => {
  it('belief edges are empty on a fresh stage', () => {
    const stage = makeStage();
    assert.equal(stage.getAllBeliefEdges().length, 0);
  });

  it('goal mutations are empty on a fresh stage', () => {
    const stage = makeStage();
    assert.equal(stage.getGoalMutations('bob').length, 0);
  });

  it('active pressures are empty on a fresh stage', () => {
    const stage = makeStage();
    assert.equal(stage.getActivePressures('alice').length, 0);
  });

  it('recordAction returns a valid UUID', () => {
    const stage = makeStage();
    const action_id = stage.recordAction('alice', {
      action_type: 'SPEAK', content: 'Hello.', target: null,
    }, 'room1');
    assert.match(action_id, /^[0-9a-f-]{36}$/);
  });
});
