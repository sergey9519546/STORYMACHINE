# Auth model — decision record

Written during Run 16 (deployment hardening) as an audit finding: this project
has no accounts, no passwords, no login flow. That is a deliberate scoping
decision at this stage, not an oversight — this document makes the current
model explicit, states its actual guarantees, and files the recommended path
forward. **This is a decision record, not an implementation** — no auth
system was built as part of Run 16.

## Current model: session id as bearer capability

Every browser tab gets a random session id (`crypto.randomUUID()`-derived,
`src/lib/session.ts`), sent on every `/api/*` request via the `X-Session-Id`
header (or `?sessionId=`/body `sessionId` for explicit/SSE call sites — see
`server/lib/session-store.ts`'s `sessionId()` for the full precedence).
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
  - **Shared links.** SSE/GET call sites carry the id as `?sessionId=` in
    the URL (custom headers aren't available to `EventSource`) — a URL a
    writer pastes into Slack, email, or a support ticket now hands out their
    session.
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
  - **No revocation.** A writer who suspects their id leaked (pasted a link
    publicly, shared a machine) has no way to invalidate it and get a fresh
    one without losing their session state — the only "reset" available
    today is `destroySession()` (`POST` routes that call it), which deletes
    the session entirely rather than rotating its id.
- **No user-level accountability.** Nothing distinguishes "this session's
  legitimate owner" from "whoever currently holds the id" — no audit trail
  of which human performed an action, no per-account rate limits or
  permissions, no multi-device sync tied to an identity rather than a
  browser's local storage.
- **No cross-device access.** Since the id lives in one browser's storage,
  a writer has no way to deliberately access their own session from a
  second device without manually copying the id (which is itself a leak
  vector, per above).

## Recommended path forward

1. **Cheap near-term win: a session-id rotation endpoint.** Add a route
   (e.g. `POST /api/session/rotate`) that, given a valid current session id,
   creates a new id, migrates/renames the underlying `Stage`/db file to it,
   and returns the new id for the client to store — then the old id stops
   working. This gives writers a self-serve "I think my link leaked" reset
   without waiting on a full accounts system, and costs roughly one route +
   a rename in `server/lib/session-store.ts` (`dbPathFor`/`destroySession`
   are the existing analogues to extend). Not built in Run 16 — filed here
   as the recommended first increment.
2. **The real fix: accounts.** Bearer-capability sessions are a reasonable
   fit for a keyless, no-signup, try-it-now product surface, but they cap
   out at "the id is the only proof of identity there will ever be." Actual
   accounts (even a lightweight passwordless/magic-link scheme) would add:
   ownership independent of possession, real revocation, cross-device access
   by identity instead of by copying a secret, and a foundation for
   per-user rate limits/quotas instead of per-IP ones (see the `TRUST_PROXY`
   note in `README.md`'s Deployment section for the current per-IP
   limitation). This is a genuinely new subsystem — schema, session
   management, probably a UI flow — and is explicitly **out of scope** for
   this audit; do not build it opportunistically as a side effect of a
   hardening pass.
