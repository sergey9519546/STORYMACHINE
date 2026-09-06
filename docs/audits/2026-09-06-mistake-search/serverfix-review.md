# Independent review — server hardening + cue-guard round 7 (`f450b5d7`)

**Reviewer:** independent (did not build this change; I am the reviewer who raised the
five earlier cue-guard rounds).
**Worktree:** `/home/user/STORYMACHINE/.claude/worktrees/agent-a3d45f541d681765f`
**Diff:** `git diff 802f1c16..HEAD` — one commit, 18 files, +948/−51.
**Worktree state at the end:** `git status --porcelain` empty. Every server I started is killed
(ports 39201/39203/39205/39207/39209/39211/39213/39215/39217).
**Budget:** no full `npm test`, no browser battery — I ran the seven touched test files, my own
probes, and live servers. Box idle (load ≈0.4–1.0), so timings are clean.

**Verdict: MERGE**, with two non-blocking observations recorded in §7.

---

## 1. Brief-vs-diff table

| # | Brief item | Status | Evidence |
|---|---|---|---|
| 1 | **A1 BLOCKER** — rebuild the context check so it cannot under-count; §A1 payload rejected <100 ms; §A5 re-measured; fixture/feature/two-hander acceptances intact; add the shape to both guard test files and fuzz-routes | **DONE** | `server/lib/validation.ts:45` imports `isCharacterCue`; the blank-gap branch is now `nextLineIsDialogue = j < lines.length && isCharacterCue(line)` (keyed on the *candidate*, not the next line). §A1 payload rejects in **17 ms** in-process (§2). Both guard files carry the shape (`fountain-shape-guard-cue-parity.test.ts` 269 tests, `…-bypass.test.ts` 54 tests, both pass); `scripts/fuzz-routes.mjs:404` adds the ROUND-7 case. |
| 1a | Brief suggested keying on `!isCharacterCue(lines[j])` (the *next* line) | **SILENTLY CHANGED — and correct** | The lane keyed on `isCharacterCue(line)` (the candidate) instead. I verified this is the *better* fix: `normalizeScreenplay` (`screenplay-normalizer.ts:137-196`) emits a cue **iff** `isCharacterCue(line)` is true for that line, and it is the only emitter that produces a non-blank-adjacent line, so the candidate's own shape is exactly the pipeline's decision. The report states the change and why; not a silent narrowing. |
| 2 | **A3** — strip boneyards before counting (legit commented cast list accepted) **and** bound boneyard cost | **DONE** | `validation.ts:540-575`: `inBoneyard` toggle mirroring `parseFountain`, plus `MAX_FOUNTAIN_BONEYARD_DISTINCT_CUE_LINES`/`_WEIGHT` (`:463-464`). Legit 50-name commented cast list **ACCEPTED**; toggle agrees with `parseFountain` on 13/13 tricky inputs (§4). |
| 3 | **B1 HIGH** — crash paths skip the drain, still flip `/ready`; SIGTERM/SIGINT keep it; test with an injected crash | **DONE** | `server.ts:191` `effectiveDrainMs = exitCode === 0 ? drainMs : 0`. Verified on a **real server** with a genuinely injected `uncaughtException` (§5). |
| 4 | **B2** late warm settlement; **B3** second signal closes now; **B5** `${STOP_GRACE_PERIOD:-50s}` + README | **DONE** | `doctor-pool.ts:526-533` (`completedAfterDeadline`, `settledAfterTimeoutMs`, 13/13 tests); `server.ts:127-134,164-171` (`closeStarted`/`server_shutdown_forced`) verified live (§5); `docker-compose.yml:66` `stop_grace_period: ${STOP_GRACE_PERIOD:-50s}` with the tying comment, README §env documents it. |
| 5 | **C2** bare mount root; **C3** `/%zz` → 400; **C4** collab upgrade logged | **DONE** | `request-logger.ts:77` `loggedPath()`; `app.ts:383-389` `client_error` + `{"error":"Malformed request"}`; `yjs-server.ts:356` `collab_upgrade` with `hashRoomId` (`collab-rooms.ts:94`). All three verified live against a **main baseline** (§6). |
| — | No scoring-path edits; no `console.*` | **DONE** | `check-scoring-receipt main..HEAD` → "no scoring-path files changed", exit 0. `check-no-console` exit 0. `pure-core-boundary.test.ts` 6/6 — the new `validation.ts → screenplay-normalizer.ts` edge does not widen doctor.ts's graph, and the normalizer imports only the leaf `src/lib/fountain.ts` (`:25`), so no cycle and no TDZ hazard. |

## 2. §A1 — the bypass is closed, and closed on the right predicate

The finding's own invariant — *if `normalizeScreenplay` + `parseFountain` produce N `character`
blocks, the guard must count at least N cue occurrences* — is the right property, so I implemented it
as a harness (`scratchpad/reviews/invariant.mjs`) and ran it over the A/B control plus every way I
could think of to defeat `isCharacterCue`'s own 4-word / 30-char limits:

| shape (200 distinct × 6,000 occurrences) | guard occurrences | pipeline `character` blocks | verdict |
|---|---|---|---|
| **§A1 CAPS dialogue (the bypass)** | **6,000** | 6,000 | **REJECT** |
| §A1 mixed-case dialogue (control) | 6,000 | 6,000 | REJECT |
| cue = 5 words (over the 4-word cap) | 0 | **0** | ACCEPT |
| cue = 31+ chars (over the 30-char cap) | 0 | **0** | ACCEPT |
| cue exactly 30 chars | 6,000 | 6,000 | REJECT |
| cue exactly 4 words | 6,000 | 6,000 | REJECT |
| cue with `^` caret | 0 | **0** | ACCEPT |
| cue with `(V.O.)` / `(CONT'D)` | 6,000 | 6,000 | REJECT |
| cue with trailing spaces | 6,000 | 6,000 | REJECT |
| Cyrillic / accented Latin / `#` cues | 6,000 | 6,000 | REJECT |
| §A1 shape at gap = 0, 1, 2, 3 | 6,000 | 6,000 | REJECT |

**Zero invariant violations.** The three ACCEPTed rows produce zero `character` blocks, and I timed
them at 12,000 occurrences to confirm they are not cost vectors anyway:

```
cue = 5 words     chars=641,417  ACCEPT  runScriptDoctor 2,109 ms
cue = 31+ chars   chars=797,417  ACCEPT  runScriptDoctor 1,893 ms
cue with caret ^  chars=497,417  ACCEPT  runScriptDoctor 2,164 ms
A1 CAPS control   chars=629,417  REJECT in 17 ms
```

## 3. Regression sweep — every earlier round still holds, nothing legitimate newly rejected

`scratchpad/reviews/regress.mjs`, on this tree:

* the RR#3/#4 exploit at **gap 0,1,2,3,4,5** → REJECT at every width;
* whitespace-only gaps (tab, NBSP, mixed tab+NBSP, two consecutive whitespace lines) → REJECT;
* caps-heavy action feature, caps-heavy **+ `CUT TO:`** after every scene, and the legitimate
  double-spaced two-hander → **ACCEPTED at gaps 0, 1 and 2** (nine cases);
* all **54** tracked `.fountain` fixtures → **0 rejected**;
* legitimate 50-name commented-out cast list inside `/* … */` → **ACCEPTED** (the A3 false-positive
  the finding named).

## 4. §A3 — the boneyard toggle agrees with `parseFountain` exactly

`scratchpad/reviews/mask2.mjs` compares the guard's `inBoneyard` state to `parseFountain`'s
per source line (ignoring blanks, which both skip, and the synthetic unclosed-boneyard block the
parser appends at EOF):

```
simple · multiline · same-line open+close · nested /* · unterminated · close only ·
marker inside dialogue · open mid-line · blank inside · close-then-reopen · indented /* ·
"*/ text /*" same line · tab-indented close        ->  13/13 agree, 0 disagreements
```

## 5. §B1 / §B3 — verified on real servers, not only in unit tests

Injected a genuine `uncaughtException` into a live server via a `--import` preload (no repo edit),
with `SHUTDOWN_DRAIN_MS=20000`:

```
B1  uncaughtException, SHUTDOWN_DRAIN_MS=20000
    log: server_shutdown  signal=uncaughtException exitCode=1 drainMs=0
    /ready -> HTTP 200 … 200 at +1,591ms, ECONNREFUSED at +2,093ms
    ==> listener CLOSED within ~500 ms of the crash (was: 20 s of serving)

B3  control — single SIGTERM, same drain setting
    log: server_shutdown  signal=SIGTERM exitCode=0 drainMs=20000
    /ready -> 503 draining from +2,090ms, still ACCEPTING, closed at +22,166ms

B3  double SIGTERM (second at +5 s)
    log: server_shutdown (drainMs 20000)  then  server_shutdown_forced
    /ready -> 503 from +2,084ms, ECONNREFUSED at +5,100ms
    ==> the second signal skipped the remaining ~15 s, exactly as claimed
```

The asymmetry the brief asked for is real and measurable: crash closes in ~0.5 s, SIGTERM drains for
the full window, second SIGTERM forces.

## 6. §C2 / §C3 / §C4 — before/after against a main baseline

I ran the identical raw requests against a server booted from `main` (802f1c16) and from the lane.

| probe | main (802f1c16) | lane (`f450b5d7`) |
|---|---|---|
| `GET /api` logged path | `"/api/"` | **`"/api"`** |
| `GET /%zz` (NODE_ENV=production) | **HTTP 500**, `unhandled_error` (URIError stack) | **HTTP 400** `{"error":"Malformed request"}`, `client_error` at **warn**, `status:400` |
| collab upgrade | no log line | `collab_upgrade` with `room` = `hashRoomId(...)` (token never logged), covered by `tests/collab/websocket.test.ts` 10/10 |

C3 only manifests under `NODE_ENV=production` (in dev, Vite's middleware answers first and both trees
return 404) — worth knowing, and it does not weaken the fix.

Touched test files, all run by me, all exit 0:
`cue-parity 269/269` · `cue-bypass 54/54` · `hardening 24/24` · `ready 10/10` ·
`request-logger-prefix 5/5` · `doctor-pool-warm-state 13/13` · `collab/websocket 10/10`.

## 7. Two non-blocking observations

**(a) The A1 invariant is violated inside a boneyard — but it is not a cost vector.**
`normalizeScreenplay` has no boneyard awareness: it strips blank lines and joins paragraphs, which
destroys the `/*` marker, so boneyard content re-enters the document it normalizes. Wrapping the
§A1 payload in `/* … */` gives:

```
254,788 chars   guard ACCEPT in 13 ms   character blocks after normalize+parse = 6,002 (202 distinct)
                runScriptDoctor = 1,011 ms
```

The guard's main counters saw ~2 occurrences while the normalized pipeline produced 6,002 — a genuine
violation of the invariant §A1 proposes. It is **not** exploitable, because the O(n²) cost lives on
the raw parse (where the boneyard *is* honoured), not the normalized one. Pushed to the boneyard
budget's own edge (distinct=200 × 45,000 occurrences, weight 9.0M, 470,338 chars, 45,002 character
blocks after normalization): guard ACCEPT in 23 ms, **`runScriptDoctor` 5,641 ms**. Worth recording
because the boneyard branch deliberately has **no frequent-cue-line bound** (only distinct + weight),
so it is the loosest of the four budgets; 5.6 s is the price and it is acceptable today. If the
analyzer ever starts scoring the normalized text on the hot path, this becomes a live bypass.

**(b) Pre-existing, not this lane's: `GET /%zz` in dev logs `"path":"undefined/%zz"`.**
I checked it against main and got the identical string, so `loggedPath()` did not introduce it —
`req.baseUrl` is `undefined` on that path in dev mode and both the old concatenation and the new
helper propagate it. It is in the same family as C1/C2 (the logger inventing a path) and leaks the
literal text `undefined` into ops logs. Out of scope for this brief; worth a follow-up.

## 8. Worst legal request now

Searched across the shapes the three main bounds plus the new boneyard bounds admit:

| shape | chars | `runScriptDoctor` |
|---|---|---|
| cue = 5 words, 12,000 occurrences | 641,417 | 2,109 ms |
| cue = 31+ chars, 12,000 occurrences | 797,417 | 1,893 ms |
| cue with `^`, 12,000 occurrences | 497,417 | 2,164 ms |
| **boneyard budget at its edge (200 × 45,000)** | **470,338** | **5,641 ms** |

**Worst legal request I can construct: ≈5.6 s** — against 115.7 s for the §A1 payload before this
change, and a request that never returned when this review series started.

## 9. Verdict

**MERGE.**

Every numbered brief item is done, none narrowed. The one deviation from the brief's suggested
implementation (keying on the candidate rather than the next line) is a strictly better fix, is
stated in the report, and I verified it against the pipeline's own emitter. The A1 invariant holds
over every shape I could build against `isCharacterCue`'s limits; the boneyard toggle matches
`parseFountain` 13/13; B1 and B3 behave correctly on real servers under a real injected crash and a
real double signal; C2/C3/C4 each show a real before/after against a main baseline; and no
legitimate script — 54 fixtures, caps-heavy, caps-heavy-with-transitions, two-hander, commented cast
list, at three gap widths — is newly rejected.

The two items in §7 are recorded for the log, not for this merge: (a) is measured at 5.6 s and
bounded, (b) is pre-existing on main.

Not run in this pass, per the budget instruction, and stated so the merge record is honest: full
`npm test`, the browser battery, and `fuzz-routes` — the orchestrator runs those at merge, so the
lane's fuzz additions (`scripts/fuzz-routes.mjs:404,430`) are verified by reading, not execution.
