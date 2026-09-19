---
type: audit
updated: 2026-09-19
sources: [docs/audits/2026-09-19-receipt-gate-inplace/README.md]
status: active
---

# Audit — 2026-09-19 Receipt Gate Inplace

**Directory:** `docs/audits/2026-09-19-receipt-gate-inplace/` (the lane
record for `lane/receipt-gate-inplace`).

**What it is:** the test for the one receipt-gate path nothing covered — a
PENDING entry rewritten IN PLACE into a measured one, which
`docs/UNIFIED_STATE_2026-09-02.md`'s 2026-09-11 addendum and
[[Owner - R5 Measurement and Merge]] both document as the owner's actual
closing move, and which the gate's own `extractEntries()` docstring already
flagged as a blind spot ("a line added before the first heading belongs to
no entry and is ignored") without a fixture ever exercising it.

**What it found:** the blind spot is real, and in its dangerous direction —
not merely "an in-place rewrite whose heading is left untouched still fails
the range" (it does, safely, but for a generic reason), but "a still-PENDING
entry, heading untouched, sitting beside an unrelated well-formed entry in
the same range, makes the WHOLE range report `ok: true`" — a false pass.
Reproduced directly against the unmodified gate before any fix, and against
the real repository's own history (`53f6e377..<owner-measure-e2e fixture
tip>` — a range that only ever appends a new entry after the real ledger's
real, untouched, final 2026-09-12 entry — incorrectly failed that untouched
entry, caught by `tests/scripts/owner-measure-e2e.test.ts`).

**What it fixed** (`scripts/check-scoring-receipt.mjs`): a second detector,
`entriesModifiedInPlace()`, that finds an entry's span by line-NUMBER
overlap against the diff's hunk headers in the target tree — independent of
whether the entry's heading line was itself part of the diff — and validates
what it finds against the entry's full current body. A second, narrower bug
surfaced while validating the fix itself: the naive span (heading through
the next heading's line) counted an inserted blank separator line ahead of a
brand-new neighboring entry as belonging to the entry BEFORE it, which
false-failed a plain append. Fixed by trimming trailing blank lines from the
span used for the overlap test (`contentEnd`).

**New test:** `tests/core/receipt-gate-inplace-rewrite.test.ts` — the six
cases from the lane brief ((b) full in-place conversion passes, (c) heading
left PENDING fails naming it, (d) one leftover pending field fails naming
it, (e) doc-only change passes untested, (f) append-beside-a-new-PENDING
fails per [[Owner - R5 Measurement and Merge]]) plus the false-pass
regression (`C-DANGER`) and a false-fail regression guard for the fix's own
mechanism. 7/7 pass. Full before/after detail, every suite run, and exact
exit codes are in the directory's README.

**What it did not do:** no real-corpus measurement (this lane's change is
gate tooling, not scoring code), no `npm run brain` (per the lane brief —
this note satisfies the staleness guard without regenerating the graph).
