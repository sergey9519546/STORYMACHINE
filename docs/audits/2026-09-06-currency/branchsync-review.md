# Independent review — branch sync lane (docs `d811580c`, tag `audit/2026-09-06/branchsync-round1`)

## Round 1

**Reviewer:** independent (did not build this change).
**Objects reviewed:** `scoring/r5-verbosity-bias` @ `cfb7233c`, `scoring/advice-rule-fixes` @
`c1873e3c`, `scoring/stacked-r5-plus-advice` @ `1bae835d` (all three also on `origin`), and the
docs commit `d811580c` on `docs/branch-sync-2026-09-06` in worktree
`/home/user/STORYMACHINE/.claude/worktrees/docs-branch-sync`.
**Read-only:** I made no edit to `/home/user/STORYMACHINE` or to any worktree, created no branch,
pushed nothing, and added no `git worktree`. Every probe ran in `git archive` extractions under
`<scratch>/branchsync-review/` (`main`, `oldmain` @ `e40f4cf5`, `r5`, `oldr5` @ `0f625c27`, `adv`,
`stack`), each with `node_modules` symlinked from the working checkout. `git -C
.../docs-branch-sync status --porcelain` was empty before and after the two runs I did inside it.
**Probes/logs:** `<scratch>/branchsync-review/` — `rev-blind.mjs` (my own reimplementation of the
blind-pairs computation, written from `tests/core/blind-pairs-discrimination.test.ts`, not from the
lane's script), `rev-blind-{main,r5,adv,stack}.json`, `id-{main,oldmain,r5,oldr5,adv,stack}/`
(45 report snapshots each), `lint-stack.log`, `meta-stack.log`, `adv-negctl.log`,
`brain-negctl.log`, `lock-auc24-noenv.log`, `t-*.log`.
**Budget:** no full `npm test` on any branch (the lane ran three; I ran 11 test files on the stack),
no browser battery, no `measure-real` (no corpus, correctly).

**Verdict: REVISE** — four items, all doc text, none requiring a re-measurement or a code change.
Two are wrong explanations of scoring statistics that would enter the permanent record
(§4.3, §4.4), and two are owner-facing instructions that fail when followed literally (§4.1,
§4.2 — both reproduced). Everything the brief asked for is done, and **every number in the report
reproduced exactly** on my own harness: identity RMS to two decimals on all three trees, the
blind-pairs table cell for cell, both negative controls, and the gate exit codes. §1–§3 record
that in full.

---

## 1. Brief-vs-diff

### 1.1 Per-branch

| # | Brief item | Status | Evidence |
|---|---|---|---|
| 1 | Rebase each branch onto `main` `2bfcbf9d`, keep both intents, no squash | **DONE** | `git log --graph main..1bae835d` shows the six R5 and three advice commits unsquashed under one `--no-ff` merge (`996cc676`) plus one follow-up. Main-side work preserved and checked, not assumed: `git diff --stat main...cfb7233c -- server/nvm/analyze/doctor.ts` is **176 insertions / 58 deletions**, byte-identical in shape to `git diff --stat e40f4cf5..0f625c27` on that file — the branch's delta and nothing else. `structuralSignals` 1, `provenance` 4, `structuralReliabilityNote` 3, `VERDICT_DESCRIPTORS` 2 on `1bae835d`, each equal to `main`'s count. |
| 2 | Per-branch gates: lint, touched scoring tests, `calibration*`, identity harness, receipt gate, one full `npm test` | **DONE** | Re-run by me on the stack: `npm run lint` **0**; `verbosity-bias` 4/4, `calibration` 21/21, `feature-scale-discrimination` 6/6, `script-doctor` 86/86, `blind-pairs-discrimination` 3/3, `agency-signal` 52/52, `reversal-detection` 39/39, `rebuild-experiment` 40/40, `pure-core-boundary` 6/6, `passes/structure` 490/490, `brain-coverage` 7/7 — all exit 0, all at the counts the report claims. `npm run test:metamorphic` **0**, 8/8 hard, 0 known-failing, `empty_verbosity` **−4.5**. Identity + receipt gate: §2.2, §3.3. |
| 3 | Build the stacked branch, resolve conflicts keeping both intents, write a PENDING receipt saying both branches' numbers are unmeasured | **DONE** | `1bae835d`. No code file conflicted (§3.2). Stack entry `MEASUREMENT_RECEIPTS.md:695-800` (on `1bae835d`) opens "Neither contributing branch's numbers are measured either; all three are PENDING." |
| 4 | Blind-pairs scorer on all three, table in the report, explain anything that moved from the 2026-09-04 doc | **DONE** | Reproduced independently, §2.1. |
| 5 | Push three named branches; never push `main`; no tags | **DONE** | `git ls-remote origin` → `scoring/r5-verbosity-bias cfb7233c`, `scoring/advice-rule-fixes c1873e3c`, `scoring/stacked-r5-plus-advice 1bae835d`; `origin/main` still `2bfcbf9d`; no `scoring/*` tags on the remote. |
| 6 | Docs edits in a new worktree off `main`, `npm run brain`, `brain-coverage` | **DONE** | `d811580c`, 7 files +272/−55. Re-run by me in that worktree: `brain-coverage` **0** (7/7), `check-brain` **0** (90 notes, 264 links, fresh), `check-docs` **0**. Not pushed. |
| — | Commit trailers on every commit | **DONE** | All 7 commits (`e307d610`…`1bae835d`, `d811580c`) carry both the `Co-Authored-By` and `Claude-Session` lines. |
| — | No fabricated measurement | **DONE** | §3.1. |

### 1.2 The docs commit, file:line

| file | what changed | check |
|---|---|---|
| `docs/UNIFIED_STATE_2026-09-02.md:30-69` | dated `#### Addendum — 2026-09-06` inserted at the head of §1's branch discussion; first line "Nothing above is retracted"; the `main @ 939f7829` table and the `wip/phase-w-ui-checkpoint` analysis below it are untouched | correct; the supersession table at `:41-45` names both old refs and which new branch supersedes each, "kept, not deleted" |
| `docs/brain/Branches/Branch - R5 Verbosity Bias.md:9-12, 34-59` | new tip/base, old ref recorded as superseded, conflict section rewritten, re-run numbers | numbers correct; **`:51-52` is REVISE #3** |
| `docs/brain/Branches/Branch - Advice Rule Fixes.md:9-13, 27-54` | same treatment plus "what it does once stacked" | numbers correct; **`:36-38` is REVISE #4** |
| `docs/brain/Branches/Branch - Stacked R5 plus Advice.md` (new, 63 lines) | frontmatter `type: branch` / `status: pending-measurement`; wikilinks to both branch notes, the 2026-09-04 measurement, `[[Gate - Receipt Gate]]`, `[[Owner - R5 Measurement and Merge]]` | resolves — `check-brain` 0, `brain-coverage` (f) 0 |
| `docs/brain/Owner/Owner - R5 Measurement and Merge.md:24-35` | the command block and the supersession instruction | **REVISE #1 (`:27`) and #2 (`:31-35`)** |
| `docs/brain/brain.graph.json`, `docs/brain/GRAPH.md` | regenerated | fresh |

---

## 2. Reproductions

### 2.1 Blind matched pairs — reproduced with my own scorer, all four trees

I did not run the lane's `score-blind-pairs.mjs`. I wrote `rev-blind.mjs` from the registered
source (`tests/core/blind-pairs-discrimination.test.ts:59` `PAIRS`, `runScriptDoctor`,
`good.health > bad.health`; `REFERENCE_CORPUS` strong[i] vs troubled[i] by index) and ran it in each
tree against that tree's own `tests/fixtures/blind-pairs`.

| tree | ordered/6 | mean gap | mean top-10 overlap | cal ordered/5 | cal mean gap | pinned at one health |
|---|---|---|---|---|---|---|
| `main @ 2bfcbf9d` | 1/6 | −0.02 | 7.83 | 5/5 | 25.32 | 9 (all 76.0) |
| R5 | 3/6 | +1.50 | 7.83 | 5/5 | 11.14 | 0 |
| advice | 1/6 | +0.03 | 7.17 | 5/5 | 25.36 | 9 (all 76.0) |
| **stacked** | **4/6** | **+2.02** | 7.17 | 5/5 | 12.54 | **0** |

Every cell equals the report's §5 table, and every cell of its per-pair table equals mine
(`night-shift` 62.9/51.2, `low-tide` 64.4/58.8, `the-deposit` 39.6/55.1, `the-ledger` 53.9/41.0,
`signal-drift` 49.0/59.6, `fence-line` 57.4/49.4 on the stack). The `main` row reproduces
`BLIND_PAIRS_ON_BRANCHES_2026-09-04.md`'s headline exactly (1/6, −0.02, 5/5, 25.32), which is the
receipt that the harness matches the registered computation.

**The `fence-line` mechanism the report gives is real and visible in my run.** Weighted issues
(good/bad): `main` and R5 both **109.5 / 105.0** — the "bad" member fires fewer issues, so the
pair is inverted at the source; the six detector fixes change it to **102.5 / 116.0**, correcting
the ordering; and only R5's unclamped curve lets a corrected ordering reach health. Neither branch
alone produces the extra pair. The report's refusal to read 4/6 as an improvement is right and
understated: P(X≥4 | n=6, p=½) = 22/64 = 0.34.

### 2.2 Output identity — all three trees, exact

Baseline `git archive main` @ `2bfcbf9d`; `check-doctor-output-identity.mjs --tree/--out` per tree;
statistics computed by me over the 45 report snapshots (excluding `_index.json`/`_timings.json`).

| tree | differ | health moved | mean | **RMS** | max abs | verdicts | sceneCount | smallest move |
|---|---|---|---|---|---|---|---|---|
| R5 | 45/45 | 45/45 | −9.95 | **20.45** | −38.9 `off-season` 71.2→32.3 | 28 | 0 | 0.50 |
| advice | 45/45 | 29/45 | +0.44 | **6.88** | −33.5 `room-12` 33.5→0 | 3 | 0 | — |
| stacked | 45/45 | 45/45 | −7.40 | **19.02** | −34.3 `the-key-under-the-mat` 74.2→39.9 | 27 | 0 | 0.70 |

Identical to the report's §4 table and to the receipt addenda, including the two "smallest move"
figures (0.5 / 0.7) that only the ledger states. `--compare` exits 1 on all three, correctly.

### 2.3 The two negative controls both reproduce

- **Re-anchored test on advice-alone.** I copied `stack:tests/core/advice-rule-fixes.test.ts` into
  my `adv` tree and ran it: **exit 1**, `# fail 1`, `not ok 2 - health separates the pair on the
  stacked tree`, witness `the well-made member must not score at or below its badly-made twin —
  excellent=76 bad=76`. On the stack tree the same file is **exit 0, 26/26**. The guard fails on the
  tree it must fail on.
- **Brain-coverage guard.** With the two Measurement notes removed from my `stack` tree,
  `tests/core/brain-coverage.test.ts` exits **1** with `dated measurement docs with no brain note
  citing them: docs/scoring/ADVICE_RULE_FIXES_2026-09-04.md,
  docs/scoring/VERBOSITY_BIAS_FIX_2026-09-03.md` — the exact failure the report says it fixed.

---

## 3. The three "wrong premise" claims, verified myself

### 3.1 Faithfulness first — no measurement is claimed anywhere

This is the item that matters most and it is clean.

- `git ls-remote` + the three receipt ledgers: every entry heading on all three branches carries
  **PENDING OWNER MEASUREMENT**; every `Measured AUC-24` field reads `NOT MEASURED` or `PENDING`;
  every `Corpus fingerprint` reads "none. No corpus was read."; every Runner attestation says in
  the first person that `measure-real` was not run and `REAL_SCRIPT_CORPUS_DIR` was never set.
- Grepping the docs commit's added lines for `AUC`, `0.7`, `measur`, `corpus`: **no AUC value
  appears anywhere**, and every `measure`/`corpus` sentence is either the owner's pending step, a
  quotation of an existing registered claim, or explicitly scoped — "Re-measured on the new
  baseline (2026-09-06, **in-repo evidence only**)", "What the stack measurably does, **on in-repo
  fixtures only**", "every number above comes from committed fixtures. No real-corpus run has
  happened."
- The stack's entry states both contributors' numbers are unmeasured, as required.
- The one place a corpus-scale number could have been smuggled in — the owner note's "what to
  expect" paragraph — cites only in-repo statistics and then tells the owner **not** to answer a
  fall in AUC-24 by moving the floor in `scripts/lib/auc.ts`. That is the right instruction.

### 3.2 The premises

1. **"only local worktree branches, not on origin" — WRONG, confirmed.** `git ls-remote origin`
   returns `refs/heads/claude/r5-verbosity-bias-pending-measurement` @ **`0f625c27`** and
   `refs/heads/claude/advice-rule-fixes-pending-measurement` @ **`68c64eca`** — exactly the tips
   the brief called worktree-only. `.git/logs/refs/remotes/origin/claude/*` timestamps them at
   `1788426177` and `1788529183`, against `1788709368–72` for the three `scoring/*` pushes: they
   predate this lane by roughly three days and are byte-for-byte untouched. Nothing was removed.
2. **"they conflict on five code files" — WRONG, confirmed.** Pre-rebase file sets:
   `git diff --name-only e40f4cf5..0f625c27` (20 files) ∩
   `git diff --name-only c21fdc5b..68c64eca` (28 files) = **exactly one path,
   `docs/p1-benchmark/MEASUREMENT_RECEIPTS.md`**. R5 touches none of
   `server/nvm/revision/passes/character-arc.ts`, `.../rhythm.ts`, `src/lib/fountain.ts`,
   `tests/core/agency-signal.test.ts`. Post-rebase the intersection is that same ledger plus the
   three generated brain-graph files the lane itself added. The "five-file conflict" was the
   74-commit merge-base gap, as claimed.
3. **`check-scoring-receipt main..HEAD` exits 1 on a PENDING entry by design — RIGHT, confirmed.**
   `scripts/check-scoring-receipt.mjs:486-518` `pendingReason()`, pushed as a problem at `:568-576`
   by `validateEntry`; the header at `:167-190` documents it ("a promise to measure, not a receipt
   of a measurement"). Exit 1 on all three is the correct state, and the lane did not close it by
   editing a heading.

### 3.3 The test re-anchor — judged, and it records a change rather than hiding a regression

The original assertion (`tests/core/advice-rule-fixes.test.ts`, advice branch) was `|good − bad| < 5`
with the message *"if this ever starts failing, the composite score has begun to separate the pair —
**re-measure and update docs/scoring/ADVICE_RULE_FIXES_2026-09-04.md rather than deleting this
test**."* Re-anchoring is therefore the test's own documented instruction, and the doc was updated
(§9 added; §8's contrary "still 76.0 and 76.0" correctly left standing, because it is true of the
advice branch alone).

Three things make this a record and not a cover:

- The direction is the *correct* one. The old pin asserted a **failure** to discriminate; the new
  one asserts `gap > 0` — the well-made member above its twin.
- The tolerance was **tightened, not widened**: `|gap − 13.3| <= 0.1` replaces a `< 5` band, and the
  comment says a fall toward zero means the clamp is back and a large move means the detector set
  shifted, with "re-measure and update §9 rather than widening the tolerance".
- The claim that the underlying findings are identical on both trees is checkable and holds: my
  `adv` and `stack` runs both give 76.0/76.0 → 60.4/47.1 with the same finding counts, and my
  negative control (§2.3) shows the new assertion fails on advice-alone.

I would not send this back. It is a scoring-path test change made without a corpus measurement, but
the branch it lives on is gated PENDING, the change is pinned to a value the branch itself produces
and reproduces on my tree, and the failing-first proof exists.

---

## 4. REVISE — four items

### 4.1 The owner note's `lock-auc24` line fails when run

`docs/brain/Owner/Owner - R5 Measurement and Merge.md:24-28` (in `d811580c`):

```
REAL_SCRIPT_CORPUS_DIR=<corpus> npm run measure-real
npm run lock-auc24
```

An inline assignment applies to one command only, so line 27 runs with the variable unset.
Reproduced in my `stack` tree:

```
$ npm run lock-auc24
[FATAL] REAL_SCRIPT_CORPUS_DIR is not set — refusing to run.  ... Nothing was written.
exit=1
```

The repo's own sibling note gets this right — `docs/brain/Owner/Owner - Lock AUC24 Table.md:22`
reads `REAL_SCRIPT_CORPUS_DIR=<corpus> npm run lock-auc24`. Make line 27 match it. The same bare
form is written into the stack's receipt attestation
(`MEASUREMENT_RECEIPTS.md:1885`, `:1951`, `:2229` on `1bae835d`).

### 4.2 "Supersede the three PENDING entries with one carrying the measured AUC-24" does not clear the gate

`Owner - R5 Measurement and Merge.md:31-35` tells the owner that after appending a measured entry
the branch may merge, and that until then the gate "will keep exiting 1". On the natural reading
of "supersede … with one" — and on the reading `check-scoring-receipt.mjs:573-575` itself
prescribes ("append a superseding measured entry") — **appending does not work.**
`checkReceiptForRange` (`:650-673`) extracts *every* entry the range adds and validates each one;
`ok` is `problems.length === 0`. A PENDING entry in the same range still fails.

Reproduced against the exported functions:

```
$ node -e "…extractEntries([pending entry, well-formed measured entry]) …"
entries: 2
-- ### 2026-09-03 — LANE R5 — **PENDING OWNER MEASUREMENT**   problems= 5
-- ### 2026-10-01 — measured on the real corpus               problems= 0
```

So the owner follows the note, appends a correct measured entry, re-runs the gate, gets exit 1
again — and the note's next sentence forbids the only apparent remedy ("not a bug to route around
by editing a heading"). The note must say what actually closes it: the PENDING entries in
`main..HEAD` have to *become* the measured entry (rewritten in place, or the range's receipt
history collapsed on merge), not sit beside it. The ambiguity is inherited from main's own error
string, which is out of scope to fix here — but this note is the one artifact whose entire purpose
is to hand the owner an unambiguous sequence, so it is the place to disambiguate. Same sentence in
`docs/UNIFIED_STATE_2026-09-02.md:51-53`.

### 4.3 The 23.5 → 20.45 reconciliation is a statistic confusion, and the stated cause is measurably too small

`docs/brain/Branches/Branch - R5 Verbosity Bias.md:49-53` (committed):

> health RMS **20.45** with 28 verdict changes — the branch's own write-up says 23.5, measured
> against the old `main` at `e40f4cf5`; the difference is `main` moving under the branch
> (principally the 2026-09-04 corpus-integrity correction), not the branch changing.

Same claim in both receipt addenda (`MEASUREMENT_RECEIPTS.md:1915` on `cfb7233c` and `1bae835d`):
"The earlier RMS figure **in the entry above** was 23.5 against `e40f4cf5`."

Two things are wrong, and I measured both rather than arguing them.

- **The entry above reports no RMS.** The 2026-09-03 R5 entry's identity result is "range −39.9 to
  +24.2, **mean −11.2**", 45/45, 28 verdicts. The number 23.5 comes from a different computation in
  a different document: `docs/scoring/VERBOSITY_BIAS_FIX_2026-09-03.md:230-241`, the constant-sweep
  tie-break, whose stated population is "all 45 output-identity fixtures **plus the calibration
  corpus and the length variants**" — a superset. It is not the identity-harness RMS and never was.
- **The like-for-like old number is 22.16, and `main`'s drift is 0.91.** I extracted `e40f4cf5` and
  `0f625c27` and ran the harness on both:

  | comparison | n | moved | mean | RMS | max |
  |---|---|---|---|---|---|
  | `0f625c27` vs `e40f4cf5` (pre-rebase R5) | 45 | 45 | −11.24 | **22.16** | −39.9 `mise` 72.9→33.0 |
  | `cfb7233c` vs `2bfcbf9d` (post-rebase R5) | 45 | 45 | −9.95 | **20.45** | −38.9 `off-season` |
  | **`e40f4cf5` → `2bfcbf9d` (`main` alone)** | 45 | **16** | +0.42 | **0.91** | +3.1 |

  The pre-rebase run reproduces the entry's own mean (−11.24 vs −11.2), max (−39.9 on `mise`) and
  verdict count (28) exactly, so it is the right comparison. The real like-for-like shift is
  22.16 → 20.45 = **1.71 points**, of which `main`'s own movement (RMS 0.91, confined to 16
  `data/screenplays/*` fixtures — consistent with the provenance-header correction) can account for
  part. "Main moving under the branch" was offered to explain a 3.05-point gap that does not exist.

Fix: say that 23.5 is the sweep's tie-break RMS over a different population, quote the identity
RMS as 22.16 → 20.45, and attribute the 1.71 to `main`'s measured 0.91 drift rather than asserting
it. `CLAUDE.md` has a standing paragraph about exactly this class of error ("these are three
different statistics and have been confused before"); a committed brain note is the worst place to
add a fourth.

### 4.4 "The 16 that do not move are already at `main`'s density clamp" is wrong for 9 of the 16

`docs/brain/Branches/Branch - Advice Rule Fixes.md:36-38` and
`MEASUREMENT_RECEIPTS.md:1921` (advice) / `:2093` (stack): *"the ones still pinned at the saturating
clamp in `main`'s `densityPenalty` — a detector fix cannot move a number that is already at its
ceiling."*

I listed the 16 and evaluated `main`'s `densityPenalty` (`server/nvm/analyze/doctor.ts:426-458`) on
each, before and after:

| group | count | what is actually true |
|---|---|---|
| at the logistic ceiling (penalty 9.99–10.00 both sides) | **7** — `p0/sample-script`, `dead-frequency`, `counter-offer`, and the four `synthetic/*-scenes` | the claim holds |
| **weighted issues unchanged** (`103.5→103.5`, `83.0→83.0`, …) | **7** — `Firebreak`, `Lockdown`, `Low Tide`, `Splitting the House`, `The Corner Booth`, `Yard Signs`, `Zero Day` | no clamp involved: the six fixes change nothing on these fixtures, so there is nothing to clamp. All seven sit at density 1.70–2.10, i.e. on the **power** branch, past the clamp entirely, with penalties of 25.7–47.9 |
| **past the clamp, moved, rounded away** | **2** — `chain-of-custody` (density 1.233→1.228, penalty 12.975→12.903), `mise` (1.300→1.295, 14.182→14.086) | the penalty *did* move; the display rounds it to one decimal |

So the single mechanism claimed covers 7 of 16, and for 7 more the stated mechanism is the opposite
of what is happening (they are above density 1, on the unclamped branch). Say the three groups, or
say only what holds. This one is small in consequence but it is asserted in the same voice as the
numbers that do reproduce, which is what makes it worth fixing.

---

## 5. What a stronger version would have done (in scope, cheap)

- Put the merge order in the **owner note**, not only in the report's §9 "for the orchestrator".
  The note names three branches and says none may merge; it never says that the stack contains both
  singles so merging it subsumes them, nor that whatever lands last needs one `npm run brain` and
  the `Measurements Index.md` section-count arithmetic. An owner working from the note alone would
  land the stack and then hit a `check-brain` failure the lane already knows about.
- Point the manifest re-lock at `tests/fixtures/real-corpus-manifest.README.md`. There is no
  automated re-lock command (I checked `package.json` and `scripts/`), so the owner will hand-edit
  72 rows; the README is the file that says the array order is load-bearing and must never be
  sorted. The note's "in place" encodes the constraint but does not cite the doc that explains it.
- Say in the R5 branch note which SHA the 2026-09-03 identity run actually used. The write-up's
  §5.4 names `c49e5542`; the receipt's *Baseline used* field names `e40f4cf5` (six commits later);
  the branch note repeats `e40f4cf5`. Both resolve, both are ancestors of `main`, and the
  discrepancy is harmless — but it is the kind of thing this repo re-litigates a month later.

## 6. Out of scope, recorded so it is not lost

`scripts/check-scoring-receipt.mjs:573-575`'s own remedy text — "run `npm run measure-real` and
**append** a superseding measured entry" — cannot work for the reason in §4.2, on any branch whose
range already added a PENDING entry. That is a pre-existing defect on `main`, not this lane's, and
fixing it is a scoring-gate change that needs its own lane.

---

## Round 2

**Objects:** `scoring/r5-verbosity-bias` @ `fa256566`, `scoring/advice-rule-fixes` @ `8a6dd037`,
`scoring/stacked-r5-plus-advice` @ `65e76888` (all on `origin`); docs commit amended in place to
`5ed8dd23`, tag `audit/2026-09-06/branchsync-round2`.
**Read-only:** unchanged — no edit to `/home/user/STORYMACHINE` or to the docs worktree
(`git status --porcelain` empty at `5ed8dd23` before and after my two runs there). The conversion
experiment ran in a throwaway `git clone --no-hardlinks` under
`<scratch>/branchsync-review/r2/clone`, on a scratch branch, never pushed.
**Probes:** `<scratch>/branchsync-review/r2/` — `convert.mjs`, `gate-before.log`,
`gate-after.log`, `gate-after2.log`, `gate-rewrap.log`, `mr.log`, `la.log`, `led-*.md`,
`{r5,adv}-from-{single,stack}.txt`.

**Verdict: REVISE** — one item. Items 1, 3 and 4 from round 1 are fixed and independently
re-verified; the three §5 "stronger version" suggestions were all taken. Item 2's *mechanism* is
right and now well-evidenced, but the five-step recipe the fix publishes is **one step short**: I
applied it literally to `65e76888`'s three entries and the gate still exited **1**. One further
edit — the step the note does not mention — took it to **0**.

### Structural checks

| check | result |
|---|---|
| fast-forwards, no history rewritten | `cfb7233c→fa256566`, `c1873e3c→8a6dd037`, `1bae835d→65e76888` all `merge-base --is-ancestor` YES; the stack's two new commits are `--no-ff` merges of the two corrected singles, both ancestors |
| scope of round 2 | `docs/p1-benchmark/MEASUREMENT_RECEIPTS.md` **only**, on all three branches (+59/−13, +41/−4, +115/−22). No code, no test, no fixture touched |
| commit counts in the docs match | `git rev-list --count main..` → 7 / 4 / 16, equal to `UNIFIED_STATE_2026-09-02.md:45-47` and `Owner - R5 Measurement and Merge.md:66-70` |
| shared ledger entries byte-identical across branches | the 2026-09-03 R5 entry on `fa256566` vs `65e76888` and the 2026-09-04 advice entry on `8a6dd037` vs `65e76888` differ **only** by the trailing `---` separator the stack needs because another entry follows. Content identical |
| all three still PENDING | 1 / 1 / 3 `### … PENDING` headings; the gate's own validator reports 1 / 1 / 3 failing entries; `check-scoring-receipt main..HEAD` exits 1 on the stack |
| no measurement claimed | grepping every added line of all four round-2 diffs for an asserted AUC value returns nothing but the *instructions* to replace the field. Faithfulness holds |
| docs worktree gates at `5ed8dd23` | `brain-coverage` **0** (7/7) · `check-brain` **0** (90 notes, 265 links, fresh) · `check-docs` **0** |

### Round-1 items, re-checked against the diff

**#1 — `lock-auc24` env var. FIXED.** `Owner - R5 Measurement and Merge.md:27` now reads
`REAL_SCRIPT_CORPUS_DIR=<corpus> npm run lock-auc24`, and `:30-37` explains why the variable
repeats, quotes the FATAL text, cites `[[Owner - Lock AUC24 Table]]` as writing it the same way,
and points at `tests/fixtures/real-corpus-manifest.README.md` for the hand re-lock (my round-1 §5
suggestion). Five env-var-bearing occurrences across the lane's artifacts: owner note `:27`, ledger
`:1885`, `:1994`, `:2317` on `65e76888`, plus `VERBOSITY_BIAS_FIX_2026-09-03.md:392`. Every
remaining bare `npm run lock-auc24` (`:1887`, `:1996`, `:2319`) sits inside the sentence that says
a bare invocation refuses — correct, not a relapse. The stacked entry's manifest pointer is at
`:2322`.

**#3 — the 22.16 / 20.45 / 0.91 correction. FIXED, and every figure re-verified.**
`Branch - R5 Verbosity Bias.md:49-67` now states that 23.5 is the constant-sweep tie-break over a
superset population, that the R5 entry reports no RMS, and gives the like-for-like pair. My
round-1 measurements confirm each number as written: pre-rebase `0f625c27` vs `e40f4cf5` mean
**−11.24**, max **−39.9** on `mise` 72.9→33.0, **28** verdicts, **RMS 22.16**; post-rebase RMS
**20.45**; `main`'s own drift **RMS 0.91**, **16** fixtures moved, **all** `data/screenplays/*`,
**max +3.1**, and — checked for this round because the note now asserts it — **0 verdict changes,
0 sceneCount changes**. The closing sentence ("the rest is not separately attributed here, because
it was not separately measured") is the right place to stop.

**#4 — the non-mover split. FIXED, exact.** `Branch - Advice Rule Fixes.md:36-48` and the two
ledgers now give 7 / 7 / 2 with the fixture names, and every value matches my round-1 run: ceiling
group penalty 9.99–10.00 (`p0/sample-script`, `dead-frequency`, `counter-offer`, four
`synthetic/*-scenes`); unchanged-weighted-issue group at density 1.70–2.10 with penalties
25.7–47.9 (my run: 25.679–47.858) on the power branch; and `chain-of-custody` 12.975→12.903,
`mise` 14.182→14.086 to three decimals.

**§5 suggestions — all three taken.** Merge order and the `npm run brain` /
`Measurements Index.md` arithmetic are now in the owner note itself (`:72-78`), not only in the
report; the manifest README is cited (`:36-37`); the `c49e5542` vs `e40f4cf5` ambiguity is resolved
by naming the harness runs rather than a SHA.

### Item 2 — the mechanism is right, the published recipe is one step short

**What is right, and I re-verified all of it.**

- The append-vs-convert counts in the docs reproduce exactly, via the gate's own exported
  `extractEntries`/`validateEntry` over each branch's added receipt lines:

  | branch | as shipped | with a well-formed measured entry APPENDED |
  |---|---|---|
  | R5 single | 1 entry / 1 failing | 2 entries / **1 still failing** |
  | advice single | 1 entry / 1 failing | 2 entries / **1 still failing** |
  | stack | 3 entries / 3 failing | 4 entries / **3 still failing** |

- **The cross-line-wrap trap is real**, and I reproduced it rather than taking it on trust. An
  otherwise perfect measured entry whose attestation reads `…the earlier flag sweep was` /
  `not run for this range.` — the phrase split by the wrap — is **refused**: `validateEntry`
  returns 1 problem, `the entry states "was\n  not run"`. A single-line grep for all four phrases
  over the same lines returns **0 hits**. So the decision to spell the phrases out in the owner
  note (which the gate never reads) and reference them by location in the ledgers (which it does)
  is correct, and the ledger's own account of how it was discovered ("a draft of this bullet quoted
  them and held the converted stacked range at 1 problem instead of 0") is consistent with what I
  see.
- **Re-wrapping does not create a false positive.** I converted all three entries, re-wrapped the
  stacked one at 72 columns (96 → 102 lines, every bullet re-flowed), committed, and re-ran the
  real CLI: `node scripts/check-scoring-receipt.mjs main..HEAD` → **exit 0**.
- The owner note's sequence dry-runs cleanly up to the corpus step: `git checkout
  scoring/stacked-r5-plus-advice` ok; `npm run measure-real` with no corpus prints `[SKIP]
  REAL_SCRIPT_CORPUS_DIR not set` and exits 0; `npm run lock-auc24` prints the FATAL the note
  quotes and exits 1.

**REVISE #1 — applying the five steps literally leaves the gate at exit 1, on the one branch the
owner is told to measure.**

I extracted `65e76888` into a clone and applied
`docs/brain/Owner/Owner - R5 Measurement and Merge.md:41-56` mechanically to all three PENDING
entries — heading (1), `Measured AUC-24` (2), `Corpus fingerprint` (3), `Runner attestation` (4),
and a `\s+`-aware scrub of the four `PENDING_PHRASES` from every entry body (5) — then committed
and ran the gate:

```
gate BEFORE            exit=1   (3 entries, 3 failing — as documented)
gate AFTER the 5 steps exit=1
  ### 2026-09-06 — STACKED TREE … — measured on the real corpus 2026-10-01, AUC-24 0.731
      PENDING ENTRY … (the **Git SHA (or Baseline used)** field contains "PENDING")
```

**Cause.** `pendingReason` runs *three* scans, and the note describes two of them. Besides the
heading (step 1) and the four body phrases (step 5), `check-scoring-receipt.mjs:505-512` tests
`PENDING_WORD_RE` against the **value of every `REQUIRED_FIELDS` entry** — Command, Corpus
fingerprint, Runner attestation, and Git SHA / **Baseline used** — where a value runs from the
field's own line to the next `- **` bullet (`fieldValueByPattern`, `:455-464`). The stacked entry's
`Baseline used` value spans eight lines and contains, in ordinary prose describing the merge
resolution, `…resolved by keeping both PENDING entries and both 2026-09-06 addenda in date order`
(`MEASUREMENT_RECEIPTS.md:2230` on `65e76888`). None of the five steps touches it, and steps 2-4
name the other fields explicitly, so the list reads as exhaustive.

**The fix, and the proof it is the only thing missing.** One further edit — `PENDING entries` →
`unmeasured entries` inside that `Baseline used` value, nothing else:

```
gate AFTER the sixth edit  exit=0
  docs/p1-benchmark/MEASUREMENT_RECEIPTS.md gained a well-formed new entry in the same range. OK.
```

and it survives the 72-column re-wrap (exit 0 again). So the mechanism the round-2 fix documents
**is** correct and **does** close the gate; only the recipe is incomplete.

Note the two single branches converted clean — the gap bites *only* the stacked entry, i.e. exactly
the branch the owner note tells the owner to check out and measure.

**What to change.** Add a step (or extend step 5) saying that `\bPENDING\b` is also scanned in the
**value of each required field** (`:505-512`), that a value extends to the next `- **` bullet, and
that the stacked entry's `Baseline used` is the concrete instance. The same five-step list appears
in all three ledgers (`- **The conversion, per entry:**`, `:1966` and `:2183` on `65e76888`) and
should get the same sentence. This is one sentence in four places; no re-measurement, no code
change, and nothing else in round 2 is in question.

### Stronger version, in scope

`npm run measure-real` **exits 0** with a `[SKIP]` banner when `REAL_SCRIPT_CORPUS_DIR` is unset,
while `lock-auc24` exits 1 with a FATAL. The owner note quotes the FATAL but not the SKIP, so an
owner who fat-fingers the variable on the `measure-real` line gets a success exit code and a banner
that scrolls past, then a hard refusal one line later that names a *different* command. One clause
— "if `measure-real` prints `[SKIP] REAL_SCRIPT_CORPUS_DIR not set`, it did nothing, despite exiting
0" — would close the last gap in a sequence that is otherwise now unambiguous. (The asymmetry is a
property of main's scripts, not this lane's.)

---

## Round 3

**Objects:** `scoring/r5-verbosity-bias` @ `52bf410a`, `scoring/advice-rule-fixes` @ `a1cf7677`,
`scoring/stacked-r5-plus-advice` @ `408166ae` (all on `origin`); docs commit `22a0167b`, tag
`audit/2026-09-06/branchsync-round3`.
**Read-only:** unchanged. `git status --porcelain` empty in `/home/user/STORYMACHINE` and in the
docs worktree at `22a0167b`, before and after. The conversion experiment ran in the same throwaway
clone under `<scratch>/branchsync-review/r2/clone`, on scratch branches reset to each tip after
each run, never pushed.
**Probes:** `<scratch>/branchsync-review/r2/` — `convert3.mjs`, `g-scans12-*.log`, `g-all-*.log`,
`l3-*.md`, `added-*.txt`.

**Verdict: MERGE.**

### Structure

All three branch tips and the docs commit are fast-forwards of their round-2 objects
(`merge-base --is-ancestor` YES for all four). Round 3 touched
`docs/p1-benchmark/MEASUREMENT_RECEIPTS.md` and nothing else on the branches (+22/−6, +22/−6,
+51/−14) and only the five doc files in the worktree — no code, no test, no fixture. No AUC value
is asserted anywhere in any of the four diffs. All three ledgers remain PENDING (1 / 1 / 3 `###`
headings). The shared entries are still byte-identical across branches apart from the trailing
`---` separator the stack needs. Docs worktree: `brain-coverage` **0** (0 failing) ·
`check-brain` **0** (90 notes, 265 links, fresh) · `check-docs` **0**.

### The recipe, reproduced — and the lane was right that my round-2 finding understated it

I applied the owner note's recipe (`Owner - R5 Measurement and Merge.md:60-98`) mechanically to
every PENDING entry on each of the three tips, twice: once stopping after scans one and two, once
with all three, committing each and running the real CLI.

| branch | scans one and two only | all three scans |
|---|---|---|
| `scoring/stacked-r5-plus-advice` `408166ae` | **exit 1**, 2 failing entries | **exit 0** |
| `scoring/r5-verbosity-bias` `52bf410a` | **exit 1**, 1 failing entry | **exit 0** |
| `scoring/advice-rule-fixes` `a1cf7677` | **exit 1**, 1 failing entry | **exit 0** |

Identical to the table the note publishes, and in every scans-1-2 run the surviving problem names
exactly what the note says it will: `the **Runner attestation** field contains "PENDING"`.

**The lane's diagnosis is wider than mine, and correctly so.** My round-2 conversion reported the
two single branches converting clean; that was an artifact of my own blunt implementation, not of
the recipe. My step 2-4 replacements consumed each field block up to the next `- **` bullet, which
silently swallowed the `#### 2026-09-06 addendum — … still PENDING` heading sitting inside the
Runner-attestation window and its trailing paragraph. Reading steps 2-4 minimally — replacing only
the named bullet and its own wrapped lines, as an owner would — exposes what the lane found: on all
three branches the attestation value runs from `- **Runner attestation:**` past the end of the
entry's bullets, across the `####` addendum heading, to the next `- **Baseline used:**`, so the
bare word in `…gates re-run, still PENDING` falls inside the field value. `PENDING_PHRASES` cannot
catch it — "still PENDING" is not one of the four phrases — so only scan three does. My round-2
item named one instance (`Baseline used` on the stack); the real scope is three instances of the
Runner attestation plus that one, i.e. every branch, not only the stacked one.

**The rest of round 3 checks out where I looked.** The stacked entry's `Baseline used` prose now
reads "keeping both **unmeasured** entries" with a parenthesis at `MEASUREMENT_RECEIPTS.md:2263-2266`
explaining that the wording is deliberate because `pendingReason` tests the word against that very
field's value. The recipe in all three ledgers now numbers the three scans (i)/(ii)/(iii), names
`REQUIRED_FIELDS`, `:505-512`, and `fieldValueByPattern` `:455-464`, and states that a value can
reach across a `####` heading; it also keeps the "why the four phrases are not quoted here"
bullet. The owner note gained the `measure-real` SKIP warning I asked for in round 2
(`:36-42`) — `lock-auc24` exits 1 loudly, `measure-real` prints `[SKIP] REAL_SCRIPT_CORPUS_DIR not
set` and exits 0, "if the first line prints that SKIP banner, it measured nothing".

### Not blocking, worth one pass if the file is touched again

- `Owner - R5 Measurement and Merge.md:42` — the manifest-README sentence is glued onto the end of
  the SKIP paragraph ("…not to this note.) Before hand-editing the manifest, read"), leaving one
  very long line and merging two unrelated instructions into one rendered paragraph. A blank line
  before "Before hand-editing" restores the split the round-2 version had.
- Step 6 tells the owner to strip the bare marker from the attestation values, while the paragraph
  under the proof table says those instances "cannot be reworded — they are the honest marker …
  until the measurement exists". The timing resolves the tension (the conversion happens *after*
  the run), and the note says so, but one clause — "at conversion time, not before" — would remove
  the last place a careful reader has to stop and reason.

Nothing here changes the verdict. The three round-1 items and the round-2 item are fixed, each fix
reproduces on my own harness, the faithfulness position is unchanged (no corpus run, no AUC value,
all three branches PENDING and correctly refused by the gate), and the owner note is now literally
sufficient: followed as written, it takes all three branches from exit 1 to exit 0.
