# Currency batch — 2026-09-06

The owner asked for the project to be brought current, synced and onto its
most upgraded version. Three lanes ran in parallel, each reviewed by an
independent reviewer under `docs/LANE_STANDARD.md` §6 before anything
merged or was pushed. Each `*-review.md` is one reviewer's full record.

| lane | review rounds | landed at |
|---|---|---|
| scoring-branch sync (R5, advice rules, and the stacked branch rebased onto main, pushed as `scoring/*`; receipts PENDING) | REVISE 4 → REVISE 1 → MERGE (+2 nits) | branches 52bf410a / a1cf7677 / 408166ae; docs da3db049 |
| per-analysis wall-clock budget, Decision #7 (parse reuse stopped with numbers) | REVISE 1 → MERGE (+2 built) → REVISE 1 → MERGE (+1) | 5b50af8b |
| dependency currency (0 audit advisories; 8 majors landed, 2 skipped with reasons) | REVISE 2 → MERGE (+1) | merge pending at time of writing (reviewed MERGE) |

Nine review rounds; no lane merged on its first pass. What the reviews
caught that the lanes' own gates had passed: an owner instruction that
would have refused to run (`lock-auc24` without its corpus variable); a
receipt-conversion recipe one scan short, on all three branches; a queued
job told its draft was slow; an eager worker respawn that could outlive a
shutdown and hang the process; a timing-ratio assertion made deterministic
by counting; a deep-link fix with no regression guard that could fail off
this sandbox. Reviewers' probe scripts lived in session scratch space
(`<session scratch>/…`) and are described, not copied.

What only the owner can do, unchanged: run `measure-real` on
`scoring/stacked-r5-plus-advice` (the recipe is in
`docs/brain/Owner/Owner - R5 Measurement and Merge.md`), lock the AUC-24
table before 2026-10-01, push the local `audit/2026-09-05/*` and
`audit/2026-09-06/*` tags, clear the GitHub Actions account block, decide
the licence (Decision #6) and the repository visibility, and verify the
Node 24 base image with a Docker daemon.
