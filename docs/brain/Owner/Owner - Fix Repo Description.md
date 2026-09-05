---
type: owner
updated: 2026-09-05
sources: [docs/UNIFIED_STATE_2026-09-02.md, scripts/honesty-audit.mjs]
status: active
---

# Owner Item — Fix the Repository Description

**Why only the owner:** the GitHub "About" panel text (description,
homepage, topics) is a repo-admin setting; `HONESTY_AUDIT_REPO`
([[Gate - Honesty Audit]]'s repo-metadata lane) can only detect the
problem, not fix it — that lane is warn-only precisely because it names an
edit a PR cannot make.

**What's pending:** the description still reads "3,216 corpus-measured
rules" — a stale number (the live count is 3,217, see [[Glossary]]
"rulebook") that also trips two `honesty-audit.mjs` patterns
(`n-rules-claim`, `stale-count-*`).

**The command:** a pre-validated replacement description (0 violations
across all 24 applicable honesty-audit patterns) is already drafted in
`docs/PATH_TO_EXCELLENCE.md` under "T2" — copy it into the repo's About
panel (Settings → General → Description, or `gh repo edit --description
"…"`).

## Sources

- `docs/UNIFIED_STATE_2026-09-02.md` §4, item 2
