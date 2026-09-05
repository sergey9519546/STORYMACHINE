---
type: owner
updated: 2026-09-05
sources: [docs/PATH_TO_EXCELLENCE.md, CONTRIBUTING.md]
status: active
---

# Owner Item — Fix GitHub Actions (Billing/Runner Block)

**Why only the owner:** this is an account-level billing or spend-limit /
runner-availability issue, not a code failure — it cannot be diagnosed or
fixed from inside a PR.

**What's pending:** per `CONTRIBUTING.md`'s "CI" section — "if your PR's
checks fail in ~2 seconds with no logs and no runner assigned, it is not
your change." Every gate in `ci.yml` passes locally on the same commits
when the failure looks like this.

**The command:** none from the codebase side — check the account's GitHub
Actions billing/spend limits and runner availability in the org/account
settings. Contributors should run `npm run lint && npm test && npm run
build` (or `npm run validate`) locally and note that they did in the PR
description while this is unresolved.

## Sources

- `docs/PATH_TO_EXCELLENCE.md` "What only the owner can do now"
- `CONTRIBUTING.md` "If your PR's checks fail in ~2 seconds…"
