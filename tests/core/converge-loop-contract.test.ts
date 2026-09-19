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
