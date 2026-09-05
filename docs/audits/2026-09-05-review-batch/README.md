# Review batch — 2026-09-05

Six lanes built from `docs/audits/2026-09-04-evening-batch/AUDIT.md` were
each reviewed by an independent reviewer under `docs/LANE_STANDARD.md` §6
before merging. Each file here is one reviewer's full record: the first
pass, and every re-review appended below it. Verdict history and the merge
commit for each lane:

| lane | rounds | merged at |
|---|---|---|
| readiness signal, log prefixes | REVISE 6 → REVISE 1 → MERGE (one config item) | f7e5507c |
| timing policy, snapshot dialogs, rho row | REVISE 3 → MERGE | 7f686808 |
| keyless Fix & verify | REVISE 5 → REVISE 1 → merge on report | 6697e88d |
| cross-surface percentile/rank/signals | REVISE 5 → MERGE (+2 nits) | ed87d8a6 |
| draft rank, dark mode, a11y gate | REVISE 7 → MERGE → rebase REVISE 1 | 58eaafbf |
| Fountain shape guard | REVISE 5 → 4 → 1 → 1 → MERGE | 5d2b2638 |

No lane passed on its first pass. The reviewers' probe scripts referenced in
these files lived in session scratch space and are described, not copied;
every finding they produced is pinned by a committed test or fixture on main.

**On the intermediate round commits cited inside the six review files (added
2026-09-05, after-the-fact audit).** Each review file names the specific
commit its round examined — e.g. `guard-review.md`'s "commit a0667ab3",
`readiness-review.md`'s "commit 91b8dc73", `timing-review.md`'s "commit
cc68cf7d". Those per-round SHAs are lane-worktree commits from before each
lane was rebased onto main for its merge: rebasing rewrites commit hashes,
so the exact object a mid-round review looked at does not survive the
rebase that landed it. Checked directly against this repo: all such SHAs
still exist as loose objects right now (`git cat-file -e <sha>` succeeds),
but **none is reachable from any branch or ref** (`git branch --all
--contains <sha>` returns nothing, and none appears in `git log --all`) —
they will not survive a `git gc --prune=now` and are already absent from a
fresh clone of the remote. State that plainly: **only the six merge SHAs in
the table above are durable.** A re-verifier who tries `git show <a
round-commit SHA>` from those files should expect "fatal: bad object", not
a bug in their checkout.

The findings themselves are not lost — each review's described diff for a
lane is fully contained in that lane's own merge commit(s) below, which
*are* durable and is what the table above already names:

- **readiness signal, log prefixes** — `f7e5507c`
- **timing policy, snapshot dialogs, rho row** — `7f686808` (one round's
  intermediate SHA, `cc68cf7d` in `timing-review.md`, is a content-identical
  pre-rebase copy of `0da8fb05`, which IS an ancestor of `7f686808`/main —
  same author timestamp and commit message — so that specific round's fix is
  independently addressable by `0da8fb05` even though `cc68cf7d` itself is
  not)
- **keyless Fix & verify** — `6697e88d`
- **cross-surface percentile/rank/signals** — `ed87d8a6`
- **draft rank, dark mode, a11y gate** — `58eaafbf`
- **Fountain shape guard** — `5d2b2638`

A future review batch that wants per-round commits to stay independently
resolvable should tag them (`git tag audit/<date>/<lane>-round<N> <sha>` and
push the tag) before rebasing the lane's working branch away — this batch
did not, so its intermediate rounds are traceable only through the prose in
each review file, not through `git show`.
