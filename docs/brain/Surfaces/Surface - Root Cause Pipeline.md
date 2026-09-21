---
type: surface
updated: 2026-09-21
sources: [server/lib/root-cause-pipeline.ts, server/lib/scene-ranges.ts, server/nvm/analyze/cluster.ts, server/nvm/analyze/locate.ts, tests/routes/root-cause-parity.test.ts, tests/core/scene-ranges.test.ts]
status: active
---

# Surface — Root Cause Pipeline

The one place a `ScriptDoctorReport` plus its raw Fountain text becomes
located issues, per-scene line spans, clustered root causes and the
"start here" ordering — and the one place those findings become
reader-facing statements.

**Why it exists.** The 2026-09-06 product discovery found the writer's screen
and the producer's export disagreeing about where the problem was, from the
same `contentHash`. Eight call sites hand-assembled the same four-step
pipeline and three of them omitted `clusterIssues`' `sceneSpans` argument:
`POST /api/export/coverage`, `POST /api/export/coverage-letter`, and
`scripts/generate-p0-sample-report.ts`.

`sceneSpans` is not cosmetic. `server/nvm/analyze/cluster.ts` uses it for
`sceneIdxsOf` (which scenes a finding names) and for
`cohesionKey`/`splitOversizedGroup` (how an over-cap group splits into
separate findings) — and because the final sort key is `memberCount`,
omitting it also reorders the list a writer is told to fix first.

**Measured** on `tests/fixtures/feature-length/assembled-feature.fountain`
(231 scenes, 19,293 words, `contentHash` 6c27c8693c40…). Two rows: the
2026-09-11 measurement at 899 located issues, and the 2026-09-21 re-measurement
on the feature-length scoring candidate at 946 located issues (the doctor's
ORPHAN_CLUE guard, `e5e2b534`, moved the issue count; nothing in this pipeline
changed):

| | with spans (2026-09-11) | without spans (2026-09-11) | with spans (2026-09-21) | without spans (2026-09-21) |
| --- | --- | --- | --- | --- |
| root causes | 70 | 69 | 73 | 73 |
| top finding's scenes | Scenes 2–12 | Scenes 2–4, 6–9 | Scenes 12–26 | Scenes 13–17, 26 |
| 3rd finding's scenes | Scenes 1–58 | Scene 1 | Scenes 41–55 | Scenes 41–44, 46, 47 |

Read the top-finding row carefully: without the spans the top finding's scenes
are **gappy**, not a shorter contiguous run, so the producer's document was
naming a different SET of scenes rather than a narrower span of them. The
2026-09-21 columns keep that property and the third-finding collapse (15 scenes
to 6) but lose the count difference — by coincidence of composition: 65 ids are
shared, 8 findings exist only with spans and 8 different ones only without (the
over-cap "zero entropy scene" group splits differently), so the reversion probe
now asserts the set difference (8 + 8), the scene-set difference (27 of the 65
shared findings) and the order difference (24 of 73 positions) instead of a
count.

These six values are not maintained by hand. They are
`SCENE_SPAN_DRIFT_MEASUREMENT` in `server/lib/root-cause-pipeline.ts`, and
`tests/routes/root-cause-parity.test.ts` re-derives every one of them from a live
run on the fixture and asserts that this note quotes the same strings — added in
round 2, after the second row was found to be wrong in both columns in both the
module comment and here.

**Files:** `server/lib/root-cause-pipeline.ts` (`buildRootCausePipeline`
derives the spans from the same `fountain` string it derives the anchors from,
so there is no argument left to forget; `rootCauseStatements` and
`topRootCauses` hold the reader-facing wording and the canonical order),
`server/lib/scene-ranges.ts` (`formatSceneList` — the one scene-list wording,
`docs/CLAIMS_REGISTER.md` row 91).

**Proof:** `tests/routes/root-cause-parity.test.ts` drives four live surfaces
from one `contentHash` on the committed feature fixture — the doctor JSON
route, the live-diagnose JSON route, the exported coverage HTML and the
exported letter — and asserts identical rendered scene ranges, cluster counts,
priority order and top-three text, scraping both exports out of their shipped
bytes. Its last three cases are a reversion probe, so weakening the parity
claims fails too.

**2026-09-21 — re-measured on the feature-length scoring candidate.** The
current columns of `SCENE_SPAN_DRIFT_MEASUREMENT` are the 2026-09-21 ones
above; the 2026-09-11 row is preserved in the module header's two-column table
and here. Recorded in
`docs/audits/2026-09-20-feature-length-defects-prep/README.md`.

**Round 2 (2026-09-11) — the measured table is measured by a test.** Its six values
are `SCENE_SPAN_DRIFT_MEASUREMENT` in `server/lib/root-cause-pipeline.ts`, and
`tests/routes/root-cause-parity.test.ts` re-derives each from a live run on the
fixture and asserts this note quotes the same strings. Added after the round-1
review found the top-finding row wrong in both columns here and in the module
comment.

## Sources

- `server/lib/root-cause-pipeline.ts`; `server/lib/scene-ranges.ts`
- `server/nvm/analyze/cluster.ts`; `server/nvm/analyze/locate.ts`; `server/nvm/analyze/prioritize.ts`
- `tests/routes/root-cause-parity.test.ts`; `tests/core/scene-ranges.test.ts`
- `docs/CLAIMS_REGISTER.md` rows 80, 91-92
