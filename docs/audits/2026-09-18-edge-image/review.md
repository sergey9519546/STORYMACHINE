# Independent review — `lane/edge-image-real`

**Tip reviewed: `8857fbdbcb3a4c3461786554063b619319cb6144`** (four commits on
`origin/main` = `be2341ac`). Reviewer worktree `<session scratch>/wt-edge-review`,
detached at that SHA; scratch paths below are written as `<session scratch>`.
Reviewer did not write any of the code under review and modified none of it —
every mutation described here was made in the worktree, measured, and reverted
(`git status --porcelain` empty after each).

## Verdict: REVISE

Both defects are real, both fixes are correct, and I reproduced the lane's
runtime evidence independently from scratch — including the exact CI failure,
the `python3`-only and `python3 make` intermediate states, a full image build,
and a booted container serving `/health`, `/ready`, the SPA and a real
better-sqlite3 write as uid 1000. **Nothing about the Dockerfile fix or the
`branches: [main]` fix needs rework.**

What needs revision is the part of the lane that is supposed to make those
fixes durable. The three new guards are all shown to go red on the un-fixed
input, as `docs/LANE_STANDARD.md` §3 requires — but each of them can be
satisfied by an edit from the same family it claims to block, and one of those
edits silently re-opens the exact 467-skipped-runs defect. The lane's own
files claim more precision than they have. Items 1–5 below are each a few
lines.

---

## 1. `tests/core/dockerfile-toolchain.test.ts:137-142` — `apkAdds()` is a token search, not an install check; three false greens

`apkAdds()` returns true when a logical instruction starts with `RUN`, contains
the substring `apk add`, and has the package name as a whitespace-delimited
token *anywhere* in the line. It never checks that `apk add` is the command
being run or that the token is one of its arguments. Measured on the real
Dockerfile, each mutation applied alone, `node --experimental-strip-types
tests/core/dockerfile-toolchain.test.ts`:

| mutation to `Dockerfile:55` | image would build? | guard |
|---|---|---|
| line deleted, comment left | **no** | 10/11, **red** ✓ |
| line commented out | **no** | 10/11, **red** ✓ |
| `apk add` moved to `builder` | **no** | 10/11, **red** ✓ |
| `RUN apk add --no-cache curl && echo "dropped: python3 make g++ (no longer needed)"` | **no** | **11/11 GREEN** ✗ |
| `RUN apk add --no-cache python3 make g++ && apk del python3 make g++` | **no** | **11/11 GREEN** ✗ |

The second of those is the standard alpine slimming idiom written slightly
wrong, and the first is what a leftover note looks like after exactly the
"someone trimming an image-size layer" edit the file's header (`:19-21`) says
this test exists to stop.

**Fix:** require the token to appear after the `apk add` on the same command —
e.g. split the instruction on `&&`/`;`, keep only segments whose first two
tokens are `apk add`, and search those. Three lines.

## 2. `tests/core/dockerfile-toolchain.test.ts:176-189` — the ordering check cannot see inside one instruction

`npmCiAt` and `addedAt` are indices into `stage.instructions`, so two commands
joined inside a single `RUN` compare equal and the `addedAt > npmCiAt` branch
never fires. Measured:

```
Dockerfile:62  RUN npm ci  ->  RUN npm ci && apk add --no-cache python3 make g++
result: 11 pass / 0 fail   (the image cannot build — the toolchain arrives after node-gyp needs it)
```

This is the same bug class as the "too late" fixture at `:298-306`, which only
covers the separate-`RUN` form. A same-instruction ordering check (index of
`apk add` vs index of `npm ci` within the joined string, when both are in one
instruction) closes it.

## 3. `tests/core/dockerfile-toolchain.test.ts:45-49` — the header's "It fails only when…" is an overclaim in both directions

The comment reads: *"It fails only when the stage that runs `npm ci` can no
longer compile a native addon, when the toolchain leaks into the shipped runner
stage, or when the stages stop agreeing about libc."* Items 1 and 2 above are
the false-negative half. The false-positive half, measured, on Dockerfiles that
build correctly:

| legitimate shape | guard |
|---|---|
| `ARG TOOLCHAIN="python3 make g++"` + `RUN apk add --no-cache $TOOLCHAIN` | red (1 fail) |
| `RUN <<EOF` heredoc containing `apk add --no-cache python3 make g++` | red (1 fail) |
| `FROM deps AS builder` (stage inheritance) with a `npm ci` in it | red (2 fails) |
| `FROM --platform=$BUILDPLATFORM node:22-alpine AS deps` | red (2 fails) |

Two of these come from `libcFamily()` at `:151-153`, which maps any base string
without `alpine` in it to `glibc` — including a *stage alias*, so
`FROM deps AS builder` is reported as a musl/glibc split that does not exist.
`parseStages()`'s `FROM` regex at `:117` also refuses any `FROM` carrying a
flag, which silently drops the stage. Failing closed is the right direction for
a guard, but the header should say so rather than claim the opposite; and the
`FROM <stage> AS <name>` case is common enough to be worth handling (resolve
the alias to the aliased stage's base) rather than documenting.

Split across two `RUN apk add` lines, and a backslash-continued line, both
correctly stay green — those two attacks found nothing.

## 4. `tests/core/ci-gates-intact.test.ts:538-552` — `branches: [main]` is asserted anywhere inside `on:`, not under `workflow_run:`

`onBlock` captures the whole `on:` block and the assertion at `:547` matches
`branches: [main]` anywhere in it. Measured on the real `edge.yml`:

```yaml
on:
  workflow_run:
    workflows: ["CI"]
    types: [completed]        # <- filter REMOVED from the trigger
  push:
    branches: [main]          # <- filter now belongs to a different trigger
```
```
result: 49 pass / 0 fail
```

That is the 467-skipped-runs defect back in the file, with the guard green.
Adding a sibling trigger to a `workflow_run` workflow is an ordinary edit. The
fix is to slice the `workflow_run:` sub-block out of `onBlock[1]` first (same
indentation walk `topLevelConcurrencyBlock` at `:56-69` already does) and match
inside that.

Both of the lane's own red-on-unfixed demonstrations reproduce exactly:
deleting the live line → `not ok 31`, commenting it out → `not ok 31`, in both
cases while the string `branches: [main]` is still present twice in prose.
**The comment-stripping is genuinely load-bearing and it works.** I also
confirmed a `run: |` block scalar containing `branches: [main]` does not shadow
a deleted live line (it falls outside the `on:` capture), and that a `#` inside
a quoted string is not mistaken for a comment. Same for the Dockerfile parser:
a comment sitting *inside* a backslash continuation is dropped before the join,
so commented-out package names cannot be smuggled into a logical line — I
verified that directly.

## 5. `tests/core/ci-gates-intact.test.ts:567-577` — the three `if:` conditions are searched over the whole file, not the job's `if:`

The test is named "keeps all three **job-level** `if:` conditions" but
`live.includes(condition)` at `:573` is an unanchored substring search over the
entire comment-stripped file. Measured:

```
delete the job-level `if:` at edge.yml:110-113 entirely,
demote the identical three conditions to a step-level `if:` on "Build and push :edge"
result: 49 pass / 0 fail
```

That change is not cosmetic: with no job-level `if:`, every completed CI run on
`main` — including a red one — creates a *real* Edge run that checks out the
commit, logs in to GHCR and sets up Buildx with `packages: write` granted
(`edge.yml:119-121`), and only the last step declines to build. It reintroduces
the noise this lane removed and widens the token's blast radius, and the guard
cannot see it. Scope the search to the `publish-edge` job's `if:` block.

## 6. `.github/workflows/edge.yml:82` and `:107`, `docs/audits/2026-09-18-edge-image/README.md:296-297` — the stated reason for `event == 'push'` is mechanically wrong

All three say the surviving case is *"a `pull_request`-event CI run targeting
main"* / *"whose own event was `pull_request` against main"*. `branches:` on a
`workflow_run` trigger matches the upstream run's **`head_branch`**, and for a
`pull_request`-event run that is the PR's *head* ref, not its base. A PR from
`lane/foo` into `main` is therefore already excluded by the new filter, and the
sentence describes a case that cannot occur.

The condition is still load-bearing — arguably more so than the lane claims.
The case that actually survives `branches: [main]` is a pull request whose
**head branch is itself named `main`**, i.e. the ordinary shape of a fork
contribution. `ci.yml:16-17` is `pull_request: branches: ["**"]`, so such a run
exists here. A `workflow_run` workflow runs from the default branch with the
repository's own token, so `event == 'push'` is the control that stops a fork's
`main` from reaching a job holding `packages: write` — the classic
"pwn-request" shape, not merely belt and braces. Say that instead; the next
reader who checks the current sentence will find it false and may conclude the
condition is dead.

## 7. Minor

- `docs/audits/2026-09-18-edge-image/README.md` §"Defect 2" — "the count has
  since passed 471": it is **479** as of this review (API, 2026-09-18), runs
  472-479 all `skipped`, all from this lane's own pushes today. Fine as
  written; noting the live number for the record.
- The lane report cites the doc-quality warning as "`README.md:290`". It is
  `docs/audits/2026-09-18-edge-image/README.md:290`, not the repository README.
- `tests/core/ci-gates-intact.test.ts:533-536` and `:562-565` add a **fourth**
  inline copy of `filter(l => !l.trim().startsWith('#'))` to a file that already
  has three (`:57`, `:82`, `:121`). `docs/LANE_STANDARD.md` §1 calls a second
  copy of a regex a defect. One `liveLines(source)` helper.

---

## What I verified, with the commands and numbers

### The brief's premise was wrong and the lane's correction is right

Verified from the installed package and from real container builds, not from
the lane's table.

- `node_modules/better-sqlite3/package.json` → **13.0.3**; `scripts` contains
  `build-release`, `build-debug`, `test`, `benchmark`, `download`, `clean` —
  **no `install`, no `preinstall`, no `postinstall`**. `npm ci` therefore runs
  `node-gyp rebuild` only because `binding.gyp` exists.
- `node_modules/better-sqlite3/prebuilds/` contains all eight prebuilds
  including **`linuxmusl-x64.node`**, present in the extracted tarball with no
  network step.
- `binding.gyp` carries the quoted comment verbatim and makes both targets
  `'type': 'none'` unless `force_build==1 or prebuild_exists==0`.
- It is the **only** `binding.gyp` in the whole dependency tree (searched
  `node_modules` to depth 3); the only other install-time scripts are
  `esbuild` and `protobufjs` postinstalls, neither of which compiles.

Three container builds, `docker build --target deps`, one package at a time:

| `deps` toolchain | exit | what happened |
|---|---|---|
| none (line deleted) | **1** | `npm error command sh -c node-gyp rebuild` / `gyp ERR! find Python ... Could not find any Python installation to use` / `cwd /app/node_modules/better-sqlite3` — byte-for-byte run 34794216577 |
| `python3` | **1** | configure passes, then `gyp ERR! stack Error: not found: make` |
| `python3 make` (**no g++**) | **0** | build succeeds |

Inside the `python3 make` image, as shipped:

```
g++ absent   gcc absent   cc absent   c++ absent
/app/node_modules/better-sqlite3/build/Release/ -> only empty .deps/ and obj.target/
find build -name '*.node' -> (nothing)
require('better-sqlite3'); PRAGMA journal_mode=WAL; CREATE/INSERT/SELECT
  -> {"x":"native-ok"},  sqlite_version 3.53.4
```

**The lane's correction is correct in every particular: no C++ is compiled,
nothing is downloaded, the failure is gyp-the-Python-program, and `g++` is
unused today.** `sqlite_version 3.53.4` matches the lane's figure exactly.

### Is shipping the unused `g++` right?

Yes, and the label is honest. `Dockerfile:40-44` says, in the live file:
*"python3 and make are therefore REQUIRED. g++ is deliberately included on top:
it is unused by better-sqlite3 13.0.3, and is here so that a native dependency
which does NOT ship a musl prebuild compiles from source instead of failing
with a cryptic missing-compiler error."* That names the package, the version,
the fact of non-use and the purpose. It does not imply necessity anywhere, and
`tests/core/dockerfile-toolchain.test.ts:40-43` repeats the same distinction.
The cost is confined to the `deps` stage and I confirmed it does not reach the
shipped image (below), so it is build-time disk, not shipped bytes. Keeping it
is defensible on the lane's stated reasoning; the only thing that would have
made it wrong is a comment that implied it was load-bearing, and it says the
opposite. **No change requested.**

### The sandbox accommodation

I did not use the lane's overlay. I generated my own from the shipped
`Dockerfile`, inserting the same three lines (`COPY --from=ca`, append to
`/etc/ssl/certs/ca-certificates.crt`, `ENV NODE_EXTRA_CA_CERTS`) after the
`FROM … AS deps` and `FROM … AS builder` lines only.

- **Runner stage byte-identical**: `awk '/^FROM node:22-alpine AS runner/,0'`
  over both files → `diff` clean,
  `sha256 8e22ebac56d5c620647845d6a6f7420959cce56bcc6a07f29aafd5832b2b4989` on
  both. The lane's claim reproduces on an independently constructed overlay.
- **Does the CA change what npm does?** No. It changes trust only. The registry
  is unchanged, `package-lock.json` is unchanged and is what `npm ci` resolves
  from, and npm's per-tarball `integrity` (sha512) verification is unaffected by
  which CA signed the transport — a substituted artifact would still fail the
  lockfile hash. No `--no-audit`, no `--ignore-scripts`, no registry override
  appears anywhere.
- **Was TLS verification ever disabled?** No. Greps for
  `NODE_TLS_REJECT_UNAUTHORIZED`, `strict-ssl`, `--insecure`,
  `rejectUnauthorized`, `GIT_SSL_NO_VERIFY`, `--allow-untrusted` over the lane
  diff, the whole tree at the lane tip, my overlay files and every build log:
  **zero hits**. The lane's diff adds nothing of the kind. The failure mode that
  forced the overlay is visible in my first attempt, which used the shipped
  Dockerfile unmodified and died at `apk`, not at npm:
  `WARNING: fetching https://dl-cdn.alpinelinux.org/... TLS: server certificate not trusted`.

### The full image, built and driven

`docker build` (all stages, my overlay, `--build-context ca=/root/.ccr`):
**exit 0, 42.6 s, 1.5 GB** — the lane's size figure reproduces.

`docker run -d -p 13100:3000`, then:

| probe | result |
|---|---|
| `id` inside the container | `uid=1000(node) gid=1000(node)` |
| `GET /health` | **200**, `{"status":"ok","version":"unknown","commit":"dev",…}` |
| `GET /ready` at +6 s | **503** |
| `GET /ready` at +26 s | **200** `{"ready":true}` |
| container `HEALTHCHECK` | **`healthy`** |
| `GET /` (SPA) | **200 text/html** |
| `GET /api/state?sessionId=edgeverify` | **200** |
| `/app/data/sessions/` after that call | `edgeverify.db` 4096, `-shm` 32768, `-wal` 486192, all `node node` |
| `python3 python make g++ gcc cc` in the runner | **all absent** |
| `ldd` on the loaded prebuild | `/lib/ld-musl-x86_64.so.1`, `libc.musl-x86_64.so.1` |

Startup log shows `startup_keyless`, `session_persistence dir=/app/data/sessions`,
`doctor_pool_prewarmed ms=4677`. Every runtime claim in the lane's audit
reproduced. (`ldd` also reports `napi_* symbol not found`; those come from the
`node` binary at load time, and the successful `require()` is the proof.)

### `workflow_run.branches` semantics — re-verified independently

GitHub's *Events that trigger workflows* reference, fetched fresh:
*"You can use the `branches` or `branches-ignore` filter to specify what
branches the triggering workflow must run on in order to trigger your
workflow."* — the upstream run's branch. Same page: *"A workflow run is
triggered regardless of the conclusion of the previous workflow."*

The correlation, checked against the Actions API rather than taken from the
lane's table:

| edge run | conclusion | reported `head_branch` | upstream CI run | upstream branch / event / conclusion |
|---|---|---|---|---|
| 34794216577 (#468) | **failure** | main | 34793742299, completed 00:55:31Z | **main** / push / success |
| 34794990665 (#471) | skipped | main | 34794578018, completed 01:09:26Z | **lane/story-bench** / push / success |

Both edge runs were created within two seconds of their upstream CI completing. The
second is the decisive one: a *successful push-event* CI run that still
produced a skipped Edge run. The only condition that can have failed is
`head_branch == 'main'`, so `github.event.workflow_run.head_branch` was
`lane/story-bench` while the run itself reported `main`. That proves the trap
the lane documents, and proves the field the new `branches:` filter reads.

The workflow also parses: `yaml.safe_load` puts `branches: ['main']` inside
`on.workflow_run` (not beside it), and the job `if:` is intact.

### Does the fix stop the clutter, or relocate it?

Mostly stops it; a small residual is inherent to `workflow_run`, which has no
conclusion filter.

| case | before | after |
|---|---|---|
| push to a lane branch (no PR) | skipped Edge run | **no Edge run** |
| PR from a lane branch into main | skipped Edge run (a second one) | **no Edge run** |
| push to main, CI **red** | skipped Edge run | **still a skipped Edge run** |
| PR whose head branch is named `main` (fork) | skipped Edge run | **still a skipped Edge run**, refused by `event == 'push'` |
| push to main, CI green | run that fails at build | run that builds |

The two survivors are low-volume and unavoidable without abandoning
`workflow_run`, so this is not an incomplete fix in any way worth acting on —
but `edge.yml:60-67` and the audit README should say that a red main still
manufactures one, instead of leaving "the fix" sounding total.

### Gates I ran on the lane tip

| gate | result |
|---|---|
| `npm run lint` | exit 0 |
| `node --experimental-strip-types tests/core/dockerfile-toolchain.test.ts` | **11 tests, 11 pass, 0 fail** |
| `node --experimental-strip-types tests/core/ci-gates-intact.test.ts` | **49 tests, 49 pass, 0 fail** |
| same file at `origin/main` | **47 tests** — the +2 is real |
| `git diff --numstat origin/main..HEAD -- tests/core/ci-gates-intact.test.ts` | **62 added, 0 deleted** — nothing pre-existing weakened |
| `npm run check-brain` / `check-docs` / `honesty-audit` / `check-no-console` / `check-server-reachability` | exit 0 each |
| `node scripts/check-scoring-receipt.mjs origin/main..HEAD` | exit 0, "no scoring-path files changed" |
| **`npm test` (once, on the lane tip)** | **14,072 tests · 13,980 pass · 0 fail · 91 skipped · 1 todo · 556.4 s** |

The full-suite numbers match the lane's report exactly.

### CLAUDE.md constraints

`git diff origin/main..HEAD` contains no `console.` under `server/**` (no
`server/**` change at all), no API key or token material, and no secret written
into any artifact. The `apiKey` prop bindings in `SettingsPanel.tsx` are
untouched.

### The doc-quality warning

Reproduced by running the pre-commit hook: one **high-severity, non-blocking**
`FILLER CLICHES` hit, *"in order to" → to*, at
`docs/audits/2026-09-18-edge-image/README.md:290`. The hook's own output ends
`⚠️ WARNING: 1 AI patterns detected (non-blocking)` and
`✓ Documentation quality check passed`. Line 288-291 is an italicised, quoted
sentence attributed to GitHub's reference, and it is word-for-word what I got
back from that page myself. **Leaving it is right** — editing a quotation to
satisfy a prose linter would make the citation false, which is a worse defect
than the cliché.

### Image size

Agreed with the lane: leave it. The 1.5 GB is `deps` installing
devDependencies so the runner can `npx tsx server.ts`, a tradeoff already
documented at `Dockerfile:58-61` and `:164-169`, and unrelated to either defect
here. Folding a `--omit=dev` prune plus a server compile step into a fix for a
broken `npm ci` would make this diff un-reviewable. Worth a separate lane —
and if one is opened, the cheapest first cut is a fourth stage that runs
`npm ci --omit=dev` for the runner's `node_modules` while `builder` keeps the
dev tree, which needs a real decision about `tsx`-in-prod first. **Not this
lane's to grow.**

---

## Cross-lane ruling — the docs-only image rebuild

**The finding is real, and I proved the "byte-identical image" half of it
directly.** It is also not caused by either lane.

`.dockerignore` denies `**` and allowlists only `package.json`,
`package-lock.json`, `tsconfig.json`, `vite.config.ts`, `index.html`,
`server.ts`, `server/**`, `src/**`, `public/**`, `vite-cache-dir.mjs`. **No
markdown file is in the build context at all**, and `docs/**` is explicitly
re-denied. So a docs-only commit produces a byte-identical context. Measured:
after modifying both `README.md` and a file under `docs/`, a full rebuild was

```
19 of 19 layers CACHED, real 0m0.744s
docker inspect .RootFS.Layers on both images -> identical
```

So today — before `lane/ci-docs-fast-path` merges, and before anything about
this lane — every green push to `main`, docs-only included, already triggers a
full `:edge` build. `lane/ci-docs-fast-path` does not create the problem; it
makes it conspicuous, because CI for a docs push drops to about a minute and
Edge then adds several. **Neither lane owns this. It is a pre-existing property
of `edge.yml` that becomes visible only once the image can build — which is
what this lane fixes.**

**Can a `workflow_run` workflow read the upstream `docs_only` output? No.** The
`workflow_run` payload carries the run object (id, head_sha, head_branch,
event, conclusion, …) and no job or workflow outputs; the Actions REST API
exposes a run's jobs and steps with their *conclusions* but never their
outputs. The three ways to bridge it all cost something:

1. **Read the upstream jobs via the API** (`actions: read` +
   `actions/github-script`) and infer `docs_only` from whether
   `lane/ci-docs-fast-path`'s "Run docs-gating tests" step was `skipped`.
   Works, but couples `edge.yml` to a *step name* inside `ci.yml`, with no test
   able to see the coupling — a rename silently changes Edge's behaviour.
2. **Upload an artifact from `classify` and download it downstream.** The
   documented pattern, and it works, but it means `ci.yml` grows an artifact on
   every run for a consumer in another file, and Edge needs a policy for "no
   artifact" (fail open = no saving; fail closed = a real change never ships).
3. **Reclassify in `edge.yml`.** `github.event.workflow_run` carries no
   `before` SHA, so the push range is not recoverable; a `head_sha^..head_sha`
   diff is wrong for any multi-commit push.

**Recommendation: do none of those. Add a BuildKit cache to `edge.yml`'s build
step** —

```yaml
      - name: Build and push :edge
        uses: docker/build-push-action@v5
        with:
          cache-from: type=gha
          cache-to: type=gha,mode=max
```

— which `edge.yml:153-165` currently has no form of. Because the context is
already identical, the entire `deps` + `builder` chain (the `npm ci` and the
Vite build — all of the multi-minute cost) hits cache on a docs-only push, with
no cross-workflow coupling, no new failure mode, and no way to accidentally
skip a build that was needed: a cache miss simply builds.

One honest caveat I measured. `Dockerfile:81-84` declares `ARG GIT_SHA` /
`ENV GIT_SHA=${GIT_SHA}` near the *top* of the `runner` stage, and `GIT_SHA`
changes on every commit, so the `RUN mkdir` and `RUN chown -R node:node /app`
after it re-run every time:

```
rebuild with --build-arg GIT_SHA=deadbeef: 17 of 19 CACHED, chown re-ran 6.7 s, export 21.4 s
```

That is seconds of build but a fresh top layer to push each time. Moving the
two `ARG`/`ENV` pairs to the **end** of the `runner` stage, after `RUN chown`,
would leave only an empty metadata layer changing per commit. That is a
one-hunk change and a strictly better version of the caching fix.

**Which lane carries it:** neither, as a condition of merge. `edge.yml` is this
lane's file, so it is territorially Edge's, but the cost cannot materialise
until this lane merges and the first image actually builds, and
`docs/LANE_STANDARD.md` §2's "nothing is removed or simplified away" does not
mean a lane must absorb an adjacent optimisation. **Open it as a follow-up
lane** — cache plus the `ARG`/`ENV` reorder, one diff, measurable against a
real `:edge` run. Do not hold either lane for it, and do not build the
cross-workflow `docs_only` plumbing.

### Textual conflicts between the two lanes

Trial-merged both into `origin/main` in a scratch worktree, Edge first:

- `origin/lane/edge-image-real` → **clean**.
- then `origin/lane/ci-docs-fast-path` → **conflict in exactly two files**:
  `docs/brain/GRAPH.md` and `docs/brain/brain.graph.json`.

**The brief's expectation that both lanes touch
`tests/core/ci-gates-intact.test.ts` is wrong** — `lane/ci-docs-fast-path`
does not touch it (its files are `ci.yml`, `release.yml`, `CLAUDE.md`,
`LANE_STANDARD.md`, `scripts/classify-docs-only.mjs`, `scripts/lib/docs-only.mjs`,
`tests/core/docs-only-classify.test.ts`, plus its own audit and brain note).
`edge.yml`, `Dockerfile` and `ci-gates-intact.test.ts` are disjoint from it.

**Merge-order hazard:** only the brain graph. Whichever lane merges second will
conflict on `GRAPH.md` and `brain.graph.json`; both are generated, so the
resolution is `npm run brain` on the merged tree followed by `npm run
check-brain`, not a hand merge of either file. No ordering is safer than the
other.

**Functional compatibility, checked rather than assumed:** I ran this lane's
`tests/core/ci-gates-intact.test.ts` against the *combined* `ci.yml` and
`release.yml` from the merged tree — **49 pass, 0 fail**. The docs fast-path's
new `classify` job, the `needs:` edges and the six new step-level `if:`s do not
trip any of Edge's 49 assertions, and Edge's two new assertions read only
`edge.yml`.

---

## What remains unproven until the owner's first real green push to main

The lane concedes `:edge` is unpublished; here is the precise boundary.

**Transfers from my evidence:**

- That `Dockerfile:55` is what unblocks `npm ci` — the unfixed file reproduces
  the CI error verbatim on a real `node:22-alpine` container, and the fixed one
  builds. The diagnosis, the minimum package set, and the claim that `g++` is
  unused are all established independently of CI.
- That the `runner` stage in my builds is the shipped one (sha256-identical
  text) and that the image it produces boots, serves and writes SQLite as uid
  1000 with musl.
- That the toolchain does not ship.
- That GHCR authentication already works on the real runner: in run
  34794216577 the steps `Run actions/checkout@v4`, `Log in to GitHub Container
  Registry`, `Set up Docker Buildx` and `Compute lowercase image name` all
  concluded **success**, and only step 6 `Build and push :edge` failed.

**Does not transfer:**

1. **The build on GitHub's network.** My builds reached
   `dl-cdn.alpinelinux.org` and `registry.npmjs.org` through this session's
   MITM proxy. The CI path is strictly simpler, but "apk resolves python3/make/g++
   on a GitHub runner" is inferred, not observed.
2. **The push.** No `docker push` to `ghcr.io` has ever succeeded from this
   repository. `packages: write` at `edge.yml:119-121`, the lowercased image
   name at `:149-151`, the three OCI labels and the `:edge` tag itself are all
   unexercised. A package-visibility or org-policy refusal would surface here
   and nowhere earlier.
3. **The new trigger filter firing.** `branches: [main]` has never executed.
   Its semantics are confirmed by GitHub's documentation and by the head_branch
   correlation above, and the YAML nests it correctly, but the first real
   evidence is the absence of skipped Edge runs after the next lane push, and
   the presence of exactly one Edge run after the next green push to main.
4. **The end-to-end assertion "a green push to main publishes `:edge`."**
   Untested as one path. The first green push to `main` after this merge is the
   test; it is worth watching that single run rather than assuming.
5. **`release.yml`'s `publish` job.** It builds the same `Dockerfile` and was
   broken for the same reason; this fix repairs it by construction, but no
   tagged release has been cut to prove it.

Nothing above is a reason to withhold the merge. It is the honest boundary of
what four commits and a sandbox can show.

---

## Round-1 checklist for the lane

1. `tests/core/dockerfile-toolchain.test.ts:137-142` — make `apkAdds()` match
   only tokens that are arguments to an `apk add` command (split on `&&`/`;`).
2. `tests/core/dockerfile-toolchain.test.ts:176-189` — detect `apk add` after
   `npm ci` **within one instruction**, with a fixture for
   `RUN npm ci && apk add …`.
3. `tests/core/dockerfile-toolchain.test.ts:45-49` — rewrite "It fails only
   when…" to state the real failure surface, and resolve `FROM <stage> AS <name>`
   to the aliased stage's base in `libcFamily()` (`:151-153`).
4. `tests/core/ci-gates-intact.test.ts:538-552` — match `branches: [main]`
   inside the `workflow_run:` sub-block, not anywhere in `on:`; add a fixture
   for the sibling-trigger shape.
5. `tests/core/ci-gates-intact.test.ts:567-577` — scope the three conditions to
   the `publish-edge` job's `if:`; add a fixture for the demote-to-step-level
   shape.
6. `.github/workflows/edge.yml:82`, `:107` and
   `docs/audits/2026-09-18-edge-image/README.md:296-297` — correct the
   `event == 'push'` rationale to the fork-`main` head-branch case, and note it
   is a token-scope control.
7. `edge.yml:60-67` and the audit README's "The fix" — name the residual: a red
   CI run on main still manufactures one skipped Edge run.
8. Optional, §1 of the lane standard: one `liveLines()` helper in
   `tests/core/ci-gates-intact.test.ts` in place of the four inline strippers.

Items 1-5 are the ones that matter. None touches the two fixes themselves.

---

# Round-2 closure — the lane's response

**Round-2 tip: see the branch `lane/edge-image-real`.** Written by the lane
agent, below the reviewer's text, which is unchanged above. Every "before"
number here was reproduced by applying the reviewer's mutation to the real
file first and watching the guard stay green — the bug — and every "after"
number by re-running the same mutation against the fixed guard. Each mutation
was applied alone and reverted (`git status --porcelain` empty after each).

**Headline:** the reviewer's central charge was right. All three guards were
green on input that cannot work, and the shape was the same in all five
defeats — each one **moves text rather than deleting it**, and all three
guards were reading text rather than structure. Nothing was narrowed to make
an item go away; every fix is a stronger guard, and all five defeats are now
pinned as permanent fixtures rather than fixed once.

Counts: `dockerfile-toolchain.test.ts` **11 → 21** tests,
`ci-gates-intact.test.ts` **49 → 51**.
`git diff origin/main --numstat -- tests/core/ci-gates-intact.test.ts` →
**281 added, 0 deleted**; no pre-existing assertion was weakened or removed.

## The evidence table, all nine mutations

| # | mutation, applied alone to the real file | round 1 | round 2 |
|---|---|---|---|
| 1a | `RUN apk add --no-cache curl && echo "dropped: python3 make g++ (no longer needed)"` | **11/11 GREEN** | **20/21 RED** |
| 1b | `RUN apk add --no-cache python3 make g++ && apk del python3 make g++` | **11/11 GREEN** | **20/21 RED** |
| 2 | `RUN npm ci && apk add --no-cache python3 make g++` (line 55 removed) | **11/11 GREEN** | **20/21 RED** |
| 3a | `ARG TOOLCHAIN="python3 make g++"` + `RUN apk add --no-cache $TOOLCHAIN` | 10/11 red (false +) | **21/21 GREEN** |
| 3b | `RUN <<EOF` heredoc installing the toolchain | 10/11 red (false +) | **21/21 GREEN** |
| 3c | `FROM deps AS builder` | 10/11 red (false +) | **21/21 GREEN** |
| 3d | `FROM --platform=$BUILDPLATFORM node:22-alpine AS deps` | 9/11 red (false +) | **21/21 GREEN** |
| 4 | `branches: [main]` moved to a sibling `push:` trigger | **49/49 GREEN** | **50/51 RED** |
| 5 | job-level `if:` deleted, demoted to a step-level `if:` | **49/49 GREEN** | **50/51 RED** |

## Item by item

### 1. `apkAdds()` was a token search — `tests/core/dockerfile-toolchain.test.ts:199` (`splitShellSteps`), `:282` (`apkPackages`), `:426` (`stageToolchain`)

**Done, and wider than asked.** The review suggested splitting on `&&`/`;` and
keeping segments whose first two tokens are `apk add`. Implemented as a
quote-aware shell splitter over `&&`, `||`, `;`, `|` and newlines
(`splitShellSteps`), a real command reader that skips `VAR=value` prefixes,
`sudo`/`env` and flags before deciding the command is `apk` and the verb is
`add` (`apkPackages`), and a **replay** of the stage's steps that also honours
`apk del` — so "installed" now means *present at the moment `npm ci` runs*,
not *mentioned earlier*. A package name in an `echo` string, a label, or any
other command's arguments can no longer reach the installed set.

Round 2 distinguishes the two failures in the finding text, so the fixture can
assert *which* defect it caught rather than just a count: `…runs \`npm ci\`
without installing X`, `…installs X AFTER \`npm ci\`, which is too late`, and
the new `…installs X and then removes it (\`apk del\`) before \`npm ci\` runs`.

Fixtures pinned: *"is not satisfied by a package name inside another command's
arguments"* and *"fires when the toolchain is `apk del`-ed again before
`npm ci`"*.

### 2. Ordering was blind inside one instruction — `:426`

**Done.** `npmCiAt`/`addedAt` were indices into `stage.instructions`. Ordering
is now evaluated over the stage's flattened shell steps (`stageShellSteps` at
`:349`), so `RUN npm ci && apk add …` and two separate `RUN`s read
identically. `isNpmCiStep` (`:330`) also became a real command check rather
than `/\bnpm\s+ci\b/`, so `echo "npm ci"` no longer counts as running it.

Fixture pinned: *"fires when `apk add` follows `npm ci` inside ONE `RUN`
instruction"*, asserting every finding says `too late` — the branch that
round 1 could never reach.

### 3. The header overclaimed, and four real shapes false-positived — `:45-75`, `:121`, `:349`, `:376`

**Done, all four, plus the comment.**

- **`ARG`-parameterised list** — `ARG`/`ENV` assignments are collected per
  stage (and globally, before the first `FROM`) and `$NAME` / `${NAME}`
  expanded before splitting (`stageShellSteps:349`, `expandVars:337`).
- **Heredoc** — `parseStages` (`:121`) folds a `RUN <<EOF` body into that
  `RUN`'s logical instruction; the step splitter treats its newlines as
  command separators, so each heredoc line is a step.
- **`FROM deps AS builder`** — `resolveBaseImage` (`:376`) follows stage
  aliases **transitively** to a real base image (cycle-guarded), and
  `parentStage` (`:390`) threads the parent stage's **net-installed packages**
  into the child, which is real Docker semantics: a stage inheriting from an
  alpine stage that installed the toolchain legitimately has it. Fixtures
  cover both the one-hop and the transitive chain.
- **`FROM --platform=…`** — the `FROM` regex (`:124`) now accepts leading
  flags instead of refusing the line and silently dropping the whole stage.

The *"It fails only when…"* comment is replaced (`:45-75`) by a numbered
statement of what the guard actually checks, plus an explicit **"where it
fails closed"** paragraph naming the residue it still cannot read — a package
list that only exists at build time (`apk add $(cat pkgs.txt)`, a shell
conditional, an `ARG` with no default supplied only via `--build-arg`). That
is the honest version of the claim: failing closed is the right direction, and
now it is documented as such rather than as its opposite.

### 4. `branches: [main]` matched anywhere in `on:` — `tests/core/ci-gates-intact.test.ts:643`

**Done.** Asserted at the exact path `on.workflow_run.branches` via
`yamlBlock`/`yamlScalar` (`:188`, `:215`), an indentation-aware block-mapping
walk — the same walk `topLevelConcurrencyBlock` already does, generalised to a
path.

One honest deviation from the brief, which asked for "a real parse" on the
grounds that "the repo already parses YAML in these tests". **It does not.**
`require.resolve('yaml')` and `require.resolve('js-yaml')` both fail; the
three existing YAML-shaped helpers in this file are indentation walks, and the
`yaml.safe_load` in the review above was the reviewer's own Python, not
repository code. Adding an npm dependency to satisfy one test assertion is a
larger and riskier change than the defect warrants, so this follows the
review's own recommendation (its item 4: *"same indentation walk
`topLevelConcurrencyBlock` at `:56-69` already does"*). The helper's docstring
says plainly what it is and is not, and lists the shapes it returns `null`
for — flow mappings, anchors, multi-document files — all of which fail the
assertions **closed**.

Fixture pinned: the sibling-trigger shape must read `null` at
`on.workflow_run.branches`, the correct shape must read `[main]`, and a
commented-out filter must read `null`.

### 5. The three conditions were searched over the whole file — `:709`, `:722`

**Done.** Read from `jobs.publish-edge.if` (`yamlScalar`, which folds the
`>-` block scalar), with a separate assertion that a job-level `if:` exists at
all before the conditions are checked — so the demote-to-step edit fails on
its own message rather than on three confusing condition failures.

The security framing the reviewer supplied is now written at the site
(`:709-728`): with no job-level `if:`, every completed CI run on main —
including a red one — creates a real run that checks out the commit, logs in
to GHCR and sets up Buildx **while holding `packages: write`**, and only the
last step declines. The job-level guard is what stops a registry-write token
reaching a run that should never have started.

Fixture pinned: a step-level `if:` carrying the identical three conditions
must read `null` at `jobs.publish-edge.if`; the correct shape must yield all
three; a commented-out job-level `if:` must read `null`.

### 6. The `event == 'push'` rationale was mechanically wrong — `.github/workflows/edge.yml:92-110`, `:131-141`, `docs/audits/2026-09-18-edge-image/README.md:315-346`

**Done at all three sites, and the reviewer's stronger reading is adopted.**
The claim that the surviving case is "a `pull_request`-event CI run targeting
main" is false: `branches:` matches the upstream run's **head** branch, so a
PR from `lane/foo` into main has `head_branch == 'lane/foo'` and is already
excluded by the filter. The case that actually survives is a PR whose **head
branch is itself named `main`** — a fork's main — which makes the condition a
**token-scope / pwn-request control**, a stronger justification than the one
given. The condition is kept and the real reason stated. The README carries
the correction under an explicit heading, including *why the wrong version
mattered*: the next reader to check it would have found it false and could
reasonably have deleted the condition as dead code.

### 7. The residual was not named — `edge.yml:79-86`, `README.md` "The fix"

**Done** (reviewer's item 7, not in the orchestrator's six). `workflow_run`
has no conclusion filter, so a **red** CI run on main still manufactures one
skipped Edge run. Both sites now say so and say why it is a deliberate
remainder: removing it means abandoning `workflow_run`, and with it the
"already passed CI" guarantee that is the whole reason for the file. "The fix"
is a 99%-class reduction, not a total one.

### 8. The fourth inline comment-stripper — `:145` (`liveLines`)

**Partially done, deliberately, and this is the one item not fully closed.**
`liveLines(source)` exists and the **two lane-added** copies now call it. The
**three pre-existing** copies at `:57`, `:82` and `:121` are left untouched,
because the lane is under a hard "0 deletions against `origin/main` in this
file" constraint and refactoring them would create deletions. They are also
not quite the same thing: those three are a `isComment` **predicate** used
while walking indentation, whereas `liveLines` produces a stripped source.
Folding all five into one helper is a clean follow-up on any change to this
file that is allowed to touch pre-existing lines. Noted at the helper's
docstring so the next reader does not think it was missed.

## What did NOT change, and was re-verified as still working

The reviewer listed seven behaviours that must stay red. All seven were
re-measured against the round-2 guards, each mutation applied alone to the
real file:

| kept-working case | round 2 |
|---|---|
| `Dockerfile:55` deleted | **20/21 RED** |
| `Dockerfile:55` commented out | **20/21 RED** |
| `apk add` moved to a different stage | **20/21 RED** |
| `apk add` after `npm ci` in a separate `RUN` | **20/21 RED** |
| trailing-stage smuggling (a stage appended after `runner`) | **20/21 RED** |
| libc split (runner moved to `node:22-bookworm`) | **20/21 RED** |
| comment inside a backslash continuation cannot smuggle a package name | **20/21 RED** |
| `branches: [main]` line deleted | **50/51 RED** |
| `branches: [main]` line commented out | **50/51 RED** |
| one condition removed from the job `if:` | **50/51 RED** |

The comment-stripping the reviewer called load-bearing is untouched and was
re-confirmed after the `edge.yml` comment block grew — the new prose repeats
`branches: [main]` several more times, and commenting the live line out is
still **RED**.

Neither fix under review was reworked: `Dockerfile:55` and
`on.workflow_run.branches` are byte-identical to the reviewed tip. The
`g++` decision, the runtime evidence and the head_branch analysis were left
exactly as the reviewer found them.

## Cross-lane: nothing was built

The orchestrator's framing was overturned by the reviewer's measurement and
**no cross-workflow `docs_only` plumbing was added to `edge.yml`**.
`.dockerignore` denies `**` and allowlists no markdown, so a docs-only push
already produces a byte-identical build context (measured: 19/19 layers
cached, 0.744 s, identical RootFS layers). The problem is pre-existing and
belongs to neither lane. The reviewer's recommendation — a GHA build cache on
`edge.yml` plus moving `Dockerfile:81-84`'s `ARG`/`ENV` to the end of the
runner stage — is queued as a separate follow-up lane and was deliberately not
grown into this one.

## Gates

| gate | result |
|---|---|
| `npm run lint` | exit 0 |
| `node --experimental-strip-types tests/core/dockerfile-toolchain.test.ts` | **21 tests, 21 pass, 0 fail** |
| `node --experimental-strip-types tests/core/ci-gates-intact.test.ts` | **51 tests, 51 pass, 0 fail** |
| `git diff origin/main --numstat -- tests/core/ci-gates-intact.test.ts` | **281 added, 0 deleted** |
| `npm run check-docs` | exit 0 (1 non-blocking hit, the quoted line 298 the review ruled should stay) |

---

# Round-2 re-check — independent reviewer

**Tip reviewed: `7ade7aca58522bd2bf0b713f5b5b2e1001559e92`** (three commits on
`dd716ec6`, the round-1 review commit; `origin/main` has since moved to
`76ecacb3`). Fresh worktree `<session scratch>/wt-edge-r2`, `npm ci` from
clean — the round-1 worktree was not reused. Same reviewer as round 1.

**My round-1 text is unedited.** `git diff dd716ec6..HEAD -- <this file>` is
**228 added, 0 deleted**; the closure is appended below it, nothing rewritten.

## Verdict: REVISE — bounded, and none of it is rework

**All six items are CLOSED.** I re-ran every one of the nine mutations plus a
twelve-case kept-working set against the final tip, and every result matches
the lane's table. The fixes are real, wider than I asked for, and pinned as
permanent fixtures rather than patched once.

The REVISE is for **three new holes in the round-2 code itself**, found by the
same method the lane endorsed: inputs on which the guard is GREEN and the
workflow or image cannot work. Two of them contradict a claim the lane's own
files make. All three are small and none touches anything already fixed — this
should be one commit, not a round.

---

## The six items

| # | item | status | evidence |
|---|---|---|---|
| 1 | `apkAdds()` was a token search | **CLOSED** | M1 20/21 RED · M2 20/21 RED, with distinct findings |
| 2 | ordering blind inside one instruction | **CLOSED** | M3 20/21 RED, every finding says `too late` |
| 3 | header overclaimed; four false positives | **CLOSED** | M6–M9 all 21/21 GREEN; header rewritten with a `where it fails closed` paragraph |
| 4 | `branches` matched anywhere in `on:` | **CLOSED** | M4 50/51 RED at the exact path |
| 5 | conditions searched over the whole file | **CLOSED** | M5 50/51 RED **on the job-level-`if:` message** |
| 6 | `event == 'push'` rationale wrong | **CLOSED** | corrected at all three sites; stronger reading adopted |
| 7 | residual not named | **CLOSED** | `edge.yml:79-86` states it plainly |
| 8 | fourth inline stripper | **PARTIALLY CLOSED — correctly** | see the ruling below |

### All nine mutations, re-run by me against `7ade7aca`

Each applied alone to the real file and reverted; `git status --porcelain`
empty after each.

| # | mutation | round 1 | my round-2 result | want |
|---|---|---|---|---|
| M1 | `RUN apk add --no-cache curl && echo "dropped: python3 make g++ (no longer needed)"` | 11/11 GREEN | **20/21 RED** | RED ✓ |
| M2 | `RUN apk add … python3 make g++ && apk del python3 make g++` | 11/11 GREEN | **20/21 RED** | RED ✓ |
| M3 | `RUN npm ci && apk add --no-cache python3 make g++` | 11/11 GREEN | **20/21 RED** | RED ✓ |
| M4 | `branches: [main]` moved to a sibling `push:` trigger | 49/49 GREEN | **50/51 RED** | RED ✓ |
| M5 | job-level `if:` deleted, demoted to a step-level `if:` | 49/49 GREEN | **50/51 RED** | RED ✓ |
| M6 | `ARG TOOLCHAIN="python3 make g++"` + `apk add $TOOLCHAIN` | 10/11 red | **21/21 GREEN** | GREEN ✓ |
| M7 | `RUN <<EOF` heredoc installing the toolchain | 10/11 red | **21/21 GREEN** | GREEN ✓ |
| M8 | `FROM deps AS builder` running `npm ci` | 9/11 red | **21/21 GREEN** | GREEN ✓ |
| M9 | `FROM --platform=$BUILDPLATFORM node:22-alpine AS deps` | 9/11 red | **21/21 GREEN** | GREEN ✓ |

The failure messages are diagnostic, not merely non-zero — M2 and M3 produce
**different** findings from M1, which is what makes the fixtures able to assert
*which* defect they caught:

```
M1  stage "deps" runs `npm ci` without installing python3 (run 34794216577 failed exactly this way)
M2  stage "deps" installs python3 and then removes it (`apk del`) before `npm ci` runs
M3  stage "deps" installs python3 AFTER `npm ci`, which is too late
M4  edge.yml's workflow_run trigger must keep `branches: [main]` AT `on.workflow_run.branches` …
M5  edge.yml's `publish-edge` job must keep a JOB-LEVEL `if:`. A step-level `if:` does not count:
    the run is still created and still holds `packages: write` before the step is reached.
```

M5 failing on its **own** dedicated message — the `jobIf !== null` assertion at
`ci-gates-intact.test.ts:726`, before the three conditions are examined — is
exactly what the orchestrator asked me to confirm. Confirmed.

### Kept-working set — twelve cases, no regression

| case | round 2 | want |
|---|---|---|
| `Dockerfile:55` deleted (prose left) | 20/21 RED | RED ✓ |
| `Dockerfile:55` commented out | 20/21 RED | RED ✓ |
| `apk add` in a different stage | 20/21 RED | RED ✓ |
| `apk add` after `npm ci`, separate `RUN` | 20/21 RED | RED ✓ |
| split across two `RUN apk add` lines | 21/21 GREEN | GREEN ✓ |
| backslash-continued `apk add` | 21/21 GREEN | GREEN ✓ |
| toolchain deleted, trailing `devtools` stage added | 19/21 RED | RED ✓ |
| comment inside a backslash continuation | 20/21 RED | RED ✓ |
| live `branches: [main]` deleted | 50/51 RED | RED ✓ |
| live `branches: [main]` commented out | 50/51 RED | RED ✓ |
| `if:` deleted, three conditions echoed in a `run: \|` scalar | 50/51 RED | RED ✓ |
| `branches` deleted, echoed in a `run: \|` scalar | 50/51 RED | RED ✓ |

The last two were **GREEN in round 1** and are now RED — the structural reads
closed them as a side effect. **Comment-stripping still works with the grown
prose**: `edge.yml` now contains `branches: [main]` **four** times (three in
comments at `:60`, `:98`, `:127`; one live at `:114`, up from three total), and
deleting or commenting the live line is still RED.

### Ruling on item 8 (PARTIALLY CLOSED): honest and right

I rule the partial close **correct, and correctly reported**. `liveLines()`
exists at `:145`, both lane-added strippers call it, and the three pre-existing
copies at `:57`, `:82` and `:121` are left alone. The implementer's argument is
sound on inspection: those three are an `isComment` **predicate consulted while
walking indentation** — `topLevelConcurrencyBlock` skips comments *and* uses
the same loop to decide the block boundary — not a stripped-source producer.
Replacing them is a behaviour change to pre-existing guards, made under a
"0 deletions" constraint, in a lane about something else. It is recorded in the
docstring at `:134-140` and in the closure rather than claimed as done, which
is precisely what `docs/LANE_STANDARD.md` §5 asks. **Close it in whatever
follow-up next edits this file for its own reasons; do not open one for it.**

### Ruling on the YAML-parser correction: the implementer is right, I was wrong

The orchestrator's premise that "the repo already parses YAML in these tests"
is **false**, and I verified it rather than accepting the correction:

```
require.resolve('yaml')    -> NOT RESOLVABLE
require.resolve('js-yaml') -> NOT RESOLVABLE
node_modules: no yaml package;  package.json: no yaml dependency
grep -rl "js-yaml|from 'yaml'|require('yaml')" tests/ scripts/  ->  only this test file itself
```

The three pre-existing helpers are indentation walks, and the `yaml.safe_load`
in my round-1 text was my own **Python**, not repository code — an easy thing
to misread, and the implementer caught it. Generalising the existing walk to a
key path rather than adding an npm dependency to a test is the right call and
is what my item 4 actually recommended.

### The two self-reported incidents

**(a) The `git checkout --` that wiped an `edge.yml` edit — recovery
confirmed.** The final committed tip carries **both** round-2 `edge.yml`
edits: the residual block (`WHAT THE FILTER DOES NOT STOP`, `:79-86`,
"one run per red push to main") and the corrected rationale
(`WHY \`event == 'push'\` IS THE TOKEN-SCOPE CONTROL`, `:92-110`, "HEAD branch
is itself named `main`"), plus the job-site correction at `:131-141`. M4 and M5
are RED **against that final tip**, measured above, not against an intermediate
state. Nothing was lost.

**(b) Neither reviewed fix was reworked — confirmed byte-for-byte.**
`git diff dd716ec6..HEAD -- Dockerfile` is empty and both blobs hash
`1b432a22fb385c0b2985055439f9e3099a25b336c7b702979707fecc98523f4a`. For
`edge.yml`, the comment-stripped live YAML is identical at both SHAs (`diff`
clean) — every round-2 change to that file is a comment.

---

## REVISE items — new holes in the round-2 code

### R2-1. `splitShellSteps` (`tests/core/dockerfile-toolchain.test.ts:199`) does not stop at an unquoted `#`, so a shell-commented tail reads as live

```dockerfile
RUN apk add --no-cache curl #&& apk add --no-cache python3 make g++
```
```
guard: 21/21 GREEN        image: cannot build
```

`#` at the start of a word begins a shell comment, so the splitter's `&&` is
inside dead text. Verified in the real base image rather than argued:

```
$ docker run --rm node:22-alpine sh -c 'echo one #&& echo two'
one

$ docker run --rm node:22-alpine sh -c 'apk add --no-cache curl >/dev/null 2>&1 #&& apk add --no-cache python3 make g++ …
                                        command -v python3 … '
python3 NOT installed  <-- guard said GREEN
```

This one matters because it contradicts the file's own header. `:52-64`
argues that a checker must survive "someone commenting the RUN line out
instead, which is the cheaper and likelier edit" — and commenting out the
*tail* of a RUN line with `#` is the same edit, one character shorter, and the
guard does not survive it. **Fix:** in `splitShellSteps`, when not inside a
quote, treat `#` at a word boundary as end-of-line. ~3 lines, plus a fixture.

### R2-2. `splitShellSteps` (`:199`) has no backslash-escape handling, so `\"` closes the quote early

```dockerfile
RUN apk add --no-cache curl && echo "x \" && apk add --no-cache python3 make g++"
```
```
guard: 21/21 GREEN        image: cannot build
```

The shell sees one `echo` argument; the splitter sees the `\"` as a closing
quote and reads a phantom `apk add` step. Verified:

```
$ docker run --rm node:22-alpine sh -c 'echo "x \" && echo SMUGGLED"'
x " && echo SMUGGLED          # SMUGGLED never runs
```

More contrived than R2-1 and I would not hold the lane for it alone, but it is
the same two-line fix site: honour `\` as an escape in both `splitShellSteps`
and `shellTokens`.

### R2-3. `yamlBlock`/`yamlScalar` (`ci-gates-intact.test.ts:188`, `:215`) take the FIRST key at each level; a real parser takes the LAST

This is the one I would not merge without. Three mutations, each **51/51
GREEN**:

| mutation | effective config (real YAML parser) |
|---|---|
| a second top-level `on:` whose `workflow_run` has **no** `branches` | `{'workflows': ['CI'], 'types': ['completed']}` — **the 467-skipped-runs defect restored** |
| a second `if: always()` after the real job-level `if:` | `always()` — **every workflow_run completion publishes, holding `packages: write`** |
| a second `publish-edge:` job key with no `if:` | same as above |

Confirmed with an actual YAML implementation rather than asserted:

```
$ python3 -c "import yaml; …two top-level on: keys…"
effective workflow_run: {'workflows': ['CI'], 'types': ['completed']}
-> branches present? False

$ python3 -c "import yaml; …duplicate if: …"
effective if: always()
```

Those are exactly my round-1 items 4 and 5 restored, through a different edit,
with the guard green. And **this file already knows about this hazard**:
`topLevelConcurrencyKeyCount` at `:79-85` exists for precisely it, and its
docstring says so — *"A second one later in the file wins for a real YAML
loader — later keys shadow earlier ones — but `topLevelConcurrencyBlock` above
reads only the FIRST, so a correct first block plus a broken second block would
read as correct here while the broken one actually governs."* The new helper,
100 lines below, reintroduces what that one guards.

**Honest caveat on severity:** GitHub's workflow parser very likely *rejects* a
duplicate mapping key outright, in which case the consequence is a
`startup_failure` rather than a silently-wrong trigger — loud, not silent. I
could not confirm that from the documentation (GitHub's workflow-syntax
reference says nothing about duplicate keys) and did not push a test workflow
to find out. Either way the guard is green on a workflow that cannot work,
which is the standard this lane set for itself.

**Fix, mirroring the guard that already exists:** assert the key appears
**exactly once** at its level as `yamlBlock` descends — a count in the same
loop that already does `findIndex`, applied to `on`, `jobs`, `publish-edge`,
`branches` and `if`. ~6 lines, and it makes `topLevelConcurrencyKeyCount`'s
lesson general instead of `concurrency`-specific.

---

## Notes, not REVISE items

- **The docstring's fail-closed list is right for three of four shapes.**
  `"on":` (quoted key), `on: {workflow_run: {…}}` (flow mapping), tab
  indentation and a true alias (`workflow_run: *wr` pointing at a definition
  with no filter) **all fail CLOSED — RED — as claimed.** The exception is
  **multi-document files**: `yamlBlock` reads the first document and ignores a
  second, so a second document with an unfiltered trigger is **GREEN**, not
  null. Unreachable in practice (Actions does not accept multi-document
  workflow files), but `:185` says it returns null and it does not. One word
  in a docstring.
- **Logic is not read, only presence.** `if: >- true || <the three conditions>`
  is 51/51 GREEN while the job publishes unconditionally. Closing this means
  asserting the `if:` *equals* a normalised expected expression, which trades
  this hole for brittleness against harmless reformatting. I think presence is
  the right trade; recording it so the next reader knows it was a choice.
- **`permissions: packages: write` hoisted to the workflow level** is 51/51
  GREEN and unguarded by any assertion, although `edge.yml:115-118`'s own
  comment makes job-scoping a deliberate property. New scope, not a regression
  of my items — worth a line in whatever next touches this file.
- **`python3-dev make g++`** reads RED even though it would build (apk pulls
  `python3` in). Conservative, consistent with the documented direction.
- **`sh -c "apk add …"` and `if …; then apk add …; fi`** both read RED. Also
  conservative, also consistent.
- **`docs/LANE_STANDARD.md` §5, minor:** the committed closure's Gates table
  lists four rows and stops. The full `npm test`, `build`, `honesty-audit`,
  `check-brain`, `check-no-console`, `check-server-reachability` and
  `check-scoring-receipt` results reached the orchestrator but are not in the
  repository record, and §7 exists because scratch-only records are lost. The
  `git checkout --` incident is likewise recorded nowhere in-repo. Both are
  worth two lines in the closure.

---

## Gates I ran on `7ade7aca`

| gate | result |
|---|---|
| `npm run lint` | exit 0 |
| `npm run build` | exit 0 |
| `tests/core/dockerfile-toolchain.test.ts` | **21 tests, 21 pass, 0 fail** |
| `tests/core/ci-gates-intact.test.ts` | **51 tests, 51 pass, 0 fail** |
| **`npm test` (once, on the tip)** | **14,084 tests · 13,992 pass · 0 fail · 91 skipped · 1 todo · 402.8 s** |
| `git diff origin/main --numstat -- tests/core/ci-gates-intact.test.ts` | **281 added, 0 deleted** |
| `git diff origin/main --numstat -- tests/core/dockerfile-toolchain.test.ts` | **828 added, 0 deleted** |
| `check-brain` / `check-docs` / `honesty-audit` / `check-no-console` / `check-server-reachability` | exit 0 each |
| `node scripts/check-scoring-receipt.mjs origin/main..HEAD` | exit 0, "no scoring-path files changed" |
| `console.*` added under `server/**` | none (no `server/**` change) |
| key material in the diff | none |

**+12 over my round-1 baseline of 14,072 / 13,980** — exactly the 10 new
Dockerfile fixtures plus the 2 new `edge.yml` fixtures, nothing else moved.
The `281 / 0` and `828 / 0` figures hold against both `origin/main` (76ecacb3)
and the lane's base `be2341ac`. Note that `git diff --stat origin/main..HEAD`
shows large deletions in `server/**`, `scripts/story-bench.mjs` and friends:
that is `lane/story-bench`'s work which main now has and this un-rebased branch
does not, **not** anything this lane removed.

## Merge hazard against the moved main

`origin/main` is now `76ecacb3` (story-bench merged). Trial merge in a scratch
worktree:

- `76ecacb3` + `lane/edge-image-real` → **CONFLICT in
  `docs/brain/GRAPH.md` and `docs/brain/brain.graph.json`**, and nothing else.
- then + `lane/ci-docs-fast-path` → the same two files.

**No new conflict beyond the brain graph I named in round 1** — but the hazard
is now unconditional rather than order-dependent: in round 1 this lane merged
cleanly into `be2341ac` and only the second lane conflicted. Story-bench's
merge regenerated both files, so **this lane now needs a brain regeneration at
merge time whichever order is used**. Both files are generated: resolve with
`npm run brain` on the merged tree, then `npm run check-brain`, never a hand
merge.

## What is still unproven

Unchanged from round 1 and not addressed by round 2, correctly — the lane
concedes it. `:edge` has still never been published; the build on GitHub's
network, the `docker push` to ghcr.io, the new `branches: [main]` filter
actually firing, and `release.yml`'s `publish` job are all still untested. GHCR
authentication is the one part already proved on the real runner (run
34794216577 steps 1-5 concluded success). The first green push to `main` after
the merge is the test.

## Round-3 checklist — one commit, nothing else

1. `dockerfile-toolchain.test.ts:199` — stop `splitShellSteps` at an unquoted
   `#` at a word boundary; fixture for `RUN apk add … curl #&& apk add … python3 make g++`.
2. `dockerfile-toolchain.test.ts:199` and `:236` — honour `\` as an escape in
   both the splitter and `shellTokens`; fixture for the `echo "x \" && apk add …"` shape.
3. `ci-gates-intact.test.ts:188`/`:215` — require each key on the path to be
   unique at its level (the `topLevelConcurrencyKeyCount` lesson, generalised);
   fixtures for a duplicate `on:`, a duplicate job-level `if:` and a duplicate
   `publish-edge:`.
4. `ci-gates-intact.test.ts:185` — the docstring's multi-document claim; and two
   lines in the closure for the omitted gates and the `checkout --` incident.

Items 1-3 are the ones that matter, and item 3 most of all. **Do not re-open
anything from rounds 1 or 2** — all six items are closed and all nine mutations
verified by me at `7ade7aca`.

---

# Round-3 closure — the lane's response

**Round-3 tip: see `lane/edge-image-real`, rebased onto `origin/main`
(`76ecacb3`).** Written by the lane agent. **Both earlier sections are
unedited** — the round-1 review, the round-2 closure and the round-2 re-check
are exactly as they were; `git diff 731afe60..HEAD -- <this file>` adds only
what follows.

**Verdict accepted in full.** All three holes were real, all three were in
code written in round 2, and all three were found by the method this lane
endorsed: an input on which the guard is GREEN and the image or workflow
cannot work. Nothing from rounds 1 or 2 was re-opened.

The reviewer's sharpest observation is the one worth repeating: **R2-1 and
R2-3 each contradicted a claim one of the lane's own files already makes.**
R2-1 broke the header at `dockerfile-toolchain.test.ts:52-64`, which argues
the guard must survive "commenting the RUN line out… the cheaper and likelier
edit" — commenting out the *tail* is that same edit, one character shorter.
R2-3 reintroduced, 100 lines below it, exactly the hazard
`topLevelConcurrencyKeyCount` at `:79-85` was written to guard. Round 2 wrote
new parsers without re-reading what the file it was editing already knew.

Counts: `dockerfile-toolchain.test.ts` **21 → 25**, `ci-gates-intact.test.ts`
**51 → 52**. `git diff origin/main --numstat` → **973 / 0** and **419 / 0**;
still **0 deletions**.

## Evidence — five mutations, each applied alone and reverted

| # | mutation | round 2 | round 3 |
|---|---|---|---|
| R2-1 | `RUN apk add --no-cache curl #&& apk add --no-cache python3 make g++` | **21/21 GREEN** | **24/25 RED** |
| R2-2 | `RUN apk add … curl && echo "x \" && apk add … python3 make g++"` | **21/21 GREEN** | **24/25 RED** |
| R2-3a | a second top-level `on:` whose `workflow_run` has no `branches` | **51/51 GREEN** | **51/52 RED** |
| R2-3b | a second `if: always()` after the job's real `if:` | **51/51 GREEN** | **51/52 RED** |
| R2-3c | a duplicate `publish-edge:` job key with no `if:` | **51/51 GREEN** | **51/52 RED** |

Each R2-3 mutation's **effective** configuration was read back with a real
YAML implementation before the fix, so the "cannot work" half is measured, not
asserted:

```
R2-3a  effective workflow_run: {'workflows': ['CI'], 'types': ['completed']}
       branches present? False            <- the 467-skipped-runs defect, restored
R2-3b  effective if: 'always()'           <- publishes on EVERY completion,
                                             holding `packages: write`
R2-3c  effective publish-edge has if? False | steps: [{'run': 'echo unguarded'}]
```

The shell semantics behind R2-1 and R2-2 were confirmed in the **shipped base
image**, not from the specification:

```
$ docker run --rm node:22-alpine sh -c 'echo one #&& echo two'     -> one
$ docker run --rm node:22-alpine sh -c 'echo a#b'                  -> a#b
$ docker run --rm node:22-alpine sh -c 'echo "x \" && echo SMUGGLED"'
                                                  -> x " && echo SMUGGLED
```

The middle line is why the R2-1 fix tests for a **word boundary** rather than
for `#`: a `#` mid-word is an ordinary character, and an over-applied fix
would break `apk add --virtual .build-deps#1 python3 …`. Both directions are
pinned as fixtures.

## Item by item

### R2-1. `splitShellSteps` did not stop at an unquoted `#` — `tests/core/dockerfile-toolchain.test.ts:225`

**Done.** When not inside a quote, a `#` at a word boundary (start of body, or
preceded by whitespace or an operator) ends the current command and skips to
the next newline — the rest of the **line**, not the rest of the body, because
a heredoc or newline-joined `RUN` has more lines after it. Fixtures:
*"is not satisfied by an `apk add` hidden behind a shell `#` comment"* and its
negative twin *"still treats a `#` that is NOT at a word boundary as an
ordinary character"*.

### R2-2. No backslash-escape handling — `:225` and `:295`

**Done**, at both sites the reviewer named. A backslash now consumes the next
character everywhere except inside single quotes, where it is literal, as the
shell has it — so an escaped quote cannot close a string and an escaped `&`
cannot separate a command. Fixtures cover the smuggling shape and the negative
direction (escaped space stays one token, escaped `&&` is not a separator,
backslash inside single quotes stays literal).

### R2-3. `yamlBlock`/`yamlScalar` took the FIRST key; YAML takes the LAST — `tests/core/ci-gates-intact.test.ts:227`, `:259`

**Done, and this was the important one.** Every key on a path must now occur
**exactly once** at its level; a repeat returns null and fails the assertion
closed. Six lines, in the loop that already did the `findIndex`, exactly as
the review proposed — which makes `topLevelConcurrencyKeyCount`'s lesson
general instead of `concurrency:`-specific.

The reviewer's severity caveat is **recorded at the site** (`:207-213`) rather
than leaned on: GitHub very likely rejects a duplicate mapping key outright,
making the real-world consequence a loud `startup_failure` rather than a
silently-wrong trigger. Neither GitHub's workflow-syntax reference nor its
Actions documentation says anything about duplicate keys, and no test workflow
was pushed to find out. The fix does not depend on the answer: the guard was
green on a workflow that cannot work, which is the standard this lane set for
itself.

Fixtures pin all three shapes, plus the negative direction — a key repeated at
a **different** level is not a duplicate, so `on.workflow_run.branches` still
resolves when a step's `with:` block also has a `branches:`.

### R2-4. The docstring's multi-document claim — `:189`

**Done, and the claim is now split rather than softened.** Quoted keys, flow
mappings, tab indentation, anchors and (now) duplicate keys **do** fail
closed, as claimed. Multi-document files **do not**: `yamlBlock` reads the
first document and ignores a `---` separated second one, so a second document
with an unfiltered trigger comes back GREEN rather than null. Unreachable in
practice — Actions does not accept a multi-document workflow file — but the
docstring said it returned null and it did not.

### R2-5. The omitted gate rows and the `git checkout --` incident

**Done, here rather than in the round-2 closure.** The reviewer asked for two
lines *in the closure*; the orchestrator asked that both earlier sections stay
unedited. Recording them in this section satisfies
`docs/LANE_STANDARD.md` §7 — they are in the repository record, not only in a
hand-back — without rewriting text a reviewer has already signed off. Flagging
the choice rather than making it silently.

**(a) The full round-2 gate set**, which reached the orchestrator but not the
repository:

| gate | result at the round-2 tip `7ade7aca` |
|---|---|
| `npm run lint` | exit 0 |
| `npm run build` | exit 0 |
| `npm run check-brain` | exit 0 |
| `npm run check-docs` | exit 0 (1 non-blocking hit, the quoted line the review ruled should stay) |
| `npm run check-no-console` | exit 0 |
| `npm run check-server-reachability` | exit 0 |
| `npm run honesty-audit` | exit 0 |
| `node scripts/check-scoring-receipt.mjs origin/main..HEAD` | exit 0, "no scoring-path files changed" |
| `npm run test:ci-env` (both files) | 72 / 72 pass / 0 fail |
| **`npm test`** | **14,084 · 13,992 pass · 0 fail · 91 skipped · 1 todo · 573.1 s** |

**(b) The `git checkout --` incident.** During round 2 a mutation-revert block
ended with `git checkout -- .github/workflows/edge.yml` while that file
carried **uncommitted** item-6 and item-7 edits. The revert discarded them
silently — no error, no prompt — and the next commit contained only the two
test files. It was caught by grepping the committed file for the new comment
headings before reporting, re-applied, and re-verified (M4 and M5 RED against
the final tip; the reviewer independently confirmed both edits are present at
`7ade7aca` and that nothing was lost). The practice that caused it was using
`git checkout --` as a mutation-revert; every mutation in round 3 used a
`cp` from an explicit backup instead, which cannot reach anything the mutation
did not touch.

## Kept-working set — re-verified on the round-3 code, no regression

| case | round 3 | want |
|---|---|---|
| `Dockerfile:55` deleted | 24/25 RED | RED ✓ |
| `Dockerfile:55` commented out | 24/25 RED | RED ✓ |
| `apk add` after `npm ci`, separate `RUN` | 24/25 RED | RED ✓ |
| trailing-stage smuggling | 24/25 RED | RED ✓ |
| libc split (runner → `node:22-bookworm`) | 24/25 RED | RED ✓ |
| backslash-continued `apk add` | 25/25 GREEN | GREEN ✓ |
| live `branches: [main]` deleted | 51/52 RED | RED ✓ |
| live `branches: [main]` commented out | 51/52 RED | RED ✓ |
| one condition removed from the job `if:` | 51/52 RED | RED ✓ |
| `branches: [main]` moved to a sibling trigger (M4) | 51/52 RED | RED ✓ |
| job `if:` demoted to step level (M5) | 51/52 RED | RED ✓ |

## Rebase onto the moved main

`origin/main` had moved to `76ecacb3` (`lane/story-bench` merged). Rebased.

- **Conflict set: exactly `docs/brain/GRAPH.md` and
  `docs/brain/brain.graph.json`**, as the reviewer predicted, and nothing
  else.
- **Resolved by regeneration, never by hand**: `npm run brain` on the
  conflicted tree, then `npm run check-brain` → *"OK. 121 notes, 481 links,
  graph is fresh."* Zero conflict markers remained in either file.
- The large `server/**` and `scripts/story-bench.mjs` deletions that
  `git diff --stat origin/main..HEAD` showed **before** the rebase were main's
  story-bench work this branch did not yet have. After the rebase the diff
  against main is this lane's nine files and nothing else.

### The full-suite delta, accounted for

| | tests | pass |
|---|---|---|
| round-2 tip (un-rebased) | 14,084 | 13,992 |
| **round-3 tip (rebased)** | **14,166** | **14,074** |
| delta | **+82** | **+82** |

Accounted for exactly, with no residue:

- **+5 this lane**: `dockerfile-toolchain.test.ts` 21 → 25, `ci-gates-intact.test.ts` 51 → 52.
- **+77 from main's story-bench merge**, measured file by file rather than
  inferred: `tests/core/llm-generator-schema.test.ts` **17**,
  `tests/core/openai-compat-generation-guards.test.ts` **22**,
  `tests/scripts/story-bench.test.ts` **38**.

14,084 + 5 + 77 = **14,166**. Nothing else moved.

## Gates on the rebased tree

| gate | result |
|---|---|
| `npm run lint` | exit 0 |
| `npm run build` | exit 0 |
| `node --experimental-strip-types tests/core/dockerfile-toolchain.test.ts` | **25 tests, 25 pass, 0 fail** |
| `node --experimental-strip-types tests/core/ci-gates-intact.test.ts` | **52 tests, 52 pass, 0 fail** |
| `npm run test:ci-env` (both files) | **77 / 77 pass / 0 fail** |
| **`npm test` (once, rebased tree)** | **14,166 · 14,074 pass · 0 fail · 91 skipped · 1 todo · 379.0 s** |
| `npm run check-brain` | exit 0 — 121 notes, 481 links, fresh |
| `check-docs` / `check-no-console` / `check-server-reachability` / `honesty-audit` | exit 0 each |
| `node scripts/check-scoring-receipt.mjs origin/main..HEAD` | exit 0, "no scoring-path files changed" |
| `git diff origin/main --numstat -- tests/core/ci-gates-intact.test.ts` | **419 added, 0 deleted** |
| `git diff origin/main --numstat -- tests/core/dockerfile-toolchain.test.ts` | **973 added, 0 deleted** |

## Not acted on, per the orchestrator's rulings

Item 8 (the fourth inline stripper) stays **partially closed** — to be folded
into whatever next edits that file for its own reasons, not a lane of its own.
The reviewer's three "notes, not REVISE items" — `if:` logic being read for
presence rather than meaning, workflow-level `permissions` hoisting being
unguarded, and the conservative RED on `python3-dev`, `sh -c "…"` and
`if …; then apk add …; fi` — are recorded as known scope for a future change
to these files, not closed here.

**Still unproven, unchanged:** `:edge` has never been published. The build on
GitHub's network, the `docker push` to ghcr.io, the `branches: [main]` filter
actually firing, and `release.yml`'s `publish` job are all untested. GHCR
authentication is the one part already proved on the real runner (run
34794216577, steps 1-5 concluded success). The first green push to `main`
after the merge is the test.
