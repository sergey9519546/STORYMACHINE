---
type: surface
updated: 2026-09-05
sources: [server/routes/export.ts, server/routes/coverage-letter.ts, tests/routes/export-verify.test.ts]
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

## Sources

- `server/routes/export.ts`
- `tests/routes/export-verify.test.ts`
- `docs/CLAIMS_REGISTER.md` row 10
