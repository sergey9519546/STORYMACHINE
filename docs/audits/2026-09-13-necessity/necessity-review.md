# Independent review — `lane/necessity-certificate` @ `8fb18977`, round 1

**Reviewed object:** `8fb18977` on `lane/necessity-certificate` (tip `f999e31c`
adds only the report's `Tip:` line and is not otherwise reviewed).
**Base:** `main` @ `91c369c5`. **Diff:** `git diff 91c369c5..8fb18977`.
**Worktree:** `/home/user/wt-necessity`. **Reviewer:** did not build this lane.
**Procedure:** `docs/LANE_STANDARD.md` §6.

This is a good lane. The architecture is right, the scoring-path reasoning is
correct and independently confirmed, the prompt injection genuinely works, and
the report is honest about what it did not wire. The verdict is REVISE on one
substantive defect, measured here: the `non_answer` rule rejects real writer
answers, and its failure text tells the writer something false about their
text when it does.

---

## 1. Brief items against the diff

| # | item | verdict |
|---|---|---|
| a | `non_answer` over-firing — drive ten realistic answers, report false-fails | **DEFECT CONFIRMED** — 2/10 with no context, 3/10 with the context the real surface sends. See §2 and finding 1 |
| b | `restates_context` defensible, or should it not exist? | **NARROWED/DEFECTIVE** — fires on real answers, is documented against a "heading" that does not exist on a beat, and never runs on the injection path. Finding 2 |
| c | Never-judged, structurally | **DONE** — proven, §3 |
| d | Does it actually reach the prompt? | **DONE** — proven by running the real assembly, not by the source-reading test. §4 |
| e | The unwired gap (their item 3) | **HONEST STOPPING POINT, weak UI copy.** §5, finding 4 |
| f | Scoring-path reasoning | **DONE** — independently reproduced, §6 |
| g | Shared-file discipline + hygiene | **DONE** — §7. Counts re-derived independently and correct |

Sub-claims checked and found accurate: eight rules present as described;
thresholds 16 / 500 / 4 / 2 as documented; `beatId` stamped server-side, not
trusted from the client (`server/routes/config.ts`, the `necessityBeatId({...})`
block); an untouched four-blank form is not stored (`necessityIsBlank` →
`delete out.necessity`); `OutlineBeatSchema` is `.passthrough()`;
`NecessityCheckBodySchema` caps every field, refuses control characters and
bounds `context` at 8 entries; the route takes `gameLimiter` and reads no
session. The client-side `api-schemas.ts` fix is real and load-bearing — zod
`.parse()` does strip unknown keys, so without it the panel would have
destroyed the certificate on the next Save.

---

## 2. (a) `non_answer` over-firing — reproduced, 3/10

Ten answers a working screenwriter could plausibly type, run through the real
`checkNecessity()` (harness in `<session scratch>/falsefail.ts`). Each answer
was placed alone in its field with the other three filled by known-good text,
so only the answer under test can fail.

```
FAIL  [whyNow] "Nothing else has worked."         len=24  reasons=["non_answer"]
FAIL  [whyNow] "She needs it later."              len=19  reasons=["non_answer"]
       ... 8 others PASS
no-context false-fails: 2/10
```

With the context the **real surface actually sends** — `[beat.goal,
beat.constraint]`, `DirectorPanel.tsx` `checkBeatNecessity` — a third joins
them (`restates_context`, finding 2):

```
with-context false-fails: 3/10
```

**Is "nothing survives removal" the right bound?** No, and the answer is
measurable rather than a matter of taste. The current bound is
`surviving.size < NECESSITY_MIN_DISTINCT_WORDS` (4). The blocklist contains
ordinary English content words — `nothing`, `later`, `necessary`, `needed`,
`required`, `test`, `reasons`, `none`, `unknown` — so any 4-to-6-word genuine
answer containing one of them drops below 4 survivors and fails. The module's
own comment claims "Every entry is a literal non-answer"; `nothing`, `later`
and `necessary` are not.

I tested two tighter bounds against ten real non-answers the rule exists to
catch and the five real answers it should not touch
(`<session scratch>/variant.ts`):

| bound | targets missed | false-fails |
|---|---|---|
| current (`surviving < 4`) | 0/10 | **3/5** |
| whole-field (`surviving === 0`) | 1/10 | 0/5 |
| **no CONTENT word survives** (`surviving − NECESSITY_STOP_WORDS` is empty) | **0/10** | **0/5** |

The third bound is strictly better than the shipped one on all fifteen cases,
catches everything the lane's own test fixtures target (including
`"It is necessary and required."`, the one case a plain whole-field match
leaks), and needs no new machinery — `NECESSITY_STOP_WORDS` is already
exported from the same module. That is the fix I am asking for, not a
judgement call about taste.

**The copy compounds it.** `REASON_DETAIL.non_answer` reads *"This answer is
made only of placeholder or filler text … so no question was actually
answered."* Shown against `"Nothing else has worked."` that sentence is
false about the writer's text, which is a `LANE_STANDARD` §2 "copy tells the
truth" violation in the exact state the browser suite never renders.

---

## 3. (c) Never-judged, structurally — proven

`scripts/lib/import-graph.mjs`, `computeReachableSet` rooted at the module:

```
reachable from necessity-certificate.ts:
  server/lib/necessity-certificate.ts, server/lib/prompt-utils.ts
provider-ish hits (ai-provider|llm|gemini|anthropic|openai|engine/ai): NONE
```

Two files. `prompt-utils.ts` has no imports at all. The route handler
(`server/routes/config.ts`, `POST /api/outline/necessity-check`) is
`coerce → checkNecessity → res.json` with `gameLimiter` and no
`withSessionCommand`, so no session read, no clock, no model call on the route
path. It correctly takes `gameLimiter` rather than `aiLimiter` because it
cannot trigger an LLM call.

I read every user-visible string the module emits — the four questions, the
four prompt labels, `NECESSITY_CHECK_DISCLAIMER`,
`NECESSITY_SAVED_WITH_BEAT_COPY`, all eight `REASON_DETAIL` entries, and the
prompt block. Seven of the eight reason strings name a property of the text
only (missing, blank, shorter than 16, longer than 500, fewer than 4 different
words, repeats the heading, identical to another). None uses a quality word.
The one string that overclaims is `non_answer`, above — and it overclaims
about the TEXT ("made only of placeholder text"), not about the idea, so it is
a truthfulness defect rather than a breach of NORTH_STAR §1. The
never-judged property itself holds.

---

## 4. (d) It does reach the prompt — run, not read

I ignored the source-reading test and ran `buildSystemPreamble()` directly
against a real `emptyState()` (`<session scratch>/inject.ts`), with four
answers uniquely marked so a match cannot be coincidental:

```
--- BLOCK AS ASSEMBLED (with certificate) ---
SCENE NECESSITY (author-stated; these are constraints, not suggestions):
- WHY NOW: REVIEWER-NOW the vault time-lock releases for eleven minutes at dawn.
- WHY HERE: REVIEWER-HERE the loading bay is the only room without a camera.
- WHY THESE CHARACTERS: REVIEWER-THEM only Mara knows the override phrase for the door.
- FORCING FUNCTION (what makes the scene unavoidable): REVIEWER-FORCE the freight manifest is audited at noon today.
The scene you generate must be unmistakably about THIS moment, THIS place, ...

PRESENT whyNow / PRESENT whyHere / PRESENT whyThem / PRESENT forcingFunction

--- without a certificate ---
contains "SCENE NECESSITY": false
byte-identical to a no-necessity-field target?  true
form-failing cert injects block?                false
form-failing cert byte-identical to no-cert?    true
lengths: with=5405  without=4634
```

All four present; absent when unset; a form-failing certificate injects
nothing and leaves the preamble byte-identical. The claim that
`llm-generator.ts` needs no hookup line is correct: `llm-generator.ts:223-224`
puts `spec.systemPreamble` first in its user prompt verbatim. The byte-identity
survives because the preamble array ends in `.filter(Boolean)`, which drops the
empty block — I checked that rather than assuming it.

One divergence found while doing this: `proof-spec.ts` calls
`buildNecessityPromptBlock(coerceNecessityCertificate(target.necessity))` with
**no `opts`**, so `restates_context` never runs on the injection path. The
writer's surface can therefore report a field as `restates_context` while the
generator would accept that same certificate and inject it. Two verdicts for
one certificate. Folded into finding 2.

---

## 5. (e) The unwired gap

`grep` over `src/` and `server/` finds no producer that sets `necessity` on a
`SceneTarget`; `ArcPlannerPanel.tsx` builds targets from `DEFAULT_ARC` as the
report says. The gap is disclosed in three places — report §2.5 and §6.1, the
feature doc's "What is NOT wired, and why", and claims row 118's conditional —
and row 118's wording ("a scene generated **from this beat** states all four
to the generator as constraints") is carefully true: the seam exists and is
tested, the sentence does not claim a preset-built scene is constrained.

I accept it as an honest stopping point rather than a narrowing that makes the
feature decorative, on two grounds: the server seam is complete, tested in both
directions, and reachable today by any caller that posts a scene target
(`ConvergeArcBodySchema` takes `z.array(z.unknown())`); and the reason given
for not wiring it — that a `sceneIdx`→beat mapping would have to be invented —
is a real constraint, not an excuse.

But row 118 is a conditional whose antecedent **no shipped client can satisfy**,
rendered to a writer who cannot tell "generated from this beat" from
"generated". It is true and it will still mislead. See finding 4.

> **What a writer gets today:** four labelled questions on each outline beat,
> a deterministic "did you answer all four" check with a per-field reason, and
> answers that survive save and reload — and no scene any shipped client
> generates reads them.

---

## 6. (f) Scoring-path reasoning — independently reproduced

```
doctor.ts reachable set size: 67
  IN   server/engine/types.ts
  IN   server/lib/structure-presets.ts
  out  server/lib/necessity-certificate.ts
  out  server/lib/validation.ts
  out  server/routes/config.ts
  out  server/nvm/generate/proof-spec.ts
  out  src/components/DirectorPanel.tsx
  out  src/lib/api-schemas.ts
```

Set size 67 matches the report exactly. `server/engine/types.ts` really is
scoring-path, the decision to model the certificate as `WithNecessity<T>`
rather than a field on `OutlineBeat` is correct, and leaving
`structure-presets.ts` alone for the same reason is correct. Independent run:

```
$ node scripts/check-scoring-receipt.mjs 91c369c5..8fb18977
check-scoring-receipt: range "91c369c5..8fb18977" — no scoring-path files changed. OK.
exit=0
```

The lane earned this rather than dodging it: the certificate is author prose
that reaches a prompt and moves no score, so no receipt is owed and none was
faked.

---

## 7. (g) Shared-file discipline and hygiene

**Shared files.** `git diff --name-only 91c369c5..8fb18977` is 21 files and
contains none of `scripts/story-bench.mjs`,
`server/nvm/generate/llm-generator.ts`, `server/lib/ai-providers/*`,
`server/engine/ai.ts`, `docs/audits/2026-09-13-story/**`, or
`docs/story-generation/STORY_BENCH_2026-09-13.md`. The only
`docs/story-generation/` file is `NECESSITY_CERTIFICATE.md`. Clean.

**Claims numbering.** `main`'s max row is 116; the lane adds 117 and 118. No
gap, no collision.

**`vite-cache-dir` counts — re-derived independently, not trusted:**

```
total shutdown() sites under scripts/ (excl. browser-verify.mjs): 12
distinct files:                                                    9
graceMs=0 (no graceMs key) files:                                  5
  verify-e4-local-safety-net / verify-e5-command-palette /
  verify-necessity-surface / verify-production-build / verify-ui-polish-affordances
```

4→5 files, 11→12 sites, 8→9 files: all three correct, and the file list in the
test matches mine exactly. The comment beside `releaseViteCacheSlot()` names
the new caller in the same commit, which is the coupling the assertions exist
to force. Reporting the red rather than silently fixing it was the right call.

**Re-run gates (reviewer):**

| gate | result |
|---|---|
| `node --experimental-strip-types tests/core/necessity-certificate.test.ts` | 23/23 pass, 0 fail |
| `node --experimental-strip-types tests/core/brain-coverage.test.ts` | 7/7 pass, 0 fail |
| `PW_CHROMIUM_PATH=/opt/pw-browsers/chromium node scripts/verify-necessity-surface.mjs` | **20/20 assertions passed** |

The browser suite is real, not a rubber stamp: both themes, 375px with an
explicit no-horizontal-overflow assertion, a full Tab walk through the four
boxes to the Check button, `aria-describedby` wiring, the stale-verdict clear,
and the save→reload round trip. Its best assertion is *"Only the unanswered
question is flagged — reason paragraphs=1"*, which pins the not-judging
property at the surface. I did not re-run the full `npm test`; §4 of the
standard says a reviewer reproduces a number and drives the surface rather
than re-running the battery.

---

## 8. Findings by severity

### Blocking

**1. `non_answer` rejects real writer answers, and says something false when
it does.** 3 of 10 realistic answers false-fail through the real surface
(§2). The bound `surviving.size < 4` treats ordinary content words
(`nothing`, `later`, `necessary`, `needed`, `required`, `test`) as evidence of
a skipped question. Measured fix: fail only when **no non-stop-word survives**
— 0 targets missed, 0 false-fails across 15 cases, using the already-exported
`NECESSITY_STOP_WORDS`. Add the three false-failing answers as
must-PASS fixtures so the bound cannot silently tighten again, and soften
`REASON_DETAIL.non_answer` so it cannot assert "made only of placeholder text"
about text that is not.

**2. `restates_context` fires on real answers, is documented against a thing
that does not exist, and disagrees with the injection path.** Against the
context the surface actually sends — a beat's `goal` and `constraint` — the
answer *"It is the only room with the safe."* and *"The ledger is kept in the
safe room."* both fail, because a "why here" answer for a beat whose goal names
the place must reuse the place's nouns. That is the brief's own example and it
behaves exactly as feared. Three separate problems compound:
(i) `NECESSITY_MIN_NEW_WORDS = 2` measured against a whole goal sentence is far
more aggressive than the same bar against a slugline; (ii) the module and the
reason string both say "the scene's own **heading**", but `OutlineBeat` has no
heading — the rule as documented is about a field the data model does not have;
(iii) `proof-spec.ts` passes no `opts`, so the rule never runs on the prompt
path and the surface's verdict and the generator's differ for one certificate.
Either remove the rule, or scope it to `whyHere`/`whyNow` with heading-grade
context only, raise the bar, correct the reason string, and make the two paths
agree. Removing it is defensible — it is the one rule whose input the module
cannot validate, and the feature loses nothing the other seven rules do not
already cover.

### Non-blocking

**3. A test asserts less than its name.**
`tests/nvm/generate/necessity-injection.test.ts:85`, *"a target with no
certificate leaves the preamble byte-identical to before"*, asserts only
`!preamble.includes('SCENE NECESSITY')`. It would pass if the change had
introduced a stray blank line. Byte-identity happens to hold — I verified it
independently (§4) — but the test does not prove its own name. Pin the
no-certificate preamble's hash or length, or rename the test.

**4. The writer surface never says no generator reads these yet.** Row 118's
conditional is true and the docs are honest, but the sentence a writer reads
beside the boxes is the one place the gap is invisible. One clause —
"(no scene generator reads these yet)" — makes the surface as honest as the
report, and costs nothing.

**5. The header disambiguates the wrong collision.** It carefully separates
this module from `necessityScore` (`server/nvm/quality/index.ts:546`) but does
not mention `necessityProof` (`server/nvm/proof/tier2/necessity.ts:12`, wired
into `kernel.ts:55`) — which is the exact function name the archive's sketch
used. A reader following the archive to `necessityProof` lands on the op-level
proof and concludes this lane duplicated it. One sentence fixes it.

**6. `NECESSITY_LABELS` lives in `DirectorPanel.tsx`.** The module claims to be
the single home for the four questions' wording ("the route, the UI labels, the
prompt block and the docs all read these, so the four questions cannot drift
apart"), yet the short UI labels are a fourth map defined in the component.
They can drift from `NECESSITY_PROMPT_LABELS`. Move them next to the other two.

### Checked and clean

`DirectorPanel.tsx` value-importing `server/lib/necessity-certificate.ts` into
the client bundle looked like a boundary breach; it is not — `src/lib/story-axes.ts`
already value-imports `server/lib/genre-router.ts` and
`server/lib/structure-presets.ts`, the imported module is pure with no secrets
and reaches only `prompt-utils.ts`, and `build` passes. No copied
implementation found: the browser calls the server's one checker instead of
re-implementing the rules, which is the right call and the harder one.

---

## 9. What a stronger version would have done

Three things. First, it would have **measured the form check against writing
instead of against fixtures it authored**. Every threshold in the table has a
prose justification and a synthetic fire/no-fire test; none was ever driven
with a set of answers a writer might actually type. The lane's own report
names `non_answer` as "the only rule with any risk of over-firing" and then
bounds that risk by argument rather than by measurement — and the argument is
wrong by 3 in 10, which fifteen minutes of the harness in §2 would have shown.
This repository's whole standing lesson (CLAUDE.md: measure before threshold,
synthetic coverage alone is not enough) is that a rule justified by reasoning
and tested on its author's own examples is not yet evidence; that lesson
applies to a form checker as much as to a scoring rule, and applies harder here
because the failure mode is rejecting a real writer.

Second, it would have **let the writer wire the last link instead of declaring
it unwireable**. "A scene→beat mapping would have to be invented" is true only
for an *automatic* mapping. A beat selector on the scene target — the writer
picks which beat's certificate applies to the scene being generated — invents
no rule at all; it asks the author, which is precisely the feature's own
philosophy applied one step further. That is in scope for a lane whose stated
purpose is getting four author-stated anchors into a generation prompt, and it
is the difference between a complete feature and a complete seam.

Third, it would have made the **two certificate verdicts one verdict**. The
surface checks with context; the prompt path checks without. A lane this
careful about "one implementation" of the rules shipped two different
configurations of them and did not notice, because nothing tests the two paths
against the same certificate.

None of this diminishes what is here: the scoring-path avoidance is exactly
right and independently verified, the `api-schemas.ts` catch is a real bug the
lane found and fixed on its own, the disabled-rule-by-rule proof is the right
way to show a guard can fail, reporting the two red subtests rather than
quietly renumbering them is the standard being followed under no observation,
and the never-judged property holds structurally rather than by promise.

---

## VERDICT: REVISE

Blocking, in order:

1. **Fix `non_answer`'s bound.** Fail a field only when no non-stop-word
   survives phrase removal (`surviving − NECESSITY_STOP_WORDS` empty) rather
   than `surviving.size < NECESSITY_MIN_DISTINCT_WORDS`. Measured: 0 of 10
   intended targets missed, 0 of 5 real answers rejected, versus 3 rejected
   today.
2. **Add the false-failing answers as must-PASS fixtures** —
   `"Nothing else has worked."`, `"She needs it later."`,
   `"He has nothing left."` — beside the existing must-FAIL ones, so the bound
   cannot re-tighten silently. Keep every current must-FAIL fixture passing.
3. **Correct `REASON_DETAIL.non_answer`** so it does not assert that an answer
   is "made only of placeholder or filler text"; say what the rule measured.
4. **Resolve `restates_context`.** Either delete it (defensible, and my
   preference), or: scope it to `whyHere`/`whyNow`, stop describing it as
   checking "the scene's own heading" when a beat has none, raise the bar so a
   whole goal sentence as context does not reject an answer that legitimately
   names the place, and add a must-PASS fixture for
   `"It is the only room with the safe."` against a goal naming that room.
5. **Make the surface and the injection path check the same way.** Whichever
   resolution item 4 takes, `proof-spec.ts` and `DirectorPanel.tsx` must reach
   the same verdict for the same certificate; add one test that asserts it.

Non-blocking, address if cheap: findings 3, 4, 5, 6 in §8.

Re-review will check these five against the new diff only.

---

# Round 2 (`811983ac`)

**Reviewed object:** `811983ac` on `lane/necessity-certificate` (tip `64f50afc`
adds only the report's `Tip:` line). **Round-2 diff:** `git diff 8fb18977..811983ac`.
Warm re-check of my own five blocking and four non-blocking items only, per
`docs/LANE_STANDARD.md` §6 — no battery re-run.

## My 15-case set, re-run independently against the new bound

The same answers from round 1, driven through the shipped `checkNecessity()`,
each placed in **all four fields** (`<session scratch>/round2.ts`):

```
--- 10 REAL answers x 4 fields (must all PASS) ---
PASS x4  "Nothing else has worked."            <- round-1 false-fail
PASS x4  "She needs it later."                 <- round-1 false-fail
PASS x4  "He has nothing left."                <- round-1 false-fail
PASS x4  "It is the only room with the safe."  <- round-1 restates_context fail
PASS x4  (six others)

--- 10 INTENDED targets x 4 fields (must all FAIL) ---
FAIL x4 (caught)  all ten, including "It is necessary and required."

reviewer false-fails:    0/40 placements (10 answers)
reviewer missed targets: 0/40 placements
option-induced verdict drift over 20 answers x 3 option shapes: 0
```

**Reviewer false-fail count: 0** (round 1: 3 of 10 answers, 12 of 40
placements). All three previously-failing answers pass in all four fields; the
safe-room example passes even when round-1's exact `context` payload is handed
in, because the option no longer exists. All ten placeholders still fail in all
four fields — the fix bought nothing at the catching end.

## Per-item verdicts

| # | round-1 item | round-2 verdict |
|---|---|---|
| 1 | fix `non_answer`'s bound | **DONE** — fails only when no content word survives. Measured above: 0 false-fails, 0 missed targets |
| 2 | add the false-failing answers as must-PASS fixtures | **DONE** — `REAL_ANSWERS` (10, my three first) × 4 fields and `NON_ANSWERS` (10) in `tests/core/necessity-certificate.test.ts`; every round-1 must-FAIL fixture still fails |
| 3 | correct `REASON_DETAIL.non_answer` | **DONE** — now *"Setting aside placeholder phrases ("TBD", "because the plot needs it") and words like "it" and "is", this answer has no words left, so there is nothing here that answers the question."* It states what was measured and no longer asserts the text is "made only of placeholder or filler text" |
| 4 | resolve `restates_context` | **DONE, by removal** — my preferred resolution. Gone from the module (only a removal note at `necessity-certificate.ts:391`), from `NecessityCheckOptions` (which now carries `beatId` alone), from `NecessityCheckBodySchema` (no `context` field), and from the surface (`DirectorPanel.tsx:587`, "Certificate only"). Documented in `NECESSITY_CERTIFICATE.md:67`. Kept gone by regression tests at `necessity-certificate.test.ts:283`, one of them my safe-room example. Every remaining repo hit for "restates" is unrelated pre-existing code |
| 5 | surface and injection path must agree | **DONE, structurally** — `NecessityCheckOptions` no longer has any option that can change a field verdict, so the two paths cannot diverge by construction rather than by a test watching them. I verified it rather than taking the assertion: 20 answers × 3 option shapes (none / round-1's context / a mismatched `beatId`) produced **0** verdict drift. `tests/routes/outline-necessity.test.ts` additionally runs the live route against `buildSystemPreamble` for nine certificates asserting `generatorInjects === surfaceOk` |
| NB3 | "byte-identical" test asserts less than its name | **DONE** — now compares whole strings three ways (baseline, explicit `undefined`, form-failing), so a stray separator fails it |
| NB4 | surface never says no generator reads these | **DONE, and better than I asked** — the copy now reads *"Answers are saved with the beat. No scene generator in the app reads them yet — the engine states all four as constraints only for a scene generated from this beat, which nothing here does today."* Claims row 118 rewritten to the same sentence, so the register no longer carries a conditional whose antecedent nothing satisfies |
| NB5 | `necessityProof` collision undisambiguated | **DONE** — `necessity-certificate.ts:56` names it and its kernel wiring |
| NB6 | `NECESSITY_LABELS` stranded in the component | **DONE** — exported from the module as `NECESSITY_UI_LABELS` |

## Reviewer-run gates

| gate | result |
|---|---|
| my 15-case set, 80 placements | 0 false-fails, 0 missed targets |
| option-drift probe, 20 answers × 3 option shapes | 0 drift |
| `node --experimental-strip-types tests/routes/outline-necessity.test.ts` | 13/13 pass, 0 fail |
| `PW_CHROMIUM_PATH=… node scripts/verify-necessity-surface.mjs` | **21/21 assertions passed** |

I re-ran the browser suite because round 2 changed writer-visible copy, and
copy is the one thing a unit test can agree with while the screen disagrees.

## Assessment

Every blocking item is resolved at the root rather than patched at the
boundary. Item 4 was taken by deleting the rule and the option it rode on,
which is what made item 5 disappear as a class of bug instead of becoming a
test that watches for it — the stronger of the two resolutions I offered.
Item 1's bound is the one I measured, and it holds on my set at four times the
coverage I originally ran. The copy changes are honest in the direction that
costs the feature something: the surface now tells a writer plainly that
nothing reads the answers yet, which is the sentence a lane is least inclined
to write about its own work.

The round-1 non-blocking items were all taken as well, so nothing is carried
forward.

## VERDICT: MERGE

No outstanding items. The unwired gap (round-1 §5) remains the honest stopping
point it was, and is now stated on the surface, in claims row 118, in the
feature doc and in the lane report — a writer can no longer misread it.
