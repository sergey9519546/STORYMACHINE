// Tests for the voice-swap-risk → generation-constraint adapter
// (server/nvm/generate/voice-constraint.ts).
//
// This adapter closes the loop between voice-delta's analysis (which flags
// characters with indistinguishable voices) and generation (which had no
// feedback signal to prevent voice collapse). It is pure prompt-construction
// — no LLM, no scoring — and must never import from the analyzer path.
// These tests verify the adapter's own contract: the right constraints fire
// on swap-risk pairs, none fire when voices are distinct or analysis is
// absent/unscored, and the boundary holds (no analyzer import).

import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { voiceConstraintsFromAnalysis } from '../../../server/nvm/generate/voice-constraint.ts';

test('voiceConstraintsFromAnalysis: null/undefined input → no constraints (graceful degradation)', () => {
  assert.deepEqual(voiceConstraintsFromAnalysis(null), []);
  assert.deepEqual(voiceConstraintsFromAnalysis(undefined), []);
});

test('voiceConstraintsFromAnalysis: unscored analysis → no constraints', () => {
  // analyzeVoices returns scored:false when <2 chars or any char has <30 words.
  // The adapter must respect that abstention, not invent constraints.
  assert.deepEqual(voiceConstraintsFromAnalysis({ pairs: [], scored: false }), []);
});

test('voiceConstraintsFromAnalysis: scored analysis with no swap-risk pairs → no constraints', () => {
  // All pairs above the 0.15 threshold — distinct voices, nothing to fix.
  const analysis = {
    scored: true,
    pairs: [
      { a: 'HERO', b: 'VILLAIN', delta: 0.45, swapRisk: false },
      { a: 'HERO', b: 'MENTOR', delta: 0.62, swapRisk: false },
    ],
  };
  assert.deepEqual(voiceConstraintsFromAnalysis(analysis), []);
});

test('voiceConstraintsFromAnalysis: one swap-risk pair → exactly one constraint naming both characters', () => {
  const analysis = {
    scored: true,
    pairs: [
      { a: 'HERO', b: 'VILLAIN', delta: 0.08, swapRisk: true },  // indistinguishable
      { a: 'HERO', b: 'MENTOR', delta: 0.51, swapRisk: false },  // distinct
    ],
  };
  const constraints = voiceConstraintsFromAnalysis(analysis);
  assert.equal(constraints.length, 1);
  assert.equal(constraints[0].kind, 'free_form');
  assert.ok(constraints[0].description.includes('HERO'), 'names first character');
  assert.ok(constraints[0].description.includes('VILLAIN'), 'names second character');
  assert.ok(constraints[0].description.includes('0.080'), 'includes the measured delta');
  assert.ok(/differentiate|distinct|register/i.test(constraints[0].description),
    'directs the model to differentiate the voices');
});

test('voiceConstraintsFromAnalysis: multiple swap-risk pairs → one constraint per pair', () => {
  const analysis = {
    scored: true,
    pairs: [
      { a: 'A', b: 'B', delta: 0.05, swapRisk: true },
      { a: 'A', b: 'C', delta: 0.10, swapRisk: true },
      { a: 'B', b: 'C', delta: 0.12, swapRisk: true },
    ],
  };
  const constraints = voiceConstraintsFromAnalysis(analysis);
  assert.equal(constraints.length, 3, 'one constraint per swap-risk pair');
  // Each names its specific pair
  assert.ok(constraints[0].description.includes('"A"') && constraints[0].description.includes('"B"'));
  assert.ok(constraints[1].description.includes('"A"') && constraints[1].description.includes('"C"'));
  assert.ok(constraints[2].description.includes('"B"') && constraints[2].description.includes('"C"'));
});

test('voiceConstraintsFromAnalysis: boundary delta exactly at threshold', () => {
  // swapRisk is determined by the analyzer (delta < 0.15), not re-computed here.
  // The adapter trusts the flag. Verify both a just-below and just-above case.
  const at = voiceConstraintsFromAnalysis({
    scored: true,
    pairs: [{ a: 'X', b: 'Y', delta: 0.149, swapRisk: true }],
  });
  assert.equal(at.length, 1, 'flagged swapRisk true → constraint fires');

  const above = voiceConstraintsFromAnalysis({
    scored: true,
    pairs: [{ a: 'X', b: 'Y', delta: 0.151, swapRisk: false }],
  });
  assert.equal(above.length, 0, 'flagged swapRisk false → no constraint');
});

test('voice-constraint module boundary: does not import from the analyzer path', () => {
  // Constitutional guardrail: generation modules must not import from the
  // scoring/analyzer path. This adapter consumes a plain-data shape; it must
  // not import voice-delta.ts. Verify by reading the module source.
  const src = readFileSync(new URL('../../../server/nvm/generate/voice-constraint.ts', import.meta.url), 'utf8');
  assert.ok(!src.includes("from '../analyze/voice-delta"),
    'voice-constraint.ts must not import from the analyzer path (boundary)');
  assert.ok(!src.includes("from '../analyze/doctor"),
    'voice-constraint.ts must not import from doctor.ts (boundary)');
  assert.ok(src.includes("from './proof-spec.ts'"),
    'voice-constraint.ts imports GenerationConstraint type from proof-spec (its own generation directory)');
});
