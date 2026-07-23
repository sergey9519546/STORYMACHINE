<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# STORYMACHINE / OASIS

Dual-engine creative writing tool: a multi-agent narrative simulation (Story Machine) paired with a Fountain screenplay authoring environment (Script IDE).

## Run Locally

**Prerequisites:** Node.js 22.6+ (the test suite runs via `node --experimental-strip-types`, and CI pins Node 22)

1. Install dependencies:
   `npm install`
2. Copy `.env.example` to `.env` and set at least one AI provider key:
   `cp .env.example .env`
   Then set `OPENROUTER_API_KEY` (free, no credit card — get one at
   https://openrouter.ai/keys) or `GEMINI_API_KEY` (premium) — or skip this
   step entirely to run in analysis-only mode (all deterministic features
   work without a key; generation features stay off until one is
   configured).
3. Run the app:
   `npm run dev`

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `OPENROUTER_API_KEY` | Optional | Free AI provider — get a key at https://openrouter.ai/keys (no credit card required). Gives access to 30+ free models with automatic failover when rate limits are hit. Takes priority over `GEMINI_API_KEY` when both are set. |
| `GEMINI_API_KEY` | Optional | Premium AI provider (Gemini) — never commit this. Without either key the server boots in **analysis-only mode**: Script Doctor, live diagnostics, coverage export, What-If Lab, Writers' Room, and interview receipts all work; generation (copilot, simulation dialogue, rewrites) stays disabled until a key is set. |

> **Security note:** `.env` is gitignored via `.env*` in `.gitignore`. Only `.env.example` is tracked. Never commit real keys.

## Key Endpoints

| Path | Description |
|---|---|
| `GET /health` | Liveness probe — returns `{ status, uptime, sessions, version, commit }`. `version`/`commit` identify what's actually running (see "Releases" below); no auth, no rate limit. |
| `POST /api/init` | Initialize simulation with agents and locations |
| `POST /api/run-room` | Run a 5-turn dialogue lock in a location |
| `GET /api/session/export` | Download full session snapshot as JSON |
| `POST /api/session/import` | Restore a previously exported snapshot |
| `GET /api/ledger/fountain` | Export action log as annotated Fountain screenplay |

## Running Tests

```
npm test
```

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

**Restoring a snapshot:** stop the server (so no handle has the target
session db open), copy the desired file out of a snapshot directory back
into `SESSION_DB_DIR` under its original name — e.g.
`cp backup/2026-07-10T12-34-56-789Z/<sessionId>.db data/sessions/<sessionId>.db`
— then restart the server. To restore every session, copy the whole
snapshot directory's `*.db` files over `SESSION_DB_DIR` the same way before
restarting.

### Session capability model

See `docs/AUTH.md` for the current auth model (unguessable session ids as
bearer capabilities — no accounts), what it does and doesn't protect
against, and the recommended path forward.
