---
type: audit
updated: 2026-09-18
sources: [docs/audits/2026-09-18-ci-docs-fast-path/README.md, .github/workflows/ci.yml, .github/workflows/release.yml, scripts/lib/docs-only.mjs, scripts/lib/validated-base.mjs, scripts/classify-docs-only.mjs, tests/core/docs-only-classify.test.ts, tests/scripts/classify-docs-only.test.ts, tests/core/docs-gating-set.test.ts, tests/core/ci-gates-intact.test.ts, docs/LANE_STANDARD.md, CLAUDE.md, docs/DECISION_LOG.md]
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
docs-gating tests" step runs 17 test files that actually assert on real
documentation content — **derived**, not hand-selected (round 2; see below), and `Type check`, the no-console/server-
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

**Round 2 (REVISE -> the three holes).** The independent review returned
REVISE with three hard blockers, all of them in the half of the change that
had no tests:

1. **A rename out of `server/` into `docs/` classified DOCS-ONLY.**
   `git diff --name-only` prints only a detected rename's DESTINATION, so
   `git mv server/big.ts docs/big.md` produced a one-path, all-docs set while
   deleting a TypeScript module — skipping every gate listed above. Fixed
   with `--no-renames` on both diff arms through one `gitDiffNames()` helper,
   plus a pinned `core.quotePath`, and the script's header now names the
   whole class (copy detection, similarity thresholds, why `-z` and
   `--diff-filter` are deliberately unused, submodules) rather than one flag.
2. **The 13-file list missed suites that gate docs.**
   `tests/routes/root-cause-parity.test.ts` and
   `tests/core/scoring-receipt-guard.test.ts` went GREEN on the fast path
   where the full path went RED; extending the derivation found a third,
   `tests/core/telemetry-docs-truth.test.ts`, which reads the real
   `ROADMAP.md`. The list is now **derived** and pinned by
   [[Gate - Docs-Gating Set]] (`tests/core/docs-gating-set.test.ts`): 24
   candidates (25 after round 3's correction), 18 run, 8 excluded with reasons
   that cite a file or a line and that go stale loudly.
3. **The impure half had zero tests**, which is why (1) survived review of the
   pure half's 21 green cases. `tests/scripts/classify-docs-only.test.ts` now
   drives the real script bytes against real git repositories and a loopback
   Actions-API stub: 38 cases, every one of them RED under the mutation it
   exists for.

Round 2 also closed the `before..head` + `cancel-in-progress` hole (a lane
branch could read green over code no completed run tested) by classifying
from the last SUCCESSFUL completed run on the ref — see
[[Decision 10 - Lanes Push at Checkpoints]] for why that interaction matters
more, not less, under the new push cadence — and pinned every gate's exact
`if:` expression in `ci-gates-intact.test.ts` (+182/-0, additions only) after
showing that copy-pasting the fast-path condition onto "Type check" left all
47 round-1 assertions green while skipping `tsc` on every run.

**The fast path has actually executed:** run **35296219834** (`f4c6ee4e`,
a docs-only push) took **1 m 19 s** — `browser` skipped at job level,
seven gate steps skipped, the 13-file docs step running in 24 s — against
the **9 m 03 s** baseline (run 34793742299). The `classify` job costs about
**10 s and one runner slot on every FULL run** (run 35294788628).

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
restatement of the rule was updated to match, and round 2 recorded the
instruction itself as [[Decision 10 - Lanes Push at Checkpoints]].

**Two false statements this lane's round 1 carried, both corrected in round
2:** that `edge.yml` was "currently non-functional per the account-level
GitHub Actions block" and that the edge interaction could not be verified
"since Actions could not be exercised from this sandbox" — the block lifted
2026-09-13 and `edge.yml` had ALREADY fired for real (run 34794216577,
triggered by this lane's own baseline run 34793742299); and that
`honesty-audit` "scans `docs/**` and root `.md` files directly" — its
`SCAN_DIRS` is `src`/`public`/`server` and `docs/**` is exempt by
construction. The same stale account-block claim was swept from
`CONTRIBUTING.md` and `docs/PATH_TO_EXCELLENCE.md`, and
[[Owner - Fix GitHub Actions]] is closed.

**Related:** [[Patterns]] ("a gate that can be silently disabled by the thing
it gates is not a gate" — the same principle as `ci-gates-intact.test.ts`'s
mirror assertion, which this lane had to satisfy rather than weaken),
[[Audit - 2026-09-13 CI Green]] (the concurrency-group work this lane's
`classify` job sits beside), [[Gate - Browser Battery Suites]] (the job this
lane makes conditionally skippable), [[Gate - Docs-Gating Set]],
[[Decision 10 - Lanes Push at Checkpoints]], `docs/LANE_STANDARD.md` §7.

## Sources

- `docs/audits/2026-09-18-ci-docs-fast-path/README.md`
- `.github/workflows/ci.yml`
- `.github/workflows/release.yml`
- `scripts/lib/docs-only.mjs`, `scripts/lib/validated-base.mjs`
- `scripts/classify-docs-only.mjs`
- `tests/core/docs-only-classify.test.ts` (the pure half, 21 cases)
- `tests/scripts/classify-docs-only.test.ts` (the impure half, 38 cases)
- `tests/core/docs-gating-set.test.ts` (the derived list)
- `tests/core/ci-gates-intact.test.ts`
- `docs/LANE_STANDARD.md`
- `CLAUDE.md`
- `docs/DECISION_LOG.md` — Decision #10
