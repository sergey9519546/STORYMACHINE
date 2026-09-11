# Innovation batch — 2026-09-06/07 (reconstructed record)

The owner asked for the project to be *pushed forward* — what needs building,
what needs improving — without steering away from what STORYMACHINE is. Two
read-only discoveries chose the direction; five build lanes followed, each
through `docs/LANE_STANDARD.md` §6's independent review.

**What this directory is, and is not.** On 2026-09-07 the sandbox was rebuilt
after a usage-limit stop. The rebuild erased every worktree, the session's
scratch directory (where every review and both discovery reports were
written), every local `audit/2026-09-07/*` tag, and the exports lane's two
commits (80824d48, 0ad69536 — reviewed MERGE, never pushed). What survives
is what had already been pushed to `origin` and what the reviewers and lanes
said in their final messages to the orchestrator, which live in the session
transcript. Every `*-review.md` here that is marked *reconstructed* contains
those final messages **verbatim** and nothing else — no review has been
re-imagined, and the numbers in them are the reviewers' own, not re-derived.
`docs/LANE_STANDARD.md` §7 is the rule that follows: reviews are committed
into the repository before the merge, and lanes push after every commit.

| lane | rounds | reviewed objects | landed at |
|---|---|---|---|
| public benchmark (P1 instrument) | REVISE 7 → MERGE (+2 notes) → MERGE | b79759a6 · 120ffaae · 9b199b72 | 685349f4, ecfd0f0c, 9b199b72 (main) |
| `npm run verify-report` (P3 closed) | REVISE 5 → MERGE (+1 built) | 16bfec58 · 42206178 | 42206178, 81ec1652 (main) |
| feature-length loop (P2/P0) | REVISE 2 (+6 non-blocking, all built) → MERGE | bff55e39 · dd57251d | dd57251d (main) |
| producer's exports (P3) | REVISE 8 → MERGE (+4 follow-ups) → **objects lost**; rebuilt on `lane/exports-producer-tier` and re-reviewed (see `exports-review.md`) | 80824d48 · 0ad69536 (unreachable) | see `exports-review.md` |
| scoring: feature-length defects (P1, owner-gated) | reviewed after the rebuild (`scoring-review.md`) | 4643d590 on `scoring/feature-length-defects` | never merged here; the owner's `measure-real` decides |

Full review files survive for none of the first four rounds' lanes; the
surviving review of record for the scoring branch is complete (it was written
after the rebuild, into this directory).

What the reviews caught that the lanes' own gates had passed: a benchmark
that read chance on both channels and had no control proving it could read
anything (a positive control was added and reads 1.000); the more flattering
of two statistics being the only one ratcheted; `--lock` exiting 0 on a
refusal; a verifier printing `VERIFIED` at exit 0 on a forged report in two
of three shapes (`NaN` compares unequal to nothing; an edited headline beside
a genuine verify block); a "fail-first" browser step that was not
deterministic; a shape-guard threshold lowered under 75 pre-existing rows; a
stage direction quoted as a character's "turn"; a percentile predicate that
was asymmetric on its two inputs; a hand-written percentile sentence stating
an ordinal beside a tier stating a band.

What only the owner can do, unchanged: `measure-real` on
`scoring/stacked-r5-plus-advice` and then on `scoring/feature-length-defects`
(the two are alternatives, not a stack — see the scoring review), lock the
AUC-24 table before 2026-10-01, clear the GitHub Actions account block,
decide the licence (Decision #6) and the repository visibility, verify the
Node 24 base image with a Docker daemon. The `audit/2026-09-05/*` and
`audit/2026-09-06/*` tags still exist only on the owner's clone if they were
ever fetched; the 2026-09-07 tags were never pushed and no longer exist.
