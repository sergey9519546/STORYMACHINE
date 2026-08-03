# Temporal-consistency order sensitivity — 2026-08-03

**What this is:** a cheap, runnable measurement of whether
`server/nvm/analyze/temporal-consistency.ts`'s contradiction output actually
changes under scene reordering — the one candidate examined so far that
already has its own extractor built and wired (diagnostic-only) rather than
needing new extraction work first. **What it is not:** a gate measurement. It
runs on n=30 scripts, not the 761-script P1 corpus, and states n beside every
statistic below. No figure here may be quoted as a P1 gate result.

Reproduce with `node scripts/probe-temporal-order-sensitivity.mjs`. Raw
per-script/per-degradation contradiction data (including every
contradiction's explanation text and classification) lands in
`scripts/output/temporal-order-sensitivity.json`. The three degradations
(`degradeShuffle`, `degradeMidpointDrop`, `degradeClimaxRelocate`) are copied
verbatim from `scripts/measure-auc-split.mjs`, not reimplemented, so this
probe damages scripts identically to the real AUC harness.

## Verdict, up front

**This is not currently a real P1 lead.** Two independent findings, each
sufficient on its own:

1. **Order-blind in practice on this sample.** Pairwise rank statistic vs.
   reordering is chance-level: SCENE_SHUFFLE AUC=0.483 (n=30), MIDPOINT_DROP
   AUC=0.483 (n=30), CLIMAX_RELOCATE AUC=0.500 (n=30, literally zero movement
   on every script). Pooled n=90, AUC=0.489.
2. **The only nonzero output found is a false-positive bug, not story
   understanding.** Every contradiction produced anywhere in this run — clean
   or degraded — traces to two-or-more *consecutive* scenes sharing a
   CONTINUOUS/MOMENTS LATER heading modifier, a completely ordinary
   screenwriting pattern (one continuous span of action written across
   several scene headings). Zero contradictions in this run trace to
   FLASHBACK or MEANWHILE — the markers the module's own header treats as its
   real semantic content — because **none of the 30 scripts in this sample
   use those words in a scene heading at all** (confirmed by direct grep,
   see Method §1).

The P1 lead recorded for this module (that it is "the first genuinely
order-sensitive signal available") is retracted by this measurement, for this
sample. See Limitations for what would change that conclusion.

## Method

### 1. Material loaded (n=30, exactly as specified)

| Source | Count | Path |
|---|---|---|
| Real CC0 screenplays | 6 | `data/screenplays/*.fountain` (`counter-offer`, `dead-frequency`, `off-season`, `room-12`, `runoff`, `transfer-window`) |
| Structural-form-experiment fixtures | 4 | `tests/fixtures/structural-form-experiment/*.fountain` (`pair1-kishotenketsu`, `pair1-three-act-control`, `pair2-kishotenketsu`, `pair2-three-act-control`) |
| Band-labeled calibration corpus | 20 | `server/nvm/analyze/calibration/corpus.ts`'s `REFERENCE_CORPUS` (5 each of `strong`/`competent`/`weak`/`troubled`) |
| **Total** | **30** | |

Marker prevalence in the raw text, checked directly (not inferred from the
detector's own output), to establish what the corpus could possibly exercise:

```
grep -ci "CONTINUOUS\|FLASHBACK\|MEANWHILE\|SIMULTANEOUSLY\|MOMENTS LATER\|SAME TIME"
```

FLASHBACK: 0/30 scripts. MEANWHILE/SIMULTANEOUSLY/SAME TIME: 0/30 scripts.
CONTINUOUS or MOMENTS LATER: present in 12/30 scripts, but — critically — as
consecutive scene-heading pairs (the only shape that triggers a constraint
change; see §3) in only 5/30.

### 2. Parse and clean-audit

Each script's raw text was parsed with
`analyzeFountainText(fountain)` (`server/nvm/analyze/fountain-analyzer.ts`) to
`ScreenplaySceneRecord[]` (`.records`), then run through
`auditTemporalConsistency(records)`
(`server/nvm/analyze/temporal-consistency.ts`). All 30 scripts parsed and
audited without error.

### 3. Degradation

`degradeShuffle`, `degradeMidpointDrop`, `degradeClimaxRelocate` — copied
verbatim from `scripts/measure-auc-split.mjs`, including their own
`segmentScenes`/`reassemble`/`mulberry32` helpers and their own scene-count
gates (shuffle/relocate require >=3 heading-delimited scenes, midpoint-drop
requires >=5). Every one of the 30 scripts cleared both gates, so no script
was skipped for any degradation (90/90 degradation runs usable).

Each degraded text was re-parsed with the same `analyzeFountainText` +
`auditTemporalConsistency` pipeline (not the original records reordered by
hand — the full parse runs again on the shuffled/dropped/relocated text, so
scene indices and `slug` values are whatever the reordered text actually
produces).

### 4. (a)/(b) classification — bookkeeping vs. explicit marker

Every contradiction carries the `TemporalConstraint`s that produced it, and
every constraint carries an `evidence` string.
`extractTemporalConstraints` sets that string to the literal
`'Sequential scene order'` **only** for the default per-adjacent-pair
`before` constraint (confidence 0.5, built for every consecutive scene pair
regardless of content); every explicit-marker branch (FLASHBACK, CONTINUOUS,
MOMENTS LATER/SAME TIME, LATER-quantified, MEANWHILE/SIMULTANEOUSLY)
overwrites or replaces that string with marker-specific text. So:

- **(a) bookkeeping-only**: every constraint cited by the contradiction has
  evidence exactly `'Sequential scene order'`.
- **(b) explicit-marker**: at least one cited constraint's evidence is
  anything else.
- **indeterminate**: the contradiction cites zero constraints (only possible
  for the plain self-loop `cyclic_dependency` check, which does not populate
  `constraints`; did not occur in this run).

### 5. Rank statistic

For each (script, degradation) pair, `{clean: contradictionCount, degraded:
contradictionCount}`. Positive polarity is **opposite** the health-score AUC
harness's convention: a real order-sensitive signal should produce **more**
contradictions on the degraded (reordered) text, so `degraded > clean` counts
as "correct." AUC is reported only where n>=10 pairs exist, per the task's own
rule; win/tie/loss is reported unconditionally alongside it. n=30 per
degradation here, so AUC is a real (if small) measurement, not a placeholder.

## Results

### Clean-script false-positive rate (n=30)

| | count | of n=30 |
|---|---|---|
| Scripts with >=1 contradiction on **unmodified** text | 5 | 16.7% |
| — driven by an explicit marker (bucket b) | 5 | 16.7% |
| — bookkeeping-only (bucket a), no explicit marker | 0 | 0% |

All 5 are calibration-corpus samples; **0/6 real CC0 screenplays and 0/4
structural-form fixtures** produced any contradiction, clean or degraded, in
any condition.

| Script | Clean count | Explanation pattern |
|---|---|---|
| Low Tide (strong) | 1 | `CONTAINER YARD - CONTINUOUS` → `CONTAINER YARD - MOMENTS LATER`, consecutive |
| Nine Minutes (strong) | 6 | Three consecutive-CONTINUOUS pairs (`NEGOTIATION VAN`×2, `BANK LOBBY`×2, `BANK LOBBY`→`BANK VESTIBULE`→`BANK LOBBY`) |
| The Long Game (strong) | 1 | `MUSEUM VAULT CORRIDOR - CONTINUOUS` → `MUSEUM VAULT - CONTINUOUS`, consecutive |
| Thanksgiving, Maybe (competent) | 1 | `FARMHOUSE KITCHEN - CONTINUOUS` → `FARMHOUSE PORCH - CONTINUOUS`, consecutive |
| Zero Day (competent) | 1 | `SOC - CONTINUOUS` → `SOC - CONTINUOUS`, consecutive |

### Root cause of every clean-script false positive (confirmed, not inferred)

Cross-checking scene-heading lists directly against contradiction counts
shows the trigger precisely: a contradiction fires **iff two or more
consecutive scene headings both carry a CONTINUOUS/MOMENTS LATER modifier.**
Scripts with an *isolated* CONTINUOUS scene (not adjacent to another one) —
`Reasonable Doubt` (scene 2 alone), `Sunlight Clause` (scene 8 alone),
`Encore` (scene 4 alone), and the real screenplays `dead-frequency.fountain`
(2 CONTINUOUS scenes, far apart), `off-season.fountain` (1 CONTINUOUS scene),
`pair1-three-act-control.fountain` (1 CONTINUOUS scene not adjacent to
another marked scene) — produced **zero** contradictions despite containing
the marker. Every one of the 5 flagged scripts has back-to-back
CONTINUOUS-tagged headings.

That pattern — one continuous span of story time written across several
scene headings (a chase, a negotiation, a room-to-room search) — is ordinary,
correct craft, not a timeline error. The mechanism: `extractTemporalConstraints`
replaces the default `before` edge between each such adjacent pair with a
`meets` constraint independently for *each* CONTINUOUS-tagged scene; chained
across 3+ scenes this produces a `meets, meets` sequence that
`detectTemporalContradictions`'s pairwise mirror-consistency check (the block
added alongside the FLASHBACK fix, per the file header) flags as internally
inconsistent, even though nothing in the source text asserts a contradictory
order. This is the **same class of bug** the file's 2026-08-03 header
documents fixing for FLASHBACK (a default weak edge left standing against a
stronger explicit one) — except it is still live for the CONTINUOUS/MOMENTS
LATER branch. `calibration/The Dead Drop`'s SCENE_SHUFFLE run below is a
second, independent confirmation: it is clean at 0 contradictions (its two
CONTINUOUS scenes are not adjacent), but the shuffle happens to relocate two
CONTINUOUS-tagged scenes next to each other and immediately produces 1 —
demonstrating the "signal" fires on adjacency accident, not on any semantic
timeline violation the shuffle introduced.

### Per-script / per-degradation movement (full table: `scripts/output/temporal-order-sensitivity.json`)

25/30 scripts stayed at 0→0→0→0 (clean and all three degradations) — no
FLASHBACK/CONTINUOUS/MEANWHILE/LATER markers fired at all. The 5 nonzero
scripts:

| Script | SHUFFLE | DROP | RELOCATE |
|---|---|---|---|
| Low Tide | 1→0 (FEWER) | 1→1 (SAME) | 1→1 (SAME) |
| Nine Minutes | 6→4 (FEWER) | 6→4 (FEWER) | 6→6 (SAME) |
| The Long Game | 1→0 (FEWER) | 1→1 (SAME) | 1→1 (SAME) |
| Thanksgiving, Maybe | 1→1 (SAME) | 1→1 (SAME) | 1→1 (SAME) |
| The Dead Drop | 0→1 (MORE) | 0→0 (SAME) | 0→0 (SAME) |
| Zero Day | 1→2 (MORE) | 1→1 (SAME) | 1→1 (SAME) |

Movement is inconsistent in direction (2 MORE, 3 FEWER, 25 SAME across
SCENE_SHUFFLE alone) and, per the root-cause analysis above, entirely
explained by whether the degradation happens to place two CONTINUOUS-tagged
headings adjacent to each other — an artifact of the bug, not evidence the
detector is reading story order.

### (a)/(b) split

**Bucket (a), bookkeeping-only, was 0 in every single one of the 90
(script × degradation) runs and in all 30 clean audits.** This is a genuine,
if unexciting, finding in its own right: the default sequential `before`
chain (confidence 0.5, one edge per adjacent scene pair) can never
self-contradict regardless of how the scenes are ordered, because it always
forms a total order over whatever the current array position is — shuffling
relabels which scene sits where, but the chain it builds afterward is
internally consistent by construction. The trap the task asked to guard
against (mechanical bookkeeping contradictions from any reordering) did not
occur.

**Every contradiction observed, clean or degraded, was bucket (b) — cited at
least one non-default constraint.** But per the root-cause section above,
100% of those bucket-(b) contradictions trace to the CONTINUOUS/MOMENTS-LATER
adjacency bug, and 0% trace to FLASHBACK or MEANWHILE, because those markers
never appear in this sample. So "explicit-marker-driven" here does **not**
mean "the script's own asserted timeline being violated" as the task
originally hypothesized bucket (b) would represent — it means "a heading
modifier the extractor mishandles." The (a)/(b) split as designed correctly
separates trivial bookkeeping from marker-driven signal, but on this sample
the marker-driven signal itself turned out to be a bug, not semantics.

### Rank statistic (n=30 per degradation, n=90 pooled — real AUC, not placeholder)

Total contradiction count:

| Degradation | n | AUC (more-is-degraded correct) | win / tie / loss |
|---|---|---|---|
| SCENE_SHUFFLE | 30 | 0.483 | 2 / 25 / 3 |
| MIDPOINT_DROP | 30 | 0.483 | 0 / 29 / 1 |
| CLIMAX_RELOCATE | 30 | 0.500 | 0 / 30 / 0 |
| **Pooled** | **90** | **0.489** | 2 / 84 / 4 |

Explicit-marker-only count (bucket b) — identical to the total, because
bucket (a) was 0 throughout:

| Degradation | n | AUC | win / tie / loss |
|---|---|---|---|
| SCENE_SHUFFLE | 30 | 0.483 | 2 / 25 / 3 |
| MIDPOINT_DROP | 30 | 0.483 | 0 / 29 / 1 |
| CLIMAX_RELOCATE | 30 | 0.500 | 0 / 30 / 0 |
| **Pooled** | **90** | **0.489** | 2 / 84 / 4 |

All AUCs sit at chance (0.5) within noise for n=30/90. CLIMAX_RELOCATE moved
the contradiction count on zero scripts out of 30 — the specific relocation
this degradation performs (move the last scene to position 2) never happened
to create or destroy an adjacent CONTINUOUS pair in this sample.

## Limitations

- **n=30, not the 761-script P1 corpus.** This is a screen, not a gate
  measurement, exactly like `STRUCTURAL_SIGNAL_SCREEN_2026-08-03.md`'s own
  framing for the same reason.
- **Zero FLASHBACK/MEANWHILE exercise.** The module's own header documents a
  real, previously-fixed false-positive bug in the FLASHBACK branch and
  claims a positive intact-vs-shuffled separation on a *hand-built synthetic*
  14-scene fixture using FLASHBACK+CONTINUOUS+MEANWHILE+LATER together (see
  the header's "ORDER-SENSITIVITY (2026-08-03 finding)" note, 7/20 seeded
  shuffles of that fixture produced contradictions vs. 0/20 on the intact
  order). This probe cannot confirm or refute that synthetic result — this
  sample simply never exercises FLASHBACK or MEANWHILE at all. The synthetic
  finding and this sample's finding are not in conflict; they answer
  different questions (can the mechanism separate at all, on a fixture
  built to trigger every branch vs. does it separate on real/realistic
  writing, most of which does not use these markers in headings).
- **CONTINUOUS/MOMENTS LATER prevalence may be low generally.** 12/30
  scripts in this sample use the marker at all, and only 5/30 use it in the
  specific adjacent-pair shape that produces any detector output. A larger
  real corpus could show either more or fewer such adjacencies; this sample
  cannot bound that rate.
- **This probe only measures contradiction *count*, not whether a specific
  contradiction is correct.** The 5 nonzero clean scripts happen to be fully
  explained by the CONTINUOUS-adjacency bug (verified by direct heading
  inspection above), but a differently-constructed script with a genuine
  FLASHBACK-based timeline error and no CONTINUOUS scenes was not in this
  sample and is not covered by this measurement.
- **AUC direction convention.** This probe defines "correct" as
  `degraded_count > clean_count`, matching the task's framing that a real
  signal should react to reordering by producing *more* contradictions. A
  detector that reacts to reordering with *fewer* contradictions (3/30 SHUFFLE
  cases here) is still moving, just not usefully — those cases count as
  losses, which is reflected in the win/tie/loss column, not hidden by the
  AUC number alone.

## What would change this verdict

1. **Fix the CONTINUOUS/MOMENTS-LATER adjacency false positive** the same way
   the FLASHBACK branch was fixed (splice the default edge before asserting
   the marker-derived one across the *whole* adjacent run, not just the pair
   the marker directly touches) — this is a correctness bug independent of
   the P1 question and should be fixed regardless of whether temporal
   consistency becomes a scoring signal.
2. **Re-run this probe (or a larger version of it) on a corpus that actually
   contains FLASHBACK/MEANWHILE scenes** — this sample had none, so the
   module's stated semantic purpose was never exercised here at all. Until
   that happens, the synthetic-fixture result in the module's own header
   remains the only evidence the mechanism can separate on *anything*, and it
   is a n=1 hand-built fixture, not corpus evidence.
3. Only after both of the above would a fresh AUC measurement on real
   material be informative about whether this signal belongs in P1's
   smallest-signal-set plan. As measured today, it does not clear that bar.

## Files

- Probe: `scripts/probe-temporal-order-sensitivity.mjs`
- Raw output: `scripts/output/temporal-order-sensitivity.json`
- Detector under test: `server/nvm/analyze/temporal-consistency.ts`
  (`extractTemporalConstraints`, `detectTemporalContradictions`,
  `auditTemporalConsistency`) — untouched by this probe.
- Degradations source (copied verbatim, not modified):
  `scripts/measure-auc-split.mjs`

---

## ADDENDUM — 2026-08-03 (later same day): the "actually uses the markers" re-run

**What changed since the original measurement above:** the CONTINUOUS/
MOMENTS-LATER adjacency false-positive documented in this file's own
"What would change this verdict" §1 was fixed (commit `31884bb`, same day).
This addendum (a) re-runs the unmodified original probe to confirm that fix
holds, and (b) does what §2 of "What would change this verdict" asked for —
builds a small corpus that actually contains FLASHBACK/MEANWHILE/LATER
markers and re-measures. **This section is appended, not a rewrite; every
number above stands as originally measured on the original 30-script
sample.**

### (a) Re-run of the unmodified 30-script probe — the fix holds, and the sample is now perfectly flat

`node scripts/probe-temporal-order-sensitivity.mjs`, same 30 scripts, probe
file byte-identical to the version analyzed above:

- Clean-script false positives: **0/30** (down from 5/30). Confirms the
  CONTINUOUS/MOMENTS-LATER fix eliminated every false positive this file
  originally found.
- Pooled rank statistic (n=90): **AUC = 0.500 exactly, win=0 / tie=90 /
  loss=0.** Every one of the 90 (script × degradation) pairs stayed at
  0→0. This is *lower* signal than the original 0.489 (2/84/4) — because
  the two `MORE` and three `FEWER` movements the original run recorded were
  themselves instances of the same adjacency bug (a shuffle/relocate
  happening to create or destroy a CONTINUOUS-adjacent pair), now fixed.
  **The original run's only nonzero movement was entirely the bug, not a
  weak-but-real signal** — post-fix, this sample shows literally zero
  motion, not just chance-level motion. This is expected, not alarming: the
  sample still contains zero FLASHBACK/MEANWHILE markers (per §1's original
  grep), so there is still nothing for the *real* mechanism to react to
  here — see (b).

### (b) New corpus that actually uses the markers: `tests/fixtures/nonlinear-timeline/` (n=6)

Six original, hand-written, temporally-coherent short Fountain screenplays
(10–13 scenes each; 2 flashback-framed, 2 parallel-action, 2 mixed
flashback+LATER), built using ONLY the markers
`extractTemporalConstraints()` actually reads (verified against the
2026-08-03 source, not assumed): heading-only `FLASHBACK` and
`CONTINUOUS|MOMENTS LATER|SAME TIME`; `MEANWHILE|SIMULTANEOUSLY|AT THE SAME
TIME` and a quantified `(DAYS|WEEKS|MONTHS|YEARS) LATER` pattern checked
against heading + extracted narrative fields. Each fixture's exact scene
sequence was empirically verified against the real
`analyzeFountainText`/`auditTemporalConsistency` pipeline before being
finalized (not hand-derived from the Allen-algebra tables) — see
`server/nvm/analyze/temporal-consistency.test.ts`'s new "nonlinear-timeline
fixtures audit clean" describe block, which locks in 0/6 clean-audit as a
regression test.

**HONESTY BAR:** these are AUTHORED fixtures, not corpus evidence. n=6
scripts, n=18 (script × degradation) pairs pooled across the three
degradations — below the task's own n>=10 threshold per individual
degradation (n=6 each), at or just past it pooled (n=18). This is an
existence/mechanism test — does the detector's own explicit-marker branch
ever separate an intact order from a shuffled one on writing that actually
triggers it — not a claim about recall or precision on real screenwriting.

Probe: `scripts/probe-temporal-nonlinear.mjs` (new, additive; does not
modify the original probe; degradations and (a)/(b) classification copied
verbatim from it). Raw data: `scripts/output/temporal-nonlinear.json`.

**Results:**

| | count |
|---|---|
| Clean-fixture false positives | 0/6 (all six audit clean, as designed) |
| Total (script × degradation) pairs | 18 (6 fixtures × 3 degradations; no fixture skipped — all clear every degradation's scene-count gate) |
| Pairs where degraded > clean (win) | 1/18 |
| Pairs where degraded = clean (tie) | 17/18 |
| Pairs where degraded < clean (loss) | 0/18 |
| Pooled AUC (more-is-degraded correct), n=18 | 0.528 |

Per-degradation (n=6 each, below the AUC threshold, win/tie/loss only):
SCENE_SHUFFLE 1/5/0, MIDPOINT_DROP 0/6/0, CLIMAX_RELOCATE 0/6/0.

**The one win, examined directly** (not asserted — the actual contradiction
object from `scripts/output/temporal-nonlinear.json`):
`flashback-01-the-weight-of-water.fountain` under SCENE_SHUFFLE produced

```
explicit_conflict [blocker]: Conflicting explicit constraints on scene_0
and scene_0: existing=equals, new=before
```

This is the exact mechanism the module's own file header and this repo's
existing `order-sensitivity` unit test already document (`temporal-
consistency.test.ts`: "moving the flashback scene to position 0 makes the
same content report a contradiction") — the deterministic mulberry32(42)
shuffle happened to relocate a FLASHBACK-tagged scene to array position 0,
where its own `scene_idx before scene_0` constraint becomes
self-referential (`scene_0 before scene_0`). It is a genuine explicit-marker
contradiction, appearing only under degradation, never on the intact
script — i.e. it satisfies the task's own bar for "the mechanism finally
being exercised." It is also a narrow, positional coincidence (whether *any*
FLASHBACK-tagged scene lands at index 0 after a fixed-seed shuffle), not a
general story-level check — it fires on this specific degenerate placement
and nothing richer.

**What did NOT move, and why it matters more than the one win:** neither
parallel-action fixture (MEANWHILE/SIMULTANEOUSLY, 2 fixtures × 3
degradations = 6 pairs) produced any movement at all, in either direction —
not because the mechanism is blind to MEANWHILE, but because of how the
constraint is anchored: `extractTemporalConstraints` attaches the MEANWHILE
`overlaps` relation to **whichever scene currently sits at position idx-1**,
not to the scene that was semantically its partner in the original text.
After a shuffle, "the partner scene moved away" is not detectable *by
construction* — the detector doesn't track partner identity across a
reorder, it just re-derives a fresh set of position-based constraints from
the new array and (per the (a)/(b) split findings, reconfirmed here at 0/18
bucket-(a) fires) that fresh set is again almost always self-consistent.
The task's own hypothesized positive case — "a MEANWHILE whose partner scene
moved away" produces a contradiction — did not occur in this sample, in
either flashback-and-return case where the return scene's marker also
depends on positional adjacency, or in the MEANWHILE case. Only the single,
narrower self-referential FLASHBACK-at-position-0 case fired.

### Mechanism verdict

**The mechanism moves, but only in one narrow, already-documented,
degenerate case (a FLASHBACK-tagged scene coincidentally landing at array
position 0), not via the richer story-level violations (a flashback whose
frame lands after it in a non-degenerate sense, a MEANWHILE whose partner
scene relocates) the task was probing for.** 1 win / 17 ties / 0 losses
across n=18 authored pairs, AUC=0.528 — barely above the 0.500 chance floor
and not distinguishable from noise at this n, but not literally zero either
(unlike the re-run in (a), which is now exactly 0.500/0/90/0 on the
marker-free sample). The one real movement is not new evidence beyond what
`temporal-consistency.test.ts`'s pre-existing `order-sensitivity` unit test
already proved qualitatively (that same shape, hand-built, in that test);
this addendum's contribution is confirming it also happens on independently
authored, competent-craft screenwriting outside a fixture built specifically
to trigger it, and confirming that the *other* marker branches
(MEANWHILE/SIMULTANEOUSLY, the LATER confidence bump, a non-degenerate
flashback return) do not similarly separate on this sample.

### Recommendation

**The P1 question for `temporal-consistency.ts` should be treated as
closed, not reopened, by this evidence.** The task's own stated bar — "if
the mechanism STILL doesn't move — contradictions stay 0 under shuffle even
with real markers present — that is the final word" — is *almost* met: it
is not a flat 0, but the one motion found is a positional self-reference
edge case already known and already covered by an existing unit test, not a
new demonstration that the detector tracks a script's actual non-linear
story logic under reordering. A signal that only reacts when a specific
marker type happens to land at index 0 is not a usable order-sensitivity
signal for P1's smallest-signal-set plan; it is closer to the same
"bookkeeping artifact of array position" critique the original measurement
made of the whole module, just with one more special case than previously
known. Promoting this module to score/verdict math would still require the
three preconditions this file's own header already lists (real-corpus AUC
measurement, false-positive rate on intact real flashback/cross-cut
scripts, a pre-registered fixture pair) — none of which this addendum
changes the case for. Recommend no further probing of this module without a
materially different measurement design (e.g., real screenplays that
naturally contain FLASHBACK/MEANWHILE headings, which neither this file's
original 30-script sample nor this addendum's 6 authored fixtures can
stand in for at scale).

**Files (this addendum):**
- New probe: `scripts/probe-temporal-nonlinear.mjs`
- New raw output: `scripts/output/temporal-nonlinear.json`
- New fixtures: `tests/fixtures/nonlinear-timeline/*.fountain` (6 files)
- New regression tests: `server/nvm/analyze/temporal-consistency.test.ts`,
  `describe('nonlinear-timeline fixtures audit clean (2026-08-03
  addendum)')`
