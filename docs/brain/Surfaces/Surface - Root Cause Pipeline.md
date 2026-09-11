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
(231 scenes, 19,293 words, 899 issues, `contentHash` 6c27c8693c40…):

| | with spans | without spans |
| --- | --- | --- |
| root causes | 70 | 69 |
| top finding's scenes | 1, 2–12 | 1, 2–9 |
| 3rd finding's scenes | Scenes 1–58 | Scene 1 |

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

## Sources

- `server/lib/root-cause-pipeline.ts`; `server/lib/scene-ranges.ts`
- `server/nvm/analyze/cluster.ts`; `server/nvm/analyze/locate.ts`; `server/nvm/analyze/prioritize.ts`
- `tests/routes/root-cause-parity.test.ts`; `tests/core/scene-ranges.test.ts`
- `docs/CLAIMS_REGISTER.md` rows 80, 91-92
