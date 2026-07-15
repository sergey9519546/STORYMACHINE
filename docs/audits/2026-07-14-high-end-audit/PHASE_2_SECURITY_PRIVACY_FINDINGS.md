# Phase 2 — Security, Privacy, and Trust-Boundary Findings

**Audit date:** 2026-07-14  
**Posture:** defensive repository review only; no secret values, user draft
contents, exploit development, or destructive production actions were used.  
**Legal boundary:** product-risk analysis, not legal advice.

## Executive finding

The server has a strong defensive baseline for a local/private beta: provider
keys stay server-side, input schemas and body ceilings are broad, SSRF redirects
are revalidated, the container runs non-root, deterministic analysis works
keyless, and sensitive metrics/config writes are gated. The largest remaining
risks are concentrated rather than diffuse: expensive generative routes on the
wrong limiter, an unsafe Docker build context, destructive/shallow session
import, unauthenticated bearer-capability sessions, and no writer-facing privacy
contract for confidential drafts.

## Critical and major findings

### ST-01 — Generative routes use the ordinary limiter

- **Severity:** Critical cost/resource-abuse exposure in AI-enabled deployment
- **Evidence status:** Direct code-path proof
- **Governing invariant:** repository instructions require `aiLimiter` for every
  route that can trigger model calls.
- **Evidence:**
  - `POST /api/turn` uses `gameLimiter` at
    `server/routes/game.ts:140`, then calls `orchestrator.runTurn()` at `:159`.
    `Orchestrator.runTurn()` calls `agent.takeTurn()`
    (`server/engine/Orchestrator.ts:252-259`), which calls
    `selectBestAction()` (`server/engine/Agent.ts:60-100`); that function calls
    `generateContent()` (`server/engine/agent/decision.ts:313-325`).
  - `POST /api/simulate-to-fountain` uses `gameLimiter` at
    `server/routes/game.ts:511-513` and runs up to ten room turns at `:555-561`.
    With up to ten agents accepted by its schema, one request can fan out across
    many agent-generation and epistemic-update calls.
  - `POST /api/ai-config/test` uses `gameLimiter` at
    `server/routes/config.ts:158-166` and directly calls `generateContent()`.
- **Impact:** ordinary per-IP allowance is 120 requests/minute versus 20 for
  `aiLimiter`. The self-contained simulation multiplier makes request rate a
  poor proxy for provider-call/cost rate; a reachable AI-enabled deployment can
  incur high latency and spend while all requests remain “within limit.”
- **Disposition:** change every reachable model path to `aiLimiter` immediately,
  then add a route-contract test that statically or behaviorally maps generative
  endpoints to the AI limiter. Add per-request call budgets inside the engine;
  a rate limiter alone cannot bound fan-out.

### ST-02 — No `.dockerignore`; ignored drafts, secrets, and host dependencies enter build context

- **Severity:** Critical confidentiality/reproducibility defect
- **Evidence status:** Directly verified
- **Evidence:** `.dockerignore` does not exist. `Dockerfile` runs `COPY . .` in
  the builder after importing Linux-installed dependencies. `.gitignore`
  excludes `.env*` and root `data/`, and the current workspace contains ignored
  runtime `data/`. Docker does not use `.gitignore` to exclude build-context
  files.
- **Impact:** a normal local build can transmit `.env*`, per-writer SQLite draft
  databases, `.git`, logs, and other ignored files to the Docker daemon or a
  remote builder/cache. They are not copied into the final runner by the later
  selective `COPY` statements, but they can remain in builder layers/cache and
  have already crossed the intended boundary. Host `node_modules` can also
  overwrite the Linux dependency tree after `COPY --from=deps`, breaking native
  module reproducibility (especially on Windows).
- **Disposition:** add a deny-by-default `.dockerignore` before the next image
  build. At minimum exclude `.env*` except `.env.example`, `data/`, `.git/`,
  `node_modules/`, test output, coverage, logs, local tool state, validation
  sessions, and audit attachments. Verify required runtime assets remain
  available and add a test or CI assertion that sensitive patterns are ignored.

### ST-03 — Session import can erase good state and cannot restore current exports

- **Severity:** Critical content-integrity defect
- **Evidence status:** Executed witnesses
- **Evidence:** See PX-07A/PX-07B in `PHASE_2_PRODUCT_UX_FINDINGS.md`. Current
  exports carry schema 13 while HTTP import caps at schema 6; accepted-version
  malformed snapshots are shallow-validated, destroy the current session, then
  fail after destructive replacement.
- **Disposition:** treat import as an untrusted transaction: deep-validate,
  stage in isolation, verify, and atomically swap only on success. Preserve the
  original on every error.

### ST-04 — Confidential screenplay handling lacks a public product contract

- **Severity:** Critical public-launch trust/compliance gate; Major private-beta
  documentation gap
- **Evidence status:** Repository absence plus implemented data flow
- **Evidence:** no product privacy notice or terms of service exists in the
  tracked product/docs surface. By default, `server/lib/session-store.ts:102-125`
  persists one SQLite database per session. Inactive on-disk sessions are
  removed after 168 hours by default (`:260-284`), while loaded sessions can
  remain beyond that window. Optional backup instructions exist in `README.md`,
  but encryption at rest, backup encryption, subprocessors, access controls,
  regional storage, data-subject workflows, and provider retention/training
  behavior are not declared as product guarantees. Optional deep read tells the
  writer that AI reads each scene and uses their key
  (`src/components/scriptide/ScriptDoctorPanel.tsx:2328-2357`), but not what the
  selected provider may retain or train on.
- **Impact:** screenplays are unpublished, commercially sensitive IP. Writers
  cannot make informed upload decisions or understand deletion, retention,
  provider transfer, or incident handling. Silence is especially damaging when
  competitors lead with explicit “no training/no retention” claims.
- **Disposition:** do not invent stronger promises than the deployment can
  enforce. Before public launch, publish accurate privacy/terms disclosures,
  map every data flow and subprocessor, make retention/deletion visible in the
  UI, expose a reliable delete/export path, and obtain appropriate counsel for
  the actual jurisdictions and deployment model.

### ST-05 — Session identifiers are bearer capabilities, not user authentication

- **Severity:** Major public-deployment ceiling
- **Evidence status:** Direct and already acknowledged in `docs/AUTH.md`
- **Evidence:** possession of a random session id is the only authorization to
  read/write that session. SSE endpoints put it in query strings; there is no
  account owner, revocation/rotation, cross-device identity, human audit trail,
  or role/permission model.
- **Impact:** leaked id equals takeover. Query-string tokens can escape through
  copied URLs, browser history, referrers, support artifacts, or future logging
  regressions. The model is reasonable for no-signup private trials only when
  its limits are explicit; it is not a sufficient foundation for teams,
  commercial accounts, or high-value confidential drafts.
- **Disposition:** for P0, keep the zero-friction model but avoid public exposure
  and add self-service session deletion/rotation if validation logistics need
  it. Before multi-user launch, design real authenticated ownership, revocation,
  authorization, and auditability. Do not store an admin credential in ordinary
  browser local storage as a shortcut.

### ST-06 — Provider-test logging uses the unsanitized error

- **Severity:** Major potential secret/privacy leak into logs
- **Evidence status:** Direct code proof; provider-message contents vary
- **Evidence:** `server/routes/config.ts:169-175` redacts bearer- and `sk-`-shaped
  data for the HTTP response but logs `raw`, not `sanitized`.
- **Disposition:** log only the sanitized, length-bounded message plus controlled
  error type/status fields. Add sentinel tests for common key/header shapes and
  URLs containing credentials or sensitive query values.

### ST-07 — The public AI-readiness route violates the all-routes limiter invariant

- **Severity:** Minor direct risk; Major invariant/coverage gap
- **Evidence status:** Directly verified
- **Evidence:** `GET /api/ai-config` at `server/routes/config.ts:136-149` has no
  limiter, unlike ordinary API routes. `/health` is intentionally public and
  `/metrics` has its own access gate, but no equivalent exception is documented
  for this endpoint.
- **Disposition:** attach `gameLimiter` or explicitly revise the invariant with
  a justified public-read exception and separate abuse budget. Prefer enforcing
  route classification mechanically so comments and code cannot drift.

### ST-08 — Browser Settings and token-protected operator posture do not compose

- **Severity:** Major deployment/operator UX defect
- **Evidence status:** Directly verified
- **Evidence:** server AI config writes require loopback or `ADMIN_TOKEN`
  (`server/routes/config.ts:101-133`); browser Test and Save send no
  Authorization header (`src/components/SettingsPanel.tsx:560-595`).
- **Disposition:** make provider configuration an operator/deployment concern
  and hide/disable browser mutation when unavailable, or implement a genuine
  authenticated admin surface. Do not weaken the server gate to make the
  existing UI appear functional.

## Strengths that must not regress

1. Provider keys remain server-side; `getPublicConfig()` exposes only readiness
   and boolean key-presence flags.
2. `llmReady` correctly combines the independent environment and runtime-key
   sources.
3. Request bodies are globally bounded and most routes use zod plus appropriate
   resource limiters; PDF parsing has a stricter upload ceiling.
4. OpenAI-compatible base URLs and redirects receive SSRF checks.
5. Keyless boot and deterministic diagnosis avoid making a third-party model a
   prerequisite for basic writer access.
6. Production CSP and non-root container execution are present.
7. Metrics are loopback-only by default or bearer-gated; AI config writes are
   loopback-only by default or admin-token-gated.
8. Server logs use a structured logger and CI prohibits `console.*` under
   `server/**`.

## Evidence-bounded conclusion

The project is not “insecure everywhere.” It is a defensively built local-first
system with several sharp, fixable violations at high-leverage boundaries. The
immediate repair set is small: Docker context exclusion, AI limiter/call-budget
alignment, transactional import, sanitized provider errors, and mechanically
enforced route classification. Public launch remains blocked by the larger
identity and privacy-contract work even after those code repairs.

