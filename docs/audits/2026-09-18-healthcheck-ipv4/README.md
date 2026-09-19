# 2026-09-18 — Healthcheck IPv4: the probe was right or wrong depending on the Docker host

Lane `lane/healthcheck-ipv4`, branched from `origin/main` at `8b6a60c1`.

The container `HEALTHCHECK` reported `unhealthy` on every probe while the
server was up. This was found by the Node 24 lane
(PR #264, its audit record's Finding B) on both a node:22-alpine
image built from `main` and a node:24-alpine build, and was deliberately left
out of that lane. This lane fixes it. The guard added for it found a second
defect in the same compose healthcheck: a non-default `PORT` broke the
compose deployment outright. That is fixed here too.

---

## The defect, reproduced on this lane's base

Docker Desktop, engine 29.2.1, Compose v5.1.0, the owner's Windows machine.
The image was built from this worktree before any edit (`8b6a60c1`) and run
with the command the brief names:

```
docker run -d --name hc-unfixed -p 13000:3000 sm-hc-unfixed      # 03:10:25 UTC
docker inspect hc-unfixed ...                                     # 03:13:23 UTC
status=unhealthy failingStreak=6
exit=1 out="wget: can't connect to remote host: Connection refused\n"   (every entry)
curl http://localhost:13000/ready  ->  {"ready":true} 200               (from the host)
```

Inside the running container (measured by the Node 24 lane on the same
host, and restated here because it is the root cause):

- `server.ts:364` is `app.listen(PORT, '0.0.0.0', …)`. `netstat -tln` shows
  only `0.0.0.0:3000`, so the bind is IPv4 only.
- `/etc/hosts` carries `127.0.0.1 localhost` **and**
  `::1 localhost ip6-localhost ip6-loopback`.
- busybox wget resolves `localhost` to `::1` and does not fall back:
  `http://localhost:3000/ready` → refused (exit 1);
  `http://127.0.0.1:3000/ready` → `{"ready":true}` (exit 0);
  `http://[::1]:3000/ready` → refused.

### Why the Edge Image lane saw `healthy`

`docs/audits/2026-09-18-edge-image/README.md` records `starting → healthy`
on node:22-alpine, and that was true on its host. The same unfixed image,
run here with IPv6 disabled inside the container, reproduces it:

```
docker run -d --sysctl net.ipv6.conf.all.disable_ipv6=1 sm-hc-unfixed
/etc/hosts:            127.0.0.1  localhost        (no ::1 line at all)
after ~53 s:           health=healthy, exit=0 {"ready":true}
```

When the container has no IPv6, Docker writes no `::1 localhost`, `localhost`
can only mean `127.0.0.1`, and the probe works. The check was correct or
incorrect depending on the Docker **host**, which is why it passed where it
was checked and failed on the owner's machine.

---

## The fix, and the alternative that was rejected

**Probe `127.0.0.1`, in both places.** A literal address needs no name
resolution, and a `0.0.0.0` bind serves `127.0.0.1` on every host, with or
without IPv6. That is a one-token change to each probe, and it changes
nothing about what the server exposes.

**Binding dual-stack (`app.listen(PORT, '::')`) was rejected.** It would:

- newly expose the server on IPv6 on every host;
- change the form of every IPv4 client address to `::ffff:a.b.c.d`. That is
  the value rate limiting keys on, the logs record, and `req.ip` reports to
  the loopback-only admin and metrics routes. `server/lib/admin-auth.ts`
  strips the prefix for its own check, but that is one reader among several;
- fail to start at all on a host with IPv6 disabled, where `::` cannot be
  bound.

It is a larger change to what the server does, made to fix a probe.

---

## The second defect: compose moved the server off the port it probes

The guard checks the probe's port as well as its host, because an address is
both. That check went red on `docker-compose.yml` for a reason unrelated to
IPv6. The service passed `PORT: ${PORT:-3000}` into the container while
mapping `"${PORT:-3000}:3000"` and probing a fixed `3000`. The mapping says
the container port is 3000 and `PORT` picks the host port. The environment
line moved the **server** to `$PORT` as well.

Measured on the unfixed image, with the real `docker-compose.yml` plus a
scratch override that only swaps in the local image:

| case | container `PORT` | server listens on | host request | health |
|---|---|---|---|---|
| unfixed, `PORT` unset (host port overridden to 13002) | `3000` | `0.0.0.0:3000` | 200 | **unhealthy**, streak 3 (the IPv6 defect) |
| unfixed, `PORT=13001` | `13001` | `0.0.0.0:13001` | **empty reply** (curl exit 52) | **unhealthy**, streak 3; in-container `127.0.0.1:3000` refused, `127.0.0.1:13001` 200 |

With any `PORT` other than 3000, the compose deployment was unreachable as
well as unhealthy. `.env.example` documents `PORT=3000` as the HTTP port,
and compose reads a project `.env` for interpolation, so a developer who set
`PORT` for `npm run dev` would break `docker compose up` without knowing it.

**Fix:** compose no longer passes `PORT` into the container. `PORT` now picks
the host port only, which is what the mapping always said. The README's
environment table says so. The Dockerfile's comment says the same for plain
`docker run`: publish another host port (`-p 8080:3000`) rather than setting
`PORT` inside the container.

---

## The guard

`tests/core/healthcheck-address.test.ts`, 17 tests. It does not pin a
string. It derives the address the server serves and checks each probe
against it:

- **The server side** is read from `server.ts` through the TypeScript AST
  (`ts.createSourceFile`, the approach `tests/helpers/strip-comments.ts`
  cites from `theme-convention.test.ts`). It finds exactly one live
  `app.listen(...)` call, takes its host (it must be a string literal), and
  takes the port as `Number(process.env.PORT ?? <literal>)` or a literal.
  Comments are not AST nodes, so a commented-out `app.listen(PORT, '::')`
  cannot count. Anything else throws, so the guard fails closed.
- **The Dockerfile side** is read with the same parser
  `tests/core/dockerfile-toolchain.test.ts` uses. It was moved to
  `tests/helpers/dockerfile.ts` in this lane rather than copied, and that
  guard still runs 25 of 25. The guard takes the **last** live `HEALTHCHECK`
  of the **final** stage, because that is the one Docker applies, plus any
  `ENV PORT` in that stage.
- **The compose side** is read line by line with comment lines dropped: each
  `healthcheck.test` (flow sequence, `CMD-SHELL` string or block sequence;
  `NONE` and `disable: true` read as findings), and the service environment's
  `PORT`, in mapping or list form.
- **Host rule.** A `0.0.0.0` bind accepts `127.0.0.0/8` only. A `::` bind
  accepts `127.0.0.1`, `::1` and `localhost`. A single-address bind accepts
  that address only. Any other host name, and any non-loopback address,
  reads as a finding rather than a guess.
- **Port rule.** The probe's port must equal the port the server listens on
  in that deployment: the `ENV` override if the image sets one, the compose
  environment value if compose sets one, otherwise `server.ts`'s default. The
  same `${PORT:-3000}` interpolation on both sides of a compose file counts
  as agreement, because compose resolves both from one environment.

**Shown red on the unfixed files first** (spec reporter, before any
Dockerfile or compose edit):

```
✖ the Dockerfile HEALTHCHECK does
    'Dockerfile HEALTHCHECK: http://localhost:3000 — "localhost" is a name, resolved inside the
     container: Docker Desktop 29.2.1 writes `::1 localhost` into /etc/hosts, busybox wget takes
     ::1 and does not fall back, and a 0.0.0.0 bind serves IPv4 only — …'
✖ the docker-compose.yml healthcheck does, and compose does not move the server off the port it probes
    'docker-compose.yml healthcheck: http://localhost:3000 — "localhost" is a name, …'
    'docker-compose.yml healthcheck: http://localhost:3000 probes port 3000, but the server listens
     on ${PORT:-3000} there (compose sets PORT: ${PORT:-3000} in the service environment)'
ℹ tests 17  ℹ pass 15  ℹ fail 2
```

After the fix: 17 of 17. The fixture tests pin both directions, so neither
half can lapse unnoticed:

| shape | verdict |
|---|---|
| the Dockerfile `HEALTHCHECK` as main shipped it, verbatim | 1 finding (`localhost`) |
| the compose `test:` and `PORT` as main shipped them, verbatim | 2 findings (host, port) |
| the fixed probes | none |
| a commented-out correct probe above a live wrong one, in either file | fires |
| two `HEALTHCHECK`s: fixed then broken / broken then fixed | fires / none (the last one wins) |
| `[::1]` against `0.0.0.0` | fires ("IPv4 only") |
| port `8080`, no port, `ENV PORT=8080` with probe on 3000 | fires, each |
| no `HEALTHCHECK`, `HEALTHCHECK NONE`, one only in a non-final stage, no URL; compose `NONE`, `disable: true` | fires, each |
| `10.0.0.5`, `storymachine` | fires (not loopback / a name) |
| `::` bind with `localhost`, `127.0.0.1`, `[::1]` | none: the guard follows the server |
| `127.0.0.1` bind with `127.0.0.2`; `::1` bind with `127.0.0.1` | fires |
| compose probe and environment both `${PORT:-3000}`; both literal 3000 | none |
| `server.ts` with commented-out `::` and `::1` listens above the live one | reads `0.0.0.0` |
| a variable host, no host, `Number(process.env.PORT)` with no default | throws (fails closed) |

---

## End-to-end verification after the fix

Same host. The images were built from this tree
(`HEALTHCHECK ["CMD-SHELL","wget -qO- http://127.0.0.1:3000/ready || exit 1"]`):

| run | started (UTC) | read (UTC) | health | probe log | host `/ready` |
|---|---|---|---|---|---|
| `docker run -d -p 13000:3000 sm-hc` | 03:14:29 | 03:15:32 (63 s) | **healthy** | `exit=0 {"ready":true}` | 200 |
| compose, `PORT` unset (host port overridden to 13003) | 03:14:29 | 03:15:32 | **healthy** | `exit=0 {"ready":true}` | 200 |
| compose, `PORT=13004` | 03:14:30 | 03:15:32 | **healthy** | `exit=0 {"ready":true}` | 200 on :13004; the container has no `PORT` and listens on `0.0.0.0:3000` |
| `docker run --sysctl net.ipv6.conf.all.disable_ipv6=1 sm-hc-fixed` | | after ~53 s | **healthy** | `exit=0` | |

The fixed probe is healthy on a host that maps `localhost` to `::1` and on
one that does not, which is the property the brief asked for.

---

## Gates

Local, Node 24.21.0, Windows, worktree `C:\Users\serge\wt-healthcheck`
(dependencies installed with `npm ci --ignore-scripts`, because this machine
has no registered Visual Studio; see PR #264's audit record, Finding C):
`npm run lint` 0 · `check-no-console` 0 · `check-server-reachability` 0 ·
`honesty-audit` 0 · `build` 0 ·
`check-scoring-receipt origin/main..HEAD`: no scoring-path files changed ·
`tests/core/healthcheck-address.test.ts` 17/17 ·
`tests/core/dockerfile-toolchain.test.ts` 25/25.

Full `npm test` once, on the final tree rebased onto `main@7527a125` (which
carries #261, #262 and #263): **14,202 tests, 0 fail, 92 skipped, exit 0**,
on Windows. `check-brain` is fresh on Linux and on Windows alike, now that
#262 makes the two generate the same graph.

**One CI note about the rebase.** Rebasing a pushed lane branch means a
force-push, and the push run for that force-push fails "Scoring-path change
requires a measurement receipt" with `NO BASE REF to diff against`: the
pushed `before` SHA is the pre-rebase commit, which the CI checkout does not
contain. The guard fails closed by design (`scripts/check-scoring-receipt.mjs`,
"a push whose own recorded `before` cannot be resolved here, must not produce
a green build"). It is not a finding about this change, whose
`origin/main..HEAD` range contains no scoring-path file. The fast-forward
commit that carries this paragraph gives its own push run a resolvable
range.

## What was deliberately not done

- **`server.ts` is untouched.** See "The fix" above.
- **The Edge Image record's `healthy`, and `.github/workflows/edge.yml`'s
  sentence quoting it, are left as written.** Both are dated observations
  that were true on their host. This record explains the host dependence
  instead of rewriting them. `edge.yml`'s paragraph is also being edited by
  the open Node 24 lane (#264).
- **Host-side `curl http://localhost:3000/…`** examples (README,
  `docker-compose.yml`'s header) are unchanged. Docker publishes the port on
  both address families of the host, and host `curl` falls back between
  them. Measured: `curl http://localhost:13000/ready` → 200 against the
  unfixed image.
- **A `PORT` override inside the container is not supported by the image's
  probe.** The probe is a literal `3000` to match `EXPOSE 3000`. Making it
  follow `$PORT` at probe time was possible (shell-form `${PORT:-3000}`),
  but it would keep a second way to move the container port alive when the
  compose fix removes the first. The Dockerfile comment says to publish a
  different host port instead.

## Files

- `Dockerfile` (the `HEALTHCHECK` and its comment)
- `docker-compose.yml` (the healthcheck `test:`, the removed `PORT` line, both comments)
- `README.md` (the `PORT` row of the environment table)
- `tests/core/healthcheck-address.test.ts` (new)
- `tests/helpers/dockerfile.ts` (new; moved out of `tests/core/dockerfile-toolchain.test.ts`)
- `tests/core/dockerfile-toolchain.test.ts` (imports the moved parser)
- `docs/brain/Audits/Audit - 2026-09-18 Healthcheck IPv4.md`
