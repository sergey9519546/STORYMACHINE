// import-graph.mjs — the repo's one static import-reachability walker.
//
// Two gates need the same question answered ("is this file actually wired
// into something that runs?") from different roots:
//
//   - scripts/check-scoring-receipt.mjs walks out from
//     server/nvm/analyze/doctor.ts to decide whether a changed file is on the
//     scoring path (an unwired candidate detector is invisible to a doctor
//     run, so it must be invisible to the receipt guard too).
//   - scripts/check-no-console.mjs walks out from server.ts + server/app.ts to
//     prove that every path the no-console gate EXEMPTS is genuinely dead. A
//     bad exemption is how a `console.log` in the live route barrel passed
//     that gate for months; the walk is what makes the exemption list
//     unable to lie.
//
// Keeping one implementation means the two gates cannot drift into disagreeing
// about what "reachable" means.

import { existsSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

// Matches: `import ... from '...'`, `import type ... from '...'`,
// `export ... from '...'`, `import '...'`, and `import('...')`. Deliberately
// simple (regex, not a real parser) — this repo consistently writes relative
// imports with explicit extensions. A missed edge only ever makes the
// reachable set SMALLER, which is the safe direction for the receipt guard
// (fewer files classified as scoring-path) and the UNSAFE direction for the
// no-console exemption check — which is why that check treats type-only edges
// as reachable too (see below) rather than trying to be clever.
const IMPORT_RE = /(?:import|export)(?:\s+type)?\s+(?:[^'";]*?\bfrom\s+)?['"](\.[^'"]+)['"]|import\s*\(\s*['"](\.[^'"]+)['"]\s*\)/g;

/**
 * Resolve a relative import specifier to a repo-relative file path, trying the
 * same candidates Node/tsc would: the literal path, +.ts/.tsx, and /index.ts(x).
 * Returns null when nothing on disk matches.
 */
export function resolveImport(root, fromRelFile, spec) {
  const base = path.normalize(path.join(path.dirname(fromRelFile), spec)).replace(/\\/g, '/');
  const candidates = [base, `${base}.ts`, `${base}.tsx`, `${base}/index.ts`, `${base}/index.tsx`];
  for (const c of candidates) {
    const abs = path.join(root, c);
    if (existsSync(abs) && statSync(abs).isFile()) return c;
  }
  return null;
}

/**
 * Breadth-first closure of relative import/export edges starting at
 * `rootRelFiles`. Returns a Set of repo-relative paths (the roots included).
 * Type-only imports ARE followed: a file pulled in only for its types is still
 * part of the compiled surface, and for the no-console exemption check the
 * conservative answer ("treat it as live") is the correct one.
 */
export function computeReachableSet(root, rootRelFiles) {
  const seen = new Set();
  const queue = [...rootRelFiles];
  while (queue.length) {
    const rel = queue.shift();
    if (seen.has(rel)) continue;
    seen.add(rel);
    const abs = path.join(root, rel);
    if (!existsSync(abs) || !statSync(abs).isFile()) continue;
    let src;
    try {
      src = readFileSync(abs, 'utf8');
    } catch {
      continue;
    }
    for (const m of src.matchAll(IMPORT_RE)) {
      const spec = m[1] ?? m[2];
      if (!spec) continue;
      const resolved = resolveImport(root, rel, spec);
      if (resolved && !seen.has(resolved)) queue.push(resolved);
    }
  }
  return seen;
}
