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
