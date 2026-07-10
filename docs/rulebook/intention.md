# Pass: `intention`

Founding wave: 39. Total distinct rules: 227 (179 attributed to a specific wave, 48 unattributed — see docs/rulebook/README.md's methodology note).

## Wave 1179

Wave 1179 additions (distinct-mode pivot — see Waves 1176/1177/1178 in dialogue.ts/character-arc.ts/conflict.ts): reconnaissance found every one of the ten analytical modes represented somewhere in this file's checkAftermathVoid (42 uses), checkZoneCluster (22), checkZoneImbalance (23), checkDroughtRun (22), checkPeakUncaused (10 + 12 hand-rolled), and ~24 co-occurrence/ decoupling rules — but checkHalfLoaded (binary front/back-half distribution) had zero uses via the shared helper. The half-partition *concept* is not new to this file (AGENCY_FRONTLOADED, PROACTIVE_FRONTLOADED/BACKLOADED, SEED_FRONTLOADED/BACKLOADED, REVELATION_FRONTLOADED, PAYOFF_BACK_LOADED all hand-roll it), but none of those seven prior checks anchor on clockDelta, relationshipShifts, or dialogueHighlights — each of which already has zone-cluster/zone-imbalance/ drought-run/peak-uncaused coverage but no half-partition check. This wave fills that empty cell for three channels via the shared helper: INTENTION_CLOCK_DELTA_BACK_LOADED, INTENTION_RELATIONSHIP_FRONT_LOADED, and INTENTION_HIGHLIGHT_BACK_LOADED. Thresholds (minRecords 9, minCount 3) are matched to this file's own zone-cluster precedent for each channel (Waves 717, 745, 759); ratioThreshold 0.70 matches the file's existing half-partition family (PROACTIVE_*, PAYOFF_BACK_LOADED all use >70%). Discrimination-harness guard pass (D2-b): the harness in calibration/discrimination-pairs.ts + tests/core/discrimination.test.ts pairs well- and poorly-crafted scripts on one isolated craft axis each (same premise, same length) and asserts good.health > bad.health. Five rules in this file inverted that ordering — they fired MORE on the well-crafted half than the poorly-crafted half of a pair, because they are all "X is absent" checks whose only evidence channels are the loud, lexicon-triggered signals (explicit emotion words, ops-derived relationship shifts, suspense spikes) that quiet/subtextual/procedural writing deliberately avoids tripping. Fixed by widening each rule's evidence to existing-but-previously-unread channels (payoffSetupIds, revelation, curiosityDelta) or existing-but-too-narrow windows/gates (PASSIVE_ESCALATION's structure.reversalCount, which only counts suspense-drop reversals) rather than by loosening thresholds — see the guard comment at each of ZERO_ENTROPY_SCENE, ENTROPY_CLUSTER, PASSIVE_ESCALATION, GOAL_INVERSION_ABSENT, and AGENCY_WITHOUT_CONSEQUENCE.

Rules named in this wave's header:

- `AGENCY_FRONTLOADED`
- `AGENCY_WITHOUT_CONSEQUENCE`
- `ENTROPY_CLUSTER`
- `GOAL_INVERSION_ABSENT`
- `INTENTION_CLOCK_DELTA_BACK_LOADED`
- `INTENTION_HIGHLIGHT_BACK_LOADED`
- `INTENTION_RELATIONSHIP_FRONT_LOADED`
- `PASSIVE_ESCALATION`
- `PROACTIVE_FRONTLOADED`
- `ZERO_ENTROPY_SCENE`

## Wave 1165

Wave 1165 additions: after Wave 1151, revelation stood at two of six channels (curiosityDelta, emotionalShift). INTENTION_REVELATION_SUSPENSE_AFTERMATH_VOID, INTENTION_REVELATION_RELATIONAL_AFTERMATH_VOID, and INTENTION_REVELATION_STAGING_AFTERMATH_VOID give it its third, fourth, and fifth channels (suspenseDelta, relationshipShifts, visualBeats).

Rules named in this wave's header:

- `INTENTION_REVELATION_RELATIONAL_AFTERMATH_VOID`
- `INTENTION_REVELATION_STAGING_AFTERMATH_VOID`
- `INTENTION_REVELATION_SUSPENSE_AFTERMATH_VOID`

## Wave 1151

Wave 1151 additions: dramaticTurn stood at five of six channels after Wave 1137, missing only visualBeats. INTENTION_TURN_STAGING_AFTERMATH_VOID gives it its sixth and final channel, completing full six-channel saturation for every main tracked trigger in this pass (raise_stakes, clockRaised, seededClueIds, unresolvedClues-debt, payoffSetupIds, dramaticTurn). With those exhausted, this wave introduces revelation as a genuinely fresh checkAftermathVoid trigger — it has never anchored an isTrigger side of a check anywhere in this file. INTENTION_REVELATION_CURIOSITY_AFTERMATH_VOID pairs revelation with curiosityDelta; INTENTION_REVELATION_EMOTIONAL_AFTERMATH_VOID pairs it with emotionalShift.

Rules named in this wave's header:

- `INTENTION_REVELATION_CURIOSITY_AFTERMATH_VOID`
- `INTENTION_REVELATION_EMOTIONAL_AFTERMATH_VOID`
- `INTENTION_TURN_STAGING_AFTERMATH_VOID`

## Wave 1137

Wave 1137 additions: payoffSetupIds and dramaticTurn were each at four of six channels. INTENTION_PAYOFF_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID and INTENTION_PAYOFF_STAGING_AFTERMATH_VOID give payoffSetupIds its fifth and sixth channels (dialogueHighlights, visualBeats), completing full saturation for this trigger. INTENTION_TURN_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID gives dramaticTurn its fifth channel (dialogueHighlights).

Rules named in this wave's header:

- `INTENTION_PAYOFF_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID`
- `INTENTION_PAYOFF_STAGING_AFTERMATH_VOID`
- `INTENTION_TURN_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID`

## Wave 1123

Wave 1123 additions: payoffSetupIds was at three of six standard channels (curiosityDelta/ emotionalShift/relationshipShifts) and dramaticTurn at two (suspenseDelta/emotionalShift) — this wave advances both. INTENTION_PAYOFF_SUSPENSE_AFTERMATH_VOID gives payoffSetupIds its fourth channel (suspenseDelta); INTENTION_TURN_CURIOSITY_AFTERMATH_VOID and INTENTION_TURN_RELATIONAL_AFTERMATH_VOID give dramaticTurn its third and fourth channels (curiosityDelta, relationshipShifts).

Rules named in this wave's header:

- `INTENTION_PAYOFF_SUSPENSE_AFTERMATH_VOID`
- `INTENTION_TURN_CURIOSITY_AFTERMATH_VOID`
- `INTENTION_TURN_RELATIONAL_AFTERMATH_VOID`

## Wave 1109

Wave 1109 additions: this wave gives payoffSetupIds and dramaticTurn further channels — INTENTION_PAYOFF_EMOTIONAL_AFTERMATH_VOID and INTENTION_PAYOFF_RELATIONAL_AFTERMATH_VOID pair payoffSetupIds with emotionalShift and relationshipShifts respectively (second and third channels for this trigger), and INTENTION_TURN_EMOTIONAL_AFTERMATH_VOID pairs dramaticTurn with emotionalShift (second channel for this trigger).

Rules named in this wave's header:

- `INTENTION_PAYOFF_EMOTIONAL_AFTERMATH_VOID`
- `INTENTION_PAYOFF_RELATIONAL_AFTERMATH_VOID`
- `INTENTION_TURN_EMOTIONAL_AFTERMATH_VOID`

## Wave 1095

Wave 1095 additions: INTENTION_OPEN_THREAD_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID gives heavy unresolvedClues debt its sixth and final standard channel (previously paired with payoffSetupIds/curiosityDelta/emotionalShift/suspenseDelta/relationshipShifts/visualBeats, now also paired with dialogueHighlights), completing full six-channel saturation for all four of this pass's main triggers (raise_stakes, seededClueIds, clockRaised, unresolvedClues-debt). With those exhausted, this wave introduces two triggers as fresh checkAftermathVoid subjects for the first time in this pass: INTENTION_PAYOFF_CURIOSITY_AFTERMATH_VOID pairs payoffSetupIds with curiosityDelta (payoffSetupIds has only ever anchored zone-cluster/ drought-run/peak-uncaused/zone-imbalance checks here), and INTENTION_TURN_SUSPENSE_AFTERMATH_VOID pairs dramaticTurn with suspenseDelta (dramaticTurn has only ever anchored zone-cluster/zone-imbalance/drought-run checks here).

Rules named in this wave's header:

- `INTENTION_OPEN_THREAD_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID`
- `INTENTION_PAYOFF_CURIOSITY_AFTERMATH_VOID`
- `INTENTION_TURN_SUSPENSE_AFTERMATH_VOID`

## Wave 1081

Wave 1081 additions: raise_stakes reaches full six-channel saturation — INTENTION_STAKES_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID (previously paired with curiosityDelta/suspenseDelta/ relationshipShifts/emotionalShift/visualBeats, now also paired with dialogueHighlights — its only remaining standard channel). Heavy unresolvedClues debt gets two fresh channels this wave: INTENTION_OPEN_THREAD_RELATIONAL_AFTERMATH_VOID (previously paired with payoffSetupIds/ curiosityDelta/emotionalShift/suspenseDelta, now also paired with relationshipShifts) and INTENTION_OPEN_THREAD_STAGING_AFTERMATH_VOID (now also paired with visualBeats).

Rules named in this wave's header:

- `INTENTION_OPEN_THREAD_RELATIONAL_AFTERMATH_VOID`
- `INTENTION_OPEN_THREAD_STAGING_AFTERMATH_VOID`
- `INTENTION_STAKES_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID`

## Wave 1067

Wave 1067 additions: seededClueIds and clockRaised each reach full six-channel saturation: INTENTION_SEED_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID (seededClueIds, previously paired with visualBeats/curiosityDelta/emotionalShift/suspenseDelta/relationshipShifts, now also paired with dialogueHighlights — its only remaining standard channel) and INTENTION_CLOCK_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID (clockRaised, previously paired with visualBeats/emotionalShift/ curiosityDelta/suspenseDelta/relationshipShifts, now also paired with dialogueHighlights — its only remaining standard channel). INTENTION_STAKES_STAGING_AFTERMATH_VOID gives raise_stakes a fifth channel (previously paired with curiosityDelta/suspenseDelta/relationshipShifts/ emotionalShift, now also paired with visualBeats).

Rules named in this wave's header:

- `INTENTION_CLOCK_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID`
- `INTENTION_SEED_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID`
- `INTENTION_STAKES_STAGING_AFTERMATH_VOID`

## Wave 1053

Wave 1053 additions: INTENTION_OPEN_THREAD_SUSPENSE_AFTERMATH_VOID gives the heavy-unresolvedClues-debt trigger a fourth channel (previously paired with payoffSetupIds/ curiosityDelta/emotionalShift, now paired with suspenseDelta), and INTENTION_SEED_RELATIONAL_AFTERMATH_VOID / INTENTION_CLOCK_RELATIONAL_AFTERMATH_VOID extend seededClueIds and clockRaised (both already at four channels) to a fifth with relationshipShifts.

Rules named in this wave's header:

- `INTENTION_CLOCK_RELATIONAL_AFTERMATH_VOID`
- `INTENTION_OPEN_THREAD_SUSPENSE_AFTERMATH_VOID`
- `INTENTION_SEED_RELATIONAL_AFTERMATH_VOID`

## Wave 1039

Wave 1039 additions: with raise_stakes now at four channels, this wave targets the less-saturated triggers instead: INTENTION_OPEN_THREAD_EMOTIONAL_AFTERMATH_VOID (heavy unresolvedClues debt, previously paired with payoffSetupIds/curiosityDelta, now a third channel with emotionalShift), INTENTION_SEED_SUSPENSE_AFTERMATH_VOID (seededClueIds, previously paired with visualBeats/curiosityDelta/emotionalShift, now a fourth channel with suspenseDelta), and INTENTION_CLOCK_SUSPENSE_AFTERMATH_VOID (clockRaised, previously paired with visualBeats/ emotionalShift/curiosityDelta, now a fourth channel with suspenseDelta).

Rules named in this wave's header:

- `INTENTION_CLOCK_SUSPENSE_AFTERMATH_VOID`
- `INTENTION_OPEN_THREAD_EMOTIONAL_AFTERMATH_VOID`
- `INTENTION_SEED_SUSPENSE_AFTERMATH_VOID`

## Wave 1025

Wave 1025 additions: three more fresh channels for existing triggers: INTENTION_STAKES_EMOTIONAL_AFTERMATH_VOID (raise_stakes, previously paired with curiosityDelta/suspenseDelta/ relationshipShifts, now a fourth channel with emotionalShift), INTENTION_CLOCK_CURIOSITY_AFTERMATH_VOID (clockRaised, previously paired with visualBeats/emotionalShift, now a third channel with curiosityDelta), and INTENTION_SEED_EMOTIONAL_AFTERMATH_VOID (seededClueIds, previously paired with visualBeats/curiosityDelta, now a third channel with emotionalShift).

Rules named in this wave's header:

- `INTENTION_CLOCK_CURIOSITY_AFTERMATH_VOID`
- `INTENTION_SEED_EMOTIONAL_AFTERMATH_VOID`
- `INTENTION_STAKES_EMOTIONAL_AFTERMATH_VOID`

## Wave 1011

Wave 1011 additions: this wave gives three more triggers a fresh consequence channel: INTENTION_OPEN_THREAD_CURIOSITY_AFTERMATH_VOID (heavy unresolvedClues debt, previously only paired with payoffSetupIds, now paired with curiosityDelta), INTENTION_CLOCK_EMOTIONAL_AFTERMATH_VOID (clockRaised, previously only paired with visualBeats, now paired with emotionalShift), and INTENTION_STAKES_RELATIONAL_AFTERMATH_VOID (raise_stakes, previously paired with curiosityDelta and suspenseDelta, now paired with relationshipShifts for a third channel).

Rules named in this wave's header:

- `INTENTION_CLOCK_EMOTIONAL_AFTERMATH_VOID`
- `INTENTION_OPEN_THREAD_CURIOSITY_AFTERMATH_VOID`
- `INTENTION_STAKES_RELATIONAL_AFTERMATH_VOID`

## Wave 997

Wave 997 additions: REVELATION_ZONE_IMBALANCE (revelation string field != null) — a clean trio-complete signal this pass's existing unprefixed REVELATION_ZONE_CLUSTER/REVELATION_DROUGHT_RUN pair had never been extended to (INTENTION_STAGING was checked and excluded: its cluster/drought predicates disagree, >=2 vs >0 visualBeats). With zone-imbalance now down to that single signal, this wave completes the trio with two more aftermath-void pairings, each reusing an already-paired trigger with a fresh channel: INTENTION_STAKES_SUSPENSE_AFTERMATH_VOID (raise_stakes, previously only paired with curiosityDelta in Wave 983, now paired with suspenseDelta) and INTENTION_SEED_CURIOSITY_AFTERMATH_VOID (seededClueIds, previously only paired with visualBeats, now paired with curiosityDelta).

Rules named in this wave's header:

- `INTENTION_SEED_CURIOSITY_AFTERMATH_VOID`
- `INTENTION_STAKES_SUSPENSE_AFTERMATH_VOID`
- `REVELATION_ZONE_IMBALANCE`

## Wave 983

Wave 983 additions: auditing the last two clean zone-imbalance candidates in this pass — INTENTION_CLOCK_ZONE_IMBALANCE (clockRaised boolean) and INTENTION_HIGHLIGHT_ZONE_IMBALANCE (dialogueHighlights array) — plus, since zone-imbalance is now down to those two, one aftermath-void pairing via checkAftermathVoid: INTENTION_STAKES_CURIOSITY_AFTERMATH_VOID (raise_stakes → curiosity), the first use of raise_stakes as an aftermath-void TRIGGER in this pass.

Rules named in this wave's header:

- `INTENTION_CLOCK_ZONE_IMBALANCE`
- `INTENTION_HIGHLIGHT_ZONE_IMBALANCE`
- `INTENTION_STAKES_CURIOSITY_AFTERMATH_VOID`

## Wave 969

Wave 969 additions: auditing the three remaining trio-complete signals in this pass, spanning three distinct classes: INTENTION_RELATIONSHIP_ZONE_IMBALANCE (relationshipShifts array, distinct from the payoff/seed arrays audited in Waves 941/955), INTENTION_TURN_ZONE_IMBALANCE (dramaticTurn !== 'nothing' categorical), and INTENTION_CLOCK_DELTA_ZONE_IMBALANCE (clockDelta !== 0 — a delta distinct from the suspense/curiosity ones audited in Waves 941/955).

Rules named in this wave's header:

- `INTENTION_CLOCK_DELTA_ZONE_IMBALANCE`
- `INTENTION_RELATIONSHIP_ZONE_IMBALANCE`
- `INTENTION_TURN_ZONE_IMBALANCE`

## Wave 955

Wave 955 additions: completing the non-purpose 4-zone rollout with the complementary signal in each of Wave 941's three classes: INTENTION_NEGATIVE_EMOTION_ZONE_IMBALANCE (emotionalShift === 'negative', the negative-valence mirror of 941's positive one), INTENTION_CURIOSITY_ZONE_IMBALANCE (curiosityDelta > 0 — the question-raising delta beside 941's suspense one), and INTENTION_SEED_ZONE_IMBALANCE (seededClueIds.length > 0 — the seed array beside 941's payoff one).

Rules named in this wave's header:

- `INTENTION_CURIOSITY_ZONE_IMBALANCE`
- `INTENTION_NEGATIVE_EMOTION_ZONE_IMBALANCE`
- `INTENTION_SEED_ZONE_IMBALANCE`

## Wave 941

Wave 941 additions: extending the checkZoneImbalance rollout beyond purpose values to three non-purpose signals whose 3-zone/run trios were long complete but had never been 4-zone-audited: INTENTION_POSITIVE_EMOTION_ZONE_IMBALANCE (emotionalShift === 'positive' — emotional valence), INTENTION_SUSPENSE_ZONE_IMBALANCE (suspenseDelta > 0 — tension-delta magnitude), and INTENTION_PAYOFF_ZONE_IMBALANCE (payoffSetupIds.length > 0 — setup-payoff array field). Three distinct signal classes (valence, delta, array), each keyed independently of authored purpose.

Rules named in this wave's header:

- `INTENTION_PAYOFF_ZONE_IMBALANCE`
- `INTENTION_POSITIVE_EMOTION_ZONE_IMBALANCE`
- `INTENTION_SUSPENSE_ZONE_IMBALANCE`
- `PAYOFF_ZONE_IMBALANCE`

## Wave 927

Wave 927 additions: continuing the checkZoneImbalance rollout begun in Wave 885, this wave applies the 4-zone bloat+empty-zone mode to the three remaining purpose values with complete 3-zone/run-based trios that had never been audited by it: INTENTION_CHARACTER_MOMENT_ZONE_IMBALANCE (purpose === 'character_moment'), INTENTION_STAKES_ZONE_IMBALANCE (purpose === 'raise_stakes'), and INTENTION_REVELATION_PURPOSE_ZONE_IMBALANCE (purpose === 'revelation', whose trio was completed in Wave 899).

Rules named in this wave's header:

- `INTENTION_CHARACTER_MOMENT_ZONE_IMBALANCE`
- `INTENTION_REVELATION_PURPOSE_ZONE_IMBALANCE`
- `INTENTION_STAKES_ZONE_IMBALANCE`

## Wave 913

Wave 913 additions: continuing the checkZoneImbalance rollout begun in Wave 885, this wave applies the 4-zone bloat+empty-zone mode to three more purpose values that each already have a complete 3-zone/run-based trio (checkZoneCluster + checkDroughtRun) but have never been audited by it: INTENTION_RESOLUTION_ZONE_IMBALANCE (purpose === 'resolution'), INTENTION_TURNING_POINT_ZONE_IMBALANCE (purpose === 'turning_point'), and INTENTION_INTRODUCE_CONFLICT_ZONE_IMBALANCE (purpose === 'introduce_conflict').

Rules named in this wave's header:

- `INTENTION_INTRODUCE_CONFLICT_ZONE_IMBALANCE`
- `INTENTION_RESOLUTION_ZONE_IMBALANCE`
- `INTENTION_TURNING_POINT_ZONE_IMBALANCE`

## Wave 899

Wave 899 additions: purpose === 'revelation' has never been isolated as its own standalone signal in this pass (only referenced inside the dramaticPurposes composite set and an explanatory comment) -- a genuinely virgin field. This wave adds INTENTION_REVELATION_PURPOSE_ZONE_CLUSTER and INTENTION_REVELATION_PURPOSE_DROUGHT_RUN (peak mode conventionally skipped for this categorical field), plus INTENTION_COMPLICATE_ZONE_IMBALANCE, continuing the checkZoneImbalance rollout begun in Wave 885: purpose === 'complicate' already has a complete 3-zone/run-based trio but has never been audited by the 4-zone bloat+empty-zone mode.

Rules named in this wave's header:

- `INTENTION_COMPLICATE_ZONE_IMBALANCE`
- `INTENTION_REVELATION_PURPOSE_DROUGHT_RUN`
- `INTENTION_REVELATION_PURPOSE_ZONE_CLUSTER`

## Wave 885

Wave 885 additions: INTENTION_COMPLICATE_DROUGHT_RUN (run-based x purpose === 'complicate' absence -- completes 2 of 3 slots for this purpose value alongside the zone-cluster mode added in Wave 871; peak mode conventionally skipped for this categorical field). Also, no purpose value had ever been audited by the distinct 4-zone checkZoneImbalance mode in this pass (only visualBeats and unresolvedClues had); this wave applies it to two purpose values with complete 3-zone/run-based trios: INTENTION_CLIMAX_ZONE_IMBALANCE (purpose === 'climax') and INTENTION_ESTABLISH_WORLD_ZONE_IMBALANCE (purpose === 'establish_world').

Rules named in this wave's header:

- `INTENTION_CLIMAX_ZONE_IMBALANCE`
- `INTENTION_COMPLICATE_DROUGHT_RUN`
- `INTENTION_ESTABLISH_WORLD_ZONE_IMBALANCE`

## Wave 871

Wave 871 additions: INTENTION_CLIMAX_DROUGHT_RUN (run-based x purpose === 'climax' absence -- completes 2 of 3 slots for this purpose value alongside the zone-cluster mode added in Wave 857; peak mode conventionally skipped for this categorical field), INTENTION_RESOLUTION_DROUGHT_RUN (run-based x purpose === 'resolution' absence -- completes 2 of 3 slots for this purpose value alongside the zone-cluster mode added in Wave 857; peak mode conventionally skipped for this categorical field), INTENTION_COMPLICATE_ZONE_CLUSTER (distribution/timing x purpose === 'complicate' x structural thirds -- this purpose value has only ever appeared inside an explanatory comment listing "dramatic purposes expected to recur"; none of the three shared-library trio modes has ever isolated it as its own standalone signal).

Rules named in this wave's header:

- `INTENTION_CLIMAX_DROUGHT_RUN`
- `INTENTION_COMPLICATE_ZONE_CLUSTER`
- `INTENTION_RESOLUTION_DROUGHT_RUN`

## Wave 857

Wave 857 additions: INTENTION_ESTABLISH_WORLD_DROUGHT_RUN (run-based × purpose === 'establish_world' absence — completes 2 of 3 slots for this purpose value alongside the zone-cluster mode added in Wave 843; peak mode conventionally skipped for this categorical field), INTENTION_CLIMAX_ZONE_CLUSTER (distribution/timing × purpose === 'climax' × structural thirds — this purpose value has only ever appeared inside the dramaticPurposes composite set [union with 'turning_point', 'revelation', 'raise_stakes']; a virgin standalone signal), INTENTION_RESOLUTION_ZONE_CLUSTER (distribution/timing × purpose === 'resolution' × structural thirds — this purpose value has only ever appeared inside a separate composite low-momentum purposes set; likewise a virgin standalone signal).

Rules named in this wave's header:

- `INTENTION_CLIMAX_ZONE_CLUSTER`
- `INTENTION_ESTABLISH_WORLD_DROUGHT_RUN`
- `INTENTION_RESOLUTION_ZONE_CLUSTER`

## Wave 843

Wave 843 additions: INTENTION_INTRODUCE_CONFLICT_DROUGHT_RUN (run-based × purpose === 'introduce_conflict' absence — completes 2 of 3 slots for this purpose value alongside the zone-cluster mode added in Wave 829; peak mode conventionally skipped for this categorical field), INTENTION_NEGATIVE_EMOTION_DROUGHT_RUN (run-based × emotionalShift === 'negative' absence — completes 2 of 3 slots for this valence alongside the zone-cluster mode added in Wave 829; peak mode conventionally skipped for this categorical field), INTENTION_ESTABLISH_WORLD_ZONE_CLUSTER (distribution/timing × purpose === 'establish_world' × structural thirds — this purpose value has only ever appeared inside a composite low-momentum purposes set; none of the three shared-library trio modes has ever isolated it as its own standalone signal).

Rules named in this wave's header:

- `INTENTION_ESTABLISH_WORLD_ZONE_CLUSTER`
- `INTENTION_INTRODUCE_CONFLICT_DROUGHT_RUN`
- `INTENTION_NEGATIVE_EMOTION_DROUGHT_RUN`

## Wave 829

Wave 829 additions: INTENTION_TURNING_POINT_DROUGHT_RUN (run-based × purpose === 'turning_point' absence — completes 2 of 3 slots for this purpose value alongside the zone-cluster mode added in Wave 815; peak mode conventionally skipped for this categorical field), INTENTION_INTRODUCE_CONFLICT_ZONE_CLUSTER (distribution/timing × purpose === 'introduce_conflict' × structural thirds — this purpose value has never been referenced anywhere in this pass; a virgin field), INTENTION_NEGATIVE_EMOTION_ZONE_CLUSTER (distribution/timing × emotionalShift === 'negative' × structural thirds — mirrors the completed positive-valence trio; the negative valence has never been isolated by any of the three shared-library trio modes in this pass).

Rules named in this wave's header:

- `INTENTION_INTRODUCE_CONFLICT_ZONE_CLUSTER`
- `INTENTION_NEGATIVE_EMOTION_ZONE_CLUSTER`
- `INTENTION_TURNING_POINT_DROUGHT_RUN`

## Wave 815

Wave 815 additions: INTENTION_CHARACTER_MOMENT_ZONE_CLUSTER (distribution/timing × purpose === 'character_moment' × structural thirds — this purpose value has only ever appeared inside a generic same-purpose-3+-in-a-row REPEATED_PURPOSE check that fires for ANY low-momentum purpose value, not specifically thirds-based concentration; none of the three shared-library trio modes has ever been applied to it), INTENTION_CHARACTER_MOMENT_DROUGHT_RUN (run-based × purpose === 'character_moment' absence — completing 2 of 3 slots for this purpose value alongside the zone-cluster mode added in this same wave; peak mode conventionally skipped for this categorical field), INTENTION_TURNING_POINT_ZONE_CLUSTER (distribution/timing × purpose === 'turning_point' × structural thirds — likewise only ever touched by the generic REPEATED_PURPOSE check [which does not even flag 'turning_point' as low-momentum]; none of the three shared-library trio modes has ever been applied to it).

Rules named in this wave's header:

- `INTENTION_CHARACTER_MOMENT_DROUGHT_RUN`
- `INTENTION_CHARACTER_MOMENT_ZONE_CLUSTER`
- `INTENTION_TURNING_POINT_ZONE_CLUSTER`
- `REPEATED_PURPOSE`

## Wave 801

Wave 801 additions: INTENTION_SUSPENSE_PEAK_UNCAUSED (backward-cause × suspenseDelta-as-magnitude × 2-scene lookback — completes the trio for suspenseDelta alongside the zone-cluster mode (Wave 773) and the run-based drought mode (Wave 787); the backward-cause peak mode has never been applied to it), INTENTION_CURIOSITY_PEAK_UNCAUSED (backward-cause × curiosityDelta-as-magnitude × 2-scene lookback — completes the trio for curiosityDelta alongside the run-based drought mode (Wave 773) and the zone-cluster mode (Wave 787); the backward-cause peak mode has never been applied to it), INTENTION_POSITIVE_EMOTION_DROUGHT_RUN (run-based × emotionalShift === 'positive' absence — completes 2 of 3 slots for this valence alongside the zone-cluster mode added at Wave 675; peak mode conventionally skipped for this categorical field). Reconnaissance for this wave also confirmed that REVELATION_DROUGHT_RUN (Wave 563, hand-rolled) and REVELATION_ZONE_CLUSTER (Wave 563, hand-rolled) already complete the drought/cluster half of the revelation trio alongside the shared-lib INTENTION_REVELATION_PEAK_UNCAUSED (Wave 759), so revelation was correctly skipped as a non-distinct candidate.

Rules named in this wave's header:

- `INTENTION_CURIOSITY_PEAK_UNCAUSED`
- `INTENTION_POSITIVE_EMOTION_DROUGHT_RUN`
- `INTENTION_SUSPENSE_PEAK_UNCAUSED`

## Wave 787

Wave 787 additions: INTENTION_SUSPENSE_DROUGHT_RUN (run-based × suspenseDelta>0 absence — Wave 773 applied the zone-cluster mode to suspenseDelta; the run-based drought mode has never been applied to it, completing 2 of 3 slots), INTENTION_CURIOSITY_ZONE_CLUSTER (distribution/timing × curiosityDelta>0 presence × structural thirds — Wave 773 applied the run-based drought mode to curiosityDelta; the zone-cluster mode has never been applied to it, completing 2 of 3 slots), INTENTION_TURN_ZONE_CLUSTER (distribution/timing × dramaticTurn !== 'nothing' presence × structural thirds — Wave 773 applied the run-based drought mode to dramaticTurn; the zone-cluster mode has never been applied to it, completing 2 of 3 slots).

Rules named in this wave's header:

- `INTENTION_CURIOSITY_ZONE_CLUSTER`
- `INTENTION_SUSPENSE_DROUGHT_RUN`
- `INTENTION_TURN_ZONE_CLUSTER`

## Wave 773

Wave 773 additions: INTENTION_SUSPENSE_ZONE_CLUSTER (distribution/timing × suspenseDelta>0 presence × structural thirds — existing suspense checks in this pass are all co-occurrence-at-peak or co-occurrence-decoupling against proactivity [PROACTIVE_SUSPENSE_DECOUPLED, PROACTIVE_SUSPENSE_PEAK_DECOUPLED, PROACTIVE_SUSPENSE_AFTERMATH_ABSENT]; none of the three shared-library trio modes has ever been applied to suspenseDelta as a primary signal), INTENTION_CURIOSITY_DROUGHT_RUN (run-based × curiosityDelta>0 absence — existing curiosity checks are likewise all co-occurrence against proactivity [PROACTIVE_CURIOSITY_DECOUPLED, PROACTIVE_CURIOSITY_PEAK_DECOUPLED, CURIOSITY_WITHOUT_AGENCY]; none of the three shared-library trio modes has ever been applied to curiosityDelta), INTENTION_TURN_DROUGHT_RUN (run-based × dramaticTurn !== 'nothing' absence — the existing TURNS_UNDRIVEN audits co-occurrence with proactivity, not run-length absence; none of the three shared-library trio modes has ever been applied to dramaticTurn as a primary signal).

Rules named in this wave's header:

- `CURIOSITY_WITHOUT_AGENCY`
- `INTENTION_CURIOSITY_DROUGHT_RUN`
- `INTENTION_SUSPENSE_ZONE_CLUSTER`
- `INTENTION_TURN_DROUGHT_RUN`
- `PROACTIVE_CURIOSITY_DECOUPLED`
- `PROACTIVE_CURIOSITY_PEAK_DECOUPLED`
- `PROACTIVE_SUSPENSE_DECOUPLED`
- `TURNS_UNDRIVEN`

## Wave 759

Wave 759 additions: INTENTION_CLOCK_DELTA_ZONE_CLUSTER (distribution/timing × clockDelta≠0 presence × structural thirds — Waves 675/745 applied the backward-cause peak and run-based drought modes to clockDelta; the zone-cluster mode has never been applied to it, completing the trio), INTENTION_REVELATION_PEAK_UNCAUSED (single-peak isolation/backward-cause × revelation magnitude — REVELATION_DROUGHT_RUN and REVELATION_ZONE_CLUSTER applied the run-based drought and zone-cluster modes to revelation != null; the backward-cause peak mode has never been applied to it, completing the trio — this check's hasCause deliberately references only dramaticTurn, not revelation itself, to avoid a circular audit of the revelation channel), INTENTION_STAKES_ZONE_CLUSTER (distribution/timing × purpose === 'raise_stakes' × structural thirds — INTENTION_STAKES_DROUGHT_RUN applied the run-based drought mode to this signal; the zone-cluster mode has never been applied to it).

Rules named in this wave's header:

- `INTENTION_CLOCK_DELTA_ZONE_CLUSTER`
- `INTENTION_REVELATION_PEAK_UNCAUSED`
- `INTENTION_STAKES_ZONE_CLUSTER`

## Wave 745

Wave 745 additions: INTENTION_RELATIONSHIP_ZONE_CLUSTER (distribution/timing × relationshipShifts × structural thirds — Waves 661/731 applied the backward-cause peak and run-based drought modes to relationshipShifts; the zone-cluster mode has never been applied to it, completing the trio), INTENTION_SEED_DROUGHT_RUN (run-based × seededClueIds absence — Waves 689/731 applied the backward-cause peak and zone-cluster modes to seededClueIds; the drought-run mode has never been applied to it, completing the trio), INTENTION_CLOCK_DELTA_DROUGHT_RUN (run-based × clockDelta≠0 absence — Wave 675 applied the backward-cause peak mode to clockDelta; the drought-run mode has never been applied to it).

Rules named in this wave's header:

- `INTENTION_CLOCK_DELTA_DROUGHT_RUN`
- `INTENTION_RELATIONSHIP_ZONE_CLUSTER`
- `INTENTION_SEED_DROUGHT_RUN`

## Wave 731

Wave 731 additions: INTENTION_STAGING_ZONE_CLUSTER (distribution/timing × visualBeats × structural thirds — Waves 619/689 applied the backward-cause peak and run-based drought modes to visualBeats; the zone-cluster mode has never been applied to it, completing the trio), INTENTION_SEED_ZONE_CLUSTER (distribution/timing × seededClueIds × structural thirds — Wave 689 applied the backward-cause peak mode to seededClueIds; the zone-cluster mode has never been applied to it), INTENTION_RELATIONSHIP_DROUGHT_RUN (run-based × relationshipShifts absence — Wave 661 applied the backward-cause peak mode to relationshipShifts; the drought-run mode has never been applied to it).

Rules named in this wave's header:

- `INTENTION_RELATIONSHIP_DROUGHT_RUN`
- `INTENTION_SEED_ZONE_CLUSTER`
- `INTENTION_STAGING_ZONE_CLUSTER`

## Wave 717

Wave 717 additions (built on the shared checks library): INTENTION_HIGHLIGHT_ZONE_CLUSTER (distribution/timing × dialogueHighlights × structural thirds — Waves 647/703 applied the drought-run and backward-cause peak modes to dialogueHighlights; the zone-cluster mode has never been applied to it, completing the trio), INTENTION_OPEN_THREAD_PEAK_UNCAUSED (single-peak isolation/backward-cause × unresolvedClues magnitude — Waves 647/703 applied the zone-cluster and drought-run modes to unresolvedClues; the backward-cause peak mode has never been applied to it, completing the trio), INTENTION_PAYOFF_DROUGHT_RUN (run-based × payoffSetupIds absence — Waves 661/703 applied the zone-cluster and backward-cause peak modes to payoffSetupIds; the drought-run mode has never been applied to it, completing the trio).

Rules named in this wave's header:

- `INTENTION_HIGHLIGHT_ZONE_CLUSTER`
- `INTENTION_OPEN_THREAD_PEAK_UNCAUSED`
- `INTENTION_PAYOFF_DROUGHT_RUN`

## Wave 703

Wave 703 additions (built on the shared checks library): INTENTION_HIGHLIGHT_PEAK_UNCAUSED (single-peak isolation/backward-cause × dialogueHighlights magnitude — Wave 647 applied the drought-run mode to dialogueHighlights; the backward-cause peak mode has never been applied to this channel), INTENTION_PAYOFF_PEAK_UNCAUSED (single-peak isolation/backward-cause × payoffSetupIds magnitude — Wave 661 applied the zone-cluster mode to payoffSetupIds; the backward-cause peak mode has never been applied to this channel), INTENTION_OPEN_THREAD_DROUGHT_RUN (run-based × unresolvedClues absence — Wave 647 applied the zone-cluster mode to unresolvedClues; the drought-run mode has never been applied to this channel).

Rules named in this wave's header:

- `INTENTION_HIGHLIGHT_PEAK_UNCAUSED`
- `INTENTION_OPEN_THREAD_DROUGHT_RUN`
- `INTENTION_PAYOFF_PEAK_UNCAUSED`

## Wave 689

Wave 689 additions (built on the shared checks library): INTENTION_SEED_PEAK_UNCAUSED (single-peak isolation/backward-cause × seededClueIds magnitude — seededClueIds is this pass's most heavily used field [36 accesses] but has only ever anchored hand-rolled aggregate and co-occurrence logic, never the shared-library backward-cause peak mode), INTENTION_STAGING_DROUGHT_RUN (run-based × visualBeats absence — visualBeats has only anchored a single co-occurrence/decoupling check [Wave 647] against curiosityDelta; never drought-audited), INTENTION_CLOCK_ZONE_CLUSTER (distribution/timing × clockRaised × structural thirds — Wave 661 applied the drought-run mode to clockRaised; the zone-cluster mode has never been applied to this channel).

Rules named in this wave's header:

- `INTENTION_CLOCK_ZONE_CLUSTER`
- `INTENTION_SEED_PEAK_UNCAUSED`
- `INTENTION_STAGING_DROUGHT_RUN`

## Wave 675

Wave 675 additions (built on the shared checks library, audit M2.2): INTENTION_CLOCK_DELTA_PEAK_UNCAUSED (single-peak isolation/backward-cause × clockDelta magnitude — clockDelta has only ever appeared inside incidental threshold comparisons [clockDelta > 1, clockDelta <= 0] in this pass, never as the standalone subject of a backward-cause peak check), INTENTION_STAKES_DROUGHT_RUN (run-based × purpose === 'raise_stakes' absence — `purpose` has only been used as an incidental filter [STAKES_RAISED_EXTERNALLY] or fallback default here, never drought-audited as its own signal), INTENTION_POSITIVE_EMOTION_ZONE_CLUSTER (distribution/timing × emotionalShift === 'positive' × structural thirds — emotionalShift anchors several hand-rolled decoupled checks [PROACTIVE_EMOTION_DECOUPLED, PAYOFF_EMOTION_DECOUPLED, REVELATION_EMOTION_DECOUPLED] but has never been cluster-audited).

Rules named in this wave's header:

- `INTENTION_CLOCK_DELTA_PEAK_UNCAUSED`
- `INTENTION_POSITIVE_EMOTION_ZONE_CLUSTER`
- `INTENTION_STAKES_DROUGHT_RUN`
- `PROACTIVE_EMOTION_DECOUPLED`
- `STAKES_RAISED_EXTERNALLY`

## Wave 661

Wave 661 additions (built on the shared checks library, audit M2.2): INTENTION_RELATIONSHIP_PEAK_UNCAUSED (single-peak isolation/backward-cause × relationshipShifts magnitude — the scene with the most simultaneous bond changes has no dramatic turn or revelation in itself or the two scenes before it; distinct from PROACTIVE_RELATIONSHIP_PEAK_ABSENT [Wave 395], which anchors on the same peak scene but checks whether it is a PROACTIVE scene, not whether it is backward-caused), INTENTION_CLOCK_DROUGHT_RUN (run-based × clockRaised absence — this pass already hand-rolls drought-run logic for proactive-desert, seed-isolation, and revelation channels; clockRaised itself has never been drought-audited), INTENTION_PAYOFF_ZONE_CLUSTER (distribution/timing × payoffSetupIds × structural thirds — this pass already applies the zone-cluster template to revelation, seed, and open-thread; payoffSetupIds itself has never been cluster-audited despite anchoring two existing peak-decoupled checks).

Rules named in this wave's header:

- `INTENTION_CLOCK_DROUGHT_RUN`
- `INTENTION_PAYOFF_ZONE_CLUSTER`
- `INTENTION_RELATIONSHIP_PEAK_UNCAUSED`

## Wave 647

Wave 647 additions (built on the shared checks library, audit M2.2): INTENTION_HIGHLIGHT_DROUGHT_RUN (run-based × dialogueHighlights absence — first checkDroughtRun use in this 108-rule pass; a 6+ consecutive-scene stretch with no highlighted dialogue while such scenes occur ≥3 times elsewhere — distinct from this file's existing hand-rolled drought-run checks [REVELATION_DROUGHT_RUN], which track a different channel entirely), INTENTION_OPEN_THREAD_ZONE_CLUSTER (distribution/timing × unresolvedClues × structural thirds — first checkZoneCluster use via the shared library here; this pass already hand-rolls zone-cluster logic for revelation and seed [REVELATION_ZONE_CLUSTER, SEED_ZONE_CLUSTER], but never on the open-thread channel), INTENTION_STAGING_CURIOSITY_DECOUPLED (co-occurrence/decoupling × visualBeats × curiosityDelta>0 — zero overlap between visually-staged scenes and scenes where curiosity is actively rising; visualBeats had only ever been paired with payoffSetupIds, seededClueIds, dramaticTurn, revelation, and clockRaised in this file, never with the curiosity channel).

Rules named in this wave's header:

- `INTENTION_HIGHLIGHT_DROUGHT_RUN`
- `INTENTION_OPEN_THREAD_ZONE_CLUSTER`
- `INTENTION_STAGING_CURIOSITY_DECOUPLED`
- `REVELATION_DROUGHT_RUN`
- `REVELATION_ZONE_CLUSTER`
- `SEED_ZONE_CLUSTER`

## Wave 633

Wave 633 additions (built on the shared checks library, audit M2.2): INTENTION_HIGHLIGHT_OPEN_THREAD_DECOUPLED (co-occurrence/decoupling × dialogueHighlights × unresolvedClues — first pairing of these two fields in this 105-rule pass), INTENTION_CLOCK_STAGING_AFTERMATH_VOID (sequence/aftermath × clockRaised trigger → visualBeats absence — first pairing of these two fields), INTENTION_OPEN_THREAD_ZONE_IMBALANCE (underweight/bloat × unresolvedClues × four structural zones — Wave 605 applied this template to visualBeats only; unresolvedClues itself has never been zone-audited here).

Rules named in this wave's header:

- `INTENTION_CLOCK_STAGING_AFTERMATH_VOID`
- `INTENTION_HIGHLIGHT_OPEN_THREAD_DECOUPLED`
- `INTENTION_OPEN_THREAD_ZONE_IMBALANCE`

## Wave 619

Wave 619 additions (built on the shared checks library, audit M2.2): PAYOFF_PHYSICAL_STAGING_DECOUPLED (co-occurrence/decoupling × payoffSetupIds × visualBeats — visualBeats has never been paired with any other field in this 102-rule pass, only used standalone in Wave 605's zone check), SEED_STAGING_AFTERMATH_VOID (sequence/aftermath × seededClueIds trigger → visualBeats absence), PHYSICAL_STAGING_PEAK_UNCAUSED (backward-cause × visualBeats-density peak × revelation/dramaticTurn cause).

Rules named in this wave's header:

- `PAYOFF_PHYSICAL_STAGING_DECOUPLED`
- `PHYSICAL_STAGING_PEAK_UNCAUSED`
- `SEED_STAGING_AFTERMATH_VOID`

## Wave 605

Wave 605 additions (built on the shared checks library, audit M2.2): OPEN_THREAD_REVELATION_DECOUPLED (co-occurrence/decoupling × unresolvedClues × revelation — first use of unresolvedClues anywhere in this 99-rule pass, despite its central concern with seed/payoff debt), PHYSICAL_STAGING_ZONE_IMBALANCE (underweight/bloat × visualBeats × four structural zones — first use of visualBeats anywhere in this pass), OPEN_THREAD_PAYOFF_AFTERMATH_VOID (sequence/aftermath × heavy unresolvedClues debt → payoff absence).

Rules named in this wave's header:

- `OPEN_THREAD_PAYOFF_AFTERMATH_VOID`
- `OPEN_THREAD_REVELATION_DECOUPLED`
- `PHYSICAL_STAGING_ZONE_IMBALANCE`

## Wave 591

Wave 591 additions: payoff relationship decoupled (co-occurrence/decoupling × payoff × relationshipShifts — n≥8, ≥3 payoff scenes, ≥2 relational-shift scenes, zero overlap; thread resolutions never coincide with a relational shift; completes the payoff co-occurrence family — which already pairs payoff with dramatic turn, seed, clock, and emotionalShift — by adding the one signal it had never touched; distinct from PAYOFF_EMOTION_DECOUPLED [categorical emotionalShift, not relational structure] and from PROACTIVE_RELATIONSHIP_AFTERMATH_ABSENT [sequence/aftermath on the proactive channel, checks the 2 FOLLOWING scenes, not same-scene payoff co-occurrence]), revelation relationship decoupled (co-occurrence/decoupling × revelation × relationshipShifts — n≥8, ≥3 revelation scenes, ≥2 relational-shift scenes, zero overlap; disclosures never coincide with a relational shift — truths surface without moving any bond; distinct from REVELATION_EMOTION_DECOUPLED [emotionalShift not relationshipShifts] and REVELATION_CAUSE_VOID [backward-cause, what precedes a revelation, not what co-occurs with it]; first check pairing the revelation channel with relationshipShifts in this pass), payoff zone imbalance (underweight/bloat × payoff × four structural zones — n≥10, ≥4 payoff scenes; at least one zone has zero payoffs while another holds ≥50% of the total; resolutions simultaneously vanish from one structural quarter and bloat in another; mirrors PROACTIVE_ZONE_IMBALANCE [Wave 437: same 4-zone void+bloat co-presence test, but on the initiative channel] applied here to the payoff channel for the first time; distinct from PAYOFF_BACK_LOADED [binary half-partition ratio, not 4-zone void+bloat] and PAYOFF_FINAL_ZONE_VOID [single fixed zone absence, no bloat requirement]).

Rules named in this wave's header:

- `PAYOFF_BACK_LOADED`
- `PAYOFF_FINAL_ZONE_VOID`
- `PROACTIVE_RELATIONSHIP_AFTERMATH_ABSENT`
- `PROACTIVE_ZONE_IMBALANCE`
- `REVELATION_EMOTION_DECOUPLED`

## Wave 577

Wave 577 additions: seed zone cluster (distribution/timing × seed × structural thirds — n≥9, ≥3 seed scenes, >75% in one third; clue-planting ghettoized into one zone; finer-grained than SEED_FRONT_LOADED [binary half-partition]; distinct from SEED_MIDPOINT_VOID [zone-absence at midpoint not concentration in any third], SEED_PEAK_UNCAUSED [backward-cause × seed peak]), clock revelation aftermath void (sequence/aftermath × clock → revelation aftermath — n≥8, ≥2 qualifying clockRaised scenes [pos<n-1], ≥2 revelation scenes globally, every clock scene followed by 2 scenes with no revelation; deadline escalations never surface hidden truths in their wake; the clock-trigger complement of REVELATION_CLOCK_AFTERMATH_VOID [revelation trigger → clock aftermath; this reverses the causal direction]; distinct from PROACTIVE_CLOCK_AFTERMATH_ABSENT [different aftermath channel]), seed curiosity decoupled (co-occurrence/decoupling × seed × curiosity — n≥8, ≥2 seed scenes, ≥2 curiosity-positive scenes, zero overlap; every seed scene has curiosityDelta ≤ 0 while curiosity rises elsewhere; clue-planting never raises wonder in the same scene; first co-occurrence check pairing the seed channel with curiosityDelta in this pass, distinct from PAYOFF_EMOTION_DECOUPLED [payoff not seed channel] and REVELATION_CLOCK_AFTERMATH_VOID [aftermath mode not co-occurrence × same scene]).

Rules named in this wave's header:

- `REVELATION_CLOCK_AFTERMATH_VOID`

## Wave 563

Wave 563 additions: revelation drought run (run-based × revelation absence — n≥10, ≥2 revelation scenes, longest consecutive run of non-revelation scenes ≥6; the disclosure engine goes dark for an extended local stretch; the ABSENCE complement of REVELATION_RUN [presence run], distinct from REVELATION_FRONTLOADED [global half-skew] and REVELATION_CLOSING_VOID [fixed closing zone]), revelation zone cluster (distribution/timing × revelation × structural thirds — n≥9, ≥3 revelation scenes, >75% in a single third; disclosures ghettoized into one zone; finer-grained than the binary REVELATION_FRONTLOADED half-partition and can fire on a middle-third cluster it would miss, distinct from REVELATION_CLOSING_VOID [absence not over-concentration]), revelation clock aftermath void (sequence/aftermath × revelation → clock — n≥8, ≥2 revelation scenes [pos<n-1], ≥2 clock scenes globally, every revelation followed by 2 scenes with no clockRaised; disclosure never tightens the deadline in its wake; the revelation-trigger sibling of PROACTIVE_CLOCK_AFTERMATH_ABSENT, distinct from REVELATION_CAUSE_VOID [backward-cause, what precedes] and PAYOFF_CLOCK_DECOUPLED [same-scene]).

Rules named in this wave's header:

- `PAYOFF_CLOCK_DECOUPLED`
- `PROACTIVE_CLOCK_AFTERMATH_ABSENT`
- `REVELATION_CAUSE_VOID`
- `REVELATION_CLOSING_VOID`

## Wave 549

Wave 549 additions: revelation suspense flat (average/aggregate × revelation × suspenseDelta — n≥8, ≥3 revelation scenes, avg suspenseDelta ≤ 0; disclosures never raise tension; sibling of REVELATION_CURIOSITY_FLAT in the suspense direction; distinct from CONFLICT_SUSPENSE_DECOUPLED [conflict scenes] and PAYOFF_SUSPENSE_AFTERMATH_VOID [payoff aftermath]), revelation emotion decoupled (co-occurrence × revelation × emotionalShift — n≥8, ≥3 revelation scenes, ≥2 emotional scenes, zero overlap; truths always surface in emotionally flat scenes; distinct from PAYOFF_EMOTION_DECOUPLED [payoff × emotion] and SEED_EMOTIONAL_DECOUPLED [seed × emotion]; first check pairing revelation with emotionalShift in co-occurrence mode), revelation cause void (backward-cause × revelation as effect — n≥8, ≥3 revelation scenes; every disclosure has no proactive act, dramatic turn, or suspense rise in itself or the prior scene; revelation-channel parallel of SEED_CAUSE_VOID; distinct from PROACTIVE_REVELATION_ABSENT [aftermath: proactive → revelation downstream] and from PAYOFF_PEAK_UNCAUSED [backward-cause × peak payoff]).

Rules named in this wave's header:

- `PAYOFF_PEAK_UNCAUSED`
- `PROACTIVE_REVELATION_ABSENT`
- `SEED_CAUSE_VOID`
- `SEED_EMOTIONAL_DECOUPLED`

## Wave 535

Wave 535 additions: payoff clock decoupled (co-occurrence/decoupling × payoff × clockRaised — n≥8, ≥3 payoff scenes, ≥2 clockRaised scenes, zero overlap; thread resolutions never coincide with deadline pressure; completes the payoff co-occurrence family alongside payoff × dramatic-turn, revelation, seed, and emotion; distinct from PAYOFF_SUSPENSE_FLAT which uses average mode on suspenseDelta not co-occurrence on clockRaised), payoff peak uncaused (backward-cause × single-peak × payoff — n≥8, ≥2 payoff scenes at pos≥2; the scene with the most payoffSetupIds has no revelation, dramatic-turn, suspense rise, or clockRaise in either prior scene; the heaviest resolution arrives without preparation; the payoff-peak complement of SEED_PEAK_UNCAUSED which audits the seed peak, and of PROACTIVE_PAYOFF_PEAK_DECOUPLED which checks the payoff peak for absence of initiative rather than backward-cause), payoff back-loaded (distribution/timing × payoff × second half — n≥8, ≥4 payoff scenes, >70% in second half while first half has ≥1; all resolutions deferred to the back half; the back-loaded complement of SEED_FRONTLOADED which audits the seed channel front-loaded; distinct from PAYOFF_EMOTION_DECOUPLED which is co-occurrence and from PAYOFF_SUSPENSE_AFTERMATH_VOID which is aftermath mode).

Rules named in this wave's header:

- `PAYOFF_EMOTION_DECOUPLED`
- `PAYOFF_SUSPENSE_AFTERMATH_VOID`
- `SEED_PEAK_UNCAUSED`

## Wave 521

Wave 521 additions: seed peak uncaused (backward-cause × single-peak × seed — n≥8, ≥2 seed scenes, the single scene planting the most clues has no revelation, dramatic turn, suspense rise, or clockRaise in either of the 2 preceding scenes; foreshadowing peaks without preparation; first backward-cause check in this pass, distinct from PROACTIVE_PAYOFF_PEAK_DECOUPLED which audits the payoff peak vs. initiative and PROACTIVE_SUSPENSE_PEAK_DECOUPLED which audits suspense peak), seed front-loaded (distribution/timing × seed × first half — n≥8, ≥4 seed scenes, >70% in first half while back half has ≥1; foreshadowing planted before the midpoint leaves the back half threadless; first distribution check on the seed channel, distinct from REVELATION_FRONTLOADED which uses the revelation channel and SEED_MIDPOINT_VOID which is a zone not distribution check), payoff emotion decoupled (co-occurrence × payoff × emotionalShift — n≥8, ≥3 payoff scenes, ≥2 emotional scenes, zero overlap; thread resolutions are always emotionally flat; first check pairing the payoff channel with emotionalShift in co-occurrence mode, distinct from PAYOFF_CURIOSITY_FLAT and PAYOFF_SUSPENSE_FLAT which use average mode, and from PAYOFF_DRAMA_DECOUPLED / PAYOFF_REVELATION_DECOUPLED / PAYOFF_SEED_DECOUPLED which pair payoff with different channels).

Rules named in this wave's header:

- `PAYOFF_SEED_DECOUPLED`
- `PROACTIVE_PAYOFF_PEAK_DECOUPLED`
- `PROACTIVE_SUSPENSE_PEAK_DECOUPLED`

## Wave 507

Wave 507 additions: payoff suspense aftermath void (average/aggregate × payoff → suspense aftermath — n≥8, ≥3 payoff scenes not at last position, avg suspenseDelta of immediately following scene ≤ 0; thread resolutions never carry forward tension into what follows; distinct from PAYOFF_CURIOSITY_FLAT which checks the payoff scene's OWN curiosity, and from PROACTIVE_SUSPENSE_AFTERMATH_ABSENT which uses an initiative trigger not a payoff trigger), revelation closing void (zone presence/absence × revelation × closing third — n≥9, ≥3 revelations, none in the final third; the resolution zone discloses nothing; distinct from REVELATION_FRONTLOADED which uses a 70% first-half ratio and REVELATION_RUN which is run-based), payoff seed decoupled (co-occurrence/decoupling × payoff × seed — n≥8, ≥2 payoff scenes, ≥2 seed scenes, zero overlap; resolutions never simultaneously plant new threads; distinct from PAYOFF_DRAMA_DECOUPLED which pairs payoff × dramatic turn, and SEED_DRAMA_DECOUPLED which pairs seed × dramatic turn).

Rules named in this wave's header:

- `PAYOFF_CURIOSITY_FLAT`
- `PAYOFF_DRAMA_DECOUPLED`
- `PROACTIVE_SUSPENSE_AFTERMATH_ABSENT`
- `REVELATION_FRONTLOADED`
- `SEED_DRAMA_DECOUPLED`

## Wave 493

Wave 493 additions: payoff curiosity flat (≥3 payoff scenes averaging curiosityDelta ≤ 0 — callbacks close questions but open none; average/aggregate × payoff × curiosity, the payoff sibling of REVELATION_CURIOSITY_FLAT and distinct from all proactive-curiosity checks which target initiative, not closure scenes), seed Act 1 void (no clue seeded in the first 25% while seeds exist later — the audience enters Act 2 carrying no planted threads; zone presence/absence × seed × opening quarter, distinct from SEED_MIDPOINT_VOID which targets the 40-60% zone and SEED_FRONTLOADED/BACKLOADED which use distribution ratios), payoff run (≥3 consecutive payoff scenes — thread-closures dump in a burst overwhelming individual resolution weight; run-based × payoff channel, completing the run family alongside PROACTIVE_DESERT_RUN, SEED_RUN_ISOLATED, and REVELATION_RUN).

Rules named in this wave's header:

- `REVELATION_CURIOSITY_FLAT`
- `REVELATION_RUN`
- `SEED_FRONTLOADED`
- `SEED_MIDPOINT_VOID`

## Wave 479

Wave 479 additions: revelation run (≥3 consecutive revelation scenes — rapid information dump that crowds out audience processing time; run-based × revelation channel, third run-based check completing the family alongside PROACTIVE_DESERT_RUN and SEED_RUN_ISOLATED), payoff final zone void (≥4 payoffs, none in the final 25% — Act 3 resolves no planted threads, the climax carries no callback weight; zone presence/absence × payoff × Act 3, extending the zone family to the payoff channel), revelation curiosity flat (≥3 revelation scenes averaging curiosityDelta ≤ 0 — disclosures collectively fail to open new questions; average/aggregate × revelation × curiosity, new average/aggregate check on the revelation channel).

Rules named in this wave's header:

- `PROACTIVE_DESERT_RUN`
- `SEED_RUN_ISOLATED`

## Wave 409

Wave 409 additions: proactive payoff peak decoupled (the scene that resolves the most setups is not proactive even though smaller payoffs coincide with initiative — single-peak isolation × payoff magnitude, the payoff sibling of PROACTIVE_RELATIONSHIP_PEAK_ABSENT), seed frontloaded (all seeded clues fall in the first half — the back half plants no new threads, the distribution mirror of SEED_BACKLOADED), proactive suspense aftermath absent (no proactive act is followed by a suspense spike in the next 2 scenes — initiative never raises tension downstream, aftermath/sequence × suspense channel).

Rules named in this wave's header:

- `PROACTIVE_RELATIONSHIP_PEAK_ABSENT`
- `SEED_BACKLOADED`

## Wave 395

Wave 395 additions: proactive relationship peak absent (the single largest relational shift is not in a proactive scene even though smaller shifts coincide with initiative — single-peak isolation × relationship magnitude), proactive emotional recoil absent (no proactive act is followed by a negative emotional shift in the next 2 scenes — aftermath/sequence × emotional cost), seed backloaded (all seeded clues fall in the second half — distribution mirror of INTENTION_SEED_GRAVEYARD).

Rules named in this wave's header:

- `INTENTION_SEED_GRAVEYARD`

## Unattributed (no explicit wave-header mention)

These rule constants exist in this pass but were not found, by exact-name match, inside any "Wave N —" / "Wave N additions:" header entry in the file — typically because they predate that convention hardening, or the header describes the check descriptively rather than by constant name (e.g. "talking heads" rather than `TALKING_HEADS`). Listed here honestly rather than guessed into a wave, with the nearest preceding in-code "── section title ──" comment as the best-available substitute context where one exists.

- `AGENCY_ENTROPY_COLLAPSE` — Wave 205: Proactive opening absent, agency frontloaded, stakes never personal
- `AGENCY_PROXY` — AGENCY_PROXY
- `CLIMAX_WITHOUT_CHOICE` — Act 3 without a character making the climactic choice
- `CLOCK_REVELATION_AFTERMATH_VOID` — Wave 549: REVELATION_SUSPENSE_FLAT, REVELATION_EMOTION_DECOUPLED, REVELATION_CAUSE_VOID
- `COMMITMENT_RAMP_INVERSION` — Wave 205: Proactive opening absent, agency frontloaded, stakes never personal
- `ENTROPY_CLIFF` — Wave 188: Entropy arc flat, intention convergence absent, entropy cliff
- `ENTROPY_SPIKE_MISPLACED` — Wave 171: ENTROPY_SPIKE_MISPLACED
- `ESCALATION_ENTROPY_FLAT` — Wave 188: Entropy arc flat, intention convergence absent, entropy cliff
- `GOAL_PIVOT_ABSENT` — Wave 244: Proactive Act 3 void, intention discovery absent, goal pivot absent
- `INTENTION_CONVERGENCE_ABSENT` — Wave 188: Entropy arc flat, intention convergence absent, entropy cliff
- `INTENTION_DISCOVERY_ABSENT` — Wave 244: Proactive Act 3 void, intention discovery absent, goal pivot absent
- `INTENTION_DROPOUT` — INTENTION_DROPOUT
- `INTENTION_INVISIBLE` — Characters with no dialogue/belief traces may be props
- `INTENTION_PURPOSE_MONOTONE` — Wave 286: INTENTION_PURPOSE_MONOTONE
- `INTENTION_REACTIVE_CLIMAX` — Wave 286: INTENTION_REACTIVE_CLIMAX
- `PASSIVE_ACT3_INTENTION` — Wave 171: PASSIVE_ACT3_INTENTION
- `PAYOFF_RELATIONSHIP_DECOUPLED` — Wave 549: REVELATION_SUSPENSE_FLAT, REVELATION_EMOTION_DECOUPLED, REVELATION_CAUSE_VOID
- `PAYOFF_RUN` — Wave 493: PAYOFF_CURIOSITY_FLAT, SEED_ACT1_VOID, PAYOFF_RUN
- `PAYOFF_WITHOUT_EFFORT` — Wave 272: PAYOFF_WITHOUT_EFFORT
- `PROACTIVE_ACT2A_VOID` — Wave 272: PROACTIVE_ACT2A_VOID
- `PROACTIVE_ACT2B_VOID` — Wave 381: PROACTIVE_ACT2B_VOID, PROACTIVE_FRONTLOADED, PROACTIVE_REVELATION_COINCIDENCE_ABSENT
- `PROACTIVE_ACT3_VOID` — Wave 244: Proactive Act 3 void, intention discovery absent, goal pivot absent
- `PROACTIVE_ADVERSITY_ABSENT` — Wave 367: PROACTIVE_ADVERSITY_ABSENT, PROACTIVE_BACKLOADED, PROACTIVE_PAYOFF_COINCIDENCE_ABSENT
- `PROACTIVE_AFTERMATH_CURIOSITY_ABSENT` — Wave 423: SEED_MIDPOINT_VOID, PROACTIVE_AFTERMATH_CURIOSITY_ABSENT, SEED_DRAMA_DECOUPLED
- `PROACTIVE_BACKLOADED` — Wave 367: PROACTIVE_ADVERSITY_ABSENT, PROACTIVE_BACKLOADED, PROACTIVE_PAYOFF_COINCIDENCE_ABSENT
- `PROACTIVE_EMOTIONAL_RECOIL_ABSENT` — Wave 395: PROACTIVE_RELATIONSHIP_PEAK_ABSENT, PROACTIVE_EMOTIONAL_RECOIL_ABSENT, SEED_BACKLOADED
- `PROACTIVE_GLOBAL_SCARCITY` — Wave 314: PROACTIVE_GLOBAL_SCARCITY
- `PROACTIVE_LATE_SURGE` — Wave 272: PROACTIVE_LATE_SURGE
- `PROACTIVE_MIDPOINT_VOID` — Wave 258: Proactive midpoint void, proactive desert run, revelation without proactive
- `PROACTIVE_OPENING_ABSENT` — Wave 205: Proactive opening absent, agency frontloaded, stakes never personal
- `PROACTIVE_OVERCLUSTERING` — Wave 230: Secondary intention vacuum, proactive overclustering, reactive goal adoption
- `PROACTIVE_PAYOFF_COINCIDENCE_ABSENT` — Wave 367: PROACTIVE_ADVERSITY_ABSENT, PROACTIVE_BACKLOADED, PROACTIVE_PAYOFF_COINCIDENCE_ABSENT
- `PROACTIVE_RELATIONSHIP_VOID` — Wave 339: PROACTIVE_EMOTION_DECOUPLED, PROACTIVE_REVELATION_ABSENT, PROACTIVE_RELATIONSHIP_VOID
- `PROACTIVE_REVELATION_COINCIDENCE_ABSENT` — Wave 381: PROACTIVE_ACT2B_VOID, PROACTIVE_FRONTLOADED, PROACTIVE_REVELATION_COINCIDENCE_ABSENT
- `PROTAGONIST_ACTED_UPON_FINALE` — PROTAGONIST_ACTED_UPON_FINALE
- `PROTAGONIST_DEFERENCE_RUN` — PROTAGONIST_DEFERENCE_RUN
- `PROTAGONIST_REACTIVE_DOMINANCE` — Wave 156: Protagonist reactive dominance
- `REACTIVE_GOAL_ADOPTION` — Wave 230: Secondary intention vacuum, proactive overclustering, reactive goal adoption
- `REVELATION_RELATIONSHIP_DECOUPLED` — Wave 549: REVELATION_SUSPENSE_FLAT, REVELATION_EMOTION_DECOUPLED, REVELATION_CAUSE_VOID
- `REVELATION_SUSPENSE_FLAT` — Wave 549: REVELATION_SUSPENSE_FLAT, REVELATION_EMOTION_DECOUPLED, REVELATION_CAUSE_VOID
- `REVELATION_WITHOUT_PROACTIVE` — Wave 258: Proactive midpoint void, proactive desert run, revelation without proactive
- `SECONDARY_INTENTION_VACUUM` — Wave 230: Secondary intention vacuum, proactive overclustering, reactive goal adoption
- `SEED_ACT1_VOID` — Wave 493: PAYOFF_CURIOSITY_FLAT, SEED_ACT1_VOID, PAYOFF_RUN
- `SEED_CLOCKLESS` — Wave 437: SEED_RUN_ISOLATED, PROACTIVE_ZONE_IMBALANCE, SEED_CLOCKLESS
- `SEED_CURIOSITY_DECOUPLED` — Wave 549: REVELATION_SUSPENSE_FLAT, REVELATION_EMOTION_DECOUPLED, REVELATION_CAUSE_VOID
- `SEEDING_CURIOSITY_FLAT` — Wave 300: SEEDING_CURIOSITY_FLAT
- `STAKES_NEVER_PERSONAL` — Wave 205: Proactive opening absent, agency frontloaded, stakes never personal
- `WANT_FEAR_COLLISION_ABSENT` — WANT_FEAR_COLLISION_ABSENT

