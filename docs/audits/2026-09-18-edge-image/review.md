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
