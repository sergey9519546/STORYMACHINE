---
type: audit
updated: 2026-09-20
sources: [docs/audits/2026-09-20-dead-weight-b1-b2/README.md, docs/proposals/DEAD_WEIGHT_REMOVAL_2026-08-24.md, docs/UNIFIED_STATE_2026-09-02.md]
status: active
---

# Audit — 2026-09-20 Dead Weight B1 B2

**Directory:** `docs/audits/2026-09-20-dead-weight-b1-b2/` — the lane record
for Proposals B1 and B2 of
`docs/proposals/DEAD_WEIGHT_REMOVAL_2026-08-24.md`, on
`lane/dead-weight-b1-b2` from `bf4f3bff`.

## What it answers

Whether B1 (collect the two live-code orphan test suites into `npm test`)
still had work in it, and whether B2's v5.0 "narrative OS" closure could be
deleted with nothing live breaking. The owner's decision: **A keep, B1 do, B2
remove the v5.0 closure only**, plus the never-run v5.0 test files.

**B1 was already done** — `a2448714` had added `'tests/critics'` to
`TEST_ROOTS` and `server/nvm/kernel/event-store.test.ts` to `TEST_FILES`, so
no commit was made rather than a no-op one. The 34 assertions the proposal
existed to rescue were re-run individually to confirm they are real: 2 in
`tests/critics/critics-engine.test.ts`, 32 in
`server/nvm/kernel/event-store.test.ts`, 0 failures.

**B2 removed 64 files.** 42 non-test source files / 16,153 lines (the
reachability allowlist's groups 1–3: `server/nvm/quantum`,
`server/nvm/research`, `server/planning`, `server/nvm/infinity-gate`, the 13
dead `server/nvm/kernel` files, `server/nvm/live/v5-loop.ts`), plus 7
never-run test files, 12 markdown reports inside those trees, and 3
benchmarks. The gate's own before/after is the arithmetic: 78 unreachable
files / 24,722 lines → **36 / 8,517**, allowlist 78 → 36, and the
`check-no-console` quarantine 23 entries → 4.

## The number that did not match the proposal

The proposal's B2 paragraph says the v5.0 closure is "51 files, 17,120
lines". **It is 42 files / 16,153 lines.** The 51/17,120 figure is the
proposal's own table minus `analyze/**`, which also sweeps in the 9 assorted
"written, never connected" modules of allowlist group 5 — no v5.0
provenance, and left untouched by this lane along with the 27 unwired
`analyze/**` candidates of group 4.

## Why it is safe to have merged

The check that carried the decision was not a basename grep — `index.ts`,
`types.ts` and `examples.ts` make that useless. Every relative import
specifier in every tracked source file OUTSIDE the deletion set was resolved
against disk and tested for membership in it. Exactly two hits, both in
`server/nvm/benchmarks/integration.bench.ts`, itself a self-described "V5.0
End-to-End Performance" bench, which was deleted with the rest. **Zero
imports from live code.** The placeholder constants the proposal warned
about — quantum's literal `0.5`/`0.5`/`5`, infinity-gate's `0.7` cultural
match, `OASISEmotionalValidator`'s three "not yet implemented" throws,
v5-loop's `'To be analyzed'` — were each checked by symbol name for a live
importer and had none; the risk is discharged by removal rather than by
vigilance.

The live kernel closure is untouched: `event-store.ts`, `types.ts` and
`adapters/commit-to-events.ts` were never on the allowlist because
`server/engine/Stage.ts` imports them, and the per-file (never
per-directory) discipline this repository learned the hard way is exactly
what let the dead siblings go without them.

`npm run lint`, `npm run build`, `npm run check-docs`,
`npm run check-server-reachability` and `npm run check-no-console` all pass,
and 19 test files were run individually, including every gate-integrity
suite. No scoring-path file was touched
(`scripts/check-scoring-receipt.mjs bf4f3bff..HEAD` reports none), so no
measurement receipt is required. `npm test` and `npm run brain` were out of
scope per the lane brief; `npm run check-brain` therefore reports the
committed graph stale, as the B3 lane's note also records.

**Related:** [[Audit - 2026-09-20 Dead Weight B3]],
`docs/proposals/DEAD_WEIGHT_REMOVAL_2026-08-24.md`,
`docs/UNIFIED_STATE_2026-09-02.md`, [[Patterns]].

## Sources

- `docs/audits/2026-09-20-dead-weight-b1-b2/README.md`
- `docs/proposals/DEAD_WEIGHT_REMOVAL_2026-08-24.md`
- `docs/UNIFIED_STATE_2026-09-02.md`
