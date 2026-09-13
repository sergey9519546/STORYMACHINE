---
type: owner
updated: 2026-09-13
sources: [docs/p1-benchmark/owner-measurement-plan.json, scripts/owner-measure.mjs, docs/p1-benchmark/MEASUREMENT_RECEIPTS.md, docs/PATH_TO_EXCELLENCE.md, docs/p1-benchmark/BLIND_PAIRS_ON_BRANCHES_2026-09-04.md]
status: active
---

# Owner Item — Measure and Merge the Stacked Scoring Branch

**Why only the owner:** it needs the same local, copyright-restricted corpus
as [[Owner - Run Measure Real]], plus a judgment call on a scoring-path
change whose costs are written down and whose benefit is not yet measured on
real writing. The corpus cannot reach CI, so [[Gate - Receipt Gate]] can only
check that a human ran the measurement, never that the number is real.

## The command

```
REAL_SCRIPT_CORPUS_DIR=<corpus> npm run owner:measure
```

One command. It reads the ORDER from
`docs/p1-benchmark/owner-measurement-plan.json` — the machine-readable half of
the table below, which `tests/scripts/owner-measure-plan.test.ts` fails if the
two disagree — prints the plan and the reason for every step, runs the
pre-flight, measures `main` first and then each eligible branch in a **detached
worktree** so your checkout is never touched, converts each branch's PENDING
receipt entries by the three-scan recipe, asks accept/reject after the first
branch's number, re-locks the 72-row manifest only on acceptance, and locks
`tests/fixtures/auc24-table.json` at the end.

```
npm run owner:measure -- --plan       # print the plan and the reasons, do nothing
npm run owner:measure -- --dry-run    # run it all; print every edit as a diff; write nothing
npm run owner:measure -- --push       # also push the conversion commit (OFF by default)
```

`--push` is off on purpose: read the diff first. Everything below is WHY the
command does what it does — the traps are all still here, they are just no
longer a procedure you have to execute by hand.

## Why the variable is on the same line

An inline assignment applies to ONE command only. A bare `npm run lock-auc24`
on the next line runs with it unset, and that script refuses:
`[FATAL] REAL_SCRIPT_CORPUS_DIR is not set — refusing to run. … Nothing was
written.` [[Owner - Lock AUC24 Table]] writes it the same way.

**And the two underlying commands fail DIFFERENTLY**, which is the trap:
`lock-auc24` refuses loudly and exits 1; `measure-real` prints
`[SKIP] REAL_SCRIPT_CORPUS_DIR not set` and **exits 0**. So a mistyped variable
looks like success and scrolls past, and the hard refusal that follows names a
different command. `owner:measure` treats that SKIP banner as a FAILURE
whatever the exit code says (`parseMeasureReal`), and refuses before anything
runs if the variable is unset at all. The asymmetry still belongs to those two
scripts; it can no longer cost you an afternoon.

## The pre-flight, and the one thing it cannot check today

[[Gate - Corpus Layout Verification]] (`npm run verify:corpus-layout --
--corpus-dir=<corpus>`) is the pre-flight [[Owner - Run Measure Real]] names,
and `owner:measure` runs it for you. **It cannot pass on this repository as
committed** (measured 2026-09-13): that script assumes the MIGRATED corpus
schema, and `scripts/output/corpus-split.json` is still the pre-migration
761-script P1 split — no `id`, no `contentHash` per row — so its check 2 fails
and it exits 1 before reaching any check that speaks about the 72-row AUC-24
corpus. `classifyLayout` in `scripts/owner-measure.mjs` treats a failure whose
only failing checks are the migrated-schema ones as the KNOWN pre-migration
state and continues; any other failing check stops the run. Standing in its
place is a check that does speak about this corpus: every row of
`tests/fixtures/real-corpus-manifest.json` must resolve to a file in the corpus
dir, reported by content-hash prefix and never by title.

The pre-flight also requires a clean working tree, fetches the remote, refuses
if your checkout is standing on a branch the run commits to, and **verifies
every recorded branch tip against the remote, stopping with the diff if one has
moved**. The record is the authority: a moved tip means the note and the plan
are stale, and measuring a tree nobody wrote down is how a number ends up
attached to the wrong branch. (That guard earned its place immediately — on
2026-09-13 this note's table said `scoring/renderer-residuals` was at
`56b96765`; the branch was at `a4df0c49`, one review commit later.)

## Nothing that indexes the corpus goes into the repository

The probe's CSV and `measure-real`'s log both begin every row with a corpus
file path, and on the private corpus those paths are the TITLES of real
screenplays — collectively the corpus's index, which this repository has never
published. `owner:measure` writes them to a local directory OUTSIDE the
repository (`$XDG_STATE_HOME/storymachine/owner-measure/<date>/`, else
`~/.storymachine/owner-measure/<date>/`; it refuses a path inside the repo),
prints only parsed aggregates, and passes everything it does print through a
redaction that replaces the corpus dir with `<corpus>`. Keep those files where
they land. The numbers and the fingerprint are what travel — the same shape
this repository already commits in `tests/fixtures/real-corpus-manifest.json`.

## The manifest re-lock

`tests/fixtures/real-corpus-manifest.README.md` is where the constraint lives
that the array **order is load-bearing**: `tests/core/real-script-corpus.test.ts`
measures the AUC-24 floor over `MANIFEST.slice(0, 24)`, so sorting or
regrouping the array keeps the assertion passing while silently changing what
it asserts. That README also said there is no automated re-lock command. There
is now — `scripts/lib/manifest-relock.mjs`, which maps the array in place,
one-to-one, by index, and whose `assertOrderPreserved` REFUSES a re-ordered
result (shown failing on a re-sorted array before it is shown passing). It
moves `health`, `verdict` and `sceneCount` only; a row whose local bytes no
longer hash to its locked `contentHash` is a different script, and the re-lock
stops rather than quietly moving the floor's subset onto text nobody reviewed.

**The re-lock runs only on ACCEPTANCE**, never merely because a measurement
happened.

## The receipt conversion: three scans, and why only all three close it

Appending a measured entry beside the PENDING ones does NOT work, and neither
does the remedy string the gate itself prints ("append a superseding measured
entry", `scripts/check-scoring-receipt.mjs:573-575`). `checkReceiptForRange`
extracts EVERY entry the range adds and validates each one; `ok` is
`problems.length === 0`, so one surviving PENDING entry fails the whole range no
matter what sits next to it. Verified by running the gate's own exported
`extractEntries`/`validateEntry` over one branch's three entries: as shipped, 3
entries, 3 problems; with a well-formed measured entry appended, 4 entries,
still 3 problems.

What closes it is **rewriting each entry in place**, which is what
`scripts/lib/receipt-conversion.mjs` does. `pendingReason` runs **three** scans
and all three have to come back clean:

1. **Scan one — the `###` heading.** The PENDING parenthetical is replaced by
   what was measured. A bare `PENDING` left outside any parenthetical is
   refused rather than guessed at: a heading is the one line a reader trusts.
2. **The content the receipt owes** — the AUC-24 number, the corpus
   fingerprint, the exact command, the git SHA, and a first-person runner
   attestation carrying the login, hostname and date **from the environment,
   never invented**.
3. **Scan two — the four phrases, anywhere in the entry body.** The gate
   compiles each phrase with `\s+` between its words, so a phrase still matches
   when a line wrap falls inside it — "has" at the end of one line and "not
   been run" at the start of the next is a hit, and a search that only looks
   within single lines will miss it. That is measured, not predicted. The
   converter imports the phrase list from the gate (one definition, no drift)
   and **re-tenses rather than deletes**: "had not been run as of filing" is
   true before and after the measurement, where a deletion would leave a
   sentence saying something else. Every converted entry gains one banner line
   saying its body is the entry AS FILED with its pre-measurement tense
   corrected, and naming the commit where the original bytes still are.
4. **Scan three — the VALUE of every required field.** `pendingReason` also
   tests the bare word against the value of each `REQUIRED_FIELDS` entry —
   Command, Corpus fingerprint, Runner attestation, and Git SHA or Baseline
   used — and a value runs from its own `- **` line all the way to the next
   `- **` bullet (`fieldValueByPattern`). That window is large: it can cross a
   `####` addendum heading and swallow prose that looks like it belongs to a
   later section. So the REWRITE replaces a field's own paragraph (replacing
   the whole window would delete the entry's body) and the VERIFICATION uses
   the gate's own wider window.

Step 4 is not theoretical, and it is not a stacked-branch quirk. Measured in a
throwaway clone, by applying this recipe mechanically to each branch's ledger
and running the real CLI (`node scripts/check-scoring-receipt.mjs main..HEAD`):

| branch | before | scans one and two only | all three scans |
| --- | --- | --- | --- |
| `scoring/stacked-r5-plus-advice` | exit 1 | **exit 1** | **exit 0** |
| `scoring/r5-verbosity-bias` | exit 1 | **exit 1** | **exit 0** |
| `scoring/advice-rule-fixes` | exit 1 | **exit 1** | **exit 0** |

In every case the surviving failure names the same thing — `the **Runner
attestation** field contains "PENDING"` — because each entry's attestation ends
by explaining that its own heading says so, and on the advice entry the field
value runs on past the end of the entry's bullets into the `####` addendum
heading. Those markers are the honest pending marker, and they come out as part
of the same edit that fills in the AUC-24 number, never before it.

**This note is not a file the gate reads.** A quoted copy of the four phrases
inside a receipt entry would hold that entry pending on its own, which is why
the ledger deliberately does not spell them out and why the converter carries
them as data.

**And the converted entry is RESTRUCTURED, not patched.** Scan two only knows
four phrases, so an entry can pass every scan while its first paragraph still
says "its AUC-24 is not known … exits **1** on this entry, which is the
intended state" under a heading that says MEASURED. Those sentences were true
when they were written and mechanically rewriting arbitrary prose would be this
script inventing claims, so the entry is given one shape instead: the heading,
the conversion banner, the five measured fields, the
`- **Entry body as filed:**` bullet that bounds every field's value window, and
then a `#### As filed, before this measurement` section carrying the entry's
original body. Everything describing the pending state is below a heading that
says so; everything above it is the run's own record.
`assertNoPendingAssertionsAbove` refuses if one of those sentences ever ends up
above the boundary.

After the rewrite, `owner:measure` verifies with the gate's own exported
functions (`addedReceiptLines` against the working tree, then
`extractEntries`/`validateEntry`) and requires **0 problems**; it then commits
and runs the real CLI on every recorded range as the final check. On any
surviving problem it prints the entry and the scan that failed and **commits
nothing**. The Command field it writes is built from what the run actually did:
each probe side is recorded as RAN, SKIPPED or UNAVAILABLE, and a step whose
plan entry records no probe says that rather than claiming one.

## The branches, and the order

| branch | tip | what it is |
| --- | --- | --- |
| `scoring/feature-length-defects` | `bcc96f85` | **measured FIRST** — [[Branch - Feature-Length Defects]] |
| `scoring/adversarial-2026-09-12` | `4cf5b2f3` | first of the stack — [[Branch - Adversarial 2026-09-12]], READY-FOR-OWNER after four review rounds |
| `scoring/forced-cue` | `089bec91` | stacked on it — [[Branch - Forced Cue]]: Fountain's `@` cue honoured at the parser seam and in every renderer; the probe's `@cue` column says which drafts it touches |
| `scoring/renderer-residuals` | `a4df0c49` | stacked on forced-cue and the tip the run measures — checking it out gets all three, and its own receipt range is `089bec91..HEAD` — [[Branch - Renderer Residuals]]: `>` forced transitions typed at the parser seam and printed as transitions by every renderer, `>text<` centering read as a structural line, the `@`-out-of-position decision written down; the probe's `>tr` column says which drafts it touches (0 of 32 committed) |
| `scoring/feature-length-saturation-only` | `efd1a463` | **only if the first is rejected** — [[Branch - Feature-Length Saturation Only]], the saturation half alone |
| `scoring/stacked-r5-plus-advice` | `408166ae` | third — [[Branch - Stacked R5 plus Advice]] |
| `scoring/r5-verbosity-bias` | `52bf410a` | [[Branch - R5 Verbosity Bias]] alone |
| `scoring/advice-rule-fixes` | `a1cf7677` | [[Branch - Advice Rule Fixes]] alone |

The three R5 rows are reached with `--only=<step id>`, not automatically: the
decision tree gets there only after the first two steps have been read.

**Every row's gate ASKS.** A step can also be declared `report` — measured and
written down, never accepted: no manifest re-lock, not the tip `lock-auc24`
writes against, and it satisfies no `if-accepted:`. `--accept=<step id>` accepts
one by name. (Until 2026-09-13 a `report` step was silently treated as
ACCEPTED, and the stack row was one, so the default path re-locked the 72-row
manifest against a tree nobody had been asked about. The stack row is
`accept-reject` now, and the semantics are driven end to end in
`tests/scripts/owner-measure-e2e.test.ts`.)

**THE ORDER CHANGED 2026-09-07 (corrected 2026-09-11), and the two heads are
ALTERNATIVES, not a stack.** `scoring/feature-length-defects` attacks the same
defect from the opposite direction: R5 replaces the density denominator
`wordCount^0.7` with `(sceneCount·30)^0.7`, and the feature-length branch
measured exactly that substitution on the public benchmark — paired
shuffle-drop **0.0938**, worse than doing nothing, because a scene drop
shrinks that denominator faster than the weighted issues it normalises. The
same benchmark puts the feature-length branch at **0.8750**. They collide on
ONE function (`densityPenalty`; R5 leaves `scarcityPenalty` untouched), which
is why the saturation half is landable on its own. The decision tree, the
correction of the "same two functions" reason, and the two-part account of
what AUC-24 can and cannot settle (the ~10.5-point level shift is
rank-preserving and cannot move it; the scarcity channel's degradation delta
going from +0.586 to exactly 0.000 for every script of about 22 scenes or more
is what the run tests) live in the fuller version of this note ON THE BRANCH
(`docs/brain/Owner/Owner - R5 Measurement and Merge.md` at `bcc96f85`) and in
the branch's `docs/scoring/FEATURE_LENGTH_DEFECTS_2026-09-07.md` §8.2a. Read
that section before answering the accept/reject prompt.

**One stated caveat travels with the stack**, and `owner:measure` prints it at
the point it applies: it carries the first branch's 1,500,000 voice-eligible
bound, which must not land before main's 675,000 re-derivation is applied on
the merged tree with the analyzer cap in place. The thing that would let BOTH bounds rise is not the analyzer pair cap this row used to name: `burrowsDelta` re-derives both characters' relative frequencies 130 times per pair, and hoisting that is bit-identical (`maxDeltaDiff = 0`) and 43.8-56x faster. It is scoring-path and needs a receipt, but it costs the score nothing — point a scoring lane at that first.

The stack CONTAINS both R5 singles as unsquashed ancestors, so merging it
subsumes them and the other two need not be merged separately. Whichever lands
last needs one `npm run brain` afterwards — all three branches and the docs
branch regenerated `brain.graph.json`/`GRAPH.md` independently — and
`docs/brain/Measurements Index.md`'s `## docs/scoring (N)` count needs the
arithmetic fixed by hand, because each side increments it.

## Read the probe before the AUC

`npm run --silent probe-corpus-shape -- --csv` splits the corpus by document
shape and prints word counts, health, verdict and severity mix per script, plus
the `@cue` and `>tr` columns. `owner:measure` runs it on the branch tree AND on
the pre-branch base and writes both CSVs to the local output directory.

**Copying the script across does not always work, and the run says so rather
than failing.** `scripts/probe-corpus-shape.ts` does not exist on `main` or on
`scoring/feature-length-defects` — it was written on the adversarial branch,
whose copy imports only `runScriptDoctor` and `analyzeFountainText` and so runs
anywhere. But the `scoring/forced-cue` copy imports `FORCED_CUE_MARKER` and the
`scoring/renderer-residuals` copy also `FORCED_TRANSITION_MARKER`, symbols the
base trees do not export — **because those exports ARE the change**. So each
side runs the newest copy its own tree can load, and on a base tree the new
column is zero by construction.

The corpus-visible change with the largest expected effect on the stack is the
pipeline seam, which reaches exactly the double-spaced scraped-PDF shape; that
is what the probe's split is for.

## What to expect, so a fall in AUC-24 is read correctly

These branches move scores hard: 45 of 45 in-repo reports change on the stack,
health RMS 19.02, 27 of 45 verdicts flip, and the calibration corpus's
strong-versus-troubled gap halves (25.32 to 12.54) while still ordering 5 of 5.
On the twelve in-repo blind fixtures the stack orders 4 of 6 matched pairs
against `main`'s 1 of 6 — but that rise is R5 removing a saturating clamp and
exposing the raw weighted-issue ordering, which is close to a coin flip on that
corpus, so it is not evidence the score got better at judging craft. Treat any
fall in AUC-24 as a real finding about these changes and do not answer it by
moving the floor in `scripts/lib/auc.ts`; see [[Gate - AUC-24 Ratchet]].

**THE RUN PRODUCES TWO AUC-24 NUMBERS, ON TWO RECIPES, AND SAYS SO.**
`scripts/measure-real-script-discrimination.ts` still carries its own
`splitScenes` on `/^(?=INT\.|EXT\.)/mi` and its own `auc()`, while
`lock-auc24` imports `shuffleDropDegrade` from `scripts/lib/auc.ts`
(`shuffle-drop/v2`). So the AUC-24 the run REPORTS and the table it WRITES are
not the same statistic. `owner:measure` derives each label from the code that
produced the number — `detectMeasureRealRecipe` reads the script's source in
the tree being measured, so the answer changes by itself the day that script is
migrated — and prints them side by side with the sentence that matters:

```
recipes         : THESE TWO NUMBERS ARE ON DIFFERENT RECIPES AND ARE NOT COMPARABLE
                  TO EACH OTHER.
```

The reported number IS on the same segmentation as the **0.731 of 2026-07-11**;
the committed table is not, and `AUC24_FLOOR` was written for the table's
recipe. The receipt carries the same statement. Migrating `measure-real` onto
`scripts/lib/auc.ts` moves a measured number and is its own change with its own
receipt — until then, the comparison a decision can lean on is
**branch-vs-main, same recipe, same session**, which is why the run measures
`main` first and prints that delta separately.

## Sources

- `docs/p1-benchmark/owner-measurement-plan.json` — the order, machine-readable
- `scripts/owner-measure.mjs` — the command this note explains
- `docs/p1-benchmark/MEASUREMENT_RECEIPTS.md` — the PENDING entries and the 2026-09-06 addenda
- `docs/PATH_TO_EXCELLENCE.md` "What only the owner can do now"
- `docs/p1-benchmark/BLIND_PAIRS_ON_BRANCHES_2026-09-04.md`
