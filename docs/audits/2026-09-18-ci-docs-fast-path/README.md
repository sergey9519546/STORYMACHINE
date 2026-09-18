# CI docs-only fast path

**Lane:** `lane/ci-docs-fast-path`. **What it changed:** `.github/workflows/ci.yml`,
`.github/workflows/release.yml`, `scripts/lib/docs-only.mjs` (new),
`scripts/classify-docs-only.mjs` (new), `tests/core/docs-only-classify.test.ts`
(new), `docs/LANE_STANDARD.md` §7, `CLAUDE.md`.

## The problem, measured

Every push to every branch runs `.github/workflows/ci.yml`'s two jobs in
full: `test` (~7 minutes) and `browser` (~5 minutes, the eight-suite
Playwright battery) — including a push that only edits a markdown file.
Measured on `main`: run **34793742299**
(`docs(audit): README for the necessity lane`), a commit that touched only
markdown, ran **00:46:28 -> 00:55:31**, about **9 minutes**, for a change
that could not possibly have touched `server/**`, `src/**`, or any scoring
path.

## Why the obvious fix (`paths-ignore`) is wrong

`ci.yml` opens with a comment that forbids adding a `paths-ignore` filter,
and it is correct. Several of the `test` job's steps are themselves the
mechanism that gates a documentation change:

- `npm run honesty-audit` ("Honesty string audit") — scans the shipped
  surface, including `README.md` and everything under `docs/`, for overclaim
  language and stale counts.
- `npm run check-brain` ("Check project brain (docs/brain freshness)") — the
  committed `docs/brain/brain.graph.json`/`GRAPH.md` must match a fresh
  regeneration, and every `[[wikilink]]` must resolve.
- `tests/core/brain-coverage.test.ts` and the claims-register-citation suite
  (`tests/core/claims-row-citations.test.ts`), which run inside `npm test`.

A `paths-ignore` filter would skip the whole job on a docs-only push —
including these three, which are exactly the checks that could catch a
docs regression (a broken wikilink, a stale brain export, an overclaim
string, a pointer into `docs/CLAIMS_REGISTER.md` that lands on nothing).
`check-docs` ("Check documentation quality") is correctly excluded from this
argument — it is `continue-on-error: true` and cannot fail the job either
way.

## The design: route, don't skip by path

A new `classify` job (separate from `test` and `browser`, see "why a
separate job" below) runs `scripts/classify-docs-only.mjs`, which:

1. Determines the changed-file set for this push (or PR) from git, handling
   every case named in the brief explicitly (see "Failure direction" below).
2. Hands that set to `scripts/lib/docs-only.mjs`'s `classifyDocsOnly()` — the
   pure, unit-tested classifier — and writes `docs_only=true|false` to
   `$GITHUB_OUTPUT`.

`test` and `browser` both `needs: classify` and use its output in `if:`
conditions on individual steps (or, for the whole `browser` job, at job
level).

### The allowlist

A changed-file set is **docs-only** if and only if **every** file in it
matches one of:

- `docs/**` — the file's first path segment is exactly `docs` (matched by
  regex on the segment, never a substring — `src/docs-panel.tsx` does NOT
  match).
- `**/*.md` — the file ends in `.md`, case-insensitive, anywhere in the tree
  including the repo root.

**Named non-matches, explicit in the brief and confirmed by the
implementation:** `.github/workflows/**` is not docs (it is the very
mechanism this classifier exists to keep honest); neither is `Dockerfile`;
neither is `package.json`; neither is anything under `tests/`, `scripts/`,
`server/`, `src/` — including a file whose *name* merely contains "docs".

**Decided and justified: `README.md` alone counts as docs-only.** It is not
under `docs/`, but it matches `**/*.md`. This is safe because README.md is
explicitly in `scripts/honesty-audit.mjs`'s `SCAN_ROOT_FILES` and in
`scripts/check-docs-quality.ts`'s `--all` root scope — both of which keep
running unconditionally regardless of this classifier's answer — and
`tests/scripts/smoke-gate-serve-mode.test.ts` (one of the 13 fast-path test
files) directly asserts README.md does not carry specific stale sentences.
Nothing that gates README.md is skipped by classifying it as docs.

**An empty change set is NOT docs-only.** It is either a genuine no-op
(nothing is saved by a fast path either way) or a sign the diff could not be
computed; the conservative default for an unclassifiable input is "run
everything."

### Failure direction (the impure half: `scripts/classify-docs-only.mjs`)

Every case the wrapper script cannot positively resolve to a real,
trustworthy changed-file set treats the push as **NOT docs-only** and runs
the full pipeline:

| Case | Resolution |
|---|---|
| No `GITHUB_EVENT_NAME` (local/manual run) | NOT docs-only |
| `push` event, `before` is the all-zeros sentinel (first push of a branch — no prior state to diff) | NOT docs-only |
| `push` event, `event.forced === true` (force-push) | NOT docs-only |
| `push` event, `before` does not resolve in this checkout (stale env var, shallow fetch, force-push after `git gc`) | NOT docs-only |
| `push` event, no resolvable `before` at all | NOT docs-only |
| `pull_request` event, `origin/main` does not resolve | NOT docs-only |
| Any `git diff` failure | NOT docs-only |
| Any other/unrecognized event | NOT docs-only |
| Any unexpected exception anywhere in the script | NOT docs-only (caught, logged, `docs_only` stays `false`) |

Verified end-to-end against the real repository (dry runs, not just the unit
table): a same-branch code push (`be2341ac..e310e1f8`) classified `false`; an
all-zeros `before` classified `false` with the reason printed; a garbage
40-hex `before` classified `false`; `forced: true` classified `false`; a
throwaway docs-only commit (adding one file under `docs/audits/`) classified
`true`.

### Why a separate `classify` job, not a step inside `test`

`browser` needs to skip at the **job level** — no checkout, no `npm ci`, no
Chromium download — because that provisioning, not only the battery step
itself, is most of the ~5-minute cost this exists to remove. A job-level
`if:` can only reference another job's output (`needs.classify.outputs.*`),
never a step inside its own job (job-level `if:` evaluates before any step
runs). A separate `classify` job that both `test` and `browser` depend on
adds a few seconds of serialization (a git diff over an already-fetched
checkout, not a browser download) while keeping `test` and `browser`
parallel with EACH OTHER, exactly as ci.yml's own header comment on the
`browser` job explains it is kept separate to preserve.

## What runs, what skips, on a docs-only push

| Check | Docs-only push | Reason |
|---|---|---|
| Type check (`tsc --noEmit`) | **Skipped** | tsc's inputs are the whole TS source tree + tsconfig.json + package.json, none of which a docs-only push can touch by construction — not named in the brief's explicit skip list, added here for the same "provably cannot be affected" reason as the others |
| Enforce no console.* under server/ | **Skipped** | scans `server/**`, untouched by definition |
| Server dead-code tripwire | **Skipped** | BFS from `server.ts` over `server/**`, untouched by definition |
| Honesty string audit | **Always runs** | scans `docs/**` and root `.md` files directly — this is a docs gate |
| Check documentation quality (`check-docs`) | **Always runs** | already `continue-on-error: true`; a docs gate |
| Check project brain (`check-brain`) | **Always runs** | `docs/brain/**` freshness and wikilink resolution — a docs gate |
| Run tests (full `npm test`, ~7 min) | **Skipped** | replaced by the narrower step below |
| **Run docs-gating tests (new step)** | **Runs (only here)** | 13 test files that assert on real documentation content — see below |
| Scoring-path change requires a measurement receipt | **Skipped** | by definition no scoring-path file changed |
| Report unverified gates | **Always runs** | cheap, unrelated to the diff, already `if: always()` |
| Metamorphic scoring gate | **Skipped** | exercises the scoring engine on fixture scripts, untouched by definition |
| Build (`npm run build`) | **Skipped** | the bundle is a function of `src/**`/`server/**`/`package.json`, none of which a docs-only push touches |
| **Whole `browser` job (8 Playwright suites)** | **Skipped (job-level)** | none of the eight suites can be affected by a docs/md-only change; skipped at job level so checkout/`npm ci`/Chromium download are also skipped, not only the battery step |

Any code change, or anything the classifier cannot positively prove is
docs-only, runs exactly what it ran before this lane.

## The 13 docs-gating test files

Selected by `grep -rl` over `tests/` for every suite that reads a `docs/`
path, then narrowed by hand to the ones that actually **assert on real,
committed documentation content** (not merely cite a `docs/` path inside an
error message, and not a heavy integration test whose own `docs/` touch is
incidental to a throwaway git fixture):

- `tests/core/brain-coverage.test.ts` — named explicitly in the brief.
- `tests/core/claims-row-citations.test.ts` — the claims-register-citation
  suite the brief asked to be located: checks every pointer into
  `docs/CLAIMS_REGISTER.md` from source/test/brain-note comments lands on a
  row that actually exists.
- `tests/core/documentation-truth.test.ts` — asserts specific legacy-report
  claims stay retired.
- `tests/core/rulebook-links.test.ts` — every (pass, rule) anchor exists in
  `docs/rulebook/<pass>.md`.
- `tests/core/rulebook.test.ts` — `docs/rulebook/README.md`'s published rule
  count matches live extraction; regenerating produces a zero diff against
  `docs/rulebook/**`.
- `tests/core/rule-test-coverage.test.ts` — `docs/rulebook/README.md`'s
  published coverage sentence matches the live measurement.
- `tests/core/p0-sample-drift.test.ts` — `docs/user-validation/sample-coverage-report.html`
  (itself under `docs/**`, hence in the allowlist) matches the generator's
  current output.
- `tests/core/honesty-audit-claims.test.ts` — asserts the real repository
  currently passes `honesty-audit.mjs`'s claims-register lane.
- `tests/core/public-benchmark.test.ts` — asserts
  `docs/p1-benchmark/MEASUREMENT_RECEIPTS.md` still carries its required
  PUBLIC-CORPUS section and reproducible command.
- `tests/core/coverage-letter.test.ts` — asserts, among other things, that
  `docs/brain/Surfaces/Surface - Coverage Letter.md` does not describe the
  coverage letter as "one-to-two-page" (a retired, quoted-only phrase).
- `tests/core/finding-jump.test.ts` — asserts the fixture panel actually
  renders the pair `docs/CLAIMS_REGISTER.md` row 80 quotes.
- `tests/scripts/smoke-gate-serve-mode.test.ts` — asserts README.md,
  CONTRIBUTING.md, ci.yml, and a brain Gate note no longer carry a specific
  retired sentence about which suite boots `NODE_ENV=production`.
- `tests/scripts/owner-measure-plan.test.ts` — validates the real, committed
  `docs/p1-benchmark/owner-measurement-plan.json` against the plan schema.

All 13 run together in well under a minute (measured: 0.23s + 0.26s + 0.13s +
0.19s + 0.65s + 7.6s + 1.6s + 3.07s + 4.65s + 2.44s + 2.15s + 0.13s + 0.13s
wall time, individually, on this sandbox — well under the ~7 minutes the full
`npm test` costs).

**Deliberately excluded, with reasons:**

- `tests/scripts/owner-measure-e2e.test.ts` — times out past 60s on this
  sandbox (real git clones/worktrees/pushes); its own `docs/` reads are
  incidental to a throwaway fixture branch, not a check on real repo
  content.
- `tests/core/blind-pairs-discrimination.test.ts` — scores fixture
  screenplays through the real doctor engine; it only *cites*
  `docs/p1-benchmark/BLIND_PAIRS_2026-09-04.md` in failure messages, it does
  not read or assert on that file's content. A scoring-engine gate, not a
  docs gate.
- `tests/core/docker-context.test.ts`, `tests/core/finding-jump.test.ts`'s
  sibling assertions elsewhere, `tests/scripts/owner-measure-e2e.test.ts` —
  each either references a `docs/` string incidentally (a fixture path, an
  error-message example) rather than reading and asserting on committed doc
  content, or is otherwise unrelated code-path coverage.
- `tests/core/check-scoring-receipt.test.ts`,
  `tests/core/scoring-receipt-guard.test.ts` — behavioral tests of the
  scoring-receipt guard script itself, over synthetic throwaway repos; they
  reference `docs/p1-benchmark/MEASUREMENT_RECEIPTS.md` only as a path
  constant used inside those fixtures, not as real repo content under test.

## `tests/core/ci-gates-intact.test.ts` — what it caught, and how it was satisfied

That file asserts `release.yml` mirrors `ci.yml` **step for step**: every
`ci.yml` step name must have a same-named counterpart in `release.yml`
("release.yml really does mirror ci.yml, step for step"), and every step
name shared by both files must carry an **identical run body**, except one
allowlisted, documented divergence ("mirrored gate steps run the SAME
commands, not just the same names").

Adding the `classify` job's step (`Classify changed files (docs-only fast
path)`) and the new `Run docs-gating tests (docs-only fast path)` step to
`ci.yml` first failed this exact assertion — reproduced directly:

```
not ok 17 - release.yml really does mirror ci.yml, step for step
  release.yml claims (in its header) to mirror ci.yml, but these ci.yml
  steps have no counterpart there. ...
  + [ 'Run docs-gating tests (docs-only fast path)' ]
  - []
```

Fixed by adding a matching `classify` job and `Run docs-gating tests` step to
`release.yml`, with **identical run bodies** (byte-for-byte, verified by
extracting both step blocks and diffing them). Their *effect* is
deliberately different: `ci.yml`'s copies carry `if:` conditions on
`needs.classify.outputs.docs_only`; `release.yml`'s copies carry no `if:` at
all and always run — a release (`v*` tag push or `workflow_dispatch`) is a
rare, milestone event, not the frequent small push this fast path targets,
so `release.yml` keeps running every gate unconditionally, exactly as
before this lane. The mirror test only compares step names and `run:` text,
never `if:` conditions, so this divergence is invisible to it and needed no
`ALLOWED_BODY_DIVERGENCE` entry.

After the fix: `tests/core/ci-gates-intact.test.ts` is 47/47 green.

## Branch-protection finding

Checked directly against the GitHub API before deciding whether `browser`
could be skipped outright or needed to run-and-report-success instead:

```
$ curl -sS https://api.github.com/repos/sergey9519546/STORYMACHINE/branches/main
"protected": false
"protection": {
  "enabled": false,
  "required_status_checks": { "enforcement_level": "off", "contexts": [], "checks": [] }
}
```

`main` has **no branch protection and no required status checks** — this
repository pushes directly to `main`, matching the brief's own stated
expectation. A job that never runs (skipped) cannot fail a required check
that does not exist, so `browser`'s job-level `if:` skip is safe as
designed. If branch protection is ever added with `browser` as a required
check, this design needs to change to a cheap-pass shape (the job still runs
and reports success quickly) instead of a skip — noted directly in `ci.yml`'s
comment on the `browser` job so a future editor sees the dependency.

## Proof the classifier can fail (LANE_STANDARD §3)

`tests/core/docs-only-classify.test.ts`, 21 cases across two describe blocks
(docs-only cases that must be `true`, mixed/non-docs cases that must be
`false`), including every adversarial case named in the brief:
`docs/foo.md` + `server/app.ts`; `.github/workflows/ci.yml` alone;
`README.md` alone (decided and justified above); a path containing "docs"
but not under it (`src/docs-panel.tsx`); an empty change set; plus a
same-prefix-but-different-directory case (`docsite/config.json`) guarding
against a naive `startsWith("docs")` instead of `startsWith("docs/")`.

**Inverting the classifier's core line** (`return
changedFiles.every(...)` -> `return !changedFiles.every(...)`) and
re-running:

```
# tests 21
# suites 5
# pass 5
# fail 16
```

Reverting:

```
# tests 21
# suites 5
# pass 21
# fail 0
```

## `docs/LANE_STANDARD.md` §7 — the durability-cadence change

§7 item 1 said "runs `git push -u origin lane/<name>` after EVERY commit."
The owner objected: "remote repositories are meant for milestone
synchronization, not real-time keystroke saving." Rewritten to push at
**meaningful checkpoints** — a completed unit of work, before starting a
long-running operation, before handing off to a reviewer, and always before
the lane goes idle — while keeping the 2026-09-07 incident (a sandbox
rebuild that erased every worktree, the scratch directory, every local
`audit/*` tag, and a reviewed-MERGE lane's two never-pushed commits) as the
stated justification for why the durability property itself is not relaxed,
only re-timed. `CLAUDE.md`'s own restatement of the same rule was updated to
match, so the two files cannot silently diverge on this point.

## Not done / left for a future lane

- The `classify` job's own step ("Classify changed files") was, by the same
  mirror-test constraint, also added to `release.yml`, where its output goes
  unused. This is honest (documented in-file, in this README, and in the
  brain note) but is a small amount of permanent duplication a future
  redesign of `ci-gates-intact.test.ts`'s mirror rule could remove — out of
  scope here, since the rule itself must not be weakened.
- `edge.yml` (currently non-functional per `docs/PATH_TO_EXCELLENCE.md` — the
  account-level GitHub Actions block) triggers on `ci.yml`'s `workflow_run`
  conclusion, not on the `browser` job specifically; a skipped `browser` job
  does not turn `ci.yml`'s overall conclusion into a failure, so this lane
  does not change `edge.yml`'s behavior once Actions is unblocked. Not
  verified with a real run, since Actions could not be exercised from this
  sandbox either.
