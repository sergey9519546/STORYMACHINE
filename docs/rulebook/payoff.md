# Pass: `payoff`

Founding wave: 39. Total distinct rules: 228 (171 attributed to a specific wave, 57 unattributed — see docs/rulebook/README.md's methodology note).

## Wave 1182

Wave 1182 additions (Program v2, Type 1 — first signal-channel wave, sets the template for every v2 wave after it): fountain-analyzer.ts's new question-answer latency signal (questionsRaised/questionsResolved/questionsResolvedSameScene/questionsUnresolved — a lexically-fingerprinted cross-scene question→answer pairing, distinct from curiosityDelta's intensity score and from the prop/token-based clue seed/payoff mechanism, neither of which tracks an individual question as a resolvable entity at all) gets its first 3 consumers, all in this pass because payoff/continuity is precisely "promises made vs. promises kept," and an unanswered dialogue question is a promise exactly like a planted clue. UNANSWERED_QUESTION_FLOOD (average/aggregate mode — document-wide raised-vs-resolved ratio) catches open-loop overload; INSTANT_GRATIFICATION_PATTERN (average/aggregate mode on TIMING rather than rate — fires even when the flood check doesn't, since a story can resolve everything and still resolve it all instantly) catches tension that never survives a scene boundary; DEAD_QUESTION_ZONE (zone presence/absence mode) catches localized abandonment the two document-wide averages structurally cannot see (a story can pass both averages while one act's questions die entirely, masked by another act's strong resolution rate). All three are hand-rolled rather than built on lib/checks.ts templates: the shared library's shapes test scene-level boolean predicates (occurrence, co-occurrence, zone clustering of a single boolean signal), not a numeric-ratio comparison across summed fields — a genuinely different shape from anything it currently expresses.

Rules named in this wave's header:

- `DEAD_QUESTION_ZONE`
- `INSTANT_GRATIFICATION_PATTERN`
- `UNANSWERED_QUESTION_FLOOD`

## Wave 1168

Wave 1168 additions: after Wave 1154, suspenseDelta stood at two channels (curiosityDelta, emotionalShift), emotionalShift at two (relationshipShifts, curiosityDelta), and clockDelta≠0 at two (curiosityDelta, emotionalShift). PAYOFF_SUSPENSE_RELATIONAL_AFTERMATH_VOID gives suspenseDelta its third channel (relationshipShifts); PAYOFF_EMOTION_SUSPENSE_AFTERMATH_VOID gives emotionalShift its third channel (suspenseDelta); PAYOFF_CLOCK_DELTA_RELATIONAL_AFTERMATH_VOID gives clockDelta≠0 its third channel (relationshipShifts).

Rules named in this wave's header:

- `PAYOFF_CLOCK_DELTA_RELATIONAL_AFTERMATH_VOID`
- `PAYOFF_EMOTION_SUSPENSE_AFTERMATH_VOID`
- `PAYOFF_SUSPENSE_RELATIONAL_AFTERMATH_VOID`

## Wave 1154

Wave 1154 additions: after Wave 1140, suspenseDelta, emotionalShift, and clockDelta≠0 were each at exactly one of six channels. PAYOFF_SUSPENSE_EMOTIONAL_AFTERMATH_VOID gives suspenseDelta its second channel (emotionalShift); PAYOFF_EMOTION_CURIOSITY_AFTERMATH_VOID gives emotionalShift its second channel (curiosityDelta); PAYOFF_CLOCK_DELTA_EMOTIONAL_AFTERMATH_VOID gives clockDelta≠0 its second channel (emotionalShift).

Rules named in this wave's header:

- `PAYOFF_CLOCK_DELTA_EMOTIONAL_AFTERMATH_VOID`
- `PAYOFF_EMOTION_CURIOSITY_AFTERMATH_VOID`
- `PAYOFF_SUSPENSE_EMOTIONAL_AFTERMATH_VOID`

## Wave 1140

Wave 1140 additions: with every tracked trigger exhausted, this wave introduces three genuinely fresh checkAftermathVoid triggers — suspenseDelta, emotionalShift, and clockDelta have never anchored the isTrigger side of a checkAftermathVoid check in this file (only used as aftermath channels or in other analytical modes, e.g. PAYOFF_CLOCK_DELTA_PEAK_UNCAUSED). PAYOFF_SUSPENSE_CURIOSITY_AFTERMATH_VOID pairs suspenseDelta with curiosityDelta; PAYOFF_EMOTION_RELATIONAL_AFTERMATH_VOID pairs emotionalShift with relationshipShifts; PAYOFF_CLOCK_DELTA_CURIOSITY_AFTERMATH_VOID pairs clockDelta≠0 with curiosityDelta.

Rules named in this wave's header:

- `PAYOFF_CLOCK_DELTA_CURIOSITY_AFTERMATH_VOID`
- `PAYOFF_EMOTION_RELATIONAL_AFTERMATH_VOID`
- `PAYOFF_SUSPENSE_CURIOSITY_AFTERMATH_VOID`

## Wave 1126

Wave 1126 additions: with raise_stakes, clockRaised, seededClueIds, and dramaticTurn all fully saturated, this wave closes the remaining gaps on the two triggers still short of six channels. PAYOFF_OPEN_THREAD_STAGING_AFTERMATH_VOID gives heavy unresolvedClues debt its sixth and final channel (visualBeats), completing full saturation for this trigger too. revelation stood at four channels (relationshipShifts/curiosityDelta/emotionalShift/suspenseDelta) — PAYOFF_REVELATION_STAGING_AFTERMATH_VOID and PAYOFF_REVELATION_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID give it its fifth and sixth channels (visualBeats, dialogueHighlights), completing full six-channel saturation for every tracked trigger in this pass.

Rules named in this wave's header:

- `PAYOFF_OPEN_THREAD_STAGING_AFTERMATH_VOID`
- `PAYOFF_REVELATION_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID`
- `PAYOFF_REVELATION_STAGING_AFTERMATH_VOID`

## Wave 1112

Wave 1112 additions: clockRaised, seededClueIds, and dramaticTurn are genuinely fully saturated as of Wave 1098, but raise_stakes and heavy unresolvedClues debt remain at four checkAftermathVoid channels each (curiosityDelta/suspenseDelta/emotionalShift/relationshipShifts), still missing dialogueHighlights and visualBeats. PAYOFF_STAKES_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID and PAYOFF_STAKES_STAGING_AFTERMATH_VOID give raise_stakes its fifth and sixth channels, completing full saturation for this trigger. PAYOFF_OPEN_THREAD_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID gives heavy unresolvedClues debt a fifth channel.

Rules named in this wave's header:

- `PAYOFF_OPEN_THREAD_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID`
- `PAYOFF_STAKES_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID`
- `PAYOFF_STAKES_STAGING_AFTERMATH_VOID`

## Wave 1098

Wave 1098 additions: PAYOFF_CLOCK_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID gives clockRaised its sixth and final channel (previously paired with visualBeats/curiosityDelta/relationshipShifts/ emotionalShift/suspenseDelta, now also paired with dialogueHighlights). PAYOFF_SEED_STAGING_AFTERMATH_VOID gives seededClueIds its sixth and final channel (previously paired with dialogueHighlights/emotionalShift/curiosityDelta/suspenseDelta/relationshipShifts, now also paired with visualBeats). PAYOFF_TURN_STAGING_AFTERMATH_VOID gives dramaticTurn its sixth and final channel (previously paired with dialogueHighlights/suspenseDelta/curiosityDelta/ relationshipShifts/emotionalShift, now also paired with visualBeats). Together these complete full six-channel saturation for all six of this pass's main triggers (raise_stakes, unresolvedClues-debt, revelation, clockRaised, seededClueIds, dramaticTurn).

Rules named in this wave's header:

- `PAYOFF_CLOCK_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID`
- `PAYOFF_SEED_STAGING_AFTERMATH_VOID`
- `PAYOFF_TURN_STAGING_AFTERMATH_VOID`

## Wave 1084

Wave 1084 additions: with all six main triggers now at four channels each, this wave gives three of them a fifth: PAYOFF_SEED_RELATIONAL_AFTERMATH_VOID (seededClueIds, previously paired with dialogueHighlights/emotionalShift/curiosityDelta/suspenseDelta, now also paired with relationshipShifts), PAYOFF_CLOCK_SUSPENSE_AFTERMATH_VOID (clockRaised, previously paired with visualBeats/curiosityDelta/relationshipShifts/emotionalShift, now also paired with suspenseDelta), and PAYOFF_TURN_EMOTIONAL_AFTERMATH_VOID (dramaticTurn, previously paired with dialogueHighlights/suspenseDelta/curiosityDelta/relationshipShifts, now also paired with emotionalShift).

Rules named in this wave's header:

- `PAYOFF_CLOCK_SUSPENSE_AFTERMATH_VOID`
- `PAYOFF_SEED_RELATIONAL_AFTERMATH_VOID`
- `PAYOFF_TURN_EMOTIONAL_AFTERMATH_VOID`

## Wave 1070

Wave 1070 additions: this wave targets the three least-saturated triggers, each getting a fourth channel: PAYOFF_STAKES_RELATIONAL_AFTERMATH_VOID (raise_stakes, previously paired with curiosityDelta/suspenseDelta/emotionalShift, now also paired with relationshipShifts), PAYOFF_OPEN_THREAD_RELATIONAL_AFTERMATH_VOID (heavy unresolvedClues debt, previously paired with suspenseDelta/emotionalShift/curiosityDelta, now also paired with relationshipShifts), and PAYOFF_REVELATION_SUSPENSE_AFTERMATH_VOID (revelation, previously paired with relationshipShifts/curiosityDelta/emotionalShift, now also paired with suspenseDelta).

Rules named in this wave's header:

- `PAYOFF_OPEN_THREAD_RELATIONAL_AFTERMATH_VOID`
- `PAYOFF_REVELATION_SUSPENSE_AFTERMATH_VOID`
- `PAYOFF_STAKES_RELATIONAL_AFTERMATH_VOID`

## Wave 1056

Wave 1056 additions: three triggers each get a fourth consequence channel, none reusing a combination already covered above: PAYOFF_SEED_SUSPENSE_AFTERMATH_VOID (seededClueIds, previously paired with dialogueHighlights/emotionalShift/curiosityDelta, now also paired with suspenseDelta), PAYOFF_CLOCK_EMOTIONAL_AFTERMATH_VOID (clockRaised, previously paired with visualBeats/curiosityDelta/relationshipShifts, now also paired with emotionalShift), and PAYOFF_TURN_RELATIONAL_AFTERMATH_VOID (dramaticTurn, previously paired with dialogueHighlights/suspenseDelta/curiosityDelta, now also paired with relationshipShifts).

Rules named in this wave's header:

- `PAYOFF_CLOCK_EMOTIONAL_AFTERMATH_VOID`
- `PAYOFF_SEED_SUSPENSE_AFTERMATH_VOID`
- `PAYOFF_TURN_RELATIONAL_AFTERMATH_VOID`

## Wave 1042

Wave 1042 additions: three less-saturated triggers each get a curiosityDelta channel for the first time: PAYOFF_SEED_CURIOSITY_AFTERMATH_VOID (seededClueIds, previously paired with dialogueHighlights/emotionalShift), PAYOFF_TURN_CURIOSITY_AFTERMATH_VOID (dramaticTurn, previously paired with dialogueHighlights/suspenseDelta), and PAYOFF_OPEN_THREAD_CURIOSITY_AFTERMATH_VOID (heavy unresolvedClues debt, previously paired with suspenseDelta/emotionalShift).

Rules named in this wave's header:

- `PAYOFF_OPEN_THREAD_CURIOSITY_AFTERMATH_VOID`
- `PAYOFF_SEED_CURIOSITY_AFTERMATH_VOID`
- `PAYOFF_TURN_CURIOSITY_AFTERMATH_VOID`

## Wave 1028

Wave 1028 additions: three more triggers get a third consequence channel: PAYOFF_STAKES_EMOTIONAL_AFTERMATH_VOID (raise_stakes, previously paired with curiosityDelta/suspenseDelta, now paired with emotionalShift), PAYOFF_CLOCK_RELATIONAL_AFTERMATH_VOID (clockRaised, previously paired with visualBeats/curiosityDelta, now paired with relationshipShifts), and PAYOFF_REVELATION_EMOTIONAL_AFTERMATH_VOID (revelation, previously paired with relationshipShifts/ curiosityDelta, now paired with emotionalShift).

Rules named in this wave's header:

- `PAYOFF_CLOCK_RELATIONAL_AFTERMATH_VOID`
- `PAYOFF_REVELATION_EMOTIONAL_AFTERMATH_VOID`
- `PAYOFF_STAKES_EMOTIONAL_AFTERMATH_VOID`

## Wave 1014

Wave 1014 additions: this wave gives three more triggers a second consequence channel: PAYOFF_STAKES_SUSPENSE_AFTERMATH_VOID (raise_stakes, previously only paired with curiosityDelta, now paired with suspenseDelta), PAYOFF_OPEN_THREAD_EMOTIONAL_AFTERMATH_VOID (heavy unresolvedClues debt, previously only paired with suspenseDelta, now paired with emotionalShift), and PAYOFF_REVELATION_CURIOSITY_AFTERMATH_VOID (revelation, previously only paired with relationshipShifts, now paired with curiosityDelta).

Rules named in this wave's header:

- `PAYOFF_OPEN_THREAD_EMOTIONAL_AFTERMATH_VOID`
- `PAYOFF_REVELATION_CURIOSITY_AFTERMATH_VOID`
- `PAYOFF_STAKES_SUSPENSE_AFTERMATH_VOID`

## Wave 1000

Wave 1000 additions: PAYOFF_STAGING re-checked and re-excluded (same predicate mismatch, >=2 vs >0 visualBeats), confirming zone-imbalance remains exhausted. Every existing aftermath-void trigger in this pass (seed, clock, turn, stakes, open-thread, revelation) has so far been paired with exactly one consequence channel — this wave gives three of them a second channel: PAYOFF_CLOCK_CURIOSITY_AFTERMATH_VOID (clockRaised, previously only paired with visualBeats, now paired with curiosityDelta), PAYOFF_TURN_SUSPENSE_AFTERMATH_VOID (dramaticTurn, previously only paired with dialogueHighlights, now paired with suspenseDelta), and PAYOFF_SEED_EMOTIONAL_AFTERMATH_VOID (seededClueIds, previously only paired with dialogueHighlights, now paired with emotionalShift).

Rules named in this wave's header:

- `PAYOFF_CLOCK_CURIOSITY_AFTERMATH_VOID`
- `PAYOFF_SEED_EMOTIONAL_AFTERMATH_VOID`
- `PAYOFF_TURN_SUSPENSE_AFTERMATH_VOID`

## Wave 986

Wave 986 additions: zone-imbalance is now fully exhausted in this pass (the only remaining cluster+drought pair, PAYOFF_STAGING, has inconsistent predicates — >=2 vs >0 visualBeats — so it was skipped, same as in prior waves). This wave pivots entirely to the sequence/aftermath mode with three fresh trigger/aftermath pairings, none of which reuse a combination already covered by SEED_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID, CLOCK_STAGING_AFTERMATH_VOID, or PAYOFF_TURN_HIGHLIGHT_AFTERMATH_VOID: PAYOFF_STAKES_CURIOSITY_AFTERMATH_VOID (raise_stakes → curiosityDelta), PAYOFF_OPEN_THREAD_SUSPENSE_AFTERMATH_VOID (heavy unresolvedClues debt → suspenseDelta), and PAYOFF_REVELATION_RELATIONSHIP_AFTERMATH_VOID (revelation != null → relationshipShifts).

Rules named in this wave's header:

- `PAYOFF_OPEN_THREAD_SUSPENSE_AFTERMATH_VOID`
- `PAYOFF_REVELATION_RELATIONSHIP_AFTERMATH_VOID`
- `PAYOFF_STAKES_CURIOSITY_AFTERMATH_VOID`

## Wave 972

Wave 972 additions: auditing the three remaining trio-complete signals in this pass, spanning three distinct classes: PAYOFF_CLOCK_ZONE_IMBALANCE (clockRaised boolean — whether a ticking clock is introduced at all), PAYOFF_CLOCK_DELTA_ZONE_IMBALANCE (clockDelta !== 0 — the numeric delta, distinct from the boolean field above), and PAYOFF_HIGHLIGHT_ZONE_IMBALANCE (dialogueHighlights array, distinct from all previously audited arrays in this pass).

Rules named in this wave's header:

- `PAYOFF_CLOCK_DELTA_ZONE_IMBALANCE`
- `PAYOFF_CLOCK_ZONE_IMBALANCE`
- `PAYOFF_HIGHLIGHT_ZONE_IMBALANCE`

## Wave 958

Wave 958 additions: continuing the non-purpose 4-zone rollout with three more trio-complete signals spanning three distinct classes: PAYOFF_CURIOSITY_ZONE_IMBALANCE (curiosityDelta > 0 — the question-raising delta beside Wave 944's suspense one), PAYOFF_REVELATION_ZONE_IMBALANCE (revelation != null — the revelation string field, distinct from the purpose-enum PAYOFF_REVELATION_PURPOSE one), and PAYOFF_TURN_ZONE_IMBALANCE (dramaticTurn !== 'nothing' — the dramatic-turn categorical signal).

Rules named in this wave's header:

- `PAYOFF_CURIOSITY_ZONE_IMBALANCE`
- `PAYOFF_REVELATION_ZONE_IMBALANCE`
- `PAYOFF_TURN_ZONE_IMBALANCE`

## Wave 944

Wave 944 additions: extending the checkZoneImbalance rollout to three more trio-complete signals spanning three distinct signal classes: PAYOFF_POSITIVE_EMOTION_ZONE_IMBALANCE (emotionalShift === 'positive', the positive-valence mirror of Wave 930's negative one), PAYOFF_SUSPENSE_ZONE_IMBALANCE (suspenseDelta > 0 — tension-delta magnitude), and PAYOFF_RELATIONSHIP_ZONE_IMBALANCE (relationshipShifts.length > 0 — relationship-shift array field).

Rules named in this wave's header:

- `PAYOFF_POSITIVE_EMOTION_ZONE_IMBALANCE`
- `PAYOFF_RELATIONSHIP_ZONE_IMBALANCE`
- `PAYOFF_SUSPENSE_ZONE_IMBALANCE`

## Wave 930

Wave 930 additions: continuing the checkZoneImbalance rollout, this wave applies the 4-zone bloat+empty-zone mode to three more signals that each already have a complete 3-zone/run-based trio but had never been audited by it: PAYOFF_STAKES_ZONE_IMBALANCE (purpose === 'raise_stakes'), PAYOFF_REVELATION_PURPOSE_ZONE_IMBALANCE (purpose === 'revelation', whose trio was completed in Wave 916), and PAYOFF_NEGATIVE_EMOTION_ZONE_IMBALANCE (emotionalShift === 'negative', a valence signal with a complete 3-zone/run trio).

Rules named in this wave's header:

- `PAYOFF_NEGATIVE_EMOTION_ZONE_IMBALANCE`
- `PAYOFF_REVELATION_PURPOSE_ZONE_IMBALANCE`
- `PAYOFF_STAKES_ZONE_IMBALANCE`

## Wave 916

Wave 916 additions: purpose === 'revelation' has never been referenced anywhere in this pass (the pre-existing PAYOFF_REVELATION_ZONE_CLUSTER/DROUGHT_RUN and related rules audit the separate revelation string|null field, not this purpose enum value) -- a genuinely virgin field. This wave adds PAYOFF_REVELATION_PURPOSE_ZONE_CLUSTER and PAYOFF_REVELATION_PURPOSE_DROUGHT_RUN (peak mode conventionally skipped for this categorical field), plus PAYOFF_CHARACTER_MOMENT_ZONE_IMBALANCE, continuing the checkZoneImbalance rollout: purpose === 'character_moment' already has a complete 3-zone/run-based trio but has never been audited by the 4-zone bloat+empty-zone mode.

Rules named in this wave's header:

- `PAYOFF_CHARACTER_MOMENT_ZONE_IMBALANCE`
- `PAYOFF_REVELATION_PURPOSE_DROUGHT_RUN`
- `PAYOFF_REVELATION_PURPOSE_ZONE_CLUSTER`

## Wave 902

Wave 902 additions: continuing the checkZoneImbalance rollout begun in Wave 888, this wave applies the 4-zone bloat+empty-zone mode to three more purpose values that each already have a complete 3-zone/run-based trio (checkZoneCluster + checkDroughtRun) but have never been audited by it: PAYOFF_TURNING_POINT_ZONE_IMBALANCE (purpose === 'turning_point'), PAYOFF_COMPLICATE_ZONE_IMBALANCE (purpose === 'complicate'), and PAYOFF_INTRODUCE_CONFLICT_ZONE_IMBALANCE (purpose === 'introduce_conflict').

Rules named in this wave's header:

- `PAYOFF_COMPLICATE_ZONE_IMBALANCE`
- `PAYOFF_INTRODUCE_CONFLICT_ZONE_IMBALANCE`
- `PAYOFF_TURNING_POINT_ZONE_IMBALANCE`

## Wave 888

Wave 888 additions: no purpose value had ever been audited by the distinct 4-zone checkZoneImbalance mode in this pass (only seededClueIds, visualBeats, unresolvedClues, and dialogueHighlights had). This wave applies it to three purpose values with complete 3-zone/run-based trios: PAYOFF_CLIMAX_ZONE_IMBALANCE (purpose === 'climax'), PAYOFF_ESTABLISH_WORLD_ZONE_IMBALANCE (purpose === 'establish_world'), and PAYOFF_RESOLUTION_ZONE_IMBALANCE (purpose === 'resolution' -- distinct from RESOLUTION_CRAMMED_AT_END/PAYOFF_POST_CLIMAX_CLUSTER, which audit payoffSetupIds temporal position rather than this purpose enum value).

Rules named in this wave's header:

- `PAYOFF_CLIMAX_ZONE_IMBALANCE`
- `PAYOFF_ESTABLISH_WORLD_ZONE_IMBALANCE`
- `PAYOFF_RESOLUTION_ZONE_IMBALANCE`

## Wave 874

Wave 874 additions: PAYOFF_RESOLUTION_DROUGHT_RUN (run-based x purpose === 'resolution' absence -- completes 2 of 3 slots for this purpose value alongside the zone-cluster mode added in Wave 860; distinct from RESOLUTION_CRAMMED_AT_END/PAYOFF_POST_CLIMAX_CLUSTER, which audit payoffSetupIds temporal position rather than sustained absence of this purpose value; peak mode conventionally skipped for this categorical field), PAYOFF_COMPLICATE_ZONE_CLUSTER (distribution/timing x purpose === 'complicate' x structural thirds -- this purpose value has never been referenced anywhere in this pass; a virgin field), PAYOFF_COMPLICATE_DROUGHT_RUN (run-based x purpose === 'complicate' absence -- completes 2 of 3 slots for this purpose value alongside the zone-cluster mode added in this same wave; peak mode conventionally skipped for this categorical field).

Rules named in this wave's header:

- `PAYOFF_COMPLICATE_DROUGHT_RUN`
- `PAYOFF_COMPLICATE_ZONE_CLUSTER`
- `PAYOFF_RESOLUTION_DROUGHT_RUN`

## Wave 860

Wave 860 additions: PAYOFF_CLIMAX_DROUGHT_RUN (run-based x purpose === 'climax' absence -- completes 2 of 3 slots for this purpose value alongside the zone-cluster mode added in Wave 846; peak mode conventionally skipped for this categorical field), PAYOFF_ESTABLISH_WORLD_DROUGHT_RUN (run-based x purpose === 'establish_world' absence -- completes 2 of 3 slots for this purpose value alongside the zone-cluster mode added in Wave 846; peak mode conventionally skipped for this categorical field), PAYOFF_RESOLUTION_ZONE_CLUSTER (distribution/timing x purpose === 'resolution' x structural thirds -- this purpose value is only ever touched by RESOLUTION_CRAMMED_AT_END and PAYOFF_POST_CLIMAX_CLUSTER, both of which audit the temporal position of payoffSetupIds resolution, not scenes whose `purpose` field equals 'resolution'; none of the three shared-library trio modes has ever isolated the purpose value itself as a standalone signal).

Rules named in this wave's header:

- `PAYOFF_CLIMAX_DROUGHT_RUN`
- `PAYOFF_ESTABLISH_WORLD_DROUGHT_RUN`
- `PAYOFF_POST_CLIMAX_CLUSTER`
- `PAYOFF_RESOLUTION_ZONE_CLUSTER`
- `RESOLUTION_CRAMMED_AT_END`

## Wave 846

Wave 846 additions: PAYOFF_POSITIVE_EMOTION_DROUGHT_RUN (run-based × emotionalShift === 'positive' absence — completes 2 of 3 slots for this valence alongside the zone-cluster mode added in Wave 832; peak mode conventionally skipped for this categorical field), PAYOFF_ESTABLISH_WORLD_ZONE_CLUSTER (distribution/timing × purpose === 'establish_world' × structural thirds — this purpose value has only ever appeared inside incidental function-concentration checks; none of the three shared-library trio modes has ever isolated it as its own standalone signal), PAYOFF_CLIMAX_ZONE_CLUSTER (distribution/timing × purpose === 'climax' × structural thirds — likewise only ever touched via an incidental `isClimaticScene` disjunction; a virgin standalone signal).

Rules named in this wave's header:

- `PAYOFF_CLIMAX_ZONE_CLUSTER`
- `PAYOFF_ESTABLISH_WORLD_ZONE_CLUSTER`
- `PAYOFF_POSITIVE_EMOTION_DROUGHT_RUN`

## Wave 832

Wave 832 additions: PAYOFF_INTRODUCE_CONFLICT_ZONE_CLUSTER (distribution/timing × purpose === 'introduce_conflict' × structural thirds — this purpose value has never been referenced anywhere in this pass; a virgin field), PAYOFF_INTRODUCE_CONFLICT_DROUGHT_RUN (run-based × purpose === 'introduce_conflict' absence — completing 2 of 3 slots for this purpose value alongside the zone-cluster mode added in this same wave; peak mode conventionally skipped for this categorical field), PAYOFF_POSITIVE_EMOTION_ZONE_CLUSTER (distribution/timing × emotionalShift === 'positive' × structural thirds — mirrors the completed negative-valence trio; the positive valence has never been isolated by any of the three shared-library trio modes in this pass).

Rules named in this wave's header:

- `PAYOFF_INTRODUCE_CONFLICT_DROUGHT_RUN`
- `PAYOFF_INTRODUCE_CONFLICT_ZONE_CLUSTER`
- `PAYOFF_POSITIVE_EMOTION_ZONE_CLUSTER`

## Wave 818

Wave 818 additions: PAYOFF_CHARACTER_MOMENT_DROUGHT_RUN (run-based × purpose === 'character_moment' absence — completing 2 of 3 slots for this purpose value alongside the zone-cluster mode added in Wave 804; peak mode conventionally skipped for this categorical field), PAYOFF_TURNING_POINT_ZONE_CLUSTER (distribution/timing × purpose === 'turning_point' × structural thirds — this purpose value has never been referenced anywhere in this pass; none of the three shared-library trio modes has ever been applied to it), PAYOFF_TURNING_POINT_DROUGHT_RUN (run-based × purpose === 'turning_point' absence — completing 2 of 3 slots for this purpose value alongside the zone-cluster mode added in this same wave; peak mode conventionally skipped for this categorical field).

Rules named in this wave's header:

- `PAYOFF_CHARACTER_MOMENT_DROUGHT_RUN`
- `PAYOFF_TURNING_POINT_DROUGHT_RUN`
- `PAYOFF_TURNING_POINT_ZONE_CLUSTER`

## Wave 804

Wave 804 additions: PAYOFF_SUSPENSE_PEAK_UNCAUSED (backward-cause × suspenseDelta-as-magnitude × 2-scene lookback — completes the trio for suspenseDelta alongside the zone-cluster mode (Wave 776) and the run-based drought mode (Wave 790); the backward-cause peak mode has never been applied to it), PAYOFF_REVELATION_PEAK_UNCAUSED (backward-cause × revelation-as-magnitude [0/1] × 2-scene lookback — completes the trio for revelation; hasCause deliberately omits revelation to avoid circularity), PAYOFF_CHARACTER_MOMENT_ZONE_CLUSTER (distribution/timing × purpose === 'character_moment' × structural thirds — this purpose value has never been referenced anywhere in this pass; none of the three shared-library trio modes has ever been applied to it). Reconnaissance for this wave also confirmed that SEED_DROUGHT_RUN (Wave 510, hand-rolled) already completes the seededClueIds trio, and PAYOFF_TEMPORAL_CLUSTER (Wave 496, hand-rolled) plus PAYOFF_DROUGHT_RUN (Wave 552, hand-rolled) already complete the payoffSetupIds trio, so both fields were correctly skipped as non-distinct candidates.

Rules named in this wave's header:

- `PAYOFF_CHARACTER_MOMENT_ZONE_CLUSTER`
- `PAYOFF_REVELATION_PEAK_UNCAUSED`
- `PAYOFF_SUSPENSE_PEAK_UNCAUSED`

## Wave 790

Wave 790 additions: PAYOFF_SUSPENSE_DROUGHT_RUN (run-based × suspenseDelta>0 absence — Wave 776 applied the zone-cluster mode to suspenseDelta; the run-based drought mode has never been applied to it, completing 2 of 3 slots), PAYOFF_REVELATION_ZONE_CLUSTER (distribution/timing × revelation × structural thirds — existing revelation checks are co-occurrence/decoupling and aftermath [PAYOFF_REVELATION_DISCONNECT, PAYOFF_REVELATION_AFTERMATH_ABSENT]; none of the three shared-library trio modes has ever been applied to it), PAYOFF_REVELATION_DROUGHT_RUN (run-based × revelation absence — completing 2 of 3 slots for revelation alongside the zone-cluster mode added in this same wave).

Rules named in this wave's header:

- `PAYOFF_REVELATION_DISCONNECT`
- `PAYOFF_REVELATION_DROUGHT_RUN`
- `PAYOFF_REVELATION_ZONE_CLUSTER`
- `PAYOFF_SUSPENSE_DROUGHT_RUN`

## Wave 776

Wave 776 additions: PAYOFF_CURIOSITY_PEAK_UNCAUSED (backward-cause × curiosityDelta-as-magnitude × 2-scene lookback — Wave 762 applied the run-based drought mode to curiosityDelta; the existing PAYOFF_CURIOSITY_PEAK_DECOUPLED audits whether a PAYOFF co-occurs AT the peak curiosity scene, not a preparing cause before it — the backward-cause peak mode has never been applied to curiosityDelta itself), PAYOFF_CURIOSITY_ZONE_CLUSTER (distribution/timing × curiosityDelta>0 presence × structural thirds — completing the trio for curiosityDelta; the zone-cluster mode has never been applied to it), PAYOFF_SUSPENSE_ZONE_CLUSTER (distribution/timing × suspenseDelta>0 presence × structural thirds — every existing suspense check in this pass is co-occurrence/decoupling or aftermath [PAYOFF_SUSPENSE_MISMATCH, PAYOFF_SUSPENSE_PEAK_DECOUPLED, PAYOFF_SUSPENSE_RECOIL_ABSENT, SEED_SUSPENSE_AFTERMATH_ABSENT]; none of the three shared-library trio modes has ever been applied to suspenseDelta as a primary signal).

Rules named in this wave's header:

- `PAYOFF_CURIOSITY_PEAK_DECOUPLED`
- `PAYOFF_CURIOSITY_PEAK_UNCAUSED`
- `PAYOFF_CURIOSITY_ZONE_CLUSTER`
- `PAYOFF_SUSPENSE_MISMATCH`
- `PAYOFF_SUSPENSE_PEAK_DECOUPLED`
- `PAYOFF_SUSPENSE_RECOIL_ABSENT`
- `PAYOFF_SUSPENSE_ZONE_CLUSTER`
- `SEED_SUSPENSE_AFTERMATH_ABSENT`

## Wave 762

Wave 762 additions: PAYOFF_CLOCK_ZONE_CLUSTER (distribution/timing × clockRaised === true × structural thirds — Wave 664 applied the run-based drought mode to clockRaised [PAYOFF_CLOCK_DROUGHT_RUN]; the zone-cluster mode has never been applied to it), PAYOFF_NEGATIVE_EMOTION_DROUGHT_RUN (run-based × emotionalShift === 'negative' absence — Wave 678 applied the zone-cluster mode to this signal [PAYOFF_NEGATIVE_EMOTION_ZONE_CLUSTER]; the drought-run mode has never been applied to it), PAYOFF_CURIOSITY_DROUGHT_RUN (run-based × curiosityDelta>0 absence — curiosityDelta has never anchored any of the three shared-library modes in this pass).

Rules named in this wave's header:

- `PAYOFF_CLOCK_ZONE_CLUSTER`
- `PAYOFF_CURIOSITY_DROUGHT_RUN`
- `PAYOFF_NEGATIVE_EMOTION_DROUGHT_RUN`

## Wave 748

Wave 748 additions: PAYOFF_CLOCK_DELTA_ZONE_CLUSTER (distribution/timing × clockDelta≠0 presence × structural thirds — Waves 678/734 applied the backward-cause peak and run-based drought modes to clockDelta; the zone-cluster mode has never been applied to it, completing the trio), PAYOFF_TURN_ZONE_CLUSTER (distribution/timing × dramaticTurn !== 'nothing' × structural thirds — Wave 678 applied the run-based drought mode to this signal [PAYOFF_TURN_DROUGHT_RUN]; the zone-cluster mode has never been applied to it), PAYOFF_STAKES_DROUGHT_RUN (run-based × purpose === 'raise_stakes' absence — Wave 692 applied the zone-cluster mode to this signal [PAYOFF_STAKES_ZONE_CLUSTER]; the drought-run mode has never been applied to it).

Rules named in this wave's header:

- `PAYOFF_CLOCK_DELTA_ZONE_CLUSTER`
- `PAYOFF_STAKES_DROUGHT_RUN`
- `PAYOFF_TURN_ZONE_CLUSTER`

## Wave 734

Wave 734 additions: PAYOFF_RELATIONSHIP_ZONE_CLUSTER (distribution/timing × relationshipShifts × structural thirds — Waves 664/720 applied the backward-cause peak and run-based drought modes to relationshipShifts; the zone-cluster mode has never been applied to it, completing the trio), PAYOFF_SEED_ZONE_CLUSTER (distribution/timing × seededClueIds × structural thirds — seededClueIds already anchors the hand-rolled SEED_DROUGHT_RUN [Wave 510] and the shared-library backward-cause peak mode [Wave 692]; the thirds-ratio zone-cluster mode has never been applied to it), PAYOFF_CLOCK_DELTA_DROUGHT_RUN (run-based × clockDelta≠0 absence — clockDelta has only ever anchored single-peak-isolation checks [PAYOFF_CLOCK_PEAK_DECOUPLED, Wave 566; PAYOFF_CLOCK_DELTA_PEAK_UNCAUSED, Wave 678]; the run-based drought mode has never been applied to it).

Rules named in this wave's header:

- `PAYOFF_CLOCK_DELTA_DROUGHT_RUN`
- `PAYOFF_RELATIONSHIP_ZONE_CLUSTER`
- `PAYOFF_SEED_ZONE_CLUSTER`

## Wave 720

Wave 720 additions (built on the shared checks library): PAYOFF_HIGHLIGHT_PEAK_UNCAUSED (single-peak isolation/backward-cause × dialogueHighlights magnitude — Waves 650/706 applied the drought-run and zone-cluster modes to dialogueHighlights; the backward-cause peak mode has never been applied to it, completing the trio), PAYOFF_OPEN_THREAD_DROUGHT_RUN (run-based × unresolvedClues absence — Waves 650/706 applied the zone-cluster and backward-cause peak modes to unresolvedClues; the drought-run mode has never been applied to it, completing the trio), PAYOFF_RELATIONSHIP_DROUGHT_RUN (run-based × relationshipShifts absence — Wave 664 applied the backward-cause peak mode to relationshipShifts; the drought-run mode has never been applied to it).

Rules named in this wave's header:

- `PAYOFF_HIGHLIGHT_PEAK_UNCAUSED`
- `PAYOFF_OPEN_THREAD_DROUGHT_RUN`
- `PAYOFF_RELATIONSHIP_DROUGHT_RUN`

## Wave 706

Wave 706 additions (built on the shared checks library): PAYOFF_STAGING_DROUGHT_RUN (run-based × visualBeats absence — Waves 650/664 applied the backward-cause peak and zone-cluster modes to visualBeats; the drought-run mode has never been applied to it, completing the trio), PAYOFF_HIGHLIGHT_ZONE_CLUSTER (distribution/timing × dialogueHighlights × structural thirds — Wave 650 applied the drought-run mode to dialogueHighlights; the zone-cluster mode has never been applied to it), PAYOFF_OPEN_THREAD_PEAK_UNCAUSED (single-peak isolation/backward-cause × unresolvedClues magnitude — Wave 650 applied the zone-cluster mode to unresolvedClues; the backward-cause peak mode has never been applied to it).

Rules named in this wave's header:

- `PAYOFF_HIGHLIGHT_ZONE_CLUSTER`
- `PAYOFF_OPEN_THREAD_PEAK_UNCAUSED`
- `PAYOFF_STAGING_DROUGHT_RUN`

## Wave 692

Wave 692 additions (built on the shared checks library): PAYOFF_SEED_PEAK_UNCAUSED (single-peak isolation/backward-cause × seededClueIds magnitude — Wave 594's SEED_STAGING_ZONE_IMBALANCE already four-zone-audits this channel's bloat/empty distribution; the backward-cause peak mode has never been applied to it), PAYOFF_SETUP_PEAK_UNCAUSED (single-peak isolation/backward-cause × payoffSetupIds magnitude — this pass's most heavily used field [37 accesses] anchors the hand-rolled PAYOFF_TEMPORAL_CLUSTER [distribution/timing] and PAYOFF_DROUGHT_RUN [run-based], but the backward-cause peak mode has never been applied to it), PAYOFF_STAKES_ZONE_CLUSTER (distribution/timing × purpose === 'raise_stakes' × structural thirds — `purpose` has only ever been used to tally counts inside unrelated aggregate checks [Waves 594a/594b]; never the standalone subject of its own check).

Rules named in this wave's header:

- `PAYOFF_SEED_PEAK_UNCAUSED`
- `PAYOFF_SETUP_PEAK_UNCAUSED`
- `PAYOFF_STAKES_ZONE_CLUSTER`

## Wave 678

Wave 678 additions (built on the shared checks library, audit M2.2): PAYOFF_CLOCK_DELTA_PEAK_UNCAUSED (single-peak isolation/backward-cause × clockDelta magnitude — distinct from the existing PAYOFF_CLOCK_PEAK_DECOUPLED [Wave 566], which checks whether the peak-clockDelta scene carries a payoff; this instead asks whether that scene is structurally caused by a dramatic turn or revelation), PAYOFF_TURN_DROUGHT_RUN (run-based × dramaticTurn presence absence — dramaticTurn anchors several decoupled and aftermath-absent checks here, but has never been drought-audited), PAYOFF_NEGATIVE_EMOTION_ZONE_CLUSTER (distribution/timing × emotionalShift === 'negative' × structural thirds — emotionalShift anchors PAYOFF_EMOTIONAL_VALENCE_UNIFORM and several decoupled checks, but has never been cluster-audited).

Rules named in this wave's header:

- `PAYOFF_CLOCK_DELTA_PEAK_UNCAUSED`
- `PAYOFF_CLOCK_PEAK_DECOUPLED`
- `PAYOFF_NEGATIVE_EMOTION_ZONE_CLUSTER`
- `PAYOFF_TURN_DROUGHT_RUN`

## Wave 664

Wave 664 additions (built on the shared checks library, audit M2.2): PAYOFF_RELATIONSHIP_PEAK_UNCAUSED (single-peak isolation/backward-cause × relationshipShifts-count magnitude — the scene with the most simultaneous bond changes has no dramatic turn or revelation in itself or the two scenes before it; distinct from PAYOFF_RELATIONSHIP_PEAK_DECOUPLED [Wave 412], which anchors on the scene with the single largest shift AMOUNT and checks whether it carries a payoff — a different magnitude metric and a different question entirely), PAYOFF_CLOCK_DROUGHT_RUN (run-based × clockRaised absence — this pass already drought-audits seed/payoff/highlight channels; clockRaised itself has never been drought-audited), PAYOFF_STAGING_ZONE_CLUSTER (distribution/timing × visualBeats × structural thirds — Wave 650 applied the zone-cluster mode to unresolvedClues; visualBeats itself has only been backward-cause peak-audited, never cluster-audited on the thirds granularity).

Rules named in this wave's header:

- `PAYOFF_CLOCK_DROUGHT_RUN`
- `PAYOFF_RELATIONSHIP_PEAK_DECOUPLED`
- `PAYOFF_RELATIONSHIP_PEAK_UNCAUSED`
- `PAYOFF_STAGING_ZONE_CLUSTER`

## Wave 650

Wave 650 additions (built on the shared checks library, audit M2.2): this 113-rule pass already hand-rolls the peak/drought/cluster analytical concepts extensively (five PEAK_*_DECOUPLED checks on curiosity/suspense/relationship/clock across the payoff and clue-seed channels, two drought-run checks on seed/payoff, two temporal-cluster checks on payoff/clue-seed) — but never via the shared checkPeakUncaused/checkDroughtRun/checkZoneCluster helpers, and never on the visualBeats/dialogueHighlights/unresolvedClues channels. PAYOFF_STAGING_PEAK_UNCAUSED (single-peak isolation/backward-cause × visualBeats magnitude — the scene with the densest physical staging has no dramatic turn or revelation in itself or the two scenes before it; distinct from the existing PEAK_*_DECOUPLED family, which checks whether the peak scene itself lacks a channel, not whether a physical-staging peak is backward-caused), PAYOFF_HIGHLIGHT_DROUGHT_RUN (run-based × dialogueHighlights absence — a 6+ consecutive-scene stretch with no highlighted dialogue while such scenes occur ≥3 times elsewhere; the drought-run template applied to a third channel after seed and payoff), PAYOFF_OPEN_THREAD_ZONE_CLUSTER (distribution/timing × unresolvedClues × structural thirds — >75% of open-thread scenes concentrate in one third; the first checkZoneCluster use in this pass, distinct from the hand-rolled PAYOFF_TEMPORAL_CLUSTER and CLUE_SEED_TEMPORAL_CLUSTER, which track different channels entirely).

Rules named in this wave's header:

- `PAYOFF_HIGHLIGHT_DROUGHT_RUN`
- `PAYOFF_OPEN_THREAD_ZONE_CLUSTER`
- `PAYOFF_STAGING_PEAK_UNCAUSED`

## Wave 636

Wave 636 additions (built on the shared checks library, audit M2.2): PAYOFF_HIGHLIGHT_OPEN_THREAD_DECOUPLED (co-occurrence/decoupling × dialogueHighlights × unresolvedClues — first pairing of these two fields in this 110-rule pass), PAYOFF_TURN_HIGHLIGHT_AFTERMATH_VOID (sequence/aftermath × dramaticTurn trigger → dialogueHighlights absence — first pairing of these two fields), PAYOFF_DIALOGUE_HIGHLIGHT_ZONE_IMBALANCE (underweight/bloat × dialogueHighlights × four structural zones — Waves 594/608/622 applied this template to seededClueIds, visualBeats, and unresolvedClues; dialogueHighlights itself has never been zone-audited here).

Rules named in this wave's header:

- `PAYOFF_DIALOGUE_HIGHLIGHT_ZONE_IMBALANCE`
- `PAYOFF_HIGHLIGHT_OPEN_THREAD_DECOUPLED`
- `PAYOFF_TURN_HIGHLIGHT_AFTERMATH_VOID`

## Wave 622

Wave 622 additions (built on the shared checks library, audit M2.2): VISUAL_BEAT_OPEN_THREAD_DECOUPLED (co-occurrence/decoupling × visualBeats × unresolvedClues — first pairing of these two fields in this 107-rule pass), CLOCK_STAGING_AFTERMATH_VOID (sequence/aftermath × clockRaised trigger → visualBeats absence — first pairing of these two fields), PAYOFF_OPEN_THREAD_ZONE_IMBALANCE (underweight/bloat × unresolvedClues × four structural zones — Waves 594/608 applied this template to seededClueIds and visualBeats; unresolvedClues itself has never been zone-audited here).

Rules named in this wave's header:

- `CLOCK_STAGING_AFTERMATH_VOID`
- `PAYOFF_OPEN_THREAD_ZONE_IMBALANCE`
- `VISUAL_BEAT_OPEN_THREAD_DECOUPLED`

## Wave 608

Wave 608 additions (built on the shared checks library, audit M2.2): PAYOFF_DIALOGUE_HIGHLIGHT_DECOUPLED (co-occurrence/decoupling × payoffSetupIds × dialogueHighlights — first use of dialogueHighlights anywhere in this 104-rule pass), VISUAL_STAGING_ZONE_IMBALANCE (underweight/bloat × visualBeats × four structural zones — first use of visualBeats anywhere in this pass), SEED_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID (sequence/aftermath × seed trigger → dialogueHighlights absence).

Rules named in this wave's header:

- `PAYOFF_DIALOGUE_HIGHLIGHT_DECOUPLED`
- `SEED_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID`
- `VISUAL_STAGING_ZONE_IMBALANCE`

## Wave 594

Wave 594 additions: seed purpose monotone (average/aggregate × seed × scene-purpose — n≥8, ≥4 seed scenes, >70% share the identical `purpose` value; clue-planting is confined to one narrative function rather than woven across varied structural beats; the `purpose` field — a fixed ScenePurpose enum — is used only once elsewhere in this entire file [an incidental OR-condition], making this the first dedicated purpose-distribution check here), payoff purpose monotone (the payoff-channel mirror of the above — >70% of payoff scenes share one purpose; distinct from SEED_PURPOSE_MONOTONE by channel, following this file's existing convention of mirrored seed/payoff pairs like SEED_DROUGHT_RUN/PAYOFF_DROUGHT_RUN and SEED_EMOTIONAL_VALENCE_UNIFORM/PAYOFF_EMOTIONAL_VALENCE_UNIFORM), clue seed zone imbalance (underweight/bloat × seed × four structural zones, built on checkZoneImbalance from the shared checks library — audit M2.2 — n≥10, ≥4 seed scenes; fires only when one zone has ZERO seeds while another holds ≥50% of the total; distinct from SETUP_CLUSTERING [a pure >70%-concentration ratio with no zero-zone requirement — a story could have seeds in every zone and still trip that check] and CLUE_SEED_TEMPORAL_CLUSTER [uses thirds, not quarters, and likewise has no void-zone requirement]; first check in this pass requiring the co-presence of a void AND a bloat rather than either alone).

Rules named in this wave's header:

- `CLUE_SEED_TEMPORAL_CLUSTER`
- `PAYOFF_DROUGHT_RUN`
- `SEED_EMOTIONAL_VALENCE_UNIFORM`
- `SEED_PURPOSE_MONOTONE`
- `SETUP_CLUSTERING`

## Wave 580

Wave 580 additions: seed opening zone absent (zone presence/absence × seed × opening third — n≥9, ≥4 seed scenes, none in opening structural third; setup act plants no foreshadowing; distinct from CLUE_SEED_FRONT_LOADED [too much early], CLUE_SEED_MIDPOINT_VOID [different zone], SEED_ACT3_VOID [closing zone]; first zone-absence check on the seed channel's opening zone), payoff seed decoupled (co-occurrence/decoupling × payoff × seed cross-channel — n≥8, ≥3 payoff and ≥3 seed scenes, no scene carries both simultaneously; distinct from PAYOFF_SEED_AFTERMATH_ABSENT [aftermath mode] and PAYOFF_AFTERMATH_QUESTION_VOID [also aftermath]; first same-scene co-occurrence check for the payoff × seed cross-channel pair), payoff consecutive valence run (run-based × payoff × emotional valence — n≥8, ≥4 payoff scenes, 3+ consecutive payoff scenes all with the same non-neutral emotionalShift; local monotone delivery stretch; distinct from PAYOFF_EMOTIONAL_VALENCE_UNIFORM [global — ALL payoffs share one sign] and PAYOFF_CONSECUTIVE_RUN [runs regardless of valence]; first run-based × valence check in payoff.ts).

Rules named in this wave's header:

- `PAYOFF_CONSECUTIVE_RUN`
- `SEED_ACT3_VOID`

## Wave 566

Wave 566 additions: payoff clock peak decoupled (single-peak isolation × clockDelta × payoff — n≥8, ≥2 payoff scenes, maxClockDelta>1, the single highest-clockDelta scene carries no payoff; the maximum-urgency moment is not where any thread resolves; adds the clock channel to the payoff peak-decoupled family alongside PAYOFF_SUSPENSE/CURIOSITY/RELATIONSHIP_PEAK_DECOUPLED, distinct from PAYOFF_CLOCK_DECOUPLED [co-occurrence aggregate] and PAYOFF_CLOCK_AFTERMATH_ABSENT [aftermath]), seed emotional valence uniform (valence × emotion × seed trigger — n≥8, ≥2 seed scenes carrying non-neutral emotion, all one valence; foreshadowing locked into a single feeling-tone; completes the valence family across both triggers [seed, payoff] and both channels [relationship, emotion], distinct from PAYOFF_EMOTIONAL_VALENCE_UNIFORM [payoff trigger], SEED_RELATIONSHIP_VALENCE_UNIFORM [relationship channel], SEED_EMOTION_AFTERMATH_ABSENT [aftermath], CLUE_SEED_EMOTION_FLAT [neutral not monotone]), clue seed temporal cluster (distribution/timing × seed × structural thirds — n≥9, ≥3 seed scenes, >75% in a single third; foreshadowing ghettoized into one zone; the seed-channel sibling of PAYOFF_TEMPORAL_CLUSTER, finer-grained than the binary CLUE_SEED_FRONT_LOADED / CLUE_SEED_LATE_MAJORITY and distinct from CLUE_SEED_MIDPOINT_VOID [absence not over-concentration]).

Rules named in this wave's header:

- `CLUE_SEED_EMOTION_FLAT`
- `CLUE_SEED_FRONT_LOADED`
- `CLUE_SEED_LATE_MAJORITY`
- `CLUE_SEED_MIDPOINT_VOID`
- `PAYOFF_EMOTIONAL_VALENCE_UNIFORM`
- `PAYOFF_TEMPORAL_CLUSTER`
- `SEED_EMOTION_AFTERMATH_ABSENT`
- `SEED_RELATIONSHIP_VALENCE_UNIFORM`

## Wave 552

Wave 552 additions: payoff drought run (run-based × payoff × consecutive absence — 5+ consecutive scenes with no payoff while ≥4 payoffs exist; the payoff-side mirror of SEED_DROUGHT_RUN which detects the same drought pattern on the seed trigger; distinct from SETUP_PAYOFF_DEAD_RUN which requires both seeds AND payoffs absent simultaneously), seed relationship valence uniform (valence × relationship × seed trigger — ≥2 seed scenes that each also move a relationship all have shifts of the same sign, so the clue-planting engine is relationally monotone; distinct from PAYOFF_RELATIONSHIP_VALENCE_UNIFORM which uses payoff trigger, and CLUE_SEED_RELATIONSHIP_DECOUPLED which fires when no overlap at all), payoff emotional valence uniform (valence × emotional × payoff trigger — ≥3 payoffs, ≥2 with non-neutral emotionalShift, all share one valence so resolutions only produce grief or only relief; distinct from PAYOFF_EMOTION_DECOUPLED which fires when ALL payoffs are emotionally neutral, and PAYOFF_RELATIONSHIP_VALENCE_UNIFORM which uses the relationship channel).

Rules named in this wave's header:

- `PAYOFF_RELATIONSHIP_VALENCE_UNIFORM`
- `SEED_DROUGHT_RUN`

## Wave 538

Wave 538 additions: payoff dramatic turn aftermath absent (sequence/aftermath × dramatic turn × payoff trigger — ≥3 qualifying payoffs none followed by a dramatic turn in next 2 scenes while ≥2 turn scenes exist; every delivery produces no pivot in its wake; completes the payoff-aftermath family with the dramatic-turn channel, distinct from PAYOFF_DRAMATIC_TURN_DECOUPLED which audits same-scene co-occurrence), seed relationship aftermath absent (sequence/aftermath × relationship × seed trigger — ≥3 qualifying seeds none followed by a relationship shift in next 2 scenes while ≥2 relational scenes exist; planted clues never strain bonds in their aftermath; adds the relationship channel to the seed-aftermath family, distinct from CLUE_SEED_RELATIONSHIP_DECOUPLED which audits same-scene co-occurrence), seed clock aftermath absent (sequence/aftermath × clock × seed trigger — ≥3 qualifying seeds none followed by clockRaised=true in next 2 scenes while ≥2 clock scenes exist; seeds and deadlines never compound; adds the clock channel to the seed-aftermath family, distinct from CLUE_SEED_CLOCK_DECOUPLED which audits same-scene co-occurrence).

Rules named in this wave's header:

- `CLUE_SEED_CLOCK_DECOUPLED`
- `CLUE_SEED_RELATIONSHIP_DECOUPLED`
- `PAYOFF_DRAMATIC_TURN_DECOUPLED`

## Wave 524

Wave 524 additions: seed suspense aftermath absent (sequence/aftermath × suspense × seed trigger — ≥3 qualifying seeds none followed by suspenseDelta>0 in next 2 scenes while ≥2 suspense scenes exist; planting clues never raises tension in what follows; adds suspense to the seed-aftermath family alongside curiosity/revelation/dramatic-turn; distinct from SEED_CURIOSITY_AFTERMATH_ABSENT, SEED_REVELATION_AFTERMATH_ABSENT, SEED_DRAMATIC_TURN_AFTERMATH_ABSENT, and the pacing-pass check CURIOSITY_AFTERMATH_FLAT which uses a high-suspense trigger), seed emotion aftermath absent (sequence/aftermath × emotion × seed trigger — ≥3 qualifying seeds none followed by non-neutral emotionalShift in next 2 scenes while ≥2 emotional scenes exist; clue-planting never generates felt consequence; adds emotion to seed-aftermath family; distinct from all other seed-aftermath checks which use different output channels), payoff relational aftermath absent (sequence/aftermath × relational shift × payoff trigger — ≥3 qualifying payoffs none followed by a relationship shift in next 2 scenes while ≥2 relational scenes exist; thread resolutions never move bonds in their wake; first relational-channel entry in the payoff-aftermath family, distinct from PAYOFF_REVELATION_AFTERMATH_ABSENT, PAYOFF_SEED_AFTERMATH_ABSENT, and PAYOFF_CLOCK_AFTERMATH_ABSENT which use different aftermath channels).

Rules named in this wave's header:

- `PAYOFF_CLOCK_AFTERMATH_ABSENT`
- `PAYOFF_REVELATION_AFTERMATH_ABSENT`
- `PAYOFF_SEED_AFTERMATH_ABSENT`
- `SEED_CURIOSITY_AFTERMATH_ABSENT`
- `SEED_DRAMATIC_TURN_AFTERMATH_ABSENT`
- `SEED_REVELATION_AFTERMATH_ABSENT`

## Wave 510

Wave 510 additions: seed revelation aftermath absent (sequence/aftermath × revelation × seed trigger — ≥3 qualifying seeds none followed by a revelation in next 2 scenes while ≥2 revelation scenes exist; adds the revelation channel to the seed-aftermath family, completing the five-channel family alongside suspense/emotional/curiosity/dramatic-turn channels), payoff seed aftermath absent (sequence/aftermath × seed × payoff trigger — ≥3 qualifying payoffs none followed by a clue seed in next 2 scenes while ≥2 seed scenes exist; first seed-channel entry in the payoff-aftermath family, distinct from PAYOFF_AFTERMATH_QUESTION_VOID which requires BOTH seed and curiosity absence), seed drought run (run-based × seed × consecutive absence — 5+ consecutive scenes with no seededClueIds while ≥3 seed scenes exist elsewhere; drought mirror of CLUE_SEED_CONSECUTIVE_RUN and more targeted than SETUP_PAYOFF_DEAD_RUN which requires both seeds and payoffs absent simultaneously).

Rules named in this wave's header:

- `CLUE_SEED_CONSECUTIVE_RUN`
- `SETUP_PAYOFF_DEAD_RUN`

## Wave 496

Wave 496 additions: payoff temporal cluster (distribution/timing × payoff × thirds — >75% of payoffs fall in one structural third while ≥4 exist; extends the distribution family beyond binary halves to thirds, fires when the middle or closing third dominates which PAYOFF_FRONT_LOADED/BACKLOADED cannot detect), seed dramatic turn aftermath absent (sequence/ aftermath × dramatic turn × seed trigger — ≥3 qualifying seeds none followed by a turn in the next 2 scenes while ≥2 turns exist; adds the dramatic-turn channel to the seed-aftermath family alongside suspense, emotional, and curiosity), payoff clock aftermath absent (sequence/ aftermath × clock × payoff trigger — ≥3 qualifying payoffs none followed by a clock raise in the next 2 scenes while ≥2 clock scenes exist; adds the clock channel to the payoff-aftermath family and is distinct from PAYOFF_CLOCK_DECOUPLED which audits same-scene co-occurrence).

Rules named in this wave's header:

- `PAYOFF_CLOCK_DECOUPLED`

## Wave 440

Wave 440 additions: payoff backloaded (>70% of payoffs in the second half while ≥3 exist — the distribution mirror of PAYOFF_FRONT_LOADED; the first half resolves nothing while the second half carries all closures; distribution/timing × underweight/bloat), payoff emotional recoil absent (no payoff scene is followed by a negative emotional shift within 2 scenes — resolutions never produce grief, loss, or emotional cost downstream; sequence/aftermath × negative-emotion channel, distinct from PAYOFF_AFTERMATH_QUESTION_VOID by channel and from PAYOFF_EMOTION_DECOUPLED which audits the payoff scene itself), payoff suspense recoil absent (no payoff scene is followed by a suspenseDelta > 0 within 2 scenes — resolutions never create new pressure downstream; sequence/aftermath × suspense channel, completing the aftermath-channel family alongside curiosity/seed and emotional recoil).

Rules named in this wave's header:

- `PAYOFF_AFTERMATH_QUESTION_VOID`
- `PAYOFF_EMOTION_DECOUPLED`
- `PAYOFF_FRONT_LOADED`

## Wave 426

Wave 426 additions: payoff aftermath question void (sequence/aftermath — every payoff scene is followed by two scenes that raise no curiosity and plant no new clue, so each resolution deflates the story instead of re-engaging it), payoff consecutive run (run-based — three or more consecutive scenes each fire a payoff, a "resolution avalanche" that dumps closures back-to-back with no rebuild between; distinct from CLUSTERED_PAYOFFS which counts many in ONE scene and THREAD_CONVERGENCE_ABSENT which is the opposite, payoffs in isolation), payoff relationship valence uniform (valence — when payoffs DO move bonds, every relational shift on a payoff scene shares one sign, so the resolution phase ruptures-only or repairs-only; distinct from PAYOFF_RELATIONSHIP_DECOUPLED, which fires when NO payoff moves a bond at all).

Rules named in this wave's header:

- `CLUSTERED_PAYOFFS`
- `THREAD_CONVERGENCE_ABSENT`

## Wave 412

Wave 412 additions: clue seed curiosity peak decoupled (the single highest-curiosity scene seeds no clue while seeds exist elsewhere — the seed-side mirror of payoff curiosity peak decoupled), clue seed suspense peak decoupled (the single highest-suspense scene seeds no clue while seeds exist elsewhere — the seed-side mirror of payoff suspense peak decoupled), payoff relationship peak decoupled (the single largest relational shift scene carries no payoff while payoffs exist elsewhere — single-peak isolation × relationship magnitude, distinct from the co-occurrence PAYOFF_RELATIONSHIP_DECOUPLED).

Rules named in this wave's header:

- `PAYOFF_RELATIONSHIP_DECOUPLED`

## Unattributed (no explicit wave-header mention)

These rule constants exist in this pass but were not found, by exact-name match, inside any "Wave N —" / "Wave N additions:" header entry in the file — typically because they predate that convention hardening, or the header describes the check descriptively rather than by constant name (e.g. "talking heads" rather than `TALKING_HEADS`). Listed here honestly rather than guessed into a wave, with the nearest preceding in-code "── section title ──" comment as the best-available substitute context where one exists.

- `ANTICIPATION_WINDOW_DECAY` — Wave 206: Setup burst, mid-story payoff void, clue drought
- `CLUE_DENSITY_FRONT_COLLAPSE` — Wave 289: CLUE_DENSITY_FRONT_COLLAPSE
- `CLUE_DROUGHT` — Wave 206: Setup burst, mid-story payoff void, clue drought
- `CLUE_GLUT` — Wave 181: Flat payoffs, clue glut, scrambled setup/payoff order
- `CLUE_REPLANT` — Wave 303: CLUE_REPLANT
- `CLUE_SEED_CAUSELESS` — Wave 454: PAYOFF_CAUSELESS, CLUE_SEED_CAUSELESS, CLUE_SEED_CONSECUTIVE_RUN
- `CLUE_SEED_CURIOSITY_FLAT` — Wave 328: PAYOFF_RELATIONSHIP_DECOUPLED, CLUE_SEED_CURIOSITY_FLAT, CLUE_SEED_EMOTION_FLAT
- `CLUE_SEED_CURIOSITY_PEAK_DECOUPLED` — Wave 412: CLUE_SEED_CURIOSITY_PEAK_DECOUPLED, CLUE_SEED_SUSPENSE_PEAK_DECOUPLED, PAYOFF_RELATIONSHIP_PEAK_DECOUPLED
- `CLUE_SEED_DRAMATIC_TURN_DECOUPLED` — Wave 356: CLUE_SEED_DRAMATIC_TURN_DECOUPLED, PAYOFF_CLOCK_DECOUPLED, LATE_CLUE_PLANT
- `CLUE_SEED_REVELATION_DECOUPLED` — Wave 398: CLUE_SEED_SUSPENSE_FLAT, PAYOFF_MIDPOINT_VOID, CLUE_SEED_REVELATION_DECOUPLED
- `CLUE_SEED_SUSPENSE_FLAT` — Wave 398: CLUE_SEED_SUSPENSE_FLAT, PAYOFF_MIDPOINT_VOID, CLUE_SEED_REVELATION_DECOUPLED
- `CLUE_SEED_SUSPENSE_PEAK_DECOUPLED` — Wave 412: CLUE_SEED_CURIOSITY_PEAK_DECOUPLED, CLUE_SEED_SUSPENSE_PEAK_DECOUPLED, PAYOFF_RELATIONSHIP_PEAK_DECOUPLED
- `CLUE_SEED_ZONE_IMBALANCE` — Wave 580:
- `CONCURRENT_THREAD_OVERLOAD` — Wave 206: Setup burst, mid-story payoff void, clue drought
- `DANGLING_PAYOFF` — Dangling payoffs (PAYOFF_SETUP with no matching clue ever seeded)
- `FLAT_PAYOFF` — Wave 181: Flat payoffs, clue glut, scrambled setup/payoff order
- `LATE_CLUE_PLANT` — Wave 356: CLUE_SEED_DRAMATIC_TURN_DECOUPLED, PAYOFF_CLOCK_DECOUPLED, LATE_CLUE_PLANT
- `MIDSTORY_PAYOFF_VOID` — Wave 206: Setup burst, mid-story payoff void, clue drought
- `NO_SETUPS` — No clues planted at all (no setup/payoff engine)
- `OPEN_CLUES_AT_END` — Open clue count in structure
- `ORPHAN_CLUE` — Orphan clues (never paid off)
- `PAYOFF_ACT2A_VOID` — Wave 275: Act 2a payoff void, late-majority clue seeding, setup/payoff act skew
- `PAYOFF_ACT3_ABSENT` — Wave 370: PAYOFF_CURIOSITY_PEAK_DECOUPLED, PAYOFF_ACT3_ABSENT, CLUE_SEED_MIDPOINT_VOID
- `PAYOFF_AFTERMATH_RELATIONSHIP_VOID` — Wave 482: SEED_CURIOSITY_AFTERMATH_ABSENT, SEED_ACT3_VOID, PAYOFF_AFTERMATH_RELATIONSHIP_VOID
- `PAYOFF_BACKLOADED` — Wave 440: PAYOFF_BACKLOADED, PAYOFF_EMOTIONAL_RECOIL_ABSENT, PAYOFF_SUSPENSE_RECOIL_ABSENT
- `PAYOFF_BEFORE_CLIMAX` — Wave 154: Clustered payoffs, premature resolution, setup imbalance
- `PAYOFF_BEFORE_SETUP` — Wave 167: Payoff-before-setup, setup clustering, payoff rate decline
- `PAYOFF_CAUSELESS` — Wave 454: PAYOFF_CAUSELESS, CLUE_SEED_CAUSELESS, CLUE_SEED_CONSECUTIVE_RUN
- `PAYOFF_CONSECUTIVE_VALENCE_RUN` — Wave 580:
- `PAYOFF_CURIOSITY_MISMATCH` — Wave 317: PAYOFF_EMOTION_DECOUPLED, UNRESOLVED_CLUE_RATIO_HIGH, PAYOFF_CURIOSITY_MISMATCH
- `PAYOFF_DOUBLE_FIRE` — Wave 303: PAYOFF_DOUBLE_FIRE
- `PAYOFF_DRAMATIC_TURN_AFTERMATH_ABSENT` — Wave 524 checks
- `PAYOFF_EMOTIONAL_RECOIL_ABSENT` — Wave 440: PAYOFF_BACKLOADED, PAYOFF_EMOTIONAL_RECOIL_ABSENT, PAYOFF_SUSPENSE_RECOIL_ABSENT
- `PAYOFF_GAP_EXCESSIVE` — Wave 261: Payoff precedes setup, payoff gap excessive, payoff front-loaded
- `PAYOFF_MEMORY_GAP` — Consequence-delayed payoff (Wave 140)
- `PAYOFF_MIDPOINT_VOID` — Wave 398: CLUE_SEED_SUSPENSE_FLAT, PAYOFF_MIDPOINT_VOID, CLUE_SEED_REVELATION_DECOUPLED
- `PAYOFF_ORPHAN_RATE` — Wave 233: Payoff orphan rate, post-climax cluster, gap uniformity
- `PAYOFF_PRECEDES_SETUP` — Wave 261: Payoff precedes setup, payoff gap excessive, payoff front-loaded
- `PAYOFF_PURPOSE_MONOTONE` — Wave 580:
- `PAYOFF_RATE_DECLINE` — Wave 167: Payoff-before-setup, setup clustering, payoff rate decline
- `PAYOFF_RELATIONAL_AFTERMATH_ABSENT` — Wave 524 checks
- `PAYOFF_SEED_DECOUPLED` — Wave 580:
- `PAYOFF_SINGLE_SCENE_DUMP` — Wave 247: Setup Act 3 surge, payoff single-scene dump, setup desert Act 2b
- `PAYOFF_TOO_QUICK` — Clue paid off too quickly (same scene or very next scene)
- `SEED_CLOCK_AFTERMATH_ABSENT` — Wave 524 checks
- `SEED_EMOTIONAL_AFTERMATH_ABSENT` — Wave 468: PAYOFF_REVELATION_AFTERMATH_ABSENT, SEED_SUSPENSE_AFTERMATH_ABSENT, SEED_EMOTIONAL_AFTERMATH_ABSENT
- `SEED_OPENING_ZONE_ABSENT` — Wave 580:
- `SEED_RELATIONSHIP_AFTERMATH_ABSENT` — Wave 524 checks
- `SETUP_ACT3_SURGE` — Wave 247: Setup Act 3 surge, payoff single-scene dump, setup desert Act 2b
- `SETUP_BURST` — Wave 206: Setup burst, mid-story payoff void, clue drought
- `SETUP_DESERT_ACT2B` — Wave 247: Setup Act 3 surge, payoff single-scene dump, setup desert Act 2b
- `SETUP_FRONT_GAP` — Wave 154: Clustered payoffs, premature resolution, setup imbalance
- `SETUP_PAYOFF_ACT_SKEW` — Wave 275: Act 2a payoff void, late-majority clue seeding, setup/payoff act skew
- `SETUP_PAYOFF_GAP_UNIFORMITY` — Wave 233: Payoff orphan rate, post-climax cluster, gap uniformity
- `SETUP_PAYOFF_ORDER_SCRAMBLED` — Wave 181: Flat payoffs, clue glut, scrambled setup/payoff order
- `SETUP_WITHOUT_CONSEQUENCE` — Setup without consequence (Wave 140)
- `UNRESOLVED_CLUE_RATIO_HIGH` — Wave 317: PAYOFF_EMOTION_DECOUPLED, UNRESOLVED_CLUE_RATIO_HIGH, PAYOFF_CURIOSITY_MISMATCH

