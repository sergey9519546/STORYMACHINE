# Audit — 2026-09-19 receipt-gate-inplace

**Lane:** `lane/receipt-gate-inplace`. **Scope:** add the missing test for
`scripts/check-scoring-receipt.mjs`'s "rewrite a PENDING entry in place"
path — the exact edit `docs/UNIFIED_STATE_2026-09-02.md`'s 2026-09-11
addendum and `docs/brain/Owner/Owner - R5 Measurement and Merge.md` document
as the owner's actual closing move after a real corpus run — and fix the
gate if the test found it wrong. It did.

## What was untested

`tests/core/scoring-receipt-guard.test.ts`, `tests/core/check-scoring-
receipt.test.ts` and `tests/scripts/receipt-conversion.test.ts` between them
cover ~9 shapes of "append a brand-new PENDING entry" and the mechanical
three-scan converter that rewrites one, but none of the three drives
`check-scoring-receipt.mjs`'s real CLI over a range whose diff never
re-emits the entry's own `### ` heading line — i.e. a range that edits an
existing entry's FIELDS while its heading text stays byte-identical to what
it was in the base commit. That is precisely the shape a hand-edited (or
partially-scripted) in-place conversion can take, and it is the one shape
`extractEntries()`'s own docstring already flagged as a blind spot without
anyone having written a fixture for it: "anything added before the first
[recognized heading] belongs to no entry and is ignored."

## The six cases, and what the gate does on each (after the fix)

All driven through the real CLI (`node scripts/check-scoring-receipt.mjs`,
via `spawnSync`, on a throwaway git repo, push-event shaped) in
`tests/core/receipt-gate-inplace-rewrite.test.ts`. Every case starts from
the SAME base state: a `before` commit that files one PENDING entry (heading
`### 2026-09-19 — LANE RECEIPT-GATE-INPLACE: fixture scoring change —
PENDING OWNER MEASUREMENT`, every field's value literally `pending owner
measurement`, field set copied from the real 2026-08-21 W1/W2 entry: Date,
Git SHA, Command, Measured AUC-24, Corpus fingerprint, Runner attestation).

| case | what the `after` commit does | result |
|---|---|---|
| (a) | (the `before` commit itself — not a range under test, the fixture every other row rewrites from) | n/a |
| (b) | heading rewritten to drop PENDING; every field given a real-looking measured value | **PASS**, exit 0, "gained a well-formed new entry" |
| (c) | heading left byte-identical (still literally PENDING); every field measured | **FAIL**, exit 1, names `PENDING ENTRY`, quotes the heading, says `the entry heading contains "PENDING"` |
| (d) | heading rewritten to drop PENDING; every field measured except Corpus fingerprint, whose new text still contains the phrase "pending owner measurement" | **FAIL**, exit 1, `the **Corpus fingerprint** field contains "PENDING"` |
| (e) | entry rewritten in place to fully measured; `doctor.ts` **not** touched in this range | **PASS**, exit 0, "no scoring-path files changed" (the receipt is never even inspected) |
| (f) | a NEW PENDING entry and a NEW well-formed entry are both filed in the same range (UNIFIED_STATE's "append beside" case — the PENDING entry is new to the range here, unlike (c)/(d)) | **FAIL**, exit 1, names the PENDING entry |

Two additional cases pin the bug found while building the above (next
section): **C-DANGER** (a still-PENDING entry, heading untouched, body
rewritten to look measured, sitting beside an unrelated well-formed entry —
must not false-pass) and a regression guard (appending a brand-new entry
right after an untouched, already-valid entry must not false-FAIL on the
untouched one). Both pass after the fix; C-DANGER reproducibly failed
(`ok: true`, exit 0) before it.

## The bug found, and the fix

`extractEntries()` groups ADDED diff lines into entries by finding a
`### <date>` heading among them; a line added before any such heading
"belongs to no entry and is ignored" (its own docstring). That is correct
for a brand-new entry (100% of its lines are added) but wrong for an
existing entry rewritten in place without touching its heading: none of its
changed field lines are ever grouped into anything, because the heading line
that would start the group was never part of the diff.

Alone, this fails SAFE — case (c) above still exits 1, because zero entries
are ever recognized in the range, and `checkReceiptForRange`'s "gained no
new entry" fallback fires. That is not the failure mode that matters. The
dangerous one is **C-DANGER**: the moment a SECOND, genuinely unrelated,
well-formed entry exists anywhere else in the same range, `extractEntries()`
finds exactly that one entry, validates it clean, and
`checkReceiptForRange` returns `ok: true` — a scoring-path range containing
an entry whose heading still, in the committed tree, literally reads
`PENDING OWNER MEASUREMENT`, and that entry was never once passed to
`validateEntry`. Reproduced against the unmodified gate before any fix:
`C-DANGER` exited 0.

**The fix** (`scripts/check-scoring-receipt.mjs`): a second, independent
detector, `entriesModifiedInPlace()`, that does not rely on the diff's
CONTENT at all. It reads the diff's hunk headers (`@@ -a,b +c,d @@`) to get
the changed line NUMBERS in the range's target tree, reads that tree's full
current receipt text, and asks which entries' line SPANS (heading through
the line before the next heading) overlap a changed line number — a pure
position correlation, independent of whether the entry's heading itself
happened to be part of the diff. Any entry found this way that
`extractEntries()` did not already recognize is validated against its FULL
current body and merged into `checkReceiptForRange`'s problem list.

**A second bug surfaced while validating the fix itself, before it shipped**:
the first version of `entriesModifiedInPlace()` used each entry's raw
`[start, end)` span (`end` = the next heading's line index) for the overlap
test. Appending a brand-new entry right after an untouched one inserts a
blank separator line ahead of the new heading, and that inserted blank
line's line number falls, by plain index arithmetic, inside the PRECEDING
entry's span — so the detector read a clean append of an unrelated entry as
an in-place edit of the entry before it, and (correctly, since the new
entry is excluded via `alreadyRecognized`) went on to validate the
untouched, unrelated entry as if this range had rewritten it. Reproduced
directly against the real repository history: `node scripts/check-scoring-
receipt.mjs 53f6e377..<owner-measure-e2e-fixture-tip>` — a range that only
ever appends a NEW entry after the real ledger's real, untouched, final
`2026-09-12 — PUBLIC BENCHMARK RE-LOCK …` entry — failed, quoting that
untouched entry: `missing required field **Command**` (that entry
legitimately has no `Command` field; it was never meant to be validated).
`tests/scripts/owner-measure-e2e.test.ts`'s "the REAL check-scoring-receipt
CLI exits 0 on the committed tree" caught this immediately (1 failure out
of 56 on that file). Fixed by giving each entry a `contentEnd` — `end` with
trailing BLANK lines trimmed off — and using that, not `end`, for the
overlap test. The regression-guard case above pins this specific shape shut.

## What was run

- `tests/core/receipt-gate-inplace-rewrite.test.ts` (new, this lane): 7/7 pass.
- `tests/core/scoring-receipt-guard.test.ts`: 26/26 pass.
- `tests/core/check-scoring-receipt.test.ts`: 8/8 pass.
- `tests/scripts/receipt-conversion.test.ts`: 43/43 pass.
- `tests/scripts/owner-measure-e2e.test.ts`: 56/56 pass (1/56 failed against
  the pre-fix gate — see above — and passed once `contentEnd` was added).
- `tests/scripts/owner-measure-plan.test.ts`: 30/30 pass.
- `tests/core/ci-gates-intact.test.ts`: 64/64 pass.
- `npm run lint`: clean (`tsc --noEmit`).
- `npm run check-no-console`: OK (310 files checked, 23 quarantine entries,
  all proven unreachable).
- `node scripts/check-scoring-receipt.mjs 53f6e377..HEAD`: see the lane's
  final report — this lane's own range should pass once its receipt-gate
  test file is treated as the scoring-path receipt it is not (this repo's
  scoring path is `server/nvm/analyze/**` + `server/nvm/revision/passes/**`
  + doctor.ts's reachable set; `scripts/check-scoring-receipt.mjs` itself is
  gate tooling, not scoring code, so this lane's change is not expected to
  require a `MEASUREMENT_RECEIPTS.md` entry).
- `node --experimental-strip-types tests/core/brain-coverage.test.ts`: run
  after this note was added, to confirm the staleness guard is satisfied.

Per the lane brief, `npm test` and `npm run brain` were **not** run in this
lane.
