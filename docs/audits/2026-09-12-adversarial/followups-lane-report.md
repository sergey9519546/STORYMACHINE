# Round-2 follow-ups lane — report

**Worktree:** `/home/user/wt-followups` · **Branch:** `lane/writer-followups`,
branched from `lane/writer-loop-client`'s tip `6dbabc9c` (that branch is the
writer lane rebased onto `main`; `main` fast-forwards to it shortly — this
lane's diff is measured against `6dbabc9c`, not `main`, for that reason).
**Tip:** `55660c9f`, pushed to `origin/lane/writer-followups` after every
commit (`git fetch` + `git rev-parse HEAD origin/lane/writer-followups`
confirm both equal `55660c9f`).

```
55660c9f test(coverage): pin the unmount-abort guard on a call-site count, not a shape
5bc6966a docs(session-store): the rate-limit guard's comment now names .env
c903eca1 fix(verify): scope VERIFY_RATE_LIMIT_MULTIPLIER to browser gates only
```

Source: `docs/audits/2026-09-12-adversarial/writer-review.md` "## Round 2"
(the three "Carried forward" follow-ups) and
`docs/audits/2026-09-12-adversarial/writer-lane-report.md` "## Round 2" (the
lane's own account of item 7). No PRs opened, per instruction. No model
identifiers pushed to any file — trailers only, verbatim, both present on
every commit.

---

## Item 1 — scope `VERIFY_RATE_LIMIT_MULTIPLIER` to browser gates only

**What it was.** `keylessBrowserServerEnv` (`scripts/lib/keyless-browser-
certification.mjs`) put the verification-only 10x rate-limit headroom into
EVERY server it booted. Three callers boot a keyless server specifically to
measure how the PRODUCTION limiter behaves under load, and all three were
silently multiplied along with the eight browser gates:
`scripts/fuzz-routes.mjs:64` (its own 200-concurrent-doctor-requests case,
built to prove `gameLimiter` 429s the overflow), `scripts/verify-production-
build.mjs:204` (the one suite proving the real Dockerfile-shaped boot), and
`scripts/load-test-doctor.mjs:335` (which documents itself as staying
"comfortably under gameLimiter's 120/min ceiling").

**The fix.** `keylessBrowserServerEnv(parentEnv, port, { productionRateLimit
})` — default `false` (unchanged behavior for the eight verify:* browser
suites, which call it with no third argument), and the three non-browser
callers now pass `{ productionRateLimit: true }` to opt OUT of the multiplier
entirely (the key is absent from the spawned env, not just falsy, so the
module-load default in `session-store.ts` — the real 120/20/10-per-minute
ceilings — applies). The default-is-production guard is untouched: unset
still means the production number, exactly as before.

**Measured, before/after, same helper** (130 sequential `GET
/api/ai-providers` against a server booted each way):

| mode | 200s | 429s | first 429 |
|---|---|---|---|
| multiplied (base behavior — what `verify-production-build.mjs` ran) | 130 | 0 | — (masked) |
| `productionRateLimit: true` (fixed) | 120 | 10 | **#121** |

This matches the brief's target exactly ("the production verifier's first
429 at request #121").

**`npm run fuzz-routes` (full, non-`--quick` mode), same server each way:**

| | 200-concurrent-doctor-requests | other flagged findings |
|---|---|---|
| base (`6dbabc9c`) | `{"200":200}` — **0 429s** | 0 |
| fixed | `{"429":200}` — **200/200 429s** | 2 (see below) |

The fuzzer's 429 count returns to non-zero, as asked. **One side effect
found and reported, not engineered around:** running the FULL fuzz suite
(not just the concurrency case) against the real 120/min ceiling means the
~195 sequential attack probes earlier in the same run already spend most of
the budget before the concurrency case even starts, so two unrelated
probes late in the sequence also see 429 instead of their expected
status —

```
[UNEXPECTED-STATUS] A3-bound legitimate-small-boneyard (raw) /api/scriptide/doctor   status=429
[5XX] fdx-conversion-bypass /api/scriptide/doctor/stream (SSE)                       status=500 (synthetic marker for "no doctor_error frame" — the SSE body was a 429, not a crash)
```

Both are reproducible, and both are a direct, foreseeable consequence of
measuring the real ceiling across a fuzz run that fires far more than
120 requests/minute — not a defect in the routes under test, and not
something this narrowly-scoped item asked to be redesigned (pacing or
budget-awareness inside `fuzz-routes.mjs` itself). Flagged here rather than
silently left for someone to rediscover; `npm run fuzz-routes` now exits 1
where it used to exit 0, for this reason alone. `verify-production-build.mjs`
and `load-test-doctor.mjs` do not have this issue — the former's own
71-assertion run stays under 120 requests, the latter is deliberately paced
under the ceiling by design.

**`npm run verify:production` (real end-to-end run, with `PW_CHROMIUM_PATH`
pointed at the installed full-Chromium build since the bundled
`chrome-headless-shell` binary this checkout's Playwright expects is not
present in this sandbox — an environment gap, unrelated to this change):**
`[verify] 71/71 assertions passed.` — 0 FAIL lines, exit 0. Sections 1-5
(boot, headers/CSP/compression, path-traversal + oversized-POST attacks,
bundle size, and the dev-vs-prod doctor-report byte-identity check) and
section 6 (the full Chromium-driven writer journey — sample coverage,
jump-to-line, all four exports, Settings → Session → Delete Everything →
reload) all passed against the now-unmultiplied production server.

**Test:** `tests/core/rate-limit-verification-override.test.ts` gained a new
`describe` block (3 assertions): default still multiplies; `productionRateLimit:
true` removes the key entirely (even if the parent env already carried it);
source-scan confirms all three callers pass the option. Fail-first on
`6dbabc9c`: 2/12 fail. 12/12 pass on the fix.

**Not done / consciously left:** no attempt to re-pace `fuzz-routes.mjs`'s
sequential attack probes to stay under the real per-minute budget — that is
a second, separable change (the item asked to scope the multiplier, not to
redesign the fuzzer's request cadence), and is named as a discovered,
un-engineered-around side effect above rather than silently absorbed.

---

## Item 2 — the guard's comment now names `.env`

**What it was.** `server/lib/session-store.ts`'s "WHY IT CANNOT LOOSEN
PRODUCTION" comment listed every deployment path the guard test actually
scans and read as though nothing else COULD set the variable. Measured (by
the round-2 review): `VERIFY_RATE_LIMIT_MULTIPLIER=10` placed in an
untracked, gitignored `.env` gives `200s=130 429s=0` — identical to the
gate's own server — because `dotenv/config` loads `.env` before the module
runs, and no repository guard can see inside a gitignored file.

**The fix.** One clause added to the existing sentence, in place: "...not
`server/**` or `src/**`. This covers everything a guard CAN cover — it
cannot cover an untracked `.env`: `dotenv/config` loads one before this
module runs, so a value placed there (or in a deployment's own real
environment) is honored the same as any other environment variable, bounded
to the same 1-50 range below." The neighbouring sentence the review said was
already exactly right ("a deployment that never sets the variable is
byte-for-byte the deployment that existed before this comment") is
unchanged, verbatim. No README or claims-register row names this guard, so
the code comment was the only place to fix.

**Test:** a new `describe` block in the same guard-test file asserts the
comment names `.env` and the reason (`dotenv/config`), and re-asserts the
untouched sentence stays exactly right. Fail-first on this lane's own item-1
commit (`c903eca1`): 1/13 fail. 13/13 pass on the fix.

---

## Item 3 — strengthen the item-7 (unmount-abort) guard

**What it was.** `tests/core/coverage-format-unrecognized-card.test.ts`'s
item-7 guard used `assert.doesNotMatch` against one single-line `useEffect`
spelling nobody would write. Measured, planting each of the two realistic
reintroduction routes into `718a0b1d`'s `CoverageSummary.tsx` and running
the OLD test file against each:

| route | old test result |
|---|---|
| (A) append the abort to the existing `aliveRef` unmount cleanup | 17 pass / **1 fail** — caught, but only by the neighbouring cleanup-shape assertion |
| (B) a separate, normally-formatted `useEffect(() => () => { abortRef.current?.abort(); }, [])` | 18 pass / **0 fail** — not caught |

**The fix.** Replaced the `doesNotMatch` with a count assertion: exactly two
`abortRef.current?.abort();` call sites should exist in the file (`run()`'s
supersede prefix and `cancelRun`). The regex requires the trailing `;` so it
counts only real call sites, not the doc comment above `abortRef` that
mentions the pattern in backticks with no semicolon (verified: 3 total
literal occurrences of the bare pattern in the file, 2 with the semicolon).
Added a self-verifying `describe` block (same discipline as `tests/scripts/
wait-for-function-options-position.test.ts`'s six hand-written shapes) that
plants both routes via string substitution on the real source at test time
and asserts the count assertion would fail on each — so a future edit to
the counting rule itself has to keep catching both, without ever touching
the real component file.

**Fail-first, reproduced with each route physically planted into a scratch
copy of `718a0b1d`'s `CoverageSummary.tsx` and the NEW test file pointed at
it:**

| route | new test result |
|---|---|
| (A) aliveRef cleanup | 17 pass / **4 fail** (still caught — now by the count too) |
| (B) separate useEffect | 17 pass / **4 fail** (now caught — was 18/0 before) |
| unmodified source | 21 pass / 0 fail (clean) |

(The self-check block's own 3 assertions additionally "fail" in that same
run when the real file on disk is swapped wholesale for a planted variant,
because its internal `.replace()` fixture no longer finds its anchor in an
already-mutated file — that is an artifact of this evidence-gathering
method, not a flaw in the shipped self-check, which passes 3/3 against the
untouched repository, confirmed in the "unmodified source" row above.)

**Docs correction.** `docs/audits/2026-09-12-adversarial/writer-lane-
report.md`'s Round-2 item-7 paragraph said the shipped test was "asserting
the naive fix is not in the tree and the note is." That undersold what the
OLD test proved (an absence check on one unrealistic spelling) and no
longer describes the NEW test. Corrected in place to say what the new test
actually proves — an exact call-site count that fails regardless of shape —
with a pointer to this report.

**Not done / consciously left:** the unmount-abort gap itself (the real
underlying issue item 7 describes) is not fixed here — the review and the
lane report both agree that closing it properly is a change to the golden
path's concurrency contract, not a test change, and out of scope for a
"strengthen the guard" follow-up. This item only makes the regression guard
honest about what it catches.

---

## Gates (final tip `55660c9f`, run in `/home/user/wt-followups`)

| gate | command | result |
|---|---|---|
| lint | `npx tsc --noEmit` | **0** |
| no-console | `node scripts/check-no-console.mjs` | **0** — 305 files, 23 quarantine entries, all unreachable |
| check-docs | `node --experimental-strip-types scripts/check-docs-quality.ts --all` | **0** — no AI-writing patterns |
| honesty-audit | `node scripts/honesty-audit.mjs` | **0** — 461 files + 473 tracked markdown + 106 claims rows, clean |
| check-brain | `node scripts/brain-graph.mjs --check` | **0** — 105 notes, 386 links, fresh |
| scoring receipt | `node scripts/check-scoring-receipt.mjs 6dbabc9c..HEAD` | **0** — "no scoring-path files changed" |
| output identity | `check-doctor-output-identity.mjs --compare` vs `git archive 6dbabc9c`, `GIT_SHA` pinned equal on both trees | **PASS — 45/45 byte-identical** |
| touched: rate-limit-verification-override | `node --experimental-strip-types tests/core/rate-limit-verification-override.test.ts` | **13/13** |
| touched: keyless-browser-certification | `node --experimental-strip-types tests/scripts/keyless-browser-certification.test.ts` | **2/2** |
| touched: coverage-format-unrecognized-card | `node --experimental-strip-types tests/core/coverage-format-unrecognized-card.test.ts` | **21/21** |
| evidence: fuzzer | `node scripts/fuzz-routes.mjs` (full mode) | 429s non-zero (200/200 in the concurrency case); exit 1 — 2 flagged findings, explained under item 1 above |
| evidence: production verifier | `PW_CHROMIUM_PATH=/opt/pw-browsers/chromium-1194/chrome-linux/chrome node scripts/verify-production-build.mjs` | **71/71 assertions passed, 0 FAIL, exit 0** |
| full suite | `npm test` | 13632 tests, **13537 pass, 3 fail**, 91 skipped, 1 todo (duration 1356228ms — the sandbox was under load average 15-29 on 4 CPUs from concurrent sibling sessions during this run) |

**On the 3 `npm test` failures.** All three are in `tests/core/doctor-
analysis-budget.test.ts` (a file this lane never touches, and not
scoring-path — confirmed by the receipt check above) and are pure
wall-clock timing assertions: `admission must answer in milliseconds, took
70ms`, and `the realistic feature took 35493ms of wall clock — the 30000ms
budget would have fired on real writing`. Re-ran that one file in isolation
once load dropped (`uptime` load average 2.38 at the time): **27/27 pass,
0 fail.** These are load-induced timing flakes from this sandbox running
several concurrent agent sessions' test suites at once (4 CPUs, load
average as high as 29 during the full run), not a regression from this
lane's diff.

## Tip and origin

`origin/lane/writer-followups` == `55660c9f` (confirmed via `git fetch` +
`git rev-parse HEAD origin/lane/writer-followups`, both equal). `main` was
not touched. `lane/writer-loop-client`'s tip `6dbabc9c` will shortly be what
`main` fast-forwards to, per the task's own note — this lane's base is that
tip, not `main` itself.
