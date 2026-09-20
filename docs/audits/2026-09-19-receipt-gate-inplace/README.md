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

## § Regression found in review and fixed

An adversarial reviewer's probe found that this lane's own fix
(`entriesModifiedInPlace()`, above) had introduced a NEW false pass in
`checkReceiptForRange()` (~lines 850-880 at the time), fixed here on
`lane/receipt-gate-existence`.

**The false-pass shape.** The version of `checkReceiptForRange()` this lane
shipped folded the new `inPlace` result into the EXISTENCE test:
`if (entries.length === 0 && inPlace.length === 0) return { ok: false, ... }`.
But `entriesModifiedInPlace()` finds an entry by hunk line-number OVERLAP
with the entry's span — it has no requirement about *what* changed inside
that span. So any edit at all inside any *old* entry — a one-word typo fix
in a `Corpus fingerprint` line, or appending one `- **Note:** …` bullet (the
exact move this same function's own error string forbids: "Appending lines
to an existing entry is not a receipt for a new scoring change") — made
`inPlace.length` nonzero and satisfied "this range added a receipt entry",
even though the range added no entry at all and the edited entry was
already well-formed. The gate then printed, untruthfully, "gained a
well-formed new entry in the same range. OK." It also weakened
`structuralOnly` mode (release.yml's whole-release-window check), which
returned `ok: true` right after that same existence test, before any
in-place validation ran.

**The probe result.** Two attacks, confirmed on the branch before the fix
below:

- **Attack A** — a scoring-path file (`server/nvm/analyze/doctor.ts`)
  changed, plus a one-word typo fix inside a previous, valid, measured
  entry's `Corpus fingerprint` line, with no new entry anywhere in the
  range: PASS (exit 0) on the branch, "gained a well-formed new entry in
  the same range. OK."; correctly FAILS (exit 1, "gained no new entry") at
  `53f6e377` (pre-lane).
- **Attack B** — the same scoring-path change, plus one appended
  `- **Note:** …` bullet on a previous valid entry, no new entry: PASS
  (exit 0) on the branch, same untruthful "gained a well-formed new entry"
  (or, under `--structural-only`, "gained a new entry … OK
  (content was validated by CI on the range that added it)."); correctly
  FAILS at `53f6e377`.

Both were reproduced directly against the unfixed
`checkReceiptForRange()` via the real CLI (`node
scripts/check-scoring-receipt.mjs`, spawned over a throwaway git repo,
push-event shaped) before any code changed on this branch — see the
fail-first test runs below.

**The fix** (`scripts/check-scoring-receipt.mjs`, `checkReceiptForRange()`):
`inPlace` entries now contribute VALIDATION, never EXISTENCE. Their
validation runs FIRST — before the existence check, and unconditionally of
`structuralOnly` — so a problem found in an in-place entry (most often
PENDING, but any `validateEntry()` rule) fails the range by name regardless
of whether the range also happens to add a brand-new entry elsewhere
(C-DANGER, above, still fails this way in both modes). Existence is then
decided by `entries.length === 0` alone — a brand-new entry, recognized
because its OWN heading line was added — never by `inPlace.length`. A
brand-new entry's field validation is still skipped under `structuralOnly`
(release.yml's existing, intentional behavior, unchanged), but an in-place
edit is validated in both modes, because the false pass this closes is
reachable in both. The success message ("gained a well-formed new entry")
is only ever printed when `entries.length > 0`, so it can no longer
describe a range that added nothing.

**The new tests**
(`tests/core/receipt-gate-inplace-rewrite.test.ts`, describe block
"REGRESSION: an in-place edit must never count as a NEW entry (existence
test)"):

- **ATTACK A** — typo-fix-only edit inside a previous valid entry plus a
  scoring-path change: asserts exit 1 and stderr matching `/gained no new
  entry/`. Run against the unfixed script first: failed (`0 !== 1`, actual
  exit 0, stdout containing "gained a well-formed new entry in the same
  range. OK."). Passes after the fix.
- **ATTACK B** — appended Note bullet, same shape: same fail-first result
  (`0 !== 1`) before the fix, passes after.
- **ATTACK B, `--structural-only`** — the same append, run through the CLI's
  `--structural-only` flag (release.yml's whole-window mode): fail-first
  result (`0 !== 1`, stdout "gained a new entry in the same range. OK
  (content was validated by CI on the range that added it).") before the
  fix, passes after.

All 7 pre-existing cases in the same file — (b)-(f), C-DANGER, and the
append-after-untouched-entry regression guard — were re-run unchanged
against both the unfixed and fixed script and passed both times (10/10
total after the fix, 7/10 before it — see this lane's final report for the
full TAP output). `tests/core/scoring-receipt-guard.test.ts` (26/26),
`tests/core/check-scoring-receipt.test.ts` (8/8),
`tests/scripts/receipt-conversion.test.ts` (43/43),
`tests/scripts/owner-measure-e2e.test.ts` (56/56),
`tests/scripts/owner-measure-plan.test.ts` (30/30) and
`tests/core/ci-gates-intact.test.ts` (64/64) all still pass. `npm run lint`
is clean. `node scripts/check-scoring-receipt.mjs 1e7779de..HEAD` and `node
scripts/check-scoring-receipt.mjs $(git merge-base origin/main
HEAD)..HEAD` both report "no scoring-path files changed. OK." — this fix
lives in gate tooling (`scripts/check-scoring-receipt.mjs` and its test
file), not on the scoring path, so no `MEASUREMENT_RECEIPTS.md` entry is
required for it.

## § Rule-line separator fix (2026-09-20, `lane/receipt-gate-rule-span`)

Found on the way by the per-pass-diagnostics lane
(`docs/audits/2026-09-20-per-pass-diagnostics/README.md` §7), not fixed
there: `entriesWithSpans()`'s `contentEnd` trimmed only trailing BLANK lines
off an entry's span before the overlap test above. A markdown thematic break
(`---`, `***`, `___`) is not blank, so when an author separates a newly
appended entry from the previous one with such a rule — the ledger's own
separator convention, and exactly how the real 2026-09-12 entry precedes the
next one — the rule line stayed inside the PRECEDING entry's span, the
append's hunk overlapped it (the hunk's first added line IS the rule line),
and `entriesModifiedInPlace()` re-validated that historical entry against
TODAY's field rules. Reproduced exactly as the finding describes: an old
entry using the real ledger's own `**Commands (all run in this worktree
…)**` (plural) phrasing failed `REQUIRED_FIELDS`'s singular
`/\*\*\s*Command\s*:?\s*\*\*/i` pattern the moment it was re-validated,
reporting `missing required field **Command**` for a range that never
touched that entry — a false FAIL of an honest append, in the safe
direction, but one that blocks a normal ledger convention.

**The fix:** trailing lines that are blank OR match
`SEPARATOR_LINE_RE = /^\s*(?:-{3,}|\*{3,}|_{3,})\s*$/` are now both trimmed
when computing `contentEnd`. Nothing else about span computation changed,
and the 2026-09-19 existence fix directly above (in-place entries validate
but never count as new) is untouched — verified by re-running this file's
full existing suite (cases (b)-(f), C-DANGER, and the append-after-untouched
regression guard) unchanged against both the pre-fix and post-fix script.

**New tests** (`tests/core/receipt-gate-inplace-rewrite.test.ts`, describe
block "a separator rule after an entry is not part of its span"):

- **(g)** a well-formed new entry appended after a `---` rule following an
  older entry whose fields (plural `**Commands (…)**`) would fail today's
  validation if re-checked: asserts exit 0. Run against the unfixed script
  first — failed (`1 !== 0`), stderr naming `missing required field
  **Command**` on the OLD entry's heading, exactly the false FAIL the finding
  describes. Passes after the fix.
- **(h)** the same, with a `***` rule instead of `---` — same fail-first
  result before the fix, passes after.
- **(i)** a GENUINE in-place edit to that older entry's `Corpus fingerprint`
  field line, with the same `---` rule sitting right after it, no new entry
  added: asserts exit 1. This one is not fail-first — the edited field line
  is never blank or rule-shaped, so the overlap test still sees it regardless
  of the `contentEnd` change — and it passed identically before and after the
  fix, confirming the separator trim does not swallow a real edit that
  happens to sit beside a rule line.

All pre-existing cases in this file — (b)-(f), C-DANGER, the
append-after-untouched-entry regression guard, and all three
existence-test ATTACK cases — were re-run against both the unfixed and
fixed script and passed both times (13/13 total after the fix, 11/13
before it: (g) and (h) are the only two that flip).
`tests/core/scoring-receipt-guard.test.ts` (26/26),
`tests/core/check-scoring-receipt.test.ts` (8/8),
`tests/scripts/receipt-conversion.test.ts` (43/43),
`tests/scripts/owner-measure-e2e.test.ts` (56/56) and
`tests/core/ci-gates-intact.test.ts` (64/64) all still pass.
`tests/core/honesty-audit-claims.test.ts` (15/15) passes. `npm run lint` is
clean. `node scripts/check-scoring-receipt.mjs 5d1a14ce..HEAD` reports "no
scoring-path files changed. OK." and `node scripts/check-scoring-receipt.mjs
$(git merge-base origin/main HEAD)..HEAD` still reports the concurrent
per-pass-diagnostics lane's own two scoring-path files with its own
well-formed receipt — this fix again lives only in gate tooling, so no new
`MEASUREMENT_RECEIPTS.md` entry is required for it.
