# STORYMACHINE — Architecture

A quick map for orientation. See `README.md` for setup and `CLAUDE.md` for the
project's standing conventions and quality bar.

## Stack

Node ≥22.6 (ESM, `tsx` / `--experimental-strip-types`), Express 4,
better-sqlite3 (one DB per session), `ws` + Yjs for real-time collab, React 19
+ Vite 6 + Tailwind 4 + CodeMirror 6 on the frontend, zod for request
validation. All LLM calls (Gemini by default, OpenAI-compatible fallback) are
server-side only — see `server/engine/ai.ts`.

## Request flow

```
Browser (React SPA, same-origin fetch/SSE/WebSocket)
  │
  ├─ /api/* ──► server/app.ts (middleware, security headers, routers, error handler)
  │                │
  │                ├─ server/routes/config.ts    — health, AI provider config, outline, session import/export
  │                ├─ server/routes/game.ts       — OASIS agent-simulation engine (init/turn/run-room/state)
  │                ├─ server/routes/scriptide.ts  — Fountain IDE: save/load, AI copilot (aiLimiter routes)
  │                ├─ server/routes/nvm.ts        — the NVM engine (see below), ~50 routes
  │                ├─ server/routes/export.ts     — Fountain → FDX/DOCX/print-HTML
  │                └─ server/routes/collab.ts     — mints short-lived Yjs room tokens
  │
  └─ /collab/<room> ──► server/collab/yjs-server.ts (Yjs WebSocket sync, token-gated)
```

Every route resolves a per-session `Stage` (SQLite-backed, `server/engine/Stage.ts`)
via `getOrCreateSession()` in `server/lib/session-store.ts`. Two rate limiters
guard all routes: `gameLimiter` (120/min) for ordinary calls, `aiLimiter`
(20/min) for anything that fans out to one or more LLM calls.

## The NVM ("Narrative Virtual Machine")

`server/nvm/` is a ~25-subsystem engine for machine-checkable narrative
quality. A story is a sequence of `StoryCommit`s, each a batch of typed
`StoryOp`s (add a fact, shift a relationship, raise a clock, seed a clue...).
Nearly everything else derives from folding those ops into a `NarrativeState`.

| Subsystem | Purpose |
|---|---|
| `ops/` | `StoryOp` type union + `dispatcher.ts` (fold ops into state) |
| `state/` | `NarrativeState`, `StoryCommit`, enriched-state builder |
| `ir/` | `NarrativeTransitionIR` — what a scene transition compiles to |
| `screenplay/` | Fountain compile/structure/memory — turns commits into a screenplay |
| `revision/` | The 14-pass Fountain revision pipeline (see below) — this repo's largest subsystem |
| `proof/` | Tier 1–4 proof kernel: contract-checks narrative invariants, lints, repairs |
| `quality/` | Soft quality engines (specificity, Propp morphology, arc-debt tracker) |
| `valuation/` | Tension ledger, audience red-team, topology, two-reader model |
| `converge/` | The generate → prove → value → quality → mutate loop (`loop.ts`) |
| `generate/` | LLM candidate generator + prompt-spec builders |
| `twin/` | Causal digital twin: structural causal model + `do()` counterfactuals |
| `room/` | Writers'-room multi-critic candidate deliberation |
| `drama/` | Conflict orchestration + character intention registry |
| `author/` | Fixed-point planning + backward-chaining toward narrative attractors |
| `selfplay/` | Self-play corpus mining, genome extraction/diff/breed |
| `regression/` | Narrative-invariant regression runner (quality regression guard) |
| `repro/` | Deterministic seeds, run manifests, ghost ledger (rejected candidates), LLM cache |
| `live/` | Real-time interactive move bus + reactive turn loop |
| `branch/` | Branch-field scoring for narrative exploration |
| `bridge/` | Action → ops translation |
| `reveal/` | Reveal-plan scheduling |
| `bible/` | Story-bible summary builder (context injected into prompts) |
| `project/` | Projects canon onto a target format (novel, comic, pitch, ...) |
| `mechanisms/` | Reusable dramatic-mechanism specs (`.mech.json`) + loader |
| `module/` | `NarrativeModule` composition unit |
| `query/`, `debug/` | Analytical queries + the `/api/debug/explain*` inspector |
| `util/` | Small shared helpers |

**A converge call**, end to end: `POST /api/nvm/converge` → build enriched
state from the session's `Stage` → `makeLLMCandidateGenerator()` proposes
candidate IRs → the proof kernel gates them (must pass Tier 1) → valuation +
quality score survivors → the best candidate is committed; rejected ones are
persisted to the ghost ledger (`server/nvm/repro/ghost-ledger.ts`) for later
inspection via `/api/nvm/ghost-commits`.

## The 14-pass revision pipeline

`server/nvm/revision/pipeline.ts` runs a compiled screenplay through 14
sequential passes (`server/nvm/revision/passes/*.ts`), each a pure function
`(PassInput) => PassResult` diagnosing one layer and optionally rewriting it
via LLM (`rewrite.ts`, falls back to a no-op pass-through without an API key):

```
structure → causality → intention → belief → conflict → character-arc →
dialogue → rhythm → pacing → originality → payoff → voice → theme →
relationship-arc
```

Each pass accumulates rules (`RevisionIssue`s) built from
`ScreenplaySceneRecord[]` — one record per scene, carrying signals like
`emotionalShift`, `suspenseDelta`, `curiosityDelta`, `clockRaised`,
`seededClueIds`, `payoffSetupIds`, `relationshipShifts`, `dramaticTurn`, and
`purpose` (a fixed `ScenePurpose` enum — see `server/nvm/screenplay/memory.ts`).

### The standing "wave" task

Per `CLAUDE.md`, this pipeline grows by 3 new rules per "wave," indefinitely,
rotating through the 14 pass files. As of Wave 593 there are 1,300+ rules
across ~48,000 lines (verify with the commands in
`server/nvm/revision/WAVE_QUALITY_GUARANTEE.md` — these figures drift every
wave). Two things exist specifically to keep that process cheap as it
continues forever:

- **`server/nvm/revision/passes/lib/checks.ts`** — typed, tested detection
  functions for the ~7 recurring analytical shapes every wave tends to need
  (aftermath-void, drought-run, zone-cluster, co-occurrence-decoupled,
  half-loaded, peak-uncaused, zone-imbalance). New waves should call into
  this instead of hand-rolling a loop; existing (pre-Wave-593) rules are
  frozen and not retrofitted.
- **`tests/passes/<pass>.test.ts`** — one file per pass (split from a single
  64,000-line `test.ts` in audit M2.1), plus **`tests/passes/helpers.ts`** for
  shared `makeSceneRecord()`/`buildPlainFountain()` test factories. Each wave
  adds 6 tests (fire + no-fire per check) to its pass's own file only.

## Security posture

- API keys: `.env`-only (gitignored), never serialized to clients — see
  `server/lib/ai-config.ts` (`getPublicConfig()` exposes only boolean
  `keySet` flags).
- All mutating routes sit behind `gameLimiter` or the stricter `aiLimiter`;
  LLM-fan-out routes specifically use `aiLimiter`.
- `/collab/<room>` requires a short-lived HMAC token minted by
  `POST /api/collab/token` (`server/lib/collab-auth.ts`) — a WebSocket
  upgrade without one is rejected with 401.
- Zod (`server/lib/validation.ts`) validates every mutating route's body.
- See `tests/routes/*.test.ts` for the HTTP-level tests covering the above
  (limiter behavior, validation, key redaction) end-to-end against a real
  in-process server.
