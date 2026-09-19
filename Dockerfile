FROM node:22-alpine AS deps
WORKDIR /app

# ── Native-addon build toolchain (deps stage ONLY) ───────────────────────────
# Without this, `npm ci` below dies. That is not a hypothetical: GitHub
# Actions was blocked at the account level until 2026-09-13, so edge.yml had
# never executed; its FIRST real run, 34794216577 on main@be2341ac
# (2026-09-14), failed here with
#   npm error command sh -c node-gyp rebuild
#   npm error gyp ERR! find Python Python is not set from command line or npm configuration
#   npm error gyp ERR! stack Error: Could not find any Python installation to use
#   npm error gyp ERR! cwd /app/node_modules/better-sqlite3
# release.yml's `publish` job builds this same Dockerfile and failed
# identically — the whole container delivery path was broken.
#
# WHY node-gyp RUNS AT ALL, and what it actually does here (measured
# 2026-09-18, three layered container builds — see
# docs/audits/2026-09-18-edge-image/README.md):
# better-sqlite3 13.0.3 DOES ship a musl prebuild. It is bundled inside the
# npm tarball (node_modules/better-sqlite3/prebuilds/linuxmusl-x64.node,
# alongside linuxmusl-arm64 and the glibc/darwin/win32 variants) — it is not
# downloaded, and there is no prebuild-install step to fail. The package has
# no `install` script either; npm runs `node-gyp rebuild` implicitly because
# binding.gyp is present. That binding.gyp is written to be a no-op in
# exactly this case — its own comment reads "npm's implicit node-gyp rebuild
# should do nothing when the package contains a prebuild for the host" — and
# it detects the prebuild by shelling out to `node lib/binding.js`, making
# both of its targets `'type': 'none'`.
# So NO C++ is compiled for this platform. The failure is upstream of that:
# node-gyp's own `configure` step runs gyp, which is a Python program, before
# it can ever evaluate binding.gyp's conditions, and its `build` step then
# invokes make on the (empty) generated makefiles. node:22-alpine ships
# neither.
# Measured, one package at a time, on this exact image:
#   python3 alone       -> configure passes, then "gyp ERR! stack Error: not found: make"
#   python3 + make      -> npm ci EXIT 0; build/Release/ holds no
#                          better_sqlite3.node (the targets compiled nothing);
#                          lib/binding.js getPrebuildPath() resolves to
#                          .../prebuilds/linuxmusl-x64.node at runtime
# python3 and make are therefore REQUIRED. g++ is deliberately included on
# top: it is unused by better-sqlite3 13.0.3, and is here so that a native
# dependency which does NOT ship a musl prebuild compiles from source instead
# of failing with a cryptic missing-compiler error. Do not drop it to save a
# layer — tests/core/dockerfile-toolchain.test.ts asserts all three.
#
# This stays in `deps` and is never added to `builder` or `runner`: builder
# copies node_modules wholesale from here and runs no `npm ci` of its own, and
# runner must stay slim. The toolchain does not reach the shipped image.
#
# musl/glibc consistency: all three stages are node:22-alpine, so the musl
# prebuild that resolves here is the one the runner loads. Moving ANY stage to
# a glibc base (node:22-slim/bookworm) without moving all of them would carry
# a musl .node into a glibc runtime, or vice versa, and break at require()
# time, not at build time.
RUN apk add --no-cache python3 make g++

COPY package*.json ./
# NODE_ENV is unset in this stage, so `npm ci` installs devDependencies too
# (npm only skips them when NODE_ENV=production at install time). That's
# required here: tsx (a devDependency) is what the runner stage's CMD uses to
# run server.ts directly, with no separate compile step for the server.
RUN npm ci

FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Release identity (README.md "Releases", server/lib/build-info.ts, GET
# /health). release.yml passes these via --build-arg on a tagged release
# build; a plain `docker build` with no --build-arg leaves both at their
# defaults below, so local/dev builds still work unmodified — build-info.ts
# treats "unknown"/"dev" as expected fallbacks, never a fatal condition.
# ARG values don't survive into the running container by themselves, so each
# is re-declared as ENV to make it visible to the Node process at runtime.
ARG VERSION=unknown
ARG GIT_SHA=dev
ENV VERSION=${VERSION}
ENV GIT_SHA=${GIT_SHA}

COPY --from=builder /app/node_modules ./node_modules
# dist/ is the Vite-built SPA; server/app.ts serves it statically from
# path.join(process.cwd(), 'dist') when NODE_ENV=production — cwd here is
# /app (WORKDIR above), so /app/dist lines up with no extra config.
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server ./server
COPY --from=builder /app/server.ts ./server.ts
# server/** imports parseFountain from src/lib/fountain.ts at runtime
# (server/lib/breakdown.ts, server/routes/export.ts, server/nvm/analyze/
# fountain-analyzer.ts, locate.ts, deep-read.ts, fix.ts — verified exhaustively
# via `grep -rn "from '\.\./\.\./src\|from '\.\./\.\./\.\./src" server`).
# fountain.ts itself has zero imports (no React/DOM, no other src/ files), so
# copying just src/lib/ — never src/components, src/*.tsx, or any other
# frontend-only src/ path — is sufficient; those are bundled into dist/ at
# build time and are not needed server-side.
COPY --from=builder /app/src/lib ./src/lib
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/tsconfig.json ./tsconfig.json

# Per-session SQLite persistence dir (server/lib/session-store.ts,
# SESSION_DB_DIR, default ./data/sessions — disk persistence is ON BY DEFAULT,
# not opt-in; set SESSION_DB_DIR=:memory: to disable). session-store.ts never
# mkdir's this path, and better-sqlite3 creates the db FILE but not a missing
# parent directory, so without the mkdir below the first session write would
# throw ENOENT. Mount a volume here for deployments that must survive
# container restarts, e.g.:
#   docker run -v storymachine-data:/app/data ...
RUN mkdir -p /app/data/sessions

# ── Run as non-root ──────────────────────────────────────────────────────────
# node:22-alpine ships a preexisting, unprivileged `node` user/group (uid/gid
# 1000, created by the upstream image) — no separate useradd/addgroup needed.
# Everything COPY'd above lands owned by root (Docker's default COPY
# behavior), so `node` couldn't read/write any of it without the chown below;
# in particular /app/data is where session-store.ts opens/creates per-session
# SQLite files (WAL mode, so it also creates -wal/-shm sidecar files at
# runtime) — that directory specifically MUST be writable by the user the
# process actually runs as, not just readable. `chown -R node:node /app`
# covers dist/, server/, src/lib/, node_modules/, and data/ in one pass since
# nothing after this point is written outside /app.
RUN chown -R node:node /app
VOLUME ["/app/data"]
USER node

EXPOSE 3000

# /ready (2026-09-04 ops audit finding A), not /health: /health answers 200
# unconditionally from the moment the port accepts connections (by design —
# it must keep responding even when Gemini/keys/everything else is down, see
# server/routes/config.ts's own comment), which is exactly why it is the
# wrong signal for a container orchestrator's health/readiness gate — a
# container reported "healthy" the instant it starts still needs the
# measured "~2.1–2.7 s on an idle box, up to ~3.9 s under load (measured
# 2026-09-04/05)" (warmDoctorPool()'s own doc comment, server/nvm/analyze/
# doctor-pool.ts, the one place this figure is defined) to finish
# pre-warming the Script Doctor worker pool, and traffic routed to it in that window
# pays the full ~460-540ms-per-worker cold start. /ready answers 503 until
# that pre-warm has settled, then 200 until this process begins shutting
# down — NOT rate-limited, so a busy container can't read as unhealthy under
# ordinary application load. SIGTERM/SIGINT flip /ready back to 503 first
# (server/lib/readiness.ts's draining flag), but with SHUTDOWN_DRAIN_MS unset
# (this image's default, 0) that flip and server.close() happen in the SAME
# tick — this in-container wget makes a FRESH connection every check, and a
# fresh connection right after the signal was measured getting ECONNREFUSED
# rather than ever seeing the 503, since close() had already stopped
# accepting by then. Set SHUTDOWN_DRAIN_MS (docker-compose.yml sets an
# example) above this HEALTHCHECK's --interval if you need this specific
# probe shape to observe the drain — see server.ts's shutdownDrainMs() and
# GET /ready's own comment in server/routes/config.ts for the full measured
# timeline of both probe shapes.
# start-period=15s comfortably covers the measured warm-up ("~2.1–2.7 s on
# an idle box, up to ~3.9 s under load (measured 2026-09-04/05)" —
# warmDoctorPool()'s own doc comment, server/nvm/analyze/doctor-pool.ts, the
# one place this figure is defined) with headroom for a slower/loaded host,
# while staying well under the 30s poll interval below.
#
# 127.0.0.1, NOT `localhost` (2026-09-18, docs/audits/2026-09-18-healthcheck-
# ipv4/README.md). server.ts binds 0.0.0.0, which serves IPv4 only. Whether
# `localhost` means IPv4 inside this container is up to the Docker HOST:
# Docker Desktop 29.2.1 writes `::1 localhost` into /etc/hosts, busybox wget
# takes ::1 and does not fall back, and every probe was refused — the
# container sat `unhealthy` with /ready answering 200 from the host. A
# literal 127.0.0.1 needs no name resolution and is served by a 0.0.0.0 bind
# on every host. Binding dual-stack instead was rejected: it would expose the
# server on IPv6 everywhere and change the form of every IPv4 client address
# (`::ffff:a.b.c.d`) that rate limiting, logs and the loopback-only admin
# routes read. The container port is 3000 (EXPOSE above); to serve on
# another host port, publish it (`-p 8080:3000`) rather than setting PORT
# inside the container, which would move the server off the port this probes.
# tests/core/healthcheck-address.test.ts derives the address server.ts serves
# and fails if this probe stops targeting it.
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/ready || exit 1

# tsx-in-prod is a documented tradeoff (no separate server compile step — see
# the `deps` stage comment above): it still boots correctly as the non-root
# `node` user because everything it needs (node_modules/tsx, server/, dist/,
# src/lib/, and now /app/data) was chown'd to that user above, and npx
# resolves tsx from the already-installed local node_modules/.bin rather than
# needing network access or write access outside /app.
CMD ["npx", "tsx", "server.ts"]
