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
import { buildGenerationSpec, buildSystemPreamble } from '../../../server/nvm/generate/proof-spec.ts';
import { emptyState } from '../../../server/nvm/state/NarrativeState.ts';
import { CRAFT_V1_OUTPUT_FIXTURE } from './fixtures/craft-v1-output.fixture.ts';

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

test('v2 regression: full and compact output without sceneContext remain byte-identical to v1', () => {
  assert.equal(
    buildCraftPromptSection({ enabled: true, compact: false }),
    CRAFT_V1_OUTPUT_FIXTURE.full,
  );
  assert.equal(
    buildCraftPromptSection({ enabled: true, compact: true }),
    CRAFT_V1_OUTPUT_FIXTURE.compact,
  );
});

test('v2 routing: opening context contains only applicable static emphasis', () => {
  const output = buildCraftPromptSection({
    enabled: true,
    sceneContext: {
      actPosition: '1',
      sceneFunction: 'establish_world',
      structuralTags: ['cold-open', 'new-location'],
    },
  });
  assert.match(output, /SCENE-RELEVANT EMPHASIS/);
  assert.match(output, /ACT 1 emphasis/);
  assert.match(output, /WORLD-ESTABLISHMENT function/);
  assert.match(output, /COLD OPEN/);
  assert.match(output, /NEW LOCATION/);
  assert.doesNotMatch(output, /CLIMAX ZONE emphasis/);
});

test('v2 routing: climax tension context contains only applicable static emphasis', () => {
  const output = buildCraftPromptSection({
    enabled: true,
    sceneContext: {
      actPosition: '3',
      sceneFunction: 'build_tension',
      structuralTags: ['two-hander'],
    },
  });
  assert.match(output, /CLIMAX ZONE emphasis/);
  assert.match(output, /TENSION-BUILD function/);
  assert.match(output, /TWO-HANDER/);
  assert.doesNotMatch(output, /ACT 1 emphasis/);
  assert.doesNotMatch(output, /WORLD-ESTABLISHMENT function/);
});

test('v2 routing: empty sceneContext adds no emphasis block', () => {
  assert.doesNotMatch(
    buildCraftPromptSection({ enabled: true, sceneContext: {} }),
    /SCENE-RELEVANT EMPHASIS/,
  );
});

test('v2 wiring: buildGenerationSpec constructs opening target-aware craft context', () => {
  const state = emptyState();
  const spec = buildGenerationSpec(
    state,
    { sceneIdx: 0, sceneFunction: 'establish_world', activeMechanisms: [], tensionTarget: 30 },
    [],
  );
  assert.match(spec.systemPreamble, /ACT 1 emphasis/);
  assert.match(spec.systemPreamble, /WORLD-ESTABLISHMENT function/);
  assert.doesNotMatch(spec.systemPreamble, /CLIMAX ZONE emphasis/);
});

test('v2 wiring: buildGenerationSpec constructs climax target-aware craft context', () => {
  const base = emptyState();
  const state = {
    ...base,
    audienceState: { ...base.audienceState, suspense: 90, investment: 88 },
  };
  const spec = buildGenerationSpec(
    state,
    { sceneIdx: 8, sceneFunction: 'build_tension', activeMechanisms: [], tensionTarget: 95 },
    [],
  );
  assert.match(spec.systemPreamble, /CLIMAX ZONE emphasis/);
  assert.match(spec.systemPreamble, /TENSION-BUILD function/);
  assert.doesNotMatch(spec.systemPreamble, /ACT 1 emphasis/);
});

test('v2 wiring: buildSystemPreamble without a target remains flat', () => {
  const preamble = buildSystemPreamble([], emptyState());
  assert.match(preamble, /CRAFT SPEC/);
  assert.doesNotMatch(preamble, /SCENE-RELEVANT EMPHASIS/);
});
