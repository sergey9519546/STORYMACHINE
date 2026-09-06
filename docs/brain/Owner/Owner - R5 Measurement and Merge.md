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
the same way. Before hand-editing the manifest, read
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
adds measured entries and no pending one. In each entry:

1. drop `PENDING` from the `###` heading and name what was measured instead;
2. replace `**Measured AUC-24:** **PENDING** — not measured…` with the number
   the run produced;
3. replace `**Corpus fingerprint:** none. No corpus was read.` with the real
   fingerprint;
4. rewrite the `**Runner attestation:**` so it says in the first person that
   the run happened;
5. and remove the four phrases the gate's `pendingReason` scans for ANYWHERE in
   the entry body (`:487-492`) — "has not been run", "was not run", "not yet
   measured", "pending owner measurement". The 2026-09-06 addenda inside these
   entries contain several of them; leaving one behind keeps the entry pending
   even after the heading is fixed. `\bPENDING\b` is whole-word and
   case-insensitive, so "appending" is safe and "Pending" is not.

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

**The three branches, all pushed, all PENDING:**

| branch | tip | what it is |
| --- | --- | --- |
| `scoring/stacked-r5-plus-advice` | `65e76888` | **measure this one** — [[Branch - Stacked R5 plus Advice]] |
| `scoring/r5-verbosity-bias` | `fa256566` | [[Branch - R5 Verbosity Bias]] alone |
| `scoring/advice-rule-fixes` | `8a6dd037` | [[Branch - Advice Rule Fixes]] alone |

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
