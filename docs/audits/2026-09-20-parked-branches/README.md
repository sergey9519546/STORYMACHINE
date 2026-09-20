# Audit — 2026-09-20 Parked Branches

Triage of every remote branch except `main` and
`claude/fable-5-1-orchestrator-yil0xr`, per `SESSION_REPORT_2026-09-19.md`
§4 row 8. The finding to check: nine scoring branches are parked PENDING
OWNER MEASUREMENT, none merges cleanly, and nobody had a current map of what
each one still contains, what has since been superseded, and what it would
take to land each. This is that map, plus the six non-scoring branches the
same sweep covers.

**Method.** All commands below were run from a `lane/parked-branches`
worktree checked out at `26d930dd` (the session branch this audit was written
on), not `origin/main` — `origin/main` is an ancestor of `26d930dd` (53
commits behind it, confirmed by `git rev-list --count origin/main..26d930dd`
= 53 and the reverse = 0), so every branch's merge-base with `origin/main`
and with `26d930dd` is identical, but the merge-trial conflict lists below
are taken against `26d930dd`, not the `origin/main`-only `merge-tree` pass in
`docs/UNIFIED_STATE_2026-09-02.md`'s 2026-09-19 addendum — the two mostly
agree, and where they differ (more `docs/brain/**` churn visible here) it is
because `26d930dd` regenerated the brain graph more times since. Merge trials
ran with `git merge --no-commit --no-ff origin/<branch>` in a throwaway
`--detach` worktree per branch, then `git merge --abort`; every trial
worktree was removed afterward (`git worktree list` from the main checkout
shows none left over).

## Summary table

| Branch | Ahead of 26d930dd | Scoring-path? | Merge onto 26d930dd | Recommendation |
|---|---|---|---|---|
| `calibrate/voice-bound-2026-09-13` | 2 | no | 4 code conflicts | SUPERSEDED |
| `calibrate/voice-bound-2026-09-13b` | 3 | no | 4 code conflicts | SUPERSEDED |
| `calibrate/voice-bound-2026-09-13c` | 4 | no | 4 code conflicts | SUPERSEDED |
| `calibrate/voice-bound-2026-09-13d` | 5 | no | 6 code conflicts | SUPERSEDED |
| `claude/advice-rule-fixes-pending-measurement` | 1 | yes (13 files) | 1 docs conflict | SUPERSEDED |
| `claude/r5-verbosity-bias-pending-measurement` | 4 | yes (2 files) | 1 code + 1 docs conflict | SUPERSEDED |
| `lane/healthcheck-ipv4` | 0 | no | clean | SUPERSEDED (already merged, PR #265) |
| `lane/node-24` | 0 | no | clean | SUPERSEDED (already merged, PR #264) |
| `scoring/adversarial-2026-09-12` | 43 | yes (7 files) | 9 docs + 4 code conflicts (13 files, 25 markers) | KEEP-AS-REFERENCE (subsumed by `scoring/renderer-residuals`) |
| `scoring/advice-rule-fixes` | 5 | yes (13 files) | 2 docs conflicts, 0 code | **LAND** |
| `scoring/feature-length-defects` | 18 | yes (5 files) | 7 docs + 7 code conflicts | REBASE-THEN-LAND |
| `scoring/feature-length-saturation-only` | 3 | yes (1 file) | 5 docs + 1 code conflict | REBASE-THEN-LAND, contingent (fallback only if `feature-length-defects` is rejected) |
| `scoring/forced-cue` | 59 | yes (8 files) | 9 docs + 6 code conflicts (15 files, 28 markers) | KEEP-AS-REFERENCE (subsumed by `scoring/renderer-residuals`) |
| `scoring/r5-verbosity-bias` | 8 | yes (2 files) | 1 code + 2 docs conflicts | REBASE-THEN-LAND, contingent (see R5-vs-feature-length collision below) |
| `scoring/renderer-residuals` | 72 | yes (8 files) | 10 docs + 6 code conflicts (16 files, 30 markers) | REBASE-THEN-LAND |
| `scoring/stacked-r5-plus-advice` | 21 | yes (15 files) | 1 code + 2 docs conflicts | REBASE-THEN-LAND, contingent (bakes in R5; same collision) |
| `wip/phase-w-ui-checkpoint` | 3 | no | 10 code conflicts, 0 docs | ABANDON |

Ahead counts are ahead of `26d930dd`; every branch's ahead-of-`origin/main`
count is identical for the reason stated above. "Scoring-path?" quotes
`node scripts/check-scoring-receipt.mjs <merge-base>..origin/<branch>`'s
first line, run from the worktree.

## Two duplicate groups, named by SHA

### The four `calibrate/voice-bound-2026-09-13*` branches are one linear stack

Verified by `git merge-base --is-ancestor`: `-2026-09-13` (`c66ca57f`) is an
ancestor of `-13b` (`e4db6c77`), which is an ancestor of `-13c` (`4653a78e`),
which is an ancestor of `-13d` (`213795e7`). Each branch is the previous one
plus exactly one more commit — `9380ea08` (calibration script + runner
workflow), then `c66ca57f` (also run on `calibrate/**` push), then `e4db6c77`
(print the lock file into the log), then `4653a78e` (sweep the shape the
weight bound actually admits), then `213795e7` (a second, orthogonal bound,
`MAX_FOUNTAIN_VOICE_ELIGIBLE_DISTINCT`). Only `-13d` needs triage; `-13`,
`-13b`, `-13c` are strict prefixes and add nothing `-13d` lacks.

**All four are superseded already, and not by anything that needs landing.**
`26d930dd` carries `cd3fbb86`, `ee673b94`, `17f853d6`, `e5458290`, `c7150b9d`
on `scripts/lib/voice-bound.ts` / `server/lib/validation.ts`. Patch-id
comparison: `git show 4653a78e | git patch-id` and `git show ee673b94 |
git patch-id` both hash to `088d3ab3…` (identical patch); `213795e7` and
`17f853d6` both hash to `0cb32f0a…` (identical patch). `cd3fbb86` itself —
patch-similar but not patch-identical to `9380ea08` (rebase context differs)
— is a **literal ancestor of `26d930dd`** (`git merge-base --is-ancestor
cd3fbb86 26d930dd` exits 0). `26d930dd` then goes further than any of the
four branches: `e5458290` derives the actual bound
(`MAX_FOUNTAIN_VOICE_ELIGIBLE_DISTINCT = 80`, measured on `ubuntu-latest`,
confirmed present at `server/lib/validation.ts:807`) and `c7150b9d` is a
round-2 correction. This matches `docs/brain/Audits/Audit - 2026-09-18 Node
24.md` and `docs/UNIFIED_STATE_2026-09-02.md`'s 2026-09-19 addendum, both of
which already record the calibration finding as landed via `e5458290`. The
two commits unique to `-13`/`-13b` (`c66ca57f`, `e4db6c77`) are CI-only
conveniences (run calibration on `calibrate/**` push; print the lock file to
the log) with no code-path counterpart on `26d930dd` — harmless to lose, not
worth resurrecting on their own.

**Recommendation: SUPERSEDED, all four.** Safe to delete after the owner
confirms `MAX_FOUNTAIN_VOICE_ELIGIBLE_DISTINCT = 80` (or whatever value is
currently live) is the value they intend to keep — this is already the
recorded outcome, not a re-derivation the owner still owes.

### `claude/*-pending-measurement` vs `scoring/*` — same fix, rebased and renamed

Both pairs are already documented as "rebased and renamed" in
`docs/brain/Branches/Branch - Advice Rule Fixes.md` and `docs/brain/Branches/
Branch - R5 Verbosity Bias.md" ("the old … is superseded, not deleted"). This
audit verifies that claim at the patch level rather than repeating it.

- **`claude/advice-rule-fixes-pending-measurement` @ `68c64eca`** (1 commit
  on `main` @ `c21fdc5b`) vs **`scoring/advice-rule-fixes` @ `a1cf7677`**
  (5 commits on `main` @ `2bfcbf9d`, first of which is `59269669`). Diffing
  every file `68c64eca` touches against its `59269669` counterpart file by
  file: all 26 code/test files are byte-identical; the only difference is
  a correction appended to `docs/p1-benchmark/MEASUREMENT_RECEIPTS.md` (a
  "the summary line and the table do not match" correction, dated
  2026-09-04, present in `59269669` and absent from `68c64eca`).
  `scoring/advice-rule-fixes`'s four later commits then correct that ledger
  entry two more times and add the brain note. Same code, strictly better
  receipt.
- **`claude/r5-verbosity-bias-pending-measurement` @ `0f625c27`** (4 commits
  on `main` @ `e40f4cf5`: `f4c336f0`, `10e913d8`, `a7527423`, `0f625c27`) vs
  **`scoring/r5-verbosity-bias` @ `52bf410a`** (8 commits on `main` @
  `2bfcbf9d`). Patch-id comparison of the first three:
  `f4c336f0`≡`e307d610`, `10e913d8`≡`4e083370`, `a7527423`≡`6f2a0a7c`
  (identical patches). The fourth pair, `0f625c27` vs `7d613b12`, differs
  only in `docs/p1-benchmark/MEASUREMENT_RECEIPTS.md` — `7d613b12` adds one
  paragraph on the PENDING-entry honesty mechanism that `0f625c27` lacks.
  `scoring/r5-verbosity-bias`'s remaining four commits (`fa256566`,
  `cfb7233c`, `1193ea55`, `52bf410a`) are the rebase onto `main` @ `2bfcbf9d`
  and two further receipt corrections.

**Recommendation: SUPERSEDED, both `claude/*` branches.** Do not land them;
evaluate the `scoring/*` branch instead. Delete the `claude/*` refs once the
owner confirms `scoring/advice-rule-fixes` and `scoring/r5-verbosity-bias`
are the tracked tips (they already are, per the existing brain notes).

### The adversarial / forced-cue / renderer-residuals chain is one lane, not three branches

Verified by `git merge-base --is-ancestor`:
`scoring/adversarial-2026-09-12` (`4cf5b2f3`) is an ancestor of
`scoring/forced-cue` (`089bec91`), which is an ancestor of
`scoring/renderer-residuals` (`a4df0c49`). Checking out `renderer-residuals`
gets all three. `docs/brain/Owner/Owner - R5 Measurement and Merge.md`
already documents this as the measurement order's first three steps and
names `renderer-residuals` "the tip the run measures." This audit's merge
trial confirms the conflict set grows monotonically down the chain (13
conflicting files / 25 conflict markers at `adversarial-2026-09-12`, 15
files / 28 markers at `forced-cue`, 16 files / 30 markers at
`renderer-residuals`, mostly the same files recurring with one or two more
added per link).

**Recommendation:** KEEP-AS-REFERENCE for `scoring/adversarial-2026-09-12`
and `scoring/forced-cue` — they are checkpoints inside a lane whose current
tip is `scoring/renderer-residuals`; landing them separately from the tip
would either lose the later two links' fixes or require re-doing the same
merge twice. Evaluate `scoring/renderer-residuals` (REBASE-THEN-LAND, below)
as the actual landing candidate; once it lands or is confirmed as the
tracked tip, the two earlier refs are safe to delete.

## Per-branch detail

### `scoring/advice-rule-fixes` — LAND

- **Merge-base:** `2bfcbf9d22b230620bda999220a3dfcd69265858` (same for
  `origin/main` and `26d930dd`). 5 commits ahead. Last commit 2026-09-06.
- **Diff shape:** code — `tests/fixtures/advice-audit/excellent.fountain`,
  `tests/passes/conflict.test.ts`, `tests/passes/dialogue.test.ts`,
  `tests/passes/structure.test.ts`, plus 22 more under `server/nvm/` and
  `tests/`; docs — `docs/brain/Measurements/Measurement -
  ADVICE_RULE_FIXES_2026-09-04.md`, `docs/brain/brain.graph.json`,
  `docs/p1-benchmark/MEASUREMENT_RECEIPTS.md`,
  `docs/scoring/ADVICE_RULE_FIXES_2026-09-04.md`. `check-scoring-receipt.mjs`
  first line: `check-scoring-receipt: range
  "2bfcbf9d22b230620bda999220a3dfcd69265858..origin/scoring/advice-rule-fixes"
  — 13 scoring-path file(s) changed:` — touches
  `server/nvm/analyze/fountain-analyzer.ts`,
  `server/nvm/revision/passes/causality.ts` and 11 more (all under
  `server/nvm/revision/passes/`, `server/nvm/analyze/`,
  `server/nvm/screenplay/`, plus `src/lib/fountain.ts`).
- **Receipt:** `### 2026-09-04 — advice-rule fixes (six measured detector
  defects) — **PENDING OWNER MEASUREMENT**`. Reads PENDING.
- **Merge trial onto `26d930dd`:** conflicts in `docs/brain/GRAPH.md`
  (docs-only) and `docs/p1-benchmark/MEASUREMENT_RECEIPTS.md` (docs-only).
  Zero code conflicts.
- **Superseded?** Not superseded. `git log --oneline
  2bfcbf9d22b230620bda999220a3dfcd69265858..26d930dd --
  server/nvm/revision/passes/causality.ts server/nvm/revision/passes/
  conflict.ts server/nvm/revision/passes/dialogue.ts
  server/nvm/revision/passes/structure.ts
  server/nvm/analyze/reversal-detection.ts` returns 0 commits — nothing on
  the session branch has touched these six detectors since this branch's
  merge-base.
- **Recommendation: LAND.** Docs-only conflicts, code applies cleanly. Needs
  the owner's `npm run measure-real` (or `npm run owner:measure`, which
  drives the whole sequence below) before the receipt can be converted from
  PENDING.

**Owner runbook:**

```
git fetch origin
git worktree add ../trial-advice --detach 26d930dd   # or the current head
cd ../trial-advice
git merge origin/scoring/advice-rule-fixes
```

Resolve the two conflicts:

- `docs/brain/GRAPH.md` — regenerate rather than hand-merge: after resolving
  every other conflict, run `npm run brain` and take its output verbatim.
- `docs/p1-benchmark/MEASUREMENT_RECEIPTS.md` — keep both sides' prose (the
  branch's PENDING entry plus its own later corrections, and whatever
  entries landed on the session branch meanwhile); do not drop either
  side's entries.

Then, with a real corpus available:

```
REAL_SCRIPT_CORPUS_DIR=<corpus> npm run owner:measure
```

This runs the pre-flight, measures the branch in a detached worktree,
converts the PENDING entry via the three-scan recipe
(`scripts/lib/receipt-conversion.mjs`), and re-locks
`tests/fixtures/real-corpus-manifest.json` only on acceptance — see
`docs/brain/Owner/Owner - R5 Measurement and Merge.md` for the full
mechanism (it documents this exact recipe; the table there already lists
`scoring/advice-rule-fixes` as a step). If measuring by hand instead:
`npm run measure-real`, then fill the receipt's five required fields
(AUC-24 number, corpus fingerprint, exact command, git SHA, first-person
runner attestation) and re-lock the manifest with
`scripts/lib/manifest-relock.mjs`, then re-run `npm run brain` once more if
the receipt edit changed which docs the graph indexes.

### `scoring/r5-verbosity-bias` — REBASE-THEN-LAND, contingent

- **Merge-base:** `2bfcbf9d22b230620bda999220a3dfcd69265858`. 8 commits
  ahead. Last commit 2026-09-06.
- **Diff shape:** code — `tests/core/feature-scale-discrimination.test.ts`,
  `tests/core/rebuild-experiment.test.ts`, `tests/core/script-doctor.test.ts`,
  `tests/core/verbosity-bias.test.ts`, 6 more; docs —
  `docs/brain/brain.graph.json`, `docs/p1-benchmark/MEASUREMENT_RECEIPTS.md`,
  `docs/scoring/VERBOSITY_BIAS_2026-07-11.md`,
  `docs/scoring/VERBOSITY_BIAS_FIX_2026-09-03.md`.
  `check-scoring-receipt.mjs` first line: `— 2 scoring-path file(s)
  changed:` — `server/nvm/analyze/calibration/reference.ts` and
  `server/nvm/analyze/doctor.ts`.
- **Receipt:** `### 2026-09-03 — LANE R5 VERBOSITY-BIAS FIX: the health
  formula's density denominator changed from words to scene opportunities —
  **PENDING OWNER MEASUREMENT**`. Reads PENDING.
- **Merge trial onto `26d930dd`:** conflicts in `.github/workflows/ci.yml`
  (code — a comment-and-conditional conflict: `26d930dd` added a
  `docs_only` CI skip condition around the metamorphic-gate step that this
  branch's tree does not have, while this branch reworded the comment above
  it to say `empty_verbosity` is now a hard gate rather than a known-failing
  witness; resolving it means keeping the `docs_only` guard from `HEAD` and
  the updated comment text from this branch — both are true and neither
  side deletes the other's substance), `docs/brain/GRAPH.md` (docs-only),
  `docs/p1-benchmark/MEASUREMENT_RECEIPTS.md` (docs-only).
- **Superseded?** Not superseded — `git log --oneline
  2bfcbf9d22b230620bda999220a3dfcd69265858..26d930dd --
  server/nvm/analyze/doctor.ts server/nvm/analyze/calibration/reference.ts`
  returns 0 commits.
- **Recommendation: REBASE-THEN-LAND, but contingent.**
  `docs/brain/Owner/Owner - R5 Measurement and Merge.md` already documents
  that R5 and `scoring/feature-length-defects` are **alternatives, not a
  stack**: both rewrite `densityPenalty`, and R5's word-count-to-
  scene-opportunity substitution measured **worse** on the public benchmark
  (paired shuffle-drop 0.0938) than the feature-length branch's fix
  (0.8750) for the same defect. Landing R5 forecloses landing
  `feature-length-defects`'s density half on the same formula without a
  second rewrite. The owner's own decision tree (same note) puts
  `feature-length-defects` first and reaches the three R5 rows only via
  `--only=<step id>` after that decision. This audit does not re-open that
  decision; it only confirms the branch itself would merge with one
  small code conflict (the CI comment above) if chosen.

### `scoring/stacked-r5-plus-advice` — REBASE-THEN-LAND, contingent

- **Merge-base:** `2bfcbf9d22b230620bda999220a3dfcd69265858`. 21 commits
  ahead (includes 4 merge commits that pull each contributing branch's
  round-1/round-2 review corrections). Last commit 2026-09-06.
- **Contains both `scoring/advice-rule-fixes` and `scoring/r5-verbosity-bias`
  as unsquashed ancestors** — verified: `git merge-base --is-ancestor
  origin/scoring/advice-rule-fixes origin/scoring/stacked-r5-plus-advice` and
  the same check for `r5-verbosity-bias` both exit 0. It is `git merge
  --no-ff` of the two, plus a re-anchoring test commit and receipt
  corrections for the combined tree.
- **Diff shape:** code — `tests/fixtures/advice-audit/excellent.fountain`,
  `tests/passes/conflict.test.ts`, `tests/passes/dialogue.test.ts`,
  `tests/passes/structure.test.ts`, plus everything both parent branches
  touch (36 files total); docs — `docs/brain/brain.graph.json`,
  `docs/p1-benchmark/MEASUREMENT_RECEIPTS.md`,
  `docs/scoring/ADVICE_RULE_FIXES_2026-09-04.md`,
  `docs/scoring/VERBOSITY_BIAS_2026-07-11.md`,
  `docs/scoring/VERBOSITY_BIAS_FIX_2026-09-03.md`.
  `check-scoring-receipt.mjs` first line: `— 15 scoring-path file(s)
  changed:` — `server/nvm/analyze/calibration/reference.ts`,
  `server/nvm/analyze/doctor.ts`, and 13 more spanning both parents' scoring
  files.
- **Receipt:** three headings, all PENDING — the R5 entry, the advice-rule
  entry, and `### 2026-09-06 — STACKED TREE (R5 verbosity-bias + advice-rule
  fixes) — **PENDING OWNER MEASUREMENT**`.
- **Merge trial onto `26d930dd`:** conflicts in `.github/workflows/ci.yml`
  (code, the same comment/conditional conflict as `r5-verbosity-bias`
  above), `docs/brain/GRAPH.md` (docs-only),
  `docs/p1-benchmark/MEASUREMENT_RECEIPTS.md` (docs-only).
- **Superseded?** Not superseded (same doctor.ts/reference.ts check as
  above returns 0 commits on `26d930dd`).
- **Recommendation: REBASE-THEN-LAND, contingent on the same R5-vs-
  feature-length decision as `scoring/r5-verbosity-bias`.** If the owner
  picks `feature-length-defects` over R5 for the density-formula fix (as
  the existing decision tree recommends measuring first), this stacked
  branch should not land as-is — its advice-rule-fixes half should instead
  be re-stacked onto whichever density fix is chosen, which is exactly what
  landing `scoring/advice-rule-fixes` alone (above) and separately deciding
  R5 vs. `feature-length-defects` already achieves without this branch. If
  R5 is instead chosen, this branch is the more complete of the two ways to
  get both fixes and supersedes landing `r5-verbosity-bias` and
  `advice-rule-fixes` separately.

### `scoring/feature-length-defects` — REBASE-THEN-LAND

- **Merge-base:** `ad3f6fa770a18e7950e6031023c0fa3e9c0ed2e9`. 18 commits
  ahead. Last commit 2026-09-11.
- **Diff shape:** code — `tests/core/summary-honesty.test.ts`,
  `tests/core/voice-delta.test.ts`,
  `tests/security/fountain-shape-guard-cue-parity.test.ts`, plus 24 more
  (27 files total, including `scripts/lib/auc.ts`,
  `scripts/lib/public-benchmark.ts`, `scripts/report-unverified-gates.mjs`,
  `server/lib/validation.ts`, `src/components/scriptide/CoverageSummary.tsx`,
  `tests/core/public-benchmark.test.ts`); docs —
  `docs/p1-benchmark/MEASUREMENT_RECEIPTS.md`,
  `docs/p1-benchmark/PUBLIC_BENCHMARK_2026-09-06.md`,
  `docs/p1-benchmark/README.md`,
  `docs/scoring/FEATURE_LENGTH_DEFECTS_2026-09-07.md` (11 files total).
  `check-scoring-receipt.mjs` first line: `— 5 scoring-path file(s)
  changed:` — `server/nvm/analyze/doctor.ts`,
  `server/nvm/analyze/fountain-analyzer.ts`, and 3 more.
- **Receipt:** `### 2026-09-07 — FEATURE-LENGTH DEFECTS: the health formula
  stops paying for deletion and for length, plus three report-honesty fixes
  (PENDING OWNER MEASUREMENT — no real-corpus run happened)`. Reads
  PENDING.
- **Merge trial onto `26d930dd`:** docs conflicts in
  `docs/brain/Branches/Branch - Feature-Length Defects.md`,
  `docs/brain/Branches/Branch - Feature-Length Saturation Only.md`,
  `docs/brain/GRAPH.md`, `docs/brain/Owner/Owner - R5 Measurement and
  Merge.md`, `docs/brain/brain.graph.json`,
  `docs/p1-benchmark/MEASUREMENT_RECEIPTS.md`,
  `docs/p1-benchmark/PUBLIC_BENCHMARK_2026-09-06.md`; code conflicts in
  `scripts/lib/auc.ts`, `scripts/lib/public-benchmark.ts`,
  `scripts/report-unverified-gates.mjs`, `server/lib/validation.ts`,
  `src/components/scriptide/CoverageSummary.tsx`,
  `tests/core/public-benchmark.test.ts`,
  `tests/security/fountain-shape-guard-cue-parity.test.ts`.
- **Superseded?** Not superseded — `git log --oneline
  ad3f6fa770a18e7950e6031023c0fa3e9c0ed2e9..26d930dd --
  server/nvm/analyze/doctor.ts` shows no commit installing
  `SCARCITY_SATURATION_SCENES` or the deletion/length fixes this branch
  makes; `grep -rn SCARCITY_SATURATION_SCENES server/` on `26d930dd` finds
  nothing.
- **Recommendation: REBASE-THEN-LAND.** Seven real code conflicts, mostly
  in the public-benchmark instrumentation (`scripts/lib/auc.ts`,
  `scripts/lib/public-benchmark.ts`, `tests/core/public-benchmark.test.ts`)
  and the voice-eligible-weight bound in `server/lib/validation.ts` (this
  branch and `26d930dd` both re-derived that bound independently since the
  merge-base — see `docs/brain/Owner/Owner - R5 Measurement and Merge.md`'s
  note that this branch "carries the first branch's 1,500,000
  voice-eligible bound, which must not land before main's 675,000
  re-derivation is applied"). These need a human to resolve which
  derivation is current before merging, not a mechanical rebase. Per the
  existing decision tree, this is the branch the owner should measure
  first.

### `scoring/feature-length-saturation-only` — REBASE-THEN-LAND, contingent (fallback only)

- **Merge-base:** `ad3f6fa770a18e7950e6031023c0fa3e9c0ed2e9`. 3 commits
  ahead. Last commit 2026-09-11.
- **Diff shape:** code — `scripts/lib/auc.ts`,
  `server/nvm/analyze/doctor.ts`, `tests/core/script-doctor.test.ts`,
  `tests/fixtures/public-corpus-manifest.json`; docs —
  `docs/brain/brain.graph.json`, `docs/p1-benchmark/MEASUREMENT_RECEIPTS.md`,
  `docs/p1-benchmark/PUBLIC_BENCHMARK_2026-09-06.md`,
  `docs/scoring/FEATURE_LENGTH_DEFECTS_2026-09-07.md`.
  `check-scoring-receipt.mjs` first line: `— 1 scoring-path file(s)
  changed:` — `server/nvm/analyze/doctor.ts` only.
- **Receipt:** `### 2026-09-11 — FEATURE-LENGTH SATURATION ALONE:
  `scarcityPenalty` saturates at 12 scenes, and nothing else changes
  (PENDING OWNER MEASUREMENT — no real-corpus run happened)`. Reads
  PENDING.
- **Merge trial onto `26d930dd`:** docs conflicts in `docs/brain/Branches/
  Branch - Feature-Length Defects.md`, `docs/brain/GRAPH.md`,
  `docs/brain/brain.graph.json`, `docs/p1-benchmark/MEASUREMENT_RECEIPTS.md`,
  `docs/p1-benchmark/PUBLIC_BENCHMARK_2026-09-06.md`; one code conflict,
  `scripts/lib/auc.ts`.
- **Superseded?** **Partially — by a sibling parked branch, not by anything
  landed.** `git diff` of both branches' `server/nvm/analyze/doctor.ts`
  hunks against their shared merge-base shows `scoring/feature-length-
  defects` contains the byte-identical `SCARCITY_SATURATION_SCENES = 12`
  formula this branch introduces (`return SCARCITY_SCALE /
  Math.min(Math.max(sceneCount, 1), SCARCITY_SATURATION_SCENES);` in both),
  plus the deletion-penalty and report-honesty fixes this branch does not
  have. Neither branch is an ancestor of the other (both diverge
  independently from `ad3f6fa7`) and neither has landed on `26d930dd`.
- **Recommendation: contingent fallback, per the owner's own recorded
  decision tree** (`docs/brain/Owner/Owner - R5 Measurement and Merge.md`
  and `docs/brain/Branches/Branch - Feature-Length Saturation Only.md`):
  measure `feature-length-defects` first; measure this branch **only if**
  that one is rejected. Do not land both — they touch the identical
  formula and this one is the strict subset.

### `scoring/adversarial-2026-09-12` / `scoring/forced-cue` / `scoring/renderer-residuals`

Treated as one lane above. Full detail on the tip:

**`scoring/renderer-residuals`** (REBASE-THEN-LAND):

- **Merge-base:** `8aa1f69605134caae6749a6dc63ccb006c5c410c` (shared by all
  three branches in the chain). 72 commits ahead. Last commit 2026-09-13.
- **Diff shape:** code — `tests/routes/fountain-shape-guard-cue-bypass.test.ts`,
  `tests/routes/root-cause-parity.test.ts`,
  `tests/scripts/report-unverified-gates.test.ts`,
  `tests/security/fountain-shape-guard-cue-parity.test.ts`, and the rest of
  a 65-file diff; docs — `docs/scoring/REPORT_SEAM_2026-09-12.md`,
  `docs/scoring/VOICE_PAIR_CAP_2026-09-12.md`,
  `docs/user-validation/sample-coverage-report.html`,
  `tests/fixtures/unicode-cues/README.md`, and 32 more (36 files total).
  `check-scoring-receipt.mjs` first line: `— 8 scoring-path file(s)
  changed:` — `server/nvm/analyze/doctor.ts`,
  `server/nvm/analyze/fountain-analyzer.ts`, and 6 more.
- **Receipt:** three headings — the 2026-09-07 feature-length-defects entry
  (inherited from before this chain branched off it), the 2026-09-12
  adversarial-lane entry, and a 2026-09-13 renderer-residuals entry. All
  read PENDING.
- **Merge trial onto `26d930dd`:** docs conflicts in
  `docs/CLAIMS_REGISTER.md`, `docs/audits/2026-09-12-adversarial/
  scoring-review.md`, `docs/brain/Audits/Audit - 2026-09-12 Adversarial
  Review.md`, `docs/brain/Branches/Branch - Adversarial 2026-09-12.md`,
  `docs/brain/Branches/Branch - Feature-Length Defects.md`,
  `docs/brain/Branches/Branch - Renderer Residuals.md`,
  `docs/brain/GRAPH.md`, `docs/brain/Owner/Owner - R5 Measurement and
  Merge.md`, `docs/brain/brain.graph.json`,
  `docs/user-validation/sample-coverage-report.html`; code conflicts in
  `package.json`, `server/lib/fdx-import.ts`, `server/lib/validation.ts`,
  `src/components/scriptide/CoverageSummary.tsx`, `src/lib/fdx.ts`,
  `tests/security/fountain-shape-guard-cue-parity.test.ts`.
- **Superseded?** Not superseded. `grep -rn FORCED_TRANSITION_MARKER
  server/` on `26d930dd` finds nothing, and the forced-transition `>` /
  `@`-out-of-cue-position handling this branch adds does not exist on the
  session branch.
- **Recommendation: REBASE-THEN-LAND.** `docs/brain/Branches/Branch -
  Renderer Residuals.md` already marks it READY-FOR-OWNER after review;
  `docs/brain/Owner/Owner - R5 Measurement and Merge.md` names it as the
  tip to measure for this lane (`089bec91..HEAD` is its own receipt range).
  The code conflicts (`server/lib/validation.ts`, `server/lib/fdx-import.ts`,
  `src/lib/fdx.ts`, `src/components/scriptide/CoverageSummary.tsx`,
  `package.json`) are small (1–3 conflict markers each) but need a human to
  reconcile against whatever independently touched those files on
  `26d930dd` since `8aa1f696` (20 commits touch
  `server/lib/validation.ts` alone in that range, mostly the voice-weight
  bound and export work — none of it is the same defect, so this is
  ordinary conflict noise from two branches editing the same file, not a
  competing fix).

## Two branches already fully landed

### `lane/node-24` and `lane/healthcheck-ipv4` — SUPERSEDED, already merged

Both are **literal ancestors of `26d930dd`**
(`git merge-base --is-ancestor origin/lane/node-24 26d930dd` and the same
for `lane/healthcheck-ipv4` both exit 0), via merge commits `ff52070b`
("Merge pull request #264 from sergey9519546/lane/node-24") and `28754489`
("Merge pull request #265 from sergey9519546/lane/healthcheck-ipv4"), both
present in `26d930dd`'s history. `git rev-list --count 26d930dd..origin/
lane/node-24` and the `healthcheck-ipv4` equivalent are both 0. Merge trial
is clean (exit 0) because there is nothing left to merge. Both already have
brain notes (`docs/brain/Audits/Audit - 2026-09-18 Node 24.md`,
`docs/brain/Audits/Audit - 2026-09-18 Healthcheck IPv4.md`) and are already
recorded this way in `docs/UNIFIED_STATE_2026-09-02.md`'s 2026-09-19
addendum. Not scoring-path.

**Recommendation: SUPERSEDED, both — safe to delete, no owner action
needed.** `git push origin --delete lane/node-24 lane/healthcheck-ipv4`
loses no content; both PRs are merged and their brain notes stand
independent of the ref.

## `wip/phase-w-ui-checkpoint` — ABANDON

- **Merge-base:** `b67946a4657e24631471b211c561e9822b9e3c79`. 3 commits
  ahead. Last commit **2026-08-21** — the oldest of the seventeen, and the
  only one whose own commit messages call it unfinished ("wip: final W5/W6
  + quarantine allowlist", "W5/W6 in-progress checkpoint",
  "near-complete (weekly limit interrupt)").
- **Diff shape:** all code — `scripts/verify-p2-p3-surfaces.mjs`,
  `src/components/ScriptIDE.tsx`, `src/components/SettingsPanel.tsx`,
  `src/components/StartScreen.tsx`,
  `src/components/scriptide/CoverageSummary.tsx`,
  `src/components/scriptide/ScriptDoctorPanel.tsx`,
  `src/components/scriptide/ShipPanel.tsx`,
  `src/components/scriptide/Toolbar.tsx`,
  `src/lib/coverage-staleness.ts`, `src/lib/scriptide-draft-store.ts`,
  `tests/core/coverage-handoff.test.ts`,
  `tests/core/scriptide-draft-store.test.ts` (12 files); one docs file,
  `docs/audits/2026-08-21.../SURFACE_REVALIDATION_2026-08-04.md`, added
  outright (no conflict potential — new path).
  `check-scoring-receipt.mjs`: "no scoring-path files changed. OK."
- **Receipt:** none.
- **Merge trial onto `26d930dd`:** 10 conflicting files, all code, all in
  the same UI surface: `scripts/verify-p2-p3-surfaces.mjs` (9 conflict
  markers), `src/components/ScriptIDE.tsx` (10), `SettingsPanel.tsx` (1),
  `CoverageSummary.tsx` (4), `ScriptDoctorPanel.tsx` (7), `ShipPanel.tsx`
  (6, add/add — main independently created a file of the same name),
  `Toolbar.tsx` (1), `src/lib/scriptide-draft-store.ts` (2),
  `tests/core/coverage-handoff.test.ts` (3, add/add),
  `tests/core/scriptide-draft-store.test.ts` (5). 48 conflict markers
  total.
- **Superseded?** **Yes, per `docs/UNIFIED_STATE_2026-09-02.md`'s own
  2026-09-19 addendum**, which already corrected an earlier "fully absorbed"
  claim to the more precise one repeated here: the branch introduces zero
  files `main` lacks, and every deliverable its commit messages claim
  (the quarantine allowlist, `ShipPanel.tsx`, the StartScreen ribbon, the
  SettingsPanel fix) is present on `main`/`26d930dd` in a form the branch's
  own commits predate. This audit adds the scale of what changed since:
  `git log --oneline b67946a4657e24631471b211c561e9822b9e3c79..26d930dd --
  src/components/ScriptIDE.tsx src/lib/scriptide-draft-store.ts
  src/components/scriptide/CoverageSummary.tsx` returns 50 commits,
  including a documented React #185 render-loop fix
  (`bff55e39 fix(editor,panel): run at feature length — kill the React
  #185 render loop, give every located finding a jump, reconcile
  root-cause counts`) that touches exactly the files this branch's merge
  would reintroduce an older version of.
- **Recommendation: ABANDON.** Content-superseded per the existing
  addendum; not merely stale but actively unsafe to fast-forward-merge
  (the addendum's own correction says so), and re-deriving whether any
  fragment of the 12 conflicting files still carries unique value would
  cost more review time than the risk of leaving it parked. Delete the ref
  once the owner has read the 2026-09-19 addendum's correction (no new
  confirmation needed beyond that — it already says this).

## What this audit adds beyond what was already known

`docs/UNIFIED_STATE_2026-09-02.md`'s 2026-09-19 addendum already covered the
calibrate stack, the adversarial/forced-cue/renderer-residuals chain, and
the two already-merged lane branches, all consistent with this audit's
findings (the calibrate supersession, the chain order, and the "merged, not
ahead" status are all corroborated here at the patch/ancestor level rather
than repeated on faith). What is new here: the two `claude/*-pending-
measurement` vs `scoring/*` duplicate pairs verified at the patch-id level;
full per-branch conflict classification (docs vs. code) for
`scoring/advice-rule-fixes`, `scoring/r5-verbosity-bias`,
`scoring/stacked-r5-plus-advice`, `scoring/feature-length-defects`, and
`scoring/feature-length-saturation-only`, none of which the earlier
addendum's nine-branch table covered; the finding that
`scoring/feature-length-saturation-only`'s code is a byte-identical subset
of `scoring/feature-length-defects`'s; and a full ABANDON case for
`wip/phase-w-ui-checkpoint` with the 50-commit churn count behind the
existing "content superseded" finding.

## Reproduction

```
cd <worktree at 26d930dd>
git branch -r | grep -vE 'HEAD|claude/fable|/main$'          # the 17
git merge-base origin/main origin/<branch>                    # per branch
git merge-base 26d930dd origin/<branch>
git rev-list --count 26d930dd..origin/<branch>
git diff --stat <merge-base>..origin/<branch> -- server/ src/ scripts/ tests/
git diff --stat <merge-base>..origin/<branch> -- docs/ '*.md'
node scripts/check-scoring-receipt.mjs <merge-base>..origin/<branch>
git worktree add <scratch>/trial --detach 26d930dd
cd <scratch>/trial && git merge --no-commit --no-ff origin/<branch>
git diff --name-only --diff-filter=U   # conflicting files
git merge --abort
cd - && git worktree remove --force <scratch>/trial
```
