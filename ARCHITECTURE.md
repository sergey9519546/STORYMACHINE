# STORYMACHINE — Architecture

Orientation for engineers. Setup lives in `README.md`. Product constitution lives
in `NORTH_STAR.md`. Conventions and the quality bar live in `CLAUDE.md`. This
file is the system map: what the product is, how requests flow, what is trusted,
and what is deliberately out of scope for the public front door.

---

## 1. Product architecture (what ships first)

**Primary product surface (front door):** Script IDE + Script Doctor.

Job:

> Help a screenwriter import an existing draft, receive evidence-linked findings,
> choose a repair, and re-verify the draft with a reproducible receipt.

**Secondary / experimental surface:** OASIS Story Machine (multi-agent simulation,
NVM research panels). Reachable only behind the Labs flag
(`src/lib/feature-flags.ts`, `sm_labs_enabled`, default OFF) — not the default
activation path.

**Organizing principle:** a **deterministic core** inside a **generative shell**.

| Layer | Owns | Trust contract |
|---|---|---|
| Deterministic core | Doctor, diagnose, coverage, What-If, room receipts, content hashes | Pure, keyless, reproducible. No LLM, no wall clock, no `Math.random()` on the diagnostic path. |
| Generative shell | Copilot, rewrites, simulation dialogue, deep-read, converge candidates | Opt-in, labeled, `aiLimiter`-gated. Degrades honestly when keyless — never a silent quality drop, never a 500. |

The server boots **without** an AI key on purpose (`server.ts` → analysis-only mode).
Keyless analysis is the product’s front door, not a degraded afterthought.

**The boundary between those two layers is a module boundary, and a test says so.**
Until 2026-09-03 the paragraph above was only prose: the static import graph
rooted at `server/nvm/analyze/doctor.ts` reached `server/engine/ai.ts` (and its
provider/HTTP stack) and `server/engine/Stage.ts` (better-sqlite3), so every
doctor worker thread loaded an AI transport and a native database binding in
order to compute a deterministic score — the 2026-09-02 retrospective’s finding
#5. `tests/core/pure-core-boundary.test.ts` now enforces the claim four ways:

- nothing under `server/engine/ai.ts`, `server/engine/Stage.ts`,
  `server/lib/ai-providers/**`, `server/monitoring/**` or `server/routes/**` may
  be reachable from `doctor.ts`;
- no reachable file may import `better-sqlite3`, `express`, `node:http(s)` or `ws`;
- the set of reachable files outside `server/nvm/analyze/**` and
  `server/nvm/revision/**` must equal `CORE_ALLOWLIST` in that test — 21 entries
  today, each with a one-line justification naming the number it helps compute,
  so a new arrival cannot slip in unexplained;
- and a worker thread running the doctor is observed with a `node:module` load
  hook and a patched `process.dlopen`, so a violation is caught even when it
  arrives by a route the static walk cannot see.

Two mechanics are load-bearing when cutting an edge. `scripts/lib/import-graph.mjs`
follows **type-only** imports and **dynamic** `import()` deliberately (the receipt
gate depends on seeing both), so neither `import type` nor `await import()` hides a
dependency: split the module (`screenplay/compile-types.ts`, `state/from-stage.ts`,
`lib/request-logger.ts`) or invert it behind a registry (`lib/llm-port.ts`,
`revision/rewrite-llm.ts`), where the adapter lives outside the core and plugs
itself in. The allowlist is also the receipt gate’s scoring-path list
(`scripts/check-scoring-receipt.mjs`), so every entry costs a measurement receipt
on every change — keeping it short is not tidiness, it is the cost model.

---

## 2. Stack

| Concern | Choice |
|---|---|
| Runtime | Node >=22.13.0 \|\| >=24 (ESM, `tsx` / `--experimental-strip-types`) |
| HTTP | Express 4 |
| Persistence | better-sqlite3, one DB per session |
| Collab | `ws` + Yjs |
| Frontend | React 19, Vite 6, Tailwind 4, CodeMirror 6 |
| Validation | zod on every route body |
| AI | Gemini default; OpenAI-compatible fallback; server-side only |

---

## 3. Request flow

```
Browser (React SPA — same-origin fetch / SSE / WebSocket)
  │
  ├─ /api/* ──► server/app.ts
  │                middleware: JSON, request log (pathname only),
  │                security headers, CSP (prod), rate limits
  │                │
  │                ├─ routes/config.ts     health, AI config, session delete/rotate, simulation observation export, retired JSON import
  │                ├─ routes/scriptide.ts  doctor, doctor/stream (SSE), diagnose, copilot,
  │                │                        fix-and-verify (generated | writer-supplied)
  │                ├─ routes/export.ts     coverage HTML, FDX/DOCX/print
  │                ├─ routes/game.ts       OASIS simulation (init/turn/room/interview)
  │                ├─ routes/events.ts     closed-vocabulary instrumentation sink + /api/events/summary
  │                ├─ routes/nvm.ts        NVM research engine (~50 routes)
  │                └─ routes/collab.ts     short-lived Yjs room tokens
  │                (also mounted: ai-providers.ts, live.ts, critics.ts)
  │
  └─ /collab/:room ──► server/collab/yjs-server.ts (token-gated Yjs sync)
```

### Session identity

Every request resolves a per-session `Stage` via `getOrCreateSession()`
(`server/lib/session-store.ts`).

Precedence:

1. Explicit `sessionId` query/body — malformed → hard 400
2. `X-Session-Id` header — charset-validated path safety, **not authentication**
3. `'default'` fallback

This is a **bearer-capability** model. Possession of the id is authorization.
See `docs/AUTH.md` for guarantees and non-guarantees.

### Rate limits

| Limiter | Budget | Use |
|---|---|---|
| `gameLimiter` | 120/min/IP | CPU-only routes |
| `aiLimiter` | 20/min/IP | LLM-capable routes |
| `heavyBodyLimiter` | 10/min/IP | large uploads (e.g. PDF doctor) |

Behind a reverse proxy, set `TRUST_PROXY` or all clients collapse onto one IP.

Rate limits are per-IP and per-minute; one cap is instead process-wide and
concurrent: `MAX_ROOMS` (`server/lib/session-store.ts`, default 50) bounds
simultaneously reserved room simulations across every session, answering `429`
at the boundary rather than queueing without limit. It is independent of the
per-session, per-location duplicate-reservation lock, which still returns `409`.

---

## 4. Script Doctor pipeline

```
Fountain / FDX / PDF
  → normalize + parse (fountain-analyzer)
  → ScreenplaySceneRecord[] + StructureState
  → 14 diagnose-only revision passes (Promise.all when diagnose-only)
  → aggregateReport (health, dimensions, verdict, clusters, contentHash)
  → ScriptDoctorReport
```

Passes (execution order):

```
structure → causality → intention → belief → conflict → character-arc →
dialogue → rhythm → pacing → originality → payoff → voice → theme →
relationship-arc
```

### Execution off the main thread

`runScriptDoctor` is pure, deterministic CPU work with no I/O to yield on, so
running it inline blocks every other request for the duration. It runs instead
on a small `node:worker_threads` pool (`server/nvm/analyze/doctor-pool.ts` +
`doctor-worker.ts`): 1–2 threads, FIFO dispatch, the LRU cache held on the
coordinator (never per-worker), `AbortSignal` cancellation that terminates the
worker outright, and a permanent in-process fallback if workers cannot run in
the environment. `DOCTOR_WORKER_POOL=off` exercises that fallback by hand;
`DOCTOR_WORKER_POOL_SIZE` overrides the size (capped at 4). Deep read stays
in-process on purpose — it is I/O-bound and its budget/abort machinery is
main-thread state.

### Streaming progress

`POST /api/scriptide/doctor/stream` is the SSE sibling of `/api/scriptide/doctor`
— same schema, same limiter, same worker pool, same report shape — emitting
per-stage and per-pass progress frames so the client can show which pass is
running and offer a real Cancel. Cancellation rides the existing
res-close → `AbortSignal` → worker-terminate path; no second mechanism. The
progress hooks are observational only: the report is byte-identical with and
without them. `src/lib/doctor-stream.ts` is the shared browser client. The
deep-read and PDF routes are deliberately one-shot.

### Scoring trust contract

| Claim | Status |
|---|---|
| Same text → same `contentHash` and deterministic findings | Supported |
| Health is opportunity-normalized and length-checked | Supported by regression tests |
| Health density penalty is continuous and monotonic | Supported (P0.1 continuous join at density=1) |
| Percentiles are industry-representative | No — internal calibration corpus only |
| Human agreement / PMF | Unknown — not validated |
| `draftRank` (2026-09-04) ranks against the reference set | No — it ranks against the writer's OWN saved snapshots of this one script (`src/lib/snapshot-trend.ts`'s `computeDraftRank`); an additive field alongside `healthPercentile`, computed client-side and passed through `POST /api/export/coverage-letter` as display copy, never recomputed by `doctor.ts` |

### Cross-surface consistency (honesty-audit matrix, 2026-09-04)

An adversarial audit drove every surface that shows `health`/`healthPercentile`/
`structuralSignals` and found the numbers that WERE shown agreed everywhere,
but three surfaces were missing readings a sibling already showed. Fixed
additively — no surface lost a reading, and every number still traces to
exactly one computation (`doctor.ts` for health/percentile,
`src/lib/snapshot-trend.ts`'s `computeDraftRank` for draft rank, never a
second implementation):

| Surface | Shape signals (`structuralSignals`) | Draft rank | Health percentile |
|---|---|---|---|
| `ScriptDoctorPanel.tsx` (in-app) | yes | yes | yes |
| Exported coverage HTML (`POST /api/export/coverage`, `server/lib/coverage-html.ts`) | yes (strip + aggregates) | yes (`CoverageHtmlOptions.draftRank`, 2026-09-04) | yes (`buildHealthPercentileLine`, 2026-09-04) |
| Coverage letter (`POST /api/export/coverage-letter`, `server/lib/coverage-letter.ts`) | yes | yes | yes |
| Snapshot trend (Versions, `SnapshotManager.tsx` + `snapshot-trend.ts`) | yes (2 aggregates) | yes (`snapshotDraftRanks`, 2026-09-04) | yes (`Snapshot.healthPercentile`, 2026-09-04) |
| `POST /api/export/verify` | yes (`recomputed.structuralSignals`, 2026-09-04 — informational only, never part of the match/mismatch decision) | n/a (no snapshot history at this stateless route) | yes (`recomputed.healthPercentile`) |
| `POST /api/export/slate` (`server/lib/slate.ts`, `SlatePanel.tsx`) | yes (per row, 2026-09-04) | n/a (ranking is cross-script by health, not cross-draft) | yes |

`draftRank` is computed exactly once per surface invocation, client-side, by
`computeDraftRank`/`snapshotDraftRanks` — every server-rendered surface
(coverage HTML, coverage letter) receives it as caller-supplied display copy
in the request body (bounds-checked by `DraftRankSchema` in
`server/lib/validation.ts`), the same trust posture as `title`/`author`; the
server never recomputes or verifies it as a score claim.

### Incomplete analysis (P0.3)

If any revision pass throws:

- pipeline records `failedPasses`
- report sets `analysisComplete: false`
- verdict, dimensions, percentiles are withheld
- client shows an incomplete banner, not a real score

A failed detector must never present as “zero issues found.”

### Truncation (P0.2)

`ANALYZER_SCENE_CEILING` = 400 (`fountain-analyzer.ts`; lowered from 1000 in
W1, 2026-08-21 — honest headroom above the 292-scene longest real feature in
the corpus). Scripts above the ceiling:

- analyze only the first 400 scenes
- score density uses **analyzed** word count only
- report surfaces a truncation notice

Scripts at/under the ceiling keep full-fountain word counts (calibration compatibility).

---

## 5. NVM (research engine)

`server/nvm/` is a large machine-checkable narrative engine (~27 subsystems):
ops, state, IR, screenplay, analyze, revision, proof, quality, valuation,
converge, generate, twin, room, drama, author, selfplay, branch, bridge, etc.

**Architectural rule:** NVM capabilities may power the doctor and advanced
panels, but they do not redefine the product wedge. New NVM surface area does
not ship to the front door without a validated user need.

Converge never auto-commits: the writer chooses; `/converge/commit` re-proves
Tier-1 invariants against current session state.

---

## 6. Frontend topology

```
App
 ├─ StartScreen          sample / open file / editor / wizard / OASIS entry
 ├─ ScriptIDE            primary product (write / coverage / ship task slots)
 ├─ StoryMachine         experimental simulation + NVM panels (Labs-gated)
 └─ hash routes          #verify (VerifyReport) · #privacy (PrivacyPage) ·
                         #design-preview — reachable without creating a script
```

View state persists in `localStorage` (`sm_app_view_v1`) so refresh resumes the
editor rather than dumping users back into the wizard.

**Draft persistence** is localStorage-first with an IndexedDB mirror
(`src/lib/scriptide-idb-store.ts`): every export is promise-based and never
rejects, so a browser with IndexedDB blocked or unavailable degrades to "no
mirror" rather than losing draft persistence. The mirror wins on restore only
when strictly newer than localStorage — the localStorage-quota-failure
recovery case. Settings → Session offers a confirm-gated "delete everything"
that wipes both stores and calls `POST /api/session/delete`; `#privacy` states
what stays in the browser, what the server holds, and what leaves.

**Fix & verify / Verify my rewrite** (`src/components/scriptide/ScriptDoctorPanel.tsx`,
`POST /api/scriptide/fix`). One route, two ways to obtain a candidate draft and
exactly one way to verify it. **Generated** (`span` + `issues`) asks the model
for a span rewrite — needs a key, Labs-gated, `usedLLM: true`.
**Writer-supplied** (`candidateFountain`, 2026-09-04) takes the writer's own
rewrite straight out of the editor, reaches no model at all, and answers
`usedLLM: false, source: 'writer'`; it is the version a keyless deploy has, and
it is NOT Labs-gated (see `docs/DECISION_LOG.md` Decision #3's 2026-09-04
amendment — that decision gates unevaluated generation, and this path generates
nothing). The writer path runs both whole-document analyses through the same
pooled path `/api/scriptide/doctor` uses (`runScriptDoctorForRequest`:
off-thread, client-disconnect aware, sharing the coordinator's content-hash
LRU, so the baseline the panel just paid for is free); the generated path still
analyses in process inside `fixAndVerify` (`server/nvm/analyze/fix.ts`) — legal
there, since `tests/core/doctor-pool-call-sites.test.ts` polices route files,
but not the same execution path and not described as one. Both build their
receipt with `server/nvm/analyze/fix-delta.ts` — one implementation of health/verdict
movement, whole-document `cleared`/`introduced` (multiset, matched by stable
issue id), and dual `contentHash`es so anyone can re-POST either text to
`/doctor` and get the same numbers. The descriptive shape-&-rhythm aggregates
ride alongside under the same "not part of the score" labelling used everywhere
else; when no candidate exists at all, the baseline reading still goes out on
its own rather than nothing.

**What-If Lab -> Script Doctor** (`src/components/WhatIfPanel.tsx`, Labs-gated
inside StoryMachine). A What-If branch is a `StoryOp[]` — semantic story moves
with no screenplay text anywhere in the 14-kind union — so until 2026-09-04 a
branch could never carry a health, verdict or grade. `POST
/api/nvm/whatif/doctor` closes that: `server/nvm/whatif/materialize.ts`
compiles the base timeline, the counterfactual timeline and each branch into
Fountain through the existing `project(canon, 'fountain')` projector
(`server/nvm/project/index.ts`), using the same graph cut `whatif/explore.ts`
derives its consequences from, then scores each draft through the same pooled
doctor and content-hash LRU `POST /api/scriptide/doctor` uses. Deterministic
and keyless end to end — no LLM, no `randomUUID`, no wall-clock read — so the
same intervention always compiles to byte-identical text and re-scores nothing.
The panel renders the doctor's own health/verdict/grade plus the delta against
the base, alongside the two descriptive structural aggregates under the same
"descriptive, not part of the score" labelling ScriptDoctorPanel's Shape &
Rhythm section uses; a variant the route could not analyze whole shows no score
at all rather than a plausible-looking zero. "Promote this branch" hands that
text to `ScriptIDE`, which snapshots the current draft first (the undo path)
and then saves the promoted script as its own snapshot carrying health and both
aggregates, through the one snapshot mechanism every other version uses.

**Command palette** (Cmd/Ctrl+K): `src/components/scriptide/CommandPalette.tsx`
over the DOM-free registry and filter logic in `src/lib/command-palette.ts`.
Every action's `run` is the same named callback the visible button already
calls — the palette is a second entry point onto real dispatch, never a
parallel implementation.

Build note: ScriptIDE is the largest client chunk; advanced panels should stay
lazy-loaded. Avoid growing the critical first-value path.

---

## 7. Deployment topology

```
Docker (non-root) → Express on :3000 → /health
                  → data/sessions/*.db (optional volume)
                  → optional reverse proxy (set TRUST_PROXY)
```

Release artifacts are versioned images (`/health` reports `version` + `commit`).
The current version is `1.0.0-rc.1` (`package.json`) — a release candidate,
not `1.0.0`, because the remaining 1.0 items are owner-side validation, not
code. See README's "Releases" section.

Backups use SQLite online backup (`server/lib/backup.ts`), not a raw file copy
of a live WAL. Two ways to schedule the identical logic, reading the identical
`BACKUP_DIR` / `BACKUP_RETENTION_DAYS` / `BACKUP_RETENTION_KEEP` config: an
operator's own cron running `npm run backup`, or `BACKUP_INTERVAL_HOURS` (S1,
2026-08-21), an opt-in `unref()`'d in-process timer in `server.ts` for
deployments with no host cron. Off by default, and skipped with a logged
warning in `:memory:` mode.

The restore path exists as code, not just as a documented `cp`:
`restoreSession()` / `npm run restore-session <sessionId> <snapshotFile>`
verifies the snapshot's SQLite integrity before publishing it and refuses to
overwrite a session database still present on disk. A backup that has never
been restored is not a backup — `tests/core/backup-restore-drill.test.ts`
backs up a real session, destroys it, restores it, and asserts the round trip.

**Fit today**

| Mode | Fit |
|---|---|
| Local / single-user / design-partner alpha | Yes |
| Public multi-user SaaS | No — no accounts, no revocation, bearer session takeover risk |

---

## 8. Security boundaries (must hold)

1. API keys live only in `.env`; clients get boolean readiness flags only.
2. All AI calls are server-side.
3. Every route is rate-limited and zod-validated.
4. No new `console.*` under `server/**` — use `server/lib/logger.ts`.
5. Request logs use `req.path` (no query string) so SSE `?sessionId=` never leaks into logs.
6. Production CSP is strict; style `'unsafe-inline'` is required by Motion/CodeMirror.

---

## 9. Testing topology

| Layer | What it proves |
|---|---|
| Pass fire/no-fire suites | Individual rules trigger and near-miss correctly |
| Calibration / discrimination | Internal ordering + length invariants |
| Route tests | Validation, limiters, keyless shapes |
| E2E journeys (API-level) | Keyless product paths without a browser |
| Real-corpus harness | Env-gated structural regression on real scripts |

Browser-level proof runs **in CI** as of 2026-09-02 (`playwright` is a pinned
devDependency; the `browser` job in `.github/workflows/ci.yml` installs
Chromium and runs `npm run verify:browser`, and `publish` in `release.yml`
blocks on the same job). The seven suites are `scripts/smoke-p0-live-flow.mjs`,
`verify-p2-p3-surfaces.mjs` (surface/Labs gating + a static dead-UI tripwire),
`verify-focus-traps.mjs`, `verify-ui-polish-affordances.mjs`,
`verify-e4-local-safety-net.mjs`, `verify-e5-command-palette.mjs`, and
`verify-a11y.mjs` (2026-09-04 — the systematic accessibility pass: an
axe-core sweep of every primary surface in both themes, gated on zero
serious/critical violations outside one named, deliberately-unfixed
exception, plus an explicitly-asserted keyboard-only run of the primary
journey); their shared boot/launch/console-capture/report-wait machinery
lives once in `scripts/lib/browser-verify.mjs`. `scripts/load-test-doctor.mjs`
(concurrent doctor load) stays on demand — it is a measurement, not a
pass/fail gate.

Until 2026-09-02 those suites ran on exactly one developer's machine, and this
section said so. That was a self-imposed limitation, not a fact about CI, and
it had a measured cost: the SSE migration broke the report-render wait in
three of them and an ARIA role change broke a selector in a fourth, all
unnoticed for days because nothing ran them.

**Not yet proven by default CI:** human agreement with scores, public
multi-tenant security.

---

## 10. Change policy

Before expanding scope:

1. Prefer demand-validated product work over new detectors or panels.
2. Any scoring change requires positive/negative fixtures **and** discrimination
   evidence; synthetic fire/no-fire alone is insufficient.
3. Incomplete analysis, truncation, and keyless degradation must stay honest.
4. Do not author bulk rule-matrix waves — coverage is saturated; more rules are
   maintenance cost unless they add measured signal.

---

## 11. Key entrypoints

| Path | Role |
|---|---|
| `server.ts` | Boot, keyless warn, shutdown, crash handlers |
| `server/app.ts` | Express app, security headers, routers |
| `server/nvm/analyze/fountain-analyzer.ts` | Text → records |
| `server/nvm/analyze/doctor.ts` | Aggregate Script Doctor report |
| `server/nvm/analyze/doctor-pool.ts` | Worker-thread pool + coordinator cache + in-process fallback |
| `server/nvm/revision/pipeline.ts` | 14-pass diagnose/rewrite |
| `server/lib/backup.ts` | SQLite online backup, retention pruning, `restoreSession()` |
| `src/App.tsx` | Top-level view router + `#verify` / `#privacy` hash routes |
| `src/components/ScriptIDE.tsx` | Primary product surface |
| `src/components/scriptide/ScriptDoctorPanel.tsx` | Doctor UI + incomplete-analysis banner |
| `src/components/scriptide/CommandPalette.tsx` | Cmd/Ctrl+K palette shell (logic in `src/lib/command-palette.ts`) |
| `src/components/PrivacyPage.tsx` | `#privacy` — what stays local, what the server holds, how to delete |
| `docs/AUTH.md` | Session capability model |

Depth lives in file headers. Prefer reading those over duplicating behavior here.
