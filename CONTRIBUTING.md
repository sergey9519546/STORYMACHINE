# Contributing to STORYMACHINE

Thanks for helping. This file is the short version: how to set up, what the
scripts do, the non-obvious rules, and how to land a change. For the full
setup walkthrough see **README.md**; for working constraints see
**AGENTS.md**.

## Dev setup

Requires Node.js 22.6+ (CI pins Node 22).

```bash
npm ci          # install pinned deps
npm run dev     # start dev server with hot reload
```

Do not use `npm install` in CI-bound contexts — it can rewrite
`package-lock.json`; `npm ci` is the reproducible install.

## npm scripts (the ones that matter)

| Script | What it does |
|---|---|
| `npm run dev` | Start the dev server (`tsx server.ts`). |
| `npm run lint` | **Type check only** (`tsc --noEmit`). Despite the name there is no ESLint/static-analysis pass. |
| `npm test` | Full test suite. **0 failures required** before push. |
| `npm run test:metamorphic` | Hard metamorphic scoring invariants. `empty_verbosity` is a known-failing witness (verbosity bias) and does not fail this step — see `docs/scoring/VERBOSITY_BIAS_2026-07-11.md`. |
| `npm run build` | Production build (`vite build`). |
| `npm run honesty-audit` | Fails on overclaim language / stale claims in the shipped surface. CI-enforced. |
| `npm run check-docs` | Scans markdown for AI-writing patterns. Non-blocking. |

To run a single test file fast:

```bash
node --experimental-strip-types tests/<area>/<file>.test.ts
```

Run the file(s) you touched, then the full `npm test`, before pushing.

## Rules that always hold

These are project invariants. Breaking them fails CI or violates the
constitution — see AGENTS.md "Security constraints" for the authoritative list.

- **Keyless boot posture.** The server deliberately boots **without**
  `GEMINI_API_KEY` into analysis-only mode (the deterministic surface —
  doctor, diagnose, coverage, what-if, room, interview receipts). Do **not**
  reintroduce a fatal key check in `server.ts`. CI runs the whole suite
  keyless on purpose.
- **No `console.*` under `server/**`.** CI greps for it and a hit fails the
  build. Use `server/lib/logger.ts`. (The grep quarantines the never-compiled
  v5.0 experimental subsystem — see `.github/workflows/ci.yml` for the
  exclusion list. Genuinely-live code stays covered.)
- **API keys live only in `.env`** (gitignored) and are never serialized to
  clients — `getPublicConfig()` exposes boolean flags only. Checking only one
  of the two independent key sources (env `GEMINI_API_KEY` and the
  multi-provider config) is a recurring trap.
- **Every route takes `gameLimiter`** — or the stricter `aiLimiter` when it
  can trigger LLM calls — and zod-validates its body
  (`server/lib/validation.ts`).
- **All AI calls go through server-side Express routes**, never from the
  frontend bundle.

## P0 freeze

Product code is **frozen for P0 user validation**. No new engine, scoring, or
UI work without clearance. **Security fixes are the documented exception.**

P0 has not formally cleared (0/5 documented writer sessions as of this
writing), yet `ROADMAP.md` §3 records P1 as partial and P2/P3 as DONE. That
is not a contradiction to resolve here — the authorization is recorded in
`docs/p1-benchmark/P1_STATUS_2026-07-29.md`'s "Phase-gate status" section:
"P0 (demand): not formally cleared (0/5 writer sessions). User directed P1
to begin; record shows this." This file does not relitigate that decision,
only points to where it's on the record so the freeze language above isn't
read in isolation from it.

See **ROADMAP.md** (and the archived `docs/filed-backlog/2026-07-15-session/
MASTER_ROADMAP.md`) for the full plan and the current phase. If your change
touches the engine, scoring, or UI and you have not gotten explicit
clearance, it will not merge — open an issue first and triage via the
feature-request freeze-check.

## ADRs

Significant decisions are captured as Architecture Decision Records in
**`docs/adr/`** — the *why* behind a choice, not just the *what*. Write one
when a decision is architectural, hard to reverse, a significant tradeoff, or
phase-defining. See `docs/adr/README.md` for the template and process.

## Commit messages

Prefer scoped messages; avoid bare `commit`. Examples:

```
fix(ux): keep New Story from inheriting prior draft
feat(reliability): WAL-safe reset backup
security: bind default to loopback, fail closed on missing capability
docs(p0): capture validation protocol
```

## Reporting a security issue

Do **not** open a public issue for security problems. See **SECURITY.md** for
the private reporting channel and response SLA.

## CI

- `.github/workflows/ci.yml` — type check, no-`console.*` grep, keyless test
  suite, honesty audit, metamorphic gate, build.
- `.github/workflows/security.yml` — dependency review (PRs), `npm audit`
  (currently non-blocking), CodeQL scanning, weekly schedule.
