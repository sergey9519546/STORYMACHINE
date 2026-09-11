# verify-report CLI lane — independent review (reconstructed)

*The full review file (two rounds, ~35 KB) was lost in the 2026-09-07 sandbox
rebuild. What follows is the reviewer's own text, verbatim from the session
transcript: the round-1 headline, verdict and its first finding; the round-2
verdict and its one follow-up. Reviewed objects: 16bfec58 (round 1), 42206178
(round 2); base main c16f7e0c. The review ran from a read-only `git archive`
export; the lane worktree was only ever read.*

## Round 1 — headline and verdict (verbatim)

Headline: the receipt is the best part of this lane and reproduces bit-exact.
The extraction is faithful. The privacy claim holds under a runtime
trip-wire, not just under grep. But the primary deliverable — a tool whose
entire contract is "this report is or is not genuine" — prints
`VERIFIED` and exits `0` on a forged report in two of its three artifact
shapes. That is finding 1 and it is why this is REVISE rather than MERGE.

**REVISE** — findings 1 and 2 are correctness defects in the shipped
deliverable: the tool reports `VERIFIED`, exit `0`, on reports that are not
genuine. Everything else in this lane is strong and should survive the
revision untouched — in particular do **not** rework the receipt, the
extraction, or the CI/copy/golden work.

1. **`VERIFIED` on a health claim the parser could not read as a number
   (verification bypass).** `scripts/verify-report.mjs:124`
   (`expected.health = Number(claims['Health'])`) and `:155`
   (`Number(healthMatch[1])`, whose `[\d.]+` capture happily matches
   `6.5.0`) feed an unvalidated `Number()` result into
   `server/lib/verify-compare.ts:116`. `Math.abs(NaN - 65) > 0.05` is
   **false**, so no mismatch is recorded and the run reports success. The
   route is immune because `VerifyBodySchema`/`VerifyExpectedSchema` put zod
   in front of the same comparator and `z.number()` rejects `NaN` (verified);
   the extraction reused the comparator without the validation that was
   guarding it. Reproduce:
   ```
   sed 's|<dt>Health</dt><dd><code>65.0</code></dd>|<dt>Health</dt><dd><code>OUTSTANDING</code></dd>|' report.html > attack-nan.html
   npm run verify-report -- attack-nan.html script.fountain
   #   health: yes  (report NaN, local 65, Δ NaN)
   ```

*(Findings 2–5 — a forged headline beside a genuine verify block passing
untouched; the CRLF diagnosis; the `build-info.ts` git fallback hanging
module load past 8 s; and two copy items — are lost with the file. Round 2's
verdict below lists what closed them.)*

## Round 2 — verdict (verbatim)

**MERGE.** All five round-1 findings are closed, verified by re-running my own
attacks plus the two new ones against a read-only export of `42206178`. The
two fixes that carried real regression risk — a validation layer that could
have rejected genuine reports, and a cross-check that could have false-fired
on them — were checked in the failure direction first: four genuine artifacts
exported from a live keyless server all verify at exit 0, with every extractor
confirmed to be matching rather than silently collecting nothing. Item 1 was
fixed by importing the route's own schema rather than re-declaring one, and
item 2 correctly leaves the consistent forgery to the reproduction backstop
instead of over-triggering. Output identity re-verified at the merged commit.

One non-blocking follow-up, for the merge record rather than another round:

1. **Amend the 2026-09-06 receipt entry for the round-2 `build-info.ts`
   touch.** `docs/p1-benchmark/MEASUREMENT_RECEIPTS.md` was not updated in
   `16bfec58..42206178`, so its "What changed on the scoring path" paragraph
   still enumerates only the fallback's original failure modes ("no `.git`, no
   `git` binary, an unresolvable HEAD") and not the new 2 s timeout, and its
   Runner attestation describes a harness run against the `16bfec58` tree
   while the merged commit is `42206178`. The gate passes (the entry is
   well-formed and in range) and the substance is sound — I re-ran the harness
   at `42206178` myself and got `OUTPUT IDENTITY: PASS`, 45/45 modulo
   `engineCommit`, plus a `16bfec58` vs `42206178` PASS proving round 2 moved
   nothing — so this is a documentation-completeness fix, not a correctness
   one.

*Built as 81ec1652 (receipt amended to attest 42206178) before the merge.*
