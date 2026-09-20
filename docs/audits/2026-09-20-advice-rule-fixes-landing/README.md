# 2026-09-20 — landing `scoring/advice-rule-fixes`

**Lane:** `lane/land-advice-rule-fixes`, worktree from `bf4f3bff`.
**Merged:** `origin/scoring/advice-rule-fixes` @ `a1cf7677` (5 commits, 26
code/test files) via `git merge --no-ff`, merge commit `089cc1b3`.
**Runbook followed:** `docs/audits/2026-09-20-parked-branches/README.md`
§ `scoring/advice-rule-fixes` — LAND.
**Receipt:** the 2026-09-20 PUBLIC-CORPUS entry at the end of
`docs/p1-benchmark/MEASUREMENT_RECEIPTS.md`.

**The one thing to read before anything else: four of the six
public-benchmark floors FELL at this landing, including the PRIMARY
shuffle-drop matched-pair floor (0.5113 → 0.4175). They were re-locked, with
the fall named in three places rather than absorbed. See §4.** No
real-corpus figure is claimed anywhere in this record: the private corpus is
not present in this environment and `REAL_SCRIPT_CORPUS_DIR` was never set.

---

## 1. What the branch is

Six detector defects from the 2026-09-04 advice-quality audit
(`docs/scoring/ADVICE_RULE_FIXES_2026-09-04.md`), fixed across
`server/nvm/analyze/fountain-analyzer.ts`, `reversal-detection.ts`, ten
`server/nvm/revision/passes/*`, `server/nvm/screenplay/structure.ts`, a new
`server/nvm/screenplay/suspense-dip.ts`, and `src/lib/fountain.ts` (+114:
title-page parsing, and a `maskNonScreenplayLines` helper that blanks the
title page and boneyard bodies for the ten raw-line-scanning passes). New
tests: `tests/core/advice-rule-fixes.test.ts` (26) and the matched fixture
pair `tests/fixtures/advice-audit/{bad,excellent}.fountain`.

The branch arrived with its receipt entry marked as awaiting the owner's
real-corpus measurement, which `scripts/check-scoring-receipt.mjs` refuses by
design. That entry was rewritten IN PLACE into a measured PUBLIC-CORPUS
receipt (the gate has supported in-place rewrites since 2026-09-19), with
everything the 2026-09-04 author wrote kept verbatim beneath an
"As filed on 2026-09-04" sub-heading and two redactions named there.

## 2. Conflicts and how each was resolved

| file | conflict | resolution |
|---|---|---|
| `docs/brain/GRAPH.md` | content | took OURS (`git checkout --ours`). The graph is generated; `npm run brain` was out of scope for this lane and the orchestrator regenerates it. |
| `docs/p1-benchmark/MEASUREMENT_RECEIPTS.md` | content | kept BOTH sides in order: our six entries (2026-09-06 → 2026-09-20) first, then the branch's entry at the end of the file. No entry from either side was dropped. |
| `docs/brain/brain.graph.json`, `docs/brain/Measurements Index.md`, `src/lib/fountain.ts`, `tests/core/pure-core-boundary.test.ts` | auto-merged, no markers | verified by hand — see below. |

**Zero code conflicts**, as the parked-branches audit predicted.
`docs/CLAIMS_REGISTER.md` did not conflict.

**`src/lib/fountain.ts` was read top to bottom after the merge.** The diff
against `bf4f3bff` is **+114 / −0**: pure insertion. The 2026-09-20
scene-grammar lane's shared grammar block survives intact at the end of the
file — `SCENE_HEADING_PREFIX_RE` (442), `FORCED_SCENE_HEADING_RE` (452),
`isSceneHeadingLine` (462), and the document-level `sceneHeadingLineIndices`
(340) — and `parseFountain` still classifies headings through
`isSceneHeadingLine`, with the branch's `title_page` branch inserted ahead of
it. The two changes compose rather than collide: a title-page key line
(`Title:`, `Author:`) can never be a scene heading, and excluding the title
page from `sceneHeadingLineIndices` is the behaviour both lanes want.
`tests/core/scene-grammar.test.ts` passes 13/13 after the snapshot re-lock in
§6. `FORCED_SCENE_HEADING_RE` and its comment block were NOT touched by this
lane (a concurrent lane owns that region).

## 3. Output identity — 45/45 fixtures compared, 38 moved

`git archive bf4f3bff` baseline, `GIT_SHA=dev` on both sides,
`node scripts/check-doctor-output-identity.mjs --compare` →
`OUTPUT IDENTITY: FAIL — 45 fixture(s) differ.` That is the correct result for
a change to six detectors; the harness proves purity, and this change is not
pure by construction.

* **38 of 45** reports differ somewhere; **29 of 45** move `health`;
  **0 of 45** move `sceneCount`.
* **Direction: 18 up, 11 down.**
* **3 verdict changes**, all PASS → CONSIDER, all calibration samples.

### 3.1 Every fixture whose health moved

| fixture | health before → after | Δ | verdict | totalIssues |
|---|---|---|---|---|
| `calibration/Adrift` | 31.8 → 44.7 | +12.9 | PASS | 126 → 122 |
| `calibration/Merge` | 20.9 → 31.5 | +10.6 | PASS | 136 → 134 |
| `calibration/Encore` | 44.7 → 53.3 | +8.6 | PASS | 111 → 108 |
| `calibration/The Dead Drop` | 39.8 → 48.1 | +8.3 | PASS | 119 → 110 |
| `calibration/Whiteout` | 40.6 → 48.8 | +8.2 | PASS | 93 → 93 |
| `calibration/Reasonable Doubt` | 53.2 → 60.6 | +7.4 | **PASS → CONSIDER** | 111 → 108 |
| `calibration/The Visit` | 55.0 → 61.2 | +6.2 | **PASS → CONSIDER** | 108 → 106 |
| `calibration/Sunlight Clause` | 61.4 → 66.9 | +5.5 | CONSIDER | 125 → 123 |
| `calibration/Second Wind` | 58.2 → 63.1 | +4.9 | **PASS → CONSIDER** | 106 → 94 |
| `calibration/Thanksgiving Maybe` | 66.7 → 70.8 | +4.1 | CONSIDER | 84 → 77 |
| `calibration/The Long Game` | 68.8 → 71.8 | +3.0 | CONSIDER | 90 → 87 |
| `calibration/Nine Minutes` | 64.0 → 66.7 | +2.7 | CONSIDER | 115 → 114 |
| `calibration/The Grift` | 17.6 → 12.4 | −5.2 | PASS | 160 → 162 |
| `screenplay/room-12` | 33.5 → **0.0** | **−33.5** | PASS | 197 → 197 |
| `screenplay/transfer-window` | 31.9 → 15.4 | −16.5 | PASS | 218 → 209 |
| `screenplay/quiet-season` | 73.2 → 69.3 | −3.9 | CONSIDER | 138 → 139 |
| `screenplay/the-key-under-the-mat` | 74.2 → 71.3 | −2.9 | CONSIDER | 189 → 191 |
| `screenplay/the-detour` | 74.0 → 71.7 | −2.3 | CONSIDER | 155 → 155 |
| `screenplay/same-page` | 75.8 → 73.7 | −2.1 | CONSIDER | 166 → 162 |
| `screenplay/runoff` | 74.6 → 76.6 | +2.0 | CONSIDER | 142 → 140 |
| `screenplay/off-season` | 71.2 → 72.6 | +1.4 | CONSIDER | 171 → 150 |
| `screenplay/undertow` | 77.1 → 78.3 | +1.2 | CONSIDER | 159 → 136 |
| `screenplay/code-blue` | 78.0 → 77.4 | −0.6 | CONSIDER | 194 → 196 |
| `screenplay/the-defense-rests` | 77.0 → 76.6 | −0.4 | CONSIDER | 187 → 191 |
| `screenplay/high-voltage` | 75.4 → 75.6 | +0.2 | CONSIDER | 213 → 210 |
| `screenplay/two-lane` | 79.0 → 79.2 | +0.2 | CONSIDER | 174 → 145 |
| `screenplay/red-line` | 73.7 → 73.5 | −0.2 | CONSIDER | 246 → 235 |
| `screenplay/soft-launch` | 77.3 → 77.1 | −0.2 | CONSIDER | 162 → 164 |
| `screenplay/close-quarters` | 75.6 → 75.7 | +0.1 | CONSIDER | 191 → 187 |

Nine more fixtures changed their issue mix without moving health
(`calibration/Firebreak`, `Lockdown`, `Low Tide`, `Splitting the House`,
`The Corner Booth`, `Yard Signs`, `Zero Day`, `screenplay/chain-of-custody`,
`counter-offer`, `mise`, `p0/sample-script`, and the four synthetic scale
fixtures).

### 3.2 Which detectors moved them

Net finding-count deltas summed over all 45 fixtures, keyed `pass:ruleId`
(the generated catalog's hashes). Top of a 90-row table:

| pass:ruleId | net |
|---|---|
| `conflict:9bed77ed917160b0` | −28 |
| `structure:f627c1f23dab58a3` | −28 |
| `rhythm:e1bfe4a66d602fe7` | −26 |
| `voice:6128177888036937` | +24 |
| `rhythm:e7066cedcc3670ff` | +23 |
| `intention:758e4d541a644eeb` | +20 |
| `rhythm:395744693a235e74` | +18 |
| `dialogue:36ed3ae79130ad2b` | +17 |
| `rhythm:df8c1adb8ffd1d82` | −15 |
| `conflict:cf6c8ae344b18b7d` | +12 |

Movement is confined to the passes the branch edits — `conflict`,
`structure`, `rhythm`, `voice`, `dialogue`, `intention`, `causality`,
`originality`, `theme`, `character-arc` — plus the `fountain-analyzer`
word-count change, which reaches every density term.

### 3.3 `room-12` falling to health 0 is not a detector regression

Its `totalIssues` is **197 before and after**, with an identical severity
split (1 critical / 48 major / 148 minor). Its dimension percentiles fall
75 → 35, 25 → 10, 35 → 30, 0 → 0, 70 → 35 and health clamps at 0. The
mechanism is the calibration reference distribution, which
`server/nvm/analyze/calibration/reference.ts` recomputes from `corpus.ts` at
runtime by design ("lazy compute + cache", its header): the same six fixes
raise the reference corpus's own scores (`Adrift` +12.9, `Merge` +10.6,
`Encore` +8.6 …), so a script whose own findings did not improve loses
percentile. `transfer-window` 31.9 → 15.4 is the same effect, one clamp
short. Both were already the corpus's two lowest scripts and both are graded
`troubled` before and after.

## 4. Public benchmark — before, after, and the floors that fell

`npm run benchmark:public`, N=32, 2000-resample bootstrap at seed 42, run on a
`git archive bf4f3bff` checkout and on this tree.

| channel | statistic | before | after | floor before | floor after | |
|---|---|---|---|---|---|---|
| SHUFFLE_DROP | matched-pair (PRIMARY) | 0.5313 | **0.4375** | 0.5113 | **0.4175** | **FELL** |
| SHUFFLE_DROP | all-pairs | 0.5586 | **0.5298** | 0.5386 | **0.5098** | **FELL** |
| CLIMAX_RELOCATE | matched-pair (PRIMARY) | 0.4063 | **0.4375** | 0.3863 | **0.4175** | rose |
| CLIMAX_RELOCATE | all-pairs | 0.4443 | **0.4897** | 0.4243 | **0.4697** | rose |
| DIALOGUE_FLATTEN (control) | matched-pair | 1.0000 | **0.9844** | 0.98 | **0.9644** | **FELL** |
| DIALOGUE_FLATTEN (control) | all-pairs | 0.9473 | **0.9458** | 0.9273 | **0.9258** | **FELL** |

| other statistics | before | after |
|---|---|---|
| SHUFFLE_DROP ordered / inverted / tied | 17 / 15 / 0 | **14 / 18 / 0** |
| SHUFFLE_DROP 95% CI, matched-pair | [0.3750, 0.6875] | [0.2813, 0.6250] |
| SHUFFLE_DROP mean health gap | −1.93 | **−3.60** |
| CLIMAX_RELOCATE ordered / inverted / tied | 8 / 14 / 10 | **8 / 12 / 12** |
| CLIMAX_RELOCATE 95% CI, matched-pair | [0.2656, 0.5469] | [0.3125, 0.5781] |
| DIALOGUE_FLATTEN ordered / inverted / tied | 32 / 0 / 0 | **31 / 0 / 1** |
| DIALOGUE_FLATTEN mean health gap | +29.30 | **+34.65** |
| scripts pinned at health 76.0 | 10 | 10 |

**The five `SHUFFLE_DROP` pairs that changed class:**

| script | gap before | gap after | |
|---|---|---|---|
| `dead-frequency` | +1.5 | −2.2 | ordered → inverted |
| `quiet-season` | +2.5 | −0.7 | ordered → inverted |
| `the-detour` | +1.5 | −0.6 | ordered → inverted |
| `the-key-under-the-mat` | +1.7 | −0.6 | ordered → inverted |
| `signal-drift-bad` (blind fixture) | −3.5 | +1.0 | inverted → ordered |

Three of the four losses are sub-point gaps either side of zero. Every one of
the four measurement intervals still contains 0.5, and each tree's point
estimate lies inside the other tree's interval — **nothing here resolves as a
real change in discrimination on this corpus**. That is not a reason to skip
recording it; it is the reason the repository asserts a ratchet rather than a
point estimate, and the ratchet on the primary channel is now lower.

`npm run benchmark:public -- --lock` was run once, its printed before → after
table read, and the resulting `scripts/lib/auc.ts` diff read line by line: the
diff is exactly the six `export const …_FLOOR = <number>;` lines and nothing
else. `tests/fixtures/public-benchmark-split.json` re-locked to its previous
bytes (pre-registered split unchanged). `AUC24_FLOOR` (0.622) and
`AUC24_DEGRADATION_ID` (`shuffle-drop/v3`) were **not** touched, and
`tests/fixtures/real-corpus-manifest.json` was **not** re-locked — only the
owner can do that.

Prose updated in the same commit, because `--lock` never rewrites prose:
`scripts/lib/auc.ts`'s floors narrative, §12 of
`docs/p1-benchmark/PUBLIC_BENCHMARK_2026-09-06.md`, and
`scripts/report-unverified-gates.mjs`'s `proves:`/`but not:` text (which still
quoted "32 of 32 scripts, zero ties" and the 2026-09-12 figures).

### 4.1 The control's tie, and why the assertion was narrowed rather than loosened

`DIALOGUE_FLATTEN` lost its 32-of-32: `room-12.fountain` scores health 0.0
intact after this change, and its dialogue-flattened copy was already 0.0.
Health is clamped at 0, so the two sides cannot be separated by a scale with
no room left underneath them. Zero inversions remain and the control's mean
gap **rose** from +29.30 to +34.65 — the instrument reads more strongly, not
less, which is what CLAUDE.md's "suspect the harness before the score" rule
asks to be checked.

`tests/core/public-benchmark.test.ts`'s `assert.equal(dialogueFlatten.tied, 0)`
was replaced by two assertions, not by `tied <= 1`:

1. every tied pair must be clamped at health 0 on **both** sides (any other
   tie fails, by file name and health value);
2. the tie COUNT must equal the number of both-sides-at-zero pairs, so a tie
   the floor does not explain cannot hide behind one it does.

That is strictly stronger than `tied <= 1` and weaker than `tied === 0` only
where the scale itself is exhausted.

## 5. Blind pairs — the ratchet held

`node --experimental-strip-types --test tests/core/blind-pairs-discrimination.test.ts`

* before (`bf4f3bff`): `ordered 1 of 6, mean gap -0.0167` — exit 0
* after: `ordered 1 of 6, mean gap 0.0333` — exit 0

The registered known-failing result is unchanged; the mean gap moved the
right way. Nothing in that test was relaxed.

## 6. Two committed fixtures re-locked

| fixture | why | what moved |
|---|---|---|
| `tests/fixtures/public-corpus-manifest.json` | `--lock`, §4 | 32 rows of intact sceneCount/words/health/verdict; sha256 `39b70413…` |
| `tests/fixtures/scene-grammar/plain-int-ext.report.json` | the 2026-09-20 scene-grammar lane locked a full `runScriptDoctor` snapshot against a `git archive 26d930dd` tree; this branch legitimately moves that report | `totalIssues` 233 → 206, severity {2,51,180} → {1,47,158}, health 0 → 22.5, `healthPercentile` 0 → 5, `sceneCount` unchanged at 16 |

The scene-grammar snapshot was regenerated exactly as the test consumes it
(`runScriptDoctor` with `GIT_SHA=dev`, `analyzedAt` and
`provenance.engineCommit` stripped, `canonical()` two-space JSON plus a
trailing newline), and its test comment now records that it is a **regression
lock on the current tree, not a pre-grammar-change identity proof** — the
original `26d930dd` bytes remain the evidence for the 2026-09-20 scene-grammar
receipt and are readable at this file's parent commit.

## 7. `docs/CLAIMS_REGISTER.md` and the five surface docs

Rewriting `scripts/lib/auc.ts`'s narrative invalidated the anchors of register
rows 121–125 (all five pointed at the now-reworded 0.5313 / 0.4063 / 0.9473
lines), and — more importantly — made the CLAIM TEXT in `README.md`,
`NORTH_STAR.md`, `ROADMAP.md`, `ARCHITECTURE.md` and
`docs/PATH_TO_EXCELLENCE.md` stale: all five lead with 0.5313 / 0.4063 /
1.0000 as the current validity read.

Resolved by addition, not substitution. Each of the five keeps its
`main @ 26d930dd` paragraph verbatim — it is correct about that commit — and
gains one paragraph naming the 2026-09-20 re-measurement (0.4375 / 0.4375 /
0.9844, four floors fell, pointer to §12). Rows 121–125 gain the same sentence
and their `scripts/lib/auc.ts` pointers are re-anchored to lines 197/198/200.
Two unrelated pointers that had drifted (`README.md:74` → `:82`,
`ROADMAP.md:369` → `:377`) were corrected in the same pass.
`tests/core/honesty-audit-claims.test.ts` 15/15.

## 8. Gate table

| gate | exit |
|---|---|
| `npm run lint` | 0 |
| `npm run check-no-console` | 0 |
| `npm run check-server-reachability` | 0 |
| `npm run check-docs` | 0 |
| `npm run gates` | 0 |
| `npm run build` | 0 |
| `node scripts/check-scoring-receipt.mjs bf4f3bff..HEAD` | 0 |
| `tests/core/advice-rule-fixes.test.ts` | 0 (26) |
| `tests/core/agency-signal.test.ts` | 0 (52) |
| `tests/core/reversal-detection.test.ts` | 0 (39) |
| `tests/passes/conflict.test.ts` | 0 (465) |
| `tests/passes/dialogue.test.ts` | 0 (473) |
| `tests/passes/structure.test.ts` | 0 (490) |
| `tests/core/core-02.test.ts` | 0 (427) |
| `tests/core/core-03.test.ts` | 0 (307) |
| `tests/core/pure-core-boundary.test.ts` | 0 (6) |
| `tests/core/calibration.test.ts` | 0 (21) |
| `tests/core/scene-grammar.test.ts` | 0 (13) |
| `tests/core/public-benchmark.test.ts` | 0 (28) |
| `tests/core/auc.test.ts` | 0 (31) |
| `tests/core/blind-pairs-discrimination.test.ts` | 0 (4) |
| `tests/core/honesty-audit-claims.test.ts` | 0 (15) |
| `tests/core/fixture-provenance-comment-guard.test.ts` | 0 (145) |
| `tests/security/fountain-shape-guard-cue-parity.test.ts` | 0 (674) |
| `tests/core/brain-coverage.test.ts` | sub-test (e) only — the graph is stale until `npm run brain` |

## 9. What the owner must still run

1. `REAL_SCRIPT_CORPUS_DIR=<corpus> npm run measure-real` against
   `AUC24_FLOOR = 0.622`. **This range moves health on 29 of 45 in-repo
   fixtures; treat any fall in AUC-24 as a real finding about these six
   fixes, and do not answer it by moving `AUC24_FLOOR`.** (That instruction
   is the 2026-09-04 author's, kept in the receipt.)
2. Re-lock `tests/fixtures/real-corpus-manifest.json` — produced-script rows
   will have moved.
3. `npm run lock-auc24` on the `shuffle-drop/v3` recipe, which writes
   `tests/fixtures/auc24-table.json` for the first time. Its number is not
   comparable to 0.731.
4. `npm run brain` + `npm run check-brain` (out of scope for this lane).
5. The full `npm test`, once, on the rebased tree (`docs/LANE_STANDARD.md` §4
   puts this on the orchestrator).
6. **Decide whether the shuffle-drop fall is acceptable.** The lane re-locked
   it because the brief authorised re-locking with the fall named, and because
   every interval contains every point estimate involved. A reviewer who
   disagrees should say so before this reaches `main`: the pre-landing floors
   are `0.5113` / `0.5386` and reverting to them means reverting the branch.

## 10. Not done

* `npm run brain` / `npm run check-brain` — excluded by the brief; the graph
  is stale and `tests/core/brain-coverage.test.ts` sub-test (e) reports it.
* The full `npm test` — excluded by the brief.
* No push. `lane/land-advice-rule-fixes` exists only in this worktree.
* `npm run test:metamorphic` and the browser battery were not re-run here;
  the branch's own 2026-09-06 addendum records its metamorphic result against
  a different baseline.
* The `RELIEF_WORDS` word-sense defect the branch's own entry names as a cost
  of the fix was not audited — it is separate scoring work with its own
  measurement.
