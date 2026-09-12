---
type: surface
updated: 2026-09-11
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
(231 scenes, 17,436 words, 933 issues, `contentHash` 6c27c8693c40…):

| | with spans | without spans |
| --- | --- | --- |
| root causes | 73 | 73 |
| top finding's scenes | Scenes 12–26 | Scenes 13–17, 19 |
| 3rd finding's scenes | Scenes 41–55 | Scenes 41–44, 46, 47 |

Read the second row carefully: without the spans the top finding's scenes are
**gappy**, not a shorter contiguous run, so the producer's document was naming a
different SET of scenes rather than a narrower span of them.

*(Re-measured 2026-09-12. The word count moved 19,293 → 17,436 and the issue
count 899 → 933 because the score denominator became the screenplay's own
printed words and this fixture's twenty stapled shorts each carry a CC0
provenance boneyard; `contentHash` did not move, because it identifies the
submitted bytes. The root-cause COUNT is now equal in both columns — it was
70 against 69 — which is why the reversion probe in
`tests/routes/root-cause-parity.test.ts` no longer leads with it. The count was
always a proxy; the ranges are the defect, and they still differ on most
findings.)*

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
