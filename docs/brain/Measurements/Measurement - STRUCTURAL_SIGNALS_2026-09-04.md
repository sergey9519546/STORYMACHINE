---
type: measurement
updated: 2026-09-05
sources: [docs/scoring/STRUCTURAL_SIGNALS_2026-09-04.md]
status: active
---

# Measurement — STRUCTURAL_SIGNALS_2026-09-04

**Question:** build dense, lexicon-free readings from pure counts (words,
lines, sentences, speech turns, speakers) as a candidate structural-signal
channel — module `server/nvm/analyze/structural-signals.ts`, additive
optional `ScriptDoctorReport.structuralSignals` field. Measure with
`node --experimental-strip-types scripts/measure-structural-signals.ts`.

**Status: nothing in this document changes a score.** Diagnostic only — no
`health`, `grade`, `verdict`, `dimension`, or `topPriorities` entry is
derived from it.

**Verdict counts:** ten of twelve channels fire on 75-100% of scenes (the
lexicon channels driving today's advice fire on 7%).
`meanAbsDialogueShareDelta` orders all three separation sets (audit pair,
calibration bands 0.960, blind pairs 0.833, using set D — the six blind
matched pairs from [[Measurement - BLIND_PAIRS_2026-09-04]]) and
`actionSentenceCvOverall` orders both real-prose sets. The honest
counter-evidence: `meanSpeakersPerScene`, pre-registered with NO direction,
orders 32 of 32 pairs, with winners anti-correlating with it — "fewer
people talking" may be what actually separates.

**What this fed:** shown on every surface — see [[Surface - Script Doctor Panel]],
[[Surface - Coverage Letter]], [[Surface - Versions and Snapshots]],
[[Surface - Slate]], [[Surface - What-If Lab]], [[Surface - Fix and Verify]]
— wired into nothing that scores.

## Sources

- `docs/scoring/STRUCTURAL_SIGNALS_2026-09-04.md`
