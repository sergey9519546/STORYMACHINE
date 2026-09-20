---
type: audit
updated: 2026-09-20
sources: [docs/audits/2026-09-20-per-pass-diagnostics/README.md, server/nvm/revision/pipeline.ts, server/nvm/revision/approved-spans.ts, server/nvm/revision/rewrite-llm.ts, server/nvm/analyze/fountain-analyzer.ts, server/routes/nvm/revision.ts, tests/core/revision-per-pass-diagnostics.test.ts, docs/p1-benchmark/MEASUREMENT_RECEIPTS.md, SESSION_REPORT_2026-09-19.md]
status: active
---

# Audit — 2026-09-20 Per-Pass Diagnostics

**Directory:** `docs/audits/2026-09-20-per-pass-diagnostics/` — the lane record
for SESSION_REPORT_2026-09-19.md §4 row 3 plus the open half of
`docs/audits/2026-09-19-locked-spans/README.md` §3, on
`lane/per-pass-diagnostics` from `26d930dd`, code commit `e3c3b53a`.

## What it answers

`runRevisionPipeline` (`server/nvm/revision/pipeline.ts`) computed
`records`/`structure`/`annotations` once, from the draft as submitted, and
handed that same triple to all 14 passes while `currentFountain` was rewritten
underneath them. From pass 2 on, every pass diagnosed the pre-revision
document. Measured with a fake rewriter cutting an 18-scene draft to 6 scenes
in pass 1: pass 2 (causality) reported 10 issues — `CAUSAL_ACT1_VOID` over "Act
1 (Scenes 1–4)" of an 18-scene reading, `ACT2_CAUSAL_DESERT` over "Act 2
(Scenes 5–13)" — where the same 6-scene draft analysed from the start reports
2, and passes 2..14 between them named eleven scenes (Scene 7 … Scene 18) that
no longer existed in the document being revised.

The second half is the same shape. An `ApprovedSpan` is a 1-based line range,
meaningful only against one document, and the same array was threaded through
all 14 passes while the line count changed — so a "locked" range could point
at the wrong lines, which also makes `approvedSpansSurvive` (added by the
locked-spans lane the day before) verify the wrong excerpt.

**Fix.** The sequential loop carries the three diagnostics alongside
`diagnosedFountain`, the draft they describe, and replaces them with
`analyzeFountainText(currentFountain)`'s whenever the draft a pass is about to
see differs byte for byte. A no-op pass triggers nothing, which is why the
diagnose-only path is untouched. A failed re-derivation keeps the previous
values, logs `revision_rediagnose_failed`, and does not advance the anchor, so
the next pass retries. `server/nvm/revision/approved-spans.ts` is new, pure and
exported: `relocateApprovedSpans(prevDoc, nextDoc, spans)` cuts each span's
excerpt from the document it was last valid for, finds it as whole lines in the
new one after CRLF/CR → LF normalization, and re-points the line numbers at the
occurrence NEAREST the span's previous position (ties to the earlier), which is
what keeps a lock on the second of two identical blocks from jumping to the
first. It reports `moved`/`lost`/`skipped` as indices only; a lost span keeps
its indices and the pipeline logs `revision_locked_span_lost_between_passes`
with no text. `rewrite-llm.ts` now imports the one shared
`normalizeLineEndings` rather than keeping a second copy.

**The route trade, stated.** On `/api/nvm/revise` the caller's
`records`/`structure` come from the StoryCommit ledger, which carries signal a
text reconstruction only infers. After a pass rewrites the draft they are
replaced by `analyzeFountainText`'s, because there is no ledger for a draft an
LLM just rewrote. Pass 1 — the only pass whose draft the ledger genuinely
describes — still gets the ledger's version.

## Why it is safe to have merged

The doctor reaches this pipeline only inside `runDiagnoseOnly()`, where no
pass's `revisedFountain` ever differs from its input, so both new behaviours
are gated off and the doctor reads the diagnostics it always did. Measured, not
argued: output identity against a `git archive 26d930dd` tree with `GIT_SHA=dev`
on both sides reports `OUTPUT IDENTITY: PASS — all 45 reports are
byte-identical (analyzedAt excluded).`, and all six public-benchmark statistics
reproduce unchanged (shuffle-drop 0.5313 / 0.5586, climax-relocate 0.4063 /
0.4443, DIALOGUE_FLATTEN 1.0000 / 0.9473), with no floor in `scripts/lib/auc.ts`
touched. `node scripts/check-scoring-receipt.mjs 26d930dd..HEAD` names both
scoring-path files and accepts the 2026-09-20 receipt entry. Fail-first,
verified live: `tests/core/revision-per-pass-diagnostics.test.ts` is 11 pass /
3 fail against the unfixed tree and 14 / 0 against this one, with the ten pure
`relocateApprovedSpans` assertions passing on both, as a pure-function suite
must. Every named gate passes unmodified, including all 15
`tests/passes/*.test.ts` (6,477 assertions), the three `tests/routes/nvm-revision*`
files, `approved-spans-enforced`, `llm-seam-wiring`, `pure-core-boundary`,
`public-benchmark` and `honesty-audit-claims`. `tsc --noEmit`,
`check-no-console`, `check-server-reachability`, `check-docs`, `honesty-audit`
and `npm run gates` are clean. `npm test` and `npm run brain` were out of scope
for this lane and were not run, so the committed graph still needs an
integrator's `npm run brain`.

**Related:** [[Audit - 2026-09-19 Locked Spans]],
[[Audit - 2026-09-19 Generation Prompt Inputs]],
[[Audit - 2026-09-19 Revise Deadline]],
[[Audit - 2026-09-19 Receipt Gate Inplace]], [[Patterns]],
`docs/audits/2026-09-20-per-pass-diagnostics/README.md`.

## Sources

- `docs/audits/2026-09-20-per-pass-diagnostics/README.md`
- `server/nvm/revision/pipeline.ts`
- `server/nvm/revision/approved-spans.ts`
- `server/nvm/revision/rewrite-llm.ts`
- `server/nvm/analyze/fountain-analyzer.ts`
- `server/routes/nvm/revision.ts`
- `tests/core/revision-per-pass-diagnostics.test.ts`
- `docs/p1-benchmark/MEASUREMENT_RECEIPTS.md`
- `SESSION_REPORT_2026-09-19.md`
