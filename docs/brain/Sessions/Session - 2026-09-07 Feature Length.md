---
type: session
updated: 2026-09-07
sources: [docs/PATH_TO_EXCELLENCE.md, src/hooks/useIdempotentState.ts, src/lib/finding-jump.ts, src/components/scriptide/FindingJump.tsx, tests/core/finding-jump-tabstops.test.ts, tests/core/scriptide-render-loop-guard.test.ts, scripts/verify-p2-p3-surfaces.mjs]
status: active
---

# Session — 2026-09-07: Feature Length, Render Loop, FindingJump

**Heading:** "2026-09-07 — feature length, render loop, FindingJump." The
product had no fixture at feature length. A 231-scene CC0 assembly
(`tests/fixtures/feature-length/assembled-feature.fountain`) made four
defects that only appear at that length visible, and they were closed
across three rounds on [[Surface - Script Doctor Panel]].

**What landed:**

- **React #185** on keystroke 52 after a coverage run on a feature draft.
  Cause: per-keystroke no-op `setSaveStatus("saving-local")` while
  `setScriptText` had a pending update, so React's same-value bail-out
  could not fire. Fixed with `useIdempotentState`
  (`src/hooks/useIdempotentState.ts`). Round 2 closed the latent twin
  (title-page autofill allocating a fresh object every keystroke). Round 3
  closed `coverageStale`, which `handleScriptChange` writes `true` on every
  keystroke — the same ratchet through a third setter.
- **FindingJump.** One control, one naming rule (`src/lib/finding-jump.ts`):
  scene-tier says scene, line/character-tier says line, unlocatable findings
  render a reason instead of nothing. Root-cause cards state issues vs
  rules as different counts (`docs/CLAIMS_REGISTER.md` rows 80–81). Headlines now
  name the scene that contains `startLine` when that disagrees with
  `sceneIdxs[0]`.
- **Appendix tab stops.** Round 2 made Per-Pass "no location" notes not tab
  stops (374 → 29 on the fixture). Round 3 locked the split:
  `tests/core/finding-jump-tabstops.test.ts` (fail-first) and `P2-featurelen`
  counting `[data-no-location-focusable]` separately from `[data-no-location]`.
- **Fail-first typing gate.** Round 2: `typeWithoutDrainGaps` (non-awaited
  CDP key delivery) so `page.keyboard.type()` cannot hide the render loop
  behind per-key drain gaps. Shape-guard floor restored to two tiers after
  round 1 lowered it 1000x → 100x.

**Not closed here:** GitHub Actions is still the owner billing block
([[Owner - Fix GitHub Actions]]) — jobs on `dd57251d` died in ~2 seconds
with no runner. The P2-featurelen browser suite is the driven half of the
tab-stop lock and needs a matching `npm install` on this tree.

## Sources

- `docs/PATH_TO_EXCELLENCE.md` — the 2026-09-07 session record
- `src/hooks/useIdempotentState.ts`, `src/hooks/idempotent-state.ts`
- `src/lib/finding-jump.ts`, `src/components/scriptide/FindingJump.tsx`
- `tests/core/finding-jump-tabstops.test.ts`,
  `tests/core/scriptide-render-loop-guard.test.ts`
- `scripts/verify-p2-p3-surfaces.mjs`
