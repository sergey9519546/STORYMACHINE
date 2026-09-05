---
type: surface
updated: 2026-09-05
sources: [server/routes/scriptide.ts, src/components/scriptide/ScriptDoctorPanel.tsx, tests/routes/scriptide-fix.test.ts]
status: active
---

# Surface — Fix and Verify

**Files:** `POST /api/scriptide/fix` in `server/routes/scriptide.ts`
(`fixAndVerify`, `fix.ts`); rendered by `ScriptDoctorPanel.tsx`'s
`FixReceiptCard` and "Verify my rewrite" control.

**What it shows:** two distinct paths behind one route, split by
[[Decision 3 - Demote Generative Surface to Labs]]'s 2026-09-04 amendment.
"Fix & verify" (generation) is Labs-gated: it POSTs a span and gets an LLM
rewrite back. "Verify my rewrite" ships on the default surface with Labs
off and no key: a `candidateFountain` request body returns from the
route's own early branch **before** `fix.ts` is even imported, so there is
no code path to a model call — asserted by a counting provider spy at zero
invocations in `tests/routes/scriptide-fix.test.ts` (mutation-checked: a
planted call in that branch turns the assertion red). Both paths render
the identical receipt shape (health delta, cleared/introduced,
`usedLLM:false`/`true`), including the Shape & Rhythm delta strip (row 41).
An identical candidate yields exactly zero deltas (row 48).

**Browser suite:** `scripts/verify-p2-p3-surfaces.mjs`'s `P2-generative`
phase, run against a keyless server with Labs OFF specifically to exercise
the writer-supplied path.

## Sources

- `server/routes/scriptide.ts`
- `tests/routes/scriptide-fix.test.ts` (writer-supplied-candidate block)
- `docs/CLAIMS_REGISTER.md` rows 41, 46-48
- `docs/DECISION_LOG.md` Decision #3 amendment
