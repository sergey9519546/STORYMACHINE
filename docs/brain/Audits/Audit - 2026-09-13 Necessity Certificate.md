---
type: audit
updated: 2026-09-13
sources: [docs/audits/2026-09-13-necessity/necessity-lane-report.md, server/lib/necessity-certificate.ts, server/lib/validation.ts, server/routes/config.ts, server/nvm/generate/proof-spec.ts, src/components/DirectorPanel.tsx, src/lib/api-schemas.ts, scripts/verify-necessity-surface.mjs, docs/story-generation/NECESSITY_CERTIFICATE.md, docs/research-archive/_CLEVER_MOVES.md, docs/DECISION_LOG.md]
status: active
---

# Audit — 2026-09-13 Necessity Certificate

**Directory:** `docs/audits/2026-09-13-necessity/` — one lane report for
`lane/necessity-certificate`, the lane that built
`docs/research-archive/_CLEVER_MOVES.md` §10's Necessity Certificate: four
questions an author answers about a scene before it is generated (why now,
why here, why these characters, what makes it unavoidable), attached to the
outline beat, stated to the generator as constraints, and FORM-checked
rather than judged.

## What it is

`server/lib/necessity-certificate.ts` holds the type and `checkNecessity()`
— a pure, deterministic check of the TEXT of the four answers: present,
non-empty, at least 16 characters, at least 4 DISTINCT words, not made only
of placeholder phrases, not a restatement of the scene's own heading, not a
copy of a sibling answer, not over the 500-character cap the beat's other
text fields already carry. No model call, no corpus, no score. It answers
"did you answer?" and never "is that a good reason?" — the rule
[[Decision 8 - Necessity Certificate is Form-Checked Never Judged]] records
as standing, and the direct application of NORTH_STAR §1's *no
LLM-as-judge*.

Each rule was shown failing first, by disabling it one at a time and
re-running the file (the report's §3 table); 23/23 with every rule in place.

## What the archive got right, and wrong

Right: the principle, the failure mode (the SKIPPED question, not the weak
answer), and the instruction not to LLM-judge a stated reason.

Wrong, twice. Its field comments promise semantic checks ("must reference a
time-specific event") that its own code does not implement and that cannot
be implemented without judging — a reader following the comments builds the
judge the same section forbids, and a DETERMINISTIC judge is the worse of
the two, since a rule demanding a clock noun passes "at some point soon" and
fails "the vault opens once and it is opening". And its only real rule,
`length >= 10`, passes `"aaaaaaaaaa"`, `"TBD later."` (exactly 10) and the
writer who pastes one sentence into all four boxes: it catches the empty
box, not the skipped question.

## Where it attaches, and the scoring-path constraint that shaped it

Inside the `OutlineBeat` (`POST /api/outline` →
`Illusion_State.outline_json` → `GET /api/outline`), not as a field on
`server/engine/types.ts`'s `OutlineBeat` — that file is INSIDE
`server/nvm/analyze/doctor.ts`'s reachable set (verified with
`scripts/lib/import-graph.mjs`'s `computeReachableSet`), so it is
scoring-path by [[Gate - Receipt Gate]]'s tier-2 rule and widening it would
demand a measurement receipt for a change that moves no score. The same
finding is why `server/lib/structure-presets.ts`'s beat templates, which the
brief named as a candidate surface, were left alone. `OutlineBeatSchema` is
`.passthrough()`, so the field survives the whole path; the lane's work was
to type, validate and sanitize it. `check-scoring-receipt main..HEAD`
reports no scoring-path files changed.

The server stamps `beatId` from the beat itself
(`phase:turn_start-turn_end`, the identity
`server/engine/agent/decision.ts:196` and
`server/engine/DirectorNode.ts:874` already use), never trusting the
client's — which is what makes a later mismatch mean "this certificate was
moved".

## How it reaches generation, and what the brief expected that was not true

`SceneTarget.necessity` → `buildSystemPreamble()` → `spec.systemPreamble` →
the provider. The brief expected the final hookup to be one line another
lane would have to add inside `llm-generator.ts` (a file this lane could not
touch). It is not: that file already sends `spec.systemPreamble` verbatim
(`llm-generator.ts:224`), and the preamble is built in `proof-spec.ts`, so
the certificate reaches the model with `llm-generator.ts` unchanged. A test
reads that file's source so the link cannot vanish silently.

Three deliberate choices: the four answers are NOT listed among the numbered
`PROOF CONSTRAINTS` (no proof verifies a stated reason — listing them would
claim a check that does not exist); a form-failing certificate injects
NOTHING, because three anchors out of four read as the whole answer; and the
consumer coerces, because `ConvergeArcBodySchema` types scene targets as
`z.array(z.unknown())` and a raw newline in one answer would forge a fifth
line in a four-line block.

## What it found on the way

`src/lib/api-schemas.ts`'s client `OutlineBeatSchema` is a plain
`z.object()`, and zod `.parse()` STRIPS unknown keys — so the Director HUD
would have loaded a beat, dropped the certificate the server had just
stored, and destroyed it on the writer's next Save. Fixed, and the browser
run's save-and-reload assertion is what proves it.

## What is deliberately not wired

No client generates scenes from outline beats: `ArcPlannerPanel.tsx` builds
scene targets from archetype presets, not from the outline. Wiring one would
require inventing a scene→beat mapping (`sceneIdx` is a scene counter, beats
are turn ranges), so the lane stopped at the tested server seam and worded
the writer-facing sentence to match — `docs/CLAIMS_REGISTER.md` row 118 is
conditional on purpose, and row 117 registers the disclaimer.

## Surface and gates

Director HUD → Outline tab, per beat (Labs gating unchanged): four labelled
textareas, the honest sentence where the writer types, and a Check answers
button calling the keyless deterministic route
`POST /api/outline/necessity-check` — one implementation of the rules, on
the server. `scripts/verify-necessity-surface.mjs` drives it: 20/20, both
themes, 375px, Tab reachability, and the save-and-reload round trip.

**Related:** [[Decision 8 - Necessity Certificate is Form-Checked Never Judged]],
[[Gate - Receipt Gate]], [[Patterns]] (a check that cannot be gamed into
looking like a judge is worth more than a judge nobody can inspect),
`docs/story-generation/NECESSITY_CERTIFICATE.md`.

## Sources

- `docs/audits/2026-09-13-necessity/necessity-lane-report.md`
- `server/lib/necessity-certificate.ts`
- `server/lib/validation.ts`
- `server/routes/config.ts`
- `server/nvm/generate/proof-spec.ts`
- `src/components/DirectorPanel.tsx`
- `src/lib/api-schemas.ts`
- `scripts/verify-necessity-surface.mjs`
- `docs/story-generation/NECESSITY_CERTIFICATE.md`
- `docs/research-archive/_CLEVER_MOVES.md` — §10
- `docs/DECISION_LOG.md` — "Decision #8"
