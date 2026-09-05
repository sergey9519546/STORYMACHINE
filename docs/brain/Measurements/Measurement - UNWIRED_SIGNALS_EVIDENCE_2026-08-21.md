---
type: measurement
updated: 2026-09-05
sources: [docs/p1-benchmark/UNWIRED_SIGNALS_EVIDENCE_2026-08-21.md]
status: active
---

# Measurement — UNWIRED_SIGNALS_EVIDENCE_2026-08-21

**Question:** ROADMAP/PATH_TO_EXCELLENCE item P-1 — wire-or-retire four
unwired analysis signals (`agency-signal.ts`, `question-latency-deduction.ts`,
`reversal-detection.ts`, `truth-extraction.ts`) by measuring each against
the 125-film annotated corpus, reusing
[[Measurement - STRESS_LEDGER_CALIBRATION_2026-08-11]]'s already-proved
method.

**Status: EVIDENCE ONLY.** Nothing in this document changes a scoring path
— `node scripts/check-scoring-receipt.mjs` exits 0 (no scoring-path file
touched). Script:
`node --experimental-strip-types scripts/measure-unwired-signals.ts`.

**What was NOT reproduced:** this is the measurement lane itself; see the
source document for the per-signal wire/retire recommendation it produced.

## Sources

- `docs/p1-benchmark/UNWIRED_SIGNALS_EVIDENCE_2026-08-21.md`
