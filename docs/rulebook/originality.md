# Pass: `originality`

Founding wave: 137. Total distinct rules: 229 (165 attributed to a specific wave, 64 unattributed — see docs/rulebook/README.md's methodology note).

## Wave 1180

Wave 1180 additions (distinct-mode pivot — see Waves 1176-1179 in dialogue.ts/character-arc.ts/conflict.ts/intention.ts): reconnaissance found this file's ten channels (clockDelta, suspense, curiosity, emotion, seed, payoff, revelation, dramaticTurn, relationship, staging, highlight, open-thread, plus purpose-based zones) saturated across zone-cluster (22), zone-imbalance (22), drought-run (23), peak-uncaused (9), and aftermath-void (42) — but checkHalfLoaded had zero uses, and unlike intention.ts, this file has *no* hand-rolled binary half-partition check anywhere at all (grep for FRONTLOADED/BACKLOADED/FRONT_LOADED/BACK_LOADED returns nothing). This wave introduces the mode for the first time, on three channels that already carry the full zone-cluster/zone-imbalance/drought-run/peak-uncaused quartet: ORIGINALITY_SUSPENSE_BACK_LOADED, ORIGINALITY_REVELATION_FRONT_LOADED, and ORIGINALITY_SEED_BACK_LOADED. Thresholds (minRecords 9, minCount 3) match this file's own zone-cluster precedent for each channel; ratioThreshold 0.70 matches the half-partition convention established in dialogue.ts/character-arc.ts/conflict.ts/intention.ts.

Rules named in this wave's header:

- `ORIGINALITY_REVELATION_FRONT_LOADED`
- `ORIGINALITY_SEED_BACK_LOADED`
- `ORIGINALITY_SUSPENSE_BACK_LOADED`

## Wave 1166

Wave 1166 additions: after Wave 1152, revelation stood at five of six channels (missing only dialogueHighlights) and dramaticTurn at four (missing visualBeats and dialogueHighlights). ORIGINALITY_REVELATION_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID gives revelation its sixth and final channel; ORIGINALITY_TURN_STAGING_AFTERMATH_VOID and ORIGINALITY_TURN_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID give dramaticTurn its fifth and sixth channels (visualBeats, dialogueHighlights), completing full six-channel saturation for both triggers.

Rules named in this wave's header:

- `ORIGINALITY_REVELATION_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID`
- `ORIGINALITY_TURN_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID`
- `ORIGINALITY_TURN_STAGING_AFTERMATH_VOID`

## Wave 1152

Wave 1152 additions: after Wave 1138, revelation and dramaticTurn were each at three of six channels (curiosityDelta, suspenseDelta, emotionalShift). ORIGINALITY_REVELATION_RELATIONAL_AFTERMATH_VOID and ORIGINALITY_TURN_RELATIONAL_AFTERMATH_VOID give each trigger its fourth channel (relationshipShifts); ORIGINALITY_REVELATION_STAGING_AFTERMATH_VOID gives revelation its fifth channel (visualBeats).

Rules named in this wave's header:

- `ORIGINALITY_REVELATION_RELATIONAL_AFTERMATH_VOID`
- `ORIGINALITY_REVELATION_STAGING_AFTERMATH_VOID`
- `ORIGINALITY_TURN_RELATIONAL_AFTERMATH_VOID`

## Wave 1138

Wave 1138 additions: revelation was at two of six channels (curiosityDelta, suspenseDelta) and dramaticTurn at one (emotionalShift). ORIGINALITY_REVELATION_EMOTIONAL_AFTERMATH_VOID gives revelation its third channel (emotionalShift); ORIGINALITY_TURN_SUSPENSE_AFTERMATH_VOID and ORIGINALITY_TURN_CURIOSITY_AFTERMATH_VOID give dramaticTurn its second and third channels (suspenseDelta, curiosityDelta).

Rules named in this wave's header:

- `ORIGINALITY_REVELATION_EMOTIONAL_AFTERMATH_VOID`
- `ORIGINALITY_TURN_CURIOSITY_AFTERMATH_VOID`
- `ORIGINALITY_TURN_SUSPENSE_AFTERMATH_VOID`

## Wave 1124

Wave 1124 additions: with all five tracked triggers (raise_stakes, clockRaised, seededClueIds, payoffSetupIds, unresolvedClues-debt) fully saturated, this wave introduces revelation and dramaticTurn as fresh checkAftermathVoid subjects — both have only ever anchored distribution/timing (zone-imbalance/zone-cluster/drought-run/peak-uncaused) checks in this file, never sequence/aftermath. ORIGINALITY_REVELATION_CURIOSITY_AFTERMATH_VOID and ORIGINALITY_REVELATION_SUSPENSE_AFTERMATH_VOID give revelation its first two channels (curiosityDelta, suspenseDelta); ORIGINALITY_TURN_EMOTIONAL_AFTERMATH_VOID gives dramaticTurn its first channel (emotionalShift).

Rules named in this wave's header:

- `ORIGINALITY_REVELATION_CURIOSITY_AFTERMATH_VOID`
- `ORIGINALITY_REVELATION_SUSPENSE_AFTERMATH_VOID`
- `ORIGINALITY_TURN_EMOTIONAL_AFTERMATH_VOID`

## Wave 1110

Wave 1110 additions: ORIGINALITY_PAYOFF_STAGING_AFTERMATH_VOID gives payoffSetupIds its sixth and final channel (previously paired with emotionalShift/curiosityDelta/suspenseDelta/ relationshipShifts/dialogueHighlights, now also paired with visualBeats), completing full saturation for all four of this pass's main triggers. ORIGINALITY_OPEN_THREAD_RELATIONAL_AFTERMATH_VOID and ORIGINALITY_OPEN_THREAD_STAGING_AFTERMATH_VOID give heavy unresolvedClues debt its fifth and sixth channels (previously paired with dialogueHighlights/curiosityDelta/ suspenseDelta/emotionalShift, now also paired with relationshipShifts and visualBeats respectively), completing full saturation for this trigger too.

Rules named in this wave's header:

- `ORIGINALITY_OPEN_THREAD_RELATIONAL_AFTERMATH_VOID`
- `ORIGINALITY_OPEN_THREAD_STAGING_AFTERMATH_VOID`
- `ORIGINALITY_PAYOFF_STAGING_AFTERMATH_VOID`

## Wave 1096

Wave 1096 additions: ORIGINALITY_CLOCK_STAGING_AFTERMATH_VOID gives clockRaised its sixth and final channel (previously paired with relationshipShifts/emotionalShift/curiosityDelta/ suspenseDelta/dialogueHighlights, now also paired with visualBeats) and ORIGINALITY_SEED_STAGING_AFTERMATH_VOID gives seededClueIds its sixth and final channel (previously paired with curiosityDelta/suspenseDelta/emotionalShift/relationshipShifts/dialogueHighlights, now also paired with visualBeats), completing full six-channel saturation for three of this pass's four main triggers (raise_stakes, clockRaised, seededClueIds). ORIGINALITY_PAYOFF_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID gives payoffSetupIds a fifth channel (previously paired with emotionalShift/curiosityDelta/suspenseDelta/relationshipShifts, now also paired with dialogueHighlights).

Rules named in this wave's header:

- `ORIGINALITY_CLOCK_STAGING_AFTERMATH_VOID`
- `ORIGINALITY_PAYOFF_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID`
- `ORIGINALITY_SEED_STAGING_AFTERMATH_VOID`

## Wave 1082

Wave 1082 additions: raise_stakes reaches full six-channel saturation — ORIGINALITY_STAKES_STAGING_AFTERMATH_VOID (previously paired with curiosityDelta/suspenseDelta/relationshipShifts/ emotionalShift/dialogueHighlights, now also paired with visualBeats — its only remaining standard channel). clockRaised and seededClueIds each get a fifth channel this wave too: ORIGINALITY_CLOCK_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID (previously paired with relationshipShifts/ emotionalShift/curiosityDelta/suspenseDelta, now also paired with dialogueHighlights) and ORIGINALITY_SEED_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID (previously paired with curiosityDelta/ suspenseDelta/emotionalShift/relationshipShifts, now also paired with dialogueHighlights).

Rules named in this wave's header:

- `ORIGINALITY_CLOCK_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID`
- `ORIGINALITY_SEED_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID`
- `ORIGINALITY_STAKES_STAGING_AFTERMATH_VOID`

## Wave 1068

Wave 1068 additions: this wave targets the two least-saturated triggers plus raise_stakes' fifth channel: ORIGINALITY_PAYOFF_RELATIONAL_AFTERMATH_VOID (payoffSetupIds, previously paired with emotionalShift/curiosityDelta/suspenseDelta, now a fourth channel with relationshipShifts), ORIGINALITY_OPEN_THREAD_EMOTIONAL_AFTERMATH_VOID (heavy unresolvedClues debt, previously paired with dialogueHighlights/curiosityDelta/suspenseDelta, now a fourth channel with emotionalShift), and ORIGINALITY_STAKES_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID (raise_stakes, previously paired with curiosityDelta/suspenseDelta/relationshipShifts/emotionalShift, now a fifth channel with dialogueHighlights).

Rules named in this wave's header:

- `ORIGINALITY_OPEN_THREAD_EMOTIONAL_AFTERMATH_VOID`
- `ORIGINALITY_PAYOFF_RELATIONAL_AFTERMATH_VOID`
- `ORIGINALITY_STAKES_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID`

## Wave 1054

Wave 1054 additions: ORIGINALITY_OPEN_THREAD_SUSPENSE_AFTERMATH_VOID gives the heavy-unresolvedClues-debt trigger a third channel (previously paired with dialogueHighlights/ curiosityDelta, now paired with suspenseDelta), ORIGINALITY_CLOCK_SUSPENSE_AFTERMATH_VOID gives clockRaised a fourth channel (previously paired with relationshipShifts/emotionalShift/ curiosityDelta, now paired with suspenseDelta), and ORIGINALITY_SEED_RELATIONAL_AFTERMATH_VOID gives seededClueIds a fourth channel (previously paired with curiosityDelta/suspenseDelta/ emotionalShift, now paired with relationshipShifts).

Rules named in this wave's header:

- `ORIGINALITY_CLOCK_SUSPENSE_AFTERMATH_VOID`
- `ORIGINALITY_OPEN_THREAD_SUSPENSE_AFTERMATH_VOID`
- `ORIGINALITY_SEED_RELATIONAL_AFTERMATH_VOID`

## Wave 1040

Wave 1040 additions: with raise_stakes now at four channels, this wave targets the less-saturated triggers instead: ORIGINALITY_CLOCK_CURIOSITY_AFTERMATH_VOID (clockRaised, previously paired with relationshipShifts/emotionalShift, now a third channel with curiosityDelta), ORIGINALITY_SEED_EMOTIONAL_AFTERMATH_VOID (seededClueIds, previously paired with curiosityDelta/ suspenseDelta, now a third channel with emotionalShift), and ORIGINALITY_PAYOFF_SUSPENSE_AFTERMATH_VOID (payoffSetupIds, previously paired with emotionalShift/curiosityDelta, now a third channel with suspenseDelta).

Rules named in this wave's header:

- `ORIGINALITY_CLOCK_CURIOSITY_AFTERMATH_VOID`
- `ORIGINALITY_PAYOFF_SUSPENSE_AFTERMATH_VOID`
- `ORIGINALITY_SEED_EMOTIONAL_AFTERMATH_VOID`

## Wave 1026

Wave 1026 additions: three more fresh channels for existing triggers: ORIGINALITY_STAKES_EMOTIONAL_AFTERMATH_VOID (raise_stakes, previously paired with curiosityDelta/suspenseDelta/ relationshipShifts, now a fourth channel with emotionalShift), ORIGINALITY_SEED_SUSPENSE_AFTERMATH_VOID (seededClueIds, previously only paired with curiosityDelta, now paired with suspenseDelta), and ORIGINALITY_PAYOFF_CURIOSITY_AFTERMATH_VOID (payoffSetupIds, previously only paired with emotionalShift, now paired with curiosityDelta).

Rules named in this wave's header:

- `ORIGINALITY_PAYOFF_CURIOSITY_AFTERMATH_VOID`
- `ORIGINALITY_SEED_SUSPENSE_AFTERMATH_VOID`
- `ORIGINALITY_STAKES_EMOTIONAL_AFTERMATH_VOID`

## Wave 1012

Wave 1012 additions: this wave gives three more triggers a fresh consequence channel: ORIGINALITY_OPEN_THREAD_CURIOSITY_AFTERMATH_VOID (heavy unresolvedClues debt, previously only paired with dialogueHighlights, now paired with curiosityDelta), ORIGINALITY_CLOCK_EMOTIONAL_AFTERMATH_VOID (clockRaised, previously only paired with relationshipShifts, now paired with emotionalShift), and ORIGINALITY_STAKES_RELATIONAL_AFTERMATH_VOID (raise_stakes, previously paired with curiosityDelta and suspenseDelta, now paired with relationshipShifts for a third channel).

Rules named in this wave's header:

- `ORIGINALITY_CLOCK_EMOTIONAL_AFTERMATH_VOID`
- `ORIGINALITY_OPEN_THREAD_CURIOSITY_AFTERMATH_VOID`
- `ORIGINALITY_STAKES_RELATIONAL_AFTERMATH_VOID`

## Wave 998

Wave 998 additions: zone-imbalance remains fully exhausted (ORIGINALITY_STAGING re-checked and re-excluded — same predicate mismatch, >=2 vs >0 visualBeats). This wave adds three more aftermath-void pairings, none reusing a channel from the existing three-rule family: ORIGINALITY_STAKES_SUSPENSE_AFTERMATH_VOID (raise_stakes, previously only paired with curiosityDelta, now paired with suspenseDelta), ORIGINALITY_SEED_CURIOSITY_AFTERMATH_VOID (seededClueIds, the first use of this field as a checkAftermathVoid TRIGGER in this pass), and ORIGINALITY_PAYOFF_EMOTIONAL_AFTERMATH_VOID (payoffSetupIds, likewise its first use as a checkAftermathVoid TRIGGER in this pass).

Rules named in this wave's header:

- `ORIGINALITY_PAYOFF_EMOTIONAL_AFTERMATH_VOID`
- `ORIGINALITY_SEED_CURIOSITY_AFTERMATH_VOID`
- `ORIGINALITY_STAKES_SUSPENSE_AFTERMATH_VOID`

## Wave 984

Wave 984 additions: ORIGINALITY_HIGHLIGHT_ZONE_IMBALANCE (dialogueHighlights array) — the last clean trio-complete zone-imbalance candidate in this pass (ORIGINALITY_STAGING was skipped: its cluster/drought predicates disagree, >=2 vs >0 visualBeats). With zone-imbalance now exhausted, this wave pivots to the sequence/aftermath mode for two more checks, each a first-use pairing in this pass: ORIGINALITY_STAKES_CURIOSITY_AFTERMATH_VOID (raise_stakes → curiosityDelta) and ORIGINALITY_CLOCK_RELATIONSHIP_AFTERMATH_VOID (clockRaised → relationshipShifts).

Rules named in this wave's header:

- `ORIGINALITY_CLOCK_RELATIONSHIP_AFTERMATH_VOID`
- `ORIGINALITY_HIGHLIGHT_ZONE_IMBALANCE`
- `ORIGINALITY_STAKES_CURIOSITY_AFTERMATH_VOID`

## Wave 970

Wave 970 additions: auditing the three remaining trio-complete signals in this pass, spanning three distinct classes: ORIGINALITY_RELATIONSHIP_ZONE_IMBALANCE (relationshipShifts array), ORIGINALITY_CLOCK_DELTA_ZONE_IMBALANCE (clockDelta !== 0 — a delta distinct from the curiosity/suspense ones audited in Wave 942/956), and ORIGINALITY_EMOTION_ZONE_IMBALANCE (emotionalShift !== 'neutral' — the any-direction valence signal, distinct from the separate positive/negative-emotion rules).

Rules named in this wave's header:

- `ORIGINALITY_CLOCK_DELTA_ZONE_IMBALANCE`
- `ORIGINALITY_EMOTION_ZONE_IMBALANCE`
- `ORIGINALITY_RELATIONSHIP_ZONE_IMBALANCE`

## Wave 956

Wave 956 additions: continuing the non-purpose 4-zone rollout with three more trio-complete signals spanning three distinct classes: ORIGINALITY_CURIOSITY_ZONE_IMBALANCE (curiosityDelta > 0 — the question-raising delta beside Wave 942's suspense one), ORIGINALITY_OPEN_THREAD_ZONE_IMBALANCE (unresolvedClues.length > 0 — an open-thread array beside 942's payoff one), and ORIGINALITY_REVELATION_ZONE_IMBALANCE (revelation != null — the revelation string field, a new class).

Rules named in this wave's header:

- `ORIGINALITY_CURIOSITY_ZONE_IMBALANCE`
- `ORIGINALITY_OPEN_THREAD_ZONE_IMBALANCE`
- `ORIGINALITY_REVELATION_ZONE_IMBALANCE`

## Wave 942

Wave 942 additions: extending the checkZoneImbalance rollout to three more signals whose 3-zone/ run trios were long complete but had never been 4-zone-audited: ORIGINALITY_POSITIVE_EMOTION_ZONE_IMBALANCE (emotionalShift === 'positive', the positive-valence mirror of Wave 928's negative one), ORIGINALITY_SUSPENSE_ZONE_IMBALANCE (suspenseDelta > 0 — tension-delta magnitude), and ORIGINALITY_PAYOFF_ZONE_IMBALANCE (payoffSetupIds.length > 0 — setup-payoff array field). Three distinct signal classes (valence, delta, array), each keyed independently of authored purpose.

Rules named in this wave's header:

- `ORIGINALITY_PAYOFF_ZONE_IMBALANCE`
- `ORIGINALITY_POSITIVE_EMOTION_ZONE_IMBALANCE`
- `ORIGINALITY_SUSPENSE_ZONE_IMBALANCE`

## Wave 928

Wave 928 additions: continuing the checkZoneImbalance rollout, this wave applies the 4-zone bloat+empty-zone mode to three more signals that each already have a complete 3-zone/run-based trio but had never been audited by it: ORIGINALITY_CHARACTER_MOMENT_ZONE_IMBALANCE (purpose === 'character_moment'), ORIGINALITY_STAKES_ZONE_IMBALANCE (purpose === 'raise_stakes'), and ORIGINALITY_NEGATIVE_EMOTION_ZONE_IMBALANCE (emotionalShift === 'negative', a valence signal with a complete 3-zone/run trio).

Rules named in this wave's header:

- `ORIGINALITY_CHARACTER_MOMENT_ZONE_IMBALANCE`
- `ORIGINALITY_NEGATIVE_EMOTION_ZONE_IMBALANCE`
- `ORIGINALITY_STAKES_ZONE_IMBALANCE`

## Wave 914

Wave 914 additions: continuing the checkZoneImbalance rollout begun in Wave 886, this wave applies the 4-zone bloat+empty-zone mode to three more purpose values that each already have a complete 3-zone/run-based trio (checkZoneCluster + checkDroughtRun) but have never been audited by it: ORIGINALITY_RESOLUTION_ZONE_IMBALANCE (purpose === 'resolution'), ORIGINALITY_COMPLICATE_ZONE_IMBALANCE (purpose === 'complicate', whose trio was completed in Wave 900), and ORIGINALITY_INTRODUCE_CONFLICT_ZONE_IMBALANCE (purpose === 'introduce_conflict').

Rules named in this wave's header:

- `ORIGINALITY_COMPLICATE_ZONE_IMBALANCE`
- `ORIGINALITY_INTRODUCE_CONFLICT_ZONE_IMBALANCE`
- `ORIGINALITY_RESOLUTION_ZONE_IMBALANCE`

## Wave 900

Wave 900 additions: purpose === 'complicate' has never been referenced anywhere in this pass -- a genuinely virgin field. This wave adds ORIGINALITY_COMPLICATE_ZONE_CLUSTER and ORIGINALITY_COMPLICATE_DROUGHT_RUN (peak mode conventionally skipped for this categorical field), plus ORIGINALITY_TURNING_POINT_ZONE_IMBALANCE, continuing the checkZoneImbalance rollout begun in Wave 886: purpose === 'turning_point' already has a complete 3-zone/run-based trio but has never been audited by the 4-zone bloat+empty-zone mode.

Rules named in this wave's header:

- `ORIGINALITY_COMPLICATE_DROUGHT_RUN`
- `ORIGINALITY_COMPLICATE_ZONE_CLUSTER`
- `ORIGINALITY_TURNING_POINT_ZONE_IMBALANCE`

## Wave 886

Wave 886 additions: ORIGINALITY_RESOLUTION_DROUGHT_RUN (run-based x purpose === 'resolution' absence -- completes 2 of 3 slots for this purpose value alongside the zone-cluster mode added in Wave 872; peak mode conventionally skipped for this categorical field). Also, no purpose value had ever been audited by the distinct 4-zone checkZoneImbalance mode in this pass (only visualBeats, payoffSetupIds, and seededClueIds had); this wave applies it to two purpose values with complete 3-zone/run-based trios: ORIGINALITY_CLIMAX_ZONE_IMBALANCE (purpose === 'climax') and ORIGINALITY_ESTABLISH_WORLD_ZONE_IMBALANCE (purpose === 'establish_world').

Rules named in this wave's header:

- `ORIGINALITY_CLIMAX_ZONE_IMBALANCE`
- `ORIGINALITY_ESTABLISH_WORLD_ZONE_IMBALANCE`
- `ORIGINALITY_RESOLUTION_DROUGHT_RUN`

## Wave 872

Wave 872 additions: ORIGINALITY_CLIMAX_DROUGHT_RUN (run-based x purpose === 'climax' absence -- completes 2 of 3 slots for this purpose value alongside the zone-cluster mode added in Wave 858; peak mode conventionally skipped for this categorical field), ORIGINALITY_ESTABLISH_WORLD_DROUGHT_RUN (run-based x purpose === 'establish_world' absence -- completes 2 of 3 slots for this purpose value alongside the zone-cluster mode added in Wave 858; peak mode conventionally skipped for this categorical field), ORIGINALITY_RESOLUTION_ZONE_CLUSTER (distribution/timing x purpose === 'resolution' x structural thirds -- this purpose value has never been referenced anywhere in this pass; a virgin field).

Rules named in this wave's header:

- `ORIGINALITY_CLIMAX_DROUGHT_RUN`
- `ORIGINALITY_ESTABLISH_WORLD_DROUGHT_RUN`
- `ORIGINALITY_RESOLUTION_ZONE_CLUSTER`

## Wave 858

Wave 858 additions: ORIGINALITY_POSITIVE_EMOTION_DROUGHT_RUN (run-based × emotionalShift === 'positive' absence — completes 2 of 3 slots for this valence alongside the zone-cluster mode added in Wave 844; peak mode conventionally skipped for this categorical field), ORIGINALITY_ESTABLISH_WORLD_ZONE_CLUSTER (distribution/timing × purpose === 'establish_world' × structural thirds — this purpose value has never been referenced anywhere in this pass; a virgin field), ORIGINALITY_CLIMAX_ZONE_CLUSTER (distribution/timing × purpose === 'climax' × structural thirds — likewise a virgin field, never referenced in this pass before).

Rules named in this wave's header:

- `ORIGINALITY_CLIMAX_ZONE_CLUSTER`
- `ORIGINALITY_ESTABLISH_WORLD_ZONE_CLUSTER`
- `ORIGINALITY_POSITIVE_EMOTION_DROUGHT_RUN`

## Wave 844

Wave 844 additions: ORIGINALITY_INTRODUCE_CONFLICT_DROUGHT_RUN (run-based × purpose === 'introduce_conflict' absence — completes 2 of 3 slots for this purpose value alongside the zone-cluster mode added in Wave 830; peak mode conventionally skipped for this categorical field), ORIGINALITY_NEGATIVE_EMOTION_DROUGHT_RUN (run-based × emotionalShift === 'negative' absence — completes 2 of 3 slots for this valence alongside the zone-cluster mode added in Wave 830; peak mode conventionally skipped for this categorical field), ORIGINALITY_POSITIVE_EMOTION_ZONE_CLUSTER (distribution/timing × emotionalShift === 'positive' × structural thirds — distinct from ORIGINALITY_EMOTION_ZONE_CLUSTER, which tests combined non-neutral emotionalShift [either valence]; this isolates the positive valence alone, opening a new trio in this pass).

Rules named in this wave's header:

- `ORIGINALITY_INTRODUCE_CONFLICT_DROUGHT_RUN`
- `ORIGINALITY_NEGATIVE_EMOTION_DROUGHT_RUN`
- `ORIGINALITY_POSITIVE_EMOTION_ZONE_CLUSTER`

## Wave 830

Wave 830 additions: ORIGINALITY_TURNING_POINT_DROUGHT_RUN (run-based × purpose === 'turning_point' absence — completes 2 of 3 slots for this purpose value alongside the zone-cluster mode added in Wave 816; peak mode conventionally skipped for this categorical field), ORIGINALITY_INTRODUCE_CONFLICT_ZONE_CLUSTER (distribution/timing × purpose === 'introduce_conflict' × structural thirds — this purpose value has never been referenced anywhere in this pass; a virgin field), ORIGINALITY_NEGATIVE_EMOTION_ZONE_CLUSTER (distribution/timing × emotionalShift === 'negative' × structural thirds — distinct from ORIGINALITY_EMOTION_ZONE_CLUSTER, which tests combined non-neutral emotionalShift [either valence]; this isolates the negative valence alone, which none of the three shared-library trio modes has ever done on its own).

Rules named in this wave's header:

- `ORIGINALITY_INTRODUCE_CONFLICT_ZONE_CLUSTER`
- `ORIGINALITY_NEGATIVE_EMOTION_ZONE_CLUSTER`
- `ORIGINALITY_TURNING_POINT_DROUGHT_RUN`

## Wave 816

Wave 816 additions: ORIGINALITY_CHARACTER_MOMENT_ZONE_CLUSTER (distribution/timing × purpose === 'character_moment' × structural thirds — this purpose value has only ever appeared inside the generic PURPOSE_CONSECUTIVE_RUN check [Wave 592, any 4+ consecutive identical-purpose scenes], never audited via thirds-based concentration; a predictable window where every character moment lands is itself a learnable pattern), ORIGINALITY_CHARACTER_MOMENT_DROUGHT_RUN (run-based × purpose === 'character_moment' absence — completing 2 of 3 slots for this purpose value alongside the zone-cluster mode added in this same wave; peak mode conventionally skipped for this categorical field), ORIGINALITY_TURNING_POINT_ZONE_CLUSTER (distribution/timing × purpose === 'turning_point' × structural thirds — likewise only ever touched by the generic PURPOSE_CONSECUTIVE_RUN check; none of the three shared-library trio modes has ever been applied to it).

Rules named in this wave's header:

- `ORIGINALITY_CHARACTER_MOMENT_DROUGHT_RUN`
- `ORIGINALITY_CHARACTER_MOMENT_ZONE_CLUSTER`
- `ORIGINALITY_TURNING_POINT_ZONE_CLUSTER`

## Wave 802

Wave 802 additions: ORIGINALITY_SUSPENSE_PEAK_UNCAUSED (backward-cause × suspenseDelta-as-magnitude × 2-scene lookback — completes the trio for suspenseDelta alongside the zone-cluster mode (Wave 774) and the run-based drought mode (Wave 788); a suspense peak with no preparing cause is itself a predictable, learnable pattern), ORIGINALITY_CURIOSITY_DROUGHT_RUN (run-based × curiosityDelta>0 absence — Wave 788 applied the zone-cluster mode to curiosityDelta; the run-based drought mode has never been applied to it — a long unbroken stretch with no fresh question is itself a predictable pattern), ORIGINALITY_EMOTION_DROUGHT_RUN (run-based × emotionalShift !== 'neutral' absence — Wave 788 applied the zone-cluster mode to emotionalShift; the drought-run mode has never been applied to it, completing 2 of 3 slots for this categorical field — a long emotionally flat stretch is itself a predictable pattern). Reconnaissance for this wave also confirmed the pre-existing DRAMATIC_TURN_ZONE_CLUSTER (Wave 592, hand-rolled) already completes the dramaticTurn trio alongside ORIGINALITY_TURN_DROUGHT_RUN, so dramaticTurn was correctly skipped as a non-distinct candidate.

Rules named in this wave's header:

- `DRAMATIC_TURN_ZONE_CLUSTER`
- `ORIGINALITY_CURIOSITY_DROUGHT_RUN`
- `ORIGINALITY_EMOTION_DROUGHT_RUN`
- `ORIGINALITY_SUSPENSE_PEAK_UNCAUSED`

## Wave 788

Wave 788 additions: ORIGINALITY_SUSPENSE_DROUGHT_RUN (run-based × suspenseDelta>0 absence — Wave 774 applied the zone-cluster mode to suspenseDelta; the run-based drought mode has never been applied to it — a long unbroken stretch of flatlined tension is itself a predictable pattern), ORIGINALITY_CURIOSITY_ZONE_CLUSTER (distribution/timing × curiosityDelta>0 presence × structural thirds — curiosityDelta has only ever anchored aftermath/decoupling checks in this pass; none of the three shared-library trio modes has ever been applied to it — every curiosity spike concentrated in one structural third is itself a predictable pattern), ORIGINALITY_EMOTION_ZONE_CLUSTER (distribution/timing × emotionalShift !== 'neutral' presence × structural thirds — emotionalShift has only ever anchored an average/aggregate tonal check in this pass; none of the three shared-library trio modes has ever been applied to it — every emotional beat concentrated in one structural third is itself a predictable pattern).

Rules named in this wave's header:

- `ORIGINALITY_CURIOSITY_ZONE_CLUSTER`
- `ORIGINALITY_EMOTION_ZONE_CLUSTER`
- `ORIGINALITY_SUSPENSE_DROUGHT_RUN`

## Wave 774

Wave 774 additions: ORIGINALITY_CLOCK_DELTA_PEAK_UNCAUSED (backward-cause × clockDelta-as-magnitude × 2-scene lookback — Wave 760 applied the run-based drought mode to clockDelta; the backward-cause peak mode has never been applied to it — a clock's single sharpest tightening arriving with no dramatic turn or revelation preparing it is itself a predictable, uncaused pattern), ORIGINALITY_CLOCK_DELTA_ZONE_CLUSTER (distribution/timing × clockDelta≠0 presence × structural thirds — completing the trio started by CLOCK_DELTA_FLATLINE [average/aggregate] and ORIGINALITY_CLOCK_DELTA_DROUGHT_RUN [Wave 760, run-based]; the zone-cluster mode has never been applied to it — every clock movement concentrated in one structural third is itself a predictable pattern), ORIGINALITY_SUSPENSE_ZONE_CLUSTER (distribution/timing × suspenseDelta>0 presence × structural thirds — suspenseDelta has only ever served as one component of the SCENE_SHAPE_TEMPLATING structural-signature check and as a secondary "isB" in co-occurrence-decoupling checks in this pass; none of the three shared-library trio modes has ever been applied to it as a primary signal — every suspense spike concentrated in one structural third is itself a predictable pattern).

Rules named in this wave's header:

- `ORIGINALITY_CLOCK_DELTA_PEAK_UNCAUSED`
- `ORIGINALITY_CLOCK_DELTA_ZONE_CLUSTER`
- `ORIGINALITY_SUSPENSE_ZONE_CLUSTER`
- `SCENE_SHAPE_TEMPLATING`

## Wave 760

Wave 760 additions: ORIGINALITY_REVELATION_PEAK_UNCAUSED (single-peak isolation/backward-cause × revelation magnitude — ORIGINALITY_REVELATION_DROUGHT_RUN and ORIGINALITY_REVELATION_ZONE_CLUSTER applied the run-based drought and zone-cluster modes to revelation != null; the backward-cause peak mode has never been applied to it, completing the trio — this check's hasCause deliberately references only dramaticTurn, not revelation itself, to avoid a circular audit of the revelation channel; an uncaused disclosure is itself a predictable pattern), ORIGINALITY_STAKES_DROUGHT_RUN (run-based × purpose === 'raise_stakes' absence — Wave 746 applied the zone-cluster mode to this signal; the drought-run mode has never been applied to it — a long unbroken stretch with the stakes never rising is itself a predictable pattern), ORIGINALITY_CLOCK_DELTA_DROUGHT_RUN (run-based × clockDelta≠0 absence — clockDelta has only ever anchored an average/aggregate variety check [CLOCK_DELTA_FLATLINE]; the run-based drought mode has never been applied to it — a long unbroken stretch with the clock never moving is itself a predictable pattern).

Rules named in this wave's header:

- `ORIGINALITY_CLOCK_DELTA_DROUGHT_RUN`
- `ORIGINALITY_REVELATION_PEAK_UNCAUSED`
- `ORIGINALITY_STAKES_DROUGHT_RUN`

## Wave 746

Wave 746 additions: ORIGINALITY_OPEN_THREAD_ZONE_CLUSTER (distribution/timing × unresolvedClues × structural thirds — Waves 676/732 applied the run-based drought and backward-cause peak modes to unresolvedClues; the zone-cluster mode has never been applied to it, completing the trio — a predictable, front- or back-loaded distribution of open-thread debt is itself a learnable pattern), ORIGINALITY_TURN_DROUGHT_RUN (run-based × dramaticTurn !== 'nothing' absence — dramaticTurn has only ever anchored a co-occurrence/decoupling check and served as a hasCause predicate elsewhere in this pass; the run-based drought mode has never been applied to it as a primary signal — a long unbroken stretch with no dramatic turn at all is itself a predictable pattern the audience can anticipate), ORIGINALITY_STAKES_ZONE_CLUSTER (distribution/timing × purpose === 'raise_stakes' × structural thirds — purpose has never anchored any of the three shared-library modes in this pass; a predictable, front- or back-loaded distribution of stakes-raising scenes is itself a learnable pattern).

Rules named in this wave's header:

- `ORIGINALITY_OPEN_THREAD_ZONE_CLUSTER`
- `ORIGINALITY_STAKES_ZONE_CLUSTER`
- `ORIGINALITY_TURN_DROUGHT_RUN`

## Wave 732

Wave 732 additions: ORIGINALITY_RELATIONSHIP_DROUGHT_RUN (run-based × relationshipShifts absence — Waves 648/718 applied the backward-cause peak and zone-cluster modes to relationshipShifts; the drought-run mode has never been applied to it, completing the trio — a long unbroken stretch where bonds never move is itself a predictable, learnable pattern), ORIGINALITY_REVELATION_ZONE_CLUSTER (distribution/timing × revelation × structural thirds — Wave 648 applied the run-based drought mode to revelation != null; the zone-cluster mode has never been applied to it — a predictable, front- or back-loaded distribution of disclosures is itself a learnable pattern), ORIGINALITY_OPEN_THREAD_PEAK_UNCAUSED (single-peak isolation/backward-cause × unresolvedClues magnitude — Wave 676 applied the run-based drought mode to unresolvedClues; the backward-cause peak mode has never been applied to it — an uncaused spike in accumulated open-thread debt is itself a predictable pattern).

Rules named in this wave's header:

- `ORIGINALITY_OPEN_THREAD_PEAK_UNCAUSED`
- `ORIGINALITY_RELATIONSHIP_DROUGHT_RUN`
- `ORIGINALITY_REVELATION_ZONE_CLUSTER`

## Wave 718

Wave 718 additions (built on the shared checks library): ORIGINALITY_SEED_PEAK_UNCAUSED (single-peak isolation/backward-cause × seededClueIds magnitude — Waves 662/704 applied the drought-run and zone-cluster modes to seededClueIds; the backward-cause peak mode has never been applied to it, completing the trio), ORIGINALITY_STAGING_DROUGHT_RUN (run-based × visualBeats absence — Waves 676/704 applied the zone-cluster and backward-cause peak modes to visualBeats; the drought-run mode has never been applied to it, completing the trio — a learnable stretch where nothing is ever physically staged is itself a predictable pattern), ORIGINALITY_RELATIONSHIP_ZONE_CLUSTER (distribution/timing × relationshipShifts × structural thirds — Wave 648 applied the backward-cause peak mode to relationshipShifts; the zone-cluster mode has never been applied to it — a predictable, front- or back-loaded distribution of relational movement is itself a learnable pattern).

Rules named in this wave's header:

- `ORIGINALITY_RELATIONSHIP_ZONE_CLUSTER`
- `ORIGINALITY_SEED_PEAK_UNCAUSED`
- `ORIGINALITY_STAGING_DROUGHT_RUN`

## Wave 704

Wave 704 additions (built on the shared checks library): ORIGINALITY_HIGHLIGHT_DROUGHT_RUN (run-based × dialogueHighlights absence — Wave 662 applied the backward-cause peak mode and Wave 690 applied the zone-cluster mode to this channel; the drought-run mode has never been applied to it, completing the field's coverage), ORIGINALITY_SEED_ZONE_CLUSTER (distribution/ timing × seededClueIds × structural thirds — Wave 662 applied the drought-run mode to seededClueIds; the zone-cluster mode has never been applied to this channel — a predictable, front- or back-loaded distribution of foreshadowing is itself a learnable pattern), ORIGINALITY_STAGING_PEAK_UNCAUSED (single-peak isolation/backward-cause × visualBeats magnitude — Wave 676 applied the zone-cluster mode to visualBeats; the backward-cause peak mode has never been applied to it — a learnable, causally unmotivated spike in the story's most heavily staged scene is itself a predictable pattern).

Rules named in this wave's header:

- `ORIGINALITY_HIGHLIGHT_DROUGHT_RUN`
- `ORIGINALITY_SEED_ZONE_CLUSTER`
- `ORIGINALITY_STAGING_PEAK_UNCAUSED`

## Wave 690

Wave 690 additions (built on the shared checks library): ORIGINALITY_PAYOFF_DROUGHT_RUN (run-based × payoffSetupIds absence — Waves 648/662/676 applied co-occurrence-decoupling, zone-cluster, and backward-cause peak modes to payoffSetupIds; the run-based drought mode has never been applied to it, completing the field's coverage), ORIGINALITY_CLOCK_DROUGHT_RUN (run-based × clockRaised absence — Wave 606's CLOCK_RAISED_ZONE_CLUSTER applied the distribution/timing mode to this channel; the run-based drought mode has never been applied to it), ORIGINALITY_HIGHLIGHT_ZONE_CLUSTER (distribution/timing × dialogueHighlights × structural thirds — Wave 662 applied the backward-cause peak mode to dialogueHighlights; the zone-cluster mode has never been applied to this channel — a predictable, front- or back-loaded distribution of the story's most memorable dialogue is itself a learnable pattern).

Rules named in this wave's header:

- `ORIGINALITY_CLOCK_DROUGHT_RUN`
- `ORIGINALITY_HIGHLIGHT_ZONE_CLUSTER`
- `ORIGINALITY_PAYOFF_DROUGHT_RUN`

## Wave 676

Wave 676 additions (built on the shared checks library, audit M2.2): ORIGINALITY_OPEN_THREAD_DROUGHT_RUN (run-based × unresolvedClues absence — unresolvedClues has only ever anchored OPEN_THREAD_CURIOSITY_DECOUPLED; the drought-run mode applied to this channel for the first time — a long, predictable stretch where no mystery is ever left dangling), ORIGINALITY_STAGING_ZONE_CLUSTER (distribution/timing × visualBeats × structural thirds — Wave 606's SCENE_STAGING_ZONE_IMBALANCE uses the four-zone bloat/empty template; this is a three-zone concentration measure on the same field, catching skew even when no zone is empty), ORIGINALITY_PAYOFF_PEAK_UNCAUSED (single-peak isolation/backward-cause × payoffSetupIds magnitude — Wave 662 applied the zone-cluster mode to payoffSetupIds; this applies the backward-cause peak mode to the same channel, a genuinely different question).

Rules named in this wave's header:

- `ORIGINALITY_OPEN_THREAD_DROUGHT_RUN`
- `ORIGINALITY_PAYOFF_PEAK_UNCAUSED`
- `ORIGINALITY_STAGING_ZONE_CLUSTER`

## Wave 662

Wave 662 additions (built on the shared checks library, audit M2.2): ORIGINALITY_HIGHLIGHT_PEAK_UNCAUSED (single-peak isolation/backward-cause × dialogueHighlights magnitude — the scene with the single densest count of highlighted lines has no dramatic turn or revelation in itself or the two scenes before it; first application of the peak-uncaused mode to the dialogueHighlights channel in this 117-rule pass), ORIGINALITY_SEED_DROUGHT_RUN (run-based × seededClueIds absence — a 6+ consecutive-scene stretch with no clue seeded at all while seeding occurs ≥3 times elsewhere; PURPOSE_CONSECUTIVE_RUN is this pass's only prior run-based check and tracks a different field entirely via hand-rolled logic, not the shared checkDroughtRun helper), ORIGINALITY_PAYOFF_ZONE_CLUSTER (distribution/timing × payoffSetupIds × structural thirds — this pass already applies the zone-cluster template to dramaticTurn and clockRaised; payoffSetupIds itself has never been cluster-audited here — a predictable, front- or back-loaded resolution rhythm is itself a learnable pattern).

Rules named in this wave's header:

- `ORIGINALITY_HIGHLIGHT_PEAK_UNCAUSED`
- `ORIGINALITY_PAYOFF_ZONE_CLUSTER`
- `ORIGINALITY_SEED_DROUGHT_RUN`
- `PURPOSE_CONSECUTIVE_RUN`

## Wave 648

Wave 648 additions (built on the shared checks library, audit M2.2): ORIGINALITY_RELATIONSHIP_PEAK_UNCAUSED (single-peak isolation/backward-cause × relationshipShifts-count magnitude — first checkPeakUncaused use in this 114-rule pass; relationshipShifts had only ever appeared inside a debug reporting string [Wave 260-era], never as a per-scene signal — the scene with the most simultaneous bond changes has no dramatic turn or revelation in itself or the two scenes before it, so the story's densest relational moment arrives as a learnable, uncaused spike), ORIGINALITY_REVELATION_DROUGHT_RUN (run-based × revelation presence — first checkDroughtRun use in this pass; a 6+ consecutive-scene stretch with no revelation at all while revelations occur ≥3 times elsewhere — distinct from the pre-existing Wave 396 revelation filter, which compares `r.revelation === true` against a string|null field and therefore never actually matches; this is the pass's first functioning revelation-presence check), ORIGINALITY_PAYOFF_CURIOSITY_DECOUPLED (co-occurrence/decoupling × payoffSetupIds × curiosityDelta>0 — zero overlap between thread-resolution scenes and scenes where curiosity is actively rising; payoffSetupIds had only been zone- and co-occurrence-audited against dramaticTurn, never against the curiosity channel — a resolution scene that also reopens curiosity would itself be a less-predictable beat).

Rules named in this wave's header:

- `ORIGINALITY_PAYOFF_CURIOSITY_DECOUPLED`
- `ORIGINALITY_RELATIONSHIP_PEAK_UNCAUSED`
- `ORIGINALITY_REVELATION_DROUGHT_RUN`

## Wave 634

Wave 634 additions (built on the shared checks library, audit M2.2): ORIGINALITY_HIGHLIGHT_STAGING_DECOUPLED (co-occurrence/decoupling × dialogueHighlights × visualBeats — first pairing of these two fields in this 111-rule pass), ORIGINALITY_OPEN_THREAD_HIGHLIGHT_AFTERMATH_VOID (sequence/aftermath × heavy unresolvedClues debt trigger → dialogueHighlights absence — first pairing of these two fields), ORIGINALITY_SEED_ZONE_IMBALANCE (underweight/bloat × seededClueIds × four structural zones — Wave 606/620 applied this template to visualBeats and payoffSetupIds; seededClueIds itself has never been zone-audited here).

Rules named in this wave's header:

- `ORIGINALITY_HIGHLIGHT_STAGING_DECOUPLED`
- `ORIGINALITY_OPEN_THREAD_HIGHLIGHT_AFTERMATH_VOID`
- `ORIGINALITY_SEED_ZONE_IMBALANCE`

## Wave 620

Wave 620 additions (built on the shared checks library, audit M2.2, plus one hand-rolled average/aggregate check): PAYOFF_PLACEMENT_ZONE_IMBALANCE (underweight/bloat × payoffSetupIds × four structural zones — first use of payoffSetupIds anywhere in this 108-rule pass), SEED_TURN_DECOUPLED (co-occurrence/decoupling × seededClueIds × dramaticTurn — first use of seededClueIds anywhere in this pass), CLOCK_DELTA_FLATLINE (average/aggregate × clockDelta variety — first use of clockDelta anywhere in this pass).

Rules named in this wave's header:

- `CLOCK_DELTA_FLATLINE`
- `PAYOFF_PLACEMENT_ZONE_IMBALANCE`
- `SEED_TURN_DECOUPLED`

## Wave 606

Wave 606 additions (built on the shared checks library, audit M2.2): CLOCK_RAISED_ZONE_CLUSTER (distribution/timing × clockRaised × structural thirds — first use of clockRaised anywhere in this 105-rule pass), OPEN_THREAD_CURIOSITY_DECOUPLED (co-occurrence/decoupling × unresolvedClues × curiosityDelta — first use of either field in this pass), SCENE_STAGING_ZONE_IMBALANCE (underweight/bloat × visualBeats × four structural zones — first use of visualBeats anywhere in this pass).

Rules named in this wave's header:

- `CLOCK_RAISED_ZONE_CLUSTER`
- `OPEN_THREAD_CURIOSITY_DECOUPLED`
- `SCENE_STAGING_ZONE_IMBALANCE`

## Wave 592

Wave 592 additions: dramatic turn zone cluster (distribution/timing × dramaticTurn presence × structural thirds — n≥9, ≥3 dramatic-turn scenes [dramaticTurn !== 'nothing'], >75% in a single third; the story's pivots are predictably ghettoized into one zone rather than spread across the structure — the audience learns which third to expect a turn in; first check in this pass to touch the dramaticTurn signal at all, distinct from every other zone-cluster-style check in this file which operates on lexical/textual signals rather than per-scene structural records), purpose consecutive run (run-based × purpose — ≥4 consecutive scenes share the identical purpose value; a local, position-independent repetition distinct from UNIFORM_SCENE_PURPOSES [global aggregate: ≤2 distinct purposes across the whole script] and PURPOSE_BOOKEND_REPEAT [compares Act 1's vs Act 3's dominant purpose] and REVELATION_PURPOSE_MONOTONE [filters to revelation scenes only]; first run-based check on the purpose channel in this pass), scene closer ellipsis flood (positional/distribution × the last line of each scene — ≥50% of scenes [n≥6] end their final non-blank line in an ellipsis; every scene trails off the same way, so the audience learns to expect the same rhythmic exit beat before it arrives; distinct from ELLIPSIS_OVERUSE [any-position frequency across all action lines] and DIALOGUE_ELLIPSIS_FLOOD [any-position frequency across all dialogue lines] — this is the first check in this pass to isolate a fixed STRUCTURAL POSITION within each scene, the closer, mirroring the extensive existing opener-position coverage but for the opposite end of the scene).

Rules named in this wave's header:

- `ELLIPSIS_OVERUSE`
- `PURPOSE_BOOKEND_REPEAT`
- `REVELATION_PURPOSE_MONOTONE`
- `UNIFORM_SCENE_PURPOSES`

## Wave 578

Wave 578 additions: slug same-location run (run-based × slug × consecutive same base location — ≥8 sluglines, max consecutive identical base location run ≥5; distinct from LOCATION_REPETITION [global proportion] and SLUG_INT_EXT_MONOTONE [interior/exterior register axis]), action present-continuous flood (underweight/bloat × action prose × continuous-progressive aspect — ≥8 action lines, >25% use "is/are/was/were + gerund"; distinct from PASSIVE_VERB_DOMINANCE [passive voice] and COPULA_ACTION_DOMINANCE [linking-verb state predicates]), dialogue backstory opener flood (underweight/bloat × dialogue × past-temporal exposition openers — ≥8 dialogue lines, >20% open with "years ago"/"back then"/"when I was"/etc.; distinct from DIALOGUE_WISH_STATEMENT_FLOOD [regret-counterfactual register] and DIALOGUE_FILLER_OPENER [non-temporal hedges]).

Rules named in this wave's header:

- `SLUG_INT_EXT_MONOTONE`

## Wave 564

Wave 564 additions: slug INT/EXT monotone (distribution/monotony × scene heading × interior/ exterior register — ≥8 classifiable slugs, zero mixed INT/EXT slugs, dominant register >90%; the story unfolds in one spatial mode; distinct from SCENE_SLUG_TIME_MONOTONE [time-of-day axis], LOCATION_REPETITION [named place], and CONTINUOUS_SLUG_OVERUSE [CONTINUOUS tag]), dialogue em-dash interruption flood (underweight/bloat × dialogue × trailing interruption dash — ≥8 dialogue lines, >30% end with "—" or "--"; interruption becomes a tic that makes every exchange frantic; distinct from DIALOGUE_ELLIPSIS_FLOOD [trailing "..." — soft trail-off vs hard cut-off], DIALOGUE_EXCLAMATION_FLOOD [trailing "!"], and all opener-position dialogue checks), action polysyndeton flood (underweight/bloat × action × internal "and"-clause chaining — ≥8 action lines, >20% contain ≥2 standalone "and" conjunctions; run-on action with no internal hierarchy; distinct from OPENING_CONJUNCTION_OVERUSE and ACTION_THEN_OPENER_FLOOD [opener-position single conjunctions] and ACTION_OPENER_MONOTONY [repeated first word], targeting INTERNAL coordination density instead).

Rules named in this wave's header:

- `ACTION_OPENER_MONOTONY`
- `ACTION_THEN_OPENER_FLOOD`
- `CONTINUOUS_SLUG_OVERUSE`
- `DIALOGUE_ELLIPSIS_FLOOD`
- `DIALOGUE_EXCLAMATION_FLOOD`
- `LOCATION_REPETITION`
- `OPENING_CONJUNCTION_OVERUSE`
- `SCENE_SLUG_TIME_MONOTONE`
- `SLUG_TIME_MONOTONE`

## Wave 550

Wave 550 additions: parenthetical flood (underweight/bloat × parenthetical × per-speech density — >35% of ≥8 character speeches are followed immediately by a parenthetical direction; the script over-directs every performance beat, removing interpretive space from the actor and reader; distinct from all existing dialogue content checks which target the spoken text itself and from all action-line checks; first check in this pass targeting parenthetical lines), dialogue long speech flood (underweight/bloat × dialogue × speech length — >30% of ≥8 dialogue lines contain >15 words; the dialogue is verbose and monologue-heavy, the opposite extreme from DIALOGUE_SHORT_SPEECH_FLOOD; first check targeting excessive dialogue line length in this pass), action adverb flood (underweight/bloat × action × adverb density — >35% of ≥8 action lines contain at least one "-ly" adverb; over-modified action prose where the writer tells rather than shows through the adverb; distinct from PASSIVE_VERB_DOMINANCE [passive verb construction] and ACTION_PRONOUN_OPENER_FLOOD [opener position]; first adverb-density check on action lines).

Rules named in this wave's header:

- `DIALOGUE_SHORT_SPEECH_FLOOD`
- `PASSIVE_VERB_DOMINANCE`

## Wave 536

Wave 536 additions: dialogue negative imperative flood (underweight/bloat × dialogue × negative command register — >20% of ≥8 dialogue lines open with a prohibition or negative imperative: "don't," "never," "stop," "can't you," "won't you," "you can't," "you don't," "do not," "no more"; characters communicate through refusal and denial at the expense of assertive, relational, or exploratory registers; distinct from DIALOGUE_COMMAND_FLOOD which targets positive imperatives and from DIALOGUE_HEDGING_FLOOD which targets uncertainty vocabulary), dialogue exclamation run (run-based × dialogue × exclamation endings — ≥4 consecutive dialogue lines each ending with "!"; a sustained exclamatory streak that drains emphasis; distinct from DIALOGUE_QUESTION_RUN [question endings], DIALOGUE_AGREEMENT_RUN [agreement openers], DIALOGUE_FILLER_RUN [filler openers], and DIALOGUE_SAME_SPEAKER_RUN [speaker repetition]), dialogue short speech flood (underweight/bloat × dialogue × speech length — >60% of ≥8 dialogue lines contain ≤3 words; characters communicate in fragments — one-word, two-word, or three-word utterances — without substantive expression; distinct from ONE_WORD_LINE_DOMINANCE in dialogue.ts which uses a 35% threshold for single-word lines, since this extends the threshold to ≤3 words at a 60% rate).

Rules named in this wave's header:

- `DIALOGUE_AGREEMENT_RUN`
- `DIALOGUE_COMMAND_FLOOD`

## Wave 522

Wave 522 additions: dialogue hedging flood (underweight/bloat × dialogue × uncertainty register — >25% of ≥8 dialogue lines contain hedging/uncertainty vocabulary: "maybe," "perhaps," "I think," "I guess," "probably," "possibly," "sort of," "kind of," "apparently," "might be," "seem to"; characters never commit to a position; distinct from DIALOGUE_WISH_STATEMENT_FLOOD which targets backward regret, DIALOGUE_FILLER_OPENER which targets non-committal openers, and DIALOGUE_I_DOMINANCE which targets personal pronoun count), dialogue agreement run (run-based × dialogue × affirmation openers — ≥4 consecutive dialogue lines opening with agreement words "yes," "right," "okay," "sure," "of course," "absolutely," "exactly," "fine," "i agree," "i know"; characters only affirm each other without conflict; distinct from DIALOGUE_FILLER_RUN, DIALOGUE_QUESTION_RUN, and DIALOGUE_SAME_SPEAKER_RUN which target different patterns), dialogue command flood (underweight/bloat × dialogue × imperative register — >25% of ≥8 dialogue lines begin with a strong command verb "go," "stop," "come," "get," "take," "give," "look," "leave," "run," "find," "listen," "turn," "move," "wait," "stay," "tell," "show," "put," "open," "close," "help," "bring," "hold," "let's"; characters only issue orders, no emotional or exploratory register; distinct from DIALOGUE_HEDGING_FLOOD which targets uncertainty, DIALOGUE_QUESTION_FLOOD which targets questions, and all action-line opener checks which target non-dialogue text).

Rules named in this wave's header:

- `DIALOGUE_HEDGING_FLOOD`
- `DIALOGUE_I_DOMINANCE`
- `DIALOGUE_QUESTION_RUN`
- `DIALOGUE_SAME_SPEAKER_RUN`
- `DIALOGUE_WISH_STATEMENT_FLOOD`

## Wave 508

Wave 508 additions: dialogue same-speaker run (run-based × dialogue × speaker alternation — ≥5 consecutive speeches by the same speaker while ≥3 speakers and ≥12 total lines exist; a local monologue within an apparently multi-character exchange; distinct from DIALOGUE_SPEAKER_SOLO which measures global share and DIALOGUE_SHORT_RUN/FILLER_RUN which measure content not speaker identity), action then-opener flood (underweight/bloat × action prose × temporal sequential opener — >25% of ≥8 action lines begin with "Then "; the writer narrates a sequence instead of presenting images; distinct from ACTION_PRONOUN_OPENER_FLOOD, GERUND_OPENER_DOMINANCE, and all other opener-pattern checks), dialogue wish statement flood (underweight/bloat × dialogue × counterfactual/regret register — >20% of ≥8 dialogue lines contain wish/if-only/should-have counterfactual language; characters speak in backward-looking regret rather than present-tense confrontation; distinct from PRESENT_PERFECT_FLOOD which measures past tense broadly and FUTURE_TENSE_FLOOD which measures forward projection).

Rules named in this wave's header:

- `ACTION_PRONOUN_OPENER_FLOOD`
- `DIALOGUE_SHORT_RUN`
- `DIALOGUE_SPEAKER_SOLO`
- `GERUND_OPENER_DOMINANCE`

## Wave 494

Wave 494 additions: dialogue question run (≥4 consecutive dialogue speeches each ending with "?" — a rapid-fire exchange where nobody answers anything; run-based × dialogue × question punctuation, distinct from DIALOGUE_QUESTION_FLOOD which audits proportion and DIALOGUE_FILLER_RUN which audits opener word), dialogue short run (≥5 consecutive dialogue speeches each ≤3 words total — staccato burst of pure one-liners draining character voice; run-based × dialogue × speech brevity, distinct from DIALOGUE_SHORT_LINE_DOMINANCE which uses global proportion), dialogue speaker solo (one character delivers >60% of all dialogue lines while ≥3 speakers and ≥10 dialogue lines exist — monologue dominance; underweight/bloat × dialogue × speaker distribution, first per-speaker distribution check in originality.ts).

Rules named in this wave's header:

- `DIALOGUE_FILLER_RUN`
- `DIALOGUE_QUESTION_FLOOD`

## Wave 480

Wave 480 additions: dialogue filler run (≥3 consecutive dialogue speeches each opening with a verbal hedge like "Well," or "Look," — filler bunched into an unbroken sequence rather than scattered; run-based × dialogue × filler opener, consecutive-run variant of DIALOGUE_FILLER_OPENER which counts total not runs), action average line brevity (≥8 action lines averaging ≤4 words each — the prose layer is collectively telegraphic shorthand with no image construction; average/aggregate × action prose × word length, first average/aggregate check in originality.ts), action peak paragraph (≥4 action paragraphs, peak ≥5× average and ≥40 words — one sprawling over-written set piece surrounded by sparse prose; single-peak isolation × action prose × paragraph length, first single-peak isolation check in originality.ts).

Rules named in this wave's header:

- `DIALOGUE_FILLER_OPENER`

## Wave 452

Wave 452 additions: dialogue ellipsis flood (>20% of dialogue lines end with "..." — characters trail off instead of completing thoughts; underweight/bloat × dialogue × trailing-off punctuation, distinct from ELLIPSIS_ACTION_OVERUSE which audits action), slug time monotone (>80% of time-tagged sluglines use the same time-of-day label — story plays out in one lighting condition; underweight/bloat × slugline × time-of-day), dialogue filler opener (≥4 speeches begin with "Well,", "Look,", "Listen,", "Actually," etc. — verbal hedges that delay the first direct word; count threshold × dialogue × opening word, first check targeting the opening word of each character speech).

Rules named in this wave's header:

- `ELLIPSIS_ACTION_OVERUSE`

## Wave 438

Wave 438 additions: passive verb dominance (>25% of action lines use passive construction like "is seen"/"are found"/"can be heard" — passive voice removes agency from the visual description and distances the reader; underweight/bloat × action prose × verb form, distinct from COPULA_ACTION_DOMINANCE which targets linking-verb state predicates, not passive voice), dialogue monologue drought (<5% of dialogue lines are >15 words while ≥12 dialogue lines exist — no extended speeches or full arguments, the register is uniformly telegraphic; underweight/bloat × dialogue × length distribution, distinct from DIALOGUE_SHORT_LINE_DOMINANCE which measures what percent are ≤4 words, not whether any are long), action question intrusion (≥3 action lines contain a question mark — the writer inserts authorial questions into stage directions instead of presenting images; count threshold × action layer × discourse mode, distinct from DIALOGUE_QUESTION_DROUGHT which audits the dialogue layer).

Rules named in this wave's header:

- `COPULA_ACTION_DOMINANCE`
- `DIALOGUE_QUESTION_DROUGHT`
- `DIALOGUE_SHORT_LINE_DOMINANCE`

## Wave 410

Wave 410 additions: slow-motion crutch (≥2 "SLOW MOTION"/"SLO-MO" markers — gravity outsourced to a speed effect the staging should earn), freeze-frame crutch (≥2 "FREEZE FRAME"/"FREEZE ON" markers — a held image leaned on for emphasis), sound-cue crutch (≥3 hard-coded "SFX:"/"SOUND:" labels — the writer scoring the sound design instead of letting the prose imply it). Each is a distinct device crutch not covered by SMASH_CUT_OVERUSE (hard/jump/match cuts), DIRECTORIAL_INTRUSION (camera/lens calls, "WE HEAR"), or the card crutches (on-screen text/time captions).

Rules named in this wave's header:

- `DIRECTORIAL_INTRUSION`
- `SMASH_CUT_OVERUSE`

## Unattributed (no explicit wave-header mention)

These rule constants exist in this pass but were not found, by exact-name match, inside any "Wave N —" / "Wave N additions:" header entry in the file — typically because they predate that convention hardening, or the header describes the check descriptively rather than by constant name (e.g. "talking heads" rather than `TALKING_HEADS`). Listed here honestly rather than guessed into a wave, with the nearest preceding in-code "── section title ──" comment as the best-available substitute context where one exists.

- `ACT3_ACTION_DROUGHT` — Wave 231: Purpose bookend repeat, I-dominance in dialogue, Act 3 action drought
- `ACTION_ADVERB_FLOOD` — Wave 424: INSERT_SHOT_CRUTCH, ELLIPSIS_ACTION_OVERUSE, ACTION_ADVERB_FLOOD
- `ACTION_AVERAGE_LINE_BREVITY` — Wave 480: DIALOGUE_FILLER_RUN, ACTION_AVERAGE_LINE_BREVITY, ACTION_PEAK_PARAGRAPH
- `ACTION_PEAK_PARAGRAPH` — Wave 480: DIALOGUE_FILLER_RUN, ACTION_AVERAGE_LINE_BREVITY, ACTION_PEAK_PARAGRAPH
- `ACTION_POLYSYNDETON_FLOOD` — Wave 550: PARENTHETICAL_FLOOD, DIALOGUE_LONG_SPEECH_FLOOD, ACTION_ADVERB_FLOOD
- `ACTION_PRESENT_CONTINUOUS_FLOOD` — Wave 578:
- `ACTION_QUESTION_INTRUSION` — Wave 438: PASSIVE_VERB_DOMINANCE, DIALOGUE_MONOLOGUE_DROUGHT, ACTION_QUESTION_INTRUSION
- `ADVERB_OVERSATURATION` — Wave 201: Simile overload, dialogue dominance, adverb oversaturation
- `ARC_TELEGRAPHED` — Wave 149: Arc predictability, intro clichés, sensory monotone
- `BACK_TO_SCENE_CRUTCH` — Wave 368: BACK_TO_SCENE_CRUTCH
- `BEAT_DIRECTION_OVERUSE` — Wave 340: BEAT_DIRECTION_OVERUSE
- `BODY_LANGUAGE_CLICHE_OVERUSE` — Wave 315: BODY_LANGUAGE_CLICHE_OVERUSE, SLUG_GENERIC_LOCATION, FLASHBACK_CRUTCH
- `CAPS_EMPHASIS_OVERUSE` — Wave 176: Conjunction openings, ellipsis overuse, caps emphasis
- `CHAPTER_LABEL_CRUTCH` — Wave 382: CHAPTER_LABEL_CRUTCH
- `CHARACTER_INTRO_CLICHE` — Wave 149: Arc predictability, intro clichés, sensory monotone
- `CLICHE_PHRASE` — Cliché phrases
- `COGNITION_IN_ACTION` — Wave 245: Gerund opener dominance, scene slug time monotone, cognition in action
- `DIALOGUE_BACKSTORY_OPENER_FLOOD` — Wave 578:
- `DIALOGUE_DOMINANCE` — Wave 201: Simile overload, dialogue dominance, adverb oversaturation
- `DIALOGUE_EM_DASH_INTERRUPTION_FLOOD` — Wave 550: PARENTHETICAL_FLOOD, DIALOGUE_LONG_SPEECH_FLOOD, ACTION_ADVERB_FLOOD
- `DIALOGUE_EXCLAMATION_RUN` — Wave 522 checks
- `DIALOGUE_LONG_SPEECH_FLOOD` — Wave 550: PARENTHETICAL_FLOOD, DIALOGUE_LONG_SPEECH_FLOOD, ACTION_ADVERB_FLOOD
- `DIALOGUE_MONOLOGUE_DROUGHT` — Wave 438: PASSIVE_VERB_DOMINANCE, DIALOGUE_MONOLOGUE_DROUGHT, ACTION_QUESTION_INTRUSION
- `DIALOGUE_NEGATIVE_IMPERATIVE_FLOOD` — Wave 522 checks
- `DISTINCTIVE_WORD_ECHO` — Wave 201: Simile overload, dialogue dominance, adverb oversaturation
- `DREAM_SEQUENCE_CRUTCH` — Wave 354: DREAM_SEQUENCE_CRUTCH
- `ELLIPSIS_RUN_ACTION` — Wave 466: ACTION_PRONOUN_OPENER_FLOOD, DIALOGUE_QUESTION_FLOOD, ELLIPSIS_RUN_ACTION
- `EMOTION_NAMING_IN_ACTION` — Emotion-naming in action lines (show-don't-tell)
- `EMOTIONAL_ARC_PLATEAU` — Wave 163: Act 3 purpose monotone, reaction shot overuse, emotional plateau
- `EXCLAMATION_IN_ACTION` — Wave 273: EXCLAMATION_IN_ACTION
- `FADE_TRANSITION_OVERUSE` — Wave 354: FADE_TRANSITION_OVERUSE
- `FILTERING_VERB_OVERUSE` — Wave 259: Copula action dominance, filtering-verb overuse, directorial intrusion
- `FLASHBACK_CRUTCH` — Wave 315: BODY_LANGUAGE_CLICHE_OVERUSE, SLUG_GENERIC_LOCATION, FLASHBACK_CRUTCH
- `FREEZE_FRAME_CRUTCH` — Wave 410: SLOW_MOTION_CRUTCH, FREEZE_FRAME_CRUTCH, SOUND_CUE_CRUTCH
- `GENERIC_DESCRIPTOR` — Generic patterns
- `GENRE_CLICHE` — Genre-specific forbidden clichés
- `INSERT_SHOT_CRUTCH` — Wave 424: INSERT_SHOT_CRUTCH, ELLIPSIS_ACTION_OVERUSE, ACTION_ADVERB_FLOOD
- `INTERCUT_OVERUSE` — Wave 354: INTERCUT_OVERUSE
- `INTERIOR_MONOLOGUE_LEAK` — Wave 176: Conjunction openings, ellipsis overuse, caps emphasis
- `JUST_A_DREAM_REVEAL` — Wave 301: JUST_A_DREAM_REVEAL
- `LOW_SCENE_VARIETY` — Scene purpose variety: fully uniform or critically low variety
- `MATCH_CUT_OVERUSE` — Wave 382: MATCH_CUT_OVERUSE
- `MIRROR_SELF_GAZE_CLICHE` — Wave 301: MIRROR_SELF_GAZE_CLICHE
- `MONTAGE_CRUTCH` — Wave 326: MONTAGE_CRUTCH
- `OFF_SCREEN_CUE_OVERUSE` — Wave 368: OFF_SCREEN_CUE_OVERUSE
- `OPENING_WAKE_UP_CLICHE` — Wave 287: OPENING_WAKE_UP_CLICHE
- `PARENTHETICAL_FLOOD` — Wave 273: PARENTHETICAL_FLOOD
- `PASSIVE_VOICE_OVERLOAD` — Wave 176: Conjunction openings, ellipsis overuse, caps emphasis
- `REACTION_SHOT_OVERUSE` — Wave 163: Act 3 purpose monotone, reaction shot overuse, emotional plateau
- `REPEATED_LOCATION_EXCESS` — Wave 176: Conjunction openings, ellipsis overuse, caps emphasis
- `SCENE_CLOSER_ELLIPSIS_FLOOD` — Wave 578:
- `SCENE_PURPOSE_MONOTONE_ACT3` — Wave 163: Act 3 purpose monotone, reaction shot overuse, emotional plateau
- `SENSORY_MONOTONE` — Wave 149: Arc predictability, intro clichés, sensory monotone
- `SIMILE_OVERLOAD` — Wave 201: Simile overload, dialogue dominance, adverb oversaturation
- `SLOW_MOTION_CRUTCH` — Wave 410: SLOW_MOTION_CRUTCH, FREEZE_FRAME_CRUTCH, SOUND_CUE_CRUTCH
- `SLUG_GENERIC_LOCATION` — Wave 315: BODY_LANGUAGE_CLICHE_OVERUSE, SLUG_GENERIC_LOCATION, FLASHBACK_CRUTCH
- `SLUG_INTERIOR_DOMINANCE` — Wave 287: SLUG_INTERIOR_DOMINANCE
- `SLUG_SAME_LOCATION_RUN` — Wave 578:
- `SOUND_CUE_CRUTCH` — Wave 410: SLOW_MOTION_CRUTCH, FREEZE_FRAME_CRUTCH, SOUND_CUE_CRUTCH
- `SPLIT_SCREEN_CRUTCH` — Wave 382: SPLIT_SCREEN_CRUTCH
- `TIME_CARD_CRUTCH` — Wave 326: TIME_CARD_CRUTCH
- `TITLE_CARD_CRUTCH` — Wave 326: TITLE_CARD_CRUTCH
- `VOICEOVER_CRUTCH` — Wave 340: VOICEOVER_CRUTCH
- `WEATHER_OPENER_CRUTCH` — Wave 301: WEATHER_OPENER_CRUTCH

