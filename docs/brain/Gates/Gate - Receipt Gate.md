---
type: gate
updated: 2026-09-05
sources: [scripts/check-scoring-receipt.mjs, docs/p1-benchmark/MEASUREMENT_RECEIPTS.md, tests/core/scoring-receipt-guard.test.ts]
status: active
---

# Gate — Receipt Gate

**What it checks:** whether a git range touches any file on the "scoring
path" (anything reachable from `server/nvm/analyze/doctor.ts` or
`src/lib/fountain.ts` — see `scripts/check-scoring-receipt.mjs`'s own
reachability walk). If it does, the same range must add a well-formed new
entry to `docs/p1-benchmark/MEASUREMENT_RECEIPTS.md` — the human step
("did someone actually run `npm run measure-real`?") is checked for, not
hoped for.

**Command:** `node scripts/check-scoring-receipt.mjs main..HEAD` (or the
`origin/main...HEAD` / pushed-range form CI uses — see below).

**Where it lives:** `scripts/check-scoring-receipt.mjs`; wired as a
blocking CI step ("Scoring-path change requires a measurement receipt") in
`.github/workflows/ci.yml`; pinned by
`tests/core/scoring-receipt-guard.test.ts` and exercised for shape by
[[Gate - Pure-Core Boundary]] (the same reachability walker).

**What it cannot catch:** the AUC *value* — CI has no corpus, so the gate
can never verify the receipt's number is real, only that a plausible-looking
entry exists. A careful fabrication (a well-formed entry with an invented
number) still passes; the gate raises the cost of silent omission, it does
not make the measurement itself independently verifiable. It also could not
originally see a push straight to `main` at all — `resolveDefaultRange()`
computed `origin/main...HEAD`, which on a push is the same commit (an empty
range, "OK", exit 0, across ~182 historical runs) — fixed by diffing the
pushed range (`PUSH_BEFORE_SHA`) on `push` events specifically.

## Sources

- `scripts/check-scoring-receipt.mjs` (header, both historical holes)
- `docs/p1-benchmark/MEASUREMENT_RECEIPTS.md`
- `.github/workflows/ci.yml` ("Scoring-path change requires a measurement receipt")
