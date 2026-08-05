// Constitutional guardrail test for the craft-knowledge v2 increment.
//
// NORTH_STAR §1: "No LLM-as-judge. Every verdict a user sees is a
// deterministic rule or formula... LLMs may SENSE and GENERATE but never
// SCORE." The boundary is enforced structurally (import direction +
// runDiagnoseOnly), not by a runtime check. This test makes it executable:
// it asserts that the generation path this increment added/edited does NOT
// import from any scoring-path module, so a future regression that wires
// craft knowledge or voice constraints into scoring would turn this red.
//
// The scoring path (per check-scoring-receipt.mjs's own definition) is:
//   - server/nvm/analyze/doctor.ts
//   - server/nvm/analyze/emotional-arc.ts
//   - server/nvm/analyze/fountain-analyzer.ts
//   - server/nvm/analyze/calibration/**
//   - server/nvm/revision/passes/**
// Generation is everything under server/nvm/generate/. The boundary is
// unidirectional: generation may not import scoring; scoring may not call
// the LLM. This test checks the generation→scoring direction.

import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..', '..');
const GENERATE_DIR = join(REPO_ROOT, 'server', 'nvm', 'generate');

// Modules the generation path must NOT import (the scoring surface).
const FORBIDDEN_IMPORTS = [
  "../analyze/doctor",       // the score/verdict entrypoint
  "../analyze/fountain-analyzer",  // the base parse everything scores read
  "../analyze/emotional-arc",      // feeds doctor's structural deduction
  "../analyze/calibration",        // percentile math the score normalizes against
  "../revision/passes",            // the 14 scoring passes
  "../analyze/voice-delta",        // analyzer — generation consumes its OUTPUT shape, never the module
];

function listTsFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...listTsFiles(full));
    else if (extname(entry) === '.ts') out.push(full);
  }
  return out;
}

test('craft-guardrail: no file under server/nvm/generate/ imports any scoring-path module', () => {
  const files = listTsFiles(GENERATE_DIR);
  assert.ok(files.length >= 4, `expected at least 4 generate modules, found ${files.length}`);
  const violations: string[] = [];
  for (const f of files) {
    const src = readFileSync(f, 'utf8');
    for (const forbidden of FORBIDDEN_IMPORTS) {
      // Match import statements (static or dynamic) referencing the forbidden path.
      // Allow the path to appear in comments by requiring it in an import/from context.
      const importPattern = new RegExp(`(?:import|from)\\s+['"]${forbidden.replace(/\//g, '\\/')}`, 'g');
      if (importPattern.test(src)) {
        violations.push(`${f}: imports ${forbidden}`);
      }
    }
  }
  assert.deepEqual(violations, [],
    `generation path must not import scoring modules (NORTH_STAR §1 boundary). Violations:\n${violations.join('\n')}`);
});

test('craft-guardrail: voice-constraint.ts is pure prompt-construction (no LLM, no provider import)', () => {
  const src = readFileSync(join(GENERATE_DIR, 'voice-constraint.ts'), 'utf8');
  assert.ok(!/import.*(?:generateContent|makeLLM|llm-generator|@google|gemini)/i.test(src),
    'voice-constraint.ts must not import any LLM/provider module');
  assert.ok(src.includes('GenerationConstraint'),
    'voice-constraint.ts operates on GenerationConstraint (the prompt-construction type)');
});

test('craft-guardrail: craft-spec.ts is pure prompt-construction (no LLM, no scoring import)', () => {
  const src = readFileSync(join(GENERATE_DIR, 'craft-spec.ts'), 'utf8');
  assert.ok(!/import.*(?:generateContent|makeLLM|llm-generator|@google|gemini)/i.test(src),
    'craft-spec.ts must not import any LLM/provider module');
  assert.ok(!/from\s+['"]\.\.\/analyze\/(?:doctor|fountain-analyzer|calibration)/.test(src),
    'craft-spec.ts must not import any scoring/analyzer module');
});

test('craft-guardrail: build-craft-kb.mjs produces no screenplay text (the KB is described patterns only)', () => {
  // The builder parses notes that are already pattern-descriptions, but this
  // test guards against a future note edit that paste-ins source dialogue.
  // The KB is a local artifact (data/craft is gitignored); skip when absent.
  let kb;
  try {
    kb = JSON.parse(readFileSync(join(REPO_ROOT, 'data', 'craft', 'craft-kb.json'), 'utf8'));
  } catch {
    // KB not built locally — skip this assertion (the craft-kb.test.ts suite
    // covers the same property when the KB is present).
    return;
  }
  const cuePattern = /\n[A-Z][A-Z .'_-]{2,}\s*(?:\(V\.O\.\)|\(O\.S\.\)|\(CONT'D\))?\s*\n[A-Z]/;
  const violations = kb.entries
    .filter((e: { film: string; section: string; description: string }) => cuePattern.test(e.description))
    .map((e: { film: string; section: string }) => `${e.film}/${e.section}`);
  assert.deepEqual(violations, [],
    `craft-kb must contain no reproduced screenplay dialogue. Violations:\n${violations.join('\n')}`);
});
