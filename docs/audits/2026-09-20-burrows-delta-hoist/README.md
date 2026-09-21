# Lane record — 2026-09-20 `burrowsDelta` corpus-statistics hoist

`lane/burrows-delta-hoist`, branched from `925164dc`. A **scoring-path
performance change that moves no number**: one function in
`server/nvm/analyze/voice-delta.ts` stops recomputing, 130 times per character
pair, a statistic it can compute once.

This lane was opened by §6.1 of
`docs/audits/2026-09-20-feature-length-defects-prep/README.md` (on
`origin/lane/land-feature-length-defects`), which names it as **the one item
that must be settled before that branch can land**. That branch makes
voice-eligibility per-character, which makes `assembled-feature.fountain` fully
eligible and so makes the shape guard read a voice-eligible weight of 443,990 —
clearing the 675,000 bound with only 1.52x headroom against the suite's own 3x
demand. Raising the bound was not available (§2.2 there). Making the cost the
bound is derived against far smaller is, and it costs the score nothing.

**This lane does not raise either bound.** It removes the reason they are as low
as they are. Re-deriving them is a separate lane with a fresh
`npm run measure-voice-bound` on the runner.

## 1. The commits

| commit | what |
|---|---|
| `perf(voice): burrowsDelta computes the corpus statistics once per pair, bit-identical` | `server/nvm/analyze/voice-delta.ts`, `tests/core/voice-delta-hoist-identity.test.ts` (new), comment-only corrections in `server/lib/validation.ts`, and the receipt appended at the end of `docs/p1-benchmark/MEASUREMENT_RECEIPTS.md` |
| `docs(audit): burrows delta hoist lane record` | this file and `docs/brain/Audits/Audit - 2026-09-20 Burrows Delta Hoist.md` |

The receipt is the authority for every measured figure; this record explains
the change and the reasoning around it.

## 2. The defect

`burrowsDelta(a, b, functionWords)` computed both characters' relative
frequencies once, into `freqA` and `freqB` — and then, inside its loop over the
65 function words, called

```ts
const { mean, sd } = corpusStats(allDialogues, word, words);
```

`corpusStats` derives its samples with
`Object.values(allDialogues).map(lines => relativeFrequencies(lines, functionWords)[word])`.
It therefore re-tokenized and re-counted **both** characters' entire pooled
dialogue on **every** iteration, to read one number out of a 65-key map — two
maps the caller was already holding. 2 x 65 = **130 full re-derivations per
pair**, of which 128 were waste and the other two were duplicates.

The cost is quadratic in cast size on top of that, because `analyzeVoices` is
O(distinct²) in pairs. `server/lib/validation.ts`'s two voice-eligibility
bounds exist entirely to cap that product, and its own comment had already
identified this hoist as the fix that would let them rise ("WHAT WOULD LET BOTH
BOUNDS RISE, AND IT IS NOT A PAIR CAP", 2026-09-13 review finding 7) while
noting that the lane which found it could not land it: `voice-delta.ts` is
reachable from `doctor.ts`, so it is scoring-path and needs a receipt.

## 3. The change

`corpusStats` is replaced by `combinedCorpusStats(freqA, freqB, functionWords)`,
which produces the `{ mean, sd }` for every function word in one pass over the
word set, from the two frequency maps already computed, before the loop runs.

The arithmetic is deliberately written the long way:

```ts
let meanSum = 0;
meanSum = meanSum + fA;
meanSum = meanSum + fB;
const mean = meanSum / SAMPLE_COUNT;

let varianceSum = 0;
varianceSum = varianceSum + (fA - mean) ** 2;
varianceSum = varianceSum + (fB - mean) ** 2;
const variance = varianceSum / SAMPLE_COUNT;
```

That is the old `corpusStats` body with its two `Array.prototype.reduce` calls
unrolled over the exactly two samples it was ever handed — `Object.values({ a,
b })` is always length 2, always in that order — **including the `0` seed each
reduce started from**. Floating-point addition is not associative, so preserving
the accumulation sequence (seed, then a, then b) is what makes the result
identical rather than merely close. The old function's `freqs.length === 0` and
`freqs.length < 2` early returns were unreachable from `burrowsDelta` and are
not reproduced; a comment at the site says so. `corpusStats` had no other caller
and was not exported, so it is gone.

Unchanged: the exported signature, the `a.length === 0 || b.length === 0`
degenerate guard, the `count > 0 ? sumAbsDelta / count : 0` return, the
`DEFAULT_FUNCTION_WORDS` set, `tokenize`, `relativeFrequencies`, and every one
of `analyzeVoices`'s abstention rules.

One further edit to the same file is a correction, not a change: its 2026-08-03
header still said the module had "zero importers anywhere in the repo except its
own test". `fountain-analyzer.ts` has imported `analyzeVoices` since the
extractor gap that note describes was closed, which is exactly why this lane
needs a receipt. The dated text is left as written with a dated correction above
it.

## 4. Evidence

Full figures, commands, corpus fingerprints and attestation are in the receipt
(`docs/p1-benchmark/MEASUREMENT_RECEIPTS.md`, the 2026-09-20 entry headed
"burrowsDelta HOISTS THE CORPUS STATISTICS OUT OF ITS WORD LOOP"). In summary:

| evidence | result |
|---|---|
| Doctor output identity vs `git archive 925164dc`, both `GIT_SHA=dev` | `OUTPUT IDENTITY: PASS — all 45 reports are byte-identical (analyzedAt excluded).` |
| Bit-identity against the frozen `925164dc` implementation | **3,706 pairs, `maxDeltaDiff = 0`** (385 generated + 3,321 from `assembled-feature.fountain`) |
| Public benchmark, all six statistics | 0.5313 / 0.5586, 0.4063 / 0.4443, 1.0000 / 0.9473 — unchanged; ordered/inverted/tied unchanged too |
| `tests/security/fountain-shape-guard-cue-parity.test.ts` | 677 pass / 0 fail on BOTH trees |
| Its cost line, `925164dc` -> here | `cpu 6510ms (43% of the 15000ms half-budget target), wall 6415ms` -> `cpu 300ms (2% ...), wall 246ms` — **21.7x more margin** |
| Its weight-headroom line, both trees | `worst tracked fixture is "data/screenplays/runoff.fountain" at 170.0x` — identical, as it must be |
| `analyzeVoices` on `max-admitted` cast 80 (3,160 pairs) | 5974.4 / 5966.2 / 6046.6 ms -> 120.8 / 118.1 / 117.7 ms — **50.7x** |
| `analyzeVoices` on `uniform-min` cast 150 (11,175 pairs) | 10342.5 / 10566.0 / 10187.1 ms -> 235.8 / 236.3 / 236.8 ms — **43.2x** |
| `analyzeFountainText` end to end, max-admitted document | 5666.0 / 6163.1 / 6165.9 ms -> 151.2 / 133.1 / 131.4 ms — **43.1x** |

The bit-identity test is not a formality, and that was demonstrated rather than
asserted: replacing the unrolled variance sum with the mathematically equal
`E[x^2] - mean^2` makes it fail immediately —
`GEN_0 x GEN_1: old 1.2380952380952381 !== new 1.2380952380954005` — and the
file was restored from a byte copy taken before the probe. Note that a
*commutative* rewrite (`fB + fA`) does NOT fail it, because IEEE-754 addition is
commutative; it is associativity the test defends.

## 5. What this lane deliberately did not do

- **It did not move `MAX_FOUNTAIN_VOICE_ELIGIBLE_WEIGHT` (675,000) or
  `MAX_FOUNTAIN_VOICE_ELIGIBLE_DISTINCT` (80),** and it did not touch
  `tests/fixtures/voice-bound-derivation.json`. Both were derived on the GitHub
  runner, under `npm test`, on PRE-hoist code. They are therefore now
  conservative — the worst admitted shape costs roughly a fortieth of what the
  derivation charged it — rather than wrong. A bound that is too strict rejects
  documents it could serve, which is a narrowing to re-open on purpose with a
  fresh `npm run measure-voice-bound` on the runner, not a side effect of a perf
  lane. `tests/core/voice-bound-derivation.test.ts` (8/8) is the guard that
  enforces exactly that.
- **It did not touch any floor in `scripts/lib/auc.ts`,** and ran no re-lock of
  any kind. `AUC24_FLOOR` stays 0.622, `AUC24_DEGRADATION_ID` stays
  `shuffle-drop/v4`.
- **It claims no real-corpus figure.** The private AUC-24 corpus is not present
  in this environment; `REAL_SCRIPT_CORPUS_DIR` is unset here.
- **It did not fix `analyzeVoices`'s all-or-nothing abstention.** At this commit
  the channel still abstains on `assembled-feature.fountain` because one
  character is under the 30-word floor, so end to end that fixture measures the
  same before and after (38.8 / 29.3 / 31.8 ms -> 44.8 / 32.1 / 31.8 ms). Its
  3,321 pairs cost 7.5 s to score before this change and 0.15 s after, which is
  what the feature-length branch's per-character eligibility will actually pay.
  That fix belongs to that branch, not to this one.

## 6. Gate table

| gate | result |
|---|---|
| `npm run lint` (`tsc --noEmit`) | pass, no errors |
| `npm run check-no-console` | pass — 312 file(s) checked, all proven unreachable |
| `npm run gates` | pass |
| `node scripts/check-scoring-receipt.mjs 925164dc..HEAD` | pass |
| `node scripts/check-doctor-output-identity.mjs --compare` | `OUTPUT IDENTITY: PASS — all 45 reports are byte-identical (analyzedAt excluded).` |
| `npm run benchmark:public -- --json` | six statistics unchanged |
| `tests/core/voice-delta.test.ts` | 14/14 |
| `tests/core/voice-delta-hoist-identity.test.ts` (new) | 3/3 |
| `tests/core/voice-separation-abstention.test.ts` | 15/15 |
| `tests/core/voice-bound-derivation.test.ts` | 8/8 |
| `tests/security/fountain-shape-guard-cue-parity.test.ts` | 677/677 |
| `tests/core/script-doctor.test.ts` | 86/86 |
| `tests/core/calibration.test.ts` | 21/21 |
| `tests/core/public-benchmark.test.ts` | 28/28 |
| `tests/core/public-benchmark-limits.test.ts` | 7/7 |
| `tests/core/coverage-html.test.ts` | 54/54 |
| `tests/core/honesty-audit-claims.test.ts` | 15/15 |
| `tests/core/auc24-table.test.ts` | 3 pass, 6 skipped (no locked table, as documented) |
| `tests/core/brain-coverage.test.ts` | see §7 |

`npm test` in full and `npm run brain` were out of scope for this lane and were
not run. Nothing was pushed.

## 7. Brain coverage

`docs/brain/Audits/Audit - 2026-09-20 Burrows Delta Hoist.md` cites
`docs/audits/2026-09-20-burrows-delta-hoist/` so check (b) is satisfied. Check
(e) — the generated graph's freshness, `npm run brain` — is expected to fail
until the graph is regenerated, which this lane was told not to do.
