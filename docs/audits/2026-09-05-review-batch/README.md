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
2026-09-05, after-the-fact audit; corrected 2026-09-05, same day, after an
independent reviewer caught the correction's own over-claim).** Each review
file names the specific commit its round examined — e.g. `guard-review.md`'s
"commit a0667ab3", `readiness-review.md`'s "commit 91b8dc73",
`timing-review.md`'s "commit cc68cf7d". Those per-round SHAs are USUALLY
lane-worktree commits from before each lane was rebased onto main for its
merge: rebasing normally rewrites commit hashes, so the exact object a
mid-round review looked at does not survive the rebase that landed it.

**This is not universally true, and the first version of this note wrongly
said "none is reachable" without checking every cited SHA.** Verified
directly against this repo (`git cat-file -e <sha>` for existence, `git
merge-base --is-ancestor <sha> 802f1c16` for reachability from the current
tip — every SHA below cross-checked against the actual commit list, not
sampled):

- **21 of the cited round SHAs are genuinely unreachable** — exist as loose
  objects right now but are ancestors of no branch or ref, will not survive
  `git gc --prune=now`, and are already absent from a fresh clone of the
  remote: `4671c543`, `321e95ba`, `ba4cf424` (fixverify-review.md);
  `38f47648`, `a0667ab3`, `cc405ccb`, `9f171a5c` (guard-review.md);
  `8eef1375`, `4cf4d0b1`, `91f6e7f8` (rank-review.md); `91b8dc73`,
  `934cf84e`, `7511733f` (readiness-review.md); `cc68cf7d`, `a15d7e32`,
  `c11dd263` (timing-review.md); `aa45951e`, `842f0fcc`, `c2eb1606`,
  `41c40ddf`, `5c53a390` (xsurface-review.md). A re-verifier who tries
  `git show` on any of these should expect "fatal: bad object", not a bug in
  their checkout.
- **3 cited SHAs are, in fact, reachable — the exceptions the first version
  missed:** `5dffc831` and `3d13383c` (`rank-review.md:328`, the "Re-review
  — rebase" round) ARE ancestors of `58eaafbf` (that lane's own final merge
  SHA, already in the table above) — for this one lane specifically, the
  rebase workflow carried the intermediate round commits forward intact
  rather than squashing them away, unlike the other five lanes. And
  `guard-review.md:836`'s "Re-review #4 — commit `5d2b2638`" is not a
  separate pre-rebase intermediate commit at all: `5d2b2638` IS the shape
  guard lane's own final merge SHA, already durable and already in the
  table — that round's citation simply names the commit that round became,
  not a squashed-away predecessor of it.

So the correct statement is narrower than "only the six merge SHAs are
durable": **every round-commit citation across the six files is durable
EXCEPT the 21 listed above**, and a re-verifier should check reachability
per-SHA (`git merge-base --is-ancestor <sha> <current main>`) rather than
assuming every non-final-merge citation is a dead pre-rebase object.

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
