// Wave 39 — Pass 5: Conflict
// Checks conflict escalation: flat arc, missing opposition, collisions not detonated.
// Wave 144 additions: escalation plateau (peak then stalls), confrontation quality,
// and conflict fatigue (reversals too frequent causing audience whiplash).
// Wave 158 additions: threat amnesia (clock established but forgotten in second half),
// antagonist vanish (all reversals in first 60%, none after), and single-register
// conflict (all relationship shifts use the same dimension — one-axis drama).
// Wave 257 additions: conflict Act 3 absent (climax without struggle), reconciliation
// Wave 271 additions: conflict Act 2b void (dark-night zone empty), interpersonal
// conflict only (zero external reversals), conflict pair density gap (one pair 3× others).
// absent (no broken bond ever repairs), and conflict opening void (frictionless Act 1).
// Wave 285 additions: conflict suspense decoupled (conflict scenes don't drive suspense),
// negative spiral unbroken (≥4 consecutive negative shifts with no relief),
// conflict resolution premature (major conflict resolved before final quarter).
// Wave 299 additions: conflict emotion decoupled (conflict scenes all emotionally
// neutral), stakes label unbacked (raise_stakes scenes with no conflict markers),
// eleventh hour conflict (new conflict pair first appears in the final 10%).
// Wave 313 additions: conflict curiosity decoupled (conflict scenes avg curiosityDelta
// ≤ 0), conflict magnitude peak early (heaviest relational rupture in the first half,
// distributed), conflict relentless run (≥4 consecutive scenes with a negative shift).
// Wave 338 additions: conflict clock decoupled (≥2 clock scenes none with relational
// conflict — deadlines without friction), conflict dramatic turn void (≥3 turn scenes
// none with negative relationship shift — pivots that don't crack bonds), conflict
// first-half monopoly (>70% of all conflict scenes in the first half — front-loaded).
// Wave 352 additions: conflict peak suspense absent (the heaviest-rupture scene has
// suspenseDelta ≤ 0), conflict peak emotion absent (the heaviest-rupture scene is
// emotionally neutral), conflict peak curiosity absent (the heaviest-rupture scene has
// curiosityDelta ≤ 0) — the single biggest bond-break is dramatically inert.
// Wave 366 additions: conflict peak dramatic turn absent (the heaviest-rupture scene
// carries no dramatic turn — the biggest break is not a story pivot), conflict peak clock
// absent (the heaviest-rupture scene raises no clock while the story uses clocks elsewhere
// — the biggest break adds no time pressure), conflict late first rupture (the first
// conflict scene falls at or after the midpoint — the entire first half is frictionless).
// Wave 380 additions: conflict Act 2a void (no rupture in the 25%–50% zone while the story
// has conflict — fills the Act-zone set alongside Act1/2b/3/midpoint), conflict second-half
// monopoly (>70% of ruptures fall in the second half — the distribution mirror of conflict
// first-half monopoly), conflict revelation decoupled (≥2 ruptures and ≥2 revelations but
// none share a scene — the rupture and disclosure engines never meet, sibling of clock-decoupled).
// Wave 394 additions: conflict clue decoupled (rupture scenes never seed a clue — conflict
// terminates threads without opening them, co-occurrence × seededClueIds), conflict payoff
// decoupled (payoff scenes never coincide with a rupture — foreshadowing resolves without
// relational cost, co-occurrence × payoffSetupIds), conflict rupture aftermath void (a major
// rupture ≤ -0.5 is followed by 2 scenes with no per-pair shift and neutral emotion —
// sequence/aftermath × relationship-shift channel).
// Wave 408 additions: conflict peak revelation absent (the single heaviest-rupture scene
// discloses nothing while the story has revelations elsewhere — single-peak isolation ×
// revelation), conflict peak payoff absent (the heaviest-rupture scene pays off no setup while
// payoffs exist elsewhere — single-peak isolation × payoffSetupIds), conflict peak seed absent
// (the heaviest-rupture scene seeds no clue while seeds exist elsewhere — single-peak isolation
// × seededClueIds). These extend the Wave 352/366 peak-rupture audit to the three remaining
// channels and are distinct from the Wave 380/394 co-occurrence "decoupled" checks, which audit
// whether ANY rupture coincides (aggregate) rather than whether the single biggest one does.
// Wave 422 additions: conflict rupture cause void (no conflict scene has a cause in itself or
// the prior scene — every rupture is an authorial decree without visible provocation; backward-
// cause mode × rupture channel), conflict aftermath curiosity void (every rupture is followed
// by 2 scenes where curiosityDelta ≤ 0 — breaking bonds opens no new questions; sequence/
// aftermath × curiosity), conflict pair shift imbalance (one relationship pair accounts for
// >65% of total negative shift magnitude while ≥3 pairs exist — the story over-invests in
// one dyad; average/aggregate × pair distribution).
// Wave 436 additions: positive spiral (≥3 consecutive scenes each with a positive relationship
// shift while ≥2 ruptures exist elsewhere — the relational world warms unbroken, removing
// friction; run-based × positive-shift channel, complement of CONFLICT_RELENTLESS_RUN),
// rupture suspense void (every major rupture is followed by 2 scenes with suspenseDelta ≤ 0 —
// bond-breaking never escalates tension; sequence/aftermath × suspense channel, parallel to
// Wave 422's CONFLICT_AFTERMATH_CURIOSITY_VOID but suspense rather than curiosity), breathing
// room absent (≥4 ruptures exist and the maximum non-rupture gap between consecutive ruptures
// is ≤1 scene — every break is followed almost immediately by another; distribution/timing ×
// rupture spacing, distinct from CONFLICT_RELENTLESS_RUN which requires CONSECUTIVE ruptures).
// Wave 450 additions: clock aftermath void (≥2 clock scenes all followed by 2 scenes with no
// conflict signal — deadlines raised but never detonated; sequence/aftermath × clock channel,
// distinct from CONFLICT_CLOCK_DECOUPLED which audits in-scene relational content), positive
// emotion rupture (≥3 conflict scenes all with positive emotionalShift — characters feel good
// while bonds break, an emotional/relational inversion; co-occurrence × positive valence ×
// rupture, complement of CONFLICT_EMOTION_DECOUPLED which audits neutral), rupture clock
// aftermath void (every rupture followed by 2 scenes with no clock raised while story uses
// clocks elsewhere — bond-breaking never tightens the deadline; sequence/aftermath × clock ×
// rupture aftermath, completes the set with CONFLICT_AFTERMATH_CURIOSITY_VOID and
// CONFLICT_RUPTURE_SUSPENSE_VOID by adding the clock channel).
// Wave 464 additions: rupture revelation aftermath void (every rupture is followed by 2 scenes
// with no revelation while the story discloses elsewhere — bond-breaking never leads to discovery;
// sequence/aftermath × revelation channel, completing the aftermath set alongside the curiosity,
// suspense, and clock channels), rupture dramatic-turn aftermath void (every rupture is followed
// by 2 scenes with no dramatic turn while turns exist elsewhere — fractures never pivot the story;
// sequence/aftermath × dramatic-turn channel), peak rupture uncaused (the single heaviest rupture
// has no escalation, revelation, dramatic turn, or clock raise in the two scenes before it — the
// story's deepest fracture arrives unprepared; single-peak isolation × backward-cause mode,
// distinct from CONFLICT_RUPTURE_CAUSE_VOID which audits ALL ruptures aggregate against the prior
// single scene, and from the CONFLICT_PEAK_* checks which audit the peak's in-scene channels).
// Wave 478 additions: rupture temporal cluster (distribution/timing — >75% of rupture scenes fall
// in a single third; the conflict engine is architecturally ghettoized; first distribution/timing
// check using thirds on the rupture channel, distinct from CONFLICT_FIRST/SECOND_HALF_MONOPOLY
// which use a binary 70% threshold), positive emotion aftermath void (sequence/aftermath × rupture
// × positive emotion — every major rupture is followed by 2 scenes with no positive emotional beat;
// bond-breaking never precedes relief or recovery; the positive-valence complement of the existing
// aftermath channels covering curiosity, suspense, clock, revelation, and turn), repair uncaused
// (backward-cause × positive relational shift — every scene where a bond repairs or warms has no
// major rupture, revelation, or dramatic turn in its prior 2 scenes; reconciliations are
// systematically spontaneous; the positive-shift complement of CONFLICT_RUPTURE_CAUSE_VOID which
// audits all NEGATIVE shifts, and of CONFLICT_PEAK_RUPTURE_UNCAUSED which audits only the peak).
// Wave 492 additions: dramatic-turn repair decoupled (co-occurrence × dramatic-turn × positive
// relationship shift — ≥2 dramatic-turn scenes and ≥2 repair scenes share zero overlap; story
// pivots never coincide with bond-warming; distinct from CONFLICT_DRAMATIC_TURN_VOID which audits
// negative shifts in turn scenes, and CONFLICT_REPAIR_UNCAUSED which audits backward-cause),
// closing suspense void (zone presence/absence × suspense × closing third — the final third has
// no scene with positive suspenseDelta while the earlier two-thirds have ≥2 such scenes; the
// climax approach carries no new tension build; distinct from ESCALATION_PLATEAU which compares
// averages and CONFLICT_ACT3_ABSENT which audits any conflict signal), calm stretch (run-based
// × non-conflict gap — ≥5 consecutive non-conflict scenes while ≥4 overall conflict scenes exist;
// a sustained lull breaks dramatic rhythm; the complement of CONFLICT_BREATHING_ROOM_ABSENT which
// fires when ruptures are too close, not when they are too sparse).
// Wave 506 additions: rupture seed aftermath void (sequence/aftermath × seed × rupture aftermath —
// n≥8, ≥2 ruptures ≤ -0.3, ≥2 seed scenes; every rupture followed by 2 scenes with no seededClueIds;
// bond-breaking never plants a clue foreshadowing resolution of the fracture; completes the aftermath
// channel set by adding the seed channel alongside curiosity, suspense, clock, revelation, turn, and
// positive-emotion; distinct from CONFLICT_CLUE_DECOUPLED which is same-scene co-occurrence),
// revelation repair decoupled (co-occurrence × revelation × positive shift — n≥8, ≥2 revelation
// scenes, ≥2 repair scenes ≥ +0.3, zero overlap; truths never surface as bonds heal; distinct from
// CONFLICT_REVELATION_DECOUPLED which pairs revelation with negative shifts, and CONFLICT_DRAMATIC_
// TURN_REPAIR_DECOUPLED which pairs turn with positive shifts), repair closing absent (zone presence/
// absence × positive shift × closing third — n≥9, ≥2 repair scenes ≥ +0.3, none in final third;
// the resolution zone contains no bond-warming; distinct from CONFLICT_CLOSING_SUSPENSE_VOID which
// audits suspense not repair, and CONFLICT_ACT3_ABSENT which audits any conflict not specifically
// positive-shift absence).
// Wave 534 additions: clock rupture decoupled (co-occurrence/decoupling × clock × rupture — n≥8,
// ≥2 clockRaised scenes AND ≥2 rupture scenes [shift ≤ −0.3], zero overlap; deadline urgency never
// coincides with bond-breaking; the clock channel completes the co-occurrence decoupling family
// alongside revelation, seed, payoff, and dramatic-turn; distinct from CONFLICT_CLOCK_ABSENT which
// audits absence of both channels together and from all aftermath checks which use clock as trigger),
// rupture curiosity void (co-occurrence/decoupling × rupture × curiosityDelta — n≥8, ≥2 rupture
// scenes, ≥2 curiosity scenes, every rupture has curiosityDelta ≤ 0; bond-breaking never ignites
// wondering; distinct from CONFLICT_RUPTURE_AFTERMATH_CURIOSITY_VOID which is aftermath mode [what
// follows the rupture] and from CONFLICT_CLUE_DECOUPLED which is seed not curiosity; fills the
// rupture × curiosity co-occurrence cell alongside rupture × revelation/seed/payoff/turn), curiosity
// front-loaded (distribution/timing × curiosityDelta × first half — n≥8, ≥4 curiosity scenes, >70%
// in first half while back half has ≥1; wonder exhausted before climax; distinct from CONFLICT_
// CURIOSITY_CLOSING_ZONE_ABSENT which is zone-absence not distribution-ratio, from CONFLICT_REPAIR_
// FRONT_LOADED which targets positive shifts not curiosity, and from ARC_CURIOSITY_BACK_LOADED which
// targets opposite concentration direction; first distribution/timing check on curiosity in this pass).
// Wave 548 additions: peak repair uncaused (backward-cause × single-peak isolation × positive relational
// shift — n≥8, ≥2 repair scenes ≥+0.3; the single biggest positive shift has no rupture, revelation,
// dramatic-turn, or clock in its prior 2 scenes; the peak reconciliation is spontaneous; first check
// combining single-peak isolation + backward-cause on the positive-shift channel, distinct from
// CONFLICT_REPAIR_UNCAUSED [all repairs aggregate] and CONFLICT_PEAK_RUPTURE_UNCAUSED [backward-cause ×
// peak RUPTURE]), closing clock absent (zone presence/absence × clockRaised × closing third — n≥9,
// ≥2 clock scenes in the first two-thirds, none in the final third; the story's deadline urgency goes
// silent exactly as the climax approaches; first zone check on the clockRaised channel in the closing
// third, distinct from THREAT_AMNESIA [Act 1 to second half], CONFLICT_CLOCK_DECOUPLED [co-occurrence ×
// relational content], and CONFLICT_CLOCK_AFTERMATH_VOID [aftermath mode]), seed repair decoupled
// (co-occurrence × seededClueIds × positive relational shift — n≥8, ≥2 seed scenes, ≥2 repair scenes
// ≥+0.3, zero overlap; the story plants clues and warms bonds but never in the same scene; distinct from
// CONFLICT_CLUE_DECOUPLED [seed × rupture — the negative direction], CONFLICT_RUPTURE_SEED_AFTERMATH_VOID
// [aftermath mode], and CONFLICT_REVELATION_REPAIR_DECOUPLED [revelation × repair — different signal pair];
// first co-occurrence check joining seed and repair channels).
// Wave 590 additions: seed suspense aftermath void (sequence/aftermath × seed trigger → suspense
// aftermath — n≥8, ≥2 qualifying seed-plant scenes [seededClueIds non-empty, pos<n-1], ≥2 suspense-
// rise scenes globally, every qualifying seed not followed by suspenseDelta>0 in next 2 scenes;
// foreshadowing and tension engines completely disconnected; distinct from CONFLICT_RUPTURE_SEED_
// AFTERMATH_VOID [seed is aftermath not trigger], CONFLICT_RUPTURE_SUSPENSE_VOID [rupture trigger
// not seed], CONFLICT_TURN_AFTERMATH_SUSPENSE_VOID [dramatic-turn trigger]; first aftermath check
// using the seed-plant event as trigger), clock dramatic-turn aftermath void (sequence/aftermath ×
// clock trigger → dramatic-turn aftermath — n≥8, ≥2 qualifying clock-raised scenes [pos<n-1], ≥2
// dramatic-turn scenes globally, every clock not followed by a dramatic turn in next 2 scenes;
// deadlines never catalyse structural pivots; distinct from CONFLICT_CLOCK_AFTERMATH_VOID [clock →
// conflict-signal aftermath — different aftermath channel], CONFLICT_TURN_AFTERMATH_SUSPENSE_VOID
// [dramatic-turn trigger → suspense aftermath — different direction], CONFLICT_CLOCK_DECOUPLED [co-
// occurrence mode]; first aftermath check using dramatic-turn as the aftermath channel for a clock
// trigger), rupture drought run (run-based × rupture-absence — n≥10, ≥2 rupture scenes, longest
// consecutive non-rupture run ≥7; relational fracture engine goes dark for an extended stretch;
// distinct from CONFLICT_CALM_STRETCH [mixed non-conflict signal = rupture OR suspense drop,
// threshold 5], CONFLICT_REPAIR_DROUGHT_RUN [repair-absence channel], CONFLICT_REVELATION_DROUGHT_
// RUN [revelation-absence channel]; first run-based check targeting the rupture channel alone).
// Wave 576 additions: curiosity zone cluster (distribution/timing × curiosityDelta × structural
// thirds — n≥9, ≥3 curiosity-positive scenes, >75% in one third; wonder spikes ghettoized into
// one zone; finer-grained than binary half checks; distinct from CONFLICT_CURIOSITY_CLOSING_ZONE_
// ABSENT [zone-absence × closing third only, not concentration in any third], CONFLICT_AFTERMATH_
// CURIOSITY_VOID [aftermath mode not distribution], CONFLICT_RUPTURE_CURIOSITY_DECOUPLED [co-
// occurrence not distribution]), dramatic-turn aftermath suspense void (sequence/aftermath ×
// dramatic turn → suspense aftermath — n≥8, ≥2 qualifying turn scenes [pos<n-1], ≥2 suspense
// scenes, no turn scene followed by suspenseDelta>0 within 2 scenes; pivots never escalate
// conflict tension; the turn-trigger complement of CONFLICT_AFTERMATH_CURIOSITY_VOID [curiosity
// channel] in this pass; distinct from CONFLICT_EMOTION_DECOUPLED [same-scene], CONFLICT_CLOSING_
// SUSPENSE_VOID [zone not aftermath]), revelation drought run (run-based × revelation × absence —
// n≥10, ≥2 revelation scenes, longest consecutive non-revelation run ≥7; the information-reveal
// engine goes silent for an extended stretch; the revelation-channel sibling of CONFLICT_REPAIR_
// DROUGHT_RUN [repair channel]; distinct from CONFLICT_CURIOSITY_CLOSING_ZONE_ABSENT [zone not run]).
// Wave 562 additions: repair drought run (run-based × repair absence × valence — n≥10, ≥2 repair
// scenes, longest consecutive run of non-repair scenes ≥6; relational warmth goes dark for an
// extended stretch; first run-based ABSENCE check on the repair channel, distinct from CONFLICT_
// CALM_STRETCH [non-conflict gap, not non-repair], CONFLICT_POSITIVE_SPIRAL [presence run not
// absence], and CONFLICT_REPAIR_FRONT_LOADED [distribution not run]), repair emotion decoupled
// (co-occurrence/decoupling × repair × emotionalShift — n≥8, ≥3 repair scenes all emotionally
// neutral while ≥2 non-repair scenes carry emotion; bonds heal but the protagonist feels nothing;
// distinct from CONFLICT_EMOTION_DECOUPLED [audits rupture/conflict scenes — the negative direction]
// and CONFLICT_POSITIVE_EMOTION_RUPTURE [inverted valence on the conflict channel]), repair curiosity
// aftermath void (sequence/aftermath × repair → curiosity — n≥8, ≥2 repair scenes [pos<n-1], ≥2
// curiosity scenes globally, every repair followed by 2 scenes with curiosityDelta ≤ 0; reconciliation
// never opens new questions; the positive-shift complement of CONFLICT_AFTERMATH_CURIOSITY_VOID [rupture
// trigger], distinct from CONFLICT_RUPTURE_CURIOSITY_DECOUPLED [same-scene co-occurrence] and CONFLICT_
// CURIOSITY_CLOSING_ZONE_ABSENT [zone check]).
// Wave 520 additions: rupture payoff aftermath void (sequence/aftermath × payoff × rupture aftermath
// — n≥8, ≥2 ruptures ≤ -0.3, ≥2 payoff scenes; every rupture followed by 2 scenes with no
// payoffSetupIds; bond-breaking never immediately precedes thread resolution; final uncovered aftermath
// channel completing the set alongside curiosity, suspense, clock, revelation, turn, positive-emotion,
// and seed; distinct from CONFLICT_PAYOFF_DECOUPLED which is same-scene co-occurrence), repair front-
// loaded (distribution/timing × positive shift × first half — n≥8, ≥4 repair scenes ≥ +0.3, >70% in
// first half while back half has ≥1; bond healing concentrated in the opening of the story while the
// climax zone goes without relational warming; distinct from CONFLICT_REPAIR_CLOSING_ABSENT which
// targets only the closing third, and from ARC_RELATIONAL_FRONT_LOADED which uses a different pass),
// curiosity closing zone absent (zone presence/absence × curiosityDelta × closing third — n≥9, ≥3
// curiosity-positive scenes, none in final structural third; the wondering engine stops before the
// climax; first zone check on the curiosity channel in this pass, distinct from CONFLICT_CLOSING_
// SUSPENSE_VOID and CONFLICT_REPAIR_CLOSING_ABSENT which audit suspense and repair respectively, and
// from CONFLICT_AFTERMATH_CURIOSITY_VOID which is an aftermath not a zone check).
// Wave 604 additions (built on the shared checks library, audit M2.2): OPEN_THREAD_RUPTURE_
// DECOUPLED (co-occurrence/decoupling × unresolvedClues × rupture — first use of unresolvedClues
// anywhere in this 105-rule pass), VISUAL_CONFLICT_ZONE_IMBALANCE (underweight/bloat × visualBeats
// × four structural zones — first use of visualBeats anywhere in this pass), OPEN_THREAD_REPAIR_
// AFTERMATH_VOID (sequence/aftermath × heavy unresolvedClues debt → repair absence).
// Wave 618 additions (built on the shared checks library, audit M2.2): CONFLICT_PAYOFF_STAGING_
// DECOUPLED (co-occurrence/decoupling × payoffSetupIds × visualBeats — first pairing of these two
// lightly-used fields in this 108-rule pass), CONFLICT_PAYOFF_ZONE_IMBALANCE (underweight/bloat ×
// payoffSetupIds × four structural zones — first zone-based check on the payoff channel; Wave 604
// applied this template to visualBeats only), CONFLICT_TURN_STAGING_AFTERMATH_VOID
// (sequence/aftermath × dramaticTurn trigger → visualBeats absence — first pairing of these two
// fields).
// Wave 632 additions (built on the shared checks library, audit M2.2): CONFLICT_HIGHLIGHT_OPEN_
// THREAD_DECOUPLED (co-occurrence/decoupling × dialogueHighlights × unresolvedClues — first
// pairing of these two fields in this 111-rule pass), CONFLICT_OPEN_THREAD_STAGING_AFTERMATH_VOID
// (sequence/aftermath × heavy unresolvedClues debt trigger → visualBeats absence — first pairing
// of these two fields), CONFLICT_DIALOGUE_HIGHLIGHT_ZONE_IMBALANCE (underweight/bloat ×
// dialogueHighlights × four structural zones — Wave 604/618 applied this template to visualBeats
// and payoffSetupIds; dialogueHighlights itself has never been zone-audited here).
// Wave 646 additions (built on the shared checks library, audit M2.2): this 114-rule pass already
// hand-rolls the peak/drought/cluster analytical concepts extensively (ten CONFLICT_PEAK_*_ABSENT
// checks on suspense/emotion/curiosity/dramaticTurn/clock/revelation/payoff/seed/rupture/repair,
// three drought-run checks on repair/revelation/rupture, one zone-cluster on curiosity) — but
// never via the shared checkPeakUncaused/checkDroughtRun/checkZoneCluster helpers, and never on
// the visualBeats/unresolvedClues/dialogueHighlights channels. CONFLICT_STAGING_PEAK_UNCAUSED
// (single-peak isolation/backward-cause × visualBeats magnitude — the scene with the densest
// physical staging has no dramatic turn or revelation in itself or the two scenes before it;
// distinct from the existing CONFLICT_PEAK_*_ABSENT family, which audits whether the peak
// conflict-magnitude scene itself lacks a channel, not whether a physical-staging peak is
// backward-caused), CONFLICT_OPEN_THREAD_DROUGHT_RUN (run-based × unresolvedClues absence — a
// 6+ consecutive-scene stretch with zero outstanding clue-debt while such scenes occur ≥3 times
// elsewhere; the drought-run template applied to a fourth channel after repair/revelation/
// rupture), CONFLICT_HIGHLIGHT_ZONE_CLUSTER (distribution/timing × dialogueHighlights × structural
// thirds — >75% of highlighted-dialogue scenes concentrate in one third; the zone-cluster
// template applied to a second channel after curiosity).
// Wave 660 additions (built on the shared checks library, audit M2.2): CONFLICT_PAYOFF_PEAK_
// UNCAUSED (single-peak isolation/backward-cause × payoffSetupIds magnitude — the scene with the
// most simultaneous thread resolutions has no dramatic turn or revelation in itself or the two
// scenes before it; distinct from CONFLICT_PEAK_PAYOFF_ABSENT [Wave 408], which anchors on the
// peak RUPTURE scene and checks whether it lacks a payoff — this instead anchors on the peak
// PAYOFF scene and asks whether it is backward-caused), CONFLICT_SEED_DROUGHT_RUN (run-based ×
// seededClueIds absence — this pass has extensive seed-channel coverage in decoupling, aftermath-
// void, and peak-absent modes, but seededClueIds itself has never been drought-audited),
// CONFLICT_STAGING_ZONE_CLUSTER (distribution/timing × visualBeats × structural thirds — Wave 646
// applied the peak-uncaused mode to visualBeats; this applies the zone-cluster mode to the same
// channel, a genuinely different question — concentration vs. causal isolation).
// Wave 674 additions (built on the shared checks library, audit M2.2): CONFLICT_CLOCK_DELTA_PEAK_
// UNCAUSED (single-peak isolation/backward-cause × clockDelta magnitude — this pass has extensive
// clockRaised coverage across decoupling, aftermath-void, and peak-absent hand-rolled checks, but
// clockDelta itself has never been backward-cause peak-audited via the shared helper),
// CONFLICT_HIGHLIGHT_DROUGHT_RUN (run-based × dialogueHighlights absence — Wave 646 applied the
// zone-cluster mode to dialogueHighlights; the drought-run mode has never been applied to this
// channel), CONFLICT_OPEN_THREAD_ZONE_CLUSTER (distribution/timing × unresolvedClues × structural
// thirds — Wave 646 applied the drought-run mode to unresolvedClues; the zone-cluster mode has
// never been applied to this channel).
// Wave 688 additions (built on the shared checks library): CONFLICT_HIGHLIGHT_PEAK_UNCAUSED
// (single-peak isolation/backward-cause × dialogueHighlights magnitude — Wave 646 applied the
// zone-cluster mode and Wave 674 applied the drought-run mode to this channel; the backward-cause
// peak mode has never been applied to it), CONFLICT_SEED_ZONE_CLUSTER (distribution/timing ×
// seededClueIds × structural thirds — Wave 660 applied the drought-run mode to seededClueIds; the
// zone-cluster mode has never been applied to this channel despite extensive decoupling/aftermath/
// peak-absent hand-rolled coverage), CONFLICT_STAGING_DROUGHT_RUN (run-based × visualBeats
// absence — Wave 646 applied the peak-uncaused mode and Wave 660 applied the zone-cluster mode
// to this channel; the drought-run mode has never been applied to it).
// Wave 702 additions (built on the shared checks library): CONFLICT_OPEN_THREAD_PEAK_UNCAUSED
// (single-peak isolation/backward-cause × unresolvedClues magnitude — Wave 646 applied the
// drought-run mode and Wave 674 applied the zone-cluster mode to this channel; the backward-cause
// peak mode has never been applied to it, completing the trio), CONFLICT_CLOCK_ZONE_CLUSTER
// (distribution/timing × clockRaised × structural thirds — clockRaised anchors extensive
// hand-rolled aggregate/threshold logic in this pass but has never been zone-cluster-audited via
// the shared library), CONFLICT_RELATIONSHIP_DROUGHT_RUN (run-based × relationshipShifts absence
// — relationshipShifts is this pass's most heavily used field [76 accesses] but has never been
// drought-audited via the shared library).
// Wave 716 additions (built on the shared checks library): CONFLICT_SEED_PEAK_UNCAUSED
// (single-peak isolation/backward-cause × seededClueIds magnitude — Waves 660/688 applied the
// drought-run and zone-cluster modes to seededClueIds; the backward-cause peak mode has never
// been applied to it, completing the trio), CONFLICT_PAYOFF_DROUGHT_RUN (run-based ×
// payoffSetupIds absence — Wave 660 applied the backward-cause peak mode to payoffSetupIds; the
// drought-run mode has never been applied to it), CONFLICT_CLOCK_DELTA_DROUGHT_RUN (run-based ×
// clockDelta>0 absence — Wave 674 applied the backward-cause peak mode and Wave 702 applied the
// zone-cluster mode to clockRaised; clockDelta itself has never been drought-audited).
// Wave 730 additions: CONFLICT_PAYOFF_ZONE_CLUSTER (distribution/timing × payoffSetupIds ×
// structural thirds — Waves 660/716 applied the backward-cause peak and run-based drought modes to
// payoffSetupIds; the zone-cluster mode has never been applied to it, completing the trio),
// CONFLICT_RELATIONSHIP_PEAK_UNCAUSED (single-peak isolation/backward-cause × relationshipShifts
// magnitude — relationshipShifts is this pass's most heavily used field [76+ accesses] and Wave
// 702 applied the run-based drought mode to it; the backward-cause peak mode has never been
// applied to it), CONFLICT_CLOCK_DELTA_ZONE_CLUSTER (distribution/timing × clockDelta>0 presence ×
// structural thirds — Waves 674/716 applied the backward-cause peak and run-based drought modes to
// clockDelta; the zone-cluster mode has never been applied to it, completing the trio).
// Wave 744 additions: CONFLICT_RELATIONSHIP_ZONE_CLUSTER (distribution/timing ×
// relationshipShifts × structural thirds — Waves 702/730 applied the run-based drought and
// backward-cause peak modes to this pass's most heavily used field; the zone-cluster mode has
// never been applied to it, completing the trio), CONFLICT_CLOCK_DROUGHT_RUN (run-based ×
// clockRaised absence — Wave 702 applied the zone-cluster mode to clockRaised; the drought-run
// mode has never been applied to it), CONFLICT_CURIOSITY_PEAK_UNCAUSED (single-peak
// isolation/backward-cause × curiosityDelta magnitude — curiosityDelta has only ever anchored
// co-occurrence/decoupling, zone-presence/absence, front-loaded, and zone-cluster checks; the
// backward-cause peak-isolation mode has never been applied to it).
// Wave 758 additions: CONFLICT_CURIOSITY_DROUGHT_RUN (run-based × curiosityDelta>0 absence —
// Waves 702/744 applied the zone-cluster and backward-cause peak modes to curiosityDelta; the
// drought-run mode has never been applied to it, completing the trio), CONFLICT_REVELATION_ZONE_
// CLUSTER (distribution/timing × revelation × structural thirds — Wave 671 applied the run-based
// drought mode to revelation != null [CONFLICT_REVELATION_DROUGHT_RUN]; the zone-cluster mode has
// never been applied to it), CONFLICT_STAKES_DROUGHT_RUN (run-based × purpose === 'raise_stakes'
// absence — purpose has only ever anchored a hand-rolled co-occurrence/decoupling check
// [stakesScenes299]; the run-based drought mode has never been applied to it).
// Wave 772 additions: CONFLICT_STAKES_ZONE_CLUSTER (distribution/timing × purpose ===
// 'raise_stakes' presence × structural thirds — Wave 758's CONFLICT_STAKES_DROUGHT_RUN applied
// the run-based drought mode to this value; the zone-cluster mode has never been applied to it,
// completing the trio), CONFLICT_REVELATION_PEAK_UNCAUSED (backward-cause ×
// revelation-as-magnitude × 2-scene lookback — CONFLICT_REVELATION_DROUGHT_RUN [Wave 671] and
// CONFLICT_REVELATION_ZONE_CLUSTER [Wave 758] completed the drought/cluster half of the trio; the
// existing CONFLICT_PEAK_REVELATION_ABSENT audits whether revelation co-occurs with the peak
// RUPTURE scene, a different signal's peak — the backward-cause peak mode has never been applied
// to revelation's own peak scene. hasCause here deliberately references only dramaticTurn, never
// revelation, to avoid a circular/self-referential audit), CONFLICT_EMOTION_ZONE_CLUSTER
// (distribution/timing × emotionalShift !== 'neutral' presence × structural thirds —
// emotionalShift as a primary signal has only ever anchored co-occurrence-decoupling and
// aftermath-void checks in this pass; none of the three shared-library trio modes has ever been
// applied to it).
// Wave 786 additions: CONFLICT_EMOTION_DROUGHT_RUN (run-based × emotionalShift !== 'neutral'
// absence — Wave 772 applied the zone-cluster mode to this signal; the drought-run mode has never
// been applied to it, completing the trio), CONFLICT_TURN_ZONE_CLUSTER (distribution/timing ×
// dramaticTurn !== 'nothing' presence × structural thirds — dramaticTurn as a primary signal has
// only ever anchored co-occurrence-decoupling checks [CONFLICT_DRAMATIC_TURN_VOID] in this pass;
// none of the three shared-library trio modes has ever been applied to it), CONFLICT_TURN_
// DROUGHT_RUN (run-based × dramaticTurn !== 'nothing' absence — completing 2 of 3 slots for
// dramaticTurn alongside the zone-cluster mode added in this same wave).
// Wave 800 additions: CONFLICT_NEGATIVE_EMOTION_ZONE_CLUSTER (distribution/timing ×
// emotionalShift === 'negative' × structural thirds — distinct from the existing
// NEGATIVE_SPIRAL_UNBROKEN [Wave 285], which is a PRESENCE-run of 4+ consecutive negative scenes,
// not a thirds-based concentration test; the general cluster mode has never been applied to this
// specific valence), CONFLICT_NEGATIVE_EMOTION_DROUGHT_RUN (run-based × emotionalShift ===
// 'negative' absence — distinct from NEGATIVE_SPIRAL_UNBROKEN's presence-run in the same way; an
// absence run of 6+ scenes with no negative beat is the mirror-image claim, completing 2 of 3
// slots for this valence alongside the zone-cluster mode added in this same wave),
// CONFLICT_INTRODUCE_CONFLICT_ZONE_CLUSTER (distribution/timing × purpose ===
// 'introduce_conflict' × structural thirds — this purpose value has never been referenced
// anywhere in this pass despite being thematically central to it; none of the three
// shared-library trio modes has ever been applied to it).
// Wave 814 additions: CONFLICT_INTRODUCE_CONFLICT_DROUGHT_RUN (run-based × purpose ===
// 'introduce_conflict' absence — completing 2 of 3 slots for this purpose value alongside the
// zone-cluster mode added in Wave 800; peak mode conventionally skipped for this categorical
// field), CONFLICT_CHARACTER_MOMENT_ZONE_CLUSTER (distribution/timing × purpose ===
// 'character_moment' × structural thirds — this purpose value has never been referenced
// anywhere in this pass; none of the three shared-library trio modes has ever been applied to
// it), CONFLICT_CHARACTER_MOMENT_DROUGHT_RUN (run-based × purpose === 'character_moment'
// absence — completing 2 of 3 slots for this purpose value alongside the zone-cluster mode
// added in this same wave; peak mode conventionally skipped for this categorical field).
//
// Wave 828 additions: CONFLICT_TURNING_POINT_ZONE_CLUSTER (distribution/timing × purpose ===
// 'turning_point' × structural thirds — this purpose value has never been referenced anywhere in
// this pass; distinct from CONFLICT_TURN_ZONE_CLUSTER [Wave 786], which audits the dramaticTurn
// free-text field, not this purpose enum value), CONFLICT_TURNING_POINT_DROUGHT_RUN (run-based ×
// purpose === 'turning_point' absence — completes 2 of 3 slots for this purpose value alongside
// the zone-cluster mode added in this same wave; peak mode conventionally skipped for this
// categorical field), CONFLICT_POSITIVE_EMOTION_ZONE_CLUSTER (distribution/timing ×
// emotionalShift === 'positive' × structural thirds — mirrors the negative-valence trio completed
// in Wave 800; the positive valence has never been isolated by any of the three shared-library
// trio modes in this pass).
//
// Wave 842 additions: CONFLICT_POSITIVE_EMOTION_DROUGHT_RUN (run-based × emotionalShift ===
// 'positive' absence — completes 2 of 3 slots for this valence alongside the zone-cluster mode
// added in Wave 828; peak mode conventionally skipped for this categorical field),
// CONFLICT_ESTABLISH_WORLD_ZONE_CLUSTER (distribution/timing × purpose === 'establish_world' ×
// structural thirds — this purpose value has never been referenced anywhere in this pass; a
// virgin field), CONFLICT_CLIMAX_ZONE_CLUSTER (distribution/timing × purpose === 'climax' ×
// structural thirds — likewise a virgin field, never referenced in this pass before).
//
// Wave 856 additions: CONFLICT_CLIMAX_DROUGHT_RUN (run-based × purpose === 'climax' absence —
// completes 2 of 3 slots for this purpose value alongside the zone-cluster mode added in Wave
// 842; peak mode conventionally skipped for this categorical field),
// CONFLICT_ESTABLISH_WORLD_DROUGHT_RUN (run-based × purpose === 'establish_world' absence —
// completes 2 of 3 slots for this purpose value alongside the zone-cluster mode added in Wave
// 842; peak mode conventionally skipped for this categorical field),
// CONFLICT_RESOLUTION_ZONE_CLUSTER (distribution/timing × purpose === 'resolution' × structural
// thirds — distinct from CONFLICT_RESOLUTION_PREMATURE, which checks timing relative to the
// climax rather than distributional clustering; a virgin standalone signal for this purpose
// value).
//
// Wave 870 additions: CONFLICT_RESOLUTION_DROUGHT_RUN (run-based x purpose === 'resolution'
// absence -- completes 2 of 3 slots for this purpose value alongside the zone-cluster mode
// added in Wave 856; distinct from CONFLICT_RESOLUTION_PREMATURE, which checks timing relative
// to the climax rather than sustained absence; peak mode conventionally skipped for this
// categorical field), CONFLICT_COMPLICATE_ZONE_CLUSTER (distribution/timing x purpose ===
// 'complicate' x structural thirds -- this purpose value has never been referenced anywhere in
// this pass; a virgin field), CONFLICT_COMPLICATE_DROUGHT_RUN (run-based x purpose ===
// 'complicate' absence -- completes 2 of 3 slots for this purpose value alongside the
// zone-cluster mode added in this same wave; peak mode conventionally skipped for this
// categorical field).
//
// Wave 884 additions: no purpose value has ever been audited by the distinct 4-zone
// checkZoneImbalance mode in this pass (only visualBeats, payoffSetupIds, and dialogueHighlights
// had). This wave applies it to three purpose values that already have complete 3-zone/run-based
// trios via checkZoneCluster/checkDroughtRun: CONFLICT_CLIMAX_ZONE_IMBALANCE (purpose ===
// 'climax'), CONFLICT_ESTABLISH_WORLD_ZONE_IMBALANCE (purpose === 'establish_world'), and
// CONFLICT_RESOLUTION_ZONE_IMBALANCE (purpose === 'resolution' -- distinct from
// CONFLICT_RESOLUTION_PREMATURE, which checks timing relative to the climax, not distributional
// zone imbalance).
//
// Wave 898 additions: purpose === 'revelation' has never been referenced anywhere in this pass
// (the pre-existing CONFLICT_REVELATION_DROUGHT_RUN/CONFLICT_REVELATION_ZONE_CLUSTER audit the
// separate revelation string|null field, not this purpose enum value) -- a genuinely virgin field
// for all three shared-library trio modes. This wave adds CONFLICT_REVELATION_PURPOSE_ZONE_CLUSTER
// and CONFLICT_REVELATION_PURPOSE_DROUGHT_RUN (peak mode conventionally skipped for this
// categorical field), plus CONFLICT_TURNING_POINT_ZONE_IMBALANCE, continuing the checkZoneImbalance
// rollout begun in Wave 884: purpose === 'turning_point' already has a complete 3-zone/run-based
// trio (CONFLICT_TURNING_POINT_ZONE_CLUSTER, CONFLICT_TURNING_POINT_DROUGHT_RUN) but has never been
// audited by the 4-zone bloat+empty-zone mode.
//
// Wave 912 additions: continuing the checkZoneImbalance rollout begun in Wave 884, this wave
// applies the 4-zone bloat+empty-zone mode to three more purpose values that each already have a
// complete 3-zone/run-based trio (checkZoneCluster + checkDroughtRun) but have never been audited
// by it: CONFLICT_COMPLICATE_ZONE_IMBALANCE (purpose === 'complicate'),
// CONFLICT_INTRODUCE_CONFLICT_ZONE_IMBALANCE (purpose === 'introduce_conflict'), and
// CONFLICT_CHARACTER_MOMENT_ZONE_IMBALANCE (purpose === 'character_moment').
//
// Wave 926 additions: continuing the checkZoneImbalance rollout, this wave applies the 4-zone
// bloat+empty-zone mode to three more signals that each already have a complete 3-zone/run-based
// trio but had never been audited by it: CONFLICT_STAKES_ZONE_IMBALANCE (purpose === 'raise_stakes'),
// CONFLICT_REVELATION_PURPOSE_ZONE_IMBALANCE (purpose === 'revelation', whose trio was completed in
// Wave 898), and CONFLICT_NEGATIVE_EMOTION_ZONE_IMBALANCE (emotionalShift === 'negative', a valence
// signal with a complete 3-zone/run trio).
//
// Wave 940 additions: continuing the checkZoneImbalance rollout, this wave extends the 4-zone mode
// to three more signals that each already have a complete 3-zone/run-based trio but had never been
// audited by it: CONFLICT_POSITIVE_EMOTION_ZONE_IMBALANCE (emotionalShift === 'positive'), CONFLICT_
// CURIOSITY_ZONE_IMBALANCE (curiosityDelta > 0), and CONFLICT_OPEN_THREAD_ZONE_IMBALANCE
// (unresolvedClues.length > 0).
// Wave 954 additions: with conflict's valence/delta/clue-array/purpose signals now saturated by the
// 4-zone mode, this wave audits three remaining trio-complete signals spanning three distinct
// classes: CONFLICT_RELATIONSHIP_ZONE_IMBALANCE (relationshipShifts array), CONFLICT_TURN_ZONE_
// IMBALANCE (dramaticTurn !== 'nothing' categorical), and CONFLICT_REVELATION_ZONE_IMBALANCE
// (revelation string field, != null — distinct from the purpose-enum CONFLICT_REVELATION_PURPOSE one).
// Wave 968 additions: auditing the three remaining cleanly-defined trio-complete signals in this pass,
// spanning three distinct classes: CONFLICT_SEED_ZONE_IMBALANCE (seededClueIds array, distinct from the
// audited payoff/open-thread arrays), CONFLICT_CLOCK_DELTA_ZONE_IMBALANCE (clockDelta > 0 — a delta
// distinct from Wave 940's curiosity one), and CONFLICT_CLOCK_ZONE_IMBALANCE (clockRaised boolean —
// whether a ticking clock is introduced at all, distinct from the numeric clockDelta above).
// Wave 982 additions: auditing the last two clean zone-imbalance candidates in this pass —
// CONFLICT_EMOTION_ZONE_IMBALANCE (emotionalShift !== 'neutral', any-direction valence) and
// CONFLICT_HIGHLIGHT_ZONE_IMBALANCE (dialogueHighlights array) — plus, since the zone-imbalance mode
// is now all but exhausted, one aftermath-void pairing via the shared checkAftermathVoid helper:
// CONFLICT_STAKES_CURIOSITY_AFTERMATH_VOID (raise_stakes → curiosity), the first use of raise_stakes
// as an aftermath-void TRIGGER in this pass.
// Wave 996 additions: zone-imbalance is now fully exhausted (the only remaining cluster+drought
// pair, CONFLICT_STAGING, has inconsistent predicates — >=2 vs >0 visualBeats — confirmed again
// this wave, same finding as Wave 982). This wave pivots entirely to the sequence/aftermath mode
// with three fresh trigger/aftermath pairings via checkAftermathVoid: CONFLICT_STAKES_SUSPENSE_
// AFTERMATH_VOID (raise_stakes, previously only paired with curiosityDelta in Wave 982, now paired
// with suspenseDelta), CONFLICT_PAYOFF_EMOTIONAL_AFTERMATH_VOID (payoffSetupIds, the first use of
// this field as a checkAftermathVoid TRIGGER in this pass — it has only appeared as an aftermath
// channel or in other analytical modes before now), and CONFLICT_OPEN_THREAD_CURIOSITY_AFTERMATH_
// VOID (heavy unresolvedClues debt, already a trigger paired with relationshipShifts and
// visualBeats, now paired with curiosityDelta for a third consequence channel).
// Wave 1010 additions: this wave gives three more triggers a fresh consequence channel:
// CONFLICT_TURN_CURIOSITY_AFTERMATH_VOID (dramaticTurn, previously only paired with visualBeats,
// now paired with curiosityDelta), CONFLICT_PAYOFF_SUSPENSE_AFTERMATH_VOID (payoffSetupIds,
// previously only paired with emotionalShift, now paired with suspenseDelta), and CONFLICT_STAKES_
// EMOTIONAL_AFTERMATH_VOID (raise_stakes, previously paired with curiosityDelta and suspenseDelta,
// now paired with emotionalShift for a third channel).
// Wave 1024 additions: three more fresh channels for existing triggers: CONFLICT_STAKES_RELATIONAL_
// AFTERMATH_VOID (raise_stakes, previously paired with curiosityDelta/suspenseDelta/emotionalShift,
// now a fourth channel with relationshipShifts), CONFLICT_PAYOFF_CURIOSITY_AFTERMATH_VOID
// (payoffSetupIds, previously paired with emotionalShift/suspenseDelta, now a third channel with
// curiosityDelta), and CONFLICT_TURN_EMOTIONAL_AFTERMATH_VOID (dramaticTurn, previously paired
// with visualBeats/curiosityDelta, now a third channel with emotionalShift).
// Wave 1038 additions: with raise_stakes now at four channels, this wave targets the less-
// saturated triggers instead: CONFLICT_OPEN_THREAD_EMOTIONAL_AFTERMATH_VOID (heavy unresolvedClues
// debt, previously paired with relationshipShifts/visualBeats/curiosityDelta, now a fourth channel
// with emotionalShift), CONFLICT_TURN_RELATIONAL_AFTERMATH_VOID (dramaticTurn, previously paired
// with visualBeats/curiosityDelta/emotionalShift, now a fourth channel with relationshipShifts),
// and CONFLICT_PAYOFF_RELATIONAL_AFTERMATH_VOID (payoffSetupIds, previously paired with
// emotionalShift/suspenseDelta/curiosityDelta, now a fourth channel with relationshipShifts).
// Wave 1052 additions: with all four main triggers (raise_stakes, payoffSetupIds, dramaticTurn,
// unresolvedClues) now at four checkAftermathVoid channels each, this wave extends three of them
// to a fifth channel using fields never paired with them before: CONFLICT_STAKES_DIALOGUE_
// HIGHLIGHT_AFTERMATH_VOID (raise_stakes, first pairing with dialogueHighlights), CONFLICT_PAYOFF_
// STAGING_AFTERMATH_VOID (payoffSetupIds, first pairing with visualBeats — dramaticTurn and
// unresolvedClues already carry this channel), and CONFLICT_OPEN_THREAD_DIALOGUE_HIGHLIGHT_
// AFTERMATH_VOID (heavy unresolvedClues debt, first pairing with dialogueHighlights).
// Wave 1066 additions: raise_stakes, payoffSetupIds, and heavy unresolvedClues debt each reach
// full six-channel saturation: CONFLICT_STAKES_STAGING_AFTERMATH_VOID (raise_stakes, previously
// paired with curiosityDelta/suspenseDelta/emotionalShift/relationshipShifts/dialogueHighlights,
// now also paired with visualBeats — its only remaining standard channel), CONFLICT_PAYOFF_
// DIALOGUE_HIGHLIGHT_AFTERMATH_VOID (payoffSetupIds, previously paired with emotionalShift/
// suspenseDelta/curiosityDelta/relationshipShifts/visualBeats, now also paired with
// dialogueHighlights — its only remaining standard channel), and CONFLICT_OPEN_THREAD_SUSPENSE_
// AFTERMATH_VOID (heavy unresolvedClues debt, previously paired with relationshipShifts/
// visualBeats/curiosityDelta/emotionalShift/dialogueHighlights, now also paired with
// suspenseDelta — its only remaining standard channel).
// Wave 1080 additions: with raise_stakes, payoffSetupIds, and heavy unresolvedClues debt all now
// fully saturated, this wave closes out dramaticTurn's remaining two channels — CONFLICT_TURN_
// SUSPENSE_AFTERMATH_VOID (previously paired with visualBeats/curiosityDelta/emotionalShift/
// relationshipShifts, now also paired with suspenseDelta) and CONFLICT_TURN_DIALOGUE_HIGHLIGHT_
// AFTERMATH_VOID (now also paired with dialogueHighlights), bringing all four main triggers to
// full six-channel saturation. The third check, CONFLICT_SEED_CURIOSITY_AFTERMATH_VOID, gives
// seededClueIds its first checkAftermathVoid-based sequence/aftermath pairing with curiosityDelta
// — distinct from the existing hand-rolled CONFLICT_SEED_SUSPENSE_AFTERMATH_VOID (Wave 590, same
// trigger paired with suspenseDelta via a different implementation).
// Wave 1094 additions: with all four main triggers fully saturated since Wave 1080, this wave
// continues building out seededClueIds' checkAftermathVoid channel set (currently just
// curiosityDelta, plus the separately-implemented hand-rolled CONFLICT_SEED_SUSPENSE_AFTERMATH_
// VOID from Wave 590) — CONFLICT_SEED_EMOTIONAL_AFTERMATH_VOID (emotionalShift),
// CONFLICT_SEED_RELATIONAL_AFTERMATH_VOID (relationshipShifts), and CONFLICT_SEED_STAGING_
// AFTERMATH_VOID (visualBeats) give this trigger three fresh channels.
// Wave 1108 additions: CONFLICT_SEED_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID gives seededClueIds its
// sixth and final channel (previously paired with curiosityDelta/emotionalShift/
// relationshipShifts/visualBeats, plus the hand-rolled Wave-590 suspenseDelta pairing, now also
// paired with dialogueHighlights), completing full saturation for all five of this pass's
// tracked triggers. With those exhausted, this wave introduces two triggers as fresh
// checkAftermathVoid subjects for the first time — revelation and clockRaised have only ever
// anchored distribution/timing (zone-imbalance/zone-cluster) checks here, never sequence/
// aftermath: CONFLICT_REVELATION_CURIOSITY_AFTERMATH_VOID pairs revelation with curiosityDelta,
// and CONFLICT_CLOCK_SUSPENSE_AFTERMATH_VOID pairs clockRaised with suspenseDelta.
// Wave 1122 additions: revelation and clockRaised each had exactly one checkAftermathVoid
// channel as of Wave 1108. CONFLICT_REVELATION_EMOTIONAL_AFTERMATH_VOID and CONFLICT_
// REVELATION_SUSPENSE_AFTERMATH_VOID give revelation its second and third channels
// (emotionalShift, suspenseDelta); CONFLICT_CLOCK_CURIOSITY_AFTERMATH_VOID gives clockRaised
// its second channel (curiosityDelta) — distinct from the non-standard hand-rolled
// CONFLICT_CLOCK_AFTERMATH_VOID (Wave 450: compound negative-conflict-signal channel, not a
// positive curiosityDelta rise) and CONFLICT_CLOCK_TURN_AFTERMATH_VOID (Wave 590:
// dramaticTurn as the aftermath channel, not curiosityDelta).

import type { PassInput, PassResult, RevisionIssue } from './types.ts';
import { rewritePass } from '../rewrite.ts';
import { checkCoOccurrenceDecoupled, checkZoneImbalance, checkAftermathVoid, checkPeakUncaused, checkDroughtRun, checkZoneCluster, FOUR_ZONE_NAMES } from './lib/checks.ts';

export async function conflictPass(input: PassInput): Promise<PassResult> {
  const { fountain, records, structure, approvedSpans } = input;
  const issues: RevisionIssue[] = [];

  // ── Flat suspense arc ─────────────────────────────────────────────────────
  if (!structure.escalating && records.length >= 5) {
    issues.push({
      location: 'Overall conflict arc',
      rule: 'FLAT_SUSPENSE_ARC',
      description: `Average suspense in the second half (${structure.avgSuspensePerScene}) does not exceed the first half — conflict fails to escalate`,
      severity: 'major',
      suggestedFix: 'Increase the stakes in the second half by having a character lose something they cannot recover easily',
    });
  }

  // ── Reversal density too low ──────────────────────────────────────────────
  if (structure.reversalDensity === 0 && records.length >= 8) {
    issues.push({
      location: 'Conflict layer',
      rule: 'NO_REVERSALS_LONG_STORY',
      description: 'An 8+ scene story with zero dramatic reversals lacks conflict texture',
      severity: 'critical',
      suggestedFix: 'Add at least one scene where a character\'s plan fails or backfires unexpectedly',
    });
  }

  // ── Open clues without tension ────────────────────────────────────────────
  if (structure.openClues > 3) {
    issues.push({
      location: 'Conflict — unresolved threads',
      rule: 'TOO_MANY_OPEN_CONFLICTS',
      description: `${structure.openClues} planted conflicts/clues remain unresolved — the story feels scattered rather than escalating`,
      severity: 'major',
      suggestedFix: 'Converge 2-3 open threads into a single confrontation scene',
    });
  }

  // ── Clock pressure without confrontation ─────────────────────────────────
  // Only count scenes with meaningful clock pressure (delta > 1) to avoid flagging minor raises.
  const clockRaisedScenes = records.filter(r => (r.clockDelta ?? (r.clockRaised ? 1.1 : 0)) > 1).length;
  const reversalScenes = records.filter(r => r.suspenseDelta < -1).length;
  if (clockRaisedScenes >= 3 && reversalScenes === 0) {
    issues.push({
      location: 'Conflict escalation',
      rule: 'CLOCK_WITHOUT_CONFRONTATION',
      description: `Clock is raised significantly ${clockRaisedScenes} times but no confrontation/reversal follows — ticking clocks need detonation`,
      severity: 'major',
      suggestedFix: 'Add a scene where the clock expires and forces a confrontation between opposing characters',
    });
  }

  // ── Approaching climax without intensification ────────────────────────────
  if (structure.approachingClimax) {
    const recentRecords = records.slice(-3);
    const recentSuspense = recentRecords.map(r => r.suspenseDelta);
    const avgRecentSuspense = recentSuspense.reduce((a, b) => a + b, 0) / Math.max(recentSuspense.length, 1);
    if (avgRecentSuspense < structure.avgSuspensePerScene) {
      issues.push({
        location: 'Pre-climax scenes (last 3)',
        rule: 'CLIMAX_APPROACH_FLAT',
        description: 'Story is approaching climax but recent scenes have below-average suspense — the approach lacks urgency',
        severity: 'major',
        suggestedFix: 'Accelerate the final act with shorter scenes and higher-stakes confrontations',
      });
    }
  }

  // ── Wave 144: Escalation plateau & confrontation quality ──────────────────

  // ESCALATION_PLATEAU: Suspense builds to a peak mid-story then plateaus or
  // drops instead of continuing to rise toward climax. The conflict peaked too
  // early and can't be recaptured.
  if (records.length >= 8) {
    const mid = Math.floor(records.length / 2);
    const firstHalf = records.slice(0, mid);
    const secondHalf = records.slice(mid);

    const firstHalfMax = Math.max(...firstHalf.map(r => r.suspenseDelta), 0);
    const secondHalfAvg = secondHalf.length > 0
      ? secondHalf.reduce((s, r) => s + r.suspenseDelta, 0) / secondHalf.length
      : 0;

    // If suspense peaks in first half but second half average is lower, it's plateaued
    if (firstHalfMax > 3 && secondHalfAvg < firstHalfMax * 0.7) {
      issues.push({
        location: 'Mid-story conflict',
        rule: 'ESCALATION_PLATEAU',
        description: `Conflict peaks at suspense ${firstHalfMax.toFixed(1)} in the first half but averages only ${secondHalfAvg.toFixed(1)} in the second half — escalation plateaus instead of building`,
        severity: 'major',
        suggestedFix: 'Either reduce the mid-story peak so the final act can surpass it, or add new complications in the second half that drive suspense even higher',
      });
    }
  }

  // CONFRONTATION_AVOIDANCE: Characters in conflict (negative relationship shifts)
  // but never meet in a scene with dialogue — they avoid direct confrontation.
  // This weakens the conflict's narrative impact.
  if (records.length >= 5) {
    const hasNegativeShifts = records.some(r => {
      const negativeShifts = (r.relationshipShifts ?? []).filter(s => s.amount < -0.5);
      return negativeShifts.length > 0;
    });

    if (hasNegativeShifts) {
      // Check if any scene with negative shift also has dialogue highlights (confrontation)
      const hasDirectConfrontation = records.some(r => {
        const negativeShifts = (r.relationshipShifts ?? []).filter(s => s.amount < -0.5);
        const hasDialogue = (r.dialogueHighlights ?? []).length > 0;
        return negativeShifts.length > 0 && hasDialogue;
      });

      if (!hasDirectConfrontation) {
        issues.push({
          location: 'Relationship conflict',
          rule: 'CONFRONTATION_AVOIDANCE',
          description: `Characters have negative relationship shifts but never appear in a scene together with dialogue — the conflict is stated but not enacted on stage`,
          severity: 'major',
          suggestedFix: 'Add a direct confrontation scene where conflicted characters face each other and their tension becomes verbal or physical action',
        });
      }
    }
  }

  // CONFLICT_FATIGUE: Too many reversals in quick succession (3+ reversals in
  // consecutive or near-consecutive scenes) causes audience whiplash — tension
  // oscillates too rapidly without settling, exhausting the viewer.
  if (records.length >= 8) {
    let reversalStreak = 0;
    let streakStart = -1;
    for (let i = 0; i < records.length; i++) {
      const r = records[i];
      const isReversal = r.suspenseDelta < -1;
      if (isReversal) {
        if (reversalStreak === 0) streakStart = i;
        reversalStreak++;
      } else if (i > streakStart + 1 && reversalStreak < 3) {
        // Break the streak if too much non-reversal space
        reversalStreak = 0;
      }

      if (reversalStreak === 3) {
        issues.push({
          location: `Scenes ${streakStart}–${i}`,
          rule: 'CONFLICT_FATIGUE',
          description: `Three reversals in quick succession (Scenes ${streakStart}-${i}) — the audience experiences whiplash from rapid oscillation without settling`,
          severity: 'minor',
          suggestedFix: 'Space reversals further apart or let one reversal settle with a scene of consequence before introducing the next',
        });
        reversalStreak = 0; // reset to avoid duplicate fires
      }
    }
  }

  // ── Wave 158: Threat amnesia, antagonist vanish, single-register conflict ─────

  // THREAT_AMNESIA: A clock is raised in Act 1 (first 25%) but never raised again
  // in the second half (from 50% onward). The urgency that launched the story is
  // abandoned — the audience forgets what's at stake. Requires 8+ scenes.
  if (records.length >= 8) {
    const act1Zone = Math.floor(records.length * 0.25);
    const secondHalfStart = Math.floor(records.length * 0.5);

    const clockInAct1 = records.slice(0, act1Zone).some(r => r.clockRaised);
    const clockInSecondHalf = records.slice(secondHalfStart).some(r => r.clockRaised);

    if (clockInAct1 && !clockInSecondHalf) {
      issues.push({
        location: `Act 1–Act 2 clock gap (Scenes ${act1Zone}–${records.length - 1})`,
        rule: 'THREAT_AMNESIA',
        description: `A clock is raised in Act 1 but no clock pressure appears in the second half (Scenes ${secondHalfStart}+) — the external threat that launched the story is forgotten, and stakes evaporate`,
        severity: 'major',
        suggestedFix: 'Re-invoke the original threat in Act 2b with an escalation (a closer deadline, a new consequence, or a complication that restores urgency)',
      });
    }
  }

  // ANTAGONIST_VANISH: All reversals (suspenseDelta < -1) occur before the 60%
  // mark, with none after. The antagonistic force is active in the first half but
  // passive or absent as the story approaches the climax — the protagonist faces
  // a depleted opposition in the final act.
  if (records.length >= 8) {
    const splitPoint = Math.floor(records.length * 0.6);
    const reversalsInFirst = records.slice(0, splitPoint).filter(r => r.suspenseDelta < -1).length;
    const reversalsInLast = records.slice(splitPoint).filter(r => r.suspenseDelta < -1).length;

    if (reversalsInFirst >= 2 && reversalsInLast === 0) {
      issues.push({
        location: `Late conflict (Scenes ${splitPoint}–${records.length - 1})`,
        rule: 'ANTAGONIST_VANISH',
        description: `${reversalsInFirst} reversals occur before Scene ${splitPoint} but none after — the antagonist's active opposition evaporates before the climax. The protagonist wins the finale against a passive opponent.`,
        severity: 'major',
        suggestedFix: 'Add at least one reversal or direct antagonistic action in the final 40% — the protagonist must face active opposition in the climax, not just the aftermath of it',
      });
    }
  }

  // SINGLE_REGISTER_CONFLICT: All relationship shifts use the same dimension
  // (e.g., only 'trust', only 'power'). Real relationships operate on multiple
  // axes. Single-dimension conflict produces thin drama where every scene feels
  // like a repeat of the same relational beat. Requires 6+ scenes, 4+ shifts.
  if (records.length >= 6) {
    const allShifts = records.flatMap(r => r.relationshipShifts ?? []);
    if (allShifts.length >= 4) {
      const dimensions = new Set(allShifts.map(s => s.dimension));
      if (dimensions.size === 1) {
        const [onlyDim] = dimensions;
        issues.push({
          location: 'Relationship conflict layer',
          rule: 'SINGLE_REGISTER_CONFLICT',
          description: `All ${allShifts.length} relationship shifts use the same dimension ("${onlyDim}") — conflict operates on a single axis. Every relational scene delivers the same beat.`,
          severity: 'minor',
          suggestedFix: `Introduce a second conflict dimension (e.g., if all shifts are "${onlyDim}", add scenes that shift power, loyalty, or affection) to give the relationships texture and make each confrontation feel distinct`,
        });
      }
    }
  }

  // ── Wave 169: Deadline absence, low-stakes conflict, interpersonal peak timing ──

  // CONFLICT_WITHOUT_DEADLINE: 5+ conflict scenes (negative shifts or reversals)
  // but no clock raised anywhere. Interpersonal conflict without a deadline can be
  // deferred indefinitely — nothing forces the characters' hands.
  if (records.length >= 6) {
    const conflictSceneCount = records.filter(r => {
      const hasNegShift = (r.relationshipShifts ?? []).some(s => s.amount < -0.3);
      const isReversal = r.suspenseDelta < -1;
      return hasNegShift || isReversal;
    }).length;
    const hasAnyClockRaised = records.some(r => r.clockRaised);
    if (conflictSceneCount >= 5 && !hasAnyClockRaised) {
      issues.push({
        location: 'Conflict architecture',
        rule: 'CONFLICT_WITHOUT_DEADLINE',
        description: `${conflictSceneCount} conflict scenes with no clock pressure anywhere — all conflict is interpersonal with no external urgency forcing it to a head`,
        severity: 'minor',
        suggestedFix: 'Add at least one external clock: a deadline, a closing window, or a consequence that expires. A ticking clock transforms interpersonal friction into unavoidable confrontation.',
      });
    }
  }

  // LOW_STAKES_CONFLICT: The largest relationship shift magnitude is below 0.4 —
  // all conflict is minor. No scene creates a significant rupture in any relationship;
  // the story operates at a perpetually low emotional temperature.
  if (records.length >= 6) {
    const allShifts2 = records.flatMap(r => r.relationshipShifts ?? []);
    if (allShifts2.length >= 4) {
      const maxMagnitude = Math.max(...allShifts2.map(s => Math.abs(s.amount)));
      if (maxMagnitude < 0.4) {
        issues.push({
          location: 'Relationship conflict layer',
          rule: 'LOW_STAKES_CONFLICT',
          description: `Largest relationship shift is only ${maxMagnitude.toFixed(2)} — all ${allShifts2.length} shifts are minor. No scene delivers a high-magnitude rupture or bond.`,
          severity: 'major',
          suggestedFix: 'At least one scene must deliver a shift ≥0.5 in magnitude: a betrayal, a rescue, or an act of devotion that irreversibly changes a relationship',
        });
      }
    }
  }

  // INTERPERSONAL_PEAK_TOO_EARLY: The scene with the most intense negative
  // relationship shift (abs highest) occurs before the 60% mark. The relational
  // climax passes before the dramatic climax — characters are partially reconciled
  // when they should be at maximum opposition.
  if (records.length >= 8) {
    const negShiftScenes: Array<{ sceneIdx: number; amount: number }> = [];
    for (const r of records) {
      for (const shift of r.relationshipShifts ?? []) {
        if (shift.amount < 0) negShiftScenes.push({ sceneIdx: r.sceneIdx, amount: shift.amount });
      }
    }
    if (negShiftScenes.length >= 3) {
      const peakShift = negShiftScenes.reduce((worst, s) => s.amount < worst.amount ? s : worst);
      const climaxZone = Math.floor(records.length * 0.6);
      if (peakShift.sceneIdx < climaxZone && peakShift.amount < -0.4) {
        issues.push({
          location: `Scene ${peakShift.sceneIdx} (relational peak)`,
          rule: 'INTERPERSONAL_PEAK_TOO_EARLY',
          description: `The most damaging relationship shift (${peakShift.amount.toFixed(2)}) occurs at Scene ${peakShift.sceneIdx} — ${Math.round(peakShift.sceneIdx / records.length * 100)}% through the story, before the climax zone (Scene ${climaxZone}+). The relational conflict peaks too early.`,
          severity: 'major',
          suggestedFix: 'Reserve the most damaging relational rupture for the climax or just before it. Maximum interpersonal damage should coincide with maximum dramatic stakes.',
        });
      }
    }
  }

  // ── Wave 183: Reversal vacuum, Act 1 conflict absent, convergence absent ──

  // REVERSAL_WITHOUT_CONSEQUENCE: A reversal (suspenseDelta < -1) is followed by
  // two consecutive flat scenes — no emotional reaction, no clock, no relational
  // movement. The blow lands in a dramatic vacuum and the story absorbs it without
  // ripple, making the reversal feel inert rather than pivotal.
  if (records.length >= 6) {
    for (let i = 0; i < records.length - 2; i++) {
      if (records[i].suspenseDelta >= -1) continue;
      const afterScenes = records.slice(i + 1, i + 3);
      const isVacuum = afterScenes.length === 2 && afterScenes.every(a =>
        a.emotionalShift === 'neutral' &&
        !a.clockRaised &&
        (a.relationshipShifts ?? []).every(s => Math.abs(s.amount) < 0.3) &&
        a.suspenseDelta <= 1,
      );
      if (isVacuum) {
        issues.push({
          location: `Scene ${records[i].sceneIdx} (reversal)`,
          rule: 'REVERSAL_WITHOUT_CONSEQUENCE',
          description: `The reversal at Scene ${records[i].sceneIdx} (suspense drop: ${records[i].suspenseDelta.toFixed(1)}) lands in a dramatic vacuum — the next two scenes are emotionally flat with no clock, no relationship impact, and no causal reaction.`,
          severity: 'minor',
          suggestedFix: 'A reversal must ripple forward: the scene after a reversal should register its impact through emotional reaction, relationship strain, or an accelerating clock. Let the hit land.',
        });
        break;
      }
    }
  }

  // CONFLICT_ACT1_ABSENT: The entire Act 1 (first 25%) contains no conflict
  // signal — no clock raised, no reversal-level suspense, no negative relationship
  // shift. The story opens without any tension hook; the audience has nothing at
  // stake and no reason to fear loss.
  if (records.length >= 8) {
    const act1End = Math.floor(records.length * 0.25);
    const act1Records = records.slice(0, act1End);
    if (act1Records.length >= 2) {
      const hasConflictHook = act1Records.some(r =>
        r.clockRaised ||
        r.suspenseDelta > 2 ||
        (r.relationshipShifts ?? []).some(s => s.amount < -0.3),
      );
      if (!hasConflictHook) {
        issues.push({
          location: `Act 1 (Scenes 0–${act1End - 1})`,
          rule: 'CONFLICT_ACT1_ABSENT',
          description: `Act 1 (${act1Records.length} scenes) contains no conflict signal: no clock raised, no reversal, no negative relationship shift. The story opens without tension — the audience has nothing at stake from the start.`,
          severity: 'major',
          suggestedFix: 'Introduce a conflict signal in the first 25%: raise a clock, create a minor relational rupture, or plant a threat. The opening must establish what the protagonist stands to lose before the audience will care about saving it.',
        });
      }
    }
  }

  // CONFLICT_CONVERGENCE_ABSENT: Multiple active relational conflicts (≥2 distinct
  // negative-shift pairKeys) and a clock pressure exist throughout the story but
  // never intersect in the same scene. The threads run in parallel without the
  // explosive convergence that creates a true dramatic peak — the story fragments
  // its tension instead of detonating it.
  if (records.length >= 10) {
    const negPairKeys = new Set<string>();
    for (const r of records) {
      for (const shift of r.relationshipShifts ?? []) {
        if (shift.amount < -0.3) negPairKeys.add(shift.pairKey);
      }
    }
    const hasClockAnywhere = records.some(r => r.clockRaised);
    if (negPairKeys.size >= 2 && hasClockAnywhere) {
      const hasConvergence = records.some(r =>
        r.clockRaised && (r.relationshipShifts ?? []).some(s => s.amount < -0.3),
      );
      if (!hasConvergence) {
        issues.push({
          location: 'Conflict architecture',
          rule: 'CONFLICT_CONVERGENCE_ABSENT',
          description: `${negPairKeys.size} active relational conflicts and a clock pressure run in parallel throughout the story but never meet in a single scene. The threads fragment the tension instead of converging into one explosive confrontation.`,
          severity: 'major',
          suggestedFix: 'Design a scene where the deadline and the relational conflict collide simultaneously — a clock that forces opposing characters into the same room where they cannot avoid confrontation. Convergence is what turns multiple conflicts into a climax.',
        });
      }
    }
  }

  // ── Wave 195: Midpoint absent, Act 3 deflation, frequency drop ───────────

  // CONFLICT_MIDPOINT_ABSENT: The midpoint scene (floor(n*0.5)) and its ±1
  // neighbors carry no conflict signal — no clock, no reversal, no negative
  // relational shift. The structural pivot has no dramatic tension: the story
  // changes gear in a vacuum.
  if (records.length >= 8) {
    const midIdxConf = Math.floor(records.length * 0.5);
    const windowLow = Math.max(0, midIdxConf - 1);
    const windowHigh = Math.min(records.length - 1, midIdxConf + 1);
    const midpointWindow = records.slice(windowLow, windowHigh + 1);
    const hasMidpointConflict = midpointWindow.some(r =>
      r.clockRaised ||
      r.suspenseDelta < -1 ||
      (r.relationshipShifts ?? []).some((s: any) => s.amount < -0.3),
    );
    if (!hasMidpointConflict) {
      issues.push({
        location: `Scenes ${windowLow}–${windowHigh} (midpoint ±1)`,
        rule: 'CONFLICT_MIDPOINT_ABSENT',
        description: `The midpoint and adjacent scenes (Scenes ${windowLow}–${windowHigh}) carry no conflict signal — no clock, no reversal, no negative relationship shift. The structural pivot has no dramatic tension.`,
        severity: 'major',
        suggestedFix: 'Add a conflict beat to the midpoint zone: raise a clock, introduce a reversal, or create a relational rupture. The midpoint is where the story shifts gear — it should feel dramatic, not inert.',
      });
    }
  }

  // CONFLICT_ACT3_DEFLATION: Act 3 (last 25%) average suspense is significantly
  // lower than the second half of Act 2 (50%–75%). Conflict deflates before the
  // climax instead of crescendoing — the audience loses urgency at the finish line.
  if (records.length >= 8) {
    const act3StartConf = Math.floor(records.length * 0.75);
    const act2bStartConf = Math.floor(records.length * 0.5);
    const act2bRecs = records.slice(act2bStartConf, act3StartConf);
    const act3Recs = records.slice(act3StartConf);
    if (act2bRecs.length >= 2 && act3Recs.length >= 2) {
      const act2bAvgConf = act2bRecs.reduce((s: number, r: any) => s + r.suspenseDelta, 0) / act2bRecs.length;
      const act3AvgConf = act3Recs.reduce((s: number, r: any) => s + r.suspenseDelta, 0) / act3Recs.length;
      if (act2bAvgConf > 0 && act3AvgConf < act2bAvgConf * 0.6) {
        issues.push({
          location: `Act 3 (Scenes ${act3StartConf}–${records.length - 1})`,
          rule: 'CONFLICT_ACT3_DEFLATION',
          description: `Act 3 average suspense (${act3AvgConf.toFixed(1)}) is significantly below late Act 2 (${act2bAvgConf.toFixed(1)}) — conflict deflates before the climax instead of crescendoing`,
          severity: 'major',
          suggestedFix: 'Increase conflict intensity in the final act: escalate the antagonist\'s threat, raise a secondary clock, or force characters into their most consequential confrontation yet. The climax must be the peak.',
        });
      }
    }
  }

  // CONFLICT_FREQUENCY_DROP: The proportion of conflict-event scenes (reversals
  // or negative relationship shifts) falls from the first third to the final third.
  // The story becomes less dramatically active as it approaches its end — the
  // inverse of escalation. Requires 9+ scenes to have three meaningful thirds.
  if (records.length >= 9) {
    const confThird = Math.floor(records.length / 3);
    const isConflictEvent = (r: any) =>
      r.suspenseDelta < -1 || (r.relationshipShifts ?? []).some((s: any) => s.amount < -0.3);
    const firstThirdFreq = records.slice(0, confThird).filter(isConflictEvent).length / confThird;
    const lastThirdFreq = records.slice(records.length - confThird).filter(isConflictEvent).length / confThird;
    if (firstThirdFreq > lastThirdFreq && firstThirdFreq >= 0.4) {
      issues.push({
        location: 'Conflict frequency arc',
        rule: 'CONFLICT_FREQUENCY_DROP',
        description: `Conflict events (reversals + negative shifts) occur in ${Math.round(firstThirdFreq * 100)}% of first-third scenes but only ${Math.round(lastThirdFreq * 100)}% of final-third scenes — the story becomes less dramatic as it approaches its end`,
        severity: 'minor',
        suggestedFix: 'Spread conflict events evenly or escalate them toward the finale. The final third needs at least as many dramatic events as the opening — the climax arc must have its own conflict pulse.',
      });
    }
  }

  // ── Wave 210: Positive spiral trap, reversal symmetry break, antagonist force only ──

  // POSITIVE_SPIRAL_TRAP: Four or more consecutive scenes all carry a positive
  // emotional shift — an unbroken winning streak with no setback, reversal, or
  // doubt. A protagonist winning continuously for too long removes stakes and
  // transforms conflict into a montage. The audience stops fearing loss when
  // loss has been absent for four scenes in a row.
  if (records.length >= 8) {
    let posRun210 = 0;
    let maxPosRun210 = 0;
    let posRunStart210 = 0;
    let maxPosRunStart210 = 0;
    for (let i = 0; i < records.length; i++) {
      if (records[i].emotionalShift === 'positive') {
        if (posRun210 === 0) posRunStart210 = i;
        posRun210++;
        if (posRun210 > maxPosRun210) { maxPosRun210 = posRun210; maxPosRunStart210 = posRunStart210; }
      } else {
        posRun210 = 0;
      }
    }
    if (maxPosRun210 >= 4) {
      const runEnd210 = Math.min(maxPosRunStart210 + maxPosRun210 - 1, records.length - 1);
      issues.push({
        location: `Scenes ${records[maxPosRunStart210].sceneIdx}–${records[runEnd210].sceneIdx}`,
        rule: 'POSITIVE_SPIRAL_TRAP',
        severity: 'minor',
        description: `${maxPosRun210} consecutive scenes all end on a positive emotional shift — the protagonist wins continuously with no setback for ${maxPosRun210} scenes. Stakes evaporate when loss is absent for this long.`,
        suggestedFix: 'Break the winning streak with a reversal, a cost, or a doubt: a scene where the protagonist\'s progress is complicated or reversed. Sustained victories reduce tension — the audience must fear loss to care about the next scene.',
      });
    }
  }

  // REVERSAL_SYMMETRY_BREAK: Act 2a (25%–50%) contains two or more reversals
  // but Act 2b (50%–75%) contains none. The conflict's second half goes silent
  // exactly when it should be pressing hardest toward the climax. This is the
  // mid-story version of ANTAGONIST_VANISH: the opposition is active in the
  // first half of the conflict zone but passive in the second.
  if (records.length >= 10) {
    const act2aStart210 = Math.floor(records.length * 0.25);
    const act2Split210  = Math.floor(records.length * 0.5);
    const act2bEnd210   = Math.floor(records.length * 0.75);
    const reversalsAct2a = records.slice(act2aStart210, act2Split210).filter(r => r.suspenseDelta < -1).length;
    const reversalsAct2b = records.slice(act2Split210, act2bEnd210).filter(r => r.suspenseDelta < -1).length;
    if (reversalsAct2a >= 2 && reversalsAct2b === 0) {
      issues.push({
        location: `Act 2 (Scenes ${act2aStart210}–${act2bEnd210 - 1})`,
        rule: 'REVERSAL_SYMMETRY_BREAK',
        severity: 'minor',
        description: `Act 2a (Scenes ${act2aStart210}–${act2Split210 - 1}) delivers ${reversalsAct2a} reversals but Act 2b (Scenes ${act2Split210}–${act2bEnd210 - 1}) has none — the conflict's second half goes passive when it should be escalating. The approach to the climax has no oppositional momentum.`,
        suggestedFix: 'Add at least one reversal in Act 2b: a setback, a plan failure, or an antagonist action that raises the cost before the climax. The protagonist must enter the final act under active pressure, not from a lull.',
      });
    }
  }

  // ANTAGONIST_FORCE_ONLY: The story's conflict is entirely external — multiple
  // reversals (plot-level setbacks) but zero scenes with any negative relationship
  // shift. The antagonist creates plot obstacles but the characters never wound
  // each other. Conflict that operates only through external force, with no
  // interpersonal friction, produces thriller plotting without emotional dimension.
  if (records.length >= 8) {
    const reversalCount210 = records.filter(r => r.suspenseDelta < -1).length;
    const negRelShiftScenes210 = records.filter(r =>
      (r.relationshipShifts ?? []).some(s => s.amount < 0),
    ).length;
    if (reversalCount210 >= 2 && negRelShiftScenes210 === 0) {
      issues.push({
        location: 'Conflict architecture',
        rule: 'ANTAGONIST_FORCE_ONLY',
        severity: 'minor',
        description: `${reversalCount210} reversals occur but no scene carries a negative relationship shift — all conflict is external plot force with zero interpersonal damage. Characters never wound each other; they only absorb external obstacles.`,
        suggestedFix: 'Add at least one scene where the conflict damages a relationship: a betrayal, a broken trust, or an accusation that shifts how two characters stand in relation to each other. External opposition without interpersonal cost produces plot without drama.',
      });
    }
  }

  // ── Wave 214: Conflict-dynamics physics — pressure rhythm, mass distribution,
  //    reversal-magnitude trend. These reason over a per-scene conflict signal vector
  //    (see computeConflictDynamics) rather than single suspenseDelta thresholds. ──
  const conflictDyn214 = computeConflictDynamics(records);

  // UNRELIEVED_TENSION_ASCENT (major, n≥10): the dual of ESCALATION_PLATEAU. A long
  // run of consecutive scenes that each ADD external pressure with no release valve
  // among them. Relentless monotonic escalation with no beat of relief exhausts the
  // audience as surely as no escalation bores them — drama needs systole and diastole.
  if (records.length >= 10) {
    let run214 = 0, maxRun214 = 0, runStart214 = 0, maxRunStart214 = 0;
    for (let i = 0; i < conflictDyn214.length; i++) {
      const escalating = conflictDyn214[i].escalation > 0;
      const isRelief = conflictDyn214[i].release > 1;
      if (escalating && !isRelief) {
        if (run214 === 0) runStart214 = i;
        run214++;
        if (run214 > maxRun214) { maxRun214 = run214; maxRunStart214 = runStart214; }
      } else {
        run214 = 0;
      }
    }
    if (maxRun214 >= 6) {
      const runEnd214 = maxRunStart214 + maxRun214 - 1;
      issues.push({
        location: `Scenes ${records[maxRunStart214].sceneIdx}–${records[runEnd214].sceneIdx}`,
        rule: 'UNRELIEVED_TENSION_ASCENT',
        severity: 'major',
        description: `${maxRun214} consecutive scenes each add external pressure (rising suspense or a tightening clock) with no release valve between them — the tension climbs monotonically for ${maxRun214} scenes without a single beat of relief. Unbroken escalation flattens into noise; the audience cannot register a rise it is never allowed to fall from.`,
        suggestedFix: 'Insert a release beat inside the run: a reversal that briefly drops the pressure, a moment of false safety, or a small victory that the audience can exhale on before the next surge. Tension is felt as contrast — give the line a trough so the next peak reads as a climb.',
      });
    }
  }

  // CONFLICT_CONCENTRATION_SPIKE (major, n≥10): the story carries substantial total
  // conflict mass, but a single scene holds 60%+ of it while the rest is dead air.
  // The drama is one explosion in an empty field rather than a sustained engagement —
  // a structural signature of a story that front-loads or dumps its entire conflict
  // into one set-piece instead of threading opposition through the whole arc.
  if (records.length >= 10) {
    const masses214 = conflictDyn214.map(d => d.mass);
    const totalMass214 = masses214.reduce((a, b) => a + b, 0);
    const maxMass214 = Math.max(...masses214);
    const spikeIdx214 = masses214.indexOf(maxMass214);
    if (totalMass214 >= 6 && maxMass214 >= 0.6 * totalMass214) {
      issues.push({
        location: `Scene ${records[spikeIdx214].sceneIdx}`,
        rule: 'CONFLICT_CONCENTRATION_SPIKE',
        severity: 'major',
        description: `Scene ${records[spikeIdx214].sceneIdx} holds ${Math.round((maxMass214 / totalMass214) * 100)}% of the story's entire conflict mass — the opposition detonates in a single scene while the rest of the arc is dramatically inert. Conflict concentrated this heavily reads as an isolated set-piece, not a sustained pressure on the protagonist.`,
        suggestedFix: 'Distribute the conflict: seed smaller oppositional beats across the surrounding scenes so the spike is the crest of a wave, not a lone spike in flat water. A story sustains tension by keeping pressure present, not by discharging it all at once.',
      });
    }
  }

  // REVERSAL_MAGNITUDE_DECAY (major, n≥10): reversals exist in both the opening and
  // closing thirds, but their MAGNITUDE shrinks — the biggest setback is early and the
  // late reversals are at least half as large or smaller. Stakes that deflate toward
  // the climax invert the dramatic gradient: each blow should land harder than the last,
  // not softer. This is a magnitude-aware check that "are there reversals" cannot catch.
  if (records.length >= 10) {
    const third214 = Math.floor(records.length / 3);
    const firstThirdRev214 = conflictDyn214.slice(0, third214).filter(d => d.isReversal).map(d => d.reversalMag);
    const lastThirdRev214 = conflictDyn214.slice(records.length - third214).filter(d => d.isReversal).map(d => d.reversalMag);
    if (firstThirdRev214.length > 0 && lastThirdRev214.length > 0) {
      const firstMax214 = Math.max(...firstThirdRev214);
      const lastMax214 = Math.max(...lastThirdRev214);
      if (firstMax214 >= 2 * lastMax214) {
        issues.push({
          location: 'Reversal magnitude arc',
          rule: 'REVERSAL_MAGNITUDE_DECAY',
          severity: 'major',
          description: `The story's largest early reversal swings by ${firstMax214.toFixed(1)} but its largest late reversal swings by only ${lastMax214.toFixed(1)} — the setbacks shrink as the story approaches its climax. The dramatic gradient is inverted: the protagonist's hardest blow lands first and the stakes deflate toward the end.`,
          suggestedFix: 'Escalate reversal magnitude toward the finale: the climax-adjacent setback should be the largest, most costly reversal in the story. Reorder or deepen the late reversals so each blow lands harder than the one before — a deflating stakes curve drains the climax of consequence.',
        });
      }
    }
  }

  // ── Wave 229: Reversal tempo flatline, telegraphed antagonist, positive resolution too early ──

  // REVERSAL_TEMPO_FLATLINE (minor, n≥10): Reversal-level conflict events exist but
  // their average interval exceeds 40% of the total scene count — the conflict pulse
  // is so slow that narrative momentum stalls between beats. Unlike
  // CONFLICT_FREQUENCY_DROP (which compares thirds), this measures absolute spacing
  // rhythm and fires when events are chronically far apart regardless of distribution.
  if (records.length >= 10) {
    const conflictEventIdxs229: number[] = [];
    for (let i = 0; i < records.length; i++) {
      const r = records[i];
      if (r.suspenseDelta < -1 ||
          (r.relationshipShifts ?? []).some((s: any) => s.amount < -0.4)) {
        conflictEventIdxs229.push(i);
      }
    }
    if (conflictEventIdxs229.length >= 2) {
      const gaps229: number[] = [];
      for (let j = 1; j < conflictEventIdxs229.length; j++) {
        gaps229.push(conflictEventIdxs229[j] - conflictEventIdxs229[j - 1]);
      }
      const avgGap229 = gaps229.reduce((a, b) => a + b, 0) / gaps229.length;
      const gapThreshold229 = records.length * 0.4;
      if (avgGap229 > gapThreshold229) {
        issues.push({
          location: 'Conflict rhythm',
          rule: 'REVERSAL_TEMPO_FLATLINE',
          severity: 'minor',
          description: `Conflict events are spaced an average of ${avgGap229.toFixed(1)} scenes apart (threshold: ${gapThreshold229.toFixed(1)}) — the narrative pulse is so slow that dramatic momentum stalls. The story has ${conflictEventIdxs229.length} conflict beats across ${records.length} scenes.`,
          suggestedFix: 'Reduce the interval between conflict events: add micro-reversals, raise a clock between major beats, or introduce small relational friction to keep pressure present. A conflict rhythm of one beat every 3–4 scenes sustains tension.',
        });
      }
    }
  }

  // ANTAGONIST_TELEGRAPHED (minor, n≥10): Every deep reversal (suspenseDelta < -2)
  // is immediately preceded by a clock raise in the prior scene — the antagonist only
  // strikes after a warning. Real opposition needs unpredictable strikes: a reversal
  // with no advance warning creates genuine dread that telegraphed attacks cannot.
  if (records.length >= 10) {
    const deepReversals229 = records
      .map((r: any, i: number) => ({ r, i }))
      .filter(({ r }: any) => r.suspenseDelta < -2);
    if (deepReversals229.length >= 2) {
      const allTelegraphed229 = deepReversals229.every(({ i }: any) =>
        i > 0 && records[i - 1].clockRaised,
      );
      if (allTelegraphed229) {
        issues.push({
          location: 'Conflict — reversal pattern',
          rule: 'ANTAGONIST_TELEGRAPHED',
          severity: 'minor',
          description: `Every reversal (${deepReversals229.length} events, suspenseDelta < -2) is immediately preceded by a clock raise — the antagonist only strikes after a warning. Permanently telegraphed attacks eliminate genuine shock from the conflict.`,
          suggestedFix: 'Remove the preceding clock raise from at least one reversal, or introduce a strike where the prior scene carried no threat signal. Unpredictable antagonist action creates dread; telegraphed opposition only builds anxiety.',
        });
      }
    }
  }

  // POSITIVE_RESOLUTION_TOO_EARLY (major, n≥8): The story's most significant
  // positive relationship shift (largest-magnitude, ≥0.4) occurs before the 60%
  // mark. The central reconciliation front-loads the emotional reward — the final
  // act has nowhere left to go. The structural complement to INTERPERSONAL_PEAK_TOO_EARLY.
  if (records.length >= 8) {
    const posShiftScenes229: Array<{ sceneIdx: number; recIdx: number; amount: number }> = [];
    for (let i = 0; i < records.length; i++) {
      for (const shift of (records[i].relationshipShifts ?? []) as Array<{ amount: number }>) {
        if (shift.amount >= 0.4) {
          posShiftScenes229.push({ sceneIdx: records[i].sceneIdx, recIdx: i, amount: shift.amount });
        }
      }
    }
    if (posShiftScenes229.length >= 3) {
      const peakPos229 = posShiftScenes229.reduce((best, s) => s.amount > best.amount ? s : best);
      const earlyZone229 = Math.floor(records.length * 0.6);
      if (peakPos229.recIdx < earlyZone229) {
        issues.push({
          location: `Scene ${peakPos229.sceneIdx} (relational peak resolution)`,
          rule: 'POSITIVE_RESOLUTION_TOO_EARLY',
          severity: 'major',
          description: `The story's most significant positive relationship shift (+${peakPos229.amount.toFixed(2)}) occurs at Scene ${peakPos229.sceneIdx} — ${Math.round(peakPos229.recIdx / records.length * 100)}% through the story, before the 60% mark. The central reconciliation arrives too early; the final act has nowhere left to go emotionally.`,
          suggestedFix: 'Reserve the most significant positive relationship shift for the climax or resolution zone (60%+). Let the characters earn their reconciliation at the story\'s peak — the audience must be made to wait for the reward they sense is coming.',
        });
      }
    }
  }
  // ── Wave 243: Conflict recovery too fast, single-pair conflict, conflict purpose monotone ──

  // CONFLICT_RECOVERY_TOO_FAST (minor, n≥8): Every scene with deep negative
  // tension (suspenseDelta < -1.5) is followed within 2 scenes by a clear
  // recovery (suspenseDelta > 1.0). All damage heals before it can accumulate.
  // The story never allows a wound to linger — each crisis is resolved so quickly
  // that pressure never builds, and the audience stops believing the setbacks
  // are permanent. Requires ≥2 deep reversals.
  if (records.length >= 8) {
    const deepReversals243 = records
      .map((r: any, i: number) => ({ r, i }))
      .filter(({ r }: any) => r.suspenseDelta < -1.5);
    if (deepReversals243.length >= 2) {
      const allRecoverFast243 = deepReversals243.every(({ i }: any) => {
        for (let k = i + 1; k <= Math.min(i + 2, records.length - 1); k++) {
          if (records[k].suspenseDelta > 1.0) return true;
        }
        return false;
      });
      if (allRecoverFast243) {
        issues.push({
          location: 'Conflict recovery rhythm',
          rule: 'CONFLICT_RECOVERY_TOO_FAST',
          severity: 'minor',
          description: `Every deep negative tension spike (suspenseDelta < -1.5) recovers with a positive beat (>1.0) within 2 scenes — all ${deepReversals243.length} setbacks heal before they can accumulate. The audience stops believing the reversals are permanent because the story refuses to let damage linger.`,
          suggestedFix: 'Let at least one wound stay open for 3-4 scenes before relief arrives. When every crisis resolves immediately, pressure never builds to an unbearable level — the climax can\'t feel like the worst moment if every prior moment of danger was fixed by the next scene.',
        });
      }
    }
  }

  // SINGLE_PAIR_CONFLICT (minor, n≥8): All negative relationship shifts
  // (amount < -0.3) involve only one pair, while ≥2 total pairs are tracked.
  // The antagonistic load is carried by a single feud; every other relationship
  // in the story remains frictionless. Conflict that lives in only one pair
  // lacks the multi-front pressure that forces genuine crisis. Distinct from
  // GOAL_WITHOUT_OPPOSITION (which fires when there's NO opposition) — this
  // fires when opposition exists but is limited to one pair.
  {
    const allActivePairs243 = new Set<string>();
    for (const r of records) for (const s of (r.relationshipShifts ?? [])) allActivePairs243.add((s as any).pairKey);
    if (records.length >= 8 && allActivePairs243.size >= 2) {
      const conflictingPairs243 = new Set<string>();
      for (const r of records) {
        for (const shift of (r.relationshipShifts ?? []) as Array<{ pairKey: string; amount: number }>) {
          if (shift.amount < -0.3) conflictingPairs243.add(shift.pairKey);
        }
      }
      if (conflictingPairs243.size === 1) {
        const [onlyPair243] = conflictingPairs243;
        issues.push({
          location: `Conflict: ${onlyPair243}`,
          rule: 'SINGLE_PAIR_CONFLICT',
          severity: 'minor',
          description: `All negative relationship shifts (amount < -0.3) involve the same pair ("${onlyPair243}") — the entire antagonistic load of the story is carried by one feud. Every other relationship remains frictionless. Multi-front conflict creates genuine crisis; a single-pair conflict is a dispute, not a war.`,
          suggestedFix: 'Introduce negative pressure in at least one other relationship: a second rivalry, a loyalty strained by a third party, or an alliance under stress. Protagonists under pressure on multiple fronts simultaneously face more complex, higher-stakes choices.',
        });
      }
    }
  }

  // CONFLICT_PURPOSE_MONOTONE (minor, n≥8): All scenes carrying strong conflict
  // signals (suspenseDelta < -1 OR any relationship shift ≤ -0.3) share the same
  // purpose label — the story can only deliver antagonistic pressure in one
  // structural mode. Three or more such scenes all labelled "confrontation" (or
  // any single label) suggests the conflict register is locked: every crisis looks
  // the same. Requires ≥3 conflict events with the same purpose.
  if (records.length >= 8) {
    const conflictScenePurposes243 = records
      .filter(r =>
        r.suspenseDelta < -1 ||
        (r.relationshipShifts ?? []).some((s: any) => s.amount <= -0.3),
      )
      .map(r => r.purpose);
    if (conflictScenePurposes243.length >= 3) {
      const purposeMap243 = new Map<string, number>();
      for (const p of conflictScenePurposes243) {
        purposeMap243.set(p, (purposeMap243.get(p) ?? 0) + 1);
      }
      const [domPurpose243, domCount243] = [...purposeMap243.entries()].sort((a, b) => b[1] - a[1])[0];
      if (domCount243 === conflictScenePurposes243.length) {
        issues.push({
          location: 'Conflict scene purpose register',
          rule: 'CONFLICT_PURPOSE_MONOTONE',
          severity: 'minor',
          description: `All ${domCount243} conflict scenes (suspenseDelta < -1 or strong negative shift) share the same purpose label ("${domPurpose243}") — the story delivers antagonistic pressure in only one structural mode. Every conflict scene looks the same at the functional level.`,
          suggestedFix: `Vary the structural vessel for conflict: not every crisis needs to be a "${domPurpose243}". A revelation scene can carry as much antagonistic load as a confrontation; a character-development scene can contain the story's sharpest friction. Varied conflict modes keep the audience from predicting the next crisis shape.`,
        });
      }
    }
  }
  // ── End Wave 243 ─────────────────────────────────────────────────────────────

  // ── End Wave 229 ─────────────────────────────────────────────────────────────

  // ── Wave 257: Conflict Act 3 absent, reconciliation absent, conflict opening void ──

  // A scene carries a conflict signal when it has deep negative tension OR any
  // strong negative relationship shift. Shared by the three Wave 257 checks.
  const isConflictScene257 = (r: any): boolean =>
    (r.suspenseDelta ?? 0) < -1 ||
    (r.relationshipShifts ?? []).some((s: any) => s.amount <= -0.3);

  // CONFLICT_ACT3_ABSENT (major, n≥8): The story carries conflict in its first
  // 75% but Act 3 (final 25%) has no conflict signal at all — the climax act
  // resolves without struggle. The protagonist coasts to the ending with no
  // antagonistic pressure in the very stretch that should hold the story's
  // hardest opposition. Only fires when conflict exists earlier (otherwise
  // GOAL_WITHOUT_OPPOSITION already covers the conflictless case).
  if (records.length >= 8) {
    const act3Start257 = Math.floor(records.length * 0.75);
    const earlyConflict257 = records.slice(0, act3Start257).some(isConflictScene257);
    const act3Conflict257 = records.slice(act3Start257).some(isConflictScene257);
    if (earlyConflict257 && !act3Conflict257) {
      issues.push({
        location: `Act 3 (Scenes ${act3Start257}–${records.length - 1}) — conflict layer`,
        rule: 'CONFLICT_ACT3_ABSENT',
        severity: 'major',
        description: `The story carries conflict through its first 75% but Act 3 (Scenes ${act3Start257}–${records.length - 1}) has no conflict signal — no deep tension drop, no strong negative relationship shift. The climax act resolves without struggle; the protagonist coasts to the ending in the stretch that should hold the story's fiercest opposition.`,
        suggestedFix: 'Load the final act with its hardest opposition: the antagonist\'s last and strongest move, a betrayal that lands at the worst moment, a setback that makes victory seem impossible. The climax must be the point of maximum pressure, not its release.',
      });
    }
  }

  // RECONCILIATION_ABSENT (minor, n≥8, ≥2 broken pairs): Two or more pairs suffer
  // a strong relational rupture (a shift ≤ -0.4) but not one of them ever recovers
  // with a later positive shift (≥ +0.3). Every broken bond stays broken — the
  // story fractures relationships and never repairs a single one. While some
  // ruptures should be permanent, a cast in which nobody ever reconciles offers no
  // relational catharsis. Distinct from CONFLICT_RECOVERY_TOO_FAST (suspense, and
  // its opposite failure); this is the relational-repair arc end to end.
  if (records.length >= 8) {
    const brokenPairs257 = new Map<string, number>(); // pairKey → scene index of rupture
    for (let i = 0; i < records.length; i++) {
      for (const s of (records[i].relationshipShifts ?? []) as Array<{ pairKey: string; amount: number }>) {
        if (s.amount <= -0.4 && !brokenPairs257.has(s.pairKey)) brokenPairs257.set(s.pairKey, i);
      }
    }
    if (brokenPairs257.size >= 2) {
      const anyReconciled257 = [...brokenPairs257.entries()].some(([pairKey, ruptureIdx]) => {
        for (let j = ruptureIdx + 1; j < records.length; j++) {
          if ((records[j].relationshipShifts ?? []).some((s: any) => s.pairKey === pairKey && s.amount >= 0.3)) {
            return true;
          }
        }
        return false;
      });
      if (!anyReconciled257) {
        issues.push({
          location: 'Relational repair arc',
          rule: 'RECONCILIATION_ABSENT',
          severity: 'minor',
          description: `${brokenPairs257.size} relationships suffer a strong rupture (shift ≤ -0.4) but not one of them ever recovers with a later positive shift — every broken bond stays broken. The story fractures relationships and repairs none, leaving the cast with no relational catharsis.`,
          suggestedFix: 'Let at least one broken relationship find its way back — a reconciliation, a hard-won forgiveness, an alliance reforged in the climax. Not every rupture must heal, but a story where none do denies the audience the release that comes from a bond restored.',
        });
      }
    }
  }

  // CONFLICT_OPENING_VOID (minor, n≥8): Act 1 (first 25%) contains no conflict
  // signal while conflict exists later — the story opens frictionless and the
  // inciting tension arrives late. An opening with no friction gives the audience
  // nothing to lean into; the dramatic question should be posed, and resisted,
  // from the first act. Distinct from causality's CAUSAL_ACT1_VOID (any causal
  // thread); this fires specifically on the absence of opposition in the opening.
  if (records.length >= 8) {
    const act1End257 = Math.floor(records.length * 0.25);
    const act1Recs257 = records.slice(0, act1End257);
    if (act1Recs257.length >= 2) {
      const act1Conflict257 = act1Recs257.some(isConflictScene257);
      const laterConflict257 = records.slice(act1End257).some(isConflictScene257);
      if (!act1Conflict257 && laterConflict257) {
        issues.push({
          location: `Act 1 (Scenes 0–${act1End257 - 1}) — conflict layer`,
          rule: 'CONFLICT_OPENING_VOID',
          severity: 'minor',
          description: `Act 1 (the first ${act1End257} scenes) contains no conflict signal — no tension drop, no negative relationship shift — yet the story develops conflict later. The opening is frictionless and the inciting opposition arrives late, giving the audience nothing to lean into from the start.`,
          suggestedFix: 'Pose the dramatic question early and let something resist it in Act 1: a friction between characters, an obstacle that bites, a threat that announces itself. An opening with no opposition reads as preamble; the conflict should be felt before the first act ends.',
        });
      }
    }
  }

  // ── Wave 271: CONFLICT_ACT2B_VOID ─────────────────────────────────────────
  // Act 2b (the 50-75% zone, the "dark night" stretch before the final push)
  // has no conflict signal while overall conflict exists. The zone that should
  // hold the protagonist's lowest moment and the antagonist's strongest move
  // is empty. The story has tension in the opening half and in the climax, but
  // the bridge between them — where stakes should be at their heaviest — is
  // inert. Distinct from CONFLICT_MIDPOINT_ABSENT (midpoint ±1 window only)
  // and CONFLICT_ACT3_DEFLATION (comparing averages, not checking for void).
  // Requires 10+ records and 2+ overall conflict scenes.
  if (records.length >= 10) {
    const act2bStart271 = Math.floor(records.length * 0.5);
    const act2bEnd271 = Math.floor(records.length * 0.75);
    const overallConflict271 = records.filter(isConflictScene257).length;
    if (overallConflict271 >= 2) {
      const act2bConflict271 = records.slice(act2bStart271, act2bEnd271).filter(isConflictScene257).length;
      if (act2bConflict271 === 0) {
        issues.push({
          location: `Act 2b (scenes ${act2bStart271}–${act2bEnd271 - 1}) — conflict layer`,
          rule: 'CONFLICT_ACT2B_VOID',
          severity: 'minor',
          description: `The Act 2b zone (scenes ${act2bStart271}–${act2bEnd271 - 1}) has no conflict signal — no tension drop, no negative relationship shift — while the first half and climax both carry conflict. The stretch that should hold the protagonist's lowest moment and the antagonist's strongest move is inert; the bridge to the climax has no dramatic engine.`,
          suggestedFix: 'Put the story\'s hardest moment in Act 2b: a betrayal that isolates the protagonist, a failure that seems final, a revelation that reframes everything. The "dark night" zone needs the story\'s highest conflict density, not its lowest.',
        });
      }
    }
  }

  // ── Wave 271: INTERPERSONAL_CONFLICT_ONLY ─────────────────────────────────
  // The story carries 3+ scenes with negative relationship shifts but no scene
  // delivers an atmospheric tension reversal (suspenseDelta < -1). All conflict
  // is interpersonal — characters wound each other — but nothing external
  // threatens them: no plot reversals, no danger, no external pressure. The
  // mirror of ANTAGONIST_FORCE_ONLY (which fires when all conflict is external
  // with no interpersonal dimension). A story without any plot reversal can
  // read as a domestic chamber drama even when the subject demands external
  // stakes. Requires 6+ records.
  if (records.length >= 6) {
    const negRelShiftScenes271 = records.filter(r =>
      ((r.relationshipShifts as any[] ?? [])).some((s: any) => s.amount <= -0.3),
    );
    if (negRelShiftScenes271.length >= 3) {
      const hasSuspenseReversal271 = records.some(r => (r.suspenseDelta ?? 0) < -1);
      if (!hasSuspenseReversal271) {
        issues.push({
          location: 'Conflict architecture',
          rule: 'INTERPERSONAL_CONFLICT_ONLY',
          severity: 'minor',
          description: `${negRelShiftScenes271.length} scenes carry negative relationship shifts but no scene delivers a tension reversal (suspenseDelta < -1) — all conflict is interpersonal with zero external plot pressure. Characters wound each other but nothing external threatens them; the story has friction without danger.`,
          suggestedFix: 'Add at least one scene where external circumstances create a reversal: a plan that fails, a threat that arrives unexpectedly, a deadline that bites. External pressure transforms interpersonal friction from a slow burn into unavoidable confrontation with genuine stakes.',
        });
      }
    }
  }

  // ── Wave 271: CONFLICT_PAIR_DENSITY_GAP ───────────────────────────────────
  // Three or more pairs are involved in negative relationship shifts, but one
  // pair accumulates at least 3× as many negative conflict events as the next
  // most active pair. The conflict load is unevenly distributed — one feud
  // dominates while others exist as background friction that never escalates.
  // Distinct from SINGLE_PAIR_CONFLICT (only one pair with any conflict); this
  // fires when multiple pairs have conflict but one pair crushes all others.
  // Requires 6+ records and 3+ pairs with negative shifts.
  if (records.length >= 6) {
    const pairNegCounts271 = new Map<string, number>();
    for (const r of records) {
      for (const s of (r.relationshipShifts as any[] ?? []) as Array<{ pairKey: string; amount: number }>) {
        if (s.amount <= -0.3) {
          pairNegCounts271.set(s.pairKey, (pairNegCounts271.get(s.pairKey) ?? 0) + 1);
        }
      }
    }
    if (pairNegCounts271.size >= 3) {
      const sorted271 = [...pairNegCounts271.entries()].sort((a, b) => b[1] - a[1]);
      const dominantCount271 = sorted271[0][1];
      const secondCount271 = sorted271[1][1];
      if (dominantCount271 >= 3 * secondCount271) {
        issues.push({
          location: `Conflict distribution — "${sorted271[0][0]}" dominant`,
          rule: 'CONFLICT_PAIR_DENSITY_GAP',
          severity: 'minor',
          description: `"${sorted271[0][0]}" accumulates ${dominantCount271} negative conflict events — at least 3× more than any other pair (next: ${secondCount271}). While ${pairNegCounts271.size} pairs carry conflict, one feud so dominates the dramatic load that all others register as background noise. The antagonistic architecture collapses into a single overwhelming dispute.`,
          suggestedFix: 'Raise the conflict stakes in at least one secondary pair so it approaches the dominant pair\'s density. Layered conflict — two or three pairs with comparably high friction — creates a richer dramatic web than a single dominant feud surrounded by quiet bystanders.',
        });
      }
    }
  }

  // ── Wave 285: CONFLICT_SUSPENSE_DECOUPLED ────────────────────────────────
  // Scenes with negative relationship shifts (conflict scenes) have no
  // corresponding suspense lift — their average suspenseDelta is ≤ 0.
  // Conflict and suspense should reinforce each other; when conflict scenes
  // produce zero suspense, they feel consequence-free and the audience
  // disengages. Requires 8+ records and 3+ conflict scenes.
  if (records.length >= 8) {
    const conflictScenes285 = (records as any[]).filter(r =>
      ((r.relationshipShifts as any[] ?? []) as Array<{ amount: number }>).some(s => s.amount <= -0.3),
    );
    if (conflictScenes285.length >= 3) {
      const avgSuspense285 = conflictScenes285.reduce((acc: number, r: any) => acc + (r.suspenseDelta ?? 0), 0) / conflictScenes285.length;
      if (avgSuspense285 <= 0) {
        issues.push({
          location: 'Conflict scenes — suspense decoupled',
          rule: 'CONFLICT_SUSPENSE_DECOUPLED',
          severity: 'minor',
          description: `${conflictScenes285.length} conflict scene(s) have an average suspenseDelta of ${avgSuspense285.toFixed(2)} — conflict is not generating suspense. When confrontations fail to raise tension, the audience reads them as consequence-free arguments rather than dramatic turning points. Conflict without suspense is noise.`,
          suggestedFix: 'Raise the stakes in each conflict scene: add a ticking deadline, an unexpected revelation, a power shift, or an irreversible action that could end the relationship. Suspense comes from uncertainty — the audience must believe the worst outcome is possible.',
        });
      }
    }
  }

  // ── Wave 285: NEGATIVE_SPIRAL_UNBROKEN ───────────────────────────────────
  // Four or more consecutive scenes have negative emotional shifts with no
  // neutral or positive break. An unbroken descent exhausts the audience —
  // they become desensitized to negative beats and stop believing each new
  // blow matters. Even the darkest stories need a single breath of relief
  // before the next descent to maintain emotional responsiveness.
  // Requires 8+ records.
  if (records.length >= 8) {
    let spiralLen285 = 0;
    let maxSpiral285 = 0;
    let spiralStart285 = -1;
    let maxSpiralStart285 = -1;
    for (let i285 = 0; i285 < records.length; i285++) {
      if ((records as any[])[i285].emotionalShift === 'negative') {
        if (spiralLen285 === 0) spiralStart285 = i285;
        spiralLen285++;
        if (spiralLen285 > maxSpiral285) {
          maxSpiral285 = spiralLen285;
          maxSpiralStart285 = spiralStart285;
        }
      } else {
        spiralLen285 = 0;
      }
    }
    if (maxSpiral285 >= 4) {
      issues.push({
        location: `Scenes ${maxSpiralStart285}–${maxSpiralStart285 + maxSpiral285 - 1} — negative spiral`,
        rule: 'NEGATIVE_SPIRAL_UNBROKEN',
        severity: 'minor',
        description: `${maxSpiral285} consecutive scenes (${maxSpiralStart285}–${maxSpiralStart285 + maxSpiral285 - 1}) have negative emotional shifts with no neutral or positive break. An unbroken descent desensitizes the audience — each new blow registers with less impact than the last. Even a brief moment of relief or dark humor between negative beats resets the audience's capacity for distress.`,
        suggestedFix: 'Insert a single neutral or positive beat within the spiral — a small victory, a moment of gallows humor, a character reconnection before the next blow. The beat does not need to resolve anything; it just gives the audience permission to breathe before the next descent.',
      });
    }
  }

  // ── Wave 285: CONFLICT_RESOLUTION_PREMATURE ──────────────────────────────
  // The dominant conflict pair (most negative shifts) has all of its
  // negative events in the first 75% of the story, and the final quarter
  // has no negative shifts from that pair. The central conflict resolves
  // before the climax — the story continues but the engine is off.
  // Requires 8+ records and 4+ negative events from the dominant pair.
  if (records.length >= 8) {
    const pairNegEvents285 = new Map<string, number[]>();
    for (const r of records as any[]) {
      for (const s of ((r.relationshipShifts as any[] ?? []) as Array<{ pairKey: string; amount: number }>)) {
        if (s.amount <= -0.3) {
          const arr = pairNegEvents285.get(s.pairKey) ?? [];
          arr.push(r.sceneIdx);
          pairNegEvents285.set(s.pairKey, arr);
        }
      }
    }
    if (pairNegEvents285.size >= 1) {
      const sorted285 = [...pairNegEvents285.entries()].sort((a, b) => b[1].length - a[1].length);
      const [dominantPair285, dominantScenes285] = sorted285[0];
      if (dominantScenes285.length >= 4) {
        const finalStart285 = Math.floor(records.length * 0.75);
        const lateEvents285 = dominantScenes285.filter(idx => idx >= finalStart285);
        if (lateEvents285.length === 0) {
          issues.push({
            location: `Dominant conflict pair "${dominantPair285}" — resolves before climax`,
            rule: 'CONFLICT_RESOLUTION_PREMATURE',
            severity: 'minor',
            description: `"${dominantPair285}" drives ${dominantScenes285.length} negative conflict events but none occur in the final quarter (scene ${finalStart285}+). The central conflict resolves before the climax — the story continues but the dramatic engine has already switched off. The final act plays out in the aftermath of a conflict that is already settled.`,
            suggestedFix: 'Extend the central conflict into the final quarter: add a late reversal, an unexpected re-escalation, or a final confrontation that must be resolved at the climax. The dominant conflict pair should be unresolved until the final act — early resolution steals the climax.',
          });
        }
      }
    }
  }

  // ── Wave 299: CONFLICT_EMOTION_DECOUPLED ─────────────────────────────────
  // Scenes carrying negative relationship shifts (conflict scenes) are all
  // emotionally neutral — the fights leave no mark on anyone's emotional
  // state. Distinct from CONFLICT_SUSPENSE_DECOUPLED (which audits the
  // suspense channel): this audits the emotional channel. A confrontation
  // that changes a relationship but moves no one emotionally reads as a
  // transaction, not a fight. Requires 8+ records and 3+ conflict scenes.
  if (records.length >= 8) {
    const conflictScenes299 = (records as any[]).filter(r =>
      ((r.relationshipShifts as any[] ?? []) as Array<{ amount: number }>).some(s => s.amount <= -0.3),
    );
    if (conflictScenes299.length >= 3 && conflictScenes299.every(r => r.emotionalShift === 'neutral')) {
      issues.push({
        location: 'Conflict scenes — emotionally neutral',
        rule: 'CONFLICT_EMOTION_DECOUPLED',
        severity: 'minor',
        description: `All ${conflictScenes299.length} conflict scenes (negative relationship shifts) carry a neutral emotional shift — relationships fracture but nobody feels anything. A confrontation that changes a bond without moving anyone emotionally reads as a transaction: the audience sees the ledger update but never the cost. Conflict's currency is feeling.`,
        suggestedFix: 'Let at least one fight land emotionally: the scene where a bond breaks should also be the scene where someone\'s emotional state turns — anger curdling to grief, betrayal hardening to resolve. If a relationship can sour without anyone caring, the audience will conclude the relationship never mattered.',
      });
    }
  }

  // ── Wave 299: STAKES_LABEL_UNBACKED ──────────────────────────────────────
  // Two or more scenes are tagged with purpose "raise_stakes" but none of
  // them carries any conflict marker — no negative relationship shift, no
  // suspense rise, no clock raised. The structure claims stakes are rising
  // while the scene data shows nothing at risk: the label is unbacked by
  // dramatic content. Requires 8+ records.
  if (records.length >= 8) {
    const stakesScenes299 = (records as any[]).filter(r => r.purpose === 'raise_stakes');
    if (stakesScenes299.length >= 2) {
      const anyBacked299 = stakesScenes299.some(r =>
        (r.suspenseDelta ?? 0) > 0 ||
        r.clockRaised === true ||
        ((r.relationshipShifts as any[] ?? []) as Array<{ amount: number }>).some(s => s.amount <= -0.3),
      );
      if (!anyBacked299) {
        issues.push({
          location: 'Scenes tagged raise_stakes',
          rule: 'STAKES_LABEL_UNBACKED',
          severity: 'minor',
          description: `${stakesScenes299.length} scenes are tagged "raise_stakes" but none of them shows a suspense rise, a clock raised, or a relationship souring — the structural label claims escalation while the scene data shows nothing newly at risk. Stakes that are declared rather than dramatized leave the audience told the situation is worse without ever feeling it.`,
          suggestedFix: 'Back each stake-raising scene with a concrete escalation: a deadline introduced, a threat made specific, an ally turned, a cost paid. If a scene cannot show what is newly at risk, retag it honestly as development — a mislabeled scene corrupts the story\'s structural map.',
        });
      }
    }
  }

  // ── Wave 299: ELEVENTH_HOUR_CONFLICT ─────────────────────────────────────
  // A conflict pair's first negative shift ever occurs in the final 10% of
  // the story. A feud introduced this late has no room to escalate, breathe,
  // or resolve — it exists only to inject artificial tension into the finale.
  // Distinct from the Act-3-absence checks (which flag missing late conflict):
  // this flags brand-new conflict arriving too late to mean anything.
  // Requires 10+ records.
  if (records.length >= 10) {
    const firstConflictAt299 = new Map<string, number>();
    for (const r of records as any[]) {
      for (const s of ((r.relationshipShifts as any[] ?? []) as Array<{ pairKey: string; amount: number }>)) {
        if (s.amount <= -0.3 && !firstConflictAt299.has(s.pairKey)) {
          firstConflictAt299.set(s.pairKey, r.sceneIdx);
        }
      }
    }
    const lateCutoff299 = Math.floor(records.length * 0.9);
    const elevenths299 = [...firstConflictAt299.entries()].filter(([, idx]) => idx >= lateCutoff299);
    if (elevenths299.length > 0 && firstConflictAt299.size > elevenths299.length) {
      const [latePair299, lateIdx299] = elevenths299[0];
      issues.push({
        location: `Scene ${lateIdx299} — first conflict for "${latePair299}"`,
        rule: 'ELEVENTH_HOUR_CONFLICT',
        severity: 'minor',
        description: `The conflict between "${latePair299}" first appears at scene ${lateIdx299} — inside the final 10% of the story. A feud introduced this late has no room to escalate or resolve; it reads as artificial tension injected into the finale rather than a fault line the story has been tracking. Late conflict the audience never saw coming (and never sees settled) leaves the ending cluttered.`,
        suggestedFix: `Either seed the "${latePair299}" friction earlier — a cold exchange, a competing interest, a small betrayal in Act 2 that makes the late rupture feel inevitable — or cut the late conflict entirely and spend the finale resolving the conflicts the story has already earned.`,
      });
    }
  }

  // ── Wave 313: CONFLICT_CURIOSITY_DECOUPLED ───────────────────────────────
  // Conflict scenes (negative relationship shifts) have an average curiosityDelta
  // of zero or below — confrontations resolve the audience's "what happens next?"
  // to nothing. Completes the conflict-channel trilogy alongside CONFLICT_SUSPENSE_
  // DECOUPLED (tension) and CONFLICT_EMOTION_DECOUPLED (feeling): a fight that
  // raises no question leaves the audience watching an argument with no forward
  // pull. Requires 8+ records and 3+ conflict scenes.
  if (records.length >= 8) {
    const conflictScenes313 = (records as any[]).filter(r =>
      ((r.relationshipShifts as any[] ?? []) as Array<{ amount: number }>).some(s => s.amount <= -0.3),
    );
    if (conflictScenes313.length >= 3) {
      const avgCuriosity313 = conflictScenes313.reduce((acc: number, r: any) => acc + (r.curiosityDelta ?? 0), 0) / conflictScenes313.length;
      if (avgCuriosity313 <= 0) {
        issues.push({
          location: 'Conflict scenes — curiosity decoupled',
          rule: 'CONFLICT_CURIOSITY_DECOUPLED',
          severity: 'minor',
          description: `${conflictScenes313.length} conflict scenes have an average curiosityDelta of ${avgCuriosity313.toFixed(2)} — confrontations resolve the audience's "what happens next?" to nothing. A fight should open questions as well as wounds: who will retaliate, what was really meant, what this costs. Conflict that raises no question is an argument with no forward pull.`,
          suggestedFix: 'End conflict scenes on an open question, not a closed one: a threat half-made, a secret half-revealed, an alliance left uncertain. The audience should leave each confrontation needing the next scene — curiosity is the thread that pulls them through the fight.',
        });
      }
    }
  }

  // ── Wave 313: CONFLICT_MAGNITUDE_PEAK_EARLY ──────────────────────────────
  // The scene carrying the heaviest relational conflict (the largest summed
  // magnitude of negative shifts) falls in the first half of the story, while
  // conflict is distributed rather than concentrated (the peak holds under 60%
  // of total conflict mass, so this is not a single-set-piece spike). The
  // biggest rupture lands in the setup and nothing later surpasses it — the
  // climax inherits a conflict that already peaked. Distinct from the suspense-
  // based ESCALATION_PLATEAU/CLIMAX_APPROACH_FLAT and from CONFLICT_CONCENTRATION_
  // SPIKE (single scene ≥60% of mass). Requires 10+ records and 3+ conflict scenes.
  if (records.length >= 10) {
    const mags313 = (records as any[]).map(r =>
      ((r.relationshipShifts as any[] ?? []) as Array<{ amount: number }>)
        .filter(s => s.amount < 0)
        .reduce((acc, s) => acc + Math.abs(s.amount), 0),
    );
    const conflictSceneCount313 = mags313.filter(m => m > 0).length;
    const totalMass313 = mags313.reduce((a, b) => a + b, 0);
    const peakMass313 = Math.max(...mags313);
    const peakIdx313 = mags313.indexOf(peakMass313);
    const half313 = Math.floor(records.length * 0.5);
    if (
      conflictSceneCount313 >= 3 &&
      totalMass313 >= 1.5 &&
      peakMass313 > 0 &&
      peakIdx313 < half313 &&
      peakMass313 < 0.6 * totalMass313
    ) {
      issues.push({
        location: `Scene ${(records as any[])[peakIdx313].sceneIdx} — conflict magnitude peak`,
        rule: 'CONFLICT_MAGNITUDE_PEAK_EARLY',
        severity: 'minor',
        description: `The heaviest relational conflict (magnitude ${peakMass313.toFixed(2)}) falls at Scene ${(records as any[])[peakIdx313].sceneIdx}, in the first half of the story, and nothing later surpasses it. The biggest rupture lands in the setup, so the climax inherits a conflict that already peaked — the back half can only echo a blow the audience has already absorbed.`,
        suggestedFix: 'Reserve the heaviest rupture for the climax. Either soften the early peak so a later confrontation can exceed it, or escalate the back half — a deeper betrayal, a higher-stakes break — so the relational conflict curve rises toward the ending rather than away from it.',
      });
    }
  }

  // ── Wave 313: CONFLICT_RELENTLESS_RUN ────────────────────────────────────
  // Four or more consecutive scenes each carry a negative relationship shift,
  // with no respite scene between them. Unbroken relational conflict exhausts
  // the audience: with no breather, each new rupture lands softer than the last
  // and the pressure flattens into noise. Distinct from NEGATIVE_SPIRAL_UNBROKEN
  // (consecutive negative emotionalShift) and CONFLICT_FATIGUE (rapid reversal
  // oscillation): this tracks an unbroken run on the relationship-shift channel.
  // Requires 8+ records.
  if (records.length >= 8) {
    const isConflict313 = (r: any) =>
      ((r.relationshipShifts as any[] ?? []) as Array<{ amount: number }>).some(s => s.amount <= -0.3);
    let runC313 = 0;
    let startC313 = 0;
    let maxRunC313 = 0;
    let maxStartC313 = 0;
    for (let i313 = 0; i313 < records.length; i313++) {
      if (isConflict313((records as any[])[i313])) {
        if (runC313 === 0) startC313 = i313;
        runC313++;
        if (runC313 > maxRunC313) { maxRunC313 = runC313; maxStartC313 = startC313; }
      } else {
        runC313 = 0;
      }
    }
    if (maxRunC313 >= 4) {
      const s313 = (records as any[])[maxStartC313].sceneIdx;
      const e313 = (records as any[])[maxStartC313 + maxRunC313 - 1].sceneIdx;
      issues.push({
        location: `Scenes ${s313}–${e313} — relentless conflict`,
        rule: 'CONFLICT_RELENTLESS_RUN',
        severity: 'minor',
        description: `${maxRunC313} consecutive scenes (${s313}–${e313}) each carry a negative relationship shift with no respite between them. Unbroken relational conflict exhausts the audience: with no breather, each new rupture lands softer than the last and the mounting pressure flattens into noise rather than building.`,
        suggestedFix: 'Insert a respite within the run — a scene of détente, a shared moment, a temporary alliance — before resuming the conflict. The contrast lets the next rupture register; relentless souring desensitizes the audience to the very damage the story is trying to make them feel.',
      });
    }
  }

  // ── Wave 338: CONFLICT_CLOCK_DECOUPLED, CONFLICT_DRAMATIC_TURN_VOID, CONFLICT_FIRST_HALF_MONOPOLY ──

  // CONFLICT_CLOCK_DECOUPLED (minor, n≥8, ≥2 clock-raised scenes): Two or more scenes
  // raise a deadline (clockRaised === true) and not one of them carries a negative
  // relationship shift — deadlines without relational friction. A ticking clock should
  // pressure the characters, and pressure cracks bonds: characters disagree about how to
  // respond, blame each other for the predicament, or betray one another under the
  // urgency. When every clock scene is relationally placid, the deadline is a prop that
  // creates urgency in the plot while leaving the characters untouched by each other.
  // Distinct from CONFLICT_SUSPENSE_DECOUPLED (suspenseDelta on conflict scenes) and
  // THREAT_AMNESIA (clock forgotten in second half — timing, not relational impact).
  if (records.length >= 8) {
    const clockScenes338 = (records as any[]).filter(r => r.clockRaised === true);
    const isClockConflict338 = (r: any) => ((r.relationshipShifts as any[] ?? []) as Array<{ amount: number }>).some(s => s.amount <= -0.3);
    if (clockScenes338.length >= 2 && !clockScenes338.some(isClockConflict338)) {
      issues.push({
        location: `${clockScenes338.length} clock-raised scene(s) — none carry relational conflict`,
        rule: 'CONFLICT_CLOCK_DECOUPLED',
        severity: 'minor',
        description: `${clockScenes338.length} scenes raise a clock (clockRaised) but none carry a negative relationship shift — deadlines without relational friction. A ticking clock should pressure the people in the story: under time pressure, characters disagree about how to respond, blame each other, make desperate deals, or betray one another. When every clock scene is relationally placid, the deadline is a prop that drives plot urgency while leaving the characters untouched by each other.`,
        suggestedFix: "Let the deadline crack something: a clock scene is an opportunity to reveal what a character will sacrifice under pressure. At least one clock scene should carry a negative relationship shift — the moment urgency forces a choice that damages a bond, making the ticking clock cost something interpersonal as well as practical.",
      });
    }
  }

  // CONFLICT_DRAMATIC_TURN_VOID (minor, n≥10, ≥3 dramatic turn scenes): Three or more
  // scenes contain a genuine dramatic turn (reversal, recognition, or twist — not
  // 'nothing') and not one of them carries a negative relationship shift — pivots
  // that leave every bond intact. A dramatic turn should rearrange the forces in the
  // story, which means rearranging relationships: a reversal that exposes a betrayal,
  // a recognition that shatters a partnership, a twist that creates a new enemy. When
  // the story's turning points are relationally inert, they move the plot without
  // moving the people. Distinct from ARC_TURN_EMOTION_ABSENT (emotion not relationship
  // shifts) and CONFLICT_CURIOSITY_DECOUPLED (curiosity on conflict scenes, not turns).
  if (records.length >= 10) {
    const turnScenes338 = (records as any[]).filter(r => r.dramaticTurn && r.dramaticTurn !== 'nothing');
    const isTurnConflict338 = (r: any) => ((r.relationshipShifts as any[] ?? []) as Array<{ amount: number }>).some(s => s.amount <= -0.3);
    if (turnScenes338.length >= 3 && !turnScenes338.some(isTurnConflict338)) {
      issues.push({
        location: 'Dramatic-turn scenes',
        rule: 'CONFLICT_DRAMATIC_TURN_VOID',
        severity: 'minor',
        description: `${turnScenes338.length} dramatic turn scenes (reversals, recognitions, twists) none of which carry a negative relationship shift — pivots that leave every bond intact. A dramatic turn should rearrange the forces in the story, which means rearranging relationships: a reversal that exposes a betrayal, a recognition that shatters a partnership, a twist that creates a new enemy. When the story's turning points are relationally inert, they move the plot while leaving the people in it unchanged.`,
        suggestedFix: "Give at least one dramatic turn a relational cost: the moment the story changes direction should also be a moment when a relationship changes direction. A turn that costs someone a bond — or reveals that a bond was never what it seemed — lands twice: once in the plot, once in the heart.",
      });
    }
  }

  // CONFLICT_FIRST_HALF_MONOPOLY (minor, n≥10, ≥4 conflict scenes): More than 70%
  // of all conflict scenes (scenes with at least one negative relationship shift of
  // magnitude ≥ 0.3) fall in the first half of the story. All the relational damage
  // is done early, leaving the second half with nothing to escalate against. The
  // climax inherits relationships that have already been battered down rather than
  // bonds still cracking under growing pressure. Distinct from CONFLICT_MAGNITUDE_
  // PEAK_EARLY (the heaviest single rupture in first half — this checks proportion
  // of all conflict scenes), ESCALATION_PLATEAU (peak then stalls — different
  // mechanism), and ANTAGONIST_VANISH (dramatic reversals timing, not relational scenes).
  if (records.length >= 10) {
    const allConflict338 = (records as any[]).filter(r =>
      ((r.relationshipShifts as any[] ?? []) as Array<{ amount: number }>).some(s => s.amount <= -0.3)
    );
    if (allConflict338.length >= 4) {
      const half338 = Math.floor(records.length * 0.5);
      const firstHalfConflict338 = allConflict338.filter(r => (records as any[]).indexOf(r) < half338);
      const ratio338 = firstHalfConflict338.length / allConflict338.length;
      if (ratio338 > 0.7) {
        issues.push({
          location: `${firstHalfConflict338.length} of ${allConflict338.length} conflict scenes in first half (${Math.round(ratio338 * 100)}%)`,
          rule: 'CONFLICT_FIRST_HALF_MONOPOLY',
          severity: 'minor',
          description: `${firstHalfConflict338.length} of ${allConflict338.length} conflict scenes (${Math.round(ratio338 * 100)}%) fall in the first half of the story — all the relational damage is done early and the second half has nothing to escalate against. When the majority of conflict front-loads, the climax arrives after relationships have already been battered down rather than at the moment when bonds are at maximum strain.`,
          suggestedFix: "Redistribute conflict across the arc: hold back some of the most damaging ruptures for the second half so the climax arrives at the worst point in the relationships rather than on the far side of them. The audience should feel that bonds are at their most strained precisely when the story reaches its peak.",
        });
      }
    }
  }

  // ── Wave 352: CONFLICT_PEAK_SUSPENSE_ABSENT, CONFLICT_PEAK_EMOTION_ABSENT, CONFLICT_PEAK_CURIOSITY_ABSENT ──
  // The single heaviest bond-rupture in the story (the conflict scene with the largest
  // negative relationship-shift magnitude) should be its most charged moment. These three
  // checks audit that peak scene on each dramatic channel. Distinct from CONFLICT_SUSPENSE_
  // DECOUPLED / CONFLICT_EMOTION_DECOUPLED / CONFLICT_CURIOSITY_DECOUPLED, which average
  // over ALL conflict scenes — these isolate the single most consequential rupture.
  if (records.length >= 8) {
    const conflictRecs352 = (records as any[]).filter(r =>
      ((r.relationshipShifts ?? []) as Array<{ amount: number }>).some(s => s.amount <= -0.3),
    );
    if (conflictRecs352.length >= 2) {
      let peakRec352: any = null;
      let peakMag352 = 0;
      for (const r of conflictRecs352) {
        const mag = Math.max(
          ...((r.relationshipShifts ?? []) as Array<{ amount: number }>)
            .filter(s => s.amount <= -0.3)
            .map(s => Math.abs(s.amount)),
        );
        if (mag > peakMag352) { peakMag352 = mag; peakRec352 = r; }
      }
      if (peakRec352) {
        if ((peakRec352.suspenseDelta ?? 0) <= 0) {
          issues.push({
            location: `Scene ${peakRec352.sceneIdx} — peak rupture (magnitude ${peakMag352.toFixed(2)})`,
            rule: 'CONFLICT_PEAK_SUSPENSE_ABSENT',
            severity: 'minor',
            description: `The story's heaviest bond-rupture (Scene ${peakRec352.sceneIdx}, magnitude ${peakMag352.toFixed(2)}) carries a suspenseDelta of ${(peakRec352.suspenseDelta ?? 0).toFixed(2)} — the biggest break in the story generates no tension. The most consequential rupture should be the most dangerous-feeling moment, leaving the audience uncertain what the fracture will cost; when it lands tension-flat, the story's central conflict peaks without anyone feeling the stakes.`,
            suggestedFix: 'Stage the heaviest rupture so it threatens something concrete: the break should put a goal, a life, or a future in jeopardy, not just register as a relationship changing state. The single biggest fracture deserves the story\'s highest suspense, not its flattest.',
          });
        }
        if (peakRec352.emotionalShift === 'neutral') {
          issues.push({
            location: `Scene ${peakRec352.sceneIdx} — peak rupture (magnitude ${peakMag352.toFixed(2)})`,
            rule: 'CONFLICT_PEAK_EMOTION_ABSENT',
            severity: 'minor',
            description: `The story's heaviest bond-rupture (Scene ${peakRec352.sceneIdx}, magnitude ${peakMag352.toFixed(2)}) is emotionally neutral — the biggest break leaves the protagonist unmoved. The most consequential fracture in the story should be felt most acutely; when it registers no emotional shift, the rupture reads as a plot adjustment rather than a loss, and the audience is told the bond broke without being made to feel it break.`,
            suggestedFix: 'Let the heaviest rupture wound: the scene where the most important bond breaks should carry the story\'s sharpest emotional charge — grief, betrayal, rage. The magnitude of a break is measured by how much it costs the person at its center.',
          });
        }
        if ((peakRec352.curiosityDelta ?? 0) <= 0) {
          issues.push({
            location: `Scene ${peakRec352.sceneIdx} — peak rupture (magnitude ${peakMag352.toFixed(2)})`,
            rule: 'CONFLICT_PEAK_CURIOSITY_ABSENT',
            severity: 'minor',
            description: `The story's heaviest bond-rupture (Scene ${peakRec352.sceneIdx}, magnitude ${peakMag352.toFixed(2)}) carries a curiosityDelta of ${(peakRec352.curiosityDelta ?? 0).toFixed(2)} — the biggest break raises no questions about what happens next. A major rupture should leave the audience hungry to know how the characters will live with the fracture; when the peak conflict closes a door without opening one, the story's central break is an endpoint rather than a turn.`,
            suggestedFix: 'Make the heaviest rupture generative: the break should open new uncertainties — what each character does now, what the fracture exposes, who they become without the bond. The biggest conflict should propel the story forward, not just register damage.',
          });
        }
      }
    }
  }

  // ── Wave 366: CONFLICT_PEAK_DRAMATIC_TURN_ABSENT, CONFLICT_PEAK_CLOCK_ABSENT, CONFLICT_LATE_FIRST_RUPTURE ──
  // The first two extend the Wave 352 peak-rupture audit to the dramatic-turn and clock
  // channels; the third audits the timing of the story's first rupture.
  if (records.length >= 8) {
    const conflictRecs366 = (records as any[]).filter(r =>
      ((r.relationshipShifts ?? []) as Array<{ amount: number }>).some(s => s.amount <= -0.3),
    );
    if (conflictRecs366.length >= 2) {
      let peakRec366: any = null;
      let peakMag366 = 0;
      for (const r of conflictRecs366) {
        const mag = Math.max(
          ...((r.relationshipShifts ?? []) as Array<{ amount: number }>)
            .filter(s => s.amount <= -0.3)
            .map(s => Math.abs(s.amount)),
        );
        if (mag > peakMag366) { peakMag366 = mag; peakRec366 = r; }
      }
      if (peakRec366) {
        // CONFLICT_PEAK_DRAMATIC_TURN_ABSENT: the heaviest rupture is not a story pivot.
        // Distinct from CONFLICT_DRAMATIC_TURN_VOID (audits whether turn scenes carry a
        // negative shift; this audits whether the peak conflict carries a turn) and from
        // the Wave 352 peak checks (suspense/emotion/curiosity channels).
        if ((peakRec366.dramaticTurn ?? 'nothing') === 'nothing') {
          issues.push({
            location: `Scene ${peakRec366.sceneIdx} — peak rupture (magnitude ${peakMag366.toFixed(2)})`,
            rule: 'CONFLICT_PEAK_DRAMATIC_TURN_ABSENT',
            severity: 'minor',
            description: `The story's heaviest bond-rupture (Scene ${peakRec366.sceneIdx}, magnitude ${peakMag366.toFixed(2)}) carries no dramatic turn — the biggest break is not a story pivot. The single most consequential fracture should reverse, escalate, or recast the situation; when it leaves the plot's trajectory unchanged, the rupture is an event the story passes through rather than a turn the story turns on.`,
            suggestedFix: 'Make the heaviest rupture pivot the story: the break should change what the protagonist is pursuing, expose a new obstacle, or invert an alliance. The biggest fracture in the relational world deserves to be a hinge the plot swings on, not a beat it merely records.',
          });
        }
        // CONFLICT_PEAK_CLOCK_ABSENT: the heaviest rupture adds no time pressure even
        // though the story uses clocks. Distinct from CONFLICT_CLOCK_DECOUPLED (audits
        // whether clock scenes carry conflict; this audits whether the peak conflict
        // raises a clock) and CONFLICT_WITHOUT_DEADLINE.
        const clockScenes366 = (records as any[]).filter(r => r.clockRaised === true);
        if (clockScenes366.length >= 2 && peakRec366.clockRaised !== true) {
          issues.push({
            location: `Scene ${peakRec366.sceneIdx} — peak rupture (magnitude ${peakMag366.toFixed(2)})`,
            rule: 'CONFLICT_PEAK_CLOCK_ABSENT',
            severity: 'minor',
            description: `The story's heaviest bond-rupture (Scene ${peakRec366.sceneIdx}, magnitude ${peakMag366.toFixed(2)}) raises no clock, even though the story uses ${clockScenes366.length} clock-raising scenes elsewhere. The biggest break adds no time pressure — it fractures a bond without tightening the deadline the characters are racing. When the peak conflict and the urgency engine never coincide, the rupture lands in a moment with all the time in the world.`,
            suggestedFix: 'Couple the heaviest rupture to a deadline: let the break that hurts most also shorten the time available — a betrayal that costs a crucial ally just as the clock runs down, a severed bond that forecloses an escape. The biggest fracture is most devastating when there is no time left to repair it.',
          });
        }
      }

      // CONFLICT_LATE_FIRST_RUPTURE (n≥10): the first conflict scene occurs at or after
      // the midpoint — the entire first half is frictionless. Distinct from CONFLICT_
      // OPENING_VOID / CONFLICT_ACT1_ABSENT (the first 25% only) and ELEVENTH_HOUR_
      // CONFLICT (a NEW pair in the final 10%): this fires when no rupture of any kind
      // lands before the 50% mark despite the story containing conflict.
      if (records.length >= 10) {
        const mid366 = Math.floor(records.length * 0.5);
        const firstRuptureIdx366 = conflictRecs366
          .map(r => (records as any[]).indexOf(r))
          .reduce((min, i) => Math.min(min, i), Infinity);
        if (firstRuptureIdx366 >= mid366) {
          issues.push({
            location: `First rupture at Scene ${(records as any[])[firstRuptureIdx366].sceneIdx} (at or past the midpoint)`,
            rule: 'CONFLICT_LATE_FIRST_RUPTURE',
            severity: 'minor',
            description: `The story's first relational rupture lands at Scene ${(records as any[])[firstRuptureIdx366].sceneIdx}, at or past the midpoint — the entire first half is frictionless. With ${conflictRecs366.length} conflict scenes in the story, all of them fall in the back half, so the setup and first complication zone establish the world and the relationships without ever straining a bond. The audience reaches the midpoint with no felt conflict to invest in.`,
            suggestedFix: 'Introduce a rupture in the first half: even a small friction — a broken promise, an eroded trust, a clash of goals — gives the audience a relational stake before the story starts breaking things in earnest. A first half with no conflict trains the audience to expect calm exactly when the story should be teaching them to worry.',
          });
        }
      }
    }
  }

  // ── Wave 380: CONFLICT_ACT2A_VOID, CONFLICT_SECOND_HALF_MONOPOLY, CONFLICT_REVELATION_DECOUPLED ──
  {
    const isConflictScene380 = (r: any): boolean =>
      ((r.relationshipShifts ?? []) as Array<{ amount: number }>).some(s => s.amount <= -0.3);
    const conflictRecs380 = (records as any[]).filter(isConflictScene380);

    // CONFLICT_ACT2A_VOID (minor, n≥10, ≥2 conflict scenes): No rupture lands in Act 2a
    // (25%–50%), even though the story contains conflict elsewhere. The first half of the
    // complication zone — where the protagonist should already be under rising pressure
    // after the inciting incident — is frictionless. Fills the Act-zone set alongside
    // CONFLICT_ACT1_ABSENT (Act 1), CONFLICT_ACT2B_VOID (50%–75%), CONFLICT_MIDPOINT_ABSENT
    // (40%–60%), and CONFLICT_ACT3_ABSENT (final 25%).
    if (records.length >= 10 && conflictRecs380.length >= 2) {
      const a2aStart380 = Math.floor(records.length * 0.25);
      const a2aEnd380 = Math.floor(records.length * 0.5);
      const a2aRecs380 = (records as any[]).slice(a2aStart380, a2aEnd380);
      if (a2aRecs380.length >= 2 && !a2aRecs380.some(isConflictScene380)) {
        issues.push({
          location: `Act 2a (Scenes ${a2aStart380}–${a2aEnd380 - 1}) — no rupture`,
          rule: 'CONFLICT_ACT2A_VOID',
          severity: 'minor',
          description: `No relational rupture occurs in Act 2a (Scenes ${a2aStart380}–${a2aEnd380 - 1}), though the story contains conflict elsewhere. The first half of the complication zone — where the protagonist should already be under rising pressure after the inciting incident — is frictionless, so the story coasts from setup toward the midpoint without the early escalation that earns the audience's worry.`,
          suggestedFix: 'Plant a rupture in Act 2a: an early alliance strained, a trust tested, a first cost paid. The stretch right after the inciting incident should be where the conflict starts biting — a frictionless Act 2a lets the tension go slack precisely where it should begin to climb.',
        });
      }
    }

    // CONFLICT_SECOND_HALF_MONOPOLY (minor, n≥8, ≥3 conflict scenes): More than 70% of
    // the story's ruptures fall in the second half. Conflict arrives late and concentrates
    // toward the climax, so the front half plays without relational friction and the back
    // half carries all the strain at once. The distribution mirror of CONFLICT_FIRST_HALF_
    // MONOPOLY (>70% in the first half); distinct from CONFLICT_LATE_FIRST_RUPTURE (the
    // binary case — the FIRST rupture falls past the midpoint) and CONFLICT_ACT1_ABSENT /
    // CONFLICT_OPENING_VOID (zone checks): this fires even when the first half has some
    // conflict, as long as it is a small minority.
    if (records.length >= 8 && conflictRecs380.length >= 3) {
      const mid380 = Math.floor(records.length * 0.5);
      const secondHalf380 = conflictRecs380.filter(r => (records as any[]).indexOf(r) >= mid380).length;
      if (secondHalf380 / conflictRecs380.length > 0.7) {
        issues.push({
          location: `Conflict distribution — ${secondHalf380}/${conflictRecs380.length} ruptures in the back half`,
          rule: 'CONFLICT_SECOND_HALF_MONOPOLY',
          severity: 'minor',
          description: `${secondHalf380} of the story's ${conflictRecs380.length} ruptures (${Math.round(secondHalf380 / conflictRecs380.length * 100)}%) fall in the second half — conflict arrives late and concentrates toward the climax. The front half plays with little relational friction and the back half carries all the strain at once, so the audience is asked to invest in bonds the first half never showed under pressure.`,
          suggestedFix: 'Move some ruptures earlier: seed friction in the first half so the relationships the back half breaks have already been shown to be fragile. Conflict distributed across the arc builds continuously; conflict dumped into the second half makes the opening feel inert and the ending feel rushed.',
        });
      }
    }

    // CONFLICT_REVELATION_DECOUPLED (minor, n≥8, ≥2 ruptures, ≥2 revelations): The story's
    // ruptures and its revelations never share a scene — bonds break in scenes that disclose
    // nothing, and truths surface in scenes that fracture no bond. The two engines run on
    // separate tracks, so a rupture never IS a revelation (a betrayal exposed) and a
    // revelation never costs a relationship. Sibling of CONFLICT_CLOCK_DECOUPLED (rupture ×
    // clock); distinct from belief.ts REVELATION_RELATIONSHIP_DECOUPLED (no revelation has
    // ANY relationship shift — this targets negative ruptures specifically and fires even
    // when revelations coincide with positive shifts).
    if (records.length >= 8) {
      const revScenes380 = (records as any[]).filter(r => r.revelation !== null && r.revelation !== undefined);
      if (conflictRecs380.length >= 2 && revScenes380.length >= 2 && !conflictRecs380.some(r => r.revelation !== null && r.revelation !== undefined)) {
        issues.push({
          location: 'Ruptures × revelations — decoupled',
          rule: 'CONFLICT_REVELATION_DECOUPLED',
          severity: 'minor',
          description: `The story has ${conflictRecs380.length} ruptures and ${revScenes380.length} revelations, but none share a scene — bonds break in scenes that disclose nothing, and truths surface in scenes that fracture no bond. The rupture engine and the disclosure engine run separately, so a betrayal never lands as a revelation and a revelation never costs a relationship, forfeiting the doubled charge of a truth that breaks a bond in the same beat.`,
          suggestedFix: 'Fuse at least one rupture with a revelation: the moment a hidden truth surfaces should also be the moment a bond fractures — the lie exposed that ends the friendship, the secret revealed that severs the alliance. When disclosure and rupture coincide, each makes the other land harder.',
        });
      }
    }
  }

  // ── Wave 394: CONFLICT_CLUE_DECOUPLED, CONFLICT_PAYOFF_DECOUPLED, CONFLICT_RUPTURE_AFTERMATH_VOID ──

  // CONFLICT_CLUE_DECOUPLED (minor, n≥8, ≥3 conflict scenes, ≥2 clue-seeding scenes):
  // Every scene that seeds a clue (seededClueIds non-empty) is relationally inert — none
  // of the story's rupture scenes plant anything for the audience to carry forward.
  // Confrontations are closed events: they wound without opening a new thread, leaving the
  // audience with damage but no forward pull from the highest-stakes scenes.
  // Distinct from CONFLICT_REVELATION_DECOUPLED (revelation signal — disclosure of existing
  // secrets, not planting new seeds; seededClueIds vs. the revelation property), from
  // CONFLICT_CURIOSITY_DECOUPLED (average curiosityDelta ≤ 0 on conflict scenes — a
  // quantitative channel measure, not a co-occurrence check on the seeding signal), and
  // from CONFLICT_DRAMATIC_TURN_VOID (turn scenes × rupture — different signal pair).
  if (records.length >= 8) {
    const clueScenes394a = (records as any[]).filter(r => ((r.seededClueIds ?? []) as string[]).length > 0);
    const conflictRecs394a = (records as any[]).filter(r =>
      ((r.relationshipShifts ?? []) as Array<{ amount: number }>).some(s => s.amount <= -0.3),
    );
    if (clueScenes394a.length >= 2 && conflictRecs394a.length >= 3) {
      const anyConflictSeeds394a = conflictRecs394a.some(r => ((r.seededClueIds ?? []) as string[]).length > 0);
      if (!anyConflictSeeds394a) {
        issues.push({
          location: 'Conflict scenes — clue-seeding decoupled',
          rule: 'CONFLICT_CLUE_DECOUPLED',
          severity: 'minor',
          description: `The story seeds ${clueScenes394a.length} clue(s), but none of the ${conflictRecs394a.length} conflict scenes (negative relationship shifts) plant anything — confrontations are closed events that wound without opening new threads. The highest-stakes scenes carry no forward narrative momentum: they terminate rather than seed, leaving the audience with damage but nothing to carry into the next scene.`,
          suggestedFix: 'Let at least one rupture plant a clue the audience will carry forward: the fight that exposes half a secret, the betrayal that names one conspirator but not the other, the severed bond that seeds an unanswered question. A conflict that seeds a clue turns damage into momentum — the wound becomes a thread.',
        });
      }
    }
  }

  // CONFLICT_PAYOFF_DECOUPLED (minor, n≥8, ≥2 conflict scenes, ≥2 payoff scenes):
  // Every payoff scene (payoffSetupIds non-empty) is relationally inert — the scenes
  // where planted setups are delivered contain no relational rupture. The story resolves
  // its foreshadowing in scenes where no bond breaks, missing the doubled impact of a
  // planted seed that blooms at the moment of maximum relational strain.
  // Distinct from CONFLICT_CLUE_DECOUPLED (seededClueIds — seeding, not delivering),
  // CONFLICT_REVELATION_DECOUPLED (revelation property vs. payoffSetupIds; revelation is a
  // specific scene annotation, payoff delivery is a separate seeding-pair signal), and the
  // Wave 352 peak-rupture audit (single-peak isolation, not co-occurrence mode).
  if (records.length >= 8) {
    const payoffScenes394b = (records as any[]).filter(r => ((r.payoffSetupIds ?? []) as string[]).length > 0);
    const conflictRecs394b = (records as any[]).filter(r =>
      ((r.relationshipShifts ?? []) as Array<{ amount: number }>).some(s => s.amount <= -0.3),
    );
    if (payoffScenes394b.length >= 2 && conflictRecs394b.length >= 2) {
      const payoffInConflict394b = payoffScenes394b.some(r =>
        ((r.relationshipShifts ?? []) as Array<{ amount: number }>).some(s => s.amount <= -0.3),
      );
      if (!payoffInConflict394b) {
        issues.push({
          location: 'Payoff scenes × conflict — decoupled',
          rule: 'CONFLICT_PAYOFF_DECOUPLED',
          severity: 'minor',
          description: `${payoffScenes394b.length} payoff scenes deliver planted setups, but none coincide with a relational rupture — the story resolves its foreshadowing in scenes where no bond breaks. Payoffs that cost nobody a relationship miss the doubled impact available when a planted seed blooms at the moment of maximum relational strain: the payoff lands, and so does the fracture.`,
          suggestedFix: 'Fuse at least one payoff with a rupture: the scene where a planted secret is finally disclosed or a foreshadowed threat is finally realized should also be the scene where a relationship reaches its breaking point. When payoff and rupture coincide, each makes the other land harder — the audience simultaneously gets what it was promised and loses what it feared losing.',
        });
      }
    }
  }

  // CONFLICT_RUPTURE_AFTERMATH_VOID (minor, n≥8, ≥1 major rupture): A major relational
  // rupture (single negative shift ≤ -0.5) is followed by 2 scenes where the same pair
  // registers no shift at all and both scenes are emotionally neutral — the wound lands
  // and the relationship goes silent. The rupture is inflicted and immediately absorbed as
  // though it registered in the ledger but in nobody's body.
  // Distinct from REVERSAL_WITHOUT_CONSEQUENCE (Wave 183: suspense reversal target, not
  // relational rupture; aftermath check is broad — any of emotion/clock/shift/suspense,
  // not per-pair silence), CONFLICT_RECOVERY_TOO_FAST (Wave 243: looks for fast positive
  // suspense recovery within 2 scenes — the opposite failure; this checks for NO follow-up
  // at all in the relationship channel), and RECONCILIATION_ABSENT (Wave 257: story-level
  // no-repair across the whole arc; this targets the immediate 2-scene aftermath per pair).
  if (records.length >= 8) {
    for (let i394c = 0; i394c < records.length - 2; i394c++) {
      const r394c = (records as any[])[i394c];
      const shifts394c = ((r394c.relationshipShifts ?? []) as Array<{ pairKey: string; amount: number }>);
      const majorRupture394c = shifts394c.find(s => s.amount <= -0.5);
      if (!majorRupture394c) continue;
      const afterScenes394c = (records as any[]).slice(i394c + 1, i394c + 3);
      const isVoid394c = afterScenes394c.length === 2 && afterScenes394c.every(a => {
        const pairShift = ((a.relationshipShifts ?? []) as Array<{ pairKey: string; amount: number }>)
          .find(s => s.pairKey === majorRupture394c.pairKey);
        return !pairShift && a.emotionalShift === 'neutral';
      });
      if (isVoid394c) {
        issues.push({
          location: `Scene ${r394c.sceneIdx} — rupture (${majorRupture394c.pairKey}, shift: ${majorRupture394c.amount.toFixed(2)})`,
          rule: 'CONFLICT_RUPTURE_AFTERMATH_VOID',
          severity: 'minor',
          description: `The major rupture between "${majorRupture394c.pairKey}" at Scene ${r394c.sceneIdx} (shift: ${majorRupture394c.amount.toFixed(2)}) is followed by 2 scenes where that pair has no further shifts and both scenes are emotionally neutral — the wound lands in a relational vacuum. The story inflicts the damage and the relationship goes silent: no echo, no recoil, no acknowledgement. When a rupture leaves the pair and the emotional register both unchanged for two consecutive scenes, the audience concludes the damage didn't really land.`,
          suggestedFix: 'Let the rupture echo in the next two scenes: a cold exchange between the pair, an emotional reaction that names what was lost, or a shift in that bond — even a tentative one — that confirms the wound registered. The scene after a major break is where the audience learns whether to believe the damage was real.',
        });
        break;
      }
    }
  }

  // ── Wave 408: CONFLICT_PEAK_REVELATION_ABSENT, CONFLICT_PEAK_PAYOFF_ABSENT, CONFLICT_PEAK_SEED_ABSENT ──
  // Extend the Wave 352/366 peak-rupture audit to the revelation, payoff, and clue-seed channels.
  // The "heaviest rupture" is the conflict scene with the largest single negative shift magnitude.
  if (records.length >= 8) {
    const conflictRecs408 = (records as any[]).filter(r =>
      ((r.relationshipShifts ?? []) as Array<{ amount: number }>).some(s => s.amount <= -0.3),
    );
    if (conflictRecs408.length >= 2) {
      let peakRec408: any = null;
      let peakMag408 = 0;
      for (const r of conflictRecs408) {
        const mag = Math.max(
          ...((r.relationshipShifts ?? []) as Array<{ amount: number }>)
            .filter(s => s.amount <= -0.3)
            .map(s => Math.abs(s.amount)),
        );
        if (mag > peakMag408) { peakMag408 = mag; peakRec408 = r; }
      }
      if (peakRec408) {
        // CONFLICT_PEAK_REVELATION_ABSENT: the heaviest rupture discloses nothing, even though
        // the story has revelations elsewhere — the biggest break surfaces no truth. Distinct
        // from CONFLICT_REVELATION_DECOUPLED (co-occurrence: NO rupture shares a scene with a
        // revelation; this can fire even when some lesser rupture does, as long as the PEAK
        // one does not) and the Wave 352/366 peak checks (other channels).
        const revScenes408 = (records as any[]).filter(r => r.revelation !== null && r.revelation !== undefined);
        if (revScenes408.length >= 2 && (peakRec408.revelation === null || peakRec408.revelation === undefined)) {
          issues.push({
            location: `Scene ${peakRec408.sceneIdx} — peak rupture (magnitude ${peakMag408.toFixed(2)})`,
            rule: 'CONFLICT_PEAK_REVELATION_ABSENT',
            severity: 'minor',
            description: `The story's heaviest bond-rupture (Scene ${peakRec408.sceneIdx}, magnitude ${peakMag408.toFixed(2)}) carries no revelation, even though the story discloses ${revScenes408.length} truths in other scenes. The single most consequential fracture surfaces nothing — the biggest break is not the moment a hidden truth comes out. When the peak conflict and the disclosure engine never coincide, the audience watches the deepest wound land without learning anything from it.`,
            suggestedFix: 'Let the heaviest rupture reveal something: the betrayal that exposes a long-held secret, the fight that forces a confession, the break that finally makes a buried truth speakable. A rupture that also discloses is doubly charged — the relationship breaks and the audience\'s understanding lurches forward in the same beat.',
          });
        }
        // CONFLICT_PEAK_PAYOFF_ABSENT: the heaviest rupture pays off no setup, even though the
        // story delivers payoffs elsewhere — the biggest break collects on no promise. Distinct
        // from CONFLICT_PAYOFF_DECOUPLED (co-occurrence: NO payoff scene carries a rupture; this
        // audits whether the single peak rupture is also a payoff).
        const payoffScenes408 = (records as any[]).filter(r => ((r.payoffSetupIds ?? []) as any[]).length > 0);
        if (payoffScenes408.length >= 2 && ((peakRec408.payoffSetupIds ?? []) as any[]).length === 0) {
          issues.push({
            location: `Scene ${peakRec408.sceneIdx} — peak rupture (magnitude ${peakMag408.toFixed(2)})`,
            rule: 'CONFLICT_PEAK_PAYOFF_ABSENT',
            severity: 'minor',
            description: `The story's heaviest bond-rupture (Scene ${peakRec408.sceneIdx}, magnitude ${peakMag408.toFixed(2)}) pays off no planted setup, even though ${payoffScenes408.length} other scenes deliver payoffs. The single biggest break collects on no promise the story made — the fracture that costs the most is not the one that resolves a thread the audience was tracking. The peak of relational damage and the peak of structural satisfaction never coincide.`,
            suggestedFix: 'Make the heaviest rupture pay something off: the break that hurts most should also be the moment a planted seed blooms — the foreshadowed betrayal arriving at last, the threat the audience was warned about finally severing the bond it threatened. A rupture that resolves a setup turns relational pain into structural catharsis.',
          });
        }
        // CONFLICT_PEAK_SEED_ABSENT: the heaviest rupture seeds no clue, even though the story
        // plants clues elsewhere — the biggest break opens no thread. Distinct from CONFLICT_
        // CLUE_DECOUPLED (co-occurrence: NO rupture seeds a clue; this audits whether the single
        // peak rupture seeds one).
        const seedScenes408 = (records as any[]).filter(r => ((r.seededClueIds ?? []) as any[]).length > 0);
        if (seedScenes408.length >= 2 && ((peakRec408.seededClueIds ?? []) as any[]).length === 0) {
          issues.push({
            location: `Scene ${peakRec408.sceneIdx} — peak rupture (magnitude ${peakMag408.toFixed(2)})`,
            rule: 'CONFLICT_PEAK_SEED_ABSENT',
            severity: 'minor',
            description: `The story's heaviest bond-rupture (Scene ${peakRec408.sceneIdx}, magnitude ${peakMag408.toFixed(2)}) seeds no clue, even though ${seedScenes408.length} other scenes plant threads. The single most consequential fracture opens nothing forward — the biggest break terminates a bond without leaving the audience a new question to carry. When the peak conflict plants no seed, the story's deepest wound generates no momentum.`,
            suggestedFix: 'Let the heaviest rupture plant a thread: the break that hurts most should also open a new unknown — the betrayal that hints at a wider conspiracy, the severed alliance that raises the question of who the protagonist can now trust. A rupture that seeds a clue turns an ending into a beginning, converting relational loss into forward pull.',
          });
        }
      }
    }
  }

  // ── Wave 422: CONFLICT_RUPTURE_CAUSE_VOID, CONFLICT_AFTERMATH_CURIOSITY_VOID, CONFLICT_PAIR_SHIFT_IMBALANCE ──

  // CONFLICT_RUPTURE_CAUSE_VOID (minor, n≥8, ≥2 conflict scenes): No conflict scene (negative
  // relationship shift ≤ -0.3) has an upstream cause in itself or the scene immediately before
  // it — no revelation, no dramatic turn, no clock raise, no seeded clue, and no prior positive
  // shift (which would create expectation and thus potential provocation). Every rupture in the
  // story arrives as an authorial decree: a bond breaks without any visible pressure that would
  // cause it to break. Audiences accept relational ruptures only when they can feel the force
  // that caused the break; ruptures without provocation read as arbitrary writer interventions
  // rather than as consequences of accumulating conflict. Backward-cause mode × rupture channel.
  // Distinct from DRAMATIC_TURN_WITHOUT_CAUSE (causality pass: turn scenes — not rupture scenes),
  // DEUS_EX_MACHINA (causality: late plot-closing revelation, not relationship rupture), and
  // CONFLICT_RUPTURE_AFTERMATH_VOID (Wave 394: the downstream aftermath of ruptures — this audits
  // the upstream provocation that precedes them).
  if (records.length >= 8) {
    const ruptureRecs422a = (records as any[]).filter(r =>
      ((r.relationshipShifts ?? []) as Array<{ amount: number }>).some(s => s.amount <= -0.3),
    );
    if (ruptureRecs422a.length >= 2) {
      const isDriver422a = (r: any): boolean =>
        r.revelation !== null ||
        (r.dramaticTurn ?? 'nothing') !== 'nothing' ||
        r.clockRaised === true ||
        ((r.seededClueIds ?? []) as any[]).length > 0 ||
        ((r.relationshipShifts ?? []) as any[]).some((s: any) => (s.amount ?? 0) > 0);
      const anyHasCause422a = ruptureRecs422a.some((r: any) => {
        const idx = (records as any[]).indexOf(r);
        return isDriver422a(r) || (idx > 0 && isDriver422a((records as any[])[idx - 1]));
      });
      if (!anyHasCause422a) {
        issues.push({
          location: `${ruptureRecs422a.length} conflict scene(s) — no upstream cause`,
          rule: 'CONFLICT_RUPTURE_CAUSE_VOID',
          severity: 'minor',
          description: `All ${ruptureRecs422a.length} of the story's conflict scenes (bond-ruptures ≤ -0.3) arrive without any upstream cause — no revelation, no dramatic turn, no deadline raised, no clue planted, no prior positive shift in themselves or the scene before. Every rupture is an authorial decree: bonds break without visible provocation. Audiences accept relational ruptures when they can feel the force that caused the break; without it, each fracture reads as an arbitrary writer intervention rather than as the consequence of accumulating pressure.`,
          suggestedFix: 'Give each rupture a cause in its own scene or the one before: a secret surfacing, a turn that changes the dynamic, a deadline that forces a choice, a planted threat that detonates. Relational fractures land as inevitable rather than arbitrary when the audience can trace the pressure that produced them — cause first, then break.',
        });
      }
    }
  }

  // CONFLICT_AFTERMATH_CURIOSITY_VOID (minor, n≥8, ≥2 conflict scenes): Every scene with a
  // major relationship rupture (≤ -0.3) is followed by two scenes where curiosityDelta ≤ 0 —
  // breaking bonds never opens new questions. When a relationship fractures, the audience should
  // immediately wonder: will it be repaired? Who caused this? What happens next between them?
  // A rupture that closes the curiosity channel in both of its subsequent scenes teaches the
  // audience that relational damage is a dead end rather than a story generator. Sequence/aftermath
  // mode × curiosity. Distinct from CONFLICT_RUPTURE_AFTERMATH_VOID (Wave 394: checks neutral
  // emotion and no relationship shift in the aftermath — the curiosity channel is NOT checked
  // there), CONFLICT_CURIOSITY_DECOUPLED (Wave 313: avg curiosityDelta of conflict scenes
  // themselves ≤ 0 — the scene of rupture, not the aftermath), and CURIOSITY_SPIKE_NO_FALLOUT
  // (causality pass: forward-looking — what FOLLOWS a curiosity spike; this is backward-looking
  // — what follows a rupture).
  if (records.length >= 8) {
    const ruptureRecs422b = (records as any[]).filter(r =>
      ((r.relationshipShifts ?? []) as Array<{ amount: number }>).some(s => s.amount <= -0.3),
    );
    if (ruptureRecs422b.length >= 2) {
      const allFlatAftermath422b = ruptureRecs422b.every((r: any) => {
        const idx = (records as any[]).indexOf(r);
        for (let off = 1; off <= 2; off++) {
          if (idx + off >= records.length) continue;
          if (((records as any[])[idx + off].curiosityDelta ?? 0) > 0) return false;
        }
        return true;
      });
      if (allFlatAftermath422b) {
        issues.push({
          location: 'All rupture aftermath scenes — curiosity flat',
          rule: 'CONFLICT_AFTERMATH_CURIOSITY_VOID',
          severity: 'minor',
          description: `Every bond-rupture in the story (${ruptureRecs422b.length} conflict scene(s)) is followed by two scenes with no curiosity rise — breaking bonds never opens new questions. When a relationship fractures, the audience should immediately wonder what happens next between those characters: will the bond be repaired, who is to blame, what secret now becomes speakable? Ruptures that generate no forward curiosity teach the audience that relational damage is a dead end rather than a generator of new story energy.`,
          suggestedFix: 'Let each rupture raise at least one question in the scene that follows: the character who was betrayed wonders whether to tell anyone; an alliance breaks and it is suddenly unclear who can be trusted; a wound opens and the audience is left wondering whether it will heal. Relational damage should create questions, not silence.',
        });
      }
    }
  }

  // CONFLICT_PAIR_SHIFT_IMBALANCE (minor, n≥8, ≥3 pairs with negative shifts): One relationship
  // pair accounts for more than 65% of the story's total negative-shift magnitude while at least
  // two other pairs also carry negative shifts. When the overwhelming majority of relational
  // damage concentrates in a single dyad, the story's conflict is structurally myopic: one
  // relationship bears the entire dramatic burden while other bonds are present but barely
  // stressed. The audience invests in the primary pair but has little relational concern for
  // anyone else. Average/aggregate × pair distribution. Distinct from CONFLICT_PAIR_DENSITY_GAP
  // (Wave 271: one pair's scene count is 3× any other — a scene-count ratio, not magnitude
  // proportion), RELATIONAL_SYMMETRY_ABSENT (one-sided reciprocity within a pair), and SINGLE_
  // REGISTER (all shifts in one emotional dimension regardless of pair).
  if (records.length >= 8) {
    const negShifts422c: Array<{ pairKey: string; mag: number }> = [];
    for (const r of records as any[]) {
      for (const s of (r.relationshipShifts ?? []) as any[]) {
        if ((s.amount ?? 0) < 0) negShifts422c.push({ pairKey: String(s.pairKey ?? 'unknown'), mag: Math.abs(s.amount) });
      }
    }
    const pairKeys422c = new Set(negShifts422c.map(s => s.pairKey));
    if (pairKeys422c.size >= 3) {
      const totalMag422c = negShifts422c.reduce((sum, s) => sum + s.mag, 0);
      const magByPair422c = new Map<string, number>();
      for (const s of negShifts422c) magByPair422c.set(s.pairKey, (magByPair422c.get(s.pairKey) ?? 0) + s.mag);
      let maxPairMag422c = 0;
      let maxPairKey422c = '';
      for (const [k, v] of magByPair422c) { if (v > maxPairMag422c) { maxPairMag422c = v; maxPairKey422c = k; } }
      if (maxPairMag422c / totalMag422c > 0.65) {
        issues.push({
          location: `Pair "${maxPairKey422c}" — ${Math.round(maxPairMag422c / totalMag422c * 100)}% of total conflict magnitude`,
          rule: 'CONFLICT_PAIR_SHIFT_IMBALANCE',
          severity: 'minor',
          description: `One relationship pair ("${maxPairKey422c}") accounts for ${Math.round(maxPairMag422c / totalMag422c * 100)}% of the story's total negative-shift magnitude, while ${pairKeys422c.size - 1} other pair(s) also carry conflict. When one dyad bears the overwhelming majority of relational damage, the story's conflict is structurally myopic: the audience invests in that pair but has little relational concern for anyone else, and the supporting bonds feel decorative rather than dramatically stressed.`,
          suggestedFix: `Distribute relational damage more evenly across the story's pairs: let the bonds outside "${maxPairKey422c}" carry some of the dramatic weight — a secondary trust broken, an alliance strained, a peripheral friendship that pays a cost for the story's central conflict. When multiple relationships are under pressure simultaneously, the audience's relational investment widens and the stakes feel structural rather than personal.`,
        });
      }
    }
  }

  // ── Wave 436: CONFLICT_POSITIVE_SPIRAL, CONFLICT_RUPTURE_SUSPENSE_VOID, CONFLICT_BREATHING_ROOM_ABSENT ──

  // CONFLICT_POSITIVE_SPIRAL (minor, n≥8, ≥2 ruptures, maxPositiveRun≥3): Three or more
  // consecutive scenes each carry at least one positive relationship shift, while the story
  // also has ≥2 rupture scenes (negative shift ≤ -0.3). The relational world warms for an
  // unbroken stretch of ≥3 scenes, removing dramatic friction from the relationship layer
  // for that span. Conflict lives in contrast: a bond improving matters only against a
  // background of bonds under stress. When the relational world enters a long uninterrupted
  // upswing, the audience loses its grip on tension — there is nothing relational to fear
  // breaking because everything is visibly warming. Run-based mode × positive-shift channel.
  // The complement of CONFLICT_RELENTLESS_RUN (Wave 313: ≥4 consecutive scenes with a
  // negative shift — the pressure mirror of this check) and NEGATIVE_SPIRAL_UNBROKEN (Wave
  // 285: same, negative direction). Distinct from ARC_RELATIONAL_POSITIVE_ONLY (character-arc
  // pass: ALL shifts globally are positive — this fires on a LOCAL run of warmth, not the
  // global absence of negativity) and ARC_POSITIVE_EMOTION_RUN (emotional shifts, not
  // relational shifts): this is the first positive-relational-run check in the conflict pass.
  if (records.length >= 8) {
    const ruptureCount436a = (records as any[]).filter(r =>
      ((r.relationshipShifts ?? []) as Array<{ amount: number }>).some(s => (s.amount ?? 0) <= -0.3),
    ).length;
    if (ruptureCount436a >= 2) {
      let maxPosRun436a = 0;
      let curPosRun436a = 0;
      let maxPosStart436a = -1;
      let curPosStart436a = -1;
      for (let i = 0; i < records.length; i++) {
        const hasPos = ((records as any[])[i].relationshipShifts ?? [] as any[]).some(
          (s: any) => (s.amount ?? 0) > 0,
        );
        if (hasPos) {
          if (curPosRun436a === 0) curPosStart436a = i;
          if (++curPosRun436a > maxPosRun436a) {
            maxPosRun436a = curPosRun436a;
            maxPosStart436a = curPosStart436a;
          }
        } else {
          curPosRun436a = 0;
        }
      }
      if (maxPosRun436a >= 3) {
        issues.push({
          location: `Scenes ${maxPosStart436a}–${maxPosStart436a + maxPosRun436a - 1} — positive relationship spiral`,
          rule: 'CONFLICT_POSITIVE_SPIRAL',
          severity: 'minor',
          description: `${maxPosRun436a} consecutive scenes (${maxPosStart436a}–${maxPosStart436a + maxPosRun436a - 1}) each carry a positive relationship shift while the story also has ${ruptureCount436a} rupture scenes. The relational world warms for ${maxPosRun436a} scenes without interruption. Conflict lives in contrast — a bond improving matters only against a background of bonds under stress. An extended upswing without friction teaches the audience that the relational world is safe, draining the tension from every scene in the spiral.`,
          suggestedFix: 'Interrupt the warmth: introduce a complication, a misunderstanding, or a small fracture within the positive spiral so the upswing feels earned against resistance rather than uncontested. A single scene of relational friction within the spiral makes the warmth around it feel more fragile and therefore more meaningful.',
        });
      }
    }
  }

  // CONFLICT_RUPTURE_SUSPENSE_VOID (minor, n≥8, ≥2 ruptures): Every scene with a major
  // relationship rupture (negative shift ≤ -0.3) is followed by two scenes where suspenseDelta
  // ≤ 0 — bond-breaking never escalates the story's tension. When a bond fractures the
  // audience expects stakes to rise: who did this, what will the protagonist do, what is now
  // at risk? When every rupture is followed by flat or declining suspense, the conflict layer
  // teaches the audience that breaking bonds has no escalatory consequence. Sequence/aftermath
  // mode × suspense channel. Parallel to CONFLICT_AFTERMATH_CURIOSITY_VOID (Wave 422: the
  // curiosity channel aftermath of ruptures), distinct from it by channel (suspenseDelta vs
  // curiosityDelta). Distinct from CONFLICT_SUSPENSE_DECOUPLED (Wave 285: average suspense
  // of conflict scenes themselves — this checks the AFTERMATH suspense, not the scene of
  // rupture itself) and CONFLICT_PEAK_SUSPENSE_ABSENT (Wave 352: the peak-rupture scene's
  // own suspenseDelta — single-peak, not aftermath): this is the first check to audit the
  // suspense channel in the two scenes following each rupture.
  if (records.length >= 8) {
    const ruptureRecs436b = (records as any[]).filter(r =>
      ((r.relationshipShifts ?? []) as Array<{ amount: number }>).some(s => (s.amount ?? 0) <= -0.3),
    );
    if (ruptureRecs436b.length >= 2) {
      const allFlatSusp436b = ruptureRecs436b.every((r: any) => {
        const idx = (records as any[]).indexOf(r);
        for (let off = 1; off <= 2; off++) {
          if (idx + off >= records.length) continue;
          if (((records as any[])[idx + off].suspenseDelta ?? 0) > 0) return false;
        }
        return true;
      });
      if (allFlatSusp436b) {
        issues.push({
          location: 'All rupture aftermath scenes — suspense flat',
          rule: 'CONFLICT_RUPTURE_SUSPENSE_VOID',
          severity: 'minor',
          description: `Every bond-rupture in the story (${ruptureRecs436b.length} conflict scene(s)) is followed by two scenes with no suspense rise — breaking bonds never escalates the story's tension. When a relationship fractures, the audience expects stakes to rise: who is responsible, what must the protagonist do next, what is now at risk? When every rupture is followed by flat or declining suspense, the conflict layer teaches the audience that breaking bonds has no escalatory consequence, and conflict loses its forward pull.`,
          suggestedFix: 'Let each rupture raise suspense in the scene that follows: make the cost of the broken bond immediately visible — a new vulnerability exposed, a protection lost, a counter-move the protagonist must now fear. Relational damage should make the world more dangerous, not quieter; the scene after the break should be the scene where the audience leans forward wondering what it means.',
        });
      }
    }
  }

  // CONFLICT_BREATHING_ROOM_ABSENT (minor, n≥10, ≥4 ruptures, maxGap≤1): The story has ≥4
  // rupture scenes and the maximum gap between any two consecutive ruptures is ≤1 non-rupture
  // scene — every bond-break is followed almost immediately by another. No two ruptures allow
  // the audience more than one scene of non-conflict before the next fracture. The audience
  // needs processing room between relational breaks: the scene that absorbs a rupture's
  // impact, where characters regroup and the audience registers what was lost, before the
  // next break arrives. When the gap is always ≤1 scene, the story delivers a sequence of
  // rapid-fire ruptures with no breathing space for any individual break to register as a
  // distinct emotional event — the audience numbs to conflict because it never stops.
  // Distribution/timing mode × rupture spacing. Distinct from CONFLICT_RELENTLESS_RUN (Wave
  // 313: ≥4 CONSECUTIVE rupture scenes with zero gap — this fires when the maximum gap is
  // ≤1, catching the case where ruptures are separated by exactly one calm scene rather than
  // being literally consecutive, a different population and a gentler but still problematic
  // distribution) and NEGATIVE_SPIRAL_UNBROKEN (Wave 285: ≥4 consecutive negative SHIFTS —
  // the same consecutive-run concept): BREATHING_ROOM_ABSENT fires when the maximum between-
  // rupture gap is ≤1, which CONFLICT_RELENTLESS_RUN never catches.
  if (records.length >= 10) {
    const rupturePositions436c: number[] = [];
    for (let i = 0; i < records.length; i++) {
      if (((records as any[])[i].relationshipShifts ?? [] as any[]).some((s: any) => (s.amount ?? 0) <= -0.3)) {
        rupturePositions436c.push(i);
      }
    }
    if (rupturePositions436c.length >= 4) {
      let maxGap436c = 0;
      for (let k = 1; k < rupturePositions436c.length; k++) {
        const gap = rupturePositions436c[k] - rupturePositions436c[k - 1] - 1;
        if (gap > maxGap436c) maxGap436c = gap;
      }
      if (maxGap436c <= 1) {
        issues.push({
          location: `${rupturePositions436c.length} ruptures — max gap ≤ ${maxGap436c} scene`,
          rule: 'CONFLICT_BREATHING_ROOM_ABSENT',
          severity: 'minor',
          description: `The story has ${rupturePositions436c.length} bond-ruptures and the maximum gap between any two consecutive ones is ${maxGap436c} non-conflict scene(s) — every rupture is followed almost immediately by another. The audience never gets more than one scene to absorb a break before the next fracture arrives. Without breathing room, individual ruptures lose their distinctiveness: the audience numbs to conflict because it never pauses, and what should be the sharpest relational breaks blend into an undifferentiated rhythm of damage.`,
          suggestedFix: 'Spread ruptures further apart: after a significant bond-break, allow at least two or three scenes before the next one. The scene that absorbs a rupture\'s impact — where characters regroup, where the audience registers what was lost — is not inert. It is where the audience internalizes the cost of the break, so the next fracture lands against that accumulated weight rather than in an already-numb environment.',
        });
      }
    }
  }

  // ── Wave 450: CONFLICT_CLOCK_AFTERMATH_VOID, CONFLICT_POSITIVE_EMOTION_RUPTURE, CONFLICT_RUPTURE_CLOCK_AFTERMATH_VOID ──

  // CONFLICT_CLOCK_AFTERMATH_VOID (minor, n≥8, ≥2 clock scenes): Every clock-raised scene is
  // followed by 2 scenes with no escalating conflict signal — no reversal (suspenseDelta < -1)
  // and no negative relationship shift (≤ -0.3) in either aftermath scene. The deadline is
  // raised but never detonates: after each clock tick the story returns to calm without the
  // crisis the deadline was supposed to force. When every clock raise is absorbed into silence,
  // the audience stops believing the ticking clock is real. Sequence/aftermath mode × clock
  // channel. Distinct from CONFLICT_CLOCK_DECOUPLED (Wave 338: audits whether clock scenes
  // carry relational conflict IN the same scene — this audits the 2 scenes FOLLOWING each clock
  // raise), THREAT_AMNESIA (Wave 158: clock not raised in second half — a zone/timing check, not
  // aftermath), CONFLICT_WITHOUT_DEADLINE (no clock at all — opposite failure): this is the first
  // check to audit what conflict follows each clock raise.
  if (records.length >= 8) {
    const clockRecs450a = (records as any[]).filter(r => r.clockRaised === true);
    if (clockRecs450a.length >= 2) {
      const isConflictSignal450a = (r: any): boolean =>
        (r.suspenseDelta ?? 0) < -1 ||
        ((r.relationshipShifts ?? []) as Array<{ amount: number }>).some(s => s.amount <= -0.3);
      const allSilentAftermath450a = clockRecs450a.every((r: any) => {
        const idx = (records as any[]).indexOf(r);
        for (let off = 1; off <= 2; off++) {
          if (idx + off >= records.length) continue;
          if (isConflictSignal450a((records as any[])[idx + off])) return false;
        }
        return true;
      });
      if (allSilentAftermath450a) {
        issues.push({
          location: `${clockRecs450a.length} clock scene(s) — all followed by silent aftermath`,
          rule: 'CONFLICT_CLOCK_AFTERMATH_VOID',
          severity: 'minor',
          description: `All ${clockRecs450a.length} clock-raised scene(s) are each followed by 2 scenes with no escalating conflict — no reversal, no negative relationship shift. The deadline is raised but never detonates: after each clock tick the story returns to calm without the crisis the clock was supposed to force. When every deadline is absorbed into silence, the audience stops believing the ticking clock is real and braces for nothing.`,
          suggestedFix: 'Let a clock raise trigger conflict in the immediate aftermath: a reversal that follows the deadline announcement, a relationship that fractures under the new urgency, or an antagonist action prompted by the ticking. The scene or two after a clock raise should be where the deadline bites — deadline pressure must translate into dramatic escalation, or the clock is scenery.',
        });
      }
    }
  }

  // CONFLICT_POSITIVE_EMOTION_RUPTURE (minor, n≥8, ≥3 conflict scenes): Every scene with a
  // negative relationship shift (≤ -0.3) carries a POSITIVE emotional shift — characters feel
  // good in every scene where a bond is breaking. The emotional and relational channels are
  // inverted: each confrontation that fractures a relationship is staged as a moment of elation,
  // triumph, or relief. The audience is told a bond is breaking while simultaneously seeing that
  // nobody minds — relational damage registered in the ledger but not in any character's body.
  // Co-occurrence mode × positive valence × rupture channel. Distinct from CONFLICT_EMOTION_
  // DECOUPLED (Wave 299: all-neutral emotionalShift in conflict scenes — a different valence
  // failure; neutral means nobody reacts, positive means everyone reacts in the wrong direction),
  // CONFLICT_SUSPENSE_DECOUPLED (suspense channel, not emotion), and POSITIVE_SPIRAL_TRAP (Wave
  // 210: a run of positive emotionalShift globally, not restricted to conflict scenes): this is
  // the first check to audit the positive-emotion/rupture inversion where every fight is staged
  // as a win.
  if (records.length >= 8) {
    const conflictRecs450b = (records as any[]).filter(r =>
      ((r.relationshipShifts ?? []) as Array<{ amount: number }>).some(s => s.amount <= -0.3),
    );
    if (conflictRecs450b.length >= 3 && conflictRecs450b.every(r => (r as any).emotionalShift === 'positive')) {
      issues.push({
        location: 'Conflict scenes — emotionally positive inversion',
        rule: 'CONFLICT_POSITIVE_EMOTION_RUPTURE',
        severity: 'minor',
        description: `All ${conflictRecs450b.length} conflict scenes (negative relationship shifts) carry a positive emotional shift — characters feel good in every scene where a bond is breaking. The emotional and relational channels are inverted: each confrontation that fractures a relationship is staged as elation, triumph, or relief. Relational damage appears in the ledger but in nobody's body; the audience is told bonds are breaking while seeing that nobody minds. When conflict is consistently wrapped in positive feeling, the ruptures lose their weight — the story cannot make the audience grieve what the characters seem to enjoy losing.`,
        suggestedFix: "Let conflict cost something emotionally: at least one scene where a bond fractures should leave the characters — and therefore the audience — feeling the loss, the anger, or the grief. A rupture staged in a positive emotional register reads as a victory or a relief, not as damage. The emotional channel and the relational channel should usually align in conflict scenes, not contradict each other.",
      });
    }
  }

  // CONFLICT_RUPTURE_CLOCK_AFTERMATH_VOID (minor, n≥8, ≥2 ruptures, ≥2 clock scenes): Every
  // scene with a negative relationship shift (≤ -0.3) is followed by 2 scenes with no clock
  // raised — bond-breaking never tightens the story's deadline. When a relationship fractures,
  // the audience expects the world to become more urgent as well as more damaged: the loss of an
  // ally should shorten the time available, a betrayal exposed should trigger a countdown.
  // When every rupture is followed by clock silence, breaking bonds has no temporal consequence —
  // the conflict engine and the urgency engine run on separate tracks. Sequence/aftermath mode ×
  // clock channel × rupture aftermath. Completes the aftermath-channel set alongside CONFLICT_
  // AFTERMATH_CURIOSITY_VOID (Wave 422: curiosity channel) and CONFLICT_RUPTURE_SUSPENSE_VOID
  // (Wave 436: suspense channel) — three aftermath checks, one per non-relational channel.
  // Distinct from CONFLICT_CLOCK_DECOUPLED (Wave 338: in-scene relational content of clock
  // raises — not aftermath) and THREAT_AMNESIA (Wave 158: timing of clock in second half,
  // not rupture-specific): requires ≥2 clock scenes to confirm the story uses urgency but
  // just not in the wake of its relational fractures.
  if (records.length >= 8) {
    const ruptureRecs450c = (records as any[]).filter(r =>
      ((r.relationshipShifts ?? []) as Array<{ amount: number }>).some(s => s.amount <= -0.3),
    );
    const clockScenes450c = (records as any[]).filter(r => r.clockRaised === true);
    if (ruptureRecs450c.length >= 2 && clockScenes450c.length >= 2) {
      const allDeadClockAftermath450c = ruptureRecs450c.every((r: any) => {
        const idx = (records as any[]).indexOf(r);
        for (let off = 1; off <= 2; off++) {
          if (idx + off >= records.length) continue;
          if ((records as any[])[idx + off].clockRaised === true) return false;
        }
        return true;
      });
      if (allDeadClockAftermath450c) {
        issues.push({
          location: 'All rupture aftermath scenes — clock silent',
          rule: 'CONFLICT_RUPTURE_CLOCK_AFTERMATH_VOID',
          severity: 'minor',
          description: `Every bond-rupture in the story (${ruptureRecs450c.length} conflict scene(s)) is followed by 2 scenes with no clock raised — breaking bonds never tightens the story's deadline. The loss of an ally, an exposed betrayal, or a severed bond should make the world more urgent as well as more damaged: relational fractures are supposed to close off options and shorten the time the protagonist has to act. The story uses ${clockScenes450c.length} clock-raising scenes but none fall in the wake of a rupture.`,
          suggestedFix: 'Let at least one rupture trigger a clock raise in the scene that follows: the betrayal that removes a protector and immediately shortens a deadline, the severed bond that forecloses the easiest escape and starts a countdown. Bond-breaking should make things more urgent — the scene after a rupture is where the audience should feel that the damage is also a timer.',
        });
      }
    }
  }

  // ── Wave 464: CONFLICT_RUPTURE_REVELATION_AFTERMATH_VOID, CONFLICT_RUPTURE_DRAMATIC_TURN_AFTERMATH_VOID, CONFLICT_PEAK_RUPTURE_UNCAUSED ──

  // CONFLICT_RUPTURE_REVELATION_AFTERMATH_VOID (sequence/aftermath × revelation channel, n≥8,
  // ≥2 ruptures, ≥2 revelations): Every scene with a negative relationship shift (≤ -0.3) is
  // followed by 2 scenes with no revelation, even though the story discloses truths elsewhere.
  // Bond-breaking never leads to discovery: a betrayal exposed, an alliance severed, or a trust
  // broken should crack something open — force a truth into the light in its wake. When every
  // rupture's aftermath is revelation-silent, the conflict engine and the disclosure engine run
  // on separate tracks: relationships fracture and truths surface, but a fracture never causes a
  // truth to surface.
  // Distinctness: CONFLICT_REVELATION_DECOUPLED (Wave 380) audits whether rupture scenes carry a
  // revelation IN THE SAME scene — this audits the 2 scenes FOLLOWING each rupture. Completes the
  // aftermath-channel set alongside CONFLICT_AFTERMATH_CURIOSITY_VOID (Wave 422), CONFLICT_RUPTURE_
  // SUSPENSE_VOID (Wave 436), and CONFLICT_RUPTURE_CLOCK_AFTERMATH_VOID (Wave 450) by adding the
  // revelation channel. Requires ≥2 revelations to confirm the story does disclose, just never in
  // the wake of a rupture.
  if (records.length >= 8) {
    const ruptureRecs464a = (records as any[]).filter(r =>
      ((r.relationshipShifts ?? []) as Array<{ amount: number }>).some(s => s.amount <= -0.3),
    );
    const revScenes464a = (records as any[]).filter(r => r.revelation !== null && r.revelation !== undefined);
    if (ruptureRecs464a.length >= 2 && revScenes464a.length >= 2) {
      const allRevSilentAftermath464a = ruptureRecs464a.every((r: any) => {
        const idx = (records as any[]).indexOf(r);
        for (let off = 1; off <= 2; off++) {
          if (idx + off >= records.length) continue;
          const next = (records as any[])[idx + off];
          if (next.revelation !== null && next.revelation !== undefined) return false;
        }
        return true;
      });
      if (allRevSilentAftermath464a) {
        issues.push({
          location: `${ruptureRecs464a.length} rupture aftermath(s) — no revelation within 2 scenes`,
          rule: 'CONFLICT_RUPTURE_REVELATION_AFTERMATH_VOID',
          severity: 'minor',
          description: `Every bond-rupture (${ruptureRecs464a.length} conflict scene(s)) is followed by 2 scenes with no revelation, even though the story discloses ${revScenes464a.length} truths elsewhere. Bond-breaking never leads to discovery: a betrayal exposed, an alliance severed, or a trust broken should crack something open and force a truth into the light in its wake. When every rupture's aftermath is revelation-silent, the conflict engine and the disclosure engine run on separate tracks — relationships fracture and truths surface, but a fracture never causes a truth to surface.`,
          suggestedFix: `Let at least one rupture detonate a revelation in its aftermath: the betrayal that, once it lands, forces a hidden truth out; the severed bond whose breaking exposes what was being concealed. A fracture that surfaces a discovery makes the conflict productive — the break is not just damage but the pressure that finally cracks something open.`,
        });
      }
    }
  }

  // CONFLICT_RUPTURE_DRAMATIC_TURN_AFTERMATH_VOID (sequence/aftermath × dramatic-turn channel,
  // n≥8, ≥2 ruptures, ≥2 turns): Every scene with a negative relationship shift (≤ -0.3) is
  // followed by 2 scenes with no dramatic turn, even though the story pivots elsewhere. A rupture
  // is a natural engine of reversal — the loss of an ally, the discovery of a betrayal, or the
  // collapse of a partnership should be able to turn the story's direction. When every fracture's
  // aftermath is turn-silent, bond-breaking is dramatically inert: relationships shatter but the
  // story's trajectory never bends because of it.
  // Distinctness: CONFLICT_DRAMATIC_TURN_VOID (Wave 367) audits whether rupture scenes carry a
  // dramatic turn IN THE SAME scene — this audits the 2 scenes FOLLOWING each rupture. Extends the
  // aftermath-channel set (curiosity/suspense/clock/revelation) with the dramatic-turn channel.
  // Distinct from CONFLICT_PEAK_DRAMATIC_TURN_ABSENT (Wave 394, single-peak in-scene check).
  // Requires ≥2 turns to confirm the story does pivot, just never in a rupture's wake.
  if (records.length >= 8) {
    const ruptureRecs464b = (records as any[]).filter(r =>
      ((r.relationshipShifts ?? []) as Array<{ amount: number }>).some(s => s.amount <= -0.3),
    );
    const turnScenes464b = (records as any[]).filter(r => (r.dramaticTurn ?? 'nothing') !== 'nothing');
    if (ruptureRecs464b.length >= 2 && turnScenes464b.length >= 2) {
      const allTurnSilentAftermath464b = ruptureRecs464b.every((r: any) => {
        const idx = (records as any[]).indexOf(r);
        for (let off = 1; off <= 2; off++) {
          if (idx + off >= records.length) continue;
          if (((records as any[])[idx + off].dramaticTurn ?? 'nothing') !== 'nothing') return false;
        }
        return true;
      });
      if (allTurnSilentAftermath464b) {
        issues.push({
          location: `${ruptureRecs464b.length} rupture aftermath(s) — no dramatic turn within 2 scenes`,
          rule: 'CONFLICT_RUPTURE_DRAMATIC_TURN_AFTERMATH_VOID',
          severity: 'minor',
          description: `Every bond-rupture (${ruptureRecs464b.length} conflict scene(s)) is followed by 2 scenes with no dramatic turn, even though the story pivots ${turnScenes464b.length} times elsewhere. A rupture is a natural engine of reversal — the loss of an ally, a betrayal discovered, or a partnership collapsing should be able to bend the story's direction. When every fracture's aftermath is turn-silent, bond-breaking is dramatically inert: relationships shatter but the trajectory of the story never changes because of it.`,
          suggestedFix: `Let at least one rupture trigger a dramatic turn in its aftermath: the broken alliance that forces the protagonist onto a new path, the betrayal that flips the goal, the severed bond that recasts what the story is about. A fracture that turns the story makes the relational damage consequential — the break does not just hurt, it redirects.`,
        });
      }
    }
  }

  // CONFLICT_PEAK_RUPTURE_UNCAUSED (single-peak isolation × backward-cause mode, n≥8, ≥2 ruptures,
  // peak at record position ≥1): The single heaviest rupture — the scene carrying the largest
  // negative relationship-shift magnitude — has no escalation (suspenseDelta > 0), revelation,
  // dramatic turn, or clock raise in either of the two scenes before it. The story's deepest
  // fracture arrives without preparation: the bond that breaks hardest does so with no rising
  // pressure, no precipitating discovery, and no pivot leading into it. A major rupture should be
  // the culmination of accumulating strain; when the biggest one appears from a calm run-up, it
  // reads as an authorial decree rather than the breaking point of a tension that was visibly
  // building.
  // Distinctness: CONFLICT_RUPTURE_CAUSE_VOID (Wave 422) audits ALL ruptures in aggregate against
  // their own scene or the single prior scene — this ISOLATES the single heaviest rupture and looks
  // back TWO scenes for a richer set of causal drivers. The CONFLICT_PEAK_* checks (Waves 352/366/
  // 394/408) audit the peak rupture's IN-SCENE channels (does the peak itself disclose, pivot,
  // etc.); this audits what PRECEDES the peak. First check in this pass to combine single-peak
  // isolation with backward-cause, paralleling ARC_PEAK_RELATIONAL_UNCAUSED in character-arc.ts.
  if (records.length >= 8) {
    let peakPos464c = -1;
    let peakMag464c = 0;
    for (let i = 0; i < records.length; i++) {
      const negMag = ((records as any[])[i].relationshipShifts ?? [] as Array<{ amount: number }>)
        .filter((s: { amount: number }) => s.amount < 0)
        .reduce((m: number, s: { amount: number }) => Math.max(m, Math.abs(s.amount)), 0);
      if (negMag > peakMag464c) { peakMag464c = negMag; peakPos464c = i; }
    }
    const ruptureCount464c = (records as any[]).filter(r =>
      ((r.relationshipShifts ?? []) as Array<{ amount: number }>).some(s => s.amount <= -0.3),
    ).length;
    if (peakPos464c >= 1 && peakMag464c >= 0.3 && ruptureCount464c >= 2) {
      let hasCause464c = false;
      for (let off = 1; off <= 2; off++) {
        const priorIdx = peakPos464c - off;
        if (priorIdx < 0) continue;
        const prior = (records as any[])[priorIdx];
        if ((prior.suspenseDelta ?? 0) > 0) hasCause464c = true;
        if (prior.revelation !== null && prior.revelation !== undefined) hasCause464c = true;
        if ((prior.dramaticTurn ?? 'nothing') !== 'nothing') hasCause464c = true;
        if (prior.clockRaised === true) hasCause464c = true;
      }
      if (!hasCause464c) {
        const peakRec464c = (records as any[])[peakPos464c];
        issues.push({
          location: `Scene ${peakRec464c.sceneIdx} — heaviest rupture (magnitude ${peakMag464c.toFixed(2)})`,
          rule: 'CONFLICT_PEAK_RUPTURE_UNCAUSED',
          severity: 'minor',
          description: `The story's heaviest rupture (Scene ${peakRec464c.sceneIdx}, negative-shift magnitude ${peakMag464c.toFixed(2)}) has no escalation, revelation, dramatic turn, or clock raise in either of the two scenes before it — the deepest fracture arrives without preparation. The bond that breaks hardest does so with no rising pressure, no precipitating discovery, and no pivot leading into it. A major rupture should be the culmination of accumulating strain; when the biggest one appears out of a calm run-up, it reads as an authorial decree rather than the breaking point of a tension the audience watched build.`,
          suggestedFix: `Build a gradient into the heaviest rupture: in the two scenes before the story's deepest fracture, plant the pressure that makes it inevitable — a rising suspense beat, a revelation that exposes the fault line, a turn that forces the confrontation, or a clock that makes the break unavoidable. The biggest break should land as the snap of a strain the audience felt tightening, not as a sudden severing from nowhere.`,
        });
      }
    }
  }

  // ── Wave 478: CONFLICT_RUPTURE_TEMPORAL_CLUSTER, CONFLICT_POSITIVE_EMOTION_AFTERMATH_VOID, CONFLICT_REPAIR_UNCAUSED ──
  const n478 = records.length;

  // CONFLICT_RUPTURE_TEMPORAL_CLUSTER — Distribution/timing × rupture channel (n≥8, ≥4 rupture
  // scenes, >75% in a single third). The story's bond-breaking events cluster in one structural
  // zone, leaving the other two-thirds without any relational friction. When ruptures concentrate
  // in one third, the conflict engine has only one gear in that zone and is absent from the others:
  // the audience experiences a zone of relentless fracture surrounded by relational peace.
  // Conflict works best when it punctuates all three structural phases — early ruptures establish
  // the stakes, mid-script ruptures escalate them, and late ruptures force the final reckoning.
  // Distinct from: CONFLICT_FIRST_HALF_MONOPOLY (Wave 338: >70% in first half — binary partition;
  // this uses thirds with a 75% threshold and fires when any third dominates, including the
  // middle or closing), CONFLICT_SECOND_HALF_MONOPOLY (Wave 380: binary second-half — same
  // limitation), CONFLICT_BREATHING_ROOM_ABSENT (Wave 436: spacing between consecutive ruptures
  // — a micro-window proximity check, not a zone-distribution check).
  if (n478 >= 8) {
    const rupturePositions478a = (records as any[])
      .map((r, pos) => ({
        pos,
        isRupture: ((r.relationshipShifts ?? []) as Array<{ amount: number }>).some(s => s.amount < 0),
      }))
      .filter(x => x.isRupture)
      .map(x => x.pos);
    if (rupturePositions478a.length >= 4) {
      const third478a = Math.floor(n478 / 3);
      const firstZ478a = rupturePositions478a.filter(p => p < third478a).length;
      const midZ478a = rupturePositions478a.filter(p => p >= third478a && p < 2 * third478a).length;
      const lastZ478a = rupturePositions478a.filter(p => p >= 2 * third478a).length;
      const maxZ478a = Math.max(firstZ478a, midZ478a, lastZ478a);
      if (maxZ478a / rupturePositions478a.length > 0.75) {
        const zone478a = firstZ478a === maxZ478a ? 'opening' : midZ478a === maxZ478a ? 'middle' : 'closing';
        issues.push({
          location: `${maxZ478a}/${rupturePositions478a.length} rupture scene(s) in the ${zone478a} third`,
          rule: 'CONFLICT_RUPTURE_TEMPORAL_CLUSTER',
          severity: 'minor',
          description: `${maxZ478a} of ${rupturePositions478a.length} rupture scenes (${(maxZ478a / rupturePositions478a.length * 100).toFixed(0)}%) fall within the ${zone478a} third — the conflict engine is architecturally ghettoized into one structural zone. The other two-thirds of the script pass without any relational friction: the audience experiences either relentless fracture (in the cluster zone) or relational peace (in the empty zones), but not the graduated escalation that makes conflict feel like a pressure building toward a reckoning. Ruptures distributed across all three structural phases accomplish different things: early ruptures establish the cost of the story's stakes, mid-script ruptures escalate and test the bonds that remain, and late ruptures force the final confrontation before resolution.`,
          suggestedFix: `Redistribute at least one or two ruptures into the zones currently without relational conflict. Even a smaller, earlier fracture — a moment of friction, betrayal, or withdrawal — seeds the zones currently empty of conflict and makes the whole arc feel like a sustained dramatic pressure rather than a burst surrounded by calm.`,
        });
      }
    }
  }

  // CONFLICT_POSITIVE_EMOTION_AFTERMATH_VOID — Sequence/aftermath × rupture × positive emotion
  // aftermath (n≥8, ≥3 qualifying major ruptures not in last 2 positions). Every major rupture
  // (negative shift ≤ -0.3) is followed by 2 scenes in which no positive emotional beat appears.
  // Bond-breaking never precedes any emotional recovery or relief: the aftermath of every fracture
  // is uniformly grim or neutral with no positive moment following in the near wake. Dramatic
  // ruptures are most affecting when they are part of a larger emotional arc — the break is felt,
  // reacted to, and eventually followed by some counter-movement, however brief or partial.
  // Distinct from: CONFLICT_AFTERMATH_CURIOSITY_VOID (Wave 422: rupture → no new curiosity),
  // CONFLICT_RUPTURE_SUSPENSE_VOID (Wave 436: rupture → no suspense rise), CONFLICT_RUPTURE_CLOCK_
  // AFTERMATH_VOID (Wave 450: rupture → no clock), CONFLICT_RUPTURE_REVELATION_AFTERMATH_VOID /
  // CONFLICT_RUPTURE_DRAMATIC_TURN_AFTERMATH_VOID (Wave 464: rupture → no revelation/turn) — all
  // the existing aftermath channels; this is the positive-emotion channel, completing the set by
  // checking whether ruptures are ever followed by any emotional brightening.
  if (n478 >= 8) {
    const majorRuptures478b = (records as any[]).filter(r =>
      ((r.relationshipShifts ?? []) as Array<{ amount: number }>).some(s => s.amount <= -0.3),
    );
    const qualRuptures478b = majorRuptures478b.filter(r => {
      const pos478b = records.findIndex(x => x.sceneIdx === r.sceneIdx);
      return pos478b >= 0 && pos478b < n478 - 2;
    });
    if (qualRuptures478b.length >= 3) {
      const allAftermathNonPositive478b = qualRuptures478b.every(r => {
        const pos478b = records.findIndex(x => x.sceneIdx === r.sceneIdx);
        for (let off = 1; off <= 2; off++) {
          const nextIdx478b = pos478b + off;
          if (nextIdx478b >= n478) break;
          if (((records as any[])[nextIdx478b].emotionalShift ?? 'neutral') === 'positive') return false;
        }
        return true;
      });
      if (allAftermathNonPositive478b) {
        issues.push({
          location: `${qualRuptures478b.length} major rupture aftermath(s) — no positive emotional beat within 2 scenes`,
          rule: 'CONFLICT_POSITIVE_EMOTION_AFTERMATH_VOID',
          severity: 'minor',
          description: `Every major rupture (${qualRuptures478b.length} qualifying bond-breaks) is followed by two scenes in which no positive emotion appears — bond-breaking is never followed by any emotional relief, recovery, or counter-movement. When every fracture's aftermath is uniformly grim or flat, the story's emotional world after a conflict is permanently depressed: there is no "exhale" after any break, no brief positive turn that shows the characters regrouping. Dramatic ruptures are most affecting when they trigger an arc in what follows — the break is felt, processed, and eventually tested against some moment of partial recovery or relief that shows whether anything survived.`,
          suggestedFix: `After at least one major rupture, introduce a positive emotional moment in the 2-scene aftermath: a character who finds brief relief, a moment of connection after the break, or a small triumph that carries the story forward despite the fracture. The positive moment doesn't neutralize the rupture — it creates the contrast that makes the break more costly by showing what was at stake.`,
        });
      }
    }
  }

  // CONFLICT_REPAIR_UNCAUSED — Backward-cause × positive relational shift (n≥8, ≥2 scenes with
  // positive relationship shifts, each at position ≥ 2). Every scene where a bond warms or repairs
  // has no major rupture, revelation, or dramatic turn in its 2 preceding scenes — reconciliations
  // and relational repairs are systematically spontaneous. A repaired bond is most dramatically
  // resonant when it is earned: preceded by a fracture that motivated the reckoning, a truth
  // revealed that changed the equation, or a pivot that forced the characters together. When every
  // repair arrives without a visible prior cause, reconciliations feel like authorial gifts rather
  // than dramatically earned resolutions of conflict.
  // Distinct from: CONFLICT_RUPTURE_CAUSE_VOID (Wave 422: backward-cause × ALL negative shifts —
  // audits ruptures as the effect; this audits POSITIVE SHIFTS as the effect), CONFLICT_PEAK_
  // RUPTURE_UNCAUSED (Wave 464: backward-cause × the single NEGATIVE peak — this checks ALL
  // positive shifts), ARC_RECONCILIATION_ABSENT (Wave 257: no broken bond ever repairs — that
  // checks absence of positive shift; here positive shifts exist but are systematically uncaused).
  if (n478 >= 8) {
    const posShiftScenes478c = (records as any[]).filter(r =>
      ((r.relationshipShifts ?? []) as Array<{ amount: number }>).some(s => s.amount > 0),
    );
    const qualPosShift478c = posShiftScenes478c.filter(r => {
      const pos478c = records.findIndex(x => x.sceneIdx === r.sceneIdx);
      return pos478c >= 2;
    });
    if (qualPosShift478c.length >= 2) {
      const allRepairsUncaused478c = qualPosShift478c.every(r => {
        const pos478c = records.findIndex(x => x.sceneIdx === r.sceneIdx);
        for (let off = 1; off <= 2; off++) {
          const priorIdx478c = pos478c - off;
          if (priorIdx478c < 0) continue;
          const prior478c = (records as any[])[priorIdx478c];
          if (((prior478c.relationshipShifts ?? []) as Array<{ amount: number }>).some(s => s.amount <= -0.3)) return false;
          if (prior478c.revelation !== null && prior478c.revelation !== undefined) return false;
          if ((prior478c.dramaticTurn ?? 'nothing') !== 'nothing') return false;
        }
        return true;
      });
      if (allRepairsUncaused478c) {
        issues.push({
          location: `${qualPosShift478c.length} positive-shift scene(s) — no prior causal driver within 2 scenes`,
          rule: 'CONFLICT_REPAIR_UNCAUSED',
          severity: 'minor',
          description: `Every scene where a bond warms or repairs (${qualPosShift478c.length} positive relationship shifts) has no major rupture, revelation, or dramatic turn in the two preceding scenes — every reconciliation is systematically spontaneous. A repaired bond is most dramatically resonant when it is earned: preceded by a fracture that forced the reckoning, a truth revealed that changed the equation, or a pivot that brought the characters together. When every repair arrives without visible prior cause, reconciliation reads as an authorial gift rather than a hard-won dramatic resolution — the bonds warm for no reason the audience has watched unfold.`,
          suggestedFix: `Plant a causal driver before at least one positive relational shift: a fracture in the prior scene that the positive shift begins to resolve, a revelation that reframes who the characters are to each other, or a dramatic turn that forces them to cooperate. A repair earned by prior conflict or revelation makes the warming of the bond feel possible and meaningful; one that arrives from a calm run-up reads as sentiment rather than drama.`,
        });
      }
    }
  }

  // ── Wave 492: CONFLICT_DRAMATIC_TURN_REPAIR_DECOUPLED, CONFLICT_CLOSING_SUSPENSE_VOID, CONFLICT_CALM_STRETCH ──

  // CONFLICT_DRAMATIC_TURN_REPAIR_DECOUPLED (minor, n≥8, ≥2 turn scenes, ≥2 repair scenes):
  // Story pivots (scenes with a dramatic turn ≠ 'nothing') never coincide with a bond-warming
  // moment (positive relationship shift ≥ +0.3). When the plot turns, relationships stay cold;
  // when bonds warm, nothing structurally pivots. Structural pivots are most resonant when they
  // also shift the relational landscape — a turn that simultaneously warms a bond doubles its
  // impact. Distinctness: CONFLICT_DRAMATIC_TURN_VOID (Wave 338) audits turn scenes for absent
  // NEGATIVE shifts (pivots that don't crack bonds); this audits turn scenes for absent POSITIVE
  // shifts (pivots that don't heal bonds). CONFLICT_REPAIR_UNCAUSED (Wave 478) checks backward-
  // cause before repair scenes; this checks the IN-SCENE channel (turn present in same scene as
  // positive shift). First co-occurrence check joining the turn and positive-shift channels.
  {
    const n492a = records.length;
    if (n492a >= 8) {
      const turnScenes492a = (records as any[]).filter(r =>
        (r.dramaticTurn ?? 'nothing') !== 'nothing' && r.dramaticTurn !== '',
      );
      const repairScenes492a = (records as any[]).filter(r =>
        ((r.relationshipShifts ?? []) as Array<{ amount: number }>).some(s => s.amount >= 0.3),
      );
      if (turnScenes492a.length >= 2 && repairScenes492a.length >= 2) {
        const repairSceneIdxs492a = new Set(repairScenes492a.map((r: any) => r.sceneIdx));
        const anyTurnRepair492a = turnScenes492a.some((r: any) => repairSceneIdxs492a.has(r.sceneIdx));
        if (!anyTurnRepair492a) {
          issues.push({
            location: `${turnScenes492a.length} dramatic-turn scene(s) — no positive relationship shift`,
            rule: 'CONFLICT_DRAMATIC_TURN_REPAIR_DECOUPLED',
            severity: 'minor',
            description: `The story has ${turnScenes492a.length} dramatic-turn scene(s) and ${repairScenes492a.length} repair scene(s) (positive relationship shift ≥ +0.3) but none overlap — when the plot pivots, no bond warms, and when bonds warm, nothing pivots. Structural turns are most resonant when they also shift the relational landscape: a dramatic turn that simultaneously repairs a bond doubles its impact, making the story's pivot both a plot event and an emotional event. When the two engines run on entirely separate tracks, neither feels as consequential as it could — the turn is purely mechanical, the repair is purely sentimental.`,
            suggestedFix: `Let at least one dramatic-turn scene also carry a positive relationship shift: a pivot that reveals an ally was hiding their loyalty, a turn that forces two estranged characters to cooperate and warms their bond in the process, or a reversal that removes an external threat and allows a reconciliation. A turn and a repair happening in the same scene compound each other's dramatic weight.`,
          });
        }
      }
    }
  }

  // CONFLICT_CLOSING_SUSPENSE_VOID (minor, n≥9): The final third has no scene with a positive
  // suspenseDelta (no rising tension in the home stretch) while the first two-thirds contain
  // at least 2 such scenes. The climax approach carries no new escalating tension build —
  // suspense is generated in the opening and middle but then exhausted or absent as the story
  // moves toward resolution, leaving the finale without the visceral urgency of rising stakes.
  // Distinctness: ESCALATION_PLATEAU (Wave 144) compares first-half peak suspense vs second-half
  // average — an average-aggregate check; this is a zone check on the presence of any positive
  // suspense in the final third vs prior zones. CONFLICT_ACT3_ABSENT (Wave 257) audits the
  // final 25% for any conflict signal (suspense or relational); this is specifically escalating
  // suspense (positive suspenseDelta) in the final 33%. CLIMAX_APPROACH_FLAT audits the last
  // 3 scenes vs overall average; this audits the full final third for zero escalation instances.
  {
    const n492b = records.length;
    if (n492b >= 9) {
      const third492b = Math.floor(n492b / 3);
      const openMid492b = (records as any[]).slice(0, 2 * third492b);
      const closing492b = (records as any[]).slice(2 * third492b);
      const openMidPosSuspense492b = openMid492b.filter(r => (r.suspenseDelta ?? 0) > 0).length;
      const closingPosSuspense492b = closing492b.filter(r => (r.suspenseDelta ?? 0) > 0).length;
      if (openMidPosSuspense492b >= 2 && closingPosSuspense492b === 0) {
        issues.push({
          location: `Closing third (scenes ${2 * third492b}–${n492b - 1}) — no positive suspenseDelta`,
          rule: 'CONFLICT_CLOSING_SUSPENSE_VOID',
          severity: 'minor',
          description: `The final third of the story (scenes ${2 * third492b}–${n492b - 1}) contains no scene with rising suspense (positive suspenseDelta), even though ${openMidPosSuspense492b} suspense-escalating scene(s) exist in the opening and middle. The climax approach carries no new tension build — the home stretch generates no visceral urgency. Suspense is an audience-facing signal of mounting threat; when it vanishes in the final third while the earlier acts used it freely, the story's closing movement risks feeling like a release from tension rather than its peak. The final third should carry the story's highest sustained suspense, not its lowest.`,
          suggestedFix: `Introduce at least one scene in the final third that escalates suspense — a threat that tightens, a revelation that raises the stakes, a confrontation that forces the protagonist into a position with no easy exit. The closing act should feel like pressure accumulating toward an inevitable breaking point, not like a wind-down from the tensions the earlier acts established.`,
        });
      }
    }
  }

  // CONFLICT_CALM_STRETCH (minor, n≥10, ≥4 conflict scenes): The longest consecutive run of
  // non-conflict scenes (no rupture, no suspenseDelta < -1) reaches ≥5 scenes while the story
  // carries ≥4 overall conflict scenes. A sustained lull of 5+ scenes breaks the dramatic rhythm —
  // the audience loses the sense of accumulating pressure and the story feels like it has entered a
  // plateau. Run-based × non-conflict gap channel. Distinctness: CONFLICT_BREATHING_ROOM_ABSENT
  // (Wave 436) fires when the maximum INTER-RUPTURE gap is ≤1 (ruptures too close — no breathing
  // room); this fires when that gap is ≥5 (ruptures too far apart — too much calm). CONFLICT_
  // FIRST/SECOND_HALF_MONOPOLY (Waves 338/380) use a binary 70% threshold over halves; this
  // is a run-length check that fires regardless of where in the script the long calm falls, even
  // mid-script. CONFLICT_RUPTURE_TEMPORAL_CLUSTER (Wave 478) uses thirds distribution; this is
  // a consecutive-scene run count with a gap threshold, firing when any single stretch exceeds it.
  {
    const n492c = records.length;
    if (n492c >= 10) {
      const isConflict492c = (r: any): boolean =>
        ((r.relationshipShifts ?? []) as Array<{ amount: number }>).some(s => s.amount <= -0.3) ||
        (r.suspenseDelta ?? 0) < -1;
      const totalConflict492c = (records as any[]).filter(isConflict492c).length;
      if (totalConflict492c >= 4) {
        let maxGap492c = 0;
        let currentGap492c = 0;
        for (const r of records as any[]) {
          if (isConflict492c(r)) {
            currentGap492c = 0;
          } else {
            currentGap492c++;
            if (currentGap492c > maxGap492c) maxGap492c = currentGap492c;
          }
        }
        if (maxGap492c >= 5) {
          issues.push({
            location: `Non-conflict stretch — ${maxGap492c} consecutive calm scene(s)`,
            rule: 'CONFLICT_CALM_STRETCH',
            severity: 'minor',
            description: `The story's longest consecutive run of non-conflict scenes reaches ${maxGap492c} scenes (no bond-rupture, no reversal), while the script contains ${totalConflict492c} conflict scenes overall. A calm stretch of 5+ scenes breaks dramatic rhythm — the audience loses the sense of pressure accumulating toward a reckoning and the story feels like it has entered a plateau. While pacing requires breathing room between ruptures, a run this long signals that the conflict engine has stalled rather than paused: the protagonist is neither tested nor threatened for a substantial stretch of story, draining urgency from the surrounding arcs.`,
            suggestedFix: `Break the longest calm stretch with at least one conflict signal — a moment of friction, a negative relational beat, or a reversal that reminds the audience the story's stakes are still live. Even a minor confrontation or threat mid-stretch restores the sense that tension is still building rather than exhausted. The goal is not to eliminate breathing room, but to prevent any single stretch from growing long enough that the audience stops expecting the next rupture.`,
          });
        }
      }
    }
  }

  // ── Wave 506 checks ──────────────────────────────────────────────────────────

  // CONFLICT_RUPTURE_SEED_AFTERMATH_VOID — Sequence/aftermath × seed × rupture aftermath.
  // n≥8, ≥2 ruptures (negative shift ≤ -0.3) in the story, ≥2 seed scenes exist.
  // Every rupture is followed by 2 scenes with no seededClueIds → fire. Bond-breaking
  // never plants a clue that could foreshadow how the fracture will eventually be resolved.
  // When a bond breaks, the optimal narrative move is to seed a thread that shows the audience
  // a potential path to (or complication of) repair. When seeds never follow ruptures, the
  // conflict layer and the foreshadowing layer are causally disconnected: the story generates
  // wounds but plants no clues about their consequences.
  // Distinct from: CONFLICT_CLUE_DECOUPLED (Wave 394: co-occurrence × seededClueIds × rupture
  // IN THE SAME scene — same-scene absence, not aftermath absence), CONFLICT_RUPTURE_AFTERMATH_VOID
  // (Wave 394: aftermath × neutral emotion + no relational shift, not seed), CONFLICT_AFTERMATH_
  // CURIOSITY_VOID / CONFLICT_RUPTURE_SUSPENSE_VOID / CONFLICT_RUPTURE_CLOCK_AFTERMATH_VOID /
  // CONFLICT_RUPTURE_REVELATION_AFTERMATH_VOID / CONFLICT_RUPTURE_DRAMATIC_TURN_AFTERMATH_VOID /
  // CONFLICT_POSITIVE_EMOTION_AFTERMATH_VOID (all use different aftermath channels). This completes
  // the rupture-aftermath channel set by adding the seed foreshadowing channel.
  {
    const n506a = records.length;
    if (n506a >= 8) {
      const ruptureRecs506a = (records as any[]).filter(r =>
        ((r.relationshipShifts ?? []) as Array<{ amount: number }>).some(s => s.amount <= -0.3),
      );
      const totalSeeds506a = (records as any[]).filter(
        r => ((r.seededClueIds ?? []) as any[]).length > 0,
      ).length;
      if (ruptureRecs506a.length >= 2 && totalSeeds506a >= 2) {
        const allNoSeedAftermath506a = ruptureRecs506a.every((r: any) => {
          const idx = (records as any[]).indexOf(r);
          for (let off = 1; off <= 2; off++) {
            if (idx + off >= records.length) continue;
            if (((((records as any[])[idx + off] as any).seededClueIds ?? []) as any[]).length > 0) {
              return false;
            }
          }
          return true;
        });
        if (allNoSeedAftermath506a) {
          issues.push({
            location: `All ${ruptureRecs506a.length} rupture aftermath windows — no seeded clue`,
            rule: 'CONFLICT_RUPTURE_SEED_AFTERMATH_VOID',
            severity: 'minor',
            description: `Every bond-rupture in the story (${ruptureRecs506a.length} conflict scene(s)) is followed by two scenes in which no clue is planted, despite the story seeding ${totalSeeds506a} clue(s) elsewhere. Bond-breaking should generate foreshadowing — when a relationship fractures, the scenes that follow are the natural place to plant a clue about how that fracture might be resolved, complicated, or made permanent. When every rupture's aftermath is seed-free, the conflict layer and the foreshadowing layer run on completely separate tracks: wounds open but the story plants no thread about their future.`,
            suggestedFix: `After at least one rupture, seed a clue in the following scene that gestures toward the broken bond's future — an object that the estranged characters share, a piece of information that one character has that the other needs, or a hint about what repair might require. Foreshadowing in the wake of conflict is the most emotionally primed placement for a planted clue.`,
          });
        }
      }
    }
  }

  // CONFLICT_REVELATION_REPAIR_DECOUPLED — Co-occurrence × revelation × positive relationship shift.
  // n≥8, ≥2 revelation scenes (revelation not null/empty), ≥2 repair scenes (positive shift ≥ +0.3).
  // No scene has both a revelation and a positive relationship shift → fire. Truths never surface at
  // the same moment a bond heals — disclosures and reconciliations are always in separate scenes.
  // Revelations are the most natural catalyst for relational repair: learning a hidden truth can
  // resolve a misunderstanding, forgive a betrayal, or transform enmity into alliance. When the
  // two channels never co-occur, the story has revelations that don't move bonds toward warmth,
  // and repairs that don't come from understanding.
  // Distinct from: CONFLICT_REVELATION_DECOUPLED (Wave 380: revelation × RUPTURE co-occurrence —
  // checks whether ruptures and revelations share a scene, the NEGATIVE shift direction; this checks
  // the POSITIVE shift direction), CONFLICT_DRAMATIC_TURN_REPAIR_DECOUPLED (Wave 492: co-occurrence
  // × dramatic-turn × repair — different trigger channel), CONFLICT_REPAIR_UNCAUSED (Wave 478:
  // backward-cause before repair — checks what PRECEDES repair, not what co-occurs with it),
  // CONFLICT_RUPTURE_REVELATION_AFTERMATH_VOID (Wave 464: aftermath × revelation after a RUPTURE —
  // different direction and different temporal position). First co-occurrence check in this pass
  // joining the revelation channel with the positive-shift/repair channel.
  {
    const n506b = records.length;
    if (n506b >= 8) {
      const revScenes506b = (records as any[]).filter(
        r => r.revelation !== null && r.revelation !== '' && r.revelation !== undefined,
      );
      const repairScenes506b = (records as any[]).filter(r =>
        ((r.relationshipShifts ?? []) as Array<{ amount: number }>).some(s => s.amount >= 0.3),
      );
      if (revScenes506b.length >= 2 && repairScenes506b.length >= 2) {
        const repairSceneIdxs506b = new Set(repairScenes506b.map((r: any) => r.sceneIdx));
        const anyRevRepair506b = revScenes506b.some((r: any) => repairSceneIdxs506b.has(r.sceneIdx));
        if (!anyRevRepair506b) {
          issues.push({
            location: `${revScenes506b.length} revelation scene(s) and ${repairScenes506b.length} repair scene(s) — zero overlap`,
            rule: 'CONFLICT_REVELATION_REPAIR_DECOUPLED',
            severity: 'minor',
            description: `The story has ${revScenes506b.length} revelation scene(s) and ${repairScenes506b.length} bond-repair scene(s) (positive relationship shift ≥ +0.3) but none overlap — truths never surface at the same moment a bond heals. Revelations are the most natural catalyst for relational repair: a hidden truth that explains a betrayal, a disclosure that forgives a wound, or a secret that transforms an adversary into an ally. When disclosures and reconciliations always happen in separate scenes, neither gains the doubled dramatic impact of a scene where truth and healing arrive simultaneously.`,
            suggestedFix: `Let at least one revelation scene also carry a positive relationship shift — a scene where a character's honesty repairs a fractured bond, where a secret disclosed breaks down a wall between two people, or where the truth changes the relational temperature from cold to warm. Revelation-plus-repair scenes are among the most emotionally powerful structural beats in any screenplay.`,
          });
        }
      }
    }
  }

  // CONFLICT_REPAIR_CLOSING_ABSENT — Zone presence/absence × positive shift × closing third.
  // n≥9, ≥2 repair scenes (positive shift ≥ +0.3). None in the final structural third → fire.
  // The resolution zone contains no bond-warming. The protagonist crosses into the story's
  // climax with every fractured relationship still unrepaired. The closing act is where bonds
  // are expected to either resolve (repair or confirm rupture) or carry the story's final
  // emotional statement. When no positive relational shift appears in the final third, the
  // resolution is all wound — the audience is left without any relational counterpoint to the
  // accumulated damage, and the emotional arc ends on unrelieved conflict.
  // Distinct from: CONFLICT_CLOSING_SUSPENSE_VOID (Wave 492: zone × suspense — different channel,
  // audits escalating tension not bond-warming), CONFLICT_ACT3_ABSENT (Wave 257: any conflict
  // signal — ruptures or reversal — in final 25%; this fires on the ABSENCE of POSITIVE shift in
  // final THIRD, complementary zone coverage), CONFLICT_LATE_RELATIONAL_VOID in character-arc.ts
  // (final quarter, any shift direction; this is specifically positive-shift in final third),
  // CONFLICT_RELATIONAL_FRONT_LOADED / ARC_RELATIONAL_BACK_LOADED (different pass, distribution
  // mode across halves). First zone presence/absence check in this pass on the repair channel.
  {
    const n506c = records.length;
    if (n506c >= 9) {
      const third506c = Math.floor(n506c / 3);
      const repairPositions506c = (records as any[])
        .map((r, pos) => ({
          pos,
          isRepair: ((r.relationshipShifts ?? []) as Array<{ amount: number }>).some(s => s.amount >= 0.3),
        }))
        .filter(x => x.isRepair)
        .map(x => x.pos);
      if (repairPositions506c.length >= 2) {
        const anyInFinal506c = repairPositions506c.some(p => p >= 2 * third506c);
        if (!anyInFinal506c) {
          issues.push({
            location: `${repairPositions506c.length} repair scene(s) — none in the final third (scenes ${2 * third506c}–${n506c - 1})`,
            rule: 'CONFLICT_REPAIR_CLOSING_ABSENT',
            severity: 'minor',
            description: `The script has ${repairPositions506c.length} scene(s) with a positive relationship shift (bond-repair or bond-warming), but none falls in the final structural third (scenes ${2 * third506c}–${n506c - 1}). The closing act — where the story's emotional arc is meant to resolve — contains no relational healing. The protagonist crosses into the climax with every fractured relationship still unrepaired, leaving the resolution zone as pure wound. A screenplay's final third should carry at least the beginning of relational resolution: even a partial repair, a moment of acknowledged warmth, or an alliance restored can provide the emotional counterpoint that gives the climax its weight.`,
            suggestedFix: `Introduce at least one positive relationship shift in the final third — a small reconciliation, an alliance restored, or a moment of warmth between estranged characters. The repair need not be complete or permanent; even a partial thaw or a single moment of acknowledged warmth in the final act gives the audience the relational counterpoint that makes the climax emotionally complete rather than uniformly harsh.`,
          });
        }
      }
    }
  }

  // ── Wave 520 checks ───────────────────────────────────────────────────────
  {
    // CONFLICT_RUPTURE_PAYOFF_AFTERMATH_VOID — sequence/aftermath × payoff × rupture aftermath.
    // n≥8, ≥2 ruptures (negative shift ≤ -0.3), ≥2 payoff scenes (payoffSetupIds non-empty).
    // Every rupture is followed by 2 scenes with no payoff delivery → fire. Bond-breaking
    // never immediately precedes resolution of any planted promise: conflict and payoff always
    // run on separate timelines. When a bond fractures, the scenes that follow are the highest-
    // stakes moment to cash a planted promise — the wound is fresh and the audience is maximally
    // invested. When every rupture's aftermath is payoff-free, the conflict and foreshadowing
    // layers are causally disconnected.
    // Distinct from: CONFLICT_PAYOFF_DECOUPLED (Wave 394: co-occurrence × no payoff scene has
    // a rupture IN THE SAME scene — same-scene absence not aftermath absence), all other aftermath
    // checks (curiosity, suspense, clock, revelation, turn, positive-emotion, seed — different
    // aftermath channels). This completes the rupture-aftermath channel set.
    const n520a = records.length;
    if (n520a >= 8) {
      const ruptureRecs520a = (records as any[]).filter(r =>
        ((r.relationshipShifts ?? []) as Array<{ amount: number }>).some(s => s.amount <= -0.3),
      );
      const totalPayoffs520a = (records as any[]).filter(
        r => ((r.payoffSetupIds ?? []) as any[]).length > 0,
      ).length;
      if (ruptureRecs520a.length >= 2 && totalPayoffs520a >= 2) {
        const allNoPayoffAftermath520a = ruptureRecs520a.every((r: any) => {
          const idx = (records as any[]).indexOf(r);
          for (let off = 1; off <= 2; off++) {
            if (idx + off >= records.length) continue;
            if (((((records as any[])[idx + off] as any).payoffSetupIds ?? []) as any[]).length > 0) {
              return false;
            }
          }
          return true;
        });
        if (allNoPayoffAftermath520a) {
          issues.push({
            location: `All ${ruptureRecs520a.length} rupture aftermath windows — no payoff`,
            rule: 'CONFLICT_RUPTURE_PAYOFF_AFTERMATH_VOID',
            severity: 'minor',
            description: `Every bond-rupture in the story (${ruptureRecs520a.length} conflict scene(s)) is followed by two scenes in which no planted narrative promise is resolved, despite the story delivering ${totalPayoffs520a} payoff(s) elsewhere. When a bond fractures, the scenes that follow are the highest-stakes moment available to cash a planted promise — the audience is maximally invested and a payoff landing in that window doubles its impact. When every rupture's aftermath is payoff-free, conflict and narrative promise run on entirely separate tracks: wounds open in one part of the story and setups cash out in another, and neither amplifies the other.`,
            suggestedFix: `After at least one major rupture, introduce a payoff beat in the following scene — a planted promise that resolves at the moment of relational strain. This doesn't require a triumphant payoff; a threat that was foreshadowed now becoming real, a secret disclosed at exactly the wrong moment, or a resource running out when it was most needed all function as payoffs that land harder against the backdrop of the fresh fracture.`,
          });
        }
      }
    }
  }

  {
    // CONFLICT_REPAIR_FRONT_LOADED — distribution/timing × positive shift × first half.
    // n≥8, ≥4 repair scenes (positive shift ≥ +0.3). >70% fall in the first half while
    // the back half carries ≥1 → fire. Bond healing concentrated in the opening of the
    // story means the story spends its relational warmth early, leaving the climax zone
    // without the relational counterpoint that makes resolution resonate.
    // Distinct from: CONFLICT_REPAIR_CLOSING_ABSENT (Wave 506: zone × final third absence —
    // checks only the closing third, not the global first/second half distribution), ARC_
    // RELATIONAL_FRONT_LOADED in character-arc.ts (same distribution mode on the relational
    // channel but in a different pass; this check is specifically on positive shifts ≥ +0.3
    // in the conflict pass, anchored to the repair signal), CONFLICT_POSITIVE_EMOTION_
    // AFTERMATH_VOID (aftermath mode, not distribution). First distribution/timing check on
    // the repair channel in this pass.
    const n520b = records.length;
    const half520b = Math.floor(n520b / 2);
    const repairScenes520b = (records as any[]).map((r, i) => ({
      i,
      isRepair: ((r.relationshipShifts ?? []) as Array<{ amount: number }>).some(s => s.amount >= 0.3),
    })).filter(x => x.isRepair);
    if (n520b >= 8 && repairScenes520b.length >= 4) {
      const frontRepair520b = repairScenes520b.filter(x => x.i < half520b).length;
      const backRepair520b = repairScenes520b.length - frontRepair520b;
      const ratio520b = frontRepair520b / repairScenes520b.length;
      if (ratio520b > 0.70 && backRepair520b >= 1) {
        issues.push({
          location: `repair distribution: ${frontRepair520b} front / ${backRepair520b} back`,
          rule: 'CONFLICT_REPAIR_FRONT_LOADED',
          severity: 'minor',
          description: `${Math.round(ratio520b * 100)}% of the script's bond-repair scenes (${frontRepair520b} of ${repairScenes520b.length}) fall in the first half, leaving the second half with only ${backRepair520b}. A story where relational warmth is concentrated early exhausts its relational optimism before the climax — the audience enters the story's resolution zone without recent evidence that bonds can improve. The climax should be the moment when the question of relational repair is most urgent; instead, the story has already answered that question (and spent the warmth) in its opening movements.`,
          suggestedFix: `Redistribute repair scenes by moving or adding at least one positive relational shift into the second half — ideally near or in the climax zone. This need not be a complete reconciliation; a moment of acknowledged warmth, an alliance restored, or a small but genuine improvement in a key bond provides the relational counterpoint that makes the climax emotionally complete.`,
        });
      }
    }
  }

  {
    // CONFLICT_CURIOSITY_CLOSING_ZONE_ABSENT — zone presence/absence × curiosityDelta × closing third.
    // n≥9, ≥3 curiosity-positive scenes (curiosityDelta > 0), none in the final structural third → fire.
    // The story's wondering engine generates forward-pulling open questions throughout but goes
    // silent precisely in the closing act — where unresolved questions should be at their most
    // urgent and the audience's need to know should peak.
    // Distinct from: CONFLICT_CLOSING_SUSPENSE_VOID (Wave 492: zone × suspenseDelta × closing third —
    // different channel, tension vs. wonder), CONFLICT_REPAIR_CLOSING_ABSENT (Wave 506: zone ×
    // positive shift × closing third — different channel), CONFLICT_AFTERMATH_CURIOSITY_VOID (Wave
    // 422: aftermath × curiosity — different mode, this is a zone check not an aftermath check),
    // CONFLICT_RUPTURE_CURIOSITY_DECOUPLED (Wave 478: co-occurrence × curiosity × rupture — different
    // mode). First zone check on the curiosityDelta channel in this pass.
    const n520c = records.length;
    const third520c = Math.floor(n520c / 3);
    const curiosScenes520c = (records as any[]).filter(r => (r.curiosityDelta ?? 0) > 0);
    if (n520c >= 9 && curiosScenes520c.length >= 3) {
      const anyInFinal520c = (records as any[]).slice(2 * third520c).some(r => (r.curiosityDelta ?? 0) > 0);
      if (!anyInFinal520c) {
        issues.push({
          location: `final third (scenes ${2 * third520c}–${n520c - 1}): no curiosity rise`,
          rule: 'CONFLICT_CURIOSITY_CLOSING_ZONE_ABSENT',
          severity: 'minor',
          description: `The script raises curiosity in ${curiosScenes520c.length} scene(s) but none fall in the final structural third (scenes ${2 * third520c}–${n520c - 1}). The closing act is where unresolved questions should be at their most urgent — the audience's wondering should peak as the story approaches its resolution. When the curiosity channel goes silent precisely in the closing zone, the story answers its open questions (or simply stops raising new ones) before the climax, and the audience enters the resolution already knowing (or no longer wondering) rather than straining toward disclosure.`,
          suggestedFix: `Introduce at least one curiosity-raising beat in the final structural third — a partial disclosure that opens a new angle, a detail that reframes what the audience thought they understood, or an unanswered question that the climax must resolve. Wonder that peaks just before the ending is the most powerful engine for keeping the audience invested through the final scenes.`,
        });
      }
    }
  }

  // ── Wave 534: CONFLICT_CLOCK_RUPTURE_DECOUPLED, CONFLICT_RUPTURE_CURIOSITY_VOID,
  //              CONFLICT_CURIOSITY_FRONT_LOADED ──────────────────────────────────────────────────────

  // CONFLICT_CLOCK_RUPTURE_DECOUPLED — Co-occurrence/decoupling × clock × rupture.
  // n≥8, ≥2 clockRaised scenes, ≥2 rupture scenes (any relationshipShift with amount ≤ -0.3).
  // No scene is simultaneously a clock-raise and a rupture → fire. Deadline urgency and bond-
  // breaking are two of the strongest narrative pressure signals; when they never co-occur, time
  // pressure and relational fracture operate in completely separate structural zones of the story.
  // The scene where a deadline is raised is also the prime opportunity for a relationship to break
  // under pressure — clock and rupture together produce the most intense narrative compression.
  // When they are always decoupled, the story never puts a character in the position of having to
  // break a bond precisely as the clock ticks.
  // Distinct from: CONFLICT_REVELATION_DECOUPLED (co-occurrence × revelation × rupture — different
  // signal pair; this is the clock-channel completion of the co-occurrence decoupling family),
  // CONFLICT_CLOCK_ABSENT (checks whether the clock channel is used at all — not a decoupling check),
  // CONFLICT_CLOCK_AFTERMATH_VOID (Wave 450: aftermath mode × clock → rupture in next 2 scenes —
  // different mode and direction), and all other aftermath/zone checks that use clock as trigger.
  {
    const n534a = records.length;
    if (n534a >= 8) {
      const clockScenes534a = (records as any[]).filter(r => r.clockRaised === true);
      const ruptureScenes534a = (records as any[]).filter(r =>
        ((r.relationshipShifts ?? []) as Array<{ amount: number }>).some(s => s.amount <= -0.3),
      );
      if (clockScenes534a.length >= 2 && ruptureScenes534a.length >= 2) {
        const anyOverlap534a = clockScenes534a.some(r =>
          ((r.relationshipShifts ?? []) as Array<{ amount: number }>).some(s => s.amount <= -0.3),
        );
        if (!anyOverlap534a) {
          issues.push({
            location: `${clockScenes534a.length} clock-raised scene(s) and ${ruptureScenes534a.length} rupture scene(s) — no overlap`,
            rule: 'CONFLICT_CLOCK_RUPTURE_DECOUPLED',
            severity: 'minor',
            description: `The script has ${clockScenes534a.length} deadline-raising scene(s) and ${ruptureScenes534a.length} relationship-rupture scene(s), but these two channels never co-occur. Clock pressure and bond-breaking are two of the strongest narrative compression signals; when they always occupy separate scenes, the story's urgency and its relational conflict operate in completely isolated structural zones. The moment when a deadline is raised is the prime opportunity for a relationship to fracture under pressure — a character forced to break a bond precisely as the clock ticks is under the most dramatic compression a story can generate. When clock and rupture are always decoupled, the audience never experiences that double pressure.`,
            suggestedFix: `Introduce at least one scene where a deadline is raised and a bond simultaneously fractures — a confrontation about the ticking clock that destroys a trust, a choice made under time pressure that breaks a relationship, or an alliance that collapses as the clock runs out. Clock-and-rupture scenes are among the most dramatically dense moments in any story, and a single overlap between these two channels creates the kind of pressure that audiences find most gripping.`,
          });
        }
      }
    }
  }

  // CONFLICT_RUPTURE_CURIOSITY_VOID — Co-occurrence/decoupling × rupture × curiosityDelta.
  // n≥8, ≥2 rupture scenes (any relationshipShift with amount ≤ -0.3), ≥2 scenes with
  // curiosityDelta > 0. Every rupture scene has curiosityDelta ≤ 0 → fire. Bond-breaking never
  // simultaneously ignites wondering — fractures are informationally inert in the moment they
  // happen. A rupture scene is one of the most charged events in a story's emotional architecture;
  // it is also a natural source of new questions: why did this bond break, what does it mean for
  // what comes next, who is responsible? When every rupture has zero or negative curiosity, the
  // fracture is emotionally felt but epistemically closed — the audience mourns the break but is
  // not propelled into wondering about its consequences or causes.
  // Distinct from: CONFLICT_AFTERMATH_CURIOSITY_VOID (Wave 422: aftermath mode — checks the NEXT
  // 2 scenes' curiosity, not the rupture scene's OWN curiosityDelta; different analytical mode and
  // time slot), CONFLICT_CLUE_DECOUPLED (co-occurrence × rupture × seed — different correlated signal;
  // this is the curiosity-channel complement in the rupture co-occurrence family alongside revelation,
  // seed, payoff, and dramatic-turn). First co-occurrence check pairing rupture × curiosityDelta in
  // this pass.
  {
    const n534b = records.length;
    if (n534b >= 8) {
      const ruptureScenes534b = (records as any[]).filter(r =>
        ((r.relationshipShifts ?? []) as Array<{ amount: number }>).some(s => s.amount <= -0.3),
      );
      const curiosityScenes534b = (records as any[]).filter(r => (r.curiosityDelta ?? 0) > 0);
      if (ruptureScenes534b.length >= 2 && curiosityScenes534b.length >= 2) {
        const anyRuptureHasCuriosity534b = ruptureScenes534b.some(r => (r.curiosityDelta ?? 0) > 0);
        if (!anyRuptureHasCuriosity534b) {
          issues.push({
            location: `${ruptureScenes534b.length} rupture scene(s) — all have curiosityDelta ≤ 0 (${curiosityScenes534b.length} curiosity scene(s) exist elsewhere)`,
            rule: 'CONFLICT_RUPTURE_CURIOSITY_VOID',
            severity: 'minor',
            description: `The script has ${ruptureScenes534b.length} relationship-rupture scene(s) and ${curiosityScenes534b.length} curiosity-generating scene(s), but these two channels never co-occur. Every scene where a bond breaks or fractures has a curiosityDelta ≤ 0 — fractures are emotionally felt but informationally closed in the moment they happen. A rupture is not only an emotional event but a narrative one: why did this bond break? What does the break mean for what follows? Who is responsible, and can it be repaired? When ruptures never ignite wondering, the story misses the opportunity to make each fracture not just a wound but a question — turning damage into the engine that drives the audience forward.`,
            suggestedFix: `Introduce at least one rupture scene with a positive curiosityDelta: let the fracture open a mystery (who caused this, what was withheld that led to this break), introduce a new unanswered question that the rupture creates, or let the break reveal a layer of the situation that the audience did not understand before. The most powerful rupture scenes damage the characters AND make the audience desperate to know what happens next.`,
          });
        }
      }
    }
  }

  // CONFLICT_CURIOSITY_FRONT_LOADED — Distribution/timing × curiosityDelta × first half.
  // n≥8, ≥4 scenes with curiosityDelta > 0. >70% of those scenes fall in the first half while
  // the second half carries ≥1. The story's wondering engine exhausts itself before the climax —
  // curiosity is generated primarily in the opening movements and dwindles as stakes increase.
  // The most powerful question-opening should accelerate into and through the climax: the audience
  // needs to be asking questions when they need answers most urgently. When >70% of the curiosity
  // is front-loaded, the back half's escalating action occurs in a narrowing epistemic field.
  // Distinct from: CONFLICT_CURIOSITY_CLOSING_ZONE_ABSENT (Wave 520: zone presence/absence ×
  // closing third — fires when closing third has zero curiosity; this fires when global first-half
  // concentration exceeds 70%, regardless of which zone is empty), CONFLICT_REPAIR_FRONT_LOADED
  // (Wave 520: distribution × repair channel — positive relational shifts, not curiosity), ARC_
  // CURIOSITY_BACK_LOADED (Wave 533: distribution × curiosity × second half — opposite concentration;
  // that fires when back-half concentration exceeds 70%). First distribution/timing check on the
  // curiosity channel in this pass.
  {
    const n534c = records.length;
    const half534c = Math.floor(n534c / 2);
    const curiosityScenes534c = (records as any[]).filter(r => (r.curiosityDelta ?? 0) > 0);
    if (n534c >= 8 && curiosityScenes534c.length >= 4) {
      const frontCount534c = (records as any[]).slice(0, half534c).filter(r => (r.curiosityDelta ?? 0) > 0).length;
      const backCount534c = curiosityScenes534c.length - frontCount534c;
      const ratio534c = frontCount534c / curiosityScenes534c.length;
      if (ratio534c > 0.70 && backCount534c >= 1) {
        issues.push({
          location: `curiosity distribution: ${frontCount534c} front-half / ${backCount534c} back-half`,
          rule: 'CONFLICT_CURIOSITY_FRONT_LOADED',
          severity: 'minor',
          description: `${Math.round(ratio534c * 100)}% of the script's curiosity-generating scenes (${frontCount534c} of ${curiosityScenes534c.length}) fall in the first half, leaving the second half with only ${backCount534c}. The story's wondering engine exhausts itself before the climax — open questions accumulate in the opening movements then dwindle as the stakes should be intensifying. The most urgent need to know should arise as the story approaches resolution, not during the setup: the questions that make the audience desperate to reach the ending should be generated in or sustained into the second half. When curiosity is front-loaded, the back half's escalating conflict occurs in a narrowing epistemic field, with the audience already informed enough to stop wondering.`,
          suggestedFix: `Redistribute at least some curiosity-generating beats into the second half — a new angle on an existing mystery, a revelation that opens more questions than it answers, or a character action whose full meaning remains unclear until the very end. Sustained wonder through the climax zone is what keeps the audience invested not just in what happens next but in what it all means.`,
        });
      }
    }
  }

  // ── Wave 548: CONFLICT_PEAK_REPAIR_UNCAUSED, CONFLICT_CLOSING_CLOCK_ABSENT,
  //              CONFLICT_SEED_REPAIR_DECOUPLED ────────────────────────────────────────────────────

  // CONFLICT_PEAK_REPAIR_UNCAUSED — backward-cause × single-peak isolation × positive relational shift.
  // n≥8, ≥2 repair scenes (positive shift ≥ +0.3). The single most significant positive relationship
  // shift (the story's biggest reconciliation by magnitude) has no major rupture (shift ≤ -0.3),
  // revelation, dramatic turn, or clock raise in the two preceding scenes. The peak repair is
  // spontaneous: the most emotionally significant bond-warming in the entire story arrives without
  // visible cause. Reconciliations that come from nowhere feel unearned — the audience witnesses the
  // repair but has not been given the catalyst that makes it believable. Repairs need justification:
  // a revelation that dissolves a misunderstanding, a dramatic turn that removes an obstacle, a threat
  // that forces two estranged characters back together, or a rupture whose very extremity prompts
  // remorse and healing.
  // Distinct from: CONFLICT_REPAIR_UNCAUSED (Wave 478: backward-cause × ALL repair scenes in aggregate
  // — checks whether any of the repair scenes has a cause in prior 2 scenes; this isolates only the
  // single peak positive shift), CONFLICT_PEAK_RUPTURE_UNCAUSED (Wave 464: backward-cause × peak
  // RUPTURE — same backward-cause mode but on the negative shift direction), all CONFLICT_PEAK_*
  // checks (Wave 352/366/408: single-peak isolation but on different channels — those audit the peak
  // RUPTURE scene's in-scene channels, not the peak REPAIR scene's backward-cause). First check combining
  // single-peak isolation + backward-cause on the positive-shift / repair channel in this pass.
  {
    const n548a = records.length;
    if (n548a >= 8) {
      const repairScenes548a = (records as any[]).map((r, i) => ({
        r,
        i,
        mag: Math.max(
          0,
          ...((r.relationshipShifts ?? []) as Array<{ amount: number }>)
            .filter(s => s.amount >= 0.3)
            .map(s => s.amount),
        ),
      })).filter(x => x.mag > 0);
      if (repairScenes548a.length >= 2) {
        const peak548a = repairScenes548a.reduce((best, x) => x.mag > best.mag ? x : best);
        const peakIdx548a = peak548a.i;
        if (peakIdx548a >= 2) {
          const hasCause548a = [peakIdx548a - 2, peakIdx548a - 1].some(ci => {
            const c = (records as any[])[ci];
            return (
              ((c.relationshipShifts ?? []) as Array<{ amount: number }>).some(s => s.amount <= -0.3) ||
              (c.revelation !== null && c.revelation !== '' && c.revelation !== undefined) ||
              ((c.dramaticTurn ?? 'nothing') !== 'nothing' && c.dramaticTurn !== '') ||
              c.clockRaised === true
            );
          });
          if (!hasCause548a) {
            issues.push({
              location: `Scene ${(records as any[])[peakIdx548a].sceneIdx} — peak repair (magnitude ${peak548a.mag.toFixed(2)})`,
              rule: 'CONFLICT_PEAK_REPAIR_UNCAUSED',
              severity: 'minor',
              description: `The story's most significant positive relationship shift (+${peak548a.mag.toFixed(2)}) at Scene ${(records as any[])[peakIdx548a].sceneIdx} has no rupture, revelation, dramatic turn, or clock raise in the two preceding scenes — the peak reconciliation arrives without visible cause. The most emotionally significant repair in the entire story should be the most earned: a disclosure that dissolves a misunderstanding, a turn that removes an obstacle, or a threat that forces estranged characters back together. A spontaneous peak repair reads as authorial convenience rather than character consequence.`,
              suggestedFix: 'Add a cause for the peak repair in the one or two scenes before it: a revelation that reframes what went wrong between the characters, a dramatic turn that changes the stakes so that the estrangement no longer makes sense, a shared threat that forces cooperation, or a rupture whose extremity prompts immediate remorse. The story\'s most important reconciliation should arrive as the most inevitable consequence.',
            });
          }
        } else if (peakIdx548a < 2) {
          // Peak repair is in scene 0 or 1 — inherently uncaused by script structure
          issues.push({
            location: `Scene ${(records as any[])[peakIdx548a].sceneIdx} — peak repair (magnitude ${peak548a.mag.toFixed(2)})`,
            rule: 'CONFLICT_PEAK_REPAIR_UNCAUSED',
            severity: 'minor',
            description: `The story's most significant positive relationship shift (+${peak548a.mag.toFixed(2)}) occurs at Scene ${(records as any[])[peakIdx548a].sceneIdx} — in the opening scenes, before any prior cause can exist. The peak reconciliation is the story's first event; repairs this early in a script have no buildup and no earned context.`,
            suggestedFix: 'Move the most significant repair later in the story so it can follow a visible cause — a revelation, a rupture, or a dramatic turn. The biggest reconciliation should arrive at the moment of maximum earned context, not at the opening.',
          });
        }
      }
    }
  }

  // CONFLICT_CLOSING_CLOCK_ABSENT — zone presence/absence × clockRaised × closing third.
  // n≥9, ≥2 clockRaised scenes in the first two-thirds of the story, none in the final structural
  // third (pos ≥ floor(n/3)*2). The story's deadline urgency goes silent exactly as the climax
  // approaches. The closing act needs clock pressure to feel urgent — without a ticking clock in the
  // final third, the climax must find urgency through other means while the dedicated urgency engine
  // (the deadline system) has been switched off. A clock that runs only through the setup and midpoint
  // then stops leaves the audience without the visceral time pressure that makes climax scenes feel
  // truly consequential. The escalating consequences of a deadline should peak in the closing zone,
  // not before.
  // Distinct from: THREAT_AMNESIA (Wave 158: clock raised in Act 1 [first 25%] but not in second half
  // [50%+] — different zone boundary and different trigger; this checks the closing THIRD specifically
  // and requires ≥2 clocks in the opening two-thirds, whereas THREAT_AMNESIA requires only one in Act 1
  // and fires if the second half has none at all), CONFLICT_CLOCK_DECOUPLED (Wave 338: co-occurrence ×
  // clock × relational content — checks whether clock scenes carry negative relationship shifts, not
  // whether they appear in the closing zone), CONFLICT_CLOCK_AFTERMATH_VOID (Wave 450: aftermath ×
  // clock → rupture in next 2 scenes — checks what follows a clock scene), CONFLICT_CLOCK_RUPTURE_
  // DECOUPLED (Wave 534: co-occurrence × clock × rupture — overlap check). First zone presence/absence
  // check on the clockRaised channel specifically in the closing third of this pass.
  {
    const n548b = records.length;
    if (n548b >= 9) {
      const third548b = Math.floor(n548b / 3);
      const clocksInFirstTwoThirds548b = (records as any[]).filter(
        (r, i) => i < 2 * third548b && r.clockRaised === true,
      ).length;
      if (clocksInFirstTwoThirds548b >= 2) {
        const anyClockInFinalThird548b = (records as any[]).slice(2 * third548b).some(
          (r: any) => r.clockRaised === true,
        );
        if (!anyClockInFinalThird548b) {
          issues.push({
            location: `final third (scenes ${2 * third548b}–${n548b - 1}): no clock raised`,
            rule: 'CONFLICT_CLOSING_CLOCK_ABSENT',
            severity: 'minor',
            description: `The story raises a clock (clockRaised) ${clocksInFirstTwoThirds548b} time(s) in its first two-thirds but never in the final structural third (scenes ${2 * third548b}–${n548b - 1}). The deadline urgency engine goes silent as the story approaches its climax. Without clock pressure in the closing act, the climax must find urgency through other means — and the visceral time-pressure that clock scenes create (the "or else" that makes every decision consequential) is absent at the moment the audience most needs to feel it. A clock that runs only through the setup and midpoint then stops forces the closing act to generate urgency without the story's strongest urgency tool.`,
            suggestedFix: 'Re-invoke the clock in the final third: escalate the deadline (a second, closer deadline), reveal a new consequence of failure, or show the original deadline expiring with immediate effect. The closing act is where all the ticking should culminate — the audience should feel time running out as the protagonist makes their last moves.',
          });
        }
      }
    }
  }

  // CONFLICT_SEED_REPAIR_DECOUPLED — co-occurrence × seededClueIds × positive relational shift.
  // n≥8, ≥2 seed scenes (seededClueIds non-empty), ≥2 repair scenes (any positive shift ≥ +0.3).
  // No scene has both a seeded clue AND a positive relationship shift → fire. The story plants clues
  // and warms bonds, but never in the same scene. A repair scene is a structurally powerful moment to
  // embed foreshadowing: the emotional warmth creates a false sense of security while the planted clue
  // signals future trouble, creating dramatic irony. Conversely, a seed planted at the moment of a
  // repair can hint that the reconciliation is fragile or that the restored bond will face a new test.
  // When seed and repair never co-occur, the foreshadowing layer and the relational-warmth layer run
  // on entirely separate tracks — neither is given the dramatic amplification of operating inside the
  // other.
  // Distinct from: CONFLICT_CLUE_DECOUPLED (Wave 394: co-occurrence × seed × rupture [NEGATIVE shift]
  // — same mode but the negative shift direction; this is the positive-shift complement, and the two
  // together cover both directions of the relational channel against the seed channel),
  // CONFLICT_RUPTURE_SEED_AFTERMATH_VOID (Wave 506: aftermath × seed after rupture — different temporal
  // mode, different trigger direction), CONFLICT_REVELATION_REPAIR_DECOUPLED (Wave 506: co-occurrence ×
  // revelation × repair — different signal pair; revelation vs. seed), CONFLICT_PAYOFF_DECOUPLED (Wave
  // 394: co-occurrence × payoff × rupture — payoff not seed). First co-occurrence check pairing the
  // seededClueIds channel with the positive-shift / repair channel in this pass.
  {
    const n548c = records.length;
    if (n548c >= 8) {
      const seedScenes548c = (records as any[]).filter(
        r => ((r.seededClueIds ?? []) as any[]).length > 0,
      );
      const repairScenes548c = (records as any[]).filter(r =>
        ((r.relationshipShifts ?? []) as Array<{ amount: number }>).some(s => s.amount >= 0.3),
      );
      if (seedScenes548c.length >= 2 && repairScenes548c.length >= 2) {
        const repairSceneIdxSet548c = new Set(repairScenes548c.map((r: any) => r.sceneIdx));
        const anySeedRepairOverlap548c = seedScenes548c.some((r: any) => repairSceneIdxSet548c.has(r.sceneIdx));
        if (!anySeedRepairOverlap548c) {
          issues.push({
            location: `${seedScenes548c.length} seed scene(s) and ${repairScenes548c.length} repair scene(s) — zero overlap`,
            rule: 'CONFLICT_SEED_REPAIR_DECOUPLED',
            severity: 'minor',
            description: `The story plants ${seedScenes548c.length} clue(s) and warms ${repairScenes548c.length} bond(s) (positive shift ≥ +0.3), but foreshadowing and relational healing never occur in the same scene. A repair scene is one of the most structurally powerful moments to embed a seed: the emotional warmth creates a false sense of security while the planted clue signals future trouble, building dramatic irony. Equally, a clue seeded at the moment of reconciliation can hint that the restored bond will face a new test — that the repair is incomplete or conditional. When seed and repair are always decoupled, the story misses the compound effect of foreshadowing planted inside a moment of relational warmth.`,
            suggestedFix: 'Introduce at least one scene where a positive relationship shift and a seeded clue co-occur: a reconciliation scene in which a detail is casually mentioned that will become important later, or a warming scene in which an object, phrase, or action foreshadows a future complication. Scenes where dramatic irony and emotional warmth combine are among the most effective structural placements for foreshadowing.',
          });
        }
      }
    }
  }

  // ── Wave 562: CONFLICT_REPAIR_DROUGHT_RUN, CONFLICT_REPAIR_EMOTION_DECOUPLED,
  //              CONFLICT_REPAIR_CURIOSITY_AFTERMATH_VOID ──────────────────────────────────────────

  // CONFLICT_REPAIR_DROUGHT_RUN — run-based × repair absence × valence (positive shift channel).
  // n≥10, ≥2 repair scenes (positive shift ≥ +0.3), longest consecutive run of non-repair scenes
  // is ≥6 → fire. The story's relational warmth goes dark for an extended consecutive stretch: six
  // or more scenes pass in a row with no bond healing, even though repairs exist elsewhere. A
  // run-based repair drought is distinct from a distribution skew — the repairs may be balanced
  // front-to-back across the script and still leave a long uninterrupted span where no bond ever
  // warms. When relational repair flatlines for a sixth of the runtime or more, the audience spends
  // a long stretch with no evidence that bonds can improve, and the relational hope the surrounding
  // repairs built dissipates before the next warming can recover it. The story's emotional texture
  // turns relentlessly cold for the duration of the drought.
  // Distinct from: CONFLICT_CALM_STRETCH (Wave 492: run-based × non-CONFLICT gap — ≥5 consecutive
  // scenes with no rupture/conflict signal; this audits absence of REPAIR specifically, the positive
  // direction, not absence of conflict), CONFLICT_POSITIVE_SPIRAL (Wave 436: run-based × ≥3
  // consecutive scenes each WITH a positive shift — the presence run, this is the absence run),
  // CONFLICT_RELENTLESS_RUN / CONFLICT_NEGATIVE_SPIRAL (Waves 313/285: run-based on the NEGATIVE
  // shift channel), CONFLICT_REPAIR_FRONT_LOADED (Wave 520: distribution/timing, not a consecutive
  // run). First run-based check auditing the ABSENCE of repair in this pass.
  {
    const n562a = records.length;
    if (n562a >= 10) {
      const repairCount562a = (records as any[]).filter(r =>
        ((r.relationshipShifts ?? []) as Array<{ amount: number }>).some(s => s.amount >= 0.3),
      ).length;
      if (repairCount562a >= 2) {
        let longestRun562a = 0;
        let currentRun562a = 0;
        for (const r of records as any[]) {
          const isRepair562a = ((r.relationshipShifts ?? []) as Array<{ amount: number }>).some(
            s => s.amount >= 0.3,
          );
          if (!isRepair562a) {
            currentRun562a++;
            if (currentRun562a > longestRun562a) longestRun562a = currentRun562a;
          } else {
            currentRun562a = 0;
          }
        }
        if (longestRun562a >= 6) {
          issues.push({
            location: `longest repair drought: ${longestRun562a} consecutive scenes with no bond healing`,
            rule: 'CONFLICT_REPAIR_DROUGHT_RUN',
            severity: 'minor',
            description: `The story contains a run of ${longestRun562a} consecutive scenes with no positive relationship shift (≥ +0.3) — an extended relational-warmth drought — even though ${repairCount562a} repair scene(s) exist across the script. Unlike a front-to-back distribution skew, this is a local dead zone: a sixth of the runtime or more passes in an unbroken stretch where no bond ever heals or warms. The audience spends a long uninterrupted span with no evidence that relationships can improve, and the relational hope the surrounding repairs built dissipates before the next warming can recover it. Relational warmth that is technically present in the script but absent for a long consecutive run leaves an extended cold stretch where the interpersonal world feels frozen.`,
            suggestedFix: `Break up the ${longestRun562a}-scene repair drought by seeding at least one positive relational beat into the middle of the run: a small reconciliation, an acknowledged moment of warmth, an alliance reaffirmed, or a bond that improves under pressure. The drought doesn't need a complete reconciliation — it needs enough relational warmth to keep the interpersonal world from feeling frozen across an extended stretch. A story sustains emotional texture by never letting bond-healing flatline for too long between its larger repairs.`,
          });
        }
      }
    }
  }

  // CONFLICT_REPAIR_EMOTION_DECOUPLED — co-occurrence/decoupling × repair × emotionalShift.
  // n≥8, ≥3 repair scenes (positive shift ≥ +0.3), ≥2 emotionally non-neutral scenes elsewhere
  // (proving the story CAN render feeling), every repair scene emotionally neutral → fire. Bonds
  // heal but the protagonist registers no feeling about any of them: every reconciliation, every
  // moment of relational warmth, passes without an emotional beat attached. Repair is one of the
  // most emotionally charged events available to a story — a broken bond restored should move the
  // protagonist visibly. When every repair scene is emotionally flat while emotion exists elsewhere,
  // the relational-warmth layer and the felt-emotion layer run on separate tracks: bonds mend in
  // scenes the protagonist experiences without affect, draining the reconciliations of the emotional
  // payoff that makes them land.
  // Distinct from: CONFLICT_EMOTION_DECOUPLED (Wave 299: co-occurrence × CONFLICT/rupture scenes ×
  // neutral emotion — audits the NEGATIVE shift / conflict scenes being neutral; this audits the
  // POSITIVE shift / repair scenes, the opposite relational direction), CONFLICT_POSITIVE_EMOTION_
  // RUPTURE (Wave 450: co-occurrence × rupture × POSITIVE emotion — inverted valence on the conflict
  // channel), ARC_RELATIONAL_SHIFT_EMOTION_FLAT in character-arc.ts (audits ALL relationship-shift
  // scenes regardless of direction in a different pass; this isolates repair scenes specifically in
  // the conflict pass). First co-occurrence check pairing the repair channel with emotional flatness.
  {
    const n562b = records.length;
    if (n562b >= 8) {
      const repairScenes562b = (records as any[]).filter(r =>
        ((r.relationshipShifts ?? []) as Array<{ amount: number }>).some(s => s.amount >= 0.3),
      );
      const repairIdxSet562b = new Set(repairScenes562b.map((r: any) => r.sceneIdx));
      const emotionalNonRepair562b = (records as any[]).filter(
        r =>
          !repairIdxSet562b.has(r.sceneIdx) &&
          r.emotionalShift !== 'neutral' &&
          r.emotionalShift !== null &&
          r.emotionalShift !== undefined &&
          r.emotionalShift !== '',
      ).length;
      if (repairScenes562b.length >= 3 && emotionalNonRepair562b >= 2) {
        const allRepairsNeutral562b = repairScenes562b.every(
          (r: any) =>
            r.emotionalShift === 'neutral' ||
            r.emotionalShift === null ||
            r.emotionalShift === undefined ||
            r.emotionalShift === '',
        );
        if (allRepairsNeutral562b) {
          issues.push({
            location: `${repairScenes562b.length} repair scene(s) — all emotionally neutral`,
            rule: 'CONFLICT_REPAIR_EMOTION_DECOUPLED',
            severity: 'minor',
            description: `All ${repairScenes562b.length} of the story's bond-repair scenes (positive shift ≥ +0.3) carry no emotional charge, even though ${emotionalNonRepair562b} other scene(s) render felt emotion. Repair is one of the most emotionally significant events available to a story — a broken bond restored, an estrangement healed, an alliance rebuilt should move the protagonist visibly. When every reconciliation is emotionally flat while emotion exists elsewhere, the relational-warmth layer and the felt-emotion layer run on separate tracks: bonds mend in scenes the protagonist experiences without affect. The audience watches the relationships improve but is given no emotional cue to feel the weight of the healing, draining the reconciliations of the payoff that makes them resonate.`,
            suggestedFix: `Attach an emotional beat to at least one repair scene: let the protagonist register relief, gratitude, joy, or even a complicated bittersweetness as a bond heals. The emotion need not be uncomplicated — a reconciliation tinged with lingering hurt is often more resonant than uncomplicated warmth — but the repair should move the protagonist visibly. A bond that mends while the protagonist feels nothing reads as a plot mechanic rather than an emotional event.`,
          });
        }
      }
    }
  }

  // CONFLICT_REPAIR_CURIOSITY_AFTERMATH_VOID — sequence/aftermath × repair → curiosity aftermath.
  // n≥8, ≥2 repair scenes (positive shift ≥ +0.3) not at the final position, ≥2 curiosity-positive
  // scenes globally (proving the wondering engine works), every repair followed by 2 scenes with
  // curiosityDelta ≤ 0 → fire. Reconciliation never opens new questions: every time a bond heals,
  // the scenes that follow raise no curiosity. A repair is a natural springboard for new wondering —
  // a restored alliance invites the question of what the reunited characters will now attempt; a
  // healed bond raises the question of whether it will hold. When repair aftermaths are uniformly
  // curiosity-flat while the story raises curiosity elsewhere, the relational-warmth engine and the
  // wondering engine never feed each other: reconciliations close emotional loops without opening
  // narrative ones, and the forward pull that a repair could generate is left untapped.
  // Distinct from: CONFLICT_AFTERMATH_CURIOSITY_VOID (Wave 422: aftermath × RUPTURE → curiosity —
  // same aftermath channel but the NEGATIVE shift trigger; this is the positive-shift / repair
  // complement, and together they cover both relational directions feeding the curiosity aftermath),
  // CONFLICT_REPAIR_FRONT_LOADED (Wave 520: distribution, not aftermath), CONFLICT_RUPTURE_CURIOSITY_
  // DECOUPLED (Wave 478: co-occurrence × curiosity IN the rupture scene — same-scene, not aftermath),
  // CONFLICT_CURIOSITY_CLOSING_ZONE_ABSENT (Wave 520: zone check, not aftermath). First aftermath
  // check using the repair signal as trigger in this pass.
  {
    const n562c = records.length;
    if (n562c >= 8) {
      const curiosityCount562c = (records as any[]).filter(r => (r.curiosityDelta ?? 0) > 0).length;
      const repairRecs562c = (records as any[])
        .map((r, i) => ({ r, i }))
        .filter(
          ({ r, i }) =>
            i < n562c - 1 &&
            ((r.relationshipShifts ?? []) as Array<{ amount: number }>).some(s => s.amount >= 0.3),
        );
      if (curiosityCount562c >= 2 && repairRecs562c.length >= 2) {
        const allCuriosityVoid562c = repairRecs562c.every(({ i }) => {
          for (let off = 1; off <= 2; off++) {
            const next = (records as any[])[i + off];
            if (next && (next.curiosityDelta ?? 0) > 0) return false;
          }
          return true;
        });
        if (allCuriosityVoid562c) {
          issues.push({
            location: `${repairRecs562c.length} repair scene(s) — none followed by a curiosity rise within 2 scenes`,
            rule: 'CONFLICT_REPAIR_CURIOSITY_AFTERMATH_VOID',
            severity: 'minor',
            description: `Every one of the story's ${repairRecs562c.length} bond-repair scenes (positive shift ≥ +0.3) is followed by two scenes with no curiosity rise, even though the story raises curiosity in ${curiosityCount562c} scene(s) elsewhere. A repair is a natural springboard for new wondering — a restored alliance invites the question of what the reunited characters will now attempt together; a healed bond raises the question of whether it will hold under the next pressure. When every reconciliation's aftermath is curiosity-flat, the relational-warmth engine and the wondering engine never feed each other: repairs close emotional loops without opening narrative ones, and the forward pull a reconciliation could generate is left untapped. The story heals bonds and raises questions in entirely separate moments.`,
            suggestedFix: `After at least one repair, let the next scene or two open a new question that the reconciliation makes possible: what the restored alliance will now risk together, whether the healed bond can survive a fresh test, or what the reunited characters will discover now that they are working as one. A reconciliation that opens a new question carries forward momentum; one that closes an emotional loop without opening a narrative one lets the story's energy dissipate at the moment a bond is restored.`,
          });
        }
      }
    }
  }

  // ── Wave 576: CONFLICT_CURIOSITY_ZONE_CLUSTER, CONFLICT_TURN_AFTERMATH_SUSPENSE_VOID,
  //              CONFLICT_REVELATION_DROUGHT_RUN ────────────────────────────────────────────────
  {
    // CONFLICT_CURIOSITY_ZONE_CLUSTER (distribution/timing × curiosityDelta × structural thirds,
    // n≥9, ≥3 curiosity-positive scenes [curiosityDelta>0], >75% of them fall in one structural
    // third): The story's question-opening beats are ghettoized into one structural zone while the
    // other two-thirds of the conflict arc are wonder-flat. A thirds-based cluster is finer-grained
    // than the closing-zone-absence check: a script can have curiosity present in the closing third
    // and still concentrate three-quarters of all wonder beats into, say, the opening third, leaving
    // the middle and late sections question-quiet. When curiosity is zoned into one stretch, the
    // conflict's mystery dimension reads as an early burst of wonder (or a late avalanche) rather
    // than a continuous thread of deepening questions sustaining the conflict through all three acts.
    // Distribution/timing mode × curiosity channel × structural thirds. Distinct from CONFLICT_
    // CURIOSITY_CLOSING_ZONE_ABSENT (Wave 520: zone-presence/absence × closing third — fires when
    // zero curiosity in the closing zone, regardless of concentration elsewhere), CONFLICT_AFTERMATH_
    // CURIOSITY_VOID (aftermath mode), CONFLICT_RUPTURE_CURIOSITY_DECOUPLED (co-occurrence mode).
    if (records.length >= 9) {
      const curiPos576a = (records as any[])
        .map((r, pos) => ({ r, pos }))
        .filter(({ r }) => (r.curiosityDelta ?? 0) > 0)
        .map(({ pos }) => pos);
      if (curiPos576a.length >= 3) {
        const third576a = Math.floor(records.length / 3);
        const z1Curi576a = curiPos576a.filter(p => p < third576a).length;
        const z3Curi576a = curiPos576a.filter(p => p >= 2 * third576a).length;
        const z2Curi576a = curiPos576a.length - z1Curi576a - z3Curi576a;
        const maxZ576a = Math.max(z1Curi576a, z2Curi576a, z3Curi576a);
        if (maxZ576a / curiPos576a.length > 0.75) {
          const zoneName576a = z1Curi576a === maxZ576a ? 'opening' : z3Curi576a === maxZ576a ? 'closing' : 'middle';
          issues.push({
            location: `curiosity spikes: ${z1Curi576a} opening / ${z2Curi576a} middle / ${z3Curi576a} closing third — ${Math.round(maxZ576a / curiPos576a.length * 100)}% in the ${zoneName576a} third`,
            rule: 'CONFLICT_CURIOSITY_ZONE_CLUSTER',
            severity: 'minor',
            description: `${Math.round(maxZ576a / curiPos576a.length * 100)}% of the conflict arc's ${curiPos576a.length} curiosity-spike scenes are concentrated in the ${zoneName576a} structural third, leaving the other two-thirds wonder-flat. The conflict's mystery dimension — the questions the escalating situation generates — is ghettoized into one zone rather than sustained across the full arc. When curiosity clusters in one stretch, the audience experiences a burst of wondering followed by a long question-quiet stretch rather than continuous deepening uncertainty. Effective conflict sustains wonder across all three structural zones: early questions establish what is at stake and unknown, middle questions deepen the mystery under pressure, and late questions hold the tension through the resolution.`,
            suggestedFix: `Redistribute curiosity spikes so that each structural third carries at least one moment where the conflict opens a new question. Move some of the ${zoneName576a} third's wonder beats into the underweight zones, or add new curiosity-generating moments in the question-quiet sections. The conflict is most gripping when it keeps generating new questions across its full arc — when the audience never knows whether they understand enough to predict the outcome.`,
          });
        }
      }
    }

    // CONFLICT_TURN_AFTERMATH_SUSPENSE_VOID (sequence/aftermath × dramatic turn → suspense aftermath,
    // n≥8, ≥2 qualifying dramatic-turn scenes [dramaticTurn !== 'nothing', pos < n-1], ≥2 suspense-
    // positive scenes globally, none of the qualifying turn scenes is followed by a suspenseDelta > 0
    // scene within the next 2 scenes): Every reversal or pivot in the conflict arc passes without
    // escalating the felt tension in its immediate aftermath — pivots restructure the situation but
    // never raise the stakes for the protagonist in the two scenes that follow. A dramatic turn is
    // a moment of structural reorientation: the conflict flips direction, new information changes
    // the meaning of prior events, or the protagonist's position is fundamentally altered. The
    // natural aftermath of a turn is heightened urgency — the protagonist's old position is gone
    // and the new situation demands a recalibration that should register as increased pressure.
    // When every turn's aftermath is suspense-flat, pivots function as pure plot mechanics rather
    // than as escalation events: the situation changes but the protagonist's felt danger does not
    // respond. Sequence/aftermath mode × dramatic turn trigger × suspense aftermath. Distinct from
    // CONFLICT_EMOTION_DECOUPLED (co-occurrence × dramatic turn × emotional state — same-scene
    // check on emotional channel), CONFLICT_CLOSING_SUSPENSE_VOID (zone × closing third × suspense
    // absence — zone-based not aftermath), CONFLICT_AFTERMATH_CURIOSITY_VOID (same aftermath
    // structure × curiosity channel — not suspense).
    if (records.length >= 8) {
      const qualTurns576b = (records as any[])
        .map((r, pos) => ({ r, pos }))
        .filter(({ r, pos }) =>
          (r.dramaticTurn ?? 'nothing') !== 'nothing' &&
          r.dramaticTurn !== '' &&
          pos < records.length - 1,
        );
      const suspScenes576b = (records as any[]).filter(r => (r.suspenseDelta ?? 0) > 0);
      if (qualTurns576b.length >= 2 && suspScenes576b.length >= 2) {
        const anyTurnAftermathSusp576b = qualTurns576b.some(({ pos }) => {
          const next1 = (records as any[])[pos + 1];
          const next2 = pos + 2 < records.length ? (records as any[])[pos + 2] : null;
          return (
            (next1 && (next1.suspenseDelta ?? 0) > 0) ||
            (next2 && (next2.suspenseDelta ?? 0) > 0)
          );
        });
        if (!anyTurnAftermathSusp576b) {
          issues.push({
            location: `${qualTurns576b.length} dramatic-turn scene(s) — none followed by a suspense rise within 2 scenes`,
            rule: 'CONFLICT_TURN_AFTERMATH_SUSPENSE_VOID',
            severity: 'minor',
            description: `None of the conflict's ${qualTurns576b.length} dramatic-turn scenes is followed by a positive suspenseDelta within the next two scenes, even though ${suspScenes576b.length} suspense-rise scenes exist elsewhere in the script. A dramatic turn is a moment of structural reorientation — the conflict flips direction, the protagonist's position changes, the meaning of prior events is restructured — and the natural aftermath is heightened urgency: the new situation demands a recalibration the protagonist has not yet completed, and that gap is where felt pressure should rise. When every pivot's aftermath is suspense-flat, turns function as pure plot mechanics: the situation changes but the protagonist's danger does not register in the two scenes immediately following the reversal. The conflict pivots without escalating.`,
            suggestedFix: `After at least one dramatic turn, let the next one or two scenes carry a positive suspenseDelta that the new configuration generates — the heightened danger of a restructured situation, the pressure of the protagonist's revised position, or the urgency of having to respond to a conflict that has just changed shape. A turn that raises tension in its aftermath does more than restructure: it escalates. The audience, having just seen the conflict's direction change, experiences that change as increased pressure rather than as a neutral repositioning.`,
          });
        }
      }
    }

    // CONFLICT_REVELATION_DROUGHT_RUN (run-based × revelation × absence, n≥10, ≥2 revelation scenes
    // globally, longest consecutive run of scenes with no revelation ≥ 7): The conflict arc's
    // information-disclosure engine goes silent for an extended consecutive stretch — seven or more
    // scenes pass without a revelation, even though disclosure moments exist elsewhere. Revelations
    // in a conflict arc are the mechanism by which hidden truths emerge under pressure: they reframe
    // the conflict's meaning, expose hidden causes and motivations, and generate the kind of
    // irrevocable knowledge that forces the characters into new positions. When revelations are absent
    // for an extended run, the conflict advances through event-and-reaction sequences without any new
    // hidden truth becoming known — the audience watches the conflict escalate without their
    // understanding of it deepening. A long revelation drought means the conflict's epistemic
    // dimension flatlines for a significant stretch: no hidden cause surfaces, no motivation is
    // exposed, no previously misunderstood fact becomes clear. Run-based mode × revelation absence.
    // Distinct from CONFLICT_CURIOSITY_CLOSING_ZONE_ABSENT (zone × closing third — fixed zone not
    // sliding run), CONFLICT_REPAIR_DROUGHT_RUN (Wave 562: run-based × repair absence — different
    // channel), CONFLICT_RUPTURE_CURIOSITY_DECOUPLED (co-occurrence × same-scene — not run-based).
    if (records.length >= 10) {
      const revealScenes576c = (records as any[]).filter(
        r => r.revelation !== null && r.revelation !== undefined && r.revelation !== '',
      );
      if (revealScenes576c.length >= 2) {
        let longestDrought576c = 0;
        let cur576c = 0;
        for (const r of records as any[]) {
          if (r.revelation === null || r.revelation === undefined || r.revelation === '') {
            cur576c++;
            if (cur576c > longestDrought576c) longestDrought576c = cur576c;
          } else {
            cur576c = 0;
          }
        }
        if (longestDrought576c >= 7) {
          issues.push({
            location: `longest revelation drought: ${longestDrought576c} consecutive scenes without a disclosure`,
            rule: 'CONFLICT_REVELATION_DROUGHT_RUN',
            severity: 'minor',
            description: `The conflict arc contains a run of ${longestDrought576c} consecutive scenes with no revelation — an extended disclosure drought — even though ${revealScenes576c.length} revelation scenes exist elsewhere. Revelations are the mechanism by which hidden truths emerge under pressure: they reframe the conflict, expose hidden motivations, and generate the irrevocable knowledge that forces characters into new positions. An unbroken stretch of ${longestDrought576c} revelation-free scenes means the conflict advances through action and reaction for an extended run without any new hidden truth coming to light — the audience watches the situation escalate without their understanding of it deepening. The conflict's epistemic dimension flatlines: no cause surfaces, no motivation is exposed, no misunderstood fact becomes clear during the drought.`,
            suggestedFix: `Break up the ${longestDrought576c}-scene revelation drought by surfacing at least one hidden truth within the run — a motivation exposed, a cause disclosed, a previously misunderstood fact clarified. The revelation doesn't need to be dramatic: a small disclosure that recontextualizes even one detail deepens the audience's understanding of the conflict and prevents the extended run from feeling like pure event-and-reaction without epistemic dimension. A conflict that periodically reveals something new keeps the audience's understanding evolving alongside the escalating situation.`,
          });
        }
      }
    }
  }

  // ── Wave 590: CONFLICT_SEED_SUSPENSE_AFTERMATH_VOID,
  //              CONFLICT_CLOCK_TURN_AFTERMATH_VOID,
  //              CONFLICT_RUPTURE_DROUGHT_RUN ──────────────────────────────────────────────────────

  // CONFLICT_SEED_SUSPENSE_AFTERMATH_VOID — Sequence/aftermath × seed trigger → suspense aftermath.
  // n≥8, ≥2 qualifying seed-plant scenes (seededClueIds non-empty, pos<n-1), ≥2 suspense-rise
  // scenes globally (suspenseDelta > 0). Every qualifying seed scene is NOT followed by
  // suspenseDelta > 0 in the next 2 scenes → fire. When a clue is planted, the scenes immediately
  // following should carry escalating tension — the implied threat of the planted thread should
  // start pressing on the atmosphere. Seeds that are always followed by flat or declining suspense
  // mean the foreshadowing engine and the tension engine run in complete isolation: clues surface
  // but they never tighten the air around them.
  // Distinct from: CONFLICT_RUPTURE_SEED_AFTERMATH_VOID (Wave 506: rupture → seed aftermath —
  // rupture is the trigger, seed is the aftermath; this is the reverse direction), CONFLICT_
  // RUPTURE_SUSPENSE_VOID (Wave 436: rupture trigger → suspense aftermath — different trigger
  // channel), CONFLICT_TURN_AFTERMATH_SUSPENSE_VOID (Wave 576: dramatic-turn trigger → suspense
  // aftermath — different trigger), CONFLICT_CLOCK_AFTERMATH_VOID (Wave 450: clock trigger →
  // conflict-signal aftermath — different trigger and different aftermath channel). First aftermath
  // check in this pass using the seed-plant event as the trigger.
  {
    const n590a = records.length;
    if (n590a >= 8) {
      const seedRecs590a = (records as any[]).filter(
        (r, i) => i < n590a - 1 && ((r.seededClueIds ?? []) as any[]).length > 0,
      );
      const suspScenes590a = (records as any[]).filter(r => (r.suspenseDelta ?? 0) > 0);
      if (seedRecs590a.length >= 2 && suspScenes590a.length >= 2) {
        const allNoSusp590a = seedRecs590a.every((r: any) => {
          const idx = (records as any[]).indexOf(r);
          for (let off = 1; off <= 2; off++) {
            if (idx + off >= n590a) continue;
            if (((records as any[])[idx + off].suspenseDelta ?? 0) > 0) return false;
          }
          return true;
        });
        if (allNoSusp590a) {
          issues.push({
            location: `All ${seedRecs590a.length} clue-seeding aftermath window(s) — suspense flat`,
            rule: 'CONFLICT_SEED_SUSPENSE_AFTERMATH_VOID',
            severity: 'minor',
            description: `Every clue-seeding scene (${seedRecs590a.length} scene(s)) is followed by two scenes with no suspense rise — planted clues never escalate tension in the scenes that follow them. When a story embeds a foreshadowing thread, the natural expectation is that the implied threat or promise tightens the atmosphere in the scenes immediately after: the planted clue should make the world feel slightly more dangerous or urgent, not quieter. When ${suspScenes590a.length} suspense-rise scenes exist elsewhere in the script but never follow a seed, the foreshadowing engine and the tension engine run on completely separate tracks — clues surface and then the story momentarily exhales, robbing the planted thread of its immediate atmospheric payload.`,
            suggestedFix: `After at least one clue-seeding scene, let the following scene carry an escalating suspense beat — a complication the planted thread implies, a character who notices something they shouldn't, or a reveal of partial information that raises stakes. The scene immediately after a clue is planted is the optimal moment to tighten tension because the audience is already primed with the question the clue raised.`,
          });
        }
      }
    }
  }

  // CONFLICT_CLOCK_TURN_AFTERMATH_VOID — Sequence/aftermath × clock trigger → dramatic-turn aftermath.
  // n≥8, ≥2 qualifying clock-raised scenes (clockRaised true, pos<n-1), ≥2 dramatic-turn scenes
  // globally (dramaticTurn !== 'nothing'). Every qualifying clock scene is NOT followed by a dramatic
  // turn in the next 2 scenes → fire. When the story raises a clock — a deadline, a countdown, a
  // ticking constraint — the scenes immediately following should contain at least one structural pivot:
  // the deadline should force a decision, a reversal, or a revelation. When every clock scene is
  // followed by structural stasis, the deadline operates as atmosphere rather than engine.
  // Distinct from: CONFLICT_CLOCK_AFTERMATH_VOID (Wave 450: clock → conflict-signal aftermath —
  // aftermath channel is a conflict escalation signal [reversal/neg shift], not a dramatic turn;
  // different aftermath channel), CONFLICT_TURN_AFTERMATH_SUSPENSE_VOID (Wave 576: dramatic-turn
  // trigger → suspense aftermath — different trigger; this uses clock as trigger and turn as
  // aftermath, the reverse direction), CONFLICT_CLOCK_DECOUPLED (Wave 338: co-occurrence × clock ×
  // rupture — same-scene mode not aftermath), CONFLICT_WITHOUT_DEADLINE (no clock at all). First
  // aftermath check in this pass using the dramatic-turn as the aftermath channel for a clock trigger.
  {
    const n590b = records.length;
    if (n590b >= 8) {
      const clockRecs590b = (records as any[]).filter(
        (r, i) => i < n590b - 1 && r.clockRaised === true,
      );
      const turnScenes590b = (records as any[]).filter(
        r => (r.dramaticTurn ?? 'nothing') !== 'nothing' && r.dramaticTurn !== '',
      );
      if (clockRecs590b.length >= 2 && turnScenes590b.length >= 2) {
        const allNoTurn590b = clockRecs590b.every((r: any) => {
          const idx = (records as any[]).indexOf(r);
          for (let off = 1; off <= 2; off++) {
            if (idx + off >= n590b) continue;
            const nxt = (records as any[])[idx + off];
            if ((nxt.dramaticTurn ?? 'nothing') !== 'nothing' && nxt.dramaticTurn !== '') return false;
          }
          return true;
        });
        if (allNoTurn590b) {
          issues.push({
            location: `All ${clockRecs590b.length} clock aftermath window(s) — no dramatic turn within 2 scenes`,
            rule: 'CONFLICT_CLOCK_TURN_AFTERMATH_VOID',
            severity: 'minor',
            description: `Every scene that raises a deadline clock (${clockRecs590b.length} scene(s)) is followed by two structurally flat scenes — the ticking constraint never catalyses a dramatic turn in the scenes that immediately follow it. Clocks are the most primal mechanism for forcing structural pivots: when time is running out, characters must act, plans must change, allegiances must shift. When ${turnScenes590b.length} dramatic turns exist elsewhere in the script but none arrive in the wake of a clock raise, the deadline operates as atmosphere rather than engine — the audience registers the urgency but the story never lets the clock actually force a structural pivot.`,
            suggestedFix: `After at least one clock-raising scene, place a dramatic turn in the following scene or the one after — a reversal, an unexpected decision, or a revelation the time pressure makes unavoidable. Deadlines are structurally most powerful not just when they are introduced but when they are shown to change things: the turn is the evidence that the clock is real.`,
          });
        }
      }
    }
  }

  // CONFLICT_RUPTURE_DROUGHT_RUN — Run-based × rupture-absence.
  // n≥10, ≥2 rupture scenes (negative shift ≤ -0.3). Longest consecutive run of non-rupture scenes
  // ≥7 → fire. A sustained relational calm of 7+ scenes — where no bond breaks and no negative
  // shift registers — signals that the conflict engine's relational dimension has gone dark.
  // Unlike CONFLICT_CALM_STRETCH (Wave 492), which audits the absence of any conflict signal
  // (rupture OR reversal with suspenseDelta<-1) with a threshold of 5, this targets the rupture
  // channel alone with a higher threshold of 7, catching scripts where non-rupture conflict
  // (suspense drops, reversals) continues but the relational-fracture engine specifically flatlines.
  // Distinct from: CONFLICT_CALM_STRETCH (Wave 492: run-based × non-conflict = rupture OR
  // suspenseDelta<-1 — mixed signal channel, threshold 5; this is pure rupture-absence, threshold 7),
  // CONFLICT_REPAIR_DROUGHT_RUN (Wave 562: run-based × repair-absence — positive shift channel),
  // CONFLICT_REVELATION_DROUGHT_RUN (Wave 576: run-based × revelation-absence — information channel),
  // CONFLICT_BREATHING_ROOM_ABSENT (Wave 436: inter-rupture max gap ≤1 — fires when ruptures are too
  // CLOSE; this fires when the drought run is too LONG). First run-based check targeting the rupture
  // channel specifically.
  {
    const n590c = records.length;
    if (n590c >= 10) {
      const ruptureScenes590c = (records as any[]).filter(r =>
        ((r.relationshipShifts ?? []) as Array<{ amount: number }>).some(s => s.amount <= -0.3),
      );
      if (ruptureScenes590c.length >= 2) {
        let longestDrought590c = 0;
        let currentDrought590c = 0;
        for (const r of records as any[]) {
          if (((r.relationshipShifts ?? []) as Array<{ amount: number }>).some(s => s.amount <= -0.3)) {
            currentDrought590c = 0;
          } else {
            currentDrought590c++;
            if (currentDrought590c > longestDrought590c) longestDrought590c = currentDrought590c;
          }
        }
        if (longestDrought590c >= 7) {
          issues.push({
            location: `Longest rupture drought: ${longestDrought590c} consecutive non-rupture scenes`,
            rule: 'CONFLICT_RUPTURE_DROUGHT_RUN',
            severity: 'minor',
            description: `The conflict arc contains a run of ${longestDrought590c} consecutive scenes with no relationship rupture — an extended relational drought — even though ${ruptureScenes590c.length} rupture scenes exist elsewhere. Ruptures are the mechanism by which conflict is felt at the relational level: they crack bonds, expose fractures, and force characters into adversarial positions. An unbroken stretch of ${longestDrought590c} rupture-free scenes means the conflict advances through suspense and reversals for an extended run without any bond breaking — the relational dimension of the conflict goes quiet and no damage accumulates in the relationship layer during the drought.`,
            suggestedFix: `Break up the ${longestDrought590c}-scene rupture drought by introducing at least one relational fracture within the run — a betrayal, a confrontation that damages a bond, or a revelation that forces two characters apart. The fracture doesn't need to be the story's most dramatic rupture: even a small crack in a secondary relationship keeps the conflict's relational dimension alive during a long stretch and prevents the audience from forgetting that the story's bonds are under pressure.`,
          });
        }
      }
    }
  }

  // ── Wave 604: OPEN_THREAD_RUPTURE_DECOUPLED, VISUAL_CONFLICT_ZONE_IMBALANCE,
  //              OPEN_THREAD_REPAIR_AFTERMATH_VOID ──────────────────────────────────────────

  // OPEN_THREAD_RUPTURE_DECOUPLED — Co-occurrence/decoupling × unresolvedClues × rupture. Built
  // on checkCoOccurrenceDecoupled from the shared checks library. n≥8, ≥2 scenes carrying
  // outstanding clue-debt, ≥2 rupture scenes (a relationship shift ≤ -0.3). Zero overlap → fire.
  // Unresolved narrative tension and active relational conflict never occupy the same scene —
  // every open mystery lands while every bond is stable, and every bond-breaking moment lands
  // while no mystery hangs open. First use of the unresolvedClues field anywhere in this
  // 105-rule pass. Distinct from CONFRONTATION_AVOIDANCE (rupture × dialogueHighlights same-scene
  // check, a different field pairing entirely) and every other decoupling check in this file,
  // none of which pair unresolvedClues with the relational-conflict channel.
  {
    const r604a = checkCoOccurrenceDecoupled({
      records, minRecords: 8, minACount: 2, minBCount: 2,
      isA: r => (r.unresolvedClues ?? []).length > 0,
      isB: r => (r.relationshipShifts ?? []).some(s => s.amount <= -0.3),
    });
    if (r604a.fires) {
      issues.push({
        location: `${r604a.aCount} open-thread scene(s), ${r604a.bCount} rupture scene(s) — zero overlap`,
        rule: 'OPEN_THREAD_RUPTURE_DECOUPLED',
        severity: 'minor',
        description: `The ${r604a.aCount} scenes carrying outstanding, unpaid clue-debt never coincide with the ${r604a.bCount} scenes where a relationship ruptures — unresolved narrative tension and active interpersonal conflict run on entirely separate tracks. A mystery hanging open and a bond breaking are both sources of pressure on the story; when they never combine, each pressure is felt in isolation rather than compounding into a scene where a character's relationships fray precisely because something crucial remains unknown.`,
        suggestedFix: `Let at least one rupture happen in a scene that also carries open clue-debt — a bond breaking under the strain of an unresolved question, or a character's suspicion about what hasn't been explained driving the relational fracture. Tying the mystery's pressure to the conflict's pressure gives each greater weight than either carries alone.`,
      });
    }
  }

  // VISUAL_CONFLICT_ZONE_IMBALANCE — Underweight/bloat × visualBeats × four structural zones.
  // Built on checkZoneImbalance from the shared checks library. n≥10, ≥4 scenes with substantial
  // physical staging (visualBeats.length≥2), divided into four equal structural zones. Fires only
  // when one zone has zero visually dense scenes while another holds ≥50% of the total. First use
  // of the visualBeats field anywhere in this pass — every existing check in this file audits
  // conflict through relational shifts, suspenseDelta, or dramaticTurn (verbal/psychological
  // registers); this is the first to audit the distribution of conflict's physical register —
  // scenes leaning on staged action rather than dialogue or interior tension — across the story's
  // four quarters. A story whose physically staged conflict clusters in one act and vanishes from
  // another shifts abruptly between physical and psychological modes of conflict instead of
  // sustaining both throughout.
  {
    const r604b = checkZoneImbalance({
      records, minRecords: 10, minCount: 4, bloatRatio: 0.5,
      isPresent: r => (r.visualBeats ?? []).length >= 2,
    });
    if (r604b.fires) {
      const emptyNames604b = r604b.emptyZoneIdxs.map(i => FOUR_ZONE_NAMES[i]).join(', ');
      const bloatName604b = FOUR_ZONE_NAMES[r604b.bloatZoneIdx];
      issues.push({
        location: `${emptyNames604b} empty; ${bloatName604b} has ${r604b.counts[r604b.bloatZoneIdx]}/${r604b.totalCount} visually dense scenes`,
        rule: 'VISUAL_CONFLICT_ZONE_IMBALANCE',
        severity: 'minor',
        description: `The story's ${r604b.totalCount} physically staged scenes are unevenly distributed across its four structural zones: ${bloatName604b} contains ${r604b.counts[r604b.bloatZoneIdx]} of them (${Math.round((r604b.counts[r604b.bloatZoneIdx] / r604b.totalCount) * 100)}%) while ${emptyNames604b} contains none. Conflict's physical register — staged action rather than dialogue or relational tension — bloats in one structural quarter and vanishes from another, giving the story's balance between physical and psychological conflict an uneven rhythm across its four quarters.`,
        suggestedFix: `Redistribute physical staging: bring at least one heavily staged conflict beat into ${emptyNames604b}, or thin out ${bloatName604b}'s concentration by letting one of its visually dense scenes carry the conflict through dialogue or relational tension instead. A more even spread keeps both physical and psychological registers of conflict active throughout the story.`,
      });
    }
  }

  // OPEN_THREAD_REPAIR_AFTERMATH_VOID — Sequence/aftermath × heavy unresolved-clue-debt trigger
  // → repair absence. Built on checkAftermathVoid from the shared checks library. n≥8, ≥2
  // qualifying trigger scenes (unresolvedClues.length≥3 — heavy carried debt), ≥3 scenes anywhere
  // with a repair (relationship shift ≥ +0.3), a 2-scene lookahead window. Fires when every
  // heavy-debt scene's two-scene aftermath contains no repair, while repair does occur elsewhere
  // in the story. The heaviest concentrations of open mystery never give way to relational
  // healing in their immediate wake — bonds never mend in the shadow of what's still unresolved.
  // Distinct from CONFLICT_AFTERMATH_CURIOSITY_VOID and every other aftermath check in this pass
  // (Waves 506/520/548/590 and others), all of which use a discrete event trigger (rupture, seed,
  // payoff, single-peak) rather than unresolvedClues' accumulated-debt magnitude, and distinct
  // from OPEN_THREAD_RUPTURE_DECOUPLED above (same field, but that check is same-scene
  // co-occurrence with no positional/windowed component and checks rupture, not repair).
  {
    const r604c = checkAftermathVoid({
      records, minRecords: 8, minTriggerCount: 2, minAftermathCount: 3, window: 2,
      isTrigger: r => (r.unresolvedClues ?? []).length >= 3,
      isAftermath: r => (r.relationshipShifts ?? []).some(s => s.amount >= 0.3),
    });
    if (r604c.fires) {
      issues.push({
        location: `${r604c.triggerCount} heavy clue-debt scene(s) — no repair within 2 scenes after any of them`,
        rule: 'OPEN_THREAD_REPAIR_AFTERMATH_VOID',
        severity: 'minor',
        description: `Every scene carrying heavy unresolved clue-debt (${r604c.triggerCount} instances, each with 3 or more open threads at once) is followed by two full scenes with no relational repair, even though ${r604c.aftermathCount} repair moments occur elsewhere in the story. The heaviest concentrations of open mystery never give bonds a chance to mend in their immediate aftermath — the pressure of stacked unanswered questions is never relieved by relational healing nearby.`,
        suggestedFix: `In the two scenes following at least one heavy clue-debt moment, let a relationship mend — a small act of trust, an apology, or a moment of closeness that offsets the pressure of what's still unresolved. Giving the mystery's weight a nearby relational counterweight keeps the conflict and connection channels responsive to each other.`,
      });
    }
  }

  // ── Wave 618: CONFLICT_PAYOFF_STAGING_DECOUPLED, CONFLICT_PAYOFF_ZONE_IMBALANCE,
  //              CONFLICT_TURN_STAGING_AFTERMATH_VOID ─────────────────────────────────────

  // CONFLICT_PAYOFF_STAGING_DECOUPLED — Co-occurrence/decoupling × payoffSetupIds × visualBeats.
  // Built on checkCoOccurrenceDecoupled from the shared checks library. n≥6, ≥2 payoff scenes, ≥2
  // visually-staged scenes (visualBeats.length≥2). Zero overlap → fire. A conflict thread
  // resolving and a scene rich in physical staging never happen together — every payoff lands
  // through dialogue or interiority alone, and every heavily staged scene resolves no ongoing
  // conflict. First pairing of these two fields in this 108-rule pass.
  {
    const r618a = checkCoOccurrenceDecoupled({
      records, minRecords: 6, minACount: 2, minBCount: 2,
      isA: r => (r.payoffSetupIds ?? []).length > 0,
      isB: r => (r.visualBeats ?? []).length >= 2,
    });
    if (r618a.fires) {
      issues.push({
        location: `${r618a.aCount} payoff scene(s), ${r618a.bCount} visually-staged scene(s) — zero overlap`,
        rule: 'CONFLICT_PAYOFF_STAGING_DECOUPLED',
        severity: 'minor',
        description: `The ${r618a.aCount} scenes where a conflict thread resolves never coincide with the ${r618a.bCount} scenes leaning heavily on physical staging — resolution and physical presence run on separate tracks. A conflict's resolution often lands with more force when a character's action embodies the outcome, rather than the moment being carried entirely through dialogue.`,
        suggestedFix: `Let at least one payoff scene also lean on physical staging — an action a character takes, or an object they handle, that embodies what the resolved conflict cost or settled.`,
      });
    }
  }

  // CONFLICT_PAYOFF_ZONE_IMBALANCE — Underweight/bloat × payoffSetupIds × four structural zones.
  // Built on checkZoneImbalance from the shared checks library. n≥10, ≥4 payoff scenes total,
  // divided across four equal structural zones. Fires only when one zone has zero payoffs while
  // another holds ≥50% of the total. First zone-based check on the payoff channel in this pass —
  // Wave 604 applied checkZoneImbalance to visualBeats only; payoffSetupIds itself has never been
  // audited for structural distribution here, despite being the trigger for two existing aftermath
  // checks.
  {
    const r618b = checkZoneImbalance({
      records, minRecords: 10, minCount: 4, bloatRatio: 0.5,
      isPresent: r => (r.payoffSetupIds ?? []).length > 0,
    });
    if (r618b.fires) {
      const emptyNames618b = r618b.emptyZoneIdxs.map(i => FOUR_ZONE_NAMES[i]).join(', ');
      const bloatName618b = FOUR_ZONE_NAMES[r618b.bloatZoneIdx];
      issues.push({
        location: `${emptyNames618b} empty; ${bloatName618b} has ${r618b.counts[r618b.bloatZoneIdx]}/${r618b.totalCount} payoff scenes`,
        rule: 'CONFLICT_PAYOFF_ZONE_IMBALANCE',
        severity: 'minor',
        description: `The story's ${r618b.totalCount} conflict-resolution scenes are unevenly distributed across its four structural zones: ${bloatName618b} contains ${r618b.counts[r618b.bloatZoneIdx]} of them (${Math.round((r618b.counts[r618b.bloatZoneIdx] / r618b.totalCount) * 100)}%) while ${emptyNames618b} contains none. Conflict resolution bloats in one structural quarter and vanishes from another, giving the story's sense of ongoing settlement an uneven structural rhythm.`,
        suggestedFix: `Redistribute resolutions: let at least one conflict thread resolve in the empty zone(s) — ${emptyNames618b} — rather than concentrating settlement in a single quarter of the story.`,
      });
    }
  }

  // CONFLICT_TURN_STAGING_AFTERMATH_VOID — Sequence/aftermath × dramaticTurn trigger →
  // visualBeats absence. Built on checkAftermathVoid from the shared checks library. n≥8, ≥2
  // qualifying dramatic-turn scenes (pos<n-2), ≥3 scenes anywhere with substantial physical
  // staging (visualBeats.length≥2), a 2-scene lookahead window. Fires when every turn's two-scene
  // aftermath contains no visually dense scene, while such scenes do occur elsewhere in the story.
  // A structural pivot that never gives way to physical staging nearby means the story processes
  // its reversals entirely through dialogue or exposition, never through visible physical
  // consequence. First pairing of dramaticTurn with visualBeats in this pass.
  {
    const r618c = checkAftermathVoid({
      records, minRecords: 8, minTriggerCount: 2, minAftermathCount: 3, window: 2,
      isTrigger: r => (r.dramaticTurn ?? 'nothing') !== 'nothing',
      isAftermath: r => (r.visualBeats ?? []).length >= 2,
    });
    if (r618c.fires) {
      issues.push({
        location: `${r618c.triggerCount} dramatic-turn scene(s) — no visually dense scene within 2 scenes of any`,
        rule: 'CONFLICT_TURN_STAGING_AFTERMATH_VOID',
        severity: 'minor',
        description: `Every one of the story's ${r618c.triggerCount} dramatic-turn scenes is followed by two scenes with no substantial physical staging, even though ${r618c.aftermathCount} such scenes exist elsewhere in the script. A pivot's consequences often play out physically — a character acting differently in the world because of what just changed — and when that aftermath consistently stays unstaged, the turn's impact is only ever discussed, never shown.`,
        suggestedFix: `After at least one dramatic turn, let one of the following two scenes carry substantial physical staging — a character's changed behavior made visible through action rather than only through what they say.`,
      });
    }
  }

  // ── Wave 632: CONFLICT_HIGHLIGHT_OPEN_THREAD_DECOUPLED, CONFLICT_OPEN_THREAD_STAGING_
  //              AFTERMATH_VOID, CONFLICT_DIALOGUE_HIGHLIGHT_ZONE_IMBALANCE ───────────────────

  // CONFLICT_HIGHLIGHT_OPEN_THREAD_DECOUPLED — Co-occurrence/decoupling × dialogueHighlights ×
  // unresolvedClues. Built on checkCoOccurrenceDecoupled from the shared checks library. n≥6, ≥2
  // scenes carrying a dialogue highlight, ≥2 scenes carrying outstanding clue-debt. Zero overlap
  // → fire. First pairing of these two fields in this 111-rule pass. A line the story flags as
  // memorable never lands while a mystery sits open — the conflict's most quotable moments and
  // its live tensions run on separate tracks.
  {
    const r632a = checkCoOccurrenceDecoupled({
      records, minRecords: 6, minACount: 2, minBCount: 2,
      isA: r => (r.dialogueHighlights ?? []).length > 0,
      isB: r => (r.unresolvedClues ?? []).length > 0,
    });
    if (r632a.fires) {
      issues.push({
        location: `${r632a.aCount} dialogue-highlight scene(s), ${r632a.bCount} open-thread scene(s) — zero overlap`,
        rule: 'CONFLICT_HIGHLIGHT_OPEN_THREAD_DECOUPLED',
        severity: 'minor',
        description: `The ${r632a.aCount} scenes flagged as containing a standout line of dialogue never coincide with the ${r632a.bCount} scenes carrying outstanding clue-debt — the story's most memorable dialogue and its open conflicts never intersect. A line worth remembering often lands hardest when a character is actively pressing on an unresolved tension.`,
        suggestedFix: `Let at least one standout line of dialogue land in a scene that is also carrying open clue-debt — a character voicing suspicion or naming what's still unresolved, tying the conflict's most memorable moment to its live tension.`,
      });
    }
  }

  // CONFLICT_OPEN_THREAD_STAGING_AFTERMATH_VOID — Sequence/aftermath × heavy unresolved-clue-debt
  // trigger → visualBeats absence. Built on checkAftermathVoid from the shared checks library.
  // n≥8, ≥2 qualifying heavy-debt scenes (unresolvedClues.length≥3, pos<n-2), ≥3 scenes anywhere
  // with substantial physical staging, a 2-scene lookahead window. Fires when every heavy-debt
  // scene's two-scene aftermath contains no visually dense scene, while such scenes do occur
  // elsewhere. First pairing of unresolvedClues with visualBeats in this pass — the heaviest
  // concentrations of open conflict never register physically in the story's world nearby.
  {
    const r632b = checkAftermathVoid({
      records, minRecords: 8, minTriggerCount: 2, minAftermathCount: 3, window: 2,
      isTrigger: r => (r.unresolvedClues ?? []).length >= 3,
      isAftermath: r => (r.visualBeats ?? []).length >= 2,
    });
    if (r632b.fires) {
      issues.push({
        location: `${r632b.triggerCount} heavy clue-debt scene(s) — no visually dense scene within 2 scenes of any`,
        rule: 'CONFLICT_OPEN_THREAD_STAGING_AFTERMATH_VOID',
        severity: 'minor',
        description: `Every scene carrying heavy unresolved clue-debt (${r632b.triggerCount} instances) is followed by two full scenes with no substantial physical staging, even though ${r632b.aftermathCount} such scenes occur elsewhere in the story. The heaviest concentrations of open conflict never show up physically nearby — no restless action, no tense staging reflecting the unresolved pressure.`,
        suggestedFix: `In the two scenes following at least one heavy clue-debt moment, let physical staging carry some of the tension — a character pacing, handling an object tied to the unresolved conflict, or otherwise showing the pressure rather than only discussing it.`,
      });
    }
  }

  // CONFLICT_DIALOGUE_HIGHLIGHT_ZONE_IMBALANCE — Underweight/bloat × dialogueHighlights × four
  // structural zones. Built on checkZoneImbalance from the shared checks library. n≥10, ≥4 scenes
  // carrying a dialogue highlight, divided across four equal structural zones. Fires only when
  // one zone has zero such scenes while another holds ≥50% of the total. Waves 604 and 618
  // applied this template to visualBeats and payoffSetupIds respectively; dialogueHighlights
  // itself has never been zone-audited in this file.
  {
    const r632c = checkZoneImbalance({
      records, minRecords: 10, minCount: 4, bloatRatio: 0.5,
      isPresent: r => (r.dialogueHighlights ?? []).length > 0,
    });
    if (r632c.fires) {
      const emptyNames632c = r632c.emptyZoneIdxs.map(i => FOUR_ZONE_NAMES[i]).join(', ');
      const bloatName632c = FOUR_ZONE_NAMES[r632c.bloatZoneIdx];
      issues.push({
        location: `${emptyNames632c} empty; ${bloatName632c} has ${r632c.counts[r632c.bloatZoneIdx]}/${r632c.totalCount} dialogue-highlight scenes`,
        rule: 'CONFLICT_DIALOGUE_HIGHLIGHT_ZONE_IMBALANCE',
        severity: 'minor',
        description: `The story's ${r632c.totalCount} dialogue-highlight scenes are unevenly distributed across its four structural zones: ${bloatName632c} contains ${r632c.counts[r632c.bloatZoneIdx]} of them (${Math.round((r632c.counts[r632c.bloatZoneIdx] / r632c.totalCount) * 100)}%) while ${emptyNames632c} contains none. Memorable conflict dialogue bloats in one structural quarter and vanishes from another, giving the story's verbal-conflict rhythm an uneven pulse.`,
        suggestedFix: `Redistribute standout dialogue: bring at least one memorable conflict line into ${emptyNames632c}, so every structural quarter carries some verbal high point for the conflict, not only the quarter currently carrying most of them.`,
      });
    }
  }

  // ── Wave 646: CONFLICT_STAGING_PEAK_UNCAUSED, CONFLICT_OPEN_THREAD_DROUGHT_RUN,
  //              CONFLICT_HIGHLIGHT_ZONE_CLUSTER ──────────────────────────────────────────────

  // CONFLICT_STAGING_PEAK_UNCAUSED — Single-peak isolation/backward-cause × visualBeats
  // magnitude. Built on checkPeakUncaused from the shared checks library. n≥8, ≥2 visually-staged
  // scenes, a 2-scene lookback. Finds the single scene with the densest physical staging; fires
  // when neither that scene nor either of the two before it contains a dramatic turn or
  // revelation. First checkPeakUncaused use in this pass via the shared library — distinct from
  // the existing CONFLICT_PEAK_*_ABSENT family (suspense/emotion/curiosity/dramaticTurn/clock/
  // revelation/payoff/seed/rupture/repair), which each audit whether the story's peak
  // conflict-magnitude scene itself lacks a given channel; this instead asks whether a
  // physical-staging peak is causally earned by a preceding structural pivot.
  {
    const r646a = checkPeakUncaused({
      records, minRecords: 8, minQualifying: 2, lookback: 2,
      magnitude: r => (r.visualBeats ?? []).length,
      hasCause: r => r.dramaticTurn !== 'nothing' || r.revelation != null,
    });
    if (r646a.fires) {
      issues.push({
        location: `scene ${r646a.peakIdx + 1} — peak physical-staging density (${r646a.peakMagnitude}) with no dramatic turn or revelation nearby`,
        rule: 'CONFLICT_STAGING_PEAK_UNCAUSED',
        severity: 'minor',
        description: `The story's single densest scene for physical staging (scene ${r646a.peakIdx + 1}, with ${r646a.peakMagnitude} staged beats) has no dramatic turn or revelation in itself or the two scenes before it. The moment where physical conflict concentrates most heavily arrives without any structural pivot or disclosure driving it — the peak of staged action and the peak of narrative causality never coincide.`,
        suggestedFix: `Give scene ${r646a.peakIdx + 1} — or one of the two scenes just before it — a dramatic turn or revelation, so the story's most physically intense moment is earned by a shift in the conflict rather than arriving in a causal vacuum.`,
      });
    }
  }

  // CONFLICT_OPEN_THREAD_DROUGHT_RUN — Run-based × unresolvedClues absence. Built on
  // checkDroughtRun from the shared checks library. n≥10, ≥3 open-thread scenes overall, fires
  // when the longest consecutive run of scenes with zero outstanding clue-debt reaches 6. This
  // pass already hand-rolls drought-run logic for repair (CONFLICT_REPAIR_DROUGHT_RUN),
  // revelation (CONFLICT_REVELATION_DROUGHT_RUN), and rupture (CONFLICT_RUPTURE_DROUGHT_RUN), but
  // never via the shared helper and never on the unresolvedClues channel — a long unbroken
  // stretch where every mystery is settled leaves the conflict's causal engine idle.
  {
    const r646b = checkDroughtRun({
      records, minRecords: 10, minPresentCount: 3, runThreshold: 6,
      isPresent: r => (r.unresolvedClues ?? []).length > 0,
    });
    if (r646b.fires) {
      issues.push({
        location: `longest stretch with no outstanding clue-debt: ${r646b.longestRun} consecutive scenes`,
        rule: 'CONFLICT_OPEN_THREAD_DROUGHT_RUN',
        severity: 'minor',
        description: `The story contains a run of ${r646b.longestRun} consecutive scenes with no outstanding clue-debt at all, even though ${r646b.presentCount} scenes elsewhere do carry open mysteries. A long stretch where nothing is left unresolved means the conflict's engine of unanswered questions goes fully dark for an extended run.`,
        suggestedFix: `Seed a new thread somewhere within the ${r646b.longestRun}-scene stretch so the conflict maintains some outstanding mystery throughout, keeping its causal pressure alive.`,
      });
    }
  }

  // CONFLICT_HIGHLIGHT_ZONE_CLUSTER — Distribution/timing × dialogueHighlights × structural
  // thirds. Built on checkZoneCluster from the shared checks library. n≥9, ≥3 highlighted-
  // dialogue scenes, fires when >75% of them fall in a single structural third. This pass already
  // applies the zone-cluster template to curiosity (CONFLICT_CURIOSITY_ZONE_CLUSTER); this is the
  // second channel — a scene where a line of dialogue is flagged as memorable concentrates
  // almost exclusively in one third rather than surfacing throughout the conflict.
  {
    const r646c = checkZoneCluster({
      records, minRecords: 9, minCount: 3, ratioThreshold: 0.75,
      isPresent: r => (r.dialogueHighlights ?? []).length > 0,
    });
    if (r646c.fires) {
      const zoneName646c = r646c.zoneNames[r646c.maxZoneIdx];
      issues.push({
        location: `${zoneName646c} third — ${r646c.maxZoneCount}/${r646c.count} highlighted-dialogue scenes`,
        rule: 'CONFLICT_HIGHLIGHT_ZONE_CLUSTER',
        severity: 'minor',
        description: `${r646c.maxZoneCount} of the story's ${r646c.count} scenes carrying a standout line of dialogue (${Math.round((r646c.maxZoneCount / r646c.count) * 100)}%) cluster in the ${zoneName646c} third. Memorable dialogue concentrates almost exclusively in that stretch of the conflict rather than landing throughout, leaving other structural thirds with nothing verbally memorable to carry the confrontation.`,
        suggestedFix: `Give at least one scene outside the ${zoneName646c} third a standout line of dialogue — spreading memorable confrontation across the story lets each structural third carry its own verbal weight.`,
      });
    }
  }

  // ── Wave 660: CONFLICT_PAYOFF_PEAK_UNCAUSED, CONFLICT_SEED_DROUGHT_RUN,
  //              CONFLICT_STAGING_ZONE_CLUSTER ───────────────────────────────────────────────

  // CONFLICT_PAYOFF_PEAK_UNCAUSED — Single-peak isolation/backward-cause × payoffSetupIds
  // magnitude. Built on checkPeakUncaused from the shared checks library. n≥8, ≥2 payoff scenes,
  // a 2-scene lookback. Finds the single scene with the most simultaneous thread resolutions;
  // fires when neither that scene nor either of the two before it contains a dramatic turn or
  // revelation. Distinct from CONFLICT_PEAK_PAYOFF_ABSENT (Wave 408), which anchors on the peak
  // RUPTURE scene and checks whether it lacks a payoff — this instead anchors on the peak PAYOFF
  // scene and asks whether it is backward-caused.
  {
    const r660a = checkPeakUncaused({
      records, minRecords: 8, minQualifying: 2, lookback: 2,
      magnitude: r => (r.payoffSetupIds ?? []).length,
      hasCause: r => r.dramaticTurn !== 'nothing' || r.revelation != null,
    });
    if (r660a.fires) {
      issues.push({
        location: `scene ${r660a.peakIdx + 1} — peak payoff density (${r660a.peakMagnitude}) with no dramatic turn or revelation nearby`,
        rule: 'CONFLICT_PAYOFF_PEAK_UNCAUSED',
        severity: 'minor',
        description: `The story's single densest scene for thread resolution (scene ${r660a.peakIdx + 1}, with ${r660a.peakMagnitude} payoffs resolving at once) has no dramatic turn or revelation in itself or the two scenes before it. The moment where the most convergent resolution lands arrives without any structural pivot or disclosure driving it — the peak of narrative payoff carries no causal weight behind it.`,
        suggestedFix: `Give scene ${r660a.peakIdx + 1} — or one of the two scenes just before it — a dramatic turn or revelation, so the story's most convergent resolution is earned by a shift in the conflict rather than arriving in a causal vacuum.`,
      });
    }
  }

  // CONFLICT_SEED_DROUGHT_RUN — Run-based × seededClueIds absence. Built on checkDroughtRun from
  // the shared checks library. n≥10, ≥3 seed scenes overall, fires when the longest consecutive
  // run of scenes with zero clue seeded reaches 6. This pass has extensive seed-channel coverage
  // in decoupling, aftermath-void, and peak-absent modes, but seededClueIds itself has never been
  // drought-audited.
  {
    const r660b = checkDroughtRun({
      records, minRecords: 10, minPresentCount: 3, runThreshold: 6,
      isPresent: r => (r.seededClueIds ?? []).length > 0,
    });
    if (r660b.fires) {
      issues.push({
        location: `longest stretch with no clue seeded: ${r660b.longestRun} consecutive scenes`,
        rule: 'CONFLICT_SEED_DROUGHT_RUN',
        severity: 'minor',
        description: `The story contains a run of ${r660b.longestRun} consecutive scenes with no clue seeded at all, even though ${r660b.presentCount} scenes elsewhere do plant new material. A long unbroken stretch where nothing new is planted leaves the conflict coasting on prior setups with nothing fresh to draw on.`,
        suggestedFix: `Seed a new clue or thread somewhere within the ${r660b.longestRun}-scene stretch so the conflict keeps planting forward momentum throughout, not only in isolated bursts.`,
      });
    }
  }

  // CONFLICT_STAGING_ZONE_CLUSTER — Distribution/timing × visualBeats × structural thirds. Built
  // on checkZoneCluster from the shared checks library. n≥9, ≥3 visually-staged scenes, fires when
  // >75% of them fall in a single structural third. Wave 646 applied the peak-uncaused mode to
  // visualBeats; this applies the zone-cluster mode to the same channel, a genuinely different
  // question — concentration vs. causal isolation.
  {
    const r660c = checkZoneCluster({
      records, minRecords: 9, minCount: 3, ratioThreshold: 0.75,
      isPresent: r => (r.visualBeats ?? []).length >= 2,
    });
    if (r660c.fires) {
      const zoneName660c = r660c.zoneNames[r660c.maxZoneIdx];
      issues.push({
        location: `${zoneName660c} third — ${r660c.maxZoneCount}/${r660c.count} visually dense scenes`,
        rule: 'CONFLICT_STAGING_ZONE_CLUSTER',
        severity: 'minor',
        description: `${r660c.maxZoneCount} of the story's ${r660c.count} visually dense scenes (${Math.round((r660c.maxZoneCount / r660c.count) * 100)}%) cluster in the ${zoneName660c} third. Physical staging concentrates almost exclusively in that stretch of the conflict rather than surfacing throughout, leaving other structural thirds with no physical anchor for the confrontation.`,
        suggestedFix: `Give at least one scene outside the ${zoneName660c} third substantial physical staging — spreading physical confrontation across the story lets each structural third carry its own staged weight.`,
      });
    }
  }

  // ── Wave 674: CONFLICT_CLOCK_DELTA_PEAK_UNCAUSED, CONFLICT_HIGHLIGHT_DROUGHT_RUN,
  //              CONFLICT_OPEN_THREAD_ZONE_CLUSTER ──────────────────────────────────────────

  // CONFLICT_CLOCK_DELTA_PEAK_UNCAUSED — Single-peak isolation/backward-cause × clockDelta
  // magnitude. Built on checkPeakUncaused from the shared checks library. n≥8, ≥2 scenes with
  // clockDelta>0, a 2-scene lookback. Finds the single scene with the highest clockDelta; fires
  // when neither that scene nor either of the two before it contains a dramatic turn or
  // revelation. This pass has extensive clockRaised coverage across decoupling, aftermath-void,
  // and peak-absent hand-rolled checks, but clockDelta itself has never been backward-cause
  // peak-audited via the shared helper.
  {
    const r674a = checkPeakUncaused({
      records, minRecords: 8, minQualifying: 2, lookback: 2,
      magnitude: r => r.clockDelta ?? 0,
      hasCause: r => r.dramaticTurn !== 'nothing' || r.revelation != null,
    });
    if (r674a.fires) {
      issues.push({
        location: `scene ${r674a.peakIdx + 1} — peak clockDelta (${r674a.peakMagnitude}) with no dramatic turn or revelation nearby`,
        rule: 'CONFLICT_CLOCK_DELTA_PEAK_UNCAUSED',
        severity: 'minor',
        description: `The scene with the story's single highest clockDelta (scene ${r674a.peakIdx + 1}, at ${r674a.peakMagnitude}) has no dramatic turn or revelation in itself or the two scenes before it. The moment time pressure compresses most sharply arrives without any structural pivot or disclosure driving it — the peak of urgency carries no causal weight behind it.`,
        suggestedFix: `Give scene ${r674a.peakIdx + 1} — or one of the two scenes just before it — a dramatic turn or revelation, so the conflict's sharpest deadline compression is earned by a shift in circumstance rather than arriving in a causal vacuum.`,
      });
    }
  }

  // CONFLICT_HIGHLIGHT_DROUGHT_RUN — Run-based × dialogueHighlights absence. Built on
  // checkDroughtRun from the shared checks library. n≥10, ≥3 highlighted-dialogue scenes overall,
  // fires when the longest consecutive run of scenes with no highlighted dialogue reaches 6.
  // Wave 646 applied the zone-cluster mode to dialogueHighlights; the drought-run mode has never
  // been applied to this channel.
  {
    const r674b = checkDroughtRun({
      records, minRecords: 10, minPresentCount: 3, runThreshold: 6,
      isPresent: r => (r.dialogueHighlights ?? []).length > 0,
    });
    if (r674b.fires) {
      issues.push({
        location: `longest stretch with no highlighted dialogue: ${r674b.longestRun} consecutive scenes`,
        rule: 'CONFLICT_HIGHLIGHT_DROUGHT_RUN',
        severity: 'minor',
        description: `The story contains a run of ${r674b.longestRun} consecutive scenes with no highlighted dialogue at all, even though ${r674b.presentCount} scenes elsewhere carry a standout line. A long unbroken stretch with nothing verbally memorable leaves the conflict running on unremarkable dialogue for an extended stretch.`,
        suggestedFix: `Give at least one scene within the ${r674b.longestRun}-scene stretch a standout line of dialogue — a character naming what's at stake in the confrontation memorably, keeping the verbal register alive throughout.`,
      });
    }
  }

  // CONFLICT_OPEN_THREAD_ZONE_CLUSTER — Distribution/timing × unresolvedClues × structural
  // thirds. Built on checkZoneCluster from the shared checks library. n≥9, ≥3 open-thread scenes,
  // fires when >75% of them fall in a single structural third. Wave 646 applied the drought-run
  // mode to unresolvedClues; the zone-cluster mode has never been applied to this channel.
  {
    const r674c = checkZoneCluster({
      records, minRecords: 9, minCount: 3, ratioThreshold: 0.75,
      isPresent: r => (r.unresolvedClues ?? []).length > 0,
    });
    if (r674c.fires) {
      const zoneName674c = r674c.zoneNames[r674c.maxZoneIdx];
      issues.push({
        location: `${zoneName674c} third — ${r674c.maxZoneCount}/${r674c.count} open-thread scenes`,
        rule: 'CONFLICT_OPEN_THREAD_ZONE_CLUSTER',
        severity: 'minor',
        description: `${r674c.maxZoneCount} of the story's ${r674c.count} scenes carrying outstanding clue-debt (${Math.round((r674c.maxZoneCount / r674c.count) * 100)}%) cluster in the ${zoneName674c} third. Open questions concentrate almost exclusively in that stretch of the story rather than persisting throughout, leaving other structural thirds with no live mystery pressing on the conflict.`,
        suggestedFix: `Let a clue remain unresolved into a scene outside the ${zoneName674c} third — spreading open threads across the story gives every structural third some unresolved pressure bearing on the conflict.`,
      });
    }
  }

  // ── Wave 688: CONFLICT_HIGHLIGHT_PEAK_UNCAUSED, CONFLICT_SEED_ZONE_CLUSTER,
  //              CONFLICT_STAGING_DROUGHT_RUN ──────────────────────────────────────────────────

  // CONFLICT_HIGHLIGHT_PEAK_UNCAUSED — Single-peak isolation/backward-cause × dialogueHighlights
  // magnitude. Built on checkPeakUncaused from the shared checks library. n≥8, ≥2 scenes carrying
  // a dialogue highlight, a 2-scene lookback. Finds the single scene with the most highlighted
  // lines; fires when neither that scene nor either of the two before it contains a dramatic turn
  // or revelation. Waves 646/674 applied the zone-cluster and drought-run modes to this channel;
  // the backward-cause peak mode has never been applied to it.
  {
    const r688a = checkPeakUncaused({
      records, minRecords: 8, minQualifying: 2, lookback: 2,
      magnitude: r => (r.dialogueHighlights ?? []).length,
      hasCause: r => r.dramaticTurn !== 'nothing' || r.revelation != null,
    });
    if (r688a.fires) {
      issues.push({
        location: `scene ${r688a.peakIdx + 1} — peak highlighted-dialogue density (${r688a.peakMagnitude}) with no dramatic turn or revelation nearby`,
        rule: 'CONFLICT_HIGHLIGHT_PEAK_UNCAUSED',
        severity: 'minor',
        description: `The story's single densest scene for highlighted dialogue (scene ${r688a.peakIdx + 1}, with ${r688a.peakMagnitude} standout lines) has no dramatic turn or revelation in itself or the two scenes before it. The moment where the script's most memorable dialogue concentrates arrives without any structural pivot or disclosure driving it — the peak of verbal craft and the peak of narrative causality never coincide.`,
        suggestedFix: `Give scene ${r688a.peakIdx + 1} — or one of the two scenes just before it — a dramatic turn or revelation, so the story's most quotable confrontation is earned by a shift in the conflict rather than arriving in a causal vacuum.`,
      });
    }
  }

  // CONFLICT_SEED_ZONE_CLUSTER — Distribution/timing × seededClueIds × structural thirds. Built on
  // checkZoneCluster from the shared checks library. n≥9, ≥3 seed scenes, fires when >75% of them
  // fall in a single structural third. Wave 660 applied the drought-run mode to seededClueIds; the
  // zone-cluster mode has never been applied to this channel despite extensive decoupling/
  // aftermath/peak-absent hand-rolled coverage.
  {
    const r688b = checkZoneCluster({
      records, minRecords: 9, minCount: 3, ratioThreshold: 0.75,
      isPresent: r => (r.seededClueIds ?? []).length > 0,
    });
    if (r688b.fires) {
      const zoneName688b = r688b.zoneNames[r688b.maxZoneIdx];
      issues.push({
        location: `${zoneName688b} third — ${r688b.maxZoneCount}/${r688b.count} seed scenes`,
        rule: 'CONFLICT_SEED_ZONE_CLUSTER',
        severity: 'minor',
        description: `${r688b.maxZoneCount} of the story's ${r688b.count} clue-planting scenes (${Math.round((r688b.maxZoneCount / r688b.count) * 100)}%) cluster in the ${zoneName688b} third. Foreshadowing concentrates almost exclusively in that stretch of the story rather than surfacing throughout, giving the conflict's causal engine an uneven structural rhythm.`,
        suggestedFix: `Plant at least one clue outside the ${zoneName688b} third — spreading foreshadowing across the story lets the conflict's causal pressure build gradually instead of arriving all at once.`,
      });
    }
  }

  // CONFLICT_STAGING_DROUGHT_RUN — Run-based × visualBeats absence. Built on checkDroughtRun from
  // the shared checks library. n≥10, ≥3 physically-staged scenes overall, fires when the longest
  // consecutive run of scenes with zero visual beats reaches 6. Wave 646 applied the peak-uncaused
  // mode and Wave 660 applied the zone-cluster mode to this channel; the drought-run mode has never
  // been applied to it.
  {
    const r688c = checkDroughtRun({
      records, minRecords: 10, minPresentCount: 3, runThreshold: 6,
      isPresent: r => (r.visualBeats ?? []).length > 0,
    });
    if (r688c.fires) {
      issues.push({
        location: `longest stretch with zero visual staging: ${r688c.longestRun} consecutive scenes`,
        rule: 'CONFLICT_STAGING_DROUGHT_RUN',
        severity: 'minor',
        description: `The story contains a run of ${r688c.longestRun} consecutive scenes with no visual staging beats at all, even though ${r688c.presentCount} scenes elsewhere do carry physical staging. A long unbroken stretch of pure dialogue or exposition with nothing physically shown leaves the conflict without any staged action to anchor it.`,
        suggestedFix: `Add a physical staging beat somewhere within the ${r688c.longestRun}-scene stretch — a gesture, an object, a piece of blocking — so the conflict stays physically grounded throughout.`,
      });
    }
  }

  // ── Wave 702: CONFLICT_OPEN_THREAD_PEAK_UNCAUSED, CONFLICT_CLOCK_ZONE_CLUSTER,
  //              CONFLICT_RELATIONSHIP_DROUGHT_RUN ─────────────────────────────────────────────

  // CONFLICT_OPEN_THREAD_PEAK_UNCAUSED — Single-peak isolation/backward-cause × unresolvedClues
  // magnitude. Built on checkPeakUncaused from the shared checks library. n≥8, ≥2 scenes carrying
  // outstanding clue-debt, a 2-scene lookback. Finds the single scene with the most simultaneous
  // open threads; fires when neither that scene nor either of the two before it contains a
  // dramatic turn or revelation. Wave 646 applied the drought-run mode and Wave 674 applied the
  // zone-cluster mode to this channel; the backward-cause peak mode has never been applied,
  // completing the trio.
  {
    const r702a = checkPeakUncaused({
      records, minRecords: 8, minQualifying: 2, lookback: 2,
      magnitude: r => (r.unresolvedClues ?? []).length,
      hasCause: r => r.dramaticTurn !== 'nothing' || r.revelation != null,
    });
    if (r702a.fires) {
      issues.push({
        location: `scene ${r702a.peakIdx + 1} — peak open-thread density (${r702a.peakMagnitude}) with no dramatic turn or revelation nearby`,
        rule: 'CONFLICT_OPEN_THREAD_PEAK_UNCAUSED',
        severity: 'minor',
        description: `The story's single densest scene for outstanding clue-debt (scene ${r702a.peakIdx + 1}, with ${r702a.peakMagnitude} open threads) has no dramatic turn or revelation in itself or the two scenes before it. The moment where unresolved mystery concentrates most heavily arrives without any structural pivot or disclosure driving it — the peak of accumulated question carries no causal weight behind it.`,
        suggestedFix: `Give scene ${r702a.peakIdx + 1} — or one of the two scenes just before it — a dramatic turn or revelation, so the story's most mystery-dense moment is earned by a shift in the conflict rather than arriving in a causal vacuum.`,
      });
    }
  }

  // CONFLICT_CLOCK_ZONE_CLUSTER — Distribution/timing × clockRaised × structural thirds. Built on
  // checkZoneCluster from the shared checks library. n≥9, ≥3 clock-raised scenes, fires when >75%
  // of them fall in a single structural third. clockRaised anchors extensive hand-rolled
  // aggregate/threshold logic in this pass but has never been zone-cluster-audited via the shared
  // library.
  {
    const r702b = checkZoneCluster({
      records, minRecords: 9, minCount: 3, ratioThreshold: 0.75,
      isPresent: r => r.clockRaised === true,
    });
    if (r702b.fires) {
      const zoneName702b = r702b.zoneNames[r702b.maxZoneIdx];
      issues.push({
        location: `${zoneName702b} third — ${r702b.maxZoneCount}/${r702b.count} clock-raised scenes`,
        rule: 'CONFLICT_CLOCK_ZONE_CLUSTER',
        severity: 'minor',
        description: `${r702b.maxZoneCount} of the story's ${r702b.count} clock-raised scenes (${Math.round((r702b.maxZoneCount / r702b.count) * 100)}%) cluster in the ${zoneName702b} third. Time pressure concentrates almost exclusively in that stretch of the story rather than surfacing throughout, leaving other structural thirds with no urgency bearing on the conflict.`,
        suggestedFix: `Raise a clock in at least one scene outside the ${zoneName702b} third — spreading time pressure across the story lets every structural third carry some urgency on the conflict.`,
      });
    }
  }

  // CONFLICT_RELATIONSHIP_DROUGHT_RUN — Run-based × relationshipShifts absence. Built on
  // checkDroughtRun from the shared checks library. n≥10, ≥3 relationship-shift scenes overall,
  // fires when the longest consecutive run of scenes with zero bond changes reaches 6.
  // relationshipShifts is this pass's most heavily used field but has never been drought-audited
  // via the shared library.
  {
    const r702c = checkDroughtRun({
      records, minRecords: 10, minPresentCount: 3, runThreshold: 6,
      isPresent: r => (r.relationshipShifts ?? []).length > 0,
    });
    if (r702c.fires) {
      issues.push({
        location: `longest stretch with no relationship shift: ${r702c.longestRun} consecutive scenes`,
        rule: 'CONFLICT_RELATIONSHIP_DROUGHT_RUN',
        severity: 'minor',
        description: `The story contains a run of ${r702c.longestRun} consecutive scenes with no relationship shift at all, even though ${r702c.presentCount} scenes elsewhere do move a bond. A long unbroken stretch where no relationship moves leaves the conflict's interpersonal dimension dormant for an extended run.`,
        suggestedFix: `Let a bond shift somewhere within the ${r702c.longestRun}-scene stretch — even a small movement keeps the conflict tied to changing interpersonal stakes throughout.`,
      });
    }
  }

  // ── Wave 716: CONFLICT_SEED_PEAK_UNCAUSED, CONFLICT_PAYOFF_DROUGHT_RUN,
  //              CONFLICT_CLOCK_DELTA_DROUGHT_RUN ──────────────────────────────────────────────

  // CONFLICT_SEED_PEAK_UNCAUSED — Single-peak isolation/backward-cause × seededClueIds magnitude.
  // Built on checkPeakUncaused from the shared checks library. n≥8, ≥2 seed scenes, a 2-scene
  // lookback. Finds the single scene with the most simultaneous clues planted; fires when neither
  // that scene nor either of the two before it contains a dramatic turn or revelation. Waves
  // 660/688 applied the drought-run and zone-cluster modes to seededClueIds; the backward-cause
  // peak mode has never been applied to it, completing the trio.
  {
    const r716a = checkPeakUncaused({
      records, minRecords: 8, minQualifying: 2, lookback: 2,
      magnitude: r => (r.seededClueIds ?? []).length,
      hasCause: r => r.dramaticTurn !== 'nothing' || r.revelation != null,
    });
    if (r716a.fires) {
      issues.push({
        location: `scene ${r716a.peakIdx + 1} — peak seed density (${r716a.peakMagnitude}) with no dramatic turn or revelation nearby`,
        rule: 'CONFLICT_SEED_PEAK_UNCAUSED',
        severity: 'minor',
        description: `The story's single densest scene for planting new clues (scene ${r716a.peakIdx + 1}, with ${r716a.peakMagnitude} clues seeded at once) has no dramatic turn or revelation in itself or the two scenes before it. The moment where foreshadowing concentrates most heavily arrives without any structural pivot or disclosure driving it — an uncaused spike that undercuts the conflict's sense of causal escalation.`,
        suggestedFix: `Give scene ${r716a.peakIdx + 1} — or one of the two scenes just before it — a dramatic turn or revelation, so the story's most seed-dense moment is earned by a shift in the conflict rather than arriving in a causal vacuum.`,
      });
    }
  }

  // CONFLICT_PAYOFF_DROUGHT_RUN — Run-based × payoffSetupIds absence. Built on checkDroughtRun
  // from the shared checks library. n≥10, ≥3 payoff scenes overall, fires when the longest
  // consecutive run of scenes with zero thread resolution reaches 6. Wave 660 applied the
  // backward-cause peak mode to payoffSetupIds; the drought-run mode has never been applied to it.
  {
    const r716b = checkDroughtRun({
      records, minRecords: 10, minPresentCount: 3, runThreshold: 6,
      isPresent: r => (r.payoffSetupIds ?? []).length > 0,
    });
    if (r716b.fires) {
      issues.push({
        location: `longest stretch with no payoff: ${r716b.longestRun} consecutive scenes`,
        rule: 'CONFLICT_PAYOFF_DROUGHT_RUN',
        severity: 'minor',
        description: `The story contains a run of ${r716b.longestRun} consecutive scenes with no thread resolving at all, even though ${r716b.presentCount} scenes elsewhere do pay off a setup. A long stretch where nothing resolves leaves the conflict's engine of cause-and-effect dormant for an extended run.`,
        suggestedFix: `Resolve at least one thread somewhere within the ${r716b.longestRun}-scene stretch so the conflict's sense of accumulating consequence keeps building throughout that stretch.`,
      });
    }
  }

  // CONFLICT_CLOCK_DELTA_DROUGHT_RUN — Run-based × clockDelta>0 absence. Built on checkDroughtRun
  // from the shared checks library. n≥10, ≥3 scenes with a positive clock delta, fires when the
  // longest consecutive run of scenes with no clock advance reaches 6. Wave 674 applied the
  // backward-cause peak mode and Wave 702 applied the zone-cluster mode to clockRaised; clockDelta
  // itself has never been drought-audited.
  {
    const r716c = checkDroughtRun({
      records, minRecords: 10, minPresentCount: 3, runThreshold: 6,
      isPresent: r => (r.clockDelta ?? 0) > 0,
    });
    if (r716c.fires) {
      issues.push({
        location: `longest stretch with no clock advance: ${r716c.longestRun} consecutive scenes`,
        rule: 'CONFLICT_CLOCK_DELTA_DROUGHT_RUN',
        severity: 'minor',
        description: `The story contains a run of ${r716c.longestRun} consecutive scenes with no clock advance at all, even though ${r716c.presentCount} scenes elsewhere do compress time pressure. A long unbroken stretch with no deadline tightening leaves the conflict without any mounting urgency for an extended run.`,
        suggestedFix: `Advance the clock somewhere within the ${r716c.longestRun}-scene stretch — even a small compression keeps the conflict under some time pressure throughout that stretch.`,
      });
    }
  }

  // ── Wave 730: CONFLICT_PAYOFF_ZONE_CLUSTER, CONFLICT_RELATIONSHIP_PEAK_UNCAUSED,
  //              CONFLICT_CLOCK_DELTA_ZONE_CLUSTER ─────────────────────────────────────────

  // CONFLICT_PAYOFF_ZONE_CLUSTER — Distribution/timing × payoffSetupIds × structural thirds.
  // Built on checkZoneCluster from the shared checks library. n≥9, ≥3 payoff scenes, fires when
  // more than 75% of those scenes cluster in a single third. Waves 660/716 applied the
  // backward-cause peak and run-based drought modes to payoffSetupIds; the zone-cluster mode has
  // never been applied to it, completing the trio.
  {
    const r730a = checkZoneCluster({
      records, minRecords: 9, minCount: 3, ratioThreshold: 0.75,
      isPresent: r => (r.payoffSetupIds ?? []).length > 0,
    });
    if (r730a.fires) {
      issues.push({
        location: `${r730a.zoneNames[r730a.maxZoneIdx]} third — ${r730a.maxZoneCount} of ${r730a.count} payoff scenes`,
        rule: 'CONFLICT_PAYOFF_ZONE_CLUSTER',
        severity: 'minor',
        description: `${Math.round((r730a.maxZoneCount / r730a.count) * 100)}% of the story's thread resolutions cluster in the ${r730a.zoneNames[r730a.maxZoneIdx]} third. When every payoff lands in the same structural window, the conflict engine spends the rest of the story escalating without ever cashing in tension elsewhere.`,
        suggestedFix: `Move at least one thread resolution outside the ${r730a.zoneNames[r730a.maxZoneIdx]} third so the conflict's payoffs land more evenly across the story.`,
      });
    }
  }

  // CONFLICT_RELATIONSHIP_PEAK_UNCAUSED — Single-peak isolation/backward-cause ×
  // relationshipShifts magnitude. Built on checkPeakUncaused from the shared checks library. n≥8,
  // ≥2 scenes carrying a relationship shift, a 2-scene lookback. Finds the single scene with the
  // most simultaneous bond changes; fires when neither that scene nor either of the two before it
  // contains a dramatic turn or revelation. relationshipShifts is this pass's most heavily used
  // field [76+ accesses] and Wave 702 applied the run-based drought mode to it; the backward-cause
  // peak mode has never been applied to it.
  {
    const r730b = checkPeakUncaused({
      records, minRecords: 8, minQualifying: 2, lookback: 2,
      magnitude: r => (r.relationshipShifts ?? []).length,
      hasCause: r => r.dramaticTurn !== 'nothing' || r.revelation != null,
    });
    if (r730b.fires) {
      issues.push({
        location: `scene ${r730b.peakIdx + 1} — peak relationship-shift density (${r730b.peakMagnitude}) with no dramatic turn or revelation nearby`,
        rule: 'CONFLICT_RELATIONSHIP_PEAK_UNCAUSED',
        severity: 'minor',
        description: `The story's single densest scene for relationship shifts (scene ${r730b.peakIdx + 1}, with ${r730b.peakMagnitude} simultaneous bond changes) has no dramatic turn or revelation in itself or the two scenes before it. The moment where the conflict's relational fallout concentrates most heavily arrives without any structural pivot or disclosure driving it — an uncaused spike that undercuts the sense that the conflict is what's reshaping these bonds.`,
        suggestedFix: `Give scene ${r730b.peakIdx + 1} — or one of the two scenes just before it — a dramatic turn or revelation, so the story's most relationally dense moment is earned by the conflict's escalation rather than arriving in a causal vacuum.`,
      });
    }
  }

  // CONFLICT_CLOCK_DELTA_ZONE_CLUSTER — Distribution/timing × clockDelta>0 presence × structural
  // thirds. Built on checkZoneCluster from the shared checks library. n≥9, ≥3 clock-advancing
  // scenes, fires when more than 75% of those scenes cluster in a single third. Waves 674/716
  // applied the backward-cause peak and run-based drought modes to clockDelta; the zone-cluster
  // mode has never been applied to it, completing the trio.
  {
    const r730c = checkZoneCluster({
      records, minRecords: 9, minCount: 3, ratioThreshold: 0.75,
      isPresent: r => (r.clockDelta ?? 0) > 0,
    });
    if (r730c.fires) {
      issues.push({
        location: `${r730c.zoneNames[r730c.maxZoneIdx]} third — ${r730c.maxZoneCount} of ${r730c.count} clock-advancing scenes`,
        rule: 'CONFLICT_CLOCK_DELTA_ZONE_CLUSTER',
        severity: 'minor',
        description: `${Math.round((r730c.maxZoneCount / r730c.count) * 100)}% of the scenes that advance the ticking clock cluster in the ${r730c.zoneNames[r730c.maxZoneIdx]} third. When every clock-tightening beat lands in the same structural window, the conflict loses any sense of mounting time pressure recurring across the whole story.`,
        suggestedFix: `Move at least one clock-advancing beat outside the ${r730c.zoneNames[r730c.maxZoneIdx]} third so time pressure tightens on the conflict more evenly across the story.`,
      });
    }
  }

  // ── Wave 744: CONFLICT_RELATIONSHIP_ZONE_CLUSTER, CONFLICT_CLOCK_DROUGHT_RUN,
  //              CONFLICT_CURIOSITY_PEAK_UNCAUSED ────────────────────────────────────────────

  // CONFLICT_RELATIONSHIP_ZONE_CLUSTER — Distribution/timing × relationshipShifts × structural
  // thirds. Built on checkZoneCluster from the shared checks library. n≥9, ≥3 relationship-shift
  // scenes, fires when more than 75% of those scenes cluster in a single third. Waves 702/730
  // applied the run-based drought and backward-cause peak modes to this pass's most heavily used
  // field; the zone-cluster mode has never been applied to it, completing the trio.
  {
    const r744a = checkZoneCluster({
      records, minRecords: 9, minCount: 3, ratioThreshold: 0.75,
      isPresent: r => (r.relationshipShifts ?? []).length > 0,
    });
    if (r744a.fires) {
      issues.push({
        location: `${r744a.zoneNames[r744a.maxZoneIdx]} third — ${r744a.maxZoneCount} of ${r744a.count} relationship-shift scenes`,
        rule: 'CONFLICT_RELATIONSHIP_ZONE_CLUSTER',
        severity: 'minor',
        description: `${Math.round((r744a.maxZoneCount / r744a.count) * 100)}% of the story's relationship-shift scenes cluster in the ${r744a.zoneNames[r744a.maxZoneIdx]} third. When every bond change lands in the same structural window, the conflict has no relational fallout to draw on anywhere else in the story.`,
        suggestedFix: `Move at least one relationship shift outside the ${r744a.zoneNames[r744a.maxZoneIdx]} third so the conflict's relational fallout lands more evenly across the story.`,
      });
    }
  }

  // CONFLICT_CLOCK_DROUGHT_RUN — Run-based × clockRaised absence. Built on checkDroughtRun from
  // the shared checks library. n≥10, ≥3 clockRaised scenes overall, fires when the longest
  // consecutive run of scenes with clockRaised false reaches 6. Wave 702 applied the zone-cluster
  // mode to clockRaised; the drought-run mode has never been applied to it.
  {
    const r744b = checkDroughtRun({
      records, minRecords: 10, minPresentCount: 3, runThreshold: 6,
      isPresent: r => r.clockRaised === true,
    });
    if (r744b.fires) {
      issues.push({
        location: `longest stretch with no clock raised: ${r744b.longestRun} consecutive scenes`,
        rule: 'CONFLICT_CLOCK_DROUGHT_RUN',
        severity: 'minor',
        description: `The story contains a run of ${r744b.longestRun} consecutive scenes with the clock never raised at all, even though ${r744b.presentCount} scenes elsewhere do raise it. A long unbroken stretch where the deadline never tightens leaves the conflict without any mechanical pressure driving it for an extended run.`,
        suggestedFix: `Raise the clock somewhere within the ${r744b.longestRun}-scene stretch so the conflict keeps a mechanical pressure acting on it throughout that stretch.`,
      });
    }
  }

  // CONFLICT_CURIOSITY_PEAK_UNCAUSED — Single-peak isolation/backward-cause × curiosityDelta
  // magnitude. Built on checkPeakUncaused from the shared checks library. n≥8, ≥2 scenes with a
  // positive curiosity spike, a 2-scene lookback. Finds the single scene with the sharpest
  // curiosity rise; fires when neither that scene nor either of the two before it contains a
  // dramatic turn or revelation. curiosityDelta has only ever anchored co-occurrence/decoupling,
  // zone-presence/absence, front-loaded, and zone-cluster checks; the backward-cause
  // peak-isolation mode has never been applied to it.
  {
    const r744c = checkPeakUncaused({
      records, minRecords: 8, minQualifying: 2, lookback: 2,
      magnitude: r => Math.max(0, r.curiosityDelta ?? 0),
      hasCause: r => r.dramaticTurn !== 'nothing' || r.revelation != null,
    });
    if (r744c.fires) {
      issues.push({
        location: `scene ${r744c.peakIdx + 1} — peak curiosity spike (${r744c.peakMagnitude}) with no dramatic turn or revelation nearby`,
        rule: 'CONFLICT_CURIOSITY_PEAK_UNCAUSED',
        severity: 'minor',
        description: `The story's single sharpest curiosity spike (scene ${r744c.peakIdx + 1}, a rise of ${r744c.peakMagnitude}) has no dramatic turn or revelation in itself or the two scenes before it. The moment where the audience's hunger to know more peaks hardest arrives without any structural pivot or disclosure driving it — the conflict has nothing causal to hook that curiosity to.`,
        suggestedFix: `Give scene ${r744c.peakIdx + 1} — or one of the two scenes just before it — a dramatic turn or revelation, so the story's sharpest curiosity spike is earned by the conflict's escalation rather than arriving in a causal vacuum.`,
      });
    }
  }

  // ── Wave 758: CONFLICT_CURIOSITY_DROUGHT_RUN, CONFLICT_REVELATION_ZONE_CLUSTER,
  //              CONFLICT_STAKES_DROUGHT_RUN ────────────────────────────────────────────

  // CONFLICT_CURIOSITY_DROUGHT_RUN — Run-based × curiosityDelta>0 absence. Built on
  // checkDroughtRun from the shared checks library. n≥10, ≥3 curiosity-positive scenes overall,
  // fires when the longest consecutive run of scenes with no curiosity rise reaches 6. Waves
  // 702/744 applied the zone-cluster and backward-cause peak modes to curiosityDelta; the
  // drought-run mode has never been applied to it, completing the trio.
  {
    const r758a = checkDroughtRun({
      records, minRecords: 10, minPresentCount: 3, runThreshold: 6,
      isPresent: r => (r.curiosityDelta ?? 0) > 0,
    });
    if (r758a.fires) {
      issues.push({
        location: `longest stretch with no rising curiosity: ${r758a.longestRun} consecutive scenes`,
        rule: 'CONFLICT_CURIOSITY_DROUGHT_RUN',
        severity: 'minor',
        description: `The story contains a run of ${r758a.longestRun} consecutive scenes with no rise in curiosity at all, even though ${r758a.presentCount} scenes elsewhere do spark wonder. A long unbroken stretch with nothing new to wonder about leaves the conflict without a mystery engine driving audience investment for an extended run.`,
        suggestedFix: `Raise curiosity somewhere within the ${r758a.longestRun}-scene stretch so the conflict keeps a mystery engine driving audience investment throughout that stretch.`,
      });
    }
  }

  // CONFLICT_REVELATION_ZONE_CLUSTER — Distribution/timing × revelation × structural thirds.
  // Built on checkZoneCluster from the shared checks library. n≥9, ≥3 revelation scenes, fires
  // when more than 75% of those scenes cluster in a single third. Wave 671 applied the run-based
  // drought mode to revelation != null (CONFLICT_REVELATION_DROUGHT_RUN); the zone-cluster mode
  // has never been applied to it.
  {
    const r758b = checkZoneCluster({
      records, minRecords: 9, minCount: 3, ratioThreshold: 0.75,
      isPresent: r => r.revelation != null,
    });
    if (r758b.fires) {
      issues.push({
        location: `${r758b.zoneNames[r758b.maxZoneIdx]} third — ${r758b.maxZoneCount} of ${r758b.count} revelation scenes`,
        rule: 'CONFLICT_REVELATION_ZONE_CLUSTER',
        severity: 'minor',
        description: `${Math.round((r758b.maxZoneCount / r758b.count) * 100)}% of the story's revelation scenes cluster in the ${r758b.zoneNames[r758b.maxZoneIdx]} third. When every disclosure lands in the same structural window, the conflict has no fresh information reshaping it anywhere else in the story.`,
        suggestedFix: `Let a revelation land in at least one scene outside the ${r758b.zoneNames[r758b.maxZoneIdx]} third so the conflict keeps being reshaped by new disclosures more evenly across the story.`,
      });
    }
  }

  // CONFLICT_STAKES_DROUGHT_RUN — Run-based × purpose === 'raise_stakes' absence. Built on
  // checkDroughtRun from the shared checks library. n≥10, ≥3 stakes-raising scenes overall, fires
  // when the longest consecutive run of scenes purposed otherwise reaches 6. purpose has only
  // ever anchored a hand-rolled co-occurrence/decoupling check; the run-based drought mode has
  // never been applied to it.
  {
    const r758c = checkDroughtRun({
      records, minRecords: 10, minPresentCount: 3, runThreshold: 6,
      isPresent: r => r.purpose === 'raise_stakes',
    });
    if (r758c.fires) {
      issues.push({
        location: `longest stretch with no scene raising stakes: ${r758c.longestRun} consecutive scenes`,
        rule: 'CONFLICT_STAKES_DROUGHT_RUN',
        severity: 'minor',
        description: `The story contains a run of ${r758c.longestRun} consecutive scenes with no scene purposed to raise stakes, even though ${r758c.presentCount} scenes elsewhere do escalate. A long unbroken stretch with nothing pushing the stakes higher leaves the conflict flat without mounting pressure for an extended run.`,
        suggestedFix: `Purpose at least one scene within the ${r758c.longestRun}-scene stretch to raise stakes — even a small escalation keeps the conflict under mounting pressure throughout that stretch.`,
      });
    }
  }

  // ── Wave 772: CONFLICT_STAKES_ZONE_CLUSTER, CONFLICT_REVELATION_PEAK_UNCAUSED,
  //              CONFLICT_EMOTION_ZONE_CLUSTER ──────────────────────────────────────

  // CONFLICT_STAKES_ZONE_CLUSTER — Distribution/timing × purpose === 'raise_stakes' presence ×
  // structural thirds. Built on checkZoneCluster from the shared checks library. n≥9, ≥3
  // stakes-raising scenes, fires when more than 75% of those scenes cluster in a single third.
  // Wave 758's CONFLICT_STAKES_DROUGHT_RUN applied the run-based drought mode to this value; the
  // zone-cluster mode has never been applied to it, completing the trio.
  {
    const r772a = checkZoneCluster({
      records, minRecords: 9, minCount: 3, ratioThreshold: 0.75,
      isPresent: r => r.purpose === 'raise_stakes',
    });
    if (r772a.fires) {
      issues.push({
        location: `${r772a.zoneNames[r772a.maxZoneIdx]} third — ${r772a.maxZoneCount} of ${r772a.count} stakes-raising scenes`,
        rule: 'CONFLICT_STAKES_ZONE_CLUSTER',
        severity: 'minor',
        description: `${Math.round((r772a.maxZoneCount / r772a.count) * 100)}% of the scenes purposed to raise stakes cluster in the ${r772a.zoneNames[r772a.maxZoneIdx]} third. When every escalation lands in the same structural window, the conflict has no mounting pressure testing it anywhere else in the story.`,
        suggestedFix: `Purpose at least one scene outside the ${r772a.zoneNames[r772a.maxZoneIdx]} third to raise stakes so the conflict keeps mounting pressure more evenly across the story.`,
      });
    }
  }

  // CONFLICT_REVELATION_PEAK_UNCAUSED — Backward-cause × revelation-as-magnitude × 2-scene
  // lookback. Built on checkPeakUncaused from the shared checks library. n≥8, ≥2 revelation
  // scenes, fires when the peak (earliest, on magnitude ties) revelation scene has no dramatic
  // turn in the 2 scenes preceding it. CONFLICT_REVELATION_DROUGHT_RUN and
  // CONFLICT_REVELATION_ZONE_CLUSTER completed the drought/cluster half of the trio; the existing
  // CONFLICT_PEAK_REVELATION_ABSENT audits whether revelation co-occurs with the peak RUPTURE
  // scene, a different signal's peak — the backward-cause peak mode has never been applied to
  // revelation's own peak scene. hasCause deliberately references only dramaticTurn, never
  // revelation, to avoid a circular/self-referential audit.
  {
    const r772b = checkPeakUncaused({
      records, minRecords: 8, minQualifying: 2, lookback: 2,
      magnitude: r => (r.revelation != null ? 1 : 0),
      hasCause: r => r.dramaticTurn !== 'nothing',
    });
    if (r772b.fires) {
      issues.push({
        location: `scene ${r772b.peakIdx + 1} — the story's peak revelation scene`,
        rule: 'CONFLICT_REVELATION_PEAK_UNCAUSED',
        severity: 'minor',
        description: `Scene ${r772b.peakIdx + 1} is the earliest of ${r772b.qualifyingCount} revelation scenes, yet none of the 2 scenes leading into it carry a dramatic turn. A disclosure this significant lands without any structural pivot building toward it, leaving the conflict slack right before the reveal.`,
        suggestedFix: `Add a dramatic turn in one of the 2 scenes before scene ${r772b.peakIdx + 1} so the conflict builds pressure into the revelation instead of arriving flat.`,
      });
    }
  }

  // CONFLICT_EMOTION_ZONE_CLUSTER — Distribution/timing × emotionalShift !== 'neutral' presence ×
  // structural thirds. Built on checkZoneCluster from the shared checks library. n≥9, ≥3
  // emotionally charged scenes, fires when more than 75% of those scenes cluster in a single
  // third. emotionalShift as a primary signal has only ever anchored co-occurrence-decoupling and
  // aftermath-void checks in this pass; none of the three shared-library trio modes has ever been
  // applied to it.
  {
    const r772c = checkZoneCluster({
      records, minRecords: 9, minCount: 3, ratioThreshold: 0.75,
      isPresent: r => (r.emotionalShift ?? 'neutral') !== 'neutral',
    });
    if (r772c.fires) {
      issues.push({
        location: `${r772c.zoneNames[r772c.maxZoneIdx]} third — ${r772c.maxZoneCount} of ${r772c.count} emotionally charged scenes`,
        rule: 'CONFLICT_EMOTION_ZONE_CLUSTER',
        severity: 'minor',
        description: `${Math.round((r772c.maxZoneCount / r772c.count) * 100)}% of the story's emotionally charged scenes cluster in the ${r772c.zoneNames[r772c.maxZoneIdx]} third. When every emotional shift lands in the same structural window, the conflict has no felt stakes registering anywhere else in the story.`,
        suggestedFix: `Give at least one scene outside the ${r772c.zoneNames[r772c.maxZoneIdx]} third an emotional charge so the conflict keeps registering as felt experience more evenly across the story.`,
      });
    }
  }

  // ── Wave 786: CONFLICT_EMOTION_DROUGHT_RUN, CONFLICT_TURN_ZONE_CLUSTER,
  //              CONFLICT_TURN_DROUGHT_RUN ──────────────────────────────────────

  // CONFLICT_EMOTION_DROUGHT_RUN — Run-based × emotionalShift !== 'neutral' absence. Built on
  // checkDroughtRun from the shared checks library. n≥10, ≥3 emotionally charged scenes overall,
  // fires when the longest consecutive run of scenes with no emotional charge reaches 6. Wave 772
  // applied the zone-cluster mode to this signal; the drought-run mode has never been applied to
  // it, completing the trio.
  {
    const r786a = checkDroughtRun({
      records, minRecords: 10, minPresentCount: 3, runThreshold: 6,
      isPresent: r => (r.emotionalShift ?? 'neutral') !== 'neutral',
    });
    if (r786a.fires) {
      issues.push({
        location: `longest stretch with no emotional charge: ${r786a.longestRun} consecutive scenes`,
        rule: 'CONFLICT_EMOTION_DROUGHT_RUN',
        severity: 'minor',
        description: `The story contains a run of ${r786a.longestRun} consecutive scenes with no emotional charge at all, even though ${r786a.presentCount} scenes elsewhere carry one. A long unbroken stretch with nothing felt leaves the conflict with no registered stakes for an extended run.`,
        suggestedFix: `Give at least one scene within the ${r786a.longestRun}-scene stretch an emotional charge so the conflict keeps registering as felt experience throughout that stretch.`,
      });
    }
  }

  // CONFLICT_TURN_ZONE_CLUSTER — Distribution/timing × dramaticTurn !== 'nothing' presence ×
  // structural thirds. Built on checkZoneCluster from the shared checks library. n≥9, ≥3 turn
  // scenes, fires when more than 75% of those scenes cluster in a single third. dramaticTurn as a
  // primary signal has only ever anchored co-occurrence-decoupling checks in this pass; none of
  // the three shared-library trio modes has ever been applied to it.
  {
    const r786b = checkZoneCluster({
      records, minRecords: 9, minCount: 3, ratioThreshold: 0.75,
      isPresent: r => (r.dramaticTurn ?? 'nothing') !== 'nothing',
    });
    if (r786b.fires) {
      issues.push({
        location: `${r786b.zoneNames[r786b.maxZoneIdx]} third — ${r786b.maxZoneCount} of ${r786b.count} turn scenes`,
        rule: 'CONFLICT_TURN_ZONE_CLUSTER',
        severity: 'minor',
        description: `${Math.round((r786b.maxZoneCount / r786b.count) * 100)}% of the story's dramatic turns cluster in the ${r786b.zoneNames[r786b.maxZoneIdx]} third. When every pivot lands in the same structural window, the conflict has no reversal testing it anywhere else in the story.`,
        suggestedFix: `Introduce a dramatic turn in at least one scene outside the ${r786b.zoneNames[r786b.maxZoneIdx]} third so the conflict keeps pivots redirecting it more evenly across the story.`,
      });
    }
  }

  // CONFLICT_TURN_DROUGHT_RUN — Run-based × dramaticTurn !== 'nothing' absence. Built on
  // checkDroughtRun from the shared checks library. n≥10, ≥3 turn scenes overall, fires when the
  // longest consecutive run of scenes with no dramatic turn reaches 6. Completing 2 of 3 slots
  // for dramaticTurn alongside the zone-cluster mode added in this same wave.
  {
    const r786c = checkDroughtRun({
      records, minRecords: 10, minPresentCount: 3, runThreshold: 6,
      isPresent: r => (r.dramaticTurn ?? 'nothing') !== 'nothing',
    });
    if (r786c.fires) {
      issues.push({
        location: `longest stretch with no dramatic turn: ${r786c.longestRun} consecutive scenes`,
        rule: 'CONFLICT_TURN_DROUGHT_RUN',
        severity: 'minor',
        description: `The story contains a run of ${r786c.longestRun} consecutive scenes with no dramatic turn at all, even though ${r786c.presentCount} scenes elsewhere do pivot. A long unbroken stretch with nothing reversing or complicating the situation leaves the conflict flat without a structural pivot for an extended run.`,
        suggestedFix: `Introduce a dramatic turn somewhere within the ${r786c.longestRun}-scene stretch so the conflict keeps a pivot to redirect it throughout that stretch.`,
      });
    }
  }

  // ── Wave 800: CONFLICT_NEGATIVE_EMOTION_ZONE_CLUSTER, CONFLICT_NEGATIVE_EMOTION_DROUGHT_RUN,
  //              CONFLICT_INTRODUCE_CONFLICT_ZONE_CLUSTER ──────────────────────────────────────

  // CONFLICT_NEGATIVE_EMOTION_ZONE_CLUSTER — Distribution/timing × emotionalShift === 'negative'
  // × structural thirds. Built on checkZoneCluster from the shared checks library. n≥9, ≥3
  // negative-emotion scenes, fires when more than 75% of them fall in a single structural third.
  // Distinct from the existing NEGATIVE_SPIRAL_UNBROKEN (Wave 285), which is a PRESENCE-run of 4+
  // consecutive negative scenes anywhere in the story, not a thirds-based concentration test —
  // the general cluster mode has never been applied to this specific valence.
  {
    const r800a = checkZoneCluster({
      records, minRecords: 9, minCount: 3, ratioThreshold: 0.75,
      isPresent: r => r.emotionalShift === 'negative',
    });
    if (r800a.fires) {
      issues.push({
        location: `${r800a.zoneNames[r800a.maxZoneIdx]} third — ${r800a.maxZoneCount} of ${r800a.count} negative-emotion scenes`,
        rule: 'CONFLICT_NEGATIVE_EMOTION_ZONE_CLUSTER',
        severity: 'minor',
        description: `${Math.round((r800a.maxZoneCount / r800a.count) * 100)}% of the story's negative-emotion scenes cluster in the ${r800a.zoneNames[r800a.maxZoneIdx]} third. When all the darkness concentrates in one structural window, the conflict carries its emotional cost in only one part of the story instead of throughout its full length.`,
        suggestedFix: `Introduce a negative-emotion scene outside the ${r800a.zoneNames[r800a.maxZoneIdx]} third so the conflict's emotional cost registers more evenly across the story.`,
      });
    }
  }

  // CONFLICT_NEGATIVE_EMOTION_DROUGHT_RUN — Run-based × emotionalShift === 'negative' absence.
  // Built on checkDroughtRun from the shared checks library. n≥10, ≥3 negative-emotion scenes
  // overall, fires when the longest consecutive run of scenes with no negative charge reaches 6.
  // Distinct from NEGATIVE_SPIRAL_UNBROKEN's presence-run in the same way as the zone-cluster
  // check above — an absence run of 6+ scenes with no negative beat is the mirror-image claim.
  // Completes 2 of 3 slots for this valence alongside the zone-cluster mode added in this same
  // wave.
  {
    const r800b = checkDroughtRun({
      records, minRecords: 10, minPresentCount: 3, runThreshold: 6,
      isPresent: r => r.emotionalShift === 'negative',
    });
    if (r800b.fires) {
      issues.push({
        location: `longest stretch with no negative-emotion charge: ${r800b.longestRun} consecutive scenes`,
        rule: 'CONFLICT_NEGATIVE_EMOTION_DROUGHT_RUN',
        severity: 'minor',
        description: `The story contains a run of ${r800b.longestRun} consecutive scenes with no negative-emotion charge at all, even though ${r800b.presentCount} scenes elsewhere carry one. A long unbroken stretch with no setback leaves the conflict without any adversity testing it for an extended run.`,
        suggestedFix: `Give the conflict a setback within the ${r800b.longestRun}-scene stretch so it keeps testing the characters with adversity throughout that stretch.`,
      });
    }
  }

  // CONFLICT_INTRODUCE_CONFLICT_ZONE_CLUSTER — Distribution/timing × purpose ===
  // 'introduce_conflict' × structural thirds. Built on checkZoneCluster from the shared checks
  // library. n≥9, ≥3 conflict-introducing scenes, fires when more than 75% of them fall in a
  // single structural third. This purpose value has never been referenced anywhere in this pass
  // despite being thematically central to it; none of the three shared-library trio modes has
  // ever been applied to it.
  {
    const r800c = checkZoneCluster({
      records, minRecords: 9, minCount: 3, ratioThreshold: 0.75,
      isPresent: r => r.purpose === 'introduce_conflict',
    });
    if (r800c.fires) {
      issues.push({
        location: `${r800c.zoneNames[r800c.maxZoneIdx]} third — ${r800c.maxZoneCount} of ${r800c.count} conflict-introducing scenes`,
        rule: 'CONFLICT_INTRODUCE_CONFLICT_ZONE_CLUSTER',
        severity: 'minor',
        description: `${Math.round((r800c.maxZoneCount / r800c.count) * 100)}% of the scenes purposed to introduce conflict cluster in the ${r800c.zoneNames[r800c.maxZoneIdx]} third. When every new front of conflict opens in the same structural window, the story stops introducing fresh sources of friction anywhere else across its full shape.`,
        suggestedFix: `Purpose at least one scene outside the ${r800c.zoneNames[r800c.maxZoneIdx]} third to introduce conflict so the story keeps opening fresh friction more evenly across its full shape.`,
      });
    }
  }

  // ── Wave 814: CONFLICT_INTRODUCE_CONFLICT_DROUGHT_RUN, CONFLICT_CHARACTER_MOMENT_ZONE_CLUSTER,
  //              CONFLICT_CHARACTER_MOMENT_DROUGHT_RUN ──────────────────────────────────────

  // CONFLICT_INTRODUCE_CONFLICT_DROUGHT_RUN — Run-based × purpose === 'introduce_conflict'
  // absence. Built on checkDroughtRun from the shared checks library. n≥10, ≥3 conflict-
  // introducing scenes overall, fires when the longest consecutive run of scenes with no
  // conflict-introducing purpose reaches 6. Completing 2 of 3 slots for this purpose value
  // alongside the zone-cluster mode added in Wave 800 (peak mode conventionally skipped for
  // this categorical field).
  {
    const r814a = checkDroughtRun({
      records, minRecords: 10, minPresentCount: 3, runThreshold: 6,
      isPresent: r => r.purpose === 'introduce_conflict',
    });
    if (r814a.fires) {
      issues.push({
        location: `longest stretch with no new conflict introduced: ${r814a.longestRun} consecutive scenes`,
        rule: 'CONFLICT_INTRODUCE_CONFLICT_DROUGHT_RUN',
        severity: 'minor',
        description: `The story contains a run of ${r814a.longestRun} consecutive scenes with no conflict-introducing purpose at all, even though ${r814a.presentCount} scenes elsewhere open new fronts. A long unbroken stretch with nothing new stirred up leaves the conflict coasting without fresh friction for an extended run.`,
        suggestedFix: `Purpose at least one scene within the ${r814a.longestRun}-scene stretch to introduce conflict so the story keeps opening fresh friction throughout that stretch.`,
      });
    }
  }

  // CONFLICT_CHARACTER_MOMENT_ZONE_CLUSTER — Distribution/timing × purpose ===
  // 'character_moment' × structural thirds. Built on checkZoneCluster from the shared checks
  // library. n≥9, ≥3 character-moment scenes, fires when more than 75% of them fall in a single
  // structural third. This purpose value has never been referenced anywhere in this pass; none
  // of the three shared-library trio modes has ever been applied to it.
  {
    const r814b = checkZoneCluster({
      records, minRecords: 9, minCount: 3, ratioThreshold: 0.75,
      isPresent: r => r.purpose === 'character_moment',
    });
    if (r814b.fires) {
      issues.push({
        location: `${r814b.zoneNames[r814b.maxZoneIdx]} third — ${r814b.maxZoneCount} of ${r814b.count} character-moment scenes`,
        rule: 'CONFLICT_CHARACTER_MOMENT_ZONE_CLUSTER',
        severity: 'minor',
        description: `${Math.round((r814b.maxZoneCount / r814b.count) * 100)}% of the story's character-moment scenes cluster in the ${r814b.zoneNames[r814b.maxZoneIdx]} third. When every beat of interior reflection lands in the same structural window, the conflict has no room to let its cost register on the characters anywhere else in the story.`,
        suggestedFix: `Purpose at least one scene outside the ${r814b.zoneNames[r814b.maxZoneIdx]} third as a character moment so the conflict keeps room for its cost to register more evenly across the story.`,
      });
    }
  }

  // CONFLICT_CHARACTER_MOMENT_DROUGHT_RUN — Run-based × purpose === 'character_moment' absence.
  // Built on checkDroughtRun from the shared checks library. n≥10, ≥3 character-moment scenes
  // overall, fires when the longest consecutive run of scenes with no character-moment purpose
  // reaches 6. Completing 2 of 3 slots for this purpose value alongside the zone-cluster mode
  // added in this same wave (peak mode conventionally skipped for this categorical field).
  {
    const r814c = checkDroughtRun({
      records, minRecords: 10, minPresentCount: 3, runThreshold: 6,
      isPresent: r => r.purpose === 'character_moment',
    });
    if (r814c.fires) {
      issues.push({
        location: `longest stretch with no character moment: ${r814c.longestRun} consecutive scenes`,
        rule: 'CONFLICT_CHARACTER_MOMENT_DROUGHT_RUN',
        severity: 'minor',
        description: `The story contains a run of ${r814c.longestRun} consecutive scenes with no character-moment purpose at all, even though ${r814c.presentCount} scenes elsewhere pause for interior reflection. A long unbroken stretch with nothing but escalation leaves the conflict without a beat to let its cost register on the characters for an extended run.`,
        suggestedFix: `Purpose at least one scene within the ${r814c.longestRun}-scene stretch as a character moment so the conflict keeps registering its cost on the characters throughout that stretch.`,
      });
    }
  }

  // ── Wave 828: CONFLICT_TURNING_POINT_ZONE_CLUSTER, CONFLICT_TURNING_POINT_DROUGHT_RUN,
  //              CONFLICT_POSITIVE_EMOTION_ZONE_CLUSTER ──────────────────────────────────────

  // CONFLICT_TURNING_POINT_ZONE_CLUSTER — Distribution/timing × purpose === 'turning_point' ×
  // structural thirds. Built on checkZoneCluster from the shared checks library. n≥9, ≥3
  // turning-point scenes, fires when more than 75% of them fall in a single structural third.
  // This purpose value has never been referenced anywhere in this pass — distinct from
  // CONFLICT_TURN_ZONE_CLUSTER (Wave 786), which audits the dramaticTurn free-text field, not
  // this purpose enum value.
  {
    const r828a = checkZoneCluster({
      records, minRecords: 9, minCount: 3, ratioThreshold: 0.75,
      isPresent: r => r.purpose === 'turning_point',
    });
    if (r828a.fires) {
      issues.push({
        location: `${r828a.zoneNames[r828a.maxZoneIdx]} third — ${r828a.maxZoneCount} of ${r828a.count} turning-point scenes`,
        rule: 'CONFLICT_TURNING_POINT_ZONE_CLUSTER',
        severity: 'minor',
        description: `${Math.round((r828a.maxZoneCount / r828a.count) * 100)}% of the story's turning-point scenes cluster in the ${r828a.zoneNames[r828a.maxZoneIdx]} third. When every scene purposed as a turning point lands in the same structural window, the conflict has no redirection testing it anywhere else in the story.`,
        suggestedFix: `Purpose at least one scene outside the ${r828a.zoneNames[r828a.maxZoneIdx]} third as a turning point so the conflict keeps facing redirection more evenly across the story.`,
      });
    }
  }

  // CONFLICT_TURNING_POINT_DROUGHT_RUN — Run-based × purpose === 'turning_point' absence. Built
  // on checkDroughtRun from the shared checks library. n≥10, ≥3 turning-point scenes overall,
  // fires when the longest consecutive run of scenes with no turning-point purpose reaches 6.
  // Completing 2 of 3 slots for this purpose value alongside the zone-cluster mode added in this
  // same wave (peak mode conventionally skipped for this categorical field).
  {
    const r828b = checkDroughtRun({
      records, minRecords: 10, minPresentCount: 3, runThreshold: 6,
      isPresent: r => r.purpose === 'turning_point',
    });
    if (r828b.fires) {
      issues.push({
        location: `longest stretch with no turning point: ${r828b.longestRun} consecutive scenes`,
        rule: 'CONFLICT_TURNING_POINT_DROUGHT_RUN',
        severity: 'minor',
        description: `The story contains a run of ${r828b.longestRun} consecutive scenes with no turning-point purpose at all, even though ${r828b.presentCount} scenes elsewhere redirect events. A long unbroken stretch with no redirection leaves the conflict coasting without a pivot for an extended run.`,
        suggestedFix: `Purpose at least one scene within the ${r828b.longestRun}-scene stretch as a turning point so the conflict keeps facing redirection throughout that stretch.`,
      });
    }
  }

  // CONFLICT_POSITIVE_EMOTION_ZONE_CLUSTER — Distribution/timing × emotionalShift === 'positive'
  // × structural thirds. Built on checkZoneCluster from the shared checks library. n≥9, ≥3
  // positive-emotion scenes, fires when more than 75% of them fall in a single structural third.
  // Mirrors the negative-valence trio completed in Wave 800; the positive valence has never been
  // isolated by any of the three shared-library trio modes in this pass.
  {
    const r828c = checkZoneCluster({
      records, minRecords: 9, minCount: 3, ratioThreshold: 0.75,
      isPresent: r => r.emotionalShift === 'positive',
    });
    if (r828c.fires) {
      issues.push({
        location: `${r828c.zoneNames[r828c.maxZoneIdx]} third — ${r828c.maxZoneCount} of ${r828c.count} positive-emotion scenes`,
        rule: 'CONFLICT_POSITIVE_EMOTION_ZONE_CLUSTER',
        severity: 'minor',
        description: `${Math.round((r828c.maxZoneCount / r828c.count) * 100)}% of the story's positive-emotion scenes cluster in the ${r828c.zoneNames[r828c.maxZoneIdx]} third. When all the relief concentrates in one structural window, the conflict delivers its emotional payoff in only one part of the story instead of throughout its full length.`,
        suggestedFix: `Introduce a positive-emotion scene outside the ${r828c.zoneNames[r828c.maxZoneIdx]} third so the conflict delivers its emotional payoff more evenly across the story.`,
      });
    }
  }

  // ── Wave 842: CONFLICT_POSITIVE_EMOTION_DROUGHT_RUN, CONFLICT_ESTABLISH_WORLD_ZONE_CLUSTER,
  //              CONFLICT_CLIMAX_ZONE_CLUSTER ──────────────────────────────────────

  // CONFLICT_POSITIVE_EMOTION_DROUGHT_RUN — Run-based × emotionalShift === 'positive' absence.
  // Built on checkDroughtRun from the shared checks library. n≥10, ≥3 positive-emotion scenes
  // overall, fires when the longest consecutive run of scenes with no positive-emotion charge
  // reaches 6. Completing 2 of 3 slots for this valence alongside the zone-cluster mode added in
  // Wave 828 (peak mode conventionally skipped for this categorical field).
  {
    const r842a = checkDroughtRun({
      records, minRecords: 10, minPresentCount: 3, runThreshold: 6,
      isPresent: r => r.emotionalShift === 'positive',
    });
    if (r842a.fires) {
      issues.push({
        location: `longest stretch with no positive-emotion charge: ${r842a.longestRun} consecutive scenes`,
        rule: 'CONFLICT_POSITIVE_EMOTION_DROUGHT_RUN',
        severity: 'minor',
        description: `The story contains a run of ${r842a.longestRun} consecutive scenes with no positive-emotion charge at all, even though ${r842a.presentCount} scenes elsewhere carry one. A long unbroken stretch with no relief leaves the conflict without an emotional payoff for an extended run.`,
        suggestedFix: `Give the story a moment of relief within the ${r842a.longestRun}-scene stretch so the conflict keeps delivering an emotional payoff throughout that stretch.`,
      });
    }
  }

  // CONFLICT_ESTABLISH_WORLD_ZONE_CLUSTER — Distribution/timing × purpose === 'establish_world' ×
  // structural thirds. Built on checkZoneCluster from the shared checks library. n≥9, ≥3
  // world-establishing scenes, fires when more than 75% of them fall in a single structural
  // third. This purpose value has never been referenced anywhere in this pass — a virgin field
  // for all three shared-library trio modes.
  {
    const r842b = checkZoneCluster({
      records, minRecords: 9, minCount: 3, ratioThreshold: 0.75,
      isPresent: r => r.purpose === 'establish_world',
    });
    if (r842b.fires) {
      issues.push({
        location: `${r842b.zoneNames[r842b.maxZoneIdx]} third — ${r842b.maxZoneCount} of ${r842b.count} world-establishing scenes`,
        rule: 'CONFLICT_ESTABLISH_WORLD_ZONE_CLUSTER',
        severity: 'minor',
        description: `${Math.round((r842b.maxZoneCount / r842b.count) * 100)}% of the scenes purposed to establish the world cluster in the ${r842b.zoneNames[r842b.maxZoneIdx]} third. When every act of world-building concentrates in one structural window, the conflict has no fresh ground to escalate from anywhere else across the story.`,
        suggestedFix: `Purpose at least one scene outside the ${r842b.zoneNames[r842b.maxZoneIdx]} third to establish the world so the conflict keeps fresh ground to escalate from more evenly across the story.`,
      });
    }
  }

  // CONFLICT_CLIMAX_ZONE_CLUSTER — Distribution/timing × purpose === 'climax' × structural
  // thirds. Built on checkZoneCluster from the shared checks library. n≥9, ≥3 climax-purposed
  // scenes, fires when more than 75% of them fall in a single structural third. This purpose
  // value has never been referenced anywhere in this pass — a virgin field for all three
  // shared-library trio modes.
  {
    const r842c = checkZoneCluster({
      records, minRecords: 9, minCount: 3, ratioThreshold: 0.75,
      isPresent: r => r.purpose === 'climax',
    });
    if (r842c.fires) {
      issues.push({
        location: `${r842c.zoneNames[r842c.maxZoneIdx]} third — ${r842c.maxZoneCount} of ${r842c.count} climax-purposed scenes`,
        rule: 'CONFLICT_CLIMAX_ZONE_CLUSTER',
        severity: 'minor',
        description: `${Math.round((r842c.maxZoneCount / r842c.count) * 100)}% of the scenes purposed as the climax cluster in the ${r842c.zoneNames[r842c.maxZoneIdx]} third. When every peak moment concentrates in one structural window, the conflict builds toward its payoff in only one part of the story instead of throughout its full length.`,
        suggestedFix: `Reconsider whether every climax-purposed scene belongs in the ${r842c.zoneNames[r842c.maxZoneIdx]} third so the conflict builds toward its payoff more evenly across the story.`,
      });
    }
  }

  // ── Wave 856: CONFLICT_CLIMAX_DROUGHT_RUN, CONFLICT_ESTABLISH_WORLD_DROUGHT_RUN,
  //              CONFLICT_RESOLUTION_ZONE_CLUSTER ──────────────────────────────────────

  // CONFLICT_CLIMAX_DROUGHT_RUN — Run-based × purpose === 'climax' absence. Built on
  // checkDroughtRun from the shared checks library. n≥10, ≥3 climax-purposed scenes overall,
  // fires when the longest consecutive run of scenes with no climax purpose reaches 6.
  // Completing 2 of 3 slots for this purpose value alongside the zone-cluster mode added in Wave
  // 842 (peak mode conventionally skipped for this categorical field).
  {
    const r856a = checkDroughtRun({
      records, minRecords: 10, minPresentCount: 3, runThreshold: 6,
      isPresent: r => r.purpose === 'climax',
    });
    if (r856a.fires) {
      issues.push({
        location: `longest stretch with no climax-purposed scene: ${r856a.longestRun} consecutive scenes`,
        rule: 'CONFLICT_CLIMAX_DROUGHT_RUN',
        severity: 'minor',
        description: `The story contains a run of ${r856a.longestRun} consecutive scenes purposed otherwise than the climax, even though ${r856a.presentCount} scenes elsewhere are dedicated to the story's peak. A long unbroken stretch with no climactic scene leaves the conflict without a payoff to build toward for an extended run.`,
        suggestedFix: `Purpose at least one scene within the ${r856a.longestRun}-scene stretch as the climax so the conflict keeps a payoff to build toward throughout that stretch.`,
      });
    }
  }

  // CONFLICT_ESTABLISH_WORLD_DROUGHT_RUN — Run-based × purpose === 'establish_world' absence.
  // Built on checkDroughtRun from the shared checks library. n≥10, ≥3 world-establishing scenes
  // overall, fires when the longest consecutive run of scenes with no world-establishing purpose
  // reaches 6. Completing 2 of 3 slots for this purpose value alongside the zone-cluster mode
  // added in Wave 842 (peak mode conventionally skipped for this categorical field).
  {
    const r856b = checkDroughtRun({
      records, minRecords: 10, minPresentCount: 3, runThreshold: 6,
      isPresent: r => r.purpose === 'establish_world',
    });
    if (r856b.fires) {
      issues.push({
        location: `longest stretch with no world-building: ${r856b.longestRun} consecutive scenes`,
        rule: 'CONFLICT_ESTABLISH_WORLD_DROUGHT_RUN',
        severity: 'minor',
        description: `The story contains a run of ${r856b.longestRun} consecutive scenes with no world-establishing purpose at all, even though ${r856b.presentCount} scenes elsewhere ground the audience in setting or rules. A long unbroken stretch with no grounding leaves the conflict without fresh ground to escalate from for an extended run.`,
        suggestedFix: `Purpose at least one scene within the ${r856b.longestRun}-scene stretch to establish the world so the conflict keeps fresh ground to escalate from throughout that stretch.`,
      });
    }
  }

  // CONFLICT_RESOLUTION_ZONE_CLUSTER — Distribution/timing × purpose === 'resolution' ×
  // structural thirds. Built on checkZoneCluster from the shared checks library. n≥9, ≥3
  // resolution-purposed scenes, fires when more than 75% of them fall in a single structural
  // third. Distinct from CONFLICT_RESOLUTION_PREMATURE, which checks timing of relationshipShifts
  // negative events relative to the climax, not this purpose enum value; a virgin standalone
  // signal.
  {
    const r856c = checkZoneCluster({
      records, minRecords: 9, minCount: 3, ratioThreshold: 0.75,
      isPresent: r => r.purpose === 'resolution',
    });
    if (r856c.fires) {
      issues.push({
        location: `${r856c.zoneNames[r856c.maxZoneIdx]} third — ${r856c.maxZoneCount} of ${r856c.count} resolution-purposed scenes`,
        rule: 'CONFLICT_RESOLUTION_ZONE_CLUSTER',
        severity: 'minor',
        description: `${Math.round((r856c.maxZoneCount / r856c.count) * 100)}% of the scenes purposed to resolve the story cluster in the ${r856c.zoneNames[r856c.maxZoneIdx]} third. When every act of resolution concentrates in one structural window, the conflict settles its threads in only one part of the story instead of throughout its full length.`,
        suggestedFix: `Reconsider whether every resolution-purposed scene belongs in the ${r856c.zoneNames[r856c.maxZoneIdx]} third so the conflict settles its threads more evenly across the story.`,
      });
    }
  }

  // ── Wave 870: CONFLICT_RESOLUTION_DROUGHT_RUN, CONFLICT_COMPLICATE_ZONE_CLUSTER,
  //              CONFLICT_COMPLICATE_DROUGHT_RUN ──────────────────────────────────────

  // CONFLICT_RESOLUTION_DROUGHT_RUN — Run-based × purpose === 'resolution' absence. Built on
  // checkDroughtRun from the shared checks library. n≥10, ≥3 resolution-purposed scenes overall,
  // fires when the longest consecutive run of scenes with no resolution purpose reaches 6.
  // Completes 2 of 3 slots for this purpose value alongside the zone-cluster mode added in
  // Wave 856. Distinct from CONFLICT_RESOLUTION_PREMATURE, which checks the timing of
  // relationshipShifts negative events relative to the climax rather than sustained absence of
  // this purpose value; peak mode conventionally skipped for this categorical field.
  {
    const r870a = checkDroughtRun({
      records, minRecords: 10, minPresentCount: 3, runThreshold: 6,
      isPresent: r => r.purpose === 'resolution',
    });
    if (r870a.fires) {
      issues.push({
        location: `longest stretch with no resolution-purposed scene: ${r870a.longestRun} consecutive scenes`,
        rule: 'CONFLICT_RESOLUTION_DROUGHT_RUN',
        severity: 'minor',
        description: `The story contains a run of ${r870a.longestRun} consecutive scenes with no scene purposed to resolve the story, even though ${r870a.presentCount} scenes elsewhere are. A long unbroken stretch with nothing settled leaves the conflict's threads dangling for an extended run.`,
        suggestedFix: `Purpose a scene within the ${r870a.longestRun}-scene stretch to resolve part of the conflict, so its threads keep settling throughout the story rather than only at its very end.`,
      });
    }
  }

  // CONFLICT_COMPLICATE_ZONE_CLUSTER — Distribution/timing × purpose === 'complicate' ×
  // structural thirds. Built on checkZoneCluster from the shared checks library. n≥9, ≥3
  // complicating scenes, fires when more than 75% of them fall in a single structural third.
  // This purpose value has never been referenced anywhere in this pass — a virgin field for
  // all three shared-library trio modes.
  {
    const r870b = checkZoneCluster({
      records, minRecords: 9, minCount: 3, ratioThreshold: 0.75,
      isPresent: r => r.purpose === 'complicate',
    });
    if (r870b.fires) {
      issues.push({
        location: `${r870b.zoneNames[r870b.maxZoneIdx]} third — ${r870b.maxZoneCount} of ${r870b.count} complicating scenes`,
        rule: 'CONFLICT_COMPLICATE_ZONE_CLUSTER',
        severity: 'minor',
        description: `${Math.round((r870b.maxZoneCount / r870b.count) * 100)}% of the scenes purposed to complicate the story cluster in the ${r870b.zoneNames[r870b.maxZoneIdx]} third. When every complication lands in the same structural window, the conflict stops deepening anywhere else across the story.`,
        suggestedFix: `Purpose at least one scene outside the ${r870b.zoneNames[r870b.maxZoneIdx]} third to complicate the story so the conflict keeps deepening more evenly across the story.`,
      });
    }
  }

  // CONFLICT_COMPLICATE_DROUGHT_RUN — Run-based × purpose === 'complicate' absence. Built on
  // checkDroughtRun from the shared checks library. n≥10, ≥3 complicating scenes overall, fires
  // when the longest consecutive run of scenes with no complicating purpose reaches 6.
  // Completes 2 of 3 slots for this purpose value alongside the zone-cluster mode added in this
  // same wave (peak mode conventionally skipped for this categorical field).
  {
    const r870c = checkDroughtRun({
      records, minRecords: 10, minPresentCount: 3, runThreshold: 6,
      isPresent: r => r.purpose === 'complicate',
    });
    if (r870c.fires) {
      issues.push({
        location: `longest stretch with no complication: ${r870c.longestRun} consecutive scenes`,
        rule: 'CONFLICT_COMPLICATE_DROUGHT_RUN',
        severity: 'minor',
        description: `The story contains a run of ${r870c.longestRun} consecutive scenes with no complicating purpose at all, even though ${r870c.presentCount} scenes elsewhere deepen the trouble. A long unbroken stretch with nothing new complicating the situation leaves the conflict stalled for an extended run.`,
        suggestedFix: `Purpose at least one scene within the ${r870c.longestRun}-scene stretch to complicate the story so the conflict keeps deepening throughout that stretch.`,
      });
    }
  }

  // ── Wave 884: CONFLICT_CLIMAX_ZONE_IMBALANCE, CONFLICT_ESTABLISH_WORLD_ZONE_IMBALANCE,
  //              CONFLICT_RESOLUTION_ZONE_IMBALANCE ──────────────────────────────────────

  // CONFLICT_CLIMAX_ZONE_IMBALANCE — Underweight/bloat × purpose === 'climax' × four structural
  // zones. Built on checkZoneImbalance from the shared checks library. n≥10, ≥4 climax-purposed
  // scenes total, divided across four equal structural zones. Fires only when one zone has zero
  // such scenes while another holds ≥50% of the total. Distinct from the existing 3-zone
  // CONFLICT_CLIMAX_ZONE_CLUSTER and run-based CONFLICT_CLIMAX_DROUGHT_RUN — the first
  // application of the 4-zone bloat+empty-zone mode to this purpose value.
  {
    const r884a = checkZoneImbalance({
      records, minRecords: 10, minCount: 4, bloatRatio: 0.5,
      isPresent: r => r.purpose === 'climax',
    });
    if (r884a.fires) {
      const emptyNames884a = r884a.emptyZoneIdxs.map(i => FOUR_ZONE_NAMES[i]).join(', ');
      const bloatName884a = FOUR_ZONE_NAMES[r884a.bloatZoneIdx];
      issues.push({
        location: `${emptyNames884a} empty; ${bloatName884a} has ${r884a.counts[r884a.bloatZoneIdx]}/${r884a.totalCount} climax-purposed scenes`,
        rule: 'CONFLICT_CLIMAX_ZONE_IMBALANCE',
        severity: 'minor',
        description: `The story's ${r884a.totalCount} climax-purposed scenes are unevenly distributed across its four structural zones: ${bloatName884a} contains ${r884a.counts[r884a.bloatZoneIdx]} of them (${Math.round((r884a.counts[r884a.bloatZoneIdx] / r884a.totalCount) * 100)}%) while ${emptyNames884a} contains none. Peak moments bloat in one structural quarter and vanish from another, giving the conflict's payoff an uneven structural rhythm.`,
        suggestedFix: `Redistribute peak moments: move at least one climax-purposed scene into the empty zone(s) — ${emptyNames884a} — so every structural quarter carries some capacity for the conflict's payoff, not only the quarter currently carrying most of them.`,
      });
    }
  }

  // CONFLICT_ESTABLISH_WORLD_ZONE_IMBALANCE — Underweight/bloat × purpose === 'establish_world'
  // × four structural zones. Built on checkZoneImbalance from the shared checks library. n≥10,
  // ≥4 world-establishing scenes total, divided across four equal structural zones. Fires only
  // when one zone has zero such scenes while another holds ≥50% of the total. Distinct from the
  // existing 3-zone CONFLICT_ESTABLISH_WORLD_ZONE_CLUSTER and run-based CONFLICT_ESTABLISH_
  // WORLD_DROUGHT_RUN — the first application of the 4-zone bloat+empty-zone mode to this
  // purpose value.
  {
    const r884b = checkZoneImbalance({
      records, minRecords: 10, minCount: 4, bloatRatio: 0.5,
      isPresent: r => r.purpose === 'establish_world',
    });
    if (r884b.fires) {
      const emptyNames884b = r884b.emptyZoneIdxs.map(i => FOUR_ZONE_NAMES[i]).join(', ');
      const bloatName884b = FOUR_ZONE_NAMES[r884b.bloatZoneIdx];
      issues.push({
        location: `${emptyNames884b} empty; ${bloatName884b} has ${r884b.counts[r884b.bloatZoneIdx]}/${r884b.totalCount} world-establishing scenes`,
        rule: 'CONFLICT_ESTABLISH_WORLD_ZONE_IMBALANCE',
        severity: 'minor',
        description: `The story's ${r884b.totalCount} world-establishing scenes are unevenly distributed across its four structural zones: ${bloatName884b} contains ${r884b.counts[r884b.bloatZoneIdx]} of them (${Math.round((r884b.counts[r884b.bloatZoneIdx] / r884b.totalCount) * 100)}%) while ${emptyNames884b} contains none. World-building bloats in one structural quarter and vanishes from another, giving the conflict's grounding an uneven structural rhythm.`,
        suggestedFix: `Redistribute world-building beats: move at least one establish_world-purposed scene into the empty zone(s) — ${emptyNames884b} — so every structural quarter carries some fresh ground for the conflict to escalate from, not only the quarter currently carrying most of them.`,
      });
    }
  }

  // CONFLICT_RESOLUTION_ZONE_IMBALANCE — Underweight/bloat × purpose === 'resolution' × four
  // structural zones. Built on checkZoneImbalance from the shared checks library. n≥10, ≥4
  // resolution-purposed scenes total, divided across four equal structural zones. Fires only
  // when one zone has zero such scenes while another holds ≥50% of the total. Distinct from
  // CONFLICT_RESOLUTION_PREMATURE (which checks timing of relationshipShifts negative events
  // relative to the climax, not this purpose enum value) and from the existing 3-zone
  // CONFLICT_RESOLUTION_ZONE_CLUSTER and run-based CONFLICT_RESOLUTION_DROUGHT_RUN — the first
  // application of the 4-zone bloat+empty-zone mode to this purpose value.
  {
    const r884c = checkZoneImbalance({
      records, minRecords: 10, minCount: 4, bloatRatio: 0.5,
      isPresent: r => r.purpose === 'resolution',
    });
    if (r884c.fires) {
      const emptyNames884c = r884c.emptyZoneIdxs.map(i => FOUR_ZONE_NAMES[i]).join(', ');
      const bloatName884c = FOUR_ZONE_NAMES[r884c.bloatZoneIdx];
      issues.push({
        location: `${emptyNames884c} empty; ${bloatName884c} has ${r884c.counts[r884c.bloatZoneIdx]}/${r884c.totalCount} resolution-purposed scenes`,
        rule: 'CONFLICT_RESOLUTION_ZONE_IMBALANCE',
        severity: 'minor',
        description: `The story's ${r884c.totalCount} resolution-purposed scenes are unevenly distributed across its four structural zones: ${bloatName884c} contains ${r884c.counts[r884c.bloatZoneIdx]} of them (${Math.round((r884c.counts[r884c.bloatZoneIdx] / r884c.totalCount) * 100)}%) while ${emptyNames884c} contains none. Settling beats bloat in one structural quarter and vanish from another, giving the conflict's closure an uneven structural rhythm.`,
        suggestedFix: `Redistribute settling beats: move at least one resolution-purposed scene into the empty zone(s) — ${emptyNames884c} — so every structural quarter carries some capacity to settle the conflict, not only the quarter currently carrying most of them.`,
      });
    }
  }

  // CONFLICT_REVELATION_PURPOSE_ZONE_CLUSTER — Distribution/timing × purpose === 'revelation' ×
  // structural thirds. Built on checkZoneCluster from the shared checks library. n≥9, ≥3 scenes
  // purposed as a revelation, fires when more than 75% of them fall in a single structural third.
  // Named distinctly from CONFLICT_REVELATION_ZONE_CLUSTER, which audits the separate revelation
  // string|null field, not this purpose enum value — purpose === 'revelation' has never been
  // referenced anywhere in this pass; a genuinely virgin field for all three trio modes.
  {
    const r898a = checkZoneCluster({
      records, minRecords: 9, minCount: 3, ratioThreshold: 0.75,
      isPresent: r => r.purpose === 'revelation',
    });
    if (r898a.fires) {
      issues.push({
        location: `${r898a.zoneNames[r898a.maxZoneIdx]} third — ${r898a.maxZoneCount} of ${r898a.count} revelation-purposed scenes`,
        rule: 'CONFLICT_REVELATION_PURPOSE_ZONE_CLUSTER',
        severity: 'minor',
        description: `${Math.round((r898a.maxZoneCount / r898a.count) * 100)}% of the scenes purposed as a revelation cluster in the ${r898a.zoneNames[r898a.maxZoneIdx]} third. When every purpose-built disclosure lands in the same structural window, the conflict has no fresh information reshaping it anywhere else in the story.`,
        suggestedFix: `Purpose at least one scene outside the ${r898a.zoneNames[r898a.maxZoneIdx]} third as a revelation so the conflict keeps being reshaped by new disclosures more evenly across the story.`,
      });
    }
  }

  // CONFLICT_REVELATION_PURPOSE_DROUGHT_RUN — Run-based × purpose === 'revelation' absence. Built
  // on checkDroughtRun from the shared checks library. n≥10, ≥3 revelation-purposed scenes overall,
  // fires when the longest consecutive run of scenes purposed otherwise reaches 6. Completes 2 of
  // 3 slots for this purpose value alongside the zone-cluster mode added in this same wave (peak
  // mode conventionally skipped for this categorical field).
  {
    const r898b = checkDroughtRun({
      records, minRecords: 10, minPresentCount: 3, runThreshold: 6,
      isPresent: r => r.purpose === 'revelation',
    });
    if (r898b.fires) {
      issues.push({
        location: `longest stretch with no revelation-purposed scene: ${r898b.longestRun} consecutive scenes`,
        rule: 'CONFLICT_REVELATION_PURPOSE_DROUGHT_RUN',
        severity: 'minor',
        description: `The story contains a run of ${r898b.longestRun} consecutive scenes with no scene purposed as a revelation, even though ${r898b.presentCount} scenes elsewhere disclose information by purpose. A long unbroken stretch with nothing new purpose-built to come to light leaves the conflict static with no fresh information reshaping it for an extended run.`,
        suggestedFix: `Purpose a scene within the ${r898b.longestRun}-scene stretch as a revelation so the conflict keeps being reshaped by new disclosures throughout that stretch.`,
      });
    }
  }

  // CONFLICT_TURNING_POINT_ZONE_IMBALANCE — Underweight/bloat × purpose === 'turning_point' ×
  // four structural zones. Built on checkZoneImbalance from the shared checks library, continuing
  // the rollout begun in Wave 884. n≥10, ≥4 turning-point scenes total, divided across four equal
  // structural zones. Fires only when one zone has zero such scenes while another holds ≥50% of
  // the total. Distinct from the existing CONFLICT_TURNING_POINT_ZONE_CLUSTER (3-zone
  // >75%-concentration test) and CONFLICT_TURNING_POINT_DROUGHT_RUN (run-based absence) — the
  // first application of the 4-zone bloat+empty-zone mode to this purpose value.
  {
    const r898c = checkZoneImbalance({
      records, minRecords: 10, minCount: 4, bloatRatio: 0.5,
      isPresent: r => r.purpose === 'turning_point',
    });
    if (r898c.fires) {
      const emptyNames898c = r898c.emptyZoneIdxs.map(i => FOUR_ZONE_NAMES[i]).join(', ');
      const bloatName898c = FOUR_ZONE_NAMES[r898c.bloatZoneIdx];
      issues.push({
        location: `${emptyNames898c} empty; ${bloatName898c} has ${r898c.counts[r898c.bloatZoneIdx]}/${r898c.totalCount} turning-point scenes`,
        rule: 'CONFLICT_TURNING_POINT_ZONE_IMBALANCE',
        severity: 'minor',
        description: `The story's ${r898c.totalCount} turning-point scenes are unevenly distributed across its four structural zones: ${bloatName898c} contains ${r898c.counts[r898c.bloatZoneIdx]} of them (${Math.round((r898c.counts[r898c.bloatZoneIdx] / r898c.totalCount) * 100)}%) while ${emptyNames898c} contains none. Turning points bloat in one structural quarter and vanish from another, giving the conflict's pivots an uneven structural rhythm.`,
        suggestedFix: `Redistribute turning points: move at least one turning_point-purposed scene into the empty zone(s) — ${emptyNames898c} — so every structural quarter carries some capacity for the conflict to pivot, not only the quarter currently carrying most of them.`,
      });
    }
  }

  // CONFLICT_COMPLICATE_ZONE_IMBALANCE — Underweight/bloat × purpose === 'complicate' × four
  // structural zones. Built on checkZoneImbalance from the shared checks library, continuing the
  // rollout begun in Wave 884. n≥10, ≥4 complicating scenes total, divided across four equal
  // structural zones. Fires only when one zone has zero such scenes while another holds ≥50% of
  // the total. Distinct from the existing 3-zone CONFLICT_COMPLICATE_ZONE_CLUSTER and run-based
  // CONFLICT_COMPLICATE_DROUGHT_RUN — the first application of the 4-zone bloat+empty-zone mode to
  // this purpose value.
  {
    const r912a = checkZoneImbalance({
      records, minRecords: 10, minCount: 4, bloatRatio: 0.5,
      isPresent: r => r.purpose === 'complicate',
    });
    if (r912a.fires) {
      const emptyNames912a = r912a.emptyZoneIdxs.map(i => FOUR_ZONE_NAMES[i]).join(', ');
      const bloatName912a = FOUR_ZONE_NAMES[r912a.bloatZoneIdx];
      issues.push({
        location: `${emptyNames912a} empty; ${bloatName912a} has ${r912a.counts[r912a.bloatZoneIdx]}/${r912a.totalCount} complicating scenes`,
        rule: 'CONFLICT_COMPLICATE_ZONE_IMBALANCE',
        severity: 'minor',
        description: `The story's ${r912a.totalCount} complicating scenes are unevenly distributed across its four structural zones: ${bloatName912a} contains ${r912a.counts[r912a.bloatZoneIdx]} of them (${Math.round((r912a.counts[r912a.bloatZoneIdx] / r912a.totalCount) * 100)}%) while ${emptyNames912a} contains none. Complications bloat in one structural quarter and vanish from another, giving the conflict's escalation an uneven structural rhythm.`,
        suggestedFix: `Redistribute complications: move at least one complicate-purposed scene into the empty zone(s) — ${emptyNames912a} — so every structural quarter carries some fresh trouble for the conflict, not only the quarter currently carrying most of them.`,
      });
    }
  }

  // CONFLICT_INTRODUCE_CONFLICT_ZONE_IMBALANCE — Underweight/bloat × purpose ===
  // 'introduce_conflict' × four structural zones. Built on checkZoneImbalance from the shared
  // checks library, continuing the rollout begun in Wave 884. n≥10, ≥4 conflict-introducing scenes
  // total, divided across four equal structural zones. Fires only when one zone has zero such
  // scenes while another holds ≥50% of the total. Distinct from the existing 3-zone CONFLICT_
  // INTRODUCE_CONFLICT_ZONE_CLUSTER and run-based CONFLICT_INTRODUCE_CONFLICT_DROUGHT_RUN — the
  // first application of the 4-zone bloat+empty-zone mode to this purpose value.
  {
    const r912b = checkZoneImbalance({
      records, minRecords: 10, minCount: 4, bloatRatio: 0.5,
      isPresent: r => r.purpose === 'introduce_conflict',
    });
    if (r912b.fires) {
      const emptyNames912b = r912b.emptyZoneIdxs.map(i => FOUR_ZONE_NAMES[i]).join(', ');
      const bloatName912b = FOUR_ZONE_NAMES[r912b.bloatZoneIdx];
      issues.push({
        location: `${emptyNames912b} empty; ${bloatName912b} has ${r912b.counts[r912b.bloatZoneIdx]}/${r912b.totalCount} conflict-introducing scenes`,
        rule: 'CONFLICT_INTRODUCE_CONFLICT_ZONE_IMBALANCE',
        severity: 'minor',
        description: `The story's ${r912b.totalCount} conflict-introducing scenes are unevenly distributed across its four structural zones: ${bloatName912b} contains ${r912b.counts[r912b.bloatZoneIdx]} of them (${Math.round((r912b.counts[r912b.bloatZoneIdx] / r912b.totalCount) * 100)}%) while ${emptyNames912b} contains none. New fronts of conflict bloat in one structural quarter and vanish from another, giving the story's opposition an uneven structural rhythm.`,
        suggestedFix: `Redistribute new conflicts: move at least one introduce_conflict-purposed scene into the empty zone(s) — ${emptyNames912b} — so every structural quarter opens some fresh front of opposition, not only the quarter currently carrying most of them.`,
      });
    }
  }

  // CONFLICT_CHARACTER_MOMENT_ZONE_IMBALANCE — Underweight/bloat × purpose === 'character_moment'
  // × four structural zones. Built on checkZoneImbalance from the shared checks library, continuing
  // the rollout begun in Wave 884. n≥10, ≥4 character-moment scenes total, divided across four
  // equal structural zones. Fires only when one zone has zero such scenes while another holds ≥50%
  // of the total. Distinct from the existing 3-zone CONFLICT_CHARACTER_MOMENT_ZONE_CLUSTER and
  // run-based CONFLICT_CHARACTER_MOMENT_DROUGHT_RUN — the first application of the 4-zone
  // bloat+empty-zone mode to this purpose value.
  {
    const r912c = checkZoneImbalance({
      records, minRecords: 10, minCount: 4, bloatRatio: 0.5,
      isPresent: r => r.purpose === 'character_moment',
    });
    if (r912c.fires) {
      const emptyNames912c = r912c.emptyZoneIdxs.map(i => FOUR_ZONE_NAMES[i]).join(', ');
      const bloatName912c = FOUR_ZONE_NAMES[r912c.bloatZoneIdx];
      issues.push({
        location: `${emptyNames912c} empty; ${bloatName912c} has ${r912c.counts[r912c.bloatZoneIdx]}/${r912c.totalCount} character-moment scenes`,
        rule: 'CONFLICT_CHARACTER_MOMENT_ZONE_IMBALANCE',
        severity: 'minor',
        description: `The story's ${r912c.totalCount} character-moment scenes are unevenly distributed across its four structural zones: ${bloatName912c} contains ${r912c.counts[r912c.bloatZoneIdx]} of them (${Math.round((r912c.counts[r912c.bloatZoneIdx] / r912c.totalCount) * 100)}%) while ${emptyNames912c} contains none. Quiet character beats bloat in one structural quarter and vanish from another, so the conflict gets no breathing room in the empty zones.`,
        suggestedFix: `Redistribute character beats: move at least one character_moment-purposed scene into the empty zone(s) — ${emptyNames912c} — so the conflict gets some breathing room in every structural quarter, not only the quarter currently carrying most of them.`,
      });
    }
  }

  // CONFLICT_STAKES_ZONE_IMBALANCE — Underweight/bloat × purpose === 'raise_stakes' × four
  // structural zones. Built on checkZoneImbalance from the shared checks library, continuing the
  // rollout begun in Wave 884. n≥10, ≥4 stakes-raising scenes total, divided across four equal
  // structural zones. Fires only when one zone has zero such scenes while another holds ≥50% of
  // the total. Distinct from the existing 3-zone CONFLICT_STAKES_ZONE_CLUSTER and run-based
  // CONFLICT_STAKES_DROUGHT_RUN — the first application of the 4-zone bloat+empty-zone mode to this
  // purpose value.
  {
    const r926a = checkZoneImbalance({
      records, minRecords: 10, minCount: 4, bloatRatio: 0.5,
      isPresent: r => r.purpose === 'raise_stakes',
    });
    if (r926a.fires) {
      const emptyNames926a = r926a.emptyZoneIdxs.map(i => FOUR_ZONE_NAMES[i]).join(', ');
      const bloatName926a = FOUR_ZONE_NAMES[r926a.bloatZoneIdx];
      issues.push({
        location: `${emptyNames926a} empty; ${bloatName926a} has ${r926a.counts[r926a.bloatZoneIdx]}/${r926a.totalCount} stakes-raising scenes`,
        rule: 'CONFLICT_STAKES_ZONE_IMBALANCE',
        severity: 'minor',
        description: `The story's ${r926a.totalCount} stakes-raising scenes are unevenly distributed across its four structural zones: ${bloatName926a} contains ${r926a.counts[r926a.bloatZoneIdx]} of them (${Math.round((r926a.counts[r926a.bloatZoneIdx] / r926a.totalCount) * 100)}%) while ${emptyNames926a} contains none. Stakes bloat upward in one structural quarter and never rise at all in another, giving the conflict's escalation an uneven structural rhythm.`,
        suggestedFix: `Redistribute stakes-raising beats: move at least one raise_stakes-purposed scene into the empty zone(s) — ${emptyNames926a} — so the conflict escalates across every structural quarter, not only the quarter currently carrying most of them.`,
      });
    }
  }

  // CONFLICT_REVELATION_PURPOSE_ZONE_IMBALANCE — Underweight/bloat × purpose === 'revelation' × four
  // structural zones. Built on checkZoneImbalance from the shared checks library, closing the
  // 4-zone gap for this purpose value (its 3-zone/run trio was completed in Wave 898). n≥10, ≥4
  // revelation-purposed scenes total, divided across four equal structural zones. Fires only when
  // one zone has zero such scenes while another holds ≥50% of the total. Distinct from CONFLICT_
  // REVELATION_PURPOSE_ZONE_CLUSTER/DROUGHT_RUN (Wave 898) and from the revelation-string-field
  // rules — the first application of the 4-zone bloat+empty-zone mode to this purpose value.
  {
    const r926b = checkZoneImbalance({
      records, minRecords: 10, minCount: 4, bloatRatio: 0.5,
      isPresent: r => r.purpose === 'revelation',
    });
    if (r926b.fires) {
      const emptyNames926b = r926b.emptyZoneIdxs.map(i => FOUR_ZONE_NAMES[i]).join(', ');
      const bloatName926b = FOUR_ZONE_NAMES[r926b.bloatZoneIdx];
      issues.push({
        location: `${emptyNames926b} empty; ${bloatName926b} has ${r926b.counts[r926b.bloatZoneIdx]}/${r926b.totalCount} revelation-purposed scenes`,
        rule: 'CONFLICT_REVELATION_PURPOSE_ZONE_IMBALANCE',
        severity: 'minor',
        description: `The story's ${r926b.totalCount} revelation-purposed scenes are unevenly distributed across its four structural zones: ${bloatName926b} contains ${r926b.counts[r926b.bloatZoneIdx]} of them (${Math.round((r926b.counts[r926b.bloatZoneIdx] / r926b.totalCount) * 100)}%) while ${emptyNames926b} contains none. Purpose-built disclosures bloat in one structural quarter and vanish from another, so the conflict is reshaped by new information in only part of the story.`,
        suggestedFix: `Redistribute disclosures: move at least one revelation-purposed scene into the empty zone(s) — ${emptyNames926b} — so the conflict keeps being reshaped by new information across every structural quarter, not only the quarter currently carrying most of them.`,
      });
    }
  }

  // CONFLICT_NEGATIVE_EMOTION_ZONE_IMBALANCE — Underweight/bloat × emotionalShift === 'negative' ×
  // four structural zones. Built on checkZoneImbalance from the shared checks library, extending
  // the 4-zone mode to the emotionalShift valence signal. n≥10, ≥4 negative-shift scenes total,
  // divided across four equal structural zones. Fires only when one zone has zero such scenes while
  // another holds ≥50% of the total. Distinct from the existing 3-zone CONFLICT_NEGATIVE_EMOTION_
  // ZONE_CLUSTER and run-based CONFLICT_NEGATIVE_EMOTION_DROUGHT_RUN — the first application of the
  // 4-zone bloat+empty-zone mode to this valence signal.
  {
    const r926c = checkZoneImbalance({
      records, minRecords: 10, minCount: 4, bloatRatio: 0.5,
      isPresent: r => r.emotionalShift === 'negative',
    });
    if (r926c.fires) {
      const emptyNames926c = r926c.emptyZoneIdxs.map(i => FOUR_ZONE_NAMES[i]).join(', ');
      const bloatName926c = FOUR_ZONE_NAMES[r926c.bloatZoneIdx];
      issues.push({
        location: `${emptyNames926c} empty; ${bloatName926c} has ${r926c.counts[r926c.bloatZoneIdx]}/${r926c.totalCount} negative-shift scenes`,
        rule: 'CONFLICT_NEGATIVE_EMOTION_ZONE_IMBALANCE',
        severity: 'minor',
        description: `The story's ${r926c.totalCount} scenes with a negative emotional shift are unevenly distributed across its four structural zones: ${bloatName926c} contains ${r926c.counts[r926c.bloatZoneIdx]} of them (${Math.round((r926c.counts[r926c.bloatZoneIdx] / r926c.totalCount) * 100)}%) while ${emptyNames926c} contains none. Downturns bloat in one structural quarter and vanish from another, so the conflict's cost lands on the character in only part of the story.`,
        suggestedFix: `Redistribute downturns: place a negative emotional beat in at least one scene inside the empty zone(s) — ${emptyNames926c} — so the conflict's cost is felt across every structural quarter, not only the quarter currently carrying most of them.`,
      });
    }
  }

  // CONFLICT_POSITIVE_EMOTION_ZONE_IMBALANCE — Underweight/bloat × emotionalShift === 'positive' ×
  // four structural zones. Built on checkZoneImbalance from the shared checks library, extending
  // the 4-zone mode to the emotionalShift valence signal. n≥10, ≥4 positive-shift scenes total,
  // divided across four equal structural zones. Fires only when one zone has zero such scenes while
  // another holds ≥50% of the total. Distinct from the existing 3-zone CONFLICT_POSITIVE_EMOTION_
  // ZONE_CLUSTER and run-based CONFLICT_POSITIVE_EMOTION_DROUGHT_RUN — the first application of the
  // 4-zone bloat+empty-zone mode to this valence signal.
  {
    const r940a = checkZoneImbalance({
      records, minRecords: 10, minCount: 4, bloatRatio: 0.5,
      isPresent: r => r.emotionalShift === 'positive',
    });
    if (r940a.fires) {
      const emptyNames940a = r940a.emptyZoneIdxs.map(i => FOUR_ZONE_NAMES[i]).join(', ');
      const bloatName940a = FOUR_ZONE_NAMES[r940a.bloatZoneIdx];
      issues.push({
        location: `${emptyNames940a} empty; ${bloatName940a} has ${r940a.counts[r940a.bloatZoneIdx]}/${r940a.totalCount} positive-shift scenes`,
        rule: 'CONFLICT_POSITIVE_EMOTION_ZONE_IMBALANCE',
        severity: 'minor',
        description: `The story's ${r940a.totalCount} scenes with a positive emotional shift are unevenly distributed across its four structural zones: ${bloatName940a} contains ${r940a.counts[r940a.bloatZoneIdx]} of them (${Math.round((r940a.counts[r940a.bloatZoneIdx] / r940a.totalCount) * 100)}%) while ${emptyNames940a} contains none. Upswings bloat in one structural quarter and vanish from another, so the conflict grants respite in only part of the story.`,
        suggestedFix: `Redistribute upswings: place a positive emotional beat in at least one scene inside the empty zone(s) — ${emptyNames940a} — so the conflict grants respite across every structural quarter, not only the quarter currently carrying most of them.`,
      });
    }
  }

  // CONFLICT_CURIOSITY_ZONE_IMBALANCE — Underweight/bloat × curiosityDelta > 0 × four structural
  // zones. Built on checkZoneImbalance from the shared checks library, extending the 4-zone mode to
  // the curiosityDelta magnitude signal. n≥10, ≥4 curiosity-raising scenes total, divided across
  // four equal structural zones. Fires only when one zone has zero such scenes while another holds
  // ≥50% of the total. Distinct from the existing 3-zone CONFLICT_CURIOSITY_ZONE_CLUSTER and
  // run-based CONFLICT_CURIOSITY_DROUGHT_RUN — the first application of the 4-zone bloat+empty-zone
  // mode to this signal.
  {
    const r940b = checkZoneImbalance({
      records, minRecords: 10, minCount: 4, bloatRatio: 0.5,
      isPresent: r => (r.curiosityDelta ?? 0) > 0,
    });
    if (r940b.fires) {
      const emptyNames940b = r940b.emptyZoneIdxs.map(i => FOUR_ZONE_NAMES[i]).join(', ');
      const bloatName940b = FOUR_ZONE_NAMES[r940b.bloatZoneIdx];
      issues.push({
        location: `${emptyNames940b} empty; ${bloatName940b} has ${r940b.counts[r940b.bloatZoneIdx]}/${r940b.totalCount} curiosity-raising scenes`,
        rule: 'CONFLICT_CURIOSITY_ZONE_IMBALANCE',
        severity: 'minor',
        description: `The story's ${r940b.totalCount} curiosity-raising scenes are unevenly distributed across its four structural zones: ${bloatName940b} contains ${r940b.counts[r940b.bloatZoneIdx]} of them (${Math.round((r940b.counts[r940b.bloatZoneIdx] / r940b.totalCount) * 100)}%) while ${emptyNames940b} contains none. New questions bloat in one structural quarter and vanish from another, so the conflict raises fresh mysteries in only part of the story.`,
        suggestedFix: `Redistribute curiosity beats: raise a fresh question in at least one scene inside the empty zone(s) — ${emptyNames940b} — so the conflict raises fresh mysteries across every structural quarter, not only the quarter currently carrying most of them.`,
      });
    }
  }

  // CONFLICT_OPEN_THREAD_ZONE_IMBALANCE — Underweight/bloat × unresolvedClues.length > 0 × four
  // structural zones. Built on checkZoneImbalance from the shared checks library, extending the
  // 4-zone mode to the unresolvedClues array-field signal. n≥10, ≥4 open-thread scenes total,
  // divided across four equal structural zones. Fires only when one zone has zero such scenes while
  // another holds ≥50% of the total. Distinct from the existing 3-zone CONFLICT_OPEN_THREAD_ZONE_
  // CLUSTER and run-based CONFLICT_OPEN_THREAD_DROUGHT_RUN — the first application of the 4-zone
  // bloat+empty-zone mode to this signal.
  {
    const r940c = checkZoneImbalance({
      records, minRecords: 10, minCount: 4, bloatRatio: 0.5,
      isPresent: r => (r.unresolvedClues ?? []).length > 0,
    });
    if (r940c.fires) {
      const emptyNames940c = r940c.emptyZoneIdxs.map(i => FOUR_ZONE_NAMES[i]).join(', ');
      const bloatName940c = FOUR_ZONE_NAMES[r940c.bloatZoneIdx];
      issues.push({
        location: `${emptyNames940c} empty; ${bloatName940c} has ${r940c.counts[r940c.bloatZoneIdx]}/${r940c.totalCount} open-thread scenes`,
        rule: 'CONFLICT_OPEN_THREAD_ZONE_IMBALANCE',
        severity: 'minor',
        description: `The story's ${r940c.totalCount} scenes that leave a thread unresolved are unevenly distributed across its four structural zones: ${bloatName940c} contains ${r940c.counts[r940c.bloatZoneIdx]} of them (${Math.round((r940c.counts[r940c.bloatZoneIdx] / r940c.totalCount) * 100)}%) while ${emptyNames940c} contains none. Open threads bloat in one structural quarter and vanish from another, so the conflict's dangling questions pile up in only part of the story.`,
        suggestedFix: `Redistribute open threads: leave a thread unresolved in at least one scene inside the empty zone(s) — ${emptyNames940c} — so the conflict keeps dangling questions alive across every structural quarter, not only the quarter currently carrying most of them.`,
      });
    }
  }

  // CONFLICT_RELATIONSHIP_ZONE_IMBALANCE — Underweight/bloat × (relationshipShifts.length > 0) ×
  // four structural zones. Built on checkZoneImbalance from the shared checks library. n≥10, ≥4
  // scenes with a relationship shift total, divided across four equal structural zones. Fires only
  // when one zone has zero such scenes while another holds ≥50% of the total. Distinct from the
  // existing 3-zone CONFLICT_RELATIONSHIP_ZONE_CLUSTER and run-based CONFLICT_RELATIONSHIP_DROUGHT_
  // RUN — the first application of the 4-zone bloat+empty-zone mode to the relationship-shift array
  // field, keying on where interpersonal conflict actually shifts bonds.
  {
    const r954a = checkZoneImbalance({
      records, minRecords: 10, minCount: 4, bloatRatio: 0.5,
      isPresent: r => (r.relationshipShifts ?? []).length > 0,
    });
    if (r954a.fires) {
      const emptyNames954a = r954a.emptyZoneIdxs.map(i => FOUR_ZONE_NAMES[i]).join(', ');
      const bloatName954a = FOUR_ZONE_NAMES[r954a.bloatZoneIdx];
      issues.push({
        location: `${emptyNames954a} empty; ${bloatName954a} has ${r954a.counts[r954a.bloatZoneIdx]}/${r954a.totalCount} relationship-shift scenes`,
        rule: 'CONFLICT_RELATIONSHIP_ZONE_IMBALANCE',
        severity: 'minor',
        description: `The story's ${r954a.totalCount} scenes with a relationship shift are unevenly distributed across its four structural zones: ${bloatName954a} contains ${r954a.counts[r954a.bloatZoneIdx]} of them (${Math.round((r954a.counts[r954a.bloatZoneIdx] / r954a.totalCount) * 100)}%) while ${emptyNames954a} contains none. Bonds shift in a bloated cluster in one structural quarter and stay static in another, so the story's interpersonal conflict reshapes relationships in only part of its span.`,
        suggestedFix: `Redistribute relational change: give at least one scene inside the empty zone(s) — ${emptyNames954a} — a relationship shift so interpersonal conflict keeps reshaping bonds across every structural quarter, not only the quarter currently carrying most of them.`,
      });
    }
  }

  // CONFLICT_TURN_ZONE_IMBALANCE — Underweight/bloat × (dramaticTurn !== 'nothing') × four structural
  // zones. Built on checkZoneImbalance from the shared checks library. n≥10, ≥4 scenes with a
  // dramatic turn total, divided across four equal structural zones. Fires only when one zone has
  // zero such scenes while another holds ≥50% of the total. Uses the same dramaticTurn !== 'nothing'
  // predicate as the existing 3-zone CONFLICT_TURN_ZONE_CLUSTER and run-based CONFLICT_TURN_DROUGHT_
  // RUN — the first application of the 4-zone bloat+empty-zone mode to the dramatic-turn categorical
  // signal, keying on where the conflict actually pivots.
  {
    const r954b = checkZoneImbalance({
      records, minRecords: 10, minCount: 4, bloatRatio: 0.5,
      isPresent: r => (r.dramaticTurn ?? 'nothing') !== 'nothing',
    });
    if (r954b.fires) {
      const emptyNames954b = r954b.emptyZoneIdxs.map(i => FOUR_ZONE_NAMES[i]).join(', ');
      const bloatName954b = FOUR_ZONE_NAMES[r954b.bloatZoneIdx];
      issues.push({
        location: `${emptyNames954b} empty; ${bloatName954b} has ${r954b.counts[r954b.bloatZoneIdx]}/${r954b.totalCount} dramatic-turn scenes`,
        rule: 'CONFLICT_TURN_ZONE_IMBALANCE',
        severity: 'minor',
        description: `The story's ${r954b.totalCount} scenes with a dramatic turn are unevenly distributed across its four structural zones: ${bloatName954b} contains ${r954b.counts[r954b.bloatZoneIdx]} of them (${Math.round((r954b.counts[r954b.bloatZoneIdx] / r954b.totalCount) * 100)}%) while ${emptyNames954b} contains none. Turns bloat in one structural quarter and never fire in another, so the conflict pivots in only part of the story.`,
        suggestedFix: `Redistribute turns: give at least one scene inside the empty zone(s) — ${emptyNames954b} — a dramatic turn so the conflict keeps pivoting across every structural quarter, not only the quarter currently carrying most of them.`,
      });
    }
  }

  // CONFLICT_REVELATION_ZONE_IMBALANCE — Underweight/bloat × (revelation != null) × four structural
  // zones. Built on checkZoneImbalance from the shared checks library. n≥10, ≥4 revelation scenes
  // total, divided across four equal structural zones. Fires only when one zone has zero such scenes
  // while another holds ≥50% of the total. Distinct from the existing 3-zone CONFLICT_REVELATION_
  // ZONE_CLUSTER and run-based CONFLICT_REVELATION_DROUGHT_RUN — the first application of the 4-zone
  // bloat+empty-zone mode to the revelation STRING field (revelation != null), and distinct from
  // CONFLICT_REVELATION_PURPOSE_ZONE_IMBALANCE, which audits the separate purpose === 'revelation'
  // enum value.
  {
    const r954c = checkZoneImbalance({
      records, minRecords: 10, minCount: 4, bloatRatio: 0.5,
      isPresent: r => r.revelation != null,
    });
    if (r954c.fires) {
      const emptyNames954c = r954c.emptyZoneIdxs.map(i => FOUR_ZONE_NAMES[i]).join(', ');
      const bloatName954c = FOUR_ZONE_NAMES[r954c.bloatZoneIdx];
      issues.push({
        location: `${emptyNames954c} empty; ${bloatName954c} has ${r954c.counts[r954c.bloatZoneIdx]}/${r954c.totalCount} revelation scenes`,
        rule: 'CONFLICT_REVELATION_ZONE_IMBALANCE',
        severity: 'minor',
        description: `The story's ${r954c.totalCount} revelation scenes are unevenly distributed across its four structural zones: ${bloatName954c} contains ${r954c.counts[r954c.bloatZoneIdx]} of them (${Math.round((r954c.counts[r954c.bloatZoneIdx] / r954c.totalCount) * 100)}%) while ${emptyNames954c} contains none. Disclosures bloat in one structural quarter and never land in another, so new information reframes the conflict in only part of the story.`,
        suggestedFix: `Redistribute disclosures: land a revelation in at least one scene inside the empty zone(s) — ${emptyNames954c} — so new information keeps reframing the conflict across every structural quarter, not only the quarter currently carrying most of them.`,
      });
    }
  }

  // CONFLICT_SEED_ZONE_IMBALANCE — Underweight/bloat × (seededClueIds.length > 0) × four structural
  // zones. Built on checkZoneImbalance from the shared checks library. n≥10, ≥4 seeding scenes total,
  // divided across four equal structural zones. Fires only when one zone has zero such scenes while
  // another holds ≥50% of the total. Distinct from the existing 3-zone CONFLICT_SEED_ZONE_CLUSTER and
  // run-based CONFLICT_SEED_DROUGHT_RUN — the first application of the 4-zone bloat+empty-zone mode to
  // the seededClueIds array field, distinct from the payoffSetupIds/unresolvedClues arrays already audited.
  {
    const r968a = checkZoneImbalance({
      records, minRecords: 10, minCount: 4, bloatRatio: 0.5,
      isPresent: r => (r.seededClueIds ?? []).length > 0,
    });
    if (r968a.fires) {
      const emptyNames968a = r968a.emptyZoneIdxs.map(i => FOUR_ZONE_NAMES[i]).join(', ');
      const bloatName968a = FOUR_ZONE_NAMES[r968a.bloatZoneIdx];
      issues.push({
        location: `${emptyNames968a} empty; ${bloatName968a} has ${r968a.counts[r968a.bloatZoneIdx]}/${r968a.totalCount} seeding scenes`,
        rule: 'CONFLICT_SEED_ZONE_IMBALANCE',
        severity: 'minor',
        description: `The story's ${r968a.totalCount} clue-seeding scenes are unevenly distributed across its four structural zones: ${bloatName968a} contains ${r968a.counts[r968a.bloatZoneIdx]} of them (${Math.round((r968a.counts[r968a.bloatZoneIdx] / r968a.totalCount) * 100)}%) while ${emptyNames968a} contains none. Setups bloat in one structural quarter and never get planted in another, so the groundwork the conflict later escalates from is laid in only part of the story.`,
        suggestedFix: `Redistribute seeds: plant a clue (non-empty seededClueIds) in at least one scene inside the empty zone(s) — ${emptyNames968a} — so the conflict keeps laying groundwork across every structural quarter, not only the quarter currently carrying most of them.`,
      });
    }
  }

  // CONFLICT_CLOCK_DELTA_ZONE_IMBALANCE — Underweight/bloat × (clockDelta > 0) × four structural
  // zones. Built on checkZoneImbalance from the shared checks library. n≥10, ≥4 clock-advancing
  // scenes total, divided across four equal structural zones. Fires only when one zone has zero such
  // scenes while another holds ≥50% of the total. Uses the same clockDelta > 0 predicate as the
  // existing 3-zone CONFLICT_CLOCK_DELTA_ZONE_CLUSTER and run-based CONFLICT_CLOCK_DELTA_DROUGHT_RUN —
  // the first application of the 4-zone bloat+empty-zone mode to this delta signal, distinct from the
  // curiosity delta already audited (Wave 940) and from the boolean CONFLICT_CLOCK signal below.
  {
    const r968b = checkZoneImbalance({
      records, minRecords: 10, minCount: 4, bloatRatio: 0.5,
      isPresent: r => (r.clockDelta ?? 0) > 0,
    });
    if (r968b.fires) {
      const emptyNames968b = r968b.emptyZoneIdxs.map(i => FOUR_ZONE_NAMES[i]).join(', ');
      const bloatName968b = FOUR_ZONE_NAMES[r968b.bloatZoneIdx];
      issues.push({
        location: `${emptyNames968b} empty; ${bloatName968b} has ${r968b.counts[r968b.bloatZoneIdx]}/${r968b.totalCount} clock-advancing scenes`,
        rule: 'CONFLICT_CLOCK_DELTA_ZONE_IMBALANCE',
        severity: 'minor',
        description: `The story's ${r968b.totalCount} clock-advancing scenes are unevenly distributed across its four structural zones: ${bloatName968b} contains ${r968b.counts[r968b.bloatZoneIdx]} of them (${Math.round((r968b.counts[r968b.bloatZoneIdx] / r968b.totalCount) * 100)}%) while ${emptyNames968b} contains none. Deadline pressure bloats in one structural quarter and never advances in another, so the conflict runs against the clock in only part of the story.`,
        suggestedFix: `Redistribute clock pressure: move or add a scene that advances the clock (clockDelta > 0) into the empty zone(s) — ${emptyNames968b} — so the conflict keeps racing a deadline across every structural quarter, not only the quarter currently carrying most of it.`,
      });
    }
  }

  // CONFLICT_CLOCK_ZONE_IMBALANCE — Underweight/bloat × (clockRaised === true) × four structural
  // zones. Built on checkZoneImbalance from the shared checks library. n≥10, ≥4 clock-raising scenes
  // total, divided across four equal structural zones. Fires only when one zone has zero such scenes
  // while another holds ≥50% of the total. Uses the same clockRaised === true predicate as the existing
  // 3-zone CONFLICT_CLOCK_ZONE_CLUSTER and run-based CONFLICT_CLOCK_DROUGHT_RUN — the first application
  // of the 4-zone bloat+empty-zone mode to the clockRaised BOOLEAN field, distinct from the numeric
  // clockDelta signal audited just above (whether a clock was introduced at all, not by how much it moved).
  {
    const r968c = checkZoneImbalance({
      records, minRecords: 10, minCount: 4, bloatRatio: 0.5,
      isPresent: r => r.clockRaised === true,
    });
    if (r968c.fires) {
      const emptyNames968c = r968c.emptyZoneIdxs.map(i => FOUR_ZONE_NAMES[i]).join(', ');
      const bloatName968c = FOUR_ZONE_NAMES[r968c.bloatZoneIdx];
      issues.push({
        location: `${emptyNames968c} empty; ${bloatName968c} has ${r968c.counts[r968c.bloatZoneIdx]}/${r968c.totalCount} clock-raising scenes`,
        rule: 'CONFLICT_CLOCK_ZONE_IMBALANCE',
        severity: 'minor',
        description: `The story's ${r968c.totalCount} clock-raising scenes are unevenly distributed across its four structural zones: ${bloatName968c} contains ${r968c.counts[r968c.bloatZoneIdx]} of them (${Math.round((r968c.counts[r968c.bloatZoneIdx] / r968c.totalCount) * 100)}%) while ${emptyNames968c} contains none. Ticking clocks bloat in one structural quarter and are never introduced in another, so the conflict is put on a deadline in only part of the story.`,
        suggestedFix: `Redistribute ticking clocks: introduce a time pressure (clockRaised) in at least one scene inside the empty zone(s) — ${emptyNames968c} — so the conflict operates under a deadline across every structural quarter, not only the quarter currently carrying most of them.`,
      });
    }
  }

  // CONFLICT_EMOTION_ZONE_IMBALANCE — Underweight/bloat × (emotionalShift !== 'neutral') × four
  // structural zones. Built on checkZoneImbalance from the shared checks library. n≥10, ≥4
  // emotionally charged scenes total (positive or negative), divided across four equal structural
  // zones. Fires only when one zone has zero such scenes while another holds ≥50% of the total.
  // Uses the same emotionalShift !== 'neutral' predicate as the existing 3-zone CONFLICT_EMOTION_
  // ZONE_CLUSTER and run-based CONFLICT_EMOTION_DROUGHT_RUN — the any-direction valence signal,
  // distinct from the separate CONFLICT_POSITIVE_EMOTION and CONFLICT_NEGATIVE_EMOTION rules.
  {
    const r982a = checkZoneImbalance({
      records, minRecords: 10, minCount: 4, bloatRatio: 0.5,
      isPresent: r => (r.emotionalShift ?? 'neutral') !== 'neutral',
    });
    if (r982a.fires) {
      const emptyNames982a = r982a.emptyZoneIdxs.map(i => FOUR_ZONE_NAMES[i]).join(', ');
      const bloatName982a = FOUR_ZONE_NAMES[r982a.bloatZoneIdx];
      issues.push({
        location: `${emptyNames982a} empty; ${bloatName982a} has ${r982a.counts[r982a.bloatZoneIdx]}/${r982a.totalCount} emotionally-charged scenes`,
        rule: 'CONFLICT_EMOTION_ZONE_IMBALANCE',
        severity: 'minor',
        description: `The story's ${r982a.totalCount} emotionally-charged scenes are unevenly distributed across its four structural zones: ${bloatName982a} contains ${r982a.counts[r982a.bloatZoneIdx]} of them (${Math.round((r982a.counts[r982a.bloatZoneIdx] / r982a.totalCount) * 100)}%) while ${emptyNames982a} contains none. Feeling bloats in one structural quarter and never registers in another, so the conflict's felt weight is confined to part of the story.`,
        suggestedFix: `Redistribute feeling: give at least one scene inside the empty zone(s) — ${emptyNames982a} — an emotional shift (positive or negative) so the conflict keeps carrying felt weight across every structural quarter, not only the quarter currently carrying most of them.`,
      });
    }
  }

  // CONFLICT_HIGHLIGHT_ZONE_IMBALANCE — Underweight/bloat × (dialogueHighlights.length > 0) × four
  // structural zones. Built on checkZoneImbalance from the shared checks library. n≥10, ≥4 scenes
  // with a dialogue highlight total, divided across four equal structural zones. Fires only when one
  // zone has zero such scenes while another holds ≥50% of the total. Distinct from the existing
  // 3-zone CONFLICT_HIGHLIGHT_ZONE_CLUSTER and run-based CONFLICT_HIGHLIGHT_DROUGHT_RUN — the first
  // application of the 4-zone bloat+empty-zone mode to the dialogueHighlights array field.
  {
    const r982b = checkZoneImbalance({
      records, minRecords: 10, minCount: 4, bloatRatio: 0.5,
      isPresent: r => (r.dialogueHighlights ?? []).length > 0,
    });
    if (r982b.fires) {
      const emptyNames982b = r982b.emptyZoneIdxs.map(i => FOUR_ZONE_NAMES[i]).join(', ');
      const bloatName982b = FOUR_ZONE_NAMES[r982b.bloatZoneIdx];
      issues.push({
        location: `${emptyNames982b} empty; ${bloatName982b} has ${r982b.counts[r982b.bloatZoneIdx]}/${r982b.totalCount} dialogue-highlight scenes`,
        rule: 'CONFLICT_HIGHLIGHT_ZONE_IMBALANCE',
        severity: 'minor',
        description: `The story's ${r982b.totalCount} scenes with a dialogue highlight are unevenly distributed across its four structural zones: ${bloatName982b} contains ${r982b.counts[r982b.bloatZoneIdx]} of them (${Math.round((r982b.counts[r982b.bloatZoneIdx] / r982b.totalCount) * 100)}%) while ${emptyNames982b} contains none. Memorable lines bloat in one structural quarter and never land in another, so the conflict's sharpest exchanges are confined to part of the story.`,
        suggestedFix: `Redistribute highlights: give at least one scene inside the empty zone(s) — ${emptyNames982b} — a dialogue highlight so the conflict's sharpest exchanges land across every structural quarter, not only the quarter currently carrying most of them.`,
      });
    }
  }

  // CONFLICT_STAKES_CURIOSITY_AFTERMATH_VOID — with the zone-imbalance mode all but exhausted for
  // this pass (only two clean trio-complete signals remain, both audited above), this check pivots
  // to the sequence/aftermath mode via the shared checkAftermathVoid helper: raise-stakes trigger ×
  // curiosity aftermath. Every stakes-raising scene is followed by two scenes that raise no new
  // curiosity, even though fresh questions do open elsewhere. Escalating danger should usually
  // provoke a new question — what happens next, who pays for this; when every stakes-raise's
  // aftermath opens no curiosity, the conflict's escalations sit inert rather than propelling the
  // audience forward. First use of raise_stakes as an aftermath-void TRIGGER in this pass.
  {
    const r982c = checkAftermathVoid({
      records, minRecords: 8, minTriggerCount: 2, minAftermathCount: 2, window: 2,
      isTrigger: r => r.purpose === 'raise_stakes',
      isAftermath: r => (r.curiosityDelta ?? 0) > 0,
    });
    if (r982c.fires) {
      issues.push({
        location: `${r982c.triggerCount} stakes-raise aftermath(s) — no curiosity raised within 2 scenes`,
        rule: 'CONFLICT_STAKES_CURIOSITY_AFTERMATH_VOID',
        severity: 'minor',
        description: `Every stakes-raising scene (${r982c.triggerCount} escalations) is followed by two scenes that raise no new curiosity, even though ${r982c.aftermathCount} scenes elsewhere do open fresh questions. Escalating danger should usually provoke a new uncertainty — what happens next, who pays for this, how it will be survived. When every stakes-raise's aftermath opens no curiosity, the conflict's escalations sit inert rather than propelling the audience forward.`,
        suggestedFix: `Let at least one stakes-raise open a new question in its aftermath: in the scene or two after the danger sharpens, plant an uncertainty about what comes next. A stakes-raise whose aftermath opens curiosity keeps the conflict propulsive, not just tense.`,
      });
    }
  }

  // CONFLICT_STAKES_SUSPENSE_AFTERMATH_VOID — with zone-imbalance now confirmed fully exhausted
  // (CONFLICT_STAGING re-checked and re-excluded for the same predicate mismatch), this wave
  // completes the trio with three more aftermath-void pairings. Built on checkAftermathVoid from
  // the shared checks library. n≥8, ≥2 qualifying stakes-raise scenes (purpose === 'raise_stakes',
  // pos<n-2), ≥2 tension-raising scenes anywhere, 2-scene lookahead. Fires when every stakes-
  // raise's two-scene aftermath raises no tension, while tension does rise elsewhere. Distinct from
  // CONFLICT_STAKES_CURIOSITY_AFTERMATH_VOID (Wave 982, same trigger paired with curiosityDelta) —
  // this pairs raise_stakes with suspenseDelta for the first time in this pass.
  {
    const r996a = checkAftermathVoid({
      records, minRecords: 8, minTriggerCount: 2, minAftermathCount: 2, window: 2,
      isTrigger: r => r.purpose === 'raise_stakes',
      isAftermath: r => (r.suspenseDelta ?? 0) > 0,
    });
    if (r996a.fires) {
      issues.push({
        location: `${r996a.triggerCount} stakes-raise aftermath(s) — no suspense raised within 2 scenes`,
        rule: 'CONFLICT_STAKES_SUSPENSE_AFTERMATH_VOID',
        severity: 'minor',
        description: `Every stakes-raising scene (${r996a.triggerCount} escalations) is followed by two scenes with no rise in tension, even though ${r996a.aftermathCount} such rises occur elsewhere. Escalating danger should usually tighten the felt sense of jeopardy in the scenes right after it; when every stakes-raise's aftermath registers no suspense, the conflict's escalation reads as a stated fact rather than a threat the audience feels.`,
        suggestedFix: `In the two scenes following at least one stakes-raise, tighten the tension — a ticking complication or a near-miss — so escalating danger registers as felt, not just stated.`,
      });
    }
  }

  // CONFLICT_PAYOFF_EMOTIONAL_AFTERMATH_VOID — Sequence/aftermath × payoffSetupIds trigger →
  // emotionalShift absence. Built on checkAftermathVoid from the shared checks library. n≥8, ≥2
  // qualifying payoff scenes (pos<n-2), ≥2 emotionally-charged scenes anywhere, 2-scene lookahead.
  // Fires when every payoff's two-scene aftermath is emotionally flat, while charged scenes occur
  // elsewhere. First use of payoffSetupIds as a checkAftermathVoid TRIGGER in this pass — it has
  // only appeared as an aftermath channel (CONFLICT_RUPTURE_PAYOFF_AFTERMATH_VOID) or in other
  // analytical modes before now.
  {
    const r996b = checkAftermathVoid({
      records, minRecords: 8, minTriggerCount: 2, minAftermathCount: 2, window: 2,
      isTrigger: r => (r.payoffSetupIds ?? []).length > 0,
      isAftermath: r => (r.emotionalShift ?? 'neutral') !== 'neutral',
    });
    if (r996b.fires) {
      issues.push({
        location: `${r996b.triggerCount} payoff aftermath(s) — no emotional shift within 2 scenes`,
        rule: 'CONFLICT_PAYOFF_EMOTIONAL_AFTERMATH_VOID',
        severity: 'minor',
        description: `Every payoff scene (${r996b.triggerCount} cashed-in setups) is followed by two emotionally neutral scenes, even though ${r996b.aftermathCount} emotionally-charged scenes exist elsewhere. A conflict payoff should usually carry some feeling — relief, cost, vindication; when every payoff's aftermath is affectively flat, the conflict's resolution registers as pure mechanics with no felt weight.`,
        suggestedFix: `Let at least one payoff carry feeling in its aftermath: in the scene or two after a setup pays off, show someone reacting to it emotionally — relief, grief, triumph. A payoff whose aftermath is felt lands as more than the conflict closing a loop.`,
      });
    }
  }

  // CONFLICT_OPEN_THREAD_CURIOSITY_AFTERMATH_VOID — Sequence/aftermath × heavy unresolved-clue-
  // debt trigger → curiosityDelta absence. Built on checkAftermathVoid from the shared checks
  // library. n≥8, ≥2 qualifying heavy-debt scenes (unresolvedClues.length≥3, pos<n-2), ≥2
  // curiosity-raising scenes anywhere, 2-scene lookahead. Fires when every heavy-debt scene's two-
  // scene aftermath opens no new curiosity, while curiosity does occur elsewhere. This trigger
  // already anchors OPEN_THREAD_REPAIR_AFTERMATH_VOID (→ relationshipShifts) and CONFLICT_OPEN_
  // THREAD_STAGING_AFTERMATH_VOID (→ visualBeats) — this is its third consequence channel.
  {
    const r996c = checkAftermathVoid({
      records, minRecords: 8, minTriggerCount: 2, minAftermathCount: 2, window: 2,
      isTrigger: r => (r.unresolvedClues ?? []).length >= 3,
      isAftermath: r => (r.curiosityDelta ?? 0) > 0,
    });
    if (r996c.fires) {
      issues.push({
        location: `${r996c.triggerCount} heavy clue-debt scene(s) — no curiosity raised within 2 scenes of any`,
        rule: 'CONFLICT_OPEN_THREAD_CURIOSITY_AFTERMATH_VOID',
        severity: 'minor',
        description: `Every scene carrying heavy unresolved clue-debt (${r996c.triggerCount} instances) is followed by two full scenes that raise no new curiosity, even though ${r996c.aftermathCount} such rises occur elsewhere. Accumulated mystery should usually compound into fresh questions rather than sit as inert backlog; when every heavy-debt scene's aftermath opens nothing new, the conflict's unresolved material stalls instead of deepening.`,
        suggestedFix: `In the two scenes following at least one heavy clue-debt moment, plant a new open question so accumulated mystery keeps compounding rather than sitting in a learnable lull.`,
      });
    }
  }

  // CONFLICT_TURN_CURIOSITY_AFTERMATH_VOID — Sequence/aftermath × dramaticTurn trigger →
  // curiosityDelta absence. Built on checkAftermathVoid from the shared checks library. n≥8, ≥2
  // qualifying dramatic-turn scenes (pos<n-2), ≥2 curiosity-raising scenes anywhere, 2-scene
  // lookahead. Fires when every turn's two-scene aftermath opens no new curiosity, while curiosity
  // does occur elsewhere. Distinct from CONFLICT_TURN_STAGING_AFTERMATH_VOID (same trigger paired
  // with visualBeats) — this pairs dramaticTurn with curiosityDelta for the first time in this pass.
  {
    const r1010a = checkAftermathVoid({
      records, minRecords: 8, minTriggerCount: 2, minAftermathCount: 2, window: 2,
      isTrigger: r => (r.dramaticTurn ?? 'nothing') !== 'nothing',
      isAftermath: r => (r.curiosityDelta ?? 0) > 0,
    });
    if (r1010a.fires) {
      issues.push({
        location: `${r1010a.triggerCount} dramatic-turn aftermath(s) — no curiosity raised within 2 scenes`,
        rule: 'CONFLICT_TURN_CURIOSITY_AFTERMATH_VOID',
        severity: 'minor',
        description: `Every dramatic-turn scene in the story (${r1010a.triggerCount} pivots) is followed by two scenes that raise no new curiosity, even though ${r1010a.aftermathCount} scenes elsewhere do open fresh questions. A pivot should usually provoke a new question about what changes next; when every turn's aftermath opens no curiosity, the conflict's reversal lands as a closed event rather than a springboard for further wondering.`,
        suggestedFix: `In the two scenes following at least one dramatic turn, plant a new open question so the pivot keeps propelling curiosity forward rather than closing the matter.`,
      });
    }
  }

  // CONFLICT_PAYOFF_SUSPENSE_AFTERMATH_VOID — Sequence/aftermath × payoffSetupIds trigger →
  // suspenseDelta absence. Built on checkAftermathVoid from the shared checks library. n≥8, ≥2
  // qualifying payoff scenes (pos<n-2), ≥2 tension-raising scenes anywhere, 2-scene lookahead.
  // Fires when every payoff's two-scene aftermath raises no tension, while tension does rise
  // elsewhere. Distinct from CONFLICT_PAYOFF_EMOTIONAL_AFTERMATH_VOID (Wave 996, same trigger
  // paired with emotionalShift) — this pairs payoffSetupIds with suspenseDelta for the first time
  // in this pass.
  {
    const r1010b = checkAftermathVoid({
      records, minRecords: 8, minTriggerCount: 2, minAftermathCount: 2, window: 2,
      isTrigger: r => (r.payoffSetupIds ?? []).length > 0,
      isAftermath: r => (r.suspenseDelta ?? 0) > 0,
    });
    if (r1010b.fires) {
      issues.push({
        location: `${r1010b.triggerCount} payoff aftermath(s) — no suspense raised within 2 scenes`,
        rule: 'CONFLICT_PAYOFF_SUSPENSE_AFTERMATH_VOID',
        severity: 'minor',
        description: `Every payoff scene (${r1010b.triggerCount} cashed-in setups) is followed by two scenes with no rise in tension, even though ${r1010b.aftermathCount} such rises occur elsewhere. A callback should sometimes reopen or escalate tension rather than only resolve it; when every payoff's aftermath registers no suspense, the conflict settles into calm with nothing left pressing.`,
        suggestedFix: `In the two scenes following at least one payoff, let the resolution reveal a new complication or near-miss that raises tension again, so the callback doesn't just close a loop but opens the next one.`,
      });
    }
  }

  // CONFLICT_STAKES_EMOTIONAL_AFTERMATH_VOID — Sequence/aftermath × raise_stakes trigger →
  // emotionalShift absence. Built on checkAftermathVoid from the shared checks library. n≥8, ≥2
  // qualifying stakes-raise scenes (pos<n-2), ≥2 emotionally-charged scenes anywhere, 2-scene
  // lookahead. Fires when every stakes-raise's two-scene aftermath is emotionally flat, while
  // charged scenes occur elsewhere. Distinct from CONFLICT_STAKES_CURIOSITY_AFTERMATH_VOID (Wave
  // 982, curiosityDelta) and CONFLICT_STAKES_SUSPENSE_AFTERMATH_VOID (Wave 996, suspenseDelta) —
  // this is the third consequence channel for this trigger in this pass.
  {
    const r1010c = checkAftermathVoid({
      records, minRecords: 8, minTriggerCount: 2, minAftermathCount: 2, window: 2,
      isTrigger: r => r.purpose === 'raise_stakes',
      isAftermath: r => (r.emotionalShift ?? 'neutral') !== 'neutral',
    });
    if (r1010c.fires) {
      issues.push({
        location: `${r1010c.triggerCount} stakes-raise aftermath(s) — no emotional shift within 2 scenes`,
        rule: 'CONFLICT_STAKES_EMOTIONAL_AFTERMATH_VOID',
        severity: 'minor',
        description: `Every stakes-raising scene (${r1010c.triggerCount} escalations) is followed by two emotionally neutral scenes, even though ${r1010c.aftermathCount} emotionally-charged scenes exist elsewhere. Escalating danger should usually carry felt weight for the characters living through it; when every stakes-raise's aftermath is affectively flat, the conflict's escalation reads as a stated fact rather than a threat anyone feels.`,
        suggestedFix: `Let at least one stakes-raise carry feeling in its aftermath: in the scene or two after the danger sharpens, show someone reacting to it emotionally — fear, resolve, dread.`,
      });
    }
  }

  // CONFLICT_STAKES_RELATIONAL_AFTERMATH_VOID — Sequence/aftermath × raise_stakes trigger →
  // relationshipShifts absence. Built on checkAftermathVoid from the shared checks library. n≥8,
  // ≥2 qualifying raise_stakes scenes (pos<n-2), ≥2 relationship-shift scenes anywhere, 2-scene
  // lookahead. Fires when every stakes-raise's two-scene aftermath carries no bond change, while
  // such changes occur elsewhere. Distinct from CONFLICT_STAKES_CURIOSITY_AFTERMATH_VOID,
  // CONFLICT_STAKES_SUSPENSE_AFTERMATH_VOID, and CONFLICT_STAKES_EMOTIONAL_AFTERMATH_VOID (same
  // trigger paired with curiosityDelta/suspenseDelta/emotionalShift respectively) — this is the
  // fourth consequence channel for this trigger in this pass.
  {
    const r1024a = checkAftermathVoid({
      records, minRecords: 8, minTriggerCount: 2, minAftermathCount: 2, window: 2,
      isTrigger: r => r.purpose === 'raise_stakes',
      isAftermath: r => (r.relationshipShifts ?? []).length > 0,
    });
    if (r1024a.fires) {
      issues.push({
        location: `${r1024a.triggerCount} raise-stakes aftermath(s) — no relationship shift within 2 scenes`,
        rule: 'CONFLICT_STAKES_RELATIONAL_AFTERMATH_VOID',
        severity: 'minor',
        description: `Every stakes-raising scene in the story (${r1024a.triggerCount} of them) is followed by two scenes with no shift in any relationship, even though ${r1024a.aftermathCount} such shifts occur elsewhere. Raising the stakes without it ever bearing on how characters treat each other in the scenes right after leaves the conflict's escalation registering as external pressure rather than something that strains the people caught in it.`,
        suggestedFix: `In the two scenes following at least one stakes-raise, let the new danger strain or shift a relationship so the conflict's escalation lands interpersonally, not just externally.`,
      });
    }
  }

  // CONFLICT_PAYOFF_CURIOSITY_AFTERMATH_VOID — Sequence/aftermath × payoffSetupIds trigger →
  // curiosityDelta absence. Built on checkAftermathVoid from the shared checks library. n≥8, ≥2
  // qualifying payoff scenes (pos<n-2), ≥2 curiosity-rising scenes anywhere, 2-scene lookahead.
  // Fires when every payoff's two-scene aftermath carries no curiosity rise, while such rises
  // occur elsewhere. Distinct from CONFLICT_PAYOFF_EMOTIONAL_AFTERMATH_VOID and CONFLICT_PAYOFF_
  // SUSPENSE_AFTERMATH_VOID (same trigger paired with emotionalShift and suspenseDelta
  // respectively) — this is the third consequence channel for this trigger in this pass.
  {
    const r1024b = checkAftermathVoid({
      records, minRecords: 8, minTriggerCount: 2, minAftermathCount: 2, window: 2,
      isTrigger: r => (r.payoffSetupIds ?? []).length > 0,
      isAftermath: r => (r.curiosityDelta ?? 0) > 0,
    });
    if (r1024b.fires) {
      issues.push({
        location: `${r1024b.triggerCount} payoff aftermath(s) — no curiosity rise within 2 scenes`,
        rule: 'CONFLICT_PAYOFF_CURIOSITY_AFTERMATH_VOID',
        severity: 'minor',
        description: `Every payoff scene in the story (${r1024b.triggerCount} cashed-in setups) is followed by two scenes with no rise in curiosity, even though ${r1024b.aftermathCount} such rises occur elsewhere. A conflict that resolves cleanly with no fresh question in its immediate wake leaves the story's friction feeling settled rather than still generating new tension to fight over.`,
        suggestedFix: `In the two scenes following at least one payoff, let a new question rise so the conflict keeps generating friction rather than going quiet right after a resolution.`,
      });
    }
  }

  // CONFLICT_TURN_EMOTIONAL_AFTERMATH_VOID — Sequence/aftermath × dramaticTurn trigger →
  // emotionalShift absence. Built on checkAftermathVoid from the shared checks library. n≥8, ≥2
  // qualifying dramatic-turn scenes (pos<n-2), ≥2 emotionally-charged scenes anywhere, 2-scene
  // lookahead. Fires when every turn's two-scene aftermath carries no emotional shift, while such
  // shifts occur elsewhere. Distinct from CONFLICT_TURN_CURIOSITY_AFTERMATH_VOID and the original
  // dramaticTurn → visualBeats rule (same trigger paired with curiosityDelta and visualBeats
  // respectively) — this is the third consequence channel for this trigger in this pass.
  {
    const r1024c = checkAftermathVoid({
      records, minRecords: 8, minTriggerCount: 2, minAftermathCount: 2, window: 2,
      isTrigger: r => (r.dramaticTurn ?? 'nothing') !== 'nothing',
      isAftermath: r => (r.emotionalShift ?? 'neutral') !== 'neutral',
    });
    if (r1024c.fires) {
      issues.push({
        location: `${r1024c.triggerCount} dramatic-turn aftermath(s) — no emotional shift within 2 scenes`,
        rule: 'CONFLICT_TURN_EMOTIONAL_AFTERMATH_VOID',
        severity: 'minor',
        description: `Every dramatic-turn scene in the story (${r1024c.triggerCount} pivots) is followed by two emotionally neutral scenes, even though ${r1024c.aftermathCount} emotionally-charged scenes exist elsewhere. A conflict pivot that never registers as felt in the scenes right after it lands as a plot mechanic the story tracks structurally rather than something anyone visibly carries.`,
        suggestedFix: `In the two scenes following at least one dramatic turn, let someone's feelings visibly register the pivot so the conflict's turn lands emotionally, not just structurally.`,
      });
    }
  }

  // CONFLICT_OPEN_THREAD_EMOTIONAL_AFTERMATH_VOID — Sequence/aftermath × heavy unresolvedClues
  // debt trigger → emotionalShift absence. Built on checkAftermathVoid from the shared checks
  // library. n≥8, ≥2 qualifying heavy-debt scenes (pos<n-2, threshold ≥3), ≥2 emotionally-charged
  // scenes anywhere, 2-scene lookahead. Fires when every heavy-debt scene's two-scene aftermath
  // carries no emotional shift, while such shifts occur elsewhere. Distinct from the original
  // unresolvedClues → relationshipShifts and → visualBeats rules, and CONFLICT_OPEN_THREAD_
  // CURIOSITY_AFTERMATH_VOID (same trigger paired with curiosityDelta) — this is the fourth
  // consequence channel for this trigger in this pass.
  {
    const r1038a = checkAftermathVoid({
      records, minRecords: 8, minTriggerCount: 2, minAftermathCount: 2, window: 2,
      isTrigger: r => (r.unresolvedClues ?? []).length >= 3,
      isAftermath: r => (r.emotionalShift ?? 'neutral') !== 'neutral',
    });
    if (r1038a.fires) {
      issues.push({
        location: `${r1038a.triggerCount} heavy clue-debt scene(s) — no emotional shift within 2 scenes of any`,
        rule: 'CONFLICT_OPEN_THREAD_EMOTIONAL_AFTERMATH_VOID',
        severity: 'minor',
        description: `Every scene carrying heavy unresolved clue-debt (${r1038a.triggerCount} instances) is followed by two emotionally neutral scenes, even though ${r1038a.aftermathCount} emotionally-charged scenes exist elsewhere. A pile-up of open questions that never registers as felt in the scenes right after it leaves the conflict's mounting uncertainty purely intellectual rather than something anyone visibly carries.`,
        suggestedFix: `In the two scenes following a heavy clue-debt moment, let someone's feelings register the weight of the unresolved questions so the conflict's debt lands emotionally, not just informationally.`,
      });
    }
  }

  // CONFLICT_TURN_RELATIONAL_AFTERMATH_VOID — Sequence/aftermath × dramaticTurn trigger →
  // relationshipShifts absence. Built on checkAftermathVoid from the shared checks library. n≥8,
  // ≥2 qualifying dramatic-turn scenes (pos<n-2), ≥2 relationship-shift scenes anywhere, 2-scene
  // lookahead. Fires when every turn's two-scene aftermath carries no bond change, while such
  // changes occur elsewhere. Distinct from the original dramaticTurn → visualBeats rule,
  // CONFLICT_TURN_CURIOSITY_AFTERMATH_VOID, and CONFLICT_TURN_EMOTIONAL_AFTERMATH_VOID (same
  // trigger paired with visualBeats/curiosityDelta/emotionalShift respectively) — this is the
  // fourth consequence channel for this trigger in this pass.
  {
    const r1038b = checkAftermathVoid({
      records, minRecords: 8, minTriggerCount: 2, minAftermathCount: 2, window: 2,
      isTrigger: r => (r.dramaticTurn ?? 'nothing') !== 'nothing',
      isAftermath: r => (r.relationshipShifts ?? []).length > 0,
    });
    if (r1038b.fires) {
      issues.push({
        location: `${r1038b.triggerCount} dramatic-turn aftermath(s) — no relationship shift within 2 scenes`,
        rule: 'CONFLICT_TURN_RELATIONAL_AFTERMATH_VOID',
        severity: 'minor',
        description: `Every dramatic-turn scene in the story (${r1038b.triggerCount} pivots) is followed by two scenes with no shift in any relationship, even though ${r1038b.aftermathCount} such shifts occur elsewhere. A conflict pivot that never bears on how characters treat each other in the scenes right after it lands as a plot mechanic the story tracks structurally rather than interpersonally.`,
        suggestedFix: `In the two scenes following at least one dramatic turn, let the pivot strain or shift a relationship so the conflict's turn lands on the bonds between characters, not only on the plot.`,
      });
    }
  }

  // CONFLICT_PAYOFF_RELATIONAL_AFTERMATH_VOID — Sequence/aftermath × payoffSetupIds trigger →
  // relationshipShifts absence. Built on checkAftermathVoid from the shared checks library. n≥8,
  // ≥2 qualifying payoff scenes (pos<n-2), ≥2 relationship-shift scenes anywhere, 2-scene
  // lookahead. Fires when every payoff's two-scene aftermath carries no bond change, while such
  // changes occur elsewhere. Distinct from the original payoffSetupIds → emotionalShift rule,
  // CONFLICT_PAYOFF_SUSPENSE_AFTERMATH_VOID, and CONFLICT_PAYOFF_CURIOSITY_AFTERMATH_VOID (same
  // trigger paired with emotionalShift/suspenseDelta/curiosityDelta respectively) — this is the
  // fourth consequence channel for this trigger in this pass.
  {
    const r1038c = checkAftermathVoid({
      records, minRecords: 8, minTriggerCount: 2, minAftermathCount: 2, window: 2,
      isTrigger: r => (r.payoffSetupIds ?? []).length > 0,
      isAftermath: r => (r.relationshipShifts ?? []).length > 0,
    });
    if (r1038c.fires) {
      issues.push({
        location: `${r1038c.triggerCount} payoff aftermath(s) — no relationship shift within 2 scenes`,
        rule: 'CONFLICT_PAYOFF_RELATIONAL_AFTERMATH_VOID',
        severity: 'minor',
        description: `Every payoff scene in the story (${r1038c.triggerCount} cashed-in setups) is followed by two scenes with no shift in any relationship, even though ${r1038c.aftermathCount} such shifts occur elsewhere. A conflict that resolves cleanly with no fresh strain on any relationship in its wake leaves the payoff feeling settled rather than still generating friction between the people caught in it.`,
        suggestedFix: `In the two scenes following at least one payoff, let the resolution strain or shift a relationship so the conflict's payoff ripples interpersonally, not just narratively.`,
      });
    }
  }

  // CONFLICT_STAKES_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID — Sequence/aftermath × raise_stakes
  // trigger → dialogueHighlights absence. Built on checkAftermathVoid from the shared checks
  // library. n≥8, ≥2 qualifying raise_stakes scenes (pos<n-2), ≥2 scenes anywhere with a
  // highlighted line of dialogue, 2-scene lookahead. Fires when every stakes-raise's two-scene
  // aftermath contains no highlighted dialogue, while such dialogue occurs elsewhere.
  // dialogueHighlights has never been used as a checkAftermathVoid consequence channel anywhere
  // in this pass — this is the first pairing of the field with the sequence/aftermath mode here,
  // and the fifth consequence channel for this trigger.
  {
    const r1052a = checkAftermathVoid({
      records, minRecords: 8, minTriggerCount: 2, minAftermathCount: 2, window: 2,
      isTrigger: r => r.purpose === 'raise_stakes',
      isAftermath: r => (r.dialogueHighlights ?? []).length > 0,
    });
    if (r1052a.fires) {
      issues.push({
        location: `${r1052a.triggerCount} raise-stakes aftermath(s) — no highlighted dialogue within 2 scenes`,
        rule: 'CONFLICT_STAKES_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID',
        severity: 'minor',
        description: `Every stakes-raising scene in the story (${r1052a.triggerCount} of them) is followed by two scenes with no highlighted dialogue, even though ${r1052a.aftermathCount} such scenes exist elsewhere in the script. Escalating danger that lands without a single memorable line reacting to it in the immediate aftermath leaves the conflict's stakes registering structurally, never in a line anyone remembers.`,
        suggestedFix: `In the two scenes following at least one stakes-raise, let a character deliver a memorable line naming or reacting to the new danger so the escalation registers in speech, not just in plot mechanics.`,
      });
    }
  }

  // CONFLICT_PAYOFF_STAGING_AFTERMATH_VOID — Sequence/aftermath × payoffSetupIds trigger →
  // visualBeats absence. Built on checkAftermathVoid from the shared checks library. n≥8, ≥2
  // qualifying payoff scenes (pos<n-2), ≥2 scenes anywhere with substantial physical staging,
  // 2-scene lookahead. Fires when every payoff's two-scene aftermath contains no visually dense
  // scene, while such scenes occur elsewhere. Distinct from CONFLICT_PAYOFF_EMOTIONAL_AFTERMATH_
  // VOID, CONFLICT_PAYOFF_SUSPENSE_AFTERMATH_VOID, CONFLICT_PAYOFF_CURIOSITY_AFTERMATH_VOID, and
  // CONFLICT_PAYOFF_RELATIONAL_AFTERMATH_VOID (same trigger paired with emotionalShift/
  // suspenseDelta/curiosityDelta/relationshipShifts respectively) — this is the fifth consequence
  // channel for this trigger, the last of the standard set already applied to dramaticTurn and
  // unresolvedClues.
  {
    const r1052b = checkAftermathVoid({
      records, minRecords: 8, minTriggerCount: 2, minAftermathCount: 2, window: 2,
      isTrigger: r => (r.payoffSetupIds ?? []).length > 0,
      isAftermath: r => (r.visualBeats ?? []).length >= 2,
    });
    if (r1052b.fires) {
      issues.push({
        location: `${r1052b.triggerCount} payoff aftermath(s) — no visually dense scene within 2 scenes of any`,
        rule: 'CONFLICT_PAYOFF_STAGING_AFTERMATH_VOID',
        severity: 'minor',
        description: `Every payoff scene in the story (${r1052b.triggerCount} cashed-in setups) is followed by two scenes with no substantial physical staging, even though ${r1052b.aftermathCount} such scenes exist elsewhere in the script. A resolved conflict gains texture when the world briefly holds physical attention right after it lands, but that opportunity consistently passes unstaged in the scenes immediately following every payoff.`,
        suggestedFix: `After at least one payoff, let one of the following two scenes carry substantial physical staging — the aftermath of the resolution given some visible presence before the conflict moves on.`,
      });
    }
  }

  // CONFLICT_OPEN_THREAD_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID — Sequence/aftermath × heavy
  // unresolvedClues debt trigger → dialogueHighlights absence. Built on checkAftermathVoid from
  // the shared checks library. n≥8, ≥2 qualifying heavy-debt scenes (pos<n-2, threshold ≥3), ≥2
  // scenes anywhere with a highlighted line of dialogue, 2-scene lookahead. Fires when every
  // heavy-debt scene's two-scene aftermath contains no highlighted dialogue, while such dialogue
  // occurs elsewhere. dialogueHighlights has never been used as a checkAftermathVoid consequence
  // channel anywhere in this pass — this is the fifth consequence channel for this trigger.
  {
    const r1052c = checkAftermathVoid({
      records, minRecords: 8, minTriggerCount: 2, minAftermathCount: 2, window: 2,
      isTrigger: r => (r.unresolvedClues ?? []).length >= 3,
      isAftermath: r => (r.dialogueHighlights ?? []).length > 0,
    });
    if (r1052c.fires) {
      issues.push({
        location: `${r1052c.triggerCount} heavy clue-debt scene(s) — no highlighted dialogue within 2 scenes of any`,
        rule: 'CONFLICT_OPEN_THREAD_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID',
        severity: 'minor',
        description: `Every scene carrying heavy unresolved clue-debt (${r1052c.triggerCount} instances) is followed by two scenes with no highlighted dialogue, even though ${r1052c.aftermathCount} such scenes exist elsewhere in the script. A pile-up of open questions that never earns a single memorable line reacting to it right after leaves the conflict's mounting uncertainty unspoken rather than voiced.`,
        suggestedFix: `In the two scenes following a heavy clue-debt moment, let a character deliver a memorable line naming or reacting to the mounting uncertainty so it registers in speech, not just as plot backlog.`,
      });
    }
  }

  // CONFLICT_STAKES_STAGING_AFTERMATH_VOID — Sequence/aftermath × raise_stakes trigger →
  // visualBeats absence. Built on checkAftermathVoid from the shared checks library. n≥8, ≥2
  // qualifying stakes-raising scenes (pos<n-2), ≥2 visually-dense scenes anywhere (visualBeats
  // length≥2), 2-scene lookahead. Fires when every stakes-raise's two-scene aftermath contains no
  // visually dense scene, while such scenes occur elsewhere. Distinct from CONFLICT_STAKES_
  // CURIOSITY_AFTERMATH_VOID, CONFLICT_STAKES_SUSPENSE_AFTERMATH_VOID, CONFLICT_STAKES_EMOTIONAL_
  // AFTERMATH_VOID, CONFLICT_STAKES_RELATIONAL_AFTERMATH_VOID, and CONFLICT_STAKES_DIALOGUE_
  // HIGHLIGHT_AFTERMATH_VOID (same trigger paired with curiosityDelta/suspenseDelta/emotionalShift/
  // relationshipShifts/dialogueHighlights respectively) — this is the sixth and final
  // standard-channel pairing for this trigger, completing full saturation.
  {
    const r1066a = checkAftermathVoid({
      records, minRecords: 8, minTriggerCount: 2, minAftermathCount: 2, window: 2,
      isTrigger: r => r.purpose === 'raise_stakes',
      isAftermath: r => (r.visualBeats ?? []).length >= 2,
    });
    if (r1066a.fires) {
      issues.push({
        location: `${r1066a.triggerCount} stakes-raising scene(s) — no visually dense scene within 2 scenes of any`,
        rule: 'CONFLICT_STAKES_STAGING_AFTERMATH_VOID',
        severity: 'minor',
        description: `Every one of the story's ${r1066a.triggerCount} stakes-raising scenes is followed by two scenes with no substantial physical staging, even though ${r1066a.aftermathCount} such scenes exist elsewhere in the script. Raised stakes gain weight when the world briefly holds physical attention around them, but that opportunity consistently passes unstaged in the scenes immediately following every stakes-raise, leaving the conflict's escalation abstract rather than lodged in the world.`,
        suggestedFix: `After at least one stakes-raise, let one of the following two scenes carry substantial physical staging — an action or gesture that gives the raised stakes a physical anchor.`,
      });
    }
  }

  // CONFLICT_PAYOFF_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID — Sequence/aftermath × payoffSetupIds
  // trigger → dialogueHighlights absence. Built on checkAftermathVoid from the shared checks
  // library. n≥8, ≥2 qualifying payoff scenes (pos<n-2), ≥2 scenes anywhere with a highlighted
  // line of dialogue, 2-scene lookahead. Fires when every payoff's two-scene aftermath contains no
  // highlighted dialogue, while such dialogue occurs elsewhere. Distinct from CONFLICT_PAYOFF_
  // EMOTIONAL_AFTERMATH_VOID, CONFLICT_PAYOFF_SUSPENSE_AFTERMATH_VOID, CONFLICT_PAYOFF_CURIOSITY_
  // AFTERMATH_VOID, CONFLICT_PAYOFF_RELATIONAL_AFTERMATH_VOID, and CONFLICT_PAYOFF_STAGING_
  // AFTERMATH_VOID (same trigger paired with emotionalShift/suspenseDelta/curiosityDelta/
  // relationshipShifts/visualBeats respectively) — this is the sixth and final standard-channel
  // pairing for this trigger, completing full saturation.
  {
    const r1066b = checkAftermathVoid({
      records, minRecords: 8, minTriggerCount: 2, minAftermathCount: 2, window: 2,
      isTrigger: r => (r.payoffSetupIds ?? []).length > 0,
      isAftermath: r => (r.dialogueHighlights ?? []).length > 0,
    });
    if (r1066b.fires) {
      issues.push({
        location: `${r1066b.triggerCount} payoff scene(s) — no highlighted dialogue within 2 scenes of any`,
        rule: 'CONFLICT_PAYOFF_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID',
        severity: 'minor',
        description: `Every payoff scene in the story (${r1066b.triggerCount} cashed-in setups) is followed by two scenes with no highlighted dialogue, even though ${r1066b.aftermathCount} such scenes exist elsewhere in the script. A resolved setup that never earns a memorable line right after it lands leaves the conflict's payoffs registering as structural closure alone, with no voice confirming what the resolution meant.`,
        suggestedFix: `After at least one payoff, let one of the following two scenes carry a memorable line — a character naming what just resolved, giving the payoff a voice, not just a checked box.`,
      });
    }
  }

  // CONFLICT_OPEN_THREAD_SUSPENSE_AFTERMATH_VOID — Sequence/aftermath × heavy unresolvedClues
  // debt trigger → suspenseDelta absence. Built on checkAftermathVoid from the shared checks
  // library. n≥8, ≥2 qualifying heavy-debt scenes (pos<n-2, threshold≥3), ≥2 suspense-rising
  // scenes anywhere, 2-scene lookahead. Fires when every heavy-debt scene's two-scene aftermath
  // carries no rise in suspense, while such rises occur elsewhere. Distinct from CONFLICT_OPEN_
  // THREAD_RELATIONAL_AFTERMATH_VOID (the amount≥0.3 relationshipShifts trigger variant),
  // CONFLICT_OPEN_THREAD_STAGING_AFTERMATH_VOID, CONFLICT_OPEN_THREAD_CURIOSITY_AFTERMATH_VOID,
  // CONFLICT_OPEN_THREAD_EMOTIONAL_AFTERMATH_VOID, and CONFLICT_OPEN_THREAD_DIALOGUE_HIGHLIGHT_
  // AFTERMATH_VOID (same trigger paired with visualBeats/curiosityDelta/emotionalShift/
  // dialogueHighlights respectively) — this is the sixth and final standard-channel pairing for
  // this trigger, completing full saturation.
  {
    const r1066c = checkAftermathVoid({
      records, minRecords: 8, minTriggerCount: 2, minAftermathCount: 2, window: 2,
      isTrigger: r => (r.unresolvedClues ?? []).length >= 3,
      isAftermath: r => (r.suspenseDelta ?? 0) > 0,
    });
    if (r1066c.fires) {
      issues.push({
        location: `${r1066c.triggerCount} heavy clue-debt scene(s) — no suspense rise within 2 scenes of any`,
        rule: 'CONFLICT_OPEN_THREAD_SUSPENSE_AFTERMATH_VOID',
        severity: 'minor',
        description: `Every scene carrying heavy unresolved clue-debt (${r1066c.triggerCount} instances) is followed by two scenes with no rise in suspense, even though ${r1066c.aftermathCount} such rises occur elsewhere. Accumulated mystery that never tightens the felt sense of tension right after it leaves the conflict's uncertainty stalling instead of pressuring the story forward.`,
        suggestedFix: `In the two scenes following at least one heavy clue-debt moment, let the tension rise so accumulated mystery keeps pressuring the conflict rather than sitting in a learnable lull.`,
      });
    }
  }

  // CONFLICT_TURN_SUSPENSE_AFTERMATH_VOID — Sequence/aftermath × dramaticTurn trigger →
  // suspenseDelta absence. Built on checkAftermathVoid from the shared checks library. n≥8, ≥2
  // qualifying dramatic-turn scenes (pos<n-2), ≥2 suspense-rising scenes anywhere, 2-scene
  // lookahead. Fires when every turn's two-scene aftermath carries no rise in suspense, while such
  // rises occur elsewhere. Distinct from CONFLICT_TURN_STAGING_AFTERMATH_VOID, CONFLICT_TURN_
  // CURIOSITY_AFTERMATH_VOID, CONFLICT_TURN_EMOTIONAL_AFTERMATH_VOID, and CONFLICT_TURN_
  // RELATIONAL_AFTERMATH_VOID (same trigger paired with visualBeats/curiosityDelta/emotionalShift/
  // relationshipShifts respectively) — this is the fifth consequence channel for this trigger.
  {
    const r1080a = checkAftermathVoid({
      records, minRecords: 8, minTriggerCount: 2, minAftermathCount: 2, window: 2,
      isTrigger: r => (r.dramaticTurn ?? 'nothing') !== 'nothing',
      isAftermath: r => (r.suspenseDelta ?? 0) > 0,
    });
    if (r1080a.fires) {
      issues.push({
        location: `${r1080a.triggerCount} dramatic-turn aftermath(s) — no suspense rise within 2 scenes`,
        rule: 'CONFLICT_TURN_SUSPENSE_AFTERMATH_VOID',
        severity: 'minor',
        description: `Every dramatic-turn scene in the story (${r1080a.triggerCount} pivots) is followed by two scenes with no rise in suspense, even though ${r1080a.aftermathCount} such rises occur elsewhere. A pivot that never tightens tension right after it lands leaves the conflict's turns registering as isolated events rather than pressure the story keeps building on.`,
        suggestedFix: `In the two scenes following at least one dramatic turn, let suspense rise so the pivot keeps building pressure rather than resolving into a flat aftermath.`,
      });
    }
  }

  // CONFLICT_TURN_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID — Sequence/aftermath × dramaticTurn trigger
  // → dialogueHighlights absence. Built on checkAftermathVoid from the shared checks library.
  // n≥8, ≥2 qualifying dramatic-turn scenes (pos<n-2), ≥2 scenes anywhere with a highlighted line
  // of dialogue, 2-scene lookahead. Fires when every turn's two-scene aftermath contains no
  // highlighted dialogue, while such dialogue occurs elsewhere. Distinct from CONFLICT_TURN_
  // STAGING_AFTERMATH_VOID, CONFLICT_TURN_CURIOSITY_AFTERMATH_VOID, CONFLICT_TURN_EMOTIONAL_
  // AFTERMATH_VOID, CONFLICT_TURN_RELATIONAL_AFTERMATH_VOID, and CONFLICT_TURN_SUSPENSE_
  // AFTERMATH_VOID (same trigger paired with visualBeats/curiosityDelta/emotionalShift/
  // relationshipShifts/suspenseDelta respectively) — this is the sixth and final standard-channel
  // pairing for this trigger, completing full saturation for all four main triggers in this pass.
  {
    const r1080b = checkAftermathVoid({
      records, minRecords: 8, minTriggerCount: 2, minAftermathCount: 2, window: 2,
      isTrigger: r => (r.dramaticTurn ?? 'nothing') !== 'nothing',
      isAftermath: r => (r.dialogueHighlights ?? []).length > 0,
    });
    if (r1080b.fires) {
      issues.push({
        location: `${r1080b.triggerCount} dramatic-turn aftermath(s) — no highlighted dialogue within 2 scenes`,
        rule: 'CONFLICT_TURN_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID',
        severity: 'minor',
        description: `Every dramatic-turn scene in the story (${r1080b.triggerCount} pivots) is followed by two scenes with no highlighted dialogue, even though ${r1080b.aftermathCount} such scenes exist elsewhere in the script. A pivot that never earns a memorable line right after it lands leaves the conflict's turns registering as plot mechanics without a voice confirming what changed.`,
        suggestedFix: `In the two scenes following at least one dramatic turn, let a character voice what just changed — a line worth remembering, not just a structural pivot passing silently.`,
      });
    }
  }

  // CONFLICT_SEED_CURIOSITY_AFTERMATH_VOID — Sequence/aftermath × seededClueIds trigger →
  // curiosityDelta absence. Built on checkAftermathVoid from the shared checks library. n≥8, ≥2
  // qualifying seed scenes (pos<n-2), ≥2 curiosity-rising scenes anywhere, 2-scene lookahead.
  // Fires when every seed's two-scene aftermath carries no rise in curiosity, while such rises
  // occur elsewhere. Distinct from CONFLICT_SEED_SUSPENSE_AFTERMATH_VOID (Wave 590, same trigger
  // paired with suspenseDelta via a hand-rolled implementation) — this is the first
  // checkAftermathVoid-based pairing of this trigger with curiosityDelta.
  {
    const r1080c = checkAftermathVoid({
      records, minRecords: 8, minTriggerCount: 2, minAftermathCount: 2, window: 2,
      isTrigger: r => (r.seededClueIds ?? []).length > 0,
      isAftermath: r => (r.curiosityDelta ?? 0) > 0,
    });
    if (r1080c.fires) {
      issues.push({
        location: `${r1080c.triggerCount} seed scene(s) — no curiosity rise within 2 scenes of any`,
        rule: 'CONFLICT_SEED_CURIOSITY_AFTERMATH_VOID',
        severity: 'minor',
        description: `Every one of the story's ${r1080c.triggerCount} clue-planting scenes is followed by two scenes with no rise in curiosity, even though ${r1080c.aftermathCount} such rises occur elsewhere. A planted clue that never opens a fresh question right after it lands leaves the conflict's foreshadowing registering as a closed event rather than a development that generates the next thing to wonder about.`,
        suggestedFix: `In the two scenes following at least one clue-seeding moment, let a new question arise from the plant so the conflict's foreshadowing keeps generating curiosity, not just sitting as inert setup.`,
      });
    }
  }

  // CONFLICT_SEED_EMOTIONAL_AFTERMATH_VOID — Sequence/aftermath × seededClueIds trigger →
  // emotionalShift absence. Built on checkAftermathVoid from the shared checks library. n≥8, ≥2
  // qualifying seed scenes (pos<n-2), ≥2 emotionally-charged scenes anywhere, 2-scene lookahead.
  // Fires when every seed's two-scene aftermath carries no emotional shift, while such shifts
  // occur elsewhere. Distinct from CONFLICT_SEED_CURIOSITY_AFTERMATH_VOID (Wave 1080, same
  // trigger paired with curiosityDelta) and CONFLICT_SEED_SUSPENSE_AFTERMATH_VOID (Wave 590,
  // hand-rolled, suspenseDelta) — this is the second checkAftermathVoid-based channel for this
  // trigger.
  {
    const r1094a = checkAftermathVoid({
      records, minRecords: 8, minTriggerCount: 2, minAftermathCount: 2, window: 2,
      isTrigger: r => (r.seededClueIds ?? []).length > 0,
      isAftermath: r => (r.emotionalShift ?? 'neutral') !== 'neutral',
    });
    if (r1094a.fires) {
      issues.push({
        location: `${r1094a.triggerCount} seed scene(s) — no emotional shift within 2 scenes of any`,
        rule: 'CONFLICT_SEED_EMOTIONAL_AFTERMATH_VOID',
        severity: 'minor',
        description: `Every one of the story's ${r1094a.triggerCount} clue-planting scenes is followed by two scenes with no emotional shift, even though ${r1094a.aftermathCount} such shifts occur elsewhere. A planted clue that never registers emotionally right after it lands leaves the conflict's foreshadowing feeling procedural — information delivered without anyone visibly reacting to what it implies.`,
        suggestedFix: `In the two scenes following at least one clue-seeding moment, let a character's emotional register shift in response to what the clue implies, so the plant carries felt weight, not just informational weight.`,
      });
    }
  }

  // CONFLICT_SEED_RELATIONAL_AFTERMATH_VOID — Sequence/aftermath × seededClueIds trigger →
  // relationshipShifts absence. Built on checkAftermathVoid from the shared checks library. n≥8,
  // ≥2 qualifying seed scenes (pos<n-2), ≥2 scenes anywhere with a recorded relationship shift,
  // 2-scene lookahead. Fires when every seed's two-scene aftermath carries no relationship
  // movement, while such movement occurs elsewhere. Distinct from CONFLICT_SEED_CURIOSITY_
  // AFTERMATH_VOID, CONFLICT_SEED_EMOTIONAL_AFTERMATH_VOID (same trigger paired with
  // curiosityDelta/emotionalShift), and CONFLICT_SEED_SUSPENSE_AFTERMATH_VOID (Wave 590,
  // hand-rolled, suspenseDelta) — this is the third checkAftermathVoid-based channel for this
  // trigger.
  {
    const r1094b = checkAftermathVoid({
      records, minRecords: 8, minTriggerCount: 2, minAftermathCount: 2, window: 2,
      isTrigger: r => (r.seededClueIds ?? []).length > 0,
      isAftermath: r => (r.relationshipShifts ?? []).length > 0,
    });
    if (r1094b.fires) {
      issues.push({
        location: `${r1094b.triggerCount} seed scene(s) — no relationship shift within 2 scenes of any`,
        rule: 'CONFLICT_SEED_RELATIONAL_AFTERMATH_VOID',
        severity: 'minor',
        description: `Every one of the story's ${r1094b.triggerCount} clue-planting scenes is followed by two scenes with no recorded relationship shift, even though ${r1094b.aftermathCount} such shifts occur elsewhere. A planted clue that never moves how characters stand with each other leaves the conflict's foreshadowing isolated from the interpersonal stakes it should eventually complicate.`,
        suggestedFix: `In the two scenes following at least one clue-seeding moment, let it shift how a pair of characters relate — suspicion, alliance, or distance — so the plant has interpersonal consequence, not just narrative setup.`,
      });
    }
  }

  // CONFLICT_SEED_STAGING_AFTERMATH_VOID — Sequence/aftermath × seededClueIds trigger →
  // visualBeats absence. Built on checkAftermathVoid from the shared checks library. n≥8, ≥2
  // qualifying seed scenes (pos<n-2), ≥2 visually-dense scenes anywhere, 2-scene lookahead. Fires
  // when every seed's two-scene aftermath has no heavily-staged scene, while such staging occurs
  // elsewhere. Distinct from CONFLICT_SEED_CURIOSITY_AFTERMATH_VOID, CONFLICT_SEED_EMOTIONAL_
  // AFTERMATH_VOID, CONFLICT_SEED_RELATIONAL_AFTERMATH_VOID (same trigger paired with
  // curiosityDelta/emotionalShift/relationshipShifts), and CONFLICT_SEED_SUSPENSE_AFTERMATH_VOID
  // (Wave 590, hand-rolled, suspenseDelta) — this is the fourth checkAftermathVoid-based channel
  // for this trigger.
  {
    const r1094c = checkAftermathVoid({
      records, minRecords: 8, minTriggerCount: 2, minAftermathCount: 2, window: 2,
      isTrigger: r => (r.seededClueIds ?? []).length > 0,
      isAftermath: r => (r.visualBeats ?? []).length >= 2,
    });
    if (r1094c.fires) {
      issues.push({
        location: `${r1094c.triggerCount} seed scene(s) — no heavily-staged scene within 2 scenes of any`,
        rule: 'CONFLICT_SEED_STAGING_AFTERMATH_VOID',
        severity: 'minor',
        description: `Every one of the story's ${r1094c.triggerCount} clue-planting scenes is followed by two scenes with no heavily-staged visual beat, even though ${r1094c.aftermathCount} such scenes exist elsewhere in the script. A planted clue that never earns a visually charged follow-through leaves the conflict's foreshadowing registering as narrated information rather than something the story visibly dwells on.`,
        suggestedFix: `In the two scenes following at least one clue-seeding moment, stage at least two concrete visual beats, so the plant registers in image, not just in plot bookkeeping.`,
      });
    }
  }

  // CONFLICT_SEED_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID — Sequence/aftermath × seededClueIds trigger
  // → dialogueHighlights absence. Built on checkAftermathVoid from the shared checks library.
  // n≥8, ≥2 qualifying seed scenes (pos<n-2), ≥2 scenes anywhere with a highlighted line of
  // dialogue, 2-scene lookahead. Fires when every seed's two-scene aftermath contains no
  // highlighted dialogue, while such dialogue occurs elsewhere. Distinct from CONFLICT_SEED_
  // CURIOSITY_AFTERMATH_VOID, CONFLICT_SEED_EMOTIONAL_AFTERMATH_VOID, CONFLICT_SEED_RELATIONAL_
  // AFTERMATH_VOID, CONFLICT_SEED_STAGING_AFTERMATH_VOID (same trigger paired with
  // curiosityDelta/emotionalShift/relationshipShifts/visualBeats), and CONFLICT_SEED_SUSPENSE_
  // AFTERMATH_VOID (Wave 590, hand-rolled, suspenseDelta) — this is the sixth and final
  // checkAftermathVoid-based channel for this trigger, completing full saturation.
  {
    const r1108a = checkAftermathVoid({
      records, minRecords: 8, minTriggerCount: 2, minAftermathCount: 2, window: 2,
      isTrigger: r => (r.seededClueIds ?? []).length > 0,
      isAftermath: r => (r.dialogueHighlights ?? []).length > 0,
    });
    if (r1108a.fires) {
      issues.push({
        location: `${r1108a.triggerCount} seed scene(s) — no highlighted dialogue within 2 scenes of any`,
        rule: 'CONFLICT_SEED_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID',
        severity: 'minor',
        description: `Every one of the story's ${r1108a.triggerCount} clue-planting scenes is followed by two scenes with no highlighted dialogue, even though ${r1108a.aftermathCount} such scenes exist elsewhere in the script. A planted clue that never earns a memorable line right after it lands leaves the conflict's foreshadowing registering as inert plot mechanics rather than something a character's voice gives weight to.`,
        suggestedFix: `In the two scenes following at least one clue-seeding moment, let a character's line acknowledge or react to what was just planted, so the seed registers in speech, not just in plot bookkeeping.`,
      });
    }
  }

  // CONFLICT_REVELATION_CURIOSITY_AFTERMATH_VOID — Sequence/aftermath × revelation trigger →
  // curiosityDelta absence. Built on checkAftermathVoid from the shared checks library. n≥8, ≥2
  // qualifying revelation scenes (pos<n-2), ≥2 curiosity-rising scenes anywhere, 2-scene
  // lookahead. Fires when every revelation's two-scene aftermath carries no rise in curiosity,
  // while such rises occur elsewhere. Distinct from every existing revelation check in this file
  // (all distribution/timing modes, none sequence/aftermath) — this is the first check to use
  // revelation as a checkAftermathVoid trigger in this pass.
  {
    const r1108b = checkAftermathVoid({
      records, minRecords: 8, minTriggerCount: 2, minAftermathCount: 2, window: 2,
      isTrigger: r => r.revelation != null,
      isAftermath: r => (r.curiosityDelta ?? 0) > 0,
    });
    if (r1108b.fires) {
      issues.push({
        location: `${r1108b.triggerCount} revelation scene(s) — no curiosity rise within 2 scenes of any`,
        rule: 'CONFLICT_REVELATION_CURIOSITY_AFTERMATH_VOID',
        severity: 'minor',
        description: `Every one of the story's ${r1108b.triggerCount} revelation scenes is followed by two scenes with no rise in curiosity, even though ${r1108b.aftermathCount} such rises occur elsewhere. A discovery that never reopens the field of questions right after it lands leaves the conflict's reckoning with new information feeling like a closed loop rather than a development that generates the next thing to wonder about.`,
        suggestedFix: `In the two scenes following at least one revelation, let a new question surface so the conflict's discoveries keep generating curiosity instead of settling the matter entirely.`,
      });
    }
  }

  // CONFLICT_CLOCK_SUSPENSE_AFTERMATH_VOID — Sequence/aftermath × clockRaised trigger →
  // suspenseDelta absence. Built on checkAftermathVoid from the shared checks library. n≥8, ≥2
  // qualifying clock-raise scenes (pos<n-2), ≥2 suspense-rising scenes anywhere, 2-scene
  // lookahead. Fires when every clock-raise's two-scene aftermath carries no rise in suspense,
  // while such rises occur elsewhere. Distinct from every existing clockRaised check in this
  // file (all distribution/timing modes, none sequence/aftermath) — this is the first check to
  // use clockRaised as a checkAftermathVoid trigger in this pass.
  {
    const r1108c = checkAftermathVoid({
      records, minRecords: 8, minTriggerCount: 2, minAftermathCount: 2, window: 2,
      isTrigger: r => r.clockRaised === true,
      isAftermath: r => (r.suspenseDelta ?? 0) > 0,
    });
    if (r1108c.fires) {
      issues.push({
        location: `${r1108c.triggerCount} clock-raise scene(s) — no suspense rise within 2 scenes of any`,
        rule: 'CONFLICT_CLOCK_SUSPENSE_AFTERMATH_VOID',
        severity: 'minor',
        description: `Every one of the story's ${r1108c.triggerCount} scenes that raise the ticking clock is followed by two scenes with no rise in suspense, even though ${r1108c.aftermathCount} such rises occur elsewhere. Time pressure that never re-tightens tension right after it fires leaves the conflict's relationship with urgency feeling inert rather than consequential.`,
        suggestedFix: `In the two scenes following at least one clock-raise, let a new tension rise so the conflict's ticking clock keeps the story pressing forward instead of settling into calm.`,
      });
    }
  }

  // CONFLICT_REVELATION_EMOTIONAL_AFTERMATH_VOID — Sequence/aftermath × revelation trigger →
  // emotionalShift absence. Built on checkAftermathVoid from the shared checks library. n≥8, ≥2
  // qualifying revelation scenes (pos<n-2), ≥2 emotionally-shifted scenes anywhere, 2-scene
  // lookahead. Fires when every revelation's two-scene aftermath carries no emotional shift,
  // while such shifts occur elsewhere. Distinct from CONFLICT_REVELATION_CURIOSITY_AFTERMATH_
  // VOID (Wave 1108, same trigger paired with curiosityDelta) — this is the second consequence
  // channel for this trigger.
  {
    const r1122a = checkAftermathVoid({
      records, minRecords: 8, minTriggerCount: 2, minAftermathCount: 2, window: 2,
      isTrigger: r => r.revelation != null,
      isAftermath: r => (r.emotionalShift ?? 'neutral') !== 'neutral',
    });
    if (r1122a.fires) {
      issues.push({
        location: `${r1122a.triggerCount} revelation scene(s) — no emotional shift within 2 scenes of any`,
        rule: 'CONFLICT_REVELATION_EMOTIONAL_AFTERMATH_VOID',
        severity: 'minor',
        description: `Every one of the story's ${r1122a.triggerCount} revelation scenes is followed by two scenes with no emotional shift, even though ${r1122a.aftermathCount} such shifts occur elsewhere. A discovery that never registers on any character's felt state right after it lands leaves the conflict's reckoning with new information reading as plot mechanics rather than something anyone actually feels.`,
        suggestedFix: `In the two scenes following at least one revelation, let it visibly shift a character's emotional register, so the discovery lands as something felt, not just something learned.`,
      });
    }
  }

  // CONFLICT_REVELATION_SUSPENSE_AFTERMATH_VOID — Sequence/aftermath × revelation trigger →
  // suspenseDelta absence. Built on checkAftermathVoid from the shared checks library. n≥8, ≥2
  // qualifying revelation scenes (pos<n-2), ≥2 suspense-rising scenes anywhere, 2-scene
  // lookahead. Fires when every revelation's two-scene aftermath carries no rise in suspense,
  // while such rises occur elsewhere. Distinct from CONFLICT_REVELATION_CURIOSITY_AFTERMATH_
  // VOID (Wave 1108) and CONFLICT_REVELATION_EMOTIONAL_AFTERMATH_VOID (this wave, same trigger
  // paired with curiosityDelta/emotionalShift) — this is the third consequence channel for this
  // trigger.
  {
    const r1122b = checkAftermathVoid({
      records, minRecords: 8, minTriggerCount: 2, minAftermathCount: 2, window: 2,
      isTrigger: r => r.revelation != null,
      isAftermath: r => (r.suspenseDelta ?? 0) > 0,
    });
    if (r1122b.fires) {
      issues.push({
        location: `${r1122b.triggerCount} revelation scene(s) — no suspense rise within 2 scenes of any`,
        rule: 'CONFLICT_REVELATION_SUSPENSE_AFTERMATH_VOID',
        severity: 'minor',
        description: `Every one of the story's ${r1122b.triggerCount} revelation scenes is followed by two scenes with no rise in suspense, even though ${r1122b.aftermathCount} such rises occur elsewhere. A discovery that never sharpens danger or uncertainty right after it lands leaves the conflict's reckoning with new information feeling settled rather than newly charged.`,
        suggestedFix: `In the two scenes following at least one revelation, let the new information raise what's at risk, so the discovery compounds tension instead of resolving into calm.`,
      });
    }
  }

  // CONFLICT_CLOCK_CURIOSITY_AFTERMATH_VOID — Sequence/aftermath × clockRaised trigger →
  // curiosityDelta absence. Built on checkAftermathVoid from the shared checks library. n≥8, ≥2
  // qualifying clock-raise scenes (pos<n-2), ≥2 curiosity-rising scenes anywhere, 2-scene
  // lookahead. Fires when every clock-raise's two-scene aftermath carries no rise in curiosity,
  // while such rises occur elsewhere. Distinct from CONFLICT_CLOCK_SUSPENSE_AFTERMATH_VOID
  // (Wave 1108, same trigger paired with suspenseDelta), the non-standard hand-rolled
  // CONFLICT_CLOCK_AFTERMATH_VOID (Wave 450: compound negative-conflict-signal channel), and
  // CONFLICT_CLOCK_TURN_AFTERMATH_VOID (Wave 590: dramaticTurn as the aftermath channel) — this
  // is the second checkAftermathVoid-based channel for this trigger.
  {
    const r1122c = checkAftermathVoid({
      records, minRecords: 8, minTriggerCount: 2, minAftermathCount: 2, window: 2,
      isTrigger: r => r.clockRaised === true,
      isAftermath: r => (r.curiosityDelta ?? 0) > 0,
    });
    if (r1122c.fires) {
      issues.push({
        location: `${r1122c.triggerCount} clock-raise scene(s) — no curiosity rise within 2 scenes of any`,
        rule: 'CONFLICT_CLOCK_CURIOSITY_AFTERMATH_VOID',
        severity: 'minor',
        description: `Every one of the story's ${r1122c.triggerCount} scenes that raise the ticking clock is followed by two scenes with no rise in curiosity, even though ${r1122c.aftermathCount} such rises occur elsewhere. A deadline that tightens without opening a new question leaves the conflict's clock registering as a schedule rather than a source of the next thing worth wondering about.`,
        suggestedFix: `In the two scenes following at least one clock-raise, let a new question surface from the mounting pressure, so the deadline keeps generating curiosity, not just counting down.`,
      });
    }
  }

  const { revised, usedLLM } = await rewritePass({ fountain, issues, passName: 'conflict', approvedSpans, storyContext: input.storyContext, priorPassResults: input.priorPassResults });
  const changed = revised !== fountain;

  return {
    pass: 'conflict',
    issues,
    revisedFountain: revised,
    changed,
    summary: issues.length === 0
      ? 'Conflict pass: escalation is healthy'
      : `Conflict pass: ${issues.length} issue(s) — ${usedLLM ? 'rewritten' : 'flagged (stub mode)'}`,
  };
}

/** Per-scene conflict signal vector used by the Wave 214 conflict-dynamics checks.
 *  Conflict is modelled as a pressure system: each scene either ADDS external pressure
 *  (rising suspense, a tightening clock), RELEASES it (a reversal that drops suspense),
 *  or inflicts INTERPERSONAL damage (a relationship deteriorating). Decomposing the
 *  signals this way lets the checks reason about the rhythm of escalation and release,
 *  the spatial distribution of conflict mass, and the trend of reversal magnitude —
 *  none of which are visible from a single suspenseDelta threshold. */
interface SceneConflictSignal {
  /** External pressure added this scene: rising suspense + tightening clock */
  escalation: number;
  /** Tension released this scene: a drop in suspense (a reversal/relief valve) */
  release: number;
  /** Interpersonal damage magnitude: summed |amount| of negative relationship shifts */
  interpersonal: number;
  /** Total conflict magnitude concentrated in this scene */
  mass: number;
  /** Whether this scene is a genuine reversal (suspense drops by more than 1) */
  isReversal: boolean;
  /** Magnitude of the reversal (|suspenseDelta|) when this scene is a reversal, else 0 */
  reversalMag: number;
}

function computeConflictDynamics(records: PassInput['records']): SceneConflictSignal[] {
  return records.map((r: any) => {
    const sd = r.suspenseDelta ?? 0;
    const cd = r.clockDelta ?? 0;
    const negRel = ((r.relationshipShifts ?? []) as Array<{ amount: number }>)
      .filter(s => s.amount < 0)
      .reduce((a, s) => a + Math.abs(s.amount), 0);
    const escalation = Math.max(sd, 0) + Math.max(cd, 0);
    const release = Math.max(-sd, 0);
    const interpersonal = negRel;
    const mass = escalation + 2 * interpersonal;
    const isReversal = sd < -1;
    const reversalMag = isReversal ? Math.abs(sd) : 0;
    return { escalation, release, interpersonal, mass, isReversal, reversalMag };
  });
}
