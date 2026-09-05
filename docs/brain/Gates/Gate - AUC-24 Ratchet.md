---
type: gate
updated: 2026-09-05
sources: [CLAUDE.md, tests/core/real-script-corpus.test.ts, tests/core/auc24-table.test.ts, scripts/lib/auc.ts, tests/fixtures/real-corpus-manifest.json]
status: active
---

# Gate — AUC-24 Ratchet

**What it checks:** the floor is **AUC-24 ≥ 0.622** — ONE combined
degradation (shuffle scenes AND drop every third) over a 24-script subset;
last measured **0.731**. It is asserted two ways: (1) live, in
`tests/core/real-script-corpus.test.ts` (env-gated on
`REAL_SCRIPT_CORPUS_DIR`), which also locks 72 per-script health/verdict
values (`tests/fixtures/real-corpus-manifest.json`; 71 is an older figure
that appears in a `doctor.ts` comment and should not be trusted over the
manifest itself — see [[Branch - R5 Verbosity Bias]]'s "72-row" wording);
(2) since 2026-09-03, on every CI run with no corpus, by
`tests/core/auc24-table.test.ts`, which recomputes the AUC from a committed
table of 24 intact/degraded health pairs (`tests/fixtures/auc24-table.json`)
— but only once that table exists (produced by `npm run lock-auc24` on the
owner's machine). Both the floor value and the degradation recipe live in
`scripts/lib/auc.ts` — edit the constant there, never a literal in a test.

**Command:** `REAL_SCRIPT_CORPUS_DIR=<corpus> npm test` (live);
`REAL_SCRIPT_CORPUS_DIR=<corpus> npm run lock-auc24` (produces the
committed table); `npm test` alone runs the table-based assertion once
`tests/fixtures/auc24-table.json` is committed.

**Where it lives:** `scripts/lib/auc.ts` (constant + recipe);
`tests/core/real-script-corpus.test.ts`; `tests/core/auc24-table.test.ts`;
tracked by [[Gate - Receipt Gate]]'s reporting sibling,
`scripts/report-unverified-gates.mjs` (this gate's table-commit gap
`expires: 2026-10-01`, blocking after that date — see
[[Decision 5 - Every Reported Unverified Gate Gets an Expiry]]).

**What it cannot catch:** this is **not** the same statistic as the 761-script
P1 baseline (SCENE_SHUFFLE 0.734, MIDPOINT_DROP 0.766, separately, against a
≥0.80 gate on a 153-script test partition) — different corpus, different
degradation, different denominator; see
[[Measurement - DISCRIMINATION_BASELINE_2026-07-29]]. Even with the table
committed, CI can never verify a *fresh* AUC value — the corpus is
local-only by design and cannot reach CI (copyright; secrets were rejected
as a corpus transport).

## Sources

- `CLAUDE.md` "Which floor, exactly" section
- `scripts/lib/auc.ts`
