// 2026-09-19 converge-contract lane (C11) — convergeScene()'s result used to
// describe TWO different IRs at once when nothing passed Tier 1 (`ir` was the
// last-evaluated/rejected candidate while `finalComposite` was `best`'s score
// — 0 when `best` was null, since nothing ever set it), and a fallback path
// could spend one more `generate()` call than `budget.maxLLMCalls` allowed.
// This file drives server/nvm/converge/loop.ts directly (see
// tests/nvm/generate/craft-convergence.test.ts for the same
// direct-convergeScene()-call convention) with fake CandidateGenerators, so
// it needs no LLM key and is deterministic.
import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { convergeScene } from '../../server/nvm/converge/loop.ts';
import type { CandidateGenerator, SceneTarget } from '../../server/nvm/generate/proof-spec.ts';
import type { NarrativeTransitionIR } from '../../server/nvm/ir/NarrativeTransitionIR.ts';
import { emptyState, stateHash } from '../../server/nvm/state/NarrativeState.ts';

const REAL_MECHANISM = 'relationship_externalization'; // a real *.mech.json id — MechanismProof requires one

// sceneIdx > 0 with ops and NO declared preconditions fails CausalProof
// unconditionally (server/nvm/proof/tier1/causal.ts) — the same deterministic
// "every candidate fails Tier 1" fixture tests/routes/nvm-converge-select.test.ts
// uses for its sceneIdx-3 case.
function makeFailingGenerator(state: ReturnType<typeof emptyState>, target: SceneTarget): { generate: CandidateGenerator; calls: () => number } {
  let calls = 0;
  let idx = 0;
  const generate: CandidateGenerator = async (spec, n) => {
    calls += 1;
    return Array.from({ length: n }, (): NarrativeTransitionIR => ({
      transitionId: `fail-${idx++}`,
      sceneIdx: target.sceneIdx,
      sceneFunction: target.sceneFunction,
      activeMechanisms: target.activeMechanisms,
      beforeStateHash: stateHash(state),
      ops: [{ op: 'UPDATE_READER_STATE', delta: { suspense: 5, curiosity: 3 } }],
      preconditions: [],
      postconditions: [],
      provenance: { origin: 'model_generated', createdAt: 0 },
    }));
  };
  return { generate, calls: () => calls };
}

test('(5) when every candidate fails Tier 1: tier1Passed is false, winner is null, and finalComposite describes result.ir (not 0, not best\'s)', async () => {
  const state = emptyState();
  const target: SceneTarget = {
    sceneIdx: 3, sceneFunction: 'build_tension',
    activeMechanisms: [REAL_MECHANISM], tensionTarget: 50,
  };
  const { generate } = makeFailingGenerator(state, target);

  const result = await convergeScene(state, target, generate, {
    maxIterations: 2, candidatesPerIteration: 2,
  }, 1);

  assert.equal(result.tier1Passed, false, 'tier1Passed must be false — nothing ever passed Tier 1');
  assert.equal(result.winner, null, 'winner must be null — nothing is safe to commit');
  assert.ok(result.ir, 'ir must still be populated for diagnostics');
  assert.equal(result.ir.ops.length, 1, 'sanity: result.ir is one of the rejected candidates, not an empty synthesized stub');

  // finalComposite/finalValuation/finalQuality must all describe result.ir —
  // recompute the SAME composite formula the loop itself uses (0.6*tensionNorm
  // + 0.4*qualityScore, tension normalized against target.tensionTarget) and
  // assert finalComposite matches it exactly, not 0 and not some other IR's score.
  const { applyStoryOps } = await import('../../server/nvm/ops/dispatcher.ts');
  const { deriveTensionLedger } = await import('../../server/nvm/valuation/futures.ts');
  const { runQualityEngine } = await import('../../server/nvm/quality/index.ts');
  const postState = applyStoryOps(state, result.ir.ops);
  const ledger = deriveTensionLedger(postState, target.sceneIdx);
  const quality = runQualityEngine(result.ir, state);
  const tensionNorm = Math.max(0, Math.min(100, (ledger.totalTension / target.tensionTarget) * 100));
  const expectedComposite = 0.6 * tensionNorm + 0.4 * quality.score;

  assert.equal(result.finalValuation, ledger.totalTension, 'finalValuation must describe result.ir');
  assert.equal(result.finalQuality, quality.score, 'finalQuality must describe result.ir');
  assert.ok(Math.abs(result.finalComposite - expectedComposite) < 1e-9,
    `finalComposite (${result.finalComposite}) must equal the composite recomputed for result.ir (${expectedComposite}) — not 0, not best's (there is no best)`);
  assert.notEqual(result.finalComposite, 0, 'the old bug returned exactly 0 here (bestComposite defaulted to 0 when nothing passed Tier 1)');
});

test('(6) budget.maxLLMCalls caps total generate() calls — was 4, now ≤ 3 (off-by-one in the last-resort fallback\'s `<=` check)', async () => {
  const state = emptyState();
  const target: SceneTarget = {
    sceneIdx: 3, sceneFunction: 'build_tension',
    activeMechanisms: [REAL_MECHANISM], tensionTarget: 50,
  };
  let calls = 0;
  // A generator that returns NO candidates at all (e.g. the LLM's response
  // failed to parse into anything) — this is exactly what leaves
  // `lastCandidates` empty at the end of the main loop, so `finalIR` is null
  // there and the last-resort fallback path is the one under test.
  const generate: CandidateGenerator = async () => {
    calls += 1;
    return [];
  };

  // maxIterations * candidatesPerIteration === maxLLMCalls, so the main loop
  // exactly exhausts the declared budget (3 calls) on its own, with none left
  // over — any call beyond that is the fallback's off-by-one, not a
  // legitimately-still-budgeted main-loop call.
  const result = await convergeScene(state, target, generate, {
    maxIterations: 3, candidatesPerIteration: 1, maxLLMCalls: 3,
  }, 1);

  assert.ok(calls <= 3, `expected ≤ 3 generate() calls under maxLLMCalls:3, got ${calls}`);
  assert.equal(calls, 3, 'the main loop alone should exactly exhaust the 3-call budget; the fallback must not add a 4th');
  void result;
});

test('(7) the synthesized last-resort IR is identifiable via provenance.model === \'stub\' (isStubIR convention, matches llm-generator.ts\'s stubIR())', async () => {
  const state = emptyState();
  const target: SceneTarget = {
    sceneIdx: 3, sceneFunction: 'build_tension',
    activeMechanisms: [REAL_MECHANISM], tensionTarget: 50,
  };
  // Same "returns nothing" generator as test 6 — this is what forces the loop
  // all the way down to the synthesized pass-through IR (empty ops, no
  // candidate — real or fallback — was ever produced).
  const generate: CandidateGenerator = async () => [];

  const result = await convergeScene(state, target, generate, {
    maxIterations: 1, candidatesPerIteration: 1, maxLLMCalls: 0,
  }, 1);

  assert.equal(result.tier1Passed, false);
  assert.equal(result.winner, null);
  assert.equal(result.ir.ops.length, 0, 'sanity: this is the synthesized pass-through IR, not a real candidate');
  assert.equal(result.ir.provenance.model, 'stub',
    'the synthesized last-resort IR must be labelled model: "stub" so no consumer counts it as real model output');
});

// ── (8)-(9) cast grounding, end to end through convergeScene (2026-09-19) ────
// The route layer builds its own generator (`makeLLMCandidateGenerator()` in
// server/routes/nvm/converge.ts) and exposes no seam to replace it, so the
// deterministic before/after on `tier1Passed` lives HERE, at the loop, in the
// same fake-generator style as the tests above. The route's own coverage is
// tests/routes/nvm-converge-validation.test.ts — that `cast` reaches the loop
// at all, with a 200 and a 400.

/** The candidate the bench's generator actually produced: an invented name that grounds itself. */
function selfGroundingGenerator(target: SceneTarget): CandidateGenerator {
  return async (_spec, n) => Array.from({ length: n }, (_v, i): NarrativeTransitionIR => ({
    transitionId: `invented-${i}`,
    sceneIdx: target.sceneIdx,
    sceneFunction: target.sceneFunction,
    activeMechanisms: target.activeMechanisms,
    beforeStateHash: 'hash',
    ops: [
      { op: 'UPDATE_BELIEF', charId: 'Char1', belief: {
        id: 'b-char1', proposition: 'nobody is coming', confidence: 0.8,
        source: 'witnessed', source_event_id: 'e-0', acquired_at: 0,
      } },
      { op: 'APPRAISE_EMOTION', charId: 'Char1', emotion: {
        joy: 0, distress: 60, anger: 0, fear: 10, pride: 0, shame: 0,
        dominant: 'distress', intensity: 60, last_updated_at: 0,
      } },
    ],
    preconditions: [],
    postconditions: [],
    // ProvenanceProof blocks a falsy createdAt, so this is a real timestamp:
      // Tier 1 must hinge on IntentionalProof alone here.
      provenance: { origin: 'model_generated', createdAt: 1_700_000_000_000, model: 'test-model' },
  }));
}

const CAST_TARGET_BASE: SceneTarget = {
  sceneIdx: 0, sceneFunction: 'build_tension',
  activeMechanisms: [REAL_MECHANISM], tensionTarget: 50,
};

test('(8) a candidate that invents a character and grounds it itself: tier1Passed is TRUE with no cast, FALSE once the caller names the cast', async () => {
  const state = emptyState();

  const withoutCast = await convergeScene(
    state, CAST_TARGET_BASE, selfGroundingGenerator(CAST_TARGET_BASE),
    { maxIterations: 1, candidatesPerIteration: 1 }, 1,
  );
  assert.equal(withoutCast.tier1Passed, true,
    'pinned: without a cast the IR grounds itself and Tier 1 accepts an invented character');

  const target: SceneTarget = { ...CAST_TARGET_BASE, cast: ['MAYA', 'DEV'] };
  const withCast = await convergeScene(
    state, target, selfGroundingGenerator(target),
    { maxIterations: 1, candidatesPerIteration: 1 }, 1,
  );
  assert.equal(withCast.tier1Passed, false, 'with a cast, an invented character is a Tier 1 block');
  assert.equal(withCast.winner, null, 'and nothing is offered as safe to commit');
  // Attribution, not just a boolean: ghostReason is the coarse 'proof_fail',
  // so the named proof comes from the per-candidate record's tier1Failures.
  const failures = withCast.candidates.flatMap(c => c.tier1Failures);
  assert.ok(failures.length > 0, 'a blocked candidate must record which proofs blocked it');
  assert.ok(failures.includes('IntentionalProof'),
    `the block must be attributed to IntentionalProof, got: ${failures.join(' | ')}`);
  assert.deepEqual([...new Set(failures)], ['IntentionalProof'],
    'and to IntentionalProof ALONE — otherwise this test would pass on an unrelated Tier 1 failure');
  // The step that judged it must also carry the invented name.
  const intentional = withCast.history
    .flatMap(step => step.tier1Results)
    .filter(r => r.proof === 'IntentionalProof' && !r.pass);
  assert.ok(intentional.length > 0);
  assert.ok(intentional.every(r => r.findings.every(f => f.subjectId === 'Char1')),
    'the finding must name the invented character');
});

test('(9) the 17-blocks case: a real cast member referenced at scene 0 with an empty state is blocked WITHOUT a cast and passes WITH one', async () => {
  const state = emptyState();
  const makeGen = (t: SceneTarget): CandidateGenerator => async (_spec, n) =>
    Array.from({ length: n }, (_v, i): NarrativeTransitionIR => ({
      transitionId: `cast-ref-${i}`,
      sceneIdx: t.sceneIdx,
      sceneFunction: t.sceneFunction,
      activeMechanisms: t.activeMechanisms,
      beforeStateHash: 'hash',
      ops: [{ op: 'APPRAISE_EMOTION', charId: 'MAYA', emotion: {
        joy: 0, distress: 60, anger: 0, fear: 10, pride: 0, shame: 0,
        dominant: 'distress', intensity: 60, last_updated_at: 0,
      } }],
      preconditions: [],
      postconditions: [],
      // ProvenanceProof blocks a falsy createdAt, so this is a real timestamp:
      // Tier 1 must hinge on IntentionalProof alone here.
      provenance: { origin: 'model_generated', createdAt: 1_700_000_000_000, model: 'test-model' },
    }));

  const blocked = await convergeScene(
    state, CAST_TARGET_BASE, makeGen(CAST_TARGET_BASE),
    { maxIterations: 1, candidatesPerIteration: 1 }, 1,
  );
  assert.equal(blocked.tier1Passed, false, 'pinned: this is the block the story bench hit 17 times');

  const target: SceneTarget = { ...CAST_TARGET_BASE, cast: ['MAYA', 'DEV'] };
  const passes = await convergeScene(
    state, target, makeGen(target),
    { maxIterations: 1, candidatesPerIteration: 1 }, 1,
  );
  assert.equal(passes.tier1Passed, true, 'with the cast supplied, the same candidate is legal');
});
