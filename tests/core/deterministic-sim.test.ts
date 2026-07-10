// Run 13 — keyless deterministic simulation.
// Unit tests for server/engine/agent/deterministic.ts (composeDeterministicAction,
// buildDeterministicEpistemics) plus a thin Agent-level check that the
// `deterministic` flag actually reaches takeTurn()/updateEpistemics() output
// when running with no LLM provider (this sandbox has no GEMINI_API_KEY set,
// so ai.ts's default geminiProvider throws and every call site's own .catch
// resolves to null — exactly the "keyless" path this run implements a
// fallback for). HTTP/route-level, end-to-end proof (ledger entry + a real
// StoryCommit with ops, and a before/after belief-movement check across a
// keyless run-room) lives in tests/routes/game-fixes.test.ts.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  composeDeterministicAction,
  buildDeterministicEpistemics,
} from '../../server/engine/agent/deterministic.ts';
import { Stage } from '../../server/engine/Stage.ts';
import { Agent } from '../../server/engine/Agent.ts';
import { resetLLMProvider } from '../../server/engine/ai.ts';
import type { ActionLogEntry, CharacterSheet, DramaticPressure, EmotionState, Location } from '../../server/engine/types.ts';

// ── Fixtures ─────────────────────────────────────────────────────────────────

function baseAgent(overrides: Partial<CharacterSheet> = {}): CharacterSheet {
  return {
    char_id: 'a1',
    name: 'Nora',
    public_mask: 'A composed art dealer.',
    hidden_motive: 'Protect the forged painting.',
    knowledge_vector: [],
    current_location_id: 'room-a',
    suspicion_score: 10,
    is_alive: true,
    goalStack: {
      terminal: { id: 'g0', description: 'clear her name', value: 90, achieved: false },
      instrumental: [{ id: 'g1', description: 'find out who forged the painting', value: 70, achieved: false }],
      last_planned_at: 0,
    },
    ...overrides,
  };
}

function otherAgent(overrides: Partial<CharacterSheet> = {}): CharacterSheet {
  return {
    char_id: 'a2',
    name: 'Bob',
    public_mask: 'A nervous curator.',
    hidden_motive: 'Cover his tracks.',
    knowledge_vector: [],
    current_location_id: 'room-a',
    suspicion_score: 5,
    is_alive: true,
    ...overrides,
  };
}

function emotion(dominant: EmotionState['dominant'], intensity: number): EmotionState {
  return { joy: 0, distress: 0, anger: 0, fear: 0, pride: 0, shame: 0, dominant, intensity, last_updated_at: 0 };
}

function makeStageWithExits(): Stage {
  const stage = new Stage(':memory:');
  const roomA: Location = { location_id: 'room-a', name: 'Gallery', description: 'A quiet gallery.', adjacent_locations: ['room-b'] };
  const roomB: Location = { location_id: 'room-b', name: 'Hallway', description: 'An empty hallway.', adjacent_locations: ['room-a'] };
  stage.addLocation(roomA);
  stage.addLocation(roomB);
  return stage;
}

function entry(overrides: Partial<ActionLogEntry> = {}): ActionLogEntry {
  return {
    action_id: 'act-1',
    timestamp: Date.now(),
    char_id: 'a2',
    location_id: 'room-a',
    action_type: 'SPEAK',
    target_char_id: null,
    content: 'Nothing unusual to report.',
    is_audible: true,
    ...overrides,
  };
}

// ── composeDeterministicAction ───────────────────────────────────────────────

describe('agent/deterministic — composeDeterministicAction', () => {
  it('goal-voiced default: no defense/deception/flight trigger — SPEAKs the live ready goal', () => {
    const stage = makeStageWithExits();
    try {
      const sheet = baseAgent(); // secure attachment (default), no darkTriad extremes, no active defense
      const node = stage.getLocation('room-a')!;
      const action = composeDeterministicAction(sheet, stage, node, [otherAgent()]);
      assert.equal(action.action_type, 'SPEAK');
      assert.equal(action.deterministic, true);
      assert.match(action.content, /find out who forged the painting/);
    } finally {
      stage.close();
    }
  });

  it('defense coloring: an active denial defense colors the line instead of plain goal-voicing (fire)', () => {
    const stage = makeStageWithExits();
    try {
      const sheet = baseAgent({
        defenseMechanisms: ['denial'],
        emotionState: emotion('shame', 60), // selectActiveDefense's shame->[denial,...] preference map
      });
      const node = stage.getLocation('room-a')!;
      const action = composeDeterministicAction(sheet, stage, node, [otherAgent()]);
      assert.equal(action.action_type, 'SPEAK');
      assert.match(action.content, /not true/i);
      assert.ok(!/find out who forged the painting/.test(action.content), 'denial line replaces plain goal-voicing');
    } finally {
      stage.close();
    }
  });

  it('defense coloring (no-fire): low-intensity emotion means selectActiveDefense stays inactive, so the plain goal line is used', () => {
    const stage = makeStageWithExits();
    try {
      const sheet = baseAgent({
        defenseMechanisms: ['denial'],
        emotionState: emotion('shame', 5), // below selectActiveDefense's intensity>=30 gate
      });
      const node = stage.getLocation('room-a')!;
      const action = composeDeterministicAction(sheet, stage, node, [otherAgent()]);
      assert.match(action.content, /find out who forged the painting/);
    } finally {
      stage.close();
    }
  });

  it('flight (fire): avoidant + suspicion>40 + a real exit — RELOCATEs to the adjacent location', () => {
    const stage = makeStageWithExits();
    try {
      const sheet = baseAgent({ attachmentStyle: 'avoidant', suspicion_score: 60 });
      const node = stage.getLocation('room-a')!;
      const action = composeDeterministicAction(sheet, stage, node, [otherAgent()]);
      assert.equal(action.action_type, 'RELOCATE');
      assert.equal(action.target, 'Hallway');
      assert.equal(action.deterministic, true);
    } finally {
      stage.close();
    }
  });

  it('flight (no-fire): identical suspicion/exit but secure attachment — stays and SPEAKs', () => {
    const stage = makeStageWithExits();
    try {
      const sheet = baseAgent({ attachmentStyle: 'secure', suspicion_score: 60 });
      const node = stage.getLocation('room-a')!;
      const action = composeDeterministicAction(sheet, stage, node, [otherAgent()]);
      assert.notEqual(action.action_type, 'RELOCATE');
    } finally {
      stage.close();
    }
  });

  it('deception (fire): high machiavellianism with a live addressee — LIEs rather than SPEAKs plainly', () => {
    const stage = makeStageWithExits();
    try {
      const sheet = baseAgent({ darkTriad: { machiavellianism: 85, narcissism: 50, psychopathy: 40 } });
      const node = stage.getLocation('room-a')!;
      const target = otherAgent();
      const action = composeDeterministicAction(sheet, stage, node, [target]);
      assert.equal(action.action_type, 'LIE');
      assert.equal(action.target, target.char_id);
    } finally {
      stage.close();
    }
  });

  it('deception (no-fire): low machiavellianism/psychopathy — never LIEs', () => {
    const stage = makeStageWithExits();
    try {
      const sheet = baseAgent({ darkTriad: { machiavellianism: 20, narcissism: 50, psychopathy: 10 } });
      const node = stage.getLocation('room-a')!;
      const action = composeDeterministicAction(sheet, stage, node, [otherAgent()]);
      assert.notEqual(action.action_type, 'LIE');
    } finally {
      stage.close();
    }
  });

  it('determinism: calling twice on identical state yields byte-identical actions', () => {
    const stage = makeStageWithExits();
    try {
      const sheet = baseAgent({ darkTriad: { machiavellianism: 85, narcissism: 50, psychopathy: 40 } });
      const node = stage.getLocation('room-a')!;
      const others = [otherAgent(), otherAgent({ char_id: 'a3', name: 'Cass' })];
      const first = composeDeterministicAction(sheet, stage, node, others);
      const second = composeDeterministicAction(sheet, stage, node, others);
      assert.deepEqual(first, second);
    } finally {
      stage.close();
    }
  });
});

// ── Cascade + trinity integration (I1-b) ─────────────────────────────────────
// composeDeterministicAction now arbitrates its legacy priority tiers through
// the same computeDefenseCascadeState / arbitrateTrinity layers decision.ts
// applies to LLM candidates (cascadeActionBias × trinityActionBias over the
// candidate scores). Fire tests below drive a real cascade state via live
// engine signals (emotion fear/distress fields + dramatic pressure + ToM
// power_balance — exactly what deriveCascadeInputs reads); the byte-stability
// block pins that at baseline ('arousal': calm emotion, no pressure) output
// is IDENTICAL to the pre-integration composer, literal string for literal
// string.

// EmotionState with the component field set (deriveCascadeInputs reads
// es.fear/es.distress, not just dominant/intensity — the emotion() helper
// above leaves components at 0).
function fearEmotion(fear: number): EmotionState {
  return { joy: 0, distress: 0, anger: 0, fear, pride: 0, shame: 0, dominant: 'fear', intensity: fear, last_updated_at: 0 };
}

function pressure(overrides: Partial<DramaticPressure> = {}): DramaticPressure {
  return {
    pressure_id: 'p1',
    target_char_id: 'a1',
    trigger_event_id: 'evt-1',
    pressure_type: 'CONFRONT',
    intensity: 90,
    bias_hint: 'You are being confronted directly.',
    expires_at_turn: 10,
    applied: false,
    ...overrides,
  };
}

describe('agent/deterministic — cascade + trinity arbitration of the keyless composer', () => {
  it('freeze (fire): a frozen character no longer selects the bold deceptive/confrontational action', () => {
    const stage = makeStageWithExits();
    try {
      // Deceptive traits that — calm — select LIE (pinned by the legacy
      // deception fire test above). Under a sudden, high-intensity threat
      // (fresh pressure ⇒ suddenness 90; fear 80 ⇒ threatLevel 80; suspicion
      // 10 ⇒ exposureTurns 0, inside the first-instant freeze window) the
      // cascade reads FREEZE and its ×0.40 LIE / ×1.5 WAIT bias must flip the
      // selection away from the confrontational move.
      const sheet = baseAgent({
        darkTriad: { machiavellianism: 85, narcissism: 50, psychopathy: 40 },
        emotionState: fearEmotion(80),
      });
      stage.addAgent(sheet); // Dramatic_Pressure.target_char_id has an FK to Characters
      stage.addDramaticPressure(pressure());
      const node = stage.getLocation('room-a')!;
      const action = composeDeterministicAction(sheet, stage, node, [otherAgent()]);
      assert.notEqual(action.action_type, 'LIE', 'frozen character must not produce the bold deceptive action');
      assert.equal(action.action_type, 'WAIT');
      assert.equal(action.deterministic, true);
      assert.match(action.content, /I— no\.|I need a second/, 'freeze WAIT line uses the fragmented, halting phrasing');
    } finally {
      stage.close();
    }
  });

  it('freeze (no-fire): the same deceptive character WITHOUT the sudden threat still selects LIE', () => {
    const stage = makeStageWithExits();
    try {
      const sheet = baseAgent({ darkTriad: { machiavellianism: 85, narcissism: 50, psychopathy: 40 } });
      const node = stage.getLocation('room-a')!;
      const action = composeDeterministicAction(sheet, stage, node, [otherAgent()]);
      assert.equal(action.action_type, 'LIE');
    } finally {
      stage.close();
    }
  });

  it('fawn (fire): social threat from a dominant party skews the composed line to appeasement/submission', () => {
    const stage = makeStageWithExits();
    try {
      // fear 65 ⇒ threat past activation; suspicion 45 ⇒ exposureTurns 2 (past
      // the freeze window); pressure WITH source_char_id + Bob present ⇒
      // socialThreat; ToM power_balance 0.1 ⇒ powerDifferential -80 ⇒ FAWN.
      const sheet = baseAgent({
        suspicion_score: 45,
        emotionState: fearEmotion(65),
        theoryOfMind: {
          a2: { subject_id: 'a2', believed_knowledge: [], believed_motive: 'unknown', trust_level: 0.4, power_balance: 0.1 },
        },
      });
      stage.addAgent(sheet); // FK: pressure target must exist in Characters
      stage.addDramaticPressure(pressure({ source_char_id: 'a2', intensity: 70 }));
      const node = stage.getLocation('room-a')!;
      const action = composeDeterministicAction(sheet, stage, node, [otherAgent()]);
      assert.equal(action.action_type, 'SPEAK', 'fawn keeps the character talking (appeasing), not fleeing or lying');
      assert.match(action.content, /I don't want any trouble — you're right, of course\./, 'fawn recolors the line with appeasing phrasing');
      assert.match(action.content, /I need to find out who forged the painting/, 'the underlying goal-voiced line is recolored, not replaced');
    } finally {
      stage.close();
    }
  });

  it('fawn (no-fire): the same character at baseline gets the plain goal line with no appeasing prefix', () => {
    const stage = makeStageWithExits();
    try {
      const sheet = baseAgent({
        suspicion_score: 45,
        theoryOfMind: {
          a2: { subject_id: 'a2', believed_knowledge: [], believed_motive: 'unknown', trust_level: 0.4, power_balance: 0.1 },
        },
      }); // no emotion, no pressure ⇒ threatLevel 0 ⇒ arousal
      const node = stage.getLocation('room-a')!;
      const action = composeDeterministicAction(sheet, stage, node, [otherAgent()]);
      assert.equal(action.action_type, 'SPEAK');
      assert.ok(!/you're right, of course/.test(action.content), 'no appeasing flavor at baseline');
      assert.equal(action.content, 'I need to find out who forged the painting.');
    } finally {
      stage.close();
    }
  });

  it('flight via cascade (fire): an id-dominated character under survival threat skews to the evasive RELOCATE', () => {
    const stage = makeStageWithExits();
    try {
      // fear 90 + active survival stake 90 ⇒ trinity ID wins; no pressure ⇒
      // suddenness 0 (no freeze), threat not social, anger not dominant, a
      // real exit exists ⇒ cascade FLIGHT. Attachment is secure and suspicion
      // low, so the LEGACY flight trigger does NOT fire — the RELOCATE here
      // can only come from the cascade's ×1.5 evasive bias.
      const sheet = baseAgent({
        emotionState: fearEmotion(90),
        stakes: [{ id: 's1', char_id: 'a1', category: 'survival', description: 'Might not survive the night.', magnitude: 90, is_active: true }],
      });
      const node = stage.getLocation('room-a')!;
      const action = composeDeterministicAction(sheet, stage, node, [otherAgent()]);
      assert.equal(action.action_type, 'RELOCATE');
      assert.equal(action.target, 'Hallway');
      assert.equal(action.deterministic, true);
    } finally {
      stage.close();
    }
  });

  it('flight via cascade (no-fire): same character with no exit cannot flee — and no exit means no RELOCATE at all', () => {
    const stage = new Stage(':memory:');
    try {
      const sealed: Location = { location_id: 'room-a', name: 'Vault', description: 'A sealed vault.', adjacent_locations: [] };
      stage.addLocation(sealed);
      const sheet = baseAgent({
        emotionState: fearEmotion(90),
        stakes: [{ id: 's1', char_id: 'a1', category: 'survival', description: 'Might not survive the night.', magnitude: 90, is_active: true }],
      });
      const action = composeDeterministicAction(sheet, stage, stage.getLocation('room-a')!, [otherAgent()]);
      assert.notEqual(action.action_type, 'RELOCATE');
    } finally {
      stage.close();
    }
  });

  it('determinism: identical cascade-active state (freeze fixture) yields byte-identical actions twice', () => {
    const stage = makeStageWithExits();
    try {
      const sheet = baseAgent({
        darkTriad: { machiavellianism: 85, narcissism: 50, psychopathy: 40 },
        emotionState: fearEmotion(80),
      });
      stage.addAgent(sheet); // FK: pressure target must exist in Characters
      stage.addDramaticPressure(pressure());
      const node = stage.getLocation('room-a')!;
      const others = [otherAgent(), otherAgent({ char_id: 'a3', name: 'Cass' })];
      const first = composeDeterministicAction(sheet, stage, node, others);
      const second = composeDeterministicAction(sheet, stage, node, others);
      assert.deepEqual(first, second);
    } finally {
      stage.close();
    }
  });
});

// ── Baseline byte-stability regression (I1-b guarantee) ─────────────────────
// At baseline — arousal cascade state (calm/no-threat emotion, no dramatic
// pressure) — the cascade contributes NO bias ({}), and the BASE_SCORE tier
// separation guarantees the always-on trinity bias can never reorder the
// legacy priority (see the contract comment in deterministic.ts). These pins
// are the exact pre-integration outputs, asserted literal-for-literal: if any
// refactor perturbs baseline text, target, or type by one byte, this fails.

describe('agent/deterministic — baseline output is byte-identical to the pre-cascade composer', () => {
  it('calm default fixture: exact legacy SPEAK action, byte for byte', () => {
    const stage = makeStageWithExits();
    try {
      const action = composeDeterministicAction(baseAgent(), stage, stage.getLocation('room-a')!, [otherAgent()]);
      assert.deepEqual(action, {
        action_type: 'SPEAK',
        target: 'a2',
        content: 'I need to find out who forged the painting.',
        deterministic: true,
      });
    } finally {
      stage.close();
    }
  });

  it('calm denial-defense fixture: exact legacy defense-colored SPEAK (shame carries no fear/distress, so cascade stays at arousal)', () => {
    const stage = makeStageWithExits();
    try {
      const sheet = baseAgent({ defenseMechanisms: ['denial'], emotionState: emotion('shame', 60) });
      const action = composeDeterministicAction(sheet, stage, stage.getLocation('room-a')!, [otherAgent()]);
      assert.deepEqual(action, {
        action_type: 'SPEAK',
        target: 'a2',
        content: `That's not true. None of this happened the way you're describing.`,
        deterministic: true,
      });
    } finally {
      stage.close();
    }
  });

  it('calm avoidant-flight fixture: exact legacy RELOCATE with the same seeded exit pick', () => {
    const stage = makeStageWithExits();
    try {
      const sheet = baseAgent({ attachmentStyle: 'avoidant', suspicion_score: 60 });
      const action = composeDeterministicAction(sheet, stage, stage.getLocation('room-a')!, [otherAgent()]);
      assert.deepEqual(action, {
        action_type: 'RELOCATE',
        target: 'Hallway',
        content: `I can't stay in this room right now.`,
        deterministic: true,
      });
    } finally {
      stage.close();
    }
  });

  it('calm deceptive fixture: exact legacy LIE action, byte for byte', () => {
    const stage = makeStageWithExits();
    try {
      const sheet = baseAgent({ darkTriad: { machiavellianism: 85, narcissism: 50, psychopathy: 40 } });
      const action = composeDeterministicAction(sheet, stage, stage.getLocation('room-a')!, [otherAgent()]);
      assert.deepEqual(action, {
        action_type: 'LIE',
        target: 'a2',
        content: `Whatever you heard, that isn't what happened. You can trust me on that.`,
        deterministic: true,
      });
    } finally {
      stage.close();
    }
  });
});

// ── buildDeterministicEpistemics ─────────────────────────────────────────────

describe('agent/deterministic — buildDeterministicEpistemics', () => {
  it('witnessed (RELOCATE) beliefs carry a strictly higher confidence than told (SPEAK/LIE) beliefs', () => {
    const sheet = baseAgent();
    const relocateEntry = entry({ action_id: 'r1', char_id: 'a2', action_type: 'RELOCATE', content: '→ Hallway' });
    const speakEntry = entry({ action_id: 's1', char_id: 'a3', action_type: 'SPEAK', content: 'I was in the garden all night.' });
    const result = buildDeterministicEpistemics(sheet, [relocateEntry, speakEntry], [otherAgent(), otherAgent({ char_id: 'a3', name: 'Cass' })]);

    const witnessed = result.newBeliefs.find(b => b.source === 'witnessed');
    const told = result.newBeliefs.find(b => b.source === 'told');
    assert.ok(witnessed, 'RELOCATE produces a witnessed belief');
    assert.ok(told, 'SPEAK produces a told belief');
    assert.ok(witnessed!.confidence > told!.confidence, 'witnessed confidence must exceed told confidence');
  });

  it('own actions never become new beliefs (only others are "witnessed")', () => {
    const sheet = baseAgent();
    const ownEntry = entry({ char_id: sheet.char_id, action_type: 'SPEAK', content: 'I will find the truth.' });
    const result = buildDeterministicEpistemics(sheet, [ownEntry], []);
    assert.equal(result.newBeliefs.length, 0);
  });

  it('suspicion (fire): accusatory content directed at me + my own defensive line raise suspicion, but the total is bounded', () => {
    const sheet = baseAgent({ suspicion_score: 10 });
    const actions = [
      entry({ action_id: 'x1', char_id: 'a2', target_char_id: sheet.char_id, content: 'Why did you lie about the ledger?' }),
      entry({ action_id: 'x2', char_id: 'a3', target_char_id: sheet.char_id, content: "You're hiding something from all of us." }),
      entry({ action_id: 'x3', char_id: sheet.char_id, content: "That's not true, none of this is my doing." }),
    ];
    const result = buildDeterministicEpistemics(sheet, actions, [otherAgent(), otherAgent({ char_id: 'a3', name: 'Cass' })]);
    assert.ok(result.newSuspicionScore > sheet.suspicion_score, 'suspicion rises under accusation + own defensiveness');
    // Cap: ACCUSATION_SUSPICION_BUMP(5)*2 + DEFENSE_SUSPICION_BUMP(3) = 13 raw,
    // but MAX_SUSPICION_DELTA_PER_TURN caps the applied delta at 8.
    assert.equal(result.newSuspicionScore, sheet.suspicion_score + 8, 'per-turn suspicion delta is bounded, not raw-summed');
  });

  it('suspicion (no-fire): neutral content leaves suspicion completely unchanged', () => {
    const sheet = baseAgent({ suspicion_score: 10 });
    const actions = [entry({ char_id: 'a2', content: 'The weather has been pleasant lately.' })];
    const result = buildDeterministicEpistemics(sheet, actions, [otherAgent()]);
    assert.equal(result.newSuspicionScore, sheet.suspicion_score);
  });

  it('ToM valence direction (fire): warm tone raises trust above the prior baseline', () => {
    const sheet = baseAgent({
      theoryOfMind: { a2: { subject_id: 'a2', believed_knowledge: [], believed_motive: 'unknown', trust_level: 0.5, affinity: 0.5 } },
    });
    const actions = [entry({ char_id: 'a2', content: 'Thank you for trusting me with this, I appreciate it.' })];
    const result = buildDeterministicEpistemics(sheet, actions, [otherAgent()]);
    const tom = result.updatedTheoryOfMind.find(t => t.agent_name === 'Bob');
    assert.ok(tom, 'a tone signal produces a ToM update for the speaker');
    assert.ok(tom!.trust_level > 0.5, 'positive tone raises trust above the 0.5 baseline');
    assert.ok((tom!.affinity ?? 0) > 0.5, 'positive tone raises affinity above the 0.5 baseline');
  });

  it('ToM valence direction (fire, opposite sign): hostile tone lowers trust below the prior baseline', () => {
    const sheet = baseAgent({
      theoryOfMind: { a2: { subject_id: 'a2', believed_knowledge: [], believed_motive: 'unknown', trust_level: 0.5, affinity: 0.5 } },
    });
    const actions = [entry({ char_id: 'a2', content: "I never trust you, and honestly I'm disgusted by this." })];
    const result = buildDeterministicEpistemics(sheet, actions, [otherAgent()]);
    const tom = result.updatedTheoryOfMind.find(t => t.agent_name === 'Bob');
    assert.ok(tom);
    assert.ok(tom!.trust_level < 0.5, 'hostile tone lowers trust below the 0.5 baseline');
  });

  it('ToM valence (no-fire): neutral content produces no ToM update at all', () => {
    const sheet = baseAgent();
    const actions = [entry({ char_id: 'a2', content: 'The weather has been pleasant lately.' })];
    const result = buildDeterministicEpistemics(sheet, actions, [otherAgent()]);
    assert.equal(result.updatedTheoryOfMind.length, 0);
  });

  it('contradiction_detected is always false (documented scope limit — no false-positive dramatic pressure)', () => {
    const sheet = baseAgent();
    const result = buildDeterministicEpistemics(sheet, [entry({ char_id: 'a2' })], [otherAgent()]);
    assert.equal(result.contradiction_detected, false);
  });
});

// ── Flag presence at the Agent level (keyless) ───────────────────────────────

describe('Agent — deterministic flag flows through keyless takeTurn/updateEpistemics', () => {
  it('takeTurn() sets action.deterministic=true when no LLM provider is available', async () => {
    resetLLMProvider(); // ensure the default (keyless-throwing) provider is active
    const stage = makeStageWithExits();
    try {
      const sheet = baseAgent();
      stage.addAgent(sheet);
      stage.addAgent(otherAgent());
      const agent = new Agent(sheet, stage);
      const action = await agent.takeTurn();
      assert.equal(action.deterministic, true);
      assert.notEqual(action.content, '...', 'must not fall back to the old hollow ellipsis');
    } finally {
      stage.close();
    }
  });

  it('updateEpistemics() sets deterministic=true and actually writes new beliefs to Stage keylessly', async () => {
    resetLLMProvider();
    const stage = makeStageWithExits();
    try {
      const sheet = baseAgent();
      stage.addAgent(sheet);
      stage.addAgent(otherAgent());
      const agent = new Agent(sheet, stage);
      const action = await agent.takeTurn();
      stage.recordAction(sheet.char_id, action, sheet.current_location_id);

      const otherAgentInstance = new Agent(otherAgent(), stage);
      const bobAction = await otherAgentInstance.takeTurn();
      stage.recordAction('a2', bobAction, 'room-a');

      const recent = stage.getSensoryFilter('room-a', 5);
      const update = await agent.updateEpistemics(recent);
      assert.equal(update.deterministic, true);

      const refreshed = stage.getAgent(sheet.char_id);
      assert.ok((refreshed?.beliefs?.length ?? 0) > 0, 'a real belief was written keylessly, not frozen state');
    } finally {
      stage.close();
    }
  });
});
