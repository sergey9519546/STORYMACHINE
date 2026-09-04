# Contributing to STORYMACHINE

Thanks for helping. This file is the short version: how to set up, what the
scripts do, the non-obvious rules, and how to land a change. For the full
setup walkthrough see **README.md**; for working constraints see
**AGENTS.md**.

## Licensing

`LICENSE` currently grants no license, right, or permission to any person or
entity to use, copy, modify, or distribute this software without the
copyright holder's prior written permission, and `package.json` sets
`"license": "UNLICENSED"`. Read literally, sending a pull request against a
proprietary, all-rights-reserved codebase needs that written permission
first — the setup and workflow below assume you already have it or are
working directly with the owner. See `docs/DECISION_LOG.md` ("License the
Repository") for the open decision on whether that changes.

## Dev setup

Requires Node.js >=22.13.0 || >=24 (CI pins Node 22).

```bash
npm ci          # install pinned deps
npm run dev     # start dev server with hot reload
```

Do not use `npm install` in CI-bound contexts — it can rewrite
`package-lock.json`; `npm ci` is the reproducible install.

## npm scripts (the ones that matter)

| Script | What it does |
|---|---|
| `npm run dev` | Start the dev server (`tsx server.ts`). Set `SESSION_DB_DIR=:memory:` first for local UI/manual-testing iteration — otherwise every boot persists session state to `data/sessions/<sessionId>.db` and ad hoc poking accumulates real files there over time. |
| `npm run lint` | **Type check only** (`tsc --noEmit`). Despite the name there is no ESLint/static-analysis pass. |
| `npm test` | Full test suite. **0 failures required** before push. **Skips `tests/e2e/journeys.test.ts`** (the full-stack journey suite) unless `RUN_E2E=1` is set — CI sets it, a plain local run does not; you'll see `# SKIP RUN_E2E not set` instead of that file actually running. |
| `RUN_E2E=1 npm test` | Same suite, but also runs the full-stack journey tests — spawns a real server and drives complete writer flows end to end. |
| `npm run verify:browser` | Runs the eight live-Chromium suites (`verify:p0-flow`, `verify:focus-traps`, `verify:surfaces`, `verify:ui-polish`, `verify:local-safety-net`, `verify:command-palette`, `verify:a11y`, `verify:production`) via `scripts/verify-browser-battery.mjs`. `verify:a11y` is the systematic accessibility pass — axe-core across every primary surface in both themes plus a keyboard-only run of the primary journey. `verify:production` is the only suite that boots `NODE_ENV=production` (the Dockerfile's own `CMD`, not the Vite-dev-middleware path every other suite exercises) — see below. Not part of `npm test`; measured at **~3 minutes** wall clock with Chromium pre-cached. CI runs it as its own blocking `browser` job, with no retry flag (always `N=0`, see below). |
| Timing under load (`scripts/lib/browser-verify.mjs`) | Every timeout the battery's shared helpers hand to Playwright (and the raw server-boot wait) is scaled once per suite process by `getTiming()`: it reads `os.loadavg()[0] / os.cpus().length` at suite start and multiplies base timeouts by 1.0x at/below 1.0 load/cpu, growing linearly, capped at 4.0x — logged as `[verify] load L/cpus → timeout scale Sx`. Set `VERIFY_MAX_LOAD_PER_CPU` (e.g. `2`) to make a suite refuse outright above that per-CPU load instead of scaling — **exit code 3**, load named in the message, no server boot or Chromium launch. Unset (default): never refuses. |
| `node scripts/verify-browser-battery.mjs --retry-flaky N <suite>...` | The shared runner behind `verify:browser`. `npm run verify:browser` itself passes no `--retry-flaky` (N=0 — one attempt per suite, first failure stops the run, same as the old `&&` chain; this is what CI always runs). Pass `--retry-flaky N` (N>0) by hand on a loaded machine to re-run a failing suite ALONE up to `N` more times before giving up; a suite that only passes on retry is reported as `flaky-pass` — **never** a plain pass — with both the failing and the passing attempt's logs kept under `scripts/output/flaky-retries/` (gitignored). Do not add this flag to CI. |
| `npm run verify:production` | Builds (`npm run build`), boots the app exactly like the Dockerfile's `CMD`, and verifies the production-only path: security headers, gzip/brotli compression (and that SSE streams are never compressed), Cache-Control differentiation between hashed assets and `index.html`, a real 404 under `/assets/` (not the SPA fallback), path-traversal and oversized-POST attacks, bundle sizes, byte-identical dev-vs-prod doctor scoring, and the full writer journey (analyze → jump to a line → export Fountain/FDX/PDF/coverage letter → Settings → Session → Delete Everything → reload) driven against the production server. ~25s alone (build included); also runs as the last step of `verify:browser`. |
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

- **Delegated work is held to `docs/LANE_STANDARD.md`** — understand first, build the strongest version, prove it with before/after numbers, run the gates in the foreground, and pass an independent review before merge.

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

## P0 evidence gates

P0 fielding is authorized (GO, 2026-08-04), but there are 0 valid documented
sessions and no P0 outcome verdict. P0 human evidence remains the highest
priority and cannot be replaced by implementation work. The P0 hard-gate
was retired 2026-08-11 (`docs/DECISION_LOG.md` Decision #2): engine work
proceeds in parallel with P0; P4 retention/lock-in is last in sequence, no
longer hard-blocked on a P0 PASS.

P0 has not passed (0/5 documented writer sessions as of this writing), while
`ROADMAP.md` §3 records P1 as partial and P2/P3 as DONE. That does not change
the P0 evidence requirement or permit P4 retention work; it records the
current evidence-gated sequencing rather than an outcome verdict.

See **ROADMAP.md** (and the archived `docs/filed-backlog/2026-07-15-session/
MASTER_ROADMAP.md`) for the full plan and the current phase. If your change
touches scoring, measurement, or the user-facing surface, follow the
applicable machine-checked evidence gate; do not treat engineering progress
as P0 evidence or begin P4 retention/lock-in work before P0 PASS.

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

**If your PR's checks fail in ~2 seconds with no logs and no runner
assigned, it is not your change.** That is the signature of a known
account-level GitHub Actions block (a billing/spend limit or runner
availability issue on the account, not a code failure) — every gate in
`ci.yml` passes locally on the same commits when the failure looks like
this. It cannot be diagnosed or fixed from a PR; see
`docs/PATH_TO_EXCELLENCE.md`'s "GitHub Actions is not running jobs" entry
for the full diagnosis and what the owner needs to check. Run the gates
locally (`npm run lint && npm test && npm run build`, or `npm run
validate`) and note that you did in the PR description if this is
happening.
