---
type: surface
updated: 2026-09-05
sources: [server/lib/coverage-letter.ts, server/routes/coverage-letter.ts, tests/core/coverage-letter.test.ts]
status: active
---

# Surface — Coverage Letter

**Files:** `server/lib/coverage-letter.ts` (`renderCoverageLetter`,
`buildCaveats`), served from `POST /api/export/coverage-letter` in
`server/routes/coverage-letter.ts` — "the one-to-two-page connected-prose
export," distinct from [[Surface - Coverage HTML]] and `server/routes/export.ts`.

**What it shows:** a prose coverage letter whose caveats section carries
the same shared numbers as the other surfaces — the health-percentile
caveat (built from `src/lib/percentile-copy.ts`'s `ordinal()` /
`REFERENCE_SET_SIZE` / `REFERENCE_SET_LABEL`, fixing a 2026-09-05 bug where
a literal `"th"` suffix produced "82th" instead of "82nd"), the draft-rank
caveat (via `src/lib/draft-rank-copy.ts`'s `draftRankDenominatorLabel()` /
`draftRankNextOpportunityLabel()`, including the "ties for" and "N …
unranked" branches), and the shape-and-rhythm caveat (the same two
structural-signal aggregates, "descriptive only … no part of the score").

**Browser suite:** not directly a browser-battery target (a server-rendered
export); covered by `tests/routes/export-coverage-letter.test.ts` and the
fixture-based `tests/fixtures/coverage-letter/report1.expected.md`.

## Sources

- `server/lib/coverage-letter.ts`
- `tests/core/coverage-letter.test.ts`
- `docs/CLAIMS_REGISTER.md` rows 34-35, 39, 55, 56-57
