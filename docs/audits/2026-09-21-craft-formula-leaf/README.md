# Lane record — 2026-09-21 craft formula leaf

`lane/craft-formula-leaf`, branched from `bafffb69` (the session branch
`claude/fable-5-1-orchestrator-yil0xr`, main's lineage). A **code motion that
moves no number**: the craft formula leaves `doctor.ts` for an import-free
leaf module, so `calibration/reference.ts` can score its corpus without
importing `doctor.ts`, and the doctor<->reference import cycle stops running
the formula.

Both `docs/audits/2026-09-21-prod-loader-guard/README.md` §5 and the
feature-length candidate's audit (§E5.3) declined this move and named it as
the right follow-up: the two gotchas it retires — formula constants in their
temporal dead zone, and esbuild's `__name` helper under tsx — were guarded by
tests but remained live hazards for the next editor. This lane makes them
structurally impossible on the path where they fired.

## 1. The commits

| commit | what |
|---|---|
| `e2e8a5d9` `refactor(doctor): move the craft formula into craft-formula.ts, a leaf, so reference.ts no longer imports doctor.ts` | `server/nvm/analyze/craft-formula.ts` (new), `doctor.ts` (blocks removed; import + re-export), `calibration/reference.ts` (one import specifier; header comments), `tests/core/craft-formula-leaf.test.ts` (new) |
| `36433b75` `docs: the doctor<->reference cycle no longer runs the formula — gotcha rewritten, doctor.ts line anchors shifted -230` | `CLAUDE.md`, `NORTH_STAR.md`, `ROADMAP.md`, `ARCHITECTURE.md`, `docs/CALIBRATION.md`, `docs/CLAIMS_REGISTER.md`, `docs/brain/Glossary.md` |
| `docs(receipts): craft formula moved to a leaf module …` | the `### 2026-09-21 — craft formula moved to a leaf module` entry appended to `docs/p1-benchmark/MEASUREMENT_RECEIPTS.md` |
| `docs(audit): craft-formula-leaf lane record` | this file, `docs/brain/Audits/Audit - 2026-09-21 Craft Formula Leaf.md`, and the regenerated brain graph |

The receipt is the authority for every measured figure; this record explains
what moved, the graph before and after, the probes, and what was deliberately
left alone.

## 2. What moved, exactly

`computeRawCraftScore` transitively calls exactly three functions inside
`doctor.ts`, all private until now:

| function | reads | called from (before the move) |
|---|---|---|
| `densityPenalty(bySeverity, wordCount)` | `WORD_COUNT_EXPONENT` 0.7, `DENSITY_POWER` 3.75, `DENSITY_SCALE` 2.5, `SUB_DENSITY_SCALE` 10, `SUB_DENSITY_MIDPOINT` 0.52, `SUB_DENSITY_STEEPNESS` 50 — all function-local | `craftPenalty` only |
| `scarcityPenalty(sceneCount)` | `SCARCITY_SCALE` 140 — function-local | `craftPenalty` only |
| `craftPenalty(bySeverity, sceneCount, wordCount)` | nothing of its own | `computeRawCraftScore` only |
| `computeRawCraftScore(...)` (exported) | nothing of its own | `computeHealthScore`, `buildDimensions` (`rawScore`), `aggregateReport` (`rawHealth`), `calibration/reference.ts`'s `scoreSample` (twice), `tests/core/calibration.test.ts`, `scripts/measure-rule-channel-evidence.ts` |

None reads module-level state in `doctor.ts`; there is nothing to carry.
`dimensionDensityPenalty` / `computeDimensionRawScore` / `computeDimensionScore`
and `computeHealthScore` are NOT on `computeRawCraftScore`'s call path and stay
in `doctor.ts` (`computeHealthScore` now calls the leaf's function through an
import). The whole "Opportunity-based craft penalty (saturation fix)" design
comment (the ~150-line block that sat above `densityPenalty`) moved with the
functions, since it documents them.

Verbatim was verified, not asserted: the 209 + 47 lines were extracted from
`doctor.ts` by line range with `sed`, and `diff` of that text against the leaf
minus its header shows exactly four `export` keywords and three doc-comment
sentences (the ones that said "this function is on the doctor.ts <->
reference.ts import cycle" in the present tense; they now say what was true
and what is). Bodies are byte-identical, unreformatted and unreordered — so
the feature-length candidate's three edits inside these functions
(`SUB_DENSITY_STEEPNESS` 50 -> 2, `SCARCITY_SATURATION_SCENES` in
`scarcityPenalty`, the `subDensityCurve` + hoisted `logistic` declarations)
port onto the leaf as a mechanical conflict, and the candidate's
`sceneTermSaturationScenes`, which calls `scarcityPenalty` from `doctor.ts`,
can import it from the leaf, which exports it.

## 3. The import graph, before and after

Measured with `scripts/lib/import-graph.mjs`'s `computeReachableSet` — the
receipt gate's own walker, so "reachable" means what the gate means.

```
BEFORE (bafffb69)
  reference.ts  -> 68 files, INCLUDING doctor.ts   (doctor.ts -> reference.ts -> doctor.ts: a cycle)
  doctor.ts     -> 68 files
AFTER (e2e8a5d9)
  craft-formula.ts -> 1 file: itself                (imports nothing)
  reference.ts     -> 60 files, EXCLUDING doctor.ts (reaches craft-formula.ts)
  doctor.ts        -> 69 files, reaching both, one-directionally
```

`reference.ts` imported nothing else from `doctor.ts` — `computeRawCraftScore`
was its only import from that file — and nothing in its remaining closure
(`revision/pipeline.ts`, `revision/rewrite.ts`, `fountain-analyzer.ts`,
`lib/logger.ts`, `corpus.ts`, `types.ts`) reaches `doctor.ts`, so no cycle
remains on the corpus-build path. `tests/core/craft-formula-leaf.test.ts`
(3/3) pins all three lines of the AFTER block and asserts `doctor.ts`'s
re-export is the leaf's binding by identity (`fromDoctor === fromLeaf`).

The leaf lives inside `server/nvm/analyze/`, so `tests/core/pure-core-boundary.test.ts`'s
`CORE_ALLOWLIST` needed no entry (6/6), and it is reachable from `doctor.ts`,
so the receipt gate classifies it scoring-path (tier 2) — which is correct.

## 4. The two probes, and the control

Each probe was applied to the leaf by a scripted exact-match replacement, run
against both tests, and reverted from a byte copy; `git status --short` was
empty before the identity snapshot and before every commit.

| run | edit | `doctor-calibration-under-tsx` | `calibration` |
|---|---|---|---|
| clean | — | 1/1 | 25/25 |
| **probe (a)** | module-level `const PROBE_MODULE_LEVEL_SCARCITY_SCALE = 140` in the leaf, read by `scarcityPenalty` (previously the TDZ failure) | **1/1 PASS** | **25/25 PASS** |
| **probe (b)** | `const sig = (x: number) => x` inside `densityPenalty`, wrapping `weightedIssues` (previously the `__name` failure under tsx) | **1/1 PASS** | **25/25 PASS** |
| clean, restored | — | 1/1 | 25/25 |
| **control** | probe (a)'s exact edit applied to `doctor.ts` in the `bafffb69` baseline tree (pre-move layout) | **0/1 — fails by name**: `main thread: reference distribution holds 0 of 20 corpus samples — buildDistribution() threw and was swallowed into emptyDistribution()` | 25/25 (see below) |

Probe (b) went into `densityPenalty` because this tree has no
`subDensityCurve` — that function exists only on the feature-length candidate;
`densityPenalty` carries the logistic inline here — and it is the placement
the production-loader-guard lane's fail-first probe used.

The control's swallowed error, captured by a direct probe that imports
`doctor.ts` first and prints the distribution size:

```
"error":"ReferenceError: Cannot access 'PROBE_MODULE_LEVEL_SCARCITY_SCALE' before initialization"
distribution=0
```

— under BOTH `tsx` and `node --experimental-strip-types`. The TDZ hazard is a
language mechanism and never depended on the loader; only its `__name` twin is
tsx-specific. Two readings follow. First, the hazard was real on the baseline
and is gone on the leaf: same edit, same tests, fail then pass. Second,
`calibration.test.ts` passed 25/25 on the control tree — it imports
`reference.ts` before `doctor.ts`, so it enters the cycle from the side that
works — which means it alone could never see either hazard; the tsx guard,
which loads `doctor.ts` first, is the instrument, and it stays in `npm test`.
The baseline tree's `doctor.ts` was restored from a pristine byte copy and
`cmp`-verified after each control run.

## 5. What was deliberately not done

- **Moving `computeHealthScore`, `dimensionDensityPenalty` or the dimension
  score functions.** They are not on `computeRawCraftScore`'s path, and the
  brief is the corpus-build cycle, not a reorganisation of `doctor.ts`.
- **Dropping the function-local-constant style in the leaf.** It is kept as
  convention (belt and braces): the structural fix holds only while the leaf
  stays import-free, and the style costs nothing. The leaf test is what
  enforces "import-free"; the style is what makes an accidental import
  survivable.
- **Retiring the tsx guard test.** It still runs on every `npm test`; §4 shows
  it is the only test that sees either hazard.
- **Re-locking anything.** No floor, manifest or split moved; nothing to
  re-lock.

## 6. Gates

| check | result |
|---|---|
| `scripts/check-doctor-output-identity.mjs --compare` vs `git archive bafffb69`, `GIT_SHA=dev` both sides | `OUTPUT IDENTITY: PASS — all 45 reports are byte-identical (analyzedAt excluded)` |
| `tests/core/public-benchmark.test.ts` | 28/28 — 0.5313 / 0.5586, 0.4063 / 0.4443, 1.0000 / 0.9473; 17/15/0, 8/14/10, 32/0/0; no floor moved, none re-locked |
| `tests/core/doctor-calibration-under-tsx.test.ts` | 1/1 clean; 1/1 under probe (a); 1/1 under probe (b); 0/1 control on the baseline tree — §4 |
| `tests/core/calibration.test.ts` | 25/25 (all five runs) |
| `tests/core/craft-formula-leaf.test.ts` (new) | 3/3 |
| `tests/core/pure-core-boundary.test.ts` | 6/6, no allowlist change |
| `tests/core/script-doctor.test.ts` | 86/86 |
| `tests/core/blind-pairs-discrimination.test.ts` | 4/4 |
| `tests/core/doctor-worker-pool.test.ts` | 9/9 |
| `tests/core/doctor-history-identity.test.ts` | 35/35 |
| `tests/core/discrimination.test.ts` · `tests/core/rebuild-experiment.test.ts` (direct importers of the moved function) | 14/14 · 41/41 |
| `tests/core/honesty-audit-claims.test.ts` | 15/15 after `CLAIMS_REGISTER.md` row 22 re-anchored 2092-2093 -> 1862-1863 (it failed by name — `claims-register-line-anchor-mismatch` — before the re-anchor) |
| `tests/core/docs-gating-set.test.ts` | 8/8 |
| `npm run lint` | 0 |
| `npm run check-no-console` | 0 (313 files, 3 quarantine entries, all proven unreachable) |
| `node scripts/check-scoring-receipt.mjs bafffb69..HEAD` | see the lane's receipt commit |
| `npm run brain && npm run check-brain` · `tests/core/brain-coverage.test.ts` | see the lane's final commit |

### Missed by the move (`lane/owner-measure-leaf-path`, 2026-09-21)

The move's import-grep found every importer of the moved functions and missed
one SOURCE-TEXT patcher: `tests/scripts/owner-measure-e2e.test.ts` builds its
three fixture branches by rewriting `const SCARCITY_SCALE = 140;` (-> 152 /
133 / 161) in `server/nvm/analyze/doctor.ts`, and its `before` hook asserted
that line still existed — it no longer did — cancelling all 23 subtests of the
first `describe` (the full suite's only failure at `846b8bf7`: 14,609 tests,
23 cancelled). Repointed at `server/nvm/analyze/craft-formula.ts` through one
`bumpScarcityScale(tree, to)` helper, so all three sites now carry the
existence assertion (only the first did before). The leaf is in `doctor.ts`'s
reachable set (`computeReachableSet` from `doctor.ts`: 69 files, the leaf
among them), so the fixture's edit is still a tier-2 scoring-path change and
the test still exercises the receipt gate it is about. Result:
`owner-measure-e2e.test.ts` 56/56, 0 cancelled.

The same grep could not see prose either. Fourteen "this lives in doctor.ts"
sentences were corrected in place, line counts preserved because
`docs/CLAIMS_REGISTER.md` anchors line numbers in three of the files:
`tests/core/script-doctor.test.ts` (5 comment lines), `tests/core/calibration.test.ts`
(6), `tests/core/discrimination.test.ts` (2), `tests/core/public-benchmark.test.ts:352`,
`scripts/lib/auc.ts:163` and `scripts/lib/public-benchmark.ts:253-254`
(`doctor.ts:465-467` / `:657` -> `craft-formula.ts:254-257` / `:286`).
Verified after: `honesty-audit-claims` 15/15, `script-doctor` 86/86,
`calibration` 25/25, `discrimination` 14/14, `public-benchmark` 28/28,
`craft-formula-leaf` 3/3, `npm run lint` 0,
`node scripts/check-scoring-receipt.mjs 846b8bf7..HEAD` — no scoring-path
file changed. Dated audits and measurement docs that cite the old
`doctor.ts` lines were left as written.

Still stale after this lane, deliberately: commit `36433b75` corrected the
-230 shift of UNMOVED `doctor.ts` code in CLAUDE.md (`:2092-2093` ->
`:1862-1863`, `:2127-2131` -> `:1897-1901`) but the old numbers remain in
`scripts/lib/auc.ts:210`, `scripts/lib/public-benchmark.ts:256` and its
PRINTED limits text at `:829`, `tests/core/public-benchmark-limits.test.ts:16,85,95`
(whose regex pins that printed text), `scripts/check-scoring-receipt.mjs:140`,
and the brain notes `00 Home.md:33`, `Generation - Story Bench.md:147`,
`Gate - Public Benchmark.md:89`. That is one coordinated change (printed
string, test regex, notes, graph regen), not the moved-code repoint this lane
was scoped to.

Nothing was pushed. The full `npm test` is the orchestrator's run.
