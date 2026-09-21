# Lane record — locked spans (2026-09-19)

**Branch:** `lane/locked-spans`, from `53f6e377`.
**Scope:** make the revision rewrite's "approved spans are never changed"
promise true in code, at the one seam that is off the scoring path
(`server/nvm/revision/rewrite-llm.ts`). `server/nvm/revision/rewrite.ts` and
`server/nvm/revision/pipeline.ts` — both reachable from `doctor.ts` — were not
edited.

---

## 1. The defect

SESSION_REPORT_2026-09-19.md §4 rank 2 and logic audit C3
(`docs/audits/2026-09-19-generation-prompt-inputs/README.md`) both name the
same gap: `server/nvm/revision/pipeline.ts:128` documents `approvedSpans` as

> Spans the author has locked — never changed by any pass

but the only mechanism that ever enforced it was a sentence in the LLM
prompt — the `[APPROVED — DO NOT CHANGE — reason: …]` marker built by
`approvedSpanInstructions()` in `rewrite-llm.ts` (sanitized in `5d27c7d3`, a
separate, already-closed lane). `evaluateRewrite` (`rewrite.ts`, off-limits to
this lane) checks only the provider's finish-reason and a 0.80 length ratio —
nothing about *which* text survived. A model that deletes the locked pages
and pads the output elsewhere with unrelated prose clears both checks and was
**accepted**: the session's probe `p9.ts` showed exactly that, locked text
gone, `usedLLM: true`.

Separately noted, and explicitly **not** fixed here (see §3): approved-span
line indices are 1-based into the *original* fountain, but passes 2..14 all
receive the same `approvedSpans` array while `currentFountain` changes under
them (`pipeline.ts`, off-limits, on the scoring path).

## 2. The fix

Entirely inside `rewrite-llm.ts`, no signature or contract change to
`rewrite.ts` or `pipeline.ts`:

1. **`approvedSpansSurvive(originalFountain, revisedText, spans)`** — a new,
   pure, exported function. For each span: take its excerpt from the
   *input* fountain at `startLine..endLine` (1-based, the same lines the
   prompt showed), normalise line endings only (CRLF/CR → LF, nothing else —
   the promise is *verbatim* survival, not "same meaning"), and require that
   excerpt to appear as a contiguous substring of the revised text (also
   line-ending-normalised). Returns `{ ok, lost, skipped }`:
   - `lost`: indices (into the `spans` array) whose excerpt could not be
     found — never the span text, so callers can log it safely.
   - `skipped`: indices whose `startLine`/`endLine` were non-finite,
     `startLine < 1`, `endLine < startLine`, or `startLine` past the end of
     the document — these are excluded from the check rather than counted as
     either surviving or lost, mirroring `approvedSpanInstructions`'s own
     tolerance of malformed span metadata (`approvedSpans` reaches this
     module as `z.array(z.unknown())`, force-cast upstream at
     `validation.ts:2616`). A stale `endLine` *past* the document (valid
     `startLine`) is clamped to the document and checked, not skipped.
2. **`llmRewrite()`** calls `approvedSpansSurvive` right after
   `evaluateRewrite` accepts a candidate. If any locked span is missing, the
   rewrite is rejected the same way the finish-reason/length guards already
   are: the original, unchanged fountain is returned, `usedLLM: false`, plus
   two new fields — `reason: 'approved_span_lost'` and `lostSpans: number[]`
   (the lost indices) — so callers can distinguish this rejection from a
   truncation/length one without inspecting text. A structured log line,
   `revision_rewrite_rejected_locked_span`, is emitted with `passName`, the
   lost indices, the lost count, and the total approved-span count — never
   the span text or the draft text. A second, non-fatal log line,
   `revision_rewrite_locked_span_skipped`, fires when any span was skipped
   as malformed, so silently-uncheckable span metadata is observable too.
3. The prompt sentence in `approvedSpanInstructions()` is unchanged — belt
   (still ask the model nicely) and braces (now actually verify).
4. `RewriteResult`'s declared shape in `rewrite.ts` was **not** touched.
   `llmRewrite`'s own return type was widened locally, in `rewrite-llm.ts`
   only, to `Promise<RewriteResult & { reason?: string; lostSpans?: number[] }>`
   — a strict supertype of `RewriteResult`, so it remains assignable to
   `rewrite.ts`'s `LlmRewriter = (input) => Promise<RewriteResult>` type via
   ordinary return-type covariance. Every pre-existing return statement
   (`{ revised: text, usedLLM: true }` on accept, `{ revised: fountain,
   usedLLM: false }` on every other failure path) is completely unchanged —
   confirmed by test: with `approvedSpans: []`, an accepted rewrite returns
   an object whose key set is exactly `['revised', 'usedLLM']`, byte-for-byte
   equal to what the pre-fix code returned.

## 3. What stays unfixed, and why

**Stale span indices from pass 2 onward.** `approvedSpans` is threaded
unchanged through all 14 passes (`pipeline.ts`, off-limits — on
`doctor.ts`'s reachable set) while `currentFountain` is rewritten by each
prior pass. A span's `startLine..endLine` is only guaranteed to point at the
right lines going into pass 1; by pass 2 those line numbers describe the
*original* document, not the current one. This lane's `approvedSpansSurvive`
takes its excerpt from whatever fountain the *current* pass was actually
handed as input (`llmRewrite`'s own `fountain` parameter — always the
right document for that one call), so the check itself is correct for the
pass it runs in. What is not fixed is that pass 2's `approvedSpans[i]` may
already be pointing at the wrong lines of pass 2's input document (because
pass 1 inserted or removed lines above it) — the check would then either
verify the wrong excerpt (if those lines happen to still hold *some* text)
or, more likely, find nothing at that line range and add it to `skipped`
(if the range is now out of bounds) rather than to `lost`. That is a
availability gap, not a correctness regression this lane introduces: it is
the same "spans drift" defect the assignment names as out-of-scope, on a
file (`pipeline.ts`) this lane was explicitly told not to edit. Fixing it
for real needs either re-deriving each span's location from stable anchors
(e.g. a text fingerprint instead of a line range) or re-mapping indices
between passes — pipeline-level work, tracked as the still-open half of
SESSION_REPORT_2026-09-19.md §4 rank 2 / logic audit C3.

**Malformed spans are skipped, not rejected.** A span with unusable line
metadata cannot be checked, so it is excluded from the pass/fail verdict
rather than either passing or failing it automatically — logged via
`revision_rewrite_locked_span_skipped` so it stays observable. Given
`approvedSpans` is validated only as `z.array(z.unknown())` at the route
(`validation.ts:2616`, off-limits to this lane), a stricter schema there is
the real fix for "a caller can send garbage spans" — not something this
lane's single-file, off-scoring-path seam should attempt.

## 4. Fail-first evidence

A standalone probe script (not part of the committed test suite) drove
`rewritePass` with a fake provider whose output omits the locked excerpt
(`MAYA\nA calm morning, finally.`) but is long enough to clear
`REWRITE_MIN_LENGTH_RATIO` (0.80). Run against the **pre-fix**
`rewrite-llm.ts` (`git stash` of this lane's only source change, `tests/`
left in place):

```
RESULT: {
  "revised": "INT. APARTMENT - DAY\n\nMaya paces anxiously, on edge.\n\nXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  "usedLLM": true
}
contains locked excerpt ("MAYA\nA calm morning, finally."): false
usedLLM: true
```

The locked dialogue is gone and the rewrite was accepted anyway — exactly the
defect. `git stash pop` restored the fix; re-running the identical probe
against the fixed tree:

```
{"time":"...","level":"warn","msg":"revision_rewrite_rejected_locked_span","passName":"dialogue","lostSpanIndices":[0],"lostSpanCount":1,"totalApprovedSpans":1}
RESULT: {
  "revised": "INT. APARTMENT - DAY\n\nMaya reads quietly by the window, at ease.\n\nMAYA\nA calm morning, finally.",
  "usedLLM": false,
  "reason": "approved_span_lost",
  "lostSpans": [0]
}
contains locked excerpt ("MAYA\nA calm morning, finally."): true
usedLLM: false
```

The same test case now returns the *original* fountain (locked text intact),
`usedLLM: false`, a distinguishable `reason`, and a structured log line
naming the lost span's index only.

## 5. New tests

`tests/core/approved-spans-enforced.test.ts` (new, 15 assertions):

- **Part A — `approvedSpansSurvive`, pure, no provider:** excerpt present →
  ok; excerpt deleted → `lost=[0]`; excerpt present across CRLF/CR-only line
  endings on either side → ok; out-of-range `startLine`, non-finite lines,
  `startLine <= 0`, inverted range → all `skipped`, not `lost`, not fatal;
  `endLine` past the document with a valid `startLine` → clamped and
  checked (not skipped); a mixed batch of surviving/lost/skipped spans
  keeps indices aligned to the input array; no spans → trivially ok.
- **Part B — live, through `rewritePass`, fake provider (no network):** a
  rewrite that omits the locked excerpt (but is long enough to pass the
  length ratio) is rejected — original fountain back, `usedLLM: false`,
  `reason: 'approved_span_lost'`, `lostSpans: [0]`, and the
  `revision_rewrite_rejected_locked_span` log line is emitted with no span
  or draft text in it (asserted by substring search over the serialized log
  calls); a rewrite that preserves the excerpt is accepted (`usedLLM:
  true`); with `approvedSpans: []`, an accepted rewrite's result has exactly
  the key set `['revised', 'usedLLM']`, identical to the pre-lane shape.

`tests/core/approved-span-sanitization.test.ts` was left unmodified — its
scope is the `reason`-field sanitization fixed in the generation-prompt-inputs
lane, and all 7 of its assertions still pass unchanged against this lane's
code.

## 6. Gates

| Gate | Result |
|---|---|
| `node --experimental-strip-types tests/core/approved-spans-enforced.test.ts` | pass — 15/15 |
| `node --experimental-strip-types tests/core/approved-span-sanitization.test.ts` | pass — 7/7 (unmodified) |
| `node --experimental-strip-types tests/core/llm-seam-wiring.test.ts` | pass — 7/7 |
| `node --experimental-strip-types tests/core/pure-core-boundary.test.ts` | pass — 6/6 |
| `node --experimental-strip-types tests/routes/nvm-revision.test.ts` | pass — 12/12 |
| `node --experimental-strip-types tests/routes/nvm-revision-budget.test.ts` | pass — 5/5 |
| `node --experimental-strip-types tests/routes/nvm-revision-budget-attempts.test.ts` | pass — 1/1 |
| `npm run lint` (`tsc --noEmit`) | pass, no errors |
| `npm run check-no-console` | pass — "310 file(s) under server/ checked, 23 tsconfig quarantine entr(ies) applied, all proven unreachable from the server. OK." |
| `node scripts/check-scoring-receipt.mjs 53f6e377..HEAD` | pass — "no scoring-path files changed. OK." (run against the committed range, after this lane's commits) |
| `node --experimental-strip-types tests/core/brain-coverage.test.ts` | this note satisfies check (b) (the new `docs/audits/2026-09-19-locked-spans/` directory is cited by a vault note). Per this lane's explicit instruction, `npm run brain` was **not** run, so `docs/brain/brain.graph.json`/`GRAPH.md` were not regenerated to include this note — checks (e)/(e2)/(f)/(g), which compare the vault against a freshly rebuilt graph, are expected to report the graph as stale until an integrator runs `npm run brain`. This mirrors CLAUDE.md's own note that `docs/brain/**` is a frequent cross-lane merge-conflict surface; regenerating it here, in an otherwise single-file lane, was deliberately not done. |

`npm test` (the full suite) and `npm run brain` were intentionally **not**
run, per this lane's instructions.

## 7. Files touched

- `server/nvm/revision/rewrite-llm.ts` — the fix (§2).
- `tests/core/approved-spans-enforced.test.ts` — new.
- `docs/audits/2026-09-19-locked-spans/README.md` — this file.
- `docs/brain/Audits/Audit - 2026-09-19 Locked Spans.md` — new brain note.

Not touched: `server/nvm/revision/rewrite.ts`, `server/nvm/revision/pipeline.ts`,
`server/lib/validation.ts`, `server/routes/nvm/revision.ts` — all off-limits
or out of scope for this lane.

## 8. § Review findings fixed (span-check-hardening lane, 2026-09-19)

An adversarial review of this commit (`f70ab07d`) and of the doctor-pool
lane's commit (`9c25f79a`) found two confirmed defects in
`approvedSpansSurvive`/`llmRewrite`, fixed on `lane/span-check-hardening`
from `1e7779de`. Both are additive hardening on top of §2-§6 above; the
enforcement mechanism, the log-line contract, and the "never log span or
draft text" guarantee are unchanged.

**Finding 3 (MEDIUM, confirmed) — CRLF originals with an end-of-document
span false-rejected a correct rewrite.** `approvedSpansSurvive` built the
excerpt from `originalFountain.split('\n')` *before* `normalizeLineEndings`
ran, so on a CRLF original every line — including the excerpt's own last
line — kept its trailing `\r`. Only the *joined* excerpt was normalized
afterward, which turned that trailing `\r` into a synthesized `\n` the
source document never actually had at that position. For a span ending the
document, that meant the check demanded a trailing newline after the locked
text that the excerpt itself never contained, and an LLM answer with no
trailing newline (the common case) was rejected as having "lost" text that,
verbatim, it had not lost at all. Probe (from the review): original
`"INT. ROOM - DAY\r\nAction one.\r\nLOCKED LINE.\r\n"`, span
`{startLine:3,endLine:3}`, revision
`"INT. ROOM - NIGHT\nAction rewritten.\nLOCKED LINE."` (no trailing
newline) — pre-fix `{ok:false, lost:[0]}`; an equivalent LF original passed.
**Fix:** normalize the whole document with `normalizeLineEndings` *before*
`.split('\n')`, so every line — including the last one of an
end-of-document span — is already LF-only, and the excerpt built by
`.slice(...).join('\n')` never carries a terminator the source did not put
there, regardless of whether the original was CRLF, CR, or LF. The owner
works on Windows (CLAUDE.md), so this is a real-draft case, not a synthetic
one. `llmRewrite`'s own `lines` (used to build the prompt's "APPROVED — DO
NOT CHANGE" excerpt in `approvedSpanInstructions`) is normalized the same
way, so the excerpt the model is shown and the excerpt the survival check
verifies against are built from identical text — they had been able to
diverge (CRLF vs. the check's normalized view) before this fix, even though
nothing depended on that divergence yet.

**Finding 4 (MEDIUM, confirmed) — the check was presence-anywhere, and two
excerpt shapes passed vacuously.** `normalizedRevised.includes(excerpt)`
is unfalsifiable for two kinds of excerpt: (a) a span over two (or more)
blank lines joins to `"\n"`, which `includes` matches against almost any
multi-line revision — the review reproduced a rewrite that replaced the
*entire* document passing this check; and (b) a single duplicated line (a
lone `"CUT TO:"`, a repeated slugline) survives `includes` even when the
revision deleted one of several identical occurrences and left another one
standing elsewhere — the "lock" was satisfied by a copy the pass never
touched, not by the one it was asked to protect. A third case,
`{startLine:0,endLine:2}`, was already `skipped` (as designed), but
`ok:true` with nothing actually checked was indistinguishable from
`ok:true` because everything genuinely survived. **Fixes**, all in
`approvedSpansSurvive`:
(i) an excerpt is only checkable if it has at least one non-whitespace
character (`excerpt.trim().length === 0` → `skipped`, extending the
existing single-blank-line case to any run of blank lines);
(ii) the function now returns `checked: number` (`spans.length -
skipped.length`), and `llmRewrite` treats `approvedSpans.length > 0 &&
survival.checked === 0` as **not enforced**: it logs
`revision_rewrite_locked_spans_unchecked` at warn and rejects the rewrite
with `reason: 'approved_spans_unchecked'`, keeping the original draft — a
lock the caller asked for but that could not be checked at all must not
silently read as honored;
(iii) for an excerpt of at most one non-blank line, the check additionally
requires the revision's occurrence count of that excerpt to be `>=` the
original's occurrence count (both counted over the whole normalized
document, via a small non-overlapping `countOccurrences` helper) — so
dropping one of two `"CUT TO:"` lines is now caught, while relocating the
single occurrence elsewhere in the document — allowed by design; this file
does not enforce position or order — still passes. Multi-line excerpts (two
or more non-blank lines) keep the plain `includes` check: the trade-off is
unchanged there, and positional/order enforcement was explicitly out of
scope for this hardening.

**Trade-off, stated plainly:** `approved_spans_unchecked` is a new way for a
pass to fall back to the unchanged draft even when the model returned a
perfectly good rewrite, whenever every approved span it was given happened
to be malformed or blank-only. That is intentional — a caller who explicitly
locked a span gets either a verified guarantee or their original text back,
never a rewrite nobody actually checked against the lock they asked for.

Tests: `tests/core/approved-spans-enforced.test.ts` gained the CRLF/EOF
probe from finding 3 (plus a "still catches a genuine loss" control), the
two-blank-line-span and `startLine:0` "rejected as unchecked" cases (pure,
and live through `rewritePass` with a fake provider), and the
duplicated-single-line deletion case from finding 4(iii) (plus a relocation
control proving position is still unenforced by design). Every existing
full-object `deepEqual` assertion on `approvedSpansSurvive`'s return value
was updated for the new `checked` field.

Gates (`lane/span-check-hardening`, from `1e7779de`):

| Gate | Result |
|---|---|
| `tests/core/approved-spans-enforced.test.ts` | pass — 22/22 (was 15/15 before this hardening) |
| `tests/core/approved-span-sanitization.test.ts` | pass — 7/7 (unmodified) |
| `tests/routes/nvm-revision.test.ts` | pass — 12/12 |
| `tests/routes/nvm-revision-budget.test.ts` | pass — 5/5 |
| `tests/core/llm-seam-wiring.test.ts` | pass — 7/7 |
| `tests/core/pure-core-boundary.test.ts` | pass — 6/6 |
| `npm run lint` (`tsc --noEmit`) | pass, no errors |
| `npm run check-no-console` | pass — 310 file(s) checked, all proven unreachable |
| `node scripts/check-scoring-receipt.mjs 1e7779de..HEAD` | pass — "no scoring-path files changed. OK." |

Files touched by this hardening: `server/nvm/revision/rewrite-llm.ts`,
`tests/core/approved-spans-enforced.test.ts`, this section, and
`docs/brain/Audits/Audit - 2026-09-19 Locked Spans.md` (one pointer line).
`rewrite.ts` and `pipeline.ts` were not touched, as before.
