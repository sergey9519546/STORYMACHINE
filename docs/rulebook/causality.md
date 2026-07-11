# Pass: `causality`

Founding wave: 39. Total distinct rules: 236 (184 attributed to a specific wave, 52 unattributed — see docs/rulebook/README.md's methodology note).

## Wave 1191

Wave 1191 additions — Sin Check detector pack (blueprint's named classic-story-sin list; see WAVE_QUALITY_GUARANTEE.md and the ROADMAP blueprint docs): PLOT_ARMOR (the protagonist repeatedly survives lethal/high-danger scenes with zero recorded cost — no injury, no negative emotional aftermath, no relationship/resource loss — across 3+ danger scenes, a genre-aware threshold for comedy-coded scripts), COINCIDENCE_RESOLUTION (a payoff scene closes the story using lucky-arrival phrasing and a brand-new proper noun/object never mentioned before, tracing to no seeded clue — distinct in scope from DEUS_EX_MACHINA, which is revelation-only, position-gated, and phrasing-agnostic), UNMOTIVATED_BETRAYAL (an established-ally relationship flips to hostile with zero prior strain anywhere in the run-up, zero suspicion/deception vocabulary, and no earlier revelation naming either party — distinct from MOTIVATION_REVERSAL_UNCAUSED, which uses a tight 2-scene window and only three numeric guards), and PROTAGONIST_UNTESTED (the protagonist never suffers ANY setback anywhere in the script — emotional, textual, or relational — while the story demonstrably can render one elsewhere; distinct from character-arc.ts's ARC_PROTAGONIST_UNTESTED_SOCIALLY, which is relationship-shift-only and requires 2+ shifts, not a scene-presence population). All four share a small file-local text/speaker infrastructure block (composite per-scene text, cue-based speaker/protagonist detection) duplicated here rather than added to lib/checks.ts, which is reserved for numeric analytical-mode templates, not lexicon extraction — matches the precedent of theme.ts's buildSceneText (Wave 130) and dialogue.ts's extractDialogue.

Rules named in this wave's header:

- `COINCIDENCE_RESOLUTION`
- `DEUS_EX_MACHINA`
- `MOTIVATION_REVERSAL_UNCAUSED`
- `PLOT_ARMOR`
- `PROTAGONIST_UNTESTED`
- `UNMOTIVATED_BETRAYAL`

## Wave 1175

Wave 1175 additions (closes rotation cycle 44, dialogue.ts Wave 1162 - causality.ts Wave 1175): after Wave 1161, revelation stood at three of six channels (curiosityDelta, emotionalShift, relationshipShifts) and suspenseDelta at two (emotionalShift, curiosityDelta). CAUSALITY_REVELATION_SUSPENSE_AFTERMATH_VOID and CAUSALITY_REVELATION_STAGING_AFTERMATH_VOID give revelation its fourth and fifth channels (suspenseDelta, visualBeats); CAUSALITY_SUSPENSE_RELATIONAL_AFTERMATH_VOID gives suspenseDelta its third channel (relationshipShifts).

Rules named in this wave's header:

- `CAUSALITY_REVELATION_STAGING_AFTERMATH_VOID`
- `CAUSALITY_REVELATION_SUSPENSE_AFTERMATH_VOID`
- `CAUSALITY_SUSPENSE_RELATIONAL_AFTERMATH_VOID`

## Wave 1161

Wave 1161 additions: revelation and suspenseDelta each had only their one Wave-1147 channel. CAUSALITY_REVELATION_EMOTIONAL_AFTERMATH_VOID and CAUSALITY_REVELATION_RELATIONAL_AFTERMATH_VOID give revelation its second and third channels (emotionalShift, relationshipShifts); CAUSALITY_SUSPENSE_CURIOSITY_AFTERMATH_VOID gives suspenseDelta its second channel (curiosityDelta).

Rules named in this wave's header:

- `CAUSALITY_REVELATION_EMOTIONAL_AFTERMATH_VOID`
- `CAUSALITY_REVELATION_RELATIONAL_AFTERMATH_VOID`
- `CAUSALITY_SUSPENSE_CURIOSITY_AFTERMATH_VOID`

## Wave 1147

Wave 1147 additions: CAUSALITY_TURN_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID gives dramaticTurn its sixth and final channel (dialogueHighlights), completing full six-channel saturation for every one of this pass's six tracked triggers (raise_stakes, seededClueIds, payoffSetupIds, unresolvedClues-debt, clockRaised, dramaticTurn). With those exhausted, this wave introduces two genuinely fresh checkAftermathVoid triggers — revelation and suspenseDelta have never anchored the isTrigger side of a check in this file. CAUSALITY_REVELATION_CURIOSITY_AFTERMATH_VOID pairs revelation with curiosityDelta; CAUSALITY_SUSPENSE_EMOTIONAL_AFTERMATH_VOID pairs suspenseDelta with emotionalShift.

Rules named in this wave's header:

- `CAUSALITY_REVELATION_CURIOSITY_AFTERMATH_VOID`
- `CAUSALITY_SUSPENSE_EMOTIONAL_AFTERMATH_VOID`
- `CAUSALITY_TURN_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID`

## Wave 1133

Wave 1133 additions (closes rotation cycle 40, belief.ts Wave 1132 - causality.ts Wave 1133): CAUSALITY_CLOCK_STAGING_AFTERMATH_VOID gives clockRaised its sixth and final channel (previously paired with curiosityDelta/emotionalShift/relationshipShifts/suspenseDelta/ dialogueHighlights, now also paired with visualBeats), completing full six-channel saturation for this trigger. CAUSALITY_TURN_RELATIONAL_AFTERMATH_VOID and CAUSALITY_TURN_STAGING_AFTERMATH_VOID give dramaticTurn its fourth and fifth channels (relationshipShifts, visualBeats).

Rules named in this wave's header:

- `CAUSALITY_CLOCK_STAGING_AFTERMATH_VOID`
- `CAUSALITY_TURN_RELATIONAL_AFTERMATH_VOID`
- `CAUSALITY_TURN_STAGING_AFTERMATH_VOID`

## Wave 1119

Wave 1119 additions (opens the thirty-ninth rotation cycle continuation of cycle 38, 1106-1119): clockRaised is now three channels deep (curiosityDelta/emotionalShift/relationshipShifts) and dramaticTurn two (suspenseDelta/curiosityDelta) — this wave advances both toward saturation. CAUSALITY_CLOCK_SUSPENSE_AFTERMATH_VOID pairs clockRaised with suspenseDelta (fourth channel) and CAUSALITY_CLOCK_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID pairs it with dialogueHighlights (fifth channel); CAUSALITY_TURN_EMOTIONAL_AFTERMATH_VOID pairs dramaticTurn with emotionalShift (third channel).

Rules named in this wave's header:

- `CAUSALITY_CLOCK_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID`
- `CAUSALITY_CLOCK_SUSPENSE_AFTERMATH_VOID`
- `CAUSALITY_TURN_EMOTIONAL_AFTERMATH_VOID`

## Wave 1105

Wave 1105 additions (closes the thirty-seventh rotation cycle, 1092-1105): this wave gives clockRaised and dramaticTurn further channels — CAUSALITY_CLOCK_EMOTIONAL_AFTERMATH_VOID and CAUSALITY_CLOCK_RELATIONAL_AFTERMATH_VOID pair clockRaised with emotionalShift and relationshipShifts respectively (second and third channels for this trigger), and CAUSALITY_TURN_CURIOSITY_AFTERMATH_VOID pairs dramaticTurn with curiosityDelta (second channel for this trigger).

Rules named in this wave's header:

- `CAUSALITY_CLOCK_EMOTIONAL_AFTERMATH_VOID`
- `CAUSALITY_CLOCK_RELATIONAL_AFTERMATH_VOID`
- `CAUSALITY_TURN_CURIOSITY_AFTERMATH_VOID`

## Wave 1091

Wave 1091 additions (closes the thirty-sixth rotation cycle, 1078-1091): CAUSALITY_PAYOFF_STAGING_AFTERMATH_VOID gives payoffSetupIds its sixth and final channel (previously paired with emotionalShift/relationshipShifts/suspenseDelta/curiosityDelta/dialogueHighlights, now also paired with visualBeats), completing full six-channel saturation for all four of this pass's main triggers (raise_stakes, seededClueIds, unresolvedClues-debt, payoffSetupIds). With those exhausted, this wave introduces two genuinely fresh sequence/aftermath triggers — neither clockRaised nor dramaticTurn has ever anchored the isTrigger side of a checkAftermathVoid check in this file, though both are used extensively elsewhere (clockRaised: zone-cluster/drought-run/ zone-imbalance; dramaticTurn: zone-cluster/zone-imbalance/drought-run, plus as the AFTERMATH side of STATED_BELIEF_DRAMATIC_TURN_AFTERMATH_VOID). CAUSALITY_CLOCK_CURIOSITY_AFTERMATH_VOID pairs clockRaised with curiosityDelta; CAUSALITY_TURN_SUSPENSE_AFTERMATH_VOID pairs dramaticTurn with suspenseDelta — each a first consequence channel for its trigger.

Rules named in this wave's header:

- `CAUSALITY_CLOCK_CURIOSITY_AFTERMATH_VOID`
- `CAUSALITY_PAYOFF_STAGING_AFTERMATH_VOID`
- `CAUSALITY_TURN_SUSPENSE_AFTERMATH_VOID`
- `CLOCK_CURIOSITY_AFTERMATH_VOID`
- `STATED_BELIEF_DRAMATIC_TURN_AFTERMATH_VOID`

## Wave 1077

Wave 1077 additions (closes the thirty-fifth rotation cycle, 1064-1077): seededClueIds and heavy unresolvedClues debt each reach full six-channel saturation — CAUSALITY_SEED_STAGING_AFTERMATH_VOID (seededClueIds, previously paired with curiosityDelta/emotionalShift/ suspenseDelta/relationshipShifts/dialogueHighlights, now also paired with visualBeats — its only remaining standard channel) and CAUSALITY_OPEN_THREAD_STAGING_AFTERMATH_VOID (heavy unresolvedClues debt, previously paired with suspenseDelta/emotionalShift/relationshipShifts/ curiosityDelta/dialogueHighlights, now also paired with visualBeats — its only remaining standard channel). CAUSALITY_PAYOFF_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID gives payoffSetupIds a fifth channel (previously paired with emotionalShift/relationshipShifts/suspenseDelta/ curiosityDelta, now also paired with dialogueHighlights).

Rules named in this wave's header:

- `CAUSALITY_OPEN_THREAD_STAGING_AFTERMATH_VOID`
- `CAUSALITY_PAYOFF_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID`
- `CAUSALITY_SEED_STAGING_AFTERMATH_VOID`

## Wave 1063

Wave 1063 additions (closes the thirty-fourth rotation cycle, 1050-1063): CAUSALITY_STAKES_STAGING_AFTERMATH_VOID gives raise_stakes its sixth and final standard channel (previously paired with emotionalShift/curiosityDelta/suspenseDelta/relationshipShifts/dialogueHighlights, now also paired with visualBeats, completing full saturation). CAUSALITY_SEED_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID and CAUSALITY_OPEN_THREAD_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID each give seededClueIds and heavy unresolvedClues debt a fifth channel using dialogueHighlights — a field only previously paired with raise_stakes (Wave 1049) in this pass.

Rules named in this wave's header:

- `CAUSALITY_OPEN_THREAD_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID`
- `CAUSALITY_SEED_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID`
- `CAUSALITY_STAKES_STAGING_AFTERMATH_VOID`

## Wave 1049

Wave 1049 additions (closes the thirty-third rotation cycle, 1036-1049): with raise_stakes and payoffSetupIds now at four channels each, this wave gives the remaining two triggers their fourth channel: CAUSALITY_SEED_RELATIONAL_AFTERMATH_VOID (seededClueIds, previously paired with curiosityDelta/emotionalShift/suspenseDelta, now paired with relationshipShifts) and CAUSALITY_OPEN_THREAD_CURIOSITY_AFTERMATH_VOID (unresolvedClues, previously paired with suspenseDelta/ emotionalShift/relationshipShifts, now paired with curiosityDelta). The third check, CAUSALITY_STAKES_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID, pairs raise_stakes with dialogueHighlights — a field that has never been used as a checkAftermathVoid consequence channel anywhere in this pass.

Rules named in this wave's header:

- `CAUSALITY_OPEN_THREAD_CURIOSITY_AFTERMATH_VOID`
- `CAUSALITY_SEED_RELATIONAL_AFTERMATH_VOID`
- `CAUSALITY_STAKES_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID`

## Wave 1035

Wave 1035 additions (closes the thirty-second rotation cycle, 1022-1035): with raise_stakes now at four channels, this wave targets the less-saturated triggers instead: CAUSALITY_SEED_SUSPENSE_AFTERMATH_VOID (seededClueIds, previously paired with curiosityDelta/emotionalShift, now a third channel with suspenseDelta), CAUSALITY_PAYOFF_CURIOSITY_AFTERMATH_VOID (payoffSetupIds, previously paired with emotionalShift/relationshipShifts/suspenseDelta, now a fourth channel with curiosityDelta), and CAUSALITY_OPEN_THREAD_RELATIONAL_AFTERMATH_VOID (unresolvedClues, previously paired with suspenseDelta/emotionalShift, now a third channel with relationshipShifts).

Rules named in this wave's header:

- `CAUSALITY_OPEN_THREAD_RELATIONAL_AFTERMATH_VOID`
- `CAUSALITY_PAYOFF_CURIOSITY_AFTERMATH_VOID`
- `CAUSALITY_SEED_SUSPENSE_AFTERMATH_VOID`

## Wave 1021

Wave 1021 additions (closes the thirty-first rotation cycle, 1008-1021): three more fresh channels for existing triggers: CAUSALITY_STAKES_RELATIONAL_AFTERMATH_VOID (raise_stakes, previously paired with emotionalShift/curiosityDelta/suspenseDelta, now a fourth channel with relationshipShifts), CAUSALITY_PAYOFF_SUSPENSE_AFTERMATH_VOID (payoffSetupIds, previously paired with emotionalShift/relationshipShifts, now a third channel with suspenseDelta), and CAUSALITY_OPEN_THREAD_EMOTIONAL_AFTERMATH_VOID (unresolvedClues, previously only paired with suspenseDelta, now a second channel with emotionalShift).

Rules named in this wave's header:

- `CAUSALITY_OPEN_THREAD_EMOTIONAL_AFTERMATH_VOID`
- `CAUSALITY_PAYOFF_SUSPENSE_AFTERMATH_VOID`
- `CAUSALITY_STAKES_RELATIONAL_AFTERMATH_VOID`

## Wave 1007

Wave 1007 additions (opens the thirty-first rotation cycle for this pass): this wave gives three more existing aftermath-void triggers a fresh consequence channel: CAUSALITY_STAKES_SUSPENSE_AFTERMATH_VOID (raise_stakes, previously paired with emotionalShift and curiosityDelta, now paired with suspenseDelta), CAUSALITY_SEED_EMOTIONAL_AFTERMATH_VOID (seededClueIds, previously only paired with curiosityDelta, now paired with emotionalShift), and CAUSALITY_PAYOFF_RELATIONAL_AFTERMATH_VOID (payoffSetupIds, previously only paired with emotionalShift, now paired with relationshipShifts).

Rules named in this wave's header:

- `CAUSALITY_PAYOFF_RELATIONAL_AFTERMATH_VOID`
- `CAUSALITY_SEED_EMOTIONAL_AFTERMATH_VOID`
- `CAUSALITY_STAKES_SUSPENSE_AFTERMATH_VOID`

## Wave 993

Wave 993 additions (closes the twenty-ninth rotation cycle, 980-993): CAUSALITY_CLOCK_ZONE_IMBALANCE (clockRaised boolean) — the last clean trio-complete zone-imbalance candidate in this pass. With zone-imbalance now exhausted, this wave completes the trio with two more aftermath-void pairings, each reusing an already-paired trigger with a fresh channel: CAUSALITY_STAKES_CURIOSITY_AFTERMATH_VOID (raise_stakes, previously only paired with emotionalShift in Wave 979, now paired with curiosityDelta) and CAUSALITY_PAYOFF_EMOTIONAL_AFTERMATH_VOID (payoffSetupIds, previously only paired with relationshipShifts via PAYOFF_RELATIONSHIP_AFTERMATH_VOID, now paired with emotionalShift).

Rules named in this wave's header:

- `CAUSALITY_CLOCK_ZONE_IMBALANCE`
- `CAUSALITY_PAYOFF_EMOTIONAL_AFTERMATH_VOID`
- `CAUSALITY_STAKES_CURIOSITY_AFTERMATH_VOID`
- `PAYOFF_RELATIONSHIP_AFTERMATH_VOID`

## Wave 979

Wave 979 additions (closes the twenty-eighth rotation cycle, 966-979): with zone-imbalance nearly exhausted for this pass, pivots to the sequence/aftermath mode via checkAftermathVoid, adding three trigger→aftermath pairings using trigger signals (raise_stakes purpose, seededClueIds, unresolvedClues) absent from the pass's existing aftermath-void rules: CAUSALITY_STAKES_EMOTIONAL_AFTERMATH_VOID (raise_stakes → emotional), CAUSALITY_SEED_CURIOSITY_AFTERMATH_VOID (seed → curiosity), and CAUSALITY_OPEN_THREAD_SUSPENSE_AFTERMATH_VOID (open-thread → suspense).

Rules named in this wave's header:

- `CAUSALITY_OPEN_THREAD_SUSPENSE_AFTERMATH_VOID`
- `CAUSALITY_SEED_CURIOSITY_AFTERMATH_VOID`
- `CAUSALITY_STAKES_EMOTIONAL_AFTERMATH_VOID`

## Wave 965

Wave 965 additions (closes the twenty-seventh rotation cycle, 952-965): auditing the three remaining trio-complete signals in this pass, spanning three distinct classes: CAUSALITY_REVELATION_ZONE_IMBALANCE (revelation != null — the revelation string field, distinct from the purpose-enum CAUSALITY_REVELATION_PURPOSE one), CAUSALITY_RELATIONSHIP_ZONE_IMBALANCE (relationshipShifts array, distinct from the payoff/seed arrays audited in Wave 951), and CAUSALITY_TURN_ZONE_IMBALANCE (dramaticTurn !== 'nothing' categorical).

Rules named in this wave's header:

- `CAUSALITY_RELATIONSHIP_ZONE_IMBALANCE`
- `CAUSALITY_REVELATION_ZONE_IMBALANCE`
- `CAUSALITY_TURN_ZONE_IMBALANCE`

## Wave 951

Wave 951 additions (closes the twenty-sixth rotation cycle, 938-951): with causality's valence and most delta signals now saturated by the 4-zone mode, this wave audits one remaining delta and two distinct array fields whose 3-zone/run trios were long complete but never 4-zone-audited: CAUSALITY_CLOCK_DELTA_ZONE_IMBALANCE (clockDelta !== 0 — matching the field's existing cluster/drought predicate), CAUSALITY_PAYOFF_ZONE_IMBALANCE (payoffSetupIds — effects), and CAUSALITY_SEED_ZONE_IMBALANCE (seededClueIds — causes); payoff and seed key on genuinely different arrays.

Rules named in this wave's header:

- `CAUSALITY_CLOCK_DELTA_ZONE_IMBALANCE`
- `CAUSALITY_PAYOFF_ZONE_IMBALANCE`
- `CAUSALITY_SEED_ZONE_IMBALANCE`

## Wave 937

Wave 937 additions (closes the twenty-fifth rotation cycle, 924-937): continuing the checkZoneImbalance rollout, this wave applies the 4-zone mode to three more signals that each already have a complete 3-zone/run-based trio but had never been audited by it: CAUSALITY_REVELATION_PURPOSE_ZONE_IMBALANCE (purpose === 'revelation', whose trio was completed in Wave 923), CAUSALITY_POSITIVE_EMOTION_ZONE_IMBALANCE (emotionalShift === 'positive'), and CAUSALITY_CURIOSITY_ZONE_IMBALANCE (curiosityDelta > 0).

Rules named in this wave's header:

- `CAUSALITY_CURIOSITY_ZONE_IMBALANCE`
- `CAUSALITY_POSITIVE_EMOTION_ZONE_IMBALANCE`
- `CAUSALITY_REVELATION_PURPOSE_ZONE_IMBALANCE`

## Wave 923

Wave 923 additions (closes the twenty-fourth rotation cycle, 910-923): purpose === 'revelation' has never been referenced anywhere in this pass (the pre-existing CAUSALITY_REVELATION_ZONE_CLUSTER/DROUGHT_RUN audit the separate revelation string|null field, not this purpose enum value) -- a genuinely virgin field. This wave adds CAUSALITY_REVELATION_PURPOSE_ZONE_CLUSTER and CAUSALITY_REVELATION_PURPOSE_DROUGHT_RUN (peak mode conventionally skipped for this categorical field), plus CAUSALITY_NEGATIVE_EMOTION_ZONE_IMBALANCE, extending the 4-zone checkZoneImbalance mode to the emotionalShift valence signal (emotionalShift === 'negative' has a complete 3-zone/run trio but has never been audited by it).

Rules named in this wave's header:

- `CAUSALITY_NEGATIVE_EMOTION_ZONE_IMBALANCE`
- `CAUSALITY_REVELATION_PURPOSE_DROUGHT_RUN`
- `CAUSALITY_REVELATION_PURPOSE_ZONE_CLUSTER`

## Wave 909

Wave 909 additions (closes the twenty-third rotation cycle, 896-909): continuing the checkZoneImbalance rollout from Wave 881, this wave applies the 4-zone bloat+empty-zone mode to the three remaining purpose values with complete 3-zone/run-based trios that had never been audited by it: CAUSALITY_INTRODUCE_CONFLICT_ZONE_IMBALANCE (purpose === 'introduce_conflict'), CAUSALITY_CHARACTER_MOMENT_ZONE_IMBALANCE (purpose === 'character_moment'), and CAUSALITY_STAKES_ZONE_IMBALANCE (purpose === 'raise_stakes').

Rules named in this wave's header:

- `CAUSALITY_CHARACTER_MOMENT_ZONE_IMBALANCE`
- `CAUSALITY_INTRODUCE_CONFLICT_ZONE_IMBALANCE`
- `CAUSALITY_STAKES_ZONE_IMBALANCE`

## Wave 895

Wave 895 additions (closes the twenty-second rotation cycle, 882-895): continuing the checkZoneImbalance rollout from Wave 881, this wave applies the 4-zone bloat+empty-zone mode to three more purpose values with complete 3-zone/run-based trios: CAUSALITY_RESOLUTION_ZONE_IMBALANCE (purpose === 'resolution'), CAUSALITY_COMPLICATE_ZONE_IMBALANCE (purpose === 'complicate'), and CAUSALITY_TURNING_POINT_ZONE_IMBALANCE (purpose === 'turning_point').

Rules named in this wave's header:

- `CAUSALITY_COMPLICATE_ZONE_IMBALANCE`
- `CAUSALITY_RESOLUTION_ZONE_IMBALANCE`
- `CAUSALITY_TURNING_POINT_ZONE_IMBALANCE`

## Wave 881

Wave 881 additions: CAUSALITY_COMPLICATE_DROUGHT_RUN (run-based x purpose === 'complicate' absence -- completes 2 of 3 slots for this purpose value alongside the zone-cluster mode added in Wave 867; peak mode conventionally skipped for this categorical field), CAUSALITY_CLIMAX_ZONE_IMBALANCE (underweight/bloat x purpose === 'climax' x four structural zones -- distinct from the existing 3-zone CAUSALITY_CLIMAX_ZONE_CLUSTER and run-based CAUSALITY_CLIMAX_DROUGHT_RUN; the first application of the 4-zone bloat+empty-zone mode to this purpose value), CAUSALITY_ESTABLISH_WORLD_ZONE_IMBALANCE (underweight/bloat x purpose === 'establish_world' x four structural zones -- likewise the first application of the 4-zone mode to this purpose value, distinct from its existing 3-zone and run-based counterparts).

Rules named in this wave's header:

- `CAUSALITY_CLIMAX_ZONE_IMBALANCE`
- `CAUSALITY_COMPLICATE_DROUGHT_RUN`
- `CAUSALITY_ESTABLISH_WORLD_ZONE_IMBALANCE`

## Wave 867

Wave 867 additions (closes the twentieth rotation cycle, 854-867): CAUSALITY_COMPLICATE_ZONE_CLUSTER (distribution/timing x purpose === 'complicate' x structural thirds -- this purpose value has never been referenced anywhere in this pass; a virgin field), CAUSALITY_TURN_ZONE_CLUSTER (distribution/timing x dramaticTurn !== 'nothing' x structural thirds -- completes 2 of 3 slots for this signal alongside the run-based drought mode added in Wave 769; the distributional zone-cluster mode has never been applied to it), CAUSALITY_CURIOSITY_ZONE_CLUSTER (distribution/timing x curiosityDelta>0 x structural thirds -- completes 2 of 3 slots for this signal alongside the run-based drought mode added in Wave 783; the shared-library backward-cause peak mode has never been applied to curiosityDelta magnitude in this pass and remains open for a future wave). Correction: reconnaissance for Wave 881 found that the Wave 867 note above (peak mode "remains open") was itself in error -- the pre-existing Wave 783 header already documents that the hand-rolled CURIOSITY_SPIKE_WITHOUT_CAUSE covers the backward-cause peak mode for curiosityDelta. No new peak-uncaused check was added for this signal in Wave 881 as a result.

Rules named in this wave's header:

- `CAUSALITY_COMPLICATE_ZONE_CLUSTER`
- `CAUSALITY_CURIOSITY_ZONE_CLUSTER`
- `CAUSALITY_TURN_ZONE_CLUSTER`

## Wave 853

Wave 853 additions (closes the nineteenth rotation cycle, 840-853): CAUSALITY_CLIMAX_DROUGHT_RUN (run-based × purpose === 'climax' absence — completes 2 of 3 slots for this purpose value alongside the zone-cluster mode added in Wave 839; peak mode conventionally skipped for this categorical field), CAUSALITY_RESOLUTION_DROUGHT_RUN (run-based × purpose === 'resolution' absence — completes 2 of 3 slots for this purpose value alongside the zone-cluster mode added in Wave 839; peak mode conventionally skipped for this categorical field), CAUSALITY_ESTABLISH_WORLD_DROUGHT_RUN (run-based × purpose === 'establish_world' absence — completes 2 of 3 slots for this purpose value alongside the zone-cluster mode added in Wave 839; peak mode conventionally skipped for this categorical field).

Rules named in this wave's header:

- `CAUSALITY_CLIMAX_DROUGHT_RUN`
- `CAUSALITY_ESTABLISH_WORLD_DROUGHT_RUN`
- `CAUSALITY_RESOLUTION_DROUGHT_RUN`

## Wave 839

Wave 839 additions (closes the eighteenth rotation cycle, 826-839): CAUSALITY_CLIMAX_ZONE_CLUSTER (distribution/timing × purpose === 'climax' × structural thirds — this purpose value has only ever appeared inside the tensionReleasingPurposes composite set and incidental threshold conditions [e.g. purpose === 'climax'/'resolution' guards]; it has never been audited as its own standalone signal by any of the three shared-library trio modes), CAUSALITY_RESOLUTION_ZONE_CLUSTER (distribution/timing × purpose === 'resolution' × structural thirds — likewise only ever touched via the same composite set and threshold guards; a virgin standalone signal), CAUSALITY_ESTABLISH_WORLD_ZONE_CLUSTER (distribution/timing × purpose === 'establish_world' × structural thirds — this purpose value has never been referenced anywhere in this pass; a virgin field).

Rules named in this wave's header:

- `CAUSALITY_CLIMAX_ZONE_CLUSTER`
- `CAUSALITY_ESTABLISH_WORLD_ZONE_CLUSTER`
- `CAUSALITY_RESOLUTION_ZONE_CLUSTER`

## Wave 825

Wave 825 additions (closes the seventeenth rotation cycle, 812-825): CAUSALITY_INTRODUCE_CONFLICT_DROUGHT_RUN (run-based × purpose === 'introduce_conflict' absence — completes 2 of 3 slots for this purpose value alongside the zone-cluster mode added in Wave 811; peak mode conventionally skipped for this categorical field), CAUSALITY_POSITIVE_EMOTION_ZONE_CLUSTER (distribution/timing × emotionalShift === 'positive' × structural thirds — the positive valence has never been isolated by any of the three shared-library trio modes in this pass, mirroring the negative-valence trio completed earlier), CAUSALITY_POSITIVE_EMOTION_DROUGHT_RUN (run-based × emotionalShift === 'positive' absence — completes 2 of 3 slots for this valence alongside the zone-cluster mode added in this same wave; peak mode conventionally skipped for this categorical field).

Rules named in this wave's header:

- `CAUSALITY_INTRODUCE_CONFLICT_DROUGHT_RUN`
- `CAUSALITY_POSITIVE_EMOTION_DROUGHT_RUN`
- `CAUSALITY_POSITIVE_EMOTION_ZONE_CLUSTER`

## Wave 811

Wave 811 additions (closes the sixteenth rotation cycle, 798-811): CAUSALITY_TURNING_POINT_ZONE_CLUSTER (distribution/timing × purpose === 'turning_point' × structural thirds — this purpose value has only ever appeared inside the tensionReleasingPurposes composite set [union with 'resolution', 'climax', 'revelation']; it has never been audited as its own standalone signal by any of the three shared-library trio modes), CAUSALITY_TURNING_POINT_DROUGHT_RUN (run-based × purpose === 'turning_point' absence — completing 2 of 3 slots for this purpose value alongside the zone-cluster mode added in this same wave; peak mode conventionally skipped for this categorical field), CAUSALITY_INTRODUCE_CONFLICT_ZONE_CLUSTER (distribution/timing × purpose === 'introduce_conflict' × structural thirds — this purpose value has never been referenced anywhere in this pass despite being thematically central to a causality analysis; none of the three shared-library trio modes has ever been applied to it).

Rules named in this wave's header:

- `CAUSALITY_INTRODUCE_CONFLICT_ZONE_CLUSTER`
- `CAUSALITY_TURNING_POINT_DROUGHT_RUN`
- `CAUSALITY_TURNING_POINT_ZONE_CLUSTER`

## Wave 797

Wave 797 additions (closes the fifteenth rotation cycle, 784-797): CAUSALITY_CHARACTER_MOMENT_DROUGHT_RUN (run-based × purpose === 'character_moment' absence — Wave 783 applied the zone-cluster mode to this purpose value; the drought-run mode has never been applied to it, completing the trio for this categorical field, peak conventionally skipped). Reconnaissance for this wave also confirmed two near-misses via the hand-rolled-equivalent diligence process: a suspenseDelta zone-cluster candidate is blocked by the pre-existing SUSPENSE_TEMPORAL_CLUSTER (Wave 573, an exact hand-rolled equivalent of checkZoneCluster at the same n≥9/minCount-3/75% thresholds), and a dramaticTurn zone-cluster candidate is blocked by the pre-existing DRAMATIC_TURN_TEMPORAL_CLUSTER (Wave 489, the same thirds-based >75% test at minCount 4). Both were skipped as non-distinct. CAUSALITY_NEGATIVE_EMOTION_ZONE_CLUSTER (distribution/timing × emotionalShift='negative' × structural thirds — distinct from the pre-existing EMOTIONAL_ZONE_CLUSTER (Wave 475), which clusters on non-neutral scenes of EITHER valence combined; this isolates the negative valence specifically, a narrower signal never tested), CAUSALITY_NEGATIVE_EMOTION_DROUGHT_RUN (run-based × emotionalShift='negative' absence — distinct from the pre-existing EMOTIONAL_NEUTRAL_RUN (Wave 324), which fires on a run of ALL-neutral scenes; this fires on a run absent of negative charge specifically, which a run mixing neutral and positive scenes would satisfy but EMOTIONAL_NEUTRAL_RUN would not).

Rules named in this wave's header:

- `CAUSALITY_CHARACTER_MOMENT_DROUGHT_RUN`
- `CAUSALITY_NEGATIVE_EMOTION_DROUGHT_RUN`
- `CAUSALITY_NEGATIVE_EMOTION_ZONE_CLUSTER`

## Wave 783

Wave 783 additions (closes the fourteenth rotation cycle, 770-783): CAUSALITY_REVELATION_DROUGHT_RUN (run-based × revelation absence — Wave 769 applied the zone-cluster and backward-cause peak modes to revelation; REVELATION_CASCADE audits global density, not longest-run absence — the run-based drought mode has never been applied to it, completing the trio), CAUSALITY_CURIOSITY_DROUGHT_RUN (run-based × curiosityDelta>0 absence — the hand-rolled CURIOSITY_TEMPORAL_CLUSTER and CURIOSITY_SPIKE_WITHOUT_CAUSE already cover the cluster and backward-cause peak modes; CURIOSITY_DECLINE_RUN audits a run of NEGATIVE curiosityDelta, a distinct condition from a run where curiosityDelta simply never rises — the run-based absence-of-rise drought mode has never been applied to it, completing the trio), CAUSALITY_CHARACTER_MOMENT_ZONE_CLUSTER (distribution/timing × purpose === 'character_moment' presence × structural thirds — this specific purpose value has never been referenced anywhere in this pass; none of the three shared-library trio modes has ever been applied to it).

Rules named in this wave's header:

- `CAUSALITY_CHARACTER_MOMENT_ZONE_CLUSTER`
- `CAUSALITY_CURIOSITY_DROUGHT_RUN`
- `CAUSALITY_REVELATION_DROUGHT_RUN`
- `CURIOSITY_SPIKE_WITHOUT_CAUSE`
- `CURIOSITY_TEMPORAL_CLUSTER`

## Wave 769

Wave 769 additions (closes the thirteenth rotation cycle, 756-769): CAUSALITY_TURN_DROUGHT_RUN (run-based × dramaticTurn !== 'nothing' absence — dramaticTurn as a primary signal has only ever anchored a fixed-3-scene-window cluster [DRAMATIC_TURN_CLUSTER], an all-turns backward-cause audit [DRAMATIC_TURN_WITHOUT_CAUSE], aftermath, and co-occurrence-decoupling checks in this pass; the shared-library longest-consecutive-absence-run mode has never been applied to it), CAUSALITY_REVELATION_ZONE_CLUSTER (distribution/timing × revelation × structural thirds — existing revelation checks are global-density [REVELATION_CASCADE], zone-scoped-to-first-half [REVELATION_FRONT_LOADING], and fixed-window clustering [REVELATION_CLUSTERING]; the shared-library thirds-based >75% cluster mode has never been applied to it), CAUSALITY_REVELATION_PEAK_UNCAUSED (backward-cause × revelation-as-magnitude × 2-scene lookback — revelation has only ever served as a hasCause predicate for other signals' peak-uncaused checks in this pass; none of the three shared-library trio modes has ever been applied to revelation itself as the primary signal. hasCause here deliberately references only dramaticTurn, never revelation, to avoid a circular/self-referential audit).

Rules named in this wave's header:

- `CAUSALITY_REVELATION_PEAK_UNCAUSED`
- `CAUSALITY_REVELATION_ZONE_CLUSTER`
- `CAUSALITY_TURN_DROUGHT_RUN`
- `DRAMATIC_TURN_CLUSTER`
- `DRAMATIC_TURN_WITHOUT_CAUSE`
- `REVELATION_CASCADE`
- `REVELATION_FRONT_LOADING`

## Wave 755

Wave 755 additions (closes the twelfth rotation cycle, 742-755): CAUSALITY_PAYOFF_ZONE_CLUSTER (distribution/timing × payoffSetupIds × structural thirds — Waves 685/741 applied the run-based drought and backward-cause peak modes to payoffSetupIds; the zone-cluster mode has never been applied to it, completing the trio), CAUSALITY_CLOCK_DROUGHT_RUN (run-based × clockRaised absence — Wave 699 applied the zone-cluster mode to clockRaised; the drought-run mode has never been applied to it), CAUSALITY_SUSPENSE_DROUGHT_RUN (run-based × suspenseDelta>0 absence — Wave 699 applied the backward-cause peak mode to suspenseDelta; the drought-run mode has never been applied to it).

Rules named in this wave's header:

- `CAUSALITY_CLOCK_DROUGHT_RUN`
- `CAUSALITY_PAYOFF_ZONE_CLUSTER`
- `CAUSALITY_SUSPENSE_DROUGHT_RUN`

## Wave 741

Wave 741 additions (closes the eleventh rotation cycle, 728-741): CAUSALITY_CLOCK_DELTA_ZONE_CLUSTER (distribution/timing × clockDelta≠0 presence × structural thirds — Waves 685/727 applied the backward-cause peak and run-based drought modes to clockDelta; the zone-cluster mode has never been applied to it, completing the trio), CAUSALITY_RELATIONSHIP_ZONE_CLUSTER (distribution/timing × relationshipShifts × structural thirds — Waves 699/727 applied the run-based drought and backward-cause peak modes to relationshipShifts; the zone-cluster mode has never been applied to it, completing the trio), CAUSALITY_PAYOFF_PEAK_UNCAUSED (single-peak isolation/backward-cause × payoffSetupIds magnitude — Wave 685 applied the run-based drought mode to payoffSetupIds; the backward-cause peak mode has never been applied to it).

Rules named in this wave's header:

- `CAUSALITY_CLOCK_DELTA_ZONE_CLUSTER`
- `CAUSALITY_PAYOFF_PEAK_UNCAUSED`
- `CAUSALITY_RELATIONSHIP_ZONE_CLUSTER`

## Wave 727

Wave 727 additions (closes the tenth rotation cycle, 713-727): CAUSALITY_CLOCK_DELTA_DROUGHT_RUN (run-based × clockDelta≠0 absence — Wave 685 applied the backward-cause peak mode to clockDelta; the drought-run mode has never been applied to it), CAUSALITY_RELATIONSHIP_PEAK_UNCAUSED (single-peak isolation/backward-cause × relationshipShifts magnitude — Wave 713 applied the drought-run mode to relationshipShifts; the backward-cause peak mode has never been applied to it), CAUSALITY_SEED_DROUGHT_RUN (run-based × seededClueIds absence — Waves 685/713 applied the zone-cluster and backward-cause peak modes to seededClueIds; the drought-run mode has never been applied to it, completing the trio).

Rules named in this wave's header:

- `CAUSALITY_CLOCK_DELTA_DROUGHT_RUN`
- `CAUSALITY_RELATIONSHIP_PEAK_UNCAUSED`
- `CAUSALITY_SEED_DROUGHT_RUN`

## Wave 713

Wave 713 additions (opens the tenth rotation cycle): CAUSALITY_OPEN_THREAD_ZONE_CLUSTER (distribution/timing × unresolvedClues × structural thirds — Waves 657/671 applied the drought-run and backward-cause peak modes to unresolvedClues; the zone-cluster mode has never been applied to it, completing the trio), CAUSALITY_STAKES_DROUGHT_RUN (run-based × purpose === 'raise_stakes' absence — Wave 671 applied the zone-cluster mode to this signal; the drought-run mode has never been applied to it), CAUSALITY_SEED_PEAK_UNCAUSED (single-peak isolation/backward-cause × seededClueIds magnitude — Wave 685 applied the zone-cluster mode to seededClueIds; the backward-cause peak mode has never been applied to it).

Rules named in this wave's header:

- `CAUSALITY_OPEN_THREAD_ZONE_CLUSTER`
- `CAUSALITY_SEED_PEAK_UNCAUSED`
- `CAUSALITY_STAKES_DROUGHT_RUN`

## Wave 699

Wave 699 additions (closes the eighth rotation cycle, 686-699): CAUSALITY_CLOCK_ZONE_CLUSTER (distribution/timing × clockRaised × structural thirds — clockRaised anchors extensive hand-rolled aggregate/threshold logic throughout this pass but has never been zone-cluster-audited via the shared library), CAUSALITY_RELATIONSHIP_DROUGHT_RUN (run-based × relationshipShifts absence — relationshipShifts anchors extensive hand-rolled aggregate/ threshold logic but has never been drought-audited via the shared library), CAUSALITY_SUSPENSE_PEAK_UNCAUSED (single-peak isolation/backward-cause × suspenseDelta magnitude — suspenseDelta anchors extensive hand-rolled aggregate/threshold logic but has never been backward-cause peak-audited via the shared library).

Rules named in this wave's header:

- `CAUSALITY_CLOCK_ZONE_CLUSTER`
- `CAUSALITY_RELATIONSHIP_DROUGHT_RUN`
- `CAUSALITY_SUSPENSE_PEAK_UNCAUSED`

## Wave 685

Wave 685 additions (closes the seventh rotation cycle, 671-685): CAUSALITY_CLOCK_DELTA_PEAK_UNCAUSED (single-peak isolation/backward-cause × clockDelta magnitude — clockDelta anchors several hand-rolled aggregate and threshold checks in this pass [e.g. the Wave 324/489b no-delta and clock-delta-array logic] but has never been backward-cause peak-audited via the shared library), CAUSALITY_PAYOFF_DROUGHT_RUN (run-based × payoffSetupIds absence — payoffSetupIds anchors extensive hand-rolled aggregate/peak logic [Waves 268, 335, 433c, 461a, 517a] but has never been drought-audited), CAUSALITY_SEED_ZONE_CLUSTER (distribution/timing × seededClueIds × structural thirds — seededClueIds anchors extensive hand-rolled aggregate/ front-loading logic [Waves 335, 461b, 489b] but has never been zone-cluster-audited via the shared library).

Rules named in this wave's header:

- `CAUSALITY_CLOCK_DELTA_PEAK_UNCAUSED`
- `CAUSALITY_PAYOFF_DROUGHT_RUN`
- `CAUSALITY_SEED_ZONE_CLUSTER`

## Wave 671

Wave 671 additions (built on the shared checks library, audit M2.2): opens the seventh rotation cycle. CAUSALITY_HIGHLIGHT_DROUGHT_RUN (run-based × dialogueHighlights absence — Waves 643/657 applied the peak-uncaused and zone-cluster modes to dialogueHighlights; the drought-run mode has never been applied to this channel), CAUSALITY_OPEN_THREAD_PEAK_UNCAUSED (single-peak isolation/backward-cause × unresolvedClues magnitude — unresolvedClues has been zone-imbalanced, drought-audited, and decoupled, but the scene carrying the most simultaneous open threads has never been backward-cause peak-audited), CAUSALITY_STAKES_ZONE_CLUSTER (distribution/timing × purpose === 'raise_stakes' × structural thirds — `purpose` has only ever appeared inside incidental threshold conditions [e.g. purpose === 'climax'/'resolution' guards] in this 120-rule pass, never as the standalone subject of its own check).

Rules named in this wave's header:

- `CAUSALITY_HIGHLIGHT_DROUGHT_RUN`
- `CAUSALITY_OPEN_THREAD_PEAK_UNCAUSED`
- `CAUSALITY_STAKES_ZONE_CLUSTER`

## Wave 657

Wave 657 additions (built on the shared checks library, audit M2.2): completes the sixth rotation cycle's opening file. CAUSALITY_HIGHLIGHT_PEAK_UNCAUSED (single-peak isolation/ backward-cause × dialogueHighlights magnitude — every prior peak check here [suspense, clock, visualBeats] anchors on a different channel; this is the first application to the highlighted-dialogue channel), CAUSALITY_OPEN_THREAD_DROUGHT_RUN (run-based × unresolvedClues absence — Wave 643 applied the drought-run mode to visualBeats; unresolvedClues has been zone-imbalanced [Wave 629] and decoupled/aftermath-void [multiple waves] but never drought-audited via the shared helper), CAUSAL_STAGING_ZONE_CLUSTER (distribution/timing × visualBeats × structural thirds — Wave 643 applied the zone-cluster mode to dialogueHighlights; visualBeats itself has only ever been zone-IMBALANCED [four-zone bloat/empty, Wave 615], never cluster-audited on the thirds granularity).

Rules named in this wave's header:

- `CAUSAL_STAGING_ZONE_CLUSTER`
- `CAUSALITY_HIGHLIGHT_PEAK_UNCAUSED`
- `CAUSALITY_OPEN_THREAD_DROUGHT_RUN`

## Wave 643

Wave 643 additions (built on the shared checks library, audit M2.2): CAUSALITY_VISUAL_BEAT_DROUGHT_RUN (run-based × visualBeats absence — first checkDroughtRun use in this 114-rule pass; a 6+ scene stretch with zero physical staging while staged scenes exist elsewhere, distinct from VISUAL_BEAT_CAUSALITY_ZONE_IMBALANCE [underweight/bloat across four zones] and VISUAL_BEAT_PEAK_UNCAUSED [backward-cause on a single density peak] — this is a contiguous-run measure, not a zone or peak measure), CAUSAL_HIGHLIGHT_ZONE_CLUSTER (distribution/timing × dialogueHighlights × structural thirds — first checkZoneCluster use in this pass; fires when >75% of memorable-dialogue scenes cluster in one third, distinct from Wave 601's stated-belief zone imbalance [four-zone bloat/empty check] which uses a different zone granularity and a different threshold shape), CAUSALITY_OPEN_THREAD_CURIOSITY_DECOUPLED (co-occurrence/ decoupling × unresolvedClues × curiosityDelta>0 — zero overlap between scenes carrying open clue-debt and scenes where audience curiosity is actively rising; distinct from Wave 629's CAUSAL_HIGHLIGHT_OPEN_THREAD_DECOUPLED [unresolvedClues × dialogueHighlights] and from every other unresolvedClues pairing in this file, none of which cross it with the curiosity channel).

Rules named in this wave's header:

- `CAUSAL_HIGHLIGHT_ZONE_CLUSTER`
- `CAUSALITY_OPEN_THREAD_CURIOSITY_DECOUPLED`
- `CAUSALITY_VISUAL_BEAT_DROUGHT_RUN`

## Wave 629

Wave 629 additions (built on the shared checks library, audit M2.2): CAUSAL_HIGHLIGHT_OPEN_THREAD_DECOUPLED (co-occurrence/decoupling × dialogueHighlights × unresolvedClues — first pairing of these two fields in this 111-rule pass, despite each being extensively paired with other channels), VISUAL_BEAT_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID (sequence/aftermath × visualBeats trigger → dialogueHighlights absence — first pairing of these two fields), CAUSALITY_OPEN_THREAD_ZONE_IMBALANCE (underweight/bloat × unresolvedClues × four structural zones — Waves 601/615 applied this template to dialogueHighlights and visualBeats; unresolvedClues itself has never been zone-audited here).

Rules named in this wave's header:

- `CAUSAL_HIGHLIGHT_OPEN_THREAD_DECOUPLED`
- `CAUSALITY_OPEN_THREAD_ZONE_IMBALANCE`
- `VISUAL_BEAT_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID`

## Wave 615

Wave 615 additions (built on the shared checks library, audit M2.2): VISUAL_BEAT_CAUSALITY_ZONE_IMBALANCE (underweight/bloat × visualBeats × four structural zones — first use of visualBeats anywhere in this 108-rule pass, its last untouched record field), OPEN_THREAD_DRAMATIC_TURN_DECOUPLED (co-occurrence/decoupling × unresolvedClues × dramaticTurn — unresolvedClues had exactly one prior incidental OR-condition use, never as its own standalone signal), VISUAL_BEAT_PEAK_UNCAUSED (backward-cause × visualBeats-density peak × dramaticTurn/ revelation cause — the file's central "backward-cause" analytical lens applied to physical staging for the first time).

Rules named in this wave's header:

- `OPEN_THREAD_DRAMATIC_TURN_DECOUPLED`
- `VISUAL_BEAT_CAUSALITY_ZONE_IMBALANCE`
- `VISUAL_BEAT_PEAK_UNCAUSED`

## Wave 587

Wave 587 additions: dramatic-turn suspense aftermath void (sequence/aftermath × dramatic-turn → suspense aftermath — n≥8, ≥2 qualifying dramatic-turn scenes [pos<n-1], ≥2 suspense-rise scenes globally, no dramatic turn immediately followed by a suspense rise; distinct from DRAMATIC_TURN_AFTERMATH_VOID [conjunction of emotion AND suspense AND relationship over 2-scene window per scene], DRAMATIC_TURN_NO_SUSPENSE [co-occurrence × same scene], and CLOCK_RAISE_NO_SUSPENSE [clock trigger]), clock curiosity aftermath void (sequence/aftermath × clock-raised → curiosity aftermath — n≥8, ≥2 qualifying clock-raised scenes [pos<n-1], ≥2 curiosity-spike scenes globally, no clock raise immediately followed by a curiosity spike; distinct from CLOCK_RAISE_CURIOSITY_VOID [co-occurrence × same scene], CLOCK_RAISE_NO_SUSPENSE [suspense not curiosity, co-occurrence], and PAYOFF_AFTERMATH_CURIOSITY_VOID [different trigger]), payoff closing-third absent (zone presence/absence × payoff × closing third — n≥9, ≥3 payoff scenes globally, 0 in the closing third [pos ≥ floor(2n/3)]; the story exhausts its thread resolutions before the climactic zone; distinct from PAYOFF_ZONE_CLUSTER [distribution/timing — >75% in ONE third], PAYOFF_BACK_LOADED [fires when all payoffs are in the second half, not closing-third absence], RELATIONSHIP_OPENING_THIRD_ABSENT [opposite structural position and different signal]).

Rules named in this wave's header:

- `CLOCK_RAISE_CURIOSITY_VOID`
- `CLOCK_RAISE_NO_SUSPENSE`
- `DRAMATIC_TURN_AFTERMATH_VOID`
- `RELATIONSHIP_OPENING_THIRD_ABSENT`

## Wave 573

Wave 573 additions: relationship opening third absent (zone presence/absence × relationship × opening third — n≥9, ≥3 relationship-shift scenes globally, 0 in the opening third [pos < floor(n/3)]; the story's first act is entirely devoid of relationship movement; mirror of RELATIONSHIP_CLOSING_THIRD_ABSENT at the opposite structural position; distinct from RELATIONSHIP_STASIS_RUN [run-based gaps anywhere], EMOTIONAL_CLOSING_THIRD_ABSENT [emotion not relationship], CLOCK_FINAL_THIRD_ABSENT [clock not relationship]), suspense temporal cluster (distribution/timing × suspense × thirds — n≥9, ≥3 suspense-positive scenes [suspenseDelta>0], >75% in one structural third; tension rises are lopsidedly concentrated in one zone; distinct from CLOCK_TEMPORAL_CLUSTER [clock channel], DRAMATIC_TURN_TEMPORAL_CLUSTER [turn], SEED_TEMPORAL_CLUSTER [seed], EMOTIONAL_ZONE_CLUSTER [emotion], SUSPENSE_SPIKE_WITHOUT_CAUSE [backward-cause mode]), curiosity temporal cluster (distribution/ timing × curiosity × thirds — n≥9, ≥3 curiosity-positive scenes [curiosityDelta>0], >75% in one structural third; mystery spikes are lopsidedly concentrated in one zone; distinct from SUSPENSE_TEMPORAL_CLUSTER [suspense channel], all other temporal-cluster checks, and CURIOSITY_FRONT_LOADED [Wave 268: half-split threshold not thirds]).

Rules named in this wave's header:

- `CLOCK_TEMPORAL_CLUSTER`
- `CURIOSITY_FRONT_LOADED`
- `RELATIONSHIP_CLOSING_THIRD_ABSENT`
- `SUSPENSE_TEMPORAL_CLUSTER`

## Wave 559

Wave 559 additions: relationship shift uncaused (backward-cause × relationship channel — n≥8, ≥3 relationship-shift scenes at pos≥2, ALL preceded in prior 2 scenes by no suspense/revelation/ turn driver; bond changes drop from nowhere without any narrative pressure; first backward-cause check on the relationship channel, distinct from all other backward-cause checks [suspense spike, curiosity spike, positive emotion, dramatic turn, clock peak] which use different signal channels, and from DRAMATIC_TURN_RELATIONSHIP_VOID [co-occurrence × same scene] and RELATIONSHIP_STASIS_RUN [run-based × absence]), relationship closing third absent (zone presence/absence × relationship × closing third — n≥9, ≥3 relationship-shift scenes globally, 0 in the final third; all bond dynamics resolve before the climax; distinct from EMOTIONAL_CLOSING_THIRD_ABSENT [emotion not relationship] and CLOCK_FINAL_THIRD_ABSENT [clock not relationship]; first zone-absence check on the relationship channel), payoff relationship aftermath void (average/aggregate × payoff → relationship aftermath — n≥8, ≥3 qualifying payoff scenes [pos<n-1], all scenes immediately following a payoff carry no relationship shifts; thread resolutions never ripple into bond changes; distinct from PAYOFF_RELATIONSHIP_VOID [co-occurrence × same scene — payoff scene itself has no relationship shift; this checks the scene AFTER], PAYOFF_AFTERMATH_SUSPENSE_VOID [suspense channel aftermath], PAYOFF_AFTERMATH_CURIOSITY_VOID [curiosity channel aftermath]).

Rules named in this wave's header:

- `DRAMATIC_TURN_RELATIONSHIP_VOID`
- `PAYOFF_AFTERMATH_CURIOSITY_VOID`
- `PAYOFF_RELATIONSHIP_VOID`
- `RELATIONSHIP_STASIS_RUN`

## Wave 545

Wave 545 additions: payoff aftermath curiosity void (average/aggregate × payoff → curiosity aftermath — n≥8, ≥3 qualifying payoff scenes [pos<n-1], avg curiosityDelta of immediately following scenes ≤ 0; resolutions complete promises without reopening questions; the curiosity-channel complement of PAYOFF_AFTERMATH_SUSPENSE_VOID; distinct from PAYOFF_CURIOSITY_DECOUPLED which checks the payoff scene's OWN curiosityDelta), emotional opening third absent (zone presence/absence × emotional charge × opening third — n≥9, ≥3 emotionally charged scenes globally, none in first third; story's affective register never engages in its opening zone; distinct from EMOTIONAL_CLOSING_THIRD_ABSENT [Wave 517: closing zone], EMOTIONAL_ZONE_CLUSTER [concentration check, not absence], EMOTIONAL_NEUTRAL_RUN [run-based]), seed stasis run (run-based × seed-absence × seed channel — n≥8, ≥3 seed scenes, max consecutive non-seed gap ≥7; the foreshadowing engine silent for its longest uninterrupted stretch; distinct from SEED_TEMPORAL_CLUSTER [distribution/timing], CLUE_SEED_CLUSTER [per-scene overconcentration], seed aftermath/co-occurrence checks; the seed-channel parallel of ASSERTION_DROUGHT in belief.ts).

Rules named in this wave's header:

- `EMOTIONAL_CLOSING_THIRD_ABSENT`
- `PAYOFF_AFTERMATH_SUSPENSE_VOID`

## Wave 531

Wave 531 additions: suspense spike relationship void (co-occurrence/decoupling × high-suspense × relationship — n≥8, ≥2 scenes with suspenseDelta > 1 AND ≥2 scenes with relationship shifts, yet no high-suspense scene carries a relationship shift; danger operates in a social vacuum; completes the suspense-spike co-occurrence set alongside SUSPENSE_SPIKE_NO_EMOTION, SUSPENSE_SPIKE_NO_CURIOSITY, and SUSPENSE_SPIKE_NO_FALLOUT), clock temporal cluster (distribution/timing × clock × thirds — n≥9, ≥3 clockRaised scenes, >75% in one structural third; the clock-channel complement of EMOTIONAL_ZONE_CLUSTER, SEED_TEMPORAL_CLUSTER, PAYOFF_ZONE_CLUSTER, and DRAMATIC_TURN_TEMPORAL_CLUSTER, completing the distribution/timing thirds family for the major structural signals; distinct from CLOCK_CLUSTERING which uses a binary first-40% partition), seed aftermath suspense void (sequence/aftermath × seed → suspenseDelta aftermath — n≥8, ≥3 seed scenes not at last position, avg suspenseDelta of immediately-following scene ≤ 0; the suspense-channel complement of SEED_AFTERMATH_CURIOSITY_VOID, completing the seed-aftermath channel pair).

Rules named in this wave's header:

- `DRAMATIC_TURN_TEMPORAL_CLUSTER`
- `SEED_AFTERMATH_CURIOSITY_VOID`
- `SUSPENSE_SPIKE_NO_CURIOSITY`
- `SUSPENSE_SPIKE_NO_EMOTION`
- `SUSPENSE_SPIKE_NO_FALLOUT`

## Wave 517

Wave 517 additions: payoff aftermath suspense void (average/aggregate × payoff → suspense aftermath — n≥8, ≥3 payoff scenes not at last position, avg suspenseDelta of immediately following scenes ≤ 0; resolutions complete promises but never re-tighten stakes; distinct from PAYOFF_SUSPENSE_VOID which checks the payoff scene's OWN suspenseDelta and from REVELATION_AFTERMATH_SUSPENSE_VOID which uses revelation as trigger), negative emotion unbroken run (run-based × valence × negative emotion — n≥8, ≥3 negative-emotion scenes, maxNegRun ≥ 4; sustained adversity without relief, the negative-polarity complement of POSITIVE_EMOTION_UNBROKEN_RUN completing the positive/negative/neutral run family for the emotion channel), emotional closing third absent (zone presence/absence × closing third × emotional charge — n≥9, ≥3 emotionally charged scenes, none in the final third; the resolution arrives without felt emotional engagement; the emotional complement of CLOCK_FINAL_THIRD_ABSENT; distinct from EMOTIONAL_ZONE_CLUSTER which flags concentration and EMOTIONAL_NEUTRAL_RUN which is run-based).

Rules named in this wave's header:

- `CLOCK_FINAL_THIRD_ABSENT`
- `POSITIVE_EMOTION_UNBROKEN_RUN`
- `REVELATION_AFTERMATH_SUSPENSE_VOID`

## Wave 503

Wave 503 additions: revelation aftermath suspense void (sequence/aftermath × revelation → suspense aftermath — n≥8, ≥3 revelation scenes not at last position, avg suspenseDelta of scene immediately following each revelation ≤ 0; revelations that consistently fail to tighten stakes disconnect the mystery and tension engines; distinct from REVELATION_CURIOSITY_AFTERMATH_VOID in belief.ts which audits the curiosity channel, and from all within-revelation-scene checks), clock final third absent (zone presence/absence × clock × closing third — n≥9, ≥2 clock scenes, none in the final third; deadline machinery vanishes when stakes should peak; distinct from CLOCK_CLUSTERING which flags early overload and CLOCK_SINGLE_SCENE which flags minimum count), positive emotion unbroken run (run-based × valence × positive emotion — n≥8, ≥3 positive scenes, longest consecutive run of positive-emotion scenes ≥ 4; a sustained positive run means the protagonist's world is going well without adversity for too long; distinct from EMOTIONAL_NEUTRAL_RUN, SUSPENSE_DECLINE_RUN, and EMOTIONAL_POSITIVE_DESERT which use different modes on the emotional channel).

Rules named in this wave's header:

- `CLOCK_CLUSTERING`
- `CLOCK_SINGLE_SCENE`
- `SUSPENSE_DECLINE_RUN`

## Wave 489

Wave 489 additions: dramatic turn temporal cluster (distribution/timing × dramatic-turn × thirds — n≥9, ≥4 turn scenes, >75% in one third; the dramatic-turn channel complement of EMOTIONAL_ZONE_CLUSTER, SEED_TEMPORAL_CLUSTER, and PAYOFF_ZONE_CLUSTER; completes the distribution/timing thirds family for the four main narrative event types), clock peak uncaused (single-peak isolation × backward-cause × clock channel — the scene with the highest clockDelta at pos≥2 has no causal driver in the 2 prior scenes; the clock-channel complement of SUSPENSE_PEAK_UNCAUSED which audits the suspense channel), seed aftermath curiosity void (sequence/aftermath × seed → curiosity — n≥8, ≥3 seed scenes not at last position, avg curiosityDelta of scene immediately following each seed ≤ 0; distinct from SEED_SCENE_CURIOSITY_VOID which checks the seed scene's OWN curiosityDelta and from CURIOSITY_SPIKE_NO_FALLOUT which checks what follows a curiosity spike rather than a seed scene).

Rules named in this wave's header:

- `EMOTIONAL_ZONE_CLUSTER`
- `PAYOFF_ZONE_CLUSTER`
- `SEED_TEMPORAL_CLUSTER`

## Wave 475

Wave 475 additions: emotional zone cluster (distribution/timing — >75% of emotionally charged scenes fall in a single third; the story's affective arc is a spike surrounded by flat territory; first distribution/timing check on the temporal spread of emotional charge across the arc; distinct from EMOTIONAL_NEUTRAL_RUN which is run-based and EMOTIONAL_POSITIVE_DESERT which is zone-absence), seed temporal cluster (distribution/timing — >75% of clue-planting scenes fall in a single third; foreshadowing is architecturally concentrated; distinct from CLUE_SEED_CLUSTER which measures within-scene density and from the seed correlation checks which measure accompanying signals), payoff zone cluster (distribution/timing — >75% of payoff scenes fall in a single third; thread resolutions burst in one zone while the other thirds remain open; distinct from PAYOFF_BACK_LOADED which uses a binary first/second-half partition and from the payoff correlation checks).

Rules named in this wave's header:

- `CLUE_SEED_CLUSTER`
- `EMOTIONAL_POSITIVE_DESERT`
- `PAYOFF_BACK_LOADED`

## Wave 461

Wave 461 additions: payoff relationship void (every payoff scene carries no relationship shift — thread resolutions never move a bond; co-occurrence/decoupling × payoff × relationship, the relationship-channel completion of the payoff correlation set alongside PAYOFF_NO_EMOTION, PAYOFF_SUSPENSE_VOID, and PAYOFF_CURIOSITY_DECOUPLED), seed scene emotion void (every clue-planting scene is emotionally neutral — foreshadowing is dropped into flat scenes the audience will not remember; co-occurrence/decoupling × seed × emotion, the emotion-channel completion of the seed correlation set alongside CLUE_SEED_SUSPENSE_VOID and SEED_SCENE_CURIOSITY_VOID), relationship stasis run (6+ consecutive scenes with no relationship shift despite ≥2 bond moves existing in the story — the relational engine falls silent for a sustained stretch; run-based × relationship-absence mode, the relationship-channel parallel of EMOTIONAL_NEUTRAL_RUN and the first run-based check auditing the relationship channel rather than a valence delta).

Rules named in this wave's header:

- `CLUE_SEED_SUSPENSE_VOID`
- `EMOTIONAL_NEUTRAL_RUN`
- `PAYOFF_CURIOSITY_DECOUPLED`
- `PAYOFF_NO_EMOTION`
- `PAYOFF_SUSPENSE_VOID`
- `SEED_SCENE_CURIOSITY_VOID`

## Wave 447

Wave 447 additions: suspense decline run (4+ consecutive scenes each with suspenseDelta < 0 — tension bleeds continuously without any reversal; run-based × suspense × negative valence, the sustained-descent complement of SUSPENSE_UNRELEASED_RUN and the suspense-channel parallel of CURIOSITY_DECLINE_RUN), dramatic turn relationship void (every dramatic-turn scene carries no relationship shift — story pivots happen in an interpersonal vacuum; co-occurrence × dramatic-turn × relationship, completing the turn-scene correlation set alongside DRAMATIC_TURN_NO_SUSPENSE, DRAMATIC_TURN_CURIOSITY_VOID, and DRAMATIC_TURN_NO_EMOTION), curiosity peak no followthrough (the single highest-curiosityDelta scene is not followed within 2 scenes by any revelation — the story's maximum wonder moment leads to no disclosure; single-peak isolation × curiosity × revelation aftermath, distinct from CURIOSITY_SPIKE_NO_FALLOUT which checks per-spike for any consequence and from SUSPENSE_PEAK_UNCAUSED which is backward-cause on suspense).

Rules named in this wave's header:

- `CURIOSITY_DECLINE_RUN`
- `CURIOSITY_SPIKE_NO_FALLOUT`
- `DRAMATIC_TURN_CURIOSITY_VOID`
- `DRAMATIC_TURN_NO_EMOTION`
- `DRAMATIC_TURN_NO_SUSPENSE`
- `SUSPENSE_PEAK_UNCAUSED`
- `SUSPENSE_UNRELEASED_RUN`

## Wave 405

Wave 405 additions: positive reaction without cause (a positive emotional shift with no on-page cause in itself or the prior two scenes — the positive sibling of REACTION_WITHOUT_CAUSE, which handles only negative emotion), curiosity spike without cause (a curiosity spike with no upstream driver — the curiosity sibling of SUSPENSE_SPIKE_NO_CAUSE), dramatic turn without cause (≥2 dramatic turns and none has a cause in itself or the prior scene — the story's pivots are systematically unmotivated).

Rules named in this wave's header:

- `REACTION_WITHOUT_CAUSE`
- `SUSPENSE_SPIKE_NO_CAUSE`

## Unattributed (no explicit wave-header mention)

These rule constants exist in this pass but were not found, by exact-name match, inside any "Wave N —" / "Wave N additions:" header entry in the file — typically because they predate that convention hardening, or the header describes the check descriptively rather than by constant name (e.g. "talking heads" rather than `TALKING_HEADS`). Listed here honestly rather than guessed into a wave, with the nearest preceding in-code "── section title ──" comment as the best-available substitute context where one exists.

- `ABANDONED_GOAL` — Wave 141: Motivation coherence & action consequence
- `ACT2_CAUSAL_DESERT` — Wave 212: Setup-payoff imbalance, act2 causal desert, causal midpoint void
- `ACT3_DISCHARGE_ABSENT` — Wave 197: Causal Act1 void, Act3 discharge absent, motivation reversal
- `ACTION_WITHOUT_CONSEQUENCE` — Wave 141: Motivation coherence & action consequence
- `ANTAGONIST_SECOND_HALF_SILENT` — Wave 226: ANTAGONIST_SECOND_HALF_SILENT
- `CAUSAL_ACT1_VOID` — Wave 197: Causal Act1 void, Act3 discharge absent, motivation reversal
- `CAUSAL_DENSITY_INVERSION` — Wave 226: CAUSAL_DENSITY_INVERSION
- `CAUSAL_MIDPOINT_VOID` — Wave 212: Setup-payoff imbalance, act2 causal desert, causal midpoint void
- `CHEKHOV_GUN_UNFIRED` — Wave 166: Chekhov's gun, consequence delay, revelation front-loading
- `CLOCK_DELTA_WITHOUT_RAISE` — Wave 296: CLOCK_DELTA_WITHOUT_RAISE
- `CLOCK_GHOST` — Wave 187: Consequence chain break, clock ghost, positive shift orphan
- `CLOCK_PEAK_UNCAUSED` — Wave 489: DRAMATIC_TURN_TEMPORAL_CLUSTER, CLOCK_PEAK_UNCAUSED, SEED_AFTERMATH_CURIOSITY_VOID
- `CLOCK_RAISE_NO_FALLOUT` — Wave 391: SUSPENSE_SPIKE_NO_EMOTION, CLOCK_RAISE_NO_FALLOUT, CURIOSITY_SPIKE_NO_FALLOUT
- `CLOCK_RAISE_RELATIONSHIP_VOID` — Wave 419: REVELATION_RELATIONSHIP_VOID, PAYOFF_SUSPENSE_VOID, CLOCK_RAISE_RELATIONSHIP_VOID
- `CLOCK_RAISED_NO_DELTA` — Wave 324: SUSPENSE_UNRELEASED_RUN, CLOCK_RAISED_NO_DELTA, EMOTIONAL_NEUTRAL_RUN
- `CLOCK_RAISED_NO_EMOTION` — Wave 349: CLOCK_RAISED_NO_EMOTION, DRAMATIC_TURN_NO_SUSPENSE, SUSPENSE_SPIKE_NO_FALLOUT
- `CLOCK_RAISED_WITHOUT_PAYOFF` — Wave 180: Revelation without reaction, reaction without cause, clock without payoff
- `CLOCK_RELIEF_UNEXPLAINED` — Wave 310: CLOCK_RELIEF_UNEXPLAINED
- `COINCIDENCE_RESOLVES_PROBLEM` — COINCIDENCE_RESOLVES_PROBLEM
- `CONSEQUENCE_CHAIN_BREAK` — Wave 187: Consequence chain break, clock ghost, positive shift orphan
- `CONSEQUENCE_DELAY_EXCESSIVE` — Wave 166: Chekhov's gun, consequence delay, revelation front-loading
- `CURIOSITY_OPEN_LOOP` — Wave 240: CURIOSITY_OPEN_LOOP
- `CURIOSITY_PEAK_NO_FOLLOWTHROUGH` — Wave 447: SUSPENSE_DECLINE_RUN, DRAMATIC_TURN_RELATIONSHIP_VOID, CURIOSITY_PEAK_NO_FOLLOWTHROUGH
- `DRAMATIC_TURN_SUSPENSE_AFTERMATH_VOID` — Wave 531: SUSPENSE_SPIKE_RELATIONSHIP_VOID, CLOCK_TEMPORAL_CLUSTER, SEED_AFTERMATH_SUSPENSE_VOID
- `EMOTION_WITHOUT_DRIVER_RUN` — Wave 310: EMOTION_WITHOUT_DRIVER_RUN
- `EMOTIONAL_MONOTONY` — Consecutive scenes with identical emotional shift
- `EMOTIONAL_OPENING_THIRD_ABSENT` — Wave 531: SUSPENSE_SPIKE_RELATIONSHIP_VOID, CLOCK_TEMPORAL_CLUSTER, SEED_AFTERMATH_SUSPENSE_VOID
- `EMOTIONAL_WHIPLASH` — Wave 240: EMOTIONAL_WHIPLASH
- `ESCALATION_PLATEAU` — Wave 226: ESCALATION_PLATEAU
- `GOAL_WITHOUT_OPPOSITION` — Wave 155: Deus ex machina, suspense spike, goal-conflict absence
- `NEGATIVE_EMOTION_UNBROKEN_RUN` — Wave 503 checks
- `PAYOFF_CLOSING_THIRD_ABSENT` — Wave 531: SUSPENSE_SPIKE_RELATIONSHIP_VOID, CLOCK_TEMPORAL_CLUSTER, SEED_AFTERMATH_SUSPENSE_VOID
- `PAYOFF_PEAK_INERT` — Wave 433: SUSPENSE_PEAK_UNCAUSED, CURIOSITY_DECLINE_RUN, PAYOFF_PEAK_INERT
- `PAYOFF_WITHOUT_SETUP` — Wave 254: PAYOFF_WITHOUT_SETUP
- `POSITIVE_REACTION_WITHOUT_CAUSE` — Wave 405: POSITIVE_REACTION_WITHOUT_CAUSE, CURIOSITY_SPIKE_WITHOUT_CAUSE, DRAMATIC_TURN_WITHOUT_CAUSE
- `POSITIVE_SHIFT_ORPHAN` — Wave 187: Consequence chain break, clock ghost, positive shift orphan
- `RELATIONSHIP_SHIFT_UNCAUSED` — Wave 531: SUSPENSE_SPIKE_RELATIONSHIP_VOID, CLOCK_TEMPORAL_CLUSTER, SEED_AFTERMATH_SUSPENSE_VOID
- `REVELATION_RELATIONSHIP_VOID` — Wave 419: REVELATION_RELATIONSHIP_VOID, PAYOFF_SUSPENSE_VOID, CLOCK_RAISE_RELATIONSHIP_VOID
- `REVELATION_WITHOUT_CURIOSITY` — Wave 240: REVELATION_WITHOUT_CURIOSITY
- `REVELATION_WITHOUT_REACTION` — Wave 180: Revelation without reaction, reaction without cause, clock without payoff
- `REVELATION_WITHOUT_SETUP` — Revelation without any prior planted clue
- `SEED_AFTERMATH_SUSPENSE_VOID` — Wave 531: SUSPENSE_SPIKE_RELATIONSHIP_VOID, CLOCK_TEMPORAL_CLUSTER, SEED_AFTERMATH_SUSPENSE_VOID
- `SEED_SCENE_EMOTION_VOID` — Wave 461: PAYOFF_RELATIONSHIP_VOID, SEED_SCENE_EMOTION_VOID, RELATIONSHIP_STASIS_RUN
- `SEED_STASIS_RUN` — Wave 531: SUSPENSE_SPIKE_RELATIONSHIP_VOID, CLOCK_TEMPORAL_CLUSTER, SEED_AFTERMATH_SUSPENSE_VOID
- `SETUP_PAYOFF_IMBALANCE` — Wave 212: Setup-payoff imbalance, act2 causal desert, causal midpoint void
- `STATED_BELIEF_REVELATION_DECOUPLED` — Wave 531: SUSPENSE_SPIKE_RELATIONSHIP_VOID, CLOCK_TEMPORAL_CLUSTER, SEED_AFTERMATH_SUSPENSE_VOID
- `STATED_BELIEF_ZONE_IMBALANCE` — Wave 531: SUSPENSE_SPIKE_RELATIONSHIP_VOID, CLOCK_TEMPORAL_CLUSTER, SEED_AFTERMATH_SUSPENSE_VOID
- `SUSPENSE_PLATEAU_FLATLINE` — Wave 254: SUSPENSE_PLATEAU_FLATLINE
- `SUSPENSE_SAWTOOTH` — Wave 296: SUSPENSE_SAWTOOTH
- `SUSPENSE_SPIKE_RELATIONSHIP_VOID` — Wave 531: SUSPENSE_SPIKE_RELATIONSHIP_VOID, CLOCK_TEMPORAL_CLUSTER, SEED_AFTERMATH_SUSPENSE_VOID
- `UNEXPLAINED_SUSPENSE_DROP` — Suspense drop without a reversal scene
- `UNMOTIVATED_DECISION` — Wave 141: Motivation coherence & action consequence

