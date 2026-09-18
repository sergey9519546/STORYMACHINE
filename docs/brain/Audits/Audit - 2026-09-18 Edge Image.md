---
type: audit
updated: 2026-09-18
sources: [docs/audits/2026-09-18-edge-image/README.md, Dockerfile, .github/workflows/edge.yml, .github/workflows/release.yml, tests/core/dockerfile-toolchain.test.ts, tests/core/ci-gates-intact.test.ts, server/lib/build-info.ts, server/lib/session-store.ts]
status: active
---

# Audit — 2026-09-18 Edge Image

**Directory:** `docs/audits/2026-09-18-edge-image/` — one lane record for
`lane/edge-image-real`, branched from `be2341ac`. Two defects in the container
delivery path, both invisible from inside the repository until GitHub Actions
came back.

## Why nothing had noticed

Actions was blocked at the account level until 2026-09-13, so
`.github/workflows/edge.yml` had never executed. Everything written about it
was reasoning, not observation — its own comment block said so, in the words
"THIS CANNOT BE PROVEN BY A REAL RUN RIGHT NOW". When the block lifted, the
workflow made three real build attempts and failed all three. **No `:edge`
image has ever been published.**

## Defect 1 — the image had never built

`Dockerfile:1` is `FROM node:22-alpine`, and `npm ci` in the `deps` stage died
on `node-gyp rebuild` for `better-sqlite3`: *"Could not find any Python
installation to use"*. `release.yml`'s `publish` job builds the same file and
would have failed identically.

The interesting part is that the obvious diagnosis is wrong. better-sqlite3
13.0.3 **does** ship a musl prebuild, bundled in the tarball at
`prebuilds/linuxmusl-x64.node` — nothing is downloaded, and there is no
`prebuild-install` to fail. Its `binding.gyp` is deliberately a no-op when a
host prebuild exists ("npm's implicit node-gyp rebuild should do nothing when
the package contains a prebuild for the host"), so **no C++ is compiled**. The
failure is upstream of the compiler: node-gyp's `configure` runs gyp, a Python
program, before it can read those conditions at all.

Measured one package at a time: `python3` alone gets past configure and then
dies on `not found: make`; `python3 make` makes `npm ci` exit 0 while producing
no `better_sqlite3.node` at all. `g++` is shipped anyway as honest headroom for
a future dependency without a musl prebuild, and is labelled as unused rather
than implied to be necessary.

Verified end to end with a real Docker daemon: full build exit 0, `/health`
200, `/ready` 503-then-200, container `HEALTHCHECK` `healthy`, and
better-sqlite3 exercised at runtime as the non-root `node` user — `GET
/api/state` produced a real `.db` plus WAL/SHM sidecars, and `ldd` confirmed
the loaded binary is musl-linked, matching the runner. The toolchain does not
reach the shipped image.

## Defect 2 — 467 of 471 runs were noise

`workflow_run` fires on every completion of CI on every branch, so each lane
push manufactured an Edge run that existed only to skip. The job-level
`concurrency` group cannot help, because a skipped run never contends for it.
Fixed at the trigger with `branches: [main]`, which matches the **upstream**
run's branch. The job-level `if:` is kept in full: the filter covers the branch
only, while `conclusion == 'success'` and `event == 'push'` are not covered by
it at all.

The trap that makes this easy to misread: a `workflow_run`-triggered run
reports the head_sha and head_branch of the **workflow file's** ref, so all 471
runs list `main` and look as though main triggered them. Correlating each run
against the CI run before it recovers the real branches —
`lane/story-bench`, `lane/necessity-certificate` — while the single run that
actually executed is the one whose upstream really was on main.

## The standing lesson

Two, and both are [[Patterns]]-shaped rather than specific to this workflow.

**A gate that has never run is not a gate.** `edge.yml` and the `Dockerfile`
were reviewed, commented at length, and guarded by tests that read the
workflow's *shape* — and none of that could see that the image did not build,
because nothing had ever tried. The repository's other CI-integrity work
(`tests/core/ci-gates-intact.test.ts`, [[Audit - 2026-09-13 CI Green]])
protects gates from being *neutered*; it says
nothing about a gate that was never exercised in the first place.

**An accurate comment is part of the deliverable.** The "CANNOT BE PROVEN"
block was true when written and quietly became false, and a reader in
2026-09-14 would have trusted it over the run list. Dated claims about the
outside world need replacing when the world changes, not just when the code
does.

## Guards

`tests/core/dockerfile-toolchain.test.ts` (new, 11 tests) parses the Dockerfile
into stages and asserts the compile toolchain sits in every stage that runs
`npm ci`, that the runner stays clean, and that all stages agree about libc.
Two tests were added to `tests/core/ci-gates-intact.test.ts` for the trigger
filter and the three `if:` conditions.

All three guards were shown RED on unfixed input before being shown green, per
`docs/LANE_STANDARD.md` §3 — including the case that matters most here: comment lines
are stripped first, so deleting the live line while leaving the prose that
describes it does **not** keep the guard passing.

**Related:** [[Audit - 2026-09-13 CI Green]], [[Patterns]], `docs/LANE_STANDARD.md`,
`docs/audits/2026-09-18-edge-image/README.md`.

## Sources

- `docs/audits/2026-09-18-edge-image/README.md`
- `Dockerfile`
- `.github/workflows/edge.yml`
- `.github/workflows/release.yml`
- `tests/core/dockerfile-toolchain.test.ts`
- `tests/core/ci-gates-intact.test.ts`
- `server/lib/build-info.ts`
- `server/lib/session-store.ts`
