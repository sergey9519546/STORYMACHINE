---
type: measurement
updated: 2026-09-05
sources: [docs/p1-benchmark/TEMPORAL_ORDER_SENSITIVITY_2026-08-03.md]
status: active
---

# Measurement — TEMPORAL_ORDER_SENSITIVITY_2026-08-03

**Question:** a cheap, runnable measurement of whether
`server/nvm/analyze/temporal-consistency.ts`'s contradiction output actually
changes under scene reordering — the one candidate examined so far with its
own extractor already built and wired (diagnostic-only), rather than
needing new extraction work first.

**What it is not:** a gate measurement. It runs on **n=30** scripts, not
the 761-script P1 corpus, and states n beside every statistic — no figure
here may be quoted as a P1 gate result. Reproduce with
`node scripts/probe-temporal-order-sensitivity.mjs`.

**What was NOT reproduced:** no corpus-scale claim is made or implied by
this document.

## Sources

- `docs/p1-benchmark/TEMPORAL_ORDER_SENSITIVITY_2026-08-03.md`
