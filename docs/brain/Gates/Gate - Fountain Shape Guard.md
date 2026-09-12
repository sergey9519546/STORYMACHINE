---
type: gate
updated: 2026-09-12
sources: [server/lib/validation.ts, tests/security/fountain-shape-guard-cue-parity.test.ts, tests/routes/fountain-shape-guard-cue-bypass.test.ts]
status: active
---

# Gate — Fountain Shape Guard

**What it checks:** every route that accepts raw Fountain text runs
`fountainShapeRejectionReason()` (`server/lib/validation.ts`) before the
text ever reaches the analyzer — a set of cost bounds (distinct cue-shaped
lines, cue weight, frequent-cue-line count, boneyard variants, and the
voice-eligible-weight bound below) that reject a pathological shape fast
rather than let it pay for a multi-minute or non-terminating analysis. Not
scoring-path: `server/lib/validation.ts` sits outside
`server/nvm/analyze/doctor.ts`'s import graph (see
[[Gate - Pure-Core Boundary]]), so a bound change here needs no
[[Gate - Receipt Gate]] entry.

**The bound this note tracks: `MAX_FOUNTAIN_VOICE_ELIGIBLE_WEIGHT`.**
Rejects once every distinct speaking character clears
`VOICE_ELIGIBLE_MIN_WORDS` (30 — the one condition under which
`voice-delta.ts`'s O(distinct²) Burrows's-Delta pass actually runs) AND
`(eligible character count) × (their total pooled dialogue words)` exceeds
the bound.

**2026-09-05/06 (rounds 2-7):** the reviewed-and-fixed value, 300,000,
closed a real DoS (multiple ACCEPTED payloads measured at 72s-5m44s).

**2026-09-12 ROUND 1 re-derivation (adversarial review finding 10):** 300,000
bound at a cast of 300,000 / ~15,000 ≈ 20 on an ORDINARY feature-length
script — an entirely routine 20-speaking-character ensemble (heist,
courtroom drama, war film, TV pilot) got no score and no report,
contradicting the neighbouring `MAX_FOUNTAIN_FREQUENT_CUE_LINES` comment's
own "a real large-ensemble feature can comfortably have dozens of
characters." Re-derived from FIXTURE WEIGHTS: six `runScriptDoctor` timings
on a Zipf-distributed, 35-word-floor, 110-page probe-cast feature (casts
15-60, all finishing in 8-14s); the lightest payload the security suite's
own DoS/bypass fixtures pin as REJECTED via this bound (ROUND 3's "bypass
B", weight 1,920,000); bound set to **1,500,000**, bracketed between a
measured 40-cast normal feature (606,000) and that attack fixture.

**2026-09-12 ROUND 2 correction** (independent review,
`docs/audits/2026-09-12-adversarial/rulebook-review.md` BLOCKER item 1):
round 1's derivation bracketed WEIGHT, not COST, and missed that
`VOICE_ELIGIBLE_MIN_WORDS`=30 caps the distinct count a given weight can buy
at `sqrt(weight / 30)`. At 1,500,000 that is **223** speakers each at
exactly 30 words — a 50 KB document, ACCEPTED, costing **27.3-27.6s** in
`runScriptDoctor` (91% of the 30s `DOCTOR_ANALYSIS_BUDGET_DEFAULT_MS`, see
[[Decision 7 - Per-Analysis Wall-Clock Budget]]) — a real DoS regression
against the OLD 300,000 bound's ~6.4s ceiling for the same shape. Weight is
not a safe cross-shape cost proxy: at essentially equal weight, a few-big
shape (99 speakers × ~15,150 words) cost 16.1s while this "uniform-min"
shape (every speaker at the eligibility floor, maximizing distinct count)
cost 27.3s — `analyzeVoices` is O(distinct²), and distinct count, not the
weight product, is what actually drives cost. Re-derived from COST directly
on the worst-case (uniform-min) shape: swept N=100-223 on the lane's box
(rate 0.0173-0.0187 ms/unit, consistent with this file's older 0.01-0.022
ms/unit fit), targeting HALF the 30s budget (15s — mirroring
[[Decision 7 - Per-Analysis Wall-Clock Budget]]'s own 2× headroom logic).
N=150 (12.1s median) clears it; N=160 (14.3s) does not. New bound:
**675,000** (= 150² × 30). This narrows what round 1 admitted: the brief's
explicit 20/30/40-cast targets stay ACCEPTED (weights 303,000-606,000, all
measured well under 11s on the cheap few-big shape), but a 60-cast
fully-eligible ensemble (909,000) is now correctly REJECTED — disclosed,
not hidden; unlocking larger ensembles safely needs `analyzeVoices`'s
O(distinct²) pair count capped (scoring-path, the scoring lane's item), not
a further raise of this bound. Bypass B's margin widened from 1.28x to
2.84x.

**Command:**
`node --experimental-strip-types tests/security/fountain-shape-guard-cue-parity.test.ts`
(part of `npm test`) — 657 cases after round 2, all of rounds 2-7's pinned
decisions unchanged; the "finding 10" describe block asserts the
N=150/N=151 uniform-min boundary directly (150 ACCEPTED with its measured
`runScriptDoctor` cost under margin, 151 REJECTED), 20/30/40-cast ACCEPTED,
60-cast REJECTED, and that the bound stays strictly below bypass B's
weight (computed from its own generator, not a literal).

**Where it lives:** `server/lib/validation.ts`
(`MAX_FOUNTAIN_VOICE_ELIGIBLE_WEIGHT`'s own header comment carries the full
round-1 and round-2 derivations, the sweep, the rate fit, and the bracket);
`docs/CLAIMS_REGISTER.md` row 69 (the guard's user-facing rejection
sentence interpolates the constant directly, so it stayed true across both
value changes without a wording edit — only the quoted number).

**What it cannot catch:** the real cost driver is `analyzeVoices`'s
O(distinct²) pair count, not this product directly — round 2 derives the
bound from the worst-case (uniform-min) shape specifically to close the
round-1 gap, but a future shape this derivation did not anticipate could
still expose the same mismatch at a different point. The investigator's
proposed fix (cap the number of voice-compared pairs rather than reject the
document) is scoring-path (`analyzeVoices`) and is the scoring lane's, not
this bound's, to make — it is also the only way to safely ACCEPT casts
larger than ~150 without reopening this exact regression.

## Sources

- `server/lib/validation.ts` (`MAX_FOUNTAIN_VOICE_ELIGIBLE_WEIGHT`,
  `realVoiceEligibleWeightRejectionReason`)
- `tests/security/fountain-shape-guard-cue-parity.test.ts` ("finding 10"
  describe block)
- `docs/audits/2026-09-12-adversarial/engine-logic.md` finding 10
- `docs/audits/2026-09-12-adversarial/rulebook-review.md` round 1, BLOCKER
  item 1
- `docs/CLAIMS_REGISTER.md` row 69
