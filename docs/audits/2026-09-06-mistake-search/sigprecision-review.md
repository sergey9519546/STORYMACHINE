# Independent review — structural-signal precision formatter (B-7)

## Round 1

Reviewer: independent (did not build the change). Read-only — the worktree was never edited, final
`git status --porcelain` empty. Two probes plus one edge-case harness in
`/tmp/<session scratch>/layout-review/` (`sig-edges.mjs`, `sig-drive.mjs`, `sig-drive2.mjs`); both
servers I booted were shut down (`pgrep -af "strip-types server.ts"` → no match at the end). That
worktree has no `dist/`, so the server ran through Vite dev middleware against the real source — I
did not build it.

Worktree `/home/user/STORYMACHINE/.claude/worktrees/agent-a2775b6259e950437`, two commits
`485160d9` + `028830f7` on `main` `6fe6fa6a` (tag `audit/2026-09-06/sigprecision-round1`), 10 files,
+491/−30. Budget-limited pass as instructed.

**Verdict: MERGE.** The formatter is the right shape, the rule is *better* than the one the brief
literally asked for (the brief's wording would have re-shipped B-7 — see §2), every edge I could
construct behaves correctly inside the input domain the source guarantees, and I drove B-7's own
failure mode end to end on a real 80-scene draft: the panel, the exported HTML and the coverage
letter all print **`0.004`** where the pre-fix code printed `0.00`. Five numbered follow-ups below,
none blocking; item 1 is a registered sentence that does not match the shipped string and should be
corrected before the register is trusted for this row.

## 1. Brief vs diff

| # | Brief item | Status | Evidence |
|---|---|---|---|
| 1 | ONE shared formatter in `structural-signals-copy.ts` — `formatSignalValue`, `formatSignalDelta`, precision from the delta, floor 2 / ceiling 4, explicit "no measured change"; plus `signalReadingSentence` *if* the surfaces render a sentence | **DONE; the optional sentence correctly skipped** | `src/lib/structural-signals-copy.ts:49-151` (`:97`/`:103`/`:113`/`:130`/`:144`) — `SIGNAL_VALUE_FLOOR_PRECISION`/`CEILING`, `hidesNonzeroAsZero`, `deltaPrecision`, both exported functions. `signalReadingSentence` skipped with a stated reason (the five surfaces' surrounding prose differs too much for one template); the brief made it conditional, so this is compliance, not a narrowing. |
| 2 | Wire it into all five surfaces; find every `toFixed(` on a signal value by grep | **DONE, and widened to a sixth** | `ScriptDoctorPanel.tsx:818/832/897` (`formatSignalValue`) and `:2055/2059` (`formatSignalDelta`); `SnapshotManager.tsx:140-148`; `WhatIfPanel.tsx:515-516`; `coverage-html.ts:1063/1088/1093`; `coverage-letter.ts:333/339/357`; plus the Slate pair in the second commit (`SlatePanel.tsx:911`, `server/lib/slate.ts:275`). My own independent grep over `src/` and `server/` for `(meanAbsDialogueShareDelta\|actionSentenceCvOverall)…\.toFixed` returns **nothing** — all 13 sites are routed. |
| 3 | Cross-surface consistency test + a formatter unit test; prove it fails on the current tree first | **DONE** | `tests/core/structural-signal-precision-consistency.test.ts` — **28/28** here. It unit-tests the rule on the brief's four vectors, renders `coverage-html`/`coverage-letter` end to end with `0.0042`, source-matches every surface's import and call, and carries a whole-tree grep guard (`:230`). Fail-first recorded as 11/25 (five surfaces) then 3/28 (Slate extension); I did not re-derive it, having confirmed the behaviour change end to end myself instead. |
| 4 | Register any changed user-facing sentence | **DONE, one row misquotes the shipped string** | Rows 70 (the "(no measured change)" sentence) and 71 (the precision rule). See follow-up 1. |
| 5 | Update the `coverage-html` goldens only if strings change, and say which | **DONE — none changed, correctly** | `git diff --stat main..HEAD -- tests/fixtures/` is empty. I checked why: the HTML golden carries no structural-signals strip at all, and the letter goldens' values are `0.04` and `0.55`, both ≥ 0.005, so `formatSignalValue` renders them byte-identically at the 2-dp floor. "No golden changed" is the right outcome, not a missed update. |
| — | Constraints | **HELD** | `node scripts/check-scoring-receipt.mjs main..HEAD` → exit 0, "no scoring-path files changed" — including `server/lib/slate.ts`, which is outside `doctor.ts`'s import graph. `ScriptDoctorPanel.tsx` edits are formatter call sites plus the one comment block they replace; no class/token changes that would collide with the theme lane. |

## 2. The precision rule, read for correctness

**What shipped is not the rule the brief wrote, and that is the right call.** The brief asked for
"the fewest decimals at which before and after differ". Applied literally to B-7's own headline pair
that returns **2** — `0.0042` and `0.0254` *do* differ at two decimals, as `"0.00"` and `"0.03"` —
i.e. the literal rule re-ships the exact string the finding complains about. What shipped is the
fewest decimals at which **(a)** neither genuinely-nonzero value displays as zero **and** **(b)** the
two are not tied (`deltaPrecision`, `:130-136`). That is a strict superset and it is what makes
`0.0042 → 0.0254` render `0.004 → 0.025`. The report states the shipped rule accurately and its
table shows the behaviour, but never says "this differs from the brief's wording, deliberately" —
see follow-up 2.

**Edges, all measured** (`sig-edges.mjs`, importing the shipped module):

```
0.0042 -> 0.0254   "0.004 → 0.025"      0.10 -> 0.12      "0.10 → 0.12"   (unchanged, as intended)
0.123  -> 0.123    "0.12 (no measured change)"            0.5 -> 0.5001   "0.5000 → 0.5001"
before > after     0.0254 -> 0.0042  ->  "0.025 → 0.004"  (no special-casing needed, correct)
negative value     -0.0042 -> "-0.004"   (a bare toFixed(2) would print "-0.00"; the widening catches
                                          it because Number("-0.00") === 0 in JS)
tie at 2dp only    0.101 -> 0.102 -> "0.101 → 0.102"      equal zeros  0 -> 0 -> "0.00 (no measured change)"
0 -> 0.02          "0.00 → 0.02"          0.0042 -> 0      "0.004 → 0.000"
opts.precision 1   clamped up to the floor -> "0.50"      opts.precision 9  clamped to the ceiling -> "0.5123"
```

Everything above is correct. Three edges sit **outside** the input domain and behave less well; all
three are unreachable in production and I verified why rather than assuming:

- `0.00004` → `"0.0000"` (a nonzero value still shown as zero), and `0.00001 → 0.00002` →
  `"0.0000 (no measured change)"` — a sentence that is actively **false** for two genuinely
  different numbers. Unreachable because both aggregates are rounded at source:
  `server/nvm/analyze/structural-signals.ts:503` `meanAbsDialogueShareDelta: r4(mean(absDeltas))`
  and `:514` `actionSentenceCvOverall: r4(cv(...))`, so any nonzero input is ≥ 0.0001 and the
  ceiling really is full fidelity. The module header asserts this; it is true. See follow-up 3.
- `NaN` renders the literal string `"NaN"`. Unreachable: `snapshot-trend.ts:59-61`'s `numberOrNull`
  gates on `Number.isFinite`, and every other call site's field is a required `number`.
- **`formatSignalDelta(undefined, x)` and `(null, x)` throw** (`TypeError: … reading 'toFixed'`).
  `after` is guarded; `before` is not. No live path today — `FixStructuralSignalsDelta.before` is a
  required object of required numbers, `SnapshotTrendEntry`'s two fields are `number | null` and
  `ShapeRhythmTrendLine` filters `!== null` with a builder that produces `null`, never `undefined` —
  but this is now a shared module with six importers. See follow-up 4.

**The label helper is still the single source.** `ACTION_PROSE_VARIATION_LABEL` is untouched and
still the only definition: grepping `src/` and `server/` for the literal string returns two hits,
both `//` comments (`WhatIfPanel.tsx:461`, `coverage-letter.ts:336`). The panel renders
`ACTION-PROSE VARIATION` from the constant in the same strip the new number now sits in — I read it
off the live DOM below.

## 3. Driven: B-7's failure mode, one draft, three surfaces

`sig-drive.mjs` searched for a draft whose mean scene-to-scene dialogue-share delta is genuinely
below the old 2-decimal floor — 80 near-identical scenes with one slightly more action-heavy, so the
mean of 79 absolute deltas lands under 0.005 without being zero:

```
scenes=40 -> swing 0.01     scenes=60 -> swing 0.01     scenes=80 -> swing 0.004   <- the probe draft
```

The same draft, rendered on three surfaces:

```
exported HTML   (POST /api/export/coverage)         mean talk/action swing 0.004  · action-prose variation 0.08
coverage letter (POST /api/export/coverage-letter)  …word mix is 0.004 … action-prose variation is 0.08.
Doctor panel    (Coverage → Full report, live)      TALK/ACTION SWING 0.004 … ACTION-PROSE VARIATION 0.08
```

Identical strings on all three. On the pre-fix tree every one of them would have read `0.00` — the
finding's exact complaint — and the panel's own gloss ("Mean scene-to-scene change in the
dialogue/action word mix") sits beside it unchanged. Zero console errors on the driven page.

Tests re-run here: `structural-signal-precision-consistency` **28/28**, `coverage-html` **50/50**,
`coverage-letter` **45/45**, `shape-rhythm-panel-copy` **44/44**, `snapshot-trend` **63/63**;
`check-scoring-receipt main..HEAD` → **0**.

## 4. Follow-ups (numbered, none blocking)

1. **`docs/CLAIMS_REGISTER.md` row 71 quotes a string the code does not produce.** The Claim column
   opens `Talk/action swing 0.0042 → 0.0254`; the shipped render for that pair is
   **`0.004 → 0.025`** (measured above, and the report's own table says so). The row's second half
   ("…is 0.004") is right. This batch has repeatedly held that a registered sentence must be the
   shipped sentence; fix the quoted example, or quote the rule without a specific pair.
2. **Say that the rule deviates from the brief, and why.** The report describes the shipped rule
   correctly but not as a deviation. One sentence — "the brief's literal 'fewest decimals at which
   before and after differ' returns 2 for 0.0042 → 0.0254, which is the bug; the zero-hiding
   condition is the added clause" — turns a silent improvement into a documented decision, which is
   what §5 asks for when a lane departs from the brief in either direction.
3. **State the `r4()` precondition in the module header.** The ceiling is only "total fidelity"
   because both aggregates are rounded to 4 dp at source; feed the module an unrounded number and
   `0.00001 → 0.00002` renders `"0.0000 (no measured change)"` — a false claim rather than an
   imprecise one. The header says the ceiling is "the source's own `r4()` rounding resolution"; make
   it an explicit input contract so a future caller with a raw value knows it is out of domain.
4. **Guard `before` the way `after` is guarded** (`structural-signals-copy.ts:144-150`).
   `formatSignalDelta(undefined, x)` throws today; the asymmetry is invisible from the JSDoc. Either
   accept `number | null | undefined` for both and render an em-dash for a missing reading (the
   convention `SlatePanel`/`slate.ts` already use for an unscored row), or document that both must
   be finite numbers. No live crash path — I checked all six importers — but a shared formatter
   should not be one stale localStorage snapshot away from a blank panel.
5. **The whole-tree grep guard misses one shape** (`structural-signal-precision-consistency.test.ts:230`):
   it matches `(meanAbsDialogueShareDelta|actionSentenceCvOverall)\.toFixed\(`, so a hand-copy
   through a local alias (`const v = block.actionSentenceCvOverall; v.toFixed(2)`) would slip past.
   Narrow, and the destructured shape `coverage-letter.ts` actually uses is still caught. Widening
   the pattern to also flag a bare `\.toFixed\(2\)` inside those six files would close it.
   *(Style nit, same files: four surfaces now carry two separate `import … from
   '…/structural-signals-copy.ts'` statements — one for the label, one for the formatter. Merging
   them is cosmetic but the module is now imported six times and will be read as the canonical
   example.)*
