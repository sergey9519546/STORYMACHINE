---
type: audit
updated: 2026-09-05
sources: [docs/audits/2026-09-04-evening-batch/AUDIT.md]
status: active
---

# Audit — 2026-09-04 Evening Batch

**Directory:** `docs/audits/2026-09-04-evening-batch/` (`AUDIT.md`).

**What it is:** a read-only audit of the range `975eada2..948c2a6b`
(2026-09-04), run in an isolated worktree with every claim assumed false
until reproduced and every probe reverted afterward (`git status` clean).

**What it found:** the Fountain shape guard's routing hole (all 9 routes
now reject an uploaded FDX/PDF whose converted Fountain has excessive
character cues) is closed, but **the guard it routes to is not sound**:
`CUE_LIKE_LINE_RE` in `server/lib/validation.ts` is ASCII-only and capped
at 40 characters, while the analyzer's own `CHARACTER_CUE_RE` in
`src/lib/fountain.ts` has no such cap and accepts Unicode capitals — so
Cyrillic, Greek, hash-containing, or 41+ character cues pass the guard and
still reach the analyzer, measured at 3,000 cues per family, HTTP 200 in
2.1-6.4 seconds, quadratic. Verdict: **PARTIAL**.

**What was NOT reproduced / what remained open:** this is the audit that
fed [[Session - 2026-09-04 Evening Build Attack Repair]]'s "attacked with
real payloads, then repaired" item — the audit itself only diagnoses; the
guard rebuild on the parser's exported cue classes happened in the
following session, and [[Session - 2026-09-05 Review Batch]]'s "shape
guard" lane (5 review rounds) is what actually closed the class of bypass
this audit named.

## Sources

- `docs/audits/2026-09-04-evening-batch/AUDIT.md`
