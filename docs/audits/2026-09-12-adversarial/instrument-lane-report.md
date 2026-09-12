# Instrument-integrity lane — report

**Worktree:** `/home/user/wt-instrument` · **Branch:** `lane/instrument-integrity`
(from `main @ 59bbaf55`) · **Tip:** `c7e24d9d0ed85decb86fdf762deef9d02eb29533`,
pushed to `origin/lane/instrument-integrity` after every commit.

```
git log --oneline 59bbaf55..HEAD
c7e24d9d gates: the mutation check must read TAP whoever invoked it
aa54971c claims: a path:line pointer must carry an anchor, and the lane checks it lands
a47b1184 docs+gates: CLIMAX_DED_MIN_SCENES is not a live gate, and the claim is now tested
378b4e3b harness: one scene segmenter, CLIMAX_RELOCATE to position ONE, no-op is an error
2c4e685a gates: the VERIFIED row checks assertion liveness, not exit 0
```

34 files, +2,972 / −207. Answering
`docs/audits/2026-09-12-adversarial/engine-logic.md` findings 6, 7, 11 and 12.

---

## 1. What the thing IS

Four mechanisms that all make the same kind of claim — *"this was measured"* — and
all of them were, in four different ways, describing something other than what the
code did.

**The gate reporter** (`scripts/report-unverified-gates.mjs`). Its job is to stand
next to `npm test`'s "0 failures" and say which verification gates did NOT run. In
2026-09-06 it gained the opposite kind of row — a VERIFIED section asserting that
`tests/core/public-benchmark.test.ts` DID run here, with no corpus and no owner
step — and that row was satisfied by the suite exiting 0.

**The public benchmark** (`scripts/lib/public-benchmark.ts`,
`scripts/lib/auc.ts`, `scripts/lib/rebuild-experiment-lib.mjs`). Three
degradations × two statistics against six floors, recomputed from 32 committed
`.fountain` files on every CI run. Two of the three degradations rearrange scenes,
so the whole instrument rests on one question — *where does a scene begin?* — that
three different pieces of code answered differently, none of them the way the
doctor answers it.

**The printed caveats** (`PUBLIC_BENCHMARK_LIMITS`, echoed in `CLAUDE.md`, the
measurement doc and the brain gate note). A block of prose about what the
benchmark cannot show, printed on every run, describing the engine's feature-scale
deductions.

**The claims register** (`docs/CLAIMS_REGISTER.md` + `scripts/honesty-audit.mjs`'s
claims lane). Every user-facing empirical claim gets a row with an evidence
pointer, and the lane enforces that the pointer resolves.

Everything in this lane is INSTRUMENT and DOCUMENTATION. No scoring-path file was
touched, no health value moved, and two of the six benchmark floors moved only
because a degradation was corrected.

## 2. What the brief got wrong

1. **"fix the three anchors"** (finding 11) names
   `docs/CLAIMS_REGISTER.md:72`, `ROADMAP.md:60` and
   `scripts/check-scoring-receipt.mjs:134`. The stale `doctor.ts:1892-1898` anchor
   survived in **three more** live files the brief does not list: `NORTH_STAR.md:40`,
   `server/routes/scriptide.ts:431` and `docs/STORYTELLING_COVERAGE_MAP.md:14`
   ("`doctor.ts` ~line 1892"). All six are fixed. Two further copies sit in dated
   records (`docs/proposals/DEAD_WEIGHT_REMOVAL_2026-08-24.md`,
   `docs/p1-benchmark/UNWIRED_SIGNALS_EVIDENCE_2026-08-21.md`) and are deliberately
   left, the same way `docs/audits/**` is exempt from the retired-claim check.
2. **`doctor.ts:2130-2134`** (the climax-revert note, finding 6) is
   `doctor.ts:2127-2131` on `59bbaf55`; the audit measured against `c087a6ca`.
   `ARC_DED_MIN_SCENES` is at `:2104`, not the `:2101` the measurement doc claimed.
   Both corrected — and both are instances of exactly the defect finding 11 is
   about, which is why the lane's own new pointers were re-derived from the file
   rather than copied.
3. **"run the suite a second time against a temp copy of `scripts/lib/auc.ts`"**
   (finding 7's option (b)) was implemented as an in-memory `module.registerHooks`
   load hook instead. A temp-file swap puts a fabricated floor on disk for the
   duration of a CI step, and a step killed in that window leaves it there — a
   silently altered ratchet in a tree that looks clean is the exact failure the
   floor machinery exists to make expensive. A test asserts `auc.ts` is
   byte-identical after every mutation run the suite drives.
4. **A bare non-zero exit is not acceptable proof for the mutation run**, which
   the brief's wording ("REQUIRE a failure") would allow. Under the hook the
   suite's on-disk-vs-imported shape assertions fail too, so a gutted suite that
   kept those would exit non-zero while asserting nothing about the measurement.
   The reporter requires the mutated run's own
   `not ok … clears <CONSTANT> = <raised>` line.
5. **A fourth segmenter existed.** The brief names `auc.ts`'s
   `shuffleDropDegrade`; `rebuild-experiment-lib.mjs` carried its own
   (`INT.|EXT.|EST.|INT/EXT.` plus a leading dot) with a lossy `lines.join('\n')`
   reassembly. Both now use the shared one, and the consequence for the
   measure-auc-split lineage (`DISCRIMINATION_BASELINE_2026-07-29.md`'s 0.734 /
   0.766) is written into that file's header for the same reason the AUC-24 note
   exists.
6. **`anchor` within ±3 lines** needs a rule for comma lists. Row 19 cites
   `tests/core/script-doctor.test.ts:1133,1528`; treating that as one span makes
   the window 400 lines wide and checks nothing. A comma list now needs one anchor
   per line; a contiguous `a-b` range gets one window.
7. **Not in the brief at all:** `tests/core/brain-coverage.test.ts` (b) was ALREADY
   RED at `59bbaf55` — `docs/audits/2026-09-12-adversarial/` had no brain note.
   The lane needed one anyway (it links to it), so that failure is also closed.

## 3. Item by item, with every before/after number

### Item 1 — finding 7: the VERIFIED row now checks assertion liveness

A verified row is checked **five** ways instead of three. The two new checks are
the finding's own two options, and they are complementary, not alternatives:

* **(4) REPORTED.** `tests/core/public-benchmark.test.ts` prints one
  `FLOOR <CONSTANT> measured=… floor=… verdict=… primary=…` line per floor. The
  reporter requires one for every `PUBLIC_*_FLOOR` it finds **in
  `scripts/lib/auc.ts`** — the source of truth, so a suite cannot shorten the list
  it is held to by printing fewer lines. `AUC24_FLOOR` is excluded by an explicit
  `floorPrefix`, with the reason written down: it belongs to a corpus-gated suite
  that SKIPS in CI, and pulling it in would make the row imply the AUC-24 ratchet
  is verified here.
* **(5) LIVE.** The suite runs a second time with the first declared floor —
  `PUBLIC_SHUFFLE_DROP_PAIRED_FLOOR`, the PRIMARY paired one, chosen
  deterministically from `auc.ts`'s own textual order — raised to
  `round4(measured + 0.05)`, and must emit `not ok … clears <CONSTANT> = <raised>`.
  A floor pinned at 1.0000 (the control's matched-pair statistic) is skipped
  rather than raised outside `[0, 1]`, where a failure could come from a range
  check instead of the floor comparison.

Proof in both directions:
`tests/fixtures/gate-liveness/gutted-public-benchmark-suite.ts` is the
investigator's gutted suite, committed — deliberately the GENEROUS version of the
attack: it prints a real FLOOR report with real measured values, so it passes
check (4), and only the mutation run separates it from the genuine suite. The
reporter reports it `mutation-survived` / ABSENT and exits 1. The genuine suite
still reads `[RAN]`, and the reporter's own output now names which floor it
raised.

New states: `unreported-floors`, `mutation-survived` (6 in total; only `ran` is a
claim).

**Cost, measured back to back on one machine, three consecutive runs each:**

| command | before | after |
|---|---|---|
| `npm run gates` | 5.86–6.51 s (single-run reporter at `59bbaf55`) | **11.47–11.68 s** |
| one `tests/core/public-benchmark.test.ts` run | 5.92–6.15 s | unchanged |
| `tests/scripts/report-unverified-gates.test.ts` | ~6 s | **22.0–22.5 s** |

The cost is the suite, paid twice. Sandbox load moved the absolute figures by 20%
*within this one session* (an earlier triple read 4.9–5.1 s / 9.9–10.3 s), so the
~1.9× ratio is the part attributable to the change, and all three recorded places
say so. Stated in the script's header, `CLAUDE.md`'s `--lock` paragraph, the
measurement doc's runtime note (as a second dated paragraph beside the 2026-09-06
one, not overwriting it), the new receipts entry and the brain gate note.

### Item 2 — finding 12: one segmenter, position ONE, and a no-op is an error

Three defects in one mechanism. What was wrong:

1. `degradeClimaxRelocate` did `scenes.pop()` then `splice(1, 0, last)` — **position
   TWO**, so the original opening stayed put — while the label, the `recipe`
   string, the measurement doc §3 and the brain gate note all said "position 1".
   The covering test asserted `[ONE, SIX, TWO, …]`: it encoded the bug.
2. Nothing asserted `degraded !== text`. A silently no-opping recipe produced an
   EXACT TIE counted as a legitimate 0.5 observation — the one value
   indistinguishable from "the engine read this pair and could not separate it".
3. `shuffleDropDegrade` split on `/^(?=INT\.|EXT\.)/mi`, so `EST.`, `I/E.`,
   `INT./EXT.` and forced `.HEADING` lines were invisible.

Built: `scripts/lib/scene-segments.ts`, whose grammar is the doctor's own
`scene_heading` classification read off `src/lib/fountain.ts`'s `parseFountain`
(importable without pulling the scoring path into `scripts/` — the receipt gate
confirms it; `rebuild-experiment-lib.mjs` already imported that parser). Slices are
verbatim, so `head + scenes.join('') === text`. `auc.ts` and
`rebuild-experiment-lib.mjs` both use it and neither carries a heading regex any
more. `assertDegradationChangedText` / `assertFinalSceneIsFirst` are applied by
`public-benchmark.ts`'s three `apply`s, `scripts/lock-auc24.mjs` and
`tests/core/real-script-corpus.test.ts` — every call site that turns a degradation
into an observation. The recipes stay total pure functions, because
`tests/core/auc.test.ts`'s byte-for-byte oracle depends on that; the guard belongs
where the observation is counted.

Segmenter agreement, measured: **0 of 32** committed scripts disagree on scene
count across five definitions (the old `auc.ts` split, `rebuild-experiment-lib`'s,
the new segmenter on raw text, on normalised text, and
`analyzeFountainText(...).sceneCount`). On a synthetic mixed-heading script the
old `INT.`/`EXT.` split sees **0** scenes where the doctor sees **5**, and the old
recipe returns its input unchanged — both asserted, so the fix cannot be cosmetic.

**Floors, before → after** (`npm run benchmark:public -- --lock`, read before
committing):

| channel | statistic | measured before | measured after | floor before | floor after |
|---|---|---|---|---|---|
| `SHUFFLE_DROP` | matched-pair (PRIMARY) | 0.5313 | **0.5313** | 0.5113 | 0.5113 |
| `SHUFFLE_DROP` | all-pairs | 0.5586 | **0.5586** | 0.5386 | 0.5386 |
| `CLIMAX_RELOCATE` | matched-pair (PRIMARY) | 0.4219 | **0.4063** | 0.4019 | **0.3863** |
| `CLIMAX_RELOCATE` | all-pairs | 0.4673 | **0.4443** | 0.4473 | **0.4243** |
| `DIALOGUE_FLATTEN` (control) | matched-pair | 1.0000 | 1.0000 | 0.98 | 0.98 |
| `DIALOGUE_FLATTEN` (control) | all-pairs | 0.9473 | 0.9473 | 0.9273 | 0.9273 |

| `CLIMAX_RELOCATE`, other statistics | before | after |
|---|---|---|
| 95% CI, matched-pair | [0.2813, 0.5625] | [0.2656, 0.5469] |
| 95% CI, all-pairs | [0.4014, 0.5264] | [0.3662, 0.5112] |
| ordered / inverted / tied | 8 / 13 / 11 | 8 / **14** / **10** |
| mean health gap | −1.46 | **−1.23** |
| scripts pinned at health 76.0 | 10 | 10 |
| ties that are pinned scripts | 10 of 11 | 9 of 10 |

**`SHUFFLE_DROP` did not move because the new segmentation produces BYTE-IDENTICAL
output on all 32 scripts** (measured: 0 of 32 differ). That is the evidence the
segmenter change is the narrow one claimed. `CLIMAX_RELOCATE` moved for a measured
reason, decomposed before the re-lock:

| variant | matched-pair | all-pairs | o/i/t |
|---|---|---|---|
| old (line-join reassembly, position two) | 0.4219 | 0.4673 | 8 / 13 / 11 |
| new segmenter + reassembly, still position two | 0.4375 | 0.4736 | 9 / 13 / 10 |
| new segmenter + **position one** (shipped) | **0.4063** | **0.4443** | 8 / 14 / 10 |

The lossless reassembly alone would have RAISED both (+0.0156 / +0.0063);
correcting the position then lowered them past the start. **The corrected
manipulation is stronger and the engine reads it slightly worse** — the direction
an order-blind score predicts. Not a regression; a more honest reading of the same
engine.

**The score did not move, checked three ways:** the receipt gate reports "no
scoring-path files changed"; output identity is 45/45 byte-identical against a
`git archive 59bbaf55` baseline; and `--lock` produced **no diff** in
`tests/fixtures/public-corpus-manifest.json` or
`tests/fixtures/public-benchmark-split.json` — every intact
`sceneCount`/`words`/`health`/`verdict` is what it was.

**AUC-24 (item 2e).** `shuffleDropDegrade` is byte-for-byte the AUC-24 recipe, so
its segmenter change changes what `npm run lock-auc24` will measure. Nothing was
invalidated — `tests/fixtures/auc24-table.json` has never existed — but it is
written into `scripts/lib/auc.ts`'s header, `CLAUDE.md`'s "Which floor, exactly"
section and `docs/brain/Gates/Gate - AUC-24 Ratchet.md` that the segmentation
changed on this date, that **the last measured 0.731 was on the old recipe**, and
that the owner's lock must run on the new one and is not comparable to it.
`AUC24_FLOOR` is untouched at 0.622. `AUC24_DEGRADATION_ID` is bumped to
`shuffle-drop/v2`, so an old-recipe table can never be silently compared to a new
measurement.

Recorded in `docs/p1-benchmark/PUBLIC_BENCHMARK_2026-09-06.md` **§11** (dated, with
both decomposition tables and a receipt-style §11.4) and a PUBLIC-CORPUS entry in
`MEASUREMENT_RECEIPTS.md`. `CLAUDE.md`'s floors table and both brain gate notes
carry the new numbers.

### Item 3 — finding 6: `CLIMAX_DED_MIN_SCENES` is not a live gate

`climaxZoneDecayDeduction` (`doctor.ts:617`) is exported and has no scoring-path
call site: `aggregateReport`'s health line subtracts `structuralDeduction`,
`arcIncoherenceDeduction` and `dialogueDeduction` only, and `doctor.ts:2127-2131`
records the revert. All four sites now name `ARC_DED_MIN_SCENES` alone and say the
climax term is exported but reverted/unwired: `CLAUDE.md`,
`PUBLIC_BENCHMARK_LIMITS` (printed on every run — the most-read copy),
`PUBLIC_BENCHMARK_2026-09-06.md` §8, and the brain gate note.

`tests/core/public-benchmark-limits.test.ts` greps the CLI's **real stdout** — not
the module constant, because the claim's damage is done by being printed. Shown to
FAIL on the unfixed input first: restoring the old sentence turns 3 of its 7
assertions red. It also checks the ground truth in `doctor.ts`, so a future change
that actually wires the climax term in goes red and forces the printed sentence to
be rewritten in the same commit. `scripts/benchmark-public.ts --limits` is new so
the grep costs 2.8 s instead of 6 s, with an assertion that `--limits` prints
`PUBLIC_BENCHMARK_LIMITS` verbatim rather than a second copy.

**Claims register checked:** no row makes this claim. Every row's claim text was
searched for climax / feature-scale / "smaller engine" / deduction — zero matches.
Nothing to correct there, nothing to register.

### Item 4 — finding 11: `path:line` pointers must carry a resolving anchor

Anchors corrected in six live files (the brief's three plus the three it missed —
see §2). Invariant 4 added to the claims lane: every evidence pointer naming a
line must carry `anchor:"short quoted text"` occurring within **±3 lines**. A
comma list needs one anchor per line; a contiguous range gets one window; the
`anchor:"…"` sigil is required because existing pointers already carry
parentheticals full of quotes. Scope is EVIDENCE pointers only — the "Where it
appears" column is exempt, because several of its line numbers are historical by
design (the `retired` rows record where wording USED to be).

**The whole register, not one row:** all 11 rows that cite a line now carry
anchors (13 anchors; two rows need two). Adding them turned up **two more stale
line numbers nobody had reported** — row 7's `ARCHITECTURE.md:267` (§8 is at
`:371`; `:267` is now prose about the editor) and row 10's
`tests/core/coverage-html.test.ts:354` (the P3 verifiability comment is at
`:398`; `:354` is a logline assertion). Both corrected, with the old line recorded
in the cell.

Tests (`tests/core/honesty-audit-claims.test.ts`, all driven through the real
script in a temp tree): **a moved line fails the lane**, with a message that
distinguishes "the code MOVED" from "the anchor is wrong"; the same pointer passes
at the right line and at ±3 and fails at ±4; a bare `path:line` fails while a
path-only pointer still passes; a comma list with one anchor fails where two pass;
plus a real-tree assertion on the anchor count. 10 of 10 pass. The register's own
stated rules and `docs/brain/Gates/Gate - Claims Register Lane.md` now describe
four invariants instead of three (and its row count is corrected, 57 → 93).

### Item 5 (not in the brief) — the liveness check had to read TAP

The lane's first full `npm test` failed on
`tests/scripts/report-unverified-gates.test.ts` while that file passed standalone.
`node:test` sets `NODE_TEST_CONTEXT`; the reporter's children inherited it,
switched to the V8-serialized reporter, stopped printing TAP, and the mutation
run's `not ok … clears …` line never appeared — so the reporter called the
perfectly live benchmark `mutation-survived` / ABSENT. Reproduced directly:
`NODE_TEST_CONTEXT=child-v8 node scripts/report-unverified-gates.mjs` reported
ABSENT before the fix and RAN after it. `runSuiteDefault` now deletes that variable
from the child environment and pins `--test-reporter=tap`. The regression test
drives the poisoned environment directly and is shown to fail without the fix.

A liveness check that flips answer depending on who invoked it is worse than none,
because the false negative looks exactly like the finding it exists to report.

## 4. Gates, with exit codes

Run on the final tree at `c7e24d9d`:

| gate | exit |
|---|---|
| `node scripts/check-scoring-receipt.mjs 59bbaf55..HEAD` → "no scoring-path files changed. OK." | **0** |
| doctor output identity vs `git archive 59bbaf55` → "PASS — all 45 reports byte-identical" | **0** |
| `npm run benchmark:public` (all six floors clear; manifest and split unchanged) | **0** |
| `npm run lint` (`tsc --noEmit`) | **0** |
| `node scripts/check-no-console.mjs` | **0** |
| `npm run check-docs` | **0** |
| `node scripts/honesty-audit.mjs` (93 rows, clean) | **0** |
| `npm run check-brain` (102 notes, 367 links, fresh) | **0** |
| `node scripts/report-unverified-gates.mjs` — the new five-way version | **0** |
| `npm run build` | **0** |
| `npm test` — **13,246 tests, 13,154 pass, 0 fail**, 91 skipped, 1 todo | **0** |

Touched suites, individually: `scene-segments` 9/9 · `auc` 29/29 ·
`rebuild-experiment` 41/41 · `public-benchmark` 28/28 · `public-benchmark-limits`
7/7 · `auc24-table` 3/3 · `lock-auc24` 14/14 · `honesty-audit-claims` 10/10 ·
`report-unverified-gates` 39/39 (also verified under `--test`, as `npm test` runs
it) · `brain-coverage` 7/7 (was 6/7 at `59bbaf55`).

No browser battery, per the brief.

## 5. Left undone

1. **The AUC-24 lock is the owner's, and it is now a different measurement.**
   `npm run lock-auc24` must run on the new segmentation; its number will be the
   first AUC-24 figure this recipe has produced. `AUC24_FLOOR` stays at 0.622
   until then, deliberately.
2. **`DISCRIMINATION_BASELINE_2026-07-29.md`'s numbers (0.734 / 0.766) are not
   re-measured.** `degradeShuffle` and `degradeMidpointDrop` migrated to the
   shared segmenter too, so a rerun of `scripts/rebuild-experiment.mjs` is no
   longer directly comparable to that dated record. The disclosure is in
   `rebuild-experiment-lib.mjs`'s header; the doc is left as the dated record it
   is. Re-measuring needs the local corpus.
3. **The split is still reported, not used.** The two re-locked floors were
   computed from all 32 scripts, holdout included. Unchanged by this lane and
   still labelled that way everywhere.
4. **Findings 1, 2, 3, 4, 5, 8, 9, 10, 13, 14 are untouched.** Every one is
   `doctor.ts` or its import graph, behind the receipt gate and the owner's
   corpus, and this lane's constraint was that no health value may move. The
   report's own "best achievable version" — a live density gradient, parse and
   format invariance, ensemble order invariants — is summarised with its
   measurements in `docs/brain/Audits/Audit - 2026-09-12 Adversarial Review.md`
   so it is not left only in one audit file.
5. **Two stale `doctor.ts:1892-1898` copies remain in dated documents**
   (`docs/proposals/DEAD_WEIGHT_REMOVAL_2026-08-24.md`,
   `docs/p1-benchmark/UNWIRED_SIGNALS_EVIDENCE_2026-08-21.md`), deliberately, as
   records of what was cited when they were written. Invariant 4 does not reach
   them: it governs the claims register's evidence pointers, not prose anywhere in
   the tree. Extending it to arbitrary markdown is a larger, separate change.
6. **The pre-commit doc hook warns (non-blocking) on four pre-existing patterns in
   `docs/STORYTELLING_COVERAGE_MAP.md`** (lines 45, 143, 197, 227 — "robust",
   "paradigm", "actionable" ×2). The hook scans whole staged files and that file is
   staged for a one-line anchor fix; `npm run check-docs --all` passes. Not
   touched, because rewording unrelated prose inside this lane's diff would hide
   it.
7. **`scripts/measure-auc-split.mjs`** keeps its own copy of the old segmenter. It
   is the frozen provenance source `rebuild-experiment-lib.mjs`'s header says must
   never be edited, so it was not. Anything run from it measures the old recipe;
   nothing in this lane runs it.

---

## Round 2

**Reviewed object was** `29b173570a9011195677ed8ec6c6bcb7313ae59b` (verdict
REVISE, four items, none a measurement error —
`docs/audits/2026-09-12-adversarial/instrument-review.md`). Round 2 continues on
top of it. **Tip: `77755355a536c951271c3a79cfbd380e2c36364d`**, one commit,
pushed.

The review is right on all four, and two of them are the same shape as the
findings this lane was built to answer: a confident sentence about a check,
falsified by someone doing the thing it said was impossible.

### Item 1 — the liveness check's own copy overclaimed

`report-unverified-gates.mjs:245-247` and `raise-auc-floor-hook.mjs:31-34` said a
non-zero exit is not accepted as proof because "only an assertion that compares
the measurement to that constant can name it in a failure". **False**, and
reproduced here before fixing: the reviewer's 26-line suite asserts
`assert.ok(true)` for all six floors, prints the real FLOOR report, appends one
literal `not ok 99 - … clears PUBLIC_SHUFFLE_DROP_PAIRED_FLOOR = 0.5813`, and the
round-1 reporter returned `VERIFIED GATES: 1 of 1`, `[RAN]`, exit 0.

The mutated run must now satisfy three conditions. Each is free for a genuine
suite and each is a separate thing a forgery has to manufacture:

| condition | forged suite | genuine suite |
|---|---|---|
| (a) mutated run exits non-zero | **0** (measured) | **1** (measured) |
| (b) carries `not ok … clears <CONSTANT> = <raised>` | yes (forged) | yes (real) |
| (c) carries NO `ok … clears <CONSTANT> = <raised>` twin | **fails** — both lines present | passes — failure only |

(a) is the reviewer's `&& !mutated.ok`, which costs nothing and is strictly safe.
(c) is the addition: a forged failure line does not stop the real, vacuous `it`
block from reporting the **same title** as a pass, because under the hook the
title is generated from the raised value. Either (a) or (c) alone catches the
probe — deliberate, and asserted separately so removing one leaves the fixture
red. Measured, on the reviewer's fixture with each condition removed in turn:
twin-check alone still reports `mutation-survived`; with both removed the forged
suite reads `[RAN]`.

`mutationWasCaught` now returns `{ok, reason}` rather than a boolean, so the
reporter's DETAIL line says *which* signal failed.
`tests/fixtures/gate-liveness/forged-liveness-suite.ts` is the reviewer's probe,
committed beside the gutted one, with its provenance and the attack it
demonstrates in its header.

**Both sentences rewritten** to what the check does: three signals raise the cost
of faking from "keep the file and gut the assertions" to "deliberately forge
three separate outputs", and an output-parsing check that reads a child process's
self-report cannot go further. The honest claim is the one that survived being
attacked; the review notes this is the same shape of sentence finding 7
falsified, in the same file, and that is now said in the file itself.

### Item 2 — finding 11 was still live 15× in the exempted column

Round 1 exempted "Where it appears" because "several of its line numbers are
historical by design — rows 1, 2 and 25 are `retired`". True of three rows,
**false of fifteen**. Re-derived independently here (locating each row's own
claim text in the cited file rather than trusting the review's list):

| row | cited | actual | drift |
|---|---|---|---|
| 3 | `StartScreen.tsx:317` | :344 | +27 |
| 5 | `StartScreen.tsx:411` | :477 | +66 |
| 6 | `PrivacyPage.tsx:129` | :172 | +43 |
| 7 | `PrivacyPage.tsx:89` | :106 | +17 |
| 8 | `PrivacyPage.tsx:153` | :207 | +54 |
| 9 | `ScriptDoctorPanel.tsx:3443` | :4993 | **+1550** |
| 10 | `VerifyReport.tsx:351` | :425 | +74 |
| 11 | `SlatePanel.tsx:582` | :666 | +84 |
| 12 | `SlatePanel.tsx:122` | :154 | +32 |
| 14 | `WhatIfPanel.tsx:840` | :1234 | +394 |
| 15 | `SettingsPanel.tsx:854` | :865 | +11 |
| 16 | `SettingsPanel.tsx:499` | :505 | +6 |
| 18 | `README.md:23` | :43 | +20 |
| 20 | `ARCHITECTURE.md:305` | :414 | +109 |
| 23 | `SettingsPanel.tsx:853` | :864 | +11 |

Row 18 is the one my first probe could not resolve automatically: the register's
"verbatim" claim uses parentheses where `README.md:43` uses em dashes, so a
prefix match fails. Confirmed by hand; the reviewer's `:43` is right. (The
wording drift between the claim cell and the surface is a separate question this
round did not open.) Rows 4, 13 and 17 were already within ±3 and are anchored
where they stand.

Row 20 is the sharpest case and the review names it: its appears cell still said
`ARCHITECTURE.md:305` while **round 1's own diff** corrected the same row's
evidence cell to `:414`. The right line was in hand and the wrong one was left
one cell to the left.

Invariant 4 now covers **both columns**, and the carve-out is exactly what its
reason describes — `retired` or `unsupported` rows only, whose location records
where wording USED to be. Violations name the column. All 18 appears pointers
carry anchors; each corrected cell records the line it used to cite.

### Item 3 — a vacuous anchor was accepted

`anchor:"e"` passed. Two conditions now, because neither alone is enough:

* **≥ 12 characters.** The register's real anchors run 12–49.
* **Exactly one matching line inside its own ±3 window.** A 12-character
  boilerplate string can match three lines and pin nothing.

The second half caught one of this lane's **own round-1 anchors** on its first
run: `anchor:"report.plainSummary"` matches `tests/core/script-doctor.test.ts`
lines 1527, 1528 and 1529. Replaced with `anchor:"plainSummary ?? '', /structure/"`.

### Item 4 — the DISCRIMINATION_BASELINE disclosure lived in one place

The AUC-24 half of the recipe-change disclosure was in `auc.ts`, `CLAUDE.md` and
the AUC-24 gate note; the measure-auc-split half (that `degradeShuffle` and
`degradeMidpointDrop` also migrated, so a **fresh run** is not comparable to
0.734 / 0.766) was only in `rebuild-experiment-lib.mjs`'s header. Added to
`CLAUDE.md`'s "Which floor" section, `Gate - AUC-24 Ratchet.md`,
`Gate - Public Benchmark.md`, and
`Measurement - DISCRIMINATION_BASELINE_2026-07-29.md` — the last of which the
review noted was untouched. The dated baseline doc itself is still left alone.

### Round-2 gates, with exit codes

| gate | result |
|---|---|
| `tests/scripts/report-unverified-gates.test.ts` | **42/42** (was 39) |
| `tests/core/honesty-audit-claims.test.ts` | **15/15** (was 10) |
| `tests/core/public-benchmark.test.ts` | 28/28, all six floors at the re-locked values |
| `tests/core/public-benchmark-limits.test.ts` · `scene-segments` · `auc` · `brain-coverage` | 7/7 · 9/9 · 29/29 · 7/7 |
| identity vs `git archive 0b629491` | **PASS — all 45 byte-identical** |
| `check-scoring-receipt 0b629491..HEAD` | "no scoring-path files changed. OK." |
| `npm run benchmark:public` | exit 0 — 0.5313 / 0.5586, 0.4063 / 0.4443, 1.0000 / 0.9473 |
| `npm run gates` ×3 | exit 0 ×3 — 10.07 / 10.55 / 9.90 s |
| `npm run lint` · `check-no-console` · `check-docs` · `honesty-audit` · `check-brain` | 0 · 0 · 0 · 0 · 0 |
| `npm test` (once, final tree) | **13,254 tests, 13,162 pass, 0 fail**, 91 skipped, 1 todo |

### Left undone after round 2

Everything in §5 above still stands. Added by this round:

8. **The three signals are a cost, not a proof.** A forgery that reads
   `AUC_FLOOR_MUTATION_CONSTANT` from its own environment could fail
   deliberately and defeat all three. The mutation is handed to a child process,
   so the child can see it; hiding it is not possible in-process. This is
   written into both files rather than engineered around, because the previous
   two attempts to claim more than that were both falsified within a day.
9. **Row 18's claim cell and `README.md:43` differ in wording** (parentheses vs
   em dashes) while the column header says "verbatim". The anchor points at the
   real line; whether the claim text should be re-transcribed is a separate
   question about the register's own contract, not about invariant 4.
10. **The `anchor` length floor is a constant, not a measurement.** Twelve
    characters is the bottom of the observed 12–49 range; nothing establishes it
    as the right threshold beyond "the real anchors clear it and the attack does
    not".
