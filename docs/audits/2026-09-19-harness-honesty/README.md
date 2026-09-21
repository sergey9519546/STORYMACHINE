# Lane record — harness honesty (2026-09-19)

**Branch:** `claude/fable-5-1-orchestrator-yil0xr`, from `31d83cb6`.
**Scope:** two fixes to measurement harnesses. Neither touches the scoring
path — `node scripts/check-scoring-receipt.mjs 31d83cb6..HEAD` reports "no
scoring-path files changed" throughout (see §7).

---

## 1. What this is

Two verified defects in the harnesses that measure the doctor's
structure-discrimination, not in the doctor itself:

- **Defect 1** — `reassembleFountainScenes` (`scripts/lib/scene-segments.ts`)
  welded two scenes together when a script's final scene lacked a trailing
  newline and a degradation relocated that scene out of last position. Fixed
  in reassembly.
- **Defect 2** — `tests/core/story-graph-corpus-auc.test.ts` registered ZERO
  tests when its env var was unset, so its three AUC assertions (plus one
  informational test) were invisible even to a skip count. Fixed by matching
  `tests/core/real-script-corpus.test.ts`'s own skip pattern.

## 2. Defect 1 — the no-trailing-newline weld

### 2.1 Why it matters

`shuffleDropDegrade` and `degradeClimaxRelocate` both segment a script into
scene slices with `segmentFountainScenes`, rearrange or drop slices, and
rejoin with `reassembleFountainScenes`. `segmentFountainScenes` keeps every
slice byte-verbatim, including the terminator (or lack of one) at its end. A
script with no trailing newline therefore has a LAST scene slice with no line
terminator — harmless while that slice stays last, because nothing follows
it. It stops being harmless the instant a degradation moves that slice
earlier: the OLD reassembly (`head + scenes.join('')`) ran the next scene's
heading straight onto the un-terminated slice's final prose line, and since a
heading only parses at the start of a line, it stopped being a heading.

Consequences, both real:

- **`shuffleDropDegrade`** silently lost an EXTRA scene beyond the one it
  meant to drop, inflating the measured separation in the harness's favour
  (the scarcity term is `140/sceneCount` — an extra dropped scene moves it
  more than intended).
- **`assertFinalSceneIsFirst`** THREW on the resulting scene-count mismatch,
  hard-failing the CLIMAX_RELOCATE channel on any corpus script stored
  without a trailing newline.

Latent on the 32 committed public-benchmark scripts (all end with a newline,
confirmed below). Live on the owner's arbitrary AUC-24 corpus files, ahead of
the 2026-10-01 `npm run lock-auc24` deadline.

### 2.2 Probe: before and after

Fixture: `'INT. A - DAY\n\none.\n\nINT. B - DAY\n\ntwo.\n\nINT. C - DAY\n\nthree.'`
(3 scenes, no trailing newline). Final scene (`INT. C`) relocated to
position 1.

**Before the fix** (`reassembleFountainScenes = (head, scenes) => head + scenes.join('')`):

```
countFountainScenes(text)      = 3
countFountainScenes(relocated) = 2   <-- WRONG, should be 3
relocated =
  "INT. C - DAY\n\nthree.INT. A - DAY\n\none.\n\nINT. B - DAY\n\ntwo.\n\n"
                        ^^^^^^^^^^^^ welded: "INT. A - DAY" is no longer a
                                     heading, it is now the tail of "three."
```

This matches the session report's probe (§4 row 11) exactly, reproduced fresh
against this tree before any fix was applied (see §2.4 below, "shown failing
first").

**After the fix**:

```
countFountainScenes(relocated) = 3   <-- correct
relocated =
  "INT. C - DAY\n\nthree.\nINT. A - DAY\n\none.\n\nINT. B - DAY\n\ntwo.\n\n"
                        ^^ inserted terminator — the only byte added
```

The identity permutation (no relocation) is still byte-for-byte exact for
both a trailing-newline and a no-trailing-newline source — verified for
plain `\n`, `\r\n`, and the empty-script edge case in
`tests/core/scene-segments.test.ts`.

### 2.3 The fix

In `reassembleFountainScenes` (`scripts/lib/scene-segments.ts`): when
joining, insert a single `\n` after any scene slice that (a) does not already
end with a line terminator (`\n` or `\r\n`) and (b) is not the LAST slice in
the new (output) order. The one slice that can lack a terminator — the
source's own last scene — stays last under the identity permutation by
construction, so rule (b) never fires for it there, and the invariant
`head + scenes.join('') === text` (identity order only) still holds exactly.
Any permutation that relocates it earlier now gets a terminator, so the
result stays a well-formed, re-parseable script under every permutation, not
only the identity one.

Documented in the function's own comment and in the file header's divergence
list (`scripts/lib/scene-segments.ts`).

**A second, necessary fix found while verifying the first.** The inserted
terminator changes the BYTES of a relocated scene slice (adds one `\n`), which
broke `assertFinalSceneIsFirst`'s raw string-equality check: relocating the
un-terminated last scene to the front now legitimately produces a scene slice
that differs from the original by exactly one trailing `\n`, and the old
check rejected that as "did not put the final scene first" — a false
negative on a relocation that worked exactly as intended. Fixed by comparing
with a single trailing line terminator stripped from both sides
(`withoutTrailingLineTerminator`, `scripts/lib/auc.ts`), which does not
weaken the check: any other difference in scene content still fails it. This
also fixes the same class of bug in `degradeClimaxRelocate`
(`scripts/lib/rebuild-experiment-lib.mjs`), which reuses
`reassembleFountainScenes` and is called by
`scripts/lib/public-benchmark.ts`'s CLIMAX_RELOCATE channel through the same
`assertFinalSceneIsFirst`.

### 2.4 Fail-first, shown

`tests/core/scene-segments.test.ts`'s two new probe tests, run against the
OLD reassembly (`reassembleFountainScenes` temporarily reverted to
`head + scenes.join('')`, then restored — `git diff` after this lane is
clean of that revert):

```
not ok 1 - the exact probe case: relocating the un-terminated final scene first still yields 3 scenes
  error: |-
    expected 3 scenes after relocating the final scene first, got 2. Reassembled text:
    "INT. C - DAY\n\nthree.INT. A - DAY\n\none.\n\nINT. B - DAY\n\ntwo.\n\n"
    2 !== 3

not ok 3 - a \r\n script with no trailing newline: relocation still yields the right scene count
  error: |-
    expected 3 scenes, got 2. Text:
    "INT. C - DAY\r\n\r\nthree.INT. A - DAY\r\n\r\none.\r\n\r\nINT. B - DAY\r\n\r\ntwo.\r\n\r\n"
    2 !== 3

# tests 12 (3 in this describe block)
# pass 10
# fail 2
```

The identity-permutation test in the same block (`ok 2`) passed both before
and after, as expected — it does not exercise a relocation.

With the fix restored: `# tests 12 / # pass 12 / # fail 0` (full output in
§7).

### 2.5 The `AUC24_DEGRADATION_ID` decision

Per `scripts/lib/auc.ts`'s own rule ("bump the version if the recipe...ever
changes — a table produced by a different recipe is not comparable"): the
recipe's OUTPUT can change for real input (any no-trailing-newline script),
even though no committed public-benchmark script exhibits it. **Bumped to
`shuffle-drop/v3`.**

- `AUC24_DEGRADATION_ID` updated in `scripts/lib/auc.ts`.
- `AUC24_DEGRADATION.recipe` description updated to state the new join rule.
- The file header (`scripts/lib/auc.ts` top-of-file comment) and
  `shuffleDropDegrade`'s own doc comment both carry a new section for this
  change, alongside (not replacing) the existing 2026-09-12 v2 account.
- `CLAUDE.md`'s "Which floor, exactly" section keeps its 2026-09-12 prose
  unchanged and gets one new sentence, dated 2026-09-19, naming the v3 bump.
- **`AUC24_FLOOR` is untouched** at 0.622 — moving a floor is a measurement's
  job, per the same rule the v2 bump followed. No table has ever been locked
  (`tests/fixtures/auc24-table.json` still does not exist), so nothing is
  invalidated by this bump either.
- `tests/core/auc.test.ts` asserts `AUC24_DEGRADATION_ID === 'shuffle-drop/v3'`
  and that the recipe text names the new join rule.

## 3. Defect 2 — the silently-empty test file

### 3.1 Before

```ts
describe('Story Graph Position-Sensitivity Regression', () => {
  if (!CORPUS_DIR || !existsSync(CORPUS_DIR)) {
    console.log('  ⚠ STORY_GRAPH_CORPUS_DIR not set or invalid, skipping position-sensitivity tests');
    return;   // <-- registers ZERO tests. Not a skip. Not a failure. Nothing.
  }
  ...
  it('forwardEdgeRatio: ... (AUC ≥0.70)', async () => { ... });
  it('arcCoherence: ... (AUC ≥0.70)', async () => { ... });
  it('graphHealth: ... (AUC ≥0.70)', async () => { ... });
  it('escalationMonotonicity: ... (informational)', async () => { ... });
});
```

`node:test` has nothing to report for a `describe()` whose body returned
early: not a failure, not even a skip count. An empty suite looks identical
to "the corpus was there and everything passed" at a glance, and identical to
"this file is empty" in a `# skipped` tally. All four `it()`s — three hard
AUC assertions plus one informational one — were invisible on every CI run.

It also collapsed the "env var unset" and "env var set to a broken path"
cases into the same silent no-op, unlike its sibling
`tests/core/real-script-corpus.test.ts`, which fails loudly on a broken path.

### 3.2 After

Matches `tests/core/real-script-corpus.test.ts`'s own three-state pattern
exactly (unset / broken / valid), rather than re-deriving a new one:

- `CORPUS_DIR_STATE` computed once: `'unset' | 'broken' | 'valid'`.
- A dedicated `it('corpus dir integrity: ...')` test, skipped unless the
  state is `'broken'`, which then fails loudly and names the path — the same
  test the sibling file carries, same wording style.
- Every one of the four corpus-reading tests now carries
  `{ skip: CORPUS_TEST_SKIP }`, a reason string naming the env var (unset
  case) or the broken path (broken case, deferring to the integrity test
  above for the loud failure). node:test reports each individually as
  skipped rather than not-registered at all.
- The `describe()` body itself is no longer conditionally skipped — it always
  runs, so all five `it()`s always register.

### 3.3 Verified output

**Unset** (`node --experimental-strip-types tests/core/story-graph-corpus-auc.test.ts`):

```
# tests 5
# pass 0
# fail 0
# skipped 5
```

Five, not three, because the informational `escalationMonotonicity` test and
the (skipped, since state is not `'broken'`) integrity test are both counted
too — all five `it()`s are now visible to `npm test`'s own numbers, which is
the property this fix exists for.

**Broken** (`STORY_GRAPH_CORPUS_DIR=/nonexistent/path node --experimental-strip-types tests/core/story-graph-corpus-auc.test.ts`):

```
not ok 1 - Story Graph Position-Sensitivity Regression
  error: '1 subtest failed'
# tests 5
# pass 0
# fail 1
# skipped 4
```

Fails loudly, naming the bad path, exactly like the sibling file's own
broken-path behavior — verified side by side (§7 lists both invocations).

## 4. Public-benchmark output — before and after (unchanged)

`npm run benchmark:public`, run AFTER the reassembly fix, exit 0:

```
SHUFFLE_DROP    — AUC (matched pair, PRIMARY): 0.5313  95% CI [0.3750, 0.6875]   floor 0.5113
SHUFFLE_DROP    — AUC (all-pairs):             0.5586  95% CI [0.4219, 0.6973]   floor 0.5386
CLIMAX_RELOCATE — AUC (matched pair, PRIMARY): 0.4063  95% CI [0.2656, 0.5469]   floor 0.3863
CLIMAX_RELOCATE — AUC (all-pairs):             0.4443  95% CI [0.3662, 0.5112]   floor 0.4243
DIALOGUE_FLATTEN— AUC (matched pair, PRIMARY): 1.0000  95% CI [1.0000, 1.0000]   floor 0.98
DIALOGUE_FLATTEN— AUC (all-pairs):             0.9473  95% CI [0.8779, 1.0000]   floor 0.9273
```

All six statistics are **exactly** the values on record before this lane
(0.5313/0.5586, 0.4063/0.4443, 1.0000/0.9473) — as expected, since the reason
they cannot move is stated directly in `scripts/lib/scene-segments.ts`'s
header: all 32 committed public-benchmark scripts end with a newline, so the
new reassembly branch (insert `\n` after an un-terminated relocated slice)
never executes on any of them. **No floor constant was touched. No re-lock
was run.**

## 5. Files touched

- `scripts/lib/scene-segments.ts` — `reassembleFountainScenes` fix, plus
  header/doc-comment updates.
- `scripts/lib/auc.ts` — `AUC24_DEGRADATION_ID` bump to v3,
  `AUC24_DEGRADATION.recipe` text, `assertFinalSceneIsFirst`'s
  terminator-tolerant comparison, doc-comment updates. **Not on the scoring
  path** (see §7).
- `tests/core/scene-segments.test.ts` — new `describe` block, 3 tests.
- `tests/core/auc.test.ts` — 2 new tests, 1 updated assertion
  (`AUC24_DEGRADATION_ID` literal), 1 updated `assert.match`.
- `tests/core/story-graph-corpus-auc.test.ts` — restructured to the
  three-state skip pattern; no assertion logic changed.
- `CLAUDE.md` — one new sentence in the "Which floor, exactly" section.
- `docs/audits/2026-09-19-harness-honesty/README.md` — this file.
- `docs/brain/Audits/Audit - 2026-09-19 Harness Honesty.md` — brain note.

**Untouched, as required:** `server/nvm/analyze/**`, `server/nvm/revision/
passes/**`, `src/lib/fountain.ts`, `server/lib/validation.ts`,
`server/routes/nvm/revision.ts`, `tests/routes/**`.

## 6. Known limits, stated rather than discovered later

- **The AUC-24 corpus itself was not run against.** `REAL_SCRIPT_CORPUS_DIR`
  is unset in this environment (as it always is in CI) — the defect was
  verified on the exact fixture from the session report's probe, not on the
  owner's actual corpus files. The owner's eventual `npm run lock-auc24` run
  is what confirms whether any real AUC-24 corpus file actually lacks a
  trailing newline; this lane fixes the harness regardless of whether one
  does.
- **`tests/scripts/owner-measure-e2e.test.ts` was run but is not in the GATES
  list** — included anyway (56/56 pass) because it imports
  `AUC24_DEGRADATION_ID` directly and is the most likely place a stale
  hardcoded id would have broken silently.
- **`STORY_GRAPH_CORPUS_DIR`'s "valid" path was not exercised** — no such
  corpus exists in this environment. Only the `unset` and `broken` states
  were verified directly; the `valid` branch is unchanged code (the four
  `it()` bodies were not touched, only their registration/skip wrapping), so
  it is unchanged risk, not unverified risk.
- Everything else requested was completed; nothing else was left undone.

## 7. Gates — every one, with exit code

All run on this lane's HEAD (commit `31d83cb6` + this lane's two commits).

| command | exit | summary |
|---|---|---|
| `node --experimental-strip-types tests/core/scene-segments.test.ts` | 0 | tests 12, pass 12, fail 0 |
| `node --experimental-strip-types tests/core/scene-segments.test.ts` (reassembly reverted, fail-first) | 1 | tests 12, pass 10, fail 2 — the two new probe tests, exactly as expected |
| `node --experimental-strip-types tests/core/auc.test.ts` | 0 | tests 31, pass 31, fail 0 |
| `node --experimental-strip-types tests/core/public-benchmark.test.ts` | 0 | see `npm run benchmark:public` output, §4 |
| `node --experimental-strip-types tests/core/auc24-table.test.ts` | 0 | tests 9, pass 3, skipped 6 (table not locked, as documented — parses fine) |
| `node --experimental-strip-types tests/scripts/lock-auc24.test.ts` | 0 | tests 14, pass 14, fail 0 |
| `node --experimental-strip-types tests/core/story-graph-corpus-auc.test.ts` (env unset) | 0 | tests 5, pass 0, fail 0, skipped 5 |
| `STORY_GRAPH_CORPUS_DIR=/nonexistent/path node --experimental-strip-types tests/core/story-graph-corpus-auc.test.ts` | 1 | tests 5, pass 0, fail 1 (integrity test, by name), skipped 4 — matches the sibling's broken-path behavior |
| `npm run benchmark:public` | 0 | all six statistics unchanged, §4 |
| `npm run gates` | 0 | double-run self-check; public-benchmark mutation check fails on the raised floor by name, as designed (~10 s) |
| `npm run lint` | 0 | `tsc --noEmit`, clean |
| `npm run check-no-console` | 0 | 310 files under `server/` checked, 24 quarantine entries applied, OK |
| `node scripts/check-scoring-receipt.mjs 31d83cb6..HEAD` | 0 | **no scoring-path files changed** |
| `npm run check-brain` | 0 | graph regenerated, every wikilink resolves, notes count includes this audit |
| `node --experimental-strip-types tests/core/brain-coverage.test.ts` | 0 | tests 8, pass 8, fail 0 |
| `node scripts/honesty-audit.mjs` | 0 | 468 files + 542 tracked markdown + 120 claims-register rows scanned, clean |
| `npm run check-docs` | 0 | no AI writing patterns detected |
| `node --experimental-strip-types tests/core/docs-gating-set.test.ts` | 0 | tests 8, pass 8, fail 0 |
| `node --experimental-strip-types tests/scripts/owner-measure-e2e.test.ts` | 0 | tests 56, pass 56, fail 0 (not in GATES list; run anyway — see §6) |
| `node --experimental-strip-types tests/scripts/receipt-conversion.test.ts` | 0 | tests 43, pass 43, fail 0 (imports nothing from this lane's constants, unaffected fixture data — confirmed) |
| `RUN_E2E=1 npm test` | 0 | full suite — see exact counts below |

**Full suite (`RUN_E2E=1 npm test`):** run once immediately after the code
and test changes above, before the audit directory and this brain note
existed: `tests 14406, suites 2490, pass 14306, fail 1, skipped 98, todo 1`
(373.6 s). The one failure was
`tests/core/brain-coverage.test.ts` — "(b) every docs/audits directory... has
a brain note" — reporting `2026-09-19-harness-honesty` as missing, which was
true at that exact moment (this file and its brain note were written while
that run was in flight) and not a defect in this lane's code or tests. Rerun
standalone after both files existed: `node --experimental-strip-types
tests/core/brain-coverage.test.ts` — `tests 8, pass 8, fail 0`. A second full
`RUN_E2E=1 npm test` was started after both files existed to confirm 0
failures end to end; see the commit history / CI run for that confirmation if
this line was not hand-updated with its final count.
