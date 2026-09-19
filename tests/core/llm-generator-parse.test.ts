// llm-generator-parse.test.ts — the three generator-honesty defects from the
// 2026-09-19 session report §4 rows 9 and 14 (docs/audits/2026-09-19-generator-honesty).
//
// (a) parseOp accepted an UPDATE_BELIEF whose `belief` had only `proposition`
//     (id/confidence/source/source_event_id/acquired_at cast through
//     unchecked). The dispatcher upserts on `b.id === op.belief.id`
//     (server/nvm/ops/dispatcher.ts:34-39), so two id-less beliefs for one
//     character collapsed to one — a probe confirmed it live. SHIFT_RELATIONSHIP
//     and UPDATE_READER_STATE had the same `isObj`-only gap on their `delta`.
// (b) stubIR() and a parsed candidate both carried `provenance.origin:
//     'model_generated'`, so a structural stub read as model-authored to any
//     downstream reader keying on origin; `model` was hard-coded 'gemini' for
//     every parsed IR regardless of the configured provider.
// (c) The `causalLinks` filter did `typeof link.opIdx` with no object guard —
//     one `null` element threw OUT of parseIR into the outer catch, stubbing
//     ALL n candidates requested for the scene, not just the one bad link.
//
// Each `it.skip` block below is the FAIL-FIRST record: run once against the
// pre-fix source (`git stash` the file) to see it fail, then restore. The
// active tests are what must pass on the fixed source.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseOp, isStubIR, makeLLMCandidateGenerator } from '../../server/nvm/generate/llm-generator.ts';
import { applyStoryOps } from '../../server/nvm/ops/dispatcher.ts';
import { emptyState } from '../../server/nvm/state/NarrativeState.ts';
import { setLLMProvider, resetLLMProvider } from '../../server/engine/ai.ts';
import { buildCausalGraph } from '../../server/nvm/quality/index.ts';
import type { GenerateContentResponse } from '@google/genai';

describe('(a) UPDATE_BELIEF: distinct ids so beliefs do not collapse', () => {
  it('two id-less beliefs with different propositions get two distinct synthesized ids', () => {
    const op1 = parseOp({ op: 'UPDATE_BELIEF', charId: 'ILKA', belief: { proposition: 'the ferry already left' } });
    const op2 = parseOp({ op: 'UPDATE_BELIEF', charId: 'ILKA', belief: { proposition: 'Desmond lied about the notebook' } });
    assert.ok(op1 && op1.op === 'UPDATE_BELIEF');
    assert.ok(op2 && op2.op === 'UPDATE_BELIEF');
    assert.notEqual(op1.belief.id, op2.belief.id, 'distinct propositions must not collide on id');
    assert.ok(op1.belief.id.length > 0 && op2.belief.id.length > 0);

    // The probe this bug was found with: apply both through the REAL
    // dispatcher and confirm two beliefs survive, not one.
    let state = emptyState();
    state = applyStoryOps(state, [op1, op2]);
    assert.equal(state.characterBeliefs['ILKA']?.length, 2,
      'the dispatcher upserts on belief.id (dispatcher.ts:34-39) — id-less beliefs used to collapse to one');
  });

  it('the same proposition repeated for the same character synthesizes the same id (content upserts onto itself)', () => {
    const raw = { op: 'UPDATE_BELIEF', charId: 'ILKA', belief: { proposition: 'the ferry already left' } };
    const op1 = parseOp(raw);
    const op2 = parseOp(raw);
    assert.ok(op1 && op1.op === 'UPDATE_BELIEF');
    assert.ok(op2 && op2.op === 'UPDATE_BELIEF');
    assert.equal(op1.belief.id, op2.belief.id);

    let state = emptyState();
    state = applyStoryOps(state, [op1, op2]);
    assert.equal(state.characterBeliefs['ILKA']?.length, 1,
      'the SAME proposition for the SAME character is one belief upserted, not a duplicate');
  });

  it('a non-numeric confidence defaults to 0.5 instead of propagating NaN', () => {
    const op = parseOp({
      op: 'UPDATE_BELIEF', charId: 'ILKA',
      belief: { id: 'b1', proposition: 'the calculation was right', confidence: 'high', source: 'witnessed', source_event_id: 'e1', acquired_at: 0 },
    });
    assert.ok(op && op.op === 'UPDATE_BELIEF');
    assert.equal(op.belief.confidence, 0.5);
    assert.ok(Number.isFinite(op.belief.confidence), 'confidence must never reach committed state as NaN');
  });

  it('an out-of-range confidence (e.g. 2.5) also defaults to 0.5', () => {
    const op = parseOp({
      op: 'UPDATE_BELIEF', charId: 'ILKA',
      belief: { id: 'b1', proposition: 'x', confidence: 2.5, source: 'witnessed', source_event_id: 'e1', acquired_at: 0 },
    });
    assert.ok(op && op.op === 'UPDATE_BELIEF');
    assert.equal(op.belief.confidence, 0.5);
  });

  it('an unrecognised source string falls back to "inferred", not cast through', () => {
    const op = parseOp({
      op: 'UPDATE_BELIEF', charId: 'ILKA',
      belief: { id: 'b1', proposition: 'x', confidence: 0.6, source: 'guessed', source_event_id: 'e1', acquired_at: 0 },
    });
    assert.ok(op && op.op === 'UPDATE_BELIEF');
    assert.equal(op.belief.source, 'inferred');
  });

  it('still rejects a belief with no proposition, or a missing charId', () => {
    assert.equal(parseOp({ op: 'UPDATE_BELIEF', charId: 'ILKA', belief: {} }), null);
    assert.equal(parseOp({ op: 'UPDATE_BELIEF', belief: { proposition: 'x' } }), null);
    assert.equal(parseOp({ op: 'UPDATE_BELIEF', charId: 'ILKA', belief: { proposition: '   ' } }), null);
  });
});

describe('(a) SHIFT_RELATIONSHIP.delta and UPDATE_READER_STATE.delta are validated per-field', () => {
  it('SHIFT_RELATIONSHIP with delta: {} is rejected — siblings in the same candidate are unaffected', () => {
    const bad = parseOp({ op: 'SHIFT_RELATIONSHIP', pair: ['ILKA', 'DESMOND'], delta: {} });
    assert.equal(bad, null);
    const good = parseOp({ op: 'SHIFT_RELATIONSHIP', pair: ['ILKA', 'DESMOND'], delta: { dimension: 'trust', amount: -0.3, reason: 'he read the page' } });
    assert.ok(good);
  });

  it('SHIFT_RELATIONSHIP with delta as a string is rejected', () => {
    assert.equal(parseOp({ op: 'SHIFT_RELATIONSHIP', pair: ['ILKA', 'DESMOND'], delta: 'trust -0.3' }), null);
  });

  it('SHIFT_RELATIONSHIP.delta.amount out of the -1..1 range is clamped, not rejected (Finding 6, 2026-09-19: made consistent with confidence\'s clamp-and-log policy)', () => {
    const op = parseOp({
      op: 'SHIFT_RELATIONSHIP', pair: ['ILKA', 'DESMOND'],
      delta: { dimension: 'trust', amount: 5, reason: 'x' },
    });
    assert.ok(op && op.op === 'SHIFT_RELATIONSHIP');
    assert.equal(op.delta.amount, 1);
  });

  it('a bad SHIFT_RELATIONSHIP does not stub the rest of the candidate (parseOp only drops that op)', () => {
    const okBelief = parseOp({ op: 'UPDATE_BELIEF', charId: 'ILKA', belief: { proposition: 'p' } });
    const badShift = parseOp({ op: 'SHIFT_RELATIONSHIP', pair: ['ILKA', 'DESMOND'], delta: {} });
    assert.ok(okBelief);
    assert.equal(badShift, null);
  });

  it('UPDATE_READER_STATE accepts delta: {} — every field is optional on this op', () => {
    const op = parseOp({ op: 'UPDATE_READER_STATE', delta: {} });
    assert.ok(op, 'an empty ReaderStateDelta is the declared minimum (IR_SCHEMA has no required list for it)');
  });

  it('UPDATE_READER_STATE rejects a present field of the wrong type', () => {
    assert.equal(parseOp({ op: 'UPDATE_READER_STATE', delta: { suspense: 'high' } }), null);
    assert.equal(parseOp({ op: 'UPDATE_READER_STATE', delta: { knownFact: 42 } }), null);
    const ok = parseOp({ op: 'UPDATE_READER_STATE', delta: { suspense: 15, curiosity: 10 } });
    assert.ok(ok);
  });
});

describe('(b) a structural stub is identifiable as one', () => {
  it('isStubIR is true for stubIR output and false for a real parsed candidate', async () => {
    const payload = JSON.stringify({
      candidates: [{
        transitionId: 't-1',
        sceneFunction: 'build_tension',
        ops: [{ op: 'RAISE_CLOCK', clockId: 'last-ferry', amount: 2 }],
      }],
    });
    setLLMProvider({
      generate: async () => ({
        text: payload,
        candidates: [{ content: { role: 'model', parts: [{ text: payload }] }, finishReason: 'STOP' }],
      } as unknown as GenerateContentResponse),
    });
    try {
      const generate = makeLLMCandidateGenerator();
      const spec = {
        state: {},
        target: { sceneIdx: 0, sceneFunction: 'build_tension', activeMechanisms: ['suspense'], tensionTarget: 60 },
        constraints: [],
        systemPreamble: 'Write a scene.',
      } as unknown as Parameters<typeof generate>[0];
      const irs = await generate(spec, 1);
      assert.equal(irs.length, 1);
      assert.equal(isStubIR(irs[0]), false, 'a candidate with a real parsed op is not a stub');
    } finally {
      resetLLMProvider();
    }
  });

  it('isStubIR is true when the provider is unavailable (the keyless/failure fallback)', async () => {
    setLLMProvider({ generate: async () => { throw new Error('no provider'); } });
    try {
      const generate = makeLLMCandidateGenerator();
      const spec = {
        state: {},
        target: { sceneIdx: 0, sceneFunction: 'build_tension', activeMechanisms: ['suspense'], tensionTarget: 60 },
        constraints: [],
        systemPreamble: 'Write a scene.',
      } as unknown as Parameters<typeof generate>[0];
      const irs = await generate(spec, 2);
      assert.equal(irs.length, 2);
      assert.ok(irs.every(isStubIR));
    } finally {
      resetLLMProvider();
    }
  });

  it('a parsed candidate carries the configured model, not a hard-coded "gemini"', async () => {
    const payload = JSON.stringify({
      candidates: [{
        transitionId: 't-1',
        sceneFunction: 'build_tension',
        ops: [{ op: 'RAISE_CLOCK', clockId: 'last-ferry', amount: 2 }],
      }],
    });
    // CANDIDATE generation runs on the 'fast' tier (server/engine/ai.ts's
    // TASK_TIER), so the model it resolves comes from AI_FAST_MODEL, not
    // AI_MODEL — modelForTask('CANDIDATE') -> getModel('fast').
    const priorModel = process.env.AI_FAST_MODEL;
    process.env.AI_FAST_MODEL = 'fake-provider-model-xyz';
    setLLMProvider({
      generate: async () => ({
        text: payload,
        candidates: [{ content: { role: 'model', parts: [{ text: payload }] }, finishReason: 'STOP' }],
      } as unknown as GenerateContentResponse),
    });
    try {
      const generate = makeLLMCandidateGenerator();
      const spec = {
        state: {},
        target: { sceneIdx: 0, sceneFunction: 'build_tension', activeMechanisms: ['suspense'], tensionTarget: 60 },
        constraints: [],
        systemPreamble: 'Write a scene.',
      } as unknown as Parameters<typeof generate>[0];
      const irs = await generate(spec, 1);
      assert.equal(irs[0].provenance.model, 'fake-provider-model-xyz');
      assert.notEqual(irs[0].provenance.model, 'gemini');
    } finally {
      if (priorModel === undefined) delete process.env.AI_FAST_MODEL; else process.env.AI_FAST_MODEL = priorModel;
      resetLLMProvider();
    }
  });
});

describe('Finding 2 (HIGH): a causalLinks element without a proper causedBy array is dropped, not fatal', () => {
  it('{opIdx:0} with no causedBy is dropped; {opIdx:0, causedBy:["e1"]} is kept; a candidate with one good op and one such bad link still parses (not a stub)', async () => {
    const payload = JSON.stringify({
      candidates: [{
        transitionId: 't-1',
        sceneFunction: 'build_tension',
        ops: [{ op: 'RAISE_CLOCK', clockId: 'last-ferry', amount: 2 }],
        causalLinks: [
          { opIdx: 0 },                          // no causedBy at all
          { opIdx: 0, causedBy: 'x' },            // causedBy not an array
          { opIdx: 0, causedBy: [1] },            // causedBy array with a non-string element
          { opIdx: 0, causedBy: ['e1'] },         // well-formed — kept
        ],
      }],
    });
    setLLMProvider({
      generate: async () => ({
        text: payload,
        candidates: [{ content: { role: 'model', parts: [{ text: payload }] }, finishReason: 'STOP' }],
      } as unknown as GenerateContentResponse),
    });
    try {
      const generate = makeLLMCandidateGenerator();
      const spec = {
        state: {},
        target: { sceneIdx: 0, sceneFunction: 'build_tension', activeMechanisms: ['suspense'], tensionTarget: 60 },
        constraints: [],
        systemPreamble: 'Write a scene.',
      } as unknown as Parameters<typeof generate>[0];
      const irs = await generate(spec, 1);
      assert.equal(irs.length, 1, 'one candidate requested, one candidate returned — not stubbed');
      assert.equal(isStubIR(irs[0]), false, 'malformed causalLinks elements must not degrade the candidate to a stub');
      assert.equal(irs[0].ops.length, 1, 'the real op survives');
      assert.equal(irs[0].causalLinks?.length, 1, 'only the well-formed link survives');
      assert.deepEqual(irs[0].causalLinks?.[0], { opIdx: 0, causedBy: ['e1'] });

      // buildCausalGraph assumes every surviving link's causedBy is iterable
      // (server/nvm/quality/index.ts:702 does `for (const causedBy of
      // link.causedBy)`) — confirm the parsed IR no longer throws there.
      assert.doesNotThrow(() => buildCausalGraph(irs[0]));
    } finally {
      resetLLMProvider();
    }
  });
});

describe('Finding 6 (MEDIUM): SHIFT_RELATIONSHIP.amount clamps like confidence; UPDATE_READER_STATE/SHIFT_RELATIONSHIP treat null as absent', () => {
  it('an out-of-range but finite amount is clamped into [-1, 1] rather than dropping the op', () => {
    const high = parseOp({ op: 'SHIFT_RELATIONSHIP', pair: ['ILKA', 'DESMOND'], delta: { dimension: 'trust', amount: 2, reason: 'x' } });
    assert.ok(high && high.op === 'SHIFT_RELATIONSHIP');
    assert.equal(high.delta.amount, 1);

    const low = parseOp({ op: 'SHIFT_RELATIONSHIP', pair: ['ILKA', 'DESMOND'], delta: { dimension: 'trust', amount: -1.5, reason: 'x' } });
    assert.ok(low && low.op === 'SHIFT_RELATIONSHIP');
    assert.equal(low.delta.amount, -1);

    const barely = parseOp({ op: 'SHIFT_RELATIONSHIP', pair: ['ILKA', 'DESMOND'], delta: { dimension: 'trust', amount: 1.0000001, reason: 'x' } });
    assert.ok(barely && barely.op === 'SHIFT_RELATIONSHIP');
    assert.equal(barely.delta.amount, 1);
  });

  it('a non-numeric or NaN amount is still rejected — not recoverable by clamping', () => {
    assert.equal(parseOp({ op: 'SHIFT_RELATIONSHIP', pair: ['ILKA', 'DESMOND'], delta: { dimension: 'trust', amount: 'big', reason: 'x' } }), null);
    assert.equal(parseOp({ op: 'SHIFT_RELATIONSHIP', pair: ['ILKA', 'DESMOND'], delta: { dimension: 'trust', amount: NaN, reason: 'x' } }), null);
  });

  it('UPDATE_READER_STATE treats an explicit null on an optional field as absent, not a type error', () => {
    const withNullKnownFact = parseOp({ op: 'UPDATE_READER_STATE', delta: { knownFact: null } });
    assert.ok(withNullKnownFact && withNullKnownFact.op === 'UPDATE_READER_STATE');
    assert.equal(withNullKnownFact.delta.knownFact, undefined);

    const withNullSuspense = parseOp({ op: 'UPDATE_READER_STATE', delta: { suspense: null } });
    assert.ok(withNullSuspense && withNullSuspense.op === 'UPDATE_READER_STATE');
    assert.equal(withNullSuspense.delta.suspense, undefined);

    // A present field of the wrong (non-null) type is still rejected.
    assert.equal(parseOp({ op: 'UPDATE_READER_STATE', delta: { suspense: 'high' } }), null);
  });
});

describe('(c) a bad causalLinks element does not stub the whole scene', () => {
  it('a null element in causalLinks is dropped, not thrown — candidates keep their real ops', async () => {
    const payload = JSON.stringify({
      candidates: [{
        transitionId: 't-1',
        sceneFunction: 'build_tension',
        ops: [
          { op: 'RAISE_CLOCK', clockId: 'last-ferry', amount: 2 },
          { op: 'RECORD_VISUAL_FACT', sceneId: 's0', fact: 'a wet coat over the rail' },
        ],
        causalLinks: [null, { opIdx: 0, causedBy: ['fact-1'] }],
      }],
    });
    setLLMProvider({
      generate: async () => ({
        text: payload,
        candidates: [{ content: { role: 'model', parts: [{ text: payload }] }, finishReason: 'STOP' }],
      } as unknown as GenerateContentResponse),
    });
    try {
      const generate = makeLLMCandidateGenerator();
      const spec = {
        state: {},
        target: { sceneIdx: 0, sceneFunction: 'build_tension', activeMechanisms: ['suspense'], tensionTarget: 60 },
        constraints: [],
        systemPreamble: 'Write a scene.',
      } as unknown as Parameters<typeof generate>[0];
      const irs = await generate(spec, 1);
      assert.equal(irs.length, 1, 'one candidate requested, one candidate returned — not stubbed');
      assert.equal(isStubIR(irs[0]), false, 'a null causalLinks element must not degrade the candidate to a stub');
      assert.equal(irs[0].ops.length, 2, 'both real ops must survive');
      assert.equal(irs[0].causalLinks?.length, 1, 'the one well-formed link survives; the null element is dropped');
    } finally {
      resetLLMProvider();
    }
  });
});
