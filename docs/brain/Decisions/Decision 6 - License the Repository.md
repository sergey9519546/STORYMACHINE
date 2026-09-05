---
type: decision
updated: 2026-09-05
sources: [docs/DECISION_LOG.md, LICENSE, package.json, README.md, CONTRIBUTING.md]
status: decision-needed
---

# Decision #6 — License the Repository (2026-09-03) — DECISION NEEDED

`LICENSE` grants no rights to any person to use, copy, modify, or
distribute the software without the copyright holder's prior written
permission, and `package.json` sets `"license": "UNLICENSED"` — read
literally, proprietary and all-rights-reserved. Yet `README.md` gives full
self-hosting instructions and `CONTRIBUTING.md` opens with a PR workflow,
and neither previously said a word about licensing terms. This entry
documents the contradiction; it does **not** resolve it.

Three options are laid out, not ranked: **(1) keep it proprietary** and say
so everywhere (a CLA or written grant would be needed before merging PRs);
**(2) adopt a permissive license** (MIT/Apache-2.0) — broad rights,
including commercial reuse, no revocation once released; **(3) adopt a
source-available / fair-source license** (e.g. a Business Source License) —
preserves a commercial moat but with more legal nuance to draft correctly
and without full "open source" branding/eligibility.

**Status: DECISION NEEDED, open, addressed to the owner.** No license
change is implied or authorized by this entry; `LICENSE` is unchanged. See
[[Owner - License Decision]].

## Sources

- `docs/DECISION_LOG.md` — "Decision #6"
- `README.md`, `CONTRIBUTING.md` "Licensing" sections
