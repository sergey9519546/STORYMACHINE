---
type: surface
updated: 2026-09-06
sources: [server/lib/coverage-letter.ts, server/routes/coverage-letter.ts, server/lib/verify-compare.ts, scripts/verify-report.mjs, tests/core/coverage-letter.test.ts]
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

**Verify line, offline-first (P3, 2026-09-06):** `verifyLine` (prose, since
the letter is connected text rather than a labelled `<dl>`) now names the
offline path first — `npm run verify-report -- letter.md script.fountain`,
the script never leaves the verifier's machine — before the hosted
`#verify`/`POST /api/export/verify` path (`docs/CLAIMS_REGISTER.md` row 74;
all three committed `report*.expected.md` fixtures under
`tests/fixtures/coverage-letter/` were updated to match, byte for byte).
`hashLine` and `provenanceLine` are unchanged and, being identical strings
in both the markdown and plain-text renderers, are what
`scripts/verify-report.mjs` parses out of either a `.md` or a `.txt` export
of this letter — see [[Surface - Coverage HTML]] for the shared
`server/lib/verify-compare.ts` comparator both this route and the CLI call.

## Sources

- `server/lib/coverage-letter.ts`
- `server/lib/verify-compare.ts`
- `scripts/verify-report.mjs`
- `tests/core/coverage-letter.test.ts`
- `tests/scripts/verify-report.test.ts`
- `docs/CLAIMS_REGISTER.md` rows 34-35, 39, 55, 56-57, 74-75
