# 2026-09-18 — Node 24 LTS in CI and the Docker image

Lane `lane/node-24`, branched from `origin/main` at `8b6a60c1`.

On 2026-09-18 the owner's machine moved from Node 25.2.1, which is past end of
life, to Node 24.21.0 LTS, supported to 2028-04-30. `package.json`
`engines` already admitted it (`>=22.13.0 || >=24`), but every `setup-node`
step and all three Dockerfile stages still selected 22, so local and CI ran
different majors. This lane moves CI and the image to 24 and checks the three
places where the brief expected the move could break something. It also
records one breakage the brief did not predict, which this lane fixes, and
two pre-existing defects found along the way, which it does not fix.

---

## What changed

| file | change |
|---|---|
| `.github/workflows/ci.yml` (×3), `release.yml` (×3), `security.yml`, `calibrate-voice-bound.yml` | `node-version: "22"` → `"24"`; `security.yml`'s "matches ci.yml conventions (Node 22 …)" comment. The third step in each of `ci.yml` and `release.yml` is the `classify` job the docs fast-path lane added while this PR was open, merged in still pinned to 22 |
| `Dockerfile` | `FROM node:22-alpine` → `node:24-alpine` in `deps`, `builder` and `runner`; the comments that describe the current base (the toolchain it lacks, the libc-consistency rule, the `node` user) |
| `.github/workflows/edge.yml` | the comment that described the base image, which now names both the historical base and the current one |
| `README.md`, `CONTRIBUTING.md` | "CI pins Node 22" → "CI and the Docker image pin Node 24 LTS" |
| `tests/core/dockerfile-toolchain.test.ts` | comments that describe the real base image. The fixtures are unchanged; see Risk 2 |
| `scripts/run-tests.mjs`, `scripts/lib/test-reporter.mjs` (new), `scripts/tap-failures.mjs`, `tests/scripts/test-reporter.test.ts` (new) | the reporter fix, Finding A |
| `server/lib/validation.ts` | a comment only: why the voice-bound table was not re-locked (Risk 1) |

Left alone on purpose: `package.json` `engines` (it already admits 24 and still
admits 22.13+); `@types/node` stays `^22.14.0`, because types at the engines
floor stop code from calling a Node 24-only API while 22 is still a
supported runtime; and every dated historical document (`RELIABILITY.md`,
`docs/audits/**`, the Edge Image record's own `node:22-alpine` measurements).

`setup-node` resolves `"24"` from the runner's tool cache, so CI runs
**v24.20.0** today (`Found in cache @ /opt/hostedtoolcache/node/24.20.0/x64`),
while the owner's machine runs v24.21.0. `"22"` resolved the same way, to
v22.23.2. That is one patch release apart on the same LTS line.

---

## Risk 1 — the voice-weight bound's timing

`MAX_FOUNTAIN_VOICE_ELIGIBLE_DISTINCT` (80) is derived from
`tests/fixtures/voice-bound-derivation.json`, locked from run 34740951649:
Node **v22.23.2** on an **Intel Xeon Platinum 8573C**. The CI assertion in
`tests/security/fountain-shape-guard-cue-parity.test.ts` holds the N=80
boundary under half the analysis budget (15,000 ms of CPU). V8 changes between
majors can move that cost, so it was measured rather than assumed.

**Method.** `.github/workflows/calibrate-voice-bound.yml` was run through its
documented `calibrate/**` push trigger, on Node 24 (this lane's commit
`0de5b13c`) and, as a same-day control, on Node 22 (`origin/main` at
`8b6a60c1`, unchanged). This was done twice, so there are two pairs. The
fleet is heterogeneous: the locked table, the runs in `validation.ts`'s own
notes and this lane's CI runs are spread across Xeon 8573C, Xeon 6973P-C,
EPYC 7763 and EPYC 9V74. Comparing a Node 24 run against the locked table
would therefore measure the CPU draw as much as the runtime. The control is
what separates the two. All four runs drew the same model, an **AMD EPYC
7763**.

| run | Node | CPU | derived cast |
|---|---|---|---|
| 34740951649 (locked table) | v22.23.2 | Xeon Platinum 8573C | 80 |
| 35406323135 (pair a, control) | v22.23.2 | EPYC 7763 | none: N=50 already 12,774 ms |
| 35406320956 (pair a) | v24.20.0 | EPYC 7763 | 70 |
| 35407130144 (pair b, control) | v22.23.2 | EPYC 7763 | none: N=50 already 13,038 ms |
| 35407127786 (pair b) | v24.20.0 | EPYC 7763 | 70 |

Worst CPU sample per row, the `loaded` condition the derivation uses (all 28
rows, idle included, are in the run logs):

| shape | N | locked (22, Xeon) | a: 22 | a: 24 | a: 24/22 | b: 22 | b: 24 | b: 24/22 |
|---|---|---|---|---|---|---|---|---|
| max-admitted | 50 | 10,288 | 12,774 | 10,868 | 0.851 | 13,038 | 11,139 | 0.854 |
| max-admitted | 70 | 11,071 | 13,507 | 11,743 | 0.869 | 13,700 | 11,783 | 0.860 |
| max-admitted | 75 | 11,892 | 14,675 | 12,642 | 0.861 | 14,625 | 12,445 | 0.851 |
| max-admitted | 80 | 11,848 | 14,603 | 12,764 | 0.874 | 14,613 | 12,682 | 0.868 |
| max-admitted | 85 | 12,158 | 14,916 | 13,254 | 0.889 | 15,111 | 13,060 | 0.864 |
| max-admitted | 100 | 13,836 | 16,367 | 14,848 | 0.907 | 16,597 | 14,823 | 0.893 |
| uniform-min | 150 | 20,022 | 23,906 | 21,964 | 0.919 | 24,031 | 21,898 | 0.911 |
| probe-cast | 40 | 10,606 | 12,240 | 10,535 | 0.861 | 12,221 | 10,639 | 0.871 |

Across all 28 rows (both conditions, every shape) the Node 24 / Node 22 ratio on
the same CPU model was **0.828–0.919, median 0.872** in pair a and
**0.825–0.911, median 0.864** in pair b. **Node 24 was cheaper on every row of
both pairs.** No row moved the other way.

The CI assertion itself, `max-admitted N=80` inside a full `npm test` (the TAP
diagnostic that test prints on every run):

| run | Node | CPU | CPU ms | of the 15,000 ms target |
|---|---|---|---|---|
| 35406393258 (this lane) | v24.20.0 | EPYC 7763 | 10,144 | 68% |
| 35406321094 (this lane's commit, calibrate push) | v24.20.0 | Xeon 6973P-C | 7,441 | 50% |
| 35406323130 (main, calibrate push) | v22.23.2 | EPYC 9V74 | 9,779 | 65% |
| 35302874917 (main push) | v22.23.2 | EPYC 9V74 | 11,788 | 79% |
| 34741928418 (cited in `validation.ts`) | 22 | EPYC 7763 | 12,319 | 82% |

**Verdict: the table does not need re-deriving because of Node 24, and it was
not re-locked.** On the same hardware, Node 24 makes every measured shape
cheaper, so the Node 22-derived constant keeps at least the headroom it was
derived with. Re-locking from these runs would move the constant from 80 to
70, which newly rejects documents with 71–80 voice-eligible speakers. The
cause would be that the calibration runs drew an EPYC 7763, not anything
Node 24 did. The Node 22 controls on that CPU derive no cast at all, which is
the machine class `validation.ts`'s "CAN THE ASSERTION STILL GO RED?" note
already describes as a machine report and not a guard regression. No margin
was touched. `validation.ts` now says, beside that note, that the table
predates Node 24 and why it was kept.

**Open for the owner.** `tests/fixtures/voice-bound-derivation.json` records
`machine.node: "v22.23.2"` while CI enforces on 24. Nothing checks that field.
If the record should match the enforcing runtime anyway, the documented
process is a fresh Node 24 calibration run locked with
`--lock-from`. Which CPU that run draws decides the constant: 70 on an
EPYC 7763 by both pairs above, while a Xeon 8573C-class draw would likely
raise it, and then the sweep's `--max-admitted` grid would need to reach
higher to stay bracketed. That changes what the product accepts, so it is the
owner's call and is not made here.

The four `calibrate/node{22-control,24}-2026-09-18{,b}` branches were deleted
after their tables were read, per the workflow's own instruction.

---

## Risk 2 — the Docker image on node:24-alpine

Docker Desktop, engine 29.2.1, on the owner's Windows machine. The measurements
the Edge Image lane made on `node:22-alpine` were repeated on
`node:24-alpine`, one package at a time, with `package.json` and
`package-lock.json` from this tree. A same-day node:22 control was run
alongside. Image digests:
`node:22-alpine@sha256:b6f26b36c8ff…` and `node:24-alpine@sha256:ebfe2f90…`.

**The bases.** Both are Alpine 3.24.2. Neither carries `python3`, `python`,
`make`, `g++`, `gcc` or `cc`. Both ship `node` as uid/gid 1000 with home
`/home/node`. What differs is Node (v22.23.2 → v24.21.0), npm (10.9.8 →
11.19.0), the node-gyp npm bundles (11.5.0 → 12.4.0) and the module ABI
(127 → 137). The N-API version is 10 on both.

**One package at a time:**

| `deps` toolchain | node:22-alpine | node:24-alpine |
|---|---|---|
| none | exit 1, `gyp ERR! stack Error: Could not find any Python installation to use` | exit 1, the same line, byte for byte |
| `python3` | exit 1, `gyp ERR! stack Error: not found: make` | exit 1, the same line |
| `python3 make` | exit 0 | exit 0 |
| `python3 make g++` (shipped) | exit 0 (the Edge Image record) | exit 0 |

With `python3 make` on node:24-alpine, `build/Release/` holds only empty
`.deps/` and `obj.target/` directories: **no `better_sqlite3.node` is
compiled**. `getPrebuildPath()` resolves
`/app/node_modules/better-sqlite3/prebuilds/linuxmusl-x64.node`, and a WAL
database round-trips `{"x":"native-ok","v":"3.53.4"}`. That is the Edge Image
finding, unchanged. It holds across the ABI change because better-sqlite3
13.0.3 ships **one** prebuild per platform (an N-API build), not one per Node
ABI. So python3 and make are still load-bearing and g++ is still headroom.

**The full image.** `docker build --no-cache .` on this tree exited 0 in 79 s.
The image is 1.51 GB, the same as the node:22 image built from `main`
alongside it. The container was then run:

| probe | node:24-alpine image |
|---|---|
| `GET /health` | 200 at t+3 s, `doctorPool.warm: true` (warm-up 1,745 ms) |
| `GET /ready` | 503 `{"ready":false,"reason":"doctor_pool_warming"}` at t+3 s, then 200 `{"ready":true}` at t+4 s |
| `GET /` | 200 |
| `GET /api/state?sessionId=node24verify` | 200; `/app/data/sessions/` gains `node24verify.db`, `-shm` and `-wal`, owned by `node:node` |
| process identity | `uid=1000(node) gid=1000(node)`, `node -v` → v24.21.0 |
| better-sqlite3 directly | prebuild `linuxmusl-x64.node`, `journal_mode` → `wal`, `sqlite_version` 3.53.4, `process.versions.modules` 137 |
| `ldd` on the loaded binary | `/lib/ld-musl-x86_64.so.1`, `libc.musl-x86_64.so.1`: musl, matching the runner |
| toolchain in the shipped image | `python3`, `make`, `g++`, `gcc`, `cc` all absent; `apk info` lists none |
| startup logs | `startup_keyless` (analysis-only mode) and `session_persistence dir=/app/data/sessions` |
| container `HEALTHCHECK` | **unhealthy**: see Finding B. It is identical on the node:22 image from `main` |

The busybox shell behaviours `tests/core/dockerfile-toolchain.test.ts` cites
(its round-3 items R2-1 and R2-2) were re-measured on node:24-alpine, where
`/bin/sh` is `/bin/busybox` exactly as on node:22-alpine, and gave the same
output on both:

```
sh -c 'echo one #&& echo two'            -> one
sh -c 'echo a#b'                         -> a#b
sh -c 'echo "x \" && echo SMUGGLED"'     -> x " && echo SMUGGLED
sh -c 'echo "a # b"'                     -> a # b
sh -c 'echo \#literal'                   -> #literal
sh -c "echo 'x \' && echo REACHED"       -> x \ / REACHED
```

**The test file.** Following the brief, comments that describe the real base
image were updated (the header's statement of what the base carries, the
`Stage.base` doc example, and the `libcFamily()` doc). Comments that record
a past measurement keep `node:22-alpine`, because that is where the
measurement was taken. Each now says that the node:24-alpine repeat matched.
The fixtures are unchanged: `PRE_FIX_DEPS_STAGE` is "verbatim from
main@be2341ac", a historical record, and the remaining fixtures are parser
inputs whose image name is arbitrary. The parser tells libc apart by
`alpine`, not by Node major. None of the fixtures describes the shipped image.

---

## Risk 3 — `--experimental-strip-types`

Node 24 strips types by default. The flag is still accepted, and it is still
needed, because `engines` admits Node 22.13–22.17, where type stripping is
off without it.

- Local, Node 24.21.0 on Windows, a `.ts` file with a type annotation. With
  the flag: exit 0, **0 bytes on stderr**. Without the flag: exit 0, the same
  output. `process.features.typescript` is `strip` either way.
  `--no-experimental-strip-types` turns stripping off, as it should.
- CI, whole-log warning census, the Node 24 CI run (35406393258) against the
  Node 22 CI run of `main` (35406323130). `DeprecationWarning` ×8,
  `[DEP0040]` ×5 and `[DEP0169]` ×3 appear on **both**. Node 22 additionally
  prints one `ExperimentalWarning` (MockTimers) that Node 24 does not. No
  warning mentions type stripping on either. Neither run failed a test: both
  report 14,176 tests, 14,084 pass, 0 fail, 91 skipped.

No change was needed here.

---

## Finding A — Node 24 blinded CI's failure summary (fixed in this lane)

Not in the brief. It showed up because the Node 24 CI log was a quarter the
size of the Node 22 one: 23,832 lines against 106,973 for the same suite.

CI runs `npm test 2>&1 | tee test-output.tap`. "Print test failure summary"
then runs `scripts/tap-failures.mjs test-output.tap`, and the file is uploaded
as the `test-output-tap` artifact (ci.yml and release.yml). `run-tests.mjs`
never named a reporter. Through Node 22, node:test's default reporter for
non-TTY output was TAP. **Node 23 made `spec` the default everywhere.**
Reproduced on node:24-alpine with a fixture holding one passing and one
failing test, stdout piped:

```
node --test r.test.mjs > out.txt        -> exit 1
node tap-failures.mjs out.txt           -> FAILURE SUMMARY: no `not ok` lines found in the TAP stream — nothing to report.

node --test --test-reporter=tap r.test.mjs > out.txt   -> exit 1
node tap-failures.mjs out.txt           -> FAILURE SUMMARY: 1 failing test(s) … not ok 2 - fails
```

node:22-alpine's piped default still opens with `TAP version 13`. The gate
itself was never at risk, because the exit code is untouched. The diagnostic
was: on Node 24, a red run's summary says nothing failed, and the artifact
named TAP is not TAP. That summary exists because the job-log API keeps only
about the last 100 KB (run 34741928418).

**Fix.** `scripts/lib/test-reporter.mjs` returns `['--test-reporter=tap']` when
stdout is not a TTY and nothing when it is, and `run-tests.mjs` passes that
after `--test`. This is exactly the choice Node 22 made on its own, so a
developer's terminal keeps the spec output on every Node version and a pipe
gets TAP on every Node version.
`scripts/report-unverified-gates.mjs` already named `--test-reporter=tap` for
its own reasons and needed nothing.

**Guard.** `tests/scripts/test-reporter.test.ts` has five tests. Two pin the
helper in both directions (`false`/`undefined` give TAP, `true` gives
nothing). One runs a one-failure fixture piped, with the flags, and asserts
`TAP version 13`, exit 1, and that `extractFailures()` names exactly the
failing test. One shows the regression: on Node ≥ 23, the same run without
the flags still exits 1 while `extractFailures()` finds nothing. It is skipped
on Node < 23, where the default was TAP. The last checks that
`run-tests.mjs`'s live, comment-stripped spawn arguments carry
`...testReporterFlags(process.stdout.isTTY)` right after `'--test'`. It was
shown **red on unfixed input** before being shown green:

| input | result |
|---|---|
| `scripts/run-tests.mjs` as on `origin/main` | 4 pass, **1 fail** (the spawn-arguments check) |
| helper returning `[]` (Node's own default) | 3 pass, **2 fail** (the helper pin and the piped-TAP check) |
| this lane | 5 pass |

PR #261 (`fix/test-runner-enametoolong`) merged first and rewrote the same
spawn into `runTestBatches({ flags: ['--experimental-strip-types', '--test'], … })`.
The merge of `main` into this lane puts
`...testReporterFlags(process.stdout.isTTY)` after `'--test'` in `flags`,
where the spawn-arguments check still matches. #261's
`tests/scripts/run-tests-spawn.test.ts` read every spawn argument after
`['--experimental-strip-types', '--test']` as a test file, so it failed on
the merged runner ("every file argument must exist", 17 pass / 1 fail). It
now expects `[...FLAGS, ...testReporterFlags(false)]` (the test pipes the
runner's stdout) and passes 18 of 18. #261's `scripts/lib/test-batches.mjs`
header says "CI tees the combined output into one TAP file", which is
only true on Node 23+ with this fix.

---

## Finding B — the container HEALTHCHECK fails on an IPv6-loopback Docker host (pre-existing, not fixed here)

On this Docker host the `HEALTHCHECK` went `unhealthy` on **both** images,
node:24 from this tree and node:22 built from `main@8b6a60c1`. Every probe
logged `wget: can't connect to remote host: Connection refused`, even though
`/ready` answered 200 from the host. Inside the container:

- `server.ts:364` binds `app.listen(PORT, '0.0.0.0', …)`, IPv4 only.
  `netstat -tln` shows only `0.0.0.0:3000`.
- `/etc/hosts` maps `localhost` to both `127.0.0.1` and `::1`.
- `wget -qO- http://localhost:3000/ready` → refused (exit 1).
  `http://127.0.0.1:3000/ready` → `{"ready":true}` (exit 0).
  `http://[::1]:3000/ready` → refused.

busybox wget takes `::1` and does not fall back to IPv4. The Edge Image record
saw `healthy` on node:22-alpine, which was true on its sandbox's Docker; the
check depends on whether the Docker host gives containers an IPv6 loopback.
`docker-compose.yml:181` uses the same probe. This is not a Node 24 effect,
and fixing it changes the readiness contract that `docker-compose.yml`,
`tests/routes/ready.test.ts` and route-capabilities all describe. It is filed
as a separate task, not folded into a runtime bump.

**Fixed afterwards** in its own lane, #265: both probes now target
`127.0.0.1`, guarded by `tests/core/healthcheck-address.test.ts`, and
measured healthy on this host. See
`docs/audits/2026-09-18-healthcheck-ipv4/README.md`.

---

## Finding C — a fresh `npm ci` fails on the owner's Windows machine (environment, not fixed here)

`npm ci` in a fresh worktree on Node 24.21.0 (npm 11.7.0, node-gyp 12.1.0)
exits 1 in better-sqlite3's implicit `node-gyp rebuild`. The error is
`gyp ERR! find VS … could not find a version of Visual Studio 2017 or newer to use`.
It happens from Git Bash and from PowerShell. `vswhere -all -prerelease -products *`
reports **no Visual Studio instance at all**. A `Microsoft Visual Studio\18\Community`
directory exists, but it is not a registered install. This is the Windows
form of the alpine problem: binding.gyp would compile nothing, because
`prebuilds/win32-x64.node` ships in the tarball, but node-gyp's `configure`
needs a toolchain before it reads binding.gyp. node-gyp requires VS 2019 or
newer for every Node ≥ 22, so the same machine fails on 22, 24 or 25; Node 24
did not cause it.

`npm ci --ignore-scripts` succeeds, and better-sqlite3 then loads
`prebuilds/win32-x64.node` on Node 24 (`sqlite_version` 3.53.4). That is how
this lane's local gates were run. The durable fix is an owner decision:
install Visual Studio Build Tools with the "Desktop development with C++"
workload, or keep using `--ignore-scripts` locally.

---

## Gates

Local, Node 24.21.0, Windows, worktree at `C:\Users\serge\wt-node24`:
`npm run lint` 0 · `check-no-console` 0 · `check-server-reachability` 0 ·
`honesty-audit` 0 · `build` 0 ·
`check-scoring-receipt origin/main..HEAD`: no scoring-path files changed ·
`tests/core/dockerfile-toolchain.test.ts` +
`tests/core/voice-bound-derivation.test.ts`: 33/33 ·
`tests/scripts/test-reporter.test.ts` + `tap-failures.test.ts`: 13/13.
The full-suite result and CI runs are in the PR.

## Files

- `.github/workflows/{ci,release,security,calibrate-voice-bound,edge}.yml`
- `Dockerfile`
- `README.md`, `CONTRIBUTING.md`
- `tests/core/dockerfile-toolchain.test.ts`
- `scripts/run-tests.mjs`, `scripts/lib/test-reporter.mjs`, `scripts/tap-failures.mjs`
- `tests/scripts/test-reporter.test.ts`
- `server/lib/validation.ts` (comment only)
- `docs/brain/Audits/Audit - 2026-09-18 Node 24.md`
