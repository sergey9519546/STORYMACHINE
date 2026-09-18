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
  surface for overclaim language and stale counts. **Round-2 correction: its
  scope is narrower than round 1 of this document claimed.**
  `scripts/honesty-audit.mjs:21-43` is explicit — `SCAN_DIRS` is `src`,
  `public`, `server`; `SCAN_ROOT_FILES` is `index.html`, `README.md`,
  `metadata.json`, `package.json`; and its own comment says `docs/**` and the
  other root `*.md` files "are exempt by construction: we simply never walk
  into them." The only `docs/` it touches are one explicitly named artifact
  (`docs/user-validation/sample-coverage-report.html`) and a narrow
  stale-rule-count pass over four specific figures. Demonstrated:
  appending *"STORYMACHINE is the industry-standard, world-class,
  revolutionary tool and we guarantee Hollywood-standard results"* to
  `docs/PATH_TO_EXCELLENCE.md` leaves honesty-audit **clean, exit 0**; the
  same sentence in `README.md` fails it immediately.
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
| `push` event, no resolvable LAST-SUCCESSFUL-RUN tip for this ref (round 2) | NOT docs-only |
| `push` event, no merge base between that tip and `before` (round 2) | NOT docs-only |
| The runs API is unreachable, non-200, or returns a malformed payload (round 2) | NOT docs-only |
| `GITHUB_API_URL`/`GITHUB_REPOSITORY`/`GITHUB_REF_NAME`/`GITHUB_WORKFLOW_REF` missing or malformed (round 2) | NOT docs-only |
| Any unexpected exception anywhere in the script | NOT docs-only (caught, logged, `docs_only` stays `false`) |

**Round-2 correction: this table used to be prose, and prose is not a test.**
Round 1 backed it with dry runs that left no artifact, and the independent
review re-ran every row hostilely and found them all true — but the two
defects it DID find were both in this file, which had no test at all.
`tests/scripts/classify-docs-only.test.ts` now drives the real script bytes
(copied verbatim into throwaway git repositories, where the suite's first
case asserts those copies are byte-identical to the committed files) against
real histories and a loopback stand-in for the Actions runs API: **38 cases**, including every row
above, renames in both directions, a copy that is genuinely docs-only, a
repo-level `diff.renames=copies` config, a shallow clone, unrelated
histories, a cancelled-run branch, and the positive path so the suite can
fail in both directions. RED-first evidence: dropping `--no-renames` fails 4,
dropping the `DOCS_ONLY_FORCED` fallback fails 1, chaining from `before`
instead of the validated base fails 13.

### Why a separate `classify` job, not a step inside `test`

`browser` needs to skip at the **job level** — no checkout, no `npm ci`, no
Chromium download — because that provisioning, not only the battery step
itself, is most of the ~5-minute cost this exists to remove. A job-level
`if:` can only reference another job's output (`needs.classify.outputs.*`),
never a step inside its own job (job-level `if:` evaluates before any step
runs). A separate `classify` job that both `test` and `browser` depend on
serializes a small job in front of them while keeping `test` and `browser`
parallel with EACH OTHER, exactly as ci.yml's own header comment on the
`browser` job explains it is kept separate to preserve.

**What that costs, measured (round-2 review item 8 — round 1 said "a few
seconds" and quantified nothing).** In run **35294788628**, a FULL run on
this lane, the `classify` job occupied 01:18:33 -> 01:18:41 — **8 seconds** —
and `test`/`browser` were not created until 01:18:43, against a run created
at 01:18:31. That is about **10 s of added wall time plus one extra runner
slot on every FULL run**, which is the majority of runs. It is a real cost
and it belongs in the ledger next to the saving.

## What runs, what skips, on a docs-only push

| Check | Docs-only push | Reason |
|---|---|---|
| Type check (`tsc --noEmit`) | **Skipped** | tsc's inputs are the whole TS source tree + tsconfig.json + package.json, none of which a docs-only push can touch by construction — not named in the brief's explicit skip list, added here for the same "provably cannot be affected" reason as the others |
| Enforce no console.* under server/ | **Skipped** | scans `server/**`, untouched by definition |
| Server dead-code tripwire | **Skipped** | BFS from `server.ts` over `server/**`, untouched by definition |
| Honesty string audit | **Always runs** | scans `README.md` (in `SCAN_ROOT_FILES`), `src/**`, `public/**`, `server/**` and the one named `docs/` artifact. It is a gate on a README-only push; it is **not** a general `docs/**` gate — see the correction above and "What nothing catches" below |
| Check documentation quality (`check-docs`) | **Always runs** | already `continue-on-error: true`; a docs gate |
| Check project brain (`check-brain`) | **Always runs** | `docs/brain/**` freshness and wikilink resolution — a docs gate |
| Run tests (full `npm test`, ~7 min) | **Skipped** | replaced by the narrower step below |
| **Run docs-gating tests (new step)** | **Runs (only here)** | 17 test files that assert on real documentation content, derived rather than hand-picked — see below |
| Scoring-path change requires a measurement receipt | **Skipped** | by definition no scoring-path file changed |
| Report unverified gates | **Always runs** | cheap, unrelated to the diff, already `if: always()` |
| Metamorphic scoring gate | **Skipped** | exercises the scoring engine on fixture scripts, untouched by definition |
| Build (`npm run build`) | **Skipped** | the bundle is a function of `src/**`/`server/**`/`package.json`, none of which a docs-only push touches |
| **Whole `browser` job (8 Playwright suites)** | **Skipped (job-level)** | none of the eight suites can be affected by a docs/md-only change; skipped at job level so checkout/`npm ci`/Chromium download are also skipped, not only the battery step |

Any code change, or anything the classifier cannot positively prove is
docs-only, runs exactly what it ran before this lane. **Round-2 correction:
that sentence was false as written in round 1.** A rename out of `server/`
into `docs/` was a code change that classified DOCS-ONLY and skipped every
row marked *Skipped* above. See "The git invocation" below; it is true now,
and `tests/scripts/classify-docs-only.test.ts` is what makes it checkable.

### What nothing catches (round-2 review item 7)

The design leaned on "honesty-audit gates `docs/**`, so a fast path that
keeps it is safe." That premise is wrong, and the correction has a
consequence worth stating rather than papering over: **no mechanical check in
this repository scans `docs/**` prose for overclaim language.** What does
cover `docs/**`:

- `honesty-audit`'s stale-rule-count pass — four specific FIGURES across 522
  tracked markdown files, not language;
- `check-docs` — AI-writing patterns, and it is `continue-on-error: true`, so
  it cannot fail anything either way;
- `check-brain` — graph freshness and wikilink resolution, not prose;
- `tests/core/documentation-truth.test.ts` and
  `tests/scripts/smoke-gate-serve-mode.test.ts` — a handful of specific
  retired sentences in specific named files;
- `docs/CLAIMS_REGISTER.md` plus `tests/core/claims-row-citations.test.ts` —
  that a citation lands on a row, not that the row is honest.

An overclaim written into `docs/PATH_TO_EXCELLENCE.md` passes every one of
them. **The fast path removes nothing here**: honesty-audit behaves
identically on both paths, and it runs unconditionally. But the argument for
why the fast path is safe must not rest on a gate that does not exist. If
`docs/**` overclaim scanning is wanted, it is a separate change to
`SCAN_DIRS` with its own false-positive budget over 522 files, and it is not
this lane's to make.

## The 17 docs-gating test files, and how the list is derived

**Round 1 picked this list by judgment and got it wrong. It is now derived.**
The independent review found two suites that gate documentation, were not on
the list, and were not in this document's excluded set either — the fast path
went GREEN where the full path went RED. Extending the same derivation found
a third. All three are on the list; the list itself is now pinned by
`tests/core/docs-gating-set.test.ts`.

### What round 1 missed

| suite | what it reads | the docs-only edit that breaks it |
|---|---|---|
| `tests/routes/root-cause-parity.test.ts:439-450` | `docs/brain/Surfaces/Surface - Root Cause Pipeline.md` — asserts the note quotes six values re-derived from a live run | change any of the six, e.g. `Scenes 2-4, 6-9` or the `| root causes | 70 | 69 |` row |
| `tests/core/scoring-receipt-guard.test.ts:41-46` | the REAL committed `docs/p1-benchmark/MEASUREMENT_RECEIPTS.md` | reword one `### … Receipt:` heading |
| `tests/core/telemetry-docs-truth.test.ts:8-30` | the REAL committed `ROADMAP.md`, thirteen phrases inside its P3 section | drop "not durable" from that section |

The third was invisible to the review's own derivation
(`grep -l "'docs/"`), because the path is written `'../../ROADMAP.md'` — and
a root-level `.md` file IS docs to this classifier. That is the argument for
deriving rather than grepping by hand, made by the derivation against the
grep that found the first two.

Round 1's stated reason for excluding `scoring-receipt-guard.test.ts` — that
it "references `docs/p1-benchmark/MEASUREMENT_RECEIPTS.md` only as a path
constant used inside those fixtures" — was **factually wrong**. It is true of
`tests/core/check-scoring-receipt.test.ts`, whose `RECEIPT_REL` is only ever
joined onto a `mkdtempSync` fixture directory. It is not true of the guard
test, which reads the committed ledger at `:41` and asserts against it at
`:46`. The two files were excluded on one reason that only covered one of
them.

### The derivation

`tests/core/docs-gating-set.test.ts` recomputes the candidate set on every
run. A `tests/**/*.test.ts` file is a **candidate** when both hold:

1. it, or a non-test module it imports **directly** (one hop), calls a
   filesystem read (`readFileSync`, `readdirSync`, `existsSync`, `statSync`,
   `lstatSync`, `opendirSync`, `globSync`, `readFile`); and
2. it, or that same one-hop module, contains a **string literal** — taken
   from the TypeScript parser, so a comment can never contribute one — that
   resolves, against the repository root or against the containing file's own
   directory, to a path that **exists in this checkout** and that the
   classifier itself would call docs (`docs`, anything under `docs/`, or
   anything ending in `.md`).

The one-hop arm is load-bearing: `tests/core/p0-sample-drift.test.ts` names
no docs path at all — it reads `OUT_FILE`, imported from
`scripts/generate-p0-sample-report.ts`, which builds
`docs/user-validation/sample-coverage-report.html`.

"Resolves to a path that exists" is what keeps the derivation honest without
drowning in noise. A `docs/…` path quoted inside an ERROR MESSAGE is a
sentence, not a path, so it resolves to nothing. That is why
`tests/core/blind-pairs-discrimination.test.ts` and
`tests/core/docker-context.test.ts` — both hand-excluded in round 1 with
prose reasons — need no exclusion entry at all now: the derivation agrees
they are not candidates, mechanically.

**24 candidates. 17 run. 7 excluded, each with a reason that cites a file or
a line**, in `EXCLUDED` in that test, where a stale entry (the file is gone,
or the derivation no longer considers it a candidate) fails the suite.

### The 17

| file | what it asserts on | s |
|---|---|---|
| `tests/core/brain-coverage.test.ts` | every Decision Log entry, audit dir, dated measurement doc and session record has a brain note | 0.4 |
| `tests/core/claims-row-citations.test.ts` | every pointer into `docs/CLAIMS_REGISTER.md` lands on a row that exists | 0.5 |
| `tests/core/coverage-letter.test.ts` | `docs/brain/Surfaces/Surface - Coverage Letter.md` does not carry a retired phrase | 3.6 |
| `tests/core/docs-gating-set.test.ts` | **this list** — see above. On the list because a docs-only DELETION changes what it derives | 13.7 |
| `tests/core/documentation-truth.test.ts` | retired legacy-report claims stay retired, across root `*.md` | 0.2 |
| `tests/core/finding-jump.test.ts` | the fixture panel renders the pair `docs/CLAIMS_REGISTER.md` row 80 quotes | 3.2 |
| `tests/core/honesty-audit-claims.test.ts` | the real repository passes honesty-audit's claims-register lane | 5.3 |
| `tests/core/p0-sample-drift.test.ts` | `docs/user-validation/sample-coverage-report.html` matches the generator | 1.6 |
| `tests/core/public-benchmark.test.ts` | `MEASUREMENT_RECEIPTS.md`'s PUBLIC-CORPUS section, and each corpus set's provenance file | 6.4 |
| `tests/core/rule-test-coverage.test.ts` | `docs/rulebook/README.md`'s published coverage sentence | 8.6 |
| `tests/core/rulebook-links.test.ts` | every (pass, rule) anchor exists in `docs/rulebook/<pass>.md` | 0.4 |
| `tests/core/rulebook.test.ts` | `docs/rulebook/README.md`'s rule count; regeneration is a zero diff | 0.9 |
| `tests/core/scoring-receipt-guard.test.ts` | **added round 2** — the committed `MEASUREMENT_RECEIPTS.md` | 4.0 |
| `tests/core/telemetry-docs-truth.test.ts` | **added round 2** — `ROADMAP.md`'s P3 section | 0.3 |
| `tests/routes/root-cause-parity.test.ts` | **added round 2** — `Surface - Root Cause Pipeline.md`'s six values | 5.3 |
| `tests/scripts/owner-measure-plan.test.ts` | the committed `docs/p1-benchmark/owner-measurement-plan.json` | 0.2 |
| `tests/scripts/smoke-gate-serve-mode.test.ts` | `README.md`, `CONTRIBUTING.md`, `ci.yml` and a brain Gate note | 0.2 |

**55 s total**, run individually on this sandbox (sum of the column above;
the runner did the thirteen-file version in 24 s — run 35296219834, step 12).
Against a ~7-minute `npm test` plus a ~5-minute browser job. The single
biggest line is the guard itself at 13.7 s, which parses every test file; it
is on the list because a docs-only DELETION changes what it derives.

### The 7 excluded, and why

Each reason is checkable against the file, not a category label. The full
text lives in `EXCLUDED` in `tests/core/docs-gating-set.test.ts`.

| file | why it cannot fail on a documentation edit |
|---|---|
| `tests/core/check-scoring-receipt.test.ts` | `RECEIPT_REL` (`:22`) is only ever joined onto a `mkdtempSync` fixture (`:64`, `:147`, `:179`, `:225`). Its one `REPO_ROOT` read is `scripts/lib/import-graph.mjs` (`:311`), which is code |
| `tests/core/public-benchmark-limits.test.ts` | imports `PUBLIC_CORPUS_SETS` for its numeric limits; inherits the `provenanceFile` strings but never reads them. The suite that DOES read them is on the list |
| `tests/core/scene-segments.test.ts` | same one-hop inheritance from `scripts/lib/public-benchmark.ts`; reads no `.md` |
| `tests/core/sample-coverage-facts.test.ts` | inherits `docs/user-validation` from the generator but reads `src/lib/sample-coverage-facts.ts`, a SOURCE module. Its docs-reading sibling `p0-sample-drift` is on the list |
| `tests/scripts/discharge-obligations.test.ts` | builds its receipts with `mkdtempSync`/`writeFileSync` (`:22`) and asserts on fixtures it wrote |
| `tests/scripts/receipt-conversion.test.ts` | imports four PURE functions from `check-scoring-receipt.mjs` and feeds them literal strings |
| `tests/scripts/owner-measure-e2e.test.ts` | real git clones and worktrees; every `docs/` path is joined onto a fixture build dir or read through `git show <fixture-tip>:…`. Also times out past 60 s, which would defeat a path whose point is to cost seconds |
| `tests/scripts/classify-docs-only.test.ts` | the fast path's own fixture suite: it WRITES `README.md`/`ROADMAP.md`/`docs/**` into throwaway repositories under `os.tmpdir()` |

### What the derivation does NOT claim

It is not complete. A test that reads a docs file through a path assembled at
runtime from non-literal parts, or through a module more than one import hop
away, is invisible to it. Two hops were considered and rejected:
`server/lib/rulebook-count.ts` reads `docs/rulebook/coverage.json` at module
load and is reachable from `doctor.ts`, so a two-hop rule would make most of
the suite a candidate while adding nothing — a change to that JSON is already
caught by `rulebook.test.ts` and `rule-test-coverage.test.ts`, both on the
list. The claim is narrower and checkable: **every suite the derivation can
see is either run on the fast path or excluded on a written, currently-true
reason.**

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

### Round 2: what those 47 assertions could NOT see (review item 10)

Before this lane, no `ci.yml` gate step carried an `if:` at all. Seven of
them now do, and the mirror test's existing checks see a gate that is
`continue-on-error`, a gate whose `if:` contains a literal `false`, and a
gate missing from `release.yml` — but not a gate whose `if:` is merely
**wrong**. Demonstrated against the round-1 tree (byte-identical to
`origin/main` for this file): copy-pasting the fast-path step's condition
onto "Type check" —

```
      - name: Type check
        if: needs.classify.outputs.docs_only == 'true'      # was != 'true'
        run: npm run lint
```

— skips `tsc` on every FULL run, and the round-1 suite reported **47 tests,
47 pass, 0 fail**. (The reviewer's own example, `== 'false'`, happens to trip
the pre-existing literal-`false` scan; this one does not, and the hole is the
same size either way.)

**Six additions, all RED under the mutation they exist for:**

| assertion | mutation | round 1 | round 2 |
|---|---|---|---|
| every conditional step carries EXACTLY its intended condition | `Type check` -> `== 'true'` | 47/47 pass | **RED** |
| " | `Type check` -> `== 'false'` | 47/47 pass* | **RED** |
| " | fast-path step -> `!= 'true'` (runs nothing on a docs push) | 47/47 pass | **RED** |
| no other step has quietly become conditional | add `if:` to `Honesty string audit` | 47/47 pass | **RED** |
| the `browser` job's job-level `if:` is exactly the skip expression | `browser` -> `== 'false'` (battery never runs again) | 47/47 pass* | **RED** |
| `classify` grants exactly `contents: read` + `actions: read` | add `packages: write` | 47/47 pass | **RED** |
| `release.yml` never references `needs.classify` | wire `needs: classify` into release's `test` | 47/47 pass | **RED** |

\* these two also trip the pre-existing literal-`false` scan, so round 1
caught them by accident; the other five it did not catch at all.

`git diff origin/main -- tests/core/ci-gates-intact.test.ts` is
**+182 / -0** — additions only. Nothing above the round-2 marker comment was
touched, and the mirror rule was not weakened to accommodate anything.

### Round 2: `release.yml`'s mirrored step stays unconditional, on purpose (review item 9)

The review measured it: the mirrored `Run docs-gating tests` step re-runs, on
every release, files the full `npm test` in the same job has already run —
**55 s on this sandbox, 24 s on the runner** for the thirteen-file version.
Real, and not free.

It stays unconditional anyway. The only way to skip it is
`if: needs.classify.outputs.docs_only == 'true'`, which requires
`needs: classify` on `release.yml`'s `test` job — and that puts the
classifier on the release's critical path. `publish` needs `[test, browser]`;
a job skipped because a `needs` dependency FAILED leaves the run at
`failure`. A broken classifier would turn a tag push into a release that does
not publish, to save under a minute on an event that happens a few times a
year. The trade is obvious in that direction.

What the review actually asked for was that the inertness be **mechanical
rather than commented**, and it now is: `ci-gates-intact.test.ts` asserts
`release.yml` contains no `needs.classify` reference anywhere outside a
comment, so wiring one in later fails the build. The mirror rule itself was
not weakened.

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

### Round 2: the impure half, and the git invocation

The 21 cases above cover `scripts/lib/docs-only.mjs`. The independent review
found both of its defects in the OTHER file — `scripts/classify-docs-only.mjs`,
which had no test at all — and said so plainly: *"That is why item 1
survived."*

**The git invocation (blocker 1).** `git diff --name-only` is not a neutral
listing of the paths a range touched. `diff.renames` defaults to true, and
for a detected rename `--name-only` prints **only the destination**:

```
$ git mv server/big.ts docs/big.md && git commit
$ git diff --name-only $BASE..$HEAD
docs/big.md
$ git diff --name-status $BASE..$HEAD
R100    server/big.ts   docs/big.md
$ git diff --name-only --no-renames $BASE..$HEAD
docs/big.md
server/big.ts
```

A push DELETING a TypeScript module from `server/**` therefore classified
DOCS-ONLY and skipped the type check, no-console, reachability, the whole
`npm test`, the receipt guard, metamorphic, build and the entire `browser`
job.

The fix is not one flag for one bug. Both diff arms now go through a single
`gitDiffNames()` helper, and the script's header names the whole class:
rename detection, copy detection (`diff.renames=copies` — verified that
`--no-renames` on the command line still emits both paths under it),
similarity thresholds (`-M`/`-C`/`diff.renameLimit`, removed rather than
tuned), path quoting (`core.quotePath` pinned to `true`; verified that git
C-quotes a control character in a path **regardless** of that setting, so the
"split on newline, smuggle a second path" attack is unreachable either way),
why `-z` is deliberately NOT used (it turns quoting off and would pass a raw
newline-bearing path through instead of failing it closed), why
`--diff-filter` is deliberately NOT used (filtering to `ACMR` would drop a
deletion — the same hole respelled), and submodules (a gitlink path is
neither under `docs/` nor `*.md`, so it fails the allowlist like anything
else).

**RED-first (LANE_STANDARD §3), against the 38-case fixture suite:**

| mutation | result |
|---|---|
| drop `--no-renames` from `gitDiffNames()` | 38 tests, 34 pass, **4 fail** |
| drop the `DOCS_ONLY_FORCED` env fallback | 38 tests, 37 pass, **1 fail** |
| chain from `before` instead of the validated base | 38 tests, 25 pass, **13 fail** |
| none (the shipped tree) | 38 tests, **38 pass**, 0 fail, 8.0 s |

### The validated base (round-2 review item 5)

`ci.yml:45` sets `cancel-in-progress` for every ref except `main`, so a lane
branch's in-flight run is cancelled by the next push. Chaining from
`github.event.before` assumed `before` was validated. It frequently was not:

- push 1: `A -> B` touches `server/**` -> `docs_only=false`, full run STARTS
- push 2 (docs only): `B -> C` -> cancels push 1's run; its own range is
  docs-only -> lint, `npm test`, metamorphic, build and the whole browser job
  skip
- net: the branch's only COMPLETED run is green, and the `server/**` change
  at `B` was never type-checked, tested or built by any completed run

`main` is insulated (per-SHA concurrency group, plus an `--ff-only` merge
presents the full range to main's own run) — but a lane branch is exactly
where review evidence comes from.

**The fix, and why this one rather than the alternative.** The classifier now
diffs from `merge-base(L, before)`, where `L` is the tip of the last run of
THIS workflow on THIS ref that actually completed successfully, read from
Actions' own runs API (`scripts/lib/validated-base.mjs`, a pure picker; the
fetch lives in the impure script). The alternative the brief offered — detect
that this run supersedes a cancelled one and disable the fast path — needs
the SAME API call to see the cancelled run, so it costs the same and proves
less. Properties:

- when the previous push's run completed green, `L` **is** `before`, the
  merge base is `before`, and the range is byte-identical to the old
  behavior. The fast path costs nothing in the common case, and a test
  asserts the log does not say "widened";
- when a run was cancelled, `L` is older and the range widens to cover
  everything no completed run has proved;
- when a run **failed**, the same rule applies, so a docs-only push landing
  on top of a red commit also re-runs everything. That shape was never named
  in the review; the same rule closes it for free;
- `merge-base` rather than "just use `L`" because `L` need not be an ancestor
  of `before` after a rebase. The merge base is an ancestor of both, so the
  range is a superset of the push range in every topology — a wider range can
  only turn a `true` into a `false`, never open a hole;
- the induction that makes it sound: if every completed-green run on a ref
  either ran all the gates or skipped them relative to the previous
  completed-green run, the code at the last green tip has been validated by
  some completed run. Chaining from `before` breaks that induction at the
  first cancelled link; chaining from `L` cannot.

Cost: one authenticated GET per push. `ci.yml`'s `classify` job grants itself
`contents: read` + `actions: read` and nothing else, pinned by
`tests/core/ci-gates-intact.test.ts`. Everything unresolvable — no API, a
non-200, a malformed payload, no usable tip, no merge base — fails closed to
a full run, with the reason printed in the step's own log.

One incidental fix found while testing it: the script used to sit for
**15,091 ms** after a successful API call, waiting on a keep-alive socket
that would never be reused (measured against a loopback stub answering
instantly; 51 ms on the path that makes no request). It now flushes its
output and exits. A classify job whose whole justification is that it costs
seconds cannot spend twenty-three of them on a dead socket.

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

## The fast path has executed (round-2 review item 8)

Round 1 shipped without a single run that took the docs-only branch: the
lane's own run **35294788628** shows `"Run docs-gating tests (docs-only fast
path)"` with `"conclusion":"skipped"`, because commit `45d58af3` also touched
`tests/core/docs-only-classify.test.ts`, so the classifier correctly said
FULL.

**It has now.** Run **35296219834**, commit `f4c6ee4e` (the round-1 review
document, a genuinely docs-only push), on `lane/ci-docs-fast-path`:

| | |
|---|---|
| run | 01:39:37 -> 01:40:56 = **1 m 19 s** |
| `classify` job | 01:39:40 -> 01:39:51 (11 s) |
| `test` job | 01:39:53 -> 01:40:56 (1 m 03 s) |
| `browser` job | **skipped** at 01:39:51, job-level |
| skipped steps | Type check, no-console, reachability, `npm test`, receipt guard, metamorphic, Build |
| ran | honesty-audit, check-docs, check-brain, **Run docs-gating tests (24 s)**, tap-failures, TAP upload, unverified-gates |
| run conclusion | `success` |

Against the baseline this lane was built to remove — run **34793742299**, a
docs-only push to `main`, 00:46:28 -> 00:55:31 = **9 m 03 s** — that is
**7 m 44 s saved on one push**, at a cost of ~10 s and one runner slot on
every full run.

## Cross-lane finding: `edge.yml` rebuilds a byte-identical image on every docs-only push to main

**This is not hypothetical and it is not "once Actions is unblocked". It has
already happened.** `edge.yml:42-45` triggers on `workflow_run` of "CI"
`types: [completed]` and publishes when `conclusion == 'success' &&
head_branch == 'main' && event == 'push'`. Run **34793742299** — the
nine-minute docs-only push to `main` this lane measures its baseline from —
concluded `success` and triggered edge run **34794216577**, which ran and
failed only in the Docker build (`node:22-alpine` lacks python3/make/g++).
`lane/edge-image-real` fixes exactly that. The moment it lands, **every
docs-only push to `main` buys a full multi-minute `docker build --push` of a
byte-identical image** — on the same pushes this lane just made cheap.

Two facts fix the shape of the solution:

1. **A skipped `browser` job still leaves the run at `success`.** That is what
   makes this bite rather than accidentally fix itself. Corroborated inside
   this lane's own runs: 35296219834's `browser` job is `skipped` and the run
   concluded `success`. The distinction that does matter: a job skipped
   because a `needs` dependency **failed** leaves the run at `failure`, so a
   broken `classify` job correctly stops edge from publishing.
2. **`classify`'s output is NOT reachable from `edge.yml`.** A `workflow_run`
   payload carries `head_sha`, `head_branch`, `conclusion` and so on — not
   the upstream run's job outputs. `needs.classify.outputs.docs_only` is
   unreachable across workflows, and so is any `needs:` on a job in another
   workflow.

So the fix must be local to `edge.yml`, and it must re-derive rather than
import. **This lane does not touch `edge.yml` or `Dockerfile`** — both belong
to `lane/edge-image-real`, which is under review. What this lane did instead
is make `scripts/lib/docs-only.mjs` cleanly consumable from a workflow that
has only two commits of history: it is a dependency-free ES module exporting
`classifyDocsOnly(files)` and `isDocsPath(file)`, it imports nothing, it
needs no `npm ci`, and it is callable from a one-line `node -e` against a
`fetch-depth: 2` checkout.

**The change, for whichever lane merges second — apply in one sitting:**

```yaml
      - uses: actions/checkout@v4
        with:
          ref: ${{ github.event.workflow_run.head_sha }}
          fetch-depth: 2            # <- was depth-1; `HEAD^` must resolve

      - name: Skip the image build for a docs-only commit
        id: docsonly
        run: |
          set -euo pipefail
          SHA='${{ github.event.workflow_run.head_sha }}'
          if ! FILES=$(git diff --name-only --no-renames "$SHA^" "$SHA"); then
            echo "docs_only=false" >> "$GITHUB_OUTPUT"   # unresolvable parent -> build
            exit 0
          fi
          printf '%s\n' "$FILES" \
            | node --input-type=module -e '
                import { classifyDocsOnly } from "./scripts/lib/docs-only.mjs";
                const files = (await new Response(process.stdin).text())
                  .split("\n").map(s => s.trim()).filter(Boolean);
                console.log("docs_only=" + (classifyDocsOnly(files) ? "true" : "false"));
              ' >> "$GITHUB_OUTPUT"
```

…and `if: steps.docsonly.outputs.docs_only != 'true'` on the docker login,
buildx and build-push steps. Notes that matter:

- `--no-renames` is not optional here either; it is the same hole
  (blocker 1) in a second place. One implementation of the concept means
  `scripts/lib/docs-only.mjs`, not a second regex in YAML.
- It inherits the fail-closed direction: a merge commit whose `^` is
  ambiguous, an unresolvable parent, a shallow fetch, or any git failure
  builds the image anyway.
- **Rebuilding on a docs-only commit is pointless regardless.** The Dockerfile
  copies source, not `docs/**`, so the image differs only in the
  `GIT_SHA`/`revision` build-arg and label. If `:edge`'s revision label must
  track `main`'s tip, retagging the existing manifest
  (`docker buildx imagetools create`) is the cheap answer, not a rebuild.
- `tests/core/dockerfile-toolchain.test.ts` (landing on `lane/edge-image-real`)
  plus a `ci-gates-intact` assertion on the new `if:` would keep it honest.
  This lane's own `ci-gates-intact` additions are the template: pin the exact
  expression, not the presence of a condition.

## Not done / left for a future lane

- The `classify` job's own step ("Classify changed files") was, by the same
  mirror-test constraint, also added to `release.yml`, where its output goes
  unused. This is honest (documented in-file, in this README, and in the
  brain note) and round 2 made the inertness MECHANICAL —
  `tests/core/ci-gates-intact.test.ts` now asserts `release.yml` contains no
  `needs.classify` reference at all — but it is still a small amount of
  permanent duplication a future redesign of the mirror rule could remove.
  Out of scope here, since the rule itself must not be weakened.
- `edge.yml`'s gating step above. Owned by `lane/edge-image-real`; written
  out in full so whichever lane merges second can apply it without
  re-deriving anything.
- Overclaim scanning over `docs/**` — see "What nothing catches" above. A
  real gap, named rather than implied, and a separate change with its own
  false-positive budget over 522 tracked markdown files.
- The derivation in `tests/core/docs-gating-set.test.ts` sees one import hop
  and literal paths only; the limits are stated in that file's header and in
  "What the derivation does NOT claim" above.
