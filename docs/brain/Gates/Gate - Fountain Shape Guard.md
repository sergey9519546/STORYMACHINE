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

**2026-09-12 re-derivation (adversarial review finding 10):** 300,000 bound
at a cast of 300,000 / ~15,000 ≈ 20 on an ORDINARY feature-length script —
an entirely routine 20-speaking-character ensemble (heist, courtroom drama,
war film, TV pilot) got no score and no report, contradicting the
neighbouring `MAX_FOUNTAIN_FREQUENT_CUE_LINES` comment's own "a real
large-ensemble feature can comfortably have dozens of characters."
Re-derived by measurement: six `runScriptDoctor` timings on a Zipf-
distributed, 35-word-floor, 110-page probe-cast feature (casts 15-60, all
finishing in 8-14s, confirming cast 20 crosses the OLD bound at weight
303,000); the lightest payload the security suite's own DoS/bypass
fixtures pin as REJECTED via this bound (ROUND 3's "bypass B",
weight 1,920,000); new bound **1,500,000**, bracketed strictly between a
measured 40-cast normal feature (606,000) and that lightest attack fixture
— derived independently from `MAX_FOUNTAIN_FREQUENT_CUE_LINES`'s own
"dozens ... not HUNDREDS" framing (99 characters × ~15,150 words ≈
1,499,850). The scoring branch `scoring/feature-length-defects`
independently re-derived the SAME value from a different (heavier)
normal-feature assumption, bracketed inside [1,331,970, 1,920,000) — both
land on 1,500,000, agreeing the binding constraint is the same upper bound
(bypass B).

**Command:**
`node --experimental-strip-types tests/security/fountain-shape-guard-cue-parity.test.ts`
(part of `npm test`) — 654 cases after the 2026-09-12 addition, all of
rounds 2-7's pinned decisions unchanged; the "finding 10" describe block
adds the 20/30/40-cast ACCEPTED proof and a direct (computed, not literal)
assertion that the bound stays strictly below bypass B's weight.

**Where it lives:** `server/lib/validation.ts`
(`MAX_FOUNTAIN_VOICE_ELIGIBLE_WEIGHT`'s own header comment carries the full
six-timing derivation and bracket); `docs/CLAIMS_REGISTER.md` row 69 (the
guard's user-facing rejection sentence interpolates the constant directly,
so it stayed true across the value change without a wording edit — only
the quoted number).

**What it cannot catch:** the real cost driver is `analyzeVoices`'s
O(distinct²) pair count, not this product directly — a large-but-plausible
cast with an unusually high per-pair cost could still be expensive within
this bound. The investigator's proposed fix (cap the number of voice-
compared pairs rather than reject the document) is scoring-path
(`analyzeVoices`) and is the scoring lane's, not this bound's, to make.

## Sources

- `server/lib/validation.ts` (`MAX_FOUNTAIN_VOICE_ELIGIBLE_WEIGHT`,
  `realVoiceEligibleWeightRejectionReason`)
- `tests/security/fountain-shape-guard-cue-parity.test.ts` ("finding 10"
  describe block)
- `docs/audits/2026-09-12-adversarial/engine-logic.md` finding 10
- `docs/CLAIMS_REGISTER.md` row 69
