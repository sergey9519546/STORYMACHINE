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
the exact split is above.)

**Live count at review time: 479** (Actions API, 2026-09-18). Runs **472-479
all concluded `skipped`, and all eight came from this lane's own pushes
today** — eight more runs manufactured, while fixing the thing that
manufactures them, by the ordinary act of pushing a branch after every commit
as `docs/LANE_STANDARD.md` §7 requires. That is the defect demonstrating
itself on the diff that removes it, and it is the clearest single argument for
the trigger filter: the cost is not theoretical and it scales with how
carefully the repository is worked.

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

**What the filter does NOT stop.** `workflow_run` has no conclusion filter, so
a **red** CI run on main still creates one Edge run, which the job-level `if:`
then skips. That residue is one run per red push to main — against the
several-per-minute the branch filter removes — and removing it would mean
abandoning `workflow_run`, and with it the "already passed CI" guarantee that
is the whole reason this file exists. It is a deliberate remainder. "The fix"
is a 99%-class reduction, not a total one, and the workflow's own comment now
says so.

**The job-level `if:` is kept in full**, not trimmed as newly redundant. The
trigger filter covers the branch only; `conclusion == 'success'` and
`event == 'push'` are not covered by it at all. `head_branch == 'main'` is
deliberately redundant and kept as the third brace.

#### Correction (round 2, review item 6): why `event == 'push'` is load-bearing

An earlier version of this section, and of `edge.yml`'s own comments, said the
case `event == 'push'` catches is *"a `pull_request`-event CI run targeting
main"*. **That is mechanically wrong, and the review caught it.** `branches:`
on a `workflow_run` trigger matches the upstream run's **`head_branch`** — for
a `pull_request`-event run, the PR's *head* ref, not its base. A PR from
`lane/foo` into `main` therefore has `head_branch == 'lane/foo'` and is
**already excluded by the new filter**. The case described could not occur.

The case that actually survives `branches: [main]` is a pull request whose
**head branch is itself named `main`** — the ordinary shape of a fork
contribution, and `ci.yml:16-17` is `pull_request: branches: ["**"]`, so such
a run exists in this repository. A `workflow_run` workflow runs from the
**default branch with the repository's own token**, and `publish-edge` holds
`packages: write`. `event == 'push'` is therefore the control that stops a
fork's `main` from reaching a registry-write credential: the classic
**"pwn-request"** shape.

This makes the condition **more** load-bearing than the lane originally
claimed, not less — it is a token-scope control, not belt and braces. The
wrong version mattered because the next reader to check it would have found
it false and could reasonably have concluded the condition was dead code and
deleted it. The same correction is applied at `edge.yml`'s `on:` block and at
its `publish-edge` job comment.

### The comment block

The top-of-file block said:

> THIS CANNOT BE PROVEN BY A REAL RUN RIGHT NOW: GitHub Actions is currently
> blocked at the account level for this repository

False since 2026-09-13. Replaced with what the real runs showed: the run
tally, all three failing run IDs, the log excerpt, the Dockerfile fix, the
`branches: [main]` rationale, the head_branch trap, and why the `if:` stays.

### The guards

Two added to `tests/core/ci-gates-intact.test.ts`, beside its existing
edge.yml concurrency assertion, plus a new
`tests/core/dockerfile-toolchain.test.ts`. All three were **shown to fail on
unfixed input** in round 1:

- deleting the live `branches: [main]` line → **exit 1**,
  `not ok 31 - edge.yml filters its workflow_run trigger to 'branches: [main]'`.
  Note the file still contained the string twice *in prose* at that moment;
  comment lines are stripped first, which is why the guard still went red.
- collapsing the `if:` to `head_branch` alone, as if the trigger filter made
  the other two conditions redundant → **exit 1**,
  `not ok 32 - edge.yml keeps all three job-level 'if:' conditions`.

#### Round 2: all three guards were green on input that cannot work

Round 1 satisfied `docs/LANE_STANDARD.md` §3's letter — each guard was shown
red on the unfixed file — and missed its point. The reviewer defeated every
one of the three by an ordinary edit from the family it claims to block:

| defeat | round-1 result | image / workflow |
|---|---|---|
| `RUN apk add --no-cache curl && echo "dropped: python3 make g++"` | **11/11 green** | cannot build |
| `RUN apk add --no-cache python3 make g++ && apk del python3 make g++` | **11/11 green** | cannot build |
| `RUN npm ci && apk add --no-cache python3 make g++` | **11/11 green** | cannot build |
| `branches: [main]` moved to a sibling `push:` trigger | **49/49 green** | 467-skipped-runs defect restored |
| job-level `if:` demoted to a step-level `if:` | **49/49 green** | every CI completion on main creates a real run holding `packages: write` |

The common shape is that all five **move text rather than delete it**, and all
three guards were reading text rather than structure. The fix in each case is
a stronger guard, never a narrower one:

- the Dockerfile parser now splits each `RUN` into **shell commands** (`&&`,
  `||`, `;`, `|`, newlines, quote-aware) and counts a package only when it is
  an argument of an actual `apk add` **command**, with a later `apk del`
  taking it away again — and evaluates install-vs-`npm ci` ordering over those
  steps, so same-instruction and cross-instruction read identically;
- the workflow assertions now read the **parsed path** —
  `on.workflow_run.branches` and `jobs.publish-edge.if` — through one
  indentation-aware block-mapping walk, so a sibling trigger and a step-level
  `if:` are simply not at the path being asserted.

Every one of the five defeats is now pinned as a permanent fixture, so each is
prevented forever rather than fixed once. Counts: **21** tests in
`dockerfile-toolchain.test.ts` (was 11), **51** in `ci-gates-intact.test.ts`
(was 49), 0 deletions against `origin/main` in the latter.

Round 2 also closed four **false positives** the round-1 parser had on
Dockerfiles that build correctly — an `ARG`-parameterised package list, a
`RUN <<EOF` heredoc, `FROM <stage> AS <name>` stage inheritance, and
`FROM --platform=… <image>` — and replaced the header's *"It fails only
when…"* with what the guard actually checks and where it still fails closed. A
guard that cries wolf on ordinary Dockerfiles is a guard that gets deleted.

### A note on this file and the doc-quality hook

`scripts/pre-commit.sh`'s documentation check reports one **high-severity,
non-blocking** `FILLER CLICHES` hit — the rule that shortens the three-word
filler phrase beginning `in order` down to a plain `to` — at **line 298 of
this file** (`docs/audits/2026-09-18-edge-image/README.md`; the round-1 lane
report cited it as "README.md:290", which reads as the repository README and
is not where it is). The line is inside an *italicised, quoted* sentence
lifted verbatim from GitHub's events-that-trigger-workflows reference, and the
reviewer independently fetched that page and got the same words back.

**It is deliberately left alone.** Editing a quotation to satisfy a prose
linter would make the citation false, which is a worse defect than the cliché.
The hook's own output ends `⚠️ WARNING: 1 AI patterns detected (non-blocking)`
and `✓ Documentation quality check passed`.

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
- `tests/core/dockerfile-toolchain.test.ts` — new, **21 tests** (11 in round 1;
  round 2 rebuilt the parser and pinned every defeat as a fixture).
- `tests/core/ci-gates-intact.test.ts` — **51 total** (49 in round 1), two
  fixtures added in round 2; 281 added / **0 deleted** against `origin/main`.
- `docs/audits/2026-09-18-edge-image/review.md` — the independent review and
  the round-2 closure section.

---

## What is proven, and what is not, until the first green push to main

The review drew this boundary precisely and it is worth keeping where a future
reader will find it. **The `:edge` image is still unpublished**, so several
claims in this document are established by construction and local evidence
rather than by a real run.

### Transfers from the evidence here

- **`Dockerfile:55` is what unblocks `npm ci`.** The unfixed file reproduces
  run 34794216577's error verbatim on a real `node:22-alpine` container, and
  the fixed one builds. The diagnosis, the minimum package set (`python3` and
  `make` load-bearing, `g++` deliberate headroom) and the claim that no C++ is
  compiled are all established independently of CI, across three container
  builds one package at a time.
- **The `runner` stage that was built is the shipped one** — sha256-identical
  text against an independently generated sandbox overlay — and the image it
  produces boots, serves `/health`, `/ready` and the SPA, and writes SQLite
  through better-sqlite3's musl prebuild as uid 1000.
- **The toolchain does not ship**: `python3 python make g++ gcc cc` are all
  absent from the runner.
- **GHCR authentication already works on the real runner.** In run
  34794216577, steps 1-5 — `actions/checkout@v4`, `Log in to GitHub Container
  Registry`, `Set up Docker Buildx` and `Compute lowercase image name` — all
  concluded **success**. Only step 6, `Build and push :edge`, failed. So the
  login half of the publish path is exercised and green; it is the build and
  the push that are not.

### Does NOT transfer — unexercised until a real green push to main

1. **apk and npm resolution on GitHub's network.** Every build here reached
   `dl-cdn.alpinelinux.org` and `registry.npmjs.org` through this session's
   MITM proxy. The CI path is strictly simpler, but "apk resolves
   python3/make/g++ on a GitHub runner" is inferred, not observed.
2. **The push itself.** **No `docker push` to ghcr.io has ever succeeded from
   this repository.** `packages: write`, the lowercased image name, the three
   OCI labels and the `:edge` tag are therefore **all unexercised**. A
   package-visibility or org-policy refusal would surface here and nowhere
   earlier.
3. **The new `branches: [main]` filter has never fired.** Its semantics are
   confirmed by GitHub's documentation and by the head_branch correlation
   above, and the YAML nests it at the right path, but the first real evidence
   is *the absence* of skipped Edge runs after the next lane push and *the
   presence of exactly one* after the next green push to main.
4. **The end-to-end path as one piece.** "A green push to main publishes
   `:edge`" is untested as a single path. The first green push to `main` after
   this merges is the test, and it is worth watching that one run rather than
   assuming it.
5. **`release.yml`'s `publish` job.** It builds the same `Dockerfile` and was
   broken for the same reason, so this fix repairs it **by construction** — but
   no tagged release has been cut to prove it.

None of this is a reason to withhold the merge. It is the honest boundary of
what a sandbox and a handful of commits can show.
