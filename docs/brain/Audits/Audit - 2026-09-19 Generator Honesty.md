---
type: audit
updated: 2026-09-19
sources: [docs/audits/2026-09-19-generator-honesty/README.md, server/nvm/generate/llm-generator.ts, server/nvm/ops/dispatcher.ts, scripts/story-bench.mjs, tests/core/llm-generator-parse.test.ts, tests/core/openai-compat-generation-guards.test.ts]
status: active
---

# Audit — 2026-09-19 Generator Honesty

**Directory:** `docs/audits/2026-09-19-generator-honesty/` — the lane
record for three correctness fixes in the LLM candidate generator's parse
layer, `server/nvm/generate/llm-generator.ts`, on `lane/generator-honesty`
from `53f6e377`. One of six parallel lanes the 2026-09-19 orchestrator
session queued from its own findings
(`SESSION_REPORT_2026-09-19.md` §4, rows 9 and 14).

## What it answers

**Row 9 — beliefs collapsed to one.** `parseOp`'s `UPDATE_BELIEF` branch
validated only `proposition` and `charId`; `belief.id` was cast through
unchecked even though `IR_SCHEMA` already declared it required.
`server/nvm/ops/dispatcher.ts:34-39` upserts on `b.id === op.belief.id`,
so two id-less `UPDATE_BELIEF`s for one character both matched
`undefined === undefined` and the second silently replaced the first —
verified live: applying both through the real dispatcher left one belief,
not two. Fixed by validating every `Belief` field (mirroring the
`APPRAISE_EMOTION` branch's existing per-field discipline) and
synthesizing a deterministic `` belief_<8-hex sha256(charId|proposition)> ``
id when the model omits one, rather than rejecting the op — rejecting
would re-stub the whole candidate when `ops.length` hits 0, which is a
worse failure than a model that forgot to name its own belief.
`SHIFT_RELATIONSHIP.delta` and `UPDATE_READER_STATE.delta` got the same
treatment (the latter's fields are genuinely all-optional, so `{}` is
still accepted for it, unlike the former).

**Row 14 — stub identifiability and a hard-coded model.**
`stubIR()` and a real parsed candidate both carried
`provenance.origin: 'model_generated'`; `provenance.model` was the field
that already told them apart (`stubIR` sets the literal `'stub'`), but
nothing made that the single, owned distinction, and the model string for
every parsed candidate was hard-coded to `'gemini'` regardless of the
configured provider. Fixed with an exported `isStubIR(ir)` helper (origin
left untouched — widening `ProvenanceOrigin` would mean re-auditing ~15
call sites across `server/` for a distinction none of them need) and by
threading the actual resolved `candidateModel`
(`ai.modelForTask('CANDIDATE')`) into `parseIR` instead of the constant.
`scripts/story-bench.mjs` and
`tests/core/openai-compat-generation-guards.test.ts` were grepped for
`provenance.model === /!== 'stub'` and routed through the new helper.

**Row 14 (continued) — a bad causal link stubbed the whole scene.** The
`causalLinks` filter read `.opIdx` off each element with no object guard;
one `null` element threw out of `parseIR` into the outer catch, which
stubs **all `n` candidates requested for the scene**. Fixed with a
per-element `object && Number.isInteger(opIdx)` guard that drops the bad
element instead of throwing.

## Why it is safe to have merged

Not scoring-path: `check-scoring-receipt.mjs 53f6e377..HEAD` reports "no
scoring-path files changed. OK." — `server/nvm/analyze/**`,
`server/nvm/revision/**`, and `server/nvm/ops/dispatcher.ts` (the
collapse site itself) are all read-only in this lane, none modified.

Fail-first tested: `git stash push -- server/nvm/generate/llm-generator.ts`
reverted the file to `53f6e377`'s content; a probe script showed, against
the unfixed source, the exact collapse (1 belief survives two id-less
`UPDATE_BELIEF`s, both with `id: undefined`), the NaN-risk (`confidence`
stays the string `"high"`), and the SHIFT_RELATIONSHIP `delta: {}`
acceptance the defect describes. The new test file
(`tests/core/llm-generator-parse.test.ts`, 16 cases) failed to even load
against the pre-fix source (`isStubIR` is not exported there); `git stash
pop` restored the fix and all 16 pass. Full gate table — including
`npm run lint`, `check-no-console`, and six sibling test files that import
or exercise this module — is in the audit README.

**Left to the orchestrator:** `npm run brain` was deliberately not run
in this lane (per its brief — the orchestrator regenerates once after
merging all six lanes), so `brain-coverage.test.ts`'s freshness check
(e) is expected to fail until that regeneration happens; every
content-level brain check ((a)-(d), (f), (g)) passes with this note in
place.

**2026-09-19 (generator-parse-hardening lane), post-merge adversarial
findings fixed in the same file:** a `causalLink` missing/malformed
`causedBy` used to 500 the whole converge request (Finding 2), and
`SHIFT_RELATIONSHIP.delta.amount`/`UPDATE_READER_STATE`'s `null` fields
used to drop the whole op inconsistently with `confidence`'s clamp policy
(Finding 6) — see "§ Review findings fixed" in
`docs/audits/2026-09-19-generator-honesty/README.md` for both fixes, the
fail-first test output, and the policy chosen.

**Related:** [[Audit - 2026-09-13 Story Bench Lane]],
[[Audit - 2026-09-19 Harness Honesty]], [[Patterns]],
`docs/audits/2026-09-19-generator-honesty/README.md`.

## Sources

- `docs/audits/2026-09-19-generator-honesty/README.md`
- `server/nvm/generate/llm-generator.ts`
- `server/nvm/ops/dispatcher.ts`
- `scripts/story-bench.mjs`
- `tests/core/llm-generator-parse.test.ts`
- `tests/core/openai-compat-generation-guards.test.ts`
