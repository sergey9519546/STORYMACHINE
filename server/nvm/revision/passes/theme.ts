// Wave 130 — Pass 13: Theme Resonance
// Checks whether each scene's dialogue, action, and visual content actively
// echoes, embodies, or challenges the declared story theme. A theme that's
// stated in the logline but never dramatized is an empty promise.
//
// This pass only fires when storyContext.theme is set (a non-trivial statement).
// It checks two failure modes:
//   1. THEME_RESONANCE_GAP — too many scenes have zero language related to the theme
//   2. THEME_UNRESOLVED   — Act 3 contains no thematic language (climax fails to answer)
// Wave 148 additions: theme craft — heavy-handedness (too dense/preachy),
// dialectic absence (theme asserted but never challenged), and front-loading
// (theme dumped early then abandoned).
// Wave 162 additions: theme midpoint silent (structural pivot has no theme voice),
// theme accelerating density absent (theme fades instead of amplifying toward climax),
// theme dialectic in Act 3 absent (Act 2 challenges the theme but Act 3 only affirms).
// Wave 346 additions: theme suspense peak absent (the highest-suspense scene is themically
// mute), theme late debut (the first resonant scene falls at or past the midpoint), theme
// closing quarter silent (the final 25% carries no theme while it appears earlier).
// Wave 360 additions: Act 3 density drop (Act 3 resonance proportion < 50% of Act 2's —
// theme thins at the approach to resolution), relationship peak absent (the scene with the
// largest relationship shift magnitude is thematically silent while others carry theme),
// dual peak absent (the scene with max combined suspenseDelta + curiosityDelta is
// thematically mute — peak drama and peak curiosity arrive without the theme).
// Wave 374 additions: Act 1 density drop (the opening 25% is under-themed vs the body),
// clock peak absent (the largest-clockDelta deadline is thematically silent — complement
// of clock scene silent), charged scene silent (no non-neutral emotional scene carries the
// theme — feeling and meaning never coincide, across both polarities together).
// Wave 388 additions: midpoint density drop (the 40%–60% zone is <50% as resonant as the
// story overall — theme thins at the pivot), opening image silent (the first scene carries
// no theme though it appears later — the bookend mirror of final scene silent), proactive
// decoupled (every clock/clue-planting scene is thematically silent — agency and meaning
// never coincide).
// Wave 402 additions: Act 2a density drop (the 25%–50% conflict-entry zone is less than
// half as resonant as overall — completes the zone density set with Act 1/2b/3/midpoint),
// seed peak absent (the scene that plants the most clues is thematically silent while other
// seed scenes carry theme — the single-peak mode for the seededClueIds channel), payoff
// peak absent (the scene that resolves the most setups is thematically silent while other
// payoff scenes carry theme — the single-peak mode for the payoffSetupIds channel).
// Wave 265 additions: clue scenes decoupled (≥2 clue-planting scenes with no theme),
// curiosity scenes decoupled (≥2 curiosity spikes with no theme), payoff scenes
// decoupled (≥2 payoff scenes with no theme).
// Wave 279 additions: dramatic-turn scenes carry no theme (≥2 turns, n≥8), negative
// emotional-shift scenes carry no theme (≥2 negative shifts, n≥8), and high-suspense
// scenes (suspenseDelta > 1) all carry no theme (≥3 scenes, n≥8).
// Wave 293 additions: revelation scenes carry no theme (≥2 revelations, n≥8), clock-raised
// scenes carry no theme (≥2 clockRaised, n≥8), payoff scenes carry no theme (≥2 payoffs, n≥8).
// Wave 307 additions: shallow resonance (no resonant scene matches ≥2 distinct theme
// keywords — theme name-dropped but never explored in depth), quiet scenes only (every
// resonant scene is emotionally neutral and low-suspense), resonance burst (a single
// scene holds >50% of all theme keyword occurrences).
// Wave 321 additions: peak before midpoint (the densest theme scene falls in the first
// half — theme should crescendo toward the climax), raise-stakes silent (every stake-
// raising scene is thematically empty), suspense-release silent (every clock-release
// scene is thematically empty — exhale beats waste their reflection potential).
// Wave 332 additions: development scene desert (none of the purpose='development'
// scenes carry theme — connective tissue is thematically empty), curiosity peak absent
// (the highest-curiosity scene lacks theme even when others carry it), Act 2b density
// drop (theme thins in Act 2b vs Act 2a — story loses thematic pressure pre-climax).
// Wave 416 additions: resonant singleton run (the theme never accumulates across
// consecutive scenes — every resonant scene is isolated, run-based mode × resonance
// sequence), peak suspense aftermath silent (the scene immediately following the
// story's highest-suspense moment carries no theme — sequence/aftermath mode ×
// peak suspenseDelta), dual rise decoupled (every scene where both suspenseDelta and
// curiosityDelta are simultaneously positive carries no theme — co-occurrence/
// decoupling mode across the joint tension+curiosity channel).
// Wave 430 additions: dramatic turn aftermath silent (sequence/aftermath — every scene
// immediately following a dramatic pivot carries no theme even though other scenes do,
// wasting the most reflective post-reversal processing beat), peak unmotivated
// (backward-cause — the story's densest theme scene lacks any structural catalyst in
// the two preceding scenes, so the thematic peak appears without narrative preparation),
// resonance emotionally lopsided (valence — the emotionally charged resonant scenes are
// ≥3:1 skewed toward one polarity, leaving the theme unable to speak in the opposite
// emotional register).
// Wave 444 additions: resonant cluster flood (run-based — 4+ consecutive scenes all carry
// theme, creating a local echo-chamber drumbeat that dilutes contrast; the opposite extreme
// from THEME_RESONANT_SINGLETON_RUN and distinct from global-proportion and single-peak checks),
// long silent stretch (distribution/timing — the single longest gap between any two resonant
// scenes is ≥5 consecutive inert scenes; fires when one stretch is thematically empty even
// when global proportion and zone checks pass), revelation aftermath silent (sequence/aftermath —
// every scene immediately following a revelation carries no theme though theme appears elsewhere;
// the first aftermath check anchored to the revelation channel, distinct from dramatic-turn
// aftermath and from the revelation-scenes-themselves check).
// Wave 458 additions: relationship decoupled (co-occurrence/decoupling × relationship shift —
// all scenes with non-empty relationshipShifts are thematically silent; bonds never move
// in the same beat where the theme is voiced; the relationship-channel sibling of all
// existing decoupled checks — clue/curiosity/payoff/turn/emotion/suspense/revelation/clock),
// clock aftermath silent (sequence/aftermath × clock → theme — no clock-raised scene is
// followed within 1 scene by theme resonance; every deadline passes without the next scene
// picking up the thematic meaning; the aftermath sibling of THEME_CLOCK_RAISED_DECOUPLED),
// all resonance causeless (backward-cause × all resonant scenes — every resonant scene is
// preceded in the prior 2 scenes by no revelation, dramatic turn, or high suspense; theme
// surfaces in narrative dead air; broader than THEME_PEAK_UNMOTIVATED which checks only
// the single densest scene).
// Wave 472 additions: positive emotion decoupled (co-occurrence/decoupling × positive emotional
// shift — all scenes with emotionalShift='positive' are thematically silent; the positive polarity
// complement to THEME_NEGATIVE_EMOTION_DECOUPLED, completing the full valence-channel set in the
// co-occurrence family), resonant valence uniform (valence × within-resonant-set — >80% of resonant
// scenes share the same emotional register; theme is tonal-monotone, always voiced in one kind of
// scene; distinct from RESONANCE_EMOTIONALLY_LOPSIDED which fires on 3:1 charged-scene skew and
// QUIET_SCENES_ONLY which requires all neutral+low-suspense; this fires even when the uniform
// register is 'neutral' with high suspense), dialogue peak silent (single-peak isolation × dialogue
// channel — the scene with the most dialogue highlights carries no theme while ≥2 others do; the
// script's most verbally active moment is thematically mute; fills the dialogue-channel cell in the
// single-peak isolation family alongside seed/payoff/curiosity/suspense/relationship/clock peaks).
// Wave 486 additions: positive emotion aftermath silent (sequence/aftermath × positive emotion
// trigger → theme — n≥8, ≥2 positive-shift scenes not at last position, none followed by a
// resonant scene; the aftermath × positive-emotion channel, distinct from THEME_POSITIVE_EMOTION_DECOUPLED
// which fires when the positive scene itself is silent), first resonant causeless (backward-cause
// × first resonant scene — the story's inaugural thematic moment lacks any structural catalyst in
// the 2 prior scenes; distinct from THEME_PEAK_UNMOTIVATED which targets the densest scene and from
// THEME_ALL_RESONANCE_CAUSELESS which requires every resonant scene to be causeless), resonance thirds
// cluster (distribution/timing × thirds × resonant scene proportion — >75% of resonant scenes fall
// in one structural third; distinct from THEME_FRONT_LOADED which compares keyword hit density
// first-third vs rest, and from zone checks which fire on 0 resonant scenes in a zone).
// Wave 500 additions: negative emotion aftermath silent (sequence/aftermath × negative emotion
// trigger → theme — n≥8, ≥2 negative-shift scenes not at last position, none followed by a
// resonant scene; the negative-polarity aftermath complement to THEME_POSITIVE_EMOTION_AFTERMATH_SILENT,
// completing the full emotional-polarity pair for the aftermath × emotion channel), last resonant
// causeless (backward-cause × last resonant scene — the story's valedictory thematic beat lacks
// any structural catalyst in the 2 prior scenes; the final-scene sibling of THEME_FIRST_RESONANT_
// CAUSELESS, distinct from THEME_PEAK_UNMOTIVATED which targets the densest scene), payoff aftermath
// silent (sequence/aftermath × payoff trigger → theme — n≥8, ≥2 qualifying payoff scenes not at
// last position, none followed by a resonant scene; first aftermath check with the payoff channel,
// distinct from THEME_REVELATION_AFTERMATH_SILENT which uses the revelation trigger).
// Wave 584 additions: resonant aftermath turn void (sequence/aftermath × dramatic-turn ×
// resonant trigger — ≥2 qualifying resonant scenes none followed by a dramatic turn in next 2
// scenes while ≥2 turn scenes exist; theme never precipitates a reversal or recognition; adds
// the dramatic-turn channel to the resonant-trigger aftermath family alongside curiosity/suspense/
// emotion/relationship/clock; distinct from DRAMATIC_TURN_AFTERMATH_SILENT [turn is trigger],
// completing the output-channel set), resonant emotion flat (average/aggregate × emotion ×
// resonant-scene set — ≥4 resonant scenes all with emotionalShift='neutral' while ≥2 emotional
// scenes exist globally; theme always voiced in affectively flat moments; distinct from
// QUIET_SCENES_ONLY [requires BOTH neutral emotion AND low suspense] and RESONANT_VALENCE_UNIFORM
// [fires on any dominant polarity, not only neutral] and RESONANT_SUSPENSE_FLAT [suspense channel]),
// resonant clock flat (average/aggregate × clock × resonant-scene set — ≥3 resonant scenes all
// without clock raised while ≥2 clock scenes exist; theme always voiced in deadline-free moments;
// distinct from CLOCK_RAISED_DECOUPLED [reverse direction: clock scenes are theme-silent] and
// RESONANT_AFTERMATH_CLOCK_VOID [aftermath mode]; completes the average/aggregate × channel set
// alongside RESONANT_SUSPENSE_FLAT and RESONANT_CURIOSITY_FLAT with the clock channel).
// Wave 570 additions: resonant aftermath emotion void (sequence/aftermath × emotion × resonant
// trigger — ≥2 qualifying resonant scenes none followed by an emotional shift in next 2 scenes while
// ≥2 emotional scenes exist; theme surfacing produces no felt response in its wake), resonant
// aftermath relationship void (sequence/aftermath × relationship × resonant trigger — ≥2 qualifying
// resonant scenes none followed by a relationship shift in next 2 scenes while ≥2 shift scenes exist;
// theme never reshapes bonds in its wake), resonant aftermath clock void (sequence/aftermath × clock
// × resonant trigger — ≥2 qualifying resonant scenes none followed by a clock raise in next 2 scenes
// while ≥2 clock scenes exist; theme never converts into urgency in its wake). These add the emotion,
// relationship, and clock output channels to the resonant-as-trigger aftermath family alongside the
// curiosity (Wave 542) and suspense (Wave 556) channels; each is distinct from its reverse-direction
// sibling (THEME_*_AFTERMATH_SILENT, where X is the trigger and theme the aftermath) and from the
// co-occurrence/peak checks on the same channels.
// Wave 556 additions: resonant aftermath suspense void (sequence/aftermath × suspense × resonant
// trigger — ≥2 qualifying resonant scenes none followed by suspenseDelta>0 in next 2 scenes while
// ≥2 suspense scenes exist; theme surfacing never activates tension in its aftermath; suspense-
// channel sibling of THEME_RESONANT_AFTERMATH_CURIOSITY_VOID, fills the aftermath × suspense cell
// in the resonant-as-trigger family), resonant curiosity flat (average/aggregate × curiosity ×
// resonant set — ≥3 resonant scenes, all with curiosityDelta ≤ 0 while ≥2 curiosity-spike scenes
// exist globally; theme always surfaces in curiosity-flat moments; curiosity-channel complement of
// THEME_RESONANT_SUSPENSE_FLAT and distinct from THEME_QUIET_SCENES_ONLY which also requires
// emotional neutrality), theme dialogue highlight decoupled (co-occurrence/decoupling × dialogue
// highlight signal — ≥3 scenes with non-empty dialogueHighlights all thematically silent; the
// most verbally dense scenes of the script never carry theme language; distinct from THEME_DIALOGUE_
// PEAK_SILENT which only checks the single peak scene, and from CLUE_SCENES_DECOUPLED which uses
// a different signal).
// Wave 542 additions: resonant suspense flat (average/aggregate × suspense × resonant set —
// every resonant scene has suspenseDelta ≤ 0 while ≥2 suspense-spike scenes exist globally;
// theme always surfaces in tension-free contexts; distinct from QUIET_SCENES_ONLY which also
// requires emotional neutrality and from HIGH_SUSPENSE_SCENES_DECOUPLED which checks the
// reverse direction), Act 2b resonant causeless (backward-cause × Act 2b zone 50%–75% —
// the first resonant scene in Act 2b lacks any structural catalyst in the 2 prior scenes while
// catalysts exist elsewhere; fills the Act 2b cell in the backward-cause zone family alongside
// midpoint/first/last/peak zone cells), resonant aftermath curiosity void (sequence/aftermath ×
// curiosity × resonant trigger — ≥2 qualifying resonant scenes none followed by curiosityDelta>0
// in next 2 scenes while ≥2 curiosity-spike scenes exist; theme surfacing never generates
// questions; first aftermath check using the resonant scene as trigger rather than as aftermath).
// Wave 528 additions: relationship shift aftermath silent (sequence/aftermath × relationship shift
// trigger → theme — n≥8, ≥2 qualifying relationship-shift scenes none followed by a resonant scene;
// the first aftermath check triggered by relationshipShifts, distinct from THEME_RELATIONSHIP_DECOUPLED
// which fires when the shift scene ITSELF is silent), midpoint resonant causeless (backward-cause ×
// midpoint zone resonant scene — the first resonant scene in the 40%–60% midpoint zone lacks any
// structural catalyst in the 2 prior scenes while catalysts exist elsewhere; fills the midpoint-zone
// cell in the backward-cause family alongside FIRST/LAST/PEAK_UNMOTIVATED), theme back heavy
// (distribution/timing × second-half proportion — >65% of ≥3 resonant scenes fall in the second half
// while ≥1 exists in the first half; theme is back-loaded across acts, distinct from THIRDS_CLUSTER
// which fires on >75% in any single third and from FRONT_LOADED which compares keyword density).
// Wave 514 additions: seed aftermath silent (sequence/aftermath × seed trigger → theme — n≥8, ≥2
// qualifying seed scenes [seededClueIds non-empty] not at last position, none followed by a resonant
// scene; the seed-channel aftermath complement to THEME_PAYOFF_AFTERMATH_SILENT; distinct from
// THEME_CLUE_SCENES_DECOUPLED which fires when the clue scene ITSELF is silent), high-suspense
// aftermath silent (sequence/aftermath × suspense trigger — n≥8, ≥2 high-suspense scenes with
// suspenseDelta>1 not at last position, none followed by resonant; broader than THEME_PEAK_SUSPENSE_
// AFTERMATH_SILENT which targets only the single max-suspense spike; distinct from THEME_HIGH_SUSPENSE_
// SCENES_DECOUPLED which fires when the scene itself is silent), curiosity aftermath silent
// (sequence/aftermath × curiosity trigger — n≥8, ≥2 curiosity-spike scenes with curiosityDelta>0
// not at last position, none followed by resonant; the curiosity-channel aftermath complement to
// THEME_CURIOSITY_SCENES_DECOUPLED; completes the aftermath × {seed, suspense, curiosity} channel family).
// Wave 598 additions: unresolved clue decoupled (co-occurrence/decoupling × resonance ×
// unresolvedClues-present — n≥6, ≥2 scenes carrying outstanding clue-debt, zero of them
// thematically resonant; distinct from THEME_CLUE_DECOUPLED [Wave 265: seededClueIds, the
// scene where a clue is PLANTED — a single-scene event] since unresolvedClues tracks the STATE
// of a clue remaining unpaid across every scene it lingers in, not just the planting moment;
// first use of the unresolvedClues signal in this 99-rule file), unresolved clue zone imbalance
// (underweight/bloat × unresolvedClues-present × four structural zones, built on checkZoneImbalance
// from the shared checks library — audit M2.2 — n≥10, ≥4 debt-carrying scenes; fires only when one
// zone has zero such scenes while another holds ≥50%; audits WHERE narrative debt concentrates
// structurally, orthogonal to THEME_RESONANCE_THIRDS_CLUSTER which audits resonance distribution,
// not clue-debt distribution), unresolved clue aftermath silent (sequence/aftermath ×
// unresolvedClues-present trigger → resonance aftermath, built on checkAftermathVoid — n≥8, ≥3
// qualifying debt-carrying scenes, none followed by a resonant scene in the next 2; distinct from
// the same-scene co-occurrence check above by aftermath mode, and from every other THEME_*_AFTERMATH_
// SILENT check by trigger channel).
// Wave 612 additions: THEME_VISUAL_BEAT_DECOUPLED, THEME_VISUAL_BEAT_ZONE_IMBALANCE,
// THEME_VISUAL_BEAT_AFTERMATH_SILENT (co-occurrence/decoupling, underweight/bloat, and
// sequence/aftermath × resonance × visualBeats — the same three-mode treatment Wave 598 gave
// unresolvedClues, applied here to visualBeats, the one record field this 102-rule pass had never
// used at all despite pairing resonance with nearly every other channel).
// Wave 626 additions: THEME_PAYOFF_STAGING_DECOUPLED, THEME_SEED_DIALOGUE_HIGHLIGHT_AFTERMATH_
// VOID, THEME_PAYOFF_ZONE_IMBALANCE. Departs from this file's dominant "resonance × X" pattern —
// every record field has now been crossed with resonance at least once across Waves 598/612 and
// the many hand-rolled checks before them. These three instead pair two non-resonance record
// fields directly (payoffSetupIds × visualBeats, seededClueIds × dialogueHighlights, payoffSetupIds
// alone), none of which have been combined with each other anywhere in this 105-rule pass.
// Wave 640 additions: THEME_CLOCK_DROUGHT_RUN (run-based × clockRaised absence — first use of the
// run-based mode in this 108-rule pass), THEME_STAGING_PEAK_UNCAUSED (backward-cause ×
// visualBeats-density peak × revelation/dramaticTurn cause — first backward-cause check in this
// file), THEME_PAYOFF_ZONE_CLUSTER (distribution/timing × payoffSetupIds × structural thirds —
// first zone-cluster mode applied to records here).
// Wave 654 additions: THEME_OPEN_THREAD_PEAK_UNCAUSED (single-peak isolation/backward-cause ×
// unresolvedClues magnitude — the scene carrying the most simultaneous open threads has no
// dramatic turn or revelation in itself or the two scenes before it; Wave 640's THEME_STAGING_
// PEAK_UNCAUSED applied the peak-uncaused mode to visualBeats; unresolvedClues had only a single
// incidental mention in this 111-rule pass before this wave), THEME_HIGHLIGHT_DROUGHT_RUN
// (run-based × dialogueHighlights absence — Wave 640's THEME_CLOCK_DROUGHT_RUN applied the
// drought-run mode to clockRaised; dialogueHighlights itself has never been drought-audited here
// despite already anchoring the hand-rolled THEME_DIALOGUE_PEAK_SILENT), THEME_SEED_ZONE_CLUSTER
// (distribution/timing × seededClueIds × structural thirds — Wave 640's THEME_PAYOFF_ZONE_CLUSTER
// applied the zone-cluster mode to payoffSetupIds; seededClueIds itself has never been
// cluster-audited here).
// Wave 668 additions: THEME_RELATIONSHIP_PEAK_UNCAUSED (single-peak isolation/backward-cause ×
// relationshipShifts magnitude — the scene with the most simultaneous bond changes has no
// dramatic turn or revelation in itself or the two scenes before it; distinct from the existing
// hand-rolled THEME_RELATIONSHIP_PEAK_ABSENT [Wave 360], which checks whether the peak
// relational-shift scene lacks thematic resonance, not whether it is backward-caused),
// THEME_PAYOFF_DROUGHT_RUN (run-based × payoffSetupIds absence — Wave 640 applied the
// drought-run mode to clockRaised; payoffSetupIds itself has never been drought-audited despite
// anchoring THEME_PAYOFF_ZONE_CLUSTER and THEME_PAYOFF_PEAK_ABSENT already), THEME_TURN_ZONE_
// CLUSTER (distribution/timing × dramaticTurn presence × structural thirds — Wave 640/654 applied
// the zone-cluster mode to payoffSetupIds and seededClueIds; dramaticTurn itself has never been
// cluster-audited despite being the most heavily used field in this pass).
// Wave 682 additions: THEME_CLOCK_DELTA_PEAK_UNCAUSED (single-peak isolation/backward-cause ×
// clockDelta magnitude — the scene where the clock advances the most has no dramatic turn or
// revelation in itself or the two scenes before it; distinct from the existing hand-rolled
// THEME_CLOCK_PEAK_ABSENT [Wave 374], which checks whether the peak clock-raising scene lacks
// thematic resonance, not whether it is backward-caused), THEME_STAGING_DROUGHT_RUN (run-based ×
// visualBeats absence — Waves 612/640/654/668 already audit visualBeats via decoupling, four-zone
// imbalance, aftermath-silence, and peak-uncaused, but never via drought-run; a long stretch with
// no visual staging at all leaves the theme's imagery dormant), THEME_CHARACTER_MOMENT_ZONE_CLUSTER
// (distribution/timing × purpose === 'character_moment' × structural thirds — the purpose field
// has only ever been referenced incidentally [raise_stakes at line 1392] and never used as a
// standalone signal here; character-defining scenes clustering in one third leave the theme's
// human throughline unevenly weighted).
// Wave 696 additions: THEME_STAGING_ZONE_CLUSTER (distribution/timing × visualBeats × structural
// thirds — completing this channel's coverage alongside the existing peak-uncaused [Wave 640] and
// drought-run [Wave 682] checks), THEME_PAYOFF_PEAK_UNCAUSED (single-peak isolation/backward-cause
// × payoffSetupIds magnitude — completing this channel's coverage alongside the existing
// zone-cluster [Wave 640] and drought-run [Wave 668] checks), THEME_SEED_DROUGHT_RUN (run-based ×
// seededClueIds absence — Wave 654 applied the zone-cluster mode to seededClueIds; the drought-run
// mode has never been applied to this channel).
// Wave 710 additions: THEME_CLOCK_ZONE_CLUSTER (distribution/timing × clockRaised × structural
// thirds — Wave 640 applied the drought-run mode to clockRaised; the zone-cluster mode has never
// been applied to this channel), THEME_OPEN_THREAD_DROUGHT_RUN (run-based × unresolvedClues
// absence — Wave 654 applied the backward-cause peak mode to unresolvedClues; the drought-run
// mode has never been applied to this channel), THEME_SEED_PEAK_UNCAUSED (single-peak isolation/
// backward-cause × seededClueIds magnitude — Waves 654/696 applied the zone-cluster and
// drought-run modes to seededClueIds; the backward-cause peak mode has never been applied to it,
// completing the trio).
// Wave 724 additions: THEME_OPEN_THREAD_ZONE_CLUSTER (distribution/timing × unresolvedClues ×
// structural thirds — Waves 654/710 applied the backward-cause peak and drought-run modes to
// unresolvedClues; the zone-cluster mode has never been applied to it, completing the trio),
// THEME_HIGHLIGHT_PEAK_UNCAUSED (single-peak isolation/backward-cause × dialogueHighlights
// magnitude — Wave 654 applied the drought-run mode to dialogueHighlights; the backward-cause
// peak mode has never been applied to it), THEME_RELATIONSHIP_DROUGHT_RUN (run-based ×
// relationshipShifts absence — Wave 668 applied the backward-cause peak mode to
// relationshipShifts; the drought-run mode has never been applied to it).
// Wave 738 additions: THEME_HIGHLIGHT_ZONE_CLUSTER (distribution/timing × dialogueHighlights ×
// structural thirds — Waves 654/724 applied the run-based drought and backward-cause peak modes
// to dialogueHighlights; the zone-cluster mode has never been applied to it, completing the
// trio), THEME_RELATIONSHIP_ZONE_CLUSTER (distribution/timing × relationshipShifts × structural
// thirds — Waves 668/724 applied the backward-cause peak and run-based drought modes to
// relationshipShifts; the zone-cluster mode has never been applied to it, completing the trio),
// THEME_CLOCK_DELTA_DROUGHT_RUN (run-based × clockDelta≠0 absence — Wave 682 applied the
// backward-cause peak mode to clockDelta; the drought-run mode has never been applied to it).
// Wave 752 additions: THEME_CLOCK_DELTA_ZONE_CLUSTER (distribution/timing × clockDelta≠0
// presence × structural thirds — Waves 682/738 applied the backward-cause peak and run-based
// drought modes to clockDelta; the zone-cluster mode has never been applied to it, completing the
// trio), THEME_TURN_DROUGHT_RUN (run-based × dramaticTurn !== 'nothing' absence — Wave 668
// applied the zone-cluster mode to this signal; the drought-run mode has never been applied to
// it), THEME_CHARACTER_MOMENT_DROUGHT_RUN (run-based × purpose === 'character_moment' absence —
// Wave 682 applied the zone-cluster mode to this signal; the drought-run mode has never been
// applied to it).
// Wave 766 additions: THEME_SUSPENSE_ZONE_CLUSTER (distribution/timing × suspenseDelta>0 presence
// × structural thirds — existing suspense checks in this pass are co-occurrence [does the group of
// high-suspense scenes carry theme] and peak-resonance-absence [does the single peak scene carry
// theme]; the shared-library thirds-based cluster mode has never been applied to it),
// THEME_CURIOSITY_ZONE_CLUSTER (distribution/timing × curiosityDelta>0 presence × structural
// thirds — existing curiosity checks are co-occurrence and peak-resonance-absence; the
// shared-library cluster mode has never been applied to it), THEME_SUSPENSE_PEAK_UNCAUSED
// (backward-cause × suspenseDelta-as-magnitude × 2-scene lookback — THEME_SUSPENSE_PEAK_ABSENT
// audits whether the peak scene ITSELF carries thematic resonance; this looks backward from the
// peak for a structural cause [dramatic turn or revelation] in the 2 preceding scenes, a wholly
// different analytical claim, so the shared-library backward-cause mode has never been applied to
// suspenseDelta).
// Wave 780 additions: THEME_SUSPENSE_DROUGHT_RUN (run-based × suspenseDelta>0 absence — Wave 766
// applied the zone-cluster and backward-cause peak modes to suspenseDelta; the run-based drought
// mode has never been applied to it, completing the trio), THEME_CURIOSITY_DROUGHT_RUN (run-based
// × curiosityDelta>0 absence — Wave 766 applied the zone-cluster mode to curiosityDelta; the
// run-based drought mode has never been applied to it), THEME_CURIOSITY_PEAK_UNCAUSED
// (backward-cause × curiosityDelta-as-magnitude × 2-scene lookback — THEME_CURIOSITY_PEAK_ABSENT
// audits whether the peak scene ITSELF carries thematic resonance; this looks backward from the
// peak for a structural cause, a wholly different analytical claim, so the shared-library
// backward-cause mode has never been applied to curiosityDelta, completing the trio).
// Wave 794 additions: THEME_REVELATION_ZONE_CLUSTER (distribution/timing × revelation ×
// structural thirds — existing revelation checks in this pass are co-occurrence
// [THEME_REVELATION_DECOUPLED], zone-scoped-and-scene-scoped absence [THEME_REVELATION_SILENT],
// and aftermath [THEME_REVELATION_AFTERMATH_SILENT]; none of the three shared-library trio modes
// has ever been applied to revelation as the primary signal), THEME_REVELATION_DROUGHT_RUN
// (run-based × revelation absence — completing 2 of 3 slots for revelation alongside the
// zone-cluster mode added in this same wave), THEME_NEGATIVE_EMOTION_ZONE_CLUSTER
// (distribution/timing × emotionalShift='negative' × structural thirds — existing negative-
// emotion checks in this pass are decoupling [THEME_POSITIVE_EMOTION_DECOUPLED is the positive
// mirror], aftermath [THEME_NEGATIVE_EMOTION_AFTERMATH_SILENT], and average/aggregate
// [THEME_RESONANCE_EMOTIONALLY_LOPSIDED]; the shared-library thirds-based cluster mode has never
// been applied to emotionalShift).
// Wave 808 additions: THEME_REVELATION_PEAK_UNCAUSED (backward-cause × revelation-as-magnitude
// [0/1] × 2-scene lookback, anchored on the FIRST revelation scene — completes the trio for
// revelation alongside the zone-cluster and drought-run modes added in Wave 794), THEME_NEGATIVE_
// EMOTION_DROUGHT_RUN (run-based × emotionalShift='negative' absence — completes 2 of 3 slots for
// this valence alongside the zone-cluster mode added in Wave 794; peak mode conventionally
// skipped for this categorical field), THEME_STAKES_ZONE_CLUSTER (distribution/timing × purpose
// === 'raise_stakes' × structural thirds — the existing THEME_RAISE_STAKES_SILENT is a
// co-occurrence check [do stakes-raising scenes carry theme]; none of the three shared-library
// trio modes has ever been applied to this purpose value).
//
// Wave 822 additions: THEME_STAKES_DROUGHT_RUN (run-based × purpose === 'raise_stakes' absence —
// completes 2 of 3 slots for this purpose value alongside the zone-cluster mode added in Wave
// 808; peak mode conventionally skipped for this categorical field), THEME_TURNING_POINT_ZONE_
// CLUSTER (distribution/timing × purpose === 'turning_point' × structural thirds — this purpose
// value has never appeared anywhere in this file; a virgin field for all three shared-library
// trio modes), THEME_INTRODUCE_CONFLICT_ZONE_CLUSTER (distribution/timing × purpose ===
// 'introduce_conflict' × structural thirds — likewise a virgin field, never referenced in this
// file before).
//
// Wave 836 additions: THEME_TURNING_POINT_DROUGHT_RUN (run-based × purpose === 'turning_point'
// absence — completes 2 of 3 slots for this purpose value alongside the zone-cluster mode added
// in Wave 822; peak mode conventionally skipped for this categorical field),
// THEME_INTRODUCE_CONFLICT_DROUGHT_RUN (run-based × purpose === 'introduce_conflict' absence —
// completes 2 of 3 slots for this purpose value alongside the zone-cluster mode added in Wave
// 822; peak mode conventionally skipped for this categorical field), THEME_POSITIVE_EMOTION_ZONE_
// CLUSTER (distribution/timing × emotionalShift === 'positive' × structural thirds — the existing
// positive-emotion checks in this pass are decoupling [THEME_POSITIVE_EMOTION_DECOUPLED] and
// sequence/aftermath [THEME_POSITIVE_EMOTION_AFTERMATH_SILENT]; none of the three shared-library
// trio modes has ever isolated this valence, mirroring the negative-valence trio completed in
// Wave 808).
//
// Wave 850 additions: THEME_POSITIVE_EMOTION_DROUGHT_RUN (run-based × emotionalShift === 'positive'
// absence — completes 2 of 3 slots for this valence alongside the zone-cluster mode added in
// Wave 836; peak mode conventionally skipped for this categorical field),
// THEME_ESTABLISH_WORLD_ZONE_CLUSTER (distribution/timing × purpose === 'establish_world' ×
// structural thirds — this purpose value has never been referenced anywhere in this pass; a
// virgin field), THEME_CLIMAX_ZONE_CLUSTER (distribution/timing × purpose === 'climax' ×
// structural thirds — distinct from THEME_CLIMAX_SCENE_SILENT, a co-occurrence check on the
// fixed climax scene's content; none of the three shared-library trio modes has ever isolated
// this purpose value as a standalone distributional signal).
//
// Wave 864 additions: THEME_CLIMAX_DROUGHT_RUN (run-based x purpose === 'climax' absence --
// completes 2 of 3 slots for this purpose value alongside the zone-cluster mode added in Wave
// 850; peak mode conventionally skipped for this categorical field),
// THEME_ESTABLISH_WORLD_DROUGHT_RUN (run-based x purpose === 'establish_world' absence --
// completes 2 of 3 slots for this purpose value alongside the zone-cluster mode added in Wave
// 850; peak mode conventionally skipped for this categorical field),
// THEME_RESOLUTION_ZONE_CLUSTER (distribution/timing x purpose === 'resolution' x structural
// thirds -- distinct from THEME_RESOLUTION_SILENT, a co-occurrence check on the fixed final
// scene's thematic content regardless of its purpose value; none of the three shared-library
// trio modes has ever isolated purpose === 'resolution' as a standalone distributional signal).
//
// Wave 878 additions: THEME_RESOLUTION_DROUGHT_RUN (run-based x purpose === 'resolution'
// absence -- completes 2 of 3 slots for this purpose value alongside the zone-cluster mode
// added in Wave 864; distinct from THEME_RESOLUTION_SILENT, a co-occurrence check on the fixed
// final scene's thematic content regardless of purpose; peak mode conventionally skipped for
// this categorical field), THEME_COMPLICATE_ZONE_CLUSTER (distribution/timing x purpose ===
// 'complicate' x structural thirds -- this purpose value has never been referenced anywhere in
// this pass; a virgin field), THEME_COMPLICATE_DROUGHT_RUN (run-based x purpose ===
// 'complicate' absence -- completes 2 of 3 slots for this purpose value alongside the
// zone-cluster mode added in this same wave; peak mode conventionally skipped for this
// categorical field).
//
// Wave 892 additions: no purpose value had ever been audited by the distinct 4-zone
// checkZoneImbalance mode in this pass (only a debt-related predicate, a visually-staged
// predicate, and payoffSetupIds had). This wave applies it to three purpose values with
// complete 3-zone/run-based trios: THEME_CLIMAX_ZONE_IMBALANCE (purpose === 'climax'),
// THEME_ESTABLISH_WORLD_ZONE_IMBALANCE (purpose === 'establish_world'), and THEME_RESOLUTION_
// ZONE_IMBALANCE (purpose === 'resolution' -- distinct from THEME_RESOLUTION_SILENT, a
// co-occurrence check on the fixed final scene's thematic content regardless of purpose).
//
// Wave 906 additions: continuing the checkZoneImbalance rollout begun in Wave 892, this wave
// applies the 4-zone bloat+empty-zone mode to three more purpose values that each already have a
// complete 3-zone/run-based trio (checkZoneCluster + checkDroughtRun) but have never been audited
// by it: THEME_TURNING_POINT_ZONE_IMBALANCE (purpose === 'turning_point'),
// THEME_INTRODUCE_CONFLICT_ZONE_IMBALANCE (purpose === 'introduce_conflict'), and
// THEME_COMPLICATE_ZONE_IMBALANCE (purpose === 'complicate').
//
// Wave 920 additions: purpose === 'revelation' has never been referenced anywhere in this pass
// (the pre-existing THEME_REVELATION_ZONE_CLUSTER/DROUGHT_RUN and related rules audit the separate
// revelation string|null field, not this purpose enum value) -- a genuinely virgin field. This
// wave adds THEME_REVELATION_PURPOSE_ZONE_CLUSTER and THEME_REVELATION_PURPOSE_DROUGHT_RUN (peak
// mode conventionally skipped for this categorical field), plus THEME_CHARACTER_MOMENT_ZONE_
// IMBALANCE, continuing the checkZoneImbalance rollout: purpose === 'character_moment' already has
// a complete 3-zone/run-based trio but has never been audited by the 4-zone bloat+empty-zone mode.
//
// Wave 934 additions: continuing the checkZoneImbalance rollout, this wave applies the 4-zone
// bloat+empty-zone mode to three more signals that each already have a complete 3-zone/run-based
// trio but had never been audited by it: THEME_STAKES_ZONE_IMBALANCE (purpose === 'raise_stakes'),
// THEME_REVELATION_PURPOSE_ZONE_IMBALANCE (purpose === 'revelation', whose trio was completed in
// Wave 920), and THEME_NEGATIVE_EMOTION_ZONE_IMBALANCE (emotionalShift === 'negative', a valence
// signal with a complete 3-zone/run trio).
// Wave 948 additions: extending the checkZoneImbalance rollout to three more trio-complete signals
// spanning three distinct signal classes: THEME_POSITIVE_EMOTION_ZONE_IMBALANCE (emotionalShift ===
// 'positive', the positive-valence mirror of Wave 934's negative one), THEME_SUSPENSE_ZONE_IMBALANCE
// (suspenseDelta > 0 — tension-delta magnitude), and THEME_SEED_ZONE_IMBALANCE (seededClueIds.length
// > 0 — a seededClueIds array field distinct from the already-audited unresolvedClues/visualBeats/
// payoffSetupIds imbalances).
// Wave 962 additions: continuing the non-purpose 4-zone rollout with three more trio-complete signals
// spanning three distinct classes: THEME_CURIOSITY_ZONE_IMBALANCE (curiosityDelta > 0 — the question-
// raising delta beside Wave 948's suspense one), THEME_REVELATION_ZONE_IMBALANCE (revelation != null —
// the revelation string field, distinct from the purpose-enum THEME_REVELATION_PURPOSE one), and
// THEME_RELATIONSHIP_ZONE_IMBALANCE (relationshipShifts.length > 0 — a relationshipShifts array field
// distinct from all four already-audited array imbalances: unresolvedClues/visualBeats/payoff/seed).
// Wave 976 additions: auditing three more trio-complete signals in this pass, spanning three distinct
// classes: THEME_CLOCK_ZONE_IMBALANCE (clockRaised boolean — whether a ticking clock is introduced),
// THEME_CLOCK_DELTA_ZONE_IMBALANCE (clockDelta !== 0 — the numeric delta, distinct from the boolean
// field above), and THEME_TURN_ZONE_IMBALANCE (dramaticTurn !== 'nothing' categorical).
// Wave 990 additions: THEME_HIGHLIGHT_ZONE_IMBALANCE (dialogueHighlights array) and THEME_OPEN_
// THREAD_ZONE_IMBALANCE (unresolvedClues array) — the last two clean trio-complete zone-imbalance
// candidates in this pass (THEME_STAGING was skipped: its cluster/drought predicates disagree, >=2
// vs >0 visualBeats). With zone-imbalance now down to just these two, this wave completes the trio
// with one aftermath-void pairing: THEME_STAKES_CURIOSITY_AFTERMATH_VOID (raise_stakes →
// curiosityDelta), the first use of raise_stakes as an aftermath-void trigger in this pass.
// Wave 1004 additions: THEME_STAGING re-checked and re-excluded (same predicate mismatch). With
// zone-imbalance still exhausted, this wave gives three existing aftermath-void triggers a fresh
// consequence channel: THEME_STAKES_SUSPENSE_AFTERMATH_VOID (raise_stakes, previously only paired
// with curiosityDelta, now paired with suspenseDelta), THEME_SEED_CURIOSITY_AFTERMATH_VOID
// (seededClueIds, previously only paired with dialogueHighlights, now paired with curiosityDelta),
// and THEME_OPEN_THREAD_EMOTIONAL_AFTERMATH_VOID (unresolvedClues, previously only paired with the
// theme-resonance keyword channel, now paired with the standard emotionalShift signal).
// Wave 1018 additions: this wave gives three more triggers a fresh consequence channel: THEME_
// STAKES_EMOTIONAL_AFTERMATH_VOID (raise_stakes, previously paired with curiosityDelta and
// suspenseDelta, now paired with emotionalShift for a third channel), THEME_SEED_RELATIONAL_
// AFTERMATH_VOID (seededClueIds, previously paired with dialogueHighlights and curiosityDelta, now
// paired with relationshipShifts for a third channel), and THEME_STAGING_CURIOSITY_AFTERMATH_VOID
// (visualBeats.length>=2, previously only paired with the theme-resonance keyword channel via
// isVisuallyStaged612, now paired with the standard curiosityDelta signal).
// Wave 1032 additions: THEME_STAKES_RELATIONAL_AFTERMATH_VOID gives raise_stakes a fourth channel
// (previously paired with curiosityDelta/suspenseDelta/emotionalShift, now paired with
// relationshipShifts), THEME_SEED_EMOTIONAL_AFTERMATH_VOID gives seededClueIds a fourth channel
// (previously paired with dialogueHighlights/curiosityDelta/relationshipShifts, now paired with
// emotionalShift), and THEME_OPEN_THREAD_CURIOSITY_AFTERMATH_VOID gives the unresolvedClues.length
// > 0 trigger a second channel (previously only paired with emotionalShift via THEME_OPEN_THREAD_
// EMOTIONAL_AFTERMATH_VOID, now paired with curiosityDelta).
// Wave 1046 additions: with raise_stakes and seededClueIds now at four channels each, this wave
// targets the less-saturated triggers: THEME_OPEN_THREAD_SUSPENSE_AFTERMATH_VOID
// (unresolvedClues.length > 0, previously paired with emotionalShift/curiosityDelta, now a third
// channel with suspenseDelta), THEME_OPEN_THREAD_RELATIONAL_AFTERMATH_VOID (unresolvedClues.length
// > 0, now a fourth channel with relationshipShifts), and THEME_STAGING_EMOTIONAL_AFTERMATH_VOID
// (visualBeats.length >= 2, previously only paired with curiosityDelta via THEME_STAGING_
// CURIOSITY_AFTERMATH_VOID, now paired with emotionalShift for a second channel).
// Wave 1060 additions: THEME_SEED_SUSPENSE_AFTERMATH_VOID gives seededClueIds a fifth channel
// (previously paired with dialogueHighlights/curiosityDelta/relationshipShifts/emotionalShift,
// now also paired with suspenseDelta). THEME_STAKES_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID gives
// raise_stakes a fifth channel (previously paired with curiosityDelta/suspenseDelta/
// emotionalShift/relationshipShifts, now also paired with dialogueHighlights).
// THEME_STAGING_SUSPENSE_AFTERMATH_VOID gives the visualBeats trigger a third channel
// (previously paired with curiosityDelta/emotionalShift, now also paired with suspenseDelta).

import type { PassInput, PassResult, RevisionIssue } from './types.ts';
import { rewritePass } from '../rewrite.ts';
import { checkCoOccurrenceDecoupled, checkZoneImbalance, checkAftermathVoid, checkDroughtRun, checkPeakUncaused, checkZoneCluster, FOUR_ZONE_NAMES } from './lib/checks.ts';

const STOPWORDS = new Set([
  'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
  'should', 'may', 'might', 'must', 'shall', 'can', 'that', 'this', 'it',
  'in', 'on', 'at', 'to', 'of', 'and', 'or', 'but', 'not', 'with', 'by',
  'for', 'from', 'as', 'into', 'through', 'during', 'before', 'after',
  'all', 'any', 'each', 'every', 'some', 'very', 'just', 'then', 'when',
  'who', 'what', 'where', 'how', 'if', 'so', 'its', 'their', 'them',
  'they', 'we', 'you', 'he', 'she', 'his', 'her', 'our', 'your',
]);

function extractThemeKeywords(theme: string): string[] {
  return theme.toLowerCase()
    .split(/\W+/)
    .filter(w => w.length > 3 && !STOPWORDS.has(w));
}

// Expand each keyword into related forms (crude stem/synonym expansion).
// E.g., "betray" covers "betrayal", "betrayed", "betrayer", "betray".
function expandKeyword(kw: string): string[] {
  return [kw, kw + 's', kw + 'ed', kw + 'ing', kw + 'al', kw + 'er', kw + 'ful', kw + 'less'];
}

// Build the set of scene text from records (dialogue + revelation + slug).
// Also scan the raw fountain text around each scene's line position using slugs.
function buildSceneText(
  records: PassInput['records'],
  fountain: string,
): Map<number, string> {
  const fountainLines = fountain.split('\n');
  const slugLineIndex = new Map<string, number>();

  for (let i = 0; i < fountainLines.length; i++) {
    const t = fountainLines[i].trim();
    if (t && /^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)/i.test(t)) {
      slugLineIndex.set(t.toLowerCase(), i);
    }
  }

  const result = new Map<number, string>();

  for (let ri = 0; ri < records.length; ri++) {
    const r = records[ri];
    const parts: string[] = [
      r.slug,
      ...r.dialogueHighlights,
      r.revelation ?? '',
    ];

    // Also grab the fountain lines between this scene's slug and the next.
    const slugKey = r.slug.toLowerCase();
    const slugLine = slugLineIndex.get(slugKey) ?? -1;
    if (slugLine >= 0) {
      // Find the next scene heading line
      const nextSlugLine = ri + 1 < records.length
        ? (slugLineIndex.get(records[ri + 1].slug.toLowerCase()) ?? fountainLines.length)
        : fountainLines.length;
      const sceneBlock = fountainLines.slice(slugLine, nextSlugLine).join(' ');
      parts.push(sceneBlock);
    }

    result.set(r.sceneIdx, parts.join(' ').toLowerCase());
  }

  return result;
}

function sceneHasResonance(text: string, expandedKeywords: string[][]): boolean {
  return expandedKeywords.some(forms => forms.some(form => text.includes(form)));
}

export async function themePass(input: PassInput): Promise<PassResult> {
  const { fountain, records, storyContext, approvedSpans } = input;

  // Pass is a no-op unless the story has a declared theme
  const themeRaw = storyContext?.theme?.trim() ?? '';
  if (!themeRaw || records.length < 3) {
    return {
      pass: 'theme',
      issues: [],
      revisedFountain: fountain,
      changed: false,
      summary: 'Theme resonance pass: no theme declared (set story theme to activate this pass)',
    };
  }

  const keywords = extractThemeKeywords(themeRaw);
  if (keywords.length === 0) {
    return {
      pass: 'theme',
      issues: [],
      revisedFountain: fountain,
      changed: false,
      summary: 'Theme resonance pass: theme statement too sparse to extract keywords',
    };
  }

  const expandedKeywords = keywords.map(expandKeyword);
  const sceneTexts = buildSceneText(records, fountain);
  const issues: RevisionIssue[] = [];

  // ── Per-scene resonance audit ─────────────────────────────────────────────
  const silentScenes: Array<{ idx: number; slug: string }> = [];
  for (const r of records) {
    const text = sceneTexts.get(r.sceneIdx) ?? '';
    if (!sceneHasResonance(text, expandedKeywords)) {
      silentScenes.push({ idx: r.sceneIdx, slug: r.slug });
    }
  }

  // ── THEME_RESONANCE_GAP — >40% of scenes are theme-silent ─────────────────
  const silenceRatio = silentScenes.length / records.length;
  if (silenceRatio > 0.4 && records.length >= 4) {
    const sample = silentScenes.slice(0, 3).map(s => `Scene ${s.idx} (${s.slug})`).join(', ');
    const extra = silentScenes.length > 3 ? ` +${silentScenes.length - 3} more` : '';
    issues.push({
      location: sample + extra,
      rule: 'THEME_RESONANCE_GAP',
      description:
        `${Math.round(silenceRatio * 100)}% of scenes (${silentScenes.length}/${records.length}) contain no language related to the theme "${themeRaw}". ` +
        `Theme keywords expected: [${keywords.slice(0, 5).join(', ')}${keywords.length > 5 ? '…' : ''}].`,
      severity: 'major',
      suggestedFix:
        `Find one moment per silent scene where a character's action, dialogue, or visual detail directly embodies or subverts the theme: "${themeRaw}"`,
    });
  }

  // ── THEME_UNRESOLVED — Act 3 has no thematic language ─────────────────────
  const act3Start = Math.floor(records.length * 0.7);
  const act3Records = records.slice(act3Start);
  const act3HasResonance = act3Records.some(r =>
    sceneHasResonance(sceneTexts.get(r.sceneIdx) ?? '', expandedKeywords),
  );

  if (!act3HasResonance && act3Records.length > 0) {
    issues.push({
      location: 'Act 3',
      rule: 'THEME_UNRESOLVED',
      description:
        `Act 3 contains no language echoing the theme "${themeRaw}". The climax should deliver the story's thematic answer, not just resolve the plot.`,
      severity: 'critical',
      suggestedFix:
        `The final act must explicitly answer or crystallize the theme. Have a character make a choice that embodies or refutes it: "${themeRaw}"`,
    });
  }

  // ── THEME_ORPHANED — theme set but no scene has any resonance at all ───────
  if (silentScenes.length === records.length) {
    issues.length = 0; // replace the gap flag with a stronger one
    issues.push({
      location: 'Entire screenplay',
      rule: 'THEME_ORPHANED',
      description:
        `The story declares the theme "${themeRaw}" but zero scenes contain any thematic language. Theme is not dramatized.`,
      severity: 'critical',
      suggestedFix:
        `Ensure that the story's dialogue and action consistently echo, test, and ultimately resolve the declared theme.`,
    });
  }

  // ── Wave 148: Theme craft — heavy-handedness, dialectic, front-loading ──────
  // These only run when the theme IS resonating (not orphaned); they measure HOW
  // well the theme is woven, not just whether it's present.
  if (silentScenes.length < records.length) {
    // Per-scene keyword density: count keyword hits per scene.
    const sceneHitCounts = new Map<number, number>();
    for (const r of records) {
      const text = sceneTexts.get(r.sceneIdx) ?? '';
      let hits = 0;
      for (const forms of expandedKeywords) {
        for (const form of forms) {
          // Count occurrences of each form
          let pos = text.indexOf(form);
          while (pos !== -1) { hits++; pos = text.indexOf(form, pos + form.length); }
        }
      }
      sceneHitCounts.set(r.sceneIdx, hits);
    }

    // THEME_HEAVY_HANDED — a scene repeats theme keywords so densely it becomes
    // preachy/on-the-nose. We flag scenes where keyword hits are ≥6 AND more than
    // 3x the average per-scene hit count — the theme is being hammered, not woven.
    const totalHits = [...sceneHitCounts.values()].reduce((s, v) => s + v, 0);
    const avgHits = totalHits / Math.max(records.length, 1);
    for (const r of records) {
      const hits = sceneHitCounts.get(r.sceneIdx) ?? 0;
      if (hits >= 6 && hits > avgHits * 3 && avgHits > 0) {
        issues.push({
          location: `Scene ${r.sceneIdx} (${r.slug})`,
          rule: 'THEME_HEAVY_HANDED',
          description:
            `Scene ${r.sceneIdx} repeats theme language ${hits} times (${(hits / avgHits).toFixed(1)}x the story average) — the theme "${themeRaw}" is stated on-the-nose rather than dramatized through subtext`,
          severity: 'major',
          suggestedFix:
            `Cut explicit theme statements in this scene. Let one image or action carry the meaning instead of having characters articulate it directly. Theme lands hardest when implied.`,
        });
        break; // one heavy-handed flag per pass to avoid noise
      }
    }

    // THEME_NO_DIALECTIC — the theme is echoed throughout but never CHALLENGED.
    // A theme without a counterargument is propaganda. We approximate the presence
    // of a counterargument by checking whether any thematic scene also carries a
    // negative emotional shift or a reversal (suspenseDelta < -1) — i.e. a moment
    // where the theme's value is questioned or fails the character. If every
    // theme-resonant scene is emotionally neutral/positive, the theme is unchallenged.
    const resonantScenes = records.filter(r =>
      sceneHasResonance(sceneTexts.get(r.sceneIdx) ?? '', expandedKeywords),
    );
    if (resonantScenes.length >= 3) {
      const hasChallenge = resonantScenes.some(r =>
        r.emotionalShift === 'negative' || r.suspenseDelta < -1,
      );
      if (!hasChallenge) {
        issues.push({
          location: 'Thematic arc',
          rule: 'THEME_NO_DIALECTIC',
          description:
            `The theme "${themeRaw}" is echoed in ${resonantScenes.length} scenes but never challenged — no thematic scene carries a negative turn or reversal. A theme that is only ever affirmed feels like a lecture, not a question.`,
          severity: 'major',
          suggestedFix:
            `Add a scene where the theme's value is tested and appears to fail — a moment where honesty backfires, love costs too much, or the protagonist's belief is genuinely shaken. The strongest themes survive their own counterargument.`,
        });
      }
    }

    // THEME_FRONT_LOADED — theme keywords cluster heavily in the first third then
    // fade. The story introduces its theme as a thesis statement but stops
    // dramatizing it. We compare resonance density in the first third vs the rest.
    if (records.length >= 6) {
      const third = Math.floor(records.length / 3);
      const firstThirdHits = records.slice(0, third)
        .reduce((s, r) => s + (sceneHitCounts.get(r.sceneIdx) ?? 0), 0);
      const restHits = records.slice(third)
        .reduce((s, r) => s + (sceneHitCounts.get(r.sceneIdx) ?? 0), 0);
      const firstThirdScenes = third;
      const restScenes = records.length - third;
      const firstThirdDensity = firstThirdHits / Math.max(firstThirdScenes, 1);
      const restDensity = restHits / Math.max(restScenes, 1);

      // Front-loaded if the opening is dense (≥2 hits/scene) but the rest fades to <40% of that
      if (firstThirdDensity >= 2 && restDensity < firstThirdDensity * 0.4) {
        issues.push({
          location: 'Thematic distribution',
          rule: 'THEME_FRONT_LOADED',
          description:
            `The theme "${themeRaw}" is densely stated in the opening third (${firstThirdDensity.toFixed(1)} hits/scene) but fades to ${restDensity.toFixed(1)} hits/scene afterward — the story announces its theme then abandons dramatizing it`,
          severity: 'major',
          suggestedFix:
            `Distribute theme touchpoints evenly. Rather than front-loading the thematic statement, let the theme deepen and complicate as the story progresses, paying off strongest at the climax.`,
        });
      }
    }

    // ── Wave 162: Midpoint silence, accelerating density, Act 3 dialectic ─────

    // THEME_MIDPOINT_SILENT: The midpoint scene and its neighbors (±1) have no
    // thematic resonance. The structural pivot of the story has no thematic voice —
    // the gear-shift doesn't engage the story's central question.
    if (records.length >= 6) {
      const midIdx = Math.floor(records.length * 0.5);
      const midText = sceneTexts.get(records[midIdx]?.sceneIdx ?? -1) ?? '';
      const prevText = midIdx > 0 ? (sceneTexts.get(records[midIdx - 1]?.sceneIdx ?? -1) ?? '') : midText;
      const nextText = midIdx < records.length - 1
        ? (sceneTexts.get(records[midIdx + 1]?.sceneIdx ?? -1) ?? '')
        : midText;

      if (!sceneHasResonance(midText, expandedKeywords) &&
          !sceneHasResonance(prevText, expandedKeywords) &&
          !sceneHasResonance(nextText, expandedKeywords)) {
        issues.push({
          location: `Scene ${records[midIdx]?.sceneIdx ?? midIdx} (midpoint ±1)`,
          rule: 'THEME_MIDPOINT_SILENT',
          description: `The midpoint and adjacent scenes (Scenes ${Math.max(0, midIdx - 1)}–${Math.min(records.length - 1, midIdx + 1)}) have no thematic language — the structural pivot has no thematic voice`,
          severity: 'major',
          suggestedFix: `Add one thematic beat to the midpoint scene: a choice, image, or line of dialogue that resonates with "${themeRaw}". The midpoint is where the theme's second half begins — it should carry the question forward`,
        });
      }
    }

    // THEME_ACCELERATING_DENSITY_ABSENT: The thematic density in the final third is
    // lower than the first third, meaning the theme fades instead of amplifying toward
    // the climax. A well-structured story's theme should crescendo, not diminish.
    if (records.length >= 6 && resonantScenes.length >= 4) {
      const wavethird = Math.floor(records.length / 3);
      const firstThirdSum = records.slice(0, wavethird)
        .reduce((s, r) => s + (sceneHitCounts.get(r.sceneIdx) ?? 0), 0);
      const lastThirdSum = records.slice(records.length - wavethird)
        .reduce((s, r) => s + (sceneHitCounts.get(r.sceneIdx) ?? 0), 0);
      const firstDens = firstThirdSum / Math.max(wavethird, 1);
      const lastDens = lastThirdSum / Math.max(wavethird, 1);

      if (firstDens > 0 && lastDens > 0 && firstDens > lastDens * 1.5) {
        issues.push({
          location: 'Thematic arc',
          rule: 'THEME_ACCELERATING_DENSITY_ABSENT',
          description: `Thematic density decreases from first third (${firstDens.toFixed(1)} hits/scene) to final third (${lastDens.toFixed(1)} hits/scene) — the theme "${themeRaw}" fades instead of amplifying toward the climax`,
          severity: 'major',
          suggestedFix: `Increase thematic resonance in the final act. The story's thematic question should be most urgently present at the moment of resolution — the climax should be the most thematically charged scene in the script`,
        });
      }
    }

    // THEME_DIALECTIC_IN_ACT3_ABSENT: Act 2 challenges the theme (a resonant scene
    // with a negative shift or reversal) but Act 3 only affirms it. The question was
    // asked in Act 2 but Act 3 gives an easy, unearned answer. Great drama keeps
    // questioning through the climax.
    if (records.length >= 6 && resonantScenes.length >= 3) {
      const act3ZoneStart = Math.floor(records.length * 0.75);
      const act2Resonant = resonantScenes.filter(r => r.sceneIdx < act3ZoneStart);
      const act3Resonant = resonantScenes.filter(r => r.sceneIdx >= act3ZoneStart);

      const act2HasChallenge = act2Resonant.some(r =>
        r.emotionalShift === 'negative' || r.suspenseDelta < -1,
      );
      const act3HasChallenge = act3Resonant.some(r =>
        r.emotionalShift === 'negative' || r.suspenseDelta < -1,
      );

      if (act2HasChallenge && !act3HasChallenge && act3Resonant.length >= 1) {
        issues.push({
          location: 'Act 3 thematic arc',
          rule: 'THEME_DIALECTIC_IN_ACT3_ABSENT',
          description: `The theme "${themeRaw}" is challenged in Act 2 (a resonant scene with a negative turn) but Act 3 only affirms it. The question was asked but the answer comes too easily — the climax doesn't earn its resolution.`,
          severity: 'major',
          suggestedFix: `Add one final challenge to the theme in Act 3 before the resolution — a moment where the protagonist's belief is tested one last time. The resolution carries more weight when the final answer arrives after the final doubt.`,
        });
      }
    }

    // ── Wave 174: Opening silence, single-keyword reliance, climax silence ─────

    // THEME_OPENING_SILENT: The first three scenes carry no thematic language.
    // A screenplay should plant its central question in the opening — the
    // audience needs to feel the theme before the plot complicates it. This is
    // the inverse failure to THEME_FRONT_LOADED (theme dumped early then dropped):
    // here the theme arrives late, with no thesis to set against the antithesis.
    if (records.length >= 6) {
      const openingCount = Math.min(3, records.length);
      const openingSilent = records.slice(0, openingCount).every(r =>
        !sceneHasResonance(sceneTexts.get(r.sceneIdx) ?? '', expandedKeywords),
      );
      if (openingSilent) {
        issues.push({
          location: `Scenes 0–${openingCount - 1} (opening)`,
          rule: 'THEME_OPENING_SILENT',
          description: `The opening ${openingCount} scenes contain no language related to the theme "${themeRaw}" — the story complicates a question it never planted. The audience reaches the midpoint without knowing what the film is about.`,
          severity: 'major',
          suggestedFix: `Plant the theme in the opening: a line, an image, or a choice in the first scene or two that poses the question "${themeRaw}" without answering it. The thesis must precede the antithesis.`,
        });
      }
    }

    // THEME_SINGLE_KEYWORD_RELIANCE: The declared theme has multiple keywords,
    // but resonance comes overwhelmingly from a single one while at least one
    // other keyword is never dramatized at all. A theme like "loyalty and
    // betrayal" that only ever shows betrayal represents one pole of its own
    // tension — the dialectic is lopsided.
    if (keywords.length >= 2) {
      const perKwHits = expandedKeywords.map(forms => {
        let total = 0;
        for (const r of records) {
          const text = sceneTexts.get(r.sceneIdx) ?? '';
          for (const form of forms) {
            let pos = text.indexOf(form);
            while (pos !== -1) { total++; pos = text.indexOf(form, pos + form.length); }
          }
        }
        return total;
      });
      const totalKwHits = perKwHits.reduce((s, v) => s + v, 0);
      const topHits = Math.max(...perKwHits);
      if (totalKwHits >= 5 && topHits / totalKwHits > 0.8 && perKwHits.some(h => h === 0)) {
        const topIdx = perKwHits.indexOf(topHits);
        const absent = keywords.filter((_, i) => perKwHits[i] === 0);
        issues.push({
          location: 'Thematic balance',
          rule: 'THEME_SINGLE_KEYWORD_RELIANCE',
          description: `Thematic resonance relies almost entirely on "${keywords[topIdx]}" (${Math.round(topHits / totalKwHits * 100)}% of all theme hits) while [${absent.join(', ')}] never appear — the theme "${themeRaw}" is represented by only one pole of its own tension`,
          severity: 'minor',
          suggestedFix: `Dramatize the neglected side of the theme. If "${keywords[topIdx]}" dominates, give [${absent.join(', ')}] their own scenes — a theme is a dialectic, and one pole without the other is a slogan.`,
        });
      }
    }

    // THEME_CLIMAX_SCENE_SILENT: Act 3 carries the theme somewhere, but the
    // single highest-suspense scene — the climax beat itself — has no thematic
    // resonance. The story answers its question adjacent to the climax rather
    // than IN it. Distinct from THEME_UNRESOLVED (whole-act silence); this fires
    // only when the act resonates but the peak moment doesn't.
    if (records.length >= 8 && act3HasResonance) {
      const climaxZoneStart = Math.floor(records.length * 0.75);
      let climaxIdx = -1;
      let maxSus = -Infinity;
      for (let i = climaxZoneStart; i < records.length; i++) {
        if (records[i].suspenseDelta > maxSus) { maxSus = records[i].suspenseDelta; climaxIdx = i; }
      }
      if (climaxIdx >= 0 && maxSus > 1.5) {
        const climaxText = sceneTexts.get(records[climaxIdx].sceneIdx) ?? '';
        if (!sceneHasResonance(climaxText, expandedKeywords)) {
          issues.push({
            location: `Scene ${records[climaxIdx].sceneIdx} (climax, peak suspense ${maxSus.toFixed(1)})`,
            rule: 'THEME_CLIMAX_SCENE_SILENT',
            description: `Act 3 carries the theme "${themeRaw}", but the climax scene (Scene ${records[climaxIdx].sceneIdx}, the peak-suspense beat) has no thematic language — the story resolves its question beside the climax rather than inside it`,
            severity: 'major',
            suggestedFix: `Move the thematic payoff into the climax itself. The single most dramatic moment should also be the most thematically charged: the protagonist's decisive action should embody the answer to "${themeRaw}".`,
          });
        }
      }
    }

    // THEME_ACT2_DESERT: Act 2 (25%–75% of scenes) has fewer than 30% thematically
    // resonant scenes — the middle of the story, where the theme is tested and
    // complicated, is an empty desert. The theme is present in the opening and
    // closing but the long middle section abandons the central question.
    if (records.length >= 6) {
      const act2DesertStart = Math.floor(records.length * 0.25);
      const act2DesertEnd = Math.floor(records.length * 0.75);
      const act2DesertRecs = records.slice(act2DesertStart, act2DesertEnd);
      if (act2DesertRecs.length >= 3) {
        const resonantInAct2 = act2DesertRecs.filter(r =>
          sceneHasResonance(sceneTexts.get(r.sceneIdx) ?? '', expandedKeywords),
        ).length;
        if (resonantInAct2 / act2DesertRecs.length < 0.3) {
          issues.push({
            location: `Act 2 (scenes ${act2DesertStart}–${act2DesertEnd - 1})`,
            rule: 'THEME_ACT2_DESERT',
            description:
              `Only ${resonantInAct2} of ${act2DesertRecs.length} Act 2 scenes (${Math.round(resonantInAct2 / act2DesertRecs.length * 100)}%) carry the theme "${themeRaw}" — the middle of the story is thematically inert`,
            severity: 'major',
            suggestedFix:
              `Act 2 is where the theme is tested and complicated. Add thematic resonance to at least every third Act 2 scene: a choice, image, or line of dialogue that ties back to "${themeRaw}" while the plot escalates.`,
          });
        }
      }
    }

    // THEME_RESOLUTION_SILENT: The final scene — the screenplay's last word — contains
    // no thematic language. The denouement resolves the plot but leaves the central
    // question unanswered in the audience's final impression.
    if (records.length >= 4) {
      const finalRec = records[records.length - 1];
      const finalText = sceneTexts.get(finalRec.sceneIdx) ?? '';
      if (!sceneHasResonance(finalText, expandedKeywords)) {
        issues.push({
          location: `Scene ${finalRec.sceneIdx} (final scene)`,
          rule: 'THEME_RESOLUTION_SILENT',
          description:
            `The final scene contains no language related to the theme "${themeRaw}" — the screenplay ends on a plot beat rather than a thematic one`,
          severity: 'major',
          suggestedFix:
            `The last scene should echo the theme one final time: a callback line, a closing image, or a character's action that answers "${themeRaw}". The audience's final impression should be thematic, not transactional.`,
        });
      }
    }

    // THEME_DENSITY_INVERSION: The proportion of thematically resonant scenes is
    // higher in the first half than the second. Theme should escalate toward the
    // climax, not retreat from it. Distinct from THEME_FRONT_LOADED (which tracks
    // keyword-hit density); this counts whether scenes carry ANY resonance at all.
    if (records.length >= 8) {
      const halfIdxDens = Math.floor(records.length / 2);
      const firstHalfResonant = records.slice(0, halfIdxDens).filter(r =>
        sceneHasResonance(sceneTexts.get(r.sceneIdx) ?? '', expandedKeywords),
      ).length;
      const secondHalfResonant = records.slice(halfIdxDens).filter(r =>
        sceneHasResonance(sceneTexts.get(r.sceneIdx) ?? '', expandedKeywords),
      ).length;
      const firstHalfRatioDens = firstHalfResonant / halfIdxDens;
      const secondHalfRatioDens = secondHalfResonant / (records.length - halfIdxDens);
      if (firstHalfRatioDens > secondHalfRatioDens && firstHalfRatioDens > 0.3) {
        issues.push({
          location: 'Thematic distribution',
          rule: 'THEME_DENSITY_INVERSION',
          description:
            `Thematic resonance is denser in the first half (${Math.round(firstHalfRatioDens * 100)}% of scenes carry the theme) than the second (${Math.round(secondHalfRatioDens * 100)}%) — the theme builds early then retreats`,
          severity: 'minor',
          suggestedFix:
            `Redistribute thematic touchpoints so the second half carries at least as many resonant scenes as the first. The theme should be escalating toward the climax, not retreating from it.`,
        });
      }
    }

    // ── Wave 208: Consecutive resonant surfeit, first-act resolution, subplot isolation ──

    // THEME_CONSECUTIVE_RESONANT_SURFEIT: Five or more consecutive scenes all carry
    // thematic language — a saturation wall that trains the audience to stop registering
    // the theme. Theme lands hardest when it has silence between its hits. A run of five
    // or more consecutive resonant scenes collapses the signal into wallpaper.
    if (records.length >= 8 && resonantScenes.length >= 5) {
      let maxRun208 = 0;
      let currentRun208 = 0;
      let maxRunStart208 = 0;
      let currentRunStart208 = 0;
      for (let i = 0; i < records.length; i++) {
        const isRes208 = sceneHasResonance(sceneTexts.get(records[i].sceneIdx) ?? '', expandedKeywords);
        if (isRes208) {
          if (currentRun208 === 0) currentRunStart208 = i;
          currentRun208++;
          if (currentRun208 > maxRun208) { maxRun208 = currentRun208; maxRunStart208 = currentRunStart208; }
        } else {
          currentRun208 = 0;
        }
      }
      if (maxRun208 >= 5) {
        const runEnd208 = Math.min(maxRunStart208 + maxRun208 - 1, records.length - 1);
        issues.push({
          location: `Scenes ${records[maxRunStart208].sceneIdx}–${records[runEnd208].sceneIdx}`,
          rule: 'THEME_CONSECUTIVE_RESONANT_SURFEIT',
          severity: 'minor',
          description: `${maxRun208} consecutive scenes all carry the theme "${themeRaw}" with no breathing room — thematic saturation desensitizes the audience. Theme lands hardest when it has silence between its hits; without rest, the resonance becomes ambient noise.`,
          suggestedFix: `Break the run with 1–2 theme-silent scenes inside that stretch: pure plot or action scenes that let the thematic statement settle before the next invocation. Rhythm requires rest; the audience must feel the theme's absence before the next hit registers.`,
        });
      }
    }

    // THEME_FIRST_ACT_RESOLUTION: Act 1 contains a thematically resonant scene with
    // a positive, unthreatened emotional outcome — the story delivers a comfortable
    // answer to its central question before the question has been dramatized. A theme
    // resolved before it is tested carries no weight; the audience has received the
    // thesis without enduring the antithesis.
    if (records.length >= 8) {
      const act1End208 = Math.floor(records.length * 0.25);
      const act1Recs208 = records.slice(0, act1End208);
      if (act1Recs208.length >= 2) {
        const act1ResonantEasy208 = act1Recs208.some(r =>
          sceneHasResonance(sceneTexts.get(r.sceneIdx) ?? '', expandedKeywords) &&
          r.emotionalShift === 'positive' &&
          !r.clockRaised &&
          r.suspenseDelta >= 0,
        );
        const act1HasChallenge208 = act1Recs208.some(r =>
          sceneHasResonance(sceneTexts.get(r.sceneIdx) ?? '', expandedKeywords) &&
          r.emotionalShift === 'negative',
        );
        if (act1ResonantEasy208 && !act1HasChallenge208) {
          issues.push({
            location: `Act 1 (scenes 0–${act1End208 - 1})`,
            rule: 'THEME_FIRST_ACT_RESOLUTION',
            severity: 'major',
            description: `Act 1 contains a thematically resonant scene with a positive, unchallenged outcome — the story answers "${themeRaw}" before the question has been tested through drama. A thesis delivered before the antithesis is a lecture, not a story.`,
            suggestedFix: `The opening thematic beat should POSE the question, not answer it. Replace the comfortable thematic moment with one that plants the theme at cost: a moment where its value is desired but not yet earned, already under threat, or complicated by what it costs.`,
          });
        }
      }
    }

    // THEME_SUBPLOT_ISOLATION: All thematically resonant scenes are revelation or
    // exposition scenes (where a character delivers information); no pure dramatic-action
    // scene carries the theme. The theme lives in speeches and explanations rather than
    // in kinetic physical choice. Great theme is dramatized, not announced.
    if (records.length >= 8 && resonantScenes.length >= 3) {
      const actionScenes208 = records.filter(r => r.revelation === null && r.dramaticTurn !== 'nothing');
      if (actionScenes208.length >= 2) {
        const allResonantHaveRevelation208 = resonantScenes.every(r => r.revelation !== null);
        const noActionSceneResonant208 = !resonantScenes.some(r => r.revelation === null);
        if (allResonantHaveRevelation208 && noActionSceneResonant208) {
          issues.push({
            location: 'Thematic placement',
            rule: 'THEME_SUBPLOT_ISOLATION',
            severity: 'minor',
            description: `Every thematically resonant scene in "${themeRaw}" is a revelation or exposition scene. No scene of pure dramatic action carries the theme — it is spoken about rather than embodied through physical, kinetic choice.`,
            suggestedFix: `Move at least one thematic beat into a scene of pure dramatic action: a confrontation, escape, or decisive physical choice where the theme is enacted rather than articulated. Great theme lives in what characters DO, not what they SAY about what they believe.`,
          });
        }
      }
    }

    // ── Wave 223: THEME_SILENT_STRETCH ────────────────────────────────────────
    // A long consecutive run of theme-silent scenes creates a dead zone where
    // the audience forgets what the story is about. We compute the maximum
    // unbroken run of theme-silent scenes; if it exceeds 25% of the script
    // (or 4, whichever is larger) the theme has a structural hole.
    if (records.length >= 8 && resonantScenes.length >= 2) {
      const stretchThreshold223 = Math.max(4, Math.floor(records.length * 0.25));
      const resonantIdxSet223 = new Set(resonantScenes.map(r => r.sceneIdx));
      let maxRun223 = 0;
      let run223 = 0;
      let stretchStart223 = -1;
      let runStart223 = 0;
      for (let i = 0; i < records.length; i++) {
        if (!resonantIdxSet223.has(records[i].sceneIdx)) {
          if (run223 === 0) runStart223 = i;
          run223++;
          if (run223 > maxRun223) { maxRun223 = run223; stretchStart223 = runStart223; }
        } else {
          run223 = 0;
        }
      }
      if (maxRun223 > stretchThreshold223) {
        issues.push({
          location: `Scenes ${stretchStart223}–${stretchStart223 + maxRun223 - 1}`,
          rule: 'THEME_SILENT_STRETCH',
          severity: 'major',
          description: `A consecutive run of ${maxRun223} theme-silent scenes (${stretchThreshold223} allowed for a ${records.length}-scene story) creates a thematic dead zone — the audience loses the story's meaning for an extended stretch before the theme returns.`,
          suggestedFix: `Break the silent stretch by inserting thematic language into at least one of these scenes: a character's choice that embodies or resists "${themeRaw}", a visual metaphor, or a line of dialogue that touches the core tension.`,
        });
      }
    }

    // ── Wave 223: THEME_POLES_NEVER_COSTAGED ──────────────────────────────────
    // Complex themes have multiple dimensions (e.g. "trust vs betrayal" has
    // 'trust' and 'betrayal' as poles). If no single scene contains language
    // from at least two keyword groups simultaneously, the poles exist in
    // isolation — the theme is never dramatized as a live collision of competing
    // values within a single scene, which is where thematic resonance lives.
    if (keywords.length >= 2 && resonantScenes.length >= 3) {
      const anyCostaged223 = resonantScenes.some(r => {
        const text223 = sceneTexts.get(r.sceneIdx) ?? '';
        let groupsHit223 = 0;
        for (const forms of expandedKeywords) {
          if (forms.some(f => text223.includes(f))) groupsHit223++;
        }
        return groupsHit223 >= 2;
      });
      if (!anyCostaged223) {
        issues.push({
          location: 'Thematic placement',
          rule: 'THEME_POLES_NEVER_COSTAGED',
          severity: 'minor',
          description: `The theme "${themeRaw}" has ${keywords.length} keyword groups but no single scene contains language from two or more of them simultaneously. The theme's poles are never staged in tension — each dimension appears in isolation, diluting the central conflict.`,
          suggestedFix: `Write at least one scene that dramatizes the collision of both thematic poles — a moment where "${keywords[0]}" and "${keywords[1]}" are in active opposition within the same scene, forcing a character to embody or choose between them.`,
        });
      }
    }

    // ── Wave 223: THEME_RESONANCE_EMOTIONALLY_INERT ───────────────────────────
    // Theme only truly lands when it coincides with emotional stakes. If every
    // thematically resonant scene is emotionally flat — neutral emotional shift
    // AND zero suspense delta — the audience registers the theme intellectually
    // but never feels it. Theme must be dramatized at moments of genuine heat.
    if (resonantScenes.length >= 3) {
      const hasChargedResonance223 = resonantScenes.some(r =>
        r.emotionalShift !== 'neutral' || r.suspenseDelta > 0,
      );
      if (!hasChargedResonance223) {
        issues.push({
          location: 'Thematic placement',
          rule: 'THEME_RESONANCE_EMOTIONALLY_INERT',
          severity: 'minor',
          description: `All ${resonantScenes.length} thematically resonant scenes for "${themeRaw}" carry flat emotional charge (neutral shift, zero suspense delta). Theme is acknowledged but never felt — it needs at least one scene where thematic resonance coincides with genuine stakes.`,
          suggestedFix: `Move thematic beats into scenes of emotional heat: a breakthrough, a loss, a rising tension moment. The theme lands hardest when a character's world changes as they confront what the story is about.`,
        });
      }
    }

    // ── Wave 237: Revelation decoupled, clock resonance absent, relationship-shift decoupled ──

    // THEME_REVELATION_DECOUPLED (minor, ≥6 scenes, ≥3 revelations): Revelation
    // scenes — the story's moments of maximum information delivery — carry no
    // thematic language. Revelations should resonate with the theme because they
    // answer questions the theme raises. When all revelations are "plot only," the
    // story's information architecture is structurally disconnected from its
    // central question. Distinct from THEME_SUBPLOT_ISOLATION (which flags when
    // ALL resonant scenes contain revelations): this fires when ALL revelation
    // scenes are thematically silent.
    if (records.length >= 6) {
      const revScenes237 = records.filter((r: any) => r.revelation !== null);
      if (revScenes237.length >= 3) {
        const anyRevResonant237 = revScenes237.some((r: any) =>
          sceneHasResonance(sceneTexts.get(r.sceneIdx) ?? '', expandedKeywords),
        );
        if (!anyRevResonant237) {
          issues.push({
            location: 'Revelation scenes',
            rule: 'THEME_REVELATION_DECOUPLED',
            severity: 'minor',
            description: `${revScenes237.length} revelation scenes carry no thematic language related to "${themeRaw}" — the story's information architecture is structurally disconnected from its central question. Revelations should answer questions the theme raises, not just advance the plot.`,
            suggestedFix: `Rewrite at least one revelation so it delivers its payload in terms of the theme: the truth revealed should complicate or crystallize what the story is ultimately about, not just change the plot. A revelation decoupled from the theme is a puzzle piece that doesn't fit.`,
          });
        }
      }
    }

    // THEME_CLOCK_RESONANCE_ABSENT (minor, ≥6 scenes, ≥2 clock scenes): Scenes
    // where a ticking clock or deadline is raised never carry thematic language.
    // Clock scenes represent maximum urgency — the question of what is worth paying
    // the cost of time. When clocks and theme are decoupled, the story's urgency
    // has no thematic meaning; the protagonist is racing against a deadline that
    // has nothing to do with what the story is about.
    if (records.length >= 6) {
      const clockScenes237 = records.filter((r: any) => r.clockRaised === true);
      if (clockScenes237.length >= 2) {
        const anyClockResonant237 = clockScenes237.some((r: any) =>
          sceneHasResonance(sceneTexts.get(r.sceneIdx) ?? '', expandedKeywords),
        );
        if (!anyClockResonant237) {
          issues.push({
            location: 'Clock/deadline scenes',
            rule: 'THEME_CLOCK_RESONANCE_ABSENT',
            severity: 'minor',
            description: `${clockScenes237.length} clock-raised scenes carry no thematic language related to "${themeRaw}" — the story's urgency is structurally decoupled from its central question. When the deadline has nothing to do with the theme, the pressure feels mechanical rather than meaningful.`,
            suggestedFix: `Rewrite at least one clock scene so the deadline stakes the theme: the cost of running out of time should be a thematic cost — a betrayal that can't be undone, a trust that will expire. The audience should feel that BOTH the plot and the central question are on the clock.`,
          });
        }
      }
    }

    // THEME_RELATIONSHIP_SHIFT_DECOUPLED (minor, ≥6 scenes, ≥3 relShift scenes):
    // Scenes where a character relationship shifts significantly carry no thematic
    // language. Relationship shifts are the primary vehicle for theme in drama —
    // they are the story's emotional architecture. When relationship changes are
    // thematically silent, the human connections that carry the emotional weight
    // are disconnected from the story's declared central question.
    if (records.length >= 6) {
      const relShiftScenes237 = records.filter((r: any) =>
        (r.relationshipShifts ?? []).length > 0,
      );
      if (relShiftScenes237.length >= 3) {
        const anyRelResonant237 = relShiftScenes237.some((r: any) =>
          sceneHasResonance(sceneTexts.get(r.sceneIdx) ?? '', expandedKeywords),
        );
        if (!anyRelResonant237) {
          issues.push({
            location: 'Relationship-shift scenes',
            rule: 'THEME_RELATIONSHIP_SHIFT_DECOUPLED',
            severity: 'minor',
            description: `${relShiftScenes237.length} relationship-shift scenes carry no thematic language related to "${themeRaw}" — the story's emotional architecture is disconnected from its central question. Relationship changes should dramatize the theme, not exist in a parallel track.`,
            suggestedFix: `Rewrite at least one relationship-shift scene so the shift expresses the theme: if the theme is betrayal, make the relationship crack along a line of trust; if loyalty, make the bond tested on precisely those terms. The theme lives in what characters do to each other.`,
          });
        }
      }
    }

    // ── Wave 265: Clue decoupled, curiosity decoupled, payoff decoupled ──────────

    // THEME_CLUE_DECOUPLED (minor, ≥6 scenes, ≥2 clue-planting scenes): All scenes
    // that plant story clues (seededClueIds present) carry no thematic language.
    // The mystery architecture is disconnected from the central question — planted
    // clues point to plot mechanics but carry no thematic meaning. Distinct from
    // THEME_REVELATION_DECOUPLED (revelation scenes) and THEME_SUBPLOT_ISOLATION
    // (all resonant scenes have revelation).
    if (records.length >= 6) {
      const clueScenes265 = records.filter((r: any) => (r.seededClueIds?.length ?? 0) > 0);
      if (clueScenes265.length >= 2) {
        const anyClueResonant265 = clueScenes265.some((r: any) =>
          sceneHasResonance(sceneTexts.get(r.sceneIdx) ?? '', expandedKeywords),
        );
        if (!anyClueResonant265) {
          issues.push({
            location: 'Clue-planting scenes',
            rule: 'THEME_CLUE_DECOUPLED',
            severity: 'minor',
            description: `${clueScenes265.length} clue-planting scenes carry no thematic language related to "${themeRaw}" — the mystery architecture is structurally disconnected from the central question. Planted clues should carry thematic weight: what is being discovered should connect to what the story is about.`,
            suggestedFix: `Rewrite at least one clue-planting scene so the clue speaks to the theme: if the theme is betrayal, the clue should be evidence of a betrayal; if trust, what's found should complicate trust. Plant evidence of the theme, not just evidence of the crime.`,
          });
        }
      }
    }

    // THEME_CURIOSITY_DECOUPLED (minor, ≥8 scenes, ≥2 curiosity-raising scenes):
    // All scenes that spike curiosity (curiosityDelta > 1) carry no thematic language.
    // The moments that pose story questions are thematically mute — the audience
    // wonders about plot mechanics, not about the story's central question. Distinct
    // from THEME_REVELATION_DECOUPLED (revelation scenes carry no theme) and
    // STRUCTURE_CURIOSITY_VOID (no curiosity spikes exist at all).
    if (records.length >= 8) {
      const curiosityScenes265 = records.filter((r: any) => (r.curiosityDelta ?? 0) > 1);
      if (curiosityScenes265.length >= 2) {
        const anyCuriousResonant265 = curiosityScenes265.some((r: any) =>
          sceneHasResonance(sceneTexts.get(r.sceneIdx) ?? '', expandedKeywords),
        );
        if (!anyCuriousResonant265) {
          issues.push({
            location: 'High-curiosity scenes',
            rule: 'THEME_CURIOSITY_DECOUPLED',
            severity: 'minor',
            description: `${curiosityScenes265.length} scenes that spike audience curiosity (curiosityDelta > 1) carry no thematic language related to "${themeRaw}" — the hook moments are thematically mute. The audience wonders about plot mechanics, not about the story's central question. Questions created by the story should point toward its theme.`,
            suggestedFix: `Embed the theme into the story's hook moments: each curiosity spike should pose a question that is ultimately about "${themeRaw}". The audience's wondering should be guided by the theme — not just "what happens next?" but "what does it mean to trust, or to betray?"`,
          });
        }
      }
    }

    // THEME_PAYOFF_DECOUPLED (minor, ≥8 scenes, ≥2 payoff scenes): All scenes
    // that pay off earlier setups (payoffSetupIds present) carry no thematic language.
    // Payoff moments are the story's peaks of consequence — when they're thematically
    // silent, the dramatic revelations of the story don't answer the central question.
    // Distinct from THEME_RESOLUTION_SILENT (final scene) and THEME_CLIMAX_SCENE_SILENT
    // (Act 3 peak): payoff scenes can appear anywhere and this fires regardless of act.
    if (records.length >= 8) {
      const payoffScenes265 = records.filter((r: any) => (r.payoffSetupIds?.length ?? 0) > 0);
      if (payoffScenes265.length >= 2) {
        const anyPayoffResonant265 = payoffScenes265.some((r: any) =>
          sceneHasResonance(sceneTexts.get(r.sceneIdx) ?? '', expandedKeywords),
        );
        if (!anyPayoffResonant265) {
          issues.push({
            location: 'Payoff scenes',
            rule: 'THEME_PAYOFF_DECOUPLED',
            severity: 'minor',
            description: `${payoffScenes265.length} scenes that pay off story setups carry no thematic language related to "${themeRaw}" — the moments of dramatic consequence are thematically silent. Payoffs should answer not just "what happens?" but "what does it mean?" in terms of the story's central question.`,
            suggestedFix: `Rewrite at least one payoff scene to resonate with the theme: the revelation or consequence should speak directly to "${themeRaw}". A setup planted in terms of the theme should pay off in terms of the theme. If the setup asked a plot question, the payoff should also answer the thematic one.`,
          });
        }
      }
    }

    // ── Wave 251: Final scene silent, positive shift silent, resonance clustering ──

    // THEME_FINAL_SCENE_SILENT (minor, ≥6 scenes, expandedKeywords≥2): The story's
    // final scene carries no thematic language. The last image the audience receives
    // is thematically mute — they exit with the plot's conclusion but no sense of
    // what the story was ultimately about. The final scene is the theme's last chance
    // to speak; silence there leaves the story's central question unanswered at the
    // moment of maximum receptivity.
    if (records.length >= 6 && expandedKeywords.length >= 2) {
      const lastRec251 = records[records.length - 1];
      const lastSceneText251 = sceneTexts.get(lastRec251.sceneIdx) ?? '';
      if (lastSceneText251 && !sceneHasResonance(lastSceneText251, expandedKeywords)) {
        issues.push({
          location: `Final scene (Scene ${lastRec251.sceneIdx})`,
          rule: 'THEME_FINAL_SCENE_SILENT',
          severity: 'minor',
          description: `The story's final scene carries no thematic language related to "${themeRaw}" — the closing moment is thematically mute. The last image the audience receives contains no trace of the central question the story raised.`,
          suggestedFix: `Weave at least one thematic word or image into the final scene: an echo of the opening theme statement, a visual symbol that completes the metaphor, or a line of dialogue that rephrases the central question as an answer. The final scene is the theme's last word.`,
        });
      }
    }

    // THEME_POSITIVE_SHIFT_SILENT (minor, ≥6 scenes, ≥2 positive shifts): All
    // scenes with positive emotional shifts are thematically silent — the theme is
    // present only in conflict, never in resolution or relief. The story uses theme
    // as a weapon rather than a lens. Distinct from THEME_RESONANCE_EMOTIONALLY_INERT
    // (which fires when resonant scenes carry no emotional shift): this fires when
    // positive-shift scenes are the thematically silent ones — theme speaks in pain
    // but not in release.
    if (records.length >= 6) {
      const posShiftScenes251 = records.filter((r: any) => r.emotionalShift === 'positive');
      if (posShiftScenes251.length >= 2) {
        const anyPosResonant251 = posShiftScenes251.some((r: any) =>
          sceneHasResonance(sceneTexts.get(r.sceneIdx) ?? '', expandedKeywords),
        );
        if (!anyPosResonant251) {
          issues.push({
            location: 'Positive emotional shift scenes',
            rule: 'THEME_POSITIVE_SHIFT_SILENT',
            severity: 'minor',
            description: `${posShiftScenes251.length} scenes with positive emotional shifts carry no thematic language — the theme is present only in conflict and loss, never in moments of relief or resolution. The story's warmth is disconnected from its central question.`,
            suggestedFix: `Let the theme breathe in at least one positive scene: a moment of joy or connection that speaks to what the story is fundamentally about. If the theme is trust, let a scene of reconciliation carry that word or its symbol. Theme needs to live in hope as well as despair.`,
          });
        }
      }
    }

    // THEME_RESONANCE_CLUSTERING (minor, ≥6 scenes, ≥4 resonant): More than 65%
    // of all thematically resonant scenes cluster within a single act zone
    // (Act 1: 0–25%, Act 2: 25–75%, or Act 3: 75–100%). The theme speaks loudly
    // in one zone and falls silent everywhere else — an uneven distribution that
    // leaves the audience without thematic guidance during large stretches of the
    // story. Distinct from THEME_OPENING_SILENCE (which fires when Act 1 has no
    // theme) — this fires when ALL acts have theme but most of it piles up in one.
    if (records.length >= 6) {
      const resonantRecords251 = records.filter((r: any) =>
        sceneHasResonance(sceneTexts.get(r.sceneIdx) ?? '', expandedKeywords),
      );
      if (resonantRecords251.length >= 4) {
        const zones251 = [
          { name: 'Act 1', start: 0, end: Math.floor(records.length * 0.25) },
          { name: 'Act 2', start: Math.floor(records.length * 0.25), end: Math.floor(records.length * 0.75) },
          { name: 'Act 3', start: Math.floor(records.length * 0.75), end: records.length },
        ];
        for (const zone251 of zones251) {
          const zoneResonant251 = resonantRecords251.filter(
            (r: any) => r.sceneIdx >= zone251.start && r.sceneIdx < zone251.end,
          ).length;
          if (zoneResonant251 / resonantRecords251.length > 0.65) {
            issues.push({
              location: `Theme clustering in ${zone251.name}`,
              rule: 'THEME_RESONANCE_CLUSTERING',
              severity: 'minor',
              description: `${zoneResonant251} of ${resonantRecords251.length} thematically resonant scenes (${Math.round(zoneResonant251 / resonantRecords251.length * 100)}%) cluster in ${zone251.name} — the theme speaks loudly in one act and falls almost silent in the rest. The audience loses thematic orientation during large stretches of the story.`,
              suggestedFix: `Redistribute thematic resonance across all three acts: let the theme surface at the opening (planting), the midpoint (complicating), and the finale (resolving). Each act should carry at least one moment where the story's central question is visible.`,
            });
            break;
          }
        }
      }
    }

    // ── Wave 279: Dramatic-turn decoupled, negative-shift silent, suspense cluster silent ──

    // THEME_DRAMATIC_TURN_DECOUPLED (minor, n≥8, ≥2 dramatic-turn scenes): All scenes
    // where a dramatic pivot occurs (dramaticTurn !== 'nothing') carry no thematic
    // language. Dramatic turns are the story's decisive structural pivots — when every
    // reversal and revelation is thematically mute, the narrative machinery operates
    // independently of the central question. The turns steer the plot but never the theme.
    if (records.length >= 8) {
      const turnScenes279 = records.filter((r: any) => (r.dramaticTurn ?? 'nothing') !== 'nothing');
      if (turnScenes279.length >= 2) {
        const anyTurnResonant279 = turnScenes279.some((r: any) =>
          sceneHasResonance(sceneTexts.get(r.sceneIdx) ?? '', expandedKeywords),
        );
        if (!anyTurnResonant279) {
          issues.push({
            location: 'Dramatic-turn scenes',
            rule: 'THEME_DRAMATIC_TURN_DECOUPLED',
            severity: 'minor',
            description: `${turnScenes279.length} scenes with a dramatic turn carry no thematic language related to "${themeRaw}" — every narrative pivot is thematically mute. Dramatic turns are the story's decisive moments; when they never carry the theme, reversals change the plot without ever answering the central question.`,
            suggestedFix: `Rewrite at least one dramatic-turn scene so the reversal speaks to the theme: the pivot should cost the protagonist something related to "${themeRaw}" or reveal a truth about it. A turn that changes the plot AND the thematic stakes is infinitely more resonant.`,
          });
        }
      }
    }

    // THEME_NEGATIVE_SHIFT_SILENT (minor, n≥8, ≥2 negative-shift scenes): All scenes
    // with negative emotional shifts carry no thematic language. The story's darkest
    // moments — where the protagonist loses, fails, or suffers — have no connection
    // to the central question. Theme should be felt most keenly at the nadir; when
    // loss and theme are decoupled, the pain has no meaning. Inverse of
    // THEME_POSITIVE_SHIFT_SILENT (which fires when positive scenes are thematically silent).
    if (records.length >= 8) {
      const negScenes279 = records.filter((r: any) => r.emotionalShift === 'negative');
      if (negScenes279.length >= 2) {
        const anyNegResonant279 = negScenes279.some((r: any) =>
          sceneHasResonance(sceneTexts.get(r.sceneIdx) ?? '', expandedKeywords),
        );
        if (!anyNegResonant279) {
          issues.push({
            location: 'Negative emotional shift scenes',
            rule: 'THEME_NEGATIVE_SHIFT_SILENT',
            severity: 'minor',
            description: `${negScenes279.length} scenes with negative emotional shifts carry no thematic language — the story's darkest moments are thematically mute. When loss and the central question are decoupled, the audience feels the pain without understanding its meaning in terms of "${themeRaw}".`,
            suggestedFix: `Let the theme speak at the story's lowest point: a scene of loss or failure should make explicit what thematic value was sacrificed. If the theme is loyalty, the betrayal should cost that; if courage, the defeat should name what was given up. Pain needs thematic meaning to become drama.`,
          });
        }
      }
    }

    // THEME_SUSPENSE_CLUSTER_SILENT (minor, n≥8, ≥3 scenes with suspenseDelta > 1): All
    // high-suspense scenes carry no thematic language. The moments of maximum tension
    // — where the audience's pulse quickens — have no thematic dimension. Distinct from
    // THEME_CLOCK_RESONANCE_ABSENT (ticking clocks) and THEME_CLIMAX_SCENE_SILENT (single
    // peak scene): this checks whether the cluster of high-tension scenes as a group
    // carries any theme. When all suspense is thematically empty, the story is exciting
    // but not meaningful.
    if (records.length >= 8) {
      const suspenseScenes279 = records.filter((r: any) => (r.suspenseDelta ?? 0) > 1);
      if (suspenseScenes279.length >= 3) {
        const anySuspenseResonant279 = suspenseScenes279.some((r: any) =>
          sceneHasResonance(sceneTexts.get(r.sceneIdx) ?? '', expandedKeywords),
        );
        if (!anySuspenseResonant279) {
          issues.push({
            location: 'High-suspense scenes',
            rule: 'THEME_SUSPENSE_CLUSTER_SILENT',
            severity: 'minor',
            description: `${suspenseScenes279.length} high-suspense scenes (suspenseDelta > 1) carry no thematic language related to "${themeRaw}" — the story's most gripping moments are thematically hollow. Tension that never implicates the central question makes the story exciting but not meaningful.`,
            suggestedFix: `Weave the theme into at least one high-suspense scene: the thing at stake in the tense moment should connect to "${themeRaw}". If the audience is on the edge of their seat, they should also be questioning what the story is about — the greatest suspense is thematic as well as physical.`,
          });
        }
      }
    }

    // ── Wave 293: THEME_REVELATION_SILENT ────────────────────────────────────
    // All revelation scenes carry no thematic language. Revelations are the
    // story's information peaks — the moments where hidden truth emerges. When
    // every revelation is thematically mute, the audience receives facts without
    // understanding their thematic weight. Requires n≥8 and ≥2 revelation scenes.
    if (records.length >= 8) {
      const revScenes293 = records.filter((r: any) => r.revelation !== null);
      if (revScenes293.length >= 2) {
        const anyRevResonant293 = revScenes293.some((r: any) =>
          sceneHasResonance(sceneTexts.get(r.sceneIdx) ?? '', expandedKeywords),
        );
        if (!anyRevResonant293) {
          issues.push({
            location: 'Revelation scenes',
            rule: 'THEME_REVELATION_SILENT',
            severity: 'minor',
            description: `${revScenes293.length} revelation scene(s) carry no thematic language related to "${themeRaw}" — the story's moments of disclosed truth are thematically mute. Revelations should reframe the theme: what is revealed should illuminate what the story is about, not just what happened.`,
            suggestedFix: `Each revelation should answer a thematic question, not just a plot question. If the theme is betrayal, the revelation should expose what loyalty costs; if it is identity, the truth revealed should force a character to confront who they are. Let "${themeRaw}" resonate in every unmasking.`,
          });
        }
      }
    }

    // ── Wave 293: THEME_CLOCK_SCENE_SILENT ───────────────────────────────────
    // All clock-raising scenes carry no thematic language. The story's urgency
    // engine — the ticking deadlines — never implicates the central theme. When
    // time pressure is decoupled from the thematic question, the stakes are
    // mechanical rather than meaningful: the audience fears running out of time
    // without knowing what the time is for. Requires n≥8 and ≥2 clockRaised scenes.
    if (records.length >= 8) {
      const clockScenes293 = records.filter((r: any) => r.clockRaised === true);
      if (clockScenes293.length >= 2) {
        const anyClockResonant293 = clockScenes293.some((r: any) =>
          sceneHasResonance(sceneTexts.get(r.sceneIdx) ?? '', expandedKeywords),
        );
        if (!anyClockResonant293) {
          issues.push({
            location: 'Clock-raising scenes',
            rule: 'THEME_CLOCK_SCENE_SILENT',
            severity: 'minor',
            description: `${clockScenes293.length} clock-raising scene(s) carry no thematic language related to "${themeRaw}" — the story's urgency engine is thematically disconnected. Time pressure without thematic meaning creates mechanical tension: the audience worries about the deadline without understanding what the deadline is for.`,
            suggestedFix: `Connect the deadline to "${themeRaw}": what thematic value is at stake when the clock expires? If the theme is redemption, the deadline is the last chance for it; if justice, the clock is time running out on the truth. Ticking clocks become unbearable when what they threaten is thematic, not just practical.`,
          });
        }
      }
    }

    // ── Wave 293: THEME_PAYOFF_SILENT ────────────────────────────────────────
    // All payoff scenes carry no thematic language. The story's resolution engine
    // — the moments when planted threads finally resolve — never connects to the
    // central theme. When payoffs are thematically silent, the audience receives
    // closure without insight: the loop closes but the meaning is absent.
    // Requires n≥8 and ≥2 payoff scenes (payoffSetupIds non-empty).
    if (records.length >= 8) {
      const payoffScenes293 = records.filter((r: any) => (r.payoffSetupIds?.length ?? 0) > 0);
      if (payoffScenes293.length >= 2) {
        const anyPayoffResonant293 = payoffScenes293.some((r: any) =>
          sceneHasResonance(sceneTexts.get(r.sceneIdx) ?? '', expandedKeywords),
        );
        if (!anyPayoffResonant293) {
          issues.push({
            location: 'Payoff scenes',
            rule: 'THEME_PAYOFF_SILENT',
            severity: 'minor',
            description: `${payoffScenes293.length} payoff scene(s) carry no thematic language related to "${themeRaw}" — the story's resolution moments are thematically empty. Payoffs that close loops without implicating the theme produce satisfaction without meaning: the audience feels the closure but cannot articulate what it was for.`,
            suggestedFix: `Ensure each payoff answers both a plot question and a thematic question. What does the resolved thread reveal about "${themeRaw}"? A clue paid off should say something about the theme, not just confirm a fact. Thematic payoffs are the difference between a satisfying ending and a meaningful one.`,
          });
        }
      }
    }

    // ── Wave 307: shallow resonance, quiet scenes only, resonance burst ──────
    // Local hit accounting over the resonant set (reuses expandedKeywords +
    // sceneTexts, both in scope here).
    const distinctKw307 = (text: string) =>
      expandedKeywords.filter(forms => forms.some(f => text.includes(f))).length;
    const formHits307 = (text: string) =>
      expandedKeywords.reduce(
        (s, forms) => s + forms.reduce((c, f) => c + (f ? text.split(f).length - 1 : 0), 0),
        0,
      );
    const resonant307 = records.filter(r => distinctKw307(sceneTexts.get(r.sceneIdx) ?? '') > 0);

    // THEME_SHALLOW_RESONANCE (minor, ≥3 resonant scenes, ≥2 theme keywords): No
    // resonant scene matches two or more distinct theme keywords. The theme is
    // name-dropped a single facet at a time but never explored in depth within a
    // single beat — the audience never sees two sides of the theme collide in one
    // scene. Distinct from THEME_SINGLE_KEYWORD_RELIANCE (which audits keyword
    // proportions across the whole story) — this audits per-scene facet depth.
    if (resonant307.length >= 3 && expandedKeywords.length >= 2) {
      const maxDistinct307 = Math.max(
        ...resonant307.map(r => distinctKw307(sceneTexts.get(r.sceneIdx) ?? '')),
      );
      if (maxDistinct307 <= 1) {
        issues.push({
          location: 'Thematically resonant scenes',
          rule: 'THEME_SHALLOW_RESONANCE',
          severity: 'minor',
          description: `Across ${resonant307.length} thematically resonant scenes, no single scene touches more than one facet of "${themeRaw}" — the theme is name-dropped one keyword at a time but never explored in depth. Theme lands hardest when two sides of its tension meet in the same beat; one-keyword-per-scene resonance keeps the theme a label rather than a lived idea.`,
          suggestedFix: `Write at least one scene where multiple facets of "${themeRaw}" collide — where the competing values the theme names are both present and in tension. A scene that holds two sides of the theme at once does more thematic work than a dozen that each gesture at one.`,
        });
      }
    }

    // THEME_QUIET_SCENES_ONLY (minor, ≥3 resonant scenes): Every resonant scene is
    // emotionally neutral AND low-suspense (suspenseDelta ≤ 1). The theme only ever
    // surfaces in dramatically inert connective tissue, never in a charged scene.
    // Distinct from THEME_SUSPENSE_CLUSTER_SILENT (population = high-suspense scenes)
    // and the emotional-shift-silent checks (population = shifted scenes) — this
    // audits whether the resonant set as a whole ever lands in a charged scene.
    if (resonant307.length >= 3) {
      const allQuiet307 = resonant307.every(
        (r: any) => r.emotionalShift === 'neutral' && (r.suspenseDelta ?? 0) <= 1,
      );
      if (allQuiet307) {
        issues.push({
          location: 'Thematically resonant scenes',
          rule: 'THEME_QUIET_SCENES_ONLY',
          severity: 'minor',
          description: `All ${resonant307.length} thematically resonant scenes are emotionally neutral and low-suspense — the theme "${themeRaw}" only ever surfaces in dramatically inert scenes. When theme appears exclusively in quiet connective tissue and never in a charged moment, the audience files it as commentary rather than experiencing it as stakes.`,
          suggestedFix: `Move at least one thematic beat into a charged scene — a confrontation, a reversal, a moment of real suspense or emotional swing. Theme that surfaces when the stakes are highest fuses idea and feeling; theme confined to calm scenes stays intellectual.`,
        });
      }
    }

    // THEME_RESONANCE_BURST (minor, total hits ≥4, ≥2 resonant scenes): A single
    // scene holds more than half of all theme keyword occurrences in the story.
    // The theme is crammed into one moment rather than woven through. Distinct from
    // THEME_HEAVY_HANDED (a scene with ≥6 hits and >3× the average) — BURST is a
    // share-of-total measure that fires on concentration even at modest counts.
    if (resonant307.length >= 2) {
      const perSceneHits307 = resonant307.map(r => formHits307(sceneTexts.get(r.sceneIdx) ?? ''));
      const totalHits307 = perSceneHits307.reduce((s, v) => s + v, 0);
      const maxHits307 = Math.max(...perSceneHits307);
      if (totalHits307 >= 4 && maxHits307 / totalHits307 > 0.5) {
        issues.push({
          location: 'Theme keyword distribution',
          rule: 'THEME_RESONANCE_BURST',
          severity: 'minor',
          description: `A single scene holds ${maxHits307} of ${totalHits307} total theme keyword occurrences (${Math.round(maxHits307 / totalHits307 * 100)}%) for "${themeRaw}" — the theme is concentrated in one burst rather than woven through the story. A theme delivered in a single concentrated dose reads as a thesis statement the rest of the script forgot to dramatize.`,
          suggestedFix: `Redistribute the theme's language across the story: take the keyword density piled into one scene and spread it so the theme recurs as a thread the audience can track from opening to finale. A theme woven through many scenes accumulates; a theme dumped in one evaporates.`,
        });
      }
    }

    // ── Wave 321: peak-before-midpoint, raise-stakes silent, suspense-release silent ──

    // THEME_PEAK_BEFORE_MIDPOINT (minor, n≥8, totalHits≥4, peak≥2): The scene
    // with the most theme keyword hits — the thematic peak — falls in the first
    // half of the story. Theme should crescendo toward the climax; a thematic
    // peak in the setup means the densest statement of the story's idea arrives
    // before the audience is invested, then the theme thins out. Distinct from
    // THEME_FRONT_LOADED (first-third vs rest density gradient), THEME_ACCELERATING_
    // DENSITY_ABSENT (final-third vs first-third), and THEME_RESONANCE_BURST
    // (single-scene share of total) — this is an argmax-position metric.
    if (records.length >= 8) {
      let peakPos321 = -1;
      let peakHits321 = 0;
      for (let i = 0; i < records.length; i++) {
        const h321 = sceneHitCounts.get(records[i].sceneIdx) ?? 0;
        if (h321 > peakHits321) { peakHits321 = h321; peakPos321 = i; }
      }
      const totalHits321 = [...sceneHitCounts.values()].reduce((s, v) => s + v, 0);
      const midPos321 = Math.floor(records.length / 2);
      if (peakHits321 >= 2 && totalHits321 >= 4 && peakPos321 >= 0 && peakPos321 < midPos321) {
        issues.push({
          location: `Scene ${records[peakPos321].sceneIdx} (thematic peak)`,
          rule: 'THEME_PEAK_BEFORE_MIDPOINT',
          severity: 'minor',
          description: `The thematic peak — the scene with the most "${themeRaw}" language (${peakHits321} hits) — falls in the first half of the story (Scene ${records[peakPos321].sceneIdx} of ${records.length}). Theme should build toward its densest statement near the climax, where the audience is most invested; a peak in the setup states the idea before anyone cares, then lets it thin out toward the ending.`,
          suggestedFix: `Shift the theme's strongest expression later: let the setup introduce the question lightly and reserve the most concentrated thematic beat for a scene at or near the climax, where the story's events give the idea its full weight. The theme should land hardest where the stakes are highest.`,
        });
      }
    }

    // THEME_RAISE_STAKES_SILENT (minor, n≥8, ≥2 raise-stakes scenes): Every scene
    // whose purpose is to raise the stakes carries no thematic language. The
    // moments that escalate the story's danger are disconnected from what the
    // story is about — the audience feels the pressure rise but never sees it
    // implicate the theme. Distinct from the other channel-silent checks
    // (revelation, clock-raised, payoff, clue, curiosity, dramatic-turn, shifts,
    // high-suspense): population here is scenes with purpose === 'raise_stakes'.
    if (records.length >= 8) {
      const stakesScenes321 = records.filter((r: any) => r.purpose === 'raise_stakes');
      if (stakesScenes321.length >= 2) {
        const allSilent321 = stakesScenes321.every(
          r => !sceneHasResonance(sceneTexts.get(r.sceneIdx) ?? '', expandedKeywords),
        );
        if (allSilent321) {
          issues.push({
            location: `${stakesScenes321.length} raise-stakes scene(s)`,
            rule: 'THEME_RAISE_STAKES_SILENT',
            severity: 'minor',
            description: `All ${stakesScenes321.length} stake-raising scenes carry no language related to "${themeRaw}" — the moments that escalate the story's danger are thematically empty. When rising stakes never implicate the theme, the audience feels the pressure mount mechanically but cannot connect it to the story's central question. Escalation without thematic stake is plot machinery.`,
            suggestedFix: `Tie each escalation to the theme: when the stakes rise, let what is threatened be the value the theme is about. If the theme is "trust," the rising danger should put trust itself at risk — so the audience feels the cost in thematic terms, not just plot terms.`,
          });
        }
      }
    }

    // THEME_SUSPENSE_RELEASE_SILENT (minor, n≥8, ≥2 release scenes): Every scene
    // that releases clock pressure (clockDelta < 0) carries no thematic language.
    // Release beats are the story's exhales — natural reflection points where a
    // character (and audience) can process what just happened. When all release
    // moments are thematically silent, the story never uses its quiet beats to
    // deepen meaning. Distinct from THEME_CLOCK_SCENE_SILENT (population =
    // clockRaised scenes, i.e. tension BUILD): this audits tension RELEASE.
    if (records.length >= 8) {
      const releaseScenes321 = records.filter((r: any) => (r.clockDelta ?? 0) < 0);
      if (releaseScenes321.length >= 2) {
        const allSilent321r = releaseScenes321.every(
          r => !sceneHasResonance(sceneTexts.get(r.sceneIdx) ?? '', expandedKeywords),
        );
        if (allSilent321r) {
          issues.push({
            location: `${releaseScenes321.length} tension-release scene(s)`,
            rule: 'THEME_SUSPENSE_RELEASE_SILENT',
            severity: 'minor',
            description: `All ${releaseScenes321.length} tension-release scenes (clockDelta < 0) carry no language related to "${themeRaw}" — the story's exhale moments are thematically empty. Release beats are where a character and the audience process what just happened; squandering them on plot-only downtime wastes the story's natural reflection points, where theme lands most gently and most deeply.`,
            suggestedFix: `Use release beats to deepen the theme: after the pressure drops, give a character a moment to reckon with what the recent events mean in terms of "${themeRaw}" — a quiet line, a telling action, an image that reframes the cost. The exhale is when meaning settles.`,
          });
        }
      }
    }

    // ── Wave 332: THEME_DEVELOPMENT_SCENE_DESERT, THEME_CURIOSITY_PEAK_ABSENT, THEME_ACT2B_DENSITY_DROP ──

    // THEME_DEVELOPMENT_SCENE_DESERT (minor, n≥10, ≥4 dev scenes): None of the
    // scenes with purpose='development' carry thematic resonance. The story's
    // connective tissue — the scenes that link structural events — is completely
    // thematically empty. When theme only appears at set-pieces (revelations,
    // turns, escalations) but never in the in-between moments, the audience
    // experiences the theme as episodic punctuation rather than a continuous
    // undercurrent. Distinct from THEME_ACT2_DESERT (zone-based %; this is
    // purpose-based and can fire outside Act 2) and THEME_QUIET_SCENES_ONLY
    // (fires when theme ONLY appears in quiet scenes — the opposite problem).
    if (records.length >= 10) {
      const devScenes332 = records.filter((r: any) => r.purpose === 'development');
      if (devScenes332.length >= 4) {
        const anyDevResonant332 = devScenes332.some((r: any) =>
          sceneHasResonance(sceneTexts.get(r.sceneIdx) ?? '', expandedKeywords),
        );
        if (!anyDevResonant332) {
          issues.push({
            location: `${devScenes332.length} development scene(s)`,
            rule: 'THEME_DEVELOPMENT_SCENE_DESERT',
            severity: 'minor',
            description: `All ${devScenes332.length} scenes marked as 'development' carry no language related to "${themeRaw}" — the story's connective tissue is thematically empty. Theme appears at structural peak moments (revelations, turns, escalations) but vanishes in the scenes between them. The audience experiences the theme as episodic punctuation rather than a continuous undercurrent of meaning.`,
            suggestedFix: `Weave the theme into the development scenes: a passing reference, an image that echoes the theme's vocabulary, or a character action that embodies the theme without announcing it. The connective tissue of the story is where the theme becomes habitual — where the audience starts to feel it before they consciously register it.`,
          });
        }
      }
    }

    // THEME_CURIOSITY_PEAK_ABSENT (minor, n≥8, totalHits≥3): The scene with the
    // highest curiosityDelta carries no thematic resonance — even though other scenes
    // do carry the theme. The story's single most question-raising moment is
    // thematically mute. The audience is most curious at that scene but the curiosity
    // is pure plot mechanics, not thematic inquiry. Distinct from THEME_CURIOSITY_DECOUPLED
    // (fires when ALL high-curiosity scenes lack theme; this fires when the PEAK
    // curiosity scene lacks theme even if other curiosity scenes carry it).
    if (records.length >= 8 && totalHits >= 3) {
      const maxCuriosity332 = Math.max(...(records as any[]).map(r => r.curiosityDelta ?? 0));
      if (maxCuriosity332 > 0) {
        const peakRec332 = (records as any[]).find(r => (r.curiosityDelta ?? 0) === maxCuriosity332);
        if (peakRec332 && !sceneHasResonance(sceneTexts.get(peakRec332.sceneIdx) ?? '', expandedKeywords)) {
          issues.push({
            location: `Scene ${peakRec332.sceneIdx} (peak curiosity: ${maxCuriosity332})`,
            rule: 'THEME_CURIOSITY_PEAK_ABSENT',
            severity: 'minor',
            description: `The scene with the highest curiosityDelta (Scene ${peakRec332.sceneIdx}, delta ${maxCuriosity332}) carries no language related to "${themeRaw}" — the story's single most question-raising moment is thematically mute. While other scenes carry the theme, the moment of maximum curiosity leaves the audience wondering about plot mechanics rather than thematic meaning. The most urgent question posed should be the story's thematic question.`,
            suggestedFix: `Embed the theme in the peak curiosity scene: let the question it raises be ultimately about "${themeRaw}" rather than purely about what happens next. The audience should leave that scene wondering about the theme, not just about the plot.`,
          });
        }
      }
    }

    // THEME_ACT2B_DENSITY_DROP (minor, n≥12): Thematic resonance density in Act 2b
    // (50%–75%) falls below half the density of Act 2a (25%–50%). The theme
    // thins precisely when the story should be escalating its central question —
    // the run-up to the climax loses thematic pressure. Distinct from
    // THEME_DENSITY_INVERSION (first half vs second half overall), THEME_FRONT_LOADED
    // (first-third vs rest), and THEME_ACT2_DESERT (Act 2 as a whole < 30% resonant):
    // this specifically checks the 2a-to-2b trajectory within Act 2.
    if (records.length >= 12) {
      const act2aStart332 = Math.floor(records.length * 0.25);
      const act2bStart332 = Math.floor(records.length * 0.5);
      const act2bEnd332 = Math.floor(records.length * 0.75);
      const act2aRecs332 = records.slice(act2aStart332, act2bStart332);
      const act2bRecs332 = records.slice(act2bStart332, act2bEnd332);
      if (act2aRecs332.length > 0 && act2bRecs332.length > 0) {
        const act2aResonant332 = act2aRecs332.filter((r: any) =>
          sceneHasResonance(sceneTexts.get(r.sceneIdx) ?? '', expandedKeywords),
        ).length;
        const act2bResonant332 = act2bRecs332.filter((r: any) =>
          sceneHasResonance(sceneTexts.get(r.sceneIdx) ?? '', expandedKeywords),
        ).length;
        const act2aDensity332 = act2aResonant332 / act2aRecs332.length;
        const act2bDensity332 = act2bResonant332 / act2bRecs332.length;
        if (act2aDensity332 > 0.4 && act2bDensity332 < act2aDensity332 * 0.5) {
          issues.push({
            location: `Act 2a vs Act 2b — thematic density drop`,
            rule: 'THEME_ACT2B_DENSITY_DROP',
            severity: 'minor',
            description: `Thematic density falls sharply from Act 2a (${Math.round(act2aDensity332 * 100)}% resonant) to Act 2b (${Math.round(act2bDensity332 * 100)}% resonant) — the story loses thematic pressure in the run-up to the climax. The complication zone should escalate the theme toward its most intense statement near the climax; a thinning in Act 2b means the thematic question goes quiet at the exact moment it should be most insistent.`,
            suggestedFix: `Maintain or increase thematic density into Act 2b: let the escalating stakes also escalate the thematic question. Each new complication in Act 2b should tighten the screw on "${themeRaw}" — the theme should arrive at the climax at maximum pressure, not at minimum.`,
          });
        }
      }
    }

    // ── Wave 346: THEME_SUSPENSE_PEAK_ABSENT, THEME_LATE_DEBUT, THEME_CLOSING_QUARTER_SILENT ──

    // THEME_SUSPENSE_PEAK_ABSENT (minor, n≥8, totalHits≥3): The scene with the
    // highest suspenseDelta carries no thematic resonance, even though other scenes do.
    // The story's single most tense moment is thematically mute — the audience is at
    // peak tension, but the danger is pure plot mechanics rather than a collision with
    // the theme. The most charged confrontation should be where the thematic question
    // is most at stake. The suspense analogue of THEME_CURIOSITY_PEAK_ABSENT (Wave 332);
    // distinct from THEME_SUSPENSE_CLUSTER_SILENT (a run of high-suspense scenes) and
    // THEME_SUSPENSE_RELEASE_SILENT (tension-release scenes).
    if (records.length >= 8 && totalHits >= 3) {
      const maxSuspense346 = Math.max(...(records as any[]).map(r => r.suspenseDelta ?? 0));
      if (maxSuspense346 > 0) {
        const peakRec346 = (records as any[]).find(r => (r.suspenseDelta ?? 0) === maxSuspense346);
        if (peakRec346 && !sceneHasResonance(sceneTexts.get(peakRec346.sceneIdx) ?? '', expandedKeywords)) {
          issues.push({
            location: `Scene ${peakRec346.sceneIdx} (peak suspense: ${maxSuspense346})`,
            rule: 'THEME_SUSPENSE_PEAK_ABSENT',
            severity: 'minor',
            description: `The scene with the highest suspenseDelta (Scene ${peakRec346.sceneIdx}, delta ${maxSuspense346}) carries no language related to "${themeRaw}" — the story's single most tense moment is thematically mute. While other scenes carry the theme, the peak of tension lands as pure plot danger rather than a collision with the thematic question. The most charged confrontation is exactly where the theme should be most at stake.`,
            suggestedFix: `Bind the theme to the peak-tension scene: let what is in jeopardy there be ultimately about "${themeRaw}", not just about who survives or wins. When the audience is most gripped, the stakes they feel should be thematic as well as physical.`,
          });
        }
      }
    }

    // THEME_LATE_DEBUT (minor, n≥8, totalHits≥2): The first scene that carries any
    // thematic resonance falls at or after the midpoint — the entire first half of the
    // story is thematically silent. A theme introduced only in the back half has no time
    // to establish itself as the story's through-line; the audience reaches the midpoint
    // with no sense of what the story is about, then is asked to invest in a meaning that
    // arrives late. Distinct from THEME_OPENING_SILENT (only the first three scenes) and
    // THEME_FRONT_LOADED / THEME_FIRST_ACT_RESOLUTION (the opposite — theme spent early).
    if (records.length >= 8 && totalHits >= 2) {
      const mid346 = Math.floor(records.length * 0.5);
      let firstResonantPos346 = -1;
      for (let i346 = 0; i346 < records.length; i346++) {
        if (sceneHasResonance(sceneTexts.get((records as any[])[i346].sceneIdx) ?? '', expandedKeywords)) {
          firstResonantPos346 = i346;
          break;
        }
      }
      if (firstResonantPos346 >= mid346) {
        issues.push({
          location: `First thematic resonance at Scene ${(records as any[])[firstResonantPos346].sceneIdx} (past the midpoint)`,
          rule: 'THEME_LATE_DEBUT',
          severity: 'minor',
          description: `The first scene carrying any language related to "${themeRaw}" is Scene ${(records as any[])[firstResonantPos346].sceneIdx}, at or past the story's midpoint — the entire first half is thematically silent. A theme introduced only in the back half has no time to establish itself as the through-line; the audience reaches the midpoint with no sense of what the story is about, then is asked to invest in a meaning that arrives late.`,
          suggestedFix: `Plant the theme early: let "${themeRaw}" surface — even quietly — in the opening act, through an image, a line, or a choice that frames the question the story will explore. The theme the audience meets in Act 1 is the one they feel resolve in Act 3.`,
        });
      }
    }

    // THEME_CLOSING_QUARTER_SILENT (minor, n≥12, ≥3 final-quarter scenes): The final
    // 25% of the story contains no thematically resonant scene, while the theme appears
    // earlier. The thematic frame is left open — the story raises its central question
    // but lets it go quiet exactly where it should resolve. A theme that vanishes from
    // the finale denies the audience the sense that the ending answers (or pointedly
    // refuses to answer) what the story was about. Distinct from THEME_FINAL_SCENE_SILENT
    // (the single last scene), THEME_RESOLUTION_SILENT (purpose='resolution' scenes), and
    // THEME_CLIMAX_SCENE_SILENT (the climax scene): this checks the whole closing zone.
    if (records.length >= 12) {
      const finalStart346 = Math.floor(records.length * 0.75);
      const finalRecs346 = (records as any[]).slice(finalStart346);
      const earlierRecs346 = (records as any[]).slice(0, finalStart346);
      if (finalRecs346.length >= 3) {
        const earlierResonant346 = earlierRecs346.some((r: any) =>
          sceneHasResonance(sceneTexts.get(r.sceneIdx) ?? '', expandedKeywords),
        );
        const finalResonant346 = finalRecs346.some((r: any) =>
          sceneHasResonance(sceneTexts.get(r.sceneIdx) ?? '', expandedKeywords),
        );
        if (earlierResonant346 && !finalResonant346) {
          issues.push({
            location: `Closing quarter (Scenes ${finalStart346}–${records.length - 1}) — thematically silent`,
            rule: 'THEME_CLOSING_QUARTER_SILENT',
            severity: 'minor',
            description: `The final quarter of the story (Scenes ${finalStart346}–${records.length - 1}) carries no language related to "${themeRaw}", though the theme appears earlier — the thematic frame is left open. The story raises its central question but lets it go quiet exactly where it should resolve, so the ending answers the plot without answering (or pointedly refusing to answer) what the story was about.`,
            suggestedFix: `Return to the theme in the closing quarter: the climax and denouement should be where "${themeRaw}" reaches its sharpest statement — the moment the story's argument lands. Let the resolution of the plot also resolve the thematic question, so the ending feels like it meant something.`,
          });
        }
      }
    }

    // ── Wave 360: THEME_ACT3_DENSITY_DROP, THEME_RELATIONSHIP_PEAK_ABSENT, THEME_DUAL_PEAK_ABSENT ──

    // THEME_ACT3_DENSITY_DROP (minor, n≥12, ≥2 resonant Act 2 scenes): The
    // proportion of resonant scenes in Act 3 (final 25%) is less than 50% of
    // the proportion in Act 2 (25%–75%). The theme thins sharply at the approach
    // to resolution — exactly when it should be at its most insistent. Distinct
    // from THEME_CLOSING_QUARTER_SILENT (total absence in final 25%; this fires
    // even when some theme is present but much less dense than Act 2), THEME_
    // ACCELERATING_DENSITY_ABSENT (keyword count, first-third vs last-third),
    // THEME_DENSITY_INVERSION (first half vs second half), and THEME_ACT2B_
    // DENSITY_DROP (Act 2a vs Act 2b within Act 2).
    if (records.length >= 12) {
      const act2Start360 = Math.floor(records.length * 0.25);
      const act3Start360 = Math.floor(records.length * 0.75);
      const act2Recs360 = (records as any[]).slice(act2Start360, act3Start360);
      const act3Recs360 = (records as any[]).slice(act3Start360);
      const act2Resonant360 = act2Recs360.filter((r: any) =>
        sceneHasResonance(sceneTexts.get(r.sceneIdx) ?? '', expandedKeywords),
      ).length;
      const act3Resonant360 = act3Recs360.filter((r: any) =>
        sceneHasResonance(sceneTexts.get(r.sceneIdx) ?? '', expandedKeywords),
      ).length;
      if (act2Resonant360 >= 2 && act3Recs360.length >= 2) {
        const act2Density360 = act2Resonant360 / act2Recs360.length;
        const act3Density360 = act3Resonant360 / act3Recs360.length;
        if (act3Density360 < act2Density360 * 0.5) {
          issues.push({
            location: `Act 3 (Scenes ${act3Start360}–${records.length - 1}) — thematic density drop`,
            rule: 'THEME_ACT3_DENSITY_DROP',
            severity: 'minor',
            description: `Act 3 is ${Math.round(act3Density360 * 100)}% thematically resonant vs Act 2's ${Math.round(act2Density360 * 100)}% — the theme thins sharply at the approach to resolution. The story should be escalating its thematic argument toward the climax, not retreating from it; a density drop into Act 3 means the ending inherits a plot without a meaning.`,
            suggestedFix: `Bring the theme back at full force in Act 3: the climax should be where "${themeRaw}" is most urgently at stake, not where it quietly recedes. Redistribute resonant beats into the finale so the ending answers the story's central question at the moment of highest dramatic pressure.`,
          });
        }
      }
    }

    // THEME_RELATIONSHIP_PEAK_ABSENT (minor, n≥8, ≥2 resonant relationship-
    // shift scenes): The scene carrying the largest absolute relationship shift
    // (max |amount| across all shifts in all scenes) is thematically silent,
    // even though at least 2 other relationship-shift scenes carry theme. The
    // biggest relational swing in the story happens without thematic resonance
    // — the moment a bond moves most dramatically is thematically mute. Distinct
    // from THEME_RELATIONSHIP_SHIFT_DECOUPLED (all shift scenes are silent; this
    // fires when others carry theme but the PEAK is silent) and THEME_SUSPENSE_
    // PEAK_ABSENT / THEME_CURIOSITY_PEAK_ABSENT (different channels).
    if (records.length >= 8) {
      const shiftRecs360 = (records as any[]).filter(r =>
        ((r.relationshipShifts ?? []) as any[]).length > 0,
      );
      const resonantShiftRecs360 = shiftRecs360.filter((r: any) =>
        sceneHasResonance(sceneTexts.get(r.sceneIdx) ?? '', expandedKeywords),
      );
      if (resonantShiftRecs360.length >= 2) {
        let peakAmount360 = 0;
        let peakRec360: any = null;
        for (const r of shiftRecs360) {
          for (const sh of (r.relationshipShifts ?? []) as Array<{ amount: number }>) {
            if (Math.abs(sh.amount) > peakAmount360) {
              peakAmount360 = Math.abs(sh.amount);
              peakRec360 = r;
            }
          }
        }
        if (peakRec360 && !sceneHasResonance(sceneTexts.get(peakRec360.sceneIdx) ?? '', expandedKeywords)) {
          issues.push({
            location: `Scene ${peakRec360.sceneIdx} — largest relationship shift (|${peakAmount360.toFixed(2)}|)`,
            rule: 'THEME_RELATIONSHIP_PEAK_ABSENT',
            severity: 'minor',
            description: `The scene with the story's largest relationship shift (Scene ${peakRec360.sceneIdx}, magnitude ${peakAmount360.toFixed(2)}) carries no language related to "${themeRaw}", even though ${resonantShiftRecs360.length} other relationship-shift scenes do. The biggest relational swing in the story — the moment a bond moves most dramatically — happens without thematic resonance, so the audience registers the event but misses its meaning.`,
            suggestedFix: `Let the peak relational moment carry the theme: when a bond breaks or deepens most severely, the language should echo what the story is about. If the theme is "${themeRaw}", the biggest shift should make explicit what value is at stake in that bond at that moment.`,
          });
        }
      }
    }

    // THEME_DUAL_PEAK_ABSENT (minor, n≥8, ≥3 resonant scenes): The scene with
    // the highest combined (suspenseDelta + curiosityDelta) carries no theme —
    // the most dramatically and intellectually charged moment of the story is
    // thematically silent. This is the moment where both tension and curiosity
    // peak simultaneously; if the theme is absent there, the audience's most
    // heightened state is thematically blank. Distinct from THEME_SUSPENSE_PEAK_
    // ABSENT (max suspenseDelta alone) and THEME_CURIOSITY_PEAK_ABSENT (max
    // curiosityDelta alone): this targets the joint peak, which may be a different
    // scene than either individual peak.
    if (records.length >= 8 && resonantScenes.length >= 3) {
      const maxDual360 = Math.max(...(records as any[]).map(r =>
        (r.suspenseDelta ?? 0) + (r.curiosityDelta ?? 0),
      ));
      if (maxDual360 > 0) {
        const peakDualRec360 = (records as any[]).find(r =>
          (r.suspenseDelta ?? 0) + (r.curiosityDelta ?? 0) === maxDual360,
        );
        if (peakDualRec360 && !sceneHasResonance(sceneTexts.get(peakDualRec360.sceneIdx) ?? '', expandedKeywords)) {
          issues.push({
            location: `Scene ${peakDualRec360.sceneIdx} — combined suspense + curiosity peak (${maxDual360.toFixed(2)})`,
            rule: 'THEME_DUAL_PEAK_ABSENT',
            severity: 'minor',
            description: `Scene ${peakDualRec360.sceneIdx} has the story's highest combined suspense and curiosity charge (suspenseDelta + curiosityDelta = ${maxDual360.toFixed(2)}) but carries no language related to "${themeRaw}". The moment where tension and intrigue peak simultaneously — when the audience is most gripped and most curious — is thematically blank. The most engaged the audience will be all story, and the theme is nowhere in the scene.`,
            suggestedFix: `Bring "${themeRaw}" into the story's peak dramatic moment: when suspense and curiosity crest at the same scene, the thematic stakes should be explicit. The audience's maximum engagement is the most powerful moment to remind them what the story is ultimately about.`,
          });
        }
      }
    }

    // ── Wave 374: THEME_ACT1_DENSITY_DROP, THEME_CLOCK_PEAK_ABSENT, THEME_CHARGED_SCENE_SILENT ──

    // THEME_ACT1_DENSITY_DROP (minor, n≥12, ≥2 resonant scenes in the body): Act 1
    // (the first 25%) has a resonance proportion less than half that of the rest of the
    // story. The opening under-weights the theme relative to the body, so the audience
    // spends the setup with little sense of what the story is about and the through-line
    // is established late. Distinct from THEME_OPENING_SILENT (only the first three
    // scenes), THEME_LATE_DEBUT (first resonant scene past the midpoint), and THEME_FRONT_
    // LOADED (the opposite — theme concentrated early): this compares Act 1 density to the
    // remaining acts.
    if (records.length >= 12) {
      const act1End374 = Math.floor(records.length * 0.25);
      const act1Recs374 = (records as any[]).slice(0, act1End374);
      const restRecs374 = (records as any[]).slice(act1End374);
      const act1Resonant374 = act1Recs374.filter((r: any) => sceneHasResonance(sceneTexts.get(r.sceneIdx) ?? '', expandedKeywords)).length;
      const restResonant374 = restRecs374.filter((r: any) => sceneHasResonance(sceneTexts.get(r.sceneIdx) ?? '', expandedKeywords)).length;
      if (act1Recs374.length >= 2 && restResonant374 >= 2) {
        const act1Density374 = act1Resonant374 / act1Recs374.length;
        const restDensity374 = restResonant374 / restRecs374.length;
        if (act1Density374 < restDensity374 * 0.5) {
          issues.push({
            location: `Act 1 (Scenes 0–${act1End374 - 1}) — thematic density drop`,
            rule: 'THEME_ACT1_DENSITY_DROP',
            severity: 'minor',
            description: `Act 1 is ${Math.round(act1Density374 * 100)}% thematically resonant vs ${Math.round(restDensity374 * 100)}% across the rest of the story — the opening under-weights the theme relative to the body. The audience spends the setup with little sense of what "${themeRaw}" means to the story, so the through-line is established late and the early scenes don't frame the question the rest of the film will explore.`,
            suggestedFix: `Weave "${themeRaw}" into Act 1 at closer to the density of the later acts: an image, a line, or a choice in the opening that plants the thematic question. The theme the audience meets in the setup is the one they feel pay off in the climax — establish it early enough to matter.`,
          });
        }
      }
    }

    // THEME_CLOCK_PEAK_ABSENT (minor, n≥8, ≥2 clock scenes): The clock-raising scene
    // with the largest clockDelta is thematically silent, even though the theme appears
    // elsewhere. The story's most urgent deadline — the moment time pressure peaks — has
    // no thematic dimension, so the audience feels the clock without connecting it to what
    // the story is about. Distinct from THEME_CLOCK_SCENE_SILENT (which fires when ALL
    // clock scenes are silent — a set check); this isolates the single peak deadline.
    if (records.length >= 8) {
      const clockScenes374 = (records as any[]).filter(r => r.clockRaised === true);
      if (clockScenes374.length >= 2) {
        const peakClock374 = clockScenes374.reduce((best: any, r: any) =>
          (r.clockDelta ?? 0) > (best.clockDelta ?? 0) ? r : best, clockScenes374[0]);
        if (peakClock374 && !sceneHasResonance(sceneTexts.get(peakClock374.sceneIdx) ?? '', expandedKeywords)) {
          issues.push({
            location: `Scene ${peakClock374.sceneIdx} — peak deadline (clockDelta ${(peakClock374.clockDelta ?? 0).toFixed(2)})`,
            rule: 'THEME_CLOCK_PEAK_ABSENT',
            severity: 'minor',
            description: `The story's most urgent deadline (Scene ${peakClock374.sceneIdx}, clockDelta ${(peakClock374.clockDelta ?? 0).toFixed(2)}) carries no language related to "${themeRaw}", though the theme appears elsewhere. The moment time pressure peaks has no thematic dimension, so the audience feels the clock tightening without connecting the urgency to what the story is ultimately about — the deadline is mechanical rather than meaningful.`,
            suggestedFix: `Tie the peak deadline to "${themeRaw}": what thematic value is at stake when this clock runs out? When the most urgent moment of time pressure is also the moment the theme is most threatened, the ticking clock becomes unbearable because what it endangers is meaning, not just outcome.`,
          });
        }
      }
    }

    // THEME_CHARGED_SCENE_SILENT (minor, n≥8, ≥3 non-neutral scenes): No emotionally
    // charged scene (emotionalShift ≠ 'neutral') carries the theme, even though the theme
    // appears elsewhere. The story's feeling and its meaning never coincide — emotion lands
    // in thematically blank scenes and theme lands in emotionally flat ones. Distinct from
    // THEME_POSITIVE_SHIFT_SILENT and THEME_NEGATIVE_SHIFT_SILENT (each audits a single
    // polarity at a ≥2 threshold): this fires across both polarities together, catching
    // stories where charged scenes exist but neither polarity alone meets its threshold.
    if (records.length >= 8) {
      const chargedScenes374 = (records as any[]).filter(r => r.emotionalShift && r.emotionalShift !== 'neutral');
      if (chargedScenes374.length >= 3 && !chargedScenes374.some((r: any) => sceneHasResonance(sceneTexts.get(r.sceneIdx) ?? '', expandedKeywords))) {
        issues.push({
          location: `${chargedScenes374.length} emotionally charged scene(s) — thematically silent`,
          rule: 'THEME_CHARGED_SCENE_SILENT',
          severity: 'minor',
          description: `None of the ${chargedScenes374.length} emotionally charged scenes carries language related to "${themeRaw}", though the theme appears elsewhere — the story's feeling and its meaning never coincide. Emotion lands in thematically blank scenes and the theme surfaces only in emotionally flat ones, so the audience never feels the theme and thinks about it in the same beat.`,
          suggestedFix: `Fuse emotion and theme: let at least one charged scene also carry "${themeRaw}", so the moment the audience feels something is the moment the thematic question is most alive. Theme that is felt rather than merely stated is the difference between a story that means something and one that says it does.`,
        });
      }
    }

    // ── Wave 388: THEME_MIDPOINT_DENSITY_DROP, THEME_OPENING_IMAGE_SILENT, THEME_PROACTIVE_DECOUPLED ──

    // THEME_MIDPOINT_DENSITY_DROP (minor, n≥12, ≥2 midpoint scenes): The midpoint zone
    // (40%–60%) is less than half as thematically dense as the story overall — theme thins
    // sharply at the structural pivot, the moment a strong midpoint should be restating the
    // central question with new force. Distinct from THEME_MIDPOINT_SILENT (a binary ±1-scene
    // window with NO theme at all) — this fires even when the midpoint carries some theme but
    // far less than the body — and from THEME_ACT2B_DENSITY_DROP (2a-vs-2b trajectory).
    if (records.length >= 12) {
      const midS388 = Math.floor(records.length * 0.4);
      const midE388 = Math.floor(records.length * 0.6);
      const midRecs388 = (records as any[]).slice(midS388, midE388);
      const overallResonant388 = (records as any[]).filter((r: any) => sceneHasResonance(sceneTexts.get(r.sceneIdx) ?? '', expandedKeywords)).length;
      if (midRecs388.length >= 2 && overallResonant388 >= 2) {
        const midResonant388 = midRecs388.filter((r: any) => sceneHasResonance(sceneTexts.get(r.sceneIdx) ?? '', expandedKeywords)).length;
        const midDensity388 = midResonant388 / midRecs388.length;
        const overallDensity388 = overallResonant388 / records.length;
        if (midDensity388 < overallDensity388 * 0.5) {
          issues.push({
            location: `Midpoint (Scenes ${midS388}–${midE388 - 1}) — thematic density drop`,
            rule: 'THEME_MIDPOINT_DENSITY_DROP',
            severity: 'minor',
            description: `The midpoint zone (Scenes ${midS388}–${midE388 - 1}) is ${Math.round(midDensity388 * 100)}% thematically resonant versus ${Math.round(overallDensity388 * 100)}% across the story — theme thins sharply at the structural pivot. The midpoint is where a strong story restates "${themeRaw}" with new force as the central question is reframed; a density drop there means the pivot turns the plot without deepening the meaning.`,
            suggestedFix: `Bring the theme back at the midpoint: the reframing turn should make "${themeRaw}" newly urgent — a revelation that recasts the thematic question, a choice that tests it under new terms. The center of the story is exactly where the theme should intensify, not recede.`,
          });
        }
      }
    }

    // THEME_OPENING_IMAGE_SILENT (minor, n≥6, expandedKeywords≥2): The very first scene
    // carries no thematic language, though the theme appears later. The opening image is a
    // privileged thematic slot — it frames how the audience reads everything that follows —
    // and squandering it means the story's first impression is disconnected from its meaning.
    // The bookend mirror of THEME_FINAL_SCENE_SILENT (the last scene); distinct from THEME_
    // OPENING_SILENT (the first three scenes ALL silent — this fires even when scenes 2–3
    // carry theme but the opening image itself does not).
    if (records.length >= 6 && expandedKeywords.length >= 2) {
      const firstRec388 = (records as any[])[0];
      const laterResonant388 = (records as any[]).slice(1).some((r: any) => sceneHasResonance(sceneTexts.get(r.sceneIdx) ?? '', expandedKeywords));
      if (firstRec388 && laterResonant388 && !sceneHasResonance(sceneTexts.get(firstRec388.sceneIdx) ?? '', expandedKeywords)) {
        issues.push({
          location: `Scene ${firstRec388.sceneIdx} — opening image`,
          rule: 'THEME_OPENING_IMAGE_SILENT',
          severity: 'minor',
          description: `The story's opening image (Scene ${firstRec388.sceneIdx}) carries no language related to "${themeRaw}", though the theme surfaces later. The first scene is a privileged thematic slot — it frames how the audience reads everything that follows — and an opening disconnected from the theme means the story's first impression sets up a different question than the one it ultimately answers.`,
          suggestedFix: `Plant "${themeRaw}" in the opening image: a detail, a choice, or a visual that quietly poses the thematic question from the very first beat. The image the audience meets first is the lens they watch the rest of the film through — make it carry the meaning.`,
        });
      }
    }

    // THEME_PROACTIVE_DECOUPLED (minor, n≥8, ≥3 proactive scenes): Every scene in which
    // the protagonist takes initiative (raises a clock or plants a clue) carries no theme.
    // The protagonist's agency and the story's meaning never coincide — the character drives
    // the plot in thematically blank scenes, so what they do is never about what the story is
    // about. Distinct from THEME_CLUE_DECOUPLED (clue-planting scenes only) and THEME_CLOCK_
    // SCENE_SILENT (clock scenes only): this fires across the combined proactive set, catching
    // stories where neither subgroup alone meets its threshold but agency-as-a-whole is silent.
    if (records.length >= 8) {
      const proactiveScenes388 = (records as any[]).filter((r: any) => r.clockRaised === true || ((r.seededClueIds ?? []) as any[]).length > 0);
      if (proactiveScenes388.length >= 3 && !proactiveScenes388.some((r: any) => sceneHasResonance(sceneTexts.get(r.sceneIdx) ?? '', expandedKeywords))) {
        issues.push({
          location: `${proactiveScenes388.length} proactive scene(s) — thematically silent`,
          rule: 'THEME_PROACTIVE_DECOUPLED',
          severity: 'minor',
          description: `None of the ${proactiveScenes388.length} scenes where the protagonist takes initiative — raising a clock or planting a clue — carries language related to "${themeRaw}". The protagonist's agency and the story's meaning never coincide: the character drives the plot in thematically blank scenes, so what they actively do is never about what the story is ultimately exploring.`,
          suggestedFix: `Tie the protagonist's initiative to "${themeRaw}": the choices they make to drive the plot should be the choices that test the theme. When agency and meaning coincide, the audience reads the protagonist's actions as an argument about the theme, not just moves that advance the plot.`,
        });
      }
    }

    // ── Wave 402: THEME_ACT2A_DENSITY_DROP, THEME_SEED_PEAK_ABSENT, THEME_PAYOFF_PEAK_ABSENT ──

    // THEME_ACT2A_DENSITY_DROP (minor, n≥12, ≥3 Act 2a scenes, overall resonance≥2):
    // Act 2a (25%–50%) is less than half as thematically dense as the story overall —
    // theme thins in the entry to the conflict zone. Act 2a is where the protagonist
    // first engages the central struggle; if the theme is absent here, the conflict
    // opens as plot mechanics rather than as a dramatization of the story's meaning.
    // Completes the zone density set alongside THEME_ACT1_DENSITY_DROP,
    // THEME_MIDPOINT_DENSITY_DROP, THEME_ACT2B_DENSITY_DROP, and THEME_ACT3_DENSITY_DROP.
    // Distinct from THEME_ACT2_DESERT (Act 2 as a whole < 30% resonant — a binary
    // all-of-Act-2 check) and THEME_ACT2B_DENSITY_DROP (2a-vs-2b trajectory — this
    // fires when Act 2a itself is under-themed relative to the whole story).
    if (records.length >= 12) {
      const a2aStart402 = Math.floor(records.length * 0.25);
      const a2aEnd402 = Math.floor(records.length * 0.5);
      const a2aRecs402 = records.slice(a2aStart402, a2aEnd402);
      const overallResonant402 = (records as any[]).filter(
        r => sceneHasResonance(sceneTexts.get(r.sceneIdx) ?? '', expandedKeywords),
      ).length;
      if (a2aRecs402.length >= 3 && overallResonant402 >= 2) {
        const a2aResonant402 = a2aRecs402.filter(
          r => sceneHasResonance(sceneTexts.get(r.sceneIdx) ?? '', expandedKeywords),
        ).length;
        const a2aDensity402 = a2aResonant402 / a2aRecs402.length;
        const overallDensity402 = overallResonant402 / records.length;
        if (a2aDensity402 < overallDensity402 * 0.5) {
          issues.push({
            location: `Act 2a (Scenes ${a2aStart402}–${a2aEnd402 - 1}) — thematic density drop`,
            rule: 'THEME_ACT2A_DENSITY_DROP',
            severity: 'minor',
            description: `Act 2a (Scenes ${a2aStart402}–${a2aEnd402 - 1}) is ${Math.round(a2aDensity402 * 100)}% thematically resonant versus ${Math.round(overallDensity402 * 100)}% across the story — the theme thins precisely as the protagonist enters the central conflict. Act 2a is where the struggle opens and the audience's investment in the theme should deepen; a density drop here means the conflict is engaged as pure plot mechanics with "${themeRaw}" absent from the scenes that should first test it.`,
            suggestedFix: `Bring the theme into the early conflict: as the protagonist first engages the central struggle, let the scenes echo "${themeRaw}" — through a character's observation, a choice that embodies the theme's tension, or an image that reframes the conflict in thematic terms. The entry into Act 2 is where the audience learns that the story is about something, not just about someone.`,
          });
        }
      }
    }

    // THEME_SEED_PEAK_ABSENT (minor, n≥8, totalHits≥3, ≥2 seed scenes, ≥1 resonant seed):
    // The scene that plants the most clues (highest seededClueIds.length) carries no
    // thematic resonance, even though other seed scenes do carry the theme. This specific
    // scene — the story's densest foreshadowing moment — is thematically mute. Seeding
    // clues and raising thematic questions should be the same gesture: the evidence the
    // protagonist or audience collects should feel meaningful in thematic terms, not just
    // as plot mechanics. Single-peak mode × seededClueIds × theme. Distinct from
    // THEME_CLUE_DECOUPLED (ALL seed scenes silent — this fires when the peak is silent
    // even though other seed scenes carry theme) and THEME_PAYOFF_PEAK_ABSENT (same mode
    // applied to the payoff side of the seed/payoff channel pair).
    if (records.length >= 8 && totalHits >= 3) {
      const seedRecs402b = (records as any[]).filter(
        r => ((r.seededClueIds ?? []) as any[]).length > 0,
      );
      if (seedRecs402b.length >= 2) {
        const anySeedResonant402b = seedRecs402b.some(
          r => sceneHasResonance(sceneTexts.get(r.sceneIdx) ?? '', expandedKeywords),
        );
        if (anySeedResonant402b) {
          const peakSeedCount402b = Math.max(...seedRecs402b.map(r => ((r.seededClueIds ?? []) as any[]).length));
          const peakSeedRec402b = seedRecs402b.find(
            r => ((r.seededClueIds ?? []) as any[]).length === peakSeedCount402b,
          );
          if (peakSeedRec402b && !sceneHasResonance(sceneTexts.get(peakSeedRec402b.sceneIdx) ?? '', expandedKeywords)) {
            issues.push({
              location: `Scene ${peakSeedRec402b.sceneIdx} (peak clue-planting: ${peakSeedCount402b} seed(s))`,
              rule: 'THEME_SEED_PEAK_ABSENT',
              severity: 'minor',
              description: `The scene that plants the most clues (Scene ${peakSeedRec402b.sceneIdx}, ${peakSeedCount402b} seed(s)) carries no language related to "${themeRaw}", though other seed scenes do carry the theme. The densest foreshadowing moment is thematically mute — the story plants evidence as a plot mechanic without the scene being about "${themeRaw}". The clues the audience will be asked to remember should feel thematically significant when they are planted.`,
              suggestedFix: `Let the story's richest clue-planting scene also carry "${themeRaw}": the evidence being planted should feel dangerous or revealing in thematic terms, not just mechanically important. When a seed and a thematic note land in the same scene, the payoff that resolves the clue also resolves the thematic question — the most satisfying form of closure.`,
            });
          }
        }
      }
    }

    // THEME_PAYOFF_PEAK_ABSENT (minor, n≥8, totalHits≥3, ≥2 payoff scenes, ≥1 resonant):
    // The scene that resolves the most narrative setups (highest payoffSetupIds.length)
    // carries no thematic resonance, while other payoff scenes do. The story's densest
    // resolution moment — where the audience experiences the largest return on its
    // narrative investment — is thematically mute. A payoff that settles the biggest thread
    // without any language of the theme collapses a structural catharsis into a mere plot
    // event. Single-peak mode × payoffSetupIds × theme. Distinct from THEME_PAYOFF_SILENT
    // (all payoff scenes silent) and THEME_SEED_PEAK_ABSENT (seed side of same channel pair).
    if (records.length >= 8 && totalHits >= 3) {
      const payoffRecs402c = (records as any[]).filter(
        r => ((r.payoffSetupIds ?? []) as any[]).length > 0,
      );
      if (payoffRecs402c.length >= 2) {
        const anyPayoffResonant402c = payoffRecs402c.some(
          r => sceneHasResonance(sceneTexts.get(r.sceneIdx) ?? '', expandedKeywords),
        );
        if (anyPayoffResonant402c) {
          const peakPayoffCount402c = Math.max(...payoffRecs402c.map(r => ((r.payoffSetupIds ?? []) as any[]).length));
          const peakPayoffRec402c = payoffRecs402c.find(
            r => ((r.payoffSetupIds ?? []) as any[]).length === peakPayoffCount402c,
          );
          if (peakPayoffRec402c && !sceneHasResonance(sceneTexts.get(peakPayoffRec402c.sceneIdx) ?? '', expandedKeywords)) {
            issues.push({
              location: `Scene ${peakPayoffRec402c.sceneIdx} (peak payoff: ${peakPayoffCount402c} setup(s) resolved)`,
              rule: 'THEME_PAYOFF_PEAK_ABSENT',
              severity: 'minor',
              description: `The scene that resolves the most setups (Scene ${peakPayoffRec402c.sceneIdx}, ${peakPayoffCount402c} payoff(s)) carries no language related to "${themeRaw}", though other payoff scenes do. The story's densest resolution moment — where the audience receives the largest return on its narrative investment — is thematically mute. The most important convergence of threads lands without any echo of what the story is ultimately about.`,
              suggestedFix: `Infuse the peak payoff scene with "${themeRaw}": the resolution of the story's most important threads should make the audience feel the theme being answered, not just the plot being closed. A payoff that resolves a setup AND speaks to the theme produces the deepest catharsis — the story closes two loops at once.`,
            });
          }
        }
      }
    }

    // ── Wave 416: THEME_RESONANT_SINGLETON_RUN, THEME_PEAK_SUSPENSE_AFTERMATH_SILENT, THEME_DUAL_RISE_DECOUPLED ──

    // THEME_RESONANT_SINGLETON_RUN (minor, n≥10, ≥4 resonant scenes): The longest
    // consecutive run of thematically resonant scenes is exactly 1 — the theme never
    // builds momentum across two adjacent scenes. Every resonant scene is an isolated
    // island surrounded by theme-silent scenes; the theme fires in disconnected beats
    // rather than flowing as a continuous through-line. A theme that never accumulates
    // across consecutive scenes feels like episodic punctuation rather than a woven
    // undercurrent — the audience registers it as interruption, not architecture.
    // Run-based mode × resonance sequence. Distinct from THEME_CONSECUTIVE_RESONANT_
    // SURFEIT (Wave 208: fires when max run ≥5 — the opposite excess), and
    // THEME_SILENT_STRETCH (Wave 223: measures the longest SILENT run, not resonant).
    if (records.length >= 10 && resonantScenes.length >= 4) {
      let maxRun416a = 0;
      let curRun416a = 0;
      for (let i = 0; i < records.length; i++) {
        if (sceneHasResonance(sceneTexts.get(records[i].sceneIdx) ?? '', expandedKeywords)) {
          if (++curRun416a > maxRun416a) maxRun416a = curRun416a;
        } else {
          curRun416a = 0;
        }
      }
      if (maxRun416a <= 1) {
        issues.push({
          location: 'Thematic distribution — resonance never consecutive',
          rule: 'THEME_RESONANT_SINGLETON_RUN',
          severity: 'minor',
          description: `The theme "${themeRaw}" appears in ${resonantScenes.length} scenes but never in two consecutive scenes — every resonant moment is isolated by theme-silent scenes. A theme that fires only in disconnected beats never builds momentum; the audience experiences it as episodic punctuation rather than a continuous through-line that deepens as the story escalates.`,
          suggestedFix: `Let the theme accumulate across at least one pair of consecutive scenes: a scene that lands the theme should be followed by a scene that deepens or challenges it, so meaning builds rather than resets each time. Two adjacent resonant scenes create a thematic rhythm the audience can track and anticipate.`,
        });
      }
    }

    // THEME_PEAK_SUSPENSE_AFTERMATH_SILENT (minor, n≥8, ≥2 resonant scenes): The
    // scene immediately following the story's highest-suspense scene carries no
    // thematic language. The aftermath of maximum tension — the natural exhale and
    // reflection beat that follows the story's most charged moment — is thematically
    // mute. This is the most receptive moment in the story for meaning to land: the
    // audience is adrenaline-primed and looking for the point of what they just
    // experienced. Squandering it on thematically empty content wastes the story's
    // most powerful delivery window. Sequence/aftermath mode × peak suspenseDelta.
    // Distinct from THEME_SUSPENSE_PEAK_ABSENT (Wave 346: the peak scene ITSELF is
    // silent), THEME_SUSPENSE_RELEASE_SILENT (Wave 321: clockDelta<0 release beats),
    // and THEME_CLIMAX_SCENE_SILENT (Wave 174: peak-suspense scene in Act 3 only).
    if (records.length >= 8 && resonantScenes.length >= 2) {
      let peakSuspPos416b = 0;
      let peakSuspVal416b = records[0].suspenseDelta ?? 0;
      for (let i = 1; i < records.length; i++) {
        if ((records[i].suspenseDelta ?? 0) > peakSuspVal416b) {
          peakSuspVal416b = records[i].suspenseDelta ?? 0;
          peakSuspPos416b = i;
        }
      }
      if (peakSuspVal416b > 0 && peakSuspPos416b < records.length - 1) {
        const aftermathRec416b = records[peakSuspPos416b + 1];
        if (!sceneHasResonance(sceneTexts.get(aftermathRec416b.sceneIdx) ?? '', expandedKeywords)) {
          issues.push({
            location: `Scene ${aftermathRec416b.sceneIdx} (aftermath of peak-suspense Scene ${records[peakSuspPos416b].sceneIdx})`,
            rule: 'THEME_PEAK_SUSPENSE_AFTERMATH_SILENT',
            severity: 'minor',
            description: `The scene immediately following the story's highest-suspense moment (Scene ${records[peakSuspPos416b].sceneIdx}, suspenseDelta ${peakSuspVal416b.toFixed(1)}) carries no language related to "${themeRaw}". The aftermath of maximum tension is the story's most receptive delivery window for meaning — the audience is adrenaline-primed and looking for the point of what they just experienced — yet it is thematically blank.`,
            suggestedFix: `Give the aftermath scene thematic resonance: a character's first words or action after the peak tension should speak to "${themeRaw}" — crystallizing what the danger revealed about the story's central question or complicating the protagonist's relationship to it. The exhale beat is where meaning lands deepest because the audience's guard is down.`,
          });
        }
      }
    }

    // THEME_DUAL_RISE_DECOUPLED (minor, n≥8, ≥2 resonant scenes, ≥2 dual-rise
    // scenes): Every scene where BOTH suspenseDelta > 0 AND curiosityDelta > 0
    // simultaneously carries no thematic language. The moments of doubly energized
    // audience engagement — where tension and intrigue rise together — are always
    // thematically mute. When the story's most doubly engaged states never coincide
    // with theme, the audience never feels that "more at stake, more mysterious"
    // also means "more meaningful." Co-occurrence/decoupling mode × suspenseDelta
    // × curiosityDelta. Distinct from THEME_DUAL_PEAK_ABSENT (Wave 360: only the
    // single scene with the highest sum of both), THEME_SUSPENSE_CLUSTER_SILENT
    // (Wave 279: high suspense alone, threshold > 1), and THEME_CURIOSITY_DECOUPLED
    // (Wave 265: high curiosity alone, threshold > 1 — this fires at any positive
    // value when both channels rise together).
    if (records.length >= 8 && resonantScenes.length >= 2) {
      const dualRiseScenes416c = (records as any[]).filter(
        r => (r.suspenseDelta ?? 0) > 0 && (r.curiosityDelta ?? 0) > 0,
      );
      if (dualRiseScenes416c.length >= 2 &&
          !dualRiseScenes416c.some((r: any) =>
            sceneHasResonance(sceneTexts.get(r.sceneIdx) ?? '', expandedKeywords),
          )) {
        issues.push({
          location: `${dualRiseScenes416c.length} dual-rise scene(s) — simultaneous tension and curiosity increase, all thematically silent`,
          rule: 'THEME_DUAL_RISE_DECOUPLED',
          severity: 'minor',
          description: `All ${dualRiseScenes416c.length} scenes where both suspense and curiosity rise simultaneously carry no language related to "${themeRaw}". The story's doubly charged states — where the audience is both tense and intrigued at once — are always thematically empty. When maximum engagement never coincides with thematic meaning, the audience learns to separate "exciting and mysterious" from "what the story is about."`,
          suggestedFix: `Let at least one of the story's dual-rise moments carry "${themeRaw}": the scenes where tension and intrigue peak together are where the audience is most receptive to the meaning of what they're experiencing. A scene that is dangerous, mysterious, AND thematically resonant is the most memorable kind — the audience remembers what they felt AND what it meant.`,
        });
      }
    }

    // ── Wave 430: THEME_DRAMATIC_TURN_AFTERMATH_SILENT, THEME_PEAK_UNMOTIVATED, THEME_RESONANCE_EMOTIONALLY_LOPSIDED ──

    // THEME_DRAMATIC_TURN_AFTERMATH_SILENT (sequence/aftermath, n≥10, ≥2 qualifying
    // post-turn scenes): Every scene immediately following a dramatic pivot carries no
    // thematic language, even though theme appears elsewhere. A dramatic turn creates
    // a processing beat — the scene that follows is where the audience absorbs what the
    // reversal means. That aftermath is the story's second-most-receptive delivery
    // window for meaning (behind peak suspense), because the audience is reeling and
    // primed to ask "what does this change?" When every post-turn aftermath is blank,
    // the story never uses this reflective state to deepen the theme.
    // Distinctness: THEME_DRAMATIC_TURN_DECOUPLED (Wave 279) checks whether the
    // TURN SCENES THEMSELVES carry theme. This checks the scene AFTER each turn — a
    // different structural position. Distinct from THEME_PEAK_SUSPENSE_AFTERMATH_SILENT
    // (Wave 416: aftermath of the single highest-suspense scene, not of all turns).
    if (records.length >= 10 && resonantScenes.length >= 2) {
      const turnAftermathRecs430a: typeof records = [];
      for (let i430a = 0; i430a < records.length - 1; i430a++) {
        if ((records[i430a].dramaticTurn ?? 'nothing') !== 'nothing') {
          turnAftermathRecs430a.push(records[i430a + 1]);
        }
      }
      if (turnAftermathRecs430a.length >= 2 &&
          !turnAftermathRecs430a.some(r =>
            sceneHasResonance(sceneTexts.get(r.sceneIdx) ?? '', expandedKeywords),
          )) {
        issues.push({
          location: `${turnAftermathRecs430a.length} post-dramatic-turn scene(s) — thematically silent`,
          rule: 'THEME_DRAMATIC_TURN_AFTERMATH_SILENT',
          severity: 'minor',
          description: `The scene immediately following every dramatic turn (${turnAftermathRecs430a.length} aftermath scenes) carries no language related to "${themeRaw}", even though the theme appears elsewhere. Post-turn scenes are the story's most receptive delivery windows for meaning — the audience is reeling from a reversal and primed to ask what it means — yet every one is thematically blank. The processing beat after each pivot wastes its thematic potential.`,
          suggestedFix: `Let at least one scene following a dramatic turn carry "${themeRaw}": after a reversal, a character's first response should speak to the theme — a choice, an observation, or an image that frames what the pivot just cost or revealed in terms of the story's central question. The beat after the turn is where meaning settles.`,
        });
      }
    }

    // THEME_PEAK_UNMOTIVATED (backward-cause, n≥10, peakHits≥3, totalHits≥6):
    // The scene with the highest theme keyword density — the story's thematic peak —
    // arrives without any structural catalyst in the two scenes preceding it.
    // Looking backward from the peak: neither of the two prior scenes contains a
    // revelation, dramatic turn, clock-raised signal, or high suspense (>1). The
    // thematic peak appears to surface at random rather than as a consequence of
    // rising dramatic energy. A well-crafted thematic peak should be triggered by
    // something that opens the audience emotionally before the meaning lands hardest.
    // Distinctness: THEME_PEAK_BEFORE_MIDPOINT (Wave 321) audits WHERE the peak
    // lands (position), not WHY it's there (backward cause). The single-peak
    // isolation checks (THEME_SUSPENSE_PEAK_ABSENT, THEME_CURIOSITY_PEAK_ABSENT,
    // etc.) compare the peak scene to others — this is the only check that looks
    // backward from the peak to audit its narrative justification.
    if (records.length >= 10 && totalHits >= 6) {
      let peakPos430b = -1;
      let peakHits430b = 0;
      for (let i430b = 0; i430b < records.length; i430b++) {
        const h430b = sceneHitCounts.get(records[i430b].sceneIdx) ?? 0;
        if (h430b > peakHits430b) { peakHits430b = h430b; peakPos430b = i430b; }
      }
      const isCatalyst430b = (r: typeof records[0]) =>
        r.revelation !== null ||
        (r.dramaticTurn ?? 'nothing') !== 'nothing' ||
        r.clockRaised === true ||
        (r.suspenseDelta ?? 0) > 1;
      if (peakPos430b >= 2 && peakHits430b >= 3) {
        const prior1_430b = records[peakPos430b - 1];
        const prior2_430b = records[peakPos430b - 2];
        if (!isCatalyst430b(prior1_430b) && !isCatalyst430b(prior2_430b)) {
          issues.push({
            location: `Scene ${records[peakPos430b].sceneIdx} — thematic peak (${peakHits430b} keyword hits)`,
            rule: 'THEME_PEAK_UNMOTIVATED',
            severity: 'minor',
            description: `The story's thematic peak — Scene ${records[peakPos430b].sceneIdx} with ${peakHits430b} theme keyword hits for "${themeRaw}" — arrives without any structural catalyst in the two preceding scenes (no revelation, dramatic turn, clock-raised, or high suspense). The most concentrated thematic statement in the story surfaces without narrative preparation; there is no dramatic cause to explain why the theme peaks here. An unmotivated thematic peak reads as a thesis paragraph accidentally placed in the script rather than earned by what precedes it.`,
            suggestedFix: `Motivate the thematic peak: let the scene before (or two before) the densest theme moment carry a revelation, a turn, or a spike in suspense that opens the audience emotionally before the meaning lands at full force. The thematic peak must be earned — the audience needs to be primed by rising dramatic energy before the theme can land at its hardest. Move the peak, or add a catalyst that justifies its position.`,
          });
        }
      }
    }

    // THEME_RESONANCE_EMOTIONALLY_LOPSIDED (valence, n≥8, ≥4 charged resonant
    // scenes): The emotionally charged resonant scenes — those carrying both a
    // non-neutral emotional shift and thematic language — are ≥3:1 skewed toward
    // one polarity. The theme speaks overwhelmingly in one emotional register,
    // leaving it unable to articulate the opposite face of its tension. A theme
    // confined to positive moments cannot show what it costs to fail; a theme
    // confined to negative moments cannot show what it looks like to succeed. Both
    // extremes collapse the theme's range to a single emotional note, denying the
    // audience the full dialectical picture.
    // Distinctness: THEME_NO_DIALECTIC (Wave 148) is a binary check firing when NO
    // resonant scene at all carries a negative charge — it fires even at 0 negative
    // scenes, regardless of ratio. This valence check fires at the RATIO of charged
    // resonant scenes (≥3:1), catching imbalance even when both polarities appear
    // but one dominates. THEME_POSITIVE_SHIFT_SILENT / THEME_NEGATIVE_SHIFT_SILENT
    // (Waves 251/279) check whether scenes of a given polarity carry theme at all —
    // the inverse direction. This checks whether the RESONANT SET ITSELF is emotionally
    // one-sided, an entirely different population and question.
    if (records.length >= 8 && resonantScenes.length >= 4) {
      const chargedResonant430c = resonantScenes.filter((r: any) => r.emotionalShift !== 'neutral');
      if (chargedResonant430c.length >= 4) {
        const posCount430c = chargedResonant430c.filter((r: any) => r.emotionalShift === 'positive').length;
        const negCount430c = chargedResonant430c.length - posCount430c;
        const minCount430c = Math.min(posCount430c, negCount430c);
        const maxCount430c = Math.max(posCount430c, negCount430c);
        const lopsided430c = minCount430c === 0
          ? maxCount430c >= 4
          : maxCount430c >= minCount430c * 3;
        if (lopsided430c) {
          const dominant430c = posCount430c > negCount430c ? 'positive' : 'negative';
          const minority430c = posCount430c > negCount430c ? 'negative' : 'positive';
          issues.push({
            location: 'Emotionally charged resonant scenes',
            rule: 'THEME_RESONANCE_EMOTIONALLY_LOPSIDED',
            severity: 'minor',
            description: `Of ${chargedResonant430c.length} emotionally charged scenes that carry the theme "${themeRaw}", ${maxCount430c} are ${dominant430c} and only ${minCount430c} are ${minority430c} — the theme speaks overwhelmingly in one emotional register. A theme present only in ${dominant430c} moments can only articulate one pole of its tension and never shows what "${themeRaw}" looks like when experienced in ${minority430c} terms. The audience receives a one-note picture of what the theme means.`,
            suggestedFix: `Balance the emotional register of the theme: let "${themeRaw}" appear in both ${dominant430c} and ${minority430c} moments — in scenes of both gain and loss. A thematically resonant ${minority430c} scene shows what the theme means in its opposite emotional register; the dialectic of the theme lives in both polarities. Write at least one scene where the theme is felt in a ${minority430c} emotional context.`,
          });
        }
      }
    }

    // THEME_RESONANT_CLUSTER_FLOOD (run-based, n≥10, ≥4 resonant scenes, maxConsecutiveRun≥4):
    // Four or more consecutive scenes all carry thematic language — a local echo-chamber plateau
    // where theme becomes a relentless drumbeat rather than an accent. Resonance lands hardest when
    // it punctuates inert scenes; when every scene in a run carries the theme, each occurrence
    // dilutes the next. A cluster of 4+ consecutive resonant scenes loses the contrast that makes
    // individual resonant moments feel meaningful.
    // Distinctness: THEME_RESONANT_SINGLETON_RUN (Wave 416) fires when ALL resonant scenes are
    // isolated (max consecutive run = 1) — the opposite extreme. THEME_CRAFT fires on high GLOBAL
    // DENSITY (>40% of all scenes). THEME_RESONANCE_BURST (Wave 307) fires when ONE SCENE holds
    // >50% of keyword hits — a single-scene check. This fires when a consecutive RUN OF SCENES
    // is thematically dense, a spatial clustering test distinct from all proportion, isolation,
    // and single-scene-peak checks.
    if (records.length >= 10 && resonantScenes.length >= 4) {
      let maxResRun444a = 0;
      let maxResRunStart444a = -1;
      let curResRun444a = 0;
      let curResRunStart444a = 0;
      for (let i444a = 0; i444a < records.length; i444a++) {
        const isRes444a = sceneHasResonance(sceneTexts.get(records[i444a].sceneIdx) ?? '', expandedKeywords);
        if (isRes444a) {
          if (curResRun444a === 0) curResRunStart444a = i444a;
          if (++curResRun444a > maxResRun444a) {
            maxResRun444a = curResRun444a;
            maxResRunStart444a = curResRunStart444a;
          }
        } else {
          curResRun444a = 0;
        }
      }
      if (maxResRun444a >= 4 && resonantScenes.length < records.length) {
        issues.push({
          location: `Scenes ${maxResRunStart444a}–${maxResRunStart444a + maxResRun444a - 1} — consecutive resonant cluster (${maxResRun444a} scenes)`,
          rule: 'THEME_RESONANT_CLUSTER_FLOOD',
          severity: 'minor',
          description: `${maxResRun444a} consecutive scenes all carry language related to "${themeRaw}" — a local echo-chamber where theme becomes a relentless drumbeat rather than an accent. Thematic resonance lands hardest when it punctuates scenes that don't carry it; when every scene in a run speaks the theme, each occurrence dilutes the next. The contrast that makes individual resonant moments meaningful disappears when ${maxResRun444a} consecutive scenes all announce the same message.`,
          suggestedFix: `Break the consecutive resonant cluster (Scenes ${maxResRunStart444a}–${maxResRunStart444a + maxResRun444a - 1}) by letting at least one or two scenes advance plot or character without explicitly carrying "${themeRaw}". The silence will make the next resonant scene land harder. Thematic meaning comes from pattern; patterns need variation to register as patterns.`,
        });
      }
    }

    // THEME_LONG_SILENT_STRETCH (distribution/timing, n≥12, ≥2 resonant scenes, maxGap≥5):
    // The longest consecutive stretch of non-resonant scenes anywhere in the story — including
    // the stretch before the first resonant scene and after the last — is ≥5 scenes. A gap of
    // 5+ consecutive inert scenes is long enough for the audience to lose the thematic thread.
    // Distinct from zone checks which flag entire structural zones: this fires on the SINGLE
    // WORST GAP regardless of zone boundaries, catching gaps that straddle zones or sit inside
    // nominally themed zones.
    // Distinctness: THEME_RESONANCE_GAP fires when >40% of ALL scenes are inert (global proportion).
    // Zone checks (THEME_ACT2_DESERT, THEME_CLOSING_QUARTER_SILENT, etc.) audit fixed structural
    // zones. This is a distribution/timing check that identifies the single worst gap — it catches
    // long thematic silences that zone and proportion checks miss when the silence straddles zones
    // or sits inside an otherwise-resonant zone.
    if (records.length >= 12 && resonantScenes.length >= 2) {
      const resIdx444b: number[] = records
        .map((r: any, i: number) => ({ i, res: sceneHasResonance(sceneTexts.get(r.sceneIdx) ?? '', expandedKeywords) }))
        .filter((x: any) => x.res)
        .map((x: any) => x.i as number);
      let maxGap444b = 0;
      if (resIdx444b.length > 0) {
        maxGap444b = Math.max(maxGap444b, resIdx444b[0]);
        for (let g = 1; g < resIdx444b.length; g++) {
          maxGap444b = Math.max(maxGap444b, resIdx444b[g] - resIdx444b[g - 1] - 1);
        }
        maxGap444b = Math.max(maxGap444b, records.length - 1 - resIdx444b[resIdx444b.length - 1]);
      }
      if (maxGap444b >= 5) {
        issues.push({
          location: `Longest thematic silence — ${maxGap444b} consecutive non-resonant scenes`,
          rule: 'THEME_LONG_SILENT_STRETCH',
          severity: 'minor',
          description: `Somewhere in the story, ${maxGap444b} consecutive scenes carry no language related to "${themeRaw}" — long enough for the audience to lose the thematic thread. While individual inert scenes are healthy, a gap of 5 or more creates a portion of the story where the central meaning disappears from view. This gap may sit inside a nominally themed zone or straddle zone boundaries, which is why zone checks may not catch it.`,
          suggestedFix: `Find the longest gap (${maxGap444b} consecutive scenes without "${themeRaw}") and plant one or two thematic anchors within it — an image, a line of dialogue, or a character choice that briefly reconnects the action to the story's central question without stating it outright. The theme need not be argued; it only needs to be glimpsed.`,
        });
      }
    }

    // THEME_REVELATION_AFTERMATH_SILENT (sequence/aftermath, n≥10, ≥2 qualifying aftermaths):
    // Every scene immediately following a revelation (r.revelation is non-null and non-empty)
    // carries no thematic language, even though theme appears elsewhere. A revelation is the story's
    // disclosure moment — the scene after it is when the audience first processes what the truth means.
    // That processing beat is the most receptive window for thematic delivery because the audience is
    // actively recontextualising everything they know. When post-revelation scenes are all thematically
    // silent, the story's meaning-making never aligns with its information-delivery.
    // Distinctness: THEME_REVELATION_DECOUPLED (Wave 293) fires when REVELATION SCENES THEMSELVES
    // carry no theme (a different structural position). THEME_DRAMATIC_TURN_AFTERMATH_SILENT (Wave 430)
    // checks aftermath of dramatic TURNS (r.dramaticTurn ≠ 'nothing'), a different structural event from
    // revelations (disclosed information vs reversal of direction). This is the first aftermath check
    // anchored specifically to the revelation channel.
    if (records.length >= 10 && resonantScenes.length >= 2) {
      const revAftermaths444c: typeof records = [];
      for (let i444c = 0; i444c < records.length - 1; i444c++) {
        const rev444c = records[i444c].revelation;
        if (rev444c != null && rev444c !== '') {
          revAftermaths444c.push(records[i444c + 1]);
        }
      }
      if (revAftermaths444c.length >= 2 &&
          !revAftermaths444c.some((r: any) =>
            sceneHasResonance(sceneTexts.get(r.sceneIdx) ?? '', expandedKeywords),
          )) {
        issues.push({
          location: `${revAftermaths444c.length} post-revelation scene(s) — thematically silent`,
          rule: 'THEME_REVELATION_AFTERMATH_SILENT',
          severity: 'minor',
          description: `The scene immediately following every revelation (${revAftermaths444c.length} aftermath scene(s)) carries no language related to "${themeRaw}", even though the theme appears elsewhere. Post-revelation scenes are the most receptive windows for thematic delivery: the audience is actively recontextualising everything they know, primed to understand not just what happened but what it means. When every disclosure is followed by a thematically blank scene, the story's meaning-making never aligns with its information-delivery.`,
          suggestedFix: `Let at least one scene following a revelation carry "${themeRaw}": after a truth is disclosed, the next scene's reaction — a character's choice, an image, a line of dialogue — should briefly reflect what this revelation means in terms of the story's central question. The processing beat after a disclosure is the most powerful moment to make the audience feel not just the fact but its significance.`,
        });
      }
    }

    // ── Wave 458: THEME_RELATIONSHIP_DECOUPLED, THEME_CLOCK_AFTERMATH_SILENT, THEME_ALL_RESONANCE_CAUSELESS ──

    // THEME_RELATIONSHIP_DECOUPLED (co-occurrence/decoupling × relationship shift channel, n≥8,
    // ≥2 relationship-shift scenes): Every scene with non-empty `relationshipShifts` is thematically
    // silent — bonds never move in the same beat where the theme is voiced. Relationship dynamics
    // and thematic meaning operate on entirely separate tracks: the story explores its central question
    // in some scenes and evolves its bonds in others, but the two never coincide. The most powerful
    // scenes combine dramatic relationship movement with thematic resonance — a bond shift that also
    // embodies or challenges the story's central question makes both the relationship and the theme
    // feel necessary to each other. Co-occurrence mode × relationship shift channel.
    // Distinct from all existing decoupled checks (THEME_CLUE_SCENES_DECOUPLED, THEME_CURIOSITY_
    // SCENES_DECOUPLED, THEME_PAYOFF_SCENES_DECOUPLED, THEME_DRAMATIC_TURN_DECOUPLED, THEME_NEGATIVE_
    // EMOTION_DECOUPLED, THEME_SUSPENSE_SCENES_DECOUPLED, THEME_REVELATION_DECOUPLED, THEME_CLOCK_
    // SCENES_DECOUPLED — all in prior waves; this adds relationship shifts as a new co-occurrence
    // signal, completing the relational engine's place in the theme co-occurrence family).
    if (records.length >= 8 && resonantScenes.length >= 2) {
      const relShiftScenes458a = records.filter(r =>
        ((r.relationshipShifts ?? []) as any[]).length > 0,
      );
      if (relShiftScenes458a.length >= 2 &&
          !relShiftScenes458a.some(r =>
            sceneHasResonance(sceneTexts.get(r.sceneIdx) ?? '', expandedKeywords),
          )) {
        issues.push({
          location: `All ${relShiftScenes458a.length} relationship-shift scene(s) — thematically silent`,
          rule: 'THEME_RELATIONSHIP_DECOUPLED',
          severity: 'minor',
          description: `All ${relShiftScenes458a.length} scenes that move a character bond (non-empty relationshipShifts) carry no language related to "${themeRaw}", even though ${resonantScenes.length} scenes carry the theme elsewhere. The story's relational engine and its thematic voice operate on entirely separate tracks: bonds shift in thematically silent scenes, and theme resonates in relationally inert ones. The most powerful scenes in any story combine these two registers — a bond that shifts in a scene that also speaks the central question makes both the relationship and the theme feel inevitable to each other, as if the story could not have been told without that specific convergence.`,
          suggestedFix: `Give at least one relationship-shift scene a thematic dimension: let the dynamic between the characters embody the story's central question as it shifts — a reconciliation that dramatises "${themeRaw}", a rupture that challenges it, or a shift whose terms are framed by the theme's language. When a bond moves in a scene that also speaks the theme, the audience feels the meaning of the relationship and the meaning of the story simultaneously.`,
        });
      }
    }

    // THEME_CLOCK_AFTERMATH_SILENT (sequence/aftermath × clock → theme, n≥8, ≥2 qualifying
    // clock-raised scenes with 1+ scene after them): No clock-raised scene is immediately followed
    // by a scene carrying thematic resonance — every deadline passes without the next scene picking
    // up the thematic meaning of the pressure. Clock scenes are among the most attention-heightened
    // moments in a story: the audience is maximally alert when a countdown is running. The scene
    // immediately following a deadline beat is the most receptive window for thematic delivery —
    // the character just experienced maximum urgency, and the next scene can use that heightened
    // state to ask what the deadline meant in terms of the story's central question.
    // Distinct from THEME_CLOCK_RAISED_DECOUPLED (Wave 293: the clock scenes THEMSELVES carry no
    // theme — co-occurrence within the same scene; this checks the NEXT scene after the clock fires,
    // sequence/aftermath mode from a different structural position), and distinct from all other
    // aftermath checks (dramatic turn aftermath, revelation aftermath — those use a different trigger).
    if (records.length >= 8 && resonantScenes.length >= 2) {
      const qualClockIdxs458b: number[] = [];
      for (let i = 0; i < records.length - 1; i++) {
        if ((records[i].clockRaised ?? false) === true) qualClockIdxs458b.push(i);
      }
      if (qualClockIdxs458b.length >= 2) {
        const anyAftermathResonant458b = qualClockIdxs458b.some(idx => {
          const next = records[idx + 1];
          return next && sceneHasResonance(sceneTexts.get(next.sceneIdx) ?? '', expandedKeywords);
        });
        if (!anyAftermathResonant458b) {
          issues.push({
            location: `All ${qualClockIdxs458b.length} clock-raised scenes — thematically silent aftermath`,
            rule: 'THEME_CLOCK_AFTERMATH_SILENT',
            severity: 'minor',
            description: `None of the story's ${qualClockIdxs458b.length} clock-raised scenes is immediately followed by a scene with thematic resonance related to "${themeRaw}". Clock scenes maximise audience attention — when a deadline is running, every scene carries heightened alertness. The scene immediately following a deadline beat is the most receptive window for thematic delivery: what did the pressure of that countdown mean in terms of the story's central question? When every clock scene is followed by a thematically silent scene, the deadline machinery generates urgency without meaning — the audience feels the temporal pressure but is never given the thematic frame that would tell them what was at stake beyond the surface event.`,
            suggestedFix: `After at least one clock-raised scene, let the following scene pick up the theme of "${themeRaw}": a character reflects on what the deadline pressure revealed about themselves, or takes an action that embodies the story's central question under the urgency the deadline established. The scene after a deadline beat is when the meaning of the pressure can be crystallised most powerfully.`,
          });
        }
      }
    }

    // THEME_ALL_RESONANCE_CAUSELESS (backward-cause × all resonant scenes, n≥8, ≥3 resonant
    // scenes, every resonant scene lacks upstream cause in prior 2 scenes). Every scene that
    // carries thematic language is preceded in the two scenes before it by no revelation,
    // no dramatic turn, and no high suspense (suspenseDelta > 1). The story's thematic moments
    // consistently surface in narrative dead air — theme appears without any of the structural
    // triggers that most naturally motivate the audience to receive meaning: the relief after
    // danger, the processing of a disclosure, the shift of direction from a pivot.
    // Distinct from THEME_PEAK_UNMOTIVATED (Wave 430: backward-cause × the SINGLE DENSEST theme
    // scene only; this fires when ALL resonant scenes are systematically causeless — a structural
    // pattern, not an isolated peak), and from all sequence/aftermath checks (those look FORWARD
    // from triggers for theme; this looks BACKWARD from resonant scenes for triggers).
    if (records.length >= 8 && resonantScenes.length >= 3) {
      const hasCause458c = (idx: number): boolean => {
        for (let off = 1; off <= 2; off++) {
          const prevIdx = idx - off;
          if (prevIdx < 0) continue;
          const prev = records[prevIdx];
          if ((prev?.revelation ?? null) !== null && (prev?.revelation ?? '') !== '') return true;
          if ((prev?.dramaticTurn ?? 'nothing') !== 'nothing') return true;
          if ((prev?.suspenseDelta ?? 0) > 1) return true;
        }
        return false;
      };
      const resonantIdxs458c = resonantScenes.map(r => (records as any[]).indexOf(r));
      const allResCauseless458c = resonantIdxs458c.every(idx => idx >= 0 && !hasCause458c(idx));
      if (allResCauseless458c) {
        issues.push({
          location: `All ${resonantScenes.length} resonant scene(s) — no upstream narrative trigger`,
          rule: 'THEME_ALL_RESONANCE_CAUSELESS',
          severity: 'minor',
          description: `None of the story's ${resonantScenes.length} thematically resonant scenes for "${themeRaw}" is preceded in the prior two scenes by a revelation, a dramatic turn, or a high-suspense moment — theme consistently surfaces in narrative dead air. The most powerful thematic moments arrive when the audience is already primed to receive meaning: a revelation that raises a question the theme then answers, a dramatic turn that has the characters re-examine what they believe, or tension that has been released in the scene that follows. When every resonant scene arrives without any of these upstream triggers, the theme feels structurally optional — it could be moved to any scene and mean the same thing, because it is never the consequence of anything that happened just before.`,
          suggestedFix: `Before at least one resonant scene, plant a structural trigger in the prior two scenes: a revelation that makes the theme's central question land with specific urgency, a dramatic turn that forces the characters to grapple with what the story is about, or a suspense peak that the following thematic scene then reflects on. Theme that arrives as the consequence of something the audience just experienced feels earned rather than inserted.`,
        });
      }
    }

    // ── Wave 472: THEME_POSITIVE_EMOTION_DECOUPLED, THEME_RESONANT_VALENCE_UNIFORM, THEME_DIALOGUE_PEAK_SILENT ──

    // THEME_POSITIVE_EMOTION_DECOUPLED — Co-occurrence/decoupling × positive emotional shift
    // (n≥8, ≥2 positive-shift scenes, ≥2 resonant scenes, no positive scene is resonant).
    // All scenes with emotionalShift='positive' are thematically silent: warmth, triumph, and
    // relief never coincide with the story's central question. The theme only speaks during
    // neutral or dark moments, making it exclusively associated with gravity. When the audience
    // never hears the theme in a positive scene, they cannot experience the story's central
    // idea as something life-affirming or hopeful — it remains only a question that the script
    // asks in its darker or flatter register. Completes the emotional-shift channel in the
    // co-occurrence family alongside THEME_NEGATIVE_EMOTION_DECOUPLED (Wave 279: negative shift
    // channel).
    // Distinct from THEME_NEGATIVE_EMOTION_DECOUPLED (Wave 279: negative shift scenes carry no
    // theme; this is the positive polarity — orthogonal valence × co-occurrence check),
    // THEME_RESONANCE_EMOTIONALLY_LOPSIDED (Wave 430: fires when CHARGED resonant scenes have
    // 3:1 polarity skew; this fires when NO positive scene is EVER resonant, a zero-intersection
    // condition), all zone and sequence/aftermath checks.
    if (records.length >= 8 && resonantScenes.length >= 2) {
      const posScenes472a = records.filter(r => r.emotionalShift === 'positive');
      if (posScenes472a.length >= 2 &&
          !posScenes472a.some(r =>
            sceneHasResonance(sceneTexts.get(r.sceneIdx) ?? '', expandedKeywords),
          )) {
        issues.push({
          location: `All ${posScenes472a.length} positive-shift scene(s) — thematically silent`,
          rule: 'THEME_POSITIVE_EMOTION_DECOUPLED',
          severity: 'minor',
          description: `All ${posScenes472a.length} scenes with emotionalShift='positive' carry no language related to "${themeRaw}", while ${resonantScenes.length} scenes carry the theme in neutral or negative moments. The story voices its central question exclusively during gravity and flatness, never during warmth, triumph, or relief. When theme only appears in darker or inert scenes, the audience learns to associate the story's central idea with burden rather than with what is possible — the theme never gets to answer its own question in the emotional register where the answer would feel earned.`,
          suggestedFix: `Let at least one positive-emotional scene also carry thematic resonance: a triumph that dramatises what "${themeRaw}" looks like when it works, a moment of relief that names what was at stake. A theme that can speak in both joy and grief feels universal; one that only speaks in dark moments feels like a lesson rather than a truth.`,
        });
      }
    }

    // THEME_RESONANT_VALENCE_UNIFORM — Valence × within-resonant-set uniformity (resonantScenes
    // length ≥ 4, >80% of resonant scenes share the same emotionalShift register). The theme is
    // tonal-monotone: it is always voiced in one emotional key — always neutral, always positive,
    // or always negative. A theme voiced exclusively in one register narrows its reach; it can only
    // speak to the audience when they are in that particular emotional state. A theme that can land
    // in grief, in triumph, and in neutral reflection is structurally woven into the story at every
    // level; a theme confined to one register is structurally optional in the other two.
    // Distinct from THEME_RESONANCE_EMOTIONALLY_LOPSIDED (Wave 430: fires when CHARGED resonant
    // scenes are 3:1 skewed positive vs negative; requires ≥4 CHARGED resonant scenes and excludes
    // neutral — my check fires when all resonant are neutral with high suspense, where LOPSIDED's
    // guard fails), THEME_QUIET_SCENES_ONLY (Wave 307: fires when all resonant are neutral AND
    // suspenseDelta ≤ 1 — my check fires when all resonant are neutral with some high-suspense
    // scenes, where QUIET_SCENES_ONLY's guard fails), THEME_RESONANCE_EMOTIONALLY_INERT (Wave 223:
    // fires when all resonant are neutral AND suspenseDelta ≤ 0 — my check fires when all neutral
    // but some have suspenseDelta > 0, avoiding INERT's trigger).
    if (resonantScenes.length >= 4) {
      const posRes472b = resonantScenes.filter(r => r.emotionalShift === 'positive').length;
      const negRes472b = resonantScenes.filter(r => r.emotionalShift === 'negative').length;
      const neuRes472b = resonantScenes.filter(r => r.emotionalShift === 'neutral').length;
      const maxRes472b = Math.max(posRes472b, negRes472b, neuRes472b);
      if (maxRes472b / resonantScenes.length > 0.8) {
        const dominant472b = posRes472b === maxRes472b ? 'positive' : negRes472b === maxRes472b ? 'negative' : 'neutral';
        issues.push({
          location: `${resonantScenes.length} resonant scenes — ${dominant472b} emotional register (${maxRes472b}/${resonantScenes.length})`,
          rule: 'THEME_RESONANT_VALENCE_UNIFORM',
          severity: 'minor',
          description: `${maxRes472b} of ${resonantScenes.length} thematically resonant scenes (${Math.round(maxRes472b / resonantScenes.length * 100)}%) share the same emotional register ('${dominant472b}') — the theme is tonal-monotone. A theme voiced exclusively in one emotional key speaks only to the audience when they're in that state; it cannot reach them in the other emotional registers. The full power of a theme comes from its ability to surface in triumph, grief, and calm reflection alike — in different emotional keys, the same idea asks different questions and produces different insights.`,
          suggestedFix: `Distribute resonant scenes across at least two emotional registers: if the theme currently only speaks in '${dominant472b}' moments, give it at least one scene in the opposite register. A single resonant scene in a different emotional key (${'neutral' === dominant472b ? "'positive' or 'negative'" : "'neutral'"}) dramatically expands the theme's tonal range and prevents it from reading as tonally one-dimensional.`,
        });
      }
    }

    // THEME_DIALOGUE_PEAK_SILENT — Single-peak isolation × dialogue channel (n≥8, ≥2 resonant
    // scenes, scene with max dialogueHighlights count > 2 is thematically mute). The script's
    // most verbally active scene — the moment with the most dialogue highlights — carries no
    // thematic resonance for "${themeRaw}". Dialogue-rich scenes are where the story's verbal
    // register is highest: characters speak in longer, denser exchanges, and this scene is the
    // peak of that verbal density. When the verbal peak is thematically silent, the script's
    // most talkative moment is also its thematically emptiest — the most dialogue the story
    // produces has nothing to do with its central question. Fills the dialogue-channel cell
    // alongside THEME_SEED_PEAK_ABSENT (seededClueIds), THEME_PAYOFF_PEAK_ABSENT (payoffs),
    // THEME_CURIOSITY_PEAK_ABSENT (curiosityDelta), THEME_SUSPENSE_PEAK_ABSENT (suspenseDelta),
    // THEME_RELATIONSHIP_PEAK_ABSENT (relationshipShifts), THEME_CLOCK_PEAK_ABSENT (clockDelta).
    // Distinct from all co-occurrence/decoupling checks (those audit entire categories of scenes;
    // this isolates a single peak by dialogue count — a single-peak mode on a different metric),
    // THEME_RESONANCE_BURST (Wave 307: one scene has >50% of all keyword hits — a single-peak
    // check on keyword density; this checks the single peak of DIALOGUE VOLUME, not keyword hits).
    if (records.length >= 8 && resonantScenes.length >= 2) {
      const dlgCounts472c = records.map(r => ((r.dialogueHighlights ?? []) as string[]).length);
      const maxDlg472c = Math.max(...dlgCounts472c);
      if (maxDlg472c > 2) {
        const peakDlgIdx472c = dlgCounts472c.indexOf(maxDlg472c);
        const peakDlgScene472c = records[peakDlgIdx472c];
        const peakIsResonant472c = sceneHasResonance(
          sceneTexts.get(peakDlgScene472c.sceneIdx) ?? '',
          expandedKeywords,
        );
        if (!peakIsResonant472c) {
          issues.push({
            location: `Scene ${peakDlgScene472c.sceneIdx} (${peakDlgScene472c.slug}) — peak dialogue scene (${maxDlg472c} highlights) is thematically silent`,
            rule: 'THEME_DIALOGUE_PEAK_SILENT',
            severity: 'minor',
            description: `The scene with the most dialogue highlights (${maxDlg472c} at scene ${peakDlgScene472c.sceneIdx}) carries no language related to "${themeRaw}", though ${resonantScenes.length} other scenes carry the theme. The script's most verbally active moment — the scene where characters speak most — is thematically silent. Dialogue is the primary channel through which characters voice ideas, make choices, and reveal meaning; the scene with the most dialogue should be among the most likely to carry thematic weight. When the verbal peak is mute, the theme has been written around the story's main talking point.`,
            suggestedFix: `Give scene ${peakDlgScene472c.sceneIdx} at least one line of dialogue that touches "${themeRaw}": a character statement, question, or argument that invokes the theme directly or obliquely. The most dialogue-rich scene in the script is the most natural place for thematic language to appear — it's where characters are already speaking most fully, and thematic depth costs only one line.`,
          });
        }
      }
    }

    // ── Wave 486: POSITIVE_EMOTION_AFTERMATH_SILENT, FIRST_RESONANT_CAUSELESS, RESONANCE_THIRDS_CLUSTER ──

    // THEME_POSITIVE_EMOTION_AFTERMATH_SILENT — sequence/aftermath × positive emotion trigger → theme.
    // n≥8, ≥2 positive-shift scenes not at the last position. For every such scene, check whether the
    // immediately following scene is thematically resonant. If no positive-shift scene is followed by a
    // resonant scene, the post-uplift beat never picks up the theme — emotional highs and thematic meaning
    // are permanently decoupled across time rather than co-incident.
    // Distinctness: THEME_POSITIVE_EMOTION_DECOUPLED fires when the positive scene ITSELF is thematically
    // silent (co-occurrence check); this fires when the NEXT scene is silent (aftermath check). Different
    // temporal relationship — decoupling vs aftermath silence. Fills the aftermath × positive-emotion
    // channel alongside THEME_CLOCK_AFTERMATH_SILENT, THEME_REVELATION_AFTERMATH_SILENT,
    // THEME_DRAMATIC_TURN_AFTERMATH_SILENT, THEME_PEAK_SUSPENSE_AFTERMATH_SILENT.
    const n486a = records.length;
    if (n486a >= 8) {
      const posIdxs486a: number[] = [];
      for (let i486a = 0; i486a < n486a - 1; i486a++) {
        if (records[i486a].emotionalShift === 'positive') posIdxs486a.push(i486a);
      }
      if (posIdxs486a.length >= 2) {
        const anyPosAftermath486a = posIdxs486a.some(i486a => {
          const next486a = records[i486a + 1];
          return sceneHasResonance(sceneTexts.get(next486a.sceneIdx) ?? '', expandedKeywords);
        });
        if (!anyPosAftermath486a) {
          issues.push({
            location: `${posIdxs486a.length} positive-shift scenes — none followed by theme resonance`,
            rule: 'THEME_POSITIVE_EMOTION_AFTERMATH_SILENT',
            severity: 'minor',
            description: `The script has ${posIdxs486a.length} positive-emotion scenes, but not one is followed immediately by a scene that touches "${themeRaw}". Post-uplift beats are among the most natural moments for thematic reflection — characters have just experienced something hopeful or triumphant, and the next scene is primed to carry meaning. When every positive-shift moment passes without the theme entering the next beat, the story's emotional highs and its central idea remain permanently disconnected.`,
            suggestedFix: `After at least one positive-emotion scene, let the next scene voice or embody "${themeRaw}" — even a single image, line, or decision that connects the uplift to the story's central question. The moment after a positive turn is the most receptive audience state for thematic reinforcement.`,
          });
        }
      }
    }

    // THEME_FIRST_RESONANT_CAUSELESS — backward-cause × first resonant scene.
    // n≥6, first resonant scene at array pos≥2. Check whether either of the 2 prior scenes
    // contains a structural cause: revelation, dramatic turn (≠'nothing'), suspense rise
    // (suspenseDelta>0), clockRaised, or any non-neutral emotional shift. When the story's
    // inaugural thematic moment is structurally causeless, the theme debuts as an editorial
    // insertion rather than emerging from narrative pressure.
    // Distinctness: THEME_PEAK_UNMOTIVATED fires on the single densest scene (most keyword hits);
    // THEME_ALL_RESONANCE_CAUSELESS fires only when every resonant scene is causeless. This
    // specifically targets the very first resonant scene — a weaker, earlier failure mode that
    // the other two checks cannot catch. THEME_LATE_DEBUT checks the first resonant scene's
    // POSITION (too late); this checks its CAUSE regardless of position.
    if (records.length >= 6) {
      const firstResIdx486b = records.findIndex(r =>
        sceneHasResonance(sceneTexts.get(r.sceneIdx) ?? '', expandedKeywords),
      );
      if (firstResIdx486b >= 2) {
        const prior1_486b = records[firstResIdx486b - 1];
        const prior2_486b = records[firstResIdx486b - 2];
        const hasCause486b = [prior1_486b, prior2_486b].some(r =>
          r !== undefined && (
            (r.revelation !== null && r.revelation !== '' && r.revelation !== undefined) ||
            (r.dramaticTurn !== undefined && r.dramaticTurn !== 'nothing' && r.dramaticTurn !== '') ||
            r.suspenseDelta > 0 ||
            r.clockRaised === true ||
            r.emotionalShift !== 'neutral'
          ),
        );
        if (!hasCause486b) {
          issues.push({
            location: `Scene ${records[firstResIdx486b].sceneIdx} (${records[firstResIdx486b].slug}) — first resonant scene, causeless`,
            rule: 'THEME_FIRST_RESONANT_CAUSELESS',
            severity: 'minor',
            description: `The first thematically resonant scene (scene ${records[firstResIdx486b].sceneIdx}) appears with no structural preparation — the 2 preceding scenes carry no revelation, dramatic turn, suspense rise, deadline, or emotional shift that would motivate a thematic surfacing. When the theme debuts without cause, it arrives as an editorial insertion rather than emerging from narrative pressure.`,
            suggestedFix: `Add a structural catalyst in the scene immediately before scene ${records[firstResIdx486b].sceneIdx}: a revelation, a reversal, a moment of tension, or an emotional beat that makes the theme's debut feel earned. The first thematic moment should feel provoked by the story, not appended to it.`,
          });
        }
      }
    }

    // THEME_RESONANCE_THIRDS_CLUSTER — distribution/timing × thirds × resonant scene proportion.
    // n≥9, ≥3 resonant scenes. Divide records into three equal structural thirds. Count resonant
    // scenes in each third. If >75% of all resonant scenes fall in a single third, the theme is
    // structurally localized — it speaks in only one segment and falls silent for two thirds of runtime.
    // Distinctness: THEME_FRONT_LOADED compares keyword hit DENSITY (hits/scene) in the first third
    // vs the rest, requires ≥2 hits/scene density to fire, and only contrasts first-third vs rest
    // (not all three thirds). This check uses scene MEMBERSHIP PROPORTION across all three thirds
    // and fires even when the dominant zone is the middle or final third. THEME_CLOSING_QUARTER_SILENT,
    // THEME_MIDPOINT_SILENT etc. fire on ZERO resonant scenes in a zone; this fires when one zone
    // is overwhelmingly dominant (≥1 in each zone but concentration >75% in one). THEME_RESONANT_
    // CLUSTER_FLOOD fires on ≥4 consecutive resonant scenes (run-based, adjacency); this uses
    // structural position thirds, not adjacency.
    if (records.length >= 9 && resonantScenes.length >= 3) {
      const third486c = Math.floor(records.length / 3);
      const resonantSet486c = new Set(resonantScenes.map(r => r.sceneIdx));
      const zone1Count486c = records.slice(0, third486c).filter(r => resonantSet486c.has(r.sceneIdx)).length;
      const zone2Count486c = records.slice(third486c, 2 * third486c).filter(r => resonantSet486c.has(r.sceneIdx)).length;
      const zone3Count486c = records.slice(2 * third486c).filter(r => resonantSet486c.has(r.sceneIdx)).length;
      const maxZone486c = Math.max(zone1Count486c, zone2Count486c, zone3Count486c);
      if (maxZone486c / resonantScenes.length > 0.75) {
        const dominantZone486c = zone1Count486c === maxZone486c ? 'first'
          : zone2Count486c === maxZone486c ? 'second' : 'third';
        issues.push({
          location: `Thematic distribution — ${maxZone486c}/${resonantScenes.length} resonant scenes in ${dominantZone486c} third (zones: ${zone1Count486c}/${zone2Count486c}/${zone3Count486c})`,
          rule: 'THEME_RESONANCE_THIRDS_CLUSTER',
          severity: 'minor',
          description: `${Math.round(maxZone486c / resonantScenes.length * 100)}% of thematically resonant scenes (${maxZone486c} of ${resonantScenes.length}) fall in the ${dominantZone486c} structural third of the script. The theme is localized — it only speaks in one segment and falls silent for the other two thirds of the runtime. A theme that concentrates in one structural zone cannot accompany the audience through the full arc of the story.`,
          suggestedFix: `Distribute theme touchpoints across all three structural thirds. Add at least one scene in each of the ${dominantZone486c === 'first' ? 'second and third' : dominantZone486c === 'second' ? 'first and third' : 'first and second'} thirds that carries language, action, or image related to "${themeRaw}". Theme should compound and evolve across the full structure, not concentrate in one zone.`,
        });
      }
    }

    // ── Wave 500: THEME_NEGATIVE_EMOTION_AFTERMATH_SILENT, THEME_LAST_RESONANT_CAUSELESS,
    //              THEME_PAYOFF_AFTERMATH_SILENT ──────────────────────────────────────────────

    // THEME_NEGATIVE_EMOTION_AFTERMATH_SILENT (sequence/aftermath × negative emotion trigger →
    // theme, n≥8, ≥2 negative-shift scenes not at last position, none followed by resonant scene):
    // Every scene of loss, conflict, or grief passes without the next scene picking up the theme —
    // dark emotional beats and thematic meaning are permanently disconnected across time. The scene
    // after a negative-shift moment is a natural fulcrum for thematic weight: the character has just
    // suffered something, and the next beat is primed for reflection or consequence. Sequence/aftermath
    // mode × negative emotion trigger × theme aftermath. Distinct from THEME_NEGATIVE_EMOTION_DECOUPLED
    // (Wave 279: co-occurrence — the negative scene ITSELF is silent; this fires when the NEXT scene
    // is silent), THEME_POSITIVE_EMOTION_AFTERMATH_SILENT (Wave 486: same mode, opposite polarity —
    // completes the full emotional-polarity pair for the aftermath × emotion channel), THEME_DRAMATIC_
    // TURN_AFTERMATH_SILENT (Wave 430: same mode, different trigger — turn vs negative emotion).
    const n500a = records.length;
    if (n500a >= 8) {
      const negIdxs500a: number[] = [];
      for (let i500a = 0; i500a < n500a - 1; i500a++) {
        if (records[i500a].emotionalShift === 'negative') negIdxs500a.push(i500a);
      }
      if (negIdxs500a.length >= 2) {
        const anyNegAftermath500a = negIdxs500a.some(i500a => {
          const next500a = records[i500a + 1];
          return sceneHasResonance(sceneTexts.get(next500a.sceneIdx) ?? '', expandedKeywords);
        });
        if (!anyNegAftermath500a) {
          issues.push({
            location: `${negIdxs500a.length} negative-shift scenes — none followed by theme resonance`,
            rule: 'THEME_NEGATIVE_EMOTION_AFTERMATH_SILENT',
            severity: 'minor',
            description: `The script has ${negIdxs500a.length} scenes of negative emotional shift, but not one is followed immediately by a scene that touches "${themeRaw}". The scene after a moment of loss, conflict, or grief is a natural fulcrum for thematic weight: characters have just suffered something, and the next beat is primed for reflection, consequence, or a thematic echo of what just happened. When every dark emotional moment passes without the theme entering the next beat, the story uses loss as incident rather than meaning — the damage lands but the story never asks what it signifies.`,
            suggestedFix: `After at least one negative-shift scene, let the next scene voice or embody "${themeRaw}" — even a single image, line, or decision that connects the loss to the story's central question. A moment of grief is a lens through which the theme can be seen more clearly; the scene immediately after it is the most receptive moment in the script for that thematic connection.`,
          });
        }
      }
    }

    // THEME_LAST_RESONANT_CAUSELESS (backward-cause × last resonant scene, n≥6, last resonant
    // scene at index ≥ 2, prior 2 scenes have no structural cause): The story's final thematic
    // beat lacks preparation — the last scene to carry the theme appears without any preceding
    // revelation, reversal, tension, deadline, or emotional charge. The theme's last voicing
    // should arrive with structural weight, not as a stray coda. A closing thematic moment that
    // appears causeless reads as an authorial safety valve appended after the real story has ended
    // rather than as the earned crystallization of everything that preceded it. Backward-cause mode
    // × last resonant scene. Distinct from THEME_FIRST_RESONANT_CAUSELESS (Wave 486: inaugural
    // thematic moment, not final), THEME_PEAK_UNMOTIVATED (Wave 430: densest resonant scene, not
    // last), THEME_ALL_RESONANCE_CAUSELESS (Wave 458: requires every resonant scene to be causeless;
    // this fires on the last scene alone). First backward-cause check targeting the final resonant
    // scene position.
    if (records.length >= 6) {
      let lastResIdx500b = -1;
      for (let i500b = records.length - 1; i500b >= 0; i500b--) {
        if (sceneHasResonance(sceneTexts.get(records[i500b].sceneIdx) ?? '', expandedKeywords)) {
          lastResIdx500b = i500b;
          break;
        }
      }
      if (lastResIdx500b >= 2) {
        const prior1_500b = records[lastResIdx500b - 1];
        const prior2_500b = records[lastResIdx500b - 2];
        const hasCause500b = [prior1_500b, prior2_500b].some(r =>
          r !== undefined && (
            (r.revelation !== null && r.revelation !== '' && r.revelation !== undefined) ||
            (r.dramaticTurn !== undefined && r.dramaticTurn !== 'nothing' && r.dramaticTurn !== '') ||
            r.suspenseDelta > 0 ||
            r.clockRaised === true ||
            r.emotionalShift !== 'neutral'
          ),
        );
        if (!hasCause500b) {
          issues.push({
            location: `Scene ${records[lastResIdx500b].sceneIdx} (${records[lastResIdx500b].slug}) — last resonant scene, causeless`,
            rule: 'THEME_LAST_RESONANT_CAUSELESS',
            severity: 'minor',
            description: `The last thematically resonant scene (scene ${records[lastResIdx500b].sceneIdx}) appears with no structural preparation — the 2 preceding scenes carry no revelation, dramatic turn, suspense rise, deadline, or emotional shift that would motivate a final thematic statement. The story's last voicing of its central meaning arrives as a coda rather than a conclusion: a thematic beat without narrative cause. When the final thematic moment is causeless, it reads as an authorial safety valve rather than the earned crystallization of everything that preceded it.`,
            suggestedFix: `Add a structural catalyst in the scene immediately before scene ${records[lastResIdx500b].sceneIdx}: a revelation, a reversal, a moment of tension, or an emotional beat that makes the theme's final statement feel earned rather than appended. The last thematic moment should feel provoked by the story — the culmination of a narrative pressure — not added as a safety net.`,
          });
        }
      }
    }

    // THEME_PAYOFF_AFTERMATH_SILENT (sequence/aftermath × payoff trigger → theme, n≥8, ≥2
    // qualifying payoff scenes [payoffSetupIds non-empty, pos < n-1], none followed by a resonant
    // next scene): Every scene that resolves a planted setup passes without the next scene touching
    // the theme — payoffs close narrative loops but never prompt thematic reflection. A scene that
    // delivers on a planted setup is a moment of structural completion: what was promised has arrived.
    // That completion is a natural gateway for theme because it asks why the payoff mattered — what
    // it cost and what it means for the characters. Sequence/aftermath mode × payoff trigger × theme
    // aftermath. Distinct from THEME_REVELATION_AFTERMATH_SILENT (Wave 444: revelation trigger — a
    // different structural event), THEME_POSITIVE_EMOTION_AFTERMATH_SILENT (Wave 486: positive
    // emotion trigger, not payoff), THEME_PAYOFF_PEAK_ABSENT (Wave 402: single-peak isolation —
    // the densest payoff scene itself is mute; this checks what happens AFTER payoff scenes). First
    // aftermath check with the payoff channel.
    const n500c = records.length;
    if (n500c >= 8) {
      const payoffIdxs500c: number[] = [];
      for (let i500c = 0; i500c < n500c - 1; i500c++) {
        if (((records[i500c].payoffSetupIds ?? []) as any[]).length > 0) payoffIdxs500c.push(i500c);
      }
      if (payoffIdxs500c.length >= 2) {
        const anyPayoffAftermath500c = payoffIdxs500c.some(i500c => {
          const next500c = records[i500c + 1];
          return sceneHasResonance(sceneTexts.get(next500c.sceneIdx) ?? '', expandedKeywords);
        });
        if (!anyPayoffAftermath500c) {
          issues.push({
            location: `${payoffIdxs500c.length} payoff scene(s) — none followed by theme resonance`,
            rule: 'THEME_PAYOFF_AFTERMATH_SILENT',
            severity: 'minor',
            description: `The script has ${payoffIdxs500c.length} scenes that deliver on planted setups (non-empty payoffSetupIds), but not one is followed immediately by a scene that touches "${themeRaw}". A payoff scene is a moment of structural completion — what was promised has arrived. That completion is a natural gateway for theme: it asks why the resolution mattered, what it cost, and what it means for the characters. When no payoff scene is followed by a resonant next beat, the story treats resolution as purely mechanical: loops close without meaning being extracted from them.`,
            suggestedFix: `After at least one payoff scene, let the next scene voice or embody "${themeRaw}" — even a single moment that connects the resolution to the story's central question. A payoff is not just the end of a planted setup; it is a narrative event with meaning. The scene immediately after it is the most natural moment to ask: what did that resolution mean for the theme?`,
          });
        }
      }
    }

    // ── Wave 514: THEME_SEED_AFTERMATH_SILENT, THEME_HIGH_SUSPENSE_AFTERMATH_SILENT,
    //              THEME_CURIOSITY_AFTERMATH_SILENT ──────────────────────────────────────────────

    // THEME_SEED_AFTERMATH_SILENT (sequence/aftermath × seed trigger → theme, n≥8, ≥2 qualifying
    // seed scenes [seededClueIds non-empty, pos < n-1], none followed by a resonant next scene):
    // Every scene that plants a clue or setup passes without the next scene touching the theme —
    // seed moments are buried without the story signaling their meaning. When a scene plants a seed,
    // the story is making a promise about what will matter; the next beat is a natural moment to
    // connect that promise to the central question. Sequence/aftermath mode × seed trigger × theme
    // aftermath. Distinctness: THEME_PAYOFF_AFTERMATH_SILENT (Wave 500) uses the payoffSetupIds
    // channel (what arrives); this uses the seededClueIds channel (what is planted). THEME_CLUE_
    // SCENES_DECOUPLED (Wave 265) fires when the clue scene ITSELF is silent — co-occurrence mode;
    // this fires when the FOLLOWING scene is silent — aftermath mode, a later failure in the seed
    // lifecycle distinct from what the seed scene itself carries.
    const n514a = records.length;
    if (n514a >= 8) {
      const seedIdxs514a: number[] = [];
      for (let i514a = 0; i514a < n514a - 1; i514a++) {
        if (((records[i514a].seededClueIds ?? []) as string[]).length > 0) seedIdxs514a.push(i514a);
      }
      if (seedIdxs514a.length >= 2) {
        const anySeedAftermath514a = seedIdxs514a.some(i514a => {
          const next514a = records[i514a + 1];
          return sceneHasResonance(sceneTexts.get(next514a.sceneIdx) ?? '', expandedKeywords);
        });
        if (!anySeedAftermath514a) {
          issues.push({
            location: `${seedIdxs514a.length} seed scene(s) — none followed by theme resonance`,
            rule: 'THEME_SEED_AFTERMATH_SILENT',
            severity: 'minor',
            description: `The script has ${seedIdxs514a.length} scenes that plant clues or setups (non-empty seededClueIds), but not one is followed immediately by a scene that touches "${themeRaw}". When a scene plants a seed, the story is making a promise about what will matter; the next beat is a natural moment to voice what that promise means — to connect the planted expectation to the central question. When every seed moment passes without the theme entering the next beat, clue-planting becomes purely mechanical: seeds are buried but their meaning is never foreshadowed, leaving the eventual payoff disconnected from the theme.`,
            suggestedFix: `After at least one seed scene, let the next scene voice or embody "${themeRaw}" — a moment that connects the planted setup to the story's central question. A seed is not just a future narrative promise; it is a thematic signal about what the story values. The scene immediately after planting is the most natural moment to let the audience feel what the seed means.`,
          });
        }
      }
    }

    // THEME_HIGH_SUSPENSE_AFTERMATH_SILENT (sequence/aftermath × high-suspense trigger → theme,
    // n≥8, ≥2 scenes with suspenseDelta>1 not at last position, none followed by a resonant scene):
    // Every moment of peak tension passes without the next scene picking up the theme. A high-suspense
    // scene is when the story's stakes feel most immediate; the scene that follows is uniquely
    // positioned to channel that tension into thematic meaning — to answer "what does this danger
    // signify?" with the story's central idea. When no high-suspense moment is followed by a resonant
    // beat, the script uses tension as spectacle rather than as a delivery mechanism for meaning.
    // Sequence/aftermath mode × suspense trigger × theme aftermath. Distinctness: THEME_PEAK_SUSPENSE_
    // AFTERMATH_SILENT (Wave 416) fires on the scene after the single max-suspenseDelta spike — only
    // one position. This fires when ANY of ≥2 high-suspense scenes (suspenseDelta>1) fails to be
    // followed by theme — a broader, distribution-level version of the same failure mode. THEME_HIGH_
    // SUSPENSE_SCENES_DECOUPLED (Wave 279) fires when the high-suspense scenes THEMSELVES carry no
    // theme — co-occurrence mode. This fires when FOLLOWING scenes are silent — aftermath mode,
    // one temporal step later.
    const n514b = records.length;
    if (n514b >= 8) {
      const highSuspIdxs514b: number[] = [];
      for (let i514b = 0; i514b < n514b - 1; i514b++) {
        if (records[i514b].suspenseDelta > 1) highSuspIdxs514b.push(i514b);
      }
      if (highSuspIdxs514b.length >= 2) {
        const anyHighSuspAftermath514b = highSuspIdxs514b.some(i514b => {
          const next514b = records[i514b + 1];
          return sceneHasResonance(sceneTexts.get(next514b.sceneIdx) ?? '', expandedKeywords);
        });
        if (!anyHighSuspAftermath514b) {
          issues.push({
            location: `${highSuspIdxs514b.length} high-suspense scene(s) — none followed by theme resonance`,
            rule: 'THEME_HIGH_SUSPENSE_AFTERMATH_SILENT',
            severity: 'minor',
            description: `The script has ${highSuspIdxs514b.length} high-suspense scenes (suspenseDelta > 1), but not one is followed immediately by a scene that touches "${themeRaw}". A high-suspense moment is when the story's stakes feel most immediate and real; the scene that follows it is uniquely positioned to channel that tension into thematic meaning — to answer the implicit question "what does this danger mean?" with the story's central idea. When no peak-tension moment is followed by a resonant beat, the script uses suspense as spectacle: tension is raised and managed but its thematic significance is never extracted.`,
            suggestedFix: `After at least one high-suspense scene, let the next scene voice or embody "${themeRaw}" — even a brief moment that connects the tension to the story's central question. The scene immediately following a moment of peak danger is the most receptive in the script to thematic weight: the audience's attention is fully engaged and the question "why does this matter?" is already live.`,
          });
        }
      }
    }

    // THEME_CURIOSITY_AFTERMATH_SILENT (sequence/aftermath × curiosity trigger → theme, n≥8, ≥2
    // scenes with curiosityDelta>0 not at last position, none followed by a resonant scene): Every
    // scene that raises a question or mystery passes without the next scene picking up the theme.
    // When a scene spikes curiosity, the story is declaring "there is something you need to understand";
    // the next beat is the most natural moment to connect that need-to-know to what the story is
    // actually about. When no curiosity beat is followed by a resonant scene, the script poses
    // mysteries as appetite stimulation rather than thematic motivation — questions are raised but
    // their connection to the central meaning is never signaled. Sequence/aftermath mode × curiosity
    // trigger × theme aftermath. Distinctness: THEME_CURIOSITY_SCENES_DECOUPLED (Wave 265) fires when
    // the curiosity scene ITSELF carries no theme — co-occurrence mode. This fires when the FOLLOWING
    // scene is silent — aftermath mode, one temporal step later. THEME_PAYOFF_AFTERMATH_CURIOSITY_FLAT
    // in pacing.ts is a completely different axis (curiosity in aftermath of payoff triggers, not
    // theme in aftermath of curiosity triggers).
    const n514c = records.length;
    if (n514c >= 8) {
      const curIdxs514c: number[] = [];
      for (let i514c = 0; i514c < n514c - 1; i514c++) {
        if (records[i514c].curiosityDelta > 0) curIdxs514c.push(i514c);
      }
      if (curIdxs514c.length >= 2) {
        const anyCurAftermath514c = curIdxs514c.some(i514c => {
          const next514c = records[i514c + 1];
          return sceneHasResonance(sceneTexts.get(next514c.sceneIdx) ?? '', expandedKeywords);
        });
        if (!anyCurAftermath514c) {
          issues.push({
            location: `${curIdxs514c.length} curiosity-spike scene(s) — none followed by theme resonance`,
            rule: 'THEME_CURIOSITY_AFTERMATH_SILENT',
            severity: 'minor',
            description: `The script has ${curIdxs514c.length} scenes that spike audience curiosity (curiosityDelta > 0), but not one is followed immediately by a scene that touches "${themeRaw}". When a scene raises a question or mystery, the story is declaring that something needs to be understood. The next beat is the most natural moment to connect that need-to-know to what the story is actually about. When no curiosity beat is followed by a resonant scene, the script poses mysteries as appetite stimulation rather than thematic motivation — questions are raised but their connection to the central meaning is never signaled, leaving intrigue and theme permanently decoupled across time.`,
            suggestedFix: `After at least one curiosity-raising scene, let the next scene voice or embody "${themeRaw}" — a moment that connects the story's open question to its central theme. The scene immediately following a curiosity spike is the most receptive moment for thematic anchoring: the audience is actively wondering "what does this mean?" and the answer can be thematic as well as plot-level.`,
          });
        }
      }
    }

    // ── Wave 528: THEME_RELATIONSHIP_SHIFT_AFTERMATH_SILENT, THEME_MIDPOINT_RESONANT_CAUSELESS,
    //              THEME_BACK_HEAVY ──────────────────────────────────────────────────────────────

    // THEME_RELATIONSHIP_SHIFT_AFTERMATH_SILENT (sequence/aftermath × relationship shift trigger
    // → theme, n≥8, ≥2 qualifying relationship-shift scenes [pos < n-1], none followed by a
    // resonant scene): Every scene that moves a relationship between characters passes without
    // the next scene touching the theme. A relationship shift is the human core of the story's
    // machinery: when two characters grow closer, more distant, more hostile, or more trusting,
    // the story is articulating the emotional cost of its events. The scene that follows a
    // relational beat is the natural moment to ask what the shift means — to connect the
    // interpersonal movement to the theme's central question. When no relational shift is followed
    // by a resonant next beat, the story treats relationships as plot mechanics rather than as
    // vehicles for meaning. Sequence/aftermath mode × relationship-shift trigger × theme aftermath.
    // Distinct from THEME_RELATIONSHIP_DECOUPLED (Wave 458: co-occurrence mode — the relationship
    // shift scene ITSELF carries no theme; this fires when the FOLLOWING scene is silent, one
    // temporal step later), all other aftermath checks (different triggers: seed, payoff, curiosity,
    // suspense, emotion, revelation, clock, dramatic-turn — relationship is a new trigger channel).
    const n528a = records.length;
    if (n528a >= 8) {
      const relIdxs528a: number[] = [];
      for (let i528a = 0; i528a < n528a - 1; i528a++) {
        if (((records[i528a].relationshipShifts ?? []) as any[]).length > 0) relIdxs528a.push(i528a);
      }
      if (relIdxs528a.length >= 2) {
        const anyRelAftermath528a = relIdxs528a.some(i528a => {
          const next528a = records[i528a + 1];
          return sceneHasResonance(sceneTexts.get(next528a.sceneIdx) ?? '', expandedKeywords);
        });
        if (!anyRelAftermath528a) {
          issues.push({
            location: `${relIdxs528a.length} relationship-shift scene(s) — none followed by theme resonance`,
            rule: 'THEME_RELATIONSHIP_SHIFT_AFTERMATH_SILENT',
            severity: 'minor',
            description: `The script has ${relIdxs528a.length} scenes that move a relationship between characters (non-empty relationshipShifts), but not one is followed immediately by a scene that touches "${themeRaw}". A relationship shift is the human core of the story's machinery: when characters grow closer, more distant, or more hostile, the story is articulating the emotional cost of its events. The scene that follows a relational beat is the natural moment to connect that interpersonal movement to what the story is about. When no relationship shift is followed by a resonant next beat, the story treats relational movement as plot mechanics rather than as vehicles for the theme — bonds change but the change is never made to mean anything.`,
            suggestedFix: `After at least one relationship-shift scene, let the next scene voice or embody "${themeRaw}" — even briefly. A character reflecting on what just changed between them and someone else is a natural gateway for thematic language: the shift gives a context in which the theme's central question has immediate personal stakes. The relationship scene and its thematic aftermath together form one complete dramatic unit: the shift in bond plus the meaning of that shift.`,
          });
        }
      }
    }

    // THEME_MIDPOINT_RESONANT_CAUSELESS (backward-cause × midpoint zone resonant scene,
    // n≥8, ≥2 global structural catalysts, ≥1 resonant scene in the 40%–60% midpoint zone,
    // no midpoint resonant scene preceded by a catalyst in its prior 2 scenes): The first
    // thematically resonant scene in the story's structural midpoint (40%–60%) lacks any
    // upstream cause — no revelation, dramatic turn, suspense rise, clock, or emotional shift
    // in the 2 preceding scenes — even though structural catalysts exist elsewhere. The midpoint
    // is where the story's central question is supposed to crystallize: the protagonist has
    // committed, the opposition has materialized, and the theme should arrive with the full
    // weight of the structural turn. When the midpoint's first thematic beat is causeless,
    // it lands in the script as an editorial insertion at the pivot rather than as a consequence
    // of the pivot. Backward-cause mode × midpoint structural position × first resonant scene
    // in zone. Distinct from THEME_PEAK_UNMOTIVATED (Wave 430: the single densest scene in the
    // whole script), THEME_FIRST_RESONANT_CAUSELESS (Wave 486: the very first resonant scene in
    // the story), THEME_LAST_RESONANT_CAUSELESS (Wave 500: the final thematic beat), THEME_ALL_
    // RESONANCE_CAUSELESS (Wave 458: every resonant scene causeless — fires only when no exception
    // exists; this fires when the midpoint resonant scene specifically is causeless even if many
    // others ARE motivated).
    const n528b = records.length;
    if (n528b >= 8) {
      const midStart528b = Math.floor(n528b * 0.40);
      const midEnd528b = Math.floor(n528b * 0.60);
      const midResonantIdxs528b = records
        .map((r, i) => ({ r, i }))
        .filter(({ r, i }) =>
          i >= midStart528b && i <= midEnd528b &&
          sceneHasResonance(sceneTexts.get(r.sceneIdx) ?? '', expandedKeywords),
        )
        .map(({ i }) => i);
      const hasCatalystGlobally528b = records.some(r =>
        (r.revelation !== null && r.revelation !== '' && r.revelation !== undefined) ||
        (r.dramaticTurn !== undefined && r.dramaticTurn !== 'nothing' && r.dramaticTurn !== '') ||
        r.suspenseDelta > 0 ||
        r.clockRaised === true ||
        r.emotionalShift !== 'neutral',
      );
      // Need ≥2 catalysts globally so that causelessness is meaningful
      const globalCatalystCount528b = records.filter(r =>
        (r.revelation !== null && r.revelation !== '' && r.revelation !== undefined) ||
        (r.dramaticTurn !== undefined && r.dramaticTurn !== 'nothing' && r.dramaticTurn !== '') ||
        r.suspenseDelta > 0 ||
        r.clockRaised === true ||
        r.emotionalShift !== 'neutral',
      ).length;
      if (midResonantIdxs528b.length > 0 && globalCatalystCount528b >= 2) {
        const firstMidRes528b = midResonantIdxs528b[0];
        const hasCause528b = firstMidRes528b >= 2 && [records[firstMidRes528b - 1], records[firstMidRes528b - 2]].some(r =>
          r !== undefined && (
            (r.revelation !== null && r.revelation !== '' && r.revelation !== undefined) ||
            (r.dramaticTurn !== undefined && r.dramaticTurn !== 'nothing' && r.dramaticTurn !== '') ||
            r.suspenseDelta > 0 ||
            r.clockRaised === true ||
            r.emotionalShift !== 'neutral'
          ),
        );
        if (!hasCause528b) {
          const midScene528b = records[firstMidRes528b];
          issues.push({
            location: `Scene ${midScene528b.sceneIdx} (${midScene528b.slug}) — first midpoint resonant scene, causeless`,
            rule: 'THEME_MIDPOINT_RESONANT_CAUSELESS',
            severity: 'minor',
            description: `The first thematically resonant scene in the story's midpoint zone (40%–60%) — scene ${midScene528b.sceneIdx} — appears without any structural preparation: the 2 preceding scenes carry no revelation, dramatic turn, suspense rise, deadline, or emotional shift that would motivate the theme's surfacing at this structural pivot, even though such catalysts exist elsewhere in the story. The midpoint is where the story's central question should crystallize with the full weight of the turn: the protagonist has committed, the opposition has materialized, and the theme should land as a consequence of the structural moment, not as an editorial aside dropped into the middle. A causeless thematic beat at the midpoint reads as a thesis statement placed at the center of the script rather than earned by what happened in the preceding scenes.`,
            suggestedFix: `Add a structural catalyst in one of the two scenes before scene ${midScene528b.sceneIdx}: a revelation that makes the theme's question land with midpoint urgency, a dramatic turn that forces the characters to confront what the story is about, or a moment of tension or emotional charge that the midpoint's thematic beat then responds to. The midpoint resonant scene should feel provoked by the pivot, not inserted at it.`,
          });
        }
      }
    }

    // THEME_BACK_HEAVY (distribution/timing × second-half proportion × resonant scene count,
    // n≥8, ≥3 resonant scenes, ≥1 in first half [pos < n/2], >65% in second half [pos ≥ n/2]):
    // More than two-thirds of the script's resonant scenes fall in the second half while the
    // first half has at least one. Theme is structurally back-loaded: the story's opening
    // movement is largely thematically silent, and meaning concentrates in the second half
    // and resolution. The audience spends the first half of the narrative without the thematic
    // anchor that would give dramatic events their meaning — what the story is about only
    // becomes clear in the back half, leaving the opening acts to feel like setup for a
    // thematic statement that arrives too late to permeate the whole story. Distribution/
    // timing mode × second-half proportion × resonant scene membership. Distinct from
    // THEME_RESONANCE_THIRDS_CLUSTER (Wave 486: >75% in one structural third — fires when
    // one of three thirds is dominant, not when two of them [second half] are collectively
    // dominant at a lower threshold), THEME_FRONT_LOADED (Wave 148: keyword hit DENSITY in
    // first third vs rest — the exact opposite distribution problem; density-based not
    // scene-count proportion; fires on first-half front-loading not second-half back-loading),
    // THEME_ACT_1_DENSITY_DROP (Wave 374: first 25% zone vs overall — zone density check not
    // a half-split proportion), THEME_PEAK_BEFORE_MIDPOINT (Wave 321: the single densest theme
    // scene is in first half — single-peak position check, not overall scene distribution).
    if (records.length >= 8 && resonantScenes.length >= 3) {
      const halfIdx528c = Math.floor(records.length / 2);
      const firstHalfResonant528c = resonantScenes.filter(r => {
        const pos = records.indexOf(r);
        return pos < halfIdx528c;
      });
      const secondHalfResonant528c = resonantScenes.filter(r => {
        const pos = records.indexOf(r);
        return pos >= halfIdx528c;
      });
      if (
        firstHalfResonant528c.length >= 1 &&
        secondHalfResonant528c.length / resonantScenes.length > 0.65
      ) {
        issues.push({
          location: `${secondHalfResonant528c.length}/${resonantScenes.length} resonant scenes in second half`,
          rule: 'THEME_BACK_HEAVY',
          severity: 'minor',
          description: `${secondHalfResonant528c.length} of the story's ${resonantScenes.length} thematically resonant scenes (${(secondHalfResonant528c.length / resonantScenes.length * 100).toFixed(0)}%) fall in the second half of the script, while only ${firstHalfResonant528c.length} appear in the first half. Theme is structurally back-loaded: the first half of the narrative is largely thematically silent, and meaning concentrates in the second half and resolution. The audience spends the story's opening movement without the thematic anchor that would give dramatic events their significance — what the story is about only becomes clear once the narrative is past its midpoint, leaving the first half to feel like mechanical setup for a meaning that arrives too late to permeate the whole. The most durable thematic work permeates the whole story: the audience needs the theme's frame early enough to feel each subsequent event as part of the pattern.`,
          suggestedFix: `Distribute theme earlier: let at least two or three scenes in the first half voice or embody "${themeRaw}" — even briefly. The first half doesn't need the full thematic statement, but it needs enough resonance to let the audience begin forming the question that the second half will answer. A theme heard first at the 60% mark arrives as a thesis; a theme woven through from the beginning arrives as a truth.`,
        });
      }
    }

    // ── Wave 542: THEME_RESONANT_SUSPENSE_FLAT, THEME_ACT2B_RESONANT_CAUSELESS,
    //              THEME_RESONANT_AFTERMATH_CURIOSITY_VOID ─────────────────────────────────

    // THEME_RESONANT_SUSPENSE_FLAT (average/aggregate × suspense × resonant set, n≥8,
    // ≥2 resonant scenes, ≥2 suspense-spike scenes [suspenseDelta>0]): Every resonant scene
    // has suspenseDelta ≤ 0 — theme always surfaces in tension-free contexts, never in a scene
    // where the stakes are also rising. Theme voiced in low-tension beats reads as commentary
    // rather than consequence: the story pauses to make its thematic statement in scenes where
    // nothing dangerous is happening, then moves on to danger in scenes where meaning is silent.
    // The audience receives the thematic register and the tension register as fully separate
    // tracks — they feel the suspense without the meaning, and they receive the meaning without
    // the suspense. Average/aggregate mode × suspense channel × resonant set. Distinct from
    // THEME_HIGH_SUSPENSE_SCENES_DECOUPLED (Wave 279: high-suspense scenes carry no theme —
    // the HIGH-SUSPENSE end; this checks that resonant scenes have NO positive suspense at all),
    // THEME_QUIET_SCENES_ONLY (Wave 307: every resonant scene is neutral AND low-suspense — a
    // stricter double condition; this fires when only the suspense sub-condition holds).
    if (records.length >= 8 && resonantScenes.length >= 2) {
      const suspenseScenes542a = (records as any[]).filter(r => (r.suspenseDelta ?? 0) > 0);
      if (suspenseScenes542a.length >= 2) {
        const allResonantFlat542a = resonantScenes.every(r => (r.suspenseDelta ?? 0) <= 0);
        if (allResonantFlat542a) {
          issues.push({
            location: `${resonantScenes.length} resonant scene(s) — none with positive suspenseDelta`,
            rule: 'THEME_RESONANT_SUSPENSE_FLAT',
            severity: 'minor',
            description: `Every scene that voices "${themeRaw}" (${resonantScenes.length} resonant scene(s)) has a suspenseDelta of 0 or below — the theme only surfaces when tension is not rising — even though ${suspenseScenes542a.length} scenes elsewhere carry positive suspenseDelta. Theme voiced exclusively in tension-free moments reads as editorial commentary rather than as dramatic consequence: the story pauses from its tension-raising to deliver meaning, then resumes tension in scenes where meaning is silent. The two registers never touch: the audience experiences suspense without thematic anchoring, and receives thematic anchoring without any suspense to make the meaning urgent. When theme and tension share a scene, the theme gains weight from what is at stake in that moment; when they are always decoupled, neither operates at full force.`,
            suggestedFix: `Let at least one resonant scene also carry a positive suspenseDelta — a scene where the theme is voiced in the context of rising stakes, not in a tension-free pause. A character articulating what the story is about while facing danger, or a scene that crystallizes the theme in the middle of an escalating situation, gives the thematic moment the urgency that makes meaning feel inevitable rather than inserted.`,
          });
        }
      }
    }

    // THEME_ACT2B_RESONANT_CAUSELESS (backward-cause × Act 2b zone 50%–75%, n≥8, ≥2 global
    // catalysts, ≥1 resonant scene in Act 2b zone, no Act 2b resonant scene preceded by a
    // catalyst in prior 2 scenes): The first thematically resonant scene in Act 2b (the
    // 50%–75% escalation run-up to the climax) lacks any upstream cause — no revelation,
    // dramatic turn, suspense rise, clock, or emotional shift in the 2 preceding scenes —
    // even though catalysts exist elsewhere. Act 2b is where the story presses toward maximum
    // pressure before the climax: the protagonist has failed to resolve the central problem,
    // the opposition is bearing down, and everything is escalating. A causeless thematic beat
    // in this zone reads as the writer stepping in to state meaning rather than the events
    // generating it through accumulation. Backward-cause mode × Act 2b zone × resonant trigger.
    // Distinct from THEME_MIDPOINT_RESONANT_CAUSELESS (Wave 528: 40%–60% zone), THEME_FIRST/
    // LAST_RESONANT_CAUSELESS (first/last scenes in the story), THEME_PEAK_UNMOTIVATED (densest
    // scene in the whole script, not zone-specific).
    const n542b = records.length;
    if (n542b >= 8) {
      const act2bStart542b = Math.floor(n542b * 0.50);
      const act2bEnd542b = Math.floor(n542b * 0.75);
      const act2bResonantIdxs542b = records
        .map((r, i) => ({ r, i }))
        .filter(({ r, i }) =>
          i >= act2bStart542b && i < act2bEnd542b &&
          sceneHasResonance(sceneTexts.get(r.sceneIdx) ?? '', expandedKeywords),
        )
        .map(({ i }) => i);
      const globalCatalystCount542b = (records as any[]).filter(r =>
        (r.revelation !== null && r.revelation !== '' && r.revelation !== undefined) ||
        (r.dramaticTurn !== undefined && r.dramaticTurn !== 'nothing' && r.dramaticTurn !== '') ||
        (r.suspenseDelta ?? 0) > 0 ||
        r.clockRaised === true ||
        (r.emotionalShift ?? 'neutral') !== 'neutral',
      ).length;
      if (act2bResonantIdxs542b.length > 0 && globalCatalystCount542b >= 2) {
        const firstAct2bRes542b = act2bResonantIdxs542b[0];
        const hasCause542b = firstAct2bRes542b >= 2 && [
          (records as any[])[firstAct2bRes542b - 1],
          (records as any[])[firstAct2bRes542b - 2],
        ].some(r =>
          r !== undefined && (
            (r.revelation !== null && r.revelation !== '' && r.revelation !== undefined) ||
            (r.dramaticTurn !== undefined && r.dramaticTurn !== 'nothing' && r.dramaticTurn !== '') ||
            (r.suspenseDelta ?? 0) > 0 ||
            r.clockRaised === true ||
            (r.emotionalShift ?? 'neutral') !== 'neutral'
          ),
        );
        if (!hasCause542b) {
          const act2bScene542b = (records as any[])[firstAct2bRes542b];
          issues.push({
            location: `Scene ${act2bScene542b.sceneIdx} (${act2bScene542b.slug}) — first Act 2b resonant scene, causeless`,
            rule: 'THEME_ACT2B_RESONANT_CAUSELESS',
            severity: 'minor',
            description: `The first thematically resonant scene in Act 2b (50%–75% of the story) — scene ${act2bScene542b.sceneIdx} — appears without any structural preparation: the 2 preceding scenes carry no revelation, dramatic turn, suspense rise, deadline, or emotional shift that would motivate the theme's surfacing at this escalation zone, even though such catalysts exist elsewhere. Act 2b is the story's pressure-maximum zone: the protagonist is failing, the stakes are highest, and the theme should arrive as a consequence of that mounting pressure rather than as an aside within it. A causeless thematic beat in Act 2b reads as a thesis statement dropped into the escalation rather than earned by it — the meaning surfaces without the pressure that should have generated it.`,
            suggestedFix: `Add a structural catalyst in one of the two scenes before scene ${act2bScene542b.sceneIdx}: a revelation that makes the theme's question land with the urgency of the approach to the climax, a dramatic turn that forces the characters to confront what the story is about, or a moment of tension or emotional charge that the Act 2b thematic beat then responds to. In the escalation zone, theme should feel provoked by the story's mounting pressure, not inserted into a gap between pressures.`,
          });
        }
      }
    }

    // THEME_RESONANT_AFTERMATH_CURIOSITY_VOID (sequence/aftermath × curiosity × resonant trigger,
    // n≥8, ≥2 qualifying resonant scenes [pos < n-2], ≥2 curiosity-spike scenes [curiosityDelta>0]):
    // No resonant scene is followed by a curiosity spike in the next 2 scenes, despite curiosity
    // scenes existing elsewhere. When the story voices its theme, it should also open questions:
    // a thematic beat that lands without generating any new wondering in the scenes that follow
    // is a statement rather than a provocation. The theme's power is partly in how it reframes
    // what the audience is watching for — but when every resonant scene's aftermath is curiosity-flat,
    // the theme surfaces as assertion rather than as the engine of new forward pull.
    // Sequence/aftermath mode × curiosity channel × resonant trigger. First aftermath check that
    // uses the resonant scene as the TRIGGER (not the aftermath target). Distinct from all existing
    // aftermath checks (which fire when X → theme is missing), co-occurrence checks (same scene),
    // and CURIOSITY_AFTERMATH_SILENT (Wave 514: curiosity spike as trigger → theme as aftermath).
    if (records.length >= 8 && resonantScenes.length >= 2) {
      const qualResonant542c = resonantScenes.filter(r => {
        const pos = (records as any[]).indexOf(r);
        return pos < records.length - 2;
      });
      const curiosityScenes542c = (records as any[]).filter(r => (r.curiosityDelta ?? 0) > 0);
      if (qualResonant542c.length >= 2 && curiosityScenes542c.length >= 2) {
        const allResNoCuriosity542c = qualResonant542c.every((r: any) => {
          const pos = (records as any[]).indexOf(r);
          for (let off = 1; off <= 2; off++) {
            const nxt = (records as any[])[pos + off];
            if (nxt && (nxt.curiosityDelta ?? 0) > 0) return false;
          }
          return true;
        });
        if (allResNoCuriosity542c) {
          issues.push({
            location: `${qualResonant542c.length} resonant scene(s) — no curiosity spike in any aftermath window`,
            rule: 'THEME_RESONANT_AFTERMATH_CURIOSITY_VOID',
            severity: 'minor',
            description: `None of the story's ${qualResonant542c.length} thematically resonant scene(s) is followed by a curiosity spike (curiosityDelta > 0) within the next two scenes, even though ${curiosityScenes542c.length} curiosity-generating scenes exist elsewhere. A thematic beat should open questions as well as answer them: when the story voices "${themeRaw}", the audience should be left wondering something they weren't wondering before — how will this apply to the protagonist's next choice, what the theme's implication means for a specific relationship, or what the stated truth will cost in the scenes ahead. When every resonant scene's aftermath is curiosity-flat, the theme operates as assertion rather than provocation — it makes a statement and closes the beat without generating any new forward pull. A theme that provokes wondering is dramatically active; a theme that only declares is editorially passive.`,
            suggestedFix: `After at least one resonant scene, introduce a curiosity-raising beat in the following one or two scenes — a question opened by what the theme just stated, an implication that the audience now wants to track, or a character discovery that the thematic moment makes newly uncertain. The curiosity spike after a resonant scene tells the audience that the theme is not just a statement but an active force that changes what they are watching for.`,
          });
        }
      }
    }

    // THEME_RESONANT_AFTERMATH_SUSPENSE_VOID — sequence/aftermath × suspense × resonant trigger.
    // n≥8, ≥2 qualifying resonant scenes (pos < n-2), ≥2 suspense-positive scenes (suspenseDelta>0).
    // No resonant scene is followed by a suspense spike in the next 2 scenes → fire. When the
    // story voices its theme, the scenes that follow should tighten rather than relax: a thematic
    // statement arrives and the audience waits for the story to charge that meaning with tension.
    // When every resonant scene's aftermath is suspense-flat, the theme surfaces into context that
    // refuses to escalate — the audience hears the meaning but feels no urgency activated by it.
    // Sequence/aftermath × suspense channel × resonant trigger. Suspense-channel sibling of
    // THEME_RESONANT_AFTERMATH_CURIOSITY_VOID (Wave 542: curiosity channel). Distinct from
    // THEME_RESONANT_SUSPENSE_FLAT (Wave 542: average/aggregate × suspense on the resonant scene
    // itself — this checks the AFTERMATH, two scenes after the resonant scene).
    if (records.length >= 8 && resonantScenes.length >= 2) {
      const qualResonant556a = resonantScenes.filter((r: any) => {
        const pos = (records as any[]).indexOf(r);
        return pos < records.length - 2;
      });
      const suspenseScenes556a = (records as any[]).filter(r => (r.suspenseDelta ?? 0) > 0);
      if (qualResonant556a.length >= 2 && suspenseScenes556a.length >= 2) {
        const allResNoSuspense556a = qualResonant556a.every((r: any) => {
          const pos = (records as any[]).indexOf(r);
          for (let off = 1; off <= 2; off++) {
            const nxt = (records as any[])[pos + off];
            if (nxt && (nxt.suspenseDelta ?? 0) > 0) return false;
          }
          return true;
        });
        if (allResNoSuspense556a) {
          issues.push({
            location: `${qualResonant556a.length} resonant scene(s) — no suspense spike in any aftermath window`,
            rule: 'THEME_RESONANT_AFTERMATH_SUSPENSE_VOID',
            severity: 'minor',
            description: `None of the story's ${qualResonant556a.length} thematically resonant scene(s) is followed by a suspense spike (suspenseDelta > 0) within the next two scenes, despite ${suspenseScenes556a.length} suspense-generating scenes existing elsewhere in the story. A thematic beat should activate the story's tension rather than interrupt it: when "${themeRaw}" surfaces, what follows should feel charged with the weight of that meaning — the scenes immediately after should tighten as the characters now carry the implications of what the theme just stated. When every resonant scene's aftermath is suspense-flat, the theme operates as a pause rather than an escalation: the story stops, states its meaning, and then returns to a narrative that refuses to register any new pressure from the declaration. The meaning surfaces but does not electrify.`,
            suggestedFix: `After at least one resonant scene, introduce a suspense rise within the following two beats — a scene where the thematic declaration creates new stakes or anxiety rather than diffusing into a flat return to plot. The suspense need not be large; even a small increase in tension after a thematic moment tells the audience that what was just said has consequences that are already accumulating in the story's engine.`,
          });
        }
      }
    }

    // THEME_RESONANT_CURIOSITY_FLAT — average/aggregate × curiosity × resonant set.
    // n≥8, ≥3 resonant scenes, all resonant scenes have curiosityDelta ≤ 0 while ≥2 curiosity-
    // spike scenes (curiosityDelta > 0) exist globally → fire. The theme always surfaces in
    // curiosity-flat moments: the story voices its meaning without generating any new wondering
    // in the scenes where it is directly present. Meaning and curiosity should compound —
    // resonant scenes should leave the audience asking what the theme's implications mean for
    // the specific situation they are watching.
    // Distinct from: THEME_RESONANT_SUSPENSE_FLAT (Wave 542: suspense channel — both are
    // average/aggregate but different metrics), THEME_QUIET_SCENES_ONLY (Wave 307: requires
    // emotional neutrality AND low suspense on ALL resonant scenes, not curiosity), THEME_RESONANT_
    // AFTERMATH_CURIOSITY_VOID (Wave 542: checks curiosity in the AFTERMATH, 2 scenes after the
    // resonant scene; this checks the resonant scene ITSELF for curiosityDelta).
    if (records.length >= 8 && resonantScenes.length >= 3) {
      const curiosityScenes556b = (records as any[]).filter(r => (r.curiosityDelta ?? 0) > 0);
      if (curiosityScenes556b.length >= 2) {
        const allResonantCuriosityFlat556b = resonantScenes.every(
          (r: any) => (r.curiosityDelta ?? 0) <= 0,
        );
        if (allResonantCuriosityFlat556b) {
          issues.push({
            location: `${resonantScenes.length} resonant scene(s) — all with curiosityDelta ≤ 0`,
            rule: 'THEME_RESONANT_CURIOSITY_FLAT',
            severity: 'minor',
            description: `Every scene that voices the theme "${themeRaw}" (${resonantScenes.length} resonant scene(s)) has a flat or negative curiosityDelta, even though ${curiosityScenes556b.length} curiosity-generating scenes exist elsewhere in the story. The theme always surfaces in moments of closed inquiry — the audience is not wondering anything new when the meaning is stated. Meaning and curiosity are natural partners: a thematic moment should ideally arrive inside or alongside a curiosity spike, so that the audience is already asking questions when the story provides part of the answer — or the theme's assertion should itself generate new wondering. When every resonant scene is curiosity-flat, the theme operates in its own register, sealed off from the audience's active inquiry, and the co-arrival of meaning and wondering never occurs.`,
            suggestedFix: `Let at least one resonant scene also generate curiosity (curiosityDelta > 0) — introduce a thematic moment alongside a discovery that opens a new question, or let the theme's statement itself raise a question about what it will cost the protagonist to act on it. The coupling of resonance and curiosity gives the theme forward momentum: it is not just declared but made into a question the audience carries into the next scenes.`,
          });
        }
      }
    }

    // THEME_DIALOGUE_HIGHLIGHT_DECOUPLED — co-occurrence/decoupling × dialogueHighlights × theme.
    // n≥8, ≥3 scenes with non-empty dialogueHighlights (scripted speech that stood out enough to
    // be flagged), all such scenes are thematically silent (no theme keyword in their scene text
    // including the highlights themselves) → fire. When every dialogue-highlight scene carries no
    // theme language, the script's most verbally memorable moments never voice the story's meaning:
    // the dialogue that will be remembered has nothing to do with what the story is about.
    // Distinct from: THEME_DIALOGUE_PEAK_SILENT (Wave 472: single-peak isolation — only the single
    // scene with the MOST highlights; this fires when ALL dialogue-highlight scenes are silent even
    // if they each have only one highlight), THEME_CLUE_SCENES_DECOUPLED (Wave 265: clue signal,
    // not dialogue), THEME_CURIOSITY_SCENES_DECOUPLED (Wave 265: curiosity signal).
    if (records.length >= 8) {
      const dlgHighScenes556c = (records as any[]).filter(
        r => ((r.dialogueHighlights ?? []) as string[]).length > 0,
      );
      if (dlgHighScenes556c.length >= 3) {
        const allDlgSilent556c = dlgHighScenes556c.every(
          (r: any) => !sceneHasResonance(sceneTexts.get(r.sceneIdx) ?? '', expandedKeywords),
        );
        if (allDlgSilent556c) {
          issues.push({
            location: `${dlgHighScenes556c.length} dialogue-highlight scene(s) — all thematically silent`,
            rule: 'THEME_DIALOGUE_HIGHLIGHT_DECOUPLED',
            severity: 'minor',
            description: `Every scene in the story that contains flagged dialogue highlights (${dlgHighScenes556c.length} scene(s)) carries no theme-related language — the script's most verbally memorable moments are thematically mute. Dialogue highlights are the lines most likely to be remembered and quoted: they carry the script's voice at its most concentrated. When not one of these memorable lines connects to the story's central theme ("${themeRaw}"), the dialogue that will outlast the viewing experience has nothing to do with what the story is ultimately about. The most powerful screenwriting positions thematic meaning inside the dialogue that the audience will carry with them — the lines that land most forcefully should be among the clearest bearers of the story's meaning.`,
            suggestedFix: `Introduce at least one dialogue highlight that carries the theme's language, imagery, or central question — a line that is both memorable as dialogue and resonant as thematic statement. The line need not be on-the-nose; even an oblique reference to the theme's central tension inside a line that is vivid and character-specific accomplishes both things at once: it earns its place as a highlight while doing thematic work. Look for moments in the existing dialogue highlights where a word substitution or one added clause could introduce the theme without sacrificing the line's dramatic currency.`,
          });
        }
      }
    }

    // ── Wave 570: THEME_RESONANT_AFTERMATH_EMOTION_VOID, THEME_RESONANT_AFTERMATH_RELATIONSHIP_VOID,
    //              THEME_RESONANT_AFTERMATH_CLOCK_VOID ───────────────────────────────────────────
    // The resonant-trigger aftermath family (the theme scene as TRIGGER, asking what fires in the
    // 2 scenes after) covers only curiosity (Wave 542) and suspense (Wave 556). This wave adds the
    // emotion, relationship, and clock aftermath channels — auditing whether the theme, once voiced,
    // produces felt response, relational movement, and urgency in its immediate wake.

    // THEME_RESONANT_AFTERMATH_EMOTION_VOID — sequence/aftermath × emotion × resonant trigger.
    // n≥8, ≥2 qualifying resonant scenes (pos < n-2), ≥2 emotionally charged scenes elsewhere.
    // No resonant scene is followed by an emotional shift in the next 2 scenes → fire. When the
    // story voices "${themeRaw}", the scenes that follow stay emotionally flat — the theme surfaces
    // and the characters register nothing in its wake. Theme is most powerful when it costs the
    // protagonist something felt: a stated truth that lands as grief, resolve, or dread in the
    // beats that follow. When every resonant scene's aftermath is emotionally neutral, the meaning
    // is delivered as a proposition rather than as an experience that moves the people who hear it.
    // Sequence/aftermath × emotion channel × resonant trigger. Distinct from THEME_RESONANCE_
    // EMOTIONALLY_INERT (audits the resonant scene's OWN emotion, not the 2 scenes after), THEME_
    // POSITIVE/NEGATIVE_EMOTION_AFTERMATH_SILENT (emotion as TRIGGER → theme as aftermath — the
    // reverse direction), THEME_RESONANT_AFTERMATH_CURIOSITY_VOID / _SUSPENSE_VOID (Waves 542/556:
    // same resonant-trigger aftermath family, different output channels).
    if (records.length >= 8 && resonantScenes.length >= 2) {
      const qualResonant570a = resonantScenes.filter((r: any) => (records as any[]).indexOf(r) < records.length - 2);
      const emotionalScenes570a = (records as any[]).filter(r => (r.emotionalShift ?? 'neutral') !== 'neutral');
      if (qualResonant570a.length >= 2 && emotionalScenes570a.length >= 2) {
        const allResNoEmotion570a = qualResonant570a.every((r: any) => {
          const pos = (records as any[]).indexOf(r);
          for (let off = 1; off <= 2; off++) {
            const nxt = (records as any[])[pos + off];
            if (nxt && (nxt.emotionalShift ?? 'neutral') !== 'neutral') return false;
          }
          return true;
        });
        if (allResNoEmotion570a) {
          issues.push({
            location: `${qualResonant570a.length} resonant scene(s) — no emotional shift in any aftermath window`,
            rule: 'THEME_RESONANT_AFTERMATH_EMOTION_VOID',
            severity: 'minor',
            description: `None of the story's ${qualResonant570a.length} thematically resonant scene(s) is followed by an emotional shift within the next two scenes, even though ${emotionalScenes570a.length} emotionally charged scenes exist elsewhere. When the story voices "${themeRaw}", the beats that follow stay emotionally flat — the theme surfaces and the characters register nothing in its wake. Theme lands hardest when it costs the protagonist something felt: a stated truth that resolves into grief, resolve, or dread in the scenes immediately after. When every resonant scene's aftermath is emotionally neutral, the meaning is delivered as a proposition rather than as an experience that moves the people who voice or hear it — the audience receives the idea but never watches it land on anyone.`,
            suggestedFix: `After at least one resonant scene, let the following one or two scenes carry a non-neutral emotional shift — a moment where a character is visibly changed by the truth the theme just stated. The emotional aftermath need not be large; even a brief beat of felt consequence converts the thematic statement from an abstract assertion into something the story's people have to live with.`,
          });
        }
      }
    }

    // THEME_RESONANT_AFTERMATH_RELATIONSHIP_VOID — sequence/aftermath × relationship × resonant trigger.
    // n≥8, ≥2 qualifying resonant scenes (pos < n-2), ≥2 relationship-shift scenes elsewhere. No
    // resonant scene is followed by a relationship shift in the next 2 scenes → fire. When the story
    // voices its theme, no bond moves in the wake: the meaning surfaces but never reshapes how the
    // characters stand with one another. A theme is most alive when it has interpersonal consequence
    // — a stated truth that draws two characters together or drives them apart in the beats that
    // follow. When every resonant scene's aftermath is relationally frozen, the theme operates in a
    // purely intellectual register, disconnected from the relational world it should be reshaping.
    // Sequence/aftermath × relationship channel × resonant trigger. Distinct from THEME_RELATIONSHIP_
    // SHIFT_AFTERMATH_SILENT (Wave 528: relationship shift as TRIGGER → theme as aftermath — the
    // reverse direction), THEME_RELATIONSHIP_DECOUPLED / _SHIFT_DECOUPLED (co-occurrence, same scene),
    // THEME_RELATIONSHIP_PEAK_ABSENT (single-peak), and the curiosity/suspense/emotion siblings in
    // this resonant-trigger aftermath family.
    if (records.length >= 8 && resonantScenes.length >= 2) {
      const qualResonant570b = resonantScenes.filter((r: any) => (records as any[]).indexOf(r) < records.length - 2);
      const relScenes570b = (records as any[]).filter(r => ((r.relationshipShifts ?? []) as any[]).length > 0);
      if (qualResonant570b.length >= 2 && relScenes570b.length >= 2) {
        const allResNoRel570b = qualResonant570b.every((r: any) => {
          const pos = (records as any[]).indexOf(r);
          for (let off = 1; off <= 2; off++) {
            const nxt = (records as any[])[pos + off];
            if (nxt && ((nxt.relationshipShifts ?? []) as any[]).length > 0) return false;
          }
          return true;
        });
        if (allResNoRel570b) {
          issues.push({
            location: `${qualResonant570b.length} resonant scene(s) — no relationship shift in any aftermath window`,
            rule: 'THEME_RESONANT_AFTERMATH_RELATIONSHIP_VOID',
            severity: 'minor',
            description: `None of the story's ${qualResonant570b.length} thematically resonant scene(s) is followed by a relationship shift within the next two scenes, even though ${relScenes570b.length} bond-moving scenes exist elsewhere. When the story voices "${themeRaw}", no bond moves in the wake — the meaning surfaces but never reshapes how the characters stand with one another. A theme is most alive when it has interpersonal consequence: a stated truth that draws two characters together or drives them apart in the beats that follow. When every resonant scene's aftermath is relationally frozen, the theme operates in a purely intellectual register, decoupled from the relational world it should be reshaping — the audience receives the idea but never sees it reorganize the bonds the story is built on.`,
            suggestedFix: `After at least one resonant scene, let the following one or two scenes carry a relationship shift provoked by the theme — a bond that warms or fractures because of the truth just stated. The relational consequence gives the theme a second life beyond its statement: the meaning is not only declared but enacted in how the characters now treat one another, which is where an audience feels a theme most concretely.`,
          });
        }
      }
    }

    // THEME_RESONANT_AFTERMATH_CLOCK_VOID — sequence/aftermath × clock × resonant trigger.
    // n≥8, ≥2 qualifying resonant scenes (pos < n-2), ≥2 clock-raised scenes elsewhere. No resonant
    // scene is followed by a clock raise in the next 2 scenes → fire. When the story voices its
    // theme, no deadline tightens in the wake: the meaning surfaces but never converts into urgency.
    // The most propulsive thematic beats make their meaning time-critical — a stated truth that
    // reveals the protagonist must now act before a window closes. When every resonant scene's
    // aftermath is clock-free while clocks fire elsewhere, the theme is sealed off from the story's
    // urgency engine: meaning is voiced in moments that never become pressing, and the audience hears
    // the idea without ever feeling it create a race against time. Sequence/aftermath × clock channel
    // × resonant trigger. Distinct from THEME_CLOCK_AFTERMATH_SILENT (Wave 472: clock as TRIGGER →
    // theme as aftermath — the reverse direction), THEME_CLOCK_RESONANCE_ABSENT / THEME_CLOCK_SCENE_
    // SILENT (co-occurrence, same scene), THEME_CLOCK_PEAK_ABSENT (single-peak), and the curiosity/
    // suspense/emotion/relationship siblings in this resonant-trigger aftermath family.
    if (records.length >= 8 && resonantScenes.length >= 2) {
      const qualResonant570c = resonantScenes.filter((r: any) => (records as any[]).indexOf(r) < records.length - 2);
      const clockScenes570c = (records as any[]).filter(r => r.clockRaised === true);
      if (qualResonant570c.length >= 2 && clockScenes570c.length >= 2) {
        const allResNoClock570c = qualResonant570c.every((r: any) => {
          const pos = (records as any[]).indexOf(r);
          for (let off = 1; off <= 2; off++) {
            const nxt = (records as any[])[pos + off];
            if (nxt && nxt.clockRaised === true) return false;
          }
          return true;
        });
        if (allResNoClock570c) {
          issues.push({
            location: `${qualResonant570c.length} resonant scene(s) — no clock raised in any aftermath window`,
            rule: 'THEME_RESONANT_AFTERMATH_CLOCK_VOID',
            severity: 'minor',
            description: `None of the story's ${qualResonant570c.length} thematically resonant scene(s) is followed by a clock raise within the next two scenes, even though ${clockScenes570c.length} clock-raising scenes exist elsewhere. When the story voices "${themeRaw}", no deadline tightens in the wake — the meaning surfaces but never converts into urgency. The most propulsive thematic beats make their meaning time-critical: a stated truth that reveals the protagonist must act before a window closes, a theme whose implications start a countdown. When every resonant scene's aftermath is clock-free while clocks fire elsewhere, the theme is sealed off from the story's urgency engine — meaning is voiced in moments that never become pressing, and the audience hears the idea without ever feeling it create a race against time.`,
            suggestedFix: `After at least one resonant scene, raise a clock within the following one or two scenes — let the theme's statement create or expose a deadline. A truth that makes the protagonist realize time is now against them turns the thematic beat into an engine of urgency rather than a pause for reflection. The theme gains propulsion when its meaning is immediately bound to the pressure of a closing window.`,
          });
        }
      }
    }

  }

  // ── Wave 584: THEME_RESONANT_AFTERMATH_TURN_VOID, THEME_RESONANT_EMOTION_FLAT,
  //              THEME_RESONANT_CLOCK_FLAT ────────────────────────────────────────

  {
    // THEME_RESONANT_AFTERMATH_TURN_VOID — sequence/aftermath × dramatic-turn × resonant trigger.
    // n≥8, ≥2 qualifying resonant scenes (pos<n-2), ≥2 dramatic-turn scenes globally.
    // No resonant scene is followed by a dramatic turn in the next 2 scenes → fire.
    // Theme voiced and the story continues without pivoting in the immediate aftermath —
    // stated meaning never triggers a reversal or recognition in the beats that follow.
    // The most propulsive thematic beats precipitate structural consequences: a character
    // absorbs the theme and changes direction, or the newly-stated truth precipitates a
    // recognition that flips the story. When every resonant scene's aftermath is turn-free
    // while turns fire elsewhere, the theme is sealed commentary rather than an engine of
    // structural consequence.
    // Distinct from: DRAMATIC_TURN_AFTERMATH_SILENT (Wave 430: turn is the TRIGGER, theme
    // is the aftermath — the reverse direction; this is theme as trigger, turn as aftermath),
    // RESONANT_AFTERMATH_CURIOSITY_VOID / SUSPENSE_VOID / EMOTION_VOID / RELATIONSHIP_VOID /
    // CLOCK_VOID (Waves 542/556/570: same resonant-trigger aftermath family, different output
    // channels — this adds the dramatic-turn channel, completing the output channel set).
    // First dramatic-turn-channel aftermath check on the resonant trigger.
    // resonantScenes is scoped inside the silentScenes block above; recompute here.
    const resonantScenes584a = (records as any[]).filter(
      r => sceneHasResonance(sceneTexts.get(r.sceneIdx) ?? '', expandedKeywords),
    );
    if (records.length >= 8 && resonantScenes584a.length >= 2) {
      const qualRes584a = resonantScenes584a.filter(
        (r: any) => (records as any[]).indexOf(r) < records.length - 2,
      );
      const turnScenes584a = (records as any[]).filter(
        r => (r.dramaticTurn ?? 'nothing') !== 'nothing' && r.dramaticTurn !== '',
      );
      if (qualRes584a.length >= 2 && turnScenes584a.length >= 2) {
        const allResNoTurn584a = qualRes584a.every((r: any) => {
          const pos = (records as any[]).indexOf(r);
          for (let off = 1; off <= 2; off++) {
            const nxt = (records as any[])[pos + off];
            if (nxt && (nxt.dramaticTurn ?? 'nothing') !== 'nothing' && nxt.dramaticTurn !== '') return false;
          }
          return true;
        });
        if (allResNoTurn584a) {
          issues.push({
            location: `${qualRes584a.length} resonant scene(s) — no dramatic turn in any aftermath window`,
            rule: 'THEME_RESONANT_AFTERMATH_TURN_VOID',
            severity: 'minor',
            description: `None of the story's ${qualRes584a.length} thematically resonant scene(s) is followed by a dramatic turn within the next two scenes, even though ${turnScenes584a.length} turn scene(s) exist elsewhere. When the story voices "${themeRaw}", the scenes that follow continue without pivoting — the stated meaning never triggers a reversal or recognition in the immediate aftermath. The most propulsive thematic beats precipitate structural consequences: a character absorbs a theme and changes course, or a stated idea exposes a contradiction that flips the story's direction. When every resonant scene's aftermath is turn-free while turns fire elsewhere, the theme operates as sealed commentary rather than as an engine that reshapes the narrative.`,
            suggestedFix: `After at least one resonant scene, let a dramatic turn follow within the next two scenes — a reversal or recognition that the thematic moment precipitates. A stated truth about "${themeRaw}" should cost something immediately: a pivot that shows how the character's thematic understanding changes what they decide, or a recognition that the theme makes unavoidable.`,
          });
        }
      }
    }
  }

  {
    // THEME_RESONANT_EMOTION_FLAT — average/aggregate × emotion channel × resonant-scene set.
    // ≥4 resonant scenes, all with emotionalShift='neutral', ≥2 emotionally charged scenes
    // (emotionalShift≠'neutral') elsewhere → fire. Theme always surfaces in emotionally inert
    // scenes — the meaning is voiced without any accompanying feeling. Theme is most powerful
    // when it costs or rewards: a truth that arrives in grief, resolve, or joy carries more
    // weight than one stated in a neutral beat.
    // Distinct from: THEME_QUIET_SCENES_ONLY (Wave 307: every resonant scene is BOTH emotionally
    // neutral AND low-suspense — this fires even when resonant scenes are high-suspense but
    // emotionally flat, a genuinely distinct condition), RESONANT_SUSPENSE_FLAT (Wave 542:
    // suspense channel — theme in tension-free contexts), RESONANT_CURIOSITY_FLAT (Wave 556:
    // curiosity channel), THEME_RESONANT_VALENCE_UNIFORM (Wave 472: fires on any dominant
    // polarity including negative/positive; this only fires on neutral — the zero-charge
    // condition), THEME_CHARGED_SCENE_SILENT (Wave 374: reverse direction — emotional scenes
    // thematically silent; this is resonant scenes that are emotionally silent).
    // First average/aggregate × emotion-channel check on the resonant-scene set.
    const resonantScenes584b = (records as any[]).filter(
      r => sceneHasResonance(sceneTexts.get(r.sceneIdx) ?? '', expandedKeywords),
    );
    if (records.length >= 8 && resonantScenes584b.length >= 4) {
      const emotionScenes584b = (records as any[]).filter(
        r => (r.emotionalShift ?? 'neutral') !== 'neutral',
      );
      if (emotionScenes584b.length >= 2) {
        const allResNeutral584b = resonantScenes584b.every(
          (r: any) => (r.emotionalShift ?? 'neutral') === 'neutral',
        );
        if (allResNeutral584b) {
          issues.push({
            location: `all ${resonantScenes584b.length} resonant scenes are emotionally neutral`,
            rule: 'THEME_RESONANT_EMOTION_FLAT',
            severity: 'minor',
            description: `Every one of the story's ${resonantScenes584b.length} thematically resonant scene(s) is emotionally neutral, even though ${emotionScenes584b.length} emotionally charged scenes exist elsewhere. The theme "${themeRaw}" is always voiced in affectively flat moments — the meaning arrives in scenes where the characters feel nothing, and departs the same way. Theme is most powerful when it costs or rewards: a truth that surfaces in grief, resolve, fear, or joy carries far more weight than one stated in a neutral beat. When the story's thematic language is confined to emotionally inert scenes, the idea remains a proposition rather than an experience the audience can feel alongside the characters.`,
            suggestedFix: `Move at least one thematically resonant beat into an emotionally charged scene — let the theme surface when a character is in grief, triumph, dread, or joy. The theme gains experiential weight when the character feels it as well as states it. A scene where "${themeRaw}" is voiced and the character is simultaneously at an emotional high or low makes the idea land as felt truth.`,
          });
        }
      }
    }
  }

  {
    // THEME_RESONANT_CLOCK_FLAT — average/aggregate × clock channel × resonant-scene set.
    // ≥3 resonant scenes, all with clockRaised=false, ≥2 clock-raised scenes globally → fire.
    // Theme always surfaces in deadline-free scenes — urgency and meaning never coincide in the
    // same beat. A protagonist who must confront what the theme means under a closing window
    // is one of drama's most potent combinations: the idea is tested by time pressure, not just
    // stated in a calm moment.
    // Distinct from: THEME_CLOCK_RAISED_DECOUPLED (Wave 293: the REVERSE direction — clock
    // scenes are all thematically silent; this checks resonant scenes for clock absence, the
    // complementary direction), THEME_RESONANT_AFTERMATH_CLOCK_VOID (Wave 570: aftermath mode
    // — resonant scenes not followed by a clock in next 2 scenes; this checks the resonant
    // scene ITSELF for clockRaised co-occurrence), RESONANT_SUSPENSE_FLAT (Wave 542: suspense
    // channel, same average/aggregate mode), RESONANT_CURIOSITY_FLAT (Wave 556: curiosity
    // channel). Completes the average/aggregate × channel set with the clock channel.
    const resonantScenes584c = (records as any[]).filter(
      r => sceneHasResonance(sceneTexts.get(r.sceneIdx) ?? '', expandedKeywords),
    );
    if (records.length >= 8 && resonantScenes584c.length >= 3) {
      const clockScenes584c = (records as any[]).filter(r => r.clockRaised === true);
      if (clockScenes584c.length >= 2) {
        const allResNoClock584c = resonantScenes584c.every((r: any) => r.clockRaised !== true);
        if (allResNoClock584c) {
          issues.push({
            location: `all ${resonantScenes584c.length} resonant scenes have no clock raised`,
            rule: 'THEME_RESONANT_CLOCK_FLAT',
            severity: 'minor',
            description: `Every one of the story's ${resonantScenes584c.length} thematically resonant scene(s) carries no clock raise, even though ${clockScenes584c.length} clock-raising scenes exist elsewhere. The theme "${themeRaw}" is always voiced in moments free of deadline pressure — meaning surfaces in calm, unhurried scenes while urgency fires in thematically blank ones. A protagonist who must confront what the theme means under a closing window is one of drama's most potent combinations: the idea is tested by time pressure, not just stated. When all resonant scenes are clock-free, the audience hears the idea and feels the pressure in permanently separate beats, never experiencing the two together in the same crucible.`,
            suggestedFix: `Stage at least one thematically resonant beat inside a deadline scene — a moment where the protagonist must confront what "${themeRaw}" means to them while time is running out. The theme's meaning is most urgent when the audience knows the window is closing: a choice made under a clock, a truth stated before a deadline, or a character forced to act on the theme's implications before it is too late.`,
          });
        }
      }
    }
  }

  // ── Wave 598: THEME_UNRESOLVED_CLUE_DECOUPLED, THEME_UNRESOLVED_CLUE_ZONE_IMBALANCE,
  //              THEME_UNRESOLVED_CLUE_AFTERMATH_SILENT ──────────────────────────────────────
  // First checks in this pass to use the unresolvedClues signal — every other clue-related
  // check here (THEME_CLUE_DECOUPLED, THEME_SEED_PEAK_ABSENT, THEME_SEED_AFTERMATH_SILENT) keys
  // on seededClueIds, the moment a clue is PLANTED. unresolvedClues instead tracks the ongoing
  // STATE of a clue remaining unpaid — every scene it lingers in, not just its origin.
  const isResonant598 = (r: any): boolean => sceneHasResonance(sceneTexts.get(r.sceneIdx) ?? '', expandedKeywords);
  const hasDebt598 = (r: any): boolean => ((r.unresolvedClues ?? []) as unknown[]).length > 0;

  // THEME_UNRESOLVED_CLUE_DECOUPLED — Co-occurrence/decoupling × resonance × unresolvedClues.
  // Built on checkCoOccurrenceDecoupled from the shared checks library. n≥6, ≥2 debt-carrying
  // scenes (unresolvedClues non-empty), ≥2 resonant scenes existing elsewhere. Zero overlap
  // between the two → fire. The scenes where a mystery sits open never carry the story's central
  // idea — an open question and the theme it might illuminate never share a moment.
  {
    const r598a = checkCoOccurrenceDecoupled({
      records, minRecords: 6, minACount: 2, minBCount: 2,
      isA: hasDebt598, isB: isResonant598,
    });
    if (r598a.fires) {
      issues.push({
        location: `${r598a.aCount} scene(s) carrying unresolved clue-debt — zero thematically resonant`,
        rule: 'THEME_UNRESOLVED_CLUE_DECOUPLED',
        severity: 'minor',
        description: `${r598a.aCount} scenes carry outstanding, unresolved clue-debt, but none of them carry thematic language related to "${themeRaw}", even though ${r598a.bCount} resonant scene(s) exist elsewhere. The scenes where a mystery sits open — where the audience is actively holding an unanswered question — never coincide with the story's central idea. An open question is a natural home for thematic reflection: what the unresolved thread implies about the theme, what its persistence costs the characters, or what its eventual answer might mean.`,
        suggestedFix: `Let at least one scene carrying open clue-debt also voice the theme — a character reflecting on what the unanswered question means to them, phrased in language that connects to "${themeRaw}". Unresolved mysteries and thematic meaning reinforce each other: the open question keeps mattering because it is tied to what the story is about.`,
      });
    }
  }

  // THEME_UNRESOLVED_CLUE_ZONE_IMBALANCE — Underweight/bloat × unresolvedClues × four zones.
  // Built on checkZoneImbalance from the shared checks library. n≥10, ≥4 debt-carrying scenes
  // total, divided across four equal structural zones. Fires only when one zone has zero such
  // scenes while another holds ≥50% of the total — audits WHERE outstanding narrative debt
  // concentrates structurally, orthogonal to THEME_RESONANCE_THIRDS_CLUSTER (which audits
  // resonance distribution, not clue-debt distribution, and uses thirds not quarters).
  {
    const r598b = checkZoneImbalance({
      records, minRecords: 10, minCount: 4, bloatRatio: 0.5,
      isPresent: hasDebt598,
    });
    if (r598b.fires) {
      const emptyNames598b = r598b.emptyZoneIdxs.map(i => FOUR_ZONE_NAMES[i]).join(', ');
      const bloatName598b = FOUR_ZONE_NAMES[r598b.bloatZoneIdx];
      issues.push({
        location: `${emptyNames598b} empty; ${bloatName598b} has ${r598b.counts[r598b.bloatZoneIdx]}/${r598b.totalCount} debt-carrying scenes`,
        rule: 'THEME_UNRESOLVED_CLUE_ZONE_IMBALANCE',
        severity: 'minor',
        description: `The story's ${r598b.totalCount} scenes carrying outstanding clue-debt are unevenly distributed across its four structural zones: ${bloatName598b} contains ${r598b.counts[r598b.bloatZoneIdx]} of them (${Math.round((r598b.counts[r598b.bloatZoneIdx] / r598b.totalCount) * 100)}%) while ${emptyNames598b} contains none. Unresolved mysteries bloat in one structural quarter and vanish from another, giving the story's sense of open questions an uneven structural rhythm.`,
        suggestedFix: `Redistribute open threads: let at least one clue remain unresolved into the empty zone(s) — ${emptyNames598b} — rather than resolving everything before that quarter of the story begins. A story's sense of active mystery should have some presence in every structural quarter.`,
      });
    }
  }

  // THEME_UNRESOLVED_CLUE_AFTERMATH_SILENT — Sequence/aftermath × unresolvedClues-present
  // trigger → resonance aftermath. Built on checkAftermathVoid from the shared checks library.
  // n≥8, ≥3 qualifying debt-carrying scenes (pos < n-2), ≥2 resonant scenes existing elsewhere.
  // None of the qualifying debt scenes are followed by a resonant scene within 2 scenes → fire.
  // An open question never gets connected to the theme even in its aftermath — distinct from
  // THEME_UNRESOLVED_CLUE_DECOUPLED above by mode (aftermath window vs. same-scene), and from
  // every other THEME_*_AFTERMATH_SILENT check in this file by trigger channel.
  {
    const r598c = checkAftermathVoid({
      records, minRecords: 8, minTriggerCount: 3, minAftermathCount: 2, window: 2,
      isTrigger: hasDebt598, isAftermath: isResonant598,
    });
    if (r598c.fires) {
      issues.push({
        location: `${r598c.triggerCount} unresolved-clue scene(s) — no resonant scene within 2 scenes of any`,
        rule: 'THEME_UNRESOLVED_CLUE_AFTERMATH_SILENT',
        severity: 'minor',
        description: `None of the story's ${r598c.triggerCount} scenes carrying outstanding clue-debt are followed by a thematically resonant scene within the next two, even though ${r598c.aftermathCount} resonant scene(s) exist elsewhere. The aftermath of an open question is a natural window for thematic reflection — a character sitting with an unanswered mystery is exactly the moment to voice what the story is really about — but that window consistently goes thematically silent.`,
        suggestedFix: `After at least one scene where clue-debt is left outstanding, let the following scene or the one after voice the theme — a beat where a character's response to the lingering question connects to "${themeRaw}". The unresolved thread's aftermath is a natural home for the story's central idea to surface.`,
      });
    }
  }

  // ── Wave 612: THEME_VISUAL_BEAT_DECOUPLED, THEME_VISUAL_BEAT_ZONE_IMBALANCE,
  //              THEME_VISUAL_BEAT_AFTERMATH_SILENT ─────────────────────────────────────────
  // First checks in this pass to use the visualBeats signal — the last record field theme.ts had
  // never touched, despite pairing resonance with unresolvedClues (Wave 598), seededClueIds,
  // suspenseDelta, curiosityDelta, revelation, clockRaised, dramaticTurn, relationshipShifts,
  // dialogueHighlights, emotionalShift, and purpose already. Mirrors Wave 598's exact three-mode
  // treatment (co-occurrence, zone-imbalance, aftermath), applied to physical staging instead of
  // clue-debt.
  const isVisuallyStaged612 = (r: any): boolean => ((r.visualBeats ?? []) as unknown[]).length >= 2;

  // THEME_VISUAL_BEAT_DECOUPLED — Co-occurrence/decoupling × resonance × visualBeats. Built on
  // checkCoOccurrenceDecoupled from the shared checks library. n≥6, ≥2 visually-staged scenes
  // (visualBeats.length≥2), ≥2 resonant scenes existing elsewhere. Zero overlap → fire. The
  // scenes that lean most heavily on physical staging never carry the story's central idea — the
  // theme surfaces only through dialogue or interior reflection, never through what a character
  // physically does or examines.
  {
    const r612a = checkCoOccurrenceDecoupled({
      records, minRecords: 6, minACount: 2, minBCount: 2,
      isA: isVisuallyStaged612, isB: isResonant598,
    });
    if (r612a.fires) {
      issues.push({
        location: `${r612a.aCount} visually-staged scene(s) — zero thematically resonant`,
        rule: 'THEME_VISUAL_BEAT_DECOUPLED',
        severity: 'minor',
        description: `${r612a.aCount} scenes lean heavily on physical staging, but none of them carry thematic language related to "${themeRaw}", even though ${r612a.bCount} resonant scene(s) exist elsewhere. The scenes richest in physical action or examined detail never become an occasion for the story's central idea to surface — the theme is carried entirely by speech or interior reflection, never by what a character does with their hands or eyes.`,
        suggestedFix: `Let at least one heavily staged scene double as a thematic beat — an object a character examines, or an action they perform, that embodies "${themeRaw}" without needing a line of dialogue to explain it. Physical staging is often where a theme lands hardest, shown rather than spoken.`,
      });
    }
  }

  // THEME_VISUAL_BEAT_ZONE_IMBALANCE — Underweight/bloat × visualBeats × four structural zones.
  // Built on checkZoneImbalance from the shared checks library. n≥10, ≥4 visually-staged scenes
  // total, divided across four equal structural zones. Fires only when one zone has zero such
  // scenes while another holds ≥50% of the total — audits WHERE physical staging concentrates
  // structurally, orthogonal to THEME_RESONANCE_THIRDS_CLUSTER (resonance distribution, not
  // staging distribution) and THEME_UNRESOLVED_CLUE_ZONE_IMBALANCE (Wave 598: clue-debt channel).
  {
    const r612b = checkZoneImbalance({
      records, minRecords: 10, minCount: 4, bloatRatio: 0.5,
      isPresent: isVisuallyStaged612,
    });
    if (r612b.fires) {
      const emptyNames612b = r612b.emptyZoneIdxs.map(i => FOUR_ZONE_NAMES[i]).join(', ');
      const bloatName612b = FOUR_ZONE_NAMES[r612b.bloatZoneIdx];
      issues.push({
        location: `${emptyNames612b} empty; ${bloatName612b} has ${r612b.counts[r612b.bloatZoneIdx]}/${r612b.totalCount} visually-staged scenes`,
        rule: 'THEME_VISUAL_BEAT_ZONE_IMBALANCE',
        severity: 'minor',
        description: `The story's ${r612b.totalCount} visually-staged scenes are unevenly distributed across its four structural zones: ${bloatName612b} contains ${r612b.counts[r612b.bloatZoneIdx]} of them (${Math.round((r612b.counts[r612b.bloatZoneIdx] / r612b.totalCount) * 100)}%) while ${emptyNames612b} contains none. Physical staging bloats in one structural quarter and vanishes from another, giving the story's opportunities for the theme to manifest physically an uneven structural rhythm.`,
        suggestedFix: `Redistribute physical staging: bring at least one heavily staged scene into ${emptyNames612b}, so every structural quarter carries some opportunity for "${themeRaw}" to surface through physical action, not only through the quarter where staging is currently concentrated.`,
      });
    }
  }

  // THEME_VISUAL_BEAT_AFTERMATH_SILENT — Sequence/aftermath × visualBeats-present trigger →
  // resonance aftermath. Built on checkAftermathVoid from the shared checks library. n≥8, ≥3
  // qualifying visually-staged scenes (pos < n-2), ≥2 resonant scenes existing elsewhere. None of
  // the qualifying staged scenes are followed by a resonant scene within 2 scenes → fire. A
  // heavily staged moment never gets connected to the theme even in its aftermath — distinct from
  // THEME_VISUAL_BEAT_DECOUPLED above by mode (aftermath window vs. same-scene), and from
  // THEME_UNRESOLVED_CLUE_AFTERMATH_SILENT (Wave 598: clue-debt trigger channel).
  {
    const r612c = checkAftermathVoid({
      records, minRecords: 8, minTriggerCount: 3, minAftermathCount: 2, window: 2,
      isTrigger: isVisuallyStaged612, isAftermath: isResonant598,
    });
    if (r612c.fires) {
      issues.push({
        location: `${r612c.triggerCount} visually-staged scene(s) — no resonant scene within 2 scenes of any`,
        rule: 'THEME_VISUAL_BEAT_AFTERMATH_SILENT',
        severity: 'minor',
        description: `None of the story's ${r612c.triggerCount} heavily staged scenes are followed by a thematically resonant scene within the next two, even though ${r612c.aftermathCount} resonant scene(s) exist elsewhere. The aftermath of a physically dense moment is a natural window for reflection — a character processing what they just did or examined is exactly the moment to voice what the story is really about — but that window consistently goes thematically silent.`,
        suggestedFix: `After at least one heavily staged scene, let the following scene or the one after voice the theme — a beat where a character's reaction to what just happened physically connects to "${themeRaw}". The aftermath of physical action is a natural home for the story's central idea to surface.`,
      });
    }
  }

  // ── Wave 626: THEME_PAYOFF_STAGING_DECOUPLED, THEME_SEED_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID,
  //              THEME_PAYOFF_ZONE_IMBALANCE ─────────────────────────────────────────────────
  // Every record field has now been crossed with resonance at least once (Waves 598/612 plus the
  // hand-rolled checks before them). These three instead pair non-resonance record fields
  // directly with each other — a departure from this file's dominant pattern, but a genuinely
  // untried angle on the same seed/payoff/voice machinery the theme lens depends on.

  // THEME_PAYOFF_STAGING_DECOUPLED — Co-occurrence/decoupling × payoffSetupIds × visualBeats.
  // Built on checkCoOccurrenceDecoupled from the shared checks library. n≥6, ≥2 payoff scenes, ≥2
  // visually-staged scenes (visualBeats.length≥2). Zero overlap → fire. A resolution and a scene
  // rich in physical staging never happen together — every payoff lands through dialogue alone,
  // with no physical action embodying what the theme's payoff means for how the story resolves.
  {
    const r626a = checkCoOccurrenceDecoupled({
      records, minRecords: 6, minACount: 2, minBCount: 2,
      isA: r => (r.payoffSetupIds ?? []).length > 0,
      isB: r => (r.visualBeats ?? []).length >= 2,
    });
    if (r626a.fires) {
      issues.push({
        location: `${r626a.aCount} payoff scene(s), ${r626a.bCount} visually-staged scene(s) — zero overlap`,
        rule: 'THEME_PAYOFF_STAGING_DECOUPLED',
        severity: 'minor',
        description: `The ${r626a.aCount} scenes where a planted thread resolves never coincide with the ${r626a.bCount} scenes leaning heavily on physical staging — resolution and physical presence run on separate tracks. A payoff often lands with more thematic weight when a character's physical action embodies what the resolution means, rather than the moment being carried entirely through dialogue.`,
        suggestedFix: `Let at least one payoff scene also lean on physical staging — an action or object a character handles that embodies the theme's resolution, giving the payoff a physical anchor alongside whatever is said.`,
      });
    }
  }

  // THEME_SEED_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID — Sequence/aftermath × seededClueIds trigger →
  // dialogueHighlights absence. Built on checkAftermathVoid from the shared checks library. n≥8,
  // ≥2 qualifying seed scenes (pos<n-2), ≥3 scenes anywhere with a dialogue highlight, a 2-scene
  // lookahead window. Fires when every seed's two-scene aftermath contains no highlighted
  // dialogue, while highlighted dialogue does occur elsewhere. Seeds are the story's long-horizon
  // deposits; when their immediate aftermath never carries a memorable line, the planted material
  // gets no verbal texture nearby, living purely as structural bookkeeping until its payoff.
  {
    const r626b = checkAftermathVoid({
      records, minRecords: 8, minTriggerCount: 2, minAftermathCount: 3, window: 2,
      isTrigger: r => (r.seededClueIds ?? []).length > 0,
      isAftermath: r => (r.dialogueHighlights ?? []).length > 0,
    });
    if (r626b.fires) {
      issues.push({
        location: `${r626b.triggerCount} seed scene(s) — no highlighted dialogue within 2 scenes of any`,
        rule: 'THEME_SEED_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID',
        severity: 'minor',
        description: `Every one of the story's ${r626b.triggerCount} clue-planting scenes is followed by two scenes with no highlighted dialogue, even though ${r626b.aftermathCount} such scenes exist elsewhere in the script. Seeds gain texture when a nearby line of dialogue gives them verbal presence, but that opportunity consistently passes unremarked in the scenes immediately following every seed.`,
        suggestedFix: `After at least one seed, let one of the following two scenes carry a line worth remembering — a character circling the planted material or reacting to it, giving it verbal texture before its eventual payoff.`,
      });
    }
  }

  // THEME_PAYOFF_ZONE_IMBALANCE — Underweight/bloat × payoffSetupIds × four structural zones.
  // Built on checkZoneImbalance from the shared checks library. n≥10, ≥4 payoff scenes total,
  // divided across four equal structural zones. Fires only when one zone has zero payoffs while
  // another holds ≥50% of the total. First zone-based check on the payoff channel in this file —
  // payoffSetupIds has been used as a trigger and a co-occurrence subject but never audited for
  // its own structural distribution.
  {
    const r626c = checkZoneImbalance({
      records, minRecords: 10, minCount: 4, bloatRatio: 0.5,
      isPresent: r => (r.payoffSetupIds ?? []).length > 0,
    });
    if (r626c.fires) {
      const emptyNames626c = r626c.emptyZoneIdxs.map(i => FOUR_ZONE_NAMES[i]).join(', ');
      const bloatName626c = FOUR_ZONE_NAMES[r626c.bloatZoneIdx];
      issues.push({
        location: `${emptyNames626c} empty; ${bloatName626c} has ${r626c.counts[r626c.bloatZoneIdx]}/${r626c.totalCount} payoff scenes`,
        rule: 'THEME_PAYOFF_ZONE_IMBALANCE',
        severity: 'minor',
        description: `The story's ${r626c.totalCount} thread-resolution scenes are unevenly distributed across its four structural zones: ${bloatName626c} contains ${r626c.counts[r626c.bloatZoneIdx]} of them (${Math.round((r626c.counts[r626c.bloatZoneIdx] / r626c.totalCount) * 100)}%) while ${emptyNames626c} contains none. Resolution bloats in one structural quarter and vanishes from another, giving the story's sense of thematic closure an uneven structural rhythm.`,
        suggestedFix: `Redistribute resolutions: let at least one thread pay off in the empty zone(s) — ${emptyNames626c} — so every structural quarter carries some sense of the theme resolving, not only the quarter currently carrying most of them.`,
      });
    }
  }

  // ── Wave 640: THEME_CLOCK_DROUGHT_RUN, THEME_STAGING_PEAK_UNCAUSED,
  //              THEME_PAYOFF_ZONE_CLUSTER ───────────────────────────────────────────────────
  // Three modes this 108-rule pass had never used at all on records: run-based, backward-cause,
  // and zone-cluster (thirds) — despite drought-run's absence, co-occurrence, aftermath, and
  // zone-imbalance all being well established here.

  // THEME_CLOCK_DROUGHT_RUN — Run-based × clockRaised absence. Built on checkDroughtRun from the
  // shared checks library. n≥10, ≥3 clockRaised scenes elsewhere, longest consecutive run of
  // scenes with no clock raised ≥6 → fire. First use of the run-based mode in this pass. An
  // extended stretch where deadline pressure never registers at all means the theme's stakes
  // never get the added urgency a ticking clock can bring, even though the story does raise the
  // clock elsewhere.
  {
    const r640a = checkDroughtRun({
      records, minRecords: 10, minPresentCount: 3, runThreshold: 6,
      isPresent: r => r.clockRaised === true,
    });
    if (r640a.fires) {
      issues.push({
        location: `longest stretch with no clock raised: ${r640a.longestRun} consecutive scenes`,
        rule: 'THEME_CLOCK_DROUGHT_RUN',
        severity: 'minor',
        description: `The story contains a run of ${r640a.longestRun} consecutive scenes with no clock raised at all, even though ${r640a.presentCount} scenes elsewhere do raise deadline pressure. An extended stretch where time pressure never registers is a run-based flatline in the clock channel — the theme's stakes go unpressed by urgency for that entire stretch.`,
        suggestedFix: `Raise the clock somewhere within the ${r640a.longestRun}-scene stretch — even a small reminder of the deadline keeps thematic pressure alive rather than letting it sit dormant.`,
      });
    }
  }

  // THEME_STAGING_PEAK_UNCAUSED — Backward-cause × visualBeats-density peak × revelation/
  // dramaticTurn cause. Built on checkPeakUncaused from the shared checks library. n≥8, ≥2 scenes
  // with visualBeats present, a 2-scene lookback. Finds the single scene with the most physical
  // staging beats and fires when neither that scene nor either of the 2 scenes before it contains
  // a revelation or a dramatic turn. First backward-cause check in this file. The story's single
  // most visually dense scene should be motivated by a disclosed truth or a pivot the theme is
  // dramatizing, not simply appear as unmotivated staging.
  {
    const r640b = checkPeakUncaused({
      records, minRecords: 8, minQualifying: 2, lookback: 2,
      magnitude: r => (r.visualBeats ?? []).length,
      hasCause: r => r.revelation != null || (r.dramaticTurn ?? 'nothing') !== 'nothing',
    });
    if (r640b.fires) {
      issues.push({
        location: `Scene at position ${r640b.peakIdx + 1} — peak physical staging (${r640b.peakMagnitude} beats) with no revelation or dramatic turn nearby`,
        rule: 'THEME_STAGING_PEAK_UNCAUSED',
        severity: 'minor',
        description: `The scene with the story's single densest physical staging (${r640b.peakMagnitude} visual beats, out of ${r640b.qualifyingCount} scenes with any staging at all) has no revelation and no dramatic turn in itself or in either of the 2 scenes before it. The moment the story invests most heavily in physical description arrives with no disclosure or pivot explaining why, leaving the theme's physical manifestation causally unmotivated.`,
        suggestedFix: `Add a revelation or a dramatic turn in the scene with the densest physical staging, or in one of the two scenes before it, so the theme's physical expression is earned rather than arbitrary.`,
      });
    }
  }

  // THEME_PAYOFF_ZONE_CLUSTER — Distribution/timing × payoffSetupIds × structural thirds. Built
  // on checkZoneCluster from the shared checks library. n≥9, ≥3 payoff scenes, more than 75%
  // falling in a single structural third → fire. First zone-cluster (thirds) check applied to
  // records in this pass — Wave 626's THEME_PAYOFF_ZONE_IMBALANCE used the four-zone template
  // instead. A story whose resolutions cluster overwhelmingly in one third gives the theme's
  // sense of closure a learnable, front- or back-loaded rhythm rather than a distributed release.
  {
    const r640c = checkZoneCluster({
      records, minRecords: 9, minCount: 3, ratioThreshold: 0.75,
      isPresent: r => (r.payoffSetupIds ?? []).length > 0,
    });
    if (r640c.fires) {
      const zoneName640c = r640c.zoneNames[r640c.maxZoneIdx];
      issues.push({
        location: `${zoneName640c} third — ${r640c.maxZoneCount}/${r640c.count} payoff scenes`,
        rule: 'THEME_PAYOFF_ZONE_CLUSTER',
        severity: 'minor',
        description: `${r640c.maxZoneCount} of the story's ${r640c.count} payoff scenes (${Math.round((r640c.maxZoneCount / r640c.count) * 100)}%) cluster in the ${zoneName640c} third. Thematic resolution concentrates almost exclusively in that stretch of the story rather than resolving gradually throughout.`,
        suggestedFix: `Resolve at least one thread outside the ${zoneName640c} third — spreading payoffs across the story lets the theme's sense of closure build gradually instead of arriving all at once.`,
      });
    }
  }

  // ── Wave 654: THEME_OPEN_THREAD_PEAK_UNCAUSED, THEME_HIGHLIGHT_DROUGHT_RUN,
  //              THEME_SEED_ZONE_CLUSTER ─────────────────────────────────────────────────────

  // THEME_OPEN_THREAD_PEAK_UNCAUSED — Single-peak isolation/backward-cause × unresolvedClues
  // magnitude. Built on checkPeakUncaused from the shared checks library. n≥8, ≥2 scenes carrying
  // outstanding clue-debt, a 2-scene lookback. Finds the single scene carrying the most
  // simultaneous open threads; fires when neither that scene nor either of the two before it
  // contains a dramatic turn or revelation. Wave 640's THEME_STAGING_PEAK_UNCAUSED applied the
  // peak-uncaused mode to visualBeats; unresolvedClues had only a single incidental mention in
  // this pass before this wave.
  {
    const r654a = checkPeakUncaused({
      records, minRecords: 8, minQualifying: 2, lookback: 2,
      magnitude: r => (r.unresolvedClues ?? []).length,
      hasCause: r => r.dramaticTurn !== 'nothing' || r.revelation != null,
    });
    if (r654a.fires) {
      issues.push({
        location: `scene ${r654a.peakIdx + 1} — peak open-thread density (${r654a.peakMagnitude}) with no dramatic turn or revelation nearby`,
        rule: 'THEME_OPEN_THREAD_PEAK_UNCAUSED',
        severity: 'minor',
        description: `The story's single densest scene for outstanding clue-debt (scene ${r654a.peakIdx + 1}, with ${r654a.peakMagnitude} open threads) has no dramatic turn or revelation in itself or the two scenes before it. The moment where unresolved mystery concentrates most heavily arrives without any structural pivot or disclosure driving it — the peak of accumulated question and the theme's sense of causal escalation never coincide.`,
        suggestedFix: `Give scene ${r654a.peakIdx + 1} — or one of the two scenes just before it — a dramatic turn or revelation, so the story's most mystery-dense moment is earned by a shift in the plot rather than arriving in a causal vacuum.`,
      });
    }
  }

  // THEME_HIGHLIGHT_DROUGHT_RUN — Run-based × dialogueHighlights absence. Built on checkDroughtRun
  // from the shared checks library. n≥10, ≥3 highlighted-dialogue scenes overall, fires when the
  // longest consecutive run of scenes with no highlighted dialogue reaches 6. Wave 640's
  // THEME_CLOCK_DROUGHT_RUN applied the drought-run mode to clockRaised; dialogueHighlights itself
  // has never been drought-audited here despite already anchoring the hand-rolled THEME_DIALOGUE_
  // PEAK_SILENT.
  {
    const r654b = checkDroughtRun({
      records, minRecords: 10, minPresentCount: 3, runThreshold: 6,
      isPresent: r => (r.dialogueHighlights ?? []).length > 0,
    });
    if (r654b.fires) {
      issues.push({
        location: `longest stretch with no highlighted dialogue: ${r654b.longestRun} consecutive scenes`,
        rule: 'THEME_HIGHLIGHT_DROUGHT_RUN',
        severity: 'minor',
        description: `The story contains a run of ${r654b.longestRun} consecutive scenes with no highlighted dialogue at all, even though ${r654b.presentCount} scenes elsewhere carry a standout line. A long unbroken stretch with nothing verbally memorable leaves the theme's most quotable articulations with no verbal high point to punctuate them.`,
        suggestedFix: `Give at least one scene within the ${r654b.longestRun}-scene stretch a standout line of dialogue — a character voicing something close to the theme memorably, keeping the verbal register alive throughout.`,
      });
    }
  }

  // THEME_SEED_ZONE_CLUSTER — Distribution/timing × seededClueIds × structural thirds. Built on
  // checkZoneCluster from the shared checks library. n≥9, ≥3 seed scenes, fires when >75% of them
  // fall in a single structural third. Wave 640's THEME_PAYOFF_ZONE_CLUSTER applied the
  // zone-cluster mode to payoffSetupIds; seededClueIds itself has never been cluster-audited here.
  {
    const r654c = checkZoneCluster({
      records, minRecords: 9, minCount: 3, ratioThreshold: 0.75,
      isPresent: r => (r.seededClueIds ?? []).length > 0,
    });
    if (r654c.fires) {
      const zoneName654c = r654c.zoneNames[r654c.maxZoneIdx];
      issues.push({
        location: `${zoneName654c} third — ${r654c.maxZoneCount}/${r654c.count} seed scenes`,
        rule: 'THEME_SEED_ZONE_CLUSTER',
        severity: 'minor',
        description: `${r654c.maxZoneCount} of the story's ${r654c.count} clue-planting scenes (${Math.round((r654c.maxZoneCount / r654c.count) * 100)}%) cluster in the ${zoneName654c} third. Foreshadowing concentrates almost exclusively in that stretch of the story rather than surfacing throughout, giving the theme's sense of gradual accumulation an uneven structural rhythm.`,
        suggestedFix: `Plant at least one clue outside the ${zoneName654c} third — spreading foreshadowing across the story lets the theme's sense of accumulating mystery build gradually instead of arriving all at once.`,
      });
    }
  }

  // ── Wave 668: THEME_RELATIONSHIP_PEAK_UNCAUSED, THEME_PAYOFF_DROUGHT_RUN,
  //              THEME_TURN_ZONE_CLUSTER ─────────────────────────────────────────────────────

  // THEME_RELATIONSHIP_PEAK_UNCAUSED — Single-peak isolation/backward-cause × relationshipShifts
  // magnitude. Built on checkPeakUncaused from the shared checks library. n≥8, ≥2 scenes carrying
  // a relationship shift, a 2-scene lookback. Finds the single scene with the most simultaneous
  // bond changes; fires when neither that scene nor either of the two before it contains a
  // dramatic turn or revelation. Distinct from the existing hand-rolled THEME_RELATIONSHIP_PEAK_
  // ABSENT (Wave 360), which checks whether the peak relational-shift scene lacks thematic
  // resonance, not whether it is backward-caused.
  {
    const r668a = checkPeakUncaused({
      records, minRecords: 8, minQualifying: 2, lookback: 2,
      magnitude: r => (r.relationshipShifts ?? []).length,
      hasCause: r => r.dramaticTurn !== 'nothing' || r.revelation != null,
    });
    if (r668a.fires) {
      issues.push({
        location: `scene ${r668a.peakIdx + 1} — peak relationship-shift density (${r668a.peakMagnitude}) with no dramatic turn or revelation nearby`,
        rule: 'THEME_RELATIONSHIP_PEAK_UNCAUSED',
        severity: 'minor',
        description: `The story's single densest scene for relationship shifts (scene ${r668a.peakIdx + 1}, with ${r668a.peakMagnitude} simultaneous bond changes) has no dramatic turn or revelation in itself or the two scenes before it. The moment where relational upheaval concentrates most heavily arrives without any structural pivot or disclosure driving it — an uncaused spike that undercuts the theme's sense of causal escalation.`,
        suggestedFix: `Give scene ${r668a.peakIdx + 1} — or one of the two scenes just before it — a dramatic turn or revelation, so the story's most relationally dense moment is earned by a shift in circumstance rather than arriving in a causal vacuum.`,
      });
    }
  }

  // THEME_PAYOFF_DROUGHT_RUN — Run-based × payoffSetupIds absence. Built on checkDroughtRun from
  // the shared checks library. n≥10, ≥3 payoff scenes overall, fires when the longest consecutive
  // run of scenes with zero thread resolution reaches 6. Wave 640 applied the drought-run mode to
  // clockRaised; payoffSetupIds itself has never been drought-audited despite anchoring THEME_
  // PAYOFF_ZONE_CLUSTER and THEME_PAYOFF_PEAK_ABSENT already.
  {
    const r668b = checkDroughtRun({
      records, minRecords: 10, minPresentCount: 3, runThreshold: 6,
      isPresent: r => (r.payoffSetupIds ?? []).length > 0,
    });
    if (r668b.fires) {
      issues.push({
        location: `longest stretch with no payoff: ${r668b.longestRun} consecutive scenes`,
        rule: 'THEME_PAYOFF_DROUGHT_RUN',
        severity: 'minor',
        description: `The story contains a run of ${r668b.longestRun} consecutive scenes with no thread resolving at all, even though ${r668b.presentCount} scenes elsewhere do pay off a setup. A long stretch where nothing resolves leaves the theme's sense of accumulating meaning dormant for an extended run.`,
        suggestedFix: `Resolve at least one thread somewhere within the ${r668b.longestRun}-scene stretch so the theme's sense of accumulating meaning keeps building throughout that stretch.`,
      });
    }
  }

  // THEME_TURN_ZONE_CLUSTER — Distribution/timing × dramaticTurn presence × structural thirds.
  // Built on checkZoneCluster from the shared checks library. n≥9, ≥3 dramatic-turn scenes, fires
  // when >75% of them fall in a single structural third. Waves 640/654 applied the zone-cluster
  // mode to payoffSetupIds and seededClueIds; dramaticTurn itself has never been cluster-audited
  // despite being the most heavily used field in this pass.
  {
    const r668c = checkZoneCluster({
      records, minRecords: 9, minCount: 3, ratioThreshold: 0.75,
      isPresent: r => (r.dramaticTurn ?? 'nothing') !== 'nothing',
    });
    if (r668c.fires) {
      const zoneName668c = r668c.zoneNames[r668c.maxZoneIdx];
      issues.push({
        location: `${zoneName668c} third — ${r668c.maxZoneCount}/${r668c.count} dramatic-turn scenes`,
        rule: 'THEME_TURN_ZONE_CLUSTER',
        severity: 'minor',
        description: `${r668c.maxZoneCount} of the story's ${r668c.count} dramatic-turn scenes (${Math.round((r668c.maxZoneCount / r668c.count) * 100)}%) cluster in the ${zoneName668c} third. Structural pivots concentrate almost exclusively in that stretch of the story rather than surfacing throughout, giving the theme's argument an uneven structural rhythm.`,
        suggestedFix: `Give at least one scene outside the ${zoneName668c} third a dramatic turn — spreading structural pivots across the story lets the theme's argument develop gradually instead of arriving all at once.`,
      });
    }
  }

  // ── Wave 682: THEME_CLOCK_DELTA_PEAK_UNCAUSED, THEME_STAGING_DROUGHT_RUN,
  //              THEME_CHARACTER_MOMENT_ZONE_CLUSTER ────────────────────────────────────────────

  // THEME_CLOCK_DELTA_PEAK_UNCAUSED — Single-peak isolation/backward-cause × clockDelta magnitude.
  // Built on checkPeakUncaused from the shared checks library. n≥8, ≥2 scenes with a nonzero clock
  // delta, a 2-scene lookback. Finds the single scene where the clock advances the most; fires when
  // neither that scene nor either of the two before it contains a dramatic turn or revelation.
  // Distinct from the existing hand-rolled THEME_CLOCK_PEAK_ABSENT (Wave 374), which checks whether
  // the peak clock-raising scene lacks thematic resonance keywords, not whether it is backward-caused.
  {
    const r682a = checkPeakUncaused({
      records, minRecords: 8, minQualifying: 2, lookback: 2,
      magnitude: r => Math.abs(r.clockDelta ?? 0),
      hasCause: r => r.dramaticTurn !== 'nothing' || r.revelation != null,
    });
    if (r682a.fires) {
      issues.push({
        location: `scene ${r682a.peakIdx + 1} — peak clock delta (${r682a.peakMagnitude}) with no dramatic turn or revelation nearby`,
        rule: 'THEME_CLOCK_DELTA_PEAK_UNCAUSED',
        severity: 'minor',
        description: `The story's single largest clock swing (scene ${r682a.peakIdx + 1}, delta magnitude ${r682a.peakMagnitude}) has no dramatic turn or revelation in itself or the two scenes before it. The moment where time pressure shifts most sharply arrives without any structural pivot or disclosure driving it — an uncaused spike that undercuts the theme's sense of causal escalation.`,
        suggestedFix: `Give scene ${r682a.peakIdx + 1} — or one of the two scenes just before it — a dramatic turn or revelation, so the story's sharpest clock swing is earned by a shift in circumstance rather than arriving in a causal vacuum.`,
      });
    }
  }

  // THEME_STAGING_DROUGHT_RUN — Run-based × visualBeats absence. Built on checkDroughtRun from the
  // shared checks library. n≥10, ≥3 scenes carrying a visual beat overall, fires when the longest
  // consecutive run of scenes with zero visual staging reaches 6. Waves 612/640/654/668 already
  // audit visualBeats via decoupling, four-zone imbalance, aftermath-silence, and peak-uncaused;
  // visualBeats itself has never been drought-audited here.
  {
    const r682b = checkDroughtRun({
      records, minRecords: 10, minPresentCount: 3, runThreshold: 6,
      isPresent: r => (r.visualBeats ?? []).length > 0,
    });
    if (r682b.fires) {
      issues.push({
        location: `longest stretch with no visual staging: ${r682b.longestRun} consecutive scenes`,
        rule: 'THEME_STAGING_DROUGHT_RUN',
        severity: 'minor',
        description: `The story contains a run of ${r682b.longestRun} consecutive scenes with no visual beat at all, even though ${r682b.presentCount} scenes elsewhere stage the theme visually. A long unbroken stretch with nothing to look at leaves the theme's imagery dormant for an extended run.`,
        suggestedFix: `Give at least one scene within the ${r682b.longestRun}-scene stretch a visual beat that stages the theme, keeping its imagery alive throughout.`,
      });
    }
  }

  // THEME_CHARACTER_MOMENT_ZONE_CLUSTER — Distribution/timing × purpose === 'character_moment' ×
  // structural thirds. Built on checkZoneCluster from the shared checks library. n≥9, ≥3
  // character-moment scenes, fires when >75% of them fall in a single structural third. The
  // `purpose` field has only ever been referenced incidentally in this file (a raise_stakes filter
  // at line 1392); this is the first standalone check on it here.
  {
    const r682c = checkZoneCluster({
      records, minRecords: 9, minCount: 3, ratioThreshold: 0.75,
      isPresent: r => r.purpose === 'character_moment',
    });
    if (r682c.fires) {
      const zoneName682c = r682c.zoneNames[r682c.maxZoneIdx];
      issues.push({
        location: `${zoneName682c} third — ${r682c.maxZoneCount}/${r682c.count} character-moment scenes`,
        rule: 'THEME_CHARACTER_MOMENT_ZONE_CLUSTER',
        severity: 'minor',
        description: `${r682c.maxZoneCount} of the story's ${r682c.count} character-moment scenes (${Math.round((r682c.maxZoneCount / r682c.count) * 100)}%) cluster in the ${zoneName682c} third. Scenes purposed to deepen character concentrate almost exclusively in that stretch rather than surfacing throughout, giving the theme's human throughline an uneven structural rhythm.`,
        suggestedFix: `Give at least one scene outside the ${zoneName682c} third a character-moment purpose — spreading character-deepening beats across the story keeps the theme's human throughline present at every stage.`,
      });
    }
  }

  // ── Wave 696: THEME_STAGING_ZONE_CLUSTER, THEME_PAYOFF_PEAK_UNCAUSED, THEME_SEED_DROUGHT_RUN ──

  // THEME_STAGING_ZONE_CLUSTER — Distribution/timing × visualBeats × structural thirds. Built on
  // checkZoneCluster from the shared checks library. n≥9, ≥3 visually-staged scenes, fires when
  // >75% of them fall in a single structural third. Completes this channel's coverage alongside
  // the existing peak-uncaused (Wave 640) and drought-run (Wave 682) checks.
  {
    const r696a = checkZoneCluster({
      records, minRecords: 9, minCount: 3, ratioThreshold: 0.75,
      isPresent: r => (r.visualBeats ?? []).length >= 2,
    });
    if (r696a.fires) {
      const zoneName696a = r696a.zoneNames[r696a.maxZoneIdx];
      issues.push({
        location: `${zoneName696a} third — ${r696a.maxZoneCount}/${r696a.count} visually dense scenes`,
        rule: 'THEME_STAGING_ZONE_CLUSTER',
        severity: 'minor',
        description: `${r696a.maxZoneCount} of the story's ${r696a.count} visually dense scenes (${Math.round((r696a.maxZoneCount / r696a.count) * 100)}%) cluster in the ${zoneName696a} third. Physical staging concentrates almost exclusively in that stretch of the story rather than surfacing throughout, giving the theme's physical manifestation an uneven structural rhythm.`,
        suggestedFix: `Give at least one scene outside the ${zoneName696a} third substantial physical staging — spreading physical expression of the theme across the story lets each structural third carry its own embodiment of it.`,
      });
    }
  }

  // THEME_PAYOFF_PEAK_UNCAUSED — Single-peak isolation/backward-cause × payoffSetupIds magnitude.
  // Built on checkPeakUncaused from the shared checks library. n≥8, ≥2 payoff scenes, a 2-scene
  // lookback. Finds the single scene with the most simultaneous thread resolutions; fires when
  // neither that scene nor either of the two before it contains a dramatic turn or revelation.
  // Completes this channel's coverage alongside the existing zone-cluster (Wave 640) and
  // drought-run (Wave 668) checks.
  {
    const r696b = checkPeakUncaused({
      records, minRecords: 8, minQualifying: 2, lookback: 2,
      magnitude: r => (r.payoffSetupIds ?? []).length,
      hasCause: r => r.dramaticTurn !== 'nothing' || r.revelation != null,
    });
    if (r696b.fires) {
      issues.push({
        location: `scene ${r696b.peakIdx + 1} — peak payoff density (${r696b.peakMagnitude}) with no dramatic turn or revelation nearby`,
        rule: 'THEME_PAYOFF_PEAK_UNCAUSED',
        severity: 'minor',
        description: `The story's single densest scene for thread resolution (scene ${r696b.peakIdx + 1}, with ${r696b.peakMagnitude} payoffs resolving at once) has no dramatic turn or revelation in itself or the two scenes before it. The moment where the most convergent resolution lands arrives without any structural pivot or disclosure driving it — the peak of narrative payoff carries no causal weight behind it.`,
        suggestedFix: `Give scene ${r696b.peakIdx + 1} — or one of the two scenes just before it — a dramatic turn or revelation, so the story's most convergent resolution is earned by a shift in the plot rather than arriving in a causal vacuum.`,
      });
    }
  }

  // THEME_SEED_DROUGHT_RUN — Run-based × seededClueIds absence. Built on checkDroughtRun from the
  // shared checks library. n≥10, ≥3 seed scenes overall, fires when the longest consecutive run of
  // scenes with zero clue seeded reaches 6. Wave 654 applied the zone-cluster mode to
  // seededClueIds; the drought-run mode has never been applied to this channel.
  {
    const r696c = checkDroughtRun({
      records, minRecords: 10, minPresentCount: 3, runThreshold: 6,
      isPresent: r => (r.seededClueIds ?? []).length > 0,
    });
    if (r696c.fires) {
      issues.push({
        location: `longest stretch with no clue seeded: ${r696c.longestRun} consecutive scenes`,
        rule: 'THEME_SEED_DROUGHT_RUN',
        severity: 'minor',
        description: `The story contains a run of ${r696c.longestRun} consecutive scenes with no clue seeded at all, even though ${r696c.presentCount} scenes elsewhere do plant new material. A long unbroken stretch where nothing new is planted leaves the theme's sense of gradual accumulation dormant for an extended run.`,
        suggestedFix: `Seed a new clue or thread somewhere within the ${r696c.longestRun}-scene stretch so the theme's sense of accumulating mystery keeps building throughout that stretch.`,
      });
    }
  }

  // ── Wave 710: THEME_CLOCK_ZONE_CLUSTER, THEME_OPEN_THREAD_DROUGHT_RUN, THEME_SEED_PEAK_UNCAUSED ──

  // THEME_CLOCK_ZONE_CLUSTER — Distribution/timing × clockRaised × structural thirds. Built on
  // checkZoneCluster from the shared checks library. n≥9, ≥3 clock-raised scenes, fires when >75%
  // of them fall in a single structural third. Wave 640 applied the drought-run mode to
  // clockRaised; the zone-cluster mode has never been applied to this channel.
  {
    const r710a = checkZoneCluster({
      records, minRecords: 9, minCount: 3, ratioThreshold: 0.75,
      isPresent: r => r.clockRaised === true,
    });
    if (r710a.fires) {
      const zoneName710a = r710a.zoneNames[r710a.maxZoneIdx];
      issues.push({
        location: `${zoneName710a} third — ${r710a.maxZoneCount}/${r710a.count} clock-raised scenes`,
        rule: 'THEME_CLOCK_ZONE_CLUSTER',
        severity: 'minor',
        description: `${r710a.maxZoneCount} of the story's ${r710a.count} clock-raised scenes (${Math.round((r710a.maxZoneCount / r710a.count) * 100)}%) cluster in the ${zoneName710a} third. Time pressure concentrates almost exclusively in that stretch of the story rather than surfacing throughout, giving the theme's sense of mounting urgency an uneven structural rhythm.`,
        suggestedFix: `Raise a clock in at least one scene outside the ${zoneName710a} third — spreading time pressure across the story lets every structural third carry some thematic urgency.`,
      });
    }
  }

  // THEME_OPEN_THREAD_DROUGHT_RUN — Run-based × unresolvedClues absence. Built on checkDroughtRun
  // from the shared checks library. n≥10, ≥3 open-thread scenes overall, fires when the longest
  // consecutive run of scenes with zero outstanding clue-debt reaches 6. Wave 654 applied the
  // backward-cause peak mode to unresolvedClues; the drought-run mode has never been applied to
  // this channel.
  {
    const r710b = checkDroughtRun({
      records, minRecords: 10, minPresentCount: 3, runThreshold: 6,
      isPresent: r => (r.unresolvedClues ?? []).length > 0,
    });
    if (r710b.fires) {
      issues.push({
        location: `longest stretch with no outstanding clue-debt: ${r710b.longestRun} consecutive scenes`,
        rule: 'THEME_OPEN_THREAD_DROUGHT_RUN',
        severity: 'minor',
        description: `The story contains a run of ${r710b.longestRun} consecutive scenes with no outstanding clue-debt at all, even though ${r710b.presentCount} scenes elsewhere do carry open mysteries. A long stretch where nothing is left unresolved leaves the theme's sense of gathering mystery dormant for an extended run.`,
        suggestedFix: `Seed a new thread somewhere within the ${r710b.longestRun}-scene stretch so the theme's sense of accumulating mystery keeps building throughout that stretch.`,
      });
    }
  }

  // THEME_SEED_PEAK_UNCAUSED — Single-peak isolation/backward-cause × seededClueIds magnitude.
  // Built on checkPeakUncaused from the shared checks library. n≥8, ≥2 seed scenes, a 2-scene
  // lookback. Finds the single scene with the most simultaneous clues planted; fires when neither
  // that scene nor either of the two before it contains a dramatic turn or revelation. Waves
  // 654/696 applied the zone-cluster and drought-run modes to seededClueIds; the backward-cause
  // peak mode has never been applied to it, completing the trio.
  {
    const r710c = checkPeakUncaused({
      records, minRecords: 8, minQualifying: 2, lookback: 2,
      magnitude: r => (r.seededClueIds ?? []).length,
      hasCause: r => r.dramaticTurn !== 'nothing' || r.revelation != null,
    });
    if (r710c.fires) {
      issues.push({
        location: `scene ${r710c.peakIdx + 1} — peak seed density (${r710c.peakMagnitude}) with no dramatic turn or revelation nearby`,
        rule: 'THEME_SEED_PEAK_UNCAUSED',
        severity: 'minor',
        description: `The story's single densest scene for planting new clues (scene ${r710c.peakIdx + 1}, with ${r710c.peakMagnitude} clues seeded at once) has no dramatic turn or revelation in itself or the two scenes before it. The moment where foreshadowing concentrates most heavily arrives without any structural pivot or disclosure driving it — an uncaused spike that undercuts the theme's sense of causal escalation.`,
        suggestedFix: `Give scene ${r710c.peakIdx + 1} — or one of the two scenes just before it — a dramatic turn or revelation, so the story's most seed-dense moment is earned by a shift in circumstance rather than arriving in a causal vacuum.`,
      });
    }
  }

  // ── Wave 724: THEME_OPEN_THREAD_ZONE_CLUSTER, THEME_HIGHLIGHT_PEAK_UNCAUSED,
  //              THEME_RELATIONSHIP_DROUGHT_RUN ────────────────────────────────────────────

  // THEME_OPEN_THREAD_ZONE_CLUSTER — Distribution/timing × unresolvedClues × structural thirds.
  // Built on checkZoneCluster from the shared checks library. n≥9, ≥3 open-thread scenes, fires
  // when >75% of them fall in a single structural third. Waves 654/710 applied the backward-
  // cause peak and drought-run modes to unresolvedClues; the zone-cluster mode has never been
  // applied to it, completing the trio.
  {
    const r724a = checkZoneCluster({
      records, minRecords: 9, minCount: 3, ratioThreshold: 0.75,
      isPresent: r => (r.unresolvedClues ?? []).length > 0,
    });
    if (r724a.fires) {
      const zoneName724a = r724a.zoneNames[r724a.maxZoneIdx];
      issues.push({
        location: `${zoneName724a} third — ${r724a.maxZoneCount}/${r724a.count} open-thread scenes`,
        rule: 'THEME_OPEN_THREAD_ZONE_CLUSTER',
        severity: 'minor',
        description: `${r724a.maxZoneCount} of the story's ${r724a.count} scenes carrying outstanding clue-debt (${Math.round((r724a.maxZoneCount / r724a.count) * 100)}%) cluster in the ${zoneName724a} third. Open questions concentrate almost exclusively in that stretch of the story rather than persisting throughout, giving the theme's sense of gathering mystery an uneven structural rhythm.`,
        suggestedFix: `Let a clue remain unresolved into a scene outside the ${zoneName724a} third — spreading open threads across the story lets the theme's sense of accumulating mystery build gradually instead of arriving all at once.`,
      });
    }
  }

  // THEME_HIGHLIGHT_PEAK_UNCAUSED — Single-peak isolation/backward-cause × dialogueHighlights
  // magnitude. Built on checkPeakUncaused from the shared checks library. n≥8, ≥2 scenes carrying
  // a dialogue highlight, a 2-scene lookback. Finds the single scene with the most highlighted
  // lines; fires when neither that scene nor either of the two before it contains a dramatic turn
  // or revelation. Wave 654 applied the drought-run mode to dialogueHighlights; the backward-
  // cause peak mode has never been applied to it.
  {
    const r724b = checkPeakUncaused({
      records, minRecords: 8, minQualifying: 2, lookback: 2,
      magnitude: r => (r.dialogueHighlights ?? []).length,
      hasCause: r => r.dramaticTurn !== 'nothing' || r.revelation != null,
    });
    if (r724b.fires) {
      issues.push({
        location: `scene ${r724b.peakIdx + 1} — peak highlighted-dialogue density (${r724b.peakMagnitude}) with no dramatic turn or revelation nearby`,
        rule: 'THEME_HIGHLIGHT_PEAK_UNCAUSED',
        severity: 'minor',
        description: `The story's single densest scene for highlighted dialogue (scene ${r724b.peakIdx + 1}, with ${r724b.peakMagnitude} standout lines) has no dramatic turn or revelation in itself or the two scenes before it. The moment where the script's most memorable dialogue concentrates arrives without any structural pivot or disclosure driving it — the peak of verbal craft and the peak of thematic resonance never coincide.`,
        suggestedFix: `Give scene ${r724b.peakIdx + 1} — or one of the two scenes just before it — a dramatic turn or revelation, so the story's most quotable moment is earned by a shift in the plot rather than arriving in a causal vacuum.`,
      });
    }
  }

  // THEME_RELATIONSHIP_DROUGHT_RUN — Run-based × relationshipShifts absence. Built on
  // checkDroughtRun from the shared checks library. n≥10, ≥3 relationship-shift scenes overall,
  // fires when the longest consecutive run of scenes with zero bond changes reaches 6. Wave 668
  // applied the backward-cause peak mode to relationshipShifts; the drought-run mode has never
  // been applied to it.
  {
    const r724c = checkDroughtRun({
      records, minRecords: 10, minPresentCount: 3, runThreshold: 6,
      isPresent: r => (r.relationshipShifts ?? []).length > 0,
    });
    if (r724c.fires) {
      issues.push({
        location: `longest stretch with no relationship shift: ${r724c.longestRun} consecutive scenes`,
        rule: 'THEME_RELATIONSHIP_DROUGHT_RUN',
        severity: 'minor',
        description: `The story contains a run of ${r724c.longestRun} consecutive scenes with no relationship shift at all, even though ${r724c.presentCount} scenes elsewhere do move a bond. A long unbroken stretch where no relationship moves leaves the theme's human throughline dormant for an extended run.`,
        suggestedFix: `Let a bond shift somewhere within the ${r724c.longestRun}-scene stretch — even a small movement keeps the theme's human throughline alive throughout that stretch.`,
      });
    }
  }

  // ── Wave 738: THEME_HIGHLIGHT_ZONE_CLUSTER, THEME_RELATIONSHIP_ZONE_CLUSTER,
  //              THEME_CLOCK_DELTA_DROUGHT_RUN ─────────────────────────────────────────────

  // THEME_HIGHLIGHT_ZONE_CLUSTER — Distribution/timing × dialogueHighlights × structural thirds.
  // Built on checkZoneCluster from the shared checks library. n≥9, ≥3 highlighted-dialogue
  // scenes, fires when more than 75% of those scenes cluster in a single third. Waves 654/724
  // applied the run-based drought and backward-cause peak modes to dialogueHighlights; the
  // zone-cluster mode has never been applied to it, completing the trio.
  {
    const r738a = checkZoneCluster({
      records, minRecords: 9, minCount: 3, ratioThreshold: 0.75,
      isPresent: r => (r.dialogueHighlights ?? []).length > 0,
    });
    if (r738a.fires) {
      issues.push({
        location: `${r738a.zoneNames[r738a.maxZoneIdx]} third — ${r738a.maxZoneCount} of ${r738a.count} highlighted-dialogue scenes`,
        rule: 'THEME_HIGHLIGHT_ZONE_CLUSTER',
        severity: 'minor',
        description: `${Math.round((r738a.maxZoneCount / r738a.count) * 100)}% of the story's standout dialogue clusters in the ${r738a.zoneNames[r738a.maxZoneIdx]} third. When every memorable line lands in the same structural window, the theme has no verbal reinforcement anywhere else in the story.`,
        suggestedFix: `Give at least one scene outside the ${r738a.zoneNames[r738a.maxZoneIdx]} third a standout line of dialogue so the theme keeps getting stated more evenly across the story.`,
      });
    }
  }

  // THEME_RELATIONSHIP_ZONE_CLUSTER — Distribution/timing × relationshipShifts × structural
  // thirds. Built on checkZoneCluster from the shared checks library. n≥9, ≥3 relationship-shift
  // scenes, fires when more than 75% of those scenes cluster in a single third. Waves 668/724
  // applied the backward-cause peak and run-based drought modes to relationshipShifts; the
  // zone-cluster mode has never been applied to it, completing the trio.
  {
    const r738b = checkZoneCluster({
      records, minRecords: 9, minCount: 3, ratioThreshold: 0.75,
      isPresent: r => (r.relationshipShifts ?? []).length > 0,
    });
    if (r738b.fires) {
      issues.push({
        location: `${r738b.zoneNames[r738b.maxZoneIdx]} third — ${r738b.maxZoneCount} of ${r738b.count} relationship-shift scenes`,
        rule: 'THEME_RELATIONSHIP_ZONE_CLUSTER',
        severity: 'minor',
        description: `${Math.round((r738b.maxZoneCount / r738b.count) * 100)}% of the story's relationship-shift scenes cluster in the ${r738b.zoneNames[r738b.maxZoneIdx]} third. When every bond change lands in the same structural window, the theme has no relational testing ground anywhere else in the story.`,
        suggestedFix: `Move at least one relationship shift outside the ${r738b.zoneNames[r738b.maxZoneIdx]} third so the theme keeps being tested through relationships more evenly across the story.`,
      });
    }
  }

  // THEME_CLOCK_DELTA_DROUGHT_RUN — Run-based × clockDelta≠0 absence. Built on checkDroughtRun
  // from the shared checks library. n≥10, ≥3 clock-shifting scenes overall, fires when the
  // longest consecutive run of scenes with zero clock movement reaches 6. Wave 682 applied the
  // backward-cause peak mode to clockDelta; the drought-run mode has never been applied to it.
  {
    const r738c = checkDroughtRun({
      records, minRecords: 10, minPresentCount: 3, runThreshold: 6,
      isPresent: r => (r.clockDelta ?? 0) !== 0,
    });
    if (r738c.fires) {
      issues.push({
        location: `longest stretch with no clock movement: ${r738c.longestRun} consecutive scenes`,
        rule: 'THEME_CLOCK_DELTA_DROUGHT_RUN',
        severity: 'minor',
        description: `The story contains a run of ${r738c.longestRun} consecutive scenes with zero movement on the ticking clock at all, even though ${r738c.presentCount} scenes elsewhere do shift it. A long unbroken stretch where nothing tightens or loosens the deadline leaves the theme without any external pressure testing it for an extended run.`,
        suggestedFix: `Move the clock — tighten or ease the deadline — somewhere within the ${r738c.longestRun}-scene stretch so external pressure keeps testing the theme throughout that stretch.`,
      });
    }
  }

  // ── Wave 752: THEME_CLOCK_DELTA_ZONE_CLUSTER, THEME_TURN_DROUGHT_RUN,
  //              THEME_CHARACTER_MOMENT_DROUGHT_RUN ─────────────────────────────────────────

  // THEME_CLOCK_DELTA_ZONE_CLUSTER — Distribution/timing × clockDelta≠0 presence × structural
  // thirds. Built on checkZoneCluster from the shared checks library. n≥9, ≥3 clock-shifting
  // scenes, fires when more than 75% of those scenes cluster in a single third. Waves 682/738
  // applied the backward-cause peak and run-based drought modes to clockDelta; the zone-cluster
  // mode has never been applied to it, completing the trio.
  {
    const r752a = checkZoneCluster({
      records, minRecords: 9, minCount: 3, ratioThreshold: 0.75,
      isPresent: r => (r.clockDelta ?? 0) !== 0,
    });
    if (r752a.fires) {
      issues.push({
        location: `${r752a.zoneNames[r752a.maxZoneIdx]} third — ${r752a.maxZoneCount} of ${r752a.count} clock-shifting scenes`,
        rule: 'THEME_CLOCK_DELTA_ZONE_CLUSTER',
        severity: 'minor',
        description: `${Math.round((r752a.maxZoneCount / r752a.count) * 100)}% of the scenes that move the ticking clock cluster in the ${r752a.zoneNames[r752a.maxZoneIdx]} third. When every clock movement lands in the same structural window, the theme has no external pressure testing it anywhere else in the story.`,
        suggestedFix: `Move at least one clock-shifting beat outside the ${r752a.zoneNames[r752a.maxZoneIdx]} third so external pressure keeps testing the theme more evenly across the story.`,
      });
    }
  }

  // THEME_TURN_DROUGHT_RUN — Run-based × dramaticTurn !== 'nothing' absence. Built on
  // checkDroughtRun from the shared checks library. n≥10, ≥3 turn scenes overall, fires when the
  // longest consecutive run of scenes with no dramatic turn reaches 6. Wave 668 applied the
  // zone-cluster mode to this signal; the drought-run mode has never been applied to it.
  {
    const r752b = checkDroughtRun({
      records, minRecords: 10, minPresentCount: 3, runThreshold: 6,
      isPresent: r => (r.dramaticTurn ?? 'nothing') !== 'nothing',
    });
    if (r752b.fires) {
      issues.push({
        location: `longest stretch with no dramatic turn: ${r752b.longestRun} consecutive scenes`,
        rule: 'THEME_TURN_DROUGHT_RUN',
        severity: 'minor',
        description: `The story contains a run of ${r752b.longestRun} consecutive scenes with no dramatic turn at all, even though ${r752b.presentCount} scenes elsewhere do pivot. A long unbroken stretch with nothing reversing or complicating the situation leaves the theme with no structural pivot to test it for an extended run.`,
        suggestedFix: `Introduce a dramatic turn somewhere within the ${r752b.longestRun}-scene stretch so the theme keeps a structural pivot pressing on it throughout that stretch.`,
      });
    }
  }

  // THEME_CHARACTER_MOMENT_DROUGHT_RUN — Run-based × purpose === 'character_moment' absence.
  // Built on checkDroughtRun from the shared checks library. n≥10, ≥3 character-moment scenes
  // overall, fires when the longest consecutive run of scenes purposed otherwise reaches 6. Wave
  // 682 applied the zone-cluster mode to this signal; the drought-run mode has never been applied
  // to it.
  {
    const r752c = checkDroughtRun({
      records, minRecords: 10, minPresentCount: 3, runThreshold: 6,
      isPresent: r => r.purpose === 'character_moment',
    });
    if (r752c.fires) {
      issues.push({
        location: `longest stretch with no character-moment scene: ${r752c.longestRun} consecutive scenes`,
        rule: 'THEME_CHARACTER_MOMENT_DROUGHT_RUN',
        severity: 'minor',
        description: `The story contains a run of ${r752c.longestRun} consecutive scenes purposed otherwise than a character moment, even though ${r752c.presentCount} scenes elsewhere are dedicated to the protagonist's inner life. A long unbroken stretch with nothing but plot-forward scenes leaves the theme with no interior beat to be voiced through for an extended run.`,
        suggestedFix: `Purpose at least one scene within the ${r752c.longestRun}-scene stretch as a character moment so the theme keeps a beat of interior reflection to be voiced through throughout that stretch.`,
      });
    }
  }

  // ── Wave 766: THEME_SUSPENSE_ZONE_CLUSTER, THEME_CURIOSITY_ZONE_CLUSTER,
  //              THEME_SUSPENSE_PEAK_UNCAUSED ─────────────────────────────────────

  // THEME_SUSPENSE_ZONE_CLUSTER — Distribution/timing × suspenseDelta>0 presence × structural
  // thirds. Built on checkZoneCluster from the shared checks library. n≥9, ≥3 suspense-positive
  // scenes, fires when more than 75% of those scenes cluster in a single third. Existing suspense
  // checks in this pass are co-occurrence (does the group of high-suspense scenes carry theme) and
  // peak-resonance-absence (does the single peak scene carry theme); the shared-library
  // thirds-based cluster mode has never been applied to it.
  {
    const r766a = checkZoneCluster({
      records, minRecords: 9, minCount: 3, ratioThreshold: 0.75,
      isPresent: r => (r.suspenseDelta ?? 0) > 0,
    });
    if (r766a.fires) {
      issues.push({
        location: `${r766a.zoneNames[r766a.maxZoneIdx]} third — ${r766a.maxZoneCount} of ${r766a.count} suspense-positive scenes`,
        rule: 'THEME_SUSPENSE_ZONE_CLUSTER',
        severity: 'minor',
        description: `${Math.round((r766a.maxZoneCount / r766a.count) * 100)}% of the scenes where tension rises cluster in the ${r766a.zoneNames[r766a.maxZoneIdx]} third. When every suspense spike lands in the same structural window, the theme has no rising tension testing it anywhere else across the story.`,
        suggestedFix: `Raise suspense in at least one scene outside the ${r766a.zoneNames[r766a.maxZoneIdx]} third so tension keeps pressing on the theme more evenly across the story.`,
      });
    }
  }

  // THEME_CURIOSITY_ZONE_CLUSTER — Distribution/timing × curiosityDelta>0 presence × structural
  // thirds. Built on checkZoneCluster from the shared checks library. n≥9, ≥3 curiosity-positive
  // scenes, fires when more than 75% of those scenes cluster in a single third. Existing curiosity
  // checks are co-occurrence and peak-resonance-absence; the shared-library cluster mode has never
  // been applied to it.
  {
    const r766b = checkZoneCluster({
      records, minRecords: 9, minCount: 3, ratioThreshold: 0.75,
      isPresent: r => (r.curiosityDelta ?? 0) > 0,
    });
    if (r766b.fires) {
      issues.push({
        location: `${r766b.zoneNames[r766b.maxZoneIdx]} third — ${r766b.maxZoneCount} of ${r766b.count} curiosity-positive scenes`,
        rule: 'THEME_CURIOSITY_ZONE_CLUSTER',
        severity: 'minor',
        description: `${Math.round((r766b.maxZoneCount / r766b.count) * 100)}% of the scenes where curiosity rises cluster in the ${r766b.zoneNames[r766b.maxZoneIdx]} third. When every question the story raises lands in the same structural window, the theme has no fresh mystery pulling the audience through the rest of the piece.`,
        suggestedFix: `Raise curiosity in at least one scene outside the ${r766b.zoneNames[r766b.maxZoneIdx]} third so questions keep pulling the audience toward the theme more evenly across the story.`,
      });
    }
  }

  // THEME_SUSPENSE_PEAK_UNCAUSED — Backward-cause × suspenseDelta-as-magnitude × 2-scene lookback.
  // Built on checkPeakUncaused from the shared checks library. n≥8, ≥2 suspense-positive scenes,
  // fires when the peak (earliest, on magnitude ties) suspense scene has no dramatic turn or
  // revelation in the 2 scenes preceding it. THEME_SUSPENSE_PEAK_ABSENT audits whether the peak
  // scene ITSELF carries thematic resonance; this looks backward from the peak for a structural
  // cause, a wholly different analytical claim, so the shared-library backward-cause mode has
  // never been applied to suspenseDelta.
  {
    const r766c = checkPeakUncaused({
      records, minRecords: 8, minQualifying: 2, lookback: 2,
      magnitude: r => r.suspenseDelta ?? 0,
      hasCause: r => (r.dramaticTurn ?? 'nothing') !== 'nothing' || r.revelation != null,
    });
    if (r766c.fires) {
      issues.push({
        location: `scene ${r766c.peakIdx} (peak suspenseDelta ${r766c.peakMagnitude}) — no preparing cause nearby`,
        rule: 'THEME_SUSPENSE_PEAK_UNCAUSED',
        severity: 'minor',
        description: `The story's single highest-suspense scene (Scene ${r766c.peakIdx}, suspenseDelta ${r766c.peakMagnitude}) arrives with no dramatic turn or revelation in the 2 scenes leading into it, even though ${r766c.qualifyingCount} scenes elsewhere carry tension. The moment the audience is most gripped lands out of nowhere — nothing in the theme's structural build-up prepared this peak.`,
        suggestedFix: `Add a dramatic turn or revelation in one of the 2 scenes before scene ${r766c.peakIdx} so the theme earns its peak suspense instead of springing it without preparation.`,
      });
    }
  }

  // ── Wave 780: THEME_SUSPENSE_DROUGHT_RUN, THEME_CURIOSITY_DROUGHT_RUN,
  //              THEME_CURIOSITY_PEAK_UNCAUSED ──────────────────────────────────────

  // THEME_SUSPENSE_DROUGHT_RUN — Run-based × suspenseDelta>0 absence. Built on checkDroughtRun
  // from the shared checks library. n≥10, ≥3 suspense-positive scenes overall, fires when the
  // longest consecutive run of scenes with no rising tension reaches 6. Wave 766 applied the
  // zone-cluster and backward-cause peak modes to suspenseDelta; the run-based drought mode has
  // never been applied to it, completing the trio.
  {
    const r780a = checkDroughtRun({
      records, minRecords: 10, minPresentCount: 3, runThreshold: 6,
      isPresent: r => (r.suspenseDelta ?? 0) > 0,
    });
    if (r780a.fires) {
      issues.push({
        location: `longest stretch with no rising suspense: ${r780a.longestRun} consecutive scenes`,
        rule: 'THEME_SUSPENSE_DROUGHT_RUN',
        severity: 'minor',
        description: `The story contains a run of ${r780a.longestRun} consecutive scenes with no rise in suspense at all, even though ${r780a.presentCount} scenes elsewhere do spike. A long unbroken stretch with nothing tightening the danger leaves the theme with no rising tension pressing on it for an extended run.`,
        suggestedFix: `Raise suspense somewhere within the ${r780a.longestRun}-scene stretch so the theme keeps rising tension pressing on it throughout that stretch.`,
      });
    }
  }

  // THEME_CURIOSITY_DROUGHT_RUN — Run-based × curiosityDelta>0 absence. Built on checkDroughtRun
  // from the shared checks library. n≥10, ≥3 curiosity-positive scenes overall, fires when the
  // longest consecutive run of scenes with no curiosity rise reaches 6. Wave 766 applied the
  // zone-cluster mode to curiosityDelta; the run-based drought mode has never been applied to it.
  {
    const r780b = checkDroughtRun({
      records, minRecords: 10, minPresentCount: 3, runThreshold: 6,
      isPresent: r => (r.curiosityDelta ?? 0) > 0,
    });
    if (r780b.fires) {
      issues.push({
        location: `longest stretch with no rising curiosity: ${r780b.longestRun} consecutive scenes`,
        rule: 'THEME_CURIOSITY_DROUGHT_RUN',
        severity: 'minor',
        description: `The story contains a run of ${r780b.longestRun} consecutive scenes with no rise in curiosity at all, even though ${r780b.presentCount} scenes elsewhere do spark wonder. A long unbroken stretch with nothing new to wonder about leaves the theme with no fresh question keeping it alive for an extended run.`,
        suggestedFix: `Raise curiosity somewhere within the ${r780b.longestRun}-scene stretch so the theme keeps a live question pulling the audience through that stretch.`,
      });
    }
  }

  // THEME_CURIOSITY_PEAK_UNCAUSED — Backward-cause × curiosityDelta-as-magnitude × 2-scene
  // lookback. Built on checkPeakUncaused from the shared checks library. n≥8, ≥2 curiosity-
  // positive scenes, fires when the peak curiosity scene has no dramatic turn or revelation in
  // the 2 scenes preceding it. THEME_CURIOSITY_PEAK_ABSENT audits whether the peak scene ITSELF
  // carries thematic resonance; this looks backward from the peak for a structural cause, a
  // wholly different analytical claim, so the shared-library backward-cause mode has never been
  // applied to curiosityDelta, completing the trio.
  {
    const r780c = checkPeakUncaused({
      records, minRecords: 8, minQualifying: 2, lookback: 2,
      magnitude: r => r.curiosityDelta ?? 0,
      hasCause: r => (r.dramaticTurn ?? 'nothing') !== 'nothing' || r.revelation != null,
    });
    if (r780c.fires) {
      issues.push({
        location: `scene ${r780c.peakIdx} (peak curiosityDelta ${r780c.peakMagnitude}) — no preparing cause nearby`,
        rule: 'THEME_CURIOSITY_PEAK_UNCAUSED',
        severity: 'minor',
        description: `The story's single highest-curiosity scene (Scene ${r780c.peakIdx}, curiosityDelta ${r780c.peakMagnitude}) arrives with no dramatic turn or revelation in the 2 scenes leading into it, even though ${r780c.qualifyingCount} scenes elsewhere spark wonder. The moment the audience is most gripped by an open question lands out of nowhere — nothing in the theme's structural build-up prepared this peak.`,
        suggestedFix: `Add a dramatic turn or revelation in one of the 2 scenes before scene ${r780c.peakIdx} so the theme earns its peak curiosity instead of springing it without preparation.`,
      });
    }
  }

  // ── Wave 794: THEME_REVELATION_ZONE_CLUSTER, THEME_REVELATION_DROUGHT_RUN,
  //              THEME_NEGATIVE_EMOTION_ZONE_CLUSTER ──────────────────────────────────────

  // THEME_REVELATION_ZONE_CLUSTER — Distribution/timing × revelation × structural thirds. Built
  // on checkZoneCluster from the shared checks library. n≥9, ≥3 revelation scenes, fires when
  // more than 75% of them fall in a single structural third. Existing revelation checks in this
  // pass are co-occurrence (THEME_REVELATION_DECOUPLED), zone/scene-scoped absence
  // (THEME_REVELATION_SILENT), and aftermath (THEME_REVELATION_AFTERMATH_SILENT); none of the
  // shared-library trio modes has ever been applied to revelation as the primary signal.
  {
    const r794a = checkZoneCluster({
      records, minRecords: 9, minCount: 3, ratioThreshold: 0.75,
      isPresent: r => r.revelation != null,
    });
    if (r794a.fires) {
      issues.push({
        location: `${r794a.zoneNames[r794a.maxZoneIdx]} third — ${r794a.maxZoneCount} of ${r794a.count} revelation scenes`,
        rule: 'THEME_REVELATION_ZONE_CLUSTER',
        severity: 'minor',
        description: `${Math.round((r794a.maxZoneCount / r794a.count) * 100)}% of the story's revelation scenes cluster in the ${r794a.zoneNames[r794a.maxZoneIdx]} third. When every disclosure lands in the same structural window, the theme has no fresh truth reshaping it anywhere else across the story.`,
        suggestedFix: `Move at least one revelation outside the ${r794a.zoneNames[r794a.maxZoneIdx]} third so the theme keeps being reframed by new disclosures more evenly across the story.`,
      });
    }
  }

  // THEME_REVELATION_DROUGHT_RUN — Run-based × revelation absence. Built on checkDroughtRun from
  // the shared checks library. n≥10, ≥3 revelation scenes overall, fires when the longest
  // consecutive run of scenes with no revelation reaches 6. Completes 2 of 3 trio slots for
  // revelation alongside the zone-cluster mode added in this same wave.
  {
    const r794b = checkDroughtRun({
      records, minRecords: 10, minPresentCount: 3, runThreshold: 6,
      isPresent: r => r.revelation != null,
    });
    if (r794b.fires) {
      issues.push({
        location: `longest stretch with no revelation: ${r794b.longestRun} consecutive scenes`,
        rule: 'THEME_REVELATION_DROUGHT_RUN',
        severity: 'minor',
        description: `The story contains a run of ${r794b.longestRun} consecutive scenes with no revelation at all, even though ${r794b.presentCount} scenes elsewhere disclose a truth. A long unbroken stretch with nothing new coming to light leaves the theme with no fresh disclosure reshaping it for an extended run.`,
        suggestedFix: `Let a truth surface somewhere within the ${r794b.longestRun}-scene stretch so the theme keeps being reshaped by new disclosures throughout that stretch.`,
      });
    }
  }

  // THEME_NEGATIVE_EMOTION_ZONE_CLUSTER — Distribution/timing × emotionalShift='negative' ×
  // structural thirds. Built on checkZoneCluster from the shared checks library. n≥9, ≥3
  // negative-emotion scenes, fires when more than 75% of them fall in a single structural third.
  // Existing negative-emotion checks in this pass are decoupling (the positive-mirror
  // THEME_POSITIVE_EMOTION_DECOUPLED), aftermath (THEME_NEGATIVE_EMOTION_AFTERMATH_SILENT), and
  // average/aggregate (THEME_RESONANCE_EMOTIONALLY_LOPSIDED); the shared-library thirds-based
  // cluster mode has never been applied to emotionalShift.
  {
    const r794c = checkZoneCluster({
      records, minRecords: 9, minCount: 3, ratioThreshold: 0.75,
      isPresent: r => r.emotionalShift === 'negative',
    });
    if (r794c.fires) {
      issues.push({
        location: `${r794c.zoneNames[r794c.maxZoneIdx]} third — ${r794c.maxZoneCount} of ${r794c.count} negative-emotion scenes`,
        rule: 'THEME_NEGATIVE_EMOTION_ZONE_CLUSTER',
        severity: 'minor',
        description: `${Math.round((r794c.maxZoneCount / r794c.count) * 100)}% of the story's negative-emotion scenes cluster in the ${r794c.zoneNames[r794c.maxZoneIdx]} third. When all the darkness concentrates in one structural window, the theme carries its emotional cost in only one part of the story instead of resonating through its full shape.`,
        suggestedFix: `Introduce a negative-emotion scene outside the ${r794c.zoneNames[r794c.maxZoneIdx]} third so the theme's emotional cost resonates more evenly across the story.`,
      });
    }
  }

  // ── Wave 808: THEME_REVELATION_PEAK_UNCAUSED, THEME_NEGATIVE_EMOTION_DROUGHT_RUN,
  //              THEME_STAKES_ZONE_CLUSTER ──────────────────────────────────────

  // THEME_REVELATION_PEAK_UNCAUSED — Backward-cause × revelation-as-magnitude (0/1) × 2-scene
  // lookback. Built on checkPeakUncaused from the shared checks library. n≥8, ≥2 revelation
  // scenes, fires when the (first) revelation scene has no dramatic turn in itself or the 2
  // scenes preceding it. Completes the trio for revelation alongside the zone-cluster and
  // drought-run modes added in Wave 794. hasCause deliberately omits revelation to avoid
  // circularity.
  {
    const r808a = checkPeakUncaused({
      records, minRecords: 8, minQualifying: 2, lookback: 2,
      magnitude: r => (r.revelation != null ? 1 : 0),
      hasCause: r => r.dramaticTurn !== 'nothing',
    });
    if (r808a.fires) {
      issues.push({
        location: `scene ${r808a.peakIdx + 1} — revelation with no dramatic turn nearby`,
        rule: 'THEME_REVELATION_PEAK_UNCAUSED',
        severity: 'minor',
        description: `Scene ${r808a.peakIdx + 1} discloses a revelation with no dramatic turn in itself or the two scenes before it, even though ${r808a.qualifyingCount} scenes elsewhere disclose a truth. A revelation that lands without any preceding pivot reads as a coincidence rather than something the theme's own turns forced into the open.`,
        suggestedFix: `Add a dramatic turn in scene ${r808a.peakIdx + 1} or one of the two scenes before it so the revelation reads as a consequence of the story's own turning points rather than arriving unprepared.`,
      });
    }
  }

  // THEME_NEGATIVE_EMOTION_DROUGHT_RUN — Run-based × emotionalShift === 'negative' absence. Built
  // on checkDroughtRun from the shared checks library. n≥10, ≥3 negative-emotion scenes overall,
  // fires when the longest consecutive run of scenes with no negative charge reaches 6. Completes
  // 2 of 3 slots for this valence alongside the zone-cluster mode added in Wave 794 (peak mode
  // conventionally skipped for this categorical field).
  {
    const r808b = checkDroughtRun({
      records, minRecords: 10, minPresentCount: 3, runThreshold: 6,
      isPresent: r => r.emotionalShift === 'negative',
    });
    if (r808b.fires) {
      issues.push({
        location: `longest stretch with no negative-emotion charge: ${r808b.longestRun} consecutive scenes`,
        rule: 'THEME_NEGATIVE_EMOTION_DROUGHT_RUN',
        severity: 'minor',
        description: `The story contains a run of ${r808b.longestRun} consecutive scenes with no negative-emotion charge at all, even though ${r808b.presentCount} scenes elsewhere carry one. A long unbroken stretch with no darkness leaves the theme's emotional cost untested for an extended run.`,
        suggestedFix: `Give the story a setback within the ${r808b.longestRun}-scene stretch so the theme keeps testing its emotional cost throughout that stretch.`,
      });
    }
  }

  // THEME_STAKES_ZONE_CLUSTER — Distribution/timing × purpose === 'raise_stakes' × structural
  // thirds. Built on checkZoneCluster from the shared checks library. n≥9, ≥3 stakes-raising
  // scenes, fires when more than 75% of them fall in a single structural third. The existing
  // THEME_RAISE_STAKES_SILENT is a co-occurrence check (do stakes-raising scenes carry theme);
  // none of the three shared-library trio modes has ever been applied to this purpose value.
  {
    const r808c = checkZoneCluster({
      records, minRecords: 9, minCount: 3, ratioThreshold: 0.75,
      isPresent: r => r.purpose === 'raise_stakes',
    });
    if (r808c.fires) {
      issues.push({
        location: `${r808c.zoneNames[r808c.maxZoneIdx]} third — ${r808c.maxZoneCount} of ${r808c.count} stakes-raising scenes`,
        rule: 'THEME_STAKES_ZONE_CLUSTER',
        severity: 'minor',
        description: `${Math.round((r808c.maxZoneCount / r808c.count) * 100)}% of the scenes purposed to raise stakes cluster in the ${r808c.zoneNames[r808c.maxZoneIdx]} third. When every escalation lands in the same structural window, the theme has no mounting pressure testing it anywhere else in the story.`,
        suggestedFix: `Purpose at least one scene outside the ${r808c.zoneNames[r808c.maxZoneIdx]} third to raise stakes so the theme keeps mounting pressure testing it more evenly across the story.`,
      });
    }
  }

  // ── Wave 822: THEME_STAKES_DROUGHT_RUN, THEME_TURNING_POINT_ZONE_CLUSTER,
  //              THEME_INTRODUCE_CONFLICT_ZONE_CLUSTER ──────────────────────────────────────

  // THEME_STAKES_DROUGHT_RUN — Run-based × purpose === 'raise_stakes' absence. Built on
  // checkDroughtRun from the shared checks library. n≥10, ≥3 stakes-raising scenes overall, fires
  // when the longest consecutive run of scenes with no stakes-raising purpose reaches 6.
  // Completing 2 of 3 slots for this purpose value alongside the zone-cluster mode added in Wave
  // 808 (peak mode conventionally skipped for this categorical field).
  {
    const r822a = checkDroughtRun({
      records, minRecords: 10, minPresentCount: 3, runThreshold: 6,
      isPresent: r => r.purpose === 'raise_stakes',
    });
    if (r822a.fires) {
      issues.push({
        location: `longest stretch with no stakes-raising: ${r822a.longestRun} consecutive scenes`,
        rule: 'THEME_STAKES_DROUGHT_RUN',
        severity: 'minor',
        description: `The story contains a run of ${r822a.longestRun} consecutive scenes with no stakes-raising purpose at all, even though ${r822a.presentCount} scenes elsewhere escalate. A long unbroken stretch with no mounting pressure leaves the theme untested for an extended run.`,
        suggestedFix: `Purpose at least one scene within the ${r822a.longestRun}-scene stretch to raise stakes so the theme keeps facing mounting pressure throughout that stretch.`,
      });
    }
  }

  // THEME_TURNING_POINT_ZONE_CLUSTER — Distribution/timing × purpose === 'turning_point' ×
  // structural thirds. Built on checkZoneCluster from the shared checks library. n≥9, ≥3
  // turning-point scenes, fires when more than 75% of them fall in a single structural third.
  // This purpose value has never appeared anywhere in this file before — a virgin field for all
  // three shared-library trio modes, distinct from THEME_TURN_ZONE_CLUSTER (Wave 682), which
  // audits the dramaticTurn free-text field, not this purpose enum value.
  {
    const r822b = checkZoneCluster({
      records, minRecords: 9, minCount: 3, ratioThreshold: 0.75,
      isPresent: r => r.purpose === 'turning_point',
    });
    if (r822b.fires) {
      issues.push({
        location: `${r822b.zoneNames[r822b.maxZoneIdx]} third — ${r822b.maxZoneCount} of ${r822b.count} turning-point scenes`,
        rule: 'THEME_TURNING_POINT_ZONE_CLUSTER',
        severity: 'minor',
        description: `${Math.round((r822b.maxZoneCount / r822b.count) * 100)}% of the story's turning-point scenes cluster in the ${r822b.zoneNames[r822b.maxZoneIdx]} third. When every scene purposed as a turning point lands in the same structural window, the theme has no redirection testing it anywhere else in the story.`,
        suggestedFix: `Purpose at least one scene outside the ${r822b.zoneNames[r822b.maxZoneIdx]} third as a turning point so the theme keeps facing redirection more evenly across the story.`,
      });
    }
  }

  // THEME_INTRODUCE_CONFLICT_ZONE_CLUSTER — Distribution/timing × purpose ===
  // 'introduce_conflict' × structural thirds. Built on checkZoneCluster from the shared checks
  // library. n≥9, ≥3 conflict-introducing scenes, fires when more than 75% of them fall in a
  // single structural third. Also a virgin field — 'introduce_conflict' has never appeared
  // anywhere in this file before this wave.
  {
    const r822c = checkZoneCluster({
      records, minRecords: 9, minCount: 3, ratioThreshold: 0.75,
      isPresent: r => r.purpose === 'introduce_conflict',
    });
    if (r822c.fires) {
      issues.push({
        location: `${r822c.zoneNames[r822c.maxZoneIdx]} third — ${r822c.maxZoneCount} of ${r822c.count} conflict-introducing scenes`,
        rule: 'THEME_INTRODUCE_CONFLICT_ZONE_CLUSTER',
        severity: 'minor',
        description: `${Math.round((r822c.maxZoneCount / r822c.count) * 100)}% of the scenes purposed to introduce conflict cluster in the ${r822c.zoneNames[r822c.maxZoneIdx]} third. When every new conflict lands in the same structural window, the theme has no fresh friction testing it anywhere else in the story.`,
        suggestedFix: `Purpose at least one scene outside the ${r822c.zoneNames[r822c.maxZoneIdx]} third to introduce conflict so the theme keeps facing fresh friction more evenly across the story.`,
      });
    }
  }

  // ── Wave 836: THEME_TURNING_POINT_DROUGHT_RUN, THEME_INTRODUCE_CONFLICT_DROUGHT_RUN,
  //              THEME_POSITIVE_EMOTION_ZONE_CLUSTER ──────────────────────────────────────

  // THEME_TURNING_POINT_DROUGHT_RUN — Run-based × purpose === 'turning_point' absence. Built on
  // checkDroughtRun from the shared checks library. n≥10, ≥3 turning-point scenes overall, fires
  // when the longest consecutive run of scenes with no turning-point purpose reaches 6.
  // Completing 2 of 3 slots for this purpose value alongside the zone-cluster mode added in Wave
  // 822 (peak mode conventionally skipped for this categorical field).
  {
    const r836a = checkDroughtRun({
      records, minRecords: 10, minPresentCount: 3, runThreshold: 6,
      isPresent: r => r.purpose === 'turning_point',
    });
    if (r836a.fires) {
      issues.push({
        location: `longest stretch with no turning point: ${r836a.longestRun} consecutive scenes`,
        rule: 'THEME_TURNING_POINT_DROUGHT_RUN',
        severity: 'minor',
        description: `The story contains a run of ${r836a.longestRun} consecutive scenes with no turning-point purpose at all, even though ${r836a.presentCount} scenes elsewhere redirect events. A long unbroken stretch with no redirection leaves the theme untested by any pivot for an extended run.`,
        suggestedFix: `Purpose at least one scene within the ${r836a.longestRun}-scene stretch as a turning point so the theme keeps facing redirection throughout that stretch.`,
      });
    }
  }

  // THEME_INTRODUCE_CONFLICT_DROUGHT_RUN — Run-based × purpose === 'introduce_conflict' absence.
  // Built on checkDroughtRun from the shared checks library. n≥10, ≥3 conflict-introducing scenes
  // overall, fires when the longest consecutive run of scenes with no conflict-introducing
  // purpose reaches 6. Completing 2 of 3 slots for this purpose value alongside the zone-cluster
  // mode added in Wave 822 (peak mode conventionally skipped for this categorical field).
  {
    const r836b = checkDroughtRun({
      records, minRecords: 10, minPresentCount: 3, runThreshold: 6,
      isPresent: r => r.purpose === 'introduce_conflict',
    });
    if (r836b.fires) {
      issues.push({
        location: `longest stretch with no new conflict: ${r836b.longestRun} consecutive scenes`,
        rule: 'THEME_INTRODUCE_CONFLICT_DROUGHT_RUN',
        severity: 'minor',
        description: `The story contains a run of ${r836b.longestRun} consecutive scenes with no conflict-introducing purpose at all, even though ${r836b.presentCount} scenes elsewhere open a new front. A long unbroken stretch with no fresh friction leaves the theme untested for an extended run.`,
        suggestedFix: `Purpose at least one scene within the ${r836b.longestRun}-scene stretch to introduce conflict so the theme keeps facing fresh friction throughout that stretch.`,
      });
    }
  }

  // THEME_POSITIVE_EMOTION_ZONE_CLUSTER — Distribution/timing × emotionalShift === 'positive' ×
  // structural thirds. Built on checkZoneCluster from the shared checks library. n≥9, ≥3
  // positive-emotion scenes, fires when more than 75% of them fall in a single structural third.
  // The existing positive-emotion checks in this pass are decoupling
  // (THEME_POSITIVE_EMOTION_DECOUPLED) and sequence/aftermath (THEME_POSITIVE_EMOTION_AFTERMATH_
  // SILENT); none of the three shared-library trio modes has ever isolated this valence,
  // mirroring the negative-valence trio completed in Wave 808.
  {
    const r836c = checkZoneCluster({
      records, minRecords: 9, minCount: 3, ratioThreshold: 0.75,
      isPresent: r => r.emotionalShift === 'positive',
    });
    if (r836c.fires) {
      issues.push({
        location: `${r836c.zoneNames[r836c.maxZoneIdx]} third — ${r836c.maxZoneCount} of ${r836c.count} positive-emotion scenes`,
        rule: 'THEME_POSITIVE_EMOTION_ZONE_CLUSTER',
        severity: 'minor',
        description: `${Math.round((r836c.maxZoneCount / r836c.count) * 100)}% of the story's positive-emotion scenes cluster in the ${r836c.zoneNames[r836c.maxZoneIdx]} third. When all the relief concentrates in one structural window, the theme carries its emotional payoff in only one part of the story instead of throughout its full length.`,
        suggestedFix: `Introduce a positive-emotion scene outside the ${r836c.zoneNames[r836c.maxZoneIdx]} third so the theme delivers its emotional payoff more evenly across the story.`,
      });
    }
  }

  // ── Wave 850: THEME_POSITIVE_EMOTION_DROUGHT_RUN, THEME_ESTABLISH_WORLD_ZONE_CLUSTER,
  //              THEME_CLIMAX_ZONE_CLUSTER ──────────────────────────────────────

  // THEME_POSITIVE_EMOTION_DROUGHT_RUN — Run-based × emotionalShift === 'positive' absence. Built
  // on checkDroughtRun from the shared checks library. n≥10, ≥3 positive-emotion scenes overall,
  // fires when the longest consecutive run of scenes with no positive-emotion charge reaches 6.
  // Completing 2 of 3 slots for this valence alongside the zone-cluster mode added in Wave 836
  // (peak mode conventionally skipped for this categorical field).
  {
    const r850a = checkDroughtRun({
      records, minRecords: 10, minPresentCount: 3, runThreshold: 6,
      isPresent: r => r.emotionalShift === 'positive',
    });
    if (r850a.fires) {
      issues.push({
        location: `longest stretch with no positive-emotion charge: ${r850a.longestRun} consecutive scenes`,
        rule: 'THEME_POSITIVE_EMOTION_DROUGHT_RUN',
        severity: 'minor',
        description: `The story contains a run of ${r850a.longestRun} consecutive scenes with no positive-emotion charge at all, even though ${r850a.presentCount} scenes elsewhere carry one. A long unbroken stretch with no relief leaves the theme without an emotional payoff for an extended run.`,
        suggestedFix: `Give the story a moment of relief within the ${r850a.longestRun}-scene stretch so the theme keeps delivering an emotional payoff throughout that stretch.`,
      });
    }
  }

  // THEME_ESTABLISH_WORLD_ZONE_CLUSTER — Distribution/timing × purpose === 'establish_world' ×
  // structural thirds. Built on checkZoneCluster from the shared checks library. n≥9, ≥3
  // world-establishing scenes, fires when more than 75% of them fall in a single structural
  // third. This purpose value has never been referenced anywhere in this pass — a virgin field
  // for all three shared-library trio modes.
  {
    const r850b = checkZoneCluster({
      records, minRecords: 9, minCount: 3, ratioThreshold: 0.75,
      isPresent: r => r.purpose === 'establish_world',
    });
    if (r850b.fires) {
      issues.push({
        location: `${r850b.zoneNames[r850b.maxZoneIdx]} third — ${r850b.maxZoneCount} of ${r850b.count} world-establishing scenes`,
        rule: 'THEME_ESTABLISH_WORLD_ZONE_CLUSTER',
        severity: 'minor',
        description: `${Math.round((r850b.maxZoneCount / r850b.count) * 100)}% of the scenes purposed to establish the world cluster in the ${r850b.zoneNames[r850b.maxZoneIdx]} third. When every act of world-building concentrates in one structural window, the theme loses fresh ground to be tested against anywhere else across the story.`,
        suggestedFix: `Purpose at least one scene outside the ${r850b.zoneNames[r850b.maxZoneIdx]} third to establish the world so the theme keeps fresh ground to be tested against more evenly across the story.`,
      });
    }
  }

  // THEME_CLIMAX_ZONE_CLUSTER — Distribution/timing × purpose === 'climax' × structural thirds.
  // Built on checkZoneCluster from the shared checks library. n≥9, ≥3 climax-purposed scenes,
  // fires when more than 75% of them fall in a single structural third. Distinct from
  // THEME_CLIMAX_SCENE_SILENT, a co-occurrence check on the fixed climax scene's content; none of
  // the three shared-library trio modes has ever isolated this purpose value as a standalone
  // distributional signal.
  {
    const r850c = checkZoneCluster({
      records, minRecords: 9, minCount: 3, ratioThreshold: 0.75,
      isPresent: r => r.purpose === 'climax',
    });
    if (r850c.fires) {
      issues.push({
        location: `${r850c.zoneNames[r850c.maxZoneIdx]} third — ${r850c.maxZoneCount} of ${r850c.count} climax-purposed scenes`,
        rule: 'THEME_CLIMAX_ZONE_CLUSTER',
        severity: 'minor',
        description: `${Math.round((r850c.maxZoneCount / r850c.count) * 100)}% of the scenes purposed as the climax cluster in the ${r850c.zoneNames[r850c.maxZoneIdx]} third. When every peak moment concentrates in one structural window, the theme builds toward its payoff in only one part of the story instead of throughout its full length.`,
        suggestedFix: `Reconsider whether every climax-purposed scene belongs in the ${r850c.zoneNames[r850c.maxZoneIdx]} third so the theme builds toward its payoff more evenly across the story.`,
      });
    }
  }

  // ── Wave 864: THEME_CLIMAX_DROUGHT_RUN, THEME_ESTABLISH_WORLD_DROUGHT_RUN,
  //              THEME_RESOLUTION_ZONE_CLUSTER ──────────────────────────────────────

  // THEME_CLIMAX_DROUGHT_RUN — Run-based × purpose === 'climax' absence. Built on
  // checkDroughtRun from the shared checks library. n≥10, ≥3 climax-purposed scenes overall,
  // fires when the longest consecutive run of scenes with no climax purpose reaches 6.
  // Completes 2 of 3 slots for this purpose value alongside the zone-cluster mode added in
  // Wave 850 (peak mode conventionally skipped for this categorical field).
  {
    const r864a = checkDroughtRun({
      records, minRecords: 10, minPresentCount: 3, runThreshold: 6,
      isPresent: r => r.purpose === 'climax',
    });
    if (r864a.fires) {
      issues.push({
        location: `longest stretch with no climax-purposed scene: ${r864a.longestRun} consecutive scenes`,
        rule: 'THEME_CLIMAX_DROUGHT_RUN',
        severity: 'minor',
        description: `The story contains a run of ${r864a.longestRun} consecutive scenes with no scene purposed as the climax, even though ${r864a.presentCount} scenes elsewhere are. A long unbroken stretch between peak moments leaves the theme without a structural high point to build its payoff toward for an extended run.`,
        suggestedFix: `Purpose a scene within the ${r864a.longestRun}-scene stretch as the climax, or restructure so the theme's peak moments recur rather than clustering into a single distant point.`,
      });
    }
  }

  // THEME_ESTABLISH_WORLD_DROUGHT_RUN — Run-based × purpose === 'establish_world' absence. Built
  // on checkDroughtRun from the shared checks library. n≥10, ≥3 world-establishing scenes
  // overall, fires when the longest consecutive run of scenes with no world-establishing
  // purpose reaches 6. Completes 2 of 3 slots for this purpose value alongside the zone-cluster
  // mode added in Wave 850 (peak mode conventionally skipped for this categorical field).
  {
    const r864b = checkDroughtRun({
      records, minRecords: 10, minPresentCount: 3, runThreshold: 6,
      isPresent: r => r.purpose === 'establish_world',
    });
    if (r864b.fires) {
      issues.push({
        location: `longest stretch with no world-establishing scene: ${r864b.longestRun} consecutive scenes`,
        rule: 'THEME_ESTABLISH_WORLD_DROUGHT_RUN',
        severity: 'minor',
        description: `The story contains a run of ${r864b.longestRun} consecutive scenes with no scene purposed to establish the world, even though ${r864b.presentCount} scenes elsewhere are. A long unbroken stretch without new world-building leaves the theme with no fresh ground to be tested against for an extended run.`,
        suggestedFix: `Purpose a scene within the ${r864b.longestRun}-scene stretch to establish the world, so the theme has fresh ground to be tested against throughout the story rather than in one isolated pocket.`,
      });
    }
  }

  // THEME_RESOLUTION_ZONE_CLUSTER — Distribution/timing × purpose === 'resolution' × structural
  // thirds. Built on checkZoneCluster from the shared checks library. n≥9, ≥3 resolution-
  // purposed scenes, fires when more than 75% of them fall in a single structural third.
  // Distinct from THEME_RESOLUTION_SILENT, a co-occurrence check on the fixed final scene's
  // thematic content regardless of its purpose value; none of the three shared-library trio
  // modes has ever isolated purpose === 'resolution' as a standalone distributional signal.
  {
    const r864c = checkZoneCluster({
      records, minRecords: 9, minCount: 3, ratioThreshold: 0.75,
      isPresent: r => r.purpose === 'resolution',
    });
    if (r864c.fires) {
      issues.push({
        location: `${r864c.zoneNames[r864c.maxZoneIdx]} third — ${r864c.maxZoneCount} of ${r864c.count} resolution-purposed scenes`,
        rule: 'THEME_RESOLUTION_ZONE_CLUSTER',
        severity: 'minor',
        description: `${Math.round((r864c.maxZoneCount / r864c.count) * 100)}% of the scenes purposed as resolution cluster in the ${r864c.zoneNames[r864c.maxZoneIdx]} third. When every resolution beat concentrates in one structural window, the theme has no room to be affirmed gradually before the ending answers it all at once.`,
        suggestedFix: `Purpose at least one resolution scene outside the ${r864c.zoneNames[r864c.maxZoneIdx]} third so the theme's closing affirmation is distributed across the story rather than concentrated in a single structural window.`,
      });
    }
  }

  // ── Wave 878: THEME_RESOLUTION_DROUGHT_RUN, THEME_COMPLICATE_ZONE_CLUSTER,
  //              THEME_COMPLICATE_DROUGHT_RUN ──────────────────────────────────────

  // THEME_RESOLUTION_DROUGHT_RUN — Run-based × purpose === 'resolution' absence. Built on
  // checkDroughtRun from the shared checks library. n≥10, ≥3 resolution-purposed scenes overall,
  // fires when the longest consecutive run of scenes with no resolution purpose reaches 6.
  // Completes 2 of 3 slots for this purpose value alongside the zone-cluster mode added in
  // Wave 864. Distinct from THEME_RESOLUTION_SILENT, a co-occurrence check on the fixed final
  // scene's thematic content regardless of purpose; peak mode conventionally skipped for this
  // categorical field.
  {
    const r878a = checkDroughtRun({
      records, minRecords: 10, minPresentCount: 3, runThreshold: 6,
      isPresent: r => r.purpose === 'resolution',
    });
    if (r878a.fires) {
      issues.push({
        location: `longest stretch with no resolution-purposed scene: ${r878a.longestRun} consecutive scenes`,
        rule: 'THEME_RESOLUTION_DROUGHT_RUN',
        severity: 'minor',
        description: `The story contains a run of ${r878a.longestRun} consecutive scenes with no scene purposed to resolve the story, even though ${r878a.presentCount} scenes elsewhere are. A long unbroken stretch with nothing settled leaves the theme without an affirming beat for an extended run.`,
        suggestedFix: `Purpose a scene within the ${r878a.longestRun}-scene stretch to resolve part of the story, so the theme keeps being affirmed throughout the story rather than only at its very end.`,
      });
    }
  }

  // THEME_COMPLICATE_ZONE_CLUSTER — Distribution/timing × purpose === 'complicate' ×
  // structural thirds. Built on checkZoneCluster from the shared checks library. n≥9, ≥3
  // complicating scenes, fires when more than 75% of them fall in a single structural third.
  // This purpose value has never been referenced anywhere in this pass — a virgin field for
  // all three shared-library trio modes.
  {
    const r878b = checkZoneCluster({
      records, minRecords: 9, minCount: 3, ratioThreshold: 0.75,
      isPresent: r => r.purpose === 'complicate',
    });
    if (r878b.fires) {
      issues.push({
        location: `${r878b.zoneNames[r878b.maxZoneIdx]} third — ${r878b.maxZoneCount} of ${r878b.count} complicating scenes`,
        rule: 'THEME_COMPLICATE_ZONE_CLUSTER',
        severity: 'minor',
        description: `${Math.round((r878b.maxZoneCount / r878b.count) * 100)}% of the scenes purposed to complicate the story cluster in the ${r878b.zoneNames[r878b.maxZoneIdx]} third. When every complication lands in the same structural window, the theme stops being tested against fresh trouble anywhere else across the story.`,
        suggestedFix: `Purpose at least one scene outside the ${r878b.zoneNames[r878b.maxZoneIdx]} third to complicate the story so the theme keeps being tested against fresh trouble more evenly across the story.`,
      });
    }
  }

  // THEME_COMPLICATE_DROUGHT_RUN — Run-based × purpose === 'complicate' absence. Built on
  // checkDroughtRun from the shared checks library. n≥10, ≥3 complicating scenes overall, fires
  // when the longest consecutive run of scenes with no complicating purpose reaches 6.
  // Completes 2 of 3 slots for this purpose value alongside the zone-cluster mode added in this
  // same wave (peak mode conventionally skipped for this categorical field).
  {
    const r878c = checkDroughtRun({
      records, minRecords: 10, minPresentCount: 3, runThreshold: 6,
      isPresent: r => r.purpose === 'complicate',
    });
    if (r878c.fires) {
      issues.push({
        location: `longest stretch with no complication: ${r878c.longestRun} consecutive scenes`,
        rule: 'THEME_COMPLICATE_DROUGHT_RUN',
        severity: 'minor',
        description: `The story contains a run of ${r878c.longestRun} consecutive scenes with no complicating purpose at all, even though ${r878c.presentCount} scenes elsewhere deepen the trouble. A long unbroken stretch with nothing new complicating the situation leaves the theme untested for an extended run.`,
        suggestedFix: `Purpose at least one scene within the ${r878c.longestRun}-scene stretch to complicate the story so the theme keeps being tested throughout that stretch.`,
      });
    }
  }

  // ── Wave 892: THEME_CLIMAX_ZONE_IMBALANCE, THEME_ESTABLISH_WORLD_ZONE_IMBALANCE,
  //              THEME_RESOLUTION_ZONE_IMBALANCE ──────────────────────────────────────

  // THEME_CLIMAX_ZONE_IMBALANCE — Underweight/bloat × purpose === 'climax' × four structural
  // zones. Built on checkZoneImbalance from the shared checks library. n≥10, ≥4 climax-purposed
  // scenes total, divided across four equal structural zones. Fires only when one zone has zero
  // such scenes while another holds ≥50% of the total. Distinct from the existing 3-zone
  // THEME_CLIMAX_ZONE_CLUSTER and run-based THEME_CLIMAX_DROUGHT_RUN — the first application of
  // the 4-zone bloat+empty-zone mode to this purpose value.
  {
    const r892a = checkZoneImbalance({
      records, minRecords: 10, minCount: 4, bloatRatio: 0.5,
      isPresent: r => r.purpose === 'climax',
    });
    if (r892a.fires) {
      const emptyNames892a = r892a.emptyZoneIdxs.map(i => FOUR_ZONE_NAMES[i]).join(', ');
      const bloatName892a = FOUR_ZONE_NAMES[r892a.bloatZoneIdx];
      issues.push({
        location: `${emptyNames892a} empty; ${bloatName892a} has ${r892a.counts[r892a.bloatZoneIdx]}/${r892a.totalCount} climax-purposed scenes`,
        rule: 'THEME_CLIMAX_ZONE_IMBALANCE',
        severity: 'minor',
        description: `The story's ${r892a.totalCount} climax-purposed scenes are unevenly distributed across its four structural zones: ${bloatName892a} contains ${r892a.counts[r892a.bloatZoneIdx]} of them (${Math.round((r892a.counts[r892a.bloatZoneIdx] / r892a.totalCount) * 100)}%) while ${emptyNames892a} contains none. Peak moments bloat in one structural quarter and vanish from another, giving the theme's payoff an uneven structural rhythm.`,
        suggestedFix: `Redistribute peak moments: move at least one climax-purposed scene into the empty zone(s) — ${emptyNames892a} — so the theme builds toward its payoff more evenly across every structural quarter, not only the quarter currently carrying most of them.`,
      });
    }
  }

  // THEME_ESTABLISH_WORLD_ZONE_IMBALANCE — Underweight/bloat × purpose === 'establish_world' ×
  // four structural zones. Built on checkZoneImbalance from the shared checks library. n≥10, ≥4
  // world-establishing scenes total, divided across four equal structural zones. Fires only
  // when one zone has zero such scenes while another holds ≥50% of the total. Distinct from the
  // existing 3-zone THEME_ESTABLISH_WORLD_ZONE_CLUSTER and run-based THEME_ESTABLISH_WORLD_
  // DROUGHT_RUN — the first application of the 4-zone bloat+empty-zone mode to this purpose
  // value.
  {
    const r892b = checkZoneImbalance({
      records, minRecords: 10, minCount: 4, bloatRatio: 0.5,
      isPresent: r => r.purpose === 'establish_world',
    });
    if (r892b.fires) {
      const emptyNames892b = r892b.emptyZoneIdxs.map(i => FOUR_ZONE_NAMES[i]).join(', ');
      const bloatName892b = FOUR_ZONE_NAMES[r892b.bloatZoneIdx];
      issues.push({
        location: `${emptyNames892b} empty; ${bloatName892b} has ${r892b.counts[r892b.bloatZoneIdx]}/${r892b.totalCount} world-establishing scenes`,
        rule: 'THEME_ESTABLISH_WORLD_ZONE_IMBALANCE',
        severity: 'minor',
        description: `The story's ${r892b.totalCount} world-establishing scenes are unevenly distributed across its four structural zones: ${bloatName892b} contains ${r892b.counts[r892b.bloatZoneIdx]} of them (${Math.round((r892b.counts[r892b.bloatZoneIdx] / r892b.totalCount) * 100)}%) while ${emptyNames892b} contains none. World-building bloats in one structural quarter and vanishes from another, giving the theme's ground to be tested against an uneven structural rhythm.`,
        suggestedFix: `Redistribute world-building beats: move at least one establish_world-purposed scene into the empty zone(s) — ${emptyNames892b} — so the theme keeps fresh ground to be tested against more evenly across every structural quarter, not only the quarter currently carrying most of them.`,
      });
    }
  }

  // THEME_RESOLUTION_ZONE_IMBALANCE — Underweight/bloat × purpose === 'resolution' × four
  // structural zones. Built on checkZoneImbalance from the shared checks library. n≥10, ≥4
  // resolution-purposed scenes total, divided across four equal structural zones. Fires only
  // when one zone has zero such scenes while another holds ≥50% of the total. Distinct from
  // THEME_RESOLUTION_SILENT (a co-occurrence check on the fixed final scene's thematic content
  // regardless of purpose) and from the existing 3-zone THEME_RESOLUTION_ZONE_CLUSTER and
  // run-based THEME_RESOLUTION_DROUGHT_RUN — the first application of the 4-zone
  // bloat+empty-zone mode to this purpose value.
  {
    const r892c = checkZoneImbalance({
      records, minRecords: 10, minCount: 4, bloatRatio: 0.5,
      isPresent: r => r.purpose === 'resolution',
    });
    if (r892c.fires) {
      const emptyNames892c = r892c.emptyZoneIdxs.map(i => FOUR_ZONE_NAMES[i]).join(', ');
      const bloatName892c = FOUR_ZONE_NAMES[r892c.bloatZoneIdx];
      issues.push({
        location: `${emptyNames892c} empty; ${bloatName892c} has ${r892c.counts[r892c.bloatZoneIdx]}/${r892c.totalCount} resolution-purposed scenes`,
        rule: 'THEME_RESOLUTION_ZONE_IMBALANCE',
        severity: 'minor',
        description: `The story's ${r892c.totalCount} resolution-purposed scenes are unevenly distributed across its four structural zones: ${bloatName892c} contains ${r892c.counts[r892c.bloatZoneIdx]} of them (${Math.round((r892c.counts[r892c.bloatZoneIdx] / r892c.totalCount) * 100)}%) while ${emptyNames892c} contains none. Settling beats bloat in one structural quarter and vanish from another, giving the theme's closing affirmation an uneven structural rhythm.`,
        suggestedFix: `Redistribute settling beats: move at least one resolution-purposed scene into the empty zone(s) — ${emptyNames892c} — so the theme's closing affirmation is distributed more evenly across every structural quarter, not only the quarter currently carrying most of them.`,
      });
    }
  }

  // THEME_TURNING_POINT_ZONE_IMBALANCE — Underweight/bloat × purpose === 'turning_point' × four
  // structural zones. Built on checkZoneImbalance from the shared checks library, continuing the
  // rollout begun in Wave 892. n≥10, ≥4 turning-point scenes total, divided across four equal
  // structural zones. Fires only when one zone has zero such scenes while another holds ≥50% of
  // the total. Distinct from the existing 3-zone THEME_TURNING_POINT_ZONE_CLUSTER and run-based
  // THEME_TURNING_POINT_DROUGHT_RUN — the first application of the 4-zone bloat+empty-zone mode
  // to this purpose value.
  {
    const r906a = checkZoneImbalance({
      records, minRecords: 10, minCount: 4, bloatRatio: 0.5,
      isPresent: r => r.purpose === 'turning_point',
    });
    if (r906a.fires) {
      const emptyNames906a = r906a.emptyZoneIdxs.map(i => FOUR_ZONE_NAMES[i]).join(', ');
      const bloatName906a = FOUR_ZONE_NAMES[r906a.bloatZoneIdx];
      issues.push({
        location: `${emptyNames906a} empty; ${bloatName906a} has ${r906a.counts[r906a.bloatZoneIdx]}/${r906a.totalCount} turning-point scenes`,
        rule: 'THEME_TURNING_POINT_ZONE_IMBALANCE',
        severity: 'minor',
        description: `The story's ${r906a.totalCount} turning-point scenes are unevenly distributed across its four structural zones: ${bloatName906a} contains ${r906a.counts[r906a.bloatZoneIdx]} of them (${Math.round((r906a.counts[r906a.bloatZoneIdx] / r906a.totalCount) * 100)}%) while ${emptyNames906a} contains none. Pivots bloat in one structural quarter and vanish from another, so the theme is re-tested in only part of the story rather than across its whole shape.`,
        suggestedFix: `Redistribute turning points: move at least one turning_point-purposed scene into the empty zone(s) — ${emptyNames906a} — so the theme keeps being re-tested across every structural quarter, not only the quarter currently carrying most of them.`,
      });
    }
  }

  // THEME_INTRODUCE_CONFLICT_ZONE_IMBALANCE — Underweight/bloat × purpose === 'introduce_conflict'
  // × four structural zones. Built on checkZoneImbalance from the shared checks library, continuing
  // the rollout begun in Wave 892. n≥10, ≥4 conflict-introducing scenes total, divided across four
  // equal structural zones. Fires only when one zone has zero such scenes while another holds ≥50%
  // of the total. Distinct from the existing 3-zone THEME_INTRODUCE_CONFLICT_ZONE_CLUSTER and
  // run-based THEME_INTRODUCE_CONFLICT_DROUGHT_RUN — the first application of the 4-zone
  // bloat+empty-zone mode to this purpose value.
  {
    const r906b = checkZoneImbalance({
      records, minRecords: 10, minCount: 4, bloatRatio: 0.5,
      isPresent: r => r.purpose === 'introduce_conflict',
    });
    if (r906b.fires) {
      const emptyNames906b = r906b.emptyZoneIdxs.map(i => FOUR_ZONE_NAMES[i]).join(', ');
      const bloatName906b = FOUR_ZONE_NAMES[r906b.bloatZoneIdx];
      issues.push({
        location: `${emptyNames906b} empty; ${bloatName906b} has ${r906b.counts[r906b.bloatZoneIdx]}/${r906b.totalCount} conflict-introducing scenes`,
        rule: 'THEME_INTRODUCE_CONFLICT_ZONE_IMBALANCE',
        severity: 'minor',
        description: `The story's ${r906b.totalCount} conflict-introducing scenes are unevenly distributed across its four structural zones: ${bloatName906b} contains ${r906b.counts[r906b.bloatZoneIdx]} of them (${Math.round((r906b.counts[r906b.bloatZoneIdx] / r906b.totalCount) * 100)}%) while ${emptyNames906b} contains none. New conflicts bloat in one structural quarter and vanish from another, so the theme meets fresh opposition in only part of the story rather than across its whole shape.`,
        suggestedFix: `Redistribute new conflicts: move at least one introduce_conflict-purposed scene into the empty zone(s) — ${emptyNames906b} — so the theme keeps meeting fresh opposition across every structural quarter, not only the quarter currently carrying most of them.`,
      });
    }
  }

  // THEME_COMPLICATE_ZONE_IMBALANCE — Underweight/bloat × purpose === 'complicate' × four
  // structural zones. Built on checkZoneImbalance from the shared checks library, continuing the
  // rollout begun in Wave 892. n≥10, ≥4 complicating scenes total, divided across four equal
  // structural zones. Fires only when one zone has zero such scenes while another holds ≥50% of
  // the total. Distinct from the existing 3-zone THEME_COMPLICATE_ZONE_CLUSTER and run-based
  // THEME_COMPLICATE_DROUGHT_RUN — the first application of the 4-zone bloat+empty-zone mode to
  // this purpose value.
  {
    const r906c = checkZoneImbalance({
      records, minRecords: 10, minCount: 4, bloatRatio: 0.5,
      isPresent: r => r.purpose === 'complicate',
    });
    if (r906c.fires) {
      const emptyNames906c = r906c.emptyZoneIdxs.map(i => FOUR_ZONE_NAMES[i]).join(', ');
      const bloatName906c = FOUR_ZONE_NAMES[r906c.bloatZoneIdx];
      issues.push({
        location: `${emptyNames906c} empty; ${bloatName906c} has ${r906c.counts[r906c.bloatZoneIdx]}/${r906c.totalCount} complicating scenes`,
        rule: 'THEME_COMPLICATE_ZONE_IMBALANCE',
        severity: 'minor',
        description: `The story's ${r906c.totalCount} complicating scenes are unevenly distributed across its four structural zones: ${bloatName906c} contains ${r906c.counts[r906c.bloatZoneIdx]} of them (${Math.round((r906c.counts[r906c.bloatZoneIdx] / r906c.totalCount) * 100)}%) while ${emptyNames906c} contains none. Complications bloat in one structural quarter and vanish from another, so the theme is pressured in only part of the story rather than across its whole shape.`,
        suggestedFix: `Redistribute complications: move at least one complicate-purposed scene into the empty zone(s) — ${emptyNames906c} — so the theme keeps being pressured across every structural quarter, not only the quarter currently carrying most of them.`,
      });
    }
  }

  // THEME_REVELATION_PURPOSE_ZONE_CLUSTER — Distribution/timing × purpose === 'revelation' ×
  // structural thirds. Built on checkZoneCluster from the shared checks library. n≥9, ≥3 scenes
  // purposed as a revelation, fires when more than 75% of them fall in a single structural third.
  // Named distinctly from THEME_REVELATION_ZONE_CLUSTER, which audits the separate revelation
  // string|null field, not this purpose enum value — purpose === 'revelation' has never been
  // referenced anywhere in this pass; a virgin field for all three trio modes.
  {
    const r920a = checkZoneCluster({
      records, minRecords: 9, minCount: 3, ratioThreshold: 0.75,
      isPresent: r => r.purpose === 'revelation',
    });
    if (r920a.fires) {
      issues.push({
        location: `${r920a.zoneNames[r920a.maxZoneIdx]} third — ${r920a.maxZoneCount} of ${r920a.count} revelation-purposed scenes`,
        rule: 'THEME_REVELATION_PURPOSE_ZONE_CLUSTER',
        severity: 'minor',
        description: `${Math.round((r920a.maxZoneCount / r920a.count) * 100)}% of the scenes purposed as a revelation cluster in the ${r920a.zoneNames[r920a.maxZoneIdx]} third. When every purpose-built disclosure lands in the same structural window, the theme is illuminated by new truth in only one part of the story instead of across its whole shape.`,
        suggestedFix: `Purpose at least one scene outside the ${r920a.zoneNames[r920a.maxZoneIdx]} third as a revelation so the theme keeps being illuminated by new truth more evenly across the story.`,
      });
    }
  }

  // THEME_REVELATION_PURPOSE_DROUGHT_RUN — Run-based × purpose === 'revelation' absence. Built on
  // checkDroughtRun from the shared checks library. n≥10, ≥3 revelation-purposed scenes overall,
  // fires when the longest consecutive run of scenes purposed otherwise reaches 6. Completes 2 of
  // 3 slots for this purpose value alongside the zone-cluster mode added in this same wave (peak
  // mode conventionally skipped for this categorical field).
  {
    const r920b = checkDroughtRun({
      records, minRecords: 10, minPresentCount: 3, runThreshold: 6,
      isPresent: r => r.purpose === 'revelation',
    });
    if (r920b.fires) {
      issues.push({
        location: `longest stretch with no revelation-purposed scene: ${r920b.longestRun} consecutive scenes`,
        rule: 'THEME_REVELATION_PURPOSE_DROUGHT_RUN',
        severity: 'minor',
        description: `The story contains a run of ${r920b.longestRun} consecutive scenes with no scene purposed as a revelation, even though ${r920b.presentCount} scenes elsewhere disclose information by purpose. A long unbroken stretch with nothing new purpose-built to come to light leaves the theme un-illuminated by fresh truth for an extended run.`,
        suggestedFix: `Purpose a scene within the ${r920b.longestRun}-scene stretch as a revelation so the theme keeps being illuminated by new truth throughout that stretch.`,
      });
    }
  }

  // THEME_CHARACTER_MOMENT_ZONE_IMBALANCE — Underweight/bloat × purpose === 'character_moment' ×
  // four structural zones. Built on checkZoneImbalance from the shared checks library, continuing
  // the rollout begun in Wave 892. n≥10, ≥4 character-moment scenes total, divided across four
  // equal structural zones. Fires only when one zone has zero such scenes while another holds ≥50%
  // of the total. Distinct from the existing 3-zone THEME_CHARACTER_MOMENT_ZONE_CLUSTER and
  // run-based THEME_CHARACTER_MOMENT_DROUGHT_RUN — the first application of the 4-zone
  // bloat+empty-zone mode to this purpose value.
  {
    const r920c = checkZoneImbalance({
      records, minRecords: 10, minCount: 4, bloatRatio: 0.5,
      isPresent: r => r.purpose === 'character_moment',
    });
    if (r920c.fires) {
      const emptyNames920c = r920c.emptyZoneIdxs.map(i => FOUR_ZONE_NAMES[i]).join(', ');
      const bloatName920c = FOUR_ZONE_NAMES[r920c.bloatZoneIdx];
      issues.push({
        location: `${emptyNames920c} empty; ${bloatName920c} has ${r920c.counts[r920c.bloatZoneIdx]}/${r920c.totalCount} character-moment scenes`,
        rule: 'THEME_CHARACTER_MOMENT_ZONE_IMBALANCE',
        severity: 'minor',
        description: `The story's ${r920c.totalCount} character-moment scenes are unevenly distributed across its four structural zones: ${bloatName920c} contains ${r920c.counts[r920c.bloatZoneIdx]} of them (${Math.round((r920c.counts[r920c.bloatZoneIdx] / r920c.totalCount) * 100)}%) while ${emptyNames920c} contains none. Quiet character beats bloat in one structural quarter and vanish from another, so the theme is voiced through character in only part of the story rather than across its whole shape.`,
        suggestedFix: `Redistribute character beats: move at least one character_moment-purposed scene into the empty zone(s) — ${emptyNames920c} — so the theme keeps being voiced through character across every structural quarter, not only the quarter currently carrying most of them.`,
      });
    }
  }

  // THEME_STAKES_ZONE_IMBALANCE — Underweight/bloat × purpose === 'raise_stakes' × four structural
  // zones. Built on checkZoneImbalance from the shared checks library, continuing the rollout begun
  // in Wave 892. n≥10, ≥4 stakes-raising scenes total, divided across four equal structural zones.
  // Fires only when one zone has zero such scenes while another holds ≥50% of the total. Distinct
  // from the existing 3-zone THEME_STAKES_ZONE_CLUSTER and run-based THEME_STAKES_DROUGHT_RUN — the
  // first application of the 4-zone bloat+empty-zone mode to this purpose value.
  {
    const r934a = checkZoneImbalance({
      records, minRecords: 10, minCount: 4, bloatRatio: 0.5,
      isPresent: r => r.purpose === 'raise_stakes',
    });
    if (r934a.fires) {
      const emptyNames934a = r934a.emptyZoneIdxs.map(i => FOUR_ZONE_NAMES[i]).join(', ');
      const bloatName934a = FOUR_ZONE_NAMES[r934a.bloatZoneIdx];
      issues.push({
        location: `${emptyNames934a} empty; ${bloatName934a} has ${r934a.counts[r934a.bloatZoneIdx]}/${r934a.totalCount} stakes-raising scenes`,
        rule: 'THEME_STAKES_ZONE_IMBALANCE',
        severity: 'minor',
        description: `The story's ${r934a.totalCount} stakes-raising scenes are unevenly distributed across its four structural zones: ${bloatName934a} contains ${r934a.counts[r934a.bloatZoneIdx]} of them (${Math.round((r934a.counts[r934a.bloatZoneIdx] / r934a.totalCount) * 100)}%) while ${emptyNames934a} contains none. Stakes bloat upward in one structural quarter and never rise at all in another, so the theme is put to the test in only part of the story.`,
        suggestedFix: `Redistribute stakes-raising beats: move at least one raise_stakes-purposed scene into the empty zone(s) — ${emptyNames934a} — so the theme is put to the test across every structural quarter, not only the quarter currently carrying most of them.`,
      });
    }
  }

  // THEME_REVELATION_PURPOSE_ZONE_IMBALANCE — Underweight/bloat × purpose === 'revelation' × four
  // structural zones. Built on checkZoneImbalance from the shared checks library, closing the
  // 4-zone gap for this purpose value (its 3-zone/run trio was completed in Wave 920). n≥10, ≥4
  // revelation-purposed scenes total, divided across four equal structural zones. Fires only when
  // one zone has zero such scenes while another holds ≥50% of the total. Distinct from THEME_
  // REVELATION_PURPOSE_ZONE_CLUSTER/DROUGHT_RUN (Wave 920) and from the revelation-string-field
  // rules — the first application of the 4-zone bloat+empty-zone mode to this purpose value.
  {
    const r934b = checkZoneImbalance({
      records, minRecords: 10, minCount: 4, bloatRatio: 0.5,
      isPresent: r => r.purpose === 'revelation',
    });
    if (r934b.fires) {
      const emptyNames934b = r934b.emptyZoneIdxs.map(i => FOUR_ZONE_NAMES[i]).join(', ');
      const bloatName934b = FOUR_ZONE_NAMES[r934b.bloatZoneIdx];
      issues.push({
        location: `${emptyNames934b} empty; ${bloatName934b} has ${r934b.counts[r934b.bloatZoneIdx]}/${r934b.totalCount} revelation-purposed scenes`,
        rule: 'THEME_REVELATION_PURPOSE_ZONE_IMBALANCE',
        severity: 'minor',
        description: `The story's ${r934b.totalCount} revelation-purposed scenes are unevenly distributed across its four structural zones: ${bloatName934b} contains ${r934b.counts[r934b.bloatZoneIdx]} of them (${Math.round((r934b.counts[r934b.bloatZoneIdx] / r934b.totalCount) * 100)}%) while ${emptyNames934b} contains none. Purpose-built disclosures bloat in one structural quarter and vanish from another, so the theme is illuminated by new truth in only part of the story.`,
        suggestedFix: `Redistribute disclosures: move at least one revelation-purposed scene into the empty zone(s) — ${emptyNames934b} — so the theme keeps being illuminated by new truth across every structural quarter, not only the quarter currently carrying most of them.`,
      });
    }
  }

  // THEME_NEGATIVE_EMOTION_ZONE_IMBALANCE — Underweight/bloat × emotionalShift === 'negative' ×
  // four structural zones. Built on checkZoneImbalance from the shared checks library, extending
  // the 4-zone mode to the emotionalShift valence signal. n≥10, ≥4 negative-shift scenes total,
  // divided across four equal structural zones. Fires only when one zone has zero such scenes while
  // another holds ≥50% of the total. Distinct from the existing 3-zone THEME_NEGATIVE_EMOTION_
  // ZONE_CLUSTER and run-based THEME_NEGATIVE_EMOTION_DROUGHT_RUN — the first application of the
  // 4-zone bloat+empty-zone mode to this valence signal.
  {
    const r934c = checkZoneImbalance({
      records, minRecords: 10, minCount: 4, bloatRatio: 0.5,
      isPresent: r => r.emotionalShift === 'negative',
    });
    if (r934c.fires) {
      const emptyNames934c = r934c.emptyZoneIdxs.map(i => FOUR_ZONE_NAMES[i]).join(', ');
      const bloatName934c = FOUR_ZONE_NAMES[r934c.bloatZoneIdx];
      issues.push({
        location: `${emptyNames934c} empty; ${bloatName934c} has ${r934c.counts[r934c.bloatZoneIdx]}/${r934c.totalCount} negative-shift scenes`,
        rule: 'THEME_NEGATIVE_EMOTION_ZONE_IMBALANCE',
        severity: 'minor',
        description: `The story's ${r934c.totalCount} scenes with a negative emotional shift are unevenly distributed across its four structural zones: ${bloatName934c} contains ${r934c.counts[r934c.bloatZoneIdx]} of them (${Math.round((r934c.counts[r934c.bloatZoneIdx] / r934c.totalCount) * 100)}%) while ${emptyNames934c} contains none. Downturns bloat in one structural quarter and vanish from another, so the theme's cost is felt in only part of the story.`,
        suggestedFix: `Redistribute downturns: place a negative emotional beat in at least one scene inside the empty zone(s) — ${emptyNames934c} — so the theme's cost is felt across every structural quarter, not only the quarter currently carrying most of them.`,
      });
    }
  }

  // THEME_POSITIVE_EMOTION_ZONE_IMBALANCE — Underweight/bloat × emotionalShift === 'positive' ×
  // four structural zones. Built on checkZoneImbalance from the shared checks library. n≥10, ≥4
  // positive-shift scenes total, divided across four equal structural zones. Fires only when one
  // zone has zero such scenes while another holds ≥50% of the total. Distinct from the existing
  // 3-zone THEME_POSITIVE_EMOTION_ZONE_CLUSTER and run-based THEME_POSITIVE_EMOTION_DROUGHT_RUN —
  // the first application of the 4-zone bloat+empty-zone mode to this valence signal, and the
  // positive-valence mirror of the Wave 934 THEME_NEGATIVE_EMOTION_ZONE_IMBALANCE.
  {
    const r948a = checkZoneImbalance({
      records, minRecords: 10, minCount: 4, bloatRatio: 0.5,
      isPresent: r => r.emotionalShift === 'positive',
    });
    if (r948a.fires) {
      const emptyNames948a = r948a.emptyZoneIdxs.map(i => FOUR_ZONE_NAMES[i]).join(', ');
      const bloatName948a = FOUR_ZONE_NAMES[r948a.bloatZoneIdx];
      issues.push({
        location: `${emptyNames948a} empty; ${bloatName948a} has ${r948a.counts[r948a.bloatZoneIdx]}/${r948a.totalCount} positive-shift scenes`,
        rule: 'THEME_POSITIVE_EMOTION_ZONE_IMBALANCE',
        severity: 'minor',
        description: `The story's ${r948a.totalCount} scenes with a positive emotional shift are unevenly distributed across its four structural zones: ${bloatName948a} contains ${r948a.counts[r948a.bloatZoneIdx]} of them (${Math.round((r948a.counts[r948a.bloatZoneIdx] / r948a.totalCount) * 100)}%) while ${emptyNames948a} contains none. Affirming beats bloat in one structural quarter and vanish from another, so the theme's reward is felt in only part of the story.`,
        suggestedFix: `Redistribute affirmations: place a positive emotional beat in at least one scene inside the empty zone(s) — ${emptyNames948a} — so the theme's reward is felt across every structural quarter, not only the quarter currently carrying most of them.`,
      });
    }
  }

  // THEME_SUSPENSE_ZONE_IMBALANCE — Underweight/bloat × (suspenseDelta > 0) × four structural
  // zones. Built on checkZoneImbalance from the shared checks library. n≥10, ≥4 suspense-raising
  // scenes total, divided across four equal structural zones. Fires only when one zone has zero
  // such scenes while another holds ≥50% of the total. Distinct from the existing 3-zone THEME_
  // SUSPENSE_ZONE_CLUSTER and run-based THEME_SUSPENSE_DROUGHT_RUN — the first application of the
  // 4-zone bloat+empty-zone mode to the suspense-delta magnitude signal in this pass, keying on
  // tension change rather than categorical purpose or emotional valence.
  {
    const r948b = checkZoneImbalance({
      records, minRecords: 10, minCount: 4, bloatRatio: 0.5,
      isPresent: r => (r.suspenseDelta ?? 0) > 0,
    });
    if (r948b.fires) {
      const emptyNames948b = r948b.emptyZoneIdxs.map(i => FOUR_ZONE_NAMES[i]).join(', ');
      const bloatName948b = FOUR_ZONE_NAMES[r948b.bloatZoneIdx];
      issues.push({
        location: `${emptyNames948b} empty; ${bloatName948b} has ${r948b.counts[r948b.bloatZoneIdx]}/${r948b.totalCount} suspense-raising scenes`,
        rule: 'THEME_SUSPENSE_ZONE_IMBALANCE',
        severity: 'minor',
        description: `The story's ${r948b.totalCount} suspense-raising scenes are unevenly distributed across its four structural zones: ${bloatName948b} contains ${r948b.counts[r948b.bloatZoneIdx]} of them (${Math.round((r948b.counts[r948b.bloatZoneIdx] / r948b.totalCount) * 100)}%) while ${emptyNames948b} contains none. Tension bloats in one structural quarter and flatlines in another, so the pressure that tests the theme is confined to part of the story.`,
        suggestedFix: `Redistribute suspense: move or add a scene that raises suspense (suspenseDelta > 0) into the empty zone(s) — ${emptyNames948b} — so the theme stays under pressure across every structural quarter, not only the quarter currently carrying most of it.`,
      });
    }
  }

  // THEME_SEED_ZONE_IMBALANCE — Underweight/bloat × (seededClueIds.length > 0) × four structural
  // zones. Built on checkZoneImbalance from the shared checks library. n≥10, ≥4 seeding scenes
  // total, divided across four equal structural zones. Fires only when one zone has zero such
  // scenes while another holds ≥50% of the total. Distinct from the existing 3-zone THEME_SEED_
  // ZONE_CLUSTER and run-based THEME_SEED_DROUGHT_RUN, and distinct from the other array-field
  // imbalances in this pass — THEME_UNRESOLVED_CLUE_ZONE_IMBALANCE (unresolvedClues), THEME_VISUAL_
  // BEAT_ZONE_IMBALANCE (visualBeats), and THEME_PAYOFF_ZONE_IMBALANCE (payoffSetupIds) — as it keys
  // on the seededClueIds field, a genuinely different array from all three.
  {
    const r948c = checkZoneImbalance({
      records, minRecords: 10, minCount: 4, bloatRatio: 0.5,
      isPresent: r => (r.seededClueIds ?? []).length > 0,
    });
    if (r948c.fires) {
      const emptyNames948c = r948c.emptyZoneIdxs.map(i => FOUR_ZONE_NAMES[i]).join(', ');
      const bloatName948c = FOUR_ZONE_NAMES[r948c.bloatZoneIdx];
      issues.push({
        location: `${emptyNames948c} empty; ${bloatName948c} has ${r948c.counts[r948c.bloatZoneIdx]}/${r948c.totalCount} seeding scenes`,
        rule: 'THEME_SEED_ZONE_IMBALANCE',
        severity: 'minor',
        description: `The story's ${r948c.totalCount} clue-seeding scenes are unevenly distributed across its four structural zones: ${bloatName948c} contains ${r948c.counts[r948c.bloatZoneIdx]} of them (${Math.round((r948c.counts[r948c.bloatZoneIdx] / r948c.totalCount) * 100)}%) while ${emptyNames948c} contains none. Thematic setups bloat in one structural quarter and never get planted in another, so the motifs the theme later reprises are seeded in only part of the story.`,
        suggestedFix: `Redistribute seeds: plant a clue (non-empty seededClueIds) in at least one scene inside the empty zone(s) — ${emptyNames948c} — so the theme's motifs are seeded across every structural quarter, not only the quarter currently carrying most of them.`,
      });
    }
  }

  // THEME_CURIOSITY_ZONE_IMBALANCE — Underweight/bloat × (curiosityDelta > 0) × four structural
  // zones. Built on checkZoneImbalance from the shared checks library. n≥10, ≥4 curiosity-raising
  // scenes total, divided across four equal structural zones. Fires only when one zone has zero such
  // scenes while another holds ≥50% of the total. Distinct from the existing 3-zone THEME_CURIOSITY_
  // ZONE_CLUSTER and run-based THEME_CURIOSITY_DROUGHT_RUN — the first application of the 4-zone
  // bloat+empty-zone mode to the curiosity-delta magnitude signal in this pass, keying on question-
  // raising change rather than the suspense delta audited in Wave 948.
  {
    const r962a = checkZoneImbalance({
      records, minRecords: 10, minCount: 4, bloatRatio: 0.5,
      isPresent: r => (r.curiosityDelta ?? 0) > 0,
    });
    if (r962a.fires) {
      const emptyNames962a = r962a.emptyZoneIdxs.map(i => FOUR_ZONE_NAMES[i]).join(', ');
      const bloatName962a = FOUR_ZONE_NAMES[r962a.bloatZoneIdx];
      issues.push({
        location: `${emptyNames962a} empty; ${bloatName962a} has ${r962a.counts[r962a.bloatZoneIdx]}/${r962a.totalCount} curiosity-raising scenes`,
        rule: 'THEME_CURIOSITY_ZONE_IMBALANCE',
        severity: 'minor',
        description: `The story's ${r962a.totalCount} curiosity-raising scenes are unevenly distributed across its four structural zones: ${bloatName962a} contains ${r962a.counts[r962a.bloatZoneIdx]} of them (${Math.round((r962a.counts[r962a.bloatZoneIdx] / r962a.totalCount) * 100)}%) while ${emptyNames962a} contains none. New questions bloat in one structural quarter and never open in another, so the questions the theme keeps alive drive only part of the story.`,
        suggestedFix: `Redistribute curiosity: move or add a scene that raises curiosity (curiosityDelta > 0) into the empty zone(s) — ${emptyNames962a} — so the theme keeps its central question open across every structural quarter, not only the quarter currently carrying most of them.`,
      });
    }
  }

  // THEME_REVELATION_ZONE_IMBALANCE — Underweight/bloat × (revelation != null) × four structural
  // zones. Built on checkZoneImbalance from the shared checks library. n≥10, ≥4 revelation scenes
  // total, divided across four equal structural zones. Fires only when one zone has zero such scenes
  // while another holds ≥50% of the total. Distinct from the existing 3-zone THEME_REVELATION_ZONE_
  // CLUSTER and run-based THEME_REVELATION_DROUGHT_RUN — the first application of the 4-zone bloat+
  // empty-zone mode to the revelation STRING field (revelation != null), and distinct from THEME_
  // REVELATION_PURPOSE_ZONE_IMBALANCE, which audits the separate purpose === 'revelation' enum value.
  {
    const r962b = checkZoneImbalance({
      records, minRecords: 10, minCount: 4, bloatRatio: 0.5,
      isPresent: r => r.revelation != null,
    });
    if (r962b.fires) {
      const emptyNames962b = r962b.emptyZoneIdxs.map(i => FOUR_ZONE_NAMES[i]).join(', ');
      const bloatName962b = FOUR_ZONE_NAMES[r962b.bloatZoneIdx];
      issues.push({
        location: `${emptyNames962b} empty; ${bloatName962b} has ${r962b.counts[r962b.bloatZoneIdx]}/${r962b.totalCount} revelation scenes`,
        rule: 'THEME_REVELATION_ZONE_IMBALANCE',
        severity: 'minor',
        description: `The story's ${r962b.totalCount} revelation scenes are unevenly distributed across its four structural zones: ${bloatName962b} contains ${r962b.counts[r962b.bloatZoneIdx]} of them (${Math.round((r962b.counts[r962b.bloatZoneIdx] / r962b.totalCount) * 100)}%) while ${emptyNames962b} contains none. Disclosures bloat in one structural quarter and never land in another, so the truths that deepen the theme surface in only part of the story.`,
        suggestedFix: `Redistribute disclosures: land a revelation in at least one scene inside the empty zone(s) — ${emptyNames962b} — so the theme keeps deepening through new truth across every structural quarter, not only the quarter currently carrying most of them.`,
      });
    }
  }

  // THEME_RELATIONSHIP_ZONE_IMBALANCE — Underweight/bloat × (relationshipShifts.length > 0) × four
  // structural zones. Built on checkZoneImbalance from the shared checks library. n≥10, ≥4 scenes
  // with a relationship shift total, divided across four equal structural zones. Fires only when one
  // zone has zero such scenes while another holds ≥50% of the total. Distinct from the existing 3-zone
  // THEME_RELATIONSHIP_ZONE_CLUSTER and run-based THEME_RELATIONSHIP_DROUGHT_RUN, and distinct from the
  // other array-field imbalances in this pass — THEME_UNRESOLVED_CLUE (unresolvedClues), THEME_VISUAL_
  // BEAT (visualBeats), THEME_PAYOFF (payoffSetupIds), THEME_SEED (seededClueIds) — as it keys on the
  // relationshipShifts field, a genuinely different array from all four.
  {
    const r962c = checkZoneImbalance({
      records, minRecords: 10, minCount: 4, bloatRatio: 0.5,
      isPresent: r => (r.relationshipShifts ?? []).length > 0,
    });
    if (r962c.fires) {
      const emptyNames962c = r962c.emptyZoneIdxs.map(i => FOUR_ZONE_NAMES[i]).join(', ');
      const bloatName962c = FOUR_ZONE_NAMES[r962c.bloatZoneIdx];
      issues.push({
        location: `${emptyNames962c} empty; ${bloatName962c} has ${r962c.counts[r962c.bloatZoneIdx]}/${r962c.totalCount} relationship-shift scenes`,
        rule: 'THEME_RELATIONSHIP_ZONE_IMBALANCE',
        severity: 'minor',
        description: `The story's ${r962c.totalCount} scenes with a relationship shift are unevenly distributed across its four structural zones: ${bloatName962c} contains ${r962c.counts[r962c.bloatZoneIdx]} of them (${Math.round((r962c.counts[r962c.bloatZoneIdx] / r962c.totalCount) * 100)}%) while ${emptyNames962c} contains none. Bonds change in a bloated cluster in one structural quarter and stay static in another, so the theme is dramatized through relationships in only part of the story.`,
        suggestedFix: `Redistribute relational change: give at least one scene inside the empty zone(s) — ${emptyNames962c} — a relationship shift so the theme keeps being dramatized through bonds across every structural quarter, not only the quarter currently carrying most of them.`,
      });
    }
  }

  // THEME_CLOCK_ZONE_IMBALANCE — Underweight/bloat × (clockRaised === true) × four structural zones.
  // Built on checkZoneImbalance from the shared checks library. n≥10, ≥4 clock-raising scenes total,
  // divided across four equal structural zones. Fires only when one zone has zero such scenes while
  // another holds ≥50% of the total. Uses the same clockRaised === true predicate as the existing
  // 3-zone THEME_CLOCK_ZONE_CLUSTER and run-based THEME_CLOCK_DROUGHT_RUN — the first application of
  // the 4-zone bloat+empty-zone mode to the clockRaised BOOLEAN field, distinct from the numeric
  // clockDelta signal audited just below.
  {
    const r976a = checkZoneImbalance({
      records, minRecords: 10, minCount: 4, bloatRatio: 0.5,
      isPresent: r => r.clockRaised === true,
    });
    if (r976a.fires) {
      const emptyNames976a = r976a.emptyZoneIdxs.map(i => FOUR_ZONE_NAMES[i]).join(', ');
      const bloatName976a = FOUR_ZONE_NAMES[r976a.bloatZoneIdx];
      issues.push({
        location: `${emptyNames976a} empty; ${bloatName976a} has ${r976a.counts[r976a.bloatZoneIdx]}/${r976a.totalCount} clock-raising scenes`,
        rule: 'THEME_CLOCK_ZONE_IMBALANCE',
        severity: 'minor',
        description: `The story's ${r976a.totalCount} clock-raising scenes are unevenly distributed across its four structural zones: ${bloatName976a} contains ${r976a.counts[r976a.bloatZoneIdx]} of them (${Math.round((r976a.counts[r976a.bloatZoneIdx] / r976a.totalCount) * 100)}%) while ${emptyNames976a} contains none. Ticking clocks bloat in one structural quarter and are never introduced in another, so the theme's cost is felt under deadline pressure in only part of the story.`,
        suggestedFix: `Redistribute ticking clocks: introduce a time pressure (clockRaised) in at least one scene inside the empty zone(s) — ${emptyNames976a} — so the theme keeps testing itself under deadline pressure across every structural quarter, not only the quarter currently carrying most of them.`,
      });
    }
  }

  // THEME_CLOCK_DELTA_ZONE_IMBALANCE — Underweight/bloat × (clockDelta !== 0) × four structural
  // zones. Built on checkZoneImbalance from the shared checks library. n≥10, ≥4 clock-moving scenes
  // total, divided across four equal structural zones. Fires only when one zone has zero such scenes
  // while another holds ≥50% of the total. Uses the same clockDelta !== 0 predicate as the existing
  // 3-zone THEME_CLOCK_DELTA_ZONE_CLUSTER and run-based THEME_CLOCK_DELTA_DROUGHT_RUN — the first
  // application of the 4-zone bloat+empty-zone mode to this delta signal, distinct from the boolean
  // clockRaised field audited just above.
  {
    const r976b = checkZoneImbalance({
      records, minRecords: 10, minCount: 4, bloatRatio: 0.5,
      isPresent: r => (r.clockDelta ?? 0) !== 0,
    });
    if (r976b.fires) {
      const emptyNames976b = r976b.emptyZoneIdxs.map(i => FOUR_ZONE_NAMES[i]).join(', ');
      const bloatName976b = FOUR_ZONE_NAMES[r976b.bloatZoneIdx];
      issues.push({
        location: `${emptyNames976b} empty; ${bloatName976b} has ${r976b.counts[r976b.bloatZoneIdx]}/${r976b.totalCount} clock-moving scenes`,
        rule: 'THEME_CLOCK_DELTA_ZONE_IMBALANCE',
        severity: 'minor',
        description: `The story's ${r976b.totalCount} clock-moving scenes are unevenly distributed across its four structural zones: ${bloatName976b} contains ${r976b.counts[r976b.bloatZoneIdx]} of them (${Math.round((r976b.counts[r976b.bloatZoneIdx] / r976b.totalCount) * 100)}%) while ${emptyNames976b} contains none. Deadline pressure bloats in one structural quarter and never moves in another, so the theme's cost is compressed by urgency in only part of the story.`,
        suggestedFix: `Redistribute clock movement: move or add a scene that changes the clock (clockDelta ≠ 0) into the empty zone(s) — ${emptyNames976b} — so the theme keeps being tested by urgency across every structural quarter, not only the quarter currently carrying most of it.`,
      });
    }
  }

  // THEME_TURN_ZONE_IMBALANCE — Underweight/bloat × (dramaticTurn !== 'nothing') × four structural
  // zones. Built on checkZoneImbalance from the shared checks library. n≥10, ≥4 scenes with a
  // dramatic turn total, divided across four equal structural zones. Fires only when one zone has
  // zero such scenes while another holds ≥50% of the total. Uses the same dramaticTurn !== 'nothing'
  // predicate as the existing 3-zone THEME_TURN_ZONE_CLUSTER and run-based THEME_TURN_DROUGHT_RUN —
  // the first application of the 4-zone bloat+empty-zone mode to the dramatic-turn categorical signal.
  {
    const r976c = checkZoneImbalance({
      records, minRecords: 10, minCount: 4, bloatRatio: 0.5,
      isPresent: r => (r.dramaticTurn ?? 'nothing') !== 'nothing',
    });
    if (r976c.fires) {
      const emptyNames976c = r976c.emptyZoneIdxs.map(i => FOUR_ZONE_NAMES[i]).join(', ');
      const bloatName976c = FOUR_ZONE_NAMES[r976c.bloatZoneIdx];
      issues.push({
        location: `${emptyNames976c} empty; ${bloatName976c} has ${r976c.counts[r976c.bloatZoneIdx]}/${r976c.totalCount} dramatic-turn scenes`,
        rule: 'THEME_TURN_ZONE_IMBALANCE',
        severity: 'minor',
        description: `The story's ${r976c.totalCount} scenes with a dramatic turn are unevenly distributed across its four structural zones: ${bloatName976c} contains ${r976c.counts[r976c.bloatZoneIdx]} of them (${Math.round((r976c.counts[r976c.bloatZoneIdx] / r976c.totalCount) * 100)}%) while ${emptyNames976c} contains none. Turns bloat in one structural quarter and never fire in another, so the theme is tested by reversal in only part of the story.`,
        suggestedFix: `Redistribute turns: give at least one scene inside the empty zone(s) — ${emptyNames976c} — a dramatic turn so the theme keeps being tested by reversal across every structural quarter, not only the quarter currently carrying most of them.`,
      });
    }
  }

  // THEME_HIGHLIGHT_ZONE_IMBALANCE — Underweight/bloat × dialogueHighlights array × four
  // structural zones. Built on checkZoneImbalance from the shared checks library. n≥10, ≥4
  // highlighted-dialogue scenes total, divided across four equal structural zones. Distinct from
  // the existing 3-zone THEME_HIGHLIGHT_ZONE_CLUSTER and run-based THEME_HIGHLIGHT_DROUGHT_RUN —
  // the first application of the 4-zone bloat+empty-zone mode to this channel.
  {
    const r990a = checkZoneImbalance({
      records, minRecords: 10, minCount: 4, bloatRatio: 0.5,
      isPresent: r => (r.dialogueHighlights ?? []).length > 0,
    });
    if (r990a.fires) {
      const emptyNames990a = r990a.emptyZoneIdxs.map(i => FOUR_ZONE_NAMES[i]).join(', ');
      const bloatName990a = FOUR_ZONE_NAMES[r990a.bloatZoneIdx];
      issues.push({
        location: `${emptyNames990a} empty; ${bloatName990a} has ${r990a.counts[r990a.bloatZoneIdx]}/${r990a.totalCount} highlighted-dialogue scenes`,
        rule: 'THEME_HIGHLIGHT_ZONE_IMBALANCE',
        severity: 'minor',
        description: `The story's ${r990a.totalCount} scenes carrying a standout line of dialogue are unevenly distributed across its four structural zones: ${bloatName990a} contains ${r990a.counts[r990a.bloatZoneIdx]} of them (${Math.round((r990a.counts[r990a.bloatZoneIdx] / r990a.totalCount) * 100)}%) while ${emptyNames990a} contains none. Memorable dialogue bloats in one structural quarter and never lands in another, so the theme's most articulate statements arrive in only part of the story.`,
        suggestedFix: `Redistribute quotable lines: give at least one scene inside the empty zone(s) — ${emptyNames990a} — a standout line of dialogue so the theme's most articulate statements land across every structural quarter, not only the quarter currently carrying most of them.`,
      });
    }
  }

  // THEME_OPEN_THREAD_ZONE_IMBALANCE — Underweight/bloat × unresolvedClues array × four
  // structural zones. Built on checkZoneImbalance from the shared checks library. n≥10, ≥4 debt-
  // carrying scenes total, divided across four equal structural zones. Distinct from the existing
  // 3-zone THEME_OPEN_THREAD_ZONE_CLUSTER and run-based THEME_OPEN_THREAD_DROUGHT_RUN — the last of
  // this pass's two remaining clean trio-complete signals (THEME_STAGING was skipped: its cluster
  // (visualBeats.length>=2) and drought-run (visualBeats.length>0) predicates disagree, so its
  // "trio" doesn't actually audit one consistent signal).
  {
    const r990b = checkZoneImbalance({
      records, minRecords: 10, minCount: 4, bloatRatio: 0.5,
      isPresent: r => (r.unresolvedClues ?? []).length > 0,
    });
    if (r990b.fires) {
      const emptyNames990b = r990b.emptyZoneIdxs.map(i => FOUR_ZONE_NAMES[i]).join(', ');
      const bloatName990b = FOUR_ZONE_NAMES[r990b.bloatZoneIdx];
      issues.push({
        location: `${emptyNames990b} empty; ${bloatName990b} has ${r990b.counts[r990b.bloatZoneIdx]}/${r990b.totalCount} open-thread scenes`,
        rule: 'THEME_OPEN_THREAD_ZONE_IMBALANCE',
        severity: 'minor',
        description: `The story's ${r990b.totalCount} scenes carrying unresolved clue-debt are unevenly distributed across its four structural zones: ${bloatName990b} contains ${r990b.counts[r990b.bloatZoneIdx]} of them (${Math.round((r990b.counts[r990b.bloatZoneIdx] / r990b.totalCount) * 100)}%) while ${emptyNames990b} contains none. Open questions bloat in one structural quarter and never carry into another, so the theme's uncertainty concentrates in only part of the story.`,
        suggestedFix: `Redistribute open threads: carry unresolved clue-debt into at least one scene inside the empty zone(s) — ${emptyNames990b} — so the theme's uncertainty holds across every structural quarter, not only the quarter currently carrying most of it.`,
      });
    }
  }

  // THEME_STAKES_CURIOSITY_AFTERMATH_VOID — with zone-imbalance now exhausted down to the two
  // signals above, this wave completes the trio via the sequence/aftermath mode. Built on
  // checkAftermathVoid from the shared checks library. n≥8, ≥2 qualifying stakes-raise scenes
  // (purpose === 'raise_stakes', pos<n-2), ≥2 curiosity-raising scenes anywhere, 2-scene lookahead.
  // Fires when every stakes-raise's two-scene aftermath opens no new curiosity, while curiosity
  // does occur elsewhere. The only prior aftermath-void rule in this pass (THEME_SEED_DIALOGUE_
  // HIGHLIGHT_AFTERMATH_VOID) uses seededClueIds as its trigger — this is the first use of
  // raise_stakes as an aftermath-void trigger in this pass.
  {
    const r990c = checkAftermathVoid({
      records, minRecords: 8, minTriggerCount: 2, minAftermathCount: 2, window: 2,
      isTrigger: r => r.purpose === 'raise_stakes',
      isAftermath: r => (r.curiosityDelta ?? 0) > 0,
    });
    if (r990c.fires) {
      issues.push({
        location: `${r990c.triggerCount} stakes-raise aftermath(s) — no curiosity raised within 2 scenes`,
        rule: 'THEME_STAKES_CURIOSITY_AFTERMATH_VOID',
        severity: 'minor',
        description: `Every stakes-raising scene (${r990c.triggerCount} escalations) is followed by two scenes that raise no new curiosity, even though ${r990c.aftermathCount} scenes elsewhere do open fresh questions. Escalating danger that never provokes a new uncertainty about what comes next leaves the theme untested by the story's own rising pressure in the beats immediately following.`,
        suggestedFix: `In the two scenes following at least one stakes-raise, plant a new open question so escalation keeps testing the theme rather than sitting in a learnable void.`,
      });
    }
  }

  // THEME_STAKES_SUSPENSE_AFTERMATH_VOID — Sequence/aftermath × raise_stakes trigger →
  // suspenseDelta absence. Built on checkAftermathVoid from the shared checks library. n≥8, ≥2
  // qualifying stakes-raise scenes (pos<n-2), ≥2 tension-raising scenes anywhere, 2-scene
  // lookahead. Fires when every stakes-raise's two-scene aftermath raises no tension, while
  // tension does rise elsewhere. Distinct from THEME_STAKES_CURIOSITY_AFTERMATH_VOID (same
  // trigger paired with curiosityDelta) — this pairs raise_stakes with suspenseDelta for the first
  // time in this pass.
  {
    const r1004a = checkAftermathVoid({
      records, minRecords: 8, minTriggerCount: 2, minAftermathCount: 2, window: 2,
      isTrigger: r => r.purpose === 'raise_stakes',
      isAftermath: r => (r.suspenseDelta ?? 0) > 0,
    });
    if (r1004a.fires) {
      issues.push({
        location: `${r1004a.triggerCount} stakes-raise aftermath(s) — no suspense raised within 2 scenes`,
        rule: 'THEME_STAKES_SUSPENSE_AFTERMATH_VOID',
        severity: 'minor',
        description: `Every stakes-raising scene (${r1004a.triggerCount} escalations) is followed by two scenes with no rise in tension, even though ${r1004a.aftermathCount} such rises occur elsewhere. Escalating danger that never tightens the felt sense of jeopardy in the beats right after it leaves the theme untested by a threat the audience actually feels.`,
        suggestedFix: `In the two scenes following at least one stakes-raise, tighten the tension — a ticking complication or a near-miss — so escalating danger registers as felt, not just stated.`,
      });
    }
  }

  // THEME_SEED_CURIOSITY_AFTERMATH_VOID — Sequence/aftermath × seededClueIds trigger →
  // curiosityDelta absence. Built on checkAftermathVoid from the shared checks library. n≥8, ≥2
  // qualifying seed scenes (pos<n-2), ≥2 curiosity-raising scenes anywhere, 2-scene lookahead.
  // Fires when every seed's two-scene aftermath opens no new curiosity, while curiosity does occur
  // elsewhere. Distinct from THEME_SEED_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID (same trigger paired
  // with dialogueHighlights) — this pairs seededClueIds with curiosityDelta for the first time in
  // this pass.
  {
    const r1004b = checkAftermathVoid({
      records, minRecords: 8, minTriggerCount: 2, minAftermathCount: 2, window: 2,
      isTrigger: r => (r.seededClueIds ?? []).length > 0,
      isAftermath: r => (r.curiosityDelta ?? 0) > 0,
    });
    if (r1004b.fires) {
      issues.push({
        location: `${r1004b.triggerCount} seed aftermath(s) — no curiosity raised within 2 scenes`,
        rule: 'THEME_SEED_CURIOSITY_AFTERMATH_VOID',
        severity: 'minor',
        description: `Every clue-seeding scene (${r1004b.triggerCount} plants) is followed by two scenes that raise no new curiosity, even though ${r1004b.aftermathCount} scenes elsewhere do open fresh questions. A planted clue that never compounds into a further question leaves the theme's groundwork inert rather than deepening the audience's investment in what it will mean.`,
        suggestedFix: `Let at least one seed compound in its aftermath: in the scene or two after a clue is planted, let its implications provoke a new question tied to the theme.`,
      });
    }
  }

  // THEME_OPEN_THREAD_EMOTIONAL_AFTERMATH_VOID — Sequence/aftermath × unresolvedClues trigger →
  // emotionalShift absence. Built on checkAftermathVoid from the shared checks library. n≥8, ≥2
  // qualifying open-thread scenes (unresolvedClues.length>0, pos<n-2), ≥2 emotionally-charged
  // scenes anywhere, 2-scene lookahead. Fires when every open-thread scene's two-scene aftermath is
  // emotionally flat, while charged scenes occur elsewhere. This pass's existing hasDebt598 trigger
  // has only ever been paired with the theme-resonance keyword channel (isResonant598) — this is
  // the first pairing with the standard emotionalShift signal.
  {
    const r1004c = checkAftermathVoid({
      records, minRecords: 8, minTriggerCount: 2, minAftermathCount: 2, window: 2,
      isTrigger: r => (r.unresolvedClues ?? []).length > 0,
      isAftermath: r => (r.emotionalShift ?? 'neutral') !== 'neutral',
    });
    if (r1004c.fires) {
      issues.push({
        location: `${r1004c.triggerCount} open-thread scene(s) — no emotional shift within 2 scenes of any`,
        rule: 'THEME_OPEN_THREAD_EMOTIONAL_AFTERMATH_VOID',
        severity: 'minor',
        description: `Every scene leaving a thread unresolved (${r1004c.triggerCount} open questions) is followed by two emotionally neutral scenes, even though ${r1004c.aftermathCount} emotionally-charged scenes exist elsewhere. Unresolved material that never registers as felt weight in the scenes right after it leaves the theme's uncertainty inert rather than pressing on anyone.`,
        suggestedFix: `In the two scenes following at least one open thread, show a character reacting emotionally to what's still unresolved so the theme's uncertainty presses on the story rather than sitting as inert backlog.`,
      });
    }
  }

  // THEME_STAKES_EMOTIONAL_AFTERMATH_VOID — Sequence/aftermath × raise_stakes trigger →
  // emotionalShift absence. Built on checkAftermathVoid from the shared checks library. n≥8, ≥2
  // qualifying stakes-raise scenes (pos<n-2), ≥2 emotionally-charged scenes anywhere, 2-scene
  // lookahead. Fires when every stakes-raise's two-scene aftermath is emotionally flat, while
  // charged scenes occur elsewhere. Distinct from THEME_STAKES_CURIOSITY_AFTERMATH_VOID
  // (curiosityDelta) and THEME_STAKES_SUSPENSE_AFTERMATH_VOID (Wave 1004, suspenseDelta) — this is
  // the third consequence channel for this trigger in this pass.
  {
    const r1018a = checkAftermathVoid({
      records, minRecords: 8, minTriggerCount: 2, minAftermathCount: 2, window: 2,
      isTrigger: r => r.purpose === 'raise_stakes',
      isAftermath: r => (r.emotionalShift ?? 'neutral') !== 'neutral',
    });
    if (r1018a.fires) {
      issues.push({
        location: `${r1018a.triggerCount} stakes-raise aftermath(s) — no emotional shift within 2 scenes`,
        rule: 'THEME_STAKES_EMOTIONAL_AFTERMATH_VOID',
        severity: 'minor',
        description: `Every stakes-raising scene (${r1018a.triggerCount} escalations) is followed by two emotionally neutral scenes, even though ${r1018a.aftermathCount} emotionally-charged scenes exist elsewhere. Escalating danger should usually carry felt weight for the characters living through it; when every stakes-raise's aftermath is affectively flat, the theme is untested by a threat anyone actually feels.`,
        suggestedFix: `Let at least one stakes-raise carry feeling in its aftermath: in the scene or two after the danger sharpens, show someone reacting to it emotionally — fear, resolve, dread.`,
      });
    }
  }

  // THEME_SEED_RELATIONAL_AFTERMATH_VOID — Sequence/aftermath × seededClueIds trigger →
  // relationshipShifts absence. Built on checkAftermathVoid from the shared checks library. n≥8,
  // ≥2 qualifying seed scenes (pos<n-2), ≥2 relationship-shift scenes anywhere, 2-scene lookahead.
  // Fires when every seed's two-scene aftermath carries no relationship shift, while such shifts
  // occur elsewhere. Distinct from THEME_SEED_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID
  // (dialogueHighlights) and THEME_SEED_CURIOSITY_AFTERMATH_VOID (Wave 1004, curiosityDelta) —
  // this is the third consequence channel for this trigger in this pass.
  {
    const r1018b = checkAftermathVoid({
      records, minRecords: 8, minTriggerCount: 2, minAftermathCount: 2, window: 2,
      isTrigger: r => (r.seededClueIds ?? []).length > 0,
      isAftermath: r => (r.relationshipShifts ?? []).length > 0,
    });
    if (r1018b.fires) {
      issues.push({
        location: `${r1018b.triggerCount} seed aftermath(s) — no relationship shift within 2 scenes`,
        rule: 'THEME_SEED_RELATIONAL_AFTERMATH_VOID',
        severity: 'minor',
        description: `Every clue-seeding scene (${r1018b.triggerCount} plants) is followed by two scenes with no shift in any relationship, even though ${r1018b.aftermathCount} such shifts occur elsewhere. A planted clue that never bears on how characters treat each other nearby leaves the theme's groundwork disconnected from the relational stakes it should be tied to.`,
        suggestedFix: `In the two scenes following at least one clue-seeding moment, let the planted material strain or shift a relationship so the seed carries interpersonal weight alongside its narrative function.`,
      });
    }
  }

  // THEME_STAGING_CURIOSITY_AFTERMATH_VOID — Sequence/aftermath × visualBeats trigger →
  // curiosityDelta absence. Built on checkAftermathVoid from the shared checks library. n≥8, ≥2
  // qualifying visually-dense scenes (visualBeats.length>=2, pos<n-2), ≥2 curiosity-raising scenes
  // anywhere, 2-scene lookahead. Fires when every visually-dense scene's two-scene aftermath opens
  // no new curiosity, while curiosity does occur elsewhere. This pass's existing
  // isVisuallyStaged612 trigger has only ever been paired with the theme-resonance keyword channel
  // (isResonant598) — this is the first pairing with the standard curiosityDelta signal.
  {
    const r1018c = checkAftermathVoid({
      records, minRecords: 8, minTriggerCount: 2, minAftermathCount: 2, window: 2,
      isTrigger: r => (r.visualBeats ?? []).length >= 2,
      isAftermath: r => (r.curiosityDelta ?? 0) > 0,
    });
    if (r1018c.fires) {
      issues.push({
        location: `${r1018c.triggerCount} visually-dense aftermath(s) — no curiosity raised within 2 scenes`,
        rule: 'THEME_STAGING_CURIOSITY_AFTERMATH_VOID',
        severity: 'minor',
        description: `Every visually dense scene in the story (${r1018c.triggerCount} instances) is followed by two scenes that raise no new curiosity, even though ${r1018c.aftermathCount} scenes elsewhere do open fresh questions. Physical staging that never provokes a further question leaves the theme's visual language disconnected from the story's forward momentum.`,
        suggestedFix: `In the two scenes following at least one visually dense scene, plant a new open question so the staging's imagery keeps compounding into curiosity rather than sitting inert.`,
      });
    }
  }

  // THEME_STAKES_RELATIONAL_AFTERMATH_VOID — Sequence/aftermath × raise_stakes trigger →
  // relationshipShifts absence. Built on checkAftermathVoid from the shared checks library. n≥8,
  // ≥2 qualifying raise_stakes scenes (pos<n-2), ≥2 relationship-shift scenes anywhere, 2-scene
  // lookahead. Fires when every stakes-raise's two-scene aftermath carries no bond change, while
  // such changes occur elsewhere. Distinct from THEME_STAKES_CURIOSITY_AFTERMATH_VOID, THEME_
  // STAKES_SUSPENSE_AFTERMATH_VOID, and THEME_STAKES_EMOTIONAL_AFTERMATH_VOID (same trigger
  // paired with curiosityDelta/suspenseDelta/emotionalShift respectively) — this is the fourth
  // consequence channel for this trigger in this pass.
  {
    const r1032a = checkAftermathVoid({
      records, minRecords: 8, minTriggerCount: 2, minAftermathCount: 2, window: 2,
      isTrigger: r => r.purpose === 'raise_stakes',
      isAftermath: r => (r.relationshipShifts ?? []).length > 0,
    });
    if (r1032a.fires) {
      issues.push({
        location: `${r1032a.triggerCount} raise-stakes aftermath(s) — no relationship shift within 2 scenes`,
        rule: 'THEME_STAKES_RELATIONAL_AFTERMATH_VOID',
        severity: 'minor',
        description: `Every stakes-raising scene in the story (${r1032a.triggerCount} of them) is followed by two scenes with no shift in any relationship, even though ${r1032a.aftermathCount} such shifts occur elsewhere. Raising the stakes without it ever bearing on how characters treat each other in the scenes right after leaves the theme's escalation registering as plot mechanics rather than a pressure that tests the bonds the theme is meant to be examining.`,
        suggestedFix: `In the two scenes following at least one stakes-raise, let the new danger strain or shift a relationship so the escalation tests the theme through the characters' bonds, not only through the plot.`,
      });
    }
  }

  // THEME_SEED_EMOTIONAL_AFTERMATH_VOID — Sequence/aftermath × seededClueIds trigger →
  // emotionalShift absence. Built on checkAftermathVoid from the shared checks library. n≥8, ≥2
  // qualifying seed scenes (pos<n-2), ≥2 emotionally-charged scenes anywhere, 2-scene lookahead.
  // Fires when every seed's two-scene aftermath carries no emotional shift, while such shifts
  // occur elsewhere. Distinct from the original seededClueIds → dialogueHighlights rule, THEME_
  // SEED_CURIOSITY_AFTERMATH_VOID, and THEME_SEED_RELATIONAL_AFTERMATH_VOID (same trigger paired
  // with dialogueHighlights/curiosityDelta/relationshipShifts respectively) — this is the fourth
  // consequence channel for this trigger.
  {
    const r1032b = checkAftermathVoid({
      records, minRecords: 8, minTriggerCount: 2, minAftermathCount: 2, window: 2,
      isTrigger: r => (r.seededClueIds ?? []).length > 0,
      isAftermath: r => (r.emotionalShift ?? 'neutral') !== 'neutral',
    });
    if (r1032b.fires) {
      issues.push({
        location: `${r1032b.triggerCount} clue-seed aftermath(s) — no emotional shift within 2 scenes`,
        rule: 'THEME_SEED_EMOTIONAL_AFTERMATH_VOID',
        severity: 'minor',
        description: `Every clue-seeding scene in the story (${r1032b.triggerCount} plants) is followed by two emotionally neutral scenes, even though ${r1032b.aftermathCount} emotionally-charged scenes exist elsewhere. Planting a clue without it ever registering as felt in the scenes right after leaves the theme's groundwork purely informational, disconnected from the emotional stakes the theme is meant to carry.`,
        suggestedFix: `In the two scenes following at least one clue-seeding moment, let someone's feelings register the new information so the theme's groundwork lands emotionally, not just as plot data.`,
      });
    }
  }

  // THEME_OPEN_THREAD_CURIOSITY_AFTERMATH_VOID — Sequence/aftermath × unresolvedClues trigger →
  // curiosityDelta absence. Built on checkAftermathVoid from the shared checks library. n≥8, ≥2
  // qualifying open-thread scenes (pos<n-2, unresolvedClues.length>0), ≥2 curiosity-rising scenes
  // anywhere, 2-scene lookahead. Fires when every open-thread scene's two-scene aftermath carries
  // no curiosity rise, while such rises occur elsewhere. Distinct from THEME_OPEN_THREAD_EMOTIONAL_
  // AFTERMATH_VOID (same trigger paired with emotionalShift) — this is the second consequence
  // channel for this trigger.
  {
    const r1032c = checkAftermathVoid({
      records, minRecords: 8, minTriggerCount: 2, minAftermathCount: 2, window: 2,
      isTrigger: r => (r.unresolvedClues ?? []).length > 0,
      isAftermath: r => (r.curiosityDelta ?? 0) > 0,
    });
    if (r1032c.fires) {
      issues.push({
        location: `${r1032c.triggerCount} open-thread aftermath(s) — no curiosity rise within 2 scenes`,
        rule: 'THEME_OPEN_THREAD_CURIOSITY_AFTERMATH_VOID',
        severity: 'minor',
        description: `Every scene carrying an open thread (${r1032c.triggerCount} of them) is followed by two scenes with no rise in curiosity, even though ${r1032c.aftermathCount} such rises occur elsewhere. An unresolved question that never sharpens into fresh intrigue right after it leaves the theme's loose ends stalling rather than deepening the audience's engagement with what the story means.`,
        suggestedFix: `In the two scenes following an open-thread scene, let a new question sharpen the audience's curiosity so the theme's loose ends keep the story's meaning actively unfolding rather than sitting inert.`,
      });
    }
  }

  // THEME_OPEN_THREAD_SUSPENSE_AFTERMATH_VOID — Sequence/aftermath × unresolvedClues trigger →
  // suspenseDelta absence. Built on checkAftermathVoid from the shared checks library. n≥8, ≥2
  // qualifying open-thread scenes (pos<n-2, unresolvedClues.length>0), ≥2 suspense-rising scenes
  // anywhere, 2-scene lookahead. Fires when every open-thread scene's two-scene aftermath carries
  // no suspense rise, while such rises occur elsewhere. Distinct from THEME_OPEN_THREAD_EMOTIONAL_
  // AFTERMATH_VOID and THEME_OPEN_THREAD_CURIOSITY_AFTERMATH_VOID (same trigger paired with
  // emotionalShift and curiosityDelta respectively) — this is the third consequence channel for
  // this trigger.
  {
    const r1046a = checkAftermathVoid({
      records, minRecords: 8, minTriggerCount: 2, minAftermathCount: 2, window: 2,
      isTrigger: r => (r.unresolvedClues ?? []).length > 0,
      isAftermath: r => (r.suspenseDelta ?? 0) > 0,
    });
    if (r1046a.fires) {
      issues.push({
        location: `${r1046a.triggerCount} open-thread aftermath(s) — no suspense rise within 2 scenes`,
        rule: 'THEME_OPEN_THREAD_SUSPENSE_AFTERMATH_VOID',
        severity: 'minor',
        description: `Every scene carrying an open thread (${r1046a.triggerCount} of them) is followed by two scenes with no rise in suspense, even though ${r1046a.aftermathCount} such rises occur elsewhere. An unresolved question that never tightens the felt sense of danger right after it leaves the theme's loose ends stalling rather than pressuring the story toward what it's really about.`,
        suggestedFix: `In the two scenes following an open-thread scene, let the tension rise so the theme's unresolved questions keep pressuring the story forward, not just sitting as inert backlog.`,
      });
    }
  }

  // THEME_OPEN_THREAD_RELATIONAL_AFTERMATH_VOID — Sequence/aftermath × unresolvedClues trigger →
  // relationshipShifts absence. Built on checkAftermathVoid from the shared checks library. n≥8,
  // ≥2 qualifying open-thread scenes (pos<n-2, unresolvedClues.length>0), ≥2 relationship-shift
  // scenes anywhere, 2-scene lookahead. Fires when every open-thread scene's two-scene aftermath
  // carries no bond change, while such changes occur elsewhere. Distinct from THEME_OPEN_THREAD_
  // EMOTIONAL_AFTERMATH_VOID, THEME_OPEN_THREAD_CURIOSITY_AFTERMATH_VOID, and THEME_OPEN_THREAD_
  // SUSPENSE_AFTERMATH_VOID (same trigger paired with emotionalShift/curiosityDelta/suspenseDelta
  // respectively) — this is the fourth consequence channel for this trigger.
  {
    const r1046b = checkAftermathVoid({
      records, minRecords: 8, minTriggerCount: 2, minAftermathCount: 2, window: 2,
      isTrigger: r => (r.unresolvedClues ?? []).length > 0,
      isAftermath: r => (r.relationshipShifts ?? []).length > 0,
    });
    if (r1046b.fires) {
      issues.push({
        location: `${r1046b.triggerCount} open-thread aftermath(s) — no relationship shift within 2 scenes`,
        rule: 'THEME_OPEN_THREAD_RELATIONAL_AFTERMATH_VOID',
        severity: 'minor',
        description: `Every scene carrying an open thread (${r1046b.triggerCount} of them) is followed by two scenes with no shift in any relationship, even though ${r1046b.aftermathCount} such shifts occur elsewhere. An unresolved question that never bears on how characters treat each other nearby leaves the theme's loose ends purely informational rather than something straining the bonds the theme is meant to be examining.`,
        suggestedFix: `In the two scenes following an open-thread scene, let the unresolved question strain or shift a relationship so the theme's uncertainty tests the characters' bonds, not just their plans.`,
      });
    }
  }

  // THEME_STAGING_EMOTIONAL_AFTERMATH_VOID — Sequence/aftermath × visualBeats trigger →
  // emotionalShift absence. Built on checkAftermathVoid from the shared checks library. n≥8, ≥2
  // qualifying visually-staged scenes (pos<n-2, visualBeats.length>=2), ≥2 emotionally-charged
  // scenes anywhere, 2-scene lookahead. Fires when every staged scene's two-scene aftermath
  // carries no emotional shift, while such shifts occur elsewhere. Distinct from THEME_STAGING_
  // CURIOSITY_AFTERMATH_VOID (same trigger paired with curiosityDelta) — this is the second
  // consequence channel for this trigger.
  {
    const r1046c = checkAftermathVoid({
      records, minRecords: 8, minTriggerCount: 2, minAftermathCount: 2, window: 2,
      isTrigger: r => (r.visualBeats ?? []).length >= 2,
      isAftermath: r => (r.emotionalShift ?? 'neutral') !== 'neutral',
    });
    if (r1046c.fires) {
      issues.push({
        location: `${r1046c.triggerCount} staging aftermath(s) — no emotional shift within 2 scenes`,
        rule: 'THEME_STAGING_EMOTIONAL_AFTERMATH_VOID',
        severity: 'minor',
        description: `Every heavily-staged scene in the story (${r1046c.triggerCount} of them) is followed by two emotionally neutral scenes, even though ${r1046c.aftermathCount} emotionally-charged scenes exist elsewhere. A visually dense moment that never registers as felt in the scenes right after it leaves the theme's imagery decorative rather than something that moves anyone.`,
        suggestedFix: `In the two scenes following at least one heavily-staged moment, let someone's feelings register what was just visually established so the theme's imagery lands emotionally, not just visually.`,
      });
    }
  }

  // THEME_SEED_SUSPENSE_AFTERMATH_VOID — Sequence/aftermath × seededClueIds trigger →
  // suspenseDelta absence. Built on checkAftermathVoid from the shared checks library. n≥8, ≥2
  // qualifying seed scenes (pos<n-2), ≥2 suspense-rising scenes anywhere, 2-scene lookahead. Fires
  // when every seed's two-scene aftermath carries no rise in suspense, while such rises occur
  // elsewhere. Distinct from THEME_SEED_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID, THEME_SEED_CURIOSITY_
  // AFTERMATH_VOID, THEME_SEED_RELATIONAL_AFTERMATH_VOID, and THEME_SEED_EMOTIONAL_AFTERMATH_VOID
  // (same trigger paired with dialogueHighlights/curiosityDelta/relationshipShifts/emotionalShift
  // respectively) — this is the fifth consequence channel for this trigger.
  {
    const r1060a = checkAftermathVoid({
      records, minRecords: 8, minTriggerCount: 2, minAftermathCount: 2, window: 2,
      isTrigger: r => (r.seededClueIds ?? []).length > 0,
      isAftermath: r => (r.suspenseDelta ?? 0) > 0,
    });
    if (r1060a.fires) {
      issues.push({
        location: `${r1060a.triggerCount} seed scene(s) — no suspense rise within 2 scenes of any`,
        rule: 'THEME_SEED_SUSPENSE_AFTERMATH_VOID',
        severity: 'minor',
        description: `Every one of the story's ${r1060a.triggerCount} clue-planting scenes is followed by two scenes with no rise in suspense, even though ${r1060a.aftermathCount} such rises occur elsewhere. A planted thread that never tightens the felt sense of tension right after it lands registers as inert setup rather than a thematic seed the story keeps pressuring.`,
        suggestedFix: `In the two scenes following at least one clue-seeding moment, let suspense tighten so the theme's planted material feels actively watched, not just recorded and forgotten.`,
      });
    }
  }

  // THEME_STAKES_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID — Sequence/aftermath × raise_stakes trigger →
  // dialogueHighlights absence. Built on checkAftermathVoid from the shared checks library. n≥8,
  // ≥2 qualifying stakes-raising scenes (pos<n-2), ≥2 scenes anywhere with a highlighted line of
  // dialogue, 2-scene lookahead. Fires when every stakes-raise's two-scene aftermath contains no
  // highlighted dialogue, while such dialogue occurs elsewhere. Distinct from THEME_STAKES_
  // CURIOSITY_AFTERMATH_VOID, THEME_STAKES_SUSPENSE_AFTERMATH_VOID, THEME_STAKES_EMOTIONAL_
  // AFTERMATH_VOID, and THEME_STAKES_RELATIONAL_AFTERMATH_VOID (same trigger paired with
  // curiosityDelta/suspenseDelta/emotionalShift/relationshipShifts respectively) — this is the
  // fifth consequence channel for this trigger.
  {
    const r1060b = checkAftermathVoid({
      records, minRecords: 8, minTriggerCount: 2, minAftermathCount: 2, window: 2,
      isTrigger: r => r.purpose === 'raise_stakes',
      isAftermath: r => (r.dialogueHighlights ?? []).length > 0,
    });
    if (r1060b.fires) {
      issues.push({
        location: `${r1060b.triggerCount} stakes-raising scene(s) — no highlighted dialogue within 2 scenes of any`,
        rule: 'THEME_STAKES_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID',
        severity: 'minor',
        description: `Every one of the story's ${r1060b.triggerCount} stakes-raising scenes is followed by two scenes with no highlighted dialogue, even though ${r1060b.aftermathCount} such scenes exist elsewhere in the script. Raised stakes that never earn a memorable line right after they land leave the theme's mounting cost registering only as plot mechanics, with no voice naming what's now at risk.`,
        suggestedFix: `After at least one stakes-raise, let one of the following two scenes carry a memorable line — a character naming what's now at risk, so the theme's stakes are voiced, not just structurally raised.`,
      });
    }
  }

  // THEME_STAGING_SUSPENSE_AFTERMATH_VOID — Sequence/aftermath × visualBeats trigger →
  // suspenseDelta absence. Built on checkAftermathVoid from the shared checks library. n≥8, ≥2
  // qualifying visually-staged scenes (pos<n-2, visualBeats.length>=2), ≥2 suspense-rising scenes
  // anywhere, 2-scene lookahead. Fires when every staged scene's two-scene aftermath carries no
  // rise in suspense, while such rises occur elsewhere. Distinct from THEME_STAGING_CURIOSITY_
  // AFTERMATH_VOID and THEME_STAGING_EMOTIONAL_AFTERMATH_VOID (same trigger paired with
  // curiosityDelta and emotionalShift respectively) — this is the third consequence channel for
  // this trigger.
  {
    const r1060c = checkAftermathVoid({
      records, minRecords: 8, minTriggerCount: 2, minAftermathCount: 2, window: 2,
      isTrigger: r => (r.visualBeats ?? []).length >= 2,
      isAftermath: r => (r.suspenseDelta ?? 0) > 0,
    });
    if (r1060c.fires) {
      issues.push({
        location: `${r1060c.triggerCount} staging aftermath(s) — no suspense rise within 2 scenes`,
        rule: 'THEME_STAGING_SUSPENSE_AFTERMATH_VOID',
        severity: 'minor',
        description: `Every heavily-staged scene in the story (${r1060c.triggerCount} of them) is followed by two scenes with no rise in suspense, even though ${r1060c.aftermathCount} such rises occur elsewhere. A visually dense moment that never tightens tension right after it lands leaves the theme's imagery inert rather than something the story keeps building pressure around.`,
        suggestedFix: `In the two scenes following at least one heavily-staged moment, let tension rise so the theme's imagery keeps pressuring the story rather than sitting as a static tableau.`,
      });
    }
  }

  const { revised, usedLLM } = await rewritePass({
    fountain, issues, passName: 'theme', approvedSpans,
    storyContext: input.storyContext, priorPassResults: input.priorPassResults,
  });
  const changed = revised !== fountain;

  return {
    pass: 'theme',
    issues,
    revisedFountain: revised,
    changed,
    summary: issues.length === 0
      ? `Theme resonance pass: all scenes echo the theme "${themeRaw}"`
      : `Theme resonance pass: ${issues.length} issue(s) — ${usedLLM ? 'rewritten' : 'flagged (stub mode)'}`,
  };
}
