# Security Policy

How to responsibly report a security vulnerability in STORYMACHINE, and what
to expect. For the historical internal audit findings (SEC-001 … SEC-030),
see **SECURITY_AUDIT_2026-07-14.md** — that document is the audit record,
not the reporting policy.

## Reporting a vulnerability

**Do not open a public GitHub issue** for a security problem.

Report it privately, via one of:

1. **GitHub Security Advisories** (preferred) —
   [Report a vulnerability](https://github.com/security/advisories/new) on
   this repo. This keeps the report private to maintainers and lets us
   coordinate a fix and a CVE if needed.
2. **Email** — if you cannot use Security Advisories, email the maintainer
   listed in the repository's profile/`CODEOWNERS`.

Include enough to reproduce: the affected component, minimal steps, the
observed impact, and your environment (Node version, whether the server was
running keyless or with `GEMINI_API_KEY` set). If you have a fix in mind,
say so; do not open a public PR for it until we've confirmed the disclosure
path.

## Response SLA

- **Acknowledgement:** within **72 hours**.
- **Initial assessment** (severity + whether it is in scope): within
  **7 days**.
- We will coordinate disclosure timing with you. Valid fixes land under the
  documented security-exception to the P0 freeze (see ROADMAP.md) and ship in
  the next release.

## Supported versions

Only the **current `main`** branch receives security fixes. There are no
maintained long-term backport branches. Releases are immutable image tags
(see README.md "Releases") — to get a fix, run the current image tag.

## Scope

In scope:

- The **Express server** (`server/**`) — request handling, rate limiters
  (`gameLimiter` / `aiLimiter` / `heavyBodyLimiter`), session and lifecycle
  commands.
- **AI provider integrations** (`server/lib/ai-providers/**`,
  `server/lib/validation.ts`) — including SSRF/redirect handling on
  OpenAI-compatible endpoints.
- **Session handling** — identity/capability model (`server/lib/session-store.ts`,
  `docs/AUTH.md`), persistence and recovery (`server/engine/Stage.ts`,
  `server/lib/backup.ts`), reset/import/export.

Out of scope (but welcome as regular bug reports):

- The **deterministic analysis-only surface** — the Script Doctor, coverage,
  what-if, and metamorphic scoring components that run without any provider
  key. Bugs there are correctness issues, not security issues, unless they
  leak data or escalate capability.
- Denial-of-service against an operator's own single-user deployment.
- Vulnerabilities in dependencies themselves — report those upstream; we
  track them via `npm audit` and the dependency-review CI gate.

## Posture

STORYMACHINE is a **keyless, analysis-only** tool by default: the server
boots without `GEMINI_API_KEY` and the deterministic surface works without
any key. API keys live only in `.env` (gitignored) and are never serialized
to clients — `getPublicConfig()` exposes boolean flags only. All AI calls go
through server-side Express routes, never from the frontend bundle.

Known open security work (residuals from the reliability wave, including
DNS-rebinding / resolve-and-pin) is tracked in
**`docs/AGENT_HANDOFF.md`** under "P1 — security residual". The full audit
history and finding catalog is in **SECURITY_AUDIT_2026-07-14.md**.
