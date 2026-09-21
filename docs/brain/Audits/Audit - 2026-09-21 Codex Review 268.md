---
type: audit
updated: 2026-09-21
sources: [docs/audits/2026-09-21-codex-review-268/README.md, server/nvm/converge/loop.ts, server/nvm/converge/cast-alignment.ts, server/lib/ai-providers/typesafe.ts, server/nvm/revision/approved-spans.ts, server/nvm/revision/rewrite-llm.ts, server/nvm/revision/pipeline.ts, server/routes/nvm/revision.ts, tests/nvm/converge/cast-alignment.test.ts, tests/core/approved-spans-enforced.test.ts, tests/core/revision-per-pass-diagnostics.test.ts, tests/core/typesafe-adapter.test.ts, tests/core/engine-logs-content-field-guard.test.ts, docs/p1-benchmark/MEASUREMENT_RECEIPTS.md]
status: active
---

# Audit — 2026-09-21 Codex Review 268

**Directory:** `docs/audits/2026-09-21-codex-review-268/` — the lane record for
the four findings an external review raised against PR #268, on
`lane/codex-review-268` from `bed7535d`; code commits `d2cda09b` (F1),
`fa0c7719` (F2), `c02bf3c9` (F3), `b2dca60d` (F4).

## What it answers

All four are CONFIRMED, each by a test that failed on the tree as it stood
before its fix and passes on this one. The two earlier findings were
re-verified for this record by extracting `bed7535d` with `git archive`,
copying the CURRENT test files over it, and running the suites there.

**F1 — the aligned candidate never reached the batch.** In
`server/nvm/converge/loop.ts`, `candidate = castAlignmentOutcome.ir` rebound
only the loop-local variable while `candidates[ci]` — the array
`lastCandidates` aliases — kept the unaligned IR. An aligned candidate that
then failed a DIFFERENT Tier-1 proof left the loop through the
budget-exhausted fallback with the model's invented character ids restored,
while every step and record said they had been aligned, and
`/api/nvm/converge-arc` applied those ids to `rollingState`. Reproduced at
`tests/nvm/converge/cast-alignment.test.ts:475`: "the fallback IR must carry
the ALIGNED cast, not the invented name (ops reference: PROTAGONIST,
PROTAGONIST, DESMOND)". Fixed by one line, `candidates[ci] = candidate;`; with
the flag off the aligner returns the same object reference, so it is a no-op
there.

**F2 — two rules for one question.** `approvedSpansSurvive`
(`server/nvm/revision/rewrite-llm.ts`) decided "the locked excerpt is present"
with a substring `includes`, while `relocateApprovedSpans`
(`server/nvm/revision/approved-spans.ts`) required whole lines. A rewrite that
embedded the locked lines inside a modified line was accepted at the seam,
could not be found on the next pass, and the lock was dropped with no warning.
Reproduced by five subtests under `tests/core/approved-spans-enforced.test.ts:216`
— first failure "a locked excerpt embedded in a modified line is not verbatim
survival (a prefix on the first locked line) — true !== false" — including
paired cases showing relocation reporting `lost=[0]` where survival reported
`lost=[]`. Fixed by exporting `lineAlignedOccurrences` and making it the one
rule both apply; `rewrite-llm.ts`'s private substring `countOccurrences` is
gone.

**F3 — duplicate excerpts lost their occurrence identity.** Relocation picked
the occurrence NEAREST the old line number, which for a non-unique excerpt
loses the only thing identifying which copy the author locked: identical blocks
at lines 10 and 20 with the SECOND locked, 15 lines inserted at the top, and
nearest-to-20 picks 25 rather than 35 — so the lock protects a passage nobody
approved while the approved one becomes freely editable. Reproduced at
`tests/core/revision-per-pass-diagnostics.test.ts:344` (actual `startLine: 25`,
expected 35). The fix makes the ORDINAL the identity: the same k-th occurrence
is taken whenever the occurrence COUNT is unchanged, however far the text has
slid; when the count changed, the previous nearest rule applies unchanged (ties
still to the earlier occurrence) and the span is reported in a new `ambiguous`
index array. A single candidate is never ambiguous. An ambiguous span is NOT
dropped — its text is still in the draft — so it stays enforced and the run
reports that the placement is a guess. `pipeline.ts` reads it the way it reads
`lost`: caller-facing indices into a new `ambiguousApprovedSpans` on
`RevisionResult`, plus one `revision_locked_span_ambiguous_between_passes`
warning carrying counts only; the route already returned the result unreshaped.

**F4 — the upstream's error body walked into the logs.** On a non-2xx reply
`server/lib/ai-providers/typesafe.ts` threw a message embedding up to 300
characters of the response body, and `alignCandidateCast` copied it into
`CastAlignment.error`, `skip()` logged it, and the converge response
serializes it into history. Everything this step submits is the writer's
material — `stateDoc.candidate` is the rendered candidate ops,
`stateDoc.scene.theme` the target's theme hint — so an upstream that rejects a
request by quoting it hands this deployment its own writer content back and it
escapes into operational logs. Reproduced twice, with markers proven to have
reached the wire: `tests/core/typesafe-adapter.test.ts:335` and
`tests/nvm/converge/cast-alignment.test.ts:279`, both showing the theme marker
and the rendered candidate inside the value that became `CastAlignment.error`.
The non-2xx branch now throws `typesafe_http_<status>` and nothing else (the
status stays a typed field), `parseBody`'s answer-shape message loses its
upstream-controlled `"${id}"` and becomes `typesafe_bad_response`, and
cast-alignment's new `failureCategory()` reads the TYPED reason/status rather
than any message. Slicing to 300 characters bounded the size of the leak, not
the leak; `redactSecrets` only removes patterns it recognises, and prose is not
one of them.

**The guard that did not cover this.** Neither
[[Audit - 2026-09-20 Per-Pass Diagnostics]]-era log guard reached this surface:
`tests/routes/no-writer-content-in-logs.test.ts` is keyless and route-level, and
converge cast alignment needs a TypeSafe key and its flag;
`tests/core/engine-logs-content-field-guard.test.ts` scanned `server/engine`
only. That scanner now covers `server/lib/ai-providers` and
`server/nvm/converge` as well, with a per-directory sanity assertion. Stated
plainly in the README: F4 leaked through an `error:` field, not one of the
names that scanner looks for, so the extension is defence against the same
class on the same surface — the behavioural proof is the two tests.

## Why it is safe to have merged

The scoring-path files in this range are `server/nvm/revision/approved-spans.ts`
and `server/nvm/revision/pipeline.ts`, both classified so only because they are
reachable from `doctor.ts`'s import graph. F2 and F3 change behaviour, but that
behaviour is unreachable from the doctor: it reaches this pipeline only inside
`runDiagnoseOnly()`, where no pass's `revisedFountain` ever differs from its
input so the relocation block never executes, and it passes no approved spans
at all. Measured rather than argued — output identity against a
`git archive bed7535d` tree with `GIT_SHA=dev` on both sides reports
`OUTPUT IDENTITY: PASS — all 45 reports are byte-identical (analyzedAt
excluded).`, and all six public-benchmark statistics reproduce unchanged
(shuffle-drop 0.5313 / 0.5586, climax-relocate 0.4063 / 0.4443,
DIALOGUE_FLATTEN 1.0000 / 0.9473) with no floor in `scripts/lib/auc.ts`
touched. `node scripts/check-scoring-receipt.mjs bed7535d..HEAD` accepts the
2026-09-21 F3 receipt entry. **No AUC-24 figure is claimed: the private corpus
is not present in this environment and `REAL_SCRIPT_CORPUS_DIR` is unset here.**
Gates: `lint` 0, `check-no-console` 0, `revision-per-pass-diagnostics` 22/22,
`approved-spans-enforced` 27/27, `approved-span-sanitization` 10/10,
`cast-alignment` 21/21, `typesafe-adapter` 18/18,
`engine-logs-content-field-guard` 3/3, `no-writer-content-in-logs` 3/3,
`script-doctor` 86/86, `pipeline-parallel` 10/10, `pure-core-boundary` 6/6,
`llm-seam-wiring` 7/7, `nvm-revision` 13/13,
`nvm-revision-approved-spans-schema` 15/15, `nvm-converge-validation` 9/9,
`public-benchmark` 28/28, `honesty-audit-claims` 15/15, `brain-coverage` 8/8.
The full `npm test` was out of scope for this lane and was not run.

**Related:** [[Audit - 2026-09-20 Per-Pass Diagnostics]],
[[Audit - 2026-09-19 Locked Spans]], [[Patterns]],
`docs/audits/2026-09-21-codex-review-268/README.md`.

## Sources

- `docs/audits/2026-09-21-codex-review-268/README.md`
- `server/nvm/converge/loop.ts`
- `server/nvm/converge/cast-alignment.ts`
- `server/lib/ai-providers/typesafe.ts`
- `server/nvm/revision/approved-spans.ts`
- `server/nvm/revision/rewrite-llm.ts`
- `server/nvm/revision/pipeline.ts`
- `server/routes/nvm/revision.ts`
- `tests/nvm/converge/cast-alignment.test.ts`
- `tests/core/approved-spans-enforced.test.ts`
- `tests/core/revision-per-pass-diagnostics.test.ts`
- `tests/core/typesafe-adapter.test.ts`
- `tests/core/engine-logs-content-field-guard.test.ts`
- `docs/p1-benchmark/MEASUREMENT_RECEIPTS.md`
