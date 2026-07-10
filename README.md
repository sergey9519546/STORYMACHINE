<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# STORYMACHINE / OASIS

Dual-engine creative writing tool: a multi-agent narrative simulation (Story Machine) paired with a Fountain screenplay authoring environment (Script IDE).

## Run Locally

**Prerequisites:** Node.js 22.6+ (the test suite runs via `node --experimental-strip-types`, and CI pins Node 22)

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

| Variable | Required | Description |
|---|---|---|
| `GEMINI_API_KEY` | Optional | Gemini AI API key — never commit this. Without it the server boots in **analysis-only mode**: Script Doctor, live diagnostics, coverage export, What-If Lab, Writers' Room, and interview receipts all work; generation (copilot, simulation dialogue, rewrites) stays disabled until a key is set. |
| `APP_URL` | Optional | Hosting URL (injected automatically by AI Studio) |

> **Security note:** `.env` is gitignored via `.env*` in `.gitignore`. Only `.env.example` is tracked. Never commit real keys.

## Key Endpoints

| Path | Description |
|---|---|
| `GET /health` | Liveness probe — returns uptime and session count |
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
per open session rather than copying files directly. No such job exists yet
— this section documents the approach, it isn't wired up.

### Session capability model

See `docs/AUTH.md` for the current auth model (unguessable session ids as
bearer capabilities — no accounts), what it does and doesn't protect
against, and the recommended path forward.
