---
type: owner
updated: 2026-09-06
sources: [docs/PATH_TO_EXCELLENCE.md, docs/p1-benchmark/MEASUREMENT_RECEIPTS.md, docs/p1-benchmark/BLIND_PAIRS_ON_BRANCHES_2026-09-04.md]
status: active
---

# Owner Item — Measure and Merge the Stacked Scoring Branch

**Why only the owner:** it needs the same local, copyright-restricted corpus
as [[Owner - Run Measure Real]], plus a judgment call on a scoring-path
change whose costs are written down and whose benefit is not yet measured on
real writing. The corpus cannot reach CI, so [[Gate - Receipt Gate]] can only
check that a human ran the measurement, never that the number is real.

**What changed 2026-09-06:** the manual merge this note used to ask for has
been done. Both branches were rebased onto `main` @ `2bfcbf9d`, renamed, and
pushed; the stacked tree exists, builds, and passes every gate that can run
without a corpus. There is now ONE branch to measure, not two plus a merge.

**The command:**

```
git fetch origin
git checkout scoring/stacked-r5-plus-advice
REAL_SCRIPT_CORPUS_DIR=<corpus> npm run measure-real
REAL_SCRIPT_CORPUS_DIR=<corpus> npm run lock-auc24
# then re-lock the 72-row tests/fixtures/real-corpus-manifest.json in place
```

The variable is repeated on purpose. An inline assignment applies to one
command only, so a bare `npm run lock-auc24` on the next line runs with it
unset and the script refuses: `[FATAL] REAL_SCRIPT_CORPUS_DIR is not set —
refusing to run. … Nothing was written.` [[Owner - Lock AUC24 Table]] writes it
the same way.

The two commands fail differently, which is worth knowing before reading the
output. `lock-auc24` refuses loudly and exits 1; `measure-real` prints
`[SKIP] REAL_SCRIPT_CORPUS_DIR not set` and **exits 0**. So a mistyped variable
on the first line looks like success and scrolls past, and the hard refusal
that follows names a different command. If the first line prints that SKIP
banner, it measured nothing — fix the variable and run it again before going
any further. (The asymmetry belongs to those scripts, not to this note.)

Before hand-editing the manifest, read
`tests/fixtures/real-corpus-manifest.README.md`: there is no automated re-lock
command, and that file is where the constraint lives that its array order is
load-bearing and must never be sorted.

**Then close the receipt gate, which takes a specific edit.** Appending a
measured entry beside the PENDING ones does NOT work, and neither does the
remedy string the gate itself prints ("append a superseding measured entry",
`scripts/check-scoring-receipt.mjs:573-575`).
`checkReceiptForRange` (`:650-673`) extracts EVERY entry the range adds and
validates each one; `ok` is `problems.length === 0`, so one surviving PENDING
entry fails the whole range no matter what sits next to it. Verified by running
the gate's own exported `extractEntries`/`validateEntry` over this branch's
three entries: as shipped, 3 entries, 3 problems; with a well-formed measured
entry appended, 4 entries, still 3 problems.

What closes it is **rewriting each of the three entries in place** so the range
adds measured entries and no pending one.

`pendingReason` runs **three** scans, and all three have to come back clean.
Steps 1, 5 and 6 below are those scans; steps 2-4 are the content the receipt
owes once the run exists.

1. **Scan one — the `###` heading.** Drop `PENDING` from it and name what was
   measured instead.
2. Replace `**Measured AUC-24:** **PENDING** — not measured…` with the number
   the run produced.
3. Replace `**Corpus fingerprint:** none. No corpus was read.` with the real
   fingerprint.
4. Rewrite the `**Runner attestation:**` so it says in the first person that
   the run happened.
5. **Scan two — the four phrases, anywhere in the entry body.** Remove every
   phrase in `PENDING_PHRASES` (`:487-492`) — "has not been run", "was not
   run", "not yet measured", "pending owner measurement". The 2026-09-06
   addenda inside these entries contain several of them; leaving one behind
   keeps the entry pending even after the heading is fixed. `\bPENDING\b` is
   whole-word and case-insensitive, so "appending" is safe and "Pending" is
   not.
6. **Scan three — the VALUE of every required field.** `pendingReason` also
   tests the bare word against the value of each `REQUIRED_FIELDS` entry
   (`:505-512`) — Command, Corpus fingerprint, Runner attestation, and Git SHA
   or Baseline used — and a value runs from its own `- **` line all the way to
   the next `- **` bullet (`fieldValueByPattern`, `:455-464`). That window is
   large: it can cross a `####` addendum heading and swallow prose that looks
   like it belongs to a later section. Two of the three entries currently carry
   the bare word inside a Runner-attestation value — as the honest pending
   marker they are meant to carry until the measurement exists — so this scan
   has real work to do on every one of them, **at conversion time, not
   before**: those markers stay exactly where they are until the corpus run has
   happened, and come out as part of the same edit that fills in the AUC-24
   number.

Step 6 is not theoretical, and it is not a stacked-branch quirk. Measured in a
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
heading. A separate instance, the stacked entry's `Baseline used` describing its
merge resolution in prose, has been reworded at the source so it is clean before
you touch it; the scan stays in the recipe because the attestation instances
cannot be reworded — they are the honest marker, and they have to survive until
the measurement exists.

Two traps worth knowing before doing that edit. Each space in those four
patterns is compiled to `\s+`, so a phrase still matches when a line wrap falls
inside it — "has" at the end of one line and "not been run" at the start of the
next is a hit, and a search that only looks within single lines will miss it.
That is measured, not predicted: it is why this file spells the four phrases
out and the receipt ledger deliberately does not. This note is not a file the
gate reads; a quoted copy of the list inside a receipt entry would hold that
entry pending on its own.

Same rewrite verified on a scratch copy: with all three converted this way, the
gate's validator reports 3 entries and 0 problems. Do not close it by editing
only a heading — that is the one route the entry text itself forbids.

**The branches, all pushed, all PENDING:**

| branch | tip | what it is |
| --- | --- | --- |
| `scoring/feature-length-defects` | `bcc96f85` | **measure this one FIRST** — [[Branch - Feature-Length Defects]] |
| `scoring/adversarial-2026-09-12` | `4cf5b2f3` | **stacks on the first; measure it right after, if the first is accepted** — [[Branch - Adversarial 2026-09-12]], READY-FOR-OWNER after four review rounds. Run `REAL_SCRIPT_CORPUS_DIR=<corpus> npm run --silent probe-corpus-shape -- --csv` on this tree and on a pre-branch checkout (copy the script across) BEFORE reading AUC-24: it splits the corpus by document shape and prints word counts, health, verdict and severity mix per script — the corpus-visible change with the largest expected effect is the pipeline seam, which reaches exactly the double-spaced scraped-PDF shape. Its output is a local artifact (the paths are the corpus's index): never paste it. Known: it carries the first branch's 1,500,000 voice bound, which must not land before main's 675,000 re-derivation is applied on the merged tree with the analyzer cap in place. |
| `scoring/forced-cue` | `f258c405` | **stacks on the adversarial branch; measure it right after, if that one is accepted** — [[Branch - Forced Cue]]: Fountain's `@` cue honoured at the parser seam and in every renderer; the probe's `@cue` column says which drafts it touches. |
| `scoring/feature-length-saturation-only` | `efd1a463` | **second, only if the first is rejected** — [[Branch - Feature-Length Saturation Only]], the saturation half alone |
| `scoring/stacked-r5-plus-advice` | `408166ae` | third — [[Branch - Stacked R5 plus Advice]] |
| `scoring/r5-verbosity-bias` | `52bf410a` | [[Branch - R5 Verbosity Bias]] alone |
| `scoring/advice-rule-fixes` | `a1cf7677` | [[Branch - Advice Rule Fixes]] alone |

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
that section before deciding. The recipe above applies unchanged to every
branch in the table.

The stack CONTAINS both singles as unsquashed ancestors, so merging it subsumes
them and the other two need not be merged separately. Whichever lands last needs
one `npm run brain` afterwards — all three branches and the docs branch
regenerated `brain.graph.json`/`GRAPH.md` independently — and
`docs/brain/Measurements Index.md`'s `## docs/scoring (N)` count needs the
arithmetic fixed by hand, because each side increments it.

**What to expect, so a fall in AUC-24 is read correctly.** These branches move
scores hard: 45 of 45 in-repo reports change on the stack, health RMS 19.02,
27 of 45 verdicts flip, and the calibration corpus's strong-versus-troubled
gap halves (25.32 to 12.54) while still ordering 5 of 5. On the twelve in-repo
blind fixtures the stack orders 4 of 6 matched pairs against `main`'s 1 of 6 —
but that rise is R5 removing a saturating clamp and exposing the raw
weighted-issue ordering, which is close to a coin flip on that corpus, so it
is not evidence the score got better at judging craft. Treat any fall in
AUC-24 as a real finding about these changes and do not answer it by moving
the floor in `scripts/lib/auc.ts`; see [[Gate - AUC-24 Ratchet]].

## Sources

- `docs/p1-benchmark/MEASUREMENT_RECEIPTS.md` — the three PENDING entries and the 2026-09-06 addenda
- `docs/PATH_TO_EXCELLENCE.md` "What only the owner can do now"
- `docs/p1-benchmark/BLIND_PAIRS_ON_BRANCHES_2026-09-04.md`
