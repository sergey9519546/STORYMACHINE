// tests/story-vector.test.ts — INTENTIONALLY EMPTY (2026-08-03 audit fix).
//
// This file's original content (594 lines, vitest-based) never ran: it is
// absent from scripts/run-tests.mjs's TEST_ROOTS (which scans
// tests/collab|core|e2e|nvm|passes|routes — not bare tests/), is excluded in
// tsconfig.json, and imported `vitest` rather than `node:test`, so it could
// not have run even if discovered. It was the ONLY test anywhere for
// extractGenome/compareGenomes (server/nvm/analyze/structural-genome.ts), a
// module imported by the live server/routes/nvm/analysis.ts route — real,
// route-connected code with zero executing coverage.
//
// Its genuinely-valuable assertions — structural-genome extraction/
// comparison, plus story-vector.ts's vectorization/similarity/nearest-
// neighbor/clustering behavior — have been ported to
// tests/core/story-vector.test.ts, converted from vitest idioms to
// node:test + node:assert/strict. Several fixtures were corrected or
// strengthened along the way (see that file's header for specifics,
// including a couple of real bugs this file's mock data masked simply by
// never running against the real modules). Nothing was dropped silently:
// anything vacuous was either fixed to test real behavior or intentionally
// left out.
//
// This file is kept (rather than deleted) as a pointer so a future reader
// who searches for "story-vector" at the tests/ root doesn't mistake its
// disappearance for an accident.
