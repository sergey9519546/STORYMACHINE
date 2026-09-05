---
type: surface
updated: 2026-09-05
sources: [src/components/SlatePanel.tsx, server/lib/slate.ts, server/routes/export.ts, tests/routes/export-producer.test.ts]
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

**Browser suite:** `tests/routes/export-producer.test.ts` (the "renders a
Shape & Rhythm column" and "carries the two Shape & Rhythm aggregates"
tests, and the deterministic-ordering assertion at line 96).

## Sources

- `src/components/SlatePanel.tsx`; `server/lib/slate.ts`
- `tests/routes/export-producer.test.ts`
- `docs/CLAIMS_REGISTER.md` rows 11-12, 53
