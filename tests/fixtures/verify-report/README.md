# Pre-tier coverage artifacts — back-compatibility fixtures

`pre-tier-coverage.html` and `pre-tier-letter.md` are BYTE COPIES of artifacts
produced by commit `318493c9` — the last commit before
`server/lib/reader-tier.ts` existed, so neither document renders a producer tier,
neither publishes a tier claim row, and neither carries the verify block's scope
sentence or the tier's stylesheet rules.

They exist because `scripts/verify-report.mjs` refuses a document that renders a
reader summary page whose numbers its verify block does not publish, and that
refusal must never fire on an artifact that legitimately has no such page. A
synthetic stand-in cannot prove that: the 2026-09-12 round-2 review's own
"no-tier" case was the current renderer's HTML with the tier section cut out,
which still carried the tier's CSS and the scope sentence — a TAMPERED document,
correctly refused, and therefore no evidence about a real pre-tier report.

**Never regenerate these from the current tree.** Re-rendering them would make
them post-tier artifacts and the test would stop testing anything. Both were
rendered from the `MULTI_SCENE_FOUNTAIN` fixture in
`tests/scripts/verify-report.test.ts` (health 65.0, CONSIDER, 7 issues), which is
the script the test verifies them against.
