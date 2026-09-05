# Independent review — readiness lane (`worktree-agent-a68b02d00ec994c86`, commit `91b8dc73`)

Reviewer: independent agent (did not build the change). Worktree read-only throughout;
`git status --porcelain` in the lane worktree was empty before and after this review, and
every probe lived in the scratchpad, never in the repo. All servers I started are dead
(`pgrep -af server.ts` shows only three processes, all owned by sibling worktrees
`agent-a44b759f2b8a6d0d2` / `agent-af5e391ed56645643` — verified via `/proc/<pid>/cwd` —
and deliberately left alone).

**Verdict: REVISE.** The change is well-built, well-commented, and the two audit findings
are genuinely closed — I reproduced both. But the readiness endpoint it adds shares one
per-IP rate-limit bucket with the whole `/api` surface, and I reproduced `GET /ready`
answering **429** on a warm, healthy server after ordinary API traffic — i.e. the new
container health signal fails exactly when the container is busy. That plus a smaller
log-integrity regression in the `originalUrl` fix are the blocking items; both are small
and mechanical to fix.

---

## 1. Brief vs diff

| # | Brief item | Status | Evidence |
|---|---|---|---|
| A1 | `warmDoctorPool()` records `{started, finished, ms, slotsWarmed, failed}`, readable via exported `getDoctorPoolWarmState()` | **DONE** (widened, harmlessly) | `server/nvm/analyze/doctor-pool.ts:496-528` (interface + `getDoctorPoolWarmState()` returning a copy at :519, `resetDoctorPoolWarmStateForTests()` at :526); writes at :534, :538, :544, :566, :583. Adds a 6th field `finishedAt` beyond the brief's five — needed by A2's `warmedAt`, declared in the report. |
| A2 | `/health` gains `doctorPool: { warm, warmedAt, ms }`, additively | **DONE** | `server/routes/config.ts:88-108`; all five prior keys (`status`, `uptime`, `sessions`, `version`, `commit`) untouched, pinned by `tests/routes/ready.test.ts` ("Every prior /health field stays intact"). Verified live (§2). |
| A3 | New `GET /ready` (gameLimiter), 200 `{ready:true}` when warm / immediately when pre-warm is a no-op, else 503 `{ready:false, reason}` | **DONE as briefed — and the brief was wrong** | `server/routes/config.ts:131-138`. Behaviour matches the brief exactly. The `gameLimiter` the brief specified is the defect in §3.1: it makes `/ready` return **429** on a warm server under normal load. LANE_STANDARD §1 ("a brief's premise is a hypothesis") puts surfacing that on the lane; the report does not mention it. |
| A4 | Dockerfile `HEALTHCHECK` + docker-compose point at `/ready`, start period covering the warm-up; README documents both endpoints | **DONE** | `Dockerfile:78-93` (`--start-period=15s`, `wget -qO- .../ready`); `docker-compose.yml:105-120` (`start_period: 15s`); `README.md:61-62` (both env vars), `:80-81` (both endpoints), `:275-288` (`/health` vs `/ready` prose). 15s vs a measured 2.1–3.9 s warm window is ample (§3.4). |
| A5 | Tests: unit test for the state machine; route tests for `/health`'s field and `/ready`'s 503→200, with an injected fake pool warm function, no sleeping on real workers | **DONE** | `tests/core/doctor-pool-warm-state.test.ts` (8), `tests/routes/ready.test.ts` (7). Every test injects `runJob`; no worker threads spawned. I ran all four new files myself: 8/8, 3/3, 5/5, 7/7, exit 0 each. |
| B | `requestLogger()` logs `req.originalUrl`'s path (query stripped, prefix kept), every existing field preserved, test mounting a router under a prefix, log-line consumers still work | **DONE, with a defect** | `server/lib/request-logger.ts:36-38` (`pathOf`), `:47`; fields `method`/`status`/`ms` unchanged. `tests/core/request-logger-prefix.test.ts` covers the synthetic mount, the mounted 404, and the real `app.ts` `/api` guard. Consumers: `tests/routes/events.test.ts:217` greps `"path":"/api/events"` — still matches (verified live). Defect: absolute-form request targets now log a full URL — §3.2. |
| F-i | `DOCTOR_POOL_PREWARM_BEFORE_LISTEN=1`: await warm-up before binding, default off, documented, tested with an injected fake | **DONE** | `server.ts:169-176` (`awaitPrewarmBeforeListenIfConfigured(warmFn = …)`), `:195` (awaited before `app.listen`), `:196` + `:210` (double-warm guard); `.env.example:172-187`; `README.md:62`; `tests/core/server-prewarm-before-listen.test.ts` (5 tests, injected fake, no port bound). Log order verified live (§2). |
| F-ii | Compare against the audit's baseline timings (instant 2,432 ms / post-warm 120 ms / prewarm-off 2,886 ms / window 2,125–2,670 ms) | **DONE, one number not comparable** | The report tabulates its numbers against the baseline and attributes the gap to sandbox load (load average 14–27 — I confirmed 14.49 at probe time). But its "first request the instant /ready flipped: 11 ms / 3 ms" is not comparable to the audit's 120 ms post-warm figure, which was a 30-scene script; 3 ms implies a much smaller payload. With a 30-scene script I measure 155 ms (§2). Direction is right, the number is a different harness — LANE_STANDARD §3 asks for the same harness before/after. |

Nothing in the brief was skipped or narrowed. Scoring path untouched:
`node scripts/check-scoring-receipt.mjs main..HEAD` → exit 0 (re-run by me).

## 2. Driving it — reproductions

Boots from the lane worktree: `NODE_ENV=production`, keyless env overrides,
`SESSION_DB_DIR=:memory:`, free port, `node --experimental-strip-types server.ts`.
Machine load average 14.5 (sibling lanes), so I judge transitions, not absolute ms.
Probes: `scratchpad/reviews/probe.mjs`, `probe-limiter.mjs`, `probe-logger.mjs`.

| Check | Result | Status |
|---|---|---|
| `/ready` 503 then 200 | 503 `{ready:false, reason:"doctor_pool_warming"}` at t+2338 ms; 200 `{ready:true}` at t+5229 ms; `server_started` at t+1089 ms; `doctor_pool_prewarmed … "ms":3582` at t+4672 ms → true listen→warm 3583 ms (poll granularity 700 ms) | **REPRODUCED** |
| `/health.doctorPool` | before: `{warm:false, warmedAt:null, ms:null}`; after: `{warm:true, warmedAt:"2026-09-04T21:05:07.474Z", ms:3582}` — `ms` equals the `doctor_pool_prewarmed` log line exactly | **REPRODUCED** |
| Request fired the instant `/ready` flipped 200 | `POST /api/scriptide/doctor`, 30-scene script → **155 ms**, HTTP 200 | **REPRODUCED** (audit post-warm 120 ms; lane's 3–11 ms not reproduced as stated — see F-ii) |
| Un-gated baseline, same harness | `DOCTOR_POOL_PREWARM=0`, request fired 397 ms after listen → **2571 ms** (audit's prewarm-off/instant row: 2886 ms) | **REPRODUCED** — the gate is worth ~16× |
| `DOCTOR_POOL_PREWARM=0` → `/ready` 200 immediately | first `/ready` after listen: 200; `warmedAt` (21:05:23.555Z) equals the `server_started` timestamp to the millisecond → flipped at listen, not later. Subsequent doctor request paid 2571 ms cold, as designed | **REPRODUCED** |
| `DOCTOR_POOL_PREWARM_BEFORE_LISTEN=1` → listen waits | log order: `doctor_pool_prewarmed … "ms":2703` at t+3807 ms, **then** `server_started` at t+3807 ms; no HTTP response of any kind before t+3807 (first poll to answer: t+4389, already 200). Doctor request 267 ms | **REPRODUCED** |
| Production logger, mount prefix | `GET /assets/does-not-exist.js` → 404, logged `"path":"/assets/does-not-exist.js"`; `GET /api/nope` → 404, logged `"path":"/api/nope"`; `GET /assets/` → 404, logged `"path":"/assets/"` | **REPRODUCED** (all three of the audit's rows) |
| Query string still excluded | `GET /api/events?sessionId=LEAK_CANARY` → logged `"path":"/api/events"`; canary absent from the log line | **REPRODUCED** |
| The new tests are load-bearing | Standalone probe with the **old** expression (`req.path` read in `res.on('finish')`) under `app.use('/mounted', …)` logs `/widget` and `/does-not-exist`, exactly what the new tests assert against — so they fail on the unfixed input | **REPRODUCED** (without touching the worktree) |

Gates I re-ran independently: `npm run lint` → 0, `npm run check-docs` → 0,
`npm run check-no-console` → 0, `check-scoring-receipt main..HEAD` → 0, and the four new
test files → 0 (23 tests). I did not re-run the full ~346 s suite or the browser battery.

## 3. Shortcut hunt

### 3.1 BLOCKING — `/ready` shares one rate-limit bucket with the entire `/api` surface, and I made it 429 on a warm server

`gameLimiter` (`server/lib/session-store.ts:137-143`) is a **module-level singleton**:
`windowMs: 60_000, max: 120`, keyed by IP and shared by every route that mounts it,
including `app.ts:243`'s `/api` 404 guard and `POST /api/scriptide/doctor`. `/ready`
(`config.ts:131`) joins that bucket. Reproduced twice, both directions:

* **Traffic starves the probe** (`probe-limiter.mjs`): boot, wait for warm, confirm
  `/ready` → 200. Then 130 ordinary `GET /api/nope` requests from one IP (116×404, 14×429).
  Then `GET /ready` → **429 `{"error":"Too many requests, please slow down."}`**, while
  `/health` in the same second reports `doctorPool: {warm:true, ms:2100}`. The container is
  warm, healthy and serving — and its readiness endpoint says no.
* **Probe starves the traffic** (first run of `probe.mjs`, 15 ms poll): the poll exhausted
  the bucket inside the warm window; `/ready` went 503 → 429 (never reaching 200 in 60 s),
  and `GET /api/nope` and `GET /api/events` from the same IP then returned **429** too.

Consequences as shipped: `wget -qO- …/ready` exits non-zero on 429, so `Dockerfile:92-93`
and `docker-compose.yml:117` mark a busy container **unhealthy** after 3 checks; and
`README.md:81` tells operators "point traffic-gating health checks here", so an external LB
or kubelet probe — which shares an IP key with proxied traffic, or burns 60/120 of the
budget on its own at a 1 s interval — drains a healthy instance under load. That is a
cascading-failure shape the previous target (`/health`, deliberately limiter-free) did not
have. Note the in-container Docker healthcheck alone is partly insulated, because it keys
on `127.0.0.1` rather than the bridge-gateway address external traffic arrives from — but
the README's headline advice is not, and the shared bucket is real either way.

`README.md:81`'s copy is also now untrue in a state that renders: "then `200 {ready:true}`
for the rest of the process's life" (LANE_STANDARD §2, "copy tells the truth").

The repo already has the mechanism for this: `tests/routes/route-capabilities.test.ts:128-140`
`exemptRoutes`, where `/health` sits with a written justification.

### 3.2 BLOCKING (small) — `pathOf(req.originalUrl)` logs a full URL for absolute-form request targets

`req.originalUrl` is the raw request target. For an absolute-form target (RFC 9112 §3.2.2 —
legal, accepted by Node, served by Express), it includes scheme and authority. Probed
directly (`probe-logger.mjs`), sending `GET http://evil.example.com/mounted/widget HTTP/1.1`:

```
HTTP/1.1 200 OK
old req.path                 -> "/widget"
new originalUrl-minus-query  -> "http://evil.example.com/mounted/widget"   <- now logged
req.baseUrl + req.path       -> "/mounted/widget"
```

So an unauthenticated client can inject an arbitrary attacker-chosen host string into the
`path` field of the production log, where every consumer and every operator assumes a
leading-slash pathname (`tests/routes/events.test.ts:217` matches on `"path":"/api/…"`).
No capability leak (the query split still happens first), but it is a log-integrity
regression this change introduces, and the audit's own recommendation (§8: "capture
`req.baseUrl + req.path`") is immune to it — third row above. The lane chose the other of
the audit's two suggested expressions and inherited an edge the recommended one does not
have. `req.baseUrl + req.path` is identical to the new behaviour in every case the new
tests cover (verified in the same probe) and needs no query-stripping helper at all, which
also removes `pathOf` as a third copy of "strip the query off a URL string"
(`server/collab/yjs-server.ts:212` and `:230` are the other two).

### 3.3 SHOULD FIX — `finished` cannot stick false through any *handled* path, but an unresponsive worker hangs it forever

I traced every branch, which is the right question to ask now that container health depends
on it:

* `NODE_ENV=test` → `finished:true` (`doctor-pool.ts:534`); `DOCTOR_POOL_PREWARM=0` →
  `finished:true` (`:538`) — both verified live and by test.
* Real path: each job's rejection is swallowed per-job (`.catch` at :554), so `Promise.all`
  cannot reject; `finished:true` at :566. Outer `catch` also sets `finished:true` at :583.
  Covered by the "every warm-up job throws" test.
* **Gap:** there is no deadline. `runScriptDoctorOffThread` (`doctor-pool.ts:352-385`)
  resolves a queued job only when a worker answers or errors — `grep -n "setTimeout"` over
  the whole file returns a single hit (`:141`, the idle timer), i.e. no per-job timeout.
  A worker that accepts a job and never replies leaves `Promise.all` pending forever,
  `finished` false forever, `/ready` 503 forever — and the container is now permanently
  *unhealthy* even though it serves every request correctly (the pool falls back
  in-process). Before this change that state was merely slow. Low probability, but it is
  the failure mode the design newly cares about.
* A second, benign "never finishes" case: any process that boots `createApp()` without
  `server.ts` (route tests) never calls `warmDoctorPool()`, so `/ready` is 503. Correct,
  and the tests rely on it.

### 3.4 Checked and fine

* **`/ready` leaks nothing.** Bodies are exactly `{ready:true}` / `{ready:false, reason:"doctor_pool_warming"}` — no worker counts, no timings, no `slotsWarmed`/`failed`. The richer numbers (`ms`, `warmedAt`) go only to `/health`, which already published `uptime`/`sessions`/`version`/`commit`; `ms` adds nothing exploitable.
* **HEALTHCHECK start period.** 15 s against a warm window measured at 2.1–2.7 s (audit), 2.1–3.9 s (mine, load 14–27), and 2.7 s even in `BEFORE_LISTEN` mode where the port stays shut for the whole window. Ample. Worth knowing, not fixing: `--interval=30s --retries=3` means an unhealthy verdict takes ~90 s after the start period.
* **Query string still excluded** — reproduced (§2), and `pathOf` splits before anything is logged.
* **WebSocket upgrade path.** `requestLogger` is Express middleware and never runs for an upgrade: `attachCollabServer` hooks `server.on('upgrade', …)` (`server/collab/yjs-server.ts:305`) and parses `req.url` itself, deliberately never logging the room id or token. `req.originalUrl` does not exist there. No interaction.
* **Routers that rewrite `url`.** Vite's dev middleware and `express.static` both mutate `req.url`; reading `originalUrl` at finish time is strictly more correct than the old `req.path`, not less. The app-level error handler still uses `req.path` (`app.ts:349`) — correct, because Express restores `req.url` when a layer unwinds, which is exactly why the *finish-time* read was the broken one; the comment change at `app.ts:100-107` documents that distinction honestly.
* **Tests that cannot fail.** None found. The prefix assertions fail on the pre-fix expression (proved in §2 without touching the worktree). The 503→200 test resets state in `beforeEach`, so its precondition is real. The rate-limit-header test would fail if `gameLimiter` were dropped, because no global limiter exists (`app.ts:75-228` mounts none) — ironically it now pins the behaviour that revision 1 needs to change, so it must be updated with it. `route-capabilities.test.ts:205` genuinely walks the live router tree, so `GET /ready` had to be classified.
* **Double-warm guard** (`server.ts:196`/`:210`) works: with `BEFORE_LISTEN=1` exactly one `doctor_pool_prewarmed` line appears.

### 3.5 Minor

* `server.ts:169-172` and `server.ts:196-197` parse `DOCTOR_POOL_PREWARM_BEFORE_LISTEN` twice, with the accepted-value list duplicated. They agree today; a future edit to one is a silent double-warm (or a silent no-warm).
* `startServer()` is invoked with no `.catch` (`server.ts:236`). `awaitPrewarmBeforeListenIfConfigured` deliberately propagates rejections (its own test asserts this), so it is now the one boot path where a warm-up failure could kill the process — contradicting `doctor-pool.ts`'s stated property that "a boot-time perf optimization must never be able to take the process down". Unreachable today (`warmDoctorPool` swallows everything), one `.catch` away from staying that way.
* Four near-identical `warmState = { … }` object literals (`:534`, `:538`, `:566`, `:583`); a two-line `settle()` helper would make "finished always gets set" structural rather than repeated.

## 4. The stronger version

A senior engineer would have noticed that a readiness endpoint is an *availability*
primitive and therefore must not be able to fail for availability reasons — so it gets its
own bucket or no bucket (like `/health`, which this repo already exempts with a written
justification), never the shared application bucket, and its warm predicate gets a deadline
so a wedged dependency degrades latency rather than flipping a container permanently
unhealthy. Both are inside this brief's scope: item 3 defines `/ready`'s contract and item
4 makes container health depend on it, so the interaction between them is the lane's to
own, and LANE_STANDARD §1 explicitly makes the brief's `(gameLimiter)` a hypothesis rather
than a fact. Two further things a stronger version would have done are *outside* it and
should not block: flipping `/ready` to 503 on SIGTERM so a load balancer drains the process
before `server.close()` starts refusing connections (`createShutdownHandler`,
`server.ts:48-64`, currently gives the LB no drain signal at all — this is the other half
of why readiness endpoints exist, and it is a ~5-line follow-up), and giving `/health` and
`/ready` a shared source for the warm snapshot instead of two call sites reading it. The
comment quality throughout this diff is genuinely above the bar — every non-obvious choice
carries its reason and its measurement — and the `BEFORE_LISTEN` follow-up is modelled
correctly on the existing DI pattern.

## 5. Verdict — REVISE

1. **Required — `server/routes/config.ts:131`, `tests/routes/route-capabilities.test.ts:128-140`, `README.md:81`.** Stop `/ready` sharing `gameLimiter`'s per-IP bucket with the `/api` surface. Either (a) drop the limiter and add `{ method: 'GET', path: '/ready', reason: … }` to `exemptRoutes` alongside `/health`, with a one-line justification saying it is an O(1) in-memory read that container/LB health checks poll and that must not fail under application load; or (b) give it a dedicated `rateLimit` instance in `server/lib/session-store.ts` with its own bucket (e.g. `max: 600`) and classify it in `route-capabilities.test.ts` accordingly. *Why:* reproduced — 130 ordinary `/api` requests from one IP make `GET /ready` return 429 on a warm server, which marks the container unhealthy (`Dockerfile:92`, `docker-compose.yml:117`) and drains a healthy instance exactly under load.
2. **Required — `tests/routes/ready.test.ts` (last test) and a new test.** Replace the "carries the gameLimiter rate-limit headers" assertion with whichever contract revision 1 chooses, and add a test that pins the property that matters: after enough `gameLimiter`-metered requests to exhaust that bucket (or with the limiter's own store pre-loaded), `GET /ready` still answers 200 on a warm pool. *Why:* the current test locks in the defective behaviour, and the fix must be guarded against re-drift.
3. **Required — `server/lib/request-logger.ts:36-47`.** Log `req.baseUrl + req.path` (the audit's own §8 recommendation) and delete `pathOf`; keep the comment, updating it to say why `baseUrl + path` rather than `originalUrl`. Add one test sending an absolute-form request line (`GET http://evil.example.com/api/nope HTTP/1.1` over a raw socket) and asserting the logged path is `/api/nope`. *Why:* reproduced — the current expression logs `"path":"http://evil.example.com/mounted/widget"`, letting an unauthenticated client inject an arbitrary host into a log field every consumer treats as a pathname; `baseUrl + path` is identical everywhere else and removes a third copy of query-stripping.
4. **Required (small) — `server/nvm/analyze/doctor-pool.ts:544-566`.** Bound the warm-up: race the `Promise.all` against a deadline (e.g. 30 s, or a `DOCTOR_POOL_PREWARM_TIMEOUT_MS`), and on expiry set `finished:true` with the elapsed ms and the failure count, logging a distinct event. Add a state-machine test with an injected `runJob` that never resolves, asserting `finished` becomes true after the deadline. *Why:* `runScriptDoctorOffThread` has no per-job timeout (`grep -n setTimeout` → only the idle timer at `:141`), so an unresponsive worker leaves `/ready` at 503 forever — and since revision A4 now points the container HEALTHCHECK at `/ready`, that turns a slow-pool state into a permanently unhealthy container that is in fact serving correctly.
5. **Required (small) — `server.ts:169-172` / `:196-197` / `:236`.** Extract the `DOCTOR_POOL_PREWARM_BEFORE_LISTEN` predicate into one exported helper used by both call sites, and add `.catch()` handling on the awaited pre-warm (log and continue to `listen`) so the one boot path that can now reject cannot take the process down. *Why:* two copies of the accepted-value list can silently disagree into a double-warm or no-warm, and `doctor-pool.ts`'s stated invariant is that the pre-warm can never kill the process.
6. **Optional (out of this brief's scope; file as follow-up if not done here) — `server.ts:48-64`.** Have `createShutdownHandler` set a `draining` flag that `/ready` reports as 503 before `server.close()` runs, so a load balancer stops sending traffic before the socket starts refusing it. *Why:* it is the other half of a readiness endpoint's job, and the endpoint that would carry it now exists.

Items 1–5 are mechanical and need no further judgment. Re-review after they land should be
quick: re-run `probe-limiter.mjs` (expect `/ready` 200 after the traffic burst) and
`probe-logger.mjs` (expect `/mounted/widget` on the absolute-form row).

---

# Re-review — amended commit `934cf84e` (2026-09-04)

Same worktree, read-only again; `git status --porcelain` empty before and after; every
server I booted is dead (`pgrep` → only sibling-worktree processes, left alone).
Diff re-read in full (`git diff main..HEAD`, 16 files, +1304/-30).

**Verdict: REVISE — one item.** All six revisions landed and I verified five of them
end-to-end, including the two probes the coordinator named and the `.unref()` sub-bug. The
sixth (draining) is implemented exactly as specified and its unit test is honest, but the
prose shipped with it makes a causal promise about load-balancer drain that I measured to
be false for any probe opening a new connection each poll — including the Dockerfile's own
`wget`. One sentence (repeated in four places), or a real drain delay, closes it.

## Item-by-item against the new diff

| My item | Claim | Verified how | Status |
|---|---|---|---|
| 1. `/ready` off the shared bucket | Exempt entirely, README fixed | `server/routes/config.ts:134` (`router.get('/ready', (_req,res) …)` — no limiter), rationale at `:100-113`; `tests/routes/route-capabilities.test.ts:137-140` `exemptRoutes` entry with a written justification, so the totality check still passes (6/6); `README.md:81` now says "No auth, **no rate limit** (exempt, same as `/health`…)" and drops the old "200 for the rest of the process's life". **Live: re-ran `probe-limiter.mjs` — 130 `/api` requests from one IP (120×404, 10×429), then `GET /ready` → `200 {"ready":true}`** (was 429 pre-revision), with `/health` reporting `warm:true, ms:1998, timedOut:false`. | **DONE / REPRODUCED** |
| 2. Tests pin the new contract | No rate-limit headers; 200 after exhausting the bucket | `tests/routes/ready.test.ts:139-153` (asserts *absence* of both `ratelimit-limit` and `x-ratelimit-limit`) and `:155-178` (fires 130 `/api/nope-<n>`, asserts 429s actually occurred — so the test can fail — then asserts `/ready` 200). File runs 10/10, exit 0. | **DONE** |
| 3. `req.baseUrl + req.path` | Plus a raw-socket absolute-form test | `server/lib/request-logger.ts:70` (`path: req.baseUrl + req.path`), `pathOf` deleted, rationale rewritten at `:16-68`; test at `tests/core/request-logger-prefix.test.ts` ("absolute-form request targets never inject a host"), 4/4. **Live against the real production server: `GET http://evil.example.com/api/nope HTTP/1.1` over a raw socket → served 404, logged `{"path":"/api/nope"}`** — no scheme, no host. Mount prefixes and query exclusion still hold (`events.test.ts` 15/15, the `"path":"/api/events"` consumer). | **DONE / REPRODUCED** |
| 4. Warm-up deadline | `DOCTOR_POOL_PREWARM_TIMEOUT_MS` (30 s default), `timedOut:true`, and the `.unref()` bug | `doctor-pool.ts:513-517` (`prewarmDeadlineMs()`, default 30 000, guarded by `Number.isFinite && >0`), `:587-627` (race, `clearTimeout` on both paths, `timedOut` state, `doctor_pool_prewarm_timed_out` log); surfaced at `config.ts:104-108` and documented in `README`/`.env.example`. Tests: fires (50 ms override, never-resolving job), does not fire (5 s), invalid/unset falls back — 11/11. **The `.unref()` finding is real and I reproduced it independently**: `Promise.race([neverSettling, unref'd 60 ms timer])` exits with code 13 ("unsettled top-level await") without the timer ever firing, while the ref'd form resolves at 60 ms. Shipped code has no `.unref()` on this timer (`grep -n unref` → only the pre-existing worker/idle timers at `:147,:188,:283`), and `:593-600` documents why. | **DONE / REPRODUCED** |
| 5. One env predicate + `.catch` | `prewarmBeforeListenEnabled()` used by both call sites; try/catch at the boot path | `server.ts:193-196` (predicate), `:201` and `:237` (both call sites now go through it), `:230-236` (try/catch logging `prewarm_before_listen_failed` and continuing to `listen`). 6/6 in `server-prewarm-before-listen.test.ts`. Minor, non-blocking: when `BEFORE_LISTEN=1` and the awaited warm-up rejects, `prewarmedBeforeListen` is still true, so the listen callback skips the fire-and-forget fallback — unreachable in production (the real `warmDoctorPool()` never rejects) and arguably correct. | **DONE** |
| 6. Drain on shutdown | `server/lib/readiness.ts` flag flipped synchronously in `createShutdownHandler` before `server.close()`; `/ready` 503 `draining`; unit-tested | `server/lib/readiness.ts` (leaf module, import-cycle rationale written down), `server.ts:63` (`setDraining()` is the first statement, before `logger.info` and `server.close()`), `config.ts:134-142` (draining checked *first*, so a warm-but-draining process still 503s), `tests/routes/hardening.test.ts` (+2 tests: synchronous flip before the close callback, and the crash-driven path), `ready.test.ts:180-200` (`/ready` 503 `draining` on a warm pool; `/health` stays 200). 18/18 and 10/10. **Mechanism verified on a real SIGTERM** — see below. | **DONE, but the copy overclaims** |

Gates I re-ran independently: `lint` 0, `check-docs` 0, `check-no-console` 0, `honesty-audit` 0,
`check-scoring-receipt main..HEAD` 0; test files: `doctor-pool-warm-state` 11/11,
`request-logger-prefix` 4/4, `server-prewarm-before-listen` 6/6, `ready` 10/10,
`hardening` 18/18, `route-capabilities` 6/6, plus the adjacent `events` 15/15,
`limiters` 2/2, `doctor-pool-prewarm` 5/5, `pure-core-boundary` 6/6 — all exit 0.
I did not re-run the full suite or the browser battery.

## The real-SIGTERM drain measurement

Booted the real server (production mode, keyless), waited for warm, confirmed `/ready` 200,
then sent SIGTERM and probed (`probe-drain.mjs`, `probe-drain-window.mjs`):

* **Run 1** — keep-alive connection established before the signal: request at +2 ms →
  `200 {"ready":true}` (the handler had not run yet); fresh connection at +9 ms →
  **`503 {"ready":false,"reason":"draining"}`**. The flag works, and `server_shutdown` was
  logged after it.
* **Run 2**, tightened — poll a **fresh** connection every 5 ms starting at the signal:
  the very first sample, at **+6 ms, is `ECONNREFUSED`**. No 503 was ever observable on a
  new connection in that run.

That is the expected consequence of the design I asked for: `setDraining()` and
`server.close()` run in the same tick, so the listening socket stops accepting essentially
immediately. The flag is therefore observable only to a client already holding an
established (keep-alive) connection — which real load balancers do have, and for them it
works well and keeps working until the 10 s hard-kill, since `server.close()` leaves
established connections alone. It is **not** observable to a prober that opens a new
connection per poll, which is what `Dockerfile:93`'s `wget -qO- …/ready` and a default
kubelet HTTP probe both do: they will see connection-refused, never the 503.

So the code is right and the sentence around it is not. It appears four times:
`README.md:81` ("…so a load balancer stops routing here before requests start failing"),
`Dockerfile:85-89`, `docker-compose.yml:112-114`, and `server/routes/config.ts:116-123`.
LANE_STANDARD §2: a sentence that promises something must be true in every state that
renders it, and an operator sizing a deploy's drain behaviour from that sentence would be
wrong for the exact probe shape this repo's own Dockerfile ships.

## Verdict — REVISE (1 item)

1. **Required — `README.md:81`, `Dockerfile:85-89`, `docker-compose.yml:112-114`, `server/routes/config.ts:116-123` (and, if you take option B, `server.ts:62-64`).** Make the drain claim match measured behaviour. Either:
   * **A (documentation, ~4 sentences).** Say what it does: the flag flips before `server.close()`, so a client holding an **already-established (keep-alive) connection** — which is how real load balancers poll — sees `503 {ready:false, reason:"draining"}` on its next request and can stop routing while in-flight work finishes; a probe that opens a **new** connection per poll (the Dockerfile's own `wget`, a default kubelet HTTP probe) will get connection-refused instead, because `server.close()` stops accepting in the same tick (measured: fresh connection 6 ms after SIGTERM → `ECONNREFUSED`). Drop the unconditional "so a load balancer stops routing here before requests start failing".
   * **B (make the sentence true, ~6 lines).** Add a `SHUTDOWN_DRAIN_MS` env (default `0`, so today's shutdown timing is unchanged) and, when set, delay `server.close()` by that long after `setDraining()` inside `createShutdownHandler`; document it next to `/ready`; add a hardening test asserting `isDraining()` is true while `close` has not yet been called when the delay is set, and that the default still closes synchronously. Then the existing copy is accurate for both probe shapes.

   *Why:* measured above — the promise as written holds only for keep-alive pollers, and is
   false for the probe shape this repo's own `HEALTHCHECK` uses.

Nothing else blocks. Items 1–5 are verified working, the `.unref()` catch was a real bug
found and fixed inside the lane, and the rate-limit and absolute-form defects from the
first review are both closed and now pinned by tests that can fail. Re-check after the fix
is a diff read only — no probe needed for option A; for option B, re-run
`probe-drain-window.mjs` and expect 503s for `SHUTDOWN_DRAIN_MS` worth of samples before
`ECONNREFUSED`.

---

# Re-review #2 — amended commit `7511733f` (2026-09-05)

Read-only again; `git status --porcelain` empty before and after; no server I booted is
alive. Diff re-read in full (16 files, +1500/-44).

**Verdict: REVISE — one item.** The drain window works exactly as claimed and I measured it
on a real SIGTERM; the copy in all five places is now accurate for both probe shapes; the
scratch file is gone. But `docker-compose.yml` now sets `SHUTDOWN_DRAIN_MS: 35000` in a file
with no `stop_grace_period`, whose spec default is **10 s** — so every `docker compose
stop/down` would SIGKILL the container 25 s before `server.close()` is even called, losing
the SQLite WAL flush that the shutdown handler exists to perform. Two lines fix it.

## What I verified

**Scratch file — REMOVED.** `git diff --stat main..HEAD` is 16 files (was 17), and
`git ls-tree -r HEAD --name-only` shows no scratch/probe artifact from this lane anywhere in
the tree (the four `probe`-matching paths are pre-existing `docs/p1-benchmark/**` and
`tests/scripts/**` files, untouched by this commit). Working tree clean, so nothing was
merely untracked-and-hidden.

**Drain window on a real SIGTERM — REPRODUCED, both directions.** Production-mode keyless
boot, waited for warm, then SIGTERM while polling `/ready` on a **fresh connection every
100 ms** (`agent: false` — the `wget`/healthcheck shape):

| `SHUTDOWN_DRAIN_MS` | first sample | 503s seen | first refusal | exit |
|---|---|---|---|---|
| `3000` | +7 ms → `503 {"ready":false,"reason":"draining"}` | **29 consecutive**, last at +2924 ms | +3025 ms `ECONNREFUSED` | code 0 at +3063 ms |
| `0` (default) | +26 ms → `ECONNREFUSED` | **0** | +26 ms | code 0 at +80 ms |

That matches the lane's reported timeline and the configured window to within sampling
granularity, and confirms the default path is unchanged (refused within tens of ms, clean
exit 0). `server_shutdown` now also logs `drainMs`, which makes the window auditable from
the log alone (`{"msg":"server_shutdown","signal":"SIGTERM","exitCode":0,"drainMs":3000}`).

**Copy, all five places — no longer overclaims.** Each now names the fresh-connection case
explicitly and gives the measured number: `README.md` `SHUTDOWN_DRAIN_MS` row ("a fresh
connection attempted ~6ms after the signal was measured getting `ECONNREFUSED`, never
seeing the `503` at all") and the `GET /ready` row ("read that row before assuming this
protects a fresh-connection healthcheck by default"); `Dockerfile` ("with
SHUTDOWN_DRAIN_MS unset … rather than ever seeing the 503, since close() had already
stopped accepting by then"); `docker-compose.yml` ("with it at 0 (the bare-image default)
… a fresh-connection probe like this one gets refused instead of ever seeing 503");
`server/routes/config.ts` ("WHO ACTUALLY SEES THIS … measured directly"). `.env.example`
and `server.ts`'s `shutdownDrainMs()` doc carry the same qualification. My previous item 1
is closed.

**Implementation.** `server.ts:70-73` (`shutdownDrainMs()`, `Number.isFinite && > 0` guard,
read once at handler construction), `:117-146` (`createShutdownHandler(server, {drainMs,
scheduleClose})`; `setDraining()` still the first statement; `beginClose()` holds both
`server.close()` and the 10 s hard-kill so the hard kill counts from the delayed close;
`drainMs > 0` branches to the scheduler, `0` calls `beginClose()` inline). Tests: 4 in
`hardening.test.ts` — synchronous flip, crash path, injected scheduler (asserts
`closeCalled === false` while `isDraining() === true` and that the scheduler received
`5000`), and `drainMs: 0` asserting the scheduler is *never consulted* and close runs in the
same tick. 20/20.

**Gates re-run by me:** `hardening` 20/20, `ready` 10/10, `doctor-pool-warm-state` 11/11,
`request-logger-prefix` 4/4, `server-prewarm-before-listen` 6/6, `route-capabilities` 6/6
(all exit 0); `lint` 0, `check-docs` 0, `check-no-console` 0, `honesty-audit` 0,
`check-scoring-receipt main..HEAD` 0. Full suite and browser battery not re-run.

## The one remaining item

`docker-compose.yml:79` sets `SHUTDOWN_DRAIN_MS: ${SHUTDOWN_DRAIN_MS:-35000}`, and
`grep -n "stop_grace_period\|stop_signal" docker-compose.yml Dockerfile README.md` returns
**nothing**. The Compose spec's default `stop_grace_period` is **10 s**: SIGTERM, wait 10 s,
SIGKILL. With a 35 s drain, at the 10 s mark `server.close()` has not been called yet, so on
every `docker compose stop` / `down` / `restart` the container is hard-killed and:

* the close callback never runs, so the `for (const { stage } of sessions.values())
  stage.close()` WAL flush — the stated reason the graceful handler exists (`server.ts:120-124`)
  — never happens, on a service whose compose file mounts a named volume for session data;
* in-flight requests are cut at 10 s instead of draining;
* the process always exits 137, so the `exitCode` distinction the hard-kill comment is
  careful to preserve ("drained cleanly" vs "had to be killed") is lost for every shutdown.

Before this commit, compose users got SIGTERM → close → flush → exit 0 in milliseconds. The
same trap is one step worse than it looks for the generic advice in `README.md`'s
`SHUTDOWN_DRAIN_MS` row and `.env.example`: the recommended `35000` also exceeds
Kubernetes' default `terminationGracePeriodSeconds` of 30 s, so a k8s user following the
row verbatim gets the identical SIGKILL-mid-drain behaviour. Worst-case total is
`drainMs + 10 s` (the hard-kill now counts from the delayed close), so the grace period has
to cover that, not just the drain.

I could not measure this one: there is a `docker` binary in this sandbox but no daemon, so
this is read from the Compose spec and the file's own contents, not from a container run.

## Verdict — REVISE (1 item)

1. **Required — `docker-compose.yml` (service `storymachine`), plus one sentence in `README.md`'s `SHUTDOWN_DRAIN_MS` row and the matching `.env.example` block.**
   * Add `stop_grace_period: 50s` to the service (35 s drain + the 10 s hard-kill that now counts from the delayed close + margin), with a comment tying it to `SHUTDOWN_DRAIN_MS` above it: raise both together, and never let `SHUTDOWN_DRAIN_MS` approach `stop_grace_period`.
   * In `README.md` and `.env.example`, state the constraint generally: this value must sit **below** your orchestrator's termination grace period — Compose/`docker stop` default 10 s, Kubernetes `terminationGracePeriodSeconds` default 30 s — because the runtime SIGKILLs the process at that deadline whether or not the drain finished, and the SQLite WAL flush in the shutdown callback never runs if it does.
   *Why:* as shipped, `docker compose stop` on this file SIGKILLs the container 25 s before `server.close()` is called, turning every clean shutdown into a hard kill and dropping the session-DB flush the handler exists to perform — a regression this commit introduces in the file that carries it.

Nothing else blocks. The drain mechanism, the measured claims, the copy in all five places,
the removed scratch file, and every gate I ran are good; on that one grace-period fix this
is a merge.
