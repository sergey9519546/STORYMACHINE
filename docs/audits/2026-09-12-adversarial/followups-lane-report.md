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

The fuzzer's 429 count returns to non-zero, as asked. **CORRECTED in round 2
(round-3 review item 1): this was undercounted by 9x, and a second cost went
unmentioned entirely.** Running the FULL fuzz suite against the real
120/min ceiling means the ~195 sequential attack probes earlier in the same
run already spend most of the budget before the concurrency case even
starts. The real count is **18** `status=429` lines, not two — only two of
those eighteen are *flagged* (`[UNEXPECTED-STATUS]` / `[5XX]`, shown below);
the other sixteen are silently absorbed as `[ok]` because 429 is in the
harness's accepted-status set, for probes written to prove a validation
rejection (`empty-body /api/analyze-script`, `array-body
/api/simulate-to-fountain`, `no-content-type /api/nvm/selfplay`,
`commitId-path-traversal`, `numeric-1e308`, and eleven more). **Separately,
and not mentioned in the original round-1 report at all: both
`ws-oversized-frame (10MB)` and `ws-10000-message-burst` stop running
entirely** — the room-mint POST both depend on returns 429 once the window
is spent, and the harness prints a skip line and returns rather than
attempting either attack. On the unfixed baseline both execute and pass.

```
[UNEXPECTED-STATUS] A3-bound legitimate-small-boneyard (raw) /api/scriptide/doctor   status=429
[5XX] fdx-conversion-bypass /api/scriptide/doctor/stream (SSE)                       status=500 (synthetic marker for "no doctor_error frame" — the SSE body was a 429, not a crash)
```

All of this is reproducible, and all of it is a direct, foreseeable
consequence of measuring the real ceiling across a fuzz run that fires far
more than 120 requests/minute — not a defect in the routes under test, but
a real, disclosed-too-narrowly cost of the round-1 fix, closed properly in
Round 2 below (the reviewer's preferred two-server design) rather than left
as a documented trade-off. `verify-production-build.mjs` and
`load-test-doctor.mjs` never had this issue — the former's own 71-assertion
run stays under 120 requests, the latter is deliberately paced under the
ceiling by design.

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

## Round 2

**Reviewed object:** `55660c9f` (round-1 tip). **Round-2 tip:** `da4a6539`,
two commits on top, pushed after each. Source:
`docs/audits/2026-09-12-adversarial/writer-review.md` "## Round 3
(follow-ups lane)" (committed on `origin/main`, `11f76f8f`).

```
da4a6539 test(coverage): close the abort-count guard's semicolon escape
3a40bfd3 fix(fuzz-routes): give the overflow case its own server on a fresh window
```

### Item 1 — the fuzzer, closed at the reviewer's preferred fix

**What was wrong, corrected to the real numbers.** The round-2 report said
"two unrelated probes" and did not mention the WebSocket attacks at all. The
reviewer measured, and I confirmed reproducing the round-1 build:
**18** `status=429` lines (not two), **sixteen** validation probes scored
`[ok]` by the rate limiter instead of their own route (`empty-body
/api/analyze-script`, `commitId-path-traversal`, `numeric-1e308`, and
thirteen more), **both** `ws-oversized-frame` and `ws-10000-message-burst`
skipped ("room mint returned 429"), and the headline
200-concurrent-doctor-requests case read `{"429":200}` with **zero**
successes — a window already spent 195 requests earlier, unable to
distinguish "sheds the overflow while legitimate traffic gets through" from
"refuses everything." Both corrections (18, and the two named WS cases) are
now in the item-1 write-up below and in the commit message.

**The fix — the reviewer's preferred close, built.** `bootServer` takes an
options argument (`{ productionRateLimit }`, default `false`). `main()` now
boots TWO servers:

1. The default (multiplied) server — same as every other keyless gate —
   carries the ~195 sequential validation probes and the collab WebSocket
   attacks. None of them are about the rate limiter, and none of them are
   about to answer 429 for a route's own rejection ever again.
2. A second, freshly-booted server with `{ productionRateLimit: true }`,
   booted immediately before `concurrencyAttack` and used for nothing else,
   so the 200-request burst hits a genuinely untouched 60s window.

`concurrencyAttack`'s own assertion now checks BOTH halves of the property
the case exists to prove: `succeeded > 0` (legitimate traffic gets through)
AND an overflow signal is present (`rate-limited > 0` OR
`session-capacity-refused > 0`). Either extreme — 200/200 succeeding (the
limiter never engaged) or 0/200 succeeding (a spent window refusing
everything) — is flagged as `no-overflow-signal` rather than printed `[ok]`.

**One thing found while building this that the reviewer's design did not
anticipate, and is disclosed rather than routed around.** A genuinely fresh
120/min-ceiling server admitting 200 truly concurrent requests, each with a
distinct fabricated session id, also trips `MAX_SESSIONS=100`
(`server/lib/session-store.ts`) once enough sessions are simultaneously
busy — a SECOND, orthogonal way this server sheds an overflow it cannot
serve, answered with a deliberate, caught 503
(`SessionCapacityError`/doctor-pool admission control — both have their own
test coverage under `tests/core/doctor-analysis-budget.test.ts`), never an
uncaught exception. The fuzzer's crash detector now excludes 503
specifically (`status === null || (status >= 500 && status !== 503)`) so
this legitimate capacity signal is reported, not flagged as a crash. A
second, related fix: the aggregate wall-clock for draining up to ~90 real
doctor analyses through a bounded worker pool is no longer compared against
the single-request `SLOW_THRESHOLD_MS` (5s) — that threshold exists to catch
ONE request hanging, and this case now does real work for the first time
(previously ~0, since the window was always already spent), so its total
time necessarily grew; the genuine "stayed responsive under load" signal
remains the separate `/health` p95 check, unchanged and still applied
correctly.

**Measured, three consecutive foreground runs, same machine, no edits
between them:**

| metric | before (`55660c9f`) | after |
|---|---|---|
| `status=429` lines | **18** | **0** (confined to one aggregate note) |
| `ws-oversized-frame` / `ws-10000-message-burst` | **SKIPPED** | both run, `[ok]` |
| 200-concurrent breakdown | `{"429":200}` — **0 succeeded** | `{"200":90,"429":81,"503":29}` — stable across all 3 runs |
| total requests / `[ok]` lines | 195 / 193 | **197 / 197** |
| flagged findings | 2 | **0** |
| exit | **1 — FAIL** | **0 — PASS** |

`node scripts/fuzz-routes.mjs` run a fourth time as the gate evidence for
this round (below): same shape, exit 0.

### Item 2 — the abort-count guard's semicolon escape, closed

`abortCallSites`' pattern required a trailing `;` immediately after
`abort()`, so `useEffect(() => () => abortRef.current?.abort(), []);` — an
arrow-expression-body cleanup whose only `;` lands after `useEffect(...)`'s
closing paren, not after the call itself — survived at 21/0. Fixed by
stripping block and line comments first (`stripComments`, shared by the
primary guard and the self-check block rather than duplicated) and dropping
the `;` requirement from the regex.

**Fail-first, reproduced against `55660c9f` with route (C) planted into a
fresh `git archive` export of that tip's `CoverageSummary.tsx`:**

| | old test (pre-round-2) | new test (this round) |
|---|---|---|
| route (C) planted | **21 pass / 0 fail — missed** | **17 pass / 5 fail — caught** |
| untouched tree | 21 pass / 0 fail | **22 pass / 0 fail** |

Added route (C) as a third self-check entry alongside (A) and (B) (same
plant-and-restore discipline), so a future edit to the counting rule has to
keep catching all three; renamed the describe block from "both … routes" to
"every known reintroduction route."

### Gates, this round (final tip `da4a6539`)

| gate | command | result |
|---|---|---|
| lint | `npx tsc --noEmit` | **0** |
| no-console | `node scripts/check-no-console.mjs` | **0** — 305 files, 24 quarantine entries, all unreachable |
| check-docs | `node --experimental-strip-types scripts/check-docs-quality.ts --all` | **0** — no AI-writing patterns |
| honesty-audit | `node scripts/honesty-audit.mjs` | **0** — 461 files + 473 tracked markdown + 106 claims rows, clean |
| check-brain | `node scripts/brain-graph.mjs --check` | **0** — 105 notes, 386 links, fresh |
| scoring receipt | `node scripts/check-scoring-receipt.mjs 6dbabc9c..HEAD` | **0** — "no scoring-path files changed" |
| output identity | `check-doctor-output-identity.mjs --compare` vs `git archive 6dbabc9c`, `GIT_SHA` pinned equal | **PASS — 45/45 byte-identical** |
| touched: rate-limit-verification-override | run individually | **14/14** |
| touched: keyless-browser-certification | run individually | **2/2** |
| touched: coverage-format-unrecognized-card | run individually | **22/22** |
| fuzzer (foreground, required this round) | `node scripts/fuzz-routes.mjs` (full mode) | **PASS, exit 0, 0 flagged**, `{"200":90,"429":81,"503":29}` |

No `npm test` this round, per instruction — the orchestrator runs the merge
gates.

All commands above were run in the foreground on this session's own shell,
polling completion directly rather than through a monitor or a detached
background task, per this round's explicit instruction.

## Tip and origin (Round 2)

`origin/lane/writer-followups` == `da4a6539a1ef0a0e997793dfa1e5da3b866f5ede`
— confirmed via `git ls-remote` against the local `git rev-parse HEAD`, both
equal, run after every commit this round.

## Round 3

**Reviewed object:** `da4a6539` (round-2 tip). **Round-3 tip:** `5a95623c`,
two commits on top, pushed after each (the first was corrected once — see the
note at the end of this section). Source:
`docs/audits/2026-09-12-adversarial/writer-review.md` "## Round 4
(follow-ups lane) — re-check of `da4a6539`", verdict REVISE: one blocking
item (the 503 misattribution) plus one non-blocking item the orchestrator
directed be built this round (the runtime assertion strengthening).

```
8b9e5451 docs(fuzz-routes): attribute the concurrency case's 503s to the doctor budget
5a95623c fix(fuzz-routes): require a 429 before the overflow case passes
```

### Item 1 (blocking) — the 503 is misattributed, corrected at all three sites

**What was wrong.** Three places said the concurrency case's 503s could be
`SessionCapacityError` (`MAX_SESSIONS`, `server/lib/session-store.ts`) as well
as, or instead of, the doctor analysis pool's own queue budget:
`scripts/fuzz-routes.mjs:548-558` (the comment justifying the crash-detector's
`!== 503` exclusion), `:588` (the printed note, labelling every 503 "refused
on session capacity"), and this report's own Round-2 Item-1 paragraph ("also
trips `MAX_SESSIONS=100` … a SECOND, orthogonal way this server sheds an
overflow it cannot serve"). The round-4 review captured all 30 503 bodies on
its own boot of the same production-ceiling server and found zero
`SessionCapacityError` — all 30 were `DoctorAnalysisBudgetExceededError`
(`state: 'queued'`) — and showed `MAX_SESSIONS` cannot fire in this case
because `gameLimiter` admits only ~90 of the 200 requests, well under the cap
of 100.

**Reproduced independently this round**, before touching any file
(`<session scratch>/probe503.mjs`: `keylessBrowserServerEnv(process.env,
port, { productionRateLimit: true })`, `SESSION_DB_DIR=':memory:'`, the
worktree's own `server.ts`, 200 concurrent `POST /api/scriptide/doctor` with
distinct `X-Session-Id` headers, response bodies parsed and classified by
error shape):

```
breakdown {"200":90,"429":80,"503":30}
503 body class tally: { "DoctorAnalysisBudgetExceededError (queued)": 30 }
sample 503 body: {"error":"This server is busy: your draft waited longer
  than the 60s it allows for a free analysis slot, so the run never started
  and nothing was scored. Nothing is wrong with the draft — try again in
  about 92 seconds."}
```

30 of 30, zero `SessionCapacityError`, matching the reviewer's own numbers
exactly.

**The fix.** All three sites corrected in place to name
`DoctorAnalysisBudgetExceededError` / `server/lib/doctor-budget.ts` (the
doctor analysis pool's own queue budget, pool admission control) as the
source, and to explain plainly why `SessionCapacityError`/`MAX_SESSIONS`
cannot fire in this specific case (`gameLimiter` spends the window at ~90
requests, well under the 100-session cap). The crash-detector's exclusion
itself — `o.status === null || (o.status >= 500 && o.status !== 503)` — is
untouched: still exactly as narrow as it was, excluding 503 alone and no
other status. The third site (this report's Round-2 paragraph) is left as
originally written above, per this repository's established correction
convention (see Round 1's own "CORRECTED in round 2" annotation on Item 1) —
the wrong attribution there is superseded by this section, not rewritten
in place.

### Item 2 (non-blocking, built) — the runtime assertion now requires a 429

**What was wrong.** `concurrencyAttack`'s own assertion accepted either
`limited > 0` (a 429 appeared) OR `capacityRefused > 0` (a 503 appeared) as
proof the overflow was shed, so a fully-disengaged `gameLimiter` — 0 429s —
still passed as long as the doctor budget's 503s showed up instead. This
does not prove what the case's own header claims it proves ("to 429 the
overflow").

**The fix.** The condition is now `succeeded > 0 && limited > 0` — a 429
must actually appear, in addition to legitimate traffic getting through.
`capacityRefused` (the doctor budget's 503 count) is still reported in the
printed note as extra information, never as a substitute for `limited > 0`.

**Fail-first, on a scratch mutation of this same worktree** (the dedicated
overflow server's `{ productionRateLimit: true }` opt-out removed —
`bootServer(overflowPort, { productionRateLimit: true })` →
`bootServer(overflowPort)` — applied with `sed`, the fuzzer run, then
reverted with `git checkout --` before the next run; `git status --short`
confirmed clean before and after):

| run | breakdown | record | exit |
|---|---|---|---|
| mutated (opt-out removed) | `{"200":90,"503":110}` — **0 429s** | `[UNEXPECTED-STATUS] 200-concurrent-doctor-requests status=no-overflow-signal` | **1 — FAIL** |
| restored | `{"200":90,"429":81,"503":29}` | `[ok] 200-concurrent-doctor-requests status=overflow-shed` | **0 — PASS** |

Both runs' full breakdowns and status lines are captured in
`<session scratch>/fuzz-failfirst.log` and `<session scratch>/fuzz-restored.log`.
The mutated run reproduces the exact numbers the round-4 review predicted
(`{"200":90,"503":110}`, 0 429s, `[ok]` under the OLD condition) — under the
NEW condition it now correctly flags and exits 1 instead.

### A note on how this round's two commits were produced

The first attempt at Item 1 accidentally included Item 2's code change in
the same commit (both edits were made to the same file before the first
commit was cut). This was caught before reporting: the combined commit
(`bead83cc`, already pushed) was split via `git reset --soft da4a6539` (no
working-tree or index change — nothing lost) followed by two commits, each
containing exactly one item's diff (verified by diffing the intermediate
and final file states against the originally-intended per-item edits before
committing), then `git push --force-with-lease` to replace the single pushed
commit with the two-commit history described above. No other session had
based work on `bead83cc` at the time (it was pushed and corrected within the
same round, before the report was written or reviewed). The final tree is
byte-identical to what the single combined commit produced — this changed
the history's shape, not the code.

### Gates, this round (final tip `5a95623c`)

| gate | command | result |
|---|---|---|
| lint | `npx tsc --noEmit` | **0** |
| no-console | `node scripts/check-no-console.mjs` | **0** — 305 files, 24 quarantine entries, all unreachable |
| honesty-audit | `node scripts/honesty-audit.mjs` | **0** — 461 files + 473 tracked markdown + 106 claims rows, clean |
| touched: rate-limit-verification-override | `node --experimental-strip-types tests/core/rate-limit-verification-override.test.ts` | **14/14 pass, 0 fail** |
| fuzzer, run 1 (foreground) | `node scripts/fuzz-routes.mjs` (full mode) | **PASS, exit 0, 0 flagged**, `{"200":90,"429":81,"503":29}` |
| fuzzer, run 2 (foreground) | `node scripts/fuzz-routes.mjs` (full mode) | **PASS, exit 0, 0 flagged**, `{"200":90,"429":81,"503":29}` |

No `npm test` this round, per instruction — the orchestrator runs the merge
gates. `ps -eo args | grep -c '[n]ode --test'` was checked and read `0`
immediately before every gate and every fuzzer run this round, so no wait
was needed.

## Tip and origin (Round 3)

`origin/lane/writer-followups` == `5a95623c910dda40c14178822a5147f43ae53d86`
— confirmed via `git ls-remote origin lane/writer-followups` against the
local `git rev-parse HEAD` in `/home/user/wt-followups`, both equal, run
after the force-push that corrected the commit split and again after the
final gate run.
