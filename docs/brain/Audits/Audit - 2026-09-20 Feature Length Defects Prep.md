---
type: audit
updated: 2026-09-21
sources: [docs/audits/2026-09-20-feature-length-defects-prep/README.md, docs/audits/2026-09-20-parked-branches/README.md, docs/p1-benchmark/MEASUREMENT_RECEIPTS.md, docs/p1-benchmark/PUBLIC_BENCHMARK_2026-09-06.md, docs/scoring/FEATURE_LENGTH_DEFECTS_2026-09-07.md, scripts/lib/auc.ts, server/nvm/analyze/doctor.ts, server/lib/validation.ts, src/lib/voice-separation-copy.ts, tests/security/fountain-shape-guard-cue-parity.test.ts]
status: active
---

# Audit — 2026-09-20 Feature Length Defects Prep

**Directory:** `docs/audits/2026-09-20-feature-length-defects-prep/` — the lane
record for `lane/land-feature-length-defects`, a worktree from `e79c64b4` that
merges [[Branch - Feature-Length Defects]] (`bcc96f85`, 18 commits, 42 files)
and stops. It does NOT land the branch and it is NOT a merge decision: the
owner's real-corpus run decides, and this is the evidence that run will be read
against.

## What it answers

The branch had been parked since 2026-09-11 with a ledger entry marked as
awaiting the owner's measurement, thirteen predicted conflicts against a head
that has moved four times since, and no record of what it does to the tree that
exists now. [[Audit - 2026-09-20 Parked Branches]] recommended REBASE-THEN-LAND
and named the voice-bound collision as the thing a human has to settle. This
lane does the merge, measures everything the private corpus is not needed for,
and separates what reproduces from what does not.

**Every public floor is cleared, and none was re-locked.** Shuffle-drop
matched-pair 0.5313 → **0.8750** (floor 0.855) and all-pairs 0.5586 → **0.8291**
(0.8091), both reproducing the branch's own figures exactly; climax-relocate
0.4063 → **0.5938** (0.5269) and 0.4443 → **0.5269** (0.4951), which do NOT
reproduce the branch's 0.5469 / 0.5151 and must not be compared to them — the
branch measured before `main`'s 2026-09-12 position-one fix, so this tree reads
a stronger manipulation. Control 1.0000 / **1.0000** (0.98 / 0.98). The scripts
pinned at health 76.0 fall 10 → 0 and the climax ties with them (10 → 2). Blind
pairs **1 of 6, −0.0167 → 4 of 6, +0.3833**, which is the figure
`docs/PATH_TO_EXCELLENCE.md` records for this branch, reproduced on the merged
tree. See [[Gate - Public Benchmark]].

**Feature length, measured on the one fixture long enough to show it.**
`tests/fixtures/feature-length/assembled-feature.fountain` (231 scenes) moves
84.4 `strong` → **74.4 `solid`**, which is the scarcity saturation at the scale
it was built for (`140/231 = 0.606` → `140/12 = 11.667` predicts −11.06), and
its voice channel goes from abstaining on 0 pairs to scoring **1,770 pairs with
21 characters held out** — the per-character abstention fix. The four synthetic
scale fixtures lose 8.8-9.9 points each and all cross RECOMMEND → CONSIDER; the
21 shorts gain +0.6 to +4.0 on the density steepness and the `ORPHAN_CLUE`
guard. Identity: 25 of 45 move health, RMS 9.839, 6 verdicts flip, **0 move
`sceneCount`**, and not one calibration sample moves.

## The three failures it leaves standing, on purpose

1. **The shape guard, and it blocks landing.**
   `tests/security/fountain-shape-guard-cue-parity.test.ts` 676/2: the branch's
   per-character eligibility makes the guard read the eligible SUBSET, so
   `main`'s own 2,927-line feature fixture weighs 443,990 against the 675,000
   bound — accepted, but 1.52x headroom where the branch's own assertions demand
   3x. The branch's answer, 1,500,000, is NOT taken: `main` re-derived 675,000
   plus `MAX_FOUNTAIN_VOICE_ELIGIBLE_DISTINCT` = 80 from measured cost, and
   1,500,000 admits a 223-speaker x 30-word document costing 27-36 s. The fix
   that lets both bounds rise is the `burrowsDelta` hoist (bit-identical,
   43.8-56x), recorded on [[Branch - Feature-Length Defects]].
2. **`tests/core/scene-grammar.test.ts` 15/1** — "health no longer moves when a
   writer types an ellipsis" asserted two documents score EQUAL (62.0 / 62.0 on
   `e79c64b4`, 63.0 / 64.2 here). The grammar property holds — `sceneCount` is 5
   on both, on both trees — but the second document has three more words and one
   fewer major finding, so the equality was the saturated density term absorbing
   a real difference. Re-anchoring another lane's guard is not this lane's call.
3. **`tests/core/public-benchmark.test.ts` 32/1** — the re-lock idempotence
   check, because `PUBLIC_ORDER_PAIRED_FLOOR` is the branch's 0.5269 and this
   tree measures 0.5938. No floor assertion fails. It is the only reason
   `npm run gates` exits 1.

(`tests/core/coverage-letter.test.ts` 52/1 is a fourth, on a page-count promise
whose own test says it may only be restated after re-measuring all 21 committed
screenplays.)

## What the merge decided, so a reader does not have to re-derive it

Seven docs and six code files conflicted. The graph files took OURS; the
receipts ledger kept both sides in order; the two branch notes and
[[Owner - R5 Measurement and Merge]] were UNIONED rather than picked, because
each side knew something the other did not. Three code resolutions are
behavioural and are argued in §2 of the README: `publicBenchmarkLimits` takes an
OPTIONAL result so the branch's drift fix and `main`'s cheap `--limits` flag are
one renderer; the branch's per-character eligibility and its single
`voiceEligibleWeightReason` are taken while its weight bound is not; and the
branch's held-out-characters tooltip moves INTO
`src/lib/voice-separation-copy.ts` so no surface types the channel's words
itself. The branch's PENDING ledger entry was rewritten in place into a measured
PUBLIC-CORPUS receipt with the original kept verbatim under `#### As filed on
2026-09-07` and four redactions marked inline — see [[Gate - Receipt Gate]].

## Second pass (2026-09-20, on the session head `6ca3fcd0`)

`## Second pass (on 6ca3fcd0)` in the README is the continuation of this lane
after `git merge --no-ff 6ca3fcd0` (merge commit `4229a22a`, measured at
`7d12b32d`). **Three of the four failures above are closed and `npm run gates`
exits 0.** The public floors were RE-LOCKED and none fell —
`PUBLIC_ORDER_PAIRED_FLOOR` 0.5269 -> **0.5738** and `PUBLIC_ORDER_FLOOR`
0.4951 -> **0.5069**, the other four already at `round4(measured - 0.02)` — with
the six measured values and both committed fixtures byte-for-byte unchanged,
which is the second independent proof that
[[Audit - 2026-09-20 Burrows Delta Hoist]] moves no number. The scene-grammar guard is re-anchored to `sceneCount`
equality plus `|delta health| < 2.0` (the pre-fix defect was 24.2). The coverage
letter was re-measured over all 21 screenplays (3.37 / 3.64 / 4.02 pages
shipped) and the promise restated from that measurement. Output identity against
`6ca3fcd0` reproduces the first pass exactly: 25 of 45 health moves, RMS 9.839,
6 verdicts, 0 `sceneCount`.

**The shape-guard item is still open, and it is now a METHOD blocker rather than
a cost one.** Post-hoist, the worst shape a 1,900,000 bound would admit costs
590 ms against a 15,000 ms half-budget target (the committed runner table reads
11,810 ms for the same shape pre-hoist), and exactly one tracked fixture is
under 3x while the next-worst is 170x — so any bound in [1,331,970 … 1,919,999]
clears the corpus. But the derivation fixture
[[Gate - Fountain Shape Guard]] reads (`tests/fixtures/voice-bound-derivation
.json`) must be re-measured ON A GITHUB RUNNER for any bound change, and this
lane pushes nothing. One `calibrate/**` push closes it.

## Runner lock, 2026-09-20 — §S2(a) CLOSED

The README's `## Runner lock (run 35542413222)` section is the record. GitHub
Actions run **35542413222** (`calibrate-voice-bound.yml`, `workflow_dispatch`,
ref `lane/land-feature-length-defects` @ `cfe56403`, ubuntu-latest / AMD EPYC
7763 x4 / node v24.20.0, repeats 2, idle+loaded) measured every swept shape at
**8% or less** of the 15,000 ms half-budget under load — worst 1,210 ms, at
max-admitted N=50 — against the 11,810 ms the same family read pre-hoist. Its
LOCK-FILE line is committed verbatim at
`tests/fixtures/voice-bound-derivation.json` and re-indented by the tool, never
by hand. `MAX_FOUNTAIN_VOICE_ELIGIBLE_WEIGHT` = **1,500,000** (headroom-picked
inside [1,331,970 … 1,919,999], 3.4x on the assembled feature);
`MAX_FOUNTAIN_VOICE_ELIGIBLE_DISTINCT` = **100**, re-derived from the table by the
shape guard's own fixture test, `tests/core/voice-bound-derivation.test.ts`
(746 ms against a 12,000 ms ceiling).

**The honest caveat that travels with it:** 100 is also the top of the swept
grid, and no sweep could bracket it — post-hoist the max-admitted shape gets
CHEAPER as the cast grows, and every cast the weight bound admits at all
(N=50…223) costs an order of magnitude under the ceiling. So the constant is a
conservative top-of-grid choice, not a cost boundary, and the fixture test's
bracketing assertion was re-anchored to demand a bracketing sweep again the
moment cost starts trending upward. Five cue-parity tests that pinned the old
675,000 boundary's STORY were rewritten to the derived bounds, and that suite is
**681/681**: the branch now has no failing test.

**Saturation sweep (2026-09-21).** `docs/audits/2026-09-20-feature-length-defects-prep/SATURATION_SWEEP.md` measures the D1 trade on scratch copies of `4a0ad86a` with only `SCARCITY_SATURATION_SCENES` varied (12 / 24 / 60 / 120 / none): the public benchmark, the blind pairs and all 21 calibration bands are identical at every setting, the `stapled_shorts` padding witness passes only at 12 and 13, and no setting both passes it and lifts a clean 100-scene feature to 90 — that feature reads 89.7 even with the saturation removed entirely.

## Cost-rate constant closed, 2026-09-21

The runner lock above left one item open by name:
`VOICE_ELIGIBLE_WEIGHT_MEASURED_US_PER_UNIT = 0.173`, a 2026-09-05 developer-box
rate for a shape (every speaker on exactly 32 words) that the shared generator
could not produce, so no runner row could re-fit it. The README's
"§ Cost-rate constant — left open 2026-09-20, closed 2026-09-21" is the record.
Part 1 added the shape by name (`buildUniform32`, `--uniform-32=`, workflow
input `uniform_32`) without changing any existing generator's bytes; Part 2 is
run **35553883758** (`uniform_32=97` plus the default sweep, same runner class)
— its table replaces run 35542413222's at
`tests/fixtures/voice-bound-derivation.json`, DISTINCT re-derives to **100**
unchanged (755 ms against the 12,000 ms ceiling), and the constant is re-fitted
**0.173 -> 0.9931** us/unit from the uniform-32 N=97 row (299 ms loaded on
weight 301,088; 5.7x the old figure, part of it scope — `analyzeFountainText`
then, the whole `runScriptDoctor` call now). Margin 1,500,000 x 0.9931 us =
1,490 ms against the 10,000 ms target, 6.7x under. The margin proof in
[[Gate - Fountain Shape Guard]]'s suite now reads every rate from the committed
table — the typed 0.807 literal is gone — and asserts the constant equals its
row, so the two cannot drift again without a named failure.

## What the owner still owes

`REAL_SCRIPT_CORPUS_DIR=<corpus> npm run measure-real` against
[[Gate - AUC-24 Ratchet]], the 72-row manifest re-lock, `npm run lock-auc24` on
the `shuffle-drop/v4` recipe, and the merge decision. **The calibrate step is
done** — the README's reduced runbook under `## Runner lock (run 35542413222)`
supersedes §S5's step 4. No AUC-24 figure is claimed anywhere in this lane's
record: the private corpus is not present in the environment it ran in.

**Related:** [[Branch - Feature-Length Defects]],
[[Branch - Feature-Length Saturation Only]], [[Owner - R5 Measurement and Merge]],
[[Audit - 2026-09-20 Parked Branches]], [[Audit - 2026-09-20 Scene Grammar]],
[[Gate - Public Benchmark]], [[Gate - AUC-24 Ratchet]], [[Gate - Receipt Gate]],
`docs/audits/2026-09-20-feature-length-defects-prep/README.md`.

## Sources

- `docs/audits/2026-09-20-feature-length-defects-prep/README.md`
- `docs/audits/2026-09-20-parked-branches/README.md`
- `docs/p1-benchmark/MEASUREMENT_RECEIPTS.md` — the 2026-09-20 entry
- `docs/p1-benchmark/PUBLIC_BENCHMARK_2026-09-06.md` §13 and §14
- `docs/scoring/FEATURE_LENGTH_DEFECTS_2026-09-07.md`
- `scripts/lib/auc.ts`
- `server/nvm/analyze/doctor.ts`
- `server/lib/validation.ts`
- `src/lib/voice-separation-copy.ts`
- `tests/security/fountain-shape-guard-cue-parity.test.ts`
