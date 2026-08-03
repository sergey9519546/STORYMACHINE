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
