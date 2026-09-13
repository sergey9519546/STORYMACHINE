# Lane report — `lane/owner-measure`, 2026-09-13

**Worktree:** `/home/user/wt-owner` · **Branch:** `lane/owner-measure`, from
`main` @ `996e27a0` · **Tip:** see the `Tip:` line at the end.

```
$ git log --oneline main..HEAD
54af254d docs(owner): the command in README, ARCHITECTURE, the manifest README and the gate report
e33a5b77 test(owner): the whole pipeline end to end, in a clone, with no corpus
478d48a5 test(owner): the conversion and the re-lock, each guard shown failing first
3ddb278b feat(owner): one command for the owner's blocking measurement — the plan, the conversion, the re-lock
<this report's own commit>
```

## 1. What the thing IS

`npm run owner:measure` (`scripts/owner-measure.mjs`) is the owner's one
blocking P1 step, executed as one command instead of read as seven documents.
That step is: measure the stacked scoring branches on the private
feature-length corpus and lock `tests/fixtures/auc24-table.json`, the artifact
`tests/core/auc24-table.test.ts` skips without and
`scripts/report-unverified-gates.mjs` blocks CI on **from 2026-10-01**.

The command:

1. reads the branch ORDER from a committed record
   (`docs/p1-benchmark/owner-measurement-plan.json`) and refuses to run when it
   disagrees with the table in
   `docs/brain/Owner/Owner - R5 Measurement and Merge.md`;
2. pre-flights: refuses without `REAL_SCRIPT_CORPUS_DIR` (exit 1, nothing
   written), runs `verify:corpus-layout`, requires a clean tree and a fetched
   remote, refuses if the checkout stands on a branch the run commits to, and
   **stops with the diff if any recorded tip has moved**;
3. measures `main` FIRST, then each eligible branch in a **detached worktree**,
   running the corpus-shape probe on the branch tree and on its pre-branch base
   and then `measure-real`, capturing AUC-24, the fingerprint, the manifest
   cross-check and the command line;
4. converts every PENDING receipt entry **in the range** by the three-scan
   recipe, verifies `0 problems` with the gate's own exported functions,
   commits on the branch, and runs the real
   `check-scoring-receipt <base>..HEAD` CLI as the final check;
5. asks `accept? [y/N]` after the first branch's number, printed against
   `AUC24_FLOOR` and against main's number from the same run, and re-locks the
   72-row manifest **in place, order preserved, only on acceptance**;
6. runs `lock-auc24` last — on the accepted tip, or on `main` if nothing was
   accepted, because the deadline is the TABLE, not the branches — stages the
   artifact, and prints exactly what to commit and push.

Nothing that indexes the corpus enters the repository: every tool's output goes
to `$XDG_STATE_HOME/storymachine/owner-measure/<date>/` (else
`~/.storymachine/owner-measure/<date>/`), the script refuses an output path
inside the repo, and every printed line passes through a redaction that
replaces the corpus dir with `<corpus>`.

### What the brief got wrong, and what the record got wrong

1. **`scoring/renderer-residuals` was NOT at `56b96765`.** Both the owner note
   and `docs/brain/Branches/Branch - Renderer Residuals.md` recorded that tip;
   `origin` has **`a4df0c49`** (`56b96765` is the last scoring-path commit, and
   `a4df0c49` is the round-2 review record committed on top of it). The plan
   record carries `a4df0c49`, the note's table is corrected, and the very first
   `--plan` run printed the disagreement — see §3.
2. **The stack is a stack by CONTENT, not by git ancestry.**
   `scoring/adversarial-2026-09-12` is not a descendant of
   `scoring/feature-length-defects`: it was branched from an older `main`
   (`8aa1f696`) and carries rebased copies of that branch's commits
   (`git merge-base` of the two is `ad3f6fa7`). "Checking out the last tip gets
   all three" is true for adversarial → forced-cue → renderer-residuals, and
   false for the first branch, so the plan gives each step its own base.
3. **`scoring/forced-cue` has no receipt range that can pass on its own.**
   `check-scoring-receipt 4cf5b2f3..089bec91` fails with *"changed in this range
   but gained no new entry"* — that branch added ROWS to the adversarial
   branch's entry rather than a new `### <date>` heading. Its receipts are
   covered from the adversarial base (`8aa1f696..HEAD`), which is why the stack
   step records TWO ranges and verifies both.
4. **`npm run verify:corpus-layout` cannot pass on this repository as
   committed.** It assumes the MIGRATED corpus schema, and
   `scripts/output/corpus-split.json` is the pre-migration 761-script P1 split
   (rows of `{file, sceneCount, wordCount}`, no `id`, no `contentHash`), so its
   check 2 fails and it exits 1 *before* reaching any check about the 72-row
   AUC-24 corpus — which is a different corpus sharing the same `--corpus-dir`.
   `classifyLayout` treats a failure whose only failing checks are the
   migrated-schema ones as that known state and continues; anything else stops
   the run. In its place is a check that does speak about this corpus: all 72
   manifest rows must resolve to files in the corpus dir.
5. **"Copy the probe script across" does not always work.**
   `scripts/probe-corpus-shape.ts` exists on the three adversarial-stack
   branches and on neither `main` nor `scoring/feature-length-defects`. The
   adversarial copy imports only `runScriptDoctor` and `analyzeFountainText`,
   so it runs on any tree; the `forced-cue` copy imports `FORCED_CUE_MARKER` and
   the `renderer-residuals` copy also `FORCED_TRANSITION_MARKER`, which the base
   trees do not export **because those exports ARE the change**. Each side runs
   the newest copy its own tree can load, and a tree that can load neither is
   recorded as "no probe" with the reason rather than failing the run.
6. **`measure-real` carries its OWN copy of the degradation recipe, with the
   OLD segmenter.** `scripts/measure-real-script-discrimination.ts:271-274` still
   splits scenes on `/^(?=INT\.|EXT\.)/mi` and defines its own `auc()`, while
   `scripts/lib/auc.ts` is the one definition every other caller imports
   (`tests/core/real-script-corpus.test.ts` was migrated; this script was not).
   So the AUC-24 this command reads from `measure-real` is computed by the
   **pre-2026-09-12 segmentation**, while `lock-auc24` — run by the same
   command, minutes later — uses `shuffle-drop/v2`. **NOT FIXED BY THIS LANE**:
   that file is a measurement instrument, changing it changes the number, and
   this lane touches no scoring or measurement path. See §6.
7. The brief's "72 rows" is right for the manifest and its re-lock; the
   fixture mode necessarily re-locks a 32-row throwaway instead.

## 2. Before and after

| | before | after |
|---|---|---|
| documents the owner had to read | **7** — `Owner - R5 Measurement and Merge.md`, `Owner - Run Measure Real.md`, `Owner - Lock AUC24 Table.md`, `tests/fixtures/real-corpus-manifest.README.md`, `Branch - Forced Cue.md`, `Branch - Renderer Residuals.md`, `scripts/lib/auc.ts`'s header | **1 command**; the seven are now the explanation of what it does |
| hand steps in the happy path | checkout, probe x2 per branch (copy the script across), `measure-real`, read AUC, hand-edit 1-3 receipt entries through three scans, hand-edit 72 manifest rows, `lock-auc24`, `git add` | `REAL_SCRIPT_CORPUS_DIR=<corpus> npm run owner:measure` |
| automated manifest re-lock | none (`real-corpus-manifest.README.md`: "there is no automated re-lock command") | `scripts/lib/manifest-relock.mjs`, in place, with a refusal for a re-ordered array |
| the branch order | prose table only | a committed record, with a test that fails when the two disagree |
| CI coverage of this path | none | `tests/scripts/owner-measure-e2e.test.ts` runs the whole pipeline on the 32 committed scripts |

## 3. Numbers, with the commands that produced them

**The note/plan disagreement, on the first run** (this is the stale-tip guard
firing on the unfixed input, before the note was corrected):

```
$ node --experimental-strip-types scripts/owner-measure.mjs --plan
…
THE NOTE AND THE PLAN DISAGREE:
    `scoring/renderer-residuals`: the note's table says tip `56b96765`, the
    plan says `a4df0c49` (full SHA in the plan). One of the two is stale —
    fix both, never one.
[REFUSED] the owner note and the plan record state different things — refusing to measure.
```

**The receipt landscape, measured with the real CLI** (`node
scripts/check-scoring-receipt.mjs <range>`, run from `main`'s tree):

| range | exit | what it reports |
|---|---|---|
| `ad3f6fa7..scoring/feature-length-defects` | 1 | 1 PENDING entry (2026-09-07 FEATURE-LENGTH DEFECTS) |
| `8aa1f696..scoring/adversarial-2026-09-12` | 1 | 2 PENDING entries (that one + 2026-09-12 ADVERSARIAL LANE) |
| `4cf5b2f3..scoring/forced-cue` | 1 | **no new entry at all** — see §1.3 |
| `089bec91..scoring/renderer-residuals` | 1 | 1 PENDING entry (2026-09-13 RENDERER RESIDUALS) |
| `ad3f6fa7..scoring/feature-length-saturation-only` | 1 | 1 PENDING entry (2026-09-11 SATURATION ALONE) |

**The conversion, run against the real `scoring/renderer-residuals` ledger**
(read-only, in scratch; the branch was not modified): 1 entry converted,
`validateEntry` reports **0 problems** on it. `pendingReason` flags **4**
entries in that file and only 3 are the stack's — the fourth is the merged
2026-09-06 P3 VERIFY-REPORT CLI entry, whose Runner-attestation value window
swallows prose naming the pending branches. The CLI never validates it (history
is not re-validated), so the converter is scoped to the entries the RANGE adds.

**The public-fixture end-to-end run** (`node --experimental-strip-types
tests/scripts/owner-measure-e2e.test.ts`): **31 tests, 31 pass, 0 fail, 36 s**
wall — of which the pipeline runs TWICE (once `--dry-run`, once for real). One
run's own output, from the fixture clone:

```
corpus            : set, readable (32 entries)
working tree      : clean
remote            : origin, fetched
HEAD              : lane/owner-measure (not a measured branch)
tips              : 1 step(s), every recorded tip matches origin
corpus layout     : 2/3 checks pass — the rest are the KNOWN pre-migration schema failures
manifest          : 32/32 rows resolve · sha256 f246134390a4 · corpus id f2eca69509c0
…
  measure-real    : 32 scripts · shuffle-drop AUC-24 0.6550 · act-swap 0.430
  manifest        : 0 mismatch(es) · 32 below the produced floor
  AUC-24          : 0.6550
  vs AUC24_FLOOR  : 0.622 — clears
  vs baseline     : 0.6550 (+0.0000)
  receipt         : 1 PENDING entry converted by the three-scan recipe
  verified        : <base>..HEAD — 1 entry, 0 problems (gate's own validateEntry)
  gate CLI        : check-scoring-receipt <base>..HEAD — exit 0
  manifest re-lock: 32 rows mapped IN PLACE, order preserved — 0 field(s) moved
  locked          : tests/fixtures/auc24-table.json (measured 0.6550), staged with `git add`
```

Those numbers are the doctor running on 32 short committed screenplays. They
are NOT an AUC-24 about the private corpus, they are not comparable to 0.731,
and the 32-below-the-floor line is the expected reading for 9-14-scene prose
against a floor built for produced features.

**Guards shown FAILING on the unfixed input before passing** (§3 of the lane
standard). Each is a test in this lane:

| guard | shown failing on |
|---|---|
| note/plan tip agreement | the real note at `56b96765`, and a fixture with one tip digit rolled |
| note/plan order agreement | two table rows swapped |
| `validatePlan` (14 rules) | one broken field at a time |
| scan one / two / three | three entries built to trip exactly one scan each, verified with the gate's own `pendingReason` |
| the `\s+` line-wrap trap | a phrase split across a line break |
| a phrase with no rewrite | a fifth phrase pushed onto the gate's exported list |
| `assertOrderPreserved` | a manifest sorted by hash, a dropped row, two rows swapped in the tail |
| hash drift | one row whose bytes no longer match its lock |
| partial re-lock | 20 of 24 rows measured |
| the SKIP trap | the REAL `measure-real` with the env unset — it does exit 0 |
| the stale-tip stop | a plan whose recorded tip does not exist, in its own clone |
| an out-dir inside the repo | `scripts/output`, and the repo root |
| an unclosable entry | a required label mid-sentence with a PENDING marker after it |

**Four defects in this lane's own code, found by those tests and fixed:**

1. field replacement ran in `CONVERTED_FIELDS` order rather than document
   order, half-replacing one field and cutting another in two on the real
   renderer-residuals entry;
2. the entry span's end was not maintained across splices, so an inserted field
   landed inside another field's paragraph;
3. the post-conversion "is it still pending?" guard compared post-conversion
   spans against the OLD headings scan one had just rewritten — it matched
   nothing, a check that could not fail;
4. the pre-commit verification imported the gate into the ORCHESTRATOR's
   process, where `ROOT = process.cwd()` is the wrong checkout, and reported
   "0 entries, 0 problems" for a conversion it had never looked at. It now runs
   in the measured tree, and an entry count of zero is itself a refusal.

A fifth was found by the end-to-end fixture: a 16-hex corpus fingerprint in
backticks is read by the gate as a **cited git object** and failed the entry
("which does not exist in this repository" — the check that exposed the
2026-08-08 fabrication). Fingerprints now carry a `sha256:` prefix.

## 4. Gates

| gate | command | exit |
|---|---|---|
| the tests for every file touched | `node --experimental-strip-types tests/scripts/{owner-measure-plan,receipt-conversion,manifest-relock,owner-measure-e2e}.test.ts`, `tests/scripts/report-unverified-gates.test.ts`, `tests/core/claims-row-citations.test.ts` | 0 (30 / 36 / 16 / 31 / 42 / 5 pass, 0 fail) |
| lint | `npm run lint` | 0 |
| check-no-console | `npm run check-no-console` | 0 |
| check-server-reachability | `npm run check-server-reachability` | 0 |
| build | `npm run build` | 0 |
| check-docs | `npm run check-docs` | 0 |
| honesty-audit | `npm run honesty-audit` | 0 |
| check-scoring-receipt | `node scripts/check-scoring-receipt.mjs main..HEAD` | 0 — "no scoring-path files changed" |
| gates | `npm run gates` | 0 |
| brain | `npm run check-brain` | 0 |
| full suite | `npm test` | 0 — **13,920 tests, 13,828 pass, 0 fail, 91 skipped, 1 todo, 6 m 45 s**, run ONCE on the final tree |

No browser suite: this lane adds no surface a writer drives. No
`test:metamorphic` and no output-identity run: no scoring-path file is touched,
which `check-scoring-receipt main..HEAD` confirms by name.

## 5. What this lane deliberately did NOT do

- **It did not modify any `scoring/*` branch.** The conversion was exercised
  against the real `scoring/renderer-residuals` ledger read-only, in scratch,
  and end to end against a throwaway branch in a clone. The owner's own run is
  what writes to those branches.
- **It did not run the real measurement.** There is no corpus here, and no
  number in this repository claims otherwise.
- **It did not add a `docs/CLAIMS_REGISTER.md` row.** The register polices
  user-facing product claims; every empirical number in this lane is about the
  tooling and lives in this report with the command that produced it. Two
  register rows (7 and 20) had their `ARCHITECTURE.md` line anchors updated,
  because this lane's §4 addition moved them by 22 lines — the anchors' own
  audit trail records that.

## 6. Left undone, with the reason

1. **`measure-real`'s private copy of the recipe is not migrated to
   `scripts/lib/auc.ts`** (§1.6). It is a real inconsistency — the AUC-24 the
   owner reads from `measure-real` and the one `lock-auc24` writes minutes
   later are computed by two different scene segmentations, and only the second
   is `shuffle-drop/v2`. Fixing it changes a measured number, which is a
   scoring-measurement change needing its own receipt and its own lane; doing
   it here would have put an unmeasured instrument change inside a tooling
   lane. **`owner:measure` prints the recipe id beside every number it reports
   so the two cannot be silently conflated, and this is the first thing the
   next lane should take.**
2. **`verify:corpus-layout` is not fixed**, only classified (§1.4). Making it
   pass needs the corpus migration (`scripts/migrate-corpus-ids.mjs --write
   --rename`) run against the real corpus — an owner-local step with its own
   consequences for the manifest's `file` values and therefore for every
   degradation seed. Out of scope, and named in the note.
3. **The probe is not run for the R5 alternative branches** (`probe: null` in
   the plan): they predate `probe-corpus-shape.ts` and their own notes do not
   name a column to read. The plan records the null rather than inventing one.
4. **No `--resume`.** A run interrupted after the first branch re-measures the
   baseline on the next invocation (about the cost of one branch). The state a
   resume would need is the accept/reject decisions, and persisting those
   across runs is a second source of truth about a judgment call.
5. **The e2e fixture's AUC comparison is degenerate by construction** — the
   fixture branch is a comment-only change, so branch and baseline print the
   same number. That is the honest fixture (any real difference would have to
   be a scoring change invented for a test); the ORDER-of-operations and the
   printed comparison are what the test pins.

`Tip:` round 1 ended at `f198b60e`; the current tip is the commit that adds the
Round 2 section below. The three `scoring/*` branches and `main` are untouched
by this lane.

---

# Round 2 — after independent review

Reviewed object: `f198b60e`. Review:
`docs/audits/2026-09-13-owner-measure/owner-measure-review.md` (`fbf9555a`),
VERDICT **REVISE**, items 1-5 blocking. Every item below is addressed, each
with a test that fails on the round-1 behaviour.

| # | disposition | where |
|---|---|---|
| 1 | **done** — recipe ids derived from the code that produced each number | `scripts/owner-measure.mjs:303` `detectMeasureRealRecipe`, `:335` `recipeComparison`; `scripts/lib/receipt-conversion.mjs` `fieldBody('Measured AUC-24')` |
| 2 | **done** — the Command field is written from what ran | `scripts/lib/receipt-conversion.mjs:201` `probeCommandLines`; `scripts/owner-measure.mjs:704` the receipt-safe probe detail |
| 3 | **done** — a `report` step is reported, never accepted | `scripts/owner-measure.mjs:1130`; plan row `adversarial-stack` is now `accept-reject` |
| 4 | **done** — the entry is restructured, not patched | `scripts/lib/receipt-conversion.mjs:125` `AS_FILED_HEADING_PREFIX`, `:151` `assertNoPendingAssertionsAbove`, `convertEntry` |
| 5 | **done** — fixture mode refuses three ways | `scripts/owner-measure.mjs:99` `FIXTURE_MARKER`, `:1015`-`:1040` the refusals |
| 6 | **done** — the NUL byte is `\0`, the file is text | `scripts/lib/manifest-relock.mjs:49` |
| 7 | **done** — the out dir is created after the pre-flight | `scripts/owner-measure.mjs:986` |
| 8 | **done** — the two forgiven checks are named | `scripts/owner-measure.mjs:441` `FORGIVEN_LAYOUT_CHECKS` |
| 9 | **done** — the ref moves by compare-and-swap or refuses | `scripts/owner-measure.mjs:1264` `moveBranchRef` |
| 10 | **done** (three parts) | `:623` the command line carries node; `:683` probe stderr goes to the log, only its path is printed; `tests/scripts/owner-measure-e2e.test.ts:158` the fixture is a real one-line scoring change |

## What each fix actually changed

**1 — the recipe label.** Round 1 printed `BOTH numbers are on recipe
shuffle-drop/v2` and wrote `recipe shuffle-drop/v2 … NOT comparable to the
0.731` into the ledger. Both are inverted: `measure-real` computes its number
with its own `/^(?=INT\.|EXT\.)/mi` split
(`scripts/measure-real-script-discrimination.ts:272`), which IS the
segmentation the 0.731 was measured on, and it is `lock-auc24`'s table that is
not comparable to it. The id is no longer a constant in this script — it is
read off the source in the tree being measured, so a migration of that script
changes the label by itself. Both ids print side by side under
`THESE TWO NUMBERS ARE ON DIFFERENT RECIPES AND ARE NOT COMPARABLE TO EACH
OTHER`, the `vs AUC24_FLOOR` line says the floor was written for the other
recipe, and the receipt carries the same statement. The invariant the review
asked for is a test: while the source carries the legacy split, the reported
id must not equal `AUC24_DEGRADATION_ID`; if it is ever migrated, the same test
asserts the two DO agree.

**2 — the Command field.** `facts.probes` is the run's own record: each side is
`ran`, `skipped` or `unavailable` with its reason, and a step whose plan entry
records no probe writes "no corpus-shape probe (the measurement plan records
none for this step)". A second defect surfaced while testing it: the probe's
summary carried the CSV's absolute path, so the first version of this fix put a
local output path into a committed receipt. The record now carries a
path-free `receiptDetail`; the path-bearing summary stays on stdout, where it
is what the owner needs.

**3 — the report gate.** `decision` is no longer initialised to `'accepted'`. A
report step is `reported`: it does not set `accepted`, does not call
`relockStep`, never becomes `lockRef`, and satisfies no `if-accepted:`.
`--accept=<step id>` accepts one by name. The committed plan's
`adversarial-stack` row was the one `report` step on the default path; it is
`accept-reject` now, because the owner does decide on that tree.

**4 — one story per entry.** The converted entry is rebuilt rather than
patched: heading, banner, the five measured fields, the
`- **Entry body as filed:**` bullet that bounds every field's value window, a
`#### As filed, before this measurement (<date>)` heading, and then the
entry's original body. The sentences the review quoted are still there, below a
heading that says when they were written — they were true then, and mechanical
surgery on arbitrary prose would be this script inventing claims.
`assertNoPendingAssertionsAbove` refuses if one of them ever ends up above the
boundary, and every pattern in it is shown firing on the sentence it names.

**5 — the fixture guard.** Three refusals, each shown failing: no
`--repo-root`; a `--repo-root` equal to the repository the script lives in; and
a checkout with no `.owner-measure-throwaway` marker. The marker is the part
that matters — a clone of this repository looks exactly like the original, so a
path check alone would not have stopped the case the review described.

## Round-2 numbers

```
$ node --experimental-strip-types tests/scripts/owner-measure-e2e.test.ts
# tests 56  # pass 56  # fail 0     (~70 s; the pipeline runs FOUR times:
                                     dry-run, accept+report, reject, plus the
                                     stale-tip and refusal clones)
$ node --experimental-strip-types tests/scripts/receipt-conversion.test.ts   # 43/43
$ node --experimental-strip-types tests/scripts/owner-measure-plan.test.ts   # 30/30
$ node --experimental-strip-types tests/scripts/manifest-relock.test.ts      # 16/16
```

The fixture is no longer degenerate. With a real one-line scoring change
(`SCARCITY_SCALE` 140 → 152 on the accepted branch, → 133 on the reported one):

Driven by hand in a throwaway clone, the same way the e2e builds one
(`SCARCITY_SCALE` 140 → 152, `--corpus-fixture=public --accept-all`):

```
  probe (branch): 32 rows, the tree's own copy -> <run dir>/fx.probe-branch.csv
  probe (base  ): skipped — this tree has no scripts/probe-corpus-shape.ts and the plan names no source
  measure-real    : 32 scripts · shuffle-drop AUC-24 0.6880 · act-swap 0.434
  AUC-24 reported : 0.6880  (recipe `shuffle-drop/legacy-int-ext-split`)
  vs AUC24_FLOOR  : 0.622 — clears
                    READ THAT COMPARISON WITH CARE: AUC24_FLOOR was written for
                    `shuffle-drop/v2`, and this number is not on it.
  vs baseline    : 0.6550 (+0.0330) — same recipe, same run, so this one IS a comparison
  recipes         : THESE TWO NUMBERS ARE ON DIFFERENT RECIPES AND ARE NOT COMPARABLE …
  receipt         : 1 pending-looking entry outside this range left untouched
  receipt         : 1 PENDING entry converted by the three-scan recipe
  verified        : <base>..HEAD — 1 entry, 0 problems (gate's own validateEntry)
  manifest re-lock: 32 rows mapped IN PLACE, order preserved — 32 field(s) moved
                    row  0 health: 76.3 -> 75.3
```

Round 1's same run printed `0.6550 (+0.0000)` and `0 field(s) moved`: the
comment-only fixture made the branch and the baseline the same tree in every
way that a number could see. In the e2e the second step (`report` gate, the
same change in the other direction) prints:

```
  decision        : reported
  manifest        : not re-locked — the re-lock follows acceptance, and this step was reported
```

The e2e asserts the delta is non-zero, that exactly one re-lock happened for
two measured steps, that the reported branch's manifest differs from the
accepted branch's, and that the lock ran on the accepted branch.

## Round-2 gates

| gate | exit |
|---|---|
| `tests/scripts/owner-measure-e2e.test.ts` | 0 — 56/56 |
| `tests/scripts/receipt-conversion.test.ts` | 0 — 43/43 |
| `tests/scripts/owner-measure-plan.test.ts` | 0 — 30/30 |
| `tests/scripts/manifest-relock.test.ts` | 0 — 16/16 |
| `tests/core/brain-coverage.test.ts` · `tests/core/claims-row-citations.test.ts` | 0 — 7/7 · 5/5 |
| `npm run lint` | 0 |
| `npm run check-no-console` | 0 |
| `npm run check-docs` | 0 |
| `npm run honesty-audit` | 0 (two `ARCHITECTURE.md` anchors re-numbered again — the round-2 paragraph moved them 4 lines) |
| `node scripts/check-scoring-receipt.mjs main..HEAD` | 0 — "no scoring-path files changed" |
| `npm run check-brain` | 0 |

No second full `npm test`, per the cost rule. No browser suite (no surface).

## Pushed back on, with the reason

**Nothing from items 1-10 was declined.** Two judgement calls inside them:

1. **Item 4, the as-filed prose is MOVED, not rewritten.** The review offered
   "rewritten into past tense … or moved wholesale under a clearly bounded
   section"; this takes the second. A table of regex rewrites over sentences
   like "exits **1** on this entry, which is the intended state" would be the
   script asserting things about a branch it has not read, and the failure mode
   is silent. Under `#### As filed, before this measurement` every one of those
   sentences is true as what it is: the entry as filed. The four PENDING
   phrases are still re-tensed, because scan two reaches them wherever they sit.
2. **Item 10's redaction half takes the second option.** `redact()` still masks
   the corpus directory and not basenames under it; what changed is that the
   one site echoing a foreign script's stderr no longer echoes it. Masking
   arbitrary basenames means deciding which words in a foreign error message
   are filenames, which is a guess; not printing it is not.

**Still out of scope, unchanged from round 1 and endorsed by the review:**
migrating `measure-real` onto `scripts/lib/auc.ts` (it moves a measured number
and needs its own receipt), fixing `verify:corpus-layout` (needs the
owner-local corpus migration), and `--resume`. The first is now IMPOSSIBLE to
conflate, which was the point of item 1: the command names the recipe that
produced each number and says they are not the same statistic.

`Tip:` `lane/owner-measure` — the commit that adds this Round 2 section, pushed
to `origin/lane/owner-measure`. `main` and every `scoring/*` branch are
untouched by this lane.
