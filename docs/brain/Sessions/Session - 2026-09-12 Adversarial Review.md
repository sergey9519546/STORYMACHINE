---
type: session
updated: 2026-09-12
sources: [docs/PATH_TO_EXCELLENCE.md, docs/audits/2026-09-12-adversarial/README.md, docs/LANE_STANDARD.md]
status: active
---

# Session — 2026-09-12: The Adversarial Review

**Heading:** "2026-09-12 — the adversarial review: eight lanes, twenty-one
review rounds, no lane through on its first pass." The owner asked for a
principal-level adversarial review of the current features and logic, run as
an orchestrator over subagents, aimed at the best achievable version of this
product. Three read-only investigators chose the direction; eight build lanes
followed ([[Audit - 2026-09-12 Adversarial Review]]), every one reviewed
independently before merge and none passing on its first pass.

**What landed on main (c087a6ca → 54e97efd):**

- `verify-covers-tier` — one claim set behind both exporters and both
  verifiers; nine more verified fields; the forgery limit stated with its
  counterexample committed. See [[Surface - Coverage Letter]].
- `instrument-integrity` — the gates reporter proves its own liveness; one
  scene segmenter for every harness; CLIMAX_RELOCATE to position one with the
  floors re-locked from a rerun. See [[Gate - Public Benchmark]].
- `writer-loop-client` — RE-RUN runs; jump spans belong to their finding; the
  front door's headline card is generated, not typed; one health number; a
  readiness race fixed once at the cause. See [[Surface - Start Screen]] and
  [[Surface - Coverage Summary]].
- `rulebook-and-guard-bound` — idempotent rulebook regeneration with a
  zero-diff guard; the voice-eligible bound derived from measured cost
  (675,000). See [[Gate - Rulebook Freshness]] and
  [[Gate - Fountain Shape Guard]].
- `writer-followups` — the gate rate-limit multiplier scoped to browser
  gates; the fuzzer boots two servers and proves both halves of overflow
  shedding; the 503s named correctly as the doctor analysis budget.
- `exports-truth` — one priorities list on four surfaces; the FDX round trip
  true in both directions; the letter's promise matches its measured length.
  See [[Surface - Script Doctor Panel]].

**Owner-gated:** [[Branch - Adversarial 2026-09-12]] — READY-FOR-OWNER at
3124a94e after three review rounds, with `npm run probe-corpus-shape` as the
owner's first instruction; `scoring/forced-cue` stacked on it.

- `p0-flow-race` — the smoke gate's earliest-instant race was a gate race,
  not a product defect; both windows (MOUNT, IN FLIGHT) are now pinned rather
  than trusted, and the regressed tree is caught 6 of 6
  (`docs/audits/2026-09-12-adversarial/p0flow-lane-report.md`).

**What the process learned:** a claims-register row collision between two
MERGE-reviewed lanes, fixed by renumbering at merge and a citation test that
fails on duplicates, gaps and wrong-row pointers; merge-gate suites that fail
under load and pass idle, hence gates as separate steps on a quiet machine;
a second container rebuild and three session-limit kills survived by
`docs/LANE_STANDARD.md` §7.

## Sources

- `docs/PATH_TO_EXCELLENCE.md` — the ninth session record
- `docs/audits/2026-09-12-adversarial/README.md` — the lane table
- `docs/LANE_STANDARD.md` §7
