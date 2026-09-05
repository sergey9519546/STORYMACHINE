---
type: gate
updated: 2026-09-05
sources: [.github/workflows/ci.yml, scripts/verify-browser-battery.mjs, CONTRIBUTING.md]
status: active
---

# Gate — Browser Battery Suites

**What it checks:** eight live-Chromium suites that boot the real server
and drive the real UI — `verify:p0-flow`, `verify:focus-traps`,
`verify:surfaces`, `verify:ui-polish`, `verify:local-safety-net`,
`verify:command-palette`, `verify:a11y`, `verify:production`. `verify:a11y`
is an axe-core sweep of every primary surface in both themes plus a
keyboard-only run of the primary journey. `verify:production` is the only
suite that boots `NODE_ENV=production` (the Dockerfile's own `CMD` path,
not the Vite-dev-middleware branch every other suite exercises) — it found
and fixed missing response compression, missing cache-header
differentiation, and a `/assets/` miss silently 200'ing the SPA shell.

**Command:** `npm run verify:browser` (runs
`node scripts/verify-browser-battery.mjs` with all eight suites, N=0
retries — one attempt per suite, first failure stops the run). ~3 minutes
wall clock with Chromium pre-cached.

**Where it lives:** a separate `browser` job in `.github/workflows/ci.yml`,
parallel to the `test` job, provisioning Chromium via
`npx playwright install --with-deps chromium`. These suites used to run on
exactly one machine — three of their own headers asserted they "must not be
wired into CI" — until the SSE migration and an ARIA role change broke
selectors for days with nothing running them; they are now CI-blocking.

**What it cannot catch:** anything outside the eight primary surfaces and
journeys the suites were written to drive; a suite that only passes on
`--retry-flaky` (never used in CI, N always 0) reports `flaky-pass`, never
a plain pass, precisely so a genuinely flaky suite cannot hide behind a
retry. This lane's brief explicitly excludes running this battery — see
[[Patterns]] for why a gate this expensive is not re-run per revision round.

## Sources

- `.github/workflows/ci.yml` (`browser` job, full header)
- `CONTRIBUTING.md` (`npm run verify:browser` table row)
