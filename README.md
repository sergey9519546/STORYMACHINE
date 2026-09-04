<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# STORYMACHINE / OASIS

Dual-engine creative writing tool: a multi-agent narrative simulation (Story Machine) paired with a Fountain screenplay authoring environment (Script IDE).

**Cost:** free to self-host — no account, no subscription, no per-report
fee. The deterministic analysis surface (Script Doctor, coverage export,
What-If Lab, Writers' Room, interview receipts) needs no API key at all; a
key only unlocks optional generation features (see "Environment Variables"
below).

## Licensing

`LICENSE` currently grants no license, right, or permission to any person or
entity to use, copy, modify, or distribute this software without the
copyright holder's prior written permission, and `package.json` sets
`"license": "UNLICENSED"`. That is the license actually governing this
repository today — including the self-hosting instructions and the
contribution guide below. Self-hosting an instance or sending a contribution
right now requires the owner's written permission first; nothing in this
README or in `CONTRIBUTING.md` grants it. See `docs/DECISION_LOG.md`
("License the Repository") for the open decision on whether that changes.

## Run Locally

**Prerequisites:** Node.js matching `>=22.13.0 || >=24` (the test suite runs via `node --experimental-strip-types`, and CI pins Node 22)

1. Install dependencies:
   `npm install`
2. Copy `.env.example` to `.env` and fill in your key:
   `cp .env.example .env`
   Then set `GEMINI_API_KEY` to your Gemini API key — or skip this step
   entirely to run in analysis-only mode (all deterministic features work
   without a key; generation features stay off until one is configured).
3. Run the app:
   `npm run dev`

## Environment Variables

The server deliberately boots **without any key** into analysis-only mode (the deterministic surface — Script Doctor, coverage export, What-If Lab, Writers' Room, interview receipts — works keyless). Keys are only needed to enable explicit generation workflows such as world-building, simulation dialogue, and rewrites. The legacy URL-based inline completion is retired. See `.env.example` and `docs/LOCAL_AI_TESTING.md` for the authoritative, fully-commented list.

| Variable | Required | Description |
|---|---|---|
| `GEMINI_API_KEY` | Optional | Gemini AI API key — never commit this. Without it the server boots in **analysis-only mode**. |
| `OPENROUTER_API_KEY` | Optional | OpenRouter (FreeRide) API key — the **default provider when set** (selected ahead of Gemini). The recommended key for new users per `.env.example`. |
| `AI_PROVIDER` | Optional | Multi-provider selector (e.g. `openai-compat`, `gemini`). When using the OpenAI-compatible path, set with `AI_BASE_URL` / `AI_MODEL` / `AI_API_KEY` / `AI_FAST_MODEL`. |
| `AI_BASE_URL`, `AI_API_URL`, `AI_IMG_BASE_URL`, `AI_TTS_BASE_URL`, `AI_EMBEDDING_BASE_URL` | Optional | OpenAI-compatible provider endpoints. SSRF-guarded (private/loopback/metadata IPs rejected; DNS resolve-and-pinned at the fetch site). Set `AI_ALLOW_PRIVATE_NETWORK_TARGETS=true` to point at a local Ollama/LM Studio server. |
| `ADMIN_TOKEN` | Optional | Gates admin-only routes (e.g. `/api/ai-config/test`). Required in production to use those endpoints. |
| `METRICS_TOKEN` | Optional | Gates `/metrics` (loopback access is always allowed; non-loopback requires this token). |
| `COLLAB_SECRET` | Optional | Shared secret for the collaborative-editing WebSocket. Required in production. |
| `TRUST_PROXY` | Optional | Set to `1` / `true` when behind a reverse proxy so `X-Forwarded-*` headers are honored. |
| `APP_URL` | Optional | Hosting URL (not in `.env.example`; injected automatically by some deployment environments like AI Studio). |
| `MAX_SESSIONS`, `SESSION_DB_DIR`, `SESSION_IDLE_TTL_MINUTES`, `SESSION_FILE_TTL_HOURS` | Optional | Session persistence and growth bounds — see "Session data" under Deployment. |
| `MAX_ROOMS` | Optional | Process-wide cap on concurrently reserved room simulations (default `50`); `429` at the boundary. See "Session data". |
| `BACKUP_INTERVAL_HOURS`, `BACKUP_DIR`, `BACKUP_RETENTION_DAYS`, `BACKUP_RETENTION_KEEP` | Optional | In-process backup timer (off by default) and the shared backup destination/retention config — see "Backing it up safely". |
| `SESSION_BACKUP_DIR`, `SESSION_RESET_BACKUP_KEEP`, `SESSION_RESET_BACKUP_TTL_HOURS` | Optional | Where `POST /api/reset`'s pre-reset recovery artifacts land, and how many/how long they are retained. |
| `DOCTOR_WORKER_POOL`, `DOCTOR_WORKER_POOL_SIZE` | Optional | Script Doctor worker pool: set `DOCTOR_WORKER_POOL=off` to force the in-process fallback; `DOCTOR_WORKER_POOL_SIZE` overrides the auto-sized 1–2 threads (capped at 4). Defaults are correct for normal deployments. |
| `COLLAB_MAX_ROOMS` | Optional | Max concurrent Yjs collab rooms (default `200`). |
| `PORT` | Optional | HTTP port (default `3000`). |

> **Security note:** `.env` is gitignored via `.env*` in `.gitignore`. Only `.env.example` is tracked. Never commit real keys. API keys live only in `.env` and are never serialized to clients — `getPublicConfig()` exposes boolean flags only.

**What a visitor is told:** the running app serves a `#privacy` page
(`src/components/PrivacyPage.tsx`) stating what stays in the browser, what the
server stores, what leaves the deployment (nothing by default — AI features are
opt-in via Settings), and how to delete it all. Settings → Session has a
confirm-gated "delete everything" that wipes localStorage, sessionStorage, and
the IndexedDB draft mirror, and calls `POST /api/session/delete`.

## Key Endpoints

| Path | Description |
|---|---|
| `GET /health` | Liveness probe — returns `{ status, uptime, sessions, version, commit }`. `version`/`commit` identify what's actually running (see "Releases" below); no auth, no rate limit. |
| `GET /metrics` | Bespoke JSON (`{ sessions, uptime_s, ai: { ..., by_category }, ... }`) — **not Prometheus exposition format.** A Prometheus scraper pointed at this endpoint collects nothing. Gated by `METRICS_TOKEN` off loopback (see below). |
| `POST /api/init` | Initialize simulation with agents and locations |
| `POST /api/run-room` | Run a 5-turn dialogue lock in a location |
| `POST /api/scriptide/doctor` | Run the deterministic Script Doctor and return the full report |
| `POST /api/scriptide/doctor/stream` | Same analysis over SSE, emitting per-pass progress frames; closing the response cancels the run |
| `GET /api/session/export` | Download a self-describing partial simulation observation; it is not a project backup and cannot restore a project |
| `POST /api/session/import` | Retired; returns non-mutating `410 Gone` because the legacy JSON projection is not recoverable |
| `POST /api/session/rotate` | Issue a new session id and move the session's data to it; the old id stops being authoritative only after the move verifies |
| `POST /api/session/delete` | Destroy the caller's own session — evict its `Stage` and unlink its SQLite files. Unrecoverable; backs the "delete everything" control in Settings → Session |
| `GET /api/ledger/fountain` | Export action log as annotated Fountain screenplay |

## Running Tests

```
npm test
```

A plain `npm test` **skips two gates** you won't see fail unless you know to
look:

- **`RUN_E2E=1 npm test`** additionally runs `tests/e2e/journeys.test.ts`,
  the full-stack journey suite that spawns a real server and drives complete
  writer flows end to end. CI sets `RUN_E2E=1`; a local `npm test` does not,
  so it silently reports `# SKIP RUN_E2E not set` for that file instead of
  running it.
- **`npm run verify:browser`** runs the six live-Chromium suites
  (`verify:p0-flow`, `verify:focus-traps`, `verify:surfaces`,
  `verify:ui-polish`, `verify:local-safety-net`, `verify:command-palette`) —
  it is a separate command, not part of `npm test` at all. Measured directly:
  about **three minutes** wall clock with Chromium pre-cached, all six green.
  CI runs it as its own blocking `browser` job.

For local UI/manual-testing iteration, set `SESSION_DB_DIR=:memory:` before
`npm run dev` (or export it for the session). Without it, every `npm run dev`
boot persists session state to `data/sessions/<sessionId>.db` on disk (the
default outside tests — see "Session data" under Deployment) and ad hoc
local poking accumulates real `.db` files there over time.

## Available npm Scripts

**Development & Build:**
- `npm run dev` - Start development server with hot reload
- `npm start` - Byte-identical to `npm run dev` (both are `tsx server.ts`); present for hosts that expect a `start` script
- `npm run build` - Build production bundle
- `npm run preview` - Preview production build locally

**Testing & Quality:**
- `npm test` - Run full test suite (skips `tests/e2e/journeys.test.ts` unless `RUN_E2E=1` — see "Running Tests" above)
- `npm run verify:browser` - Run the six live-Chromium suites (~3 min); not part of `npm test`, but a blocking CI job
- `npm run lint` - Type check with TypeScript (no emit)
- `npm run check-docs` - Scan documentation for AI writing patterns
- `npm run check-docs:strict` - Same as check-docs but fails on high-severity patterns
- `npm run validate` - Run all checks (lint + check-docs + check-server-reachability + test)

**Git Hooks:**
- `npm run setup-hooks` - Install pre-commit hook for documentation quality checks. Runs automatically via npm's `prepare` lifecycle on `npm install`/`npm ci` in a normal clone; it's a no-op (not an error) in a checkout with no `.git` directory, e.g. a git worktree whose `.git` is a pointer file rather than a directory — run it by hand there if you want the hook.

**Utilities:**
- `npm run rulebook` - Generate rulebook from current rule set
- `npm run generate-p0-sample` - Generate P0 validation sample coverage report
- `npm run backup` - Backup session data
- `npm run restore-session <sessionId> <snapshotFile>` - Restore one session from a snapshot (see "Restoring a snapshot" below)
- `npm run honesty-audit` - Scan shipped surface for overclaim language (CI-enforced)
- `npm run check-scoring-receipt` - Fail if a scoring-path file changed without a matching measurement receipt (CI-enforced)
- `npm run measure-real` - Measure discrimination on the local real-script corpus (needs `REAL_SCRIPT_CORPUS_DIR`; not runnable in CI)
- `npm run discharge-obligations` - Run the measurements the receipt trail currently owes
- `npm run gates` - Report which gates are asserted but not machine-verified
- `npm run test:metamorphic` - Run the metamorphic scoring invariants (the `empty_verbosity` case is a documented known-failing witness)
- `npm run measure-slop` - Measure anti-slop marker discrimination
- `npm run clean` - Remove the `dist/` build output

**Code Quality Tools:**

The project includes automated detection of AI-generated writing patterns in documentation:
- Pre-commit hooks scan `.md` files for 25 high-confidence AI patterns
- Installed automatically on `npm install`/`npm ci` (via the `prepare`
  script); run `npm run setup-hooks` by hand if it didn't (e.g. no `.git`
  directory at install time)
- Bypass when needed: `git commit --no-verify`
- See `scripts/check-docs-quality.ts` for pattern definitions

## Deployment

### Releases

Every deployed instance should be identifiable and reversible: `GET /health`
reports `{ version, commit }` for whatever is currently running, and the
image that produced it is a tagged, pull-able artifact in GitHub Container
Registry — not "whatever the server happened to be built from."

**Version numbering:** `package.json`'s `version` started at `1.0.0` (bumped
from the placeholder `0.0.0`) for the first release this pipeline covers —
plain semver from here on, bump it per release. It's also the version
`/health` and the image tag report for untagged/dev builds (`npm run dev`,
a plain `docker build` with no `--build-arg`s).

**Current version: `1.0.0-rc.1`** — deliberately a release candidate rather
than `1.0.0`. The code is complete against the 1.0 definition
(`docs/PATH_TO_EXCELLENCE.md`); what remains is owner-side validation, not
code. The first versioned GHCR image was published from this version via
`workflow_dispatch` (recorded in `docs/PATH_TO_EXCELLENCE.md` Phase S); the
annotated `v1.0.0-rc.1` tag exists locally and pushing it is an owner step.
Note that a `workflow_dispatch` run derives `VERSION` from `package.json` and
still tags the image `latest`, so re-publishing from a prerelease version
moves `latest` onto it.

**Cutting a release** (`.github/workflows/release.yml`):

1. Bump `"version"` in `package.json` to match the tag you're about to cut
   (not required for the pipeline to work, but keeps `/health` accurate for
   anyone who runs the image without the tag-derived `VERSION` build arg).
2. Tag the commit and push the tag:
   ```
   git tag v1.2.3
   git push origin v1.2.3
   ```
3. The `Release` workflow triggers on the `v*` tag push. It re-runs the same
   gate CI runs (type check, no-`console.*` grep, keyless test suite,
   `npm run build`) as a hard prerequisite — a broken tag never publishes an
   image — then builds and pushes the Docker image to
   `ghcr.io/<owner>/<repo>` tagged **both** `1.2.3` (the version, `v` prefix
   stripped) **and** `latest`. It can also be triggered manually
   (`workflow_dispatch`, e.g. from the Actions tab) to republish without
   cutting a new tag.

**Running a published image:**

```
docker pull ghcr.io/<owner>/storymachine:1.2.3
docker run -p 3000:3000 \
  -e GEMINI_API_KEY=... \
  -v storymachine-data:/app/data \
  ghcr.io/<owner>/storymachine:1.2.3
```

(`GEMINI_API_KEY` is optional — see analysis-only mode above; the volume
mount is optional too, see "Session data" below.)

**Or with Docker Compose** (`docker-compose.yml`, repo root): wires up the
published image with a named volume for session data, a second named volume
for periodic backups, a healthcheck against `/health`, a restart policy, and
every persistence/session-limit variable from `.env.example` — the `docker
run` one-liner above only ever covers 2 of the 30+ variables that file
documents. A commented block covers `ADMIN_TOKEN`/`METRICS_TOKEN`/
`TRUST_PROXY` with a one-line note on when each applies, and a commented
`build:` block replaces the `image:` line to build from source instead of
pulling. Copy `.env.example` to `.env` first if you want AI features (the
file itself explains how compose picks it up); running keyless needs no
`.env` at all:

```
cp .env.example .env   # optional — only needed for AI-backed features
docker compose up -d
curl http://localhost:3000/health
```

**Reading the running version:**

```
curl http://localhost:3000/health
# { "status": "ok", "uptime": 42, "sessions": 0, "version": "1.2.3", "commit": "a1b2c3d..." }
```

`commit` is the full git SHA the image was built from, baked in at build
time (Dockerfile `ARG GIT_SHA`) — useful when two images share a version tag
but you need to confirm the exact commit in production.

**Rolling back:** since every release is a distinct, retained image tag, a
rollback is just running the prior tag:

```
docker pull ghcr.io/<owner>/storymachine:1.2.2
docker run -p 3000:3000 -v storymachine-data:/app/data ghcr.io/<owner>/storymachine:1.2.2
```

No rebuild, no "reconstruct what was deployed" archaeology — confirm via
`/health` that the rolled-back instance reports the expected `version`.

**What `:latest` actually points at:** images are published only when
`.github/workflows/release.yml` runs — a `v*` tag push, or a manual
`workflow_dispatch` — never automatically on every merge to `main`. That
means `:latest` (and any specific version tag) can lag `main` by however
long it's been since the last release run, with no separate signal telling
a puller that a gap exists. Don't assume `:latest` means "current `main`";
check what it actually is:

```
docker inspect --format '{{ index .Config.Labels "org.opencontainers.image.revision" }}' ghcr.io/<owner>/storymachine:latest
```

That label is the full git SHA the image was built from (the release
workflow sets it at build time) — compare it against `git log` on `main` to
see exactly how far behind the running image is, the same way `/health`'s
`commit` field does for an already-running container (see "Reading the
running version" above).

### Reverse proxies and rate limiting

`gameLimiter`/`aiLimiter`/`heavyBodyLimiter` (`server/lib/session-store.ts`)
key on `req.ip`, Express's default client identity. Running this server
directly (no proxy in front) needs no configuration. **If you put a reverse
proxy or load balancer in front of it** (nginx, Cloudflare, a PaaS edge),
every request's socket address becomes the proxy's own IP, so all visitors
collapse onto one shared rate-limit budget unless Express is told to trust
the proxy's `X-Forwarded-For` header. Set:

```
TRUST_PROXY=1
```

(`1` = trust exactly one proxy hop, the normal single-reverse-proxy setup —
also accepts a specific hop count, `loopback`, or an IP/CIDR; see Express's
`trust proxy` docs.) Leave it unset for direct/no-proxy deployments — trusting
`X-Forwarded-For` unconditionally would let any direct client forge it to
spoof another IP and dodge or target rate limits, so this is opt-in only.

### Session data (`data/sessions/`)

With `SESSION_DB_DIR` unset (or any value other than `:memory:`), each
session id gets its own SQLite file at `data/sessions/<sessionId>.db` — this
is the "PERSIST_SESSIONS" mode and is the default outside tests. Every
browser tab mints its own random session id (`src/lib/session.ts`), so this
directory holds one file per visitor, not per logical user.

Growth is bounded automatically, in two independent ways:
- **In-memory cap** (`MAX_SESSIONS`, default 100) and **idle-TTL eviction**
  (`SESSION_IDLE_TTL_MINUTES`, default 1440 = 24h) close a session's open
  file handle, but never delete the file — the session resumes on its next
  request.
- **`MAX_ROOMS`** (default 50): the process-wide cap on concurrently reserved
  room simulations across every session (`/api/run-room`,
  `/api/run-room-stream`, `/api/run-scene` — each up to 8 locations,
  `RunSceneBodySchema`). Independent of the existing per-session,
  per-location duplicate-reservation lock (still a `409`); once admitting a
  *new*, non-duplicate reservation would push the process over `MAX_ROOMS`,
  the request gets a clear `429` instead of an unbounded queue or letting the
  server fall over under real concurrent load. Raise it for a deployment
  expecting heavier concurrent usage.
- **Disk cleanup** (`SESSION_FILE_TTL_HOURS`, default 168 = 7 days) actually
  *deletes* `.db` files (and their `-wal`/`-shm`/`-journal` siblings) once
  they've sat orphaned (not currently loaded in memory) longer than that —
  this is the mechanism that keeps `data/sessions/` from growing without
  bound as one-off visitors accumulate. It runs every 6 hours and only in
  PERSIST mode.

**What losing `data/sessions/` means:** each file is one visitor's full
simulation/screenplay session state (agents, locations, action log, editor
content held server-side). Losing it loses that session's continuity —
draft text a writer had in flight, in-progress interviews, etc. There is no
server-side backup by default; if you need durability, back the directory up
yourself.

**Backing it up safely:** SQLite files must not be copied while a writer
(WAL/journal) is mid-transaction, so a raw `cp -r data/sessions/ backup/` is
only safe if you first stop the server (all handles closed) or otherwise
know a given `<id>.db` is not currently loaded in memory. `better-sqlite3`
(the driver this project uses — `server/engine/Stage.ts`) exposes a
`Database.prototype.backup(destinationPath)` API that performs SQLite's own
online backup (safe to call while the source db is open/in-use); a periodic
backup job wanting to run without stopping the server should use that API
per open session rather than copying files directly.

**Running it:** `npm run backup` invokes `scripts/backup-sessions.ts`, which
calls that same online-backup logic (`server/lib/backup.ts`) for every
`<sessionId>.db` under `SESSION_DB_DIR`, writing consistent snapshots into a
fresh timestamped subdirectory of `BACKUP_DIR` (default `backup/`, e.g.
`backup/2026-07-10T12-34-56-789Z/`). A db that's locked or corrupt is logged
and skipped — one bad file never aborts the rest of the batch. It exits
non-zero if session files existed but every one failed to back up, so a cron
wrapper's own alerting fires.

Env vars: `SESSION_DB_DIR` (source, same var the server itself reads),
`BACKUP_DIR` (destination root; a positional CLI arg overrides it),
`BACKUP_RETENTION_DAYS` / `BACKUP_RETENTION_KEEP` (optional pruning of old
snapshot subdirectories — both off by default). If `SESSION_DB_DIR` is
`:memory:`, or the directory is missing/empty, the run is a clean no-op.

Example cron entry (hourly, keep 14 days):
```
0 * * * * cd /path/to/storymachine && BACKUP_RETENTION_DAYS=14 npm run backup >> /var/log/storymachine-backup.log 2>&1
```

**Scheduling it without cron:** set `BACKUP_INTERVAL_HOURS` and the running
server itself runs the identical backup logic on an in-process timer — no
new dependency, no assumed cron binary, useful for a deployment (e.g. a
container) that has no host-level cron available. **Off by default** (unset
= no background timer, no `backup/` directory created — keyless-first
minimalism: a deployment that never sets it behaves exactly as it always
did) and only meaningful in `PERSIST_SESSIONS` mode. Reads the same
`BACKUP_DIR` / `BACKUP_RETENTION_DAYS` / `BACKUP_RETENTION_KEEP` vars as the
CLI/cron path above, so there's one config surface for both ways of running
the same backup. Example:
```
BACKUP_INTERVAL_HOURS=6
BACKUP_RETENTION_DAYS=14
```
The two scheduling methods are not mutually exclusive but are redundant with
each other — pick whichever fits the deployment (cron for a host with cron
available and log rotation already set up; `BACKUP_INTERVAL_HOURS` for a
container/PaaS deployment without one).

**Restoring a snapshot — two ways:**

1. **Manual (server stopped):** copy the desired file out of a snapshot
   directory back into `SESSION_DB_DIR` under its original name — e.g.
   `cp backup/2026-07-10T12-34-56-789Z/<sessionId>.db data/sessions/<sessionId>.db`
   — then restart the server. To restore every session, copy the whole
   snapshot directory's `*.db` files over `SESSION_DB_DIR` the same way
   before restarting.
2. **`npm run restore-session <sessionId> <snapshotFile>`** (server can stay
   running): runs `server/lib/backup.ts`'s `restoreSession()` — verifies the
   snapshot's SQLite integrity before publishing, then copies it into
   `SESSION_DB_DIR/<sessionId>.db`. It refuses to overwrite a session
   database that's still present on disk (call `POST /api/session/delete`,
   or otherwise remove it, first) — restoring under a **new** session id
   needs no such precondition and is always safe. Example:
   ```
   npm run backup                                                     # take a snapshot
   curl -X POST http://localhost:3000/api/session/delete -H 'X-Session-Id: abc12345'
   npm run restore-session abc12345 backup/2026-08-21T12-00-00-000Z/abc12345.db
   ```
   `/api/session/delete` takes **no body fields** (`DeleteSessionBodySchema`
   is a strict empty object — a `{"sessionId": ...}` body is a `400`); it
   always acts on the caller's own session, named by `X-Session-Id`, which
   must match `[A-Za-z0-9_-]{8,64}` or the request silently falls back to the
   `default` session.
   `tests/core/backup-restore-drill.test.ts` proves this exact sequence
   round-trips a session's content byte-exact — a real backup, a real
   `destroySession()`, a real restore, then reopened and diffed against what
   was written before the drill.

**Simulation reset:** `POST /api/reset` is not project deletion. It clears
only simulation state and preserves the writer/editor state, author outline,
and story settings in the live database. It clears prior-run provider cache
and self-play artifacts so a new simulation does not inherit them. In
persistent mode it first publishes a SQLite online backup that passes an
integrity check and schema-version match under
`SESSION_BACKUP_DIR` (default
`data/backups/session-resets/<sessionId>/`). The successful response includes
the local recovery-artifact identifier, its local-only scope, and the active
retention policy. If required backup publication or retention enforcement fails, reset
returns `503` and leaves the session unchanged.

These reset copies are for an operator-controlled local/single-user
deployment; they are not encrypted, not an off-device backup service, and
not a confidential-draft deletion mechanism. They retain complete SQLite
project snapshots, so deletion procedures must explicitly reconcile them.
They are bounded independently of normal session cleanup by
`SESSION_RESET_BACKUP_KEEP` (default `5`) and
`SESSION_RESET_BACKUP_TTL_HOURS` (default `168`). The policy is enforced on
every reset and by the running server's six-hour retention sweep; a stopped
server cannot delete files on its own. To recover one receipt, stop the
server, copy `<SESSION_BACKUP_DIR>/<sessionId>/<recovery-artifact-id>` to
`<SESSION_DB_DIR>/<sessionId>.db`, then restart. Do this only for a local
operator-approved recovery; no public restore endpoint exists.

### Session capability model

See `docs/AUTH.md` for the current auth model (unguessable session ids as
bearer capabilities — no accounts), what it does and doesn't protect
against, and the recommended path forward.
