# Root-Cause Templates

Program v2 Type 4 rules: named, plain-language diagnoses for co-occurrence clusters that are always the SAME underlying craft wound wearing two rule- name hats, not a coincidence (`server/nvm/analyze/cluster.ts`). A template runs before the three generic clustering mechanisms and claims its matching issues first, so the flat issue list never double-reports the same wound as an unnamed generic cluster too. Each was chosen from measured rule-pair co-occurrence and spatial overlap evidence across the 20-sample calibration corpus, not intuition — see the wave commit history cited in `cluster.ts`'s own header for the full top-pairs tables.

## Wave 1193

Wave 1193 additions (Program v2, Type 4 — cross-pass duplicate-family merging; adversarial-review response) — a review of the shipped product praised root-cause clustering but flagged that near-duplicate ISSUE FAMILIES (different rule names, different passes, but the same single craft observation) reach the user un-merged: e.g. SEED_EMOTIONAL_DECOUPLED (intention.ts, Wave 451), CLUE_SEED_EMOTION_FLAT (payoff.ts, Wave 328), PROACTIVE_EMOTION_DECOUPLED (intention.ts, Wave 339), and ARC_SEED_EMOTIONAL_AFTERMATH_VOID (character-arc.ts, Wave 505) can all fire on the same script and surface as four separate lines, when a writer reads them as one note said four times. This is a DIFFERENT failure mode from the Wave 1185/1189 templates above: a template names a co-occurrence of genuinely DIFFERENT symptoms that together prove one wound; a duplicate family merges near-restatements of the SAME symptom that different passes happened to name differently (or, in the dual-authorship cases below, literally the same rule name computed independently by two passes). Every entry here was verified by reading the actual check logic in passes/*.ts, not assumed from rule-name similarity — the rulebook has hundreds of X_Y_DECOUPLED combinatorial rules (co-occurrence mode across dozens of channel pairs) and most pairs that merely share the "DECOUPLED" or "MONOTONE" stem audit genuinely different channels (e.g. REVELATION_SUSPENSE_DECOUPLED appears in both belief.ts and structure.ts under the SAME name but with DIFFERENT logic — belief.ts uses average-mode suspenseDelta, structure.ts uses categorical every-scene-flat — so it is correctly NOT a family here; conflating those two would be a false merge). seed-scene-emotional-flatline — SEED_EMOTIONAL_DECOUPLED, CLUE_SEED_EMOTION_FLAT, PROACTIVE_EMOTION_DECOUPLED, ARC_SEED_EMOTIONAL_AFTERMATH_VOID (the reviewer's named example). SEED_EMOTIONAL_DECOUPLED and CLUE_SEED_EMOTION_FLAT are the same check (every seed scene has emotionalShift === 'neutral', n≥8, ≥3 seed scenes) implemented independently in intention.ts and payoff.ts. PROACTIVE_EMOTION_DECOUPLED audits the same neutral-emotion failure over the broader proactive-scene set (clock-raised OR seeded, not seed alone). ARC_SEED_EMOTIONAL_AFTERMATH_VOID checks the AFTERMATH channel (the scene immediately AFTER a seed, not the seed scene itself) — a related but not identical signal, kept in the family because all four converge on one writer-facing note ("your seeding carries no feeling") and a script that fails one very often fails the others too. payoff-scene-emotional-flatline — PAYOFF_EMOTION_DECOUPLED, which is defined TWICE under the identical rule name: intention.ts (Wave 521, co-occurrence mode — payoff scenes vs. ≥2 emotional scenes elsewhere, zero overlap) and payoff.ts (Wave 317, simpler "every payoff scene is neutral" condition). Same rule constant, two independent authors, two LocatedIssues on any script that fails both — the purest case of unmerged duplication this mechanism exists to catch. payoff-scene-relational-flatline — PAYOFF_RELATIONSHIP_DECOUPLED, same dual-authorship pattern: intention.ts (Wave 591) and payoff.ts (Wave 328) both independently check "no payoff scene carries a relationship shift" under the identical rule name. revelation-relational-flatline — REVELATION_RELATIONSHIP_DECOUPLED, same pattern again: belief.ts (Wave 334) and intention.ts (Wave 591) both check "no revelation scene carries a relationship shift" under the identical rule name. All four families are document-anchored aggregate checks (the underlying rules' locations are all whole-script summaries like "All N seed scenes — emotionally neutral", never "Scene N"), so — like the Wave 1193 templates above — there is no line span to overlap: the merge fires whenever 2+ of a family's member rules appear anywhere in the report, contributed by 2+ DISTINCT passes (a family converging within a SINGLE pass would mean one pass fired the same observation twice, which the existing rule contract doesn't allow — the cross-pass requirement is what makes this a genuine "two authors said the same thing" case rather than a false positive).

### Payoffs land with no feeling attached (`payoff-scene-emotional-flatline`)

Requires: 

### Payoffs never move a relationship (`payoff-scene-relational-flatline`)

Requires: 

### Planted material never pays off (`promises-unkept`)

Requires: `CHEKHOV_GUN_UNFIRED` + `SETUP_PAYOFF_IMBALANCE`

### Discoveries never change how anyone relates to anyone (`revelation-relational-flatline`)

Requires: 

### Seeded threads carry no feeling (`seed-scene-emotional-flatline`)

Requires: 

### The story has no turning mechanism (`static-spine`)

Requires: `NO_REVERSALS` + `SUSPENSE_FLATLINE_RUN` + `PURPOSE_MONOTONE_RUN`

### The story is being told in conversation, not in action (`talk-over-action`)

Requires: `DIALOGUE_DOMINANCE` + `TALKING_HEADS`

### The character changes, but nothing pushed them there (`unearned-change`)

Requires: `UNMOTIVATED_TRANSFORMATION` + `ESCALATION_PLATEAU`

## Wave 1189

Wave 1189 additions (Program v2, Type 4 — root-cause templates, second of its kind) — three more named templates, same method as Wave 1185 (runScriptDoctor + locateIssues over all 20 calibration corpus samples, tallied for rule-pair co-occurrence and span overlap), re-run because the corpus evolved under Waves 1186-1188. Several candidates suggested by the wave brief turned out to be non-viable on inspection of locate.ts, not by assumption: ACT1_BOUNDARY_WEAK ("End of Act 1 (Scene ~N)" — the "~" breaks SCENE_RE), NO_REVERSALS / NO_REVERSALS_LONG_STORY ("Overall structure" / "Conflict layer"), TOLD_BELIEF_DOMINATION ("Belief/revelation layer"), and EXPOSITION_DUMP / MISSING_INCITING_INCIDENT / REVELATION_DROUGHT ("Scenes N–M", the plural form SCENE_RE deliberately excludes) all resolve to anchor 'document' with no line span — locate.ts's own module comment says so explicitly for the plural case. A template needs real spans to overlap, so none of those pairs can ever join this mechanism; the three below were chosen from what DOES carry a scene/lines anchor, keeping the same evidentiary bar the brief asked for: COLD_OPEN_INERT + ACTION_CONSECUTIVE_LONG_RUN — co-fire in 14/20 samples; land in overlapping spans 13/14 times (COLD_OPEN_INERT always anchors to Scene 0's full span, and the corpus's earliest dense-action run lands at line ~3, inside it, in all but one sample). REVELATION_UNEARNED + REVELATION_WITHOUT_REACTION — co-fire in 7/20 samples; land in the identical scene span all 7/7 times (an unearned revelation and "the next scene didn't react to it" are frequently the SAME revelation scene, read by two different checks). BELIEF_REVERSAL_UNSUPPORTED + UNMOTIVATED_DECISION — co-fire in 5/20 samples; every one of those 5 has at least one overlapping pair (both rules independently flag the identical scene as an unsupported swing — an emotional/belief reversal by one check, a major decision by the other). Rule sets are kept fully disjoint from Wave 1185's three templates AND from each other (no member rule reused across any two templates in this file) — matchOverlapTemplate scans the full located[] for every template independently (see clusterIssues below), so a shared rule between two templates risks the same issue getting claimed by both and surfacing as two overlapping named findings for one convergence; disjoint rule sets make that structurally impossible rather than merely unlikely. Design choice: claim-before-generic-clustering, not enrich-after Two designs were available: (a) let overlapClusters/characterClusters run as today and afterward re-title any resulting cluster whose memberRules happen to match a template, or (b) run template recognition FIRST and remove (claim) the issues it matches from the pool before the generic clusterers ever see them. (b) is what's implemented, because (a) has a real double-report risk this module's own architecture forbids: the generic scene/lines clustering (Cluster 1 above) is span-overlap-based with NO awareness of rule identity, so it would independently form the exact same connected group a template also matches — re-titling it after the fact is a patch that has to special-case every future template's shape against every existing clusterer's output, whereas claiming issues up front means every clusterer downstream (overlap, character, document family) simply never sees a claimed issue again, by construction, forever — no coordination required as templates or clusterers are added later. The cost is that a template's own matching logic must be self-contained (it can't lean on overlapClusters' output), which is why matchOverlapTemplate below re-implements the identical span-overlap union-find, scoped to the template's own rule set.

### Consequences don't land (`aftermath-void`)

Requires: `DRAMATIC_TURN_AFTERMATH_VOID` + `INCITING_AFTERMATH_STALL`

### Page one has no hook and no air (`airless-opening`)

Requires: `COLD_OPEN_INERT` + `ACTION_CONSECUTIVE_LONG_RUN`

### A character turns, and nothing caused it (`causeless-turn`)

Requires: `BELIEF_REVERSAL_UNSUPPORTED` + `UNMOTIVATED_DECISION`

### The reveal comes from nowhere and changes nothing (`hollow-reveal`)

Requires: `REVELATION_UNEARNED` + `REVELATION_WITHOUT_REACTION`

### Everyone sounds the same about nothing (`inert-scene-flat-talk`)

Requires: `ZERO_ENTROPY_SCENE` + `DIALOGUE_ASSERTION_RUN`

### The middle has no engine (`midpoint-stall`)

Requires: `WEAK_MIDPOINT` + `MIDPOINT_EMOTIONAL_FLATLINE`

