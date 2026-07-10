# Pass: `character-arc`

Founding wave: 138. Total distinct rules: 225 (182 attributed to a specific wave, 43 unattributed — see docs/rulebook/README.md's methodology note).

## Wave 1177

Wave 1177 additions (continues the deliberate pivot away from sequence/aftermath begun in dialogue.ts Wave 1176): this pass had used checkAftermathVoid 46 times vs only 4 for co-occurrence/decoupling and zero for checkHalfLoaded, despite this file already having five hand-rolled FRONT_LOADED/BACK_LOADED checks (curiosity, emotional, payoff, relational, suspense) — proof the distribution/timing mode is valued here, just never routed through the shared helper. ARC_HIGHLIGHT_BACK_LOADED closes a real gap: dialogueHighlights has five other analytical modes applied to it (zone-cluster, zone-imbalance, peak-uncaused, drought-run, co-occurrence with visualBeats) but never a half-loaded distribution check, and it's the first use of checkHalfLoaded in this file. ARC_RELATIONAL_EMOTION_DECOUPLED and ARC_RELATIONAL_REVELATION_DECOUPLED mine co-occurrence/decoupling: this pass's central signal, relationshipShifts, had only ever been decoupling-checked against dialogueHighlights (Wave 603), curiosity (Wave 449), and suspense (Wave 463) — its co-occurrence with the felt-emotion and revelation channels was untested.

Rules named in this wave's header:

- `ARC_HIGHLIGHT_BACK_LOADED`
- `ARC_RELATIONAL_EMOTION_DECOUPLED`
- `ARC_RELATIONAL_REVELATION_DECOUPLED`

## Wave 1163

Wave 1163 additions: after Wave 1149, the positive-emotion trigger stood at three of six channels (relationshipShifts, curiosityDelta, suspenseDelta) and the negative-emotion trigger at two (relationshipShifts, curiosityDelta). ARC_POSITIVE_STAGING_AFTERMATH_VOID and ARC_POSITIVE_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID give the positive-emotion trigger its fourth and fifth channels (visualBeats, dialogueHighlights); ARC_NEGATIVE_SUSPENSE_AFTERMATH_VOID gives the negative-emotion trigger its third channel (suspenseDelta).

Rules named in this wave's header:

- `ARC_NEGATIVE_SUSPENSE_AFTERMATH_VOID`
- `ARC_POSITIVE_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID`
- `ARC_POSITIVE_STAGING_AFTERMATH_VOID`

## Wave 1149

Wave 1149 additions: with all eight main triggers (dramaticTurn, clockRaised, raise_stakes, payoffSetupIds, seededClueIds, revelation, unresolvedClues-debt, suspenseDelta) now fully saturated at six channels each, this wave advances the two secondary emotion-valence triggers (emotionalShift === 'positive'/'negative'), each of which stood at only one of six channels (ARC_POSITIVE_RELATIONAL_AFTERMATH_VOID, ARC_NEGATIVE_RELATIONAL_AFTERMATH_VOID, both Wave 477/547 — relational channel only). ARC_POSITIVE_CURIOSITY_AFTERMATH_VOID and ARC_POSITIVE_SUSPENSE_AFTERMATH_VOID give the positive-emotion trigger its second and third channels; ARC_NEGATIVE_CURIOSITY_AFTERMATH_VOID gives the negative-emotion trigger its second channel.

Rules named in this wave's header:

- `ARC_NEGATIVE_CURIOSITY_AFTERMATH_VOID`
- `ARC_NEGATIVE_RELATIONAL_AFTERMATH_VOID`
- `ARC_POSITIVE_CURIOSITY_AFTERMATH_VOID`
- `ARC_POSITIVE_SUSPENSE_AFTERMATH_VOID`

## Wave 1135

Wave 1135 additions: re-verifying against actual rule: names (not just a channel count), suspenseDelta-as-trigger was actually at five of the five non-self standard channels (curiosityDelta/relationshipShifts/emotionalShift/dialogueHighlights/visualBeats) after Wave 1121, not six as that wave's header stated — ARC_SUSPENSE_RECURRENCE_AFTERMATH_VOID adds the self-referential sixth channel (another suspenseDelta rise elsewhere), following the same self-pairing convention used for relationshipShifts-as-trigger triggers in other pass files. dramaticTurn-as-trigger was at four (emotionalShift/relationshipShifts/curiosityDelta/ suspenseDelta) — ARC_TURN_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID and ARC_TURN_STAGING_AFTERMATH_VOID give it its fifth and sixth channels (dialogueHighlights, visualBeats), completing full six-channel saturation for this trigger.

Rules named in this wave's header:

- `ARC_SUSPENSE_RECURRENCE_AFTERMATH_VOID`
- `ARC_TURN_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID`
- `ARC_TURN_STAGING_AFTERMATH_VOID`

## Wave 1121

Wave 1121 additions: with the six main triggers exhausted, this wave advances two secondary triggers that predate the shared checks library. suspenseDelta-as-trigger (Wave 575 origin) stood at five of six standard channels (curiosityDelta/relationshipShifts/emotionalShift/ dialogueHighlights) — ARC_SUSPENSE_STAGING_AFTERMATH_VOID gives it its sixth and final channel (visualBeats), completing saturation for this trigger. dramaticTurn-as-trigger (Wave 298 origin) had only emotionalShift (ARC_TURN_EMOTIONAL_AFTERMATH_VOID / ARC_DRAMATIC_TURN_EMOTIONAL_AFTERMATH_VOID) and relationshipShifts (ARC_DRAMATIC_TURN_RELATIONAL_AFTERMATH_VOID, immediate-next-scene only, not the shared library's 2-scene window) — ARC_TURN_CURIOSITY_AFTERMATH_VOID and ARC_TURN_SUSPENSE_AFTERMATH_VOID give it two fresh checkAftermathVoid channels (curiosityDelta, suspenseDelta), its first use of the shared library's 2-scene lookahead geometry rather than the file's earlier hand-rolled immediate-next-scene checks.

Rules named in this wave's header:

- `ARC_DRAMATIC_TURN_RELATIONAL_AFTERMATH_VOID`
- `ARC_SUSPENSE_STAGING_AFTERMATH_VOID`
- `ARC_TURN_CURIOSITY_AFTERMATH_VOID`
- `ARC_TURN_SUSPENSE_AFTERMATH_VOID`

## Wave 1107

Wave 1107 additions: ARC_REVELATION_STAGING_AFTERMATH_VOID gives revelation its sixth and final channel (previously paired with relationshipShifts/emotionalShift/curiosityDelta/ suspenseDelta/dialogueHighlights, now also paired with visualBeats), completing full six-channel saturation for all six of this pass's main triggers. ARC_SEED_RELATIONAL_AFTERMATH_VOID and ARC_SEED_STAGING_AFTERMATH_VOID give seededClueIds its fifth and sixth channels (previously paired with emotionalShift/dialogueHighlights/curiosityDelta/ suspenseDelta, now also paired with relationshipShifts and visualBeats respectively), completing full saturation for this trigger too.

Rules named in this wave's header:

- `ARC_REVELATION_STAGING_AFTERMATH_VOID`
- `ARC_SEED_RELATIONAL_AFTERMATH_VOID`
- `ARC_SEED_STAGING_AFTERMATH_VOID`

## Wave 1093

Wave 1093 additions: ARC_OPEN_THREAD_RELATIONAL_AFTERMATH_VOID gives heavy unresolvedClues debt its sixth checkAftermathVoid channel (previously paired with emotionalShift/visualBeats/ curiosityDelta/suspenseDelta/dialogueHighlights, now also paired with relationshipShifts), completing full coverage of the standard six-channel set for this trigger. ARC_CLOCK_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID gives clockRaised its sixth channel (previously paired with curiosityDelta/relationshipShifts/visualBeats/emotionalShift/suspenseDelta, now also paired with dialogueHighlights), completing the same for clockRaised. With unresolvedClues, clockRaised, raise_stakes, and payoffSetupIds now all effectively fully covered, ARC_REVELATION_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID gives revelation a fifth channel (previously paired with relationshipShifts/emotionalShift/curiosityDelta/suspenseDelta, now also paired with dialogueHighlights).

Rules named in this wave's header:

- `ARC_CLOCK_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID`
- `ARC_OPEN_THREAD_RELATIONAL_AFTERMATH_VOID`
- `ARC_REVELATION_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID`

## Wave 1079

Wave 1079 additions: ARC_STAKES_STAGING_AFTERMATH_VOID gives raise_stakes its sixth checkAftermathVoid channel (previously paired with relationshipShifts/curiosityDelta/ suspenseDelta/emotionalShift/dialogueHighlights, now also paired with visualBeats). ARC_PAYOFF_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID and ARC_OPEN_THREAD_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID each give payoffSetupIds and heavy unresolvedClues debt a fresh channel using dialogueHighlights — a field neither trigger has been paired with via checkAftermathVoid before in this pass.

Rules named in this wave's header:

- `ARC_OPEN_THREAD_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID`
- `ARC_PAYOFF_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID`
- `ARC_STAKES_STAGING_AFTERMATH_VOID`

## Wave 1065

Wave 1065 additions: with seededClueIds, suspenseDelta-as-trigger, and unresolvedClues now at four channels each, this wave gives three of the other four-channel triggers a fifth using combinations never audited by any mode in this pass: ARC_CLOCK_SUSPENSE_AFTERMATH_VOID (clockRaised, previously paired with visualBeats/emotionalShift via checkAftermathVoid plus curiosityDelta/relationshipShifts via other analytical modes, now also paired with suspenseDelta), ARC_PAYOFF_SUSPENSE_AFTERMATH_VOID (payoffSetupIds, previously paired with emotionalShift/visualBeats/relationshipShifts via checkAftermathVoid plus curiosityDelta via a distinct immediate-adjacency mode, now also paired with suspenseDelta), and ARC_STAKES_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID (raise_stakes, previously paired with relationshipShifts/ curiosityDelta/suspenseDelta/emotionalShift, now also paired with dialogueHighlights).

Rules named in this wave's header:

- `ARC_CLOCK_SUSPENSE_AFTERMATH_VOID`
- `ARC_PAYOFF_SUSPENSE_AFTERMATH_VOID`
- `ARC_STAKES_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID`

## Wave 1051

Wave 1051 additions: with revelation, raise_stakes, payoffSetupIds, and clockRaised all now at four channels each, this wave targets the less-saturated triggers instead: ARC_SEED_SUSPENSE_AFTERMATH_VOID (seededClueIds, previously paired with emotionalShift/dialogueHighlights/ curiosityDelta, now a fourth channel with suspenseDelta), ARC_SUSPENSE_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID (suspenseDelta as trigger, previously paired with curiosityDelta/ relationshipShifts/emotionalShift, now a fourth channel with dialogueHighlights — a field never used as a checkAftermathVoid consequence channel by this trigger before), and ARC_OPEN_THREAD_SUSPENSE_AFTERMATH_VOID (heavy unresolvedClues debt, previously paired with emotionalShift/ visualBeats/curiosityDelta, now a fourth channel with suspenseDelta).

Rules named in this wave's header:

- `ARC_OPEN_THREAD_SUSPENSE_AFTERMATH_VOID`
- `ARC_SEED_SUSPENSE_AFTERMATH_VOID`
- `ARC_SUSPENSE_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID`

## Wave 1037

Wave 1037 additions: ARC_STAKES_EMOTIONAL_AFTERMATH_VOID gives raise_stakes a fourth channel (previously paired with relationshipShifts/curiosityDelta/suspenseDelta, now paired with emotionalShift), ARC_REVELATION_SUSPENSE_AFTERMATH_VOID gives revelation a fourth channel (previously paired with relationshipShifts/emotionalShift/curiosityDelta, now paired with suspenseDelta), and ARC_OPEN_THREAD_CURIOSITY_AFTERMATH_VOID gives the heavy-unresolvedClues-debt trigger a third channel (previously paired with emotionalShift/visualBeats, now paired with curiosityDelta).

Rules named in this wave's header:

- `ARC_OPEN_THREAD_CURIOSITY_AFTERMATH_VOID`
- `ARC_REVELATION_SUSPENSE_AFTERMATH_VOID`
- `ARC_STAKES_EMOTIONAL_AFTERMATH_VOID`

## Wave 1023

Wave 1023 additions: with clock and payoff now at four channels each, this wave targets three less-saturated triggers instead: ARC_STAKES_SUSPENSE_AFTERMATH_VOID (raise_stakes, previously paired with relationshipShifts and curiosityDelta, now a third channel with suspenseDelta), ARC_REVELATION_CURIOSITY_AFTERMATH_VOID (revelation, previously paired with relationshipShifts and emotionalShift, now a third channel with curiosityDelta), and ARC_SUSPENSE_EMOTIONAL_AFTERMATH_VOID (suspenseDelta as trigger, previously paired with curiosityDelta and relationshipShifts, now a third channel with emotionalShift).

Rules named in this wave's header:

- `ARC_REVELATION_CURIOSITY_AFTERMATH_VOID`
- `ARC_STAKES_SUSPENSE_AFTERMATH_VOID`
- `ARC_SUSPENSE_EMOTIONAL_AFTERMATH_VOID`

## Wave 1009

Wave 1009 additions: this pass's aftermath-void family now covers most triggers across 2-3 channels each (clock: curiosity/relational/staging; payoff: curiosity/emotional/staging; seed: dialogueHighlights/emotional). This wave completes clock and payoff's remaining channel and adds seed's third: ARC_CLOCK_EMOTIONAL_AFTERMATH_VOID (clockRaised, the last of its four channels), ARC_PAYOFF_RELATIONAL_AFTERMATH_VOID (payoffSetupIds, the last of its four channels), and ARC_SEED_CURIOSITY_AFTERMATH_VOID (seededClueIds, its third channel).

Rules named in this wave's header:

- `ARC_CLOCK_EMOTIONAL_AFTERMATH_VOID`
- `ARC_PAYOFF_RELATIONAL_AFTERMATH_VOID`
- `ARC_SEED_CURIOSITY_AFTERMATH_VOID`

## Wave 995

Wave 995 additions: re-auditing the cluster/drought inventory turned up two consistent-predicate trio-complete signals that Wave 967's saturation claim missed — ARC_CLOCK (clockRaised===true, used identically by the hand-rolled ARC_CLOCK_DROUGHT_RUN and ARC_CLOCK_ZONE_CLUSTER) and ARC_HIGHLIGHT (dialogueHighlights.length>0, identical in both). ARC_CLOCK_ZONE_IMBALANCE and ARC_HIGHLIGHT_ZONE_IMBALANCE complete their trios with the 4-zone bloat+empty-zone mode. (ARC_STAGING was checked and excluded: its cluster rule uses visualBeats.length>=2 while its drought rule uses >0 — an inconsistent pair, same class of issue seen elsewhere in this rotation.) With zone-imbalance now genuinely exhausted, ARC_STAKES_CURIOSITY_AFTERMATH_VOID completes the trio: raise_stakes, already paired with relationshipShifts (Wave 917), now paired with curiosityDelta for the first time in this pass's ~17-rule aftermath-void family.

Rules named in this wave's header:

- `ARC_CLOCK_ZONE_IMBALANCE`
- `ARC_HIGHLIGHT_ZONE_IMBALANCE`
- `ARC_STAKES_CURIOSITY_AFTERMATH_VOID`

## Wave 981

Wave 981 additions: continuing the aftermath-void mode with three trigger/output pairings absent from the pass's now-~17-rule family: ARC_SUSPENSE_RELATIONAL_AFTERMATH_VOID (suspense → relational, distinct from the existing suspense → curiosity pairing), ARC_CLOCK_STAGING_AFTERMATH_VOID (clock → staging, distinct from clock → curiosity/relational), and ARC_PAYOFF_STAGING_AFTERMATH_VOID (payoff → staging, distinct from payoff → curiosity/emotional).

Rules named in this wave's header:

- `ARC_CLOCK_STAGING_AFTERMATH_VOID`
- `ARC_PAYOFF_STAGING_AFTERMATH_VOID`
- `ARC_SUSPENSE_RELATIONAL_AFTERMATH_VOID`

## Wave 967

Wave 967 additions: with the underweight/bloat (zone-imbalance) mode now saturated for this pass, this wave pivots to the sequence/aftermath mode via the shared checkAftermathVoid helper, adding three trigger→aftermath pairings absent from the pass's existing ~13 aftermath rules: ARC_REVELATION_EMOTIONAL_AFTERMATH_VOID (revelation → emotional), ARC_STAKES_RELATIONAL_AFTERMATH_VOID (raise_stakes → relational), and ARC_PAYOFF_EMOTIONAL_AFTERMATH_VOID (payoff → emotional) — each a distinct trigger/output pairing proving decoupling (trigger present, aftermath absent in a 2-scene window).

Rules named in this wave's header:

- `ARC_PAYOFF_EMOTIONAL_AFTERMATH_VOID`
- `ARC_REVELATION_EMOTIONAL_AFTERMATH_VOID`
- `ARC_STAKES_RELATIONAL_AFTERMATH_VOID`

## Wave 953

Wave 953 additions: with arc's valence/delta/purpose/clue-array signals now saturated by the 4-zone mode, this wave audits three remaining trio-complete signals spanning three distinct classes: ARC_RELATIONAL_ZONE_IMBALANCE (relationshipShifts array), ARC_TURN_ZONE_IMBALANCE (dramaticTurn !== 'nothing' categorical), and ARC_REVELATION_ZONE_IMBALANCE (revelation string field, != null — distinct from the purpose-enum ARC_REVELATION_PURPOSE_ZONE_IMBALANCE).

Rules named in this wave's header:

- `ARC_RELATIONAL_ZONE_IMBALANCE`
- `ARC_REVELATION_ZONE_IMBALANCE`
- `ARC_TURN_ZONE_IMBALANCE`

## Wave 939

Wave 939 additions: continuing the checkZoneImbalance rollout, this wave extends the 4-zone mode to the three clue-tracking array-field signals, each of which has a complete 3-zone/run-based trio but has never been audited by the 4-zone mode: ARC_OPEN_THREAD_ZONE_IMBALANCE (unresolvedClues.length > 0), ARC_PAYOFF_ZONE_IMBALANCE (payoffSetupIds.length > 0), and ARC_SEED_ZONE_IMBALANCE (seededClueIds.length > 0).

Rules named in this wave's header:

- `ARC_OPEN_THREAD_ZONE_IMBALANCE`
- `ARC_PAYOFF_ZONE_IMBALANCE`
- `ARC_SEED_ZONE_IMBALANCE`

## Wave 925

Wave 925 additions: with every purpose enum value and both emotion valences now 4-zone-audited, this wave extends the checkZoneImbalance mode to the three delta-magnitude signals, each of which has a complete 3-zone/run-based trio (zone-cluster + drought-run) but has never been audited by the 4-zone mode: ARC_SUSPENSE_ZONE_IMBALANCE (suspenseDelta > 0), ARC_CURIOSITY_ZONE_IMBALANCE (curiosityDelta > 0), and ARC_CLOCK_DELTA_ZONE_IMBALANCE (clockDelta > 0).

Rules named in this wave's header:

- `ARC_CLOCK_DELTA_ZONE_IMBALANCE`
- `ARC_CURIOSITY_ZONE_IMBALANCE`
- `ARC_SUSPENSE_ZONE_IMBALANCE`

## Wave 911

Wave 911 additions: every purpose enum value except 'revelation' has now been audited by the 4-zone checkZoneImbalance mode. This wave closes that gap with ARC_REVELATION_PURPOSE_ZONE_IMBALANCE (purpose === 'revelation', whose 3-zone/run trio was completed in Wave 897), and extends the 4-zone mode to the emotionalShift valence signals, which have complete 3-zone/run trios (ARC_POSITIVE/NEGATIVE_EMOTION_ZONE_CLUSTER + _DROUGHT_RUN) but have never been audited by it: ARC_POSITIVE_EMOTION_ZONE_IMBALANCE (emotionalShift === 'positive') and ARC_NEGATIVE_EMOTION_ZONE_IMBALANCE (emotionalShift === 'negative').

Rules named in this wave's header:

- `ARC_NEGATIVE_EMOTION_ZONE_IMBALANCE`
- `ARC_POSITIVE_EMOTION_ZONE_IMBALANCE`
- `ARC_REVELATION_PURPOSE_ZONE_IMBALANCE`

## Wave 897

Wave 897 additions (opens the twenty-third rotation cycle): purpose === 'revelation' has only ever appeared inside the dramaticPurposes composite set (union with 'turning_point', 'climax', 'raise_stakes', 'complicate') and has never been audited as its own standalone signal. This wave adds ARC_REVELATION_PURPOSE_DROUGHT_RUN (run-based absence) and ARC_REVELATION_PURPOSE_ZONE_CLUSTER (distribution/timing, structural thirds) for this purpose value -- named distinctly from the pre-existing ARC_REVELATION_DROUGHT_RUN/ARC_REVELATION_ZONE_CLUSTER, which audit the separate `revelation` string|null field, not this purpose enum value. It also adds ARC_STAKES_ZONE_IMBALANCE, continuing the checkZoneImbalance rollout begun in Wave 869: purpose === 'raise_stakes' already has a complete 3-zone/run-based trio (ARC_STAKES_ZONE_CLUSTER, ARC_STAKES_DROUGHT_RUN) but has never been audited by the 4-zone bloat+empty-zone mode.

Rules named in this wave's header:

- `ARC_REVELATION_PURPOSE_DROUGHT_RUN`
- `ARC_REVELATION_PURPOSE_ZONE_CLUSTER`
- `ARC_STAKES_ZONE_IMBALANCE`

## Wave 883

Wave 883 additions: continuing the checkZoneImbalance rollout begun in Wave 869, this wave applies the 4-zone bloat+empty-zone mode to three more purpose values that have never been audited by it: ARC_COMPLICATE_ZONE_IMBALANCE (purpose === 'complicate'), ARC_INTRODUCE_CONFLICT_ZONE_IMBALANCE (purpose === 'introduce_conflict'), and ARC_TURNING_POINT_ZONE_IMBALANCE (purpose === 'turning_point'). Each of these three purpose values already has a complete 3-zone/run-based trio via checkZoneCluster/checkDroughtRun; the 4-zone mode is categorically distinct (act-based buckets, fires only on an empty zone plus a >=50%-share bloat zone) and has never been applied to any of them before.

Rules named in this wave's header:

- `ARC_COMPLICATE_ZONE_IMBALANCE`
- `ARC_INTRODUCE_CONFLICT_ZONE_IMBALANCE`
- `ARC_TURNING_POINT_ZONE_IMBALANCE`

## Wave 869

Wave 869 additions: with every primary purpose value now trio-complete via checkDroughtRun/ checkZoneCluster, this wave applies the distinct 4-zone checkZoneImbalance mode (act-based buckets, fires on an empty zone plus a >=50%-share bloat zone — categorically different from checkZoneCluster's 3-zone >75%-concentration test) to three purpose values that have never been audited by it: ARC_CLIMAX_ZONE_IMBALANCE (purpose === 'climax'), ARC_ESTABLISH_WORLD_ZONE_IMBALANCE (purpose === 'establish_world'), and ARC_RESOLUTION_PURPOSE_ZONE_IMBALANCE (purpose === 'resolution' — distinct from the existing ARC_RESOLUTION_ABSENT/ARC_RESOLUTION_DROUGHT_RUN, which audit payoffSetupIds resolution rather than this purpose enum value). Only ARC_CHARACTER_MOMENT_ZONE_IMBALANCE and a dialogueHighlights zone-imbalance check existed before this wave; all three purpose values below are virgin for this analytical mode.

Rules named in this wave's header:

- `ARC_CLIMAX_ZONE_IMBALANCE`
- `ARC_ESTABLISH_WORLD_ZONE_IMBALANCE`
- `ARC_RESOLUTION_PURPOSE_ZONE_IMBALANCE`

## Wave 855

Wave 855 additions: ARC_CLIMAX_DROUGHT_RUN (run-based × purpose === 'climax' absence — completes 2 of 3 slots for this purpose value alongside the zone-cluster mode added in Wave 841; peak mode conventionally skipped for this categorical field), ARC_RESOLUTION_PURPOSE_ZONE_CLUSTER (distribution/timing × purpose === 'resolution' × structural thirds — distinct from the existing ARC_RESOLUTION_ABSENT/ARC_RESOLUTION_DROUGHT_RUN, which audit payoffSetupIds resolution rather than this purpose enum value; a virgin standalone signal), ARC_RESOLUTION_PURPOSE_DROUGHT_RUN (run-based × purpose === 'resolution' absence — completes 2 of 3 slots for this purpose value alongside the zone-cluster mode added in this same wave; peak mode conventionally skipped for this categorical field).

Rules named in this wave's header:

- `ARC_CLIMAX_DROUGHT_RUN`
- `ARC_RESOLUTION_ABSENT`
- `ARC_RESOLUTION_PURPOSE_DROUGHT_RUN`
- `ARC_RESOLUTION_PURPOSE_ZONE_CLUSTER`

## Wave 841

Wave 841 additions: ARC_ESTABLISH_WORLD_DROUGHT_RUN (run-based × purpose === 'establish_world' absence — completes 2 of 3 slots for this purpose value alongside the zone-cluster mode added in Wave 827; peak mode conventionally skipped for this categorical field), ARC_COMPLICATE_DROUGHT_RUN (run-based × purpose === 'complicate' absence — completes 2 of 3 slots for this purpose value alongside the zone-cluster mode added in Wave 827; peak mode conventionally skipped for this categorical field), ARC_CLIMAX_ZONE_CLUSTER (distribution/timing × purpose === 'climax' × structural thirds — distinct from ARC_CLIMAX_VOID, a co-occurrence check on the fixed climax scene's content; none of the three shared-library trio modes has ever isolated this purpose value as a standalone distributional signal).

Rules named in this wave's header:

- `ARC_CLIMAX_VOID`
- `ARC_CLIMAX_ZONE_CLUSTER`
- `ARC_COMPLICATE_DROUGHT_RUN`
- `ARC_ESTABLISH_WORLD_DROUGHT_RUN`

## Wave 827

Wave 827 additions: ARC_INTRODUCE_CONFLICT_DROUGHT_RUN (run-based × purpose === 'introduce_conflict' absence — completes 2 of 3 slots for this purpose value alongside the zone-cluster mode added in Wave 813; peak mode conventionally skipped for this categorical field), ARC_ESTABLISH_WORLD_ZONE_CLUSTER (distribution/timing × purpose === 'establish_world' × structural thirds — this purpose value has never been referenced anywhere in this pass; a virgin field), ARC_COMPLICATE_ZONE_CLUSTER (distribution/timing × purpose === 'complicate' × structural thirds — 'complicate' has only ever appeared inside the dramaticPurposes composite set [union with 'revelation', 'turning_point', 'climax', 'raise_stakes']; it has never been audited as its own standalone signal by any of the three shared-library trio modes).

Rules named in this wave's header:

- `ARC_COMPLICATE_ZONE_CLUSTER`
- `ARC_ESTABLISH_WORLD_ZONE_CLUSTER`
- `ARC_INTRODUCE_CONFLICT_DROUGHT_RUN`

## Wave 813

Wave 813 additions: ARC_POSITIVE_EMOTION_ZONE_CLUSTER (distribution/timing × emotionalShift === 'positive' × structural thirds — the existing ARC_POSITIVE_EMOTION_RUN audits consecutive PRESENCE [run-based], and ARC_PEAK_POSITIVE_UNCAUSED is a hand-rolled backward-cause check anchored on the LAST positive scene with a broader 3-signal hasCause; the general thirds-based cluster mode has never been applied to this valence), ARC_POSITIVE_EMOTION_DROUGHT_RUN (run-based × emotionalShift === 'positive' absence — distinct from ARC_POSITIVE_EMOTION_RUN's presence-run in the same mirror-image way as ARC_NEGATIVE_EMOTION_DROUGHT_RUN vs ARC_NEGATIVE_EMOTION_RUN; completing 2 of 3 slots for this valence alongside the zone-cluster mode added in this same wave), ARC_INTRODUCE_CONFLICT_ZONE_CLUSTER (distribution/timing × purpose === 'introduce_conflict' × structural thirds — this purpose value has never been referenced anywhere in this pass; none of the three shared-library trio modes has ever been applied to it).

Rules named in this wave's header:

- `ARC_INTRODUCE_CONFLICT_ZONE_CLUSTER`
- `ARC_PEAK_POSITIVE_UNCAUSED`
- `ARC_POSITIVE_EMOTION_DROUGHT_RUN`
- `ARC_POSITIVE_EMOTION_RUN`
- `ARC_POSITIVE_EMOTION_ZONE_CLUSTER`

## Wave 799

Wave 799 additions: ARC_NEGATIVE_EMOTION_DROUGHT_RUN (run-based × emotionalShift === 'negative' absence — completes the trio for this valence alongside the zone-cluster mode added in Wave 785; distinct from ARC_NEGATIVE_EMOTION_RUN, which audits consecutive PRESENCE of negative scenes — an absence run of 6+ scenes with no negative beat is the mirror-image claim, and a story satisfying one does not automatically satisfy the other). Reconnaissance for this wave also confirmed that ARC_SUSPENSE_DROUGHT_RUN (Wave 561, hand-rolled), ARC_CLOCK_DROUGHT_RUN (Wave 575, hand-rolled), ARC_CURIOSITY_DROUGHT_RUN (Wave 519, hand-rolled) and ARC_CURIOSITY_ZONE_CLUSTER (Wave 575, hand-rolled) and ARC_TURN_ZONE_CLUSTER (Wave 477, hand-rolled) and ARC_PEAK_RELATIONAL_UNCAUSED (Wave 435, hand-rolled) already complete their respective trios, so suspenseDelta, clockRaised, curiosityDelta, dramaticTurn, and relationshipShifts were correctly skipped as non-distinct candidates. ARC_TURNING_POINT_ZONE_CLUSTER (distribution/timing × purpose === 'turning_point' × structural thirds — this specific purpose value has only ever appeared inside a five-value composite set [line ~404]; it has never been audited as its own standalone signal by any of the three shared-library trio modes), ARC_TURNING_POINT_DROUGHT_RUN (run-based × purpose === 'turning_point' absence — completing 2 of 3 slots for this purpose value alongside the zone-cluster mode added in this same wave; peak mode conventionally skipped for this categorical field).

Rules named in this wave's header:

- `ARC_CURIOSITY_ZONE_CLUSTER`
- `ARC_NEGATIVE_EMOTION_DROUGHT_RUN`
- `ARC_TURNING_POINT_DROUGHT_RUN`
- `ARC_TURNING_POINT_ZONE_CLUSTER`

## Wave 785

Wave 785 additions: ARC_REVELATION_DROUGHT_RUN (run-based × revelation absence — Wave 771 applied the zone-cluster mode to revelation; the run-based drought mode has never been applied to it, completing 2 of 3 slots), ARC_REVELATION_PEAK_UNCAUSED (backward-cause × revelation-as-magnitude × 2-scene lookback — completing the trio; hasCause references only dramaticTurn, never revelation, to avoid a circular/self-referential audit), ARC_NEGATIVE_EMOTION_ZONE_CLUSTER (distribution/timing × emotionalShift === 'negative' presence × structural thirds — the existing ARC_NEGATIVE_EMOTION_RUN audits consecutive-presence [run-based], a distinct claim from where negative beats concentrate structurally; the general thirds-ratio zone-cluster mode has never been applied to this specific valence).

Rules named in this wave's header:

- `ARC_NEGATIVE_EMOTION_RUN`
- `ARC_NEGATIVE_EMOTION_ZONE_CLUSTER`
- `ARC_REVELATION_DROUGHT_RUN`
- `ARC_REVELATION_PEAK_UNCAUSED`

## Wave 771

Wave 771 additions: ARC_SUSPENSE_PEAK_UNCAUSED (backward-cause × suspenseDelta-as-magnitude × 2-scene lookback — ARC_SUSPENSE_DROUGHT_RUN and ARC_SUSPENSE_ZONE_CLUSTER completed the drought/cluster half of the trio; the existing ARC_PEAK_SUSPENSE_EMOTION_ABSENT audits the co-occurring emotion channel AT the peak scene, not a preparing cause in the scenes before it — the backward-cause peak mode has never been applied to suspenseDelta itself), ARC_STAKES_ZONE_CLUSTER (distribution/timing × purpose === 'raise_stakes' presence × structural thirds — ARC_STAKES_DROUGHT_RUN [Wave 757] applied the run-based drought mode to this value; the zone-cluster mode has never been applied to it), ARC_REVELATION_ZONE_CLUSTER (distribution/ timing × revelation × structural thirds — the existing ARC_REVELATION_LATE_CLUSTER audits a fixed final-quarter window [>60% of revelations in the last 25%]; the general thirds-ratio zone-cluster mode — a disjoint-third majority test at a lower 75% threshold with no fixed zone — has never been applied to revelation).

Rules named in this wave's header:

- `ARC_REVELATION_LATE_CLUSTER`
- `ARC_REVELATION_ZONE_CLUSTER`
- `ARC_STAKES_ZONE_CLUSTER`
- `ARC_SUSPENSE_PEAK_UNCAUSED`

## Wave 757

Wave 757 additions: ARC_SUSPENSE_ZONE_CLUSTER (distribution/timing × suspenseDelta>0 presence × structural thirds — the existing ARC_SUSPENSE_DROUGHT_RUN [Wave 561] audits run-length absence and ARC_SUSPENSE_OPENING_ZONE_ABSENT audits only the opening third specifically; the general thirds-ratio zone-cluster mode has never been applied to it), ARC_EMOTION_ZONE_CLUSTER (distribution/timing × emotionalShift !== 'neutral' presence × structural thirds — the existing ARC_EMOTIONAL_DROUGHT_RUN audits run-length absence, ARC_EMOTION_CONCENTRATION audits a contiguous span [≤20% of the story], and ARC_EMOTIONAL_FRONT_LOADED/BACK_LOADED audit a binary half-split; the general thirds-ratio zone-cluster mode — a disjoint-third majority test distinct from all three — has never been applied to it), ARC_STAKES_DROUGHT_RUN (run-based × purpose === 'raise_stakes' absence — purpose has never anchored any of the three shared-library modes for this specific value; the run-based drought mode has never been applied to it).

Rules named in this wave's header:

- `ARC_EMOTION_CONCENTRATION`
- `ARC_EMOTION_ZONE_CLUSTER`
- `ARC_EMOTIONAL_DROUGHT_RUN`
- `ARC_STAKES_DROUGHT_RUN`
- `ARC_SUSPENSE_ZONE_CLUSTER`

## Wave 743

Wave 743 additions: ARC_CHARACTER_MOMENT_ZONE_CLUSTER (distribution/timing × purpose === 'character_moment' × structural thirds — Wave 617 applied the four-zone-imbalance mode [bloat/empty across four zones] and Wave 729 applied the run-based drought mode to this signal; the thirds-ratio zone-cluster mode has never been applied to it — a distinct analytical shape from the four-zone imbalance check, since >75%-in-one-third can fire even when no zone is completely empty), ARC_TURN_DROUGHT_RUN (run-based × dramaticTurn !== 'nothing' absence — Wave 449 applied the zone-cluster mode to this channel [ARC_TURN_ZONE_CLUSTER]; the run-based drought mode has never been applied to it), ARC_CLOCK_ZONE_CLUSTER (distribution/timing × clockRaised === true × structural thirds — the existing ARC_CLOCK_DROUGHT_RUN [Wave 575] audits run-length absence and ARC_CLOCK_OPENING_ZONE_ABSENT audits only the opening third specifically; the general thirds-ratio zone-cluster mode, which can fire on a middle- or closing-third concentration that the opening-only check cannot detect, has never been applied to it).

Rules named in this wave's header:

- `ARC_CHARACTER_MOMENT_ZONE_CLUSTER`
- `ARC_CLOCK_ZONE_CLUSTER`
- `ARC_TURN_DROUGHT_RUN`

## Wave 729

Wave 729 additions: ARC_OPEN_THREAD_ZONE_CLUSTER (distribution/timing × unresolvedClues × structural thirds — Waves 659/715 applied the run-based drought and backward-cause peak modes to unresolvedClues; the zone-cluster mode has never been applied to it, completing the trio), ARC_CHARACTER_MOMENT_DROUGHT_RUN (run-based × purpose === 'character_moment' absence — Wave 617 applied the four-zone-imbalance mode to this signal; the run-based drought mode has never been applied to it), ARC_CURIOSITY_PEAK_UNCAUSED (single-peak isolation/backward-cause × curiosityDelta magnitude via the shared checks library — distinct from the existing hand-rolled peak-audits [ARC_PEAK_CURIOSITY_EMOTION_ABSENT, Wave 365; ARC_CURIOSITY_PEAK_RELATIONAL_VOID, Wave 533], both of which examine the peak scene's OWN state; this checks whether the peak scene or either of the two PRECEDING scenes contains a dramatic turn or revelation — a genuinely distinct backward-looking causal audit never applied to this channel).

Rules named in this wave's header:

- `ARC_CHARACTER_MOMENT_DROUGHT_RUN`
- `ARC_CURIOSITY_PEAK_RELATIONAL_VOID`
- `ARC_CURIOSITY_PEAK_UNCAUSED`
- `ARC_OPEN_THREAD_ZONE_CLUSTER`

## Wave 715

Wave 715 additions (built on the shared checks library): ARC_RESOLUTION_DROUGHT_RUN (run-based × payoffSetupIds absence — Waves 659/687 applied the zone-cluster and backward-cause peak modes to payoffSetupIds; the drought-run mode has never been applied to it via the shared library, completing the trio; named distinctly from the existing hand-rolled ARC_PAYOFF_DROUGHT_RUN [Wave 505] to avoid a rule-name collision), ARC_CLOCK_DELTA_DROUGHT_RUN (run-based × clockDelta>0 absence — Waves 673/701 applied the backward-cause peak and zone-cluster modes to clockDelta; the drought-run mode has never been applied to it, completing the trio; distinct from the existing hand-rolled ARC_CLOCK_DROUGHT_RUN [clockRaised boolean, Wave 575]), ARC_OPEN_THREAD_PEAK_UNCAUSED (single-peak isolation/backward-cause × unresolvedClues magnitude — unresolvedClues has only ever anchored a co-occurrence/decoupling check [Wave 645]; the backward-cause peak mode has never been applied to it).

Rules named in this wave's header:

- `ARC_CLOCK_DELTA_DROUGHT_RUN`
- `ARC_OPEN_THREAD_PEAK_UNCAUSED`
- `ARC_RESOLUTION_DROUGHT_RUN`

## Wave 701

Wave 701 additions (built on the shared checks library): ARC_STAGING_ZONE_CLUSTER (distribution/timing × visualBeats × structural thirds — visualBeats has been backward-cause peak-audited [Wave 659], drought-audited [Wave 687], and four-zone imbalance-audited, but never cluster-audited on the thirds granularity, completing the trio of shared-library modes on this channel), ARC_CLOCK_DELTA_ZONE_CLUSTER (distribution/timing × clockDelta>0 × structural thirds — distinct from the existing hand-rolled ARC_CLOCK_DROUGHT_RUN [clockRaised boolean] and Wave 673's ARC_CLOCK_DELTA_PEAK_UNCAUSED [backward-cause peak]; the zone-cluster mode has never been applied to the raw clockDelta signal), ARC_SEED_PEAK_UNCAUSED (single-peak isolation/backward-cause × seededClueIds magnitude — seededClueIds has been drought-audited [Wave 645] and zone-clustered [Wave 673], but never backward-cause peak-audited, completing the trio of shared-library modes on this channel).

Rules named in this wave's header:

- `ARC_CLOCK_DELTA_ZONE_CLUSTER`
- `ARC_CLOCK_DROUGHT_RUN`
- `ARC_SEED_PEAK_UNCAUSED`
- `ARC_STAGING_ZONE_CLUSTER`

## Wave 687

Wave 687 additions (built on the shared checks library): ARC_PAYOFF_PEAK_UNCAUSED (single-peak isolation/backward-cause × payoffSetupIds magnitude — the scene with the most simultaneous thread resolutions has no dramatic turn or revelation in itself or the two scenes before it; payoffSetupIds has been zone-clustered [Wave 659] and drought-audited [hand-rolled Wave 505] but never backward-cause peak-audited), ARC_STAGING_DROUGHT_RUN (run-based × visualBeats absence — visualBeats has been zone-imbalanced [four-zone] and backward-cause peak-audited [Wave 659], but never drought-audited), ARC_HIGHLIGHT_ZONE_CLUSTER (distribution/timing × dialogueHighlights × structural thirds — dialogueHighlights has been backward-cause peak-audited [Wave 645] and drought-audited [Wave 673], but never cluster-audited, completing the trio of shared-library modes on this channel).

Rules named in this wave's header:

- `ARC_HIGHLIGHT_ZONE_CLUSTER`
- `ARC_PAYOFF_PEAK_UNCAUSED`
- `ARC_STAGING_DROUGHT_RUN`

## Wave 673

Wave 673 additions (built on the shared checks library, audit M2.2): ARC_CLOCK_DELTA_PEAK_UNCAUSED (single-peak isolation/backward-cause × clockDelta magnitude — distinct from the existing ARC_CLOCK_PEAK_EMOTION_ABSENT, which checks whether the peak-clockDelta scene is itself emotionally neutral; this instead asks whether that scene is structurally caused by a dramatic turn or revelation), ARC_HIGHLIGHT_DROUGHT_RUN (run-based × dialogueHighlights absence — Wave 645 applied the peak-uncaused mode to dialogueHighlights; the drought-run mode has never been applied to this channel), ARC_SEED_ZONE_CLUSTER (distribution/timing × seededClueIds × structural thirds — Wave 645 applied the drought-run mode to seededClueIds; the zone-cluster mode has never been applied to this channel despite it already anchoring two aftermath-void checks).

Rules named in this wave's header:

- `ARC_CLOCK_DELTA_PEAK_UNCAUSED`
- `ARC_HIGHLIGHT_DROUGHT_RUN`
- `ARC_SEED_ZONE_CLUSTER`

## Wave 659

Wave 659 additions (built on the shared checks library, audit M2.2): ARC_STAGING_PEAK_UNCAUSED (single-peak isolation/backward-cause × visualBeats magnitude — the scene with the densest physical staging has no dramatic turn or revelation in itself or the two scenes before it; visualBeats has only ever been zone-imbalanced [four-zone bloat/empty] here, never backward-cause peak-audited), ARC_OPEN_THREAD_DROUGHT_RUN (run-based × unresolvedClues absence — this pass already hand-rolls drought-run logic for relational/payoff/curiosity/suspense/clock/ emotional channels and Wave 645 added seededClueIds via the shared helper; unresolvedClues itself has only been used in co-occurrence and aftermath-void contexts, never drought-audited), ARC_PAYOFF_ZONE_CLUSTER (distribution/timing × payoffSetupIds × structural thirds — this pass already applies the zone-cluster mode to dramaticTurn, relationshipShifts, and curiosityDelta; payoffSetupIds itself has never been cluster-audited here).

Rules named in this wave's header:

- `ARC_OPEN_THREAD_DROUGHT_RUN`
- `ARC_PAYOFF_ZONE_CLUSTER`
- `ARC_STAGING_PEAK_UNCAUSED`

## Wave 645

Wave 645 additions (built on the shared checks library, audit M2.2): ARC_HIGHLIGHT_PEAK_UNCAUSED (single-peak isolation/backward-cause × dialogueHighlights magnitude — the scene with the single densest count of highlighted lines has no dramatic turn or revelation in itself or the two scenes before it; first checkPeakUncaused use in this 108-rule pass — every prior single-peak check here [suspense, curiosity, relational, clock, positive-emotion] measures a numeric delta or shift-density peak, never the dialogueHighlights channel), ARC_SEED_DROUGHT_RUN (run-based × seededClueIds absence — a 6+ consecutive-scene stretch with no clue seeded at all, while seeding occurs ≥3 times elsewhere; this pass already hand-rolls drought-run logic for suspenseDelta [Wave 561] and curiosityDelta [Wave 519], but never via the shared checkDroughtRun helper and never on the seededClueIds channel), ARC_OPEN_THREAD_CURIOSITY_DECOUPLED (co-occurrence/decoupling × unresolvedClues × curiosityDelta>0 — zero overlap between scenes carrying open clue-debt and scenes where curiosity is actively rising; unresolvedClues has only ever been paired with dialogueHighlights [Wave 603] and used as an aftermath-void trigger [Waves 603, 631] in this file, never cross-checked against the curiosity channel).

Rules named in this wave's header:

- `ARC_HIGHLIGHT_PEAK_UNCAUSED`
- `ARC_OPEN_THREAD_CURIOSITY_DECOUPLED`
- `ARC_SEED_DROUGHT_RUN`

## Wave 631

Wave 631 additions (built on the shared checks library, audit M2.2): ARC_DIALOGUE_HIGHLIGHT_STAGING_DECOUPLED (co-occurrence/decoupling × dialogueHighlights × visualBeats — first pairing of these two fields in this 105-rule pass), ARC_OPEN_THREAD_STAGING_AFTERMATH_VOID (sequence/aftermath × heavy unresolvedClues debt trigger → visualBeats absence — first pairing of these two fields), ARC_DIALOGUE_HIGHLIGHT_ZONE_IMBALANCE (underweight/bloat × dialogueHighlights × four structural zones — Wave 617 applied this template to purpose only; dialogueHighlights itself has never been zone-audited here).

Rules named in this wave's header:

- `ARC_DIALOGUE_HIGHLIGHT_STAGING_DECOUPLED`
- `ARC_DIALOGUE_HIGHLIGHT_ZONE_IMBALANCE`
- `ARC_OPEN_THREAD_STAGING_AFTERMATH_VOID`

## Wave 617

Wave 617 additions (built on the shared checks library, audit M2.2): PAYOFF_VISUAL_BEAT_DECOUPLED (co-occurrence/decoupling × payoffSetupIds × visualBeats — first pairing of these two lightly-used fields in this 102-rule pass), ARC_CHARACTER_MOMENT_ZONE_IMBALANCE (underweight/bloat × purpose === 'character_moment' × four structural zones — first zone-based check on the purpose channel), ARC_SEED_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID (sequence/aftermath × seededClueIds trigger → dialogueHighlights absence — first pairing of these two fields).

Rules named in this wave's header:

- `ARC_CHARACTER_MOMENT_ZONE_IMBALANCE`
- `ARC_SEED_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID`
- `PAYOFF_VISUAL_BEAT_DECOUPLED`

## Wave 603

Wave 603 additions (built on the shared checks library, audit M2.2): RELATIONSHIP_SHIFT_DIALOGUE_HIGHLIGHT_DECOUPLED (co-occurrence/decoupling × relationshipShifts × dialogueHighlights — first use of dialogueHighlights anywhere in this 99-rule pass), VISUAL_STAGING_EMOTIONAL_FLATNESS_CLUSTER (distribution/timing × visualBeats+emotionalShift compound × structural thirds — first use of visualBeats anywhere in this pass), OPEN_THREAD_EMOTIONAL_AFTERMATH_VOID (sequence/aftermath × heavy unresolvedClues debt → emotional beat absence — first use of unresolvedClues anywhere in this pass).

Rules named in this wave's header:

- `OPEN_THREAD_EMOTIONAL_AFTERMATH_VOID`
- `RELATIONSHIP_SHIFT_DIALOGUE_HIGHLIGHT_DECOUPLED`
- `VISUAL_STAGING_EMOTIONAL_FLATNESS_CLUSTER`

## Wave 589

Wave 589 additions: dramatic-turn relational aftermath void (sequence/aftermath × dramatic-turn → relationship aftermath — n≥8, ≥2 qualifying dramatic-turn scenes [pos<n-1], ≥2 relational-shift scenes globally, no dramatic turn immediately followed by a relationship shift in the next scene; the dramatic-turn-trigger member of the relational-aftermath family alongside ARC_CLOCK_RELATIONAL_AFTERMATH_VOID [clock trigger], ARC_REVELATION_RELATIONAL_AFTERMATH_VOID [revelation trigger], ARC_POSITIVE/NEGATIVE_RELATIONAL_AFTERMATH_VOID [emotion triggers]; distinct from ARC_DRAMATIC_TURN_EMOTIONAL_AFTERMATH_VOID [emotion not relational]), payoff curiosity aftermath void (sequence/aftermath × payoff → curiosity aftermath — n≥8, ≥2 qualifying payoff scenes [pos<n-1], ≥2 curiosity-spike scenes globally, no payoff immediately followed by a curiosity spike; the payoff-trigger member of the curiosity-aftermath family alongside ARC_CLOCK_CURIOSITY_AFTERMATH_VOID [clock trigger] and ARC_SUSPENSE_CURIOSITY_AFTERMATH_VOID [suspense trigger]; distinct from ARC_PAYOFF_AFTERMATH_EMOTIONAL_VOID [emotion not curiosity]), emotional drought run (run-based × emotional-absence — n≥10, ≥4 emotional scenes [non-neutral emotionalShift], longest consecutive run of neutral-shift scenes ≥ 7; completes the drought-run family on the emotional channel alongside ARC_SUSPENSE/CURIOSITY/CLOCK/PAYOFF/RELATIONAL_DROUGHT_RUN; distinct from ARC_EMOTIONAL_FLATLINE [global rate ≥80% neutral — this is a local run-based check that fires even when global rate is below 80%]).

Rules named in this wave's header:

- `ARC_CLOCK_RELATIONAL_AFTERMATH_VOID`
- `ARC_DRAMATIC_TURN_EMOTIONAL_AFTERMATH_VOID`
- `ARC_PAYOFF_AFTERMATH_EMOTIONAL_VOID`
- `ARC_SUSPENSE_CURIOSITY_AFTERMATH_VOID`

## Wave 575

Wave 575 additions: curiosity zone cluster (distribution/timing × curiosity × structural thirds — n≥9, ≥3 curiosity-positive scenes [curiosityDelta>0], >75% in one third; wonder spikes are ghettoized into one zone; finer-grained than binary half-partitions; the curiosity-channel sibling of ARC_RELATIONAL_ZONE_CLUSTER [Wave 561] and ARC_TURN_ZONE_CLUSTER [Wave 477]; distinct from ARC_CURIOSITY_DROUGHT_RUN [run-based × absence] and ARC_CURIOSITY_PLATEAU [average-mode]), clock drought run (run-based × clockRaised × absence — n≥10, ≥3 clockRaised scenes, longest consecutive non-clock run ≥ 6; deadline engine goes silent for an extended stretch; completes the drought-run family on the clock channel alongside ARC_SUSPENSE_DROUGHT_RUN [Wave 561], ARC_CURIOSITY_DROUGHT_RUN [Wave 519], ARC_RELATIONAL_DROUGHT_RUN [Wave 449], ARC_PAYOFF_DROUGHT_RUN [Wave 505]; distinct from ARC_CLOCK_OPENING_ZONE_ABSENT [fixed zone]), suspense curiosity aftermath void (sequence/aftermath × suspenseDelta → curiosity aftermath — n≥8, ≥2 qualifying suspense-spike scenes [suspenseDelta>0, pos<n-1], ≥2 curiosity-positive scenes globally, none of the suspense spikes followed by curiosityDelta>0 in next 2 scenes; tension rises never spark wonder; the suspense-trigger member of the curiosity-aftermath family alongside ARC_CLOCK_CURIOSITY_AFTERMATH_VOID [Wave 505: clock trigger]; distinct from ARC_REVELATION_CURIOSITY_DECOUPLED [co-occurrence × same scene], ARC_CURIOSITY_DROUGHT_RUN [run-based × absence], ARC_SUSPENSE_EMOTION_DECOUPLED [same-scene × emotional channel]).

Rules named in this wave's header:

- `ARC_CURIOSITY_PLATEAU`
- `ARC_RELATIONAL_ZONE_CLUSTER`
- `ARC_REVELATION_CURIOSITY_DECOUPLED`
- `ARC_SUSPENSE_DROUGHT_RUN`
- `ARC_SUSPENSE_EMOTION_DECOUPLED`

## Wave 561

Wave 561 additions: suspense drought run (run-based × suspenseDelta × absence — n≥10, ≥3 suspense-positive scenes, longest consecutive run with suspenseDelta ≤ 0 ≥ 6; the tension engine stalls for an extended local stretch; completes the drought-run family on the suspense channel alongside ARC_CURIOSITY/RELATIONAL/PAYOFF_DROUGHT_RUN, distinct from ARC_SUSPENSE_FRONT_LOADED [global half-skew] and ARC_SUSPENSE_OPENING_ZONE_ABSENT [fixed opening zone]), relational zone cluster (distribution/timing × relationship × structural thirds — n≥9, ≥3 relShift scenes, >75% in a single third; bonds ghettoized into one zone; finer-grained than the binary ARC_RELATIONAL_FRONT/BACK_LOADED half-partitions and can fire on a middle-third cluster neither catches, distinct from ARC_SHIFT_CONCENTRATION's ≤3-scene micro-burst, the relational-channel sibling of ARC_TURN_ZONE_CLUSTER), clock relational aftermath void (sequence/aftermath × clock → relational aftermath — n≥8, ≥2 clockRaised scenes [pos<n-1], ≥2 relShift scenes globally, no clock scene followed by a relShift in next 2 scenes; deadlines never strain bonds; the clock-trigger member of the relational-aftermath family alongside ARC_NEGATIVE/POSITIVE/REVELATION_RELATIONAL_AFTERMATH_VOID, distinct from ARC_CLOCK_EMOTION_DECOUPLED [same-scene] and ARC_CLOCK_CURIOSITY_AFTERMATH_VOID [curiosity channel]).

Rules named in this wave's header:

- `ARC_SHIFT_CONCENTRATION`
- `ARC_SUSPENSE_OPENING_ZONE_ABSENT`
- `ARC_TURN_ZONE_CLUSTER`

## Wave 547

Wave 547 additions: suspense opening zone absent (zone presence/absence × suspenseDelta × opening third — n≥9, ≥3 suspense-positive scenes globally, none in opening structural third; protagonist enters the story without any felt tension; the suspense-channel sibling of ARC_CLOCK_OPENING_ZONE_ABSENT; distinct from ARC_SUSPENSE_FRONT_LOADED [>70% IN first half, fires when suspense IS there concentrated] and ARC_FIRST_HALF_EMOTIONALLY_FLAT [entire first half neutral, emotion not suspense]), negative relational aftermath void (sequence/aftermath × negative emotion → relational aftermath — n≥8, ≥2 qualifying negative-emotion scenes [pos<n-2], ≥2 relShift scenes globally, no negative scene followed by a relShift in next 2 scenes; protagonist's defeats never move bonds; distinct from ARC_POSITIVE_RELATIONAL_AFTERMATH_VOID [positive trigger] and ARC_REVELATION_RELATIONAL_AFTERMATH_VOID [revelation trigger]), payoff front-loaded (distribution/timing × payoff × first-half concentration — n≥8, ≥4 payoff scenes, >70% in first half while back half has ≥1; resolutions burst before pressure peaks; the front-half distribution complement of PAYOFF_BACK_LOADED in causality.ts; distinct from ARC_PAYOFF_DROUGHT_RUN [run-based] and ARC_RELATIONAL_FRONT_LOADED [different channel]).

Rules named in this wave's header:

- `ARC_CLOCK_OPENING_ZONE_ABSENT`
- `ARC_FIRST_HALF_EMOTIONALLY_FLAT`
- `ARC_POSITIVE_RELATIONAL_AFTERMATH_VOID`

## Wave 533

Wave 533 additions: curiosity peak relational void (single-peak isolation × curiosityDelta × relationship — n≥8, ≥2 relationship-shift scenes, ≥2 curiosity scenes, the scene with the highest curiosityDelta has no relationship shift; the story's maximum wonder moment is interpersonally inert; first single-peak check on the curiosity channel in this pass, distinct from ARC_CLOCK_PEAK_EMOTION_ABSENT and ARC_PEAK_SUSPENSE_EMOTION_ABSENT which use different peak signals and aftermath channels), dramatic-turn emotional aftermath void (sequence/aftermath × dramatic-turn → emotional aftermath — n≥8, ≥3 dramatic-turn scenes not at last position, none of the immediately following scenes carries a non-neutral emotional shift; pivots land without felt consequence; first aftermath check with dramatic-turn as trigger in this pass, distinct from ARC_DRAMATIC_TURN_AFTERMATH_VOID in causality.ts which checks causal logic and from ARC_SEED_EMOTIONAL_AFTERMATH_VOID which uses seed as trigger), curiosity back-loaded (distribution/timing × curiosityDelta × second half — n≥8, ≥4 curiosity scenes, >70% in second half while first half has ≥1; wonder ignites only late, never sustaining early investment; the back-half distribution complement of ARC_SUSPENSE_FRONT_LOADED, distinct from ARC_CURIOSITY_DROUGHT_RUN which is run-based and from CURIOSITY_FRONT_LOADED in causality.ts which is the opposite direction).

Rules named in this wave's header:

- `ARC_CURIOSITY_DROUGHT_RUN`
- `ARC_SEED_EMOTIONAL_AFTERMATH_VOID`
- `ARC_SUSPENSE_FRONT_LOADED`

## Wave 519

Wave 519 additions: curiosity drought run (run-based × curiosityDelta × absence — n≥10, ≥3 curiosity-positive scenes, longest run with curiosityDelta ≤ 0 ≥ 6; the wonder engine stalls for an extended stretch; first run-based check on the curiosity channel, distinct from ARC_RELATIONAL_DROUGHT_RUN and ARC_PAYOFF_DROUGHT_RUN which target different channels, and from all curiosity co-occurrence/zone/average-mode checks), suspense front-loaded (distribution/ timing × suspenseDelta × first half — n≥8, ≥4 suspense scenes, >70% in first half while back half has ≥1; tension exhausted before climax; first distribution check on suspense channel, distinct from ARC_EMOTIONAL_FRONT_LOADED and ARC_RELATIONAL_FRONT_LOADED on different channels, and from ARC_PEAK_SUSPENSE_EMOTION_ABSENT which uses single-peak mode), clock opening zone absent (zone presence/absence × clockRaised × opening third — n≥9, ≥3 clockRaised scenes, none in opening structural third; deadline urgency absent from setup; first zone-based check on clock channel targeting opening third, distinct from ARC_CLOCK_EMOTION_DECOUPLED co-occurrence, ARC_CLOCK_PEAK_EMOTION_ABSENT single-peak, ARC_CLOCK_CURIOSITY_AFTERMATH_VOID aftermath, and all relational zone checks which target the relational channel).

Rules named in this wave's header:

- `ARC_CLOCK_CURIOSITY_AFTERMATH_VOID`
- `ARC_EMOTIONAL_FRONT_LOADED`
- `ARC_PAYOFF_DROUGHT_RUN`
- `ARC_RELATIONAL_FRONT_LOADED`

## Wave 505

Wave 505 additions: seed emotional aftermath void (sequence/aftermath × seed → emotional aftermath — n≥8, ≥2 seed scenes not at last position, all followed by emotionally neutral scenes; foreshadowing never triggers felt consequence; distinct from all aftermath checks with revelation, turn, payoff, or positive triggers, and from all co-occurrence checks using the seed channel), clock curiosity aftermath void (average/aggregate × clockRaised → curiosity aftermath — n≥8, ≥2 clockRaised scenes not at last position, avg curiosityDelta of next scene ≤ 0; deadlines never open wondering in the protagonist; distinct from ARC_CLOCK_EMOTION_DECOUPLED and ARC_CLOCK_PEAK_EMOTION_ABSENT which check the clock scene itself, and from SEED_AFTERMATH_CURIOSITY_VOID in causality.ts which uses seed trigger not clock), payoff drought run (run-based × payoff absence — n≥10, ≥2 payoff scenes, longest consecutive run with no payoff ≥ 6; thread resolution goes dark for too long; distinct from ARC_RELATIONAL_DROUGHT_RUN which targets the relational channel, PAYOFF_BACK_LOADED in causality.ts which is a zone check, and all negative/ positive emotion run checks which target the emotion channel).

Rules named in this wave's header:

- `ARC_CLOCK_PEAK_EMOTION_ABSENT`
- `ARC_RELATIONAL_DROUGHT_RUN`

## Wave 491

Wave 491 additions: clock peak emotion absent (single-peak isolation × clock-delta × emotion — n≥8, ≥2 emotional scenes, the scene with the highest clockDelta is emotionally neutral; the clock-delta cell in the single-peak family alongside ARC_PEAK_SUSPENSE_EMOTION_ABSENT and ARC_PEAK_CURIOSITY_EMOTION_ABSENT; distinct from ARC_CLOCK_EMOTION_DECOUPLED which fires on all clockRaised scenes being neutral vs this firing on the single peak-delta scene), payoff emotion decoupled (co-occurrence × payoff × emotion — n≥8, ≥3 payoff scenes, ≥2 emotional scenes, all payoff scenes neutral; thread resolutions never move the protagonist; the payoff-channel complement of ARC_CLOCK_EMOTION_DECOUPLED), payoff aftermath emotional void (sequence/aftermath × payoff → emotional aftermath — n≥8, ≥3 payoff scenes not at last position, every immediately following scene is neutral; distinct from ARC_PAYOFF_EMOTION_DECOUPLED which checks the payoff scene itself, and from ARC_TURN_EMOTIONAL_AFTERMATH_VOID which uses a dramatic-turn trigger).

Rules named in this wave's header:

- `ARC_CLOCK_EMOTION_DECOUPLED`
- `ARC_PAYOFF_EMOTION_DECOUPLED`
- `ARC_PEAK_CURIOSITY_EMOTION_ABSENT`
- `ARC_PEAK_SUSPENSE_EMOTION_ABSENT`

## Wave 477

Wave 477 additions: positive relational aftermath void (every positive-emotion scene is followed by 2 scenes with no relationship shift — the protagonist's joys never move a bond in their wake; sequence/aftermath × positive-emotion × relational aftermath, the positive-emotion trigger complement of ARC_REVELATION_RELATIONAL_AFTERMATH_VOID's revelation trigger), turn zone cluster (>75% of dramatic-turn scenes fall in a single third of the script — pivots are ghettoized into one structural zone; distribution/timing × dramatic-turn channel, distinct from DRAMATIC_TURN_CLUSTER in causality.ts which checks micro-window concentration, and from ARC_EMOTIONAL_FRONT/ BACK_LOADED which distribute emotion not turns), peak positive uncaused (the script's final positive-emotion scene — the most structurally climactic joy — has no revelation, no dramatic turn, no suspense rise in its 2 preceding scenes; backward-cause × single-peak × positive-emotion, the positive-emotion complement of ARC_PEAK_RELATIONAL_UNCAUSED).

Rules named in this wave's header:

- `ARC_PEAK_RELATIONAL_UNCAUSED`
- `ARC_REVELATION_RELATIONAL_AFTERMATH_VOID`

## Wave 463

Wave 463 additions: suspense relational decoupled (≥3 suspense-positive scenes all have no relationship shift while non-suspense scenes do move bonds — danger never carries relational consequence; co-occurrence × suspense × relational, the suspense-channel parallel of ARC_CURIOSITY_RELATIONAL_DECOUPLED), relational front-loaded (>70% of shift scenes fall in the first half while the back half has at least one — bonds all move early then the climax goes relationally inert; distribution/timing × relational, the mirror of ARC_RELATIONAL_BACK_LOADED), revelation relational aftermath void (every revelation is followed by 2 scenes with no relationship shift — discoveries never reshape bonds in their wake; sequence/aftermath × revelation × relational aftermath, distinct from ARC_REVELATION_EMOTION_ABSENT which audits the revelation scene's own emotion and from ARC_TURN_EMOTIONAL_AFTERMATH_VOID's turn→emotion axis).

Rules named in this wave's header:

- `ARC_CURIOSITY_RELATIONAL_DECOUPLED`
- `ARC_RELATIONAL_BACK_LOADED`
- `ARC_REVELATION_EMOTION_ABSENT`
- `ARC_TURN_EMOTIONAL_AFTERMATH_VOID`

## Wave 449

Wave 449 additions: relational drought run (≥5 consecutive scenes with no relationship shift despite ≥2 shift scenes existing — the protagonist's interpersonal world freezes in an extended run; run-based × relational × absence, the first run-based check on relational silence, distinct from all three zone-based relational void checks), turn emotional aftermath void (every dramatic turn is followed by 2 emotionally neutral scenes — the protagonist shows no felt reaction to any pivot; sequence/aftermath × turn × emotional aftermath, distinct from ARC_TURN_EMOTION_ABSENT which audits the turn scene itself and from DRAMATIC_TURN_AFTERMATH_VOID in causality.ts which checks all channels simultaneously), curiosity relational decoupled (≥3 curiosity-positive scenes all have no relationship shift while non-curiosity scenes do move bonds — wonder is never accompanied by relational consequence; co-occurrence × curiosity × relational, the first check in this pass pairing the curiosity trigger with the relational output channel instead of the emotion channel).

Rules named in this wave's header:

- `ARC_TURN_EMOTION_ABSENT`

## Wave 435

Wave 435 additions: emotional overload (≥80% of scenes are non-neutral with both polarities present — perpetual emotion with no breathing room, emotion becomes wallpaper without contrast; underweight/bloat mode, the complement of ARC_EMOTIONAL_FLATLINE), clock emotion decoupled (≥3 clockRaised scenes are all emotionally neutral while non-clock scenes carry feeling — deadlines never produce emotional investment; co-occurrence/decoupling × clockRaised × emotionalShift, first clockRaised channel check in this pass), peak relational uncaused (the scene with the most relationship shifts by count has no emotional charge, revelation, clock, or turn in the two preceding scenes — the densest relational moment appears without narrative preparation; backward-cause × single-peak isolation × relational channel, distinct from ARC_PEAK_RELATIONAL_EMOTION_ABSENT which audits the peak scene's own emotional state).

Rules named in this wave's header:

- `ARC_EMOTIONAL_FLATLINE`
- `ARC_PEAK_RELATIONAL_EMOTION_ABSENT`

## Wave 421

Wave 421 additions: relational negative-only (≥3 shifts, zero positive — every bond only erodes; valence mode, relational mirror of ARC_RELATIONAL_POSITIVE_ONLY), peak relational emotion absent (the scene with the highest absolute shift magnitude is emotionally neutral while emotion exists elsewhere; single-peak isolation × relational × emotion), relational midpoint void (no shift in the 40%–60% pivot zone while shifts exist elsewhere; zone presence/absence × relational × midpoint).

Rules named in this wave's header:

- `ARC_RELATIONAL_POSITIVE_ONLY`

## Wave 407

Wave 407 additions: relational positive-only (≥3 relationship shifts, none negative — bonds only ever warm, the relational mirror of ARC_POSITIVE_ONLY), relational back-loaded (>70% of relationship shifts fall in the second half while the front half has at least one — a relationally inert opening, the relational mirror of ARC_EMOTIONAL_BACK_LOADED), relational recovery absent (≥2 negative shifts and a positive shift exists, but none after the first fracture — a broken bond never repairs, the relational mirror of ARC_EMOTIONAL_RECOVERY_ABSENT).

Rules named in this wave's header:

- `ARC_EMOTIONAL_BACK_LOADED`
- `ARC_EMOTIONAL_RECOVERY_ABSENT`
- `ARC_POSITIVE_ONLY`

## Wave 138

Wave 138 additions: per-character relational arc tracking using relationship shift data — detects characters present throughout the story who have zero relational movement (CHARACTER_ARC_RELATIONAL_STASIS) and identifies when the protagonist has no relationship arc despite being present everywhere (CHARACTER_ARC_PROTAGONIST_PASSIVE).

Rules named in this wave's header:

- `CHARACTER_ARC_PROTAGONIST_PASSIVE`
- `CHARACTER_ARC_RELATIONAL_STASIS`

## Unattributed (no explicit wave-header mention)

These rule constants exist in this pass but were not found, by exact-name match, inside any "Wave N —" / "Wave N additions:" header entry in the file — typically because they predate that convention hardening, or the header describes the check descriptively rather than by constant name (e.g. "talking heads" rather than `TALKING_HEADS`). Listed here honestly rather than guessed into a wave, with the nearest preceding in-code "── section title ──" comment as the best-available substitute context where one exists.

- `ARC_ACT1_RELATIONAL_DESERT` — Wave 242: Act 1 relational desert, midpoint positive absent, revelation unincorporated
- `ARC_BOOKEND_IDENTICAL` — Wave 196: Opening void, catharsis absent, bookend identical
- `ARC_CATHARSIS_ABSENT` — Wave 196: Opening void, catharsis absent, bookend identical
- `ARC_CURIOSITY_BACK_LOADED` — Wave 519 checks
- `ARC_CURIOSITY_EMOTION_DECOUPLED` — Wave 312: ARC_CURIOSITY_EMOTION_DECOUPLED
- `ARC_DRAMATIC_TURN_MONOTONE` — Wave 298: ARC_DRAMATIC_TURN_MONOTONE
- `ARC_EMOTIONAL_MONOTONE` — Wave 153: Arc monotone, late introduction, emotional whiplash
- `ARC_EMOTIONAL_OVERLOAD` — Wave 435: ARC_EMOTIONAL_OVERLOAD, ARC_CLOCK_EMOTION_DECOUPLED, ARC_PEAK_RELATIONAL_UNCAUSED
- `ARC_EMOTIONAL_RESOLUTION_ABSENT` — Wave 284: ARC_EMOTIONAL_RESOLUTION_ABSENT
- `ARC_FINAL_ACT_CHARACTER_STATIC` — Wave 228: Protagonist social invulnerability, midpoint relational void, final-act stasis
- `ARC_GRIEF_SKIPPED` — Wave 298: ARC_GRIEF_SKIPPED
- `ARC_LATE_LOW_POINT_ABSENT` — Wave 393: ARC_EMOTIONAL_BACK_LOADED, ARC_POSITIVE_EMOTION_RUN, ARC_LATE_LOW_POINT_ABSENT
- `ARC_LATE_RELATIONAL_VOID` — Wave 270: ARC_LATE_RELATIONAL_VOID
- `ARC_LATE_TURN_UNSUPPORTED` — Wave 213: Arc dynamics — multi-signal narrative physics
- `ARC_MIDPOINT_INERT` — Wave 213: Arc dynamics — multi-signal narrative physics
- `ARC_MIDPOINT_RELATIONAL_VOID` — Wave 228: Protagonist social invulnerability, midpoint relational void, final-act stasis
- `ARC_NEGATIVE_ONLY` — Wave 256: Relational dimension monotony, emotional flatline, negative-only arc
- `ARC_OPENING_VOID` — Wave 196: Opening void, catharsis absent, bookend identical
- `ARC_PAYOFF_CURIOSITY_AFTERMATH_VOID` — Wave 519 checks
- `ARC_PAYOFF_FRONT_LOADED` — Wave 519 checks
- `ARC_POSITIVE_MIDPOINT_ABSENT` — Wave 242: Act 1 relational desert, midpoint positive absent, revelation unincorporated
- `ARC_PROTAGONIST_UNTESTED_SOCIALLY` — Wave 228: Protagonist social invulnerability, midpoint relational void, final-act stasis
- `ARC_RELATIONAL_FIRST_HALF_FLAT` — Wave 351: ARC_SECOND_HALF_EMOTIONALLY_FLAT, ARC_EMOTIONAL_RECOVERY_ABSENT, ARC_RELATIONAL_FIRST_HALF_FLAT
- `ARC_RELATIONAL_MIDPOINT_VOID` — Wave 421: ARC_RELATIONAL_NEGATIVE_ONLY, ARC_PEAK_RELATIONAL_EMOTION_ABSENT, ARC_RELATIONAL_MIDPOINT_VOID
- `ARC_RELATIONAL_NEGATIVE_ONLY` — Wave 421: ARC_RELATIONAL_NEGATIVE_ONLY, ARC_PEAK_RELATIONAL_EMOTION_ABSENT, ARC_RELATIONAL_MIDPOINT_VOID
- `ARC_RELATIONAL_RECOVERY_ABSENT` — Wave 407: ARC_RELATIONAL_POSITIVE_ONLY, ARC_RELATIONAL_BACK_LOADED, ARC_RELATIONAL_RECOVERY_ABSENT
- `ARC_RELATIONAL_SHIFT_EMOTION_FLAT` — Wave 365: ARC_PEAK_SUSPENSE_EMOTION_ABSENT, ARC_PEAK_CURIOSITY_EMOTION_ABSENT, ARC_RELATIONAL_SHIFT_EMOTION_FLAT
- `ARC_REVELATION_UNINCORPORATED` — Wave 242: Act 1 relational desert, midpoint positive absent, revelation unincorporated
- `ARC_SECOND_HALF_EMOTIONALLY_FLAT` — Wave 351: ARC_SECOND_HALF_EMOTIONALLY_FLAT, ARC_EMOTIONAL_RECOVERY_ABSENT, ARC_RELATIONAL_FIRST_HALF_FLAT
- `ARC_SINGLE_DIMENSION` — Wave 256: Relational dimension monotony, emotional flatline, negative-only arc
- `ARC_STALL_IN_ACT2` — Wave 182: Arc stall in Act 2, secondary arc mirror, climax void
- `ARC_SUSPENSE_CURIOSITY_DECOUPLED` — Wave 337: ARC_SUSPENSE_CURIOSITY_DECOUPLED, ARC_REVELATION_EMOTION_ABSENT, ARC_REVELATION_CURIOSITY_DECOUPLED
- `ARC_SUSPENSE_RELATIONAL_DECOUPLED` — Wave 463: ARC_SUSPENSE_RELATIONAL_DECOUPLED, ARC_RELATIONAL_FRONT_LOADED, ARC_REVELATION_RELATIONAL_AFTERMATH_VOID
- `ARC_UNCONTESTED_ASCENT` — Wave 213: Arc dynamics — multi-signal narrative physics
- `CHARACTER_LATE_INTRODUCTION` — Wave 153: Arc monotone, late introduction, emotional whiplash
- `CLIMAX_EMOTIONALLY_FLAT` — Approaching climax without emotional peak
- `EMOTIONAL_WHIPLASH` — Wave 153: Arc monotone, late introduction, emotional whiplash
- `FLAT_CHARACTER_ARC` — Compute emotional journey per "character zone"
- `NO_REVELATIONS` — No revelation scenes in a complete story
- `RELATIONAL_SYMMETRY_ABSENT` — Wave 168: Relational symmetry, arc resolution, secondary character void
- `SECONDARY_ARC_MIRROR` — Wave 182: Arc stall in Act 2, secondary arc mirror, climax void
- `SECONDARY_CHARACTER_VOID` — Wave 168: Relational symmetry, arc resolution, secondary character void
- `UNMOTIVATED_TRANSFORMATION` — Transformation without a causal scene

