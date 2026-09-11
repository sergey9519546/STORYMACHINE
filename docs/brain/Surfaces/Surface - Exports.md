---
type: surface
updated: 2026-09-11
sources: [server/routes/export.ts, server/routes/coverage-letter.ts, server/lib/verify-compare.ts, server/lib/build-info.ts, scripts/verify-report.mjs, tests/routes/export-verify.test.ts, server/lib/root-cause-pipeline.ts, server/lib/reader-tier.ts]
status: active
---

# Surface — Exports

**Files:** `server/routes/export.ts` — the export route family:
`POST /api/export/fdx`, `/docx`, `/print-html` (PDF via print), `/coverage`
(→ [[Surface - Coverage HTML]]), `/slate` (→ [[Surface - Slate]]),
`/breakdown`, `/pitchkit`, `/verify`; plus the separately-routed
`POST /api/export/coverage-letter` in `server/routes/coverage-letter.ts`
(→ [[Surface - Coverage Letter]]).

**What it shows:** `/api/export/verify` renders "Story Machine —
deterministic analysis, independently verifiable" (`docs/CLAIMS_REGISTER.md`
row 10) — a receipt a third party can check against the script text without
trusting the tool. All export routes take `gameLimiter` and
zod-validate their body (`FountainTitleBodySchema`, `CoverageBodySchema`,
`SlateBodySchema`, `DoctorBodySchema`, `VerifyBodySchema` —
`server/lib/validation.ts`), per `CLAUDE.md`'s security constraints.

**Browser suite:** the full writer journey in
`scripts/verify-production-build.mjs` ("analyze → jump to a line → export
Fountain/FDX/PDF/coverage letter → Settings → Session → Delete Everything →
reload," driven against the production server); `tests/routes/export-verify.test.ts`
and `tests/routes/export-offthread.test.ts` at the route level.

**Offline verifier (P3, 2026-09-06):** `/api/export/verify`'s comparison
logic (the 0.05 float tolerance, the field set, the engineCommit/
rulebookCount soft-mismatch carve-out) was extracted, unchanged, into
`server/lib/verify-compare.ts` (`checkContentHash`/`compareVerifyClaims`)
so `npm run verify-report -- <report> <script>` (`scripts/verify-report.mjs`)
can run the identical comparison with no server and no network — the
writer's unpublished script never has to be POSTed anywhere. See
[[Surface - Coverage HTML]] and [[Surface - Coverage Letter]] for the two
export formats it parses, and the CLI's own header for the third
(`report.json`, a raw `ScriptDoctorReport`). Outside a container,
`engineCommit` used to be the literal string `'dev'` — vacuous for the
engine comparison in `recomputed`/the CLI's `engine:` line —
`server/lib/build-info.ts` now falls back to a cached `git rev-parse HEAD`
when `GIT_SHA` is unset and a `.git` is present, so a report produced from
any checkout carries a real 40-hex commit (`tests/core/build-info.test.ts`;
`ci.yml`/`release.yml` additionally set `GIT_SHA: ${{ github.sha }}`
explicitly on their test steps, the same env-var contract the Dockerfile's
`ARG GIT_SHA` bakes).

**One pipeline behind the two coverage documents (2026-09-11).** Both
`POST /api/export/coverage` and `POST /api/export/coverage-letter` used to
hand-assemble the root-cause pipeline with `clusterIssues`' scene-spans argument
missing, so the producer's documents named different scenes, counted a different
number of findings and ordered them differently from the writer's screen for the
same `contentHash`. Both now call `buildRootCausePipeline` — see
[[Surface - Root Cause Pipeline]] for the measurement and
`tests/routes/root-cause-parity.test.ts` for the four-surface proof.

Both also now pass the exact Fountain text into the renderer, for one purpose:
resolving [[Surface - Producer Tier]]'s page references through the same
paginator the PDF export uses. Nothing is re-analyzed and no number is derived
from it there.


## Sources

- `server/routes/export.ts`
- `server/lib/verify-compare.ts`
- `server/lib/build-info.ts`
- `scripts/verify-report.mjs`
- `tests/routes/export-verify.test.ts`
- `tests/scripts/verify-report.test.ts`
- `tests/core/build-info.test.ts`
- `server/lib/root-cause-pipeline.ts`; `server/lib/reader-tier.ts`
- `tests/routes/root-cause-parity.test.ts`
- `docs/CLAIMS_REGISTER.md` rows 10, 74-75, 82, 87-92
