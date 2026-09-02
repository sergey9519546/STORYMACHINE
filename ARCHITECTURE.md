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
  │                ├─ routes/scriptide.ts  doctor, doctor/stream (SSE), diagnose, copilot, fix-and-verify
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
blocks on the same job). The six suites are `scripts/smoke-p0-live-flow.mjs`,
`verify-p2-p3-surfaces.mjs` (surface/Labs gating + a static dead-UI tripwire),
`verify-focus-traps.mjs`, `verify-ui-polish-affordances.mjs`,
`verify-e4-local-safety-net.mjs`, and `verify-e5-command-palette.mjs`; their
shared boot/launch/console-capture/report-wait machinery lives once in
`scripts/lib/browser-verify.mjs`. `scripts/load-test-doctor.mjs` (concurrent
doctor load) stays on demand — it is a measurement, not a pass/fail gate.

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
