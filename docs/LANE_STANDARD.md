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

`npm run lint` · full `npm test` (0 failures) · `check-no-console` ·
`check-server-reachability` · `build` · `check-docs` · `honesty-audit` ·
`check-scoring-receipt main..HEAD` · the browser battery when `src/` or
`server/` changed (`PW_CHROMIUM_PATH=/opt/pw-browsers/chromium npm run
verify:browser`) · `test:metamorphic` and the output-identity harness when
scoring-adjacent. Every wait in a browser suite goes through `timing.ms()`.
Rebase onto `main` before the final run; re-run lint and the full suite after.

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
   least one of the report's numbers;
3. looks for the shortcut: a copied implementation, a widened tolerance, a
   surface left out, a test that cannot fail, copy that overclaims;
4. names what a stronger version would have done, and whether it is in scope;
5. returns MERGE, or REVISE with a numbered list the lane can act on.

The orchestrator merges only on MERGE. On REVISE the lane agent gets the list
and the reviewer re-reads the revision. The review verdict is recorded with
the merge.
