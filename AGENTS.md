# STORYMACHINE — Project Memory

**PRIMARY REFERENCE**: `docs/MASTER_ROADMAP.md` — single source of truth for project direction, phases, and sequencing (reconciled 2026-07-15)

**SUPPORTING DOCS**: `NORTH_STAR.md` (constitution) · `ARCHITECTURE.md` (system map) · `docs/DECISION_LOG.md` (audit trail) · `README.md` (setup)

**ACTIVE WORK**: `docs/user-validation/` (P0 protocol, recruitment, sessions)

**HISTORICAL**: `docs/filed-backlog/` (V5 vision, session docs) — NOT active direction

## Quality bar

Build the strongest version of a **validated** change, not the quickest one
that passes: start with the active ROADMAP phase and its user-facing exit
gate, then handle edge cases, guard inputs, and match surrounding patterns.
For any scoring change, tests must include both positive/negative fixtures
and runnable discrimination evidence on real writing; synthetic fire/no-fire
coverage alone is not enough. The retired wave guarantee remains a historical
quality reference, not an instruction to author another wave.

## Commands

`npm run dev|build|lint|test` are standard (`lint` = `tsc --noEmit`;
Node ≥ 22.6). The one non-obvious command:

```
node --experimental-strip-types tests/<area>/<file>.test.ts   # one file, fast
```

Run the file(s) you touched, then the full `npm test` (0 failures required)
before every push. CI runs lint + test + build on every branch, plus a
`console.` grep over `server/**` — a hit fails the build.

## Security constraints (must always hold)

- API keys live only in `.env` (gitignored) and are never serialized to
  clients — `getPublicConfig()` exposes boolean flags only. `/api/ai-config`
  additionally reports `llmReady`, which ORs the TWO independent key sources
  (env `GEMINI_API_KEY` and the multi-provider config) — checking only one is
  a recurring trap.
- All AI calls go through server-side Express routes — never from the
  frontend bundle.
- Every route takes `gameLimiter` — or the stricter `aiLimiter` when it can
  trigger LLM calls — and zod-validates its body (`server/lib/validation.ts`).
- No new `console.*` under `server/**` (CI-enforced); use
  `server/lib/logger.ts`.

## Gotchas

- The server deliberately boots WITHOUT an AI key into analysis-only mode —
  the deterministic surface (doctor, diagnose, coverage, what-if, room,
  interview receipts) is the product's front door. Do not reintroduce a
  fatal key check in `server.ts`.
- `apiKey` identifiers in `src/components/SettingsPanel.tsx` are input-field
  prop bindings, not embedded secrets — leave them alone.
- `.Codex/` and `data/` are gitignored: nothing placed there is shared via
  git unless `.gitignore` changes first.
- Calibration corpus (`server/nvm/analyze/calibration/corpus.ts`): band
  monotonicity is a property of the CONTROLLED-RICHNESS DESIGN — all 20
  samples share scene/word budgets and structural-signal presence, so craft
  is the only variable. Changing one band's richness without matching every
  other band reintroduces the measured confound and the calibration tests
  will (correctly) fail. See `reference.ts`'s header.
- Formula constants in `server/nvm/analyze/doctor.ts` stay function-local:
  module-level consts hit a temporal dead zone through the doctor↔reference
  circular import and the failure is silently swallowed by a fallback
  (documented at the site — it cost a real bug hunt).
- The revision pipeline's 14-pass execution order is still live. The old
  wave-rotation order is retired history — never use it to choose new work.
- OneDrive hazard: direct file-tool writes to the mounted repo can truncate
  files and introduce CRLF diff inflation. Edit in a clone, copy back with
  byte verification, commit via Windows-side git.
- The real-corpus harness (`tests/core/real-script-corpus.test.ts`) is
  env-gated (`REAL_SCRIPT_CORPUS_DIR`); its manifest must be re-locked
  whenever a rule change shifts a produced script's health/verdict/
  sceneCount.
- Structural findings at feature scale must go through the bounded
  deduction path in `doctor.ts` — never rely on issue-count density, which
  is provably blind to document-scale scene-order collapse at feature-scale
  issue volume.
- Parallel sessions ship concurrently: pull the integration branch and check
  `git log` before starting any implementation work. Do not assume `main` or
  any other branch name; use the current session's designated branch.

## Current Priority — P0 User Validation (BLOCKS ALL NEW WORK)

**Status**: Phase 0 (documentation reconciliation) complete, Phase 1 (fix broken) next, Phase 2 (P0 validation) starts this week

See `docs/MASTER_ROADMAP.md` for full plan. Key points:

**P0 Gate (Hard Blocker)**:
- Recruit 5+ real screenwriters
- Show them the sample coverage report with Story Graph
- Ask: "Would you run your own draft?"
- Count pull signals: strong (4+) / weak (2-3) / none (<2)
- Decision: GREEN → proceed to V5 activation + P1 corpus | YELLOW → iterate | RED → stop/pivot

**What's Working**:
- Story Graph Phase 1-2 (697 LOC) — fully integrated, shows in P0 sessions
- V5 systems (5,000+ LOC) — shadow mode OFF, activates if P0 GREEN
- Deterministic core — production-ready

**What's Gated**:
- No new engine work until P0 clears (exception: security fixes)
- No Phase 3-4 Story Graph until P0 GREEN + P1 validation
- No Infinity Gate expansion until P0 GREEN
- No new rules (frozen at 8,917), no new waves (program RETIRED)

**Constitutional Laws** (NORTH_STAR.md):
- *Demand before rigor* — validated user need gates engine work
- *Correct before reproducible* — score validity before determinism claims
- *Measure on runnable real writing* — synthetic tests necessary but insufficient

Commit to the branch designated for the current session.
