---
type: session
updated: 2026-09-05
sources: [docs/PATH_TO_EXCELLENCE.md, docs/audits/2026-09-05-review-batch/README.md, docs/LANE_STANDARD.md]
status: active
---

# Session — 2026-09-05, Overnight: The Review Batch

**Heading:** "2026-09-05, overnight — the review batch." The owner asked
for a system that makes subagents do the best version of the work, and for
the usage limit to stop moving so fast. `docs/LANE_STANDARD.md` was written
in response — see [[Patterns]]. Six lanes went through it; **none passed
review on the first pass**, and every review found something the gates had
passed. Main moved `1e170831 → 5d2b2638`: 6 lanes, **17** review rounds
(corrected in-file from an original miscount of 15), one full suite and one
browser battery per merge on the rebased branch.

- **Readiness and logs** (3 rounds): `/ready` shared the per-IP limiter
  bucket with the whole API; a log fix let an absolute-form request line
  inject a hostname into the path field; the warm-up deadline timer was
  unref'd and could never fire; a real drain window was built.
- **Timing and dialogs** (2 rounds): the cgroup reader read the hierarchy
  root, not the process's own cgroup; dialog accessible names had no gate;
  a sibling Restore modal had the same defect.
- **Cross-surface parity** (2 rounds): a "byte-identical when absent" claim
  was false by 279 bytes, caught because the reviewer injected junk into
  every report and all 41 tests still passed; four copies of percentile
  copy had drifted (see [[Surface - Script Doctor Panel]]).
- **Draft rank, dark mode, the a11y gate** (3 rounds): a run was counted
  against itself so "tied" was always true; a container fix regressed three
  captions to 1.28:1 contrast; the a11y step audited pixels below the fold
  where axe never looks.
- **Keyless Fix & verify** (2 rounds): an FDX upload verified the raw XML
  as the rewrite; a "no model was called" test used a throwing provider
  that could not see a swallowed call. See [[Surface - Fix and Verify]].
- **The shape guard** (5 rounds, corrected from an original "four" in-file):
  the rebuilt guard missed the dual-dialogue caret, the fixture sweep
  failed from the repo root, fuzz cases could not fail, a weight bound was
  not a cost bound, and the structural bound replacing it was defeated by
  double-spaced input (what PDF/FDX imports produce).

The pattern the audit named held through the reviews too: each lane fixed
the example the reviewer gave, and the reviewer found the next member of
the class — see [[Patterns]], "proving a property with the one example
that motivated it."

## Sources

- `docs/PATH_TO_EXCELLENCE.md` — "2026-09-05, overnight — the review batch"
- `docs/audits/2026-09-05-review-batch/README.md`
- `docs/LANE_STANDARD.md`
