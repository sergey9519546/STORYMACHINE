# Instrument-integrity lane — independent review

**Reviewed object:** `lane/instrument-integrity` tip
**`29b173570a9011195677ed8ec6c6bcb7313ae59b`** (the lane's `c7e24d9d` rebased
onto `main @ 0b629491`; five commits; on `origin`). Reviewer did not build this
change. Baseline for every comparison: `git archive 0b629491`.

**Method.** `git archive 29b17357 | tar -x` into `<session scratch>/export` and
`git archive 0b629491` into `<session scratch>/baseline`, `node_modules`
symlinked, plus five throwaway copies of the export for the attack probes
(`attack`, `attack2`, `revert6`, `anchor`, `anchor2`, `lock`). The lane's
worktree `/home/user/wt-instrument` was not touched; nothing was pushed;
`--lock` was run only against a throwaway copy. Probe sources preserved at
`<session scratch>/probes/` (`probe-reviewer.ts`, `probe-synthetic.ts`,
`forged-liveness-suite.ts`). Node v22.22.2.

---

## Round 1

### Brief vs diff

| # | brief item | state | evidence |
|---|---|---|---|
| 1 | Finding 7 — VERIFIED row checks assertion liveness, not exit 0 | **done**, with one false sentence about it (item 1 below) | gutted suite → `0 of 1`, exit 1; genuine → `[RAN]`, exit 0 |
| 1a | gutted-suite plant reports NOT verified | done | `<session scratch>/attack-gates.txt` |
| 1b | genuine suite reads RAN | done | `<session scratch>/gates-run1.txt` |
| 1c | hook requires the NAMED `not ok … clears <CONST> = <raised>` line, not any non-zero exit | done as described — and **defeatable by a suite that prints the line** | `mutationWasCaught` `scripts/report-unverified-gates.mjs:579-582`; forged-suite probe passes |
| 1d | `npm run gates` cost ×3 vs 11.47–11.68 s | done | 11.72 / 11.40 / 12.11 s |
| 1e | cost stated in reporter header, CLAUDE.md, measurement doc | done | `scripts/report-unverified-gates.mjs:14-22`, `CLAUDE.md:259`, `MEASUREMENT_RECEIPTS.md:2247` |
| 2 | Finding 12 — one segmenter | **done** | 0/32 disagreement across 5 definitions; synthetic script doctor 5 = segmenter 5 vs old split 2 |
| 2a | every degradation asserts output !== input | done | all three `apply`s, `lock-auc24.mjs:164-172`, `real-script-corpus.test.ts:180-187` |
| 2b | CLIMAX_RELOCATE puts the final scene FIRST (chain of custody) | done | custody holds 32/32 new, **0/32** old |
| 2c | shuffle-drop floors unchanged because segmentation is byte-identical | done | 32/32 byte-identical; 0.5313 / 0.5586 re-derived |
| 2d | re-derive 0.4219→0.4063 and 0.4673→0.4443, floors 0.3863 / 0.4243 | done | all four reproduced exactly on my own statistics |
| 2e | decomposition (reassembly raised, position-one lowered) is true | done | 0.4219 → 0.4375 → 0.4063 |
| 2f | re-lock touched only the six constants + dated doc section, no manifest/split diff | done | `--lock` on a throwaway copy is a **zero-byte no-op** |
| 2g | CLAUDE.md floors table + brain Gate note match | done | `CLAUDE.md:201`, `Gate - Public Benchmark.md:23` |
| 2h | `AUC24_FLOOR` untouched | done | 0.622, only `PUBLIC_ORDER*` moved in the `auc.ts` diff |
| 2i | AUC-24 recipe change documented in `auc.ts` header, CLAUDE.md, AUC-24 Gate note | done | `auc.ts:35-61`, `CLAUDE.md:163-177`, `Gate - AUC-24 Ratchet.md:25-50` |
| 2j | …including that the fourth segmenter's migration changes what a DISCRIMINATION_BASELINE rerun measures | **narrowed** (item 4 below) | only in `rebuild-experiment-lib.mjs:140-152`; absent from CLAUDE.md and both brain notes |
| 3 | Finding 6 — four sites name `ARC_DED_MIN_SCENES` alone | **done** | CLAUDE.md:237-245, `public-benchmark.ts:825-831`, measurement doc :564-567, `Gate - Public Benchmark.md:83-84` |
| 3a | stdout grep test fails if the old sentence returns | done | reverted sentence → 3 of 7 fail |
| 3b | claims register has no row making the old claim | done | zero rows mention the climax term |
| 4 | Finding 11 — six stale `doctor.ts:1892-1898` anchors fixed | **done** | all six now `:2092-2093`; remaining hits are prose about the defect or the two dated records disclosed in the report |
| 4a | anchor within ±3 lines required for every `path:line` evidence pointer | done | moved-line probe fails the lane with "the code MOVED" |
| 4b | every register row carries an anchor; no row weakened to pass | done | 11 of 11 line-citing pointers carry anchors (13 anchors); no pointer lost its line number; 93 rows before and after |
| 4c | …but the same defect is live, 15×, in the column the lane exempted | **gap** (item 2 below) | 15 of 18 non-retired "Where it appears" pointers are stale by 6–1550 lines |
| 5 | the score did not move | **done** | identity 45/45; receipt "no scoring-path files changed"; public-benchmark 28/28; brain-coverage 7/7 (red at `59bbaf55`, green here) |
| 6 | trailers, no model identifiers, check-brain / honesty-audit / check-docs / check-no-console | done | all five commits carry both trailers; four gates exit 0 |

Not re-run, per the review budget: full `npm test`, the browser battery.

### Reproductions

Every command below was run in `<session scratch>/export` (the `29b17357`
archive) unless stated otherwise.

**Finding 7 — the gutted suite is now caught.** The committed fixture
`tests/fixtures/gate-liveness/gutted-public-benchmark-suite.ts` copied over
`tests/core/public-benchmark.test.ts` (import depth adjusted), in a throwaway
copy:

```
$ node scripts/report-unverified-gates.mjs          # throwaway copy, gutted suite planted
VERIFIED GATES: 0 of 1 ran here, with no corpus and no owner step
  [ABSENT] tests/core/public-benchmark.test.ts
     WHY:    THE SUITE PASSED AND ITS FLOOR ASSERTIONS ARE NOT LIVE.
     DETAIL: PUBLIC_SHUFFLE_DROP_PAIRED_FLOOR was raised from 0.5313 (its own
             measurement) to 0.5813 and the suite did not fail on it
exit=1
$ md5sum -c auc-before.md5
scripts/lib/auc.ts: OK                               # in-memory mutation left no trace
```

The genuine suite, same command on the export: `VERIFIED GATES: 1 of 1`,
`[RAN]`, `mutation check: PUBLIC_SHUFFLE_DROP_PAIRED_FLOOR raised to 0.5813 ->
suite FAILED, as it must`, exit 0. The investigator's round-1 hole (delete the
file) and the round-2 hole (gut the assertions) are both closed.

**Cost of `npm run gates`, three consecutive runs:** 11.72 s / 11.40 s /
12.11 s (lane: 11.47–11.68 s). Within the ±20% sandbox-load band the lane's
own note warns about, and the ratio to the single-run version is the part the
lane claims. `tests/scripts/report-unverified-gates.test.ts`: 39/39 in 30.9 s
(lane: 22.0–22.5 s — same cause, load).

**Finding 12 — segmentation, custody and the statistics, re-derived.**
`<session scratch>/probes/probe-reviewer.ts` re-implements the old `auc.ts`
split, the old `rebuild-experiment-lib` segmenter + line-join reassembly, the
old position-two relocation, a position-one relocation of my own, a
Mann-Whitney all-pairs AUC and a matched-pair AUC, and runs the doctor itself:

```
$ node --experimental-strip-types probe-reviewer.ts
segMismatch=0 lossless=32/32 shuffleDropByteIdentical=32/32
laneClimaxEqualsMine=32/32 custodyNew=32/32 custodyOld=0/32
pinnedAt76 = 10
SHUFFLE_DROP (new seg):           paired=0.5313 allpairs=0.5586 o/i/t=17/15/0  meanGap=-1.9313
CLIMAX old (pos2, line-join):     paired=0.4219 allpairs=0.4673 o/i/t=8/13/11  meanGap=-1.4563
CLIMAX new seg + pos2:            paired=0.4375 allpairs=0.4736 o/i/t=9/13/10  meanGap=-1.4469
CLIMAX new seg + pos1 (shipped):  paired=0.4063 allpairs=0.4443 o/i/t=8/14/10  meanGap=-1.2344
```

Every number in the lane report's two decomposition tables reproduces
exactly, on an independent implementation of both statistics: the floors
0.4063 − 0.02 = **0.3863** and 0.4443 − 0.02 = **0.4243** are the measured
values minus the stated margin; the lossless reassembly alone RAISED both
(+0.0156 / +0.0063) and the position-one correction then lowered them past the
start; the ties fell 11 → 10 and inversions rose 13 → 14; 10 scripts sit at
health 76.0 and 9 of the 10 ties are those scripts, exactly as `CLAUDE.md:216`
now says. Custody: the OLD relocation put the final scene first on **0 of 32**
scripts (the investigator's finding, confirmed); the shipped one on 32 of 32,
and it is byte-identical to my own independent implementation on all 32.

`npm run benchmark:public` on the export agrees, including the intervals
`CLAUDE.md:214-215` quotes: 0.4063 [0.2656, 0.5469] / 0.4443 [0.3662, 0.5112];
shuffle-drop 0.5313 [0.3750, 0.6875] / 0.5586 [0.4219, 0.6973]; control
1.0000 / 0.9473, 32 ordered, 0 ties. Exit 0, 6.66 s.

**The re-lock is a no-op, byte for byte.** `npm run benchmark:public -- --lock`
in a throwaway copy printed all six floors as `X -> X (unchanged)` and
`diff -r` against the export found **no differences at all** — so the
committed floors are exactly what the harness produces, and neither
`tests/fixtures/public-corpus-manifest.json` nor
`tests/fixtures/public-benchmark-split.json` moved (confirmed independently:
the lane's diff touches no fixture except the new gutted-suite fixture).

**Mixed-heading synthetic script** (`<session scratch>/probes/probe-synthetic.ts`
— my own, with `EST.`, `I/E.`, `INT./EXT.`, a forced `.HEADING` and a plain
`INT.`):

```
doctor sceneCount = 5   analyzeFountainText = 5   new segmenter = 5
rebuild-lib segmentScenes = 5   OLD auc.ts INT./EXT. split = 2
lossless round-trip = true
OLD shuffleDrop no-op? = true        NEW shuffleDrop no-op? = false
GUARD on old no-op: threw -> "SHUFFLE_DROP produced its input unchanged …"
CLIMAX custody (final first, count same) = true
assertFinalSceneIsFirst on POS-TWO: threw (correct)
```

Both guards are shown to FAIL on the unfixed input before passing on the fixed
one, which is the §3 requirement.

**Finding 6 — the printed sentence cannot drift back.** Restoring the
baseline's `ARC_DED_MIN_SCENES and CLIMAX_DED_MIN_SCENES are both 15 …`
sentence into `scripts/lib/public-benchmark.ts` in a throwaway copy:

```
$ node --experimental-strip-types tests/core/public-benchmark-limits.test.ts
not ok 2 - the printed feature-scale claim names ARC_DED_MIN_SCENES alone (finding 6)
# pass 4  # fail 3
```

3 of 7 red, exactly as reported; 7/7 on the export. The test greps the CLI's
real stdout via the new `--limits` flag and also pins the ground truth in
`doctor.ts` (health line has no climax term; no call site outside the
definition — independently confirmed by `grep -rn climaxZoneDecayDeduction`:
one definition, one probe script, and the new test).

**Finding 11 — a moved line now fails the lane.** In a throwaway copy, six
comment lines inserted above `doctor.ts:2092`:

```
$ node scripts/honesty-audit.mjs
docs/CLAIMS_REGISTER.md: [claims-register-line-anchor-mismatch] "row 22:
  server/nvm/analyze/doctor.ts:2092-2093 — anchor "scarcity term AUC 0.938" is at
  line 2098, outside the +/-3 window around 2092-2093 — the code MOVED; update the
  line number"
exit=1
```

Clean on the export: `scanned 458 files … plus the claims register (93 rows) —
clean`, exit 0. The register has 93 rows before and after (the lane corrected a
stale "57" in prose, it did not add rows); 11 pointers cite a line, all 11
carry anchors (13 in the rows, 3 more in the rules section's examples), and no
pointer had its line number removed to dodge the new check — the diff adds
anchors and corrects three line numbers (`ARCHITECTURE.md:267→371`,
`coverage-html.test.ts:354→398`, `ARCHITECTURE.md:305→414`).

**The score did not move.**

```
$ GIT_SHA=reviewpin node scripts/check-doctor-output-identity.mjs --tree <baseline> --out before
$ GIT_SHA=reviewpin node scripts/check-doctor-output-identity.mjs --tree <export>   --out after
$ node scripts/check-doctor-output-identity.mjs --compare before after
OUTPUT IDENTITY: PASS — all 45 reports are byte-identical (analyzedAt excluded).

$ node scripts/check-scoring-receipt.mjs 0b629491..29b17357
check-scoring-receipt: range "0b629491..29b17357" — no scoring-path files changed. OK.
```

Suites on the export: `scene-segments` 9/9 · `auc` 29/29 ·
`rebuild-experiment` 41/41 · `public-benchmark` 28/28 ·
`public-benchmark-limits` 7/7 · `auc24-table` 3/3 (6 skipped, no table) ·
`lock-auc24` 14/14 · `honesty-audit-claims` 10/10 ·
`report-unverified-gates` 39/39 · `brain-coverage` 7/7. Both halves of the
brain-coverage claim confirmed: at `59bbaf55`, `not ok 2 - (b) … docs/audits
directories with no brain note citing them: 2026-09-12-adversarial`, 6/7; at
`29b17357`, 7/7.

Gates: `check-brain` OK (102 notes, 367 links, fresh) · `honesty-audit` clean
(93 rows) · `check-docs` clean · `check-no-console` OK (304 files) ·
`benchmark:public` exit 0 · `report-unverified-gates` exit 0. `scripts/lib/auc.ts`
is md5-identical to `git show 29b17357:scripts/lib/auc.ts` after every mutation
run driven in this review (39-test suite plus four reporter runs).

All five commits carry `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`
and `Claude-Session: …`, matching main's prevailing convention; no other model
identifier appears in any message or changed doc.

### What a stronger version would have done

* **One implementation per concept is true only of the live harnesses.** After
  this lane the repo still contains ~9 frozen copies of the position-two
  relocation and the `INT.`/`EXT.`-only split
  (`scripts/measure-auc-split.mjs:316` plus eight `probe-*`/`measure-*`
  scripts, each with its own local `degradeClimaxRelocate`). Each one is a
  verbatim provenance freeze and none is imported by a live path — I confirmed
  all eight define their own rather than importing the shared lib, so nothing
  changed behaviour silently. Out of scope, correctly, and the lane discloses
  the `measure-auc-split.mjs` case (§5.7); the other eight are not named.
* **`assertDegradationChangedText`'s message recommends a remedy the harness
  cannot perform**: "the script must be SKIPPED by name rather than silently
  tied" (`scripts/lib/auc.ts` guard text), but there is no skip list — on the
  owner's corpus a 1-scene or identity-shuffled entry will now abort
  `npm run lock-auc24` outright instead. Fail-loud is the right default here;
  the sentence should say that the remedy is an edit to the `apply`, or the
  lock script should grow the named skip it promises.

### Verdict

**REVISE.** The four findings are genuinely closed, every number in the lane's
report reproduces on an independent implementation, the score is provably
unmoved, and the two new guards are both shown to fail on the unfixed input.
The items below are small and specific; none of them is a measurement error.

1. **The liveness check's own copy overclaims, and the free half of the fix is
   missing.** `scripts/report-unverified-gates.mjs:245-247` says a non-zero
   exit is not accepted as proof because "only an assertion that compares the
   measurement to that constant can name it in a failure", and
   `scripts/lib/raise-auc-floor-hook.mjs:31-34` repeats it. That is false: a
   `process.stdout.write` can name it. `mutationWasCaught`
   (`scripts/report-unverified-gates.mjs:579-582`) regex-matches the mutated
   run's text and `verifiedGateOutcome:617-626` ignores `mutated.ok` entirely,
   so the raised value — `round4(measured + 0.05)` from the suite's own printed
   measurement — is fully predictable by the suite.
   **Reproduction:** `<session scratch>/probes/forged-liveness-suite.ts` is a
   26-line suite that asserts `assert.ok(true)` for all six floors, prints the
   real FLOOR report, and appends one literal
   `not ok 99 - … clears PUBLIC_SHUFFLE_DROP_PAIRED_FLOOR = 0.5813` line.
   Planted as `tests/core/public-benchmark.test.ts`:
   `node scripts/report-unverified-gates.mjs` → `VERIFIED GATES: 1 of 1`,
   `[RAN]`, `mutation check: … -> suite FAILED, as it must`, **exit 0**, with
   no floor asserted anywhere.
   That forged suite's mutated run exits **0** (measured), while the genuine
   suite's mutated run exits **1** (measured), so adding `&& !mutated.ok`
   alongside the named-line requirement costs nothing, is strictly safe for any
   suite that really fails on a floor, and would have caught this probe. Please
   add it, and replace the "only an assertion … can name it" sentence in both
   files with what is actually true — a named TAP failure plus a non-zero exit
   raises the cost of faking to deliberate forgery, which an output-parsing
   check cannot go beyond. This is the same shape of sentence finding 7
   falsified, in the same file.
2. **Finding 11's defect is still live 15 times in the column the lane
   exempted, and the stated reason does not cover those 15.**
   `docs/CLAIMS_REGISTER.md:48-51` exempts "Where it appears" because "several
   of its line numbers are historical by design — rows 1, 2 and 25 are
   `retired`". Excluding retired rows, **15 of the 18** remaining
   appears-column `path:line` pointers are stale.
   **Reproduction** (node one-liner over the register, locating each row's own
   claim text in the cited file): row 3 `StartScreen.tsx:317`→:344; row 5
   `:411`→:477; row 6 `PrivacyPage.tsx:129`→:172; row 7 `:89`→:107; row 8
   `:153`→:211; row 9 `ScriptDoctorPanel.tsx:3443`→:4993 (off by 1550); row 10
   `VerifyReport.tsx:351`→:425; row 11 `SlatePanel.tsx:582`→:666; row 12
   `:122`→:154; row 14 `WhatIfPanel.tsx:840`→:1234; row 15
   `SettingsPanel.tsx:854`→:865; row 16 `:499`→:505; row 18 `README.md:23`→:43;
   row 20 `ARCHITECTURE.md:305`→:414; row 23 `SettingsPanel.tsx:853`→:864. Only
   3 of 18 are within ±3. The sharpest case is `docs/CLAIMS_REGISTER.md:98`:
   row 20's appears cell still cites `ARCHITECTURE.md:305` while **this diff**
   corrected the same row's evidence cell from `:305` to `:414` — the lane had
   the right line in hand and left the wrong one one cell to the left. Either
   extend invariant 4 to non-retired appears pointers (`anchorResolves` already
   does the work, and the retired-row carve-out is a one-line status check), or
   correct the 15 and say in the register that the column is unchecked AND
   currently accurate. The present text reads as "exempt because historical",
   which 15 live rows contradict.
3. **Invariant 4 accepts a vacuous anchor.** `scripts/honesty-audit.mjs:939`
   (`const ANCHOR_RE = /anchor:"([^"]+)"/g;`) imposes no minimum length or
   distinctiveness, and `anchorResolves` uses `String.includes`.
   **Reproduction:** in a throwaway copy, replacing row 22's two anchors with
   `anchor:"e"` leaves `node scripts/honesty-audit.mjs` **clean, exit 0** — a
   future row can satisfy the new invariant with a single character. A minimum
   length (the existing anchors are 14–49 chars) or a "must not occur more than
   N times in the file" check closes it in one condition, next to
   `ANCHOR_WINDOW`.
4. **The DISCRIMINATION_BASELINE consequence is recorded in one place only.**
   `scripts/lib/rebuild-experiment-lib.mjs:140-152` states that `degradeShuffle`
   and `degradeMidpointDrop` now segment differently, so a rerun is not
   comparable to the 0.734 / 0.766 record. `CLAUDE.md:179-185` still presents
   those two numbers with no such note — and it is the most-read statement of
   them — as do `docs/brain/Gates/Gate - AUC-24 Ratchet.md:66-69` and
   `docs/brain/Measurements/Measurement - DISCRIMINATION_BASELINE_2026-07-29.md`
   (untouched). The AUC-24 half of the same disclosure is in all three places;
   this half is in none of them. One sentence in each, pointing at the lib
   header, matches the standard the lane set for itself everywhere else. (The
   dated baseline doc itself is correctly left alone.)

Items 1 and 3 are `scripts/` only; items 2 and 4 are documentation. None of
them touches the scoring path, so a revision round needs no new receipt —
re-running `honesty-audit`, `report-unverified-gates`,
`tests/scripts/report-unverified-gates.test.ts`,
`tests/core/honesty-audit-claims.test.ts` and `check-brain` covers all four.

---

## Round 2 — `77755355a536c951271c3a79cfbd380e2c36364d`

**Reviewed object:** `77755355a536c951271c3a79cfbd380e2c36364d` — one commit on
the round-1 tip `29b17357`, on `origin`. Same reviewer, warm context; re-checked
my own four items in the failure direction first, from a
`git archive 77755355` export beside the round-1 export and probes
(`<session scratch>/r2`, plus `r2-forge`, `r2-forge2`, `r2-anchor`,
`r2-anchor2`). `/home/user/wt-instrument` untouched; nothing pushed.

| round-1 item | state | one-line evidence |
|---|---|---|
| 1 — liveness check overclaimed, `&& !mutated.ok` missing | **fixed** | committed forged fixture now reads `[ABSENT]`, reporter exit 1; both sentences rewritten and TRUE |
| 2 — 15 stale pointers in the exempted column | **fixed** | re-derived independently: **0 stale of 18**, carve-out is exactly 2 retired rows |
| 3 — vacuous anchor accepted | **fixed** | `anchor:"e"` → `claims-register-anchor-not-distinctive`, exit 1 |
| 4 — DISCRIMINATION_BASELINE disclosure in one place | **fixed** | now in all four sites |

### Item 1 — three signals, and an honest sentence about them

`tests/fixtures/gate-liveness/forged-liveness-suite.ts` is my round-1 probe
committed verbatim (diff against `<session scratch>/probes/forged-liveness-suite.ts`:
line-wrapping and two added comments only; the `it` body is still
`assert.ok(true)` at `:82` — the attack was not weakened to be easier to catch).
Replayed as `tests/core/public-benchmark.test.ts`:

```
$ node scripts/report-unverified-gates.mjs        # throwaway copy, forged suite planted
VERIFIED GATES: 0 of 1 ran here, with no corpus and no owner step
  [ABSENT] tests/core/public-benchmark.test.ts
     DETAIL: PUBLIC_SHUFFLE_DROP_PAIRED_FLOOR was raised from 0.5313 … to 0.5813
             and the mutated run still EXITED 0.
exit=1                                            scripts/lib/auc.ts: OK (unchanged)
```

Genuine suite, same command: `[RAN]`, `mutation check: … -> suite FAILED on that
floor by name, exit non-zero, no passing twin`, exit 0. `npm run gates` ×3:
**10.67 / 10.36 / 10.87 s** (lane: 10.07 / 10.55 / 9.90 — same band; round 1 was
~11.5 s on a busier sandbox).

**Beating all three signals, cheaper than the lane's concession.** The lane's
left-undone item 8 says the residual gap is "a forgery that reads
`AUC_FLOOR_MUTATION_CONSTANT` from its own environment". It is cheaper than
that. `<session scratch>/r2-forge2/tests/core/public-benchmark.test.ts` (no
`process.env` reference anywhere in the file — grep count 0) asserts nothing
about any floor and clears all three:

* **(a) non-zero exit, for free** — it keeps an innocent-looking `it('every
  floor constant in scripts/lib/auc.ts matches the imported value')` that greps
  the on-disk literal for the imported value. Passes unmutated; the in-memory
  mutation necessarily breaks it. No env var needed.
* **(b) named failure line** — printed for every floor at
  `round4(measured + 0.05)`, computed from its own FLOOR report.
* **(c) no passing twin** — its vacuous `it` titles are worded so they do not
  contain `clears <CONSTANT> = <raised>`.

```
$ node scripts/report-unverified-gates.mjs        # throwaway copy, forge2 planted
VERIFIED GATES: 1 of 1 ran here …
  [RAN] tests/core/public-benchmark.test.ts
     floors: … -> suite FAILED on that floor by name, exit non-zero, no passing twin
exit=0
```

**This does not contradict the shipped text, which is the point of item 1.**
`scripts/report-unverified-gates.mjs:263-271` says exactly what my probe does:
"a forgery must now print a failing line for the floor, suppress the passing
line its own `it` block emits for the same title, and exit non-zero … The
remaining gap is deliberate forgery, and an output-parsing check cannot close
it." `scripts/lib/raise-auc-floor-hook.mjs:41-48` says the same, and both files
now name the round-1 falsification rather than repeating the pattern. The claim
survives the attack, which is the standard round 1 asked for. The only
imprecision left is in the audit record: the lane report's left-undone item 8
names the env-var route as *the* residual gap when a forgery that never looks at
the environment also gets through. Worth one sentence if that report is amended
at merge; it does not change any behaviour and nothing in `scripts/**` or
`docs/brain/**` repeats it.

Mechanism read: `mutationWasCaught` (`:618-633`) now returns `{ok, reason}` and
rejects an `ok … clears <CONSTANT> = <raised>` twin; the exit-code gate is a
separate early return at `:676-684`, so its DETAIL names which signal failed
(confirmed above — the fixture is caught by the exit code, not the twin).
`tests/scripts/report-unverified-gates.test.ts` 42/42 (was 39).

### Item 2 — both columns, zero stale pointers

Re-derived on the tip with my own probe (locate each row's own claim text in the
cited file; retired/unsupported excluded), not from the lane's table:

```
appears pointers checked=18  within ±3 = 17  stale = 0  unresolved = 0
```

The one row my probe first flagged, row 8 (`PrivacyPage.tsx:207`, longest
fragment at :211), is **correct as cited**: the claim spans lines 207-214 and
`:207` is where it begins — my round-1 `:211` was the tail of the same
paragraph. Row 18 (`README.md:43`) resolves; the lane's hand-resolution of the
parentheses-vs-em-dash mismatch is right. Every corrected cell records the line
it used to cite.

Carve-out census on the tip: **18 appears pointers checked, 2 exempt** (rows 1
and 2, both `retired`) — exactly what `ANCHORED_COLUMNS`
(`scripts/honesty-audit.mjs:1053-1069`) describes, no wider.

Failure direction, in a throwaway copy — row 11's appears pointer moved
`:666` → `:620`:

```
docs/CLAIMS_REGISTER.md: [claims-register-line-anchor-mismatch] "row 11 (where it
  appears): src/components/SlatePanel.tsx:620 — anchor "Deterministic ranking — same"
  is at line 666, outside the +/-3 window around 620 — the code MOVED; update the
  line number"   exit=1
```

The violation names the column, as promised.

### Item 3 — anchors ≥ 12 characters and unique in their window

`anchor:"e"` on row 22, replayed from round 1:

```
docs/CLAIMS_REGISTER.md: [claims-register-anchor-not-distinctive] "row 22 (evidence
  pointer): anchor "e" is 1 character(s); an anchor must be at least 12. …"   exit=1
```

The uniqueness half is confirmed against the lane's own round-1 anchor: at
`29b17357`, row 19 carried `anchor:"report.plainSummary"`, and that string
occurs on **three** lines of its ±3 window —
`tests/core/script-doctor.test.ts:1527, 1528, 1529`. The replacement
`anchor:"plainSummary ?? '', /structure/"` matches exactly one (`:1528`). So the
new rule caught a real anchor the lane had written itself, which is the only
evidence that makes a distinctiveness rule worth having.
`tests/core/honesty-audit-claims.test.ts` 15/15 (was 10);
`node scripts/honesty-audit.mjs` on the tip: clean, 93 rows, exit 0. The 12-char
floor is a chosen constant, not a measurement — the lane says so in its
left-undone item 10, which is the right way to carry it.

### Item 4 — the DISCRIMINATION_BASELINE disclosure, in four places

* `CLAUDE.md:188-196` — "…IS NOT COMPARABLE TO 0.734 / 0.766 EITHER", naming
  `degradeShuffle` / `degradeMidpointDrop`, and distinguishing the dated record
  (left as written) from a fresh run of `scripts/rebuild-experiment.mjs`.
* `docs/brain/Gates/Gate - AUC-24 Ratchet.md:70-75`.
* `docs/brain/Gates/Gate - Public Benchmark.md:42-44` (cross-link).
* `docs/brain/Measurements/Measurement - DISCRIMINATION_BASELINE_2026-07-29.md:31-40`
  — the note round 1 found untouched.

### Round-2 gates reproduced

| check | result |
|---|---|
| output identity vs `git archive 0b629491` (`GIT_SHA` pinned) | **PASS — all 45 byte-identical** |
| `check-scoring-receipt 0b629491..77755355` | "no scoring-path files changed. OK." exit 0 |
| `npm run benchmark:public` | exit 0 — 0.5313 / 0.5586, 0.4063 / 0.4443, 1.0000 / 0.9473, intervals unchanged |
| `npm run gates` ×3 | exit 0 ×3 — 10.67 / 10.36 / 10.87 s |
| touched suites | report-unverified-gates 42/42 · honesty-audit-claims 15/15 · public-benchmark 28/28 · limits 7/7 · scene-segments 9/9 · auc 29/29 · rebuild-experiment 41/41 · brain-coverage 7/7 |
| `check-brain` · `check-no-console` · `check-docs` · `honesty-audit` | OK (102 notes, 371 links) · OK · clean · clean, exit 0 |
| commit trailers | both present on `77755355`; no stray model identifier |

Not re-run per budget: full `npm test` (lane reports 13,254 / 13,162 pass / 0
fail), the browser battery.

### Verdict

**MERGE.** All four round-1 items are closed in the direction they were raised,
each verified by the probe that broke the old version: the committed forgery is
now reported NOT verified, the appears column is checked with a carve-out of
exactly two retired rows and zero stale pointers left, a vacuous anchor is
rejected and the uniqueness rule caught one of the lane's own anchors, and the
baseline disclosure is in all four sites. The score still has not moved —
identity 45/45 against `0b629491`, receipt clean, all six floors at the
re-locked values. My one remaining observation is not a defect in the shipped
tree: a forgery cheaper than the one the lane's left-undone item 8 describes
still gets through, exactly as `scripts/report-unverified-gates.mjs:263-271` and
`scripts/lib/raise-auc-floor-hook.mjs:41-48` now say it can — the files claim a
cost, not a proof, and that claim survived being attacked. Optional, non-blocking:
widen item 8's sentence in the lane report to say the residual forgery need not
read the mutation environment at all.
