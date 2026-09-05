---
type: surface
updated: 2026-09-05
sources: [server/lib/coverage-html.ts, server/routes/export.ts, tests/core/coverage-html.test.ts]
status: active
---

# Surface — Coverage HTML

**Files:** `server/lib/coverage-html.ts` (`renderCoverageHtml`,
`buildHealthPercentileLine`, `buildDraftRankLine`), served from
`POST /api/export/coverage` in `server/routes/export.ts`.

**What it shows:** a standalone, shareable HTML coverage report — health,
verdict, `totalIssues`, the health-percentile line, and (as of the
2026-09-05 migration) the draft-rank line, now built through the same
`src/lib/draft-rank-copy.ts` shared helpers as [[Surface - Script Doctor Panel]]
and [[Surface - Coverage Letter]] rather than a third hand-written wording —
closing a drift where this export still said "your own saved drafts of
this script" after the other two surfaces had already moved to the shared
denominator (`docs/CLAIMS_REGISTER.md` rows 50-51, 56-57). Also carries a
Shape & Rhythm column titled "Descriptive only — not part of the score or
this ranking" (row 53), the same two aggregates [[Surface - Script Doctor Panel]]
shows.

**Browser suite:** `scripts/verify-p2-p3-surfaces.mjs`'s export phase;
`scripts/verify-production-build.mjs` checks it renders identically under
`NODE_ENV=production`.

## Sources

- `server/lib/coverage-html.ts`
- `tests/core/coverage-html.test.ts`
- `docs/CLAIMS_REGISTER.md` rows 49-51, 53, 56-57
