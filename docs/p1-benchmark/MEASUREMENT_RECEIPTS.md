# Measurement Receipts Ledger

**Purpose:** the AUC-24 structural-degradation floor (and any other
scoring-path measurement) cannot be verified by CI — the corpus is
local-only, copyright-restricted, and mounting it via secrets was rejected
as a corpus-transport mechanism (see CLAUDE.md). CI **can** make silent
omission of the human measurement step impossible: `scripts/check-scoring-
receipt.mjs` fails the build when a scoring-path file changes in the same
git range without a matching entry appended here. This file is that
required receipt.

**What this ledger is NOT:** a re-verification of the VALUE. Nobody reading
CI logs can confirm a receipt's AUC number is real — CI has no corpus to
recompute it against. What CI enforces is that the step was not skipped:
a scoring change ships only alongside an entry, real or fabricated. The
entry's honesty is a human/reviewer responsibility, same as any other
commit message — this ledger raises the cost of omission, not the cost of
lying.

**How to add an entry (after `npm run measure-real` or
`measure-auc-split.mjs`):** append a new row/block below using the template
in §3. Do not edit historical entries; corrections get a new dated entry
that supersedes the old one, with a note pointing back at what it corrects.

---

## 1. Field definitions

| Field | Meaning |
|---|---|
| Date | Date the measurement was run (not the date it was written up). |
| Git SHA | The commit the corpus was measured against — `git rev-parse HEAD` at measurement time. |
| Command | The exact command run, including corpus env var, so it is re-runnable verbatim. |
| Measured AUC-24 | The `tests/core/real-script-corpus.test.ts` "structural-degradation AUC" statistic (shuffle + drop-every-third, 24-script subset), when applicable. |
| Flag-run AUCs | Any other AUC statistic produced by the same run (e.g. `measure-auc-split.mjs`'s per-degradation partition AUCs), when applicable. |
| Corpus fingerprint | A checkable, non-title-bearing identifier for the corpus state measured — the manifest's script count and/or `corpus-split.json`'s content hash. Never a script title. |
| Runner attestation | A one-line first-person confirmation from whoever ran the measurement, naming themselves or "maintainer" and the local machine/session context. `imported-from-docs` entries carry no attestation beyond the source doc they were transcribed from — see §2. |

---

## 2. Seed entries (imported from already-recorded measurements)

These two entries pre-date this ledger. They are transcribed, not
re-measured — marked `imported-from-docs` per their original dates, with no
attestation beyond "this number already exists in the committed source
below." Nothing here is fabricated; where a field wasn't captured at
measurement time (git SHA, exact manifest hash), that gap is stated
honestly rather than backfilled with a guess.

### 2.1 — 2026-07-11 (imported-from-docs)

- **Date:** 2026-07-11 (recorded as part of the "2026-07-11B" health
  re-architecture wave)
- **Git SHA:** not recorded at measurement time — this measurement pre-dates
  this ledger and the source comment does not capture a SHA. Not
  backfilled; recorded as unknown rather than guessed.
- **Command:** the `AUC target` test inside
  `tests/core/real-script-corpus.test.ts` (its own `measure()` helper —
  seeded scene shuffle + drop-every-third degradation over a 24-script
  subset), run via
  `REAL_SCRIPT_CORPUS_DIR=<local corpus path> node --experimental-strip-types tests/core/real-script-corpus.test.ts`
- **Measured AUC-24:** **0.731** — up from 0.672 after the continuous
  arc-incoherence structural deduction (health re-architecture,
  2026-07-11B). This is the number CLAUDE.md and
  `scripts/report-unverified-gates.mjs` both cite as "last measured 0.731."
- **Flag-run AUCs:** none recorded alongside this number in the source
  comment.
- **Corpus fingerprint:** 24-script subset (`MANIFEST.slice(0, 24)` of
  `tests/fixtures/real-corpus-manifest.json`) as it existed on 2026-07-11;
  the manifest has grown since (72 entries as of this ledger's creation on
  2026-08-04), so the exact 24-script set measured then cannot be
  reconstructed from today's manifest content hash. Recorded honestly as a
  gap, not backfilled.
- **Runner attestation:** imported-from-docs — source is the inline comment
  in `tests/core/real-script-corpus.test.ts` at the "AUC target" test
  (search for "up from 0.672 after the continuous arc-incoherence
  structural deduction"). No separate runner sign-off exists for this
  number; it is the project's own committed source of truth for the value.

### 2.2 — 2026-07-29 (imported-from-docs)

- **Date:** 2026-07-29
- **Git SHA:** not recorded in `docs/p1-benchmark/
  DISCRIMINATION_BASELINE_2026-07-29.md` — the baseline doc does not carry
  a SHA either. Recorded as unknown.
- **Command:** `CORPUS_DIR=<local corpus path> node scripts/measure-auc-split.mjs --partition=test`
  (per `docs/p1-benchmark/MEASUREMENT_RUNBOOK.md` §2.3 — "Run Test
  Partition, ONCE, Final Evaluation Only").
- **Measured AUC-24:** not applicable — this is a DIFFERENT statistic on a
  DIFFERENT corpus/partition (see the explicit non-comparability note in
  CLAUDE.md: this is the 153-script hash-locked TEST partition of the
  761-script P1 corpus, not the 24-script `real-script-corpus.test.ts`
  subset). Do not read this row as an AUC-24 update.
- **Flag-run AUCs (test partition, 153 scripts, seed 42, hash-locked):**
  - DIALOGUE_FLATTEN: **0.990** (train 0.997, val 0.993) — PASSES the
    ≥0.80 gate
  - MIDPOINT_DROP: **0.766** (train 0.732, val 0.669) — partial
  - SCENE_SHUFFLE: **0.734** (train 0.729, val 0.725) — partial
  - CLIMAX_RELOCATE: **0.523** (train 0.481, val 0.540) — fails (chance)
  - ALL POOLED: **0.754** (train 0.735, val 0.732) — partial, below the
    ≥0.80 gate
- **Corpus fingerprint:** 761 real produced screenplays (456 train / 152
  val / 153 test, seed 42, hash-locked test set); 89 original +
  684 crawl-sourced (IMSDb/DailyScript), ~92% live-action / ~8% animation.
  Split manifest: `scripts/output/corpus-split.json` (committed, non-title-
  bearing per the corpus's de-identification scheme).
- **Runner attestation:** imported-from-docs — source is
  `docs/p1-benchmark/DISCRIMINATION_BASELINE_2026-07-29.md` in full. No
  separate runner sign-off beyond that committed document.

---

### 2026-08-04 — normalizer `isDoubleSpaced()` root-cause fix (cue-adjacency rekey) + truth-extraction lexicon extension

- **Date:** 2026-08-04
- **Git SHA:** measured against the working tree at `7f57119` (the commit
  immediately preceding the commit that carries this entry — the change and
  its receipt land together, per the guard's same-range rule).
- **Command:** not an AUC run — the private corpus is not present in this
  environment, so no AUC statistic could honestly be produced. The
  measurement actually performed is a full pre/post blast-radius diff:
  `runScriptDoctor()` (quick mode) over all 20 `data/screenplays/*.fountain`
  scripts, once with the old `isDoubleSpaced()` (via `git stash` on that
  file only) and once with the fix, diffing `health` / `grade` / `verdict`
  / `sceneCount` / `wordCount` per script. Full method and per-script table:
  `docs/p1-benchmark/CC0_CORPUS_EXPANSION_2026-08-04.md`, addendum §Item 2.
- **Measured AUC-24:** **not re-measured** — recorded as an open obligation,
  not a pass. The maintainer must run `npm run measure-real`
  (`REAL_SCRIPT_CORPUS_DIR=<local corpus>`) locally before treating the
  ratchet as re-verified on this change. Two committed rows in
  `scripts/output/real-corpus-scores.csv` (`dead-frequency` 78.4,
  `runoff` 74.4) are known to shift by 0.1 under the fix; the 82
  private-corpus rows could not be checked from this environment.
- **Flag-run AUCs:** none — see above.
- **Blast radius (the measurement this receipt certifies):** 6 of 20
  tracked CC0 scripts changed `health` (chain-of-custody −0.1,
  close-quarters −3.1, dead-frequency −0.1, mise +1.6, red-line −2.0,
  runoff +0.1); `grade`/`verdict`/`sceneCount` identical pre/post for all
  20. The truth-extraction lexicon change in the same range is unwired
  into scoring and moved nothing (recall 6/6, false positives 0/44).
- **Committed evidence artifacts:** deliberately NOT regenerated here.
  `real-corpus-scores.csv` and the five downstream artifacts listing the
  two affected filenames are 82-parts private-corpus rows this environment
  cannot recompute; regenerating only the CC0 rows would produce a
  mixed-provenance file. Regeneration is deferred to the maintainer's
  local `measure-real` run, which reproduces all rows from one pipeline.
- **Corpus fingerprint:** the 20 tracked `data/screenplays/*.fountain`
  files at `7f57119` (git-content-addressed; no titles beyond the
  fixture-slug filenames, which are original CC0 works authored in-repo,
  not produced-screenplay titles).
- **Runner attestation:** "Agent session (Claude, remote sandbox,
  2026-08-04) measured this in-environment under the maintainer's blanket
  delegation; the AUC re-measurement obligation above is explicitly NOT
  discharged by this entry."

---

### 2026-08-04 — D4/D6 clue-channel fix: the information test + observed setup→payoff order

- **Date:** 2026-08-04
- **Git SHA:** measured against a worktree based at `55941de` with the
  D4/D6 change applied; the change and this receipt land in the same
  commit range, per the guard's same-range rule.
- **Command:** not an AUC run — the private corpus is not present in this
  environment. The measurement performed is a full pre/post blast-radius
  diff: `runScriptDoctor()` (quick mode) over 41 scripts — all 20
  `data/screenplays/*.fountain`, all 20 calibration `REFERENCE_CORPUS`
  samples, and the live P0 sample ("Dead Frequency") — comparing
  `health`/`grade`/`verdict`/`sceneCount` per script between the pre-change
  scoring path and the post-change one. Method and per-script analysis:
  `DETECTOR_DEFECTS_2026-08-03.md`, D4/D6 addenda (2026-08-04).
- **Measured AUC-24:** **not re-measured** — recorded as an open
  obligation, same as the 2026-08-04 normalizer entry above. Discharge
  path: `npm run discharge-obligations` on the maintainer machine (runs
  `measure-real` + the artifact regeneration + the unwired-flag AUC runs
  in one command). The real-corpus manifest re-lock requirement applies:
  this change shifts health on real scripts, so
  `tests/core/real-script-corpus.test.ts`'s manifest must be re-locked in
  that same local run.
- **Flag-run AUCs:** none — see above.
- **Blast radius (the measurement this receipt certifies):** 19 of 41
  scripts changed `health` (largest: transfer-window −12.5, whose only two
  "paid" promises were D4's false paid-clues — payment ratio 0.25 → 0;
  Yard Signs −7.1; Lockdown +7.5; two-lane +2.0). Five `grade` shifts
  (two-lane solid→strong, Low Tide uneven→solid, Second Wind solid→uneven,
  Yard Signs uneven→troubled, transfer-window uneven→troubled). ZERO
  `verdict` or `sceneCount` changes on all 41. The P0 sample is unchanged
  on every field — no stimulus re-lock required.
- **Committed evidence artifacts:** deliberately NOT regenerated here, for
  the same mixed-provenance reason as the normalizer entry; deferred to
  the maintainer's `discharge-obligations` run.
- **Corpus fingerprint:** the 20 tracked `data/screenplays/*.fountain`
  files plus `calibration/corpus.ts`'s 20 `REFERENCE_CORPUS` samples at
  the commit carrying this entry.
- **Runner attestation:** "Agent session (Claude, remote sandbox,
  2026-08-04) measured this in-environment under the maintainer's blanket
  delegation; the AUC re-measurement and manifest re-lock obligations
  above are explicitly NOT discharged by this entry."

**Same-day follow-up (same range, supersedes the blast table above):**
integration surfaced a compensating-errors coupling — the
dramatized-vs-told discrimination pair INVERTED (good 71.8 < bad 72.6)
because the Shell's discovery scene's only momentum evidence was exactly
the false clue D4 demoted, so `ZERO_ENTROPY_SCENE` began firing on a scene
that visibly does story work. Fix: records now carry
`recurringImageryIds`, and the entropy rule reads recurring-imagery
participation as momentum evidence (a demoted object is not a plant, but
its tracked recurrence is not nothing). The pair is restored to its
pre-change gap (+1.4) with the false promise still gone. FINAL blast
radius after the follow-through: 19 of 41 health moves (transfer-window
−10.8 — its false paid-clues; Lockdown +10.3, Low Tide +3.8 — false
zero-entropy majors lifted), four grade shifts (Lockdown and Low Tide
uneven→solid, two-lane solid→strong, transfer-window uneven→troubled),
still ZERO verdict/sceneCount changes, P0 sample still unchanged. All six
discrimination pairs order correctly; calibration band monotonicity
holds (full suite green at the commit carrying this note).

---

### 2026-08-04 — Lane H: the rhythm-minor false-positive density guard (composite blind spot closed)

- **Date:** 2026-08-04
- **Git SHA:** measured against a worktree based at `b4b58d7` with the Lane H
  guards applied; the change and this receipt land in the same commit range,
  per the guard's same-range rule.
- **Command:** not an AUC run — the private corpus is not present in this
  environment. The measurement performed is a full pre/post blast-radius diff:
  `runScriptDoctor()` (quick mode) over **53** scripts — all 20
  `data/screenplays/*.fountain`, all 20 calibration `REFERENCE_CORPUS`
  samples, the live P0 sample ("Dead Frequency"), and both halves of all 6
  `calibration/discrimination-pairs.ts` pairs — comparing
  `health`/`grade`/`verdict`/`sceneCount` per script before and after, plus a
  per-rule fire-count table split by the two independent ground truths.
- **Measured AUC-24:** **not re-measured** — recorded as an OPEN, EXPLICITLY
  UNDISCHARGED obligation, exactly as in the D4/D6 and normalizer entries
  above. Discharge path: `npm run discharge-obligations` on the maintainer
  machine. **The real-corpus manifest re-lock requirement applies and is also
  NOT discharged here:** this change shifts `health` on 16 of the 20 tracked
  real scripts, so `tests/core/real-script-corpus.test.ts`'s manifest must be
  re-locked in that same local run. No `verdict` or `sceneCount` moved, which
  bounds — but does not eliminate — the re-lock surface.
- **Flag-run AUCs:** none — see above.
- **What was diagnosed (the evidence base, not the fix):** the last remaining
  `todo` in `tests/core/discrimination.test.ts` — the composite-reviewer pair
  at a +2.2 gap against a 5.0 floor. Rule-level enumeration over all 53
  scripts produced an inverted-signal table: rules that fire MORE on the side
  two independent ground truths label BETTER (calibration band labels; pair
  good/bad side). Seven rules were inverted on BOTH. The mechanism in every
  case is a proxy that tracks prose VOLUME rather than weakness — the same
  false-positive-density family as D1/D2 and D4.
- **The six guards and their measured justification + recall cost:**

  | Rule | Measured defect | Guard | Recall cost |
  |---|---|---|---|
  | `rhythm/ACTION_CONSECUTIVE_LONG_RUN` | fired 10/10 known-STRONG calibration band vs 7/10 known-weak, 18/20 CC0; 9w bar is below the p25 of every corpus (CC0 p25=13, median=19) | per-line bar 9w → 15w | runs of 5+ lines in the 9–14w band no longer fire — that band is the corpus's own IQR |
  | `rhythm/LONG_LINE_FLOOD` | 81% of all CC0 action lines are already ≥12w, so ">60% ≥12w" held for 18/20 CC0; inverted 3/10 strong vs 0/10 weak | "long" bar 12w → 20w (CC0 mean 20.0 / median 19) | scripts clustered in the 12–19w band no longer fire |
  | `rhythm/ACTION_LONG_BEAT_UNCAUSED` | P(fire \| no ≤4w line) = **36/36 = 1.00** vs 1/13 = 0.08 otherwise — a mechanical restatement of an absence `voice/SENTENCE_FRAGMENT_STARVATION` already reports at the identical bar | require a ≤4w line to EXIST before auditing its placement | 36 of 37 fires removed, every one a duplicate of a still-reported finding |
  | `rhythm/ACTION_LONG_RECOVERY_ABSENT` | same defect, aftermath side: 13/28 = 0.46 vs 1/21 = 0.05 | require a ≤7w line to EXIST | 13 of 14 fires removed, all duplicates |
  | `dialogue/TALKING_HEADS` | counted character CUES — a proxy for how finely dialogue is CUT, so terse subtextual exchanges trip it FASTER than verbose ones; fired on a 5-cue/~30-word volley bracketed by staged action on both sides | run must carry ≥80 words of speech | **ZERO on the reference corpus** — CC0 fires on 3/20 before and after; removes fixture-scale false positives on BOTH good (4→0) and bad (3→0) halves |
  | `originality/DIALOGUE_MONOLOGUE_DROUGHT` | audited the dialogue channel for a missing upper tail with no gate on whether the drama lives there; inverted 10/10 strong vs 6/10 weak | require dialogue-driven (dlg ≥ 1.5 × action lines) | CC0 2/20 → 0/20; for those the finding was never applicable |

  The 80-word `TALKING_HEADS` bar is measured, not chosen: every genuine
  qualifying run in the 20 CC0 screenplays carries 88–174 words, every
  fixture-scale false positive carries 20–61. The bar sits in that empty gap.
- **Measured negative result (recorded because it was tested and rejected):**
  the deepest candidate root-cause fix was re-gating the absence-rule family on
  action WORDS instead of action LINES (lines being author-chosen paragraph
  breaks, so line-count gating exempts under-written scripts — the composite
  bad half writes 5 action lines/107 words and is structurally ineligible for
  ~40 rhythm rules). Measured before shipping: at a ≥120w gate
  `SIMULTANEOUS_ACTION_ABSENT` would fire 3/5 on the calibration STRONG band vs
  1/1 weak — i.e. it would make the inversion WORSE, and no word gate above the
  composite bad half's 107 words reaches it anyway. **Not shipped.** Recorded
  here so the idea is not silently re-attempted.
- **Blast radius (the measurement this receipt certifies):** 42 of 53 scripts
  changed `health`, **all upward**, median +0.2 on CC0 (largest CC0:
  transfer-window +2.3, room-12 +0.6; largest calibration: The Dead Drop +2.7,
  Merge +1.9). **ZERO `verdict` changes and ZERO `sceneCount` changes on all
  53** — the STOP rule was not tripped. Three display-`grade` shifts, all
  solid→strong and all on pair GOOD halves (setup-payoff, dramatized,
  composite). The live P0 sample ("Dead Frequency") is **unchanged on every
  field** — no stimulus re-lock required. Calibration band monotonicity
  preserved and band separation essentially unchanged: strong 61.76 >
  competent 51.64 > weak 40.58 > troubled 35.40 (was 60.70 / 50.52 / 39.34 /
  34.52).
- **Discrimination outcome:** all six pairs order correctly and every gap
  widened. composite +2.2 → **+6.5** (good 72.2 → 76.5, **bad 70.0 → 70.0,
  unmoved**); dramatized +1.4 → +4.9; setup-payoff +4.6 → +6.3; subtext +4.0 →
  +4.3; escalation +6.1 → +6.9; active-vs-passive +6.5 → +7.2. The composite
  clears the 5.0 floor with 1.5 points of headroom (30% above the floor), so
  the `todo` in `tests/core/discrimination.test.ts` was flipped to a hard
  assertion — that suite now has zero todos. **That every BAD half is within
  0.1 of its pre-guard score is the load-bearing evidence that this is a
  false-positive fix and not a tuning:** the guards removed penalties
  well-crafted prose was paying and left weak writing's score alone.
- **Tests:** `tests/core/density-bias-guards.test.ts` — 12 tests, one POSITIVE
  (must still fire on genuinely weak writing) and one NEGATIVE (the false
  positive it must no longer produce) per guarded rule. Falsifiability: each
  of the six guards was individually reverted in place and the suite re-run;
  each time **exactly its own negative fixture failed and nothing else did**,
  and the restored state returned to 12/12. That check caught three initially
  VACUOUS negative fixtures (G1/G2/G4 sat below their rule's own line-count
  gate, so they were passing for the wrong reason) and one FALSE PASS (the G6
  negative was hidden by `originality.ts`'s 8-issue output cap); all four were
  rebuilt and re-verified.
- **Committed evidence artifacts:** deliberately NOT regenerated here, for the
  same mixed-provenance reason as the normalizer and D4/D6 entries; deferred
  to the maintainer's `discharge-obligations` run.
- **Corpus fingerprint:** the 20 tracked `data/screenplays/*.fountain` files,
  `calibration/corpus.ts`'s 20 `REFERENCE_CORPUS` samples, and
  `calibration/discrimination-pairs.ts`'s 6 pairs at the commit carrying this
  entry. No corpus or fixture content was modified by this change.
- **Runner attestation:** "Agent session (Claude, remote sandbox, 2026-08-04)
  measured this in-environment under the maintainer's blanket delegation. The
  AUC-24 re-measurement and the `real-script-corpus.test.ts` manifest re-lock
  obligations named above are explicitly NOT discharged by this entry."

---

## 3. Entry template (copy for new entries)

```
### <YYYY-MM-DD> — <one-line reason for the measurement, e.g. commit/PR ref>

- **Date:**
- **Git SHA:** `git rev-parse HEAD` output
- **Command:** exact command, including corpus env var
- **Measured AUC-24:**
- **Flag-run AUCs:** (if any, e.g. --with-question-latency-deduction,
  --with-reversal-detection, or a measure-auc-split.mjs partition run)
- **Corpus fingerprint:** manifest script count and/or corpus-split.json
  content hash — never a script title
- **Runner attestation:** "<name/role> measured this locally on <date>,
  <machine/session context>."
```
