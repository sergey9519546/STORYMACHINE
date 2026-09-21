---
type: audit
updated: 2026-09-20
sources: [docs/audits/2026-09-20-burrows-delta-hoist/README.md, server/nvm/analyze/voice-delta.ts, server/nvm/analyze/fountain-analyzer.ts, server/lib/validation.ts, scripts/lib/voice-bound.ts, tests/core/voice-delta-hoist-identity.test.ts, tests/core/voice-delta.test.ts, tests/core/voice-bound-derivation.test.ts, tests/security/fountain-shape-guard-cue-parity.test.ts, docs/p1-benchmark/MEASUREMENT_RECEIPTS.md]
status: active
---

# Audit — 2026-09-20 Burrows Delta Hoist

**Directory:** `docs/audits/2026-09-20-burrows-delta-hoist/` — the lane record
for `lane/burrows-delta-hoist`, branched from `925164dc`.

## What it answers

`burrowsDelta` (`server/nvm/analyze/voice-delta.ts`) computed both characters'
relative frequencies once, into `freqA` and `freqB`, and then called
`corpusStats({ a, b }, word, words)` from INSIDE its loop over the 65 function
words. `corpusStats` builds its samples with
`Object.values(allDialogues).map(lines => relativeFrequencies(lines, ...)[word])`,
so it re-tokenized and re-counted BOTH characters' entire pooled dialogue on
every iteration, to read one number out of a 65-key map it had just rebuilt —
**130 full re-derivations per character pair**, on top of `analyzeVoices`'s
O(distinct²) pair count.

**Fix.** `combinedCorpusStats(freqA, freqB, functionWords)` produces every word's
`{ mean, sd }` in one pass before the loop. It is the old `corpusStats` body with
its two `reduce` calls unrolled over the exactly two samples it was ever handed
(`Object.values({ a, b })` — always length 2, always a then b), **including the
`0` seed each reduce started from**, because IEEE-754 addition is not associative
and the accumulation sequence is what keeps the doubles identical. The old
function's `length === 0` / `length < 2` early returns were unreachable from
`burrowsDelta` and are not reproduced. Exported signature, degenerate guard,
return expression and every abstention rule are untouched.

**Why it mattered now.** `docs/audits/2026-09-20-feature-length-defects-prep/`
§6.1 names this hoist as the ONE blocker on
`origin/lane/land-feature-length-defects`: that branch's per-character voice
eligibility makes `assembled-feature.fountain` fully eligible at a weight of
443,990, only 1.52x under the 675,000 bound against a 3x demand, and raising the
bound was not available. `server/lib/validation.ts` had already identified the
hoist (2026-09-13 review finding 7) and recorded that the lane which found it
could not land it, because `voice-delta.ts` is reachable from `doctor.ts` and so
needs a measurement receipt.

## Why it is safe to have merged

Bit-identity, not tolerance. `tests/core/voice-delta-hoist-identity.test.ts`
holds a frozen verbatim copy of `git show 925164dc:…/voice-delta.ts`'s
implementation (top-level identifiers renamed only) and asserts
`Object.is(old, new)` over **3,706 pairs — `maxDeltaDiff = 0`**: 385 generated
(a 25-voice cast, 78 degenerate/boundary shapes including empty, single-word,
punctuation-only and all-uppercase sets, four 2,000-line sets, three custom
function-word sets) and 3,321 from every character pair in
`tests/fixtures/feature-length/assembled-feature.fountain`. Falsified on purpose:
swapping the unrolled variance sum for the mathematically equal
`E[x^2] - mean^2` fails it at
`old 1.2380952380952381 !== new 1.2380952380954005`. A merely commutative rewrite
does not, and should not. `check-doctor-output-identity --compare` against
`git archive 925164dc` is **45/45 byte-identical**; all six public-benchmark
statistics reproduce unchanged (0.5313 / 0.5586, 0.4063 / 0.4443,
1.0000 / 0.9473) with ordered/inverted/tied counts unchanged.

Measured 43x-51x faster on the shapes the DoS bounds are derived against, and
the security suite's own cost assertion moves from `cpu 6510ms (43% of the
15000ms half-budget target)` to `cpu 300ms (2%)` — 677/677 on both trees, with
its weight-headroom line (`runoff.fountain` at 170.0x) identical, as a
cost-only change requires. **No bound was re-derived:**
`MAX_FOUNTAIN_VOICE_ELIGIBLE_WEIGHT` stays 675,000,
`MAX_FOUNTAIN_VOICE_ELIGIBLE_DISTINCT` stays 80, and
`tests/fixtures/voice-bound-derivation.json` is untouched — they are now
conservative rather than wrong, and re-deriving them needs a fresh
`npm run measure-voice-bound` on the runner. No floor in `scripts/lib/auc.ts`
moved, no re-lock ran, and no real-corpus figure is claimed: the private AUC-24
corpus is not present in this environment. The receipt is the 2026-09-20 entry
headed "burrowsDelta HOISTS THE CORPUS STATISTICS OUT OF ITS WORD LOOP" in
`docs/p1-benchmark/MEASUREMENT_RECEIPTS.md`, and
`node scripts/check-scoring-receipt.mjs 925164dc..HEAD` exits 0 on it.
`npm test` in full and `npm run brain` were out of scope for this lane and were
not run.

**Related:** [[Audit - 2026-09-19 Cast Grounding]], [[Patterns]],
`docs/audits/2026-09-20-burrows-delta-hoist/README.md`.

## Sources

- `docs/audits/2026-09-20-burrows-delta-hoist/README.md`
- `server/nvm/analyze/voice-delta.ts`
- `server/nvm/analyze/fountain-analyzer.ts`
- `server/lib/validation.ts`
- `scripts/lib/voice-bound.ts`
- `tests/core/voice-delta-hoist-identity.test.ts`
- `tests/core/voice-delta.test.ts`
- `tests/core/voice-bound-derivation.test.ts`
- `tests/security/fountain-shape-guard-cue-parity.test.ts`
- `docs/p1-benchmark/MEASUREMENT_RECEIPTS.md`
