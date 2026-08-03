# agent-scheduler — dormant, kept as reference

**Status (2026-08-03 wiring audit): NOT WIRED. Do not run it. Read this
before reviving anything here.**

Zero references from `package.json`, `.github/workflows/`, the Dockerfile, or
any source file in the tree. It has its own `package.json` and has never been
executed against real work.

## What it is

A cron-style scheduler (`scheduler.js`, ~325 lines) plus an "implementation
agent" (`implementation-agent.js`, ~549 lines) built to automate implementing
the entries in `MEGA_CATALOG_12700_SYSTEMS.md`.

## Why it is dormant, and why that is the right state

Three independent reasons, in order of importance:

1. **Its target count was disproven.** The 12,700 figure is a permutation
   expansion of roughly 500 genuinely distinct craft concepts — see
   `docs/STORYTELLING_COVERAGE_MAP.md`, which does that deduplication and
   finds no defensible counting convention within two orders of magnitude of
   12,700. Automating the implementation of an inflated catalog automates the
   inflation.

2. **It fabricates quality metrics.** `implementation-agent.js`'s
   `generateSystem()` emits identical boilerplate TypeScript classes whose
   bodies are a literal `// TODO: Implement core ... logic`, and stamps every
   one with hardcoded `testCoverage: 85` and `completeness: 100` — numbers
   that are never measured. `implementSystem()` simulates success with
   `Math.random() > 0.1`. Reported quality that was never computed is the
   precise failure this project's constitution now exists to prevent: see
   CLAUDE.md's Standing Task section and NORTH_STAR's "demand before rigor."

3. **The scheduling mechanism is superseded.** `parseCron` + `setInterval`,
   with no persistence and no crash recovery. Scheduled work in this
   environment is better served by the Routines/trigger tooling that already
   exists.

## If you ever revive it

The scheduling shell is the only part worth salvaging, and only after
replacing `implementSystem()` with something that does real work and reports
measured — not asserted — results. Kept rather than deleted so that reasoning
is inheritable instead of re-derived.
