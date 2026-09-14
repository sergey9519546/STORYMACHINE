# Lane report — `lane/necessity-certificate`

**Worktree:** `/home/user/wt-necessity`
**Branch:** `lane/necessity-certificate` (from `main` @ `91c369c5`)
**Reviewed SHA:** see `Tip:` at the end of this file.

```
$ git log --oneline main..HEAD
ed62ebe7 fix(gates): the new browser suite is the fifth graceMs=0 shutdown() caller
8a356adf docs(audit): the necessity lane report + brain notes for the audit and Decision #8
f4493d27 docs(claims): rows 117-118 — the two writer-facing necessity sentences
024b3faf docs(necessity): Decision #8 (form-checked, never judged) + the feature doc
47fd8776 fix(test): a literal NUL byte made outline-necessity.test.ts a binary file to git
abaf51aa feat(necessity): the writer-facing surface — four questions on the outline beat
2406c780 feat(necessity): the four answers reach the generation prompt as constraints
1805c52d feat(necessity): attach the certificate to the outline beat + keyless form-check route
72774c90 feat(necessity): NecessityCertificate + a deterministic FORM check
```

---

## 1. What the thing IS

A **Necessity Certificate** is four answers the author gives about a scene
before it is generated — why now, why here, why these characters, and what
makes the scene unavoidable — stored on the outline beat they belong to, and
stated to the scene generator as constraints. A pure function,
`checkNecessity()`, validates the FORM of those answers: that each question
was answered, in text that is not blank, not a single repeated word, not
only placeholder tokens, not a restatement of the scene's own heading, and
not a copy of a sibling answer. It never assesses whether a reason is a good
one, makes no model call, and returns the same result for the same input
forever.

Everything else in the lane follows from that one line: where it attaches
(the beat, so it travels), how it reaches generation (as stated constraints,
never as a numbered proof constraint — no proof verifies it), what the
writer is told (a sentence that says what the check does NOT do), and what
is deliberately left unwired.

### What the archive got right

`docs/research-archive/_CLEVER_MOVES.md` §10 ("The Necessity Engine: It's a
Form, Not a Judge", :348-371) is the source and its principle is exactly
right, in a repository whose constitution says the same thing from the other
direction (NORTH_STAR §1, no LLM-as-judge): ask once at outline time, store
the answers, audit that they exist, and do not ask a model whether a reason
is any good. It is also right about the failure mode — the skipped question,
not the weak answer — and right that the writer who answers thoughtlessly is
not the engine's problem to solve.

### What the archive got wrong

1. **Its comments describe a checker its code does not implement, and could
   not implement without judging.** The interface it sketches annotates each
   field with a semantic requirement: `whyNow` "must reference a
   time-specific event", `whyHere` "must reference a location-specific
   feature", `whyThem` "must reference a character-specific attribute". Its
   `necessityProof` implements none of that — it checks `v?.length >= 10`.
   A reader following the comments rather than the code builds the judge the
   same section forbids, and a *deterministic* judge is the worse of the two:
   a rule demanding a clock noun in `whyNow` passes "at some point soon" and
   fails "the vault opens once and it is opening". This lane implements the
   code's intent and records the distinction as Decision #8.
2. **`length >= 10` does not catch the skipped question.** It passes
   `"aaaaaaaaaa"`, `"TBD later."` (exactly 10), `"because."` padded with two
   spaces, and — the case that matters most in a four-field form — the same
   sentence pasted into all four boxes. It catches the empty box, which is
   not where the 90% case lives.

### What the BRIEF got wrong

- It says the archive section is titled "Necessity Certificate". The section
  is §10, "The Necessity Engine: It's a Form, Not a Judge"; `NecessityCertificate`
  is the interface inside it. Cosmetic, noted for the record.
- It suggests the final hookup into generation might have to be left as
  "one line another lane must add" in `llm-generator.ts`. **No such line is
  needed.** `llm-generator.ts:224` already sends `spec.systemPreamble`
  verbatim as the first element of its user prompt, and the preamble is
  built by `proof-spec.ts` — a file this lane may edit. The certificate
  therefore reaches the provider with `llm-generator.ts` untouched. A test
  reads that file's source so the link cannot disappear silently.
- It offers `server/nvm/quality/` or `server/lib/` for the module as if they
  were equivalent. They are not: `server/lib/validation.ts` (the schema),
  `server/routes/config.ts` (the route) and `server/nvm/generate/proof-spec.ts`
  (the prompt) all consume it, and importing `server/nvm/quality/**` from
  `server/lib/**` inverts the layering. `server/lib/necessity-certificate.ts`
  it is.
- The brief assumed `StoryConfig` / the Story wizard was a candidate
  attachment surface. There is no `src/lib/storyConfig*` and no
  `*Wizard*` component in this tree (`ls src/components | grep -i wizard`
  is empty); the real beat surface is `OutlineBeat` + the Director HUD's
  Outline tab, which is where the work went.

### The one thing it is NOT

`server/nvm/quality/index.ts:546` already exports `necessityScore(ops,
state)`. Same word, different concept: it scores the StoryOp list of an
already-generated scene (how many ops earn their place) and never sees a
stated reason. This module never sees an op. They are deliberately not
merged, and each file's header points at the other so the next reader does
not "unify" them.

---

## 2. Design decisions, with reasons

### 2.1 The form rules, and why these thresholds

| code | threshold | why |
|---|---|---|
| `missing` / `empty` | — | the form was not filled in |
| `too_short` | 16 chars | no single English word reaches 16, so the rule cannot be satisfied by one word; every real minimal answer clears it ("The vault shuts at dawn" = 22). The archive's 10 passes "TBD later." exactly |
| `too_long` | 500 chars | the cap `OutlineBeatSchema` already applies to goal/constraint/avoid. A second, different cap for strings taking the same road into a prompt would be a defect |
| `too_few_distinct_words` | 4 distinct | a word count alone is beaten by "because because because because"; a character count alone by "aaaaaaaaaaaaaaaaaa". DISTINCT words closes both with one rule |
| `non_answer` | placeholder-only | a fixed list of literal non-answers ("tbd", "because the plot needs it", "to move the story forward"), matched as whole token sequences. A field fails only when what SURVIVES removing them is under the distinct-word floor — so a real answer containing "later" or "test" passes |
| `restates_context` | < 2 new non-stop words | "the vault at night" against `INT. VAULT - NIGHT` restates the question. Stop words are excluded from "new" or the rule is defeated by "the" and "at". Runs only when the caller supplies context — it never guesses at a heading |
| `duplicate_answer` | exact, normalized | one sentence in two boxes means at least one question is unanswered. Normalization means case and punctuation do not hide a copy-paste |

Every threshold is a floor on **effort**, not on quality, and a test asserts
exactly that: a shallow, well-formed answer ("It felt like the right moment
in the story to do this") passes on purpose. The `non_answer` list is the
only rule with any risk of over-firing, and it is bounded in two ways: whole
token sequences only (so "none" never fires inside "nonetheless"), and a
field fails only if nothing else is left.

### 2.2 Where it attaches, and why not on `OutlineBeat`

It rides inside the beat: `POST /api/outline` →
`Illusion_State.outline_json` → `GET /api/outline`. That is the real beat
object — the one `server/engine/agent/decision.ts:196` and
`server/engine/DirectorNode.ts:874` already read to steer prompts, and the
one the Director HUD already edits.

It is NOT a field on `server/engine/types.ts`'s `OutlineBeat`, because that
file is inside `server/nvm/analyze/doctor.ts`'s reachable set. Verified, not
assumed:

```
$ node -e "import('./scripts/lib/import-graph.mjs').then(m => {
    const set = m.computeReachableSet(process.cwd(), ['server/nvm/analyze/doctor.ts']);
    for (const f of [...]) console.log(set.has(f) ? 'IN  ' : 'out ', f); })"
out  server/nvm/generate/proof-spec.ts
out  server/nvm/generate/craft-spec.ts
IN   server/lib/structure-presets.ts
IN   server/engine/types.ts
out  server/lib/validation.ts
out  server/nvm/quality/index.ts
out  server/routes/config.ts
out  server/nvm/converge/loop.ts
out  server/nvm/generate/llm-generator.ts
set size 67
```

`engine/types.ts` and `structure-presets.ts` are scoring-path by
`scripts/check-scoring-receipt.mjs`'s tier-2 rule, so touching either would
demand a measurement receipt for a change that moves no score. The
certificate is modelled as a structural extension instead
(`WithNecessity<T>`), which costs nothing: `OutlineBeatSchema` is
`.passthrough()`, the handler spreads `...beat`, and `Stage.ts` round-trips
the beat as JSON. That is also why the brief's `structure-presets.ts` beat
templates were left alone — a preset's `BeatTemplate` cannot gain a
certificate field without a receipt, and a preset has no author-stated
reasons to carry anyway.

Two behaviours at that seam are deliberate:

- **`beatId` is stamped server-side** from `phase:turn_start-turn_end` — the
  identity the engine already uses to select the active beat — never trusted
  from the client. That is what makes `beatIdMismatch` mean "this
  certificate was moved", not "the client sent a different string".
- **An untouched form is not stored.** Four blank answers are not an
  attempt; a partly filled form is, and is kept so the writer can finish it.

### 2.3 How it reaches generation

`SceneTarget.necessity` → `buildSystemPreamble()` → `spec.systemPreamble` →
`llm-generator.ts:224` → the provider.

- **Not folded into the numbered `PROOF CONSTRAINTS` list.** That list is
  what the proof kernel verifies (`server/nvm/proof/**`); no proof verifies
  a stated reason. Listing them there would claim a check that does not
  exist. They get their own labelled block.
- **A form-failing certificate injects nothing at all.** Three anchors out of
  four read to the model as the whole answer.
- **The consumer coerces.** `ConvergeArcBodySchema` types scene targets as
  `z.array(z.unknown())`, so `necessity` on a target is caller-controlled
  text: `coerceNecessityCertificate()` shape-checks it and flattens newlines
  (a raw newline in a four-line block forges a fifth line). Tested with a
  hostile answer and with five kinds of junk.
- **No behaviour change for existing callers.** A target without a
  certificate produces a preamble with no necessity block, and the no-target
  path is untouched — the craft-spec v1/v2 byte-identity tests still pass.

### 2.4 The writer's surface

Director HUD → Outline tab, per beat (Labs gating unchanged — the panel was
already Labs-only and this lane did not touch that). Four labelled
textareas, the honest sentence where the writer types, and a **Check
answers** button that calls the keyless route, so the rules have ONE
implementation on the server rather than a second copy in the browser.
Editing an answer clears the previous verdict rather than leaving a result
on screen that no longer describes what is in the box.

One defect was found and fixed on the way: `src/lib/api-schemas.ts`'s client
`OutlineBeatSchema` is a plain `z.object()`, and zod `.parse()` STRIPS
unknown keys — so without a client-side declaration the panel would load a
beat, silently drop the certificate the server had just stored, and destroy
it on the writer's next Save. The browser run's save-and-reload assertion is
what proves that path.

### 2.5 What is deliberately NOT wired

No client generates scenes from outline beats today.
`src/components/ArcPlannerPanel.tsx` builds scene targets from archetype
presets (`DEFAULT_ARC`), not from the outline, so nothing automatically
carries a beat's certificate into a converge run. Wiring one would require
inventing a scene→beat mapping — `sceneIdx` is a scene counter and beats are
turn ranges, and the engine's own beat lookup is by TURN — and an invented
mapping is a rule nobody could defend. The server seam is complete and
tested; the caller supplies the certificate for the scene it is generating.
The writer-facing sentence is worded to match exactly that (claims-register
row 118).

---

## 3. Proof: every rule shown failing first

Each form rule was disabled one at a time (its `reasons.push(...)` replaced
with `void 0`) and the test file re-run, then restored. Transcript in the
session scratch; the counts:

| rule disabled | pass | fail | tests that went red |
|---|---|---|---|
| `missing` | 20 | 2 | rule missing (both) |
| `empty` | 21 | 1 | rule empty |
| `too_short` | 20 | 2 | rule too_short, the archive's-10-chars case |
| `too_long` | 21 | 1 | rule too_long |
| `too_few_distinct_words` | 21 | 1 | rule too_few_distinct_words |
| `non_answer` | 21 | 1 | rule non_answer |
| `restates_context` | 20 | 2 | rule restates_context, the prompt-block suppression case |
| `duplicate_answer` | 21 | 1 | rule duplicate_answer |

With every rule in place: 23/23 pass.

The route-classification guard also fired before its fix rather than after:
adding `POST /api/outline/necessity-check` made
`tests/routes/route-capabilities.test.ts` fail with *"route(s) enumerated by
the live router but not classified anywhere"*, and the route was then
classified as deterministic (it imports no provider and carries
`gameLimiter`).

### The browser run

```
$ PW_CHROMIUM_PATH=/opt/pw-browsers/chromium node scripts/verify-necessity-surface.mjs
[verify] 20/20 assertions passed.
```

Covering: the four questions render; Tab walks from the first box through
all four and on to the Check button (`stops=["beat-0-necessity-whyNow",
"beat-0-necessity-whyHere","beat-0-necessity-whyThem",
"beat-0-necessity-forcingFunction","Check answers","Save to Engine"]`); the
honest copy is on screen and the block never claims to score; a placeholder
answer is reported as "1 unanswered" with a per-field reason and
`aria-describedby` pointing at it; exactly one reason paragraph renders, so
the three real answers are not second-guessed; editing an answer clears the
stale verdict; four well-formed answers report "All four answered"; the
answers survive Save → reload; dark theme renders; at 375px the boxes fit
the viewport with no horizontal overflow and the button is still reachable;
no console errors. Screenshots in `scripts/output/necessity-*.png`.

---

## 4. Gates

| gate | command | exit |
|---|---|---|
| module tests | `node --experimental-strip-types tests/core/necessity-certificate.test.ts` | 0 (23/23) |
| route tests | `node --experimental-strip-types tests/routes/outline-necessity.test.ts` | 0 (12/12) |
| injection tests | `node --experimental-strip-types tests/nvm/generate/necessity-injection.test.ts` | 0 (9/9) |
| route classification | `node --experimental-strip-types tests/routes/route-capabilities.test.ts` | 0 (6/6) |
| craft-spec regression | `node --experimental-strip-types tests/nvm/generate/craft-spec.test.ts` | 0 (26/26) |
| claims citations | `node --experimental-strip-types tests/core/claims-row-citations.test.ts` | 0 (5/5) |
| lint | `npm run lint` | 0 |
| no console | `npm run check-no-console` | 0 |
| server reachability | `npm run check-server-reachability` | 0 |
| build | `npm run build` | 0 |
| docs quality | `npm run check-docs` | 0 |
| honesty audit | `npm run honesty-audit` | 0 (118 rows, clean) |
| scoring receipt | `node scripts/check-scoring-receipt.mjs main..HEAD` | 0 — **no scoring-path files changed** |
| browser surface | `PW_CHROMIUM_PATH=… node scripts/verify-necessity-surface.mjs` | 0 (20/20) |
| CI-env replica | `npm run test:ci-env -- <the six touched test files>` | see §5 |
| brain | `npm run brain` · `npm run check-brain` · brain-coverage | see §5 |
| full suite | `npm test` | see §5 |

---

## 5. Late gates

Recorded after the report was first written, in the order run:

| gate | result |
|---|---|
| `npm run brain` | exit 0 — 117 notes, 466 links written |
| `npm run check-brain` | exit 0 — graph is fresh |
| `tests/core/brain-coverage.test.ts` | exit 0 (7/7) |
| `tests/core/claims-row-citations.test.ts` | exit 0 (5/5) — rows now run 1..118 with no gap |
| `tests/core/honesty-audit-claims.test.ts` | exit 0 (15/15) |
| `npm run test:ci-env -- <six touched test files>` | exit 0 — 62 tests, 0 fail |
| `npm run gates` | exit 0 |
| `npm test` (first run) | **exit 0 but 2 subtests RED** — see below |
| `npm run test:ci-env -- tests/scripts/vite-cache-dir.test.ts` | exit 0 (27/27) after the fix |
| `node scripts/check-scoring-receipt.mjs main..HEAD` (final tree) | exit 0 — no scoring-path files changed |
| `npm test` (final, after the fix) | exit 0 — **14,055 tests, 13,963 pass, 0 fail**, 91 skipped, 1 todo, 328.7 s |

**The two red subtests, and why they are worth reporting rather than
silently fixing.** `tests/scripts/vite-cache-dir.test.ts` pins two counts
under `scripts/`: how many files call `shutdown()` at the `graceMs = 0`
default (4), and how many `shutdown()` call sites exist in total (11, in 8
files). Both are checked against the comment beside `releaseViteCacheSlot()`
in `scripts/lib/browser-verify.mjs` that NAMES the callers. Adding
`scripts/verify-necessity-surface.mjs` made both stale, and the suite went
red on exactly those two assertions — which is the coupling they exist to
force. Fixed by moving the counts (5 files, 12 sites, 9 files) and naming
the new caller in that comment, in one commit. Note that `npm test` exits 0
even with failing subtests, so the counts above, not the exit code, are the
evidence.

Note also that the first `npm test` run was performed twice (once to see the
counts, once to read the failure text) before the fix; the final run above
is the single post-fix run the standard asks for.

---

## 6. Left undone, and why

1. **No client wires an outline beat's certificate into a converge run.**
   §2.5: a scene→beat mapping would have to be invented. The seam is
   complete server-side and the copy is worded to match.
2. **`ConvergeArcBodySchema` still validates scene targets as
   `z.array(z.unknown())`.** Tightening it to a real `SceneTarget` schema is
   the right change and is out of this lane's scope — it would alter the
   contract every converge caller depends on. The consumer coerces instead,
   so this lane's field cannot reach a prompt unvalidated; the other target
   fields (`sceneFunction`, `themeHint`) keep the exposure they already had.
   Worth a lane of its own.
3. **No metric for whether certificates improve generated scenes.** There is
   no measurement here at all, deliberately: that would need a graded set of
   generations, which Decision #3 says is the thing to fund before
   re-promoting the generative surface — not something to fake with a
   deterministic proxy.
4. **`necessityScore` (the op-level one) is untouched.** Different concept,
   §1. Renaming either is a migration, not a side effect of this lane.
5. **The certificate is not shown anywhere outside the Director HUD** — no
   export, no coverage report, no letter. Nothing else claims to show it.

---

Tip: `<filled in at the final commit>`
