// build-time-imports.mjs — walks a file's relative-import graph,
// transitively, so "what does this config actually read at build time" is
// answered by one implementation rather than trusted to memory.
//
// Moved here 2026-09-13 out of tests/core/docker-context.test.ts, which grew
// this walker on 2026-09-13 to fix a real miss: `vite.config.ts` grew a
// relative import, `.dockerignore`'s allowlist did not cover it, and the
// Docker builder stage failed a release while that test's HARDCODED
// `requiredContextPaths` list stayed 3/3 green (a test that cannot catch the
// bug proves nothing — docs/audits/2026-09-12-adversarial/vitecache-review.md
// round 1, blocking finding 1). The walker fixed that for the Docker policy.
//
// The same round's review (observation (b), round 2) named a SECOND policy
// with the identical blind spot: `scripts/lib/browser-verify.mjs`'s
// `distStaleness()` decides whether `dist/` needs rebuilding from a
// hand-written `DIST_BUILD_INPUTS` list, and that list also did not know
// `vite.config.ts` could import anything. Two hand-written lists fed by the
// same config is the "second copy of a threshold" the lane standard calls a
// defect (docs/LANE_STANDARD.md §1), so the walker lives here now and BOTH
// `tests/core/docker-context.test.ts` and `distStaleness()` import it — one
// implementation, one place a real regression can be caught.

import fs from 'node:fs';
import path from 'node:path';

/** Matches a relative specifier in a static `import`/`export … from`, a
 *  dynamic `import(…)`, or a `require(…)` call. Deliberately blind to bare
 *  specifiers (`'react'`) — those are `node_modules`, never a build context
 *  requirement this walk needs to name. */
export const RELATIVE_IMPORT_RE = /(?:\bfrom\s*|\bimport\s*\(?\s*|\brequire\s*\(\s*)['"](\.[^'"]*)['"]/g;

/** Extensions tried, in order, for a specifier that does not name a real file
 *  as written (an extensionless ESM import, a directory import). */
export const RESOLUTION_SUFFIXES = ['', '.mjs', '.js', '.mts', '.ts', '.cjs', '.json', '/index.mjs', '/index.js', '/index.ts'];

/**
 * Resolve one relative specifier against `baseDir`, repository-relative and
 * posix-spelled, or null when nothing on disk answers to it (a specifier
 * that resolves to nothing cannot be a build input — see the docker-context
 * test's "resolves to nothing" case, which pins that this returns `[]`
 * rather than a phantom path).
 *
 * @param {string} baseDir directory the specifier is written relative to
 * @param {string} specifier the literal string inside the quotes
 * @param {string} repoRoot repository root the result is made relative to
 * @returns {string | null}
 */
export function resolveRelative(baseDir, specifier, repoRoot) {
  for (const suffix of RESOLUTION_SUFFIXES) {
    const candidate = path.resolve(baseDir, specifier + suffix);
    if (!fs.existsSync(candidate) || !fs.statSync(candidate).isFile()) continue;
    return path.relative(repoRoot, candidate).split(path.sep).join('/');
  }
  return null;
}

/**
 * Every file `entryRelative` reaches through relative imports, transitively.
 * Repository-relative, posix, entry excluded, cycle-safe. An entry that does
 * not exist yields `[]` rather than throwing — naming build inputs is not the
 * place to fail on a caller's typo.
 *
 * @param {string} repoRoot
 * @param {string} entryRelative repo-relative, posix-spelled
 * @returns {string[]} sorted, repo-relative, posix-spelled
 */
export function buildTimeImports(repoRoot, entryRelative) {
  const found = new Set();
  const seen = new Set();
  const queue = [entryRelative];

  while (queue.length > 0) {
    const current = queue.shift();
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
