# Detector defects — adversarially verified, 2026-08-03

Findings from a claim-by-claim truth audit of the sample coverage report
(`docs/user-validation/sample-coverage-report.html`, "The Second Key", 14
scenes / 665 words) against the script text and the engine's own records.
Every finding below was independently re-derived by a second, adversarial
reviewer instructed to refute it; only findings that survived are listed as
confirmed. Two initial findings did NOT survive and are recorded at the
bottom — the record of what was checked and cleared is part of the audit.

These are DETECTOR (scoring-path) defects. Per CLAUDE.md, fixing them
requires positive/negative fixtures plus runnable discrimination evidence on
the real corpus (761 produced screenplays, `scripts/output/corpus-split.json`)
with the shuffle-drop AUC floor respected. Do not hand-tune any of these to
make the sample look right — that corrupts the P1 measurement. This file is
the grounded starting point for that work, not a license to skip it.

Presentation-layer siblings already fixed separately (not detector work):
page estimate (#244), logline splice (#245), and the global 0-based scene
numbering in issue labels (landed 2026-08-03; labels are 1-based and the
three "Scene N" consumers — locate/heatmap/cluster — decode them, guarded
by `tests/core/scene-label-consistency.test.ts`). NOTE: the quoted
"Emitted" excerpts below are verbatim from the PRE-migration report, so
scene numbers inside them are the old 0-based rendering unless a finding
says otherwise; the "Reality" paragraphs already re-derive the true
1-based scene in each case.

---

## D1 — PROTAGONIST_PASSIVITY_CLIMAX: no concept of action

**Where:** `server/nvm/revision/passes/structure.ts` (~line 815), Wave 165.

**Emitted (CRITICAL, the report's #1 fix):** "Peak-intensity climax scene
(suspense 3.0) shows no protagonist engagement — neutral emotion, no clock
pressure, no discovery. The protagonist is absent from their own story's
highest moment."

**Reality:** the flagged record (idx 12 = scene 13, `INT. HOLLOWAY ESTATE -
VAULT - CONTINUOUS`) has June as its sole agent: *"June turns the brass
teeth in her palm … and the vault door releases."* She performs the story's
decisive action. In the scene the off-by-one label pointed writers at
(scene 12, the antechamber), she is also alone and acting ("June eases past
it into the dark").

**Mechanism:** `isPassive = emotionalShift === 'neutral' && !clockRaised &&
seededClueIds.length === 0`. All three are lexicon signals; none encodes
"the protagonist performs an action." A protagonist acting decisively in
silence — the standard register for heist climaxes — scores as absent.

**Fix shape (P1):** the passivity predicate needs an agency signal (e.g.
protagonist-as-subject action lines, or dialogue-initiative), with fixtures:
positive = genuinely spectator protagonists at the peak; negative = silent
but decisive actors (this script is the canonical negative fixture).
Measure discrimination on the corpus before/after; AUC floor holds.

## D2 — PASSIVE_ACT3_INTENTION: same blindness, act scale

**Where:** `server/nvm/revision/passes/intention.ts`.

**Emitted (CRITICAL):** "Across all 4 Act 3 scenes the protagonist initiates
no action — no clock raised, no clue planted. They are carried to the ending
rather than choosing it."

**Reality:** in scenes 10–13 June decides the evasion ("Then we lose her
before the bridge"), works the hidden panel, eases past the live sensor, and
turns the key that opens the vault. Every one is initiated by her.

**Mechanism:** "initiates no action" is derived from `clockRaised` and
`seededClueIds` only — the same two lexicon channels as D1, with the same
hole. Also note the act label ("Scenes 10–13" for a 14-scene script) was the
0-based rendering; the 1-based range is 11–14.

### D1/D2 — 2026-08-04 addendum: unwired agency-signal detector built

Per the ROADMAP's unwired-first amendment (the same pattern D3's
`reversal-detection.ts` fix already follows): `server/nvm/analyze/
agency-signal.ts` now exists as a candidate agency signal for the shared D1/D2
mechanism above. **Built unwired** — nothing in `doctor.ts`,
`structure.ts`'s `PROTAGONIST_PASSIVITY_CLIMAX`, or `intention.ts`'s
`PASSIVE_ACT3_INTENTION` imports it; confirmed by running
`node scripts/check-scoring-receipt.mjs` against the range that introduced
the file (`check-scoring-receipt: range "origin/main" — no scoring-path
files changed. OK.`) and by `grep -rl "agency-signal" server/` returning only
the file itself.

**Design.** Two exported reads, both built only from fields already on
`ScreenplaySceneRecord` (`dramaticTurn`, `visualBeats`, `powerHolder`, no raw
text access, no LLM call):

- `detectPeakAgency` — at the script's peak-suspense scene(s) (the same
  "suspense 3.0" proxy this doc's own D1 worked example uses), checks
  whether the protagonist is the near-leading grammatical subject of a
  decisive-action verb (`turns`, `grabs`, `works`, `eases`, `unlocks`, …) or
  the scene's dialogue `powerHolder`, with a passive-voice guard ("June was
  grabbed" is not credited to June) and a counterweight spectator-verb
  lexicon (`watches`, `waits`, `stares`, …) for the positive-passivity case.
- `detectAct3Agency` — the same read across the script's final
  fraction-of-scenes window (default 0.25, which reproduces D2's own "4 Act
  3 scenes" on the 14-scene worked example exactly:
  `Math.ceil(14 * 0.25) === 4`, not tuned to that script on purpose).
- `computeD1AgencyDelta` / `computeD2AgencyDelta` — bounded comparison stats
  (not rules, not deductions) reproducing the legacy `emotionalShift ===
  'neutral' && !clockRaised && seededClueIds.length === 0` predicate exactly
  and flagging disagreement when the legacy predicate calls a scene/window
  passive while the agency read finds real agency there — D1/D2's exact
  failure mode.

**Fixture-level behavior.** On the canonical vault-scene fixture (a
standalone, decoupled copy of this doc's own worked example, taken
2026-08-04 into `tests/fixtures/agency-signal/the-second-key.fountain` ahead
of `src/lib/sample-script.ts` being replaced in the same working session):
peak scene = sceneIdx 12 (the VAULT scene, suspense 3.0, matching D1
exactly); legacy predicate calls it passive; the detector finds June
decisively acting (`"June turns the brass teeth in her palm"`) —
disagreement confirmed. Act-3 window = sceneIdx 10–13 (matching D2's "4 Act 3
scenes" exactly); legacy calls all four passive; the detector finds
initiative in 2 of 4 (STUDY: "works a hidden panel"; VAULT: "turns the brass
teeth") — disagreement confirmed. The ANTECHAMBER scene (sceneIdx 11, "June
eases past it into the dark") is a documented miss, not a false negative:
its action line never clears `visualBeats`' own `CONCRETE_NOUNS` filter, so
it is invisible to this detector by construction — see the module's own
header for the full CAN/CANNOT boundary.

**Measured on the 20 tracked CC0 scripts** (`data/screenplays/*.fountain`,
protagonist = most-frequently-speaking character): fires selectively, not
universally — `anyAgencyAtPeak` on 4/20, `allSpectatorAtPeak` on 8/20, D1
disagreement (legacy-passive-but-detector-finds-agency) on 1/20
(`mise.fountain`), D2 disagreement on 3/20 (`quiet-season.fountain`,
`the-detour.fountain`, `undertow.fountain`). Full per-script table and 52
passing tests (positive/negative fixtures, near-miss negatives including a
documented residual false-positive case, both channels, all edge cases,
falsifiability-verified) in `tests/core/agency-signal.test.ts`.

**Maintainer command to measure on the real corpus** (761-script corpus,
local-only, never uploaded — see CLAUDE.md's "Which floor, exactly"
section):

```
node scripts/measure-auc-split.mjs --partition train --with-agency-signal
```

This is **purely diagnostic** — it does not touch health, the AUC pairs, or
any committed baseline CSV; it logs a legacy-vs-detected disagreement table
per script to a separate `agency-signal-diagnostic-<partition>.csv`. Whether
to wire either channel into `PROTAGONIST_PASSIVITY_CLIMAX` /
`PASSIVE_ACT3_INTENTION` — as a new agency-aware predicate term, a
confidence downgrade, or something else — is a **separate, receipt-gated
scoring decision**, contingent on what that corpus run shows, requiring the
full P1 evidence protocol (positive/negative fixtures — already built;
corpus-measured before/after AUC) and respecting the AUC-24 >= 0.622 ratchet
in `tests/core/real-script-corpus.test.ts`. Not decided here.

## D3 — NO_REVERSALS_LONG_STORY / NO_REVERSALS: reversal channel blind to the story's reversal

**Where:** `server/nvm/revision/passes/conflict.ts` (critical) +
`structure.ts` (major); `structure.reversalCount === 0` upstream.

**Emitted (CRITICAL):** "An 8+ scene story with zero dramatic reversals
lacks conflict texture."

**Reality:** the script's ending is a reversal by any craft definition: the
detective pursuing the thieves steps out of the dark inside the vault, gun
raised, and is revealed as the mark's inside man ("Turns out Holloway signed
my transfer papers six years ago"). The engine itself extracts that line as
the climax `revelation` — the logline is built from it — while the reversal
counter records zero. Two subsystems disagree about the same beat.

**Fix shape (P1):** whatever feeds `reversalCount` (suspense-sign flips /
purpose tags) never fires on revelation-type reversals. A reversal detector
that consumes the already-extracted `revelation` channel plus allegiance/
role flips is the candidate; fixture negative = linear stories, positive =
betrayal/twist endings from the corpus. Corpus-measured before/after.

## D4 — Clue channel: co-occurring nouns certified as "planted clues"

**Where:** `server/nvm/analyze/fountain-analyzer.ts` —
`computeContentWordClueClusters` (~1228) feeding `applyClueLifecycle`.

**Emitted (What's Working): ** "Among clues detected by the engine, every
planted clue is paid off; none remains open at the end."

**Reality, nuanced:** the sentence is technically true as hedged (see
cleared findings below). The defect is upstream: of the three "planted
clues" it certifies, only `the-second-key` is a clue. `photograph-spread`
and `table-spread` are content-word co-occurrences — "Marcus **spreads**
**photographs** … across a cluttered **table**" (scene 2) paired with "June
sits … across an empty **table**, the **photographs** … in an evidence bag"
(scene 14). Noun recurrence, not clue tracking. The channel also filters to
`occurrences.length >= 2`, so a content-word "clue" that is genuinely left
open cannot exist by construction on that channel (the exact-token channel
CAN report open clues — verified).

**Fix shape (P1):** require clue candidates to pass an information test
(introduced as unknown/marked, resolved as knowledge), not just lexical
recurrence; or demote content-word pairs to "recurring imagery." Fixtures
from corpus scripts with genuinely dropped threads.

### D4 — 2026-08-04 addendum: FIXED, both halves of the fix shape

The information test is live in `fountain-analyzer.ts`
(`partitionContentWordClusters`): a content-word cluster enters the clue
lifecycle only when some occurrence carries introduction-shaped language
(`CLUE_INTRODUCTION_MARKERS` — a dedicated list, deliberately NOT reusing
`MYSTERY_WORDS`, and deliberately excluding handling vocabulary like
"sealed", which this defect's own worked example pays a false clue off on).
Everything that recurs but fails the test is DEMOTED, not deleted: it is
reported as `recurringImagery` on `FountainAnalysis`, so the observation
stays available. The worked example now behaves: `photograph`/`table` land
in recurring imagery, zero clue ids. The `>= 2` floor's blindness is also
dead — a marked, distinctive, never-repeated object is now reportable as an
open thread.

Two integration regressions were found live and are pinned in
`tests/core/clue-information-test.test.ts` (8 tests, falsifiability
spot-checked — breaking the lone-mention gate fails exactly its own test):

- **Channel-overlap dedup**: "a strange BRASS KEY" briefly produced BOTH
  the exact-token id and a same-scene content-word twin, double-reporting
  one object as two unpaid promises. A cluster whose anchor word is part of
  an exact-token id occurring in the cluster's own scenes is now skipped —
  the exact-token channel owns the object.
- **Lone-mention marker bar**: the indefinite-article first-mention basis
  ("a" + rare noun) briefly qualified action beats ("A knife flashes!") as
  open threads. A LONE mention now requires an explicit marker word
  (`markerIntroduced`); the article basis still strengthens recurring
  clusters, which is what it was measured for.

Blast radius (41 scripts: 20 CC0 + 20 calibration + the P0 sample):
19 health values moved (max −12.5 on `transfer-window`, whose only two
"paid" promises were exactly this defect's false paid-clues — payment
ratio 0.25 → 0), five grade shifts, ZERO verdict/sceneCount changes, P0
sample untouched. Receipt: `MEASUREMENT_RECEIPTS.md` 2026-08-04 (D4/D6
entry); the real-corpus AUC re-measurement obligation is recorded there
and NOT discharged in-sandbox.

## D5 — Scoring-presentation coherence (report layer, borderline)

Adversarially confirmed but sits at the presentation/aggregation boundary:

- The three CRITICALs are substantially one finding (protagonist passivity)
  stated three ways — D1 at scene scale, D2 at act scale, D3's "carried to
  the ending" phrasing overlapping both. A reader is told to fix the same
  thing three times.
- "Solid" (grade band for 55–74) renders beside 3 CRITICALs and verdict
  CONSIDER without explanation of how those coexist.
- Theme & Originality 99/100 on a 665-word skeleton reads as false
  precision to a professional reader; 159 minor issues on 14 scenes
  (~11.4/scene) reads as noise, not signal.
- "Deadline pressure … as early as Scene 3 and as late as Scene 7": both
  numbers were 0-based (real scenes 4 and 8) — covered by the numbering
  migration; only two scenes total carry clockRaised, which "appears in both
  halves" states in the most generous possible framing.

### D5 — 2026-08-04 addendum: false-precision presentation fixed, re-measured against the current stimulus

**Re-measured first, per the task's own instruction.** The stimulus changed
2026-08-04 (`FIELDING_DECISION_BRIEF.md`'s "thinness limitation" addendum):
the P0 sample is now `dead-frequency.fountain`, 1831 words / 12 scenes,
health 78.3, verdict CONSIDER. The exact "Theme & Originality 98.8" /
"99/100" instance this entry named is **gone** — not because it was hand-
tuned away, but because it no longer exists on the new stimulus (Theme &
Originality now reads 100/100) and, independently, because both render paths
(`server/lib/coverage-html.ts`'s `buildDimensionsSection`, `ScriptDoctorPanel
.tsx`'s dimension row) were already rounding `DimensionScore.score` to a
whole number before this session touched either file — checked by grep
(`toFixed(1)` does not appear near `dim.score` in either file) and by reading
`doctor.ts`'s `computeDimensionScore`, which itself only emits a one-decimal
value at `sceneCount >= 3` for INTERNAL ranking; nothing downstream displays
that decimal. So the literal defect as worded is retired on both counts.

**The underlying problem survives, in a sharper form than the original
example.** Measured on the current stimulus via `runScriptDoctor`:

| Numeric | Rendered | Backing evidence | Honest at that precision? |
|---|---|---|---|
| Health | 78.3 (1 decimal) | All 14 passes, whole-script formula, the only number combining every signal the engine has | Yes — kept as-is, the most-backed number in the report |
| Structure & Pacing | 91/100 | 50 issues across 3 passes (structure, pacing, rhythm) | Integer already coarse; now paired with its basis |
| Character | 95/100 | 39 issues across 3 passes | same |
| Dialogue & Voice | 98/100 | 22 issues across 2 passes | same |
| Plot Logic & Payoff | 88/100 | 58 issues across 4 passes | same |
| Theme & Originality | 100/100 | 7 issues across 2 passes — and one of those two passes (`theme`) fired **zero** issues | Weakest case: a literal maximum score, on the dimension with the fewest passes and the only pass in the whole report that found nothing |
| Health percentile | rendered as "100th" (ordinal) | rank against a 20-sample **synthetic**, hand-authored reference set — each sample is worth 5 raw points of resolution | No — an exact ordinal claims precision the sample size cannot support |
| Each dimension's percentile | rendered as "100th pct" (ordinal badge) | same 20-sample set, ranked on the unclamped statistic | No — same problem, and in this stimulus **all six** numbers (health + 5 dimensions) independently land at the 100th rank simultaneously, which is exactly the "the tool does not know what it does not know" tell this entry names |

The sharper finding: a perfect 100/100 on Theme & Originality is backed by
one pass finding literally nothing (`theme: 0 issues`) and the other finding
7 — "nothing was flagged" is being read as "nothing is wrong," which is a
confidence claim the lexicon-based passes cannot make on their own. And
100th-percentile-on-every-axis at once, against a 20-item reference set, is
the same overconfidence pattern the original 98.8 example flagged, just
distributed across six numbers instead of concentrated in one.

**Presentation rule applied (no computed value touched — verified below):**

1. **Percentiles get bucketed, not zeroed out.** Both `ScriptDoctorPanel.tsx`
   and `SlatePanel.tsx` (the multi-draft comparison table, same defect,
   same fix) gained a `percentileBand()` helper that rounds the already-
   computed `healthPercentile` / `dimension.percentile` to the nearest 10
   ("top 10%", "top 30%", "bottom 10%" …) for the glanceable text. The exact
   ordinal (`ordinal()`, unchanged) moves to the element's `title` tooltip
   instead of disappearing — deletion moratorium respected, only the
   headline precision is scoped down to what a 20-sample set backs.
   `coverage-html.ts` never rendered percentile at all and still doesn't —
   nothing to fix there.
2. **Dimension sub-scores keep their number and gain a basis line.**
   `coverage-html.ts`'s `buildDimensionsSection` and `ScriptDoctorPanel.tsx`'s
   dimension row both now render "Based on N issue(s) across M pass(es)
   (pass names)" beneath the existing summary sentence, built from
   `DimensionScore.issueCount` and `.passes` — fields the type already
   carried but no renderer surfaced. A reader can now see "100/100" and, in
   the same glance, see it is backed by 2 passes and 7 issues rather than
   assume it means "checked everything, found nothing."
3. **Health stays exactly as rendered.** It is the one number built from the
   full 14-pass signal set; bucketing or hedging it would be dishonest in
   the other direction (hiding a real measurement behind false humility).

**Proof no computed value moved.** `npm run generate-p0-sample` before and
after this change, on the current HEAD:

```
health:      78.3            (unchanged)
verdict:     CONSIDER        (unchanged)
sceneCount:  12              (unchanged)
contentHash: a1b44eff859da29988dbd81354056b2574655302d63180022e679a7c942cf3ca  (unchanged)
```

`diff` of the two generated HTML files shows exactly the new `.dim-basis`
lines, one CSS grid-area addition, and the `Generated <timestamp>` footer
line — plus a set of unrelated clue-count/entropy differences already
present on HEAD before this session touched anything (`b4b58d7`'s D4
follow-through, committed 2026-08-04 11:23:52, landed after the committed
artifact's last regeneration at 06:40:42 — confirmed by regenerating twice
in a row post-change and diffing byte-identical except the timestamp). That
staleness is pre-existing and orthogonal to this entry; regenerating the
artifact here picks it up as a side effect, which is why the committed
`sample-coverage-report.html` byte size moved from 193,132 to 193,725 bytes
even though the presentation change itself only adds ~600 bytes of basis
captions across 5 dimension rows.

**Files touched:** `src/components/scriptide/ScriptDoctorPanel.tsx`,
`src/components/SlatePanel.tsx`, `server/lib/coverage-html.ts`,
`docs/user-validation/sample-coverage-report.html` (regenerated).
No file under `server/nvm/revision/passes/**`, `doctor.ts`, `fountain-
analyzer.ts`, or `calibration/**` was edited by this addendum — confirmed
by `node scripts/check-scoring-receipt.mjs`, which reports no scoring-path
files changed for this work.

**What this does NOT do:** it does not touch `DIMENSION_LOW_CONFIDENCE_SCENES`,
`computeDimensionScore`, `percentileRank`, or any threshold; it does not
reduce the 5-dimension rollup to fewer dimensions (the "three CRITICALs are
one finding stated three ways" bullet above and the grade/verdict-coexistence
bullet are both untouched — they are aggregation/synthesis problems, not
precision-of-display problems, and are out of this lane's scope by the task's
own boundary: presentation, not scoring, and not a rewrite of what gets
computed or which findings get deduplicated).

## D6 — Clue lifecycle assigns setup/payoff order instead of observing it

**Where:** `server/nvm/analyze/fountain-analyzer.ts` — `applyClueLifecycle`
(~line 838), feeding `seededClueIds` / `payoffSetupIds` / `unresolvedClues`.

**Found by:** the 2026-08-03 structural signal screen
(`STRUCTURAL_SIGNAL_SCREEN_2026-08-03.md`), not the report truth-audit —
recorded here because it belongs to the same family and has the same shape.

**Mechanism:**

```ts
const first = occ[0];
const last = occ[occ.length - 1];
```

The seed is *defined* as an id's first occurrence and the payoff as its last,
in document scan order. The setup→payoff relation is therefore assigned by
construction, never observed.

**Consequence:** the engine cannot detect a payoff that precedes its own
setup — a real and recognizable craft error (an object, name, or fact used as
though established before the draft establishes it). Whatever order the scenes
arrive in, the first mention is relabeled "the setup" and the ordering error
disappears. Measured: **0 inversions across 26 scripts × 3 order-destroying
degradations** — a constant, not a weak signal. Any "setup-before-payoff
ordering" metric built on these fields is measuring nothing, which is why it
must not be added as a P1 structural signal in this form.

**Fix shape (P1):** derive the lifecycle from evidence of introduction rather
than from position — e.g. require the seeding occurrence to carry
introduction-shaped language (a first-time noun phrase, an ALL-CAPS prop
introduction, a marked reveal) and let the payoff be any later *use*, so that
a use-before-introduction case is representable at all. Fixtures: positive =
drafts with a genuine use-before-setup error; negative = correctly ordered
plants. Corpus-measured before/after; the AUC-24 ratchet still applies.

**Note on D4:** this is a distinct defect from D4 (content-word co-occurrence
certified as "planted clues"). D4 is about *what counts* as a clue; D6 is about
*how its lifecycle is ordered*. Fixing D4 alone would leave D6 intact.

### D6 — 2026-08-04 addendum: FIXED, the fix shape verbatim

`applyClueLifecycle` no longer defines seed = `occ[0]` and payoff =
`occ[last]`. The seed is placed at the occurrence carrying introduction
evidence; the payoff is any later use at a >= 2-scene remove (both
channels — a stricter resolution-language payoff gate was built, MEASURED,
and rejected: it drove content-word payoffs to 0 on 38 of 41 scripts,
recreating the dead channel, and pushed one calibration sample across a
verdict boundary; the rejection is recorded at the site so it is not
silently re-proposed). The inversion case this defect said the engine
"cannot detect" — resolution language before the introduction — is now
representable as `payoffScene < seedScene`, which makes `payoff.ts`'s
long-dormant `PAYOFF_BEFORE_SETUP` rule reachable from the text path and
the statistic non-constant under order-destroying degradations. Tests:
`tests/core/clue-information-test.test.ts` (inversion + normal-order
cases). Shared blast radius and receipt with the D4 addendum above.

## D7 — The engine knows what Kishōtenketsu is, and that knowledge never reaches the score

**Where:** the gap between `server/lib/structure-presets.ts` (~356-385) and
`server/nvm/revision/passes/types.ts` (~50-65).

**Found by:** a 2026-08-03 structural-form audit, prompted by
`MEGA_CATALOG_12700_SYSTEMS.md` listing Kishōtenketsu and other non-Western
forms. Recorded here because it is a construct-validity defect of exactly the
D1-D3 family — a rule asserting something its signals cannot see — and because
it is *self-contradicting*, which makes it unusually cheap to confirm.

**The contradiction.** STORYMACHINE carries two unrelated things named
"structure":

- **Generation side.** `StoryStructure` (`server/engine/types.ts` ~209-231) is a
  22-member taxonomy including `kishotenketsu`, and `structure-presets.ts` gives
  it a well-researched four-beat template that says, verbatim: Ki — *"No
  antagonism… avoid: Conflict as the driving force"*; Shō — *"avoid: An
  antagonist or villain. Tension comes from discovery, not opposition"*; Ten —
  *"avoid: Resolving the twist through conflict or confrontation"*; Ketsu —
  *"No winners and losers."* This is correct and it is consumed only by
  generation prompts.
- **Analysis side.** `StructureState` (`server/nvm/screenplay/structure.ts`) is
  computed from the submitted text and is, by its own comment, a *"Rough 3-act
  model"* with `ActPosition = act1|act2a|midpoint|act2b|act3|epilogue`.

`StoryContext` — the ONLY context the 14 scoring passes receive — has five
fields (`theme`, `genre`, `tone`, `directorStyle`, `characters`) and **no
`structure` field**. So the product can generate a screenplay using its own
Kishōtenketsu preset, then score that same screenplay against hard-coded
three-act assumptions, penalizing it for being exactly what it was told to be.

**Consequence.** Rules whose firing conditions are the direct negation of the
engine's own Kishōtenketsu template fire unconditionally and reach `health`:
`FLAT_SUSPENSE_ARC` (fires on any ≥5-scene script that does not escalate),
`NO_REVERSALS_LONG_STORY` (critical; `reversalCount` is defined only as scenes
with `suspenseDelta < -1`, a magnitude dip, so a revelation-type turn does not
register), `PROTAGONIST_PASSIVITY_CLIMAX` and the ~8 sibling agency rules (the
same lexicon-only predicate already recorded as D1/D2), `WEAK_MIDPOINT`,
`ACT2A_SUSPENSE_VOID` (no "tense elsewhere" escape clause), `ACT1_TOO_LONG`,
`DARK_NIGHT_ABSENT`, and `FALSE_CLIMAX`/`CLIMAX_TOO_EARLY`.

Note the two-layer subtlety on climax position: aggregate `CLIMAX_RELOCATE`
discrimination measures at chance (test 0.523), yet individual positional rules
*do* penalize an unexpected climax. Both are true — the aggregate signal is
absorbed by density dilution at feature scale, while those rules are not.

**No accommodation exists.** All 47 `GenreId` values and every `TONE_REGISTER`
are content/mood categories; `GenreRuleThresholds` exposes six numeric knobs,
only three of which touch `structure.ts`, and none disables the zone model.
There is no code path by which a writer can declare a draft is not three-act.

**Confidence.** High on mechanism (every rule read from source, unconditional,
traced to `health`).

**MAGNITUDE: TESTED AND REFUTED at short-fixture scale (2026-08-03).** The
experiment this entry called for was run — see
`STRUCTURAL_FORM_EXPERIMENT_2026-08-03.md`. Two matched pairs (12 and 16
scenes; the 16-scene pair deliberately clears `ARC_DED_MIN_SCENES = 15` so the
arc deduction is actually exercised), written to the engine's own beat
templates, matched on scene count, word count, and craft — with the opening
scenes textually identical between arms where both templates agree, so the
comparison isolates form.

Result: **health 78.3 vs 78.3, and 81.0 vs 81.3.** No verdict boundary
crossed. Every one of the eight rules predicted above either did not fire at
all, fired identically on both forms, or fired ONLY on the three-act control —
the opposite of the predicted direction.

So the inference "and therefore Kishōtenketsu drafts are penalized" is NOT
supported at the scale tested. The most likely explanation is the irony this
document should state plainly: the engine's order-blindness — the same defect
failing P1's discrimination gate, where CLIMAX_RELOCATE sits at 0.523 — also
prevents it from noticing structural form at all. A score that cannot detect
scene order cannot penalize an unconventional order.

**What this does NOT retract:** the mechanism above is real and remains
correctly documented. `StoryContext` still has no `structure` field, the
engine's own Kishōtenketsu definition still never reaches scoring, and those
rules still fire unconditionally. If the structural channels are ever fixed —
which is exactly what P1 aims to do — this defect becomes live, because a
score that CAN see order will start seeing unconventional order as wrong. Treat
D7 as a constraint on how P1's structural work is designed, not as a bug to
patch today.

**Limitation to respect:** short fixtures are not feature-length screenplays,
N=2 per arm is an existence check rather than a rate, and many zone rules gate
on scene count. This refutes the prediction at the tested scale; it does not
establish form-neutrality at feature scale.

**Fix shape.** Cheapest honest mitigation is a report-level caveat (no scoring
change, no P1 gate): when enough of the rules above co-fire, say plainly that
the structural checks assume a conflict-escalation shape and may misjudge other
legitimate forms. The real fix — threading the existing `StoryStructure` into
`StoryContext` and adding a `STRUCTURE_RULE_MODIFIERS` axis alongside the
genre/tone modifiers — is a scoring change, P1-gated, but it executes an
existing pattern a fourth time rather than inventing machinery, and being
opt-in it cannot regress the Western-commercial P1 corpus.

**Related, and worth its own note:** `emotional-arc.ts`'s header claimed the arc
signal was "DIAGNOSTIC ONLY — not (yet) fed into the health scalar" while
`doctor.ts` was subtracting up to 15 points of `arcIncoherenceDeduction` from
health. Corrected 2026-08-03. That deduction rewards monotonic rise, a late
peak, and fit to one of six Reagan archetypes — none of which is a
juxtaposition/synthesis shape — and unlike the ~150 zone rules it is NOT
density-diluted, so it is the single largest score-side exposure here.

---

## Checked and cleared (did not survive adversarial review)

- **"Every planted clue is paid off" as literally worded** — the hedge
  "among clues detected by the engine" scope-binds the claim to engine
  state, and engine state genuinely shows all seeded clues paid off
  (`unresolvedClues: []`, `openClues: 0`). The upstream clue-quality problem
  is D4; the sentence itself is not false.
- **"The clue detector is definitionally incapable of reporting an open
  clue"** — overstated. The content-word channel cannot (>=2 filter), but
  the exact-token channel (quoted phrases / inline CAPS) has no such filter
  and lands single occurrences in the unresolved branch. Verified by run.

## What the report gets RIGHT (verified, for balance)

- Tension rises from the first half to the second (0.42 → 1.0 mean
  suspense) — TRUE on the engine's numbers.
- The highest-suspense scene sits in the final quartile and exceeds every
  earlier quarter's average — arithmetic TRUE (the "real baseline as early
  as Scene 2" garnish is not supported).
- The climax `revelation` extraction is exactly right, and the logline built
  from it (post-#245) states the story's actual turn.
- 6 distinct scene functions with a 36% cap — arithmetic true (three of the
  six are position-derived, so "distinct functions" is softer than it
  sounds).
