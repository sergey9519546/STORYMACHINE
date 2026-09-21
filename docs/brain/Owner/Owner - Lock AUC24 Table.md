---
type: owner
updated: 2026-09-20
sources: [scripts/owner-measure.mjs, docs/p1-benchmark/owner-measurement-plan.json, docs/PATH_TO_EXCELLENCE.md, scripts/report-unverified-gates.mjs]
status: active
---

# Owner Item — Lock and Commit the AUC-24 Table

**Why only the owner:** producing the table requires running against the
local, copyright-restricted real-script corpus — the same reason as
[[Owner - Run Measure Real]].

## The command

```
REAL_SCRIPT_CORPUS_DIR=<corpus> npm run owner:measure
```

The lock is the LAST STEP of that one command — it is not a separate errand.
`owner:measure` runs `lock-auc24` on the accepted branch tip, or on `main` if
nothing was accepted (the deadline is the TABLE, not the branches), stages
`tests/fixtures/auc24-table.json` with `git add`, and prints exactly what to
commit and push next.

Running it by hand still works and is what the one command runs:

```
REAL_SCRIPT_CORPUS_DIR=<corpus> npm run lock-auc24
git add tests/fixtures/auc24-table.json
```

The variable has to be on the same line: an inline assignment applies to one
command only, and with it unset this script refuses —
`[FATAL] REAL_SCRIPT_CORPUS_DIR is not set — refusing to run. … Nothing was
written.` (exit 1). Note that `measure-real` fails the other way, exit 0 with a
SKIP banner; [[Owner - R5 Measurement and Merge]] has that asymmetry in full.

## What's pending, and the deadline

[[Gate - AUC-24 Ratchet]]'s CI-recomputable path
(`tests/core/auc24-table.test.ts`) skips until
`tests/fixtures/auc24-table.json` is committed. This gate carries a
deadline: **blocks CI from 2026-11-01**
([[Decision 5 - Every Reported Unverified Gate Gets an Expiry]] set the
original 2026-10-01 date; [[Decision 11 - Move the AUC-24 Table Deadline]]
moved it to 2026-11-01, because `AUC24_DEGRADATION_ID` was bumped to
`shuffle-drop/v3` on 2026-09-19 and a table locked before that date would
already be invalid on the current recipe).

## The number this produces is the first of its kind

The scene segmentation inside the degradation changed on 2026-09-12
(`AUC24_DEGRADATION_ID` is now `shuffle-drop/v2`), and the last recorded
AUC-24, **0.731**, was measured on the OLD one. Nothing was invalidated,
because the table has never existed — but the number this run produces is the
first AUC-24 this segmentation has ever produced, and it is **not comparable to
0.731**, nor to the 761-script P1 baseline's 0.734 / 0.766 (different corpus,
different degradation, different denominator). `AUC24_FLOOR` stays at 0.622
until a measurement moves it; `owner:measure` prints the locked number against
the floor and against `main` measured in the SAME run, which is the only
comparison a decision can be made on.

**And it is not the number `measure-real` reported earlier in the same run.**
That script still carries its own pre-2026-09-12 scene split, so one run
produces two AUC-24 figures on two recipes; the command labels each with the
recipe that produced it and says plainly that they are not comparable to each
other. See [[Owner - R5 Measurement and Merge]].

A below-floor result is still written, with the real number, and
`tests/core/auc24-table.test.ts` then fails the build on it. That is what the
artifact is for.

## Sources

- `scripts/owner-measure.mjs` — the command whose last step this is
- `docs/p1-benchmark/owner-measurement-plan.json` — its `lock` section
- `docs/PATH_TO_EXCELLENCE.md` "What only the owner can do now"
- `scripts/report-unverified-gates.mjs` (the `auc24-table` gate, `expires: '2026-11-01'`)
