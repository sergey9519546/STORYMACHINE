---
type: audit
updated: 2026-09-20
sources: [docs/audits/2026-09-20-approved-spans-schema/README.md, docs/audits/2026-09-20-per-pass-diagnostics/README.md, server/lib/validation.ts, server/routes/nvm/revision.ts, server/nvm/revision/passes/types.ts, server/nvm/revision/approved-spans.ts, server/nvm/revision/rewrite-llm.ts, src/components/RevisionPanel.tsx, tests/routes/nvm-revision-approved-spans-schema.test.ts]
status: active
---

# Audit — 2026-09-20 Approved Spans Schema

**Directory:** `docs/audits/2026-09-20-approved-spans-schema/` — closes the
gap recorded by the per-pass-diagnostics lane
(`docs/audits/2026-09-20-per-pass-diagnostics/README.md` §8, "No stricter
schema for `approvedSpans` at the route"), on `lane/approved-spans-schema`
from `5d1a14ce`.

## What it answers

`approvedSpans` (`ApprovedSpan[]`, `server/nvm/revision/passes/types.ts`)
reached `POST /api/nvm/revise` as `z.array(z.unknown())`, force-cast at the
route (`server/routes/nvm/revision.ts`). Every consumer — `relocateApprovedSpans`
(`server/nvm/revision/approved-spans.ts`) and `approvedSpanInstructions`
(`server/nvm/revision/rewrite-llm.ts`) — tolerates a malformed span by
skipping it (a non-finite/out-of-range `startLine`/`endLine` lands in
`relocateApprovedSpans`'s `skipped` bucket; a non-string `reason` becomes
`''`). That tolerance is the right behaviour for a caller that reaches those
functions directly, but at the HTTP route it meant a client that sent the
wrong shape got **no error and no lock** — the span was silently dropped
rather than rejected.

**Fix.** `ApprovedSpanSchema` (`server/lib/validation.ts`): `startLine`/
`endLine` as `z.number().int()` (`startLine >= 1`, rejecting the `"3"`-style
string that used to reach `Number.isFinite` and be shrugged off rather than
rejected), a `.refine` for `endLine >= startLine` naming both fields in its
message, and an optional `reason` (`noControlChars.max(500)` — the same
helper `SceneTargetSchema`'s `themeHint` uses). `reason` optional matches the
consumers' actual tolerance, not the `ApprovedSpan` interface's `required`
annotation, which nothing enforces today. The array is capped at 200.
`ReviseBodySchema` now reads `z.array(ApprovedSpanSchema).optional()` in
place of `z.array(z.unknown()).optional()` — optionality unchanged.
`GET /api/nvm/revise-stream` takes no `approvedSpans` at all (confirmed via
its schema's own 2026-09-19 comment) and was not touched.

**Sender inventory.** Exactly one HTTP sender exists:
`src/components/RevisionPanel.tsx`, which POSTs only to the non-streaming
route and already enforces, client-side, bounds tighter than the new schema
(integer lines `>= 1`, `startLine <= endLine`, a non-empty `reason` capped at
300 chars) — so no `src/` change was needed. Every other `approvedSpans`
reference in the repo (`tests/passes/relationship-arc.test.ts`,
`tests/nvm/revision/*`, `tests/core/approved-span-sanitization.test.ts`,
`tests/core/approved-spans-enforced.test.ts`) is a module-layer call directly
into the pass/consumer functions, never through the HTTP route, so this
schema does not gate them.

**Route comment, not route behaviour.** `validate()` does not replace
`req.body` (it only `safeParse`s and calls `next()`), so
`server/routes/nvm/revision.ts` still reads and casts the raw body — but by
the time the handler runs, `ApprovedSpanSchema` has already rejected anything
that would not satisfy `ApprovedSpan`'s shape, so the cast changed from "the
caller's word for it" to schema-backed. Comments at both cast sites were
updated; no line of route logic changed.

## Why it is safe to have merged

Fail-first, verified live: `tests/routes/nvm-revision-approved-spans-schema.test.ts`
run against the pre-change tree is 4 pass / 6 fail — the 6 failures are
exactly the 6 cases that assert 400 (`startLine: 0`, `endLine < startLine`,
`startLine: '3'`, `reason: 42`, a 501-char `reason`, 201 spans), every one of
which returned 200 pre-change. Post-change: 10/10. The 4 cases that were
already 200 pre-change (no `reason`; a 500-char `reason`; exactly 200 spans;
`approvedSpans` omitted) stayed 200 post-change — the change only adds
rejection, it accepts nothing new. `tests/routes/nvm-revision.test.ts` (12/12),
`tests/core/approved-span-sanitization.test.ts` (7/7) and
`tests/core/approved-spans-enforced.test.ts` (22/22, both unmodified —
module-layer, not route-layer) stay green.
`node scripts/check-scoring-receipt.mjs 5d1a14ce..HEAD` reports "no
scoring-path files changed" — `server/lib/validation.ts` is confirmed off the
scoring path, as the lane brief stated. `tsc --noEmit` and `check-no-console`
are clean. `npm test` and `npm run brain` were out of scope for this lane and
were not run.

**2026-09-20 addendum (review finding 2, HIGH):** the schema above bounded
span *count* but not per-span or per-request *size* — `endLine` had no
upper bound and `approvedSpanInstructions` sliced unclamped, so
`{startLine: 1, endLine: 9007199254740991}` x200 on a 4,000-line draft built
a 57 MB prompt block. Fixed with a per-span `endLine` ceiling and a
per-request total-line-count `superRefine` in `server/lib/validation.ts`,
plus an independent char-cap/clamp inside `approvedSpanInstructions`
(`server/nvm/revision/rewrite-llm.ts`) for callers that bypass the route.
Full writeup: `docs/audits/2026-09-20-approved-spans-schema/README.md` §
"Review finding 2: per-span and per-request bounds".

**Related:** [[Audit - 2026-09-20 Per-Pass Diagnostics]],
[[Audit - 2026-09-19 Cast Grounding]], [[Patterns]],
`docs/audits/2026-09-20-approved-spans-schema/README.md`.

## Sources

- `docs/audits/2026-09-20-approved-spans-schema/README.md`
- `docs/audits/2026-09-20-per-pass-diagnostics/README.md`
- `server/lib/validation.ts`
- `server/routes/nvm/revision.ts`
- `server/nvm/revision/passes/types.ts`
- `server/nvm/revision/approved-spans.ts`
- `server/nvm/revision/rewrite-llm.ts`
- `src/components/RevisionPanel.tsx`
- `tests/routes/nvm-revision-approved-spans-schema.test.ts`
