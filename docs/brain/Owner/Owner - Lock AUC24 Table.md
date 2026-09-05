---
type: owner
updated: 2026-09-05
sources: [docs/PATH_TO_EXCELLENCE.md, scripts/report-unverified-gates.mjs]
status: active
---

# Owner Item — Lock and Commit the AUC-24 Table

**Why only the owner:** producing the table requires running against the
local, copyright-restricted real-script corpus — the same reason as
[[Owner - Run Measure Real]].

**What's pending:** [[Gate - AUC-24 Ratchet]]'s CI-recomputable path
(`tests/core/auc24-table.test.ts`) skips until
`tests/fixtures/auc24-table.json` is committed. This gate carries a
deadline: **blocks CI from 2026-10-01** if still open
([[Decision 5 - Every Reported Unverified Gate Gets an Expiry]]).

**The command:**
```
REAL_SCRIPT_CORPUS_DIR=<corpus> npm run lock-auc24
git add tests/fixtures/auc24-table.json
```

## Sources

- `docs/PATH_TO_EXCELLENCE.md` "What only the owner can do now"
- `scripts/report-unverified-gates.mjs` (the `auc24-table` gate, `expires: '2026-10-01'`)
