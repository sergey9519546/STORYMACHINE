---
type: surface
updated: 2026-09-11
sources: [server/lib/coverage-html.ts, server/routes/export.ts, server/lib/verify-compare.ts, scripts/verify-report.mjs, tests/core/coverage-html.test.ts, server/lib/reader-tier.ts, server/lib/strengths-copy.ts, tests/core/reader-tier.test.ts]
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

**Producer tier, and what moved to make room (2026-09-11).** The document now
opens with [[Surface - Producer Tier]], then a divider, then this report
unchanged. The header used to carry the logline, the scene/word/page length line
AND the verdict stamp — all three of which the tier states — so the reader's
first page said each of them twice. They moved; the header now identifies the
document (masthead, title, byline, date, excerpt note). The verdict stamp still
has one implementation (`verdictStampHtml`, rendered where the tier asks for it),
and the logline reuses the existing `.logline-line` rule rather than orphaning
it. `.stamp-wrap` had nothing left to style and was removed with proof: a
"no dead class selectors" case asserts, for 21 header and tier classes, that
being in the stylesheet and being in the markup are the same answer. That test
found a second one — `.header-main` was rendered with no rule at all.

**Checks That Found Nothing (2026-09-11).** The strengths section was headed
"What's Working", which reads as the report arguing the draft works in a
document whose own summary can state 84/100 four lines above a dimension at
0/100. `server/lib/strengths-copy.ts` now holds the title and a one-line caption
saying the entries are checks that did not fire, shared with
[[Surface - Coverage Letter]] and [[Surface - Script Doctor Panel]]
(`docs/CLAIMS_REGISTER.md` row 86). Every entry is kept, and the
score-versus-dimension contradiction itself is untouched: it lives in
`buildPlainSummary`/`buildStrengths` in `server/nvm/analyze/doctor.ts`, on the
scoring path.

**Root causes and the percentile.** Both now come from shared modules rather
than this file's own assembly — see [[Surface - Root Cause Pipeline]] for the
scene ranges, counts and ordering, and row 88 for the comparability gate that
decides band versus "not comparable".

## Sources

- `server/lib/coverage-html.ts`
- `server/lib/verify-compare.ts`
- `scripts/verify-report.mjs`
- `tests/core/coverage-html.test.ts`
- `tests/scripts/verify-report.test.ts`
- `server/lib/reader-tier.ts`; `server/lib/strengths-copy.ts`; `server/lib/root-cause-pipeline.ts`
- `tests/core/reader-tier.test.ts`; `tests/routes/root-cause-parity.test.ts`
- `docs/CLAIMS_REGISTER.md` rows 49-51, 53, 56-57, 74-75, 82, 86-92
