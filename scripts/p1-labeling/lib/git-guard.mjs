// GIT GUARD — shared refusal logic for every script in scripts/p1-labeling/
// that writes reader bundles, returned rating forms, or aggregated labels.
//
// WHY THIS EXISTS: labels and bundles must never be committed. The corpus
// they're derived from is private and copyrighted (see
// docs/p1-benchmark/CORPUS_IDENTIFICATION.md §0's honesty boundary — opaque
// ids do not make the corpus distributable), and human quality labels are
// the actual P1 evaluation data, not something to leak into a public repo
// pre-evaluation. This module is the belt-and-suspenders check every
// p1-labeling script runs BEFORE writing anything, mirroring
// scripts/migrate-corpus-ids.mjs's assertPathIsGitIgnored /
// writeCrosswalk pattern for its corpus-crosswalk.json output.
//
// Two independent conditions are checked, either one being true refuses:
//   1. The target directory already contains files git already tracks
//      (`git ls-files` returns something under it) — someone already added
//      bundle/label output to version control, which must be undone by a
//      human, not silently worked around by this tool.
//   2. The target path is NOT covered by .gitignore — i.e. if a file were
//      written there and `git add`-ed, it would NOT be rejected by
//      .gitignore. This catches "the operator picked a path outside data/"
//      before any bundle/label content is written, not after.
//
// If `git` itself cannot be invoked (missing, not a repo, path outside the
// repo), this fails CLOSED — refuses rather than assuming safety — same
// posture as migrate-corpus-ids.mjs's assertPathIsGitIgnored.

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = path.resolve(__dirname, '../../..');

function runGit(args) {
  return execFileSync('git', args, { cwd: REPO_ROOT, encoding: 'utf-8' });
}

/**
 * @param {string} absPath
 * @returns {boolean} true if `git check-ignore` reports the path is ignored.
 */
function isGitIgnored(absPath) {
  const rel = path.relative(REPO_ROOT, absPath);
  try {
    runGit(['check-ignore', '-q', rel]);
    return true; // exit 0 = ignored
  } catch (err) {
    if (err.status === 1) return false; // exit 1 = NOT ignored (clean "no match")
    throw err; // anything else (git missing, not a repo, ...) — let caller fail closed
  }
}

/**
 * @param {string} absPath
 * @returns {string[]} relative paths of files git already tracks under absPath.
 */
function trackedFilesUnder(absPath) {
  const rel = path.relative(REPO_ROOT, absPath);
  try {
    const out = runGit(['ls-files', '--', rel]);
    return out.split('\n').map((l) => l.trim()).filter(Boolean);
  } catch {
    // `git ls-files` exits 0 even for zero matches; a thrown error here
    // means git itself is unusable — treat as "cannot verify", handled by
    // the ignored-check's own fail-closed path immediately after.
    return [];
  }
}

/**
 * Refuse (print a clear message and exit 1) unless `absPath` is safely
 * outside version control: not already tracked, and covered by .gitignore.
 * Call this BEFORE writing any bundle, rating form, or aggregated label
 * file. Directory need not exist yet — `git check-ignore` matches by
 * pattern, not by filesystem presence.
 *
 * @param {string} absPath - absolute path to the output directory or file.
 * @param {{toolName?: string}} [opts]
 */
export function assertSafeToWriteLabelData(absPath, opts = {}) {
  const { toolName = 'this tool' } = opts;
  const rel = path.relative(REPO_ROOT, absPath);

  let ignored;
  try {
    ignored = isGitIgnored(absPath);
  } catch (err) {
    console.error(`\n[REFUSED] Could not verify git-ignore status of "${rel}" (${err.message}).`);
    console.error(`  ${toolName} refuses to write label/bundle data unless it can confirm the target`);
    console.error('  is outside version control. Fix your git environment and re-run.');
    process.exit(1);
  }

  if (!ignored) {
    console.error(`\n[REFUSED] "${rel}" is NOT covered by .gitignore.`);
    console.error('  Reader bundles and human quality labels must never be committed — the source');
    console.error('  corpus is private and not distributable (see docs/p1-benchmark/');
    console.error('  CORPUS_IDENTIFICATION.md §0). Point --out at a path under the repo-ignored');
    console.error('  data/ directory (the default, data/p1-labeling/, already is), or add a');
    console.error('  .gitignore rule for your chosen path before re-running.');
    process.exit(1);
  }

  const tracked = trackedFilesUnder(absPath);
  if (tracked.length > 0) {
    console.error(`\n[REFUSED] "${rel}" already has ${tracked.length} file(s) tracked by git:`);
    for (const f of tracked.slice(0, 10)) console.error(`  ${f}`);
    if (tracked.length > 10) console.error(`  ... and ${tracked.length - 10} more`);
    console.error('  This must be fixed by a human (git rm --cached, then a .gitignore fix) before');
    console.error(`  ${toolName} will write here. Nothing was written.`);
    process.exit(1);
  }
}
