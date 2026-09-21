# Lane record — approved spans schema (2026-09-20)

**Branch:** `lane/approved-spans-schema`, from `5d1a14ce`.
**Scope:** the gap recorded by the per-pass-diagnostics lane
(`docs/audits/2026-09-20-per-pass-diagnostics/README.md` §8, "No stricter
schema for `approvedSpans` at the route") — `approvedSpans` reached
`POST /api/nvm/revise` (and, in principle, `GET /api/nvm/revise-stream`) as
`z.array(z.unknown())`, force-cast to `ApprovedSpan[]` at the route. Touched:
`server/lib/validation.ts` (new `ApprovedSpanSchema`, `ReviseBodySchema`),
`server/routes/nvm/revision.ts` (comments only — the cast's shape is
unchanged, only what backs it), one new test file. Not touched: the
consumers' own tolerance for malformed spans (`relocateApprovedSpans`,
`approvedSpanInstructions`) — kept deliberately, as defence in depth for
callers that reach them outside this route.

---

## 1. `ApprovedSpan` and its senders

`ApprovedSpan` (`server/nvm/revision/passes/types.ts:24-30`):

```ts
export interface ApprovedSpan {
  /** 1-based line number (inclusive) */
  startLine: number;
  /** 1-based line number (inclusive) */
  endLine: number;
  reason: string;
}
```

`reason` is typed **required** on the interface. Its actual consumers
disagree: `approvedSpanInstructions` (`server/nvm/revision/rewrite-llm.ts:79`)
reads it as `typeof s.reason === 'string' ? sanitizeSingleLine(s.reason, 120)
: ''` — an absent or non-string `reason` has always been tolerated as "no
reason", not an error. The new schema follows the consumers, not the
interface's optimistic annotation.

**Every sender**, found by `grep -rn 'approvedSpans' src/ scripts/ tests/
--include=*.ts --include=*.tsx --include=*.mjs | grep -v node_modules`:

| sender | shape sent | notes |
|---|---|---|
| `src/components/RevisionPanel.tsx:453` (the only one that reaches the route over HTTP) | `{ startLine, endLine, reason }`, mapped from `UiApprovedSpan` | `startLine`/`endLine` always `Number(...)`-derived integers `>= 1`, `startLine <= endLine`, validated client-side against the compiled draft's line count before `addSpan()` ever adds one. `reason` is always a **non-empty, trimmed string, <= 300 chars** — the client's own `addSpan()` (lines ~355-380) rejects a blank or >300-char reason before the span is ever added to state. POSTs only to the non-streaming `POST /api/nvm/revise` (see the file's header comment, "sends them via the existing non-streaming POST /api/nvm/revise") — never to `/revise-stream`. |
| `tests/passes/relationship-arc.test.ts` (16 call sites) | `approvedSpans: []` | module-layer test input to a revision pass directly, never an HTTP body. Always empty. |
| `tests/nvm/revision/*.test.ts`, `tests/core/approved-span-sanitization.test.ts`, `tests/core/approved-spans-enforced.test.ts`, `tests/core/revision-per-pass-diagnostics.test.ts` | well-formed `{ startLine, endLine, reason }` objects, plus deliberately malformed ones (this is where "malformed spans are tolerated" is exercised) | module-layer — calls `relocateApprovedSpans`/`approvedSpanInstructions`/`approvedSpansSurvive` directly, never through the HTTP route, so this schema does not gate them and they are correctly left untouched. |

No sender anywhere sends a field beyond `startLine`/`endLine`/`reason`, so the
schema does not need `.strict()` — zod's default key-stripping is enough and
matches every real caller.

**The two routes' current body/query schemas**, before this change
(`server/lib/validation.ts`):

```ts
export const ReviseBodySchema = z.object({
  sessionId: sessionIdField,
  approvedSpans: z.array(z.unknown()).optional(),
  title: z.string().max(256).optional(),
});

export const ReviseStreamQuerySchema = z.object({
  sessionId: sessionIdField,
  title: z.string().max(256).optional(),
});
```

`GET /api/nvm/revise-stream` takes **no `approvedSpans` at all** — it is a
query-string route and always calls `runRevisionPipeline` with `[]`
(`server/lib/validation.ts`'s own comment on `ReviseStreamQuerySchema`, dated
2026-09-19, states this explicitly). So only `ReviseBodySchema` needed a
change; `ReviseStreamQuerySchema` is untouched.

## 2. The schema

Added to `server/lib/validation.ts`, directly above `ReviseBodySchema`:

```ts
export const ApprovedSpanSchema = z.object({
  startLine: z.number().int().min(1),
  endLine: z.number().int(),
  reason: noControlChars.max(500).optional(),
}).refine(s => s.endLine >= s.startLine, {
  message: 'endLine must be on or after startLine',
  path: ['endLine'],
});

export const ReviseBodySchema = z.object({
  sessionId: sessionIdField,
  approvedSpans: z.array(ApprovedSpanSchema).max(200).optional(),
  title: z.string().max(256).optional(),
});
```

- `startLine`/`endLine`: `z.number().int()` rejects the `"3"`-style string
  coordinate that used to reach `relocateApprovedSpans`'s
  `Number.isFinite(startLine)` check and get silently `skipped` instead of
  400ing. `.min(1)` on `startLine` matches the 1-based, inclusive contract
  documented on the interface.
- The cross-field `endLine >= startLine` check is a `.refine`, with a message
  naming both fields (`'endLine must be on or after startLine'`) and
  `path: ['endLine']` so the 400 body's field path is
  `approvedSpans.<i>.endLine`.
- `reason` stays **optional** — matching the consumers' existing tolerance,
  not the interface's `required` annotation (see §1). Capped at 500 chars
  (not the UI's own 300) because a future non-UI caller may reasonably say
  more than the panel's form allows; the field is truncated to 120 chars at
  the prompt boundary regardless (`approvedSpanInstructions`'s
  `sanitizeSingleLine(s.reason, 120)`), so 500 only bounds the request body,
  not what reaches the LLM. `noControlChars` is the same refinement
  `SceneTargetSchema`'s `themeHint` uses (`server/lib/validation.ts`,
  2026-09-19 cast-grounding lane) — free prose shown to an LLM, not a
  single-line identifier, so (unlike `cast`) no extra single-line refinement
  is layered on.
- The array is capped at **200** entries — generous for a human marking up
  protected passages by hand, while bounding how many spans one request can
  push through `relocateApprovedSpans`'s per-span document scan and into the
  per-pass rewrite prompt.
- No `.strict()`: per §1, no sender sends an extra key, so zod's default
  key-stripping is sufficient and doesn't risk 400ing a caller this repo
  doesn't have.
- Optionality is unchanged: `.optional()` on the array, exactly as before.

`server/routes/nvm/revision.ts`: `validate(ReviseBodySchema)` runs as
middleware **before** the handler, and does not replace `req.body` (see
`validate()`'s own comment in `server/lib/validation.ts`) — so the handler
still reads `req.body` directly and still casts it. What changed is that the
cast is no longer "we trust the pipeline to ignore malformed spans"; by the
time the handler runs, the schema has already rejected anything that
wouldn't satisfy `ApprovedSpan`'s shape. Comments at both cast sites were
updated to say so; no behavioral line changed beyond dropping the now-
redundant explicit `ApprovedSpan[]` cast at the `safeSpans` line (the
`approvedSpans` destructure carries the type instead).

## 3. Pre/post output (fail-first)

`tests/routes/nvm-revision-approved-spans-schema.test.ts` was written and run
against the pre-change tree (`z.array(z.unknown())` still in place) before
any schema code was written:

```
# tests 10
# suites 1
# pass 4
# fail 6
```

The 6 failures were exactly the 6 cases that assert 400 — every one of them
returned **200** on the pre-change schema:

| case | pre-change | post-change |
|---|---|---|
| `startLine: 0` | 200 | 400 (`approvedSpans.0.startLine: ...`) |
| `endLine < startLine` | 200 | 400 (`approvedSpans.0.endLine: endLine must be on or after startLine`) |
| `startLine: '3'` (string) | 200 | 400 (`approvedSpans.0.startLine: ...`) |
| `reason: 42` | 200 | 400 (`approvedSpans.0.reason: ...`) |
| `reason` of 501 chars | 200 | 400 (`approvedSpans.0.reason: ...`) |
| 201 well-formed spans | 200 | 400 (`approvedSpans: ...`) |

The 4 cases that already passed pre-change (no `reason` at all; a 500-char
`reason`; exactly 200 spans; `approvedSpans` omitted entirely) stayed 200
post-change, confirming the change is additive rejection only — nothing that
used to be accepted as well-formed became a 400.

Post-change, the full file:

```
# tests 10
# suites 1
# pass 10
# fail 0
```

## 4. Gate table

All run from `/tmp/claude-0/-home-user-STORYMACHINE/27fcd3d3-d815-545e-b611-fbaa770d9c76/scratchpad/wt-v2` against commit `971c055d`.

| gate | result |
|---|---|
| `tests/routes/nvm-revision-approved-spans-schema.test.ts` (new) | 10/10 pass |
| `tests/routes/nvm-revision.test.ts` | 12/12 pass |
| `tests/routes/nvm-revision-budget.test.ts` | 5/5 pass |
| `tests/routes/nvm-revision-budget-attempts.test.ts` | 1/1 pass |
| `tests/core/api-schemas.test.ts` | 6/6 pass |
| `tests/core/approved-span-sanitization.test.ts` (unmodified — module layer) | 7/7 pass |
| `tests/core/approved-spans-enforced.test.ts` (unmodified — module layer) | 22/22 pass |
| `tests/core/revision-per-pass-diagnostics.test.ts` | 14/14 pass |
| `tests/core/llm-seam-wiring.test.ts` | 7/7 pass |
| `tests/core/pure-core-boundary.test.ts` | 6/6 pass |
| `tests/core/honesty-audit-claims.test.ts` | 15/15 pass |
| `npm run lint` (`tsc --noEmit`) | clean |
| `npm run check-no-console` | "311 file(s) under server/ checked, ... all proven unreachable from the server. OK." |
| `npm run build` | not run — no `src/` file changed (no sender needed correcting; `RevisionPanel.tsx` already sends the well-formed shape this schema accepts) |
| `node scripts/check-scoring-receipt.mjs 5d1a14ce..HEAD` | `"no scoring-path files changed. OK."` — confirms `server/lib/validation.ts` is off the scoring path, as stated in the lane brief |

`tests/core/brain-coverage.test.ts` was not run standalone as a gate (it is
listed as "only (e) may fail" — this lane adds exactly one Decision-Log-
adjacent brain note, mirroring the Cast Grounding audit's frontmatter).

## 5. Why no `src/` change was needed

The lane brief allowed touching `src/**` "ONLY if a sender must be
corrected." `RevisionPanel.tsx` is the only HTTP sender (§1) and it already
sends `{ startLine, endLine, reason }` with client-side bounds *tighter* than
the new server schema (integers >= 1, `startLine <= endLine`, non-empty
`reason` <= 300 chars) — every span the panel can produce satisfies
`ApprovedSpanSchema`. No sender needed correcting.

## Related

`docs/audits/2026-09-20-per-pass-diagnostics/README.md` (the lane that
recorded this gap), [[Audit - 2026-09-20 Approved Spans Schema]] (brain note),
[[Audit - 2026-09-19 Cast Grounding]] (the prior lane whose
`noControlChars`/`themeHint` pattern this schema reuses).

---

## § Review finding 2: per-span and per-request bounds

**HIGH, adversarial-probe-confirmed.** The schema landed by §2 above bounded
`startLine >= 1` and `endLine >= startLine`, but left `endLine` with **no
upper bound**, and `approvedSpanInstructions` (`server/nvm/revision/
rewrite-llm.ts`) sliced `lines.slice(s.startLine - 1, s.endLine)` unclamped.
A probe found that `{startLine: 1, endLine: 9007199254740991}` x200 (the
array's own 200-entry cap) on a 4,000-line / 287 KB draft built a **57 MB**
"APPROVED — DO NOT CHANGE" prompt block per revision pass — x14 passes — from
a ~12 KB request body, with no prompt-size guard anywhere before
`provider.generate()` (only `maxOutputTokens` was budgeted). The §2 schema
comment claimed the 200-entry array cap bounded the prompt block; it only
ever bounded the span *count*, never the size of any one span or their sum.

### Fix — two independent bounds, at two layers

**1. `server/lib/validation.ts` (the HTTP boundary).**

- `ApprovedSpanSchema.endLine` gained `.max(APPROVED_SPAN_MAX_LINE)`
  (`200_000`) — an absolute per-span ceiling, deliberately shaped like
  `FixSpanSchema`'s sibling `startLine`/`endLine` object+refine pattern
  (`server/lib/validation.ts` ~2934), though `FixSpanSchema` itself has no
  upper bound of its own for this schema to inherit — this is a new number,
  chosen the same way `endLine`'s lower bound already was: generous for any
  real single-span use, hostile for the "line past the end of a
  representable document" shape the probe used.
- `ReviseBodySchema` gained a `.superRefine` enforcing a **whole-request**
  bound: the SUM over every span in `approvedSpans` of
  `(endLine - startLine + 1)` must not exceed `APPROVED_SPAN_TOTAL_LINES_MAX`
  (`20_000`) — chosen because a full feature screenplay is ~6,000 lines (see
  `NORTH_STAR`/`CLAUDE.md`'s own P1 lore), so 20,000 leaves headroom for a
  caller who genuinely wants most of a long draft locked, while still
  rejecting the "cover the document many times over" shape a malicious or
  buggy caller could otherwise send within the 200-entry array cap alone.
  The issue is added with `path: ['approvedSpans']` so the 400 body names
  the field (`validate()`'s `{error: "<path>: <message>"}` shape).
- The block comment above `ApprovedSpanSchema` was rewritten to say what is
  now actually bounded (per-span ceiling + per-request sum), not what the
  old comment claimed (array-entry count only).

**2. `server/nvm/revision/rewrite-llm.ts` (defence in depth).**
`approvedSpanInstructions` is reachable by anything that calls the revision
pipeline directly, not only through the one HTTP route the schema above
guards (its own pre-existing doc comment already documents that
`relocateApprovedSpans` tolerates a non-finite/out-of-range span for exactly
that reason). So the bound is enforced again, independently, inside the
function itself:

- `endLine` is clamped to `lines.length` (the same clamp
  `approvedSpansSurvive` already applies a few lines down in the same file),
  and a span whose *clamped* range is empty (a `startLine` past the end of
  the document) is skipped outright rather than excerpting nothing.
- The assembled block is capped at `APPROVED_SPAN_BLOCK_MAX_CHARS`
  (`200_000` chars) — the same order of magnitude as the per-request line
  bound above, expressed in characters because this is the actual prompt
  text budget, not a line count — and additionally never exceeds
  `draftLength + APPROVED_SPAN_BLOCK_OVERHEAD_CHARS` (`256`), where
  `draftLength` is the draft's own length in characters: the block only ever
  quotes pieces of the draft, so it has no legitimate reason to be much
  larger than the whole of it. The `+256` headroom exists only so that a
  single legitimate whole-document span (marker + full excerpt) is not
  itself rejected purely for the wrapper text's own overhead — it does not
  create room for a second such span. `APPROVED_SPAN_BLOCK_MIN_CHARS`
  (`4_096`) is a separate floor for the opposite edge (a very short draft
  where even one span's wrapper overhead could otherwise exceed
  `draftLength + 256`).
- A span whose section would push the running total past the cap is dropped
  **whole**, never partially included — partial inclusion would risk
  truncating an excerpt mid-line and showing the model a fabricated partial
  instruction. When any span is dropped this way, `revision_approved_span_
  block_truncated` is logged once at `warn`, with `totalSpans`,
  `includedSpans`, `droppedSpans` and `blockCharCap` — counts only, never
  span text, excerpt content or the reason string.

### Tests (fail-first)

`tests/routes/nvm-revision-approved-spans-schema.test.ts` gained 5 cases
(10 -> 15 in the file, all still against the same `aiLimiter` 20-request
budget):

| case | pre-fix | post-fix |
|---|---|---|
| `endLine: 9007199254740991` | 200 | 400 (`approvedSpans.0.endLine: ...`) |
| `endLine: 200001` | 200 | 400 (`approvedSpans.0.endLine: ...`) |
| 200 spans x 101 lines (sum 20,200) | 200 | 400 (`approvedSpans: combined span length (20200 lines) exceeds the 20000-line request limit`) |
| 200 spans x 100 lines (sum 20,000, exactly at the cap) | 200 | 200 (unchanged — off-by-one-correct) |
| one span, lines 1..20000 (the cap, in one span) | 200 | 200 (unchanged) |

`tests/core/approved-span-sanitization.test.ts` gained a new describe block
("`approvedSpanInstructions` size bound") with 3 cases, run at the module
layer (`rewritePass` with a fake `geminiProvider.generate` capturing the
built prompt, same technique the file already used for the `reason`-
sanitization cases):

- 200 spans of `{startLine: 1, endLine: 1e15}` on a 4,000-line (~327 KB)
  draft: pre-fix this exact shape is the one measured at 57 MB; post-fix the
  block is bounded to `<= 200_000` chars (here, every span individually
  exceeds the cap on its own since the draft exceeds it, so the correctly
  bounded outcome is an empty block — verified explicitly, not assumed) and
  the truncation log fires exactly once with `totalSpans: 200` and
  `includedSpans + droppedSpans === 200`, no span/draft text anywhere in the
  logged data.
- A "cumulative but not individual" case (5 whole-draft spans on a ~160 KB
  draft, sized so ONE whole-draft excerpt fits under the cap but two do not):
  pins that the one surviving section quotes the draft **in full** (never a
  truncated mid-line fragment) and that exactly one of the five identical
  spans survives.
- A span whose clamped range is empty (`startLine` past the end of a short,
  6-line draft) produces **no block at all**, not an empty-excerpt one.

All three files (`nvm-revision-approved-spans-schema.test.ts`,
`approved-span-sanitization.test.ts`, and the untouched
`approved-spans-enforced.test.ts`) pass in full post-fix; see the gate table
in the commit for the complete run.

### A note on the cap's own trade-off

For a draft longer than `APPROVED_SPAN_BLOCK_MAX_CHARS` (200,000 chars —
above a typical feature screenplay in Fountain plain text, but not
impossible for an especially long one), a *single* span that legitimately
asks to lock the entire document will not fit under the cap either, and is
dropped the same way a pathological span is. This is an intentional
consequence of the fix, not an oversight: the alternative (partially
including a huge excerpt) risks showing the model a truncated, potentially
mid-line "approved" block that misrepresents the actual boundary of what is
locked — worse than dropping the lock and logging it. The
`revision_approved_span_block_truncated` warning is the signal for that case
in production; nothing in this lane's scope wires it further (e.g. into a
user-facing warning on the revise response) — a natural follow-up for
whichever lane next touches `server/routes/nvm/revision.ts`.
