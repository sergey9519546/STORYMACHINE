---
type: audit
updated: 2026-09-20
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

## What the owner still owes

`REAL_SCRIPT_CORPUS_DIR=<corpus> npm run measure-real` against
[[Gate - AUC-24 Ratchet]], the 72-row manifest re-lock, `npm run lock-auc24`,
and the §6.1 decision above, which stands whatever the AUC says. The full
runbook is §9 of the README. No AUC-24 figure is claimed anywhere in this lane's
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
- `docs/p1-benchmark/PUBLIC_BENCHMARK_2026-09-06.md` §13
- `docs/scoring/FEATURE_LENGTH_DEFECTS_2026-09-07.md`
- `scripts/lib/auc.ts`
- `server/nvm/analyze/doctor.ts`
- `server/lib/validation.ts`
- `src/lib/voice-separation-copy.ts`
- `tests/security/fountain-shape-guard-cue-parity.test.ts`
