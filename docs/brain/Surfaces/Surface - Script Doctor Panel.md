---
type: surface
updated: 2026-09-05
sources: [src/components/scriptide/ScriptDoctorPanel.tsx, server/nvm/analyze/doctor.ts, tests/core/script-doctor.test.ts]
status: active
---

# Surface — Script Doctor Panel

**Files:** `src/components/scriptide/ScriptDoctorPanel.tsx` (the panel and
its subcomponents — `DraftRankLine`, `FixReceiptCard`, `ShapeRhythmSection`);
rendered from `server/nvm/analyze/doctor.ts`'s `ScriptDoctorReport`, which
is the shared module every other surface in this list also reads from.

**What it shows:** health, grade, verdict, top priorities, a health
percentile against the 20-sample hand-authored synthetic reference set
(`compactPercentileNote()`, `src/lib/percentile-copy.ts`), and a draft-rank
line ("rank among your drafts: N of M runs and saved drafts of this
script") built from `src/lib/draft-rank-copy.ts`'s shared helpers — the
same helpers [[Surface - Coverage HTML]] and [[Surface - Coverage Letter]]
call, so the three surfaces never re-implement the wording independently
(see [[Patterns]], "one value rendered by N hand-written sentences"). The
`ShapeRhythmSection` shows two structural-signal aggregates (talk/action
swing, action-prose variation) labeled "descriptive only, not part of the
score" — read from `server/nvm/analyze/structural-signals.ts`, no lexicon
involved.

**Browser suite:** `scripts/verify-p2-p3-surfaces.mjs` (`P2-generative`
phase drives this panel with Labs on and off from the same starting point);
`scripts/verify-a11y.mjs` covers it in the accessibility sweep.

## Sources

- `src/components/scriptide/ScriptDoctorPanel.tsx`
- `tests/core/script-doctor.test.ts`
- `docs/CLAIMS_REGISTER.md` rows 9, 32-33, 36-38, 49 (this panel's claims)
