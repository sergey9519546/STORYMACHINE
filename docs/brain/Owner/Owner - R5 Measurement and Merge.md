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
npm run lock-auc24
# then re-lock the 72-row tests/fixtures/real-corpus-manifest.json in place
```

Then supersede the three PENDING entries in
`docs/p1-benchmark/MEASUREMENT_RECEIPTS.md` with one carrying the measured
AUC-24. Until such an entry exists, none of the three branches may merge, and
`node scripts/check-scoring-receipt.mjs main..HEAD` will keep exiting 1 on all
three — which is the gate working, not a bug to route around by editing a
heading.

**The three branches, all pushed, all PENDING:**

| branch | tip | what it is |
| --- | --- | --- |
| `scoring/stacked-r5-plus-advice` | `1bae835d` | **measure this one** — [[Branch - Stacked R5 plus Advice]] |
| `scoring/r5-verbosity-bias` | `cfb7233c` | [[Branch - R5 Verbosity Bias]] alone |
| `scoring/advice-rule-fixes` | `c1873e3c` | [[Branch - Advice Rule Fixes]] alone |

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
