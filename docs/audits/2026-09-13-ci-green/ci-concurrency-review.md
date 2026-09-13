# Review — `lane/ci-concurrency` @ `d48b39f4` (round 1)

Reviewed object: `lane/ci-concurrency` tip **`d48b39f4`**
(`d48b39f44f581661ac0d7a3f928d3d125c10601c`), one commit off `main` @
`68d05192`; `origin/lane/ci-concurrency` equals it (`git ls-remote` checked).
Worktree `/home/user/wt-ci`, held read-only — every mutation below ran against
a copy of `.github/workflows/`, `tests/core/ci-gates-intact.test.ts` and
`package.json` under `<session scratch>/cireview/`, never against the worktree.
Reviewer did not build this lane. Lane report:
`docs/audits/2026-09-13-ci-green/ci-concurrency-lane-report.md`.

## 1. Brief, item by item

| # | Brief item | Verdict | Evidence |
|---|---|---|---|
| 1 | `concurrency` group on ci.yml keyed on workflow + ref, `cancel-in-progress` for every ref EXCEPT main | **Done**, with an overclaim in the prose (Finding 1) | `ci.yml:22-24`; parses to `{group: '${{ github.workflow }}-${{ github.ref }}', cancel-in-progress: "${{ github.ref != 'refs/heads/main' }}"}` |
| 1b | Same on other workflows where cancelling is safe, reason given for each touched or skipped | **Done** for all four workflows that exist on `68d05192`; one fifth workflow arrives in the same batch and is not considered (Finding 5, orchestrator) | `security.yml:23-37` (touched, reasoned); `release.yml:38-49` (skipped, reasoned); `edge.yml` untouched — it already carries a job-level `concurrency: {group: edge-image, cancel-in-progress: true}`, confirmed by reading the file, not assumed |
| 2 | NO `paths-ignore`, with a comment saying why (docs checks live in the test job) | **Done**; the comment's placement and one of its four examples are wrong (Findings 6, 7) | `ci.yml:26-33`; `check-docs`/`honesty-audit`/`check-brain` are steps of the `test` job (`ci.yml:117-143`), brain-coverage and the claims-register suites run inside `npm test` (`ci.yml:151-170`) |
| 3 | `ci-gates-intact.test.ts` pins the group with cancel conditioned on ref != main, shown failing on the unfixed workflow first | **Done and reproduced** (4 red → 34 green), but the guard has two ways to pass on a broken workflow (Findings 2, 4) | §2 below |
| 4 | LANE_STANDARD §7 item 1 keeps "push after EVERY commit", gains one sentence on the cost model | **Done**; "never main's" inherits Finding 1's overclaim, and the sentence omits the consequence for cited run ids (Finding 8) | `docs/LANE_STANDARD.md:104-111` — "push … after EVERY commit" is verbatim intact, one sentence appended |

Nothing in the diff is narrowed or silently changed relative to the brief. The
`release.yml` skip is a real documented skip (item 1 said "where cancelling a
superseded run is safe"), not a dropped surface.

## 2. Reproduced numbers

All on this machine, sequentially. The lane's report claims are in brackets.

| What | Command | Result |
|---|---|---|
| The touched test, as shipped | `node --experimental-strip-types tests/core/ci-gates-intact.test.ts` | **34 tests, 34 pass, 0 fail** (41.6 ms; 0.149 s wall) [claimed 34/34 — matches] |
| The same test against the PRE-lane workflows (`git show 68d05192:.github/workflows/{ci,security}.yml`) | same | **30 pass, 4 fail** [claimed 4 of 34 red — matches] |
| — which 4 | | `ci.yml declares a workflow-level concurrency group…`, `ci.yml cancels superseded runs everywhere EXCEPT main`, and the same two for `security.yml` |
| Docs quality | `npm run check-docs` | exit **0**, "No AI writing patterns detected" [claimed exit 0 — matches] |
| Brain coverage | `node --experimental-strip-types tests/core/brain-coverage.test.ts` | **7 tests, 7 pass, 0 fail** [claimed pass — matches] |
| Brain freshness | `npm run check-brain` | exit **0** — "OK. 113 notes, 433 links, graph is fresh" (matches the GRAPH.md diff's 113/433) |
| Receipt gate | `node scripts/check-scoring-receipt.mjs 68d05192..d48b39f4` | exit **0**, "no scoring-path files changed" |
| YAML validity | `yaml.safe_load` on all four workflow files | all parse [claimed — matches]; `cancel-in-progress` parses as the **string** `"${{ … }}"`, which is the expected shape |

### Mutation matrix on the new guard

`topLevelConcurrencyBlock()` does **not** parse YAML. It finds the first line
equal to the exact string `'concurrency:'`, then takes every following line
until one has a non-space character at column 0, and runs two regexes over the
text. Six mutations, each a single edit to the copied `ci.yml`:

| # | Mutation | Semantics | Test |
|---|---|---|---|
| M1 | `cancel-in-progress: true` (the brief's mutation — main becomes cancellable) | **broken** | **33/34, red on exactly `ci.yml cancels superseded runs everywhere EXCEPT main`** — correct, and red on that one assertion only |
| M2 | `cancel-in-progress: "${{ github.ref != 'refs/heads/main' }}"` (double-quoted) | identical | 33/34 — **false fail** |
| M3 | `cancel-in-progress` written before `group` | identical | 34/34 — correctly order-agnostic |
| M4 | flow mapping: `concurrency: { group: "…", cancel-in-progress: "…" }` | identical | 32/34 — **false fail** (both assertions) |
| M5 | correct block kept, a **second** top-level `concurrency:` added later with `group: whatever, cancel-in-progress: true` | **broken** (PyYAML resolves the mapping to `{'group': 'whatever', 'cancel-in-progress': True}` — last key wins) | **34/34 — green** |
| M6 | `cancel-in-progress: true`, with the correct expression left directly above it as an indented `# was: …` comment | **broken** | **34/34 — green** |

M1 is the brief's required demonstration and it behaves exactly as advertised.
M5 and M6 are the two ways the guard can be green on a workflow that cancels
main.

## 3. Findings

### Finding 1 — MAJOR (accuracy): "never cancelled" is stronger than `cancel-in-progress: false` provides

The diff asserts, absolutely, in four places, that main's runs cannot be
cancelled:

- `ci.yml:18` — "`main` is the one ref excluded from cancellation … a run that
  gets cancelled leaves no conclusion to cite";
- `security.yml:31-34` — "the weekly schedule run also resolves to
  `refs/heads/main`, so **a scheduled advisory sweep is never cancelled
  either**; at most it queues … (serialized, not lost)";
- `docs/brain/Audits/Audit - 2026-09-13 CI Green.md` — "`main`'s runs are never
  cancelled";
- `docs/LANE_STANDARD.md:107-108` — "cancels a branch's own superseded run
  (never main's)".

`cancel-in-progress: false` guarantees only that a run **already in progress**
is not cancelled. GitHub's queueing rule for a concurrency group is the other
half: when a run is queued into a group that already has one in progress, it
becomes *pending*, and **any previously pending run in that group is
cancelled**. So the group holds at most one running plus one pending member.
Two merges to main inside one CI window (test job ~7 min + browser ~5 min) are
enough: run A is in progress, B is pending, C queues, and **B is cancelled
while pending** — no conclusion, no logs, no run to cite for B's commit. That
is exactly the harm the exclusion was written to prevent, and the exclusion
does not prevent it. It also means `edge.yml`'s `workflow_run` never fires for
that commit (benign — the next main run republishes `:edge`, but the file's
reasoning does not say so).

The security.yml sentence is falsified more directly than ci.yml's, because it
names a specific scenario as safe: a Monday 06:00 schedule run pending behind
an in-progress main push is cancelled the moment a second main push queues.
"Serialized, not lost" is true for exactly one contender and false for two.

The comment does correctly say **queue**, never "skip" — that part of the
brief's check (b) passes, and the `pull_request` reasoning ("`github.ref` for a
`pull_request` event is the stable per-PR merge ref", i.e. `refs/pull/N/merge`,
so cancellation is per-PR and never crosses PRs) is correct as written.

Low likelihood, absolute claim. Two ways to close it, either acceptable:
weaken the four sentences to "a *running* main job is never cancelled; a
second main push while one is still queued can drop the pending run", or make
the claim true by giving main runs their own group, e.g. append
`${{ github.ref == 'refs/heads/main' && github.sha || '' }}` to the group key
so no two main runs ever share a group. The second is a one-line change and
makes all four sentences literally true.

### Finding 2 — MODERATE (a guard that can be green on the bug it exists to catch): the positive regexes match text inside comments

M6: `cancel-in-progress: true` with `# was: cancel-in-progress: ${{ github.ref
!= 'refs/heads/main' }}` on the line above is valid YAML, cancels main, and
passes 34/34. That is the file's own founding story pointed back at it — this
test exists because six PRs put `continue-on-error: true` directly above a
comment claiming the step blocks. Note the existing assertions in this file are
mostly `assert.doesNotMatch`, where a comment can only cause a *false fail*
(safe); the two new ones are the file's first `assert.match` on a block whose
absence is the defect, which is the direction where a comment causes a false
**pass**. One line in the helper closes it:

```ts
if (line.trim().startsWith('#')) continue;   // a comment is not a value
```

### Finding 3 — MINOR (brittleness): an equivalent block written differently goes red

M2 (double-quoted scalar) and M4 (flow mapping) are byte-for-byte equivalent to
what ships and both go red. The failure direction is safe, but it is not
theoretical here: the lane report's own §2 table renders the change as
`concurrency: {group: "${{ … }}", cancel-in-progress: "${{ … }}"}` — the exact
form its test rejects. Allowing an optional quote (`["']?`) in both regexes
costs nothing and removes a confusing red for the next editor.

### Finding 4 — MINOR (cannot fail): first top-level `concurrency:` wins for the test, last wins for the parser

M5. `findIndex` takes the first match and stops; a YAML loader takes the last.
A second top-level block appended later in the file therefore governs the
workflow while the test reads the first one. (GitHub's own loader may reject
the duplicate key outright rather than last-win, in which case the failure mode
is a dead workflow instead of a silently wrong one — either way the guard does
not see it.) Cheap fix: assert there is exactly one top-level `concurrency:`
line, or filter to `lines.filter(l => l === 'concurrency:').length === 1`.

### Finding 5 — MINOR (batch/merge order, orchestrator): a fifth workflow arrives in this same batch with no group

`lane/voice-bound-ci-derivation` adds `.github/workflows/calibrate-voice-bound.yml`
(`workflow_dispatch` + push to `calibrate/**`). It has **no** `concurrency:`
key (checked on that branch), and the new test's file list is hardcoded to
`ci.yml` and `security.yml`, so nothing will notice. It is not a defect of this
lane — that file does not exist on `68d05192`, and this lane correctly enumerated
the four workflows that do. But item 1's "the same on other workflows where
cancelling a superseded run is safe" will be unmet the moment the two lanes are
both on main, and cancelling a superseded calibration sweep is plainly safe: it
measures, it does not gate, and that lane's own report already records run
`34739117140` as "cancelled — superseded before it finished". Whoever merges
second should add the group there, or record the skip.

### Finding 6 — MINOR (report accuracy): the no-`paths-ignore` comment is not where the report says it is

Report §3: "The comment recording this sits **directly beside** the `on:`
trigger block in `ci.yml`, where a future edit adding `paths-ignore` would have
to walk past it." `on:` is lines 3-7; the comment is lines 26-33, nineteen
lines below, separated by the concurrency comment and block. `paths-ignore`
is written *inside* `on:` — under `push:` at line 4 — so an editor adding one
never reaches line 26. The comment's stated job is to be un-walk-past-able;
move it above `on:`, or put a one-line pointer inside the `push:` block.

### Finding 7 — MINOR (accuracy): `check-docs` cannot fail the job

`ci.yml:26-28` lists "check-docs, honesty-audit, check-brain and claims-register
assertions" as "DOCS checks … so a documentation-only push can fail them".
`check-docs` carries `continue-on-error: true` (`ci.yml:128`) and this very
test file calls it "deliberately non-blocking". The argument is sound on the
other three (and on `brain-coverage`/`claims-row-citations` inside `npm test`);
it is just the first example that is wrong. Drop it or mark it warn-only.

### Finding 8 — MINOR (the brief's item (e)): a cited lane-branch run id can now be a cancelled run

Checked every run-id citation in `docs/`, `CLAUDE.md` and `ROADMAP.md`. Only
this batch cites any. Nothing cites a **future** ci.yml run, so nothing breaks
retroactively. But `docs/audits/2026-09-13-ci-green/voice-bound-lane-report.md`
does cite a ci.yml run on a **lane** branch — `34739080950` (lane `9380ea08`),
alongside main's `34736306670` — so the pattern "cite my own branch's CI run"
is live in this batch, and under this change that run id is only citable if
nobody pushed again while it ran. The new LANE_STANDARD sentence tells a lane
the cost model but not this consequence; half a clause fixes it ("…so a report
that cites its own branch's run id must cite the run for the last push"). The
calibrate/** runs the voice-bound lane cites are on a different workflow with
no group — unaffected, as the brief expected.

### Finding 9 — MODERATE (record): the lane report's Tip line names a commit that does not exist on the branch

The report's final section gives the tip as
`1eed4dcf474a440dbb769588b5fcf074d86df8ef` and says it was "pushed to
`origin/lane/ci-concurrency`". It was not: `origin/lane/ci-concurrency` is
`d48b39f4`, and `1eed4dcf` is an unreachable pre-amend object that survives
only in this sandbox's object store — it is gone on the next rebuild. The
report argues the real SHA belongs in the session's final message instead, but
LANE_STANDARD §7 exists precisely because 21 cited round commits from the
2026-09-05 batch are already unreachable, and §7 item 3 makes the written SHA
the record. The fix is one commit, which is cheap for exactly the reason this
lane is about.

### Observation (not a finding) — no batch README

`docs/audits/2026-09-13-ci-green/` has no `README.md`, while every batch since
2026-09-05 has one, and §7 item 3 puts the reviewed SHA there as well as in the
review's first line. Both lanes in this batch omitted it; it reads as a
batch-level (orchestrator) item, not this lane's, and I have not created one.

### Brain-note reconciliation (the brief's item (f))

`docs/brain/Audits/Audit - 2026-09-13 CI Green.md` exists on **both** lane
branches with the same path and title and genuinely different bodies. They are
not versions of one note; they are two lanes' content under one filename.

- **This lane's version** (58 lines, `sources:` = the ci-concurrency lane
  report + `ci.yml`, `security.yml`, `release.yml`, `ci-gates-intact.test.ts`,
  `LANE_STANDARD.md`): a one-paragraph directory header, then the concurrency
  incident (the three parallel runs and their ids), the fix and the main
  exclusion, the release.yml skip, the "what it did not do" paragraph on
  `paths-ignore`, and the 4/34 → 34/34 proof. Links `[[Patterns]]`.
- **`lane/voice-bound-ci-derivation`'s version** (`sources:` = the voice-bound
  lane report, `server/lib/validation.ts`,
  `tests/fixtures/voice-bound-derivation.json`, `LANE_STANDARD.md`): a fuller
  directory header (names the `*-lane-report.md` / `*-review.md` convention and
  §7), then `MAX_FOUNTAIN_VOICE_ELIGIBLE_WEIGHT` failing on the runner, the
  second bound `MAX_FOUNTAIN_VOICE_ELIGIBLE_DISTINCT`, and what the measurement
  could not establish. Links `[[Gate - Fountain Shape Guard]]`,
  `[[Decision 7 - Per-Analysis Wall-Clock Budget]]`,
  `[[Audit - 2026-09-12 Adversarial Review]]`, `[[Patterns]]`.

At merge this is a union, not a pick: keep the voice-bound header paragraph (it
is the better directory description), keep both lanes' body sections under their
own subheadings, and union both `sources:` lists and both `Related:` link sets —
then re-run `npm run brain` so `GRAPH.md`/`brain.graph.json` pick up the extra
links (this lane's export currently records only the one `[[Patterns]]` edge).

## 4. What a stronger version would have done

Two things, one in scope and one not. **In scope:** make the main claim true
rather than nearly true — appending the SHA to main's group key (Finding 1)
costs one expression, removes the pending-run cancellation entirely, and would
have let all four "never cancelled" sentences stand as written instead of
needing four prose repairs; and make the guard read values instead of text
(Findings 2 and 4), which is two lines and is what stops M5/M6 being green. The
lane's own header for the helper says it exists so a job-level block is not
mistaken for a workflow-level one — that reasoning argues for parsing, and
there is no YAML dependency in `package.json`, but "first `concurrency:` at
column 0, comments stripped, asserted unique" gets all of it without one.
**Out of scope, worth recording:** `ci.yml` fires on both `push: ["**"]` and
`pull_request: ["**"]`, so any branch with an open PR still gets two runs per
push in two different groups — the ref-keyed group cannot collapse them. The
idiom that does is `group: ${{ github.workflow }}-${{ github.head_ref ||
github.ref_name }}` (a PR's `head_ref` and a push's `ref_name` are the same
string), with the cancel condition left on `github.ref`. That is a bigger
behavioural change than this brief asked for and should not be smuggled in
here, but it is the larger half of the duplication. On the brief's check (c):
"group without `cancel-in-progress`" is genuinely the stronger shape for
`release.yml` — two `workflow_dispatch` runs of the same ref would otherwise
race two `docker push`es at one registry tag, which is the very hazard the skip
is justified by, and queueing cannot truncate a push. The lane names exactly
this option in the file and defers it; that is a defensible scope call, and a
tag push and a dispatch run land on different refs anyway, so a ref-keyed group
would not serialize the double-trigger case the brief asks about. Left as the
lane left it.

## VERDICT: REVISE

The mechanism is right, the skips are reasoned, the guard was shown red before
green and reproduces exactly. What sends it back is that three of the standard's
own named shortcuts are present: copy that overclaims, a guard that can pass on
the defect, and a committed SHA that does not resolve.

1. **Finding 1 (must).** Either give main its own group per SHA, or repair the
   four absolute sentences (`ci.yml:18`, `security.yml:31-34` — especially "a
   scheduled advisory sweep is never cancelled either", the brain note, and
   `LANE_STANDARD.md:107-108`) so they claim only what
   `cancel-in-progress: false` gives: a *running* main job is never cancelled;
   a pending one can be dropped by a newer queued run.
2. **Finding 2 (must).** Skip comment lines in `topLevelConcurrencyBlock()` so
   M6 — `cancel-in-progress: true` under a commented-out correct line — goes
   red. Add M6 itself as a unit case if it is cheap.
3. **Finding 9 (must).** One commit pointing the lane report's Tip line at the
   pushed SHA `d48b39f4`; `1eed4dcf` is unreachable and will not survive a
   sandbox rebuild.
4. **Findings 6 and 7 (should, two edits).** Move the no-`paths-ignore` comment
   where a `paths-ignore` edit actually passes it (above or inside `on:`), and
   drop `check-docs` from the list of docs checks that can fail the job — it is
   `continue-on-error: true`.
5. **Findings 3, 4 and 8 (nice, all one-liners).** Allow an optional quote in
   both regexes; assert exactly one top-level `concurrency:` line; add the
   half-clause to LANE_STANDARD §7 item 1 about citing the last push's run id.

Finding 5 and the missing batch README are for the orchestrator at merge, not
for this lane. Re-check on the new diff will be by the same reviewer against
these five items only.

---

# Round 2 (`a343e034`)

Re-checked object: `lane/ci-concurrency` tip **`a343e034`**
(`a343e03493ee74d5ad49b0b83d9d60b626be3033`), three
commits on the round-1 object `d48b39f4`: `8507e1e3` (items 1-6), `bfcaac44`
(item 7), `a343e034` (Tip line). Same reviewer, warm context, re-checking only
its own five items plus the lane's self-added item 7. Round-2 diff:
`git diff d48b39f4..a343e034`. Worktree still held read-only; every mutation
below ran against a fresh copy of `.github/workflows/`,
`tests/core/ci-gates-intact.test.ts` and `package.json` under
`<session scratch>/cireview/`.

## Reproduced numbers (round 2)

| What | Result |
|---|---|
| `node --experimental-strip-types tests/core/ci-gates-intact.test.ts` | **46 tests / 46 pass / 0 fail** [claimed 46/46 — matches] |
| `node --experimental-strip-types tests/scripts/tap-failures.test.ts` | **8 tests / 8 pass / 0 fail** [claimed 8/8 — matches] |
| `node scripts/tap-failures.mjs <synthetic 2-failure TAP>` | both failures printed with `location:` and `error:` (block scalar joined to one line, inline error verbatim), **exit 0** |
| `node scripts/tap-failures.mjs <missing file>` | one explanatory line, **exit 0** — the `if: always()` step cannot itself fail a job |

## Mutation matrix (round 2)

Each is one edit to the copied tree; `R#` continues round 1's numbering.

| # | Mutation | Expected | Test |
|---|---|---|---|
| R1 | round-1 M6 replayed: `cancel-in-progress: true` under a commented-out correct line | red | **45/46, red on exactly `ci.yml cancels superseded runs everywhere EXCEPT main`** ✓ |
| R2 | round-1 M5 replayed: a second top-level `concurrency:` block later in the file | red | **45/46, red on `ci.yml declares exactly one top-level concurrency group`** ✓ |
| R3 | round-1 M2 replayed: both values double-quoted | green | **46/46** ✓ (optional-quote group now accepted) |
| R5 | the `github.sha` suffix deleted from the group key | red | **45/46, red on `…keyed on the workflow, ref, and (main-only) sha`** ✓ |
| R6 | a synthetic `calibrate-voice-bound.yml` with no group dropped into `.github/workflows/` | red | **45/46, red on `every .github/workflows/*.yml file has a top-level … concurrency group`** ✓ |
| R7b | `if: always()` removed from "Print test failure summary" | red | **45/46, red on that step's assertion** ✓ |
| **R8** | the LIVE `set -o pipefail` line deleted from **both** `ci.yml` and `release.yml` | red | **46/46 — GREEN.** See Finding 10 |

Round 1's M4 (flow-mapping form) still false-fails; the lane documents it as an
accepted safe-direction limitation and I agree — a false fail costs a reader one
minute, a false pass costs a gate.

## Per-item verdicts

**Item 1 — group key and the four prose sites. CLOSED.** The key is
`${{ github.workflow }}-${{ github.ref }}-${{ github.ref == 'refs/heads/main' && github.sha || '' }}`.
Checked the expression by hand in both directions: on `refs/heads/main`,
`true && sha` yields the sha and `sha || ''` keeps it, so every main commit
lands in a group no other run can enter — nothing cancelled, nothing dropped
while pending; on any other ref, `false && sha` is `false` and `false || ''` is
`''`, so the group is the old key plus a trailing hyphen — constant per ref,
which is exactly what branch cancellation needs, and no two refs can collide
because the full ref is still in the key. R5 proves the guard sees the suffix
disappear. All four prose sites are rewritten and now claim only what the
mechanism delivers. `security.yml` goes further than asked and names the one
residual the suffix cannot remove — a `schedule` run firing at the same SHA a
push run is already testing shares that group — and bounds it correctly (both
runs would audit an identical tree, so the loss is a duplicate, not coverage).
That is the right way to record a residual.

**Item 2 — comment-blind block. CLOSED.** `topLevelConcurrencyBlock()` now
drops comment lines from both the opening-line search and the body, and R1 goes
red. The added synthetic regression test is self-contained — it builds its own
shadowed fixture rather than depending on the real file's state, so it stays a
guard after the real file changes. Good shape.

**Item 3 — the unreachable Tip. CLOSED.** The round-1 Tip now reads
`d48b39f4…`, with the old `1eed4dcf` retained as narrative ("originally stood
here"), which is the right way to correct a record rather than erase it. The
round-2 Tip names `bfcaac44`, which is reachable and pushed — it is the last
substantive commit rather than the branch tip `a343e034`, but the defect I
raised was unresolvability, not tip-identity, and the line says exactly which
commit it means and why.

**Item 4 — comment placement and `check-docs`. CLOSED.** The no-`paths-ignore`
comment is now immediately above `on:` with one-line pointers inside both the
`push:` and `pull_request:` blocks, so the edit that would add a `paths-ignore`
passes a pointer at the line it would be typed on. `check-docs` is not only
dropped from the list of docs checks that can fail the job — it is explicitly
excluded by name with its reason, which is better than removal.

**Item 5 — quotes, key count, LANE_STANDARD clause. CLOSED.** R3 and R2 above;
the §7 half-clause is present and accurate ("a report that cites its own
branch's CI run id must cite the run for the LAST push").

**Item 6 — derived workflow list. CLOSED, and stronger than I asked for.** The
list comes from `readdirSync('.github/workflows')` with an explicit
`ALLOWED_NO_TOP_LEVEL_GROUP` carrying a written reason per entry, so a new
workflow fails by default (R6 confirms it on a synthetic
`calibrate-voice-bound.yml`). Two supporting tests keep the allowlist's stated
reasons true rather than merely stated — `edge.yml` must keep its job-level
`{group: edge-image, cancel-in-progress: true}`, and `release.yml` must keep
its in-file explanation. An allowlist whose reasons are themselves asserted is
the right answer to "an allowlist is a place to hide things".

**Item 7 (the lane's own addition) — job-log-safe failure summary. ACCEPTED,
with one cannot-fail (Finding 10).** The mechanism is right and I verified the
parts the coordinator asked about:

- `set -o pipefail` and the pipe are in the **same shell** — one `run: |`
  block is one script, and the two lines are consecutive in it.
- `shell:` is not set, and does not need to be: both `test` jobs are
  `runs-on: ubuntu-latest` with no `container:`, where the default `run` shell
  is `bash -e {0}`, which has `pipefail`. (Only a container image without bash
  would fall back to `sh`, where `set -o pipefail` is not guaranteed; an
  explicit `shell: bash` would make that impossible to regress into, and costs
  one line.)
- The stream really is TAP: `npm test` is `scripts/run-tests.mjs`, which
  `spawnSync`s `node --test … ` with `stdio: 'inherit'`, so under `| tee`
  stdout is a pipe, not a TTY, and node:test's reporter defaults to `tap`. It
  also sets `process.exitCode` from the child's status, so with `pipefail` the
  step's exit code is the suite's.
- `tap-failures.mjs` drove correctly on a synthetic two-failure TAP (both
  `not ok` blocks, `location` and `error` each), exit 0, and degrades to one
  line and exit 0 on a missing file — so the `if: always()` step can never
  convert a green job to red on its own.

### Finding 10 — MODERATE (round 1's Finding 2, reintroduced in the new item-7 assertions)

R8: deleting the live `set -o pipefail` line from **both** workflows leaves the
suite at **46/46 green**. The assertion is
`assert.match(stepBlock(src, 'Run tests …'), /set -o pipefail/)`, and
`stepBlock()` — unlike `topLevelConcurrencyBlock()`, which this round taught to
skip comments — still collects comment lines. The comment the lane wrote
directly above the `run:` block opens with the words "`set -o pipefail` is
explicit rather than assumed", so the regex matches the explanation of the line
instead of the line. Verified with a YAML parser that the mutated step's real
body is `'npm test 2>&1 | tee test-output.tap\n'` — no pipefail, a failing
`npm test` would report `tee`'s exit code 0, and a red run would be reported
green. That is precisely the failure item 7 exists to prevent, and it is the
one thing its guard cannot see. (Removing the line from ci.yml alone is caught,
but only incidentally, by the pre-existing "mirrored gate steps run the SAME
commands" check — which is why deleting it from both files is the mutation that
matters.)

The same one-line fix already applied to the other helper closes it. I ran it:
adding `if (line.trim().startsWith('#')) continue;` to `stepBlock()`'s loop
keeps the unmutated tree at **46/46** and turns R8 into **44/46, red on exactly
`ci.yml's "Run tests" step preserves its exit code through the tee (pipefail)`
and its `release.yml` twin**. No other assertion changes state — the file's
other block-scoped checks are `assert.doesNotMatch`, for which stripping
comments is strictly safer.

### Low notes (not blocking, no re-check needed)

- `test-output.tap` is not in `.gitignore`. CI creates it in the workspace, and
  anyone reproducing the CI invocation locally gets an untracked file a
  `git add -A` would sweep in. One line.
- `tap-failures.mjs`'s script-mode guard is
  a comparison of `import.meta.url` against a `file://` URL built from
  `process.argv[1]`, which is fine for the
  runner's path but is not URL-encoding-safe in general.

## VERDICT: REVISE

Six of the six round-1 items are closed, and four of them are closed more
thoroughly than the list asked (the sha-suffixed group rather than repaired
prose; a self-contained regression fixture rather than a fixed file; an
allowlist whose reasons are themselves asserted). Item 7 was found and fixed by
the lane without being asked, and the mechanism is correct as shipped. What
sends it back is one line, and it is the same defect as round 1's Finding 2
one helper over:

1. **Finding 10 (must).** Make `stepBlock()` skip comment lines (one line, in
   the loop, verified above: 46/46 unmutated, red on R8). The live
   `set -o pipefail` can currently be deleted from both workflows with the
   suite green, which turns a red `npm test` into a green step — the exact
   regression item 7 exists to prevent. A synthetic regression case for it, in
   the shape of the one added for the M6 finding, would be welcome but is not
   required.

Optional, no re-check: `shell: bash` on the two "Run tests" steps; a
`.gitignore` line for `test-output.tap`.

Round-3 re-check is this one assertion only.

---

# Round 3 (`c35fd757`)

Re-checked object: `lane/ci-concurrency` tip **`c35fd757`**, two commits on the
round-2 object `a343e034`: `f0cf763c` (Finding 10 and both optional notes),
`c35fd757` (Tip line). Same reviewer, one item. Mutation run once against a
fresh copy of the tree under `<session scratch>/cireview/`; worktree read-only.

**Finding 10 — CLOSED.** `stepBlock()` now skips comment lines, placed before
the dedent check so a comment can neither enter the block text nor end it
early. Reproduced both of the lane's numbers exactly:

| What | Result |
|---|---|
| `tests/core/ci-gates-intact.test.ts`, unmutated | **47 tests / 47 pass / 0 fail** [claimed 47/47 — matches] |
| Live `set -o pipefail` deleted from **both** `ci.yml` and `release.yml` | **45 pass / 2 fail**, red on exactly `ci.yml's "Run tests" step preserves its exit code through the tee (pipefail)` and its `release.yml` twin [claimed 45/47 on exactly those two — matches] |

A YAML parser confirms the mutated step's live body is
`'npm test 2>&1 | tee test-output.tap\n'` — the comment explaining the deleted
line is still present and no longer satisfies the regex, which was the whole
finding. `tests/scripts/tap-failures.test.ts` 8/8 and `brain-coverage` 7/7
unchanged. The added regression case is self-contained (it builds its own
fixture rather than depending on the real files' wording), so it survives a
future rewording of those comments.

Checked the one risk the new `continue` introduces: skipping comments before
the dedent test means a comment no longer ends a block, so a step could in
principle over-collect past its own end. It cannot here — a block still ends at
the first NON-comment line at or shallower than the step's indent, and in a
workflow the line after a step's trailing comments is always a real sibling
`- name:` or a dedented job key. The suite's own mirror checks (which compare
whole run bodies between `ci.yml` and `release.yml`) stay green, which is the
evidence that nothing over-collected.

Both optional notes taken, and the first taken more thoroughly than suggested:
`shell: bash` is pinned on both "Run tests" steps with the reason (the runner
default is a property of the runner and would become `sh` inside a bash-less
container), and `.gitignore:112` now carries `test-output.tap`
(`git check-ignore -v` confirms). Worth recording that the pin makes the script's
own `set -o pipefail` redundant on a real runner — GitHub's explicit
`shell: bash` is `bash --noprofile --norc -eo pipefail {0}`, pipefail already
set — so the two are belt and braces, as the comment says, not one mechanism
mistaken for two.

## VERDICT: MERGE

All six round-1 items, the lane's self-added item 7, and round 2's Finding 10
are closed, each shown red on its own mutation before green. No open items.
Two things for the orchestrator at merge, neither the lane's to fix: reconcile
the two `docs/brain/Audits/Audit - 2026-09-13 CI Green.md` notes as a union
(round-1 section, "Brain-note reconciliation") and re-run `npm run brain`
afterwards; and `calibrate-voice-bound.yml`, arriving from
`lane/voice-bound-ci-derivation`, now has a test that will fail on it by
default — whichever lane merges second adds its group or its allowlist row
with a reason (round-1 Finding 5).
