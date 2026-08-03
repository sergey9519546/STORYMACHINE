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
traced to `health`). Moderate on magnitude — no Kishōtenketsu script has been
run. **Settling it is cheap and requires no scoring change:** write or generate
2-3 scripts to the engine's own beat template, run `runScriptDoctor`, and diff
the issue list, `arcIncoherenceDeduction`, and health against a
matched-quality three-act control. That should happen before any fix.

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
