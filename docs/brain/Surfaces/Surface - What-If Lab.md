---
type: surface
updated: 2026-09-05
sources: [src/components/WhatIfPanel.tsx, server/nvm/whatif/materialize.ts, tests/routes/nvm-whatif-doctor.test.ts]
status: active
---

# Surface — What-If Lab

**Files:** `src/components/WhatIfPanel.tsx` (`DoctorReadout`, the branch
promotion flow), backed by `server/nvm/whatif/materialize.ts` and the
`POST /api/nvm/whatif/doctor` / `POST /api/nvm/whatif/room` routes
(deterministic, no AI key — `docs/CLAIMS_REGISTER.md` row 14).

**What it shows:** "Branches are story moves, not text — until they are
compiled into a script there is nothing for the Script Doctor to read"
(row 43); "Score with Script Doctor" compiles a branch into a Fountain
draft (byte-for-byte deterministic — `tests/routes/nvm-whatif-doctor.test.ts`)
and scores it through the same `DoctorReadout` percentile/Shape-and-Rhythm
copy as [[Surface - Script Doctor Panel]] (`compactPercentileNote()`,
`docs/CLAIMS_REGISTER.md` row 54, and row 42's Shape & Rhythm labelling).
When the whole draft cannot be analyzed, it withholds health/grade/verdict
and the delta rather than inventing a score (row 44). Promotion snapshots
the current draft first, so it can be restored from Versions (row 45).

**Browser suite:** `scripts/verify-p2-p3-surfaces.mjs`'s `P2-whatif` phase
(labelling assertion, promote-snapshots-first, applies-exactly-once).

## Sources

- `src/components/WhatIfPanel.tsx`
- `tests/routes/nvm-whatif-doctor.test.ts`; `tests/routes/nvm-whatif-room.test.ts`
- `docs/CLAIMS_REGISTER.md` rows 13-14, 42-45, 54
