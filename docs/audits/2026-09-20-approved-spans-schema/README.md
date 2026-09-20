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
