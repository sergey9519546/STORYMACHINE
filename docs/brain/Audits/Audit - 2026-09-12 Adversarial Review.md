---
type: audit
updated: 2026-09-12
sources: [docs/audits/2026-09-12-adversarial/engine-logic.md, docs/audits/2026-09-12-adversarial/server-data-tests.md, docs/LANE_STANDARD.md]
status: active
---

# Audit — 2026-09-12 Adversarial Review

**Directory:** `docs/audits/2026-09-12-adversarial/` — two read-only
investigator reports. `engine-logic.md` (investigator B: `doctor.ts` and its
import graph, the public benchmark, structural signals, the shape guard, the
calibration corpus, the claims register) and `server-data-tests.md`
(investigator C: server, data paths, test soundness). Both worked in a
`git archive` export with probes they wrote themselves, and re-derived every
published statistic with independent implementations rather than reading the
repository's.

**What it is:** a mistake hunt conducted against `main`, not a lane. Nothing in
it changed code; each finding is ranked by how much it changes what the score
*means*, and each carries a severity (WRONG / UNPROVEN / FRAGILE /
STALE-CLAIM) and a phase anchor.

**What it is NOT:** a re-list of the owner-gated items already recorded against
`scoring/feature-length-defects` in [[Audit - 2026-09-07 Innovation Batch]].
Those are excluded by the report's own scope statement.

## The findings this repository has acted on

Three INSTRUMENT findings were fixed on `lane/instrument-integrity`
(2026-09-12). None of them moved a health value: the doctor output-identity
harness is 45/45 byte-identical and the receipt gate reports "no scoring-path
files changed".

* **Finding 7 — `npm run gates`' one positive row was satisfied by a gutted
  suite.** The reporter called [[Gate - Public Benchmark]] `[RAN]` whenever the
  suite exited 0, and a suite asserting `Number.isFinite(auc)` instead of
  `auc >= floor` also exits 0. The row is now checked five ways, the last two
  being "the suite reports every floor it guards" and a MUTATION run that
  raises one floor above its own measurement and requires a named failure. Cost:
  `npm run gates` 5.86–6.51 s → 11.47–11.68 s (three consecutive runs each, back
  to back on one machine).
* **Finding 12 — `CLIMAX_RELOCATE` did not do what every document said, and no
  degradation asserted it changed its input.** It spliced the final scene in at
  position TWO, leaving the opening intact; and `shuffleDropDegrade` — the
  AUC-24 recipe — split scenes on `INT.`/`EXT.` only, so `EST.`, `I/E.`,
  `INT./EXT.` and forced `.HEADING` lines were invisible and a mixed-heading
  script came back unchanged. There is now ONE segmenter reading the doctor's own
  grammar (`scripts/lib/scene-segments.ts`), the relocation lands at position
  one, and a no-op is an error rather than a 0.5 tie. The two ORDER floors were
  re-locked from the corrected manipulation; see [[Gate - Public Benchmark]] for
  the before/after and [[Gate - AUC-24 Ratchet]] for what the segmentation change
  means for the owner's lock.
* **Finding 6 — `CLIMAX_DED_MIN_SCENES` was presented as a live feature-scale
  gate in four places.** `climaxZoneDecayDeduction` is exported and wired into
  nothing (`doctor.ts:2127-2131` records the revert), so "never fires at this
  length" implied it fires at some length. All four now name
  `ARC_DED_MIN_SCENES` alone.
* **Finding 11 — the claims register checked that an evidence `path` exists,
  never that a `path:line` points at the right code.** Three files cited
  `doctor.ts:1892-1898` for a comment that has been at `doctor.ts:2092-2093`
  since before a prior audit recorded the same anchor FIXED elsewhere. The
  anchors are corrected and [[Gate - Claims Register Lane]] now requires every
  `path:line` pointer to carry a quoted anchor string found within ±3 lines.

## The findings it left open

The report's own "best achievable version" names three properties the score does
not have, all of them `doctor.ts` work behind [[Gate - Receipt Gate]] and the
owner's corpus: a **live density gradient** (finding 1 — the term is a saturated
logistic, and for 10 of the 32 public scripts and all of feature length the
entire 3,217-constant rule channel has gradient exactly zero); **parse and format
invariance** (findings 4, 5, 13 — a Fountain-legal dialogue reflow moves health
by up to 11.1 points, five times the whole measured structural signal); and
**ensemble order invariants instead of single witnesses** (findings 2, 3 —
reversing all 231 scenes of the feature fixture RAISES health by 5.0 and promotes
CONSIDER → RECOMMEND). Also open: the calibration corpus's word-budget confound
(finding 8), the shape guard rejecting a 20-character ensemble feature
(finding 10), and `npm run rulebook` not being idempotent (finding 14).

**What it could not break, which is worth as much:** all six public-benchmark
statistics reproduce exactly on the investigator's own code; determinism holds
across the worker and in-process paths (0 of 10 reports differ); CRLF, BOM,
tab→space and trailing-blank-line invariance is exact; the `DIALOGUE_FLATTEN`
control is not contaminated by the normaliser; `3217` reproduces from the live
pass files; and no `supported` claims-register row has a missing path or a
past-EOF line.

**Related:** [[Gate - Public Benchmark]], [[Gate - AUC-24 Ratchet]],
[[Gate - Claims Register Lane]], [[Audit - 2026-09-06 Mistake Search]],
[[Patterns]].

## Sources

- `docs/audits/2026-09-12-adversarial/engine-logic.md` — findings 1–14, "What I could not break", "The best achievable version"
- `docs/audits/2026-09-12-adversarial/server-data-tests.md` — server, data-path and test-soundness findings
- `docs/LANE_STANDARD.md` §7 — why the lane's report is committed into the repository
