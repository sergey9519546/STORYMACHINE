---
type: gate
updated: 2026-09-05
sources: [scripts/honesty-audit.mjs, CLAUDE.md]
status: active
---

# Gate — Honesty Audit

**What it checks (G0-08):** the shipped surface for user-facing overclaim
language — unverified superlatives, "provably"/"guarantees" wording the
product cannot back, and stale hardcoded corpus/rule-count numbers.
Scanned roots: `src/**` (.ts/.tsx/.css), `public/**`, `server/**` (.ts
only, comments stripped), plus `index.html`, `README.md`, `metadata.json`,
`package.json`. `tests/**`, `*.test.ts`, and everything under `docs/**`
(and other root `*.md` files, the "candid internal audit trail") are exempt
by construction — except the six named orientation docs the
[[Gate - Claims Register Lane]] scans on top of this.

**Command:** `npm run honesty-audit` (`node scripts/honesty-audit.mjs`).
With `HONESTY_AUDIT_REPO` set (CI only), it additionally scans the GitHub
repo description/homepage/topics for the same patterns — warn-only today,
since fixing that is a repo-admin edit, not a PR.

**Where it lives:** `scripts/honesty-audit.mjs`; CI step "Honesty string
audit", blocking (unlike the repo-metadata lane, which is warn-only).

**What it cannot catch:** an empirical claim made in ordinary words with no
banned lexical pattern — the exact gap [[Gate - Claims Register Lane]]
exists to close. It also cannot verify a *true but stale* claim went false
silently; it only catches the phrasing patterns and numbers it has been
taught to look for.

## Sources

- `scripts/honesty-audit.mjs` (header, "Scope" section)
- `.github/workflows/ci.yml` ("Honesty string audit" step)
