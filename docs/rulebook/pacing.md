# Pass: `pacing`

Founding wave: 39. Total distinct rules: 229 (155 attributed to a specific wave, 74 unattributed — see docs/rulebook/README.md's methodology note).

## Wave 1184

Wave 1184 additions (Program v2, Type 3 — genre-conditioned): ENERGY_MONOTONE and PACING_PLATEAU are two of the highest-firing generic rules in the calibration corpus (20/20 samples each — see the wave's measurement pass). Both now consult GENRE_RULE_MODIFIERS (server/lib/genre-router.ts) for a genre-aware threshold, generic value as the default: a thriller's mandatory forward momentum makes even moderate scene-length uniformity a defect (both thresholds tighten), while a slow-burn drama's register of restraint legitimately sustains a flatter, more uniform cadence (both thresholds loosen). storyContext absent, genre absent, or genre unset in the table -> identical constants and identical issue text to pre-Wave-1184 behavior.

Rules named in this wave's header:

- `ENERGY_MONOTONE`
- `PACING_PLATEAU`

## Wave 1181

Wave 1181 additions (distinct-mode pivot — see Waves 1176-1180 in dialogue.ts/character-arc.ts/conflict.ts/intention.ts/originality.ts): reconnaissance found this file's channels saturated across zone-cluster (23), zone-imbalance (22), drought-run (23), peak-uncaused (8), and aftermath-void (48) uses, but checkHalfLoaded had zero uses, and — like originality.ts — this file has no hand-rolled binary half-partition check anywhere (grep for FRONTLOADED/ BACKLOADED/FRONT_LOADED/BACK_LOADED returns only two comment references to intention.ts's PAYOFF_BACK_LOADED, never a local rule). This wave introduces the mode for the first time, on three channels that already carry the full zone-cluster/zone-imbalance/drought-run/ peak-uncaused quartet: PACING_PAYOFF_BACK_LOADED, PACING_OPEN_THREAD_FRONT_LOADED, and PACING_HIGHLIGHT_BACK_LOADED. Thresholds (minRecords 9, minCount 3) match this file's own zone-cluster precedent for each channel; ratioThreshold 0.70 matches the half-partition convention established across the other four passes touched by this pivot.

Rules named in this wave's header:

- `PACING_HIGHLIGHT_BACK_LOADED`
- `PACING_OPEN_THREAD_FRONT_LOADED`
- `PACING_PAYOFF_BACK_LOADED`

## Wave 1167

Wave 1167 additions: after Wave 1153, emotionalShift stood at five of six channels (curiosityDelta, suspenseDelta, relationshipShifts, dialogueHighlights, visualBeats). PACING_EMOTION_RECURRENCE_AFTERMATH_VOID adds the self-referential sixth channel (another non-neutral emotional shift elsewhere), completing full six-channel saturation for this trigger — following the same self-pairing convention as PACING_SUSPENSE_RECURRENCE_AFTERMATH_VOID (Wave 1153). With suspenseDelta and emotionalShift both exhausted, this wave introduces curiosityDelta>0 as a genuinely fresh checkAftermathVoid trigger — it has only ever appeared as an aftermath channel in this file, never as the isTrigger side of a check. PACING_CURIOSITY_SUSPENSE_AFTERMATH_VOID pairs curiosityDelta with suspenseDelta; PACING_CURIOSITY_EMOTIONAL_AFTERMATH_VOID pairs it with emotionalShift.

Rules named in this wave's header:

- `PACING_CURIOSITY_EMOTIONAL_AFTERMATH_VOID`
- `PACING_CURIOSITY_SUSPENSE_AFTERMATH_VOID`
- `PACING_EMOTION_RECURRENCE_AFTERMATH_VOID`

## Wave 1153

Wave 1153 additions: after Wave 1139, suspenseDelta>0 and emotionalShift were each at four of six channels (curiosityDelta, emotionalShift/suspenseDelta cross-pair, relationshipShifts, dialogueHighlights). PACING_SUSPENSE_STAGING_AFTERMATH_VOID and PACING_EMOTION_STAGING_AFTERMATH_VOID give each trigger its fifth channel (visualBeats); PACING_SUSPENSE_RECURRENCE_AFTERMATH_VOID adds the self-referential sixth channel for suspenseDelta (another suspense rise elsewhere), completing full six-channel saturation for this trigger.

Rules named in this wave's header:

- `PACING_EMOTION_STAGING_AFTERMATH_VOID`
- `PACING_SUSPENSE_RECURRENCE_AFTERMATH_VOID`
- `PACING_SUSPENSE_STAGING_AFTERMATH_VOID`

## Wave 1139

Wave 1139 additions: suspenseDelta>0 was at three of six channels (curiosityDelta, emotionalShift, relationshipShifts) and emotionalShift at two (relationshipShifts, curiosityDelta). PACING_SUSPENSE_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID gives suspenseDelta its fourth channel (dialogueHighlights); PACING_EMOTION_SUSPENSE_AFTERMATH_VOID and PACING_EMOTION_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID give emotionalShift its third and fourth channels (suspenseDelta, dialogueHighlights).

Rules named in this wave's header:

- `PACING_EMOTION_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID`
- `PACING_EMOTION_SUSPENSE_AFTERMATH_VOID`
- `PACING_SUSPENSE_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID`

## Wave 1125

Wave 1125 additions: suspenseDelta>0 and emotionalShift (non-neutral) each had exactly one checkAftermathVoid channel as of Wave 1111. PACING_SUSPENSE_EMOTIONAL_AFTERMATH_VOID and PACING_SUSPENSE_RELATIONAL_AFTERMATH_VOID give suspenseDelta its second and third channels (emotionalShift, relationshipShifts); PACING_EMOTION_CURIOSITY_AFTERMATH_VOID gives emotionalShift its second channel (curiosityDelta).

Rules named in this wave's header:

- `PACING_EMOTION_CURIOSITY_AFTERMATH_VOID`
- `PACING_SUSPENSE_EMOTIONAL_AFTERMATH_VOID`
- `PACING_SUSPENSE_RELATIONAL_AFTERMATH_VOID`

## Wave 1111

Wave 1111 additions: PACING_CLOCK_DELTA_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID gives clockDelta≠0 its sixth and final channel (previously paired with suspenseDelta/curiosityDelta/ emotionalShift/relationshipShifts/visualBeats, now also paired with dialogueHighlights), completing full six-channel saturation for every trigger in this pass. With no channel gaps remaining on any existing trigger, this wave introduces suspenseDelta>0 and emotionalShift (non-neutral) as genuinely fresh checkAftermathVoid triggers — neither has ever anchored the isTrigger side of a sequence/aftermath check here, though both are heavily used as aftermath signals and as isPresent subjects in other analytical modes (drought-run, zone-cluster, zone-imbalance). PACING_SUSPENSE_CURIOSITY_AFTERMATH_VOID pairs suspenseDelta with curiosityDelta; PACING_EMOTION_RELATIONAL_AFTERMATH_VOID pairs emotionalShift with relationshipShifts.

Rules named in this wave's header:

- `PACING_CLOCK_DELTA_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID`
- `PACING_EMOTION_RELATIONAL_AFTERMATH_VOID`
- `PACING_SUSPENSE_CURIOSITY_AFTERMATH_VOID`

## Wave 1097

Wave 1097 additions: with all six boolean/purpose/length triggers (raise_stakes, revelation, seededClueIds, payoffSetupIds, dramaticTurn, clockRaised, unresolvedClues-debt) fully saturated since Wave 1083, this wave continues building out clockDelta≠0's channel set (currently just suspenseDelta and curiosityDelta) — PACING_CLOCK_DELTA_EMOTIONAL_AFTERMATH_VOID (emotionalShift), PACING_CLOCK_DELTA_RELATIONAL_AFTERMATH_VOID (relationshipShifts), and PACING_CLOCK_DELTA_STAGING_AFTERMATH_VOID (visualBeats) give this trigger three fresh channels, leaving only dialogueHighlights before it too reaches full six-channel saturation.

Rules named in this wave's header:

- `PACING_CLOCK_DELTA_EMOTIONAL_AFTERMATH_VOID`
- `PACING_CLOCK_DELTA_RELATIONAL_AFTERMATH_VOID`
- `PACING_CLOCK_DELTA_STAGING_AFTERMATH_VOID`

## Wave 1083

Wave 1083 additions: with revelation/seededClueIds/payoffSetupIds/dramaticTurn/clockRaised/ raise_stakes now all fully saturated (six channels each via mixed hand-rolled and checkAftermathVoid mechanisms), this wave gives heavy unresolvedClues debt its sixth and final channel — PACING_OPEN_THREAD_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID (previously paired with relationshipShifts/visualBeats/suspenseDelta/curiosityDelta/emotionalShift, now also paired with dialogueHighlights) — and introduces clockDelta ≠ 0 as a genuinely fresh sequence/ aftermath trigger, distinct from the clockRaised boolean already exhausted across all six channels: PACING_CLOCK_DELTA_SUSPENSE_AFTERMATH_VOID and PACING_CLOCK_DELTA_CURIOSITY_AFTERMATH_VOID pair the numeric clock-delta signal with suspenseDelta and curiosityDelta for the first time via this mode (clockDelta already has drought-run, zone-cluster, zone-imbalance, and peak-uncaused coverage, but never sequence/aftermath).

Rules named in this wave's header:

- `PACING_CLOCK_DELTA_CURIOSITY_AFTERMATH_VOID`
- `PACING_CLOCK_DELTA_SUSPENSE_AFTERMATH_VOID`
- `PACING_OPEN_THREAD_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID`

## Wave 1069

Wave 1069 additions: payoffSetupIds and raise_stakes are the last two triggers still missing the dialogueHighlights channel — PACING_PAYOFF_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID and PACING_STAKES_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID close that gap, giving both triggers full six-channel saturation. The third check, PACING_OPEN_THREAD_STAGING_AFTERMATH_VOID, pairs the isHeavyDebt607 predicate with visualBeats — a channel it has never carried before.

Rules named in this wave's header:

- `PACING_OPEN_THREAD_STAGING_AFTERMATH_VOID`
- `PACING_PAYOFF_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID`
- `PACING_STAKES_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID`

## Wave 1055

Wave 1055 additions: with revelation/seededClueIds/payoffSetupIds/dramaticTurn/clockRaised all now fully saturated across the standard relationshipShifts/visualBeats/dialogueHighlights boolean channels (on top of the avg-based suspense/curiosity/emotion triads), this wave targets the two hand-rolled avg-based trigger families that have never been paired with the boolean channels: PACING_STAKES_RELATIONAL_AFTERMATH_VOID and PACING_OPEN_THREAD_RELATIONAL_AFTERMATH_VOID pair the isStakesRaise593/isHeavyDebt607 predicates with relationshipShifts for the first time, and PACING_STAKES_STAGING_AFTERMATH_VOID pairs isStakesRaise593 with visualBeats.

Rules named in this wave's header:

- `PACING_OPEN_THREAD_RELATIONAL_AFTERMATH_VOID`
- `PACING_STAKES_RELATIONAL_AFTERMATH_VOID`
- `PACING_STAKES_STAGING_AFTERMATH_VOID`

## Wave 1041

Wave 1041 additions: this wave extends the dialogueHighlights consequence channel Wave 1027 introduced to three more triggers that have never carried it: PACING_REVELATION_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID (revelation), PACING_CLOCK_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID (clockRaised), and PACING_TURN_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID (dramaticTurn).

Rules named in this wave's header:

- `PACING_CLOCK_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID`
- `PACING_REVELATION_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID`
- `PACING_TURN_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID`

## Wave 1027

Wave 1027 additions: payoffSetupIds and dramaticTurn are the last two triggers still missing the visualBeats (staging) channel that revelation/seededClueIds/clockRaised already carry — PACING_PAYOFF_STAGING_AFTERMATH_VOID and PACING_TURN_STAGING_AFTERMATH_VOID close that gap. The third check, PACING_SEED_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID, pairs seededClueIds with dialogueHighlights — a field that (per grep) has never been used as a checkAftermathVoid consequence channel anywhere in this 107-rule pass, only as its own presence signal in the PACING_HIGHLIGHT_ZONE_* family.

Rules named in this wave's header:

- `PACING_PAYOFF_STAGING_AFTERMATH_VOID`
- `PACING_SEED_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID`
- `PACING_TURN_STAGING_AFTERMATH_VOID`

## Wave 1013

Wave 1013 additions: reconnaissance found dramaticTurn and clockRaised fully saturated on the suspense/curiosity/emotion channels (hand-rolled average-based families) but never paired with relationshipShifts or visualBeats via the boolean checkAftermathVoid mode — the two channels only revelation and seededClueIds had been given so far. This wave closes that gap: PACING_TURN_RELATIONAL_AFTERMATH_VOID (dramaticTurn → relationshipShifts), PACING_CLOCK_RELATIONAL_AFTERMATH_VOID (clockRaised → relationshipShifts), and PACING_CLOCK_STAGING_AFTERMATH_VOID (clockRaised → visualBeats).

Rules named in this wave's header:

- `PACING_CLOCK_RELATIONAL_AFTERMATH_VOID`
- `PACING_CLOCK_STAGING_AFTERMATH_VOID`
- `PACING_TURN_RELATIONAL_AFTERMATH_VOID`

## Wave 999

Wave 999 additions: PACING_STAGING re-checked and re-excluded (same predicate mismatch, >=2 vs >0 visualBeats), confirming zone-imbalance remains exhausted. Reconnaissance found the stakes/ heavy-debt/clock/turn/payoff triggers in this pass fully saturated across the suspense/curiosity/ emotion channels (Waves 593/607 plus hand-rolled clock/turn/payoff families) — but relationshipShifts has only ever been audited for its own distribution, never as an aftermath channel following a trigger. This wave adds three checkAftermathVoid pairings on that one open channel, each with an already-established trigger: PACING_REVELATION_RELATIONSHIP_AFTERMATH_VOID (revelation, previously only paired with visualBeats), PACING_SEED_RELATIONSHIP_AFTERMATH_VOID (seededClueIds, likewise previously only paired with visualBeats), and PACING_PAYOFF_RELATIONSHIP_AFTERMATH_VOID (payoffSetupIds, previously audited via hand-rolled average-based checks on suspense/curiosity/ emotion but never via the boolean all-or-nothing checkAftermathVoid mode, and never on this channel).

Rules named in this wave's header:

- `PACING_PAYOFF_RELATIONSHIP_AFTERMATH_VOID`
- `PACING_REVELATION_RELATIONSHIP_AFTERMATH_VOID`
- `PACING_SEED_RELATIONSHIP_AFTERMATH_VOID`

## Wave 985

Wave 985 additions: PACING_HIGHLIGHT_ZONE_IMBALANCE (dialogueHighlights array) and PACING_TURN_ZONE_IMBALANCE (dramaticTurn !== 'nothing') — the last two clean trio-complete zone-imbalance candidates in this pass (PACING_STAGING was skipped: its cluster/drought predicates disagree, >=2 vs >0 visualBeats). With zone-imbalance now down to just these two, this wave completes the trio with one aftermath-void pairing: PACING_STAKES_CURIOSITY_AFTERMATH_VOID (raise_stakes → curiosityDelta), the first use of raise_stakes as an aftermath-void trigger in this pass.

Rules named in this wave's header:

- `PACING_HIGHLIGHT_ZONE_IMBALANCE`
- `PACING_STAKES_CURIOSITY_AFTERMATH_VOID`
- `PACING_TURN_ZONE_IMBALANCE`

## Wave 971

Wave 971 additions: auditing the three remaining trio-complete signals in this pass, spanning three distinct classes: PACING_CLOCK_DELTA_ZONE_IMBALANCE (clockDelta !== 0 — a delta distinct from the suspense/curiosity ones audited in Waves 943/957), PACING_RELATIONSHIP_ZONE_IMBALANCE (relationshipShifts array, distinct from the seed/payoff arrays), and PACING_REVELATION_ZONE_IMBALANCE (revelation != null — the revelation string field, distinct from the purpose-enum PACING_REVELATION_PURPOSE one).

Rules named in this wave's header:

- `PACING_CLOCK_DELTA_ZONE_IMBALANCE`
- `PACING_RELATIONSHIP_ZONE_IMBALANCE`
- `PACING_REVELATION_ZONE_IMBALANCE`

## Wave 957

Wave 957 additions: continuing the non-purpose 4-zone rollout with three more trio-complete signals spanning three distinct classes: PACING_POSITIVE_EMOTION_ZONE_IMBALANCE (emotionalShift === 'positive', the positive-valence mirror of Wave 929's negative one), PACING_SUSPENSE_ZONE_IMBALANCE (suspenseDelta > 0 — the tension delta beside 943's curiosity one), and PACING_PAYOFF_ZONE_IMBALANCE (payoffSetupIds.length > 0 — the payoff array beside 943's seed one).

Rules named in this wave's header:

- `PACING_PAYOFF_ZONE_IMBALANCE`
- `PACING_POSITIVE_EMOTION_ZONE_IMBALANCE`
- `PACING_SUSPENSE_ZONE_IMBALANCE`

## Wave 943

Wave 943 additions: extending the checkZoneImbalance rollout to three more signals whose 3-zone/ run trios were long complete but had never been 4-zone-audited, spanning three distinct signal classes: PACING_REVELATION_PURPOSE_ZONE_IMBALANCE (purpose === 'revelation', trio completed Wave 929), PACING_CURIOSITY_ZONE_IMBALANCE (curiosityDelta > 0 — question-raising delta magnitude), and PACING_SEED_ZONE_IMBALANCE (seededClueIds.length > 0 — clue-planting array field).

Rules named in this wave's header:

- `PACING_CURIOSITY_ZONE_IMBALANCE`
- `PACING_REVELATION_PURPOSE_ZONE_IMBALANCE`
- `PACING_SEED_ZONE_IMBALANCE`

## Wave 929

Wave 929 additions: purpose === 'revelation' has never been referenced anywhere in this pass (the pre-existing PACING_REVELATION_ZONE_CLUSTER/DROUGHT_RUN audit the separate revelation string|null field, not this purpose enum value) -- a genuinely virgin field. This wave adds PACING_REVELATION_PURPOSE_ZONE_CLUSTER and PACING_REVELATION_PURPOSE_DROUGHT_RUN (peak mode conventionally skipped for this categorical field), plus PACING_NEGATIVE_EMOTION_ZONE_IMBALANCE, extending the 4-zone checkZoneImbalance mode to the emotionalShift valence signal (emotionalShift === 'negative' has a complete 3-zone/run trio but has never been audited by it).

Rules named in this wave's header:

- `PACING_NEGATIVE_EMOTION_ZONE_IMBALANCE`
- `PACING_REVELATION_PURPOSE_DROUGHT_RUN`
- `PACING_REVELATION_PURPOSE_ZONE_CLUSTER`

## Wave 915

Wave 915 additions: continuing the checkZoneImbalance rollout begun in Wave 887, this wave applies the 4-zone bloat+empty-zone mode to the three remaining purpose values with complete 3-zone/run-based trios that had never been audited by it: PACING_INTRODUCE_CONFLICT_ZONE_IMBALANCE (purpose === 'introduce_conflict'), PACING_CHARACTER_MOMENT_ZONE_IMBALANCE (purpose === 'character_moment'), and PACING_STAKES_ZONE_IMBALANCE (purpose === 'raise_stakes').

Rules named in this wave's header:

- `PACING_CHARACTER_MOMENT_ZONE_IMBALANCE`
- `PACING_INTRODUCE_CONFLICT_ZONE_IMBALANCE`
- `PACING_STAKES_ZONE_IMBALANCE`

## Wave 901

Wave 901 additions: continuing the checkZoneImbalance rollout begun in Wave 887, this wave applies the 4-zone bloat+empty-zone mode to three more purpose values that each already have a complete 3-zone/run-based trio (checkZoneCluster + checkDroughtRun) but have never been audited by it: PACING_RESOLUTION_ZONE_IMBALANCE (purpose === 'resolution'), PACING_TURNING_POINT_ZONE_IMBALANCE (purpose === 'turning_point'), and PACING_COMPLICATE_ZONE_IMBALANCE (purpose === 'complicate').

Rules named in this wave's header:

- `PACING_COMPLICATE_ZONE_IMBALANCE`
- `PACING_RESOLUTION_ZONE_IMBALANCE`
- `PACING_TURNING_POINT_ZONE_IMBALANCE`

## Wave 887

Wave 887 additions: PACING_COMPLICATE_DROUGHT_RUN (run-based x purpose === 'complicate' absence -- completes 2 of 3 slots for this purpose value alongside the zone-cluster mode added in Wave 873; peak mode conventionally skipped for this categorical field). Also, no purpose value had ever been audited by the distinct 4-zone checkZoneImbalance mode in this pass (only dialogueHighlights and unresolvedClues had); this wave applies it to two purpose values with complete 3-zone/run-based trios: PACING_CLIMAX_ZONE_IMBALANCE (purpose === 'climax') and PACING_ESTABLISH_WORLD_ZONE_IMBALANCE (purpose === 'establish_world').

Rules named in this wave's header:

- `PACING_CLIMAX_ZONE_IMBALANCE`
- `PACING_COMPLICATE_DROUGHT_RUN`
- `PACING_ESTABLISH_WORLD_ZONE_IMBALANCE`

## Wave 873

Wave 873 additions: PACING_CLIMAX_DROUGHT_RUN (run-based x purpose === 'climax' absence -- completes 2 of 3 slots for this purpose value alongside the zone-cluster mode added in Wave 859; peak mode conventionally skipped for this categorical field), PACING_RESOLUTION_DROUGHT_RUN (run-based x purpose === 'resolution' absence -- completes 2 of 3 slots for this purpose value alongside the zone-cluster mode added in Wave 859; distinct from the incidental last-record disjunctions elsewhere in this pass; peak mode conventionally skipped for this categorical field), PACING_COMPLICATE_ZONE_CLUSTER (distribution/timing x purpose === 'complicate' x structural thirds -- this purpose value has never been referenced anywhere in this pass; a virgin field).

Rules named in this wave's header:

- `PACING_CLIMAX_DROUGHT_RUN`
- `PACING_COMPLICATE_ZONE_CLUSTER`
- `PACING_RESOLUTION_DROUGHT_RUN`

## Wave 859

Wave 859 additions: PACING_ESTABLISH_WORLD_DROUGHT_RUN (run-based × purpose === 'establish_world' absence — completes 2 of 3 slots for this purpose value alongside the zone-cluster mode added in Wave 845; peak mode conventionally skipped for this categorical field), PACING_CLIMAX_ZONE_CLUSTER (distribution/timing × purpose === 'climax' × structural thirds — this purpose value has never been referenced anywhere in this pass; a virgin field), PACING_RESOLUTION_ZONE_CLUSTER (distribution/timing × purpose === 'resolution' × structural thirds — distinct from an incidental last-record disjunction check elsewhere in this pass; none of the three shared-library trio modes has ever isolated this purpose value as a standalone distributional signal).

Rules named in this wave's header:

- `PACING_CLIMAX_ZONE_CLUSTER`
- `PACING_ESTABLISH_WORLD_DROUGHT_RUN`
- `PACING_RESOLUTION_ZONE_CLUSTER`

## Wave 845

Wave 845 additions: PACING_INTRODUCE_CONFLICT_DROUGHT_RUN (run-based × purpose === 'introduce_conflict' absence — completes 2 of 3 slots for this purpose value alongside the zone-cluster mode added in Wave 831; peak mode conventionally skipped for this categorical field), PACING_POSITIVE_EMOTION_DROUGHT_RUN (run-based × emotionalShift === 'positive' absence — completes 2 of 3 slots for this valence alongside the zone-cluster mode added in Wave 831; peak mode conventionally skipped for this categorical field), PACING_ESTABLISH_WORLD_ZONE_CLUSTER (distribution/timing × purpose === 'establish_world' × structural thirds — this purpose value has never been referenced anywhere in this pass; a virgin field).

Rules named in this wave's header:

- `PACING_ESTABLISH_WORLD_ZONE_CLUSTER`
- `PACING_INTRODUCE_CONFLICT_DROUGHT_RUN`
- `PACING_POSITIVE_EMOTION_DROUGHT_RUN`

## Wave 831

Wave 831 additions: PACING_TURNING_POINT_DROUGHT_RUN (run-based × purpose === 'turning_point' absence — completes 2 of 3 slots for this purpose value alongside the zone-cluster mode added in Wave 817; peak mode conventionally skipped for this categorical field), PACING_INTRODUCE_CONFLICT_ZONE_CLUSTER (distribution/timing × purpose === 'introduce_conflict' × structural thirds — this purpose value has never been referenced anywhere in this pass; a virgin field), PACING_POSITIVE_EMOTION_ZONE_CLUSTER (distribution/timing × emotionalShift === 'positive' × structural thirds — mirrors the completed negative-valence trio; the positive valence has never been isolated by any of the three shared-library trio modes in this pass).

Rules named in this wave's header:

- `PACING_INTRODUCE_CONFLICT_ZONE_CLUSTER`
- `PACING_POSITIVE_EMOTION_ZONE_CLUSTER`
- `PACING_TURNING_POINT_DROUGHT_RUN`

## Wave 817

Wave 817 additions: PACING_CHARACTER_MOMENT_ZONE_CLUSTER (distribution/timing × purpose === 'character_moment' × structural thirds — this purpose value has never been referenced anywhere in this pass; none of the three shared-library trio modes has ever been applied to it), PACING_CHARACTER_MOMENT_DROUGHT_RUN (run-based × purpose === 'character_moment' absence — completing 2 of 3 slots for this purpose value alongside the zone-cluster mode added in this same wave; peak mode conventionally skipped for this categorical field), PACING_TURNING_POINT_ZONE_CLUSTER (distribution/timing × purpose === 'turning_point' × structural thirds — this purpose value has never been referenced anywhere in this pass either; none of the three shared-library trio modes has ever been applied to it).

Rules named in this wave's header:

- `PACING_CHARACTER_MOMENT_DROUGHT_RUN`
- `PACING_CHARACTER_MOMENT_ZONE_CLUSTER`
- `PACING_TURNING_POINT_ZONE_CLUSTER`

## Wave 803

Wave 803 additions: PACING_REVELATION_PEAK_UNCAUSED (backward-cause × revelation-as-magnitude [0/1] × 2-scene lookback — completes the trio for revelation; none of the existing revelation checks in this pass [scene-length, aftermath, fixed-middle-zone-absence] are backward-cause, and hasCause deliberately omits revelation to avoid circularity), PACING_NEGATIVE_EMOTION_ZONE_CLUSTER (distribution/timing × emotionalShift === 'negative' × structural thirds — the hand-rolled EMOTIONAL_FLATLINE_RUN [Wave 453] and this pass's PACING_EMOTION_ZONE_CLUSTER [Wave 789] both operate on the combined non-neutral signal; neither valence has ever been isolated on its own), PACING_NEGATIVE_EMOTION_DROUGHT_RUN (run-based × emotionalShift === 'negative' absence — completing 2 of 3 slots for this valence alongside the zone-cluster mode added in this same wave; peak mode conventionally skipped for this categorical field).

Rules named in this wave's header:

- `PACING_NEGATIVE_EMOTION_DROUGHT_RUN`
- `PACING_NEGATIVE_EMOTION_ZONE_CLUSTER`
- `PACING_REVELATION_PEAK_UNCAUSED`

## Wave 789

Wave 789 additions: PACING_EMOTION_ZONE_CLUSTER (distribution/timing × emotionalShift !== 'neutral' presence × structural thirds — the hand-rolled EMOTIONAL_FLATLINE_RUN [Wave 453] already covers the run-based drought mode; the zone-cluster mode has never been applied to it, completing the trio), PACING_REVELATION_ZONE_CLUSTER (distribution/timing × revelation × structural thirds — existing revelation checks are scene-length, aftermath, and fixed-middle-zone-absence [REVELATION_MIDDLE_ZONE_ABSENT]; none of the three shared-library trio modes has ever been applied to it), PACING_REVELATION_DROUGHT_RUN (run-based × revelation absence — completing 2 of 3 slots for revelation alongside the zone-cluster mode added in this same wave).

Rules named in this wave's header:

- `PACING_EMOTION_ZONE_CLUSTER`
- `PACING_REVELATION_DROUGHT_RUN`
- `PACING_REVELATION_ZONE_CLUSTER`
- `REVELATION_MIDDLE_ZONE_ABSENT`

## Wave 775

Wave 775 additions: PACING_SUSPENSE_ZONE_CLUSTER (distribution/timing × suspenseDelta>0 presence × structural thirds — Wave 761's PACING_SUSPENSE_DROUGHT_RUN and the hand-rolled SUSPENSE_PEAK_UNCAUSED [Wave 481b, backward-cause] completed the drought/peak half of the trio; the zone-cluster mode has never been applied to it, completing the trio), PACING_CURIOSITY_DROUGHT_RUN (run-based × curiosityDelta>0 absence — Wave 761's PACING_CURIOSITY_ZONE_CLUSTER and the hand-rolled CURIOSITY_PEAK_UNCAUSED [Wave 495c, backward-cause] completed the cluster/peak half of the trio; the run-based drought mode has never been applied to it, completing the trio), PACING_STAGING_ZONE_CLUSTER (distribution/timing × visualBeats presence × structural thirds — PACING_STAGING_PEAK_UNCAUSED and PACING_STAGING_DROUGHT_RUN [Wave 761] completed the peak/drought half of the trio; the zone-cluster mode has never been applied to it, completing the trio).

Rules named in this wave's header:

- `CURIOSITY_PEAK_UNCAUSED`
- `PACING_CURIOSITY_DROUGHT_RUN`
- `PACING_STAGING_ZONE_CLUSTER`
- `PACING_SUSPENSE_ZONE_CLUSTER`

## Wave 761

Wave 761 additions: PACING_STAGING_DROUGHT_RUN (run-based × visualBeats absence — this pass has only ever anchored the backward-cause peak mode to visualBeats [PACING_STAGING_PEAK_UNCAUSED]; the run-based drought mode has never been applied to it), PACING_SUSPENSE_DROUGHT_RUN (run-based × suspenseDelta>0 absence — SUSPENSE_CLOSING_ZONE_ABSENT audits only the closing third specifically; the general run-based drought mode has never been applied to it), PACING_CURIOSITY_ZONE_CLUSTER (distribution/timing × curiosityDelta>0 presence × structural thirds — curiosityDelta has only ever anchored aftermath/decoupling and average/aggregate checks in this pass; none of the three shared-library trio modes has ever been applied to it).

Rules named in this wave's header:

- `PACING_CURIOSITY_ZONE_CLUSTER`
- `PACING_STAGING_DROUGHT_RUN`
- `PACING_SUSPENSE_DROUGHT_RUN`
- `SUSPENSE_CLOSING_ZONE_ABSENT`

## Wave 747

Wave 747 additions: PACING_RELATIONSHIP_DROUGHT_RUN (run-based × relationshipShifts absence — Waves 663/733 applied the backward-cause peak and zone-cluster modes to relationshipShifts; the drought-run mode has never been applied to it, completing the trio), PACING_CLOCK_DELTA_ZONE_CLUSTER (distribution/timing × clockDelta≠0 presence × structural thirds — Waves 677/733 applied the backward-cause peak and run-based drought modes to clockDelta; the zone-cluster mode has never been applied to it, completing the trio), PACING_STAKES_DROUGHT_RUN (run-based × purpose === 'raise_stakes' absence — Wave 677 applied the zone-cluster mode to this signal; the drought-run mode has never been applied to it).

Rules named in this wave's header:

- `PACING_CLOCK_DELTA_ZONE_CLUSTER`
- `PACING_RELATIONSHIP_DROUGHT_RUN`
- `PACING_STAKES_DROUGHT_RUN`

## Wave 733

Wave 733 additions: PACING_HIGHLIGHT_DROUGHT_RUN (run-based × dialogueHighlights absence — Waves 649/719 applied the zone-cluster and backward-cause peak modes to dialogueHighlights; the drought-run mode has never been applied to it, completing the trio), PACING_RELATIONSHIP_ZONE_CLUSTER (distribution/timing × relationshipShifts × structural thirds — Wave 663 applied the backward-cause peak mode to relationshipShifts; the zone-cluster mode has never been applied to it), PACING_CLOCK_DELTA_DROUGHT_RUN (run-based × clockDelta≠0 absence — Wave 677 applied the backward-cause peak mode to clockDelta; the drought-run mode has never been applied to it).

Rules named in this wave's header:

- `PACING_CLOCK_DELTA_DROUGHT_RUN`
- `PACING_HIGHLIGHT_DROUGHT_RUN`
- `PACING_RELATIONSHIP_ZONE_CLUSTER`

## Wave 719

Wave 719 additions (built on the shared checks library): PACING_OPEN_THREAD_ZONE_CLUSTER (distribution/timing × unresolvedClues × structural thirds — Waves 649/705 applied the drought-run and backward-cause peak modes to unresolvedClues; the zone-cluster mode has never been applied to it, completing the trio), PACING_PAYOFF_DROUGHT_RUN (run-based × payoffSetupIds absence — Waves 663/705 applied the zone-cluster and backward-cause peak modes to payoffSetupIds; the drought-run mode has never been applied to it, completing the trio), PACING_HIGHLIGHT_PEAK_UNCAUSED (single-peak isolation/backward-cause × dialogueHighlights magnitude — Wave 649 applied the zone-cluster mode to dialogueHighlights; the backward-cause peak mode has never been applied to it).

Rules named in this wave's header:

- `PACING_HIGHLIGHT_PEAK_UNCAUSED`
- `PACING_OPEN_THREAD_ZONE_CLUSTER`
- `PACING_PAYOFF_DROUGHT_RUN`

## Wave 705

Wave 705 additions (built on the shared checks library): PACING_SEED_ZONE_CLUSTER (distribution/timing × seededClueIds × structural thirds — Waves 663/691 applied the drought-run and backward-cause peak modes to seededClueIds; the zone-cluster mode has never been applied to it, completing the trio), PACING_OPEN_THREAD_PEAK_UNCAUSED (single-peak isolation/backward-cause × unresolvedClues magnitude — Wave 649 applied the drought-run mode to unresolvedClues; the backward-cause peak mode has never been applied to it), PACING_PAYOFF_PEAK_UNCAUSED (single-peak isolation/backward-cause × payoffSetupIds magnitude — Wave 663 applied the zone-cluster mode to payoffSetupIds; the backward-cause peak mode has never been applied to it).

Rules named in this wave's header:

- `PACING_OPEN_THREAD_PEAK_UNCAUSED`
- `PACING_PAYOFF_PEAK_UNCAUSED`
- `PACING_SEED_ZONE_CLUSTER`

## Wave 691

Wave 691 additions (built on the shared checks library): PACING_SEED_PEAK_UNCAUSED (single-peak isolation/backward-cause × seededClueIds magnitude — Wave 663 applied the drought-run mode to seededClueIds; the backward-cause peak mode has never been applied to this channel), PACING_CLOCK_DROUGHT_RUN (run-based × clockRaised absence — this pass's Wave 579 hand-rolled CLOCK_ZONE_CLUSTER already audits clockRaised distributionally; the shared-library drought-run mode has never been applied to it), PACING_TURN_ZONE_CLUSTER (distribution/timing × dramaticTurn presence × structural thirds — Wave 677 applied the drought-run mode to dramaticTurn; the zone-cluster mode has never been applied to this channel).

Rules named in this wave's header:

- `CLOCK_ZONE_CLUSTER`
- `PACING_CLOCK_DROUGHT_RUN`
- `PACING_SEED_PEAK_UNCAUSED`
- `PACING_TURN_ZONE_CLUSTER`

## Wave 677

Wave 677 additions (built on the shared checks library, audit M2.2): PACING_CLOCK_DELTA_PEAK_UNCAUSED (single-peak isolation/backward-cause × clockDelta magnitude — clockDelta has only ever appeared as an OR-condition alongside clockRaised inside aftermath triggers; the backward-cause peak mode applied to it standalone for the first time), PACING_TURN_DROUGHT_RUN (run-based × dramaticTurn presence absence — dramaticTurn has only ever served as an aftermath-void trigger or hasCause condition; the drought-run mode applied to this channel for the first time), PACING_STAKES_ZONE_CLUSTER (distribution/timing × purpose === 'raise_stakes' × structural thirds — `purpose` has only ever anchored a single aftermath-flat trigger [STAKES_AFTERMATH_EMOTION_FLAT]; the zone-cluster mode applied to it for the first time).

Rules named in this wave's header:

- `PACING_CLOCK_DELTA_PEAK_UNCAUSED`
- `PACING_STAKES_ZONE_CLUSTER`
- `PACING_TURN_DROUGHT_RUN`
- `STAKES_AFTERMATH_EMOTION_FLAT`

## Wave 663

Wave 663 additions (built on the shared checks library, audit M2.2): PACING_RELATIONSHIP_PEAK_UNCAUSED (single-peak isolation/backward-cause × relationshipShifts magnitude — the scene with the most simultaneous bond changes has no dramatic turn or revelation in itself or the two scenes before it; distinct from the existing SUSPENSE/EMOTIONAL/CURIOSITY/PAYOFF/STAGING_PEAK_UNCAUSED family, none of which audit the relational channel), PACING_SEED_DROUGHT_RUN (run-based × seededClueIds absence — seededClueIds has only ever been an aftermath-flat trigger in this pass; the drought-run template applied to a sixth channel), PACING_PAYOFF_ZONE_CLUSTER (distribution/timing × payoffSetupIds × structural thirds — payoffSetupIds anchors three aftermath-flat checks and a peak-uncaused check already, but has never been cluster-audited; the zone-cluster template applied to a third channel after clock/highlight).

Rules named in this wave's header:

- `PACING_PAYOFF_ZONE_CLUSTER`
- `PACING_RELATIONSHIP_PEAK_UNCAUSED`
- `PACING_SEED_DROUGHT_RUN`

## Wave 649

Wave 649 additions (built on the shared checks library, audit M2.2): this 112-rule pass already hand-rolls the peak/drought/cluster analytical concepts extensively (four PEAK_UNCAUSED checks on suspense/emotion/curiosity/payoff, four flatline/run checks on curiosity/emotion/clock/ suspense, one zone-cluster on clock) — but never via the shared checkPeakUncaused/ checkDroughtRun/checkZoneCluster helpers, and never on the visualBeats/unresolvedClues/ dialogueHighlights channels. PACING_STAGING_PEAK_UNCAUSED (single-peak isolation/backward-cause × visualBeats magnitude — the scene with the densest physical staging has no dramatic turn or revelation in itself or the two scenes before it; distinct from the existing SUSPENSE/EMOTIONAL/CURIOSITY/PAYOFF_PEAK_UNCAUSED family, none of which audit the staging channel), PACING_OPEN_THREAD_DROUGHT_RUN (run-based × unresolvedClues absence — a 6+ consecutive-scene stretch with zero outstanding clue-debt while such scenes occur ≥3 times elsewhere; the drought/flatline-run template applied to a fifth channel after curiosity/ emotion/clock/suspense), PACING_HIGHLIGHT_ZONE_CLUSTER (distribution/timing × dialogueHighlights × structural thirds — >75% of highlighted-dialogue scenes concentrate in one third; the zone-cluster template applied to a second channel after clock).

Rules named in this wave's header:

- `PACING_HIGHLIGHT_ZONE_CLUSTER`
- `PACING_OPEN_THREAD_DROUGHT_RUN`
- `PACING_STAGING_PEAK_UNCAUSED`
- `PAYOFF_PEAK_UNCAUSED`

## Wave 635

Wave 635 additions: PACING_OPEN_THREAD_STAGING_DECOUPLED (co-occurrence/decoupling × unresolvedClues × visualBeats — first pairing of these two fields in this 109-rule pass), PACING_SEED_STAGING_AFTERMATH_VOID (sequence/aftermath × seededClueIds trigger → visualBeats absence — first pairing of these two fields), PACING_OPEN_THREAD_ZONE_IMBALANCE (underweight/bloat × unresolvedClues × four structural zones — unresolvedClues had only ever been used as an aftermath trigger [Wave 607's 7th-row extension], never zone-audited).

Rules named in this wave's header:

- `PACING_OPEN_THREAD_STAGING_DECOUPLED`
- `PACING_OPEN_THREAD_ZONE_IMBALANCE`
- `PACING_SEED_STAGING_AFTERMATH_VOID`

## Wave 621

Wave 621 additions: PACING_DIALOGUE_HIGHLIGHT_ZONE_IMBALANCE (underweight/bloat × dialogueHighlights × four structural zones — first use of dialogueHighlights anywhere in this 106-rule pass), PACING_PAYOFF_STAGING_DECOUPLED (co-occurrence/decoupling × payoffSetupIds × visualBeats — first use of visualBeats anywhere in this pass), REVELATION_AFTERMATH_STAGING_FLAT (sequence/aftermath × visualBeats × revelation trigger — a 4th channel added to the revelation row of the trigger×channel aftermath matrix, alongside suspense/curiosity/emotion).

Rules named in this wave's header:

- `PACING_DIALOGUE_HIGHLIGHT_ZONE_IMBALANCE`
- `PACING_PAYOFF_STAGING_DECOUPLED`
- `REVELATION_AFTERMATH_STAGING_FLAT`

## Wave 607

Wave 607 additions: OPEN_THREAD_AFTERMATH_SUSPENSE_FLAT, OPEN_THREAD_AFTERMATH_CURIOSITY_FLAT, OPEN_THREAD_AFTERMATH_EMOTION_FLAT (sequence/aftermath × suspense/curiosity/emotion × heavy unresolved-clue-debt trigger — a 7th trigger row added to the aftermath matrix Wave 593 called complete at 6 triggers; first use of the unresolvedClues field anywhere in this 103-rule pass).

Rules named in this wave's header:

- `OPEN_THREAD_AFTERMATH_CURIOSITY_FLAT`
- `OPEN_THREAD_AFTERMATH_EMOTION_FLAT`
- `OPEN_THREAD_AFTERMATH_SUSPENSE_FLAT`

## Wave 579

Wave 579 additions: payoff peak uncaused (backward-cause × payoff channel × single-peak — n≥8, ≥2 payoff scenes, the peak payoff scene [most payoffSetupIds] has no revelation/turn/clock in itself or prior 2 scenes; completes the backward-cause family alongside suspense/emotional/ curiosity peak uncaused), suspense closing zone absent (zone presence/absence × suspense × closing structural third — n≥9, ≥3 suspense scenes, none in final third; tension engine silent when it should be highest; distinct from SUSPENSE_EARLY_PEAK [relative comparison] and SUSPENSE_FLATLINE_RUN [run-based]; first zone-absence check on the suspense channel), clock zone cluster (distribution/timing × clock × structural zone concentration — n≥9, ≥3 clock scenes, >75% concentrated in one third; urgency isolated in one act not escalating; distinct from CLOCK_PRESSURE_RUN [run-based adjacency] and CURIOSITY_FRONTLOAD [different channel]).

Rules named in this wave's header:

- `CLOCK_PRESSURE_RUN`
- `SUSPENSE_FLATLINE_RUN`

## Wave 551

Wave 551 additions: turn aftermath suspense flat (sequence/aftermath × suspense × dramatic-turn trigger — n≥8, ≥3 dramatic-turn scenes not in last 2 positions, avg next-scene suspenseDelta ≤ 0; story pivots never accelerate tension in what immediately follows; completes the dramatic-turn-aftermath family alongside curiosity and emotion; distinct from all clock/revelation/payoff aftermath checks which use different triggers), turn aftermath curiosity flat (sequence/aftermath × curiosity × dramatic-turn trigger — n≥8, ≥3 dramatic-turn scenes not in last 2 positions, every turn followed by 2 scenes with curiosityDelta ≤ 0; pivots never ignite wondering in what follows; distinct from REVELATION_CURIOSITY_AFTERMATH_FLAT [revelation trigger] and CLOCK_AFTERMATH_CURIOSITY_FLAT [clock trigger]; first aftermath × curiosity check on dramatic-turn trigger), turn aftermath emotion flat (sequence/aftermath × emotion × dramatic-turn trigger — n≥8, ≥3 dramatic-turn scenes not in last 2 positions, every turn followed by 2 emotionally neutral scenes; pivots never register in the protagonist's felt state; distinct from CLOCK_AFTERMATH_EMOTION_FLAT and REVELATION_EMOTIONAL_AFTERMATH_FLAT which use different triggers; completes the turn-aftermath family and the three remaining emotion-aftermath cells across the full trigger set).

Rules named in this wave's header:

- `CLOCK_AFTERMATH_EMOTION_FLAT`
- `REVELATION_CURIOSITY_AFTERMATH_FLAT`

## Wave 523

Wave 523 additions: clock aftermath emotion flat (sequence/aftermath × emotion × clock trigger — n≥8, ≥3 clockRaised scenes not in last 2 positions, every clockRaised scene followed by 2 emotionally neutral scenes; deadlines never register in the protagonist's felt state; completes the clock-aftermath family alongside clock→suspense and clock→curiosity; distinct from REVELATION_EMOTIONAL_AFTERMATH_FLAT which uses a revelation trigger and SUSPENSE_EMOTIONAL_AFTERMATH_FLAT which uses a suspense trigger), payoff aftermath emotion flat (sequence/aftermath × emotion × payoff trigger — n≥8, ≥3 payoff scenes not in last 2 positions, every payoff scene followed by 2 emotionally neutral scenes; thread resolutions never register in felt state; extends the payoff-aftermath family from payoff→curiosity to payoff→emotion; distinct from all existing aftermath×emotion checks which use revelation or suspense as the trigger), payoff aftermath suspense flat (sequence/aftermath × suspense × payoff trigger — n≥8, ≥3 payoff scenes not in last 2 positions, avg suspenseDelta of immediately following scene ≤ 0; callbacks never generate forward tension; adds the suspense channel to the payoff-aftermath family alongside payoff→curiosity; distinct from PAYOFF_SUSPENSE_DECOUPLED which is co-occurrence in the same scene and from CLOCK_AFTERMATH_SUSPENSE_FLAT / REVELATION_SUSPENSE_AFTERMATH_FLAT which use different triggers).

Rules named in this wave's header:

- `PAYOFF_SUSPENSE_DECOUPLED`
- `REVELATION_EMOTIONAL_AFTERMATH_FLAT`

## Wave 509

Wave 509 additions: suspense flatline run (5+ consecutive scenes with suspenseDelta ≤ 0 while ≥3 positive-suspense scenes exist elsewhere — the tension engine goes dark for a sustained local stretch; run-based × suspense channel, completing the flatline-run family alongside CURIOSITY_FLATLINE_RUN and EMOTIONAL_FLATLINE_RUN), payoff suspense decoupled (≥3 payoff and ≥3 high-suspense scenes never coinciding — callbacks never land inside tension and tension never has semantic resonance; co-occurrence/decoupling × payoff × suspense, first payoff-channel entry in the decoupling family distinct from the curiosity/emotion/suspense entries), payoff aftermath curiosity flat (≥3 payoff scenes none followed by curiosity rise in next 2 scenes — resolved setups never open new questions downstream; sequence/aftermath × curiosity × payoff trigger, first payoff-trigger entry in the curiosity-aftermath family, distinct from CURIOSITY_AFTERMATH_FLAT which uses the high-suspense trigger and CLOCK_AFTERMATH_CURIOSITY_FLAT which uses the clock trigger).

Rules named in this wave's header:

- `CLOCK_AFTERMATH_CURIOSITY_FLAT`
- `EMOTIONAL_FLATLINE_RUN`

## Wave 495

Wave 495 additions: clock aftermath curiosity flat (≥3 clock-raising scenes none followed by curiosity rise in next 2 scenes — deadlines never open new questions downstream; sequence/aftermath × curiosity × clock trigger, extending the aftermath family to the clock × curiosity cross-channel, distinct from CLOCK_AFTERMATH_SUSPENSE_FLAT which uses the suspense channel and CURIOSITY_AFTERMATH_FLAT which uses the high-suspense trigger), revelation emotional aftermath flat (≥3 revelation scenes none followed by emotional shift in next 2 scenes — disclosures never register in characters' feelings; sequence/aftermath × emotional × revelation trigger, completing the aftermath grid for the revelation trigger, distinct from REVELATION_SUSPENSE_AFTERMATH_FLAT which uses the suspense channel and SUSPENSE_EMOTIONAL_AFTERMATH_FLAT which uses the suspense trigger), curiosity peak uncaused (the single highest-curiosity scene has no revelation, dramatic turn, or clock event in itself or either prior scene — the story's greatest question-raise arrives without informational cause; backward-cause × curiosity peak, third backward-cause check completing the peak-cause family alongside SUSPENSE_PEAK_UNCAUSED and EMOTIONAL_PEAK_UNCAUSED).

Rules named in this wave's header:

- `CLOCK_AFTERMATH_SUSPENSE_FLAT`
- `EMOTIONAL_PEAK_UNCAUSED`
- `REVELATION_SUSPENSE_AFTERMATH_FLAT`
- `SUSPENSE_EMOTIONAL_AFTERMATH_FLAT`
- `SUSPENSE_PEAK_UNCAUSED`

## Wave 453

Wave 453 additions: emotional flatline run (5+ consecutive scenes with neutral emotionalShift while ≥3 emotional scenes exist elsewhere — the feeling register goes dark locally; run-based × emotional channel, completing the flatline-run family alongside CURIOSITY_FLATLINE_RUN), suspense emotional aftermath flat (no high-suspense scene followed by emotional shift in next 2 scenes — danger has no human aftershock; sequence/aftermath × emotional × suspense-peak trigger, completing the suspense-aftermath family alongside CURIOSITY_AFTERMATH_FLAT), suspense emotion decoupled (≥3 high-suspense and ≥3 emotional scenes never coinciding — danger and feeling always in separate scenes; co-occurrence × suspense × emotional channel, completing the co-occurrence family alongside SUSPENSE_CURIOSITY_DECOUPLED).

Rules named in this wave's header:

- `CURIOSITY_AFTERMATH_FLAT`
- `CURIOSITY_FLATLINE_RUN`

## Wave 439

Wave 439 additions: suspense curiosity decoupled (high-suspense scenes — suspenseDelta>1 — and high-curiosity scenes — curiosityDelta>0 — never coincide even though both exist in the story; the two forward-pull engines always fire in separate scenes; co-occurrence/decoupling × dual-channel, distinct from all existing zone/distribution/run checks), curiosity flatline run (5+ consecutive scenes all have curiosityDelta ≤ 0 while positive-curiosity scenes exist elsewhere — the question-engine goes dark for a sustained local stretch; run-based × curiosity channel, distinct from CURIOSITY_FRONTLOAD which checks the first-half proportion), curiosity aftermath flat (no high-suspense scene — suspenseDelta>1 — is followed within 2 scenes by a curiosity rise — curiosityDelta>0 — tension peaks never open new questions downstream; sequence/aftermath × curiosity triggered by suspense peak, distinct from SUSPENSE_CURIOSITY_DECOUPLED by testing the sequential aftermath relationship rather than same-scene coincidence).

Rules named in this wave's header:

- `CURIOSITY_FRONTLOAD`
- `SUSPENSE_CURIOSITY_DECOUPLED`

## Wave 425

Wave 425 additions: scene expansion run (5+ consecutive scenes each strictly longer than the prior — a sustained lengthening that mirrors SCENE_COMPRESSION_SPIRAL's shrinking run; the story balloons across the stretch when it should be compressing toward the climax), suspense midpoint trough (the structural midpoint scene's suspenseDelta falls below BOTH the first-half and second-half average while both averages are positive — the story's gear-change moment is a valley between two zones of energy rather than a pivot), curiosity frontload (>65% of all positive-curiosityDelta scenes sit in the first half — the mystery engine runs hot in setup but stalls through complication and climax, starving the back half of the forward-pull it needs most).

Rules named in this wave's header:

- `SCENE_COMPRESSION_SPIRAL`

## Wave 411

Wave 411 additions: suspense peak scene bloat (the single highest-suspense scene runs above 1.5× overall — the tensest beat sprawls and loses its grip; complement of SUSPENSE_PEAK_SCENE_UNDERWEIGHT), resolution bloat (the final resolution scene runs above 2× overall — the "long goodbye" that overstays the climax; complement of RESOLUTION_TOO_BRIEF), opening scene underweight (the first scene runs below 50% overall — too brief to establish world, tone, or character before the story moves; complement of OPENING_SCENE_BLOAT).

Rules named in this wave's header:

- `OPENING_SCENE_BLOAT`
- `RESOLUTION_TOO_BRIEF`
- `SUSPENSE_PEAK_SCENE_UNDERWEIGHT`

## Unattributed (no explicit wave-header mention)

These rule constants exist in this pass but were not found, by exact-name match, inside any "Wave N —" / "Wave N additions:" header entry in the file — typically because they predate that convention hardening, or the header describes the check descriptively rather than by constant name (e.g. "talking heads" rather than `TALKING_HEADS`). Listed here honestly rather than guessed into a wave, with the nearest preceding in-code "── section title ──" comment as the best-available substitute context where one exists.

- `ACT_TRANSITION_JOLT` — Wave 232: Pacing spike scene, peak length misplaced, act-transition jolt
- `ACT1_OVEREXTENDED` — Wave 260: Opening scene bloat, Act 1 overextended, short-scene flood
- `ACT1_TOO_LONG` — Act-level pacing: Act 1 too long, Act 3 too short
- `ACT2_DEAD_WEIGHT` — Wave 200: Compression spiral, Act 2 dead weight, late expansion
- `ACT2_PACING_VALLEY` — Wave 246: Act 2 pacing valley, climax scene undersized, midpoint bloat
- `ACT2_PAGE_WEIGHT` — Wave 274: ACT2_PAGE_WEIGHT
- `ACT3_PAGE_OVERRUN` — Wave 274: ACT3_PAGE_OVERRUN
- `ACT3_TOO_SHORT` — Act-level pacing: Act 1 too long, Act 3 too short
- `CLIMAX_NO_AFTERMATH` — CLIMAX_NO_AFTERMATH
- `CLIMAX_RUNWAY_OVERLONG` — Wave 189: Velocity drop, climax runway, resolution bloat
- `CLIMAX_SCENE_UNDERSIZED` — Wave 246: Act 2 pacing valley, climax scene undersized, midpoint bloat
- `CLIMAX_SCENE_UNDERWEIGHT` — Wave 157: Climax underweight, midpoint collapse, resolution brevity
- `CLOCK_SCENE_PACING_MISMATCH` — Wave 316: REVELATION_SCENE_UNDERWEIGHT, PACING_CURIOSITY_MIDZONE_GAP, CLOCK_SCENE_PACING_MISMATCH
- `CLOCK_SCENE_UNDERWEIGHT` — Wave 369: CLOCK_SCENE_UNDERWEIGHT, REVELATION_SCENE_BLOAT, PAYOFF_SCENE_BLOAT
- `COMPRESSED_TURNING_POINT` — Scenes that are disproportionately long
- `CONFLICT_SCENE_BLOAT` — Wave 383: CONFLICT_SCENE_BLOAT, DRAMATIC_TURN_SCENE_BLOAT, EMOTIONAL_PEAK_SCENE_BLOAT
- `CONFLICT_SCENE_UNDERWEIGHT` — Wave 341: CONFLICT_SCENE_UNDERWEIGHT, CURIOSITY_PEAK_SCENE_UNDERWEIGHT, QUIET_SCENE_BLOAT
- `CURIOSITY_PEAK_SCENE_BLOAT` — Wave 397: SEED_SCENE_UNDERWEIGHT, STAKES_SCENE_BLOAT, CURIOSITY_PEAK_SCENE_BLOAT
- `CURIOSITY_PEAK_SCENE_UNDERWEIGHT` — Wave 341: CONFLICT_SCENE_UNDERWEIGHT, CURIOSITY_PEAK_SCENE_UNDERWEIGHT, QUIET_SCENE_BLOAT
- `DRAMATIC_TURN_SCENE_BLOAT` — Wave 383: CONFLICT_SCENE_BLOAT, DRAMATIC_TURN_SCENE_BLOAT, EMOTIONAL_PEAK_SCENE_BLOAT
- `DRAMATIC_TURN_SCENE_UNDERWEIGHT` — Wave 327: DRAMATIC_TURN_SCENE_UNDERWEIGHT, PAYOFF_SCENE_UNDERWEIGHT, EMOTIONAL_PEAK_SCENE_UNDERWEIGHT
- `EMOTIONAL_CURIOSITY_DECOUPLED` — Wave 467: REVELATION_SUSPENSE_AFTERMATH_FLAT, CLOCK_PRESSURE_RUN, EMOTIONAL_CURIOSITY_DECOUPLED
- `EMOTIONAL_PEAK_SCENE_BLOAT` — Wave 383: CONFLICT_SCENE_BLOAT, DRAMATIC_TURN_SCENE_BLOAT, EMOTIONAL_PEAK_SCENE_BLOAT
- `EMOTIONAL_PEAK_SCENE_UNDERWEIGHT` — Wave 327: DRAMATIC_TURN_SCENE_UNDERWEIGHT, PAYOFF_SCENE_UNDERWEIGHT, EMOTIONAL_PEAK_SCENE_UNDERWEIGHT
- `ENDING_ON_PEAK` — Wave 302: ENDING_ON_PEAK
- `ENERGY_PLACEMENT_MISMATCH` — Wave 143: Energy monotone & rhythm variety
- `LATE_EXPANSION` — Wave 200: Compression spiral, Act 2 dead weight, late expansion
- `LONG_SCENE_FLOOD` — Wave 274: LONG_SCENE_FLOOD
- `MIDPOINT_BLOAT` — Wave 246: Act 2 pacing valley, climax scene undersized, midpoint bloat
- `MIDPOINT_COLLAPSE` — Wave 157: Climax underweight, midpoint collapse, resolution brevity
- `NET_TENSION_DEFICIT` — Wave 302: NET_TENSION_DEFICIT
- `OPENING_SCENE_UNDERWEIGHT` — Wave 411: SUSPENSE_PEAK_SCENE_BLOAT, RESOLUTION_BLOAT, OPENING_SCENE_UNDERWEIGHT
- `OVERLONG_LOW_TENSION` — Scenes that are disproportionately long
- `PACE_DECELERATION_TREND` — Wave 200: Compression spiral, Act 2 dead weight, late expansion
- `PACING_CURIOSITY_FINAL_DROP` — Wave 288: PACING_CURIOSITY_FINAL_DROP
- `PACING_CURIOSITY_MIDZONE_GAP` — Wave 316: REVELATION_SCENE_UNDERWEIGHT, PACING_CURIOSITY_MIDZONE_GAP, CLOCK_SCENE_PACING_MISMATCH
- `PACING_CURIOSITY_OPENING_FLATLINE` — Wave 288: PACING_CURIOSITY_OPENING_FLATLINE
- `PACING_SPIKE_SCENE` — Wave 232: Pacing spike scene, peak length misplaced, act-transition jolt
- `PACING_SUSPENSE_EARLY_PEAK` — Wave 288: PACING_SUSPENSE_EARLY_PEAK
- `PAGE_SPACE_INEQUALITY` — Wave 200: Compression spiral, Act 2 dead weight, late expansion
- `PAYOFF_AFTERMATH_CURIOSITY_FLAT` — Wave 509: SUSPENSE_FLATLINE_RUN, PAYOFF_SUSPENSE_DECOUPLED, PAYOFF_AFTERMATH_CURIOSITY_FLAT
- `PAYOFF_AFTERMATH_EMOTION_FLAT` — Wave 523 checks
- `PAYOFF_AFTERMATH_SUSPENSE_FLAT` — Wave 523 checks
- `PAYOFF_OPENING_ZONE_ABSENT` — Wave 523 checks
- `PAYOFF_SCENE_BLOAT` — Wave 369: CLOCK_SCENE_UNDERWEIGHT, REVELATION_SCENE_BLOAT, PAYOFF_SCENE_BLOAT
- `PAYOFF_SCENE_UNDERWEIGHT` — Wave 327: DRAMATIC_TURN_SCENE_UNDERWEIGHT, PAYOFF_SCENE_UNDERWEIGHT, EMOTIONAL_PEAK_SCENE_UNDERWEIGHT
- `PEAK_LENGTH_MISPLACED` — Wave 232: Pacing spike scene, peak length misplaced, act-transition jolt
- `POST_RELEASE_DEAD_AIR` — Wave 302: POST_RELEASE_DEAD_AIR
- `QUIET_SCENE_BLOAT` — Wave 341: CONFLICT_SCENE_UNDERWEIGHT, CURIOSITY_PEAK_SCENE_UNDERWEIGHT, QUIET_SCENE_BLOAT
- `RESOLUTION_BLOAT` — Wave 411: SUSPENSE_PEAK_SCENE_BLOAT, RESOLUTION_BLOAT, OPENING_SCENE_UNDERWEIGHT
- `RESOLUTION_SCENE_BLOAT` — Wave 189: Velocity drop, climax runway, resolution bloat
- `REVELATION_SCENE_BLOAT` — Wave 369: CLOCK_SCENE_UNDERWEIGHT, REVELATION_SCENE_BLOAT, PAYOFF_SCENE_BLOAT
- `REVELATION_SCENE_UNDERWEIGHT` — Wave 316: REVELATION_SCENE_UNDERWEIGHT, PACING_CURIOSITY_MIDZONE_GAP, CLOCK_SCENE_PACING_MISMATCH
- `RHYTHM_INVERSION` — Wave 143: Energy monotone & rhythm variety
- `RHYTHMIC_ALTERNATION_ABSENT` — Wave 200: Compression spiral, Act 2 dead weight, late expansion
- `SCENE_EXPANSION_RUN` — Wave 425: SCENE_EXPANSION_RUN, SUSPENSE_MIDPOINT_TROUGH, CURIOSITY_FRONTLOAD
- `SCENE_VELOCITY_DROP` — Wave 189: Velocity drop, climax runway, resolution bloat
- `SEED_AFTERMATH_CURIOSITY_FLAT` — Wave 523 checks
- `SEED_AFTERMATH_EMOTION_FLAT` — Wave 523 checks
- `SEED_AFTERMATH_SUSPENSE_FLAT` — Wave 523 checks
- `SEED_SCENE_BLOAT` — Wave 355: SUSPENSE_PEAK_SCENE_UNDERWEIGHT, SEED_SCENE_BLOAT, STAKES_SCENE_UNDERWEIGHT
- `SEED_SCENE_UNDERWEIGHT` — Wave 397: SEED_SCENE_UNDERWEIGHT, STAKES_SCENE_BLOAT, CURIOSITY_PEAK_SCENE_BLOAT
- `SHORT_SCENE_FLOOD` — Wave 260: Opening scene bloat, Act 1 overextended, short-scene flood
- `STAKES_AFTERMATH_CURIOSITY_FLAT` — Wave 579:
- `STAKES_AFTERMATH_SUSPENSE_FLAT` — Wave 579:
- `STAKES_SCENE_BLOAT` — Wave 397: SEED_SCENE_UNDERWEIGHT, STAKES_SCENE_BLOAT, CURIOSITY_PEAK_SCENE_BLOAT
- `STAKES_SCENE_UNDERWEIGHT` — Wave 355: SUSPENSE_PEAK_SCENE_UNDERWEIGHT, SEED_SCENE_BLOAT, STAKES_SCENE_UNDERWEIGHT
- `SUSPENSE_EMOTION_DECOUPLED` — Wave 453: EMOTIONAL_FLATLINE_RUN, SUSPENSE_EMOTIONAL_AFTERMATH_FLAT, SUSPENSE_EMOTION_DECOUPLED
- `SUSPENSE_LENGTH_DECOUPLING` — Wave 172: Plateau, opening bloat, suspense/length decoupling
- `SUSPENSE_MIDPOINT_TROUGH` — Wave 425: SCENE_EXPANSION_RUN, SUSPENSE_MIDPOINT_TROUGH, CURIOSITY_FRONTLOAD
- `SUSPENSE_PEAK_SCENE_BLOAT` — Wave 411: SUSPENSE_PEAK_SCENE_BLOAT, RESOLUTION_BLOAT, OPENING_SCENE_UNDERWEIGHT
- `TURN_AFTERMATH_CURIOSITY_FLAT` — Wave 523 checks
- `TURN_AFTERMATH_EMOTION_FLAT` — Wave 523 checks
- `TURN_AFTERMATH_SUSPENSE_FLAT` — Wave 523 checks

