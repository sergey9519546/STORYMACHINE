import { strict as assert } from 'node:assert';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, extname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..', '..');
const GENERATE_DIR = join(REPO_ROOT, 'server', 'nvm', 'generate');

function listTsFiles(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap(entry => {
    const path = join(dir, entry);
    return statSync(path).isDirectory()
      ? listTsFiles(path)
      : extname(entry) === '.ts'
        ? [path]
        : [];
  });
}

test('craft guardrail: generation does not import deterministic scoring modules', () => {
  const forbidden = [
    '../analyze/doctor',
    '../analyze/fountain-analyzer',
    '../analyze/emotional-arc',
    '../analyze/calibration',
    '../revision/passes',
    '../analyze/voice-delta',
  ];
  const violations: string[] = [];

  for (const file of listTsFiles(GENERATE_DIR)) {
    const source = readFileSync(file, 'utf8');
    for (const modulePath of forbidden) {
      const escaped = modulePath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      if (new RegExp(`(?:from\\s+|import\\s*\\()(['\"])${escaped}`).test(source)) {
        violations.push(`${file}: ${modulePath}`);
      }
    }
  }

  assert.deepEqual(violations, []);
});

test('craft guardrail: craft-spec is pure static prompt construction', () => {
  const source = readFileSync(join(GENERATE_DIR, 'craft-spec.ts'), 'utf8');
  assert.doesNotMatch(source, /^\s*import\s/m, 'craft-spec must remain dependency-free');
  assert.doesNotMatch(source, /generateContent|makeLLM|@google|geminiProvider/i);
});

test('craft guardrail: scene routing does not enter scoring, routes, public config, or client code', () => {
  const protectedFiles = [
    ...listTsFiles(join(REPO_ROOT, 'server', 'nvm', 'analyze')),
    ...listTsFiles(join(REPO_ROOT, 'server', 'nvm', 'quality')),
    ...listTsFiles(join(REPO_ROOT, 'server', 'nvm', 'proof')),
    ...listTsFiles(join(REPO_ROOT, 'server', 'routes')),
    join(REPO_ROOT, 'server', 'lib', 'ai-config.ts'),
    ...listTsFiles(join(REPO_ROOT, 'src')),
  ];
  const violations = protectedFiles.filter(file => {
    const source = readFileSync(file, 'utf8');
    return /SceneCraftContext|SCENE-RELEVANT EMPHASIS/.test(source);
  });
  assert.deepEqual(violations, []);
});

test('craft guardrail: the kill switch stays out of public config and client code', () => {
  const publicSurface = [
    join(REPO_ROOT, 'server', 'lib', 'ai-config.ts'),
    ...listTsFiles(join(REPO_ROOT, 'server', 'routes')),
    ...listTsFiles(join(REPO_ROOT, 'src')),
  ];
  const violations = publicSurface.filter(file =>
    readFileSync(file, 'utf8').includes('STORYMACHINE_DISABLE_CRAFT_SPEC'),
  );
  assert.deepEqual(violations, []);
});

test('craft guardrail: deferred KB and voice artifacts are absent', () => {
  const deferredPaths = [
    'scripts/build-craft-kb.mjs',
    'tests/nvm/generate/craft-kb.test.ts',
    'server/nvm/generate/voice-constraint.ts',
    'tests/nvm/generate/voice-constraint.test.ts',
    'data/craft',
  ];
  assert.deepEqual(
    deferredPaths.filter(path => existsSync(join(REPO_ROOT, ...path.split('/')))),
    [],
  );
});
