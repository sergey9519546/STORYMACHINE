# Audit — 2026-09-20 Dead Weight B1 + B2

**Directory:** this lane record, on `lane/dead-weight-b1-b2` from `bf4f3bff`.

## What it answers

Whether Proposal B1 of `docs/proposals/DEAD_WEIGHT_REMOVAL_2026-08-24.md`
(collect the two live-code orphan test files into `npm test`) still had work
left in it, and whether Proposal B2's v5.0 "narrative OS" closure could be
removed without breaking anything live. The owner authorized Proposal A as
KEEP, B1 as DO, and B2 as REMOVE-the-v5.0-closure-only plus the never-run
v5.0 test files. Groups 4 and 5 of the reachability allowlist — the 27
unwired `server/nvm/analyze/**` candidate modules and the 9 assorted unwired
modules elsewhere under `server/` — were out of scope and are untouched.

## B1 — already done, and verified rather than repeated

**B1 required no change. It had already shipped in `a2448714` ("ci: repair
ten gates that advertised protection they did not have").** The proposal's
two asks are both present in `scripts/run-tests.mjs` at `bf4f3bff`:

- `'tests/critics'` is the 6th entry of `TEST_ROOTS`.
- `server/nvm/kernel/event-store.test.ts` is the single entry of `TEST_FILES`,
  which exists precisely as "the collected home" the proposal asked for — the
  script's own comment explains that the file's *directory* is quarantined
  while the file itself covers the live closure `server/engine/Stage.ts`
  imports, so a per-file entry is the convention the script supports and a
  `git mv` out of `server/nvm/kernel/` would have separated the test from the
  module it tests.

No commit was made for B1, because making one would have meant either a no-op
or a cosmetic rewrite of a correct list. The 34 assertions the proposal was
written to rescue were re-run individually to confirm they are real:

```
$ node --experimental-strip-types --test tests/critics/critics-engine.test.ts
# tests 2   # pass 2   # fail 0
$ node --experimental-strip-types --test server/nvm/kernel/event-store.test.ts
# tests 32  # pass 32  # fail 0
```

2 + 32 = 34, matching the proposal exactly. The runner's own self-checks pass
unchanged: `tests/scripts/run-tests-spawn.test.ts` 17 pass / 1 skipped,
`tests/core/ci-gates-intact.test.ts` 64 pass — both before and after B2.

### One B1-adjacent gap found, and deliberately NOT fixed here

`server/nvm/kernel/event-store.test.ts` RUNS but does not TYPE-CHECK. It is
still listed in `tsconfig.json`'s `exclude`. Un-excluding it (probed, then
reverted) produces **11 `tsc` errors**: the fixtures build `AtomicFact`
literals with a `content` field the type does not have (9 sites), assign a
`StoryOp` with a widened `op: string` (1), and read `.type` off an
`EmotionState` (1). Fixing the fixtures is a separate change with its own
review; the exclude entry now carries that reason in `tsconfig.json` instead
of sitting in a list of v5.0 quarantines it no longer belongs to.

## B2 — inventory, derived from the gate

```
$ npm run check-server-reachability      # before
  source files (non-test):   328
  reachable from entry:      250
  unreachable:               78  (24722 lines)
  allowlisted as known-dead: 78
```

Every one of the 78 allowlist entries in
`scripts/verify-server-reachability.mjs` was classified against the script's
own group comments:

| Allowlist group | Files | Class | Action |
|---|---:|---|---|
| 1. tsconfig-quarantined v5.0 subsystem (`server/nvm/quantum`, `server/nvm/research`, `server/nvm/infinity-gate`, `server/planning`) | 28 | (a) v5.0 closure | removed |
| 2. dead `server/nvm/kernel/**` files | 13 | (a) v5.0 closure | removed |
| 3. `server/nvm/live/v5-loop.ts` | 1 | (a) v5.0 closure | removed |
| 4. unwired `server/nvm/analyze/**` candidates | 27 | (b) dead, not v5.0 | **kept, unchanged** |
| 5. assorted unwired modules elsewhere under `server/` | 9 | (b) dead, not v5.0 | **kept, unchanged** |
| **total** | **78** | | **42 removed, 36 kept** |

**The derived count for group (a) is 42 files / 16,153 lines — not the
proposal's "51 files, 17,120 lines".** The proposal's B2 paragraph reuses the
figure from its own table's "78 minus `analyze/**` (27)" row, which also
sweeps in group 5 (9 files, 967 lines) — modules whose allowlist reason is
"written, never connected", with no v5.0 provenance. Per group, by `wc -l`:

| Group | Files | Lines |
|---|---:|---:|
| `server/nvm/quantum/**` | 8 | 3,871 |
| `server/nvm/research/**` | 10 | 2,788 |
| `server/planning/**` | 9 | 3,125 |
| `server/nvm/infinity-gate/audience-simulation.ts` | 1 | 465 |
| `server/nvm/kernel/**` (dead files only) | 13 | 5,361 |
| `server/nvm/live/v5-loop.ts` | 1 | 501 |
| **total** | **42** | **16,111** |

(16,111 by `wc -l`; 16,153 by the reachability script's own
`split('\n').length`, which counts one more per file. The gate's before/after
file delta is exactly 328 − 286 = 42. Its LINE delta is 24,722 − 8,517 =
16,205, which is 52 more than the 16,153 those 42 files carried: the extra 52
is the edit to `server/nvm/benchmarks/index.ts`, itself an allowlisted
unreachable file whose lines count toward the unreachable total. See "What was
deliberately NOT deleted" below.)

### Never-run tests removed with the closure

`scripts/run-tests.mjs`'s `NOT_RUN` carried 8 entries. Seven named v5.0 code
and went with it; one stays.

| `NOT_RUN` entry | `NOT_RUN` reason names | Action |
|---|---|---|
| `server/nvm/__tests__/compatibility.test.ts` | v5.0 "narrative OS" experiment | removed |
| `server/nvm/__tests__/smoke.test.ts` | v5.0 "narrative OS" experiment | removed |
| `server/nvm/__tests__/v5-integration.test.ts` | v5.0 "narrative OS" experiment | removed |
| `server/nvm/kernel/__tests__/integration.test.ts` | v5.0 kernel experiment | removed |
| `server/nvm/kernel/__tests__/trinity-gate-integration.test.ts` | v5.0 kernel experiment | removed |
| `server/nvm/kernel/adapters/type-enrichment.test.ts` | v5.0 kernel adapter experiment | removed |
| `tests/apdl.test.ts` | targets `server/planning/**` | removed (planning went) |
| `tests/story-vector.test.ts` | emptied by the 2026-08-03 audit fix | **kept** — Proposal A's |

### Files removed beyond the 42 + 7

Fifteen more files came out — 12 markdown, 3 benchmarks — none of them a
judgment call except the last:

- **11 markdown reports living inside the deleted trees**, each documenting
  only deleted code: `server/nvm/quantum/README.md`;
  `server/nvm/research/{README,IMPLEMENTATION_SUMMARY}.md`;
  `server/planning/{README,QUICKSTART,IMPLEMENTATION_SUMMARY}.md`;
  `server/nvm/kernel/{README,INTEGRATION_SUMMARY,TRINITY_GATE,V5_MIGRATION_GUIDE}.md`;
  and `server/nvm/kernel/adapters/README.md`. The two kernel READMEs were the
  only ones needing a look, because that directory survives: `README.md` is
  titled "V5.0 Narrative OS Integration" and its Components section describes
  `integration.ts`, `live/v5-loop.ts`, `V5_MIGRATION_GUIDE.md` and
  `v5-examples.ts`, all deleted; `adapters/README.md` is titled "Type
  Enrichment Adapters" and documents `type-enrichment.ts` and
  `nlp-helpers.ts`, both deleted. Neither documents `event-store.ts`,
  `types.ts` or `commit-to-events.ts`, which carry their own in-file headers.
- **`server/nvm/__tests__/README.md`** (the 12th) — titled "V5.0 Integration
  Test Suite", and its four numbered sections describe exactly the four
  deleted test files. Its directory survives, because
  `server/nvm/__tests__/m1.5-harness.ts` is imported by 18 LIVE test files
  under `tests/passes/` and `tests/core/` and is not v5.0 at all.
- **3 benchmark files**: `server/nvm/quantum/benchmarks/story-field.bench.ts`
  and `server/nvm/kernel/benchmarks/trinity-gate.bench.ts` (they benchmark
  deleted modules), and `server/nvm/benchmarks/integration.bench.ts`. The
  last one is the only file in the repository outside the deletion set that
  imported into it — see the dependency map below — and it is self-described
  "Integration Benchmarks — V5.0 End-to-End Performance". Bench files are
  invisible to the reachability gate (`**/*.bench.ts` is tsconfig-excluded and
  `TEST_FILE_RE` skips them), which is why none of the three appears in the
  78.

42 + 7 + 15 = **64 files deleted**.

`server/nvm/kernel/benchmarks/event-store.bench.ts` was **kept**: it
benchmarks the live event store.

## Dependency map

### The authoritative check: does anything live import into the deletion set?

Rather than grep basenames (`index.ts`, `types.ts` and `examples.ts` make that
useless), every relative `import` / `export … from` / `import('…')` /
`require('…')` specifier in every tracked `.ts/.tsx/.mjs/.js/.cjs` file
**outside** the deletion set was resolved against disk and tested for
membership in it. Exactly two hits, both in one file:

```
server/nvm/benchmarks/integration.bench.ts  ->  server/nvm/kernel/trinity-gate.ts
server/nvm/benchmarks/integration.bench.ts  ->  server/nvm/quantum/story-field.ts
```

That file was added to the deletion set (above). **Zero imports from live
code.** Re-run after deletion: no unresolved relative import anywhere.

### Every other hit, classified

Exact-path grep of all 64 deleted paths across
`server/ src/ scripts/ tests/ docs/brain package.json tsconfig.json .github
Dockerfile .dockerignore`:

| Hit | Classification | Action |
|---|---|---|
| `tsconfig.json` — 18 `exclude` entries | quarantine entry for a now-deleted path | **removed** (`check-no-console.mjs` rejects an exemption naming a file that does not exist) |
| `scripts/verify-server-reachability.mjs` — 42 allowlist entries + the group 1–3 comments | reachability allowlist | **removed**, replaced by a dated note recording what went and where to recover it |
| `scripts/run-tests.mjs` — 7 `NOT_RUN` entries | never-run declaration | **removed** (its own `staleUnrun` check fails on an entry whose file is gone) |
| `tests/core/documentation-truth.test.ts` `LEGACY_REPORTS` — `server/nvm/kernel/TRINITY_GATE.md`, `server/nvm/quantum/README.md`, `server/planning/IMPLEMENTATION_SUMMARY.md` | a test asserting each legacy report carries a historical-status banner | **3 entries removed** — the test fails `ENOENT` otherwise. The four `docs/` reports in the same list stayed. |
| `scripts/oasis_cinematic_v2/STATUS.md:12` — "It is NOT connected to `server/planning/oasis-integration.ts`" | live status doc naming a deleted file | **one-line note added** so it does not read as a reference to a current file; the claim itself (the two were never connected) is unchanged |
| `tests/core/edge-docs-gate.test.ts` (6 sites), `scripts/lib/docs-only.mjs` (2 sites) — `server/nvm/kernel/README.md` | **synthetic** path string: the docs-only classifier tests write that path into a temp dir to prove a `.md` under `server/` is still docs-only | **left alone** — never reads the real file. All three classifier suites pass (28 / 38 / 31). |
| `docs/` — 19 files (`docs/v5.0/**`, `docs/V5.0_INTEGRATION_WORK_PLAN.md`, `docs/trinity-gate-integration-report.md`, `docs/PATH_TO_DONE.md`, `docs/PROJECT_GAP_ANALYSIS.md`, `docs/adr/ADR-003-…`, `docs/filed-backlog/**`, prior audits) | docs mention in a dated record | **left alone**, per this repo's standing rule that a dated record says what was true when written |
| `docs/brain/**` | — | **no hit at all.** Not one brain note, and not `brain.graph.json`, mentions any deleted path. Nothing to repair; one note is ADDED for this audit. |
| `.github/**`, `Dockerfile`, `.dockerignore`, `package.json` | — | **no hit.** `.dockerignore` un-ignores `server/**` wholesale and the `Dockerfile` copies `/app/server`; nothing is named per file. |
| `docs/CLAIMS_REGISTER.md` | — | **no hit** (grep for every deleted path and directory returns nothing), so no honesty-audit anchor points into a deleted file and nothing needed to be coordinated with the lane that owns that file today. |

### Placeholder constants inside the dead closure

The proposal's "Placeholder constants" section names four sites whose risk is
"a future wiring ships them unnoticed". Each was checked for a live importer
by symbol name across `server/ src/ scripts/ tests/`, excluding the deletion
set:

| Symbol | Site | Live importer |
|---|---|---|
| `computeGenreNovelty` (returns `0.5`) | `quantum/adaptive-pruning.ts` | none |
| `computeThematicDistance` (returns `0.5`) | `quantum/adaptive-pruning.ts` | none |
| `countGenres` (returns `5`) | `quantum/adaptive-pruning.ts` | none |
| `calculateCulturalMatch` (returns `0.7`) | `infinity-gate/audience-simulation.ts` | none (only the allowlist comment) |
| `OASISEmotionalValidator` (3 methods throw "not yet implemented") | `planning/index.ts` → `planning/oasis-integration.ts` | none (only the allowlist comment) |
| `'To be analyzed'` literal | `live/v5-loop.ts:187` | none |
| `createV5Integration`, `v5ReactToCommit`, `parseSemanticTriple`, `enrichAtomicFact` | kernel / v5-loop | none |
| `runTrinityGate`, `createQuantumField` | kernel / quantum | only `integration.bench.ts`, itself deleted |

The risk the proposal recorded is now discharged by removal rather than by
vigilance.

## What was deliberately NOT deleted

- **Proposal A's surface** — `server/nvm/analyze/story-vector.ts`,
  `server/lib/corpus-loader.ts`, `server/nvm/analyze/structural-genome.ts`,
  the compare/corpus-stats routes, `docs/story-vector.md`,
  `tests/core/story-vector.test.ts`, `tests/story-vector.test.ts` and
  `data/screenplays/`. KEEP, per the proposal's own recommendation and the
  owner's call. `tests/core/story-vector.test.ts` still passes 28/28.
- **The live kernel closure** — `server/nvm/kernel/event-store.ts`,
  `server/nvm/kernel/types.ts`, `server/nvm/kernel/adapters/commit-to-events.ts`,
  all imported by `server/engine/Stage.ts`, plus
  `server/nvm/kernel/event-store.test.ts` and
  `server/nvm/kernel/benchmarks/event-store.bench.ts`. None was ever on the
  allowlist, and the per-file (never per-directory) discipline that this
  proposal and `scripts/verify-server-reachability.mjs`'s header both insist
  on is exactly why the surrounding deletion could not touch it.
- **`server/nvm/__tests__/m1.5-harness.ts`** — sits inside a `__tests__`
  directory that otherwise held only v5.0 tests, but is imported by 18 live
  test files. Kept, and its directory's `tsconfig.json` exclude entry was
  dropped, so it now type-checks and is scanned by `check-no-console` for the
  first time (both clean).
- **Allowlist groups 4 and 5** — the 27 unwired `analyze/**` candidates and the
  9 assorted unwired modules, 36 files / 8,517 lines, out of scope and
  unchanged.
- **`server/nvm/benchmarks/index.ts`** (group 5) — kept, but **edited**: it is
  a catalog whose four `file:` entries named three files this lane deleted.
  Leaving it would have created a new falsehood; deleting it would have gone
  past the authorized scope. The three dead entries were removed, the header
  records why, and the file is flagged here as a candidate the next removal
  pass should settle — it is self-described "StoryMachine V5.0 Benchmark
  Suite", and every `npm run bench:*` command it advertises has never existed
  in `package.json`.
- **The 19 `docs/` files** that describe the removed subsystem
  (`docs/v5.0/**`, `docs/V5.0_INTEGRATION_WORK_PLAN.md`,
  `docs/trinity-gate-integration-report.md` and the filed-backlog reports).
  They are dated records; removing documentation was not authorized and they
  remain accurate about what once existed.

## Gates — before and after

| Gate | Before | After |
|---|---|---|
| `npm run check-server-reachability` | 328 source files, 250 reachable, **78 unreachable (24,722 lines)**, 78 allowlisted, OK | 286 source files, 250 reachable, **36 unreachable (8,517 lines)**, 36 allowlisted, OK |
| `npm run check-no-console` | 311 files checked, **23 quarantine entries** applied, OK | 311 files checked, **4 quarantine entries** applied, OK |

Both `check-no-console` readings were taken in this worktree, where
`node_modules` exists and `dist/` does not — the same condition every recent
audit in `docs/audits/` reports "23 quarantine entries" under. The count is
sensitive to that: the entries are matched against disk, so a checkout with
`dist/` present reads one higher (5 after the change) and a bare
`git archive` extract with neither reads one lower (22 → 3). Both gates were
also re-run on clean `git archive` extracts of `bf4f3bff` and of this commit
to confirm the deltas do not depend on working-tree state.
| `npm run lint` (`tsc --noEmit`) | clean | clean |
| `npm run build` | clean | clean (`✓ built in 1.46s`) |
| `npm run check-brain` | OK — 146 notes, 632 links, fresh | reports the committed graph STALE, expected: this lane adds `docs/brain/Audits/Audit - 2026-09-20 Dead Weight B1 B2.md` and `npm run brain` was out of scope per the lane brief, exactly as the B3 lane recorded. Every `[[wikilink]]` in the new note resolves. |
| `npm run check-docs` | clean | clean |

The `check-no-console` file count is unchanged at 311 for a reason worth
recording: exactly one deleted file was being scanned rather than quarantined
(`server/nvm/kernel/adapters/nlp-helpers.ts`, the only dead kernel file
tsconfig never excluded), and exactly one file entered the scan when the
`server/nvm/__tests__` exclude was dropped (`m1.5-harness.ts`). −1 + 1 = 0.

### Tests run (individually; the full `npm test` was out of scope for this lane)

| File | Result |
|---|---|
| `tests/core/ci-gates-intact.test.ts` | 64 pass |
| `tests/scripts/run-tests-spawn.test.ts` | 17 pass, 1 skipped |
| `tests/core/docker-context.test.ts` | 7 pass |
| `tests/core/dockerfile-toolchain.test.ts` | 25 pass |
| `tests/core/docs-gating-set.test.ts` | 8 pass |
| `tests/core/brain-coverage.test.ts` | 8 pass |
| `tests/core/honesty-audit-claims.test.ts` | 15 pass |
| `tests/core/pure-core-boundary.test.ts` | 6 pass |
| `tests/core/llm-seam-wiring.test.ts` | 7 pass |
| `tests/core/server-prewarm-before-listen.test.ts` | 6 pass |
| `tests/routes/ready.test.ts` | 10 pass |
| `tests/core/documentation-truth.test.ts` | 8 pass (1 failed before the `LEGACY_REPORTS` fix) |
| `tests/core/report-cross-references.test.ts` | 12 pass |
| `tests/core/edge-docs-gate.test.ts` | 28 pass |
| `tests/scripts/classify-docs-only.test.ts` | 38 pass |
| `tests/core/docs-only-classify.test.ts` | 31 pass |
| `tests/core/story-vector.test.ts` | 28 pass |
| `tests/critics/critics-engine.test.ts` | 2 pass (B1) |
| `server/nvm/kernel/event-store.test.ts` | 32 pass (B1) |

## Scoring path

`node scripts/check-scoring-receipt.mjs bf4f3bff..HEAD` reports no
scoring-path files changed, so no measurement receipt is required and
`docs/p1-benchmark/MEASUREMENT_RECEIPTS.md` was not touched (another lane owns
it today). Nothing deleted was reachable from `doctor.ts`'s import graph —
that is what "unreachable from `server.ts`" for 42 of 42 files means, and the
27 `analyze/**` candidates the receipt gate cares about were all in group 4,
which this lane did not touch.

## Recovery

Everything removed is at **`bf4f3bff`**, the lane's base commit:

```
git show bf4f3bff:server/nvm/quantum/story-field.ts
git checkout bf4f3bff -- server/planning
```

## § event-store.test.ts now type-checks

The gap this README recorded above ("One B1-adjacent gap found, and
deliberately NOT fixed here") is closed. `server/nvm/kernel/event-store.test.ts`
is no longer in `tsconfig.json`'s `exclude`; only `**/*.bench.ts` and
`tests/story-vector.test.ts` remain, each still carrying its own reason.
Removing the entry surfaced exactly the **11 `tsc` errors** this README
predicted, all of them fixture drift — the fixtures had fallen out of sync
with `AtomicFact` (`server/nvm/state/NarrativeState.ts` re-exports it from
`server/nvm/ops/StoryOp.ts`) and `EmotionState`
(`server/engine/types.ts`) — never a defect in the live types `event-store.ts`
reads, so no live type was touched.

| # | Site (pre-fix line) | Error | Fix |
|---|---|---|---|
| 1 | `createTestEvent`'s default op, L25 | `TS2322`: the default `ADD_FACT` op's `fact` literal (`{ factId, content, addedAtTurn }`) is not assignable to `StoryOp`, because its `content` field does not exist on `AtomicFact` | replaced the inline literal with `mkFact('f1', 'Test fact', 1)`, a new helper that builds a complete `AtomicFact` (`subject`, `predicate`, `object`, `validFrom`, `validTo`) and carries the old description text in `predicate` rather than dropping it |
| 2 | snapshot test's `ADD_FACT`, L226 | `TS2353`: `content` does not exist on `AtomicFact` | `fact: mkFact('f1', 'Test', 1)` |
| 3 | `createAllStoryOps()`'s 14-op array, L244 | `TS2322`: the array has no return-type annotation, so each element's `op` literal (`'ADD_FACT'`, `'EXPIRE_FACT'`, …) widens to `string` before it is compared against the `StoryOp` union, and the whole array fails as one composite error that also masked every other mismatch inside it (see rows 5–11) | annotated `function createAllStoryOps(): StoryOp[]`, which keeps each `op` literal narrowed and forces every element to be checked individually against its matching `StoryOp` variant |
| 4 | `state.characterEmotions['john'].type` assertion, L256 | `TS2339`: `EmotionState` has no `.type` — it has `dominant: EmotionType` | assertion now reads `.dominant`; the underlying fixture uses a new `mkEmotion(dominant, intensity)` helper that fills in the other five required dimensions (`joy`, `distress`, `anger`, `pride`, `shame`) at 0 so the object is a genuine `EmotionState`, not a partial stand-in |
| 5 | `'State matches expected values…'`'s two `ADD_FACT`s, L272/276 | `TS2353` ×2: `content` on `AtomicFact` | `mkFact('f1', 'Fact 1', 1)` / `mkFact('f2', 'Fact 2', 2)` |
| 6 | `'Temporal filtering…'`'s two `ADD_FACT`s, L300/305 | `TS2353` ×2: `content` on `AtomicFact` | `mkFact('f1', 'Early', 1)` / `mkFact('f2', 'Late', 2)` |
| 7 | `'Reality layer filtering… in snapshots'`'s two `ADD_FACT`s, L324/329 | `TS2353` ×2: `content` on `AtomicFact` | `mkFact('f1', 'Real', 1)` / `mkFact('f2', 'Dream', 2)` |
| 8 | `'Snapshot performance…'`'s loop-generated `ADD_FACT`, L590 | `TS2353`: `content` on `AtomicFact` | `mkFact(\`f${i}\`, \`Fact ${i}\`, i)` |

Row 3's single reported error covered several further fixture-drift mismatches
inside `createAllStoryOps()` that only became individually visible once the
return type was annotated — each is the same class of drift as the rows
above (a fixture shape that predates a field the live `StoryOp`/`Belief`/
`RelationshipDelta`/`ClueCarrier` types now require), not a live-code defect,
and all were fixed in place rather than deleted:

- `EXPIRE_FACT` was missing the required `atTurn: number` — added `atTurn: 1`.
- `UPDATE_BELIEF`'s `belief` literal (`{ content, confidence }`) does not match
  `Belief` (`server/engine/types.ts`), which requires `id`, `proposition`,
  `confidence`, `source`, `acquired_at` — rebuilt as
  `{ id: 'belief1', proposition: 'Mary is trustworthy', confidence: 0.8, source: 'witnessed', acquired_at: 1 }`.
- `SHIFT_RELATIONSHIP`'s `delta` used `change` instead of `RelationshipDelta`'s
  `amount`, and was missing the required `reason: string` — rebuilt as
  `{ dimension: 'trust', amount: 0.2, reason: 'John saw Mary keep her word' }`.
- `APPRAISE_EMOTION`'s `emotion` literal (`{ type: 'fear', intensity: 0.7 }`)
  is the same drift as row 4 — rebuilt with `mkEmotion('fear', 0.7)`.
- `SEED_CLUE`'s `carrier: 'photograph'` is not a member of the 18-value
  `ClueCarrier` union — changed to `carrier: 'object'` (a photograph is a
  physical clue-carrying object), the closest existing carrier and not a
  value any assertion in this file inspects.

None of these fixes touch `event-store.ts`, `types.ts`,
`commit-to-events.ts`, `NarrativeState.ts`, `StoryOp.ts` or
`server/engine/types.ts` — every change is confined to the test file's own
fixtures, and no assertion's intent changed: every fixture that fed an
assertion still feeds it the same logical value (fact IDs, clock amounts,
the dominant emotion, etc.), just through a type-correct literal.

### Gates (re-run after the fix)

| Gate | Result |
|---|---|
| `node --experimental-strip-types --test server/nvm/kernel/event-store.test.ts` | 32/32 pass, unchanged |
| `npm run lint` (`tsc --noEmit`), exclude entry removed | clean, repo-wide |
| `npm run check-no-console` | `312 file(s) under server/ checked, 3 tsconfig quarantine entr(ies) applied` — up from `311` files / `4` entries on this checkout (the file count rises by exactly one now that `event-store.test.ts` is scanned instead of quarantined; the entry count drops by one for the same reason). Note for anyone diffing this against the "5 → 4" figure floated when this gap was first scoped: this checkout has no `dist/` directory, so the `dist` exclude entry never resolves to a matcher and was never in the counted total either before or after — the observed drop is 4 → 3, not 5 → 4. |
| `tests/core/ci-gates-intact.test.ts` | 64/64 pass |
| `tests/scripts/run-tests-spawn.test.ts` | 17 pass, 1 skipped, 0 fail |
| `tests/core/honesty-audit-claims.test.ts` | 15/15 pass |
| `node scripts/check-scoring-receipt.mjs e79c64b4..HEAD` | "no scoring-path files changed. OK." — this lane touches only the test file, `tsconfig.json` and this README |

`tsconfig.json`'s QUARANTINE comment block was updated to drop the
now-resolved `event-store.test.ts` bullet, so the list of "real quarantine
entries" it describes matches the two that remain.
