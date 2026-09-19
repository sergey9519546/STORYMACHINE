---
type: audit
updated: 2026-09-18
sources: [docs/audits/2026-09-18-healthcheck-ipv4/README.md, Dockerfile, docker-compose.yml, server.ts, README.md, tests/core/healthcheck-address.test.ts, tests/helpers/dockerfile.ts, tests/core/dockerfile-toolchain.test.ts]
status: active
---

# Audit — 2026-09-18 Healthcheck IPv4

**Directory:** `docs/audits/2026-09-18-healthcheck-ipv4/` — one lane record for
`lane/healthcheck-ipv4`, branched from `8b6a60c1`. The container healthcheck
reported `unhealthy` on every probe while the server answered 200. The Node 24
lane found this ([[Audit - 2026-09-18 Node 24]], its Finding B) and left it
for a lane of its own.

## The defect

`server.ts` binds `0.0.0.0`, which serves IPv4 only. Both healthchecks probed
`http://localhost:3000/ready`. On Docker Desktop 29.2.1 the container's
`/etc/hosts` maps `localhost` to `::1` as well, busybox wget takes `::1` and
does not fall back, and every probe was refused.

The same unfixed image goes **healthy** when the container has no IPv6. Docker
then writes no `::1 localhost` line, and `localhost` can only mean `127.0.0.1`.
That is why [[Audit - 2026-09-18 Edge Image]] recorded `healthy`: the probe
was right or wrong depending on the Docker host.

## The fix

Probe `127.0.0.1`. That address is served by the `0.0.0.0` bind on every
host, whether or not the host has IPv6. Binding dual-stack instead was
rejected. It would expose the server on IPv6 everywhere, change every IPv4
client address to `::ffff:a.b.c.d` for rate limiting, logs and the
loopback-only admin routes, and fail to start on a host without IPv6.

## What the guard found next

`tests/core/healthcheck-address.test.ts` checks the probe's **port** as well
as its host, and the port check found a second defect. Compose passed
`PORT: ${PORT:-3000}` into the container while mapping `"${PORT:-3000}:3000"`
and probing 3000, so any `PORT` other than 3000 moved the server away from
both. Measured with `PORT=13001`: the server listened on `:13001`, host
requests got an empty reply, and the container was unhealthy. Compose now
leaves `PORT` to pick the host port only.

## The standing lesson

[[Patterns]]-shaped: **a check verified on one machine was verified for that
machine.** The Edge Image lane ran the image for real, which is more than the
check had ever had before, and the result was still a property of that host.
A probe that resolves a name inherits the host's name resolution. Where a
literal will do, use the literal.

The guard derives the served address from `server.ts` through the TypeScript
AST rather than pinning `127.0.0.1`. A future dual-stack bind makes
`localhost` acceptable again, and a future `::1` bind makes `127.0.0.1` an
error, without anyone editing the test. It reads the Dockerfile with the same
parser as the toolchain guard, now in `tests/helpers/dockerfile.ts`, rather
than a second copy. It was shown red on the unfixed files (1 finding in the
Dockerfile, 2 in compose) before it was shown green.

**Related:** [[Audit - 2026-09-18 Edge Image]], [[Audit - 2026-09-18 Node 24]], [[Patterns]],
`docs/LANE_STANDARD.md`, `docs/audits/2026-09-18-healthcheck-ipv4/README.md`.

## Sources

- `docs/audits/2026-09-18-healthcheck-ipv4/README.md`
- `Dockerfile`
- `docker-compose.yml`
- `server.ts`
- `README.md`
- `tests/core/healthcheck-address.test.ts`
- `tests/helpers/dockerfile.ts`
- `tests/core/dockerfile-toolchain.test.ts`
