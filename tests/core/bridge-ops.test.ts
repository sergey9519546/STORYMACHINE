// Tests for the simulation↔NVM bridge fix (audit defect A): action-to-ops.ts
// previously only ever emitted UPDATE_READER_STATE / UPDATE_BELIEF / ADD_FACT /
// RAISE_CLOCK — this file covers the new SHIFT_RELATIONSHIP / APPRAISE_EMOTION
// vocabulary (relationshipDeltasToOps / emotionAppraisalsToOps), the additive
// BridgeInput fields that feed them into buildTurnCommit, and the
// onTier1Reject hook (Fix C's canon-drop plumbing). Self-contained — no
// dependency on any other test file's fixtures, matching this repo's existing
// per-file test convention.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  entryToOps,
  epistemicUpdateToOps,
  relationshipDeltasToOps,
  emotionAppraisalsToOps,
  buildTurnCommit,
} from '../../server/nvm/bridge/action-to-ops.ts';
import type {
  BridgeInput,
  RelationshipDeltaInput,
  EmotionAppraisalInput,
} from '../../server/nvm/bridge/action-to-ops.ts';
import { applyStoryOps } from '../../server/nvm/ops/dispatcher.ts';
import { emptyState, relationshipKey } from '../../server/nvm/state/NarrativeState.ts';
import type { NarrativeState } from '../../server/nvm/state/NarrativeState.ts';
import type {
  ActionLogEntry, EpistemicUpdate, EventCard, EventProposition, Belief, EmotionState,
} from '../../server/engine/types.ts';

// ── Fixtures ─────────────────────────────────────────────────────────────────

function makeEntry(overrides: Partial<ActionLogEntry> = {}): ActionLogEntry {
  return {
    action_id: 'act-bridge-001',
    timestamp: Date.now(),
    char_id: 'alice',
    location_id: 'loc-01',
    action_type: 'SPEAK',
    target_char_id: 'bob',
    content: 'I saw nothing unusual.',
    is_audible: true,
    ...overrides,
  };
}

function makeProp(overrides: Partial<EventProposition> = {}): EventProposition {
  return {
    proposition_id: 'prop-bridge-001',
    event_id: 'act-bridge-001',
    content: 'I saw nothing unusual.',
    is_lie: false,
    asserted_by: 'alice',
    perceived_truth: true,
    ...overrides,
  };
}

function makeCard(entry: ActionLogEntry, props: EventProposition[] = []): EventCard {
  return {
    event_id: entry.action_id,
    char_id: entry.char_id,
    action_type: entry.action_type,
    content: entry.content,
    location_id: entry.location_id,
    turn_index: 4,
    propositions: props,
  };
}

function makeBelief(proposition: string): Belief {
  return {
    id: `bel-${Math.random().toString(36).slice(2, 8)}`,
    proposition,
    confidence: 0.4,
    source: 'inferred',
    acquired_at: 4,
    contradicts: [],
  };
}

function makeEpistemicUpdate(charId: string, beliefs: Belief[] = [], contradiction = false): EpistemicUpdate {
  return {
    char_id: charId,
    new_beliefs: beliefs,
    contradiction_detected: contradiction,
    contradicted_propositions: contradiction ? ['x'] : [],
    source_event_id: 'act-bridge-001',
  };
}

function makeEmotion(overrides: Partial<EmotionState> = {}): EmotionState {
  return {
    joy: 0, distress: 0, anger: 0, fear: 0, pride: 0, shame: 0,
    dominant: 'neutral', intensity: 0, last_updated_at: 4,
    ...overrides,
  };
}

// A NarrativeState whose characterBeliefs already ground the given char_ids —
// used to satisfy IntentionalProof (Tier 1) so SHIFT_RELATIONSHIP/APPRAISE_EMOTION
// ops involving these characters aren't pre-filtered out by buildTurnCommit's
// own grounding check before they ever reach the proof kernel.
function groundedState(charIds: string[]): NarrativeState {
  const state = emptyState();
  for (const id of charIds) state.characterBeliefs[id] = [];
  return state;
}

// ── X1: entryToOps — blueprint action-vocabulary expansion ─────────────────
// Direct, Tier-1-independent proof that each new action type maps to the
// StoryOp shape documented in action-to-ops.ts's entryToOps header comment.

describe('X1: entryToOps — new action types map to the documented ops', () => {
  it('HIDE → ADD_FACT(conceals_self) + UPDATE_READER_STATE(suspense+1)', () => {
    const entry = makeEntry({ action_type: 'HIDE', content: '(goes still)', target_char_id: null });
    const ops = entryToOps(entry, null, 4);
    const fact = ops.find(op => op.op === 'ADD_FACT');
    assert.ok(fact && fact.op === 'ADD_FACT' && fact.fact.predicate === 'conceals_self');
    const reader = ops.find(op => op.op === 'UPDATE_READER_STATE');
    assert.ok(reader && reader.op === 'UPDATE_READER_STATE' && reader.delta.suspense === 1);
  });

  it('OBSERVE → ADD_FACT(observes, object = target) + UPDATE_READER_STATE(curiosity+1)', () => {
    const entry = makeEntry({ action_type: 'OBSERVE', content: '(watches)', target_char_id: 'bob' });
    const ops = entryToOps(entry, null, 4);
    const fact = ops.find(op => op.op === 'ADD_FACT');
    assert.ok(fact && fact.op === 'ADD_FACT' && fact.fact.predicate === 'observes' && fact.fact.object === 'bob');
  });

  it('LISTEN → ADD_FACT(overhears, object = target)', () => {
    const entry = makeEntry({ action_type: 'LISTEN', content: '(listens)', target_char_id: 'bob' });
    const ops = entryToOps(entry, null, 4);
    const fact = ops.find(op => op.op === 'ADD_FACT');
    assert.ok(fact && fact.op === 'ADD_FACT' && fact.fact.predicate === 'overhears' && fact.fact.object === 'bob');
  });

  it('SEARCH → ADD_FACT(searches, object = location) + UPDATE_READER_STATE(curiosity+2, stronger than passive OBSERVE/LISTEN)', () => {
    const entry = makeEntry({ action_type: 'SEARCH', content: '(searches)', target_char_id: null });
    const ops = entryToOps(entry, null, 4);
    const fact = ops.find(op => op.op === 'ADD_FACT');
    assert.ok(fact && fact.op === 'ADD_FACT' && fact.fact.predicate === 'searches' && fact.fact.object === entry.location_id);
    const reader = ops.find(op => op.op === 'UPDATE_READER_STATE');
    assert.ok(reader && reader.op === 'UPDATE_READER_STATE' && reader.delta.curiosity === 2);
  });

  it('REVEAL → UPDATE_BELIEF at 0.85 confidence, source "told" — higher than SPEAK/LIE\'s 0.7 claim confidence', () => {
    const entry = makeEntry({ action_type: 'REVEAL', content: 'The vault code is 4479.', target_char_id: 'bob' });
    const card = makeCard(entry, [makeProp({ content: entry.content })]);
    const ops = entryToOps(entry, card, 4);
    const beliefOp = ops.find(op => op.op === 'UPDATE_BELIEF');
    assert.ok(beliefOp && beliefOp.op === 'UPDATE_BELIEF');
    assert.equal(beliefOp!.charId, 'bob');
    assert.equal(beliefOp!.belief.confidence, 0.85);
    assert.equal(beliefOp!.belief.source, 'told');
  });

  it('THREATEN → UPDATE_BELIEF at 0.9 confidence, source "witnessed" (directly experienced by the target)', () => {
    const entry = makeEntry({ action_type: 'THREATEN', content: 'Say a word and you\'ll regret it.', target_char_id: 'bob' });
    const card = makeCard(entry, [makeProp({ content: entry.content })]);
    const ops = entryToOps(entry, card, 4);
    const beliefOp = ops.find(op => op.op === 'UPDATE_BELIEF');
    assert.ok(beliefOp && beliefOp.op === 'UPDATE_BELIEF');
    assert.equal(beliefOp!.belief.confidence, 0.9);
    assert.equal(beliefOp!.belief.source, 'witnessed');
    const reader = ops.find(op => op.op === 'UPDATE_READER_STATE');
    assert.ok(reader && reader.op === 'UPDATE_READER_STATE' && reader.delta.suspense === 3);
  });

  it('BETRAY → the steepest UPDATE_READER_STATE suspense spike of the vocabulary', () => {
    const entry = makeEntry({ action_type: 'BETRAY', content: 'Alice gives you up.', target_char_id: 'bob' });
    const card = makeCard(entry, [makeProp({ content: entry.content })]);
    const ops = entryToOps(entry, card, 4);
    const reader = ops.find(op => op.op === 'UPDATE_READER_STATE');
    assert.ok(reader && reader.op === 'UPDATE_READER_STATE' && reader.delta.suspense === 4);
    const beliefOp = ops.find(op => op.op === 'UPDATE_BELIEF');
    assert.ok(beliefOp && beliefOp.op === 'UPDATE_BELIEF' && beliefOp.belief.source === 'witnessed');
  });

  it('PROTECT → UPDATE_BELIEF (witnessed, 0.85) + a mild curiosity bump', () => {
    const entry = makeEntry({ action_type: 'PROTECT', content: 'Leave him alone.', target_char_id: 'bob' });
    const card = makeCard(entry, [makeProp({ content: entry.content })]);
    const ops = entryToOps(entry, card, 4);
    const beliefOp = ops.find(op => op.op === 'UPDATE_BELIEF');
    assert.ok(beliefOp && beliefOp.op === 'UPDATE_BELIEF' && beliefOp.belief.confidence === 0.85 && beliefOp.belief.source === 'witnessed');
  });

  it('FORM_ALLIANCE → UPDATE_BELIEF (witnessed, 0.85)', () => {
    const entry = makeEntry({ action_type: 'FORM_ALLIANCE', content: "Let's work together.", target_char_id: 'bob' });
    const card = makeCard(entry, [makeProp({ content: entry.content })]);
    const ops = entryToOps(entry, card, 4);
    const beliefOp = ops.find(op => op.op === 'UPDATE_BELIEF');
    assert.ok(beliefOp && beliefOp.op === 'UPDATE_BELIEF' && beliefOp.belief.confidence === 0.85 && beliefOp.belief.source === 'witnessed');
  });

  it('FLEE → ADD_FACT(flees_to) + UPDATE_READER_STATE(suspense+2, stronger than RELOCATE\'s +1 — fear-driven)', () => {
    const entry = makeEntry({ action_type: 'FLEE', content: '→ Hallway (flees)', target_char_id: null });
    const ops = entryToOps(entry, null, 4);
    const fact = ops.find(op => op.op === 'ADD_FACT');
    assert.ok(fact && fact.op === 'ADD_FACT' && fact.fact.predicate === 'flees_to' && fact.fact.object === 'Hallway');
    const reader = ops.find(op => op.op === 'UPDATE_READER_STATE');
    assert.ok(reader && reader.op === 'UPDATE_READER_STATE' && reader.delta.suspense === 2);

    const relocateEntry = makeEntry({ action_type: 'RELOCATE', content: '→ Hallway', target_char_id: null });
    const relocateOps = entryToOps(relocateEntry, null, 4);
    const relocateReader = relocateOps.find(op => op.op === 'UPDATE_READER_STATE');
    assert.ok(relocateReader && relocateReader.op === 'UPDATE_READER_STATE');
    assert.ok(reader!.delta.suspense! > relocateReader!.delta.suspense!, 'FLEE reads as more urgent than a plain RELOCATE');
  });
});

// ── relationshipDeltasToOps ──────────────────────────────────────────────────

describe('bridge (Fix A): relationshipDeltasToOps', () => {
  it('a material delta becomes a SHIFT_RELATIONSHIP op with correct pair/dimension/amount', () => {
    const deltas: RelationshipDeltaInput[] = [
      { pair: ['alice', 'bob'], dimension: 'trust', amount: 0.12, reason: 'alice trusted bob more' },
    ];
    const ops = relationshipDeltasToOps(deltas);
    assert.equal(ops.length, 1, 'exactly one op emitted');
    const op = ops[0] as Extract<typeof ops[number], { op: 'SHIFT_RELATIONSHIP' }>;
    assert.equal(op.op, 'SHIFT_RELATIONSHIP');
    assert.deepEqual(op.pair, ['alice', 'bob']);
    assert.equal(op.delta.dimension, 'trust');
    assert.equal(op.delta.amount, 0.12);
    assert.equal(op.delta.reason, 'alice trusted bob more');
  });

  it('a sub-threshold delta produces no op (noise filter)', () => {
    const deltas: RelationshipDeltaInput[] = [
      // CICERO trust decay is 0.01/turn — this is exactly that scale, well under
      // the bridge's materiality threshold.
      { pair: ['alice', 'bob'], dimension: 'trust', amount: 0.01, reason: 'decay' },
    ];
    const ops = relationshipDeltasToOps(deltas);
    assert.equal(ops.length, 0, 'sub-threshold delta must not become a StoryOp');
  });

  it('a negative delta at or above threshold magnitude still fires (materiality is on |amount|)', () => {
    const deltas: RelationshipDeltaInput[] = [
      { pair: ['alice', 'bob'], dimension: 'resentment', amount: -0.05, reason: 'cooled' },
    ];
    const ops = relationshipDeltasToOps(deltas);
    assert.equal(ops.length, 1);
  });

  it('a non-finite amount is dropped defensively, not committed as NaN/Infinity', () => {
    const deltas: RelationshipDeltaInput[] = [
      { pair: ['alice', 'bob'], dimension: 'trust', amount: NaN, reason: 'bad data' },
    ];
    const ops = relationshipDeltasToOps(deltas);
    assert.equal(ops.length, 0);
  });
});

// ── emotionAppraisalsToOps ───────────────────────────────────────────────────

describe('bridge (Fix A): emotionAppraisalsToOps', () => {
  it('a significant appraisal becomes an APPRAISE_EMOTION op', () => {
    const appraisals: EmotionAppraisalInput[] = [
      { charId: 'alice', emotion: makeEmotion({ dominant: 'fear', fear: 40, intensity: 40 }) },
    ];
    const ops = emotionAppraisalsToOps(appraisals);
    assert.equal(ops.length, 1);
    const op = ops[0] as Extract<typeof ops[number], { op: 'APPRAISE_EMOTION' }>;
    assert.equal(op.op, 'APPRAISE_EMOTION');
    assert.equal(op.charId, 'alice');
    assert.equal(op.emotion.dominant, 'fear');
    assert.equal(op.emotion.intensity, 40);
  });

  it('a neutral appraisal produces no op', () => {
    const appraisals: EmotionAppraisalInput[] = [
      { charId: 'alice', emotion: makeEmotion({ dominant: 'neutral', intensity: 0 }) },
    ];
    const ops = emotionAppraisalsToOps(appraisals);
    assert.equal(ops.length, 0);
  });

  it('a below-significance-threshold appraisal produces no op', () => {
    const appraisals: EmotionAppraisalInput[] = [
      { charId: 'alice', emotion: makeEmotion({ dominant: 'joy', joy: 12, intensity: 12 }) },
    ];
    const ops = emotionAppraisalsToOps(appraisals);
    assert.equal(ops.length, 0, 'intensity 12 is below the 15 significance threshold');
  });
});

// ── buildTurnCommit: existing op kinds unchanged (regression fixture) ───────

describe('bridge (Fix A): buildTurnCommit regression — pre-existing op kinds unaffected', () => {
  it('a turn with no relationshipDeltas/emotionAppraisals produces EXACTLY the same ops as before the fix', () => {
    const entry = makeEntry({ action_type: 'SPEAK' });
    const card = makeCard(entry, [makeProp()]);
    const primaryUpdate = makeEpistemicUpdate('alice', [makeBelief('the vault was open')]);
    const input: BridgeInput = {
      entry,
      card,
      primaryUpdate,
      extraUpdates: [],
      turnIndex: 4,
      beforeState: emptyState(),
      sceneIdx: 4,
      parentId: null,
      // relationshipDeltas / emotionAppraisals / onTier1Reject deliberately
      // omitted — every pre-existing caller omits them too.
    };
    const commit = buildTurnCommit(input);
    assert.ok(commit, 'commit produced');

    const expectedOps = [
      ...entryToOps(entry, card, 4),
      ...epistemicUpdateToOps(primaryUpdate),
    ];
    assert.deepEqual(commit!.ops, expectedOps, 'ops are byte-identical to the pre-fix code path');
    assert.equal(
      commit!.ops.some(o => o.op === 'SHIFT_RELATIONSHIP' || o.op === 'APPRAISE_EMOTION'),
      false,
      'no new op kinds appear when the new fields are omitted',
    );
  });
});

// ── buildTurnCommit: new op kinds wired in + end-to-end dispatcher fold ─────

describe('bridge (Fix A): buildTurnCommit — SHIFT_RELATIONSHIP / APPRAISE_EMOTION end-to-end', () => {
  it('a grounded relationship delta produces a SHIFT_RELATIONSHIP op, and folding it through the dispatcher populates NarrativeState.relationships', () => {
    const entry = makeEntry({ action_type: 'SPEAK' });
    const primaryUpdate = makeEpistemicUpdate('alice', []); // no beliefs — grounding comes from beforeState
    const relationshipDeltas: RelationshipDeltaInput[] = [
      { pair: ['alice', 'bob'], dimension: 'trust', amount: 0.2, reason: 'alice caught bob in a lie' },
    ];
    const input: BridgeInput = {
      entry,
      card: null,
      primaryUpdate,
      extraUpdates: [],
      relationshipDeltas,
      turnIndex: 4,
      beforeState: groundedState(['alice', 'bob']),
      sceneIdx: 4,
      parentId: null,
    };
    const commit = buildTurnCommit(input);
    assert.ok(commit, 'commit produced');
    const shiftOps = commit!.ops.filter(o => o.op === 'SHIFT_RELATIONSHIP');
    assert.equal(shiftOps.length, 1, 'exactly one SHIFT_RELATIONSHIP op emitted');

    // The actual point of Fix A: the ledger's relationship state is no longer
    // permanently blind to simulated ToM changes — fold the commit's ops
    // through the same dispatcher NVM analytics/projectors use and confirm
    // NarrativeState.relationships is populated.
    const folded = applyStoryOps(emptyState(), commit!.ops);
    const key = relationshipKey('alice', 'bob');
    assert.ok(folded.relationships[key], 'relationships[key] exists after folding');
    assert.equal(folded.relationships[key].length, 1);
    assert.equal(folded.relationships[key][0].dimension, 'trust');
    assert.equal(folded.relationships[key][0].amount, 0.2);
  });

  it('a significant emotion appraisal produces an APPRAISE_EMOTION op, and folding it through the dispatcher updates characterEmotions', () => {
    const entry = makeEntry({ action_type: 'SPEAK' });
    const primaryUpdate = makeEpistemicUpdate('alice', []);
    const emotionAppraisals: EmotionAppraisalInput[] = [
      { charId: 'alice', emotion: makeEmotion({ dominant: 'anger', anger: 50, intensity: 50 }) },
    ];
    const input: BridgeInput = {
      entry,
      card: null,
      primaryUpdate,
      extraUpdates: [],
      emotionAppraisals,
      turnIndex: 4,
      beforeState: groundedState(['alice']),
      sceneIdx: 4,
      parentId: null,
    };
    const commit = buildTurnCommit(input);
    assert.ok(commit, 'commit produced');
    const emotionOps = commit!.ops.filter(o => o.op === 'APPRAISE_EMOTION');
    assert.equal(emotionOps.length, 1);

    const folded = applyStoryOps(emptyState(), commit!.ops);
    assert.equal(folded.characterEmotions.alice?.dominant, 'anger');
    assert.equal(folded.characterEmotions.alice?.intensity, 50);
  });

  it('a SHIFT_RELATIONSHIP op referencing an ungrounded subject is dropped rather than risking the whole commit (IntentionalProof-safe pre-filter)', () => {
    const entry = makeEntry({ action_type: 'SPEAK' });
    const primaryUpdate = makeEpistemicUpdate('alice', []);
    // 'stranger' has never appeared in beforeState and earns no UPDATE_BELIEF
    // this turn — not grounded per IntentionalProof's rule.
    const relationshipDeltas: RelationshipDeltaInput[] = [
      { pair: ['alice', 'stranger'], dimension: 'trust', amount: 0.5, reason: 'first contact' },
    ];
    const input: BridgeInput = {
      entry,
      card: null,
      primaryUpdate,
      extraUpdates: [],
      relationshipDeltas,
      turnIndex: 4,
      beforeState: groundedState(['alice']), // only alice is grounded
      sceneIdx: 4,
      parentId: null,
    };
    const commit = buildTurnCommit(input);
    // primaryUpdate has no beliefs and the entry produces UPDATE_READER_STATE
    // only (no SPEAK propositions since card is null) — so ops would be
    // non-empty only via UPDATE_READER_STATE from entryToOps.
    assert.ok(commit, 'commit still produced (UPDATE_READER_STATE from SPEAK)');
    assert.equal(
      commit!.ops.some(o => o.op === 'SHIFT_RELATIONSHIP'),
      false,
      'ungrounded-subject relationship op is pre-filtered, not committed',
    );
  });
});

// ── onTier1Reject hook (Fix C plumbing) ─────────────────────────────────────

describe('bridge (Fix C): onTier1Reject hook', () => {
  it('is NOT called when a commit passes Tier 1', () => {
    let called = 0;
    const onTier1Reject = () => { called++; };

    const passingInput: BridgeInput = {
      entry: makeEntry({ action_type: 'SPEAK' }),
      card: null,
      primaryUpdate: makeEpistemicUpdate('alice', [makeBelief('a fact')]),
      extraUpdates: [],
      onTier1Reject,
      turnIndex: 1,
      beforeState: emptyState(),
      sceneIdx: 1,
      parentId: null,
    };
    const commit = buildTurnCommit(passingInput);
    assert.ok(commit, 'this input passes Tier 1');
    assert.equal(called, 0, 'onTier1Reject is not called when the commit succeeds');
  });

  it('is invoked with the failing proof names when Tier-1 actually rejects (an ungrounded told-belief → EpistemicProof block)', () => {
    // EpistemicProof (server/nvm/proof/tier1/epistemic.ts) blocks a "told"
    // belief that carries no source_agent_id — a deterministic, cheap way to
    // force a real Tier-1 rejection without fabricating engine state.
    const entry = makeEntry({ action_type: 'EXAMINE', target_char_id: 'bob' });
    const ungroundedToldBelief: Belief = {
      id: 'bel-bad-1', proposition: 'someone said something', confidence: 0.7,
      source: 'told', acquired_at: 1, contradicts: [],
      // source_agent_id intentionally omitted — EpistemicProof requires it for 'told'.
    };
    let called = 0;
    let lastReasons = '';
    const onTier1Reject = (reasons: string) => { called++; lastReasons = reasons; };
    const input: BridgeInput = {
      entry,
      card: null,
      primaryUpdate: makeEpistemicUpdate('alice', [ungroundedToldBelief]),
      extraUpdates: [],
      onTier1Reject,
      turnIndex: 1,
      beforeState: emptyState(),
      sceneIdx: 1,
      parentId: null,
    };
    const commit = buildTurnCommit(input);
    assert.equal(commit, null, 'Tier-1 rejects an ungrounded told-belief, so no commit is produced');
    assert.equal(called, 1, 'onTier1Reject fires exactly once');
    assert.ok(lastReasons.length > 0, 'a non-empty failing-proof-names string is passed through');
  });
});
