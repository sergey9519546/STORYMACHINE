---
type: surface
updated: 2026-09-06
sources: [server/routes/export.ts, server/routes/coverage-letter.ts, server/lib/verify-compare.ts, server/lib/build-info.ts, scripts/verify-report.mjs, tests/routes/export-verify.test.ts]
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

## Sources

- `server/routes/export.ts`
- `server/lib/verify-compare.ts`
- `server/lib/build-info.ts`
- `scripts/verify-report.mjs`
- `tests/routes/export-verify.test.ts`
- `tests/scripts/verify-report.test.ts`
- `tests/core/build-info.test.ts`
- `docs/CLAIMS_REGISTER.md` rows 10, 74-75
