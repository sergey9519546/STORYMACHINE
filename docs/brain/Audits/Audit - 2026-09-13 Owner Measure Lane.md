---
type: audit
updated: 2026-09-13
sources: [docs/audits/2026-09-13-owner-measure/owner-measure-lane-report.md]
status: active
---

# Audit — 2026-09-13 Owner Measure Lane

**Directory:** `docs/audits/2026-09-13-owner-measure/` (the lane report for
`lane/owner-measure`, which built `npm run owner:measure`).

**What it is:** the record of the lane that turned the owner's one blocking P1
step — measure the stacked scoring branches on the private corpus and lock
`tests/fixtures/auc24-table.json` before the 2026-10-01 CI deadline — from an
afternoon of reading seven documents into one command. The report carries the
model of what the command does, the before/after, every gate's exit code, and
the list of guards shown FAILING on their unfixed input before passing. See
[[Owner - R5 Measurement and Merge]], [[Owner - Run Measure Real]] and
[[Owner - Lock AUC24 Table]], which are now the explanation of what the command
does rather than the procedure, and [[Gate - AUC-24 Ratchet]] for the artifact
the last step produces.

**What it found in the record, before writing any code:**

- [[Branch - Renderer Residuals]]'s recorded tip was stale — the notes said
  `56b96765`, `origin` has `a4df0c49` (the round-2 review commit on top). The
  first `--plan` run printed the disagreement and refused.
- The adversarial stack is a stack by CONTENT, not by git ancestry:
  `scoring/adversarial-2026-09-12` carries rebased copies of
  [[Branch - Feature-Length Defects]]'s commits and is not its descendant.
- [[Branch - Forced Cue]] has no receipt range that can pass alone — it added
  ROWS to the adversarial entry, not a new dated heading, so
  `check-scoring-receipt 4cf5b2f3..089bec91` fails with "gained no new entry".
- [[Gate - Corpus Layout Verification]] cannot pass on this repository as
  committed: it assumes the migrated corpus schema and
  `scripts/output/corpus-split.json` is the pre-migration 761-script P1 split.
- `scripts/measure-real-script-discrimination.ts` still carries its OWN copy of
  the degradation recipe with the pre-2026-09-12 scene segmentation, while
  `lock-auc24` uses `shuffle-drop/v2`. Recorded, not fixed: changing it changes
  a measured number and needs its own receipt.

**What it did NOT do:** it ran no real-corpus measurement (there is no corpus
here), modified no `scoring/*` branch, and touched no scoring-path file —
`check-scoring-receipt main..HEAD` reports "no scoring-path files changed".
