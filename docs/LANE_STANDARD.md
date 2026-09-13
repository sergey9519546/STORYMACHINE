# Lane standard — what "the best version of the work" means here

Every change to this repository that is built by a delegated lane (an agent
working in an isolated worktree) is held to this standard twice: once by the
lane itself before it reports, and once by an independent reviewer before the
orchestrator merges. A lane that meets the gates but not this standard is sent
back with the specific revisions, not merged.

## 1. Understand before building

- Read the feature end to end before editing: data model, every call site,
  every surface that shows the same number, the tests that already pin it.
- State in the report what the thing IS (one paragraph), including anything
  the brief got wrong. A brief's premise is a hypothesis, not a fact.
- Find the existing implementation before writing one. One implementation per
  concept; a second copy of a regex, a sort, a formatter, or a threshold is a
  defect, not a convenience.

## 2. Build the strongest version, not the quickest

- The change works for a writer using it, in a real browser, in both themes,
  at 375px and desktop, by keyboard — not only in a unit test.
- Every surface that shows a number shows the same number, from the same
  source (panel, exported HTML, letter, trend, verify, slate, fix receipt).
- Edge cases are handled where they occur, not documented as known: the empty
  state, the unscored state, the concurrent request, the non-ASCII name, the
  request that arrives during boot.
- Nothing is removed or simplified away. A half-done feature is finished and
  wired into everything that should know about it, or the reason it cannot be
  is written down with file and line evidence.
- Copy tells the truth: a sentence that promises something ("rank appears
  after your next save") must be true in every state that renders it.

## 3. Prove it, do not assert it

- Measure before and after with the same harness, and put the numbers in the
  report. A latency, a count, a size, or a contrast ratio quoted without the
  command that produced it does not count.
- A guard or gate must be shown to FAIL on the unfixed input before it is
  shown to pass on the fixed one. A test that could not have caught the bug
  proves nothing.
- Tests cover both directions (fires / does not fire; present / absent) and
  every route or surface touched, not one representative.
- Scoring-path files are never touched without a receipt; anything reachable
  from `doctor.ts` or `src/lib/fountain.ts` is scoring-path
  (`node scripts/check-scoring-receipt.mjs main..HEAD` decides).

## 4. Gates, in the foreground, with exit codes

The lane runs: the tests for every file it touched · `npm run lint` ·
`check-no-console` · `check-server-reachability` · `build` · `check-docs` ·
`honesty-audit` · `check-scoring-receipt main..HEAD` · the browser suite(s)
that drive the surfaces it changed · `test:metamorphic` and the
output-identity harness when scoring-adjacent · and the full `npm test`
ONCE, on the final rebased tree. Every wait in a browser suite goes through
`timing.ms()`.

Before claiming green, run `npm run test:ci-env` (full suite, or pass the
specific file paths the lane touched to check just those) — it replicates
the GitHub Actions push-to-main runner's environment
(`GITHUB_EVENT_NAME`/`GITHUB_SHA`/`GITHUB_EVENT_PATH` always set, plus the
"Run tests" step's own `RUN_E2E`/`GIT_SHA`) and runs the suite under it.
2026-09-13: 14,000 tests green on the sandbox three times in a row, and RED
on the runner on two files, every push since CI resumed — both were a test
(or the script it drove) building a child process's env with
`{ ...process.env, ... }` or a bare `execFileSync` with no `env`, so it
silently inherited the runner's ambient state into a throwaway repo or a
self-check meant to see a clean environment. Neither leak could reproduce on
a sandbox whose own `process.env` never carries `GITHUB_*`/`RUN_E2E` in the
first place, so "green here" proved nothing about the runner — see
`docs/audits/2026-09-13-ci-green/ci-env-lane-report.md`, and audit any new
child-process spawn in a test the same way: does it build its env from
scratch, or does it spread the ambient one and hope nothing in it matters?

The orchestrator runs the full `npm test` and the whole eight-suite battery
once per merge, on the rebased branch. Repeating either inside a revision
round, or inside a review, costs more than it catches: a revision re-runs
only what it touched, and a reviewer reproduces one reported number and
drives the surface rather than re-running the battery.

## 5. The report

Worktree, branch, `git log --oneline main..HEAD`; the model from §1; the
before/after numbers from §3; every gate's exit code; what was left undone and
why. A report that says "done" for an item that was narrowed, skipped, or
widened (a loosened tolerance, a dropped surface, a smaller threshold) is a
false report.

## 6. Independent review before merge

A reviewer who did not build the change reads the brief and the diff, then:

1. checks every numbered item of the brief against the diff — done, narrowed,
   skipped, or silently changed;
2. drives the change as a writer would (browser or route) and reproduces at
   least one of the report's numbers — one number, driven, not the whole
   battery re-run;
3. looks for the shortcut: a copied implementation, a widened tolerance, a
   surface left out, a test that cannot fail, copy that overclaims;
4. names what a stronger version would have done, and whether it is in scope;
5. returns MERGE, or REVISE with a numbered list the lane can act on.

The orchestrator merges only on MERGE. On REVISE the lane agent gets the list
and the SAME reviewer re-checks its own items against the new diff (a few
tool calls with warm context, not a fresh read). Before a reviewed lane is rebased for merge, the
orchestrator tags the commit each review round examined
(`git tag audit/<date>/<lane>-round<N> <sha>`) so the reviewed object stays
resolvable after the rebase rewrites it; the 2026-09-05 batch did not, and
21 of its cited round commits are unreachable. The review verdict is
recorded with the merge. Concurrency is capped at three live agents (lanes
plus reviewers) so that one failed suite under load is not everyone's.

## 7. Nothing durable lives only in the sandbox

The sandbox is rebuilt without warning: on 2026-09-07 a rebuild erased every
worktree, the session's scratch directory, every local `audit/*` tag, and a
reviewed-MERGE lane whose two commits had never been pushed. The rules that
follow from that, each already cheap:

1. A lane works on a named branch `lane/<name>` created from the current
   main, and runs `git push -u origin lane/<name>` after EVERY commit. A
   commit that exists only in a worktree is not work that exists. The
   orchestrator still merges only `--ff-only` and only on MERGE; the
   branch is deleted from origin after the merge. Since 2026-09-13
   `.github/workflows/ci.yml` and `security.yml` carry a `concurrency` group
   keyed on the ref that cancels a branch's own superseded run — main is
   isolated into its own group per commit (a `github.sha` suffix), never
   sharing a group with any other run, so nothing about main can be
   cancelled or dropped — so pushing after every commit costs one CI run in
   flight per branch, not one run per commit left running to completion. One
   consequence: a report that cites its own branch's CI run id must cite the
   run for the LAST push, not an earlier one — an earlier push's run on the
   same branch is exactly the one the next push's run cancels.
2. A reviewer writes its review INTO the repository —
   `docs/audits/<date>-<batch>/<lane>-review.md`, scratch paths replaced by
   `<session scratch>` — before returning its verdict, and the orchestrator
   commits it with the merge. Scratch-only reviews are what the 2026-09-07
   batch lost: five lanes, nine rounds, two discovery reports.
3. Audit tags cannot be pushed from the sandbox (the proxy refuses tag
   pushes), so the reviewed SHA is written into the review's first line and
   into the audit README as well as tagged; the tag is a convenience, the
   pushed lane branch is the record.
4. Anything the orchestrator drafts for a session record or a README is
   drafted in the repository (uncommitted is fine; committed is better),
   not in scratch.
