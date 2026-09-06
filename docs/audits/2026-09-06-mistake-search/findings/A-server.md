# A — server-side mistake hunt, `git log 1e170831..802f1c16`

Worktree: `/home/user/STORYMACHINE/.claude/worktrees/agent-ab79d3d2adf5533fb`
(read-only; `node_modules` is a scratch directory of symlinks into the main
checkout's `node_modules`, gitignored, `git status` clean).
Range: 22 commits, six lanes. Reviews: `docs/audits/2026-09-05-review-batch/`.

Every claim below was reproduced in this worktree with the command shown.

---

## Area 1 — `server/lib/validation.ts`, the Fountain shape guard

### What I tried

Read the whole guard block (`server/lib/validation.ts:206-616`) and both
downstream cue predicates it claims parity with
(`src/lib/fountain.ts:73-90` `CHARACTER_CUE_RE`,
`server/nvm/analyze/screenplay-normalizer.ts:56-79` `isCharacterCue`), then
attacked it with:

* line-ending variants the guard's `text.split('\n')` does not model — CRLF,
  CR-only, U+2028, U+2029;
* the normalizer's reflow rules the guard's forward-scan context check models
  only partially (blank-gap width, what counts as "dialogue" after the gap);
* shapes that are cue-shaped to one predicate and not the other
  (`isCueLikeLine` vs `isCharacterCue` vs `CHARACTER_CUE_RE`);
* cost shapes that are not cue-shaped at all (scene headings, transitions,
  parentheticals, `@forced` cues, `~lyrics`, `[[notes]]`, `/* boneyard */`,
  centered `>text<`, `===` page breaks, title-page keys, BOM, ZWJ);
* the `express.json({ limit: '1mb' })` cap in `server/app.ts:75` as the real
  ceiling on a single request.

---

### A1 — BLOCKER: the guard's own R4 exclusion clause is a complete bypass. A 458,716-char request the guard ACCEPTS costs 115.7 s of single-threaded CPU in `runScriptDoctor`.

**Severity: BLOCKER** (unauthenticated CPU-exhaustion DoS; this is the exact
class of attack the five guard commits `c830e25c`, `6d296863`, `a9f0afd6`,
`8fbe0056`, `5d2b2638` were written to close, and it survives all five).

**Where:** `server/lib/validation.ts:548-553` — the blank-gap branch of the
forward-scan context check:

```ts
let j = i + 1;
while (j < lines.length && lines[j]!.trim() === '') j++;
nextLineIsDialogue = j < lines.length && !isCueLikeLine(lines[j]!.trim());
```

**The mistake.** The guard reasons (comment at `validation.ts:515-521`) that a
double-spaced cue's dialogue "is ordinary mixed-case prose (never matches
`isCueLikeLine`)", so requiring the post-blank-gap line to *not* be cue-shaped
is safe. That premise is false. The two predicates disagree in exactly the
direction that matters:

* `isCueLikeLine` (`validation.ts:468`) has **no length cap and no word cap** —
  it matches any all-caps line of arbitrary length.
* `screenplay-normalizer.ts`'s `isCharacterCue` (the predicate that actually
  decides what `normalizeScreenplay` reflows) rejects anything over **4 words**
  (`screenplay-normalizer.ts:73`) or **30 chars** (`:74`).

So an ALL-CAPS "dialogue" line of 5+ words is *cue-shaped to the guard* (→ the
cue above it is skipped, never counted against any of the three bounds) and
*plain dialogue text to the normalizer* (→ reflowed into a real adjacent
`CUE\ndialogue` pair, parsed as a real `character` block, charged the full
O(n²) analyzer cost). Every cue in the payload is invisible to all three
bounds — `MAX_FOUNTAIN_DISTINCT_CUE_LINES`, `MAX_FOUNTAIN_CUE_WEIGHT`, and the
new `MAX_FOUNTAIN_FREQUENT_CUE_LINES` — because the loop `continue`s at
`validation.ts:554` before any of them is reached.

**Reproduce (A/B control — same pipeline effect, opposite guard verdicts):**

```
node --experimental-strip-types \
  <session scratch>/probe-clause2.ts
```

```
CAPS dialogue        (distinct=200 occ=6000 chars=458716): guard=ACCEPT pipelineCharacterBlocks=6000
mixed-case dialogue  (distinct=200 occ=6000 chars=272716): guard=REJECT pipelineCharacterBlocks=6000
```

Both payloads produce **6,000 real `character` blocks** after
`normalizeScreenplay` + `parseFountain`. The guard rejects the one whose
dialogue is lowercase and accepts the one whose dialogue is uppercase. The
only difference between them is the case of the dialogue text.

**Cost, measured end to end against `runScriptDoctor` (in-process, no HTTP,
no worker pool):**

```
node --experimental-strip-types \
  <session scratch>/probe-bypass.ts 200 6000
```

```
distinct=200 occurrences=6000 chars=458716
guard=ACCEPT
after normalize: characterBlocks=6000 dialogueBlocks=6000
runScriptDoctor ms=115694 health=0 scenes=1
real 1m56.761s
```

458,716 chars is ~51 % of `MAX_FOUNTAIN_CHARS` and ~46 % of `express.json`'s
1 MB body cap (`server/app.ts:75`), so this is a comfortably legal single
request on every route that takes `fountainField()` — `POST
/api/scriptide/doctor` among them. The payload generator is 20 lines
(`probe-bypass.ts`), needs no key, and the shape is stable: every measured
"dangerous band" row in the guard's own grid comment
(`validation.ts:313-340`) can be re-expressed in this form and re-admitted.

**Why the existing tests do not catch it.**
`tests/security/fountain-shape-guard-cue-parity.test.ts` proves
`CHARACTER_CUE_RE.test(line) ⇒ isCueLikeLine(line)` — a superset property in
the *cue-detection* direction. The bypass lives in the *opposite* direction:
`isCueLikeLine` being a strict superset is exactly what makes the exclusion
clause over-fire and skip real cues. The comment at `validation.ts:460-467`
even names `screenplay-normalizer.ts`'s `isCharacterCue` as a known-different
predicate and dismisses it as "not a cost vector", but only ever tested the
`NAME (cont'd)` lowercase-tail shape, never the >4-word / >30-char rejection
that this bypass turns into a cue-invisibility oracle.

**BUILD/WIRE fix (not removal).** The exclusion clause must ask the question
the pipeline actually asks. Two parts, both additive:

1. In `validation.ts`, import `isCharacterCue` from
   `server/nvm/analyze/screenplay-normalizer.ts` (already exported at
   `:56`; the normalizer is not on `doctor.ts`'s import graph *for
   validation.ts's purposes* — verify with `node
   scripts/check-scoring-receipt.mjs`, and if it is, lift `isCharacterCue`
   into a shared leaf module the way `CUE_INITIAL_CLASS`/`CUE_LETTER_CLASS`
   were lifted into `src/lib/fountain.ts`). Then make the blank-gap clause
   exclude only what the *normalizer* would treat as another cue:
   `nextLineIsDialogue = j < lines.length && !isCharacterCue(lines[j]!)`.
   That keeps the R4 caps-emphasis fixture excluded (a 1–4-word ALL-CAPS
   emphasis line *is* an `isCharacterCue`) while counting the 5+-word
   ALL-CAPS "dialogue" shape as what the pipeline makes of it.
2. Add the A/B control above as a test in
   `tests/security/fountain-shape-guard-cue-parity.test.ts`: assert that for
   the *same* cue vocabulary and occurrence count, the guard's verdict does
   not depend on the case of the dialogue line — i.e. that the CAPS variant
   is rejected too. State it as the general invariant, since that is the
   property that was silently assumed: **if `normalizeScreenplay` +
   `parseFountain` produce N `character` blocks, the guard must count at
   least N cue occurrences.** That invariant is directly checkable and would
   have failed on the unfixed input (guard counts 0, pipeline produces
   6,000).

---

### A2 — CLEAN: line-ending variants (CR-only, U+2028, U+2029, CRLF)

**What I tried.** The guard splits on `'\n'` only (`validation.ts:480`) while
`normalizeScreenplay` normalizes `\r\n?` → `\n` first
(`screenplay-normalizer.ts:139`) — an obvious-looking asymmetry. Built the
same distinct=600 / occurrences=12,000 payload with five different line
terminators and compared guard verdict against the number of `character`
blocks the real pipeline produces:

```
node --experimental-strip-types \
  <session scratch>/probe-guard.ts
```

```
LF:      chars=537816 guard=REJECT normalizedCharacterBlocks=12000
CR-only: chars=537816 guard=ACCEPT normalizedCharacterBlocks=0
U+2028:  chars=537816 guard=ACCEPT normalizedCharacterBlocks=0
U+2029:  chars=537816 guard=ACCEPT normalizedCharacterBlocks=0
CRLF:    chars=573817 guard=REJECT normalizedCharacterBlocks=12000
```

**Not a bug.** CRLF is handled (the guard `.trim()`s each line, so the trailing
`\r` never reaches `isCueLikeLine`). CR-only and U+2028/9 are accepted by the
guard, but they are equally invisible to the whole downstream pipeline:
`normalizeScreenplay` returns `raw` verbatim for them (`isDoubleSpaced` sees
one line → false → early return at `:140`), and `parseFountain` also splits on
`'\n'` only (`src/lib/fountain.ts:94`). The guard's acceptance is therefore
*correct* — those payloads are one enormous line to everyone, cost nothing,
and score as one action block. Verified with a minimal case
(`probe-cr.ts`): CR-only input round-trips byte-identical through
`normalizeScreenplay` and yields 0 character blocks.

The residual note, not a finding: this is a *correctness* asymmetry rather
than a security one — a writer who pastes CR-only text (classic Mac / some
OCR pipelines) gets a silently unparsed script. Out of this range's scope.

---

### A3 — MEDIUM: the shape guard is blind to `/* boneyard */`, so it over-rejects; and a 244,912-char boneyard costs 27.5 s in `runScriptDoctor`

**What I tried.** Timed six non-cue-shaped cost shapes (scene headings,
parentheticals, transitions, boneyard-wrapped cues, `@forced` cues, `~lyrics`)
at ~230-430 KB each against `runScriptDoctor`:

```
node --experimental-strip-types \
  <session scratch>/probe-noncue.ts
```

```
sceneHeadings:        chars=430889 guard=ACCEPT doctorMs=1092
parentheticals:       chars=244906 guard=ACCEPT doctorMs=414
transitions:          chars=336016 guard=ACCEPT doctorMs=802
boneyardSpanningCues: chars=244912 guard=REJECT doctorMs=27518
forcedCues:           chars=242716 guard=ACCEPT doctorMs=687
lyrics:               chars=226906 guard=ACCEPT doctorMs=422
```

None of the non-cue shapes is a cost vector — the guard is right not to model
them. Two notes on the boneyard row:

* The guard counts cue-shaped lines **inside** `/* … */`, which
  `parseFountain` types as `boneyard` and never treats as cues
  (`src/lib/fountain.ts:110-118`). That is the *conservative* direction
  (over-count → reject), so it is not a security hole — but it means a
  legitimate script that comments out a large cast list can be rejected with
  a message about "character-cue-shaped lines" that names lines the analyzer
  ignores. Low severity, real user-facing wrongness.
* The 27.5 s is measured on a payload the guard rejects, so it is not
  reachable over HTTP today. It does show the analyzer still pays full cost
  on boneyard content — i.e. the cost model behind these bounds is about
  line *shape*, not about what the parser actually keeps.

**BUILD/WIRE fix:** track boneyard state in `fountainShapeRejectionReason`'s
single pass the same way `parseFountain` does (an `inBoneyard` flag toggled on
`/*` and `*/`) and skip counting inside it, keeping the guard's line-shape
predicate otherwise unchanged. Add the "commented-out cast list" case to
`tests/security/fountain-shape-guard-cue-parity.test.ts`'s
"legitimate script is NOT rejected" family.

### A4 — CLEAN: every fdx/pdf-converted call site does apply the guard, and `candidateFountain` is guarded

**What I tried.** Enumerated every conversion call site and every guard call
site:

```
grep -rn "fdxToFountain\|pdfToFountain" server/ --include=*.ts | grep -v '\.test\.'
grep -rn "rejectPathologicalConvertedFountain\|fountainShapeRejectionReason" server/routes
```

Seven conversion sites — `server/routes/scriptide.ts:488` (`/doctor`), `:666`
(`/doctor/stream`), `:800`, `:951` (`/doctor/pdf`);
`server/routes/coverage-letter.ts:69`; `server/routes/export.ts:336`, `:430` —
and all seven are followed by a guard call
(`scriptide.ts:506`, `:681` — the SSE-shaped direct
`fountainShapeRejectionReason` call, `:815`, `:964`;
`coverage-letter.ts:80`; `export.ts:347`, `:442`).
`candidateFountain` is `fountainField()` at `server/lib/validation.ts:1290`,
so it takes the same superRefine as `fountain`. No unguarded path found.
(Every one of them inherits A1's bypass, of course — the guard they all call
is the one that is wrong.)

### A5 — the worst legal request, measured

`express.json({ limit: '1mb' })` (`server/app.ts:75`) is the real ceiling, not
`MAX_FOUNTAIN_CHARS` (900,000). The A1 payload at distinct=200 /
occurrences=6,000 is **458,716 fountain chars / 482,732 JSON bytes** — 46 % of
the body cap — and was driven through the REAL route on a real server:

```
bash <session scratch>/probe-inflight.sh
```

```
fountainChars=458716 jsonBytes=482732
server ready (pid 12190), /ready=200
t=+6004ms  still in flight? curl alive: yes
  response so far:            <- no 400, no rejection; the doctor is running
```

`POST /api/scriptide/doctor` accepted it (no 400) and was still computing when
the test killed the server at +16 s; the same payload measured **115,694 ms**
end to end in-process. **Worst legal request reproduced: ~116 s of CPU for one
482 KB anonymous POST**, and the body cap leaves room for roughly 2x that
payload. There is no per-request analysis timeout on this path
(`runScriptDoctorOffThread` "has no per-job timeout of its own" —
`doctor-pool.ts`'s own comment), and the pool is 2 workers on this box
(`doctor_pool_prewarmed … workers:2`), so two such requests saturate it.

---

## Area 2 — `/ready`, `/health.doctorPool`, shutdown

### What I tried

Booted the real `server.ts` (not a test harness) five times with different
env, and drove: cold-boot `/ready` polling; `DOCTOR_POOL_PREWARM_TIMEOUT_MS`;
SIGTERM during warm-up; the drain window against a fresh-connection prober;
double SIGTERM inside the drain window; `DOCTOR_POOL_PREWARM_BEFORE_LISTEN=1`;
SIGTERM with a real doctor job in flight; and the `uncaughtException` path
with and without a drain window. All servers were killed
(`kill -9` / `wait`); no stray processes remain.

```
bash <session scratch>/probe-ready.sh      # cold boot
bash <session scratch>/probe-ready2.sh     # 2a-2e below
bash <session scratch>/probe-crash.sh      # uncaughtException
bash <session scratch>/probe-inflight.sh   # in-flight doctor job vs hard-kill
```

### B1 — HIGH: `SHUTDOWN_DRAIN_MS` applies to the `uncaughtException` path, so a crashed process keeps accepting and serving brand-new requests for the whole drain window (35 s under this repo's own docker-compose default)

**Severity: HIGH** (a regression introduced by this range; it reopens the
exact hazard `createShutdownHandler`'s own doc comment names).

**Where:** `server.ts:170-181` (`installCrashHandlers` passes the *same*
`shutdown` closure) and `server.ts` `createShutdownHandler`'s tail:

```ts
if (drainMs > 0) { scheduleClose(beginClose, drainMs); } else { beginClose(); }
```

`drainMs` is read once per process from `SHUTDOWN_DRAIN_MS` and is not
conditioned on `signal`/`exitCode`. `installCrashHandlers(shutdown)`
(`server.ts:337`) hands that closure the `'uncaughtException', 1` call, so the
crash path takes the drain window too.

The function's own comment says a crash-driven shutdown exists "because
continuing after an uncaught exception runs on undefined state." The drain
window makes the process do exactly that — and unlike SIGTERM, nothing
external asked it to.

**Reproduce** (`probe-crash.sh` wires `createShutdownHandler` +
`installCrashHandlers` around a real listening server, exactly as
`server.ts:334-337` does, then throws):

```
bash <session scratch>/probe-crash.sh
```

```
=== uncaughtException, default drain (SHUTDOWN_DRAIN_MS=0) ===
  +3ms   after-crash: proc=alive resp={"served":true,"draining":false,...}
  +418ms after-crash: proc=DEAD  resp=CONNFAIL

=== uncaughtException, drain window set (SHUTDOWN_DRAIN_MS=8000) ===
  +3ms    after-crash: proc=alive resp={"served":true,"draining":false,...}
  +418ms  after-crash: proc=alive resp={"served":true,"draining":true,...}
  ... 19 more fresh connections, all served 200 ...
  +7835ms after-crash: proc=alive resp={"served":true,"draining":true,...}
  +8248ms after-crash: proc=DEAD  resp=CONNFAIL
```

Every one of those lines is a **brand-new TCP connection**, accepted and
answered by a process that has already logged `uncaught_exception`. This
repo's shipped `docker-compose.yml:97` sets `SHUTDOWN_DRAIN_MS: 35000`, so
the real-world window is 35 seconds of a crashed process serving live traffic
— and `/health` (`server/routes/config.ts`) still answers
`{"status":"ok"}` throughout, because only `/ready` knows about draining.

**BUILD/WIRE fix.** The drain window is a *graceful-shutdown* affordance;
gate it on that. In `createShutdownHandler`'s returned closure:

```ts
return (signal: string, exitCode = 0) => {
  setDraining();
  // A crash-driven shutdown never drains: the whole reason this path exists
  // is that the process is running on undefined state, so keeping the
  // listener open for drainMs is the opposite of correct.
  const effectiveDrainMs = exitCode === 0 ? drainMs : 0;
  logger.info('server_shutdown', { signal, exitCode, drainMs: effectiveDrainMs });
  ...
};
```

and add the assertion to `tests/routes/hardening.test.ts`, which already
imports `createShutdownHandler`/`installCrashHandlers`: with
`drainMs: 5_000` and an injected `scheduleClose` spy, a `('SIGTERM', 0)` call
must schedule, and a `('uncaughtException', 1)` call must close immediately
(spy not called). That test would have failed on the current code.

### B2 — LOW: a timed-out pre-warm freezes `/health.doctorPool` at a wrong snapshot forever

**Where:** `server/nvm/analyze/doctor-pool.ts`, the `outcome === 'timeout'`
branch: `warmState = { …, slotsWarmed: 0, failed: 0, …, timedOut: true }` and
then `return`. The abandoned `jobsSettled` promise keeps running and **never
writes back** to `warmState`, so once the deadline fires the process reports
`slotsWarmed: 0` for the rest of its life even after every worker warms
successfully a moment later.

Also visible in the same run: the deadline overran its own budget by 5.6x
because the main thread was busy spawning workers.

**Reproduce:**

```
bash <session scratch>/probe-ready2.sh     # section 2a
```

```
/health: {"status":"ok",...,"doctorPool":{"warm":true,"warmedAt":"...","ms":834,"timedOut":true}}
doctor_pool_prewarm_timed_out  requested:2  deadlineMs:150  ms:834
```

`deadlineMs: 150`, `ms: 834`. `/ready` correctly answered `{"ready":true}` —
the wedged-worker fix itself works.

**BUILD/WIRE fix:** keep a reference to `jobsSettled` and attach a
`.then()` that updates `warmState` with the final `slotsWarmed`/`failed`
tally when `warmState.timedOut` is still true — i.e. report `timedOut: true`
alongside the real settle numbers and a new `settledAfterTimeoutMs`, rather
than freezing zeros. Log a matching `doctor_pool_prewarm_settled_late`.
Nothing about `/ready`'s gate changes.

### B3 — LOW: double SIGTERM is a no-op (it schedules a *second* drain + a second 10 s hard-kill instead of forcing)

**Reproduce:** `probe-ready2.sh` section 2d — `SHUTDOWN_DRAIN_MS=6000`, second
SIGTERM at +1,004 ms:

```
  +1007ms alive=y /ready={"ready":false,"reason":"draining"}
  ... unchanged ...
  +6139ms alive=y /ready=CONNFAIL
  +8184ms alive=n
  server_shutdown log lines: 2
```

Total shutdown time is identical to the single-signal case; the second signal
only adds a log line, a second `setTimeout(beginClose, 6000)` and a second
10 s hard-kill timer. The near-universal operator convention (second signal =
stop draining, close now) is unimplemented, and an impatient operator's
`Ctrl-C Ctrl-C` does nothing.

**BUILD/WIRE fix:** a `let shuttingDown = false` in
`createShutdownHandler`'s closure scope; on a second call, skip the drain and
call `beginClose()` immediately (and do not re-register the hard-kill timer).
Log it as `server_shutdown_forced`.

### B4 — CLEAN: `/ready` limiter exemption, drain window, prewarm-before-listen, SIGTERM during warm-up, in-flight hard-kill

**What I tried and what happened, each reproduced:**

* **Cold boot** (`probe-ready.sh`): `/ready` answered
  `503 {"ready":false,"reason":"doctor_pool_warming"}` from +750 ms to
  +1,500 ms, then `200 {"ready":true}`; `/health.doctorPool` reported
  `{"warm":true,"warmedAt":"…","ms":1939,"timedOut":false}`. The gate does
  what it claims.
* **`/ready` under the limiter exemption** — I looked for something to bypass
  and found nothing to bypass: the handler
  (`server/routes/config.ts`) is two boolean reads and a JSON literal, takes
  no input, touches no session, and creates nothing.
  `server/app.ts:130-232` registers no global limiter ahead of the routers,
  so the exemption is genuinely just "no limiter on this one route", and
  `tests/routes/route-capabilities.test.ts:138` carries its written
  justification. The only thing it exposes that `/health` did not already is
  pool warm timing.
* **SIGTERM during warm-up** (2b): first observed `/ready` was
  `{"ready":false,"reason":"doctor_pool_warming"}`; SIGTERM then exited the
  process cleanly (the ref'd 30 s pre-warm deadline timer does not hold it
  open, because `server.close()`'s callback calls `process.exit` explicitly).
* **Drain window with a fresh-connection prober** (2c, `SHUTDOWN_DRAIN_MS=4000`):
  a new `curl` connection per poll saw
  `503 {"ready":false,"reason":"draining"}` at +3, +515, … +3,594 ms, then
  ECONNREFUSED from +4,106 ms. The documented behaviour is exactly what
  happens.
* **`DOCTOR_POOL_PREWARM_BEFORE_LISTEN=1`** (2e): the port did not answer at
  all until +2,436 ms, and its first answer was already `{"ready":true}`.
  No double-warm (`doctor_pool_prewarmed … requested:2 … ms:1844` appears once).
* **10 s hard-kill counting from the delayed close, with a doctor job in
  flight** (`probe-inflight.sh`): with the A1 payload mid-analysis, SIGTERM →
  the process stayed alive to +10,213 ms and then exited **1** (the
  `exitCode === 0 ? 1 : exitCode` branch), and the in-flight request got
  **no response at all** — `HTTP=000 total=16.05s`, connection cut. That is
  the documented contract, but note the interaction with A1: an anonymous
  caller can guarantee an in-flight job that will still be running at
  hard-kill, so every deploy under attack ends in a hard exit with cut client
  connections rather than a clean drain.

### B5 — LOW (ops wiring): `stop_grace_period` is a hardcoded literal while `SHUTDOWN_DRAIN_MS` next to it is env-overridable

`docker-compose.yml:49` is `stop_grace_period: 50s` (a literal), and
`:97` is `SHUTDOWN_DRAIN_MS: ${SHUTDOWN_DRAIN_MS:-35000}` (overridable). The
comment above both says "RAISE BOTH TOGETHER … or Compose's own deadline
silently reintroduces the same defect" — but only one of the two can be
raised from the environment. `SHUTDOWN_DRAIN_MS=120000 docker compose up`
silently reintroduces exactly the defect the comment describes: SIGKILL at
50 s, 70 s before `server.close()` runs, no WAL flush, exit 137.

**BUILD/WIRE fix:** parameterise it in the same shape —
`stop_grace_period: ${STOP_GRACE_PERIOD:-50s}` — and make
`shutdownDrainMs()` emit a `shutdown_drain_ms_configured` warn line at boot
when the value exceeds a documented safe ceiling, so the mismatch is visible
in the container's own logs rather than only in a YAML comment.

---

## Area 3 — `server/lib/request-logger.ts` (`req.baseUrl + req.path`)

### What I tried

Booted the real app in `NODE_ENV=production` with `serveStatic:true` against a
synthetic `dist/` (so `app.use('/assets', express.static(...))`, the
`/assets` 404 guard, the root `express.static`, and the SPA catch-all are all
live), captured every `request` log line, and drove sixteen shapes with raw
sockets: mounted prefixes, bare mount roots, static hits and misses, HEAD,
OPTIONS, an encoded slash, a percent-encoded traversal, an **absolute-form
request line**, and a capability-bearing query string.

```
node --experimental-strip-types <session scratch>/probe-logger.ts
```

### C1 — CLEAN: the fix holds on every shape I could construct

```
GET /api/nope (unknown api 404)                => GET /api/nope -> 404
GET /assets/app-abc123.js (static hit)         => GET /assets/app-abc123.js -> 200
GET /assets/missing.js (static 404 guard)      => GET /assets/missing.js -> 404
GET /favicon.svg (root static hit)             => GET /favicon.svg -> 200
HEAD /health                                   => HEAD /health -> 200
OPTIONS /api/nope                              => OPTIONS /api/nope -> 404
GET /api/foo%2Fbar (encoded slash)             => GET /api/foo%2Fbar -> 404
GET /assets/..%2f..%2f.env                     => GET /assets/..%2f..%2f.env -> 404
GET /some/spa/route (catch-all)                => GET /some/spa/route -> 200
absolute-form GET http://evil/api/nope         => GET /api/nope -> 404
absolute-form GET http://evil/assets/miss.js   => GET /assets/miss.js -> 404
GET /health?sessionId=SECRET                   => GET /health -> 200
```

Both regressions the two reviews chased are genuinely closed: the mount prefix
is present on `/api` and `/assets` (including the static-miss 404 guard, the
case the audit named), the attacker-chosen host in an absolute-form request
line does **not** reach the log, and `?sessionId=SECRET` does not either.
Encoded slashes and percent-encoded traversals are logged verbatim
(un-decoded), which is the right call. No router in `server/app.ts` mounts on
a regex or a param prefix, so the `baseUrl` reconstruction has no
harder case to fail on today.

### C2 — LOW: a bare mount root logs a trailing slash the client never sent

```
GET /api    (bare mount root) => GET /api/ -> 404
GET /assets (bare mount root) => GET /assets/ -> 301
```

`req.baseUrl` is `/api` and `req.path` is `/`, so the concatenation invents a
character. Harmless for grepping, but it means the logged path is not
byte-identical to the request target for these two, which is the one property
the field is now supposed to have. **Fix:** in `requestLogger()`, `const p =
req.baseUrl + req.path; path: req.path === '/' && req.baseUrl ? req.baseUrl : p`
— or document the exception next to the derivation, which currently claims the
expression "reconstructs the real, full, prefix-included path Express itself
parsed".

### C3 — NOT IN RANGE, but found while driving C1: `/%zz` answers 500, and the error handler logs it as `unhandled_error`

```
node --experimental-strip-types <session scratch>/probe-errpath.ts
GET /assets/%zz    -> 404   (the /assets 404 guard catches it)
GET /assets/bad%2  -> 404
GET /%zz           -> 500   unhandled_error:path=/%zz
```

A malformed percent-escape at the site root reaches `express.static`'s
`send`, which raises a 400-status `URIError`; the global error handler
(`server/app.ts:326-365`) has branches for `SyntaxError`, `ValidationError`,
session pressure and 413 but not for a generic `err.status` in the 4xx range,
so a pure client mistake is answered **500** and logged as a server fault.
The root `express.static` mount predates this range, so this is not a
regression from these 22 commits — but the range *did* rewrite the comment
right above that `path: req.path` line, and its claim that `req.path` there is
"the top-level, unstripped path in practice" is true only because no prefixed
mount currently produces a 500. **Fix:** add a 4xx-passthrough branch ahead of
the 500 branch and log it at `warn`.

### C4 — the WS upgrade is not logged at all

`server/collab/yjs-server.ts` attaches on the HTTP server's `'upgrade'` event,
which never runs Express middleware, so `requestLogger` never sees a
`/collab/:room` connection and no `request` line is emitted for one.
Pre-existing and unchanged by this range (the middleware could not have seen
upgrades before either), but the app.ts comment's exhaustive "this is the ONLY
place in server/** that logs per-request path data" framing reads as if
coverage is complete. Worth one sentence in that comment, or a
`collab_upgrade` log line in `yjs-server.ts` carrying the parsed room only
(never the auth token).

---

# Re-verification and areas 4-6 — run against **main @ `8749d02f`**

The first run (areas 1-3 above) died on a session rate limit and its isolation
worktree is gone. Everything from here on was run **read-only against
`/home/user/STORYMACHINE`** at `8749d02f`, which already carries the fixes for
A1, A3, B1-B5 and C2-C4 (`5170496c`, `8749d02f`). Areas 1-3 above are left
exactly as first written — they describe `802f1c16`, the range under review.
No file in the repository was modified; `git status` is clean; every server
started below was killed.

## Re-verification of A1 on the new main — the fix works for the shape I
## reported, and a fresh probe found the SAME hole one identity over

### A1-fixed — CONFIRMED CLOSED for the caps-dialogue shape

```
cd /home/user/STORYMACHINE
node --experimental-strip-types <session scratch>/probe-clause2.ts
```

```
CAPS dialogue       (distinct=200 occ=6000 chars=458716): guard=REJECT pipelineCharacterBlocks=6000
mixed-case dialogue (distinct=200 occ=6000 chars=272716): guard=REJECT pipelineCharacterBlocks=6000
```

Both variants now reject. The fix replaced the "is the line *after* the blank
gap cue-shaped?" test with `isCharacterCue(line)` on the cue itself, which is
the right axis: it asks what `normalizeScreenplay` would do with **this** line
rather than guessing from the next one.

### A1-R8 — BLOCKER (still open on `8749d02f`): the guard's OUTER filter is still `isCueLikeLine`, which rejects `NAME (cont'd)`. `normalizeScreenplay` accepts it, UPPERCASES it on reflow, and `CHARACTER_CUE_RE` then accepts the result — 82.4 s of CPU for a 326,716-char request the guard passes.

**Severity: BLOCKER.** Same class as A1, same unauthenticated route, one
character class away from the shape just fixed.

**Where:** `server/lib/validation.ts`, `fountainShapeRejectionReason`'s loop
head — `if (!isCueLikeLine(line)) continue;`. The new
`isCharacterCue(line)` test the fix added sits *inside* that filter, so a line
`isCueLikeLine` rejects never reaches it.

**The mechanism (three predicates, two disagreements):**

| line | `isCueLikeLine` (guard's outer filter) | `isCharacterCue` (normalizer) | `CHARACTER_CUE_RE` (parser) |
|---|---|---|---|
| `PERSON1 (cont'd)` | **false** (lowercase in the tail) | **true** (tail stripped by `PAREN_TAIL_RE`) | false |
| `PERSON1 (CONT'D)` | true | true | true |

`normalizeScreenplay` does not merely *accept* the lowercase form — at
`server/nvm/analyze/screenplay-normalizer.ts`'s reflow it writes
`out.push(t.toUpperCase().replace(PAREN_TAIL_RE, …))`, i.e. it **converts row
1 into row 2**. So the guard sees a line no predicate calls a cue, and the
analyzer sees a canonical `PERSON0 (CONT'D)` character block.

This is exactly the shape the guard's own comment dismisses:

> "Two OTHER cue predicates exist in this repo … and both also accept a
> lowercase parenthetical tail, e.g. `NAME (cont'd)`, that this guard does not
> count. Measured (2026-09-05 review): that shape is NOT a cost vector —
> 1,000/2,000/4,000 such lines cost a flat ~0.4-1.9s"

That measurement was taken on the **adjacent** (single-spaced) shape, where
`CHARACTER_CUE_RE` never matches the lowercase tail and no character blocks
form. Put the same cue in the **double-spaced** shape — which is what forces
`normalizeScreenplay` to run its uppercasing reflow — and it becomes the
cost vector the comment says it is not.

**Reproduce:**

```
cd /home/user/STORYMACHINE
node --experimental-strip-types <session scratch>/probe-r8.ts 200 6000
TIME_IT=1 node --experimental-strip-types <session scratch>/probe-r8.ts 200 6000
```

```
sample cue: "PERSON1 (cont'd)"
  isCueLikeLine (guard's outer filter) = false
  isCharacterCue (normalizer)          = true
distinct=200 occ=6000 chars=326716
  guard = ACCEPT
  after normalize: characterBlocks=6000 dialogueBlocks=6000
  reflowed cue line looks like: "PERSON0 (CONT'D)"
  runScriptDoctor ms=82401
```

**Reachable over real HTTP** (`probe-r8-http.ts`, small instance so the probe
returns quickly — the point is the absence of a 400, the 82.4 s is the
in-process cost at full size):

```
POST /api/scriptide/doctor   {"status":200,"ms":4484,...}
POST /api/scriptide/fix      {"status":200,"ms":21,"head":"{\"usedLLM\":false,\"source\":\"writer\",…PERSON0 (cont'd)…"}
```

**BUILD/WIRE fix.** Stop maintaining a second cue vocabulary in the outer
filter. The guard's outer predicate should be the union of *every* predicate
downstream can treat as a cue:

```ts
export function isCueLikeLine(line: string): boolean {
  return CHARACTER_CUE_RE.test(line)      // the parser's own test
    || isCharacterCue(line)               // the normalizer's own test (reflow feeds the parser)
    || CUE_LIKE_LINE_RE.test(line);       // the deliberately-loose over-counter
}
```

That is the same "provable superset by construction" argument the file already
makes for `CHARACTER_CUE_RE`, extended to the second predicate that the
2026-09-05 fix just proved is load-bearing (it is now used *inside* the loop
but not at its gate — a half-wiring). Then add the parity test the file is
missing: for each of the three predicates P, assert
`P(line) ⇒ isCueLikeLine(line)` over the same grammar product
`fountain-shape-guard-cue-parity.test.ts` already enumerates, and add a
`(cont'd)`-tail double-spaced payload to
`tests/routes/fountain-shape-guard-cue-bypass.test.ts`'s ROUND family.

The deeper fix, worth naming because this is round 8: the invariant that keeps
failing is *"the guard must count every line the PIPELINE will turn into a
character block."* That is directly testable without guessing at grammars —
`parseFountain(normalizeScreenplay(text)).filter(b => b.type === 'character')`
is a two-line oracle. A test that asserts
`guardCueOccurrences(text) >= pipelineCharacterBlocks(text)` over a generated
corpus of cue spellings (caret, tails in both cases, Unicode, length variants,
1-5 blank-line gaps, double- and single-spaced) would have caught rounds 4-8
in one go, instead of one review round per spelling.

---

## Area 4 — `POST /api/scriptide/fix` writer path

### What I tried

Booted the real app (`createApp({serveStatic:false})`) and drove twelve
writer-path bodies plus a four-case format-parity battery:

```
node --experimental-strip-types <session scratch>/probe-fix.ts
node --experimental-strip-types <session scratch>/probe-fix2.ts
```

Cases: a reordered-scene candidate; a genuinely different candidate
(`low-tide-bad` → `low-tide-excellent`); a byte-identical candidate; a
candidate identical modulo *surrounding* whitespace; one identical modulo
*internal trailing* whitespace; a candidate that fails the shape guard; a
candidate that passes it via the A1 bypass; a base too short to analyse; a
candidate at the character ceiling; a body with neither `candidateFountain`
nor `span`/`issues`; a body with **both**; and an `aiLimiter` burst. Then
`/doctor` vs `/fix` on the same unrecognisable text.

`server/routes/scriptide.ts` and `server/nvm/analyze/fix-delta.ts` are
untouched by `5170496c`/`8749d02f`, so everything below is current on main.

### D1 — MEDIUM-HIGH: the writer path has no `hasSceneHeading` short-circuit, so `/fix` issues a health-and-verdict receipt for text `/doctor` refuses to score — and the route's own comment ("POST either text to /doctor and the numbers must match") is falsified by it

**Where:** `server/routes/scriptide.ts`, the `if (candidateFountain !== undefined)`
block. `/api/scriptide/doctor` (`scriptide.ts:540`) and
`/api/scriptide/doctor/stream` (`:708`) both guard with
`if (fountain.trim() !== '' && !hasSceneHeading(fountain))` →
`formatUnrecognized`. The writer path of `/fix` does not, on either
`fountain` or `candidateFountain`.

**Reproduce:**

```
node --experimental-strip-types <session scratch>/probe-fix2.ts
```

```
A) /api/scriptide/doctor with a no-scene-heading document:
   {"formatUnrecognized":true,"reason":"No scene headings such as INT. or EXT. were found …"}

B) /api/scriptide/fix, candidateFountain has NO scene heading:
   {"usedLLM":false,"source":"writer",...,
    "before":{"health":76,"verdict":"CONSIDER","contentHash":"15c46ebe…"},
    "after": {"health":0, "verdict":"PASS",    "contentHash":"a92780a3…"}}

C) /api/scriptide/fix, BOTH sides unrecognisable:
    "before":{"health":0,"verdict":"PASS"}  "after":{"health":0,"verdict":"PASS"}

D) /api/scriptide/fix, candidate is a three-line stub:
    "after":{"health":0,"verdict":"PASS"}, cleared:[{"rule":"WEAK_MIDPOINT",…}, …]
```

The identical bytes that `/doctor` answers `formatUnrecognized` for get a
`health: 0, verdict: "PASS"` in a receipt from `/fix`. `fix-delta.ts`'s header
states the receipt's whole warrant as "POST either text to /doctor and the
numbers must match byte for byte" — case B is a two-command falsification of
that sentence. Case C is worse: *both* sides are unscorable, so the receipt
renders `PASS → PASS, 0 cleared, 0 introduced` and reads as "your rewrite
changed nothing", when in fact nothing was ever analysed. Case D shows the
`cleared` column filling with real rule names (`WEAK_MIDPOINT`, …) because the
writer replaced a script with a stub — the win column rewards deletion.

`baselineOnlySignals`/`isWholeDraftAnalysisComplete` do not catch any of
these: `isWholeDraftAnalysisComplete`
(`src/lib/analysis-completeness.ts`) returns **true** for a degenerate report
— it only fails on `truncatedForAnalysis`, a non-true `analysisComplete`, or a
non-empty `failedPasses`. So the "analysis of the original draft is
incomplete" branch is unreachable for short or unrecognisable input; it fires
only for a *truncated* one (see D2).

**BUILD/WIRE fix:** reuse what is already in the same file, on both fields,
before either doctor run:

```ts
for (const [field, text] of [['fountain', fountain], ['candidateFountain', candidateFountain]] as const) {
  if (text.trim() !== '' && !hasSceneHeading(text)) {
    res.json({
      usedLLM: false, source: 'writer', formatUnrecognized: true, field,
      reason: FORMAT_UNRECOGNIZED_REASON, hint: FORMAT_UNRECOGNIZED_HINT,
      ...await baselineOnlySignals(fountain),
    });
    return;
  }
}
```

`hasSceneHeading`, `FORMAT_UNRECOGNIZED_REASON` and `FORMAT_UNRECOGNIZED_HINT`
are already exported/defined at `scriptide.ts:441-451`; this is wiring an
existing guard into the third route that needs it, not a new concept. Add a
test asserting `/doctor` and `/fix` agree on the same input — that is the
LANE_STANDARD §2 "every surface shows the same number from the same source"
rule stated as an assertion.

### D2 — LOW: "could not be fully analyzed … Check the draft and try again" is the message a *truncated* (i.e. very long) candidate gets

At the character ceiling the route does take the incomplete branch, and the
before-only `structuralSignals` path works exactly as designed:

```
--- 4.9 candidate at the char ceiling (900,000) ---
  candChars=864889 status=200 ms=2079
  {"usedLLM":false,"source":"writer",
   "note":"Your rewrite could not be fully analyzed, so there is no honest score to compare it against. Check the draft and try again.",
   "ss":["before"]}
```

`structuralSignals` carries `before` only — the documented shape, and it is
right. The copy is the problem: the candidate is not malformed, it exceeded
the analyzer's scene budget and was truncated (`truncatedForAnalysis`).
"Check the draft and try again" sends the writer looking for a mistake that
is not there. **Fix:** branch the note on *why* completeness failed
(`truncatedForAnalysis` vs `failedPasses`), and say "your rewrite is longer
than the analyzer scores in one pass (N of M scenes)".

### D3 — LOW: a body carrying BOTH `candidateFountain` and `span`/`issues` silently takes the writer path

```
--- 4.11 BOTH candidateFountain and span/issues (which wins?) ---
  status=200 {"usedLLM":false,"source":"writer",...,"cleared":47,"introduced":30}
```

`FixBodySchema`'s `.refine` only requires *at least one* complete shape, and
the route checks `candidateFountain !== undefined` first, so `span`/`issues`
are dropped with no signal at all. A client that sends both (a stale field on
a shared request object is the obvious way this happens) silently gets a
verification instead of the generation it asked for, and `usedLLM:false` looks
like a keyless failure. **Fix:** make the refinement exclusive
(`candidateFountain === undefined ? (span && issues) : (!span && !issues)`)
with a message naming both shapes — the schema already carries the vocabulary.

### D4 — LOW: `contentHash` is not stable under a whitespace-only edit the analyzer itself normalises away, so the receipt shows two hashes for one document (and pays for a second full analysis)

```
--- 4.3 candidate byte-identical ---            beforeHash=15c46ebe75 afterHash=15c46ebe75  ms=6
--- 4.4 identical modulo SURROUNDING whitespace --- beforeHash=15c46ebe75 afterHash=15c46ebe75  ms=5
--- 4.5 identical modulo INTERNAL trailing spaces --- beforeHash=15c46ebe75 afterHash=03d14fcef7  ms=43
```

4.5 adds one trailing space to every line. `normalizeScreenplay` strips
trailing whitespace per line before anything reads the text, so the analysis
is identical — `health 76 → 76, cleared 0, introduced 0` — but
`computeContentHash` (whole-document `trim()` only) yields a different hash,
the doctor's LRU misses, and a full second analysis runs (43 ms vs the 5-6 ms
cache hits). Two consequences: the receipt presents
`before.contentHash !== after.contentHash` as evidence the documents differ
when analytically they do not, and any editor that touches trailing
whitespace doubles the cost of a verification. `computeContentHash` is in
`doctor.ts` (scoring path — a change there needs a receipt), so the
**wiring** fix is at the call site: `fix-delta.ts` can add
`identicalAnalysis: before.contentHash === after.contentHash || (cleared.length === 0 && introduced.length === 0 && before.health === after.health)` so the
receipt can say "no measured difference" rather than implying one.

### D5 — CLEAN: the guard, the cache, the limiter, and the receipt builder

* **`candidateFountain` is guarded** — `fountainField()` at
  `validation.ts:1290`, and the 400 names the field:
  ```
  --- 4.6 candidate that fails the shape guard (huge token) ---
    status=400 {"error":"candidateFountain: must not contain a single unbroken run of more than 2000 non-whitespace characters"}
  ```
  (It inherits A1-R8, like every other call site.)
* **No cache-hash collision between base and candidate.** 4.3/4.4 show the
  candidate correctly *hitting* the baseline's cache entry when the trimmed
  text is identical (5-6 ms round trips), and 4.1/4.2/4.5 show distinct hashes
  for distinct text. The cache key folds `deepRead` and `storyContext`
  (`doctor.ts`'s `doctorCacheKey`) and the writer path passes neither, so both
  runs share one key space by construction — which is the intended free
  baseline the route's comment describes, not a collision.
* **`aiLimiter` applies to the deterministic writer path**, as the route's
  comment says it deliberately does:
  ```
  --- 4.12 aiLimiter budget on the writer path ---
    first 429 at request index 9   (20/min shared with the whole route; 11 earlier cases had consumed the rest)
  ```
  Worth stating as a number rather than a posture, though: 20 writer
  verifications per minute per IP × **two** full analyses each = 40 doctor
  runs/min from one IP on the stricter limiter, versus 120/min on `/doctor`'s
  `gameLimiter`. Under A1-R8 that is 120 × 82 s ≈ 9,800 CPU-seconds per minute
  of anonymous work from a single address against a 2-worker pool.
* **Writer/generated parity of the receipt itself is real, by construction.**
  Both call `buildVerifyReceipt` (`fix-delta.ts`); `fix.ts` now spreads it
  (`...buildVerifyReceipt(baseline, candidateReport)`) instead of assembling
  `before`/`after`/`cleared`/`introduced` itself. I could not exercise the
  generated path (no key on this box), but the two producers share one
  function, so a delta *computation* divergence is structurally excluded. One
  asymmetry to note: the writer path sets `source: 'writer'` and the generated
  path sets no `source` at all, so a client must treat `undefined` as
  "generated". Adding `source: 'generated'` in `fix.ts`'s return would make the
  discriminator total rather than a default.
* **A reordered-scene candidate produces a sane receipt** —
  `4.1: cleared=22, introduced=30`, health 76 → 76. The stable issue `id`
  (a hash over a *normalised* scene span) survives the reorder well enough that
  the diff is not "everything cleared, everything introduced", which was the
  failure mode I expected from a span-derived identity.

---

## Area 5 — export routes with `draftRank`

### What I tried

* **Bounds**: 16 `draftRank` shapes driven through **both** `POST
  /api/export/coverage` and `POST /api/export/coverage-letter` on a real
  server, comparing the rendered sentence on each surface
  (`probe-rank.ts`).
* **Byte-identity**: extracted `1e170831` with `git archive` into
  `/tmp/oldrepo`, produced ONE `ScriptDoctorReport` from the current tree
  (pinned `analyzedAt`), and rendered it through the old and new
  `renderCoverageHtml` / `renderCoverageLetter` in the same process
  (`probe-identity2.ts`). Comparing the *same report object* through both
  renderers isolates the renderer from any doctor drift.

### E1 — MEDIUM: the coverage LETTER drops `unscored` in the first-draft state, while the coverage HTML and the panel render it — the exact drift `draft-rank-copy.ts` was created to end, in the one branch that was never migrated

**Where:** `server/lib/coverage-letter.ts:260-289`. The `of <= 1` arm
hand-writes its sentence and never calls `unrankedDraftsNote`; only the
`else` arm does (`:284-287`). `src/lib/draft-rank-copy.ts`'s
`draftRankSentence` — which `server/lib/coverage-html.ts:163-166` and
`ScriptDoctorPanel.tsx` both call — appends the note in **both** arms, and
its own comment calls that "a correctness-by-construction guarantee, not dead
code".

**Reproduce:**

```
cd /home/user/STORYMACHINE
node --experimental-strip-types <session scratch>/probe-rank.ts
```

```
rank 1 of 1 unscored 5
  /coverage        200  First saved draft — rank among your drafts appears after your next run or save
                        — 5 of 6 runs and saved drafts of this script are unranked (saved without a fresh diagnosis)
  /coverage-letter 200  This is your first saved draft of this script — a rank among your own drafts
                        will appear after your next run or save.          <-- note silently dropped

rank 3 of 6 unscored 1
  /coverage        200  … 3rd of 6 … — 1 of 7 … is unranked (saved without a fresh diagnosis)
  /coverage-letter 200  … ranks 3rd of 6 … 1 of 7 runs and saved drafts of this script is unranked …
```

Same wire-legal payload, two surfaces, one of them silently loses "5 of your
6 drafts have no score". The `of <= 1` arm is the *only* place the two
disagree, which is exactly why it survived: the tests
(`tests/core/percentile-copy-consistency.test.ts`,
`draft-rank-copy-consistency.test.ts`) pin the shared module and the ranked
arm, not the letter's own first-draft literal.

**BUILD/WIRE fix:** finish the migration the round-2 review started — replace
the letter's `of <= 1` literal with the shared composition it already
imports:

```ts
const first = `This is your first saved draft of this script — a rank among your own drafts `
  + `will appear after ${draftRankNextOpportunityLabel()}.`;
const note = unrankedDraftsNote(unscored ?? 0, of);
caveats.push(note ? `${first} ${note.charAt(0).toUpperCase()}${note.slice(1)}.` : first);
```

(`unrankedDraftsNote` is already imported at `coverage-letter.ts:84`; this
adds no dependency.) Then add the `{rank:1, of:1, unscored:N}` state to the
cross-surface consistency test, which currently only covers the ranked arm.

### E2 — LOW: `{ tied: true, of: 1 }` is wire-legal and silently dropped by every surface

```
rank 1 of 1 TIED
  /coverage        200  First saved draft — rank among your drafts appears after your next run or save
  /coverage-letter 200  This is your first saved draft of this script — …
```

A tie needs another draft, so `tied` with `of: 1` is meaningless — but
`DraftRankSchema` accepts it and both renderers drop it without comment. The
schema already carries a cross-field `.refine` (`rank <= of`), so the
consistent fix is to extend it:
`.refine(v => !(v.tied && v.of <= 1), 'tied requires of >= 2')`. Accept-and-
silently-drop is the shape that lets a client bug live forever.

### E3 — CLEAN: every other bound behaves, and both routes agree on the error

```
rank 7 of 6  (rank > of)      400 {"error":"draftRank: rank must not exceed of"}                 (both routes)
rank 1 of 72 (of > 71)        400 {"error":"draftRank.of: Too big: expected number to be <=71"}   (both)
rank 0 of 6  (rank < 1)       400 {"error":"draftRank.rank: Too small: expected number to be >=1"}(both)
rank null of 0 unscored 5     400 {"error":"draftRank.rank: Invalid input: expected number, received null"} (both)
unscored 71  (> max 70)       400 {"error":"draftRank.unscored: Too big: expected number to be <=70"} (both)
rank 1.5 of 6                 400 {"error":"draftRank.rank: Invalid input: expected int, received number"}  (both)
tied:"yes"                    400 {"error":"draftRank.tied: Invalid input: expected boolean, received string"} (both)
rank 71 of 71                 200 "… 71st of 71 runs and saved drafts of this script (by health)" (both)
extra unknown field           200 stripped, renders normally                                      (both)
```

The **unscored shape** (`{rank: null, of: 0, unscored: N}` — the live
`DraftRank` state for "N saved records exist, none scored") is correctly
rejected at the wire by `rank: z.number().int().min(1)`, and
`draftRankExportPayload` (`src/lib/draft-rank-copy.ts`) is the client-side
guard that stops it being sent — the fix for the "Export report 400'd where it
used to download" defect. Both halves are present; I could not make the
unscored shape reach a renderer.

### E4 — CLEAN: byte-identity against `1e170831`'s renderer for reports without the fields

```
node --experimental-strip-types <session scratch>/probe-identity2.ts
```

```
HTML   — no healthPercentile, no draftRank:  BYTE-IDENTICAL (123112 bytes)
LETTER markdown — no healthPercentile, no draftRank:  BYTE-IDENTICAL (3203 bytes)
LETTER text     — no healthPercentile, no draftRank:  BYTE-IDENTICAL (3271 bytes)
HTML   — healthPercentile present, no draftRank: DIFFERS (+457 bytes, +15 lines)
```

The "purely additive: a caller that omits `opts.draftRank` gets byte-identical
output to before this field existed" claim in `coverage-letter.ts:258` holds
on all three outputs. The only divergence is the intended new feature: when
`report.healthPercentile` IS present the new HTML adds the
`.health-text-block`/`.health-percentile` CSS rules and the percentile line
itself (`coverage-html.ts` "previously had no draft-rank or percentile line at
all"). One micro-observation, not a finding: those two CSS rules are emitted
inside the percentile branch, so an export with neither field carries no dead
CSS — which is why case 1 is byte-identical rather than merely
visually-identical.

---

## Area 6 — `POST /api/nvm/whatif/doctor` + `materialize.ts`

### What I tried

Booted the real app and drove: a zero-commit session; a one-commit session;
the same request twice and two independently-seeded sessions (contentHash
determinism); 12 commits at `branchLimit` 5 and 99; six concurrent identical
calls; a 140-call limiter burst; a nonexistent `opId` against both
`/whatif/explore` and `/whatif/doctor`; and a session grown through ordinary
`inject-ops` calls until the projected draft passed `MAX_FOUNTAIN_CHARS`.

```
node --experimental-strip-types <session scratch>/probe-whatif.ts
node --experimental-strip-types <session scratch>/probe-whatif-opid.ts
node --experimental-strip-types <session scratch>/probe-whatif-big.ts 3000 2
node --experimental-strip-types <session scratch>/probe-whatif-big.ts 3000 6
```

`server/nvm/whatif/materialize.ts` itself has **no commits in
`1e170831..HEAD`** — it is unchanged; only the route's `presentReport` grew
`contentHash`/`healthPercentile`.

### F1 — MEDIUM-HIGH: the projected fountain is the one analyzer entry point with NO size and NO shape guard. Six ordinary `inject-ops` calls produce a 1,246,983-char draft (138.6 % of `MAX_FOUNTAIN_CHARS`) that `/whatif/doctor` scores in 26.5 s and returns in a 3.85 MB response.

**Where:** `server/routes/nvm/twin-whatif.ts` — `scoreDraft` hands
`draft.fountain` straight to `runScriptDoctorOffThread` with only a
`sceneCount === 0` short-circuit in front of it. And
`server/lib/validation.ts:1113-1118`:

```ts
export const InjectOpsBodySchema = z.object({
  sessionId: sessionIdField,
  ops: z.array(StoryOpItemSchema).min(1),   // <- no .max()
  ...
```

Every *raw* fountain field is `fountainField()` — `min(1).max(900_000)` plus
`fountainShapeRejectionReason`. Every *converted* (fdx/pdf) fountain now gets
`rejectPathologicalConvertedFountain` at seven call sites (A4 above). The
*projected* fountain gets neither, and it is the only one an attacker can
grow past the ceiling every other path enforces.

**Reproduce:**

```
node --experimental-strip-types <session scratch>/probe-whatif-big.ts 3000 2
  inject-ops #1 (3000 ADD_FACT + 1 RAISE_CLOCK): status=200 requestBodyBytes=500766
  inject-ops #2 (3000 ADD_FACT):                 status=200 requestBodyBytes=500716
  POST /api/nvm/whatif/doctor: status=200 ms=5151 responseBytes=1284471
    base fountain chars = 415755  sceneCount=2 complete=true health=30
    would the raw-fountain guard have rejected the base draft? no
    MAX_FOUNTAIN_CHARS = 900000; base draft is 46.2% of it

node --experimental-strip-types <session scratch>/probe-whatif-big.ts 3000 6
  POST /api/nvm/whatif/doctor: status=200 ms=26525 responseBytes=3850185
    base fountain chars = 1246983  sceneCount=6 complete=true health=76.7
    branches = 1, each fountain chars = 1247101
    would the raw-fountain guard have rejected the base draft? no
    MAX_FOUNTAIN_CHARS = 900000; base draft is 138.6% of it
```

Seven requests total, every one of them individually legal (each ~500 KB, all
under the 1 MB body cap, all on `gameLimiter`). The route is documented as
"pure CPU, never a model call" and takes `gameLimiter` (120/min) for that
reason — but each call runs **1 + branchLimit (up to 5) = up to 6** doctor
runs, so the per-IP ceiling is ~720 unbounded-size doctor runs a minute, and
the response body alone was 3.85 MB here (the route returns the full Fountain
of the base *and* every branch). Health `76.7` for 18,001 machine-generated
`ADD_FACT` ops is its own signal about what the projected text is worth
scoring, but that is a scoring question, not this one.

**BUILD/WIRE fix (three small wirings, no removal):**

1. `InjectOpsBodySchema.ops` gets a `.max()` matching the other array caps in
   the file (`FixBodySchema.issues` is `.min(1).max(10)`,
   `SlateBodySchema.scripts` `.min(2).max(20)`) — a few hundred is generous
   for one commit.
2. In `twin-whatif.ts`'s `scoreDraft`, run the same guard the converted paths
   run, plus the ceiling the raw paths enforce, before scoring:
   `if (draft.fountain.length > MAX_FOUNTAIN_CHARS || fountainShapeRejectionReason(draft.fountain))
   return { formatUnrecognized: false, analysisComplete: false, sceneCount: draft.sceneCount, tooLarge: true };`
   — i.e. answer honestly-incomplete, exactly as the `sceneCount === 0`
   short-circuit already does, rather than paying for the analysis.
3. Bound the response: the base and every variant's full Fountain is already
   available to the client through `/whatif/explore` + a `/doctor` call on the
   promoted branch; returning up to six multi-MB drafts in one body is the
   part that turns a CPU cost into a bandwidth cost too.

### F2 — MEDIUM: a nonexistent `opId` returns 200 with the SAME health numbers as a real one — `/whatif/doctor` scores an intervention on an op that does not exist

**Reproduce:**

```
node --experimental-strip-types <session scratch>/probe-whatif-opid.ts
```

```
REAL opId
  /explore 200 branches=2 consequences=3
  /doctor  200 baseHealth=30 branchHealths=53.3(Δ23.3),53.3(Δ23.3)

bogus opId "nope:0"
  /explore 200 branches=2 consequences=1
  /doctor  200 baseHealth=30 branchHealths=53.3(Δ23.3),53.3(Δ23.3)

bogus opId ""
  /explore 400 / /doctor 400   {"error":"opId: Too small: expected string to have >=1 characters"}
```

`healthDelta: +23.3` is presented for an intervention on an op the session has
never contained. The two readouts are byte-identical on the numbers the new
route added; only the `consequences` count (3 vs 1) differs, and nothing in
the response says the `opId` was not found. The route's honesty paragraph
promises health is "withheld exactly where the route layer already withholds
them" — an unknown intervention is not one of those places, and this route is
the one that attached numbers to it.

**BUILD/WIRE fix:** the handler already has the SCM in hand
(`const scm = buildSCM(stage)`), so this is one guard with no new data:

```ts
if (!scm.nodes.some(n => n.opId === opId)) {
  res.status(404).json({ error: 'opId not found in this session’s causal model' });
  return;
}
```

Apply it to `/whatif/explore` too so the two routes cannot answer differently
about whether an intervention exists. The zero-commit case (6.1 below) is the
same bug at its most visible: a session with **no commits at all** answered
`200` with `base: {sceneCount:0, formatUnrecognized:true}` *and* a fabricated
branch carrying `sceneCount:1, analysisComplete:true, health:0, contentHash`.

### F3 — LOW: the `sceneCount === 0` short-circuit stops one scene short of the trap it names

```
6.2 one-commit session: 200
  {"baseSceneCount":1,"baseComplete":true,"baseHash":"cb82944537","baseHealth":0,
   "basePct":0,"baseFormatUnrecognized":false, ...}
```

The route's comment says the zero-scene short-circuit exists because "the
doctor reads such a document as a fully-analyzed health-0 / verdict PASS
report rather than an honestly incomplete one". A **one**-scene projected
draft produces exactly that: `analysisComplete: true`, `health: 0`,
`healthPercentile: 0`. The code already knows one scene is not enough for
cross-scene measurement — `structuralSignals` is gated on `scored` (>= 2
scenes) and is correctly absent here — but health, grade and percentile all
go out. This is *consistent* with `/api/scriptide/doctor` (which would also
score a one-scene document), so it is a shared-threshold question rather than
a divergence; the finding is that the comment sets an expectation the
short-circuit only half-meets. **Fix:** either extend the short-circuit to the
same `>= 2 scenes` floor `structuralSignals` already uses, or narrow the
comment to say the boundary is "no slugline at all", not "not enough script to
score".

### F4 — LOW: the zero-scene branch object omits `contentHash` and `analyzedAt`

`const unscorable = { formatUnrecognized: true, analysisComplete: false, sceneCount: 0 }`
is spread into the branch object, so a zero-scene branch has neither field
while every other branch has both. The round-2 review added `contentHash`
specifically so "a promoted/undo What-If snapshot can dedupe exactly against
this same run … instead of only ever landing on the approximate
health+timestamp fallback" — a promoted zero-scene branch has neither the
exact key nor the timestamp half of the fallback. Nothing is scored there, so
the impact is small, but the field the review added is absent on exactly the
branch shape that has no other identity. **Fix:** compute the projected
draft's `contentHash` (it is deterministic text — `materialize.ts`'s header
guarantees it) and set `analyzedAt` on the `unscorable` shape too.

### F5 — CLEAN: contentHash determinism, concurrency, and the limiter

```
6.3 same session repeated:            identical=true   (ms 27 then 5 — the LRU hit)
    different session, same seed:     identical=true
    base fountain identical across sessions: true
6.4 12 commits, branchLimit 5: 200 ms=77 baseFountainChars=2814 branches=2
    branchLimit 99: 400 {"error":"branchLimit: Too big: expected number to be <=5"}
6.5 6 concurrent calls: statuses=200,200,200,200,200,200 wall=24ms distinctResultSignatures=1
6.6 limiter: first 429 at call 80 (gameLimiter, 120/min, shared with the
    inject-ops/scm calls this process had already spent)
```

* **contentHash determinism holds, and holds across sessions.**
  `materialize.ts`'s header claims "no randomUUID, no Date.now … the same
  {commits, intervention, branches} therefore always compiles to
  byte-identical Fountain". Two independently-created sessions seeded with the
  same ops produced byte-identical base Fountain and an identical
  `[baseHash, ...branchHashes]` signature — so the claim is true across
  session identity, not merely within one session. The 27 ms → 5 ms drop on
  the repeat is the doctor's content-hash LRU doing what the route's comment
  says it does.
* **`branchLimit` is bounded** at 5 by the schema (400 on 99), so the
  fan-out per request is capped even though the per-draft size (F1) is not.
* **Concurrency is clean**: six simultaneous identical requests all returned
  200 with a single distinct result signature in 24 ms wall — the pooled path
  serialises through the LRU rather than racing.
* **`gameLimiter` is wired** and fires.

---

## Housekeeping

* Nothing in `/home/user/STORYMACHINE` was modified: `git status --porcelain`
  is empty. All probes live in
  `<session scratch>/`,
  and the `1e170831` comparison tree in `/tmp/oldrepo` (a `git archive`
  extract, not a worktree).
* Every server this run started was in-process and closed with
  `server.close()` + `process.exit(0)`. `ps aux | grep node` shows one
  `server.ts` (pid 26274) that belongs to another agent's session — it sits
  beside that session's own `scratchpad/rank-review/prov1.mjs` — so it was
  deliberately left alone.
* No `npm test` and no browser battery were run, per the budget.

## Findings at a glance

| id | severity | area | one line |
|---|---|---|---|
| **A1-R8** | **BLOCKER (open on `8749d02f`)** | guard | `NAME (cont'd)` cues bypass the guard's outer `isCueLikeLine` filter; the normalizer uppercases them into real cues — 82.4 s for a 326 KB request |
| A1 | BLOCKER (fixed) | guard | caps-dialogue exclusion-clause bypass — 115.7 s for 458 KB; verified closed |
| A3 | MEDIUM (fixed) | guard | boneyard blindness |
| B1 | HIGH (fixed) | shutdown | drain window applied to `uncaughtException` |
| B2/B3/B5 | LOW (fixed) | shutdown | warm-state freeze, no-op double SIGTERM, unparameterised `stop_grace_period` |
| C2/C4 | LOW (fixed) | logging | bare-mount trailing slash, unlogged WS upgrade |
| C3 | LOW (open, pre-range) | logging | `/%zz` → 500 + `unhandled_error` |
| **D1** | **MEDIUM-HIGH (open)** | fix route | no `hasSceneHeading` short-circuit: `/fix` scores text `/doctor` refuses, falsifying "POST either text to /doctor and the numbers must match" |
| D2/D3/D4 | LOW (open) | fix route | truncation copy, both-shapes silently takes writer path, contentHash unstable under trailing whitespace |
| **E1** | **MEDIUM (open)** | exports | coverage LETTER drops `unscored` in the first-draft state; HTML and panel render it |
| E2 | LOW (open) | exports | `{tied:true, of:1}` accepted and dropped |
| **F1** | **MEDIUM-HIGH (open)** | what-if | projected fountain has no size and no shape guard — 1,246,983 chars (138.6 % of the ceiling) scored in 26.5 s from seven legal requests |
| **F2** | **MEDIUM (open)** | what-if | nonexistent `opId` → 200 with the same `healthDelta` as a real one |
| F3/F4 | LOW (open) | what-if | one-scene draft still scored 0/`complete:true`; zero-scene branch has no `contentHash`/`analyzedAt` |
