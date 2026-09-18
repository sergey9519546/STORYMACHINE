---
type: gate
updated: 2026-09-18
sources: [tests/core/docs-gating-set.test.ts, .github/workflows/ci.yml, .github/workflows/release.yml, scripts/lib/docs-only.mjs, docs/audits/2026-09-18-ci-docs-fast-path/README.md]
status: active
---

# Gate — Docs-Gating Set

**What it guards:** the list of test files that `.github/workflows/ci.yml`'s
"Run docs-gating tests (docs-only fast path)" step runs **in place of the
full `npm test`** on a documentation-only push. If a suite that asserts on
committed documentation is missing from that list, the fast path goes GREEN
where the full path goes RED — a docs regression reaches `main` with a green
run behind it.

**Command:** `node --experimental-strip-types tests/core/docs-gating-set.test.ts`
(and it is itself on the list it guards, because a docs-only DELETION changes
what it derives).

**Why it exists:** round 1 of `lane/ci-docs-fast-path` chose the list by
judgment from one `grep -rl`, and the list was wrong before it merged.
`tests/routes/root-cause-parity.test.ts` reads a brain note and asserts it
quotes six live-measured values; `tests/core/scoring-receipt-guard.test.ts`
reads the real committed `MEASUREMENT_RECEIPTS.md`; and
`tests/core/telemetry-docs-truth.test.ts` reads the real committed
`ROADMAP.md` — a root `.md` file, which IS docs to the classifier. All three
were missing. The same failure shape [[Gate - Rulebook Freshness]] and
`tests/core/brain-coverage.test.ts` exist to prevent: a list nobody is forced
to extend.

**The derivation:** a `tests/**/*.test.ts` file is a candidate when it — or a
non-test module it imports directly, one hop — both calls a filesystem read
and contains a string literal (from the TypeScript parser, so never a
comment) that RESOLVES to a path that exists in the checkout and that the
classifier would call docs. "Resolves to an existing path" is what keeps a
`docs/…` path quoted inside an error MESSAGE from becoming a false candidate.
The one-hop arm is what finds `tests/core/p0-sample-drift.test.ts`, which
names no docs path at all.

**Current state:** 24 candidates — **17 run on the fast path, 7 excluded**,
each exclusion carrying a reason that cites a file or a line. A stale
exclusion (file gone, or no longer a candidate) fails the gate, so the table
cannot rot into a permanent silencer.

**What it does NOT claim:** completeness. A docs path assembled at runtime
from non-literal parts, or reached more than one import hop away, is
invisible to it. Two hops were considered and rejected —
`server/lib/rulebook-count.ts` reads `docs/rulebook/coverage.json` at module
load and is reachable from `doctor.ts`, so two hops would make most of the
suite a candidate while adding nothing, that JSON already being covered by
[[Gate - Rulebook Freshness]].

**Related:** [[Audit - 2026-09-18 CI Docs Fast Path]],
[[Gate - Rulebook Freshness]], [[Gate - Honesty Audit]] (which does NOT scan
`docs/**` prose — the correction that motivated stating this gate's scope
precisely), [[Gate - Browser Battery Suites]] (skipped wholesale on the same
classification).

## Sources

- `tests/core/docs-gating-set.test.ts`
- `.github/workflows/ci.yml`, `.github/workflows/release.yml` — the step and
  its release mirror
- `scripts/lib/docs-only.mjs` — the allowlist the derivation reuses
- `docs/audits/2026-09-18-ci-docs-fast-path/README.md`
