# P1 Benchmark — Measurement Runbook

**Purpose:** This runbook makes P1 measurements reproducible for someone who has the 761-script corpus but has not read PRE_REGISTRATION_PROTOCOL.md, SPLIT_STRATEGY.md, or other P1 docs.

**Last updated:** 2026-08-02  
**Scope:** Measuring discrimination AUC across train/val/test partitions; iteration discipline; output interpretation; result recording.

---

## 1. Prerequisites: Corpus Layout

### 1.1 Where the Corpus Lives

The 761-script corpus is LOCAL-ONLY (copyright) and is never committed. The corpus TEXT must be provided by you; the split manifest lives in the repo.

**Required directory structure on YOUR machine:**

The example filenames below are illustrative id-form placeholders, not real
titles — the corpus was de-identified (see `docs/p1-benchmark/
CORPUS_IDENTIFICATION.md`) so this repo does not enumerate the private
corpus's screenplay titles. Real ids resolve to real titles only via the
private crosswalk the migration produces, kept off this repo.

```
/path/to/corpus/
├── crawl/
│   ├── action/
│   │   ├── SM-a1b2c3d4.fountain
│   │   ├── (other action scripts)
│   ├── sci-fi/
│   │   ├── SM-e5f6a7b8.fountain
│   │   ├── (other sci-fi scripts)
│   ├── drama/
│   ├── comedy/
│   └── (other genre folders)
├── SM-c9d0e1f2.fountain.txt
├── (other root-level scripts)
```

The corpus contains:
- **456 train scripts** (60% of 761 valid)
- **152 val scripts** (20%)
- **153 test scripts** (20%, hash-locked, never to be tuned against)

**Total valid scripts:** 761 (from 765 source files, 4 excluded for parse or sceneCount failures).

### 1.2 What data/screenplays/ Contains Locally

The repo's `data/screenplays/` directory holds only 6 CC0 reference files (no copyright restrictions). These are NOT part of the 761-script corpus. They exist for manual testing and documentation only:

```
data/screenplays/
├── (6 CC0 files for reference only)
```

The actual 761 scripts referenced by `scripts/output/corpus-split.json` live ONLY in the external corpus directory you provide.

### 1.3 Verification: Confirm the Layout is Correct

Before running any measurement, verify your corpus structure:

> **Status as of this update:** `scripts/verify-corpus-layout.mjs` now
> exists and is verified end-to-end against the 6 CC0 files in
> `data/screenplays/` plus synthetic fixtures (see
> `CORPUS_IDENTIFICATION.md` §6). It has **not** been run against the real
> 761-script corpus. It also assumes the **migrated, id-based** manifest
> schema (`scripts/migrate-corpus-ids.mjs`'s output: `id`, `contentHash`,
> `genre`, `origin`, `file=<id>.fountain`, ...) — as of this writing,
> `scripts/output/corpus-split.json` is still the **pre-migration**,
> title-bearing manifest (`file` paths like `crawl/action/the-avengers.fountain`),
> because the real corpus text needed to compute real ids isn't available
> in the environment that built this tooling. Run
> `node scripts/migrate-corpus-ids.mjs --corpus-dir=/path/to/corpus --write`
> first (see `CORPUS_IDENTIFICATION.md` §4 for the full procedure); running
> verify-corpus-layout.mjs against the manifest as currently committed will
> correctly fail its second check ("split manifest is migrated schema") with
> a message pointing at that command.

**Command:**

```bash
node scripts/verify-corpus-layout.mjs --corpus-dir=/path/to/corpus --split-file=scripts/output/corpus-split.json
```

**Expected output (all green, post-migration):**

```
══════════════════════════════════════════════════════════════════════════
CORPUS LAYOUT VERIFICATION
══════════════════════════════════════════════════════════════════════════
corpus dir   : /path/to/corpus
split file   : scripts/output/corpus-split.json

✓ corpus dir set and readable
✓ split manifest present
✓ split manifest is migrated schema (id + contentHash present)
✓ every manifest id resolves to a present file (761/761)
✓ content hash matches for every present file (761/761)

partition               | expected | found | status
--------------------------------------------------
train                   |      456 |   456 | ✓
val                     |      152 |   152 | ✓
test                    |      153 |   153 | ✓
--------------------------------------------------
total                   |      761 |   761 | ✓

✓ partition counts match manifest
test set hash (manifest) : <the RE-LOCKED hash — see CORPUS_IDENTIFICATION.md §7,
                             this differs from the pre-migration
                             e19e6cc2...744edeb value on purpose: renamed files
                             change the lock's filename half>
test set hash (recomputed): <same value>
✓ test set lock verifies

──────────────────────────────────────────────────────────────────────────
tests/fixtures/real-corpus-manifest.json
──────────────────────────────────────────────────────────────────────────
✓ real-corpus-manifest is migrated schema (id + contentHash present)
✓ every entry resolves (72/72)
✓ content hash matches (72/72)

══════════════════════════════════════════════════════════════════════════
corpus layout OK. Ready to measure.
```

Each check line prints `✓`/`✗` independently and the script exits non-zero
on any failure — a partial pass never looks green. **If verification
fails:** stop, do not run measurements. Fix whatever the failing line names
(missing corpus dir, un-migrated manifest, a resolve/hash mismatch, or a
lock mismatch) and rerun.

---

## 2. Exact Commands for Each Partition

The harness is `scripts/measure-auc-split.mjs`. It takes a `--partition` flag and a mandatory environment variable pointing to your corpus.

### 2.1 Run Train Partition (Development, Iterate Freely)

```bash
CORPUS_DIR=/path/to/corpus node scripts/measure-auc-split.mjs --partition=train
```

**Output:**
- Stdout: ASCII table with AUC, 95% confidence interval, and gate status for each degradation type
- File: `scripts/output/discrimination-auc-train.csv` (raw pairs for further analysis)

**Example output:**
```
═══ DISCRIMINATION AUC — partition: train (456 scripts) ═══

degradation            | pairs |   AUC   |  95% CI          | gate (>=0.80)
-----------------------|-------|---------|------------------|----------------
SCENE_SHUFFLE          |   455 | 0.727   | [0.690, 0.765]   | partial
MIDPOINT_DROP          |   454 | 0.735   | [0.695, 0.774]   | partial
CLIMAX_RELOCATE        |   455 | 0.481   | [0.446, 0.516]   | FAIL
DIALOGUE_FLATTEN       |   456 | 0.567   | [0.529, 0.605]   | FAIL
-----------------------|-------|---------|------------------|----------------
ALL POOLED             |  1820 | 0.627   | [0.608, 0.647]   | FAIL
```

### 2.1b Optional: measure the question-latency deduction candidate (P1, 2026-08-03)

`server/nvm/analyze/question-latency-deduction.ts` is an UNWIRED bounded-deduction
candidate re-routing payoff.ts's three question-latency rules (UNANSWERED_QUESTION_FLOOD,
INSTANT_GRATIFICATION_PATTERN, DEAD_QUESTION_ZONE) out of the AUC~0.076 densityPenalty
channel — see `docs/p1-benchmark/STRUCTURAL_SIGNAL_SCREEN_2026-08-03.md`, candidate 5, for
the diagnosis this responds to. `measure-auc-split.mjs` takes an opt-in flag to measure its
effect on the real corpus, OFF by default (default behavior is unchanged):

```bash
CORPUS_DIR=/path/to/corpus node scripts/measure-auc-split.mjs --partition=train --with-question-latency-deduction
# or: QL_DEDUCTION=1 CORPUS_DIR=/path/to/corpus node scripts/measure-auc-split.mjs --partition=train
```

Run this AND a normal flag-off `--partition=train` run, then compare the two AUC tables —
that comparison is the entire experiment. Output goes to a separate file
(`discrimination-auc-train-with-ql-deduction.csv`) so it can never collide with or shrink the
committed baseline CSV. This does not change production health/verdict/grade by itself
(`computeQuestionLatencyDeduction` is not called from `doctor.ts`); wiring it in is a
separate future change gated on this measurement plus the AUC-24 ratchet in
`tests/core/real-script-corpus.test.ts` holding (see CLAUDE.md's "Which floor, exactly").

### 2.1c Optional: measure the reversal-detection disagreement rate (P1, 2026-08-04)

`server/nvm/analyze/reversal-detection.ts` is an UNWIRED candidate responding to detector
defect D3 (`docs/p1-benchmark/DETECTOR_DEFECTS_2026-08-03.md`): the current
`structure.reversalCount` definition (`suspenseDelta < -1`, a magnitude dip) is blind to
revelation-type reversals — a twist ending can register zero reversals even though the
engine's own `revelation` extraction correctly identifies the same beat as the climax. This
module detects reversals via two deterministic channels (revelation-text allegiance/identity
inversion, and a large relationship-shift sign flip against an established pair — see the
module's header for the exact CAN/CANNOT boundary of each). `measure-auc-split.mjs` takes an
opt-in flag to report the legacy-vs-detected disagreement on the real corpus, OFF by default
(default behavior is unchanged):

```bash
CORPUS_DIR=/path/to/corpus node scripts/measure-auc-split.mjs --partition=train --with-reversal-detection
# or: REV_DETECTION=1 CORPUS_DIR=/path/to/corpus node scripts/measure-auc-split.mjs --partition=train
```

Unlike `--with-question-latency-deduction`, this flag does NOT subtract anything from health
before pairing — there is no agreed deduction shape yet, so the first question is only whether
detection disagrees with legacy on real writing at all, and in which direction. It logs a
per-script `legacyCount | detectedCount | delta` table plus an aggregate disagreement rate and
a "legacy misses entirely" rate (legacyCount == 0 and detectedCount >= 1 — D3's exact failure
direction), computed from each script's REAL (undegraded) text only. Output goes to a separate
file (`reversal-detection-diagnostic-train.csv`) so it can never collide with or shrink the
committed baseline CSV, and the AUC table/pairs/baseline CSV above are unaffected byte-for-byte
by this flag (verified by diffing a real run before/after — see the module's own commit for the
diff). This does not change production health/verdict/grade/reversalCount by itself
(`detectReversals`/`computeReversalDelta` are not called from `doctor.ts` or `structure.ts`);
designing a deduction/rule shape from this measurement, and wiring it in, is separate future
work gated on the AUC-24 ratchet in `tests/core/real-script-corpus.test.ts` holding (see
CLAUDE.md's "Which floor, exactly") and the full P1 evidence protocol.

### 2.2 Run Validation Partition (Checkpoint, No Tuning)

```bash
CORPUS_DIR=/path/to/corpus node scripts/measure-auc-split.mjs --partition=val
```

**Output:**
- Stdout: Same table format (AUC, CI, gate)
- File: `scripts/output/discrimination-auc-val.csv`

**Purpose:** Checkpoint AUC — check whether train results generalize. DO NOT TUNE against this. If train AUC is much higher than val AUC (overfitting signal), investigate but do not modify code based on the val numbers themselves.

### 2.3 Run Test Partition (ONCE, Final Evaluation Only)

```bash
CORPUS_DIR=/path/to/corpus node scripts/measure-auc-split.mjs --partition=test
```

**Output:**
- Stdout: Same table format
- File: `scripts/output/discrimination-auc-test.csv`
- **Verification:** The script automatically verifies the test set hash against the locked value at `scripts/output/corpus-test-hash.txt`:
  ```
  e19e6cc2ab492b55107ae0721ae985c9779a4723f0288555ac2d86970744edeb
  ```
  If the hash does not match, the script ABORTS with:
  ```
  TEST SET HASH MISMATCH!
    locked:  e19e6cc2...
    current: <some other hash>
    The test set has changed since it was locked. Aborting.
  ```

**⚠️ CRITICAL:** This command MUST be run exactly ONCE, after code is frozen. Running it multiple times after formula changes violates the pre-registration protocol (see §3 below).

---

## 3. Iteration Discipline: What's Allowed, What's Forbidden

The pre-registration protocol (PRE_REGISTRATION_PROTOCOL.md §3–6) defines strict rules to prevent overfitting and p-hacking.

### 3.1 Train Partition — Freely Iterable

**What you may do:**
- Run `measure-auc-split.mjs --partition=train` as many times as you like
- Change formula constants, add/remove rules, modify degradation recipes
- Analyze individual script pairs in `scripts/output/discrimination-auc-train.csv`
- Iterate to improve train AUC

**What counts as "development":**
- Any code change to `server/nvm/analyze/doctor.ts` (formula)
- Any change to `server/nvm/analyze/passes/` (rules)
- Any change to the degradation functions in `scripts/measure-auc-split.mjs` itself

### 3.2 Validation Partition — Checkpoint Only, No Tuning

**What you may do:**
- Run `measure-auc-split.mjs --partition=val` to check generalization
- Compare val AUC to train AUC to detect overfitting
- Read `scripts/output/discrimination-auc-val.csv` to identify which script pairs fail

**What you must NOT do:**
- Change formula constants or rules BASED ON val AUC numbers
- Tune "to make val look better"
- Treat val AUC as a target to optimize
- Revert changes because val AUC regressed

**Why:** Val is a held-out checkpoint to detect when train overfitting occurs. Tuning against val makes the checkpoint useless — you're sneaking development into the validation step.

### 3.3 Test Partition — Single-Use, Hash-Locked, Untouchable

**What you may do:**
- Run `measure-auc-split.mjs --partition=test` exactly once, after code freeze
- Read the final AUC, CI, and gate status
- Record the result in DISCRIMINATION_BASELINE_YYYY-MM-DD.md

**What you must NOT do:**
- Run against test more than once (unless documenting a deviation)
- Change any code after the first test run and before committing a new test evaluation
- Look at individual test scripts' health scores before the final evaluation
- "Check what happened to test" after a formula change without a new full freeze/measure cycle

**Hash verification:** The script checks `scripts/output/corpus-test-hash.txt` before running. If the hash does not match (test set file contents changed), abort immediately. This catches accidental modifications.

**What constitutes a protocol violation:**
- Running test → seeing a result → changing formula → running test again (FORBIDDEN)
- Running test → running train → running test again (FORBIDDEN, second test run is invalid)
- Tuning on test (FORBIDDEN — would be p-hacking on held-out data)

**Recovery:** If test has been run, any new code iteration requires documenting the deviation in PRE_REGISTRATION_PROTOCOL.md §9 (Deviations & Amendments) before a new test run is valid.

---

## 4. How to Read the Output

### 4.1 Understanding AUC

**AUC = Area Under ROC Curve** (pairwise discrimination). Measures the fraction of (real, degraded) script pairs where the doctor's health score is HIGHER on the real (intact) script than on the degraded (intentionally broken) version.

| AUC | Interpretation | Status |
|-----|----------------|--------|
| 1.0 | Perfect — score always higher on intact vs degraded | ✅ Ideal |
| 0.80+ | Strong — score almost always discriminates correctly | ✅ Gate PASS |
| 0.70–0.79 | Partial — score discriminates often, but misses some cases | ⚠️ Partial pass |
| 0.60–0.69 | Weak — barely above random; unreliable | ❌ Weak signal |
| 0.50 | Random — coin flip; no discrimination at all | ❌ FAIL |
| < 0.50 | Inverted — score REWARDS degradation (bug) | 🚨 Critical failure |

### 4.2 Four Degradation Types

Each script is scored twice: intact and degraded. The degradation is mechanical, not human:

| Degradation | Recipe | What it tests | Typical issue |
|---|---|---|---|
| **SCENE_SHUFFLE** | Shuffle scene order randomly (seed 42), drop every 3rd scene | Does the score notice scrambled scene order + missing scenes? | Scene-order detection |
| **MIDPOINT_DROP** | Delete scenes from 40–60% of script (middle act) | Does the score notice act deletion? | Act / structural hole |
| **CLIMAX_RELOCATE** | Move the last scene to position 2 (climax opens the film) | Does the score notice climax in wrong position? | Position-specific signals |
| **DIALOGUE_FLATTEN** | Replace all dialogue lines with "Hello." | Does the score notice dialogue removal? | Dialogue-specific signals |

### 4.3 The P1 Gate: AUC >= 0.80

**Gate definition (PRE_REGISTRATION_PROTOCOL.md §11):**
- ✅ AUC >= 0.80 on test set, AND
- ✅ Bootstrap 95% CI lower bound > 0.65

**Current gate status (measured 2026-07-29):**

| Degradation | Test AUC | Status |
|---|---|---|
| DIALOGUE_FLATTEN | 0.990 | ✅ **PASS** |
| SCENE_SHUFFLE | 0.734 | ⚠️ partial |
| MIDPOINT_DROP | 0.766 | ⚠️ partial |
| CLIMAX_RELOCATE | 0.523 | ❌ FAIL |
| **ALL POOLED** | **0.754** | ⚠️ partial |

**Verdict:** The dialogue channel alone passes the gate. The pooled AUC (0.754) and structural channels are below 0.80 but above the 0.70 threshold.

### 4.4 Bootstrap 95% Confidence Interval

**CI = [lower_bound, upper_bound]** — the 95% range where the true AUC likely falls, computed via 10,000× resampling with a seeded PRNG (reproducible).

| Example | Interpretation |
|---|---|
| `[0.690, 0.765]` | True AUC is likely between 0.690 and 0.765 |
| `[0.680, 0.880]` | Wide CI — high uncertainty; sample may be too small |
| `[0.795, 0.805]` | Narrow CI — high confidence; stable estimate |

**Gate check:** If CI lower bound > 0.65, the measurement is sufficiently certain. If lower bound ≤ 0.65, the result is unreliable even if point AUC >= 0.80.

**Decision rule:** When CI straddles the 0.80 gate (e.g., `[0.75, 0.85]`), the result is UNCERTAIN. Do not claim the gate is passed. Investigate whether more data/iterations would tighten the CI.

### 4.5 All Pooled AUC

Sum of all valid pairs across all four degradation types, treated as a single population. Tests whether the score discriminates on AVERAGE across all structural and content damage types.

**Interpretation:** If individual degradations pass but pooled AUC fails (or vice versa), it signals that the score works unevenly — good at detecting some damage types, poor at others.

### 4.6 Shuffle-Drop AUC Floor (Regression Constraint)

**Current floor:** 0.622 (measured 2026-07-29 on AUC-71 manifest subset, live shuffled; documented in NORTH_STAR.md line 54).

**Constraint (CLAUDE.md §7):** "measure-before-threshold on the REAL corpus still holds for any scoring change, and the shuffle-drop AUC must not regress below its floor."

**Action:** If a formula change causes SCENE_SHUFFLE test AUC to drop below 0.622, the change is BLOCKED — it regresses a known working signal.

---

## 5. Recording Results

Once test evaluation is complete, results must be recorded in the permanent baseline document.

### 5.1 Where to Record: DISCRIMINATION_BASELINE_YYYY-MM-DD.md

Create or update a file `docs/p1-benchmark/DISCRIMINATION_BASELINE_YYYY-MM-DD.md` (use the date of the test run).

**Required fields:**

```markdown
# P1 Discrimination Baseline — YYYY-MM-DD

**Status:** [Describe the work completed, e.g., "Dialogue channel solved via bounded deduction. Structural channels remain at formula-layer ceiling."]

---

## TL;DR

On 761 real produced screenplays (456 train / 152 val / 153 test, seed 42, hash-locked test set):

| Degradation | Train AUC | Val AUC | **Test AUC** | Gate (≥0.80) |
|---|---:|---:|---:|---|
| DIALOGUE_FLATTEN | 0.997 | 0.993 | **0.990** | ✅ **PASS** |
| MIDPOINT_DROP | 0.732 | 0.669 | 0.766 | partial |
| SCENE_SHUFFLE | 0.729 | 0.725 | 0.734 | partial |
| CLIMAX_RELOCATE | 0.481 | 0.540 | 0.523 | FAIL (chance) |
| **ALL POOLED** | **0.735** | **0.732** | **0.754** | partial |

---

## Methodology

**Corpus:** 761 valid screenplays (see corpus-split.json, seed 42)
- Train: 456 (rows 1–456 of split.json)
- Val: 152 (rows 457–608)
- Test: 153 (rows 609–761, hash-locked)

**Measurement script:** `scripts/measure-auc-split.mjs`

**Degradations:** 4 mechanical variants applied deterministically
- SCENE_SHUFFLE: shuffle order + drop every 3rd scene
- MIDPOINT_DROP: remove scenes 40–60% (middle act)
- CLIMAX_RELOCATE: move last scene to position 2
- DIALOGUE_FLATTEN: replace all dialogue with "Hello."

**AUC calculation:** Pairwise (intact vs degraded), bootstrap 95% CI (10,000 iterations, seed 42)

---

## Results — Train Partition

[Paste stdout table from measure-auc-split.mjs --partition=train]

---

## Results — Val Partition

[Paste stdout table from measure-auc-split.mjs --partition=val]

---

## Results — Test Partition

[Paste stdout table from measure-auc-split.mjs --partition=test]

**Test set hash verified:** e19e6cc2ab492b55107ae0721ae985c9779a4723f0288555ac2d86970744edeb

---

## Analysis

[Brief explanation of what changed, why, what it means]

---

## Regression Check

**Shuffle-drop floor (current requirement):** 0.622 (from NORTH_STAR.md)
**This measurement, test AUC:** 0.734
**Status:** ✅ Does not regress (0.734 > 0.622)

---

## CSV Outputs

- `scripts/output/discrimination-auc-train.csv` (455 SCENE_SHUFFLE pairs, 454 MIDPOINT_DROP, 455 CLIMAX_RELOCATE, 456 DIALOGUE_FLATTEN)
- `scripts/output/discrimination-auc-val.csv`
- `scripts/output/discrimination-auc-test.csv`
```

### 5.2 Regression Measurement MUST Be Reported, Not Re-run

**Key rule:** If test AUC regresses below the floor (e.g., SCENE_SHUFFLE drops from 0.734 to 0.600):

1. **DO NOT re-run test hoping for a better number** (that is p-hacking).
2. **DO record the regression in the baseline document** with:
   - The degradation type and old/new AUC
   - The code change that caused it
   - Analysis of why it happened
   - Decision: revert the change, accept the regression with justification, or mark as a deviation in PRE_REGISTRATION_PROTOCOL.md §9.

**Example regression entry:**

```markdown
## Regression Detected

**Degradation:** SCENE_SHUFFLE  
**Previous test AUC:** 0.734 (measured 2026-07-29)  
**New test AUC:** 0.598 (measured 2026-08-02)  
**Regression:** 0.136 points  
**Cause:** Removed emotional-arc-intensity signal from formula (commit abc1234)  
**Decision:** Revert commit abc1234. The signal contributes to shuffle-drop discrimination and cannot be removed without special justification.  
```

---

## 6. Current State Table

This table shows every AUC measurement to date, labeled with partition and date so readers cannot mistake a train number for a test number.

**All measurements on 761-script corpus (60/20/20 split, seed 42, hash-locked test set):**

| Degradation | Partition | Measured | AUC | 95% CI | Gate Status | Source |
|---|---|---|---:|---|---|---|
| DIALOGUE_FLATTEN | **Test** | 2026-07-29 | 0.990 | [0.977, 0.996] | ✅ **PASS** | DISCRIMINATION_BASELINE_2026-07-29.md |
| DIALOGUE_FLATTEN | Val | 2026-07-29 | 0.993 | [0.985, 0.998] | ✅ **PASS** | DISCRIMINATION_BASELINE_2026-07-29.md |
| DIALOGUE_FLATTEN | Train | 2026-07-29 | 0.997 | [0.992, 0.999] | ✅ **PASS** | DISCRIMINATION_BASELINE_2026-07-29.md |
| SCENE_SHUFFLE | **Test** | 2026-07-29 | 0.734 | [0.690, 0.765] | ⚠️ partial | DISCRIMINATION_BASELINE_2026-07-29.md |
| SCENE_SHUFFLE | Val | 2026-07-29 | 0.725 | [0.662, 0.785] | ⚠️ partial | DISCRIMINATION_BASELINE_2026-07-29.md |
| SCENE_SHUFFLE | Train | 2026-07-29 | 0.727 | [0.690, 0.765] | ⚠️ partial | DISCRIMINATION_BASELINE_2026-07-29.md |
| MIDPOINT_DROP | **Test** | 2026-07-29 | 0.766 | [0.724, 0.804] | ⚠️ partial | DISCRIMINATION_BASELINE_2026-07-29.md |
| MIDPOINT_DROP | Val | 2026-07-29 | 0.675 | [0.603, 0.748] | ⚠️ weak | DISCRIMINATION_BASELINE_2026-07-29.md |
| MIDPOINT_DROP | Train | 2026-07-29 | 0.732 | [0.695, 0.774] | ⚠️ partial | DISCRIMINATION_BASELINE_2026-07-29.md |
| CLIMAX_RELOCATE | **Test** | 2026-07-29 | 0.523 | [0.482, 0.562] | ❌ FAIL | DISCRIMINATION_BASELINE_2026-07-29.md |
| CLIMAX_RELOCATE | Val | 2026-07-29 | 0.540 | [0.480, 0.599] | ❌ FAIL | DISCRIMINATION_BASELINE_2026-07-29.md |
| CLIMAX_RELOCATE | Train | 2026-07-29 | 0.481 | [0.446, 0.516] | ❌ FAIL | DISCRIMINATION_BASELINE_2026-07-29.md |
| ALL POOLED | **Test** | 2026-07-29 | 0.754 | [0.733, 0.774] | ⚠️ partial | DISCRIMINATION_BASELINE_2026-07-29.md |
| ALL POOLED | Val | 2026-07-29 | 0.732 | [0.708, 0.756] | ⚠️ partial | DISCRIMINATION_BASELINE_2026-07-29.md |
| ALL POOLED | Train | 2026-07-29 | 0.735 | [0.715, 0.755] | ⚠️ partial | DISCRIMINATION_BASELINE_2026-07-29.md |

**Key observations:**
- **Dialogue channel passes gate on all partitions** (train/val/test all >= 0.80, CIs do not cross 0.65 threshold).
- **Structural channels plateau below gate:** SCENE_SHUFFLE 0.73, MIDPOINT_DROP 0.77, CLIMAX_RELOCATE 0.52. These are formula-layer ceilings; further progress requires analyzer-layer work (new position-reading signals).
- **Train/val agreement is tight** on all degradations, indicating stable generalization (no severe overfitting).
- **Test AUC is slightly higher than val** (within noise), suggesting no gross overfitting and sound methodology.

---

## 7. Inconsistencies & Missing Pieces Found During Runbook Assembly

The following gaps or conflicts exist across the P1 docs and should be addressed:

### 7.1 verify-corpus-layout.mjs Does Not Exist

**Issue:** The runbook (§1.3) calls `node scripts/verify-corpus-layout.mjs`, but this script is not committed.

**Current state:** Only `scripts/measure-auc-split.mjs` and `scripts/measure-real-script-discrimination.ts` exist. There is no pre-flight verification tool.

**Recommendation:** Either commit a verification script or add a README note that operators must manually check file counts (`ls data/screenplays/crawl/**/*.fountain | wc -l` etc.) before running measurements.

### 7.2 corpus-split.json References Files Not in data/screenplays/

**Issue:** `scripts/output/corpus-split.json` lists 761 scripts with paths like `crawl/action/SM-a1b2c3d4.fountain` (id-form example — see de-identification note in §1.1). The repo's `data/screenplays/` contains only 6 CC0 reference files. The 755 other scripts live only in the external corpus directory.

**Current state:** Documented (DISCRIMINATION_BASELINE_2026-07-29.md §"What changed and why") but not formalized in the runbook or split schema.

**Recommendation:** Add a field to corpus-manifest-schema.json noting that paths are RELATIVE TO an external corpus root, not the repo. Clarify in README that `data/screenplays/` is NOT the 761-script corpus.

### 7.3 Shuffle-Drop AUC Floor Value Scattered Across Docs

**Issue:** The shuffle-drop AUC floor (required to prevent regression) is:
- Mentioned in CLAUDE.md line 117 as a CONSTRAINT ("must not regress below its floor")
- Stated in NORTH_STAR.md line 54 as "0.622 ratchet floor"
- Measured as 0.727–0.729 in DISCRIMINATION_BASELINE_2026-07-29.md (train) and 0.734 (test)

The "0.622" is an OLD AUC-24 floor (first 24 manifest entries); the current 761-script corpus gives 0.734. Which one is the operative floor?

**Recommendation:** ~~Update CLAUDE.md §7 to state: "shuffle-drop AUC on the 761-script test partition must not regress below 0.734 (measured 2026-07-29)." Clarify that the 0.622 floor is historical (smaller corpus) and is superseded.~~

> **DO NOT ACTION — superseded 2026-08-04 (decision recorded).** CLAUDE.md's
> current "Which floor, exactly" section explicitly forbids this exact move,
> and it is right: the 0.622 ratchet and the 0.734 baseline are THREE-WAY
> non-comparable statistics — different corpus (24-script subset vs 153-script
> hash-locked test partition), different degradation (one combined
> shuffle+drop vs separate SCENE_SHUFFLE/MIDPOINT_DROP), different
> denominator. "Updating" the enforced 0.622 assertion to a P1 number would
> break `tests/core/real-script-corpus.test.ts` with no real regression
> having occurred. Both floors coexist on purpose; this subsection is kept
> as the record of a plausible-looking mistake so it is not re-proposed.

### 7.4 "measure-real-script-discrimination.ts" vs "measure-auc-split.mjs"

**Issue:** Two similar measurement scripts exist:
- `scripts/measure-real-script-discrimination.ts` — measures on a FULL corpus (requires `REAL_SCRIPT_CORPUS_DIR` env var, no split, runs 24-script subset for AUC)
- `scripts/measure-auc-split.mjs` — measures on partition (train/val/test split, split-aware)

They are NOT interchangeable. The runbook must use only `measure-auc-split.mjs` (the split-aware one). But a future user might conflate them.

**Recommendation:** Add a "Related but different scripts" section in this runbook clarifying the difference (one is for full-corpus measurement without splits, the other for split-aware partition measurement).

### 7.5 No Formalized AUC Verification Against CI Lower Bound

**Issue:** PRE_REGISTRATION_PROTOCOL.md §11 states: "✅ Bootstrap 95% CI lower bound > 0.65" as a gate requirement. But `measure-auc-split.mjs` output only prints the CI range; the runbook must spell out how to CHECK this manually (read the CI output, verify lower bound).

**Recommendation:** Add a checker script or a clearer worked example showing how to validate the CI lower bound. Alternatively, have measure-auc-split.mjs print a clear "CI lower bound > 0.65?" status line.

### 7.6 Test Set Hash Check Unclear in Output

**Issue:** The `measure-auc-split.mjs --partition=test` script verifies the hash, but the output message could be clearer. Currently:
```
Test set hash verified: e19e6cc2ab492b55107ae0721ae...
```

This is easy to miss or misinterpret. A future user might not realize the hash verification is CRITICAL.

**Recommendation:** Print in all caps or a separate line:
```
⚠️  TEST SET HASH VERIFICATION: LOCKED HASH MATCHED ✓ (e19e6cc2...)
     This confirms the test set is unchanged since split generation.
     If this line is missing or shows MISMATCH, DO NOT TRUST the AUC result.
```

---

## 8. Discharging Accumulated Obligations in One Command

**Added:** 2026-08-04, alongside `scripts/discharge-obligations.mjs`.

Sections 1–7 above walk through each maintainer-machine measurement
individually. In practice these obligations accumulate faster than they get
discharged — they're scattered across this runbook, `docs/p1-benchmark/
MEASUREMENT_RECEIPTS.md`, and `CLAUDE.md`, each with its own env var, flag,
and output shape. `scripts/discharge-obligations.mjs` is the single command
that runs all of them in one pass and prints a receipt block ready to paste
into `MEASUREMENT_RECEIPTS.md`.

### 8.1 Run it

```bash
REAL_SCRIPT_CORPUS_DIR=/path/to/corpus npm run discharge-obligations
```

`CORPUS_DIR` also satisfies the env contract (either name is accepted; if
only one is set, it backfills the other for stages keyed to the other
name — see the script's own header for why two historical names exist).
The script fails fast, before running anything, if neither is set.

Useful flags:

```bash
# Run only one stage (see the five stage ids below):
REAL_SCRIPT_CORPUS_DIR=/path/to/corpus npm run discharge-obligations -- --only=measure-real

# Run everything except one stage:
REAL_SCRIPT_CORPUS_DIR=/path/to/corpus npm run discharge-obligations -- --skip=corpus-migration

# Label the run for the receipt header:
REAL_SCRIPT_CORPUS_DIR=/path/to/corpus npm run discharge-obligations -- --reason="pre-release sweep"
```

### 8.2 The five stages

1. **`measure-real`** — `npm run measure-real` (the AUC-24 ratchet
   statistic — §1–2 above measure the split-aware version of this; this is
   the full-corpus, no-split version), plus `node scripts/probe-real-
   corpus.mjs` to regenerate `scripts/output/real-corpus-scores.csv` (the
   artifact `measure-real` itself does NOT write — it is stdout-only; the
   CSV is a separate script's job, wired here so one command covers both).
2. **`auc-split-unwired-flags`** — runs `scripts/measure-auc-split.mjs`
   with each currently-unwired signal candidate
   (`--with-question-latency-deduction`, `--with-reversal-detection`,
   `--with-agency-signal`) against **train and val only, never test** — the
   test partition is evaluate-once (§2.3's "ONCE, Final Evaluation Only"
   rule); this orchestrator's own code has no path that can construct a
   `--partition=test` invocation for these flags.
3. **`truth-extraction-recall`** — `scripts/probe-truth-order-
   sensitivity.mjs`'s RECALL MODE, answering "does the truth-ledger
   contradiction detector fire on real thrillers at all?" over the real
   corpus (per-script fire counts print in the stage log).
4. **`corpus-migration`** — the de-id migration
   (`scripts/migrate-corpus-ids.mjs --write` + `scripts/verify-corpus-
   layout.mjs`), skipped automatically (no-op, clearly reported) if
   `scripts/output/corpus-split.json` is already in the migrated schema.
5. **`rebuild-experiment`** — optional, feature-detected: runs
   `scripts/rebuild-experiment.mjs` only if that file exists in the tree.

Each stage streams its underlying command's output live and records
pass/fail independently — a failing stage does not stop the remaining
stages from running (the final summary reports every stage's outcome).

### 8.3 The final step is still manual, on purpose

The script prints a ready-to-paste `MEASUREMENT_RECEIPTS.md` §3-template
entry to stdout and also writes it to a file under the OS temp directory
(never under `scripts/output/`, and never auto-appended to the ledger — see
`MEASUREMENT_RECEIPTS.md`'s own "What this ledger is NOT" section for why
that step stays human). Review the numbers, fill in the **Runner
attestation** line, and paste the block into `MEASUREMENT_RECEIPTS.md`
yourself, above its `## 3. Entry template` heading.

---

## References

- **PRE_REGISTRATION_PROTOCOL.md** — The full pre-registration covenant; sections §3–6 define iteration discipline.
- **SPLIT_STRATEGY.md** — Technical split methodology; documents 60/20/20, stratification, and held-out protection.
- **DISCRIMINATION_BASELINE_2026-07-29.md** — Latest baseline measurement on 761-script corpus.
- **corpus-manifest-schema.json** — JSON schema for corpus metadata.
- **NORTH_STAR.md** — Constitution and measured current state; documents the 0.622 historical floor and mentions the shuffle-drop AUC constraint.
- **CLAUDE.md** — Project memory; §7 cites the regression floor requirement.

---

**End of Runbook**
