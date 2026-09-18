# 2026-09-18 — Edge Image: the container path had never once worked

Lane `lane/edge-image-real`, branched from `origin/main` at `be2341ac`.

Two defects, both measured, both real. Neither was visible from inside the
repository, because until 2026-09-13 GitHub Actions was blocked at the account
level and `.github/workflows/edge.yml` had never actually executed.

---

## Defect 1 — the Docker image had never built

### The failing runs

`edge.yml` made three real build attempts once the block lifted. All three
failed at the same step, `Build and push :edge`, and **none ever succeeded**:

| run | number | date | upstream CI branch | outcome |
|---|---|---|---|---|
| 34752889476 | 437 | 2026-09-13T10:50:25Z | main | failure |
| 34753539471 | 438 | 2026-09-13T11:05:42Z | main | failure |
| 34794216577 | 468 | 2026-09-14T00:55:32Z | main (`be2341ac`) | failure |

**A correction to the lane brief:** the brief named 34794216577 as the FIRST
real run. It is the third and most recent; the first was 34752889476, about
14 hours earlier. It is, however, the run on `be2341ac` — the exact commit
this lane branched from. Both logs were downloaded and grepped; the cause is
identical in each.

### The log

From run 34794216577 (`.github/workflows/edge.yml`, job `publish-edge`, step 6):

```
> [deps 4/4] RUN npm ci:
npm error command sh -c node-gyp rebuild
npm error gyp ERR! find Python Python is not set from command line or npm configuration
npm error gyp ERR! stack Error: Could not find any Python installation to use
npm error gyp ERR! cwd /app/node_modules/better-sqlite3
ERROR: failed to build: failed to solve: process "/bin/sh -c npm ci" did not complete successfully: exit code: 1
```

`.github/workflows/release.yml`'s `publish` job builds the same `Dockerfile`
and would have failed identically, so the entire container delivery path was
broken.

### What is actually wrong — not the usual alpine/musl story

The received explanation for this failure on alpine is "better-sqlite3 has no
musl prebuild, so it must compile from source." **That is not what is
happening here, and the difference matters if this is ever re-diagnosed.**

better-sqlite3 13.0.3 **does** ship a musl prebuild. It is bundled inside the
npm tarball — `node_modules/better-sqlite3/prebuilds/linuxmusl-x64.node`,
alongside `linuxmusl-arm64` and the glibc/darwin/win32 variants. Nothing is
downloaded, and there is no `prebuild-install` step that could fail. The
package has no `install` script either; npm runs `node-gyp rebuild` implicitly
because `binding.gyp` is present.

That `binding.gyp` is written to be a no-op in exactly this case. Its own
comment:

```
# npm's implicit node-gyp rebuild should do nothing when the package
# contains a prebuild for the host. Explicit build scripts override this.
'force_build%': 0,
'prebuild_exists%': '<!(node lib/binding.js)',
```

With a host prebuild present, both of its targets become `'type': 'none'` and
**no C++ is compiled**. The failure is upstream of the compiler: node-gyp's
`configure` step runs gyp, which is a Python program, before it can evaluate
`binding.gyp`'s conditions at all, and its `build` step then invokes `make`
over the empty generated makefiles. `node:22-alpine` ships neither.

### Evidence — measured one package at a time

Docker **is** available in this sandbox (`docker version` reports Engine
29.3.1; the daemon was not running and was started manually). Nothing below is
unverified.

One sandbox-only accommodation, disclosed for honesty: the session's egress
proxy re-terminates TLS, so containers cannot reach `registry.npmjs.org`
without the proxy CA. The first `docker build` on the unfixed tree therefore
died at `npm ci` with `SELF_SIGNED_CERT_IN_CHAIN` (masked by npm as `Exit
handler never called!`) — a sandbox artifact, not the defect. All builds below
were run against a generated overlay Dockerfile that injects
`/root/.ccr/ca-bundle.crt` via a `--build-context`, per the proxy's own
documented workaround. **The overlay injects the CA into the `deps` and
`builder` stages only; the `runner` stage is byte-identical to the shipped
Dockerfile's** (verified with `diff`), so the runtime verification below
exercises the real image. TLS verification was never disabled.

| build | toolchain in `deps` | `npm ci` | what happened |
|---|---|---|---|
| unfixed tree | none | **exit 1** | `gyp ERR! find Python ... Could not find any Python installation to use` — byte-for-byte the CI failure |
| candidate A | `python3` | **exit 1** | configure passes, then `gyp ERR! stack Error: not found: make` |
| candidate B | `python3 make` | **exit 0** | nothing compiled; runtime resolves the prebuild |
| shipped fix | `python3 make g++` | **exit 0** | full multi-stage build completes |

Candidate B is the decisive one. With `python3 make` installed,
`build/Release/` contains only empty `obj.target/` and `.deps/` directories —
**no `better_sqlite3.node` was produced** — and
`lib/binding.js`'s `getPrebuildPath()` resolves to
`/app/node_modules/better-sqlite3/prebuilds/linuxmusl-x64.node`. The
`binding.gyp` comment is telling the truth.

`python3` and `make` are therefore load-bearing. **`g++` is not used today**
and is included deliberately as headroom, so that a native dependency which
does *not* ship a musl prebuild compiles from source instead of failing with a
cryptic missing-compiler error. That is stated at the site rather than implied.

### The full build, and the image actually running

`docker build .` on the fixed tree: **exit 0**, final export 35.9 s, image
1.5 GB (large by design — the `deps` stage installs devDependencies because
the runner's `CMD` is `npx tsx server.ts`, a tradeoff the Dockerfile already
documents).

An image that builds but cannot boot is not a fix, so the image was run:

```
docker run -d --name sm-verify -p 13000:3000 sm-fixed
```

| probe | result |
|---|---|
| `GET /health` | **200** after 5 s — `{"status":"ok","version":"unknown","commit":"dev",...}` |
| `GET /ready` | **503** `{"ready":false,"reason":"doctor_pool_warming"}` while warming, then **200** `{"ready":true}` |
| container `HEALTHCHECK` | `starting` → **`healthy`** |
| `GET /` (SPA from `dist/`) | **200** |

`/health` reporting `version: unknown` / `commit: dev` is correct for a build
with no `--build-arg`: `server/lib/build-info.ts` treats those as expected
fallbacks, and `release.yml` supplies the real values.

Startup logs confirm the documented keyless mode
(`startup_keyless`, "starting in analysis-only mode") and
`session_persistence dir=/app/data/sessions`.

### The native module at runtime, not merely installed

`better-sqlite3` is imported under `server/**` by `server/lib/backup.ts`,
`server/nvm/state/NarrativeState.ts`, `server/nvm/state/from-stage.ts`,
`server/engine/Stage.ts` and `server/routes/game.ts`, all reaching disk
through `server/lib/session-store.ts`.

Exercised two ways inside the running container, as the non-root `node` user
(uid 1000):

1. **Through the app's own route.** `GET /api/state?sessionId=edgeverify` →
   200, and `/app/data/sessions/` went from empty to:
   ```
   -rw-r--r-- 1 node node   4096 edgeverify.db
   -rw-r--r-- 1 node node  32768 edgeverify.db-shm
   -rw-r--r-- 1 node node 486192 edgeverify.db-wal
   ```
   Real SQLite files, WAL sidecars included, written by the user the process
   actually runs as — which is what the Dockerfile's `chown -R node:node /app`
   exists to make possible.

2. **Directly.** `require('better-sqlite3')`, `PRAGMA journal_mode = WAL`,
   `CREATE TABLE`, insert, select → `{ x: 'native-ok' }`, `sqlite_version
   3.53.4`. `getPrebuildPath()` returned the `linuxmusl-x64.node` path.

**musl/glibc consistency, verified rather than assumed.** The runner copies
`node_modules` wholesale out of `builder`, so a mismatch here would fail at
`require()`, not at build. `ldd` on the loaded binary inside the runner:

```
/lib/ld-musl-x86_64.so.1
libc.musl-x86_64.so.1 => /lib/ld-musl-x86_64.so.1
libstdc++.so.6 => /usr/lib/libstdc++.so.6
libgcc_s.so.1 => /usr/lib/libgcc_s.so.1
```

musl-linked, matching the alpine runner. (`ldd` additionally reports
`napi_* : symbol not found`; those are supplied by the `node` binary at load
time rather than by a shared library, and the successful `require()` above is
the proof that resolution works.)

**The toolchain does not ship.** Inside the running image, `python3`, `make`,
`g++`, `gcc` and `cc` are all absent, and `apk info` lists none of them. The
`apk add` stays in `deps`; `builder` runs no `npm ci` of its own and `runner`
only copies.

### The regression guard

`tests/core/dockerfile-toolchain.test.ts`, following the shape-not-text
approach of `tests/core/ci-gates-intact.test.ts`. It parses the Dockerfile
into stages and asserts, for **every** stage that runs `npm ci` rather than
hardcoding `deps`, that `python3`/`make`/`g++` are `apk add`ed earlier in that
same stage; that the final stage installs none of them and runs no `npm ci`;
and that all stages agree about libc.

Comment lines are stripped and backslash continuations joined first. That is
load-bearing: the Dockerfile's own explanation names all three packages in
prose, so a raw grep would keep passing after the live line was commented out.

**Shown to fail on unfixed input, per `docs/LANE_STANDARD.md` §3.** Deleting
the live `RUN apk add --no-cache python3 make g++` line from the real
Dockerfile — leaving the explanatory comment in place — turns the suite RED,
**exit 1**, with one finding per package, each naming run 34794216577:

```
not ok 2 - every stage that runs `npm ci` installs python3, make and g++ first (run 34794216577)
    'stage "deps" runs `npm ci` without installing python3 (run 34794216577 failed exactly this way)',
    'stage "deps" runs `npm ci` without installing make (run 34794216577 failed exactly this way)',
    'stage "deps" runs `npm ci` without installing g++ (run 34794216577 failed exactly this way)'
```

Restoring the line returns it to 11/11. Six further fixture cases pin both
directions in-suite: the verbatim pre-fix `deps` stage fires; a fixed one does
not; a commented-out apk line does not satisfy the check; a toolchain
installed after `npm ci` fires as "too late"; one installed in a different
stage fires; a wrapped, backslash-continued apk line still counts.

---

## Defect 2 — Edge Image clutters the run history

### The arithmetic

`edge.yml`'s first **471** runs, tallied against the Actions API on 2026-09-18:

```
skipped          467
startup_failure    1
failure            3   (34752889476, 34753539471, 34794216577)
success            0
                 ---
                 471
```

467 of 471 — 99.2% — were pure noise, and **no `:edge` image has ever been
published**. (The brief's "~470 skipped" is right to one significant figure;
the exact split is above. The count has since passed 471: this lane's own
pushes manufactured run 472, which is the defect demonstrating itself.)

### The cause

```yaml
on:
  workflow_run:
    workflows: ["CI"]
    types: [completed]
```

`workflow_run` fires on every completion of CI on **every** branch, so each
lane push created a whole Edge Image run whose only purpose was to evaluate
the job-level `if:` to false and skip. The existing
`concurrency: {group: edge-image, cancel-in-progress: true}` cannot help: a
skipped run never contends for the group, because it skips before it starts.

### The trap, and the evidence that defeats it

A `workflow_run`-triggered run reports the `head_sha`/`head_branch` of the
**workflow file's** ref, not of the upstream run. All 471 runs therefore list
`main`, which makes it look as though main triggered every one. It did not.

Correlating each Edge run against the CI run that completed immediately before
it recovers the real upstream branch:

```
edge run     #    conclusion  reported   actual upstream CI
34794990665  471  skipped     main    <- CI 34794578018 on lane/story-bench
34794607744  470  skipped     main    <- CI 34794222989 on lane/story-bench
34794240249  469  skipped     main    <- CI 34794135433 on lane/story-bench
34794216577  468  FAILURE     main    <- CI 34793742299 on main
34794193894  467  skipped     main    <- CI 34793740570 on lane/necessity-certificate
34793560126  466  skipped     main    <- CI 34793068266 on lane/necessity-certificate
```

The one run that actually executed is the one whose upstream CI really was on
main. Every neighbour came from a lane branch.

### The fix

```yaml
on:
  workflow_run:
    workflows: ["CI"]
    types: [completed]
    branches: [main]
```

`branches` on a `workflow_run` trigger matches the branch of the **triggering
(upstream)** run — confirmed against GitHub's events-that-trigger-workflows
reference: *"You can use the `branches` or `branches-ignore` filter to specify
what branches the triggering workflow must run on in order to trigger your
workflow."* A CI completion on a lane branch now creates no Edge run at all.

**The job-level `if:` is kept in full**, not trimmed as newly redundant. The
trigger filter covers the branch only; `conclusion == 'success'` and
`event == 'push'` are not covered by it at all, since `workflow_run` still
fires for a failed CI run on main and for a `pull_request`-event CI run
targeting main. `head_branch == 'main'` is deliberately redundant and kept as
the third brace.

### The comment block

The top-of-file block said:

> THIS CANNOT BE PROVEN BY A REAL RUN RIGHT NOW: GitHub Actions is currently
> blocked at the account level for this repository

False since 2026-09-13. Replaced with what the real runs showed: the run
tally, all three failing run IDs, the log excerpt, the Dockerfile fix, the
`branches: [main]` rationale, the head_branch trap, and why the `if:` stays.

### The guards

Two added to `tests/core/ci-gates-intact.test.ts`, beside its existing
edge.yml concurrency assertion. Both **shown to fail on unfixed input**:

- deleting the live `branches: [main]` line → **exit 1**,
  `not ok 31 - edge.yml filters its workflow_run trigger to 'branches: [main]'`.
  Note the file still contained the string twice *in prose* at that moment;
  comment lines are stripped first, which is why the guard still went red.
- collapsing the `if:` to `head_branch` alone, as if the trigger filter made
  the other two conditions redundant → **exit 1**,
  `not ok 32 - edge.yml keeps all three job-level 'if:' conditions`.

---

## What was deliberately not done

- **No PR, no merge, no push to main**, per the lane brief.
- **`AUC24_FLOOR` and the public-benchmark floors untouched.** No scoring-path
  file was changed; `node scripts/check-scoring-receipt.mjs` reports none, so
  no measurement receipt is due.
- **The `:edge` image is still unpublished.** This lane proves the image
  builds and boots locally; only a green push to `main` can produce the first
  successful `edge.yml` run, and that is the owner's to trigger.
- **Image size was not optimised.** 1.5 GB comes from installing
  devDependencies so the runner can `npx tsx server.ts` — an existing,
  documented tradeoff, out of scope here and not worth smuggling into a fix
  for a different problem.

## Files

- `Dockerfile` — `apk add --no-cache python3 make g++` in `deps`, with the
  measured rationale at the site.
- `.github/workflows/edge.yml` — `branches: [main]` on the trigger; comment
  block rewritten; job-level `if:` unchanged.
- `tests/core/dockerfile-toolchain.test.ts` — new, 11 tests.
- `tests/core/ci-gates-intact.test.ts` — two tests added, 49 total.
