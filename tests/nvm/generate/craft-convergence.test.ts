import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { convergeScene, type ConvergeBudget } from '../../../server/nvm/converge/loop.ts';
import type {
  CandidateGenerator,
  GenerationSpec,
  SceneTarget,
} from '../../../server/nvm/generate/proof-spec.ts';
import type { NarrativeTransitionIR } from '../../../server/nvm/ir/NarrativeTransitionIR.ts';
import {
  emptyState,
  stateHash,
  type NarrativeState,
} from '../../../server/nvm/state/NarrativeState.ts';

async function captureConvergencePreamble(
  state: NarrativeState,
  target: SceneTarget,
  budgetOverrides: Partial<ConvergeBudget> = {},
): Promise<string> {
  const captured: GenerationSpec[] = [];
  const generate: CandidateGenerator = async (spec, n) => {
    captured.push(spec);
    return Array.from({ length: n }, (_, index): NarrativeTransitionIR => ({
      transitionId: `captured-${index}`,
      sceneIdx: target.sceneIdx,
      sceneFunction: target.sceneFunction,
      activeMechanisms: [],
      beforeStateHash: stateHash(state),
      ops: [],
      preconditions: [],
      postconditions: [],
      provenance: { origin: 'model_generated', createdAt: 0 },
    }));
  };

  await convergeScene(
    state,
    target,
    generate,
    {
      maxIterations: 1,
      candidatesPerIteration: 1,
      maxLLMCalls: 1,
      ...budgetOverrides,
    },
    7,
  );

  assert.ok(captured[0], 'convergeScene must invoke the CandidateGenerator');
  return captured[0].systemPreamble;
}

test('convergeScene preserves scene-aware craft routing at the CandidateGenerator seam', async () => {
  const previous = process.env.STORYMACHINE_DISABLE_CRAFT_SPEC;
  delete process.env.STORYMACHINE_DISABLE_CRAFT_SPEC;

  try {
    const openingState = emptyState();
    const openingTarget: SceneTarget = {
      sceneIdx: 0,
      sceneFunction: 'establish_world',
      activeMechanisms: [],
      tensionTarget: 30,
    };
    const opening = await captureConvergencePreamble(openingState, openingTarget);
    assert.match(opening, /ACT 1 emphasis/);
    assert.match(opening, /WORLD-ESTABLISHMENT function/);
    assert.doesNotMatch(opening, /CLIMAX ZONE emphasis/);

    const base = emptyState();
    const climaxState: NarrativeState = {
      ...base,
      audienceState: { ...base.audienceState, suspense: 92, investment: 90 },
    };
    const climaxTarget: SceneTarget = {
      sceneIdx: 8,
      sceneFunction: 'build_tension',
      activeMechanisms: [],
      tensionTarget: 95,
    };
    const climax = await captureConvergencePreamble(climaxState, climaxTarget);
    assert.match(climax, /CLIMAX ZONE emphasis/);
    assert.match(climax, /TENSION-BUILD function/);
    assert.doesNotMatch(climax, /ACT 1 emphasis/);

    const bibleSummary = 'BIBLE SUMMARY: Mina guards the last signal.';
    const withBible = await captureConvergencePreamble(openingState, openingTarget, { bibleSummary });
    assert.ok(withBible.startsWith(`${bibleSummary}\n\n`), 'bible summary remains the preamble prefix');
    assert.match(withBible, /ACT 1 emphasis/);
    assert.match(withBible, /WORLD-ESTABLISHMENT function/);

    process.env.STORYMACHINE_DISABLE_CRAFT_SPEC = '1';
    const disabled = await captureConvergencePreamble(openingState, openingTarget);
    assert.doesNotMatch(disabled, /CRAFT SPEC/);
    assert.doesNotMatch(disabled, /SCENE-RELEVANT EMPHASIS/);

    assert.notEqual(opening, climax, 'opening and climax captured preambles must differ');
  } finally {
    if (previous === undefined) delete process.env.STORYMACHINE_DISABLE_CRAFT_SPEC;
    else process.env.STORYMACHINE_DISABLE_CRAFT_SPEC = previous;
  }
});
