# Auth model — decision record

Written during Run 16 (deployment hardening) as an audit finding: this project
has no accounts, no passwords, no login flow. That is a deliberate scoping
decision at this stage, not an oversight — this document makes the current
model explicit, states its actual guarantees, and files the recommended path
forward. **This is a decision record, not an implementation** — no auth
system was built as part of Run 16.

## Current model: session id as bearer capability

Each browser profile stores a random session id (`crypto.randomUUID()`-derived,
`src/lib/session.ts`) in `localStorage`; tabs on that same origin normally
share it. When storage is unavailable, the client falls back to an in-memory
id for that tab lifetime only. The id is sent on every `/api/*` request via
the `X-Session-Id` header (or `?sessionId=`/body `sessionId` for explicit/SSE
call sites such as `/api/run-room-stream` — see
`server/lib/session-store.ts`'s `sessionId()` for the full precedence). The
former URL-based inline-completion surface is retired and its compatibility
route performs no session lookup or provider work.
The server keys all per-user state — simulation `Stage`, agents, action log,
in-flight editor state — off that id (`getOrCreateSession()`), with no
further check of *who* is presenting it.

This is a **bearer-capability** model, the same shape as an unguessable
share-link or an API key with no owner attached: possession of the id *is*
authorization to read and write that session. There is no username/password,
no account record, no way to prove "this session belongs to user X" beyond
"the request carried X's id."

## What this protects against

- **Cross-visitor interference on a shared deployment.** Before per-session
  identity landed, every visitor shared the `'default'` session and could
  see/mutate each other's simulation state. Session ids partition that: two
  browsers with different ids get fully isolated `Stage` instances
  (`tests/routes/session-identity.test.ts`).
- **Casual guessing.** Ids are `crypto.randomUUID()`-derived (122 bits of
  randomness) — not sequential, not derived from anything guessable.
- **Path traversal via the id.** `HEADER_SESSION_ID_RE` /
  the explicit-value regex in `sessionId()` restrict the charset to
  `[A-Za-z0-9_-]`, so a session id can never escape `SESSION_DB_DIR` when
  joined into a filesystem path (`dbPathFor()`) — this is a path-safety
  guard, explicitly documented in `session-store.ts` as not being an
  authentication mechanism.

## What this does NOT protect against

- **Id leakage = full session takeover.** Because the id is a bearer token,
  anyone who obtains it can act as that session with no further check —
  there's no secondary factor, no binding to an IP/device/cookie-with-
  `HttpOnly`-flag. Leak vectors that matter in practice:
  - **Shared links.** Remaining SSE/GET call sites such as
    `/api/run-room-stream` carry the id as `?sessionId=` in the URL (custom
    headers aren't available to `EventSource`) — a URL a writer pastes into
    Slack, email, or a support ticket now hands out their session. Inline
    completion is retired and is no longer one of these call sites.
  - **Logs.** This is the existing log-hygiene tripwire: `server/app.ts`'s
    request logger and error handler both deliberately log `req.path`
    (Express's parsed pathname, which structurally excludes the query
    string) rather than `req.url`/`req.originalUrl`, specifically so the
    `?sessionId=` query param never reaches a log line — see the extended
    comment at `requestLogger()`'s call site in `server/app.ts` for the
    repo-wide verification that this is the only per-request URL-logging
    site. **This holds only as long as that convention is maintained** — any
    future logging added elsewhere in `server/**` that logs `req.url` or
    `req.originalUrl` instead of `req.path` would reopen this leak. There is
    no automated guard against that regression today (a possible future
    lint/test, not built here).
  - **Browser history / referrer headers** for the same query-string reason,
    on any client that navigates rather than `fetch()`s.
  - **Limited self-service rotation, not identity revocation.** A caller that
    still possesses the old bearer id can `POST /api/session/rotate` with that
    id in `X-Session-Id`. With an empty body, the server returns a newly
    generated id. With persistent sessions, rotation backs up the live
    WAL-aware SQLite handle, verifies and reopens the replacement database,
    removes the old database artifacts, and only then returns `200` and makes
    the new id authoritative. A lifecycle, publication, or verification
    failure returns a retryable non-success response while the old id and data
    remain authoritative. The client must replace its stored id only after the
    verified response supplies `newSessionId`. An optional `newSessionId` is
    accepted only in exact canonical session-id format and must not collide
    with a loaded session or any existing SQLite artifact, including one not
    currently loaded in memory. During rotation, later requests for either id
    receive a retryable lifecycle response rather than using a closing Stage.
    Rotation is not a deletion endpoint, does not establish a user identity,
    and cannot protect a capability that has already leaked: another holder of
    the old id can use or rotate it before the legitimate holder does.
    `POST /api/reset` still only clears simulation state. `destroySession()`
    (evict the in-memory Stage and, in PERSIST mode, unlink the session's
    `.db`/`-wal`/`-shm`/`-journal` files) was an internal-only lifecycle
    helper until E4 (2026-08-21) exposed it as `POST /api/session/delete` —
    the "delete everything" control in `src/components/SettingsPanel.tsx`'s
    Session tab. Same bearer-capability model as rotation above: whoever
    holds the id can delete that session, and the deletion is unrecoverable
    (no server-side backup by default — see README.md's "Session data"
    section). The route takes **no body fields** (`DeleteSessionBodySchema`
    is a strict empty object) and so cannot be pointed at a session other
    than the caller's own — the id comes from `sessionId(req)` exactly as it
    does for every read/write route. A `SessionBusyError` (an in-flight
    command on that session) surfaces as `409` rather than deleting out from
    under an active mutation; the caller retries once idle. This narrows what
    a leaked id can be *aimed* at, not what it grants: the holder of a leaked
    id is the caller, and can delete with it.
- **No user-level accountability.** Nothing distinguishes "this session's
  legitimate owner" from "whoever currently holds the id" — no audit trail
  of which human performed an action, no per-account rate limits or
  permissions, no multi-device sync tied to an identity rather than a
  browser's local storage.
- **No account-mediated cross-device access or reliable global logout.** A
  copied session id can be used on another device because it is a bearer
  capability, which makes copying it a leak risk rather than a supported
  account feature. There are no account records, per-user quotas, or
  server-side logout-all-devices capability; current rate limits are per IP
  (see the `TRUST_PROXY` note in `README.md`'s Deployment section). Accounts,
  authenticated ownership, and server-side revocation are separate systems
  and explicitly **out of scope** for this audit.

The rotation route reduces the lifetime of a capability only for a caller who
can update their local storage and coordinate their own clients. It does not
change the central ceiling of this model: without accounts, authenticated
ownership, or server-side revocation records, StoryMachine cannot provide
account recovery, reliable logout-all-devices, or multi-user authorization.
