// Wave 39 — Pass 4: Belief/Deception
// Checks belief tracking and deception layers: lies that aren't set up,
// belief reversals without evidence, deception without consequence.
// Wave 145 additions: deception consequence tracking (lies that are never
// discovered or create conflict), belief reversals with evidence checking,
// and belief isolation (crucial beliefs never expressed).
// Wave 159 additions: revelation isolated (discovery happens with no character
// reaction in dialogue), told-belief domination (>70% tell vs show), and
// belief asymmetry (one character dominates the deception layer 3:1 or more).
// Wave 253 additions: revelation Act 2a desert (no discovery in the first
// complication zone), belief echo chamber (same unverified claim repeated 3+
// scenes), adjacent deception payoff (lie and unmasking in neighbouring scenes).
// Wave 267 additions: belief front loaded (all told beliefs in first half only),
// revelation final act only (all discoveries confined to the final quarter),
// told belief clustering (3+ assertions in a single scene).
// Wave 281 additions: revelation drama vacuum (all revelations in emotionally flat scenes),
// Act 2b belief void (no beliefs or revelations in 50%–75% escalation zone),
// told belief final scene (final scene ends on an unresolved assertion).
// Wave 295 additions: revelation suspense decoupled (revelation scenes avg suspenseDelta ≤ 0),
// belief orphan (told belief in first half has no revelation in second half for same subject),
// revelation density drop (second half has fewer revelations than first half despite 3+ total).
// Wave 309 additions: told belief drought (≥5 consecutive scenes with no assertion or
// revelation — belief layer silent), assertion void (≥4 revelations but ≤1 told belief),
// revelation late first (first revelation past midpoint despite early assertions).
// Wave 323 additions: revelation curiosity decoupled (revelation scenes avg curiosityDelta
// ≤ 0 — discoveries never reopen the field), told belief curiosity flat (assertion scenes
// avg curiosityDelta ≤ 0), told belief relationship decoupled (no assertion scene moves a bond).
// Wave 334 additions: told belief suspense decoupled (assertion scenes avg suspenseDelta ≤ 0 —
// claims arrive without tension), told belief emotional flatline (all assertion scenes
// neutral — claims carry no emotional charge), revelation relationship decoupled (no revelation
// scene moves a bond — discoveries never alter the relational world).
// Wave 348 additions: revelation/assertion disconnect (no revelation lands within two scenes of
// a prior assertion — the dramatic-irony engine never fires), revelation midpoint void (the
// 40%–60% pivot carries no revelation while revelations exist elsewhere), told belief dramatic
// turn decoupled (no assertion scene coincides with a story pivot).
// Wave 362 additions: revelation clock decoupled (no revelation lands in a clock-raised scene
// even though both revelations and clock scenes exist — urgency and discovery never meet),
// told belief Act 3 absent (assertions exist in Acts 1-2 but none in Act 3 — the finale
// contains no positions or claims), revelation curiosity peak absent (the scene with the
// highest curiosityDelta has no revelation while 2+ other curious scenes carry revelations).
// Wave 376 additions: revelation suspense peak absent (the highest-suspense scene has no
// revelation while 2+ other suspense-positive scenes carry revelations — peak tension without
// disclosure), told belief clock decoupled (≥3 assertion scenes and ≥2 clock scenes but no
// assertion lands under time pressure), assertion midpoint void (the 40%–60% pivot carries no
// assertion while assertions exist on both sides — claims skip the structural center).
// Wave 390 additions: revelation dramatic turn decoupled (≥2 revelations and ≥3 turns but none
// share a scene — disclosure and pivot engines never meet), told belief suspense peak absent
// (the peak-suspense scene carries no assertion while 2+ suspense-positive assertion scenes
// exist — the told-belief sibling of the revelation suspense-peak check), told belief curiosity
// peak absent (the peak-curiosity scene carries no assertion while 2+ curiosity-positive ones do).
// Wave 404 additions: revelation payoff decoupled (≥2 revelation and ≥2 payoff scenes but none
// share a scene — discovery and resolution never converge), told belief seed decoupled (≥2
// assertion and ≥2 seed scenes but none share a scene — verbal deception and physical evidence
// never compound), assertion Act 1 only (≥3 total assertions all before the 25% mark —
// belief layer closes at the point where it should begin complicating).
// Wave 418 additions: revelation consecutive flood (3+ revelation scenes appear back-to-back
// without breathing room — discoveries pile up faster than the audience can process them;
// run-based mode × revelation channel), assertion Act 2a void (no assertion lands in the
// 25%–50% conflict-entry zone while assertions exist elsewhere — the belief battle sits silent
// precisely where it should open; zone presence/absence × assertion × Act 2a), assertion
// aftermath void (every assertion scene is followed by two scenes with no revelation, no
// relationship shift, and no suspense rise — claims land without cascading consequence;
// sequence/aftermath mode × assertion channel).
// Wave 432 additions: revelation emotional monotone (all emotionally charged revelation scenes
// share the same polarity — every discovery lands as either uniformly bad or uniformly good news,
// erasing tonal surprise from the disclosure layer; valence mode × revelation channel),
// revelation unprepared climax (the story's final revelation has no told belief or assertion in
// the three prior scenes — the climactic disclosure has no planted deception to resolve;
// backward-cause mode × final revelation), assertion singleton run (no two assertion scenes ever
// appear consecutively — the belief battle spreads so thin that claims never accumulate or build
// momentum; run-based mode × assertion channel, the complement of REVELATION_CONSECUTIVE_FLOOD).
// Wave 446 additions: revelation drought (≥6 consecutive scenes with no disclosure despite
// ≥2 revelations existing — epistemic momentum breaks down in extended silent stretches;
// run-based × revelation-absence mode, the revelation-channel parallel of TOLD_BELIEF_DROUGHT),
// assertion reactive void (every revelation is followed by 2 scenes with no character assertion
// — discoveries never prompt a character to publicly update their worldview; sequence/aftermath ×
// revelation→assertion direction, the reverse of REVELATION_ASSERTION_DISCONNECT), negative scene
// revelation void (no negative-emotional scene ever coincides with a revelation — hard moments
// are quarantined from disclosure; co-occurrence × negative-valence × revelation-absence mode,
// orthogonal to REVELATION_DRAMA_VACUUM which checks revelation scenes for neutrality).
// Wave 460 additions: assertion causal vacuum (every assertion scene is unpreceded by any
// revelation, dramatic turn, or high-suspense event in the 2 prior scenes — claims drop from
// narrative vacuum with no story pressure motivating them; backward-cause × full assertion
// population, first check examining assertions as the EFFECT rather than the CAUSE), revelation
// suspense deflation (the average suspenseDelta of the scene immediately following each qualifying
// revelation is < 0 — disclosures consistently trigger falling tension rather than escalation;
// average/aggregate × aftermath × revelation × suspense direction, the first aggregate check on
// the post-revelation zone), assertion payoff decoupled (no assertion scene shares a scene with
// any payoffSetupIds — verbal declarations never coincide with narrative resolutions; co-occurrence
// × assertion × payoff, the payoff-side complement of TOLD_BELIEF_SEED_DECOUPLED which checks
// the seed side).
// Wave 474 additions: assertion temporal cluster (distribution/timing — >75% of assertion scene
// positions fall within a single third of the script; the belief battle is structurally ghettoized
// into one temporal zone; first distribution/timing check on the temporal spread of assertion scenes
// across the full arc), revelation emotional aftermath flat (average/aggregate × revelation ×
// emotional aftermath — all scenes immediately following qualifying revelations are emotionally
// neutral; disclosures generate no emotional charge in what follows; distinct from REVELATION_DRAMA_
// VACUUM which checks the revelation scene itself and REVELATION_SUSPENSE_DEFLATION which checks
// suspenseDelta of the aftermath), assertion curiosity aftermath void (average/aggregate × assertion
// × curiosity aftermath — average curiosityDelta of scenes immediately following assertion scenes ≤ 0;
// assertions close the epistemic field rather than reopening it; the curiosity-channel complement of
// REVELATION_SUSPENSE_DEFLATION and the aftermath-direction complement of TOLD_BELIEF_CURIOSITY_FLAT).
// Wave 488 additions: revelation temporal cluster (distribution/timing × revelation × thirds —
// n≥9, ≥3 revelations, >75% in one structural third; the revelation-channel complement of
// ASSERTION_TEMPORAL_CLUSTER; disclosures are ghettoized into one temporal zone), revelation
// relationship peak absent (single-peak isolation × relationship magnitude × revelation — n≥8,
// ≥2 revelation scenes, ≥2 relationship-shift scenes, the scene with maximum relationship-shift
// magnitude has no revelation while another relationship-shift scene does; the relationship-
// magnitude single-peak check distinct from REVELATION_RELATIONSHIP_DECOUPLED which fires on
// all relationship-shift scenes), assertion negative decoupled (co-occurrence × negative emotion ×
// assertion absence — n≥8, ≥2 assertion scenes, ≥2 negative-emotion scenes, no assertion lands
// in a negative-emotion scene; the negative-valence complement of TOLD_BELIEF_EMOTIONAL_FLATLINE
// which fires when assertions are emotionally neutral; this fires when they are never in defeat).
// Wave 502 additions: revelation seed decoupled (co-occurrence × revelation × seed — n≥8, ≥2
// revelation scenes, ≥2 seed scenes, no scene carries both; disclosures and planted evidence
// never coincide, the seed-channel complement of REVELATION_PAYOFF_DECOUPLED and distinct from
// TOLD_BELIEF_SEED_DECOUPLED which checks assertion × seed), revelation curiosity aftermath void
// (average/aggregate × revelation → curiosity aftermath — n≥8, ≥3 qualifying revelation scenes
// [pos < n-1], avg curiosityDelta of immediately following scenes ≤ 0; revelations close the
// epistemic field in the next beat, distinct from REVELATION_CURIOSITY_DECOUPLED which checks
// curiosityDelta OF the revelation scene itself, and from ASSERTION_CURIOSITY_AFTERMATH_VOID
// which uses assertion as trigger), assertion consecutive flood (run-based × assertion channel —
// n≥8, ≥4 assertion scenes, longest consecutive run ≥ 3; claims pile up without processing
// room, the run-based complement of ASSERTION_SINGLETON_RUN and the assertion-channel mirror
// of REVELATION_CONSECUTIVE_FLOOD).
// Wave 544 additions: revelation closing quarter absent (zone presence/absence × revelation ×
// closing 25% — n≥8, ≥3 revelations globally, 0 in the final 25% while ≥2 in the first 75%;
// the story stops disclosing before its climax; distinct from TOLD_BELIEF_ACT_3_ABSENT [assertion
// channel] and REVELATION_FINAL_ACT_ONLY [opposite: all revelations IN final quarter]), assertion
// drought (run-based × assertion-absence × assertion-specific channel — n≥8, ≥3 assertion scenes,
// max consecutive gap ≥7; fires on the assertion channel alone, so revelation presence can mask
// the drought from TOLD_BELIEF_DROUGHT; distinct from ASSERTION_SINGLETON_RUN [no two consecutive
// assertions — over-dispersion, not sustained silence]), turn revelation aftermath void (sequence/
// aftermath × dramatic turn → revelation aftermath — n≥8, ≥2 qualifying turn scenes [pos<n-2],
// ≥2 revelation scenes globally, no turn followed by revelation in next 2 scenes; distinct from
// ASSERTION_TURN_AFTERMATH_VOID [assertion as trigger], REVELATION_DRAMATIC_TURN_DECOUPLED [same-
// scene co-occurrence], REVELATION_ASSERTION_DISCONNECT [assertion → revelation, not turn → revelation]).
// Wave 530 additions: assertion positive decoupled (co-occurrence × positive emotion × assertion —
// n≥8, ≥2 assertion scenes, ≥2 positive-emotion scenes, no assertion scene has emotionalShift=
// 'positive'; the positive-valence complement of ASSERTION_NEGATIVE_DECOUPLED, completing the
// valence × assertion co-occurrence pair), positive scene revelation void (co-occurrence × positive
// emotion × revelation absence — n≥8, ≥2 revelation scenes, ≥2 positive-emotion scenes, no positive-
// emotion scene carries a revelation; the positive-valence sibling of NEGATIVE_SCENE_REVELATION_VOID
// completing the valence × revelation co-occurrence pair), assertion turn aftermath void (sequence/
// aftermath × dramatic turn × assertion trigger — n≥8, ≥2 qualifying assertion scenes [pos < n-2],
// ≥2 turn scenes, no assertion followed by a dramatic turn in next 2 scenes; distinct from TOLD_
// BELIEF_DRAMATIC_TURN_DECOUPLED which checks co-occurrence in the same scene).
// Wave 516 additions: revelation relationship aftermath void (sequence/aftermath × revelation →
// relationship-shift aftermath — n≥8, ≥2 qualifying revelation scenes not at last position, ≥2
// relationship-shift scenes exist globally, none of the scenes immediately following a revelation
// carry a non-empty relationshipShifts; the relationship-channel aftermath complement of
// REVELATION_RELATIONSHIP_DECOUPLED which checks co-occurrence in the same scene), revelation
// clock aftermath void (sequence/aftermath × revelation → clock aftermath — n≥8, ≥2 qualifying
// revelation scenes not at last position, ≥2 clockRaised scenes globally, none of the following
// scenes have clockRaised=true; the clock-channel aftermath complement of REVELATION_CLOCK_DECOUPLED
// which checks co-occurrence in the same scene), revelation seed aftermath void (sequence/aftermath
// × revelation → seed aftermath — n≥8, ≥2 qualifying revelation scenes not at last position, ≥2
// seeded scenes globally, none of the following scenes have seededClueIds non-empty; the aftermath
// sibling of REVELATION_SEED_DECOUPLED which checks co-occurrence in the same scene and distinct
// from REVELATION_CURIOSITY_AFTERMATH_VOID which uses the curiosity channel as aftermath signal).
// Wave 586 additions: revelation dramatic-turn aftermath void (sequence/aftermath × revelation →
// dramatic-turn aftermath — n≥8, ≥2 qualifying revelation scenes [pos<n-2], ≥2 dramatic-turn
// scenes globally, no revelation followed by a dramatic turn in the next 2 scenes; distinct from
// REVELATION_DRAMATIC_TURN_DECOUPLED [Wave 390: co-occurrence × same scene], ASSERTION_TURN_
// AFTERMATH_VOID [Wave 530: assertion trigger], and TURN_REVELATION_AFTERMATH_VOID [Wave 544:
// turn as trigger → revelation in aftermath, which inverts trigger and output]), assertion
// relationship aftermath void (sequence/aftermath × assertion → relationship-shift aftermath —
// n≥8, ≥2 qualifying assertion scenes [pos<n-1], ≥2 relationship-shift scenes globally, no
// assertion followed by a relationship shift in the next scene; distinct from REVELATION_
// RELATIONSHIP_AFTERMATH_VOID [Wave 516: revelation trigger], ASSERTION_AFTERMATH_VOID [Wave
// 418: conjunction over revelation/relationship/suspense — fires only when all 3 aftermath
// channels are cold, whereas this isolates the relationship channel alone], and REVELATION_
// RELATIONSHIP_DECOUPLED [co-occurrence, same scene]), revelation payoff aftermath void
// (sequence/aftermath × revelation → payoff aftermath — n≥8, ≥2 qualifying revelation scenes
// [pos<n-1], ≥2 payoff scenes globally, no revelation followed by a payoff in the next scene;
// distinct from REVELATION_PAYOFF_DECOUPLED [co-occurrence × same scene], ASSERTION_PAYOFF_
// AFTERMATH_VOID [Wave 572: assertion trigger], and ASSERTION_PAYOFF_DECOUPLED [co-occurrence
// × assertion scene itself — different trigger AND mode]).
// Wave 572 additions: assertion clock aftermath void (sequence/aftermath × assertion → clock — n≥8,
// ≥2 qualifying assertion scenes, ≥2 clock scenes globally, no assertion followed by a raised clock;
// claims never set a deadline ticking on their consequences), assertion seed aftermath void (sequence/
// aftermath × assertion → seed — ≥2 assertion scenes, ≥2 seed scenes, no assertion followed by a
// seeded clue; claims never trail planted evidence), assertion payoff aftermath void (sequence/
// aftermath × assertion → payoff — ≥2 assertion scenes, ≥2 payoff scenes, no assertion followed by a
// payoff; claims never coincide with thread resolution). These fill the clock, seed, and payoff
// channels of the assertion-aftermath family alongside curiosity (Wave 474), emotion (Wave 558), and
// dramatic-turn (Wave 530); each isolates a single channel (firing even when other aftermath channels
// are active) and so is distinct from the conjunction-based ASSERTION_AFTERMATH_VOID (Wave 418, over
// revelation/relationship/suspense) and from its same-scene co-occurrence sibling (TOLD_BELIEF_CLOCK/
// SEED_DECOUPLED, ASSERTION_PAYOFF_DECOUPLED).
// Wave 558 additions: assertion emotional aftermath flat (average/aggregate × assertion → emotional
// aftermath — n≥8, ≥3 qualifying assertion scenes [pos<n-1], all scenes immediately following an
// assertion have emotionalShift neutral/null; claims arrive without charging what follows
// emotionally; distinct from TOLD_BELIEF_EMOTIONAL_FLATLINE [assertion scene itself neutral, not
// aftermath] and REVELATION_EMOTIONAL_AFTERMATH_FLAT [revelation trigger]), revelation curiosity
// peak early (single-peak isolation × revelation × curiosityDelta — n≥8, ≥3 revelation scenes
// with curiosityDelta>0, the one with the highest curiosityDelta is in the first 25% while ≥2
// curiosity-generating revelations exist later; the script front-loads its most curiosity-rich
// disclosure; distinct from REVELATION_CURIOSITY_PEAK_ABSENT [non-revelation has peak curiosity]
// and REVELATION_CURIOSITY_DECOUPLED [avg of all revelation curiosityDelta ≤0 — all low, not one
// peak early]), seed temporal cluster (distribution/timing × seed × thirds — n≥9, ≥3 seeded
// scenes, >75% in one structural third; evidence planting is ghettoized into one zone; first
// distribution/timing check on the seed channel, distinct from ASSERTION_TEMPORAL_CLUSTER [assertion
// channel] and REVELATION_TEMPORAL_CLUSTER [revelation channel]).
// Wave 600 additions: clue debt belief decoupled (co-occurrence/decoupling × unresolvedClues-present
// × dialogueHighlights-present — n≥6, ≥2 debt-carrying scenes, ≥2 belief-assertion scenes, zero
// overlap; a lingering open mystery and a character voicing a belief never share a scene; first use
// of unresolvedClues in this 102-rule file — UNRESOLVED_BELIEF_EXCESS is the closest-sounding
// existing rule but operates on toldBeliefs/witnessedBeliefs [derived from dialogueHighlights text
// parsing against UPDATE_BELIEF ops], a completely different data source from the unresolvedClues
// array [populated by SEED_CLUE/PAYOFF_SETUP ops]), clue debt clock aftermath void (sequence/
// aftermath × unresolvedClues-present trigger → clockRaised aftermath, built on checkAftermathVoid
// from the shared checks library — audit M2.2 — n≥8, ≥3 qualifying debt-carrying scenes, none
// followed by a clock raise within 2 scenes while ≥2 clock scenes exist elsewhere; an open mystery
// never gets a ticking deadline attached to it downstream), clue debt zone imbalance (underweight/
// bloat × unresolvedClues × four structural zones, built on checkZoneImbalance — one zone with no
// debt-carrying scenes while another holds ≥50%; named CLUE_DEBT_* rather than reusing this
// session's THEME_UNRESOLVED_CLUE_* or bare UNRESOLVED_CLUE_* rule strings from other passes, to
// keep rule names distinct across the whole system even though each pass's issues are independently
// scoped).
// Wave 614 additions (built on the shared checks library, audit M2.2): BELIEF_STAGING_ZONE_
// IMBALANCE (underweight/bloat × visualBeats × four structural zones — first use of visualBeats
// anywhere in this 105-rule pass), CLOCK_SIGNAL_FLATLINE (average/aggregate × clockDelta variety
// — first use of clockDelta anywhere in this pass), VISUAL_BEAT_BELIEF_DECOUPLED
// (co-occurrence/decoupling × visualBeats × dialogueHighlights-present belief-assertion — pairs
// this wave's other new field with the file's existing belief-assertion proxy).
// Wave 628 additions (built on the shared checks library, audit M2.2): BELIEF_PAYOFF_SEED_
// DECOUPLED (co-occurrence/decoupling × payoffSetupIds × seededClueIds — both fields had
// previously only ever been paired with revelation in this 108-rule pass, never with each other),
// CLOCK_DELTA_PEAK_UNCAUSED (backward-cause × clockDelta-magnitude peak × dramaticTurn/revelation
// cause — first backward-cause check in this pass), BELIEF_CHARACTER_MOMENT_ZONE_IMBALANCE
// (underweight/bloat × purpose === 'character_moment' × four structural zones — first genuine use
// of the purpose field, whose only prior appearance was the word "purpose" inside prose).
// Wave 642 additions: BELIEF_OPEN_THREAD_DROUGHT_RUN (run-based × unresolvedClues absence — first
// use of the run-based mode in this 111-rule pass), BELIEF_STAGING_ZONE_CLUSTER
// (distribution/timing × visualBeats × structural thirds — first zone-cluster mode applied to
// records here), BELIEF_SEED_CURIOSITY_DECOUPLED (co-occurrence/decoupling × seededClueIds ×
// curiosityDelta — first pairing of these two fields).
// Wave 656 additions: BELIEF_PAYOFF_PEAK_UNCAUSED (single-peak isolation/backward-cause ×
// payoffSetupIds magnitude — the scene with the most simultaneous thread resolutions has no
// dramatic turn or revelation in itself or the two scenes before it; every prior peak check in
// this 114-rule pass anchors on revelation/curiosity/suspense/relationship/clockDelta, never on
// the payoff channel), BELIEF_CLOCK_DROUGHT_RUN (run-based × clockRaised absence — Wave 642
// applied the drought-run mode to unresolvedClues; clockRaised itself has never been
// drought-audited here), BELIEF_SEED_ZONE_CLUSTER (distribution/timing × seededClueIds ×
// structural thirds — Wave 642 applied the zone-cluster mode to visualBeats; seededClueIds itself
// has never been cluster-audited here despite already anchoring BELIEF_SEED_CURIOSITY_DECOUPLED).
// Wave 670 additions: BELIEF_HIGHLIGHT_PEAK_UNCAUSED (single-peak isolation/backward-cause ×
// dialogueHighlights magnitude — dialogueHighlights is this pass's most heavily used field [21
// accesses], but has only ever anchored hand-rolled aggregate/co-occurrence logic, never the
// shared-library backward-cause peak mode; the scene with the most highlighted lines has no
// dramatic turn or revelation in itself or the two scenes before it), BELIEF_RELATIONSHIP_
// DROUGHT_RUN (run-based × relationshipShifts absence — relationshipShifts anchors several
// hand-rolled checks but has never been drought-audited via the shared helper),
// BELIEF_TURN_ZONE_CLUSTER (distribution/timing × dramaticTurn presence × structural thirds —
// dramaticTurn has only ever served as a hasCause/trigger condition in this pass, never as the
// subject of a zone-cluster check). Completes the sixth full rotation cycle (657-670).
// Wave 684 additions: BELIEF_CHARACTER_MOMENT_ZONE_CLUSTER (distribution/timing × purpose ===
// 'character_moment' × structural thirds — distinct from Wave 628's BELIEF_CHARACTER_MOMENT_
// ZONE_IMBALANCE, which checks four-zone bloat/empty rather than a thirds-based majority cluster),
// BELIEF_CURIOSITY_DROUGHT_RUN (run-based × curiosityDelta>0 absence — curiosityDelta has only
// ever anchored average-based hand-rolled logic and a single co-occurrence/decoupling check
// [Wave 642's BELIEF_SEED_CURIOSITY_DECOUPLED]; the run-based mode applied to this channel for
// the first time), BELIEF_SUSPENSE_PEAK_UNCAUSED (single-peak isolation/backward-cause ×
// suspenseDelta magnitude — suspenseDelta has only ever anchored average-based hand-rolled logic
// [e.g. avgRevSusp, tenseRevScenes]; the scene where suspense spikes hardest has never been
// checked for backward causation via the shared library).
// Wave 698 additions: BELIEF_PAYOFF_DROUGHT_RUN (run-based × payoffSetupIds absence — Wave 656
// applied the backward-cause peak mode to payoffSetupIds; the drought-run mode has never been
// applied to this channel), BELIEF_SEED_PEAK_UNCAUSED (single-peak isolation/backward-cause ×
// seededClueIds magnitude — Wave 656 applied the zone-cluster mode to seededClueIds; the
// backward-cause peak mode has never been applied to this channel), BELIEF_HIGHLIGHT_ZONE_CLUSTER
// (distribution/timing × dialogueHighlights × structural thirds — Wave 670 applied the
// backward-cause peak mode to dialogueHighlights, this pass's most heavily used field [22
// accesses]; the zone-cluster mode has never been applied to it).
// Wave 712 additions (closes the ninth rotation cycle, 700-712): BELIEF_PAYOFF_ZONE_CLUSTER
// (distribution/timing × payoffSetupIds × structural thirds — Waves 656/698 applied the
// backward-cause peak and drought-run modes to payoffSetupIds; the zone-cluster mode has never
// been applied to it, completing the trio), BELIEF_SEED_DROUGHT_RUN (run-based × seededClueIds
// absence — Waves 656/698 applied the zone-cluster and backward-cause peak modes to
// seededClueIds; the drought-run mode has never been applied to it, completing the trio),
// BELIEF_HIGHLIGHT_DROUGHT_RUN (run-based × dialogueHighlights absence — Waves 670/698 applied
// the backward-cause peak and zone-cluster modes to this pass's most heavily used field; the
// drought-run mode has never been applied to it, completing the trio).
// Wave 726 additions: BELIEF_CLOCK_DELTA_ZONE_CLUSTER (distribution/timing × clockDelta>0 presence
// × structural thirds — Wave 628 applied the backward-cause peak mode to clockDelta; the
// zone-cluster mode has never been applied to it), BELIEF_STAGING_PEAK_UNCAUSED (single-peak
// isolation/backward-cause × visualBeats magnitude — Wave 642 applied the zone-cluster mode to
// visualBeats; the backward-cause peak mode has never been applied to it),
// BELIEF_OPEN_THREAD_ZONE_CLUSTER (distribution/timing × unresolvedClues × structural thirds —
// Wave 642 applied the run-based drought mode to unresolvedClues; the zone-cluster mode has never
// been applied to it).
// Wave 740 additions: BELIEF_CLOCK_DELTA_DROUGHT_RUN (run-based × clockDelta≠0 absence — Waves
// 628/726 applied the backward-cause peak and zone-cluster modes to clockDelta; the drought-run
// mode has never been applied to it, completing the trio), BELIEF_OPEN_THREAD_PEAK_UNCAUSED
// (single-peak isolation/backward-cause × unresolvedClues magnitude — Waves 642/726 applied the
// run-based drought and zone-cluster modes to unresolvedClues; the backward-cause peak mode has
// never been applied to it, completing the trio), BELIEF_STAGING_DROUGHT_RUN (run-based ×
// visualBeats absence — Waves 642/726 applied the zone-cluster and backward-cause peak modes to
// visualBeats; the drought-run mode has never been applied to it, completing the trio).
// Wave 754 additions: BELIEF_RELATIONSHIP_PEAK_UNCAUSED (single-peak isolation/backward-cause ×
// relationshipShifts magnitude — Wave 670 applied the run-based drought mode to
// relationshipShifts; the backward-cause peak mode has never been applied to it),
// BELIEF_TURN_DROUGHT_RUN (run-based × dramaticTurn !== 'nothing' absence — Wave 670 applied the
// zone-cluster mode to this signal; the drought-run mode has never been applied to it),
// BELIEF_SUSPENSE_ZONE_CLUSTER (distribution/timing × suspenseDelta>0 presence × structural
// thirds — Wave 684 applied the backward-cause peak mode to suspenseDelta; the zone-cluster mode
// has never been applied to it).
// Wave 768 additions: BELIEF_RELATIONSHIP_ZONE_CLUSTER (distribution/timing × relationshipShifts
// presence × structural thirds — Waves 670/754 applied the run-based drought and backward-cause
// peak modes to relationshipShifts; the zone-cluster mode has never been applied to it, completing
// the trio), BELIEF_CHARACTER_MOMENT_DROUGHT_RUN (run-based × purpose === 'character_moment'
// absence — Wave 684 applied the zone-cluster mode to this signal; the drought-run mode has never
// been applied to it), BELIEF_SUSPENSE_DROUGHT_RUN (run-based × suspenseDelta>0 absence — Waves
// 684/754 applied the backward-cause peak and zone-cluster modes to suspenseDelta; the drought-run
// mode has never been applied to it, completing the trio).
// Wave 782 additions: BELIEF_CURIOSITY_ZONE_CLUSTER (distribution/timing × curiosityDelta>0
// presence × structural thirds — Wave 642 applied the run-based drought mode to curiosityDelta;
// the zone-cluster mode has never been applied to it), BELIEF_CURIOSITY_PEAK_UNCAUSED
// (backward-cause × curiosityDelta-as-magnitude × 2-scene lookback — the existing
// REVELATION_CURIOSITY_PEAK_ABSENT/TOLD_BELIEF_CURIOSITY_PEAK_ABSENT audit co-occurrence AT the
// peak curiosity scene, and REVELATION_CURIOSITY_PEAK_EARLY audits a fixed early-quarter zone;
// none looks backward from the peak for a preparing cause, so the shared-library backward-cause
// mode has never been applied to curiosityDelta, completing the trio), BELIEF_CLOCK_RAISED_ZONE_
// CLUSTER (distribution/timing × clockRaised === true presence × structural thirds — Wave 642
// applied the run-based drought mode to clockRaised; the zone-cluster mode has never been applied
// to it).
// Wave 796 additions: BELIEF_REVELATION_PEAK_UNCAUSED (backward-cause × revelation-as-magnitude
// [0/1] × 2-scene lookback, anchored on the FIRST revelation scene, hasCause referencing only
// dramaticTurn — distinct from REVELATION_UNPREPARED_CLIMAX (Wave 432), which anchors on the
// LAST revelation and looks for a prior character ASSERTION rather than a dramatic turn; distinct
// from REVELATION_DROUGHT (Wave 446, a true hand-rolled equivalent of checkDroughtRun already
// covering the run-based mode) and REVELATION_TEMPORAL_CLUSTER (Wave 488, a true hand-rolled
// equivalent of checkZoneCluster already covering the distribution/timing mode) — this is the
// only one of the three shared-library trio modes that has never been hand-rolled for revelation
// in this pass), BELIEF_NEGATIVE_EMOTION_ZONE_CLUSTER (distribution/timing ×
// emotionalShift='negative' × structural thirds — every existing negative-emotion check in this
// pass couples it to a revelation or assertion scene [REVELATION_EMOTIONAL_MONOTONE,
// REVELATION_EMOTIONAL_AFTERMATH_FLAT, ASSERTION_EMOTIONAL_AFTERMATH_FLAT]; the shared-library
// cluster mode on emotionalShift as a standalone global signal has never been applied),
// BELIEF_NEGATIVE_EMOTION_DROUGHT_RUN (run-based × emotionalShift='negative' absence — completing
// 2 of 3 trio slots for emotionalShift alongside the zone-cluster mode added in this same wave;
// the peak mode is conventionally skipped for this categorical field).
// Wave 810 additions: BELIEF_STAKES_ZONE_CLUSTER (distribution/timing × purpose ===
// 'raise_stakes' × structural thirds — this purpose value has never been referenced anywhere in
// this pass; none of the three shared-library trio modes has ever been applied to it),
// BELIEF_STAKES_DROUGHT_RUN (run-based × purpose === 'raise_stakes' absence — completing 2 of 3
// slots for this purpose value alongside the zone-cluster mode added in this same wave; peak
// mode conventionally skipped for this categorical field), BELIEF_TURNING_POINT_ZONE_CLUSTER
// (distribution/timing × purpose === 'turning_point' × structural thirds — this purpose value
// has never been referenced anywhere in this pass either; none of the three shared-library trio
// modes has ever been applied to it).
//
// Wave 824 additions: BELIEF_TURNING_POINT_DROUGHT_RUN (run-based × purpose === 'turning_point'
// absence — completes 2 of 3 slots for this purpose value alongside the zone-cluster mode added
// in Wave 810; peak mode conventionally skipped for this categorical field), BELIEF_INTRODUCE_
// CONFLICT_ZONE_CLUSTER (distribution/timing × purpose === 'introduce_conflict' × structural
// thirds — this purpose value has never been referenced anywhere in this pass; a virgin field),
// BELIEF_POSITIVE_EMOTION_ZONE_CLUSTER (distribution/timing × emotionalShift === 'positive' ×
// structural thirds — the positive valence has only ever appeared inside co-occurrence checks
// like ASSERTION_POSITIVE_DECOUPLED; none of the three shared-library trio modes has ever
// isolated this valence on its own, mirroring the negative-valence trio completed in Wave 796).
//
// Wave 838 additions: BELIEF_INTRODUCE_CONFLICT_DROUGHT_RUN (run-based × purpose ===
// 'introduce_conflict' absence — completes 2 of 3 slots for this purpose value alongside the
// zone-cluster mode added in Wave 824; peak mode conventionally skipped for this categorical
// field), BELIEF_POSITIVE_EMOTION_DROUGHT_RUN (run-based × emotionalShift === 'positive' absence
// — completes 2 of 3 slots for this valence alongside the zone-cluster mode added in Wave 824;
// peak mode conventionally skipped for this categorical field), BELIEF_ESTABLISH_WORLD_ZONE_
// CLUSTER (distribution/timing × purpose === 'establish_world' × structural thirds — this
// purpose value has never been referenced anywhere in this pass; a virgin field).
//
// Wave 852 additions: BELIEF_CLIMAX_ZONE_CLUSTER (distribution/timing × purpose === 'climax' ×
// structural thirds — this purpose value has never been referenced anywhere in this pass; a
// virgin field), BELIEF_RESOLUTION_ZONE_CLUSTER (distribution/timing × purpose === 'resolution' ×
// structural thirds — likewise a virgin field, never referenced in this pass before),
// BELIEF_COMPLICATE_ZONE_CLUSTER (distribution/timing × purpose === 'complicate' × structural
// thirds — also a virgin field, never referenced in this pass before).
//
// Wave 866 additions: BELIEF_ESTABLISH_WORLD_DROUGHT_RUN (run-based x purpose ===
// 'establish_world' absence -- completes 2 of 3 slots for this purpose value alongside the
// zone-cluster mode added in Wave 838; peak mode conventionally skipped for this categorical
// field), BELIEF_CLIMAX_DROUGHT_RUN (run-based x purpose === 'climax' absence -- completes 2 of
// 3 slots for this purpose value alongside the zone-cluster mode added in Wave 852; peak mode
// conventionally skipped for this categorical field), BELIEF_RESOLUTION_DROUGHT_RUN (run-based
// x purpose === 'resolution' absence -- completes 2 of 3 slots for this purpose value alongside
// the zone-cluster mode added in Wave 852; distinct from the pre-existing BELIEF_RESOLUTION_
// ABSENT, which audits witnessed-revelation timing rather than the purpose field; peak mode
// conventionally skipped for this categorical field).
//
// Wave 880 additions: with climax, establish_world, and resolution now all trio-complete via
// checkDroughtRun/checkZoneCluster, this wave applies the distinct 4-zone checkZoneImbalance
// mode (act-based buckets, fires on an empty zone plus a >=50%-share bloat zone -- categorically
// different from checkZoneCluster's 3-zone >75%-concentration test) to those same three purpose
// values, which have never been audited by it: BELIEF_CLIMAX_ZONE_IMBALANCE (purpose ===
// 'climax'), BELIEF_ESTABLISH_WORLD_ZONE_IMBALANCE (purpose === 'establish_world'), and
// BELIEF_RESOLUTION_ZONE_IMBALANCE (purpose === 'resolution' -- distinct from the pre-existing
// BELIEF_RESOLUTION_ABSENT, which audits witnessed-revelation timing rather than this purpose
// enum value). Only unresolvedClues, visualBeats, and character_moment had ever been audited by
// this analytical mode before this wave.
//
// Wave 894 additions: BELIEF_COMPLICATE_DROUGHT_RUN (run-based x purpose === 'complicate'
// absence -- completes 2 of 3 slots for this purpose value alongside the zone-cluster mode
// added in Wave 852; peak mode conventionally skipped for this categorical field). Continuing
// the checkZoneImbalance rollout from Wave 880, this wave applies the 4-zone bloat+empty-zone
// mode to two more purpose values with complete 3-zone/run-based trios: BELIEF_TURNING_POINT_
// ZONE_IMBALANCE (purpose === 'turning_point') and BELIEF_INTRODUCE_CONFLICT_ZONE_IMBALANCE
// (purpose === 'introduce_conflict').
//
// Wave 908 additions: purpose === 'revelation' has never been isolated as its own standalone
// signal in this pass (only the separate revelation-as-magnitude field is audited, by BELIEF_
// REVELATION_PEAK_UNCAUSED) -- a genuinely virgin purpose value. This wave adds BELIEF_REVELATION_
// PURPOSE_ZONE_CLUSTER and BELIEF_REVELATION_PURPOSE_DROUGHT_RUN (peak mode conventionally skipped
// for this categorical field), plus BELIEF_COMPLICATE_ZONE_IMBALANCE, continuing the
// checkZoneImbalance rollout: purpose === 'complicate' already has a complete 3-zone/run-based
// trio but has never been audited by the 4-zone bloat+empty-zone mode.
//
// Wave 922 additions: continuing the checkZoneImbalance rollout, this wave applies the 4-zone
// bloat+empty-zone mode to three more signals that each already have a complete 3-zone/run-based
// trio but had never been audited by it: BELIEF_STAKES_ZONE_IMBALANCE (purpose === 'raise_stakes'),
// BELIEF_REVELATION_PURPOSE_ZONE_IMBALANCE (purpose === 'revelation', whose trio was completed in
// Wave 908), and BELIEF_NEGATIVE_EMOTION_ZONE_IMBALANCE (emotionalShift === 'negative', a valence
// signal with a complete 3-zone/run trio).
//
// Wave 936 additions: continuing the checkZoneImbalance rollout, this wave extends the 4-zone mode
// to three more signals that each already have a complete 3-zone/run-based trio but had never been
// audited by it: BELIEF_POSITIVE_EMOTION_ZONE_IMBALANCE (emotionalShift === 'positive'), BELIEF_
// SUSPENSE_ZONE_IMBALANCE (suspenseDelta > 0), and BELIEF_CURIOSITY_ZONE_IMBALANCE (curiosityDelta
// > 0).
// Wave 950 additions: with belief's valence and delta signals now saturated by the 4-zone mode, this
// wave audits three distinct array-field signals whose 3-zone/run trios were long complete but never
// 4-zone-audited: BELIEF_PAYOFF_ZONE_IMBALANCE (payoffSetupIds), BELIEF_OPEN_THREAD_ZONE_IMBALANCE
// (unresolvedClues), and BELIEF_SEED_ZONE_IMBALANCE (seededClueIds) — three genuinely different arrays
// (setups-paid, questions-open, clues-planted), all distinct from the visualBeats BELIEF_STAGING one.
// Wave 964 additions: auditing the three remaining trio-complete signals in this pass, spanning two
// more distinct array fields and one categorical: BELIEF_HIGHLIGHT_ZONE_IMBALANCE (dialogueHighlights
// array), BELIEF_RELATIONSHIP_ZONE_IMBALANCE (relationshipShifts array), and BELIEF_TURN_ZONE_IMBALANCE
// (dramaticTurn !== 'nothing' categorical) — the highlight and relationship arrays are distinct from
// all previously audited belief arrays (payoff/open-thread/seed/staging).
// Wave 978 additions: with the zone-imbalance mode now exhausted for this pass, pivots to the
// sequence/aftermath mode via checkAftermathVoid, adding three trigger→aftermath pairings that use
// trigger signals (raise_stakes purpose, payoffSetupIds, seededClueIds) absent from the pass's ~14
// existing aftermath-void rules (built around assertion/revelation/turn/clue-debt triggers):
// BELIEF_STAKES_RELATIONSHIP_AFTERMATH_VOID (raise_stakes → relational), BELIEF_PAYOFF_CURIOSITY_
// AFTERMATH_VOID (payoff → curiosity), and BELIEF_SEED_EMOTIONAL_AFTERMATH_VOID (seed → emotional).
// Wave 992 additions: BELIEF_CLOCK_DELTA was checked as a zone-imbalance candidate and excluded —
// its cluster rule audits clockDelta > 0 while its drought rule audits clockDelta !== 0, an
// inconsistent pair auditing not-quite-the-same signal (same class of issue as the STAGING
// >=2-vs->0 mismatch elsewhere in this rotation). With zone-imbalance still exhausted, this wave
// adds three more aftermath-void pairings, none reusing a channel from the ~14 existing rules or
// from Wave 978: BELIEF_STAKES_SUSPENSE_AFTERMATH_VOID (raise_stakes → suspenseDelta, first use of
// suspenseDelta as a checkAftermathVoid channel in this pass), BELIEF_PAYOFF_RELATIONSHIP_
// AFTERMATH_VOID (payoffSetupIds → relationshipShifts, first pairing of payoff with relational
// consequence), and BELIEF_OPEN_THREAD_CURIOSITY_AFTERMATH_VOID (heavy unresolvedClues debt,
// threshold ≥3 distinct from CLUE_DEBT_CLOCK's >0 threshold, → curiosityDelta).
// Wave 1006 additions: this pass's aftermath-void family is now large enough that every existing
// trigger has at least one channel — this wave gives three of them a genuinely fresh third/second
// channel: BELIEF_STAKES_EMOTIONAL_AFTERMATH_VOID (raise_stakes, previously paired with
// relationshipShifts and suspenseDelta, now paired with emotionalShift), BELIEF_SEED_SUSPENSE_
// AFTERMATH_VOID (seededClueIds, previously only paired with emotionalShift, now paired with
// suspenseDelta), and BELIEF_PAYOFF_EMOTIONAL_AFTERMATH_VOID (payoffSetupIds, previously paired
// with curiosityDelta and relationshipShifts, now paired with emotionalShift).
// Wave 1020 additions: three more fresh channels for existing triggers: BELIEF_STAKES_CURIOSITY_
// AFTERMATH_VOID (raise_stakes, previously paired with relationshipShifts/suspenseDelta/
// emotionalShift, now a fourth channel with curiosityDelta), BELIEF_PAYOFF_SUSPENSE_AFTERMATH_VOID
// (payoffSetupIds, previously paired with curiosityDelta/relationshipShifts/emotionalShift, now a
// fourth channel with suspenseDelta), and BELIEF_SEED_RELATIONAL_AFTERMATH_VOID (seededClueIds,
// previously paired with emotionalShift/suspenseDelta, now a third channel with relationshipShifts).
// Wave 1034 additions: with raise_stakes and payoffSetupIds now at four channels each, this wave
// targets the two less-saturated triggers instead: BELIEF_SEED_CURIOSITY_AFTERMATH_VOID
// (seededClueIds, previously paired with emotionalShift/suspenseDelta/relationshipShifts, now a
// fourth channel with curiosityDelta), and two fresh channels for the heavy-unresolvedClues-debt
// trigger (threshold ≥3, previously only paired with curiosityDelta): BELIEF_OPEN_THREAD_
// EMOTIONAL_AFTERMATH_VOID (paired with emotionalShift) and BELIEF_OPEN_THREAD_RELATIONAL_
// AFTERMATH_VOID (paired with relationshipShifts).
// Wave 1048 additions: with raise_stakes, payoffSetupIds, and seededClueIds all now at four
// channels each, this wave gives the heavy-unresolvedClues-debt trigger its fourth channel
// (BELIEF_OPEN_THREAD_SUSPENSE_AFTERMATH_VOID, paired with suspenseDelta) and extends two of the
// saturated triggers to a fifth channel using dialogueHighlights and visualBeats — fields that
// (per grep) have never been used as checkAftermathVoid consequence channels anywhere in this
// pass: BELIEF_STAKES_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID (raise_stakes) and BELIEF_PAYOFF_STAGING_
// AFTERMATH_VOID (payoffSetupIds).
// Wave 1062 additions: raise_stakes and payoffSetupIds each reach full six-channel saturation:
// BELIEF_STAKES_STAGING_AFTERMATH_VOID (raise_stakes, previously paired with relationshipShifts/
// suspenseDelta/emotionalShift/curiosityDelta/dialogueHighlights, now also paired with
// visualBeats — its only remaining standard channel) and BELIEF_PAYOFF_DIALOGUE_HIGHLIGHT_
// AFTERMATH_VOID (payoffSetupIds, previously paired with curiosityDelta/relationshipShifts/
// emotionalShift/suspenseDelta/visualBeats, now also paired with dialogueHighlights — its only
// remaining standard channel). BELIEF_SEED_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID gives seededClueIds
// a fifth channel (previously paired with emotionalShift/suspenseDelta/relationshipShifts/
// curiosityDelta, now also paired with dialogueHighlights).

import type { PassInput, PassResult, RevisionIssue } from './types.ts';
import { rewritePass } from '../rewrite.ts';
import { checkCoOccurrenceDecoupled, checkAftermathVoid, checkZoneImbalance, checkPeakUncaused, checkDroughtRun, checkZoneCluster, FOUR_ZONE_NAMES } from './lib/checks.ts';

export async function beliefPass(input: PassInput): Promise<PassResult> {
  const { fountain, records, annotations, approvedSpans } = input;
  const issues: RevisionIssue[] = [];

  // ── Track belief propositions and their sources ────────────────────────────
  const toldBeliefs: Array<{ sceneIdx: number; proposition: string; slug: string }> = [];
  const witnessedBeliefs: Array<{ sceneIdx: number; proposition: string }> = [];

  for (const r of records) {
    for (const highlight of r.dialogueHighlights) {
      // Highlights are formatted as "charId: proposition"
      const colonIdx = highlight.indexOf(':');
      if (colonIdx > -1) {
        const prop = highlight.slice(colonIdx + 1).trim();
        toldBeliefs.push({ sceneIdx: r.sceneIdx, proposition: prop, slug: r.slug });
      }
    }
    if (r.revelation !== null) {
      witnessedBeliefs.push({ sceneIdx: r.sceneIdx, proposition: r.revelation });
    }
  }

  // ── Told belief without prior setup ────────────────────────────────────────
  // A told belief that contradicts a witnessed belief without any intermediate
  // scene is a deception that wasn't set up
  for (const told of toldBeliefs) {
    const relatedWitnessed = witnessedBeliefs.filter(w =>
      w.sceneIdx < told.sceneIdx &&
      // Very rough overlap check: shared significant words
      sharedWords(w.proposition, told.proposition) >= 2
    );
    // If there IS a witnessed fact that contradicts what's being told, that's a deception
    // that's fine — but if there's no prior context at all, it's a belief orphan
    if (relatedWitnessed.length === 0 && told.sceneIdx > 0) {
      // Only flag if the proposition seems significant (not trivial facts)
      if (told.proposition.split(' ').length >= 4) {
        issues.push({
          location: `Scene ${told.sceneIdx} (${told.slug})`,
          rule: 'BELIEF_WITHOUT_CONTEXT',
          description: `A character asserts "${told.proposition.slice(0, 60)}..." with no prior contextual setup`,
          severity: 'minor',
          suggestedFix: 'Add an earlier moment where the audience has reason to believe or disbelieve this claim',
        });
      }
    }
  }

  // ── Revelation without any prior told-belief contradiction ─────────────────
  // A revelation that reveals nothing we were previously told is a weak surprise
  for (const witnessed of witnessedBeliefs) {
    const priorToldBeliefs = toldBeliefs.filter(t => t.sceneIdx < witnessed.sceneIdx);
    if (priorToldBeliefs.length === 0 && witnessed.sceneIdx > 1) {
      issues.push({
        location: `Scene ${witnessed.sceneIdx}`,
        rule: 'REVELATION_UNEARNED',
        description: 'A revelation scene delivers new information but no prior misinformation/deception makes it land as a reversal',
        severity: 'major',
        suggestedFix: 'Plant a false belief in an earlier scene that this revelation will overturn',
      });
    }
  }

  // ── Consecutive told-beliefs with no witness ───────────────────────────────
  // More than 3 told beliefs in a row without any witnessed belief = exposition dump
  let consecutiveTold = 0;
  let expositionStartScene = -1;
  for (const r of records) {
    if (r.dialogueHighlights.length > 0 && r.revelation === null) {
      if (consecutiveTold === 0) expositionStartScene = r.sceneIdx;
      consecutiveTold++;
    } else {
      consecutiveTold = 0;
    }
    if (consecutiveTold >= 3) {
      issues.push({
        location: `Scenes ${expositionStartScene}–${r.sceneIdx}`,
        rule: 'EXPOSITION_DUMP',
        description: `Scenes ${expositionStartScene}–${r.sceneIdx}: 3+ consecutive scenes deliver told beliefs with no witnessed confirmation — exposition feels inert`,
        severity: 'major',
        suggestedFix: 'Break the exposition streak with a scene that shows rather than tells the key information',
      });
      consecutiveTold = 0; // reset to avoid duplicate flags
    }
  }

  // ── Wave 145: Deception consequence & belief reversals ──────────────────────

  // DECEPTION_WITHOUT_CONSEQUENCE: A character is told something false (lies or
  // deliberately misleads) but the deception is never discovered by another
  // character or creates conflict. The lie exists but has zero narrative impact.
  for (const told of toldBeliefs) {
    // Find witnessed facts that contradict the told belief (indicating a lie)
    const contradiction = witnessedBeliefs.find(w =>
      w.sceneIdx > told.sceneIdx &&
      sharedWords(w.proposition, told.proposition) >= 2
    );

    if (contradiction) {
      // There IS a contradiction, so this is a lie. Now check if the lie has consequence.
      // Consequence = another character reacts (relationship shift) after learning the truth,
      // or high suspense after the truth is revealed.
      let hasConsequence = false;
      for (let i = contradiction.sceneIdx + 1; i < Math.min(contradiction.sceneIdx + 3, records.length); i++) {
        const followup = records[i];
        if ((followup.relationshipShifts?.length ?? 0) > 0 || followup.suspenseDelta > 1.5) {
          hasConsequence = true;
          break;
        }
      }

      if (!hasConsequence && contradiction.sceneIdx < records.length - 2) {
        issues.push({
          location: `Scene ${told.sceneIdx} (${told.slug}) → Scene ${contradiction.sceneIdx}`,
          rule: 'DECEPTION_WITHOUT_CONSEQUENCE',
          description: `Character is told "${told.proposition.slice(0, 60)}..." at Scene ${told.sceneIdx}, but the truth (revealed Scene ${contradiction.sceneIdx}) creates no relationship rupture or escalation — the lie is discovered but ignored`,
          severity: 'major',
          suggestedFix: 'Add a confrontation or consequence scene where the character discovering the lie reacts emotionally or shifts their relationship with the liar',
        });
      }
    }
  }

  // BELIEF_REVERSAL_UNSUPPORTED: A character shifts their emotional state sharply
  // (high suspense delta or negative emotional shift) but there's no prior scene
  // planting a clue or raising a question that would justify the reversal.
  // This indicates the character changed their mind/emotional stance without evidence.
  for (let i = 1; i < records.length; i++) {
    const curr = records[i];
    const prev = records[i - 1];

    // Detect reversal: significant swing in suspense delta or emotional tone flip
    const isBigReversal = (curr.suspenseDelta > 2 && prev.suspenseDelta < 0.5) ||
      (curr.emotionalShift !== prev.emotionalShift && curr.emotionalShift !== 'neutral');

    if (isBigReversal && i >= 2) {
      // Check if there was a clue or question planted in the 2 prior scenes
      let hasSetup = false;
      for (let j = Math.max(0, i - 2); j < i; j++) {
        const setup = records[j];
        if ((setup.seededClueIds?.length ?? 0) > 0 || setup.revelation !== null) {
          hasSetup = true;
          break;
        }
      }

      if (!hasSetup) {
        issues.push({
          location: `Scene ${i} (${curr.slug})`,
          rule: 'BELIEF_REVERSAL_UNSUPPORTED',
          description: `Scene ${i} shows a major emotional or belief shift (suspense from ${prev.suspenseDelta} to ${curr.suspenseDelta}, mood ${prev.emotionalShift}→${curr.emotionalShift}) but no prior clue or revelation justifies the change — the reversal feels unmotivated`,
          severity: 'major',
          suggestedFix: 'Plant a revelatory moment 1-2 scenes before that explains why the character changed their belief or emotional stance',
        });
      }
    }
  }

  // BELIEF_ISOLATION: A character has planted clues (indicating they're learning or
  // hiding knowledge) but never expresses this belief in dialogue highlights. The
  // belief is interior but never made legible to the audience, making the character's
  // motivation opaque.
  const scenesWithClues = records.filter(r => (r.seededClueIds?.length ?? 0) > 0);
  for (const scene of scenesWithClues) {
    const hasDialogue = scene.dialogueHighlights.length > 0;
    if (!hasDialogue && records.length >= 5) {
      // Only flag if this is a middle scene (not setup or epilogue) and there's enough story length
      const isMiddle = scene.sceneIdx > 0 && scene.sceneIdx < records.length - 1;
      if (isMiddle) {
        issues.push({
          location: `Scene ${scene.sceneIdx} (${scene.slug})`,
          rule: 'BELIEF_ISOLATION',
          description: `Scene ${scene.sceneIdx} plants clues (seeding knowledge) but has no dialogue highlights — the character's belief or discovery is kept entirely internal, making their motivation invisible to the audience`,
          severity: 'major',
          suggestedFix: 'Add a line of dialogue or internal monologue where the character expresses or reacts to the clue they\'ve discovered',
        });
      }
    }
  }

  // ── Wave 159: Revelation isolated, told domination, belief asymmetry ─────────

  // REVELATION_ISOLATED: A scene contains a revelation but neither the scene
  // itself nor its immediate neighbors have any character dialogue. The discovery
  // happens in silence — no character processes, reacts to, or articulates what
  // they've just witnessed. Revelations need a human voice to resonate.
  if (records.length >= 5) {
    for (let i = 0; i < records.length; i++) {
      const r = records[i];
      if (r.revelation === null) continue;

      const prevHasDialogue = i > 0 && records[i - 1].dialogueHighlights.length > 0;
      const currHasDialogue = r.dialogueHighlights.length > 0;
      const nextHasDialogue = i < records.length - 1 && records[i + 1].dialogueHighlights.length > 0;

      if (!prevHasDialogue && !currHasDialogue && !nextHasDialogue) {
        issues.push({
          location: `Scene ${i} (${r.slug})`,
          rule: 'REVELATION_ISOLATED',
          description: `Scene ${i} contains a revelation ("${String(r.revelation).slice(0, 60)}") but no character dialogue appears in this or adjacent scenes — the discovery happens in silence with no human reaction`,
          severity: 'major',
          suggestedFix: 'Add dialogue in the revelation scene or the scene immediately after where a character processes, denies, or responds to what they\'ve just witnessed',
        });
      }
    }
  }

  // TOLD_BELIEF_DOMINATION: More than 70% of belief-content scenes (scenes with
  // dialogueHighlights or a revelation) are told-only — the story relies on
  // characters asserting facts in dialogue rather than letting the audience
  // witness them directly. Requires 6+ records and 4+ belief scenes.
  if (records.length >= 6) {
    const beliefScenes = records.filter(r => r.dialogueHighlights.length > 0 || r.revelation !== null);
    if (beliefScenes.length >= 4) {
      const toldOnlyCount = beliefScenes.filter(r => r.dialogueHighlights.length > 0 && r.revelation === null).length;
      const toldRatio = toldOnlyCount / beliefScenes.length;
      if (toldRatio > 0.7) {
        issues.push({
          location: 'Belief/revelation layer',
          rule: 'TOLD_BELIEF_DOMINATION',
          description: `${toldOnlyCount} of ${beliefScenes.length} belief scenes (${Math.round(toldRatio * 100)}%) are told-only with no witnessed revelation — the story tells far more than it shows`,
          severity: 'major',
          suggestedFix: 'Convert at least one told-belief scene to a witnessed event — let the audience discover the truth through action or direct observation rather than a character asserting it',
        });
      }
    }
  }

  // BELIEF_ASYMMETRY: One character accounts for 3× or more belief appearances
  // than any other character. The belief/deception layer is dominated by a single
  // voice while others remain belief-opaque — creating thin psychological texture.
  // Requires 6+ records and 4+ total dialogueHighlights.
  if (records.length >= 6) {
    const charBeliefCounts = new Map<string, number>();
    for (const r of records) {
      for (const h of r.dialogueHighlights) {
        const m = h.match(/^(\w+):/);
        if (m) charBeliefCounts.set(m[1], (charBeliefCounts.get(m[1]) ?? 0) + 1);
      }
    }
    const totalBeliefs = Array.from(charBeliefCounts.values()).reduce((s, v) => s + v, 0);
    if (totalBeliefs >= 4 && charBeliefCounts.size >= 2) {
      const sorted = [...charBeliefCounts.values()].sort((a, b) => b - a);
      const maxCount = sorted[0];
      const secondCount = sorted[1] ?? 0;
      if (secondCount > 0 && maxCount >= secondCount * 3) {
        const dominantChar = [...charBeliefCounts.entries()].find(([, v]) => v === maxCount)?.[0] ?? '';
        issues.push({
          location: 'Belief distribution',
          rule: 'BELIEF_ASYMMETRY',
          description: `"${dominantChar}" accounts for ${maxCount} of ${totalBeliefs} belief appearances (${Math.round(maxCount / totalBeliefs * 100)}%) — the deception layer is dominated by a single voice; other characters remain psychologically opaque`,
          severity: 'minor',
          suggestedFix: 'Give secondary characters more belief-revealing moments — let other characters express, discover, or challenge beliefs to create a multi-perspective deception layer',
        });
      }
    }
  }

  // ── Wave 175: Revelation clustering, belief stagnation, scene overload ───────

  // REVELATION_CLUSTERING: Three or more revelations crammed into a single
  // 3-scene window. The audience needs room between reversals to absorb each
  // one; a flood of discoveries in quick succession blunts every individual
  // surprise. Distinct from causality's front-loading (first-half bias) — this
  // is a local density spike anywhere in the story.
  if (records.length >= 8) {
    for (let i = 0; i + 3 <= records.length; i++) {
      const window = records.slice(i, i + 3);
      const revCount = window.filter(r => r.revelation !== null).length;
      if (revCount >= 3) {
        issues.push({
          location: `Scenes ${i}–${i + 2}`,
          rule: 'REVELATION_CLUSTERING',
          description: `Scenes ${i}–${i + 2} contain ${revCount} revelations in a row — a flood of reversals in a three-scene window. The audience has no room to absorb one discovery before the next arrives, and every surprise lands softer for it.`,
          severity: 'major',
          suggestedFix: 'Space the revelations out. Let a reversal breathe — give the characters (and the audience) a scene to react and recalibrate before the next truth lands. Bank some of these discoveries for later acts.',
        });
        break;
      }
    }
  }

  // BELIEF_STAGNATION: The story carries substantial belief content (4+ told
  // beliefs and at least one witnessed revelation) yet no told belief is ever
  // contradicted by a later witnessed fact — nobody ever turns out to be wrong.
  // The belief/deception layer is static: assertions accumulate but none reverse.
  if (records.length >= 6 && toldBeliefs.length >= 4 && witnessedBeliefs.length >= 1) {
    const hasAnyContradiction = toldBeliefs.some(told =>
      witnessedBeliefs.some(w => w.sceneIdx > told.sceneIdx && sharedWords(w.proposition, told.proposition) >= 2),
    );
    if (!hasAnyContradiction) {
      issues.push({
        location: 'Belief/deception layer',
        rule: 'BELIEF_STAGNATION',
        description: `Across ${toldBeliefs.length} told beliefs and ${witnessedBeliefs.length} revelation(s), no asserted belief is ever overturned by a later discovery — nobody is ever proven wrong. The belief layer accumulates assertions but never reverses one.`,
        severity: 'major',
        suggestedFix: 'Plant a belief in dialogue that a later scene contradicts. The engine of drama is a character acting on a false belief and paying for it — at least one thing a character is sure of should turn out to be wrong.',
      });
    }
  }

  // SINGLE_SCENE_BELIEF_OVERLOAD: One scene crams five or more separate belief
  // assertions into its dialogue with no witnessed revelation — an information
  // cram where the audience is asked to track too many propositions at once.
  // Distinct from EXPOSITION_DUMP (consecutive told-only scenes); this is a
  // single overloaded scene.
  if (records.length >= 4) {
    for (const r of records) {
      if (r.revelation === null && r.dialogueHighlights.length >= 5) {
        issues.push({
          location: `Scene ${r.sceneIdx} (${r.slug})`,
          rule: 'SINGLE_SCENE_BELIEF_OVERLOAD',
          description: `Scene ${r.sceneIdx} packs ${r.dialogueHighlights.length} separate belief assertions into one scene with no witnessed payoff — the audience is asked to track too many propositions at once, and none of them register.`,
          severity: 'minor',
          suggestedFix: 'Distribute these assertions across multiple scenes, or cut to the two or three that actually matter. A scene that establishes one belief clearly beats a scene that establishes five forgettably.',
        });
        break;
      }
    }
  }

  // ── Wave 190: Cold open void, unresolved excess, back-weighted revelations ───

  // COLD_OPEN_BELIEF_VOID: The first quarter of the story carries no told beliefs
  // and no revelations — the deception layer has no Act 1 foundation. Without
  // early propositions to hold, the audience has nothing to believe or disbelieve
  // when the complications arrive.
  if (records.length >= 8) {
    const act1BelEnd = Math.floor(records.length * 0.25);
    const act1BelRecords = records.slice(0, act1BelEnd);
    if (act1BelRecords.length >= 2) {
      const hasBelief = act1BelRecords.some(r => r.dialogueHighlights.length > 0 || r.revelation !== null);
      if (!hasBelief) {
        issues.push({
          location: 'Act 1 belief layer',
          rule: 'COLD_OPEN_BELIEF_VOID',
          severity: 'minor',
          description: `The first ${act1BelEnd} scenes contain no belief assertions or witnessed revelations — the story's deception layer has no Act 1 foundation. The audience enters with nothing to believe or question.`,
          suggestedFix: 'Plant at least one told belief or witnessed fact in Act 1. Give the audience a proposition to carry before the story complicates it.',
        });
      }
    }
  }

  // UNRESOLVED_BELIEF_EXCESS: Four or more told beliefs accumulate across the
  // story with no corresponding revelation (before or after) that shares significant
  // vocabulary — every assertion is left permanently unaddressed. Too many orphaned
  // beliefs signal a belief layer that asserts without ever resolving.
  if (records.length >= 8 && toldBeliefs.length >= 4) {
    const orphanedBeliefs = toldBeliefs.filter(told =>
      !witnessedBeliefs.some(w => sharedWords(w.proposition, told.proposition) >= 2),
    );
    if (orphanedBeliefs.length >= 4) {
      issues.push({
        location: 'Belief/deception layer',
        rule: 'UNRESOLVED_BELIEF_EXCESS',
        severity: 'major',
        description: `${orphanedBeliefs.length} told beliefs accumulate across the story with no corresponding revelation to confirm or contradict them — too many assertions are left permanently unaddressed.`,
        suggestedFix: 'Resolve the key beliefs through witnessed scenes. A belief that is never confirmed or contradicted is narrative dead weight — give the audience the payoff they were promised.',
      });
    }
  }

  // REVELATION_BACK_WEIGHTED: When there are two or more revelations, 80%+ occur
  // in the final quarter — the story withholds all discovery until the end. While
  // a final reveal can be powerful, piling every revelation into the last act denies
  // the audience mid-story discovery arcs and makes the ending feel like a trick.
  if (records.length >= 8 && witnessedBeliefs.length >= 2) {
    const finalQStart = Math.floor(records.length * 0.75);
    const inFinalQ = witnessedBeliefs.filter(w => w.sceneIdx >= finalQStart).length;
    if (inFinalQ / witnessedBeliefs.length >= 0.8) {
      issues.push({
        location: 'Revelation distribution',
        rule: 'REVELATION_BACK_WEIGHTED',
        severity: 'minor',
        description: `${inFinalQ} of ${witnessedBeliefs.length} revelations (${Math.round((inFinalQ / witnessedBeliefs.length) * 100)}%) occur in the final quarter — the story withholds all discovery until the end, denying the audience mid-story revelation arcs.`,
        suggestedFix: 'Move at least one revelation earlier. A mid-story discovery raises stakes for the second half; withholding everything until the end feels like a trick rather than a journey.',
      });
    }
  }

  // ── Wave 199: Midpoint void, single revelation, revelation delayed ────────

  // BELIEF_MIDPOINT_VOID: The midpoint zone (40%–60%) carries no told beliefs
  // and no witnessed revelations. The structural pivot has no belief/deception
  // activity — the story shifts gear without any information exchange to motivate
  // the transition.
  if (records.length >= 8) {
    const beliefMidStart = Math.floor(records.length * 0.4);
    const beliefMidEnd = Math.floor(records.length * 0.6);
    const midBelRecs = records.slice(beliefMidStart, beliefMidEnd);
    if (midBelRecs.length >= 2) {
      const hasMidBelief = midBelRecs.some(r =>
        r.dialogueHighlights.length > 0 || r.revelation !== null,
      );
      if (!hasMidBelief) {
        issues.push({
          location: `Midpoint zone (Scenes ${beliefMidStart}–${beliefMidEnd - 1})`,
          rule: 'BELIEF_MIDPOINT_VOID',
          description: `The midpoint zone (Scenes ${beliefMidStart}–${beliefMidEnd - 1}) contains no told beliefs and no revelations — the story's structural pivot has no information exchange to motivate it`,
          severity: 'minor',
          suggestedFix: 'Add at least one belief beat to the midpoint zone: a character asserting something important, or a scene that witnesses a key truth. The midpoint is where the story\'s question becomes most urgent — it should carry a belief beat.',
        });
      }
    }
  }

  // SINGLE_REVELATION_STORY: Across 8+ scenes, there is exactly one witnessed
  // revelation. A single fact witnessed in the whole story is insufficient —
  // the audience has only one anchor point in the deception layer. Characters
  // assert freely and the story confirms almost nothing.
  if (records.length >= 8 && witnessedBeliefs.length === 1) {
    issues.push({
      location: 'Revelation layer',
      rule: 'SINGLE_REVELATION_STORY',
      description: `The entire story contains exactly one witnessed revelation across ${records.length} scenes — almost everything is asserted and almost nothing is confirmed. The belief layer has a single anchor point and no arc.`,
      severity: 'minor',
      suggestedFix: 'Add at least one more revelation: a scene where the audience directly witnesses a truth rather than hearing a character assert it. Multiple revelations create a discovery arc — the audience\'s understanding of the world updates and deepens across the story.',
    });
  }

  // REVELATION_DELAYED: Two or more told beliefs exist (characters assert things
  // in dialogue) but the first witnessed revelation occurs past the story's
  // midpoint. The audience spends the first half taking characters at their word
  // with no confirmation or contradiction — building unearned trust (or suspicion)
  // that should be interrogated much earlier.
  if (records.length >= 6 && toldBeliefs.length >= 2 && witnessedBeliefs.length >= 1) {
    const firstRevIdx = witnessedBeliefs[0].sceneIdx;
    const midpointThreshold = records.length * 0.5;
    if (firstRevIdx > midpointThreshold) {
      issues.push({
        location: `First revelation at Scene ${firstRevIdx}`,
        rule: 'REVELATION_DELAYED',
        description: `Characters make assertions from the start but the first witnessed fact doesn't arrive until Scene ${firstRevIdx} — ${Math.round(firstRevIdx / records.length * 100)}% through the story. The audience spends the first half with no witnessed verification of what they're being told.`,
        severity: 'major',
        suggestedFix: 'Move the first revelation before the midpoint. An early witnessed fact grounds the audience in what is objectively true, giving them a reference point to measure the characters\' assertions against.',
      });
    }
  }

  // ── Wave 211: Revelation Act 3 void, late deception plant, belief resolution absent ──

  // REVELATION_ACT3_VOID: Act 3 (last 25%) carries no witnessed revelations at all,
  // despite 3+ revelations landing in the first 75%. The story's climax zone delivers
  // no new truth — every discovery has already happened and the audience enters the
  // final act with complete information. A climax without revelation can feel like
  // execution rather than discovery: the protagonist acts on knowledge they already have,
  // without the galvanising moment of finding out something new.
  if (records.length >= 8 && witnessedBeliefs.length >= 3) {
    const act3RevStart211 = Math.floor(records.length * 0.75);
    const inAct3Rev211 = witnessedBeliefs.filter(w => w.sceneIdx >= act3RevStart211).length;
    if (inAct3Rev211 === 0 && witnessedBeliefs.length - inAct3Rev211 >= 2) {
      issues.push({
        location: `Act 3 (Scenes ${act3RevStart211}–${records.length - 1}) — revelation zone`,
        rule: 'REVELATION_ACT3_VOID',
        severity: 'minor',
        description: `${witnessedBeliefs.length} revelations land in the first 75% of the story but none reach Act 3 — the climax delivers no new discovery. The audience enters the final act with complete information and watches execution rather than revelation.`,
        suggestedFix: 'Move at least one revelation into Act 3, or engineer a new one: a truth that the protagonist learns in the climax that recontextualises everything — the revelation that makes the final choice inevitable rather than obvious.',
      });
    }
  }

  // LATE_DECEPTION_PLANT: A deception is set up (told belief contradicted by a later
  // witnessed revelation) but the false belief is planted in the final 40% of the
  // story — too close to its own revelation to have had time to mislead the audience.
  // A deception needs distance between the lie and its unmasking; a lie introduced in
  // the final act and immediately exposed is a twist, not a slow burn.
  if (records.length >= 8) {
    const lateCutoff211 = Math.floor(records.length * 0.6);
    const lateToldBeliefs = toldBeliefs.filter(told => told.sceneIdx >= lateCutoff211);
    for (const told211 of lateToldBeliefs) {
      const contradiction211 = witnessedBeliefs.find(w =>
        w.sceneIdx > told211.sceneIdx && sharedWords(w.proposition, told211.proposition) >= 2,
      );
      if (contradiction211) {
        issues.push({
          location: `Scene ${told211.sceneIdx} (${told211.slug})`,
          rule: 'LATE_DECEPTION_PLANT',
          severity: 'minor',
          description: `A deception is introduced at Scene ${told211.sceneIdx} (${Math.round(told211.sceneIdx / records.length * 100)}% through the story) and contradicted by a revelation at Scene ${contradiction211.sceneIdx} — the lie is planted and exposed in the same act. The audience has no time to be genuinely misled.`,
          suggestedFix: 'Move the false belief into Act 1 or early Act 2 so it has time to settle before the revelation overturns it. Effective deception requires the audience to carry the lie long enough to believe it — at least half the story.',
        });
        break;
      }
    }
  }

  // BELIEF_RESOLUTION_ABSENT: The story has a developed belief/revelation arc (2+
  // witnessed revelations) but none occur in the final 20% — the closing section
  // delivers no truth. The belief layer's arc closes before the climax, leaving
  // the story's ending informationally static. The audience's final impression is
  // of action without discovery — the last thing they see is characters executing
  // on knowledge they already had, not characters finding out something that matters.
  if (records.length >= 8 && witnessedBeliefs.length >= 2) {
    const finalZoneStart211 = Math.floor(records.length * 0.8);
    const inFinalZone211 = witnessedBeliefs.filter(w => w.sceneIdx >= finalZoneStart211).length;
    if (inFinalZone211 === 0) {
      issues.push({
        location: `Final zone (Scenes ${finalZoneStart211}–${records.length - 1}) — revelation`,
        rule: 'BELIEF_RESOLUTION_ABSENT',
        severity: 'major',
        description: `${witnessedBeliefs.length} revelations land across the story but none reach the final 20% — the closing scenes deliver no new discovery. The belief arc resolves before the climax; the ending is informationally static.`,
        suggestedFix: 'Ensure the story\'s climax or denouement delivers at least one witnessed revelation — a truth that changes the audience\'s understanding of everything that happened. The final revelation is the story\'s last word on what was real.',
      });
    }
  }

  // ── Wave 225: DECEPTION_SETUP_VOID ───────────────────────────────────────
  // Two or more told beliefs planted in the first 40% of the story are
  // "orphaned" — no witnessed revelation at any point shares enough vocabulary
  // to confirm or contradict them. Early-planted propositions are promises: the
  // audience internalises them and waits for the story to address them. When
  // those promises are never redeemed — neither confirmed nor overturned — the
  // Act 1 belief layer is hollow. Requires 8+ records and 2+ told beliefs.
  if (records.length >= 8 && toldBeliefs.length >= 2) {
    const earlyBelCutoff225 = Math.floor(records.length * 0.4);
    const earlyToldBeliefs225 = toldBeliefs.filter(t => t.sceneIdx <= earlyBelCutoff225);
    if (earlyToldBeliefs225.length >= 2) {
      const earlyOrphans225 = earlyToldBeliefs225.filter(told =>
        !witnessedBeliefs.some(w => sharedWords(w.proposition, told.proposition) >= 2),
      );
      if (earlyOrphans225.length >= 2) {
        const sample225 = earlyOrphans225.slice(0, 2)
          .map(t => `"${t.proposition.slice(0, 45)}${t.proposition.length > 45 ? '…' : ''}"`)
          .join('; ');
        issues.push({
          location: `Act 1 belief layer (Scenes 0–${earlyBelCutoff225})`,
          rule: 'DECEPTION_SETUP_VOID',
          severity: 'major',
          description: `${earlyOrphans225.length} told beliefs planted in the first 40% of the story are never confirmed or contradicted by any witnessed revelation — early-planted propositions (${sample225}) are promises to the audience that the story never redeems.`,
          suggestedFix: `Every early-planted assertion should be paid off: a scene that confirms it (validating the audience) or one that overturns it (delivering the twist they were waiting for). An unresolved early belief is a broken contract with the audience.`,
        });
      }
    }
  }

  // ── Wave 225: BELIEF_FRONT_LOADED_REVELATIONS ────────────────────────────
  // More than 70% of witnessed revelations land in the first half of the story.
  // The audience exhausts its major discoveries before the midpoint — Act 2b
  // and Act 3 are informationally dry. The climax plays out against complete
  // audience knowledge, draining the final act of the discovery energy that
  // galvanises dramatic resolution. Distinct from REVELATION_BACK_WEIGHTED
  // (its inverse). Requires 8+ records and 3+ revelations.
  if (records.length >= 8 && witnessedBeliefs.length >= 3) {
    const midpoint225 = Math.floor(records.length * 0.5);
    const firstHalfRevs225 = witnessedBeliefs.filter(w => w.sceneIdx < midpoint225).length;
    const frontRatio225 = firstHalfRevs225 / witnessedBeliefs.length;
    if (frontRatio225 > 0.7) {
      issues.push({
        location: 'Revelation distribution',
        rule: 'BELIEF_FRONT_LOADED_REVELATIONS',
        severity: 'major',
        description: `${firstHalfRevs225} of ${witnessedBeliefs.length} revelations (${Math.round(frontRatio225 * 100)}%) occur in the first half — the story exhausts its discoveries before the midpoint. Act 2b and Act 3 have nothing left to reveal, leaving the climax informationally static.`,
        suggestedFix: `Reserve at least one major revelation for the second half — preferably the Act 2b turning point or the climax. The revelation that recontextualises everything lands hardest when placed close to the end.`,
      });
    }
  }

  // ── Wave 225: REVELATION_AFTERMATH_ABSENT ────────────────────────────────
  // 60%+ of witnessed revelations have no downstream reaction in the two scenes
  // that follow — no relationship shift, no change in suspense, no new clue
  // planted. The story discovers things without dramatising their impact.
  // A revelation without an aftermath is a fact delivered in a vacuum, not a
  // dramatic event. Requires 8+ records and 2+ revelations.
  if (records.length >= 8 && witnessedBeliefs.length >= 2) {
    const unreactedRevs225 = witnessedBeliefs.filter(w => {
      if (w.sceneIdx >= records.length - 2) return false; // too close to end, exempt
      let hasReaction = false;
      for (let k = w.sceneIdx + 1; k <= Math.min(w.sceneIdx + 2, records.length - 1); k++) {
        const followup = records[k];
        if (followup &&
            ((followup.relationshipShifts?.length ?? 0) > 0 ||
             followup.suspenseDelta !== 0 ||
             (followup.seededClueIds?.length ?? 0) > 0)) {
          hasReaction = true;
          break;
        }
      }
      return !hasReaction;
    });
    const aftermathGapRatio225 = unreactedRevs225.length / witnessedBeliefs.length;
    if (aftermathGapRatio225 >= 0.6) {
      issues.push({
        location: 'Revelation aftermath',
        rule: 'REVELATION_AFTERMATH_ABSENT',
        severity: 'minor',
        description: `${unreactedRevs225.length} of ${witnessedBeliefs.length} revelations (${Math.round(aftermathGapRatio225 * 100)}%) have no downstream reaction in the following two scenes — no relationship shift, no suspense change, no new clue planted. The story discovers things without dramatising their impact.`,
        suggestedFix: `Every revelation should create a ripple. In the scene after the discovery: a relationship cracks, stakes rise, or a new question is planted. A revelation with no aftermath is a fact in a vacuum — give it consequence.`,
      });
    }
  }

  // ── Wave 239: TOLD_BELIEF_ACT3_SURGE ─────────────────────────────────────
  // 3+ told beliefs land in Act 3 (final 25%) and account for 40%+ of all told
  // beliefs — new assertions flood the climax act. Characters should execute on
  // prior beliefs in Act 3, not introduce new ones. An Act 3 surge signals that
  // the story is cramming exposition into the climax rather than earlier acts.
  // Requires 10+ records and 5+ total told beliefs.
  if (records.length >= 10 && toldBeliefs.length >= 5) {
    const act3Start239 = Math.floor(records.length * 0.75);
    const act3ToldBeliefs239 = toldBeliefs.filter(t => t.sceneIdx >= act3Start239);
    if (act3ToldBeliefs239.length >= 3 && act3ToldBeliefs239.length / toldBeliefs.length > 0.4) {
      issues.push({
        location: `Act 3 told beliefs (Scenes ${act3Start239}–${records.length - 1})`,
        rule: 'TOLD_BELIEF_ACT3_SURGE',
        severity: 'minor',
        description: `${act3ToldBeliefs239.length} of ${toldBeliefs.length} told beliefs (${Math.round(act3ToldBeliefs239.length / toldBeliefs.length * 100)}%) land in Act 3 — the story is introducing new assertions in the climax rather than paying off established ones. Act 3 should execute on prior beliefs, not plant new ones.`,
        suggestedFix: 'Move Act 3 belief assertions into Act 1 or Act 2 so the audience carries them through the build. Reserve Act 3 for witnessed revelations and consequence — not new propositions.',
      });
    }
  }

  // ── Wave 239: REVELATION_BELIEF_PROPAGATION_ABSENT ───────────────────────
  // Witnessed revelations exist but none of them triggers any subsequent told
  // belief that shares vocabulary — the discovery layer is disconnected from
  // the assertion layer. Characters witness truths but never change what they
  // say or claim afterward. A revelation that doesn't propagate into subsequent
  // dialogue is informationally inert: the story discovered something but no
  // character adjusted their worldview. Requires 8+ records and 2+ revelations.
  if (records.length >= 8 && witnessedBeliefs.length >= 2) {
    const anyRevPropagates239 = witnessedBeliefs.some(w =>
      toldBeliefs.some(t => t.sceneIdx > w.sceneIdx && sharedWords(t.proposition, w.proposition) >= 2),
    );
    if (!anyRevPropagates239) {
      issues.push({
        location: 'Revelation/belief propagation layer',
        rule: 'REVELATION_BELIEF_PROPAGATION_ABSENT',
        severity: 'minor',
        description: `${witnessedBeliefs.length} witnessed revelations occur across the story but none of them trigger any subsequent told belief with shared vocabulary — characters discover truths but never adjust what they assert. The revelation layer is disconnected from the dialogue belief layer.`,
        suggestedFix: 'After each key revelation, have a character articulate what they now believe — a line of dialogue that shows the discovery changed their understanding. A revelation that isn\'t reflected in subsequent assertions has no epistemic impact.',
      });
    }
  }

  // ── Wave 239: SOLE_ASSERTER ───────────────────────────────────────────────
  // Only one unique character ever makes told-belief assertions across the story.
  // BELIEF_ASYMMETRY flags the case where one character dominates 3:1 over
  // another — this catches the starker case where only ONE character appears in
  // the belief layer at all. The deception/belief layer becomes a monologue;
  // all other characters receive or react without ever asserting their own beliefs.
  // Requires 6+ records and 4+ total told beliefs.
  if (records.length >= 6 && toldBeliefs.length >= 4) {
    const assertingChars239 = new Set<string>();
    for (const r of records) {
      for (const h of r.dialogueHighlights) {
        const colonIdx = h.indexOf(':');
        if (colonIdx > -1) assertingChars239.add(h.slice(0, colonIdx).trim());
      }
    }
    if (assertingChars239.size === 1) {
      const soloChar239 = [...assertingChars239][0];
      issues.push({
        location: 'Belief assertion distribution',
        rule: 'SOLE_ASSERTER',
        severity: 'minor',
        description: `Only one character ("${soloChar239}") makes told-belief assertions across all ${records.length} scenes — the belief/deception layer is a monologue. All other characters remain belief-silent, never articulating their own propositions or claims.`,
        suggestedFix: 'Give at least one other character a belief assertion — a claim, a misreading of events, or a lie of their own. A multi-voice belief layer creates conflict and reveals character; a single asserter creates lecture.',
      });
    }
  }

  // ── Wave 253: REVELATION_ACT2A_DESERT ────────────────────────────────────
  // Act 2a (25%–50%) carries no witnessed revelations, despite the story having
  // 3+ revelations overall. The first complication zone — where the protagonist
  // begins testing the world and the audience expects their understanding to
  // start updating — delivers no discovery. Revelations cluster in Act 1 and
  // Act 2b/3 but skip the early-middle, leaving a discovery valley right where
  // the story should be building momentum. Requires 8+ records and 3+ revelations.
  if (records.length >= 8 && witnessedBeliefs.length >= 3) {
    const act2aStart253 = Math.floor(records.length * 0.25);
    const act2aEnd253 = Math.floor(records.length * 0.5);
    const inAct2a253 = witnessedBeliefs.filter(w => w.sceneIdx >= act2aStart253 && w.sceneIdx < act2aEnd253).length;
    if (inAct2a253 === 0) {
      issues.push({
        location: `Act 2a (Scenes ${act2aStart253}–${act2aEnd253 - 1}) — revelation zone`,
        rule: 'REVELATION_ACT2A_DESERT',
        severity: 'minor',
        description: `${witnessedBeliefs.length} revelations land across the story but none occur in Act 2a (Scenes ${act2aStart253}–${act2aEnd253 - 1}) — the first complication zone delivers no discovery. The audience's understanding stops updating just as the protagonist starts testing the world.`,
        suggestedFix: 'Plant a revelation in Act 2a: an early consequence of the protagonist\'s first moves that reveals something they (and the audience) did not know. The first complication should teach the protagonist that the world is more complicated than they assumed.',
      });
    }
  }

  // ── Wave 253: BELIEF_ECHO_CHAMBER ────────────────────────────────────────
  // The same proposition is asserted in dialogue across 3+ separate scenes —
  // sharing significant vocabulary — but is never confirmed or contradicted by
  // any witnessed revelation. The story repeats an unverified claim instead of
  // developing it: the audience hears the same assertion again and again with no
  // resolution, mistaking repetition for emphasis. Distinct from EXPOSITION_DUMP
  // (consecutive told-only scenes) and SINGLE_SCENE_BELIEF_OVERLOAD (one packed
  // scene); this is one claim echoing across the whole story unanswered.
  // Requires 6+ records and 3+ told beliefs.
  if (records.length >= 6 && toldBeliefs.length >= 3) {
    for (const anchor253 of toldBeliefs) {
      const echoes253 = toldBeliefs.filter(t => sharedWords(t.proposition, anchor253.proposition) >= 2);
      // echoes253 includes the anchor itself when it shares words with itself;
      // require 3+ distinct scenes asserting the same proposition cluster.
      const echoScenes253 = new Set(echoes253.map(e => e.sceneIdx));
      if (echoScenes253.size >= 3) {
        const witnessedResolves253 = witnessedBeliefs.some(w => sharedWords(w.proposition, anchor253.proposition) >= 2);
        if (!witnessedResolves253) {
          const scenesList253 = [...echoScenes253].sort((a, b) => a - b);
          issues.push({
            location: `Scenes ${scenesList253.join(', ')} — repeated assertion`,
            rule: 'BELIEF_ECHO_CHAMBER',
            severity: 'minor',
            description: `The proposition "${anchor253.proposition.slice(0, 50)}${anchor253.proposition.length > 50 ? '…' : ''}" is asserted across ${echoScenes253.size} separate scenes (${scenesList253.join(', ')}) but no witnessed revelation ever confirms or contradicts it — the story repeats an unverified claim instead of resolving it. Repetition is being mistaken for emphasis.`,
            suggestedFix: 'Either pay the claim off with a witnessed scene that proves or disproves it, or cut the repetitions down to a single clear assertion. A belief that is restated three times without resolution reads as the story circling rather than advancing.',
          });
          break;
        }
      }
    }
  }

  // ── Wave 253: ADJACENT_DECEPTION_PAYOFF ──────────────────────────────────
  // A told belief is contradicted by a witnessed revelation in the very next
  // scene (gap of exactly one). The deception and its unmasking sit shoulder to
  // shoulder — the audience is handed a lie and shown the truth before they have
  // any chance to act on the false belief. A deception needs breathing room to
  // mislead; planting and exposing it in adjacent scenes makes it a non-event.
  // Distinct from LATE_DECEPTION_PLANT (about position in the story); this is
  // about the gap between setup and payoff anywhere. Requires 6+ records.
  if (records.length >= 6) {
    for (const told253 of toldBeliefs) {
      const adjacentReveal253 = witnessedBeliefs.find(w =>
        w.sceneIdx === told253.sceneIdx + 1 && sharedWords(w.proposition, told253.proposition) >= 2,
      );
      if (adjacentReveal253) {
        issues.push({
          location: `Scene ${told253.sceneIdx} (${told253.slug}) → Scene ${adjacentReveal253.sceneIdx}`,
          rule: 'ADJACENT_DECEPTION_PAYOFF',
          severity: 'minor',
          description: `A belief asserted at Scene ${told253.sceneIdx} is contradicted by a witnessed revelation in the very next scene (Scene ${adjacentReveal253.sceneIdx}) — the lie and its unmasking are adjacent. The audience never has time to act on the false belief, so the deception has no dramatic payoff.`,
          suggestedFix: 'Put distance between the deception and its revelation. Let the false belief drive at least two or three scenes of action before the truth surfaces — the cost of the lie is paid in everything the characters do while they still believe it.',
        });
        break;
      }
    }
  }

  // ── Wave 267: BELIEF_FRONT_LOADED ─────────────────────────────────────────
  // All told beliefs cluster in the first half of the story — none appear
  // in the second half. The story front-loads its deception layer and then
  // abandons it: the second half has no competing assertions, no misdirection,
  // no characters holding beliefs the audience can see as false. This strips
  // dramatic irony from the climax, where the audience most needs to be ahead
  // of (or misled by) the characters.
  // Requires 6+ records and 4+ told beliefs.
  if (records.length >= 6 && toldBeliefs.length >= 4) {
    const midpoint267 = Math.floor(records.length / 2);
    const secondHalfTold267 = toldBeliefs.filter(t => t.sceneIdx >= midpoint267);
    if (secondHalfTold267.length === 0) {
      issues.push({
        location: `First half only (scenes 0–${midpoint267 - 1})`,
        rule: 'BELIEF_FRONT_LOADED',
        severity: 'minor',
        description: `All ${toldBeliefs.length} told beliefs appear in the first half of the story (scenes 0–${midpoint267 - 1}); the second half has none. The deception layer is exhausted before the climax — the audience knows what every character believes long before the resolution, removing dramatic irony from the story's most consequential moments.`,
        suggestedFix: 'Plant at least one new told belief in the second half — a misleading claim voiced near the climax, a false assumption a character holds into the final act. Late misdirection sustains dramatic irony and makes the resolution feel earned rather than mechanical.',
      });
    }
  }

  // ── Wave 267: REVELATION_FINAL_ACT_ONLY ───────────────────────────────────
  // All witnessed revelations are confined to the final quarter of the story.
  // Earlier acts have zero revelations: no moment where a character discovers
  // something true, no scene where the audience is shown the reality beneath
  // surface claims. Every revealed truth is deferred to the end, making the
  // intermediate acts feel provisional and dramatically inert.
  // Distinct from REVELATION_ACT2A_DESERT (Act 2a specifically); this flags
  // the entire three-act desert before the final quarter.
  // Requires 8+ records and 2+ witnessed beliefs.
  if (records.length >= 8 && witnessedBeliefs.length >= 2) {
    const finalActStart267 = Math.floor(records.length * 0.75);
    const earlyRevelations267 = witnessedBeliefs.filter(w => w.sceneIdx < finalActStart267);
    if (earlyRevelations267.length === 0) {
      issues.push({
        location: `Final quarter only (scene ${finalActStart267}+)`,
        rule: 'REVELATION_FINAL_ACT_ONLY',
        severity: 'minor',
        description: `All ${witnessedBeliefs.length} witnessed revelations are confined to the final quarter (scene ${finalActStart267}+). No earlier scene reveals a truth — every moment of discovery is deferred to the end. Acts 1 through 3a feel like setup without payoff, and the climax becomes overloaded with back-to-back discoveries the audience has no time to process.`,
        suggestedFix: 'Distribute at least one discovery earlier — a partial truth revealed mid-story raises the stakes for everything that follows and gives the climax room to breathe. A revelation in Act 2 creates a new problem; a revelation saved for Act 4 only closes an existing one.',
      });
    }
  }

  // ── Wave 267: TOLD_BELIEF_CLUSTERING ──────────────────────────────────────
  // A single scene contains 3 or more distinct told beliefs — multiple
  // characters asserting multiple propositions in the same scene. The scene
  // becomes a belief-dump: the audience is handed several competing or
  // reinforcing assertions at once, with no room to process any of them.
  // Each told belief needs space to register; packing three into one scene
  // dilutes each. Distinct from EXPOSITION_DUMP (consecutive told-only scenes)
  // and SINGLE_SCENE_BELIEF_OVERLOAD (5+ assertions); this catches the
  // 3–4 assertion range before the more severe threshold.
  // Requires 6+ records and 3+ told beliefs.
  if (records.length >= 6 && toldBeliefs.length >= 3) {
    const byScene267 = new Map<number, number>();
    for (const t of toldBeliefs) {
      byScene267.set(t.sceneIdx, (byScene267.get(t.sceneIdx) ?? 0) + 1);
    }
    for (const [sceneIdx267, count267] of byScene267) {
      if (count267 >= 3 && count267 < 5) {
        const slug267 = toldBeliefs.find(t => t.sceneIdx === sceneIdx267)?.slug ?? `scene ${sceneIdx267}`;
        issues.push({
          location: `Scene ${sceneIdx267} (${slug267})`,
          rule: 'TOLD_BELIEF_CLUSTERING',
          severity: 'minor',
          description: `Scene ${sceneIdx267} (${slug267}) contains ${count267} separate told beliefs — ${count267} distinct propositions asserted in the same scene. The scene becomes a belief-dump: the audience cannot process each claim before the next arrives, and none of the assertions carry the dramatic weight they need.`,
          suggestedFix: 'Distribute the beliefs across separate scenes. One scene, one central assertion — let each claim land and drive character behaviour before the next is introduced. Reserve multi-belief scenes for deliberate moments of information overload.',
        });
        break;
      }
    }
  }

  // ── Wave 281: Revelation drama vacuum, Act 2b void, told belief final scene ───

  // REVELATION_DRAMA_VACUUM (minor, n≥8, ≥2 revelations): None of the witnessed
  // revelations occurs in a scene with high suspense (suspenseDelta > 1) or a
  // non-neutral emotional shift. Every truth is revealed in a flat, inert scene —
  // the discovery carries no dramatic heat. Revelations land with maximum impact
  // when the audience is already emotionally activated; a truth dropped into a
  // calm, neutral scene fails to reverberate. Distinct from REVELATION_ISOLATED
  // (no dialogue) and REVELATION_AFTERMATH_ABSENT (no consequence downstream).
  if (records.length >= 8 && witnessedBeliefs.length >= 2) {
    const anyDramaticReveal281 = witnessedBeliefs.some(w => {
      const r = records.find(rec => rec.sceneIdx === w.sceneIdx);
      return r && (r.suspenseDelta > 1 || r.emotionalShift !== 'neutral');
    });
    if (!anyDramaticReveal281) {
      issues.push({
        location: 'Revelation scenes',
        rule: 'REVELATION_DRAMA_VACUUM',
        severity: 'minor',
        description: `${witnessedBeliefs.length} witnessed revelation(s) occur across the story but none land in a scene with rising suspense (suspenseDelta > 1) or non-neutral emotional charge — every truth is revealed in a flat, inert scene. Revelations deliver maximum impact when they arrive at moments of dramatic heat; a truth discovered in an emotionally inert scene fails to reverberate.`,
        suggestedFix: 'Move at least one revelation into a scene of dramatic heat — a moment of rising suspense, emotional crisis, or direct confrontation. The audience registers a truth more deeply when they are already emotionally activated at the moment of discovery.',
      });
    }
  }

  // BELIEF_ACT2B_VOID (minor, n≥8, ≥2 Act 2b scenes): Act 2b (50%–75% of the
  // story) contains no told beliefs and no witnessed revelations. The escalation
  // zone is informationally inert. Act 2b is where the protagonist should be
  // learning and asserting their way toward the climax, with the story's tension
  // tightening through competing claims and newly discovered truths. A void of
  // belief content in Act 2b signals a structural information vacuum at precisely
  // the moment where dramatic momentum should be building. Distinct from
  // BELIEF_MIDPOINT_VOID (40%–60%): this covers the later escalation phase.
  if (records.length >= 8) {
    const act2bStart281 = Math.floor(records.length * 0.5);
    const act2bEnd281 = Math.floor(records.length * 0.75);
    const act2bRecs281 = records.slice(act2bStart281, act2bEnd281);
    if (act2bRecs281.length >= 2) {
      const hasAct2bBelief281 = act2bRecs281.some(r =>
        r.dialogueHighlights.length > 0 || r.revelation !== null,
      );
      if (!hasAct2bBelief281) {
        issues.push({
          location: `Act 2b (Scenes ${act2bStart281}–${act2bEnd281 - 1})`,
          rule: 'BELIEF_ACT2B_VOID',
          severity: 'minor',
          description: `Act 2b (Scenes ${act2bStart281}–${act2bEnd281 - 1}) contains no told beliefs and no witnessed revelations — the story's escalation zone is informationally inert. Characters should be learning and asserting toward the climax; a belief void in Act 2b means the story coasts through its own build phase with no information exchange.`,
          suggestedFix: 'Plant at least one belief beat in Act 2b: a character asserts a key proposition that will be tested in the climax, or a partial revelation narrows the audience\'s uncertainty. Act 2b is where the story\'s informational tension should be at its tightest before the final break.',
        });
      }
    }
  }

  // TOLD_BELIEF_FINAL_SCENE (minor, n≥5): The final scene contains a character
  // assertion (told belief with 4+ words) but no witnessed revelation. A story
  // whose last word is an unresolved assertion leaves the audience holding an open
  // proposition — the closing scene ends on a claim that is never witnessed as true.
  // Final scenes should close on demonstrated truth (witnessed) rather than asserted
  // truth (claimed). Distinct from BELIEF_RESOLUTION_ABSENT (no revelations in
  // final 20%): this fires even when there is exactly one told belief in the finale.
  if (records.length >= 5) {
    const finalRec281 = records[records.length - 1];
    const finalHasToldBelief281 = finalRec281.dialogueHighlights.some((h: string) => {
      const colonIdx = h.indexOf(':');
      return colonIdx > -1 && h.slice(colonIdx + 1).trim().split(/\s+/).length >= 4;
    });
    if (finalHasToldBelief281 && finalRec281.revelation === null) {
      issues.push({
        location: `Scene ${finalRec281.sceneIdx} (${finalRec281.slug}) — final scene`,
        rule: 'TOLD_BELIEF_FINAL_SCENE',
        severity: 'minor',
        description: `The final scene contains a character assertion (told belief) with no accompanying revelation — the story ends with an unverified claim. The last word the story speaks to the audience is a character asserting something that is never shown to be true; the story closes on a proposition rather than a truth.`,
        suggestedFix: 'Either add a witnessed revelation to the final scene that confirms or contradicts the assertion, or move the told belief earlier and let the closing scene demonstrate truth through action or direct discovery. A story ends most satisfyingly when its final truth is shown, not claimed.',
      });
    }
  }

  // ── Wave 295: REVELATION_SUSPENSE_DECOUPLED ───────────────────────────────
  // Revelation scenes (witnessedBeliefs) have an average suspenseDelta ≤ 0.
  // Discoveries should generate tension — the moment of unmasking should raise
  // stakes rather than lowering them. A revelation that arrives without suspense
  // is a plot point, not a dramatic event: it informs without transforming.
  // Requires 8+ records and 3+ revelations with suspenseDelta data.
  if (records.length >= 8 && witnessedBeliefs.length >= 3) {
    const revSuspScenes295 = witnessedBeliefs
      .map(w => records.find((r: any) => r.sceneIdx === w.sceneIdx))
      .filter(Boolean);
    if (revSuspScenes295.length >= 3) {
      const avgRevSusp295 = revSuspScenes295.reduce((acc: number, r: any) => acc + (r.suspenseDelta ?? 0), 0) / revSuspScenes295.length;
      if (avgRevSusp295 <= 0) {
        issues.push({
          location: 'Revelation scenes — suspense decoupled',
          rule: 'REVELATION_SUSPENSE_DECOUPLED',
          severity: 'minor',
          description: `${revSuspScenes295.length} revelation scene(s) have an average suspenseDelta of ${avgRevSusp295.toFixed(2)} — discoveries arrive without generating tension. A revelation that doesn't raise stakes is a fact delivered by the plot, not a dramatic event experienced by the audience. Discoveries should reframe everything and make the next action more urgent, not less.`,
          suggestedFix: 'Stage each revelation so that what it reveals raises the cost of the next action: the truth uncovered should make an upcoming decision harder, not easier. If discovering the killer makes the protagonist safer, the revelation has no dramatic tension; if it puts someone they love at risk, it does.',
        });
      }
    }
  }

  // ── Wave 295: REVELATION_DENSITY_DROP ────────────────────────────────────
  // The second half of the story has fewer revelations than the first half,
  // despite 3+ total revelations. The story front-loads its information drama
  // and coasts to the finish. Discoveries should escalate toward the climax —
  // the revelation density should increase or remain consistent as the story
  // approaches its resolution, not drop off. Requires 8+ records and 3+
  // revelations total.
  if (records.length >= 8 && witnessedBeliefs.length >= 3) {
    const half295 = Math.floor(records.length / 2);
    const firstHalfRevs295 = witnessedBeliefs.filter(w => w.sceneIdx < half295).length;
    const secondHalfRevs295 = witnessedBeliefs.filter(w => w.sceneIdx >= half295).length;
    if (firstHalfRevs295 > secondHalfRevs295 && secondHalfRevs295 < firstHalfRevs295 * 0.5) {
      issues.push({
        location: 'Revelation distribution',
        rule: 'REVELATION_DENSITY_DROP',
        severity: 'minor',
        description: `${firstHalfRevs295} revelation(s) occur in the first half vs. only ${secondHalfRevs295} in the second half — discovery density drops more than 50% after the midpoint. The story front-loads its information drama and coasts toward the climax with a depleted discovery engine.`,
        suggestedFix: 'Redistribute revelations to escalate in density toward the climax: the second half of the story should deliver more discoveries than the first, not fewer. Reserve the two or three most significant revelations for Act 2b and Act 3 — the story\'s information crescendo should peak at or just before the climax.',
      });
    }
  }

  // ── Wave 295: BELIEF_OPENING_INERT ────────────────────────────────────────
  // The first 25% of the story has neither told beliefs (dialogueHighlights)
  // nor witnessed revelations. The opening act is informationally inert —
  // no character claims anything and no truth is discovered. An opening
  // without belief content fails to establish the epistemic stakes: the
  // audience has no proposition to hold or doubt entering Act 2. Requires
  // 8+ records and at least 1 told belief or revelation anywhere else in
  // the story.
  if (records.length >= 8) {
    const opening295End = Math.floor(records.length * 0.25);
    const openingHasBeliefs295 = records.slice(0, opening295End).some((r: any) =>
      r.dialogueHighlights.length > 0 || r.revelation !== null,
    );
    if (!openingHasBeliefs295) {
      const restHasBeliefs295 = records.slice(opening295End).some((r: any) =>
        r.dialogueHighlights.length > 0 || r.revelation !== null,
      );
      if (restHasBeliefs295) {
        issues.push({
          location: `Opening 25% (Scenes 0–${opening295End - 1}) — no belief content`,
          rule: 'BELIEF_OPENING_INERT',
          severity: 'minor',
          description: `The opening (Scenes 0–${opening295End - 1}) contains no told beliefs and no revelations — the first act is informationally inert. The audience enters Act 2 with no proposition to hold or doubt, no claim to be suspicious of, and no discovery to process. An opening that establishes no epistemic stakes leaves the belief layer empty when the complications begin.`,
          suggestedFix: 'Plant at least one belief beat in the opening: a character makes a claim that will later be tested, a secret is hinted at, or a small discovery seeds a question the story will answer. The opening should leave the audience holding at least one unverified proposition — something to believe or disbelieve entering Act 2.',
        });
      }
    }
  }

  // ── Wave 309: TOLD_BELIEF_DROUGHT ─────────────────────────────────────────
  // Five or more consecutive scenes contain neither a told belief nor a
  // revelation — the belief/deception layer goes completely silent for a long
  // stretch. Nobody asserts anything and nothing is discovered: the epistemic
  // engine idles. Distinct from EXPOSITION_DUMP (the inverse — too many
  // consecutive told-only scenes) and the zone-specific voids (MIDPOINT_VOID,
  // ACT2B_VOID, OPENING_INERT): this catches a belief-silent run anywhere.
  // Requires 10+ records.
  if (records.length >= 10) {
    let run309 = 0;
    let runStart309 = 0;
    let maxRun309 = 0;
    let maxStart309 = 0;
    for (let i309 = 0; i309 < records.length; i309++) {
      const r309: any = records[i309];
      if (r309.dialogueHighlights.length === 0 && r309.revelation === null) {
        if (run309 === 0) runStart309 = i309;
        run309++;
        if (run309 > maxRun309) { maxRun309 = run309; maxStart309 = runStart309; }
      } else {
        run309 = 0;
      }
    }
    if (maxRun309 >= 5) {
      issues.push({
        location: `Scenes ${maxStart309}–${maxStart309 + maxRun309 - 1} — belief layer silent`,
        rule: 'TOLD_BELIEF_DROUGHT',
        severity: 'minor',
        description: `${maxRun309} consecutive scenes (${maxStart309}–${maxStart309 + maxRun309 - 1}) contain no told beliefs and no revelations — the belief/deception layer goes completely silent. For this stretch no character asserts anything that could be tested and nothing is discovered; the epistemic engine that drives dramatic irony and surprise simply idles.`,
        suggestedFix: 'Seed the silent stretch with belief activity: a character voicing a conviction the story will later test, a partial discovery that narrows the audience\'s uncertainty, or a lie planted for a future unmasking. Every long scene-run should advance what someone believes or what the audience knows.',
      });
    }
  }

  // ── Wave 309: ASSERTION_VOID ──────────────────────────────────────────────
  // The story delivers four or more revelations but contains at most one told
  // belief — truths are discovered, but no character ever asserts a claim that
  // a revelation could overturn. Without assertions there is no dramatic irony
  // setup: every revelation lands as raw information rather than as a reversal
  // of something a character (and the audience) believed. The inverse of
  // TOLD_BELIEF_DOMINATION (>70% tell). Requires 8+ records.
  if (records.length >= 8 && witnessedBeliefs.length >= 4 && toldBeliefs.length <= 1) {
    issues.push({
      location: 'Belief/revelation layer',
      rule: 'ASSERTION_VOID',
      severity: 'minor',
      description: `The story delivers ${witnessedBeliefs.length} revelations but only ${toldBeliefs.length} told belief(s) — truths are discovered, but almost no character ever asserts a claim a revelation could overturn. Without assertions there is no dramatic irony to invert: each revelation arrives as raw information instead of as the reversal of something a character was sure of.`,
      suggestedFix: 'Plant assertions ahead of the discoveries: have characters state what they believe — confidently and wrongly — so that later revelations land as reversals. A revelation is only a reversal if someone first committed to the opposite; assertions are the setup that gives discoveries their charge.',
    });
  }

  // ── Wave 309: REVELATION_LATE_FIRST ───────────────────────────────────────
  // The story has 2+ revelations but the FIRST one does not arrive until past
  // the midpoint, while the first half already carries 2+ told beliefs. The
  // epistemic layer is active early (characters assert) but the story confirms
  // or overturns nothing until the back half — the audience holds claims for a
  // long time with no payoff. Distinct from REVELATION_ACT2A_DESERT (25–50%
  // zone), REVELATION_BACK_WEIGHTED (≥80% in final quarter), and REVELATION_
  // FINAL_ACT_ONLY: this audits the onset of the FIRST revelation. Requires
  // 8+ records.
  if (records.length >= 8 && witnessedBeliefs.length >= 2) {
    const midIdx309 = Math.floor(records.length * 0.5);
    const firstRevIdx309 = Math.min(...witnessedBeliefs.map(w => w.sceneIdx));
    const firstHalfTold309 = toldBeliefs.filter(t => t.sceneIdx < midIdx309).length;
    if (firstRevIdx309 >= midIdx309 && firstHalfTold309 >= 2) {
      issues.push({
        location: `First revelation at Scene ${firstRevIdx309} (past midpoint ${midIdx309})`,
        rule: 'REVELATION_LATE_FIRST',
        severity: 'minor',
        description: `The first revelation does not arrive until Scene ${firstRevIdx309} — past the midpoint — even though the first half already carries ${firstHalfTold309} told beliefs. The epistemic layer is active early (characters assert) but the story confirms or overturns nothing until the back half, so the audience holds those claims for a long time with no payoff to reward their attention.`,
        suggestedFix: 'Deliver a revelation in the first half that pays off one of the early assertions — a partial truth, a small unmasking, a confirmation that reframes what came before. An early first revelation teaches the audience that the claims they are tracking will pay off, which keeps them invested.',
      });
    }
  }

  // ── Wave 323: REVELATION_CURIOSITY_DECOUPLED, TOLD_BELIEF_CURIOSITY_FLAT, TOLD_BELIEF_RELATIONSHIP_DECOUPLED ──

  // REVELATION_CURIOSITY_DECOUPLED (minor, n≥8, ≥3 revelations): Revelation
  // scenes have an average curiosityDelta ≤ 0. A revelation should answer one
  // question while opening another — it should leave the audience MORE curious,
  // not less. When discoveries land without raising fresh curiosity, the
  // epistemic engine closes loops without ever reopening them, and the story
  // deflates toward its ending. Distinct from REVELATION_SUSPENSE_DECOUPLED
  // (suspenseDelta channel) and REVELATION_DRAMA_VACUUM (emotionalShift).
  if (records.length >= 8) {
    const revScenes323 = (records as any[]).filter(r => r.revelation !== null);
    if (revScenes323.length >= 3) {
      const avgRevCur323 = revScenes323.reduce((s, r) => s + (r.curiosityDelta ?? 0), 0) / revScenes323.length;
      if (avgRevCur323 <= 0) {
        issues.push({
          location: 'Revelation scenes — curiosity register',
          rule: 'REVELATION_CURIOSITY_DECOUPLED',
          severity: 'minor',
          description: `${revScenes323.length} revelation scenes average a curiosityDelta of ${avgRevCur323.toFixed(2)} — discoveries arrive without raising fresh curiosity. A revelation should answer one question while opening another; when every discovery only closes loops, the story's mystery engine winds down toward the ending instead of accelerating. The audience gets answers but loses the hunger that made them want the answers.`,
          suggestedFix: 'Let each revelation reopen the field: the truth that answers one question should complicate or raise another. A discovery that lands with "but then why...?" keeps the audience leaning forward; a discovery that merely confirms closes a door without opening one.',
        });
      }
    }
  }

  // TOLD_BELIEF_CURIOSITY_FLAT (minor, n≥8, ≥3 told-belief scenes): Scenes where
  // a character asserts a belief have an average curiosityDelta ≤ 0. An
  // assertion — especially a confident or contestable one — should make the
  // audience wonder whether it is true. When told beliefs never spike curiosity,
  // the claims register as flat exposition rather than as questions the story
  // will test. Distinct from TOLD_BELIEF_DOMINATION (tell/show ratio) and
  // EXPOSITION_DUMP (consecutive told-only run): this audits the curiosity
  // channel on assertion scenes.
  if (records.length >= 8) {
    const toldScenes323 = (records as any[]).filter(r => ((r.dialogueHighlights ?? []) as string[]).some(h => h.includes(':')));
    if (toldScenes323.length >= 3) {
      const avgToldCur323 = toldScenes323.reduce((s, r) => s + (r.curiosityDelta ?? 0), 0) / toldScenes323.length;
      if (avgToldCur323 <= 0) {
        issues.push({
          location: 'Told-belief scenes — curiosity register',
          rule: 'TOLD_BELIEF_CURIOSITY_FLAT',
          severity: 'minor',
          description: `${toldScenes323.length} scenes where a character asserts a belief average a curiosityDelta of ${avgToldCur323.toFixed(2)} — assertions arrive without making the audience wonder whether they are true. A claim that provokes no curiosity is flat exposition; the audience files it as fact rather than holding it as a question the story might overturn. Assertions earn their place by being doubtable.`,
          suggestedFix: 'Frame assertions so the audience can question them: give the claim a tell that hints it might be wrong (an evasive delivery, a contradicting detail in the frame, another character\'s skeptical reaction). A belief stated against a flicker of doubt becomes a question the audience wants answered.',
        });
      }
    }
  }

  // TOLD_BELIEF_RELATIONSHIP_DECOUPLED (minor, n≥8, ≥3 told-belief scenes): No
  // scene that contains a told belief also carries a relationship shift. Beliefs
  // — and especially deceptions — are relational acts: to assert, to lie, to
  // confess is to act on someone. When assertion scenes never move a
  // relationship, the belief layer floats free of the character bonds it should
  // be straining or strengthening. Distinct from BELIEF_ISOLATION (a belief
  // never expressed) and SOLE_ASSERTER (one character dominates assertions):
  // this audits whether assertions ever land relationally.
  if (records.length >= 8) {
    const toldScenes323r = (records as any[]).filter(r => ((r.dialogueHighlights ?? []) as string[]).some(h => h.includes(':')));
    if (toldScenes323r.length >= 3) {
      const anyRelShift323 = toldScenes323r.some(r => ((r.relationshipShifts ?? []) as any[]).length > 0);
      if (!anyRelShift323) {
        issues.push({
          location: 'Told-belief scenes — relational impact',
          rule: 'TOLD_BELIEF_RELATIONSHIP_DECOUPLED',
          severity: 'minor',
          description: `None of the ${toldScenes323r.length} scenes containing a told belief also carries a relationship shift — assertions never move a bond. Beliefs are relational acts: to assert, to lie, to confess is to act on another person. When the belief layer never touches the relationship layer, claims float free of the character dynamics they should be straining, deepening, or betraying.`,
          suggestedFix: 'Let assertions land on relationships: a confident claim should impress, alienate, or provoke whoever hears it; a lie should quietly damage the bond with the person deceived. Tie at least some belief beats to a measurable shift in trust or power so the epistemic layer drives the relational one.',
        });
      }
    }
  }

  // ── Wave 334: TOLD_BELIEF_SUSPENSE_DECOUPLED, TOLD_BELIEF_EMOTIONAL_FLATLINE, REVELATION_RELATIONSHIP_DECOUPLED ──

  // TOLD_BELIEF_SUSPENSE_DECOUPLED (minor, n≥8, ≥3 assertion scenes): Scenes
  // where a character asserts a belief average suspenseDelta ≤ 0. Claims that
  // arrive without generating tension register as flat exposition — the audience
  // files the assertion rather than feeling the stakes of whether it is true.
  // A contestable belief should make the audience tense: if wrong, someone will
  // pay for it. Distinct from TOLD_BELIEF_CURIOSITY_FLAT (curiosityDelta, Wave 323)
  // and REVELATION_SUSPENSE_DECOUPLED (revelation scenes, not assertion scenes).
  if (records.length >= 8) {
    const toldScenes334 = (records as any[]).filter(r =>
      ((r.dialogueHighlights ?? []) as string[]).some(h => h.includes(':')),
    );
    if (toldScenes334.length >= 3) {
      const avgSusp334 = toldScenes334.reduce((s: number, r: any) => s + (r.suspenseDelta ?? 0), 0) / toldScenes334.length;
      if (avgSusp334 <= 0) {
        issues.push({
          location: 'Told-belief scenes — tension register',
          rule: 'TOLD_BELIEF_SUSPENSE_DECOUPLED',
          severity: 'minor',
          description: `${toldScenes334.length} scenes where a character asserts a belief average a suspenseDelta of ${avgSusp334.toFixed(2)} — claims arrive without generating tension. A contestable belief should make the audience feel the stakes of whether it is true; when assertions are accompanied by zero tension, they land as fact rather than as propositions the story will test. The audience files the claim rather than leaning forward to see if it holds.`,
          suggestedFix: 'Frame assertions so the stakes of being wrong are visible: let the claim be made under pressure, over a disagreement, or in a context where the cost of error is immediately apparent. An assertion made in a tense scene is a gamble; one made in a flat scene is exposition.',
        });
      }
    }
  }

  // TOLD_BELIEF_EMOTIONAL_FLATLINE (minor, n≥8, ≥3 assertion scenes): All
  // scenes where a character asserts a belief are emotionally neutral. Claims
  // carry no emotional charge — the belief layer operates as information
  // delivery rather than as an emotional register. Characters state things
  // they feel strongly about with no feeling; the audience registers the
  // content but not the conviction behind it. Distinct from TOLD_BELIEF_CURIOSITY_FLAT
  // (curiosity channel, Wave 323), REVELATION_DRAMA_VACUUM (revelation scenes,
  // checks BOTH emotion and suspense), TOLD_BELIEF_SUSPENSE_DECOUPLED (suspense
  // channel, not emotional shift).
  if (records.length >= 8) {
    const toldScenes334e = (records as any[]).filter(r =>
      ((r.dialogueHighlights ?? []) as string[]).some(h => h.includes(':')),
    );
    if (toldScenes334e.length >= 3 && toldScenes334e.every(r => r.emotionalShift === 'neutral')) {
      issues.push({
        location: 'Told-belief scenes — emotional register',
        rule: 'TOLD_BELIEF_EMOTIONAL_FLATLINE',
        severity: 'minor',
        description: `All ${toldScenes334e.length} scenes where a character asserts a belief are emotionally neutral — claims carry no emotional charge. Characters state things they believe (or pretend to believe) with the affect of delivering a weather report. The audience registers the content but not the conviction; told beliefs that land in flat emotional scenes feel like database entries rather than live commitments.`,
        suggestedFix: 'Give assertions emotional weight: a character stating what they believe should do so from a position of feeling. Conviction, fear of being wrong, pride in being right, or dread of the consequence if the claim is false — the emotional register around an assertion signals how much it matters to the character, and therefore how much it matters to the audience.',
      });
    }
  }

  // REVELATION_RELATIONSHIP_DECOUPLED (minor, n≥8, ≥2 revelation scenes): No
  // scene containing a revelation also contains a relationship shift. When
  // discoveries never alter how characters relate to each other, the story's
  // information events operate independently of its relational world — truth
  // is revealed but bonds are unaffected. In most stories, revelations reframe
  // relationships: the truth about who someone is changes how we trust them.
  // Distinct from TOLD_BELIEF_RELATIONSHIP_DECOUPLED (Wave 323: assertion scenes,
  // not revelation scenes) and REVELATION_DRAMA_VACUUM (emotional + suspense,
  // not relationship shifts).
  if (records.length >= 8) {
    const revScenes334 = (records as any[]).filter(r => r.revelation !== null && r.revelation !== undefined && r.revelation !== '');
    if (revScenes334.length >= 2) {
      const anyRevRelShift334 = revScenes334.some(r => ((r.relationshipShifts ?? []) as any[]).length > 0);
      if (!anyRevRelShift334) {
        issues.push({
          location: 'Revelation scenes — relational impact',
          rule: 'REVELATION_RELATIONSHIP_DECOUPLED',
          severity: 'minor',
          description: `None of the ${revScenes334.length} revelation scene(s) also carries a relationship shift — discoveries never alter how characters relate to one another. In most stories, revelations reframe relationships: the truth about who someone is, or what they did, changes trust, loyalty, or affection. When all revelations are relational non-events, the story's information layer operates independently of its human bonds.`,
          suggestedFix: 'Let at least one revelation land on a relationship: the truth uncovered should shift the trust between the character who learned it and someone else. A secret revealed should either rupture a bond (if the truth was a betrayal) or strengthen one (if the truth was a shared burden) — discoveries that leave all relationships unchanged fail their dramatic function.',
        });
      }
    }
  }

  // ── Wave 348: REVELATION_ASSERTION_DISCONNECT, REVELATION_MIDPOINT_VOID, TOLD_BELIEF_DRAMATIC_TURN_DECOUPLED ──

  // REVELATION_ASSERTION_DISCONNECT (minor, n≥8, ≥2 revelations, ≥2 assertions): The
  // story contains both told beliefs (assertions) and witnessed revelations, but not one
  // revelation lands in the same scene as — or within the two scenes after — a prior
  // assertion. The dramatic-irony engine is never engaged: a character asserts X, then
  // the story reveals not-X, and the audience feels the floor drop out. When revelations
  // never follow assertions, the two systems run on separate tracks — claims are made and
  // truths are uncovered, but no truth ever overturns a claim. Distinct from BELIEF_
  // ASYMMETRY (a count imbalance — many revelations, almost no assertions) and BELIEF_
  // REVERSAL_UNSUPPORTED (a belief flip lacking cause): this audits the sequencing of
  // assertion → revelation.
  if (records.length >= 8) {
    const assertionIdxs348 = new Set<number>(toldBeliefs.map(t => t.sceneIdx));
    const revelationIdxs348 = witnessedBeliefs.map(w => w.sceneIdx);
    if (assertionIdxs348.size >= 2 && revelationIdxs348.length >= 2) {
      const anyRevFollowsAssertion348 = revelationIdxs348.some(ri =>
        assertionIdxs348.has(ri) || assertionIdxs348.has(ri - 1) || assertionIdxs348.has(ri - 2),
      );
      if (!anyRevFollowsAssertion348) {
        issues.push({
          location: 'Assertion → revelation sequencing',
          rule: 'REVELATION_ASSERTION_DISCONNECT',
          severity: 'minor',
          description: `The story has ${assertionIdxs348.size} assertion scene(s) and ${revelationIdxs348.length} revelation(s), but no revelation lands in or within two scenes of a prior assertion — the dramatic-irony engine is never engaged. Claims are made and truths are uncovered, but no truth ever directly overturns a claim, so the audience never gets the payoff of watching a character's certainty collapse. Assertions and revelations run on separate tracks.`,
          suggestedFix: 'Sequence at least one revelation to land right after an assertion it overturns: let a character commit to a belief, then have the story reveal — soon and pointedly — that they were wrong. The gap between what a character is sure of and what is true is where dramatic irony lives; close that gap by putting the revelation in striking distance of the claim.',
        });
      }
    }
  }

  // REVELATION_MIDPOINT_VOID (minor, n≥8, ≥2 revelations): The midpoint zone (40%–60%)
  // contains no revelation, even though the story delivers two or more revelations
  // elsewhere. The structural midpoint is canonically where a major revelation turns the
  // story — recasting the goal, raising the stakes, or flipping the protagonist's
  // understanding. When revelations cluster before and after but skip the center, the
  // story's pivot lands without the discovery that should power it. Distinct from BELIEF_
  // MIDPOINT_VOID (fires when the midpoint has NO belief activity of any kind — told or
  // witnessed; this fires specifically when revelations exist but avoid the midpoint, even
  // if assertions are present there) and from REVELATION_DELAYED / REVELATION_LATE_FIRST
  // (timing of the first revelation, not the midpoint specifically).
  if (records.length >= 8 && witnessedBeliefs.length >= 2) {
    const midStart348 = Math.floor(records.length * 0.4);
    const midEnd348 = Math.floor(records.length * 0.6);
    const hasMidRevelation348 = witnessedBeliefs.some(w => w.sceneIdx >= midStart348 && w.sceneIdx < midEnd348);
    if (!hasMidRevelation348) {
      issues.push({
        location: `Midpoint zone (Scenes ${midStart348}–${midEnd348 - 1}) — no revelation`,
        rule: 'REVELATION_MIDPOINT_VOID',
        severity: 'minor',
        description: `The midpoint zone (Scenes ${midStart348}–${midEnd348 - 1}) contains no revelation, though the story delivers ${witnessedBeliefs.length} revelations elsewhere. The structural midpoint is where a major discovery should turn the story — recasting the goal, raising the stakes, or flipping the protagonist's understanding. When revelations cluster around the center but skip it, the pivot lands without the discovery that should power it, and the story's middle sags.`,
        suggestedFix: 'Place a significant revelation at the midpoint: the truth that reframes what the protagonist is really up against, or the discovery that raises the cost of failure. The midpoint reversal is most powerful when it turns on something newly learned — let the center of the story be where the audience and the protagonist learn the thing that changes everything.',
      });
    }
  }

  // TOLD_BELIEF_DRAMATIC_TURN_DECOUPLED (minor, n≥8, ≥3 assertion scenes): No scene in
  // which a character asserts a belief also carries a dramatic turn. The moments a
  // character commits to a claim never coincide with a story pivot, so assertions read as
  // inert background rather than as stances taken at consequential moments. A belief
  // declared at a turning point — a vow made as everything changes, a conviction stated
  // just as it is about to be tested — carries dramatic weight that an offhand assertion
  // does not. Completes the told-belief channel set with TOLD_BELIEF_SUSPENSE_DECOUPLED,
  // TOLD_BELIEF_EMOTIONAL_FLATLINE, TOLD_BELIEF_CURIOSITY_FLAT, and TOLD_BELIEF_
  // RELATIONSHIP_DECOUPLED; distinct from PAYOFF/CONFLICT/THEME dramatic-turn checks
  // (different scene populations).
  if (records.length >= 8) {
    const toldScenes348 = (records as any[]).filter(r =>
      ((r.dialogueHighlights ?? []) as string[]).some(h => h.includes(':')),
    );
    if (toldScenes348.length >= 3 && !toldScenes348.some(r => (r.dramaticTurn ?? 'nothing') !== 'nothing')) {
      issues.push({
        location: 'Told-belief scenes — dramatic pivot',
        rule: 'TOLD_BELIEF_DRAMATIC_TURN_DECOUPLED',
        severity: 'minor',
        description: `None of the ${toldScenes348.length} scenes where a character asserts a belief carries a dramatic turn — the moments characters commit to claims never coincide with a story pivot. Assertions land as inert background rather than as stances taken at consequential moments. A belief declared at a turning point carries weight an offhand assertion lacks; here the belief layer and the turning-point layer never meet.`,
        suggestedFix: 'Tie at least one assertion to a dramatic turn: let a character state their conviction at the moment the story reverses — a vow made as the situation flips, a certainty declared just before it is tested. An assertion made at a pivot becomes a stake the turn can pay off; one made in a flat scene is just dialogue.',
      });
    }
  }

  // ── Wave 362: REVELATION_CLOCK_DECOUPLED, TOLD_BELIEF_ACT3_ABSENT, REVELATION_CURIOSITY_PEAK_ABSENT ──

  // REVELATION_CLOCK_DECOUPLED (minor, n≥8, ≥2 revelations, ≥2 clock scenes): No
  // scene that carries a revelation also has clockRaised=true, even though the story
  // has both. The urgency engine and the truth-revealing engine never meet — discoveries
  // never arrive under deadline pressure, and deadlines never force a disclosure. When
  // time pressure and revelation are permanently decoupled, neither carries the full
  // weight it could: the revelation lands without urgency, and the clock ticks without
  // informational content. Distinct from REVELATION_SUSPENSE_DECOUPLED (avg suspenseDelta
  // of revelation scenes; this checks the clockRaised field specifically) and TOLD_
  // BELIEF_SUSPENSE_DECOUPLED (assertions, not revelations).
  if (records.length >= 8) {
    const revSet362 = new Set(witnessedBeliefs.map(w => w.sceneIdx));
    const clockScenes362 = (records as any[]).filter(r => r.clockRaised === true);
    if (revSet362.size >= 2 && clockScenes362.length >= 2) {
      const anyRevClock362 = clockScenes362.some(r => revSet362.has(r.sceneIdx));
      if (!anyRevClock362) {
        issues.push({
          location: 'Revelation × clock scenes — decoupled',
          rule: 'REVELATION_CLOCK_DECOUPLED',
          severity: 'minor',
          description: `${revSet362.size} revelation scene(s) and ${clockScenes362.length} clock-raised scenes share no overlap — the urgency engine and the discovery engine never meet. Discoveries that arrive without deadline pressure feel academic; deadlines that pass without disclosure feel mechanical. The most powerful revelations in drama land when time is running out and the truth can no longer be withheld.`,
          suggestedFix: 'Let at least one revelation arrive under deadline pressure: a truth disclosed because time has run out, a discovery that makes the clock suddenly more threatening. The intersection of "what does the character now know?" and "how much time do they have left?" is one of the most potent structural combinations in storytelling.',
        });
      }
    }
  }

  // TOLD_BELIEF_ACT3_ABSENT (minor, n≥10, ≥3 assertion scenes in Acts 1-2): No
  // assertion scene falls in Act 3 (the final 25% of scenes), even though characters
  // asserted beliefs throughout Acts 1 and 2. The finale contains no moments where
  // anyone commits to a position — beliefs are stated and tested during the rising
  // action, but the climax and resolution are delivered without anyone declaring what
  // they believe. An Act 3 without assertions means the ending resolves plot without
  // resolving the story's belief conflicts. Distinct from TOLD_BELIEF_FINAL_SCENE (last
  // scene only), TOLD_BELIEF_ACT3_SURGE (too many in Act 3 — opposite direction), and
  // BELIEF_FRONT_LOADED (assertions only in first half — this is specifically Act 3).
  if (records.length >= 10) {
    const act3Start362 = Math.floor(records.length * 0.75);
    const act3SceneIdxs362 = new Set((records as any[]).slice(act3Start362).map((r: any) => r.sceneIdx));
    const act12Assertions362 = toldBeliefs.filter(t => !act3SceneIdxs362.has(t.sceneIdx));
    const act3Assertions362 = toldBeliefs.filter(t => act3SceneIdxs362.has(t.sceneIdx));
    if (act12Assertions362.length >= 3 && act3Assertions362.length === 0) {
      issues.push({
        location: `Act 3 (from Scene ${(records as any[])[act3Start362].sceneIdx}) — no assertions`,
        rule: 'TOLD_BELIEF_ACT3_ABSENT',
        severity: 'minor',
        description: `${act12Assertions362.length} assertion(s) land in Acts 1–2 but none in Act 3 — the finale contains no moments where any character commits to a position or declares what they believe. The story tests and challenges beliefs through Acts 1 and 2, then resolves without anyone stating what they now hold to be true. An Act 3 without assertions means the ending resolves the plot but leaves the story's belief conflicts unresolved.`,
        suggestedFix: "Place at least one assertion in Act 3: a character stating what they have learned, what they still believe despite everything, or what they now reject. The climax is where beliefs are confirmed or destroyed — let a character speak the outcome of what the story's belief layer has been arguing.",
      });
    }
  }

  // REVELATION_CURIOSITY_PEAK_ABSENT (minor, n≥8, ≥2 curious revelation scenes): The
  // scene with the highest curiosityDelta has no revelation, even though at least 2 other
  // curiosity-positive scenes (curiosityDelta > 0) do carry revelations. The peak curiosity
  // moment — when the audience is most urgently wondering — is not where any truth is
  // disclosed. The story's most inquisitive scene passes without answering, or even
  // deepening, the audience's need to know with a discovery. Distinct from REVELATION_
  // CURIOSITY_DECOUPLED (revelation scenes avg curiosityDelta ≤ 0 — the opposite direction:
  // revelation scenes lack curiosity; this checks whether the peak curiosity scene lacks
  // a revelation).
  if (records.length >= 8) {
    const revSet362b = new Set(witnessedBeliefs.map(w => w.sceneIdx));
    const curiousRevScenes362 = (records as any[]).filter(r =>
      revSet362b.has(r.sceneIdx) && (r.curiosityDelta ?? 0) > 0,
    );
    if (curiousRevScenes362.length >= 2) {
      const peakCur362 = (records as any[]).reduce((best: any, r: any) =>
        (r.curiosityDelta ?? 0) > (best.curiosityDelta ?? 0) ? r : best,
        (records as any[])[0],
      );
      if (!revSet362b.has(peakCur362.sceneIdx)) {
        issues.push({
          location: `Scene ${peakCur362.sceneIdx} — peak curiosity, no revelation`,
          rule: 'REVELATION_CURIOSITY_PEAK_ABSENT',
          severity: 'minor',
          description: `Scene ${peakCur362.sceneIdx} carries the story's highest curiosityDelta (${(peakCur362.curiosityDelta ?? 0).toFixed(2)}) but no revelation, even though ${curiousRevScenes362.length} other curious scenes do deliver discoveries. The moment the audience is most urgently wondering what is true is precisely where no truth arrives — the peak of audience inquisitiveness passes without disclosure, and the most potent delivery slot for a revelation is left empty.`,
          suggestedFix: 'Place a revelation at the peak-curiosity scene: when the audience is most urgently leaning forward wondering what is true, that is the moment to give them a discovery. The scene that raises the most questions should also deliver an answer — or a revelation that opens deeper ones. Curiosity at its peak is the best possible slot for a truth to land.',
        });
      }
    }
  }

  // ── Wave 376: REVELATION_SUSPENSE_PEAK_ABSENT, TOLD_BELIEF_CLOCK_DECOUPLED, ASSERTION_MIDPOINT_VOID ──

  // REVELATION_SUSPENSE_PEAK_ABSENT (minor, n≥8, ≥2 suspense-positive revelation scenes):
  // The scene with the highest suspenseDelta carries no revelation, even though at least 2
  // other suspense-positive scenes do. The peak-tension moment — when the audience is most
  // gripped — delivers no truth, so the most charged delivery slot for a disclosure goes
  // unused. Mirror of REVELATION_CURIOSITY_PEAK_ABSENT (the curiosity channel); distinct
  // from REVELATION_SUSPENSE_DECOUPLED (which averages suspenseDelta across revelation
  // scenes — this isolates the single peak-suspense scene).
  if (records.length >= 8) {
    const revSet376 = new Set(witnessedBeliefs.map(w => w.sceneIdx));
    const tenseRevScenes376 = (records as any[]).filter(r => revSet376.has(r.sceneIdx) && (r.suspenseDelta ?? 0) > 0);
    if (tenseRevScenes376.length >= 2) {
      const peakSusp376 = (records as any[]).reduce((best: any, r: any) =>
        (r.suspenseDelta ?? 0) > (best.suspenseDelta ?? 0) ? r : best, (records as any[])[0]);
      if (peakSusp376 && !revSet376.has(peakSusp376.sceneIdx)) {
        issues.push({
          location: `Scene ${peakSusp376.sceneIdx} — peak suspense, no revelation`,
          rule: 'REVELATION_SUSPENSE_PEAK_ABSENT',
          severity: 'minor',
          description: `Scene ${peakSusp376.sceneIdx} carries the story's highest suspenseDelta (${(peakSusp376.suspenseDelta ?? 0).toFixed(2)}) but no revelation, even though ${tenseRevScenes376.length} other suspense-positive scenes deliver discoveries. The moment the audience is most gripped delivers no truth — the most charged slot for a disclosure passes empty, so peak tension and the satisfaction of revelation never coincide.`,
          suggestedFix: 'Land a revelation at the peak-tension scene: when the audience is most on edge, the arrival of a truth — especially one that reframes the danger — hits with doubled force. The scene of maximum suspense is the most powerful place to disclose something, not to withhold.',
        });
      }
    }
  }

  // TOLD_BELIEF_CLOCK_DECOUPLED (minor, n≥8, ≥3 assertion scenes, ≥2 clock scenes): No
  // scene where a character asserts a belief also raises a clock, even though the story has
  // both assertions and deadlines. Convictions are never declared under time pressure — the
  // belief layer and the urgency engine never coincide, so claims always land in calm water
  // rather than at the moment when stating a position costs something. Mirror of REVELATION_
  // CLOCK_DECOUPLED (the revelation channel); distinct from TOLD_BELIEF_SUSPENSE_DECOUPLED
  // (suspenseDelta average on assertion scenes, not clockRaised co-occurrence).
  if (records.length >= 8) {
    const assertionIdxs376 = new Set<number>(toldBeliefs.map(t => t.sceneIdx));
    const clockScenes376 = (records as any[]).filter(r => r.clockRaised === true);
    if (assertionIdxs376.size >= 3 && clockScenes376.length >= 2 && !clockScenes376.some(r => assertionIdxs376.has(r.sceneIdx))) {
      issues.push({
        location: 'Assertion scenes × clock scenes — decoupled',
        rule: 'TOLD_BELIEF_CLOCK_DECOUPLED',
        severity: 'minor',
        description: `The story has ${assertionIdxs376.size} assertion scenes and ${clockScenes376.length} clock-raised scenes, but no assertion lands in a clock scene — convictions are never declared under time pressure. The belief layer and the urgency engine run on separate tracks, so claims always land in calm water rather than at the moment when committing to a position costs something.`,
        suggestedFix: 'Stage at least one assertion under a live clock: a character stating what they believe at the moment the deadline bites, when there is no time to hedge. A conviction declared against a ticking clock is a conviction tested — it carries the weight of a choice made under pressure rather than a position stated at leisure.',
      });
    }
  }

  // ASSERTION_MIDPOINT_VOID (minor, n≥8, ≥2 assertion scenes both sides): The midpoint
  // zone (40%–60%) contains no assertion, even though characters assert beliefs both before
  // and after it. The belief layer goes quiet at the structural pivot — the moment a
  // character should be committing to (or recommitting to) a position as the story turns.
  // Distinct from BELIEF_MIDPOINT_VOID (no belief activity of ANY kind — told or witnessed —
  // in the midpoint; this fires specifically when assertions skip the center even if
  // revelations are present) and REVELATION_MIDPOINT_VOID (the revelation channel).
  if (records.length >= 8) {
    const midStart376 = Math.floor(records.length * 0.4);
    const midEnd376 = Math.floor(records.length * 0.6);
    const assertionScenes376 = toldBeliefs.map(t => t.sceneIdx);
    const inMid376 = assertionScenes376.some(i => i >= midStart376 && i < midEnd376);
    const beforeMid376 = assertionScenes376.some(i => i < midStart376);
    const afterMid376 = assertionScenes376.some(i => i >= midEnd376);
    if (!inMid376 && beforeMid376 && afterMid376) {
      issues.push({
        location: `Midpoint zone (Scenes ${midStart376}–${midEnd376 - 1}) — no assertion`,
        rule: 'ASSERTION_MIDPOINT_VOID',
        severity: 'minor',
        description: `The midpoint zone (Scenes ${midStart376}–${midEnd376 - 1}) contains no assertion, though characters declare beliefs both before and after it — the belief layer goes silent at the structural pivot. The midpoint is where a character should be committing to or recommitting to a position as the story turns; an assertion void there means the pivot reorganizes the plot without anyone staking a claim on what it means.`,
        suggestedFix: 'Place an assertion at the midpoint: let a character declare what they now believe as the story turns — a vow renewed under new information, a conviction hardened or abandoned at the pivot. The center of the story is where beliefs should be most actively contested, not where they fall silent.',
      });
    }
  }

  // ── Wave 390: REVELATION_DRAMATIC_TURN_DECOUPLED, TOLD_BELIEF_SUSPENSE_PEAK_ABSENT, TOLD_BELIEF_CURIOSITY_PEAK_ABSENT ──

  // REVELATION_DRAMATIC_TURN_DECOUPLED (minor, n≥8, ≥2 revelations, ≥3 turn scenes): No
  // revelation lands in a scene that also carries a dramatic turn, even though the story has
  // both. The disclosure engine and the pivot engine run on separate tracks — a truth never
  // turns the plot, and a turn never hinges on a truth coming out. When revelation and
  // reversal never coincide, the story's discoveries feel inert (they change nothing) and its
  // pivots feel arbitrary (they rest on no new knowledge). Distinct from REVELATION_ASSERTION_
  // DISCONNECT (revelation vs prior assertion sequencing) and TOLD_BELIEF_DRAMATIC_TURN_
  // DECOUPLED (assertions × turns): this audits revelations against turns.
  if (records.length >= 8) {
    const revSet390 = new Set(witnessedBeliefs.map(w => w.sceneIdx));
    const turnScenes390 = (records as any[]).filter(r => (r.dramaticTurn ?? 'nothing') !== 'nothing');
    if (revSet390.size >= 2 && turnScenes390.length >= 3 && !turnScenes390.some(r => revSet390.has(r.sceneIdx))) {
      issues.push({
        location: 'Revelations × dramatic turns — decoupled',
        rule: 'REVELATION_DRAMATIC_TURN_DECOUPLED',
        severity: 'minor',
        description: `The story has ${revSet390.size} revelations and ${turnScenes390.length} dramatic turns, but none share a scene — the disclosure engine and the pivot engine run on separate tracks. A truth never turns the plot, and a turn never hinges on a truth coming out, so the discoveries feel inert (they change nothing) and the reversals feel arbitrary (they rest on no new knowledge).`,
        suggestedFix: 'Fuse at least one revelation with a dramatic turn: the moment a hidden truth surfaces should also be the moment the story pivots on it — the disclosure that forces the protagonist to change course. When discovery and reversal coincide, the revelation has consequence and the turn has cause.',
      });
    }
  }

  // TOLD_BELIEF_SUSPENSE_PEAK_ABSENT (minor, n≥8, ≥2 suspense-positive assertion scenes):
  // The single highest-suspenseDelta scene carries no assertion, even though ≥2 other
  // suspense-positive scenes do. The peak-tension moment passes without anyone committing to
  // a position — a conviction declared under maximum pressure (a vow made as everything hangs
  // in the balance) is among the most charged beats available, and the story leaves that slot
  // empty. The told-belief sibling of REVELATION_SUSPENSE_PEAK_ABSENT; distinct from TOLD_
  // BELIEF_SUSPENSE_DECOUPLED (which averages suspenseDelta across assertion scenes).
  if (records.length >= 8) {
    const assertionSet390 = new Set<number>(toldBeliefs.map(t => t.sceneIdx));
    const tenseAssertion390 = (records as any[]).filter(r => assertionSet390.has(r.sceneIdx) && (r.suspenseDelta ?? 0) > 0);
    if (tenseAssertion390.length >= 2) {
      const peakSusp390 = (records as any[]).reduce((best: any, r: any) =>
        (r.suspenseDelta ?? 0) > (best.suspenseDelta ?? 0) ? r : best, (records as any[])[0]);
      if (peakSusp390 && !assertionSet390.has(peakSusp390.sceneIdx)) {
        issues.push({
          location: `Scene ${peakSusp390.sceneIdx} — peak suspense, no assertion`,
          rule: 'TOLD_BELIEF_SUSPENSE_PEAK_ABSENT',
          severity: 'minor',
          description: `Scene ${peakSusp390.sceneIdx} carries the story's highest suspenseDelta (${(peakSusp390.suspenseDelta ?? 0).toFixed(2)}) but no assertion, even though ${tenseAssertion390.length} other suspense-positive scenes contain one. The peak-tension moment passes without anyone committing to a position — a conviction declared under maximum pressure is among the most charged beats available, and the story leaves that slot empty.`,
          suggestedFix: 'Place an assertion at the peak-tension scene: a vow, a refusal, a declaration of what the character believes made at the instant everything hangs in the balance. A conviction stated under fire is tested by the very pressure of the moment, which is what gives it weight.',
        });
      }
    }
  }

  // TOLD_BELIEF_CURIOSITY_PEAK_ABSENT (minor, n≥8, ≥2 curiosity-positive assertion scenes):
  // The single highest-curiosityDelta scene carries no assertion, even though ≥2 other
  // curiosity-positive scenes do. The moment the audience is most intrigued passes without a
  // character staking a claim — an assertion at the peak of curiosity (a confident claim the
  // audience suspects may be wrong) is a potent dramatic-irony engine the story leaves unused.
  // The told-belief sibling of REVELATION_CURIOSITY_PEAK_ABSENT; distinct from TOLD_BELIEF_
  // CURIOSITY_FLAT (which averages curiosityDelta across assertion scenes).
  if (records.length >= 8) {
    const assertionSet390b = new Set<number>(toldBeliefs.map(t => t.sceneIdx));
    const curiousAssertion390 = (records as any[]).filter(r => assertionSet390b.has(r.sceneIdx) && (r.curiosityDelta ?? 0) > 0);
    if (curiousAssertion390.length >= 2) {
      const peakCur390 = (records as any[]).reduce((best: any, r: any) =>
        (r.curiosityDelta ?? 0) > (best.curiosityDelta ?? 0) ? r : best, (records as any[])[0]);
      if (peakCur390 && !assertionSet390b.has(peakCur390.sceneIdx)) {
        issues.push({
          location: `Scene ${peakCur390.sceneIdx} — peak curiosity, no assertion`,
          rule: 'TOLD_BELIEF_CURIOSITY_PEAK_ABSENT',
          severity: 'minor',
          description: `Scene ${peakCur390.sceneIdx} carries the story's highest curiosityDelta (${(peakCur390.curiosityDelta ?? 0).toFixed(2)}) but no assertion, even though ${curiousAssertion390.length} other curiosity-positive scenes contain one. The moment the audience is most intrigued passes without a character staking a claim — a confident assertion at the peak of curiosity, one the audience suspects may be wrong, is a potent dramatic-irony engine the story leaves unused.`,
          suggestedFix: 'Place an assertion at the peak-curiosity scene: let a character commit to a belief precisely when the audience is most uncertain what is true. The gap between the character\'s certainty and the audience\'s doubt is where dramatic irony lives — the most intriguing moment is the best place to open it.',
        });
      }
    }
  }

  // ── Wave 404: REVELATION_PAYOFF_DECOUPLED, TOLD_BELIEF_SEED_DECOUPLED, ASSERTION_ACT1_ONLY ──

  // REVELATION_PAYOFF_DECOUPLED (minor, n≥8, ≥2 revelation, ≥2 payoff scenes): No revelation
  // lands in a scene that also has payoffSetupIds — the story's discovery moments and narrative
  // resolution moments never coincide. A revelation that also pays off a narrative thread is the
  // most satisfying structural unit: the truth that comes out IS the thing the audience was
  // waiting for. When they never share a scene, discoveries feel like digressions and payoffs
  // feel mechanical — the story resolves threads and discloses truths on separate schedules.
  // Distinct from REVELATION_DRAMATIC_TURN_DECOUPLED (turns, not payoffs), REVELATION_ASSERTION_
  // DISCONNECT (revelation vs prior assertion timing), and CLUE_SEED_REVELATION_DECOUPLED
  // (seeds × revelation): this audits revelation against the explicit payoff/setup channel.
  if (records.length >= 8) {
    const revSet404 = new Set(witnessedBeliefs.map(w => w.sceneIdx));
    const payoffRecs404 = (records as any[]).filter(r => ((r.payoffSetupIds ?? []) as any[]).length > 0);
    if (revSet404.size >= 2 && payoffRecs404.length >= 2 && !payoffRecs404.some(r => revSet404.has(r.sceneIdx))) {
      issues.push({
        location: 'Revelations × payoff scenes — decoupled',
        rule: 'REVELATION_PAYOFF_DECOUPLED',
        severity: 'minor',
        description: `The story has ${revSet404.size} revelation scenes and ${payoffRecs404.length} payoff scenes, but none share a scene — discovery and resolution never converge. The most satisfying structural unit is a revelation that also pays off a thread: the truth that comes out IS the thing the audience was waiting for. When they are always separate, disclosures feel like digressions and payoffs feel mechanical — the story resolves threads and discloses truths on separate schedules that never compound each other.`,
        suggestedFix: 'Fuse at least one revelation with a payoff: arrange for a narrative thread to resolve at the same moment a hidden truth surfaces. The revelation IS the payoff — the answer to the audience\'s long-running question arrives precisely when the structural promise comes due. This convergence produces the deepest form of narrative satisfaction.',
      });
    }
  }

  // TOLD_BELIEF_SEED_DECOUPLED (minor, n≥8, ≥2 assertion scenes, ≥2 seed scenes): No scene
  // in which a character makes an assertion also has seededClueIds — verbal deception and
  // physical evidence-planting never coincide. A scene where a character stakes a claim AND
  // plants physical evidence creates a compound deception: the audience receives both a verbal
  // misdirection and material evidence, maximizing dramatic irony and the sense that the story
  // is being architecturally constructed around the lie. When they never share a scene, the
  // deception layer operates purely verbally while the evidence layer operates purely physically,
  // and the two never reinforce each other. Distinct from TOLD_BELIEF_CLOCK_DECOUPLED (clocks),
  // REVELATION_PAYOFF_DECOUPLED (revelations × payoffs), and all other assertion × signal checks.
  if (records.length >= 8) {
    const assertionSet404b = new Set<number>(toldBeliefs.map(t => t.sceneIdx));
    const seedRecs404b = (records as any[]).filter(r => ((r.seededClueIds ?? []) as any[]).length > 0);
    if (assertionSet404b.size >= 2 && seedRecs404b.length >= 2 && !seedRecs404b.some(r => assertionSet404b.has(r.sceneIdx))) {
      issues.push({
        location: 'Assertion scenes × seed scenes — decoupled',
        rule: 'TOLD_BELIEF_SEED_DECOUPLED',
        severity: 'minor',
        description: `The story has ${assertionSet404b.size} scenes where characters make assertions and ${seedRecs404b.length} scenes that plant clues, but none share a scene — verbal deception and physical evidence never coincide. A scene where a character stakes a claim and also plants evidence creates a compound deception: the audience receives both a verbal misdirection and material proof, making the coming revelation land with double force. When the two tracks never meet, they miss the opportunity to reinforce each other.`,
        suggestedFix: 'Let at least one assertion coincide with a clue-planting beat: have a character declare what they believe (or what they want others to believe) in the same scene where physical evidence is embedded. When the lie and the clue share a scene, the revelation that resolves both is structurally the richest moment available.',
      });
    }
  }

  // ASSERTION_ACT1_ONLY (minor, n≥8, ≥3 told beliefs, all before the 25% mark): All of the
  // story's assertions are concentrated in the first quarter — the belief layer closes at the
  // point where it should begin complicating. The conflict and resolution zones contain no new
  // claims, no re-evaluations, no shifting certainties — characters state their positions in
  // the opening and never revisit them. More specific than BELIEF_FRONT_LOADED (first 50%):
  // this fires when the belief layer is entirely confined to Act 1, leaving the bulk of the
  // story without any explicit intellectual or epistemic stakes. Distinct from TOLD_BELIEF_ACT3_
  // ABSENT (Act 3 has no assertions) and TOLD_BELIEF_DROUGHT (5 consecutive scenes silent):
  // this catches the structural pattern where assertions vanish after the setup.
  if (records.length >= 8 && toldBeliefs.length >= 3) {
    const act1End404c = Math.floor(records.length * 0.25);
    const act1Beliefs404c = toldBeliefs.filter(t => t.sceneIdx < act1End404c);
    const laterBeliefs404c = toldBeliefs.filter(t => t.sceneIdx >= act1End404c);
    if (act1Beliefs404c.length >= 3 && laterBeliefs404c.length === 0) {
      issues.push({
        location: `Assertions concentrated in Scenes 0–${act1End404c - 1} (Act 1 only)`,
        rule: 'ASSERTION_ACT1_ONLY',
        severity: 'minor',
        description: `All ${toldBeliefs.length} of the story's assertions appear before Scene ${act1End404c} (the first 25%) — the belief layer closes at the point where it should begin complicating. The conflict and resolution zones contain no new claims, re-evaluations, or shifting certainties. Characters state their positions in the opening and are never heard from again on what they believe, leaving the bulk of the story without explicit intellectual or epistemic stakes.`,
        suggestedFix: 'Distribute assertions across the full arc: characters should re-evaluate, double down, or contradict themselves as the conflict escalates. A claim made in Act 1 that a character defends under pressure in Act 2 and abandons (or dies for) in Act 3 gives the belief layer structural weight. The story\'s positions should be tested, not just stated.',
      });
    }
  }

  // ── Wave 418: REVELATION_CONSECUTIVE_FLOOD, ASSERTION_ACT2A_VOID, ASSERTION_AFTERMATH_VOID ──

  // REVELATION_CONSECUTIVE_FLOOD (minor, n≥10, ≥4 revelations): Three or more revelation
  // scenes occur consecutively with no non-revelation scene between them. When discoveries
  // pile up back-to-back, none of them registers as a turn — the audience stops reacting and
  // starts cataloguing facts. Each revelation needs time around it: a scene of consequence,
  // a relationship shift, or a character using the new knowledge before the next truth arrives.
  // Run-based mode × revelation channel. Distinct from EXPOSITION_DUMP (consecutive TOLD
  // beliefs, not revelations), ADJACENT_DECEPTION_PAYOFF (specific assertion→revelation pair
  // within 1 scene — a targeted pairing, not a run), and TOLD_BELIEF_DROUGHT (runs of silence).
  if (records.length >= 10 && witnessedBeliefs.length >= 4) {
    const revIdxSet418a = new Set(witnessedBeliefs.map(w => w.sceneIdx));
    let maxRun418a = 0;
    let curRun418a = 0;
    let maxStart418a = -1;
    let curStart418a = -1;
    for (const r of records) {
      if (revIdxSet418a.has(r.sceneIdx)) {
        if (curRun418a === 0) curStart418a = r.sceneIdx;
        if (++curRun418a > maxRun418a) { maxRun418a = curRun418a; maxStart418a = curStart418a; }
      } else {
        curRun418a = 0;
      }
    }
    if (maxRun418a >= 3) {
      issues.push({
        location: `Revelation run starting at Scene ${maxStart418a} (${maxRun418a} consecutive)`,
        rule: 'REVELATION_CONSECUTIVE_FLOOD',
        severity: 'minor',
        description: `A run of ${maxRun418a} consecutive revelation scenes occurs starting at Scene ${maxStart418a} — discoveries arrive back-to-back with no breathing room. When truths pile up in sequence, none of them lands as a turn because there is no space for the audience to absorb the change in what they believe. The second revelation arrives before the first has been processed; the third before the second.`,
        suggestedFix: 'Interleave non-revelation scenes between discoveries: after each truth is revealed, give one scene over to reaction, consequence, or dramatic use of the new knowledge before the next revelation arrives. A revelation earns its impact from the silence around it — the scene where everything changes is only perceptible against scenes where nothing changes.',
      });
    }
  }

  // ASSERTION_ACT2A_VOID (minor, n≥12, ≥3 told beliefs, assertions exist outside Act 2a):
  // No told belief (character assertion) lands in Act 2a (25%–50% of scenes), while assertions
  // appear elsewhere. Act 2a is where the protagonist first engages the central conflict — the
  // zone where characters should be most actively staking, defending, and testing positions.
  // An assertion vacuum in this zone means the belief battle opens in silence, and the audience
  // enters the complication zone without knowing what the characters believe is at stake.
  // Zone presence/absence × assertion × Act 2a. Distinct from REVELATION_ACT2A_DESERT
  // (revelations in the same zone; this is for assertions), ASSERTION_MIDPOINT_VOID (40%–60%
  // zone; this is 25%–50%), TOLD_BELIEF_ACT3_ABSENT (Act 3 zone), and ASSERTION_ACT1_ONLY
  // (Wave 404: all assertions confined TO Act 1; this fires when Act 2a specifically is void
  // while other zones carry assertions).
  if (records.length >= 12 && toldBeliefs.length >= 3) {
    const act2aS418b = Math.floor(records.length * 0.25);
    const act2aE418b = Math.floor(records.length * 0.50);
    const hasAct2aAssertion418b = toldBeliefs.some(t => t.sceneIdx >= act2aS418b && t.sceneIdx < act2aE418b);
    const hasOtherAssertion418b = toldBeliefs.some(t => !(t.sceneIdx >= act2aS418b && t.sceneIdx < act2aE418b));
    if (!hasAct2aAssertion418b && hasOtherAssertion418b) {
      issues.push({
        location: `Act 2a (Scenes ${act2aS418b}–${act2aE418b - 1}) — no character assertions`,
        rule: 'ASSERTION_ACT2A_VOID',
        severity: 'minor',
        description: `No told belief (character assertion) occurs in Act 2a (Scenes ${act2aS418b}–${act2aE418b - 1}), though assertions appear elsewhere in the story. Act 2a is where the protagonist first engages the central conflict — the zone where characters should be most actively staking and testing their positions. Without assertions in this zone, the belief battle sits silent exactly where it should be opening, and the audience enters the complication without knowing what characters think is true.`,
        suggestedFix: 'Add at least one character assertion in Act 2a: a position staked, a claim defended, or a deliberate misdirection delivered as the conflict first escalates. The entry to complication is where the story\'s epistemic stakes should crystallize — what characters believe becomes the fuel the next acts will burn through.',
      });
    }
  }

  // ASSERTION_AFTERMATH_VOID (minor, n≥10, ≥3 told beliefs): Every assertion scene is
  // followed by two scenes in which nothing happens as a result — no revelation, no
  // relationship shift, and no suspense rise in either of the two scenes that follow the
  // assertion. Claims that land without downstream cascade never establish that believing
  // the wrong thing (or the right thing at the wrong time) has any narrative weight. The
  // belief layer makes declarations but those declarations leave no footprint in the scenes
  // that immediately follow. Sequence/aftermath mode × assertion channel. Distinct from
  // REVELATION_AFTERMATH_GAP (Wave 225: aftermath of REVELATIONS — this is aftermath of
  // ASSERTIONS), TOLD_BELIEF_SUSPENSE_DECOUPLED (audits the assertion scenes themselves for
  // low suspense; AFTERMATH audits the subsequent scenes), and DECEPTION_WITHOUT_CONSEQUENCE
  // (specifically about discovered lies; this fires across all assertion types when every
  // claim is followed by a flat aftermath regardless of truth value).
  if (records.length >= 10 && toldBeliefs.length >= 3) {
    const revIdxSet418c = new Set(witnessedBeliefs.map(w => w.sceneIdx));
    const allHaveQuietAftermath418c = toldBeliefs.every(t => {
      for (let offset = 1; offset <= 2; offset++) {
        const nextIdx = t.sceneIdx + offset;
        if (nextIdx >= records.length) continue;
        const nextR = records[nextIdx];
        if (revIdxSet418c.has(nextR.sceneIdx)) return false;
        if (((nextR.relationshipShifts ?? []) as any[]).length > 0) return false;
        if ((nextR.suspenseDelta ?? 0) > 0) return false;
      }
      return true;
    });
    if (allHaveQuietAftermath418c) {
      issues.push({
        location: 'All assertion aftermath scenes',
        rule: 'ASSERTION_AFTERMATH_VOID',
        severity: 'minor',
        description: `Each of the ${toldBeliefs.length} assertion scene(s) is followed by two scenes with no revelation, no relationship shift, and no suspense rise — every claim lands without cascading consequence. Assertions that never generate an immediate ripple — no disclosure, no bond moving, no tension rising — fail to establish that beliefs have weight. The story declares positions but those declarations leave no mark in the scenes that immediately follow.`,
        suggestedFix: 'Let at least one assertion create an immediate downstream ripple: after a character states a belief, the next scene or two should show that claim changing something — another character discovers it is false, a relationship cracks, or tension rises because the assertion is now in play. Beliefs that generate consequence teach the audience to care about what characters believe.',
      });
    }
  }

  // ── Wave 432: REVELATION_EMOTIONAL_MONOTONE, REVELATION_UNPREPARED_CLIMAX, ASSERTION_SINGLETON_RUN ──

  // REVELATION_EMOTIONAL_MONOTONE (valence, n≥8, ≥3 charged revelation scenes):
  // All emotionally charged revelation scenes — those where the discovery lands
  // with a non-neutral emotional shift — carry the same polarity: either every one
  // is positive or every one is negative. When disclosures are uniformly bad news
  // (always 'negative') or uniformly good news (always 'positive'), the audience
  // learns to predict the emotional register of a revelation before it arrives,
  // draining the surprise and dramatic range from the disclosure layer. Discoveries
  // should alternate: a truth that costs something and a truth that frees something
  // create a richer epistemic texture than a series of identically-valenced shocks.
  // Valence mode × revelation channel. Distinct from REVELATION_DRAMA_VACUUM (fires
  // when ALL revelations are emotionally neutral — this fires when the charged ones
  // are all one polarity, a genuinely different population) and TOLD_BELIEF_EMOTIONAL_
  // FLATLINE (assertion channel, not revelation channel).
  if (records.length >= 8 && witnessedBeliefs.length >= 3) {
    const chargedRevScenes432a = records.filter(
      r => r.revelation !== null && r.emotionalShift !== 'neutral',
    );
    if (chargedRevScenes432a.length >= 3) {
      const allPos432a = chargedRevScenes432a.every(r => r.emotionalShift === 'positive');
      const allNeg432a = chargedRevScenes432a.every(r => r.emotionalShift === 'negative');
      if (allPos432a || allNeg432a) {
        const dominant432a = allPos432a ? 'positive' : 'negative';
        issues.push({
          location: `${chargedRevScenes432a.length} emotionally charged revelation scene(s)`,
          rule: 'REVELATION_EMOTIONAL_MONOTONE',
          severity: 'minor',
          description: `All ${chargedRevScenes432a.length} emotionally charged revelation scenes carry a '${dominant432a}' emotional shift — every charged discovery lands as ${dominant432a === 'positive' ? 'good news' : 'bad news'}. When disclosures are emotionally uniform, the audience predicts the register before the truth arrives, and the surprise of revelation collapses into formula. A disclosure layer needs both kinds of truth: revelations that cost and revelations that free create tonal texture and unpredictability.`,
          suggestedFix: `Introduce at least one revelation that lands in the opposite emotional register: if every discovery has been bad news, write one that is a genuine relief — a truth that lightens rather than burdens. Tonal variation in revelations keeps the audience uncertain about what a disclosure will mean, which is the source of suspense in the disclosure layer.`,
        });
      }
    }
  }

  // REVELATION_UNPREPARED_CLIMAX (backward-cause, n≥10, ≥2 revelations, last
  // revelation at position ≥3 in records): The story's final revelation scene
  // has no told belief (character assertion) in any of the three scenes that
  // precede it. Looking backward from the climactic disclosure, there is no
  // planted deception, positioned claim, or epistemic stake that the revelation
  // resolves — the final truth arrives without a lie it is correcting or a
  // mystery it is answering. The most powerful revelations are those that
  // discharge a dramatic irony the audience has been carrying: they have known
  // or suspected a truth; a character is about to discover it. Without a backward
  // assertion to create that irony, the final revelation reads as information
  // delivery rather than dramatic culmination. Backward-cause mode × final
  // revelation. Distinct from REVELATION_ASSERTION_DISCONNECT (checks the whole
  // story for adjacent revelation/assertion pairs — this focuses specifically on
  // the FINAL revelation and looks backward 3 scenes) and REVELATION_LATE_FIRST
  // (position of the FIRST revelation — this is about the LAST).
  if (records.length >= 10 && witnessedBeliefs.length >= 2) {
    const lastRevSceneIdx432b = Math.max(...witnessedBeliefs.map(w => w.sceneIdx));
    const lastRevRecPos432b = records.findIndex(r => r.sceneIdx === lastRevSceneIdx432b);
    if (lastRevRecPos432b >= 3) {
      const priorSceneIdxs432b = records
        .slice(lastRevRecPos432b - 3, lastRevRecPos432b)
        .map(r => r.sceneIdx);
      const hasPriorAssertion432b = toldBeliefs.some(t =>
        priorSceneIdxs432b.includes(t.sceneIdx),
      );
      if (!hasPriorAssertion432b) {
        issues.push({
          location: `Scene ${lastRevSceneIdx432b} — final revelation`,
          rule: 'REVELATION_UNPREPARED_CLIMAX',
          severity: 'minor',
          description: `The story's final revelation (Scene ${lastRevSceneIdx432b}) is not preceded by any character assertion in the three scenes before it — there is no planted claim, defended position, or deliberate misdirection that the climactic disclosure is resolving. A revelation without a prior assertion has no dramatic irony behind it: the audience has not been given a false belief to correct, a mystery to solve, or a lie to unmask. The final truth arrives as information, not as the culmination of a belief arc.`,
          suggestedFix: `Plant an assertion in the run-up to the final revelation: give a character a position they defend, a lie they maintain, or a belief they act on in the three scenes before the climactic disclosure. When the audience carries a planted claim into the revelation scene, the truth arriving feels earned — it resolves an epistemic debt rather than just delivering a fact.`,
        });
      }
    }
  }

  // ASSERTION_SINGLETON_RUN (run-based, n≥10, ≥4 told beliefs): No two assertion
  // scenes appear consecutively — the longest run of scenes containing a told
  // belief is exactly one. Every claim is an island surrounded by assertion-free
  // scenes on both sides; the belief battle never accumulates, never builds to a
  // debate, and never gives consecutive characters the chance to challenge, echo,
  // or double-down on what has just been asserted. A story where beliefs are
  // spread too thin never creates the sense of an epistemic war — it delivers
  // isolated opinions into a vacuum rather than a contested arena. Run-based mode
  // × assertion channel — the complement of REVELATION_CONSECUTIVE_FLOOD (Wave
  // 418: revelation run too dense) and the assertion-channel mirror of the silence
  // version TOLD_BELIEF_DROUGHT (which fires on too-long runs of NO assertions).
  // Distinct from TOLD_BELIEF_CLUSTERING (3+ assertions in ONE scene) and
  // EXPOSITION_DUMP (3+ consecutive told-only scenes — this fires when the max
  // consecutive assertion run is 1, the opposite condition).
  if (records.length >= 10 && toldBeliefs.length >= 4) {
    const assertionIdxSet432c = new Set(toldBeliefs.map(t => t.sceneIdx));
    let maxRun432c = 0;
    let curRun432c = 0;
    for (const r of records) {
      if (assertionIdxSet432c.has(r.sceneIdx)) {
        if (++curRun432c > maxRun432c) maxRun432c = curRun432c;
      } else {
        curRun432c = 0;
      }
    }
    if (maxRun432c <= 1) {
      issues.push({
        location: 'Assertion distribution — every claim isolated',
        rule: 'ASSERTION_SINGLETON_RUN',
        severity: 'minor',
        description: `The story has ${toldBeliefs.length} character assertions but no two appear in consecutive scenes — every claim is surrounded by assertion-free scenes on both sides. When beliefs are spread so thin that they never accumulate or overlap, the epistemic layer cannot build momentum: characters state positions in isolation rather than debate, double down, or react to what was just claimed. A story needs runs of assertion to dramatize a contested belief arena, not just isolated opinions delivered into silence.`,
        suggestedFix: `Place at least two consecutive assertion scenes: let one character\'s claim in a scene be met by another character\'s counter-assertion in the next scene, or let a position be doubled-down on after it goes uncontested. Back-to-back assertions create the texture of an argument or a belief crisis — they signal that what characters think is actually at stake.`,
      });
    }
  }

  // ── Wave 446: REVELATION_DROUGHT, ASSERTION_REACTIVE_VOID, NEGATIVE_SCENE_REVELATION_VOID ──

  // REVELATION_DROUGHT (run-based × revelation absence, n≥10, ≥2 revelations, maxSilentRun≥6):
  // Despite containing at least 2 revelations, the script has a consecutive stretch of at
  // least 6 scenes with no disclosure of any kind. A screenplay that pockets its revelations
  // in tight bursts while leaving long silences between them loses epistemic momentum: the
  // audience stops wondering what is really true because the story withholds the discovery
  // layer entirely for too long.
  // Distinctness: TOLD_BELIEF_DROUGHT (Wave 309) is the assertion-channel parallel (consecutive
  // no-assertion runs ≥5). REVELATION_ACT_2A_DESERT (Wave 253) and REVELATION_MIDPOINT_VOID
  // (Wave 348) are zone-based checks at fixed structural positions. REVELATION_DENSITY_DROP
  // (Wave 295) compares first-half vs. second-half counts globally. This is the first run-based
  // revelation-ABSENCE check: it fires on the longest consecutive silence regardless of zone.
  if (records.length >= 10 && witnessedBeliefs.length >= 2) {
    const revSet446a = new Set(witnessedBeliefs.map(w => w.sceneIdx));
    let maxSilent446a = 0;
    let curSilent446a = 0;
    for (const r of records) {
      if (revSet446a.has(r.sceneIdx)) {
        curSilent446a = 0;
      } else {
        if (++curSilent446a > maxSilent446a) maxSilent446a = curSilent446a;
      }
    }
    if (maxSilent446a >= 6) {
      issues.push({
        location: `Revelation distribution — longest revelation-free run: ${maxSilent446a} scenes`,
        rule: 'REVELATION_DROUGHT',
        severity: 'minor',
        description: `The script contains ${witnessedBeliefs.length} revelation(s) but a stretch of ${maxSilent446a} consecutive scenes has no disclosure at all. Long revelation-free runs drain epistemic momentum: when the audience goes ${maxSilent446a} scenes without learning anything true, the belief layer falls silent and the question of what characters know becomes irrelevant. The most effective scripts keep revelations distributed across the whole story — even small disclosures in between prevent the audience from disengaging from the truth-seeking layer.`,
        suggestedFix: `Seed a small revelation — not necessarily a major plot twist, but any moment where a character learns something true — somewhere within the ${maxSilent446a}-scene silent stretch. An overheard fragment, a confirmed suspicion, or a background fact admitted in passing is enough to keep the audience tracking the truth; it does not need to resolve a central mystery.`,
      });
    }
  }

  // ASSERTION_REACTIVE_VOID (sequence/aftermath × revelation→assertion, n≥10, ≥2 revelations,
  // ≥2 assertions): After every revelation in the script, the next two scenes carry no character
  // assertion. Discoveries never prompt a character to publicly update their worldview, stake a
  // claim, or restate what they believe in light of new knowledge. When revelation and assertion
  // operate on independent tracks — when knowing something changes what characters DO but never
  // what they SAY they believe — the belief layer and the disclosure layer are decoupled at the
  // causal level.
  // Distinctness: REVELATION_ASSERTION_DISCONNECT (Wave 348) checks whether a revelation lands
  // within 2 scenes of a PRIOR assertion (assertion→revelation order: does a claim get discharged
  // by a truth?). This checks the REVERSE causal direction: revelation→assertion (does a truth
  // get processed into a claim?). ASSERTION_AFTERMATH_VOID (Wave 418) checks what follows an
  // ASSERTION in the next 2 scenes. This checks what follows a REVELATION. The first aftermath
  // check on the revelation→assertion axis; orthogonal to all existing aftermath/disconnect checks.
  if (records.length >= 10 && witnessedBeliefs.length >= 2 && toldBeliefs.length >= 2) {
    const assertionSceneIdxSet446b = new Set(toldBeliefs.map(t => t.sceneIdx));
    const allRevHaveQuietAftermath446b = witnessedBeliefs.every(w => {
      const revRecPos446b = records.findIndex(r => r.sceneIdx === w.sceneIdx);
      for (let offset = 1; offset <= 2; offset++) {
        const nextIdx = revRecPos446b + offset;
        if (nextIdx >= records.length) continue;
        if (assertionSceneIdxSet446b.has(records[nextIdx].sceneIdx)) return false;
      }
      return true;
    });
    if (allRevHaveQuietAftermath446b) {
      issues.push({
        location: `All ${witnessedBeliefs.length} revelation aftermath(s) — no assertion within 2 scenes`,
        rule: 'ASSERTION_REACTIVE_VOID',
        severity: 'minor',
        description: `Every revelation (${witnessedBeliefs.length} scenes) is followed by two scenes with no character assertion — discoveries never prompt a character to publicly update their worldview or state a new position. When the script processes a revelation through action and emotion but never through a speech-act belief claim, the disclosure layer and the assertion layer operate in isolation: characters learn things but never say what those things make them believe. An assertion in the aftermath of a revelation dramatises that knowledge matters — that having learned X changes what a character is willing to claim.`,
        suggestedFix: `After at least one revelation, give a character an assertion in the next scene or two — a claim that reflects, inverts, or responds to what was just disclosed. It can be a character doubling down on a now-false belief, or a character re-positioning based on new knowledge. Either way, the assertion signals that what was discovered has epistemic weight: it changes what characters say they know.`,
      });
    }
  }

  // NEGATIVE_SCENE_REVELATION_VOID (co-occurrence × negative valence × revelation absence,
  // n≥8, ≥2 revelations, ≥3 negative-emotional scenes): None of the script's emotionally-
  // negative scenes coincide with any revelation. The script reserves its disclosures for
  // neutral or positive territory: hard moments are kept revelation-free, and discoveries
  // happen only in calmer or more positive scenes. The most dramatically powerful revelations
  // are those that land at moments of hardship — a truth emerging when a character is already
  // suffering compounds the blow and validates the cost of the difficulty.
  // Distinctness: REVELATION_DRAMA_VACUUM (Wave 281) fires when all revelation SCENES are
  // emotionally neutral — it examines the emotional texture of scenes that contain revelations.
  // REVELATION_EMOTIONAL_MONOTONE (Wave 432) fires when all CHARGED revelation scenes share
  // one polarity. This fires from the NEGATIVE-SCENE side: checking whether any emotionally
  // negative scene ever carries a revelation. The first check that audits negative-emotional
  // scenes for revelation absence rather than revelation scenes for emotional quality.
  if (records.length >= 8 && witnessedBeliefs.length >= 2) {
    const negScenes446c = (records as any[]).filter(r => r.emotionalShift === 'negative');
    if (negScenes446c.length >= 3) {
      const revSceneIdxSet446c = new Set(witnessedBeliefs.map(w => w.sceneIdx));
      const hasRevInNeg446c = negScenes446c.some((r: any) => revSceneIdxSet446c.has(r.sceneIdx));
      if (!hasRevInNeg446c) {
        issues.push({
          location: `${negScenes446c.length} negative-emotional scenes — none carry a revelation`,
          rule: 'NEGATIVE_SCENE_REVELATION_VOID',
          severity: 'minor',
          description: `The script has ${negScenes446c.length} emotionally negative scenes but none coincide with a revelation — hard moments are systematically kept revelation-free. The most dramatically potent disclosures land when a character is already under pressure: a truth that emerges during suffering validates the cost of the difficulty and gives the negative scene a deeper purpose than pain alone. When negative-emotional scenes and revelations never share space, the disclosure layer is quarantined from the story's hardest moments, keeping discoveries in safer territory and reducing their weight.`,
          suggestedFix: `Move at least one revelation into a scene with a negative emotional shift — or write a revelatory moment that lands as bad news rather than a neutral or positive fact. The emotional register of a discovery shapes how it is received: a truth that costs the character something in the moment of its arrival carries more weight than one that arrives into equanimity.`,
        });
      }
    }
  }

  // ── Wave 460: ASSERTION_CAUSAL_VACUUM, REVELATION_SUSPENSE_DEFLATION, ASSERTION_PAYOFF_DECOUPLED ──

  // ASSERTION_CAUSAL_VACUUM (backward-cause × full assertion population, n≥10, ≥3 assertions,
  // ≥1 revelation): Every assertion scene (dialogueHighlights with ':') has no revelation, no
  // dramatic turn, and no high-suspense event (suspenseDelta > 1) in either of the 2 scenes
  // immediately preceding it. When no story pressure has just occurred to motivate a character
  // to stake a claim, assertions read as unmotivated exposition drops rather than live dramatic
  // stakes born of narrative urgency.
  // Distinctness: REVELATION_UNPREPARED_CLIMAX (Wave 432) applies backward-cause to the FINAL
  // revelation looking backward for a prior assertion. This applies backward-cause to EVERY
  // ASSERTION looking backward for a narrative trigger (revelation/turn/suspense-spike) — the
  // reverse direction and a different event population. TOLD_BELIEF_DRAMATIC_TURN_DECOUPLED
  // (Wave 348) is a co-occurrence check (assertion and turn sharing the SAME scene). This checks
  // two PRIOR scenes, not the assertion scene itself. First backward-cause check with the
  // assertion as the downstream effect rather than the cause.
  if (records.length >= 10 && toldBeliefs.length >= 3 && witnessedBeliefs.length >= 1) {
    const assertionSceneIdxs460a = [...new Set(toldBeliefs.map(t => t.sceneIdx))];
    const allAssertionsVacuous460a = assertionSceneIdxs460a.every(idx => {
      const pos460a = records.findIndex(r => r.sceneIdx === idx);
      if (pos460a < 1) return true;
      for (let back = 1; back <= 2 && pos460a - back >= 0; back++) {
        const prior = (records as any[])[pos460a - back];
        if (prior.revelation !== null && prior.revelation !== undefined && prior.revelation !== '') return false;
        if ((prior.dramaticTurn ?? 'nothing') !== 'nothing') return false;
        if ((prior.suspenseDelta ?? 0) > 1) return false;
      }
      return true;
    });
    if (allAssertionsVacuous460a) {
      issues.push({
        location: `${assertionSceneIdxs460a.length} assertion scene(s) — no narrative trigger in prior 2 scenes`,
        rule: 'ASSERTION_CAUSAL_VACUUM',
        severity: 'minor',
        description: `Each of the ${assertionSceneIdxs460a.length} scene(s) where a character makes an assertion is preceded by no revelation, no dramatic turn, and no high-suspense moment in the prior two scenes — assertions drop into the story from a narrative vacuum. When no story event has just occurred to motivate a character to declare their position, told beliefs read as unmotivated exposition rather than as live stakes born of narrative pressure.`,
        suggestedFix: 'Motivate assertions narratively: have a character state what they believe because something just happened — a discovery they are reacting to, a dramatic turn that forced the question, or a surge of tension where committing to a claim feels urgent. An assertion earned by prior story pressure is a dramatic stake; one that drops from nowhere is exposition.',
      });
    }
  }

  // REVELATION_SUSPENSE_DEFLATION (average/aggregate × aftermath × revelation × suspense direction,
  // n≥8, ≥3 qualifying revelations not in last record): The average suspenseDelta of the scene
  // immediately following each qualifying revelation is < 0. Disclosures consistently trigger
  // falling tension — the story treats revelations as release valves that calm the narrative
  // rather than as detonators that escalate it.
  // Distinctness: REVELATION_SUSPENSE_DECOUPLED (Wave 295) averages suspenseDelta OF revelation
  // scenes themselves (the revelation-as-context population). This averages suspenseDelta OF THE
  // SCENE AFTER each revelation (aftermath-as-context) — the first aggregate check on the
  // post-revelation zone. REVELATION_AFTERMATH_ABSENT (Wave 225) requires suspenseDelta ≠ 0 as
  // "active aftermath" and fires when completely flat (= 0). This fires when aftermath IS
  // numerically active but uniformly negative — a different population (falling vs. flat) and
  // a different failure mode (wrong direction vs. no direction).
  if (records.length >= 8 && witnessedBeliefs.length >= 3) {
    const qualRev460b = witnessedBeliefs.filter(w => {
      const pos460b = records.findIndex(r => r.sceneIdx === w.sceneIdx);
      return pos460b >= 0 && pos460b < records.length - 1;
    });
    if (qualRev460b.length >= 3) {
      let totalAftermath460b = 0;
      for (const w of qualRev460b) {
        const pos460b = records.findIndex(r => r.sceneIdx === w.sceneIdx);
        totalAftermath460b += ((records as any[])[pos460b + 1].suspenseDelta ?? 0);
      }
      const avgAftermath460b = totalAftermath460b / qualRev460b.length;
      if (avgAftermath460b < 0) {
        issues.push({
          location: `${qualRev460b.length} revelation aftermath(s) — avg next-scene suspenseDelta ${avgAftermath460b.toFixed(2)}`,
          rule: 'REVELATION_SUSPENSE_DEFLATION',
          severity: 'minor',
          description: `The scene immediately following each of the ${qualRev460b.length} qualifying revelation(s) averages a suspenseDelta of ${avgAftermath460b.toFixed(2)} — disclosures consistently trigger falling tension. When every discovery is followed by a calmer scene, revelations function as resolution beats rather than escalators: they answer questions without creating new pressure. The most effective disclosures raise the stakes for what comes next; revelations whose aftermath is uniformly a tension drop feel like endings rather than turning points.`,
          suggestedFix: 'Engineer at least one revelation whose aftermath raises tension: stage the scene after the disclosure so that what was learned makes the next action more dangerous, more urgent, or more contested. A revelation that immediately creates a new problem generates forward momentum; one that immediately calms the pressure it arrived with is a conclusion wearing the costume of a midpoint.',
        });
      }
    }
  }

  // ASSERTION_PAYOFF_DECOUPLED (co-occurrence × assertion × payoff, n≥8, ≥2 assertion scenes,
  // ≥2 payoff scenes): No scene where a character asserts a belief (dialogueHighlights with ':')
  // also carries payoffSetupIds — verbal declarations and narrative resolutions never share a
  // scene. A confession, a truth finally spoken because planted evidence forced it, or a claim
  // delivered as the payoff of a long-running setup is among the most satisfying structural
  // moments available; when assertions and payoffs are on separate tracks, the verbal belief
  // layer misses its most structurally resonant delivery slot.
  // Distinctness: TOLD_BELIEF_SEED_DECOUPLED (Wave 404) checks assertion × seededClueIds (the
  // evidence-planting/setup SIDE of the same structural axis). This checks assertion ×
  // payoffSetupIds (the evidence-resolution/payoff SIDE). REVELATION_PAYOFF_DECOUPLED (Wave 404)
  // checks revelation × payoff — a different belief-event type. All other told-belief
  // co-occurrence checks (clock, dramatic turn, relationship, suspense-peak, curiosity-peak,
  // seed) audit different co-signal populations; payoff is a genuinely empty cell.
  if (records.length >= 8) {
    const assertionSceneIdxSet460c = new Set<number>(toldBeliefs.map(t => t.sceneIdx));
    const payoffRecs460c = (records as any[]).filter(r => ((r.payoffSetupIds ?? []) as any[]).length > 0);
    if (assertionSceneIdxSet460c.size >= 2 && payoffRecs460c.length >= 2 &&
        !payoffRecs460c.some(r => assertionSceneIdxSet460c.has(r.sceneIdx))) {
      issues.push({
        location: 'Assertion scenes × payoff scenes — decoupled',
        rule: 'ASSERTION_PAYOFF_DECOUPLED',
        severity: 'minor',
        description: `The story has ${assertionSceneIdxSet460c.size} scene(s) where a character asserts a belief and ${payoffRecs460c.length} scenes that pay off planted setups, but none share a scene — verbal declarations and narrative resolutions never converge. A confession extracted by planted evidence, a truth spoken because the setup left no other option, or a claim delivered as the structural payoff of a long-running promise is among the most satisfying moments available. When assertions and payoffs are architecturally separate, the belief layer misses its most resonant delivery slot.`,
        suggestedFix: 'Stage at least one assertion as a payoff: let a character make their declaration at the moment when planted evidence, a long-running setup, or a structural promise comes due. The confession that arrives because everything points to it — the assertion made because the setup left no other option — fuses the belief layer and the narrative resolution layer into a single, doubly-satisfying beat.',
      });
    }
  }

  // ── Wave 474: ASSERTION_TEMPORAL_CLUSTER, REVELATION_EMOTIONAL_AFTERMATH_FLAT, ASSERTION_CURIOSITY_AFTERMATH_VOID ──
  const n474 = records.length;

  // ASSERTION_TEMPORAL_CLUSTER — Distribution/timing × assertion channel (n≥8, ≥4 unique
  // assertion scene positions, >75% of those positions fall within a single third of the
  // script). When told beliefs are structurally ghettoized into one temporal zone, the belief
  // battle is architecturally lopsided: two-thirds of the story passes without any character
  // staking a claim, while one zone is saturated with assertion. The told-belief layer is most
  // effective when characters make claims throughout the arc: early claims create dramatic irony,
  // mid-script claims escalate existing tensions, and late claims force reckonings.
  // Distinct from: BELIEF_FRONT_LOADED (Wave 267: all assertions in the first half — a binary
  // partition at the 50% mark; this uses thirds at 33%/67% with a 75% cluster threshold;
  // fires when any third dominates, not only the opening), ASSERTION_ACT_2A_VOID (Wave 418:
  // zone-absence × 25%–50% zone — detects where assertions are MISSING; this detects where
  // they CLUSTER), TOLD_BELIEF_ACT_3_ABSENT (Wave 362: absence in the final quarter — a
  // single-zone absence check), ASSERTION_SINGLETON_RUN (Wave 432: run-based × no two assertion
  // scenes adjacent — a consecutive-proximity check, not a temporal-zone distribution check).
  if (n474 >= 8 && toldBeliefs.length >= 4) {
    const assertionSceneIdxs474a = [...new Set(toldBeliefs.map(t => t.sceneIdx))];
    const assertionPositions474a = assertionSceneIdxs474a
      .map(idx => records.findIndex(r => r.sceneIdx === idx))
      .filter(pos => pos >= 0);
    if (assertionPositions474a.length >= 4) {
      const third474a = Math.floor(n474 / 3);
      const firstZone474a = assertionPositions474a.filter(p => p < third474a).length;
      const midZone474a = assertionPositions474a.filter(p => p >= third474a && p < 2 * third474a).length;
      const lastZone474a = assertionPositions474a.filter(p => p >= 2 * third474a).length;
      const maxZone474a = Math.max(firstZone474a, midZone474a, lastZone474a);
      if (maxZone474a / assertionPositions474a.length > 0.75) {
        const zoneName474a = firstZone474a === maxZone474a ? 'opening' : midZone474a === maxZone474a ? 'middle' : 'closing';
        issues.push({
          location: `${maxZone474a}/${assertionPositions474a.length} assertion scene(s) in the ${zoneName474a} third`,
          rule: 'ASSERTION_TEMPORAL_CLUSTER',
          severity: 'minor',
          description: `${maxZone474a} of ${assertionPositions474a.length} assertion scenes (${(maxZone474a / assertionPositions474a.length * 100).toFixed(0)}%) fall within the ${zoneName474a} third of the script — the belief battle is architecturally ghettoized into one temporal zone. Two-thirds of the story passes without any character staking a verbal claim, while the ${zoneName474a} zone is saturated with assertion. Told beliefs are most effective when they are distributed across the full arc: assertions in the opening zone create dramatic irony (the audience knows what characters claim before they can verify it), assertions in the middle zone escalate existing tensions by forcing characters to double down or recant, and assertions in the closing zone create urgent reckonings. Clustering all assertion into one zone leaves the other zones dramatically inert on the belief channel.`,
          suggestedFix: `Redistribute assertion scenes across all three thirds of the script: plant at least one character claim in each zone currently empty of assertion. Even a brief line that explicitly stakes a position — a character asserting something is true or false — extends the belief battle across the full arc. If the ${zoneName474a} third naturally generates most of the explicit claims, look for earlier or later moments where a character could be put in the position of declaring what they believe, however briefly.`,
        });
      }
    }
  }

  // REVELATION_EMOTIONAL_AFTERMATH_FLAT — Average/aggregate × revelation × emotional aftermath
  // (n≥8, ≥3 qualifying revelations not in the final position). All scenes immediately following
  // qualifying revelations carry emotionalShift === 'neutral'. Disclosures generate no emotional
  // charge in the scenes that follow — they function as flat plot updates rather than events that
  // destabilize characters' emotional states in the next beat. When every discovery is followed by
  // a neutral scene, revelations have been quarantined from the story's emotional world: they are
  // processed informationally but never felt in the moment of their aftermath.
  // Distinct from: REVELATION_DRAMA_VACUUM (Wave 281: emotionalShift of the revelation scene ITSELF
  // is neutral — checks the revelation-as-context, not the scene after), REVELATION_SUSPENSE_
  // DEFLATION (Wave 460: checks suspenseDelta of the scene after each revelation — a different
  // aftermath signal; this checks emotionalShift, not the numeric suspense channel), TOLD_BELIEF_
  // EMOTIONAL_FLATLINE (Wave 334: emotionalShift of the assertion SCENE itself — different belief
  // event type and different positional slot).
  if (n474 >= 8 && witnessedBeliefs.length >= 3) {
    const qualRev474b = witnessedBeliefs.filter(w => {
      const pos474b = records.findIndex(r => r.sceneIdx === w.sceneIdx);
      return pos474b >= 0 && pos474b < n474 - 1;
    });
    if (qualRev474b.length >= 3) {
      const allAftermathFlat474b = qualRev474b.every(w => {
        const pos474b = records.findIndex(r => r.sceneIdx === w.sceneIdx);
        return ((records as any[])[pos474b + 1].emotionalShift ?? 'neutral') === 'neutral';
      });
      if (allAftermathFlat474b) {
        issues.push({
          location: `${qualRev474b.length} revelation aftermath(s) — all emotionally neutral`,
          rule: 'REVELATION_EMOTIONAL_AFTERMATH_FLAT',
          severity: 'minor',
          description: `Each of the ${qualRev474b.length} qualifying revelation(s) is immediately followed by a scene with a neutral emotional shift — disclosures consistently generate no emotional charge in what follows. Revelations function as flat informational updates rather than as events that destabilize characters' emotional states in the next beat. The most effective disclosures propagate emotionally: the scene after a revelation is where characters react, spiral, double down, or pivot — if every reaction scene is emotionally neutral, the discovery has been registered but never felt.`,
          suggestedFix: 'Stage at least one post-revelation scene with a charged emotional shift: a discovery should make someone angrier, more frightened, more hopeful, or more desperate in the following scene. The emotional aftermath of a revelation is where it is felt rather than merely processed; a neutral reaction scene suggests the disclosure was informational rather than transformative. Even a brief scene that tracks a character\'s emotional state changing in response to what was just revealed extends the disclosure across two beats.',
        });
      }
    }
  }

  // ASSERTION_CURIOSITY_AFTERMATH_VOID — Average/aggregate × assertion × curiosity aftermath
  // (n≥8, ≥3 qualifying assertion scenes not in final position). Average curiosityDelta of the
  // scene immediately following each qualifying assertion ≤ 0. Every time a character stakes a
  // claim, the following scene fails to reopen any question for the audience — assertions close
  // the field rather than generating dramatic irony that drives forward curiosity. A well-placed
  // assertion should heighten what the audience wants to know: is this character right? What will
  // happen when reality tests this belief? What does holding this position cost them?
  // Distinct from: TOLD_BELIEF_CURIOSITY_FLAT (Wave 323: curiosityDelta OF the assertion scene
  // itself ≤ 0 — assertion-as-context, not aftermath), ASSERTION_AFTERMATH_VOID (Wave 418:
  // aftermath has no revelation, no relationship shift, no suspense rise in next 2 scenes —
  // a structural compound condition, not specifically curiosity-channel), REVELATION_CURIOSITY_
  // DECOUPLED (Wave 323: revelation scenes' own curiosityDelta ≤ 0 — a different belief event
  // type and a different positional slot).
  if (n474 >= 8 && toldBeliefs.length >= 3) {
    const assertionSceneIdxsUniq474c = [...new Set(toldBeliefs.map(t => t.sceneIdx))];
    const qualAssertion474c = assertionSceneIdxsUniq474c
      .map(idx => records.findIndex(r => r.sceneIdx === idx))
      .filter(pos => pos >= 0 && pos < n474 - 1);
    if (qualAssertion474c.length >= 3) {
      const totalCurDelta474c = qualAssertion474c.reduce((sum, pos) => {
        return sum + ((records as any[])[pos + 1].curiosityDelta ?? 0);
      }, 0);
      const avgCurDelta474c = totalCurDelta474c / qualAssertion474c.length;
      if (avgCurDelta474c <= 0) {
        issues.push({
          location: `${qualAssertion474c.length} assertion aftermath(s) — avg next-scene curiosityDelta ${avgCurDelta474c.toFixed(2)}`,
          rule: 'ASSERTION_CURIOSITY_AFTERMATH_VOID',
          severity: 'minor',
          description: `The scene immediately following each of the ${qualAssertion474c.length} qualifying assertion(s) averages a curiosityDelta of ${avgCurDelta474c.toFixed(2)} — assertions consistently fail to reopen the epistemic field in what follows. When a character stakes a claim, the following scene should heighten what the audience wants to know: is this character right? What happens when reality tests this belief? What does commitment to this position cost? If the scene after every assertion is curiosity-neutral or curiosity-negative, claims function as closures rather than as dramatic irony generators — the belief layer deposits information without fueling anticipation about whether the belief is true or what follows from holding it.`,
          suggestedFix: 'Engineer at least one assertion whose aftermath reopens the field: have the scene that follows a claim raise a new question about it — through a contradicting event, a character who reacts with suspicion, or a dramatic development that forces the audience to wonder whether the assertion will hold. The most powerful told beliefs are those where the audience knows what a character believes and immediately wonders how that belief will collide with reality.',
        });
      }
    }
  }

  // ── Wave 488: REVELATION_TEMPORAL_CLUSTER, REVELATION_RELATIONSHIP_PEAK_ABSENT, ASSERTION_NEGATIVE_DECOUPLED ──

  // REVELATION_TEMPORAL_CLUSTER — distribution/timing × revelation × thirds.
  // n≥9, ≥3 revelation scenes. Divide records into three equal structural thirds. Count revelation
  // scenes in each third. If >75% of revelations fall in a single third, the disclosure layer is
  // ghettoized — the story dumps its secrets in one structural zone and is epistemically quiet in
  // the others. Audiences process revelations as turning points: if all revelations land in one
  // phase, the other phases have no information to process, no dramatic irony to maintain.
  // Distinct from: ASSERTION_TEMPORAL_CLUSTER (Wave 474: same analytical mode but assertion scenes,
  // not revelations; this fills the revelation channel), REVELATION_DROUGHT (run-based consecutive
  // absence — that fires on the single longest silence between revelations, not global thirds
  // distribution), REVELATION_MIDPOINT_VOID / REVELATION_ACT2A_DESERT (zone-absence checks that
  // fire when a specific structural zone has ZERO revelations; this fires on over-concentration in
  // one zone even if all three zones have some revelations, at 75%+ in one).
  const n488a = records.length;
  if (n488a >= 9) {
    const revIdxs488a = records
      .map((r, i) => ({ r, i }))
      .filter(({ r }) => r.revelation !== null && r.revelation !== '' && r.revelation !== undefined)
      .map(({ i }) => i);
    if (revIdxs488a.length >= 3) {
      const third488a = Math.floor(n488a / 3);
      const zone1488a = revIdxs488a.filter(i => i < third488a).length;
      const zone2488a = revIdxs488a.filter(i => i >= third488a && i < 2 * third488a).length;
      const zone3488a = revIdxs488a.filter(i => i >= 2 * third488a).length;
      const maxZone488a = Math.max(zone1488a, zone2488a, zone3488a);
      if (maxZone488a / revIdxs488a.length > 0.75) {
        const zoneName488a = zone1488a === maxZone488a ? 'first' : zone2488a === maxZone488a ? 'second' : 'third';
        issues.push({
          location: `Revelation distribution — ${maxZone488a}/${revIdxs488a.length} revelations in ${zoneName488a} third (zones: ${zone1488a}/${zone2488a}/${zone3488a})`,
          rule: 'REVELATION_TEMPORAL_CLUSTER',
          severity: 'minor',
          description: `${Math.round(maxZone488a / revIdxs488a.length * 100)}% of revelations (${maxZone488a} of ${revIdxs488a.length}) are concentrated in the ${zoneName488a} structural third. Disclosures are temporally ghettoized — the story exhausts its epistemic capital in one zone and is informationally silent in the other two. The two quiet thirds provide no new information, no pivots of understanding, and no dramatic irony. A well-structured belief-and-revelation arc keeps disclosures distributed by dramatic pressure, not positional habit.`,
          suggestedFix: `Move at least one revelation from the ${zoneName488a} cluster into each of the thirds that currently lack disclosures. Spreading revelations across the story's structure ensures the audience faces fresh information in more than one zone — the script does not front-load or back-load all its secrets into a single phase.`,
        });
      }
    }
  }

  // REVELATION_RELATIONSHIP_PEAK_ABSENT — single-peak isolation × relationship magnitude × revelation.
  // n≥8. Among all scenes with relationship shifts, find the one with the highest total |amount|.
  // If that peak-relationship scene has no revelation, while ≥2 revelation scenes and ≥2 relationship-
  // shift scenes exist and at least one other relationship-shift scene DOES have a revelation → fire.
  // The story's single biggest relational rupture is epistemically empty — no information changes
  // hands at the moment of maximum bond stress.
  // Distinct from: REVELATION_RELATIONSHIP_DECOUPLED (Wave 334: all relationship-shift scenes are
  // revelation-silent — fires when the ENTIRE relationship-shift category is disclosure-free; this
  // fires on the single PEAK relationship scene while other rel-shift scenes may carry revelations,
  // a single-peak isolation mode), any existing single-peak checks on suspense/curiosity/payoff/seed
  // peaks (those isolate different channels).
  if (records.length >= 8) {
    const relMags488b = records.map(r => {
      const shifts = (r.relationshipShifts ?? []) as Array<{ pairKey: string; dimension: string; amount: number }>;
      return shifts.reduce((s, sh) => s + Math.abs(sh.amount ?? 0), 0);
    });
    const maxRelMag488b = Math.max(...relMags488b);
    if (maxRelMag488b > 0) {
      const peakRelIdx488b = relMags488b.indexOf(maxRelMag488b);
      const peakHasRev488b = records[peakRelIdx488b].revelation !== null &&
        records[peakRelIdx488b].revelation !== '' &&
        records[peakRelIdx488b].revelation !== undefined;
      const revCount488b = records.filter(r =>
        r.revelation !== null && r.revelation !== '' && r.revelation !== undefined,
      ).length;
      const relShiftCount488b = relMags488b.filter(m => m > 0).length;
      const otherRelWithRev488b = relMags488b.some((m, i) =>
        m > 0 && i !== peakRelIdx488b && (
          records[i].revelation !== null && records[i].revelation !== '' && records[i].revelation !== undefined
        ),
      );
      if (!peakHasRev488b && revCount488b >= 2 && relShiftCount488b >= 2 && otherRelWithRev488b) {
        issues.push({
          location: `Scene ${records[peakRelIdx488b].sceneIdx} (${records[peakRelIdx488b].slug}) — peak relationship scene (magnitude ${maxRelMag488b.toFixed(2)}) has no revelation`,
          rule: 'REVELATION_RELATIONSHIP_PEAK_ABSENT',
          severity: 'minor',
          description: `The scene with the largest relationship shift magnitude (${maxRelMag488b.toFixed(2)}) carries no revelation, even though other relationship-shift scenes do carry disclosures. The story's single biggest relational rupture is epistemically empty — no information changes hands at the moment of maximum bond stress. In a strong dramatic structure, the highest-charge relational beat is precisely where a character is most likely to reveal something: a truth they've withheld, a lie they can no longer maintain, or a secret that the bond's rupture finally forces into the open.`,
          suggestedFix: `Give scene ${records[peakRelIdx488b].sceneIdx} a revelation — even a partial one. The moment when a relationship shifts most dramatically is the most natural place for disclosure: characters under maximum relational stress are most likely to speak truths they have been concealing. A revelation in the peak relational scene makes the bond shift dramatically legible by grounding it in newly disclosed information.`,
        });
      }
    }
  }

  // ASSERTION_NEGATIVE_DECOUPLED — co-occurrence × negative emotion × assertion absence.
  // n≥8, ≥2 assertion scenes, ≥2 negative-emotion scenes (emotionalShift='negative').
  // No assertion scene coincides with a negative emotional shift → fire. Claims are voiced only
  // in neutral or positive emotional states, never in a moment of defeat, crisis, or loss.
  // The most powerful assertions are those made under duress — a character insisting on a belief
  // as the story contradicts it, or voicing a claim precisely as it is being disproven.
  // Distinct from: TOLD_BELIEF_EMOTIONAL_FLATLINE (Wave 334: all assertion scenes are emotionally
  // NEUTRAL — assertions carry no charge at all; FLATLINE does not fire when assertions are positive
  // and never negative; this check does not require neutrality — it fires when assertions are only
  // positive or neutral but never negative, a different co-occurrence failure mode), NEGATIVE_SCENE_
  // REVELATION_VOID (Wave 446: checks revelations in negative scenes, not assertions), and any
  // assertion-suspense or assertion-curiosity checks (those are numeric-delta channels, not valence).
  if (records.length >= 8) {
    const assertionSceneSet488c = new Set(toldBeliefs.map(t => t.sceneIdx));
    const assertionScenes488c = records.filter(r => assertionSceneSet488c.has(r.sceneIdx));
    const negScenes488c = records.filter(r => r.emotionalShift === 'negative');
    if (assertionScenes488c.length >= 2 && negScenes488c.length >= 2) {
      const anyNegAssertion488c = assertionScenes488c.some(r => r.emotionalShift === 'negative');
      if (!anyNegAssertion488c) {
        issues.push({
          location: `${assertionScenes488c.length} assertion scenes — none coincides with a negative emotional shift`,
          rule: 'ASSERTION_NEGATIVE_DECOUPLED',
          severity: 'minor',
          description: `The script has ${assertionScenes488c.length} assertion scenes and ${negScenes488c.length} scenes with negative emotional shifts, but no scene is both. Assertions never land in a moment of defeat, crisis, or loss — claims are voiced only when the story is emotionally neutral or positive. The most dramatically powerful assertions are made under adversity: a character insisting on a belief as the situation deteriorates, voicing a claim precisely as it is being disproven, or staking a position in a moment of despair. When assertions only arrive in calm or triumphant moments, the belief layer is sheltered from the story's harshest emotional tests.`,
          suggestedFix: `Place at least one assertion in a scene with a negative emotional shift — a character who clings to a belief as the situation deteriorates, who makes a claim in a moment of loss, or who declares a position precisely when the story appears to be refuting it. Assertions under adversity generate dramatic irony that assertions during calm cannot.`,
        });
      }
    }
  }

  // ── Wave 502 checks ──────────────────────────────────────────────────────────

  // REVELATION_SEED_DECOUPLED
  // Co-occurrence × revelation × seed structural channel.
  // A screenplay builds suspense by seeding clues that pay off as revelations.
  // When revelations and seeds never share the same scene, the two channels are
  // completely decoupled: revelations arrive without any planted groundwork, and
  // seeds never crystallise into a visible surprise. The result is that either the
  // revelations feel unmotivated (dropped from nowhere) or the seeded clues are
  // never cashed (planted and forgotten). Either failure mode undermines the
  // audience's investment in the mystery layer.
  // Distinct from: PAYOFF_REVELATION_DECOUPLED (Wave 466: checks payoffSetupIds ×
  // revelation co-occurrence, not seededClueIds; seeds are prospective — they point
  // forward to future payoffs — while payoffSetupIds confirm a prior promise has
  // landed; this rule targets the upstream planting step, not the downstream
  // confirmation step), TOLD_BELIEF_RELATIONSHIP_DECOUPLED (co-occurrence failure in
  // a different channel pair), and all revelation-timing / revelation-distribution
  // checks which examine when revelations appear rather than what co-occurs with them.
  {
    const n502a = records.length;
    if (n502a >= 8) {
      const revScenes502a = (records as any[]).filter(
        r => r.revelation !== null && r.revelation !== '' && r.revelation !== undefined,
      );
      const seedScenes502a = (records as any[]).filter(
        r => ((r.seededClueIds ?? []) as any[]).length > 0,
      );
      if (revScenes502a.length >= 2 && seedScenes502a.length >= 2) {
        const anyCoOccur502a = (records as any[]).some(
          r =>
            (r.revelation !== null && r.revelation !== '' && r.revelation !== undefined) &&
            ((r.seededClueIds ?? []) as any[]).length > 0,
        );
        if (!anyCoOccur502a) {
          issues.push({
            location: `${revScenes502a.length} revelation scenes and ${seedScenes502a.length} seed scenes — zero overlap`,
            rule: 'REVELATION_SEED_DECOUPLED',
            severity: 'minor',
            description: `The script has ${revScenes502a.length} revelation scenes and ${seedScenes502a.length} clue-seeding scenes, but no scene does both. Revelations and seeds are fully decoupled: the two mystery-layer channels never reinforce one another. Revelations feel unmotivated (the audience has not been primed in that moment), and seeds are planted in vacuums that never carry the charge of discovered truth. The most structurally dense mystery beats are scenes that simultaneously plant a new question and resolve a prior one — the reveal of one truth primes the audience to notice the next seed.`,
            suggestedFix: `Write at least one scene that contains both a revelation and a seeded clue — for example, a scene in which a truth is unveiled that also introduces a fresh piece of evidence or a new mystery for the audience to track. This overlap creates a causal chain that gives the mystery layer momentum.`,
          });
        }
      }
    }
  }

  // REVELATION_CURIOSITY_AFTERMATH_VOID
  // Average/aggregate × revelation → curiosity aftermath channel.
  // A revelation is a high-information event: it resolves ambiguity and should
  // consequently activate the audience's desire to understand what comes next. If
  // the scene immediately following a revelation carries no positive curiosity delta
  // on average, the script is failing to capitalise on the narrative energy the
  // reveal generates. The audience is left with answered questions but no new
  // questions raised — the mystery engine stalls rather than accelerating.
  // Distinct from: all revelation-timing checks (they measure when revelations
  // appear, not what follows them), REVELATION_SEED_DECOUPLED (co-occurrence within
  // the revelation scene, not the scene after), PAYOFF_REVELATION_DECOUPLED (Wave
  // 466: payoffSetupIds in the same scene as a revelation, not curiosity aftermath),
  // CURIOSITY_SPIKE_ISOLATED (Wave 303: distribution of curiosity spikes overall,
  // not conditioned on revelations), and any suspense-aftermath check (a different
  // numerical channel).
  {
    const n502b = records.length;
    if (n502b >= 8 && witnessedBeliefs.length >= 3) {
      const qualRev502b = witnessedBeliefs
        .map(w => ({ w, pos: (records as any[]).findIndex((r: any) => r.sceneIdx === w.sceneIdx) }))
        .filter(({ pos }) => pos >= 0 && pos < n502b - 1);
      if (qualRev502b.length >= 3) {
        const total502b = qualRev502b.reduce(
          (sum, { pos }) => sum + (((records as any[])[pos + 1] as any).curiosityDelta ?? 0),
          0,
        );
        const avg502b = total502b / qualRev502b.length;
        if (avg502b <= 0) {
          issues.push({
            location: `${qualRev502b.length} revelations examined — average curiosity aftermath ${avg502b.toFixed(2)}`,
            rule: 'REVELATION_CURIOSITY_AFTERMATH_VOID',
            severity: 'minor',
            description: `Across ${qualRev502b.length} revelations, the scene immediately following each has an average curiosity delta of ${avg502b.toFixed(2)} (≤ 0). Revelations should spark new questions: each truth unveiled ought to prime the audience to want to know what comes next. When post-revelation scenes consistently carry zero or negative curiosity, the story resolves mystery without restocking it — the audience is informed but not re-engaged, and the drive to keep watching diminishes.`,
            suggestedFix: `After each revelation, ensure the next scene raises at least a small new question — a new detail that doesn't quite fit, a character reaction that needs explaining, or a consequence that opens a fresh unknown. Revelations are most powerful when they trade one form of uncertainty for another rather than simply closing a loop.`,
          });
        }
      }
    }
  }

  // ASSERTION_CONSECUTIVE_FLOOD
  // Run-based × assertion channel.
  // A screenplay's belief layer is most effective when assertions are distributed
  // across the narrative arc rather than massed in consecutive bursts. When three or
  // more scenes in a row contain belief assertions, the sequence feels like a lecture
  // or manifesto — the dramatic argument is stated repeatedly without intervening
  // action, complication, or contradiction to test it. The flood also dilutes each
  // individual assertion because the audience cannot process claims without the
  // breathing room that plot movement provides.
  // Distinct from: ASSERTION_NEGATIVE_DECOUPLED (Wave 488: co-occurrence of
  // assertions with emotional negativity — a channel × valence check, not
  // distribution), TOLD_BELIEF_SCENE_UNDERCOUNT (Wave 302: total count of assertion
  // scenes is too low — the inverse scarcity problem), TOLD_BELIEF_FINAL_ACT_ABSENT
  // (Wave 344: assertions missing from a zone, not a consecutive-run measurement),
  // and all other distribution checks that use zone thirds rather than run length.
  {
    const n502c = records.length;
    if (n502c >= 8 && toldBeliefs.length >= 4) {
      const assertionSceneSet502c = new Set(toldBeliefs.map(t => t.sceneIdx));
      let maxAssRun502c = 0;
      let curAssRun502c = 0;
      for (const r of records as any[]) {
        if (assertionSceneSet502c.has(r.sceneIdx)) {
          if (++curAssRun502c > maxAssRun502c) maxAssRun502c = curAssRun502c;
        } else {
          curAssRun502c = 0;
        }
      }
      if (maxAssRun502c >= 3) {
        issues.push({
          location: `longest consecutive assertion run: ${maxAssRun502c} scenes`,
          rule: 'ASSERTION_CONSECUTIVE_FLOOD',
          severity: 'minor',
          description: `The script contains a run of ${maxAssRun502c} consecutive scenes in which characters state beliefs. Assertion floods — three or more consecutive belief-statement scenes — read as lectures or manifestos: the dramatic argument is repeated without plot movement, complication, or contradiction to test it. Each assertion in the run competes with the others for attention, and the audience loses the ability to sit with any single claim before the next one arrives.`,
          suggestedFix: `Break up consecutive assertion scenes with at least one intervening scene of plot action, complication, or quiet observation. Assertions are strongest when they are spaced apart so each has room to resonate — and when what happens between them appears to confirm, contradict, or complicate the claim just made.`,
        });
      }
    }
  }

  // ── Wave 516: REVELATION_RELATIONSHIP_AFTERMATH_VOID, REVELATION_CLOCK_AFTERMATH_VOID,
  //              REVELATION_SEED_AFTERMATH_VOID ──────────────────────────────────────────────────

  // REVELATION_RELATIONSHIP_AFTERMATH_VOID (sequence/aftermath × revelation → relationship-shift
  // aftermath, n≥8, ≥2 qualifying revelation scenes [revelation non-null, pos < n-1], ≥2 scenes
  // with non-empty relationshipShifts globally, none of the scenes immediately following a revelation
  // carry a non-empty relationshipShifts): A disclosure changes what characters know about each
  // other, yet no relationship bond shifts in the scene that follows. The revelation event is the
  // moment most primed to alter how characters relate — a revealed truth reframes every prior
  // interaction and pressures each relationship in its wake. When the scene after every disclosure
  // carries no relationship shift, the belief layer and the relational layer are temporally
  // decoupled: revelations are absorbed in isolation, never rippling into the bonds that define
  // the story's emotional architecture. Distinctness: REVELATION_RELATIONSHIP_DECOUPLED (Wave 309:
  // co-occurrence × same scene — the revelation scene itself has no relationship shift; this fires
  // when the FOLLOWING scene has no shift — the aftermath direction, one temporal step later).
  // ASSERTION_AFTERMATH_VOID (Wave 418: assertion trigger, not revelation; different trigger channel).
  // REVELATION_RELATIONSHIP_PEAK_ABSENT (Wave 488: single-peak isolation — the specific peak
  // relationship scene has no revelation; this checks the aftermath direction across all qualifying
  // revelations, not just the peak).
  {
    const n516a = records.length;
    if (n516a >= 8) {
      const qualRev516a = (records as any[])
        .map((r, pos) => ({ r, pos }))
        .filter(({ r, pos }) =>
          r.revelation !== null && r.revelation !== '' && r.revelation !== undefined && pos < n516a - 1,
        );
      const relShiftScenes516a = (records as any[]).filter(
        r => ((r.relationshipShifts ?? []) as any[]).length > 0,
      );
      if (qualRev516a.length >= 2 && relShiftScenes516a.length >= 2) {
        const anyRelAftermath516a = qualRev516a.some(({ pos }) => {
          const next = (records as any[])[pos + 1];
          return ((next.relationshipShifts ?? []) as any[]).length > 0;
        });
        if (!anyRelAftermath516a) {
          issues.push({
            location: `${qualRev516a.length} revelation scene(s) — none followed by a relationship shift`,
            rule: 'REVELATION_RELATIONSHIP_AFTERMATH_VOID',
            severity: 'minor',
            description: `The script has ${qualRev516a.length} revelation scenes and ${relShiftScenes516a.length} scenes with relationship shifts, but no revelation is followed immediately by a scene in which a bond changes. A disclosure is the moment most primed to alter how characters relate — a revealed truth reframes every prior interaction and pressures each relationship in its wake. When the scene after every disclosure carries no relationship shift, revelations are absorbed in emotional isolation: the belief layer and the relational layer are temporally decoupled, and the story loses the chain of cause-and-effect that makes disclosure feel consequential.`,
            suggestedFix: `After at least one revelation scene, let the next scene show a relationship shift — a bond growing closer, more distant, or fundamentally altered by what was just revealed. A character who learns a truth should act differently toward the person who withheld it, lied about it, or was unaware of it. The scene immediately following a disclosure is the story's most natural moment to show that the reveal mattered to the people involved.`,
          });
        }
      }
    }
  }

  // REVELATION_CLOCK_AFTERMATH_VOID (sequence/aftermath × revelation → clock aftermath, n≥8, ≥2
  // qualifying revelation scenes [revelation non-null, pos < n-1], ≥2 scenes with clockRaised=true
  // globally, none of the scenes immediately following a revelation have clockRaised=true): Every
  // disclosure passes without a deadline being raised in the next beat. A revelation can be the
  // trigger that creates urgency — a truth is unveiled that forces action before time runs out.
  // When no revelation is followed by a raised clock, the disclosure engine and the urgency engine
  // are temporally decoupled: information surfaces without ever precipitating a deadline that would
  // give the revelation consequence under time pressure. Distinctness: REVELATION_CLOCK_DECOUPLED
  // (Wave 362: co-occurrence × same scene — the revelation scene itself lacks clockRaised; this
  // fires when the FOLLOWING scene has no clockRaised — the aftermath direction). TOLD_BELIEF_CLOCK_
  // DECOUPLED (Wave 376: assertion trigger, clock co-occurrence in same scene — different trigger
  // and different temporal direction). The first check examining clock aftermath specifically
  // conditioned on a revelation trigger.
  {
    const n516b = records.length;
    if (n516b >= 8) {
      const qualRev516b = (records as any[])
        .map((r, pos) => ({ r, pos }))
        .filter(({ r, pos }) =>
          r.revelation !== null && r.revelation !== '' && r.revelation !== undefined && pos < n516b - 1,
        );
      const clockScenes516b = (records as any[]).filter(r => r.clockRaised === true);
      if (qualRev516b.length >= 2 && clockScenes516b.length >= 2) {
        const anyClockAftermath516b = qualRev516b.some(({ pos }) => {
          const next = (records as any[])[pos + 1];
          return next.clockRaised === true;
        });
        if (!anyClockAftermath516b) {
          issues.push({
            location: `${qualRev516b.length} revelation scene(s) — none followed by a raised clock`,
            rule: 'REVELATION_CLOCK_AFTERMATH_VOID',
            severity: 'minor',
            description: `The script has ${qualRev516b.length} revelation scenes and ${clockScenes516b.length} clock-raising scenes, but no revelation is immediately followed by a deadline. Revelations are a natural catalyst for urgency: a truth unveiled often forces action before time runs out — the disclosure creates a window of consequence that closes. When the scene after every revelation carries no clock raise, the disclosure and urgency engines are temporally decoupled: information surfaces without ever precipitating the time pressure that would give it dramatic consequence.`,
            suggestedFix: `After at least one revelation, let the next scene raise a clock or deadline — a character who learns a truth should feel its urgency immediately, acting before the window of consequence closes. Even a soft deadline ("we need to settle this before the meeting tomorrow") transforms a disclosure from an information event into a dramatic driver with a ticking clock.`,
          });
        }
      }
    }
  }

  // REVELATION_SEED_AFTERMATH_VOID (sequence/aftermath × revelation → seed aftermath, n≥8, ≥2
  // qualifying revelation scenes [revelation non-null, pos < n-1], ≥2 scenes with seededClueIds
  // non-empty globally, none of the scenes immediately following a revelation have seededClueIds
  // non-empty): Every disclosure passes without a new clue being planted in the next scene. The
  // most powerful mystery engines operate as a chain: a revelation resolves one unknown while the
  // next scene plants the seed of the next. When no revelation is followed by a seed, the
  // disclosure event closes a loop without reopening a new one — the audience gets an answer
  // without being primed toward a new question. Distinctness: REVELATION_SEED_DECOUPLED (Wave 502:
  // co-occurrence × same scene — revelation and seed never appear in the SAME scene; this checks
  // the FOLLOWING scene — the aftermath direction, one temporal step later). REVELATION_CURIOSITY_
  // AFTERMATH_VOID (Wave 502: aftermath direction × revelation × curiosity channel — checks average
  // curiosityDelta of the following scenes; this checks a specific structural signal: seededClueIds
  // in the following scene, not the curiosity metric). PAYOFF_SEED_AFTERMATH_ABSENT in payoff.ts
  // (payoff trigger → seed aftermath — a different trigger).
  {
    const n516c = records.length;
    if (n516c >= 8) {
      const qualRev516c = (records as any[])
        .map((r, pos) => ({ r, pos }))
        .filter(({ r, pos }) =>
          r.revelation !== null && r.revelation !== '' && r.revelation !== undefined && pos < n516c - 1,
        );
      const seedScenes516c = (records as any[]).filter(
        r => ((r.seededClueIds ?? []) as any[]).length > 0,
      );
      if (qualRev516c.length >= 2 && seedScenes516c.length >= 2) {
        const anySeedAftermath516c = qualRev516c.some(({ pos }) => {
          const next = (records as any[])[pos + 1];
          return ((next.seededClueIds ?? []) as any[]).length > 0;
        });
        if (!anySeedAftermath516c) {
          issues.push({
            location: `${qualRev516c.length} revelation scene(s) — none followed by a seeded clue`,
            rule: 'REVELATION_SEED_AFTERMATH_VOID',
            severity: 'minor',
            description: `The script has ${qualRev516c.length} revelation scenes and ${seedScenes516c.length} clue-seeding scenes, but no revelation is followed immediately by a scene that plants a new clue. The most effective mystery engines operate as a chain: a disclosure resolves one unknown while the next scene plants the seed of the next question. When no revelation is followed by a fresh seed, the disclosure event closes a loop without reopening a new one — the audience receives an answer without being primed toward the next unknown. Each resolution that is not paired with a new seed drains the script's forward momentum.`,
            suggestedFix: `After at least one revelation, let the next scene plant a new seed — a detail, object, or moment of behavior that the audience will want to understand. The scene immediately after a disclosure is the most receptive to a new mystery seed: the audience's curiosity has just been satisfied and is now hungry again. A revelation without a following seed treats closure as the end of the mystery rather than the beginning of the next layer.`,
          });
        }
      }
    }
  }

  // ── Wave 530: ASSERTION_POSITIVE_DECOUPLED, POSITIVE_SCENE_REVELATION_VOID, ASSERTION_TURN_AFTERMATH_VOID ──

  // ASSERTION_POSITIVE_DECOUPLED (co-occurrence × positive emotion × assertion, n≥8,
  // ≥2 assertion scenes, ≥2 positive-emotion scenes, no assertion scene has emotionalShift=
  // 'positive'): The story has ≥2 scenes where a character asserts a belief and ≥2 scenes
  // with positive emotional charge, but no scene is both. Assertions never land in a moment
  // of triumph, joy, or hope — claims are voiced only in neutral or negative emotional
  // registers. The most powerfully dramatic assertions are sometimes made precisely at a
  // moment of victory — a character whose belief is confirmed by success, who declares their
  // position as the universe appears to agree, or who makes a claim in a rare moment of
  // genuine confidence. When assertions are systematically absent from the story's positive
  // emotional moments, the belief layer is quarantined from the narrative's joyful register.
  // Co-occurrence/decoupling mode × positive-valence × assertion channel. Distinct from
  // ASSERTION_NEGATIVE_DECOUPLED (Wave 488: the negative-valence complement — this checks
  // the positive register), TOLD_BELIEF_EMOTIONAL_FLATLINE (Wave 334: all assertion scenes
  // are emotionally neutral — fires when assertions have no charge at all; this fires
  // specifically when the charge exists but is always negative or neutral, never positive),
  // POSITIVE_SCENE_REVELATION_VOID (below: same valence channel but revelation signal, not
  // assertion).
  if (records.length >= 8) {
    const assertionSceneSet530a = new Set(toldBeliefs.map(t => t.sceneIdx));
    const assertionScenes530a = (records as any[]).filter(r => assertionSceneSet530a.has(r.sceneIdx));
    const posScenes530a = (records as any[]).filter(r => r.emotionalShift === 'positive');
    if (assertionScenes530a.length >= 2 && posScenes530a.length >= 2) {
      const anyPosAssertion530a = assertionScenes530a.some(r => r.emotionalShift === 'positive');
      if (!anyPosAssertion530a) {
        issues.push({
          location: `${assertionScenes530a.length} assertion scene(s) — none coincides with a positive emotional shift`,
          rule: 'ASSERTION_POSITIVE_DECOUPLED',
          severity: 'minor',
          description: `The script has ${assertionScenes530a.length} assertion scenes and ${posScenes530a.length} scenes with positive emotional shifts, but no scene is both. Assertions never land in a moment of triumph, confidence, or hope — claims are voiced only when the story is emotionally neutral or negative. The dramatically powerful assertion made from a position of genuine conviction — a character declaring their belief precisely as the universe appears to confirm it, or staking a claim in a rare moment of joy — is absent. When assertions are systematically quarantined from the story's positive emotional moments, the belief layer can only speak in tones of doubt, defeat, or neutrality.`,
          suggestedFix: `Place at least one assertion in a scene with positive emotional charge — a character who declares their belief in a moment of triumph or hope, who makes a claim because circumstances are briefly in their favor, or who states their position from a moment of genuine confidence rather than from crisis or neutrality. An assertion made from a positive register has a different dramatic weight: it can later be undone by the story, creating a fall that is all the more powerful because the character spoke from a moment of certainty.`,
        });
      }
    }
  }

  // POSITIVE_SCENE_REVELATION_VOID (co-occurrence × positive emotion × revelation absence,
  // n≥8, ≥2 revelation scenes, ≥2 positive-emotion scenes, no positive-emotion scene
  // carries a revelation): Every revelation lands in a neutral or negative emotional scene
  // while positive-emotion scenes carry no disclosure. Revelations that only arrive in
  // moments of failure or neutrality tell the audience that learning the truth is always
  // costly or flatly delivered — the discovery register is systematically negative or
  // blank. A revelation in a positive-emotion scene creates a particular dramatic texture:
  // a truth that arrives at a moment of joy, a disclosure that the character receives as
  // good news, or a discovery that briefly appears to confirm a hope before being recontextualized.
  // The permanent absence of this pairing drains the revelation register of tonal variety.
  // Co-occurrence/decoupling mode × positive-valence × revelation channel. Distinct from
  // NEGATIVE_SCENE_REVELATION_VOID (Wave 446: no revelation in negative scenes — the negative
  // side; this is the positive-valence complement), REVELATION_DRAMA_VACUUM (Wave 281: all
  // revelation scenes are emotionally flat — different population: the revelation scenes
  // themselves are neutral; this fires when positive-emotion scenes contain no revelation —
  // the positive-emotion scenes are disclosure-free), ASSERTION_POSITIVE_DECOUPLED (above:
  // same valence channel but assertion signal, not revelation).
  if (records.length >= 8) {
    const revScenes530b = (records as any[]).filter(r =>
      r.revelation !== null && r.revelation !== undefined && r.revelation !== '',
    );
    const posScenes530b = (records as any[]).filter(r => r.emotionalShift === 'positive');
    if (revScenes530b.length >= 2 && posScenes530b.length >= 2) {
      const anyPosRev530b = posScenes530b.some(r =>
        r.revelation !== null && r.revelation !== undefined && r.revelation !== '',
      );
      if (!anyPosRev530b) {
        issues.push({
          location: `${posScenes530b.length} positive-emotion scene(s) — none carries a revelation`,
          rule: 'POSITIVE_SCENE_REVELATION_VOID',
          severity: 'minor',
          description: `The script has ${revScenes530b.length} revelation scenes and ${posScenes530b.length} scenes with positive emotional shifts, but no scene is both. Every disclosure arrives in a neutral or negative emotional context — learning the truth is always presented as flat or costly. Revelations that only land in negative or neutral scenes train the audience to associate disclosure with failure, which narrows the story's tonal range and prevents the particular dramatic texture of a positive revelation: the truth that arrives as welcome news, the discovery that briefly confirms a hope, or the disclosure that gives a character a moment of genuine elation before recontextualization strips it away.`,
          suggestedFix: `Give at least one revelation to a scene with positive emotional charge — a disclosure that the character receives as joyful news, a truth that emerges in a moment of triumph, or a revelation that arrives alongside a genuine win. The subsequent dramatic movement (where the revelation is complicated or reversed) is all the more powerful when the revelation itself was received with hope.`,
        });
      }
    }
  }

  // ASSERTION_TURN_AFTERMATH_VOID (sequence/aftermath × dramatic turn × assertion trigger,
  // n≥8, ≥2 qualifying assertion scenes [pos < n-2], ≥2 turn scenes globally, no qualifying
  // assertion followed by a dramatic turn in the next 2 scenes): Every scene where a character
  // asserts a belief passes without the story pivoting in the next two scenes — claims never
  // trigger reversals in their wake. An assertion at its most dramatic is a provocation: a
  // character stakes a position, and the story responds by immediately challenging or reversing
  // it. When no assertion is followed within two scenes by a dramatic turn, the belief layer
  // and the plot's reversal engine operate in structural isolation — declarations go unanswered
  // by the narrative. Sequence/aftermath mode × dramatic-turn aftermath × assertion trigger.
  // Distinct from TOLD_BELIEF_DRAMATIC_TURN_DECOUPLED (Wave 348: co-occurrence — turn and
  // assertion never IN THE SAME scene; this checks whether a turn follows within 2 scenes —
  // aftermath direction, one temporal step later), ASSERTION_AFTERMATH_VOID (Wave 418:
  // assertion → no revelation/relationship/suspense in 2 scenes — different aftermath signals),
  // ASSERTION_CAUSAL_VACUUM (Wave 460: backward-cause — nothing precedes assertion; this checks
  // what FOLLOWS an assertion — opposite temporal direction).
  if (records.length >= 8) {
    const assertionIdxs530c = [...new Set(toldBeliefs.map(t => t.sceneIdx))];
    const turnScenes530c = (records as any[]).filter(r =>
      (r.dramaticTurn ?? 'nothing') !== 'nothing' && r.dramaticTurn !== '',
    );
    const qualAssertionPositions530c = assertionIdxs530c
      .map(idx => (records as any[]).findIndex(r => r.sceneIdx === idx))
      .filter(pos => pos >= 0 && pos < records.length - 2);
    if (qualAssertionPositions530c.length >= 2 && turnScenes530c.length >= 2) {
      const anyAssertionFollowedByTurn530c = qualAssertionPositions530c.some(pos => {
        const next1 = (records as any[])[pos + 1];
        const next2 = (records as any[])[pos + 2];
        return (
          (next1 && (next1.dramaticTurn ?? 'nothing') !== 'nothing' && next1.dramaticTurn !== '') ||
          (next2 && (next2.dramaticTurn ?? 'nothing') !== 'nothing' && next2.dramaticTurn !== '')
        );
      });
      if (!anyAssertionFollowedByTurn530c) {
        issues.push({
          location: `${qualAssertionPositions530c.length} assertion scene(s) — none followed by a dramatic turn within 2 scenes`,
          rule: 'ASSERTION_TURN_AFTERMATH_VOID',
          severity: 'minor',
          description: `None of the story's ${qualAssertionPositions530c.length} assertion scenes is followed by a dramatic turn (reversal or pivot) within the next two scenes, even though ${turnScenes530c.length} turns exist elsewhere. An assertion at its most powerful is a provocation: a character stakes a position, and the narrative responds by immediately reversing circumstances, forcing the declared belief to be confronted. When no assertion triggers a turn in its wake, the belief layer and the story's reversal engine operate in permanent structural isolation — characters declare positions that the plot ignores rather than answers, and turns arrive without a character's stated belief to challenge.`,
          suggestedFix: `After at least one assertion, place a dramatic turn within two scenes — a reversal that either validates or challenges the declared belief. The most powerful structure is: character asserts ("this will work"), then the story pivots ("or does it?"), forcing the character to either maintain or abandon their position in light of what just changed. This turn-as-response makes the assertion a dramatic stake rather than an exposition delivery.`,
        });
      }
    }
  }

  // ── Wave 544: REVELATION_CLOSING_QUARTER_ABSENT, ASSERTION_DROUGHT,
  //              TURN_REVELATION_AFTERMATH_VOID ──────────────────────────────────────────────────

  // REVELATION_CLOSING_QUARTER_ABSENT (zone presence/absence × revelation × closing 25%, n≥8,
  // ≥3 revelations globally, 0 in the final 25% while ≥2 exist in the first 75%): The story's
  // resolution zone is completely revelation-free — every disclosure occurs before the 75% mark
  // and the climax/denouement delivers nothing new. A story that stops disclosing before its
  // resolution means the audience enters the finale already knowing everything the script intends
  // them to know: the climax is purely behavioral, the denouement has no fresh truth to settle,
  // and the closing quarter produces no epistemic surprise. The most powerful revelation placement
  // is often in the closing quarter — the final disclosure recontextualizes what came before,
  // gives the resolution its epistemic weight, or delivers the surprise that makes the whole
  // preceding narrative retrospectively more meaningful. Zone presence/absence mode × revelation
  // channel × closing zone. Distinct from TOLD_BELIEF_ACT_3_ABSENT (Wave 362: assertion channel
  // in Act 3 — this checks revelation, not assertion), REVELATION_FINAL_ACT_ONLY (Wave 267: fires
  // when ALL revelations are confined to the final quarter — the opposite problem: this fires when
  // the final quarter is completely revelation-free), REVELATION_TEMPORAL_CLUSTER (Wave 488:
  // distribution/timing × thirds — fires when >75% concentrate in one third, not when a specific
  // zone is completely empty of revelations).
  if (records.length >= 8) {
    const closingStart544a = Math.floor(records.length * 0.75);
    const allRevIdxs544a = (records as any[])
      .map((r, i) => ({ r, i }))
      .filter(({ r }) => r.revelation !== null && r.revelation !== '' && r.revelation !== undefined);
    const closingRevs544a = allRevIdxs544a.filter(({ i }) => i >= closingStart544a);
    const earlyRevs544a = allRevIdxs544a.filter(({ i }) => i < closingStart544a);
    if (allRevIdxs544a.length >= 3 && closingRevs544a.length === 0 && earlyRevs544a.length >= 2) {
      issues.push({
        location: `${allRevIdxs544a.length} revelation(s) in first 75%, 0 in closing 25% (scenes ${closingStart544a}–${records.length - 1})`,
        rule: 'REVELATION_CLOSING_QUARTER_ABSENT',
        severity: 'minor',
        description: `The script has ${allRevIdxs544a.length} revelation scenes, all occurring before the 75% mark — the closing quarter (scenes ${closingStart544a}–${records.length - 1}) contains no disclosure. The audience enters the finale already knowing everything the script has decided to share: the climax is purely behavioral (characters act on prior knowledge), and the denouement has no fresh truth to settle. A revelation in the closing quarter is among the most structurally powerful placements: the final disclosure recontextualizes what came before, delivers the surprise that makes all preceding scenes retrospectively more meaningful, or gives the resolution its epistemic anchor. Without it, the closing quarter can only work with what the audience already knows — a structural limitation that removes an entire register of dramatic effect from the finale.`,
        suggestedFix: `Move or add a revelation into the closing quarter (scenes ${closingStart544a}–${records.length - 1}): a disclosure that recontextualizes the climax, a final truth that answers the central question, or a late revelation that gives the resolution its emotional core. The most effective closing-quarter revelation is one the audience feels they should have anticipated but didn't — one that retrospectively illuminates all preceding scenes and makes the ending feel both surprising and inevitable.`,
      });
    }
  }

  // ASSERTION_DROUGHT (run-based × assertion-absence × assertion-specific channel, n≥8,
  // ≥3 assertion scenes, max consecutive non-assertion gap ≥7): An unbroken run of ≥7 scenes
  // passes without any character asserting a belief, claim, or position — the story's belief-
  // battle layer goes completely silent for a sustained stretch while assertions exist elsewhere.
  // The belief layer's function is to register each character's current model of the world:
  // a drought of 7+ scenes means the audience passes an extended sequence without any update
  // to the story's propositional map. Events occur but no character frames them within their
  // worldview — the epistemic texture goes dark for the longest stretch of the story. Run-based
  // × assertion-absence. Distinct from TOLD_BELIEF_DROUGHT (Wave 309: ≥5 consecutive scenes
  // with NO assertion OR revelation combined — a single revelation satisfies that check while
  // the assertion drought continues; this fires on the assertion channel alone), REVELATION_DROUGHT
  // (Wave 446: ≥6 consecutive with no revelation — different channel), ASSERTION_SINGLETON_RUN
  // (Wave 432: no two consecutive assertion scenes ever appear — the over-dispersion check that
  // fires when the gaps exist without requiring a specific minimum length).
  if (records.length >= 8) {
    const assertionSceneIdxSet544b = new Set(toldBeliefs.map(t => t.sceneIdx));
    if (assertionSceneIdxSet544b.size >= 3) {
      let maxGap544b = 0, curGap544b = 0;
      for (const r of records as any[]) {
        if (assertionSceneIdxSet544b.has(r.sceneIdx)) {
          if (curGap544b > maxGap544b) maxGap544b = curGap544b;
          curGap544b = 0;
        } else {
          curGap544b++;
        }
      }
      if (curGap544b > maxGap544b) maxGap544b = curGap544b;
      if (maxGap544b >= 7) {
        issues.push({
          location: `Assertion drought — ${maxGap544b} consecutive scenes carry no character assertion`,
          rule: 'ASSERTION_DROUGHT',
          severity: 'minor',
          description: `An unbroken run of ${maxGap544b} consecutive scenes passes without any character asserting a belief, claim, or position — the story's epistemic layer goes dark for its longest stretch while ${assertionSceneIdxSet544b.size} assertion scenes exist elsewhere. Character assertions are the mechanism by which the audience tracks each character's current model of the world: claims staked that the story will test, contradict, or confirm. A ${maxGap544b}-scene drought means the audience passes an extended sequence without any propositional update. Events occur but no character states what those events mean within their worldview — the belief-battle layer is absent from the story's longest uninterrupted run. The audience may follow what is happening while losing track of what anyone believes about what is happening.`,
          suggestedFix: `Introduce at least one assertion within the ${maxGap544b}-scene drought — a character stating a belief about what is happening, why it is happening, or what will happen next. The assertion doesn't need to be a major declaration: a small claim about intention, a position taken in response to an event, or a character stating what they believe about another character all restore the belief-layer's presence. Breaking the drought with a claim that will later be tested or proven wrong adds the most structural value.`,
        });
      }
    }
  }

  // TURN_REVELATION_AFTERMATH_VOID (sequence/aftermath × dramatic turn → revelation aftermath,
  // n≥8, ≥2 qualifying turn scenes [pos < n-2], ≥2 revelation scenes globally, no qualifying
  // turn followed by a revelation in the next 2 scenes): Every story pivot passes without
  // triggering a disclosure in the immediate aftermath — reversals and revelations operate in
  // structural isolation. A dramatic turn at its most productive is also an epistemic event:
  // the reversal exposes what the pre-turn state was concealing, the changed circumstances reveal
  // a truth that was previously unavailable, or the pivot creates the conditions under which a
  // secret can finally be disclosed. When no turn is followed by a revelation within two scenes,
  // every reversal plays out without epistemic consequence — plot changes without learning. Turns
  // and revelations become two separate mechanical systems rather than the interlocked engine of
  // a story that discovers what it means through what it does. Sequence/aftermath mode × dramatic-
  // turn trigger → revelation aftermath. Distinct from ASSERTION_TURN_AFTERMATH_VOID (Wave 530:
  // assertion as trigger → turn as aftermath — different direction and trigger), REVELATION_
  // DRAMATIC_TURN_DECOUPLED (Wave 390: co-occurrence × same scene — turn and revelation never
  // coincide; this checks whether revelation follows within 2 scenes, a different window and
  // direction), REVELATION_ASSERTION_DISCONNECT (Wave 348: assertion → revelation aftermath —
  // assertion as trigger, not turn).
  if (records.length >= 8) {
    const revScenes544c = (records as any[]).filter(r =>
      r.revelation !== null && r.revelation !== '' && r.revelation !== undefined,
    );
    const qualTurnPositions544c = (records as any[])
      .map((r, i) => ({ r, i }))
      .filter(({ r, i }) =>
        (r.dramaticTurn ?? 'nothing') !== 'nothing' && r.dramaticTurn !== '' &&
        i < records.length - 2,
      )
      .map(({ i }) => i);
    if (qualTurnPositions544c.length >= 2 && revScenes544c.length >= 2) {
      const anyTurnFollowedByRev544c = qualTurnPositions544c.some(pos => {
        const next1 = (records as any[])[pos + 1];
        const next2 = (records as any[])[pos + 2];
        return (
          (next1 && next1.revelation !== null && next1.revelation !== '' && next1.revelation !== undefined) ||
          (next2 && next2.revelation !== null && next2.revelation !== '' && next2.revelation !== undefined)
        );
      });
      if (!anyTurnFollowedByRev544c) {
        issues.push({
          location: `${qualTurnPositions544c.length} qualifying turn(s) — none followed by a revelation within 2 scenes`,
          rule: 'TURN_REVELATION_AFTERMATH_VOID',
          severity: 'minor',
          description: `None of the story's ${qualTurnPositions544c.length} dramatic turn scenes is followed by a revelation within the next two scenes, even though ${revScenes544c.length} revelations exist elsewhere. A dramatic turn at its most powerful is also an epistemic event: the reversal exposes what the pre-turn state was concealing, the changed circumstances make a previously unavailable truth visible, or the pivot creates the pressure under which a hidden reality finally surfaces. When no turn is followed by a revelation within two scenes, every reversal plays out without epistemic consequence — the plot changes direction but the audience learns nothing new from the change. Turns and revelations become two separate systems: the story's structure pivots in one place, and its epistemic events occur in entirely different moments, never reinforcing each other.`,
          suggestedFix: `After at least one dramatic turn, let the next one or two scenes carry a revelation — a truth that the turn has made available, a secret that the reversal has exposed, or a disclosure that could only emerge because circumstances have changed. The revelation need not be enormous: even a small disclosure that the pre-turn state couldn't carry gives the structural pivot an epistemic dimension, making it feel like the reversal changed what the story knows as well as what it does.`,
        });
      }
    }
  }

  // ── Wave 558: ASSERTION_EMOTIONAL_AFTERMATH_FLAT, REVELATION_CURIOSITY_PEAK_EARLY,
  //              SEED_TEMPORAL_CLUSTER ──────────────────────────────────────────────────────────
  {
    // ASSERTION_EMOTIONAL_AFTERMATH_FLAT (average/aggregate × assertion → emotional aftermath,
    // n≥8, ≥3 qualifying assertion scenes [pos<n-1], all scenes immediately following an assertion
    // have emotionalShift 'neutral' or null): Every claim a character makes passes without
    // generating an emotional charge in the scene immediately after. The function of an assertion
    // is to stake a position that forces others to react — when a character declares that something
    // is true, the surrounding world should emotionally reorganize in response. When all aftermath
    // scenes are neutral, assertions arrive without consequence: the claim lands, nothing shifts,
    // and the next scene operates as though the position was never taken. Average/aggregate mode ×
    // assertion trigger × emotional aftermath. Distinct from TOLD_BELIEF_EMOTIONAL_FLATLINE (Wave
    // 334: the assertion SCENE ITSELF carries neutral emotionalShift — the claim arrives without
    // tone in the same scene; this checks the scene AFTER, not the scene of the assertion),
    // REVELATION_EMOTIONAL_AFTERMATH_FLAT (Wave 474: revelation trigger, not assertion — the
    // revelation-channel aftermath mirror of this check), ASSERTION_CURIOSITY_AFTERMATH_VOID
    // (Wave 474: curiosity channel aftermath — checks curiosityDelta of following scene, not
    // emotionalShift), TOLD_BELIEF_SUSPENSE_DECOUPLED (Wave 334: co-occurrence × suspenseDelta in
    // assertion scene itself — different signal and position).
    if (records.length >= 8) {
      const assertionSceneSet558a = new Set(toldBeliefs.map(t => t.sceneIdx));
      const qualAssertPos558a = (records as any[])
        .map((r, pos) => ({ r, pos }))
        .filter(({ r, pos }) => assertionSceneSet558a.has(r.sceneIdx) && pos < records.length - 1)
        .map(({ pos }) => pos);
      if (qualAssertPos558a.length >= 3) {
        const allNeutralAftermath558a = qualAssertPos558a.every(pos => {
          const next = (records as any[])[pos + 1];
          return next.emotionalShift === 'neutral' || next.emotionalShift == null;
        });
        if (allNeutralAftermath558a) {
          issues.push({
            location: `${qualAssertPos558a.length} qualifying assertion scene(s) — all followed by emotionally neutral scenes`,
            rule: 'ASSERTION_EMOTIONAL_AFTERMATH_FLAT',
            severity: 'minor',
            description: `Every character assertion (${qualAssertPos558a.length} qualifying instances) is followed immediately by an emotionally neutral scene — claims arrive without charging what comes after. When a character stakes a position, the surrounding world should reorganize emotionally in response: others react with anger or relief, the tension shifts, or the next scene opens in a register shaped by the claim that just landed. When all assertion aftermaths are emotionally neutral, the belief-battle layer is structurally quarantined from the emotional layer — characters assert things, nothing emotionally responds, and the propositional world of the story is decoupled from its affective world.`,
            suggestedFix: `After at least one assertion, let the immediately following scene open in an emotionally non-neutral state: a scene with a positive or negative emotionalShift that has been generated by the claim that came before. The assertion need not be the sole cause of the emotional charge — the story can layer causes — but the emotional aftermath of a claim is where the audience feels whether the assertion mattered.`,
          });
        }
      }
    }

    // REVELATION_CURIOSITY_PEAK_EARLY (single-peak isolation × revelation × curiosityDelta
    // position, n≥8, ≥3 revelation scenes with curiosityDelta>0, the revelation with the highest
    // curiosityDelta is in the first 25% of scenes while ≥2 curiosity-generating revelations
    // follow): The script's most curiosity-rich disclosure comes before the audience has fully
    // invested in the story, while the later revelations that follow generate less epistemic
    // appetite. A high-curiosityDelta revelation landing early is a structural front-load: the
    // most powerful epistemic hook fires before the stakes are established, making the rest of
    // the disclosure layer feel anticlimactic by comparison. Single-peak isolation mode ×
    // revelation channel × curiosityDelta. Distinct from REVELATION_CURIOSITY_PEAK_ABSENT (Wave
    // 362: the scene with the highest curiosityDelta is NOT a revelation scene at all — a different
    // failure mode where the peak belongs to a non-revelation; this fires when the peak IS a
    // revelation but it is early), REVELATION_CURIOSITY_DECOUPLED (Wave 323: average/aggregate ×
    // all revelation curiosityDelta ≤ 0 — fires when ALL revelations generate no curiosity; this
    // fires when one revelation generates the MOST curiosity and it is early), REVELATION_TEMPORAL_
    // CLUSTER (Wave 488: distribution/timing × revelation positions — checks where revelations
    // cluster, not which has highest curiosityDelta), REVELATION_CURIOSITY_AFTERMATH_VOID (Wave
    // 502: aftermath × following scene's curiosityDelta — different channel and direction).
    if (records.length >= 8) {
      const revWithCuriosity558b = (records as any[])
        .map((r, pos) => ({ r, pos }))
        .filter(({ r }) =>
          r.revelation !== null && r.revelation !== undefined && r.revelation !== '' &&
          (r.curiosityDelta ?? 0) > 0,
        );
      if (revWithCuriosity558b.length >= 3) {
        const maxCuriosity558b = Math.max(...revWithCuriosity558b.map(x => x.r.curiosityDelta ?? 0));
        const peakRev558b = revWithCuriosity558b.find(x => (x.r.curiosityDelta ?? 0) === maxCuriosity558b)!;
        const earlyThreshold558b = Math.floor(records.length * 0.25);
        const laterRevCuriosity558b = revWithCuriosity558b.filter(x => x.pos > peakRev558b.pos);
        if (peakRev558b.pos < earlyThreshold558b && laterRevCuriosity558b.length >= 2) {
          issues.push({
            location: `Peak-curiosity revelation at scene ${peakRev558b.pos} (first 25%) while ${laterRevCuriosity558b.length} curiosity-generating revelation(s) follow`,
            rule: 'REVELATION_CURIOSITY_PEAK_EARLY',
            severity: 'minor',
            description: `The revelation with the highest curiosityDelta (${maxCuriosity558b}) appears at scene ${peakRev558b.pos} — within the first 25% of the script — while ${laterRevCuriosity558b.length} other curiosity-generating revelation(s) follow with lower curiosityDelta. The script's most epistemically appetite-generating disclosure fires before the audience has fully invested in the story, while the disclosures that follow generate diminishing curiosity. A high-curiosity revelation is most powerful when it arrives at a point where the audience cares deeply about what is being discovered — typically in Act 2 or at a structural pivot when stakes are established. An early-peak revelation hooks the audience but delivers the best epistemic hook before the world is fully inhabited, making subsequent disclosures feel comparatively flat.`,
            suggestedFix: `Move the highest-curiosity revelation later in the script, or increase the curiosityDelta of the later revelations so the disclosure layer builds rather than peaks and declines. The most powerful revelation schedule generates escalating curiosity: each disclosure opens more questions than it closes, with the most curiosity-generating revelation arriving at the moment of greatest dramatic investment — typically at or just past the midpoint.`,
          });
        }
      }
    }

    // SEED_TEMPORAL_CLUSTER (distribution/timing × seed channel × thirds, n≥9, ≥3 scenes with
    // seededClueIds non-empty, >75% of seeded scenes in one structural third): Physical evidence
    // planting is structurally ghettoized — clue-seeding clusters into one positional zone rather
    // than distributing through the narrative as dramatic pressure accumulates. A well-managed
    // mystery seeds clues throughout the story in response to the scene's emotional and structural
    // pressure: a seed in Act 1 establishes the landscape, one in Act 2 deepens the implication,
    // one near the climax creates anticipation. When >75% of seeds cluster in one third, the
    // audience receives planted evidence in one sustained burst and then waits with no new
    // material for the rest of the zone. Distribution/timing mode × seed channel. Distinct from
    // ASSERTION_TEMPORAL_CLUSTER (Wave 474: assertion channel — same analytical mode, different
    // narrative register: verbal claims not physical evidence) and REVELATION_TEMPORAL_CLUSTER
    // (Wave 488: revelation channel — same mode, different channel: disclosures not plantings),
    // REVELATION_SEED_DECOUPLED (Wave 502: co-occurrence × revelation × seed in same scene —
    // different mode), REVELATION_SEED_AFTERMATH_VOID (Wave 516: aftermath × revelation → seed —
    // sequence/aftermath mode, not distribution/timing). First distribution/timing check
    // specifically on the seed planting channel.
    if (records.length >= 9) {
      const seededPositions558c = (records as any[])
        .map((r, i) => ({ r, i }))
        .filter(({ r }) => ((r.seededClueIds ?? []) as string[]).length > 0)
        .map(({ i }) => i);
      if (seededPositions558c.length >= 3) {
        const third558c = Math.floor(records.length / 3);
        const firstZone558c = seededPositions558c.filter(i => i < third558c).length;
        const midZone558c = seededPositions558c.filter(i => i >= third558c && i < 2 * third558c).length;
        const lastZone558c = seededPositions558c.filter(i => i >= 2 * third558c).length;
        const maxZone558c = Math.max(firstZone558c, midZone558c, lastZone558c);
        if (maxZone558c / seededPositions558c.length > 0.75) {
          const zoneName558c = firstZone558c === maxZone558c ? 'opening' : midZone558c === maxZone558c ? 'middle' : 'closing';
          issues.push({
            location: `${maxZone558c}/${seededPositions558c.length} seed scenes in the ${zoneName558c} third`,
            rule: 'SEED_TEMPORAL_CLUSTER',
            severity: 'minor',
            description: `${maxZone558c} of ${seededPositions558c.length} clue-planting scenes (${Math.round(maxZone558c / seededPositions558c.length * 100)}%) are concentrated in the ${zoneName558c} third — physical evidence is being planted in one structural burst rather than distributed through the narrative. A well-managed mystery seeds physical evidence throughout the story as dramatic pressure mounts: each planted clue establishes, deepens, or complicates the implication in response to what the audience currently knows and suspects. When seeds cluster in one zone, the other two-thirds of the story provide no material for the audience to notice, file away, or reinterpret as their understanding develops. The zones without seeds feel informationally hollow on re-watch or re-read.`,
            suggestedFix: `Redistribute at least one seed from the ${zoneName558c} cluster into each of the other structural zones. A seed in the opening zone establishes the mystery's physical landscape; one in the middle zone recontextualizes what the audience thought they understood; one near the end creates anticipation before the payoff. Three-zone seeding gives the audience new evidence to notice at each structural stage, sustaining engagement across the entire narrative rather than concentrating the evidentiary work in one phase.`,
          });
        }
      }
    }
  }

  // ── Wave 572: ASSERTION_CLOCK_AFTERMATH_VOID, ASSERTION_SEED_AFTERMATH_VOID,
  //              ASSERTION_PAYOFF_AFTERMATH_VOID ──────────────────────────────────────────────────
  // The assertion-aftermath family covers the curiosity (Wave 474), emotion (Wave 558), and
  // dramatic-turn (Wave 530) channels, and the broad ASSERTION_AFTERMATH_VOID (Wave 418) audits a
  // strict conjunction of {revelation, relationship, suspense} all going quiet. The clock, seed, and
  // payoff channels have no dedicated assertion-aftermath check at all. This wave fills those three,
  // each isolating a single output channel (and so firing even when other aftermath channels are
  // active) rather than requiring the simultaneous silence of several.

  // ASSERTION_CLOCK_AFTERMATH_VOID (sequence/aftermath × assertion → clock aftermath, n≥8, ≥2
  // qualifying assertion scenes [told belief, pos < n-1], ≥2 clock-raised scenes globally, none of
  // the scenes immediately following an assertion has clockRaised=true): Every claim a character
  // stakes passes without a deadline tightening in the next beat. A bold assertion is a natural
  // trigger for urgency — a character declares a position and the consequence is that time begins to
  // run out on acting upon it. When no assertion is ever followed by a raised clock, the belief layer
  // and the urgency engine are temporally decoupled: claims are made but never set a clock ticking on
  // their consequences. Sequence/aftermath mode × assertion trigger × clock channel. Distinct from
  // TOLD_BELIEF_CLOCK_DECOUPLED (Wave 376: co-occurrence × clock in the assertion scene ITSELF — this
  // checks the FOLLOWING scene, the aftermath direction), REVELATION_CLOCK_AFTERMATH_VOID (Wave 516:
  // revelation trigger, not assertion), ASSERTION_AFTERMATH_VOID (Wave 418: a conjunction over
  // revelation/relationship/suspense that does not include the clock channel at all — this isolates
  // clock and fires even when those other channels are active in the aftermath).
  {
    const n572a = records.length;
    if (n572a >= 8) {
      const assertSet572a = new Set(toldBeliefs.map(t => t.sceneIdx));
      const qualAssert572a = (records as any[])
        .map((r, pos) => ({ r, pos }))
        .filter(({ r, pos }) => assertSet572a.has(r.sceneIdx) && pos < n572a - 1);
      const clockScenes572a = (records as any[]).filter(r => r.clockRaised === true);
      if (qualAssert572a.length >= 2 && clockScenes572a.length >= 2) {
        const anyClockAftermath572a = qualAssert572a.some(({ pos }) => (records as any[])[pos + 1].clockRaised === true);
        if (!anyClockAftermath572a) {
          issues.push({
            location: `${qualAssert572a.length} assertion scene(s) — none followed by a raised clock`,
            rule: 'ASSERTION_CLOCK_AFTERMATH_VOID',
            severity: 'minor',
            description: `The script has ${qualAssert572a.length} qualifying assertion scenes and ${clockScenes572a.length} scenes that raise a clock, but no assertion is followed immediately by a scene in which a deadline tightens. A bold claim is a natural trigger for urgency: a character stakes a position, and the consequence is that time begins to run out on acting upon it before someone else does, or before the claim is tested. When no assertion is ever followed by a raised clock, the belief layer and the urgency engine are temporally decoupled — claims are made but never set a clock ticking on their consequences, so taking a position carries no time pressure. The propositional world and the deadline world operate in separate stretches of the story.`,
            suggestedFix: `After at least one assertion scene, let the next scene raise a clock that the claim provokes — a deadline created by the position the character just took, a window that begins to close once the claim is on the table, a countdown toward the moment the assertion will be proven or disproven. An assertion that starts a clock ticking converts a verbal stance into time-pressured stakes.`,
          });
        }
      }
    }
  }

  // ASSERTION_SEED_AFTERMATH_VOID (sequence/aftermath × assertion → seed aftermath, n≥8, ≥2
  // qualifying assertion scenes [told belief, pos < n-1], ≥2 scenes with non-empty seededClueIds
  // globally, none of the scenes immediately following an assertion plants a clue): Every claim a
  // character makes passes without a clue being seeded in the next beat. An assertion is a natural
  // springboard for foreshadowing — a character stakes a position, and the scene that follows plants
  // the evidence that will later confirm or contradict it. When no assertion is ever followed by a
  // seed, the belief layer and the foreshadowing layer are temporally decoupled: claims are made but
  // never trail planted evidence in their wake, so the audience is never invited to watch for what
  // will prove a stated belief right or wrong. Sequence/aftermath mode × assertion trigger × seed
  // channel. Distinct from TOLD_BELIEF_SEED_DECOUPLED (Wave 376: co-occurrence × seed in the
  // assertion scene ITSELF — this checks the FOLLOWING scene), REVELATION_SEED_AFTERMATH_VOID (Wave
  // 516: revelation trigger, not assertion), SEED_TEMPORAL_CLUSTER (Wave 558: distribution of seeds,
  // not conditioned on an assertion trigger), ASSERTION_AFTERMATH_VOID (Wave 418: conjunction that
  // does not include the seed channel — this isolates seed and fires even when other channels are active).
  {
    const n572b = records.length;
    if (n572b >= 8) {
      const assertSet572b = new Set(toldBeliefs.map(t => t.sceneIdx));
      const qualAssert572b = (records as any[])
        .map((r, pos) => ({ r, pos }))
        .filter(({ r, pos }) => assertSet572b.has(r.sceneIdx) && pos < n572b - 1);
      const seedScenes572b = (records as any[]).filter(r => ((r.seededClueIds ?? []) as string[]).length > 0);
      if (qualAssert572b.length >= 2 && seedScenes572b.length >= 2) {
        const anySeedAftermath572b = qualAssert572b.some(({ pos }) => (((records as any[])[pos + 1].seededClueIds ?? []) as string[]).length > 0);
        if (!anySeedAftermath572b) {
          issues.push({
            location: `${qualAssert572b.length} assertion scene(s) — none followed by a seeded clue`,
            rule: 'ASSERTION_SEED_AFTERMATH_VOID',
            severity: 'minor',
            description: `The script has ${qualAssert572b.length} qualifying assertion scenes and ${seedScenes572b.length} scenes that plant a clue, but no assertion is followed immediately by a scene that seeds evidence. An assertion is a natural springboard for foreshadowing: a character stakes a position, and the scene that follows can plant the evidence that will eventually confirm or contradict it. When no assertion is ever followed by a seed, the belief layer and the foreshadowing layer are temporally decoupled — claims are made but never trail planted evidence in their wake, so the audience is never invited to watch for what will prove a stated belief right or wrong. The story's propositions and its evidentiary planting never feed each other.`,
            suggestedFix: `After at least one assertion scene, let the next scene seed a clue connected to the claim — a planted detail that the audience will later recognize as the proof or refutation of what was just asserted. A claim that trails evidence in its wake turns a verbal position into a thread the audience tracks: they carry the assertion forward and watch the seeded clue to see whether the belief holds.`,
          });
        }
      }
    }
  }

  // ASSERTION_PAYOFF_AFTERMATH_VOID (sequence/aftermath × assertion → payoff aftermath, n≥8, ≥2
  // qualifying assertion scenes [told belief, pos < n-1], ≥2 scenes with non-empty payoffSetupIds
  // globally, none of the scenes immediately following an assertion resolves a planted promise):
  // Every claim a character makes passes without a thread resolving in the next beat. The moment
  // after a character stakes a strong position is a charged place to deliver a payoff — the claim
  // raises the stakes, and a planted promise cashing out in its immediate wake makes the assertion
  // feel consequential. When no assertion is ever followed by a payoff, the belief layer and the
  // resolution layer are temporally decoupled: claims are made but never coincide with the narrative
  // closures that would give them weight. Sequence/aftermath mode × assertion trigger × payoff
  // channel. Distinct from ASSERTION_PAYOFF_DECOUPLED (Wave 462: co-occurrence × payoff in the
  // assertion scene ITSELF — this checks the FOLLOWING scene, the aftermath direction), REVELATION_
  // PAYOFF_DECOUPLED (Wave: revelation trigger / co-occurrence), ASSERTION_AFTERMATH_VOID (Wave 418:
  // conjunction over revelation/relationship/suspense that does not include the payoff channel — this
  // isolates payoff and fires even when those other channels are active in the aftermath).
  {
    const n572c = records.length;
    if (n572c >= 8) {
      const assertSet572c = new Set(toldBeliefs.map(t => t.sceneIdx));
      const qualAssert572c = (records as any[])
        .map((r, pos) => ({ r, pos }))
        .filter(({ r, pos }) => assertSet572c.has(r.sceneIdx) && pos < n572c - 1);
      const payoffScenes572c = (records as any[]).filter(r => ((r.payoffSetupIds ?? []) as string[]).length > 0);
      if (qualAssert572c.length >= 2 && payoffScenes572c.length >= 2) {
        const anyPayoffAftermath572c = qualAssert572c.some(({ pos }) => (((records as any[])[pos + 1].payoffSetupIds ?? []) as string[]).length > 0);
        if (!anyPayoffAftermath572c) {
          issues.push({
            location: `${qualAssert572c.length} assertion scene(s) — none followed by a payoff`,
            rule: 'ASSERTION_PAYOFF_AFTERMATH_VOID',
            severity: 'minor',
            description: `The script has ${qualAssert572c.length} qualifying assertion scenes and ${payoffScenes572c.length} scenes that resolve a planted promise, but no assertion is followed immediately by a payoff. The beat after a character stakes a strong position is a charged place to deliver a payoff: the claim raises the stakes, and a planted promise cashing out in its immediate wake makes the assertion feel consequential — the position taken and the thread resolved reinforce each other. When no assertion is ever followed by a payoff, the belief layer and the resolution layer are temporally decoupled: claims are made but never coincide with the narrative closures that would give them weight, so taking a position never lands alongside the satisfaction of a thread completing.`,
            suggestedFix: `After at least one assertion scene, let the next scene deliver a payoff — a planted promise resolving in the wake of the claim, so that the position taken and the thread completed land together. The payoff need not be caused by the assertion, but their adjacency lets the resolution lend the claim consequence: the audience feels the assertion mattered because the story's machinery delivered something in its immediate aftermath.`,
          });
        }
      }
    }
  }

  // REVELATION_DRAMATIC_TURN_AFTERMATH_VOID (sequence/aftermath × revelation → dramatic-turn aftermath,
  // n≥8, ≥2 qualifying revelation scenes [pos<n-2], ≥2 dramatic-turn scenes globally, no revelation
  // followed by a dramatic turn in the next 2 scenes): Every revelation passes without a dramatic turn
  // surfacing in its wake. A disclosure charges the beats immediately after it; the next two scenes are
  // the natural home for a dramatic turn catalysed by the new information — a direction-change, a
  // reversal, a hinge the story pivots on. When no revelation is ever followed by a dramatic turn within
  // that window, the disclosure layer and the narrative-turn layer are temporally decoupled: the story
  // keeps revealing facts, but those facts never crystallise into the pivots that shift direction.
  // Sequence/aftermath mode × revelation trigger × dramatic-turn channel. Distinct from REVELATION_
  // DRAMATIC_TURN_DECOUPLED (Wave 390: co-occurrence × same scene — fires when no revelation and
  // dramatic turn share a scene), ASSERTION_TURN_AFTERMATH_VOID (Wave 530: assertion trigger instead
  // of revelation), TURN_REVELATION_AFTERMATH_VOID (Wave 544: turn is the trigger and revelation is
  // the aftermath output — the inverse direction).
  {
    const n586a = records.length;
    if (n586a >= 8) {
      const qualRev586a = (records as any[])
        .map((r, pos) => ({ r, pos }))
        .filter(({ r, pos }) =>
          r.revelation !== null && r.revelation !== '' && r.revelation !== undefined && pos < n586a - 2
        );
      const turnScenes586a = (records as any[]).filter(
        r => (r.dramaticTurn ?? 'nothing') !== 'nothing' && r.dramaticTurn !== ''
      );
      if (qualRev586a.length >= 2 && turnScenes586a.length >= 2) {
        const anyTurnAftermath586a = qualRev586a.some(({ pos }) => {
          const next1 = (records as any[])[pos + 1];
          const next2 = (records as any[])[pos + 2];
          return (
            ((next1.dramaticTurn ?? 'nothing') !== 'nothing' && next1.dramaticTurn !== '') ||
            ((next2.dramaticTurn ?? 'nothing') !== 'nothing' && next2.dramaticTurn !== '')
          );
        });
        if (!anyTurnAftermath586a) {
          issues.push({
            location: `${qualRev586a.length} revelation scene(s) — none followed by a dramatic turn within 2 scenes`,
            rule: 'REVELATION_DRAMATIC_TURN_AFTERMATH_VOID',
            severity: 'minor',
            description: `The script has ${qualRev586a.length} qualifying revelation scenes and ${turnScenes586a.length} scenes containing a dramatic turn, but no revelation is followed by a dramatic turn within the next two scenes. A disclosure charges the beats immediately after it: the two scenes following a revelation are the natural home for a dramatic turn catalysed by the new information — a direction-change, a reversal, a hinge the story pivots on. When no revelation is ever followed by a dramatic turn within that window, the disclosure layer and the narrative-turn layer are temporally decoupled: the story keeps revealing facts, but those facts never crystallise into the pivots that shift direction, so revelations feel absorbed without consequence.`,
            suggestedFix: `After at least one revelation scene, let one of the next two scenes contain a dramatic turn — a reversal, escalation, or direction-change catalysed by the disclosure. The turn need not be caused by the revelation, but their proximity lets the disclosure feel like it tilted the course of events: the audience senses that what was revealed actually mattered because the story changed direction in its wake.`,
          });
        }
      }
    }
  }

  // ASSERTION_RELATIONSHIP_AFTERMATH_VOID (sequence/aftermath × assertion → relationship-shift
  // aftermath, n≥8, ≥2 qualifying assertion scenes [pos<n-1], ≥2 relationship-shift scenes globally,
  // no assertion followed by a relationship shift in the next scene): Every claim a character makes
  // passes without a relationship shifting in the immediately following scene. When a character stakes
  // a strong position, the scene immediately after is the most natural place for another character's
  // bond to stretch, crack, or deepen in response. When no assertion is ever followed by a relationship
  // shift, the belief layer and the interpersonal layer are temporally decoupled: claims are made, but
  // they never ripple into the connections between characters. Sequence/aftermath mode × assertion
  // trigger × relationship channel. Distinct from REVELATION_RELATIONSHIP_AFTERMATH_VOID (Wave 516:
  // revelation trigger, not assertion), ASSERTION_AFTERMATH_VOID (Wave 418: conjunction over
  // revelation/relationship/suspense — fires only when ALL three aftermath channels are cold; this
  // isolates the relationship channel and fires even when the other two channels are active), and
  // REVELATION_RELATIONSHIP_DECOUPLED (co-occurrence × same scene × revelation trigger — different
  // trigger AND mode).
  {
    const n586b = records.length;
    if (n586b >= 8) {
      const assertSet586b = new Set(toldBeliefs.map(t => t.sceneIdx));
      const qualAssert586b = (records as any[])
        .map((r, pos) => ({ r, pos }))
        .filter(({ r, pos }) => assertSet586b.has(r.sceneIdx) && pos < n586b - 1);
      const relScenes586b = (records as any[]).filter(
        r => ((r.relationshipShifts ?? []) as any[]).length > 0
      );
      if (qualAssert586b.length >= 2 && relScenes586b.length >= 2) {
        const anyRelAftermath586b = qualAssert586b.some(
          ({ pos }) => (((records as any[])[pos + 1].relationshipShifts ?? []) as any[]).length > 0
        );
        if (!anyRelAftermath586b) {
          issues.push({
            location: `${qualAssert586b.length} assertion scene(s) — none followed by a relationship shift`,
            rule: 'ASSERTION_RELATIONSHIP_AFTERMATH_VOID',
            severity: 'minor',
            description: `The script has ${qualAssert586b.length} qualifying assertion scenes and ${relScenes586b.length} scenes with a relationship shift, but no assertion is immediately followed by a scene in which a relationship changes. When a character stakes a strong position, the scene immediately after is the natural place for another character's bond to stretch, crack, or deepen in response: the position taken should change what the people around them mean to each other. When no assertion is ever followed by a relationship shift, the belief layer and the interpersonal layer are temporally decoupled — claims are made, but they never ripple into the connections between characters, so taking a position has no relational cost or reward.`,
            suggestedFix: `After at least one assertion scene, let the immediately following scene show a relationship shifting — an alliance formed, a bond stressed, or a connection deepening in response to the position just taken. The shift need not be caused by the assertion, but their adjacency makes the claim feel consequential: what the character believed and staked mattered to how the people around them relate to one another.`,
          });
        }
      }
    }
  }

  // REVELATION_PAYOFF_AFTERMATH_VOID (sequence/aftermath × revelation → payoff aftermath, n≥8, ≥2
  // qualifying revelation scenes [pos<n-1], ≥2 scenes with non-empty payoffSetupIds globally, no
  // revelation followed by a payoff in the next scene): Every disclosure passes without a planted
  // promise resolving in its immediate wake. A revelation charges the scene it lands in; the scene
  // immediately after is a natural moment to cash out a planted thread — the new information changes
  // what the audience knows, and a payoff landing right then feels earned by the disclosure. When no
  // revelation is ever followed by a payoff, the disclosure layer and the resolution layer are
  // temporally decoupled: revelations open the epistemic field but never coincide with the satisfaction
  // of a thread completing. Sequence/aftermath mode × revelation trigger × payoff channel. Distinct
  // from REVELATION_PAYOFF_DECOUPLED (co-occurrence × same scene — fires when no revelation and payoff
  // share a scene), ASSERTION_PAYOFF_AFTERMATH_VOID (Wave 572: assertion trigger instead of revelation),
  // and ASSERTION_PAYOFF_DECOUPLED (Wave 462: assertion trigger AND co-occurrence in the assertion
  // scene itself — different trigger AND mode).
  {
    const n586c = records.length;
    if (n586c >= 8) {
      const qualRev586c = (records as any[])
        .map((r, pos) => ({ r, pos }))
        .filter(({ r, pos }) =>
          r.revelation !== null && r.revelation !== '' && r.revelation !== undefined && pos < n586c - 1
        );
      const payoffScenes586c = (records as any[]).filter(
        r => ((r.payoffSetupIds ?? []) as string[]).length > 0
      );
      if (qualRev586c.length >= 2 && payoffScenes586c.length >= 2) {
        const anyPayoffAftermath586c = qualRev586c.some(
          ({ pos }) => (((records as any[])[pos + 1].payoffSetupIds ?? []) as string[]).length > 0
        );
        if (!anyPayoffAftermath586c) {
          issues.push({
            location: `${qualRev586c.length} revelation scene(s) — none followed by a payoff`,
            rule: 'REVELATION_PAYOFF_AFTERMATH_VOID',
            severity: 'minor',
            description: `The script has ${qualRev586c.length} qualifying revelation scenes and ${payoffScenes586c.length} scenes that resolve a planted promise, but no revelation is immediately followed by a payoff. A disclosure charges the scene it lands in; the scene right after is a natural moment to cash out a planted thread — the new information changes what the audience knows, and a payoff landing in its immediate wake feels earned by the disclosure, the revealed fact lending the thread its sense of completion. When no revelation is ever followed by a payoff, the disclosure layer and the resolution layer are temporally decoupled: revelations open the epistemic field but never coincide with the satisfaction of a thread completing.`,
            suggestedFix: `After at least one revelation scene, let the immediately following scene deliver a payoff — a planted promise resolving in the wake of the disclosure. The payoff need not be caused by the revelation, but their adjacency lets the disclosure lend the thread a sense of completion: the audience senses that what was revealed mattered because the story's planted promises began cashing out in its wake.`,
          });
        }
      }
    }
  }

  // ── Wave 600: CLUE_DEBT_BELIEF_DECOUPLED, CLUE_DEBT_CLOCK_AFTERMATH_VOID,
  //              CLUE_DEBT_ZONE_IMBALANCE ─────────────────────────────────────────────────
  // First checks in this 102-rule file to use the unresolvedClues signal — UNRESOLVED_BELIEF_
  // EXCESS is the closest-sounding existing rule but operates on toldBeliefs/witnessedBeliefs
  // (derived from dialogueHighlights text against UPDATE_BELIEF ops), a completely different
  // data source from the unresolvedClues array (populated by SEED_CLUE/PAYOFF_SETUP ops).

  // CLUE_DEBT_BELIEF_DECOUPLED — Co-occurrence/decoupling × unresolvedClues × dialogueHighlights.
  // Built on checkCoOccurrenceDecoupled from the shared checks library. n≥6, ≥2 debt-carrying
  // scenes (unresolvedClues non-empty), ≥2 belief-assertion scenes (dialogueHighlights non-empty).
  // Zero overlap → fire. A scene where a mystery sits open and a scene where a character asserts
  // a belief never coincide — the two layers this pass most cares about (deception/belief-tracking
  // and mystery/clue-tracking) run on separate tracks.
  {
    const r600a = checkCoOccurrenceDecoupled({
      records, minRecords: 6, minACount: 2, minBCount: 2,
      isA: r => (r.unresolvedClues ?? []).length > 0,
      isB: r => (r.dialogueHighlights ?? []).length > 0,
    });
    if (r600a.fires) {
      issues.push({
        location: `${r600a.aCount} clue-debt scene(s) and ${r600a.bCount} belief-assertion scene(s) — zero overlap`,
        rule: 'CLUE_DEBT_BELIEF_DECOUPLED',
        severity: 'minor',
        description: `The script has ${r600a.aCount} scene(s) carrying outstanding clue-debt and ${r600a.bCount} scene(s) where a character asserts a belief, but the two never coincide. A scene where a mystery sits open is a natural moment for a character to voice what they believe about it — a suspicion, a theory, a denial. When the two layers never share a scene, the story's mystery-tracking and its belief-tracking run on parallel, disconnected tracks.`,
        suggestedFix: `Let at least one scene carrying open clue-debt also include a character stating a belief connected to it — a suspicion about what the unresolved thread means, or a confident (possibly wrong) theory. Tying belief assertions to open mysteries makes both layers reinforce each other.`,
      });
    }
  }

  // CLUE_DEBT_CLOCK_AFTERMATH_VOID — Sequence/aftermath × unresolvedClues-present trigger →
  // clockRaised aftermath. Built on checkAftermathVoid from the shared checks library. n≥8, ≥3
  // qualifying debt-carrying scenes (pos < n-2), ≥2 clock-raising scenes existing elsewhere. None
  // of the qualifying debt scenes are followed by a clock raise within 2 scenes → fire. An open
  // mystery never gets a ticking deadline attached to it downstream — the story never uses time
  // pressure to force the outstanding question toward resolution.
  {
    const r600b = checkAftermathVoid({
      records, minRecords: 8, minTriggerCount: 3, minAftermathCount: 2, window: 2,
      isTrigger: r => (r.unresolvedClues ?? []).length > 0,
      isAftermath: r => r.clockRaised === true,
    });
    if (r600b.fires) {
      issues.push({
        location: `${r600b.triggerCount} clue-debt scene(s) — no clock raised within 2 scenes of any`,
        rule: 'CLUE_DEBT_CLOCK_AFTERMATH_VOID',
        severity: 'minor',
        description: `None of the story's ${r600b.triggerCount} scenes carrying outstanding clue-debt are followed by a clock raise within the next two, even though ${r600b.aftermathCount} clock-raising scene(s) exist elsewhere. An open mystery is a natural candidate for a ticking deadline — a reason the question must be answered soon rather than whenever it's convenient — but that connection is never made.`,
        suggestedFix: `After at least one scene where clue-debt is left outstanding, raise a clock in the following scene or the one after — a deadline that makes resolving the open mystery urgent rather than optional. Tying time pressure to unresolved questions gives the audience a reason to feel the mystery pressing forward.`,
      });
    }
  }

  // CLUE_DEBT_ZONE_IMBALANCE — Underweight/bloat × unresolvedClues × four structural zones.
  // Built on checkZoneImbalance from the shared checks library. n≥10, ≥4 debt-carrying scenes
  // total, divided across four equal structural zones. Fires only when one zone has zero such
  // scenes while another holds ≥50% of the total.
  {
    const r600c = checkZoneImbalance({
      records, minRecords: 10, minCount: 4, bloatRatio: 0.5,
      isPresent: r => (r.unresolvedClues ?? []).length > 0,
    });
    if (r600c.fires) {
      const emptyNames600c = r600c.emptyZoneIdxs.map(i => FOUR_ZONE_NAMES[i]).join(', ');
      const bloatName600c = FOUR_ZONE_NAMES[r600c.bloatZoneIdx];
      issues.push({
        location: `${emptyNames600c} empty; ${bloatName600c} has ${r600c.counts[r600c.bloatZoneIdx]}/${r600c.totalCount} clue-debt scenes`,
        rule: 'CLUE_DEBT_ZONE_IMBALANCE',
        severity: 'minor',
        description: `The story's ${r600c.totalCount} scenes carrying outstanding clue-debt are unevenly distributed across its four structural zones: ${bloatName600c} contains ${r600c.counts[r600c.bloatZoneIdx]} of them (${Math.round((r600c.counts[r600c.bloatZoneIdx] / r600c.totalCount) * 100)}%) while ${emptyNames600c} contains none. The story's sense of active mystery bloats in one structural quarter and vanishes from another.`,
        suggestedFix: `Redistribute open threads: let at least one clue remain unresolved into the empty zone(s) — ${emptyNames600c} — rather than resolving everything before that quarter begins.`,
      });
    }
  }

  // ── Wave 614: BELIEF_STAGING_ZONE_IMBALANCE, CLOCK_SIGNAL_FLATLINE,
  //              VISUAL_BEAT_BELIEF_DECOUPLED ──────────────────────────────────────────────

  // BELIEF_STAGING_ZONE_IMBALANCE — Underweight/bloat × visualBeats × four structural zones.
  // Built on checkZoneImbalance from the shared checks library. n≥10, ≥4 scenes with substantial
  // physical staging (visualBeats.length≥2), divided into four equal structural zones. Fires only
  // when one zone has zero visually dense scenes while another holds ≥50% of the total. First use
  // of the visualBeats field anywhere in this 105-rule pass — every existing check here audits
  // belief/deception through dialogueHighlights-derived assertions or the revelation/clue/clock/
  // relational channels; this is the first to audit how physical staging is spread across the
  // four structural quarters.
  {
    const r614a = checkZoneImbalance({
      records, minRecords: 10, minCount: 4, bloatRatio: 0.5,
      isPresent: r => (r.visualBeats ?? []).length >= 2,
    });
    if (r614a.fires) {
      const emptyNames614a = r614a.emptyZoneIdxs.map(i => FOUR_ZONE_NAMES[i]).join(', ');
      const bloatName614a = FOUR_ZONE_NAMES[r614a.bloatZoneIdx];
      issues.push({
        location: `${emptyNames614a} empty; ${bloatName614a} has ${r614a.counts[r614a.bloatZoneIdx]}/${r614a.totalCount} visually dense scenes`,
        rule: 'BELIEF_STAGING_ZONE_IMBALANCE',
        severity: 'minor',
        description: `The story's ${r614a.totalCount} physically staged scenes are unevenly distributed across its four structural zones: ${bloatName614a} contains ${r614a.counts[r614a.bloatZoneIdx]} of them (${Math.round((r614a.counts[r614a.bloatZoneIdx] / r614a.totalCount) * 100)}%) while ${emptyNames614a} contains none. Physical staging bloats in one structural quarter and vanishes from another, giving the story's opportunities to show (rather than state) a character's true belief an uneven structural rhythm.`,
        suggestedFix: `Redistribute physical staging: bring at least one heavily staged scene into ${emptyNames614a}, so every structural quarter carries some opportunity for belief or deception to surface through action rather than only through what characters say.`,
      });
    }
  }

  // CLOCK_SIGNAL_FLATLINE — Average/aggregate × clockDelta variety. n≥8. Fewer than 20% of
  // scenes deviate from the average clockDelta by more than 30% of that average → fire. First use
  // of the clockDelta field anywhere in this pass. A story's deadline pressure should have its own
  // rhythm — sharp compressions when time runs short, brief reprieves, a final tightening before
  // the climax; when clockDelta sits close to its own average almost everywhere, the story's sense
  // of mounting urgency flattens into a steady hum rather than a felt escalation, exactly when the
  // belief/deception layer this pass tracks most needs the pressure of a ticking clock to force
  // characters into revealing or maintaining a lie.
  {
    if (records.length >= 8) {
      const clockVals614b = records.map(r => r.clockDelta ?? 0);
      const avgClock614b = clockVals614b.reduce((s, v) => s + v, 0) / clockVals614b.length;
      if (Math.abs(avgClock614b) > 1e-9) {
        const variedClock614b = clockVals614b.filter(v => Math.abs(v - avgClock614b) > Math.abs(avgClock614b) * 0.3).length;
        if (variedClock614b < clockVals614b.length * 0.2) {
          issues.push({
            location: 'clockDelta throughout',
            rule: 'CLOCK_SIGNAL_FLATLINE',
            severity: 'minor',
            description: `Fewer than 20% of the story's ${records.length} scenes deviate from the average clockDelta (${avgClock614b.toFixed(2)}) by more than 30% — the deadline-pressure signal barely moves from scene to scene. A story's ticking clock should have its own rhythm: sharp compressions when time runs short, brief reprieves, a final tightening before the climax. When clockDelta sits close to its own average almost everywhere, the mounting urgency reads as a flat hum rather than a shaped escalation — precisely the pressure this pass's belief/deception tracking most benefits from, since a tightening deadline is what forces characters to reveal or maintain a lie under strain.`,
            suggestedFix: `Introduce at least a few scenes with a clockDelta clearly above or below the story's average — a sudden compression that forces a decision, or a deliberate lull that lets the pressure recede before it returns harder. The clock's rhythm should have peaks and valleys the audience can feel.`,
          });
        }
      }
    }
  }

  // VISUAL_BEAT_BELIEF_DECOUPLED — Co-occurrence/decoupling × visualBeats × dialogueHighlights
  // (belief-assertion proxy). Built on checkCoOccurrenceDecoupled from the shared checks library.
  // n≥6, ≥2 visually-staged scenes, ≥2 belief-assertion scenes. Zero overlap → fire. The scenes
  // richest in physical staging never coincide with a scene where a character asserts a belief —
  // action and stated conviction run on separate tracks, so the audience never gets to compare
  // what a character does against what they claim to believe in the same moment. Distinct from
  // CLUE_DEBT_BELIEF_DECOUPLED (Wave 600: pairs belief-assertion with unresolvedClues, not
  // visualBeats).
  {
    const r614c = checkCoOccurrenceDecoupled({
      records, minRecords: 6, minACount: 2, minBCount: 2,
      isA: r => (r.visualBeats ?? []).length >= 2,
      isB: r => (r.dialogueHighlights ?? []).length > 0,
    });
    if (r614c.fires) {
      issues.push({
        location: `${r614c.aCount} visually-staged scene(s) and ${r614c.bCount} belief-assertion scene(s) — zero overlap`,
        rule: 'VISUAL_BEAT_BELIEF_DECOUPLED',
        severity: 'minor',
        description: `The script has ${r614c.aCount} scene(s) leaning heavily on physical staging and ${r614c.bCount} scene(s) where a character asserts a belief, but the two never coincide. A scene rich in physical action is a natural place to test a stated belief against what a character actually does — the gap between claim and action is where deception most visibly lives. When the two layers never share a scene, belief is only ever tracked through words, never checked against behavior.`,
        suggestedFix: `Let at least one heavily staged scene also include a character stating a belief — then let their physical action either confirm or quietly contradict it. Showing the gap (or alignment) between what a character claims and what they do gives the belief-tracking layer a behavioral anchor.`,
      });
    }
  }

  // ── Wave 628: BELIEF_PAYOFF_SEED_DECOUPLED, CLOCK_DELTA_PEAK_UNCAUSED,
  //              BELIEF_CHARACTER_MOMENT_ZONE_IMBALANCE ─────────────────────────────────────

  // BELIEF_PAYOFF_SEED_DECOUPLED — Co-occurrence/decoupling × payoffSetupIds × seededClueIds.
  // Built on checkCoOccurrenceDecoupled from the shared checks library. n≥6, ≥2 payoff scenes, ≥2
  // seed scenes. Zero overlap → fire. Both fields had previously only ever been paired with
  // revelation in this 108-rule pass, never with each other. A scene that plants a new clue while
  // simultaneously resolving another is a natural moment for compounding narrative debt — a
  // character learns one truth just as another mystery opens — but that overlap never occurs.
  {
    const r628a = checkCoOccurrenceDecoupled({
      records, minRecords: 6, minACount: 2, minBCount: 2,
      isA: r => (r.payoffSetupIds ?? []).length > 0,
      isB: r => (r.seededClueIds ?? []).length > 0,
    });
    if (r628a.fires) {
      issues.push({
        location: `${r628a.aCount} payoff scene(s), ${r628a.bCount} seed scene(s) — zero overlap`,
        rule: 'BELIEF_PAYOFF_SEED_DECOUPLED',
        severity: 'minor',
        description: `The ${r628a.aCount} scenes where a thread resolves never coincide with the ${r628a.bCount} scenes where a new clue is planted — the story's payoff and seed channels run on entirely separate tracks. A scene that resolves one mystery while quietly opening another compounds narrative debt at exactly the moment relief would otherwise settle in, but that overlap never happens here.`,
        suggestedFix: `Let at least one payoff scene also plant a new clue — a resolution that immediately raises a fresh question, so the audience's relief at one answer is undercut by a new uncertainty in the same beat.`,
      });
    }
  }

  // CLOCK_DELTA_PEAK_UNCAUSED — Backward-cause × clockDelta-magnitude peak × dramaticTurn/
  // revelation cause. Built on checkPeakUncaused from the shared checks library. n≥8, ≥2 scenes
  // with clockDelta>0, a 2-scene lookback. Finds the single scene with the highest clockDelta and
  // fires when neither that scene nor either of the 2 scenes before it contains a dramatic turn or
  // a revelation. First backward-cause check in this pass. The story's sharpest deadline
  // compression should be motivated by a pivot or disclosure, not arrive as an unexplained
  // mechanical spike.
  {
    const r628b = checkPeakUncaused({
      records, minRecords: 8, minQualifying: 2, lookback: 2,
      magnitude: r => r.clockDelta ?? 0,
      hasCause: r => (r.dramaticTurn ?? 'nothing') !== 'nothing' || r.revelation != null,
    });
    if (r628b.fires) {
      issues.push({
        location: `Scene at position ${r628b.peakIdx + 1} — peak clockDelta (${r628b.peakMagnitude}) with no dramatic turn or revelation nearby`,
        rule: 'CLOCK_DELTA_PEAK_UNCAUSED',
        severity: 'minor',
        description: `The scene with the story's single highest clockDelta (${r628b.peakMagnitude}, out of ${r628b.qualifyingCount} scenes that raise the clock at all) has no dramatic turn and no revelation in itself or in either of the 2 scenes before it. The moment time pressure compresses most sharply arrives with no pivot or disclosure explaining why the deadline suddenly tightens this hard.`,
        suggestedFix: `Add a dramatic turn or a revelation in the scene that raises the clock most sharply, or in one of the two scenes before it — the audience should understand why the deadline is compressing this much, not just observe that a countdown got shorter.`,
      });
    }
  }

  // BELIEF_CHARACTER_MOMENT_ZONE_IMBALANCE — Underweight/bloat × purpose === 'character_moment'
  // × four structural zones. Built on checkZoneImbalance from the shared checks library. n≥10, ≥4
  // character-moment scenes total, divided across four equal structural zones. Fires only when
  // one zone has zero such scenes while another holds ≥50% of the total. First genuine use of the
  // purpose field in this pass — its only prior appearance was the word "purpose" inside a
  // suggestedFix prose string, never an accessed field. Dedicated character-development beats —
  // where belief and self-deception most often surface — clustering into one quarter while
  // another has none rations the belief-tracking layer's reflective opportunities unevenly.
  {
    const r628c = checkZoneImbalance({
      records, minRecords: 10, minCount: 4, bloatRatio: 0.5,
      isPresent: r => r.purpose === 'character_moment',
    });
    if (r628c.fires) {
      const emptyNames628c = r628c.emptyZoneIdxs.map(i => FOUR_ZONE_NAMES[i]).join(', ');
      const bloatName628c = FOUR_ZONE_NAMES[r628c.bloatZoneIdx];
      issues.push({
        location: `${emptyNames628c} empty; ${bloatName628c} has ${r628c.counts[r628c.bloatZoneIdx]}/${r628c.totalCount} character-moment scenes`,
        rule: 'BELIEF_CHARACTER_MOMENT_ZONE_IMBALANCE',
        severity: 'minor',
        description: `The story's ${r628c.totalCount} character-moment scenes are unevenly distributed across its four structural zones: ${bloatName628c} contains ${r628c.counts[r628c.bloatZoneIdx]} of them (${Math.round((r628c.counts[r628c.bloatZoneIdx] / r628c.totalCount) * 100)}%) while ${emptyNames628c} contains none. Dedicated reflection beats — where a character's stated belief is most likely to be tested or revealed — bloat in one structural quarter and vanish from another.`,
        suggestedFix: `Redistribute character-development beats: move at least one character-moment scene into the empty zone(s) — ${emptyNames628c} — so every structural quarter carries some opportunity for belief and self-deception to surface.`,
      });
    }
  }

  // ── Wave 642: BELIEF_OPEN_THREAD_DROUGHT_RUN, BELIEF_STAGING_ZONE_CLUSTER,
  //              BELIEF_SEED_CURIOSITY_DECOUPLED ────────────────────────────────────────────

  // BELIEF_OPEN_THREAD_DROUGHT_RUN — Run-based × unresolvedClues absence. Built on
  // checkDroughtRun from the shared checks library. n≥10, ≥3 debt-carrying scenes elsewhere,
  // longest consecutive run with no outstanding clue-debt ≥6 → fire. First use of the run-based
  // mode in this 111-rule pass. An extended stretch where nothing is left unresolved at all —
  // even though the story does carry debt elsewhere — means the belief-tracking layer's sense of
  // active mystery goes fully dark for a long run.
  {
    const r642a = checkDroughtRun({
      records, minRecords: 10, minPresentCount: 3, runThreshold: 6,
      isPresent: r => (r.unresolvedClues ?? []).length > 0,
    });
    if (r642a.fires) {
      issues.push({
        location: `longest stretch with no outstanding clue-debt: ${r642a.longestRun} consecutive scenes`,
        rule: 'BELIEF_OPEN_THREAD_DROUGHT_RUN',
        severity: 'minor',
        description: `The story contains a run of ${r642a.longestRun} consecutive scenes with no outstanding clue-debt at all, even though ${r642a.presentCount} scenes elsewhere do carry open mysteries. A long stretch where nothing is left unresolved means the belief/deception layer's sense of active questioning goes fully dark for an extended run.`,
        suggestedFix: `Seed a new thread somewhere within the ${r642a.longestRun}-scene stretch so the story maintains some outstanding mystery throughout, keeping the belief-tracking layer's sense of open questions alive.`,
      });
    }
  }

  // BELIEF_STAGING_ZONE_CLUSTER — Distribution/timing × visualBeats × structural thirds. Built
  // on checkZoneCluster from the shared checks library. n≥9, ≥3 visually-staged scenes
  // (visualBeats.length≥2), more than 75% falling in a single structural third → fire. First
  // zone-cluster (thirds) mode applied to records in this pass — Wave 614's BELIEF_STAGING_ZONE_
  // IMBALANCE used the four-zone template instead.
  {
    const r642b = checkZoneCluster({
      records, minRecords: 9, minCount: 3, ratioThreshold: 0.75,
      isPresent: r => (r.visualBeats ?? []).length >= 2,
    });
    if (r642b.fires) {
      const zoneName642b = r642b.zoneNames[r642b.maxZoneIdx];
      issues.push({
        location: `${zoneName642b} third — ${r642b.maxZoneCount}/${r642b.count} visually dense scenes`,
        rule: 'BELIEF_STAGING_ZONE_CLUSTER',
        severity: 'minor',
        description: `${r642b.maxZoneCount} of the story's ${r642b.count} visually dense scenes (${Math.round((r642b.maxZoneCount / r642b.count) * 100)}%) cluster in the ${zoneName642b} third. Physical staging concentrates almost exclusively in that stretch, leaving the belief-tracking layer's opportunities to show (rather than state) a character's true belief unevenly rationed across the story.`,
        suggestedFix: `Bring at least one heavily staged scene outside the ${zoneName642b} third, spreading opportunities for belief and deception to surface physically across the whole story.`,
      });
    }
  }

  // BELIEF_SEED_CURIOSITY_DECOUPLED — Co-occurrence/decoupling × seededClueIds × curiosityDelta.
  // Built on checkCoOccurrenceDecoupled from the shared checks library. n≥6, ≥2 seed scenes, ≥2
  // curiosity-positive scenes. Zero overlap → fire. First pairing of these two fields in this
  // pass. A clue being planted is a natural occasion for the audience's curiosity to spike, but
  // that pairing never occurs here.
  {
    const r642c = checkCoOccurrenceDecoupled({
      records, minRecords: 6, minACount: 2, minBCount: 2,
      isA: r => (r.seededClueIds ?? []).length > 0,
      isB: r => (r.curiosityDelta ?? 0) > 0,
    });
    if (r642c.fires) {
      issues.push({
        location: `${r642c.aCount} seed scene(s), ${r642c.bCount} curiosity-spike scene(s) — zero overlap`,
        rule: 'BELIEF_SEED_CURIOSITY_DECOUPLED',
        severity: 'minor',
        description: `The ${r642c.aCount} scenes where a clue is planted never coincide with the ${r642c.bCount} scenes where curiosity spikes — the seed and wonder-engine channels run on separate tracks. Planting a clue is a natural occasion for the audience's curiosity to visibly rise, but that pairing never happens here.`,
        suggestedFix: `Let at least one seed scene also spike curiosity — a planted detail that immediately makes the audience wonder what it means, tying the clue-planting and wonder-generation channels together.`,
      });
    }
  }

  // ── Wave 656: BELIEF_PAYOFF_PEAK_UNCAUSED, BELIEF_CLOCK_DROUGHT_RUN, BELIEF_SEED_ZONE_CLUSTER ──

  // BELIEF_PAYOFF_PEAK_UNCAUSED — Single-peak isolation/backward-cause × payoffSetupIds magnitude.
  // Built on checkPeakUncaused from the shared checks library. n≥8, ≥2 payoff scenes, a 2-scene
  // lookback. Finds the single scene with the most simultaneous thread resolutions; fires when
  // neither that scene nor either of the two before it contains a dramatic turn or revelation.
  // Every prior peak check in this pass anchors on revelation/curiosity/suspense/relationship/
  // clockDelta; this is the first application to the payoff channel.
  {
    const r656a = checkPeakUncaused({
      records, minRecords: 8, minQualifying: 2, lookback: 2,
      magnitude: r => (r.payoffSetupIds ?? []).length,
      hasCause: r => r.dramaticTurn !== 'nothing' || r.revelation != null,
    });
    if (r656a.fires) {
      issues.push({
        location: `scene ${r656a.peakIdx + 1} — peak payoff density (${r656a.peakMagnitude}) with no dramatic turn or revelation nearby`,
        rule: 'BELIEF_PAYOFF_PEAK_UNCAUSED',
        severity: 'minor',
        description: `The story's single densest scene for thread resolution (scene ${r656a.peakIdx + 1}, with ${r656a.peakMagnitude} payoffs resolving at once) has no dramatic turn or revelation in itself or the two scenes before it. The moment where the most convergent resolution lands arrives without any structural pivot or disclosure driving it — the peak of narrative payoff carries no causal weight behind it.`,
        suggestedFix: `Give scene ${r656a.peakIdx + 1} — or one of the two scenes just before it — a dramatic turn or revelation, so the story's most convergent resolution is earned by a shift in the plot rather than arriving in a causal vacuum.`,
      });
    }
  }

  // BELIEF_CLOCK_DROUGHT_RUN — Run-based × clockRaised absence. Built on checkDroughtRun from the
  // shared checks library. n≥10, ≥3 clock-raised scenes overall, fires when the longest
  // consecutive run of scenes with no clock raised reaches 6. Wave 642 applied the drought-run
  // mode to unresolvedClues; clockRaised itself has never been drought-audited here.
  {
    const r656b = checkDroughtRun({
      records, minRecords: 10, minPresentCount: 3, runThreshold: 6,
      isPresent: r => r.clockRaised === true,
    });
    if (r656b.fires) {
      issues.push({
        location: `longest stretch with no clock raised: ${r656b.longestRun} consecutive scenes`,
        rule: 'BELIEF_CLOCK_DROUGHT_RUN',
        severity: 'minor',
        description: `The story contains a run of ${r656b.longestRun} consecutive scenes with no clock raised at all, even though ${r656b.presentCount} scenes elsewhere do establish time pressure. A long unbroken stretch with no deadline in play leaves the belief-tracking layer's sense of urgency dormant for an extended run.`,
        suggestedFix: `Raise a clock somewhere within the ${r656b.longestRun}-scene stretch — a deadline, a closing window, a ticking consequence — so the story maintains some sense of time pressure throughout that stretch.`,
      });
    }
  }

  // BELIEF_SEED_ZONE_CLUSTER — Distribution/timing × seededClueIds × structural thirds. Built on
  // checkZoneCluster from the shared checks library. n≥9, ≥3 seed scenes, fires when >75% of them
  // fall in a single structural third. Wave 642 applied the zone-cluster mode to visualBeats;
  // seededClueIds itself has never been cluster-audited here despite already anchoring
  // BELIEF_SEED_CURIOSITY_DECOUPLED.
  {
    const r656c = checkZoneCluster({
      records, minRecords: 9, minCount: 3, ratioThreshold: 0.75,
      isPresent: r => (r.seededClueIds ?? []).length > 0,
    });
    if (r656c.fires) {
      const zoneName656c = r656c.zoneNames[r656c.maxZoneIdx];
      issues.push({
        location: `${zoneName656c} third — ${r656c.maxZoneCount}/${r656c.count} seed scenes`,
        rule: 'BELIEF_SEED_ZONE_CLUSTER',
        severity: 'minor',
        description: `${r656c.maxZoneCount} of the story's ${r656c.count} clue-planting scenes (${Math.round((r656c.maxZoneCount / r656c.count) * 100)}%) cluster in the ${zoneName656c} third. Foreshadowing concentrates almost exclusively in that stretch of the story rather than surfacing throughout, leaving other structural thirds with no new seed feeding the belief-tracking layer.`,
        suggestedFix: `Plant at least one clue outside the ${zoneName656c} third — spreading foreshadowing across the story lets every structural third carry some material for the audience's beliefs to track.`,
      });
    }
  }

  // ── Wave 670: BELIEF_HIGHLIGHT_PEAK_UNCAUSED, BELIEF_RELATIONSHIP_DROUGHT_RUN,
  //              BELIEF_TURN_ZONE_CLUSTER ────────────────────────────────────────────────────

  // BELIEF_HIGHLIGHT_PEAK_UNCAUSED — Single-peak isolation/backward-cause × dialogueHighlights
  // magnitude. Built on checkPeakUncaused from the shared checks library. n≥8, ≥2 scenes carrying
  // a dialogue highlight, a 2-scene lookback. Finds the single scene with the most highlighted
  // lines; fires when neither that scene nor either of the two before it contains a dramatic turn
  // or revelation. dialogueHighlights is this pass's most heavily used field but has only ever
  // anchored hand-rolled aggregate/co-occurrence logic, never the shared-library backward-cause
  // peak mode.
  {
    const r670a = checkPeakUncaused({
      records, minRecords: 8, minQualifying: 2, lookback: 2,
      magnitude: r => (r.dialogueHighlights ?? []).length,
      hasCause: r => r.dramaticTurn !== 'nothing' || r.revelation != null,
    });
    if (r670a.fires) {
      issues.push({
        location: `scene ${r670a.peakIdx + 1} — peak highlighted-dialogue density (${r670a.peakMagnitude}) with no dramatic turn or revelation nearby`,
        rule: 'BELIEF_HIGHLIGHT_PEAK_UNCAUSED',
        severity: 'minor',
        description: `The story's single densest scene for highlighted dialogue (scene ${r670a.peakIdx + 1}, with ${r670a.peakMagnitude} standout lines) has no dramatic turn or revelation in itself or the two scenes before it. The moment where the script's most memorable dialogue concentrates arrives without any structural pivot or disclosure driving it — the peak of asserted belief carries no causal weight behind it.`,
        suggestedFix: `Give scene ${r670a.peakIdx + 1} — or one of the two scenes just before it — a dramatic turn or revelation, so the story's most quotable moment is earned by a shift in the plot rather than arriving in a causal vacuum.`,
      });
    }
  }

  // BELIEF_RELATIONSHIP_DROUGHT_RUN — Run-based × relationshipShifts absence. Built on
  // checkDroughtRun from the shared checks library. n≥10, ≥3 relationship-shift scenes overall,
  // fires when the longest consecutive run of scenes with zero bond changes reaches 6.
  // relationshipShifts anchors several hand-rolled checks in this pass but has never been
  // drought-audited via the shared helper.
  {
    const r670b = checkDroughtRun({
      records, minRecords: 10, minPresentCount: 3, runThreshold: 6,
      isPresent: r => (r.relationshipShifts ?? []).length > 0,
    });
    if (r670b.fires) {
      issues.push({
        location: `longest stretch with no relationship shift: ${r670b.longestRun} consecutive scenes`,
        rule: 'BELIEF_RELATIONSHIP_DROUGHT_RUN',
        severity: 'minor',
        description: `The story contains a run of ${r670b.longestRun} consecutive scenes with no relationship shift at all, even though ${r670b.presentCount} scenes elsewhere do move a bond. A long unbroken stretch where no relationship moves leaves the belief-tracking layer's sense of interpersonal stakes dormant for an extended run.`,
        suggestedFix: `Let a bond shift somewhere within the ${r670b.longestRun}-scene stretch — even a small movement keeps the belief-tracking layer tied to changing interpersonal stakes throughout.`,
      });
    }
  }

  // BELIEF_TURN_ZONE_CLUSTER — Distribution/timing × dramaticTurn presence × structural thirds.
  // Built on checkZoneCluster from the shared checks library. n≥9, ≥3 dramatic-turn scenes, fires
  // when >75% of them fall in a single structural third. dramaticTurn has only ever served as a
  // hasCause/trigger condition in this pass, never as the subject of a zone-cluster check.
  {
    const r670c = checkZoneCluster({
      records, minRecords: 9, minCount: 3, ratioThreshold: 0.75,
      isPresent: r => (r.dramaticTurn ?? 'nothing') !== 'nothing',
    });
    if (r670c.fires) {
      const zoneName670c = r670c.zoneNames[r670c.maxZoneIdx];
      issues.push({
        location: `${zoneName670c} third — ${r670c.maxZoneCount}/${r670c.count} dramatic-turn scenes`,
        rule: 'BELIEF_TURN_ZONE_CLUSTER',
        severity: 'minor',
        description: `${r670c.maxZoneCount} of the story's ${r670c.count} dramatic-turn scenes (${Math.round((r670c.maxZoneCount / r670c.count) * 100)}%) cluster in the ${zoneName670c} third. Structural pivots concentrate almost exclusively in that stretch rather than surfacing throughout, leaving other structural thirds with no reversal to test the audience's beliefs against.`,
        suggestedFix: `Give at least one scene outside the ${zoneName670c} third a dramatic turn — spreading structural pivots across the story lets every structural third carry a reversal that tests what the audience believes.`,
      });
    }
  }

  // ── Wave 684: BELIEF_CHARACTER_MOMENT_ZONE_CLUSTER, BELIEF_CURIOSITY_DROUGHT_RUN,
  //              BELIEF_SUSPENSE_PEAK_UNCAUSED ─────────────────────────────────────────────────

  // BELIEF_CHARACTER_MOMENT_ZONE_CLUSTER — Distribution/timing × purpose === 'character_moment' ×
  // structural thirds. Built on checkZoneCluster from the shared checks library. n≥9, ≥3
  // character-moment scenes, fires when >75% of them fall in a single structural third. Distinct
  // from Wave 628's BELIEF_CHARACTER_MOMENT_ZONE_IMBALANCE, which checks four-zone bloat/empty
  // distribution rather than a thirds-based majority cluster.
  {
    const r684a = checkZoneCluster({
      records, minRecords: 9, minCount: 3, ratioThreshold: 0.75,
      isPresent: r => r.purpose === 'character_moment',
    });
    if (r684a.fires) {
      const zoneName684a = r684a.zoneNames[r684a.maxZoneIdx];
      issues.push({
        location: `${zoneName684a} third — ${r684a.maxZoneCount}/${r684a.count} character-moment scenes`,
        rule: 'BELIEF_CHARACTER_MOMENT_ZONE_CLUSTER',
        severity: 'minor',
        description: `${r684a.maxZoneCount} of the story's ${r684a.count} scenes purposed as character moments (${Math.round((r684a.maxZoneCount / r684a.count) * 100)}%) cluster in the ${zoneName684a} third. Dedicated reflection beats concentrate almost exclusively in that stretch rather than surfacing throughout, leaving other structural thirds with no scene purposed to let belief and self-deception surface.`,
        suggestedFix: `Give at least one scene outside the ${zoneName684a} third a character-moment purpose — spreading dedicated reflection beats across the story keeps opportunities for belief to surface present at every stage.`,
      });
    }
  }

  // BELIEF_CURIOSITY_DROUGHT_RUN — Run-based × curiosityDelta>0 absence. Built on checkDroughtRun
  // from the shared checks library. n≥10, ≥3 curiosity-spike scenes overall, fires when the
  // longest consecutive run of scenes with no new curiosity spike reaches 6. curiosityDelta has
  // only ever anchored average-based hand-rolled logic and Wave 642's single co-occurrence check
  // against seededClueIds; the run-based mode applied to this channel for the first time.
  {
    const r684b = checkDroughtRun({
      records, minRecords: 10, minPresentCount: 3, runThreshold: 6,
      isPresent: r => (r.curiosityDelta ?? 0) > 0,
    });
    if (r684b.fires) {
      issues.push({
        location: `longest stretch with no new curiosity spike: ${r684b.longestRun} consecutive scenes`,
        rule: 'BELIEF_CURIOSITY_DROUGHT_RUN',
        severity: 'minor',
        description: `The story contains a run of ${r684b.longestRun} consecutive scenes with no new curiosity spike at all, even though ${r684b.presentCount} scenes elsewhere raise a fresh question. A long unbroken stretch with nothing new to wonder about leaves the belief-tracking layer's sense of active questioning dormant for an extended run.`,
        suggestedFix: `Raise a new question or unknown somewhere within the ${r684b.longestRun}-scene stretch so the belief-tracking layer's sense of active curiosity keeps building throughout that stretch.`,
      });
    }
  }

  // BELIEF_SUSPENSE_PEAK_UNCAUSED — Single-peak isolation/backward-cause × suspenseDelta
  // magnitude. Built on checkPeakUncaused from the shared checks library. n≥8, ≥2 scenes with a
  // positive suspense delta, a 2-scene lookback. Finds the single scene where suspense spikes
  // hardest; fires when neither that scene nor either of the two before it contains a dramatic
  // turn or revelation. suspenseDelta has only ever anchored average-based hand-rolled logic
  // (e.g. avgRevSusp, tenseRevScenes) in this pass; never checked for backward causation.
  {
    const r684c = checkPeakUncaused({
      records, minRecords: 8, minQualifying: 2, lookback: 2,
      magnitude: r => Math.max(0, r.suspenseDelta ?? 0),
      hasCause: r => r.dramaticTurn !== 'nothing' || r.revelation != null,
    });
    if (r684c.fires) {
      issues.push({
        location: `scene ${r684c.peakIdx + 1} — peak suspense spike (${r684c.peakMagnitude}) with no dramatic turn or revelation nearby`,
        rule: 'BELIEF_SUSPENSE_PEAK_UNCAUSED',
        severity: 'minor',
        description: `The story's single sharpest suspense spike (scene ${r684c.peakIdx + 1}, delta ${r684c.peakMagnitude}) has no dramatic turn or revelation in itself or the two scenes before it. The moment where tension rises most sharply arrives without any structural pivot or disclosure driving it — an uncaused spike that undercuts the belief-tracking layer's sense of causal escalation.`,
        suggestedFix: `Give scene ${r684c.peakIdx + 1} — or one of the two scenes just before it — a dramatic turn or revelation, so the story's sharpest rise in tension is earned by a shift in circumstance rather than arriving in a causal vacuum.`,
      });
    }
  }

  // ── Wave 698: BELIEF_PAYOFF_DROUGHT_RUN, BELIEF_SEED_PEAK_UNCAUSED, BELIEF_HIGHLIGHT_ZONE_CLUSTER ──

  // BELIEF_PAYOFF_DROUGHT_RUN — Run-based × payoffSetupIds absence. Built on checkDroughtRun from
  // the shared checks library. n≥10, ≥3 payoff scenes overall, fires when the longest consecutive
  // run of scenes with zero thread resolution reaches 6. Wave 656 applied the backward-cause peak
  // mode to payoffSetupIds; the drought-run mode has never been applied to this channel.
  {
    const r698a = checkDroughtRun({
      records, minRecords: 10, minPresentCount: 3, runThreshold: 6,
      isPresent: r => (r.payoffSetupIds ?? []).length > 0,
    });
    if (r698a.fires) {
      issues.push({
        location: `longest stretch with no payoff: ${r698a.longestRun} consecutive scenes`,
        rule: 'BELIEF_PAYOFF_DROUGHT_RUN',
        severity: 'minor',
        description: `The story contains a run of ${r698a.longestRun} consecutive scenes with no thread resolving at all, even though ${r698a.presentCount} scenes elsewhere do pay off a setup. A long stretch where nothing resolves leaves the belief-tracking layer's sense of accumulating clarity dormant for an extended run.`,
        suggestedFix: `Resolve at least one thread somewhere within the ${r698a.longestRun}-scene stretch so the belief-tracking layer's sense of accumulating clarity keeps building throughout that stretch.`,
      });
    }
  }

  // BELIEF_SEED_PEAK_UNCAUSED — Single-peak isolation/backward-cause × seededClueIds magnitude.
  // Built on checkPeakUncaused from the shared checks library. n≥8, ≥2 seed scenes, a 2-scene
  // lookback. Finds the single scene with the most simultaneous clues planted; fires when neither
  // that scene nor either of the two before it contains a dramatic turn or revelation. Wave 656
  // applied the zone-cluster mode to seededClueIds; the backward-cause peak mode has never been
  // applied to this channel.
  {
    const r698b = checkPeakUncaused({
      records, minRecords: 8, minQualifying: 2, lookback: 2,
      magnitude: r => (r.seededClueIds ?? []).length,
      hasCause: r => r.dramaticTurn !== 'nothing' || r.revelation != null,
    });
    if (r698b.fires) {
      issues.push({
        location: `scene ${r698b.peakIdx + 1} — peak seed density (${r698b.peakMagnitude}) with no dramatic turn or revelation nearby`,
        rule: 'BELIEF_SEED_PEAK_UNCAUSED',
        severity: 'minor',
        description: `The story's single densest scene for planting new clues (scene ${r698b.peakIdx + 1}, with ${r698b.peakMagnitude} clues seeded at once) has no dramatic turn or revelation in itself or the two scenes before it. The moment where foreshadowing concentrates most heavily arrives without any structural pivot or disclosure driving it — an uncaused spike that undercuts the belief-tracking layer's sense of causal escalation.`,
        suggestedFix: `Give scene ${r698b.peakIdx + 1} — or one of the two scenes just before it — a dramatic turn or revelation, so the story's most seed-dense moment is earned by a shift in circumstance rather than arriving in a causal vacuum.`,
      });
    }
  }

  // BELIEF_HIGHLIGHT_ZONE_CLUSTER — Distribution/timing × dialogueHighlights × structural thirds.
  // Built on checkZoneCluster from the shared checks library. n≥9, ≥3 highlighted-dialogue scenes,
  // fires when >75% of them fall in a single structural third. Wave 670 applied the backward-cause
  // peak mode to dialogueHighlights, this pass's most heavily used field; the zone-cluster mode has
  // never been applied to it.
  {
    const r698c = checkZoneCluster({
      records, minRecords: 9, minCount: 3, ratioThreshold: 0.75,
      isPresent: r => (r.dialogueHighlights ?? []).length > 0,
    });
    if (r698c.fires) {
      const zoneName698c = r698c.zoneNames[r698c.maxZoneIdx];
      issues.push({
        location: `${zoneName698c} third — ${r698c.maxZoneCount}/${r698c.count} highlighted-dialogue scenes`,
        rule: 'BELIEF_HIGHLIGHT_ZONE_CLUSTER',
        severity: 'minor',
        description: `${r698c.maxZoneCount} of the story's ${r698c.count} scenes carrying a standout line of dialogue (${Math.round((r698c.maxZoneCount / r698c.count) * 100)}%) cluster in the ${zoneName698c} third. Memorable dialogue concentrates almost exclusively in that stretch rather than landing throughout, leaving other structural thirds with nothing verbally memorable to anchor a character's stated belief.`,
        suggestedFix: `Give at least one scene outside the ${zoneName698c} third a standout line of dialogue — spreading memorable dialogue across the story lets belief and conviction surface verbally in every structural third.`,
      });
    }
  }

  // ── Wave 712: BELIEF_PAYOFF_ZONE_CLUSTER, BELIEF_SEED_DROUGHT_RUN, BELIEF_HIGHLIGHT_DROUGHT_RUN ──

  // BELIEF_PAYOFF_ZONE_CLUSTER — Distribution/timing × payoffSetupIds × structural thirds. Built
  // on checkZoneCluster from the shared checks library. n≥9, ≥3 payoff scenes, fires when >75% of
  // them fall in a single structural third. Waves 656/698 applied the backward-cause peak and
  // drought-run modes to payoffSetupIds; the zone-cluster mode has never been applied to it,
  // completing the trio.
  {
    const r712a = checkZoneCluster({
      records, minRecords: 9, minCount: 3, ratioThreshold: 0.75,
      isPresent: r => (r.payoffSetupIds ?? []).length > 0,
    });
    if (r712a.fires) {
      const zoneName712a = r712a.zoneNames[r712a.maxZoneIdx];
      issues.push({
        location: `${zoneName712a} third — ${r712a.maxZoneCount}/${r712a.count} payoff scenes`,
        rule: 'BELIEF_PAYOFF_ZONE_CLUSTER',
        severity: 'minor',
        description: `${r712a.maxZoneCount} of the story's ${r712a.count} thread-resolution scenes (${Math.round((r712a.maxZoneCount / r712a.count) * 100)}%) cluster in the ${zoneName712a} third. Resolution concentrates almost exclusively in that stretch rather than landing throughout, leaving other structural thirds with no sense of the belief-tracking layer's questions being answered.`,
        suggestedFix: `Let at least one thread resolve outside the ${zoneName712a} third — spreading resolutions across the story lets the belief-tracking layer's sense of clarity build gradually instead of arriving all at once.`,
      });
    }
  }

  // BELIEF_SEED_DROUGHT_RUN — Run-based × seededClueIds absence. Built on checkDroughtRun from
  // the shared checks library. n≥10, ≥3 seed scenes overall, fires when the longest consecutive
  // run of scenes with zero clue seeded reaches 6. Waves 656/698 applied the zone-cluster and
  // backward-cause peak modes to seededClueIds; the drought-run mode has never been applied to
  // it, completing the trio.
  {
    const r712b = checkDroughtRun({
      records, minRecords: 10, minPresentCount: 3, runThreshold: 6,
      isPresent: r => (r.seededClueIds ?? []).length > 0,
    });
    if (r712b.fires) {
      issues.push({
        location: `longest stretch with no clue seeded: ${r712b.longestRun} consecutive scenes`,
        rule: 'BELIEF_SEED_DROUGHT_RUN',
        severity: 'minor',
        description: `The story contains a run of ${r712b.longestRun} consecutive scenes with no clue seeded at all, even though ${r712b.presentCount} scenes elsewhere do plant new material. A long unbroken stretch where nothing new is planted leaves the belief-tracking layer coasting on prior setups with nothing fresh to draw on.`,
        suggestedFix: `Seed a new clue or thread somewhere within the ${r712b.longestRun}-scene stretch so the belief-tracking layer keeps planting forward momentum throughout, not only in isolated bursts.`,
      });
    }
  }

  // BELIEF_HIGHLIGHT_DROUGHT_RUN — Run-based × dialogueHighlights absence. Built on
  // checkDroughtRun from the shared checks library. n≥10, ≥3 highlighted-dialogue scenes overall,
  // fires when the longest consecutive run of scenes with no highlighted dialogue reaches 6.
  // Waves 670/698 applied the backward-cause peak and zone-cluster modes to this pass's most
  // heavily used field; the drought-run mode has never been applied to it, completing the trio.
  {
    const r712c = checkDroughtRun({
      records, minRecords: 10, minPresentCount: 3, runThreshold: 6,
      isPresent: r => (r.dialogueHighlights ?? []).length > 0,
    });
    if (r712c.fires) {
      issues.push({
        location: `longest stretch with no highlighted dialogue: ${r712c.longestRun} consecutive scenes`,
        rule: 'BELIEF_HIGHLIGHT_DROUGHT_RUN',
        severity: 'minor',
        description: `The story contains a run of ${r712c.longestRun} consecutive scenes with no highlighted dialogue at all, even though ${r712c.presentCount} scenes elsewhere carry a standout line. A long unbroken stretch with nothing verbally memorable leaves the belief-tracking layer with no character stating a conviction worth tracking for an extended run.`,
        suggestedFix: `Give at least one scene within the ${r712c.longestRun}-scene stretch a standout line of dialogue — a character stating what they believe memorably, keeping the belief-tracking layer's verbal register alive throughout.`,
      });
    }
  }

  // ── Wave 726: BELIEF_CLOCK_DELTA_ZONE_CLUSTER, BELIEF_STAGING_PEAK_UNCAUSED,
  //              BELIEF_OPEN_THREAD_ZONE_CLUSTER ──────────────────────────────────────────

  // BELIEF_CLOCK_DELTA_ZONE_CLUSTER — Distribution/timing × clockDelta>0 presence × structural
  // thirds. Built on checkZoneCluster from the shared checks library. n≥9, ≥3 scenes with a
  // positive clock delta, fires when more than 75% of those scenes cluster in a single third.
  // Wave 628 applied the backward-cause peak mode to clockDelta; the zone-cluster mode has never
  // been applied to it.
  {
    const r726a = checkZoneCluster({
      records, minRecords: 9, minCount: 3, ratioThreshold: 0.75,
      isPresent: r => (r.clockDelta ?? 0) > 0,
    });
    if (r726a.fires) {
      issues.push({
        location: `${r726a.zoneNames[r726a.maxZoneIdx]} third — ${r726a.maxZoneCount} of ${r726a.count} clock-advancing scenes`,
        rule: 'BELIEF_CLOCK_DELTA_ZONE_CLUSTER',
        severity: 'minor',
        description: `${Math.round((r726a.maxZoneCount / r726a.count) * 100)}% of the scenes that advance the ticking clock cluster in the story's ${r726a.zoneNames[r726a.maxZoneIdx]} third. When every clock-tightening beat lands in the same structural window, the belief-tracking layer loses any sense of mounting pressure recurring across the whole story.`,
        suggestedFix: `Move at least one clock-advancing beat outside the ${r726a.zoneNames[r726a.maxZoneIdx]} third so the pressure on characters' convictions tightens more evenly across the story.`,
      });
    }
  }

  // BELIEF_STAGING_PEAK_UNCAUSED — Single-peak isolation/backward-cause × visualBeats magnitude.
  // Built on checkPeakUncaused from the shared checks library. n≥8, ≥2 visually dense scenes, a
  // 2-scene lookback. Finds the single scene with the most visual beats; fires when neither that
  // scene nor either of the two before it contains a dramatic turn or revelation. Wave 642 applied
  // the zone-cluster mode to visualBeats; the backward-cause peak mode has never been applied to
  // it.
  {
    const r726b = checkPeakUncaused({
      records, minRecords: 8, minQualifying: 2, lookback: 2,
      magnitude: r => (r.visualBeats ?? []).length,
      hasCause: r => r.dramaticTurn !== 'nothing' || r.revelation != null,
    });
    if (r726b.fires) {
      issues.push({
        location: `scene ${r726b.peakIdx + 1} — peak visual-beat density (${r726b.peakMagnitude}) with no dramatic turn or revelation nearby`,
        rule: 'BELIEF_STAGING_PEAK_UNCAUSED',
        severity: 'minor',
        description: `The story's single most visually dense scene (scene ${r726b.peakIdx + 1}, with ${r726b.peakMagnitude} staged beats) has no dramatic turn or revelation in itself or the two scenes before it. The moment where staging carries the most visual weight arrives without any structural pivot or disclosure driving it — an uncaused spectacle that gives the belief-tracking layer nothing causal to anchor to.`,
        suggestedFix: `Give scene ${r726b.peakIdx + 1} — or one of the two scenes just before it — a dramatic turn or revelation, so the story's most visually loaded moment is earned rather than arriving in a causal vacuum.`,
      });
    }
  }

  // BELIEF_OPEN_THREAD_ZONE_CLUSTER — Distribution/timing × unresolvedClues × structural thirds.
  // Built on checkZoneCluster from the shared checks library. n≥9, ≥3 open-thread scenes, fires
  // when more than 75% of those scenes cluster in a single third. Wave 642 applied the run-based
  // drought mode to unresolvedClues; the zone-cluster mode has never been applied to it.
  {
    const r726c = checkZoneCluster({
      records, minRecords: 9, minCount: 3, ratioThreshold: 0.75,
      isPresent: r => (r.unresolvedClues ?? []).length > 0,
    });
    if (r726c.fires) {
      issues.push({
        location: `${r726c.zoneNames[r726c.maxZoneIdx]} third — ${r726c.maxZoneCount} of ${r726c.count} open-thread scenes`,
        rule: 'BELIEF_OPEN_THREAD_ZONE_CLUSTER',
        severity: 'minor',
        description: `${Math.round((r726c.maxZoneCount / r726c.count) * 100)}% of the scenes carrying outstanding clue-debt cluster in the story's ${r726c.zoneNames[r726c.maxZoneIdx]} third. When every open question is left dangling in the same structural window, the belief-tracking layer has no unresolved mystery pressing on characters' convictions anywhere else in the story.`,
        suggestedFix: `Seed or carry forward at least one open thread outside the ${r726c.zoneNames[r726c.maxZoneIdx]} third so unresolved mystery keeps pressing on the story's beliefs throughout.`,
      });
    }
  }

  // ── Wave 740: BELIEF_CLOCK_DELTA_DROUGHT_RUN, BELIEF_OPEN_THREAD_PEAK_UNCAUSED,
  //              BELIEF_STAGING_DROUGHT_RUN ───────────────────────────────────────────────

  // BELIEF_CLOCK_DELTA_DROUGHT_RUN — Run-based × clockDelta≠0 absence. Built on checkDroughtRun
  // from the shared checks library. n≥10, ≥3 clock-shifting scenes overall, fires when the
  // longest consecutive run of scenes with zero clock movement reaches 6. Waves 628/726 applied
  // the backward-cause peak and zone-cluster modes to clockDelta; the drought-run mode has never
  // been applied to it, completing the trio.
  {
    const r740a = checkDroughtRun({
      records, minRecords: 10, minPresentCount: 3, runThreshold: 6,
      isPresent: r => (r.clockDelta ?? 0) !== 0,
    });
    if (r740a.fires) {
      issues.push({
        location: `longest stretch with no clock movement: ${r740a.longestRun} consecutive scenes`,
        rule: 'BELIEF_CLOCK_DELTA_DROUGHT_RUN',
        severity: 'minor',
        description: `The story contains a run of ${r740a.longestRun} consecutive scenes with zero movement on the ticking clock at all, even though ${r740a.presentCount} scenes elsewhere do shift it. A long unbroken stretch where nothing tightens or loosens the deadline leaves the belief-tracking layer without any external pressure testing characters' convictions for an extended run.`,
        suggestedFix: `Move the clock — tighten or ease the deadline — somewhere within the ${r740a.longestRun}-scene stretch so external pressure keeps testing the story's beliefs throughout that stretch.`,
      });
    }
  }

  // BELIEF_OPEN_THREAD_PEAK_UNCAUSED — Single-peak isolation/backward-cause × unresolvedClues
  // magnitude. Built on checkPeakUncaused from the shared checks library. n≥8, ≥2 scenes carrying
  // outstanding clue-debt, a 2-scene lookback. Finds the single scene with the most simultaneous
  // open threads; fires when neither that scene nor either of the two before it contains a
  // dramatic turn or revelation. Waves 642/726 applied the run-based drought and zone-cluster
  // modes to unresolvedClues; the backward-cause peak mode has never been applied to it,
  // completing the trio.
  {
    const r740b = checkPeakUncaused({
      records, minRecords: 8, minQualifying: 2, lookback: 2,
      magnitude: r => (r.unresolvedClues ?? []).length,
      hasCause: r => r.dramaticTurn !== 'nothing' || r.revelation != null,
    });
    if (r740b.fires) {
      issues.push({
        location: `scene ${r740b.peakIdx + 1} — peak open-thread density (${r740b.peakMagnitude}) with no dramatic turn or revelation nearby`,
        rule: 'BELIEF_OPEN_THREAD_PEAK_UNCAUSED',
        severity: 'minor',
        description: `The story's single densest scene for outstanding clue-debt (scene ${r740b.peakIdx + 1}, with ${r740b.peakMagnitude} open threads) has no dramatic turn or revelation in itself or the two scenes before it. The moment where unresolved mystery concentrates most heavily arrives without any structural pivot or disclosure driving it — the belief-tracking layer's peak of accumulated question carries no causal weight behind it.`,
        suggestedFix: `Give scene ${r740b.peakIdx + 1} — or one of the two scenes just before it — a dramatic turn or revelation, so the story's most mystery-dense moment is earned by a shift in circumstance rather than arriving in a causal vacuum.`,
      });
    }
  }

  // BELIEF_STAGING_DROUGHT_RUN — Run-based × visualBeats absence. Built on checkDroughtRun from
  // the shared checks library. n≥10, ≥3 visually dense scenes overall, fires when the longest
  // consecutive run of scenes with no staged beats reaches 6. Waves 642/726 applied the
  // zone-cluster and backward-cause peak modes to visualBeats; the drought-run mode has never been
  // applied to it, completing the trio.
  {
    const r740c = checkDroughtRun({
      records, minRecords: 10, minPresentCount: 3, runThreshold: 6,
      isPresent: r => (r.visualBeats ?? []).length > 0,
    });
    if (r740c.fires) {
      issues.push({
        location: `longest stretch with no visual staging: ${r740c.longestRun} consecutive scenes`,
        rule: 'BELIEF_STAGING_DROUGHT_RUN',
        severity: 'minor',
        description: `The story contains a run of ${r740c.longestRun} consecutive scenes with no visual staging beats at all, even though ${r740c.presentCount} scenes elsewhere do carry physical staging. A long unbroken stretch with nothing physically shown leaves the belief-tracking layer with no concrete image to anchor a character's conviction to for an extended run.`,
        suggestedFix: `Add a physical staging beat somewhere within the ${r740c.longestRun}-scene stretch so the belief-tracking layer keeps a concrete image to anchor conviction to throughout that stretch.`,
      });
    }
  }

  // ── Wave 754: BELIEF_RELATIONSHIP_PEAK_UNCAUSED, BELIEF_TURN_DROUGHT_RUN,
  //              BELIEF_SUSPENSE_ZONE_CLUSTER ─────────────────────────────────────────────

  // BELIEF_RELATIONSHIP_PEAK_UNCAUSED — Single-peak isolation/backward-cause × relationshipShifts
  // magnitude. Built on checkPeakUncaused from the shared checks library. n≥8, ≥2 scenes carrying
  // a relationship shift, a 2-scene lookback. Finds the single scene with the most simultaneous
  // bond changes; fires when neither that scene nor either of the two before it contains a
  // dramatic turn or revelation. Wave 670 applied the run-based drought mode to
  // relationshipShifts; the backward-cause peak mode has never been applied to it.
  {
    const r754a = checkPeakUncaused({
      records, minRecords: 8, minQualifying: 2, lookback: 2,
      magnitude: r => (r.relationshipShifts ?? []).length,
      hasCause: r => r.dramaticTurn !== 'nothing' || r.revelation != null,
    });
    if (r754a.fires) {
      issues.push({
        location: `scene ${r754a.peakIdx + 1} — peak relationship-shift density (${r754a.peakMagnitude}) with no dramatic turn or revelation nearby`,
        rule: 'BELIEF_RELATIONSHIP_PEAK_UNCAUSED',
        severity: 'minor',
        description: `The story's single densest scene for relationship shifts (scene ${r754a.peakIdx + 1}, with ${r754a.peakMagnitude} simultaneous bond changes) has no dramatic turn or revelation in itself or the two scenes before it. The moment where relational upheaval concentrates most heavily arrives without any structural pivot or disclosure driving it — the belief-tracking layer has no causal ground for the moment characters' convictions about each other shift hardest.`,
        suggestedFix: `Give scene ${r754a.peakIdx + 1} — or one of the two scenes just before it — a dramatic turn or revelation, so the story's most relationally dense moment is earned by a shift in circumstance rather than arriving in a causal vacuum.`,
      });
    }
  }

  // BELIEF_TURN_DROUGHT_RUN — Run-based × dramaticTurn !== 'nothing' absence. Built on
  // checkDroughtRun from the shared checks library. n≥10, ≥3 turn scenes overall, fires when the
  // longest consecutive run of scenes with no dramatic turn reaches 6. Wave 670 applied the
  // zone-cluster mode to this signal; the drought-run mode has never been applied to it.
  {
    const r754b = checkDroughtRun({
      records, minRecords: 10, minPresentCount: 3, runThreshold: 6,
      isPresent: r => (r.dramaticTurn ?? 'nothing') !== 'nothing',
    });
    if (r754b.fires) {
      issues.push({
        location: `longest stretch with no dramatic turn: ${r754b.longestRun} consecutive scenes`,
        rule: 'BELIEF_TURN_DROUGHT_RUN',
        severity: 'minor',
        description: `The story contains a run of ${r754b.longestRun} consecutive scenes with no dramatic turn at all, even though ${r754b.presentCount} scenes elsewhere do pivot. A long unbroken stretch with nothing reversing or complicating the situation leaves the belief-tracking layer with no structural pivot to test characters' convictions against for an extended run.`,
        suggestedFix: `Introduce a dramatic turn somewhere within the ${r754b.longestRun}-scene stretch so the belief-tracking layer keeps a structural pivot testing convictions throughout that stretch.`,
      });
    }
  }

  // BELIEF_SUSPENSE_ZONE_CLUSTER — Distribution/timing × suspenseDelta>0 presence × structural
  // thirds. Built on checkZoneCluster from the shared checks library. n≥9, ≥3 suspense-positive
  // scenes, fires when more than 75% of those scenes cluster in a single third. Wave 684 applied
  // the backward-cause peak mode to suspenseDelta; the zone-cluster mode has never been applied
  // to it.
  {
    const r754c = checkZoneCluster({
      records, minRecords: 9, minCount: 3, ratioThreshold: 0.75,
      isPresent: r => (r.suspenseDelta ?? 0) > 0,
    });
    if (r754c.fires) {
      issues.push({
        location: `${r754c.zoneNames[r754c.maxZoneIdx]} third — ${r754c.maxZoneCount} of ${r754c.count} suspense-positive scenes`,
        rule: 'BELIEF_SUSPENSE_ZONE_CLUSTER',
        severity: 'minor',
        description: `${Math.round((r754c.maxZoneCount / r754c.count) * 100)}% of the scenes where tension rises cluster in the ${r754c.zoneNames[r754c.maxZoneIdx]} third. When every suspense spike lands in the same structural window, the belief-tracking layer has no rising danger testing characters' convictions anywhere else in the story.`,
        suggestedFix: `Raise suspense in at least one scene outside the ${r754c.zoneNames[r754c.maxZoneIdx]} third so the belief-tracking layer keeps tension testing convictions more evenly across the story.`,
      });
    }
  }

  // ── Wave 768: BELIEF_RELATIONSHIP_ZONE_CLUSTER, BELIEF_CHARACTER_MOMENT_DROUGHT_RUN,
  //              BELIEF_SUSPENSE_DROUGHT_RUN ──────────────────────────────────────

  // BELIEF_RELATIONSHIP_ZONE_CLUSTER — Distribution/timing × relationshipShifts presence ×
  // structural thirds. Built on checkZoneCluster from the shared checks library. n≥9, ≥3 scenes
  // carrying a relationship shift, fires when more than 75% of those scenes cluster in a single
  // third. Waves 670/754 applied the run-based drought and backward-cause peak modes to
  // relationshipShifts; the zone-cluster mode has never been applied to it, completing the trio.
  {
    const r768a = checkZoneCluster({
      records, minRecords: 9, minCount: 3, ratioThreshold: 0.75,
      isPresent: r => (r.relationshipShifts ?? []).length > 0,
    });
    if (r768a.fires) {
      issues.push({
        location: `${r768a.zoneNames[r768a.maxZoneIdx]} third — ${r768a.maxZoneCount} of ${r768a.count} relationship-shift scenes`,
        rule: 'BELIEF_RELATIONSHIP_ZONE_CLUSTER',
        severity: 'minor',
        description: `${Math.round((r768a.maxZoneCount / r768a.count) * 100)}% of the scenes where a bond shifts cluster in the ${r768a.zoneNames[r768a.maxZoneIdx]} third. When every relational change lands in the same structural window, the belief-tracking layer has no bond movement testing convictions anywhere else in the story.`,
        suggestedFix: `Shift a relationship in at least one scene outside the ${r768a.zoneNames[r768a.maxZoneIdx]} third so bond movement keeps testing convictions more evenly across the story.`,
      });
    }
  }

  // BELIEF_CHARACTER_MOMENT_DROUGHT_RUN — Run-based × purpose === 'character_moment' absence.
  // Built on checkDroughtRun from the shared checks library. n≥10, ≥3 character-moment scenes
  // overall, fires when the longest consecutive run of scenes purposed otherwise reaches 6. Wave
  // 684 applied the zone-cluster mode to this signal; the drought-run mode has never been applied
  // to it.
  {
    const r768b = checkDroughtRun({
      records, minRecords: 10, minPresentCount: 3, runThreshold: 6,
      isPresent: r => r.purpose === 'character_moment',
    });
    if (r768b.fires) {
      issues.push({
        location: `longest stretch with no character-moment scene: ${r768b.longestRun} consecutive scenes`,
        rule: 'BELIEF_CHARACTER_MOMENT_DROUGHT_RUN',
        severity: 'minor',
        description: `The story contains a run of ${r768b.longestRun} consecutive scenes purposed otherwise than a character moment, even though ${r768b.presentCount} scenes elsewhere are dedicated to the protagonist's inner life. A long unbroken stretch with nothing but plot-forward scenes leaves the belief-tracking layer with no interior beat to surface convictions through for an extended run.`,
        suggestedFix: `Purpose at least one scene within the ${r768b.longestRun}-scene stretch as a character moment so the belief-tracking layer keeps a beat of interior reflection throughout that stretch.`,
      });
    }
  }

  // BELIEF_SUSPENSE_DROUGHT_RUN — Run-based × suspenseDelta>0 absence. Built on checkDroughtRun
  // from the shared checks library. n≥10, ≥3 suspense-positive scenes overall, fires when the
  // longest consecutive run of scenes with no suspense rise reaches 6. Waves 684/754 applied the
  // backward-cause peak and zone-cluster modes to suspenseDelta; the drought-run mode has never
  // been applied to it, completing the trio.
  {
    const r768c = checkDroughtRun({
      records, minRecords: 10, minPresentCount: 3, runThreshold: 6,
      isPresent: r => (r.suspenseDelta ?? 0) > 0,
    });
    if (r768c.fires) {
      issues.push({
        location: `longest stretch with no rising tension: ${r768c.longestRun} consecutive scenes`,
        rule: 'BELIEF_SUSPENSE_DROUGHT_RUN',
        severity: 'minor',
        description: `The story contains a run of ${r768c.longestRun} consecutive scenes with no rise in suspense at all, even though ${r768c.presentCount} scenes elsewhere do raise tension. A long unbroken stretch with nothing testing characters under pressure leaves the belief-tracking layer with no danger to expose convictions for an extended run.`,
        suggestedFix: `Raise suspense somewhere within the ${r768c.longestRun}-scene stretch so the belief-tracking layer keeps a live thread of tension exposing convictions through that stretch.`,
      });
    }
  }

  // ── Wave 782: BELIEF_CURIOSITY_ZONE_CLUSTER, BELIEF_CURIOSITY_PEAK_UNCAUSED,
  //              BELIEF_CLOCK_RAISED_ZONE_CLUSTER ──────────────────────────────────────

  // BELIEF_CURIOSITY_ZONE_CLUSTER — Distribution/timing × curiosityDelta>0 presence × structural
  // thirds. Built on checkZoneCluster from the shared checks library. n≥9, ≥3 curiosity-positive
  // scenes, fires when more than 75% of those scenes cluster in a single third. Wave 642 applied
  // the run-based drought mode to curiosityDelta; the zone-cluster mode has never been applied to
  // it.
  {
    const r782a = checkZoneCluster({
      records, minRecords: 9, minCount: 3, ratioThreshold: 0.75,
      isPresent: r => (r.curiosityDelta ?? 0) > 0,
    });
    if (r782a.fires) {
      issues.push({
        location: `${r782a.zoneNames[r782a.maxZoneIdx]} third — ${r782a.maxZoneCount} of ${r782a.count} curiosity-positive scenes`,
        rule: 'BELIEF_CURIOSITY_ZONE_CLUSTER',
        severity: 'minor',
        description: `${Math.round((r782a.maxZoneCount / r782a.count) * 100)}% of the scenes where curiosity rises cluster in the ${r782a.zoneNames[r782a.maxZoneIdx]} third. When every spike in audience wonder lands in the same structural window, the belief-tracking layer has no fresh question testing convictions anywhere else in the story.`,
        suggestedFix: `Raise curiosity in at least one scene outside the ${r782a.zoneNames[r782a.maxZoneIdx]} third so the belief-tracking layer keeps a fresh question testing convictions more evenly across the story.`,
      });
    }
  }

  // BELIEF_CURIOSITY_PEAK_UNCAUSED — Backward-cause × curiosityDelta-as-magnitude × 2-scene
  // lookback. Built on checkPeakUncaused from the shared checks library. n≥8, ≥2 curiosity-
  // positive scenes, fires when the peak curiosity scene has no dramatic turn or revelation in
  // the 2 scenes preceding it. The existing REVELATION_CURIOSITY_PEAK_ABSENT/TOLD_BELIEF_
  // CURIOSITY_PEAK_ABSENT audit co-occurrence AT the peak curiosity scene, and REVELATION_
  // CURIOSITY_PEAK_EARLY audits a fixed early-quarter zone; none looks backward from the peak for
  // a preparing cause, so the shared-library backward-cause mode has never been applied to
  // curiosityDelta, completing the trio.
  {
    const r782b = checkPeakUncaused({
      records, minRecords: 8, minQualifying: 2, lookback: 2,
      magnitude: r => Math.max(0, r.curiosityDelta ?? 0),
      hasCause: r => (r.dramaticTurn ?? 'nothing') !== 'nothing' || r.revelation != null,
    });
    if (r782b.fires) {
      issues.push({
        location: `scene ${r782b.peakIdx} (peak curiosityDelta ${r782b.peakMagnitude}) — no preparing cause nearby`,
        rule: 'BELIEF_CURIOSITY_PEAK_UNCAUSED',
        severity: 'minor',
        description: `The story's single highest-curiosity scene (Scene ${r782b.peakIdx}, curiosityDelta ${r782b.peakMagnitude}) arrives with no dramatic turn or revelation in the 2 scenes leading into it, even though ${r782b.qualifyingCount} scenes elsewhere spark wonder. The moment the audience is most gripped by an open question lands out of nowhere — the belief-tracking layer hasn't built toward the mystery it's about to pose.`,
        suggestedFix: `Add a dramatic turn or revelation in one of the 2 scenes before scene ${r782b.peakIdx} so the belief-tracking layer earns its peak curiosity instead of springing it without preparation.`,
      });
    }
  }

  // BELIEF_CLOCK_RAISED_ZONE_CLUSTER — Distribution/timing × clockRaised === true presence ×
  // structural thirds. Built on checkZoneCluster from the shared checks library. n≥9, ≥3
  // clock-raising scenes, fires when more than 75% of those scenes cluster in a single third.
  // Wave 642 applied the run-based drought mode to clockRaised; the zone-cluster mode has never
  // been applied to it.
  {
    const r782c = checkZoneCluster({
      records, minRecords: 9, minCount: 3, ratioThreshold: 0.75,
      isPresent: r => r.clockRaised === true,
    });
    if (r782c.fires) {
      issues.push({
        location: `${r782c.zoneNames[r782c.maxZoneIdx]} third — ${r782c.maxZoneCount} of ${r782c.count} clock-raising scenes`,
        rule: 'BELIEF_CLOCK_RAISED_ZONE_CLUSTER',
        severity: 'minor',
        description: `${Math.round((r782c.maxZoneCount / r782c.count) * 100)}% of the story's clock-raising scenes cluster in the ${r782c.zoneNames[r782c.maxZoneIdx]} third. When every deadline arrives in the same structural window, the belief-tracking layer has no sustained urgency testing convictions anywhere else in the story.`,
        suggestedFix: `Raise a clock in at least one scene outside the ${r782c.zoneNames[r782c.maxZoneIdx]} third so the belief-tracking layer keeps urgency testing convictions more evenly across the story.`,
      });
    }
  }

  // ── Wave 796: BELIEF_REVELATION_PEAK_UNCAUSED, BELIEF_NEGATIVE_EMOTION_ZONE_CLUSTER,
  //              BELIEF_NEGATIVE_EMOTION_DROUGHT_RUN ──────────────────────────────────────

  // BELIEF_REVELATION_PEAK_UNCAUSED — Backward-cause × revelation-as-magnitude (0/1) × 2-scene
  // lookback. Built on checkPeakUncaused from the shared checks library. n≥8, ≥2 revelation
  // scenes, fires when the (first) revelation scene has no dramatic turn in itself or the 2
  // scenes preceding it. Distinct from REVELATION_UNPREPARED_CLIMAX (Wave 432), which anchors on
  // the LAST revelation and checks for a prior character ASSERTION, not a dramatic turn.
  // REVELATION_DROUGHT (Wave 446) and REVELATION_TEMPORAL_CLUSTER (Wave 488) are true hand-rolled
  // equivalents of checkDroughtRun and checkZoneCluster respectively, so this backward-cause peak
  // mode is the only one of the three shared-library trio modes never hand-rolled for revelation
  // in this pass. hasCause deliberately omits revelation to avoid circularity.
  {
    const r796a = checkPeakUncaused({
      records, minRecords: 8, minQualifying: 2, lookback: 2,
      magnitude: r => (r.revelation != null ? 1 : 0),
      hasCause: r => r.dramaticTurn !== 'nothing',
    });
    if (r796a.fires) {
      issues.push({
        location: `scene ${r796a.peakIdx + 1} — revelation with no dramatic turn nearby`,
        rule: 'BELIEF_REVELATION_PEAK_UNCAUSED',
        severity: 'minor',
        description: `Scene ${r796a.peakIdx + 1} discloses a revelation with no dramatic turn in itself or the two scenes before it, even though ${r796a.qualifyingCount} scenes elsewhere disclose a truth. A revelation that lands without any preceding pivot reads as a coincidence rather than something the belief-tracking layer's own turns forced into the open.`,
        suggestedFix: `Add a dramatic turn in scene ${r796a.peakIdx + 1} or one of the two scenes before it so the revelation reads as a consequence of the story's own turning points rather than arriving unprepared.`,
      });
    }
  }

  // BELIEF_NEGATIVE_EMOTION_ZONE_CLUSTER — Distribution/timing × emotionalShift='negative' ×
  // structural thirds. Built on checkZoneCluster from the shared checks library. n≥9, ≥3
  // negative-emotion scenes, fires when more than 75% of them fall in a single structural third.
  // Every existing negative-emotion check in this pass couples it to a revelation or assertion
  // scene (REVELATION_EMOTIONAL_MONOTONE, REVELATION_EMOTIONAL_AFTERMATH_FLAT, ASSERTION_
  // EMOTIONAL_AFTERMATH_FLAT); the shared-library cluster mode on emotionalShift as a standalone
  // global signal has never been applied.
  {
    const r796b = checkZoneCluster({
      records, minRecords: 9, minCount: 3, ratioThreshold: 0.75,
      isPresent: r => r.emotionalShift === 'negative',
    });
    if (r796b.fires) {
      issues.push({
        location: `${r796b.zoneNames[r796b.maxZoneIdx]} third — ${r796b.maxZoneCount} of ${r796b.count} negative-emotion scenes`,
        rule: 'BELIEF_NEGATIVE_EMOTION_ZONE_CLUSTER',
        severity: 'minor',
        description: `${Math.round((r796b.maxZoneCount / r796b.count) * 100)}% of the story's negative-emotion scenes cluster in the ${r796b.zoneNames[r796b.maxZoneIdx]} third. When all the darkness concentrates in one structural window, the belief-tracking layer carries its emotional cost in only one part of the story instead of testing convictions throughout.`,
        suggestedFix: `Introduce a negative-emotion scene outside the ${r796b.zoneNames[r796b.maxZoneIdx]} third so the belief-tracking layer's emotional cost tests convictions more evenly across the story.`,
      });
    }
  }

  // BELIEF_NEGATIVE_EMOTION_DROUGHT_RUN — Run-based × emotionalShift='negative' absence. Built on
  // checkDroughtRun from the shared checks library. n≥10, ≥3 negative-emotion scenes overall,
  // fires when the longest consecutive run of scenes with no negative charge reaches 6. Completes
  // 2 of 3 trio slots for emotionalShift alongside the zone-cluster mode added in this same wave
  // (the peak mode is conventionally skipped for this categorical field).
  {
    const r796c = checkDroughtRun({
      records, minRecords: 10, minPresentCount: 3, runThreshold: 6,
      isPresent: r => r.emotionalShift === 'negative',
    });
    if (r796c.fires) {
      issues.push({
        location: `longest stretch with no negative-emotion charge: ${r796c.longestRun} consecutive scenes`,
        rule: 'BELIEF_NEGATIVE_EMOTION_DROUGHT_RUN',
        severity: 'minor',
        description: `The story contains a run of ${r796c.longestRun} consecutive scenes with no negative-emotion charge at all, even though ${r796c.presentCount} scenes elsewhere carry one. A long unbroken stretch with no darkness leaves the belief-tracking layer with nothing testing convictions under emotional cost for an extended run.`,
        suggestedFix: `Give at least one scene within the ${r796c.longestRun}-scene stretch a negative emotional charge so the belief-tracking layer keeps testing convictions against cost throughout that stretch.`,
      });
    }
  }

  // ── Wave 810: BELIEF_STAKES_ZONE_CLUSTER, BELIEF_STAKES_DROUGHT_RUN,
  //              BELIEF_TURNING_POINT_ZONE_CLUSTER ──────────────────────────────────────

  // BELIEF_STAKES_ZONE_CLUSTER — Distribution/timing × purpose === 'raise_stakes' × structural
  // thirds. Built on checkZoneCluster from the shared checks library. n≥9, ≥3 stakes-raising
  // scenes, fires when more than 75% of them fall in a single structural third. This purpose
  // value has never been referenced anywhere in this pass; none of the three shared-library trio
  // modes has ever been applied to it.
  {
    const r810a = checkZoneCluster({
      records, minRecords: 9, minCount: 3, ratioThreshold: 0.75,
      isPresent: r => r.purpose === 'raise_stakes',
    });
    if (r810a.fires) {
      issues.push({
        location: `${r810a.zoneNames[r810a.maxZoneIdx]} third — ${r810a.maxZoneCount} of ${r810a.count} stakes-raising scenes`,
        rule: 'BELIEF_STAKES_ZONE_CLUSTER',
        severity: 'minor',
        description: `${Math.round((r810a.maxZoneCount / r810a.count) * 100)}% of the scenes purposed to raise stakes cluster in the ${r810a.zoneNames[r810a.maxZoneIdx]} third. When every escalation lands in the same structural window, the belief-tracking layer has no mounting pressure testing convictions anywhere else in the story.`,
        suggestedFix: `Purpose at least one scene outside the ${r810a.zoneNames[r810a.maxZoneIdx]} third to raise stakes so the belief-tracking layer keeps mounting pressure testing convictions more evenly across the story.`,
      });
    }
  }

  // BELIEF_STAKES_DROUGHT_RUN — Run-based × purpose === 'raise_stakes' absence. Built on
  // checkDroughtRun from the shared checks library. n≥10, ≥3 stakes-raising scenes overall, fires
  // when the longest consecutive run of scenes with no stakes-raising purpose reaches 6.
  // Completes 2 of 3 slots for this purpose value alongside the zone-cluster mode added in this
  // same wave (peak mode conventionally skipped for this categorical field).
  {
    const r810b = checkDroughtRun({
      records, minRecords: 10, minPresentCount: 3, runThreshold: 6,
      isPresent: r => r.purpose === 'raise_stakes',
    });
    if (r810b.fires) {
      issues.push({
        location: `longest stretch with no stakes-raising scene: ${r810b.longestRun} consecutive scenes`,
        rule: 'BELIEF_STAKES_DROUGHT_RUN',
        severity: 'minor',
        description: `The story contains a run of ${r810b.longestRun} consecutive scenes with no stakes-raising purpose at all, even though ${r810b.presentCount} scenes elsewhere escalate. A long unbroken stretch with nothing raising the stakes leaves the belief-tracking layer coasting without mounting pressure for an extended run.`,
        suggestedFix: `Purpose at least one scene within the ${r810b.longestRun}-scene stretch to raise stakes so the belief-tracking layer keeps mounting pressure throughout that stretch.`,
      });
    }
  }

  // BELIEF_TURNING_POINT_ZONE_CLUSTER — Distribution/timing × purpose === 'turning_point' ×
  // structural thirds. Built on checkZoneCluster from the shared checks library. n≥9, ≥3
  // turning-point scenes, fires when more than 75% of them fall in a single structural third.
  // This purpose value has never been referenced anywhere in this pass either; none of the three
  // shared-library trio modes has ever been applied to it.
  {
    const r810c = checkZoneCluster({
      records, minRecords: 9, minCount: 3, ratioThreshold: 0.75,
      isPresent: r => r.purpose === 'turning_point',
    });
    if (r810c.fires) {
      issues.push({
        location: `${r810c.zoneNames[r810c.maxZoneIdx]} third — ${r810c.maxZoneCount} of ${r810c.count} turning-point scenes`,
        rule: 'BELIEF_TURNING_POINT_ZONE_CLUSTER',
        severity: 'minor',
        description: `${Math.round((r810c.maxZoneCount / r810c.count) * 100)}% of the story's turning-point scenes cluster in the ${r810c.zoneNames[r810c.maxZoneIdx]} third. When every scene purposed as a turning point lands in the same structural window, the belief-tracking layer has no redirection testing convictions anywhere else in the story.`,
        suggestedFix: `Purpose at least one scene outside the ${r810c.zoneNames[r810c.maxZoneIdx]} third as a turning point so the belief-tracking layer keeps redirection testing convictions more evenly across the story.`,
      });
    }
  }

  // ── Wave 824: BELIEF_TURNING_POINT_DROUGHT_RUN, BELIEF_INTRODUCE_CONFLICT_ZONE_CLUSTER,
  //              BELIEF_POSITIVE_EMOTION_ZONE_CLUSTER ──────────────────────────────────────

  // BELIEF_TURNING_POINT_DROUGHT_RUN — Run-based × purpose === 'turning_point' absence. Built on
  // checkDroughtRun from the shared checks library. n≥10, ≥3 turning-point scenes overall, fires
  // when the longest consecutive run of scenes with no turning-point purpose reaches 6.
  // Completing 2 of 3 slots for this purpose value alongside the zone-cluster mode added in Wave
  // 810 (peak mode conventionally skipped for this categorical field).
  {
    const r824a = checkDroughtRun({
      records, minRecords: 10, minPresentCount: 3, runThreshold: 6,
      isPresent: r => r.purpose === 'turning_point',
    });
    if (r824a.fires) {
      issues.push({
        location: `longest stretch with no turning point: ${r824a.longestRun} consecutive scenes`,
        rule: 'BELIEF_TURNING_POINT_DROUGHT_RUN',
        severity: 'minor',
        description: `The story contains a run of ${r824a.longestRun} consecutive scenes with no turning-point purpose at all, even though ${r824a.presentCount} scenes elsewhere redirect events. A long unbroken stretch with no redirection leaves the belief-tracking layer coasting without a pivot to test convictions against for an extended run.`,
        suggestedFix: `Purpose at least one scene within the ${r824a.longestRun}-scene stretch as a turning point so the belief-tracking layer keeps a pivot to test convictions against throughout that stretch.`,
      });
    }
  }

  // BELIEF_INTRODUCE_CONFLICT_ZONE_CLUSTER — Distribution/timing × purpose ===
  // 'introduce_conflict' × structural thirds. Built on checkZoneCluster from the shared checks
  // library. n≥9, ≥3 conflict-introducing scenes, fires when more than 75% of them fall in a
  // single structural third. This purpose value has never been referenced anywhere in this pass —
  // a virgin field for all three shared-library trio modes.
  {
    const r824b = checkZoneCluster({
      records, minRecords: 9, minCount: 3, ratioThreshold: 0.75,
      isPresent: r => r.purpose === 'introduce_conflict',
    });
    if (r824b.fires) {
      issues.push({
        location: `${r824b.zoneNames[r824b.maxZoneIdx]} third — ${r824b.maxZoneCount} of ${r824b.count} conflict-introducing scenes`,
        rule: 'BELIEF_INTRODUCE_CONFLICT_ZONE_CLUSTER',
        severity: 'minor',
        description: `${Math.round((r824b.maxZoneCount / r824b.count) * 100)}% of the scenes purposed to introduce conflict cluster in the ${r824b.zoneNames[r824b.maxZoneIdx]} third. When every new conflict lands in the same structural window, the belief-tracking layer has no fresh friction testing convictions anywhere else in the story.`,
        suggestedFix: `Purpose at least one scene outside the ${r824b.zoneNames[r824b.maxZoneIdx]} third to introduce conflict so the belief-tracking layer keeps fresh friction testing convictions more evenly across the story.`,
      });
    }
  }

  // BELIEF_POSITIVE_EMOTION_ZONE_CLUSTER — Distribution/timing × emotionalShift === 'positive' ×
  // structural thirds. Built on checkZoneCluster from the shared checks library. n≥9, ≥3
  // positive-emotion scenes, fires when more than 75% of them fall in a single structural third.
  // The positive valence has only ever appeared inside co-occurrence checks like
  // ASSERTION_POSITIVE_DECOUPLED; none of the three shared-library trio modes has ever isolated
  // this valence on its own, mirroring the negative-valence trio completed in Wave 796.
  {
    const r824c = checkZoneCluster({
      records, minRecords: 9, minCount: 3, ratioThreshold: 0.75,
      isPresent: r => r.emotionalShift === 'positive',
    });
    if (r824c.fires) {
      issues.push({
        location: `${r824c.zoneNames[r824c.maxZoneIdx]} third — ${r824c.maxZoneCount} of ${r824c.count} positive-emotion scenes`,
        rule: 'BELIEF_POSITIVE_EMOTION_ZONE_CLUSTER',
        severity: 'minor',
        description: `${Math.round((r824c.maxZoneCount / r824c.count) * 100)}% of the story's positive-emotion scenes cluster in the ${r824c.zoneNames[r824c.maxZoneIdx]} third. When all the relief concentrates in one structural window, the belief-tracking layer records emotional payoff testing convictions in only one part of the story instead of throughout its full length.`,
        suggestedFix: `Introduce a positive-emotion scene outside the ${r824c.zoneNames[r824c.maxZoneIdx]} third so the belief-tracking layer registers emotional payoff testing convictions more evenly across the story.`,
      });
    }
  }

  // ── Wave 838: BELIEF_INTRODUCE_CONFLICT_DROUGHT_RUN, BELIEF_POSITIVE_EMOTION_DROUGHT_RUN,
  //              BELIEF_ESTABLISH_WORLD_ZONE_CLUSTER ──────────────────────────────────────

  // BELIEF_INTRODUCE_CONFLICT_DROUGHT_RUN — Run-based × purpose === 'introduce_conflict' absence.
  // Built on checkDroughtRun from the shared checks library. n≥10, ≥3 conflict-introducing scenes
  // overall, fires when the longest consecutive run of scenes with no conflict-introducing
  // purpose reaches 6. Completing 2 of 3 slots for this purpose value alongside the zone-cluster
  // mode added in Wave 824 (peak mode conventionally skipped for this categorical field).
  {
    const r838a = checkDroughtRun({
      records, minRecords: 10, minPresentCount: 3, runThreshold: 6,
      isPresent: r => r.purpose === 'introduce_conflict',
    });
    if (r838a.fires) {
      issues.push({
        location: `longest stretch with no new conflict: ${r838a.longestRun} consecutive scenes`,
        rule: 'BELIEF_INTRODUCE_CONFLICT_DROUGHT_RUN',
        severity: 'minor',
        description: `The story contains a run of ${r838a.longestRun} consecutive scenes with no conflict-introducing purpose at all, even though ${r838a.presentCount} scenes elsewhere open a new front. A long unbroken stretch with no fresh friction leaves the belief-tracking layer untested for an extended run.`,
        suggestedFix: `Purpose at least one scene within the ${r838a.longestRun}-scene stretch to introduce conflict so the belief-tracking layer keeps facing fresh friction testing convictions throughout that stretch.`,
      });
    }
  }

  // BELIEF_POSITIVE_EMOTION_DROUGHT_RUN — Run-based × emotionalShift === 'positive' absence.
  // Built on checkDroughtRun from the shared checks library. n≥10, ≥3 positive-emotion scenes
  // overall, fires when the longest consecutive run of scenes with no positive-emotion charge
  // reaches 6. Completing 2 of 3 slots for this valence alongside the zone-cluster mode added in
  // Wave 824 (peak mode conventionally skipped for this categorical field).
  {
    const r838b = checkDroughtRun({
      records, minRecords: 10, minPresentCount: 3, runThreshold: 6,
      isPresent: r => r.emotionalShift === 'positive',
    });
    if (r838b.fires) {
      issues.push({
        location: `longest stretch with no positive-emotion charge: ${r838b.longestRun} consecutive scenes`,
        rule: 'BELIEF_POSITIVE_EMOTION_DROUGHT_RUN',
        severity: 'minor',
        description: `The story contains a run of ${r838b.longestRun} consecutive scenes with no positive-emotion charge at all, even though ${r838b.presentCount} scenes elsewhere carry one. A long unbroken stretch with no relief leaves the belief-tracking layer without an emotional payoff testing convictions for an extended run.`,
        suggestedFix: `Give the story a moment of relief within the ${r838b.longestRun}-scene stretch so the belief-tracking layer keeps an emotional payoff testing convictions throughout that stretch.`,
      });
    }
  }

  // BELIEF_ESTABLISH_WORLD_ZONE_CLUSTER — Distribution/timing × purpose === 'establish_world' ×
  // structural thirds. Built on checkZoneCluster from the shared checks library. n≥9, ≥3
  // world-establishing scenes, fires when more than 75% of them fall in a single structural
  // third. This purpose value has never been referenced anywhere in this pass — a virgin field
  // for all three shared-library trio modes.
  {
    const r838c = checkZoneCluster({
      records, minRecords: 9, minCount: 3, ratioThreshold: 0.75,
      isPresent: r => r.purpose === 'establish_world',
    });
    if (r838c.fires) {
      issues.push({
        location: `${r838c.zoneNames[r838c.maxZoneIdx]} third — ${r838c.maxZoneCount} of ${r838c.count} world-establishing scenes`,
        rule: 'BELIEF_ESTABLISH_WORLD_ZONE_CLUSTER',
        severity: 'minor',
        description: `${Math.round((r838c.maxZoneCount / r838c.count) * 100)}% of the scenes purposed to establish the world cluster in the ${r838c.zoneNames[r838c.maxZoneIdx]} third. When every act of world-building concentrates in one structural window, the belief-tracking layer loses ground for grounding convictions anywhere else in the story.`,
        suggestedFix: `Purpose at least one scene outside the ${r838c.zoneNames[r838c.maxZoneIdx]} third to establish the world so the belief-tracking layer keeps grounding convictions more evenly across the story.`,
      });
    }
  }

  // ── Wave 852: BELIEF_CLIMAX_ZONE_CLUSTER, BELIEF_RESOLUTION_ZONE_CLUSTER,
  //              BELIEF_COMPLICATE_ZONE_CLUSTER ──────────────────────────────────────

  // BELIEF_CLIMAX_ZONE_CLUSTER — Distribution/timing × purpose === 'climax' × structural thirds.
  // Built on checkZoneCluster from the shared checks library. n≥9, ≥3 climax-purposed scenes,
  // fires when more than 75% of them fall in a single structural third. This purpose value has
  // never been referenced anywhere in this pass — a virgin field for all three shared-library
  // trio modes.
  {
    const r852a = checkZoneCluster({
      records, minRecords: 9, minCount: 3, ratioThreshold: 0.75,
      isPresent: r => r.purpose === 'climax',
    });
    if (r852a.fires) {
      issues.push({
        location: `${r852a.zoneNames[r852a.maxZoneIdx]} third — ${r852a.maxZoneCount} of ${r852a.count} climax-purposed scenes`,
        rule: 'BELIEF_CLIMAX_ZONE_CLUSTER',
        severity: 'minor',
        description: `${Math.round((r852a.maxZoneCount / r852a.count) * 100)}% of the scenes purposed as the climax cluster in the ${r852a.zoneNames[r852a.maxZoneIdx]} third. When every peak moment concentrates in one structural window, the belief-tracking layer builds toward its biggest test in only one part of the story instead of throughout its full length.`,
        suggestedFix: `Reconsider whether every climax-purposed scene belongs in the ${r852a.zoneNames[r852a.maxZoneIdx]} third so the belief-tracking layer builds toward its biggest test more evenly across the story.`,
      });
    }
  }

  // BELIEF_RESOLUTION_ZONE_CLUSTER — Distribution/timing × purpose === 'resolution' × structural
  // thirds. Built on checkZoneCluster from the shared checks library. n≥9, ≥3 resolution-purposed
  // scenes, fires when more than 75% of them fall in a single structural third. This purpose
  // value has never been referenced anywhere in this pass — a virgin field for all three
  // shared-library trio modes.
  {
    const r852b = checkZoneCluster({
      records, minRecords: 9, minCount: 3, ratioThreshold: 0.75,
      isPresent: r => r.purpose === 'resolution',
    });
    if (r852b.fires) {
      issues.push({
        location: `${r852b.zoneNames[r852b.maxZoneIdx]} third — ${r852b.maxZoneCount} of ${r852b.count} resolution-purposed scenes`,
        rule: 'BELIEF_RESOLUTION_ZONE_CLUSTER',
        severity: 'minor',
        description: `${Math.round((r852b.maxZoneCount / r852b.count) * 100)}% of the scenes purposed to resolve the story cluster in the ${r852b.zoneNames[r852b.maxZoneIdx]} third. When every act of resolution concentrates in one structural window, the belief-tracking layer settles its convictions in only one part of the story instead of throughout its full length.`,
        suggestedFix: `Reconsider whether every resolution-purposed scene belongs in the ${r852b.zoneNames[r852b.maxZoneIdx]} third so the belief-tracking layer settles its convictions more evenly across the story.`,
      });
    }
  }

  // BELIEF_COMPLICATE_ZONE_CLUSTER — Distribution/timing × purpose === 'complicate' × structural
  // thirds. Built on checkZoneCluster from the shared checks library. n≥9, ≥3 complicating
  // scenes, fires when more than 75% of them fall in a single structural third. This purpose
  // value has never been referenced anywhere in this pass — a virgin field for all three
  // shared-library trio modes.
  {
    const r852c = checkZoneCluster({
      records, minRecords: 9, minCount: 3, ratioThreshold: 0.75,
      isPresent: r => r.purpose === 'complicate',
    });
    if (r852c.fires) {
      issues.push({
        location: `${r852c.zoneNames[r852c.maxZoneIdx]} third — ${r852c.maxZoneCount} of ${r852c.count} complicating scenes`,
        rule: 'BELIEF_COMPLICATE_ZONE_CLUSTER',
        severity: 'minor',
        description: `${Math.round((r852c.maxZoneCount / r852c.count) * 100)}% of the scenes purposed to complicate the story cluster in the ${r852c.zoneNames[r852c.maxZoneIdx]} third. When every complication lands in the same structural window, the belief-tracking layer stops deepening the trouble anywhere else across the story.`,
        suggestedFix: `Purpose at least one scene outside the ${r852c.zoneNames[r852c.maxZoneIdx]} third to complicate the story so the belief-tracking layer keeps deepening the trouble more evenly across the story.`,
      });
    }
  }

  // ── Wave 866: BELIEF_ESTABLISH_WORLD_DROUGHT_RUN, BELIEF_CLIMAX_DROUGHT_RUN,
  //              BELIEF_RESOLUTION_DROUGHT_RUN ──────────────────────────────────────

  // BELIEF_ESTABLISH_WORLD_DROUGHT_RUN — Run-based × purpose === 'establish_world' absence.
  // Built on checkDroughtRun from the shared checks library. n≥10, ≥3 world-establishing
  // scenes overall, fires when the longest consecutive run of scenes with no world-establishing
  // purpose reaches 6. Completes 2 of 3 slots for this purpose value alongside the zone-cluster
  // mode added in Wave 838 (peak mode conventionally skipped for this categorical field).
  {
    const r866a = checkDroughtRun({
      records, minRecords: 10, minPresentCount: 3, runThreshold: 6,
      isPresent: r => r.purpose === 'establish_world',
    });
    if (r866a.fires) {
      issues.push({
        location: `longest stretch with no world-establishing scene: ${r866a.longestRun} consecutive scenes`,
        rule: 'BELIEF_ESTABLISH_WORLD_DROUGHT_RUN',
        severity: 'minor',
        description: `The story contains a run of ${r866a.longestRun} consecutive scenes with no scene purposed to establish the world, even though ${r866a.presentCount} scenes elsewhere are. A long unbroken stretch without new world-building leaves the belief-tracking layer with no fresh ground to plant convictions against for an extended run.`,
        suggestedFix: `Purpose a scene within the ${r866a.longestRun}-scene stretch to establish the world, so the belief-tracking layer has fresh ground to plant convictions against throughout the story rather than in one isolated pocket.`,
      });
    }
  }

  // BELIEF_CLIMAX_DROUGHT_RUN — Run-based × purpose === 'climax' absence. Built on
  // checkDroughtRun from the shared checks library. n≥10, ≥3 climax-purposed scenes overall,
  // fires when the longest consecutive run of scenes with no climax purpose reaches 6.
  // Completes 2 of 3 slots for this purpose value alongside the zone-cluster mode added in
  // Wave 852 (peak mode conventionally skipped for this categorical field).
  {
    const r866b = checkDroughtRun({
      records, minRecords: 10, minPresentCount: 3, runThreshold: 6,
      isPresent: r => r.purpose === 'climax',
    });
    if (r866b.fires) {
      issues.push({
        location: `longest stretch with no climax-purposed scene: ${r866b.longestRun} consecutive scenes`,
        rule: 'BELIEF_CLIMAX_DROUGHT_RUN',
        severity: 'minor',
        description: `The story contains a run of ${r866b.longestRun} consecutive scenes with no scene purposed as the climax, even though ${r866b.presentCount} scenes elsewhere are. A long unbroken stretch between peak moments leaves the belief-tracking layer without a structural high point to build its biggest test toward for an extended run.`,
        suggestedFix: `Purpose a scene within the ${r866b.longestRun}-scene stretch as the climax, or restructure so the belief-tracking layer's peak tests recur rather than clustering into a single distant point.`,
      });
    }
  }

  // BELIEF_RESOLUTION_DROUGHT_RUN — Run-based × purpose === 'resolution' absence. Built on
  // checkDroughtRun from the shared checks library. n≥10, ≥3 resolution-purposed scenes
  // overall, fires when the longest consecutive run of scenes with no resolution purpose
  // reaches 6. Completes 2 of 3 slots for this purpose value alongside the zone-cluster mode
  // added in Wave 852. Distinct from the pre-existing BELIEF_RESOLUTION_ABSENT, which audits
  // witnessed-revelation timing (whether any revelation lands in the final 20%) rather than
  // the scene's `purpose` field; peak mode conventionally skipped for this categorical field.
  {
    const r866c = checkDroughtRun({
      records, minRecords: 10, minPresentCount: 3, runThreshold: 6,
      isPresent: r => r.purpose === 'resolution',
    });
    if (r866c.fires) {
      issues.push({
        location: `longest stretch with no resolution-purposed scene: ${r866c.longestRun} consecutive scenes`,
        rule: 'BELIEF_RESOLUTION_DROUGHT_RUN',
        severity: 'minor',
        description: `The story contains a run of ${r866c.longestRun} consecutive scenes with no scene purposed to resolve the story, even though ${r866c.presentCount} scenes elsewhere are. A long unbroken stretch without any settling beat leaves the belief-tracking layer with no room to affirm convictions for an extended run.`,
        suggestedFix: `Purpose a scene within the ${r866c.longestRun}-scene stretch to resolve part of the story, so the belief-tracking layer keeps affirming convictions throughout the story rather than only at its very end.`,
      });
    }
  }

  // ── Wave 880: BELIEF_CLIMAX_ZONE_IMBALANCE, BELIEF_ESTABLISH_WORLD_ZONE_IMBALANCE,
  //              BELIEF_RESOLUTION_ZONE_IMBALANCE ──────────────────────────────────────

  // BELIEF_CLIMAX_ZONE_IMBALANCE — Underweight/bloat × purpose === 'climax' × four structural
  // zones. Built on checkZoneImbalance from the shared checks library. n≥10, ≥4 climax-purposed
  // scenes total, divided across four equal structural zones. Fires only when one zone has zero
  // such scenes while another holds ≥50% of the total. Distinct from the existing
  // BELIEF_CLIMAX_ZONE_CLUSTER (3-zone >75%-concentration test) and BELIEF_CLIMAX_DROUGHT_RUN
  // (run-based absence) — the first application of the 4-zone bloat+empty-zone mode to this
  // purpose value.
  {
    const r880a = checkZoneImbalance({
      records, minRecords: 10, minCount: 4, bloatRatio: 0.5,
      isPresent: r => r.purpose === 'climax',
    });
    if (r880a.fires) {
      const emptyNames880a = r880a.emptyZoneIdxs.map(i => FOUR_ZONE_NAMES[i]).join(', ');
      const bloatName880a = FOUR_ZONE_NAMES[r880a.bloatZoneIdx];
      issues.push({
        location: `${emptyNames880a} empty; ${bloatName880a} has ${r880a.counts[r880a.bloatZoneIdx]}/${r880a.totalCount} climax-purposed scenes`,
        rule: 'BELIEF_CLIMAX_ZONE_IMBALANCE',
        severity: 'minor',
        description: `The story's ${r880a.totalCount} climax-purposed scenes are unevenly distributed across its four structural zones: ${bloatName880a} contains ${r880a.counts[r880a.bloatZoneIdx]} of them (${Math.round((r880a.counts[r880a.bloatZoneIdx] / r880a.totalCount) * 100)}%) while ${emptyNames880a} contains none. Peak moments bloat in one structural quarter and vanish from another, giving the belief-tracking layer's biggest tests an uneven structural rhythm.`,
        suggestedFix: `Redistribute peak moments: move at least one climax-purposed scene into the empty zone(s) — ${emptyNames880a} — so every structural quarter carries some capacity for the belief-tracking layer's biggest test, not only the quarter currently carrying most of them.`,
      });
    }
  }

  // BELIEF_ESTABLISH_WORLD_ZONE_IMBALANCE — Underweight/bloat × purpose === 'establish_world' ×
  // four structural zones. Built on checkZoneImbalance from the shared checks library. n≥10, ≥4
  // world-establishing scenes total, divided across four equal structural zones. Fires only
  // when one zone has zero such scenes while another holds ≥50% of the total. Distinct from
  // the existing BELIEF_ESTABLISH_WORLD_ZONE_CLUSTER (3-zone >75%-concentration test) and
  // BELIEF_ESTABLISH_WORLD_DROUGHT_RUN (run-based absence) — the first application of the
  // 4-zone bloat+empty-zone mode to this purpose value.
  {
    const r880b = checkZoneImbalance({
      records, minRecords: 10, minCount: 4, bloatRatio: 0.5,
      isPresent: r => r.purpose === 'establish_world',
    });
    if (r880b.fires) {
      const emptyNames880b = r880b.emptyZoneIdxs.map(i => FOUR_ZONE_NAMES[i]).join(', ');
      const bloatName880b = FOUR_ZONE_NAMES[r880b.bloatZoneIdx];
      issues.push({
        location: `${emptyNames880b} empty; ${bloatName880b} has ${r880b.counts[r880b.bloatZoneIdx]}/${r880b.totalCount} world-establishing scenes`,
        rule: 'BELIEF_ESTABLISH_WORLD_ZONE_IMBALANCE',
        severity: 'minor',
        description: `The story's ${r880b.totalCount} world-establishing scenes are unevenly distributed across its four structural zones: ${bloatName880b} contains ${r880b.counts[r880b.bloatZoneIdx]} of them (${Math.round((r880b.counts[r880b.bloatZoneIdx] / r880b.totalCount) * 100)}%) while ${emptyNames880b} contains none. World-building bloats in one structural quarter and vanishes from another, giving the belief-tracking layer's grounding an uneven structural rhythm.`,
        suggestedFix: `Redistribute world-building beats: move at least one establish_world-purposed scene into the empty zone(s) — ${emptyNames880b} — so every structural quarter carries some fresh ground for the belief-tracking layer to build from, not only the quarter currently carrying most of them.`,
      });
    }
  }

  // BELIEF_RESOLUTION_ZONE_IMBALANCE — Underweight/bloat × purpose === 'resolution' × four
  // structural zones. Built on checkZoneImbalance from the shared checks library. n≥10, ≥4
  // resolution-purposed scenes total, divided across four equal structural zones. Fires only
  // when one zone has zero such scenes while another holds ≥50% of the total. Distinct from
  // the pre-existing BELIEF_RESOLUTION_ABSENT (which audits witnessed-revelation timing rather
  // than this purpose enum value) and from BELIEF_RESOLUTION_ZONE_CLUSTER/BELIEF_RESOLUTION_
  // DROUGHT_RUN (3-zone concentration and run-based absence respectively) — the first
  // application of the 4-zone bloat+empty-zone mode to this purpose value.
  {
    const r880c = checkZoneImbalance({
      records, minRecords: 10, minCount: 4, bloatRatio: 0.5,
      isPresent: r => r.purpose === 'resolution',
    });
    if (r880c.fires) {
      const emptyNames880c = r880c.emptyZoneIdxs.map(i => FOUR_ZONE_NAMES[i]).join(', ');
      const bloatName880c = FOUR_ZONE_NAMES[r880c.bloatZoneIdx];
      issues.push({
        location: `${emptyNames880c} empty; ${bloatName880c} has ${r880c.counts[r880c.bloatZoneIdx]}/${r880c.totalCount} resolution-purposed scenes`,
        rule: 'BELIEF_RESOLUTION_ZONE_IMBALANCE',
        severity: 'minor',
        description: `The story's ${r880c.totalCount} resolution-purposed scenes are unevenly distributed across its four structural zones: ${bloatName880c} contains ${r880c.counts[r880c.bloatZoneIdx]} of them (${Math.round((r880c.counts[r880c.bloatZoneIdx] / r880c.totalCount) * 100)}%) while ${emptyNames880c} contains none. Settling beats bloat in one structural quarter and vanish from another, giving the belief-tracking layer's closure an uneven structural rhythm.`,
        suggestedFix: `Redistribute settling beats: move at least one resolution-purposed scene into the empty zone(s) — ${emptyNames880c} — so every structural quarter carries some capacity to affirm convictions, not only the quarter currently carrying most of them.`,
      });
    }
  }

  // ── Wave 894: BELIEF_COMPLICATE_DROUGHT_RUN, BELIEF_TURNING_POINT_ZONE_IMBALANCE,
  //              BELIEF_INTRODUCE_CONFLICT_ZONE_IMBALANCE ──────────────────────────────────────

  // BELIEF_COMPLICATE_DROUGHT_RUN — Run-based × purpose === 'complicate' absence. Built on
  // checkDroughtRun from the shared checks library. n≥10, ≥3 complicating scenes overall, fires
  // when the longest consecutive run of scenes with no complicating purpose reaches 6.
  // Completes 2 of 3 slots for this purpose value alongside the zone-cluster mode added in
  // Wave 852 (peak mode conventionally skipped for this categorical field).
  {
    const r894a = checkDroughtRun({
      records, minRecords: 10, minPresentCount: 3, runThreshold: 6,
      isPresent: r => r.purpose === 'complicate',
    });
    if (r894a.fires) {
      issues.push({
        location: `longest stretch with no complication: ${r894a.longestRun} consecutive scenes`,
        rule: 'BELIEF_COMPLICATE_DROUGHT_RUN',
        severity: 'minor',
        description: `The story contains a run of ${r894a.longestRun} consecutive scenes with no complicating purpose at all, even though ${r894a.presentCount} scenes elsewhere deepen the trouble. A long unbroken stretch with nothing new complicating the situation leaves the belief-tracking layer without fresh trouble to test convictions against for an extended run.`,
        suggestedFix: `Purpose at least one scene within the ${r894a.longestRun}-scene stretch to complicate the story so the belief-tracking layer keeps facing fresh trouble to test convictions against throughout that stretch.`,
      });
    }
  }

  // BELIEF_TURNING_POINT_ZONE_IMBALANCE — Underweight/bloat × purpose === 'turning_point' ×
  // four structural zones. Built on checkZoneImbalance from the shared checks library. n≥10, ≥4
  // turning-point scenes total, divided across four equal structural zones. Fires only when one
  // zone has zero such scenes while another holds ≥50% of the total. Distinct from the existing
  // 3-zone BELIEF_TURNING_POINT_ZONE_CLUSTER and run-based BELIEF_TURNING_POINT_DROUGHT_RUN —
  // the first application of the 4-zone bloat+empty-zone mode to this purpose value.
  {
    const r894b = checkZoneImbalance({
      records, minRecords: 10, minCount: 4, bloatRatio: 0.5,
      isPresent: r => r.purpose === 'turning_point',
    });
    if (r894b.fires) {
      const emptyNames894b = r894b.emptyZoneIdxs.map(i => FOUR_ZONE_NAMES[i]).join(', ');
      const bloatName894b = FOUR_ZONE_NAMES[r894b.bloatZoneIdx];
      issues.push({
        location: `${emptyNames894b} empty; ${bloatName894b} has ${r894b.counts[r894b.bloatZoneIdx]}/${r894b.totalCount} turning-point scenes`,
        rule: 'BELIEF_TURNING_POINT_ZONE_IMBALANCE',
        severity: 'minor',
        description: `The story's ${r894b.totalCount} turning-point scenes are unevenly distributed across its four structural zones: ${bloatName894b} contains ${r894b.counts[r894b.bloatZoneIdx]} of them (${Math.round((r894b.counts[r894b.bloatZoneIdx] / r894b.totalCount) * 100)}%) while ${emptyNames894b} contains none. Turning points bloat in one structural quarter and vanish from another, giving the belief-tracking layer's pivots an uneven structural rhythm.`,
        suggestedFix: `Redistribute turning points: move at least one turning_point-purposed scene into the empty zone(s) — ${emptyNames894b} — so the belief-tracking layer's pivots land more evenly across every structural quarter, not only the quarter currently carrying most of them.`,
      });
    }
  }

  // BELIEF_INTRODUCE_CONFLICT_ZONE_IMBALANCE — Underweight/bloat × purpose ===
  // 'introduce_conflict' × four structural zones. Built on checkZoneImbalance from the shared
  // checks library. n≥10, ≥4 conflict-introducing scenes total, divided across four equal
  // structural zones. Fires only when one zone has zero such scenes while another holds ≥50% of
  // the total. Distinct from the existing 3-zone BELIEF_INTRODUCE_CONFLICT_ZONE_CLUSTER and
  // run-based BELIEF_INTRODUCE_CONFLICT_DROUGHT_RUN — the first application of the 4-zone
  // bloat+empty-zone mode to this purpose value.
  {
    const r894c = checkZoneImbalance({
      records, minRecords: 10, minCount: 4, bloatRatio: 0.5,
      isPresent: r => r.purpose === 'introduce_conflict',
    });
    if (r894c.fires) {
      const emptyNames894c = r894c.emptyZoneIdxs.map(i => FOUR_ZONE_NAMES[i]).join(', ');
      const bloatName894c = FOUR_ZONE_NAMES[r894c.bloatZoneIdx];
      issues.push({
        location: `${emptyNames894c} empty; ${bloatName894c} has ${r894c.counts[r894c.bloatZoneIdx]}/${r894c.totalCount} conflict-introducing scenes`,
        rule: 'BELIEF_INTRODUCE_CONFLICT_ZONE_IMBALANCE',
        severity: 'minor',
        description: `The story's ${r894c.totalCount} conflict-introducing scenes are unevenly distributed across its four structural zones: ${bloatName894c} contains ${r894c.counts[r894c.bloatZoneIdx]} of them (${Math.round((r894c.counts[r894c.bloatZoneIdx] / r894c.totalCount) * 100)}%) while ${emptyNames894c} contains none. New fronts of conflict bloat in one structural quarter and vanish from another, giving the belief-tracking layer's tests an uneven structural rhythm.`,
        suggestedFix: `Redistribute new conflicts: move at least one introduce_conflict-purposed scene into the empty zone(s) — ${emptyNames894c} — so the belief-tracking layer faces fresh friction more evenly across every structural quarter, not only the quarter currently carrying most of them.`,
      });
    }
  }

  // BELIEF_REVELATION_PURPOSE_ZONE_CLUSTER — Distribution/timing × purpose === 'revelation' ×
  // structural thirds. Built on checkZoneCluster from the shared checks library. n≥9, ≥3 scenes
  // purposed as a revelation, fires when more than 75% of them fall in a single structural third.
  // Named distinctly from BELIEF_REVELATION_PEAK_UNCAUSED, which audits the separate revelation-
  // as-magnitude field, not this purpose enum value — purpose === 'revelation' has never been
  // isolated as its own standalone signal in this pass; a virgin field.
  {
    const r908a = checkZoneCluster({
      records, minRecords: 9, minCount: 3, ratioThreshold: 0.75,
      isPresent: r => r.purpose === 'revelation',
    });
    if (r908a.fires) {
      issues.push({
        location: `${r908a.zoneNames[r908a.maxZoneIdx]} third — ${r908a.maxZoneCount} of ${r908a.count} revelation-purposed scenes`,
        rule: 'BELIEF_REVELATION_PURPOSE_ZONE_CLUSTER',
        severity: 'minor',
        description: `${Math.round((r908a.maxZoneCount / r908a.count) * 100)}% of the scenes purposed as a revelation cluster in the ${r908a.zoneNames[r908a.maxZoneIdx]} third. When every purpose-built disclosure lands in the same structural window, the belief-tracking layer gets no fresh information revising its beliefs anywhere else in the story.`,
        suggestedFix: `Purpose at least one scene outside the ${r908a.zoneNames[r908a.maxZoneIdx]} third as a revelation so the belief-tracking layer keeps revising its beliefs more evenly across the story.`,
      });
    }
  }

  // BELIEF_REVELATION_PURPOSE_DROUGHT_RUN — Run-based × purpose === 'revelation' absence. Built
  // on checkDroughtRun from the shared checks library. n≥10, ≥3 revelation-purposed scenes overall,
  // fires when the longest consecutive run of scenes purposed otherwise reaches 6. Completes 2 of
  // 3 slots for this purpose value alongside the zone-cluster mode added in this same wave (peak
  // mode conventionally skipped for this categorical field).
  {
    const r908b = checkDroughtRun({
      records, minRecords: 10, minPresentCount: 3, runThreshold: 6,
      isPresent: r => r.purpose === 'revelation',
    });
    if (r908b.fires) {
      issues.push({
        location: `longest stretch with no revelation-purposed scene: ${r908b.longestRun} consecutive scenes`,
        rule: 'BELIEF_REVELATION_PURPOSE_DROUGHT_RUN',
        severity: 'minor',
        description: `The story contains a run of ${r908b.longestRun} consecutive scenes with no scene purposed as a revelation, even though ${r908b.presentCount} scenes elsewhere disclose information by purpose. A long unbroken stretch with nothing new purpose-built to come to light leaves the belief-tracking layer with no fresh information revising its beliefs for an extended run.`,
        suggestedFix: `Purpose a scene within the ${r908b.longestRun}-scene stretch as a revelation so the belief-tracking layer keeps revising its beliefs throughout that stretch.`,
      });
    }
  }

  // BELIEF_COMPLICATE_ZONE_IMBALANCE — Underweight/bloat × purpose === 'complicate' × four
  // structural zones. Built on checkZoneImbalance from the shared checks library, continuing the
  // rollout begun in Wave 880. n≥10, ≥4 complicating scenes total, divided across four equal
  // structural zones. Fires only when one zone has zero such scenes while another holds ≥50% of
  // the total. Distinct from the existing 3-zone BELIEF_COMPLICATE_ZONE_CLUSTER and run-based
  // BELIEF_COMPLICATE_DROUGHT_RUN — the first application of the 4-zone bloat+empty-zone mode to
  // this purpose value.
  {
    const r908c = checkZoneImbalance({
      records, minRecords: 10, minCount: 4, bloatRatio: 0.5,
      isPresent: r => r.purpose === 'complicate',
    });
    if (r908c.fires) {
      const emptyNames908c = r908c.emptyZoneIdxs.map(i => FOUR_ZONE_NAMES[i]).join(', ');
      const bloatName908c = FOUR_ZONE_NAMES[r908c.bloatZoneIdx];
      issues.push({
        location: `${emptyNames908c} empty; ${bloatName908c} has ${r908c.counts[r908c.bloatZoneIdx]}/${r908c.totalCount} complicating scenes`,
        rule: 'BELIEF_COMPLICATE_ZONE_IMBALANCE',
        severity: 'minor',
        description: `The story's ${r908c.totalCount} complicating scenes are unevenly distributed across its four structural zones: ${bloatName908c} contains ${r908c.counts[r908c.bloatZoneIdx]} of them (${Math.round((r908c.counts[r908c.bloatZoneIdx] / r908c.totalCount) * 100)}%) while ${emptyNames908c} contains none. Complications bloat in one structural quarter and vanish from another, giving the belief-tracking layer's fresh pressure an uneven structural rhythm.`,
        suggestedFix: `Redistribute complications: move at least one complicate-purposed scene into the empty zone(s) — ${emptyNames908c} — so the belief-tracking layer meets fresh pressure more evenly across every structural quarter, not only the quarter currently carrying most of them.`,
      });
    }
  }

  // BELIEF_STAKES_ZONE_IMBALANCE — Underweight/bloat × purpose === 'raise_stakes' × four structural
  // zones. Built on checkZoneImbalance from the shared checks library, continuing the rollout begun
  // in Wave 880. n≥10, ≥4 stakes-raising scenes total, divided across four equal structural zones.
  // Fires only when one zone has zero such scenes while another holds ≥50% of the total. Distinct
  // from the existing 3-zone BELIEF_STAKES_ZONE_CLUSTER and run-based BELIEF_STAKES_DROUGHT_RUN —
  // the first application of the 4-zone bloat+empty-zone mode to this purpose value.
  {
    const r922a = checkZoneImbalance({
      records, minRecords: 10, minCount: 4, bloatRatio: 0.5,
      isPresent: r => r.purpose === 'raise_stakes',
    });
    if (r922a.fires) {
      const emptyNames922a = r922a.emptyZoneIdxs.map(i => FOUR_ZONE_NAMES[i]).join(', ');
      const bloatName922a = FOUR_ZONE_NAMES[r922a.bloatZoneIdx];
      issues.push({
        location: `${emptyNames922a} empty; ${bloatName922a} has ${r922a.counts[r922a.bloatZoneIdx]}/${r922a.totalCount} stakes-raising scenes`,
        rule: 'BELIEF_STAKES_ZONE_IMBALANCE',
        severity: 'minor',
        description: `The story's ${r922a.totalCount} stakes-raising scenes are unevenly distributed across its four structural zones: ${bloatName922a} contains ${r922a.counts[r922a.bloatZoneIdx]} of them (${Math.round((r922a.counts[r922a.bloatZoneIdx] / r922a.totalCount) * 100)}%) while ${emptyNames922a} contains none. Stakes bloat upward in one structural quarter and never rise at all in another, giving the belief-tracking layer's tests of conviction an uneven structural rhythm.`,
        suggestedFix: `Redistribute stakes-raising beats: move at least one raise_stakes-purposed scene into the empty zone(s) — ${emptyNames922a} — so the belief-tracking layer tests conviction more evenly across every structural quarter, not only the quarter currently carrying most of them.`,
      });
    }
  }

  // BELIEF_REVELATION_PURPOSE_ZONE_IMBALANCE — Underweight/bloat × purpose === 'revelation' × four
  // structural zones. Built on checkZoneImbalance from the shared checks library, closing the
  // 4-zone gap for this purpose value (its 3-zone/run trio was completed in Wave 908). n≥10, ≥4
  // revelation-purposed scenes total, divided across four equal structural zones. Fires only when
  // one zone has zero such scenes while another holds ≥50% of the total. Distinct from BELIEF_
  // REVELATION_PURPOSE_ZONE_CLUSTER/DROUGHT_RUN (Wave 908) and from the revelation-string-field
  // rules — the first application of the 4-zone bloat+empty-zone mode to this purpose value.
  {
    const r922b = checkZoneImbalance({
      records, minRecords: 10, minCount: 4, bloatRatio: 0.5,
      isPresent: r => r.purpose === 'revelation',
    });
    if (r922b.fires) {
      const emptyNames922b = r922b.emptyZoneIdxs.map(i => FOUR_ZONE_NAMES[i]).join(', ');
      const bloatName922b = FOUR_ZONE_NAMES[r922b.bloatZoneIdx];
      issues.push({
        location: `${emptyNames922b} empty; ${bloatName922b} has ${r922b.counts[r922b.bloatZoneIdx]}/${r922b.totalCount} revelation-purposed scenes`,
        rule: 'BELIEF_REVELATION_PURPOSE_ZONE_IMBALANCE',
        severity: 'minor',
        description: `The story's ${r922b.totalCount} revelation-purposed scenes are unevenly distributed across its four structural zones: ${bloatName922b} contains ${r922b.counts[r922b.bloatZoneIdx]} of them (${Math.round((r922b.counts[r922b.bloatZoneIdx] / r922b.totalCount) * 100)}%) while ${emptyNames922b} contains none. Purpose-built disclosures bloat in one structural quarter and vanish from another, so the belief-tracking layer revises its beliefs in only part of the story.`,
        suggestedFix: `Redistribute disclosures: move at least one revelation-purposed scene into the empty zone(s) — ${emptyNames922b} — so the belief-tracking layer keeps revising its beliefs across every structural quarter, not only the quarter currently carrying most of them.`,
      });
    }
  }

  // BELIEF_NEGATIVE_EMOTION_ZONE_IMBALANCE — Underweight/bloat × emotionalShift === 'negative' ×
  // four structural zones. Built on checkZoneImbalance from the shared checks library, extending
  // the 4-zone mode to the emotionalShift valence signal. n≥10, ≥4 negative-shift scenes total,
  // divided across four equal structural zones. Fires only when one zone has zero such scenes while
  // another holds ≥50% of the total. Distinct from the existing 3-zone BELIEF_NEGATIVE_EMOTION_
  // ZONE_CLUSTER and run-based BELIEF_NEGATIVE_EMOTION_DROUGHT_RUN — the first application of the
  // 4-zone bloat+empty-zone mode to this valence signal.
  {
    const r922c = checkZoneImbalance({
      records, minRecords: 10, minCount: 4, bloatRatio: 0.5,
      isPresent: r => r.emotionalShift === 'negative',
    });
    if (r922c.fires) {
      const emptyNames922c = r922c.emptyZoneIdxs.map(i => FOUR_ZONE_NAMES[i]).join(', ');
      const bloatName922c = FOUR_ZONE_NAMES[r922c.bloatZoneIdx];
      issues.push({
        location: `${emptyNames922c} empty; ${bloatName922c} has ${r922c.counts[r922c.bloatZoneIdx]}/${r922c.totalCount} negative-shift scenes`,
        rule: 'BELIEF_NEGATIVE_EMOTION_ZONE_IMBALANCE',
        severity: 'minor',
        description: `The story's ${r922c.totalCount} scenes with a negative emotional shift are unevenly distributed across its four structural zones: ${bloatName922c} contains ${r922c.counts[r922c.bloatZoneIdx]} of them (${Math.round((r922c.counts[r922c.bloatZoneIdx] / r922c.totalCount) * 100)}%) while ${emptyNames922c} contains none. Downturns bloat in one structural quarter and vanish from another, so the belief-tracking layer's shaken convictions cluster in only part of the story.`,
        suggestedFix: `Redistribute downturns: place a negative emotional beat in at least one scene inside the empty zone(s) — ${emptyNames922c} — so the belief-tracking layer's convictions are tested across every structural quarter, not only the quarter currently carrying most of them.`,
      });
    }
  }

  // BELIEF_POSITIVE_EMOTION_ZONE_IMBALANCE — Underweight/bloat × emotionalShift === 'positive' ×
  // four structural zones. Built on checkZoneImbalance from the shared checks library, extending
  // the 4-zone mode to the emotionalShift valence signal. n≥10, ≥4 positive-shift scenes total,
  // divided across four equal structural zones. Fires only when one zone has zero such scenes while
  // another holds ≥50% of the total. Distinct from the existing 3-zone BELIEF_POSITIVE_EMOTION_
  // ZONE_CLUSTER and run-based BELIEF_POSITIVE_EMOTION_DROUGHT_RUN — the first application of the
  // 4-zone bloat+empty-zone mode to this valence signal.
  {
    const r936a = checkZoneImbalance({
      records, minRecords: 10, minCount: 4, bloatRatio: 0.5,
      isPresent: r => r.emotionalShift === 'positive',
    });
    if (r936a.fires) {
      const emptyNames936a = r936a.emptyZoneIdxs.map(i => FOUR_ZONE_NAMES[i]).join(', ');
      const bloatName936a = FOUR_ZONE_NAMES[r936a.bloatZoneIdx];
      issues.push({
        location: `${emptyNames936a} empty; ${bloatName936a} has ${r936a.counts[r936a.bloatZoneIdx]}/${r936a.totalCount} positive-shift scenes`,
        rule: 'BELIEF_POSITIVE_EMOTION_ZONE_IMBALANCE',
        severity: 'minor',
        description: `The story's ${r936a.totalCount} scenes with a positive emotional shift are unevenly distributed across its four structural zones: ${bloatName936a} contains ${r936a.counts[r936a.bloatZoneIdx]} of them (${Math.round((r936a.counts[r936a.bloatZoneIdx] / r936a.totalCount) * 100)}%) while ${emptyNames936a} contains none. Upswings bloat in one structural quarter and vanish from another, so the belief-tracking layer's affirmed convictions cluster in only part of the story.`,
        suggestedFix: `Redistribute upswings: place a positive emotional beat in at least one scene inside the empty zone(s) — ${emptyNames936a} — so the belief-tracking layer's convictions are affirmed across every structural quarter, not only the quarter currently carrying most of them.`,
      });
    }
  }

  // BELIEF_SUSPENSE_ZONE_IMBALANCE — Underweight/bloat × suspenseDelta > 0 × four structural zones.
  // Built on checkZoneImbalance from the shared checks library, extending the 4-zone mode to the
  // suspenseDelta magnitude signal. n≥10, ≥4 suspense-raising scenes total, divided across four
  // equal structural zones. Fires only when one zone has zero such scenes while another holds ≥50%
  // of the total. Distinct from the existing 3-zone BELIEF_SUSPENSE_ZONE_CLUSTER and run-based
  // BELIEF_SUSPENSE_DROUGHT_RUN — the first application of the 4-zone bloat+empty-zone mode to this
  // signal.
  {
    const r936b = checkZoneImbalance({
      records, minRecords: 10, minCount: 4, bloatRatio: 0.5,
      isPresent: r => (r.suspenseDelta ?? 0) > 0,
    });
    if (r936b.fires) {
      const emptyNames936b = r936b.emptyZoneIdxs.map(i => FOUR_ZONE_NAMES[i]).join(', ');
      const bloatName936b = FOUR_ZONE_NAMES[r936b.bloatZoneIdx];
      issues.push({
        location: `${emptyNames936b} empty; ${bloatName936b} has ${r936b.counts[r936b.bloatZoneIdx]}/${r936b.totalCount} suspense-raising scenes`,
        rule: 'BELIEF_SUSPENSE_ZONE_IMBALANCE',
        severity: 'minor',
        description: `The story's ${r936b.totalCount} suspense-raising scenes are unevenly distributed across its four structural zones: ${bloatName936b} contains ${r936b.counts[r936b.bloatZoneIdx]} of them (${Math.round((r936b.counts[r936b.bloatZoneIdx] / r936b.totalCount) * 100)}%) while ${emptyNames936b} contains none. Tension spikes bloat in one structural quarter and vanish from another, so the belief-tracking layer's doubts are stirred in only part of the story.`,
        suggestedFix: `Redistribute suspense beats: raise tension in at least one scene inside the empty zone(s) — ${emptyNames936b} — so the belief-tracking layer's doubts are stirred across every structural quarter, not only the quarter currently carrying most of them.`,
      });
    }
  }

  // BELIEF_CURIOSITY_ZONE_IMBALANCE — Underweight/bloat × curiosityDelta > 0 × four structural
  // zones. Built on checkZoneImbalance from the shared checks library, extending the 4-zone mode to
  // the curiosityDelta magnitude signal. n≥10, ≥4 curiosity-raising scenes total, divided across
  // four equal structural zones. Fires only when one zone has zero such scenes while another holds
  // ≥50% of the total. Distinct from the existing 3-zone BELIEF_CURIOSITY_ZONE_CLUSTER and run-based
  // BELIEF_CURIOSITY_DROUGHT_RUN — the first application of the 4-zone bloat+empty-zone mode to this
  // signal.
  {
    const r936c = checkZoneImbalance({
      records, minRecords: 10, minCount: 4, bloatRatio: 0.5,
      isPresent: r => (r.curiosityDelta ?? 0) > 0,
    });
    if (r936c.fires) {
      const emptyNames936c = r936c.emptyZoneIdxs.map(i => FOUR_ZONE_NAMES[i]).join(', ');
      const bloatName936c = FOUR_ZONE_NAMES[r936c.bloatZoneIdx];
      issues.push({
        location: `${emptyNames936c} empty; ${bloatName936c} has ${r936c.counts[r936c.bloatZoneIdx]}/${r936c.totalCount} curiosity-raising scenes`,
        rule: 'BELIEF_CURIOSITY_ZONE_IMBALANCE',
        severity: 'minor',
        description: `The story's ${r936c.totalCount} curiosity-raising scenes are unevenly distributed across its four structural zones: ${bloatName936c} contains ${r936c.counts[r936c.bloatZoneIdx]} of them (${Math.round((r936c.counts[r936c.bloatZoneIdx] / r936c.totalCount) * 100)}%) while ${emptyNames936c} contains none. New questions bloat in one structural quarter and vanish from another, so the belief-tracking layer's open questions cluster in only part of the story.`,
        suggestedFix: `Redistribute curiosity beats: raise a fresh question in at least one scene inside the empty zone(s) — ${emptyNames936c} — so the belief-tracking layer's open questions span every structural quarter, not only the quarter currently carrying most of them.`,
      });
    }
  }

  // BELIEF_PAYOFF_ZONE_IMBALANCE — Underweight/bloat × (payoffSetupIds.length > 0) × four structural
  // zones. Built on checkZoneImbalance from the shared checks library. n≥10, ≥4 payoff scenes total,
  // divided across four equal structural zones. Fires only when one zone has zero such scenes while
  // another holds ≥50% of the total. Distinct from the existing 3-zone BELIEF_PAYOFF_ZONE_CLUSTER
  // and run-based BELIEF_PAYOFF_DROUGHT_RUN — the first application of the 4-zone bloat+empty-zone
  // mode to the payoffSetupIds array field, and distinct from the already-audited BELIEF_STAGING_
  // ZONE_IMBALANCE (visualBeats), keying on a genuinely different array.
  {
    const r950a = checkZoneImbalance({
      records, minRecords: 10, minCount: 4, bloatRatio: 0.5,
      isPresent: r => (r.payoffSetupIds ?? []).length > 0,
    });
    if (r950a.fires) {
      const emptyNames950a = r950a.emptyZoneIdxs.map(i => FOUR_ZONE_NAMES[i]).join(', ');
      const bloatName950a = FOUR_ZONE_NAMES[r950a.bloatZoneIdx];
      issues.push({
        location: `${emptyNames950a} empty; ${bloatName950a} has ${r950a.counts[r950a.bloatZoneIdx]}/${r950a.totalCount} payoff scenes`,
        rule: 'BELIEF_PAYOFF_ZONE_IMBALANCE',
        severity: 'minor',
        description: `The story's ${r950a.totalCount} payoff scenes are unevenly distributed across its four structural zones: ${bloatName950a} contains ${r950a.counts[r950a.bloatZoneIdx]} of them (${Math.round((r950a.counts[r950a.bloatZoneIdx] / r950a.totalCount) * 100)}%) while ${emptyNames950a} contains none. Payoffs bloat in one structural quarter and never occur in another, so the belief-tracking layer's confirmed expectations resolve in only part of the story.`,
        suggestedFix: `Redistribute payoffs: pay off an earlier setup (non-empty payoffSetupIds) in at least one scene inside the empty zone(s) — ${emptyNames950a} — so the belief-tracking layer confirms expectations across every structural quarter, not only the quarter currently carrying most of them.`,
      });
    }
  }

  // BELIEF_OPEN_THREAD_ZONE_IMBALANCE — Underweight/bloat × (unresolvedClues.length > 0) × four
  // structural zones. Built on checkZoneImbalance from the shared checks library. n≥10, ≥4 scenes
  // leaving an open thread total, divided across four equal structural zones. Fires only when one
  // zone has zero such scenes while another holds ≥50% of the total. Distinct from the existing
  // 3-zone BELIEF_OPEN_THREAD_ZONE_CLUSTER and run-based BELIEF_OPEN_THREAD_DROUGHT_RUN — the first
  // application of the 4-zone bloat+empty-zone mode to the unresolvedClues array field, keying on
  // unresolved-expectation density rather than the payoffSetupIds field audited just above.
  {
    const r950b = checkZoneImbalance({
      records, minRecords: 10, minCount: 4, bloatRatio: 0.5,
      isPresent: r => (r.unresolvedClues ?? []).length > 0,
    });
    if (r950b.fires) {
      const emptyNames950b = r950b.emptyZoneIdxs.map(i => FOUR_ZONE_NAMES[i]).join(', ');
      const bloatName950b = FOUR_ZONE_NAMES[r950b.bloatZoneIdx];
      issues.push({
        location: `${emptyNames950b} empty; ${bloatName950b} has ${r950b.counts[r950b.bloatZoneIdx]}/${r950b.totalCount} open-thread scenes`,
        rule: 'BELIEF_OPEN_THREAD_ZONE_IMBALANCE',
        severity: 'minor',
        description: `The story's ${r950b.totalCount} scenes leaving an open thread are unevenly distributed across its four structural zones: ${bloatName950b} contains ${r950b.counts[r950b.bloatZoneIdx]} of them (${Math.round((r950b.counts[r950b.bloatZoneIdx] / r950b.totalCount) * 100)}%) while ${emptyNames950b} contains none. Unresolved threads bloat in one structural quarter and never open in another, so the belief-tracking layer's open expectations accumulate in only part of the story.`,
        suggestedFix: `Redistribute open threads: leave an unresolved question (non-empty unresolvedClues) in at least one scene inside the empty zone(s) — ${emptyNames950b} — so the belief-tracking layer keeps expectations alive across every structural quarter, not only the quarter currently carrying most of them.`,
      });
    }
  }

  // BELIEF_SEED_ZONE_IMBALANCE — Underweight/bloat × (seededClueIds.length > 0) × four structural
  // zones. Built on checkZoneImbalance from the shared checks library. n≥10, ≥4 seeding scenes
  // total, divided across four equal structural zones. Fires only when one zone has zero such scenes
  // while another holds ≥50% of the total. Distinct from the existing 3-zone BELIEF_SEED_ZONE_
  // CLUSTER and run-based BELIEF_SEED_DROUGHT_RUN — the first application of the 4-zone bloat+empty-
  // zone mode to the seededClueIds array field, keying on belief-forming plants, distinct from both
  // the payoffSetupIds and unresolvedClues array fields audited just above.
  {
    const r950c = checkZoneImbalance({
      records, minRecords: 10, minCount: 4, bloatRatio: 0.5,
      isPresent: r => (r.seededClueIds ?? []).length > 0,
    });
    if (r950c.fires) {
      const emptyNames950c = r950c.emptyZoneIdxs.map(i => FOUR_ZONE_NAMES[i]).join(', ');
      const bloatName950c = FOUR_ZONE_NAMES[r950c.bloatZoneIdx];
      issues.push({
        location: `${emptyNames950c} empty; ${bloatName950c} has ${r950c.counts[r950c.bloatZoneIdx]}/${r950c.totalCount} seeding scenes`,
        rule: 'BELIEF_SEED_ZONE_IMBALANCE',
        severity: 'minor',
        description: `The story's ${r950c.totalCount} clue-seeding scenes are unevenly distributed across its four structural zones: ${bloatName950c} contains ${r950c.counts[r950c.bloatZoneIdx]} of them (${Math.round((r950c.counts[r950c.bloatZoneIdx] / r950c.totalCount) * 100)}%) while ${emptyNames950c} contains none. Seeds bloat in one structural quarter and never get planted in another, so the beliefs the audience is invited to form are seeded in only part of the story.`,
        suggestedFix: `Redistribute seeds: plant a clue (non-empty seededClueIds) in at least one scene inside the empty zone(s) — ${emptyNames950c} — so the belief-tracking layer keeps forming new expectations across every structural quarter, not only the quarter currently carrying most of them.`,
      });
    }
  }

  // BELIEF_HIGHLIGHT_ZONE_IMBALANCE — Underweight/bloat × (dialogueHighlights.length > 0) × four
  // structural zones. Built on checkZoneImbalance from the shared checks library. n≥10, ≥4 scenes
  // with a dialogue highlight total, divided across four equal structural zones. Fires only when one
  // zone has zero such scenes while another holds ≥50% of the total. Distinct from the existing
  // 3-zone BELIEF_HIGHLIGHT_ZONE_CLUSTER and run-based BELIEF_HIGHLIGHT_DROUGHT_RUN — the first
  // application of the 4-zone bloat+empty-zone mode to the dialogueHighlights array field, distinct
  // from the already-audited visualBeats/payoff/open-thread/seed array imbalances.
  {
    const r964a = checkZoneImbalance({
      records, minRecords: 10, minCount: 4, bloatRatio: 0.5,
      isPresent: r => (r.dialogueHighlights ?? []).length > 0,
    });
    if (r964a.fires) {
      const emptyNames964a = r964a.emptyZoneIdxs.map(i => FOUR_ZONE_NAMES[i]).join(', ');
      const bloatName964a = FOUR_ZONE_NAMES[r964a.bloatZoneIdx];
      issues.push({
        location: `${emptyNames964a} empty; ${bloatName964a} has ${r964a.counts[r964a.bloatZoneIdx]}/${r964a.totalCount} dialogue-highlight scenes`,
        rule: 'BELIEF_HIGHLIGHT_ZONE_IMBALANCE',
        severity: 'minor',
        description: `The story's ${r964a.totalCount} scenes with a dialogue highlight are unevenly distributed across its four structural zones: ${bloatName964a} contains ${r964a.counts[r964a.bloatZoneIdx]} of them (${Math.round((r964a.counts[r964a.bloatZoneIdx] / r964a.totalCount) * 100)}%) while ${emptyNames964a} contains none. Memorable lines bloat in one structural quarter and never land in another, so the belief-tracking layer's most quotable turns cluster in only part of the story.`,
        suggestedFix: `Redistribute highlights: give at least one scene inside the empty zone(s) — ${emptyNames964a} — a dialogue highlight so the belief-tracking layer's standout lines land across every structural quarter, not only the quarter currently carrying most of them.`,
      });
    }
  }

  // BELIEF_RELATIONSHIP_ZONE_IMBALANCE — Underweight/bloat × (relationshipShifts.length > 0) × four
  // structural zones. Built on checkZoneImbalance from the shared checks library. n≥10, ≥4 scenes
  // with a relationship shift total, divided across four equal structural zones. Fires only when one
  // zone has zero such scenes while another holds ≥50% of the total. Distinct from the existing
  // 3-zone BELIEF_RELATIONSHIP_ZONE_CLUSTER and run-based BELIEF_RELATIONSHIP_DROUGHT_RUN — the first
  // application of the 4-zone bloat+empty-zone mode to the relationshipShifts array field, distinct
  // from the dialogueHighlights field audited just above and the other audited arrays.
  {
    const r964b = checkZoneImbalance({
      records, minRecords: 10, minCount: 4, bloatRatio: 0.5,
      isPresent: r => (r.relationshipShifts ?? []).length > 0,
    });
    if (r964b.fires) {
      const emptyNames964b = r964b.emptyZoneIdxs.map(i => FOUR_ZONE_NAMES[i]).join(', ');
      const bloatName964b = FOUR_ZONE_NAMES[r964b.bloatZoneIdx];
      issues.push({
        location: `${emptyNames964b} empty; ${bloatName964b} has ${r964b.counts[r964b.bloatZoneIdx]}/${r964b.totalCount} relationship-shift scenes`,
        rule: 'BELIEF_RELATIONSHIP_ZONE_IMBALANCE',
        severity: 'minor',
        description: `The story's ${r964b.totalCount} scenes with a relationship shift are unevenly distributed across its four structural zones: ${bloatName964b} contains ${r964b.counts[r964b.bloatZoneIdx]} of them (${Math.round((r964b.counts[r964b.bloatZoneIdx] / r964b.totalCount) * 100)}%) while ${emptyNames964b} contains none. Bonds change in a bloated cluster in one structural quarter and stay static in another, so the belief-tracking layer's revisions of who-trusts-whom concentrate in only part of the story.`,
        suggestedFix: `Redistribute relational change: give at least one scene inside the empty zone(s) — ${emptyNames964b} — a relationship shift so the belief-tracking layer keeps revising its relational expectations across every structural quarter, not only the quarter currently carrying most of them.`,
      });
    }
  }

  // BELIEF_TURN_ZONE_IMBALANCE — Underweight/bloat × (dramaticTurn !== 'nothing') × four structural
  // zones. Built on checkZoneImbalance from the shared checks library. n≥10, ≥4 scenes with a
  // dramatic turn total, divided across four equal structural zones. Fires only when one zone has
  // zero such scenes while another holds ≥50% of the total. Uses the same dramaticTurn !== 'nothing'
  // predicate as the existing 3-zone BELIEF_TURN_ZONE_CLUSTER and run-based BELIEF_TURN_DROUGHT_RUN —
  // the first application of the 4-zone bloat+empty-zone mode to the dramatic-turn categorical signal.
  {
    const r964c = checkZoneImbalance({
      records, minRecords: 10, minCount: 4, bloatRatio: 0.5,
      isPresent: r => (r.dramaticTurn ?? 'nothing') !== 'nothing',
    });
    if (r964c.fires) {
      const emptyNames964c = r964c.emptyZoneIdxs.map(i => FOUR_ZONE_NAMES[i]).join(', ');
      const bloatName964c = FOUR_ZONE_NAMES[r964c.bloatZoneIdx];
      issues.push({
        location: `${emptyNames964c} empty; ${bloatName964c} has ${r964c.counts[r964c.bloatZoneIdx]}/${r964c.totalCount} dramatic-turn scenes`,
        rule: 'BELIEF_TURN_ZONE_IMBALANCE',
        severity: 'minor',
        description: `The story's ${r964c.totalCount} scenes with a dramatic turn are unevenly distributed across its four structural zones: ${bloatName964c} contains ${r964c.counts[r964c.bloatZoneIdx]} of them (${Math.round((r964c.counts[r964c.bloatZoneIdx] / r964c.totalCount) * 100)}%) while ${emptyNames964c} contains none. Turns bloat in one structural quarter and never fire in another, so the beats that overturn the audience's expectations concentrate in only part of the story.`,
        suggestedFix: `Redistribute turns: give at least one scene inside the empty zone(s) — ${emptyNames964c} — a dramatic turn so the belief-tracking layer keeps overturning expectations across every structural quarter, not only the quarter currently carrying most of them.`,
      });
    }
  }

  // ── Wave 978: with the underweight/bloat (zone-imbalance) mode now exhausted for this pass, this
  // wave pivots to the sequence/aftermath mode via the shared checkAftermathVoid helper, adding three
  // trigger→aftermath pairings using trigger signals (raise_stakes purpose, payoffSetupIds, and
  // seededClueIds) that this pass's ~14 existing aftermath-void rules — built around assertion/
  // revelation/turn/clue-debt triggers — have never used as a TRIGGER. Each fires only when the
  // trigger genuinely occurs (≥2, full 2-scene lookahead) AND the aftermath signal genuinely occurs
  // somewhere (≥2), but NO trigger's window contains it — proving decoupling, not mere absence. ────

  // BELIEF_STAKES_RELATIONSHIP_AFTERMATH_VOID — raise-stakes trigger × relational aftermath. Every
  // stakes-raising scene is followed by two scenes with no relationship shift, even though bonds do
  // move elsewhere. Escalating danger usually strains or realigns who stands with whom; when every
  // stakes-raise's aftermath leaves all bonds untouched, the belief-tracking layer's escalations are
  // impersonal — they raise the danger but never test who the protagonist can trust. Distinct from
  // every existing assertion/revelation/turn-triggered aftermath rule in this pass — this is the
  // first use of raise_stakes as an aftermath-void TRIGGER.
  {
    const r978a = checkAftermathVoid({
      records, minRecords: 8, minTriggerCount: 2, minAftermathCount: 2, window: 2,
      isTrigger: r => r.purpose === 'raise_stakes',
      isAftermath: r => (r.relationshipShifts ?? []).length > 0,
    });
    if (r978a.fires) {
      issues.push({
        location: `${r978a.triggerCount} stakes-raise aftermath(s) — no relationship shift within 2 scenes`,
        rule: 'BELIEF_STAKES_RELATIONSHIP_AFTERMATH_VOID',
        severity: 'minor',
        description: `Every stakes-raising scene (${r978a.triggerCount} escalations) is followed by two scenes in which no relationship shifts, even though ${r978a.aftermathCount} scenes elsewhere do move a bond. Raising the stakes usually reshapes who stands with whom — new danger tests alliances, forces choices, exposes loyalties. When every escalation's aftermath leaves all bonds untouched, the belief-tracking layer's rising danger is impersonal: it threatens the plot but never who the protagonist can trust.`,
        suggestedFix: `Let at least one stakes-raise move a bond in its aftermath: in the scene or two after the danger sharpens, have the pressure realign a relationship — an ally who wavers, an enemy who becomes necessary, trust that fractures under the new weight.`,
      });
    }
  }

  // BELIEF_PAYOFF_CURIOSITY_AFTERMATH_VOID — payoff trigger × curiosity aftermath. Every payoff
  // scene is followed by two scenes that raise no new curiosity, even though fresh questions do
  // open elsewhere. Cashing in one setup should usually seed the next question the belief-tracking
  // layer will chase; when every payoff's aftermath opens no curiosity, the story's threads close
  // without opening new ones — the belief-tracking layer runs dry right after paying off. Distinct
  // from every existing seed/revelation-triggered curiosity rule in this pass — this is the first
  // use of payoffSetupIds as an aftermath-void TRIGGER.
  {
    const r978b = checkAftermathVoid({
      records, minRecords: 8, minTriggerCount: 2, minAftermathCount: 2, window: 2,
      isTrigger: r => (r.payoffSetupIds ?? []).length > 0,
      isAftermath: r => (r.curiosityDelta ?? 0) > 0,
    });
    if (r978b.fires) {
      issues.push({
        location: `${r978b.triggerCount} payoff aftermath(s) — no curiosity raised within 2 scenes`,
        rule: 'BELIEF_PAYOFF_CURIOSITY_AFTERMATH_VOID',
        severity: 'minor',
        description: `Every payoff scene (${r978b.triggerCount} cashed-in setups) is followed by two scenes that raise no new curiosity, even though ${r978b.aftermathCount} scenes elsewhere do open fresh questions. A payoff usually clears the way for the next question the belief-tracking layer will chase; when every payoff's aftermath opens nothing new, threads close without replacing themselves — the story's engine of anticipation stalls right after delivering.`,
        suggestedFix: `Let at least one payoff open a new question in its aftermath: in the scene or two after a setup pays off, plant a fresh uncertainty — an unintended consequence, a question the resolution itself raises. A payoff that reseeds curiosity keeps the belief-tracking layer moving forward instead of settling.`,
      });
    }
  }

  // BELIEF_SEED_EMOTIONAL_AFTERMATH_VOID — seed trigger × emotional aftermath. Every clue-seeding
  // scene is followed by two scenes with no emotional shift, even though feeling registers
  // elsewhere. Planting a clue usually carries some charge — unease, curiosity's cousin dread,
  // quiet hope; when every seed's aftermath is emotionally flat, the belief-tracking layer's
  // groundwork lands as pure information with no felt weight. Distinct from every existing seed-
  // paired rule in this pass (which pair seed with clock or use seed as an AFTERMATH, not a
  // trigger) — this is the first use of seededClueIds as an aftermath-void TRIGGER.
  {
    const r978c = checkAftermathVoid({
      records, minRecords: 8, minTriggerCount: 2, minAftermathCount: 2, window: 2,
      isTrigger: r => (r.seededClueIds ?? []).length > 0,
      isAftermath: r => (r.emotionalShift ?? 'neutral') !== 'neutral',
    });
    if (r978c.fires) {
      issues.push({
        location: `${r978c.triggerCount} seed aftermath(s) — no emotional shift within 2 scenes`,
        rule: 'BELIEF_SEED_EMOTIONAL_AFTERMATH_VOID',
        severity: 'minor',
        description: `Every clue-seeding scene (${r978c.triggerCount} plants) is followed by two emotionally neutral scenes, even though ${r978c.aftermathCount} emotionally-charged scenes exist elsewhere. Planting a clue usually carries some charge for whoever notices it — unease at what it implies, a flicker of hope, quiet dread. When every seed's aftermath is affectively flat, the belief-tracking layer's groundwork registers as pure information with no felt weight.`,
        suggestedFix: `Let at least one seed carry feeling in its aftermath: in the scene or two after a clue is planted, show someone reacting to it — a beat of unease, a private hope, a flicker of dread. A seed whose aftermath is felt lands as more than plot mechanics.`,
      });
    }
  }

  // BELIEF_STAKES_SUSPENSE_AFTERMATH_VOID — raise-stakes trigger × suspenseDelta aftermath. Every
  // stakes-raising scene is followed by two scenes with no rise in tension, even though tension
  // does rise elsewhere. Escalating danger should usually tighten the belief-tracking layer's
  // sense of jeopardy; when every stakes-raise's aftermath registers no suspense, the escalation
  // reads as a plot note rather than a felt threat. Distinct from BELIEF_STAKES_RELATIONSHIP_
  // AFTERMATH_VOID (Wave 978, same trigger paired with relationshipShifts) — this is the first use
  // of suspenseDelta as a checkAftermathVoid aftermath channel in this pass.
  {
    const r992a = checkAftermathVoid({
      records, minRecords: 8, minTriggerCount: 2, minAftermathCount: 2, window: 2,
      isTrigger: r => r.purpose === 'raise_stakes',
      isAftermath: r => (r.suspenseDelta ?? 0) > 0,
    });
    if (r992a.fires) {
      issues.push({
        location: `${r992a.triggerCount} stakes-raise aftermath(s) — no suspense raised within 2 scenes`,
        rule: 'BELIEF_STAKES_SUSPENSE_AFTERMATH_VOID',
        severity: 'minor',
        description: `Every stakes-raising scene (${r992a.triggerCount} escalations) is followed by two scenes with no rise in tension, even though ${r992a.aftermathCount} such rises occur elsewhere. Escalating danger should usually tighten the felt sense of jeopardy in the scenes right after it; when every stakes-raise's aftermath registers no suspense, the belief-tracking layer treats the escalation as a plot note rather than a threat the audience feels.`,
        suggestedFix: `In the two scenes following at least one stakes-raise, tighten the tension — a ticking complication or a near-miss — so escalating danger registers as a felt threat, not just a stated one.`,
      });
    }
  }

  // BELIEF_PAYOFF_RELATIONSHIP_AFTERMATH_VOID — payoff trigger × relationshipShifts aftermath.
  // Every payoff scene is followed by two scenes with no shift in any relationship, even though
  // such shifts occur elsewhere. A callback should sometimes bear on how characters treat each
  // other, not only on the plot's information state; when every payoff's aftermath is relationally
  // inert, the belief-tracking layer's resolutions land as pure mechanics. Distinct from
  // BELIEF_PAYOFF_CURIOSITY_AFTERMATH_VOID (Wave 978, same trigger paired with curiosityDelta) —
  // this is the first pairing of payoffSetupIds with relational consequence in this pass.
  {
    const r992b = checkAftermathVoid({
      records, minRecords: 8, minTriggerCount: 2, minAftermathCount: 2, window: 2,
      isTrigger: r => (r.payoffSetupIds ?? []).length > 0,
      isAftermath: r => (r.relationshipShifts ?? []).length > 0,
    });
    if (r992b.fires) {
      issues.push({
        location: `${r992b.triggerCount} payoff aftermath(s) — no relationship shift within 2 scenes`,
        rule: 'BELIEF_PAYOFF_RELATIONSHIP_AFTERMATH_VOID',
        severity: 'minor',
        description: `Every payoff scene (${r992b.triggerCount} cashed-in setups) is followed by two scenes with no shift in any relationship, even though ${r992b.aftermathCount} such shifts occur elsewhere. A callback that never bears on how characters treat each other in the scenes right after it lands as information completing without interpersonal consequence.`,
        suggestedFix: `In the two scenes following at least one payoff, let the resolved setup strain or shift a relationship so the callback pays off interpersonally, not only structurally.`,
      });
    }
  }

  // BELIEF_OPEN_THREAD_CURIOSITY_AFTERMATH_VOID — heavy clue-debt trigger × curiosityDelta
  // aftermath. Every scene carrying heavy unresolved clue-debt (unresolvedClues.length ≥ 3, a
  // stricter threshold than CLUE_DEBT_CLOCK's >0) is followed by two scenes that raise no new
  // curiosity, even though curiosity does rise elsewhere. Accumulated mystery should usually
  // compound into fresh questions, not just sit as inert backlog; when every heavy-debt scene's
  // aftermath opens nothing new, the belief-tracking layer's mystery stalls rather than deepens.
  // Distinct from CLUE_DEBT_CLOCK_AFTERMATH_VOID (>0 threshold, paired with clockRaised) — this is
  // a stricter threshold paired with a different consequence channel.
  {
    const r992c = checkAftermathVoid({
      records, minRecords: 8, minTriggerCount: 2, minAftermathCount: 2, window: 2,
      isTrigger: r => (r.unresolvedClues ?? []).length >= 3,
      isAftermath: r => (r.curiosityDelta ?? 0) > 0,
    });
    if (r992c.fires) {
      issues.push({
        location: `${r992c.triggerCount} heavy clue-debt scene(s) — no curiosity raised within 2 scenes of any`,
        rule: 'BELIEF_OPEN_THREAD_CURIOSITY_AFTERMATH_VOID',
        severity: 'minor',
        description: `Every scene carrying heavy unresolved clue-debt (${r992c.triggerCount} instances) is followed by two full scenes that raise no new curiosity, even though ${r992c.aftermathCount} such rises occur elsewhere. Accumulated mystery should usually compound into fresh questions rather than sit as inert backlog; when every heavy-debt scene's aftermath opens nothing new, the belief-tracking layer's mystery stalls instead of deepening.`,
        suggestedFix: `In the two scenes following at least one heavy clue-debt moment, plant a new open question so accumulated mystery keeps compounding rather than sitting in a learnable lull.`,
      });
    }
  }

  // BELIEF_STAKES_EMOTIONAL_AFTERMATH_VOID — raise-stakes trigger × emotionalShift aftermath.
  // Every stakes-raising scene is followed by two emotionally neutral scenes, even though charged
  // scenes do occur elsewhere. Escalating danger should usually carry some felt weight for the
  // characters living through it; when every stakes-raise's aftermath is affectively flat, the
  // belief-tracking layer's escalation reads as a stated fact rather than a threat anyone feels.
  // Distinct from BELIEF_STAKES_RELATIONSHIP_AFTERMATH_VOID (Wave 978, relationshipShifts) and
  // BELIEF_STAKES_SUSPENSE_AFTERMATH_VOID (Wave 992, suspenseDelta) — this is the third
  // consequence channel for this trigger in this pass.
  {
    const r1006a = checkAftermathVoid({
      records, minRecords: 8, minTriggerCount: 2, minAftermathCount: 2, window: 2,
      isTrigger: r => r.purpose === 'raise_stakes',
      isAftermath: r => (r.emotionalShift ?? 'neutral') !== 'neutral',
    });
    if (r1006a.fires) {
      issues.push({
        location: `${r1006a.triggerCount} stakes-raise aftermath(s) — no emotional shift within 2 scenes`,
        rule: 'BELIEF_STAKES_EMOTIONAL_AFTERMATH_VOID',
        severity: 'minor',
        description: `Every stakes-raising scene (${r1006a.triggerCount} escalations) is followed by two emotionally neutral scenes, even though ${r1006a.aftermathCount} emotionally-charged scenes exist elsewhere. Escalating danger should usually carry felt weight for the characters living through it; when every stakes-raise's aftermath is affectively flat, the belief-tracking layer's escalation reads as a stated fact rather than a threat anyone feels.`,
        suggestedFix: `Let at least one stakes-raise carry feeling in its aftermath: in the scene or two after the danger sharpens, show someone reacting to it emotionally — fear, resolve, dread.`,
      });
    }
  }

  // BELIEF_SEED_SUSPENSE_AFTERMATH_VOID — seed trigger × suspenseDelta aftermath. Every clue-
  // seeding scene is followed by two scenes with no rise in tension, even though tension does rise
  // elsewhere. A planted clue should usually tighten tension as its implications sink in; when
  // every seed's aftermath registers no suspense, the belief-tracking layer's groundwork sits flat
  // rather than compounding. Distinct from BELIEF_SEED_EMOTIONAL_AFTERMATH_VOID (Wave 978, same
  // trigger paired with emotionalShift) — this pairs seededClueIds with suspenseDelta for the
  // first time in this pass.
  {
    const r1006b = checkAftermathVoid({
      records, minRecords: 8, minTriggerCount: 2, minAftermathCount: 2, window: 2,
      isTrigger: r => (r.seededClueIds ?? []).length > 0,
      isAftermath: r => (r.suspenseDelta ?? 0) > 0,
    });
    if (r1006b.fires) {
      issues.push({
        location: `${r1006b.triggerCount} seed aftermath(s) — no suspense raised within 2 scenes`,
        rule: 'BELIEF_SEED_SUSPENSE_AFTERMATH_VOID',
        severity: 'minor',
        description: `Every clue-seeding scene (${r1006b.triggerCount} plants) is followed by two scenes with no rise in tension, even though ${r1006b.aftermathCount} such rises occur elsewhere. A planted clue should usually tighten tension as its implications sink in; when every seed's aftermath registers no suspense, the belief-tracking layer's groundwork sits flat rather than compounding.`,
        suggestedFix: `In the two scenes following at least one clue-seeding moment, raise the tension — a ticking complication or a near-miss tied to the new information — so the mystery keeps compounding rather than idling.`,
      });
    }
  }

  // BELIEF_PAYOFF_EMOTIONAL_AFTERMATH_VOID — payoff trigger × emotionalShift aftermath. Every
  // payoff scene is followed by two emotionally neutral scenes, even though charged scenes occur
  // elsewhere. A callback should usually carry some feeling — relief, cost, vindication; when
  // every payoff's aftermath is affectively flat, the belief-tracking layer's resolutions land as
  // pure mechanics. Distinct from BELIEF_PAYOFF_CURIOSITY_AFTERMATH_VOID (Wave 978, curiosityDelta)
  // and BELIEF_PAYOFF_RELATIONSHIP_AFTERMATH_VOID (Wave 992, relationshipShifts) — this is the
  // third consequence channel for this trigger in this pass.
  {
    const r1006c = checkAftermathVoid({
      records, minRecords: 8, minTriggerCount: 2, minAftermathCount: 2, window: 2,
      isTrigger: r => (r.payoffSetupIds ?? []).length > 0,
      isAftermath: r => (r.emotionalShift ?? 'neutral') !== 'neutral',
    });
    if (r1006c.fires) {
      issues.push({
        location: `${r1006c.triggerCount} payoff aftermath(s) — no emotional shift within 2 scenes`,
        rule: 'BELIEF_PAYOFF_EMOTIONAL_AFTERMATH_VOID',
        severity: 'minor',
        description: `Every payoff scene (${r1006c.triggerCount} cashed-in setups) is followed by two emotionally neutral scenes, even though ${r1006c.aftermathCount} emotionally-charged scenes exist elsewhere. A callback usually carries some feeling for whoever collects on it; when every payoff's aftermath is affectively flat, the belief-tracking layer's resolutions register as pure mechanics with no felt weight.`,
        suggestedFix: `Let at least one payoff carry feeling in its aftermath: in the scene or two after a setup pays off, show someone reacting to it emotionally — relief, grief, triumph.`,
      });
    }
  }

  // BELIEF_STAKES_CURIOSITY_AFTERMATH_VOID — Sequence/aftermath × raise_stakes trigger →
  // curiosityDelta absence. Built on checkAftermathVoid from the shared checks library. n≥8, ≥2
  // qualifying raise_stakes scenes (pos<n-2), ≥2 curiosity-rising scenes anywhere, 2-scene
  // lookahead. Fires when every stakes-raise's two-scene aftermath carries no curiosity rise,
  // while such rises occur elsewhere. Distinct from BELIEF_STAKES_RELATIONSHIP_AFTERMATH_VOID
  // (Wave 978, relationshipShifts), BELIEF_STAKES_SUSPENSE_AFTERMATH_VOID (Wave 992,
  // suspenseDelta), and BELIEF_STAKES_EMOTIONAL_AFTERMATH_VOID (Wave 1006, emotionalShift) — this
  // is the fourth consequence channel for this trigger in this pass.
  {
    const r1020a = checkAftermathVoid({
      records, minRecords: 8, minTriggerCount: 2, minAftermathCount: 2, window: 2,
      isTrigger: r => r.purpose === 'raise_stakes',
      isAftermath: r => (r.curiosityDelta ?? 0) > 0,
    });
    if (r1020a.fires) {
      issues.push({
        location: `${r1020a.triggerCount} raise-stakes aftermath(s) — no curiosity rise within 2 scenes`,
        rule: 'BELIEF_STAKES_CURIOSITY_AFTERMATH_VOID',
        severity: 'minor',
        description: `Every stakes-raising scene in the story (${r1020a.triggerCount} of them) is followed by two scenes with no rise in curiosity, even though ${r1020a.aftermathCount} such rises occur elsewhere. Raising the stakes without sharpening what the audience wonders about right after leaves the belief-tracking layer's escalation registering as declaration rather than genuine intrigue.`,
        suggestedFix: `In the two scenes following at least one stakes-raise, let curiosity visibly sharpen so the escalation reads as a question the audience now needs answered, not just a stated fact.`,
      });
    }
  }

  // BELIEF_PAYOFF_SUSPENSE_AFTERMATH_VOID — Sequence/aftermath × payoffSetupIds trigger →
  // suspenseDelta absence. Built on checkAftermathVoid from the shared checks library. n≥8, ≥2
  // qualifying payoff-setup scenes (pos<n-2), ≥2 suspense-rising scenes anywhere, 2-scene
  // lookahead. Fires when every setup's two-scene aftermath carries no suspense rise, while such
  // rises occur elsewhere. Distinct from BELIEF_PAYOFF_CURIOSITY_AFTERMATH_VOID (Wave 978),
  // BELIEF_PAYOFF_RELATIONSHIP_AFTERMATH_VOID (Wave 992), and BELIEF_PAYOFF_EMOTIONAL_AFTERMATH_
  // VOID (Wave 1006) — this is the fourth consequence channel for this trigger in this pass.
  {
    const r1020b = checkAftermathVoid({
      records, minRecords: 8, minTriggerCount: 2, minAftermathCount: 2, window: 2,
      isTrigger: r => (r.payoffSetupIds ?? []).length > 0,
      isAftermath: r => (r.suspenseDelta ?? 0) > 0,
    });
    if (r1020b.fires) {
      issues.push({
        location: `${r1020b.triggerCount} payoff-setup aftermath(s) — no suspense rise within 2 scenes`,
        rule: 'BELIEF_PAYOFF_SUSPENSE_AFTERMATH_VOID',
        severity: 'minor',
        description: `Every payoff-setup scene in the story (${r1020b.triggerCount} plants) is followed by two scenes with no rise in suspense, even though ${r1020b.aftermathCount} such rises occur elsewhere. Planting a setup without the tension visibly climbing right after it leaves the belief-tracking layer's groundwork feeling inert rather than loaded.`,
        suggestedFix: `In the two scenes following at least one payoff setup, let the tension visibly climb so the audience feels the setup is now armed and waiting to go off.`,
      });
    }
  }

  // BELIEF_SEED_RELATIONAL_AFTERMATH_VOID — Sequence/aftermath × seededClueIds trigger →
  // relationshipShifts absence. Built on checkAftermathVoid from the shared checks library. n≥8,
  // ≥2 qualifying clue-seeding scenes (pos<n-2), ≥2 relationship-shift scenes anywhere, 2-scene
  // lookahead. Fires when every seed's two-scene aftermath carries no bond change, while such
  // changes occur elsewhere. Distinct from BELIEF_SEED_EMOTIONAL_AFTERMATH_VOID (Wave 978) and
  // BELIEF_SEED_SUSPENSE_AFTERMATH_VOID (Wave 1006) — this is the third consequence channel for
  // this trigger in this pass.
  {
    const r1020c = checkAftermathVoid({
      records, minRecords: 8, minTriggerCount: 2, minAftermathCount: 2, window: 2,
      isTrigger: r => (r.seededClueIds ?? []).length > 0,
      isAftermath: r => (r.relationshipShifts ?? []).length > 0,
    });
    if (r1020c.fires) {
      issues.push({
        location: `${r1020c.triggerCount} clue-seed aftermath(s) — no relationship shift within 2 scenes`,
        rule: 'BELIEF_SEED_RELATIONAL_AFTERMATH_VOID',
        severity: 'minor',
        description: `Every clue-seeding scene in the story (${r1020c.triggerCount} plants) is followed by two scenes with no shift in any relationship, even though ${r1020c.aftermathCount} such shifts occur elsewhere. Planting a clue without it ever bearing on how characters treat each other right after leaves the belief-tracking layer's groundwork purely informational, never interpersonal.`,
        suggestedFix: `In the two scenes following at least one clue seed, let the new information strain or shift a relationship so the belief-tracking layer's groundwork lands interpersonally, not just as plot data.`,
      });
    }
  }

  // BELIEF_SEED_CURIOSITY_AFTERMATH_VOID — Sequence/aftermath × seededClueIds trigger →
  // curiosityDelta absence. Built on checkAftermathVoid from the shared checks library. n≥8, ≥2
  // qualifying seed scenes (pos<n-2), ≥2 curiosity-rising scenes anywhere, 2-scene lookahead.
  // Fires when every seed's two-scene aftermath carries no curiosity rise, while such rises occur
  // elsewhere. Distinct from BELIEF_SEED_EMOTIONAL_AFTERMATH_VOID, BELIEF_SEED_SUSPENSE_
  // AFTERMATH_VOID, and BELIEF_SEED_RELATIONAL_AFTERMATH_VOID (same trigger paired with
  // emotionalShift/suspenseDelta/relationshipShifts respectively) — this is the fourth
  // consequence channel for this trigger in this pass.
  {
    const r1034a = checkAftermathVoid({
      records, minRecords: 8, minTriggerCount: 2, minAftermathCount: 2, window: 2,
      isTrigger: r => (r.seededClueIds ?? []).length > 0,
      isAftermath: r => (r.curiosityDelta ?? 0) > 0,
    });
    if (r1034a.fires) {
      issues.push({
        location: `${r1034a.triggerCount} clue-seed aftermath(s) — no curiosity rise within 2 scenes`,
        rule: 'BELIEF_SEED_CURIOSITY_AFTERMATH_VOID',
        severity: 'minor',
        description: `Every clue-seeding scene in the story (${r1034a.triggerCount} plants) is followed by two scenes with no rise in curiosity, even though ${r1034a.aftermathCount} such rises occur elsewhere. A planted clue that never sharpens into a fresh question right after it leaves the belief-tracking layer's groundwork buried rather than voiced as something the audience now wonders about.`,
        suggestedFix: `In the two scenes following at least one clue-seeding moment, let curiosity visibly sharpen so the seed's groundwork registers as a live question, not just planted information.`,
      });
    }
  }

  // BELIEF_OPEN_THREAD_EMOTIONAL_AFTERMATH_VOID — Sequence/aftermath × heavy unresolvedClues debt
  // trigger → emotionalShift absence. Built on checkAftermathVoid from the shared checks library.
  // n≥8, ≥2 qualifying heavy-debt scenes (pos<n-2, threshold ≥3), ≥2 emotionally-charged scenes
  // anywhere, 2-scene lookahead. Fires when every heavy-debt scene's two-scene aftermath carries
  // no emotional shift, while such shifts occur elsewhere. Distinct from BELIEF_OPEN_THREAD_
  // CURIOSITY_AFTERMATH_VOID (same trigger paired with curiosityDelta) — this is the second
  // consequence channel for this trigger.
  {
    const r1034b = checkAftermathVoid({
      records, minRecords: 8, minTriggerCount: 2, minAftermathCount: 2, window: 2,
      isTrigger: r => (r.unresolvedClues ?? []).length >= 3,
      isAftermath: r => (r.emotionalShift ?? 'neutral') !== 'neutral',
    });
    if (r1034b.fires) {
      issues.push({
        location: `${r1034b.triggerCount} heavy clue-debt scene(s) — no emotional shift within 2 scenes of any`,
        rule: 'BELIEF_OPEN_THREAD_EMOTIONAL_AFTERMATH_VOID',
        severity: 'minor',
        description: `Every scene carrying heavy unresolved clue-debt (${r1034b.triggerCount} instances) is followed by two emotionally neutral scenes, even though ${r1034b.aftermathCount} emotionally-charged scenes exist elsewhere. A pile-up of open questions that never registers as felt in the scenes right after it leaves the belief-tracking layer's mounting uncertainty purely intellectual rather than something anyone visibly carries.`,
        suggestedFix: `In the two scenes following a heavy clue-debt moment, let someone's feelings register the weight of the unresolved questions so the belief-tracking layer's debt lands emotionally, not just informationally.`,
      });
    }
  }

  // BELIEF_OPEN_THREAD_RELATIONAL_AFTERMATH_VOID — Sequence/aftermath × heavy unresolvedClues
  // debt trigger → relationshipShifts absence. Built on checkAftermathVoid from the shared checks
  // library. n≥8, ≥2 qualifying heavy-debt scenes (pos<n-2, threshold ≥3), ≥2 relationship-shift
  // scenes anywhere, 2-scene lookahead. Fires when every heavy-debt scene's two-scene aftermath
  // carries no bond change, while such changes occur elsewhere. Distinct from BELIEF_OPEN_THREAD_
  // CURIOSITY_AFTERMATH_VOID and BELIEF_OPEN_THREAD_EMOTIONAL_AFTERMATH_VOID (same trigger paired
  // with curiosityDelta and emotionalShift respectively) — this is the third consequence channel
  // for this trigger.
  {
    const r1034c = checkAftermathVoid({
      records, minRecords: 8, minTriggerCount: 2, minAftermathCount: 2, window: 2,
      isTrigger: r => (r.unresolvedClues ?? []).length >= 3,
      isAftermath: r => (r.relationshipShifts ?? []).length > 0,
    });
    if (r1034c.fires) {
      issues.push({
        location: `${r1034c.triggerCount} heavy clue-debt scene(s) — no relationship shift within 2 scenes of any`,
        rule: 'BELIEF_OPEN_THREAD_RELATIONAL_AFTERMATH_VOID',
        severity: 'minor',
        description: `Every scene carrying heavy unresolved clue-debt (${r1034c.triggerCount} instances) is followed by two scenes with no shift in any relationship, even though ${r1034c.aftermathCount} such shifts occur elsewhere. A pile-up of open questions that never bears on how characters treat each other nearby leaves the belief-tracking layer's uncertainty purely informational rather than something straining the bond.`,
        suggestedFix: `In the two scenes following at least one heavy clue-debt moment, let the mounting uncertainty strain or shift a relationship so the belief-tracking layer's open threads register interpersonally, not just as plot backlog.`,
      });
    }
  }

  // BELIEF_OPEN_THREAD_SUSPENSE_AFTERMATH_VOID — Sequence/aftermath × heavy unresolvedClues debt
  // trigger → suspenseDelta absence. Built on checkAftermathVoid from the shared checks library.
  // n≥8, ≥2 qualifying heavy-debt scenes (pos<n-2, threshold ≥3), ≥2 suspense-rising scenes
  // anywhere, 2-scene lookahead. Fires when every heavy-debt scene's two-scene aftermath carries
  // no suspense rise, while such rises occur elsewhere. Distinct from BELIEF_OPEN_THREAD_
  // CURIOSITY_AFTERMATH_VOID, BELIEF_OPEN_THREAD_EMOTIONAL_AFTERMATH_VOID, and BELIEF_OPEN_THREAD_
  // RELATIONAL_AFTERMATH_VOID (same trigger paired with curiosityDelta/emotionalShift/
  // relationshipShifts respectively) — this is the fourth consequence channel for this trigger.
  {
    const r1048a = checkAftermathVoid({
      records, minRecords: 8, minTriggerCount: 2, minAftermathCount: 2, window: 2,
      isTrigger: r => (r.unresolvedClues ?? []).length >= 3,
      isAftermath: r => (r.suspenseDelta ?? 0) > 0,
    });
    if (r1048a.fires) {
      issues.push({
        location: `${r1048a.triggerCount} heavy clue-debt scene(s) — no suspense rise within 2 scenes of any`,
        rule: 'BELIEF_OPEN_THREAD_SUSPENSE_AFTERMATH_VOID',
        severity: 'minor',
        description: `Every scene carrying heavy unresolved clue-debt (${r1048a.triggerCount} instances) is followed by two scenes with no rise in suspense, even though ${r1048a.aftermathCount} such rises occur elsewhere. Accumulated mystery that never tightens the felt sense of danger right after it leaves the belief-tracking layer's uncertainty stalling instead of pressuring the story forward.`,
        suggestedFix: `In the two scenes following at least one heavy clue-debt moment, let the tension rise so accumulated mystery keeps pressuring the belief-tracking layer's stakes rather than sitting in a learnable lull.`,
      });
    }
  }

  // BELIEF_STAKES_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID — Sequence/aftermath × raise_stakes trigger →
  // dialogueHighlights absence. Built on checkAftermathVoid from the shared checks library. n≥8,
  // ≥2 qualifying raise_stakes scenes (pos<n-2), ≥2 scenes anywhere with a highlighted line of
  // dialogue, 2-scene lookahead. Fires when every stakes-raise's two-scene aftermath contains no
  // highlighted dialogue, while such dialogue occurs elsewhere. dialogueHighlights has never been
  // used as a checkAftermathVoid consequence channel anywhere in this pass — this is the first
  // pairing of the field with the sequence/aftermath mode here, and the fifth consequence channel
  // for this trigger.
  {
    const r1048b = checkAftermathVoid({
      records, minRecords: 8, minTriggerCount: 2, minAftermathCount: 2, window: 2,
      isTrigger: r => r.purpose === 'raise_stakes',
      isAftermath: r => (r.dialogueHighlights ?? []).length > 0,
    });
    if (r1048b.fires) {
      issues.push({
        location: `${r1048b.triggerCount} raise-stakes aftermath(s) — no highlighted dialogue within 2 scenes`,
        rule: 'BELIEF_STAKES_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID',
        severity: 'minor',
        description: `Every stakes-raising scene in the story (${r1048b.triggerCount} of them) is followed by two scenes with no highlighted dialogue, even though ${r1048b.aftermathCount} such scenes exist elsewhere in the script. Escalating danger that lands without a single memorable line reacting to it in the immediate aftermath leaves the belief-tracking layer's stakes registering structurally, never in a line anyone remembers.`,
        suggestedFix: `In the two scenes following at least one stakes-raise, let a character deliver a memorable line naming or reacting to the new danger so the escalation registers in speech, not just in plot mechanics.`,
      });
    }
  }

  // BELIEF_PAYOFF_STAGING_AFTERMATH_VOID — Sequence/aftermath × payoffSetupIds trigger →
  // visualBeats absence. Built on checkAftermathVoid from the shared checks library. n≥8, ≥2
  // qualifying payoff scenes (pos<n-2), ≥2 scenes anywhere with substantial physical staging,
  // 2-scene lookahead. Fires when every payoff's two-scene aftermath contains no visually dense
  // scene, while such scenes occur elsewhere. visualBeats has never been used as a
  // checkAftermathVoid consequence channel anywhere in this pass — this is the first pairing of
  // the field with the sequence/aftermath mode here, and the fifth consequence channel for this
  // trigger.
  {
    const r1048c = checkAftermathVoid({
      records, minRecords: 8, minTriggerCount: 2, minAftermathCount: 2, window: 2,
      isTrigger: r => (r.payoffSetupIds ?? []).length > 0,
      isAftermath: r => (r.visualBeats ?? []).length >= 2,
    });
    if (r1048c.fires) {
      issues.push({
        location: `${r1048c.triggerCount} payoff scene(s) — no visually dense scene within 2 scenes of any`,
        rule: 'BELIEF_PAYOFF_STAGING_AFTERMATH_VOID',
        severity: 'minor',
        description: `Every payoff scene in the story (${r1048c.triggerCount} cashed-in setups) is followed by two scenes with no substantial physical staging, even though ${r1048c.aftermathCount} such scenes exist elsewhere in the script. A resolved setup gains texture when the world briefly holds physical attention right after it lands, but that opportunity consistently passes unstaged in the scenes immediately following every payoff.`,
        suggestedFix: `After at least one payoff, let one of the following two scenes carry substantial physical staging — the aftermath of the resolution given some visible presence before the belief-tracking layer moves on.`,
      });
    }
  }

  // BELIEF_STAKES_STAGING_AFTERMATH_VOID — Sequence/aftermath × raise_stakes trigger →
  // visualBeats absence. Built on checkAftermathVoid from the shared checks library. n≥8, ≥2
  // qualifying stakes-raising scenes (pos<n-2), ≥2 visually-dense scenes anywhere (visualBeats
  // length≥2), 2-scene lookahead. Fires when every stakes-raise's two-scene aftermath contains no
  // visually dense scene, while such scenes occur elsewhere. Distinct from BELIEF_STAKES_
  // RELATIONSHIP_AFTERMATH_VOID, BELIEF_STAKES_SUSPENSE_AFTERMATH_VOID, BELIEF_STAKES_EMOTIONAL_
  // AFTERMATH_VOID, BELIEF_STAKES_CURIOSITY_AFTERMATH_VOID, and BELIEF_STAKES_DIALOGUE_HIGHLIGHT_
  // AFTERMATH_VOID (same trigger paired with relationshipShifts/suspenseDelta/emotionalShift/
  // curiosityDelta/dialogueHighlights respectively) — this is the sixth and final
  // standard-channel pairing for this trigger, completing full saturation.
  {
    const r1062a = checkAftermathVoid({
      records, minRecords: 8, minTriggerCount: 2, minAftermathCount: 2, window: 2,
      isTrigger: r => r.purpose === 'raise_stakes',
      isAftermath: r => (r.visualBeats ?? []).length >= 2,
    });
    if (r1062a.fires) {
      issues.push({
        location: `${r1062a.triggerCount} stakes-raising scene(s) — no visually dense scene within 2 scenes of any`,
        rule: 'BELIEF_STAKES_STAGING_AFTERMATH_VOID',
        severity: 'minor',
        description: `Every one of the story's ${r1062a.triggerCount} stakes-raising scenes is followed by two scenes with no substantial physical staging, even though ${r1062a.aftermathCount} such scenes exist elsewhere in the script. Raised stakes gain weight when the world briefly holds physical attention around them, but that opportunity consistently passes unstaged in the scenes immediately following every stakes-raise, leaving the belief-tracking layer's escalation abstract rather than lodged in the world.`,
        suggestedFix: `After at least one stakes-raise, let one of the following two scenes carry substantial physical staging — an action or gesture that gives the raised stakes a physical anchor.`,
      });
    }
  }

  // BELIEF_PAYOFF_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID — Sequence/aftermath × payoffSetupIds trigger
  // → dialogueHighlights absence. Built on checkAftermathVoid from the shared checks library.
  // n≥8, ≥2 qualifying payoff scenes (pos<n-2), ≥2 scenes anywhere with a highlighted line of
  // dialogue, 2-scene lookahead. Fires when every payoff's two-scene aftermath contains no
  // highlighted dialogue, while such dialogue occurs elsewhere. Distinct from BELIEF_PAYOFF_
  // CURIOSITY_AFTERMATH_VOID, BELIEF_PAYOFF_RELATIONSHIP_AFTERMATH_VOID, BELIEF_PAYOFF_EMOTIONAL_
  // AFTERMATH_VOID, BELIEF_PAYOFF_SUSPENSE_AFTERMATH_VOID, and BELIEF_PAYOFF_STAGING_AFTERMATH_
  // VOID (same trigger paired with curiosityDelta/relationshipShifts/emotionalShift/suspenseDelta/
  // visualBeats respectively) — this is the sixth and final standard-channel pairing for this
  // trigger, completing full saturation.
  {
    const r1062b = checkAftermathVoid({
      records, minRecords: 8, minTriggerCount: 2, minAftermathCount: 2, window: 2,
      isTrigger: r => (r.payoffSetupIds ?? []).length > 0,
      isAftermath: r => (r.dialogueHighlights ?? []).length > 0,
    });
    if (r1062b.fires) {
      issues.push({
        location: `${r1062b.triggerCount} payoff scene(s) — no highlighted dialogue within 2 scenes of any`,
        rule: 'BELIEF_PAYOFF_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID',
        severity: 'minor',
        description: `Every payoff scene in the story (${r1062b.triggerCount} cashed-in setups) is followed by two scenes with no highlighted dialogue, even though ${r1062b.aftermathCount} such scenes exist elsewhere in the script. A resolved setup that never earns a memorable line right after it lands leaves the belief-tracking layer's payoffs registering as structural closure alone, with no voice confirming what the resolution meant.`,
        suggestedFix: `After at least one payoff, let one of the following two scenes carry a memorable line — a character naming what just resolved, giving the payoff a voice, not just a checked box.`,
      });
    }
  }

  // BELIEF_SEED_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID — Sequence/aftermath × seededClueIds trigger →
  // dialogueHighlights absence. Built on checkAftermathVoid from the shared checks library. n≥8,
  // ≥2 qualifying seed scenes (pos<n-2), ≥2 scenes anywhere with a highlighted line of dialogue,
  // 2-scene lookahead. Fires when every seed's two-scene aftermath contains no highlighted
  // dialogue, while such dialogue occurs elsewhere. Distinct from BELIEF_SEED_EMOTIONAL_
  // AFTERMATH_VOID, BELIEF_SEED_SUSPENSE_AFTERMATH_VOID, BELIEF_SEED_RELATIONAL_AFTERMATH_VOID,
  // and BELIEF_SEED_CURIOSITY_AFTERMATH_VOID (same trigger paired with emotionalShift/
  // suspenseDelta/relationshipShifts/curiosityDelta respectively) — this is the fifth consequence
  // channel for this trigger.
  {
    const r1062c = checkAftermathVoid({
      records, minRecords: 8, minTriggerCount: 2, minAftermathCount: 2, window: 2,
      isTrigger: r => (r.seededClueIds ?? []).length > 0,
      isAftermath: r => (r.dialogueHighlights ?? []).length > 0,
    });
    if (r1062c.fires) {
      issues.push({
        location: `${r1062c.triggerCount} seed scene(s) — no highlighted dialogue within 2 scenes of any`,
        rule: 'BELIEF_SEED_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID',
        severity: 'minor',
        description: `Every one of the story's ${r1062c.triggerCount} clue-planting scenes is followed by two scenes with no highlighted dialogue, even though ${r1062c.aftermathCount} such scenes exist elsewhere in the script. A planted clue that never earns a memorable line right after it lands registers as inert plot machinery rather than something a character's voice gives weight to.`,
        suggestedFix: `After at least one seed, let one of the following two scenes carry a memorable line — a character naming or reacting to what was just planted, so the seed's presence is voiced, not just recorded.`,
      });
    }
  }

  const { revised, usedLLM } = await rewritePass({ fountain, issues, passName: 'belief', approvedSpans, storyContext: input.storyContext, priorPassResults: input.priorPassResults });
  const changed = revised !== fountain;

  return {
    pass: 'belief',
    issues,
    revisedFountain: revised,
    changed,
    summary: issues.length === 0
      ? 'Belief/deception pass: belief tracking is sound'
      : `Belief/deception pass: ${issues.length} issue(s) — ${usedLLM ? 'rewritten' : 'flagged (stub mode)'}`,
  };
}

function sharedWords(a: string, b: string): number {
  const stopwords = new Set(['the', 'a', 'an', 'is', 'are', 'was', 'were', 'has', 'have', 'had', 'that', 'this', 'it', 'he', 'she', 'they', 'we', 'in', 'on', 'at', 'to', 'of', 'and', 'or', 'but', 'not']);
  const wordsA = new Set(a.toLowerCase().split(/\W+/).filter(w => w.length > 3 && !stopwords.has(w)));
  const wordsB = b.toLowerCase().split(/\W+/).filter(w => w.length > 3 && !stopwords.has(w));
  return wordsB.filter(w => wordsA.has(w)).length;
}
