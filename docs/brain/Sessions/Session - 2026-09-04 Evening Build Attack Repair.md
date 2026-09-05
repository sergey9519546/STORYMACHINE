---
type: session
updated: 2026-09-05
sources: [docs/PATH_TO_EXCELLENCE.md, docs/audits/2026-09-04-evening-batch/AUDIT.md]
status: active
---

# Session — 2026-09-04, Evening: Build, Attack, Repair, Deploy, Verify

**Heading:** "2026-09-04, evening — build, attack, repair, deploy, verify."
The owner's brief tightened twice: "inspect, understand, decide, implement,
test, attack, repair, build, deploy, verify, repeat," then "anything
half-done gets built and wired in, never removed." Main moved
`975eada2 → f7b64e9b`: 23 commits, all gated, all pushed.

- **A dense, lexicon-free signal channel** (`structural-signals.ts`) — see
  [[Measurement - STRUCTURAL_SIGNALS_2026-09-04]]. Twelve per-scene
  channels, thirteen document aggregates, from counts alone. Exposed on
  every report/HTML/letter surface; wired into nothing that scores.
- **The two pending scoring branches scored on blind pairs** before an
  owner corpus run — see [[Branch - R5 Verbosity Bias]],
  [[Branch - Advice Rule Fixes]], and
  [[Measurement - BLIND_PAIRS_ON_BRANCHES_2026-09-04]].
- **Every route was attacked with real payloads, then repaired.** Two DoS
  shapes (a 900,000-character token; 10,000 distinct one-off cues) drove
  the analyzer quadratic; both refused in <25ms by a shared shape guard —
  corrected same-day in [[Audit - 2026-09-04 Evening Batch]]: the guard
  held only for ASCII cues ≤40 chars, and a rebuild followed. The collab
  WebSocket had no frame cap; a 10MB frame now closes with code 1009.
- **The production build was actually deployed and walked** for the first
  time: no response compression, no cache differentiation, and a
  `/assets/` miss serving the SPA shell with 200 — all fixed;
  `verify-production-build.mjs` became the eighth browser suite. See
  [[Gate - Browser Battery Suites]].
- **The percentile was upgraded, not withdrawn** — the reference-set
  percentile gained a second denominator, "rank among your drafts," per
  [[Surface - Script Doctor Panel]].
- First-request cold start fixed via pool pre-warming (~2.7s → ~120ms;
  corrected same-day for the request landing inside the warm-up window
  itself).
- The landing-page contrast gate was reproduced blind, then fixed (the a11y
  suite audited mid-animation), then the actual colour violations fixed.
- Structural signals reached the product surfaces, not just the report —
  see [[Surface - Script Doctor Panel]], [[Surface - Coverage Letter]],
  [[Surface - Versions and Snapshots]].
- The browser battery gained a load-aware timing policy (`getTiming()`) and
  a `--retry-flaky` mode that never reports a retried pass as a plain pass.
- The editor bundle split (collab CRDT stack loads on first use, not for
  every writer); [[Surface - What-If Lab]] is now scored by the real
  Script Doctor via a deterministic operations-to-Fountain compiler.

## Sources

- `docs/PATH_TO_EXCELLENCE.md` — "2026-09-04, evening — build, attack, repair, deploy, verify"
- `docs/audits/2026-09-04-evening-batch/AUDIT.md`
