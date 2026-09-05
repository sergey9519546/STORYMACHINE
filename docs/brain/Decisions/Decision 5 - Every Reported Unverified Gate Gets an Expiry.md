---
type: decision
updated: 2026-09-05
sources: [docs/DECISION_LOG.md, scripts/report-unverified-gates.mjs]
status: active
---

# Decision #5 — Every Reported Unverified Gate Gets an Expiry (2026-09-03)

`scripts/report-unverified-gates.mjs` gained a per-gate `expires` field on
2026-09-02, but only the `auc24-table` gate had one set (2026-10-01) — the
E2E journeys suite, the craft-KB test, and the two local-corpus
discrimination suites had no deadline, so a reported gap could stay open
indefinitely with no forcing function. **Decision: every gate gets an
explicit expiry.**

- `tests/e2e/journeys.test.ts` (env `RUN_E2E`) → **2026-10-15**.
- `tests/nvm/generate/craft-kb.test.ts` (file `data/craft/craft-kb.json`) →
  **2026-11-01**; closing it requires deciding whether to commit the
  generated KB or a derived hash.
- `tests/core/real-script-corpus.test.ts` and
  `tests/core/anti-slop-real-corpus.test.ts` → **`expires: null`**, with a
  recorded reason: the corpus cannot reach CI by design, and the closable
  half is already covered by the [[Gate - AUC-24 Ratchet]]'s committed-table
  gate, which does have a deadline.

An expiry forces a revisit — the gate closes, someone deletes it, or
someone deliberately moves the date in a reviewable diff. It does not
change any gate's pass/fail criteria.

## Sources

- `docs/DECISION_LOG.md` — "Decision #5"
- `scripts/report-unverified-gates.mjs`
