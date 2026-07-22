import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';

const root = path.resolve(import.meta.dirname, '../..');
const file = path.join(root, '.dockerignore');

function activePatterns(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => line && !line.startsWith('#'));
}

function globMatches(pattern: string, candidate: string): boolean {
  let source = '^';

  for (let index = 0; index < pattern.length;) {
    const character = pattern[index];
    if (character === '*' && pattern[index + 1] === '*') {
      if (pattern[index + 2] === '/') {
        source += '(?:.*/)?';
        index += 3;
      } else {
        source += '.*';
        index += 2;
      }
      continue;
    }
    if (character === '*') {
      source += '[^/]*';
      index += 1;
      continue;
    }
    if (character === '?') {
      source += '[^/]';
      index += 1;
      continue;
    }

    source += '\\^$+.()|{}[]'.includes(character) ? `\\${character}` : character;
    index += 1;
  }

  return new RegExp(`${source}$`).test(candidate);
}

function normalizedPattern(rawPattern: string): { negated: boolean; value: string } {
  const negated = rawPattern.startsWith('!');
  const withoutNegation = negated ? rawPattern.slice(1) : rawPattern;
  const value = path.posix
    .normalize(withoutNegation.replaceAll('\\', '/'))
    .replace(/^\/+/, '')
    .replace(/\/+$/, '');

  return { negated, value };
}

/**
 * Mirrors the ordered Moby behavior used by this policy's `*`, `**`, `?`,
 * directory, and negation patterns. A pattern may match the path or a parent;
 * the last applicable match determines whether the path is excluded.
 */
function patternMatches(rawPattern: string, rawCandidate: string): boolean {
  const { value } = normalizedPattern(rawPattern);
  const candidate = rawCandidate.replaceAll('\\', '/').replace(/^\/+/, '');
  const candidates = [candidate];

  for (let parent = path.posix.dirname(candidate); parent !== '.'; parent = path.posix.dirname(parent)) {
    candidates.push(parent);
  }

  return candidates.some(entry => globMatches(value, entry));
}

function isExcluded(patterns: string[], candidate: string): boolean {
  let excluded = false;

  for (const rawPattern of patterns) {
    const pattern = normalizedPattern(rawPattern);
    if (pattern.negated !== excluded) continue;
    if (patternMatches(rawPattern, candidate)) excluded = !pattern.negated;
  }

  return excluded;
}

const requiredContextPaths = [
  'package.json',
  'package-lock.json',
  'tsconfig.json',
  'vite.config.ts',
  'index.html',
  'server.ts',
  'server/nvm/analyze/data/emotional-arc-lexicon.json',
  'src/components/ScriptIDE.tsx',
  'public/favicon.svg',
];

const confidentialOrRuntimePaths = [
  '.env',
  '.env.example',
  'server/.env',
  'server/.env.local',
  'data/sessions/project.db',
  'data/sessions/project.db-wal',
  '.git/config',
  'node_modules/pkg/index.js',
  'server/cache/session.db',
  'server/cache/session.db-wal',
  'server/cache/session.db-shm',
  'server/runtime/app.log',
  'docs/audit.md',
  'tests/core/docker-context.test.ts',
  'dist/assets/app.js',
  'coverage/lcov.info',
];

function assertContextPolicy(patterns: string[]): void {
  for (const candidate of requiredContextPaths) {
    assert.equal(isExcluded(patterns, candidate), false, `${candidate} must remain in the Docker context`);
  }
  for (const candidate of confidentialOrRuntimePaths) {
    assert.equal(isExcluded(patterns, candidate), true, `${candidate} must remain excluded`);
  }
}

describe('Docker build context', () => {
  it('models recursive globs, root directories, traversal, and ordered negation', () => {
    assert.equal(globMatches('**', 'server/app.ts'), true);
    assert.equal(globMatches('*.db', 'cache.db'), true);
    assert.equal(globMatches('*.db', 'server/cache.db'), false);
    assert.equal(globMatches('**/*.db', 'server/cache.db'), true);
    assert.equal(patternMatches('data', 'data/sessions/project.db'), true);
    assert.equal(patternMatches('data', 'server/nvm/analyze/data/reference.ts'), false);
    assert.equal(isExcluded(['**', '!server/', '!server/**'], 'server/app.ts'), false);
    assert.equal(isExcluded(['**', '!server/', '!server/**', '**/*.log'], 'server/app.log'), true);
  });

  it('is deny by default while allowing every Dockerfile input', () => {
    assert.ok(fs.existsSync(file), '.dockerignore must exist');
    const patterns = activePatterns(fs.readFileSync(file, 'utf8'));

    assert.equal(patterns[0], '**');
    assertContextPolicy(patterns);
  });

  it('detects late exceptions that re-expose confidential state', () => {
    const patterns = activePatterns(fs.readFileSync(file, 'utf8'));
    const envBypass = [...patterns, '!.env'];
    const dataBypass = [...patterns, '!data/**'];

    assert.equal(isExcluded(envBypass, '.env'), false);
    assert.throws(() => assertContextPolicy(envBypass), /\.env must remain excluded/);
    assert.equal(isExcluded(dataBypass, 'data/sessions/project.db'), false);
    assert.throws(() => assertContextPolicy(dataBypass), /data\/sessions\/project\.db must remain excluded/);
  });
});
