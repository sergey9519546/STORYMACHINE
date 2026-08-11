// Tests for the craft-spec module (server/nvm/generate/craft-spec.ts) — the
// injectable screenwriting-mechanism guidance for the generative shell.
// LLMs SENSE/GENERATE only in this codebase; this module is pure
// prompt-construction data/string-building and must never reach the
// deterministic doctor/scoring path. These tests verify the module's own
// contract plus one integration point (proof-spec.ts's buildSystemPreamble,
// which feeds the candidate generator) — no real LLM call is made anywhere.

import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import {
  CRAFT_SPEC,
  CRAFT_SPEC_VERSION,
  buildCraftPromptSection,
  craftSpecEnabled,
  looksLikeAnimationGenre,
} from '../../../server/nvm/generate/craft-spec.ts';
import { buildSystemPreamble, buildGenerationSpec } from '../../../server/nvm/generate/proof-spec.ts';
import { emptyState } from '../../../server/nvm/state/NarrativeState.ts';

// ── Module shape ──────────────────────────────────────────────────────────

test('CRAFT_SPEC: every section is present and non-empty', () => {
  const sections = [
    'sceneConstruction', 'dialogue', 'reversals', 'pacing',
    'exposition', 'conflictArchitecture', 'animation', 'failureModes',
  ] as const;
  for (const key of sections) {
    const section = CRAFT_SPEC[key];
    assert.ok(section, `CRAFT_SPEC.${key} should exist`);
    assert.ok(typeof section.title === 'string' && section.title.length > 0, `${key}.title should be non-empty`);
    assert.ok(Array.isArray(section.directives) && section.directives.length > 0, `${key}.directives should be non-empty`);
    for (const d of section.directives) {
      assert.ok(typeof d === 'string' && d.trim().length > 0, `${key} directive should be a non-empty string`);
    }
  }
});

test('CRAFT_SPEC_VERSION is a non-empty string', () => {
  assert.ok(typeof CRAFT_SPEC_VERSION === 'string' && CRAFT_SPEC_VERSION.length > 0);
});

// ── buildCraftPromptSection: animation option ───────────────────────────────

test('buildCraftPromptSection: excludes animation section by default', () => {
  const block = buildCraftPromptSection({ enabled: true });
  assert.ok(!block.includes('Animation-Specific Technique'), 'animation section should be excluded by default');
});

test('buildCraftPromptSection: includes animation section when requested', () => {
  const block = buildCraftPromptSection({ enabled: true, animation: true });
  assert.ok(block.includes('Animation-Specific Technique'), 'animation section should be included when animation:true');
  // Spot-check one animation-specific directive marker survives into the block.
  assert.ok(block.includes('dual register'), 'animation directive content should be present');
});

// ── buildCraftPromptSection: compact option ────────────────────────────────

test('buildCraftPromptSection: compact mode produces a shorter block than full', () => {
  const full = buildCraftPromptSection({ enabled: true, animation: true, compact: false });
  const compact = buildCraftPromptSection({ enabled: true, animation: true, compact: true });
  assert.ok(compact.length < full.length, 'compact block should be shorter than the full block');
  assert.ok(compact.length > 0, 'compact block should still be non-empty');
});

// ── buildCraftPromptSection: enabled / escape hatch ────────────────────────

test('buildCraftPromptSection: opts.enabled=false returns empty string', () => {
  assert.equal(buildCraftPromptSection({ enabled: false }), '');
});

test('craftSpecEnabled: defaults to true when env var unset', () => {
  const prev = process.env.STORYMACHINE_DISABLE_CRAFT_SPEC;
  delete process.env.STORYMACHINE_DISABLE_CRAFT_SPEC;
  try {
    assert.equal(craftSpecEnabled(), true);
  } finally {
    if (prev !== undefined) process.env.STORYMACHINE_DISABLE_CRAFT_SPEC = prev;
  }
});

test('craftSpecEnabled: env var "1" disables it, and buildCraftPromptSection respects the env escape hatch', () => {
  const prev = process.env.STORYMACHINE_DISABLE_CRAFT_SPEC;
  process.env.STORYMACHINE_DISABLE_CRAFT_SPEC = '1';
  try {
    assert.equal(craftSpecEnabled(), false);
    assert.equal(buildCraftPromptSection({}), '', 'block should be empty when env escape hatch is set and opts.enabled is unset');
  } finally {
    if (prev === undefined) delete process.env.STORYMACHINE_DISABLE_CRAFT_SPEC;
    else process.env.STORYMACHINE_DISABLE_CRAFT_SPEC = prev;
  }
});

// ── Key directive markers required by the design brief ──────────────────────

test('buildCraftPromptSection: contains the four-step framing and output-discipline rule', () => {
  const block = buildCraftPromptSection({ enabled: true });
  assert.ok(block.includes('RECOGNIZE'), 'should include RECOGNIZE step');
  assert.ok(block.includes('CONSTRUCT'), 'should include CONSTRUCT step');
  assert.ok(block.includes('TEST'), 'should include TEST step');
  assert.ok(block.includes('REWRITE'), 'should include REWRITE step');
  assert.ok(block.includes('OUTPUT DISCIPLINE'), 'should include the output-discipline rule');
  assert.ok(
    /never as resemblance to any specific existing scene/i.test(block),
    'output discipline should forbid resemblance to specific existing scenes',
  );
});

test('buildCraftPromptSection: contains core scene-construction and reversal markers', () => {
  const block = buildCraftPromptSection({ enabled: true });
  assert.ok(block.includes('Enter late'), 'should include the "Enter late" directive');
  assert.ok(block.includes('Exit on rupture'), 'should include the "Exit on rupture" directive');
});

test('buildCraftPromptSection: includes the failure-mode list', () => {
  const block = buildCraftPromptSection({ enabled: true });
  assert.ok(block.includes('Common Failure Modes to Avoid'), 'should include the failure-mode section header');
  for (const directive of CRAFT_SPEC.failureModes.directives) {
    assert.ok(block.includes(directive), `failure mode block should include: ${directive}`);
  }
});

// ── looksLikeAnimationGenre heuristic ───────────────────────────────────────

test('looksLikeAnimationGenre: matches animation-flavored genre strings', () => {
  assert.equal(looksLikeAnimationGenre('animation'), true);
  assert.equal(looksLikeAnimationGenre('Animated Family Comedy'), true);
  assert.equal(looksLikeAnimationGenre('thriller'), false);
  assert.equal(looksLikeAnimationGenre(undefined), false);
  assert.equal(looksLikeAnimationGenre(null), false);
  assert.equal(looksLikeAnimationGenre(''), false);
});

// ── Integration: the candidate-generation prompt builder actually includes
// the craft block. proof-spec.ts's buildSystemPreamble() is the pure
// function llm-generator.ts's makeLLMCandidateGenerator() calls to build the
// prompt sent to the LLM — this checks the assembled prompt without invoking
// any real provider/network call. ──────────────────────────────────────────

test('integration: buildSystemPreamble (candidate generation prompt) includes the craft block', () => {
  const prevEnv = process.env.STORYMACHINE_DISABLE_CRAFT_SPEC;
  delete process.env.STORYMACHINE_DISABLE_CRAFT_SPEC;
  try {
    const state = emptyState();
    const preamble = buildSystemPreamble([], state);
    assert.ok(preamble.includes(`CRAFT SPEC (${CRAFT_SPEC_VERSION})`), 'system preamble should include the craft spec header');
    assert.ok(preamble.includes('Enter late'), 'system preamble should include craft directive content');
    assert.ok(preamble.includes('PROOF CONSTRAINTS'), 'system preamble should still include the proof-constraints section (craft spec is additive)');
  } finally {
    if (prevEnv !== undefined) process.env.STORYMACHINE_DISABLE_CRAFT_SPEC = prevEnv;
  }
});

test('integration: buildSystemPreamble omits the craft block when the escape hatch env var is set', () => {
  const prevEnv = process.env.STORYMACHINE_DISABLE_CRAFT_SPEC;
  process.env.STORYMACHINE_DISABLE_CRAFT_SPEC = 'true';
  try {
    const state = emptyState();
    const preamble = buildSystemPreamble([], state);
    assert.ok(!preamble.includes('CRAFT SPEC'), 'system preamble should omit the craft spec header when disabled via env');
    assert.ok(preamble.includes('PROOF CONSTRAINTS'), 'the rest of the preamble should be unaffected');
  } finally {
    if (prevEnv === undefined) delete process.env.STORYMACHINE_DISABLE_CRAFT_SPEC;
    else process.env.STORYMACHINE_DISABLE_CRAFT_SPEC = prevEnv;
  }
});

// ── v2: per-scene craft directive routing ─────────────────────────────────
// The v2 addition widens CraftPromptOptions with an optional sceneContext.
// When absent, the output must be byte-identical to v1 (existing callers
// proof-spec.ts and rewrite.ts see zero change). When present, a
// scene-relevant emphasis block is prepended so scene 0 and the climax no
// longer receive identical guidance.

test('v2 regression: buildCraftPromptSection() with no sceneContext is byte-identical to v1', () => {
  // The v1 flat render: header + FOUR_STEP_FRAMING + body + failureModes + OUTPUT_DISCIPLINE,
  // with NO "SCENE-RELEVANT EMPHASIS" block. This is the contract existing callers rely on.
  const out = buildCraftPromptSection();
  assert.ok(!out.includes('SCENE-RELEVANT EMPHASIS'),
    'no-context output must not contain the v2 emphasis block');
  assert.ok(out.includes('CRAFT SPEC'), 'header present');
  assert.ok(out.includes('RECOGNIZE'), 'FOUR_STEP_FRAMING present');
  assert.ok(out.includes('Scene Construction:'), 'body section present');
  assert.ok(out.includes('Common Failure Modes'), 'failureModes present');
  assert.ok(out.includes('OUTPUT DISCIPLINE'), 'output discipline present');
});

test('v2 regression: sceneContext absent on both call sites (compact + full) produces no emphasis block', () => {
  for (const compact of [true, false]) {
    const out = buildCraftPromptSection({ compact });
    assert.ok(!out.includes('SCENE-RELEVANT EMPHASIS'),
      `compact=${compact}: no emphasis block without sceneContext`);
  }
});

test('v2 routing: act-3 climax-zone context emphasizes cross-cut + escalate-cut-frequency', () => {
  const out = buildCraftPromptSection({
    sceneContext: { actPosition: '3', pctThroughScript: 0.85 },
  });
  assert.ok(out.includes('SCENE-RELEVANT EMPHASIS'), 'emphasis block present');
  assert.ok(out.includes('CLIMAX ZONE'), 'act-3 climax emphasis present');
  assert.ok(out.includes('escalate cut frequency'), 'cross-cut directive emphasized');
  assert.ok(out.includes('Scene Construction:'), 'full body still present after emphasis');
});

test('v2 routing: act-1 first-half context emphasizes enter-late + world-establishment', () => {
  const out = buildCraftPromptSection({
    sceneContext: { actPosition: '1', pctThroughScript: 0.1 },
  });
  assert.ok(out.includes('ACT 1 emphasis'), 'act-1 emphasis present');
  assert.ok(out.includes('enter late'), 'enter-late directive emphasized');
});

test('v2 routing: sceneFunction drives function-specific emphasis', () => {
  const setupOut = buildCraftPromptSection({
    sceneContext: { sceneFunction: 'set_up_payoff' },
  });
  assert.ok(setupOut.includes('SETUP/PAYOFF function'), 'setup/payoff emphasis present');
  assert.ok(setupOut.includes('long-range setup'), 'long-range-setup directive emphasized');

  const worldOut = buildCraftPromptSection({
    sceneContext: { sceneFunction: 'establish_world' },
  });
  assert.ok(worldOut.includes('WORLD-ESTABLISHMENT function'), 'world-establishment emphasis present');
});

test('v2 routing: structuralTags drive tag-specific emphasis', () => {
  const out = buildCraftPromptSection({
    sceneContext: { structuralTags: ['two-hander', 'montage', 'cold-open'] },
  });
  assert.ok(out.includes('TWO-HANDER'), 'two-hander tag emphasis present');
  assert.ok(out.includes('MONTAGE'), 'montage tag emphasis present');
  assert.ok(out.includes('COLD OPEN'), 'cold-open tag emphasis present');
});

test('v2 routing: empty sceneContext (all fields undefined) produces no emphasis block', () => {
  const out = buildCraftPromptSection({ sceneContext: {} });
  assert.ok(!out.includes('SCENE-RELEVANT EMPHASIS'),
    'empty sceneContext should not emit an emphasis block');
});

test('v2 routing: different scenes get different emphasis (anti-flattening core property)', () => {
  // The whole point of v2: scene 0 and the climax must NOT receive identical
  // craft guidance. Verify two materially different contexts produce different
  // emphasis blocks — this is the anti-flattening property.
  const opening = buildCraftPromptSection({
    sceneContext: { actPosition: '1', pctThroughScript: 0.05, sceneFunction: 'establish_world', structuralTags: ['cold-open', 'new-location'] },
  });
  const climax = buildCraftPromptSection({
    sceneContext: { actPosition: '3', pctThroughScript: 0.9, sceneFunction: 'build_tension', structuralTags: ['two-hander'] },
  });
  assert.notEqual(opening, climax, 'opening and climax contexts must produce different craft blocks');
  assert.ok(opening.includes('ACT 1') && !opening.includes('CLIMAX ZONE'), 'opening has act-1 not act-3');
  assert.ok(climax.includes('CLIMAX ZONE') && !climax.includes('ACT 1 emphasis'), 'climax has act-3 not act-1');
});

// ── v2 wiring: buildGenerationSpec threads the target into the preamble ────
// These integration tests prove the sceneContext routing actually fires at the
// real generation call site (not just when buildCraftPromptSection is called
// directly with a hand-built context). buildGenerationSpec is the function
// the converge loop calls; its preamble must now carry scene-differentiated
// craft emphasis.

test('v2 wiring: buildGenerationSpec for scene 0 emphasizes act-1 cold-open craft', () => {
  const state = emptyState();
  const spec = buildGenerationSpec(
    state,
    { sceneIdx: 0, sceneFunction: 'establish_world', activeMechanisms: [], tensionTarget: 30 },
    [],
  );
  assert.ok(spec.systemPreamble.includes('CRAFT SPEC'), 'craft block present');
  assert.ok(spec.systemPreamble.includes('SCENE-RELEVANT EMPHASIS'), 'emphasis block wired in');
  assert.ok(spec.systemPreamble.includes('ACT 1 emphasis'), 'scene 0 gets act-1 emphasis');
  assert.ok(spec.systemPreamble.includes('WORLD-ESTABLISHMENT'), 'establish_world function emphasized');
  assert.ok(!spec.systemPreamble.includes('CLIMAX ZONE'), 'scene 0 does not get climax emphasis');
});

test('v2 wiring: buildGenerationSpec in climax-zone audience state emphasizes act-3 craft', () => {
  const state = emptyState();
  // Climax-zone audience state: suspense + investment near ceiling (the
  // signal buildSystemPreamble uses to infer the act-3 position)
  const climaxState = {
    ...state,
    audienceState: { ...state.audienceState, suspense: 90, investment: 88 },
  };
  const spec = buildGenerationSpec(
    climaxState,
    { sceneIdx: 8, sceneFunction: 'build_tension', activeMechanisms: [], tensionTarget: 95 },
    [],
  );
  assert.ok(spec.systemPreamble.includes('CLIMAX ZONE'), 'climax-zone state gets act-3 emphasis');
  assert.ok(spec.systemPreamble.includes('escalate cut frequency'), 'cross-cut directive emphasized');
  assert.ok(!spec.systemPreamble.includes('ACT 1 emphasis'), 'climax does not get act-1 emphasis');
});

test('v2 wiring: buildSystemPreamble with no target is byte-identical to v1 (existing callers)', () => {
  // proof-spec.ts's buildSystemPreamble gains an optional 3rd `target` param.
  // Existing callers that don't pass it (e.g. some tests, any future caller)
  // must get the exact v1 preamble — no sceneContext, no emphasis block.
  const state = emptyState();
  const preamble = buildSystemPreamble([], state);
  assert.ok(!preamble.includes('SCENE-RELEVANT EMPHASIS'),
    'no-target preamble must not contain the v2 emphasis block');
  assert.ok(preamble.includes('CRAFT SPEC'), 'craft block still present');
  assert.ok(preamble.includes('PROOF CONSTRAINTS'), 'rest of preamble intact');
});

test('v2 wiring: scene 0 and climax preambles are different (end-to-end anti-flattening)', () => {
  const base = emptyState();
  const opening = buildGenerationSpec(
    base,
    { sceneIdx: 0, sceneFunction: 'establish_world', activeMechanisms: [], tensionTarget: 30 },
    [],
  ).systemPreamble;
  const climax = buildGenerationSpec(
    { ...base, audienceState: { ...base.audienceState, suspense: 92, investment: 90 } },
    { sceneIdx: 10, sceneFunction: 'build_tension', activeMechanisms: [], tensionTarget: 98 },
    [],
  ).systemPreamble;
  assert.notEqual(opening, climax, 'opening and climax preambles must differ');
});
