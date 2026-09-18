// scripts/lib/docs-only.mjs — the docs-only fast-path classifier.
//
// WHY THIS EXISTS: .github/workflows/ci.yml runs a full ~7-minute `test` job
// plus a ~5-minute `browser` job on EVERY push, including a push that only
// edited a markdown file. Measured on main: run 34793742299
// ("docs(audit): README for the necessity lane"), a docs-only commit, took
// 00:46:28 -> 00:55:31 (~9 minutes) for a change that could not possibly have
// touched server/**, src/**, or any scoring path.
//
// ci.yml's own header comment forbids a blanket `paths-ignore` filter, and
// that comment is correct: several of the job's steps (honesty-audit,
// check-docs, check-brain, plus the brain-coverage and claims-register-
// citation test suites that run inside `npm test`) are THEMSELVES the checks
// that gate a documentation change — a `paths-ignore` would skip exactly the
// checks that could catch a docs regression. This module exists to route a
// docs-only push to the checks that actually gate it, and skip only the ones
// that cannot possibly be affected — never to skip the gate itself.
//
// THE ALLOWLIST IS DELIBERATELY NARROW AND DELIBERATELY A DENYLIST'S OPPOSITE:
// a changed-file set is "docs-only" if and only if EVERY file in it matches
// one of two patterns:
//   - docs/**    — anything whose first path segment is exactly "docs"
//   - **/*.md    — anything (anywhere in the tree, including the repo root)
//                  ending in ".md" (case-insensitive)
// Notably NOT docs, on purpose:
//   - .github/workflows/** — a workflow file is not documentation; it is the
//     thing whose own gates this module exists to keep honest, and the
//     no-console-in-if:-false and continue-on-error guards in
//     tests/core/ci-gates-intact.test.ts have nothing to say about workflow
//     content that never runs because a docs-only push skipped it.
//   - Dockerfile, package.json — build/dependency surface, not prose.
//   - anything under tests/, scripts/, server/, src/ — even a file whose
//     name merely CONTAINS "docs" (src/docs-panel.tsx) does not match: the
//     match is on the first PATH SEGMENT, not a substring.
//
// README.md (repo root, not under docs/) DOES match **/*.md and is therefore
// treated as docs. That is deliberate, not an oversight: README.md is
// explicitly in scripts/honesty-audit.mjs's SCAN_ROOT_FILES and in
// scripts/check-docs-quality.ts's --all scope, both of which keep running
// unconditionally on every push regardless of this classifier's result, and
// tests/scripts/smoke-gate-serve-mode.test.ts (part of the fast-path test
// list) asserts README.md does not carry specific stale sentences. A
// README-only push is therefore still fully gated by the checks that can
// fail on it; classifying it as docs-only only skips checks (build, the full
// test run, the browser battery) that cannot be affected by prose.
//
// FAILURE DIRECTION: this function is intentionally cheap to make ALWAYS
// return false — an empty array, a non-array, a non-string entry, or any
// path this module cannot positively prove is docs-only all resolve to
// false ("run everything"). The caller (scripts/classify-docs-only.mjs) is
// held to the same rule for every input IT cannot resolve (no base ref, a
// force-push, the first push of a branch, a git failure): treat as NOT
// docs-only. A classifier that wrongly says "docs-only" is a hole in every
// gate ci.yml skips on that answer; one that wrongly says "full" only costs
// a run that would have been fast anyway.

/**
 * True if `file` (a repo-relative path, forward- or back-slash, optionally
 * `./`-prefixed) falls inside the docs allowlist.
 * @param {string} file
 * @returns {boolean}
 */
export function isDocsPath(file) {
  if (typeof file !== 'string') return false;
  const normalized = file.trim().replace(/\\/g, '/').replace(/^\.\//, '');
  if (normalized === '') return false;
  if (/^docs\//.test(normalized)) return true;
  if (/\.md$/i.test(normalized)) return true;
  return false;
}

/**
 * True if every entry in `changedFiles` is a docs path AND the set is
 * non-empty. An empty changed-file set is deliberately NOT docs-only: it is
 * either a genuine no-op (nothing is saved by a fast path either way) or a
 * sign the diff could not be computed, and the conservative default for an
 * unclassifiable input is "run everything" — see the module header.
 * @param {unknown} changedFiles
 * @returns {boolean}
 */
export function classifyDocsOnly(changedFiles) {
  if (!Array.isArray(changedFiles) || changedFiles.length === 0) return false;
  return changedFiles.every((f) => isDocsPath(f));
}
