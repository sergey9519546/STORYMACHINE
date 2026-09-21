---
type: audit
updated: 2026-09-21
sources: [docs/audits/2026-09-21-craft-formula-leaf/README.md, server/nvm/analyze/craft-formula.ts, server/nvm/analyze/doctor.ts, server/nvm/analyze/calibration/reference.ts, tests/core/craft-formula-leaf.test.ts, tests/core/doctor-calibration-under-tsx.test.ts, tests/core/calibration.test.ts, scripts/lib/import-graph.mjs, CLAUDE.md, docs/p1-benchmark/MEASUREMENT_RECEIPTS.md]
status: active
---

# Audit — 2026-09-21 Craft Formula Leaf

**Directory:** `docs/audits/2026-09-21-craft-formula-leaf/` — the lane record
for `lane/craft-formula-leaf`, branched from `bafffb69` (main's lineage).

## What it answers

[[Audit - 2026-09-21 Prod Loader Guard]] closed two silent failure modes of
the `doctor.ts` <-> `calibration/reference.ts` import cycle with a guard test
and a loud fallback, and named the structural fix it declined: move the craft
formula into a leaf module that imports nothing, so the corpus build never
runs code from a half-evaluated module. This lane does that.

`densityPenalty`, `scarcityPenalty`, `craftPenalty` and `computeRawCraftScore`
— with the opportunity-based design comment and every function-local constant
— moved **verbatim** (bodies byte-identical; four `export` keywords and three
doc-comment sentences are the whole diff against the extracted text) from
`doctor.ts` into `server/nvm/analyze/craft-formula.ts`. `doctor.ts` imports
and re-exports `computeRawCraftScore`, so every existing import site resolves;
`reference.ts` imports it from the leaf. Walked with the receipt gate's own
`scripts/lib/import-graph.mjs`: `reference.ts`'s closure was 68 files
INCLUDING `doctor.ts`; it is 60 files EXCLUDING it; the leaf's closure is
itself. The cycle is gone from the corpus-scoring path by construction, and
`tests/core/craft-formula-leaf.test.ts` (3/3) pins the three graph facts plus
re-export identity.

**Proved, not asserted.** Each hazard was re-introduced on the leaf and
measured: a module-level `const` read by `scarcityPenalty` (the TDZ failure)
and a named nested arrow inside `densityPenalty` (the `__name` failure under
tsx) — the tsx guard and `calibration.test.ts` **pass** under both (1/1,
25/25), and both probes were reverted from a byte copy. The same const edit on
the `bafffb69` baseline tree is the control: the tsx guard fails by name
(`holds 0 of 20`), with `ReferenceError: Cannot access
'PROBE_MODULE_LEVEL_SCARCITY_SCALE' before initialization` under BOTH loaders —
the TDZ was never loader-specific, only its `__name` twin is. A finding on the
side: `calibration.test.ts` passed 25/25 on that failing control tree, because
it imports `reference.ts` first and enters the cycle from the working side;
the tsx guard is the only test that sees these hazards, and it stays.

## Why it is safe to have merged

Same formula, same function-local constants, one more module boundary.
`check-doctor-output-identity --compare` against `git archive bafffb69` is
**45/45 byte-identical**; all six public-benchmark statistics reproduce
unchanged (0.5313 / 0.5586, 0.4063 / 0.4443, 1.0000 / 0.9473) with
ordered/inverted/tied counts unchanged; `script-doctor` 86/86,
`doctor-worker-pool` 9/9, `doctor-history-identity` 35/35,
`blind-pairs-discrimination` 4/4, `discrimination` 14/14, `rebuild-experiment`
41/41, `pure-core-boundary` 6/6 (the leaf is inside `server/nvm/analyze/`, so
no allowlist entry). No floor in `scripts/lib/auc.ts` moved, no re-lock ran,
and no real-corpus figure is claimed: the private AUC-24 corpus is not present
in this environment. The receipt is the 2026-09-21 entry headed "craft formula
moved to a leaf module (code motion; no formula change)" in
`docs/p1-benchmark/MEASUREMENT_RECEIPTS.md`.

**Documentation re-anchored.** Every `doctor.ts:NNNN` citation after the moved
blocks shifts by exactly -230 lines, each verified to land on identical text:
`CLAUDE.md`, `NORTH_STAR.md`, `ROADMAP.md`, [[Glossary]] and
`docs/CLAIMS_REGISTER.md` rows 22 and 115 (`honesty-audit-claims` 15/15).
`CLAUDE.md`'s gotcha now states what is true (the cycle no longer runs the
formula) and what remains (function-local constants and no named function
expressions on the path, kept as convention; the tsx guard; the loud fallback).
`docs/CALIBRATION.md` and `ARCHITECTURE.md` name the leaf.

**Kept for the feature-length candidate:** bodies unreformatted and
unreordered, so its three edits inside these functions (`SUB_DENSITY_STEEPNESS`
50 -> 2, scarcity saturation, `subDensityCurve` + hoisted `logistic`) port onto
the leaf as a mechanical conflict; the leaf exports `scarcityPenalty` for the
candidate's `sceneTermSaturationScenes`. See [[Branch - Feature-Length Defects]].

**Related:** [[Audit - 2026-09-21 Prod Loader Guard]], [[Patterns]],
`docs/audits/2026-09-21-craft-formula-leaf/README.md`.

## Sources

- `docs/audits/2026-09-21-craft-formula-leaf/README.md`
- `server/nvm/analyze/craft-formula.ts`
- `server/nvm/analyze/doctor.ts`
- `server/nvm/analyze/calibration/reference.ts`
- `tests/core/craft-formula-leaf.test.ts`
- `tests/core/doctor-calibration-under-tsx.test.ts`
- `tests/core/calibration.test.ts`
- `scripts/lib/import-graph.mjs`
- `CLAUDE.md`
- `docs/p1-benchmark/MEASUREMENT_RECEIPTS.md`
