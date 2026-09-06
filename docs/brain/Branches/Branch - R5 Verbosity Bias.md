---
type: branch
updated: 2026-09-06
sources: [docs/p1-benchmark/MEASUREMENT_RECEIPTS.md, docs/p1-benchmark/BLIND_PAIRS_ON_BRANCHES_2026-09-04.md, docs/PATH_TO_EXCELLENCE.md, docs/audits/2026-09-02-retrospective/RETROSPECTIVE.md]
status: parked
---

# Branch — R5 (Verbosity Bias)

**Branch:** `origin/scoring/r5-verbosity-bias` @ `52bf410a` (8 commits on
`main` @ `2bfcbf9d`). Rebased and renamed 2026-09-06; the old
`origin/claude/r5-verbosity-bias-pending-measurement` @ `0f625c27` is the
pre-rebase object and is superseded, not deleted.

**What it is:** the dispatched fix for retrospective finding #1 (the
health score rewards padding — appending stateless filler moved health
66.4 → 72.9 across a verdict tier). Density is renormalized by scene
opportunity — `weightedIssues / (sceneCount·30)^0.7`, penalty `8·density²`
— instead of `wordCount^0.7`, because the proposed opportunity count could
not include action paragraphs (they are the filler) or speeches (bad craft
inflates them).

**Why it is parked:** it is a scoring-path change, so it needs
`npm run measure-real` against the local corpus before it can be trusted
and merged (see [[Gate - Receipt Gate]], [[Owner - R5 Measurement and Merge]]).
Measured costs are already written down: the padding witness flips from
+5.4 to −4.4, metamorphic 8/8 with zero known-failing cases, 11,212 tests
0 failing — but calibration band separation halves (25.3 → 11.1), the
composite discrimination pair sits 0.2 above its gate, all 45 in-repo
reports move (28 change verdict), one feature-scale tier assertion is
SUSPENDED pending verdict re-anchoring, and the 72-row real-corpus manifest
is stale until re-locked.

**The conflict, resolved 2026-09-06.** R5 branched from a `main` commit ~74
commits behind where [[Branch - Advice Rule Fixes]] branched, and stacking the
two used to conflict on five files. Rebasing both onto the same `main`
(`2bfcbf9d`) removes that entirely: R5's own rebase had ONE conflict,
`docs/p1-benchmark/MEASUREMENT_RECEIPTS.md`, and the stack merge conflicts on
no code file at all. R5 never touched `character-arc.ts`, `rhythm.ts`,
`fountain.ts` or `agency-signal.test.ts` — those conflicts were `main`'s own
history being replayed across the merge-base gap. The stack now exists as
[[Branch - Stacked R5 plus Advice]].

On the blind-pairs fixtures, **R5 alone orders 3 of 6** pairs (up from 1 of 6
on main) — but only by un-pinning a tie and exposing raw weighted-issue
order, itself at chance on this set; 0 of 12 blind scripts tie at one health
value (main ties 9 of 12).

**Re-measured on the new baseline (2026-09-06, in-repo evidence only):** all
45 output-identity reports move, health RMS **20.45**, mean −9.95, largest
single move −38.9 on `off-season`, 28 verdict changes.

The like-for-like comparison is the SAME harness on the pre-rebase pair, and it
is not the 23.5 that appears in the fix doc. 23.5 is the constant-sweep
tie-break RMS in `docs/scoring/VERBOSITY_BIAS_FIX_2026-09-03.md` §"how the two
constants were picked", whose stated population is the 45 identity fixtures
**plus the calibration corpus and the length variants** — a different statistic
over a superset. The R5 receipt entry itself reports no RMS at all; it reports
range −39.9 to +24.2, mean −11.2, 45 of 45, 28 verdicts. Running the identity
harness on `0f625c27` against `e40f4cf5` reproduces exactly that (mean −11.24,
max −39.9 on `mise` 72.9 → 33.0, 28 verdicts) and gives **RMS 22.16**. So the
real shift is 22.16 → 20.45 = **1.71 points**, and `main`'s own drift over the
same 45 fixtures across those 160 commits measures RMS **0.91** (16 fixtures
moved, all `data/screenplays/*`, no verdict change, max +3.1 — the signature of
the 2026-09-04 provenance-header correction). That accounts for part of the
1.71; the rest is not separately attributed here, because it was not separately
measured. Gates on
the rebased tree: `npm run lint` 0, `npm test` 0 (12,934 tests, 0 failing),
`npm run build` 0, `npm run test:metamorphic` 0 (8 of 8 hard,
`empty_verbosity` −4.4), `check-brain` 0.
`check-scoring-receipt.mjs main..HEAD` exits 1, correctly, because the entry
is PENDING.

## Sources

- `docs/p1-benchmark/BLIND_PAIRS_ON_BRANCHES_2026-09-04.md`
- `docs/p1-benchmark/MEASUREMENT_RECEIPTS.md` — the R5 entry and its 2026-09-06 rebase addendum
- `docs/DECISION_LOG.md` / `docs/audits/2026-09-02-retrospective/RETROSPECTIVE.md` finding #1
