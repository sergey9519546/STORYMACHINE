# Independent review — `lane/ci-docs-fast-path`

**Tip reviewed: `45d58af321fe30ceb00ac51b1b4e948dbadaad1f`** (two commits on
`origin/main` `be2341ac`: `e310e1f8` ci, `45d58af3` docs/audit). Reviewer did
not build this lane. Worktrees: `<session scratch>/wt-cidocs-review` (read/run)
and `<session scratch>/wt-cidocs-exp` (adversarial edits, restored after each).

## Verdict: **REVISE**

Three of the items below are hard blockers: a changed-file set that classifies
`docs_only=true` while deleting a `server/**` source file (item 1), and two
independently reproduced docs regressions that go RED on the full path and
stay GREEN on the fast path (items 2 and 3). The design is sound and the
failure-direction work on the *pure* half is genuinely good — every hostile
input I could construct for `classifyDocsOnly()` failed closed. The holes are
all in the half that has no tests: the git invocation, and the hand-picked
file list.

---

## What I reproduced (numbers, not assertions)

| Gate | Lane claimed | I measured |
|---|---|---|
| `npm run lint` | 0 | **0** (28.8 s) |
| `tests/core/docs-only-classify.test.ts` | 21/21 | **21 tests, 21 pass, 0 fail** |
| `tests/core/ci-gates-intact.test.ts` | 47/47 | **47 tests, 47 pass, 0 fail** |
| `tests/core/brain-coverage.test.ts` | 7/7 | **7 tests, 7 pass, 0 fail** |
| full `npm test` | 14090 / 13998 pass / 0 fail / 91 skip / 1 todo | **14080 / 13988 pass / 0 fail / 91 skip / 1 todo**, exit 0, 508 s |
| classifier inversion (`every` → `!every`) | 5 pass / 16 fail | **5 pass / 16 fail** — reproduces exactly |

The 10-test delta on the full suite is **not a discrepancy**: `tests/e2e/journeys.test.ts`
is 10 tests gated on `RUN_E2E=1`, which ci.yml sets and my plain `npm test` did
not (`RUN_E2E=1 node --experimental-strip-types tests/e2e/journeys.test.ts` →
10 tests, 10 pass). 14080 + 10 = 14090. The lane's number is accurate.

Also green on the lane tip: `check-no-console` (308 files), `check-server-reachability`,
`honesty-audit`, `check-docs`, `check-brain`, `check-scoring-receipt be2341ac..HEAD`
("no scoring-path files changed").

`git diff origin/main -- tests/core/ci-gates-intact.test.ts` is **empty** (0 bytes).
The mirror test was not weakened. The only non-docs files the lane touches are
`scripts/classify-docs-only.mjs`, `scripts/lib/docs-only.mjs`,
`tests/core/docs-only-classify.test.ts` and the two workflow files — no
`server/**`, no `src/**`, no new route, no `console.*` anywhere in the new
scripts (they use `process.stdout.write`). **Item 8 of the brief: clean.**

---

## HARD BLOCKERS

### 1. A rename out of `server/` into `docs/` classifies as docs-only — `scripts/classify-docs-only.mjs:100`

`git diff --name-only <before>..<head>` runs with git's default rename
detection (`diff.renames` defaults to true). For a rename, `--name-only` prints
**only the destination path**. Reproduced in a throwaway repo:

```
$ git mv server/big.ts docs/big.md && git commit
$ git diff --name-only $BASE..$HEAD
docs/big.md
$ git diff --name-status $BASE..$HEAD
R100    server/big.ts   docs/big.md
$ GITHUB_EVENT_NAME=push DOCS_ONLY_BEFORE_SHA=$BASE GITHUB_SHA=$HEAD node scripts/classify-docs-only.mjs
docs-only classification: DOCS-ONLY (push range ...)
changed files (1):
  docs/big.md
docs_only=true
```

A push that **deletes a TypeScript module from `server/`** therefore skips the
type check (`ci.yml:126`), no-console (`:152`), server-reachability (`:166`),
the whole `npm test` (`:223`), the scoring-receipt guard (`:361`), metamorphic
(`:384`), `build` (`:390`) and the entire `browser` job (`:458`). This is
exactly the class of input the brief names as a hard blocker, and it is not
exotic — moving a doc-like file out of a code directory is an ordinary commit.
`docs/audits/.../README.md:144` ("Any code change … runs exactly what it ran
before this lane") is false as written.

The same applies to the reverse-shaped case `server/x.ts` → `docs/sub/x.ts`
(no `.md` involved, still `docs_only=true`, verified).

**Fix, one flag:** `git diff --name-only --no-renames <range>`. Verified on the
same fixture: it emits **both** `docs/big.md` and `server/big.ts`, and the
classifier then returns `docs_only=false`. Apply it to the `pull_request` arm
(`:113`) too. Add the rename case to `tests/core/docs-only-classify.test.ts` —
which today tests only the pure half and so cannot catch this.

### 2. `tests/routes/root-cause-parity.test.ts` gates docs and is not in the 13 — `ci.yml:274-296`

That file reads `docs/brain/Surfaces/Surface - Root Cause Pipeline.md` at
`tests/routes/root-cause-parity.test.ts:441` and asserts the note quotes six
live-measured values. It is not in the fast-path list and is not in the audit
README's "deliberately excluded" section at all — it was simply missed by the
judgment-narrowing.

Reproduced end to end. Edit one table row in that brain note (`| root causes |
70 | 69 |` → `| 71 | 68 |`), a change the classifier calls `docs_only=true`:

```
FAST PATH  (honesty-audit + check-brain + the 13 files):  GREEN
FULL PATH  (node --experimental-strip-types tests/routes/root-cause-parity.test.ts):
           # tests 18  # pass 17  # fail 1
```

This is the single failure the design exists to prevent, and it is live today.

### 3. `tests/core/scoring-receipt-guard.test.ts` was excluded on a premise that is factually wrong — `README.md:210-214`

The README says the two scoring-receipt tests "reference
`docs/p1-benchmark/MEASUREMENT_RECEIPTS.md` only as a path constant used inside
those fixtures, not as real repo content under test." That is true of
`check-scoring-receipt.test.ts`. It is **not** true of
`scoring-receipt-guard.test.ts`: lines 41 and 46 read the real committed ledger
(`fs.readFileSync(receiptPath)`) and Part 1 asserts against it, including
"expected exactly one MEASUREMENT_RECEIPTS.md entry whose heading contains …".

Reproduced. A docs-only edit that rewords one ledger heading
(`### 2026-08-08 Receipt:` → `### 2026-08-08 Receipt (SUPERSEDED, …):`) — the
single most-edited docs file in this repository's workflow:

```
FAST PATH:  GREEN
FULL PATH   (tests/core/scoring-receipt-guard.test.ts):  # pass 25  # fail 1
```

Two of the three named exclusions are sound (`owner-measure-e2e` — heavy,
throwaway git fixtures; `blind-pairs-discrimination` — cites a path in a
failure message only, confirmed by reading it). The third is not.

---

## The two defects the brief named — both confirmed

### A. The account-block claim is false, and demonstrably so from the lane's own baseline

`docs/audits/2026-09-18-ci-docs-fast-path/README.md:325-332` writes, as an open
item, that `edge.yml` is "currently non-functional per
`docs/PATH_TO_EXCELLENCE.md` — the account-level GitHub Actions block" and
that the edge interaction was "Not verified with a real run, since Actions
could not be exercised from this sandbox either."

The block lifted on **2026-09-13** — stated in this repo at
`docs/PATH_TO_EXCELLENCE.md:40` ("The GitHub Actions account block lifted at…")
and at `docs/audits/2026-09-13-ci-green/README.md:4`. Confirmed against the API:

- CI run **34793742299** — the very run this lane measures its 9-minute
  baseline from — is a real, completed, `success` run on `main@be2341ac`,
  created 2026-09-14T00:46:28Z, updated 00:55:31Z (9 m 03 s). Real runner ids,
  real per-step timings.
- CI has run continuously since: runs 2599–2607 all executed between
  2026-09-18T01:00Z and 01:31Z, including **this lane's own push**
  (run 35294788628, `lane/ci-docs-fast-path@45d58af3`, conclusion `success`).
- `edge.yml` has fired for real: run **34794216577** was triggered by CI
  34793742299 and **failed** in the Docker build. So the excuse is void twice
  over — a real run was available, and one had already happened and had already
  proved something the lane recorded as unprovable.
- `lane/edge-image-real` commit `c7cffcc8` is deleting the identical sentence
  from `.github/workflows/edge.yml:32-41`, calling it "false since 2026-09-13".

**Required:** delete the parenthetical and the "could not be exercised" excuse
at `README.md:325-332`, and re-do the verification it was excusing (item B).
Two further stale copies exist outside this lane and should be swept by
whichever lane owns them: `CONTRIBUTING.md:143` and
`docs/PATH_TO_EXCELLENCE.md:1659-1671` ("Owner-only, added 2026-09-03 — GitHub
Actions is not running jobs"), plus `docs/brain/Owner/Owner - Fix GitHub Actions.md`.

### B. The edge-publish cost regression is real — CROSS-LANE FINDING

**It is real, and it has already been observed.** `edge.yml:42-45` triggers on
`workflow_run` of "CI" `types: [completed]`, and `edge.yml:61-64` publishes when
`conclusion == 'success' && head_branch == 'main' && event == 'push'`. Run
34793742299 was a **docs-only push to main** that concluded `success`; it
triggered edge run 34794216577, which ran and only failed because the Dockerfile
is broken (`node:22-alpine` lacks python3/make/g++). `lane/edge-image-real`
fixes exactly that. The moment it lands, **every docs-only push to main buys a
full multi-minute `docker build --push`** of a byte-identical image — on the
same pushes this lane just made cheap.

Two sub-questions the brief asked:

1. **Does a skipped `browser` job still produce `conclusion == 'success'`?**
   Yes — which is what makes B bite rather than accidentally fix itself. A job
   skipped by its own `if:` (or by a `needs` output mismatch, which is the same
   mechanism — a job-level `if:` evaluated against `needs.*.outputs`) reports
   `skipped`, and a run whose jobs are all `success` or `skipped` concludes
   `success`. Empirical corroboration inside this lane's own run
   (35294788628, job `test`): step 12 "Run docs-gating tests (docs-only fast
   path)" has `"conclusion":"skipped"` while the job's conclusion is
   `"success"`. The distinction that *does* matter: a job skipped because a
   `needs` dependency **failed** leaves the run at `failure` (the failed job
   decides it), so a broken `classify` job fails the run and edge correctly does
   not publish. Both directions are safe for CI's own gating; neither saves
   edge from rebuilding.

2. **Is `classify`'s output reachable from `edge.yml`?** **No.** `edge.yml` is a
   separate workflow triggered by `workflow_run`; the `github.event.workflow_run`
   payload carries `head_sha`, `head_branch`, `conclusion` and so on, but *not*
   the upstream run's job outputs. `needs.classify.outputs.docs_only` is
   unreachable from there, and so is any `needs:` on a job in another workflow.

**Concrete recommendation, to be applied by whichever of the two lanes merges
second:** `edge.yml` should re-derive the classification itself rather than try
to import it. It already checks out `${{ github.event.workflow_run.head_sha }}`
(`edge.yml:80-85`); give that checkout `fetch-depth: 2` and add a gating step
before the build:

```yaml
      - name: Skip the image build for a docs-only commit
        id: docsonly
        run: |
          FILES=$(git diff --name-only --no-renames \
                  "${{ github.event.workflow_run.head_sha }}^" \
                  "${{ github.event.workflow_run.head_sha }}")
          node -e '...classifyDocsOnly(process.argv.slice(1))...' $FILES \
            >> "$GITHUB_OUTPUT"
```

…and make the docker login / buildx / build-push steps
`if: steps.docsonly.outputs.docs_only != 'true'`. This reuses
`scripts/lib/docs-only.mjs` — one implementation of the concept, per
LANE_STANDARD §1 — and inherits its fail-closed direction (a merge commit whose
`^` is ambiguous, an unresolvable parent, or any git failure → build anyway).
There is **no reason to rebuild on a docs-only commit**: the Dockerfile copies
source, not `docs/**`, so the image is byte-identical apart from the
`GIT_SHA`/`revision` build-arg and label. If the team wants `:edge`'s revision
label to always name main's tip, the cheap answer is to retag the existing
manifest (`docker buildx imagetools create`), not to rebuild.
`tests/core/dockerfile-toolchain.test.ts` (landing on `lane/edge-image-real`)
plus a `ci-gates-intact` assertion on the new `if:` would keep it honest.

---

## Other findings

### 4. Nothing stops a future docs-gating test from silently missing the list — `ci.yml:274-296`

The list is thirteen hand-typed paths in a shell loop in two workflow files.
There is no guard. This is the same failure shape `brain-coverage.test.ts`
exists to prevent for brain notes, and it has **already rotted before merge** —
items 2 and 3 above are two misses out of nineteen candidates, found by a
mechanical re-derivation that took one grep:

```
$ grep -rl 'readFileSync\|readdirSync\|existsSync' tests/ --include=*.ts \
  | xargs grep -ln "'docs/\|\"docs/\|/docs/" | sort     # → 19 files
```

`docs-only-classify.test.ts` should grow a case that parses the
`Run docs-gating tests` step out of **both** `ci.yml` and `release.yml`, asserts
the two lists are identical, asserts every listed path exists, and asserts the
list covers every test file that resolves a real `docs/` path — with an explicit,
commented allowlist for the ones deliberately excluded (`owner-measure-e2e`,
`blind-pairs-discrimination`, `check-scoring-receipt`), so an exclusion is a
decision someone had to write down rather than an omission nobody noticed.
Without this, items 2 and 3 are not fixed, only patched.

### 5. `before..head` + `cancel-in-progress` leaves a branch green over untested code — `ci.yml:44-45`, `classify-docs-only.mjs:100`

`ci.yml:45` sets `cancel-in-progress: ${{ github.ref != 'refs/heads/main' }}`,
so a lane branch's in-flight run is cancelled by the next push. The classifier
diffs `before..head`, i.e. it assumes `before` was validated. Combined, on a
lane branch:

- push 1: `A → B` touches `server/**` → `docs_only=false`, full run starts…
- push 2 (docs only): `B → C` → cancels push 1's run; its own range is
  docs-only → `docs_only=true` → lint, `npm test`, metamorphic, build and the
  whole browser job are skipped.
- Net: the branch's only completed run is green, and `server/**` changes at
  `C` were never type-checked, tested or built by any completed run.

Verified mechanically in a fixture repo (push-1 range → `docs_only=false`,
push-2 range → `docs_only=true`, `A..C` contains `server/app.ts`). `main` is
insulated (`ci.yml:44` gives main a per-SHA concurrency group, and an
`--ff-only` merge of that branch presents the full range to main's own run), so
this degrades the *branch-level* signal a reviewer and the orchestrator read,
not main's gate. Still worth closing: the honest range is "since the last
**successfully completed** CI run on this ref", not `github.event.before`.
The cheap fix is to resolve the base from the last SUCCESSFUL CI run on this
ref (one API call from the `classify` job, falling back to `docs_only=false`
when it cannot be resolved). The free fix is to say so in `ci.yml`'s
`classify` comment, so the next reader knows the classification is relative
to `before`, not to "the last thing CI actually proved".

### 6. The impure half has no tests at all — `scripts/classify-docs-only.mjs`

`tests/core/docs-only-classify.test.ts:10` imports only
`scripts/lib/docs-only.mjs`. Every defect in items 1 and 5 lives in the file
with zero coverage, and the README's failure-direction table (`README.md:98-112`)
is backed by "dry runs" that left no artifact. I re-ran that table hostilely
against a fixture repo and **every row holds**:

| input | result |
|---|---|
| no `GITHUB_EVENT_NAME` | `docs_only=false` |
| `before` all-zeros | `false` ("this push created the ref") |
| `before` = 40 hex that does not resolve | `false` |
| `before` = `"; rm -rf /"` | `false` (no shell — `execFileSync`, correct) |
| `forced: true` in the payload | `false` |
| `workflow_dispatch` / `schedule` | `false` (unrecognized event) |
| `pull_request`, no `origin/main` | `false` |
| `before == head` (zero changed files) | `false` |
| non-ASCII / embedded-quote / embedded-newline paths | `false` — git quotes them (`"docs/caf\303\251.md"`), the leading `"` defeats both arms, and git quotes control characters **regardless** of `core.quotePath`, so the classic `-z` newline split is not reachable |
| symlink `docs/link.md` → `../server/app.ts` | `true`, but benign: it adds a link under `docs/`, it does not change `server/**` |
| multi-commit push where a `server/**` change is reverted inside the range | `true`, and correct: the net tree is docs-only |

One narrow gap worth a line of code: `forced` has **no** env fallback
(`classify-docs-only.mjs:82`) unlike `before` (`:80`). With
`DOCS_ONLY_BEFORE_SHA` set and `GITHUB_EVENT_PATH` unreadable, `forced`
silently becomes `false` (reproduced). Low severity — Actions always sets
`GITHUB_EVENT_PATH`, and the two-dot tree diff stays correct across a
force-push anyway — but wire `${{ github.event.forced }}` for symmetry, or
delete the claim that the env wiring removes the payload dependency.

Regardless: these rows belong in the test file, driven through the real script
against a fixture repo, not in a prose table.

### 7. The README overstates what `honesty-audit` covers — `README.md:24-27`, `README.md:133`

"scans the shipped surface, including `README.md` and everything under `docs/`,
for overclaim language and stale counts" and "scans `docs/**` and root `.md`
files directly" are both wrong. `scripts/honesty-audit.mjs:25-52` is explicit:
`SCAN_DIRS` is `src`, `public`, `server`; `SCAN_ROOT_FILES` is
`index.html, README.md, metadata.json, package.json`; and its own comment says
"docs/**, other root *.md files such as ROADMAP.md/NORTH_STAR.md/CLAUDE.md …
are exempt by construction: we simply never walk into them." `docs/**` is
touched only by the narrow stale-rule-count pass (four specific figures in
tracked `*.md`) and one explicitly named artifact
(`docs/user-validation/sample-coverage-report.html`).

Demonstrated: appending
*"STORYMACHINE is the industry-standard, world-class, revolutionary tool and we
guarantee Hollywood-standard results"* to `docs/PATH_TO_EXCELLENCE.md` leaves
`honesty-audit` **clean, exit 0**. The same sentence in `README.md` fails it
immediately.

This is not a hole the lane opened — `honesty-audit` behaves identically on
both paths — but it is the load-bearing sentence in the argument for why a
`paths-ignore` would be unsafe and why the fast path is safe, so it must be
corrected rather than left as the reader's impression.

### 8. The fast path has never executed — `README.md` (no run cited)

The lane's own CI run **35294788628** (`45d58af3`) shows
`"Run docs-gating tests (docs-only fast path)"` with
`"conclusion":"skipped"` and the full `npm test` running for 5 m 39 s — because
commit `45d58af3` also touched `tests/core/docs-only-classify.test.ts`, so the
classifier correctly said FULL. The `classify` job itself is proven to work in
production (job 105444990772, 8 s wall, `success`), but **no real run has ever
taken the docs-only branch.** Push one commit that touches only `docs/` to this
branch and cite the run id; that is the one number this lane is missing, and it
is now cheap to get — item A removed the reason it was skipped.

While there: the serialization cost is measurable and should replace "a few
seconds" with the number. In run 35294788628 the `classify` job occupied
01:18:31→01:18:41 and `test`/`browser` were not created until 01:18:41 — **~10 s
added to every FULL run**, which is the majority of runs, plus one extra runner
slot. Still an easy win against ~9 minutes, but state it.

### 9. `release.yml`'s mirrored additions are inert but not free — `release.yml:74-92`, `:181-201`

Confirmed inert as claimed, with three caveats:

- `publish` needs `[test, browser]` (`release.yml:322`), not `classify`, so a
  failing `classify` job **cannot** block or alter a release — verified by
  reading the job graph. It *can* turn a successful release run's overall
  conclusion red, which is cosmetic here but will confuse someone. Since
  `release.yml` fires on `v*` tag pushes (`before` is all-zeros for a tag
  creation) and `workflow_dispatch` (unrecognized event), the job always prints
  FULL and exits 0; I could not construct a failing input for it.
- The mirrored `Run docs-gating tests` step at `:181` is **unconditional**, so
  every release now re-runs 13 files that `npm test` just ran. Measured on this
  sandbox: **28.5 s** for the honesty-audit + check-brain + 13-file set, of
  which the 13 files are the bulk. Not "small" enough to leave unmeasured in
  the comment; say 20–30 s.
- "cannot be mistaken later for a live gate": the in-file comment is good, but
  nothing mechanical stops someone wiring `needs: classify` into `release.yml`'s
  `test` job later. If the mirror rule is going to force dead jobs into
  `release.yml`, `ci-gates-intact.test.ts` should assert that `release.yml`
  contains **no** `needs.classify` reference — one line, and it makes the
  inertness a gate rather than a comment.

### 10. `ci-gates-intact.test.ts` cannot see that seven hard gates became conditional

Not a regression the lane introduced, but the lane is the first change to
exploit it. `tests/core/ci-gates-intact.test.ts:162-195` asserts the named
gates are not `continue-on-error`, and `:262-274` rejects an `if:` containing a
literal `false` — neither looks at an `if:` that is merely *wrong*. After this
lane, changing `ci.yml:126`'s `!= 'true'` to `== 'false'` would skip the type
check on **every** run (an unset output is `''`, and `'' == 'false'` is false),
and all 47 assertions stay green. Pin the exact expression: assert that every
gate step carrying an `if:` carries exactly
`needs.classify.outputs.docs_only != 'true'`, and that the fast-path step
carries exactly `== 'true'`.

### 11. §7 / CLAUDE.md rewrite — the durability property survives; two wording flags

`docs/LANE_STANDARD.md:121-141` keeps everything that matters: the 2026-09-07
rebuild is named in full as the reason (`:126-129`), the property is explicitly
"not relaxed here, only re-timed" (`:128-129`), "always before the lane goes
idle (ends its turn, waits on something, or hands back)" forces a push before
any point at which work can be lost to a rebuild, the mid-unit exposure is
stated rather than hidden (`:131-133`), and "when in doubt, push" (`:135`)
closes the judgment gap. I could not read it as permission to go idle unpushed.
**Approved as written.** Two smaller points:

- `CLAUDE.md:95-102` drops "when in doubt, push" and leads with the owner's
  objection ("which the owner flagged as real-time keystroke saving") before the
  rule. A future agent reading only `CLAUDE.md` gets the relaxation without the
  tiebreaker. Add the five words.
- The quoted maintainer instruction ("remote repositories are meant for
  milestone synchronization, not real-time keystroke saving") is the entire
  warrant for changing a standing standard, and it is recorded nowhere else in
  the repo — `docs/DECISION_LOG.md` has no entry for it (the log ends at
  Decision #8). A standard changed on an unrecorded verbal instruction is
  exactly what the Decision Log is for. Add Decision #9.

---

## What a stronger version would have done (LANE_STANDARD §6.4)

Driven the classifier through the **real script** in the tests, not only the
pure predicate — a fixture repo, a table of `(history, env) → docs_only`, and
the rename/force-push/zero-SHA rows as assertions instead of a prose table.
That one decision would have caught item 1 before review. And derived the
13-file list mechanically with a written allowlist instead of by judgment,
which would have caught items 2 and 3. Both are in scope; both are small.

## What is genuinely good

The pure/impure split is the right shape, the failure-direction reasoning is
correct and held under every hostile input I could build for it, the
`execFileSync` (no shell) choice defeats injection through `before`, the
separate-job argument for `browser` is right (job-level `if:` cannot read a
step in its own job), `tests/core/ci-gates-intact.test.ts` is byte-identical to
main, the "skipped step does not fail the job" claim is correct and now has a
real run behind it, branch protection re-verified independently (`"protected":
false` on `main`, GitHub API, 2026-09-18, and every one of the repo's 38
branches likewise), and `scripts/tap-failures.mjs` was checked for the obvious
own-goal — it exits 0 with a friendly message when `test-output.tap` is absent,
and the TAP upload is `if-no-files-found: warn`, so a docs-only run does not go
red on a missing artifact.

## Numbered list for the lane

1. `--no-renames` on both `git diff` invocations (`classify-docs-only.mjs:100`, `:113`); add the rename case to the tests. **Blocker.**
2. Add `tests/routes/root-cause-parity.test.ts` to the list in `ci.yml:274-296` and `release.yml:181-201`. **Blocker.**
3. Add `tests/core/scoring-receipt-guard.test.ts` to the list; correct the false exclusion reason at `README.md:210-214`. **Blocker.**
4. Delete the account-block claim and the "no run could prove it" excuse at `README.md:325-332`; replace with the real edge run (34794216577) and what it showed.
5. Record the `edge.yml` cost regression as a cross-lane finding with the concrete fix above; coordinate with `lane/edge-image-real`.
6. Add a guard that re-derives the docs-gating file set and pins the ci.yml/release.yml lists to it, with a commented exclusion allowlist.
7. Test the impure half against a fixture repo; wire `${{ github.event.forced }}` or drop the claim about the env wiring.
8. Document the `before..head` + `cancel-in-progress` branch-level blind spot in `ci.yml`'s classify comment, or close it.
9. Correct `README.md:24-27` and `:133` on what `honesty-audit` actually scans.
10. Push one genuinely docs-only commit and cite the run id; replace "a few seconds" with the measured ~10 s serialization and ~20–30 s for release.yml's unconditional mirror step.
11. Assert in `ci-gates-intact.test.ts` that the gate `if:` expressions are exactly the intended ones, and that `release.yml` contains no `needs.classify`.
12. Restore "when in doubt, push" to `CLAUDE.md:95-102`; add a Decision Log entry for the §7 cadence change.
