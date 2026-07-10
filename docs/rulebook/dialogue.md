# Pass: `dialogue`

Founding wave: 135. Total distinct rules: 235 (155 attributed to a specific wave, 80 unattributed — see docs/rulebook/README.md's methodology note).

## Wave 1176

Wave 1176 additions (deliberate pivot away from the sequence/aftermath monoculture that has dominated recent waves toward the distinct analytical modes CLAUDE.md's standing task names): this pass's central signal, dialogueHighlights, had only ever been audited via aftermath-void (as a channel), a single zone-cluster (thirds distribution), and co-occurrence with unresolvedClues. This wave audits it via two genuinely under-used modes. (1) Distribution/timing via checkHalfLoaded (front/back split) -- the FIRST use of this shared helper anywhere in the codebase: DIALOGUE_HIGHLIGHT_FRONT_LOADED fires when the memorable lines clump in the first half while the back half still has some, a front/back skew that the thirds-based zone-cluster cannot express (halves != thirds, and half-loaded additionally requires the quieter half to be non-empty, so it targets skew rather than pure clustering). (2) Co-occurrence/decoupling (only 3 prior uses in this pass, vs 41 aftermath-void): DIALOGUE_HIGHLIGHT_EMOTION_DECOUPLED and DIALOGUE_HIGHLIGHT_SUSPENSE_DECOUPLED fire when standout dialogue never once shares a scene with an emotional beat / a suspense spike respectively -- same-scene absence, mechanically distinct from every windowed aftermath check, and both are fresh pairings (existing decoupling covers dialogueHighlights x unresolvedClues, climax x dialogueHighlights, payoffSetupIds x visualBeats only).

Rules named in this wave's header:

- `DIALOGUE_HIGHLIGHT_EMOTION_DECOUPLED`
- `DIALOGUE_HIGHLIGHT_FRONT_LOADED`
- `DIALOGUE_HIGHLIGHT_SUSPENSE_DECOUPLED`

## Wave 1162

Wave 1162 additions (opens rotation cycle 44): revelation and suspenseDelta each had only their one Wave-1148 channel. DIALOGUE_REVELATION_EMOTIONAL_AFTERMATH_VOID and DIALOGUE_REVELATION_RELATIONAL_AFTERMATH_VOID give revelation its second and third channels (emotionalShift, relationshipShifts); DIALOGUE_SUSPENSE_CURIOSITY_AFTERMATH_VOID gives suspenseDelta its second channel (curiosityDelta).

Rules named in this wave's header:

- `DIALOGUE_REVELATION_EMOTIONAL_AFTERMATH_VOID`
- `DIALOGUE_REVELATION_RELATIONAL_AFTERMATH_VOID`
- `DIALOGUE_SUSPENSE_CURIOSITY_AFTERMATH_VOID`

## Wave 1148

Wave 1148 additions: DIALOGUE_TURN_HIGHLIGHT_AFTERMATH_VOID gives dramaticTurn its sixth and final channel (dialogueHighlights), completing full six-channel saturation for every one of this pass's six tracked triggers (raise_stakes, unresolvedClues-debt, relationshipShifts-magnitude, seededClueIds, clockRaised, dramaticTurn). With those exhausted, this wave introduces revelation and suspenseDelta as genuinely fresh checkAftermathVoid triggers -- neither has ever anchored the isTrigger side of a check in this file. DIALOGUE_REVELATION_CURIOSITY_AFTERMATH_VOID pairs revelation with curiosityDelta; DIALOGUE_SUSPENSE_EMOTIONAL_AFTERMATH_VOID pairs suspenseDelta with emotionalShift.

Rules named in this wave's header:

- `DIALOGUE_REVELATION_CURIOSITY_AFTERMATH_VOID`
- `DIALOGUE_SUSPENSE_EMOTIONAL_AFTERMATH_VOID`
- `DIALOGUE_TURN_HIGHLIGHT_AFTERMATH_VOID`

## Wave 1134

Wave 1134 additions (opens rotation cycle 41): DIALOGUE_CLOCK_STAGING_AFTERMATH_VOID gives clockRaised its sixth and final channel (previously paired with curiosityDelta/emotionalShift/ relationshipShifts/suspenseDelta/dialogueHighlights, now also paired with visualBeats), completing full six-channel saturation for this trigger. DIALOGUE_TURN_RELATIONAL_AFTERMATH_VOID and DIALOGUE_TURN_STAGING_AFTERMATH_VOID give dramaticTurn its fourth and fifth channels (relationshipShifts, visualBeats).

Rules named in this wave's header:

- `DIALOGUE_CLOCK_STAGING_AFTERMATH_VOID`
- `DIALOGUE_TURN_RELATIONAL_AFTERMATH_VOID`
- `DIALOGUE_TURN_STAGING_AFTERMATH_VOID`

## Wave 1120

Wave 1120 additions (opens the thirty-ninth rotation cycle for this pass): clockRaised is now three channels deep (curiosityDelta/emotionalShift/relationshipShifts) and dramaticTurn two (suspenseDelta/curiosityDelta) -- this wave advances both toward saturation. DIALOGUE_CLOCK_SUSPENSE_AFTERMATH_VOID pairs clockRaised with suspenseDelta (fourth channel) and DIALOGUE_CLOCK_HIGHLIGHT_AFTERMATH_VOID pairs it with dialogueHighlights (fifth channel); DIALOGUE_TURN_EMOTIONAL_AFTERMATH_VOID pairs dramaticTurn with emotionalShift (third channel).

Rules named in this wave's header:

- `DIALOGUE_CLOCK_HIGHLIGHT_AFTERMATH_VOID`
- `DIALOGUE_CLOCK_SUSPENSE_AFTERMATH_VOID`
- `DIALOGUE_TURN_EMOTIONAL_AFTERMATH_VOID`

## Wave 1106

Wave 1106 additions (opens the thirty-eighth rotation cycle for this pass): this wave gives clockRaised and dramaticTurn further checkAftermathVoid channels — DIALOGUE_CLOCK_EMOTIONAL_AFTERMATH_VOID and DIALOGUE_CLOCK_RELATIONAL_AFTERMATH_VOID pair clockRaised with emotionalShift and relationshipShifts respectively (second and third channels for this trigger), and DIALOGUE_TURN_CURIOSITY_AFTERMATH_VOID pairs dramaticTurn with curiosityDelta (second channel for this trigger).

Rules named in this wave's header:

- `DIALOGUE_CLOCK_EMOTIONAL_AFTERMATH_VOID`
- `DIALOGUE_CLOCK_RELATIONAL_AFTERMATH_VOID`
- `DIALOGUE_TURN_CURIOSITY_AFTERMATH_VOID`

## Wave 1092

Wave 1092 additions (opens the thirty-seventh rotation cycle for this pass): DIALOGUE_SHIFT_RELATIONAL_AFTERMATH_VOID gives the |amount|>=0.3 relationshipShifts magnitude trigger its sixth and final channel (previously paired with visualBeats/curiosityDelta/suspenseDelta/ emotionalShift/dialogueHighlights, now also paired with a further relationshipShifts entry elsewhere in the script), completing full six-channel saturation for all four of this pass's main triggers (raise_stakes, unresolvedClues-debt, relationshipShifts-magnitude, and — as of

Rules named in this wave's header:

- `DIALOGUE_SHIFT_RELATIONAL_AFTERMATH_VOID`

## Wave 1078

Wave 1078 additions: raise_stakes and heavy unresolvedClues debt each reach full six-channel saturation -- DIALOGUE_STAKES_STAGING_AFTERMATH_VOID (raise_stakes, previously paired with dialogueHighlights/curiosityDelta/emotionalShift/suspenseDelta/relationshipShifts, now also paired with visualBeats -- its only remaining standard channel) and DIALOGUE_OPEN_THREAD_STAGING_AFTERMATH_VOID (heavy unresolvedClues debt, previously paired with dialogueHighlights/ curiosityDelta/emotionalShift/suspenseDelta/relationshipShifts, now also paired with visualBeats -- its only remaining standard channel). DIALOGUE_SHIFT_HIGHLIGHT_AFTERMATH_VOID gives the |amount|>=0.3 relationshipShifts magnitude trigger a fifth channel (previously paired with visualBeats/curiosityDelta/suspenseDelta/emotionalShift, now also paired with dialogueHighlights).

Rules named in this wave's header:

- `DIALOGUE_OPEN_THREAD_STAGING_AFTERMATH_VOID`
- `DIALOGUE_SHIFT_HIGHLIGHT_AFTERMATH_VOID`
- `DIALOGUE_STAKES_STAGING_AFTERMATH_VOID`

## Wave 1064

Wave 1064 — seededClueIds). With those exhausted, this wave introduces two triggers as fresh checkAftermathVoid subjects for the first time: DIALOGUE_CLOCK_CURIOSITY_AFTERMATH_VOID pairs clockRaised with curiosityDelta (distinct from DIALOGUE_CLOCK_AFTERMATH_SILENT, DIALOGUE_CLOCK_PEAK_SILENT, and every other clockRaised/clockDelta check in this file, all of which use dialogue-presence, peak-position, or zone/drought signals rather than curiosityDelta), and DIALOGUE_TURN_SUSPENSE_AFTERMATH_VOID pairs dramaticTurn with suspenseDelta (distinct from DIALOGUE_DRAMATIC_TURN_AFTERMATH_SILENT, Wave 532, which uses dialogue-presence in the single immediately-following scene rather than a 2-scene curiosityDelta/suspenseDelta window).

Rules named in this wave's header:

- `DIALOGUE_CLOCK_AFTERMATH_SILENT`
- `DIALOGUE_CLOCK_CURIOSITY_AFTERMATH_VOID`
- `DIALOGUE_DRAMATIC_TURN_AFTERMATH_SILENT`
- `DIALOGUE_OPEN_THREAD_RELATIONAL_AFTERMATH_VOID`
- `DIALOGUE_SEED_HIGHLIGHT_AFTERMATH_VOID`
- `DIALOGUE_STAKES_RELATIONAL_AFTERMATH_VOID`
- `DIALOGUE_TURN_SUSPENSE_AFTERMATH_VOID`

## Wave 1050

Wave 1050 additions (opens the thirty-fourth rotation cycle for this pass): with unresolvedClues, raise_stakes, and seededClueIds all now at four channels each, this wave targets the relationshipShifts (amount>=0.3) trigger, previously only at two channels: DIALOGUE_SHIFT_SUSPENSE_AFTERMATH_VOID (paired with suspenseDelta) and DIALOGUE_SHIFT_EMOTIONAL_AFTERMATH_VOID (paired with emotionalShift). The third check, DIALOGUE_SEED_STAGING_AFTERMATH_VOID, pairs seededClueIds with visualBeats for a fifth channel, the last of the standard consequence channels for that trigger.

Rules named in this wave's header:

- `DIALOGUE_SEED_STAGING_AFTERMATH_VOID`
- `DIALOGUE_SHIFT_EMOTIONAL_AFTERMATH_VOID`
- `DIALOGUE_SHIFT_SUSPENSE_AFTERMATH_VOID`

## Wave 1036

Wave 1036 additions (opens the thirty-third rotation cycle for this pass): with raise_stakes now at four channels, this wave targets the less-saturated triggers instead: DIALOGUE_OPEN_THREAD_SUSPENSE_AFTERMATH_VOID (heavy unresolvedClues debt, previously paired with dialogueHighlights/ curiosityDelta/emotionalShift, now a fourth channel with suspenseDelta), DIALOGUE_SEED_EMOTIONAL_AFTERMATH_VOID (seededClueIds, previously paired with suspenseDelta/relationshipShifts/ curiosityDelta, now a fourth channel with emotionalShift), and DIALOGUE_SHIFT_CURIOSITY_AFTERMATH_VOID (the relationshipShifts amount>=0.3 trigger, previously only paired with visualBeats, now paired with curiosityDelta for a second channel).

Rules named in this wave's header:

- `DIALOGUE_OPEN_THREAD_SUSPENSE_AFTERMATH_VOID`
- `DIALOGUE_SEED_EMOTIONAL_AFTERMATH_VOID`
- `DIALOGUE_SHIFT_CURIOSITY_AFTERMATH_VOID`

## Wave 1022

Wave 1022 additions (opens the thirty-second rotation cycle for this pass): three more fresh channels for existing triggers: DIALOGUE_STAKES_SUSPENSE_AFTERMATH_VOID (raise_stakes, previously paired with dialogueHighlights/curiosityDelta/emotionalShift, now a fourth channel with suspenseDelta), DIALOGUE_SEED_CURIOSITY_AFTERMATH_VOID (seededClueIds, previously paired with suspenseDelta/relationshipShifts, now a third channel with curiosityDelta), and DIALOGUE_OPEN_THREAD_EMOTIONAL_AFTERMATH_VOID (heavy unresolvedClues debt, previously paired with dialogueHighlights/curiosityDelta, now a third channel with emotionalShift).

Rules named in this wave's header:

- `DIALOGUE_OPEN_THREAD_EMOTIONAL_AFTERMATH_VOID`
- `DIALOGUE_SEED_CURIOSITY_AFTERMATH_VOID`
- `DIALOGUE_STAKES_SUSPENSE_AFTERMATH_VOID`

## Wave 1008

Wave 1008 additions: this wave gives three existing aftermath-void triggers a fresh consequence channel: DIALOGUE_STAKES_EMOTIONAL_AFTERMATH_VOID (raise_stakes, previously paired with dialogueHighlights and curiosityDelta, now paired with emotionalShift), DIALOGUE_OPEN_THREAD_CURIOSITY_AFTERMATH_VOID (heavy unresolvedClues debt, previously only paired with dialogueHighlights, now paired with curiosityDelta), and DIALOGUE_SEED_RELATIONAL_AFTERMATH_VOID (seededClueIds, previously only paired with suspenseDelta, now paired with relationshipShifts).

Rules named in this wave's header:

- `DIALOGUE_OPEN_THREAD_CURIOSITY_AFTERMATH_VOID`
- `DIALOGUE_SEED_RELATIONAL_AFTERMATH_VOID`
- `DIALOGUE_STAKES_EMOTIONAL_AFTERMATH_VOID`

## Wave 994

Wave 994 additions (opens the thirty-first rotation cycle): DIALOGUE_CLOCK_DELTA_ZONE_IMBALANCE (clockDelta !== 0, distinct from the boolean clockRaised field audited in Wave 980) — the last clean trio-complete zone-imbalance candidate in this pass (DIALOGUE_STAGING was skipped: its cluster/drought predicates disagree, >=2 vs >0 visualBeats). With zone-imbalance now exhausted, this wave completes the trio with two aftermath-void pairings: DIALOGUE_STAKES_CURIOSITY_AFTERMATH_VOID (raise_stakes, already a trigger in this pass paired with dialogueHighlights, now paired with curiosityDelta for the first time) and DIALOGUE_SEED_SUSPENSE_AFTERMATH_VOID (seededClueIds → suspenseDelta, the first use of either field as a checkAftermathVoid channel in this pass).

Rules named in this wave's header:

- `DIALOGUE_CLOCK_DELTA_ZONE_IMBALANCE`
- `DIALOGUE_SEED_SUSPENSE_AFTERMATH_VOID`
- `DIALOGUE_STAKES_CURIOSITY_AFTERMATH_VOID`

## Wave 980

Wave 980 additions (opens the twenty-ninth rotation cycle): auditing three more trio-complete signals in this pass, spanning three distinct classes: DIALOGUE_EMOTION_ZONE_IMBALANCE (emotionalShift !== 'neutral' -- the any-direction valence signal), DIALOGUE_SEED_ZONE_IMBALANCE (seededClueIds array), and DIALOGUE_CLOCK_ZONE_IMBALANCE (clockRaised boolean -- the split-name DIALOGUE_CLOCK/DIALOGUE_CLOCK_RAISED cluster+drought pair, both keyed on the same field).

Rules named in this wave's header:

- `DIALOGUE_CLOCK_ZONE_IMBALANCE`
- `DIALOGUE_EMOTION_ZONE_IMBALANCE`
- `DIALOGUE_SEED_ZONE_IMBALANCE`

## Wave 966

Wave 966 additions (opens the twenty-eighth rotation cycle): continuing the non-purpose 4-zone rollout with three more trio-complete signals spanning three distinct classes: DIALOGUE_CURIOSITY_ZONE_IMBALANCE (curiosityDelta > 0 -- the question-raising delta beside Wave 952's suspense one), DIALOGUE_REVELATION_ZONE_IMBALANCE (revelation != null -- the revelation string field, distinct from the purpose-enum DIALOGUE_REVELATION_PURPOSE one), and DIALOGUE_RELATIONSHIP_ZONE_IMBALANCE (relationshipShifts.length > 0 -- a relationshipShifts array distinct from 952's open-thread one).

Rules named in this wave's header:

- `DIALOGUE_CURIOSITY_ZONE_IMBALANCE`
- `DIALOGUE_RELATIONSHIP_ZONE_IMBALANCE`
- `DIALOGUE_REVELATION_ZONE_IMBALANCE`

## Wave 952

Wave 952 additions (opens the twenty-seventh rotation cycle): extending the checkZoneImbalance rollout to three more trio-complete signals spanning three distinct signal classes: DIALOGUE_REVELATION_PURPOSE_ZONE_IMBALANCE (purpose === 'revelation', trio completed Wave 938), DIALOGUE_SUSPENSE_ZONE_IMBALANCE (suspenseDelta > 0 -- tension-delta magnitude), and DIALOGUE_OPEN_THREAD_ZONE_IMBALANCE (unresolvedClues.length > 0 -- an open-thread array field distinct from the already-audited payoffSetupIds imbalance).

Rules named in this wave's header:

- `DIALOGUE_OPEN_THREAD_ZONE_IMBALANCE`
- `DIALOGUE_REVELATION_PURPOSE_ZONE_IMBALANCE`
- `DIALOGUE_SUSPENSE_ZONE_IMBALANCE`

## Wave 938

Wave 938 additions (opens the twenty-sixth rotation cycle): purpose === 'revelation' has never been referenced anywhere in this pass (the pre-existing DIALOGUE_REVELATION_ZONE_CLUSTER/ DROUGHT_RUN audit the separate revelation string|null field, not this purpose enum value) -- a genuinely virgin field. This wave adds DIALOGUE_REVELATION_PURPOSE_ZONE_CLUSTER and DIALOGUE_REVELATION_PURPOSE_DROUGHT_RUN (peak mode conventionally skipped for this categorical field), plus DIALOGUE_POSITIVE_EMOTION_ZONE_IMBALANCE, extending the 4-zone checkZoneImbalance mode to the emotionalShift valence signal (emotionalShift === 'positive' has a complete 3-zone/run trio but has never been audited by it).

Rules named in this wave's header:

- `DIALOGUE_POSITIVE_EMOTION_ZONE_IMBALANCE`
- `DIALOGUE_REVELATION_PURPOSE_DROUGHT_RUN`
- `DIALOGUE_REVELATION_PURPOSE_ZONE_CLUSTER`

## Wave 924

Wave 924 additions (opens the twenty-fifth rotation cycle): continuing the checkZoneImbalance rollout, this wave applies the 4-zone bloat+empty-zone mode to three more signals that each already have a complete 3-zone/run-based trio but had never been audited by it: DIALOGUE_CHARACTER_MOMENT_ZONE_IMBALANCE (purpose === 'character_moment'), DIALOGUE_STAKES_ZONE_IMBALANCE (purpose === 'raise_stakes'), and DIALOGUE_NEGATIVE_EMOTION_ZONE_IMBALANCE (emotionalShift === 'negative', a valence signal with a complete 3-zone/run trio).

Rules named in this wave's header:

- `DIALOGUE_CHARACTER_MOMENT_ZONE_IMBALANCE`
- `DIALOGUE_NEGATIVE_EMOTION_ZONE_IMBALANCE`
- `DIALOGUE_STAKES_ZONE_IMBALANCE`

## Wave 910

Wave 910 additions (opens the twenty-fourth rotation cycle): continuing the checkZoneImbalance rollout begun in Wave 896, this wave applies the 4-zone bloat+empty-zone mode to three more purpose values that each already have a complete 3-zone/run-based trio (checkZoneCluster + checkDroughtRun) but have never been audited by it: DIALOGUE_COMPLICATE_ZONE_IMBALANCE (purpose === 'complicate'), DIALOGUE_INTRODUCE_CONFLICT_ZONE_IMBALANCE (purpose === 'introduce_conflict'), and DIALOGUE_TURNING_POINT_ZONE_IMBALANCE (purpose === 'turning_point').

Rules named in this wave's header:

- `DIALOGUE_COMPLICATE_ZONE_IMBALANCE`
- `DIALOGUE_INTRODUCE_CONFLICT_ZONE_IMBALANCE`
- `DIALOGUE_TURNING_POINT_ZONE_IMBALANCE`

## Wave 896

Wave 896 additions (opens the twenty-third rotation cycle): no purpose value had ever been audited by the distinct 4-zone checkZoneImbalance mode in this pass (only visualBeats, character_moment, and payoffSetupIds had). This wave applies it to three purpose values with complete 3-zone/run-based trios: DIALOGUE_CLIMAX_ZONE_IMBALANCE (purpose === 'climax'), DIALOGUE_ESTABLISH_WORLD_ZONE_IMBALANCE (purpose === 'establish_world'), and DIALOGUE_RESOLUTION_ZONE_IMBALANCE (purpose === 'resolution').

Rules named in this wave's header:

- `DIALOGUE_CLIMAX_ZONE_IMBALANCE`
- `DIALOGUE_ESTABLISH_WORLD_ZONE_IMBALANCE`
- `DIALOGUE_RESOLUTION_ZONE_IMBALANCE`

## Wave 882

Wave 882 additions (opens the twenty-second rotation cycle): DIALOGUE_RESOLUTION_DROUGHT_RUN (run-based x purpose === 'resolution' absence -- completes 2 of 3 slots for this purpose value alongside the zone-cluster mode added in Wave 868; peak mode conventionally skipped for this categorical field), DIALOGUE_COMPLICATE_ZONE_CLUSTER (distribution/timing x purpose === 'complicate' x structural thirds -- this purpose value has never been referenced anywhere in this pass; a virgin field), DIALOGUE_COMPLICATE_DROUGHT_RUN (run-based x purpose === 'complicate' absence -- completes 2 of 3 slots for this purpose value alongside the zone-cluster mode added in this same wave; peak mode conventionally skipped for this categorical field).

Rules named in this wave's header:

- `DIALOGUE_COMPLICATE_DROUGHT_RUN`
- `DIALOGUE_COMPLICATE_ZONE_CLUSTER`
- `DIALOGUE_RESOLUTION_DROUGHT_RUN`

## Wave 868

Wave 868 additions (opens the twenty-first rotation cycle): DIALOGUE_CLIMAX_DROUGHT_RUN (run-based x purpose === 'climax' absence -- completes 2 of 3 slots for this purpose value alongside the zone-cluster mode added in Wave 854; peak mode conventionally skipped for this categorical field), DIALOGUE_ESTABLISH_WORLD_DROUGHT_RUN (run-based x purpose === 'establish_world' absence -- completes 2 of 3 slots for this purpose value alongside the zone-cluster mode added in Wave 854; peak mode conventionally skipped for this categorical field), DIALOGUE_RESOLUTION_ZONE_CLUSTER (distribution/timing x purpose === 'resolution' x structural thirds -- this purpose value has never been referenced anywhere in this pass; a virgin field).

Rules named in this wave's header:

- `DIALOGUE_CLIMAX_DROUGHT_RUN`
- `DIALOGUE_ESTABLISH_WORLD_DROUGHT_RUN`
- `DIALOGUE_RESOLUTION_ZONE_CLUSTER`

## Wave 854

Wave 854 additions (opens the twentieth rotation cycle): DIALOGUE_POSITIVE_EMOTION_DROUGHT_RUN (run-based × emotionalShift === 'positive' absence — completes 2 of 3 slots for this valence alongside the zone-cluster mode added in Wave 840; peak mode conventionally skipped for this categorical field), DIALOGUE_CLIMAX_ZONE_CLUSTER (distribution/timing × purpose === 'climax' × structural thirds — this purpose value has only ever appeared combined with 'turning_point' inside a co-occurrence check; it has never been audited as its own standalone signal), DIALOGUE_ESTABLISH_WORLD_ZONE_CLUSTER (distribution/timing × purpose === 'establish_world' × structural thirds — this purpose value has never been referenced anywhere in this pass; a virgin field).

Rules named in this wave's header:

- `DIALOGUE_CLIMAX_ZONE_CLUSTER`
- `DIALOGUE_ESTABLISH_WORLD_ZONE_CLUSTER`
- `DIALOGUE_POSITIVE_EMOTION_DROUGHT_RUN`

## Wave 840

Wave 840 additions (opens the nineteenth rotation cycle): DIALOGUE_INTRODUCE_CONFLICT_DROUGHT_RUN (run-based × purpose === 'introduce_conflict' absence — completes 2 of 3 slots for this purpose value alongside the zone-cluster mode added in Wave 826; peak mode conventionally skipped for this categorical field), DIALOGUE_NEGATIVE_EMOTION_DROUGHT_RUN (run-based × emotionalShift === 'negative' absence — completes 2 of 3 slots for this valence alongside the zone-cluster mode added in Wave 826; peak mode conventionally skipped for this categorical field), DIALOGUE_POSITIVE_EMOTION_ZONE_CLUSTER (distribution/timing × emotionalShift === 'positive' × structural thirds — distinct from DIALOGUE_EMOTION_ZONE_CLUSTER [Wave 686], which tests combined non-neutral emotionalShift [either valence]; this isolates the positive valence alone, opening a new trio in this pass).

Rules named in this wave's header:

- `DIALOGUE_INTRODUCE_CONFLICT_DROUGHT_RUN`
- `DIALOGUE_NEGATIVE_EMOTION_DROUGHT_RUN`
- `DIALOGUE_POSITIVE_EMOTION_ZONE_CLUSTER`

## Wave 826

Wave 826 additions (opens the eighteenth rotation cycle): DIALOGUE_TURNING_POINT_DROUGHT_RUN (run-based × purpose === 'turning_point' absence — completes 2 of 3 slots for this purpose value alongside the zone-cluster mode added in Wave 812; peak mode conventionally skipped for this categorical field), DIALOGUE_INTRODUCE_CONFLICT_ZONE_CLUSTER (distribution/timing × purpose === 'introduce_conflict' × structural thirds — this purpose value has never been referenced anywhere in this pass; a virgin field), DIALOGUE_NEGATIVE_EMOTION_ZONE_CLUSTER (distribution/timing × emotionalShift === 'negative' × structural thirds — distinct from DIALOGUE_EMOTION_ZONE_CLUSTER [Wave 686], which tests combined non-neutral emotionalShift [either valence]; this isolates the negative valence alone, which none of the three shared-library trio modes has ever done on its own).

Rules named in this wave's header:

- `DIALOGUE_INTRODUCE_CONFLICT_ZONE_CLUSTER`
- `DIALOGUE_NEGATIVE_EMOTION_ZONE_CLUSTER`
- `DIALOGUE_TURNING_POINT_DROUGHT_RUN`

## Wave 812

Wave 812 additions (opens the seventeenth rotation cycle): DIALOGUE_STAKES_ZONE_CLUSTER (distribution/timing × purpose === 'raise_stakes' × structural thirds — this purpose value has only ever served as an isTrigger condition for an aftermath check [RAISE_STAKES_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID]; none of the three shared-library trio modes has ever been applied to it as the primary distributional signal), DIALOGUE_STAKES_DROUGHT_RUN (run-based × purpose === 'raise_stakes' absence — completing 2 of 3 slots for this purpose value alongside the zone-cluster mode added in this same wave; peak mode conventionally skipped for this categorical field), DIALOGUE_TURNING_POINT_ZONE_CLUSTER (distribution/timing × purpose === 'turning_point' × structural thirds — this purpose value has only ever appeared combined with 'climax' inside a co-occurrence-decoupling check; it has never been audited as its own standalone signal by any of the three shared-library trio modes).

Rules named in this wave's header:

- `DIALOGUE_STAKES_DROUGHT_RUN`
- `DIALOGUE_STAKES_ZONE_CLUSTER`
- `DIALOGUE_TURNING_POINT_ZONE_CLUSTER`

## Wave 798

Wave 798 additions (opens the sixteenth rotation cycle): DIALOGUE_REVELATION_DROUGHT_RUN (run-based × revelation absence — Wave 784 applied the zone-cluster mode to revelation; completing 2 of 3 trio slots), DIALOGUE_REVELATION_PEAK_UNCAUSED (backward-cause × revelation-as-magnitude [0/1] × 2-scene lookback, anchored on the FIRST revelation scene — completes the trio for revelation; hasCause deliberately omits revelation to avoid circularity), DIALOGUE_CHARACTER_MOMENT_ZONE_CLUSTER (distribution/timing × purpose === 'character_moment' × structural thirds — the existing CHARACTER_MOMENT_ZONE_IMBALANCE uses checkZoneImbalance, a different shared-library helper testing deficit-vs-surplus across the four named acts, not the general thirds-based >75%-concentration test; completing the trio for this categorical field alongside the pre-existing drought-run mode, peak conventionally skipped).

Rules named in this wave's header:

- `DIALOGUE_CHARACTER_MOMENT_ZONE_CLUSTER`
- `DIALOGUE_REVELATION_DROUGHT_RUN`
- `DIALOGUE_REVELATION_PEAK_UNCAUSED`

## Wave 784

Wave 784 additions (opens the fifteenth rotation cycle): DIALOGUE_REVELATION_ZONE_CLUSTER (distribution/timing × revelation × structural thirds — revelation as a primary signal has only ever anchored co-occurrence [DIALOGUE_REVELATION_SCENE_VOID] and aftermath [DIALOGUE_REVELATION_AFTERMATH_SILENT] checks in this pass; none of the three shared-library trio modes has ever been applied to it), DIALOGUE_CLOCK_RAISED_ZONE_CLUSTER (distribution/timing × clockRaised === true presence × structural thirds — the run-based drought mode has already been applied to clockRaised; the zone-cluster mode has never been applied to it), DIALOGUE_EMOTION_DROUGHT_RUN (run-based × emotionalShift !== 'neutral' absence — DIALOGUE_EMOTION_ZONE_CLUSTER already applied the zone-cluster mode to this signal; the drought-run mode has never been applied to it).

Rules named in this wave's header:

- `DIALOGUE_CLOCK_RAISED_ZONE_CLUSTER`
- `DIALOGUE_EMOTION_DROUGHT_RUN`
- `DIALOGUE_REVELATION_ZONE_CLUSTER`

## Wave 770

Wave 770 additions: DIALOGUE_CLOCK_DELTA_ZONE_CLUSTER (distribution/timing × clockDelta≠0 presence × structural thirds — Waves 672/756 applied the backward-cause peak and run-based drought modes to clockDelta; the zone-cluster mode has never been applied to it, completing the trio), DIALOGUE_SUSPENSE_PEAK_UNCAUSED (backward-cause × suspenseDelta-as-magnitude × 2-scene lookback — Waves 672/756 applied the zone-cluster and run-based drought modes to suspenseDelta; the backward-cause peak mode has never been applied to it, completing the trio), DIALOGUE_RELATIONSHIP_DROUGHT_RUN (run-based × relationshipShifts presence absence — Waves 686/756 applied the backward-cause peak and zone-cluster modes to relationshipShifts; the drought-run mode has never been applied to it, completing the trio).

Rules named in this wave's header:

- `DIALOGUE_CLOCK_DELTA_ZONE_CLUSTER`
- `DIALOGUE_RELATIONSHIP_DROUGHT_RUN`
- `DIALOGUE_SUSPENSE_PEAK_UNCAUSED`

## Wave 756

Wave 756 additions (opens the thirteenth rotation cycle): DIALOGUE_RELATIONSHIP_ZONE_CLUSTER (distribution/timing × relationshipShifts × structural thirds — Wave 686 applied the backward-cause peak mode to relationshipShifts; the zone-cluster mode has never been applied to it), DIALOGUE_CLOCK_DELTA_DROUGHT_RUN (run-based × clockDelta≠0 absence — Wave 672 applied the backward-cause peak mode to clockDelta; the drought-run mode has never been applied to it), DIALOGUE_SUSPENSE_DROUGHT_RUN (run-based × suspenseDelta>0 absence — Wave 672 applied the zone-cluster mode to suspenseDelta; the drought-run mode has never been applied to it).

Rules named in this wave's header:

- `DIALOGUE_CLOCK_DELTA_DROUGHT_RUN`
- `DIALOGUE_RELATIONSHIP_ZONE_CLUSTER`
- `DIALOGUE_SUSPENSE_DROUGHT_RUN`

## Wave 742

Wave 742 additions (opens the twelfth rotation cycle): DIALOGUE_CURIOSITY_ZONE_CLUSTER (distribution/timing × curiosityDelta>0 presence × structural thirds — Waves 644/728 applied the run-based drought and backward-cause peak modes to curiosityDelta; the zone-cluster mode has never been applied to it, completing the trio), DIALOGUE_OPEN_THREAD_PEAK_UNCAUSED (single-peak isolation/backward-cause × unresolvedClues magnitude — Waves 644/728 applied the zone-cluster and run-based drought modes to unresolvedClues; the backward-cause peak mode has never been applied to it, completing the trio), DIALOGUE_STAGING_DROUGHT_RUN (run-based × visualBeats absence — Waves 658/728 applied the backward-cause peak and zone-cluster modes to visualBeats; the drought-run mode has never been applied to it, completing the trio).

Rules named in this wave's header:

- `DIALOGUE_CURIOSITY_ZONE_CLUSTER`
- `DIALOGUE_OPEN_THREAD_PEAK_UNCAUSED`
- `DIALOGUE_STAGING_DROUGHT_RUN`

## Wave 728

Wave 728 additions (opens the eleventh rotation cycle): DIALOGUE_CURIOSITY_PEAK_UNCAUSED (single-peak isolation/backward-cause × curiosityDelta magnitude — Wave 644 applied the drought-run mode to curiosityDelta; the backward-cause peak mode has never been applied to it), DIALOGUE_OPEN_THREAD_DROUGHT_RUN (run-based × unresolvedClues absence — Wave 644 applied the zone-cluster mode to unresolvedClues; the drought-run mode has never been applied to it), DIALOGUE_STAGING_ZONE_CLUSTER (distribution/timing × visualBeats × structural thirds — Wave 658 applied the backward-cause peak mode to visualBeats; the zone-cluster mode has never been applied to it).

Rules named in this wave's header:

- `DIALOGUE_CURIOSITY_PEAK_UNCAUSED`
- `DIALOGUE_OPEN_THREAD_DROUGHT_RUN`
- `DIALOGUE_STAGING_ZONE_CLUSTER`

## Wave 714

Wave 714 additions: HIGHLIGHTED_DIALOGUE_DROUGHT_RUN (run-based × dialogueHighlights absence — Waves 644/700 applied the backward-cause peak and zone-cluster modes to dialogueHighlights; the drought-run mode has never been applied to it, completing the trio; named distinctly from structure.ts's Wave 597 DIALOGUE_HIGHLIGHT_DROUGHT_RUN to avoid a cross-file rule-name collision), DIALOGUE_SEED_ZONE_CLUSTER (distribution/timing × seededClueIds × structural thirds — Waves 658/700 applied the drought-run and backward-cause peak modes to seededClueIds; the zone-cluster mode has never been applied to it, completing the trio), DIALOGUE_PAYOFF_PEAK_UNCAUSED (single-peak isolation/backward-cause × payoffSetupIds magnitude — Waves 658/700 applied the zone-cluster and drought-run modes to payoffSetupIds; the backward-cause peak mode has never been applied to it, completing the trio).

Rules named in this wave's header:

- `DIALOGUE_PAYOFF_PEAK_UNCAUSED`
- `DIALOGUE_SEED_ZONE_CLUSTER`
- `HIGHLIGHTED_DIALOGUE_DROUGHT_RUN`

## Wave 700

Wave 700 additions (opens the ninth rotation cycle): DIALOGUE_HIGHLIGHT_ZONE_CLUSTER (distribution/timing × dialogueHighlights × structural thirds — Wave 644 applied the backward-cause peak mode to dialogueHighlights; the zone-cluster mode has never been applied to this channel), DIALOGUE_SEED_PEAK_UNCAUSED (single-peak isolation/backward-cause × seededClueIds magnitude — Wave 658 applied the drought-run mode to seededClueIds; the backward-cause peak mode has never been applied to this channel), DIALOGUE_PAYOFF_DROUGHT_RUN (run-based × payoffSetupIds absence — Wave 658 applied the zone-cluster mode to payoffSetupIds; the drought-run mode has never been applied to this channel).

Rules named in this wave's header:

- `DIALOGUE_HIGHLIGHT_ZONE_CLUSTER`
- `DIALOGUE_PAYOFF_DROUGHT_RUN`
- `DIALOGUE_SEED_PEAK_UNCAUSED`

## Wave 686

Wave 686 additions (opens the eighth rotation cycle): DIALOGUE_RELATIONSHIP_PEAK_UNCAUSED (single-peak isolation/backward-cause × relationshipShifts magnitude — relationshipShifts has only ever anchored an aftermath-void trigger [Wave 630] in this pass; the scene with the most simultaneous bond changes has never been backward-cause peak-audited), DIALOGUE_CHARACTER_MOMENT_DROUGHT_RUN (run-based × purpose === 'character_moment' absence — distinct from Wave 616's CHARACTER_MOMENT_ZONE_IMBALANCE, which checks four-zone bloat/empty distribution rather than a contiguous run of absence), DIALOGUE_EMOTION_ZONE_CLUSTER (distribution/timing × emotionalShift !== 'neutral' × structural thirds — emotionalShift has only ever anchored hand-rolled positive/negative filters in this pass, never the zone-cluster mode).

Rules named in this wave's header:

- `DIALOGUE_CHARACTER_MOMENT_DROUGHT_RUN`
- `DIALOGUE_EMOTION_ZONE_CLUSTER`
- `DIALOGUE_RELATIONSHIP_PEAK_UNCAUSED`

## Wave 672

Wave 672 additions (built on the shared checks library, audit M2.2): DIALOGUE_CLOCK_DELTA_PEAK_UNCAUSED (single-peak isolation/backward-cause × clockDelta magnitude — distinct from the existing hand-rolled DIALOGUE_CLOCK_PEAK_SILENT [Wave 574], which checks whether the peak-clockDelta scene has any raw dialogue at all; this instead asks whether that scene is structurally caused by a dramatic turn or revelation), DIALOGUE_CLOCK_DROUGHT_RUN (run-based × clockRaised absence — clockRaised has only ever served as a hand-rolled aftermath trigger in this pass, never drought-audited via the shared helper), DIALOGUE_SUSPENSE_ZONE_CLUSTER (distribution/timing × suspenseDelta>0 × structural thirds — suspenseDelta is this pass's least-touched signal field; the zone-cluster mode applied to it for the first time).

Rules named in this wave's header:

- `DIALOGUE_CLOCK_DELTA_PEAK_UNCAUSED`
- `DIALOGUE_CLOCK_DROUGHT_RUN`
- `DIALOGUE_CLOCK_PEAK_SILENT`
- `DIALOGUE_SUSPENSE_ZONE_CLUSTER`

## Wave 658

Wave 658 additions (built on the shared checks library, audit M2.2): DIALOGUE_STAGING_PEAK_UNCAUSED (single-peak isolation/backward-cause × visualBeats magnitude — every prior peak check in this 123-rule pass anchors on raw dialogue density [DIALOGUE_VERBAL_PEAK_UNCAUSED] or the dialogueHighlights channel [Wave 644]; this is the first application to physical staging), DIALOGUE_SEED_DROUGHT_RUN (run-based × seededClueIds absence — Wave 644 applied the drought-run mode to curiosityDelta; seededClueIds itself has never been drought-audited here), DIALOGUE_PAYOFF_ZONE_CLUSTER (distribution/timing × payoffSetupIds × structural thirds — distinct from the existing DIALOGUE_PAYOFF_ZONE_IMBALANCE [Wave 630 — four-zone bloat/empty check]; this is a three-zone concentration measure on the same field, firing on skew even when no zone is empty).

Rules named in this wave's header:

- `DIALOGUE_PAYOFF_ZONE_CLUSTER`
- `DIALOGUE_SEED_DROUGHT_RUN`
- `DIALOGUE_STAGING_PEAK_UNCAUSED`
- `DIALOGUE_VERBAL_PEAK_UNCAUSED`

## Wave 644

Wave 644 additions (built on the shared checks library, audit M2.2): introduces THREE previously-unused analytical modes into this 120-rule pass in one wave — checkPeakUncaused, checkDroughtRun, and checkZoneCluster had never been imported here, despite all three being well established elsewhere. DIALOGUE_HIGHLIGHT_PEAK_UNCAUSED (single-peak isolation/backward-cause × dialogueHighlights magnitude — the scene with the single densest count of highlighted lines has no dramatic turn or revelation in itself or the two scenes before it, while such causes exist elsewhere; first checkPeakUncaused use in this file), DIALOGUE_CURIOSITY_DROUGHT_RUN (run-based × curiosityDelta>0 — a 6+ consecutive-scene stretch with no rising curiosity at all, while curiosity spikes occur ≥3 times elsewhere; distinct from DIALOGUE_CURIOSITY_SPIKE_SCENE_VOID [Wave 588 — co-occurrence: checks whether curiosity-spike scenes individually lack dialogue] since this instead measures a contiguous absence of the spike signal itself over time, independent of dialogue presence), DIALOGUE_OPEN_THREAD_ZONE_CLUSTER (distribution/timing × unresolvedClues × structural thirds — >75% of open-thread scenes concentrate in one third; distinct from this file's existing unresolvedClues checks, which are co-occurrence [paired with dialogueHighlights] and sequence/aftermath [as a ≥3-debt trigger] — this is the first purely distributional measure on the signal here).

Rules named in this wave's header:

- `DIALOGUE_CURIOSITY_DROUGHT_RUN`
- `DIALOGUE_CURIOSITY_SPIKE_SCENE_VOID`
- `DIALOGUE_HIGHLIGHT_PEAK_UNCAUSED`
- `DIALOGUE_OPEN_THREAD_ZONE_CLUSTER`

## Wave 630

Wave 630 additions (built on the shared checks library, audit M2.2): DIALOGUE_PAYOFF_STAGING_DECOUPLED (co-occurrence/decoupling × payoffSetupIds × visualBeats — payoffSetupIds had only ever been paired with the raw fountain-derived dialogue signal, never with another record field), DIALOGUE_SHIFT_STAGING_AFTERMATH_VOID (sequence/aftermath × relationshipShifts trigger → visualBeats absence — first pairing of these two fields in this 117-rule pass), DIALOGUE_PAYOFF_ZONE_IMBALANCE (underweight/bloat × payoffSetupIds × four structural zones — Waves 602/616 applied this template to visualBeats and purpose; payoffSetupIds itself has never been zone-audited here).

Rules named in this wave's header:

- `DIALOGUE_PAYOFF_STAGING_DECOUPLED`
- `DIALOGUE_PAYOFF_ZONE_IMBALANCE`
- `DIALOGUE_SHIFT_STAGING_AFTERMATH_VOID`

## Wave 616

Wave 616 additions (built on the shared checks library, audit M2.2): PURPOSE_DIALOGUE_HIGHLIGHT_DECOUPLED, CHARACTER_MOMENT_ZONE_IMBALANCE, RAISE_STAKES_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID — first genuine use of the `purpose` field anywhere in this 114-rule pass. Its only earlier appearance was the word "purpose" inside a suggestedFix prose string (Wave 504), never an accessed field — despite `purpose` being a real ScenePurpose enum this pass never once consulted, even as nearly every other record field was covered across Waves 434-602.

Rules named in this wave's header:

- `CHARACTER_MOMENT_ZONE_IMBALANCE`
- `PURPOSE_DIALOGUE_HIGHLIGHT_DECOUPLED`
- `RAISE_STAKES_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID`

## Wave 602

Wave 602 additions (built on the shared checks library, audit M2.2): DIALOGUE_HIGHLIGHT_OPEN_THREAD_DECOUPLED (co-occurrence/decoupling × dialogueHighlights × unresolvedClues — first use of either field as a per-scene RECORD signal in this pass; every prior "dialogue" check in this 111-rule file derives dialogue presence from the raw fountain text via extractDialogue/dlgPerScene, never from the record's own curated dialogueHighlights annotation), VISUAL_BEAT_ZONE_IMBALANCE (underweight/bloat × visualBeats × four structural zones — first use of visualBeats anywhere in this pass), OPEN_THREAD_DIALOGUE_AFTERMATH_VOID (sequence/aftermath × heavy unresolved-clue-debt trigger → dialogueHighlights absence — a two-scene window, distinguishing it mechanically from this pass's other seven aftermath checks which all use a one-scene "next scene" window keyed to event-type triggers rather than accumulated-debt magnitude).

Rules named in this wave's header:

- `DIALOGUE_HIGHLIGHT_OPEN_THREAD_DECOUPLED`
- `OPEN_THREAD_DIALOGUE_AFTERMATH_VOID`
- `VISUAL_BEAT_ZONE_IMBALANCE`

## Wave 588

Wave 588 additions: dialogue curiosity-spike scene void (co-occurrence/decoupling × curiosity spike × dialogue absence — n≥8, ≥2 curiosity-spike scenes [curiosityDelta>0], ≥3 dialogue scenes globally, no curiosity-spike scene has any dialogue while dialogue exists in non-spike scenes; the curiosity-channel co-occurrence complement of DIALOGUE_CURIOSITY_PEAK_SILENT [single-peak isolation — only the highest-curiosityDelta scene is checked]; distinct from DIALOGUE_REVELATION_SCENE_VOID [revelation trigger] and DIALOGUE_SUSPENSE_AFTERMATH_SILENT [aftermath × suspense]), dialogue closing-zone silent (zone presence/absence × closing third × dialogue absence — n≥9, ≥4 dialogue scenes globally, opening and middle thirds each have ≥1 dialogue scene, closing third has 0 dialogue scenes; the resolution act is entirely voiceless while opening and middle are verbally active; distinct from DIALOGUE_MIDDLE_ZONE_SILENT [middle not closing — symmetric opposite], DIALOGUE_CLIMAX_VOID [final 20% not final third], DIALOGUE_OPENING_SILENT [different zone]), dialogue hedge back-loaded (distribution/timing × hedge lexeme × second half — dialogue≥14, ≥5 hedging lines globally, second half carries ≥5 and first half ≤1; uncertainty/tentativeness concentrated in the climax and resolution while setup dialogue is largely certain; the temporal mirror of DIALOGUE_HEDGE_FRONT_LOADED [Wave 434: ≥5 in first half]; distinct from DIALOGUE_NEGATION_BACK_LOADED [negation not hedge], DIALOGUE_QUESTION_BACK_LOADED [question channel]).

Rules named in this wave's header:

- `DIALOGUE_CURIOSITY_PEAK_SILENT`
- `DIALOGUE_MIDDLE_ZONE_SILENT`
- `DIALOGUE_NEGATION_BACK_LOADED`
- `DIALOGUE_OPENING_SILENT`
- `DIALOGUE_SUSPENSE_AFTERMATH_SILENT`

## Wave 574

Wave 574 additions: dialogue clock peak silent (single-peak isolation × clockDelta × dialogue absence — n≥8, ≥2 clockDelta>0 scenes, ≥2 dialogue scenes, scene with max clockDelta has no dialogue while ≥1 other clockDelta>0 scene does; the clockDelta single-peak completion of the peak-silence family alongside TENSION_PEAK_SILENT [suspenseDelta], CURIOSITY_PEAK_SILENT [curiosityDelta], RELATIONSHIP_PEAK_SILENT [relationship magnitude]; distinct from CLOCK_SCENE_VOID [co-occurrence — ALL clockRaised scenes silent, not the single peak]), dialogue sparse run (run-based × near-silence × consecutive scenes — n≥9, ≥4 dialogue scenes globally, longest consecutive run of scenes each with ≤1 dialogue line ≥4; extended near-silence where dialogue has almost disappeared; distinct from DIALOGUE_SILENCE_RUN [Wave 504: ≥3 completely ZERO-dialogue consecutive scenes — this uses ≤1 threshold catching single-exchange runs that don't trigger absolute-silence check], DIALOGUE_SCENE_TEMPORAL_CLUSTER [thirds concentration, not run-based]), dialogue negation back-loaded (distribution/timing × negation content × second half — dialogue≥8, ≥3 negation lines globally, >75% in second half; refusal/denial concentrated in escalation/resolution while setup is largely acceptance-toned; the temporal mirror of DIALOGUE_NEGATION_FRONT_LOADED [Wave 546: >75% in first half]; distinct from DIALOGUE_NEGATION_FLOOD [global rate], DIALOGUE_QUESTION_BACK_LOADED [question channel × same direction]).

Rules named in this wave's header:

- `DIALOGUE_NEGATION_FLOOD`
- `DIALOGUE_NEGATION_FRONT_LOADED`
- `DIALOGUE_QUESTION_BACK_LOADED`
- `DIALOGUE_SCENE_TEMPORAL_CLUSTER`
- `DIALOGUE_SILENCE_RUN`

## Wave 560

Wave 560 additions: dialogue clock aftermath silent (sequence/aftermath × clock trigger → dialogue absence in next scene — n≥8, ≥2 qualifying clockRaised scenes not at last pos, ≥3 scenes with dialogue, none of the following scenes has dialogue; deadline machinery fires in silence and passes without verbal registration; the clock-trigger complement of DIALOGUE_REVELATION_AFTERMATH_SILENT, distinct from DIALOGUE_CLOCK_SCENE_VOID [co-occurrence within the clock scene itself]), dialogue seed aftermath silent (sequence/aftermath × seed trigger → dialogue absence in next scene — n≥8, ≥2 qualifying seed scenes not at last pos, ≥3 scenes with dialogue, none of the following scenes has dialogue; every planted clue passes into silence without verbal acknowledgment; distinct from SEED_SCENE_DIALOGUE_ABSENT [co-occurrence in the seed scene itself] and from DIALOGUE_PAYOFF_AFTERMATH_SILENT [payoff trigger — the resolution sibling]), dialogue relationship shift aftermath silent (sequence/aftermath × relationship-shift trigger → dialogue absence in next scene — n≥8, ≥2 qualifying relShift scenes not at last pos, ≥3 scenes with dialogue, none of the following scenes has dialogue; every bond change passes without verbal registration in the next beat; distinct from RELATIONSHIP_SHIFT_SCENE_DIALOGUE_ABSENT [co-occurrence in the shift scene itself] and from all other aftermath triggers in this pass, completing the event-type aftermath family alongside clock/revelation/dramatic-turn/payoff/suspense/seed).

Rules named in this wave's header:

- `DIALOGUE_CLOCK_SCENE_VOID`
- `DIALOGUE_PAYOFF_AFTERMATH_SILENT`
- `SEED_SCENE_DIALOGUE_ABSENT`

## Wave 546

Wave 546 additions: dialogue relationship peak silent (single-peak isolation × relationship-shift magnitude × dialogue absence — n≥8, ≥2 relShift scenes, ≥3 dialogue scenes, the scene with max total absolute relationship-magnitude has no dialogue while ≥1 other relShift scene does; the relational-magnitude single-peak check, distinct from RELATIONSHIP_SHIFT_SCENE_DIALOGUE_ABSENT [all relShift scenes silent] and TENSION_PEAK_SILENT/CURIOSITY_PEAK_SILENT [different channels]), dialogue negation front-loaded (distribution/timing × negation content × first half — dlg≥8, ≥3 negation lines globally, >75% fall in first half; refusal/denial concentrated in setup and absent in escalation; distinct from NEGATION_FLOOD [global rate] and QUESTION_BACK_LOADED [opposite direction, different content]), dialogue suspense aftermath silent (sequence/aftermath × suspense spike → dialogue absence in following scene — n≥8, ≥2 qualifying suspense-spike scenes [suspenseDelta>0, not at last pos], ≥3 dialogue scenes, none of the following scenes has dialogue; distinct from TENSION_PEAK_SILENT [single-peak, the spike scene itself], DRAMATIC_TURN_AFTERMATH_SILENT [turn trigger], REVELATION_AFTERMATH_SILENT [revelation trigger]).

Rules named in this wave's header:

- `RELATIONSHIP_SHIFT_SCENE_DIALOGUE_ABSENT`

## Wave 532

Wave 532 additions: dialogue dramatic-turn aftermath silent (sequence/aftermath × dramatic-turn trigger → dialogue absence in next scene — n≥8, ≥2 dramatic-turn scenes not at last position, ≥3 scenes with dialogue, none of the immediately following scenes has dialogue; pivots land without verbal registration; the dramatic-turn-trigger parallel of DIALOGUE_REVELATION_AFTERMATH_SILENT, distinct from DIALOGUE_DRAMATIC_TURN_SCENE_VOID which is co-occurrence within the turn scene), dialogue payoff aftermath silent (sequence/aftermath × payoff trigger → dialogue absence in next scene — n≥8, ≥2 payoff scenes not at last position, ≥3 scenes with dialogue, none of the immediately following scenes has dialogue; fulfilled promises play without verbal fallout; the payoff-trigger parallel completing the aftermath set alongside revelation and dramatic-turn triggers, distinct from PAYOFF_SCENE_DIALOGUE_ABSENT which is co-occurrence within the payoff scene), dialogue middle zone silent (zone presence/absence × middle third × dialogue absence — n≥9, ≥4 scenes with dialogue, opening and closing thirds each have ≥1 dialogue scene but middle third has zero; the central story zone is silent; first zone-absence check on the middle third, distinct from CLIMAX_VOID [closing 20%], OPENING_SILENT [opening 20%], and SCENE_TEMPORAL_CLUSTER [concentration not absence]).

Rules named in this wave's header:

- `DIALOGUE_DRAMATIC_TURN_SCENE_VOID`
- `DIALOGUE_REVELATION_AFTERMATH_SILENT`

## Wave 518

Wave 518 additions: seed scene dialogue absent (co-occurrence/decoupling × seed event × dialogue absence — n≥8, ≥2 seed scenes, ≥3 scenes with dialogue, all seed scenes have zero dialogue; clue-planting happens in silence; the seed-channel parallel of PAYOFF_SCENE_DIALOGUE_ABSENT, completing the event-type co-occurrence set alongside payoff/revelation/dramatic-turn/clock voids), relationship shift scene dialogue absent (co-occurrence/decoupling × relationship-shift event × dialogue absence — n≥8, ≥2 relationship-shift scenes, ≥3 scenes with dialogue, all relationship-shift scenes have zero dialogue; bond changes happen in silence; the relationship-channel co-occurrence completion alongside event-type and emotional-register co-occurrence checks), dialogue revelation aftermath silent (sequence/aftermath × revelation → dialogue absence in next scene — n≥8, ≥2 qualifying revelation scenes not at last position, ≥3 scenes with dialogue, none of the following scenes have any dialogue; distinct from DIALOGUE_REVELATION_SCENE_VOID which is co-occurrence within the revelation scene itself, and from DIALOGUE_DENSE_AFTERMATH_SILENT which uses dense-dialogue as trigger; first aftermath check conditioned on a revelation trigger in this pass).

Rules named in this wave's header:

- `DIALOGUE_DENSE_AFTERMATH_SILENT`
- `PAYOFF_SCENE_DIALOGUE_ABSENT`

## Wave 490

Wave 490 additions: dialogue verbal peak uncaused (backward-cause × dialogue density peak — n≥8, ≥5 scenes with dialogue; the scene with the highest per-scene dialogue line count at records pos≥2 has no structural driver in the 2 prior records; first backward-cause check in this pass, distinct from DIALOGUE_TENSION_PEAK_SILENT which fires on absence AT the peak not backward-cause BEFORE it), dialogue negative scene void (co-occurrence × negative emotional shift × dialogue absence — all negative-emotion scenes have no dialogue; the negative-valence complement of DIALOGUE_POSITIVE_SCENE_VOID, completing the emotional-register co-occurrence pair), dialogue scene temporal cluster (distribution/timing × dialogue-presence × thirds — n≥9, ≥4 scenes with any dialogue, >75% in one structural third; distinct from CLIMAX_VOID and OPENING_SILENT which fire on ZERO dialogue in a zone, and from HEDGE_FRONT_LOADED and QUESTION_BACK_LOADED which track specific dialogue CONTENT not scene-level presence).

Rules named in this wave's header:

- `DIALOGUE_POSITIVE_SCENE_VOID`

## Wave 462

Wave 462 additions: dramatic-turn scene void (every dramatic-turn scene contains no dialogue — the story's pivots happen in silence; co-occurrence/decoupling × dramatic turn × dialogue presence, the turn-channel parallel of DIALOGUE_REVELATION_SCENE_VOID), negation flood (>30% of lines carry a negation — "no"/"not"/"never"/"can't"/"nothing" — dialogue is dominated by refusal and denial; valence/bloat mode × negation lexeme, the opposite-valence counterpart of DIALOGUE_AFFIRMATION_FLOOD which catches bare assent), opening silent (the first 20% of scenes contains no dialogue while the rest is verbally active — the story opens as pure silent spectacle; zone presence/absence × opening zone, the opening-zone parallel of DIALOGUE_CLIMAX_VOID which audits the final 20%).

Rules named in this wave's header:

- `DIALOGUE_AFFIRMATION_FLOOD`
- `DIALOGUE_CLIMAX_VOID`
- `DIALOGUE_REVELATION_SCENE_VOID`

## Wave 448

Wave 448 additions: curiosity peak silent (the scene with the story's highest curiosityDelta contains no dialogue — the moment of maximum audience wonder passes without any character speaking; single-peak isolation × curiosity channel, the curiosity-channel parallel of DIALOGUE_TENSION_PEAK_SILENT), question back-loaded (questions concentrate in the second half of dialogue at >2× the first-half rate — characters retreat into interrogation precisely when dramatic stakes should force declaration; distribution/timing × question-mark channel, the first distribution check on question density across the story arc, distinct from QUESTION_FLOOD's global rate and DIALOGUE_HEDGE_FRONT_LOADED's hedge channel), revelation scene void (every revelation scene contains no dialogue — every disclosure happens without any character speaking in the moment of discovery; co-occurrence/decoupling × revelation × dialogue presence, distinct from DIALOGUE_TENSION_PEAK_SILENT which is single-peak and from REVELATION_RELATIONSHIP_VOID in causality.ts which checks the relationship channel).

Rules named in this wave's header:

- `DIALOGUE_HEDGE_FRONT_LOADED`
- `DIALOGUE_TENSION_PEAK_SILENT`

## Unattributed (no explicit wave-header mention)

These rule constants exist in this pass but were not found, by exact-name match, inside any "Wave N —" / "Wave N additions:" header entry in the file — typically because they predate that convention hardening, or the header describes the check descriptively rather than by constant name (e.g. "talking heads" rather than `TALKING_HEADS`). Listed here honestly rather than guessed into a wave, with the nearest preceding in-code "── section title ──" comment as the best-available substitute context where one exists.

- `APOLOGY_LOOP` — Wave 297: APOLOGY_LOOP
- `AS_YOU_KNOW_BOB` — As-you-know exposition
- `CADENCE_MONOTONY` — Wave 204: Punctuation flatline, staccato overuse, pronoun-I overload
- `CHARACTER_VOICE_UNIFORMITY` — Wave 164: Rhetorical question flood, dialogue density inversion, voice uniformity
- `CONTRACTION_STARVATION` — Wave 297: CONTRACTION_STARVATION
- `DEADLOCK_DIALOGUE` — Wave 150: Talking heads, over-parenthetical, deadlock dialogue
- `DENIAL_INVERSION` — Level 2: Implicit subtext divergence (requires memory records)
- `DIALOGUE_ABSOLUTE_OVERUSE` — Wave 325: DIALOGUE_EXPLETIVE_OPENER_OVERUSE, DIALOGUE_ABSOLUTE_OVERUSE, DIALOGUE_WITHIN_LINE_WORD_ECHO
- `DIALOGUE_AGREEMENT_CHAIN` — Wave 269: DIALOGUE_AGREEMENT_CHAIN
- `DIALOGUE_AMPLIFIER_FLOOD` — Wave 392: DIALOGUE_EMOTION_NAMING, DIALOGUE_AMPLIFIER_FLOOD, DIALOGUE_TIME_MARKER_FLOOD
- `DIALOGUE_ANAPHORA_RUN` — Wave 378: DIALOGUE_SUPERLATIVE_FLOOD, DIALOGUE_ANAPHORA_RUN, DIALOGUE_VERBAL_TIC_FLOOD
- `DIALOGUE_CLOSING_ZONE_SILENT` — Wave 504 checks
- `DIALOGUE_CONDITIONAL_OVERLOAD` — Wave 283: DIALOGUE_CONDITIONAL_OVERLOAD
- `DIALOGUE_DENSITY_FRONT_HEAVY` — Wave 504 checks
- `DIALOGUE_DENSITY_INVERSION` — Wave 164: Rhetorical question flood, dialogue density inversion, voice uniformity
- `DIALOGUE_EMOTION_NAMING` — Wave 392: DIALOGUE_EMOTION_NAMING, DIALOGUE_AMPLIFIER_FLOOD, DIALOGUE_TIME_MARKER_FLOOD
- `DIALOGUE_EXCUSE_FLOOD` — Wave 420: DIALOGUE_INTERRUPT_FLOOD, DIALOGUE_EXCUSE_FLOOD, DIALOGUE_AFFIRMATION_FLOOD
- `DIALOGUE_EXPLETIVE_OPENER_OVERUSE` — Wave 325: DIALOGUE_EXPLETIVE_OPENER_OVERUSE, DIALOGUE_ABSOLUTE_OVERUSE, DIALOGUE_WITHIN_LINE_WORD_ECHO
- `DIALOGUE_FILLER_SOUND_OVERUSE` — Wave 311: DIALOGUE_FILLER_SOUND_OVERUSE
- `DIALOGUE_FIRST_PERSON_SATURATION` — Wave 364: DIALOGUE_FIRST_PERSON_SATURATION, DIALOGUE_PASSIVE_CONSTRUCT_FLOOD, DIALOGUE_PRESENT_PERFECT_FLOOD
- `DIALOGUE_HEDGE_BACK_LOADED` — Wave 504 checks
- `DIALOGUE_HEDGE_SATURATION` — Wave 311: DIALOGUE_HEDGE_SATURATION
- `DIALOGUE_INTERRUPT_FLOOD` — Wave 420: DIALOGUE_INTERRUPT_FLOOD, DIALOGUE_EXCUSE_FLOOD, DIALOGUE_AFFIRMATION_FLOOD
- `DIALOGUE_LEXICAL_POVERTY` — Wave 204: Punctuation flatline, staccato overuse, pronoun-I overload
- `DIALOGUE_MIDSENTENCE_CAPS_FLOOD` — Wave 336: DIALOGUE_QUESTION_FLOOD, DIALOGUE_NEGATIVE_OPENER_FLOOD, DIALOGUE_MIDSENTENCE_CAPS_FLOOD
- `DIALOGUE_MIRROR_SYNDROME` — Wave 227: DIALOGUE_MIRROR_SYNDROME
- `DIALOGUE_NEGATIVE_OPENER_FLOOD` — Wave 336: DIALOGUE_QUESTION_FLOOD, DIALOGUE_NEGATIVE_OPENER_FLOOD, DIALOGUE_MIDSENTENCE_CAPS_FLOOD
- `DIALOGUE_NEGATIVE_SCENE_VOID` — Wave 490: DIALOGUE_VERBAL_PEAK_UNCAUSED, DIALOGUE_NEGATIVE_SCENE_VOID, DIALOGUE_SCENE_TEMPORAL_CLUSTER
- `DIALOGUE_OATH_INTENSIFIER_FLOOD` — Wave 406: DIALOGUE_VAGUE_NOUN_FLOOD, DIALOGUE_REPORTED_SPEECH_FLOOD, DIALOGUE_OATH_INTENSIFIER_FLOOD
- `DIALOGUE_ONE_WORD_DOMINANCE` — Wave 311: DIALOGUE_ONE_WORD_DOMINANCE
- `DIALOGUE_OPENER_MONOTONY` — Wave 283: DIALOGUE_OPENER_MONOTONY
- `DIALOGUE_PASSIVE_CONSTRUCT_FLOOD` — Wave 364: DIALOGUE_FIRST_PERSON_SATURATION, DIALOGUE_PASSIVE_CONSTRUCT_FLOOD, DIALOGUE_PRESENT_PERFECT_FLOOD
- `DIALOGUE_PRESENT_PERFECT_FLOOD` — Wave 364: DIALOGUE_FIRST_PERSON_SATURATION, DIALOGUE_PASSIVE_CONSTRUCT_FLOOD, DIALOGUE_PRESENT_PERFECT_FLOOD
- `DIALOGUE_QUESTION_CLUSTER` — Wave 269: DIALOGUE_QUESTION_CLUSTER
- `DIALOGUE_QUESTION_FLOOD` — Wave 336: DIALOGUE_QUESTION_FLOOD, DIALOGUE_NEGATIVE_OPENER_FLOOD, DIALOGUE_MIDSENTENCE_CAPS_FLOOD
- `DIALOGUE_RELATIONSHIP_PEAK_SILENT` — Wave 504 checks
- `DIALOGUE_RELATIONSHIP_SHIFT_AFTERMATH_SILENT` — Wave 504 checks
- `DIALOGUE_REPEATED_LINE` — Wave 297: DIALOGUE_REPEATED_LINE
- `DIALOGUE_REPORTED_SPEECH_FLOOD` — Wave 406: DIALOGUE_VAGUE_NOUN_FLOOD, DIALOGUE_REPORTED_SPEECH_FLOOD, DIALOGUE_OATH_INTENSIFIER_FLOOD
- `DIALOGUE_RETROSPECTIVE_FLOOD` — Wave 241: DIALOGUE_RETROSPECTIVE_FLOOD
- `DIALOGUE_SEED_AFTERMATH_SILENT` — Wave 504 checks
- `DIALOGUE_SELF_CORRECTION_ABSENT` — Wave 241: DIALOGUE_SELF_CORRECTION_ABSENT
- `DIALOGUE_SELF_REFERENCE` — Wave 350: DIALOGUE_YOU_OPENER_FLOOD, DIALOGUE_THANKS_OVERUSE, DIALOGUE_SELF_REFERENCE
- `DIALOGUE_SPARSE_RUN` — Wave 504 checks
- `DIALOGUE_STACCATO_OVERUSE` — Wave 204: Punctuation flatline, staccato overuse, pronoun-I overload
- `DIALOGUE_SUPERLATIVE_FLOOD` — Wave 378: DIALOGUE_SUPERLATIVE_FLOOD, DIALOGUE_ANAPHORA_RUN, DIALOGUE_VERBAL_TIC_FLOOD
- `DIALOGUE_THANKS_OVERUSE` — Wave 350: DIALOGUE_YOU_OPENER_FLOOD, DIALOGUE_THANKS_OVERUSE, DIALOGUE_SELF_REFERENCE
- `DIALOGUE_TIME_MARKER_FLOOD` — Wave 392: DIALOGUE_EMOTION_NAMING, DIALOGUE_AMPLIFIER_FLOOD, DIALOGUE_TIME_MARKER_FLOOD
- `DIALOGUE_VAGUE_NOUN_FLOOD` — Wave 406: DIALOGUE_VAGUE_NOUN_FLOOD, DIALOGUE_REPORTED_SPEECH_FLOOD, DIALOGUE_OATH_INTENSIFIER_FLOOD
- `DIALOGUE_VERBAL_TIC_FLOOD` — Wave 378: DIALOGUE_SUPERLATIVE_FLOOD, DIALOGUE_ANAPHORA_RUN, DIALOGUE_VERBAL_TIC_FLOOD
- `DIALOGUE_WITHIN_LINE_WORD_ECHO` — Wave 325: DIALOGUE_EXPLETIVE_OPENER_OVERUSE, DIALOGUE_ABSOLUTE_OVERUSE, DIALOGUE_WITHIN_LINE_WORD_ECHO
- `DIALOGUE_YOU_OPENER_FLOOD` — Wave 350: DIALOGUE_YOU_OPENER_FLOOD, DIALOGUE_THANKS_OVERUSE, DIALOGUE_SELF_REFERENCE
- `ELLIPSIS_OVERUSE` — Wave 255: ELLIPSIS_OVERUSE
- `EMOTIONAL_SUPPRESSION` — Level 2: Implicit subtext divergence (requires memory records)
- `EXCLAMATION_OVERUSE` — Wave 255: EXCLAMATION_OVERUSE
- `FILLER_OPENER_OVERUSE` — Wave 178: Greeting ritual, vocative overuse, filler openers
- `FUTURE_TENSE_FLOOD` — Wave 283: FUTURE_TENSE_FLOOD
- `GREETING_RITUAL_OVERUSE` — Wave 178: Greeting ritual, vocative overuse, filler openers
- `IMPERATIVE_DOMINANCE` — Wave 227: IMPERATIVE_DOMINANCE
- `INTERRUPTION_VOID` — Wave 185: Question dominance, interruption void, speaker monopoly
- `LAST_ACT_EXPOSITION_SPIKE` — Wave 227: LAST_ACT_EXPOSITION_SPIKE
- `LONG_SPEECH_DOMINANCE` — Wave 269: LONG_SPEECH_DOMINANCE
- `NO_DIALOGUE` — No dialogue at all
- `NON_RESPONSIVE_EXCHANGE` — Wave 204: Punctuation flatline, staccato overuse, pronoun-I overload
- `ON_THE_NOSE` — On-the-nose emotion statements
- `OVER_PARENTHETICAL` — Wave 150: Talking heads, over-parenthetical, deadlock dialogue
- `POWER_SILENCE` — Level 2: Implicit subtext divergence (requires memory records)
- `PRONOUN_I_OVERLOAD` — Wave 204: Punctuation flatline, staccato overuse, pronoun-I overload
- `PUNCTUATION_FLATLINE` — Wave 204: Punctuation flatline, staccato overuse, pronoun-I overload
- `QUESTION_DODGE` — Level 2: Implicit subtext divergence (requires memory records)
- `QUESTION_DOMINANCE` — Wave 185: Question dominance, interruption void, speaker monopoly
- `RHETORICAL_QUESTION_FLOOD` — Wave 164: Rhetorical question flood, dialogue density inversion, voice uniformity
- `SPEAKER_MONOPOLY` — Wave 185: Question dominance, interruption void, speaker monopoly
- `SPEAKER_PAIR_MONOPOLY` — Wave 241: SPEAKER_PAIR_MONOPOLY
- `SYCOPHANTIC_AGREEMENT` — Consecutive agreements (sycophantic echo)
- `TAG_QUESTION_OVERUSE` — Wave 255: TAG_QUESTION_OVERUSE
- `TALKING_HEADS` — Wave 150: Talking heads, over-parenthetical, deadlock dialogue
- `TRAIT_LABELING` — Trait labeling (show don't tell)
- `UNINTERRUPTED_MONOLOGUE` — Long monologue (>6 lines without interruption)
- `VOCATIVE_NAME_OVERUSE` — Wave 178: Greeting ritual, vocative overuse, filler openers

