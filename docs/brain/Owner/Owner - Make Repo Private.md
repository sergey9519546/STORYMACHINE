---
type: owner
updated: 2026-09-05
sources: [docs/UNIFIED_STATE_2026-09-02.md]
status: active
---

# Owner Item — Make the Repository Private and Enable Branch Protection

**Why only the owner:** repository visibility and branch-protection rules
are a GitHub account/org-admin setting; no worktree agent or CI job holds
that permission.

**What's pending:** as of the last reconciliation the repo is still
`"private": false` (verified live) despite a 2026-08-03 decision to make it
private. A ruleset JSON with verified check names is already committed and
waiting to be applied.

**The command:** apply the committed ruleset via the GitHub repo settings
UI or `gh api repos/<owner>/<repo>/rulesets` with the prepared JSON; then
flip the repo to private in Settings → General.

## Sources

- `docs/UNIFIED_STATE_2026-09-02.md` §4, item 1
