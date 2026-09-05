---
type: owner
updated: 2026-09-05
sources: [docs/DECISION_LOG.md, LICENSE, package.json]
status: active
---

# Owner Item — Decide the License

**Why only the owner:** choosing a license is a legal and business decision
about the owner's rights to the codebase, not an engineering call — see
[[Decision 6 - License the Repository]].

**What's pending:** `LICENSE` currently grants no rights to anyone without
prior written permission, and `package.json` says `"license": "UNLICENSED"`,
while `README.md` documents Docker self-hosting and `CONTRIBUTING.md`
thanks contributors for PRs — a contradiction the decision log states
plainly without resolving.

**The command:** none — pick one of the three options in
[[Decision 6 - License the Repository]] (keep proprietary and say so
everywhere; adopt a permissive license; adopt a source-available license),
then update `LICENSE` and `package.json`'s `"license"` field accordingly.

## Sources

- `docs/DECISION_LOG.md` — "Decision #6: License the Repository (2026-09-03) — DECISION NEEDED"
