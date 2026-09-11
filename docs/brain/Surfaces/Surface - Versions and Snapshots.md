---
type: surface
updated: 2026-09-11
sources: [src/components/scriptide/SnapshotManager.tsx, tests/core/snapshot-trend.test.ts, src/lib/snapshot-trend.ts, server/lib/validation.ts, tests/core/percentile-comparability.test.ts]
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

**The half-gate this list used to apply (2026-09-11).** A percentile is only a
meaningful reading inside the calibration reference set's band of SCENES AND
WORDS, and a snapshot carried only the scene count — so this list applied half
the gate. `data/screenplays/runoff.fountain` (9 scenes, inside the band; 1,448
words, four times over it) read "top 30%" here and "not comparable" on every
other surface, for one draft in one session.

`Snapshot.wordCount` is now captured at save time and plumbed through
`SnapshotSchema` (`server/lib/validation.ts` — optional, typed, so a malformed
value is rejected rather than stored), `SnapshotTrendEntry`
(`src/lib/snapshot-trend.ts` — `null` when absent, never back-filled from the
stored text, because a whitespace split of `snapshot.text` is a different number
from the analyzer's count), and all three creation sites: the undo path,
`confirmSnapshot`, and a promoted [[Surface - What-If Lab]] branch. A legacy row
with no word count reads "not comparable" rather than a stale band
(`docs/CLAIMS_REGISTER.md` row 88).

## Sources

- `src/components/scriptide/SnapshotManager.tsx`
- `tests/core/snapshot-trend.test.ts`; `tests/core/draft-rank-copy-consistency.test.ts`
- `src/lib/snapshot-trend.ts`; `server/lib/validation.ts`
- `tests/core/percentile-comparability.test.ts`
- `docs/CLAIMS_REGISTER.md` rows 30, 40, 52, 57, 88
