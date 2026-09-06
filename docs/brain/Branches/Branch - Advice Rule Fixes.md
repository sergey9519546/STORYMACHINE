---
type: branch
updated: 2026-09-06
sources: [docs/p1-benchmark/MEASUREMENT_RECEIPTS.md, docs/p1-benchmark/BLIND_PAIRS_ON_BRANCHES_2026-09-04.md]
status: parked
---

# Branch — Advice-Rule-Fixes

**Branch:** `origin/scoring/advice-rule-fixes` @ `8a6dd037` (4 commits on
`main` @ `2bfcbf9d`). Rebased and renamed 2026-09-06; the old
`origin/claude/advice-rule-fixes-pending-measurement` @ `68c64eca` is the
pre-rebase object and is superseded, not deleted.

**What it is:** six detector-correctness fixes (corrects six specific
detector defects — see [[Measurement - DETECTOR_DEFECTS_2026-08-03]]),
distinct from [[Branch - R5 Verbosity Bias]]'s formula-level change to the
density calculation.

**Why it is parked:** same as R5 — a scoring-path change awaiting
`npm run measure-real` before merge (see [[Gate - Receipt Gate]]).
Alone, on the twelve blind-pairs fixtures, it **changes nothing measurable**
(1 of 6 ordered, matching main's own baseline exactly) — nine of twelve
scripts still tie at exactly health 76.0, all at chance on the rule
channel.

**The conflict, resolved 2026-09-06.** The five-file conflict with R5 was an
artifact of the two branches' merge-bases sitting 74 commits apart, not a
disagreement: R5 touches none of `character-arc.ts`, `rhythm.ts`,
`fountain.ts` or `agency-signal.test.ts`. Rebased onto the same `main`, this
branch's own rebase had ONE conflict (`MEASUREMENT_RECEIPTS.md`) and no code
file conflicted in the stack merge. The stacked tree now exists as
[[Branch - Stacked R5 plus Advice]].

**Re-measured on the new baseline (2026-09-06, in-repo evidence only):** 45
of 45 output-identity reports differ; health moves on 29 of 45 (RMS 6.88) and
3 verdicts change. The 16 that do not move split three ways, and only the
first group is a clamp story: **7** sit at the saturating logistic ceiling
(`p0/sample-script`, `dead-frequency`, `counter-offer` and the four
`synthetic/*-scenes`, penalty 9.99–10.00 on both sides), so a detector fix
cannot move a number already at its ceiling; **7** carry weighted issues that
do not change at all (`Firebreak`, `Lockdown`, `Low Tide`, `Splitting the
House`, `The Corner Booth`, `Yard Signs`, `Zero Day`) — these sit at density
1.70–2.10, on the POWER branch well past the clamp, with penalties 25.7–47.9,
so no clamp is involved: the six fixes simply fire identically on them; and
**2** (`chain-of-custody` 12.975 → 12.903, `mise` 14.182 → 14.086) do move,
past the clamp, by less than the displayed rounding. Blind
pairs are unchanged at 1 of 6; mean top-ten rule overlap falls 7.83 to 7.17.
Gates on the rebased tree: `npm run lint` 0, `npm test` 0 (12,961 tests, 0
failing), `npm run build` 0, `check-brain` 0.
`check-scoring-receipt.mjs main..HEAD` exits 1, correctly, because the entry
is PENDING.

**What it does once stacked, which it cannot do alone:** under R5's
un-saturating curve the audit's matched pair separates 60.4 against 47.1 —
the same 132-against-150 finding difference these six fixes create, read
through a curve that stops flattening it. Section 9 of
`docs/scoring/ADVICE_RULE_FIXES_2026-09-04.md` records it; section 8's "still
76.0 and 76.0" is left standing because it is accurate about this branch by
itself.

## Sources

- `docs/p1-benchmark/BLIND_PAIRS_ON_BRANCHES_2026-09-04.md`
- `docs/p1-benchmark/MEASUREMENT_RECEIPTS.md` — the advice entry and its 2026-09-06 rebase addendum
- `docs/scoring/ADVICE_RULE_FIXES_2026-09-04.md` sections 8 and 9 (on the branch; not on `main`)
