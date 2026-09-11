---
type: surface
updated: 2026-09-11
sources: [src/components/SlatePanel.tsx, server/lib/slate.ts, server/routes/export.ts, tests/routes/export-producer.test.ts, src/lib/percentile-copy.ts, tests/core/slate-percentile-denominator.test.ts]
status: active
---

# Surface — Slate

**Files:** `src/components/SlatePanel.tsx` (client panel) and
`server/lib/slate.ts` (`renderSlateHtml`, the shareable HTML render),
served from `POST /api/export/slate` in `server/routes/export.ts` —
"deterministic ranking — same slate, same order, every time"
(`docs/CLAIMS_REGISTER.md` row 11).

**What it shows:** a ranked table of drafts, each row carrying "the
deterministic engine placed this draft in its top verdict tier — a
measurement, not a human-reader endorsement" (row 12), plus (added
2026-09-04, a honesty-audit matrix fix) a Shape & Rhythm column titled
"Descriptive only — not part of the score or this ranking" carrying the
same two structural-signal aggregates every other surface shows.

**Route test (not [[Gate - Browser Battery Suites|browser battery]]):**
`tests/routes/export-producer.test.ts` is a Node route test (`npm test`,
no Chromium) — the "renders a Shape & Rhythm column" and "carries the two
Shape & Rhythm aggregates" tests, and the deterministic-ordering assertion
at line 96. No browser suite drives this surface directly.

**Two readings of one column (2026-09-11).** The in-app table rendered a BAND
for each row's percentile while the exported slate HTML rendered
`${Math.round(pct)}th pct` — an ordinal, carrying the same hardcoded "th" bug
the coverage letter's percentile line had ("82th") — for the identical number in
the identical column, and neither applied a comparability gate. Both now call
`percentileCellFor` in `src/lib/percentile-copy.ts`, so a row inside the
calibration reference set's band reads a band and a row outside it reads "not
comparable" (`docs/CLAIMS_REGISTER.md` row 88). `SlateEntry` already carried
both `sceneCount` and `wordCount`, so no plumbing was needed here.

## Sources

- `src/components/SlatePanel.tsx`; `server/lib/slate.ts`
- `tests/routes/export-producer.test.ts`
- `src/lib/percentile-copy.ts`
- `tests/core/slate-percentile-denominator.test.ts`; `tests/core/percentile-comparability.test.ts`
- `docs/CLAIMS_REGISTER.md` rows 11-12, 53, 88
