# The Necessity Certificate

**Status:** built 2026-09-13 (`lane/necessity-certificate`).
**Code:** `server/lib/necessity-certificate.ts` ·
`server/lib/validation.ts` (schemas) · `server/routes/config.ts` (attach +
check route) · `server/nvm/generate/proof-spec.ts` (prompt injection) ·
`src/components/DirectorPanel.tsx` (the writer's surface).
**Tests:** `tests/core/necessity-certificate.test.ts` ·
`tests/routes/outline-necessity.test.ts` ·
`tests/nvm/generate/necessity-injection.test.ts` ·
`scripts/verify-necessity-surface.mjs` (browser).

## What it is

Four questions the author answers about a scene, before the scene is
generated:

| field | question |
|---|---|
| `whyNow` | Why this moment, and not earlier or later? |
| `whyHere` | Why this place? |
| `whyThem` | Why these characters and no others? |
| `forcingFunction` | What makes this scene unavoidable — what pressure means it cannot be skipped? |

The answers are stored on the outline beat they belong to, and a scene
generated from that beat carries all four into the generation prompt as
stated constraints.

## The one rule that shapes everything else: form-checked, not judged

`checkNecessity()` checks that each question was **answered**. It never
checks whether an answer is **good**. No model call, no corpus, no score —
the same input returns the same result forever.

This is not caution, it is the constitution: NORTH_STAR §1, *no
LLM-as-judge* — every verdict a user sees is a deterministic rule, and LLMs
may SENSE but never SCORE. A checker that graded a stated reason would be
exactly the banned thing wearing a quality feature's clothes. Recorded as a
standing constraint in `docs/DECISION_LOG.md` (Decision #8).

The value is the 90% case: the question that was skipped. A writer who
answers thoughtfully but wrongly is not this feature's failure mode, and
chasing that case is how the check turns into a judge.

## The eight form rules

Each is a property of the TEXT. Each is tested in both directions, and each
was shown failing first against a build with that one rule removed
(`docs/audits/2026-09-13-necessity/necessity-lane-report.md`).

| code | fires when | why this rule, at this threshold |
|---|---|---|
| `missing` | the field is absent or not a string | the form was not filled in |
| `empty` | the field trims to nothing | an empty box is not an answer |
| `too_short` | under **16** characters | no single English word reaches 16, and every real minimal answer clears it ("The vault shuts at dawn" is 22). The archive's 10-char floor passes "TBD later." exactly |
| `too_long` | over **500** characters | the same cap the beat's own goal/constraint/avoid already carry; these strings travel the same road into a prompt |
| `too_few_distinct_words` | fewer than **4** distinct words | a word floor alone is beaten by "because because because because"; a character floor alone by "aaaaaaaaaaaaaaaaaa". Counting DISTINCT words closes both with one rule |
| `non_answer` | nothing survives removing placeholder phrases | "TBD", "because the plot needs it", "to move the story forward". Matched as whole token sequences, so "none" never fires inside "nonetheless", and a real answer that merely CONTAINS a filler word still passes |
| `restates_context` | fewer than **2** non-stop words beyond the scene heading/goal | "the vault at night" against `INT. VAULT - NIGHT` restates the question instead of answering it. Only runs when the caller supplies context; it never guesses |
| `duplicate_answer` | the normalized text equals another field's | one sentence pasted into two boxes means at least one question is unanswered |

Thresholds are a floor on **effort**, never on quality: a 16-character,
four-word, shallow answer passes on purpose, and
`tests/core/necessity-certificate.test.ts` pins exactly that.

## Where it attaches

Inside the `OutlineBeat` the writer already edits:
`POST /api/outline` → `Illusion_State.outline_json` → `GET /api/outline`. It
travels with the beat through save, reload and export with no second store.

It is **not** a field on `server/engine/types.ts`'s `OutlineBeat` because
that file is inside `server/nvm/analyze/doctor.ts`'s reachable set —
scoring-path by `scripts/check-scoring-receipt.mjs`'s tier-2 rule — so
widening it would demand a measurement receipt for a change that touches no
score. `OutlineBeatSchema` is `.passthrough()` and the handler spreads
`...beat`, so the field survives the whole path; the lane's job was to type,
validate and sanitize it.

Two behaviours at that seam are deliberate:

- **`beatId` is stamped by the server** from the beat itself
  (`phase:turn_start-turn_end`, the identity
  `server/engine/agent/decision.ts:196` and
  `server/engine/DirectorNode.ts:874` already use to select the active
  beat), never trusted from the client. That is what makes a later
  `beatIdMismatch` mean "this certificate was moved", not "the client sent
  a different string".
- **An untouched form is not stored.** Four blank answers are not an
  attempt; a partly filled one is, and is stored so the writer can finish
  it.

## How it reaches generation

`SceneTarget.necessity` → `buildSystemPreamble()` → `spec.systemPreamble` →
the provider (`server/nvm/generate/llm-generator.ts:224` sends the preamble
verbatim). The block states the four answers and one instruction: the scene
must be unmistakably about this moment, this place, these characters and
this pressure.

Three choices worth naming:

1. **Not in the numbered PROOF CONSTRAINTS list.** That list is what the
   proof kernel verifies (`server/nvm/proof/**`), and no proof verifies a
   stated reason. Listing them there would claim a check that does not
   exist.
2. **Incomplete means nothing is injected.** Three anchors out of four would
   read to the model as the whole answer.
3. **The consumer coerces.** `ConvergeArcBodySchema` types scene targets as
   `z.array(z.unknown())`, so `necessity` is caller-controlled text:
   `coerceNecessityCertificate()` shape-checks it and flattens newlines,
   which on a four-line block would otherwise forge a fifth.

**What is NOT wired, and why.** No client generates scenes from outline
beats today — `ArcPlannerPanel.tsx` builds scene targets from archetype
presets (`DEFAULT_ARC`), not from the outline — so nothing automatically
carries a beat's certificate into a converge run. A scene→beat mapping would
have to be invented (`sceneIdx` is a scene counter; beats are turn ranges),
and inventing one is how a pipeline gets a rule nobody can defend. The seam
is complete and tested on the server side; the caller supplies the
certificate for the scene it is generating.

## Not the same thing as `necessityScore`

`server/nvm/quality/index.ts:546` exports `necessityScore(ops, state)`,
which scores the StoryOp list of an already-generated scene — how many ops
earn their place. It never sees a stated reason. This module never sees an
op. Two names, two inputs, two stages; neither is a better version of the
other, and they are deliberately not merged.

## What the archive got right and wrong

`docs/research-archive/_CLEVER_MOVES.md` §10 ("The Necessity Engine: It's a
Form, Not a Judge") is the source, and its principle is exactly right: ask
once at outline time, store the answers, audit that they exist, do not
LLM-judge whether a reason is good.

Two things in it do not survive contact:

- Its field comments promise semantic checks — "must reference a
  time-specific event", "must reference a location-specific feature" — that
  its own code does not implement and that cannot be implemented without
  judging. A reader following the comments rather than the code would build
  the judge the same section forbids.
- Its only real rule is `v?.length >= 10`, which passes "aaaaaaaaaa",
  "TBD later." and the writer who pastes one sentence into all four boxes.
  A 10-character floor catches the empty box, not the skipped question.

## The writer's surface

Director HUD → Outline tab, per beat (Labs-gated, unchanged by this lane).
Four labelled textareas, the honest sentence where the writer types, and a
**Check answers** button that calls `POST /api/outline/necessity-check` — so
the rules have one implementation on the server rather than a second copy in
the browser. Editing an answer drops the previous verdict rather than
leaving a result on screen that no longer describes what is in the box.

The route is keyless and deterministic: no AI import, no session read, no
clock. It answers the same with or without an API key.
