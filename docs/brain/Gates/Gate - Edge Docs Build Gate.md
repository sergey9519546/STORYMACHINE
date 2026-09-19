---
type: gate
updated: 2026-09-18
sources: [tests/core/edge-docs-gate.test.ts, .github/workflows/edge.yml, .dockerignore, scripts/lib/docs-only.mjs, Dockerfile, docs/audits/2026-09-18-ci-docs-fast-path/README.md]
status: active
---

# Gate — Edge Docs Build Gate

**What it guards:** that `.github/workflows/edge.yml` does not rebuild and
republish `:edge` for a commit that cannot have changed the image — and,
equally, that it does not SKIP a rebuild for one that did.

**Command:** `node --experimental-strip-types tests/core/edge-docs-gate.test.ts`
(28 cases), plus six wiring assertions in `tests/core/ci-gates-intact.test.ts`.

**Why it exists:** [[Audit - 2026-09-18 CI Docs Fast Path]] made a
documentation push to `main` finish CI in one to two minutes instead of nine.
It still concludes `success`, and a `success` on `main` is exactly what fires
`edge.yml` — so the pushes that had just been made cheap were the ones buying
a full `docker build --push` of an image with identical contents. Already
observed: CI run 34793742299 was a docs-only push to `main` that concluded
`success` and triggered edge run 34794216577.

**Why edge.yml re-derives instead of importing CI's answer:** a `workflow_run`
payload carries `head_sha`, `head_branch` and `conclusion` — never the
upstream run's job outputs. `needs.classify.outputs.docs_only` is unreachable
across workflows, and `needs:` cannot name a job in another workflow.

**The predicate is NOT the one ci.yml uses, and that is the finding.**
`classifyDocsOnly` treats any `**/*.md` as documentation, which is right for
"which CI gates can this affect" and wrong for "can this change the image".
`.dockerignore` denies `**` and re-includes `!server/**`, `!src/**`,
`!public/**`; thirteen committed `*.md` files live under those trees, they
enter the build context, and `Dockerfile:91` copies `/app/server` into the
runner stage. Gating on `classifyDocsOnly` would have skipped a rebuild for a
commit that genuinely changes the image. `canSkipImageBuild` is strictly
narrower — `docs/**` and ROOT-level `*.md` only — and this gate pins the two
`.dockerignore` facts it rests on, so a future `!CHANGELOG.md` breaks a test
rather than silently making the gate wrong.

**Failure direction is the OPPOSITE of [[Gate - Docs-Gating Set]]'s**, on
purpose. For CI, an unresolvable input runs every gate: guessing wrong there
means a gate silently skipped. Here, an unresolvable input BUILDS: guessing
wrong means a missing or stale `:edge`, which is visible and recoverable,
while over-building costs one runner slot. A missing `<head_sha>^` (root
commit, shallow fetch), a git failure and a broken classifier all write
`docs_only=false` and exit 0, so the step can never fail the job and block a
publish.

**What skipping gives up, stated rather than discovered later:** the image is
a function of the build context AND the build-args, and `GIT_SHA` moves every
commit. A skipped build leaves `:edge`'s `ENV GIT_SHA` and its
`org.opencontainers.image.revision` label naming the last commit actually
built, not `main`'s tip. Retagging the manifest
(`docker buildx imagetools create`) is the answer if that label must track the
tip; rebuilding for it is not.

**The honest size of the win:** the build itself is nearly free on a
docs-only commit — `.dockerignore` keeps `docs/**` and root markdown out of
the context entirely, so every layer is cached apart from those after
`ENV GIT_SHA`. What the gate actually saves is the runner slot, the registry
push, the workflow run and the log noise, not minutes of build time. That is
a small win, stated at its real size.

**Related:** [[Audit - 2026-09-18 CI Docs Fast Path]],
[[Audit - 2026-09-18 Edge Image]] (which owns `tests/core/dockerfile-toolchain.test.ts`, the guard
that keeps the image buildable at all), [[Gate - Docs-Gating Set]].

## Sources

- `tests/core/edge-docs-gate.test.ts`, `tests/core/ci-gates-intact.test.ts`
- `.github/workflows/edge.yml` — the gate step and the three `if:` conditions
- `.dockerignore`, `Dockerfile` — what is actually in the image
- `scripts/lib/docs-only.mjs` — `canSkipImageBuild` and why it is narrower
- `docs/audits/2026-09-18-ci-docs-fast-path/README.md`
