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

## Collaboration rooms

Real-time collaboration (`server/collab/yjs-server.ts`) uses the **same
bearer-capability shape as the session id above**, with one difference that
matters: the capability is minted by the SERVER, not typed by the writer.

**What it was, and why it was broken.** Until 2026-09-02, `POST
/api/collab/token` minted an HMAC join token for any syntactically valid room
*name* to any caller, and the name was writer-typed free text generated
client-side (`draft`, a film's title). The stated model was "knowledge of the
room name is the authorization to join it" — but a guessable secret is not a
capability. An attacker asked for a token for the room they wanted, opened the
WebSocket, and the entire unpublished Y.Doc synced to them. The HMAC, the TTL,
the room-binding and both test files were all correct and none of it helped.
See `docs/audits/2026-09-02-retrospective/RETROSPECTIVE.md` §4.

**The model now.**

- `POST /api/collab/rooms` mints a room id: 16 CSPRNG bytes, base64url (128
  bits, 22 chars) — `server/lib/collab-rooms.ts`. The route accepts **no room
  input at all**, so a client-chosen id is not expressible.
- `POST /api/collab/token` mints a WebSocket join token **only for an id that
  was actually minted**. An id the server never issued is refused, so guessing
  a name buys nothing.
- The WebSocket upgrade requires BOTH a valid token and a live registry entry
  for the id. The token is stateless (an HMAC over room+expiry, 30-minute
  TTL), so without the registry check a token minted before a room expired —
  or replayed out of a log or a shared URL — would keep opening the doc for
  the rest of its window.
- The writer's typed name is a **local label** held in `localStorage`
  (`src/components/ScriptIDE.tsx`). It never reaches the server, and the
  status bar shows the label rather than the id so a screenshot does not hand
  out access.
- Sharing is explicit: a share link (`?collab=<id>`) copied by the writer. The
  UI states in words that anyone with the link can read and edit the draft.

**Budgets and lifetime** (all `boundedIntegerEnv`, so deployable overrides are
range-checked):

| Control | Default | Env |
| --- | --- | --- |
| Room TTL from last create/join | 24 h | `COLLAB_ROOM_TTL_MS` |
| Registry ceiling (joinable ids) | 2000 | `COLLAB_MAX_TRACKED_ROOMS` |
| Room creations per session | 10/min | `COLLAB_ROOMS_PER_SESSION_PER_MIN` |
| Token mints per session | 30/min | `COLLAB_TOKENS_PER_SESSION_PER_MIN` |
| Live Y.Docs | 200 | `COLLAB_MAX_ROOMS` |

Both routes refuse a caller presenting no session id rather than lumping every
anonymous caller into the shared `'default'` budget bucket — a partitioning
measure, not an access check, since session ids are self-minted by the client.
The token route answers "unknown room" and "token budget exhausted" with the
**same 404 and the same work**, and spends the budget *before* consulting the
registry, so a caller who has burned their budget cannot keep using the
difference between two status codes as a free room-existence oracle. The room
id is never written to a log line, for the same reason `req.path` (not
`req.url`) is logged above: a log sink full of room ids is a log sink full of
working join credentials.

**What this does NOT protect.**

- **The link is the key.** Anyone who obtains a share link — forwarded email,
  a pasted Slack message, browser history, a referrer header — has full read
  and write access to that draft. There is no per-collaborator identity, no
  invitation, no revocation of one participant.
- **No per-collaborator revocation.** There is no "remove this collaborator"
  or "rotate this room's id" control. A room ends by expiring (TTL), by being
  evicted at the registry ceiling, by the process restarting — or, since
  2026-09-04, by its CREATOR deleting their session.

  `POST /api/session/delete` ("Delete Everything") now purges both halves of a
  room the calling session created: `forgetCollabRoomsForSession` drops the
  registry entry, so no further token mints and every existing token stops
  opening the socket, and `destroyCollabRoomsWhere` closes any live connection
  (1001 "going away") and destroys the Y.Doc, so the draft text leaves process
  memory instead of waiting out the 24h TTL. That is an all-or-nothing exit for
  the creator, not per-collaborator revocation: everyone is disconnected, and a
  collaborator who already has a copy of the text still has it. Rooms created by
  a DIFFERENT session are never touched. Covered by `tests/collab/room-purge.test.ts`
  and `tests/routes/session-delete-memory-stores.test.ts`; asserted end to end in
  a live browser by `scripts/verify-e4-local-safety-net.mjs` §4.
- **In-memory and process-local.** The registry, like the Y.Docs themselves,
  lives in one process's memory. A restart drops every room, and a
  multi-process deployment behind a load balancer does not share rooms even
  with `COLLAB_SECRET` set — the token would verify but the registry entry
  would not exist on the other instance. Collaboration is single-process today;
  that is a real limit, not a configuration mistake.
- **No content-level authorization.** A room grants the whole document. There
  is no read-only mode, no per-scene scoping, and no audit trail of which
  human made which edit beyond the awareness cursor's self-declared name.

The rotation route reduces the lifetime of a capability only for a caller who
can update their local storage and coordinate their own clients. It does not
change the central ceiling of this model: without accounts, authenticated
ownership, or server-side revocation records, StoryMachine cannot provide
account recovery, reliable logout-all-devices, or multi-user authorization.
