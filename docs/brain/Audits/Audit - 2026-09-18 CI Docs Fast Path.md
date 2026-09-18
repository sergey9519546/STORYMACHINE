---
type: audit
updated: 2026-09-18
sources: [docs/audits/2026-09-18-ci-docs-fast-path/README.md, .github/workflows/ci.yml, .github/workflows/release.yml, scripts/lib/docs-only.mjs, scripts/classify-docs-only.mjs, tests/core/docs-only-classify.test.ts, tests/core/ci-gates-intact.test.ts, docs/LANE_STANDARD.md, CLAUDE.md]
status: active
---

# Audit — 2026-09-18 CI Docs Fast Path

**Directory:** `docs/audits/2026-09-18-ci-docs-fast-path/` — the single lane
that added a docs-only fast path to `.github/workflows/ci.yml`.

**What it is:** ci.yml runs a full ~7-minute `test` job plus a ~5-minute
`browser` job on every push, including one that only edits a markdown file.
Measured on `main`: run 34793742299 ("docs(audit): README for the necessity
lane"), a docs-only commit, took 00:46:28 -> 00:55:31 (~9 minutes). ci.yml's
own header forbids a blanket `paths-ignore`, and that comment is correct —
`honesty-audit`, `check-docs`, `check-brain`, and the brain-coverage and
claims-register-citation suites inside `npm test` are themselves the checks
that gate a documentation change, and skipping the job by path would skip
exactly those.

**The fix:** a new `classify` job computes whether a push's changed-file set
falls entirely inside a conservative allowlist (`docs/**`, `**/*.md` — see
`scripts/lib/docs-only.mjs`'s header for the exact matching rules and why
README.md counts as docs but `src/docs-panel.tsx` and `.github/workflows/**`
do not) and routes accordingly. On a docs-only push: `honesty-audit`,
`check-docs`, and `check-brain` stay unconditional (as before), a new "Run
docs-gating tests" step runs 13 hand-selected test files that actually assert
on real documentation content, and `Type check`, the no-console/server-
reachability grep, the full `npm test`, the scoring-receipt guard, the
metamorphic gate, `npm run build`, and the WHOLE `browser` job (job-level
`if:`, skipping checkout/`npm ci`/the Chromium download too) are skipped.
Anything the classifier cannot positively resolve — no base ref, a
force-push, the first push of a branch, a git failure — runs exactly what it
ran before this change; see the classifier's own header for the full failure-
direction argument.

**Why `browser` can be SKIPPED rather than run-to-report-success:** verified
against the GitHub API (2026-09-18) that `main`'s branch protection has no
required status checks at all (`"protected": false`,
`required_status_checks.enforcement_level: "off"`, empty `contexts`/`checks`)
— a job that never runs cannot fail a required check that does not exist.

**The `tests/core/ci-gates-intact.test.ts` trap:** that file asserts
`release.yml` mirrors `ci.yml` step-for-step (same step names, same run
bodies). Adding the `classify` job and its "Run docs-gating tests" step to
`ci.yml` therefore required matching, same-bodied steps in `release.yml` too
— added there, but with their output/effect deliberately UNUSED: a release
(a `v*` tag push or `workflow_dispatch`) is a rare, milestone event, not the
frequent small push this fast path targets, so `release.yml` keeps running
every gate unconditionally, exactly as before. 47/47 of that file's own
assertions stayed green through the whole change.

**Proof the classifier can fail:** `tests/core/docs-only-classify.test.ts`
(21 cases, including the brief's own adversarial set — `docs/foo.md` +
`server/app.ts`; `.github/workflows/ci.yml` alone; `README.md` alone,
decided docs-only and justified; `src/docs-panel.tsx` (contains "docs" but
is not under it); an empty change set) inverting the classifier's core
`every()` call to `!every()` failed 16 of 21 cases; reverting it passes
21/21.

**LANE_STANDARD §7, item 1, also changed in this lane:** "push
`lane/<name>` after every commit" became "push at meaningful checkpoints" —
the owner's own words, "remote repositories are meant for milestone
synchronization, not real-time keystroke saving" — while keeping the
2026-09-07 rebuild (every worktree, the scratch directory, every local
`audit/*` tag, and an unpushed reviewed lane erased) as the reason the
durability property itself is not relaxed, only re-timed. `CLAUDE.md`'s own
restatement of the rule was updated to match.

**Related:** [[Patterns]] ("a gate that can be silently disabled by the thing
it gates is not a gate" — the same principle as `ci-gates-intact.test.ts`'s
mirror assertion, which this lane had to satisfy rather than weaken),
[[Audit - 2026-09-13 CI Green]] (the concurrency-group work this lane's
`classify` job sits beside), [[Gate - Browser Battery Suites]] (the job this
lane makes conditionally skippable), `docs/LANE_STANDARD.md` §7.

## Sources

- `docs/audits/2026-09-18-ci-docs-fast-path/README.md`
- `.github/workflows/ci.yml`
- `.github/workflows/release.yml`
- `scripts/lib/docs-only.mjs`
- `scripts/classify-docs-only.mjs`
- `tests/core/docs-only-classify.test.ts`
- `tests/core/ci-gates-intact.test.ts`
- `docs/LANE_STANDARD.md`
- `CLAUDE.md`
