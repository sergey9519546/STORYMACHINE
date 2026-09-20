# Lane record — per-pass diagnostics (2026-09-20)

**Branch:** `lane/per-pass-diagnostics`, from `26d930dd`.
**Code commit:** `e3c3b53a`.
**Scope:** make each of the 14 revision passes diagnose the document it is
actually handed, and make an author's approved spans follow that document's
text when it moves. Two files on the scoring path
(`server/nvm/revision/pipeline.ts` and the new
`server/nvm/revision/approved-spans.ts`), one off it
(`server/nvm/revision/rewrite-llm.ts`). `server/nvm/analyze/doctor.ts` and the
Fountain heading grammar were not touched — a concurrent lane owns those.

---

## 1. What the thing is

`runRevisionPipeline` (`server/nvm/revision/pipeline.ts`) receives a compiled
screenplay plus three diagnostic inputs — `records`, `structure` and
`annotations` — and runs 14 passes over the draft. Each pass reads the draft
text AND those three diagnostics, reports issues, and hands back a possibly
rewritten draft that the next pass receives. The three inputs come from the
caller, not from the pipeline: the route (`server/routes/nvm/revision.ts`)
builds them from the StoryCommit ledger, the doctor builds them with
`analyzeFountainText`.

Two things were threaded through all 14 passes unchanged while the draft
underneath them changed.

**The diagnostics.** Computed once, from the draft as submitted. From pass 2
onward every pass was reading the pre-revision document's records while
holding the post-pass-1 text — the defect recorded in
SESSION_REPORT_2026-09-19.md §4 row 3, and a plausible mechanism for passes
acting on issues a prior pass already resolved.

**The approved spans.** An `ApprovedSpan` is a 1-based inclusive line range
plus a reason. A line range means nothing except relative to one document, and
the line count changes as passes rewrite. The locked-spans lane
(`docs/audits/2026-09-19-locked-spans/README.md` §3) named this as the half of
its defect it was not allowed to fix, because the fix lives in `pipeline.ts`.

One correction to the brief's premise, for the record: the brief says to call
again "whatever function produced `records`/`structure`/`annotations` from the
original at the top of the pipeline." No such function is in the pipeline. The
values arrive as parameters, and on the route path they are derived from
StoryCommits, not from text — see §4.

## 2. The fix

### 2.1 Diagnostics are re-derived for the draft a pass will see

The sequential loop now carries `passRecords`/`passStructure`/
`passAnnotations` alongside `diagnosedFountain`, the draft those three
describe. Before each pass, if `currentFountain !== diagnosedFountain`, the
three are replaced with `analyzeFountainText(currentFountain)`'s and the
anchor advances. Byte-equality is the test, not a `changed` flag: a pass that
rewrote the draft back to what it already was costs nothing, and a pass that
returns different text while reporting `changed: false` is still re-diagnosed.

A pass that changes nothing therefore costs nothing at all, which matters:
`analyzeFountainText` over a feature-length draft is not free, and 13
unconditional re-derivations per revise request would be a real cost paid for
no information.

If `analyzeFountainText` throws, the previous diagnostics are kept (stale —
which is the defect this block exists to close, so it is logged at error as
`revision_rediagnose_failed`, not swallowed) and the anchor is NOT advanced,
so the next pass retries against its own draft rather than being frozen by one
failure. A successful re-derivation logs `revision_pass_rediagnosed` at debug
with the pass index, the pass name and the new scene count — no text.

### 2.2 Approved spans are re-located by their own text

`server/nvm/revision/approved-spans.ts` is new, pure, and exports
`relocateApprovedSpans(prevDoc, nextDoc, spans)`. For each span it cuts the
excerpt out of `prevDoc` at `startLine..endLine` (`endLine` clamped to the
document, exactly as `approvedSpansSurvive` clamps it), finds that excerpt in
`nextDoc` as WHOLE LINES after CRLF/CR → LF normalization, and rewrites the
line numbers to the occurrence nearest the span's previous position, ties
going to the earlier one. It returns the same-length, same-order array plus
three index lists — `moved`, `lost`, `skipped` — and never the span text, so
all three are safe for a caller to log.

Three decisions worth naming:

* **Whole-line alignment on both ends.** The excerpt was cut on line
  boundaries, so a match starting mid-line is different text that merely ends
  the same way; re-pointing a lock at it would move the lock onto lines the
  author never approved. Requiring alignment also means the match's line
  number IS the new `startLine`, with no partial-line arithmetic.
* **Nearest occurrence, not first.** A locked range can legitimately sit
  inside repeated text. "First occurrence wins" would move a lock on the
  second of two identical blocks onto the first the moment a pass edited
  something above them.
* **A lost span keeps its indices.** After an accepted LLM rewrite this cannot
  happen — `approvedSpansSurvive` (`rewrite-llm.ts`, 2026-09-19) rejects any
  rewrite that does not preserve every locked excerpt verbatim — but a
  non-LLM editor of the draft is not bound by that check. Losing the whole
  span array because one span's text was edited would be worse than carrying
  one stale range forward with a warning, so the pipeline logs
  `revision_locked_span_lost_between_passes` at warn with indices and counts
  only.

`rewrite-llm.ts` lost its private copy of `normalizeLineEndings` and imports
the shared one. The survival check and the re-location have to agree about
what counts as the same line endings; one implementation is how they cannot
drift.

### 2.3 Nothing else moved

`RevisionResult.originalFountain` is still the draft as submitted. The
diagnose-only concurrent branch is untouched. Pass 1 still reads exactly the
`records`/`structure`/`annotations` the caller passed in — only the
re-derivation, for a draft the caller never saw, comes from the text.

## 3. Why the score cannot move

`runScriptDoctor` reaches this pipeline only inside `runDiagnoseOnly()`. In
that scope every pass's trailing `rewritePass(...)` returns its input before
any rewrite work happens (`rewrite.ts`'s diagnose-only guard), so
`revisedFountain` never differs from the draft. Both new behaviours are gated
on the draft having changed, so on the doctor's path neither the re-derivation
nor the re-location ever executes. The doctor also takes the concurrent
branch, which this lane does not touch.

Measured rather than argued — output identity against a `git archive 26d930dd`
tree, both sides `GIT_SHA=dev`:

```
OUTPUT IDENTITY: PASS — all 45 reports are byte-identical (analyzedAt excluded).
```

Receipt: `docs/p1-benchmark/MEASUREMENT_RECEIPTS.md`, entry
`### 2026-09-20 — REVISION PASSES DIAGNOSE THE CURRENT DOCUMENT …`.

## 4. What this changes for the route path, honestly

On `POST /api/nvm/revise` and `/api/nvm/revise-stream`, `records` and
`structure` are built from the StoryCommit ledger
(`buildScreenplayMemory`/`analyzeStructure`), which carries per-scene signal
the text reconstruction infers heuristically. Once a pass rewrites the draft,
this change replaces those with `analyzeFountainText`'s. That is a real trade:
the ledger-derived records are richer, but they describe a document that no
longer exists, and there is no ledger for a draft an LLM just rewrote. A pass
reading accurate signal about the wrong document is worse than a pass reading
heuristic signal about the right one, and a re-derivation from the ledger is
not available at all. Pass 1 — the only pass whose draft the ledger genuinely
describes — still gets the ledger's version.

Every consumer of those three values was read: the route passes them straight
into the pipeline and returns the result; `/api/nvm/memory` and
`/api/nvm/compile` build their own and never reach the pipeline; the doctor
holds its own `mergedAnalysis` for `aggregateReport` and is unaffected. No
caller depends on the passes having seen the original's diagnostics.

## 5. Fail-first evidence

`tests/core/revision-per-pass-diagnostics.test.ts` (new, 14 assertions), run
with this lane's two source edits stashed and `approved-spans.ts` left in
place:

```
    not ok 1 - (a) a pass that cuts the draft makes every later pass diagnose the CUT draft
    ok 2 - (b) a pass that changes nothing costs no re-derivation
ok 2 - relocateApprovedSpans (pure)      [10/10]
    not ok 1 - (d) two lines inserted in pass 1 move the locked range for pass 2
    not ok 2 - a pass that edits the locked text itself warns with indices only and keeps the old range
# tests 14
# pass 11
# fail 3
```

(a)'s failure message, with a fake rewriter cutting an 18-scene draft to 6
scenes in pass 1:

```
pass 2 (causality) diagnosed a different document than the one it was handed
```

— pass 2 reported 10 issues, including `CAUSAL_ACT1_VOID` over "Act 1 (Scenes
1–4)" of an 18-scene reading and `ACT2_CAUSAL_DESERT` over "Act 2 (Scenes
5–13)", where the same 6-scene draft analysed from the start reports 2. Across
passes 2..14 the run named eleven scenes (Scene 7 … Scene 18) that no longer
existed in the document being revised. (d)'s failure, verbatim: pass 2 held
`startLine: 41, endLine: 43` where the locked text had moved to
`startLine: 43, endLine: 45` — exactly the two lines pass 1 inserted above it.

With the fix restored: `# pass 14 # fail 0`.

(b) is a guard, not a regression test — before the fix there was no
re-derivation at all, so it passed vacuously. What it pins is the skip: it
fails the moment the re-derivation is made unconditional.

## 6. Gates

| gate | exit | result |
|---|---|---|
| `tests/core/revision-per-pass-diagnostics.test.ts` (new) | 0 | 14/14 (3 fail pre-fix) |
| `tests/routes/nvm-revision.test.ts` | 0 | 12/12 |
| `tests/routes/nvm-revision-budget.test.ts` | 0 | 5/5 |
| `tests/routes/nvm-revision-budget-attempts.test.ts` | 0 | 1/1 |
| `tests/core/approved-spans-enforced.test.ts` | 0 | 22/22 |
| `tests/core/approved-span-sanitization.test.ts` | 0 | 7/7 |
| all 15 `tests/passes/*.test.ts` | 0 | 6,477 assertions, 0 fail |
| `tests/core/llm-seam-wiring.test.ts` | 0 | 7/7 |
| `tests/core/pure-core-boundary.test.ts` | 0 | 6/6 |
| `tests/core/public-benchmark.test.ts` | 0 | 28/28 |
| `tests/core/honesty-audit-claims.test.ts` | 0 | 15/15 |
| `tests/core/pipeline-parallel.test.ts` | 0 | 10/10 |
| `tests/core/core-01/02/03.test.ts` | 0 | 424 / 427 / 307 |
| `tests/core/calibration.test.ts` | 0 | 21/21 |
| `tests/core/scoring-receipt-guard.test.ts` | 0 | 26/26 |
| `tests/core/receipt-gate-inplace-rewrite.test.ts` | 0 | 10/10 |
| `tests/core/brain-coverage.test.ts` | 0 | 8/8 |
| `npm run lint` (`tsc --noEmit`) | 0 | clean |
| `npm run check-no-console` | 0 | 311 files checked, 23 quarantine entries, OK |
| `npm run check-server-reachability` | 0 | OK |
| `npm run check-docs` | 0 | clean |
| `npm run honesty-audit` | 0 | 469 files + 560 markdown + 120 claim rows, clean |
| `npm run gates` | 0 | public-benchmark suite RAN and failed on a raised floor by name |
| `node scripts/check-scoring-receipt.mjs 26d930dd..HEAD` | 0 | names both scoring-path files, receipt accepted |
| output identity, baseline `git archive 26d930dd`, both sides `GIT_SHA=dev` | 0 | all 45 reports byte-identical |

Public benchmark, reproduced with `scripts/benchmark-public.ts --json`, all
six unchanged: shuffle-drop 0.5313 paired / 0.5586 all-pairs (17 ordered, 15
inverted, 0 tied); climax-relocate 0.4063 / 0.4443 (8 / 14 / 10);
DIALOGUE_FLATTEN 1.0000 / 0.9473 (32 / 0 / 0). No floor in
`scripts/lib/auc.ts` was touched and no re-lock was performed.

`npm test` and `npm run brain` were out of scope for this lane and were not
run, so `docs/brain/brain.graph.json` and `GRAPH.md` still need an
integrator's `npm run brain` to include this lane's vault note.

## 7. A gate defect found on the way, not fixed here

Appending the receipt entry after a `---` horizontal rule made
`scripts/check-scoring-receipt.mjs` fail the range by reporting a missing
`**Command**` field on the PRECEDING entry — the 2026-09-12 public-benchmark
re-lock, which writes `**Commands (all run in this worktree…` (plural) and so
does not match `REQUIRED_FIELDS`'s `/\*\*\s*Command\s*:?\s*\*\*/i`.

The mechanism is `entriesModifiedInPlace`: it trims TRAILING BLANK lines off
an entry's span before the overlap test (the 2026-09-19 receipt-gate-inplace
fix), but a `---` line is not blank, so it stays inside the preceding entry's
span, the new hunk overlaps it, and that historical entry is validated as an
"in-place rewrite" — exactly the retroactive re-validation of history the
script's own header says it must not do. Dropping the rule matched the
ledger's existing convention (entries are separated by one blank line) and the
gate passed, so nothing was changed in the script. It is a live trap for the
next lane that separates its entry with a rule.

## 8. What was NOT done

* **`npm test` and `npm run brain`** — excluded by the lane brief.
* **No stricter schema for `approvedSpans` at the route.** It still arrives as
  `z.array(z.unknown())` (`server/lib/validation.ts`), force-cast. Malformed
  spans are handled (`skipped`), not rejected; the real fix is a schema, in
  `validation.ts`, which this lane did not own.
* **No re-derivation from the StoryCommit ledger.** See §4 — there is no
  ledger for a draft a pass just rewrote.
* **`doctor.ts` and the heading grammar** — owned by a concurrent lane.

## 9. Files touched

* `server/nvm/revision/pipeline.ts` — the per-pass re-derivation and span
  re-location, plus the doc comments that used to say spans were threaded
  through unchanged.
* `server/nvm/revision/approved-spans.ts` — new.
* `server/nvm/revision/rewrite-llm.ts` — imports the shared
  `normalizeLineEndings` instead of defining a second one.
* `tests/core/revision-per-pass-diagnostics.test.ts` — new.
* `docs/p1-benchmark/MEASUREMENT_RECEIPTS.md` — the 2026-09-20 entry, appended
  at the end.
* `docs/audits/2026-09-20-per-pass-diagnostics/README.md`,
  `docs/brain/Audits/Audit - 2026-09-20 Per-Pass Diagnostics.md` — this
  record.
