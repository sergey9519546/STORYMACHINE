// cast-alignment.test.ts — the opt-in cast-alignment step, with no network.
//
// WHAT THIS FILE PINS. server/nvm/converge/cast-alignment.ts rewrites a
// model-invented character name to a real cast member when, and only when, two
// independent System One answers agree. The tests that matter are the ones that
// prove it does NOTHING in every other case:
//
//   (a) flag off        -> no transport call, the IDENTICAL ir object, reason 'disabled'
//   (b) flag on, no key -> no transport call, reason 'no_key'
//   (c) "clearly" + confident choice -> every referencing op rewritten, AND
//       IntentionalProof, which FAILS on the unaligned IR, PASSES on the aligned
//       one. That pair is the fail-first assertion: the "before" half fails
//       first, so a rewrite that did nothing could not pass this test.
//   (d) "possibly"      -> untouched, proof still blocks
//   (e) "different"     -> untouched, proof still blocks
//   (f) confident 'none' -> untouched
//   (g) the transport throws -> applied:false/reason:'error', ir unchanged, and
//       NO exception escapes into the convergence loop
//
// plus the loop-level property the flag's default rests on: with
// TYPESAFE_CAST_ALIGNMENT unset, convergeScene's history is byte-identical to
// what it was before this feature existed (no castAlignment key at all).
import { describe, it, before, after, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { alignCandidateCast, castAlignmentEnabled } from '../../../server/nvm/converge/cast-alignment.ts';
import { intentionalProof, knownCharacters } from '../../../server/nvm/proof/tier1/intentional.ts';
import { convergeScene } from '../../../server/nvm/converge/loop.ts';
import { emptyState } from '../../../server/nvm/state/NarrativeState.ts';
import {
  setTypeSafeTransport, resetTypeSafeTransport, clearTypeSafeCache,
  type TypeSafeTransport,
} from '../../../server/lib/ai-providers/typesafe.ts';
import type { NarrativeState } from '../../../server/nvm/state/NarrativeState.ts';
import type { NarrativeTransitionIR } from '../../../server/nvm/ir/NarrativeTransitionIR.ts';
import type { SceneTarget } from '../../../server/nvm/generate/proof-spec.ts';

const FAKE_KEY = 'ts-test-not-a-real-key-0000';

// ── Fixtures: the exact shape STORY_BENCH §4b describes ──────────────────────
// ILKA and DESMOND are grounded in state. The candidate acts on "PROTAGONIST",
// which is the model's placeholder for one of them.

function stateWithCast(): NarrativeState {
  const s = emptyState();
  s.characterBeliefs = {
    ILKA: [{ id: 'b-ilka', proposition: 'the bridge is safe', confidence: 0.8, source: 'witnessed', acquired_at: 0 }],
    DESMOND: [{ id: 'b-des', proposition: 'the bridge must be stopped', confidence: 0.8, source: 'witnessed', acquired_at: 0 }],
  };
  return s;
}

function candidateWithInventedName(name = 'PROTAGONIST'): NarrativeTransitionIR {
  return {
    transitionId: 't-1',
    sceneIdx: 3,
    sceneFunction: 'build_tension',
    activeMechanisms: ['core_mechanism'],
    beforeStateHash: 'hash',
    ops: [
      // APPRAISE_EMOTION and SHIFT_RELATIONSHIP only REFERENCE a character —
      // they do not ground one, which is why IntentionalProof blocks them.
      { op: 'APPRAISE_EMOTION', charId: name, emotion: {
        joy: 0, distress: 70, anger: 0, fear: 10, pride: 0, shame: 0,
        dominant: 'distress', intensity: 70, last_updated_at: 3,
      } },
      { op: 'SHIFT_RELATIONSHIP', pair: [name, 'DESMOND'], delta: { dimension: 'trust', amount: -0.3, reason: 'the vault opens once' } },
      { op: 'RAISE_CLOCK', clockId: 'clock-1', amount: 2 },
    ],
    preconditions: ['prior scene'],
    postconditions: [],
    provenance: { origin: 'model_generated', createdAt: 0, model: 'test-model' },
  };
}

const TARGET: SceneTarget = {
  sceneIdx: 3, sceneFunction: 'build_tension', activeMechanisms: ['core_mechanism'],
  tensionTarget: 60, themeHint: 'trust costs something',
};

/** A transport that answers every `*_relation` / `*_which` pair the same way. */
function answeringTransport(score: number, choice: string, confidence: number) {
  const bodies: string[] = [];
  const transport: TypeSafeTransport = async (_url, init) => {
    bodies.push(init.body);
    const sent = JSON.parse(init.body) as { questions: Record<string, { type: string }> };
    const answers: Record<string, unknown> = {};
    for (const [id, q] of Object.entries(sent.questions)) {
      answers[id] = q.type === 'score'
        ? { type: 'score', score, confidence: 0.9 }
        : { type: 'choice', choice, confidence };
    }
    return {
      status: 200,
      text: async () => JSON.stringify({ model: 'jev-1.13.0', answers, usage: { input_tokens: 90, output_tokens: 5 } }),
    };
  };
  return { transport, bodies };
}

describe('cast alignment (TYPESAFE_CAST_ALIGNMENT)', () => {
  let savedFlag: string | undefined;
  let savedKey: string | undefined;

  before(() => {
    savedFlag = process.env.TYPESAFE_CAST_ALIGNMENT;
    savedKey = process.env.TYPESAFE_API_KEY;
  });
  after(() => {
    if (savedFlag === undefined) delete process.env.TYPESAFE_CAST_ALIGNMENT;
    else process.env.TYPESAFE_CAST_ALIGNMENT = savedFlag;
    if (savedKey === undefined) delete process.env.TYPESAFE_API_KEY;
    else process.env.TYPESAFE_API_KEY = savedKey;
    resetTypeSafeTransport();
    clearTypeSafeCache();
  });

  beforeEach(() => {
    clearTypeSafeCache();
    process.env.TYPESAFE_API_KEY = FAKE_KEY;
  });
  afterEach(() => {
    resetTypeSafeTransport();
  });

  // ── the premise: this is a real block today ───────────────────────────────

  it('the unaligned candidate is exactly the STORY_BENCH §4b failure: IntentionalProof blocks it', () => {
    const state = stateWithCast();
    const ir = candidateWithInventedName();
    assert.deepEqual([...knownCharacters(ir, state)].sort(), ['DESMOND', 'ILKA']);
    const proof = intentionalProof(ir, state);
    assert.equal(proof.pass, false);
    assert.equal(proof.findings.length, 2, 'both the emotion op and the relationship pair are blocked');
    assert.ok(proof.findings.every(f => f.subjectId === 'PROTAGONIST'));
  });

  // ── (a) flag off ──────────────────────────────────────────────────────────

  it('(a) with the flag off it is a no-op: no transport call, the same object, reason "disabled"', async () => {
    delete process.env.TYPESAFE_CAST_ALIGNMENT;
    assert.equal(castAlignmentEnabled(), false);
    let calls = 0;
    setTypeSafeTransport(async () => { calls += 1; throw new Error('must not be called'); });

    const ir = candidateWithInventedName();
    const out = await alignCandidateCast(ir, stateWithCast(), { target: TARGET });

    assert.equal(calls, 0);
    assert.equal(out.ir, ir, 'the IR must come back by the SAME reference, not a copy');
    assert.equal(out.alignment.applied, false);
    assert.equal(out.alignment.reason, 'disabled');
    assert.deepEqual(out.alignment.aligned, []);
  });

  // ── (b) flag on, no key ───────────────────────────────────────────────────

  it('(b) with the flag on but no key: reason "no_key", no transport call, IR unchanged', async () => {
    process.env.TYPESAFE_CAST_ALIGNMENT = '1';
    delete process.env.TYPESAFE_API_KEY;
    let calls = 0;
    setTypeSafeTransport(async () => { calls += 1; throw new Error('must not be called'); });

    const ir = candidateWithInventedName();
    const out = await alignCandidateCast(ir, stateWithCast(), { target: TARGET });

    assert.equal(calls, 0);
    assert.equal(out.ir, ir);
    assert.equal(out.alignment.applied, false);
    assert.equal(out.alignment.reason, 'no_key');
    assert.deepEqual(out.alignment.unresolved, ['PROTAGONIST']);
  });

  // ── (c) the one case that rewrites ────────────────────────────────────────

  it('(c) "clearly one of the cast" + a confident choice rewrites EVERY referencing op, and the proof flips fail -> pass', async () => {
    process.env.TYPESAFE_CAST_ALIGNMENT = '1';
    const { transport } = answeringTransport(2, 'ILKA', 0.88);
    setTypeSafeTransport(transport);

    const state = stateWithCast();
    const ir = candidateWithInventedName();

    // FAIL-FIRST: the "before" half must genuinely fail, or the "after" half
    // proves nothing.
    assert.equal(intentionalProof(ir, state).pass, false, 'the unaligned IR must FAIL the proof');

    const out = await alignCandidateCast(ir, state, { target: TARGET });

    assert.equal(out.alignment.applied, true);
    assert.equal(out.alignment.reason, undefined);
    assert.deepEqual(out.alignment.aligned, [{ from: 'PROTAGONIST', to: 'ILKA', relationScore: 2, choiceConfidence: 0.88 }]);
    assert.deepEqual(out.alignment.unresolved, []);

    // every op that referenced the invented name now names the cast member
    const aligned = out.ir;
    assert.notEqual(aligned, ir, 'a rewrite returns a NEW ir; the input is never mutated');
    assert.equal(ir.ops[0].op === 'APPRAISE_EMOTION' && ir.ops[0].charId, 'PROTAGONIST');
    assert.equal(aligned.ops[0].op === 'APPRAISE_EMOTION' && aligned.ops[0].charId, 'ILKA');
    assert.deepEqual(aligned.ops[1].op === 'SHIFT_RELATIONSHIP' && aligned.ops[1].pair, ['ILKA', 'DESMOND']);
    assert.equal(aligned.ops.length, ir.ops.length, 'never drops an op');
    assert.deepEqual(aligned.ops[2], ir.ops[2], 'an op that names no character is untouched');
    assert.equal(aligned.transitionId, ir.transitionId);
    assert.deepEqual(aligned.provenance, ir.provenance);

    // AND the proof, whose decision logic did not change, now passes.
    assert.equal(intentionalProof(aligned, state).pass, true, 'the aligned IR must PASS the same proof');
    // No character was added: the aligned IR references only the existing cast.
    assert.deepEqual([...knownCharacters(aligned, state)].sort(), ['DESMOND', 'ILKA']);
  });

  // ── (d) / (e) / (f) the cases that must NOT rewrite ───────────────────────

  const untouchedCases: Array<{ label: string; score: number; choice: string; confidence: number }> = [
    { label: '(d) "possibly one of the cast, unclear which" (the live probe\'s own answer)', score: 1.03, choice: 'ILKA', confidence: 0.15 },
    { label: '(e) "a different character not in the cast"', score: 0.1, choice: 'ILKA', confidence: 0.95 },
    { label: '(f) a confident "none"', score: 2, choice: 'none', confidence: 0.99 },
    { label: '(f2) "clearly", but the choice is not confident enough', score: 2, choice: 'ILKA', confidence: 0.59 },
    { label: '(f3) "clearly" and confident, but the option was never offered', score: 2, choice: 'SOMEONE_ELSE', confidence: 0.99 },
  ];

  for (const c of untouchedCases) {
    it(`${c.label} leaves the ops untouched and the proof still blocks`, async () => {
      process.env.TYPESAFE_CAST_ALIGNMENT = '1';
      const { transport } = answeringTransport(c.score, c.choice, c.confidence);
      setTypeSafeTransport(transport);

      const state = stateWithCast();
      const ir = candidateWithInventedName();
      assert.equal(intentionalProof(ir, state).pass, false);

      const out = await alignCandidateCast(ir, state, { target: TARGET });

      assert.equal(out.alignment.applied, true, 'the call SUCCEEDED — it just resolved nothing');
      assert.deepEqual(out.alignment.aligned, []);
      assert.deepEqual(out.alignment.unresolved, ['PROTAGONIST']);
      assert.equal(out.ir, ir, 'nothing rewritten means the same object comes back');
      assert.equal(intentionalProof(out.ir, state).pass, false, 'the proof blocks it exactly as today');
    });
  }

  // ── (g) the transport throws ──────────────────────────────────────────────

  it('(g) a transport failure becomes applied:false / reason:"error"; the IR is unchanged and nothing throws', async () => {
    process.env.TYPESAFE_CAST_ALIGNMENT = '1';
    setTypeSafeTransport(async () => { throw new Error(`upstream exploded (key ${FAKE_KEY})`); });

    const state = stateWithCast();
    const ir = candidateWithInventedName();
    const out = await alignCandidateCast(ir, state, { target: TARGET });

    assert.equal(out.alignment.applied, false);
    assert.equal(out.alignment.reason, 'error');
    assert.equal(typeof out.alignment.error, 'string');
    assert.ok(!out.alignment.error!.includes(FAKE_KEY), 'the recorded error is redacted');
    assert.deepEqual(out.alignment.unresolved, ['PROTAGONIST']);
    assert.equal(out.ir, ir);
    assert.equal(intentionalProof(out.ir, state).pass, false);
  });

  it('an HTTP error is reported the same way — a failure is never shaped like a success', async () => {
    process.env.TYPESAFE_CAST_ALIGNMENT = '1';
    setTypeSafeTransport(async () => ({ status: 429, text: async () => 'slow down' }));
    const out = await alignCandidateCast(candidateWithInventedName(), stateWithCast(), { target: TARGET });
    assert.equal(out.alignment.applied, false);
    assert.equal(out.alignment.reason, 'error');
    assert.match(out.alignment.error ?? '', /429/);
  });

  // ── the cheap skips, and what actually goes on the wire ───────────────────

  it('a candidate whose characters are all grounded never spends a call', async () => {
    process.env.TYPESAFE_CAST_ALIGNMENT = '1';
    let calls = 0;
    setTypeSafeTransport(async () => { calls += 1; throw new Error('must not be called'); });

    const ir = candidateWithInventedName('ILKA');   // ILKA is in the cast
    const out = await alignCandidateCast(ir, stateWithCast(), { target: TARGET });

    assert.equal(calls, 0);
    assert.equal(out.alignment.reason, 'nothing_to_align');
    assert.equal(out.ir, ir);
  });

  it('a name the IR itself grounds with UPDATE_BELIEF is not "invented" — same definition the proof uses', async () => {
    process.env.TYPESAFE_CAST_ALIGNMENT = '1';
    let calls = 0;
    setTypeSafeTransport(async () => { calls += 1; throw new Error('must not be called'); });

    const ir = candidateWithInventedName();
    ir.ops.unshift({ op: 'UPDATE_BELIEF', charId: 'PROTAGONIST', belief: {
      id: 'b-new', proposition: 'the vault opens once', confidence: 0.8, source: 'witnessed', acquired_at: 3,
    } });
    assert.equal(intentionalProof(ir, stateWithCast()).pass, true, 'the proof already accepts this IR');

    const out = await alignCandidateCast(ir, stateWithCast(), { target: TARGET });
    assert.equal(calls, 0, 'nothing the proof would accept is sent for alignment');
    assert.equal(out.alignment.reason, 'nothing_to_align');
  });

  it('an empty cast is skipped rather than asked to choose from nothing', async () => {
    process.env.TYPESAFE_CAST_ALIGNMENT = '1';
    let calls = 0;
    setTypeSafeTransport(async () => { calls += 1; throw new Error('must not be called'); });
    const out = await alignCandidateCast(candidateWithInventedName(), emptyState(), { target: TARGET });
    assert.equal(calls, 0);
    assert.equal(out.alignment.reason, 'nothing_to_align');
  });

  it('sends ONE request per candidate, carrying a score + choice pair per name and the cast as the options', async () => {
    process.env.TYPESAFE_CAST_ALIGNMENT = '1';
    const { transport, bodies } = answeringTransport(0, 'none', 0.9);
    setTypeSafeTransport(transport);

    const ir = candidateWithInventedName();
    ir.ops.push({ op: 'APPRAISE_EMOTION', charId: 'Antagonist', emotion: {
      joy: 0, distress: 0, anger: 60, fear: 0, pride: 0, shame: 0,
      dominant: 'anger', intensity: 60, last_updated_at: 3,
    } });
    await alignCandidateCast(ir, stateWithCast(), { target: TARGET });

    assert.equal(bodies.length, 1, 'ONE request per candidate, not one per name');
    const sent = JSON.parse(bodies[0]) as {
      state: { cast: string[]; names: string[]; scene: Record<string, unknown>; candidate: string };
      questions: Record<string, { type: string; criteria: unknown }>;
    };
    assert.deepEqual(sent.state.cast, ['DESMOND', 'ILKA']);
    assert.deepEqual(sent.state.names, ['PROTAGONIST', 'Antagonist']);
    assert.equal(sent.state.scene['theme'], 'trust costs something');
    assert.equal(sent.state.scene['tension'], 60);
    assert.match(sent.state.candidate, /APPRAISE_EMOTION PROTAGONIST/);
    assert.deepEqual(Object.keys(sent.questions).sort(), [
      'Antagonist_relation', 'Antagonist_which', 'PROTAGONIST_relation', 'PROTAGONIST_which',
    ]);
    assert.deepEqual(
      (sent.questions['PROTAGONIST_relation'] as { criteria: string[] }).criteria,
      ['a different character not in the cast', 'possibly one of the cast, unclear which', 'clearly one of the cast members'],
    );
    assert.deepEqual(
      Object.keys((sent.questions['PROTAGONIST_which'] as { criteria: Record<string, unknown> }).criteria).sort(),
      ['DESMOND', 'ILKA', 'none'],
    );
    // No screenplay prose and no secret goes on the wire — only op renderings.
    assert.ok(!bodies[0].includes(FAKE_KEY));
  });

  it('two candidates with identical questions cost one upstream call (the adapter cache)', async () => {
    process.env.TYPESAFE_CAST_ALIGNMENT = '1';
    const { transport, bodies } = answeringTransport(2, 'ILKA', 0.9);
    setTypeSafeTransport(transport);
    const state = stateWithCast();
    const a = await alignCandidateCast(candidateWithInventedName(), state, { target: TARGET });
    const b = await alignCandidateCast(candidateWithInventedName(), state, { target: TARGET });
    assert.equal(bodies.length, 1);
    assert.deepEqual(b.alignment.aligned, a.alignment.aligned);
  });

  // ── the loop hook ─────────────────────────────────────────────────────────

  it('with the flag off, convergeScene runs exactly as before — no castAlignment key in any step', async () => {
    delete process.env.TYPESAFE_CAST_ALIGNMENT;
    let calls = 0;
    setTypeSafeTransport(async () => { calls += 1; throw new Error('must not be called'); });

    const state = stateWithCast();
    const generate = async () => [candidateWithInventedName()];
    const result = await convergeScene(state, TARGET, generate, { maxIterations: 1, candidatesPerIteration: 1 }, 7);

    assert.equal(calls, 0);
    assert.equal(result.history.length, 1);
    assert.ok(!Object.prototype.hasOwnProperty.call(JSON.parse(JSON.stringify(result.history[0])), 'castAlignment'),
      'a disabled feature must not appear in the loop output at all');
    assert.equal(result.history[0].castAlignment, undefined);
  });

  it('with the flag on, every step carries the record — including when the call failed', async () => {
    process.env.TYPESAFE_CAST_ALIGNMENT = '1';
    setTypeSafeTransport(async () => { throw new Error('upstream exploded'); });

    const state = stateWithCast();
    const generate = async () => [candidateWithInventedName()];
    const result = await convergeScene(state, TARGET, generate, { maxIterations: 1, candidatesPerIteration: 1 }, 7);

    const step = result.history[0];
    assert.ok(step.castAlignment, 'a failed alignment is still recorded on the step');
    assert.equal(step.castAlignment.applied, false);
    assert.equal(step.castAlignment.reason, 'error');
    assert.equal(step.passed, false, 'and the candidate is blocked exactly as it would be today');
  });

  it('with the flag on and a confident answer, the loop proves the ALIGNED candidate', async () => {
    process.env.TYPESAFE_CAST_ALIGNMENT = '1';
    const { transport } = answeringTransport(2, 'ILKA', 0.9);
    setTypeSafeTransport(transport);

    const state = stateWithCast();
    const generate = async () => [candidateWithInventedName()];
    const result = await convergeScene(state, TARGET, generate, { maxIterations: 1, candidatesPerIteration: 1 }, 7);

    const step = result.history[0];
    assert.equal(step.castAlignment?.applied, true);
    assert.deepEqual(step.castAlignment?.aligned.map(a => `${a.from}->${a.to}`), ['PROTAGONIST->ILKA']);
    const intentional = step.tier1Results.find(r => r.proof === 'IntentionalProof');
    assert.equal(intentional?.pass, true, 'the proof ran on the aligned IR');
    const record = result.candidates[0];
    assert.ok(record.ir.ops.some(op => op.op === 'APPRAISE_EMOTION' && op.charId === 'ILKA'),
      'the candidate RECORD carries the aligned IR, so a commit would commit what was proved');
  });

  // 2026-09-21 review of PR #268, finding F1. `candidate = castAlignmentOutcome.ir`
  // used to replace only the loop-local variable; `candidates[ci]` — the array
  // `lastCandidates` aliases — still held the UNALIGNED IR. When the aligned
  // candidate then failed a different Tier-1 proof, `best` stayed null and the
  // budget-exhausted path returned `lastCandidates[last]`: the invented name
  // came back out of the loop, and /api/nvm/converge-arc applied it to
  // rollingState even though every step and record said it had been aligned.
  it('F1: an aligned candidate that still fails another Tier-1 proof is returned ALIGNED by the budget-exhausted fallback', async () => {
    process.env.TYPESAFE_CAST_ALIGNMENT = '1';
    const { transport } = answeringTransport(2, 'ILKA', 0.9);
    setTypeSafeTransport(transport);

    const state = stateWithCast();
    // sceneIdx 3 with ops and NO declared preconditions fails CausalProof
    // unconditionally (server/nvm/proof/tier1/causal.ts; the same fixture
    // tests/core/converge-loop-contract.test.ts uses) — so alignment fixes the
    // IntentionalProof block and the candidate is still rejected.
    const unaligned = { ...candidateWithInventedName(), preconditions: [] };
    const generate = async () => [unaligned];
    const result = await convergeScene(state, TARGET, generate, { maxIterations: 1, candidatesPerIteration: 1 }, 7);

    const step = result.history[0];
    assert.equal(step.castAlignment?.applied, true, 'premise: alignment was applied');
    assert.equal(step.tier1Results.find(r => r.proof === 'IntentionalProof')?.pass, true, 'premise: the name block is gone');
    assert.equal(step.passed, false, 'premise: another Tier-1 proof still blocks the candidate');
    assert.equal(result.tier1Passed, false);
    assert.equal(result.winner, null);

    const names = result.ir.ops.flatMap(op =>
      op.op === 'APPRAISE_EMOTION' ? [op.charId] : op.op === 'SHIFT_RELATIONSHIP' ? [...op.pair] : []);
    assert.ok(!names.includes('PROTAGONIST'),
      `the fallback IR must carry the ALIGNED cast, not the invented name (ops reference: ${names.join(', ')})`);
    assert.ok(names.includes('ILKA'), 'the fallback IR is the aligned candidate');
    assert.deepEqual(result.ir, result.candidates[0].ir,
      'the returned IR and the candidate record describe the same (aligned) candidate');
    assert.deepEqual(result.ghosts[0]?.ir, result.ir, 'the ghost entry agrees too');
  });
});
