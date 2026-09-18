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

// ───────────────────────────────────────────────────────────────────────────
// A SECOND, STRICTER QUESTION — added 2026-09-18 for `.github/workflows/edge.yml`.
//
// `classifyDocsOnly()` above answers "which CI gates can this push possibly
// affect". `edge.yml` asks something different: "can this commit change the
// IMAGE". Those are not the same question, and answering the second with the
// first is a bug — a real one, caught before it shipped:
//
//   `.dockerignore` denies `**` and then re-includes `!server/**`, `!src/**`,
//   `!public/**`. Thirteen committed `*.md` files live under those trees
//   (`server/nvm/kernel/README.md`, `server/nvm/revision/WAVE_QUALITY_GUARANTEE.md`,
//   …). They ENTER the build context — verified by building a probe image
//   with `COPY . .` and listing it — and `Dockerfile:91` copies
//   `/app/server` into the runner stage, so they are in the published image.
//   `classifyDocsOnly(['server/nvm/kernel/README.md'])` is `true`, because
//   `**/*.md` is docs for CI's purposes. Gating the image build on THAT
//   predicate would skip a rebuild for a commit that genuinely changes the
//   image — the mirror image of the rename hole in
//   scripts/classify-docs-only.mjs, and the same class of defect.
//
// So this predicate is deliberately NARROWER than `isDocsPath`, and it is
// narrow in the one direction that is safe: a file it declines to vouch for
// simply causes a rebuild.
//
// A path is outside the Docker build context if and only if:
//   - its first segment is `docs` — `.dockerignore` denies `docs` and
//     `docs/**` explicitly, on top of the blanket `**`; or
//   - it is a ROOT-LEVEL `*.md` (no `/` at all) — denied by the blanket `**`
//     with no negation re-including it.
// Everything else, including a `*.md` under any allowlisted source tree,
// is treated as possibly-in-context.
//
// THE TWO ASSUMPTIONS ARE PINNED, NOT ASSUMED. `tests/core/edge-docs-gate.test.ts`
// reads the real `.dockerignore` and fails if the blanket `**` deny is gone,
// if any negation could re-include `docs/**`, or if any negation could
// re-include a root `*.md`. A future `!CHANGELOG.md` therefore breaks a test
// rather than silently making this predicate wrong.
//
// FAILURE DIRECTION IS THE OPPOSITE OF THE ONE ABOVE, on purpose. For CI, an
// unclassifiable input must run every gate: guessing wrong there means a gate
// silently skipped. For the image, an unclassifiable input must BUILD:
// guessing wrong there means `:edge` is missing or stale, which is visible and
// recoverable, while over-building costs one runner slot. Both directions are
// "the failure that is cheap to notice", which is why they point opposite
// ways.

/**
 * True if `file` provably cannot enter the Docker build context, and so
 * cannot change the published image's filesystem.
 * @param {string} file
 * @returns {boolean}
 */
export function isOutsideDockerBuildContext(file) {
  if (typeof file !== 'string') return false;
  const normalized = file.trim().replace(/\\/g, '/').replace(/^\.\//, '');
  if (normalized === '') return false;
  if (/^docs\//.test(normalized)) return true;
  if (!normalized.includes('/') && /\.md$/i.test(normalized)) return true;
  return false;
}

/**
 * True if EVERY entry in `changedFiles` is outside the Docker build context
 * AND the set is non-empty — i.e. rebuilding the image would reproduce the
 * same filesystem. An empty or malformed set is deliberately NOT skippable:
 * the caller cannot tell a genuine no-op from a diff it failed to compute,
 * and for the image the conservative answer is "build".
 *
 * NOTE what this does NOT claim. The image is a function of the context AND
 * the build-args, and `edge.yml` passes `GIT_SHA=<head_sha>`, which moves on
 * every commit. Skipping therefore leaves `:edge`'s `ENV GIT_SHA` and its
 * `org.opencontainers.image.revision` label naming the last commit that was
 * actually built, not `main`'s tip. That is a deliberate, stated trade — see
 * edge.yml's own comment on the gate, and the audit README for the retagging
 * alternative (`docker buildx imagetools create`) if the revision label must
 * track the tip.
 *
 * @param {unknown} changedFiles
 * @returns {boolean}
 */
export function canSkipImageBuild(changedFiles) {
  if (!Array.isArray(changedFiles) || changedFiles.length === 0) return false;
  return changedFiles.every((f) => isOutsideDockerBuildContext(f));
}
