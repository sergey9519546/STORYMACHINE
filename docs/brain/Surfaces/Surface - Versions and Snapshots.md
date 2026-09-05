---
type: surface
updated: 2026-09-05
sources: [src/components/scriptide/SnapshotManager.tsx, tests/core/snapshot-trend.test.ts]
status: active
---

# Surface — Versions and Snapshots

**Files:** `src/components/scriptide/SnapshotManager.tsx`
(`SnapshotPercentileAndRankLine`, `ShapeRhythmTrendLine`) — the "Versions"
list a writer sees in the editor, and the snapshot store each entry reads
from (client-side; each snapshot carries the health/verdict/scene-count it
had when taken, per `docs/CLAIMS_REGISTER.md` row 30).

**What it shows:** per-snapshot rank ("ranks N of M by health among your
saved drafts of this script"), reusing `computeDraftRank` rather than a
second ranking implementation, and — as of a 2026-09-05 owner rule ("one
wording per concept") — the denominator noun now comes from
`src/lib/draft-rank-copy.ts`'s `draftRankDenominatorLabel('saved')`, the
last draft-rank surface to move onto the shared helpers. A 2026-09-05
follow-up (client-hunter B-12) added the unranked-drafts note here too — it
previously had none at all, unlike [[Surface - Script Doctor Panel]] and
[[Surface - Coverage Letter]], which already disclosed unranked drafts.
Also shows the Shape & Rhythm trend line (talk/action swing, action-prose
variation), same two descriptive-only aggregates as the other surfaces.

**Browser suite:** `scripts/verify-p2-p3-surfaces.mjs`'s "Ship → Versions
shows each snapshot's rank" assertion; `scripts/verify-e4-local-safety-net.mjs`
§4 (snapshot survival across Delete Everything).

## Sources

- `src/components/scriptide/SnapshotManager.tsx`
- `tests/core/snapshot-trend.test.ts`; `tests/core/draft-rank-copy-consistency.test.ts`
- `docs/CLAIMS_REGISTER.md` rows 30, 40, 52, 57
