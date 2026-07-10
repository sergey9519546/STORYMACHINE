# Pass: `rhythm`

Founding wave: 137. Total distinct rules: 227 (151 attributed to a specific wave, 76 unattributed — see docs/rulebook/README.md's methodology note).

## Wave 1190

Wave 1190 additions (Program v2, Type 1 — signal channel #3, closes cycle 2): fountain-analyzer.ts's new speakingCharacterCount signal (distinct dialogue speakers per scene — 0/1/2+; see that file's Wave 1190 header for the corpus-density prerequisite that led here) gets its first 3 consumers, all in this pass because "rhythm" is precisely the cadence of solo beats vs shared exchange across the structure. Measured directly against the 20-sample calibration corpus (not assumed): solo-shaped scenes (speakingCharacterCount<=1) in every strong/competent sample either recur throughout all three structural thirds or cluster only mildly, while every weak/troubled sample collapses into ONE uninterrupted multi-voice-exchange run of 6-7 consecutive scenes with zero solo beats past the opening third. RHYTHM_SOLO_VOICE_DROUGHT_RUN (run-based) fires on 9/20 samples (all weak/troubled but one), RHYTHM_SOLO_VOICE_ZONE_CLUSTER (distribution/timing × structural thirds) fires on 10/20 (every weak/troubled sample, zero false positives on strong/competent) — both LIVE on real corpus text, the explicit goal the Cycle-1 gate's prerequisite was filed to achieve. RHYTHM_MONOLOGUE_REVELATION_DECOUPLED (co-occurrence/decoupling, pairing the new channel with the pre-existing revelation field) is fixture-only this wave: revelation fires on at most 1 scene in any single corpus sample (a pre-existing analyzer sparsity noted at Wave 1183, not a defect of this new signal), too sparse to clear the co-occurrence template's minimum-population guard on this corpus. Distinct from powerHolder/powerBalance/powerFlipped (Wave 1186): those are null/0 for three different reasons (fewer than two speakers, an ambiguous near-zero balance, or too few dyad lines to judge) and cannot by themselves separate a true solo scene from a close two-hander; speakingCharacterCount is the first field to expose raw per-scene voice count at any value, independent of control.

Rules named in this wave's header:

- `RHYTHM_MONOLOGUE_REVELATION_DECOUPLED`
- `RHYTHM_SOLO_VOICE_DROUGHT_RUN`
- `RHYTHM_SOLO_VOICE_ZONE_CLUSTER`

## Wave 1170

Wave 1170 additions: after Wave 1156, clockRaised stood at four of six channels (curiosityDelta, suspenseDelta, emotionalShift, relationshipShifts). RHYTHM_CLOCK_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID and RHYTHM_CLOCK_STAGING_AFTERMATH_VOID give it its fifth and sixth channels (dialogueHighlights, visualBeats), completing full six-channel saturation for this trigger. With clockRaised and unresolvedClues both exhausted, this wave introduces suspenseDelta>0 as a genuinely fresh checkAftermathVoid trigger — it has only ever appeared as an aftermath channel in this file, never as the isTrigger side of a check. RHYTHM_SUSPENSE_CURIOSITY_AFTERMATH_VOID pairs suspenseDelta with curiosityDelta.

Rules named in this wave's header:

- `RHYTHM_CLOCK_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID`
- `RHYTHM_CLOCK_STAGING_AFTERMATH_VOID`
- `RHYTHM_SUSPENSE_CURIOSITY_AFTERMATH_VOID`

## Wave 1156

Wave 1156 additions: after Wave 1142, unresolvedClues was at four of six channels (curiosityDelta, suspenseDelta, emotionalShift, relationshipShifts) and clockRaised at three (curiosityDelta, suspenseDelta, emotionalShift). RHYTHM_OPEN_THREAD_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID and RHYTHM_OPEN_THREAD_STAGING_AFTERMATH_VOID give unresolvedClues its fifth and sixth channels (dialogueHighlights, visualBeats), completing full six-channel saturation for this trigger. RHYTHM_CLOCK_RELATIONAL_AFTERMATH_VOID gives clockRaised its fourth channel (relationshipShifts).

Rules named in this wave's header:

- `RHYTHM_CLOCK_RELATIONAL_AFTERMATH_VOID`
- `RHYTHM_OPEN_THREAD_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID`
- `RHYTHM_OPEN_THREAD_STAGING_AFTERMATH_VOID`

## Wave 1142

Wave 1142 additions: unresolvedClues was at three of six channels; clockRaised at one. RHYTHM_OPEN_THREAD_RELATIONAL_AFTERMATH_VOID gives unresolvedClues its fourth channel (relationshipShifts); RHYTHM_CLOCK_SUSPENSE_AFTERMATH_VOID and RHYTHM_CLOCK_EMOTIONAL_AFTERMATH_VOID give clockRaised its second and third channels (suspenseDelta, emotionalShift).

Rules named in this wave's header:

- `RHYTHM_CLOCK_EMOTIONAL_AFTERMATH_VOID`
- `RHYTHM_CLOCK_SUSPENSE_AFTERMATH_VOID`
- `RHYTHM_OPEN_THREAD_RELATIONAL_AFTERMATH_VOID`

## Wave 1128

Wave 1128 additions: unresolvedClues (length>0) had only its one Wave-1114 channel. RHYTHM_OPEN_THREAD_SUSPENSE_AFTERMATH_VOID and RHYTHM_OPEN_THREAD_EMOTIONAL_AFTERMATH_VOID give it its second and third channels (suspenseDelta, emotionalShift). clockRaised has never anchored a checkAftermathVoid trigger in this file — only distribution/timing (zone-cluster, peak-uncaused) — RHYTHM_CLOCK_CURIOSITY_AFTERMATH_VOID gives it a first, fresh channel (curiosityDelta).

Rules named in this wave's header:

- `RHYTHM_CLOCK_CURIOSITY_AFTERMATH_VOID`
- `RHYTHM_OPEN_THREAD_EMOTIONAL_AFTERMATH_VOID`
- `RHYTHM_OPEN_THREAD_SUSPENSE_AFTERMATH_VOID`

## Wave 1114

Wave 1114 additions: RHYTHM_SEED_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID and RHYTHM_SEED_STAGING_AFTERMATH_VOID give seededClueIds its fifth and sixth channels (previously paired with curiosityDelta/emotionalShift/suspenseDelta/relationshipShifts, now also paired with dialogueHighlights and visualBeats respectively), completing full six-channel saturation for all five of this pass's tracked triggers. With those exhausted, this wave introduces unresolvedClues (length>0) as a genuinely fresh checkAftermathVoid trigger — it has only ever anchored distribution/timing (zone-imbalance) checks here, never sequence/aftermath: RHYTHM_OPEN_THREAD_CURIOSITY_AFTERMATH_VOID pairs it with curiosityDelta.

Rules named in this wave's header:

- `RHYTHM_OPEN_THREAD_CURIOSITY_AFTERMATH_VOID`
- `RHYTHM_SEED_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID`
- `RHYTHM_SEED_STAGING_AFTERMATH_VOID`

## Wave 1100

Wave 1100 additions: with all four boolean triggers already fully saturated, this wave continues building out seededClueIds' checkAftermathVoid channel set (currently just curiosityDelta) — RHYTHM_SEED_EMOTIONAL_AFTERMATH_VOID (emotionalShift), RHYTHM_SEED_SUSPENSE_AFTERMATH_VOID (suspenseDelta), and RHYTHM_SEED_RELATIONAL_AFTERMATH_VOID (relationshipShifts) give this trigger three fresh channels.

Rules named in this wave's header:

- `RHYTHM_SEED_EMOTIONAL_AFTERMATH_VOID`
- `RHYTHM_SEED_RELATIONAL_AFTERMATH_VOID`
- `RHYTHM_SEED_SUSPENSE_AFTERMATH_VOID`

## Wave 1086

Wave 1086 additions: dramaticTurn and raise_stakes each reach full six-channel saturation — RHYTHM_TURN_STAGING_AFTERMATH_VOID (dramaticTurn, previously paired with relationshipShifts/ emotionalShift/curiosityDelta/suspenseDelta/dialogueHighlights, now also paired with visualBeats — its only remaining standard channel) and RHYTHM_STAKES_STAGING_AFTERMATH_VOID (raise_stakes, previously paired with curiosityDelta/suspenseDelta/relationshipShifts/ emotionalShift/dialogueHighlights, now also paired with visualBeats — its only remaining standard channel). With all four boolean triggers (revelation/dramaticTurn/payoffSetupIds/ raise_stakes) now fully saturated, the third check introduces seededClueIds as a genuinely fresh sequence/aftermath trigger — RHYTHM_SEED_CURIOSITY_AFTERMATH_VOID — distinct from this pass's existing seededClueIds coverage (zone-imbalance, drought-run, zone-cluster, and peak-uncaused modes have all been applied, but never sequence/aftermath).

Rules named in this wave's header:

- `RHYTHM_SEED_CURIOSITY_AFTERMATH_VOID`
- `RHYTHM_STAKES_STAGING_AFTERMATH_VOID`
- `RHYTHM_TURN_STAGING_AFTERMATH_VOID`

## Wave 1072

Wave 1072 additions: RHYTHM_PAYOFF_STAGING_AFTERMATH_VOID gives payoffSetupIds its sixth and final standard channel (previously paired with emotionalShift/curiosityDelta/suspenseDelta/ relationshipShifts/dialogueHighlights, now also paired with visualBeats, completing full saturation). RHYTHM_TURN_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID gives dramaticTurn a fifth channel (previously paired with relationshipShifts/emotionalShift/curiosityDelta/suspenseDelta, now also paired with dialogueHighlights). RHYTHM_STAKES_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID gives raise_stakes a fifth channel (previously paired with curiosityDelta/suspenseDelta/ relationshipShifts/emotionalShift, now also paired with dialogueHighlights).

Rules named in this wave's header:

- `RHYTHM_PAYOFF_STAGING_AFTERMATH_VOID`
- `RHYTHM_STAKES_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID`
- `RHYTHM_TURN_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID`

## Wave 1058

Wave 1058 additions: RHYTHM_REVELATION_STAGING_AFTERMATH_VOID gives revelation its sixth and final standard channel (previously paired with emotionalShift/relationshipShifts/ curiosityDelta/suspenseDelta/dialogueHighlights, now also paired with visualBeats, completing full saturation). RHYTHM_TURN_SUSPENSE_AFTERMATH_VOID gives dramaticTurn a fourth channel (previously paired with payoffSetupIds/relationshipShifts/emotionalShift/curiosityDelta, now also paired with suspenseDelta). RHYTHM_PAYOFF_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID gives payoffSetupIds a fifth channel (previously paired with emotionalShift/curiosityDelta/ suspenseDelta/relationshipShifts, now also paired with dialogueHighlights).

Rules named in this wave's header:

- `RHYTHM_PAYOFF_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID`
- `RHYTHM_REVELATION_STAGING_AFTERMATH_VOID`
- `RHYTHM_TURN_SUSPENSE_AFTERMATH_VOID`

## Wave 1044

Wave 1044 additions: with raise_stakes and revelation now at four channels each, this wave targets the less-saturated triggers: RHYTHM_TURN_CURIOSITY_AFTERMATH_VOID (dramaticTurn, previously paired with payoffSetupIds/relationshipShifts/emotionalShift, now a fourth channel with curiosityDelta) and RHYTHM_PAYOFF_RELATIONAL_AFTERMATH_VOID (payoffSetupIds, previously paired with emotionalShift/curiosityDelta/suspenseDelta, now a fourth channel with relationshipShifts). The third check, RHYTHM_REVELATION_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID, pairs revelation with dialogueHighlights — a field that has never been used as a checkAftermathVoid consequence channel anywhere in this pass.

Rules named in this wave's header:

- `RHYTHM_PAYOFF_RELATIONAL_AFTERMATH_VOID`
- `RHYTHM_REVELATION_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID`
- `RHYTHM_TURN_CURIOSITY_AFTERMATH_VOID`

## Wave 1030

Wave 1030 additions: RHYTHM_STAKES_EMOTIONAL_AFTERMATH_VOID gives raise_stakes a fourth channel (previously paired with curiosityDelta/suspenseDelta/relationshipShifts, now paired with emotionalShift), RHYTHM_PAYOFF_SUSPENSE_AFTERMATH_VOID gives payoffSetupIds a third channel (previously paired with emotionalShift/curiosityDelta, now paired with suspenseDelta), and RHYTHM_REVELATION_SUSPENSE_AFTERMATH_VOID gives revelation a fourth channel (previously paired with emotionalShift/relationshipShifts/curiosityDelta, now paired with suspenseDelta).

Rules named in this wave's header:

- `RHYTHM_PAYOFF_SUSPENSE_AFTERMATH_VOID`
- `RHYTHM_REVELATION_SUSPENSE_AFTERMATH_VOID`
- `RHYTHM_STAKES_EMOTIONAL_AFTERMATH_VOID`

## Wave 1016

Wave 1016 additions: this wave gives three more triggers a third consequence channel: RHYTHM_REVELATION_CURIOSITY_AFTERMATH_VOID (revelation, previously paired with emotionalShift and relationshipShifts, now paired with curiosityDelta), RHYTHM_TURN_EMOTIONAL_AFTERMATH_VOID (dramaticTurn, previously paired with payoffSetupIds and relationshipShifts, now paired with emotionalShift), and RHYTHM_STAKES_RELATIONAL_AFTERMATH_VOID (raise_stakes, previously paired with curiosityDelta and suspenseDelta, now paired with relationshipShifts).

Rules named in this wave's header:

- `RHYTHM_REVELATION_CURIOSITY_AFTERMATH_VOID`
- `RHYTHM_STAKES_RELATIONAL_AFTERMATH_VOID`
- `RHYTHM_TURN_EMOTIONAL_AFTERMATH_VOID`

## Wave 1002

Wave 1002 additions: CLOCK_SIGNAL re-checked and re-excluded (confirmed same two-field mismatch as Wave 988). With zone-imbalance still exhausted, this wave gives three existing aftermath-void triggers a fresh consequence channel: RHYTHM_STAKES_SUSPENSE_AFTERMATH_VOID (raise_stakes, previously only paired with curiosityDelta, now paired with suspenseDelta), RHYTHM_REVELATION_RELATIONAL_AFTERMATH_VOID (revelation, previously only paired with emotionalShift, now paired with relationshipShifts), and RHYTHM_PAYOFF_CURIOSITY_AFTERMATH_VOID (payoffSetupIds, previously only paired with emotionalShift, now paired with curiosityDelta).

Rules named in this wave's header:

- `RHYTHM_PAYOFF_CURIOSITY_AFTERMATH_VOID`
- `RHYTHM_REVELATION_RELATIONAL_AFTERMATH_VOID`
- `RHYTHM_STAKES_SUSPENSE_AFTERMATH_VOID`

## Wave 988

Wave 988 additions: re-auditing the zone-cluster/drought-run rule inventory turned up three consistent-predicate trio-complete signals that Wave 974's exhaustion claim missed — they carry this pass's generic "_SIGNAL" naming (DIALOGUE_SIGNAL, PAYOFF_SIGNAL, RELATIONAL_SIGNAL) rather than a descriptive prefix, so they didn't surface in that wave's search. DIALOGUE_SIGNAL_ZONE_IMBALANCE (dialogueHighlights array), PAYOFF_SIGNAL_ZONE_IMBALANCE (payoffSetupIds array), and RELATIONAL_SIGNAL_ZONE_IMBALANCE (relationshipShifts array) complete their trios with the 4-zone bloat+empty-zone mode. (CLOCK_SIGNAL was checked and excluded: its cluster/drought rules audit two different fields — clockDelta > 0 vs clockRaised === true — under the same name prefix, so it isn't a real trio.)

Rules named in this wave's header:

- `DIALOGUE_SIGNAL_ZONE_IMBALANCE`
- `PAYOFF_SIGNAL_ZONE_IMBALANCE`
- `RELATIONAL_SIGNAL_ZONE_IMBALANCE`

## Wave 974

Wave 974 additions: with the zone-imbalance mode now exhausted for this pass, pivots to the sequence/aftermath mode via checkAftermathVoid, adding three trigger→aftermath pairings beyond the pass's sole existing one (REVELATION_SIGNAL_AFTERMATH_FLAT: revelation → emotional): RHYTHM_TURN_RELATIONAL_AFTERMATH_VOID (dramatic-turn → relational), RHYTHM_PAYOFF_EMOTIONAL_AFTERMATH_VOID (payoff → emotional), and RHYTHM_STAKES_CURIOSITY_AFTERMATH_VOID (raise_stakes → curiosity) — each a distinct trigger/output pairing proving decoupling.

Rules named in this wave's header:

- `RHYTHM_PAYOFF_EMOTIONAL_AFTERMATH_VOID`
- `RHYTHM_STAKES_CURIOSITY_AFTERMATH_VOID`
- `RHYTHM_TURN_RELATIONAL_AFTERMATH_VOID`

## Wave 960

Wave 960 additions: auditing the three remaining trio-complete signals in this pass, spanning three distinct classes: RHYTHM_CURIOSITY_ZONE_IMBALANCE (curiosityDelta > 0 — the question-raising delta beside Wave 946's suspense one), RHYTHM_REVELATION_ZONE_IMBALANCE (revelation != null — the revelation string field), and RHYTHM_REVELATION_PURPOSE_ZONE_IMBALANCE (purpose === 'revelation', whose trio was completed in Wave 932 — the purpose enum, distinct from the string-field rule).

Rules named in this wave's header:

- `RHYTHM_CURIOSITY_ZONE_IMBALANCE`
- `RHYTHM_REVELATION_PURPOSE_ZONE_IMBALANCE`
- `RHYTHM_REVELATION_ZONE_IMBALANCE`

## Wave 946

Wave 946 additions: extending the checkZoneImbalance rollout to three more trio-complete signals spanning three distinct signal classes: RHYTHM_STAKES_ZONE_IMBALANCE (purpose === 'raise_stakes' — purpose value), RHYTHM_POSITIVE_EMOTION_ZONE_IMBALANCE (emotionalShift === 'positive', the positive-valence mirror of Wave 918's negative one), and RHYTHM_SUSPENSE_ZONE_IMBALANCE (suspenseDelta > 0 — tension-delta magnitude).

Rules named in this wave's header:

- `RHYTHM_POSITIVE_EMOTION_ZONE_IMBALANCE`
- `RHYTHM_STAKES_ZONE_IMBALANCE`
- `RHYTHM_SUSPENSE_ZONE_IMBALANCE`

## Wave 932

Wave 932 additions: purpose === 'revelation' has never been referenced anywhere in this pass (the pre-existing RHYTHM_REVELATION_ZONE_CLUSTER/DROUGHT_RUN audit the separate revelation string|null field, not this purpose enum value) -- a genuinely virgin field. This wave adds RHYTHM_REVELATION_PURPOSE_ZONE_CLUSTER and RHYTHM_REVELATION_PURPOSE_DROUGHT_RUN (peak mode conventionally skipped for this categorical field), plus RHYTHM_COMPLICATE_ZONE_IMBALANCE, continuing the checkZoneImbalance rollout: purpose === 'complicate' had its 3-zone/run trio completed in Wave 918 but has never been audited by the 4-zone bloat+empty-zone mode.

Rules named in this wave's header:

- `RHYTHM_COMPLICATE_ZONE_IMBALANCE`
- `RHYTHM_REVELATION_PURPOSE_DROUGHT_RUN`
- `RHYTHM_REVELATION_PURPOSE_ZONE_CLUSTER`

## Wave 918

Wave 918 additions: purpose === 'complicate' has never been referenced anywhere in this pass -- a genuinely virgin field. This wave adds RHYTHM_COMPLICATE_ZONE_CLUSTER and RHYTHM_COMPLICATE_DROUGHT_RUN (peak mode conventionally skipped for this categorical field), plus RHYTHM_NEGATIVE_EMOTION_ZONE_IMBALANCE, extending the 4-zone checkZoneImbalance mode to the emotionalShift valence signal: emotionalShift === 'negative' already has a complete 3-zone/run-based trio (RHYTHM_NEGATIVE_EMOTION_ZONE_CLUSTER + _DROUGHT_RUN) but has never been audited by it.

Rules named in this wave's header:

- `RHYTHM_COMPLICATE_DROUGHT_RUN`
- `RHYTHM_COMPLICATE_ZONE_CLUSTER`
- `RHYTHM_NEGATIVE_EMOTION_ZONE_IMBALANCE`

## Wave 904

Wave 904 additions: continuing the checkZoneImbalance rollout begun in Wave 890, this wave applies the 4-zone bloat+empty-zone mode to three more purpose values that each already have a complete 3-zone/run-based trio (checkZoneCluster + checkDroughtRun) but have never been audited by it: RHYTHM_TURNING_POINT_ZONE_IMBALANCE (purpose === 'turning_point'), RHYTHM_INTRODUCE_CONFLICT_ZONE_IMBALANCE (purpose === 'introduce_conflict'), and RHYTHM_CHARACTER_MOMENT_ZONE_IMBALANCE (purpose === 'character_moment').

Rules named in this wave's header:

- `RHYTHM_CHARACTER_MOMENT_ZONE_IMBALANCE`
- `RHYTHM_INTRODUCE_CONFLICT_ZONE_IMBALANCE`
- `RHYTHM_TURNING_POINT_ZONE_IMBALANCE`

## Wave 890

Wave 890 additions: the distinct 4-zone checkZoneImbalance mode had only ever been applied to raise_stakes and seededClueIds in this pass. This wave applies it to three more purpose values with complete 3-zone/run-based trios: RHYTHM_CLIMAX_ZONE_IMBALANCE (purpose === 'climax'), RHYTHM_ESTABLISH_WORLD_ZONE_IMBALANCE (purpose === 'establish_world'), and RHYTHM_RESOLUTION_ZONE_IMBALANCE (purpose === 'resolution').

Rules named in this wave's header:

- `RHYTHM_CLIMAX_ZONE_IMBALANCE`
- `RHYTHM_ESTABLISH_WORLD_ZONE_IMBALANCE`
- `RHYTHM_RESOLUTION_ZONE_IMBALANCE`

## Wave 876

Wave 876 additions: RHYTHM_CLIMAX_DROUGHT_RUN (run-based x purpose === 'climax' absence -- completes 2 of 3 slots for this purpose value alongside the zone-cluster mode added in Wave 862; peak mode conventionally skipped for this categorical field), RHYTHM_ESTABLISH_WORLD_DROUGHT_RUN (run-based x purpose === 'establish_world' absence -- completes 2 of 3 slots for this purpose value alongside the zone-cluster mode added in Wave 862; peak mode conventionally skipped for this categorical field), RHYTHM_RESOLUTION_DROUGHT_RUN (run-based x purpose === 'resolution' absence -- completes 2 of 3 slots for this purpose value alongside the zone-cluster mode added in Wave 862; peak mode conventionally skipped for this categorical field).

Rules named in this wave's header:

- `RHYTHM_CLIMAX_DROUGHT_RUN`
- `RHYTHM_ESTABLISH_WORLD_DROUGHT_RUN`
- `RHYTHM_RESOLUTION_DROUGHT_RUN`

## Wave 862

Wave 862 additions: RHYTHM_ESTABLISH_WORLD_ZONE_CLUSTER (distribution/timing x purpose === 'establish_world' x structural thirds -- this purpose value has never been referenced anywhere in this pass; a virgin field), RHYTHM_CLIMAX_ZONE_CLUSTER (distribution/timing x purpose === 'climax' x structural thirds -- likewise a virgin field, never referenced in this pass before), RHYTHM_RESOLUTION_ZONE_CLUSTER (distribution/timing x purpose === 'resolution' x structural thirds -- likewise a virgin field, never referenced in this pass before).

Rules named in this wave's header:

- `RHYTHM_CLIMAX_ZONE_CLUSTER`
- `RHYTHM_ESTABLISH_WORLD_ZONE_CLUSTER`
- `RHYTHM_RESOLUTION_ZONE_CLUSTER`

## Wave 848

Wave 848 additions: RHYTHM_STAKES_DROUGHT_RUN (run-based × purpose === 'raise_stakes' absence — completes 2 of 3 slots for this purpose value alongside the zone-cluster mode added in Wave 834; peak mode conventionally skipped for this categorical field), RHYTHM_INTRODUCE_CONFLICT_DROUGHT_RUN (run-based × purpose === 'introduce_conflict' absence — completes 2 of 3 slots for this purpose value alongside the zone-cluster mode added in Wave 834; peak mode conventionally skipped for this categorical field), RHYTHM_POSITIVE_EMOTION_DROUGHT_RUN (run-based × emotionalShift === 'positive' absence — completes 2 of 3 slots for this valence alongside the zone-cluster mode added in Wave 834; peak mode conventionally skipped for this categorical field).

Rules named in this wave's header:

- `RHYTHM_INTRODUCE_CONFLICT_DROUGHT_RUN`
- `RHYTHM_POSITIVE_EMOTION_DROUGHT_RUN`
- `RHYTHM_STAKES_DROUGHT_RUN`

## Wave 834

Wave 834 additions: RHYTHM_STAKES_ZONE_CLUSTER (distribution/timing × purpose === 'raise_stakes' × structural thirds — the existing STAKES_ZONE_IMBALANCE is an underweight/bloat four-zone check on this purpose value; none of the three shared-library trio modes has ever been applied to it), RHYTHM_INTRODUCE_CONFLICT_ZONE_CLUSTER (distribution/timing × purpose === 'introduce_conflict' × structural thirds — this purpose value has never been referenced anywhere in this pass; a virgin field), RHYTHM_POSITIVE_EMOTION_ZONE_CLUSTER (distribution/ timing × emotionalShift === 'positive' × structural thirds — mirrors the completed negative-valence trio; the positive valence has never been isolated by any of the three shared-library trio modes in this pass).

Rules named in this wave's header:

- `RHYTHM_INTRODUCE_CONFLICT_ZONE_CLUSTER`
- `RHYTHM_POSITIVE_EMOTION_ZONE_CLUSTER`
- `RHYTHM_STAKES_ZONE_CLUSTER`
- `STAKES_ZONE_IMBALANCE`

## Wave 820

Wave 820 additions: RHYTHM_CHARACTER_MOMENT_DROUGHT_RUN (run-based × purpose === 'character_moment' absence — completing 2 of 3 slots for this purpose value alongside the zone-cluster mode added in Wave 806; peak mode conventionally skipped for this categorical field), RHYTHM_TURNING_POINT_ZONE_CLUSTER (distribution/timing × purpose === 'turning_point' × structural thirds — this purpose value has never been referenced anywhere in this pass; none of the three shared-library trio modes has ever been applied to it), RHYTHM_TURNING_POINT_DROUGHT_RUN (run-based × purpose === 'turning_point' absence — completing 2 of 3 slots for this purpose value alongside the zone-cluster mode added in this same wave; peak mode conventionally skipped for this categorical field).

Rules named in this wave's header:

- `RHYTHM_CHARACTER_MOMENT_DROUGHT_RUN`
- `RHYTHM_TURNING_POINT_DROUGHT_RUN`
- `RHYTHM_TURNING_POINT_ZONE_CLUSTER`

## Wave 806

Wave 806 additions: RHYTHM_NEGATIVE_EMOTION_ZONE_CLUSTER (distribution/timing × emotionalShift === 'negative' × structural thirds — the existing EMOTIONAL_SIGNAL_ZONE_CLUSTER and RHYTHM_EMOTION_DROUGHT_RUN [Wave 652] both operate on the 'positive' valence; the 'negative' valence has never been isolated on its own by any of the three trio modes), RHYTHM_NEGATIVE_EMOTION_DROUGHT_RUN (run-based × emotionalShift === 'negative' absence — completing 2 of 3 slots for this valence alongside the zone-cluster mode added in this same wave; peak mode conventionally skipped for this categorical field), RHYTHM_CHARACTER_MOMENT_ZONE_CLUSTER (distribution/timing × purpose === 'character_moment' × structural thirds — this purpose value has never been referenced anywhere in this pass; none of the three shared-library trio modes has ever been applied to it).

Rules named in this wave's header:

- `RHYTHM_CHARACTER_MOMENT_ZONE_CLUSTER`
- `RHYTHM_NEGATIVE_EMOTION_DROUGHT_RUN`
- `RHYTHM_NEGATIVE_EMOTION_ZONE_CLUSTER`

## Wave 792

Wave 792 additions: RHYTHM_SUSPENSE_PEAK_UNCAUSED (backward-cause × suspenseDelta-as-magnitude × 2-scene lookback — completes the trio for suspenseDelta alongside the zone-cluster mode (Wave 764) and the run-based drought mode (Wave 778); the backward-cause peak mode has never been applied to it), RHYTHM_CURIOSITY_PEAK_UNCAUSED (backward-cause × curiosityDelta-as-magnitude × 2-scene lookback — completes the trio for curiosityDelta alongside the run-based drought mode (Wave 764) and the zone-cluster mode (Wave 778); the backward-cause peak mode has never been applied to it), RHYTHM_REVELATION_ZONE_CLUSTER (distribution/timing × revelation × structural thirds — completes the trio for revelation alongside the backward-cause peak mode (Wave 764) and the run-based drought mode (Wave 778); the zone-cluster mode has never been applied to it).

Rules named in this wave's header:

- `RHYTHM_CURIOSITY_PEAK_UNCAUSED`
- `RHYTHM_REVELATION_ZONE_CLUSTER`
- `RHYTHM_SUSPENSE_PEAK_UNCAUSED`

## Wave 778

Wave 778 additions: RHYTHM_SUSPENSE_DROUGHT_RUN (run-based × suspenseDelta>0 absence — Wave 764 applied the zone-cluster mode to suspenseDelta; the drought-run mode has never been applied to it), RHYTHM_CURIOSITY_ZONE_CLUSTER (distribution/timing × curiosityDelta>0 presence × structural thirds — Wave 764 applied the run-based drought mode to curiosityDelta; the zone-cluster mode has never been applied to it), RHYTHM_REVELATION_DROUGHT_RUN (run-based × revelation absence — Wave 764 applied the backward-cause peak mode to revelation; the run-based drought mode has never been applied to it).

Rules named in this wave's header:

- `RHYTHM_CURIOSITY_ZONE_CLUSTER`
- `RHYTHM_REVELATION_DROUGHT_RUN`
- `RHYTHM_SUSPENSE_DROUGHT_RUN`

## Wave 764

Wave 764 additions: RHYTHM_SUSPENSE_ZONE_CLUSTER (distribution/timing × suspenseDelta>0 presence × structural thirds — suspenseDelta has only ever anchored the average/aggregate flatline check (SUSPENSE_SIGNAL_FLATLINE) in this pass; none of the three shared-library trio modes has ever been applied to it), RHYTHM_CURIOSITY_DROUGHT_RUN (run-based × curiosityDelta>0 absence — curiosityDelta has only ever anchored the average/aggregate flatline check and served as the secondary signal in a co-occurrence-decoupling check; none of the three shared-library trio modes has ever been applied to it), RHYTHM_REVELATION_PEAK_UNCAUSED (backward-cause × revelation-as-magnitude × 2-scene lookback — revelation has only ever served as a hasCause predicate for other signals' peak-uncaused checks in this pass; none of the three shared-library trio modes has ever been applied to revelation itself as the primary signal. hasCause here deliberately references only dramaticTurn, never revelation, to avoid a circular/self-referential audit).

Rules named in this wave's header:

- `RHYTHM_CURIOSITY_DROUGHT_RUN`
- `RHYTHM_REVELATION_PEAK_UNCAUSED`
- `RHYTHM_SUSPENSE_ZONE_CLUSTER`
- `SUSPENSE_SIGNAL_FLATLINE`

## Wave 750

Wave 750 additions: RHYTHM_CLOCK_ZONE_CLUSTER (distribution/timing × clockRaised === true × structural thirds — Wave 624 applied the run-based drought mode to clockRaised; the zone-cluster mode has never been applied to it), RHYTHM_EMOTION_DROUGHT_RUN (run-based × emotionalShift === 'positive' absence — Wave 652 applied the zone-cluster mode to this signal; the drought-run mode has never been applied to it), RHYTHM_TURN_DROUGHT_RUN (run-based × dramaticTurn !== 'nothing' absence — Wave 666 applied the zone-cluster mode to this signal; the drought-run mode has never been applied to it).

Rules named in this wave's header:

- `RHYTHM_CLOCK_ZONE_CLUSTER`
- `RHYTHM_EMOTION_DROUGHT_RUN`
- `RHYTHM_TURN_DROUGHT_RUN`

## Wave 736

Wave 736 additions: RHYTHM_CLOCK_DELTA_DROUGHT_RUN (run-based × clockDelta≠0 absence — Waves 610/722 applied the backward-cause peak and zone-cluster modes to clockDelta; the drought-run mode has never been applied to it, completing the trio), RHYTHM_STAGING_ZONE_CLUSTER (distribution/timing × visualBeats × structural thirds — Waves 652/722 applied the run-based drought and backward-cause peak modes to visualBeats; the zone-cluster mode has never been applied to it, completing the trio), RHYTHM_OPEN_THREAD_ZONE_CLUSTER (distribution/timing × unresolvedClues × structural thirds — Waves 680/722 applied the run-based drought and backward-cause peak modes to unresolvedClues; the zone-cluster mode has never been applied to it, completing the trio).

Rules named in this wave's header:

- `RHYTHM_CLOCK_DELTA_DROUGHT_RUN`
- `RHYTHM_OPEN_THREAD_ZONE_CLUSTER`
- `RHYTHM_STAGING_ZONE_CLUSTER`

## Wave 722

Wave 722 additions: CLOCK_SIGNAL_ZONE_CLUSTER (distribution/timing × clockDelta>0 × structural thirds — Wave 610 applied the backward-cause peak mode to clockDelta; the zone-cluster mode has never been applied to it), UNRESOLVED_SIGNAL_PEAK_UNCAUSED (single-peak isolation/backward-cause × unresolvedClues magnitude — Waves 638/652/680 applied co-occurrence-decoupling and drought-run modes to unresolvedClues; the backward-cause peak mode has never been applied to it), STAGING_SIGNAL_PEAK_UNCAUSED (single-peak isolation/backward-cause × visualBeats magnitude — Wave 652 applied the drought-run mode to visualBeats; the backward-cause peak mode has never been applied to it).

Rules named in this wave's header:

- `CLOCK_SIGNAL_ZONE_CLUSTER`
- `STAGING_SIGNAL_PEAK_UNCAUSED`
- `UNRESOLVED_SIGNAL_PEAK_UNCAUSED`

## Wave 708

Wave 708 additions: DIALOGUE_SIGNAL_ZONE_CLUSTER (distribution/timing × dialogueHighlights × structural thirds — Waves 666/694 applied the backward-cause peak and drought-run modes to dialogueHighlights; the zone-cluster mode has never been applied to it, completing the channel's coverage), SEED_SIGNAL_PEAK_UNCAUSED (single-peak isolation/backward-cause × seededClueIds magnitude — Waves 624/666/694 applied four-zone imbalance, drought-run, and zone-cluster modes to seededClueIds; the backward-cause peak mode has never been applied to it, completing the channel's coverage), PAYOFF_SIGNAL_DROUGHT_RUN (run-based × payoffSetupIds absence — Waves 638/680 applied the zone-cluster and backward-cause peak modes to payoffSetupIds; the drought-run mode has never been applied to it, completing the channel's coverage).

Rules named in this wave's header:

- `DIALOGUE_SIGNAL_ZONE_CLUSTER`
- `PAYOFF_SIGNAL_DROUGHT_RUN`
- `SEED_SIGNAL_PEAK_UNCAUSED`

## Wave 694

Wave 694 additions: RELATIONAL_SIGNAL_PEAK_UNCAUSED (single-peak isolation/backward-cause × relationshipShifts magnitude — Waves 610/680 applied the drought-run and zone-cluster modes to relationshipShifts; the backward-cause peak mode has never been applied to it, completing the channel's coverage), SEED_SIGNAL_ZONE_CLUSTER (distribution/timing × seededClueIds × structural thirds — distinct from Wave 624's four-zone SEED_SIGNAL_ZONE_IMBALANCE and Wave 666's SEED_SIGNAL_DROUGHT_RUN; a thirds-based concentration measure never applied to this channel), DIALOGUE_SIGNAL_DROUGHT_RUN (run-based × dialogueHighlights absence — Wave 666 applied the backward-cause peak mode to dialogueHighlights, and Waves 624/638 paired it in co-occurrence checks; the run-based drought mode has never been applied to it, completing the channel's coverage).

Rules named in this wave's header:

- `DIALOGUE_SIGNAL_DROUGHT_RUN`
- `RELATIONAL_SIGNAL_PEAK_UNCAUSED`
- `SEED_SIGNAL_ZONE_CLUSTER`

## Wave 680

Wave 680 additions: PAYOFF_SIGNAL_PEAK_UNCAUSED (single-peak isolation/backward-cause × payoffSetupIds magnitude — the peak-uncaused mode had only been applied to clockDelta and dialogueHighlights; payoffSetupIds itself has only ever been zone-cluster-audited), OPEN_THREAD_SIGNAL_DROUGHT_RUN (run-based × unresolvedClues absence — unresolvedClues has only ever anchored two decoupled checks; the drought-run mode applied to this channel for the first time), RELATIONAL_SIGNAL_ZONE_CLUSTER (distribution/timing × relationshipShifts × structural thirds — Wave 610's RELATIONAL_SIGNAL_DROUGHT_RUN applied the drought-run mode to relationshipShifts; the zone-cluster mode has never been applied to this channel).

Rules named in this wave's header:

- `OPEN_THREAD_SIGNAL_DROUGHT_RUN`
- `PAYOFF_SIGNAL_PEAK_UNCAUSED`
- `RELATIONAL_SIGNAL_ZONE_CLUSTER`

## Wave 666

Wave 666 additions: DIALOGUE_SIGNAL_PEAK_UNCAUSED (single-peak isolation/backward-cause × dialogueHighlights magnitude — the peak-uncaused mode had only been applied to clockDelta [Wave 610]; the scene with the most highlighted lines has no dramatic turn or revelation in itself or the two scenes before it), SEED_SIGNAL_DROUGHT_RUN (run-based × seededClueIds absence — the drought-run mode has been applied to relationshipShifts/clockRaised/visualBeats but never to the seed channel, which so far has only been zone-imbalance-audited), TURN_SIGNAL_ZONE_CLUSTER (distribution/timing × dramaticTurn presence × structural thirds — the zone-cluster mode had only been applied to payoffSetupIds and emotionalShift; dramaticTurn itself has never been cluster-audited despite anchoring an aftermath-void check already).

Rules named in this wave's header:

- `DIALOGUE_SIGNAL_PEAK_UNCAUSED`
- `SEED_SIGNAL_DROUGHT_RUN`
- `TURN_SIGNAL_ZONE_CLUSTER`

## Wave 652

Wave 652 additions: this 110-rule pass already imports all six shared-checks-library templates, so distinctness comes from applying each template to a channel it has never touched. EMOTIONAL_SIGNAL_ZONE_CLUSTER (distribution/timing × emotionalShift-positive × structural thirds — the zone-cluster mode had only been applied to payoffSetupIds; positive-emotion scenes concentrating in one third is a distinct rhythm imbalance), STAGING_SIGNAL_DROUGHT_RUN (run-based × visualBeats absence — the drought-run mode had only been applied to relationshipShifts and clockRaised; a long unbroken stretch of zero physical staging is a distinct rhythm gap), OPEN_THREAD_CURIOSITY_SIGNAL_DECOUPLED (co-occurrence/decoupling × unresolvedClues × curiosityDelta>0 — Wave 638's OPEN_THREAD_SIGNAL_DECOUPLED paired unresolvedClues with dialogueHighlights; this crosses the same open-thread signal with the curiosity channel instead, a pairing never tried in this pass).

Rules named in this wave's header:

- `EMOTIONAL_SIGNAL_ZONE_CLUSTER`
- `OPEN_THREAD_CURIOSITY_SIGNAL_DECOUPLED`
- `STAGING_SIGNAL_DROUGHT_RUN`

## Wave 638

Wave 638 additions: PAYOFF_SIGNAL_ZONE_CLUSTER (distribution/timing × payoffSetupIds × structural thirds — first use of both the zone-cluster mode and the payoffSetupIds field on records in this 107-rule pass), OPEN_THREAD_SIGNAL_DECOUPLED (co-occurrence/decoupling × unresolvedClues × dialogueHighlights — first use of unresolvedClues in this pass), DRAMATIC_TURN_PAYOFF_AFTERMATH_VOID (sequence/aftermath × dramaticTurn trigger → payoffSetupIds absence — first pairing of these two fields).

Rules named in this wave's header:

- `DRAMATIC_TURN_PAYOFF_AFTERMATH_VOID`
- `OPEN_THREAD_SIGNAL_DECOUPLED`
- `PAYOFF_SIGNAL_ZONE_CLUSTER`

## Wave 624

Wave 624 additions: VERBAL_STAGING_SIGNAL_DECOUPLED (co-occurrence/decoupling × dialogueHighlights × visualBeats — first use of either field in this 104-rule pass, and the first co-occurrence/decoupling mode applied to records here), SEED_SIGNAL_ZONE_IMBALANCE (underweight/bloat × seededClueIds × four structural zones — first use of seededClueIds in this pass), CLOCK_SIGNAL_DROUGHT_RUN (run-based × clockRaised absence — first use of clockRaised in this pass).

Rules named in this wave's header:

- `CLOCK_SIGNAL_DROUGHT_RUN`
- `SEED_SIGNAL_ZONE_IMBALANCE`
- `VERBAL_STAGING_SIGNAL_DECOUPLED`

## Wave 610

Wave 610 additions: RELATIONAL_SIGNAL_DROUGHT_RUN (run-based × relationshipShifts absence — first use of relationshipShifts anywhere in this 101-rule pass), CLOCK_SIGNAL_PEAK_UNCAUSED (backward-cause × clockDelta peak × dramaticTurn cause — first use of clockDelta and dramaticTurn in this pass), REVELATION_SIGNAL_AFTERMATH_FLAT (sequence/aftermath × revelation trigger → emotionalShift absence — first use of revelation and emotionalShift in this pass). Continues the Wave 596 "narrative signal rhythm" extension with three modes not yet used on records here (run-based, backward-cause, sequence/aftermath, vs. Wave 596's average/aggregate and underweight/bloat).

Rules named in this wave's header:

- `CLOCK_SIGNAL_PEAK_UNCAUSED`
- `RELATIONAL_SIGNAL_DROUGHT_RUN`
- `REVELATION_SIGNAL_AFTERMATH_FLAT`

## Wave 596

Wave 596 additions: suspense signal flatline, curiosity signal flatline (record-based analogs of this file's own MONOTONOUS_RHYTHM/ACTION_WORDCOUNT_FLATLINE shape — n≥8, fewer than 20% of scenes deviate from the average suspenseDelta/curiosityDelta by more than 30% of that average — but applied to the story's own structural tension/wonder signal rather than sentence word count; this pass had never destructured `records` at all before this wave — all 98 prior rules operate purely on fountain text; distinct from each other only by channel, exactly as MONOTONOUS_RHYTHM and ACTION_WORDCOUNT_FLATLINE already coexist in this file differentiated only by measure), stakes zone imbalance (underweight/bloat × purpose === 'raise_stakes' × four structural zones, built on checkZoneImbalance from the shared checks library — audit M2.2, its third use across passes after payoff.ts's seed channel and relationship-arc.ts's shift channel — n≥10, ≥4 stakes-raise scenes; fires only when one zone has zero stakes-raises while another holds ≥50% of the total).

Rules named in this wave's header:

- `ACTION_WORDCOUNT_FLATLINE`

## Wave 582

Wave 582 additions: action long single sentence (co-occurrence × long word count ≥12w × 1-sentence structure — ≥8 action lines, ≥4 long lines, >70% of those long lines are single-sentence; verbose density without clause structure; distinct from SINGLE_SENTENCE_FLOOD which tests all lines globally, SENTENCE_COUNT_PEAK which isolates the max-sentence outlier, and LONG_LINE_FLOOD which counts proportion without examining sentence structure), action shortest outlier (single-peak isolation × word count × floor valley — ≥8 action lines, avgWords > 5, shortest line ≤2 words and ≤25% of avgWords; the floor counterpart of LONGEST_ACTION_OUTLIER; distinct from CONSECUTIVE_SHORT_RUN [run-based], SHORT_LINE_POVERTY [scarcity], and MONOTONOUS_RHYTHM [variance]), action medium opening absent (zone presence/absence × medium channel 5–11w × opening 25% — ≥12 action lines, ≥4 medium lines in rest but none in opening 25%; completes the medium-channel cell in the zone × opening row alongside OPENING_SHORT_ABSENT [short channel] and OPENING_LONG_ABSENT [long channel]; distinct from all same-zone checks on other channels and from ACTION_CONSECUTIVE_MEDIUM_RUN [run-based]).

Rules named in this wave's header:

- `ACTION_CONSECUTIVE_MEDIUM_RUN`
- `MONOTONOUS_RHYTHM`

## Wave 568

Wave 568 additions: action long thirds cluster (distribution/timing × long ≥12w × structural thirds — ≥9 action lines, ≥4 long lines, >75% in a single even-third; the descriptive register ghettoized into one zone; distinct from the 25/50/25 zone-ABSENCE checks [absence not over-concentration] and from ACTION_DENSITY_PEAK_EARLY/LATE [density peak position]), action short thirds cluster (distribution/timing × short ≤4w × structural thirds — the short-line sibling, staccato compression confined to one zone; distinct from CONSECUTIVE_SHORT_RUN [contiguous run] and SHORT_LINE_POVERTY [scarcity]), action alternation run (run-based × strict short↔long alternation — ≥6 consecutive lines swapping ≤4w/≥12w every line; a mechanical see-saw, the over-regular kind of monotony; distinct from the monotonic ASCENT/DESCENT runs, the same-channel CONSECUTIVE runs, and ACTION_SHORTLONG_SEGREGATED [separation, the structural opposite]).

Rules named in this wave's header:

- `ACTION_DENSITY_PEAK_EARLY`
- `ACTION_SHORTLONG_SEGREGATED`
- `SHORT_LINE_POVERTY`

## Wave 554

Wave 554 additions: action long beat uncaused (backward-cause × long channel — ≥3 long ≥12w lines after position 1 all lack a short ≤4w predecessor within 2 lines; long prose arrives without the compression that earns its density; backward-cause mirror of IMPACT_BEAT_UNCAUSED which checks the short→long direction), action sentence burst run (run-based × sentence count — 4+ consecutive action lines each containing ≥2 sentence-ending marks; a local multi-clause avalanche distinct from ACTION_SENTENCE_AVERAGE_HIGH which is a global average and from SENTENCE_COUNT_PEAK which isolates a single outlier), action punctuation desert (underweight/ bloat × comma × scarcity — ≥10 action lines with <15% containing any comma, locking the prose into subject-verb-object simplicity without dependent clauses or list structure; complement of ACTION_COMMA_DENSE_FLOOD which fires at >30% with ≥3 commas per line).

Rules named in this wave's header:

- `ACTION_COMMA_DENSE_FLOOD`
- `ACTION_SENTENCE_AVERAGE_HIGH`

## Wave 526

Wave 526 additions: action word-count ascent run (run-based × strictly increasing word count — 5+ consecutive action lines each longer than the prior; ascending mirror of ACTION_WORD_COUNT_DESCENT_RUN, distinguishing directional expansion from density-based CONSECUTIVE_LONG_RUN), action finale long absent (zone presence/absence × long channel ≥12w × finale 25% — no long line in the closing 25% while ≥3 exist in the first 75%; completes the zone × long-channel grid alongside OPENING_LONG_ABSENT and MIDDLE_LONG_ABSENT), action comma dense flood (proportion × comma-count ≥3 — >30% of ≥8 action lines carry 3+ commas each; list-heavy enumeration distinct from COMMA_SPLICE_OVERUSE clause-structure check and POLYSYNDETON_OVERLOAD coordinator chain).

Rules named in this wave's header:

- `ACTION_WORD_COUNT_DESCENT_RUN`
- `COMMA_SPLICE_OVERUSE`
- `POLYSYNDETON_OVERLOAD`

## Wave 512

Wave 512 additions: action middle short absent (zone presence/absence × short channel ≤4w × middle zone — middle 50% of action lines has no short line while ≥2 exist in the outer zones; completes the zone × short-channel grid alongside OPENING_SHORT_ABSENT and FINALE_SHORT_ABSENT, with the same zone-pairing logic as ACTION_MIDDLE_LONG_ABSENT but on the short channel), action word-count descent run (run-based × word count × strictly decreasing — 5+ consecutive action lines each strictly shorter than the prior, a sustained compression that risks becoming mechanical; distinct from CONSECUTIVE_SHORT_RUN which checks for short lines not decreasing sequence), action certainty adverb flood (proportion × certainty/stance adverbs — >20% of ≥8 action lines contain certainty adverbs like clearly/obviously/certainly/naturally, a narrator-voice intrusion that tells the audience what to conclude rather than showing the event; distinct from ADVERB_CLUSTERING which counts all adverbs, SUDDENLY_OVERUSE which is urgency register, and INTENSIFIER_FLOOD which is degree modifiers — this is the epistemic-stance register).

Rules named in this wave's header:

- `ADVERB_CLUSTERING`
- `INTENSIFIER_FLOOD`
- `SUDDENLY_OVERUSE`

## Wave 498

Wave 498 additions: opening long absent (zone presence/absence × long channel ≥12w × opening 25% — no long action line in the opening while ≥3 exist later; the opening-zone long companion to OPENING_SHORT_ABSENT, completing the opening-zone cell for the long-line channel; distinct from ACTION_MIDDLE_LONG_ABSENT which covers the middle zone), density peak late (distribution/ timing × word count × finale zone — the script's single longest action line ≥15w falls in the final 25% while ≥3 long lines ≥12w exist in the first 75%; the climax carries the most elaborate prose while the rest of the script is sparser; the late-zone mirror of DENSITY_PEAK_EARLY and distinct from ACTION_FINALE_BLOAT which compares zone averages rather than isolating the single peak), short multiclausal (co-occurrence × short word count × sentence-end punctuation — ≥4 action lines each ≤5 words yet containing ≥2 sentence-ending marks; fragment-stacking that breaks a single dramatic beat into clause splinters; distinct from ACTION_QUESTION_INTRUSION which counts any "?" in action and from CONSECUTIVE_SHORT_RUN which measures run length not clause structure).

Rules named in this wave's header:

- `ACTION_MIDDLE_LONG_ABSENT`
- `CONSECUTIVE_SHORT_RUN`

## Wave 456

Wave 456 additions: consecutive long run (run-based — 5+ consecutive action lines each ≥9 words; a dense-prose avalanche with no breathing room in a localized stretch, distinct from LONG_LINE_FLOOD which audits global proportion and ACTION_LONG_RECOVERY_ABSENT which checks aftermath per-line), opening short absent (zone presence/absence — the first 25% of action lines contain no short line ≤4 words while short lines exist in the rest; the opening rhythmic palette never samples the staccato register, leaving the reader without early contrast; fills the opening-zone cell alongside ACTION_FINALE_BLOAT's finale cell), sentence count peak (single-peak isolation × sentence count — the single action line with the most sentences has ≥5 sentences AND ≥3× the script-average sentence count; one action line packs five-beat clusters while all others are brief, distinct from SINGLE_SENTENCE_FLOOD which fires when ALL lines are one-sentence and from LONGEST_ACTION_OUTLIER which isolates the word-count peak rather than sentence-count peak).

Rules named in this wave's header:

- `ACTION_FINALE_BLOAT`
- `ACTION_LONG_RECOVERY_ABSENT`
- `LONGEST_ACTION_OUTLIER`
- `SINGLE_SENTENCE_FLOOD`

## Wave 428

Wave 428 additions: consecutive opener run (run-based — 5+ consecutive action lines all begin with the same first word, a local metronomic tic; distinct from all the global %-threshold opener checks which audit proportion across the whole script), action finale bloat (zone/ distribution — last 25% of action lines averages >1.4× the word count of the first 75%; prose density grows toward the climax instead of tightening as pace should accelerate), longest action outlier (single-peak isolation — the single longest action line is ≥25 words AND ≥4× the average word count; one gargantuan line dominates, distinct from LONG_LINE_FLOOD which audits a global proportion rather than isolating the single outlier).

Rules named in this wave's header:

- `LONG_LINE_FLOOD`

## Wave 414

Wave 414 additions: vague-quantifier overload (>25% of action lines lean on imprecise quantities — "some", "several", "a few", "many" — vagueness draining specificity from the staging; distinct from NUMBER_WORD_FLOOD, which flags the opposite over-precision of spelled numerals), atmosphere-abstraction overload (>25% of action lines name an abstract mood noun — "tension", "silence", "an air of menace" — telling the feeling instead of showing the image that produces it), color-description overload (>30% of action lines carry a color word — an over-saturated palette crowding the DP's domain; the upper-end complement of COLOR_ABSENCE).

Rules named in this wave's header:

- `COLOR_ABSENCE`
- `NUMBER_WORD_FLOOD`

## Unattributed (no explicit wave-header mention)

These rule constants exist in this pass but were not found, by exact-name match, inside any "Wave N —" / "Wave N additions:" header entry in the file — typically because they predate that convention hardening, or the header describes the check descriptively rather than by constant name (e.g. "talking heads" rather than `TALKING_HEADS`). Listed here honestly rather than guessed into a wave, with the nearest preceding in-code "── section title ──" comment as the best-available substitute context where one exists.

- `ABSTRACT_NOUN_OVERLOAD` — Wave 184: Abstract noun overload, filler gestures, gerund fragments
- `ACTION_ALTERNATION_RUN` — Wave 568: ACTION_LONG_THIRDS_CLUSTER, ACTION_SHORT_THIRDS_CLUSTER, ACTION_ALTERNATION_RUN
- `ACTION_CERTAINTY_ADVERB_FLOOD` — Wave 512: ACTION_MIDDLE_SHORT_ABSENT, ACTION_WORD_COUNT_DESCENT_RUN, ACTION_CERTAINTY_ADVERB_FLOOD
- `ACTION_CONSECUTIVE_LONG_RUN` — Wave 456: ACTION_CONSECUTIVE_LONG_RUN, ACTION_OPENING_SHORT_ABSENT, ACTION_SENTENCE_COUNT_PEAK
- `ACTION_DENSITY_PEAK_LATE` — Wave 498: ACTION_OPENING_LONG_ABSENT, ACTION_DENSITY_PEAK_LATE, ACTION_SHORT_MULTICLAUSAL
- `ACTION_FINALE_LONG_ABSENT` — Wave 526: ACTION_WORD_COUNT_ASCENT_RUN, ACTION_FINALE_LONG_ABSENT, ACTION_COMMA_DENSE_FLOOD
- `ACTION_FINALE_SHORT_ABSENT` — Wave 484: CONSECUTIVE_SHORT_RUN, ACTION_FINALE_SHORT_ABSENT, ACTION_SENTENCE_AVERAGE_HIGH
- `ACTION_IMPACT_BEAT_UNCAUSED` — Wave 470: ACTION_MIDDLE_LONG_ABSENT, ACTION_IMPACT_BEAT_UNCAUSED, ACTION_DENSITY_PEAK_EARLY
- `ACTION_LINE_WORD_FLOOR` — Wave 291: ACTION_LINE_WORD_FLOOR
- `ACTION_LONG_BEAT_UNCAUSED` — Wave 526: ACTION_WORD_COUNT_ASCENT_RUN, ACTION_FINALE_LONG_ABSENT, ACTION_COMMA_DENSE_FLOOD
- `ACTION_LONG_SINGLE_SENTENCE` — Wave 568: ACTION_LONG_THIRDS_CLUSTER, ACTION_SHORT_THIRDS_CLUSTER, ACTION_ALTERNATION_RUN
- `ACTION_LONG_THIRDS_CLUSTER` — Wave 568: ACTION_LONG_THIRDS_CLUSTER, ACTION_SHORT_THIRDS_CLUSTER, ACTION_ALTERNATION_RUN
- `ACTION_MEDIUM_OPENING_ABSENT` — Wave 568: ACTION_LONG_THIRDS_CLUSTER, ACTION_SHORT_THIRDS_CLUSTER, ACTION_ALTERNATION_RUN
- `ACTION_MIDDLE_SHORT_ABSENT` — Wave 512: ACTION_MIDDLE_SHORT_ABSENT, ACTION_WORD_COUNT_DESCENT_RUN, ACTION_CERTAINTY_ADVERB_FLOOD
- `ACTION_OPENING_LONG_ABSENT` — Wave 498: ACTION_OPENING_LONG_ABSENT, ACTION_DENSITY_PEAK_LATE, ACTION_SHORT_MULTICLAUSAL
- `ACTION_OPENING_SHORT_ABSENT` — Wave 456: ACTION_CONSECUTIVE_LONG_RUN, ACTION_OPENING_SHORT_ABSENT, ACTION_SENTENCE_COUNT_PEAK
- `ACTION_PARENTHESIS_ASIDE` — Wave 305: ACTION_PARENTHESIS_ASIDE
- `ACTION_PUNCTUATION_DESERT` — Wave 526: ACTION_WORD_COUNT_ASCENT_RUN, ACTION_FINALE_LONG_ABSENT, ACTION_COMMA_DENSE_FLOOD
- `ACTION_SENTENCE_BURST_RUN` — Wave 526: ACTION_WORD_COUNT_ASCENT_RUN, ACTION_FINALE_LONG_ABSENT, ACTION_COMMA_DENSE_FLOOD
- `ACTION_SENTENCE_COUNT_PEAK` — Wave 456: ACTION_CONSECUTIVE_LONG_RUN, ACTION_OPENING_SHORT_ABSENT, ACTION_SENTENCE_COUNT_PEAK
- `ACTION_SHORT_EXPANSION_ABSENT` — Wave 526: ACTION_WORD_COUNT_ASCENT_RUN, ACTION_FINALE_LONG_ABSENT, ACTION_COMMA_DENSE_FLOOD
- `ACTION_SHORT_MULTICLAUSAL` — Wave 498: ACTION_OPENING_LONG_ABSENT, ACTION_DENSITY_PEAK_LATE, ACTION_SHORT_MULTICLAUSAL
- `ACTION_SHORT_THIRDS_CLUSTER` — Wave 568: ACTION_LONG_THIRDS_CLUSTER, ACTION_SHORT_THIRDS_CLUSTER, ACTION_ALTERNATION_RUN
- `ACTION_SHORTEST_OUTLIER` — Wave 568: ACTION_LONG_THIRDS_CLUSTER, ACTION_SHORT_THIRDS_CLUSTER, ACTION_ALTERNATION_RUN
- `ACTION_WORD_COUNT_ASCENT_RUN` — Wave 526: ACTION_WORD_COUNT_ASCENT_RUN, ACTION_FINALE_LONG_ABSENT, ACTION_COMMA_DENSE_FLOOD
- `ACTION_WORD_COUNT_MODAL_LOCK` — Wave 526: ACTION_WORD_COUNT_ASCENT_RUN, ACTION_FINALE_LONG_ABSENT, ACTION_COMMA_DENSE_FLOOD
- `ARTICLE_OPENER_DOMINANCE` — Wave 386: COMMA_SPLICE_OVERUSE, ARTICLE_OPENER_DOMINANCE, CONNECTIVE_OPENER_OVERUSE
- `ATMOSPHERE_ABSTRACTION_OVERLOAD` — Wave 414: VAGUE_QUANTIFIER_OVERLOAD, ATMOSPHERE_ABSTRACTION_OVERLOAD, COLOR_DESCRIPTION_OVERLOAD
- `BODY_PART_OVERLOAD` — Wave 277: Body-part overload, single-sentence flood, ellipsis chain
- `CAMERA_DIRECTION_OVERREACH` — Wave 151: Camera-direction, adverb clustering, over-description
- `COLON_IN_ACTION` — Wave 358: COLON_IN_ACTION, SOUND_DESCRIPTION_OVERLOAD, INTENSIFIER_FLOOD
- `COLOR_DESCRIPTION_OVERLOAD` — Wave 414: VAGUE_QUANTIFIER_OVERLOAD, ATMOSPHERE_ABSTRACTION_OVERLOAD, COLOR_DESCRIPTION_OVERLOAD
- `CONJUNCTION_OPENER_EXCESS` — Wave 207: Conjunction opener excess, then-chain, exclamation in action
- `CONNECTIVE_OPENER_OVERUSE` — Wave 386: COMMA_SPLICE_OVERUSE, ARTICLE_OPENER_DOMINANCE, CONNECTIVE_OPENER_OVERUSE
- `CONSECUTIVE_OPENER_RUN` — Wave 428: CONSECUTIVE_OPENER_RUN, ACTION_FINALE_BLOAT, LONGEST_ACTION_OUTLIER
- `CURIOSITY_SIGNAL_FLATLINE` — Wave 568: ACTION_LONG_THIRDS_CLUSTER, ACTION_SHORT_THIRDS_CLUSTER, ACTION_ALTERNATION_RUN
- `DASH_CHAIN` — Wave 305: DASH_CHAIN
- `DECLARATIVE_PILE` — Wave 235: Declarative pile, simultaneous-action absent, motion-verb overload
- `ELLIPSIS_CHAIN` — Wave 277: Body-part overload, single-sentence flood, ellipsis chain
- `EXCLAMATION_IN_ACTION` — Wave 207: Conjunction opener excess, then-chain, exclamation in action
- `FILLER_GESTURE_EXCESS` — Wave 184: Abstract noun overload, filler gestures, gerund fragments
- `GERUND_FRAGMENT_CHAIN` — Wave 184: Abstract noun overload, filler gestures, gerund fragments
- `INTRACLAUSE_CADENCE_ABSENT` — Wave 207: Conjunction opener excess, then-chain, exclamation in action
- `LIGHT_DESCRIPTION_OVERLOAD` — Wave 330: WE_SEE_FLOOD, LIGHT_DESCRIPTION_OVERLOAD, SET_DRESSING_DOMINANCE
- `LINE_ENDING_REPETITION` — Wave 400: LONG_LINE_FLOOD, LINE_ENDING_REPETITION, PROGRESSIVE_VERB_OVERUSE
- `MID_LINE_EM_DASH_OVERUSE` — Wave 372: TRIADIC_LIST_OVERLOAD, MID_LINE_EM_DASH_OVERUSE, TEMPORAL_OPENER_OVERUSE
- `MOTION_VERB_OVERLOAD` — Wave 235: Declarative pile, simultaneous-action absent, motion-verb overload
- `NEAR_WORD_REPEAT` — Wave 170: Opening-word repetition, sensory imbalance, near-word repeat
- `NEGATION_ACTION_FLOOD` — Wave 305: NEGATION_ACTION_FLOOD
- `OPENING_WORD_REPETITION` — Wave 170: Opening-word repetition, sensory imbalance, near-word repeat
- `OVER_DESCRIPTION` — Wave 151: Camera-direction, adverb clustering, over-description
- `PASSIVE_VOICE_OVERUSE` — Passive voice: agentless constructions dilute cinematic drive
- `PHYSICAL_INTERIORITY_LEAK` — Wave 319: SUDDENLY_OVERUSE, PRONOUN_OPENER_DOMINANCE, PHYSICAL_INTERIORITY_LEAK
- `PREPOSITIONAL_OPENING_DOMINANCE` — Wave 291: PREPOSITIONAL_OPENING_DOMINANCE
- `PROGRESSIVE_VERB_OVERUSE` — Wave 400: LONG_LINE_FLOOD, LINE_ENDING_REPETITION, PROGRESSIVE_VERB_OVERUSE
- `PRONOUN_OPENER_DOMINANCE` — Wave 319: SUDDENLY_OVERUSE, PRONOUN_OPENER_DOMINANCE, PHYSICAL_INTERIORITY_LEAK
- `PROSE_LENGTH_RAMP` — Wave 207: Conjunction opener excess, then-chain, exclamation in action
- `PROSE_RHYTHM_BLOCKING` — Wave 207: Conjunction opener excess, then-chain, exclamation in action
- `QUESTION_IN_ACTION` — Wave 263: Question in action, simile excess, color absence
- `RUN_ON_ACTION` — Run-on action block: >5 consecutive long lines
- `SEMICOLON_IN_ACTION` — Wave 344: POLYSYNDETON_OVERLOAD, SEMICOLON_IN_ACTION, WEATHER_DESCRIPTION_OVERLOAD
- `SENSORY_IMBALANCE` — Wave 170: Opening-word repetition, sensory imbalance, near-word repeat
- `SET_DRESSING_DOMINANCE` — Wave 330: WE_SEE_FLOOD, LIGHT_DESCRIPTION_OVERLOAD, SET_DRESSING_DOMINANCE
- `SIMILE_EXCESS` — Wave 263: Question in action, simile excess, color absence
- `SIMULTANEOUS_ACTION_ABSENT` — Wave 235: Declarative pile, simultaneous-action absent, motion-verb overload
- `SOUND_DESCRIPTION_OVERLOAD` — Wave 358: COLON_IN_ACTION, SOUND_DESCRIPTION_OVERLOAD, INTENSIFIER_FLOOD
- `SPATIAL_ANCHOR_ABSENT` — Wave 249: Short line poverty, visual texture absent, spatial anchor absent
- `STACCATO_FRAGMENTATION` — Staccato: >4 consecutive very short lines
- `TEMPORAL_OPENER_OVERUSE` — Wave 372: TRIADIC_LIST_OVERLOAD, MID_LINE_EM_DASH_OVERUSE, TEMPORAL_OPENER_OVERUSE
- `THEN_CHAIN` — Wave 207: Conjunction opener excess, then-chain, exclamation in action
- `TRIADIC_LIST_OVERLOAD` — Wave 372: TRIADIC_LIST_OVERLOAD, MID_LINE_EM_DASH_OVERUSE, TEMPORAL_OPENER_OVERUSE
- `VAGUE_QUANTIFIER_OVERLOAD` — Wave 414: VAGUE_QUANTIFIER_OVERLOAD, ATMOSPHERE_ABSTRACTION_OVERLOAD, COLOR_DESCRIPTION_OVERLOAD
- `VISUAL_TEXTURE_ABSENT` — Wave 249: Short line poverty, visual texture absent, spatial anchor absent
- `WE_SEE_FLOOD` — Wave 330: WE_SEE_FLOOD, LIGHT_DESCRIPTION_OVERLOAD, SET_DRESSING_DOMINANCE
- `WEAK_VERB_CHAIN` — Weak-verb chains: "started to run", "began to speak"
- `WEATHER_DESCRIPTION_OVERLOAD` — Wave 344: POLYSYNDETON_OVERLOAD, SEMICOLON_IN_ACTION, WEATHER_DESCRIPTION_OVERLOAD

