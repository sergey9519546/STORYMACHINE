---
type: surface
updated: 2026-09-06
sources: [server/lib/coverage-html.ts, server/routes/export.ts, server/lib/verify-compare.ts, scripts/verify-report.mjs, tests/core/coverage-html.test.ts]
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

**Verify block, offline-first (P3, 2026-09-06):** the footer's "Verify this
report" `<dl class="verify-claims">` (contentHash, health, verdict,
totalIssues, and — when `report.provenance` exists — engineCommit/
rulebookCount) is unchanged; the three instructional steps above it were
reordered so the OFFLINE path is named first: `npm run verify-report --
report.html script.fountain` (the script never leaves the verifier's
machine), with the hosted `#verify`/`POST /api/export/verify` path kept
second (`docs/CLAIMS_REGISTER.md` row 74). The CLI
(`scripts/verify-report.mjs`) parses this exact `<dl>` block, recomputes
`sha256(text.trim())` via `computeContentHash` (doctor.ts), re-runs
`runScriptDoctor` in-process, and compares with the SAME comparator the
route uses (`server/lib/verify-compare.ts`'s `compareVerifyClaims` — one
implementation, imported by both `server/routes/export.ts` and the CLI, so
the two can never diverge on the 0.05 tolerance or the engine-identity
soft-mismatch carve-out). `engineCommit` itself is now real outside Docker
too: `server/lib/build-info.ts` falls back to a cached `git rev-parse HEAD`
when `GIT_SHA` is unset and a checkout is present (previously always
`'dev'` outside a container) — see [[Surface - Exports]] and
`tests/core/build-info.test.ts`.

## Sources

- `server/lib/coverage-html.ts`
- `server/lib/verify-compare.ts`
- `scripts/verify-report.mjs`
- `tests/core/coverage-html.test.ts`
- `tests/scripts/verify-report.test.ts`
- `docs/CLAIMS_REGISTER.md` rows 49-51, 53, 56-57, 74-75
