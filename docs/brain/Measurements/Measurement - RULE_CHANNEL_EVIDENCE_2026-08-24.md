---
type: measurement
updated: 2026-09-05
sources: [docs/p1-benchmark/RULE_CHANNEL_EVIDENCE_2026-08-24.md]
status: active
---

# Measurement — RULE_CHANNEL_EVIDENCE_2026-08-24

**Question:** PATH_TO_EXCELLENCE item P-2 — run the rule-catalog retirement
evidence bar B1-B7 (channel-zero AUC on the real corpus). The project's own
rebuild experiment had measured the weighted-rule channel as inverted; this
settles it.

**Status of this document: EVIDENCE ONLY.** Nothing is retired and nothing
here authorizes a removal — `node scripts/check-scoring-receipt.mjs` exits
0 with no receipt.

**Verdict counts:** **246 rules fire only on degraded scripts**; removing
exactly that tier drops pooled AUC **0.572 → 0.530** (SCENE_SHUFFLE
**0.487 → 0.342**). Retirement bar item **B5 breaks** — full channel-zero
collapses the calibration bands until "weak" ties "strong," and
monotonicity is not even monotone in K. Five rules outscore all 906 that
ever fire (0.753 vs. 0.572 — the only non-overlapping CI pair in the run).

**Conclusion: the rule-catalog retirement design's core premise is false**
— see [[Patterns]], "a brief's premise as hypothesis."

## Sources

- `docs/p1-benchmark/RULE_CHANNEL_EVIDENCE_2026-08-24.md`
