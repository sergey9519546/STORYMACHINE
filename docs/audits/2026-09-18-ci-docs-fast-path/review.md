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

---
---

# Round 2 — closure (lane, 2026-09-18)

Everything above this line is the reviewer's round-1 text, unchanged. What
follows is the lane's item-by-item response, with file:line and RED-first
evidence. Commits: `9608e407` (classifier hardening), `e5049d6b` (derived list + gate
pins), `031617eb` (documentation corrections + Decision #9), `d16bae81`
(validated-base unit tests), `a0a881ec` (corrected cost numbers), `184c0c67`
(emitAndExit hardening + two dangling references), and this section.

## The three blockers

### B1 — rename detection: **closed**

`scripts/classify-docs-only.mjs:110-117` — both diff arms now go through one
`gitDiffNames()` helper carrying `--no-renames` and a pinned
`-c core.quotePath=true`. There is no second place to forget it.

Reproduced first, in a throwaway repo, against the round-1 script bytes:

```
$ git mv server/big.ts docs/big.md && git commit
$ GITHUB_EVENT_NAME=push DOCS_ONLY_BEFORE_SHA=$BASE GITHUB_SHA=$HEAD node scripts/classify-docs-only.mjs
docs-only classification: DOCS-ONLY (push range 80d0ec80..e622cbb1)
changed files (1):
  docs/big.md
docs_only=true
```

**Treated as a class, not a flag.** `scripts/classify-docs-only.mjs:39-103` is
a written audit of every git default that can rewrite the changed-file set,
each verified in a fixture:

| default | effect | disposition |
|---|---|---|
| `diff.renames` (true) | a rename prints only its DESTINATION | `--no-renames` |
| `diff.renames=copies` | a COPY also collapses to its destination | `--no-renames` outranks it — verified; and a pure copy IS genuinely docs-only, so both spellings agree there |
| `-M`/`-C`/`diff.renameLimit` | tune WHEN the collapse happens | class removed rather than a threshold tuned |
| `core.quotePath` | non-ASCII/control chars are C-quoted, leading `"` fails both allowlist arms | pinned `true`. Verified: a literal newline in a path is quoted **regardless** of the setting (`"docs/a\nserver-evil.md"`), so newline smuggling is unreachable either way |
| `-z` | would fix quoting — by turning it OFF | deliberately NOT used; it would pass a raw newline path through instead of failing it closed |
| `--diff-filter` | default includes deletions | deliberately NOT used; `ACMR` would drop a `server/**` deletion — the same hole respelled |
| `diff.submodule` | affects textual rendering only | a gitlink path is neither `docs/` nor `*.md`, so it fails the allowlist |

Both directions tested: `tests/scripts/classify-docs-only.test.ts:277` (server
-> docs) and `:294` (docs -> server, which classified `false` before only by
luck of which side git prints), plus `docs/a.md -> docs/b.md` staying
docs-only so the fix cannot be shown to over-fire, a genuine copy, and a
repo-level `diff.renames=copies`.

**`forced` env fallback:** `classify-docs-only.mjs:245-254` — `DOCS_ONLY_FORCED`,
wired in `ci.yml:136` from `${{ github.event.forced }}` and OR'd with the
payload, so neither wire alone is load-bearing.

### B2 — the missed docs regressions: **closed, and a third found**

`ci.yml:329-351` and `release.yml:199-221` now list **17** files. The three added:

| suite | reads |
|---|---|
| `tests/routes/root-cause-parity.test.ts:439-450` | `docs/brain/Surfaces/Surface - Root Cause Pipeline.md` |
| `tests/core/scoring-receipt-guard.test.ts:41-46` | the committed `docs/p1-benchmark/MEASUREMENT_RECEIPTS.md` |
| `tests/core/telemetry-docs-truth.test.ts:8-30` | the committed `ROADMAP.md`, P3 section |

The third is new. The review's derivation (`grep -l "'docs/"`) could not see
it: the path is written `'../../ROADMAP.md'`, and a root `.md` file IS docs to
this classifier.

**Worked from the mechanical set, not judgment.** The derivation is
`tests/core/docs-gating-set.test.ts` (see item 4). It yields **24 candidates**,
not 19 — the extra five come from the one-import-hop arm, which is what finds
`tests/core/p0-sample-drift.test.ts` (it names no docs path at all; it reads
`OUT_FILE` from `scripts/generate-p0-sample-report.ts`). 17 run, 7 excluded,
each exclusion citing a file or a line. The exclusions round 1 wrote in prose
for `blind-pairs-discrimination` and `docker-context` are gone — the
derivation agrees mechanically that they are not candidates, because the
`docs/…` strings in them are sentences that resolve to no existing path.

**The scoring-receipt exclusion reason, rewritten from what the file does.**
Round 1's reason was true of `check-scoring-receipt.test.ts` (its
`RECEIPT_REL` at `:22` is only ever joined onto a `mkdtempSync` fixture at
`:64`/`:147`/`:179`/`:225`; its one `REPO_ROOT` read is
`scripts/lib/import-graph.mjs` at `:311`, which is code) and false of
`scoring-receipt-guard.test.ts`, which reads the committed ledger at `:41` and
asserts against it at `:46`. Two files, one reason, one of them wrong.

**Replay harness — the acceptance test.** Perturb, run the fast path (the
unconditional docs gates plus the 17 files parsed out of `ci.yml`), run the
suite the full path would fail on, restore:

```
=== REGRESSION 1 — edit one table row in the Root Cause Pipeline brain note ===
  docs_only = true
    tests/routes/root-cause-parity.test.ts RED
  FAST PATH: RED (1)
  FULL PATH (tests/routes/root-cause-parity.test.ts): RED

=== REGRESSION 2 — reword one heading in MEASUREMENT_RECEIPTS.md ===
  docs_only = true
    tests/core/scoring-receipt-guard.test.ts RED
  FAST PATH: RED (1)
  FULL PATH (tests/core/scoring-receipt-guard.test.ts): RED

=== REGRESSION 3 — drop one required phrase from ROADMAP.md's P3 section ===
  docs_only = true
    tests/core/telemetry-docs-truth.test.ts RED
  FAST PATH: RED (1)
  FULL PATH (tests/core/telemetry-docs-truth.test.ts): RED

=== CONTROL — an inert docs edit (a new audit note) ===
  docs_only = true
  FAST PATH: GREEN
```

Both previously-missed regressions, and the third, now go RED on the fast
path; a genuinely inert docs edit still goes GREEN, so the harness can fail in
both directions.

One note on the witness, recorded because the lane got it wrong first. The
harness above perturbs `Scenes 2–4, 6–9` -> `Scenes 2–4, 6–10` rather than the
review's `| root causes | 70 | 69 |` -> `| 71 | 68 |`. An earlier draft of this
closure claimed the review's witness does not fail the suite. **That claim was
false, and it came from a corrupted measurement** — two copies of the replay
harness were running concurrently and each was reverting the other's
perturbation, so case 1 was measured against an already-restored file. Both
witnesses reproduce, verified in isolation on a clean tree:

```
$ perl -0pi -e 's/\| root causes \| 70 \| 69 \|/| root causes | 71 | 68 |/' \
    'docs/brain/Surfaces/Surface - Root Cause Pipeline.md'
$ node --experimental-strip-types tests/routes/root-cause-parity.test.ts
# tests 18   # pass 17   # fail 1

$ perl -CSD -0pi -e 's/Scenes 2\x{2013}4, 6\x{2013}9/Scenes 2\x{2013}4, 6\x{2013}10/' \
    'docs/brain/Surfaces/Surface - Root Cause Pipeline.md'
$ node --experimental-strip-types tests/routes/root-cause-parity.test.ts
not ok 5 - the brain note quotes the same six values
not ok 7 - the scene-span drift measurement is re-measured, not re-typed
# tests 18   # pass 17
```

The harness kept the second because it fails two assertions rather than one
and the string it removes occurs exactly once in the note, but the review's
number was right and this closure had it wrong.

### B3 — the impure half: **closed**

`tests/scripts/classify-docs-only.test.ts`, **38 cases**, driving the real
script bytes: the fixtures copy `scripts/classify-docs-only.mjs`,
`scripts/lib/docs-only.mjs` and `scripts/lib/validated-base.mjs` into a
throwaway git repository (so `__dirname` resolves inside the fixture) and a
first assertion checks the copies are byte-identical to the committed files,
so this suite can never guard a paraphrase. The Actions runs API is a loopback
stub — `GITHUB_API_URL` is Actions' own variable, not a test hook.

Covered, all named in the brief: renames both directions; the `forced`
fallback; all-zeros, garbage 40-hex, shell-injection and empty `before`; a
missing event name; `workflow_dispatch` and `schedule`; zero changed files; a
real shallow clone (`git clone --depth 1`, asserted shallow); a merge with an
unresolvable merge base (unrelated histories joined by
`--allow-unrelated-histories`); a non-200, a malformed payload and an
unreachable API; a C-quoted control-character path; malformed
`GITHUB_REPOSITORY`/`GITHUB_WORKFLOW_REF`; plus the positive path, so the
suite can fail in both directions.

**RED-first, each mutation against the shipped suite:**

| mutation | result |
|---|---|
| drop `--no-renames` from `gitDiffNames()` | 38 tests, 34 pass, **4 fail** |
| drop the `DOCS_ONLY_FORCED` fallback | 38 tests, 37 pass, **1 fail** |
| chain from `before` instead of the validated base | 38 tests, 25 pass, **13 fail** |
| shipped tree | 38 tests, **38 pass**, 0 fail, 8.0 s |

Two environment notes, both of which would have made this suite pass for the
wrong reason:

- Every child process builds its env **from scratch** (LANE_STANDARD §4, the
  2026-09-13 ci-env findings), including `GIT_CONFIG_GLOBAL`/`GIT_CONFIG_SYSTEM`
  pinned away from any ambient `diff.renames`/`core.quotePath`. Verified under
  `npm run test:ci-env`: **130 tests, 130 pass, 0 fail** across the four files
  this lane touches, with `GITHUB_*`/`RUN_E2E` set the way the runner sets them.
- The runs-API stub runs in **its own process**. An in-process
  `http.createServer` cannot answer a request from a child started with
  `execFileSync`, because that call blocks this process's event loop for the
  child's whole lifetime: the connection is never accepted, the classifier hits
  its 15-second abort, and every case "passes" because an unreachable API is
  also `docs_only=false`. Measured before the split: 15,150 ms per invocation
  with the stub's request log empty.

## The other nine

### 4 — nothing guarded the 13-file list: **closed** (`tests/core/docs-gating-set.test.ts`)

A `tests/**/*.test.ts` file is a candidate when (1) it, or a non-test module it
imports directly (one hop), calls a filesystem read, and (2) it, or that same
module, contains a string literal — taken from the TypeScript parser, so never
a comment — that RESOLVES, against the repo root or the containing file's own
directory, to a path that exists and that the classifier would call docs.

Eight assertions: the two workflow lists are identical; the list is non-empty,
duplicate-free and sorted; every listed file exists; **every candidate is run
or explicitly excluded**; no exclusion has gone stale (its file exists, it is
still a candidate, and its reason cites a file or a line); nothing is both
listed and excluded; the three round-2 additions are named individually so a
future refactor of the derivation cannot quietly drop them; and the derivation
is non-vacuous (all but at most one listed suite must be derivable, so a broken
derivation fails loudly instead of making the coverage check vacuously green).

RED-first:

| mutation | result |
|---|---|
| remove the three round-2 additions (the round-1 list) | 8 tests, 6 pass, **2 fail**, naming each missing file and what it reads |
| drop one file from `release.yml` only | 8 tests, 7 pass, **1 fail** |
| rename a listed file out from under the list | 8 tests, 6 pass, **2 fail** |
| shipped tree | 8 tests, **8 pass**, 0 fail |

The guard flagged **itself** on first run (`reads: docs`) and it was right: a
docs-only DELETION changes what it derives, so it is on the list it guards.

### 5 — `before..head` + `cancel-in-progress`: **closed, by widening the range**

`scripts/lib/validated-base.mjs` (new, pure) + `classify-docs-only.mjs:276-292`.
The base is `merge-base(L, before)` where `L` is the tip of the last run of
this workflow on this ref that completed **successfully**, read from Actions'
runs API.

**Why this and not the alternative.** The brief offered "disable the fast path
when superseding a cancelled run". That needs the same API call to see the
cancelled run, so it costs the same and proves less: it closes the cancellation
shape only. The validated base closes it *and* the failed-run shape, for free —
a docs-only push landing on top of a RED commit also re-runs everything, which
the review did not name.

Properties, each asserted:

- when the previous run completed green, `L` **is** `before`, the merge base is
  `before`, and the range is byte-identical to the old behavior — the fast path
  costs nothing in the common case, and the test asserts the log does NOT say
  "widened" (`classify-docs-only.test.ts:396`);
- `merge-base` rather than `L` because `L` need not be an ancestor of `before`
  after a rebase; the merge base is an ancestor of both, so the range is a
  superset of the push range in every topology, and a wider range can only turn
  a `true` into a `false`;
- the induction: if every completed-green run on a ref either ran all the gates
  or skipped them relative to the previous completed-green run, then the code at
  the last green tip has been validated by some completed run. `before` breaks
  that induction at the first cancelled link; `L` cannot.

Cost and posture: one authenticated GET per push; `ci.yml:104-111` grants the
`classify` job `contents: read` + `actions: read` and nothing else, pinned by a
test. No API, a non-200, a malformed payload, no usable tip, no merge base →
`docs_only=false` with the reason printed.

**Verified in real CI, not only in fixtures.** Run 35298622753, job 105456296231:

```
docs-only classification: FULL (validated range 9608e4072921…..e5049d6becb8…)
changed files (4):
```

— the API query succeeded under the new grant and resolved `L == before`, the
common case.

Incidental fix found while testing it: the script used to sit for **15,091 ms**
after a successful API call waiting on a keep-alive socket that would never be
reused (51 ms on the path that makes no request). It now flushes and exits.

### 6 — folded into B3. Closed there.

### 7 — the `honesty-audit` overclaim: **corrected, and the consequence stated**

`scripts/honesty-audit.mjs:21-43`: `SCAN_DIRS` is `src`/`public`/`server`,
`SCAN_ROOT_FILES` is four files, and its own comment says `docs/**` is "exempt
by construction". Reproduced:

```
$ echo "$OVERCLAIM" >> docs/PATH_TO_EXCELLENCE.md && npm run honesty-audit
exit=0
honesty-audit: scanned 466 files, … clean.

$ echo "$OVERCLAIM" >> README.md && npm run honesty-audit
exit=1
README.md:625: [hollywood-standard] "Hollywood-standard"
README.md:625: [guarantees] "guarantee"
README.md:625: [industry-standard] "industry-standard"
README.md:625: [superlatives] "world-class"
README.md:625: [superlatives] "revolutionary"
```

Both claims corrected in the audit README (the bullet under "Why the obvious
fix is wrong" and the table row).

**The consequence, said plainly rather than papered over.** Nothing in this
repository scans `docs/**` prose for overclaim language. What does cover
`docs/**` is: honesty-audit's stale-rule-count pass (four FIGURES across 522
tracked markdown files, not language); `check-docs` (AI-writing patterns, and
`continue-on-error: true`, so it cannot fail anything on either path);
`check-brain` (graph freshness and wikilinks); `documentation-truth.test.ts`
and `smoke-gate-serve-mode.test.ts` (specific retired sentences in specific
named files); and the claims register (that a citation lands on a row, not that
the row is honest). An overclaim in `docs/PATH_TO_EXCELLENCE.md` passes all of
them. The fast path removes nothing here — honesty-audit behaves identically on
both paths and runs unconditionally — but the safety argument may not rest on a
gate that does not exist. Closing that gap is a change to `SCAN_DIRS` with its
own false-positive budget over 522 files, and it is filed as not-done rather
than implied.

### 8 — the fast path had never executed: **it has, twice, and the cost is quantified**

The first real fast-path run predates this round by two minutes: run
**35296219834**, commit `f4c6ee4e` — the reviewer's own docs-only review
commit, pushed at 01:39:37, while the review was being written at 01:41.

| | |
|---|---|
| run | 01:39:37 → 01:40:56 = **1 m 19 s**, conclusion `success` |
| `classify` | 01:39:40 → 01:39:51 |
| `test` | 01:39:53 → 01:40:56 |
| `browser` | **skipped**, job level, 01:39:51 |
| skipped steps | Type check, no-console, reachability, `npm test`, receipt guard, metamorphic, Build |
| "Run docs-gating tests" | 01:40:20 → 01:40:44 = **24 s** |

Against the baseline this lane exists to remove (run 34793742299, a docs-only
push to `main`, 00:46:28 → 00:55:31 = **9 m 03 s**): **7 m 44 s saved**.

**Cost claim corrected.** Round 1 said "a few seconds" and quantified nothing.
Run 35294788628, a FULL run: `classify` occupied 01:18:33 → 01:18:41 (**8 s**)
and `test`/`browser` were not created until 01:18:43, against a run created at
01:18:31 — about **10 s of wall time plus one extra runner slot on every full
run**, which is the majority of runs. Stated in `ci.yml:69-81` and in the audit
README.

`release.yml`'s unconditional mirror step is measured too: **55 s** on this
sandbox for the 17 files, 24 s on the runner for the 13-file version. Stated as
25–60 s in `release.yml:182-185`.

A second fast-path run, on the **new** classifier (validated base, `actions:
read`, `--no-renames`), is the run for this closure commit — cited at the end
of this section.

### 9 — `release.yml`'s mirror step: **kept unconditional, and made mechanically inert**

Decision: keep it unconditional; make the inertness a gate.

Gating it needs `if: needs.classify.outputs.docs_only == 'true'`, which needs
`needs: classify` on `release.yml`'s `test` job. `publish` needs
`[test, browser]`, and a job skipped because a `needs` dependency **failed**
leaves the run at `failure` — so a broken classifier would turn a tag push into
a release that never publishes, to save 25–60 s on an event that happens a few
times a year.

What the review actually asked for was that nothing mechanical permit a future
`needs: classify`. `ci-gates-intact.test.ts` now asserts `release.yml` contains
no `needs.classify` reference outside a comment, and no job declares
`needs: classify`. RED under exactly that wiring (see item 10's table). The
mirror rule was not weakened.

### 10 — `ci-gates-intact.test.ts` could not see a wrong `if:`: **closed, additions only**

`git diff origin/main -- tests/core/ci-gates-intact.test.ts` is **+182 / −0**.
Nothing pre-existing was touched.

The blind spot, demonstrated on the round-1 file (byte-identical to
`origin/main`): copy-pasting the fast-path step's condition onto "Type check" —

```
      - name: Type check
        if: needs.classify.outputs.docs_only == 'true'      # was != 'true'
        run: npm run lint
```

— skips `tsc` on **every full run**, and the round-1 suite reported
**47 tests, 47 pass, 0 fail**.

(A correction to the review on its own witness: `== 'false'`, the mutation it
names, does trip the pre-existing literal-`false` scan — that check greps
`/\bfalse\b/` on any `if:` line. The hole is real regardless, and `== 'true'`
walks straight through it.)

Six additions, each RED under the mutation it exists for:

| mutation | round 1 | round 2 |
|---|---|---|
| `Type check` → `== 'true'` | 47/47 pass | 53 tests, 52 pass, **1 fail** |
| `Type check` → `== 'false'` | 47/47 pass* | 53 tests, 51 pass, **2 fail** |
| fast-path step → `!= 'true'` (runs nothing on a docs push) | 47/47 pass | 53 tests, 52 pass, **1 fail** |
| `if:` added to `Honesty string audit` | 47/47 pass | 53 tests, 52 pass, **1 fail** |
| `browser` job-level `if:` → `== 'false'` | 47/47 pass* | 53 tests, 51 pass, **2 fail** |
| `classify` permissions + `packages: write` | 47/47 pass | 53 tests, 52 pass, **1 fail** |
| `needs: classify` wired into `release.yml`'s `test` | 47/47 pass | 53 tests, 52 pass, **1 fail** |
| shipped tree | 47/47 | 53 tests, **53 pass**, 0 fail |

\* also trips the pre-existing literal-`false` scan.

The map pins the exact expression of every conditional step AND the exact set
of steps allowed to carry one — the seven skipped gates, the one fast-path
step, and the three pre-existing `always()` steps — so a new condition on
honesty-audit, check-docs or check-brain fails rather than quietly halving what
CI proves.

### 11 — §7 / CLAUDE.md: **both follow-ups done**

- `CLAUDE.md:96-107` (the sandbox-rebuild gotcha) now leads with the durability property ("A commit that
  exists only in a worktree is not work that exists"), states the cadence
  second, and restores **"when in doubt, push"**. The owner's objection is
  still there, as the reason for the re-timing, not as the headline.
- **Decision #9** added (`docs/DECISION_LOG.md:921`) — "Lanes Push at
  Checkpoints, Not at Every Commit" — recording the maintainer instruction, the
  four alternatives, what the change gives up (a lane midway through one unit
  of work still has everything to lose), why concurrency makes this about the
  record rather than about CI cost, and the interaction with this very lane:
  fewer pushes **widens** the `cancel-in-progress` window, which is part of why
  item 5 had to be closed rather than documented.
- Brain note `docs/brain/Decisions/Decision 9 - Lanes Push at Checkpoints.md`,
  plus a new `docs/brain/Gates/Gate - Docs-Gating Set.md`, the audit note
  rewritten for round 2, and `Owner - Fix GitHub Actions.md` closed to
  `status: resolved`. `npm run brain` regenerated (120 notes, 490 links);
  `npm run check-brain` OK; `brain-coverage.test.ts` 7/7 — and it was **RED on
  (a) every Decision Log entry has a brain note** before the note was written.
- `docs/LANE_STANDARD.md:134-138` now points at Decision #9 rather than
  carrying the quotation alone.

### 12 — branch protection: no action. Re-confirmed unchanged.

## Defects A and B

### A — the stale account-block claim: **deleted, and swept beyond this lane**

`docs/audits/2026-09-18-ci-docs-fast-path/README.md` no longer contains the
excuse. It states what happened: the block lifted 2026-09-13 at 04:19 UTC, and
`edge.yml` had already fired for real as run **34794216577**, triggered by this
lane's own baseline run 34793742299 on `main@be2341ac`, failing in the Docker
build — proving the interaction the lane had recorded as unprovable.

Swept outside the lane as instructed:

- `CONTRIBUTING.md` — the "checks fail in ~2 seconds" paragraph rewritten:
  it says the block existed, names the date it lifted, tells a contributor to
  check the Actions tab rather than assume, and documents the docs-only fast
  path with its measured numbers.
- `docs/PATH_TO_EXCELLENCE.md` — "Owner-only, added 2026-09-03 — GitHub Actions
  is not running jobs" → "**RESOLVED 2026-09-13**", with the history kept and
  "Nothing here is owner-only any more."
- `docs/brain/Owner/Owner - Fix GitHub Actions.md` → `status: resolved`, kept
  rather than deleted so the eleven-day gap has an explanation, and noting that
  honesty-audit could not have caught these because `docs/**` is outside its
  scan (item 7).

`edge.yml` and `Dockerfile` were **not touched** — they belong to
`lane/edge-image-real`.

### B — the cross-lane cost regression: **written up to be applied in one sitting**

Full finding in the audit README under "Cross-lane finding: `edge.yml` rebuilds
a byte-identical image on every docs-only push to main", including the
ready-to-paste `fetch-depth: 2` checkout, the gating step that pipes
`git diff --name-only --no-renames "$SHA^" "$SHA"` through
`scripts/lib/docs-only.mjs`, and the `if:` for login/buildx/build-push.

What this lane did to make that a one-sitting change: `scripts/lib/docs-only.mjs`
is a dependency-free ES module exporting `classifyDocsOnly(files)` and
`isDocsPath(file)`. It imports nothing, needs no `npm ci`, and is callable from
a one-line `node --input-type=module -e` against a two-commit checkout — so the
consumer gets one implementation of the concept rather than a second regex in
YAML. The `--no-renames` finding applies there verbatim; it is the same hole in
a second place.

Also recorded: a skipped `browser` job still concludes `success` (so B bites),
a job skipped because a `needs` dependency failed leaves the run at `failure`
(so a broken `classify` correctly stops edge), `classify`'s output is
unreachable from a `workflow_run` workflow, and rebuilding is pointless anyway
— the Dockerfile copies source, not `docs/**`, so the image differs only in the
`GIT_SHA` build-arg and label, and `docker buildx imagetools create` beats a
rebuild if `:edge`'s revision must track main's tip.

## Gates

| gate | result |
|---|---|
| `npm run lint` (`tsc --noEmit`) | **0**, exit 0 |
| `tests/scripts/classify-docs-only.test.ts` | 38 tests, **38 pass**, 0 fail |
| `tests/core/docs-only-classify.test.ts` | 31 tests, **31 pass**, 0 fail (was 21) |
| `tests/core/docs-gating-set.test.ts` | 8 tests, **8 pass**, 0 fail |
| `tests/core/ci-gates-intact.test.ts` | 53 tests, **53 pass**, 0 fail (was 47) |
| `tests/core/brain-coverage.test.ts` | 7 tests, **7 pass**, 0 fail |
| `npm run test:ci-env` (the four touched files) | 130 tests, **130 pass**, 0 fail |
| `npm run honesty-audit` | exit 0 |
| `npm run check-docs` | clean |
| `npm run check-brain` | OK, 120 notes / 490 links, fresh |
| full `npm test` | **14,142 tests / 14,050 pass / 0 fail / 91 skipped / 1 todo**, exit 0, 407.7 s |

`RUN_E2E` was **not** set for the full run above, matching the reviewer's own
baseline of **14,080 / 13,988 / 0 / 91 / 1**. The **+62** is fully accounted
for and is all new coverage: `tests/scripts/classify-docs-only.test.ts` +38,
`tests/core/docs-gating-set.test.ts` +8,
`tests/core/docs-only-classify.test.ts` 21 -> 31 (+10),
`tests/core/ci-gates-intact.test.ts` 47 -> 53 (+6). 38 + 8 + 10 + 6 = 62, and
skipped/todo are unchanged at 91/1. `tests/e2e/journeys.test.ts` remains the
10-test difference from CI's own number, which sets `RUN_E2E=1`.

## What was NOT done, and why

- **`edge.yml`'s gating step.** Owned by `lane/edge-image-real`, which is under
  review. Written out in full instead; neither `edge.yml` nor `Dockerfile` was
  touched.
- **Overclaim scanning over `docs/**`.** A real gap (item 7), named rather than
  implied. It is a change to `scripts/honesty-audit.mjs`'s `SCAN_DIRS` with its
  own false-positive budget over 522 tracked markdown files, and it is not this
  lane's to make.
- **The derivation's two-hop arm.** Considered and rejected with a reason:
  `server/lib/rulebook-count.ts` reads `docs/rulebook/coverage.json` at module
  load and is reachable from `doctor.ts`, so two hops would make most of the
  suite a candidate while adding nothing — that file is already covered by
  `rulebook.test.ts` and `rule-test-coverage.test.ts`, both on the list. Stated
  in the test's header and in the audit README under "What the derivation does
  NOT claim".
- **`release.yml`'s duplicated `classify` job.** Still inert duplication forced
  by the mirror rule. Round 2 made the inertness mechanical rather than removing
  it, because removing it means weakening the mirror rule.

Nothing was narrowed, skipped, or widened to make a gate pass, and no assertion
was weakened. The one place a stated number changed is regression 1's witness
in the replay harness, and that is called out above.

---

## Round-2 addendum — item 5 fired in the wild, on this branch, during this round

The validated-base fix was written against a fixture. Four commits later it
caught the real thing, unprompted.

Six pushes to `lane/ci-docs-fast-path` inside eleven minutes, each cancelling
the last (`ci.yml:45`, `cancel-in-progress` on every ref but `main`):

| run | commit | conclusion |
|---|---|---|
| 35298622753 | `e5049d6b` | **success** |
| 35299806186 | `031617eb` | cancelled |
| 35299903993 | `d16bae81` | cancelled |
| 35300227954 | `a0a881ec` | cancelled |
| 35300544242 | `184c0c67` | cancelled |
| 35300583675 | `04a94f57` (docs-only) | *this run* |

`04a94f57` changes exactly one file, `docs/audits/2026-09-18-ci-docs-fast-path/review.md`.
Under the round-1 classifier its range would have been
`184c0c67..04a94f57` — one docs file — so `docs_only=true`, and the type
check, the full `npm test`, the metamorphic gate, the build and the entire
`browser` job would all have been skipped. The branch's only completed run
would have been green, and **four commits of classifier, workflow and test
changes — including `184c0c67`, which edits `scripts/classify-docs-only.mjs`
itself — would never have been type-checked, tested or built by any completed
run.**

What the shipped classifier printed instead (run 35300583675, job
105462180143):

```
docs-only classification: FULL (validated range
  e5049d6becb8f42164fd27cd595da07a78f286eb..04a94f572ab28ceba00e00169d1eac35c238ea85
  (widened from `before` 184c0c67c775ff3d972690e35d2a556e89749b4b:
   last successful run tip e5049d6becb8f42164fd27cd595da07a78f286eb))
changed files (18):
```

It resolved the last run of this workflow on this ref that actually completed
successfully (`e5049d6b`), took the merge base with `before`, and found **18**
changed files rather than 1. Full run.

This is the review's own scenario — "the branch's only completed run is green,
and `server/**` changes at `C` were never type-checked, tested or built by any
completed run" — reproduced by ordinary work rather than by a fixture, and
closed. Note also that it is the interaction Decision #9 names: pushing at
**checkpoints** rather than after every commit makes cancellation chains
longer, so the window this fix closes gets wider, not narrower, under the new
cadence.

**And the fast path itself, on the new classifier.** Both pushes above widened
and ran FULL, because each cancelled the previous run and left no green tip to
chain from — the fix doing its job, not a failure. Run **35300910883**
(`3de20d66`) then completed **success**, so the push carrying THIS paragraph
lands on a completed-green predecessor. **Run 35301550263** (`799ae27e`),
job 105465050999:

```
  DOCS_ONLY_BEFORE_SHA: 3de20d6603485fad93176d0c6c2d7a9c34817c42
  DOCS_ONLY_FORCED: false
docs-only classification: DOCS-ONLY (validated range
  3de20d6603485fad93176d0c6c2d7a9c34817c42..799ae27e278f590a0d57257d66ea7d1c4af4a8ae)
changed files (2):
```

No "widened" clause: the validated base IS `before`, so the range is exactly
the push range and the fast path costs nothing in the common case, as the
fixture asserts. The run:

| | |
|---|---|
| run | 03:00:35 -> 03:02:45 = **2 m 10 s**, conclusion `success` |
| `classify` | 03:00:37 -> 03:00:49 (12 s) — the API query included |
| `test` | 03:01:27 -> 03:02:44 (1 m 17 s) |
| `browser` | **skipped**, job level, 03:00:49 |
| skipped steps | Type check, no-console, reachability, `npm test`, receipt guard, metamorphic, Build |
| "Run docs-gating tests" | 03:01:48 -> 03:02:32 = **44 s** for all 17 files |

Against the 9 m 03 s baseline (run 34793742299): **6 m 53 s saved**, with the
validated base, `--no-renames`, the `actions: read` grant and all seventeen
docs suites live. The earlier 1 m 19 s figure (run 35296219834) was the same
path on the round-1 classifier and thirteen files; the extra ~50 s is four
more suites plus the API query, and it is the honest price of the two
blockers being closed.

See "A property of the validated base" in this lane's README for the
consequence stated generally: the saving lands on a docs-only push that sits
on top of something CI has already proved — which is exactly the shape of a
docs push to `main`, merged `--ff-only` one commit at a time into a per-SHA
concurrency group that never cancels anything.

---
---

# Round 2 — re-check (same reviewer, 2026-09-18)

**Tip reviewed: `f3f619791d5a833704b6db3217f641090f0e99f3`** — ten commits on top
of round 1's review commit `f4c6ee4e`. Fresh worktrees at that tip
(`<session scratch>/wt-cidocs-r2` read/run, `<session scratch>/wt-cidocs-r2exp`
adversarial, `<session scratch>/wt-cidocs-rebase` rebased-onto-main). Everything
above this line is unedited: the round-1 text is byte-identical to `f4c6ee4e`
(first **457 lines / 26,318 bytes**, `cmp` clean), and the lane's closure below
it is untouched. The file is 1,077 lines.

## Verdict: **MERGE**

All three blockers are closed and I reproduced every closure on my own harness,
not the lane's. Two follow-ups below are real but neither blocks: one is a
number I could not reproduce, one is a cross-lane gating change that **became
this lane's to make while round 2 was running** — `lane/edge-image-real` has
already merged (`origin/main` is now `8b6a60c1`, and `origin/lane/edge-image-real`
points at the same commit).

## The twelve items

| # | item | disposition | my evidence |
|---|---|---|---|
| B1 | rename out of `server/` classified docs-only | **CLOSED** | `gitDiffNames()` (`scripts/classify-docs-only.mjs:110-116`) pins `--no-renames` + `core.quotePath=true` on both arms; 38-case fixture suite drives the real bytes |
| B2a | `root-cause-parity` missing from the list | **CLOSED** | my witness now RED on my own replay; isolated run 18/17/**1 fail** |
| B2b | `scoring-receipt-guard` excluded on a false reason | **CLOSED** | my witness now RED; 26/25/**1 fail** |
| B2c | *(new, lane-found)* `telemetry-docs-truth` reads `ROADMAP.md` | **CLOSED** | my witness RED; the derivation sees `'../../ROADMAP.md'`, my round-1 grep could not |
| 4 | nothing guarded the list | **CLOSED** | `tests/core/docs-gating-set.test.ts`, 8/8; 7 of my 8 mutations RED |
| 5 | `before..head` + `cancel-in-progress` | **CLOSED** | `scripts/lib/validated-base.mjs`; 12 hostile cases, all fail closed; **fired in production** |
| 6 | impure half untested | **CLOSED** | `tests/scripts/classify-docs-only.test.ts`, 38/38, first case asserts byte-identical copies |
| 7 | `honesty-audit` overclaim | **CLOSED** (negative finding, honestly filed) | enumeration verified; one small omission noted below |
| 8 | fast path had never executed | **CLOSED** | two real runs, both verified against the Actions API |
| 9 | `release.yml` mirror step | **CLOSED** | trade accepted; inertness is now a gate (2 mutations RED) |
| 10 | `ci-gates-intact` could not see a wrong `if:` | **CLOSED**, and my round-1 witness was wrong — the lane's correction is right | 11 mutations run against both suites |
| 11 | §7 / `CLAUDE.md` | **CLOSED** | "when in doubt, push" restored at `CLAUDE.md:98-106`; Decision #9 at `docs/DECISION_LOG.md:921` |
| 12 | branch protection | **CLOSED** (no action) | `main` still `"protected": false`, all 38 branches |
| A | stale account-block claim | **CLOSED**, swept | 4 sites corrected; only `edge.yml:33` remains, correctly left to the other lane |
| B | edge cost regression | **WRITTEN UP, NOT APPLIED** — and it is now live in `main` | see follow-up 2 |

## B2 — my own replay, not the lane's

I rebuilt the replay harness from `ci.yml`'s shipped 17-file list plus the two
unconditional gates, ran it in a worktree of my own, and restored the tree
between every perturbation. Baseline **GREEN, 54.6 s** (round 1: 28.5 s; the
four added suites are the difference).

| witness (each a change the classifier calls `docs_only=true`) | fast path | full path |
|---|---|---|
| `Surface - Root Cause Pipeline.md`: `\| root causes \| 70 \| 69 \|` -> `\| 71 \| 68 \|` | **RED** | 18 tests / 17 pass / 1 fail |
| `MEASUREMENT_RECEIPTS.md`: `### 2026-08-08 Receipt:` -> `… Receipt (SUPERSEDED):` | **RED** | 26 / 25 / 1 fail |
| `ROADMAP.md` P3: `not durable` -> `kept safely` | **RED** | 1 / 0 / 1 fail |
| broken `[[wikilink]]` in `docs/brain/00 Home.md` | **RED** | — |
| hand-edited `docs/brain/GRAPH.md` (stale export) | **RED** | — |
| overclaim appended to `README.md` | **RED** | — |
| last row deleted from `docs/CLAIMS_REGISTER.md` | **RED** | — |
| *(control)* overclaim appended to `docs/PATH_TO_EXCELLENCE.md` | GREEN | GREEN — nothing catches it either way (item 7) |

### Item 2 of the re-check brief — the correction the lane owed me

**The lane's retraction is right and my witness stands.** Run in isolation on a
clean tree, `node --experimental-strip-types tests/routes/root-cause-parity.test.ts`
with only the `70 | 69` -> `71 | 68` edit applied gives **18 tests, 17 pass,
1 fail** (`not ok 7 - the scene-span drift measurement is re-measured, not
re-typed`). The intermediate claim that it does not fail was wrong; the
published closure says so in its own text. The record now says it plainly from
both sides.

### The candidate set — re-derived by me, and the one-hop arm

I wrote my own derivation (same two rules, my own code, no import of the lane's
test) and ran it over `tests/**`. It finds **25 candidates**, which is exactly
the lane's 17 listed + 8 excluded, with **zero uncovered**. Six are reachable
only through the one-hop arm:

```
p0-sample-drift · public-benchmark-limits · sample-coverage-facts
scene-segments · discharge-obligations · receipt-conversion
```

**The one-hop arm is right, and it earns its keep.** `p0-sample-drift.test.ts`
names no docs path at all and is a candidate only because
`scripts/generate-p0-sample-report.ts` builds `docs/user-validation/…`; I
confirmed it is a genuine docs gate by appending a comment to that committed
artifact — `p0-sample-drift` **FAILS**, `sample-coverage-facts` passes, exactly
as the exclusion table predicts. **Two hops is correctly rejected**: I checked
the stated reason and it holds — `server/lib/rulebook-count.ts` reads
`docs/rulebook/coverage.json` at module load and is reachable from `doctor.ts`,
so two hops would sweep most of the suite in for no new coverage.

**All eight exclusions are sound** — I tested them rather than reading them.
Perturbing the real file each one names and running the excluded suite:

| exclusion | perturbation I applied | result |
|---|---|---|
| `check-scoring-receipt.test.ts` | ledger heading reworded | PASS (holds) |
| `discharge-obligations.test.ts` | ledger heading reworded | PASS |
| `receipt-conversion.test.ts` | ledger heading reworded | PASS |
| `public-benchmark-limits.test.ts` | `data/screenplays/LICENSE-live-action.md` corrupted | PASS |
| `scene-segments.test.ts` | same | PASS |
| `sample-coverage-facts.test.ts` | committed P0 sample report edited | PASS |
| `owner-measure-e2e.test.ts` | (heavy git fixtures; reason cites lines, verified by reading) | — |
| `classify-docs-only.test.ts` | (writes its own fixtures under `os.tmpdir()`) | — |

None is a false reason of the kind I caught in round 1. The lane's own count of
"24 candidates, 7 excluded" is **one low in both halves** — the shipped table
has **8** entries and the derivation finds **25**. Cosmetic, and the code is the
authority, but the prose should say 25/17/8.

### The guard itself goes RED

| mutation | result |
|---|---|
| drop `root-cause-parity` from both lists | **RED** (2 fail) |
| drop `docs-gating-set.test.ts` itself | **RED** (1 fail) — the self-flagging claim is real |
| drop `telemetry-docs-truth` from both lists | **RED** (2 fail) |
| lists diverge (remove one file from `ci.yml` only) | **RED** (2 fail) |
| `EXCLUDED` names a file that does not exist | **RED** |
| `EXCLUDED` names a non-candidate (stale silencer) | **RED** |
| exclusion reason replaced by a bare category label | **RED** |
| baseline | 8/8 green |

**The self-flag is not circular.** Removing `docs-gating-set.test.ts` from the
list makes the suite name itself as uncovered, because it is a derived
candidate (it contains the literal `'docs'`, which resolves to a real
directory). Its own assertions are about the workflow lists and the derivation
— inputs a documentation edit cannot change — so being on the fast path costs
13.7 s and proves nothing extra; it is simply the rule applied to itself
without an exception, which is the right call.

## Item 3 — attacking the validated base

I built a fixture repo and a loopback runs-API stub of my own and drove the
shipped `scripts/classify-docs-only.mjs`:

| case | result |
|---|---|
| ordinary: last-success tip **is** `before` | `docs_only=true`, range **not** widened — the design's "costs nothing" promise, verified |
| cancellation: last-success tip older than `before` | `docs_only=false`, log names the widening and both SHAs |
| runs API returns **403** (rate limit / missing grant) | `docs_only=false`, "runs API returned HTTP 403" |
| **no successful run ever** on the ref (empty list) | `docs_only=false`, "0 candidate run(s) considered" |
| 20 successes returned, **none usable** (pagination truncation) | `docs_only=false`, "20 candidate run(s) considered" |
| last-success tip **force-pushed away** (object absent) | `docs_only=false` |
| last-success tip on a **diverged branch** (rebase / re-point, non-ancestor) | skipped as non-ancestor, walks to the next older run, widens, `docs_only=false` |
| the **currently-executing run** nominating its own tip | excluded, `docs_only=false` |
| API unreachable | `docs_only=false` |
| unwritable `$GITHUB_OUTPUT` | warning printed, assignment echoed to stdout, **exit 0**, no unhandled rejection |

Every unresolvable case fails closed, and every exit code was 0 — which matters,
because a non-zero `classify` fails the job, and `test`/`browser` both `needs:`
it, so a red classifier reddens the run rather than degrading to a full pass.

**`merge-base` over "just use the tip" is the right choice**, and the diverged-branch
case is why: a non-ancestor tip is not evidence about this commit's history, and
`merge-base` is an ancestor of both, so the range can only ever widen. Widening
can turn `true` into `false` and never the reverse.

**`actions: read` cannot see runs it should not.** It is scoped to this job
(`ci.yml:81-91`), read-only over workflow-run metadata of this repository, and
the query is further narrowed to one workflow file, one ref and successes only.
`workflowFileFromRef` (`validated-base.mjs:131-139`) refuses anything that is
not a plain `*.yml`/`*.yaml` basename before it reaches a URL path, so
"a different workflow with the same basename" is not reachable within a
repository (file names are unique) and cannot be reached across repositories at
all. `release.yml`'s copy carries the same grant and its output stays unused.

**On the choice of fix:** the lane took the validated base over "disable the
fast path when superseding a cancelled run", on the grounds that it also closes
the FAILED-run shape I never named. **That reasoning is correct and I endorse
it.** A docs-only push landing on top of a *red* commit is the same induction
break — the tip has not been proved by any completed run — and the cheaper fix
would have left it open. The cost is real and the lane states it: on a branch
pushing faster than CI completes, every push is FULL until one run finishes.
That is the correct trade; the saving is meant to land on `main`, which is
merged `--ff-only` into a per-SHA group that cancels nothing.

## Item 4 — the in-the-wild firing, verified against the Actions API

Every number checks out:

- Last **successful** run on the ref before the event: **35298622753**, head
  `e5049d6b`, `2026-09-18T02:15:24Z`, conclusion `success`.
- Four runs `cancelled` in between: **35299806186** (`031617eb`),
  **35299903993** (`d16bae81`), **35300227954** (`a0a881ec`),
  **35300544242** (`184c0c67`) — five pushes between 02:33:25 and 02:45:10.
- `git diff --name-only 184c0c67..04a94f57` = **1 file**
  (`docs/audits/…/review.md`), and `classifyDocsOnly` on it returns **true** —
  the round-1 classifier would have skipped the type check, `npm test`,
  metamorphic, build and the whole browser job.
- `git merge-base e5049d6b 184c0c67` = `e5049d6b`;
  `git diff --name-only --no-renames e5049d6b..04a94f57` = **18 files**,
  including `.github/workflows/ci.yml`, `scripts/classify-docs-only.mjs`,
  `tests/core/docs-only-classify.test.ts` and
  `tests/scripts/classify-docs-only.test.ts` — the classifier's own source
  among them. `classifyDocsOnly` returns **false**.

The fix caught the exact shape it was written for, on real infrastructure, four
commits after it was written. This is the strongest evidence in the report and
it is all independently checkable.

## Item 5 — item 10's two halves, both ruled on

I ran eleven mutations against **both** suites: round 1's `ci-gates-intact.test.ts`
(restored from `f4c6ee4e`, byte-identical to main's) and round 2's.

| mutation on `ci.yml` | round 1 | round 2 |
|---|---|---|
| Type check `!= 'true'` -> `== 'true'` | 0 fail | **1 fail** |
| Type check `!= 'true'` -> `== 'false'` (**my round-1 witness**) | **1 fail** | 2 fail |
| no-console -> `== 'true'` | 0 | **1** |
| reachability -> `== 'true'` | 0 | **1** |
| `npm test` -> `== 'true'` | 0 | **1** |
| receipt guard -> `== 'true'` | 0 | **1** |
| metamorphic -> `== 'true'` | 0 | **1** |
| Build -> `== 'true'` | 0 | **1** |
| `browser` job `if:` -> `== 'true'` | 0 | **1** |
| fast-path step `== 'true'` -> `!= 'true'` | 0 | **1** |
| `browser` job `if:` deleted outright | 0 | **1** |
| new `if:` on "Honesty string audit" | 0 | **1** |
| new `if:` on "Check project brain" | 0 | **1** |
| classify grant widened to `contents: write` | 0 | **1** |
| `actions: read` deleted from classify | 0 | **1** |
| `release.yml` `test` job gains `needs: classify` | 0 | **1** |
| `release.yml` docs-gating step gains an `if:` | 0 | **2** |

**My round-1 witness was wrong and the lane is right to say so.** `== 'false'`
trips the pre-existing `if:`-contains-a-literal-`false` scan
(`ci-gates-intact.test.ts:262-274`) — round 1 fails **1**, not 0, under exactly
that mutation. **The hole was real all the same**, and the lane's replacement
witness proves it: copy-pasting the fast-path step's `== 'true'` onto "Type
check" leaves round 1 at 47/47 green while skipping `tsc` on every full run.
Sixteen mutations now go RED where round 1 saw nothing.

`git diff f4c6ee4e..HEAD -- tests/core/ci-gates-intact.test.ts` is
**+182 / -0** with **zero deleted lines** — additive only, no pre-existing
assertion touched. 47 -> **53**, and 53/53 green.

## Item 6 — item 7's enumeration, checked for honesty

The headline is **correct and correctly filed as not-done**: nothing scans
`docs/**` prose for overclaim language, and I re-confirmed it — the sentence
*"STORYMACHINE is the industry-standard, world-class, revolutionary tool and we
guarantee Hollywood-standard results"* appended to `docs/PATH_TO_EXCELLENCE.md`
leaves `honesty-audit` **clean at exit 0**; in `README.md` it exits 1 with five
pattern hits. The "four FIGURES" claim is exact (`honesty-audit.mjs:204-…`
carries 8917 / 10523 / 5701 / 12700; 3216 is deliberately excluded and the file
says why).

**One omission, and it makes the statement slightly too pessimistic, not too
generous.** `SCAN_TRACKED_ARTIFACTS` (`honesty-audit.mjs:41-43`) puts exactly
one `docs/**` file — `docs/user-validation/sample-coverage-report.html` —
through the **full** PATTERNS set. Verified: an overclaim appended to it fails
`honesty-audit` with `[guarantees]`, `[industry-standard]`, `[superlatives]`.
The enumeration also omits four suites that gate `docs/**` *content* without
being language scans (`coverage-letter`, `root-cause-parity`, the two
`rulebook` suites, `brain-coverage`, `p0-sample-drift`). Neither changes the
conclusion — the safety argument still may not rest on a gate that does not
exist — so this is a one-line correction, not a reopened item.

## Item 7 — the `release.yml` trade

**The trade is right.** Gating the mirrored step needs `needs: classify` on
`release.yml`'s `test` job; `publish` needs `[test, browser]`; and a job skipped
because a `needs` dependency **failed** leaves the run at `failure` — so a
classifier bug would convert a `v*` tag push into a release that silently never
publishes, to save 25–60 s on an event that happens a few times a year. Trading
release reliability for seconds on the rarest event in the repository would be
the wrong direction.

**And the test pins what matters.** `release.yml` gaining `needs: classify` on
its `test` job is **RED (1 fail)**; the docs-gating step gaining any `if:` is
**RED (2 fail)**; both were green on round 1. That is exactly the mechanical
inertness I asked for, and it is stronger than the comment it replaces.

## Everything else the re-check asked for

- **Full `npm test`, my own run, round-2 tip:** **14,142 tests / 14,050 pass /
  0 fail / 91 skipped / 1 todo**, exit 0, 467.8 s, `RUN_E2E` unset — matching
  the lane exactly. The **+62** against my round-1 baseline of 14,080 / 13,988
  is fully accounted for, and I counted each file myself:
  `classify-docs-only.test.ts` **38**, `docs-gating-set.test.ts` **8**,
  `docs-only-classify.test.ts` 21 -> **31** (+10), `ci-gates-intact.test.ts`
  47 -> **53** (+6). 38 + 8 + 10 + 6 = 62.
- **`npm run lint`: 0**, exit 0. `honesty-audit` clean, `check-docs` clean,
  `check-brain` fresh, `check-scoring-receipt` "no scoring-path files changed".
- **B3's 38 cases really drive the script bytes.** Its first case reads both
  the fixture copy and the committed file and `deepEqual`s the **Buffers**
  (`classify-docs-only.test.ts:260-270`); `makeRepo()` `copyFileSync`s the
  three real scripts in and excludes them from git so they can never enter a
  classified changed-file set. 38/38, no skips.
- **The two fast-path runs, both verified against the API.** Run
  **35296219834** (`f4c6ee4e`): 01:39:37 -> 01:40:57, **1 m 20 s**, `success`.
  Run **35301550263** (`799ae27e`): 03:00:35 -> 03:02:45, **2 m 10 s**,
  `success`; `classify` job 13 s; `browser` job **`"conclusion":"skipped"`**
  with no runner assigned; seven gate steps `skipped`; "Run docs-gating tests"
  03:01:48 -> 03:02:32 = **44 s**. Against the 9 m 03 s baseline
  (34793742299, verified again) that is **6 m 53 s** of wall clock.
  Incidentally this run is also the first *empirical* proof of my round-1
  claim in defect B: a run whose `browser` job is skipped still concludes
  `success`, so `edge.yml` will fire on it.
- **Cost figures corrected and correct.** On the full run 35294788628 the
  `classify` job was 8 s of work in a 10 s wall-clock gap before `test` and
  `browser` were created, plus one runner slot. That is what `ci.yml` and the
  README now say.
- **Defect A swept.** Corrected at `docs/PATH_TO_EXCELLENCE.md` ("RESOLVED
  2026-09-13 — GitHub Actions is running jobs again", with the eleven-day gap
  kept as history), `CONTRIBUTING.md` ("CI runs. It stopped for eleven days and
  it is back."), the audit README, and
  `docs/brain/Owner/Owner - Fix GitHub Actions.md` (`status: resolved`). A
  repo-wide grep for the block language leaves exactly one live hit,
  `.github/workflows/edge.yml:33` — correctly **not** this lane's to edit.
- **`edge.yml` and `Dockerfile` untouched**: `git diff origin/main..HEAD --
  .github/workflows/edge.yml Dockerfile` is empty on the rebased tree.
- **Item 11/12:** `CLAUDE.md:96-106` now leads with "**A commit that exists
  only in a worktree is not work that exists**", restores "**when in doubt,
  push**", and cites Decision #9. `docs/DECISION_LOG.md:921` records Decision
  #9 with the maintainer's own words, and it has a brain note. Branch
  protection re-queried: `main` `"protected": false`, and all 38 branches.

## The rebase, and the state of `main`

`main` has moved **twice more** than the brief says: it is now **`8b6a60c1`**,
and `origin/lane/edge-image-real` points at that same commit — **the edge lane
has already merged.** I rebased this lane onto it in a scratch worktree:

- The only conflicts are `docs/brain/GRAPH.md` and
  `docs/brain/brain.graph.json`, resolved by `npm run brain` (never by hand).
  `docs/DECISION_LOG.md` and **`tests/core/ci-gates-intact.test.ts` auto-merge
  cleanly**.
- On the rebased combined tree: **`ci-gates-intact` 58 tests / 58 pass** —
  the figure the edge reviewer reported, reproduced. Also
  `docs-gating-set` 8/8, `classify-docs-only` 38/38, `brain-coverage` 7/7,
  `check-brain` fresh (124 notes / 504 links), `lint` 0, `honesty-audit` clean,
  `check-docs` clean, `check-scoring-receipt` clean.
- **Full `npm test` on the rebased tree: 14,249 tests / 14,157 pass / 0 fail /
  91 skipped / 1 todo, exit 0**, 367.3 s. This lane, rebased onto a `main` that
  already carries the edge lane, is green end to end.
- The edge lane's work survives the rebase intact (`Dockerfile`'s
  `python3 make g++`, `edge.yml`'s `branches: [main]`).

**One scare, run down to the end, and it is mine, not the lane's.** The first
full `npm test` I ran on the rebased tree came back **25 failures**, all of them
inside `tests/scripts/owner-measure-e2e.test.ts`. They are an artifact of my own
dry-run, not a lane or combination defect, and the proof is three runs:

| tree | `owner-measure-e2e` |
|---|---|
| pristine `origin/main` `8b6a60c1` | 56 / 56 pass |
| the lane tip `f3f61979` | 56 / 56 pass |
| my rebased worktree, **detached** at a commit on no ref | 31 pass / **25 fail** |
| the same rebased tree, after `git checkout -B tmp/rebase-check` | **56 / 56 pass** |

The failure is `[REFUSED] git worktree add --detach … origin/HEAD failed (exit
128) / fatal: invalid reference: origin/HEAD`: the suite clones the repository
with `git clone --shared`, and my rebased commits existed on no branch, so the
clone had no ref containing them and `origin/HEAD` did not resolve. Putting the
tip on a branch fixes it completely. Worth recording for the next person who
rebases into a detached worktree and runs the full suite: **give the rebase a
branch name first**, or this one suite will hand you twenty-five red herrings.

**On the skipped browser battery and metamorphic:** acceptable, and I closed the
gap rather than merely ruling on it. `git diff --name-only origin/main..HEAD --
src/ server/ public/` is **empty** — the lane touches no rendered surface at all
— and `check-scoring-receipt origin/main..HEAD` reports no scoring-path files.
I ran `npm run test:metamorphic` myself on the rebased tree: **exit 0**, hard
invariants hold, `empty_verbosity` still the one documented known-failing
witness. The browser battery is the orchestrator's to run on the rebased branch
per §4, and it has no surface here to certify.

## Follow-ups — neither blocks the merge

1. **The 15,091 ms figure does not reproduce for me.** `classify-docs-only.mjs:320-331`
   claims the pre-fix code sat 15,091 ms on a dead keep-alive socket versus
   51 ms. On this sandbox (Node v22.22.2, a loopback stub, `GITHUB_OUTPUT`
   to `/dev/null`, three runs each) I measured the shipped script at
   **139–157 ms** with a successful API call and **58–63 ms** with no call;
   reverting the explicit exit gave **149 ms**, and restoring the full pre-fix
   shape (`AbortSignal.timeout(15_000)` *and* no explicit exit), including
   against a stub with `keepAliveTimeout=120000`, gave **147–158 ms**. The fix
   itself is correct and harmless — an explicit, flushed, deterministic exit is
   the right shape for a job whose justification is that it costs seconds — but
   the quoted number should either name the environment that produced it or be
   re-measured. A number a reviewer cannot reproduce is the one kind of claim
   this standard exists to catch (§3).
2. **Defect B is now live in `main`, and it is now this lane's to close.** The
   edge lane merged first, so this lane is the one that "merges second" in my
   round-1 framing. On `origin/main` today the `Dockerfile` builds, `edge.yml`
   is filtered to `branches: [main]`, and it carries **no docs-only gate** — I
   grepped the merged file. Every green docs-only push to `main` will now buy a
   full `docker build --push` of a byte-identical image, on exactly the pushes
   this lane just made cheap. The patch is already written out in full in the
   closure's defect-B section; applying it is a short round 3 or an immediate
   follow-up lane, and the guard should be a `ci-gates-intact` assertion that
   `edge.yml` gates its build steps on a docs-only classification.
3. **Cosmetic:** the closure and the audit README say "24 candidates, 7
   excluded"; the shipped table has **8** exclusions and the derivation finds
   **25**. The code is right; the prose is one low in both halves.
4. **Cosmetic:** item 7's enumeration omits `SCAN_TRACKED_ARTIFACTS`, the one
   `docs/**` file (`docs/user-validation/sample-coverage-report.html`) that
   *is* scanned with the full PATTERNS set — verified, it fails
   `honesty-audit` on an inserted overclaim. The conclusion is unchanged.

## What this round did well

The lane did not defend round 1's positions; it re-measured them, published a
retraction of its own intermediate claim about my witness, and found a third
missed suite that my derivation structurally could not see. The validated-base
fix chose the more invasive option because it closes a shape nobody asked
about, then caught that shape in production four commits later. `ci-gates-intact`
grew by 182 lines and lost none. Every mutation I invented was already covered
or went RED. That is the standard working.

---
---

# Round 3 — closure (lane, 2026-09-18)

Everything above this line is unedited: the reviewer's round-1 text (lines
1-457, 26,318 bytes), the lane's round-2 closure, and the reviewer's round-2
re-check. Four items, one of which mattered.

## 1. Defect B — applied, and the patch as specified was WRONG

`lane/edge-image-real` merged first, so this lane is the one that "merges
second". The gate is in `.github/workflows/edge.yml`: `fetch-depth: 2` on the
existing `head_sha` checkout, one step diffing
`git diff --name-only --no-renames "${HEAD_SHA}^" "${HEAD_SHA}"` through
`scripts/lib/docs-only.mjs`, and `if: steps.docsonly.outputs.docs_only != 'true'`
on login, buildx and build-push. The `Dockerfile`, the `branches: [main]`
trigger filter and the job-level `if:` are untouched.

### The defect in my own round-2 write-up

The patch I specified gated on `classifyDocsOnly` — ci.yml's predicate. **It
would have skipped a rebuild for a commit that genuinely changes the image.**

`.dockerignore` denies `**` and then re-includes `!server/**`, `!src/**`,
`!public/**`. Thirteen committed `*.md` files live under those trees. They
enter the build context — not inferred, measured, by building a probe image
with `COPY . .` and listing what arrived:

```
$ docker build -f probe.Dockerfile --no-cache .
#8 === docs/ or *.md inside the build context? ===
#8 ./server/planning/README.md
#8 ./server/nvm/revision/WAVE_QUALITY_GUARANTEE.md
#8 ./server/nvm/kernel/README.md
…
$ git ls-files 'server/**/*.md' 'src/**/*.md' 'public/**/*.md' | wc -l
13
```

`Dockerfile:91` is `COPY --from=builder /app/server ./server`, so they are in
the published image. And:

```
$ node -e 'import("./scripts/lib/docs-only.mjs").then(m =>
    console.log(m.classifyDocsOnly(["server/nvm/kernel/README.md"])))'
true
```

`classifyDocsOnly` is right for "which CI gates can this push affect" and
wrong for "can this change the image". Two questions, one predicate — the same
shape as blocker 1's rename hole, in a different place.

So the gate uses a second, **strictly narrower** predicate,
`canSkipImageBuild` (`scripts/lib/docs-only.mjs`): `docs/**` and **root-level**
`*.md` only. A test asserts the narrowing is one-directional — everything
skippable is also docs to CI, never the reverse — so the two can never drift
into disagreeing in the unsafe direction.

### The two `.dockerignore` facts, pinned rather than assumed

`canSkipImageBuild` is only sound while (a) the blanket `**` deny is present
and first, and (b) no negation re-includes `docs/**` or a root `*.md`.
`tests/core/edge-docs-gate.test.ts` reads the real `.dockerignore` and fails on
either. A future `!CHANGELOG.md` breaks a test instead of silently making the
gate wrong.

### Failure direction: deliberately inverted, and said so at the site

ci.yml's classifier runs every gate on an input it cannot resolve, because
guessing wrong there means a gate silently skipped. **edge.yml BUILDS on an
input it cannot resolve**, because guessing wrong there means a missing or
stale `:edge` — visible and recoverable — while over-building costs one runner
slot. `edge.yml`'s comment on the step states this in those terms.

`<head_sha>^` does not exist for a root commit or after a shallow fetch, and
the classifier could fail for reasons nobody predicted. Every one of those
paths writes `docs_only=false` **and exits 0**, so the step can never fail the
job and block a publish. Both verified by running the extracted body:

```
--- ROOT COMMIT (no parent) ---
cannot diff bb610beb^..bb610beb (root commit, shallow fetch, or an
  unresolvable parent) — building
OUT: docs_only=false          exit 0
--- classifier removed ---
exit=0  OUT: docs_only=false
```

### What skipping gives up, stated

The image is a function of the context **and** the build-args, and `GIT_SHA`
moves every commit. A skipped build leaves `:edge`'s `ENV GIT_SHA` and its
`org.opencontainers.image.revision` label naming the last commit actually
built, not `main`'s tip. If that label must track the tip,
`docker buildx imagetools create` retags the existing manifest; rebuilding for
it is not the answer. This is in `edge.yml`'s own comment, not only here.

### The honest size of the win

I could not complete a real image build in this sandbox — `apk add python3
make g++` fails behind the proxy with "TLS: server certificate not trusted",
so the `deps` stage never finishes and the four timed builds all returned
`rc=1` in ~0.4 s. **That is a failed measurement and I am not reporting it as
a result.** What I did measure:

- the build context `docker build` transfers is **179.09 kB**, and it contains
  no `docs/**` and no root `*.md` at all;
- `ENV GIT_SHA` sits at `Dockerfile:84`, **before** the ten `COPY`/`RUN` layers
  of the runner stage — so a new SHA invalidates from there down regardless of
  the context being identical.

Taken with the edge reviewer's own 19/19-cached-in-0.744 s figure, the honest
statement is: **the gate does not save minutes of build time.** It saves a
runner slot, a registry push, a workflow run and the log noise, on every
docs-only push to `main`. That is a small win.

**Is it worth its complexity? Yes, but not for the seconds.** Two reasons that
survive the measurement:

1. `:edge` is a published artifact. Republishing a byte-identical image under
   a new digest on every prose edit makes the tag's history noise, and the
   `revision` label stops meaning "the commit whose code this is".
2. The gate is where the `server/**/*.md` finding lives. Without it nothing in
   this repository states that `*.md` under an allowlisted tree is in the
   image — and that fact now has a test, which is worth more than the runner
   slot.

If a future maintainer disagrees, the argument to beat is that one, not a
timing claim.

### RED-first, ten mutations

| mutation | `ci-gates-intact` | `edge-docs-gate` |
|---|---|---|
| gate on `classifyDocsOnly` (**the patch as specified**) | 64/63/**1** | 28/26/**2** — including "a `*.md` change under server/ BUILDS" |
| drop `--no-renames` | 64/63/**1** | 28/26/**2** — the rename case goes green-and-wrong |
| `fetch-depth: 2` -> `1` | 64/63/**1** | — |
| build-push `if:` `!= 'true'` -> `== 'false'` (never builds again) | 64/63/**1** | — |
| delete the `if:` from the login step | 64/63/**1** | — |
| `.dockerignore` re-includes `docs/**` | — | 28/27/**1** |
| `.dockerignore` re-includes a root `*.md` | — | 28/27/**1** |
| the blanket `**` deny removed | — | 28/27/**1** |
| widen `canSkipImageBuild` to any `*.md` | — | 28/23/**5** |
| an empty changed-file set becomes skippable | — | 28/27/**1** |
| **shipped tree** | **64/64** | **28/28** |

`tests/core/edge-docs-gate.test.ts` does not stop at reading YAML: it
**extracts the step's `run:` body from `edge.yml` by its `id:` and executes it**
against real git repositories, so a dropped flag, a wrong module path or an
inverted failure direction fails here rather than on `main`.

`git diff origin/main -- tests/core/ci-gates-intact.test.ts` is **+336 / −0**.
No edge-lane assertion was touched; `yamlScalar`'s exact-path read of
`jobs.publish-edge.if` and its every-key-unique rule are used as they are, and
one of the new assertions checks that the docs gate was **not** folded into
that job-level `if:`.

The new suite is on the docs-only fast path (eighteen files now): the guard
flagged it itself, correctly — it asserts `git ls-files 'server/**/*.md'` is
non-empty, and those are files a documentation edit can delete.

## 2. The 15,091 ms figure — withdrawn, and explained

**The re-check is right and the number was wrong.** It was an artifact of the
harness that produced it, not a property of the code.

That harness ran the loopback API stub **in the same process** as the
`execFileSync` call. `execFileSync` blocks the event loop for the child's whole
lifetime, so the connection was never accepted, the request never arrived, and
the child sat out its own 15-second fetch abort. Reproduced deliberately:

```
elapsed: 15070 ms
requests the in-process stub actually served: 0
docs-only classification: FULL (cannot establish a validated base:
  runs API request failed: runs API timed out after 15s)
```

Zero requests served. Nothing to do with keep-alive. The irony is on the
record: `tests/scripts/classify-docs-only.test.ts`'s own header documents this
exact trap — it is why the suite's stub runs in its own process — and the
number in the comment beside it was produced by the trap.

**Re-measured properly** (stub in its own process, Node v22.22.2, three runs
each, `GITHUB_OUTPUT` to `/dev/null`):

| variant | runs |
|---|---|
| shipped, with a successful API call | 92 / 87 / 88 ms |
| shipped, no API call | 37 / 37 / 40 ms |
| pre-fix shape (`AbortSignal.timeout` **and** no explicit exit) | 97 / 92 / 91 ms |
| pre-fix shape, stub `keepAliveTimeout=120000` | 87 / 92 / 97 ms |

**No measurable difference.** Consistent with the re-check's 139–157 / 58–63 on
its own machine.

The code is unchanged — an explicit, flushed, deterministic exit is still the
right shape — but its justification is rewritten at both sites
(`scripts/classify-docs-only.mjs`, the `emitAndExit` docstring and the
abort-controller comment) and in the audit README. It now says what it is:
defensive shaping that costs nothing, which makes the step's wall time a
property of the work it does rather than of what the global fetch dispatcher
decides about an idle connection. No latency is quoted in support of it except
the ones above.

## 3. The two prose corrections

- **25 candidates / 18 listed / 8 excluded.** Round 2's prose said 24/17/7 and
  was one low in both halves while the shipped `EXCLUDED` table always had
  eight entries. Corrected in the audit README (three places),
  `docs/brain/Gates/Gate - Docs-Gating Set.md` and the audit brain note. 18
  rather than 17 because round 3 adds `tests/core/edge-docs-gate.test.ts`.
  The code was right throughout; only the prose was wrong.
- **`SCAN_TRACKED_ARTIFACTS` added to item 7's enumeration.** Verified
  independently rather than taken on trust: appending an overclaim to
  `docs/user-validation/sample-coverage-report.html` fails `honesty-audit`
  with `[guarantees]`, `[industry-standard]` and `[superlatives]`, exit 1.
  It is one explicitly named artifact, not a directory scan, so the headline
  finding is unchanged: **nothing scans `docs/**` prose for overclaim
  language.** The enumeration now says so with the exception in it.

## 4. The rebase

Rebased onto `origin/main` `8b6a60c1`. The only conflicts were
`docs/brain/GRAPH.md` and `docs/brain/brain.graph.json`, both resolved by
running `npm run brain` and staging the regenerated output — **never a hand
merge**, twice (the rebase stops at two of the fourteen commits).
`docs/DECISION_LOG.md` and `tests/core/ci-gates-intact.test.ts` auto-merged.
`npm run check-brain`: fresh, **125 notes / 510 links** (124/504 before this
round's new gate note).

The work was done on the branch, not in a detached worktree — the re-check's
`owner-measure-e2e` red herring did not occur, and that suite is green in the
full run below.

## Gates

| gate | result |
|---|---|
| `npm run lint` | **0**, exit 0 |
| full `npm test` | **14,283 tests / 14,191 pass / 0 fail / 91 skipped / 1 todo**, exit 0, 355.1 s |
| `npm run test:metamorphic` | **exit 0** — 6/7 raw, hard passes 6, `empty_verbosity` the one documented known-failing witness |
| `tests/core/ci-gates-intact.test.ts` | 58 -> **64**, 64 pass, 0 fail |
| `tests/core/edge-docs-gate.test.ts` | **28 pass**, 0 fail (new) |
| `tests/core/docs-gating-set.test.ts` | **8 pass**, 0 fail |
| `tests/scripts/classify-docs-only.test.ts` | **38 pass**, 0 fail |
| `tests/core/docs-only-classify.test.ts` | **31 pass**, 0 fail |
| `tests/core/docker-context.test.ts` | **7 pass**, 0 fail |
| `tests/core/dockerfile-toolchain.test.ts` | **25 pass**, 0 fail |
| `tests/core/brain-coverage.test.ts` | **7 pass**, 0 fail |
| `check-no-console` / `check-server-reachability` / `check-docs` / `honesty-audit` / `check-brain` / `check-scoring-receipt` / `build` | all clean, exit 0 |

`RUN_E2E` was not set, matching the re-check's rebased baseline of
**14,249 / 14,157 / 0 / 91 / 1**. The **+34** is entirely new coverage and
fully accounted for: `tests/core/edge-docs-gate.test.ts` **+28** and
`tests/core/ci-gates-intact.test.ts` 58 -> **64** (+6). 28 + 6 = 34, and
skipped/todo are unchanged at 91/1. `tests/scripts/owner-measure-e2e.test.ts`
is **56/56** — the re-check's detached-worktree red herring did not occur,
because this round rebased on the branch rather than at a commit on no ref.

`npm run test:metamorphic` was run this round rather than reasoned past, as
asked. The browser battery still has no surface to certify, re-confirmed
**after** touching `edge.yml`:
`git diff --name-only origin/main..HEAD -- src/ server/ public/` is empty.

## What was NOT done, and why

- **A real `docker build` timing.** The sandbox proxy blocks `apk` inside the
  container, so the `deps` stage cannot complete here. Said plainly above
  rather than reported as a number.
- **Extracting `.dockerignore`'s full Moby evaluator into a shared module.**
  `tests/core/docker-context.test.ts` carries one; reusing it would make
  `edge-docs-gate` authoritative rather than assumption-pinning. It is the
  stronger version and it is a refactor of a file this lane does not own, so
  the two assumptions are pinned syntactically instead — narrow, exact, and
  loud on any negation that mentions docs or markdown.
- **Anything in `edge.yml` beyond the gate.** The `Dockerfile`, the
  `branches: [main]` filter and the job-level `if:` are settled work from
  another lane's three review rounds.
- **One cosmetic line, deliberately not added after the full run.** The gate
  captures `git diff ... 2>&1`, so a git *warning* on a successful diff would
  join the file list and be classified as a non-docs path — pushing toward
  BUILDING, which is this step's safe direction, so the behaviour is right.
  Splitting stderr out would make the log tidier. The full suite ran on the
  tree as it stands and `docs/LANE_STANDARD.md` §4 says that happens once on
  the final tree, so the note is here rather than in a post-run edit; it is a
  one-liner for whoever next opens that file.
