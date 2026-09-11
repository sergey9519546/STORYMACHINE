# Public-benchmark lane — independent review (reconstructed)

*The full review file (three rounds, ~49 KB) was lost in the 2026-09-07 sandbox
rebuild. What follows is the reviewer's verdict text for each round, verbatim
from the session transcript. Reviewed objects: b79759a6 (round 1), 120ffaae
(round 2), 9b199b72 (round 3); base main c16f7e0c. Reviewer: an Opus agent
that did not build the lane; the same reviewer for all three rounds.*

## Round 1 — verdict (verbatim)

**Verdict: REVISE** — seven items. **Every statistic in the report reproduced exactly** on a
scorer I wrote myself: both AUCs, all four bootstrap intervals, both mean gaps, the partition
breakdown, the +5.693/−7.625 decomposition, the `scoring/r5-verbosity-bias` table cell for cell,
and the 32/32 · 28/32 · 0/32 manifest-movement row. The degradations are real, the seeds are
per-script and stable, the split is genuinely sha256-derived, `check-scoring-receipt main..HEAD`
is clean and output identity is 45/45. Nothing is fabricated and nothing overclaims the private
corpus. The revisions are: **one that decides whether this is publishable** (§6.1 — the benchmark
reads chance on both channels and has no control proving it can read anything else; I measured the
control it needs and it works), one where **the more flattering of two computed statistics is the
only one ratcheted** (§6.2), one **self-check that does not check** (§6.3, reproduced), one
**instruction that fails when followed** (§6.4, reproduced), and three doc-accuracy items
(§6.5–§6.7).

## Round 2 — verdict (verbatim)

**Same reviewer.** Object: `120ffaae` on `b79759a6` (tag `audit/2026-09-06/pubbench-round2`),
worktree `agent-a7f50fb5c60746789`, `git diff b79759a6..120ffaae` = 14 files +1239/−318.
**Read-only:** the only command I ran inside the worktree was `check-scoring-receipt` (twice);
`git status --porcelain` was 0 lines before and after. Everything else ran in fresh `git archive`
exports — `tree2/` (`120ffaae`), `lockcopy/` (a throwaway copy for the `--lock` probes), `r5/`,
`adv/` (`a1cf7677`) — with `node_modules` symlinked. Probes: `rev-tree-run3.mjs` (my round-1
scorer extended to three degradations, still my own Mann-Whitney / matched-pair / mulberry32 /
bootstrap), `r2-decomp.ts`, `r2-advmove.mjs`, and `r2-*.log`, `lock0.md5`, `broken.md5`.
**Budget:** no full `npm test` (the lane reports 12,998/0; I did not re-run the battery), no
browser suite, no `measure-real`.

**Verdict: MERGE.** All seven items are addressed, five of them more strongly than I asked, and
**every number in the round-2 report reproduced exactly on my own scorer** — including the three
figures I had not measured (the control on the R5 and advice trees, and the 16.71 post-formula
share). Two non-blocking notes are recorded at §2.9; neither is a revision.

### 2.9 Two notes, neither a revision (verbatim)

1. **`--lock` exits 0 even when it refuses.** The refusal is loud and writes nothing to `auc.ts`,
   but the manifest and split are written *before* `relockFloors()` runs (`benchmark-public.ts:219-224`),
   so a refused run leaves the fixtures re-locked and the floors stale, at exit 0. The consequence
   is CI-visible — the floor tests fail if the score moved down, and the 4× margin guard fires if
   it moved up — and the new shape test makes the trigger condition itself a CI failure. Worth one
   line (`process.exitCode = 1` on refusal) whenever this file is next touched; not worth another
   round.
2. **`npm run gates` now costs 6.3 s** (measured) because the verified row spawns the suite rather
   than stat-ing a file. That is the honest implementation and I would not trade it back, but it
   is a CI-time change that nobody flagged, so it is recorded here.

## Round 3 — verdict (verbatim; object 9b199b72, the two notes built)

**Verdict: MERGE.** All seven round-1 items resolved; every number in the round-2 report
independently reproduced, including the three I had not previously measured (the control on the
R5 and advice trees, and the 16.71 post-formula share); the receipt gate is clean over both
commits, output identity is 45/45, and no sentence anywhere implies the private corpus was
measured. Two non-blocking notes at §2.9 for whenever `scripts/benchmark-public.ts` is next
touched.
