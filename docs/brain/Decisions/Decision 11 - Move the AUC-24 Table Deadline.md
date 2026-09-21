---
type: decision
updated: 2026-09-20
sources: [docs/DECISION_LOG.md, scripts/report-unverified-gates.mjs, CLAUDE.md, scripts/owner-measure.mjs, docs/p1-benchmark/MEASUREMENT_RUNBOOK.md]
status: active
---

# Decision #11 — Move the AUC-24 Table Deadline to 2026-11-01 (2026-09-20)

`scripts/report-unverified-gates.mjs`'s `auc24-table` gate — the one
protecting `tests/core/auc24-table.test.ts`, which recomputes the AUC-24
floor in CI from a committed table of numbers instead of corpus text — has
carried `expires: '2026-10-01'` since
[[Decision 5 - Every Reported Unverified Gate Gets an Expiry]] (2026-09-03).
`tests/fixtures/auc24-table.json` has never been committed; only
`npm run lock-auc24`, run against the private, copyright-restricted
real-script corpus on the owner's machine, can produce it, and the corpus
cannot reach CI by design (mounting it via secrets was rejected — secrets
are not a corpus transport). Left unmoved, the gate would flip
`report-unverified-gates.mjs` to exit 1 on every branch from 2026-10-01, per
the reporter's own expiry mechanism.

**Decided:** move the `auc24-table` gate's `expires` from `2026-10-01` to
`2026-11-01`, aligned with the latest existing gate deadline already in that
file (`craft-kb`, also 2026-11-01, set by Decision #5). `AUC24_FLOOR`
(0.622) and `AUC24_DEGRADATION_ID` (`shuffle-drop/v3`) are untouched — this
is a deadline move, not a measurement or a floor change.

**Why now, substantively (not just administratively):** `AUC24_DEGRADATION_ID`
was bumped to `shuffle-drop/v3` on 2026-09-19 (see
[[Gate - AUC-24 Ratchet]] and `CLAUDE.md`) — a reassembly fix so a degradation no longer
welds two scenes together on a script with no trailing newline. Any table
locked before that fix would already be invalid on the current recipe and
refused by `tests/core/auc24-table.test.ts`'s own recipe-ID check. The
2026-10-01 deadline could not have been met with a *valid* table even by an
owner who ran the lock the moment the finding was reported
(`SESSION_REPORT_2026-09-19.md` §4 row 7); the first table this recipe can
ever produce can only be locked from 2026-09-19 onward.

**Why a move and not deletion:** the gate's own header sanctions exactly
this as one of three acceptable responses to an expiry arriving — close the
gate, delete it if it stopped mattering, or move the date deliberately, in a
diff a reviewer sees and can refuse. The gate protects a real, closable gap
(one local command on the owner's machine), so deleting it would remove the
only forcing function keeping that gap from staying open indefinitely — the
exact failure Decision #5 and the 2026-09-02 retrospective exist to prevent.

**What the owner must do before 2026-11-01:** `npm run measure-real` (a
fresh measurement on the current recipe), then `npm run lock-auc24` against
the real corpus, then commit `tests/fixtures/auc24-table.json`.
`npm run owner:measure` (`scripts/owner-measure.mjs`) runs both in sequence
and stages the file. See [[Owner - Lock AUC24 Table]].

**What happens if not:** `scripts/report-unverified-gates.mjs` exits 1 and
`npm run gates` fails on every branch from 2026-11-01, by design — the same
blocking behavior the unmoved date would have produced on 2026-10-01, now
aligned with a date the recipe could actually be met by.

**Updated in the same change:** `CLAUDE.md`'s "(blocking from 2026-10-01)"
gotcha, `scripts/owner-measure.mjs`'s deadline comments/output,
`docs/p1-benchmark/MEASUREMENT_RUNBOOK.md`,
[[Gate - AUC-24 Ratchet]] and [[Owner - Lock AUC24 Table]], and
`tests/scripts/report-unverified-gates.test.ts`'s assertion against the real
gate list's rendered `expires:` line. Dated session records, audit
directories, and the P1/public-benchmark baseline docs that cited
2026-10-01 as a fact observed at their own time of writing are left as
written, per this project's standing convention for dated records (see
[[Gate - AUC-24 Ratchet]]'s own note that "the dated baseline doc is left as
written"). That entry's original decision and dates are otherwise unchanged
as a record of what was set on 2026-09-03.

## Sources

- `docs/DECISION_LOG.md` — "Decision #11"
- `scripts/report-unverified-gates.mjs` (the `auc24-table` gate)
- `CLAUDE.md` (the AUC-24 gotcha), `scripts/owner-measure.mjs`
- `docs/p1-benchmark/MEASUREMENT_RUNBOOK.md`
