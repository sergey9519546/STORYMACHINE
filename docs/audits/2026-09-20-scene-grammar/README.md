# Lane record — scene-grammar (2026-09-20)

Branch `lane/scene-grammar`, from `26d930dd`.

Two defects named in `SESSION_REPORT_2026-09-19.md` §4, rows 5 and 6, both
recorded there as VERIFIED:

> **Two scene grammars, and the second one silently disables the only
> feature-scale deduction.** `scenesFromFountain` recognises `INT.`/`EXT.`
> only; on `EST.`/forced-heading scripts `arcIncoherenceDeduction`,
> mirror/pattern/economy/genre signals read 0, undisclosed.

> **Any line starting with `.` is a scene heading.** Fountain's forced heading
> is `.` followed by an alphanumeric; `..`/`...` are not headings.

---

## 1. The inventory: every heading test in the repository, before this change

Found with
`grep -rn "INT\.|EXT\.|EST\." server scripts/lib src/lib --include=*.ts -l`
and a second pass for the forced-heading test
(`startsWith('.')`, `/^\./`). Three groups.

### 1a. Copies of the doctor's own predicate — all now call one function

| file | what it was | what it is now |
|---|---|---|
| `src/lib/fountain.ts:125` | the origin: a 14-prefix regex plus `trimmed.startsWith('.')`, inline in `parseFountain` | `isSceneHeadingLine(trimmed)`, defined at the end of the same file |
| `server/nvm/analyze/screenplay-normalizer.ts:47` | a verbatim copy of that regex plus `startsWith('.')`; its own comment claimed it was "kept BYTE-COMPATIBLE" | calls `isSceneHeadingLine` |
| `server/nvm/analyze/canonical-fountain.ts:52,58` | another verbatim copy of both halves | calls `isSceneHeadingLine` |
| `server/lib/validation.ts:1007,1014` | another verbatim copy, written for the round-5 DoS-guard parity fix, with a comment stating that drift in either direction is unsafe | calls `isSceneHeadingLine` |
| `server/routes/scriptide.ts:437,450` | another verbatim copy, deliberately duplicated because the lane that wrote it was forbidden to touch the scoring path | calls `isSceneHeadingLine` |
| `src/components/editor/incremental-reparse.ts:81` | another verbatim copy, used to bound a backward search | calls `isSceneHeadingLine` |

Five of those six files carried a comment asserting that their copy matched
`parseFountain`. All six had in fact drifted in the same direction, because
all six copied the same `startsWith('.')` defect.

### 1b. The second grammar — the one that saw a different film

| file | what it was | what it is now |
|---|---|---|
| `server/nvm/analyze/scene-split.ts:17` | `scenesFromFountain` — `fountain.split(/^(?=(?:INT\|EXT)\.)/mi)` and a matching filter. Its own header called canonicalising it "a SEPARATE, scoring-gated change" and deferred it | segments on `sceneHeadingLineIndices`, i.e. `parseFountain`'s classification |
| `server/nvm/analyze/doctor.ts:1648` | a thirteenth inline copy of that same split, in `buildAccelerationStrength` | calls `scenesFromFountain` |

`scenesFromFountain` is re-exported by `emotional-arc.ts`, `theme-extract.ts`
and `scene-economy.ts` and imported directly by `mirror-scene.ts`,
`pattern-establishment.ts`, `silence-signal.ts`, `disclosure-ledger.ts`,
`genre-obligation.ts`, `cold-open-promise.ts`, `scene-value-shift.ts` and
`bonding-signal.ts`. All of them changed behaviour on non-`INT.`/`EXT.`
scripts, and none of them needed editing.

`scripts/lib/scene-segments.ts` already used `parseFountain`'s classification
(migrated 2026-09-12). Its two functions `sceneHeadingLineIndices` and
`splitLinesKeepingEndings` were the ONLY copy, and `scene-split.ts` needed
them too, so they moved verbatim into `src/lib/fountain.ts` and
`scene-segments.ts` re-exports them. Its behaviour is unchanged — the
`tests/core/scene-segments.test.ts` suite (12 assertions, including agreement
with `analyzeFountainText(...).sceneCount` on all 32 committed scripts) passes
untouched.

### 1c. Heading tests deliberately NOT changed, and why

These are not scene classifiers, and widening them would be a separate change
with its own measurement:

- `server/nvm/analyze/custody-ledger.ts:32`, `epistemic-ledger.ts:36` — a
  `SLUG` regex in two modules whose own headers describe them as diagnostics
  that are not surfaced. Their regex already accepts `EST.`/`I/E.`/`INT./EXT.`
  and does not accept forced headings.
- `server/nvm/analyze/fountain-analyzer.ts:1691` — a NEGATIVE filter inside
  character-cue detection (`!/^(INT\.|EXT\.|CUT|FADE|SMASH)/`), not a scene
  boundary test. The analyzer's actual scene segmentation is built from
  `parseFountain` blocks and inherits the fix with no edit.
- `server/lib/fountain.ts:61` — an insertion-point finder for
  `wrapSyuzhetFountain`, which writes FLASHBACK markers into generated drafts.
  Changing it changes generated output, not analysis.
- `server/nvm/screenplay/compile.ts:108,124`, `server/lib/breakdown.ts:151`,
  `src/lib/scenario-from-script.ts:103`, `server/lib/page-refs.ts:65`,
  `src/lib/docx.ts:51`, `src/lib/fdx.ts:93`,
  `src/lib/screenplay-layout.ts:111` — slug-prefix strippers and act-marker
  injectors, all operating on lines the parser has already classified.
- `server/nvm/revision/passes/*.ts` — **156 occurrences** of an `INT.`/`EXT.`
  literal across 11 of the 16 pass files (79 in `originality.ts`, 52 in
  `voice.ts`), each a rule-local slug or cue-exclusion test inside the
  generated rulebook. Migrating them is a separate approved change; the
  standing instruction is not to author new rulebook work, and one lane
  rewriting 156 rule-local regexes is not a reviewable diff.

## 2. The change

1. `src/lib/fountain.ts` gains, at its END, `SCENE_HEADING_PREFIX_RE`,
   `FORCED_SCENE_HEADING_RE` (`/^\.(?=[A-Za-z0-9])/`), `isSceneHeadingLine`,
   `sceneHeadingLineIndices` and `splitLinesKeepingEndings`. Line 125 — the
   parser's heading test — is replaced in place by a call, so **not one line
   number in this file moved**, and the twenty-odd `src/lib/fountain.ts:<line>`
   citations elsewhere in the repository (tests, comments, a dated session
   report, a corpus licence) are all still correct. `validation.ts`,
   `scriptide.ts` and `screenplay-normalizer.ts` were balanced the same way
   for the same reason; `doctor.ts`'s edit is one line for one line, so
   `doctor.ts:2092-2093`, `:2104` and `:2127-2131` — cited in `CLAUDE.md`,
   `NORTH_STAR.md`, `ROADMAP.md`, `docs/CLAIMS_REGISTER.md` row 22 and eleven
   other files — did not move either.
2. `scenesFromFountain` segments on `sceneHeadingLineIndices`. Nothing
   downstream changed in logic; the scene LIST changes on scripts with
   non-`INT.`/`EXT.` headings or `...` lines.
3. No formula constant was added to or moved in `doctor.ts`; the two it already
   has in the touched function (`RUN20_ACCEL_MIN_SCENES`) stay where they were,
   function-local, per the temporal-dead-zone gotcha.
4. A one-entry memo was written into `scene-split.ts` (the split now runs a
   full `parseFountain`, and a dozen modules call it with the same text) and
   then REMOVED: on a synthetic 300-scene script, three cold `runScriptDoctor`
   runs each, the measurement was 2427/2619/2339 ms before the change,
   2514/2313/2417 ms after it with the memo, and 2466/2334/2329 ms after it
   without — one distribution. Module-level mutable state on the scoring path
   was not worth keeping on a hunch.

### The one place the grammar is narrower than before

`FORCED_SCENE_HEADING_RE` is `[A-Za-z0-9]`, not a Unicode letter class, so a
forced heading in a non-Latin script (`.МОСКВА`) is not recognised. It was
"recognised" before only in the sense that every `.`-leading line was, `...`
included. Widening it is a scoring change needing its own measurement; it now
has exactly one place to happen.

## 3. Fail-first

`tests/core/scene-grammar.test.ts` and its two fixtures were copied into a
`git archive 26d930dd` checkout of the pre-change tree. The grammar block was
appended to that tree's `src/lib/fountain.ts` so the test's imports resolve,
**without touching its line 125** — the defect under test is untouched there.

| subtest | pre-change | post-change |
|---|---|---|
| (a) `scenesFromFountain` returns the doctor's scene count | `3 !== 16` | pass |
| (a) every slice opens on exactly one heading | `4 !== 1` (one slice held four headings) | pass |
| (a) the arc reaches `ARC_DED_MIN_SCENES` | `3 !== 16` | pass |
| (b) scene count unchanged by a `...` line | `6 !== 5` | pass |
| (b) health unchanged by a `...` line | `5 !== 6` (scene counts differ first) | pass |
| (c) a forced-heading script splits on its forced headings | `0 !== 2` | pass |
| (c) `.INT`, `.THE VOID`, `.2 HOURS LATER` are headings | pass | pass |
| (c) the standard vocabulary is unchanged | pass | pass |
| (d) plain `INT.`/`EXT.` script matches the pre-change snapshot | pass | pass |

7 pass / 6 fail before, 13 pass / 0 fail after. (c) and (d) pass on both trees
on purpose: (c) is the direction guard — a change that stopped recognising real
forced headings would be worse than the bug — and (d) is the equivalence pin.

One existing test pinned the defect and was corrected:
`tests/security/fountain-shape-guard-cue-parity.test.ts:1418` asserted that a
bare `"."` IS a scene heading ("fountain.ts applies no further exclusion on the
forced form"). It now asserts `false`, and three cases were added (`..`,
`...and then nothing.`, `.2 HOURS LATER`). The parity property that suite
exists for is stronger than before: the guard is no longer a mirror of
`parseFountain`'s predicate, it calls it. 670 pass / 0 fail.

## 4. What moved, measured

### Output identity — nothing moved, and here is why that is not luck

`check-doctor-output-identity.mjs --compare` against a `git archive 26d930dd`
baseline, both sides `GIT_SHA=dev`:
**"OUTPUT IDENTITY: PASS — all 45 reports are byte-identical (analyzedAt
excluded)."** **0 of 45 fixtures differ**, so there is no per-fixture
attribution table.

The reason was counted rather than assumed. Across the 41 file-backed fixtures
in that set (20 CC0 screenplays, 20 calibration samples, the P0 sample, and
`tests/fixtures/*.fountain`) there are **0 non-`INT`/`EXT` headings, 0 forced
`.HEADING` lines, 0 `..`-leading lines and 0 space-form `INT `/`EXT `
headings**; the remaining 4 fixtures are synthetic `INT.` headings. The
fixture set cannot see either defect. That is a limit of the instrument, not
evidence of no effect.

### The effect, on inputs the fixture set does not contain

Both measured here, pre-change tree against post-change tree, same script:

- `tests/fixtures/scene-grammar/mixed-headings.fountain` (16 scenes, headings
  `EST.`/`I/E.`/`INT./EXT.`/`.FORCED`): `scenesFromFountain` returned **3**
  before and **16** after, against a `sceneCount` of 16 on both trees. The
  emotional arc went from 3 points to 16, crossing `ARC_DED_MIN_SCENES` = 15.
- A 5-scene script, one `...and then nothing.` line added inside a dialogue
  block: **before**, adding that line moved scenes 5 → 6 and health
  **62 → 37.8**, verdict CONSIDER → PASS. **After**, 5 → 5 and 62 → 62.

### Public benchmark — before → after

`npm run benchmark:public -- --json` on both trees. All six statistics
identical:

| channel | matched-pair | all-pairs | ordered/inverted/tied |
|---|---|---|---|
| `SHUFFLE_DROP` | 0.5313 → 0.5313 | 0.5586 → 0.5586 | 17/15/0 → 17/15/0 |
| `CLIMAX_RELOCATE` | 0.4063 → 0.4063 | 0.4443 → 0.4443 | 8/14/10 → 8/14/10 |
| `DIALOGUE_FLATTEN` (control) | 1.0000 → 1.0000 | 0.9473 → 0.9473 | 32/0/0 → 32/0/0 |

All 32 per-script rows (`sceneCount`, `words`, `health`, `verdict`) came back
byte-identical, so **no floor constant needed to move, `--lock` was not run,
and `scripts/lib/auc.ts` is not in this lane's diff. No floor rose and no
floor fell.**

## 5. Gates

| command | exit | result |
|---|---|---|
| `npm run lint` | 0 | clean |
| `npm run check-no-console` | 0 | 310 files, 23 quarantine entries, OK |
| `npm run check-docs` | 0 | clean |
| `npm run honesty-audit` | 0 | 468 files + 560 markdown + 120 claims rows, clean |
| `npm run check-server-reachability` | 0 | see §6 |
| `npm run build` | 0 | see §6 |
| `npm run gates` | 0 | see §6 |
| `node scripts/check-scoring-receipt.mjs 26d930dd..HEAD` | 0 | see §6 |
| `tests/core/scene-grammar.test.ts` | 0 | 13 pass |
| `tests/core/calibration.test.ts` | 0 | 21 pass |
| `tests/core/public-benchmark.test.ts` | 0 | 28 pass |
| `tests/core/public-benchmark-limits.test.ts` | 0 | 7 pass |
| `tests/core/auc24-table.test.ts` | 0 | 3 pass, 6 skipped (no locked table) |
| `tests/core/real-script-corpus.test.ts` | 0 | 1 pass, 73 skipped (no corpus) |
| `tests/core/story-graph-corpus-auc.test.ts` | 0 | 5 skipped |
| `tests/core/honesty-audit-claims.test.ts` | 0 | 15 pass |
| `tests/core/brain-coverage.test.ts` | 0 | 8 pass |
| `tests/security/fountain-shape-guard-cue-parity.test.ts` | 0 | 670 pass |
| every `tests/core/*.test.ts` named for doctor/scene/fountain/arc/heading | 0 | listed in the lane report |
| all 23 `server/nvm/analyze/*.test.ts` and all `server/lib/*.test.ts` | 0 | 0 failing |
| `tests/routes/scriptide*.test.ts`, `format-unrecognized`, `editor-decorations`, `incremental-reparse` | 0 | 0 failing |

`npm test` in full and `npm run brain` were out of this lane's scope and the
orchestrator runs them.

## 6. What remains for the owner

1. **Re-lock `tests/fixtures/real-corpus-manifest.json`.** The private corpus
   is not present in this environment, so `tests/core/real-script-corpus.test.ts`
   skips (1 pass / 73 skipped). Scene counts change on every corpus script that
   uses an `EST.`/`I/E.`/`INT./EXT.`/forced heading or contains a `...`-leading
   line, and that manifest pins health, verdict and sceneCount per script.
2. **`npm run measure-real` and `npm run lock-auc24`.** No real-corpus figure
   is claimed for this range. The owner's next run on recipe `shuffle-drop/v3`
   produces the first AUC-24 value this grammar has ever produced.
   `AUC24_FLOOR` is untouched at 0.622. Because the corpus is real screenplays
   — which is exactly where the two defects bite — that number is the one that
   says whether this change helped, and it is the only one that can.
3. **Decide whether the forced-heading rule should accept non-Latin scripts.**
   See §2's last paragraph. One place to change it now.

## Post-merge correction

Test case (d), "runScriptDoctor output matches the pre-change snapshot
exactly," compared the fixture snapshot against a fresh `runScriptDoctor`
call while stripping only `analyzedAt`, but the snapshot's
`provenance.engineCommit` was recorded as the literal string `"dev"` because
it was generated with `GIT_SHA=dev` set. `server/lib/build-info.ts` falls
back to `git rev-parse HEAD` when `GIT_SHA` is unset, so in any real
checkout — including this one, on this branch — `engineCommit` is the HEAD
SHA, not `"dev"`, and the test failed on every commit whose environment did
not happen to export `GIT_SHA=dev`. The fix extends the same treatment the
doctor's own output-identity harness (`scripts/check-doctor-output-identity.mjs`,
via `--ignore-keys`) and `tests/core/build-info.test.ts` already give this
field — a build stamp describing which engine ran, not part of the score —
by also stripping `provenance.engineCommit` in the test before comparing,
and removing the `"engineCommit": "dev"` line from the committed snapshot so
the fixture no longer encodes an assumption about the environment it was
generated in. No other byte of the snapshot changed, and the fix does not
touch any scoring-path file.

## § Unicode forced headings (decision 2026-09-20)

`FORCED_SCENE_HEADING_RE` widened from `/^\.(?=[A-Za-z0-9])/` to
`/^\.(?=[\p{L}\p{N}])/u` — a leading `.` followed by ANY Unicode letter or
number is now a forced scene heading, in `lane/unicode-forced-heading` off
this lane's `bf4f3bff` merge commit. §2's "The one place the grammar is
narrower than before" named `.МОСКВА` as an owner decision deferred to a
separate, measured change; this is that change. Fountain's own rule is "a
period followed by a character", not "a period followed by an ASCII
character"; the repository already ships `tests/core/multilingual-headings
.test.ts` for the standard slugline vocabulary, and the owner's own projects
include Armenian- and Russian-language material. `..`, `...` and a `.`
followed by punctuation or a space stay non-headings — none of those bytes
is `\p{L}` or `\p{N}`, so row 6's ellipsis fix is unaffected.

Every consumer of `FORCED_SCENE_HEADING_RE` / `isSceneHeadingLine` was
checked (`grep -rn 'FORCED_SCENE_HEADING_RE\|isSceneHeadingLine' src server
scripts --include=*.ts`): none builds a second regex from `.source`, so
adding the `u` flag needed no other edit, and `server/lib/validation.ts`'s
parity guard (`isSceneSegmentHeading`, which calls `isSceneHeadingLine`
directly since this lane's earlier commit) picks up the widening with no
code change of its own — proven by the new Cyrillic/Armenian/CJK cases added
to `tests/security/fountain-shape-guard-cue-parity.test.ts`'s edge-case
table.

Evidence: `tests/core/scene-grammar.test.ts`'s new "(e) forced headings in
any Unicode script" block — `.МОСКВА - ДЕНЬ`, `.ԵՐԵՎԱՆ` and `.東京` were
`false` before this change and are `true` after; a 3-scene
Cyrillic/Armenian/CJK fixture went from `scenesFromFountain(...).length` 0
and `sceneCount` 1 to 3 and 3. Output identity against this lane's own
`bf4f3bff` baseline: **PASS, 45/45 byte-identical** — none of the 45
fixtures contains a non-Latin forced heading. `npm run benchmark:public
-- --json` before/after: all six public-benchmark numbers unchanged
(0.5313/0.5586, 0.4063/0.4443, 1.0000/0.9473) and all 32 per-script pair
rows byte-identical across all three degradations, so no floor in
`scripts/lib/auc.ts` moved and none was re-locked. No AUC-24 figure is
claimed — see `docs/p1-benchmark/MEASUREMENT_RECEIPTS.md`'s
"FORCED HEADINGS IN ANY SCRIPT" entry for the full receipt.

## § Review findings 4 and 6 fixed

Lane `lane/scene-split-cr-and-recipe-v4`, from `02d8cfb4`, in
`docs/audits/2026-09-20-scene-grammar/README.md`'s own successor review
(the same 2026-09-20 grammar-lane material, re-audited after the
unicode-forced-heading merge landed on top of it).

**Finding 6 (MEDIUM, CONFIRMED).** `scenesFromFountain` reaches
`parseFountain` via `sceneHeadingLineIndices`, and `parseFountain` splits on
`text.split('\n')` alone — a bare `\r` (classic Mac line endings) is
invisible to it, so a CR-only script reads as one line and undercounts
scenes relative to its CRLF/LF twin. Meanwhile `analyzeFountainText`'s own
`normalizeScreenplay` strips `\r\n?` -> `\n` whenever its double-spaced-import
heuristic fires, so `runScriptDoctor`'s `sceneCount` and
`scenesFromFountain(...).length` — fed the same raw text by `doctor.ts` — can
silently disagree about the same document, the exact "the arc and the report
see a different film" defect this lane's original grammar fix closed for the
heading-vocabulary case. Fixed: `scenesFromFountain` normalizes `\r\n?` ->
`\n` at the top of the function, before segmenting. Evidence: new
`tests/core/scene-split-line-endings.test.ts`; fail-first quoted there and in
`docs/p1-benchmark/MEASUREMENT_RECEIPTS.md`'s 2026-09-20 "SCENE SPLIT
NORMALIZES LINE ENDINGS" entry.

**Finding 4 (CONFIRMED).** The AUC-24 recipe's shared segmentation dependency
(`scripts/lib/scene-segments.ts` -> `src/lib/fountain.ts`'s
`isSceneHeadingLine`) changed twice after the `shuffle-drop/v3` bump without a
matching id bump: the ellipsis-heading fix (`..`/`...` are not headings) and
the Unicode forced-heading widening, both already landed on this branch by
the unicode-forced-heading merge above. `AUC24_DEGRADATION_ID` bumps to
`shuffle-drop/v4`; `AUC24_FLOOR` untouched at 0.622; no table has ever been
locked, so nothing is invalidated. `scripts/lib/auc.ts`'s narrative and
`scripts/lib/rebuild-experiment-lib.mjs`'s lineage header are both extended
with a dated paragraph, and `CLAUDE.md`'s Standing Task section gets the v4
sentence in the style of the v2 and v3 ones. Verified that the CR-only fix
above does NOT affect this recipe: `shuffleDropDegrade` calls
`scripts/lib/scene-segments.ts` directly, not `scenesFromFountain`, and
`countFountainScenes` on a bare-`\r` probe reads the same scene count before
and after this lane's commit.

Gates: `npm run lint`, `npm run check-no-console`, `npm run gates`, and
`node scripts/check-scoring-receipt.mjs 02d8cfb4..HEAD` all pass;
`check-doctor-output-identity.mjs --compare` against `git archive 02d8cfb4`
(both sides `GIT_SHA=dev`) — PASS, 45/45 byte-identical (no fixture is
CR-only); `npm run benchmark:public -- --json` — all six floor statistics
unchanged. Full receipt in
`docs/p1-benchmark/MEASUREMENT_RECEIPTS.md`'s 2026-09-20 "SCENE SPLIT
NORMALIZES LINE ENDINGS; AUC-24 RECIPE ID BUMPED TO shuffle-drop/v4" entry.
