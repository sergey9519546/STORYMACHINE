---
type: audit
updated: 2026-09-19
sources: [docs/audits/2026-09-19-generation-prompt-inputs/README.md, server/nvm/generate/proof-spec.ts, server/nvm/revision/rewrite-llm.ts, server/lib/prompt-utils.ts, tests/nvm/generate/theme-hint-injection.test.ts, tests/core/approved-span-sanitization.test.ts, docs/story-generation/STORY_BENCH_2026-09-13.md, SESSION_REPORT_2026-09-19.md]
status: active
---

# Audit — 2026-09-19 Generation Prompt Inputs

**Directory:** `docs/audits/2026-09-19-generation-prompt-inputs/` — the lane
record for two small, verified fixes to what the story-generation prompts are
told, added on `claude/fable-5-1-orchestrator-yil0xr` from `3d96d0da`.

## What it answers

SESSION_REPORT_2026-09-19.md §4's top two unaddressed findings, both about the
generative pipeline's prompt plumbing rather than the model itself:

1. **`themeHint` — the whole semantic content of a scene beat — was declared on
   `SceneTarget` and read by nothing.** `docs/story-generation/
   STORY_BENCH_2026-09-13.md` §1: the bench's beats are hand-authored per
   scene, and every one of them was discarded before the prompt, so
   generation ran "advance_plot at tension 45" with no subject.
   `buildSystemPreamble()` (`server/nvm/generate/proof-spec.ts`) now states a
   non-empty `themeHint` as a labelled `SCENE BEAT` line, adjacent to the
   PROOF CONSTRAINTS section — the one place in that preamble that already
   states the scene's tension target in prose.
2. **`approvedSpans[].reason` was interpolated raw into the 14-pass revision
   prompt** — the only field on that prompt line that skipped sanitization,
   reachable because the route casts `z.array(z.unknown())` straight to
   `ApprovedSpan[]`. `server/nvm/revision/rewrite-llm.ts`'s
   `approvedSpanInstructions()` now runs `reason` through `sanitizeSingleLine`
   (not `sanitizeForPrompt`, which deliberately preserves newlines for prose —
   the wrong tool for a strictly single-line bracketed marker) and omits the
   `— reason:` clause entirely when `reason` is not a string.

## Why it is safe to have merged

Nothing on the scoring path changed — `node scripts/check-scoring-receipt.mjs
3d96d0da..HEAD` reports *no scoring-path files changed*; neither
`server/nvm/generate/proof-spec.ts` nor `server/nvm/revision/rewrite-llm.ts`
is reachable from `doctor.ts`. Both fixes are fail-first tested: the new
themeHint tests fail 6 of 9 against the pre-fix tree, the new approved-span
tests fail 5 of 7 against it (raw `${s.reason}` interpolation), and both pass
fully after. `themeHint` absent (undefined, empty, or whitespace-only)
produces a byte-identical preamble, asserted by deep string equality, not a
marker-string check — the same discipline
[[Decision 8 - Necessity Certificate is Form-Checked Never Judged]]'s
injection test uses for the sibling field on the same interface.

Neither field is added to the numbered PROOF CONSTRAINTS list
`proofsToConstraints()` builds: no proof in `server/nvm/proof/**` verifies
that a scene matches its stated beat, so listing it there would claim a check
that does not exist — the same decision the necessity certificate made for
the identical reason, applied here rather than reinvented.

**Related:** [[Generation - Story Bench]],
[[Decision 3 - Demote Generative Surface to Labs]],
[[Audit - 2026-09-19 TypeSafe Cast Alignment]], [[Patterns]],
`docs/LANE_STANDARD.md`,
`docs/audits/2026-09-19-generation-prompt-inputs/README.md`.

## Sources

- `docs/audits/2026-09-19-generation-prompt-inputs/README.md`
- `server/nvm/generate/proof-spec.ts`
- `server/nvm/revision/rewrite-llm.ts`
- `server/lib/prompt-utils.ts`
- `tests/nvm/generate/theme-hint-injection.test.ts`
- `tests/core/approved-span-sanitization.test.ts`
- `docs/story-generation/STORY_BENCH_2026-09-13.md`
- `SESSION_REPORT_2026-09-19.md`
