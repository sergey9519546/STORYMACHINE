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
NVM research panels). Reachable, not the default activation path.

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
| Runtime | Node ≥ 22.6 (ESM, `tsx` / `--experimental-strip-types`) |
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
  │                ├─ routes/config.ts     health, AI config (booleans only), session import/export
  │                ├─ routes/scriptide.ts  doctor, diagnose, copilot, fix-and-verify
  │                ├─ routes/export.ts     coverage HTML, FDX/DOCX/print
  │                ├─ routes/game.ts       OASIS simulation (init/turn/room/interview)
  │                ├─ routes/nvm.ts        NVM research engine (~50 routes)
  │                └─ routes/collab.ts     short-lived Yjs room tokens
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

### Scoring trust contract

| Claim | Status |
|---|---|
| Same text → same `contentHash` and deterministic findings | Supported |
| Health is opportunity-normalized and length-checked | Supported by regression tests |
| Health is continuous/monotonic across all densities | Known seam at density≈1; do not over-claim |
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

Analyzer scene ceiling = 1000. Scripts above the ceiling:

- analyze only the first 1000 scenes
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
 ├─ ScriptIDE            primary product (doctor, diagnose, exports, fix)
 └─ StoryMachine         experimental simulation + NVM panels
```

View state persists in `localStorage` (`sm_app_view_v1`) so refresh resumes the
editor rather than dumping users back into the wizard.

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
Backups use SQLite online backup (`npm run backup`), not raw file copy of live WAL.

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

**Not yet proven by default CI:** browser journeys, human agreement with scores,
public multi-tenant security.

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
| `server/nvm/revision/pipeline.ts` | 14-pass diagnose/rewrite |
| `src/App.tsx` | Top-level view router |
| `src/components/ScriptIDE.tsx` | Primary product surface |
| `src/components/scriptide/ScriptDoctorPanel.tsx` | Doctor UI + incomplete-analysis banner |
| `docs/AUTH.md` | Session capability model |

Depth lives in file headers. Prefer reading those over duplicating behavior here.
