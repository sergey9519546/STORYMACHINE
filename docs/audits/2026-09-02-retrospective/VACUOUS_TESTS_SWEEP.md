# Vacuous-test sweep — 2026-09-02

The 2026-09-02 retrospective observed that a number of tests under `tests/`
assert only that a value is in `[0, 1]`, that a string is non-empty, that a call
does not throw, or wrap their single assertion in an `if (...)` with no `else`.
Such a test passes against a frozen constant, an abstaining analyzer, or a
detector that has stopped firing — it cannot fail for the reason it exists.

This sweep converted every one of them into a **behavioural** test: a positive
fixture paired with a negative one, an ordering assertion, or a
trigger-fires-**and**-points-at-the-right-thing assertion. No test was deleted
and no assertion was weakened; the original range/type checks were kept and
strengthened around.

## Method

A scanner (`scan.mjs`, written for this sweep and kept in the session
scratchpad, not committed) parses every `*.test.ts` the suite actually
COLLECTS — the `TEST_ROOTS` and `TEST_FILES` of `scripts/run-tests.mjs`, minus
its `NOT_RUN` list — and classifies each `it`/`test` block by its assertions.
It brace-matches call bodies, skips string, comment and **regex literals**
(without which `assert.match(x, /\)/)` closes its enclosing call early and whole
blocks are misread), and treats calls to locally-defined helpers whose own body
asserts (`near`, `assertRejectedWithoutMutation`, …) as assertions.

A block is counted **STRICT vacuous** when every assertion in it is one of:

| pattern | why it proves nothing |
| --- | --- |
| `no-assertions` | the block cannot fail at runtime |
| `all-guarded` | every assertion sits inside an `if (...)` with no `else` |
| `range-only` | `x >= LOW && x <= HIGH` — true of any frozen constant in range |
| `nonempty-only` | `.length > 0` — true of one garbage element |
| `typeof-only` | `typeof x === 'number'` — true of `NaN`, of a stale value |
| `isArray-only` | `Array.isArray(x)` — true of `[]` |
| `nonneg-only` / `trivially-true-length` | `x >= 0`, `.length >= 0` |
| `doesNotThrow` | true of a function that returns nothing useful |
| `ok(true)` | a comment wearing an assertion's clothes |

Blocks explicitly marked `{ todo: … }` or `{ skip: … }` are **not** counted:
those exclusions are documented and deliberate rather than accidental (see
"Deliberate exceptions" below).

`assert.ok(x)` on a boolean the code under test computed is falsifiable but
thin; it is reported as **ADVISORY** and was not treated as vacuous.

Baseline is the branch's merge base, `db8b7a88`, extracted with `git archive`
and scanned with the same final scanner as the result, so the two columns are
comparable.

## Before / after

Scanned: **10,446** `it`/`test` blocks across the collected suite.

| file | before | after |
| --- | --: | --: |
| `tests/core/core-01.test.ts` | 19 | 0 |
| `tests/core/core-02.test.ts` | 17 | 0 |
| `tests/core/core-03.test.ts` | 5 | 0 |
| `tests/core/dialogue-info-ratio.test.ts` | 4 | 0 |
| `server/nvm/analyze/temporal-consistency.test.ts` | 3 | 0 |
| `tests/core/story-graph.test.ts` | 3 | 0 |
| `tests/core/anti-slop.test.ts` | 2 | 0 |
| `tests/core/calibration.test.ts` | 2 | 0 |
| `tests/core/excellence-signals.test.ts` | 2 | 0 |
| `tests/core/projection-richness.test.ts` | 2 | 0 |
| `tests/core/psychology-cascade.test.ts` | 2 | 0 |
| `tests/core/script-doctor.test.ts` | 2 | 0 |
| `tests/core/storyop-taxonomies.test.ts` | 2 | 0 |
| `evals/scoring/contracts/human-label-import.test.ts` | 1 | 0 |
| `evals/scoring/rubric/tssf-rubric.test.ts` | 1 | 0 |
| `tests/core/l37-l38.test.ts` | 1 | 0 |
| `tests/core/narrative-metrics.test.ts` | 1 | 0 |
| `tests/core/page-estimate-realism.test.ts` | 1 | 0 |
| `tests/core/story-graph-act-swap-demo.test.ts` | 1 | 0 |
| `tests/core/story-graph-corpus-auc.test.ts` | 1 | 0 |
| `tests/core/story-vector.test.ts` | 1 | 0 |
| `tests/core/structure-presets.test.ts` | 1 | 0 |
| **TOTAL** | **74** | **0** |

22 files, 74 vacuous blocks rewritten. Advisory (thin but falsifiable) count is
unchanged at 85 in both columns — those were deliberately left alone.

Every rewritten block carries a `// BEHAVIOURAL (2026-09-02 vacuous-test sweep)`
comment stating what the old assertion could not catch.

Two tests were **renamed**, because the old name asserted something the test did
not (and, as it turns out, the code does not) do:

- `rewatchRecommended is true when rewatch score > 70` →
  `rewatchRecommended tracks the rewatch score across the 70 threshold`
  (`tests/core/core-01.test.ts`).
- `marks natural dialogue as lower-ratio (not exposition-risk)` →
  `scores natural dialogue with a mix of risk and non-risk turns (does NOT
  separate it from the info-dump)` (`tests/core/dialogue-info-ratio.test.ts`).

## KNOWN WEAKNESS findings

Making the assertions real exposed six places where the production behaviour is
wrong or degenerate. Per the sweep's rules, **no scoring-path production code
was changed** (`scripts/check-scoring-receipt.mjs` defines that set, and a
change there would require a `measure-real` receipt). Each test now asserts the
behaviour as MEASURED, with a `// KNOWN WEAKNESS:` comment saying what a correct
implementation would do.

1. **`isolatedScenes` flags every scene of nearly every script.**
   `server/nvm/analyze/story-graph.ts:280-282` counts only `causal` and
   `character-arc` edges. `causal` edges are only ever emitted between promise
   nodes (`story-graph.ts:176-182`), never between scene nodes, and
   `character-arc` edges need two scenes to share a `relationshipShift` pairKey,
   which does not fire on ordinary two-hander dialogue. The metric does not
   discriminate connected scripts from disconnected ones.
   → `tests/core/story-graph.test.ts` ("identifies isolated scenes").

2. **`twistImpact` is inert on ordinary prose.** It is gated on a scene
   record's `revelation` field (`server/nvm/analyze/metrics.ts:360`), which the
   fountain analyzer does not populate for a line like "A hidden note reveals
   the truth. It was you all along." — so it reads 0 for every scene of the
   multi-scene fixture, including the one that is literally a reveal.
   → `tests/core/script-doctor.test.ts` ("every score is within its documented
   range").

3. **`analyzeDialogueInfoRatio` scores natural dialogue as MORE
   exposition-heavy than an info-dump.** The ratio is a new-content-word rate,
   not an exposition rate, so short question-and-answer dialogue that keeps
   introducing fresh nouns outscores a deliberate info-dump (11/18 ≈ 0.611 vs
   0.5 on this file's own fixtures), and both scenes are reported as
   exposition-heavy.
   → `tests/core/dialogue-info-ratio.test.ts`.

4. **Corpus vectors lose issue volume entirely.** `vectorizeFromIssues`
   L2-normalises, so a single-rule script becomes the unit vector `[1]` however
   many times the rule fired. Six fixtures differing only in issue count
   (1..6) produce six byte-identical vectors; `clusterCorpus(v, 2)` puts all six
   in cluster 0, leaves cluster 1 empty, and both inertias are 0.
   → `tests/core/story-vector.test.ts` ("should compute inertia").

5. **`rewatchRecommended` is unreachable on any fixture in the suite.** The
   deliberately maximal fixture — dramatic irony, audience investment 90, a
   planted clue and a paid-off setup — scores 51 against a threshold of 70.
   Either the threshold is above what the scorer can reach on realistic input,
   or the rewatch score under-weights irony and payoff.
   → `tests/core/core-01.test.ts`.

6. **Four X1 action verbs export identically.** `REVEAL`, `BETRAY`, `PROTECT`
   and `FORM_ALLIANCE` all render as `ALICE / (to Bob) / <content>` in
   `server/lib/fountain.ts`; only `THREATEN` carries a distinguishing
   parenthetical. A reader of the exported fountain cannot recover which verb
   the simulation chose. (Not scoring-path, but changing the export format is a
   product decision, not a test fix.)
   → `tests/core/core-01.test.ts`.

## Deliberate exceptions (not counted, not changed)

- `tests/core/pipeline-parallel.test.ts` — "reports sequential vs parallel
  wall-clock time" is marked `{ todo: … }` with a written rationale: it is an
  informational latency report that deliberately asserts nothing about relative
  speed and is excluded from the suite's pass total. Documented, not accidental.
- `tests/apdl.test.ts`, `tests/story-vector.test.ts` and the quarantined
  `server/nvm/**/__tests__` files are in `run-tests.mjs`'s `NOT_RUN` list and
  are outside the scan by construction.

## What remains

- **85 ADVISORY blocks** (unchanged by this sweep) whose only assertions are
  `assert.ok(x)` on a computed boolean. These CAN fail, so they are not vacuous,
  but most would be stronger if they also pinned what the boolean was computed
  from. Largest concentrations: `tests/core/core-02.test.ts` (20),
  `tests/core/core-01.test.ts` (9), `tests/core/core-03.test.ts`.
- **The scanner is not wired into CI.** Nothing prevents a new vacuous test from
  landing. Turning `scan.mjs` into a committed `scripts/` gate with a
  ratchet at 0 STRICT is the obvious follow-up; it was out of scope here.
- **The six KNOWN WEAKNESS findings are recorded, not fixed.** Five of the six
  sit on the scoring path and need a `measure-real` receipt before the
  behaviour can change.

## Gates

| gate | exit code |
| --- | --: |
| `npm run lint` (`tsc --noEmit`) | 0 |
| `npm test` — 10,996 tests, 0 failures, 85 skipped, 1 todo | 0 |
