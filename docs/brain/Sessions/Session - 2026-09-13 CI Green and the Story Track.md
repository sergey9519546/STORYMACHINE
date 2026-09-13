---
type: session
updated: 2026-09-13
sources: [docs/PATH_TO_EXCELLENCE.md, docs/audits/2026-09-13-ci-green/README.md, docs/audits/2026-09-13-owner-measure/owner-measure-lane-report.md, docs/LANE_STANDARD.md]
status: active
---

# Session — 2026-09-13: CI Green, and the Story Track Begins

**Heading:** "2026-09-13 — CI green, and the story track begins: four defects only
the runner could show, the owner's run as one command, and generation
measured before it is tuned." GitHub Actions ran for this repository again;
the first real run on `main` since 2026-09-02 was red on one subtest, later
runs on two more and on the browser job, and four lanes fixed each at its
cause ([[Audit - 2026-09-13 CI Green]]). Run 34752536029 on `16b669f6` is
the first fully green main run since 2026-09-02.

**What landed on main (32fa44f6 → 16b669f6 and before):**

- `voice-bound-ci-derivation` — a second, orthogonal bound on the eligible
  cast, derived on the runner's own CPUs and locked in a table the test
  reads; the weight bound untouched. See [[Gate - Fountain Shape Guard]].
- `ci-concurrency` — superseded lane-branch runs cancelled, main's runs
  keyed by SHA, a failure summary at the end of every test job and the full
  TAP uploaded.
- `palette-close-race` — the one-time lazy import of the Ship panel raced the
  palette's exit animation; the assertion now waits for the dialog to
  detach, with a scanner that tracks each locator's open and close.
- `ci-env-failures` — the runner's ambient environment leaked into spawned
  children; a `rev-parse --verify` hole that accepted any well-formed SHA;
  `npm run test:ci-env` replicates the runner by subtraction and addition.
- `owner-measure` — `npm run owner:measure`, the owner's blocking corpus
  measurement as one command. See [[Owner - R5 Measurement and Merge]].

**The owner's direction:** story generation quality is the main track. A
model key went into `.env`; the first story lane (`lane/story-bench`)
measures what the generator produces today — six premises, doctor-scored, a
reading packet with a five-question rubric — before anything is tuned. The
research map's unintegrated modules are listed in the session record.

## Sources

- `docs/PATH_TO_EXCELLENCE.md` (the tenth session record)
- `docs/audits/2026-09-13-ci-green/README.md`
- `docs/audits/2026-09-13-owner-measure/owner-measure-lane-report.md`
- `docs/LANE_STANDARD.md` §4 (`test:ci-env`), §7
