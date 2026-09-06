---
type: branch
updated: 2026-09-06
sources: [docs/p1-benchmark/MEASUREMENT_RECEIPTS.md, docs/p1-benchmark/BLIND_PAIRS_ON_BRANCHES_2026-09-04.md]
status: pending-measurement
---

# Branch — Stacked (R5 + Advice-Rule-Fixes)

**Branch:** `origin/scoring/stacked-r5-plus-advice` @ `65e76888`
(16 commits ahead of `main` @ `2bfcbf9d`, including two merges that take each
contributing branch's round-1 review corrections).

**What it is:** [[Branch - R5 Verbosity Bias]] with
[[Branch - Advice Rule Fixes]] merged into it by `git merge --no-ff`, both
first rebased onto the same `main`. It exists because the owner's SECOND
`npm run measure-real` needs a tree that builds, and until 2026-09-06 no such
tree did.

**The five-file conflict is gone, and it was never a disagreement.**
[[Measurement - BLIND_PAIRS_ON_BRANCHES_2026-09-04]] recorded that stacking
conflicted on `character-arc.ts`, `rhythm.ts`, `fountain.ts`,
`agency-signal.test.ts` and the receipts ledger. R5 touches none of those
four code files. The conflicts came from the two branches' merge-bases
sitting 74 commits apart, so a rebase or cherry-pick had to replay `main`'s
own history across the gap. With both branches rebased onto `2bfcbf9d` the
merge conflicts on the receipts ledger and the regenerated brain graph only —
no code file conflicts at all.

**Gates, on the merged tree, each run in the foreground:** `npm run lint` 0 ·
`npm test` 0 (12,967 tests, 0 failing, 91 skipped) · `npm run build` 0 ·
`npm run test:metamorphic` 0 (8 of 8 hard, `empty_verbosity` at −4.5) ·
`check-no-console` 0 · `check-docs` 0 · `honesty-audit` 0 ·
`check-server-reachability` 0 · `check-brain` 0.
`check-scoring-receipt.mjs main..HEAD` exits **1**, correctly: it finds three
PENDING entries and refuses them, which is what [[Gate - Receipt Gate]] is
for.

**What the stack measurably does, on in-repo fixtures only:** all 45
output-identity reports move (health RMS 19.02, 27 verdict changes); blind
matched pairs go to **4 of 6** ordered, mean gap +2.02, against `main`'s 1 of
6 and −0.02, with no script left pinned at the shared 76.0. R5 alone orders
3 of 6 and the advice branch alone 1 of 6. Read that with its mechanism: R5
removes a saturating clamp and exposes the raw weighted-issue ordering, which
is close to a coin flip on this corpus, so 4 of 6 on six pairs is inside what
chance produces.

**The one assertion the stack re-anchors:**
`tests/core/advice-rule-fixes.test.ts` pinned the advice branch's honest
limit — its matched pair scored 76.0 against 76.0. On the stack that pair
separates 60.4 against 47.1, in the correct direction, with identical
findings on both trees. The assertion was re-anchored per its own
instruction (pinned at 13.3 in both directions, verified to fail on the
advice-alone tree) rather than deleted or widened.

**Why it is parked:** every number above comes from committed fixtures. No
real-corpus run has happened; see [[Gate - Receipt Gate]] and
[[Owner - R5 Measurement and Merge]] for the owner's step.

## Sources

- `docs/p1-benchmark/MEASUREMENT_RECEIPTS.md` — the 2026-09-06 STACKED TREE entry
- `docs/scoring/ADVICE_RULE_FIXES_2026-09-04.md` section 9 (on the branch; not on `main`)
- `docs/p1-benchmark/BLIND_PAIRS_ON_BRANCHES_2026-09-04.md`
