# Pass: `belief`

Founding wave: 39. Total distinct rules: 228 (163 attributed to a specific wave, 65 unattributed — see docs/rulebook/README.md's methodology note).

## Wave 1174

Wave 1174 additions: with all seven tracked triggers (raise_stakes, payoffSetupIds, seededClueIds, unresolvedClues-debt, revelation, clockRaised, dramaticTurn) fully saturated, this wave introduces suspenseDelta and emotionalShift as genuinely fresh checkAftermathVoid triggers — neither has ever anchored the isTrigger side of a check in this file. BELIEF_SUSPENSE_CURIOSITY_AFTERMATH_VOID and BELIEF_SUSPENSE_EMOTIONAL_AFTERMATH_VOID give suspenseDelta its first two channels (curiosityDelta, emotionalShift); BELIEF_EMOTION_CURIOSITY_AFTERMATH_VOID gives emotionalShift its first channel (curiosityDelta).

Rules named in this wave's header:

- `BELIEF_EMOTION_CURIOSITY_AFTERMATH_VOID`
- `BELIEF_SUSPENSE_CURIOSITY_AFTERMATH_VOID`
- `BELIEF_SUSPENSE_EMOTIONAL_AFTERMATH_VOID`

## Wave 1160

Wave 1160 additions: after Wave 1146, clockRaised was at five of six channels and dramaticTurn at four. BELIEF_CLOCK_STAGING_AFTERMATH_VOID gives clockRaised its sixth and final channel (visualBeats), completing full six-channel saturation for this trigger. BELIEF_TURN_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID and BELIEF_TURN_STAGING_AFTERMATH_VOID give dramaticTurn its fifth and sixth channels (dialogueHighlights, visualBeats), completing full six-channel saturation for both of this wave's tracked triggers.

Rules named in this wave's header:

- `BELIEF_CLOCK_STAGING_AFTERMATH_VOID`
- `BELIEF_TURN_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID`
- `BELIEF_TURN_STAGING_AFTERMATH_VOID`

## Wave 1146

Wave 1146 additions (opens rotation cycle 42): clockRaised was at four of six channels and dramaticTurn at two. BELIEF_CLOCK_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID gives clockRaised its fifth channel (dialogueHighlights); BELIEF_TURN_CURIOSITY_AFTERMATH_VOID and BELIEF_TURN_EMOTIONAL_AFTERMATH_VOID give dramaticTurn its third and fourth channels (curiosityDelta, emotionalShift).

Rules named in this wave's header:

- `BELIEF_CLOCK_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID`
- `BELIEF_TURN_CURIOSITY_AFTERMATH_VOID`
- `BELIEF_TURN_EMOTIONAL_AFTERMATH_VOID`

## Wave 1132

Wave 1132 additions: clockRaised was at two of six channels (curiosityDelta/suspenseDelta) and dramaticTurn at one (relationshipShifts). BELIEF_CLOCK_EMOTIONAL_AFTERMATH_VOID and BELIEF_CLOCK_RELATIONAL_AFTERMATH_VOID give clockRaised its third and fourth channels (emotionalShift, relationshipShifts); BELIEF_TURN_SUSPENSE_AFTERMATH_VOID gives dramaticTurn its second channel (suspenseDelta).

Rules named in this wave's header:

- `BELIEF_CLOCK_EMOTIONAL_AFTERMATH_VOID`
- `BELIEF_CLOCK_RELATIONAL_AFTERMATH_VOID`
- `BELIEF_TURN_SUSPENSE_AFTERMATH_VOID`

## Wave 1118

Wave 1118 additions: with all five main triggers fully saturated, this wave introduces two genuinely fresh sequence/aftermath triggers, both previously used in this file only via zone-imbalance/drought-run checks (isPresent), never as a checkAftermathVoid isTrigger or isAftermath: clockRaised (r.clockRaised === true) and dramaticTurn (non-'nothing'). BELIEF_CLOCK_CURIOSITY_AFTERMATH_VOID and BELIEF_CLOCK_SUSPENSE_AFTERMATH_VOID give clockRaised its first two consequence channels; BELIEF_TURN_RELATIONAL_AFTERMATH_VOID gives dramaticTurn its first channel.

Rules named in this wave's header:

- `BELIEF_CLOCK_CURIOSITY_AFTERMATH_VOID`
- `BELIEF_CLOCK_SUSPENSE_AFTERMATH_VOID`
- `BELIEF_TURN_RELATIONAL_AFTERMATH_VOID`

## Wave 1104

Wave 1104 additions: BELIEF_REVELATION_EMOTIONAL_AFTERMATH_VOID, BELIEF_REVELATION_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID, and BELIEF_REVELATION_STAGING_AFTERMATH_VOID give revelation its remaining three channels (emotionalShift, dialogueHighlights, visualBeats respectively), completing full six-channel saturation for all five of this pass's main triggers (raise_stakes, payoffSetupIds, seededClueIds, unresolvedClues-debt, revelation).

Rules named in this wave's header:

- `BELIEF_REVELATION_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID`
- `BELIEF_REVELATION_EMOTIONAL_AFTERMATH_VOID`
- `BELIEF_REVELATION_STAGING_AFTERMATH_VOID`

## Wave 1090

Wave 1090 additions: with all four of this pass's main triggers (raise_stakes, payoffSetupIds, seededClueIds, unresolvedClues-debt) now fully saturated, this wave introduces revelation (r.revelation != null) as a genuinely fresh sequence/aftermath trigger — never previously used in this file's checkAftermathVoid family, though revelation is heavily analyzed elsewhere via co-occurrence/decoupling (revelation curiosity decoupled, Wave 323; revelation suspense decoupled, Wave 295; revelation relationship decoupled, Wave 334 — all same-scene averages, not windowed aftermaths). BELIEF_REVELATION_CURIOSITY_AFTERMATH_VOID, BELIEF_REVELATION_SUSPENSE_AFTERMATH_VOID, and BELIEF_REVELATION_RELATIONAL_AFTERMATH_VOID give this fresh trigger its first three consequence channels.

Rules named in this wave's header:

- `BELIEF_REVELATION_CURIOSITY_AFTERMATH_VOID`
- `BELIEF_REVELATION_RELATIONAL_AFTERMATH_VOID`
- `BELIEF_REVELATION_SUSPENSE_AFTERMATH_VOID`

## Wave 1076

Wave 1076 additions: seededClueIds reaches full six-channel saturation — BELIEF_SEED_STAGING_AFTERMATH_VOID (previously paired with emotionalShift/suspenseDelta/relationshipShifts/ curiosityDelta/dialogueHighlights, now also paired with visualBeats — its only remaining standard channel). Heavy unresolvedClues debt gets its final two channels this wave too: BELIEF_OPEN_THREAD_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID (previously paired with curiosityDelta/ emotionalShift/relationshipShifts/suspenseDelta, now also paired with dialogueHighlights) and BELIEF_OPEN_THREAD_STAGING_AFTERMATH_VOID (now also paired with visualBeats), bringing this trigger to full six-channel saturation as well.

Rules named in this wave's header:

- `BELIEF_OPEN_THREAD_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID`
- `BELIEF_OPEN_THREAD_STAGING_AFTERMATH_VOID`
- `BELIEF_SEED_STAGING_AFTERMATH_VOID`

## Wave 1062

Wave 1062 additions: raise_stakes and payoffSetupIds each reach full six-channel saturation: BELIEF_STAKES_STAGING_AFTERMATH_VOID (raise_stakes, previously paired with relationshipShifts/ suspenseDelta/emotionalShift/curiosityDelta/dialogueHighlights, now also paired with visualBeats — its only remaining standard channel) and BELIEF_PAYOFF_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID (payoffSetupIds, previously paired with curiosityDelta/relationshipShifts/ emotionalShift/suspenseDelta/visualBeats, now also paired with dialogueHighlights — its only remaining standard channel). BELIEF_SEED_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID gives seededClueIds a fifth channel (previously paired with emotionalShift/suspenseDelta/relationshipShifts/ curiosityDelta, now also paired with dialogueHighlights).

Rules named in this wave's header:

- `BELIEF_PAYOFF_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID`
- `BELIEF_SEED_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID`
- `BELIEF_STAKES_STAGING_AFTERMATH_VOID`

## Wave 1048

Wave 1048 additions: with raise_stakes, payoffSetupIds, and seededClueIds all now at four channels each, this wave gives the heavy-unresolvedClues-debt trigger its fourth channel (BELIEF_OPEN_THREAD_SUSPENSE_AFTERMATH_VOID, paired with suspenseDelta) and extends two of the saturated triggers to a fifth channel using dialogueHighlights and visualBeats — fields that (per grep) have never been used as checkAftermathVoid consequence channels anywhere in this pass: BELIEF_STAKES_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID (raise_stakes) and BELIEF_PAYOFF_STAGING_AFTERMATH_VOID (payoffSetupIds).

Rules named in this wave's header:

- `BELIEF_OPEN_THREAD_SUSPENSE_AFTERMATH_VOID`
- `BELIEF_PAYOFF_STAGING_AFTERMATH_VOID`
- `BELIEF_STAKES_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID`

## Wave 1034

Wave 1034 additions: with raise_stakes and payoffSetupIds now at four channels each, this wave targets the two less-saturated triggers instead: BELIEF_SEED_CURIOSITY_AFTERMATH_VOID (seededClueIds, previously paired with emotionalShift/suspenseDelta/relationshipShifts, now a fourth channel with curiosityDelta), and two fresh channels for the heavy-unresolvedClues-debt trigger (threshold ≥3, previously only paired with curiosityDelta): BELIEF_OPEN_THREAD_EMOTIONAL_AFTERMATH_VOID (paired with emotionalShift) and BELIEF_OPEN_THREAD_RELATIONAL_AFTERMATH_VOID (paired with relationshipShifts).

Rules named in this wave's header:

- `BELIEF_OPEN_THREAD_EMOTIONAL_AFTERMATH_VOID`
- `BELIEF_OPEN_THREAD_RELATIONAL_AFTERMATH_VOID`
- `BELIEF_SEED_CURIOSITY_AFTERMATH_VOID`

## Wave 1020

Wave 1020 additions: three more fresh channels for existing triggers: BELIEF_STAKES_CURIOSITY_AFTERMATH_VOID (raise_stakes, previously paired with relationshipShifts/suspenseDelta/ emotionalShift, now a fourth channel with curiosityDelta), BELIEF_PAYOFF_SUSPENSE_AFTERMATH_VOID (payoffSetupIds, previously paired with curiosityDelta/relationshipShifts/emotionalShift, now a fourth channel with suspenseDelta), and BELIEF_SEED_RELATIONAL_AFTERMATH_VOID (seededClueIds, previously paired with emotionalShift/suspenseDelta, now a third channel with relationshipShifts).

Rules named in this wave's header:

- `BELIEF_PAYOFF_SUSPENSE_AFTERMATH_VOID`
- `BELIEF_SEED_RELATIONAL_AFTERMATH_VOID`
- `BELIEF_STAKES_CURIOSITY_AFTERMATH_VOID`

## Wave 1006

Wave 1006 additions: this pass's aftermath-void family is now large enough that every existing trigger has at least one channel — this wave gives three of them a genuinely fresh third/second channel: BELIEF_STAKES_EMOTIONAL_AFTERMATH_VOID (raise_stakes, previously paired with relationshipShifts and suspenseDelta, now paired with emotionalShift), BELIEF_SEED_SUSPENSE_AFTERMATH_VOID (seededClueIds, previously only paired with emotionalShift, now paired with suspenseDelta), and BELIEF_PAYOFF_EMOTIONAL_AFTERMATH_VOID (payoffSetupIds, previously paired with curiosityDelta and relationshipShifts, now paired with emotionalShift).

Rules named in this wave's header:

- `BELIEF_PAYOFF_EMOTIONAL_AFTERMATH_VOID`
- `BELIEF_SEED_SUSPENSE_AFTERMATH_VOID`
- `BELIEF_STAKES_EMOTIONAL_AFTERMATH_VOID`

## Wave 992

Wave 992 additions: BELIEF_CLOCK_DELTA was checked as a zone-imbalance candidate and excluded — its cluster rule audits clockDelta > 0 while its drought rule audits clockDelta !== 0, an inconsistent pair auditing not-quite-the-same signal (same class of issue as the STAGING >=2-vs->0 mismatch elsewhere in this rotation). With zone-imbalance still exhausted, this wave adds three more aftermath-void pairings, none reusing a channel from the ~14 existing rules or from Wave 978: BELIEF_STAKES_SUSPENSE_AFTERMATH_VOID (raise_stakes → suspenseDelta, first use of suspenseDelta as a checkAftermathVoid channel in this pass), BELIEF_PAYOFF_RELATIONSHIP_AFTERMATH_VOID (payoffSetupIds → relationshipShifts, first pairing of payoff with relational consequence), and BELIEF_OPEN_THREAD_CURIOSITY_AFTERMATH_VOID (heavy unresolvedClues debt, threshold ≥3 distinct from CLUE_DEBT_CLOCK's >0 threshold, → curiosityDelta).

Rules named in this wave's header:

- `BELIEF_OPEN_THREAD_CURIOSITY_AFTERMATH_VOID`
- `BELIEF_PAYOFF_RELATIONSHIP_AFTERMATH_VOID`
- `BELIEF_STAKES_SUSPENSE_AFTERMATH_VOID`

## Wave 978

Wave 978 additions: with the zone-imbalance mode now exhausted for this pass, pivots to the sequence/aftermath mode via checkAftermathVoid, adding three trigger→aftermath pairings that use trigger signals (raise_stakes purpose, payoffSetupIds, seededClueIds) absent from the pass's ~14 existing aftermath-void rules (built around assertion/revelation/turn/clue-debt triggers): BELIEF_STAKES_RELATIONSHIP_AFTERMATH_VOID (raise_stakes → relational), BELIEF_PAYOFF_CURIOSITY_AFTERMATH_VOID (payoff → curiosity), and BELIEF_SEED_EMOTIONAL_AFTERMATH_VOID (seed → emotional).

Rules named in this wave's header:

- `BELIEF_PAYOFF_CURIOSITY_AFTERMATH_VOID`
- `BELIEF_SEED_EMOTIONAL_AFTERMATH_VOID`
- `BELIEF_STAKES_RELATIONSHIP_AFTERMATH_VOID`

## Wave 964

Wave 964 additions: auditing the three remaining trio-complete signals in this pass, spanning two more distinct array fields and one categorical: BELIEF_HIGHLIGHT_ZONE_IMBALANCE (dialogueHighlights array), BELIEF_RELATIONSHIP_ZONE_IMBALANCE (relationshipShifts array), and BELIEF_TURN_ZONE_IMBALANCE (dramaticTurn !== 'nothing' categorical) — the highlight and relationship arrays are distinct from all previously audited belief arrays (payoff/open-thread/seed/staging).

Rules named in this wave's header:

- `BELIEF_HIGHLIGHT_ZONE_IMBALANCE`
- `BELIEF_RELATIONSHIP_ZONE_IMBALANCE`
- `BELIEF_TURN_ZONE_IMBALANCE`

## Wave 950

Wave 950 additions: with belief's valence and delta signals now saturated by the 4-zone mode, this wave audits three distinct array-field signals whose 3-zone/run trios were long complete but never 4-zone-audited: BELIEF_PAYOFF_ZONE_IMBALANCE (payoffSetupIds), BELIEF_OPEN_THREAD_ZONE_IMBALANCE (unresolvedClues), and BELIEF_SEED_ZONE_IMBALANCE (seededClueIds) — three genuinely different arrays (setups-paid, questions-open, clues-planted), all distinct from the visualBeats BELIEF_STAGING one.

Rules named in this wave's header:

- `BELIEF_OPEN_THREAD_ZONE_IMBALANCE`
- `BELIEF_PAYOFF_ZONE_IMBALANCE`
- `BELIEF_SEED_ZONE_IMBALANCE`

## Wave 936

Wave 936 additions: continuing the checkZoneImbalance rollout, this wave extends the 4-zone mode to three more signals that each already have a complete 3-zone/run-based trio but had never been audited by it: BELIEF_POSITIVE_EMOTION_ZONE_IMBALANCE (emotionalShift === 'positive'), BELIEF_SUSPENSE_ZONE_IMBALANCE (suspenseDelta > 0), and BELIEF_CURIOSITY_ZONE_IMBALANCE (curiosityDelta > 0).

Rules named in this wave's header:

- `BELIEF_CURIOSITY_ZONE_IMBALANCE`
- `BELIEF_POSITIVE_EMOTION_ZONE_IMBALANCE`
- `BELIEF_SUSPENSE_ZONE_IMBALANCE`

## Wave 922

Wave 922 additions: continuing the checkZoneImbalance rollout, this wave applies the 4-zone bloat+empty-zone mode to three more signals that each already have a complete 3-zone/run-based trio but had never been audited by it: BELIEF_STAKES_ZONE_IMBALANCE (purpose === 'raise_stakes'), BELIEF_REVELATION_PURPOSE_ZONE_IMBALANCE (purpose === 'revelation', whose trio was completed in Wave 908), and BELIEF_NEGATIVE_EMOTION_ZONE_IMBALANCE (emotionalShift === 'negative', a valence signal with a complete 3-zone/run trio).

Rules named in this wave's header:

- `BELIEF_NEGATIVE_EMOTION_ZONE_IMBALANCE`
- `BELIEF_REVELATION_PURPOSE_ZONE_IMBALANCE`
- `BELIEF_STAKES_ZONE_IMBALANCE`

## Wave 908

Wave 908 additions: purpose === 'revelation' has never been isolated as its own standalone signal in this pass (only the separate revelation-as-magnitude field is audited, by BELIEF_REVELATION_PEAK_UNCAUSED) -- a genuinely virgin purpose value. This wave adds BELIEF_REVELATION_PURPOSE_ZONE_CLUSTER and BELIEF_REVELATION_PURPOSE_DROUGHT_RUN (peak mode conventionally skipped for this categorical field), plus BELIEF_COMPLICATE_ZONE_IMBALANCE, continuing the checkZoneImbalance rollout: purpose === 'complicate' already has a complete 3-zone/run-based trio but has never been audited by the 4-zone bloat+empty-zone mode.

Rules named in this wave's header:

- `BELIEF_COMPLICATE_ZONE_IMBALANCE`
- `BELIEF_REVELATION_PURPOSE_DROUGHT_RUN`
- `BELIEF_REVELATION_PURPOSE_ZONE_CLUSTER`

## Wave 894

Wave 894 additions: BELIEF_COMPLICATE_DROUGHT_RUN (run-based x purpose === 'complicate' absence -- completes 2 of 3 slots for this purpose value alongside the zone-cluster mode added in Wave 852; peak mode conventionally skipped for this categorical field). Continuing the checkZoneImbalance rollout from Wave 880, this wave applies the 4-zone bloat+empty-zone mode to two more purpose values with complete 3-zone/run-based trios: BELIEF_TURNING_POINT_ZONE_IMBALANCE (purpose === 'turning_point') and BELIEF_INTRODUCE_CONFLICT_ZONE_IMBALANCE (purpose === 'introduce_conflict').

Rules named in this wave's header:

- `BELIEF_COMPLICATE_DROUGHT_RUN`
- `BELIEF_INTRODUCE_CONFLICT_ZONE_IMBALANCE`
- `BELIEF_TURNING_POINT_ZONE_IMBALANCE`

## Wave 880

Wave 880 additions: with climax, establish_world, and resolution now all trio-complete via checkDroughtRun/checkZoneCluster, this wave applies the distinct 4-zone checkZoneImbalance mode (act-based buckets, fires on an empty zone plus a >=50%-share bloat zone -- categorically different from checkZoneCluster's 3-zone >75%-concentration test) to those same three purpose values, which have never been audited by it: BELIEF_CLIMAX_ZONE_IMBALANCE (purpose === 'climax'), BELIEF_ESTABLISH_WORLD_ZONE_IMBALANCE (purpose === 'establish_world'), and BELIEF_RESOLUTION_ZONE_IMBALANCE (purpose === 'resolution' -- distinct from the pre-existing BELIEF_RESOLUTION_ABSENT, which audits witnessed-revelation timing rather than this purpose enum value). Only unresolvedClues, visualBeats, and character_moment had ever been audited by this analytical mode before this wave.

Rules named in this wave's header:

- `BELIEF_CLIMAX_ZONE_IMBALANCE`
- `BELIEF_ESTABLISH_WORLD_ZONE_IMBALANCE`
- `BELIEF_RESOLUTION_ZONE_IMBALANCE`

## Wave 866

Wave 866 additions: BELIEF_ESTABLISH_WORLD_DROUGHT_RUN (run-based x purpose === 'establish_world' absence -- completes 2 of 3 slots for this purpose value alongside the zone-cluster mode added in Wave 838; peak mode conventionally skipped for this categorical field), BELIEF_CLIMAX_DROUGHT_RUN (run-based x purpose === 'climax' absence -- completes 2 of 3 slots for this purpose value alongside the zone-cluster mode added in Wave 852; peak mode conventionally skipped for this categorical field), BELIEF_RESOLUTION_DROUGHT_RUN (run-based x purpose === 'resolution' absence -- completes 2 of 3 slots for this purpose value alongside the zone-cluster mode added in Wave 852; distinct from the pre-existing BELIEF_RESOLUTION_ABSENT, which audits witnessed-revelation timing rather than the purpose field; peak mode conventionally skipped for this categorical field).

Rules named in this wave's header:

- `BELIEF_CLIMAX_DROUGHT_RUN`
- `BELIEF_ESTABLISH_WORLD_DROUGHT_RUN`
- `BELIEF_RESOLUTION_ABSENT`
- `BELIEF_RESOLUTION_DROUGHT_RUN`

## Wave 852

Wave 852 additions: BELIEF_CLIMAX_ZONE_CLUSTER (distribution/timing × purpose === 'climax' × structural thirds — this purpose value has never been referenced anywhere in this pass; a virgin field), BELIEF_RESOLUTION_ZONE_CLUSTER (distribution/timing × purpose === 'resolution' × structural thirds — likewise a virgin field, never referenced in this pass before), BELIEF_COMPLICATE_ZONE_CLUSTER (distribution/timing × purpose === 'complicate' × structural thirds — also a virgin field, never referenced in this pass before).

Rules named in this wave's header:

- `BELIEF_CLIMAX_ZONE_CLUSTER`
- `BELIEF_COMPLICATE_ZONE_CLUSTER`
- `BELIEF_RESOLUTION_ZONE_CLUSTER`

## Wave 838

Wave 838 additions: BELIEF_INTRODUCE_CONFLICT_DROUGHT_RUN (run-based × purpose === 'introduce_conflict' absence — completes 2 of 3 slots for this purpose value alongside the zone-cluster mode added in Wave 824; peak mode conventionally skipped for this categorical field), BELIEF_POSITIVE_EMOTION_DROUGHT_RUN (run-based × emotionalShift === 'positive' absence — completes 2 of 3 slots for this valence alongside the zone-cluster mode added in Wave 824; peak mode conventionally skipped for this categorical field), BELIEF_ESTABLISH_WORLD_ZONE_CLUSTER (distribution/timing × purpose === 'establish_world' × structural thirds — this purpose value has never been referenced anywhere in this pass; a virgin field).

Rules named in this wave's header:

- `BELIEF_ESTABLISH_WORLD_ZONE_CLUSTER`
- `BELIEF_INTRODUCE_CONFLICT_DROUGHT_RUN`
- `BELIEF_POSITIVE_EMOTION_DROUGHT_RUN`

## Wave 824

Wave 824 additions: BELIEF_TURNING_POINT_DROUGHT_RUN (run-based × purpose === 'turning_point' absence — completes 2 of 3 slots for this purpose value alongside the zone-cluster mode added in Wave 810; peak mode conventionally skipped for this categorical field), BELIEF_INTRODUCE_CONFLICT_ZONE_CLUSTER (distribution/timing × purpose === 'introduce_conflict' × structural thirds — this purpose value has never been referenced anywhere in this pass; a virgin field), BELIEF_POSITIVE_EMOTION_ZONE_CLUSTER (distribution/timing × emotionalShift === 'positive' × structural thirds — the positive valence has only ever appeared inside co-occurrence checks like ASSERTION_POSITIVE_DECOUPLED; none of the three shared-library trio modes has ever isolated this valence on its own, mirroring the negative-valence trio completed in Wave 796).

Rules named in this wave's header:

- `ASSERTION_POSITIVE_DECOUPLED`
- `BELIEF_INTRODUCE_CONFLICT_ZONE_CLUSTER`
- `BELIEF_POSITIVE_EMOTION_ZONE_CLUSTER`
- `BELIEF_TURNING_POINT_DROUGHT_RUN`

## Wave 810

Wave 810 additions: BELIEF_STAKES_ZONE_CLUSTER (distribution/timing × purpose === 'raise_stakes' × structural thirds — this purpose value has never been referenced anywhere in this pass; none of the three shared-library trio modes has ever been applied to it), BELIEF_STAKES_DROUGHT_RUN (run-based × purpose === 'raise_stakes' absence — completing 2 of 3 slots for this purpose value alongside the zone-cluster mode added in this same wave; peak mode conventionally skipped for this categorical field), BELIEF_TURNING_POINT_ZONE_CLUSTER (distribution/timing × purpose === 'turning_point' × structural thirds — this purpose value has never been referenced anywhere in this pass either; none of the three shared-library trio modes has ever been applied to it).

Rules named in this wave's header:

- `BELIEF_STAKES_DROUGHT_RUN`
- `BELIEF_STAKES_ZONE_CLUSTER`
- `BELIEF_TURNING_POINT_ZONE_CLUSTER`

## Wave 796

Wave 796 additions: BELIEF_REVELATION_PEAK_UNCAUSED (backward-cause × revelation-as-magnitude [0/1] × 2-scene lookback, anchored on the FIRST revelation scene, hasCause referencing only dramaticTurn — distinct from REVELATION_UNPREPARED_CLIMAX (Wave 432), which anchors on the LAST revelation and looks for a prior character ASSERTION rather than a dramatic turn; distinct from REVELATION_DROUGHT (Wave 446, a true hand-rolled equivalent of checkDroughtRun already covering the run-based mode) and REVELATION_TEMPORAL_CLUSTER (Wave 488, a true hand-rolled equivalent of checkZoneCluster already covering the distribution/timing mode) — this is the only one of the three shared-library trio modes that has never been hand-rolled for revelation in this pass), BELIEF_NEGATIVE_EMOTION_ZONE_CLUSTER (distribution/timing × emotionalShift='negative' × structural thirds — every existing negative-emotion check in this pass couples it to a revelation or assertion scene [REVELATION_EMOTIONAL_MONOTONE, REVELATION_EMOTIONAL_AFTERMATH_FLAT, ASSERTION_EMOTIONAL_AFTERMATH_FLAT]; the shared-library cluster mode on emotionalShift as a standalone global signal has never been applied), BELIEF_NEGATIVE_EMOTION_DROUGHT_RUN (run-based × emotionalShift='negative' absence — completing 2 of 3 trio slots for emotionalShift alongside the zone-cluster mode added in this same wave; the peak mode is conventionally skipped for this categorical field).

Rules named in this wave's header:

- `ASSERTION_EMOTIONAL_AFTERMATH_FLAT`
- `BELIEF_NEGATIVE_EMOTION_DROUGHT_RUN`
- `BELIEF_NEGATIVE_EMOTION_ZONE_CLUSTER`
- `BELIEF_REVELATION_PEAK_UNCAUSED`
- `REVELATION_DROUGHT`
- `REVELATION_EMOTIONAL_MONOTONE`
- `REVELATION_UNPREPARED_CLIMAX`

## Wave 782

Wave 782 additions: BELIEF_CURIOSITY_ZONE_CLUSTER (distribution/timing × curiosityDelta>0 presence × structural thirds — Wave 642 applied the run-based drought mode to curiosityDelta; the zone-cluster mode has never been applied to it), BELIEF_CURIOSITY_PEAK_UNCAUSED (backward-cause × curiosityDelta-as-magnitude × 2-scene lookback — the existing REVELATION_CURIOSITY_PEAK_ABSENT/TOLD_BELIEF_CURIOSITY_PEAK_ABSENT audit co-occurrence AT the peak curiosity scene, and REVELATION_CURIOSITY_PEAK_EARLY audits a fixed early-quarter zone; none looks backward from the peak for a preparing cause, so the shared-library backward-cause mode has never been applied to curiosityDelta, completing the trio), BELIEF_CLOCK_RAISED_ZONE_CLUSTER (distribution/timing × clockRaised === true presence × structural thirds — Wave 642 applied the run-based drought mode to clockRaised; the zone-cluster mode has never been applied to it).

Rules named in this wave's header:

- `BELIEF_CLOCK_RAISED_ZONE_CLUSTER`
- `BELIEF_CURIOSITY_PEAK_UNCAUSED`
- `BELIEF_CURIOSITY_ZONE_CLUSTER`
- `REVELATION_CURIOSITY_PEAK_EARLY`
- `TOLD_BELIEF_CURIOSITY_PEAK_ABSENT`

## Wave 768

Wave 768 additions: BELIEF_RELATIONSHIP_ZONE_CLUSTER (distribution/timing × relationshipShifts presence × structural thirds — Waves 670/754 applied the run-based drought and backward-cause peak modes to relationshipShifts; the zone-cluster mode has never been applied to it, completing the trio), BELIEF_CHARACTER_MOMENT_DROUGHT_RUN (run-based × purpose === 'character_moment' absence — Wave 684 applied the zone-cluster mode to this signal; the drought-run mode has never been applied to it), BELIEF_SUSPENSE_DROUGHT_RUN (run-based × suspenseDelta>0 absence — Waves 684/754 applied the backward-cause peak and zone-cluster modes to suspenseDelta; the drought-run mode has never been applied to it, completing the trio).

Rules named in this wave's header:

- `BELIEF_CHARACTER_MOMENT_DROUGHT_RUN`
- `BELIEF_RELATIONSHIP_ZONE_CLUSTER`
- `BELIEF_SUSPENSE_DROUGHT_RUN`

## Wave 754

Wave 754 additions: BELIEF_RELATIONSHIP_PEAK_UNCAUSED (single-peak isolation/backward-cause × relationshipShifts magnitude — Wave 670 applied the run-based drought mode to relationshipShifts; the backward-cause peak mode has never been applied to it), BELIEF_TURN_DROUGHT_RUN (run-based × dramaticTurn !== 'nothing' absence — Wave 670 applied the zone-cluster mode to this signal; the drought-run mode has never been applied to it), BELIEF_SUSPENSE_ZONE_CLUSTER (distribution/timing × suspenseDelta>0 presence × structural thirds — Wave 684 applied the backward-cause peak mode to suspenseDelta; the zone-cluster mode has never been applied to it).

Rules named in this wave's header:

- `BELIEF_RELATIONSHIP_PEAK_UNCAUSED`
- `BELIEF_SUSPENSE_ZONE_CLUSTER`
- `BELIEF_TURN_DROUGHT_RUN`

## Wave 740

Wave 740 additions: BELIEF_CLOCK_DELTA_DROUGHT_RUN (run-based × clockDelta≠0 absence — Waves 628/726 applied the backward-cause peak and zone-cluster modes to clockDelta; the drought-run mode has never been applied to it, completing the trio), BELIEF_OPEN_THREAD_PEAK_UNCAUSED (single-peak isolation/backward-cause × unresolvedClues magnitude — Waves 642/726 applied the run-based drought and zone-cluster modes to unresolvedClues; the backward-cause peak mode has never been applied to it, completing the trio), BELIEF_STAGING_DROUGHT_RUN (run-based × visualBeats absence — Waves 642/726 applied the zone-cluster and backward-cause peak modes to visualBeats; the drought-run mode has never been applied to it, completing the trio).

Rules named in this wave's header:

- `BELIEF_CLOCK_DELTA_DROUGHT_RUN`
- `BELIEF_OPEN_THREAD_PEAK_UNCAUSED`
- `BELIEF_STAGING_DROUGHT_RUN`

## Wave 726

Wave 726 additions: BELIEF_CLOCK_DELTA_ZONE_CLUSTER (distribution/timing × clockDelta>0 presence × structural thirds — Wave 628 applied the backward-cause peak mode to clockDelta; the zone-cluster mode has never been applied to it), BELIEF_STAGING_PEAK_UNCAUSED (single-peak isolation/backward-cause × visualBeats magnitude — Wave 642 applied the zone-cluster mode to visualBeats; the backward-cause peak mode has never been applied to it), BELIEF_OPEN_THREAD_ZONE_CLUSTER (distribution/timing × unresolvedClues × structural thirds — Wave 642 applied the run-based drought mode to unresolvedClues; the zone-cluster mode has never been applied to it).

Rules named in this wave's header:

- `BELIEF_CLOCK_DELTA_ZONE_CLUSTER`
- `BELIEF_OPEN_THREAD_ZONE_CLUSTER`
- `BELIEF_STAGING_PEAK_UNCAUSED`

## Wave 712

Wave 712 additions (closes the ninth rotation cycle, 700-712): BELIEF_PAYOFF_ZONE_CLUSTER (distribution/timing × payoffSetupIds × structural thirds — Waves 656/698 applied the backward-cause peak and drought-run modes to payoffSetupIds; the zone-cluster mode has never been applied to it, completing the trio), BELIEF_SEED_DROUGHT_RUN (run-based × seededClueIds absence — Waves 656/698 applied the zone-cluster and backward-cause peak modes to seededClueIds; the drought-run mode has never been applied to it, completing the trio), BELIEF_HIGHLIGHT_DROUGHT_RUN (run-based × dialogueHighlights absence — Waves 670/698 applied the backward-cause peak and zone-cluster modes to this pass's most heavily used field; the drought-run mode has never been applied to it, completing the trio).

Rules named in this wave's header:

- `BELIEF_HIGHLIGHT_DROUGHT_RUN`
- `BELIEF_PAYOFF_ZONE_CLUSTER`
- `BELIEF_SEED_DROUGHT_RUN`

## Wave 698

Wave 698 additions: BELIEF_PAYOFF_DROUGHT_RUN (run-based × payoffSetupIds absence — Wave 656 applied the backward-cause peak mode to payoffSetupIds; the drought-run mode has never been applied to this channel), BELIEF_SEED_PEAK_UNCAUSED (single-peak isolation/backward-cause × seededClueIds magnitude — Wave 656 applied the zone-cluster mode to seededClueIds; the backward-cause peak mode has never been applied to this channel), BELIEF_HIGHLIGHT_ZONE_CLUSTER (distribution/timing × dialogueHighlights × structural thirds — Wave 670 applied the backward-cause peak mode to dialogueHighlights, this pass's most heavily used field [22 accesses]; the zone-cluster mode has never been applied to it).

Rules named in this wave's header:

- `BELIEF_HIGHLIGHT_ZONE_CLUSTER`
- `BELIEF_PAYOFF_DROUGHT_RUN`
- `BELIEF_SEED_PEAK_UNCAUSED`

## Wave 684

Wave 684 additions: BELIEF_CHARACTER_MOMENT_ZONE_CLUSTER (distribution/timing × purpose === 'character_moment' × structural thirds — distinct from Wave 628's BELIEF_CHARACTER_MOMENT_ZONE_IMBALANCE, which checks four-zone bloat/empty rather than a thirds-based majority cluster), BELIEF_CURIOSITY_DROUGHT_RUN (run-based × curiosityDelta>0 absence — curiosityDelta has only ever anchored average-based hand-rolled logic and a single co-occurrence/decoupling check [Wave 642's BELIEF_SEED_CURIOSITY_DECOUPLED]; the run-based mode applied to this channel for the first time), BELIEF_SUSPENSE_PEAK_UNCAUSED (single-peak isolation/backward-cause × suspenseDelta magnitude — suspenseDelta has only ever anchored average-based hand-rolled logic [e.g. avgRevSusp, tenseRevScenes]; the scene where suspense spikes hardest has never been checked for backward causation via the shared library).

Rules named in this wave's header:

- `BELIEF_CHARACTER_MOMENT_ZONE_CLUSTER`
- `BELIEF_CURIOSITY_DROUGHT_RUN`
- `BELIEF_SUSPENSE_PEAK_UNCAUSED`

## Wave 670

Wave 670 additions: BELIEF_HIGHLIGHT_PEAK_UNCAUSED (single-peak isolation/backward-cause × dialogueHighlights magnitude — dialogueHighlights is this pass's most heavily used field [21 accesses], but has only ever anchored hand-rolled aggregate/co-occurrence logic, never the shared-library backward-cause peak mode; the scene with the most highlighted lines has no dramatic turn or revelation in itself or the two scenes before it), BELIEF_RELATIONSHIP_DROUGHT_RUN (run-based × relationshipShifts absence — relationshipShifts anchors several hand-rolled checks but has never been drought-audited via the shared helper), BELIEF_TURN_ZONE_CLUSTER (distribution/timing × dramaticTurn presence × structural thirds — dramaticTurn has only ever served as a hasCause/trigger condition in this pass, never as the subject of a zone-cluster check). Completes the sixth full rotation cycle (657-670).

Rules named in this wave's header:

- `BELIEF_HIGHLIGHT_PEAK_UNCAUSED`
- `BELIEF_RELATIONSHIP_DROUGHT_RUN`
- `BELIEF_TURN_ZONE_CLUSTER`

## Wave 656

Wave 656 additions: BELIEF_PAYOFF_PEAK_UNCAUSED (single-peak isolation/backward-cause × payoffSetupIds magnitude — the scene with the most simultaneous thread resolutions has no dramatic turn or revelation in itself or the two scenes before it; every prior peak check in this 114-rule pass anchors on revelation/curiosity/suspense/relationship/clockDelta, never on the payoff channel), BELIEF_CLOCK_DROUGHT_RUN (run-based × clockRaised absence — Wave 642 applied the drought-run mode to unresolvedClues; clockRaised itself has never been drought-audited here), BELIEF_SEED_ZONE_CLUSTER (distribution/timing × seededClueIds × structural thirds — Wave 642 applied the zone-cluster mode to visualBeats; seededClueIds itself has never been cluster-audited here despite already anchoring BELIEF_SEED_CURIOSITY_DECOUPLED).

Rules named in this wave's header:

- `BELIEF_CLOCK_DROUGHT_RUN`
- `BELIEF_PAYOFF_PEAK_UNCAUSED`
- `BELIEF_SEED_ZONE_CLUSTER`

## Wave 642

Wave 642 additions: BELIEF_OPEN_THREAD_DROUGHT_RUN (run-based × unresolvedClues absence — first use of the run-based mode in this 111-rule pass), BELIEF_STAGING_ZONE_CLUSTER (distribution/timing × visualBeats × structural thirds — first zone-cluster mode applied to records here), BELIEF_SEED_CURIOSITY_DECOUPLED (co-occurrence/decoupling × seededClueIds × curiosityDelta — first pairing of these two fields).

Rules named in this wave's header:

- `BELIEF_OPEN_THREAD_DROUGHT_RUN`
- `BELIEF_SEED_CURIOSITY_DECOUPLED`
- `BELIEF_STAGING_ZONE_CLUSTER`

## Wave 628

Wave 628 additions (built on the shared checks library, audit M2.2): BELIEF_PAYOFF_SEED_DECOUPLED (co-occurrence/decoupling × payoffSetupIds × seededClueIds — both fields had previously only ever been paired with revelation in this 108-rule pass, never with each other), CLOCK_DELTA_PEAK_UNCAUSED (backward-cause × clockDelta-magnitude peak × dramaticTurn/revelation cause — first backward-cause check in this pass), BELIEF_CHARACTER_MOMENT_ZONE_IMBALANCE (underweight/bloat × purpose === 'character_moment' × four structural zones — first genuine use of the purpose field, whose only prior appearance was the word "purpose" inside prose).

Rules named in this wave's header:

- `BELIEF_CHARACTER_MOMENT_ZONE_IMBALANCE`
- `BELIEF_PAYOFF_SEED_DECOUPLED`
- `CLOCK_DELTA_PEAK_UNCAUSED`

## Wave 614

Wave 614 additions (built on the shared checks library, audit M2.2): BELIEF_STAGING_ZONE_IMBALANCE (underweight/bloat × visualBeats × four structural zones — first use of visualBeats anywhere in this 105-rule pass), CLOCK_SIGNAL_FLATLINE (average/aggregate × clockDelta variety — first use of clockDelta anywhere in this pass), VISUAL_BEAT_BELIEF_DECOUPLED (co-occurrence/decoupling × visualBeats × dialogueHighlights-present belief-assertion — pairs this wave's other new field with the file's existing belief-assertion proxy).

Rules named in this wave's header:

- `BELIEF_STAGING_ZONE_IMBALANCE`
- `CLOCK_SIGNAL_FLATLINE`
- `VISUAL_BEAT_BELIEF_DECOUPLED`

## Wave 600

Wave 600 additions: clue debt belief decoupled (co-occurrence/decoupling × unresolvedClues-present × dialogueHighlights-present — n≥6, ≥2 debt-carrying scenes, ≥2 belief-assertion scenes, zero overlap; a lingering open mystery and a character voicing a belief never share a scene; first use of unresolvedClues in this 102-rule file — UNRESOLVED_BELIEF_EXCESS is the closest-sounding existing rule but operates on toldBeliefs/witnessedBeliefs [derived from dialogueHighlights text parsing against UPDATE_BELIEF ops], a completely different data source from the unresolvedClues array [populated by SEED_CLUE/PAYOFF_SETUP ops]), clue debt clock aftermath void (sequence/ aftermath × unresolvedClues-present trigger → clockRaised aftermath, built on checkAftermathVoid from the shared checks library — audit M2.2 — n≥8, ≥3 qualifying debt-carrying scenes, none followed by a clock raise within 2 scenes while ≥2 clock scenes exist elsewhere; an open mystery never gets a ticking deadline attached to it downstream), clue debt zone imbalance (underweight/ bloat × unresolvedClues × four structural zones, built on checkZoneImbalance — one zone with no debt-carrying scenes while another holds ≥50%; named CLUE_DEBT_* rather than reusing this session's THEME_UNRESOLVED_CLUE_* or bare UNRESOLVED_CLUE_* rule strings from other passes, to keep rule names distinct across the whole system even though each pass's issues are independently scoped).

Rules named in this wave's header:

- `UNRESOLVED_BELIEF_EXCESS`

## Wave 586

Wave 586 additions: revelation dramatic-turn aftermath void (sequence/aftermath × revelation → dramatic-turn aftermath — n≥8, ≥2 qualifying revelation scenes [pos<n-2], ≥2 dramatic-turn scenes globally, no revelation followed by a dramatic turn in the next 2 scenes; distinct from REVELATION_DRAMATIC_TURN_DECOUPLED [Wave 390: co-occurrence × same scene], ASSERTION_TURN_AFTERMATH_VOID [Wave 530: assertion trigger], and TURN_REVELATION_AFTERMATH_VOID [Wave 544: turn as trigger → revelation in aftermath, which inverts trigger and output]), assertion relationship aftermath void (sequence/aftermath × assertion → relationship-shift aftermath — n≥8, ≥2 qualifying assertion scenes [pos<n-1], ≥2 relationship-shift scenes globally, no assertion followed by a relationship shift in the next scene; distinct from REVELATION_RELATIONSHIP_AFTERMATH_VOID [Wave 516: revelation trigger], ASSERTION_AFTERMATH_VOID [Wave 418: conjunction over revelation/relationship/suspense — fires only when all 3 aftermath channels are cold, whereas this isolates the relationship channel alone], and REVELATION_RELATIONSHIP_DECOUPLED [co-occurrence, same scene]), revelation payoff aftermath void (sequence/aftermath × revelation → payoff aftermath — n≥8, ≥2 qualifying revelation scenes [pos<n-1], ≥2 payoff scenes globally, no revelation followed by a payoff in the next scene; distinct from REVELATION_PAYOFF_DECOUPLED [co-occurrence × same scene], ASSERTION_PAYOFF_AFTERMATH_VOID [Wave 572: assertion trigger], and ASSERTION_PAYOFF_DECOUPLED [co-occurrence × assertion scene itself — different trigger AND mode]).

Rules named in this wave's header:

- `ASSERTION_PAYOFF_AFTERMATH_VOID`
- `REVELATION_RELATIONSHIP_AFTERMATH_VOID`
- `TURN_REVELATION_AFTERMATH_VOID`

## Wave 572

Wave 572 additions: assertion clock aftermath void (sequence/aftermath × assertion → clock — n≥8, ≥2 qualifying assertion scenes, ≥2 clock scenes globally, no assertion followed by a raised clock; claims never set a deadline ticking on their consequences), assertion seed aftermath void (sequence/ aftermath × assertion → seed — ≥2 assertion scenes, ≥2 seed scenes, no assertion followed by a seeded clue; claims never trail planted evidence), assertion payoff aftermath void (sequence/ aftermath × assertion → payoff — ≥2 assertion scenes, ≥2 payoff scenes, no assertion followed by a payoff; claims never coincide with thread resolution). These fill the clock, seed, and payoff channels of the assertion-aftermath family alongside curiosity (Wave 474), emotion (Wave 558), and dramatic-turn (Wave 530); each isolates a single channel (firing even when other aftermath channels are active) and so is distinct from the conjunction-based ASSERTION_AFTERMATH_VOID (Wave 418, over revelation/relationship/suspense) and from its same-scene co-occurrence sibling (TOLD_BELIEF_CLOCK/ SEED_DECOUPLED, ASSERTION_PAYOFF_DECOUPLED).

Rules named in this wave's header:

- `ASSERTION_AFTERMATH_VOID`
- `ASSERTION_PAYOFF_DECOUPLED`

## Wave 558

Wave 558 additions: assertion emotional aftermath flat (average/aggregate × assertion → emotional aftermath — n≥8, ≥3 qualifying assertion scenes [pos<n-1], all scenes immediately following an assertion have emotionalShift neutral/null; claims arrive without charging what follows emotionally; distinct from TOLD_BELIEF_EMOTIONAL_FLATLINE [assertion scene itself neutral, not aftermath] and REVELATION_EMOTIONAL_AFTERMATH_FLAT [revelation trigger]), revelation curiosity peak early (single-peak isolation × revelation × curiosityDelta — n≥8, ≥3 revelation scenes with curiosityDelta>0, the one with the highest curiosityDelta is in the first 25% while ≥2 curiosity-generating revelations exist later; the script front-loads its most curiosity-rich disclosure; distinct from REVELATION_CURIOSITY_PEAK_ABSENT [non-revelation has peak curiosity] and REVELATION_CURIOSITY_DECOUPLED [avg of all revelation curiosityDelta ≤0 — all low, not one peak early]), seed temporal cluster (distribution/timing × seed × thirds — n≥9, ≥3 seeded scenes, >75% in one structural third; evidence planting is ghettoized into one zone; first distribution/timing check on the seed channel, distinct from ASSERTION_TEMPORAL_CLUSTER [assertion channel] and REVELATION_TEMPORAL_CLUSTER [revelation channel]).

Rules named in this wave's header:

- `REVELATION_CURIOSITY_PEAK_ABSENT`
- `REVELATION_EMOTIONAL_AFTERMATH_FLAT`
- `REVELATION_TEMPORAL_CLUSTER`

## Wave 544

Wave 544 additions: revelation closing quarter absent (zone presence/absence × revelation × closing 25% — n≥8, ≥3 revelations globally, 0 in the final 25% while ≥2 in the first 75%; the story stops disclosing before its climax; distinct from TOLD_BELIEF_ACT_3_ABSENT [assertion channel] and REVELATION_FINAL_ACT_ONLY [opposite: all revelations IN final quarter]), assertion drought (run-based × assertion-absence × assertion-specific channel — n≥8, ≥3 assertion scenes, max consecutive gap ≥7; fires on the assertion channel alone, so revelation presence can mask the drought from TOLD_BELIEF_DROUGHT; distinct from ASSERTION_SINGLETON_RUN [no two consecutive assertions — over-dispersion, not sustained silence]), turn revelation aftermath void (sequence/ aftermath × dramatic turn → revelation aftermath — n≥8, ≥2 qualifying turn scenes [pos<n-2], ≥2 revelation scenes globally, no turn followed by revelation in next 2 scenes; distinct from ASSERTION_TURN_AFTERMATH_VOID [assertion as trigger], REVELATION_DRAMATIC_TURN_DECOUPLED [same-scene co-occurrence], REVELATION_ASSERTION_DISCONNECT [assertion → revelation, not turn → revelation]).

Rules named in this wave's header:

- `ASSERTION_TURN_AFTERMATH_VOID`
- `REVELATION_DRAMATIC_TURN_DECOUPLED`
- `REVELATION_FINAL_ACT_ONLY`

## Wave 530

Wave 530 additions: assertion positive decoupled (co-occurrence × positive emotion × assertion — n≥8, ≥2 assertion scenes, ≥2 positive-emotion scenes, no assertion scene has emotionalShift= 'positive'; the positive-valence complement of ASSERTION_NEGATIVE_DECOUPLED, completing the valence × assertion co-occurrence pair), positive scene revelation void (co-occurrence × positive emotion × revelation absence — n≥8, ≥2 revelation scenes, ≥2 positive-emotion scenes, no positive-emotion scene carries a revelation; the positive-valence sibling of NEGATIVE_SCENE_REVELATION_VOID completing the valence × revelation co-occurrence pair), assertion turn aftermath void (sequence/ aftermath × dramatic turn × assertion trigger — n≥8, ≥2 qualifying assertion scenes [pos < n-2], ≥2 turn scenes, no assertion followed by a dramatic turn in next 2 scenes; distinct from TOLD_BELIEF_DRAMATIC_TURN_DECOUPLED which checks co-occurrence in the same scene).

Rules named in this wave's header:

- `ASSERTION_NEGATIVE_DECOUPLED`
- `NEGATIVE_SCENE_REVELATION_VOID`
- `TOLD_BELIEF_DRAMATIC_TURN_DECOUPLED`

## Wave 516

Wave 516 additions: revelation relationship aftermath void (sequence/aftermath × revelation → relationship-shift aftermath — n≥8, ≥2 qualifying revelation scenes not at last position, ≥2 relationship-shift scenes exist globally, none of the scenes immediately following a revelation carry a non-empty relationshipShifts; the relationship-channel aftermath complement of REVELATION_RELATIONSHIP_DECOUPLED which checks co-occurrence in the same scene), revelation clock aftermath void (sequence/aftermath × revelation → clock aftermath — n≥8, ≥2 qualifying revelation scenes not at last position, ≥2 clockRaised scenes globally, none of the following scenes have clockRaised=true; the clock-channel aftermath complement of REVELATION_CLOCK_DECOUPLED which checks co-occurrence in the same scene), revelation seed aftermath void (sequence/aftermath × revelation → seed aftermath — n≥8, ≥2 qualifying revelation scenes not at last position, ≥2 seeded scenes globally, none of the following scenes have seededClueIds non-empty; the aftermath sibling of REVELATION_SEED_DECOUPLED which checks co-occurrence in the same scene and distinct from REVELATION_CURIOSITY_AFTERMATH_VOID which uses the curiosity channel as aftermath signal).

Rules named in this wave's header:

- `REVELATION_CLOCK_DECOUPLED`
- `REVELATION_CURIOSITY_AFTERMATH_VOID`
- `REVELATION_SEED_DECOUPLED`

## Wave 502

Wave 502 additions: revelation seed decoupled (co-occurrence × revelation × seed — n≥8, ≥2 revelation scenes, ≥2 seed scenes, no scene carries both; disclosures and planted evidence never coincide, the seed-channel complement of REVELATION_PAYOFF_DECOUPLED and distinct from TOLD_BELIEF_SEED_DECOUPLED which checks assertion × seed), revelation curiosity aftermath void (average/aggregate × revelation → curiosity aftermath — n≥8, ≥3 qualifying revelation scenes [pos < n-1], avg curiosityDelta of immediately following scenes ≤ 0; revelations close the epistemic field in the next beat, distinct from REVELATION_CURIOSITY_DECOUPLED which checks curiosityDelta OF the revelation scene itself, and from ASSERTION_CURIOSITY_AFTERMATH_VOID which uses assertion as trigger), assertion consecutive flood (run-based × assertion channel — n≥8, ≥4 assertion scenes, longest consecutive run ≥ 3; claims pile up without processing room, the run-based complement of ASSERTION_SINGLETON_RUN and the assertion-channel mirror of REVELATION_CONSECUTIVE_FLOOD).

Rules named in this wave's header:

- `ASSERTION_CURIOSITY_AFTERMATH_VOID`
- `ASSERTION_SINGLETON_RUN`
- `REVELATION_CURIOSITY_DECOUPLED`
- `REVELATION_PAYOFF_DECOUPLED`

## Wave 488

Wave 488 additions: revelation temporal cluster (distribution/timing × revelation × thirds — n≥9, ≥3 revelations, >75% in one structural third; the revelation-channel complement of ASSERTION_TEMPORAL_CLUSTER; disclosures are ghettoized into one temporal zone), revelation relationship peak absent (single-peak isolation × relationship magnitude × revelation — n≥8, ≥2 revelation scenes, ≥2 relationship-shift scenes, the scene with maximum relationship-shift magnitude has no revelation while another relationship-shift scene does; the relationship-magnitude single-peak check distinct from REVELATION_RELATIONSHIP_DECOUPLED which fires on all relationship-shift scenes), assertion negative decoupled (co-occurrence × negative emotion × assertion absence — n≥8, ≥2 assertion scenes, ≥2 negative-emotion scenes, no assertion lands in a negative-emotion scene; the negative-valence complement of TOLD_BELIEF_EMOTIONAL_FLATLINE which fires when assertions are emotionally neutral; this fires when they are never in defeat).

Rules named in this wave's header:

- `ASSERTION_TEMPORAL_CLUSTER`
- `REVELATION_RELATIONSHIP_DECOUPLED`
- `TOLD_BELIEF_EMOTIONAL_FLATLINE`

## Wave 474

Wave 474 additions: assertion temporal cluster (distribution/timing — >75% of assertion scene positions fall within a single third of the script; the belief battle is structurally ghettoized into one temporal zone; first distribution/timing check on the temporal spread of assertion scenes across the full arc), revelation emotional aftermath flat (average/aggregate × revelation × emotional aftermath — all scenes immediately following qualifying revelations are emotionally neutral; disclosures generate no emotional charge in what follows; distinct from REVELATION_DRAMA_VACUUM which checks the revelation scene itself and REVELATION_SUSPENSE_DEFLATION which checks suspenseDelta of the aftermath), assertion curiosity aftermath void (average/aggregate × assertion × curiosity aftermath — average curiosityDelta of scenes immediately following assertion scenes ≤ 0; assertions close the epistemic field rather than reopening it; the curiosity-channel complement of REVELATION_SUSPENSE_DEFLATION and the aftermath-direction complement of TOLD_BELIEF_CURIOSITY_FLAT).

Rules named in this wave's header:

- `REVELATION_SUSPENSE_DEFLATION`
- `TOLD_BELIEF_CURIOSITY_FLAT`

## Wave 460

Wave 460 additions: assertion causal vacuum (every assertion scene is unpreceded by any revelation, dramatic turn, or high-suspense event in the 2 prior scenes — claims drop from narrative vacuum with no story pressure motivating them; backward-cause × full assertion population, first check examining assertions as the EFFECT rather than the CAUSE), revelation suspense deflation (the average suspenseDelta of the scene immediately following each qualifying revelation is < 0 — disclosures consistently trigger falling tension rather than escalation; average/aggregate × aftermath × revelation × suspense direction, the first aggregate check on the post-revelation zone), assertion payoff decoupled (no assertion scene shares a scene with any payoffSetupIds — verbal declarations never coincide with narrative resolutions; co-occurrence × assertion × payoff, the payoff-side complement of TOLD_BELIEF_SEED_DECOUPLED which checks the seed side).

Rules named in this wave's header:

- `TOLD_BELIEF_SEED_DECOUPLED`

## Wave 446

Wave 446 additions: revelation drought (≥6 consecutive scenes with no disclosure despite ≥2 revelations existing — epistemic momentum breaks down in extended silent stretches; run-based × revelation-absence mode, the revelation-channel parallel of TOLD_BELIEF_DROUGHT), assertion reactive void (every revelation is followed by 2 scenes with no character assertion — discoveries never prompt a character to publicly update their worldview; sequence/aftermath × revelation→assertion direction, the reverse of REVELATION_ASSERTION_DISCONNECT), negative scene revelation void (no negative-emotional scene ever coincides with a revelation — hard moments are quarantined from disclosure; co-occurrence × negative-valence × revelation-absence mode, orthogonal to REVELATION_DRAMA_VACUUM which checks revelation scenes for neutrality).

Rules named in this wave's header:

- `REVELATION_ASSERTION_DISCONNECT`
- `REVELATION_DRAMA_VACUUM`
- `TOLD_BELIEF_DROUGHT`

## Wave 432

Wave 432 additions: revelation emotional monotone (all emotionally charged revelation scenes share the same polarity — every discovery lands as either uniformly bad or uniformly good news, erasing tonal surprise from the disclosure layer; valence mode × revelation channel), revelation unprepared climax (the story's final revelation has no told belief or assertion in the three prior scenes — the climactic disclosure has no planted deception to resolve; backward-cause mode × final revelation), assertion singleton run (no two assertion scenes ever appear consecutively — the belief battle spreads so thin that claims never accumulate or build momentum; run-based mode × assertion channel, the complement of REVELATION_CONSECUTIVE_FLOOD).

Rules named in this wave's header:

- `REVELATION_CONSECUTIVE_FLOOD`

## Unattributed (no explicit wave-header mention)

These rule constants exist in this pass but were not found, by exact-name match, inside any "Wave N —" / "Wave N additions:" header entry in the file — typically because they predate that convention hardening, or the header describes the check descriptively rather than by constant name (e.g. "talking heads" rather than `TALKING_HEADS`). Listed here honestly rather than guessed into a wave, with the nearest preceding in-code "── section title ──" comment as the best-available substitute context where one exists.

- `ADJACENT_DECEPTION_PAYOFF` — Wave 253: ADJACENT_DECEPTION_PAYOFF
- `ASSERTION_ACT1_ONLY` — Wave 404: REVELATION_PAYOFF_DECOUPLED, TOLD_BELIEF_SEED_DECOUPLED, ASSERTION_ACT1_ONLY
- `ASSERTION_ACT2A_VOID` — Wave 418: REVELATION_CONSECUTIVE_FLOOD, ASSERTION_ACT2A_VOID, ASSERTION_AFTERMATH_VOID
- `ASSERTION_CAUSAL_VACUUM` — Wave 460: ASSERTION_CAUSAL_VACUUM, REVELATION_SUSPENSE_DEFLATION, ASSERTION_PAYOFF_DECOUPLED
- `ASSERTION_CLOCK_AFTERMATH_VOID` — Wave 530: ASSERTION_POSITIVE_DECOUPLED, POSITIVE_SCENE_REVELATION_VOID, ASSERTION_TURN_AFTERMATH_VOID
- `ASSERTION_CONSECUTIVE_FLOOD` — Wave 502 checks
- `ASSERTION_DROUGHT` — Wave 530: ASSERTION_POSITIVE_DECOUPLED, POSITIVE_SCENE_REVELATION_VOID, ASSERTION_TURN_AFTERMATH_VOID
- `ASSERTION_MIDPOINT_VOID` — Wave 376: REVELATION_SUSPENSE_PEAK_ABSENT, TOLD_BELIEF_CLOCK_DECOUPLED, ASSERTION_MIDPOINT_VOID
- `ASSERTION_REACTIVE_VOID` — Wave 446: REVELATION_DROUGHT, ASSERTION_REACTIVE_VOID, NEGATIVE_SCENE_REVELATION_VOID
- `ASSERTION_RELATIONSHIP_AFTERMATH_VOID` — Wave 530: ASSERTION_POSITIVE_DECOUPLED, POSITIVE_SCENE_REVELATION_VOID, ASSERTION_TURN_AFTERMATH_VOID
- `ASSERTION_SEED_AFTERMATH_VOID` — Wave 530: ASSERTION_POSITIVE_DECOUPLED, POSITIVE_SCENE_REVELATION_VOID, ASSERTION_TURN_AFTERMATH_VOID
- `ASSERTION_VOID` — Wave 309: ASSERTION_VOID
- `BELIEF_ACT2B_VOID` — Wave 281: Revelation drama vacuum, Act 2b void, told belief final scene
- `BELIEF_ASYMMETRY` — Wave 159: Revelation isolated, told domination, belief asymmetry
- `BELIEF_ECHO_CHAMBER` — Wave 253: BELIEF_ECHO_CHAMBER
- `BELIEF_FRONT_LOADED` — Wave 267: BELIEF_FRONT_LOADED
- `BELIEF_FRONT_LOADED_REVELATIONS` — Wave 225: BELIEF_FRONT_LOADED_REVELATIONS
- `BELIEF_ISOLATION` — Wave 145: Deception consequence & belief reversals
- `BELIEF_MIDPOINT_VOID` — Wave 199: Midpoint void, single revelation, revelation delayed
- `BELIEF_OPENING_INERT` — Wave 295: BELIEF_OPENING_INERT
- `BELIEF_REVERSAL_UNSUPPORTED` — Wave 145: Deception consequence & belief reversals
- `BELIEF_STAGNATION` — Wave 175: Revelation clustering, belief stagnation, scene overload
- `BELIEF_WITHOUT_CONTEXT` — Told belief without prior setup
- `CLUE_DEBT_BELIEF_DECOUPLED` — Wave 530: ASSERTION_POSITIVE_DECOUPLED, POSITIVE_SCENE_REVELATION_VOID, ASSERTION_TURN_AFTERMATH_VOID
- `CLUE_DEBT_CLOCK_AFTERMATH_VOID` — Wave 530: ASSERTION_POSITIVE_DECOUPLED, POSITIVE_SCENE_REVELATION_VOID, ASSERTION_TURN_AFTERMATH_VOID
- `CLUE_DEBT_ZONE_IMBALANCE` — Wave 530: ASSERTION_POSITIVE_DECOUPLED, POSITIVE_SCENE_REVELATION_VOID, ASSERTION_TURN_AFTERMATH_VOID
- `COLD_OPEN_BELIEF_VOID` — Wave 190: Cold open void, unresolved excess, back-weighted revelations
- `DECEPTION_SETUP_VOID` — Wave 225: DECEPTION_SETUP_VOID
- `DECEPTION_WITHOUT_CONSEQUENCE` — Wave 145: Deception consequence & belief reversals
- `EXPOSITION_DUMP` — Consecutive told-beliefs with no witness
- `LATE_DECEPTION_PLANT` — Wave 211: Revelation Act 3 void, late deception plant, belief resolution absent
- `POSITIVE_SCENE_REVELATION_VOID` — Wave 530: ASSERTION_POSITIVE_DECOUPLED, POSITIVE_SCENE_REVELATION_VOID, ASSERTION_TURN_AFTERMATH_VOID
- `REVELATION_ACT2A_DESERT` — Wave 253: REVELATION_ACT2A_DESERT
- `REVELATION_ACT3_VOID` — Wave 211: Revelation Act 3 void, late deception plant, belief resolution absent
- `REVELATION_AFTERMATH_ABSENT` — Wave 225: REVELATION_AFTERMATH_ABSENT
- `REVELATION_BACK_WEIGHTED` — Wave 190: Cold open void, unresolved excess, back-weighted revelations
- `REVELATION_BELIEF_PROPAGATION_ABSENT` — Wave 239: REVELATION_BELIEF_PROPAGATION_ABSENT
- `REVELATION_CLOCK_AFTERMATH_VOID` — Wave 502 checks
- `REVELATION_CLOSING_QUARTER_ABSENT` — Wave 530: ASSERTION_POSITIVE_DECOUPLED, POSITIVE_SCENE_REVELATION_VOID, ASSERTION_TURN_AFTERMATH_VOID
- `REVELATION_CLUSTERING` — Wave 175: Revelation clustering, belief stagnation, scene overload
- `REVELATION_DELAYED` — Wave 199: Midpoint void, single revelation, revelation delayed
- `REVELATION_DENSITY_DROP` — Wave 295: REVELATION_DENSITY_DROP
- `REVELATION_DRAMATIC_TURN_AFTERMATH_VOID` — Wave 530: ASSERTION_POSITIVE_DECOUPLED, POSITIVE_SCENE_REVELATION_VOID, ASSERTION_TURN_AFTERMATH_VOID
- `REVELATION_ISOLATED` — Wave 159: Revelation isolated, told domination, belief asymmetry
- `REVELATION_LATE_FIRST` — Wave 309: REVELATION_LATE_FIRST
- `REVELATION_MIDPOINT_VOID` — Wave 348: REVELATION_ASSERTION_DISCONNECT, REVELATION_MIDPOINT_VOID, TOLD_BELIEF_DRAMATIC_TURN_DECOUPLED
- `REVELATION_PAYOFF_AFTERMATH_VOID` — Wave 530: ASSERTION_POSITIVE_DECOUPLED, POSITIVE_SCENE_REVELATION_VOID, ASSERTION_TURN_AFTERMATH_VOID
- `REVELATION_RELATIONSHIP_PEAK_ABSENT` — Wave 488: REVELATION_TEMPORAL_CLUSTER, REVELATION_RELATIONSHIP_PEAK_ABSENT, ASSERTION_NEGATIVE_DECOUPLED
- `REVELATION_SEED_AFTERMATH_VOID` — Wave 502 checks
- `REVELATION_SUSPENSE_DECOUPLED` — Wave 295: REVELATION_SUSPENSE_DECOUPLED
- `REVELATION_SUSPENSE_PEAK_ABSENT` — Wave 376: REVELATION_SUSPENSE_PEAK_ABSENT, TOLD_BELIEF_CLOCK_DECOUPLED, ASSERTION_MIDPOINT_VOID
- `REVELATION_UNEARNED` — Revelation without any prior told-belief contradiction
- `SEED_TEMPORAL_CLUSTER` — Wave 530: ASSERTION_POSITIVE_DECOUPLED, POSITIVE_SCENE_REVELATION_VOID, ASSERTION_TURN_AFTERMATH_VOID
- `SINGLE_REVELATION_STORY` — Wave 199: Midpoint void, single revelation, revelation delayed
- `SINGLE_SCENE_BELIEF_OVERLOAD` — Wave 175: Revelation clustering, belief stagnation, scene overload
- `SOLE_ASSERTER` — Wave 239: SOLE_ASSERTER
- `TOLD_BELIEF_ACT3_ABSENT` — Wave 362: REVELATION_CLOCK_DECOUPLED, TOLD_BELIEF_ACT3_ABSENT, REVELATION_CURIOSITY_PEAK_ABSENT
- `TOLD_BELIEF_ACT3_SURGE` — Wave 239: TOLD_BELIEF_ACT3_SURGE
- `TOLD_BELIEF_CLOCK_DECOUPLED` — Wave 376: REVELATION_SUSPENSE_PEAK_ABSENT, TOLD_BELIEF_CLOCK_DECOUPLED, ASSERTION_MIDPOINT_VOID
- `TOLD_BELIEF_CLUSTERING` — Wave 267: TOLD_BELIEF_CLUSTERING
- `TOLD_BELIEF_DOMINATION` — Wave 159: Revelation isolated, told domination, belief asymmetry
- `TOLD_BELIEF_FINAL_SCENE` — Wave 281: Revelation drama vacuum, Act 2b void, told belief final scene
- `TOLD_BELIEF_RELATIONSHIP_DECOUPLED` — Wave 323: REVELATION_CURIOSITY_DECOUPLED, TOLD_BELIEF_CURIOSITY_FLAT, TOLD_BELIEF_RELATIONSHIP_DECOUPLED
- `TOLD_BELIEF_SUSPENSE_DECOUPLED` — Wave 334: TOLD_BELIEF_SUSPENSE_DECOUPLED, TOLD_BELIEF_EMOTIONAL_FLATLINE, REVELATION_RELATIONSHIP_DECOUPLED
- `TOLD_BELIEF_SUSPENSE_PEAK_ABSENT` — Wave 390: REVELATION_DRAMATIC_TURN_DECOUPLED, TOLD_BELIEF_SUSPENSE_PEAK_ABSENT, TOLD_BELIEF_CURIOSITY_PEAK_ABSENT

