---
type: owner
updated: 2026-09-11
sources: [docs/PATH_TO_EXCELLENCE.md, docs/p1-benchmark/MEASUREMENT_RECEIPTS.md, docs/p1-benchmark/BLIND_PAIRS_ON_BRANCHES_2026-09-04.md, docs/scoring/FEATURE_LENGTH_DEFECTS_2026-09-07.md]
status: active
---

# Owner Item — Measure and Merge the Parked Scoring Branches

**Why only the owner:** it needs the same local, copyright-restricted corpus
as [[Owner - Run Measure Real]], plus a judgment call on scoring-path changes
whose costs are written down and whose benefit has not been measured on real
writing. The corpus cannot reach CI, so [[Gate - Receipt Gate]] can only
check that a human ran the measurement, never that the number is real.

**What changed 2026-09-11:** `scoring/feature-length-defects` went through an
independent review and a revision round, and it now has a SIBLING —
`scoring/feature-length-saturation-only`, which carries one of its two formula
changes without the other. There are now three things to decide in order, not
two; the decision tree is below the branch table. Two corrections to what this
note used to say are in that section: the reason the two heads are alternatives
was wrong, and the "roughly 8 points" framing pointed at the half AUC-24 cannot
see.

**What changed 2026-09-07:** a fourth branch,
`scoring/feature-length-defects`, arrived and takes the front of the queue —
see the branch table below for the measurement that reorders it. This note
still covers the whole queue; only the order and the first `git checkout`
moved.

**What changed 2026-09-06:** the manual merge this note used to ask for has
been done. Both branches were rebased onto `main` @ `2bfcbf9d`, renamed, and
pushed; the stacked tree exists, builds, and passes every gate that can run
without a corpus. There is now ONE branch to measure, not two plus a merge.

**The command:**

```
git fetch origin
git checkout scoring/feature-length-defects        # 2026-09-07: measure this one first
REAL_SCRIPT_CORPUS_DIR=<corpus> npm run measure-real
REAL_SCRIPT_CORPUS_DIR=<corpus> npm run lock-auc24
# then re-lock the 72-row tests/fixtures/real-corpus-manifest.json in place
```

(Substitute `scoring/stacked-r5-plus-advice` to measure that head instead —
everything below applies to either. See the branch table for why the order
changed and why the two are alternatives.)

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
| `scoring/feature-length-defects` | see the branch note | **measure this one FIRST** — [[Branch - Feature-Length Defects]] |
| `scoring/feature-length-saturation-only` | see the branch note | **second, only if the first is rejected** — [[Branch - Feature-Length Saturation Only]], the saturation half alone |
| `scoring/stacked-r5-plus-advice` | `408166ae` | [[Branch - Stacked R5 plus Advice]] |
| `scoring/r5-verbosity-bias` | `52bf410a` | [[Branch - R5 Verbosity Bias]] alone |
| `scoring/advice-rule-fixes` | `a1cf7677` | [[Branch - Advice Rule Fixes]] alone |

**THE ORDER CHANGED 2026-09-07, and the two heads are ALTERNATIVES, not a
stack.** `scoring/feature-length-defects` branches from `main` independently of
the other three and attacks the SAME defect from the opposite direction. R5
replaces the density denominator `wordCount^0.7` with `(sceneCount·30)^0.7`; the
feature-length branch measured exactly that substitution on the public benchmark
and it **inverts** — paired shuffle-drop **0.0938**, worse than doing nothing —
because a scene drop shrinks that denominator by `(2/3)^0.7 = 0.752` while
weighted issues fall to about 0.55 of intact, so it normalises by the quantity
the degradation attacks. The same benchmark puts the feature-length branch at
**0.8750** on that channel.

**CORRECTION 2026-09-11, and it is the reason the sibling branch exists.** This
paragraph used to end "Both cannot land: the two rewrite **the same two
functions** in `doctor.ts`." That reason is wrong.
`git diff 9b199b72..52bf410a -- server/nvm/analyze/doctor.ts` shows R5 changing
`densityPenalty`'s denominator and curve and leaving `scarcityPenalty`
**untouched**. They collide on ONE function, not two.

The CONCLUSION survives — R5's denominator inverts at 0.0938 on its own tip, and
the feature-length branch's scarcity saturation is identity on the public corpus,
so R5 + saturation would still read 0.0938 there, and a merge would still have to
pick one density formula. But the two halves of the feature-length branch are
**independently landable**, because they are two different functions:

* `SUB_DENSITY_STEEPNESS` 50 → 2, inside `densityPenalty` — this is the half
  that collides with R5, and the half that carries both public measurement
  channels.
* `scarcityPenalty` saturating at `140/min(sceneCount, 12)` — this is the half
  that fixes the STAPLE pathology, and the only half with any effect at feature
  length. It does NOT collide with R5 at all.

`scoring/feature-length-saturation-only` is that second half on its own, pushed,
with its own PENDING receipt and its own re-locked floors.

**THE DECISION TREE, in order.**

1. **Measure `scoring/feature-length-defects`.** If its AUC-24 holds above
   0.622, land it. The R5 stack's density change is then superseded on the
   evidence, and what remains worth salvaging from the stack is
   `scoring/advice-rule-fixes`'s six detector-correctness fixes, which touch no
   formula.
2. **If it does NOT hold, measure `scoring/feature-length-saturation-only`
   next**, before reaching for the R5 stack. It is the same branch minus the
   steepness change, so if AUC-24 rejected the steepness this is the half that
   survives — and it is the half that fixes the staple pathology, which nothing
   in the R5 stack addresses. Know two things before landing it: the mean health
   gap under the drop gets slightly WORSE on the public corpus (−1.93 → −2.15),
   because the saturation alone does not fix the deletion reward; and the staple
   witness passes there at a margin of exactly **0.0** rather than 1.8, because
   without the steepness change the density term is pinned at its ceiling for
   both documents and the margin is carried entirely by a deduction that is
   often zero.
3. **If neither holds, the R5 stack is still there** and nothing has been lost.
   Its own costs are in the "What to expect" section below.

The numbers behind all three readings are in
[[Measurement - FEATURE_LENGTH_DEFECTS_2026-09-07]] §8.2 (the candidate
comparison) and §8.2a (what AUC-24 can and cannot settle). Read §8.2a before
deciding — it is the section that says which half of the change the run
measures.

**WHAT TO CHECK ON THOSE TWO BRANCHES, corrected 2026-09-11.** This note used to
say: "its scarcity saturation is byte-identical for every script of 15 scenes or
fewer, so the public benchmark and the calibration corpus are both blind to it.
On the private corpus (median 118 scenes) it will move EVERY script by roughly 8
points. That is the single largest unmeasured effect in this queue." The 8 points
was arithmetically right and it pointed at the half AUC-24 cannot see. Two
separable things happen, and only one of them can move a matched-pair rank
statistic:

* **A near-uniform LEVEL SHIFT, which cannot move AUC-24.** At 118 scenes the
  term goes from `140/118 = 1.186` to `140/12 = 11.667`, so every script loses
  **10.480 points** (9.92 at 80 scenes, 10.97 at 200). This is what will move
  verdicts, grades and all 72 rows of
  `tests/fixtures/real-corpus-manifest.json` — the re-lock this note already
  asks for. Both halves of a matched pair lose the same amount, so by itself it
  cannot change AUC-24 at all.
* **THE SCARCITY CHANNEL'S DEGRADATION DELTA GOING TO EXACTLY ZERO, which can.**
  For a 118-scene script the drop recipe leaves ~79 scenes. Before saturation
  that term contributed `140/79 − 140/118 = +0.586` points of separation; after
  it contributes `140/12 − 140/12 = 0.000`. For every script of roughly 22 scenes
  or more — essentially the whole corpus — the channel `doctor.ts`'s own
  measurements credit with AUC 0.938 now contributes **nothing** to this
  degradation. That is what the run is testing.

So: AUC-24 **can** settle whether health still orders an intact feature above a
shuffle-dropped copy of itself with the scarcity channel contributing zero and
the density curve near-linear. It **cannot** settle which of the two changes is
responsible on the combined branch (neither half has its own AUC-24 receipt —
which is why the sibling branch exists), it cannot settle whether the
~10.5-point level shift is right (that is the manifest re-lock and the band
averages), and it says nothing about craft.

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
