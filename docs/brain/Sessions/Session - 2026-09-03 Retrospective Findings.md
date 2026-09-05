---
type: session
updated: 2026-09-05
sources: [docs/PATH_TO_EXCELLENCE.md, docs/audits/2026-09-02-retrospective/RETROSPECTIVE.md]
status: active
---

# Session — 2026-09-03, the Retrospective's Twelve Findings, Worked

**Heading:** "2026-09-03 session — the retrospective's twelve findings,
worked." [[Audit - 2026-09-02 Retrospective]] ranked twelve mistakes and
weak routes; this session dispatched each to an isolated-worktree agent and
pushed 26 commits (`a4bec2fc..e40f4cf5`, 146 files).

- **#3 + #5** — [[Gate - Receipt Gate]] now classifies every file reachable
  from `doctor.ts` as scoring-path; the reachable set was then cut from 85
  to 63 files (outside-core 43 → 21, justified allowlist) by inverting the
  LLM dependency and splitting the SQLite `Stage`/Express out of the
  doctor's graph — see [[Gate - Pure-Core Boundary]].
- **#2 + #9 + #7** — the [[Gate - AUC-24 Ratchet]] became CI-recomputable
  from committed numbers: `scripts/lib/auc.ts` (one definition), `npm run
  lock-auc24`, `tests/core/auc24-table.test.ts`, and
  `scripts/report-unverified-gates.mjs` blocking past a per-gate expiry
  (the table's is 2026-10-01 — see
  [[Decision 5 - Every Reported Unverified Gate Gets an Expiry]]).
- **#4** — collab rooms became server-minted capabilities (128-bit ids,
  token minting requires a live room, WebSocket upgrade re-checks the
  registry) — see [[Surface - Collab Room]].
- **#6 + #8** — the 21 zero-test-reference rules got fire/no-fire tests;
  `docs/CLAIMS_REGISTER.md` was created (22 rows at the time) with the
  [[Gate - Claims Register Lane]] and a planted-violation test.
- **#10** — the power analysis: at n=153 the 95% CI on an AUC of 0.80 is
  about ±0.07; see [[Decision 4 - Adopt the Power-Analysis Proposals]] and
  [[Measurement - POWER_ANALYSIS_2026-09-02]].
- **#12** — the title page persists across a migration; a follow-on
  data-path audit fixed a silent overwrite (a stale server backup used to
  win over a newer browser save without a word).
- Browser proofs became a CI job (six suites at the time — see
  [[Gate - Browser Battery Suites]]); 74 vacuous tests made behavioural;
  the 375/390px mobile clip on Settings → Session → Delete Everything was
  fixed; four false present-tense claims corrected.
- **#1 — verbosity bias** ships as the unmerged branch
  [[Branch - R5 Verbosity Bias]], not merged to main.

## Sources

- `docs/PATH_TO_EXCELLENCE.md` — "2026-09-03 session — the retrospective's twelve findings, worked"
- `docs/audits/2026-09-02-retrospective/RETROSPECTIVE.md`
