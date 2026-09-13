import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
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

// ── What the BUILDER STAGE actually reads, derived rather than remembered ──
//
// `Dockerfile:13-14` is `COPY . .` then `RUN npm run build`, and
// `release.yml` / `edge.yml` build with `context: .`, so `.dockerignore`
// decides what that build can resolve. The list below used to be hand-written,
// and on 2026-09-13 that cost a real defect: `vite.config.ts` grew an import
// of a module under `scripts/`, `scripts/` is not on the allowlist, and this
// test stayed 3/3 green while the builder stage failed with
// `[UNRESOLVED_IMPORT] Could not resolve './scripts/lib/vite-cache-dir.mjs'`.
// A test that cannot catch the bug proves nothing.
//
// So the config's own relative-import graph is walked here. The next
// build-time import into `vite.config.ts` is caught by this file instead of
// being rediscovered in a release — the class, not the instance.
const RELATIVE_IMPORT_RE = /(?:\bfrom\s*|\bimport\s*\(?\s*|\brequire\s*\(\s*)['"](\.[^'"]*)['"]/g;

/** Extensions tried, in order, for a specifier that does not name a real file. */
const RESOLUTION_SUFFIXES = ['', '.mjs', '.js', '.mts', '.ts', '.cjs', '.json', '/index.mjs', '/index.js', '/index.ts'];

/**
 * Resolve one relative specifier against `fromFile`, repository-relative and
 * posix-spelled, or null when nothing on disk answers to it (a specifier that
 * resolves to nothing cannot be a context requirement).
 */
function resolveRelative(baseDir: string, specifier: string, repoRoot: string): string | null {
  for (const suffix of RESOLUTION_SUFFIXES) {
    const candidate = path.resolve(baseDir, specifier + suffix);
    if (!fs.existsSync(candidate) || !fs.statSync(candidate).isFile()) continue;
    return path.relative(repoRoot, candidate).split(path.sep).join('/');
  }
  return null;
}

/**
 * Every file `entryRelative` reaches through relative imports, transitively.
 * Repository-relative, posix, entry excluded, cycle-safe.
 */
function buildTimeImports(repoRoot: string, entryRelative: string): string[] {
  const found = new Set<string>();
  const seen = new Set<string>();
  const queue = [entryRelative];

  while (queue.length > 0) {
    const current = queue.shift() as string;
    if (seen.has(current)) continue;
    seen.add(current);
    const absolute = path.join(repoRoot, current);
    if (!fs.existsSync(absolute)) continue;
    const source = fs.readFileSync(absolute, 'utf8');
    for (const match of source.matchAll(RELATIVE_IMPORT_RE)) {
      const resolved = resolveRelative(path.dirname(absolute), match[1], repoRoot);
      if (resolved === null || resolved === entryRelative) continue;
      found.add(resolved);
      queue.push(resolved);
    }
  }

  return [...found].sort();
}

const viteConfigImports = buildTimeImports(root, 'vite.config.ts');

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
  // Derived above, not typed here.
  ...viteConfigImports,
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

  it('derives vite.config.ts\'s build-time imports — and the derivation can fail', () => {
    // The walker is the thing the policy check now depends on, so it is
    // pinned against a fixture rather than trusted. A regex that silently
    // matched nothing would make every assertion below vacuous.
    const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'docker-context-imports-'));
    try {
      fs.mkdirSync(path.join(fixture, 'tooling', 'nested'), { recursive: true });
      fs.writeFileSync(
        path.join(fixture, 'config.ts'),
        "import { a } from './tooling/first.mjs';\nimport('./tooling/nested/lazy.ts');\nimport react from 'react';\nexport default { a, react };\n",
      );
      // Transitive: reached only through first.mjs.
      fs.writeFileSync(path.join(fixture, 'tooling', 'first.mjs'), "export { b as a } from './nested/second.js';\n");
      fs.writeFileSync(path.join(fixture, 'tooling', 'nested', 'second.js'), 'export const b = 1;\n');
      fs.writeFileSync(path.join(fixture, 'tooling', 'nested', 'lazy.ts'), 'export default 2;\n');

      assert.deepEqual(
        buildTimeImports(fixture, 'config.ts'),
        ['tooling/first.mjs', 'tooling/nested/lazy.ts', 'tooling/nested/second.js'],
        'the walker must follow static, dynamic and transitive relative imports, and must ignore bare specifiers',
      );

      // A specifier that resolves to nothing is not a context requirement —
      // asserting a phantom path would red this suite for a typo in a comment.
      fs.writeFileSync(path.join(fixture, 'config.ts'), "import './tooling/does-not-exist.mjs';\n");
      assert.deepEqual(buildTimeImports(fixture, 'config.ts'), []);
    } finally {
      fs.rmSync(fixture, { recursive: true, force: true });
    }
  });

  it('every build-time import of vite.config.ts survives the context policy', () => {
    const patterns = activePatterns(fs.readFileSync(file, 'utf8'));
    const source = fs.readFileSync(path.join(root, 'vite.config.ts'), 'utf8');
    const hasRelativeImport = new RegExp(RELATIVE_IMPORT_RE.source).test(source);

    // Non-vacuous in both directions: if the config has a relative import the
    // derivation must have found it, and if it has none the derivation must be
    // empty rather than stale.
    assert.equal(
      viteConfigImports.length > 0,
      hasRelativeImport,
      `vite.config.ts relative imports: source says ${hasRelativeImport}, derivation found ${JSON.stringify(viteConfigImports)}`,
    );

    for (const candidate of viteConfigImports) {
      assert.equal(
        isExcluded(patterns, candidate),
        false,
        `vite.config.ts imports ${candidate}, so the builder stage cannot run \`npm run build\` without it — `
          + 'allowlist it in .dockerignore (with its parent directories, which Docker must traverse first)',
      );
    }
  });

  it('would have caught the 2026-09-13 regression — a build-time import the allowlist denies', () => {
    // The fail direction, kept as a test rather than described in a comment.
    // Drop the allowlist entry for each derived import and the policy check
    // must go red; if it does not, it cannot catch the next one either.
    //
    // This is the shape `.dockerignore` had at main f79b47ec, against which
    // the builder stage exited 1 with `[UNRESOLVED_IMPORT] Could not resolve
    // './scripts/lib/vite-cache-dir.mjs' in vite.config.ts`.
    assert.ok(viteConfigImports.length > 0, 'nothing to test: vite.config.ts has no relative imports');
    const patterns = activePatterns(fs.readFileSync(file, 'utf8'));

    for (const candidate of viteConfigImports) {
      const withoutIt = patterns.filter(p => {
        const { negated, value } = normalizedPattern(p);
        return !(negated && (value === candidate || candidate.startsWith(`${value}/`)));
      });
      assert.notDeepEqual(withoutIt, patterns, `.dockerignore must actually carry an exception admitting ${candidate}`);
      assert.equal(
        isExcluded(withoutIt, candidate),
        true,
        `${candidate} must fall back to denied once its exception is removed — otherwise the exception is not what admits it`,
      );
    }
  });

  it('keeps scripts/ fully denied — the build input lives at the root for that reason', () => {
    // scripts/ is maintainer tooling (browser gates, corpus measurement, the
    // rulebook generator, the honesty audit) and none of it is a build input.
    // It stays denied in full, which is only possible because the one module
    // `vite.config.ts` imports was moved out of it: a `!scripts/` traversal
    // exception un-denies the whole subtree under the parent-matching
    // semantics `patternMatches` above implements. This test is what keeps
    // that decision from being quietly undone.
    const patterns = activePatterns(fs.readFileSync(file, 'utf8'));
    for (const candidate of [
      'scripts/verify-vite-cache-isolation.mjs',
      'scripts/lib/browser-verify.mjs',
      'scripts/honesty-audit.mjs',
      'scripts/lib/vite-dev-probe.mjs',
    ]) {
      assert.equal(isExcluded(patterns, candidate), true, `${candidate} must stay out of the Docker context`);
    }

    // And the reason, pinned: a traversal exception admits the subtree.
    assert.equal(
      isExcluded(['**', '!scripts/', '!scripts/lib/', '!scripts/lib/vite-cache-dir.mjs'], 'scripts/honesty-audit.mjs'),
      false,
      'if a parent exception ever stops admitting the subtree, a narrow scripts/ allowlist becomes possible and this note is stale',
    );
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
