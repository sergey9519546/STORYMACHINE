# Pass: `conflict`

Founding wave: 39. Total distinct rules: 233 (165 attributed to a specific wave, 68 unattributed — see docs/rulebook/README.md's methodology note).

## Wave 1186

Wave 1186 additions (Program v2, Type 1 — signal channel, closes cycle 1): fountain-analyzer.ts's new power-balance signal (powerHolder/powerBalance/powerFlipped — who holds conversational control in a scene, distinct from relationshipShifts' valence axis and from Wave 1182's question-resolution-timing axis) gets its first 3 consumers, placed here because conflict is precisely "who contests whom." CONFLICT_POWER_STATIC_FLATLINE (average/aggregate mode) catches a story whose control never once changes hands; CONFLICT_CLIMAX_UNCONTESTED (zone mode) catches a final act that coasts, uncontested, even when earlier acts prove the story can stage a flip; CONFLICT_INTERROGATION_MONOPOLY (co-occurrence mode, joining Wave 1182's questionsRaised with this wave's powerHolder) catches one character always running the room even under direct interrogation pressure. See the block comment immediately above these three rules for the full distinctness rationale and guard conditions.

Rules named in this wave's header:

- `CONFLICT_CLIMAX_UNCONTESTED`
- `CONFLICT_INTERROGATION_MONOPOLY`
- `CONFLICT_POWER_STATIC_FLATLINE`

## Wave 1178

Wave 1178 additions (continues the pivot to distinct analytical modes begun in dialogue.ts Wave 1176): this pass had already exhausted co-occurrence/decoupling (15 rules covering nearly every trigger against the compound conflict/rupture/repair signals) and backward-cause (checkPeakUncaused on 9 channels), so mining either further risked duplicating an existing rule. Distribution/timing was the real gap: only two channels (curiosity, repair) had ever been front/back-loading checked, both via hand-rolled code, never through the shared checkHalfLoaded helper — the first use of that helper in this file. CONFLICT_STAGING_BACK_LOADED, CONFLICT_SUSPENSE_FRONT_LOADED, and CONFLICT_EMOTION_BACK_LOADED give visualBeats, suspenseDelta, and emotionalShift their first distribution/timing checks in this pass.

Rules named in this wave's header:

- `CONFLICT_EMOTION_BACK_LOADED`
- `CONFLICT_STAGING_BACK_LOADED`
- `CONFLICT_SUSPENSE_FRONT_LOADED`

## Wave 1164

Wave 1164 additions: after Wave 1150, revelation stood at five of six channels, missing only dialogueHighlights. CONFLICT_REVELATION_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID gives it its sixth and final channel, completing full six-channel saturation for every existing trigger in this pass. With those exhausted, this wave introduces suspenseDelta as a genuinely fresh checkAftermathVoid trigger — it has only ever appeared as an aftermath channel or a compound negative-conflict signal in this file, never as the isTrigger side of a check. CONFLICT_SUSPENSE_EMOTIONAL_AFTERMATH_VOID pairs suspenseDelta with emotionalShift; CONFLICT_SUSPENSE_CURIOSITY_AFTERMATH_VOID pairs it with curiosityDelta.

Rules named in this wave's header:

- `CONFLICT_REVELATION_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID`
- `CONFLICT_SUSPENSE_CURIOSITY_AFTERMATH_VOID`
- `CONFLICT_SUSPENSE_EMOTIONAL_AFTERMATH_VOID`

## Wave 1150

Wave 1150 additions: after Wave 1136, clockRaised stood at four of six standard channels (suspenseDelta, curiosityDelta, emotionalShift, relationshipShifts) and revelation at four (curiosityDelta, emotionalShift, suspenseDelta, relationshipShifts). CONFLICT_CLOCK_STAGING_AFTERMATH_VOID and CONFLICT_CLOCK_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID give clockRaised its fifth and sixth channels (visualBeats, dialogueHighlights), completing full six-channel saturation for this trigger. CONFLICT_REVELATION_STAGING_AFTERMATH_VOID gives revelation its fifth channel (visualBeats).

Rules named in this wave's header:

- `CONFLICT_CLOCK_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID`
- `CONFLICT_CLOCK_STAGING_AFTERMATH_VOID`
- `CONFLICT_REVELATION_STAGING_AFTERMATH_VOID`

## Wave 1136

Wave 1136 additions: revelation was at three of six channels (curiosityDelta, emotionalShift, suspenseDelta) and clockRaised at two (suspenseDelta, curiosityDelta). CONFLICT_REVELATION_RELATIONAL_AFTERMATH_VOID gives revelation its fourth channel (relationshipShifts); CONFLICT_CLOCK_EMOTIONAL_AFTERMATH_VOID and CONFLICT_CLOCK_RELATIONAL_AFTERMATH_VOID give clockRaised its third and fourth channels (emotionalShift, relationshipShifts).

Rules named in this wave's header:

- `CONFLICT_CLOCK_EMOTIONAL_AFTERMATH_VOID`
- `CONFLICT_CLOCK_RELATIONAL_AFTERMATH_VOID`
- `CONFLICT_REVELATION_RELATIONAL_AFTERMATH_VOID`

## Wave 1122

Wave 1122 additions: revelation and clockRaised each had exactly one checkAftermathVoid channel as of Wave 1108. CONFLICT_REVELATION_EMOTIONAL_AFTERMATH_VOID and CONFLICT_REVELATION_SUSPENSE_AFTERMATH_VOID give revelation its second and third channels (emotionalShift, suspenseDelta); CONFLICT_CLOCK_CURIOSITY_AFTERMATH_VOID gives clockRaised its second channel (curiosityDelta) — distinct from the non-standard hand-rolled CONFLICT_CLOCK_AFTERMATH_VOID (Wave 450: compound negative-conflict-signal channel, not a positive curiosityDelta rise) and CONFLICT_CLOCK_TURN_AFTERMATH_VOID (Wave 590: dramaticTurn as the aftermath channel, not curiosityDelta).

Rules named in this wave's header:

- `CONFLICT_CLOCK_CURIOSITY_AFTERMATH_VOID`
- `CONFLICT_CLOCK_TURN_AFTERMATH_VOID`
- `CONFLICT_REVELATION_EMOTIONAL_AFTERMATH_VOID`
- `CONFLICT_REVELATION_SUSPENSE_AFTERMATH_VOID`

## Wave 1108

Wave 1108 additions: CONFLICT_SEED_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID gives seededClueIds its sixth and final channel (previously paired with curiosityDelta/emotionalShift/ relationshipShifts/visualBeats, plus the hand-rolled Wave-590 suspenseDelta pairing, now also paired with dialogueHighlights), completing full saturation for all five of this pass's tracked triggers. With those exhausted, this wave introduces two triggers as fresh checkAftermathVoid subjects for the first time — revelation and clockRaised have only ever anchored distribution/timing (zone-imbalance/zone-cluster) checks here, never sequence/ aftermath: CONFLICT_REVELATION_CURIOSITY_AFTERMATH_VOID pairs revelation with curiosityDelta, and CONFLICT_CLOCK_SUSPENSE_AFTERMATH_VOID pairs clockRaised with suspenseDelta.

Rules named in this wave's header:

- `CONFLICT_CLOCK_SUSPENSE_AFTERMATH_VOID`
- `CONFLICT_REVELATION_CURIOSITY_AFTERMATH_VOID`
- `CONFLICT_SEED_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID`

## Wave 1094

Wave 1094 additions: with all four main triggers fully saturated since Wave 1080, this wave continues building out seededClueIds' checkAftermathVoid channel set (currently just curiosityDelta, plus the separately-implemented hand-rolled CONFLICT_SEED_SUSPENSE_AFTERMATH_VOID from Wave 590) — CONFLICT_SEED_EMOTIONAL_AFTERMATH_VOID (emotionalShift), CONFLICT_SEED_RELATIONAL_AFTERMATH_VOID (relationshipShifts), and CONFLICT_SEED_STAGING_AFTERMATH_VOID (visualBeats) give this trigger three fresh channels.

Rules named in this wave's header:

- `CONFLICT_SEED_EMOTIONAL_AFTERMATH_VOID`
- `CONFLICT_SEED_RELATIONAL_AFTERMATH_VOID`
- `CONFLICT_SEED_STAGING_AFTERMATH_VOID`

## Wave 1080

Wave 1080 additions: with raise_stakes, payoffSetupIds, and heavy unresolvedClues debt all now fully saturated, this wave closes out dramaticTurn's remaining two channels — CONFLICT_TURN_SUSPENSE_AFTERMATH_VOID (previously paired with visualBeats/curiosityDelta/emotionalShift/ relationshipShifts, now also paired with suspenseDelta) and CONFLICT_TURN_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID (now also paired with dialogueHighlights), bringing all four main triggers to full six-channel saturation. The third check, CONFLICT_SEED_CURIOSITY_AFTERMATH_VOID, gives seededClueIds its first checkAftermathVoid-based sequence/aftermath pairing with curiosityDelta — distinct from the existing hand-rolled CONFLICT_SEED_SUSPENSE_AFTERMATH_VOID (Wave 590, same trigger paired with suspenseDelta via a different implementation).

Rules named in this wave's header:

- `CONFLICT_SEED_CURIOSITY_AFTERMATH_VOID`
- `CONFLICT_SEED_SUSPENSE_AFTERMATH_VOID`
- `CONFLICT_TURN_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID`
- `CONFLICT_TURN_SUSPENSE_AFTERMATH_VOID`

## Wave 1066

Wave 1066 additions: raise_stakes, payoffSetupIds, and heavy unresolvedClues debt each reach full six-channel saturation: CONFLICT_STAKES_STAGING_AFTERMATH_VOID (raise_stakes, previously paired with curiosityDelta/suspenseDelta/emotionalShift/relationshipShifts/dialogueHighlights, now also paired with visualBeats — its only remaining standard channel), CONFLICT_PAYOFF_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID (payoffSetupIds, previously paired with emotionalShift/ suspenseDelta/curiosityDelta/relationshipShifts/visualBeats, now also paired with dialogueHighlights — its only remaining standard channel), and CONFLICT_OPEN_THREAD_SUSPENSE_AFTERMATH_VOID (heavy unresolvedClues debt, previously paired with relationshipShifts/ visualBeats/curiosityDelta/emotionalShift/dialogueHighlights, now also paired with suspenseDelta — its only remaining standard channel).

Rules named in this wave's header:

- `CONFLICT_OPEN_THREAD_SUSPENSE_AFTERMATH_VOID`
- `CONFLICT_PAYOFF_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID`
- `CONFLICT_STAKES_STAGING_AFTERMATH_VOID`

## Wave 1052

Wave 1052 additions: with all four main triggers (raise_stakes, payoffSetupIds, dramaticTurn, unresolvedClues) now at four checkAftermathVoid channels each, this wave extends three of them to a fifth channel using fields never paired with them before: CONFLICT_STAKES_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID (raise_stakes, first pairing with dialogueHighlights), CONFLICT_PAYOFF_STAGING_AFTERMATH_VOID (payoffSetupIds, first pairing with visualBeats — dramaticTurn and unresolvedClues already carry this channel), and CONFLICT_OPEN_THREAD_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID (heavy unresolvedClues debt, first pairing with dialogueHighlights).

Rules named in this wave's header:

- `CONFLICT_OPEN_THREAD_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID`
- `CONFLICT_PAYOFF_STAGING_AFTERMATH_VOID`
- `CONFLICT_STAKES_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID`

## Wave 1038

Wave 1038 additions: with raise_stakes now at four channels, this wave targets the less-saturated triggers instead: CONFLICT_OPEN_THREAD_EMOTIONAL_AFTERMATH_VOID (heavy unresolvedClues debt, previously paired with relationshipShifts/visualBeats/curiosityDelta, now a fourth channel with emotionalShift), CONFLICT_TURN_RELATIONAL_AFTERMATH_VOID (dramaticTurn, previously paired with visualBeats/curiosityDelta/emotionalShift, now a fourth channel with relationshipShifts), and CONFLICT_PAYOFF_RELATIONAL_AFTERMATH_VOID (payoffSetupIds, previously paired with emotionalShift/suspenseDelta/curiosityDelta, now a fourth channel with relationshipShifts).

Rules named in this wave's header:

- `CONFLICT_OPEN_THREAD_EMOTIONAL_AFTERMATH_VOID`
- `CONFLICT_PAYOFF_RELATIONAL_AFTERMATH_VOID`
- `CONFLICT_TURN_RELATIONAL_AFTERMATH_VOID`

## Wave 1024

Wave 1024 additions: three more fresh channels for existing triggers: CONFLICT_STAKES_RELATIONAL_AFTERMATH_VOID (raise_stakes, previously paired with curiosityDelta/suspenseDelta/emotionalShift, now a fourth channel with relationshipShifts), CONFLICT_PAYOFF_CURIOSITY_AFTERMATH_VOID (payoffSetupIds, previously paired with emotionalShift/suspenseDelta, now a third channel with curiosityDelta), and CONFLICT_TURN_EMOTIONAL_AFTERMATH_VOID (dramaticTurn, previously paired with visualBeats/curiosityDelta, now a third channel with emotionalShift).

Rules named in this wave's header:

- `CONFLICT_PAYOFF_CURIOSITY_AFTERMATH_VOID`
- `CONFLICT_STAKES_RELATIONAL_AFTERMATH_VOID`
- `CONFLICT_TURN_EMOTIONAL_AFTERMATH_VOID`

## Wave 1010

Wave 1010 additions: this wave gives three more triggers a fresh consequence channel: CONFLICT_TURN_CURIOSITY_AFTERMATH_VOID (dramaticTurn, previously only paired with visualBeats, now paired with curiosityDelta), CONFLICT_PAYOFF_SUSPENSE_AFTERMATH_VOID (payoffSetupIds, previously only paired with emotionalShift, now paired with suspenseDelta), and CONFLICT_STAKES_EMOTIONAL_AFTERMATH_VOID (raise_stakes, previously paired with curiosityDelta and suspenseDelta, now paired with emotionalShift for a third channel).

Rules named in this wave's header:

- `CONFLICT_PAYOFF_SUSPENSE_AFTERMATH_VOID`
- `CONFLICT_STAKES_EMOTIONAL_AFTERMATH_VOID`
- `CONFLICT_TURN_CURIOSITY_AFTERMATH_VOID`

## Wave 996

Wave 996 additions: zone-imbalance is now fully exhausted (the only remaining cluster+drought pair, CONFLICT_STAGING, has inconsistent predicates — >=2 vs >0 visualBeats — confirmed again this wave, same finding as Wave 982). This wave pivots entirely to the sequence/aftermath mode with three fresh trigger/aftermath pairings via checkAftermathVoid: CONFLICT_STAKES_SUSPENSE_AFTERMATH_VOID (raise_stakes, previously only paired with curiosityDelta in Wave 982, now paired with suspenseDelta), CONFLICT_PAYOFF_EMOTIONAL_AFTERMATH_VOID (payoffSetupIds, the first use of this field as a checkAftermathVoid TRIGGER in this pass — it has only appeared as an aftermath channel or in other analytical modes before now), and CONFLICT_OPEN_THREAD_CURIOSITY_AFTERMATH_VOID (heavy unresolvedClues debt, already a trigger paired with relationshipShifts and visualBeats, now paired with curiosityDelta for a third consequence channel).

Rules named in this wave's header:

- `CONFLICT_OPEN_THREAD_CURIOSITY_AFTERMATH_VOID`
- `CONFLICT_PAYOFF_EMOTIONAL_AFTERMATH_VOID`
- `CONFLICT_STAKES_SUSPENSE_AFTERMATH_VOID`

## Wave 982

Wave 982 additions: auditing the last two clean zone-imbalance candidates in this pass — CONFLICT_EMOTION_ZONE_IMBALANCE (emotionalShift !== 'neutral', any-direction valence) and CONFLICT_HIGHLIGHT_ZONE_IMBALANCE (dialogueHighlights array) — plus, since the zone-imbalance mode is now all but exhausted, one aftermath-void pairing via the shared checkAftermathVoid helper: CONFLICT_STAKES_CURIOSITY_AFTERMATH_VOID (raise_stakes → curiosity), the first use of raise_stakes as an aftermath-void TRIGGER in this pass.

Rules named in this wave's header:

- `CONFLICT_EMOTION_ZONE_IMBALANCE`
- `CONFLICT_HIGHLIGHT_ZONE_IMBALANCE`
- `CONFLICT_STAKES_CURIOSITY_AFTERMATH_VOID`

## Wave 968

Wave 968 additions: auditing the three remaining cleanly-defined trio-complete signals in this pass, spanning three distinct classes: CONFLICT_SEED_ZONE_IMBALANCE (seededClueIds array, distinct from the audited payoff/open-thread arrays), CONFLICT_CLOCK_DELTA_ZONE_IMBALANCE (clockDelta > 0 — a delta distinct from Wave 940's curiosity one), and CONFLICT_CLOCK_ZONE_IMBALANCE (clockRaised boolean — whether a ticking clock is introduced at all, distinct from the numeric clockDelta above).

Rules named in this wave's header:

- `CONFLICT_CLOCK_DELTA_ZONE_IMBALANCE`
- `CONFLICT_CLOCK_ZONE_IMBALANCE`
- `CONFLICT_SEED_ZONE_IMBALANCE`

## Wave 954

Wave 954 additions: with conflict's valence/delta/clue-array/purpose signals now saturated by the 4-zone mode, this wave audits three remaining trio-complete signals spanning three distinct classes: CONFLICT_RELATIONSHIP_ZONE_IMBALANCE (relationshipShifts array), CONFLICT_TURN_ZONE_IMBALANCE (dramaticTurn !== 'nothing' categorical), and CONFLICT_REVELATION_ZONE_IMBALANCE (revelation string field, != null — distinct from the purpose-enum CONFLICT_REVELATION_PURPOSE one).

Rules named in this wave's header:

- `CONFLICT_RELATIONSHIP_ZONE_IMBALANCE`
- `CONFLICT_REVELATION_ZONE_IMBALANCE`
- `CONFLICT_TURN_ZONE_IMBALANCE`

## Wave 940

Wave 940 additions: continuing the checkZoneImbalance rollout, this wave extends the 4-zone mode to three more signals that each already have a complete 3-zone/run-based trio but had never been audited by it: CONFLICT_POSITIVE_EMOTION_ZONE_IMBALANCE (emotionalShift === 'positive'), CONFLICT_CURIOSITY_ZONE_IMBALANCE (curiosityDelta > 0), and CONFLICT_OPEN_THREAD_ZONE_IMBALANCE (unresolvedClues.length > 0).

Rules named in this wave's header:

- `CONFLICT_CURIOSITY_ZONE_IMBALANCE`
- `CONFLICT_OPEN_THREAD_ZONE_IMBALANCE`
- `CONFLICT_POSITIVE_EMOTION_ZONE_IMBALANCE`

## Wave 926

Wave 926 additions: continuing the checkZoneImbalance rollout, this wave applies the 4-zone bloat+empty-zone mode to three more signals that each already have a complete 3-zone/run-based trio but had never been audited by it: CONFLICT_STAKES_ZONE_IMBALANCE (purpose === 'raise_stakes'), CONFLICT_REVELATION_PURPOSE_ZONE_IMBALANCE (purpose === 'revelation', whose trio was completed in Wave 898), and CONFLICT_NEGATIVE_EMOTION_ZONE_IMBALANCE (emotionalShift === 'negative', a valence signal with a complete 3-zone/run trio).

Rules named in this wave's header:

- `CONFLICT_NEGATIVE_EMOTION_ZONE_IMBALANCE`
- `CONFLICT_REVELATION_PURPOSE_ZONE_IMBALANCE`
- `CONFLICT_STAKES_ZONE_IMBALANCE`

## Wave 912

Wave 912 additions: continuing the checkZoneImbalance rollout begun in Wave 884, this wave applies the 4-zone bloat+empty-zone mode to three more purpose values that each already have a complete 3-zone/run-based trio (checkZoneCluster + checkDroughtRun) but have never been audited by it: CONFLICT_COMPLICATE_ZONE_IMBALANCE (purpose === 'complicate'), CONFLICT_INTRODUCE_CONFLICT_ZONE_IMBALANCE (purpose === 'introduce_conflict'), and CONFLICT_CHARACTER_MOMENT_ZONE_IMBALANCE (purpose === 'character_moment').

Rules named in this wave's header:

- `CONFLICT_CHARACTER_MOMENT_ZONE_IMBALANCE`
- `CONFLICT_COMPLICATE_ZONE_IMBALANCE`
- `CONFLICT_INTRODUCE_CONFLICT_ZONE_IMBALANCE`

## Wave 898

Wave 898 additions: purpose === 'revelation' has never been referenced anywhere in this pass (the pre-existing CONFLICT_REVELATION_DROUGHT_RUN/CONFLICT_REVELATION_ZONE_CLUSTER audit the separate revelation string|null field, not this purpose enum value) -- a genuinely virgin field for all three shared-library trio modes. This wave adds CONFLICT_REVELATION_PURPOSE_ZONE_CLUSTER and CONFLICT_REVELATION_PURPOSE_DROUGHT_RUN (peak mode conventionally skipped for this categorical field), plus CONFLICT_TURNING_POINT_ZONE_IMBALANCE, continuing the checkZoneImbalance rollout begun in Wave 884: purpose === 'turning_point' already has a complete 3-zone/run-based trio (CONFLICT_TURNING_POINT_ZONE_CLUSTER, CONFLICT_TURNING_POINT_DROUGHT_RUN) but has never been audited by the 4-zone bloat+empty-zone mode.

Rules named in this wave's header:

- `CONFLICT_REVELATION_PURPOSE_DROUGHT_RUN`
- `CONFLICT_REVELATION_PURPOSE_ZONE_CLUSTER`
- `CONFLICT_TURNING_POINT_ZONE_IMBALANCE`

## Wave 884

Wave 884 additions: no purpose value has ever been audited by the distinct 4-zone checkZoneImbalance mode in this pass (only visualBeats, payoffSetupIds, and dialogueHighlights had). This wave applies it to three purpose values that already have complete 3-zone/run-based trios via checkZoneCluster/checkDroughtRun: CONFLICT_CLIMAX_ZONE_IMBALANCE (purpose === 'climax'), CONFLICT_ESTABLISH_WORLD_ZONE_IMBALANCE (purpose === 'establish_world'), and CONFLICT_RESOLUTION_ZONE_IMBALANCE (purpose === 'resolution' -- distinct from CONFLICT_RESOLUTION_PREMATURE, which checks timing relative to the climax, not distributional zone imbalance).

Rules named in this wave's header:

- `CONFLICT_CLIMAX_ZONE_IMBALANCE`
- `CONFLICT_ESTABLISH_WORLD_ZONE_IMBALANCE`
- `CONFLICT_RESOLUTION_ZONE_IMBALANCE`

## Wave 870

Wave 870 additions: CONFLICT_RESOLUTION_DROUGHT_RUN (run-based x purpose === 'resolution' absence -- completes 2 of 3 slots for this purpose value alongside the zone-cluster mode added in Wave 856; distinct from CONFLICT_RESOLUTION_PREMATURE, which checks timing relative to the climax rather than sustained absence; peak mode conventionally skipped for this categorical field), CONFLICT_COMPLICATE_ZONE_CLUSTER (distribution/timing x purpose === 'complicate' x structural thirds -- this purpose value has never been referenced anywhere in this pass; a virgin field), CONFLICT_COMPLICATE_DROUGHT_RUN (run-based x purpose === 'complicate' absence -- completes 2 of 3 slots for this purpose value alongside the zone-cluster mode added in this same wave; peak mode conventionally skipped for this categorical field).

Rules named in this wave's header:

- `CONFLICT_COMPLICATE_DROUGHT_RUN`
- `CONFLICT_COMPLICATE_ZONE_CLUSTER`
- `CONFLICT_RESOLUTION_DROUGHT_RUN`

## Wave 856

Wave 856 additions: CONFLICT_CLIMAX_DROUGHT_RUN (run-based × purpose === 'climax' absence — completes 2 of 3 slots for this purpose value alongside the zone-cluster mode added in Wave 842; peak mode conventionally skipped for this categorical field), CONFLICT_ESTABLISH_WORLD_DROUGHT_RUN (run-based × purpose === 'establish_world' absence — completes 2 of 3 slots for this purpose value alongside the zone-cluster mode added in Wave 842; peak mode conventionally skipped for this categorical field), CONFLICT_RESOLUTION_ZONE_CLUSTER (distribution/timing × purpose === 'resolution' × structural thirds — distinct from CONFLICT_RESOLUTION_PREMATURE, which checks timing relative to the climax rather than distributional clustering; a virgin standalone signal for this purpose value).

Rules named in this wave's header:

- `CONFLICT_CLIMAX_DROUGHT_RUN`
- `CONFLICT_ESTABLISH_WORLD_DROUGHT_RUN`
- `CONFLICT_RESOLUTION_PREMATURE`
- `CONFLICT_RESOLUTION_ZONE_CLUSTER`

## Wave 842

Wave 842 additions: CONFLICT_POSITIVE_EMOTION_DROUGHT_RUN (run-based × emotionalShift === 'positive' absence — completes 2 of 3 slots for this valence alongside the zone-cluster mode added in Wave 828; peak mode conventionally skipped for this categorical field), CONFLICT_ESTABLISH_WORLD_ZONE_CLUSTER (distribution/timing × purpose === 'establish_world' × structural thirds — this purpose value has never been referenced anywhere in this pass; a virgin field), CONFLICT_CLIMAX_ZONE_CLUSTER (distribution/timing × purpose === 'climax' × structural thirds — likewise a virgin field, never referenced in this pass before).

Rules named in this wave's header:

- `CONFLICT_CLIMAX_ZONE_CLUSTER`
- `CONFLICT_ESTABLISH_WORLD_ZONE_CLUSTER`
- `CONFLICT_POSITIVE_EMOTION_DROUGHT_RUN`

## Wave 828

Wave 828 additions: CONFLICT_TURNING_POINT_ZONE_CLUSTER (distribution/timing × purpose === 'turning_point' × structural thirds — this purpose value has never been referenced anywhere in this pass; distinct from CONFLICT_TURN_ZONE_CLUSTER [Wave 786], which audits the dramaticTurn free-text field, not this purpose enum value), CONFLICT_TURNING_POINT_DROUGHT_RUN (run-based × purpose === 'turning_point' absence — completes 2 of 3 slots for this purpose value alongside the zone-cluster mode added in this same wave; peak mode conventionally skipped for this categorical field), CONFLICT_POSITIVE_EMOTION_ZONE_CLUSTER (distribution/timing × emotionalShift === 'positive' × structural thirds — mirrors the negative-valence trio completed in Wave 800; the positive valence has never been isolated by any of the three shared-library trio modes in this pass).

Rules named in this wave's header:

- `CONFLICT_POSITIVE_EMOTION_ZONE_CLUSTER`
- `CONFLICT_TURNING_POINT_DROUGHT_RUN`
- `CONFLICT_TURNING_POINT_ZONE_CLUSTER`

## Wave 814

Wave 814 additions: CONFLICT_INTRODUCE_CONFLICT_DROUGHT_RUN (run-based × purpose === 'introduce_conflict' absence — completing 2 of 3 slots for this purpose value alongside the zone-cluster mode added in Wave 800; peak mode conventionally skipped for this categorical field), CONFLICT_CHARACTER_MOMENT_ZONE_CLUSTER (distribution/timing × purpose === 'character_moment' × structural thirds — this purpose value has never been referenced anywhere in this pass; none of the three shared-library trio modes has ever been applied to it), CONFLICT_CHARACTER_MOMENT_DROUGHT_RUN (run-based × purpose === 'character_moment' absence — completing 2 of 3 slots for this purpose value alongside the zone-cluster mode added in this same wave; peak mode conventionally skipped for this categorical field).

Rules named in this wave's header:

- `CONFLICT_CHARACTER_MOMENT_DROUGHT_RUN`
- `CONFLICT_CHARACTER_MOMENT_ZONE_CLUSTER`
- `CONFLICT_INTRODUCE_CONFLICT_DROUGHT_RUN`

## Wave 800

Wave 800 additions: CONFLICT_NEGATIVE_EMOTION_ZONE_CLUSTER (distribution/timing × emotionalShift === 'negative' × structural thirds — distinct from the existing NEGATIVE_SPIRAL_UNBROKEN [Wave 285], which is a PRESENCE-run of 4+ consecutive negative scenes, not a thirds-based concentration test; the general cluster mode has never been applied to this specific valence), CONFLICT_NEGATIVE_EMOTION_DROUGHT_RUN (run-based × emotionalShift === 'negative' absence — distinct from NEGATIVE_SPIRAL_UNBROKEN's presence-run in the same way; an absence run of 6+ scenes with no negative beat is the mirror-image claim, completing 2 of 3 slots for this valence alongside the zone-cluster mode added in this same wave), CONFLICT_INTRODUCE_CONFLICT_ZONE_CLUSTER (distribution/timing × purpose === 'introduce_conflict' × structural thirds — this purpose value has never been referenced anywhere in this pass despite being thematically central to it; none of the three shared-library trio modes has ever been applied to it).

Rules named in this wave's header:

- `CONFLICT_INTRODUCE_CONFLICT_ZONE_CLUSTER`
- `CONFLICT_NEGATIVE_EMOTION_DROUGHT_RUN`
- `CONFLICT_NEGATIVE_EMOTION_ZONE_CLUSTER`
- `NEGATIVE_SPIRAL_UNBROKEN`

## Wave 786

Wave 786 additions: CONFLICT_EMOTION_DROUGHT_RUN (run-based × emotionalShift !== 'neutral' absence — Wave 772 applied the zone-cluster mode to this signal; the drought-run mode has never been applied to it, completing the trio), CONFLICT_TURN_ZONE_CLUSTER (distribution/timing × dramaticTurn !== 'nothing' presence × structural thirds — dramaticTurn as a primary signal has only ever anchored co-occurrence-decoupling checks [CONFLICT_DRAMATIC_TURN_VOID] in this pass; none of the three shared-library trio modes has ever been applied to it), CONFLICT_TURN_DROUGHT_RUN (run-based × dramaticTurn !== 'nothing' absence — completing 2 of 3 slots for dramaticTurn alongside the zone-cluster mode added in this same wave).

Rules named in this wave's header:

- `CONFLICT_EMOTION_DROUGHT_RUN`
- `CONFLICT_TURN_DROUGHT_RUN`
- `CONFLICT_TURN_ZONE_CLUSTER`

## Wave 772

Wave 772 additions: CONFLICT_STAKES_ZONE_CLUSTER (distribution/timing × purpose === 'raise_stakes' presence × structural thirds — Wave 758's CONFLICT_STAKES_DROUGHT_RUN applied the run-based drought mode to this value; the zone-cluster mode has never been applied to it, completing the trio), CONFLICT_REVELATION_PEAK_UNCAUSED (backward-cause × revelation-as-magnitude × 2-scene lookback — CONFLICT_REVELATION_DROUGHT_RUN [Wave 671] and CONFLICT_REVELATION_ZONE_CLUSTER [Wave 758] completed the drought/cluster half of the trio; the existing CONFLICT_PEAK_REVELATION_ABSENT audits whether revelation co-occurs with the peak RUPTURE scene, a different signal's peak — the backward-cause peak mode has never been applied to revelation's own peak scene. hasCause here deliberately references only dramaticTurn, never revelation, to avoid a circular/self-referential audit), CONFLICT_EMOTION_ZONE_CLUSTER (distribution/timing × emotionalShift !== 'neutral' presence × structural thirds — emotionalShift as a primary signal has only ever anchored co-occurrence-decoupling and aftermath-void checks in this pass; none of the three shared-library trio modes has ever been applied to it).

Rules named in this wave's header:

- `CONFLICT_EMOTION_ZONE_CLUSTER`
- `CONFLICT_PEAK_REVELATION_ABSENT`
- `CONFLICT_REVELATION_PEAK_UNCAUSED`
- `CONFLICT_STAKES_ZONE_CLUSTER`

## Wave 758

Wave 758 additions: CONFLICT_CURIOSITY_DROUGHT_RUN (run-based × curiosityDelta>0 absence — Waves 702/744 applied the zone-cluster and backward-cause peak modes to curiosityDelta; the drought-run mode has never been applied to it, completing the trio), CONFLICT_REVELATION_ZONE_CLUSTER (distribution/timing × revelation × structural thirds — Wave 671 applied the run-based drought mode to revelation != null [CONFLICT_REVELATION_DROUGHT_RUN]; the zone-cluster mode has never been applied to it), CONFLICT_STAKES_DROUGHT_RUN (run-based × purpose === 'raise_stakes' absence — purpose has only ever anchored a hand-rolled co-occurrence/decoupling check [stakesScenes299]; the run-based drought mode has never been applied to it).

Rules named in this wave's header:

- `CONFLICT_CURIOSITY_DROUGHT_RUN`
- `CONFLICT_REVELATION_ZONE_CLUSTER`
- `CONFLICT_STAKES_DROUGHT_RUN`

## Wave 744

Wave 744 additions: CONFLICT_RELATIONSHIP_ZONE_CLUSTER (distribution/timing × relationshipShifts × structural thirds — Waves 702/730 applied the run-based drought and backward-cause peak modes to this pass's most heavily used field; the zone-cluster mode has never been applied to it, completing the trio), CONFLICT_CLOCK_DROUGHT_RUN (run-based × clockRaised absence — Wave 702 applied the zone-cluster mode to clockRaised; the drought-run mode has never been applied to it), CONFLICT_CURIOSITY_PEAK_UNCAUSED (single-peak isolation/backward-cause × curiosityDelta magnitude — curiosityDelta has only ever anchored co-occurrence/decoupling, zone-presence/absence, front-loaded, and zone-cluster checks; the backward-cause peak-isolation mode has never been applied to it).

Rules named in this wave's header:

- `CONFLICT_CLOCK_DROUGHT_RUN`
- `CONFLICT_CURIOSITY_PEAK_UNCAUSED`
- `CONFLICT_RELATIONSHIP_ZONE_CLUSTER`

## Wave 730

Wave 730 additions: CONFLICT_PAYOFF_ZONE_CLUSTER (distribution/timing × payoffSetupIds × structural thirds — Waves 660/716 applied the backward-cause peak and run-based drought modes to payoffSetupIds; the zone-cluster mode has never been applied to it, completing the trio), CONFLICT_RELATIONSHIP_PEAK_UNCAUSED (single-peak isolation/backward-cause × relationshipShifts magnitude — relationshipShifts is this pass's most heavily used field [76+ accesses] and Wave 702 applied the run-based drought mode to it; the backward-cause peak mode has never been applied to it), CONFLICT_CLOCK_DELTA_ZONE_CLUSTER (distribution/timing × clockDelta>0 presence × structural thirds — Waves 674/716 applied the backward-cause peak and run-based drought modes to clockDelta; the zone-cluster mode has never been applied to it, completing the trio).

Rules named in this wave's header:

- `CONFLICT_CLOCK_DELTA_ZONE_CLUSTER`
- `CONFLICT_PAYOFF_ZONE_CLUSTER`
- `CONFLICT_RELATIONSHIP_PEAK_UNCAUSED`

## Wave 716

Wave 716 additions (built on the shared checks library): CONFLICT_SEED_PEAK_UNCAUSED (single-peak isolation/backward-cause × seededClueIds magnitude — Waves 660/688 applied the drought-run and zone-cluster modes to seededClueIds; the backward-cause peak mode has never been applied to it, completing the trio), CONFLICT_PAYOFF_DROUGHT_RUN (run-based × payoffSetupIds absence — Wave 660 applied the backward-cause peak mode to payoffSetupIds; the drought-run mode has never been applied to it), CONFLICT_CLOCK_DELTA_DROUGHT_RUN (run-based × clockDelta>0 absence — Wave 674 applied the backward-cause peak mode and Wave 702 applied the zone-cluster mode to clockRaised; clockDelta itself has never been drought-audited).

Rules named in this wave's header:

- `CONFLICT_CLOCK_DELTA_DROUGHT_RUN`
- `CONFLICT_PAYOFF_DROUGHT_RUN`
- `CONFLICT_SEED_PEAK_UNCAUSED`

## Wave 702

Wave 702 additions (built on the shared checks library): CONFLICT_OPEN_THREAD_PEAK_UNCAUSED (single-peak isolation/backward-cause × unresolvedClues magnitude — Wave 646 applied the drought-run mode and Wave 674 applied the zone-cluster mode to this channel; the backward-cause peak mode has never been applied to it, completing the trio), CONFLICT_CLOCK_ZONE_CLUSTER (distribution/timing × clockRaised × structural thirds — clockRaised anchors extensive hand-rolled aggregate/threshold logic in this pass but has never been zone-cluster-audited via the shared library), CONFLICT_RELATIONSHIP_DROUGHT_RUN (run-based × relationshipShifts absence — relationshipShifts is this pass's most heavily used field [76 accesses] but has never been drought-audited via the shared library).

Rules named in this wave's header:

- `CONFLICT_CLOCK_ZONE_CLUSTER`
- `CONFLICT_OPEN_THREAD_PEAK_UNCAUSED`
- `CONFLICT_RELATIONSHIP_DROUGHT_RUN`

## Wave 688

Wave 688 additions (built on the shared checks library): CONFLICT_HIGHLIGHT_PEAK_UNCAUSED (single-peak isolation/backward-cause × dialogueHighlights magnitude — Wave 646 applied the zone-cluster mode and Wave 674 applied the drought-run mode to this channel; the backward-cause peak mode has never been applied to it), CONFLICT_SEED_ZONE_CLUSTER (distribution/timing × seededClueIds × structural thirds — Wave 660 applied the drought-run mode to seededClueIds; the zone-cluster mode has never been applied to this channel despite extensive decoupling/aftermath/ peak-absent hand-rolled coverage), CONFLICT_STAGING_DROUGHT_RUN (run-based × visualBeats absence — Wave 646 applied the peak-uncaused mode and Wave 660 applied the zone-cluster mode to this channel; the drought-run mode has never been applied to it).

Rules named in this wave's header:

- `CONFLICT_HIGHLIGHT_PEAK_UNCAUSED`
- `CONFLICT_SEED_ZONE_CLUSTER`
- `CONFLICT_STAGING_DROUGHT_RUN`

## Wave 674

Wave 674 additions (built on the shared checks library, audit M2.2): CONFLICT_CLOCK_DELTA_PEAK_UNCAUSED (single-peak isolation/backward-cause × clockDelta magnitude — this pass has extensive clockRaised coverage across decoupling, aftermath-void, and peak-absent hand-rolled checks, but clockDelta itself has never been backward-cause peak-audited via the shared helper), CONFLICT_HIGHLIGHT_DROUGHT_RUN (run-based × dialogueHighlights absence — Wave 646 applied the zone-cluster mode to dialogueHighlights; the drought-run mode has never been applied to this channel), CONFLICT_OPEN_THREAD_ZONE_CLUSTER (distribution/timing × unresolvedClues × structural thirds — Wave 646 applied the drought-run mode to unresolvedClues; the zone-cluster mode has never been applied to this channel).

Rules named in this wave's header:

- `CONFLICT_CLOCK_DELTA_PEAK_UNCAUSED`
- `CONFLICT_HIGHLIGHT_DROUGHT_RUN`
- `CONFLICT_OPEN_THREAD_ZONE_CLUSTER`

## Wave 660

Wave 660 additions (built on the shared checks library, audit M2.2): CONFLICT_PAYOFF_PEAK_UNCAUSED (single-peak isolation/backward-cause × payoffSetupIds magnitude — the scene with the most simultaneous thread resolutions has no dramatic turn or revelation in itself or the two scenes before it; distinct from CONFLICT_PEAK_PAYOFF_ABSENT [Wave 408], which anchors on the peak RUPTURE scene and checks whether it lacks a payoff — this instead anchors on the peak PAYOFF scene and asks whether it is backward-caused), CONFLICT_SEED_DROUGHT_RUN (run-based × seededClueIds absence — this pass has extensive seed-channel coverage in decoupling, aftermath-void, and peak-absent modes, but seededClueIds itself has never been drought-audited), CONFLICT_STAGING_ZONE_CLUSTER (distribution/timing × visualBeats × structural thirds — Wave 646 applied the peak-uncaused mode to visualBeats; this applies the zone-cluster mode to the same channel, a genuinely different question — concentration vs. causal isolation).

Rules named in this wave's header:

- `CONFLICT_PAYOFF_PEAK_UNCAUSED`
- `CONFLICT_PEAK_PAYOFF_ABSENT`
- `CONFLICT_SEED_DROUGHT_RUN`
- `CONFLICT_STAGING_ZONE_CLUSTER`

## Wave 646

Wave 646 additions (built on the shared checks library, audit M2.2): this 114-rule pass already hand-rolls the peak/drought/cluster analytical concepts extensively (ten CONFLICT_PEAK_*_ABSENT checks on suspense/emotion/curiosity/dramaticTurn/clock/revelation/payoff/seed/rupture/repair, three drought-run checks on repair/revelation/rupture, one zone-cluster on curiosity) — but never via the shared checkPeakUncaused/checkDroughtRun/checkZoneCluster helpers, and never on the visualBeats/unresolvedClues/dialogueHighlights channels. CONFLICT_STAGING_PEAK_UNCAUSED (single-peak isolation/backward-cause × visualBeats magnitude — the scene with the densest physical staging has no dramatic turn or revelation in itself or the two scenes before it; distinct from the existing CONFLICT_PEAK_*_ABSENT family, which audits whether the peak conflict-magnitude scene itself lacks a channel, not whether a physical-staging peak is backward-caused), CONFLICT_OPEN_THREAD_DROUGHT_RUN (run-based × unresolvedClues absence — a 6+ consecutive-scene stretch with zero outstanding clue-debt while such scenes occur ≥3 times elsewhere; the drought-run template applied to a fourth channel after repair/revelation/ rupture), CONFLICT_HIGHLIGHT_ZONE_CLUSTER (distribution/timing × dialogueHighlights × structural thirds — >75% of highlighted-dialogue scenes concentrate in one third; the zone-cluster template applied to a second channel after curiosity).

Rules named in this wave's header:

- `CONFLICT_HIGHLIGHT_ZONE_CLUSTER`
- `CONFLICT_OPEN_THREAD_DROUGHT_RUN`
- `CONFLICT_STAGING_PEAK_UNCAUSED`

## Wave 632

Wave 632 additions (built on the shared checks library, audit M2.2): CONFLICT_HIGHLIGHT_OPEN_THREAD_DECOUPLED (co-occurrence/decoupling × dialogueHighlights × unresolvedClues — first pairing of these two fields in this 111-rule pass), CONFLICT_OPEN_THREAD_STAGING_AFTERMATH_VOID (sequence/aftermath × heavy unresolvedClues debt trigger → visualBeats absence — first pairing of these two fields), CONFLICT_DIALOGUE_HIGHLIGHT_ZONE_IMBALANCE (underweight/bloat × dialogueHighlights × four structural zones — Wave 604/618 applied this template to visualBeats and payoffSetupIds; dialogueHighlights itself has never been zone-audited here).

Rules named in this wave's header:

- `CONFLICT_DIALOGUE_HIGHLIGHT_ZONE_IMBALANCE`
- `CONFLICT_HIGHLIGHT_OPEN_THREAD_DECOUPLED`
- `CONFLICT_OPEN_THREAD_STAGING_AFTERMATH_VOID`

## Wave 618

Wave 618 additions (built on the shared checks library, audit M2.2): CONFLICT_PAYOFF_STAGING_DECOUPLED (co-occurrence/decoupling × payoffSetupIds × visualBeats — first pairing of these two lightly-used fields in this 108-rule pass), CONFLICT_PAYOFF_ZONE_IMBALANCE (underweight/bloat × payoffSetupIds × four structural zones — first zone-based check on the payoff channel; Wave 604 applied this template to visualBeats only), CONFLICT_TURN_STAGING_AFTERMATH_VOID (sequence/aftermath × dramaticTurn trigger → visualBeats absence — first pairing of these two fields).

Rules named in this wave's header:

- `CONFLICT_PAYOFF_STAGING_DECOUPLED`
- `CONFLICT_PAYOFF_ZONE_IMBALANCE`
- `CONFLICT_TURN_STAGING_AFTERMATH_VOID`

## Wave 604

Wave 604 additions (built on the shared checks library, audit M2.2): OPEN_THREAD_RUPTURE_DECOUPLED (co-occurrence/decoupling × unresolvedClues × rupture — first use of unresolvedClues anywhere in this 105-rule pass), VISUAL_CONFLICT_ZONE_IMBALANCE (underweight/bloat × visualBeats × four structural zones — first use of visualBeats anywhere in this pass), OPEN_THREAD_REPAIR_AFTERMATH_VOID (sequence/aftermath × heavy unresolvedClues debt → repair absence).

Rules named in this wave's header:

- `OPEN_THREAD_REPAIR_AFTERMATH_VOID`
- `OPEN_THREAD_RUPTURE_DECOUPLED`
- `VISUAL_CONFLICT_ZONE_IMBALANCE`

## Wave 590

Wave 590 additions: seed suspense aftermath void (sequence/aftermath × seed trigger → suspense aftermath — n≥8, ≥2 qualifying seed-plant scenes [seededClueIds non-empty, pos<n-1], ≥2 suspense-rise scenes globally, every qualifying seed not followed by suspenseDelta>0 in next 2 scenes; foreshadowing and tension engines completely disconnected; distinct from CONFLICT_RUPTURE_SEED_AFTERMATH_VOID [seed is aftermath not trigger], CONFLICT_RUPTURE_SUSPENSE_VOID [rupture trigger not seed], CONFLICT_TURN_AFTERMATH_SUSPENSE_VOID [dramatic-turn trigger]; first aftermath check using the seed-plant event as trigger), clock dramatic-turn aftermath void (sequence/aftermath × clock trigger → dramatic-turn aftermath — n≥8, ≥2 qualifying clock-raised scenes [pos<n-1], ≥2 dramatic-turn scenes globally, every clock not followed by a dramatic turn in next 2 scenes; deadlines never catalyse structural pivots; distinct from CONFLICT_CLOCK_AFTERMATH_VOID [clock → conflict-signal aftermath — different aftermath channel], CONFLICT_TURN_AFTERMATH_SUSPENSE_VOID [dramatic-turn trigger → suspense aftermath — different direction], CONFLICT_CLOCK_DECOUPLED [co-occurrence mode]; first aftermath check using dramatic-turn as the aftermath channel for a clock trigger), rupture drought run (run-based × rupture-absence — n≥10, ≥2 rupture scenes, longest consecutive non-rupture run ≥7; relational fracture engine goes dark for an extended stretch; distinct from CONFLICT_CALM_STRETCH [mixed non-conflict signal = rupture OR suspense drop, threshold 5], CONFLICT_REPAIR_DROUGHT_RUN [repair-absence channel], CONFLICT_REVELATION_DROUGHT_RUN [revelation-absence channel]; first run-based check targeting the rupture channel alone).

Rules named in this wave's header:

- `CONFLICT_REVELATION_DROUGHT_RUN`
- `CONFLICT_TURN_AFTERMATH_SUSPENSE_VOID`

## Wave 576

Wave 576 additions: curiosity zone cluster (distribution/timing × curiosityDelta × structural thirds — n≥9, ≥3 curiosity-positive scenes, >75% in one third; wonder spikes ghettoized into one zone; finer-grained than binary half checks; distinct from CONFLICT_CURIOSITY_CLOSING_ZONE_ABSENT [zone-absence × closing third only, not concentration in any third], CONFLICT_AFTERMATH_CURIOSITY_VOID [aftermath mode not distribution], CONFLICT_RUPTURE_CURIOSITY_DECOUPLED [co-occurrence not distribution]), dramatic-turn aftermath suspense void (sequence/aftermath × dramatic turn → suspense aftermath — n≥8, ≥2 qualifying turn scenes [pos<n-1], ≥2 suspense scenes, no turn scene followed by suspenseDelta>0 within 2 scenes; pivots never escalate conflict tension; the turn-trigger complement of CONFLICT_AFTERMATH_CURIOSITY_VOID [curiosity channel] in this pass; distinct from CONFLICT_EMOTION_DECOUPLED [same-scene], CONFLICT_CLOSING_SUSPENSE_VOID [zone not aftermath]), revelation drought run (run-based × revelation × absence — n≥10, ≥2 revelation scenes, longest consecutive non-revelation run ≥7; the information-reveal engine goes silent for an extended stretch; the revelation-channel sibling of CONFLICT_REPAIR_DROUGHT_RUN [repair channel]; distinct from CONFLICT_CURIOSITY_CLOSING_ZONE_ABSENT [zone not run]).

Rules named in this wave's header:

- `CONFLICT_REPAIR_DROUGHT_RUN`

## Wave 562

Wave 562 additions: repair drought run (run-based × repair absence × valence — n≥10, ≥2 repair scenes, longest consecutive run of non-repair scenes ≥6; relational warmth goes dark for an extended stretch; first run-based ABSENCE check on the repair channel, distinct from CONFLICT_CALM_STRETCH [non-conflict gap, not non-repair], CONFLICT_POSITIVE_SPIRAL [presence run not absence], and CONFLICT_REPAIR_FRONT_LOADED [distribution not run]), repair emotion decoupled (co-occurrence/decoupling × repair × emotionalShift — n≥8, ≥3 repair scenes all emotionally neutral while ≥2 non-repair scenes carry emotion; bonds heal but the protagonist feels nothing; distinct from CONFLICT_EMOTION_DECOUPLED [audits rupture/conflict scenes — the negative direction] and CONFLICT_POSITIVE_EMOTION_RUPTURE [inverted valence on the conflict channel]), repair curiosity aftermath void (sequence/aftermath × repair → curiosity — n≥8, ≥2 repair scenes [pos<n-1], ≥2 curiosity scenes globally, every repair followed by 2 scenes with curiosityDelta ≤ 0; reconciliation never opens new questions; the positive-shift complement of CONFLICT_AFTERMATH_CURIOSITY_VOID [rupture trigger], distinct from CONFLICT_RUPTURE_CURIOSITY_DECOUPLED [same-scene co-occurrence] and CONFLICT_CURIOSITY_CLOSING_ZONE_ABSENT [zone check]).

Rules named in this wave's header:

- `CONFLICT_CALM_STRETCH`
- `CONFLICT_POSITIVE_EMOTION_RUPTURE`
- `CONFLICT_POSITIVE_SPIRAL`

## Wave 548

Wave 548 additions: peak repair uncaused (backward-cause × single-peak isolation × positive relational shift — n≥8, ≥2 repair scenes ≥+0.3; the single biggest positive shift has no rupture, revelation, dramatic-turn, or clock in its prior 2 scenes; the peak reconciliation is spontaneous; first check combining single-peak isolation + backward-cause on the positive-shift channel, distinct from CONFLICT_REPAIR_UNCAUSED [all repairs aggregate] and CONFLICT_PEAK_RUPTURE_UNCAUSED [backward-cause × peak RUPTURE]), closing clock absent (zone presence/absence × clockRaised × closing third — n≥9, ≥2 clock scenes in the first two-thirds, none in the final third; the story's deadline urgency goes silent exactly as the climax approaches; first zone check on the clockRaised channel in the closing third, distinct from THREAT_AMNESIA [Act 1 to second half], CONFLICT_CLOCK_DECOUPLED [co-occurrence × relational content], and CONFLICT_CLOCK_AFTERMATH_VOID [aftermath mode]), seed repair decoupled (co-occurrence × seededClueIds × positive relational shift — n≥8, ≥2 seed scenes, ≥2 repair scenes ≥+0.3, zero overlap; the story plants clues and warms bonds but never in the same scene; distinct from CONFLICT_CLUE_DECOUPLED [seed × rupture — the negative direction], CONFLICT_RUPTURE_SEED_AFTERMATH_VOID [aftermath mode], and CONFLICT_REVELATION_REPAIR_DECOUPLED [revelation × repair — different signal pair]; first co-occurrence check joining seed and repair channels).

Rules named in this wave's header:

- `CONFLICT_CLOCK_AFTERMATH_VOID`
- `CONFLICT_REVELATION_REPAIR_DECOUPLED`
- `CONFLICT_RUPTURE_SEED_AFTERMATH_VOID`
- `THREAT_AMNESIA`

## Wave 534

Wave 534 additions: clock rupture decoupled (co-occurrence/decoupling × clock × rupture — n≥8, ≥2 clockRaised scenes AND ≥2 rupture scenes [shift ≤ −0.3], zero overlap; deadline urgency never coincides with bond-breaking; the clock channel completes the co-occurrence decoupling family alongside revelation, seed, payoff, and dramatic-turn; distinct from CONFLICT_CLOCK_ABSENT which audits absence of both channels together and from all aftermath checks which use clock as trigger), rupture curiosity void (co-occurrence/decoupling × rupture × curiosityDelta — n≥8, ≥2 rupture scenes, ≥2 curiosity scenes, every rupture has curiosityDelta ≤ 0; bond-breaking never ignites wondering; distinct from CONFLICT_RUPTURE_AFTERMATH_CURIOSITY_VOID which is aftermath mode [what follows the rupture] and from CONFLICT_CLUE_DECOUPLED which is seed not curiosity; fills the rupture × curiosity co-occurrence cell alongside rupture × revelation/seed/payoff/turn), curiosity front-loaded (distribution/timing × curiosityDelta × first half — n≥8, ≥4 curiosity scenes, >70% in first half while back half has ≥1; wonder exhausted before climax; distinct from CONFLICT_CURIOSITY_CLOSING_ZONE_ABSENT which is zone-absence not distribution-ratio, from CONFLICT_REPAIR_FRONT_LOADED which targets positive shifts not curiosity, and from ARC_CURIOSITY_BACK_LOADED which targets opposite concentration direction; first distribution/timing check on curiosity in this pass).

Rules named in this wave's header:

- `CONFLICT_CURIOSITY_CLOSING_ZONE_ABSENT`
- `CONFLICT_REPAIR_FRONT_LOADED`

## Wave 520

Wave 520 additions: rupture payoff aftermath void (sequence/aftermath × payoff × rupture aftermath — n≥8, ≥2 ruptures ≤ -0.3, ≥2 payoff scenes; every rupture followed by 2 scenes with no payoffSetupIds; bond-breaking never immediately precedes thread resolution; final uncovered aftermath channel completing the set alongside curiosity, suspense, clock, revelation, turn, positive-emotion, and seed; distinct from CONFLICT_PAYOFF_DECOUPLED which is same-scene co-occurrence), repair front-loaded (distribution/timing × positive shift × first half — n≥8, ≥4 repair scenes ≥ +0.3, >70% in first half while back half has ≥1; bond healing concentrated in the opening of the story while the climax zone goes without relational warming; distinct from CONFLICT_REPAIR_CLOSING_ABSENT which targets only the closing third, and from ARC_RELATIONAL_FRONT_LOADED which uses a different pass), curiosity closing zone absent (zone presence/absence × curiosityDelta × closing third — n≥9, ≥3 curiosity-positive scenes, none in final structural third; the wondering engine stops before the climax; first zone check on the curiosity channel in this pass, distinct from CONFLICT_CLOSING_SUSPENSE_VOID and CONFLICT_REPAIR_CLOSING_ABSENT which audit suspense and repair respectively, and from CONFLICT_AFTERMATH_CURIOSITY_VOID which is an aftermath not a zone check).

Rules named in this wave's header:

- `CONFLICT_PAYOFF_DECOUPLED`
- `CONFLICT_REPAIR_CLOSING_ABSENT`

## Wave 506

Wave 506 additions: rupture seed aftermath void (sequence/aftermath × seed × rupture aftermath — n≥8, ≥2 ruptures ≤ -0.3, ≥2 seed scenes; every rupture followed by 2 scenes with no seededClueIds; bond-breaking never plants a clue foreshadowing resolution of the fracture; completes the aftermath channel set by adding the seed channel alongside curiosity, suspense, clock, revelation, turn, and positive-emotion; distinct from CONFLICT_CLUE_DECOUPLED which is same-scene co-occurrence), revelation repair decoupled (co-occurrence × revelation × positive shift — n≥8, ≥2 revelation scenes, ≥2 repair scenes ≥ +0.3, zero overlap; truths never surface as bonds heal; distinct from CONFLICT_REVELATION_DECOUPLED which pairs revelation with negative shifts, and CONFLICT_DRAMATIC_TURN_REPAIR_DECOUPLED which pairs turn with positive shifts), repair closing absent (zone presence/ absence × positive shift × closing third — n≥9, ≥2 repair scenes ≥ +0.3, none in final third; the resolution zone contains no bond-warming; distinct from CONFLICT_CLOSING_SUSPENSE_VOID which audits suspense not repair, and CONFLICT_ACT3_ABSENT which audits any conflict not specifically positive-shift absence).

Rules named in this wave's header:

- `CONFLICT_CLOSING_SUSPENSE_VOID`
- `CONFLICT_CLUE_DECOUPLED`
- `CONFLICT_DRAMATIC_TURN_REPAIR_DECOUPLED`
- `CONFLICT_REVELATION_DECOUPLED`

## Wave 492

Wave 492 additions: dramatic-turn repair decoupled (co-occurrence × dramatic-turn × positive relationship shift — ≥2 dramatic-turn scenes and ≥2 repair scenes share zero overlap; story pivots never coincide with bond-warming; distinct from CONFLICT_DRAMATIC_TURN_VOID which audits negative shifts in turn scenes, and CONFLICT_REPAIR_UNCAUSED which audits backward-cause), closing suspense void (zone presence/absence × suspense × closing third — the final third has no scene with positive suspenseDelta while the earlier two-thirds have ≥2 such scenes; the climax approach carries no new tension build; distinct from ESCALATION_PLATEAU which compares averages and CONFLICT_ACT3_ABSENT which audits any conflict signal), calm stretch (run-based × non-conflict gap — ≥5 consecutive non-conflict scenes while ≥4 overall conflict scenes exist; a sustained lull breaks dramatic rhythm; the complement of CONFLICT_BREATHING_ROOM_ABSENT which fires when ruptures are too close, not when they are too sparse).

Rules named in this wave's header:

- `CONFLICT_ACT3_ABSENT`
- `CONFLICT_BREATHING_ROOM_ABSENT`
- `CONFLICT_DRAMATIC_TURN_VOID`
- `CONFLICT_REPAIR_UNCAUSED`
- `ESCALATION_PLATEAU`

## Wave 478

Wave 478 additions: rupture temporal cluster (distribution/timing — >75% of rupture scenes fall in a single third; the conflict engine is architecturally ghettoized; first distribution/timing check using thirds on the rupture channel, distinct from CONFLICT_FIRST/SECOND_HALF_MONOPOLY which use a binary 70% threshold), positive emotion aftermath void (sequence/aftermath × rupture × positive emotion — every major rupture is followed by 2 scenes with no positive emotional beat; bond-breaking never precedes relief or recovery; the positive-valence complement of the existing aftermath channels covering curiosity, suspense, clock, revelation, and turn), repair uncaused (backward-cause × positive relational shift — every scene where a bond repairs or warms has no major rupture, revelation, or dramatic turn in its prior 2 scenes; reconciliations are systematically spontaneous; the positive-shift complement of CONFLICT_RUPTURE_CAUSE_VOID which audits all NEGATIVE shifts, and of CONFLICT_PEAK_RUPTURE_UNCAUSED which audits only the peak).

Rules named in this wave's header:

- `CONFLICT_PEAK_RUPTURE_UNCAUSED`

## Wave 464

Wave 464 additions: rupture revelation aftermath void (every rupture is followed by 2 scenes with no revelation while the story discloses elsewhere — bond-breaking never leads to discovery; sequence/aftermath × revelation channel, completing the aftermath set alongside the curiosity, suspense, and clock channels), rupture dramatic-turn aftermath void (every rupture is followed by 2 scenes with no dramatic turn while turns exist elsewhere — fractures never pivot the story; sequence/aftermath × dramatic-turn channel), peak rupture uncaused (the single heaviest rupture has no escalation, revelation, dramatic turn, or clock raise in the two scenes before it — the story's deepest fracture arrives unprepared; single-peak isolation × backward-cause mode, distinct from CONFLICT_RUPTURE_CAUSE_VOID which audits ALL ruptures aggregate against the prior single scene, and from the CONFLICT_PEAK_* checks which audit the peak's in-scene channels).

Rules named in this wave's header:

- `CONFLICT_RUPTURE_CAUSE_VOID`

## Wave 450

Wave 450 additions: clock aftermath void (≥2 clock scenes all followed by 2 scenes with no conflict signal — deadlines raised but never detonated; sequence/aftermath × clock channel, distinct from CONFLICT_CLOCK_DECOUPLED which audits in-scene relational content), positive emotion rupture (≥3 conflict scenes all with positive emotionalShift — characters feel good while bonds break, an emotional/relational inversion; co-occurrence × positive valence × rupture, complement of CONFLICT_EMOTION_DECOUPLED which audits neutral), rupture clock aftermath void (every rupture followed by 2 scenes with no clock raised while story uses clocks elsewhere — bond-breaking never tightens the deadline; sequence/aftermath × clock × rupture aftermath, completes the set with CONFLICT_AFTERMATH_CURIOSITY_VOID and CONFLICT_RUPTURE_SUSPENSE_VOID by adding the clock channel).

Rules named in this wave's header:

- `CONFLICT_CLOCK_DECOUPLED`
- `CONFLICT_EMOTION_DECOUPLED`
- `CONFLICT_RUPTURE_SUSPENSE_VOID`

## Wave 436

Wave 436 additions: positive spiral (≥3 consecutive scenes each with a positive relationship shift while ≥2 ruptures exist elsewhere — the relational world warms unbroken, removing friction; run-based × positive-shift channel, complement of CONFLICT_RELENTLESS_RUN), rupture suspense void (every major rupture is followed by 2 scenes with suspenseDelta ≤ 0 — bond-breaking never escalates tension; sequence/aftermath × suspense channel, parallel to Wave 422's CONFLICT_AFTERMATH_CURIOSITY_VOID but suspense rather than curiosity), breathing room absent (≥4 ruptures exist and the maximum non-rupture gap between consecutive ruptures is ≤1 scene — every break is followed almost immediately by another; distribution/timing × rupture spacing, distinct from CONFLICT_RELENTLESS_RUN which requires CONSECUTIVE ruptures).

Rules named in this wave's header:

- `CONFLICT_AFTERMATH_CURIOSITY_VOID`
- `CONFLICT_RELENTLESS_RUN`

## Unattributed (no explicit wave-header mention)

These rule constants exist in this pass but were not found, by exact-name match, inside any "Wave N —" / "Wave N additions:" header entry in the file — typically because they predate that convention hardening, or the header describes the check descriptively rather than by constant name (e.g. "talking heads" rather than `TALKING_HEADS`). Listed here honestly rather than guessed into a wave, with the nearest preceding in-code "── section title ──" comment as the best-available substitute context where one exists.

- `ANTAGONIST_FORCE_ONLY` — Wave 210: Positive spiral trap, reversal symmetry break, antagonist force only
- `ANTAGONIST_TELEGRAPHED` — Wave 229: Reversal tempo flatline, telegraphed antagonist, positive resolution too early
- `ANTAGONIST_VANISH` — Wave 158: Threat amnesia, antagonist vanish, single-register conflict
- `CLIMAX_APPROACH_FLAT` — Approaching climax without intensification
- `CLOCK_WITHOUT_CONFRONTATION` — Clock pressure without confrontation
- `CONFLICT_ACT1_ABSENT` — Wave 183: Reversal vacuum, Act 1 conflict absent, convergence absent
- `CONFLICT_ACT2A_VOID` — Wave 380: CONFLICT_ACT2A_VOID, CONFLICT_SECOND_HALF_MONOPOLY, CONFLICT_REVELATION_DECOUPLED
- `CONFLICT_ACT2B_VOID` — Wave 271: CONFLICT_ACT2B_VOID
- `CONFLICT_ACT3_DEFLATION` — Wave 195: Midpoint absent, Act 3 deflation, frequency drop
- `CONFLICT_CLOCK_RUPTURE_DECOUPLED` — Wave 520 checks
- `CONFLICT_CLOSING_CLOCK_ABSENT` — Wave 520 checks
- `CONFLICT_CONCENTRATION_SPIKE` — Wave 210: Positive spiral trap, reversal symmetry break, antagonist force only
- `CONFLICT_CONVERGENCE_ABSENT` — Wave 183: Reversal vacuum, Act 1 conflict absent, convergence absent
- `CONFLICT_CURIOSITY_DECOUPLED` — Wave 313: CONFLICT_CURIOSITY_DECOUPLED
- `CONFLICT_CURIOSITY_FRONT_LOADED` — Wave 520 checks
- `CONFLICT_CURIOSITY_ZONE_CLUSTER` — Wave 520 checks
- `CONFLICT_FATIGUE` — Wave 144: Escalation plateau & confrontation quality
- `CONFLICT_FIRST_HALF_MONOPOLY` — Wave 338: CONFLICT_CLOCK_DECOUPLED, CONFLICT_DRAMATIC_TURN_VOID, CONFLICT_FIRST_HALF_MONOPOLY
- `CONFLICT_FREQUENCY_DROP` — Wave 195: Midpoint absent, Act 3 deflation, frequency drop
- `CONFLICT_LATE_FIRST_RUPTURE` — Wave 366: CONFLICT_PEAK_DRAMATIC_TURN_ABSENT, CONFLICT_PEAK_CLOCK_ABSENT, CONFLICT_LATE_FIRST_RUPTURE
- `CONFLICT_MAGNITUDE_PEAK_EARLY` — Wave 313: CONFLICT_MAGNITUDE_PEAK_EARLY
- `CONFLICT_MIDPOINT_ABSENT` — Wave 195: Midpoint absent, Act 3 deflation, frequency drop
- `CONFLICT_OPENING_VOID` — Wave 257: Conflict Act 3 absent, reconciliation absent, conflict opening void
- `CONFLICT_PAIR_DENSITY_GAP` — Wave 271: CONFLICT_PAIR_DENSITY_GAP
- `CONFLICT_PAIR_SHIFT_IMBALANCE` — Wave 422: CONFLICT_RUPTURE_CAUSE_VOID, CONFLICT_AFTERMATH_CURIOSITY_VOID, CONFLICT_PAIR_SHIFT_IMBALANCE
- `CONFLICT_PEAK_CLOCK_ABSENT` — Wave 366: CONFLICT_PEAK_DRAMATIC_TURN_ABSENT, CONFLICT_PEAK_CLOCK_ABSENT, CONFLICT_LATE_FIRST_RUPTURE
- `CONFLICT_PEAK_CURIOSITY_ABSENT` — Wave 352: CONFLICT_PEAK_SUSPENSE_ABSENT, CONFLICT_PEAK_EMOTION_ABSENT, CONFLICT_PEAK_CURIOSITY_ABSENT
- `CONFLICT_PEAK_DRAMATIC_TURN_ABSENT` — Wave 366: CONFLICT_PEAK_DRAMATIC_TURN_ABSENT, CONFLICT_PEAK_CLOCK_ABSENT, CONFLICT_LATE_FIRST_RUPTURE
- `CONFLICT_PEAK_EMOTION_ABSENT` — Wave 352: CONFLICT_PEAK_SUSPENSE_ABSENT, CONFLICT_PEAK_EMOTION_ABSENT, CONFLICT_PEAK_CURIOSITY_ABSENT
- `CONFLICT_PEAK_REPAIR_UNCAUSED` — Wave 520 checks
- `CONFLICT_PEAK_SEED_ABSENT` — Wave 408: CONFLICT_PEAK_REVELATION_ABSENT, CONFLICT_PEAK_PAYOFF_ABSENT, CONFLICT_PEAK_SEED_ABSENT
- `CONFLICT_PEAK_SUSPENSE_ABSENT` — Wave 352: CONFLICT_PEAK_SUSPENSE_ABSENT, CONFLICT_PEAK_EMOTION_ABSENT, CONFLICT_PEAK_CURIOSITY_ABSENT
- `CONFLICT_POSITIVE_EMOTION_AFTERMATH_VOID` — Wave 478: CONFLICT_RUPTURE_TEMPORAL_CLUSTER, CONFLICT_POSITIVE_EMOTION_AFTERMATH_VOID, CONFLICT_REPAIR_UNCAUSED
- `CONFLICT_PURPOSE_MONOTONE` — Wave 243: Conflict recovery too fast, single-pair conflict, conflict purpose monotone
- `CONFLICT_RECOVERY_TOO_FAST` — Wave 243: Conflict recovery too fast, single-pair conflict, conflict purpose monotone
- `CONFLICT_REPAIR_CURIOSITY_AFTERMATH_VOID` — Wave 520 checks
- `CONFLICT_REPAIR_EMOTION_DECOUPLED` — Wave 520 checks
- `CONFLICT_RUPTURE_AFTERMATH_VOID` — Wave 394: CONFLICT_CLUE_DECOUPLED, CONFLICT_PAYOFF_DECOUPLED, CONFLICT_RUPTURE_AFTERMATH_VOID
- `CONFLICT_RUPTURE_CLOCK_AFTERMATH_VOID` — Wave 450: CONFLICT_CLOCK_AFTERMATH_VOID, CONFLICT_POSITIVE_EMOTION_RUPTURE, CONFLICT_RUPTURE_CLOCK_AFTERMATH_VOID
- `CONFLICT_RUPTURE_CURIOSITY_VOID` — Wave 520 checks
- `CONFLICT_RUPTURE_DRAMATIC_TURN_AFTERMATH_VOID` — Wave 464: CONFLICT_RUPTURE_REVELATION_AFTERMATH_VOID, CONFLICT_RUPTURE_DRAMATIC_TURN_AFTERMATH_VOID, CONFLICT_PEAK_RUPTURE_UNCAUSED
- `CONFLICT_RUPTURE_DROUGHT_RUN` — Wave 520 checks
- `CONFLICT_RUPTURE_PAYOFF_AFTERMATH_VOID` — Wave 520 checks
- `CONFLICT_RUPTURE_REVELATION_AFTERMATH_VOID` — Wave 464: CONFLICT_RUPTURE_REVELATION_AFTERMATH_VOID, CONFLICT_RUPTURE_DRAMATIC_TURN_AFTERMATH_VOID, CONFLICT_PEAK_RUPTURE_UNCAUSED
- `CONFLICT_RUPTURE_TEMPORAL_CLUSTER` — Wave 478: CONFLICT_RUPTURE_TEMPORAL_CLUSTER, CONFLICT_POSITIVE_EMOTION_AFTERMATH_VOID, CONFLICT_REPAIR_UNCAUSED
- `CONFLICT_SECOND_HALF_MONOPOLY` — Wave 380: CONFLICT_ACT2A_VOID, CONFLICT_SECOND_HALF_MONOPOLY, CONFLICT_REVELATION_DECOUPLED
- `CONFLICT_SEED_REPAIR_DECOUPLED` — Wave 520 checks
- `CONFLICT_SUSPENSE_DECOUPLED` — Wave 285: CONFLICT_SUSPENSE_DECOUPLED
- `CONFLICT_WITHOUT_DEADLINE` — Wave 169: Deadline absence, low-stakes conflict, interpersonal peak timing
- `CONFRONTATION_AVOIDANCE` — Wave 144: Escalation plateau & confrontation quality
- `ELEVENTH_HOUR_CONFLICT` — Wave 299: ELEVENTH_HOUR_CONFLICT
- `FLAT_SUSPENSE_ARC` — Flat suspense arc
- `INTERPERSONAL_CONFLICT_ONLY` — Wave 271: INTERPERSONAL_CONFLICT_ONLY
- `INTERPERSONAL_PEAK_TOO_EARLY` — Wave 169: Deadline absence, low-stakes conflict, interpersonal peak timing
- `LOW_STAKES_CONFLICT` — Wave 169: Deadline absence, low-stakes conflict, interpersonal peak timing
- `NO_REVERSALS_LONG_STORY` — Reversal density too low
- `POSITIVE_RESOLUTION_TOO_EARLY` — Wave 229: Reversal tempo flatline, telegraphed antagonist, positive resolution too early
- `POSITIVE_SPIRAL_TRAP` — Wave 210: Positive spiral trap, reversal symmetry break, antagonist force only
- `RECONCILIATION_ABSENT` — Wave 257: Conflict Act 3 absent, reconciliation absent, conflict opening void
- `REVERSAL_MAGNITUDE_DECAY` — Wave 210: Positive spiral trap, reversal symmetry break, antagonist force only
- `REVERSAL_SYMMETRY_BREAK` — Wave 210: Positive spiral trap, reversal symmetry break, antagonist force only
- `REVERSAL_TEMPO_FLATLINE` — Wave 229: Reversal tempo flatline, telegraphed antagonist, positive resolution too early
- `REVERSAL_WITHOUT_CONSEQUENCE` — Wave 183: Reversal vacuum, Act 1 conflict absent, convergence absent
- `SINGLE_PAIR_CONFLICT` — Wave 243: Conflict recovery too fast, single-pair conflict, conflict purpose monotone
- `SINGLE_REGISTER_CONFLICT` — Wave 158: Threat amnesia, antagonist vanish, single-register conflict
- `STAKES_LABEL_UNBACKED` — Wave 299: STAKES_LABEL_UNBACKED
- `TOO_MANY_OPEN_CONFLICTS` — Open clues without tension
- `UNRELIEVED_TENSION_ASCENT` — Wave 210: Positive spiral trap, reversal symmetry break, antagonist force only

