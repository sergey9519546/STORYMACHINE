---
type: audit
updated: 2026-09-19
sources: [docs/audits/2026-09-19-locked-spans/README.md, server/nvm/revision/rewrite-llm.ts, server/nvm/revision/rewrite.ts, tests/core/approved-spans-enforced.test.ts, tests/core/approved-span-sanitization.test.ts, SESSION_REPORT_2026-09-19.md, docs/audits/2026-09-19-generation-prompt-inputs/README.md]
status: active
---

# Audit — 2026-09-19 Locked Spans

**Directory:** `docs/audits/2026-09-19-locked-spans/` — the lane record for
making the revision rewrite's "approved spans are never changed" promise
true in code, at the one seam off the scoring path
(`server/nvm/revision/rewrite-llm.ts`), added on `lane/locked-spans` from
`53f6e377`.

## What it answers

The still-open half of SESSION_REPORT_2026-09-19.md §4 rank 2 / logic audit
C3: `pipeline.ts:128` documents `approvedSpans` as "never changed by any
pass," but the only enforcement was a sentence in the LLM prompt.
`evaluateRewrite` (`rewrite.ts`) checks only finish-reason and a 0.80 length
ratio, so a model that deleted the locked text and padded elsewhere was
**accepted** — the session's probe `p9.ts` showed exactly that, `usedLLM:
true` with the locked dialogue gone.

**The fix — `approvedSpansSurvive(originalFountain, revisedText, spans)`.** A
new, pure, exported function in `rewrite-llm.ts`: for each approved span, take
its excerpt from the *input* fountain at `startLine..endLine` (the same lines
the prompt showed), normalise line endings only, and require it to appear
verbatim as a contiguous substring of the revised text. Spans with
non-finite/out-of-range lines are `skipped` (logged, not fatal) rather than
silently passed or failed; a stale `endLine` past the document is clamped and
still checked. `llmRewrite()` calls this right after `evaluateRewrite`
accepts a candidate; if any locked span is lost, the rewrite is rejected the
same way the finish-reason/length guards already are — original fountain
back, `usedLLM: false`, plus `reason: 'approved_span_lost'` and
`lostSpans: number[]` — and a structured log line
(`revision_rewrite_rejected_locked_span`) names the lost indices and counts,
never the span or draft text.

**Contract preserved without editing `rewrite.ts`.** `RewriteResult`'s
declared shape was not touched; `llmRewrite`'s own return type was widened,
locally, to a strict supertype (`RewriteResult & { reason?; lostSpans? }`),
assignable to `rewrite.ts`'s `LlmRewriter` type via ordinary return-type
covariance. With `approvedSpans: []`, an accepted rewrite's result key set is
still exactly `['revised', 'usedLLM']` — asserted, not merely believed.

**What stays unfixed, and why.** Approved-span line indices are 1-based into
the *original* fountain, but `pipeline.ts` (off-limits, on `doctor.ts`'s
reachable set) threads the same `approvedSpans` array unchanged through all
14 passes while `currentFountain` changes under them — so a span's indices
can already be pointing at the wrong lines of a later pass's INPUT document
before this lane's check even runs. This lane's check is correct for the one
document it is handed each call; it cannot fix indices going stale across
passes without editing `pipeline.ts`, which the assignment named off-limits.

## Why it is safe to have merged

Nothing on the scoring path changed: `node scripts/check-scoring-receipt.mjs
53f6e377..HEAD` reports *no scoring-path files changed*, and
`server/nvm/revision/rewrite-llm.ts` is not reachable from `doctor.ts` (the
same non-reachability `rewrite-llm.ts`'s own header documents). Fail-first
tested: a standalone probe against the pre-fix file shows the locked excerpt
gone with `usedLLM: true`; the identical probe against the fixed file shows
the original fountain returned, `usedLLM: false`,
`reason: 'approved_span_lost'`. The new
`tests/core/approved-spans-enforced.test.ts` (15 assertions, pure-function
and live-with-a-fake-provider coverage) and the pre-existing
`tests/core/approved-span-sanitization.test.ts` (7 assertions, unmodified)
both pass, as do `tests/core/llm-seam-wiring.test.ts`,
`tests/core/pure-core-boundary.test.ts`, and the three
`tests/routes/nvm-revision*.test.ts` gate files. `npm run lint` and
`npm run check-no-console` are clean.

**Update (2026-09-19, span-check-hardening lane, from `1e7779de`).** An
adversarial review of this commit (`f70ab07d`) confirmed two more defects in
`approvedSpansSurvive` — a CRLF/end-of-document false-rejection (finding 3)
and two vacuously-passing excerpt shapes, blank-line spans and duplicated
single lines (finding 4) — both fixed with new hardening tests; see
`docs/audits/2026-09-19-locked-spans/README.md` §8 "Review findings fixed"
for the full account. Nothing in this note's account above became wrong; the
fix narrows what "survived" is allowed to mean.

**Note on this note.** Per this lane's explicit instruction, `npm run brain`
was not run, so `docs/brain/brain.graph.json`/`GRAPH.md` do not yet include
this note — `tests/core/brain-coverage.test.ts` checks (e)/(e2)/(f)/(g),
which compare the vault against a freshly rebuilt graph, are expected to
report the graph as stale until an integrator regenerates it. Check (b) (every
`docs/audits/` directory cited by a vault note) is satisfied by this note
existing.

**Related:** [[Audit - 2026-09-19 Generation Prompt Inputs]],
[[Decision 3 - Demote Generative Surface to Labs]], [[Patterns]],
`docs/LANE_STANDARD.md`, `docs/audits/2026-09-19-locked-spans/README.md`.

## Sources

- `docs/audits/2026-09-19-locked-spans/README.md`
- `server/nvm/revision/rewrite-llm.ts`
- `server/nvm/revision/rewrite.ts`
- `tests/core/approved-spans-enforced.test.ts`
- `tests/core/approved-span-sanitization.test.ts`
- `SESSION_REPORT_2026-09-19.md`
- `docs/audits/2026-09-19-generation-prompt-inputs/README.md`
