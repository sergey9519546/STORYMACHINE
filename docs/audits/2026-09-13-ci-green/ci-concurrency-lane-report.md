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

`ci.yml`'s `test` job runs `check-docs`, `honesty-audit`,
`check-brain`, and the claims-register tests as ordinary steps of the same
job that runs `npm test` and `npm run build` — a docs-only commit can break
any of them (a stale `docs/brain/brain.graph.json`, a broken `[[wikilink]]`,
an overclaim string the honesty audit flags, a claims-register row gone
stale). A `paths-ignore` on `docs/**` would skip the one job that actually
gates those. The comment recording this sits directly beside the `on:`
trigger block in `ci.yml`, where a future edit adding `paths-ignore` would
have to walk past it.

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

## Tip

`1eed4dcf474a440dbb769588b5fcf074d86df8ef` — pushed to
`origin/lane/ci-concurrency`. (One commit for the whole lane, per the brief:
recording the SHA here means this line was written before the final
`git commit --amend`, so the amended commit's actual SHA — the one really
pushed — is reported in this session's final message rather than
re-editing this file into a longer amend chain for no functional gain.)
