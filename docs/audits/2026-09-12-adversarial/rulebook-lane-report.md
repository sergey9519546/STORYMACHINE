# Rulebook-and-guard-bound lane — report

**Worktree:** `/home/user/wt-rulebook` · **Branch:** `lane/rulebook-and-guard-bound`
(from `main @ 871cbb82`) · **Tip:** `71c612442ce94eb6b5abcee487d855ad5fe84211`,
pushed to `origin/lane/rulebook-and-guard-bound` after every commit.

```
git log --oneline 871cbb82..HEAD
71c61244 fix(validation): re-derive MAX_FOUNTAIN_VOICE_ELIGIBLE_WEIGHT from 300k to 1.5M
83f35352 fix(rulebook): make root-cause extraction handle memberRules + multi-line arrays
```

8 files touched across the two commits (`git diff --stat 871cbb82..HEAD`):
`scripts/generate-rulebook.ts`, `tests/core/rulebook.test.ts`,
`docs/rulebook/root-causes.md`, `server/lib/validation.ts`,
`tests/security/fountain-shape-guard-cue-parity.test.ts`,
`docs/CLAIMS_REGISTER.md`, `docs/brain/00 Home.md`, `docs/brain/GRAPH.md`,
`docs/brain/brain.graph.json`, plus two new brain notes. Answering
`docs/audits/2026-09-12-adversarial/engine-logic.md` findings 14 and 10.

---

## 1. What the thing IS

Two independent, unrelated defects in two independent files, both in the
"a guard/generator's own claim about itself is false" family the audit
targets:

**Finding 14 — the rulebook generator's field-name mismatch.**
`scripts/generate-rulebook.ts`'s `extractRootCauseTemplates()` was written
against `cluster.ts`'s ORIGINAL ten `RootCauseTemplate` objects (field name
`requiredRules:`, always a single-line array) and never updated when eight
newer `DuplicateFamily` objects were added under a DIFFERENT field name
(`memberRules:`), four of which wrap their array across more than the
extractor's fixed 6-line lookahead. Net effect: all eight `memberRules`
entries silently got an empty `Requires:` list (four of these were already
wrong in the COMMITTED `docs/rulebook/root-causes.md`, invisible because
the committed doc already matched the broken output), and three of those
eight also got an empty title (whichever pushed `title:` past the window).
`docs/rulebook/README.md`'s own claim — "regenerating is idempotent (a
no-op diff) until the next wave actually changes something" — was false on
`main`, enforced by nothing (the existing `tests/core/rulebook.test.ts`
checks a rule COUNT, never diffs the generated files). Every one of the
four missing clusters has a real, human-authored title and member-rule
list already sitting in `cluster.ts` — this is a generator bug, not stale
or untitled content, so `cluster.ts` is untouched.

**Finding 10 — the shape guard's stale cost bound.**
`MAX_FOUNTAIN_VOICE_ELIGIBLE_WEIGHT = 300_000` in `server/lib/validation.ts`
binds at a cast of `300,000 / ~15,000 ≈ 20` on an ordinary
15,000-dialogue-word feature — the guard rejected a routine 20-character
speaking ensemble (heist, courtroom drama, war film, TV pilot) outright,
with no score and no report, contradicting the neighbouring
`MAX_FOUNTAIN_FREQUENT_CUE_LINES` comment's own "a real large-ensemble
feature can comfortably have dozens of characters." Re-derived by
measurement to 1,500,000. `server/lib/validation.ts` sits outside
`doctor.ts`'s import graph (documented in the file's own header and in
`docs/brain/Gates/Gate - Pure-Core Boundary.md`), so neither fix touches
scoring-path.

## 2. What I found that the brief did not fully anticipate

- The brief's finding-14 text quotes the diff as "16 added lines... four
  clusters, three with empty titles." That is the SYMPTOM, not the root
  cause. The actual defect is broader: it silently strips `Requires:` from
  ALL EIGHT `memberRules`-shaped clusters (four of which were already
  broken in the committed doc before this lane touched anything), and the
  title failure is a SEPARATE symptom (a fixed-line-window overrun) of the
  same underlying "extractor was never updated for the newer object shape"
  bug. Fixing only the four visibly-broken entries (e.g. widening the
  lookahead window to some larger magic number) would have left the other
  four `Requires:`-empty entries broken and undetected. The fix instead
  makes the extractor shape-general: it collects the whole `id:`→`title:`
  field block (terminated at the fixed `explanation:`/`observation:`
  field every object in this file declares) and regexes the JOINED text
  for either field name, rather than one field name on one line within an
  arbitrary line count.
- For finding 10, the brief's own bracket note (`scoring/feature-length-defects`
  independently landed on `1,500,000` inside `[1,331,970, 1,920,000)`) is
  confirmed exactly: this lane's own independent measurement (a lighter
  ~15,150-word normal-feature assumption, rather than whatever produced
  their 1,331,970 lower endpoint) lands on the identical value, 1,500,000,
  with both derivations agreeing the binding constraint is the SAME upper
  bound — `1,920,000`, ROUND 3's "bypass B" fixture — not the lower one.
  This is reported honestly as agreement on the value from a DIFFERENT
  lower-endpoint measurement, not a lucky guess.

## 3. Reproduction, then fix, then re-verified (LANE_STANDARD §3)

**Finding 14 — reproduced, fixed, re-verified:**
```
$ node --experimental-strip-types scripts/generate-rulebook.ts   # pre-fix, into a scratch copy
$ diff docs/rulebook/root-causes.md <scratch>/root-causes.md
8a9,12
> ###  (`clock-zone-imbalance`)
>
> Requires:
...
[16 lines added, exactly matching the audit's reproduction]
```
Against the PRE-FIX extractor (`git show 871cbb82:scripts/generate-rulebook.ts`),
directly querying `extractRootCauseTemplates()`:
```
empty title:        clock-zone-imbalance, seed-suspense-aftermath-void, stakes-zone-imbalance
empty requiredRules: clock-zone-imbalance, payoff-scene-emotional-flatline,
                      payoff-scene-relational-flatline, revelation-relational-flatline,
                      seed-scene-emotional-flatline, seed-suspense-aftermath-void,
                      staging-zone-imbalance, stakes-zone-imbalance
```
After the fix: `extractRootCauseTemplates()` returns 18 templates, ZERO with
an empty title or empty Requires list; regenerating into a temp directory
now produces a byte-identical `docs/rulebook/**` (`tests/core/rulebook.test.ts`'s
new "regenerating into a temp directory produces a zero diff" case, and its
sibling case that feeds `assertRootCauseTemplatesWellFormed()` the exact
malformed shape above and asserts it throws, naming both clusters).
`docs/rulebook/root-causes.md` was regenerated and committed: only that
file changed (13 pass docs, README.md, excellence.md, genre.md stayed
byte-identical), and it now also carries the four previously-silently-broken
`memberRules` clusters' `Requires:` lists
(`payoff-scene-emotional-flatline`, `payoff-scene-relational-flatline`,
`revelation-relational-flatline`, `seed-scene-emotional-flatline`).

**Finding 10 — reproduced, fixed, re-verified:**
Probe-cast measurement (Zipf-distributed speech, 35-word floor, 110-page
feature), `runScriptDoctor` with the guard bypassed, this lane's box:

| cast | voice-eligible weight | wall | cpu |
|---|---|---|---|
| 15 | 227,250 | 8,396ms | 7,962ms |
| 20 | 303,000 | 8,665ms | 8,451ms |
| 25 | 378,750 | 9,449ms | 9,105ms |
| 30 | 454,500 | 9,471ms | 9,214ms |
| 40 | 606,000 | 10,691ms | 10,451ms |
| 60 | 909,000 | 13,734ms | 13,592ms |

Cast 20's weight (303,000) confirms the audit's own reproduction: it already
crosses the OLD 300,000 bound. Fail-first check: casts 20/30/40 would all
have been REJECTED under the old bound (verified directly against the
pre-fix constant) and are now ACCEPTED under 1,500,000
(`tests/security/fountain-shape-guard-cue-parity.test.ts`'s new "finding 10"
describe block, 6 new tests). The lightest payload the file's own existing
DoS/bypass fixtures pin as REJECTED via this bound — ROUND 3's "bypass B"
(200 uniform names, 4 occurrences each, 3 hard-wrapped 4-real-word lines
each) — measures 1,920,000, recomputed from its own generator inline in the
new test (not restated as a literal) and asserted `>` the bound; bypass B
itself is independently re-asserted still REJECTED under the new bound.
Every other fixture pinned REJECTED via this bound measures >= 2,400,000.
Full suite re-run after the bound change: 654/654 pass (648 pre-existing +
6 new), none of ROUNDS 2-7's existing pinned decisions flipped.

## 4. Scope discipline

- `cluster.ts` (the source of the root-cause templates, and — per its own
  header comment — reachable from `doctor.ts`'s presentation-only
  rootCauses synthesis) is UNTOUCHED. The metadata (titles, member-rule
  lists) it already carries for all four missing clusters is correct; only
  the generator's extraction of it was broken. Per the brief's own branch:
  "the metadata lives outside the scoring path" in the sense that it did
  not require a scoring-path edit at all — the fix is entirely contained in
  `scripts/generate-rulebook.ts` and `tests/core/rulebook.test.ts`, neither
  reachable from `doctor.ts`.
- `analyzeVoices` and every other file in the analyzer are UNTOUCHED for
  finding 10. The investigator's proposed real fix (cap the number of
  voice-compared pairs rather than reject the document) is scoring-path
  and is explicitly the scoring lane's to make, per the brief.
- `server/lib/validation.ts`'s edit is confined to the
  `MAX_FOUNTAIN_VOICE_ELIGIBLE_WEIGHT` constant and its header comment —
  no other bound, predicate, or the guard's control flow changed.
  `tests/security/fountain-shape-guard-cue-parity.test.ts`'s edit is a pure
  addition (one new `describe` block at the end of the file); nothing
  existing was modified.
- `docs/CLAIMS_REGISTER.md` row 69 updated (only the quoted number, since
  the sentence itself interpolates the constant and stayed true): the
  brief's "claims-register row if any user-facing sentence changes"
  trigger fired because the REJECTION MESSAGE's quoted number changed, even
  though its wording did not.
- Two new brain notes (`Gate - Rulebook Freshness.md`,
  `Gate - Fountain Shape Guard.md`), linked from `00 Home.md`'s "what stops
  a bad change from merging" line; `npm run brain` / `check-brain` both
  clean, `tests/core/brain-coverage.test.ts` 7/7 pass.
- Did NOT touch `server/lib/validation.ts`'s VerifyExpectedSchema region
  (owned by `lane/verify-covers-tier`, per the durability brief) — confirmed
  by `git diff 871cbb82..HEAD -- server/lib/validation.ts` touching only
  lines 568-712 (the `MAX_FOUNTAIN_VOICE_ELIGIBLE_WEIGHT` constant and its
  neighbouring comment), nowhere near the `VerifyExpectedSchema` region.

## 5. Gates (foreground, exit codes)

| Gate | Result |
|---|---|
| `tests/core/rulebook.test.ts` | 6/6 pass, exit 0 |
| `tests/core/rulebook-links.test.ts` | 3/3 pass, exit 0 |
| `tests/security/fountain-shape-guard-cue-parity.test.ts` | 654/654 pass, exit 0 |
| `tests/routes/fountain-shape-guard-cue-bypass.test.ts` | 57/57 pass, exit 0 |
| `tests/core/analyzer-dos.test.ts` | 12/12 pass, exit 0 |
| `node scripts/check-scoring-receipt.mjs 871cbb82..HEAD` | "no scoring-path files changed. OK." exit 0 |
| `check-doctor-output-identity.mjs` (871cbb82 baseline, `--ignore-keys provenance.engineCommit`) | "OUTPUT IDENTITY: PASS — all 45 reports are byte-identical modulo the ignored key(s) [provenance.engineCommit]" exit 0 |
| `npx tsc --noEmit` (lint) | 0 errors, exit 0 |
| `npm run check-no-console` | "304 file(s)... OK." exit 0 |
| `npm run check-docs` | "No AI writing patterns detected." exit 0 |
| `npm run honesty-audit` | "scanned 458 files... clean." exit 0 |
| `npm run check-brain` | "OK. 103 notes, 353 links, graph is fresh." exit 0 |
| `tests/core/brain-coverage.test.ts` | 7/7 pass, exit 0 |
| `npm test` (full, once, final tree) | **13,211 tests, 2,322 suites — 13,119 pass, 0 fail, 91 skipped (env-gated, e.g. `REAL_SCRIPT_CORPUS_DIR`), 1 todo — exit 0**, duration 284.2s |

Note on `provenance.engineCommit`: the output-identity harness's ONLY diff
across all 45 fixtures is this field, which is the running checkout's git
commit SHA (`server/lib/build-info.ts`) — a provenance stamp that is
SUPPOSED to change every commit, not a scoring value. A `git archive`
baseline has no `.git` (reads as `"dev"`); the working tree correctly reads
the real SHA. Excluded via the harness's own documented `--ignore-keys`
mechanism (built for exactly this "identity modulo a key I am deliberately
changing" case) rather than silently accepted as a false "45 fixtures
differ."

No browser battery run (not required — no browser-facing surface touched;
`ONE full npm test` above already covers the full suite once, on the
final tree).

## 6. What was left undone, and why

- Nothing from the two numbered items was narrowed, skipped, or widened.
  Both findings' "Best achievable version" text is fully implemented: the
  generated-artifact freshness guard (finding 14) and the accept-realistic-
  casts-while-still-rejecting-every-DoS-fixture proof (finding 10).
- Not attempted (explicitly out of scope per the brief): `analyzeVoices`'s
  pair-cap (scoring lane's), and any change to `cluster.ts`'s actual
  templates (none were needed — they were already correct).
- The Decision Log (`docs/DECISION_LOG.md`) was NOT given a new numbered
  entry — the brief asked for brain Gate/Surface notes, not a Decision Log
  entry, and neither change is a strategic/phase-defining decision in that
  log's sense.
