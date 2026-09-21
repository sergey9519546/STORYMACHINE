# 2026-09-21 — review of PR #268: four findings, all CONFIRMED and fixed

**Lane:** `lane/codex-review-268`, branched from `bed7535d`.
**Commits:** `d2cda09b` (F1), `fa0c7719` (F2), `c02bf3c9` (F3), `b2dca60d` (F4),
plus this record and the measurement receipt.
**Scope:** the four findings an external review raised against PR #268. Each
was reproduced against the tree as it stood before the fix, by a test that
failed on that tree and passes on this one. Nothing here is a code-reading
argument alone.

Verdicts: **F1 CONFIRMED. F2 CONFIRMED. F3 CONFIRMED. F4 CONFIRMED.** None was
NOT REPRODUCED.

How the two pre-existing findings were re-verified for this record: the
`bed7535d` tree was extracted with `git archive` into a scratch directory,
`node_modules` was symlinked in from the checkout, the CURRENT test files were
copied over it, and the suites were run there. That is a real fail-first
measurement of the shipped tests against the unfixed source, not a
re-description of the original session's claim.

---

## F1 (P1) — the aligned candidate never reached the batch the fallback returns

**Claim.** In `server/nvm/converge/loop.ts`, `candidate =
castAlignmentOutcome.ir` rebound only the loop-local variable. `candidates[ci]`
— the array `lastCandidates` aliases — kept the UNALIGNED IR. When the aligned
candidate then failed a DIFFERENT Tier-1 proof, `best` stayed null and the
budget-exhausted path returned `lastCandidates[last]`, so the model's invented
character ids left the loop while every step and record said they had been
aligned, and `/api/nvm/converge-arc` applied those ids to `rollingState`.

**Reproduction.** `tests/nvm/converge/cast-alignment.test.ts:475`, run against
the `bed7535d` tree:

```
not ok 21 - F1: an aligned candidate that still fails another Tier-1 proof is returned ALIGNED by the budget-exhausted fallback
  error: 'the fallback IR must carry the ALIGNED cast, not the invented name (ops reference: PROTAGONIST, PROTAGONIST, DESMOND)'
```

**Verdict: CONFIRMED.** The assertion names the exact symptom: the fallback IR
still references `PROTAGONIST`, the invented name the alignment step had
resolved away.

**Fix (`d2cda09b`).** One added line, `candidates[ci] = candidate;`, directly
after the rebinding, with a comment stating why. With the flag off
`alignCandidateCast` returns the SAME object reference, so the write-back is
provably a no-op on every deployment that never enabled the feature.

**Test.** The fail-first case above, plus the file's existing flag-off
byte-identity property (`convergeScene`'s history has no `castAlignment` key at
all when `TYPESAFE_CAST_ALIGNMENT` is unset).

**Gate result.** `tests/nvm/converge/cast-alignment.test.ts` 21/21 on this
tree; `tests/routes/nvm-converge-validation.test.ts` 9/9.

---

## F2 (P1) — the survival check and the relocation applied two different rules

**Claim.** `approvedSpansSurvive` (`server/nvm/revision/rewrite-llm.ts`)
decided a locked excerpt was "present" with a bare substring `includes` (and a
substring occurrence count for a single-line excerpt), while the next pass's
`relocateApprovedSpans` (`server/nvm/revision/approved-spans.ts`) required the
excerpt as WHOLE LINES. A rewrite that embedded the locked lines inside a
modified line — a prefix on the first locked line, a suffix on the last — was
therefore accepted at the rewrite seam and then could not be found on the
following pass, and the lock was dropped with no warning.

**Reproduction.** `tests/core/approved-spans-enforced.test.ts:216` (the
`F2: survival and relocation apply the same line-aligned rule` block, five
subtests), run against the `bed7535d` tree — 22 pass / 5 fail, the first being:

```
not ok 1 - a prefix on the first locked line: the rewrite is REJECTED (lost=[0]), not accepted on a substring match
  error: |-
    a locked excerpt embedded in a modified line is not verbatim survival (a prefix on the first locked line)

    true !== false
```

**Verdict: CONFIRMED.** The agreement subtests also showed the two functions
disagreeing on the same input: relocation reporting `lost=[0]` where survival
reported `lost=[]`.

**Fix (`fa0c7719`).** `lineAlignedOccurrences` is exported from
`approved-spans.ts` and is now the one rule both functions apply; the private
substring `countOccurrences` in `rewrite-llm.ts` is gone. A rewrite survives
exactly when relocation can find it, by construction rather than by two
implementations agreeing.

**Test.** The five subtests above, including the paired "relocation reaches the
same verdict on the same input" cases that pin the agreement itself rather than
each side separately.

**Gate result.** `tests/core/approved-spans-enforced.test.ts` 27/27;
`tests/core/approved-span-sanitization.test.ts` 10/10;
`tests/core/llm-seam-wiring.test.ts` 7/7.

---

## F3 (P2) — duplicate excerpts lost their occurrence identity

**Claim.** `relocateApprovedSpans` re-pointed every span at the occurrence of
its excerpt NEAREST the old line number. For an excerpt that is not unique that
rule loses the only thing identifying WHICH copy the author locked. With
identical blocks at lines 10 and 20 and the SECOND locked, a pass that inserts
15 lines at the top moves them to 25 and 35, and nearest-to-20 picks 25 — the
first copy, the one the author left free. From that pass on the lock protects a
passage nobody approved while the approved one is freely editable.

**Reproduction.** Three cases in
`tests/core/revision-per-pass-diagnostics.test.ts` (`:344`, `:363`, `:379`),
run against this worktree before the fix. The first:

```
not ok 4 - F3: with identical blocks at 10 and 20, the second locked, 15 lines inserted at the top relocate it to 35 (not 25)
  error: |-
    the lock must follow the 2nd occurrence, not the copy that happens to be nearest the old line number
    + actual - expected

      [
        {
    +     endLine: 26,
    -     endLine: 36,
          reason: 'the second one',
    +     startLine: 25
    -     startLine: 35
        }
      ]
```

The other two failed on the missing field: `undefined !== [0]` ("3 copies
became 2: which one the author locked cannot be known from the text") and
`undefined !== []`.

**Verdict: CONFIRMED.** The lock landed on line 25 — the copy at the first
position — where the author had locked the copy that is now at 35.

**Fix (`c02bf3c9`).** A span's identity among identical blocks is its ORDINAL:
"the 2nd of 2". That ordinal still means something exactly when the number of
occurrences is unchanged, so relocation now records which occurrence the span
was in the OLD document and takes the same one in the NEW document whenever the
counts match — however far the text has slid. When the count CHANGED, no
ordinal survives: the previous nearest-occurrence rule applies unchanged (ties
still to the earlier occurrence, which needs no tie-break clause because
`lineAlignedOccurrences` returns ascending candidates) and the span is reported
in a new `ambiguous` array. A span with a single candidate in the new document
is never ambiguous — there is nothing to choose between.

`ApprovedSpanRelocation` gains `ambiguous: number[]`, indices into the input
array exactly like `moved`/`lost`/`skipped`, never span text, so it is safe to
log. `server/nvm/revision/pipeline.ts` reads it the way it already reads
`lost`: caller-facing indices collected into a new `ambiguousApprovedSpans`
field on `RevisionResult`, plus one
`revision_locked_span_ambiguous_between_passes` warning carrying counts only.
Unlike a lost span an ambiguous one is NOT dropped — its text is still in the
draft, so it stays enforced; what the run reports is that the placement is a
guess. `server/routes/nvm/revision.ts` already returned the result unreshaped,
so the field reaches the author with no further wiring (its comments were
updated to say so).

**Test.** The three pure cases above, plus
`tests/core/revision-per-pass-diagnostics.test.ts:628`, which drives the whole
pipeline: a lock on the fifth of 18 identical action lines, a pass that
rewrites the first copy (18 copies become 17, no line added or removed), and
assertions that the span is still enforced on the same text, is NOT in
`lostApprovedSpans`, IS in `ambiguousApprovedSpans`, and that the warning
carries neither screenplay text nor the span's reason. The pre-existing
"ties between equidistant occurrences go to the earlier one" case is untouched
and still passes, as does "a duplicated excerpt resolves to the occurrence
nearest the previous position" — three copies on both sides, so the ordinal
path handles it and returns the same answer.

**Gate result.** `tests/core/revision-per-pass-diagnostics.test.ts` 22/22;
`tests/core/script-doctor.test.ts` 86/86;
`tests/routes/nvm-revision.test.ts` 13/13;
`tests/routes/nvm-revision-approved-spans-schema.test.ts` 15/15;
`tests/core/pipeline-parallel.test.ts` 10/10;
`tests/core/pure-core-boundary.test.ts` 6/6.

---

## F4 (P2) — the upstream's error body walked into the logs

**Claim.** On a non-2xx TypeSafe reply, `server/lib/ai-providers/typesafe.ts`
threw `TypeSafe returned HTTP <status>: <redactSecrets(raw).slice(0, 300)>`.
That message is not an operator's private string: `alignCandidateCast` copied
it into `CastAlignment.error`, `skip()` logged it through `logger.warn`, and
the converge response serializes it into history. `raw` is the UPSTREAM's
bytes, and an upstream that rejects a request by quoting it — the ordinary
shape of a validation 400 — hands back the `state` the adapter just sent. For
this adapter's only caller that state is `stateDoc.candidate` (the rendered
candidate ops) and `stateDoc.scene.theme` (the target's theme hint), so the
writer's own material could escape into operational logs, against the
adapter's own no-state-in-logs contract.

**Reproduction.** Two fail-first tests. `tests/core/typesafe-adapter.test.ts:335`
sends a 400 whose body echoes a marker taken from the submitted state:

```
not ok 16 - (F4) a non-2xx body is never echoed into the thrown message — only the status and a fixed category
  error: |-
    the message is a fixed category plus the status
    + actual - expected

    + 'TypeSafe returned HTTP 400: {"error":"rejected","echo":{"state":{"note":"ZZSTATEMARKF4","scene":"Ilka argues the bridge is safe"}}}'
    - 'typesafe_http_400'
```

`tests/nvm/converge/cast-alignment.test.ts:279` drives the real caller with a
transport that quotes the whole request back at status 400, after first
asserting both markers reached the wire:

```
not ok 12 - (F4) an upstream error body that echoes the submitted candidate reaches neither the recorded error nor a log line
  error: |-
    + 'TypeSafe returned HTTP 400: {"error":"invalid request","echo":{"model":"jev-1.13.0","state":{"cast":["DESMOND","ILKA"],"names":["PROTAGONIST"],"scene":{"function":"build_tension","tension":60,"theme":"trust costs ZZTHEMEMARKF4"},"candidate":"APPRAISE_EMOTION PROTAGONIST: distress\nSHIFT_RELATIONSHIP'
    - 'typesafe_http_400'
```

**Verdict: CONFIRMED.** The theme hint (`trust costs ZZTHEMEMARKF4`) and the
start of the rendered candidate are both visible in the value that became
`CastAlignment.error` and was passed to `logger.warn`.

**Fix (`b2dca60d`).** The non-2xx branch throws `typesafe_http_<status>` and
nothing else; the status stays available as the typed `status` field callers
already branch on. Slicing to 300 characters bounded the SIZE of the leak, not
the leak, and `redactSecrets` only removes patterns it can recognise — a
writer's prose is not one of them. `parseBody`'s answer-shape message loses its
`"${id}"` interpolation for the same reason (an answer id is a key of the
upstream's own JSON, so it is upstream-controlled text) and becomes the fixed
`typesafe_bad_response`; the other malformed messages were already fixed
strings and are unchanged.

`server/nvm/converge/cast-alignment.ts` stops deriving its recorded error from
the message at all. A new `failureCategory()` reads the TYPED `reason`/`status`
— `typesafe_http_429`, `typesafe_timeout`, `typesafe_transport` — so the
property holds whatever message a future error arrives with, and an error that
is not the adapter's typed one yields one fixed word (`typesafe_unavailable`)
rather than its own text. `CastAlignment.error`'s doc comment now says the
field is a category, not redacted text.

**Test.** The two cases above, plus a malformed-2xx case
(`tests/core/typesafe-adapter.test.ts:356`) covering the answer-id path. The
cast-alignment case asserts on the WHOLE captured log stream, not on a named
field, and also asserts the category IS present so the fix cannot be satisfied
by logging nothing. The existing 401 key-echo test
(`tests/core/typesafe-adapter.test.ts:301`) was updated to pin the stronger
property — the body is not in the message at all, redacted or otherwise —
while still pinning `redactSecrets` itself, which remains the guard on the
transport and malformed paths where the message comes from a local exception.

**The existing guards, and what was extended.** Neither of the repository's two
log-content guards covered this surface before. `tests/routes/
no-writer-content-in-logs.test.ts` is keyless and route-level: converge cast
alignment needs `TYPESAFE_API_KEY` and `TYPESAFE_CAST_ALIGNMENT`, so that test
cannot reach it, for the same reason it cannot reach `server/engine/**`.
`tests/core/engine-logs-content-field-guard.test.ts` is the source scanner for
raw-text fields in `logger.*` calls, and it scanned `server/engine` only. Its
`SCAN_DIR` is now `SCAN_DIRS = ['server/engine', 'server/lib/ai-providers',
'server/nvm/converge']` (`tests/core/engine-logs-content-field-guard.test.ts:52`),
with a per-directory sanity assertion so a mistyped path cannot silently scan
nothing. Stated plainly: F4 itself leaked through an `error:` field, not one of
the names that guard looks for, so the guard extension is defence against the
same CLASS on the same surface — the behavioural proof of F4 is the two tests
above.

**Gate result.** `tests/core/typesafe-adapter.test.ts` 18/18;
`tests/nvm/converge/cast-alignment.test.ts` 21/21;
`tests/core/engine-logs-content-field-guard.test.ts` 3/3;
`tests/routes/no-writer-content-in-logs.test.ts` 3/3.

---

## Whole-lane gates

| gate | result |
|---|---|
| `npm run lint` (`tsc --noEmit`) | exit 0 |
| `npm run check-no-console` | exit 0 — 313 files, 3 quarantine entries, all proven unreachable |
| `node scripts/check-doctor-output-identity.mjs --compare` vs `git archive bed7535d` | `OUTPUT IDENTITY: PASS — all 45 reports are byte-identical (analyzedAt excluded).` — 0 of 45 differ |
| `npm run benchmark:public` | 28/28; all six floors reproduce unchanged (shuffle-drop 0.5313 / 0.5586, climax-relocate 0.4063 / 0.4443, DIALOGUE_FLATTEN 1.0000 / 0.9473); no constant in `scripts/lib/auc.ts` touched |
| `node scripts/check-scoring-receipt.mjs bed7535d..HEAD` | exit 0 against the 2026-09-21 F3 entry in `docs/p1-benchmark/MEASUREMENT_RECEIPTS.md` |
| `tests/core/honesty-audit-claims.test.ts` | 15/15 |
| `tests/core/brain-coverage.test.ts` | 8/8 |
| `npm run brain && npm run check-brain` | exit 0 |

The scoring-path files in this range are `server/nvm/revision/approved-spans.ts`
and `server/nvm/revision/pipeline.ts`, both classified so because they are
reachable from `doctor.ts`'s import graph, not because the doctor calls either
to compute a number. F2 and F3 DO change behaviour — which lines a locked span
points at after a pass rewrites the draft, and whether the pipeline calls that
placement certain — but that behaviour is unreachable from the doctor, which
reaches this pipeline only inside `runDiagnoseOnly()`, where no pass's
`revisedFountain` ever differs from its input and the relocation block never
executes; it also passes no approved spans at all. The 45 byte-identical
reports and the six unchanged public-benchmark statistics are the measurement
of that argument, not its restatement. **No AUC-24 figure is claimed: the
private real-script corpus is not present in this environment and
`REAL_SCRIPT_CORPUS_DIR` is unset here.**

The full `npm test` was deliberately not run in this lane; it is the
orchestrator's run. Every file named above was run individually, and the counts
in this record are the counts those runs printed.

## What is NOT closed

- `tests/fixtures/auc24-table.json` still does not exist, so
  `tests/core/auc24-table.test.ts` still skips and
  `scripts/report-unverified-gates.mjs` still reports the gap. Nothing in this
  lane touches that; `npm run lock-auc24` remains the owner's step.
- The public benchmark's pre-registered split is still reported rather than
  used — all six floors were locked from all 32 scripts, holdout included.
  Unchanged by this lane, and restated here only so this record is not read as
  evidence about discrimination.
