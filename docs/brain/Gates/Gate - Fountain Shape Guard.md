---
type: gate
updated: 2026-09-13
sources: [server/lib/validation.ts, tests/security/fountain-shape-guard-cue-parity.test.ts, tests/routes/fountain-shape-guard-cue-bypass.test.ts, tests/core/voice-bound-derivation.test.ts, tests/fixtures/voice-bound-derivation.json]
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

**The bounds this note tracks: `MAX_FOUNTAIN_VOICE_ELIGIBLE_WEIGHT` and, since
2026-09-13, `MAX_FOUNTAIN_VOICE_ELIGIBLE_DISTINCT` beside it.**
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
2.84x. *(2026-09-13: the "pair count capped" pointer in this dated paragraph is
corrected in the 2026-09-13 section below — the pair count is not what makes a
pair expensive.)*

**2026-09-13 — the second bound, derived on the machine that enforces it.**
The first real Actions run since 2026-09-02 failed the cost assertion above:
the worst shape 675,000 admits (uniform-min N=150) cost **19,713 ms** and, on
a re-run, **21,133 ms** of CPU on `ubuntu-latest` against the 15,000 ms
half-budget target. The round-2 derivation was sound in method and silent
about its machine ("this box", "the reviewer's box"); the machine that
enforces it is the runner, which is about 1.7x slower under the parallel
`npm test` the assertion runs inside. Re-deriving the WEIGHT bound downward
does not work and the arithmetic says so before any measurement: the
realistic ensembles this bound exists to serve weigh 457,200 (30-cast) and
609,600 (40-cast), so any weight bound the runner can carry rejects an
ordinary 40-character feature and reopens the finding-10 regression. The fix
is a SECOND bound on the quantity that actually drives the cost —
`MAX_FOUNTAIN_VOICE_ELIGIBLE_DISTINCT` = **80**, the eligible cast
count — derived on `ubuntu-latest` by
`.github/workflows/calibrate-voice-bound.yml` against the heaviest document
the weight bound still admits at each cast (`max-admitted`: d speakers each
carrying floor(675,000 / d²) words, which at d=60 is 186 words, not the 30
`uniform-min` gives it). It REMOVES NOTHING: the weight bound is untouched
and evaluated FIRST, so every pinned DoS/bypass payload keeps the message it
has always had, and the cast bound only turns ACCEPTs into REJECTs — the
**81-150**-speaker shapes that weighed under 675,000 (uniform-min at N=81/90/
100/110/120 weighs 196,830 / 243,000 / 300,000 / 363,000 / 432,000, all under
the weight bound), of which the heaviest, N=150, cost **20,022 ms** on the
runner under the calibration's load proxy and 11,986 ms idle — both in the
committed table. The range is asserted against the guard in the finding-10
block rather than restated in prose: an earlier draft of it said "121-150",
understating the narrowing by forty casts. The table is committed at
`tests/fixtures/voice-bound-derivation.json` and
`tests/core/voice-bound-derivation.test.ts` re-derives the constant from it
on every CI run, so the constant cannot be edited without a fresh
measurement. Reproduce with `npm run measure-voice-bound`.

**What 2026-09-13 could NOT establish.** That the half-budget CPU target is
a statement about this guard at all on that machine. A legitimate,
accepted 40-character feature costs **12,057 ms** there under the
calibration's load proxy — 80% of the ceiling on its own. Most of that
budget is the analyzer's baseline cost on a feature-length document, which
no cast bound can buy margin against. See [[Audit - 2026-09-13 CI Green]].

**Command:**
`node --experimental-strip-types tests/security/fountain-shape-guard-cue-parity.test.ts`
(part of `npm test`) — 662 cases after the 2026-09-13 cast bound, all of
rounds 2-7's pinned decisions unchanged; the "finding 10" describe block
asserts the max-admitted N=80/N=81 boundary directly
(80 ACCEPTED with its measured `runScriptDoctor` cost under half the
budget of CPU and the machine named in the failure message and in a TAP
diagnostic on pass, 81 REJECTED), that uniform-min N=150 — the
document the 2026-09-12 bound sat exactly on — is now REJECTED by the cast
bound, that N=151 is still rejected by the WEIGHT bound (so no pinned
rejection changed its message), 20/30/40-cast ACCEPTED, 60-cast REJECTED,
and that the weight bound stays strictly below bypass B's weight (computed
from its own generator, not a literal).
`node --experimental-strip-types tests/core/voice-bound-derivation.test.ts`
re-derives the cast bound from the committed runner table.

**Where it lives:** `server/lib/validation.ts`
(`MAX_FOUNTAIN_VOICE_ELIGIBLE_WEIGHT`'s own header comment carries the full
round-1 and round-2 derivations, the sweep, the rate fit, and the bracket);
`docs/CLAIMS_REGISTER.md` row 69 (the guard's user-facing rejection
sentence interpolates the constant directly, so it stayed true across both
value changes without a wording edit — only the quoted number).

**What it cannot catch (and what would let both bounds rise).** Neither bound
constrains document size or scene count: the derivation shape has TWO scene
headings, and the same 80-speaker eligible body padded to the analyzer's
400-scene ceiling is ACCEPTED by both and cost 14,334 ms of CPU where the
derivation shape reads 7,800 ms (1.84x, same box, same harness; `analyzeVoices`
does not abstain, so the `RESIDUAL accepted worst case` note does not cover it).
These bounds bound the ELIGIBLE-SPEAKER dimension of the cost, not the cost.

And the fix that would raise them is **not** a pair cap. `burrowsDelta`
re-derives both characters' relative frequencies 130 times per pair — inside the
loop over the 65 function words, of two maps already in hand. Hoisting it is
bit-identical (`maxDeltaDiff = 0` over every pair) and 43.8x faster on a
435-pair corpus, 56.0x / 54.3x on the two shapes these bounds are derived
against. `server/nvm/analyze/voice-delta.ts` IS reachable from `doctor.ts`, so
that is scoring-path and needs a receipt — but it is free and score-preserving,
which a pair cap is not. See [[Gate - Receipt Gate]].

**What it cannot catch (2026-09-12 framing, superseded above):** the real cost
driver was described as `analyzeVoices`'s O(distinct²) pair count, not this
product directly — round 2 derives the
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
- `docs/CLAIMS_REGISTER.md` rows 69 and 116
- `tests/fixtures/voice-bound-derivation.json` (the runner's calibration
  table) and `tests/core/voice-bound-derivation.test.ts`
- `scripts/measure-voice-bound-cost.mjs`, `scripts/lib/voice-bound.ts`,
  `.github/workflows/calibrate-voice-bound.yml`
