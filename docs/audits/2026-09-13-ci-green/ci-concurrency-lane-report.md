# Lane report — `ci-concurrency`

- **Worktree:** `/home/user/wt-ci`
- **Branch:** `lane/ci-concurrency` (branched from `main` @ `68d05192`)
- **Tip:** see the "Tip" line at the end of this report — one commit, one
  push (this lane's own subject: fewer pushes, not zero, so the pushed SHA
  is recorded once at the bottom rather than self-referenced here)

## 1. What the thing IS

`.github/workflows/ci.yml` runs on `push: branches: ["**"]` and
`pull_request: branches: ["**"]` with no `concurrency` key at all — every
push to any branch starts a brand-new, independent run of both its `test`
and `browser` jobs, and nothing about a later push affects an earlier run
already in flight. `docs/LANE_STANDARD.md` §7 requires a lane to
`git push -u origin lane/<name>` after EVERY commit — a durability rule, not
an optional cadence — so a lane that commits three times in one minute
(docs-only commits included, e.g. fixing a Tip line) pushes three times in
that minute. With Actions actually running for the first time since
2026-09-02, that combination showed up exactly as measured: three full runs
of both jobs in flight at once for `lane/voice-bound-ci-derivation`
(34741882322 / 34741923678 / 34741928418, 06:05-06:06 UTC), most of whose
cost (test job ~7 min, browser job ~5 min, per run) had nothing left to
prove after the second run started, since it was the same tip modulo a
comment.

`security.yml` has the identical structural gap on its `pull_request` (all
branches) and `push: branches: ["main"]` triggers. `release.yml` triggers
only on a `v*` tag push or `workflow_dispatch` — a fundamentally different
shape (one publish per release, not one run per commit on a live branch) —
and `edge.yml` already has a job-level `concurrency: {group: edge-image,
cancel-in-progress: true}` that is correct as written (it always builds
`main`'s tip specifically, so replacing a stale in-flight edge build with a
newer one is safe by design, unlike a versioned release).

## 2. What changed, per workflow

| Workflow | Change | Why |
|---|---|---|
| `ci.yml` | Added workflow-level `concurrency: {group: "${{ github.workflow }}-${{ github.ref }}", cancel-in-progress: "${{ github.ref != 'refs/heads/main' }}"}`, plus a comment next to `on:` recording the measured incident and a second comment explicitly forbidding a `paths-ignore` docs skip. | This is the file the incident happened on. Cancelling a branch's own superseded run turns "N pushes in one minute" into "one run in flight," and excluding `main` keeps every main run's conclusion citable, per CLAUDE.md. |
| `security.yml` | Added the identical `concurrency` block, with a comment adapted to its own triggers (PR-scoped cancellation, main push and the weekly schedule both resolve to `refs/heads/main` and so are never cancelled, only ever serialized against each other). | Same push-per-commit exposure on `pull_request`; a PR that gets pushed again while `dependency-review`/`npm-audit`/`codeql` are still running should have the stale run replaced. |
| `release.yml` | No `concurrency` block added. A comment explains why, next to `on:`. | A release publishes a Docker image to a shared registry tag; cancelling `publish` mid-push can leave a half-built or missing image for a version tag someone may already depend on. That risk is not "safe to cancel" in the sense item 1 asked for, so this workflow is a documented skip, not an oversight. |
| `edge.yml` | No change. | Already carries a job-level `concurrency: {group: edge-image, cancel-in-progress: true}` that is correct for its shape (always `main`'s tip, a moving `:edge` pointer) — see its own pre-existing comment. Re-adding a workflow-level group here would be redundant. |

`ARCHITECTURE.md`'s CI paragraph (§9) was checked and left unchanged: it
describes which suites `verify:browser` runs and which front end each one
drives, not the push/PR trigger conditions this lane touched — there was
nothing in it to update.

## 3. Item 2 — no path filter for docs commits

`ci.yml`'s `test` job runs `honesty-audit` and `check-brain` as ordinary
steps, and the brain-coverage/claims-register-citation suites inside
`npm test` — a docs-only commit can break any of them (a stale
`docs/brain/brain.graph.json`, a broken `[[wikilink]]`, an overclaim string
the honesty audit flags, a claims-register row gone stale). A `paths-ignore`
on `docs/**` would skip the checks that actually gate those. `check-docs`
was originally listed here too (round 1); it is `continue-on-error: true`
and cannot fail the job, so round 2 dropped it from this list — see the
Round 2 section's item 4 for the correction, prompted by the review's
Finding 7. Round 1 also placed this comment 19 lines below `on:` while
`paths-ignore` is written inside `on:` (Finding 6); round 2 moved it directly
above `on:`, with a one-line pointer inside the `push:`/`pull_request:`
blocks themselves.

## 4. Item 3 — the new test, shown failing first

Added to `tests/core/ci-gates-intact.test.ts`: a `topLevelConcurrencyBlock()`
helper (parallel to the file's existing `stepBlock()`, but for a workflow-
level key rather than a step, so it does not confuse `edge.yml`'s
job-nested `concurrency:` with a workflow-level one), plus two assertions
per file (`ci.yml`, `security.yml`): the group must exist and be keyed on
`${{ github.workflow }}-${{ github.ref }}`, and `cancel-in-progress` must be
exactly `${{ github.ref != 'refs/heads/main' }}`.

Run against the unmodified workflows (before this lane's `.github/`
changes, test file changes applied):

```
$ node --experimental-strip-types tests/core/ci-gates-intact.test.ts
...
# tests 34
# suites 1
# pass 30
# fail 4
```

4 of 34 subtests failed — the 2 new assertions × 2 files (`ci.yml`,
`security.yml`). After adding the `concurrency` blocks:

```
$ node --experimental-strip-types tests/core/ci-gates-intact.test.ts
...
# tests 34
# suites 1
# pass 34
# fail 0
```

34/34. The guard demonstrably could not have passed on the bug it exists to
catch.

## 5. Item 4 — docs

`docs/LANE_STANDARD.md` §7 item 1 keeps "push after EVERY commit" as
written (still the durability rule — nothing about this lane weakens it)
and gained one sentence: since 2026-09-13 `ci.yml`/`security.yml` cancel a
branch's own superseded run, so pushing often now costs one run in flight
per branch, not one run per commit left running to completion.

`ARCHITECTURE.md`: checked, no trigger-describing paragraph found to
update (see §2 above).

## 6. Gates

| Gate | Command | Result |
|---|---|---|
| Touched test | `node --experimental-strip-types tests/core/ci-gates-intact.test.ts` | 34/34 pass (0 fail) |
| Type check | `npm run lint` | exit 0 |
| Docs quality | `npm run check-docs` | exit 0 |
| Honesty audit | `npm run honesty-audit` | exit 0 |
| Brain freshness | `npm run brain` then `npm run check-brain` | graph regenerated, `check-brain` exit 0 |
| Brain coverage | `node --experimental-strip-types tests/core/brain-coverage.test.ts` | pass |
| YAML validity | `python3 -c "import yaml; yaml.safe_load(open(f))"` for all four workflow files | all OK |

No full `npm test` run — per the brief's GATES line, the orchestrator runs
it at merge.

## 7. Left undone / scope notes

- No change to `edge.yml` — it already had the correct, narrower
  concurrency shape for its own trigger (`workflow_run` on green `main`
  only). Confirmed rather than assumed: read the whole file (§2 above).
- No `concurrency` block on `release.yml` — a deliberate skip, documented
  in-file and in §2, not a narrowing of the brief: item 1 asked for the
  group only "where cancelling a superseded run is safe," and a release
  publish is the one workflow here where it is not.
- `docs/audits/2026-09-13-ci-green/` and the matching
  `docs/brain/Audits/Audit - 2026-09-13 CI Green.md` note did not exist on
  `main` — both created fresh on this branch, as the brief anticipated. The
  brain note is intentionally minimal and will need reconciling with
  `lane/voice-bound-ci-derivation`'s note of the same name at merge time (a
  duplicate-basename conflict, not a content conflict — the two lanes cover
  different work in the same batch).

## Round 1 tip (corrected in Round 2 — see Finding 9 below)

`d48b39f44f581661ac0d7a3f928d3d125c10601c` — this is what was actually
pushed to `origin/lane/ci-concurrency` as round 1's tip. The line that
originally stood here named `1eed4dcf474a440dbb769588b5fcf074d86df8ef`, the
PRE-amend commit object from the `git commit --amend` used to fill in this
same Tip section — an object that was never pushed and is unreachable from
any ref, kept alive only by this sandbox's local object store until the next
rebuild. Round 2's review (Finding 9) is right that the fix is one commit,
which is exactly what this section now is.

# Round 2

Review at `docs/audits/2026-09-13-ci-green/ci-concurrency-review.md`,
verdict REVISE against round-1 tip `d48b39f4`. Disposition below, one row
per item in the coordinator's numbered list (which matches the review's
Findings 1/2/9/6+7/3+4+8/5 respectively).

| # | Item | Disposition | Where |
|---|---|---|---|
| 1 (must) | "main never cancelled" asserted absolutely in four places; `cancel-in-progress: false` only protects a running run, not a pending one | **Fixed at the mechanism**, not just the prose: the group key now appends `github.sha` when `ref == 'refs/heads/main'`, so every main commit gets its own group and never shares one with any other run — nothing about main can be cancelled OR dropped, which is what the four sentences actually claimed. All four rewritten to explain this rather than to hedge. | `ci.yml:9-42` (comment + `concurrency:` block), `security.yml:24-47`, `docs/brain/Audits/Audit - 2026-09-13 CI Green.md` (rewritten "Round-1 finding, and the round-2 fix" paragraph), `docs/LANE_STANDARD.md:107-115` |
| 2 (must) | `topLevelConcurrencyBlock()` matches text inside comments — M6 (`cancel-in-progress: true` under a commented-out correct line) passes 34/34 | **Fixed**: comment lines (`trim().startsWith('#')`) are now skipped both when locating the opening `concurrency:` line and when collecting the block body, so a dead correct value in a comment can never satisfy a live regex. A permanent regression test reproduces exactly the M6 shape. Shown red on the un-fixed helper, green after — see §"Proof" below. | `tests/core/ci-gates-intact.test.ts` — `topLevelConcurrencyBlock()` (comment-skip logic) and the new test `'a commented-out correct cancel-in-progress line cannot shadow a live incorrect one (the M6 finding)'` |
| 3 (must) | Tip line named an unreachable pre-amend object, never pushed | **Fixed**: see "Round 1 tip (corrected in Round 2)" above — points at `d48b39f4`, the actual `origin/lane/ci-concurrency` tip round 1 pushed. | This report, the section immediately above |
| 4 (should) | No-`paths-ignore` comment sits 19 lines below `on:`, but `paths-ignore` is written inside `on:`; `check-docs` is `continue-on-error: true` and cannot fail the job, so it should not be named as a docs gate | **Fixed, both halves**: the comment now sits directly above `on:` in `ci.yml`, with a one-line pointer inside both the `push:` and `pull_request:` blocks themselves (where a `paths-ignore` edit is actually typed); `check-docs` is dropped from the list of things that can fail the job and the comment says plainly it is advisory. | `ci.yml:3-17` |
| 5 (nice) | Allow an optional quote in both regexes (M2/M4 false-fail on equivalent YAML); assert exactly one top-level `concurrency:` key (M5: a second block wins for YAML, the old helper read the first); LANE_STANDARD half-clause on citing the last push's run id | **All three done.** Both regexes now allow an optional leading/trailing quote (`(['"]?)…\1`) — M2 (double-quoted `cancel-in-progress`) no longer false-fails; M4 (single-line flow-mapping `concurrency: { … }`) still false-fails, because that is a structural difference `topLevelConcurrencyBlock`'s line-based block-finder does not parse at all (it never finds a line that is exactly `concurrency:`), not a quoting difference — out of scope for a one-line quote fix, and the failure direction stays safe (a real block written that way would need to be rewritten to the two-line form the rest of this repo's workflows already use, which is themselves the working examples). `topLevelConcurrencyKeyCount()` + a new "exactly one top-level concurrency group" test per file catches M5. LANE_STANDARD §7 item 1 gained the half-clause. | Regexes: `GROUP_KEY_RE`/`CANCEL_EXCEPT_MAIN_RE` in `tests/core/ci-gates-intact.test.ts`; uniqueness: same file, `topLevelConcurrencyKeyCount()` and its test; LANE_STANDARD: `docs/LANE_STANDARD.md:114-115` |
| 6 | Reviewer's Finding 5: a fifth workflow (`calibrate-voice-bound.yml`, on `lane/voice-bound-ci-derivation`, not yet on `main`) has no group and the hardcoded `ci.yml`/`security.yml` list would never notice | **Done**: the test now derives the workflow list from `fs.readdirSync('.github/workflows')` and requires every `*.yml` file to have a top-level concurrency group UNLESS it is named in an explicit `ALLOWED_NO_TOP_LEVEL_GROUP` map with a reason (`release.yml`, `edge.yml` — the latter's reason is separately verified against the actual file rather than trusted). A workflow landing later with no group and no allowlist entry now fails this test by construction, which is exactly the gap the review named. `calibrate-voice-bound.yml` itself is untouched — it does not exist on this branch, and adding a group to a file this lane cannot see would be inventing a change to code that is not here yet; whichever side merges second is who the review already named as responsible. | `tests/core/ci-gates-intact.test.ts` — `'every .github/workflows/*.yml file has a top-level (or, if allowlisted, job-level) concurrency group'`, `"edge.yml's allowlisted job-level concurrency group still exists…"`, `'release.yml documents, in-file, why it has no concurrency group'` |
| 7 (coordinator, mid-round) | Reading a red run, the GitHub job-log API returned only the last ~100 KB — run 34741928418's job summary said "# fail 2" with no way to name the two failures. `npm test`'s TAP stream is ~13,800 tests over ~7 minutes, far bigger than that. | **Done**: `ci.yml`'s (and, to keep the mirror test honest, `release.yml`'s) "Run tests" step now `set -o pipefail`s and pipes into `tee test-output.tap`; a new "Print test failure summary" step (`if: always()`) runs `scripts/tap-failures.mjs test-output.tap`, a small parser (own test file, 8 cases) that pulls out every `not ok` line plus its `location:` and `error:` — small enough to always survive the truncation; a new "Upload full test output (TAP)" step (`if: always()`, `actions/upload-artifact@v4`, `retention-days: 7`) keeps the complete stream retrievable for anything the summary leaves out. Both new steps are pinned in `ci-gates-intact.test.ts` for both files (shown red on the pre-item-7 workflows — 6 subtests failing — and green after; see §"Proof" for item 7 below). | `ci.yml` ("Run tests" step + the two new steps), `release.yml` (identical, required by the existing "mirrored gate steps run the SAME commands" test), `scripts/tap-failures.mjs`, `tests/scripts/tap-failures.test.ts`, `tests/core/ci-gates-intact.test.ts` (three new checks × 2 files) |

## Proof — the M6 comment-shadow mutation, before and after

Reproduced with the same style of copied-text mutation the review used (not
against the real files, which are already fixed): a synthetic `concurrency:`
block with a live `cancel-in-progress: true` and the correct expression left
directly above it as a `# was: …` comment.

Before the comment-skip fix — the exact round-1 `topLevelConcurrencyBlock`
body (collecting every line, comments included, into the block text) run
directly against the M6-shaped input, as a standalone script:

```
$ node -e "<round-1 topLevelConcurrencyBlock, verbatim> … CANCEL_RE.test(block) …"
block found: true
cancel-in-progress regex match (OLD helper, comments not stripped): true
```

`true` is wrong — the live line is `cancel-in-progress: true`, which should
not satisfy a regex requiring the ref-conditioned expression. It does,
because the block text handed to the regex still contains the commented-out
correct line, and `.test()` matches anywhere in the string.

After (round-2 helper, comment lines dropped before collection or search),
the actual committed regression test:

```
$ node --experimental-strip-types tests/core/ci-gates-intact.test.ts
...
ok 27 - a commented-out correct cancel-in-progress line cannot shadow a live incorrect one (the M6 finding)
...
# tests 40
# pass 40
# fail 0
```

`assert.doesNotMatch` is what the test asserts here — the helper this round
strips the comment before the regex ever sees it, so a synthetic M6 input
resolves to "no match," which is what a correct guard must do. Full mutation
matrix re-run against the fixed helper (M1 required-red, M2/M3/M5/M6 via
direct helper calls, one Node one-liner):

```
baseline (unmutated)              block: true group: true  cancel: true  count==1: true
M1 cancel-in-progress:true        block: true group: true  cancel: false count==1: true   <- correctly red (brief's required demo)
M2 quoted cancel-in-progress      block: true group: true  cancel: true  count==1: true   <- no longer a false fail (Finding 3)
M3 swapped order                  block: true group: true  cancel: true  count==1: true
M5 duplicate key (bad second)     block: true group: true  cancel: true  count==1: false  <- correctly red (Finding 4)
M6 comment shadow                 block: true group: true  cancel: false count==1: true   <- correctly red (Finding 2)
```

## Proof — item 7 (job-log-truncation fix), before and after

`scripts/tap-failures.mjs` itself, run directly against a captured TAP
stream with one failure (a real `node --test` run, not a fabricated
string):

```
$ node --test /tmp/fail-demo.test.mjs > /tmp/demo.tap 2>&1
$ node scripts/tap-failures.mjs /tmp/demo.tap
FAILURE SUMMARY: 1 failing test(s) (full TAP output is the uploaded workflow artifact)

not ok 2 - a failing test
  location: '/tmp/fail-demo.test.mjs:4:1'
  error: one is not two 1 !== 2
```

Its own test file: `node --experimental-strip-types tests/scripts/tap-failures.test.ts`
— 8/8 pass (multi-line block-scalar errors, short inline errors, the
zero-failures case, a missing-file case, and a case where one failure has no
diagnostic block at all and the scan must not swallow the next failure's).

The three new `ci-gates-intact.test.ts` checks (pipefail+tee, the summary
step exists and runs `if: always()`, the artifact-upload step exists and
runs `if: always()`), shown red on the pre-item-7 workflows and green after,
by temporarily swapping in the pre-item-7 `ci.yml`/`release.yml` (the
committed round-2 tip, before this round's item-7 commit) and restoring them
afterward:

```
$ cp <pre-item-7 ci.yml/release.yml> .github/workflows/
$ node --experimental-strip-types tests/core/ci-gates-intact.test.ts
...
# tests 46
# pass 40
# fail 6
$ <restore item-7 ci.yml/release.yml>
$ node --experimental-strip-types tests/core/ci-gates-intact.test.ts
...
# tests 46
# pass 46
# fail 0
```

6 red (the 3 new checks × 2 files), 0 red after — the guard could not have
passed on the workflows it exists to catch.

## Round-2 gates

| Gate | Command | Result |
|---|---|---|
| Touched test | `node --experimental-strip-types tests/core/ci-gates-intact.test.ts` | 46/46 pass (0 fail) — 34 round-1 + 6 review-driven (uniqueness ×2 files, workflow-list allowlist, edge.yml allowlist-reason check, release.yml allowlist-reason check, M6 regression) + 6 item-7 (pipefail/summary/upload ×2 files) |
| New test | `node --experimental-strip-types tests/scripts/tap-failures.test.ts` | 8/8 pass |
| Type check | `npm run lint` | exit 0 |
| Docs quality | `npm run check-docs` | exit 0 |
| Honesty audit | `npm run honesty-audit` | exit 0 |
| Brain freshness | `npm run brain` then `npm run check-brain` | graph regenerated (113 notes, 433 links), `check-brain` exit 0 |
| Brain coverage | `node --experimental-strip-types tests/core/brain-coverage.test.ts` | 7/7 pass |

No full `npm test` — per the cost rule for this round.

## Round-2 left undone / scope notes

- M4 (single-line flow-mapping `concurrency: { … }`) still false-fails — see
  item 5's disposition above. Not fixed; the direction is safe and no
  workflow in this repository is written that way.
- The brain-note reconciliation the review described (union both lanes'
  body sections and `sources:`/`Related:` lists under one file) is left for
  the orchestrator at merge, per the review's own §"Brain-note
  reconciliation" — this round only keeps THIS lane's note internally
  accurate against its own round-2 diff.
- `calibrate-voice-bound.yml` itself was not touched or added to the
  allowlist — it is not on this branch. The new derived-list test will
  require whoever merges it second to either give it a group or add it to
  `ALLOWED_NO_TOP_LEVEL_GROUP` with a reason, which is the review's own
  suggested resolution (Finding 5, "whoever merges second should add the
  group there, or record the skip").
- Item 7's fix was applied to `release.yml` as well as `ci.yml`, even though
  the coordinator's message named only `ci.yml`: `ci-gates-intact.test.ts`'s
  pre-existing "release.yml really does mirror ci.yml, step for step" and
  "mirrored gate steps run the SAME commands" checks require every named
  ci.yml step (and, for shared names, its exact run body) to have a
  release.yml counterpart — leaving release.yml's "Run tests" step
  unchanged would have failed both of those on this round's own diff, and a
  release run has the identical ~13,800-test TAP-truncation exposure ci.yml
  does. `edge.yml` and `security.yml` do not run `npm test` at all and were
  left untouched.
- `scripts/tap-failures.mjs`'s summary collapses a multi-line `error:` body
  to one line (joined with spaces) rather than preserving line breaks —
  deliberate, so one failure's summary entry cannot itself grow large
  enough to threaten the same truncation this step exists to avoid; the
  full stack trace is in the uploaded artifact.

## Tip

`<ROUND2_TIP_SHA>` — pushed to `origin/lane/ci-concurrency`. This value is
filled in by a small trailing commit once this one's own SHA is known
(`git rev-parse HEAD`), the same "last commit points at the commit a
reviewer should read" pattern `lane/voice-bound-ci-derivation` used for the
identical problem — see that lane's `026c0948`. Both commits are pushed
together, so §7's "push after every commit" is met with the one push this
round's brief asked for.
