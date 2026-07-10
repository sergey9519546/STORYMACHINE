# STORYMACHINE — Architecture

A quick map for orientation. See `README.md` for setup and `CLAUDE.md` for the
project's standing conventions and quality bar. Depth lives in-code — this
file links to header comments rather than duplicating them.

## Stack

Node ≥22.6 (ESM, `tsx` / `--experimental-strip-types`), Express 4,
better-sqlite3 (one DB per session), `ws` + Yjs for real-time collab, React 19
+ Vite 6 + Tailwind 4 + CodeMirror 6 on the frontend, zod for request
validation. All LLM calls (Gemini by default, OpenAI-compatible fallback) are
server-side only — see `server/engine/ai.ts`.

## The organizing principle: a deterministic core inside a generative shell

Everything trustworthy is **pure, keyless, and reproducible**: the 14-pass
audit, its verdicts and percentiles against the calibration corpus, root-cause
clustering, issue location, counterfactual (What-If) exploration, on-demand
Writers'-Room critics, interview grounding receipts, `contentHash` receipts,
and the doctor's LRU memoization — none of it touches an LLM, a clock, or
`Math.random()` in its diagnostic path.

Everything generative — converge candidates, revision rewrites, the Fountain
copilot, character voices/interview answers, simulation dialogue — is opt-in,
clearly labeled, rate-limited under `aiLimiter`, and **degrades honestly**
when no key is configured (a keyless shape — grounding receipts, a no-op
pass-through, a `usedLLM: false` note — never a 500). The server itself boots
keyless on purpose: `server.ts` logs a `startup_keyless` warning and keeps
running without `GEMINI_API_KEY` (or the openai-compat pair), because the
deterministic surface is the front door, not a degraded fallback of it.

## Request flow

```
Browser (React SPA, same-origin fetch/SSE/WebSocket)
  │
  ├─ /api/* ──► server/app.ts (middleware, security headers, routers, error handler)
  │                │
  │                ├─ server/routes/config.ts    — health, AI provider config (llmReady), outline, session import/export
  │                ├─ server/routes/game.ts       — OASIS agent-simulation engine: init/turn/run-room/run-scene/interview/state
  │                ├─ server/routes/scriptide.ts  — Fountain IDE: save/load, doctor, doctor/pdf, diagnose, AI copilot (aiLimiter routes)
  │                ├─ server/routes/nvm.ts        — the NVM engine (see below), ~50 routes
  │                ├─ server/routes/export.ts     — Fountain → FDX/DOCX/print-HTML, export/coverage (re-runs the doctor)
  │                └─ server/routes/collab.ts     — mints short-lived Yjs room tokens
  │
  └─ /collab/<room> ──► server/collab/yjs-server.ts (Yjs WebSocket sync, token-gated)
```

Representative routes (spot-checked against the code, not memorized):
`POST /api/scriptide/doctor` and `/doctor/pdf` (score a script),
`POST /api/scriptide/diagnose` (editor-squiggle live diagnostics),
`POST /api/export/coverage` (shareable report), `POST /api/game/interview`
(character grounding + optional LLM voice), `POST /api/nvm/whatif/explore`
(counterfactual compose), `POST /api/nvm/room/critique` (on-demand Writers'
Room), `POST /api/nvm/converge/commit` (writer-selected candidate → canon),
`POST /api/run-scene` (`Orchestrator.runFullScene` across multiple rooms).

`/api/scriptide/doctor/pdf` sits behind `heavyBodyLimiter` (10/min) instead of
the general `gameLimiter` (120/min) — it accepts up to 15MB of raw PDF bytes,
and 120/min at that size is a ~1.8GB/min-per-client DoS profile.
`heavyBodyLimiter` *replaces* `gameLimiter` on that route (both key by IP, so
stacking them would double-penalize the same caller).

Every route resolves a per-session `Stage` (SQLite-backed,
`server/engine/Stage.ts`) via `getOrCreateSession()` in
`server/lib/session-store.ts`. Session identity (`sessionId()`) has three
precedence tiers: (1) an explicit `sessionId` in the query (GET) or body
(otherwise) — malformed here is a hard 400, since silently falling back could
leak another user's session; (2) the `X-Session-Id` header every
same-origin fetch sends, validated against `^[A-Za-z0-9_-]{8,64}$` — a
path-safety guard (the value is joined into a session DB file path), not
authentication, so a header that fails the charset falls through quietly to
`'default'`; (3) `'default'` otherwise. Two rate limiters guard ordinary
routes: `gameLimiter` (120/min) for CPU-only work, `aiLimiter` (20/min) for
anything that can fan out to an LLM call.

## The NVM ("Narrative Virtual Machine")

`server/nvm/` is a ~27-subsystem engine for machine-checkable narrative
quality. A story is a sequence of `StoryCommit`s, each a batch of typed
`StoryOp`s (add a fact, shift a relationship, raise a clock, seed a clue...).
Nearly everything else derives from folding those ops into a `NarrativeState`.

| Subsystem | Purpose |
|---|---|
| `ops/` | `StoryOp` type union + `dispatcher.ts` (fold ops into state) |
| `state/` | `NarrativeState`, `StoryCommit`, enriched-state builder |
| `ir/` | `NarrativeTransitionIR` — what a scene transition compiles to |
| `screenplay/` | Fountain compile/structure/memory — turns commits into a screenplay |
| `analyze/` | Script Doctor bridge: `fountain-analyzer.ts` (text → records, keyless), `doctor.ts` (aggregation + LRU cache), `locate.ts` (issue → line span), `cluster.ts` (root-cause convergence), `calibration/` (the controlled-richness reference corpus + percentiles) |
| `whatif/` | Counterfactual compose (`explore.ts`) — recombines the causal twin, branch field, and ops dispatcher into one "what if I changed X?" answer; deterministic, keyless |
| `revision/` | The 14-pass Fountain revision pipeline (see below) — this repo's largest subsystem |
| `proof/` | Tier 1–4 proof kernel: contract-checks narrative invariants, lints, repairs |
| `quality/` | Soft quality engines (specificity, Propp morphology, arc-debt tracker) |
| `valuation/` | Tension ledger, audience red-team, topology, two-reader model |
| `converge/` | The generate → prove → value → quality → mutate loop (`loop.ts`) |
| `generate/` | LLM candidate generator + prompt-spec builders |
| `twin/` | Causal digital twin: structural causal model + `do()` counterfactuals |
| `room/` | Writers'-room multi-critic candidate deliberation — runs both inside converge and on demand |
| `drama/` | Conflict orchestration + character intention registry |
| `author/` | Fixed-point planning + backward-chaining toward narrative attractors |
| `selfplay/` | Self-play corpus mining, genome extraction/diff/breed |
| `regression/` | Narrative-invariant regression runner (quality regression guard) |
| `repro/` | Deterministic seeds, run manifests, ghost ledger (rejected candidates), LLM cache |
| `live/` | Real-time interactive move bus + reactive turn loop |
| `branch/` | Branch-field scoring for narrative exploration |
| `bridge/` | Action → ops translation — **LIVE**, not dormant: wired into every `runTurn`/`run-room`/`run-scene` call, and now carries `SHIFT_RELATIONSHIP` (theory-of-mind deltas) and `APPRAISE_EMOTION` ops, not just the original coarse action mapping |
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
quality score survivors. The loop does **not** auto-commit a winner: it
returns `winner`, every scored `candidates[]` entry (own `ir`, proof findings,
scores), and the Writers'-Room `roomTranscript` — the writer chooses.
`POST /api/nvm/converge/commit` takes the writer's selected ops and
**re-proves Tier 1 against the session's current state** (not the state the
candidate was scored against — the timeline may have moved on), 409-ing if it
no longer holds. Rejected candidates persist to the ghost ledger
(`server/nvm/repro/ghost-ledger.ts`); `GET /api/nvm/ghost-commits` lists them
and `POST /api/nvm/ghost-commits/branch` restores one as ops the writer can
commit through the same `/converge/commit` pen.

## Script Doctor (`analyze/`) and What-If Lab (`whatif/`)

Script Doctor takes raw Fountain/FDX/PDF text with **no session and no LLM**:
`analyzeFountainText()` heuristically produces `ScreenplaySceneRecord[]` from
the text alone, `runScriptDoctor()` runs all 14 revision passes over them in
diagnose-only mode and aggregates a `ScriptDoctorReport` — health score,
`CoverageVerdict` (RECOMMEND/CONSIDER/PASS), 5 `DimensionScore`s, percentiles
against `calibration/reference.ts`'s 20-sample corpus, a scene heatmap, and a
`contentHash` reproducibility receipt. Root-cause clustering (`cluster.ts`)
and 4-tier issue location (`locate.ts`: scene / lines / character / document
— never a fabricated caret position) layer on at the route, not in
`doctor.ts`. The What-If Lab (`whatif/explore.ts`) is pure composition — the
causal twin's `do()` counterfactuals, the branch field's scored next-moves,
and the ops dispatcher recombined into one before/after diff plus ranked
alternate continuations, "proofs, not vibes" applied to a hypothetical
instead of canon.

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

Two execution modes exist behind one `AsyncLocalStorage` flag
(`rewrite.ts`'s `runDiagnoseOnly`): full **revision** mode runs the 14 passes
sequentially because each may rewrite the screenplay the next pass reads;
**diagnose-only** mode (Script Doctor, live `/diagnose`) never calls the LLM
in any pass, so the sequential dependency doesn't exist and the passes run
`Promise.all`-parallel instead — verified safe, not just assumed. The
doctor additionally memoizes whole reports in an in-process LRU
(`doctorCache`, capacity 64) keyed on `contentHash` **plus** `storyContext` —
not `contentHash` alone, because `originality.ts`'s genre-cliché check and
all of `theme.ts` read `storyContext` diagnostically, so the same text under
two different story contexts can legitimately score differently.

The health score is an **opportunity-normalized, length-invariant** formula:
`100 − craftPenalty(bySeverity, sceneCount, wordCount)`, clamped to [0, 100].
Read `craftPenalty`'s shape in `doctor.ts` rather than trusting constants
here — they're deliberately function-local (a doctor↔`reference.ts` circular
import creates a temporal-dead-zone hazard for module-level consts) and
recalibrate as waves add rules.

Each pass accumulates rules (`RevisionIssue`s) built from
`ScreenplaySceneRecord[]` — one record per scene, carrying signals like
`emotionalShift`, `suspenseDelta`, `curiosityDelta`, `clockRaised`,
`seededClueIds`, `payoffSetupIds`, `relationshipShifts`, `dramaticTurn`, and
`purpose` (a fixed `ScenePurpose` enum — see `server/nvm/screenplay/memory.ts`).

## The two record producers

`ScreenplaySceneRecord` — the shared signal shape every revision pass and
Script Doctor consume — has **two independent producers**: **ops-derived**
(`screenplay/memory.ts`, one record per `StoryCommit` from a lived
simulation/editor ledger) and **text-derived** (`analyze/fountain-analyzer.ts`,
the same shape straight from raw Fountain text with no ledger behind it —
see its header for which fields degrade gracefully with `commits=[]`).

The two agree on required fields but not on everything: some are
**text-only**, e.g. Wave 1182's question-answer latency fields
(`questionsRaised`/`questionsResolved`/`questionsResolvedSameScene`/
`questionsUnresolved`) — the ops path has no raw dialogue text to lex-match
questions against (optional, treat absence as 0). Keeping two producers of
one contract in sync without a mechanical check drifts silently; a
golden-story parity test (`tests/core/record-parity.test.ts`, not yet landed
— being built in parallel) is meant to author one story both ways and assert
signal agreement within tolerance, so a future Deep-Read or sim-driven
doctor report can trust both halves equally.

### The standing "wave" task

Per `CLAUDE.md`, this pipeline grows indefinitely by 3 new rules ("checks")
per wave. **Program v1** (rotating the 14 pass files, +3 matrix-cell rules
per wave) ran through Wave 1181 and is closed — the signals × modes ×
positions coverage matrix it targeted is saturated, and a new v1-style wave
would just be permutation farming. **Program v2** replaces it: four wave
types — signal channels, excellence detectors, genre-conditioned variants,
root-cause templates — rotating one type per wave, same cadence (3 checks +
6 tests) and rigor. Wave 1182 (Type 1, signal channel — question-answer
latency) was the first. The rotation cursor is recorded per commit in
`ROADMAP.md` (e.g. "Wave 1182 was Type 1 — next up is Type 2"), not here;
full acceptance criteria per type live in
`server/nvm/revision/WAVE_QUALITY_GUARANTEE.md` § "Program v2".

Two things keep the wave process cheap as it continues: **`passes/lib/checks.ts`**
— typed, tested detection functions for the recurring analytical shapes a wave
tends to need, so new waves call into shared code instead of hand-rolling a
loop (pre-Wave-1181 rules are frozen, not retrofitted); and **one
`tests/passes/<pass>.test.ts` file per pass** (split from a single
64,000-line `test.ts` in audit M2.1, plus shared `tests/passes/helpers.ts`
factories) — each wave adds 6 tests (fire + no-fire per check) to its pass's
own file only, inserted before the previous wave's `describe` block
(newest-first).

## Security posture

- API keys: `.env`-only (gitignored), never serialized to clients —
  `server/lib/ai-config.ts`'s `getPublicConfig()` exposes only boolean
  `keySet` flags. `GET /api/ai-config`'s `llmReady` (`server/routes/config.ts`)
  ORs **two independent key sources** (env `GEMINI_API_KEY` and the
  multi-provider config's own `keySet`) — checking only one is a recurring
  trap that makes a working provider report as not-ready.
- The server boots **without** an AI key on purpose (`server.ts`): a missing
  key logs a `startup_keyless` warning, not a fatal exit — the deterministic
  surface (doctor, diagnose, coverage export, what-if, room critique,
  interview receipts) is the front door, not a fallback mode.
- All mutating routes sit behind `gameLimiter` or the stricter `aiLimiter`;
  the one raw-body route (`/doctor/pdf`) sits behind `heavyBodyLimiter`
  instead, which replaces rather than stacks with `gameLimiter`. Zod
  (`server/lib/validation.ts`) validates every mutating route's body.
  `/collab/<room>` requires a short-lived HMAC token minted by
  `POST /api/collab/token` (`server/lib/collab-auth.ts`) — a WebSocket
  upgrade without one is rejected with 401.
- Log hygiene: `server/app.ts` request logging never emits a full URL or
  query string — session ids (isolation capabilities, not opaque
  identifiers) can ride SSE query strings, so only the query-free `req.path`
  is logged.
- CI (`.github/workflows/ci.yml`) enforces a `console.*` grep over
  `server/**` (a hit fails the build — use `server/lib/logger.ts`) and a
  **keyless test posture**: the test step deliberately sets NO
  `GEMINI_API_KEY`, so CI proves the analysis-only mode the product
  officially supports. (A fake key was removed after it was found causing
  the "keyless" degradation paths to construct real clients and attempt
  live provider calls from CI.) The build step still carries a placeholder
  key solely for the bundler.
- Coverage-export authenticity: `POST /api/export/coverage` re-runs the
  doctor server-side rather than trusting a client-supplied report JSON, so
  an exported document can't be hand-inflated before reaching a producer.
- Sample-script provenance (`src/lib/sample-script.ts`,
  `ScriptDoctorPanel.tsx`'s `isSampleRun` guard) is tracked end to end so the
  built-in "Try a sample script" run never pollutes real draft-history
  comparisons.
- Pre-existing `apiKey` identifiers in `src/components/SettingsPanel.tsx` are
  runtime input-field prop bindings, not embedded secrets.
- See `tests/routes/*.test.ts` for HTTP-level coverage of the above (limiter
  behavior, validation, key redaction) against a real in-process server.
