import { strict as assert } from 'node:assert';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, extname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..', '..');
const GENERATE_DIR = join(REPO_ROOT, 'server', 'nvm', 'generate');
const CRAFT_SPEC_FILE = join(GENERATE_DIR, 'craft-spec.ts');
const LEGACY_SCRIPTIDE_ROUTE = join(REPO_ROOT, 'server', 'routes', 'scriptide.ts');
const CRAFT_EXPORTS = Array.from(
  readFileSync(CRAFT_SPEC_FILE, 'utf8').matchAll(/^export\s+(?:interface|const|function)\s+(\w+)/gm),
  match => match[1],
);
const CRAFT_V2_MARKERS = [
  'craft-spec',
  ...CRAFT_EXPORTS,
  'SCENE-RELEVANT EMPHASIS',
];
const EXPECTED_CRAFT_PROMPT_FILES = [
  CRAFT_SPEC_FILE,
  join(GENERATE_DIR, 'proof-spec.ts'),
];
const LEGACY_SCRIPTIDE_ALLOWLIST = [
  'craft-spec',
  'buildCraftPromptSection',
  'looksLikeAnimationGenre',
];

function listTypeScriptFiles(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap(entry => {
    const path = join(dir, entry);
    return statSync(path).isDirectory()
      ? listTypeScriptFiles(path)
      : ['.ts', '.tsx'].includes(extname(entry))
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

  for (const file of listTypeScriptFiles(GENERATE_DIR)) {
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
  const source = readFileSync(CRAFT_SPEC_FILE, 'utf8');
  assert.doesNotMatch(source, /^\s*import\s/m, 'craft-spec must remain dependency-free');
  assert.doesNotMatch(source, /generateContent|makeLLM|@google|geminiProvider/i);
});

test('craft guardrail: source enumeration includes client .tsx files', () => {
  const clientFiles = listTypeScriptFiles(join(REPO_ROOT, 'src'));
  assert.ok(
    clientFiles.includes(join(REPO_ROOT, 'src', 'components', 'SettingsPanel.tsx')),
    'client .tsx files must be included in source isolation checks',
  );
});

test('craft guardrail: craft-v2 stays in explicitly allowed server prompt files', () => {
  const craftV2Files = listTypeScriptFiles(GENERATE_DIR).filter(file => {
    const source = readFileSync(file, 'utf8');
    return CRAFT_V2_MARKERS.some(marker => source.includes(marker));
  });

  assert.deepEqual(craftV2Files, EXPECTED_CRAFT_PROMPT_FILES);
});

test('craft guardrail: legacy ScriptIDE usage is limited to its static allowlist', () => {
  const source = readFileSync(LEGACY_SCRIPTIDE_ROUTE, 'utf8');
  const presentMarkers = CRAFT_V2_MARKERS.filter(marker => source.includes(marker));

  assert.deepEqual(presentMarkers.sort(), [...LEGACY_SCRIPTIDE_ALLOWLIST].sort());
  assert.match(
    source,
    /import\s*{\s*buildCraftPromptSection\s*,\s*looksLikeAnimationGenre\s*}\s*from\s*['"][^'"]*craft-spec\.ts['"];/,
    'the legacy route may import only its two static prompt helpers',
  );
  assert.match(
    source,
    /buildCraftPromptSection\s*\(\s*{\s*compact\s*:\s*true\s*,\s*animation\s*:\s*looksLikeAnimationGenre\s*\(\s*configGenre\s*\)\s*,?\s*}\s*\)/,
    'the legacy route may pass only compact and animation options to the static craft prompt',
  );
  assert.doesNotMatch(
    source,
    /\bsceneContext\b/,
    'the legacy route must not pass scene-aware Craft context',
  );
});

test('craft guardrail: every protected surface except legacy ScriptIDE is Craft-free', () => {
  const protectedFiles = [
    ...listTypeScriptFiles(join(REPO_ROOT, 'server', 'nvm', 'analyze')),
    ...listTypeScriptFiles(join(REPO_ROOT, 'server', 'nvm', 'quality')),
    ...listTypeScriptFiles(join(REPO_ROOT, 'server', 'nvm', 'proof')),
    ...listTypeScriptFiles(join(REPO_ROOT, 'server', 'routes')).filter(file => file !== LEGACY_SCRIPTIDE_ROUTE),
    join(REPO_ROOT, 'server', 'lib', 'ai-config.ts'),
    ...listTypeScriptFiles(join(REPO_ROOT, 'src')),
  ];
  const craftMarkerFiles = protectedFiles.filter(file => {
    const source = readFileSync(file, 'utf8');
    return CRAFT_V2_MARKERS.some(marker => source.includes(marker));
  });
  assert.deepEqual(craftMarkerFiles, []);
});

test('craft guardrail: the kill switch stays out of public config and client code', () => {
  const publicSurface = [
    join(REPO_ROOT, 'server', 'lib', 'ai-config.ts'),
    ...listTypeScriptFiles(join(REPO_ROOT, 'server', 'routes')),
    ...listTypeScriptFiles(join(REPO_ROOT, 'src')),
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
