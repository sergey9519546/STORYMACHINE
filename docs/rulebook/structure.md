# Pass: `structure`

Founding wave: 139. Total distinct rules: 237 (164 attributed to a specific wave, 73 unattributed — see docs/rulebook/README.md's methodology note).

## Wave 1191

Wave 1191 additions — Sin Check detector pack (blueprint's named classic-story-sin list; see WAVE_QUALITY_GUARANTEE.md and the ROADMAP blueprint docs): IDIOT_PLOT (a revelation or resolved question is known by a specific character in an early scene, that character shares 2+ later scenes with another character while the same clue/conflict stays open, and nothing on the page — no secret/deception vocabulary — explains the silence; distinct from every existing revelation check in this file, none of which track co-presence between a specific knowing character and an affected character across multiple later scenes), and UNSEEDED_TWIST (hardens the turn-without-cause coverage already in this file (DRAMATIC_TURN_CAUSELESS) and in payoff.ts's dramatic-turn co-occurrence/aftermath family — read read-only first — with an actual TEXT-CONTENT check those never perform: DRAMATIC_TURN_CAUSELESS asks whether a NUMERIC signal preceded a turn; this asks whether the turn's own key noun phrase was ever mentioned in ANY earlier scene at all, independent of numeric signals. Single-peak isolation x content-overlap mode x final-third position — a genuinely new (channel, mode) cell). Both share the file-local composite-text + cue-based speaker infrastructure duplicated from causality.ts's Wave 1191 block (per the project's per-pass-file duplication convention — see tests/passes/ helpers.ts header and theme.ts's buildSceneText, Wave 130).

Rules named in this wave's header:

- `IDIOT_PLOT`
- `UNSEEDED_TWIST`

## Wave 1184

Wave 1184 additions (Program v2, Type 3 — genre-conditioned): DARK_NIGHT_ABSENT is one of the highest-firing generic rules in the calibration corpus (20/20 samples — see the wave's measurement pass). Its suspenseDelta floor for what counts as the "all is lost" beat now consults GENRE_RULE_MODIFIERS (server/lib/genre-router.ts), generic value as the default: comedy's low point is measured in dignity/embarrassment rather than survival dread, so a milder dip still legitimately counts (floor loosens); horror's low point must carry genuine dread, so a passing dip should not count (floor tightens). storyContext absent, genre absent, or genre unset in the table -> identical constant and identical issue text to pre-Wave-1184 behavior.

Rules named in this wave's header:

- `DARK_NIGHT_ABSENT`

## Wave 1171

Wave 1171 additions: after Wave 1157, suspenseDelta stood at three of six channels (curiosityDelta, emotionalShift, relationshipShifts) and seededClueIds at one (curiosityDelta). STRUCTURE_SUSPENSE_STAGING_AFTERMATH_VOID and STRUCTURE_SUSPENSE_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID give suspenseDelta its fourth and fifth channels (visualBeats, dialogueHighlights); STRUCTURE_SEED_EMOTIONAL_AFTERMATH_VOID gives seededClueIds its second channel (emotionalShift).

Rules named in this wave's header:

- `STRUCTURE_SEED_EMOTIONAL_AFTERMATH_VOID`
- `STRUCTURE_SUSPENSE_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID`
- `STRUCTURE_SUSPENSE_STAGING_AFTERMATH_VOID`

## Wave 1157

Wave 1157 additions: suspenseDelta had only its one Wave-1143 channel. STRUCTURE_SUSPENSE_EMOTIONAL_AFTERMATH_VOID and STRUCTURE_SUSPENSE_RELATIONAL_AFTERMATH_VOID give it its second and third channels (emotionalShift, relationshipShifts). This wave also introduces seededClueIds as a genuinely fresh checkAftermathVoid trigger — it has never anchored the isTrigger side of any check in this file: STRUCTURE_SEED_CURIOSITY_AFTERMATH_VOID pairs it with curiosityDelta.

Rules named in this wave's header:

- `STRUCTURE_SEED_CURIOSITY_AFTERMATH_VOID`
- `STRUCTURE_SUSPENSE_EMOTIONAL_AFTERMATH_VOID`
- `STRUCTURE_SUSPENSE_RELATIONAL_AFTERMATH_VOID`

## Wave 1143

Wave 1143 additions: clockRaised and dramaticTurn were each at five of six channels (dramaticTurn's five spanning both legacy TURN_AFTERMATH_*_VOID and modern STRUCTURE_TURN_* rule names for the same suspenseDelta/curiosityDelta/emotionalShift channels, plus relationshipShifts and dialogueHighlights). STRUCTURE_CLOCK_STAGING_AFTERMATH_VOID and STRUCTURE_TURN_STAGING_AFTERMATH_VOID give each its sixth and final channel (visualBeats), completing full saturation for both triggers. With every tracked trigger in this pass now exhausted, STRUCTURE_SUSPENSE_CURIOSITY_AFTERMATH_VOID introduces suspenseDelta as a genuinely fresh checkAftermathVoid trigger — it has only ever appeared as an aftermath channel or isPresent condition in this file, never as the isTrigger side of a check.

Rules named in this wave's header:

- `STRUCTURE_CLOCK_STAGING_AFTERMATH_VOID`
- `STRUCTURE_SUSPENSE_CURIOSITY_AFTERMATH_VOID`
- `STRUCTURE_TURN_STAGING_AFTERMATH_VOID`

## Wave 1129

Wave 1129 additions: clockRaised also carries a pre-existing hand-rolled sequence/aftermath channel — CLOCK_AFTERMATH_EMOTION_VOID (Wave 583, emotionalShift) — putting it at two channels rather than one as of Wave 1115. STRUCTURE_CLOCK_SUSPENSE_AFTERMATH_VOID, STRUCTURE_CLOCK_RELATIONAL_AFTERMATH_VOID, and STRUCTURE_CLOCK_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID give it its third, fourth, and fifth channels (suspenseDelta, relationshipShifts, dialogueHighlights).

Rules named in this wave's header:

- `CLOCK_AFTERMATH_EMOTION_VOID`
- `STRUCTURE_CLOCK_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID`
- `STRUCTURE_CLOCK_RELATIONAL_AFTERMATH_VOID`
- `STRUCTURE_CLOCK_SUSPENSE_AFTERMATH_VOID`

## Wave 1115

Wave 1115 additions: STRUCTURE_REVELATION_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID and STRUCTURE_REVELATION_STAGING_AFTERMATH_VOID give revelation its fifth and sixth channels (previously paired with curiosityDelta/emotionalShift/suspenseDelta/relationshipShifts, now also paired with dialogueHighlights and visualBeats respectively), completing full six-channel saturation for all five of this pass's tracked triggers. With those exhausted, this wave introduces clockRaised as a genuinely fresh checkAftermathVoid trigger — it has only ever anchored distribution/timing (zone-imbalance/zone-cluster) checks here, never sequence/aftermath: STRUCTURE_CLOCK_CURIOSITY_AFTERMATH_VOID pairs it with curiosityDelta.

Rules named in this wave's header:

- `STRUCTURE_CLOCK_CURIOSITY_AFTERMATH_VOID`
- `STRUCTURE_REVELATION_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID`
- `STRUCTURE_REVELATION_STAGING_AFTERMATH_VOID`

## Wave 1101

Wave 1101 additions: with all four main boolean triggers already fully saturated, this wave continues building out revelation's checkAftermathVoid channel set (currently just curiosityDelta, established Wave 1087) — STRUCTURE_REVELATION_EMOTIONAL_AFTERMATH_VOID (emotionalShift), STRUCTURE_REVELATION_SUSPENSE_AFTERMATH_VOID (suspenseDelta), and STRUCTURE_REVELATION_RELATIONAL_AFTERMATH_VOID (relationshipShifts) give this trigger three fresh channels.

Rules named in this wave's header:

- `STRUCTURE_REVELATION_EMOTIONAL_AFTERMATH_VOID`
- `STRUCTURE_REVELATION_RELATIONAL_AFTERMATH_VOID`
- `STRUCTURE_REVELATION_SUSPENSE_AFTERMATH_VOID`

## Wave 1087

Wave 1087 additions: raise_stakes reaches full six-channel saturation — STRUCTURE_STAKES_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID and STRUCTURE_STAKES_STAGING_AFTERMATH_VOID (previously paired with curiosityDelta/suspenseDelta/relationshipShifts/emotionalShift, now also paired with dialogueHighlights and visualBeats respectively — its last two remaining standard channels). With all four boolean triggers now fully saturated, the third check introduces revelation as a genuinely fresh sequence/aftermath trigger — STRUCTURE_REVELATION_CURIOSITY_AFTERMATH_VOID — distinct from this pass's existing revelation-curiosity co-occurrence/ decoupling check (Wave 443), which audits same-scene co-occurrence rather than a windowed aftermath.

Rules named in this wave's header:

- `STRUCTURE_REVELATION_CURIOSITY_AFTERMATH_VOID`
- `STRUCTURE_STAKES_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID`
- `STRUCTURE_STAKES_STAGING_AFTERMATH_VOID`

## Wave 1073

Wave 1073 additions: payoffSetupIds, dramaticTurn, and heavy unresolvedClues debt each reach full six-channel saturation: STRUCTURE_PAYOFF_STAGING_AFTERMATH_VOID (payoffSetupIds, previously paired with dialogueHighlights/relationshipShifts/emotionalShift/curiosityDelta/ suspenseDelta, now also paired with visualBeats — its only remaining standard channel), STRUCTURE_TURN_SUSPENSE_AFTERMATH_VOID (dramaticTurn, previously paired with visualBeats/ curiosityDelta/relationshipShifts/emotionalShift/dialogueHighlights, now also paired with suspenseDelta — its only remaining standard channel), and STRUCTURE_OPEN_THREAD_SUSPENSE_AFTERMATH_VOID (heavy unresolvedClues debt, previously paired with dialogueHighlights/ emotionalShift/curiosityDelta/relationshipShifts/visualBeats, now also paired with suspenseDelta — its only remaining standard channel).

Rules named in this wave's header:

- `STRUCTURE_OPEN_THREAD_SUSPENSE_AFTERMATH_VOID`
- `STRUCTURE_PAYOFF_STAGING_AFTERMATH_VOID`
- `STRUCTURE_TURN_SUSPENSE_AFTERMATH_VOID`

## Wave 1059

Wave 1059 additions: with all four main triggers now at four channels each, this wave gives three of them a fifth: STRUCTURE_PAYOFF_SUSPENSE_AFTERMATH_VOID (payoffSetupIds, previously paired with dialogueHighlights/relationshipShifts/emotionalShift/curiosityDelta, now also paired with suspenseDelta), STRUCTURE_TURN_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID (dramaticTurn, previously paired with visualBeats/curiosityDelta/relationshipShifts/emotionalShift, now also paired with dialogueHighlights), and STRUCTURE_OPEN_THREAD_STAGING_AFTERMATH_VOID (heavy unresolvedClues debt, previously paired with dialogueHighlights/emotionalShift/curiosityDelta/ relationshipShifts, now also paired with visualBeats).

Rules named in this wave's header:

- `STRUCTURE_OPEN_THREAD_STAGING_AFTERMATH_VOID`
- `STRUCTURE_PAYOFF_SUSPENSE_AFTERMATH_VOID`
- `STRUCTURE_TURN_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID`

## Wave 1045

Wave 1045 additions: with raise_stakes and payoffSetupIds now at four channels each, this wave targets dramaticTurn and unresolvedClues instead: STRUCTURE_TURN_EMOTIONAL_AFTERMATH_VOID (dramaticTurn, previously paired with visualBeats/curiosityDelta/relationshipShifts, now a fourth channel with emotionalShift), STRUCTURE_OPEN_THREAD_CURIOSITY_AFTERMATH_VOID (heavy unresolvedClues debt, previously paired with dialogueHighlights/emotionalShift, now a third channel with curiosityDelta), and STRUCTURE_OPEN_THREAD_RELATIONAL_AFTERMATH_VOID (heavy unresolvedClues debt, now a fourth channel with relationshipShifts).

Rules named in this wave's header:

- `STRUCTURE_OPEN_THREAD_CURIOSITY_AFTERMATH_VOID`
- `STRUCTURE_OPEN_THREAD_RELATIONAL_AFTERMATH_VOID`
- `STRUCTURE_TURN_EMOTIONAL_AFTERMATH_VOID`

## Wave 1031

Wave 1031 additions: three more fresh channels for existing triggers: STRUCTURE_STAKES_EMOTIONAL_AFTERMATH_VOID (raise_stakes, previously paired with curiosityDelta/suspenseDelta/ relationshipShifts, now a fourth channel with emotionalShift), STRUCTURE_TURN_RELATIONAL_AFTERMATH_VOID (dramaticTurn, previously paired with visualBeats/curiosityDelta, now a third channel with relationshipShifts), and STRUCTURE_PAYOFF_CURIOSITY_AFTERMATH_VOID (payoffSetupIds, previously paired with dialogueHighlights/relationshipShifts/emotionalShift, now a fourth channel with curiosityDelta).

Rules named in this wave's header:

- `STRUCTURE_PAYOFF_CURIOSITY_AFTERMATH_VOID`
- `STRUCTURE_STAKES_EMOTIONAL_AFTERMATH_VOID`
- `STRUCTURE_TURN_RELATIONAL_AFTERMATH_VOID`

## Wave 1017

Wave 1017 additions: this wave gives three more triggers a fresh consequence channel: STRUCTURE_TURN_CURIOSITY_AFTERMATH_VOID (dramaticTurn, previously only paired with visualBeats, now paired with curiosityDelta), STRUCTURE_PAYOFF_EMOTIONAL_AFTERMATH_VOID (payoffSetupIds, previously paired with dialogueHighlights and relationshipShifts, now paired with emotionalShift for a third channel), and STRUCTURE_STAKES_RELATIONAL_AFTERMATH_VOID (raise_stakes, previously paired with curiosityDelta and suspenseDelta, now paired with relationshipShifts for a third channel).

Rules named in this wave's header:

- `STRUCTURE_PAYOFF_EMOTIONAL_AFTERMATH_VOID`
- `STRUCTURE_STAKES_RELATIONAL_AFTERMATH_VOID`
- `STRUCTURE_TURN_CURIOSITY_AFTERMATH_VOID`

## Wave 1003

Wave 1003 additions: STRUCTURE_STAGING re-checked and re-excluded (same predicate mismatch). With zone-imbalance still exhausted, this wave gives three existing aftermath-void triggers a fresh consequence channel: STRUCTURE_STAKES_SUSPENSE_AFTERMATH_VOID (raise_stakes, previously only paired with curiosityDelta, now paired with suspenseDelta), STRUCTURE_PAYOFF_RELATIONAL_AFTERMATH_VOID (payoffSetupIds, previously only paired with dialogueHighlights, now paired with relationshipShifts), and STRUCTURE_OPEN_THREAD_EMOTIONAL_AFTERMATH_VOID (heavy unresolvedClues debt, previously only paired with dialogueHighlights, now paired with emotionalShift).

Rules named in this wave's header:

- `STRUCTURE_OPEN_THREAD_EMOTIONAL_AFTERMATH_VOID`
- `STRUCTURE_PAYOFF_RELATIONAL_AFTERMATH_VOID`
- `STRUCTURE_STAKES_SUSPENSE_AFTERMATH_VOID`

## Wave 989

Wave 989 additions: STRUCTURE_SEED_ZONE_IMBALANCE (seededClueIds array) and STRUCTURE_TURN_ZONE_IMBALANCE (dramaticTurn !== 'nothing') — the last two clean trio-complete zone-imbalance candidates in this pass (STRUCTURE_STAGING was skipped: its cluster/drought predicates disagree, >=2 vs >0 visualBeats). With zone-imbalance now down to just these two, this wave completes the trio with one aftermath-void pairing: STRUCTURE_STAKES_CURIOSITY_AFTERMATH_VOID (raise_stakes → curiosityDelta), the first use of raise_stakes as an aftermath-void trigger in this pass.

Rules named in this wave's header:

- `STRUCTURE_SEED_ZONE_IMBALANCE`
- `STRUCTURE_STAKES_CURIOSITY_AFTERMATH_VOID`
- `STRUCTURE_TURN_ZONE_IMBALANCE`

## Wave 975

Wave 975 additions: auditing three more trio-complete signals in this pass, spanning three distinct classes: STRUCTURE_CLOCK_ZONE_IMBALANCE (clockRaised boolean — whether a ticking clock is introduced), STRUCTURE_CLOCK_DELTA_ZONE_IMBALANCE (clockDelta !== 0 — the numeric delta, distinct from the boolean field above), and STRUCTURE_RELATIONSHIP_ZONE_IMBALANCE (relationshipShifts array, distinct from all previously audited arrays in this pass).

Rules named in this wave's header:

- `STRUCTURE_CLOCK_DELTA_ZONE_IMBALANCE`
- `STRUCTURE_CLOCK_ZONE_IMBALANCE`
- `STRUCTURE_RELATIONSHIP_ZONE_IMBALANCE`

## Wave 961

Wave 961 additions: continuing the non-purpose 4-zone rollout with three more trio-complete signals spanning three distinct classes: STRUCTURE_CURIOSITY_ZONE_IMBALANCE (curiosityDelta > 0 — the question-raising delta beside Wave 947's suspense one), STRUCTURE_PAYOFF_ZONE_IMBALANCE (payoffSetupIds.length > 0 — the payoff array beside 947's open-thread one), and STRUCTURE_REVELATION_ZONE_IMBALANCE (revelation != null — the revelation string field, a new class).

Rules named in this wave's header:

- `STRUCTURE_CURIOSITY_ZONE_IMBALANCE`
- `STRUCTURE_PAYOFF_ZONE_IMBALANCE`
- `STRUCTURE_REVELATION_ZONE_IMBALANCE`

## Wave 947

Wave 947 additions: extending the checkZoneImbalance rollout to three more trio-complete signals spanning three distinct signal classes: STRUCTURE_POSITIVE_EMOTION_ZONE_IMBALANCE (emotionalShift === 'positive', the positive-valence mirror of Wave 933's negative one), STRUCTURE_SUSPENSE_ZONE_IMBALANCE (suspenseDelta > 0 — tension-delta magnitude), and STRUCTURE_OPEN_THREAD_ZONE_IMBALANCE (unresolvedClues.length > 0 — open-thread array field).

Rules named in this wave's header:

- `STRUCTURE_OPEN_THREAD_ZONE_IMBALANCE`
- `STRUCTURE_POSITIVE_EMOTION_ZONE_IMBALANCE`
- `STRUCTURE_SUSPENSE_ZONE_IMBALANCE`

## Wave 933

Wave 933 additions: continuing the checkZoneImbalance rollout, this wave applies the 4-zone bloat+empty-zone mode to three more signals that each already have a complete 3-zone/run-based trio but had never been audited by it: STRUCTURE_STAKES_ZONE_IMBALANCE (purpose === 'raise_stakes'), STRUCTURE_REVELATION_PURPOSE_ZONE_IMBALANCE (purpose === 'revelation', whose trio was completed in Wave 919), and STRUCTURE_NEGATIVE_EMOTION_ZONE_IMBALANCE (emotionalShift === 'negative', a valence signal with a complete 3-zone/run trio).

Rules named in this wave's header:

- `STRUCTURE_NEGATIVE_EMOTION_ZONE_IMBALANCE`
- `STRUCTURE_REVELATION_PURPOSE_ZONE_IMBALANCE`
- `STRUCTURE_STAKES_ZONE_IMBALANCE`

## Wave 919

Wave 919 additions: purpose === 'revelation' has never been referenced anywhere in this pass (the pre-existing STRUCTURE_REVELATION_ZONE_CLUSTER/DROUGHT_RUN audit the separate revelation string|null field, not this purpose enum value) -- a genuinely virgin field. This wave adds STRUCTURE_REVELATION_PURPOSE_ZONE_CLUSTER and STRUCTURE_REVELATION_PURPOSE_DROUGHT_RUN (peak mode conventionally skipped for this categorical field), plus STRUCTURE_CHARACTER_MOMENT_ZONE_IMBALANCE, continuing the checkZoneImbalance rollout: purpose === 'character_moment' already has a complete 3-zone/run-based trio but has never been audited by the 4-zone bloat+empty-zone mode.

Rules named in this wave's header:

- `STRUCTURE_CHARACTER_MOMENT_ZONE_IMBALANCE`
- `STRUCTURE_REVELATION_PURPOSE_DROUGHT_RUN`
- `STRUCTURE_REVELATION_PURPOSE_ZONE_CLUSTER`

## Wave 905

Wave 905 additions: continuing the checkZoneImbalance rollout begun in Wave 891, this wave applies the 4-zone bloat+empty-zone mode to three more purpose values that each already have a complete 3-zone/run-based trio (checkZoneCluster + checkDroughtRun) but have never been audited by it: STRUCTURE_TURNING_POINT_ZONE_IMBALANCE (purpose === 'turning_point'), STRUCTURE_COMPLICATE_ZONE_IMBALANCE (purpose === 'complicate'), and STRUCTURE_INTRODUCE_CONFLICT_ZONE_IMBALANCE (purpose === 'introduce_conflict').

Rules named in this wave's header:

- `STRUCTURE_COMPLICATE_ZONE_IMBALANCE`
- `STRUCTURE_INTRODUCE_CONFLICT_ZONE_IMBALANCE`
- `STRUCTURE_TURNING_POINT_ZONE_IMBALANCE`

## Wave 891

Wave 891 additions: no purpose value had ever been audited by the distinct 4-zone checkZoneImbalance mode in this pass (only dialogueHighlights and visualBeats had). This wave applies it to three purpose values with complete 3-zone/run-based trios: STRUCTURE_CLIMAX_ZONE_IMBALANCE (purpose === 'climax'), STRUCTURE_ESTABLISH_WORLD_ZONE_IMBALANCE (purpose === 'establish_world'), and STRUCTURE_RESOLUTION_ZONE_IMBALANCE (purpose === 'resolution').

Rules named in this wave's header:

- `STRUCTURE_CLIMAX_ZONE_IMBALANCE`
- `STRUCTURE_ESTABLISH_WORLD_ZONE_IMBALANCE`
- `STRUCTURE_RESOLUTION_ZONE_IMBALANCE`

## Wave 877

Wave 877 additions: STRUCTURE_RESOLUTION_DROUGHT_RUN (run-based x purpose === 'resolution' absence -- completes 2 of 3 slots for this purpose value alongside the zone-cluster mode added in Wave 863; peak mode conventionally skipped for this categorical field), STRUCTURE_COMPLICATE_ZONE_CLUSTER (distribution/timing x purpose === 'complicate' x structural thirds -- this purpose value has never been referenced anywhere in this pass; a virgin field), STRUCTURE_COMPLICATE_DROUGHT_RUN (run-based x purpose === 'complicate' absence -- completes 2 of 3 slots for this purpose value alongside the zone-cluster mode added in this same wave; peak mode conventionally skipped for this categorical field).

Rules named in this wave's header:

- `STRUCTURE_COMPLICATE_DROUGHT_RUN`
- `STRUCTURE_COMPLICATE_ZONE_CLUSTER`
- `STRUCTURE_RESOLUTION_DROUGHT_RUN`

## Wave 863

Wave 863 additions: STRUCTURE_CLIMAX_DROUGHT_RUN (run-based x purpose === 'climax' absence -- completes 2 of 3 slots for this purpose value alongside the zone-cluster mode added in Wave 849; peak mode conventionally skipped for this categorical field), STRUCTURE_ESTABLISH_WORLD_DROUGHT_RUN (run-based x purpose === 'establish_world' absence -- completes 2 of 3 slots for this purpose value alongside the zone-cluster mode added in Wave 849; peak mode conventionally skipped for this categorical field), STRUCTURE_RESOLUTION_ZONE_CLUSTER (distribution/timing x purpose === 'resolution' x structural thirds -- this purpose value has only ever appeared inside the payoffPurposes composite set [union with 'climax', 'turning_point'] and two incidental last-record disjunctions (`purpose !== 'resolution'`); it has never been audited as its own standalone signal by any of the three shared-library trio modes).

Rules named in this wave's header:

- `STRUCTURE_CLIMAX_DROUGHT_RUN`
- `STRUCTURE_ESTABLISH_WORLD_DROUGHT_RUN`
- `STRUCTURE_RESOLUTION_ZONE_CLUSTER`

## Wave 849

Wave 849 additions: STRUCTURE_POSITIVE_EMOTION_DROUGHT_RUN (run-based × emotionalShift === 'positive' absence — completes 2 of 3 slots for this valence alongside the zone-cluster mode added in Wave 835; peak mode conventionally skipped for this categorical field), STRUCTURE_ESTABLISH_WORLD_ZONE_CLUSTER (distribution/timing × purpose === 'establish_world' × structural thirds — this purpose value has only ever appeared inside the setupPurposes composite set [union with 'character_moment']; it has never been audited as its own standalone signal by any of the three shared-library trio modes), STRUCTURE_CLIMAX_ZONE_CLUSTER (distribution/timing × purpose === 'climax' × structural thirds — this purpose value has only ever appeared inside the payoffPurposes composite set [union with 'resolution', 'turning_point'] or the presence-only PURPOSE_CLIMAX_ABSENT check; a virgin standalone signal).

Rules named in this wave's header:

- `PURPOSE_CLIMAX_ABSENT`
- `STRUCTURE_CLIMAX_ZONE_CLUSTER`
- `STRUCTURE_ESTABLISH_WORLD_ZONE_CLUSTER`
- `STRUCTURE_POSITIVE_EMOTION_DROUGHT_RUN`

## Wave 835

Wave 835 additions: STRUCTURE_INTRODUCE_CONFLICT_ZONE_CLUSTER (distribution/timing × purpose === 'introduce_conflict' × structural thirds — this purpose value has never been referenced anywhere in this pass, not even inside the setupPurposes/payoffPurposes composite sets; a virgin field), STRUCTURE_INTRODUCE_CONFLICT_DROUGHT_RUN (run-based × purpose === 'introduce_conflict' absence — completing 2 of 3 slots for this purpose value alongside the zone-cluster mode added in this same wave; peak mode conventionally skipped for this categorical field), STRUCTURE_POSITIVE_EMOTION_ZONE_CLUSTER (distribution/timing × emotionalShift === 'positive' × structural thirds — mirrors the completed negative-valence trio; the positive valence has never been isolated by any of the three shared-library trio modes in this pass).

Rules named in this wave's header:

- `STRUCTURE_INTRODUCE_CONFLICT_DROUGHT_RUN`
- `STRUCTURE_INTRODUCE_CONFLICT_ZONE_CLUSTER`
- `STRUCTURE_POSITIVE_EMOTION_ZONE_CLUSTER`

## Wave 821

Wave 821 additions: STRUCTURE_CHARACTER_MOMENT_DROUGHT_RUN (run-based × purpose === 'character_moment' absence — completing 2 of 3 slots for this purpose value alongside the zone-cluster mode added in Wave 807; peak mode conventionally skipped for this categorical field), STRUCTURE_TURNING_POINT_ZONE_CLUSTER (distribution/timing × purpose === 'turning_point' × structural thirds — this purpose value has only ever appeared inside the payoffPurposes composite set [union with 'climax', 'resolution']; it has never been audited as its own standalone signal by any of the three shared-library trio modes), STRUCTURE_TURNING_POINT_DROUGHT_RUN (run-based × purpose === 'turning_point' absence — completing 2 of 3 slots for this purpose value alongside the zone-cluster mode added in this same wave; peak mode conventionally skipped for this categorical field).

Rules named in this wave's header:

- `STRUCTURE_CHARACTER_MOMENT_DROUGHT_RUN`
- `STRUCTURE_TURNING_POINT_DROUGHT_RUN`
- `STRUCTURE_TURNING_POINT_ZONE_CLUSTER`

## Wave 807

Wave 807 additions: STRUCTURE_NEGATIVE_EMOTION_DROUGHT_RUN (run-based × emotionalShift === 'negative' absence — Wave 793 applied the zone-cluster mode to this valence; the drought-run mode has never been applied to it, completing 2 of 3 slots for this categorical field, peak conventionally skipped), STRUCTURE_REVELATION_PEAK_UNCAUSED (backward-cause × revelation-as-magnitude [0/1] × 2-scene lookback, anchored on the FIRST revelation scene — completes the trio for revelation; distinct from the existing REVELATION_CAUSELESS, which requires ALL revelations in the story to be causeless with a broader 3-signal/3-scene lookback, not a single-peak backward-cause test with a 2-scene lookback), STRUCTURE_CHARACTER_MOMENT_ZONE_CLUSTER (distribution/timing × purpose === 'character_moment' × structural thirds — this purpose value has only ever appeared inside the SETUP_RESOLUTION_IMBALANCE composite set [union with 'establish_world']; it has never been audited as its own standalone signal by any of the three shared-library trio modes).

Rules named in this wave's header:

- `REVELATION_CAUSELESS`
- `SETUP_RESOLUTION_IMBALANCE`
- `STRUCTURE_CHARACTER_MOMENT_ZONE_CLUSTER`
- `STRUCTURE_NEGATIVE_EMOTION_DROUGHT_RUN`
- `STRUCTURE_REVELATION_PEAK_UNCAUSED`

## Wave 793

Wave 793 additions: STRUCTURE_NEGATIVE_EMOTION_ZONE_CLUSTER (distribution/timing × emotionalShift='negative' × structural thirds — existing negative-emotion checks are valence-ratio [NEGATIVE_SCENE_DROUGHT], presence-run [NEGATIVE_SCENE_RUN], and fixed-zone [ACT2A/ACT2B/ACT3_EMOTIONAL_FLATLINE, which test 'neutral' not 'negative']; the general thirds-based >75%-cluster mode has never been applied to emotionalShift as a categorical signal), STRUCTURE_REVELATION_ZONE_CLUSTER (distribution/timing × revelation × structural thirds — the existing REVELATION_CLUSTERED fires on a fixed 4-scene span anywhere in the story, not a >75% concentration within one of the three structural thirds; the shared-library thirds-based cluster mode has never been applied to revelation), STRUCTURE_REVELATION_DROUGHT_RUN (run-based × revelation absence — the existing REVELATION_DROUGHT fires on a composite absence of revelation OR seededClueIds OR relationshipShifts together at a 4-scene threshold; a pure single-field run-based absence check on revelation alone, at the shared-library's 6-scene threshold, has never been applied).

Rules named in this wave's header:

- `ACT3_EMOTIONAL_FLATLINE`
- `REVELATION_CLUSTERED`
- `REVELATION_DROUGHT`
- `STRUCTURE_NEGATIVE_EMOTION_ZONE_CLUSTER`
- `STRUCTURE_REVELATION_DROUGHT_RUN`
- `STRUCTURE_REVELATION_ZONE_CLUSTER`

## Wave 779

Wave 779 additions: STRUCTURE_TURN_ZONE_CLUSTER (distribution/timing × dramaticTurn !== 'nothing' presence × structural thirds — dramaticTurn is this pass's second most heavily used field and has only ever had the run-based drought mode applied to it as a primary signal; the zone-cluster mode has never been applied to it, completing the trio), STRUCTURE_SUSPENSE_DROUGHT_RUN (run-based × suspenseDelta>0 absence — Wave 765 applied the zone-cluster mode and the hand-rolled CLIMAX_UNPREPARED already covers the backward-cause peak mode restricted to the climax zone; the general run-based drought mode has never been applied to it, completing the trio), STRUCTURE_CURIOSITY_DROUGHT_RUN (run-based × curiosityDelta>0 absence — Wave 765 applied the zone-cluster and backward-cause peak modes to curiosityDelta; the run-based drought mode has never been applied to it, completing the trio).

Rules named in this wave's header:

- `STRUCTURE_CURIOSITY_DROUGHT_RUN`
- `STRUCTURE_SUSPENSE_DROUGHT_RUN`
- `STRUCTURE_TURN_ZONE_CLUSTER`

## Wave 765

Wave 765 additions: STRUCTURE_SUSPENSE_ZONE_CLUSTER (distribution/timing × suspenseDelta>0 presence × structural thirds — existing suspense checks in this pass are average/aggregate [OPENING_SUSPENSE_FLATLINE], zone-imbalance [ACT2A/ACT2B_SUSPENSE_VOID], presence-run [SUSPENSE_RUN], co-occurrence-at-the-peak [PEAK_SUSPENSE_EMOTIONAL_VACUUM, PEAK_SUSPENSE_CURIOSITY_VOID], and a hand-rolled backward-cause check restricted to the climax zone [CLIMAX_UNPREPARED]; the shared-library thirds-based >75%-cluster mode has never been applied to suspenseDelta across the whole story), STRUCTURE_CURIOSITY_ZONE_CLUSTER (distribution/timing × curiosityDelta>0 presence × structural thirds — existing curiosity checks are average/aggregate, zone-scoped absence [ACT1/ACT2A/ACT2B_CURIOSITY_*], and presence-run [CURIOSITY_RUN]; the shared-library zone-cluster mode has never been applied to it), STRUCTURE_CURIOSITY_PEAK_UNCAUSED (backward-cause × curiosityDelta-as-magnitude × 2-scene lookback — the existing curiosity-peak checks [CURIOSITY_PEAK_EMOTIONAL_VOID, PEAK_SUSPENSE_CURIOSITY_VOID] audit the co-occurring channel AT the peak scene itself; none looks backward from the peak for a preparing cause, so the shared-library backward-cause mode has never been applied to curiosityDelta).

Rules named in this wave's header:

- `ACT2B_SUSPENSE_VOID`
- `OPENING_SUSPENSE_FLATLINE`
- `PEAK_SUSPENSE_CURIOSITY_VOID`
- `STRUCTURE_CURIOSITY_PEAK_UNCAUSED`
- `STRUCTURE_CURIOSITY_ZONE_CLUSTER`
- `STRUCTURE_SUSPENSE_ZONE_CLUSTER`

## Wave 751

Wave 751 additions: STRUCTURE_CLOCK_DELTA_ZONE_CLUSTER (distribution/timing × clockDelta≠0 presence × structural thirds — Waves 681/737 applied the backward-cause peak and run-based drought modes to clockDelta; the zone-cluster mode has never been applied to it, completing the trio), STRUCTURE_TURN_DROUGHT_RUN (run-based × dramaticTurn !== 'nothing' absence — dramaticTurn is this pass's second most heavily used field [59 accesses] and has never anchored any of the three shared-library modes as a primary signal; the run-based drought mode has never been applied to it), STRUCTURE_STAKES_DROUGHT_RUN (run-based × purpose === 'raise_stakes' absence — Wave 681 applied the zone-cluster mode to this signal; the drought-run mode has never been applied to it).

Rules named in this wave's header:

- `STRUCTURE_CLOCK_DELTA_ZONE_CLUSTER`
- `STRUCTURE_STAKES_DROUGHT_RUN`
- `STRUCTURE_TURN_DROUGHT_RUN`

## Wave 737

Wave 737 additions: STRUCTURE_PAYOFF_DROUGHT_RUN (run-based × payoffSetupIds absence — Waves 667/723 applied the backward-cause peak and zone-cluster modes to payoffSetupIds; the drought-run mode has never been applied to it, completing the trio), STRUCTURE_RELATIONSHIP_PEAK_UNCAUSED (single-peak isolation/backward-cause × relationshipShifts magnitude — Waves 667/723 applied the run-based drought and zone-cluster modes to relationshipShifts; the backward-cause peak mode has never been applied to it, completing the trio), STRUCTURE_CLOCK_DELTA_DROUGHT_RUN (run-based × clockDelta≠0 absence — Wave 681 applied the backward-cause peak mode to clockDelta; the drought-run mode has never been applied to it).

Rules named in this wave's header:

- `STRUCTURE_CLOCK_DELTA_DROUGHT_RUN`
- `STRUCTURE_PAYOFF_DROUGHT_RUN`
- `STRUCTURE_RELATIONSHIP_PEAK_UNCAUSED`

## Wave 723

Wave 723 additions (built on the shared checks library): STRUCTURE_PAYOFF_ZONE_CLUSTER (distribution/timing × payoffSetupIds × structural thirds — Wave 667 applied the backward-cause peak mode to payoffSetupIds; the zone-cluster mode has never been applied to it), STRUCTURE_RELATIONSHIP_ZONE_CLUSTER (distribution/timing × relationshipShifts × structural thirds — Wave 667 applied the drought-run mode to relationshipShifts; the zone-cluster mode has never been applied to it), STRUCTURE_CLOCK_DROUGHT_RUN (run-based × clockRaised absence — Wave 667 applied the zone-cluster mode to clockRaised; the drought-run mode has never been applied to it).

Rules named in this wave's header:

- `STRUCTURE_CLOCK_DROUGHT_RUN`
- `STRUCTURE_PAYOFF_ZONE_CLUSTER`
- `STRUCTURE_RELATIONSHIP_ZONE_CLUSTER`

## Wave 709

Wave 709 additions (built on the shared checks library): STRUCTURE_HIGHLIGHT_DROUGHT_RUN (run-based × dialogueHighlights absence — Waves 639/653 applied the zone-cluster and backward-cause peak modes to dialogueHighlights; the drought-run mode has never been applied to it, completing the trio), STRUCTURE_OPEN_THREAD_ZONE_CLUSTER (distribution/timing × unresolvedClues × structural thirds — Waves 653/695 applied the drought-run and backward-cause peak modes to unresolvedClues; the zone-cluster mode has never been applied to it, completing the trio), STRUCTURE_SEED_PEAK_UNCAUSED (single-peak isolation/backward-cause × seededClueIds magnitude — Waves 653/695 applied the zone-cluster and drought-run modes to seededClueIds; the backward-cause peak mode has never been applied to it, completing the trio).

Rules named in this wave's header:

- `STRUCTURE_HIGHLIGHT_DROUGHT_RUN`
- `STRUCTURE_OPEN_THREAD_ZONE_CLUSTER`
- `STRUCTURE_SEED_PEAK_UNCAUSED`

## Wave 695

Wave 695 additions (built on the shared checks library): STRUCTURE_OPEN_THREAD_PEAK_UNCAUSED (single-peak isolation/backward-cause × unresolvedClues magnitude — unresolvedClues anchors a drought-run check [Wave 653] plus decoupling/aftermath checks [Wave 639]; the backward-cause peak mode has never been applied to it), STRUCTURE_SEED_DROUGHT_RUN (run-based × seededClueIds absence — Wave 653 applied the zone-cluster mode to seededClueIds; the drought-run mode has never been applied to this channel), STRUCTURE_STAGING_ZONE_CLUSTER (distribution/timing × visualBeats × structural thirds — visualBeats anchors a four-zone imbalance check [Wave 611], a backward-cause peak check [Wave 625], and a drought-run check [Wave 681]; the thirds-based zone-cluster mode has never been applied to it).

Rules named in this wave's header:

- `STRUCTURE_OPEN_THREAD_PEAK_UNCAUSED`
- `STRUCTURE_SEED_DROUGHT_RUN`
- `STRUCTURE_STAGING_ZONE_CLUSTER`

## Wave 681

Wave 681 additions (built on the shared checks library, audit M2.2): STRUCTURE_CLOCK_DELTA_PEAK_UNCAUSED (single-peak isolation/backward-cause × clockDelta magnitude — clockDelta has only ever appeared as an OR-condition alongside clockRaised inside decoupled/aftermath triggers; the backward-cause peak mode applied to it standalone for the first time), STRUCTURE_STAGING_DROUGHT_RUN (run-based × visualBeats absence — Waves 625/667 applied the peak-uncaused and zone-imbalance modes to visualBeats; the drought-run mode has never been applied to this channel), STRUCTURE_STAKES_ZONE_CLUSTER (distribution/timing × purpose === 'raise_stakes' × structural thirds — `purpose` has only ever appeared inside incidental filter/set-collection contexts here, never as the standalone subject of its own check).

Rules named in this wave's header:

- `STRUCTURE_CLOCK_DELTA_PEAK_UNCAUSED`
- `STRUCTURE_STAGING_DROUGHT_RUN`
- `STRUCTURE_STAKES_ZONE_CLUSTER`

## Wave 667

Wave 667 additions (built on the shared checks library, audit M2.2): STRUCTURE_PAYOFF_PEAK_UNCAUSED (single-peak isolation/backward-cause × payoffSetupIds magnitude — the scene with the most simultaneous thread resolutions has no dramatic turn or revelation in itself or the two scenes before it; Wave 625/653 applied the peak-uncaused mode to visualBeats and dialogueHighlights; payoffSetupIds itself has never been backward-cause peak-audited), STRUCTURE_RELATIONSHIP_DROUGHT_RUN (run-based × relationshipShifts absence — the drought-run mode has covered emotion/suspense/curiosity/clock/purpose channels via hand-rolled logic and unresolvedClues via the shared helper [Wave 653]; relationshipShifts itself has never been drought-audited despite being used extensively elsewhere), STRUCTURE_CLOCK_ZONE_CLUSTER (distribution/timing × clockRaised × structural thirds — Wave 639 applied the zone-cluster mode to dialogueHighlights; clockRaised itself has never been cluster-audited despite anchoring an entire hand-rolled run-based check family).

Rules named in this wave's header:

- `STRUCTURE_CLOCK_ZONE_CLUSTER`
- `STRUCTURE_PAYOFF_PEAK_UNCAUSED`
- `STRUCTURE_RELATIONSHIP_DROUGHT_RUN`

## Wave 653

Wave 653 additions (built on the shared checks library, audit M2.2): this 119-rule pass already imports all six shared-checks-library templates, so distinctness comes from applying each to a channel it has never touched. STRUCTURE_HIGHLIGHT_PEAK_UNCAUSED (single-peak isolation/ backward-cause × dialogueHighlights magnitude — Wave 625's STRUCTURAL_STAGING_PEAK_UNCAUSED applied the peak-uncaused mode to visualBeats; this is the first application to the highlighted-dialogue channel), STRUCTURE_OPEN_THREAD_DROUGHT_RUN (run-based × unresolvedClues absence — Wave 597's DIALOGUE_HIGHLIGHT_DROUGHT_RUN applied the drought-run mode to dialogueHighlights; unresolvedClues itself has never been drought-audited here despite being used in co-occurrence and aftermath contexts), STRUCTURE_SEED_ZONE_CLUSTER (distribution/timing × seededClueIds × structural thirds — Wave 639's STRUCTURE_DIALOGUE_HIGHLIGHT_ZONE_CLUSTER applied the zone-cluster mode to dialogueHighlights; seededClueIds itself has never been cluster-audited here).

Rules named in this wave's header:

- `DIALOGUE_HIGHLIGHT_DROUGHT_RUN`
- `STRUCTURE_HIGHLIGHT_PEAK_UNCAUSED`
- `STRUCTURE_OPEN_THREAD_DROUGHT_RUN`
- `STRUCTURE_SEED_ZONE_CLUSTER`

## Wave 639

Wave 639 additions (built on the shared checks library, audit M2.2): STRUCTURE_DIALOGUE_HIGHLIGHT_ZONE_CLUSTER (distribution/timing × dialogueHighlights × structural thirds — first zone-cluster mode applied to records in this 116-rule pass), STRUCTURE_HIGHLIGHT_OPEN_THREAD_DECOUPLED (co-occurrence/decoupling × dialogueHighlights × unresolvedClues — first pairing of these two fields), STRUCTURE_OPEN_THREAD_HIGHLIGHT_AFTERMATH_VOID (sequence/aftermath × heavy unresolvedClues debt trigger → dialogueHighlights absence — first pairing of these two fields).

Rules named in this wave's header:

- `STRUCTURE_DIALOGUE_HIGHLIGHT_ZONE_CLUSTER`
- `STRUCTURE_HIGHLIGHT_OPEN_THREAD_DECOUPLED`
- `STRUCTURE_OPEN_THREAD_HIGHLIGHT_AFTERMATH_VOID`

## Wave 625

Wave 625 additions (built on the shared checks library, audit M2.2): STRUCTURAL_STAGING_OPEN_THREAD_DECOUPLED (co-occurrence/decoupling × visualBeats × unresolvedClues — first pairing of these two fields in this 113-rule pass), DRAMATIC_TURN_STAGING_AFTERMATH_VOID (sequence/aftermath × dramaticTurn trigger → visualBeats absence — first pairing of these two fields, despite dramaticTurn already being paired with clockDelta/clockRaised/emotionalShift/ payoffSetupIds), STRUCTURAL_STAGING_PEAK_UNCAUSED (backward-cause × visualBeats-density peak × revelation/dramaticTurn cause — first backward-cause check in this file).

Rules named in this wave's header:

- `DRAMATIC_TURN_STAGING_AFTERMATH_VOID`
- `STRUCTURAL_STAGING_OPEN_THREAD_DECOUPLED`
- `STRUCTURAL_STAGING_PEAK_UNCAUSED`

## Wave 611

Wave 611 additions (built on the shared checks library, audit M2.2): VISUAL_BEAT_STRUCTURAL_IMBALANCE (underweight/bloat × visualBeats × four structural zones — first use of visualBeats anywhere in this 110-rule pass, its last completely untouched record field), PAYOFF_SCENE_TURN_DECOUPLED (co-occurrence/decoupling × payoffSetupIds × dramaticTurn — payoffSetupIds had exactly one prior incidental OR-condition use in this file, never as its own standalone signal), PAYOFF_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID (sequence/aftermath × payoff trigger → dialogueHighlights absence — first aftermath-mode check on the dialogueHighlights channel in this file, which had only drought-run and zone-imbalance coverage from Wave 597).

Rules named in this wave's header:

- `PAYOFF_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID`
- `PAYOFF_SCENE_TURN_DECOUPLED`
- `VISUAL_BEAT_STRUCTURAL_IMBALANCE`

## Wave 583

Wave 583 additions: turn suspense decoupled (co-occurrence/decoupling × dramatic turn × suspense — n≥8, ≥2 turn scenes and ≥2 suspense-positive scenes but zero overlap; pivots are emotionally cool at the moment they happen; suspense-channel sibling of TURN_CURIOSITY_DECOUPLED and TURN_EMOTION_DECOUPLED, completing the dramatic-turn co-occurrence family; distinct from TURN_AFTERMATH_SUSPENSE_VOID [aftermath mode] and DRAMATIC_TURN_CAUSELESS [backward-cause]), clock aftermath emotion void (sequence/aftermath × clock trigger × emotion — n≥8, ≥3 qualifying clock-raise scenes, ≥2 emotional scenes, every clock aftermath window is emotionally neutral; urgency operates in affective isolation; first aftermath check using the clock-raise trigger, distinct from TURN_AFTERMATH_EMOTION_VOID [turn trigger] and REVELATION_AFTERMATH_EMOTION_VOID [revelation trigger]), peak suspense curiosity void (single-peak isolation × suspense peak × curiosity — n≥8, ≥2 curiosity scenes, peak suspenseDelta scene has curiosityDelta≤0; the tensest moment raises no question; curiosity-channel sibling of PEAK_SUSPENSE_EMOTIONAL_VACUUM; distinct from CURIOSITY_PEAK_EMOTIONAL_VOID [curiosity is the peak] and CLOCK_CURIOSITY_DECOUPLED [co-occurrence mode across all scenes]).

Rules named in this wave's header:

- `CURIOSITY_PEAK_EMOTIONAL_VOID`
- `TURN_AFTERMATH_EMOTION_VOID`
- `TURN_CURIOSITY_DECOUPLED`

## Wave 569

Wave 569 additions: turn aftermath clock void (sequence/aftermath × clock × dramatic-turn trigger — ≥3 qualifying turn scenes none followed by a clock raise in next 2 scenes while ≥2 clock scenes exist; pivots never tighten a deadline in their wake; the clock-channel sibling of TURN_AFTERMATH_SUSPENSE/CURIOSITY/EMOTION_VOID, completing the turn-trigger aftermath family; distinct from REVELATION_AFTERMATH_CLOCK_VOID [revelation trigger] and CLOCK_TURN_DECOUPLED [same-scene]), turn curiosity decoupled (co-occurrence/decoupling × curiosity × dramatic-turn trigger — ≥2 turn scenes and ≥2 curiosity scenes but zero overlap; pivots never open a question in the scene they turn; the turn-trigger entry in the curiosity co-occurrence family alongside CLOCK_CURIOSITY_DECOUPLED and REVELATION_CURIOSITY_DECOUPLED, distinct from TURN_AFTERMATH_CURIOSITY_VOID [aftermath, next 2 scenes] and TURN_EMOTION_DECOUPLED [emotion channel]), midpoint clock void (zone presence/absence × clock × midpoint 40%–60% — n≥10, ≥2 clock scenes globally, none in the center window; the structural pivot carries no time pressure; the clock-channel sibling of MIDPOINT_SUSPENSE/CURIOSITY/DRAMATIC_TURN_VOID, distinct from CLOCK_RAISED_LATE [first-occurrence] and CLOCK_PRESSURE_FINALE_ABSENT [finale]).

Rules named in this wave's header:

- `CLOCK_PRESSURE_FINALE_ABSENT`
- `CLOCK_RAISED_LATE`
- `TURN_EMOTION_DECOUPLED`

## Wave 555

Wave 555 additions: clock suspense decoupled (co-occurrence/decoupling × clock × suspense — ≥2 clock scenes and ≥2 suspense-positive scenes but zero overlap; urgency and tension never coincide in the same scene; distinct from CLOCK_CURIOSITY_DECOUPLED which audits the curiosity channel and CLOCK_TURN_DECOUPLED which audits the dramatic-turn channel; completes the clock co-occurrence family with the suspense channel), revelation causeless (backward-cause × revelation signal — ≥3 revelation scenes at positions ≥3, every one preceded in the prior 3 scenes by no suspense spike, no clock raise, and no dramatic turn; disclosures erupt without structural build-up; distinct from DRAMATIC_TURN_CAUSELESS which uses the turn trigger and CLIMAX_UNPREPARED which uses the climax-position trigger), turn aftermath emotion void (sequence/ aftermath × emotion × dramatic-turn trigger — ≥3 qualifying turn scenes none followed by an emotional shift in next 2 scenes while ≥2 emotional scenes exist; pivots never move the emotional register in their aftermath; the emotion-channel sibling of TURN_AFTERMATH_SUSPENSE_VOID and TURN_AFTERMATH_CURIOSITY_VOID, completing the turn-trigger aftermath channel family with the emotional register).

Rules named in this wave's header:

- `CLOCK_CURIOSITY_DECOUPLED`
- `DRAMATIC_TURN_CAUSELESS`
- `TURN_AFTERMATH_CURIOSITY_VOID`

## Wave 541

Wave 541 additions: revelation aftermath suspense void (sequence/aftermath × suspense × revelation trigger — ≥3 qualifying revelations none followed by a suspense spike in next 2 scenes while ≥2 suspense-spike scenes exist; disclosures never activate tension in their aftermath; suspense-channel sibling of REVELATION_AFTERMATH_CLOCK_VOID and REVELATION_AFTERMATH_EMOTION_VOID), turn aftermath curiosity void (sequence/aftermath × curiosity × dramatic-turn trigger — ≥3 qualifying turns none followed by curiosityDelta>0 in next 2 scenes while ≥2 curiosity scenes exist; pivots never generate new questions; curiosity-channel sibling of TURN_AFTERMATH_SUSPENSE_VOID), emotional neutral run (run-based × neutral emotional valence — 6+ consecutive emotionally neutral scenes while ≥4 emotionally charged scenes exist; the story goes affectively flat for a sustained stretch; neutral-counterpart of POSITIVE_SCENE_RUN and NEGATIVE_SCENE_RUN, completing the three-valence run family).

Rules named in this wave's header:

- `REVELATION_AFTERMATH_EMOTION_VOID`
- `TURN_AFTERMATH_SUSPENSE_VOID`

## Wave 527

Wave 527 additions: clock run (run-based × clock channel — 5+ consecutive clockRaised scenes; the first run check on the clock channel, completing the channel-run family alongside SUSPENSE_RUN, CURIOSITY_RUN, POSITIVE_SCENE_RUN, NEGATIVE_SCENE_RUN), turn emotion decoupled (co-occurrence/ decoupling × dramatic turn × emotional shift — ≥2 turns and ≥2 emotional scenes but zero overlap; the emotional-shift co-occurrence sibling of REVELATION_TURN_DECOUPLED and CLOCK_TURN_DECOUPLED), revelation aftermath emotion void (sequence/aftermath × emotional shift × revelation trigger — ≥3 qualifying revelations none followed by emotion in next 2 scenes; the emotional-channel sibling of REVELATION_AFTERMATH_CLOCK_VOID, completing the revelation-trigger aftermath family).

Rules named in this wave's header:

- `CLOCK_TURN_DECOUPLED`
- `CURIOSITY_RUN`
- `REVELATION_TURN_DECOUPLED`

## Wave 513

Wave 513 additions: clock turn decoupled (co-occurrence/decoupling × clock × dramatic-turn — ≥2 clock scenes and ≥2 turn scenes but no scene carries both; urgency and direction-change never coincide, completing the clock co-occurrence family alongside clock × curiosity [Wave 499] and clock × revelation [Wave 485]), curiosity run (run-based × curiosity channel — 5+ consecutive curiosity-positive scenes while ≥4 curiosity scenes exist; first run check on the curiosity channel, completing the channel-run family alongside SUSPENSE_RUN, POSITIVE_SCENE_RUN, NEGATIVE_SCENE_RUN), turn aftermath suspense void (sequence/aftermath × suspense × dramatic-turn trigger — ≥2 qualifying turn scenes none followed by a suspense spike in next 2 scenes while ≥3 suspense scenes exist; first aftermath check using the dramatic-turn trigger, distinct from REVELATION_AFTERMATH_CLOCK_VOID [revelation trigger] and INCITING_AFTERMATH_STALL [inciting incident trigger]).

Rules named in this wave's header:

- `INCITING_AFTERMATH_STALL`
- `NEGATIVE_SCENE_RUN`
- `REVELATION_AFTERMATH_CLOCK_VOID`
- `SUSPENSE_RUN`

## Wave 499

Wave 499 additions: clock curiosity decoupled (co-occurrence/decoupling × clock × curiosity — ≥2 clock scenes and ≥2 curiosity-spike scenes but no scene carries both; urgency and wonder never coincide, extending the co-occurrence family beyond the revelation-centric checks by placing the clock channel as the trigger rather than revelation), revelation aftermath clock void (sequence/aftermath × revelation trigger × clock aftermath — ≥3 qualifying revelation scenes [pos < n-2], ≥2 clock scenes globally, none followed by a clock raise in the next 2 scenes; disclosures never trigger urgency, the first aftermath check on the clock channel with a revelation trigger, distinct from REVELATION_CLOCK_DECOUPLED which checks simultaneous co-occurrence), suspense run (run-based × suspense channel — longest consecutive run of scenes with suspenseDelta > 0 ≥ 5; the tension dial stuck at high across an unbroken sequence, the first run-based check on the suspense channel, distinct from the emotional-valence run checks).

Rules named in this wave's header:

- `REVELATION_CLOCK_DECOUPLED`

## Wave 485

Wave 485 additions: negative scene run (run-based × negative emotional valence — 5+ consecutive scenes all emotionalShift='negative'; the run mirror of POSITIVE_SCENE_RUN on the negative side, a sustained descent without contrast or relief), revelation clock decoupled (co-occurrence/ decoupling × revelation × clock — ≥2 revelation scenes and ≥2 clock scenes but no scene carries both; disclosures never land under deadline pressure, completing the revelation co-occurrence family alongside curiosity/suspense/turn channels), climax aftermath flat (sequence/aftermath × climax trigger — the peak-suspense scene in the final 30% is followed by 2 scenes with no emotional shift and no relationship shift; the climax produces no human ripple; first aftermath check triggered by the story's climax position).

Rules named in this wave's header:

- `POSITIVE_SCENE_RUN`

## Wave 471

Wave 471 additions: curiosity peak emotional void (single-peak isolation × curiosity channel × valence — the scene with the highest curiosityDelta is emotionally neutral while ≥2 scenes carry emotional charge elsewhere; fills the curiosity-channel cell in the peak-isolation × valence matrix alongside PEAK_SUSPENSE_EMOTIONAL_VACUUM which uses the suspense channel), positive scene run (run-based × positive emotional valence — 5+ consecutive scenes all emotionalShift='positive'; the first run-based check on emotional valence, distinct from EMOTIONAL_ARC_UNIFORM which audits global proportion and NEGATIVE_SCENE_DROUGHT which audits a global ratio), revelation turn decoupled (co-occurrence/decoupling × revelation × dramaticTurn — the story has ≥2 revelations and ≥2 turns but no scene carries both; the truth-surfacing and direction-changing machinery always operate in separate beats; completes the revelation co-occurrence family with curiosity and suspense channels now joined by the dramatic-turn channel).

Rules named in this wave's header:

- `NEGATIVE_SCENE_DROUGHT`
- `PEAK_SUSPENSE_EMOTIONAL_VACUUM`

## Wave 457

Wave 457 additions: revelation suspense decoupled (co-occurrence/decoupling × suspense channel — every revelation scene has suspenseDelta ≤ 0; disclosures never land under tension, the suspense-channel sibling of REVELATION_CURIOSITY_DECOUPLED), negative scene drought (valence × underweight — fewer than 15% of scenes carry negative emotionalShift while ≥3 carry positive; the story is relentlessly upbeat with almost no darkness for contrast, the mirror of POSITIVE_SCENE_DROUGHT), dramatic turn causeless (backward-cause × dramatic turn — every scene whose dramaticTurn ≠ 'nothing' is preceded in the prior 3 scenes by no revelation, high suspense, or clock raise; pivots erupt without structural build-up, the turn-signal sibling of CLIMAX_UNPREPARED).

Rules named in this wave's header:

- `CLIMAX_UNPREPARED`
- `POSITIVE_SCENE_DROUGHT`
- `REVELATION_CURIOSITY_DECOUPLED`

## Wave 443

Wave 443 additions: revelation-curiosity decoupled (co-occurrence/decoupling — every revelation scene has curiosityDelta ≤ 0; revelations never co-occur with a curiosity spike, so disclosures close questions rather than opening new ones; the first co-occurrence check in this pass, distinct from all zone-based and channel-isolation checks), peak suspense emotional vacuum (single-peak isolation × valence — the single highest-suspense scene in the story has emotionalShift = neutral while emotion is active elsewhere; the tensest moment is emotionally blank, isolating the peak from the story's affective register), positive scene drought (valence × underweight — fewer than 15% of scenes carry positive emotionalShift while ≥3 carry negative; the positive register is chronically underrepresented, distinct from EMOTIONAL_ARC_UNIFORM which audits dominance of any one register above 70% and from ACT_1_WARMTH_ABSENT which is zone-scoped).

Rules named in this wave's header:

- `EMOTIONAL_ARC_UNIFORM`

## Wave 429

Wave 429 additions: inciting aftermath stall (sequence/aftermath — the first early catalyst in the opening 40% is followed by two scenes that neither raise suspense nor curiosity; the story sparks its engine then stalls, squandering the inciting incident's momentum), climax unprepared (backward-cause — the peak-suspense scene in the final 30% and its two preceding scenes carry no revelation or dramatic turn though the story uses these devices elsewhere; the climax erupts without structural run-up), purpose monotone run (run-based — five or more consecutive scenes share one purpose; a local structural plateau distinct from the global PURPOSE_MONOCULTURE and the zone-complete ACT1/ACT2/ACT3_PURPOSE_SINGLE checks).

Rules named in this wave's header:

- `PURPOSE_MONOCULTURE`

## Unattributed (no explicit wave-header mention)

These rule constants exist in this pass but were not found, by exact-name match, inside any "Wave N —" / "Wave N additions:" header entry in the file — typically because they predate that convention hardening, or the header describes the check descriptively rather than by constant name (e.g. "talking heads" rather than `TALKING_HEADS`). Listed here honestly rather than guessed into a wave, with the nearest preceding in-code "── section title ──" comment as the best-available substitute context where one exists.

- `ACT_BALANCE_EXTREME` — Wave 306: ACT_BALANCE_EXTREME
- `ACT1_BOUNDARY_WEAK` — Act boundary turning points
- `ACT1_CURIOSITY_ABSENT` — Wave 264: Revelation clustered, Act 1 curiosity absent, Act 1 purpose single
- `ACT1_EMOTIONAL_FLATLINE` — Wave 387: ACT1_EMOTIONAL_FLATLINE, ACT2A_CURIOSITY_VOID, ACT2_DRAMATIC_TURN_ABSENT
- `ACT1_PURPOSE_SINGLE` — Wave 264: Revelation clustered, Act 1 curiosity absent, Act 1 purpose single
- `ACT1_RELATIONSHIP_VOID` — Wave 359: OPENING_CURIOSITY_FLATLINE, ACT3_DRAMATIC_TURN_ABSENT, ACT1_RELATIONSHIP_VOID
- `ACT1_REVELATION_ABSENT` — Wave 198: Act 3 excess, tension abrupt drop, Act 1 revelation absent
- `ACT1_SUSPENSE_VOID` — Wave 415: ACT1_SUSPENSE_VOID, ACT2A_DRAMATIC_TURN_VOID, ACT2B_DRAMATIC_TURN_VOID
- `ACT1_WARMTH_ABSENT` — Wave 331: ACT3_EMOTIONAL_FLATLINE, ACT1_WARMTH_ABSENT, DRAMATIC_TURN_OPENING_ABSENT
- `ACT2_BOUNDARY_WEAK` — Act boundary turning points
- `ACT2_CURIOSITY_VALLEY` — Wave 320: ACT2_CURIOSITY_VALLEY
- `ACT2_DEAD_ZONE` — Wave 165: Protagonist passivity at climax, dark night absent, Act 2 dead zone
- `ACT2_DRAMATIC_TURN_ABSENT` — Wave 387: ACT1_EMOTIONAL_FLATLINE, ACT2A_CURIOSITY_VOID, ACT2_DRAMATIC_TURN_ABSENT
- `ACT2_PURPOSE_SINGLE` — Wave 373: MIDPOINT_SUSPENSE_VOID, ACT2_PURPOSE_SINGLE, ACT2B_EMOTIONAL_FLATLINE
- `ACT2_REVELATION_ABSENT` — Wave 236: Purpose monoculture, clock raised late, Act 2 revelation absent
- `ACT2_TOO_SHORT` — Act balance checks
- `ACT2A_CURIOSITY_VOID` — Wave 387: ACT1_EMOTIONAL_FLATLINE, ACT2A_CURIOSITY_VOID, ACT2_DRAMATIC_TURN_ABSENT
- `ACT2A_DRAMATIC_TURN_VOID` — Wave 415: ACT1_SUSPENSE_VOID, ACT2A_DRAMATIC_TURN_VOID, ACT2B_DRAMATIC_TURN_VOID
- `ACT2A_EMOTIONAL_FLATLINE` — Wave 345: ACT2B_SUSPENSE_VOID, ACT2A_EMOTIONAL_FLATLINE, MIDPOINT_CURIOSITY_VOID
- `ACT2A_SUSPENSE_VOID` — Wave 278: Act 2a suspense void, climax purpose absent, emotional arc uniform
- `ACT2B_CURIOSITY_VOID` — Wave 401: ACT2B_CURIOSITY_VOID, MIDPOINT_DRAMATIC_TURN_VOID, ACT3_SUSPENSE_VOID
- `ACT2B_DRAMATIC_TURN_VOID` — Wave 415: ACT1_SUSPENSE_VOID, ACT2A_DRAMATIC_TURN_VOID, ACT2B_DRAMATIC_TURN_VOID
- `ACT2B_EMOTIONAL_FLATLINE` — Wave 373: MIDPOINT_SUSPENSE_VOID, ACT2_PURPOSE_SINGLE, ACT2B_EMOTIONAL_FLATLINE
- `ACT2B_SUSPENSE_DECAY` — Wave 250: Curiosity void, Act 3 purpose monotone, Act 2b suspense decay
- `ACT3_CURIOSITY_SPIKE_ABSENT` — Wave 292: ACT3_CURIOSITY_SPIKE_ABSENT
- `ACT3_DRAMATIC_TURN_ABSENT` — Wave 359: OPENING_CURIOSITY_FLATLINE, ACT3_DRAMATIC_TURN_ABSENT, ACT1_RELATIONSHIP_VOID
- `ACT3_PURPOSE_MONOTONE` — Wave 250: Curiosity void, Act 3 purpose monotone, Act 2b suspense decay
- `ACT3_SCENE_EXCESS` — Wave 198: Act 3 excess, tension abrupt drop, Act 1 revelation absent
- `ACT3_SUSPENSE_VOID` — Wave 401: ACT2B_CURIOSITY_VOID, MIDPOINT_DRAMATIC_TURN_VOID, ACT3_SUSPENSE_VOID
- `ACT3_TOO_EARLY` — Act balance checks
- `CLIMAX_AFTERMATH_FLAT` — Wave 485: NEGATIVE_SCENE_RUN, REVELATION_CLOCK_DECOUPLED, CLIMAX_AFTERMATH_FLAT
- `CLIMAX_PLATEAU` — Wave 179: Escalation reversed, climax plateau, unresolved ending
- `CLIMAX_REVELATION_ABSENT` — Wave 320: CLIMAX_REVELATION_ABSENT
- `CLIMAX_TOO_EARLY` — Tightest scene should be in second half
- `CLOCK_RUN` — Wave 527: CLOCK_RUN, TURN_EMOTION_DECOUPLED, REVELATION_AFTERMATH_EMOTION_VOID
- `CLOCK_SUSPENSE_DECOUPLED` — Wave 541: REVELATION_AFTERMATH_SUSPENSE_VOID, TURN_AFTERMATH_CURIOSITY_VOID, EMOTIONAL_NEUTRAL_RUN
- `COLD_OPEN_INERT` — Wave 209: Cold open inert, denouement overlong, pre-climax lull
- `DENOUEMENT_OVERLONG` — Wave 209: Cold open inert, denouement overlong, pre-climax lull
- `DIALOGUE_HIGHLIGHT_ZONE_IMBALANCE` — Rewrite
- `DRAMATIC_TURN_OPENING_ABSENT` — Wave 331: ACT3_EMOTIONAL_FLATLINE, ACT1_WARMTH_ABSENT, DRAMATIC_TURN_OPENING_ABSENT
- `DRAMATIC_VACUUM_STRETCH` — Wave 209: Cold open inert, denouement overlong, pre-climax lull
- `EMOTIONAL_NEUTRAL_RUN` — Wave 541: REVELATION_AFTERMATH_SUSPENSE_VOID, TURN_AFTERMATH_CURIOSITY_VOID, EMOTIONAL_NEUTRAL_RUN
- `EMOTIONAL_OPENING_NEUTRAL` — Wave 320: EMOTIONAL_OPENING_NEUTRAL
- `ESCALATION_REVERSED` — Wave 179: Escalation reversed, climax plateau, unresolved ending
- `FALSE_CLIMAX` — Wave 152: Revelation drought, false climax, act symmetry
- `FINAL_IMAGE_WEAK` — Wave 306: FINAL_IMAGE_WEAK
- `INCITING_INCIDENT_TOO_LATE` — Wave 186: Act 2 inversion, midpoint reversal absent, inciting incident late
- `MIDPOINT_CLOCK_VOID` — Wave 569: TURN_AFTERMATH_CLOCK_VOID, TURN_CURIOSITY_DECOUPLED, MIDPOINT_CLOCK_VOID
- `MIDPOINT_CURIOSITY_VOID` — Wave 345: ACT2B_SUSPENSE_VOID, ACT2A_EMOTIONAL_FLATLINE, MIDPOINT_CURIOSITY_VOID
- `MIDPOINT_DRAMATIC_TURN_VOID` — Wave 401: ACT2B_CURIOSITY_VOID, MIDPOINT_DRAMATIC_TURN_VOID, ACT3_SUSPENSE_VOID
- `MIDPOINT_EMOTIONAL_FLATLINE` — Wave 306: MIDPOINT_EMOTIONAL_FLATLINE
- `MIDPOINT_REVERSAL_ABSENT` — Wave 186: Act 2 inversion, midpoint reversal absent, inciting incident late
- `MIDPOINT_SUSPENSE_VOID` — Wave 373: MIDPOINT_SUSPENSE_VOID, ACT2_PURPOSE_SINGLE, ACT2B_EMOTIONAL_FLATLINE
- `MISSING_INCITING_INCIDENT` — Missing inciting incident (Act 1 without major shift)
- `NO_REVERSALS` — Missing reversal means flat structure
- `OPENING_CURIOSITY_FLATLINE` — Wave 359: OPENING_CURIOSITY_FLATLINE, ACT3_DRAMATIC_TURN_ABSENT, ACT1_RELATIONSHIP_VOID
- `PRE_CLIMAX_LULL` — Wave 209: Cold open inert, denouement overlong, pre-climax lull
- `PROTAGONIST_PASSIVITY_CLIMAX` — Wave 165: Protagonist passivity at climax, dark night absent, Act 2 dead zone
- `PURPOSE_MONOTONE_RUN` — Wave 429: INCITING_AFTERMATH_STALL, CLIMAX_UNPREPARED, PURPOSE_MONOTONE_RUN
- `REVELATION_AFTERMATH_SUSPENSE_VOID` — Wave 541: REVELATION_AFTERMATH_SUSPENSE_VOID, TURN_AFTERMATH_CURIOSITY_VOID, EMOTIONAL_NEUTRAL_RUN
- `REVELATION_SUSPENSE_DECOUPLED` — Wave 457: REVELATION_SUSPENSE_DECOUPLED, NEGATIVE_SCENE_DROUGHT, DRAMATIC_TURN_CAUSELESS
- `SCENE_CONTINUITY_COLLAPSE` — SCENE_CONTINUITY_COLLAPSE (structural-AUC wave, 2026-07-10)
- `SCENE_CONTINUITY_PERVASIVE` — SCENE_CONTINUITY_COLLAPSE (structural-AUC wave, 2026-07-10)
- `SECOND_ACT_INVERSION` — Wave 186: Act 2 inversion, midpoint reversal absent, inciting incident late
- `STRUCTURE_CURIOSITY_VOID` — Wave 250: Curiosity void, Act 3 purpose monotone, Act 2b suspense decay
- `TENSION_DROP_ABRUPT` — Wave 198: Act 3 excess, tension abrupt drop, Act 1 revelation absent
- `TENSION_FRONTLOADED_COM` — Wave 209: Cold open inert, denouement overlong, pre-climax lull
- `TRY_FAIL_RHYTHM_ABSENT` — Wave 209: Cold open inert, denouement overlong, pre-climax lull
- `TURN_AFTERMATH_CLOCK_VOID` — Wave 569: TURN_AFTERMATH_CLOCK_VOID, TURN_CURIOSITY_DECOUPLED, MIDPOINT_CLOCK_VOID
- `TURN_SUSPENSE_DECOUPLED` — Wave 583: TURN_SUSPENSE_DECOUPLED, CLOCK_AFTERMATH_EMOTION_VOID, PEAK_SUSPENSE_CURIOSITY_VOID
- `UNRESOLVED_CLUE_DEBT_ESCALATION_ABSENT` — Rewrite
- `UNRESOLVED_ENDING` — Wave 179: Escalation reversed, climax plateau, unresolved ending
- `WEAK_MIDPOINT` — Midpoint pressure

