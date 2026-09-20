---
type: audit
updated: 2026-09-20
sources: [docs/audits/2026-09-20-parked-branches/README.md, docs/UNIFIED_STATE_2026-09-02.md, docs/brain/Owner/Owner - R5 Measurement and Merge.md, docs/brain/Branches/Branch - R5 Verbosity Bias.md, docs/brain/Branches/Branch - Advice Rule Fixes.md, docs/brain/Branches/Branch - Feature-Length Defects.md, docs/brain/Branches/Branch - Feature-Length Saturation Only.md, docs/brain/Branches/Branch - Renderer Residuals.md, docs/brain/Audits/Audit - 2026-09-18 Node 24.md, SESSION_REPORT_2026-09-19.md]
status: active
---

# Audit — 2026-09-20 Parked Branches

**Directory:** `docs/audits/2026-09-20-parked-branches/` — a triage of every
remote branch except `main` and `claude/fable-5-1-orchestrator-yil0xr`
(seventeen branches), answering `SESSION_REPORT_2026-09-19.md` §4 row 8: nine
scoring branches parked PENDING OWNER MEASUREMENT, none merging cleanly, and
nobody with a current map of what each still contains, what has since been
superseded, and what it would take to land each.

## What it answers, per branch group

**Six branches are already resolved, not pending.** `lane/node-24` and
`lane/healthcheck-ipv4` are literal ancestors of the session branch
`26d930dd` (merged via PRs #264/#265) — safe to delete outright. The four
`calibrate/voice-bound-2026-09-13*` branches are a linear stack
(`-13` ⊂ `-13b` ⊂ `-13c` ⊂ `-13d`) whose sole purpose — deriving
`MAX_FOUNTAIN_VOICE_ELIGIBLE_DISTINCT` — landed independently as `e5458290`
on the session branch, confirmed by patch-id comparison (three of the four
branches' feature commits are patch-identical to commits already in
`26d930dd`'s history). Both findings corroborate
[[Owner - R5 Measurement and Merge]]'s and `docs/UNIFIED_STATE_2026-09-02.md`'s
2026-09-19 addendum's existing records rather than contradicting them.

**Two `claude/*-pending-measurement` branches are superseded by their
`scoring/*` renames**, verified at the patch level (not just by the existing
brain notes' own "superseded, not deleted" claim): `claude/advice-rule-fixes-
pending-measurement`'s single commit (`68c64eca`) is file-for-file identical
to [[Branch - Advice Rule Fixes]]'s first commit (`59269669`) except for a
correction later appended to the receipts ledger; `claude/r5-verbosity-bias-
pending-measurement`'s four commits are patch-identical (three exactly, one
near-exactly) to the first four of [[Branch - R5 Verbosity Bias]]'s eight.

**One branch is ABANDON.** `wip/phase-w-ui-checkpoint` (last commit
2026-08-21, its own commits call it "wip" and "in-progress") produces 48
merge-conflict markers across 10 UI files against `26d930dd`, all of which
have since had 50 further commits including a documented React #185
render-loop fix. This corroborates, with a commit count, the correction
already recorded in `docs/UNIFIED_STATE_2026-09-02.md`'s 2026-09-19 addendum
(content superseded, and unsafe to fast-forward-merge — not merely stale).

**One branch is a clean LAND candidate.** [[Branch - Advice Rule Fixes]]
(`scoring/advice-rule-fixes`) merges onto `26d930dd` with conflicts only in
`docs/brain/GRAPH.md` and `docs/p1-benchmark/MEASUREMENT_RECEIPTS.md` — zero
code conflicts, and its six detector fixes are not touched by anything that
has landed since its merge-base. It needs the owner's `npm run owner:measure`
(or manual `npm run measure-real` + receipt fill-in) before the PENDING
receipt entry can convert.

**The rest are REBASE-THEN-LAND or contingent on an existing decision.**
[[Branch - Feature-Length Defects]] and the
adversarial/forced-cue/renderer-residuals chain (three branches, one lane —
[[Branch - Adversarial 2026-09-12]], [[Branch - Forced Cue]],
[[Branch - Renderer Residuals]]) have real code conflicts (mostly
`server/lib/validation.ts`'s voice-eligible-weight bound, re-derived
independently on both sides since their merge-base) and need a human
reconciliation, not a mechanical rebase. [[Branch - R5 Verbosity Bias]],
[[Branch - Stacked R5 plus Advice]], and
[[Branch - Feature-Length Saturation Only]] are contingent on decisions
[[Owner - R5 Measurement and Merge]] already records: R5 and
`feature-length-defects` rewrite the same `densityPenalty` function as
alternatives, not a stack (R5 measured worse — paired shuffle-drop 0.0938
vs. 0.8750 — on the public benchmark), and `feature-length-saturation-only`
is a byte-identical subset of `feature-length-defects`'s
`scarcityPenalty` change, kept only as the fallback if the larger branch is
rejected. This audit does not re-open those decisions; it confirms each
branch's own mergeability and superseded-or-not status independent of them.

## Method, and what is new here versus the existing record

Every merge-base, ancestor, and patch-id claim above is a command run from a
`lane/parked-branches` worktree at `26d930dd`, not asserted from memory:
`git merge-base`, `git rev-list --count`, `git merge-base --is-ancestor`,
`git show <sha> | git patch-id`, and one throwaway `--detach` worktree per
branch for `git merge --no-commit --no-ff` trials (each aborted and removed
immediately after). `docs/UNIFIED_STATE_2026-09-02.md`'s 2026-09-19 addendum
already covered the calibrate stack, the three-branch chain, and the two
merged lane branches — this audit corroborates those at the patch/ancestor
level and adds full docs-vs-code conflict classification, the two
`claude/*` duplicate pairs, the `feature-length-defects` /
`feature-length-saturation-only` subset relationship, and the ABANDON case's
50-commit churn count for `wip/phase-w-ui-checkpoint`, none of which the
earlier sweep's nine-branch table covered.

## Related

[[Owner - R5 Measurement and Merge]], [[Branch - R5 Verbosity Bias]],
[[Branch - Advice Rule Fixes]], [[Branch - Stacked R5 plus Advice]],
[[Branch - Feature-Length Defects]], [[Branch - Feature-Length Saturation Only]],
[[Branch - Adversarial 2026-09-12]], [[Branch - Forced Cue]],
[[Branch - Renderer Residuals]], [[Audit - 2026-09-18 Node 24]],
`docs/audits/2026-09-20-parked-branches/README.md`.

## Sources

- `docs/audits/2026-09-20-parked-branches/README.md`
- `docs/UNIFIED_STATE_2026-09-02.md`
- `docs/brain/Owner/Owner - R5 Measurement and Merge.md`
- `docs/brain/Branches/Branch - R5 Verbosity Bias.md`
- `docs/brain/Branches/Branch - Advice Rule Fixes.md`
- `docs/brain/Branches/Branch - Feature-Length Defects.md`
- `docs/brain/Branches/Branch - Feature-Length Saturation Only.md`
- `docs/brain/Branches/Branch - Renderer Residuals.md`
- `docs/brain/Audits/Audit - 2026-09-18 Node 24.md`
- `SESSION_REPORT_2026-09-19.md`
